interface Env {
  DB: D1Database;
  LINE_LOGIN_CHANNEL_ID?: string;
  LINE_LOGIN_CHANNEL_SECRET?: string;
}

// GET: Get LINE Login authorization URL
// POST: Exchange code for profile and save line_user_id
// DELETE: Remove LINE linkage
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const eventId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'GET') {
    const channelId = context.env.LINE_LOGIN_CHANNEL_ID;
    if (!channelId) {
      return Response.json({ error: 'LINE Login not configured' }, { status: 503 });
    }

    const origin = new URL(context.request.url).origin;
    const redirectUri = `${origin}/line-callback`;
    const state = `${eventId}`;

    const authUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code` +
      `&client_id=${channelId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=profile`;

    return Response.json({ auth_url: authUrl });
  }

  if (context.request.method === 'POST') {
    const body = (await context.request.json()) as { code: string };
    const channelId = context.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = context.env.LINE_LOGIN_CHANNEL_SECRET;

    if (!channelId || !channelSecret) {
      return Response.json({ error: 'LINE Login not configured' }, { status: 503 });
    }

    const origin = new URL(context.request.url).origin;
    const redirectUri = `${origin}/line-callback`;

    // Exchange authorization code for access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return Response.json({ error: 'Failed to exchange token', detail: err }, { status: 400 });
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Get user profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return Response.json({ error: 'Failed to get LINE profile' }, { status: 400 });
    }

    const profile = await profileRes.json() as { userId: string; displayName: string };

    // Save LINE user ID to event
    await db
      .prepare('UPDATE events SET line_user_id = ? WHERE id = ?')
      .bind(profile.userId, eventId)
      .run();

    return Response.json({
      success: true,
      display_name: profile.displayName,
      linked: true,
    });
  }

  if (context.request.method === 'DELETE') {
    await db
      .prepare('UPDATE events SET line_user_id = NULL WHERE id = ?')
      .bind(eventId)
      .run();
    return Response.json({ success: true, linked: false });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};

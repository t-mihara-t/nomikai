interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const eventId = params.id;

  let venues: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      'SELECT * FROM venue_selections WHERE event_id = ? ORDER BY venue_type, created_at ASC'
    )
      .bind(eventId)
      .all();
    venues = res.results;
  } catch {
    // Table may not exist yet
  }

  const parsed = venues.map((v) => ({
    id: v.id,
    event_id: v.event_id,
    venue_type: v.venue_type,
    restaurant: JSON.parse(v.restaurant_data as string),
    created_at: v.created_at,
  }));

  return Response.json(parsed);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{
    venue_type: 'primary' | 'after_party';
    restaurant: Record<string, unknown>;
  }>();

  if (!body.venue_type || !body.restaurant) {
    return Response.json({ error: 'venue_type and restaurant are required' }, { status: 400 });
  }

  // Enforce max 2 primary venues
  if (body.venue_type === 'primary') {
    try {
      const existing = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM venue_selections WHERE event_id = ? AND venue_type = 'primary'"
      )
        .bind(eventId)
        .first<{ cnt: number }>();
      if (existing && existing.cnt >= 2) {
        return Response.json({ error: '一次会候補は最大2件までです' }, { status: 400 });
      }
    } catch {
      // Table may not exist, will be created on insert
    }
  }

  try {
    const result = await env.DB.prepare(
      'INSERT INTO venue_selections (event_id, venue_type, restaurant_data) VALUES (?, ?, ?) RETURNING *'
    )
      .bind(eventId, body.venue_type, JSON.stringify(body.restaurant))
      .first();

    return Response.json({
      id: result!.id,
      event_id: result!.event_id,
      venue_type: result!.venue_type,
      restaurant: body.restaurant,
      created_at: result!.created_at,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to save venue' },
      { status: 500 }
    );
  }
};

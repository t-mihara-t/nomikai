interface Env {
  DB: D1Database;
}

// GET: Get current pool amount for this event
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const eventId = params.id;

  // Use SELECT * to avoid error if pool_amount column doesn't exist yet
  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId).first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const poolAmount = (event.pool_amount as number) || 0;

  // Also get points summary
  const { results: points } = await env.DB.prepare(
    'SELECT type, SUM(amount) as total FROM recruit_points WHERE event_id = ? GROUP BY type'
  ).bind(eventId).all();

  let totalEarned = 0;
  let totalContributed = 0;
  for (const row of points) {
    if (row.type === 'earned') totalEarned = row.total as number;
    if (row.type === 'contributed') totalContributed = row.total as number;
  }

  const pointsBalance = totalEarned - totalContributed;

  return Response.json({
    pool_amount: poolAmount,
    points_balance: pointsBalance,
    total_surplus: poolAmount + pointsBalance,
  });
};

// POST: Pool the surplus from the latest calculation
export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{ amount: number }>();

  if (!body.amount || body.amount === 0) {
    return Response.json({ error: 'amount is required and must be non-zero' }, { status: 400 });
  }

  // Update pool_amount (try with pool_amount column, fallback to adding it)
  try {
    await env.DB.prepare('UPDATE events SET pool_amount = COALESCE(pool_amount, 0) + ? WHERE id = ?')
      .bind(body.amount, eventId).run();
  } catch {
    // Column might not exist yet - add it and retry
    await env.DB.prepare('ALTER TABLE events ADD COLUMN pool_amount INTEGER NOT NULL DEFAULT 0').run().catch(() => {});
    await env.DB.prepare('UPDATE events SET pool_amount = ? WHERE id = ?')
      .bind(body.amount, eventId).run();
  }

  // Record in transactions
  await env.DB.prepare(
    "INSERT INTO transactions (event_id, type, amount, description) VALUES (?, 'rounding_fee', ?, ?)"
  ).bind(eventId, body.amount, `余剰金プール: ${body.amount >= 0 ? '+' : ''}${body.amount}円`).run();

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId).first();

  return Response.json({
    pool_amount: (event?.pool_amount as number) || 0,
    pooled: body.amount,
  });
};

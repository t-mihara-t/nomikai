interface Env {
  DB: D1Database;
}

// GET: Get current pool amount for this event
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const eventId = params.id;

  const event = await env.DB.prepare('SELECT pool_amount FROM events WHERE id = ?')
    .bind(eventId).first<{ pool_amount: number }>();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

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

  return Response.json({
    pool_amount: event.pool_amount || 0,
    points_balance: totalEarned - totalContributed,
    total_surplus: (event.pool_amount || 0) + (totalEarned - totalContributed),
  });
};

// POST: Pool the surplus from the latest calculation
export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{ amount: number }>();

  if (!body.amount || body.amount === 0) {
    return Response.json({ error: 'amount is required and must be non-zero' }, { status: 400 });
  }

  // Update pool_amount
  await env.DB.prepare('UPDATE events SET pool_amount = COALESCE(pool_amount, 0) + ? WHERE id = ?')
    .bind(body.amount, eventId).run();

  // Record in transactions
  await env.DB.prepare(
    "INSERT INTO transactions (event_id, type, amount, description) VALUES (?, 'rounding_fee', ?, ?)"
  ).bind(eventId, body.amount, `余剰金プール: ${body.amount >= 0 ? '+' : ''}${body.amount}円`).run();

  const event = await env.DB.prepare('SELECT pool_amount FROM events WHERE id = ?')
    .bind(eventId).first<{ pool_amount: number }>();

  return Response.json({
    pool_amount: event?.pool_amount || 0,
    pooled: body.amount,
  });
};

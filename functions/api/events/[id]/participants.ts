interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const eventId = params.id;

  const { results } = await env.DB.prepare(
    'SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC'
  )
    .bind(eventId)
    .all();

  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{
    name: string;
    is_drinker?: boolean;
    paypay_id?: string;
  }>();

  if (!body.name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const event = await env.DB.prepare('SELECT id FROM events WHERE id = ?')
    .bind(eventId)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const result = await env.DB.prepare(
    'INSERT INTO participants (event_id, name, status, is_drinker, paypay_id) VALUES (?, ?, ?, ?, ?) RETURNING *'
  )
    .bind(
      eventId,
      body.name,
      'pending',
      body.is_drinker !== undefined ? (body.is_drinker ? 1 : 0) : 1,
      body.paypay_id || null
    )
    .first();

  return Response.json(result, { status: 201 });
};

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const eventId = params.id;

  const { results } = await env.DB.prepare(
    'SELECT * FROM candidate_dates WHERE event_id = ? ORDER BY date_time ASC'
  )
    .bind(eventId)
    .all();

  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{ date_time: string }>();

  if (!body.date_time) {
    return Response.json({ error: 'date_time is required' }, { status: 400 });
  }

  const event = await env.DB.prepare('SELECT id FROM events WHERE id = ?')
    .bind(eventId)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const result = await env.DB.prepare(
    'INSERT INTO candidate_dates (event_id, date_time) VALUES (?, ?) RETURNING *'
  )
    .bind(eventId, body.date_time)
    .first();

  return Response.json(result, { status: 201 });
};

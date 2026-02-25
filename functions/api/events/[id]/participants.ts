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
    join_after_party?: boolean;
  }>();

  if (!body.name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  // Default join_after_party to true when the event has after_party enabled
  const joinAfterParty = body.join_after_party !== undefined
    ? body.join_after_party
    : !!event.has_after_party;

  const result = await env.DB.prepare(
    'INSERT INTO participants (event_id, name, status, is_drinker, paypay_id, join_after_party) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  )
    .bind(
      eventId,
      body.name,
      'pending',
      body.is_drinker !== undefined ? (body.is_drinker ? 1 : 0) : 1,
      body.paypay_id || null,
      joinAfterParty ? 1 : 0
    )
    .first();

  return Response.json(result, { status: 201 });
};

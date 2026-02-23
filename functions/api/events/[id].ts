interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const { results: participants } = await env.DB.prepare(
    'SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC'
  )
    .bind(id)
    .all();

  const { results: candidateDates } = await env.DB.prepare(
    'SELECT * FROM candidate_dates WHERE event_id = ? ORDER BY date_time ASC'
  )
    .bind(id)
    .all();

  return Response.json({ ...event, participants, candidate_dates: candidateDates });
};

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id;
  const body = await request.json<{
    name?: string;
    date?: string;
    total_amount?: number;
    drinker_ratio?: number;
    has_after_party?: boolean;
    paypay_id?: string;
  }>();

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const result = await env.DB.prepare(
    `UPDATE events SET
      name = COALESCE(?, name),
      date = COALESCE(?, date),
      total_amount = COALESCE(?, total_amount),
      drinker_ratio = COALESCE(?, drinker_ratio),
      has_after_party = COALESCE(?, has_after_party),
      paypay_id = COALESCE(?, paypay_id)
    WHERE id = ? RETURNING *`
  )
    .bind(
      body.name || null,
      body.date || null,
      body.total_amount ?? null,
      body.drinker_ratio ?? null,
      body.has_after_party !== undefined ? (body.has_after_party ? 1 : 0) : null,
      body.paypay_id ?? null,
      id
    )
    .first();

  return Response.json(result);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  await env.DB.prepare('DELETE FROM candidate_dates WHERE event_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM participants WHERE event_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
};

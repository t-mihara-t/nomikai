interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results: events } = await env.DB.prepare(
    'SELECT * FROM events ORDER BY date DESC'
  ).all();

  const { results: allDates } = await env.DB.prepare(
    'SELECT * FROM candidate_dates ORDER BY date_time ASC'
  ).all();

  const eventsWithDates = events.map((event) => ({
    ...event,
    candidate_dates: allDates.filter((d) => d.event_id === event.id),
  }));

  return Response.json(eventsWithDates);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    name: string;
    date: string;
    has_after_party?: boolean;
    candidate_dates?: string[];
    paypay_id?: string;
  }>();

  if (!body.name || !body.date) {
    return Response.json({ error: 'name and date are required' }, { status: 400 });
  }

  const event = await env.DB.prepare(
    'INSERT INTO events (name, date, has_after_party, paypay_id) VALUES (?, ?, ?, ?) RETURNING *'
  )
    .bind(body.name, body.date, body.has_after_party ? 1 : 0, body.paypay_id || null)
    .first();

  if (event && body.candidate_dates && body.candidate_dates.length > 0) {
    const batch = body.candidate_dates.map((dt) =>
      env.DB.prepare(
        'INSERT INTO candidate_dates (event_id, date_time) VALUES (?, ?)'
      ).bind(event.id, dt)
    );
    await env.DB.batch(batch);
  }

  const { results: candidateDates } = await env.DB.prepare(
    'SELECT * FROM candidate_dates WHERE event_id = ? ORDER BY date_time ASC'
  )
    .bind(event!.id)
    .all();

  return Response.json({ ...event, candidate_dates: candidateDates }, { status: 201 });
};

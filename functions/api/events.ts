interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM events ORDER BY date DESC'
  ).all();

  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ name: string; date: string; paypay_id?: string }>();

  if (!body.name || !body.date) {
    return Response.json({ error: 'name and date are required' }, { status: 400 });
  }

  const result = await env.DB.prepare(
    'INSERT INTO events (name, date, paypay_id) VALUES (?, ?, ?) RETURNING *'
  )
    .bind(body.name, body.date, body.paypay_id || null)
    .first();

  return Response.json(result, { status: 201 });
};

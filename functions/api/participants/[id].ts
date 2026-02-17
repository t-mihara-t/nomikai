interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id;
  const body = await request.json<{
    name?: string;
    status?: 'attending' | 'absent';
    is_drinker?: boolean;
    amount_to_pay?: number;
    paid_status?: boolean;
    paypay_id?: string;
  }>();

  const participant = await env.DB.prepare('SELECT * FROM participants WHERE id = ?')
    .bind(id)
    .first();

  if (!participant) {
    return Response.json({ error: 'Participant not found' }, { status: 404 });
  }

  const result = await env.DB.prepare(
    `UPDATE participants SET
      name = COALESCE(?, name),
      status = COALESCE(?, status),
      is_drinker = COALESCE(?, is_drinker),
      amount_to_pay = COALESCE(?, amount_to_pay),
      paid_status = COALESCE(?, paid_status),
      paypay_id = COALESCE(?, paypay_id)
    WHERE id = ? RETURNING *`
  )
    .bind(
      body.name || null,
      body.status || null,
      body.is_drinker !== undefined ? (body.is_drinker ? 1 : 0) : null,
      body.amount_to_pay ?? null,
      body.paid_status !== undefined ? (body.paid_status ? 1 : 0) : null,
      body.paypay_id ?? null,
      id
    )
    .first();

  return Response.json(result);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  await env.DB.prepare('DELETE FROM participants WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
};

interface Env {
  DB: D1Database;
}

async function ensureParticipantColumns(db: D1Database): Promise<void> {
  const stmts = [
    'ALTER TABLE participants ADD COLUMN multiplier REAL NOT NULL DEFAULT 1.0',
    'ALTER TABLE participants ADD COLUMN discount_rate REAL NOT NULL DEFAULT 0.0',
    'ALTER TABLE participants ADD COLUMN join_after_party INTEGER NOT NULL DEFAULT 0',
  ];
  for (const sql of stmts) {
    try { await db.prepare(sql).run(); } catch { /* column already exists */ }
  }
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id;

  // Ensure columns exist before updating
  await ensureParticipantColumns(env.DB);

  const body = await request.json<{
    name?: string;
    status?: 'attending' | 'absent' | 'pending';
    is_drinker?: boolean;
    amount_to_pay?: number;
    paid_status?: boolean;
    paypay_id?: string;
    multiplier?: number;
    discount_rate?: number;
    join_after_party?: boolean;
  }>();

  const participant = await env.DB.prepare('SELECT * FROM participants WHERE id = ?')
    .bind(id)
    .first();

  if (!participant) {
    return Response.json({ error: 'Participant not found' }, { status: 404 });
  }

  try {
    const result = await env.DB.prepare(
      `UPDATE participants SET
        name = COALESCE(?, name),
        status = COALESCE(?, status),
        is_drinker = COALESCE(?, is_drinker),
        amount_to_pay = COALESCE(?, amount_to_pay),
        paid_status = COALESCE(?, paid_status),
        paypay_id = COALESCE(?, paypay_id),
        multiplier = COALESCE(?, multiplier),
        discount_rate = COALESCE(?, discount_rate),
        join_after_party = COALESCE(?, join_after_party)
      WHERE id = ? RETURNING *`
    )
      .bind(
        body.name || null,
        body.status || null,
        body.is_drinker !== undefined ? (body.is_drinker ? 1 : 0) : null,
        body.amount_to_pay ?? null,
        body.paid_status !== undefined ? (body.paid_status ? 1 : 0) : null,
        body.paypay_id ?? null,
        body.multiplier ?? null,
        body.discount_rate ?? null,
        body.join_after_party !== undefined ? (body.join_after_party ? 1 : 0) : null,
        id
      )
      .first();
    return Response.json(result);
  } catch {
    // Fallback if new columns don't exist yet
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
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  await env.DB.prepare('DELETE FROM participants WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
};

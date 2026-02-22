interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{
    total_amount: number;
    drinker_ratio: number;
    rounding: 'ceil' | 'floor';
  }>();

  if (!body.total_amount || body.total_amount <= 0) {
    return Response.json({ error: 'total_amount must be positive' }, { status: 400 });
  }

  if (!body.drinker_ratio || body.drinker_ratio < 1.0) {
    return Response.json({ error: 'drinker_ratio must be >= 1.0' }, { status: 400 });
  }

  const { results: participants } = await env.DB.prepare(
    "SELECT * FROM participants WHERE event_id = ? AND status = 'attending'"
  )
    .bind(eventId)
    .all();

  if (participants.length === 0) {
    return Response.json(
      { error: 'No attending participants' },
      { status: 400 }
    );
  }

  const drinkers = participants.filter((p) => p.is_drinker);
  const nonDrinkers = participants.filter((p) => !p.is_drinker);
  const drinkerCount = drinkers.length;
  const nonDrinkerCount = nonDrinkers.length;

  let drinkerAmount: number;
  let nonDrinkerAmount: number;

  if (nonDrinkerCount === 0) {
    // All drinkers
    const raw = body.total_amount / drinkerCount;
    drinkerAmount = roundTo100(raw, body.rounding);
    nonDrinkerAmount = 0;
  } else if (drinkerCount === 0) {
    // All non-drinkers
    const raw = body.total_amount / nonDrinkerCount;
    nonDrinkerAmount = roundTo100(raw, body.rounding);
    drinkerAmount = 0;
  } else {
    // Mixed: total = drinkerAmount * drinkerCount + nonDrinkerAmount * nonDrinkerCount
    // drinkerAmount = ratio * nonDrinkerAmount
    // total = ratio * nonDrinkerAmount * drinkerCount + nonDrinkerAmount * nonDrinkerCount
    // nonDrinkerAmount = total / (ratio * drinkerCount + nonDrinkerCount)
    const rawNonDrinker =
      body.total_amount / (body.drinker_ratio * drinkerCount + nonDrinkerCount);
    nonDrinkerAmount = roundTo100(rawNonDrinker, body.rounding);
    drinkerAmount = roundTo100(rawNonDrinker * body.drinker_ratio, body.rounding);
  }

  const totalCollected = drinkerAmount * drinkerCount + nonDrinkerAmount * nonDrinkerCount;
  const difference = totalCollected - body.total_amount;

  // Update event
  await env.DB.prepare(
    'UPDATE events SET total_amount = ?, drinker_ratio = ? WHERE id = ?'
  )
    .bind(body.total_amount, body.drinker_ratio, eventId)
    .run();

  // Update each participant's amount_to_pay
  const batch = participants.map((p) => {
    const amount = p.is_drinker ? drinkerAmount : nonDrinkerAmount;
    return env.DB.prepare(
      'UPDATE participants SET amount_to_pay = ? WHERE id = ?'
    ).bind(amount, p.id);
  });

  await env.DB.batch(batch);

  return Response.json({
    drinker_amount: drinkerAmount,
    non_drinker_amount: nonDrinkerAmount,
    drinker_count: drinkerCount,
    non_drinker_count: nonDrinkerCount,
    total_collected: totalCollected,
    difference,
  });
};

function roundTo100(value: number, mode: 'ceil' | 'floor'): number {
  if (mode === 'ceil') {
    return Math.ceil(value / 100) * 100;
  }
  return Math.floor(value / 100) * 100;
}

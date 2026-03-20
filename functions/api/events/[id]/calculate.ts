interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{
    total_amount: number;
    drinker_ratio: number;
    kampa_amount?: number;
    rounding: 'ceil' | 'floor';
    apply_discount?: boolean;
  }>();

  if (!body.total_amount || body.total_amount <= 0) {
    return Response.json({ error: 'total_amount must be positive' }, { status: 400 });
  }

  if (!body.drinker_ratio || body.drinker_ratio < 1.0) {
    return Response.json({ error: 'drinker_ratio must be >= 1.0' }, { status: 400 });
  }

  const kampaAmount = body.kampa_amount || 0;
  const adjustedTotal = body.total_amount - kampaAmount;

  if (adjustedTotal <= 0) {
    return Response.json({ error: 'カンパ額が合計金額以上です' }, { status: 400 });
  }

  const { results: participants } = await env.DB.prepare(
    "SELECT * FROM participants WHERE event_id = ? AND status = 'attending'"
  )
    .bind(eventId)
    .all();

  if (participants.length === 0) {
    return Response.json({ error: 'No attending participants' }, { status: 400 });
  }

  // Calculate weighted total: each participant's weight = multiplier * drinkFactor * (1 - discountRate)
  let totalWeight = 0;
  const pWeights: { id: number; name: string; multiplier: number; is_drinker: boolean; discount_rate: number; weight: number }[] = [];

  const applyDiscount = body.apply_discount !== false; // default true

  for (const p of participants) {
    const multiplier = (p.multiplier as number) || 1.0;
    const rawDiscount = (p.discount_rate as number) || 0.0;
    // When discount disabled, only keep guest (100%OFF) discount
    const discountRate = applyDiscount ? rawDiscount : (rawDiscount >= 1.0 ? rawDiscount : 0);
    const isDrinker = !!p.is_drinker;
    const drinkFactor = isDrinker ? body.drinker_ratio : 1.0;
    const weight = multiplier * drinkFactor * (1 - discountRate);
    totalWeight += weight;
    pWeights.push({ id: p.id as number, name: p.name as string, multiplier, is_drinker: isDrinker, discount_rate: discountRate, weight });
  }

  const basePerWeight = adjustedTotal / totalWeight;

  const breakdowns: {
    participant_id: number; name: string; base_amount: number; multiplier: number;
    is_drinker: boolean; drinker_ratio: number; after_multiplier: number;
    discount_rate: number; discount_amount: number; final_amount: number;
  }[] = [];

  const batch = [];
  let totalCollected = 0;
  let drinkerAmount = 0;
  let nonDrinkerAmount = 0;
  let drinkerCount = 0;
  let nonDrinkerCount = 0;

  for (const pw of pWeights) {
    const drinkFactor = pw.is_drinker ? body.drinker_ratio : 1.0;
    const rawBeforeDiscount = basePerWeight * pw.multiplier * drinkFactor;
    const discountAmount = rawBeforeDiscount * pw.discount_rate;
    const rawFinal = rawBeforeDiscount - discountAmount;
    const finalAmount = roundTo500(rawFinal, body.rounding);

    breakdowns.push({
      participant_id: pw.id, name: pw.name,
      base_amount: Math.round(basePerWeight),
      multiplier: pw.multiplier, is_drinker: pw.is_drinker,
      drinker_ratio: drinkFactor,
      after_multiplier: Math.round(rawBeforeDiscount),
      discount_rate: pw.discount_rate,
      discount_amount: Math.round(discountAmount),
      final_amount: finalAmount,
    });

    totalCollected += finalAmount;
    if (pw.is_drinker) { drinkerCount++; drinkerAmount = finalAmount; }
    else { nonDrinkerCount++; nonDrinkerAmount = finalAmount; }

    batch.push(env.DB.prepare('UPDATE participants SET amount_to_pay = ? WHERE id = ?').bind(finalAmount, pw.id));
  }

  // Update event
  try {
    await env.DB.prepare('UPDATE events SET total_amount = ?, drinker_ratio = ?, kampa_amount = ? WHERE id = ?')
      .bind(body.total_amount, body.drinker_ratio, kampaAmount, eventId).run();
  } catch {
    await env.DB.prepare('UPDATE events SET total_amount = ?, drinker_ratio = ? WHERE id = ?')
      .bind(body.total_amount, body.drinker_ratio, eventId).run();
  }

  await env.DB.batch(batch);

  // Pool the surplus (rounding difference) into the database
  const surplus = totalCollected - body.total_amount;
  if (surplus !== 0) {
    await env.DB.prepare(
      "INSERT INTO transactions (event_id, type, amount, description) VALUES (?, 'rounding_fee', ?, ?)"
    ).bind(eventId, surplus, `精算端数プール（500円刻み丸め）: ${surplus >= 0 ? '+' : ''}${surplus}円`).run();

    // Add surplus to kampa_amount for tracking
    await env.DB.prepare('UPDATE events SET pool_amount = COALESCE(pool_amount, 0) + ? WHERE id = ?')
      .bind(surplus, eventId).run();
  }

  return Response.json({
    drinker_amount: drinkerAmount, non_drinker_amount: nonDrinkerAmount,
    drinker_count: drinkerCount, non_drinker_count: nonDrinkerCount,
    total_collected: totalCollected, difference: surplus,
    kampa_amount: kampaAmount, adjusted_total: adjustedTotal, breakdowns,
  });
};

function roundTo500(value: number, mode: 'ceil' | 'floor'): number {
  return mode === 'ceil' ? Math.ceil(value / 500) * 500 : Math.floor(value / 500) * 500;
}

import type { CalculateResult, Participant, ParticipantBreakdown } from '@/types';

function roundTo100(value: number, mode: 'ceil' | 'floor'): number {
  return mode === 'ceil' ? Math.ceil(value / 100) * 100 : Math.floor(value / 100) * 100;
}

export function calculateSplit(
  totalAmount: number,
  attending: Participant[],
  drinkerRatio: number,
  kampaAmount: number,
  rounding: 'ceil' | 'floor'
): CalculateResult {
  if (attending.length === 0) {
    return {
      drinker_amount: 0, non_drinker_amount: 0,
      drinker_count: 0, non_drinker_count: 0,
      total_collected: 0, difference: 0,
      kampa_amount: kampaAmount, adjusted_total: totalAmount - kampaAmount,
      breakdowns: [],
    };
  }

  const adjustedTotal = totalAmount - kampaAmount;

  // Calculate weighted total
  let totalWeight = 0;
  const pWeights = attending.map((p) => {
    const multiplier = p.multiplier || 1.0;
    const discountRate = p.discount_rate || 0.0;
    const drinkFactor = p.is_drinker ? drinkerRatio : 1.0;
    const weight = multiplier * drinkFactor * (1 - discountRate);
    totalWeight += weight;
    return { ...p, multiplier, discountRate, drinkFactor, weight };
  });

  const basePerWeight = adjustedTotal / totalWeight;

  const breakdowns: ParticipantBreakdown[] = [];
  let totalCollected = 0;
  let drinkerAmount = 0;
  let nonDrinkerAmount = 0;
  let drinkerCount = 0;
  let nonDrinkerCount = 0;

  for (const pw of pWeights) {
    const rawBeforeDiscount = basePerWeight * pw.multiplier * pw.drinkFactor;
    const discountAmount = rawBeforeDiscount * pw.discountRate;
    const rawFinal = rawBeforeDiscount - discountAmount;
    const finalAmount = roundTo100(rawFinal, rounding);

    breakdowns.push({
      participant_id: pw.id,
      name: pw.name,
      base_amount: Math.round(basePerWeight),
      multiplier: pw.multiplier,
      is_drinker: pw.is_drinker,
      drinker_ratio: pw.drinkFactor,
      after_multiplier: Math.round(rawBeforeDiscount),
      discount_rate: pw.discountRate,
      discount_amount: Math.round(discountAmount),
      final_amount: finalAmount,
    });

    totalCollected += finalAmount;
    if (pw.is_drinker) { drinkerCount++; drinkerAmount = finalAmount; }
    else { nonDrinkerCount++; nonDrinkerAmount = finalAmount; }
  }

  return {
    drinker_amount: drinkerAmount,
    non_drinker_amount: nonDrinkerAmount,
    drinker_count: drinkerCount,
    non_drinker_count: nonDrinkerCount,
    total_collected: totalCollected,
    difference: totalCollected - totalAmount,
    kampa_amount: kampaAmount,
    adjusted_total: adjustedTotal,
    breakdowns,
  };
}

export function generatePayPayLink(paypayId: string, amount: number): string {
  return `https://paypay.me/${paypayId}/${amount}`;
}

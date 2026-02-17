import type { CalculateResult } from '@/types';

function roundTo100(value: number, mode: 'ceil' | 'floor'): number {
  if (mode === 'ceil') {
    return Math.ceil(value / 100) * 100;
  }
  return Math.floor(value / 100) * 100;
}

export function calculateSplit(
  totalAmount: number,
  drinkerCount: number,
  nonDrinkerCount: number,
  drinkerRatio: number,
  rounding: 'ceil' | 'floor'
): CalculateResult {
  const totalPeople = drinkerCount + nonDrinkerCount;

  if (totalPeople === 0) {
    return {
      drinker_amount: 0,
      non_drinker_amount: 0,
      drinker_count: 0,
      non_drinker_count: 0,
      total_collected: 0,
      difference: 0,
    };
  }

  let drinkerAmount: number;
  let nonDrinkerAmount: number;

  if (nonDrinkerCount === 0) {
    const raw = totalAmount / drinkerCount;
    drinkerAmount = roundTo100(raw, rounding);
    nonDrinkerAmount = 0;
  } else if (drinkerCount === 0) {
    const raw = totalAmount / nonDrinkerCount;
    nonDrinkerAmount = roundTo100(raw, rounding);
    drinkerAmount = 0;
  } else {
    const rawNonDrinker =
      totalAmount / (drinkerRatio * drinkerCount + nonDrinkerCount);
    nonDrinkerAmount = roundTo100(rawNonDrinker, rounding);
    drinkerAmount = roundTo100(rawNonDrinker * drinkerRatio, rounding);
  }

  const totalCollected =
    drinkerAmount * drinkerCount + nonDrinkerAmount * nonDrinkerCount;

  return {
    drinker_amount: drinkerAmount,
    non_drinker_amount: nonDrinkerAmount,
    drinker_count: drinkerCount,
    non_drinker_count: nonDrinkerCount,
    total_collected: totalCollected,
    difference: totalCollected - totalAmount,
  };
}

export function generatePayPayLink(paypayId: string, amount: number): string {
  return `https://paypay.me/${paypayId}/${amount}`;
}

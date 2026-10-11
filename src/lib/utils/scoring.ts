// Quiz scoring helpers (PRD §7.7).

// Matching earns partial credit: correct pairs over total pairs, as a 0..1 ratio.
export function matchingPartial(correctPairs: number, totalPairs: number): number {
  if (totalPairs <= 0) return 0;
  return correctPairs / totalPairs;
}

// Score as a percentage, guarding against a zero denominator.
export function percent(earned: number, total: number): number {
  if (total <= 0) return 0;
  return (earned / total) * 100;
}

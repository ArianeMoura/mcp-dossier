// Recency-decay model shared by ownership and risk. Single source of truth:
// changing the half-life here changes both consistently.

export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const MS_PER_MONTH = MS_PER_DAY * 30; // ~30 days (heuristic)
export const HALF_LIFE_MONTHS = 6;

export function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_MONTH;
}

// Weight in [0, 1]: 1 if `date` is now, halving every `halfLifeMonths` of age.
export function decayWeight(
  date: Date,
  now: Date,
  halfLifeMonths = HALF_LIFE_MONTHS,
): number {
  return Math.pow(0.5, monthsBetween(date, now) / halfLifeMonths);
}

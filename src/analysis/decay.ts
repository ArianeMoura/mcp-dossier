// Shared by ownership and risk: changing the half-life moves both.

export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const MS_PER_MONTH = MS_PER_DAY * 30;
export const HALF_LIFE_MONTHS = 6;

export function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_MONTH;
}

// Clamped at 1 so a future date (clock skew) can't weigh more than "now".
export function decayWeight(
  date: Date,
  now: Date,
  halfLifeMonths = HALF_LIFE_MONTHS,
): number {
  const weight = Math.pow(0.5, monthsBetween(date, now) / halfLifeMonths);
  return Math.min(weight, 1);
}

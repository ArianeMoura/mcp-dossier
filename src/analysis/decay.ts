// Modelo de decaimento por recência, compartilhado por ownership e risco.
// Fonte única: mudar a meia-vida aqui muda os dois de forma consistente.

export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const MS_PER_MONTH = MS_PER_DAY * 30; // ~30 dias (heurística)
export const HALF_LIFE_MONTHS = 6;

export function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_MONTH;
}

// Peso em [0, 1]: 1 se `date` é agora, 0.5 a cada `halfLifeMonths` de idade.
export function decayWeight(
  date: Date,
  now: Date,
  halfLifeMonths = HALF_LIFE_MONTHS,
): number {
  return Math.pow(0.5, monthsBetween(date, now) / halfLifeMonths);
}

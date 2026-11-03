export const TICKS = 4;

/** Smallest "nice" axis maximum (step × 4, step ∈ {1, 2, 2.5, 5} × 10ⁿ) that fits `max`. */
export function niceMax(max, ticks = TICKS) {
  if (!(max > 0)) return 1;
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  return step * ticks;
}

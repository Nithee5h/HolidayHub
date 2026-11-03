const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function toIsoDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  return toIsoDate(new Date(d.getTime() + days * DAY_MS));
}

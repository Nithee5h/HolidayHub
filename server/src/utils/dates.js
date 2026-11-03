import { env } from '../config/env.js';

/*
 * Departures are calendar dates. They are stored as Date at 00:00 UTC and
 * exchanged with clients as 'YYYY-MM-DD' strings.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date in the app timezone, e.g. '2026-10-28'. */
export function todayIso(timeZone = env.APP_TIMEZONE, now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const dateFromIso = (iso) => new Date(`${iso}T00:00:00.000Z`);
export const isoFromDate = (date) => (date instanceof Date ? date.toISOString().slice(0, 10) : date);
export const addDays = (iso, days) => isoFromDate(new Date(dateFromIso(iso).getTime() + days * DAY_MS));

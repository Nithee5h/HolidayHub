import { todayIso } from './dates';

/** Window after a requested travel date in which a departure counts as a match (mirrors the API). */
export const DATE_WINDOW_DAYS = 30;
export const LOW_SEATS = 5;

export const unitPrice = (pkg, departure) => departure?.pricePerPerson ?? pkg.basePrice;

export const isUpcoming = (departure, today = todayIso()) => departure.startDate > today;

/** Open, in the future and with at least `travellers` seats left. */
export function isBookable(departure, travellers = 1, today = todayIso()) {
  return departure.status === 'open' && isUpcoming(departure, today) && departure.seatsRemaining >= travellers;
}

/** Upcoming departures shown to customers (open + sold out), soonest first. */
export function visibleDepartures(list, today = todayIso()) {
  return list
    .filter((d) => isUpcoming(d, today) && d.status === 'open')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function nextBookable(list, travellers = 1, today = todayIso()) {
  return visibleDepartures(list, today).find((d) => isBookable(d, travellers, today));
}

export function seatsLabel(departure) {
  if (departure.seatsRemaining === 0) return 'Sold out';
  if (departure.seatsRemaining === 1) return 'Last seat';
  if (departure.seatsRemaining <= LOW_SEATS) return `Only ${departure.seatsRemaining} left`;
  return `${departure.seatsRemaining} seats left`;
}

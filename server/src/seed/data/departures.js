/*
 * Demo departure schedule per package slug, relative to the seed date so the
 * demo never goes stale. Row: [daysFromToday, capacity, seatsRemaining, status, priceFactor?]
 * priceFactor > 1 marks a peak-season departure with its own pricePerPerson.
 */
export const departureSchedule = {
  'kerala-backwaters-escape': [
    [9, 20, 0, 'open'],
    [23, 20, 2, 'open'],
    [44, 20, 14, 'open'],
    [72, 20, 20, 'open', 1.12],
  ],
  'bali-island-romance': [
    [16, 12, 5, 'open'],
    [47, 12, 12, 'open', 1.15],
    [78, 12, 10, 'open'],
  ],
  'maldives-overwater-luxury': [
    [30, 8, 3, 'open', 1.1],
    [58, 8, 8, 'open'],
  ],
  'swiss-alps-explorer': [
    [-20, 16, 0, 'closed'],
    [38, 16, 9, 'open'],
    [95, 16, 16, 'open', 1.08],
  ],
  'goa-weekend-beach-break': [
    [5, 30, 11, 'open'],
    [12, 30, 22, 'open'],
    [19, 30, 0, 'closed'],
    [26, 30, 30, 'open', 1.2],
  ],
  'manali-snow-trek': [
    [14, 15, 6, 'open'],
    [35, 15, 1, 'open'],
    [63, 15, 15, 'cancelled'],
  ],
  'dubai-city-lights': [
    [21, 24, 18, 'open'],
    [50, 24, 24, 'open', 1.1],
  ],
  // Demonstrates the "no upcoming departures" state.
  'paris-romantic-getaway': [[-12, 10, 0, 'closed']],
  'goa-budget-backpacker': [
    [7, 18, 4, 'open'],
    [28, 18, 18, 'open'],
  ],
  'manali-weekend-escape': [
    [3, 16, 9, 'open'],
    [10, 16, 16, 'open'],
    [17, 16, 7, 'open'],
  ],
};

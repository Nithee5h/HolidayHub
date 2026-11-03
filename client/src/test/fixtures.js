import { addDays, todayIso } from '../utils/dates';

/* API-shaped fixtures for component tests (the server owns real data). */
const img = (n) => ({ url: `https://images.unsplash.com/photo-${n}`, alt: `Photo ${n}` });
const day = (d, title, description, activities = []) => ({ day: d, title, description, activities });
const today = todayIso();

export const kerala = {
  id: 'pkg-kerala',
  slug: 'kerala-backwaters-escape',
  title: 'Kerala Backwaters Escape',
  destination: 'Kerala',
  country: 'India',
  category: 'Family',
  durationDays: 5,
  summary: 'Drift through palm-lined canals on a private houseboat.',
  description: 'A slow, scenic loop through Kochi, Munnar and the Alleppey backwaters.',
  basePrice: 24999,
  currency: 'INR',
  images: [img(1), img(2), img(3)],
  itinerary: [
    day(1, 'Arrive in Kochi', 'Airport pickup and a Fort Kochi walk.', ['Fort Kochi walk']),
    day(2, 'Drive to Munnar', 'Scenic drive into the tea country.'),
    day(3, 'Depart', 'Transfer to the airport.'),
  ],
  inclusions: ['4 nights accommodation', 'Daily breakfast'],
  exclusions: ['Flights'],
  tags: ['tropical'],
  featured: true,
  status: 'published',
};

export const bali = {
  ...kerala,
  id: 'pkg-bali',
  slug: 'bali-island-romance',
  title: 'Bali Island Romance',
  destination: 'Bali',
  country: 'Indonesia',
  category: 'Honeymoon',
  durationDays: 6,
  basePrice: 64999,
  images: [img(4)],
};

export const paris = { ...kerala, id: 'pkg-paris', slug: 'paris-romantic-getaway', title: 'Paris Romantic Getaway', destination: 'Paris', country: 'France' };

const dep = (id, offset, seatsRemaining, extra = {}) => ({
  id,
  packageId: kerala.id,
  startDate: addDays(today, offset),
  endDate: addDays(today, offset + 4),
  capacity: 20,
  seatsRemaining,
  status: 'open',
  ...extra,
});

/** Kerala: sold out, 2 seats left, plenty, peak-priced. */
export const keralaDepartures = [dep('dep-1', 9, 0), dep('dep-2', 23, 2), dep('dep-3', 44, 14), dep('dep-4', 72, 20, { pricePerPerson: 27999 })];

export const withSummary = (pkg, next = keralaDepartures[1], upcomingCount = 4) => ({ ...pkg, departureSummary: { upcomingCount, next } });

export const listResponse = (items) => ({ items, total: items.length, page: 1, pages: 1, limit: 50 });

export const facets = {
  destinations: [
    { name: 'Kerala', count: 1, minPrice: 24999 },
    { name: 'Goa', count: 2, minPrice: 8999 },
  ],
  categories: [{ name: 'Family', count: 2 }],
  themes: [{ name: 'romantic', count: 3 }],
};

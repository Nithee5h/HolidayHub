/*
 * URL search-state helpers shared by the homepage search widget and /packages.
 * Query parameters are the source of truth so every result set is shareable;
 * the API applies the actual filtering. Parameters:
 *   destination, category, theme, minPrice, maxPrice, duration, date, travellers, sort
 */

export const budgetOptions = [
  { value: '', label: 'Any budget' },
  { value: '0-15000', label: 'Under ₹15,000', min: 0, max: 15000 },
  { value: '15000-50000', label: '₹15,000 – ₹50,000', min: 15000, max: 50000 },
  { value: '50000-100000', label: '₹50,000 – ₹1,00,000', min: 50000, max: 100000 },
  { value: '100000-', label: '₹1,00,000+', min: 100000 },
];

export const sortOptions = [
  { value: '', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'duration-asc', label: 'Duration: shortest first' },
  { value: 'duration-desc', label: 'Duration: longest first' },
];

export const durationOptions = [
  { value: '', label: 'Any length' },
  { value: '1-3', label: 'Short break · 1–3 days', min: 1, max: 3 },
  { value: '4-5', label: '4–5 days', min: 4, max: 5 },
  { value: '6-', label: '6+ days', min: 6 },
];

export const MAX_TRAVELLERS = 12;

const toInt = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Read a URLSearchParams into a normalised, validated filter object. */
export function parseSearchParams(params) {
  const travellers = toInt(params.get('travellers'));
  const date = params.get('date') ?? '';
  return {
    destination: (params.get('destination') ?? '').trim(),
    category: (params.get('category') ?? '').trim(),
    theme: (params.get('theme') ?? '').trim().toLowerCase(),
    minPrice: toInt(params.get('minPrice')),
    maxPrice: toInt(params.get('maxPrice')),
    duration: durationOptions.some((o) => o.value === params.get('duration')) ? params.get('duration') : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    travellers: travellers ? Math.min(Math.max(travellers, 1), MAX_TRAVELLERS) : undefined,
    sort: sortOptions.some((o) => o.value === params.get('sort')) ? params.get('sort') : '',
  };
}

/** Build a query string from a filter object, omitting empty values. */
export function buildSearchParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value).trim());
  });
  return params;
}

export function budgetToRange(budgetValue) {
  const option = budgetOptions.find((o) => o.value === budgetValue);
  return option ? { minPrice: option.min, maxPrice: option.max } : {};
}

export function rangeToBudget(minPrice, maxPrice) {
  const option = budgetOptions.find((o) => o.value && o.min === (minPrice ?? 0) && o.max === maxPrice);
  return option ? option.value : '';
}

/* Package editor model: form state <-> API body, plus client validation mirroring the server schema. */

const lines = (s) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const commaList = (s) =>
  s
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

export const emptyPackage = {
  title: '',
  slug: '',
  destination: '',
  country: '',
  category: 'Family',
  durationDays: 3,
  basePrice: '',
  status: 'draft',
  featured: false,
  tags: '',
  summary: '',
  description: '',
  images: [{ url: '', alt: '' }],
  itinerary: [{ title: '', description: '', activities: '' }],
  inclusions: '',
  exclusions: '',
};

/** API package → editable form state (lists as text). */
export function toFormState(pkg) {
  return {
    ...emptyPackage,
    ...pkg,
    basePrice: String(pkg.basePrice),
    tags: (pkg.tags ?? []).join(', '),
    images: pkg.images?.length ? pkg.images.map(({ url, alt }) => ({ url, alt })) : emptyPackage.images,
    itinerary: (pkg.itinerary ?? []).map((d) => ({ title: d.title, description: d.description, activities: (d.activities ?? []).join(', ') })),
    inclusions: (pkg.inclusions ?? []).join('\n'),
    exclusions: (pkg.exclusions ?? []).join('\n'),
  };
}

/** Form state → API body. */
export function toPayload(v, { includeSlug }) {
  return {
    ...(includeSlug && v.slug.trim() ? { slug: v.slug.trim() } : {}),
    title: v.title.trim(),
    destination: v.destination.trim(),
    country: v.country.trim(),
    category: v.category,
    durationDays: Number(v.durationDays),
    basePrice: Number(v.basePrice),
    status: v.status,
    featured: v.featured,
    tags: commaList(v.tags).map((t) => t.toLowerCase()),
    summary: v.summary.trim(),
    description: v.description.trim(),
    images: v.images.map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })).filter((i) => i.url || i.alt),
    itinerary: v.itinerary.map((d, i) => ({ day: i + 1, title: d.title.trim(), description: d.description.trim(), activities: commaList(d.activities) })),
    inclusions: lines(v.inclusions),
    exclusions: lines(v.exclusions),
  };
}

/** Client checks mirroring the server schema; keys are API field paths. */
export function validatePackage(v) {
  const e = {};
  if (v.title.trim().length < 3) e.title = 'Title is required.';
  if (v.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug.trim())) e.slug = 'Use lowercase letters, numbers and hyphens.';
  if (v.destination.trim().length < 2) e.destination = 'Destination is required.';
  if (v.country.trim().length < 2) e.country = 'Country is required.';
  const d = Number(v.durationDays);
  if (!Number.isInteger(d) || d < 1 || d > 60) e.durationDays = 'Duration must be 1–60 days.';
  const p = Number(v.basePrice);
  if (v.basePrice === '' || !Number.isInteger(p) || p < 0) e.basePrice = 'Enter a whole-rupee price.';
  if (v.summary.trim().length < 10) e.summary = 'Summary must be at least 10 characters.';
  if (v.description.trim().length < 20) e.description = 'Description must be at least 20 characters.';
  const imgs = v.images.filter((i) => i.url.trim() || i.alt.trim());
  if (imgs.length === 0) e.images = 'Add at least one image.';
  v.images.forEach((img, i) => {
    if (!img.url.trim() && !img.alt.trim()) return;
    if (!/^https:\/\/\S+$/.test(img.url.trim())) e[`images.${i}.url`] = 'Image URL must start with https://';
    if (img.alt.trim().length < 3) e[`images.${i}.alt`] = 'Describe the image for screen readers.';
  });
  if (v.itinerary.length === 0) e.itinerary = 'Add at least one itinerary day.';
  if (v.itinerary.length > d) e.itinerary = `The itinerary has more days than the ${d}-day duration.`;
  v.itinerary.forEach((day, i) => {
    if (day.title.trim().length < 2) e[`itinerary.${i}.title`] = 'Day title is required.';
    if (day.description.trim().length < 5) e[`itinerary.${i}.description`] = 'Describe the day.';
  });
  return e;
}

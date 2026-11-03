/*
 * Photography is served from Unsplash under the Unsplash License
 * (https://unsplash.com/license) — free to use, attribution appreciated.
 * Images are stored as plain { url, alt } (matching the package schema);
 * Unsplash URLs get responsive size parameters at render time, any other
 * host is used as-is.
 */
const UNSPLASH_HOST = 'images.unsplash.com';

const u = (id) => `https://${UNSPLASH_HOST}/photo-${id}`;

function isUnsplash(url) {
  try {
    return new URL(url).host === UNSPLASH_HOST;
  } catch {
    return false;
  }
}

export function sizedImageUrl(url, width = 1200, quality = 75) {
  if (!isUnsplash(url)) return url;
  const sized = new URL(url);
  sized.search = new URLSearchParams({ auto: 'format', fit: 'crop', w: String(width), q: String(quality) });
  return sized.toString();
}

export function imageSrcSet(url, widths = [480, 800, 1200, 1600]) {
  if (!isUnsplash(url)) return undefined;
  return widths.map((w) => `${sizedImageUrl(url, w)} ${w}w`).join(', ');
}

export const photos = {
  heroBeach: { url: u('1507525428034-b723cf961d3e'), alt: 'Golden sunset over a calm tropical beach with gentle waves' },
  bali: { url: u('1537996194471-e657df975ab4'), alt: 'Ulun Danu Beratan temple reflected in a misty lake in Bali' },
  maldives: { url: u('1514282401047-d79a71a590e8'), alt: 'Aerial view of overwater villas in a turquoise Maldivian lagoon' },
  switzerland: { url: u('1530122037265-a5f1f91d3b99'), alt: 'Lauterbrunnen valley with chalets, cliffs and a waterfall in Switzerland' },
  kerala: { url: u('1602216056096-3b40cc0c9944'), alt: 'Traditional houseboat on palm-fringed Kerala backwaters' },
  goa: { url: u('1512343879784-a960bf40e7f2'), alt: 'Palm-lined beach and turquoise sea in Goa' },
  manali: { url: u('1626621341517-bbf3d9990a23'), alt: 'Trekker on a snowy Himalayan ridge near Manali' },
  dubai: { url: u('1512453979798-5ea266f8880c'), alt: 'Dubai skyline with Burj Khalifa at sunset' },
  paris: { url: u('1502602898657-3e91760cbb34'), alt: 'Eiffel Tower above the Seine at dusk in Paris' },
  venice: { url: u('1523906834658-6e24ef2386f9'), alt: 'Gondola gliding past the Rialto Bridge in Venice' },
  hikers: { url: u('1551632811-561732d1e306'), alt: 'Two hikers with backpacks walking toward snow-capped peaks' },
  resortPool: { url: u('1540541338287-41700207dee6'), alt: 'Seaside resort pool lined with palms and sun loungers' },
  cinqueTerre: { url: u('1516483638261-f4dbaf036963'), alt: 'Colourful cliffside houses above the sea in Cinque Terre' },
  alpineLake: { url: u('1501785888041-af3ef285b470'), alt: 'Rowing boat on an emerald alpine lake between mountains' },
  lakeBoat: { url: u('1476514525535-07fb3b4ae5f1'), alt: 'Bow of a wooden boat on a turquoise mountain lake' },
  mountainsAbove: { url: u('1506905925346-21bda4d32df4'), alt: 'Mountain peaks rising above a sea of clouds at sunrise' },
  roadTrip: { url: u('1469854523086-cc02fe5d8800'), alt: 'Yellow camper van on a desert road between red rock formations' },
  travelFlatlay: { url: u('1488646953014-85cb44e25828'), alt: 'Map, camera, notebook and backpack laid out for trip planning' },
  oldTown: { url: u('1527631746610-bca00a040d60'), alt: 'Traveller with a backpack walking down a narrow old-town lane' },
  baliTerraces: { url: u('1555400038-63f5ba517a47'), alt: 'Terraced green rice fields among palm trees in Bali' },
};

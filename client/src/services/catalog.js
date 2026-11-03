import { buildSearchParams } from '../utils/search';
import { get } from './http';

/* Catalog endpoints of the HolidayHub REST API. */

const LIST_LIMIT = 50;

/** GET /packages — filters come from parseSearchParams(); returns { items, total, page, pages }. */
export function listPackages(filters = {}, { limit = LIST_LIMIT } = {}) {
  return get('/packages', buildSearchParams({ ...filters, limit }));
}

export const getPackage = (slug) => get(`/packages/${encodeURIComponent(slug)}`);
export const getDepartures = (slug) => get(`/packages/${encodeURIComponent(slug)}/departures`);
export const getRelatedPackages = (slug) => get(`/packages/${encodeURIComponent(slug)}/related`);
export const getDeparture = (id) => get(`/departures/${encodeURIComponent(id)}`);

// Facets change rarely; share one in-flight/recent request across homepage sections.
const FACETS_TTL_MS = 60_000;
let facetsCache = null;

/** GET /packages/facets — { destinations: [{name,count,minPrice}], categories, themes }. */
export function getFacets() {
  if (facetsCache && Date.now() - facetsCache.at < FACETS_TTL_MS) return facetsCache.promise;
  const promise = get('/packages/facets').catch((err) => {
    facetsCache = null;
    throw err;
  });
  facetsCache = { at: Date.now(), promise };
  return promise;
}

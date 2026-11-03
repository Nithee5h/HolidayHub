import * as catalog from '../services/catalogService.js';
import { ok } from '../utils/respond.js';

export const listPackages = async (req, res) => ok(res, await catalog.listPackages(req.valid.query));
export const getFacets = async (_req, res) => ok(res, await catalog.getFacets());
export const getPackage = async (req, res) => ok(res, (await catalog.getPublishedPackage(req.valid.params.id)).toJSON());
export const getPackageDepartures = async (req, res) => ok(res, await catalog.getPackageDepartures(req.valid.params.id));
export const getRelatedPackages = async (req, res) =>
  ok(res, await catalog.getRelatedPackages(req.valid.params.id, req.valid.query.limit));
export const getDeparture = async (req, res) => ok(res, await catalog.getDepartureWithPackage(req.valid.params.id));

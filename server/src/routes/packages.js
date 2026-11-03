import { Router } from 'express';
import * as ctrl from '../controllers/catalogController.js';
import { validate } from '../middleware/validate.js';
import { idParam, listPackagesQuery, relatedQuery } from '../validators/catalog.js';

const router = Router();

router.get('/', validate({ query: listPackagesQuery }), ctrl.listPackages);
router.get('/facets', ctrl.getFacets);
router.get('/:id', validate({ params: idParam }), ctrl.getPackage);
router.get('/:id/departures', validate({ params: idParam }), ctrl.getPackageDepartures);
router.get('/:id/related', validate({ params: idParam, query: relatedQuery }), ctrl.getRelatedPackages);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/catalogController.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/catalog.js';

const router = Router();

router.get('/:id', validate({ params: idParam }), ctrl.getDeparture);

export default router;

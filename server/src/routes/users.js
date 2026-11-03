import { Router } from 'express';
import { updateMe } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileBody } from '../validators/auth.js';

const router = Router();

router.patch('/me', requireAuth, validate({ body: updateProfileBody }), updateMe);

export default router;

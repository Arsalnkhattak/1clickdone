import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { getDashboardSummary } from './reports.controller.js';

const router = Router();

router.use(authenticate);

router.get('/summary', getDashboardSummary);

export default router;

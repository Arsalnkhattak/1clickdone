import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import * as printJobController from './printJob.controller.js';

const router = Router();

// Staff authentication required for all print job operations
router.use(authenticate);

router.post('/', printJobController.createJob);
router.get('/', printJobController.getJobs);
router.get('/:id', printJobController.getJobById);
router.patch('/:id/status', printJobController.updateJobStatus);
router.delete('/:id', printJobController.deleteJob);

export default router;

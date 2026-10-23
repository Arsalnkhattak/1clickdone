import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import * as billingController from './billing.controller.js';

const router = Router();

router.use(authenticate);

// Financial summary
router.get('/summary', billingController.getBillingSummary);

// Task-level billing & payments
router.post('/tasks/:id/payments', billingController.recordPayment);
router.patch('/tasks/:id/billing', billingController.updateBilling);
router.get('/tasks/:id/receipt', billingController.getTaskReceipt);

// Services & pricing management
router.get('/services', billingController.getServices);
router.post('/services', billingController.createService);
router.patch('/services/:id', billingController.updateService);

export default router;

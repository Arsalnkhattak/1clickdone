import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.validation.js';
import * as customerController from './customer.controller.js';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

router
  .route('/')
  .post(validate(createCustomerSchema), customerController.createCustomer)
  .get(customerController.getCustomers);

router
  .route('/:id')
  .get(customerController.getCustomer)
  .patch(validate(updateCustomerSchema), customerController.updateCustomer);

router.get('/:id/tasks', customerController.getCustomerTasks);

export default router;

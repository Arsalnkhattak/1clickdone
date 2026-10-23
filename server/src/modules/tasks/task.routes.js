import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  addTaskNoteSchema,
  updateChecklistSchema,
  cancelTaskSchema,
} from './task.validation.js';
import * as taskController from './task.controller.js';

const router = Router();

router.use(authenticate);

router
  .route('/')
  .post(validate(createTaskSchema), taskController.createTask)
  .get(taskController.getTasks);

router
  .route('/:id')
  .get(taskController.getTask)
  .patch(validate(updateTaskSchema), taskController.updateTask);

router.patch(
  '/:id/status',
  validate(updateTaskStatusSchema),
  taskController.updateTaskStatus
);

router.post(
  '/:id/notes',
  validate(addTaskNoteSchema),
  taskController.addTaskNote
);

router.patch(
  '/:id/checklist',
  validate(updateChecklistSchema),
  taskController.updateChecklist
);

router.post(
  '/:id/cancel',
  validate(cancelTaskSchema),
  taskController.cancelTask
);

router.post('/:id/archive', taskController.archiveTask);

export default router;

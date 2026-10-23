/**
 * Users Routes
 * Defines the user management API endpoints.
 * All routes are protected and require specific roles.
 *
 * POST   /api/users      — create user (super_admin only)
 * GET    /api/users      — list users (super_admin, admin)
 * GET    /api/users/:id  — get user (super_admin, admin)
 * PATCH  /api/users/:id  — update user (super_admin only)
 * DELETE /api/users/:id  — deactivate user (super_admin only)
 */
import { Router } from 'express';
import * as usersController from './users.controller.js';
import auth from '../../middleware/auth.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { createUserSchema, updateUserSchema } from './users.validation.js';

const router = Router();

// All user routes require authentication
router.use(auth);

// Routes accessible by super_admin and admin
router.get('/', authorize('super_admin', 'admin'), usersController.getAllUsers);
router.get('/:id', authorize('super_admin', 'admin'), usersController.getUserById);

// Routes accessible by super_admin only
router.post('/', authorize('super_admin'), validate(createUserSchema), usersController.createUser);
router.patch('/:id', authorize('super_admin'), validate(updateUserSchema), usersController.updateUser);
router.delete('/:id', authorize('super_admin'), usersController.deactivateUser);

export default router;

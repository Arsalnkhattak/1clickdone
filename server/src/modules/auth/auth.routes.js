/**
 * Auth Routes
 * Defines the authentication API endpoints.
 * POST /api/auth/login         — public
 * GET  /api/auth/me            — protected
 * POST /api/auth/logout        — protected
 * POST /api/auth/change-password — protected
 */
import { Router } from 'express';
import * as authController from './auth.controller.js';
import auth from '../../middleware/auth.js';
import validate from '../../middleware/validate.js';
import { loginSchema, changePasswordSchema } from './auth.validation.js';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), authController.login);

// Protected routes (require authentication)
router.get('/me', auth, authController.getMe);
router.post('/logout', auth, authController.logout);
router.post('/change-password', auth, validate(changePasswordSchema), authController.changePassword);

export default router;

/**
 * Auth Controller
 * Handles HTTP requests for authentication endpoints.
 * Delegates business logic to the auth service.
 */
import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';

/**
 * POST /api/auth/login
 * Authenticate user with email and password, return JWT token.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.login(email, password);

  sendSuccess(res, { user, token }, 'Login successful');
});

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  sendSuccess(res, { user }, 'Profile retrieved successfully');
});

/**
 * POST /api/auth/logout
 * Logout the user (stateless JWT — just returns success).
 * Token invalidation is handled client-side by removing the token.
 */
export const logout = asyncHandler(async (req, res) => {
  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * POST /api/auth/change-password
 * Change the authenticated user's password.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user._id, currentPassword, newPassword);

  sendSuccess(res, null, 'Password changed successfully');
});

/**
 * Users Controller
 * Handles HTTP requests for user management endpoints.
 * Delegates business logic to the users service.
 */
import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as usersService from './users.service.js';

/**
 * POST /api/users
 * Create a new user (super_admin only)
 */
export const createUser = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body);

  sendSuccess(res, { user }, 'User created successfully', 201);
});

/**
 * GET /api/users
 * List all users with pagination and search (super_admin, admin)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { users, pagination } = await usersService.getAllUsers(req.query);

  sendSuccess(res, { users, pagination }, 'Users retrieved successfully');
});

/**
 * GET /api/users/:id
 * Get a single user by ID (super_admin, admin)
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);

  sendSuccess(res, { user }, 'User retrieved successfully');
});

/**
 * PATCH /api/users/:id
 * Update a user's fields (super_admin only)
 */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);

  sendSuccess(res, { user }, 'User updated successfully');
});

/**
 * DELETE /api/users/:id
 * Deactivate a user — soft delete (super_admin only)
 */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await usersService.deactivateUser(req.params.id);

  sendSuccess(res, { user }, 'User deactivated successfully');
});

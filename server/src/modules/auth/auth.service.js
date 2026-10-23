/**
 * Auth Service
 * Business logic for authentication: login, profile retrieval, password change.
 * Separated from controllers for cleaner architecture and testability.
 */
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';
import env from '../../config/env.js';

/**
 * Generate a JWT token for a user
 * @param {object} user - User document
 * @returns {string} - Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * Login a user with email and password
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {object} - { user, token }
 */
export const login = async (email, password) => {
  // 1. Find user by email and explicitly include passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // 2. Check if account is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact an administrator.', 401);
  }

  // 3. Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // 4. Generate JWT token
  const token = generateToken(user);

  // 5. Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // 6. Return user data (without passwordHash) and token
  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Get user profile by ID
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {object} - User document (without passwordHash)
 */
export const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Change a user's password
 * @param {string} userId - User's MongoDB ObjectId
 * @param {string} currentPassword - Current plain text password
 * @param {string} newPassword - New plain text password
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  // 1. Find user with passwordHash included
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // 2. Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // 3. Set new password (will be hashed by pre-save hook)
  user.passwordHash = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};

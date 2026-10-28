/**
 * JWT Authentication Middleware
 * Extracts Bearer token from Authorization header, verifies it,
 * finds the user, checks if active, and attaches user to req.user.
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

const auth = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header or query param
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    throw new AppError('Access denied. No token provided.', 401);
  }

  // 2. Verify the token
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired. Please log in again.', 401);
    }
    throw new AppError('Invalid token. Please log in again.', 401);
  }

  // 3. Find user by id from token payload
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AppError('User belonging to this token no longer exists.', 401);
  }

  // 4. Check if user account is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact an administrator.', 401);
  }

  // 5. Attach user to request object
  req.user = user;
  next();
});

export default auth;

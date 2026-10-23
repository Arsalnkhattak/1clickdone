/**
 * Users Service
 * Business logic for user/staff management: CRUD operations.
 * Separated from controllers for cleaner architecture and testability.
 */
import User from '../../models/User.js';
import AppError from '../../utils/AppError.js';

/**
 * Create a new user
 * @param {object} data - { name, email, password, role }
 * @returns {object} - Created user (without passwordHash)
 */
export const createUser = async (data) => {
  const { name, email, password, role } = data;

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 409);
  }

  // Create user — passwordHash will be hashed by pre-save hook
  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
  });

  // Return user without passwordHash
  return user.toJSON();
};

/**
 * Get all users with pagination and search
 * @param {object} query - { page, limit, search }
 * @returns {object} - { users, pagination }
 */
export const getAllUsers = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Build filter for search
  const filter = {};
  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ];
  }

  // Execute query with pagination
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single user by ID
 * @param {string} id - User's MongoDB ObjectId
 * @returns {object} - User document
 */
export const getUserById = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Update a user's fields (NOT password)
 * @param {string} id - User's MongoDB ObjectId
 * @param {object} data - Fields to update { name?, email?, role?, isActive? }
 * @returns {object} - Updated user document
 */
export const updateUser = async (id, data) => {
  // Ensure password cannot be updated through this endpoint
  delete data.password;
  delete data.passwordHash;

  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Deactivate a user (soft delete)
 * Sets isActive = false instead of actually deleting the record.
 * @param {string} id - User's MongoDB ObjectId
 * @returns {object} - Deactivated user document
 */
export const deactivateUser = async (id) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

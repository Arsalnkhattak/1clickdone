/**
 * Users Validation Schemas
 * Zod schemas for validating user management request bodies.
 */
import { z } from 'zod';

/**
 * Create user schema — all fields required for creating a new user
 */
export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
  role: z
    .enum(['super_admin', 'admin', 'staff'], {
      errorMap: () => ({ message: "Role must be one of: 'super_admin', 'admin', 'staff'" }),
    }),
});

/**
 * Update user schema — all fields optional for partial updates
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase()
    .optional(),
  role: z
    .enum(['super_admin', 'admin', 'staff'], {
      errorMap: () => ({ message: "Role must be one of: 'super_admin', 'admin', 'staff'" }),
    })
    .optional(),
  isActive: z
    .boolean()
    .optional(),
});

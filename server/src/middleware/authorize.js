/**
 * Role-Based Authorization Middleware
 * Factory function that returns middleware to check if the authenticated
 * user's role is included in the list of allowed roles.
 *
 * Usage: router.get('/admin-only', auth, authorize('super_admin', 'admin'), handler)
 */
import AppError from '../utils/AppError.js';

const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists on request (auth middleware should run first)
    if (!req.user) {
      return next(new AppError('Authentication required before authorization.', 401));
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
    }

    next();
  };
};

export default authorize;

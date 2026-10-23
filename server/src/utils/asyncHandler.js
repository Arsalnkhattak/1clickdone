/**
 * Async Handler Utility
 * Wraps async Express route handlers to automatically catch errors
 * and forward them to the global error handler via next().
 *
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;

/**
 * Zod Validation Middleware
 * Takes a Zod schema and validates the request body against it.
 * Returns 400 with detailed validation errors if validation fails.
 *
 * Usage: router.post('/route', validate(myZodSchema), handler)
 */
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Extract user-friendly error messages from Zod
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with validated & parsed data (strips unknown fields)
    req.body = result.data;
    next();
  };
};

export default validate;

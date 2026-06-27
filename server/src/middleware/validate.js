import { ZodError } from 'zod';

/**
 * Creates an Express middleware that validates `req.body` against a Zod schema.
 * On validation failure, responds with 400 and structured error details.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @returns {import('express').RequestHandler} Express middleware function
 *
 * @example
 * import { z } from 'zod';
 * import { validate } from '../middleware/validate.js';
 *
 * const CreateHabitSchema = z.object({ name: z.string().min(1) });
 * router.post('/', validate(CreateHabitSchema), createHabit);
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      // Replace body with the parsed (and potentially transformed) data
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      next(err);
    }
  };
}

/**
 * Creates an Express middleware that validates `req.query` against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @returns {import('express').RequestHandler} Express middleware function
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      next(err);
    }
  };
}

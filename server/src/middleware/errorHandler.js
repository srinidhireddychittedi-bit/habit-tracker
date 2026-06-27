import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Custom application error class with an HTTP status code.
 * Throw this in route handlers for controlled error responses.
 *
 * @example
 * throw new AppError(404, 'Habit not found');
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 409)
   * @param {string} message - Human-readable error message
   * @param {object} [details] - Optional structured error details
   */
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Centralized Express error-handling middleware.
 * Handles AppError, ZodError, Prisma known errors, and unknown errors.
 * Never exposes stack traces in production.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  // ── AppError (intentionally thrown) ───────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // ── Zod validation errors ────────────────────────────────
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

  // ── Prisma known request errors ──────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = Unique constraint violation
    if (err.code === 'P2002') {
      const fields = err.meta?.target;
      return res.status(409).json({
        error: 'Conflict',
        message: `A record with this ${Array.isArray(fields) ? fields.join(', ') : 'value'} already exists.`,
      });
    }

    // P2025 = Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not found',
        message: 'The requested resource was not found.',
      });
    }
  }

  // ── Prisma validation errors (bad input) ─────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'The request data is malformed.',
    });
  }

  // ── Unknown / unexpected errors ──────────────────────────
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log unexpected errors
  console.error('[UNHANDLED ERROR]', err);

  return res.status(500).json({
    error: 'Internal server error',
    message: isProduction
      ? 'An unexpected error occurred.'
      : err.message,
    ...(!isProduction && { stack: err.stack }),
  });
}

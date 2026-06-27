import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints.
 * Limits each IP to 10 requests per minute to prevent brute-force attacks.
 * Disabled in test environment to avoid flaky integration tests.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
export const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
        legacyHeaders: false,  // Disable `X-RateLimit-*` headers
        message: {
          error: 'Too many requests',
          message: 'Too many authentication attempts. Please try again later.',
        },
      });

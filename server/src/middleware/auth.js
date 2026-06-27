import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

/**
 * Express middleware that authenticates requests via Bearer JWT tokens.
 * Extracts the token from the Authorization header, verifies it,
 * and attaches `req.userId` for downstream handlers.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired. Please refresh.',
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid.',
    });
  }
}

/**
 * Generates a short-lived JWT access token.
 * Includes a unique jti claim to prevent token collisions.
 *
 * @param {string} userId - The user's unique ID (becomes the `sub` claim)
 * @returns {string} Signed JWT access token (15 min expiry)
 */
export function generateAccessToken(userId) {
  return jwt.sign({ sub: userId, jti: randomUUID() }, ACCESS_SECRET, { expiresIn: '15m' });
}

/**
 * Generates a long-lived JWT refresh token.
 * Includes a unique jti claim to ensure each token is distinct,
 * even when issued for the same user within the same second.
 *
 * @param {string} userId - The user's unique ID (becomes the `sub` claim)
 * @returns {string} Signed JWT refresh token (7 day expiry)
 */
export function generateRefreshToken(userId) {
  return jwt.sign({ sub: userId, jti: randomUUID() }, REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a refresh token and returns its decoded payload.
 *
 * @param {string} token - The refresh token to verify
 * @returns {object} Decoded JWT payload
 * @throws {jwt.JsonWebTokenError} If token is invalid or expired
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}


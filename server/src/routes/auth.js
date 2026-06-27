import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ── Zod Schemas ────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  name: z.string().min(1).max(100).optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarSeed: z.string().max(100).optional(),
  dailyGoal: z.number().int().min(1).max(100).optional(),
  timezone: z.string().max(50).optional(),
}).strict();

// ── Helpers ────────────────────────────────────────────────

/**
 * Strips sensitive fields from a user record before sending to the client.
 *
 * @param {object} user - Raw user record from database
 * @returns {object} Sanitized user object
 */
function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * Creates and persists a refresh token for the given user.
 *
 * @param {string} userId
 * @returns {Promise<string>} The generated refresh token string
 */
async function createRefreshTokenInDB(userId) {
  const token = generateRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
  return token;
}

// ── POST /register ─────────────────────────────────────────

router.post('/register', authLimiter, validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        avatarSeed: email, // Default avatar seed based on email
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createRefreshTokenInDB(user.id);

    res.status(201).json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /login ────────────────────────────────────────────

router.post('/login', authLimiter, validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createRefreshTokenInDB(user.id);

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /refresh ──────────────────────────────────────────

router.post('/refresh', validate(RefreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify the JWT signature and expiry
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Check the token exists in the database (not yet revoked)
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored) {
      throw new AppError(401, 'Refresh token has been revoked');
    }

    // Check expiry in DB as well
    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new AppError(401, 'Refresh token has expired');
    }

    // Rotate: delete old token, create new pair
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = generateAccessToken(payload.sub);
    const newRefreshToken = await createRefreshTokenInDB(payload.sub);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /logout ───────────────────────────────────────────

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete the specific refresh token
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId: req.userId,
        },
      });
    } else {
      // Delete all refresh tokens for this user (logout everywhere)
      await prisma.refreshToken.deleteMany({
        where: { userId: req.userId },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ── GET /me ────────────────────────────────────────────────

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /me ──────────────────────────────────────────────

router.patch('/me', authenticateToken, validate(UpdateProfileSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: req.body,
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;

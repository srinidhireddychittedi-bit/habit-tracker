/**
 * AURA Auth Routes — Integration Tests
 *
 * Tests the full HTTP lifecycle for authentication endpoints
 * using Supertest against the Express app with a real SQLite database.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

// Set test environment BEFORE importing app
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test-auth.db';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:3000';

// Clean up any existing test database
const testDbPath = join(ROOT, 'prisma', 'test-auth.db');

// Dynamic imports after env is set
let app;
let prisma;

beforeAll(async () => {
  // Remove old test DB if exists
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  // Push schema to test DB
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: 'file:./test-auth.db' },
    stdio: 'pipe',
  });

  // Import after DB is ready
  const appModule = await import('../index.js');
  app = appModule.default;

  const dbModule = await import('../lib/db.js');
  prisma = dbModule.default;
});

afterAll(async () => {
  await prisma.$disconnect();
  // Clean up test database
  if (existsSync(testDbPath)) {
    try { unlinkSync(testDbPath); } catch { /* ignore */ }
  }
});

beforeEach(async () => {
  // Clean tables before each test
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

// ── Test Data ──────────────────────────────────────────────

const validUser = {
  email: 'test@example.com',
  password: 'SecurePass123!',
  name: 'Test User',
};

// ── Helper ─────────────────────────────────────────────────

async function registerUser(data = validUser) {
  return request(app).post('/api/auth/register').send(data);
}

async function loginUser(data = { email: validUser.email, password: validUser.password }) {
  return request(app).post('/api/auth/login').send(data);
}

// ── Tests ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers a new user → 201 with user + tokens', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.name).toBe(validUser.name);
    expect(res.body.user.passwordHash).toBeUndefined(); // Should be stripped
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects duplicate email → 409', async () => {
    await registerUser();
    const res = await registerUser();

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('rejects invalid email → 400', async () => {
    const res = await registerUser({
      email: 'not-an-email',
      password: 'SecurePass123!',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('rejects short password → 400', async () => {
    const res = await registerUser({
      email: 'short@example.com',
      password: '1234567', // 7 chars, min is 8
    });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'password')).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('logs in with correct credentials → 200 + tokens', async () => {
    const res = await loginUser();

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects wrong password → 401', async () => {
    const res = await loginUser({
      email: validUser.email,
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid');
  });

  it('rejects non-existent email → 401', async () => {
    const res = await loginUser({
      email: 'nobody@example.com',
      password: 'SomePassword123!',
    });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new access token with valid refresh token', async () => {
    const registerRes = await registerUser();
    const { refreshToken } = registerRes.body;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    // New refresh token should differ (rotation)
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('rejects invalid refresh token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-valid-token' });

    expect(res.status).toBe(401);
  });

  it('rejects reused (rotated) refresh token → 401', async () => {
    const registerRes = await registerUser();
    const { refreshToken } = registerRes.body;

    // First refresh succeeds and rotates the token
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    // Second use of old token should fail
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user data with valid token → 200', async () => {
    const registerRes = await registerUser();
    const { accessToken } = registerRes.body;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects request without token → 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('rejects request with invalid token → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/me', () => {
  it('updates profile fields → 200', async () => {
    const registerRes = await registerUser();
    const { accessToken } = registerRes.body;

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name', bio: 'Hello world' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.bio).toBe('Hello world');
  });
});

describe('POST /api/auth/logout', () => {
  it('invalidates refresh token', async () => {
    const registerRes = await registerUser();
    const { accessToken, refreshToken } = registerRes.body;

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);

    // Try to use the refresh token
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });
});

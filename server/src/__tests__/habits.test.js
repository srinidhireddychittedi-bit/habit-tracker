/**
 * AURA Habit Routes — Integration Tests
 *
 * Tests CRUD operations for habits, ownership isolation,
 * and input validation using Supertest.
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

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test-habits.db';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:3000';

const testDbPath = join(ROOT, 'prisma', 'test-habits.db');

let app;
let prisma;

beforeAll(async () => {
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: 'file:./test-habits.db' },
    stdio: 'pipe',
  });

  const appModule = await import('../index.js');
  app = appModule.default;

  const dbModule = await import('../lib/db.js');
  prisma = dbModule.default;
});

afterAll(async () => {
  await prisma.$disconnect();
  if (existsSync(testDbPath)) {
    try { unlinkSync(testDbPath); } catch { /* ignore */ }
  }
});

// ── Helpers ────────────────────────────────────────────────

let tokenUser1;
let tokenUser2;

beforeEach(async () => {
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Register two users
  const res1 = await request(app)
    .post('/api/auth/register')
    .send({ email: 'user1@test.com', password: 'Password123!' });
  tokenUser1 = res1.body.accessToken;

  const res2 = await request(app)
    .post('/api/auth/register')
    .send({ email: 'user2@test.com', password: 'Password123!' });
  tokenUser2 = res2.body.accessToken;
});

function authHeader(token = tokenUser1) {
  return { Authorization: `Bearer ${token}` };
}

// ── Tests ──────────────────────────────────────────────────

describe('POST /api/habits', () => {
  it('creates a habit → 201', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader())
      .send({
        name: 'Meditate',
        color: '#6366F1',
        icon: 'Brain',
        frequency: { type: 'daily' },
      });

    expect(res.status).toBe(201);
    expect(res.body.habit).toBeDefined();
    expect(res.body.habit.name).toBe('Meditate');
    expect(res.body.habit.color).toBe('#6366F1');
    expect(res.body.habit.frequency).toEqual({ type: 'daily' });
  });

  it('creates habit with defaults when optional fields omitted', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader())
      .send({ name: 'Read' });

    expect(res.status).toBe(201);
    expect(res.body.habit.color).toBe('#10B981');
    expect(res.body.habit.icon).toBe('📌');
    expect(res.body.habit.frequency).toEqual({ type: 'daily' });
  });

  it('creates habit with specific_days frequency', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader())
      .send({
        name: 'Gym',
        frequency: { type: 'specific_days', days: [1, 3, 5] },
      });

    expect(res.status).toBe(201);
    expect(res.body.habit.frequency.type).toBe('specific_days');
    expect(res.body.habit.frequency.days).toEqual([1, 3, 5]);
  });

  it('rejects empty name → 400', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader())
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid color format → 400', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader())
      .send({ name: 'Test', color: 'red' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid frequency type → 400', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader())
      .send({ name: 'Test', frequency: { type: 'monthly' } });

    expect(res.status).toBe(400);
  });

  it('rejects request without auth → 401', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Unauthorized Habit' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/habits', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/habits')
      .set(authHeader(tokenUser1))
      .send({ name: 'User1 Habit' });

    await request(app)
      .post('/api/habits')
      .set(authHeader(tokenUser2))
      .send({ name: 'User2 Habit' });
  });

  it('lists only own habits → 200', async () => {
    const res = await request(app)
      .get('/api/habits')
      .set(authHeader(tokenUser1));

    expect(res.status).toBe(200);
    expect(res.body.habits).toHaveLength(1);
    expect(res.body.habits[0].name).toBe('User1 Habit');
  });

  it('excludes archived habits by default', async () => {
    // Create and archive a habit
    const createRes = await request(app)
      .post('/api/habits')
      .set(authHeader(tokenUser1))
      .send({ name: 'Archive Me' });

    await request(app)
      .patch(`/api/habits/${createRes.body.habit.id}`)
      .set(authHeader(tokenUser1))
      .send({ archived: true });

    const res = await request(app)
      .get('/api/habits')
      .set(authHeader(tokenUser1));

    expect(res.body.habits).toHaveLength(1);
    expect(res.body.habits[0].name).toBe('User1 Habit');
  });

  it('includes archived habits when ?archived=true', async () => {
    const createRes = await request(app)
      .post('/api/habits')
      .set(authHeader(tokenUser1))
      .send({ name: 'Archive Me' });

    await request(app)
      .patch(`/api/habits/${createRes.body.habit.id}`)
      .set(authHeader(tokenUser1))
      .send({ archived: true });

    const res = await request(app)
      .get('/api/habits?archived=true')
      .set(authHeader(tokenUser1));

    expect(res.body.habits).toHaveLength(2);
  });
});

describe('PATCH /api/habits/:id', () => {
  let habitId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader(tokenUser1))
      .send({ name: 'Original Name' });
    habitId = res.body.habit.id;
  });

  it('updates habit → 200', async () => {
    const res = await request(app)
      .patch(`/api/habits/${habitId}`)
      .set(authHeader(tokenUser1))
      .send({ name: 'New Name', color: '#EF4444' });

    expect(res.status).toBe(200);
    expect(res.body.habit.name).toBe('New Name');
    expect(res.body.habit.color).toBe('#EF4444');
  });

  it('cannot access other user\'s habit → 404', async () => {
    const res = await request(app)
      .patch(`/api/habits/${habitId}`)
      .set(authHeader(tokenUser2))
      .send({ name: 'Hacked!' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/habits/:id', () => {
  let habitId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/habits')
      .set(authHeader(tokenUser1))
      .send({ name: 'To Delete' });
    habitId = res.body.habit.id;
  });

  it('deletes habit → 204', async () => {
    const res = await request(app)
      .delete(`/api/habits/${habitId}`)
      .set(authHeader(tokenUser1));

    expect(res.status).toBe(204);

    // Verify it's gone
    const listRes = await request(app)
      .get('/api/habits')
      .set(authHeader(tokenUser1));
    expect(listRes.body.habits).toHaveLength(0);
  });

  it('cannot delete other user\'s habit → 404', async () => {
    const res = await request(app)
      .delete(`/api/habits/${habitId}`)
      .set(authHeader(tokenUser2));

    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent habit', async () => {
    const res = await request(app)
      .delete('/api/habits/nonexistent-id')
      .set(authHeader(tokenUser1));

    expect(res.status).toBe(404);
  });
});

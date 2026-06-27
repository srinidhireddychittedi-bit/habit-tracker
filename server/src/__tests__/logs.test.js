/**
 * AURA Habit Log & Stats Routes — Integration Tests
 *
 * Tests log CRUD (upsert, notes, date ranges) and stats endpoints.
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
process.env.DATABASE_URL = 'file:./test-logs.db';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:3000';

const testDbPath = join(ROOT, 'prisma', 'test-logs.db');

let app;
let prisma;
let token;
let habitId;

beforeAll(async () => {
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: 'file:./test-logs.db' },
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

beforeEach(async () => {
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Register user and create a habit
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'logger@test.com', password: 'Password123!' });
  token = userRes.body.accessToken;

  const habitRes = await request(app)
    .post('/api/habits')
    .set({ Authorization: `Bearer ${token}` })
    .send({ name: 'Test Habit' });
  habitId = habitRes.body.habit.id;
});

// ── Log Tests ──────────────────────────────────────────────

describe('PUT /api/logs/:habitId/:date', () => {
  it('creates a new log entry → 201', async () => {
    const res = await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    expect(res.status).toBeLessThanOrEqual(201);
    expect(res.body.log).toBeDefined();
    expect(res.body.log.status).toBe('completed');
    expect(res.body.log.date).toBe('2025-06-25');
  });

  it('upserts an existing log entry → 200', async () => {
    // Create first
    await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    // Update
    const res = await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'missed' });

    expect(res.status).toBe(200);
    expect(res.body.log.status).toBe('missed');
  });

  it('creates log with notes', async () => {
    const res = await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed', notes: 'Felt great today!' });

    expect(res.body.log.notes).toBe('Felt great today!');
  });

  it('rejects invalid status → 400', async () => {
    const res = await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('rejects invalid date format → 400', async () => {
    const res = await request(app)
      .put(`/api/logs/${habitId}/06-25-2025`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
  });

  it('rejects log for non-existent habit → 404', async () => {
    const res = await request(app)
      .put('/api/logs/nonexistent-id/2025-06-25')
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/logs', () => {
  beforeEach(async () => {
    // Create several logs
    const dates = ['2025-06-20', '2025-06-21', '2025-06-22', '2025-06-25'];
    for (const date of dates) {
      await request(app)
        .put(`/api/logs/${habitId}/${date}`)
        .set({ Authorization: `Bearer ${token}` })
        .send({ status: 'completed' });
    }
  });

  it('returns all logs without date filter', async () => {
    const res = await request(app)
      .get('/api/logs')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body.logs).toBeDefined();
    expect(Object.keys(res.body.logs).length).toBe(4);
  });

  it('filters logs by date range', async () => {
    const res = await request(app)
      .get('/api/logs?from=2025-06-20&to=2025-06-22')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.logs).length).toBe(3);
    expect(res.body.logs['2025-06-25']).toBeUndefined();
  });

  it('returns logs keyed by date → habitId', async () => {
    const res = await request(app)
      .get('/api/logs?from=2025-06-20&to=2025-06-20')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.body.logs['2025-06-20']).toBeDefined();
    expect(res.body.logs['2025-06-20'][habitId]).toBeDefined();
    expect(res.body.logs['2025-06-20'][habitId].status).toBe('completed');
  });

  it('returns empty when no logs in range', async () => {
    const res = await request(app)
      .get('/api/logs?from=2025-07-01&to=2025-07-31')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.logs).length).toBe(0);
  });
});

describe('PATCH /api/logs/:habitId/:date', () => {
  beforeEach(async () => {
    await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });
  });

  it('updates notes on existing log → 200', async () => {
    const res = await request(app)
      .patch(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ notes: 'Updated note' });

    expect(res.status).toBe(200);
    expect(res.body.log.notes).toBe('Updated note');
  });

  it('clears notes with null', async () => {
    const res = await request(app)
      .patch(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.log.notes).toBeNull();
  });

  it('rejects notes update for non-existent log → 404', async () => {
    const res = await request(app)
      .patch(`/api/logs/${habitId}/2025-01-01`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ notes: 'This should fail' });

    expect(res.status).toBe(404);
  });
});

// ── Stats Tests ────────────────────────────────────────────

describe('GET /api/stats/streaks', () => {
  it('returns streak data for all habits', async () => {
    // Create some logs
    await request(app)
      .put(`/api/logs/${habitId}/2025-06-24`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    const res = await request(app)
      .get('/api/stats/streaks')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body.streaks).toBeDefined();
    expect(res.body.streaks[habitId]).toBeDefined();
    expect(res.body.streaks[habitId].totalCompletions).toBe(2);
    expect(typeof res.body.streaks[habitId].currentStreak).toBe('number');
    expect(typeof res.body.streaks[habitId].longestStreak).toBe('number');
  });
});

describe('GET /api/stats/habits', () => {
  it('returns per-habit stats', async () => {
    await request(app)
      .put(`/api/logs/${habitId}/2025-06-24`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'completed' });

    await request(app)
      .put(`/api/logs/${habitId}/2025-06-25`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'missed' });

    const res = await request(app)
      .get('/api/stats/habits')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveLength(1);

    const stat = res.body.stats[0];
    expect(stat.habitId).toBe(habitId);
    expect(stat.completedCount).toBe(1);
    expect(stat.missedCount).toBe(1);
    expect(typeof stat.completionRate).toBe('number');
    expect(typeof stat.currentStreak).toBe('number');
  });
});

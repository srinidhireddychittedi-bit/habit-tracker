import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateQuery } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticateToken);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const LogQuerySchema = z.object({
  from: z.string().regex(DATE_REGEX, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(DATE_REGEX, 'to must be YYYY-MM-DD').optional(),
  habitId: z.string().optional(),
});

const UpsertLogSchema = z.object({
  status: z.enum(['completed', 'partial', 'missed'], {
    errorMap: () => ({ message: "Status must be 'completed', 'partial', or 'missed'" }),
  }),
  notes: z.string().max(500).optional(),
});

const UpdateNotesSchema = z.object({
  notes: z.string().max(500).nullable(),
});

async function verifyHabitOwnership(habitId, userId) {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== userId) throw new AppError(404, 'Habit not found');
  return habit;
}

// ── GET / ───────────────────────────────────────────────────
router.get('/', validateQuery(LogQuerySchema), async (req, res, next) => {
  try {
    const { from, to, habitId } = req.query;
    const userHabitIds = await prisma.habit.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const habitIds = userHabitIds.map((h) => h.id);
    if (habitIds.length === 0) return res.json({ logs: {} });

    const where = {
      habitId: habitId ? { equals: habitId, in: habitIds } : { in: habitIds },
    };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to)   where.date.lte = to;
    }

    const logs = await prisma.habitLog.findMany({ where, orderBy: { date: 'asc' } });
    const logsByDate = {};
    for (const log of logs) {
      if (!logsByDate[log.date]) logsByDate[log.date] = {};
      logsByDate[log.date][log.habitId] = {
        id: log.id, status: log.status, notes: log.notes,
        createdAt: log.createdAt, updatedAt: log.updatedAt,
      };
    }
    res.json({ logs: logsByDate });
  } catch (err) { next(err); }
});

// ── PUT /:habitId/:date — upsert a log entry ────────────────
router.put('/:habitId/:date', validate(UpsertLogSchema), async (req, res, next) => {
  try {
    const { habitId, date } = req.params;
    if (!DATE_REGEX.test(date)) throw new AppError(400, 'Date must be YYYY-MM-DD');
    await verifyHabitOwnership(habitId, req.userId);
    const { status, notes } = req.body;
    const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId, date } } });
    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date, status, notes: notes || null },
      update: { status, ...(notes !== undefined && { notes }) },
    });
    res.status(existing ? 200 : 201).json({ log });
  } catch (err) { next(err); }
});

// ── DELETE /:habitId/:date — clear a log entry (cycle back to none) ─
router.delete('/:habitId/:date', async (req, res, next) => {
  try {
    const { habitId, date } = req.params;
    if (!DATE_REGEX.test(date)) throw new AppError(400, 'Date must be YYYY-MM-DD');
    await verifyHabitOwnership(habitId, req.userId);
    // idempotent — no error if log doesn't exist
    await prisma.habitLog.deleteMany({ where: { habitId, date } });
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── PATCH /:habitId/:date — update notes only ───────────────
router.patch('/:habitId/:date', validate(UpdateNotesSchema), async (req, res, next) => {
  try {
    const { habitId, date } = req.params;
    if (!DATE_REGEX.test(date)) throw new AppError(400, 'Date must be YYYY-MM-DD');
    await verifyHabitOwnership(habitId, req.userId);
    const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId, date } } });
    if (!existing) throw new AppError(404, 'Log entry not found');
    const log = await prisma.habitLog.update({
      where: { habitId_date: { habitId, date } },
      data: { notes: req.body.notes },
    });
    res.json({ log });
  } catch (err) { next(err); }
});

export default router;

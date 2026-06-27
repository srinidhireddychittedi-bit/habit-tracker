import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// All habit routes require authentication
router.use(authenticateToken);

// ── Zod Schemas ────────────────────────────────────────────

const FrequencySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({
    type: z.literal('specific_days'),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'At least one day is required')
      .refine((days) => new Set(days).size === days.length, {
        message: 'Days must be unique',
      }),
  }),
  z.object({
    type: z.literal('weekly'),
    timesPerWeek: z.number().int().min(1).max(7),
  }),
]);

const CreateHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').optional(),
  icon: z.string().min(1).max(50).optional(),
  frequency: FrequencySchema.optional().default({ type: 'daily' }),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  sortOrder: z.number().int().min(0).optional(),
});

const UpdateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').optional(),
  icon: z.string().min(1).max(50).optional(),
  frequency: FrequencySchema.optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  archived: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

// ── Helpers ────────────────────────────────────────────────

/**
 * Finds a habit by ID and verifies it belongs to the authenticated user.
 *
 * @param {string} habitId - The habit's unique ID
 * @param {string} userId  - The authenticated user's ID
 * @returns {Promise<object>} The habit record
 * @throws {AppError} 404 if habit not found or doesn't belong to user
 */
async function findUserHabit(habitId, userId) {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit || habit.userId !== userId) {
    throw new AppError(404, 'Habit not found');
  }

  return habit;
}

/**
 * Parses the JSON frequency string from the database into an object.
 *
 * @param {object} habit - Habit record with frequency as JSON string
 * @returns {object} Habit with parsed frequency
 */
function parseHabitFrequency(habit) {
  return {
    ...habit,
    frequency: typeof habit.frequency === 'string'
      ? JSON.parse(habit.frequency)
      : habit.frequency,
  };
}

// ── GET / ──────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const includeArchived = req.query.archived === 'true';

    const where = { userId: req.userId };
    if (!includeArchived) {
      where.archived = false;
    }

    const habits = await prisma.habit.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({
      habits: habits.map(parseHabitFrequency),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST / ─────────────────────────────────────────────────

router.post('/', validate(CreateHabitSchema), async (req, res, next) => {
  try {
    const { name, color, icon, frequency, priority, sortOrder } = req.body;
    const habit = await prisma.habit.create({
      data: {
        userId: req.userId,
        name,
        color,
        icon,
        frequency: JSON.stringify(frequency),
        priority: priority || 'medium',
        sortOrder: sortOrder ?? 0,
      },
    });
    res.status(201).json({ habit: parseHabitFrequency(habit) });
  } catch (err) { next(err); }
});

// ── PATCH /:id ─────────────────────────────────────────────

router.patch('/:id', validate(UpdateHabitSchema), async (req, res, next) => {
  try {
    await findUserHabit(req.params.id, req.userId);

    // Explicitly pick only known Prisma fields (never spread unknown keys)
    const { name, color, icon, frequency, priority, archived, sortOrder } = req.body;
    const data = {};
    if (name      !== undefined) data.name      = name;
    if (color     !== undefined) data.color     = color;
    if (icon      !== undefined) data.icon      = icon;
    if (priority  !== undefined) data.priority  = priority;
    if (archived  !== undefined) data.archived  = archived;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (frequency !== undefined) data.frequency = JSON.stringify(frequency);

    const updated = await prisma.habit.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ habit: parseHabitFrequency(updated) });
  } catch (err) {
    next(err);
  }
});


// ── DELETE /:id ────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    await findUserHabit(req.params.id, req.userId);

    // Cascade delete is handled by Prisma schema (onDelete: Cascade)
    await prisma.habit.delete({
      where: { id: req.params.id },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

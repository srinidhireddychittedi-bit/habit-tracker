import { Router } from 'express';
import prisma from '../lib/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateStreaks } from '../services/streakEngine.js';

const router = Router();

// All stats routes require authentication
router.use(authenticateToken);

// ── GET /streaks ───────────────────────────────────────────
// Returns streak data for all of the user's active habits

router.get('/streaks', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { timezone: true },
    });

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, archived: false },
      include: { logs: true },
    });

    const streaks = {};

    for (const habit of habits) {
      const frequency =
        typeof habit.frequency === 'string'
          ? JSON.parse(habit.frequency)
          : habit.frequency;

      const habitWithFreq = { ...habit, frequency };

      streaks[habit.id] = {
        habitId: habit.id,
        habitName: habit.name,
        ...calculateStreaks(habitWithFreq, habit.logs, user.timezone),
      };
    }

    res.json({ streaks });
  } catch (err) {
    next(err);
  }
});

// ── GET /habits ────────────────────────────────────────────
// Returns per-habit statistics: counts, completion rate, current streak

router.get('/habits', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { timezone: true },
    });

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId },
      include: { logs: true },
    });

    const stats = habits.map((habit) => {
      const frequency =
        typeof habit.frequency === 'string'
          ? JSON.parse(habit.frequency)
          : habit.frequency;

      const habitWithFreq = { ...habit, frequency };
      const streakData = calculateStreaks(habitWithFreq, habit.logs, user.timezone);

      const completedCount = habit.logs.filter((l) => l.status === 'completed').length;
      const partialCount = habit.logs.filter((l) => l.status === 'partial').length;
      const missedCount = habit.logs.filter((l) => l.status === 'missed').length;

      return {
        habitId: habit.id,
        habitName: habit.name,
        archived: habit.archived,
        completedCount,
        partialCount,
        missedCount,
        completionRate: streakData.completionRate,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalCompletions: streakData.totalCompletions,
      };
    });

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export default router;

/**
 * AURA Streak Engine — Comprehensive Test Suite
 *
 * Tests all exported functions with 30+ test cases covering:
 * - Daily habits (simple streaks, breaks, grace periods)
 * - Specific weekday habits (MWF, weekends, bridging)
 * - Weekly frequency habits (target met/not met)
 * - Timezone handling (US, India, UTC)
 * - Edge cases (leap years, creation date, back-fills, archives)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateStreaks,
  isScheduledDay,
  getScheduledDatesInRange,
  computeWeeklyStreaks,
  getTodayInTimezone,
  addDays,
  getDayOfWeek,
  getISOWeek,
  parseDateUTC,
  formatDate,
} from '../streakEngine.js';

// ──────────────────────────────────────────────────────────────
//  Test Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Creates a mock habit object with sensible defaults.
 */
function makeHabit(overrides = {}) {
  return {
    id: 'habit-1',
    frequency: { type: 'daily' },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Creates a log entry for a given date.
 */
function makeLog(date, status = 'completed') {
  return { date, status, id: `log-${date}` };
}

/**
 * Creates an array of log entries for consecutive dates.
 */
function makeConsecutiveLogs(startDate, count, status = 'completed') {
  const logs = [];
  let current = startDate;
  for (let i = 0; i < count; i++) {
    logs.push(makeLog(current, status));
    current = addDays(current, 1);
  }
  return logs;
}

/**
 * Creates logs for specific dates.
 */
function makeLogsForDates(dates, status = 'completed') {
  return dates.map((d) => makeLog(d, status));
}

// We mock "today" by stubbing getTodayInTimezone at the module level.
// Instead, we'll set the system date using vi.useFakeTimers.

// ──────────────────────────────────────────────────────────────
//  Date Utility Tests
// ──────────────────────────────────────────────────────────────

describe('Date Utilities', () => {
  it('parseDateUTC parses YYYY-MM-DD to midnight UTC', () => {
    const d = parseDateUTC('2025-03-15');
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(2); // 0-indexed
    expect(d.getUTCDate()).toBe(15);
    expect(d.getUTCHours()).toBe(0);
  });

  it('formatDate formats Date to YYYY-MM-DD', () => {
    const d = new Date(Date.UTC(2025, 0, 5));
    expect(formatDate(d)).toBe('2025-01-05');
  });

  it('addDays correctly advances dates', () => {
    expect(addDays('2025-01-30', 3)).toBe('2025-02-02');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('addDays handles leap year', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });

  it('addDays with negative days goes backwards', () => {
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('getDayOfWeek returns correct day', () => {
    // 2025-06-26 is a Thursday
    expect(getDayOfWeek('2025-06-26', 'UTC')).toBe(4);
    // 2025-06-22 is a Sunday
    expect(getDayOfWeek('2025-06-22', 'UTC')).toBe(0);
  });

  it('getISOWeek returns correct ISO week number', () => {
    // 2025-01-01 is a Wednesday, ISO week 1
    const { isoYear, isoWeek } = getISOWeek('2025-01-01');
    expect(isoYear).toBe(2025);
    expect(isoWeek).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────
//  isScheduledDay
// ──────────────────────────────────────────────────────────────

describe('isScheduledDay', () => {
  it('daily returns true for any day', () => {
    const freq = { type: 'daily' };
    expect(isScheduledDay(freq, '2025-06-23', 'UTC')).toBe(true); // Monday
    expect(isScheduledDay(freq, '2025-06-22', 'UTC')).toBe(true); // Sunday
    expect(isScheduledDay(freq, '2025-12-25', 'UTC')).toBe(true); // Thursday
  });

  it('specific_days returns true only for specified days', () => {
    // Mon=1, Wed=3, Fri=5
    const freq = { type: 'specific_days', days: [1, 3, 5] };
    expect(isScheduledDay(freq, '2025-06-23', 'UTC')).toBe(true);  // Monday
    expect(isScheduledDay(freq, '2025-06-24', 'UTC')).toBe(false); // Tuesday
    expect(isScheduledDay(freq, '2025-06-25', 'UTC')).toBe(true);  // Wednesday
    expect(isScheduledDay(freq, '2025-06-26', 'UTC')).toBe(false); // Thursday
    expect(isScheduledDay(freq, '2025-06-27', 'UTC')).toBe(true);  // Friday
    expect(isScheduledDay(freq, '2025-06-28', 'UTC')).toBe(false); // Saturday
    expect(isScheduledDay(freq, '2025-06-22', 'UTC')).toBe(false); // Sunday
  });

  it('weekly returns true for any day (evaluated at week level)', () => {
    const freq = { type: 'weekly', timesPerWeek: 3 };
    expect(isScheduledDay(freq, '2025-06-23', 'UTC')).toBe(true);
    expect(isScheduledDay(freq, '2025-06-22', 'UTC')).toBe(true);
  });

  it('returns false for unknown frequency type', () => {
    expect(isScheduledDay({ type: 'unknown' }, '2025-06-23', 'UTC')).toBe(false);
  });

  it('returns false for null/undefined frequency', () => {
    expect(isScheduledDay(null, '2025-06-23', 'UTC')).toBe(false);
    expect(isScheduledDay(undefined, '2025-06-23', 'UTC')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
//  getScheduledDatesInRange
// ──────────────────────────────────────────────────────────────

describe('getScheduledDatesInRange', () => {
  it('returns all dates for daily frequency', () => {
    const dates = getScheduledDatesInRange(
      { type: 'daily' },
      '2025-06-23',
      '2025-06-27',
      'UTC'
    );
    expect(dates).toEqual([
      '2025-06-23',
      '2025-06-24',
      '2025-06-25',
      '2025-06-26',
      '2025-06-27',
    ]);
  });

  it('returns only scheduled days for specific_days frequency', () => {
    // Mon=1, Wed=3, Fri=5
    const dates = getScheduledDatesInRange(
      { type: 'specific_days', days: [1, 3, 5] },
      '2025-06-23', // Monday
      '2025-06-29', // Sunday
      'UTC'
    );
    expect(dates).toEqual(['2025-06-23', '2025-06-25', '2025-06-27']);
  });

  it('returns empty array when no dates match', () => {
    // Only Saturday=6, but range is Mon-Fri
    const dates = getScheduledDatesInRange(
      { type: 'specific_days', days: [6] },
      '2025-06-23', // Monday
      '2025-06-27', // Friday
      'UTC'
    );
    expect(dates).toEqual([]);
  });

  it('handles single-day range', () => {
    const dates = getScheduledDatesInRange(
      { type: 'daily' },
      '2025-06-25',
      '2025-06-25',
      'UTC'
    );
    expect(dates).toEqual(['2025-06-25']);
  });
});

// ──────────────────────────────────────────────────────────────
//  calculateStreaks — Daily Habits
// ──────────────────────────────────────────────────────────────

describe('calculateStreaks', () => {
  describe('daily habits', () => {
    beforeEach(() => {
      // Fix "today" to 2025-06-26
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns zeros for no logs', () => {
      const habit = makeHabit();
      const result = calculateStreaks(habit, [], 'UTC');
      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0,
      });
    });

    it('returns zeros for null logs', () => {
      const habit = makeHabit();
      const result = calculateStreaks(habit, null, 'UTC');
      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0,
      });
    });

    it('counts simple consecutive streak', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-20T00:00:00Z') });
      const logs = makeConsecutiveLogs('2025-06-21', 6); // June 21-26
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(6);
      expect(result.totalCompletions).toBe(6);
    });

    it('breaks streak on missed day', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-20T00:00:00Z') });
      const logs = [
        makeLog('2025-06-21'),
        makeLog('2025-06-22'),
        // 2025-06-23 MISSED
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3); // 24, 25, 26
      expect(result.longestStreak).toBe(3);
      expect(result.totalCompletions).toBe(5);
    });

    it('today not completed = streak from yesterday (grace period)', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-22T00:00:00Z') });
      const logs = [
        makeLog('2025-06-23'),
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        // 2025-06-26 (today) NOT completed
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3); // 23, 24, 25
    });

    it('today completed = includes today in streak', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-22T00:00:00Z') });
      const logs = [
        makeLog('2025-06-23'),
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'), // today completed
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(4);
    });

    it('single day streak', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-25T00:00:00Z') });
      const logs = [makeLog('2025-06-26')]; // only today
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.totalCompletions).toBe(1);
    });

    it('very long streak (100+ days)', () => {
      const startDate = '2025-03-18'; // 100 days before 2025-06-26
      const habit = makeHabit({ createdAt: new Date('2025-03-18T00:00:00Z') });
      const logs = makeConsecutiveLogs(startDate, 101); // 100 days + today
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(101);
      expect(result.longestStreak).toBe(101);
      expect(result.totalCompletions).toBe(101);
    });

    it('longest streak differs from current streak', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-01T00:00:00Z') });
      const logs = [
        // Old streak of 5: June 1-5
        ...makeConsecutiveLogs('2025-06-01', 5),
        // Gap on June 6
        // Current streak of 3: June 24-26
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(5);
      expect(result.totalCompletions).toBe(8);
    });

    it('completion rate calculation', () => {
      // Created June 22 (5 days ago, 4 completed scheduled days before today)
      const habit = makeHabit({ createdAt: new Date('2025-06-22T00:00:00Z') });
      const logs = [
        makeLog('2025-06-22'),
        makeLog('2025-06-23'),
        // 2025-06-24 missed
        makeLog('2025-06-25'),
        // 2025-06-26 (today) - excluded from rate denominator
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      // 3 completed out of 4 scheduled days (excl. today) = 75%
      expect(result.completionRate).toBe(75);
    });

    it('streak of zero when no recent completions', () => {
      const habit = makeHabit({ createdAt: new Date('2025-06-01T00:00:00Z') });
      const logs = [
        makeLog('2025-06-01'),
        makeLog('2025-06-02'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Specific Weekday Habits (e.g., MWF)
  // ──────────────────────────────────────────────────────────

  describe('specific weekday habits (e.g., MWF)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // 2025-06-26 is a Thursday
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('non-scheduled days do not break streak', () => {
      // MWF = Mon(1), Wed(3), Fri(5)
      const habit = makeHabit({
        frequency: { type: 'specific_days', days: [1, 3, 5] },
        createdAt: new Date('2025-06-16T00:00:00Z'), // Monday
      });

      const logs = [
        // Week 1: Mon 16, Wed 18, Fri 20
        makeLog('2025-06-16'),
        makeLog('2025-06-18'),
        makeLog('2025-06-20'),
        // Week 2: Mon 23, Wed 25
        makeLog('2025-06-23'),
        makeLog('2025-06-25'),
        // Thu 26 is today - not a scheduled day, doesn't matter
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      // Streak: 16, 18, 20, 23, 25 = 5 consecutive scheduled days
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(5);
    });

    it('streak bridges across weekends correctly', () => {
      // MWF = Mon(1), Wed(3), Fri(5)
      const habit = makeHabit({
        frequency: { type: 'specific_days', days: [1, 3, 5] },
        createdAt: new Date('2025-06-20T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-20'), // Fri
        // Sat, Sun not scheduled
        makeLog('2025-06-23'), // Mon
        makeLog('2025-06-25'), // Wed
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3);
    });

    it('missing a scheduled day breaks streak', () => {
      const habit = makeHabit({
        frequency: { type: 'specific_days', days: [1, 3, 5] },
        createdAt: new Date('2025-06-16T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-16'), // Mon ✓
        makeLog('2025-06-18'), // Wed ✓
        // Fri 20 MISSED
        makeLog('2025-06-23'), // Mon ✓
        makeLog('2025-06-25'), // Wed ✓
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(2); // Mon 23, Wed 25
      expect(result.longestStreak).toBe(2);
    });

    it('back-to-back scheduled days', () => {
      // Sat(6) and Sun(0) — weekend warrior
      const habit = makeHabit({
        frequency: { type: 'specific_days', days: [0, 6] },
        createdAt: new Date('2025-06-14T00:00:00Z'), // Saturday
      });

      const logs = [
        makeLog('2025-06-14'), // Sat
        makeLog('2025-06-15'), // Sun
        makeLog('2025-06-21'), // Sat
        makeLog('2025-06-22'), // Sun
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(4);
      expect(result.totalCompletions).toBe(4);
    });

    it('today grace period for specific_days when today is scheduled', () => {
      // Thu(4) is a scheduled day, and today is Thu 2025-06-26
      const habit = makeHabit({
        frequency: { type: 'specific_days', days: [2, 4] }, // Tue, Thu
        createdAt: new Date('2025-06-22T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-24'), // Tue ✓
        // Thu 26 (today) not completed yet
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      // Grace: today skipped, streak = 1 from Tue
      expect(result.currentStreak).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Weekly Frequency Habits
  // ──────────────────────────────────────────────────────────

  describe('weekly frequency habits', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // 2025-06-26 Thursday
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('meeting weekly target continues streak', () => {
      const habit = makeHabit({
        frequency: { type: 'weekly', timesPerWeek: 3 },
        createdAt: new Date('2025-06-09T00:00:00Z'), // Start of ISO week
      });

      const logs = [
        // Week of June 9: 3 completions
        makeLog('2025-06-09'),
        makeLog('2025-06-11'),
        makeLog('2025-06-13'),
        // Week of June 16: 3 completions
        makeLog('2025-06-16'),
        makeLog('2025-06-18'),
        makeLog('2025-06-20'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(2); // 2 weeks
      expect(result.longestStreak).toBe(2);
    });

    it('not meeting weekly target breaks streak', () => {
      const habit = makeHabit({
        frequency: { type: 'weekly', timesPerWeek: 3 },
        createdAt: new Date('2025-06-02T00:00:00Z'),
      });

      const logs = [
        // Week of June 2: 3 completions ✓
        makeLog('2025-06-02'),
        makeLog('2025-06-04'),
        makeLog('2025-06-06'),
        // Week of June 9: only 1 completion ✗
        makeLog('2025-06-09'),
        // Week of June 16: 3 completions ✓
        makeLog('2025-06-16'),
        makeLog('2025-06-18'),
        makeLog('2025-06-20'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(1); // Only last full week
      expect(result.longestStreak).toBe(1);
    });

    it('partial week at start handled correctly', () => {
      // Created mid-week
      const habit = makeHabit({
        frequency: { type: 'weekly', timesPerWeek: 2 },
        createdAt: new Date('2025-06-19T00:00:00Z'), // Thursday
      });

      const logs = [
        // Partial first week (June 19-22): 2 completions
        makeLog('2025-06-19'),
        makeLog('2025-06-20'),
        // Full week (June 23-29): 2 completions
        makeLog('2025-06-23'),
        makeLog('2025-06-25'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.totalCompletions).toBe(4);
    });

    it('returns zeros for no logs with weekly frequency', () => {
      const habit = makeHabit({
        frequency: { type: 'weekly', timesPerWeek: 3 },
      });
      const result = calculateStreaks(habit, [], 'UTC');

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0,
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Timezone Handling
  // ──────────────────────────────────────────────────────────

  describe('timezone handling', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('America/Los_Angeles vs UTC date boundaries', () => {
      // When it's June 26 02:00 UTC, it's still June 25 in LA (UTC-7)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-26T02:00:00Z'));

      const today = getTodayInTimezone('America/Los_Angeles');
      expect(today).toBe('2025-06-25');

      const todayUTC = getTodayInTimezone('UTC');
      expect(todayUTC).toBe('2025-06-26');
    });

    it('Asia/Kolkata (UTC+5:30) date boundaries', () => {
      // When it's June 25 20:00 UTC, it's already June 26 01:30 in India
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-25T20:00:00Z'));

      const todayIndia = getTodayInTimezone('Asia/Kolkata');
      expect(todayIndia).toBe('2025-06-26');

      const todayUTC = getTodayInTimezone('UTC');
      expect(todayUTC).toBe('2025-06-25');
    });

    it('date near midnight in user timezone affects streak calculation', () => {
      // It's June 26 02:00 UTC = June 25 19:00 LA time
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-26T02:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-06-22T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-22'),
        makeLog('2025-06-23'),
        makeLog('2025-06-24'),
        makeLog('2025-06-25'), // This is "today" in LA
      ];

      // In LA timezone, today is June 25, and it's completed
      const resultLA = calculateStreaks(habit, logs, 'America/Los_Angeles');
      expect(resultLA.currentStreak).toBe(4);

      // In UTC, today is June 26, not completed → grace, streak from 25
      const resultUTC = calculateStreaks(habit, logs, 'UTC');
      expect(resultUTC.currentStreak).toBe(4); // 22-25 still consecutive
    });

    it('streak differs based on timezone perspective', () => {
      // It's June 27 03:00 UTC = June 26 20:00 LA = June 27 08:30 Kolkata
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-27T03:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-06-24T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'),
        // No log for June 27
      ];

      // LA: today=June 26 (completed!) → streak=3
      const resultLA = calculateStreaks(habit, logs, 'America/Los_Angeles');
      expect(resultLA.currentStreak).toBe(3);

      // Kolkata: today=June 27 (not completed, grace) → streak still 3 from 24-26
      const resultKolkata = calculateStreaks(habit, logs, 'Asia/Kolkata');
      expect(resultKolkata.currentStreak).toBe(3);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Edge Cases
  // ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('leap year Feb 28 → Feb 29 → Mar 1', () => {
      vi.setSystemTime(new Date('2024-03-02T12:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2024-02-27T00:00:00Z'),
      });

      const logs = [
        makeLog('2024-02-27'),
        makeLog('2024-02-28'),
        makeLog('2024-02-29'), // Leap day!
        makeLog('2024-03-01'),
        makeLog('2024-03-02'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(5);
    });

    it('non-leap year Feb 28 → Mar 1 (no Feb 29)', () => {
      vi.setSystemTime(new Date('2025-03-02T12:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-02-27T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-02-27'),
        makeLog('2025-02-28'),
        makeLog('2025-03-01'),
        makeLog('2025-03-02'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(4);
    });

    it('habit created mid-streak only counts from creation date', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      // Habit created on June 24
      const habit = makeHabit({
        createdAt: new Date('2025-06-24T00:00:00Z'),
      });

      // User tries to backfill logs before creation
      const logs = [
        makeLog('2025-06-22'), // Before creation — should still count as totalCompletions
        makeLog('2025-06-23'), // Before creation
        makeLog('2025-06-24'), // From creation ✓
        makeLog('2025-06-25'), // ✓
        makeLog('2025-06-26'), // ✓
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      // Streak only counted from creation date
      expect(result.currentStreak).toBe(3); // 24, 25, 26
      expect(result.totalCompletions).toBe(5); // All 'completed' logs still count
    });

    it('back-filled past logs recalculate correctly', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-06-20T00:00:00Z'),
      });

      // Initially only had recent logs, then backfilled 20-22
      const logs = [
        makeLog('2025-06-20'),
        makeLog('2025-06-21'),
        makeLog('2025-06-22'),
        // Gap on 23
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3); // 24, 25, 26
      expect(result.longestStreak).toBe(3);
      expect(result.totalCompletions).toBe(6);
    });

    it('archived habit preserves streak data', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      // An archived habit should still compute correctly
      const habit = makeHabit({
        createdAt: new Date('2025-06-20T00:00:00Z'),
        archived: true,
      });

      const logs = makeConsecutiveLogs('2025-06-20', 5); // 20-24
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.totalCompletions).toBe(5);
      expect(result.longestStreak).toBe(5);
      // Current streak is 0 since 25 and 26 were missed
      expect(result.currentStreak).toBe(0);
    });

    it('habit with only partial completions has zero streak', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-06-22T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-22', 'partial'),
        makeLog('2025-06-23', 'partial'),
        makeLog('2025-06-24', 'partial'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalCompletions).toBe(0); // Partials don't count as completions
    });

    it('mix of completed and missed logs', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-06-20T00:00:00Z'),
      });

      const logs = [
        makeLog('2025-06-20', 'completed'),
        makeLog('2025-06-21', 'missed'),
        makeLog('2025-06-22', 'completed'),
        makeLog('2025-06-23', 'completed'),
        makeLog('2025-06-24', 'missed'),
        makeLog('2025-06-25', 'completed'),
        makeLog('2025-06-26', 'completed'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(2); // 25, 26
      expect(result.longestStreak).toBe(2); // 22, 23 or 25, 26
      expect(result.totalCompletions).toBe(5);
    });

    it('handles createdAt as ISO string instead of Date object', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      const habit = makeHabit({
        createdAt: '2025-06-24T10:30:00.000Z',
      });

      const logs = [
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'),
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3);
    });

    it('future logs are included when scheduled', () => {
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));

      const habit = makeHabit({
        createdAt: new Date('2025-06-24T00:00:00Z'),
      });

      // Even if someone logged a future date, streaks count up to today
      const logs = [
        makeLog('2025-06-24'),
        makeLog('2025-06-25'),
        makeLog('2025-06-26'),
        makeLog('2025-06-27'), // Future — but totalCompletions still counts
      ];
      const result = calculateStreaks(habit, logs, 'UTC');

      expect(result.currentStreak).toBe(3); // Only up to today
      expect(result.totalCompletions).toBe(4); // All logs count
    });
  });
});

// ──────────────────────────────────────────────────────────────
//  computeWeeklyStreaks
// ──────────────────────────────────────────────────────────────

describe('computeWeeklyStreaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zeros for empty logs', () => {
    const result = computeWeeklyStreaks(
      [],
      { type: 'weekly', timesPerWeek: 3 },
      '2025-06-01',
      '2025-06-26',
      'UTC'
    );
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it('counts consecutive weeks meeting target', () => {
    const logs = [
      // ISO Week 24 (June 9-15): 3 completions
      makeLog('2025-06-09'),
      makeLog('2025-06-11'),
      makeLog('2025-06-13'),
      // ISO Week 25 (June 16-22): 3 completions
      makeLog('2025-06-16'),
      makeLog('2025-06-18'),
      makeLog('2025-06-20'),
    ];

    const result = computeWeeklyStreaks(
      logs,
      { type: 'weekly', timesPerWeek: 3 },
      '2025-06-09',
      '2025-06-26',
      'UTC'
    );

    expect(result.longestStreak).toBe(2);
  });
});

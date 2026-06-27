/**
 * AURA Streak Engine
 *
 * Pure-function module for computing habit streaks, completion rates,
 * and schedule-aware statistics. This is the core analytical engine
 * of the AURA habit tracker.
 *
 * Design principles:
 * - Pure functions: no side effects, no database access, no mutations
 * - Timezone-aware: all date logic uses the user's timezone via Intl APIs
 * - No external date libraries: uses only built-in Date and Intl APIs
 * - Handles all frequency types: daily, specific_days, weekly
 * - Comprehensive edge case handling (leap years, DST, midnight rollover)
 *
 * @module streakEngine
 */

// ──────────────────────────────────────────────────────────────
//  Date Utility Helpers (pure, timezone-aware)
// ──────────────────────────────────────────────────────────────

/**
 * Returns today's date as a 'YYYY-MM-DD' string in the given timezone.
 *
 * @param {string} timezone - IANA timezone identifier (e.g. 'America/New_York')
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;

  return `${year}-${month}-${day}`;
}

/**
 * Parses a 'YYYY-MM-DD' string into a Date object at midnight UTC.
 * This creates a stable reference point for date arithmetic.
 *
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @returns {Date} Date object at midnight UTC
 */
export function parseDateUTC(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats a Date object to 'YYYY-MM-DD' string.
 *
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds a number of days to a date string.
 *
 * @param {string} dateStr - Starting date in 'YYYY-MM-DD' format
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} Resulting date in 'YYYY-MM-DD' format
 */
export function addDays(dateStr, days) {
  const date = parseDateUTC(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

/**
 * Returns the day of the week (0=Sunday, 6=Saturday) for a date string,
 * considering the user's timezone.
 *
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format
 * @param {string} timezone - IANA timezone identifier
 * @returns {number} Day of week (0=Sunday, 6=Saturday)
 */
export function getDayOfWeek(dateStr, timezone) {
  // We use the UTC date since dateStr represents the user's local date.
  // The day-of-week should match what the user sees.
  const date = parseDateUTC(dateStr);
  return date.getUTCDay();
}

/**
 * Returns the ISO week number and year for a given date string.
 * ISO weeks start on Monday. Week 1 contains the first Thursday of the year.
 *
 * @param {string} dateStr - Date in 'YYYY-MM-DD' format
 * @returns {{ isoYear: number, isoWeek: number }}
 */
export function getISOWeek(dateStr) {
  const date = parseDateUTC(dateStr);

  // Set to nearest Thursday: current date + 4 - current day number (Mon=1..Sun=7)
  const dayNum = date.getUTCDay() || 7; // Convert Sunday from 0 to 7
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return { isoYear: thursday.getUTCFullYear(), isoWeek: weekNo };
}

/**
 * Compares two date strings chronologically.
 *
 * @param {string} a - Date string 'YYYY-MM-DD'
 * @param {string} b - Date string 'YYYY-MM-DD'
 * @returns {number} Negative if a < b, 0 if equal, positive if a > b
 */
export function compareDates(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ──────────────────────────────────────────────────────────────
//  Schedule Functions
// ──────────────────────────────────────────────────────────────

/**
 * Determines whether a given date is a "scheduled" day for a habit,
 * based on its frequency configuration.
 *
 * @param {object} frequency - The habit's frequency config
 * @param {string} frequency.type - 'daily' | 'specific_days' | 'weekly'
 * @param {number[]} [frequency.days] - For 'specific_days': array of day numbers (0=Sun..6=Sat)
 * @param {number} [frequency.timesPerWeek] - For 'weekly': target completions per week
 * @param {string} dateStr - Date to check in 'YYYY-MM-DD' format
 * @param {string} timezone - IANA timezone identifier
 * @returns {boolean} True if the date is a scheduled day
 */
export function isScheduledDay(frequency, dateStr, timezone) {
  if (!frequency || !frequency.type) return false;

  switch (frequency.type) {
    case 'daily':
      return true;

    case 'specific_days': {
      const dayOfWeek = getDayOfWeek(dateStr, timezone);
      return frequency.days.includes(dayOfWeek);
    }

    case 'weekly':
      // For weekly frequency, every day is potentially valid.
      // The streak is evaluated at the week level, not the day level.
      return true;

    default:
      return false;
  }
}

/**
 * Returns all scheduled dates within a given range for a habit's frequency.
 *
 * @param {object} frequency - The habit's frequency config
 * @param {string} startDate - Start date in 'YYYY-MM-DD' format (inclusive)
 * @param {string} endDate - End date in 'YYYY-MM-DD' format (inclusive)
 * @param {string} timezone - IANA timezone identifier
 * @returns {string[]} Array of 'YYYY-MM-DD' strings for scheduled dates
 */
export function getScheduledDatesInRange(frequency, startDate, endDate, timezone) {
  const dates = [];
  let current = startDate;

  while (compareDates(current, endDate) <= 0) {
    if (isScheduledDay(frequency, current, timezone)) {
      dates.push(current);
    }
    current = addDays(current, 1);
  }

  return dates;
}

// ──────────────────────────────────────────────────────────────
//  Weekly Streak Computation
// ──────────────────────────────────────────────────────────────

/**
 * Computes streak information for 'weekly' frequency habits.
 * Groups completions by ISO week and checks whether each week
 * meets the target number of completions.
 *
 * @param {object[]} logs - Array of log records with { date, status }
 * @param {object} frequency - Frequency config with { type: 'weekly', timesPerWeek: N }
 * @param {string} startDate - Habit creation date 'YYYY-MM-DD'
 * @param {string} endDate - End date for analysis 'YYYY-MM-DD' (usually today)
 * @param {string} timezone - IANA timezone identifier
 * @returns {{ currentStreak: number, longestStreak: number }} Week-based streaks
 */
export function computeWeeklyStreaks(logs, frequency, startDate, endDate, timezone) {
  const target = frequency.timesPerWeek || 1;

  // Build a set of dates with 'completed' status
  const completedDates = new Set(
    logs
      .filter((l) => l.status === 'completed')
      .map((l) => l.date)
  );

  // Group all dates from startDate to endDate by ISO week
  const weekMap = new Map(); // 'YYYY-WNN' → count of completions
  const weekOrder = [];       // ordered list of week keys

  let current = startDate;
  while (compareDates(current, endDate) <= 0) {
    const { isoYear, isoWeek } = getISOWeek(current);
    const weekKey = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, 0);
      weekOrder.push(weekKey);
    }

    if (completedDates.has(current)) {
      weekMap.set(weekKey, weekMap.get(weekKey) + 1);
    }

    current = addDays(current, 1);
  }

  if (weekOrder.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Determine the current ISO week
  const todayStr = getTodayInTimezone(timezone);
  const { isoYear: todayYear, isoWeek: todayWeekNum } = getISOWeek(todayStr);
  const todayWeekKey = `${todayYear}-W${String(todayWeekNum).padStart(2, '0')}`;

  // Calculate streaks (in weeks)
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  for (const weekKey of weekOrder) {
    const count = weekMap.get(weekKey);
    if (count >= target) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  // Current streak: count backwards from the most recent week
  currentStreak = 0;
  for (let i = weekOrder.length - 1; i >= 0; i--) {
    const weekKey = weekOrder[i];
    const count = weekMap.get(weekKey);

    // Grace period: if the current (in-progress) week hasn't met target yet, skip it
    if (i === weekOrder.length - 1 && weekKey === todayWeekKey && count < target) {
      continue;
    }

    if (count >= target) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

// ──────────────────────────────────────────────────────────────
//  Main Streak Calculator
// ──────────────────────────────────────────────────────────────

/**
 * Computes comprehensive streak statistics for a habit.
 *
 * This is the primary export of the streak engine. It handles:
 * - All frequency types (daily, specific_days, weekly)
 * - Timezone-aware date boundaries
 * - Today's grace period (not penalized for incomplete today)
 * - Habit creation date (only counts from when habit was created)
 * - Edge cases: leap years, back-filled logs, empty logs, archived habits
 *
 * @param {object} habit - The habit record
 * @param {string} habit.id - Habit ID
 * @param {object} habit.frequency - Frequency config { type, days?, timesPerWeek? }
 * @param {string|Date} habit.createdAt - When the habit was created
 * @param {object[]} logs - Array of log records with { date, status }
 * @param {string} userTimezone - IANA timezone (e.g. 'America/New_York')
 * @returns {{
 *   currentStreak: number,
 *   longestStreak: number,
 *   totalCompletions: number,
 *   completionRate: number
 * }}
 */
export function calculateStreaks(habit, logs, userTimezone) {
  const timezone = userTimezone || 'UTC';

  // ── Edge case: no logs at all ─────────────────────────────
  if (!logs || logs.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      completionRate: 0,
    };
  }

  const frequency = habit.frequency;
  const todayStr = getTodayInTimezone(timezone);

  // Total completions (always counts all 'completed' logs)
  const totalCompletions = logs.filter((l) => l.status === 'completed').length;

  // Determine the effective start date (habit creation date in user's tz)
  const createdAt = habit.createdAt instanceof Date
    ? habit.createdAt
    : new Date(habit.createdAt);

  const createdParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(createdAt);

  const habitStartDate = [
    createdParts.find((p) => p.type === 'year').value,
    createdParts.find((p) => p.type === 'month').value,
    createdParts.find((p) => p.type === 'day').value,
  ].join('-');

  // ── Weekly frequency: delegate to specialized function ────
  if (frequency.type === 'weekly') {
    const weeklyStreaks = computeWeeklyStreaks(
      logs,
      frequency,
      habitStartDate,
      todayStr,
      timezone
    );

    // Compute completion rate for weekly: total completions / total scheduled days
    // For weekly, every day in the range is a potential completion day
    const totalDaysInRange = getScheduledDatesInRange(
      frequency,
      habitStartDate,
      todayStr,
      timezone
    ).length;

    const completionRate = totalDaysInRange > 0
      ? Math.round((totalCompletions / totalDaysInRange) * 100 * 100) / 100
      : 0;

    return {
      currentStreak: weeklyStreaks.currentStreak,
      longestStreak: weeklyStreaks.longestStreak,
      totalCompletions,
      completionRate,
    };
  }

  // ── Daily / Specific Days frequency ───────────────────────

  // Build a set of completed dates for O(1) lookup
  const completedSet = new Set(
    logs.filter((l) => l.status === 'completed').map((l) => l.date)
  );

  // Get all scheduled dates from habit creation to today
  const scheduledDates = getScheduledDatesInRange(
    frequency,
    habitStartDate,
    todayStr,
    timezone
  );

  if (scheduledDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions,
      completionRate: 0,
    };
  }

  // ── Compute completion rate ─────────────────────────────
  // Exclude today from the denominator if today is scheduled
  // (grace period: user hasn't had full day to complete)
  const scheduledForRate = scheduledDates.filter((d) => d !== todayStr);
  const completedInScheduled = scheduledForRate.filter((d) => completedSet.has(d)).length;
  const completionRate = scheduledForRate.length > 0
    ? Math.round((completedInScheduled / scheduledForRate.length) * 100 * 100) / 100
    : 0;

  // ── Compute longest streak ────────────────────────────────
  let longestStreak = 0;
  let streak = 0;

  for (const dateStr of scheduledDates) {
    if (completedSet.has(dateStr)) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  // ── Compute current streak ────────────────────────────────
  // Walk backwards from the most recent scheduled date.
  // Grace period: if today is scheduled but not completed, start from yesterday.
  let currentStreak = 0;
  let startIndex = scheduledDates.length - 1;

  // If the last scheduled date is today and it's NOT completed, skip it
  if (
    scheduledDates[startIndex] === todayStr &&
    !completedSet.has(todayStr)
  ) {
    startIndex--;
  }

  for (let i = startIndex; i >= 0; i--) {
    if (completedSet.has(scheduledDates[i])) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
  };
}

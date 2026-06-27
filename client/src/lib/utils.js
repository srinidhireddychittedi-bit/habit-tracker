import clsx from 'clsx';

/**
 * Conditional className utility (wraps clsx)
 */
export function cn(...classes) {
  return clsx(...classes);
}

/**
 * Format a Date to YYYY-MM-DD in a given timezone
 */
export function formatDate(date, timezone = 'UTC') {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA = YYYY-MM-DD
}

/**
 * Get today's date string in YYYY-MM-DD for a timezone
 */
export function getToday(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  return formatDate(new Date(), timezone);
}

/**
 * Generate array of YYYY-MM-DD strings between start and end (inclusive)
 */
export function getDaysInRange(start, end) {
  const days = [];
  const current = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (current <= last) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Time-of-day greeting
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Format a number with commas
 */
export function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

/**
 * Get day abbreviation from YYYY-MM-DD
 */
export function getDayAbbr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get the date N days ago as YYYY-MM-DD
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Color palette for habits
 */
export const HABIT_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

/**
 * Frequency labels
 */
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom', label: 'Custom days' },
];

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Maps old Lucide icon names (stored in DB) → emojis for backward compatibility.
 */
export const LUCIDE_TO_EMOJI = {
  Leaf: '🌿', Sun: '☀️', Moon: '🌙', Star: '⭐', Heart: '❤️',
  BookOpen: '📚', Book: '📚', Dumbbell: '💪', Coffee: '☕',
  Music: '🎵', Briefcase: '💼', Camera: '📷', Flame: '🔥',
  Droplets: '💧', Water: '💧', Brain: '🧠', Bike: '🚴',
  Pen: '✍️', Write: '✍️', Target: '🎯',
};

/**
 * Resolve a stored icon value (Lucide name or emoji) to a displayable emoji.
 */
export function resolveIcon(icon) {
  if (!icon) return '📌';
  if (LUCIDE_TO_EMOJI[icon]) return LUCIDE_TO_EMOJI[icon];
  return icon; // already an emoji string
}

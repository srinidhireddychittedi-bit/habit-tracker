/**
 * AURA Seed Script
 *
 * Creates a demo user with sample habits and logs for development.
 * Run with: npm run db:seed
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Returns a 'YYYY-MM-DD' string for N days ago from today.
 */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Create Demo User ─────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@aura.app' },
    update: {},
    create: {
      email: 'demo@aura.app',
      passwordHash,
      name: 'Demo User',
      avatarSeed: 'demo@aura.app',
      bio: 'Building better habits, one day at a time.',
      dailyGoal: 5,
      timezone: 'America/New_York',
    },
  });

  console.log(`  ✓ Created user: ${user.email}`);

  // ── Create Habits ────────────────────────────────────────

  const habits = [
    {
      name: 'Morning Meditation',
      color: '#8B5CF6',
      icon: 'Brain',
      frequency: JSON.stringify({ type: 'daily' }),
      sortOrder: 0,
    },
    {
      name: 'Exercise',
      color: '#EF4444',
      icon: 'Dumbbell',
      frequency: JSON.stringify({ type: 'specific_days', days: [1, 3, 5] }),
      sortOrder: 1,
    },
    {
      name: 'Read 30 Minutes',
      color: '#3B82F6',
      icon: 'Book',
      frequency: JSON.stringify({ type: 'daily' }),
      sortOrder: 2,
    },
    {
      name: 'Drink 8 Glasses of Water',
      color: '#06B6D4',
      icon: 'Droplets',
      frequency: JSON.stringify({ type: 'daily' }),
      sortOrder: 3,
    },
    {
      name: 'Practice Guitar',
      color: '#F59E0B',
      icon: 'Music',
      frequency: JSON.stringify({ type: 'weekly', timesPerWeek: 3 }),
      sortOrder: 4,
    },
    {
      name: 'Journal',
      color: '#10B981',
      icon: 'Leaf',
      frequency: JSON.stringify({ type: 'specific_days', days: [0, 3, 6] }),
      sortOrder: 5,
    },
  ];

  const createdHabits = [];
  for (const habitData of habits) {
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        ...habitData,
      },
    });
    createdHabits.push(habit);
    console.log(`  ✓ Created habit: ${habit.name}`);
  }

  // ── Create Sample Logs ───────────────────────────────────
  // Create 30 days of semi-realistic log data

  const logEntries = [];

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const dateStr = daysAgo(dayOffset);

    for (const habit of createdHabits) {
      const freq = JSON.parse(habit.frequency);

      // Check if this day is "scheduled"
      const dayOfWeek = new Date(dateStr + 'T12:00:00Z').getUTCDay();
      let isScheduled = true;

      if (freq.type === 'specific_days') {
        isScheduled = freq.days.includes(dayOfWeek);
      }

      if (!isScheduled) continue;

      // Simulate ~75% completion rate with some variation
      const rand = Math.random();
      let status;
      if (rand < 0.70) {
        status = 'completed';
      } else if (rand < 0.85) {
        status = 'partial';
      } else {
        status = 'missed';
      }

      // Occasionally add notes
      const notes = rand < 0.15
        ? 'Great session today!'
        : rand < 0.25
          ? 'Struggled a bit but got it done.'
          : null;

      logEntries.push({
        habitId: habit.id,
        date: dateStr,
        status,
        notes,
      });
    }
  }

  // Batch insert logs
  await prisma.habitLog.createMany({
    data: logEntries,
    skipDuplicates: true,
  });

  console.log(`  ✓ Created ${logEntries.length} log entries`);
  console.log('\n✅ Seed complete!');
  console.log('   Login with: demo@aura.app / demo1234\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

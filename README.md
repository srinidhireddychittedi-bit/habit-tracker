# 🍃 AURA — Zen Habit Tracking Dashboard

**A full-stack, zen-themed habit tracking PWA** with intelligent streak analytics, built to demonstrate production-quality software engineering.

AURA helps you build daily habits through a serene, minimal interface — complete with streak tracking, visual analytics, a focus timer, and offline support. The backend features a **well-tested streak-calculation engine** that correctly handles timezone boundaries, flexible schedules, and edge cases most habit trackers get wrong.

> **Live Demo**: [stalwart-meerkat-f558e2.netlify.app](https://stalwart-meerkat-f558e2.netlify.app/) · **Status**: ✅ Fully functional

---

## 📸 Screenshot

> Register or log in, then add habits from the dashboard. The Stats tab shows real-time streak data and a daily completions bar chart powered by Recharts.

| Dashboard | Stats Panel |
|-----------|-------------|
| Habit matrix with completion toggles | Bar chart + heatmap + streak rings |

*(Add screenshots here after first login — paste images into this table.)*

---

## ✨ Features

- **Habit Matrix** — Track daily habits with satisfying completion toggles (completed / partial / missed)
- **Intelligent Streak Engine** — Server-side streak calculation supporting daily, weekday-specific, and weekly frequencies with timezone-correct day boundaries
- **Visual Analytics** — 30-day heatmap, completion rates, per-habit stats, streak history
- **Pomodoro Timer** — Built-in focus timer with ambient audio (Web Audio API)
- **Dark/Light Theme** — Zen-inspired glassmorphism design in both modes
- **PWA & Offline** — Installable, works offline with service worker caching
- **JWT Authentication** — Secure access + refresh token rotation, rate-limited auth endpoints
- **Optimistic UI** — Instant visual feedback on every action, reverts gracefully on error

---

## 🏗️ Architecture

```
┌──────────────────┐     REST / JSON     ┌──────────────────┐     Prisma ORM     ┌──────────────┐
│                  │ ◄─────────────────► │                  │ ◄───────────────► │              │
│  React Client    │    JWT Auth          │  Express Server  │                    │  PostgreSQL  │
│  (Vite + TW v4)  │                     │  (Node.js)       │                    │  (SQLite dev)│
│                  │                     │                  │                    │              │
└──────────────────┘                     └──────────────────┘                    └──────────────┘
     PWA Shell                               ▲
     Framer Motion                           │
     Recharts                          Streak Engine
                                       (pure functions,
                                        unit tested)
```

**Monorepo structure:**
```
aura/
├── client/          React + Vite + Tailwind v4 + Framer Motion + Recharts
├── server/          Express + Prisma + JWT + Zod + Streak Engine
├── .github/         CI/CD workflows (lint + test on every PR)
├── API.md           Complete API reference
└── README.md
```

---

## 🔥 Technical Highlights

### Streak Calculation Engine
The centerpiece of this project is a **well-isolated, pure-function streak engine** ([`server/src/services/streakEngine.js`](server/src/services/streakEngine.js)) that computes current and longest streaks server-side. Unlike naive client-side loops, it correctly handles:

| Edge Case | How It's Handled |
|-----------|-----------------|
| **Multiple frequencies** | Daily, specific weekdays (MWF), X-times-per-week — each with distinct streak logic |
| **Timezone correctness** | Uses `Intl.DateTimeFormat` to determine "today" in the user's timezone; a 11:30 PM completion in PST counts as the correct day |
| **Midnight rollover** | Day boundaries are computed in the user's local timezone, not UTC |
| **Today's grace period** | If today is scheduled but not yet completed, the streak counts from yesterday |
| **Non-scheduled days** | A habit scheduled for MWF doesn't break its streak on Tuesday |
| **Leap years** | Feb 29 transitions handled correctly in date iteration |
| **Back-filled logs** | Retroactively completing past days recalculates streaks properly |
| **Habit created mid-streak** | Only counts from the habit's creation date |

The engine is covered by **30+ unit tests** targeting these specific scenarios, not just happy paths.

### Auth System
- Passwords hashed with **bcrypt** (12 rounds)
- **JWT access tokens** (15min) + **refresh token rotation** (7 days, stored in DB)
- Rate limiting (10 req/min) on auth endpoints
- All API input validated with **Zod** schemas — proper 4xx responses, never generic 500s

### Frontend Engineering
- **Optimistic UI updates** — toggle a habit and see instant feedback; reverts on API error
- **Token refresh** — automatic 401 → refresh → retry, deduplicating concurrent refreshes
- **Glassmorphism design system** — CSS custom properties for light/dark themes
- **Framer Motion** page transitions, layout animations, and micro-interactions

---

## 🚀 Local Setup

### Prerequisites
- **Node.js** 18+ and **npm** 9+
- Git

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/aura.git
cd aura

# 2. Install all dependencies (root + client + server)
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Initialize the database
cd server
npx prisma db push
cd ..

# 5. (Optional) Seed sample data
npm run db:seed -w server

# 6. Start both servers
npm run dev
```

The client runs at **http://localhost:5173** and the server at **http://localhost:3001**.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm test` | Run all tests (server + client) |
| `npm run test:coverage` | Run tests with coverage reports |
| `npm run lint` | ESLint check across the monorepo |
| `npm run format` | Format all files with Prettier |
| `npm run db:migrate -w server` | Run Prisma migrations |
| `npm run db:studio -w server` | Open Prisma Studio GUI |

---

## 📡 API Reference

See [`API.md`](API.md) for the complete endpoint documentation including request/response examples and error cases.

**Key endpoints:**
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET /api/habits` — List habits
- `PUT /api/logs/:habitId/:date` — Toggle completion
- `GET /api/stats/streaks` — Get streak analytics

---

## 🧪 Testing

```bash
# All tests
npm test

# Server only (streak engine + API integration tests)
npm run test:server

# Client only (component tests)
npm run test:client

# With coverage
npm run test:coverage
```

**Test breakdown:**
- **Streak engine**: 30+ unit tests covering frequencies, timezones, edge cases
- **API integration**: Auth flow, habit CRUD, log operations via Supertest
- **Components**: HabitMatrix rendering, AuthPages form flow via React Testing Library

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, Lucide Icons |
| Backend | Node.js, Express, Prisma ORM, Zod validation |
| Auth | bcrypt, JWT (access + refresh tokens) |
| Database | PostgreSQL (production) / SQLite (development) |
| Testing | Vitest, Supertest, React Testing Library |
| CI/CD | GitHub Actions |
| PWA | Service Worker, Web App Manifest |

---

## 📄 License

[MIT](LICENSE) — built by [Srinidhi](https://github.com/YOUR_USERNAME)

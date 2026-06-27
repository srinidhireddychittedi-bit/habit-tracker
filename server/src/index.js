import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import logRoutes from './routes/logs.js';
import statRoutes from './routes/stats.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * AURA Habit Tracker — Express Application
 *
 * Initializes middleware stack:
 *  1. Helmet (security headers)
 *  2. CORS (configured for CLIENT_URL)
 *  3. Compression (gzip responses)
 *  4. JSON body parser
 *  5. Cookie parser
 *
 * Mounts API routes and a global error handler.
 */
const app = express();

// ── Security & Compression ────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/stats', statRoutes);

// ── 404 for unmatched API routes ───────────────────────────
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler (must be last) ────────────────────
app.use(errorHandler);

// ── Start server (only when run directly, not imported for tests) ──
const PORT = parseInt(process.env.PORT, 10) || 3001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🟢 AURA server running on http://localhost:${PORT}`);
  });
}

export default app;

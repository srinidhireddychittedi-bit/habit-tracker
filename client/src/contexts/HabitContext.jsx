import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { getToday, daysAgo } from '../lib/utils.js';

const HabitContext = createContext(null);

export function HabitProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [habits,     setHabits]     = useState([]);
  const [logs,       setLogs]       = useState({});
  const [streakInfo, setStreakInfo]  = useState({});
  const [habitStats, setHabitStats]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const logKey = (habitId, date) => `${habitId}:${date}`;

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [habitsData, logsData, streaksData, statsData] = await Promise.all([
        api.get('/api/habits'),
        api.get(`/api/logs?from=${daysAgo(90)}&to=${getToday()}`),
        api.get('/api/stats/streaks').catch(() => ({})),
        api.get('/api/stats/habits').catch(() => ({})),
      ]);

      setHabits(habitsData.habits || []);

      const logMap = {};
      const rawLogs = logsData.logs || {};
      Object.entries(rawLogs).forEach(([date, habitMap]) => {
        Object.entries(habitMap).forEach(([habitId, log]) => {
          logMap[logKey(habitId, date)] = { ...log, habitId, date };
        });
      });
      setLogs(logMap);
      setStreakInfo(streaksData.streaks || {});
      setHabitStats(statsData.stats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── TOGGLE: null status → DELETE log; otherwise PUT ──────
  const toggleCompletion = useCallback(async (habitId, date, status) => {
    const key = logKey(habitId, date);
    const previousLog = logs[key];

    // Optimistic update
    if (status === null) {
      setLogs((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      setLogs((prev) => ({ ...prev, [key]: { ...prev[key], habitId, date, status } }));
    }

    try {
      if (status === null) {
        // Clear the log entry entirely
        await api.delete(`/api/logs/${habitId}/${date}`);
      } else {
        const data = await api.put(`/api/logs/${habitId}/${date}`, { status });
        setLogs((prev) => ({ ...prev, [key]: data.log || data }));
      }
      // Refresh streaks in background
      api.get('/api/stats/streaks')
        .then((res) => setStreakInfo(res.streaks || res || {}))
        .catch(() => {});
    } catch {
      // Revert optimistic update on failure
      setLogs((prev) => {
        const newLogs = { ...prev };
        if (previousLog) newLogs[key] = previousLog;
        else delete newLogs[key];
        return newLogs;
      });
    }
  }, [logs]);

  const addHabit = useCallback(async (habitData) => {
    const data = await api.post('/api/habits', habitData);
    const newHabit = data.habit || data;
    setHabits((prev) => [...prev, newHabit]);
    return newHabit;
  }, []);

  const updateHabit = useCallback(async (id, habitData) => {
    const data = await api.patch(`/api/habits/${id}`, habitData);
    const updated = data.habit || data;
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updated } : h)));
    return updated;
  }, []);

  const deleteHabit = useCallback(async (id) => {
    const prev = habits;
    setHabits((h) => h.filter((habit) => habit.id !== id));
    try {
      await api.delete(`/api/habits/${id}`);
    } catch {
      setHabits(prev);
    }
  }, [habits]);

  const getLog = useCallback(
    (habitId, date) => logs[logKey(habitId, date)] || null,
    [logs]
  );

  const value = {
    habits, logs, streakInfo, habitStats, loading, error,
    toggleCompletion, addHabit, updateHabit, deleteHabit, getLog,
    refetch: fetchData,
  };

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) throw new Error('useHabits must be used within a HabitProvider');
  return context;
}

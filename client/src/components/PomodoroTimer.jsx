import { useState, useEffect, useRef, useCallback } from 'react';

const MODES = [
  { id: 'focus',  label: 'Focus',       minutes: 25, color: '#10B981', emoji: '🧠' },
  { id: 'short',  label: 'Short Break', minutes: 5,  color: '#3B82F6', emoji: '☕' },
  { id: 'long',   label: 'Long Break',  minutes: 15, color: '#8B5CF6', emoji: '🌿' },
];

// Web Audio bell using harmonics — no external files needed
function playBell(volume = 0.6) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const freqs = [440, 880, 1320]; // A4, A5, E6 — bell-like chord
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const vol = volume / (i + 1);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 3);
    });
  } catch { /* AudioContext blocked — ignore */ }
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// SVG ring progress
function TimerRing({ radius, percent, color }) {
  const size = radius * 2 + 24;
  const cx = size / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - percent);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={radius} fill="none"
        stroke="var(--bg-raised)" strokeWidth={10} />
      <circle cx={cx} cy={cx} r={radius} fill="none"
        stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="timer-ring-progress" />
    </svg>
  );
}

export default function PomodoroTimer() {
  const [modeIdx, setModeIdx] = useState(0);
  const [secsLeft, setSecsLeft] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [log, setLog] = useState([]);

  const intervalRef = useRef(null);
  const mode = MODES[modeIdx];
  const total = mode.minutes * 60;
  const percent = secsLeft / total;

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setSecsLeft(total);
  }, [stop, total]);

  const switchMode = useCallback((idx) => {
    stop();
    setModeIdx(idx);
    setSecsLeft(MODES[idx].minutes * 60);
  }, [stop]);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          playBell(volume);
          if (modeIdx === 0) setSessions(prev => prev + 1);
          // Flash title
          let flashes = 0;
          const orig = document.title;
          const t = setInterval(() => {
            document.title = flashes++ % 2 === 0 ? '🔔 Time\'s up!' : orig;
            if (flashes > 8) { clearInterval(t); document.title = orig; }
          }, 600);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, modeIdx, volume]);

  // Update document title while running
  useEffect(() => {
    if (running) document.title = `${formatTime(secsLeft)} — ${mode.label} | Habit Tracker`;
    else document.title = 'Habit Tracker';
    return () => { document.title = 'Habit Tracker'; };
  }, [running, secsLeft, mode.label]);

  function toggle() {
    if (secsLeft === 0) { reset(); return; }
    setRunning(r => !r);
  }

  function addLog() {
    if (!running) return;
    const entry = `${mode.emoji} ${mode.label} — started ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setLog(prev => [entry, ...prev].slice(0, 10));
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-lg mx-auto">
      <div>
        <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>⏱ Pomodoro Timer</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Focus deeply. Rest well. A bell rings when time is up.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {MODES.map((m, i) => (
          <button key={m.id} onClick={() => switchMode(i)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={{
              borderColor: modeIdx === i ? m.color : 'var(--border)',
              background: modeIdx === i ? `${m.color}18` : 'var(--bg-card)',
              color: modeIdx === i ? m.color : 'var(--text-muted)',
            }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Timer face */}
      <div className="card flex flex-col items-center py-10 gap-6">
        <div className="relative flex items-center justify-center">
          <TimerRing radius={110} percent={percent} color={mode.color} />
          <div className="absolute flex flex-col items-center gap-1">
            <div className="text-5xl font-mono font-bold tracking-tight"
              style={{ color: 'var(--text)' }}>
              {formatTime(secsLeft)}
            </div>
            <div className="text-xs font-semibold px-3 py-0.5 rounded-full"
              style={{ background: `${mode.color}18`, color: mode.color }}>
              {mode.emoji} {mode.label}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button onClick={reset}
            className="w-10 h-10 rounded-full border flex items-center justify-center text-lg transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title="Reset">↺</button>

          <button onClick={toggle}
            className="w-16 h-16 rounded-full text-white text-xl font-bold flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: mode.color,
              boxShadow: running ? `0 0 0 8px ${mode.color}28` : `0 4px 16px ${mode.color}50`,
            }}>
            {running ? '⏸' : secsLeft === 0 ? '↺' : '▶'}
          </button>

          <button onClick={addLog}
            className="w-10 h-10 rounded-full border flex items-center justify-center text-lg transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title="Log session">📝</button>
        </div>

        {/* Sessions completed */}
        <div className="flex items-center gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full transition-colors"
              style={{ background: i < sessions % 4 ? '#10B981' : 'var(--bg-raised)' }} />
          ))}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {sessions} session{sessions !== 1 ? 's' : ''} today
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="card px-5 py-4 flex items-center gap-4">
        <span className="text-sm" style={{ color: 'var(--text-soft)' }}>🔔 Bell volume</span>
        <input type="range" min={0} max={1} step={0.05} value={volume}
          onChange={e => setVolume(+e.target.value)}
          className="flex-1 accent-emerald-500 cursor-pointer" />
        <button onClick={() => playBell(volume)}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
          style={{ background: 'var(--bg-raised)', color: 'var(--text-soft)' }}>
          Test
        </button>
      </div>

      {/* Tips */}
      <div className="card px-5 py-4">
        <h3 className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Pomodoro Method
        </h3>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-soft)' }}>
          <div className="flex gap-3"><span>1.</span><span>Focus for 25 minutes without distractions</span></div>
          <div className="flex gap-3"><span>2.</span><span>Take a 5-minute short break</span></div>
          <div className="flex gap-3"><span>3.</span><span>After 4 sessions, take a 15-minute long break</span></div>
          <div className="flex gap-3"><span>4.</span><span>A bell rings automatically when each session ends</span></div>
        </div>
      </div>

      {/* Session log */}
      {log.length > 0 && (
        <div className="card px-5 py-4">
          <h3 className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Session Log
          </h3>
          <div className="space-y-1">
            {log.map((entry, i) => (
              <div key={i} className="text-xs py-1.5 border-b last:border-0"
                style={{ color: 'var(--text-soft)', borderColor: 'var(--border)' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

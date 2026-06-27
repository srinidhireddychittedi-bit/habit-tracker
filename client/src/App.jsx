import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { HabitProvider } from './contexts/HabitContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import AuthPages from './components/AuthPages.jsx';
import Layout from './components/Layout.jsx';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-lg">
            <span className="text-2xl">✓</span>
          </div>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>LOADING</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPages />;

  return (
    <HabitProvider>
      <Layout />
    </HabitProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

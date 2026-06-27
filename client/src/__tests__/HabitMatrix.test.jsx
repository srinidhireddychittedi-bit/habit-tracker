import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the contexts
const mockToggleCompletion = vi.fn();
const mockAddHabit = vi.fn();
const mockDeleteHabit = vi.fn();
const mockGetLog = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../contexts/HabitContext.jsx', () => ({
  useHabits: () => ({
    habits: mockHabits,
    loading: mockLoading,
    error: mockError,
    toggleCompletion: mockToggleCompletion,
    getLog: mockGetLog,
    addHabit: mockAddHabit,
    updateHabit: vi.fn(),
    deleteHabit: mockDeleteHabit,
    streakInfo: { currentStreak: 5, bestStreak: 12 },
    refetch: mockRefetch,
  }),
  HabitProvider: ({ children }) => children,
}));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}));

// We need to import after mocks
let HabitMatrix;
let mockHabits = [];
let mockLoading = false;
let mockError = null;

beforeEach(async () => {
  vi.clearAllMocks();
  mockHabits = [];
  mockLoading = false;
  mockError = null;
  mockGetLog.mockReturnValue(null);

  // Dynamic import after mocks
  const module = await import('../components/HabitMatrix.jsx');
  HabitMatrix = module.default;
});

describe('HabitMatrix', () => {
  it('renders the AURA header', () => {
    mockHabits = [];
    render(<HabitMatrix />);
    expect(screen.getByText('AURA')).toBeTruthy();
  });

  it('shows empty state when no habits exist', () => {
    mockHabits = [];
    render(<HabitMatrix />);
    expect(screen.getByText(/your habit garden is empty/i)).toBeTruthy();
    expect(screen.getByText(/add your first habit/i)).toBeTruthy();
  });

  it('renders habit list when habits exist', () => {
    mockHabits = [
      { id: 'h1', name: 'Meditation', color: '#10B981', icon: 'Leaf', frequency: { type: 'daily' } },
      { id: 'h2', name: 'Exercise', color: '#3B82F6', icon: 'Dumbbell', frequency: { type: 'daily' } },
    ];
    render(<HabitMatrix />);
    expect(screen.getByText('Meditation')).toBeTruthy();
    expect(screen.getByText('Exercise')).toBeTruthy();
  });

  it('shows streak cards when streaks are non-zero', () => {
    mockHabits = [
      { id: 'h1', name: 'Meditation', color: '#10B981', icon: 'Leaf', frequency: { type: 'daily' } },
    ];
    render(<HabitMatrix />);
    expect(screen.getByText('5')).toBeTruthy(); // currentStreak
    expect(screen.getByText('12')).toBeTruthy(); // bestStreak
  });

  it('shows progress bar with correct count', () => {
    mockHabits = [
      { id: 'h1', name: 'Meditation', color: '#10B981', icon: 'Leaf', frequency: { type: 'daily' } },
      { id: 'h2', name: 'Exercise', color: '#3B82F6', icon: 'Dumbbell', frequency: { type: 'daily' } },
    ];
    mockGetLog.mockImplementation((id) => {
      if (id === 'h1') return { status: 'completed' };
      return null;
    });
    render(<HabitMatrix />);
    expect(screen.getByText('1/2')).toBeTruthy();
  });

  it('shows error state on fetch error', () => {
    mockError = 'Network error';
    render(<HabitMatrix />);
    expect(screen.getByText(/couldn't load your habits/i)).toBeTruthy();
  });
});

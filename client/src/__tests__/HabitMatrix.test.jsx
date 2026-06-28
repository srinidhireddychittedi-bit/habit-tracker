import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
    streakInfo: {},
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

// Import after mocks
let PersonalizedMatrix;
let mockHabits = [];
let mockLoading = false;
let mockError = null;

beforeEach(async () => {
  vi.clearAllMocks();
  mockHabits = [];
  mockLoading = false;
  mockError = null;
  mockGetLog.mockReturnValue(null);

  // Dynamic import after mocks are set
  const module = await import('../components/PersonalizedMatrix.jsx');
  PersonalizedMatrix = module.default;
});

describe('PersonalizedMatrix', () => {
  it('renders the Habit Matrix header', () => {
    render(<PersonalizedMatrix onAddHabit={vi.fn()} onEditHabit={vi.fn()} />);
    expect(screen.getByText(/Habit Matrix/i)).toBeTruthy();
  });

  it('shows empty state when no habits exist', () => {
    render(<PersonalizedMatrix onAddHabit={vi.fn()} onEditHabit={vi.fn()} />);
    expect(screen.getByText(/No habits yet/i)).toBeTruthy();
  });

  it('shows Add Habit button', () => {
    render(<PersonalizedMatrix onAddHabit={vi.fn()} onEditHabit={vi.fn()} />);
    // Use role to get exactly the button, not the hint text in empty state
    expect(screen.getByRole('button', { name: /add habit/i })).toBeTruthy();
  });

  it('renders habit names when habits exist', () => {
    mockHabits = [
      { id: 'h1', name: 'Meditation', color: '#10B981', icon: '🧘', frequency: { type: 'daily' }, priority: 'medium' },
      { id: 'h2', name: 'Exercise',   color: '#3B82F6', icon: '💪', frequency: { type: 'daily' }, priority: 'high' },
    ];
    render(<PersonalizedMatrix onAddHabit={vi.fn()} onEditHabit={vi.fn()} />);
    expect(screen.getByText('Meditation')).toBeTruthy();
    expect(screen.getByText('Exercise')).toBeTruthy();
  });

  it('shows legend items', () => {
    render(<PersonalizedMatrix onAddHabit={vi.fn()} onEditHabit={vi.fn()} />);
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Partial')).toBeTruthy();
    expect(screen.getByText('Missed')).toBeTruthy();
  });

  it('shows date column headers', () => {
    render(<PersonalizedMatrix onAddHabit={vi.fn()} onEditHabit={vi.fn()} />);
    // Should show some day numbers (at least today's date is visible)
    const today = new Date().getDate().toString();
    expect(screen.getByText(today)).toBeTruthy();
  });
});

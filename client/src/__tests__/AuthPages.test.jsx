import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the auth context
const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    isAuthenticated: false,
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('../contexts/ThemeContext.jsx', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}));

let AuthPages;

beforeEach(async () => {
  vi.clearAllMocks();
  const module = await import('../components/AuthPages.jsx');
  AuthPages = module.default;
});

describe('AuthPages', () => {
  it('renders login form by default', () => {
    render(<AuthPages />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('switches to register form when clicking sign up', async () => {
    const user = userEvent.setup();
    render(<AuthPages />);
    const switchBtn = screen.getByText(/sign up/i);
    await user.click(switchBtn);
    // Should show name field in register mode
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeTruthy();
    });
  });

  it('shows validation error for empty form submission', async () => {
    const user = userEvent.setup();
    render(<AuthPages />);

    // Find and click submit button
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    // Validation should show error and prevent login call
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeTruthy();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ user: { name: 'Test' } });
    render(<AuthPages />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    render(<AuthPages />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeTruthy();
    });
  });
});

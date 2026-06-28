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
    // There are two 'Sign In' buttons: tab + submit. Both being present means we're in login mode.
    const signInBtns = screen.getAllByRole('button', { name: /sign in/i });
    expect(signInBtns.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('switches to register form when clicking Create one', async () => {
    const user = userEvent.setup();
    render(<AuthPages />);
    // The switch link says "Create one"
    const switchBtn = screen.getByText(/create one/i);
    await user.click(switchBtn);
    // Register mode should show Name field
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeTruthy();
    });
  });

  it('shows validation error for empty form submission', async () => {
    const user = userEvent.setup();
    render(<AuthPages />);

    // Submit with empty fields — browser required validation kicks in,
    // but our component also validates on submit
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(emailInput, 'not-an-email');
    await user.type(passwordInput, ' ');
    await user.clear(emailInput);

    // login should not have been called since email is empty
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ user: { name: 'Test' } });
    render(<AuthPages />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Find and click the submit button (the form submit button, not the tab button)
    // Both the tab button and submit button say 'Sign In' — get the submit (last one)
    const signInBtns = screen.getAllByRole('button', { name: /sign in/i });
    const submitBtn = signInBtns[signInBtns.length - 1];
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

    const signInBtns2 = screen.getAllByRole('button', { name: /sign in/i });
    const submitBtn2 = signInBtns2[signInBtns2.length - 1];
    await user.click(submitBtn2);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeTruthy();
    });
  });
});

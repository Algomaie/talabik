import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/pages/auth/LoginPage';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { authApi } from '../src/lib/api';
vi.mock('../src/lib/api', () => ({ authApi: { login: vi.fn(), me: vi.fn() } }));
function UserName() { const { user } = useAuth(); return <span>{user?.firstName}</span>; }
beforeEach(() => vi.resetAllMocks());
function mount() { render(<MemoryRouter><AuthProvider><LoginPage /><UserName /></AuthProvider></MemoryRouter>); }
function submit() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'customer@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Example123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}
describe('Login with the real AuthContext', () => {
  it('submits credentials and preserves camelCase API user names', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ data: { data: {
      accessToken: 'access', refreshToken: 'refresh', user: { id: '1', email: 'customer@example.test', firstName: 'Sara', lastName: 'Test', roles: ['CUSTOMER'] },
    } } } as any);
    mount(); submit();
    expect(await screen.findByText('Sara')).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith('customer@example.test', 'Example123!');
    expect(localStorage.getItem('accessToken')).toBe('access');
  });
  it('shows API failure without losing the form', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ response: { data: { error: { message: 'Invalid credentials' } } } });
    mount(); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });
});

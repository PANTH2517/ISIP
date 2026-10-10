import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api, { apiError } from '../../test/apiMock';
import { AuthProvider } from '../../context/AuthContext';
import Login from './Login';

vi.mock('../../api/client', () => import('../../test/apiMock'));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderLogin(entry = '/login') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
          <Route path="/startups/:id" element={<p>Startup page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return {
    email: screen.getByLabelText('Email'),
    password: screen.getByLabelText('Password'),
    submit: () => userEvent.click(screen.getByRole('button', { name: 'Log in' })),
  };
}

describe('Login page', () => {
  it('fills the form from the demo account buttons', async () => {
    const { email, password } = renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Investor' }));
    expect(email).toHaveValue('vikram.investor@isip.edu');
    expect(password).toHaveValue('Password@123');
  });

  it('logs in, stores the token and goes to the dashboard', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'jwt-123', user: { id: 5, name: 'Aarav Patel', role: 'student' } } });
    const { email, password, submit } = renderLogin();
    await userEvent.type(email, 'aarav.student@isip.edu');
    await userEvent.type(password, 'Password@123');
    await submit();
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'aarav.student@isip.edu', password: 'Password@123' });
    expect(localStorage.getItem('isip_token')).toBe('jwt-123');
  });

  it('shows the server error for wrong credentials', async () => {
    api.post.mockRejectedValueOnce(apiError('Invalid email or password', 401));
    const { email, password, submit } = renderLogin();
    await userEvent.type(email, 'aarav.student@isip.edu');
    await userEvent.type(password, 'wrong');
    await submit();
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(localStorage.getItem('isip_token')).toBeNull();
  });

  it('offers to resend verification for unverified accounts', async () => {
    api.post
      .mockRejectedValueOnce(apiError('Please verify your email before logging in', 403, { needsVerification: true }))
      .mockResolvedValueOnce({ data: { message: 'Sent', devLink: 'http://localhost:5173/verify-email?token=abc' } });
    const { email, password, submit } = renderLogin();
    await userEvent.type(email, 'new@isip.edu');
    await userEvent.type(password, 'abc12345');
    await submit();
    await userEvent.click(await screen.findByRole('button', { name: /Resend verification email/ }));
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/auth/resend-verification', { email: 'new@isip.edu' }));
    expect(await screen.findByRole('link', { name: /Verify my email/ })).toHaveAttribute('href', '/verify-email?token=abc');
  });

  it('returns to the page the user was on after their session expired', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'jwt-9', user: { id: 5, name: 'Aarav Patel', role: 'student' } } });
    const { email, password, submit } = renderLogin('/login?expired=1&next=%2Fstartups%2F1%3Ftab%3Dinvestors');
    expect(screen.getByRole('alert')).toHaveTextContent(/session expired/i);
    await userEvent.type(email, 'a@b.c'); await userEvent.type(password, 'Password1');
    await submit();
    expect(await screen.findByText('Startup page')).toBeInTheDocument();
  });

  it('never redirects to another site after login', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'jwt-9', user: { id: 5, name: 'Aarav Patel', role: 'student' } } });
    const { email, password, submit } = renderLogin('/login?next=%2F%2Fevil.example');
    await userEvent.type(email, 'a@b.c'); await userEvent.type(password, 'Password1');
    await submit();
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });
});

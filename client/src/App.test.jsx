import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api, { apiError } from './test/apiMock';
import { AuthProvider } from './context/AuthContext';
import App from './App';

vi.mock('./api/client', () => import('./test/apiMock'));

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider><App /></AuthProvider>
  </MemoryRouter>,
);

describe('route protection', () => {
  it.each(['/dashboard', '/admin/users', '/startups/1'])('sends signed-out visitors from %s to the login page', async (path) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: 'Log in to StartIn' })).toBeInTheDocument();
  });

  it('redirects a student away from admin-only pages', async () => {
    localStorage.setItem('isip_token', 'jwt');
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.resolve({ data: { id: 5, name: 'Aarav Patel', role: 'student' } });
      if (url.startsWith('/notifications')) return Promise.resolve({ data: { items: [], unread: 0 } });
      return new Promise(() => {}); // dashboard data never needed for this check
    });
    renderAt('/admin/users');
    // Lands on the student layout (dashboard route) instead of the Users page.
    expect(await screen.findByText('My Startups')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Manage users' })).not.toBeInTheDocument();
  });

  it('shows the investor-only menu items to investors', async () => {
    localStorage.setItem('isip_token', 'jwt');
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.resolve({ data: { id: 9, name: 'Vikram Malhotra', role: 'investor' } });
      if (url.startsWith('/notifications')) return Promise.resolve({ data: { items: [], unread: 0 } });
      return new Promise(() => {});
    });
    renderAt('/dashboard');
    expect(await screen.findByText('My Offers')).toBeInTheDocument();
    expect(screen.queryByText('Workshops & Events')).not.toBeInTheDocument();
  });
});

describe('stored login on startup', () => {
  it('keeps the login and retries when the server is unreachable', async () => {
    localStorage.setItem('isip_token', 'jwt');
    let calls = 0;
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') {
        calls += 1;
        return calls === 1 ? Promise.reject(new Error('Network Error')) : Promise.resolve({ data: { id: 5, name: 'Aarav Patel', role: 'student' } });
      }
      if (url.startsWith('/notifications')) return Promise.resolve({ data: { items: [], unread: 0 } });
      return new Promise(() => {});
    });
    renderAt('/startups');
    expect(await screen.findByText(/server may be waking up/i)).toBeInTheDocument();
    expect(localStorage.getItem('isip_token')).toBe('jwt');
    expect((await screen.findAllByText('My Startups', {}, { timeout: 6000 })).length).toBeGreaterThan(0);
  }, 10000);

  it('says the session expired when the stored login is rejected', async () => {
    localStorage.setItem('isip_token', 'old-jwt');
    api.get.mockImplementation((url) => (url === '/auth/me' ? Promise.reject(apiError('Invalid token', 401)) : new Promise(() => {})));
    renderAt('/dashboard');
    expect(await screen.findByText(/session expired/i)).toBeInTheDocument();
    expect(localStorage.getItem('isip_token')).toBeNull();
  });

  it('after logging in again, returns to the page that needed the login', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    localStorage.setItem('isip_token', 'old-jwt');
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.reject(apiError('Invalid token', 401));
      if (url.startsWith('/notifications')) return Promise.resolve({ data: { items: [], unread: 0 } });
      return new Promise(() => {});
    });
    api.post.mockResolvedValueOnce({ data: { token: 'new-jwt', user: { id: 5, name: 'Aarav Patel', role: 'student' } } });
    renderAt('/meetings');
    await screen.findByText(/session expired/i);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Meeting scheduler' })).toBeInTheDocument();
  });
});


import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from './test/apiMock';
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

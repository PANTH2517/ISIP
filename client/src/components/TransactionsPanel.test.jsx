import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../test/apiMock';
import { AuthProvider, useAuth } from '../context/AuthContext';
import TransactionsPanel from './TransactionsPanel';

vi.mock('../api/client', () => import('../test/apiMock'));

const deal = (over) => ({
  id: 7, startupId: 3, amount: '1500000', instrument: 'SAFE', equity: 6, respondedAt: '2026-10-08T10:00:00Z', clearance: 'under_review', clearanceNote: null,
  startup: { id: 3, startupName: 'CampusEats' }, investor: { firmName: 'Blue Lotus Ventures', user: { id: 10, name: 'Neha Kapoor' } }, ...over,
});

// In the app the panel sits behind RequireAuth, so render it once the user has loaded.
function SignedIn() {
  const { user } = useAuth();
  return user ? <TransactionsPanel /> : null;
}

function renderAs(role, deals) {
  localStorage.setItem('isip_token', 'jwt');
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: { id: 1, name: 'Someone', role } });
    if (url.startsWith('/investors/interests')) return Promise.resolve({ data: deals });
    return new Promise(() => {});
  });
  render(<MemoryRouter><AuthProvider><SignedIn /></AuthProvider></MemoryRouter>);
}

describe('TransactionsPanel', () => {
  it('lets the admin clear, hold or cancel a deal under review', async () => {
    renderAs('admin', [deal()]);
    const row = (await screen.findByText('CampusEats')).closest('tr');
    expect(within(row).getByText('Under review')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /clear/i })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /hold/i })).toBeInTheDocument();

    api.patch.mockResolvedValue({ data: { incubated: false } });
    fireEvent.click(within(row).getByRole('button', { name: /hold/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Need the signed SAFE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Put on hold' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/investors/interests/7/clearance', { action: 'hold', note: 'Need the signed SAFE' }));
    expect(api.get).toHaveBeenCalledWith('/investors/interests?status=accepted');
    localStorage.clear();
  });

  it('shows only the status (no actions) to founders, and no Hold on a deal already on hold', async () => {
    renderAs('student', [deal({ clearance: 'on_hold', clearanceNote: 'Waiting for the agreement' })]);
    const row = (await screen.findByText('CampusEats')).closest('tr');
    expect(within(row).getByText('On hold')).toBeInTheDocument();
    expect(within(row).getByText('Waiting for the agreement')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    localStorage.clear();
  });
});

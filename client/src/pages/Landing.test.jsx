import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../test/apiMock';
import { AuthProvider } from '../context/AuthContext';
import Landing from './Landing';

vi.mock('../api/client', () => import('../test/apiMock'));

const overview = {
  stats: { startups: 4, incubated: 1, mentors: 3, investors: 2, students: 4, financeCommitted: 1200000, workshopsHeld: 1, industries: 3 },
  upcomingEvents: [{ id: 1, title: 'Build-a-thon 2026', type: 'hackathon', date: '2026-10-29', time: '09:00', venue: 'Innovation Lab', description: '24-hour hackathon.' }],
  showcase: [{ id: 1, startupName: 'AgriSense', industry: 'AgriTech', description: 'Soil sensors.', status: 'incubated', progress: 50 }],
  notices: [{ text: 'Applications are open', date: null, isNew: false }],
};

describe('public home page', () => {
  it('shows live statistics, events and the startup showcase to visitors', async () => {
    api.get.mockImplementation((url) => (url === '/public/overview' ? Promise.resolve({ data: overview }) : new Promise(() => {})));
    render(<MemoryRouter><AuthProvider><Landing /></AuthProvider></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: /incubated startup/i })).toBeInTheDocument();
    expect(await screen.findByText('₹12L')).toBeInTheDocument();
    expect(screen.getAllByText('Build-a-thon 2026').length).toBeGreaterThan(0);
    const showcase = screen.getByRole('heading', { name: 'AgriSense' }).closest('div');
    expect(within(showcase).getByText('Incubated')).toBeInTheDocument();
    // Signed-out visitors are offered registration, not the dashboard.
    expect(screen.getAllByRole('link', { name: /register your startup/i })[0]).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: /go to my dashboard/i })).not.toBeInTheDocument();
  });
});

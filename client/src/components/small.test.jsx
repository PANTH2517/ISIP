import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonLink from './PersonLink';
import MeetingLocation from './MeetingLocation';
import { CheckInHint, ExpiryHint } from './MeetingHints';
import { meetingTiming } from '../utils/meetingTiming';

describe('PersonLink', () => {
  it('links to the public profile when the person has an account', () => {
    render(<MemoryRouter><PersonLink id={5} name="Aarav Patel" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Aarav Patel' })).toHaveAttribute('href', '/people/5');
  });

  it('renders plain text for people without an account', () => {
    render(<MemoryRouter><PersonLink id={null} name="Ishaan Verma" /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Ishaan Verma')).toBeInTheDocument();
  });
});

describe('MeetingLocation', () => {
  it('turns a URL into a "Join meeting" link that opens in a new tab', () => {
    render(<MeetingLocation location="https://meet.google.com/abc-defg-hij" />);
    const link = screen.getByRole('link', { name: /Join meeting/ });
    expect(link).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a venue as text', () => {
    render(<MeetingLocation location="Innovation Lab, Desk 4" />);
    expect(screen.getByText('Innovation Lab, Desk 4')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing without a location', () => {
    const { container } = render(<MeetingLocation location={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('meeting hints', () => {
  const at = (h, m) => new Date(2026, 9, 10, h, m).getTime();
  const timing = (h, m) => meetingTiming('2026-10-10', '15:00', at(h, m));

  it('shows the auto-cancel deadline while check-in is open', () => {
    render(<CheckInHint checkedInAt={null} timing={timing(14, 50)} />);
    expect(screen.getByText(/auto-cancels at 3:10/i)).toBeInTheDocument();
  });

  it('shows when check-in opens later today', () => {
    render(<CheckInHint checkedInAt={null} timing={timing(10, 0)} />);
    expect(screen.getByText(/Check-in opens at 2:45/i)).toBeInTheDocument();
  });

  it('shows "in progress" once someone has checked in and the meeting has started', () => {
    render(<CheckInHint checkedInAt="2026-10-10T09:28:00Z" timing={timing(15, 2)} />);
    expect(screen.getByText(/meeting in progress/)).toBeInTheDocument();
  });

  it('shows the start time when someone checked in early', () => {
    render(<CheckInHint checkedInAt="2026-10-10T09:20:00Z" timing={timing(14, 55)} />);
    expect(screen.getByText(/Checked in · starts at 3:00/i)).toBeInTheDocument();
  });

  it('warns about expiry for requests due today only', () => {
    const { rerender, container } = render(<ExpiryHint timing={timing(12, 0)} />);
    expect(screen.getByText(/Expires at 3:10/i)).toBeInTheDocument();
    rerender(<ExpiryHint timing={meetingTiming('2026-10-20', '15:00', at(12, 0))} />);
    expect(container).toBeEmptyDOMElement();
  });
});

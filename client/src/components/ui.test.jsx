import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Modal, ProgressBar, StatusBadge, Stars, StatCard } from './ui';

describe('StatusBadge', () => {
  it.each([
    ['modification_requested', 'Changes requested'],
    ['incubated', 'Incubated'],
    ['assigned', 'Awaiting acceptance'],
    ['missed', 'Missed'],
    ['expired', 'Expired'],
    ['withdrawn', 'Withdrawn'],
  ])('shows a friendly label for %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the raw status for unknown values', () => {
    render(<StatusBadge status="mystery" />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('clamps the value between 0 and 100', () => {
    const { rerender } = render(<ProgressBar value={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    rerender(<ProgressBar value={-20} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    rerender(<ProgressBar value="abc" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('Stars', () => {
  it('reports the clicked rating', async () => {
    const onChange = vi.fn();
    render(<Stars value={2} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('4 stars'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('is a single read-only image without onChange', () => {
    render(<Stars value={3} />);
    expect(screen.getByRole('img', { name: '3 out of 5 stars' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Button', () => {
  it('does not submit a surrounding form unless type="submit" is given', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Button>Cancel</Button><Button type="submit">Save</Button></form>);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('is disabled while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} title="Hidden">Body</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and via the close button', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm">Body</Modal>);
    expect(screen.getByRole('dialog')).toHaveTextContent('Body');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('StatCard', () => {
  it('shows label, value and subtitle', () => {
    render(<StatCard label="Finance secured" value="₹12L" sub="₹2L funding · ₹10L investors" />);
    expect(screen.getByText('Finance secured')).toBeInTheDocument();
    expect(screen.getByText('₹12L')).toBeInTheDocument();
    expect(screen.getByText('₹2L funding · ₹10L investors')).toBeInTheDocument();
  });
});

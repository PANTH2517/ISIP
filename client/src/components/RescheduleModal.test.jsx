import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RescheduleModal from './RescheduleModal';
import { apiError } from '../test/apiMock';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function setup(props = {}) {
  const onSave = props.onSave || vi.fn().mockResolvedValue();
  render(<RescheduleModal current={{ date: '2026-10-15', time: '14:30' }} onClose={vi.fn()} {...props} onSave={onSave} />);
  const date = document.querySelector('input[type=date]');
  const time = document.querySelector('input[type=time]');
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save new time' }));
  return { onSave, date, time, save };
}

describe('RescheduleModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0)); // 10 Oct 2026, 12:00 local
  });
  afterEach(() => vi.useRealTimers());

  it('shows and pre-fills the current slot', () => {
    const { date, time } = setup();
    expect(screen.getByText(/Currently:/)).toHaveTextContent('15 Oct 2026');
    expect(date).toHaveValue('2026-10-15');
    expect(time).toHaveValue('14:30');
  });

  it('refuses an unchanged time without calling the server', () => {
    const { save, onSave } = setup();
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a different date or time');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a time that has already passed today', () => {
    const { date, time, save, onSave } = setup();
    fireEvent.change(date, { target: { value: iso(new Date()) } });
    fireEvent.change(time, { target: { value: '09:00' } });
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('already passed');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends a valid new slot with the note', async () => {
    const { date, time, save, onSave } = setup();
    fireEvent.change(date, { target: { value: '2026-10-18' } });
    fireEvent.change(time, { target: { value: '16:45' } });
    fireEvent.change(screen.getByPlaceholderText(/Clashes with exams/), { target: { value: 'After exams' } });
    save();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith({ date: '2026-10-18', time: '16:45', note: 'After exams' }));
  });

  it('stays open and shows the server message when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(apiError('Priya Sharma already has a meeting at that time'));
    const { date, time, save } = setup({ onSave });
    fireEvent.change(date, { target: { value: '2026-10-18' } });
    fireEvent.change(time, { target: { value: '10:00' } });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Priya Sharma already has a meeting');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens blank when the current slot is in the past', () => {
    render(<RescheduleModal current={{ date: '2026-09-01', time: '10:00' }} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(document.querySelector('input[type=date]')).toHaveValue('');
  });
});

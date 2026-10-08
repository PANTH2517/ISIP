import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api, { apiError } from '../test/apiMock';
import { useApi } from './useApi';

vi.mock('../api/client', () => import('../test/apiMock'));

describe('useApi', () => {
  it('loads data for a URL', async () => {
    api.get.mockResolvedValueOnce({ data: { id: 1, name: 'AgriSense' } });
    const { result } = renderHook(() => useApi('/startups/1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ id: 1, name: 'AgriSense' }));
    expect(api.get).toHaveBeenCalledWith('/startups/1');
  });

  it('does nothing without a URL', () => {
    const { result } = renderHook(() => useApi(null));
    expect(result.current.loading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  // Regression: navigating from a startup you can see to one you can't used to keep showing the old startup.
  it('never shows the previous URL\'s data after the URL changes', async () => {
    api.get.mockResolvedValueOnce({ data: { id: 1, name: 'AgriSense' } });
    const { result, rerender } = renderHook(({ url }) => useApi(url), { initialProps: { url: '/startups/1' } });
    await waitFor(() => expect(result.current.data?.name).toBe('AgriSense'));

    api.get.mockRejectedValueOnce(apiError('You do not have access to this startup', 403));
    rerender({ url: '/startups/4' });
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.error).toBe('You do not have access to this startup'));
    expect(result.current.data).toBeNull();
  });

  it('keeps the current data visible while reloading the same URL', async () => {
    api.get.mockResolvedValueOnce({ data: [1] });
    const { result } = renderHook(() => useApi('/meetings'));
    await waitFor(() => expect(result.current.data).toEqual([1]));
    let resolve;
    api.get.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    result.current.reload();
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.data).toEqual([1]);
    resolve({ data: [1, 2] });
    await waitFor(() => expect(result.current.data).toEqual([1, 2]));
  });
});

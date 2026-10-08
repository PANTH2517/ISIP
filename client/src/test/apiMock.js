import { vi } from 'vitest';

/**
 * Shared mock of src/api/client. Use in a test file with:
 *   vi.mock('../api/client', () => import('../test/apiMock'));
 * then configure api.get / api.post / api.patch per test.
 */
const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
export default api;
export const TOKEN_KEY = 'isip_token';
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const downloadFile = vi.fn();

/** Builds an axios-like rejection with a server message. */
export const apiError = (message, status = 400, extra = {}) => Object.assign(new Error(message), { response: { status, data: { message, ...extra } } });

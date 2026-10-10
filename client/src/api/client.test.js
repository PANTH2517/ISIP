import { describe, expect, it } from 'vitest';
import { apiBase } from './client';

describe('apiBase', () => {
  it.each([
    [undefined, '/api'],
    ['', '/api'],
    ['https://startin-api.onrender.com', 'https://startin-api.onrender.com/api'],
    ['https://startin-api.onrender.com/', 'https://startin-api.onrender.com/api'],
    ['https://startin-api.onrender.com/api', 'https://startin-api.onrender.com/api'],
    ['https://startin-api.onrender.com/api/', 'https://startin-api.onrender.com/api'],
  ])('%s → %s', (input, expected) => {
    expect(apiBase(input)).toBe(expected);
  });
});

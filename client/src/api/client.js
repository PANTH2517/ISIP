import axios from 'axios';

export const TOKEN_KEY = 'isip_token';

/** API base URL. VITE_API_URL may be given with or without the trailing "/api" (or slash). */
export function apiBase(url = import.meta.env.VITE_API_URL) {
  const base = String(url || '').trim().replace(/\/+$/, '');
  if (!base) return '/api';
  return base.endsWith('/api') ? base : `${base}/api`;
}

const api = axios.create({ baseURL: apiBase() });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/')) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        // Remember the page so logging in again returns there.
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?expired=1&next=${next}`;
      }
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

/** Downloads a protected file (sends the JWT) and saves it with the server-provided filename. */
export async function downloadFile(url, fallbackName = 'download') {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const match = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '');
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = match ? decodeURIComponent(match[1]) : fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (e) {
    if (e.response?.data instanceof Blob) {
      const text = await e.response.data.text();
      try { e.response.data = JSON.parse(text); } catch { /* not JSON */ }
    }
    throw e;
  }
}

export default api;

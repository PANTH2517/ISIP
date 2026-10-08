import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api/client';

/**
 * GETs `url` on mount / when it changes. Keeps previous data while reloading the *same* url so the UI
 * doesn't flash, but clears it when the url changes so a failed request never shows another record's data.
 */
export function useApi(url) {
  const [state, setState] = useState({ url, data: null, loading: !!url, error: null });

  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ url, data: s.url === url ? s.data : null, loading: true, error: null }));
    try {
      const res = await api.get(url);
      setState({ url, data: res.data, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ url, data: s.url === url ? s.data : null, loading: false, error: errMsg(e) }));
    }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  const stale = state.url !== url;
  return { data: stale ? null : state.data, loading: stale ? !!url : state.loading, error: stale ? null : state.error, reload: load };
}

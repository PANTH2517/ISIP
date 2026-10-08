import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return; // loading already starts false without a token
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, setUser, loading, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

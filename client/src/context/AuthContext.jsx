import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  const [expired, setExpired] = useState(false); // a stored login was rejected (session expired)
  const [unreachable, setUnreachable] = useState(false); // the API couldn't be reached; retrying

  const refresh = useCallback(async function attempt() {
    if (!localStorage.getItem(TOKEN_KEY)) return; // loading already starts false without a token
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      setUnreachable(false);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        // Only a rejected token ends the session.
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setExpired(true);
        setUnreachable(false);
        setLoading(false);
      } else {
        // Server asleep, restarting or offline: keep the login and try again shortly.
        setUnreachable(true);
        setTimeout(attempt, 4000);
      }
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setExpired(false);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, setUser, loading, expired, unreachable, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

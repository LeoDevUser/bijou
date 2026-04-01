import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { setToken } from '../api/tokenStore';

function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

interface AuthContextType {
  role: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; address: string; language: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.auth.refresh()
      .then(token => {
        setToken(token);
        setRole(decodeRole(token));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const token = await api.auth.login(email, password);
    setToken(token);
    setRole(decodeRole(token));
  }

  async function register(data: { firstName: string; lastName: string; email: string; password: string; address: string; language: string }) {
    const token = await api.auth.register(data);
    setToken(token);
    setRole(decodeRole(token));
  }

  function logout() {
    api.auth.logout().catch(() => {});
    setToken(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ role, isAuthenticated: !!role, isAdmin: role === 'ROLE_ADMIN', isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';

interface AuthContextType {
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; address: string; language: string }) => Promise<void>;
  logout: () => void;
}

function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(() => {
    const t = localStorage.getItem('token');
    return t ? decodeRole(t) : null;
  });

  async function login(email: string, password: string) {
    const t = await api.auth.login(email, password);
    localStorage.setItem('token', t);
    setToken(t);
    setRole(decodeRole(t));
  }

  async function register(data: { firstName: string; lastName: string; email: string; password: string; address: string; language: string }) {
    const t = await api.auth.register(data);
    localStorage.setItem('token', t);
    setToken(t);
    setRole(decodeRole(t));
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, isAuthenticated: !!token, isAdmin: role === 'ROLE_ADMIN', login, register, logout }}>
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

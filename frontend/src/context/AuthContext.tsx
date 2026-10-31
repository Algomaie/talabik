import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.me()
        .then((res) => {
          const u = res.data.data.user;
          setUser({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            avatarUrl: u.avatarUrl,
            roles: u.roles,
          });
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const d = data.data;
    localStorage.setItem('accessToken', d.accessToken);
    localStorage.setItem('refreshToken', d.refreshToken);
    setUser({
      id: d.user.id,
      email: d.user.email,
      firstName: d.user.firstName,
      lastName: d.user.lastName,
      phone: d.user.phone,
      avatarUrl: d.user.avatarUrl,
      roles: d.user.roles,
    });
  };

  const register = async (formData: Record<string, any>) => {
    const { data } = await authApi.register(formData);
    const d = data.data;
    localStorage.setItem('accessToken', d.accessToken);
    localStorage.setItem('refreshToken', d.refreshToken);
    setUser({
      id: d.user.id,
      email: d.user.email,
      firstName: d.user.firstName,
      lastName: d.user.lastName,
      phone: d.user.phone,
      avatarUrl: d.user.avatarUrl,
      roles: d.user.roles,
    });
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

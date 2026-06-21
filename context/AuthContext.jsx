'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthUser, login as doLogin, logout as doLogout, updateUser } from '@/lib/auth';
import { getStats, updateStats as persistStats } from '@/lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalGames: 0, totalWins: 0, xp: 0, level: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getAuthUser();
    if (u) setUser(u);
    setStats(getStats());
    setLoading(false);
  }, []);

  const login = useCallback((email, password, remember) => {
    const result = doLogin(email, password, remember);
    if (result.success) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  const addXP = useCallback((amount) => {
    const updated = persistStats({ xp: amount });
    setStats(updated);
    const updatedUser = updateUser({ xp: updated.xp, level: updated.level });
    if (updatedUser) setUser(updatedUser);
  }, []);

  const recordGame = useCallback((won) => {
    const updated = persistStats({ games: 1, wins: won ? 1 : 0, xp: won ? 30 : 10 });
    setStats(updated);
    const updatedUser = updateUser({ xp: updated.xp, level: updated.level });
    if (updatedUser) setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, stats, loading, login, logout, addXP, recordGame }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

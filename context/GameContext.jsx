'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getRecentlyPlayed, addRecentlyPlayed,
  getFavorites, toggleFavorite as persistToggle,
  getAchievements, unlockAchievement as persistUnlock,
} from '@/lib/storage';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setRecentlyPlayed(getRecentlyPlayed());
    setFavorites(getFavorites());
    setUnlockedAchievements(getAchievements());
  }, []);

  const trackPlay = useCallback((gameId) => {
    addRecentlyPlayed(gameId);
    setRecentlyPlayed(getRecentlyPlayed());
  }, []);

  const toggleFavorite = useCallback((gameId) => {
    const updated = persistToggle(gameId);
    setFavorites([...updated]);
  }, []);

  const unlockAchievement = useCallback((achievementId, achievementData) => {
    const isNew = persistUnlock(achievementId);
    if (isNew) {
      setUnlockedAchievements(getAchievements());
      setNotification({ id: achievementId, ...achievementData });
      setTimeout(() => setNotification(null), 4000);
    }
    return isNew;
  }, []);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  return (
    <GameContext.Provider value={{
      recentlyPlayed, favorites, unlockedAchievements,
      notification, trackPlay, toggleFavorite, isFavorite, unlockAchievement,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
};

'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getControls, saveControls } from '@/lib/storage';

export const DEFAULT_CONTROLS = {
  p1: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'Space',    action2: 'KeyF' },
  p2: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'Enter', action2: 'Slash' },
  p3: { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', action: 'KeyO',    action2: 'KeyP' },
};

const ControlsContext = createContext(null);

export function ControlsProvider({ children }) {
  const [controls, setControls] = useState(DEFAULT_CONTROLS);

  useEffect(() => {
    const saved = getControls();
    if (saved) setControls(saved);
  }, []);

  const updateControl = useCallback((player, action, key) => {
    setControls(prev => {
      const updated = { ...prev, [player]: { ...prev[player], [action]: key } };
      saveControls(updated);
      return updated;
    });
  }, []);

  const resetControls = useCallback(() => {
    setControls(DEFAULT_CONTROLS);
    saveControls(DEFAULT_CONTROLS);
  }, []);

  return (
    <ControlsContext.Provider value={{ controls, updateControl, resetControls }}>
      {children}
    </ControlsContext.Provider>
  );
}

export const useControls = () => {
  const ctx = useContext(ControlsContext);
  if (!ctx) throw new Error('useControls must be inside ControlsProvider');
  return ctx;
};

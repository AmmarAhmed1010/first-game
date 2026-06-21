'use client';
import { AuthProvider } from '@/context/AuthContext';
import { GameProvider } from '@/context/GameContext';
import { ControlsProvider } from '@/context/ControlsContext';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <GameProvider>
        <ControlsProvider>
          {children}
        </ControlsProvider>
      </GameProvider>
    </AuthProvider>
  );
}

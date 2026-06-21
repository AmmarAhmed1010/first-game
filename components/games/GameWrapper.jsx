'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';
import { ArrowLeft, Heart, Volume2, VolumeX, RotateCcw, Pause, Play } from 'lucide-react';

export default function GameWrapper({
  gameId, title, icon, children,
  score, lives, level, status,
  onPause, onResume, onRestart, isPaused,
  extraControls,
}) {
  const { trackPlay, toggleFavorite, isFavorite } = useGame();
  const { recordGame } = useAuth();
  const [sound, setSound] = useState(true);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (gameId) {
      trackPlay(gameId);
      setFav(isFavorite(gameId));
    }
  }, [gameId]);

  const handleFav = () => {
    toggleFavorite(gameId);
    setFav(f => !f);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5"
        style={{ background: 'rgba(10,10,10,0.98)' }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard"
            className="flex items-center gap-1.5 text-[#666] hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} /> Back
          </Link>
          <span className="text-[#333]">|</span>
          <span className="text-sm font-semibold flex items-center gap-2">
            <span>{icon}</span>{title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {extraControls}
          <button onClick={handleFav}
            className={`p-2 rounded-lg text-sm transition-all ${fav ? 'text-white' : 'text-[#444] hover:text-white'}`}>
            <Heart size={15} fill={fav ? 'white' : 'none'} />
          </button>
          <button onClick={() => setSound(s => !s)}
            className="p-2 rounded-lg text-[#444] hover:text-white transition-all">
            {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          {onRestart && (
            <button onClick={onRestart}
              className="p-2 rounded-lg text-[#444] hover:text-white transition-all">
              <RotateCcw size={15} />
            </button>
          )}
          {(onPause || onResume) && (
            <button onClick={isPaused ? onResume : onPause}
              className="p-2 rounded-lg text-[#444] hover:text-white transition-all">
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          )}
        </div>
      </header>

      {/* Stats bar */}
      {(score !== undefined || lives !== undefined || level !== undefined) && (
        <div className="flex items-center gap-6 px-6 py-2 border-b border-white/5 text-sm"
          style={{ background: 'rgba(15,15,15,0.9)' }}>
          {score !== undefined && (
            <span className="text-[#888]">Score: <span className="text-white font-mono font-bold">{score}</span></span>
          )}
          {lives !== undefined && (
            <span className="text-[#888]">Lives: <span className="text-white font-mono font-bold">{lives}</span></span>
          )}
          {level !== undefined && (
            <span className="text-[#888]">Level: <span className="text-white font-mono font-bold">{level}</span></span>
          )}
          {status && (
            <span className={`ml-auto text-xs uppercase tracking-wider font-bold ${
              status === 'playing' ? 'text-green-400' :
              status === 'paused'  ? 'text-yellow-400' :
              status === 'gameover'? 'text-red-400' : 'text-[#888]'
            }`}>{status}</span>
          )}
        </div>
      )}

      {/* Game content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}

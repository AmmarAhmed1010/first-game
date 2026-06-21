'use client';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { ACHIEVEMENTS, getTodayChallenge } from '@/lib/achievements';
import { GAMES } from '@/lib/gameData';
import { Lock } from 'lucide-react';

export default function AchievementsPage() {
  const { unlockedAchievements } = useGame();
  const { stats } = useAuth();
  const daily = getTodayChallenge();
  const dailyGame = GAMES.find(g => g.id === daily.game);
  const unlocked = unlockedAchievements.length;
  const total    = ACHIEVEMENTS.length;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <main className="ml-56 flex-1 px-8 py-8 max-w-4xl">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Achievements</h1>
              <p className="text-sm text-[#555] mt-1">{unlocked} / {total} unlocked</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#444] uppercase tracking-wider">Progress</p>
              <p className="text-2xl font-bold font-mono">{Math.round(unlocked/total*100)}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-[#111] rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${(unlocked/total)*100}%` }} />
          </div>

          {/* Daily challenge */}
          <div className="glass rounded-2xl p-5 mb-8 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div className="flex-1">
                <p className="text-xs text-[#555] uppercase tracking-wider mb-0.5">Daily Challenge</p>
                <p className="text-sm font-semibold text-white">{daily.desc}</p>
                {dailyGame && <p className="text-xs text-[#444] mt-0.5">{dailyGame.icon} {dailyGame.title}</p>}
              </div>
              <a href={`/games/${daily.game}`}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all">
                Play
              </a>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map(a => {
              const done = unlockedAchievements.includes(a.id);
              return (
                <div key={a.id}
                  className={`rounded-xl p-4 border transition-all ${
                    done
                      ? 'bg-white/[0.06] border-white/15'
                      : 'bg-white/[0.02] border-white/5 opacity-50'
                  }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{done ? a.icon : '🔒'}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? 'text-white' : 'text-[#555]'}`}>{a.title}</p>
                      <p className="text-xs text-[#444] mt-0.5">{a.desc}</p>
                      {a.xp > 0 && (
                        <p className="text-[10px] text-[#555] mt-1">+{a.xp} XP</p>
                      )}
                    </div>
                    {done && (
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

'use client';
import { useState } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { GAMES } from '@/lib/gameData';
import { getScores } from '@/lib/storage';
import { Trophy, Medal } from 'lucide-react';

export default function LeaderboardPage() {
  const [activeGame, setActiveGame] = useState(GAMES[0].id);
  const scores = getScores(activeGame);
  const game   = GAMES.find(g => g.id === activeGame);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <main className="ml-56 flex-1 px-8 py-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy size={20} /> Leaderboard
            </h1>

            {/* Game selector */}
            <div className="flex gap-2 flex-wrap mb-8">
              {GAMES.map(g => (
                <button key={g.id} onClick={() => setActiveGame(g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeGame === g.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-[#666] hover:bg-white/10 border border-white/5'
                  }`}>
                  <span>{g.icon}</span>{g.title}
                </button>
              ))}
            </div>

            {/* Scores */}
            <div className="glass rounded-2xl overflow-hidden border border-white/8">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <span className="text-2xl">{game?.icon}</span>
                <div>
                  <h2 className="font-semibold">{game?.title}</h2>
                  <p className="text-xs text-[#555]">Top {scores.length} scores</p>
                </div>
              </div>

              {scores.length === 0 ? (
                <div className="py-16 text-center text-[#333]">
                  <Trophy size={28} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No scores yet. Be the first!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {scores.map((s, i) => (
                    <div key={i} className={`flex items-center gap-4 px-5 py-3 ${i < 3 ? 'bg-white/[0.02]' : ''}`}>
                      <span className="w-8 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-[#444] text-sm font-mono">{i+1}</span>}
                      </span>
                      <span className="flex-1 text-sm font-medium">{s.name || 'Player'}</span>
                      <span className="font-mono font-bold text-white">{s.score.toLocaleString()}</span>
                      <span className="text-xs text-[#444]">
                        {new Date(s.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

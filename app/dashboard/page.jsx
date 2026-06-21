'use client';
import { useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import { GAMES, CATEGORIES, getByCategory, getFeatured } from '@/lib/gameData';
import { Search, Star, Clock, Zap, Trophy, Gamepad2, Heart } from 'lucide-react';

function GameCard({ game, small }) {
  const { toggleFavorite, isFavorite } = useGame();
  const fav = isFavorite(game.id);
  return (
    <Link href={`/games/${game.id}`}
      className={`group relative rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 overflow-hidden flex flex-col ${small ? 'p-3' : 'p-4'}`}>
      <div className={`${small ? 'text-3xl mb-2' : 'text-5xl mb-3'} leading-none`}>{game.icon}</div>
      <div className="flex-1">
        <h3 className={`font-semibold text-white ${small ? 'text-sm' : 'text-base'}`}>{game.title}</h3>
        {!small && <p className="text-xs text-[#555] mt-1 line-clamp-2">{game.description}</p>}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-[#444] uppercase tracking-wider">{game.category}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
          game.difficulty === 'Easy'   ? 'border-green-900 text-green-600' :
          game.difficulty === 'Medium' ? 'border-yellow-900 text-yellow-600' :
                                          'border-red-900 text-red-600'
        }`}>{game.difficulty}</span>
      </div>
      <button
        onClick={e => { e.preventDefault(); toggleFavorite(game.id); }}
        className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all ${fav ? 'opacity-100 text-white' : 'text-[#444]'}`}>
        <Heart size={12} fill={fav ? 'white' : 'none'} />
      </button>
    </Link>
  );
}

export default function Dashboard() {
  const { user, stats } = useAuth();
  const { recentlyPlayed, notification } = useGame();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');

  const recentGames = recentlyPlayed.slice(0, 4).map(id => GAMES.find(g => g.id === id)).filter(Boolean);
  const featured    = getFeatured().slice(0, 4);

  const filtered = getByCategory(category).filter(g =>
    !search || g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-black">
        <Sidebar />

        {/* Achievement toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 glass rounded-xl px-4 py-3 flex items-center gap-3 animate-slideInRight"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            <span className="text-2xl">{notification.icon}</span>
            <div>
              <p className="text-xs font-bold text-white">Achievement Unlocked!</p>
              <p className="text-xs text-[#888]">{notification.title}</p>
            </div>
          </div>
        )}

        <main className="ml-56 flex-1 min-h-screen overflow-y-auto">
          {/* Hero */}
          <div className="relative px-8 pt-8 pb-6 border-b border-white/5"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }}>
            <div className="max-w-5xl mx-auto">
              <p className="text-[#555] text-sm mb-1">Welcome back,</p>
              <h1 className="text-3xl font-bold text-white mb-1">{user?.name ?? 'GameMaster'}</h1>
              <p className="text-[#444] text-sm">Level {stats.level} · {stats.xp} XP · {stats.totalGames} games played · {stats.totalWins} wins</p>

              {/* Quick stats */}
              <div className="flex gap-4 mt-5">
                {[
                  { icon: <Gamepad2 size={14}/>, label: 'Games Played', val: stats.totalGames },
                  { icon: <Trophy    size={14}/>, label: 'Total Wins',   val: stats.totalWins  },
                  { icon: <Zap       size={14}/>, label: 'Total XP',     val: stats.xp         },
                  { icon: <Star      size={14}/>, label: 'Level',        val: stats.level      },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="glass rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-[#555]">{icon}</span>
                    <div>
                      <p className="text-[10px] text-[#444] uppercase tracking-wider">{label}</p>
                      <p className="text-lg font-bold text-white font-mono">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-8 py-6 space-y-8">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search games…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-[#333] outline-none focus:border-white/20 transition-all"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      category === c
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-[#666] hover:bg-white/10 hover:text-white border border-white/5'
                    }`}>{c}</button>
                ))}
              </div>
            </div>

            {/* Recently Played */}
            {recentGames.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} className="text-[#555]" />
                  <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Recently Played</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {recentGames.map(g => <GameCard key={g.id} game={g} small />)}
                </div>
              </section>
            )}

            {/* Featured */}
            {!search && category === 'All' && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star size={14} className="text-[#555]" />
                  <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Featured</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {featured.map(g => <GameCard key={g.id} game={g} />)}
                </div>
              </section>
            )}

            {/* All / Filtered */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
                  {search ? `Results for "${search}"` : category === 'All' ? 'All Games' : category}
                </h2>
                <span className="text-xs text-[#444]">{filtered.length} games</span>
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-[#333]">
                  <Gamepad2 size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No games found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map(g => <GameCard key={g.id} game={g} />)}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

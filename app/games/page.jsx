'use client';
import Link from 'next/link';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { useGame } from '@/context/GameContext';
import { GAMES } from '@/lib/gameData';
import { Heart } from 'lucide-react';

export default function GamesPage() {
  const { toggleFavorite, isFavorite } = useGame();
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <main className="ml-56 flex-1 px-8 py-8">
          <h1 className="text-2xl font-bold mb-6">All Games</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {GAMES.map(g => (
              <Link key={g.id} href={`/games/${g.id}`}
                className="group relative rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-all p-4 flex flex-col">
                <div className="text-5xl mb-3">{g.icon}</div>
                <h3 className="font-semibold text-white">{g.title}</h3>
                <p className="text-xs text-[#555] mt-1 line-clamp-2 flex-1">{g.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-[#444] uppercase tracking-wider">{g.category}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    g.difficulty === 'Easy' ? 'border-green-900 text-green-600' :
                    g.difficulty === 'Medium' ? 'border-yellow-900 text-yellow-600' : 'border-red-900 text-red-600'
                  }`}>{g.difficulty}</span>
                </div>
                <button onClick={e => { e.preventDefault(); toggleFavorite(g.id); }}
                  className={`absolute top-3 right-3 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 ${isFavorite(g.id) ? 'opacity-100 text-white' : 'text-[#444]'}`}>
                  <Heart size={12} fill={isFavorite(g.id) ? 'white' : 'none'} />
                </button>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

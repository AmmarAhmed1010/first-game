'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useGame } from '@/context/GameContext';
import { GAMES } from '@/lib/gameData';
import {
  LayoutDashboard, Gamepad2, Trophy, BarChart2,
  Settings, Star, LogOut, Zap, ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/games',        icon: Gamepad2,        label: 'All Games'  },
  { href: '/leaderboard',  icon: Trophy,          label: 'Leaderboard'},
  { href: '/achievements', icon: Star,            label: 'Achievements'},
  { href: '/settings',     icon: Settings,        label: 'Settings'   },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const { user, stats, logout } = useAuth();
  const { recentlyPlayed } = useGame();

  const recentGames = recentlyPlayed
    .slice(0, 4)
    .map(id => GAMES.find(g => g.id === id))
    .filter(Boolean);

  const xpToNext = 100 * Math.pow(stats.level, 2);
  const xpPct    = Math.min(100, ((stats.xp % xpToNext) / xpToNext) * 100);

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{ background: 'rgba(10,10,10,0.98)', borderRight: '1px solid #1a1a1a' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <Gamepad2 size={16} className="text-black" />
          </div>
          <span className="font-bold text-white tracking-tight">GamePortal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/') && href !== '/dashboard';
          const isActive = pathname === href || (href === '/games' && pathname.startsWith('/games'));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={16} />
              {label}
              {isActive && <ChevronRight size={12} className="ml-auto" />}
            </Link>
          );
        })}

        {/* Recent */}
        {recentGames.length > 0 && (
          <div className="pt-4">
            <p className="px-3 text-[10px] uppercase tracking-widest text-[#444] mb-2">Recent</p>
            {recentGames.map(g => (
              <Link key={g.id} href={`/games/${g.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[#666] hover:text-white hover:bg-white/5 transition-all">
                <span className="text-base">{g.icon}</span>
                {g.title}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        {/* XP bar */}
        <div className="px-2 mb-3">
          <div className="flex justify-between text-[10px] text-[#555] mb-1">
            <span className="flex items-center gap-1"><Zap size={10} />Lvl {stats.level}</span>
            <span>{stats.xp} XP</span>
          </div>
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold">
            {user?.name?.[0] ?? 'G'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name ?? 'Guest'}</p>
            <p className="text-[10px] text-[#555] truncate">{user?.email}</p>
          </div>
          <button onClick={logout}
            className="p-1.5 rounded-md text-[#444] hover:text-white hover:bg-white/5 transition-all">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

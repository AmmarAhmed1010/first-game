'use client';
import { useState } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { useControls, DEFAULT_CONTROLS } from '@/context/ControlsContext';
import { Keyboard, RotateCcw, Check } from 'lucide-react';

const ACTIONS = [
  { key: 'up',      label: 'Move Up'   },
  { key: 'down',    label: 'Move Down' },
  { key: 'left',    label: 'Move Left' },
  { key: 'right',   label: 'Move Right'},
  { key: 'action',  label: 'Action 1'  },
  { key: 'action2', label: 'Action 2'  },
];
const PLAYERS = ['p1', 'p2', 'p3'];
const PLAYER_LABELS = { p1: 'Player 1', p2: 'Player 2', p3: 'Player 3' };

function formatKey(code) {
  if (!code) return '—';
  return code
    .replace('Key', '').replace('Arrow', '↑↓←→'.includes(code) ? '' : 'Arrow ')
    .replace('ArrowUp','↑').replace('ArrowDown','↓')
    .replace('ArrowLeft','←').replace('ArrowRight','→')
    .replace('Space','SPACE').replace('Enter','ENTER')
    .replace('Slash','/').replace('Shift','SHIFT');
}

export default function SettingsPage() {
  const { controls, updateControl, resetControls } = useControls();
  const [listening, setListening] = useState(null); // { player, action }
  const [saved, setSaved] = useState(false);

  const startListen = (player, action) => {
    setListening({ player, action });
    const onKey = (e) => {
      e.preventDefault();
      if (e.code === 'Escape') { setListening(null); return; }
      updateControl(player, action, e.code);
      setListening(null);
      window.removeEventListener('keydown', onKey);
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    };
    window.addEventListener('keydown', onKey);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <main className="ml-56 flex-1 px-8 py-8">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Keyboard size={20}/> Controls</h1>
                <p className="text-sm text-[#555] mt-1">Customize key bindings for each player. Click a key to rebind.</p>
              </div>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-green-500">
                    <Check size={12}/> Saved
                  </span>
                )}
                <button onClick={() => { resetControls(); setSaved(true); setTimeout(()=>setSaved(false),1500); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-xs text-[#888] hover:text-white hover:bg-white/10 transition-all">
                  <RotateCcw size={12}/> Reset Defaults
                </button>
              </div>
            </div>

            {listening && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="glass rounded-2xl p-8 text-center border border-white/15">
                  <Keyboard size={32} className="mx-auto mb-4 text-[#888]" />
                  <p className="text-white font-semibold mb-2">Press any key to bind</p>
                  <p className="text-sm text-[#555]">
                    {PLAYER_LABELS[listening.player]} — {ACTIONS.find(a=>a.key===listening.action)?.label}
                  </p>
                  <p className="text-xs text-[#333] mt-3">ESC to cancel</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {PLAYERS.map(p => (
                <div key={p} className="glass rounded-2xl border border-white/8 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <h2 className="font-semibold">{PLAYER_LABELS[p]}</h2>
                    <p className="text-xs text-[#444] mt-0.5">
                      {p === 'p1' && 'Default: WASD + Space'}
                      {p === 'p2' && 'Default: Arrow Keys + Enter'}
                      {p === 'p3' && 'Default: IJKL + O'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/5">
                    {ACTIONS.map(({ key, label }) => {
                      const isListening = listening?.player === p && listening?.action === key;
                      const current = controls[p]?.[key];
                      return (
                        <button key={key}
                          onClick={() => startListen(p, key)}
                          className={`flex flex-col items-start gap-1 px-4 py-3 bg-[#0a0a0a] hover:bg-white/5 transition-all text-left ${
                            isListening ? 'bg-white/10' : ''
                          }`}>
                          <span className="text-[10px] text-[#444] uppercase tracking-wider">{label}</span>
                          <span className={`text-sm font-mono font-bold ${isListening ? 'text-white animate-blink' : 'text-white'}`}>
                            {isListening ? '▮' : formatKey(current)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

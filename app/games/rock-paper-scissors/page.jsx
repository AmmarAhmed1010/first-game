'use client';
import { useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';

const CHOICES = [
  { id: 'rock',     emoji: '✊', label: 'Rock',     beats: 'scissors' },
  { id: 'paper',    emoji: '✋', label: 'Paper',    beats: 'rock'     },
  { id: 'scissors', emoji: '✌️', label: 'Scissors', beats: 'paper'    },
];
const ROUNDS = 5;

function getResult(p1, p2) {
  if (p1 === p2) return 'draw';
  const c = CHOICES.find(c => c.id === p1);
  return c.beats === p2 ? 'win' : 'lose';
}

export default function RPSPage() {
  const { recordGame } = useAuth();
  const [mode, setMode]           = useState(null);
  const [p1Choice, setP1Choice]   = useState(null);
  const [p2Choice, setP2Choice]   = useState(null);
  const [roundResult, setRound]   = useState(null);
  const [scores, setScores]       = useState({ p1: 0, p2: 0 });
  const [round, setRound2]        = useState(1);
  const [gameOver, setGameOver]   = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [history, setHistory]     = useState([]);

  const reset = () => {
    setP1Choice(null); setP2Choice(null);
    setRound(null); setScores({ p1: 0, p2: 0 });
    setRound2(1); setGameOver(false); setRevealing(false); setHistory([]);
  };

  const reveal = useCallback((p1, p2) => {
    setP1Choice(p1); setP2Choice(p2);
    setRevealing(true);
    setTimeout(() => {
      const res = getResult(p1, p2);
      const newScores = {
        p1: scores.p1 + (res === 'win' ? 1 : 0),
        p2: scores.p2 + (res === 'lose' ? 1 : 0),
      };
      setScores(newScores);
      setRound(res);
      setHistory(h => [...h, { p1, p2, res }]);
      const needed = Math.ceil(ROUNDS / 2);
      if (newScores.p1 >= needed || newScores.p2 >= needed || round >= ROUNDS) {
        setGameOver(true);
        const won = newScores.p1 > newScores.p2;
        recordGame(won);
        saveScore('rock-paper-scissors', { name: 'Player', score: newScores.p1 });
      } else {
        setRound2(r => r + 1);
        setTimeout(() => { setP1Choice(null); setP2Choice(null); setRound(null); setRevealing(false); }, 1200);
      }
    }, 600);
  }, [scores, round, recordGame]);

  const p1Pick = useCallback((choice) => {
    if (revealing || gameOver) return;
    if (mode === '1p') {
      const ai = CHOICES[Math.floor(Math.random() * 3)].id;
      reveal(choice, ai);
    } else {
      setP1Choice(choice);
    }
  }, [mode, revealing, gameOver, reveal]);

  const p2Pick = useCallback((choice) => {
    if (!p1Choice || revealing || gameOver || mode !== '2p') return;
    reveal(p1Choice, choice);
  }, [p1Choice, revealing, gameOver, mode, reveal]);

  const winner = gameOver
    ? scores.p1 > scores.p2 ? 'P1' : scores.p2 > scores.p1 ? (mode === '1p' ? 'AI' : 'P2') : 'Draw'
    : null;

  if (!mode) return (
    <ProtectedRoute>
      <GameWrapper gameId="rock-paper-scissors" title="RPS Arena" icon="✊">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-center">
            <div className="text-5xl mb-3">✊✋✌️</div>
            <h2 className="text-2xl font-bold">RPS Arena</h2>
            <p className="text-[#555] text-sm mt-1">Best of {ROUNDS} rounds</p>
          </div>
          {[{ id:'1p', label:'vs AI', desc:'Challenge the computer' }, { id:'2p', label:'2 Players', desc:'Local multiplayer' }].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="w-full glass rounded-xl px-5 py-4 text-left border border-white/8 hover:border-white/20 transition-all">
              <div className="font-semibold">{m.label}</div>
              <div className="text-xs text-[#555]">{m.desc}</div>
            </button>
          ))}
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <GameWrapper gameId="rock-paper-scissors" title="RPS Arena" icon="✊" onRestart={reset}
        extraControls={
          <button onClick={() => { setMode(null); reset(); }}
            className="px-3 py-1.5 rounded-lg text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">Menu</button>
        }>
        <div className="flex flex-col items-center gap-5 w-full max-w-lg">
          {/* Scores */}
          <div className="flex gap-16 text-center">
            <div><p className="text-xs text-[#444] uppercase tracking-wider mb-1">Player 1</p>
              <p className="text-4xl font-bold font-mono">{scores.p1}</p></div>
            <div><p className="text-xs text-[#444] uppercase tracking-wider mb-1">Round {round} / {ROUNDS}</p>
              <p className="text-2xl font-bold font-mono text-[#555]">vs</p></div>
            <div><p className="text-xs text-[#444] uppercase tracking-wider mb-1">{mode==='1p'?'AI':'Player 2'}</p>
              <p className="text-4xl font-bold font-mono">{scores.p2}</p></div>
          </div>

          {/* Battle arena */}
          <div className="flex items-center gap-8 my-2">
            <div className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center text-6xl transition-all duration-300 ${
              p1Choice ? 'border-white/30 bg-white/10 scale-110' : 'border-white/8 bg-white/5'
            }`}>
              {p1Choice ? CHOICES.find(c=>c.id===p1Choice)?.emoji : '❓'}
            </div>
            <div className="text-center">
              {roundResult && (
                <p className={`text-lg font-bold animate-popIn ${
                  roundResult==='win' ? 'text-green-400' : roundResult==='lose' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {roundResult==='win' ? 'P1 Wins!' : roundResult==='lose' ? (mode==='1p'?'AI Wins!':'P2 Wins!') : 'Draw!'}
                </p>
              )}
              {!roundResult && <p className="text-[#333] text-sm">VS</p>}
            </div>
            <div className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center text-6xl transition-all duration-300 ${
              p2Choice ? 'border-white/30 bg-white/10 scale-110' : 'border-white/8 bg-white/5'
            }`}>
              {p2Choice ? CHOICES.find(c=>c.id===p2Choice)?.emoji : '❓'}
            </div>
          </div>

          {/* P1 choices */}
          {!gameOver && (
            <div>
              <p className="text-xs text-[#444] text-center mb-3 uppercase tracking-wider">
                {!p1Choice ? 'Player 1 — Choose' : mode==='2p' && !p2Choice ? 'Player 2 — Choose' : ''}
              </p>
              <div className="flex gap-3">
                {CHOICES.map(c => {
                  const p1Done = !!p1Choice;
                  const isPickPhase = mode === '2p' && p1Done && !p2Choice;
                  const disabled = revealing || (mode==='1p' && p1Done) || (mode==='2p' && p1Done && !isPickPhase);
                  return (
                    <button key={c.id}
                      onClick={() => isPickPhase ? p2Pick(c.id) : p1Pick(c.id)}
                      disabled={disabled}
                      className={`w-24 h-24 rounded-2xl border-2 text-4xl flex flex-col items-center justify-center gap-1 transition-all ${
                        disabled ? 'opacity-30 cursor-not-allowed border-white/5' : 'border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25 active:scale-95 cursor-pointer'
                      }`}>
                      {c.emoji}
                      <span className="text-[10px] text-[#666]">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Game over */}
          {gameOver && (
            <div className="text-center animate-popIn">
              <p className="text-3xl font-bold mb-1">{winner === 'Draw' ? '🤝 Draw!' : `🏆 ${winner} Wins!`}</p>
              <p className="text-sm text-[#555] mb-4">Final: {scores.p1} — {scores.p2}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-95">Play Again</button>
                <button onClick={() => { setMode(null); reset(); }} className="px-6 py-2.5 rounded-xl glass border border-white/10 text-sm hover:bg-white/5 transition-all">Menu</button>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="flex gap-2 mt-1">
              {history.map((h,i) => (
                <div key={i} className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  h.res==='win' ? 'bg-white text-black' : h.res==='lose' ? 'bg-white/10 text-[#888]' : 'bg-white/5 text-[#444]'
                }`}>{h.res==='win'?'W':h.res==='lose'?'L':'D'}</div>
              ))}
            </div>
          )}
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

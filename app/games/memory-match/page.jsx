'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';

const EMOJIS = ['🎮','🏆','⭐','🎯','🚀','💎','🔥','🎪','🌟','🎲','🎸','🎭'];

function makeCards(pairs = 8) {
  const pool = EMOJIS.slice(0, pairs);
  const deck = [...pool, ...pool].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatchPage() {
  const { recordGame } = useAuth();
  const [cards, setCards]           = useState([]);
  const [flipped, setFlipped]       = useState([]);
  const [matched, setMatched]       = useState(0);
  const [moves, setMoves]           = useState(0);
  const [time, setTime]             = useState(0);
  const [running, setRunning]       = useState(false);
  const [won, setWon]               = useState(false);
  const [lock, setLock]             = useState(false);
  const [pairs, setPairs]           = useState(8);
  const [started, setStarted]       = useState(false);
  const [bestScore, setBestScore]   = useState(null);

  const startGame = useCallback((p = pairs) => {
    setCards(makeCards(p));
    setFlipped([]);
    setMatched(0);
    setMoves(0);
    setTime(0);
    setWon(false);
    setLock(false);
    setRunning(true);
    setStarted(true);
  }, [pairs]);

  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const handleFlip = useCallback((idx) => {
    if (lock || won || !running) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    const newFlipped = [...flipped, idx];
    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    setCards(newCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLock(true);
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          ));
          const newMatched = matched + 1;
          setMatched(newMatched);
          setFlipped([]);
          setLock(false);
          if (newMatched === pairs) {
            setWon(true);
            setRunning(false);
            recordGame(true);
            const score = Math.max(0, 1000 - moves * 10 - time * 5);
            saveScore('memory-match', { name: 'Player', score });
          }
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
          setLock(false);
        }, 900);
      }
    }
  }, [cards, flipped, lock, won, running, matched, pairs, moves, time, recordGame]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  if (!started) return (
    <ProtectedRoute>
      <GameWrapper gameId="memory-match" title="Memory Match" icon="🃏">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-center">
            <div className="text-5xl mb-3">🃏</div>
            <h2 className="text-2xl font-bold">Memory Match</h2>
            <p className="text-[#555] text-sm mt-1">Flip cards and find matching pairs</p>
          </div>
          <div className="w-full">
            <p className="text-xs text-[#444] uppercase tracking-widest mb-3 text-center">Number of Pairs</p>
            <div className="grid grid-cols-3 gap-2">
              {[6,8,12].map(p => (
                <button key={p} onClick={() => setPairs(p)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${pairs===p ? 'bg-white text-black' : 'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                  {p} pairs
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => startGame(pairs)}
            className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all active:scale-95">
            Start Game
          </button>
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );

  const cols = pairs <= 6 ? 4 : pairs <= 8 ? 4 : 6;

  return (
    <ProtectedRoute>
      <GameWrapper gameId="memory-match" title="Memory Match" icon="🃏"
        score={moves} status={won ? 'won' : running ? 'playing' : 'idle'}
        onRestart={() => startGame(pairs)}
        extraControls={
          <button onClick={() => setStarted(false)}
            className="px-3 py-1.5 rounded-lg text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">Menu</button>
        }>
        <div className="flex flex-col items-center gap-4">
          {/* Stats */}
          <div className="flex gap-6 text-center">
            <div><p className="text-[10px] text-[#444] uppercase tracking-wider">Time</p>
              <p className="text-xl font-mono font-bold">{fmt(time)}</p></div>
            <div><p className="text-[10px] text-[#444] uppercase tracking-wider">Moves</p>
              <p className="text-xl font-mono font-bold">{moves}</p></div>
            <div><p className="text-[10px] text-[#444] uppercase tracking-wider">Matched</p>
              <p className="text-xl font-mono font-bold">{matched}/{pairs}</p></div>
          </div>

          {won && (
            <div className="text-center animate-popIn">
              <p className="text-xl font-bold text-white mb-1">🎉 Complete!</p>
              <p className="text-sm text-[#888]">{moves} moves in {fmt(time)}</p>
            </div>
          )}

          {/* Cards grid */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {cards.map((card, i) => (
              <button key={card.id} onClick={() => handleFlip(i)}
                className={`w-14 h-14 rounded-xl text-2xl flex items-center justify-center transition-all duration-300 border font-bold ${
                  card.matched
                    ? 'bg-white/10 border-white/20 scale-95'
                    : card.flipped
                      ? 'bg-white border-white text-black scale-105'
                      : 'bg-white/[0.04] border-white/8 hover:bg-white/[0.08] hover:border-white/15 cursor-pointer'
                }`}>
                {(card.flipped || card.matched) ? card.emoji : ''}
              </button>
            ))}
          </div>

          {won && (
            <div className="flex gap-3">
              <button onClick={() => startGame(pairs)}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-95">Play Again</button>
              <button onClick={() => setStarted(false)}
                className="px-6 py-2.5 rounded-xl glass border border-white/10 text-sm hover:bg-white/5 transition-all">Menu</button>
            </div>
          )}
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

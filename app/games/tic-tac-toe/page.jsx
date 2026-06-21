'use client';
import { useState, useCallback, useEffect } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
}

function minimax(board, isMax, depth, alpha, beta) {
  const res = checkWinner(board);
  if (res) {
    if (res.winner === 'O') return 10 - depth;
    if (res.winner === 'X') return depth - 10;
    return 0;
  }
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false, depth + 1, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true, depth + 1, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getAIMove(board, difficulty) {
  const empty = board.map((v,i) => v ? null : i).filter(i => i !== null);
  if (!empty.length) return -1;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === 'medium' && Math.random() < 0.4)
    return empty[Math.floor(Math.random() * empty.length)];
  let best = -Infinity, move = empty[0];
  for (const i of empty) {
    board[i] = 'O';
    const score = minimax(board, false, 0, -Infinity, Infinity);
    board[i] = null;
    if (score > best) { best = score; move = i; }
  }
  return move;
}

const MODES = [
  { id: '1p', label: '1 Player', desc: 'vs AI' },
  { id: '2p', label: '2 Players', desc: 'Local' },
];
const DIFFICULTIES = ['easy','medium','hard'];

export default function TicTacToePage() {
  const { recordGame } = useAuth();
  const [board, setBoard]           = useState(Array(9).fill(null));
  const [currentPlayer, setCurrent] = useState('X');
  const [result, setResult]         = useState(null);
  const [mode, setMode]             = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [scores, setScores]         = useState({ X: 0, O: 0, draw: 0 });
  const [aiThinking, setAiThinking] = useState(false);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrent('X');
    setResult(null);
    setAiThinking(false);
  }, []);

  const handleClick = useCallback((idx) => {
    if (!mode || result || board[idx] || aiThinking) return;
    if (mode === '1p' && currentPlayer === 'O') return;
    const next = [...board];
    next[idx] = currentPlayer;
    const res = checkWinner(next);
    setBoard(next);
    if (res) {
      setResult(res);
      setScores(s => ({ ...s, [res.winner]: (s[res.winner] || 0) + 1 }));
      recordGame(res.winner === 'X');
      saveScore('tic-tac-toe', { name: 'Player', score: res.winner === 'X' ? 1 : 0 });
    } else {
      setCurrent(p => p === 'X' ? 'O' : 'X');
    }
  }, [board, currentPlayer, mode, result, aiThinking, recordGame]);

  useEffect(() => {
    if (mode !== '1p' || currentPlayer !== 'O' || result || aiThinking) return;
    setAiThinking(true);
    const t = setTimeout(() => {
      const boardCopy = [...board];
      const move = getAIMove(boardCopy, difficulty);
      if (move >= 0) {
        const next = [...board];
        next[move] = 'O';
        const res = checkWinner(next);
        setBoard(next);
        if (res) {
          setResult(res);
          setScores(s => ({ ...s, [res.winner]: (s[res.winner]||0)+1 }));
          recordGame(false);
        } else {
          setCurrent('X');
        }
      }
      setAiThinking(false);
    }, 450);
    return () => clearTimeout(t);
  }, [mode, currentPlayer, board, result, difficulty, aiThinking, recordGame]);

  const winLine = result?.line ?? [];

  if (!mode) {
    return (
      <ProtectedRoute>
        <GameWrapper gameId="tic-tac-toe" title="Tic Tac Toe" icon="⭕">
          <div className="flex flex-col items-center gap-8 max-w-sm w-full">
            <div className="text-center">
              <div className="text-6xl mb-3">⭕</div>
              <h2 className="text-2xl font-bold">Tic Tac Toe</h2>
              <p className="text-[#555] text-sm mt-1">Classic 3×3 strategy game</p>
            </div>
            <div className="w-full space-y-3">
              <p className="text-xs text-[#444] uppercase tracking-widest text-center">Select Mode</p>
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="w-full glass rounded-xl px-5 py-4 text-left border border-white/8 hover:border-white/20 hover:bg-white/[0.07] transition-all group">
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-[#555]">{m.desc}</div>
                </button>
              ))}
            </div>
            {mode === '1p' && (
              <div className="w-full">
                <p className="text-xs text-[#444] uppercase tracking-widest text-center mb-3">Difficulty</p>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${difficulty===d ? 'bg-white text-black' : 'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GameWrapper>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <GameWrapper
        gameId="tic-tac-toe" title="Tic Tac Toe" icon="⭕"
        onRestart={reset}
        extraControls={
          <button onClick={() => { setMode(null); reset(); }}
            className="px-3 py-1.5 rounded-lg text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">
            Menu
          </button>
        }>
        <div className="flex flex-col items-center gap-6">
          {/* Scoreboard */}
          <div className="flex gap-8 text-center">
            {[['X','Player 1'],['draw','Draw'],['O', mode==='1p'?'AI':'Player 2']].map(([k,label]) => (
              <div key={k}>
                <p className="text-xs text-[#444] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-3xl font-bold font-mono">{scores[k]||0}</p>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="text-sm text-[#888] h-5">
            {result
              ? result.winner === 'draw'
                ? "It's a draw!"
                : `${result.winner === 'X' ? (mode==='2p'?'Player 1':'You') : (mode==='1p'?'AI':'Player 2')} wins!`
              : aiThinking
                ? 'AI is thinking…'
                : `${currentPlayer === 'X' ? (mode==='2p'?'Player 1':'Your') : (mode==='1p'?'AI\'s':'Player 2\'s')} turn (${currentPlayer})`
            }
          </div>

          {/* Board */}
          <div className="grid grid-cols-3 gap-2" style={{ width: 280 }}>
            {board.map((cell, i) => {
              const isWin = winLine.includes(i);
              return (
                <button key={i} onClick={() => handleClick(i)}
                  disabled={!!cell || !!result || aiThinking || (mode==='1p' && currentPlayer==='O')}
                  className={`h-24 rounded-xl text-4xl font-bold flex items-center justify-center transition-all duration-150 border ${
                    isWin
                      ? 'bg-white text-black border-white'
                      : cell
                        ? 'bg-white/8 border-white/15 cursor-default'
                        : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.08] hover:border-white/20 cursor-pointer active:scale-95'
                  }`}>
                  {cell && (
                    <span className={`animate-popIn ${isWin ? 'text-black' : cell==='X' ? 'text-white' : 'text-[#aaa]'}`}>
                      {cell}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Difficulty (1p only) */}
          {mode === '1p' && !result && (
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => { setDifficulty(d); reset(); }}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${difficulty===d ? 'bg-white text-black font-bold' : 'text-[#444] hover:text-white'}`}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Result overlay actions */}
          {result && (
            <div className="flex gap-3">
              <button onClick={reset}
                className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-95">
                Play Again
              </button>
              <button onClick={() => { setMode(null); reset(); }}
                className="px-6 py-2.5 rounded-xl glass border border-white/10 text-sm hover:bg-white/5 transition-all">
                Menu
              </button>
            </div>
          )}
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

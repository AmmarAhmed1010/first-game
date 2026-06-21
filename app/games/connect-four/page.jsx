'use client';
import { useState, useCallback, useEffect } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';

const ROWS = 6, COLS = 7;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function dropDisc(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      const next = board.map(row => [...row]);
      next[r][col] = player;
      return { board: next, row: r };
    }
  }
  return null;
}

function checkWin(board, row, col) {
  const p = board[row][col];
  if (!p) return null;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr,dc] of dirs) {
    const cells = [[row,col]];
    for (let s of [1,-1]) {
      for (let i=1;i<4;i++) {
        const r=row+dr*i*s, c=col+dc*i*s;
        if (r<0||r>=ROWS||c<0||c>=COLS||board[r][c]!==p) break;
        cells.push([r,c]);
      }
    }
    if (cells.length >= 4) return { winner: p, cells };
  }
  return null;
}

function scoreWindow(window, player) {
  const opp = player === 1 ? 2 : 1;
  const pCount = window.filter(v => v === player).length;
  const eCount = window.filter(v => !v).length;
  if (pCount === 4) return 100;
  if (pCount === 3 && eCount === 1) return 5;
  if (pCount === 2 && eCount === 2) return 2;
  if (window.filter(v => v === opp).length === 3 && eCount === 1) return -4;
  return 0;
}

function scoreBoard(board, player) {
  let score = 0;
  const center = board.map(r => r[Math.floor(COLS/2)]).filter(v => v === player).length;
  score += center * 3;
  for (let r=0;r<ROWS;r++) for (let c=0;c<=COLS-4;c++) score += scoreWindow([board[r][c],board[r][c+1],board[r][c+2],board[r][c+3]], player);
  for (let r=0;r<=ROWS-4;r++) for (let c=0;c<COLS;c++) score += scoreWindow([board[r][c],board[r+1][c],board[r+2][c],board[r+3][c]], player);
  for (let r=0;r<=ROWS-4;r++) for (let c=0;c<=COLS-4;c++) score += scoreWindow([board[r][c],board[r+1][c+1],board[r+2][c+2],board[r+3][c+3]], player);
  for (let r=3;r<ROWS;r++) for (let c=0;c<=COLS-4;c++) score += scoreWindow([board[r][c],board[r-1][c+1],board[r-2][c+2],board[r-3][c+3]], player);
  return score;
}

function validCols(board) {
  return Array.from({length:COLS},(_,i)=>i).filter(c=>!board[0][c]);
}

function minimaxCF(board, depth, alpha, beta, isMax) {
  const valid = validCols(board);
  if (depth === 0 || valid.length === 0) return { score: scoreBoard(board, 2) };
  for (const c of valid) {
    const res = dropDisc(board, c, isMax ? 2 : 1);
    if (!res) continue;
    const win = checkWin(res.board, res.row, c);
    if (win) return { score: win.winner === 2 ? 10000 : -10000, col: c };
  }
  if (isMax) {
    let best = { score: -Infinity, col: valid[0] };
    for (const c of valid) {
      const res = dropDisc(board, c, 2);
      if (!res) continue;
      const val = minimaxCF(res.board, depth-1, alpha, beta, false);
      if (val.score > best.score) best = { score: val.score, col: c };
      alpha = Math.max(alpha, best.score);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = { score: Infinity, col: valid[0] };
    for (const c of valid) {
      const res = dropDisc(board, c, 1);
      if (!res) continue;
      const val = minimaxCF(res.board, depth-1, alpha, beta, true);
      if (val.score < best.score) best = { score: val.score, col: c };
      beta = Math.min(beta, best.score);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export default function ConnectFourPage() {
  const { recordGame } = useAuth();
  const [board, setBoard]     = useState(emptyBoard());
  const [current, setCurrent] = useState(1);
  const [result, setResult]   = useState(null);
  const [hover, setHover]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [scores, setScores]   = useState({ 1: 0, 2: 0 });
  const [aiThinking, setAI]   = useState(false);
  const [winCells, setWinCells] = useState([]);

  const reset = () => { setBoard(emptyBoard()); setCurrent(1); setResult(null); setWinCells([]); setAI(false); };

  const handleDrop = useCallback((col) => {
    if (!mode || result || aiThinking || (mode==='1p' && current===2)) return;
    const res = dropDisc(board, col, current);
    if (!res) return;
    const win = checkWin(res.board, res.row, col);
    setBoard(res.board);
    if (win) {
      setResult(win.winner);
      setWinCells(win.cells.map(([r,c]) => r*COLS+c));
      setScores(s => ({ ...s, [win.winner]: s[win.winner]+1 }));
      recordGame(win.winner === 1);
      saveScore('connect-four', { name: 'Player', score: win.winner === 1 ? 1 : 0 });
    } else if (validCols(res.board).length === 0) {
      setResult('draw');
    } else {
      setCurrent(p => p === 1 ? 2 : 1);
    }
  }, [board, current, mode, result, aiThinking, recordGame]);

  useEffect(() => {
    if (mode !== '1p' || current !== 2 || result || aiThinking) return;
    setAI(true);
    const t = setTimeout(() => {
      const { col } = minimaxCF(board.map(r=>[...r]), 4, -Infinity, Infinity, true);
      const res = dropDisc(board, col ?? 3, 2);
      if (res) {
        const win = checkWin(res.board, res.row, col);
        setBoard(res.board);
        if (win) {
          setResult(win.winner);
          setWinCells(win.cells.map(([r,c]) => r*COLS+c));
          setScores(s => ({ ...s, [win.winner]: s[win.winner]+1 }));
          recordGame(false);
        } else if (validCols(res.board).length === 0) {
          setResult('draw');
        } else {
          setCurrent(1);
        }
      }
      setAI(false);
    }, 500);
    return () => clearTimeout(t);
  }, [mode, current, board, result, aiThinking, recordGame]);

  if (!mode) return (
    <ProtectedRoute>
      <GameWrapper gameId="connect-four" title="Connect Four" icon="🔴">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-center"><div className="text-5xl mb-3">🔴</div>
            <h2 className="text-2xl font-bold">Connect Four</h2>
            <p className="text-[#555] text-sm mt-1">Drop 4 in a row to win</p>
          </div>
          {[{ id:'1p', label:'1 Player', desc:'vs AI' }, { id:'2p', label:'2 Players', desc:'Local multiplayer' }].map(m => (
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

  const isFull = (col) => !!board[0][col];

  return (
    <ProtectedRoute>
      <GameWrapper gameId="connect-four" title="Connect Four" icon="🔴" onRestart={reset}
        extraControls={
          <button onClick={() => { setMode(null); reset(); }}
            className="px-3 py-1.5 rounded-lg text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">Menu</button>
        }>
        <div className="flex flex-col items-center gap-4">
          {/* Scores */}
          <div className="flex gap-10 text-center">
            {[[1,'Player 1','#fff'],[2, mode==='1p'?'AI':'Player 2','#aaa']].map(([p,label,clr]) => (
              <div key={p}>
                <p className="text-xs text-[#444] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-3xl font-bold font-mono" style={{color:clr}}>{scores[p]}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#666] h-5">
            {result
              ? result === 'draw' ? "Draw!" : `${result===1?(mode==='2p'?'Player 1':'You'):'AI / Player 2'} wins!`
              : aiThinking ? 'AI thinking…' : `Player ${current}'s turn`}
          </p>

          {/* Column drop indicators */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${COLS},1fr)`, gap:4 }}>
            {Array.from({length:COLS},(_,c) => (
              <button key={c} onClick={() => handleDrop(c)}
                onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}
                disabled={isFull(c)||!!result||aiThinking||(mode==='1p'&&current===2)}
                className="w-10 h-6 flex items-center justify-center"
                style={{opacity: hover===c && !isFull(c) ? 1 : 0}}>
                <div className="w-0 h-0" style={{borderLeft:'6px solid transparent',borderRight:'6px solid transparent',borderTop:`8px solid ${current===1?'#fff':'#aaa'}`}} />
              </button>
            ))}
          </div>

          {/* Board */}
          <div className="rounded-2xl p-3"
            style={{ background:'#0d0d0d', border:'1px solid #1a1a1a', display:'grid', gridTemplateColumns:`repeat(${COLS},1fr)`, gap:4 }}
            onMouseLeave={() => setHover(null)}>
            {board.flatMap((row, r) => row.map((cell, c) => {
              const idx = r*COLS+c;
              const isWinCell = winCells.includes(idx);
              return (
                <button key={idx}
                  onClick={() => handleDrop(c)}
                  onMouseEnter={() => setHover(c)}
                  disabled={!!result||aiThinking||(mode==='1p'&&current===2)}
                  className={`w-10 h-10 rounded-full transition-all duration-150 ${
                    isWinCell ? 'scale-110 ring-2 ring-white' : ''
                  }`}
                  style={{
                    background: cell
                      ? cell === 1 ? '#ffffff' : '#888888'
                      : hover === c && !result ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${cell ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
                    cursor: cell || result ? 'default' : 'pointer',
                  }} />
              );
            }))}
          </div>

          {result && (
            <div className="flex gap-3 mt-2">
              <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-95">Play Again</button>
              <button onClick={() => { setMode(null); reset(); }} className="px-6 py-2.5 rounded-xl glass border border-white/10 text-sm hover:bg-white/5 transition-all">Menu</button>
            </div>
          )}
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

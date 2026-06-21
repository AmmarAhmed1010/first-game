'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { useControls } from '@/context/ControlsContext';
import { saveScore } from '@/lib/storage';

const CELL = 20, COLS = 28, ROWS = 28;
const W = CELL * COLS, H = CELL * ROWS;
const TICK = 140;

const COLORS = ['#ffffff', '#aaaaaa', '#666666'];

function randFood(snakes) {
  const occupied = new Set(snakes.flatMap(s => s.body.map(([x,y]) => `${x},${y}`)));
  let x, y;
  do { x = Math.floor(Math.random()*COLS); y = Math.floor(Math.random()*ROWS); }
  while (occupied.has(`${x},${y}`));
  return [x, y];
}

function dirFromCode(code, controls, player) {
  const c = controls[player];
  if (!c) return null;
  if (code === c.up)    return [0,-1];
  if (code === c.down)  return [0,1];
  if (code === c.left)  return [-1,0];
  if (code === c.right) return [1,0];
  return null;
}

function getDir(code, controls, playerCount, playerIndex) {
  const d = dirFromCode(code, controls, `p${playerIndex + 1}`);
  if (d) return d;
  // In single-player mode, also allow arrow keys for player 1
  if (playerCount === 1 && playerIndex === 0) {
    if (code === 'ArrowUp')    return [0,-1];
    if (code === 'ArrowDown')  return [0,1];
    if (code === 'ArrowLeft')  return [-1,0];
    if (code === 'ArrowRight') return [1,0];
  }
  return null;
}

const ALL_SNAKES = () => [
  { body: [[4,14],[3,14],[2,14]], dir: [1,0], alive: true, score: 0 },
  { body: [[23,14],[24,14],[25,14]], dir: [-1,0], alive: true, score: 0 },
  { body: [[14,4],[14,3],[14,2]], dir: [0,1], alive: true, score: 0 },
];

export default function SnakePage() {
  const { recordGame } = useAuth();
  const { controls } = useControls();
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const tickRef    = useRef(null);
  const keysRef    = useRef({});

  const [status, setStatus]   = useState('menu');
  const [scores, setScores]   = useState([0,0,0]);
  const [playerCount, setPC]  = useState(1);
  const [paused, setPaused]   = useState(false);

  const initState = useCallback((n) => {
    const snakes = ALL_SNAKES().slice(0, n).map((s) => ({ ...s, isAI: false }));
    return { snakes, food: [14,14], tick: 0, running: true, paused: false };
  }, []);

  const moveAI = (snake, food, others) => {
    const [hx, hy] = snake.body[0];
    const [fx, fy] = food;
    const occupied = new Set(others.flatMap(s => s.alive ? s.body.map(([x,y])=>`${x},${y}`) : []));
    const pref = fx>hx?[1,0]:fx<hx?[-1,0]:fy>hy?[0,1]:[0,-1];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const sorted = [pref, ...dirs.filter(d => d!==pref)];
    for (const [dx,dy] of sorted) {
      if (dx === -snake.dir[0] && dy === -snake.dir[1]) continue;
      const nx = (hx+dx+COLS)%COLS, ny = (hy+dy+ROWS)%ROWS;
      if (!occupied.has(`${nx},${ny}`)) return [dx,dy];
    }
    return snake.dir;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const ctx = canvas.getContext('2d');
    const { snakes, food } = stateRef.current;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x*CELL,0); ctx.lineTo(x*CELL,H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*CELL); ctx.lineTo(W,y*CELL); ctx.stroke(); }

    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(food[0]*CELL+CELL/2, food[1]*CELL+CELL/2, CELL/2-2, 0, Math.PI*2);
    ctx.fill();

    snakes.forEach((snake, i) => {
      if (!snake.alive) return;
      const col = COLORS[i];
      snake.body.forEach(([x,y], bi) => {
        ctx.fillStyle = bi === 0 ? col : col + (snake.isAI ? '88' : 'bb');
        const r = bi===0 ? 5 : 3;
        ctx.beginPath();
        ctx.roundRect(x*CELL+1, y*CELL+1, CELL-2, CELL-2, r);
        ctx.fill();
      });
    });
  }, []);

  const gameTick = useCallback(() => {
    if (!stateRef.current?.running || stateRef.current?.paused) return;
    const s = stateRef.current;
    s.snakes.forEach((snake, i) => {
      if (!snake.alive) return;
      if (snake.isAI) {
        snake.dir = moveAI(snake, s.food, s.snakes.filter((_,j)=>j!==i));
      } else {
        const playerKey = `p${i+1}`;
        const pending = snake.pendingDir;
        if (pending) { snake.dir = pending; snake.pendingDir = null; }
      }
      const [hx,hy] = snake.body[0];
      const [dx,dy] = snake.dir;
      const nx = (hx+dx+COLS)%COLS, ny = (hy+dy+ROWS)%ROWS;
      const ateSelf = snake.body.some(([x,y]) => x===nx && y===ny);
      const ateOther = s.snakes.filter((_,j)=>j!==i).some(other => other.alive && other.body.some(([x,y])=>x===nx&&y===ny));
      if (ateSelf || ateOther) { snake.alive = false; return; }
      snake.body.unshift([nx, ny]);
      if (nx===s.food[0] && ny===s.food[1]) {
        snake.score++;
        s.food = randFood(s.snakes);
      } else {
        snake.body.pop();
      }
    });

    setScores(s.snakes.map(sn => sn.score));
    const alive = s.snakes.filter(sn => sn.alive);
    if (alive.length === 0) {
      s.running = false;
      setStatus('gameover');
      const maxScore = Math.max(...s.snakes.map(sn => sn.score));
      recordGame(maxScore > 0);
      saveScore('snake', { name: 'Player', score: maxScore });
    }
    draw();
  }, [draw, recordGame]);

  const startGame = useCallback((n) => {
    stateRef.current = initState(n);
    setScores([0,0,0]);
    setPaused(false);
    setStatus('playing');
    draw();
    clearInterval(tickRef.current);
    tickRef.current = setInterval(gameTick, TICK);
  }, [initState, draw, gameTick]);

  const togglePause = useCallback(() => {
    if (!stateRef.current) return;
    stateRef.current.paused = !stateRef.current.paused;
    setPaused(p => !p);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,W,H);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (!stateRef.current?.running) return;
      const count = stateRef.current?.snakes?.length || 1;
      stateRef.current?.snakes?.forEach((snake, i) => {
        if (!snake.alive || snake.isAI) return;
        const d = getDir(e.code, controls, count, i);
        if (d) {
          if (d[0] !== -snake.dir[0] || d[1] !== -snake.dir[1])
            snake.pendingDir = d;
        }
      });
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
      ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code) && e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearInterval(tickRef.current); };
  }, [controls, togglePause]);

  const PLAYER_LABELS = ['1 Player','2 Players','3 Players'];

  return (
    <ProtectedRoute>
      <GameWrapper gameId="snake" title="Snake" icon="🐍"
        score={Math.max(...scores)} status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause}
        onRestart={() => startGame(playerCount)}>
        <div className="flex flex-col items-center gap-4">
          {status === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="flex flex-col items-center gap-5 p-8">
                <div className="text-5xl">🐍</div>
                <h2 className="text-2xl font-bold">Snake</h2>
                <button onClick={() => { setPC(1); startGame(1); }}
                  className="w-56 py-3.5 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">
                  Play Game
                </button>
                <div className="flex gap-2 w-56">
                  {[2,3].map((n) => (
                    <button key={n} onClick={() => { setPC(n); startGame(n); }}
                      className="flex-1 py-2 rounded-xl bg-white/10 border border-white/10 text-sm hover:bg-white hover:text-black font-medium transition-all">
                      {n} Players
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#555]">
                  1P: WASD or Arrow Keys · 2P: WASD + Arrows · 3P: WASD + Arrows + IJKL
                </p>
              </div>
            </div>
          )}

          {status === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                <p className="text-2xl font-bold mb-2">Game Over</p>
                <div className="flex gap-6 justify-center mb-5">
                  {stateRef.current?.snakes.slice(0,playerCount).map((s,i) => (
                    <div key={i} className="text-center">
                      <p className="text-xs text-[#555]">P{i+1}</p>
                      <p className="text-2xl font-bold font-mono" style={{color:COLORS[i]}}>{s.score}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => startGame(playerCount)} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Play Again</button>
                  <button onClick={() => setStatus('menu')} className="px-5 py-2 rounded-xl glass border border-white/10 text-sm hover:bg-white/5 transition-all">Menu</button>
                </div>
              </div>
            </div>
          )}

          {paused && status === 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
              <div className="text-center">
                <p className="text-xl font-bold mb-3">Paused</p>
                <button onClick={togglePause} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold">Resume</button>
              </div>
            </div>
          )}

          <div className="relative">
            {status === 'playing' && (
              <div className="flex gap-6 mb-2 justify-center text-sm">
                {stateRef.current?.snakes.map((s,i) => s && (
                  <span key={i} className="font-mono" style={{color: s.alive ? COLORS[i] : COLORS[i]+'55'}}>
                    P{i+1}{s.isAI?' (AI)':''}: {s.score}
                  </span>
                ))}
              </div>
            )}
            <canvas ref={canvasRef} width={W} height={H}
              className="rounded-xl game-canvas"
              style={{ border: '1px solid #1a1a1a', maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain' }} />
          </div>
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { useControls } from '@/context/ControlsContext';
import { saveScore } from '@/lib/storage';

const W = 800, H = 500, PADDLE_W = 14, PADDLE_H = 90, BALL_R = 9, SPEED_INC = 0.4, WIN_SCORE = 7;

function initState() {
  return {
    ball: { x: W/2, y: H/2, vx: 5*(Math.random()>0.5?1:-1), vy: 3*(Math.random()>0.5?1:-1) },
    p1: { y: H/2-PADDLE_H/2, vy: 0, score: 0 },
    p2: { y: H/2-PADDLE_H/2, vy: 0, score: 0 },
    running: false, paused: false,
  };
}

export default function PongPage() {
  const { recordGame } = useAuth();
  const { controls } = useControls();
  const canvasRef = useRef(null);
  const stateRef  = useRef(initState());
  const rafRef    = useRef(null);
  const keysRef   = useRef({});

  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [status, setStatus] = useState('menu');
  const [mode, setMode]     = useState('1p');
  const [paused, setPaused] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { ball, p1, p2 } = stateRef.current;

    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    ctx.setLineDash([8,12]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    ctx.setLineDash([]);

    [[20, p1.y, '#fff'],[W-20-PADDLE_W, p2.y, '#aaa']].forEach(([x,y,col]) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(x,y,PADDLE_W,PADDLE_H,4); ctx.fill();
    });

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font='bold 48px monospace';
    ctx.textAlign='center';
    ctx.fillText(p1.score, W/2-80, 60);
    ctx.fillText(p2.score, W/2+80, 60);
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if (!s.running || s.paused) return;
    const { ball, p1, p2 } = s;
    const PSPD = 7;

    if (keysRef.current[controls.p1.up])   p1.vy = -PSPD;
    else if (keysRef.current[controls.p1.down]) p1.vy = PSPD;
    else p1.vy *= 0.85;

    if (mode === '1p') {
      const center = p2.y + PADDLE_H/2;
      if (ball.vx > 0) {
        if (center < ball.y - 5) p2.vy = 5;
        else if (center > ball.y + 5) p2.vy = -5;
        else p2.vy = 0;
      } else p2.vy *= 0.8;
    } else {
      if (keysRef.current[controls.p2.up])   p2.vy = -PSPD;
      else if (keysRef.current[controls.p2.down]) p2.vy = PSPD;
      else p2.vy *= 0.85;
    }

    p1.y = Math.max(0, Math.min(H-PADDLE_H, p1.y + p1.vy));
    p2.y = Math.max(0, Math.min(H-PADDLE_H, p2.y + p2.vy));

    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
    if (ball.y + BALL_R > H) { ball.y = H-BALL_R; ball.vy = -Math.abs(ball.vy); }

    const p1x = 20+PADDLE_W;
    if (ball.x-BALL_R < p1x && ball.x-BALL_R > 20 && ball.y > p1.y && ball.y < p1.y+PADDLE_H) {
      ball.vx = Math.abs(ball.vx) + SPEED_INC;
      ball.vy += ((ball.y-(p1.y+PADDLE_H/2))/(PADDLE_H/2))*3;
      ball.x = p1x+BALL_R;
    }
    const p2x = W-20-PADDLE_W;
    if (ball.x+BALL_R > p2x && ball.x+BALL_R < W-20 && ball.y > p2.y && ball.y < p2.y+PADDLE_H) {
      ball.vx = -(Math.abs(ball.vx) + SPEED_INC);
      ball.vy += ((ball.y-(p2.y+PADDLE_H/2))/(PADDLE_H/2))*3;
      ball.x = p2x-BALL_R;
    }
    ball.vy = Math.max(-12, Math.min(12, ball.vy));

    if (ball.x < 0) {
      p2.score++;
      setScores({ p1: p1.score, p2: p2.score });
      if (p2.score >= WIN_SCORE) { s.running=false; setStatus('gameover'); recordGame(false); saveScore('pong',{name:'Player',score:p1.score}); return; }
      Object.assign(ball, { x:W/2,y:H/2, vx:5,vy:2*(Math.random()>0.5?1:-1) });
      Object.assign(p1,{y:H/2-PADDLE_H/2}); Object.assign(p2,{y:H/2-PADDLE_H/2});
    }
    if (ball.x > W) {
      p1.score++;
      setScores({ p1: p1.score, p2: p2.score });
      if (p1.score >= WIN_SCORE) { s.running=false; setStatus('gameover'); recordGame(true); saveScore('pong',{name:'Player',score:p1.score}); return; }
      Object.assign(ball, { x:W/2,y:H/2, vx:-5,vy:2*(Math.random()>0.5?1:-1) });
      Object.assign(p1,{y:H/2-PADDLE_H/2}); Object.assign(p2,{y:H/2-PADDLE_H/2});
    }
  }, [mode, controls, recordGame]);

  const gameLoop = useCallback(() => {
    update(); draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  const startGame = useCallback(() => {
    const s = initState();
    s.running = true;
    stateRef.current = s;
    setScores({ p1: 0, p2: 0 });
    setPaused(false);
    setStatus('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const togglePause = useCallback(() => {
    if (!stateRef.current) return;
    stateRef.current.paused = !stateRef.current.paused;
    setPaused(p => !p);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.code] = true;
      if (['ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape') togglePause();
    };
    const onUp = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [togglePause]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <ProtectedRoute>
      <GameWrapper gameId="pong" title="Pong" icon="🏓"
        status={status} isPaused={paused}
        onPause={togglePause} onResume={togglePause} onRestart={startGame}>
        <div className="flex flex-col items-center gap-3 relative">
          {status === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-5">
                <div className="text-5xl">🏓</div>
                <h2 className="text-2xl font-bold">Pong</h2>
                <p className="text-sm text-[#555]">First to {WIN_SCORE} wins</p>
                <div className="flex gap-2 mb-2">
                  {['1p','2p'].map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode===m ? 'bg-white text-black' : 'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                      {m==='1p' ? 'vs AI' : '2 Players'}
                    </button>
                  ))}
                </div>
                <button onClick={startGame} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Start Game</button>
                <p className="text-xs text-[#333]">P1: W/S | P2: ↑/↓</p>
              </div>
            </div>
          )}
          {status === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                <p className="text-2xl font-bold mb-1">{scores.p1 >= WIN_SCORE ? '🏆 Player 1 Wins!' : `🏆 ${mode==='1p'?'AI':'Player 2'} Wins!`}</p>
                <p className="text-lg font-mono text-[#888] mb-5">{scores.p1} — {scores.p2}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={startGame} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Play Again</button>
                  <button onClick={() => { stateRef.current=initState(); setScores({p1:0,p2:0}); setStatus('menu'); cancelAnimationFrame(rafRef.current); draw(); }}
                    className="px-5 py-2 rounded-xl glass border border-white/10 text-sm">Menu</button>
                </div>
              </div>
            </div>
          )}
          {paused && status==='playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 rounded-xl">
              <div className="text-center"><p className="text-xl font-bold mb-3">Paused</p>
                <button onClick={togglePause} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold">Resume</button></div>
            </div>
          )}
          <canvas ref={canvasRef} width={W} height={H}
            className="rounded-xl game-canvas"
            style={{ border:'1px solid #1a1a1a', maxWidth:'90vw', maxHeight:'70vh', objectFit:'contain' }} />
          <p className="text-xs text-[#333]">P1: {mode==='1p'?'W/S':'W/S'} | {mode==='1p'?'AI':'P2: ↑/↓'} | ESC: Pause</p>
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';

const W=800,H=600,PADDLE_W=100,PADDLE_H=14,BALL_R=9;
const BRICK_ROWS=6, BRICK_COLS=12, BRICK_W=56, BRICK_H=22, BRICK_GAP=4;
const BRICK_OFFSET_X=(W-(BRICK_COLS*(BRICK_W+BRICK_GAP)-BRICK_GAP))/2;
const BRICK_OFFSET_Y=60;
const POWERUP_TYPES=['wide','multi','slow','laser'];

function makeBricks() {
  return Array.from({length:BRICK_ROWS},(_,r)=>Array.from({length:BRICK_COLS},(_,c)=>({
    x:BRICK_OFFSET_X+c*(BRICK_W+BRICK_GAP),
    y:BRICK_OFFSET_Y+r*(BRICK_H+BRICK_GAP),
    hp: r<2?3:r<4?2:1,
    alive:true,
    pw: Math.random()<0.12 ? POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)] : null,
  })));
}

function makeBall(px){
  return { x:px+PADDLE_W/2, y:H-80, vx:4*(Math.random()>0.5?1:-1), vy:-5.5, active:true };
}

function initState(){
  const paddle = {x:W/2-PADDLE_W/2, w:PADDLE_W, speed:8};
  return {
    paddle, bricks:makeBricks(), balls:[makeBall(paddle.x)],
    powerups:[], score:0, lives:3, level:1,
    running:false, paused:false, launched:false,
  };
}

export default function BreakoutPage() {
  const { recordGame } = useAuth();
  const canvasRef = useRef(null);
  const stateRef  = useRef(initState());
  const rafRef    = useRef(null);
  const keysRef   = useRef({});

  const [score, setScore]   = useState(0);
  const [lives, setLives]   = useState(3);
  const [level, setLevel]   = useState(1);
  const [status, setStatus] = useState('menu');
  const [paused, setPaused] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const { paddle, bricks, balls, powerups, score: sc, lives: lv } = stateRef.current;

    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

    const brickColors = ['#555','#555','#777','#777','#aaa','#fff'];
    bricks.forEach(row=>row.forEach(b=>{
      if(!b.alive) return;
      const rowIdx = bricks.indexOf(row);
      ctx.fillStyle = brickColors[rowIdx]||'#888';
      ctx.beginPath(); ctx.roundRect(b.x,b.y,BRICK_W,BRICK_H,3); ctx.fill();
      if(b.hp>1){
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.font='bold 11px monospace';
        ctx.textAlign='center'; ctx.fillText(b.hp,b.x+BRICK_W/2,b.y+BRICK_H/2+4);
      }
      if(b.pw){
        ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1.5;
        ctx.strokeRect(b.x+1,b.y+1,BRICK_W-2,BRICK_H-2);
      }
    }));

    powerups.forEach(p=>{
      ctx.fillStyle='#fff'; ctx.font='14px monospace'; ctx.textAlign='center';
      ctx.fillText(p.type==='wide'?'W':p.type==='multi'?'M':p.type==='slow'?'S':'L', p.x,p.y);
    });

    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.roundRect(paddle.x, H-40, paddle.w, PADDLE_H, 5); ctx.fill();

    balls.forEach(ball=>{
      if(!ball.active) return;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2); ctx.fill();
    });

    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='14px monospace'; ctx.textAlign='left';
    ctx.fillText(`Score: ${sc}`, 14, 30);
    ctx.textAlign='right';
    ctx.fillText(`Lives: ${'♥ '.repeat(lv).trim()}`, W-14, 30);
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if(!s.running||s.paused) return;
    const { paddle, bricks, balls, powerups } = s;

    if(keysRef.current['ArrowLeft']||keysRef.current['KeyA']) paddle.x -= paddle.speed;
    if(keysRef.current['ArrowRight']||keysRef.current['KeyD']) paddle.x += paddle.speed;
    paddle.x = Math.max(0, Math.min(W-paddle.w, paddle.x));

    if(!s.launched){
      balls[0].x = paddle.x + paddle.w/2;
      balls[0].y = H-40-BALL_R-2;
      return;
    }

    balls.forEach(ball=>{
      if(!ball.active) return;
      ball.x += ball.vx; ball.y += ball.vy;
      if(ball.x-BALL_R<0){ball.x=BALL_R;ball.vx=Math.abs(ball.vx);}
      if(ball.x+BALL_R>W){ball.x=W-BALL_R;ball.vx=-Math.abs(ball.vx);}
      if(ball.y-BALL_R<0){ball.y=BALL_R;ball.vy=Math.abs(ball.vy);}
      if(ball.y+BALL_R>H-40&&ball.y+BALL_R<H-40+PADDLE_H&&ball.x>paddle.x-BALL_R&&ball.x<paddle.x+paddle.w+BALL_R){
        const rel=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
        ball.vx=rel*7; ball.vy=-Math.abs(ball.vy);
        const spd=Math.sqrt(ball.vx**2+ball.vy**2);
        if(spd>12){ball.vx=ball.vx/spd*12;ball.vy=ball.vy/spd*12;}
        ball.y=H-40-BALL_R-1;
      }
      if(ball.y>H+20) ball.active=false;

      bricks.forEach(row=>row.forEach(b=>{
        if(!b.alive) return;
        if(ball.x+BALL_R>b.x&&ball.x-BALL_R<b.x+BRICK_W&&ball.y+BALL_R>b.y&&ball.y-BALL_R<b.y+BRICK_H){
          b.hp--;
          if(b.hp<=0){
            b.alive=false;
            s.score+=10*(6-bricks.indexOf(row));
            if(b.pw) powerups.push({x:b.x+BRICK_W/2,y:b.y,vy:2.5,type:b.pw});
          }
          const overlapL=ball.x+BALL_R-b.x, overlapR=b.x+BRICK_W-ball.x+BALL_R;
          const overlapT=ball.y+BALL_R-b.y, overlapB=b.y+BRICK_H-ball.y+BALL_R;
          const minX=Math.min(overlapL,overlapR), minY=Math.min(overlapT,overlapB);
          if(minX<minY) ball.vx=-ball.vx; else ball.vy=-ball.vy;
        }
      }));
    });

    for(let i=powerups.length-1;i>=0;i--){
      const p=powerups[i];
      p.y+=p.vy;
      if(p.y>H-40&&p.y<H-40+30&&p.x>paddle.x&&p.x<paddle.x+paddle.w){
        if(p.type==='wide') paddle.w=Math.min(180,paddle.w+40);
        if(p.type==='slow') balls.forEach(b=>{b.vx*=0.7;b.vy*=0.7;});
        if(p.type==='multi') {
          const extra=[{...balls[0],vx:balls[0].vx+2,active:true},{...balls[0],vx:balls[0].vx-2,active:true}];
          balls.push(...extra);
        }
        powerups.splice(i,1);
      } else if(p.y>H) powerups.splice(i,1);
    }

    setScore(s.score);

    const activeBalls=balls.filter(b=>b.active);
    if(activeBalls.length===0){
      s.lives--;
      setLives(s.lives);
      if(s.lives<=0){
        s.running=false; setStatus('gameover');
        recordGame(false); saveScore('breakout',{name:'Player',score:s.score});
        return;
      }
      s.launched=false;
      s.balls=[makeBall(paddle.x)];
    }

    const allCleared=bricks.every(row=>row.every(b=>!b.alive));
    if(allCleared){
      s.level++;
      setLevel(s.level);
      s.bricks=makeBricks();
      s.launched=false;
      s.balls=[makeBall(paddle.x)];
      s.powerups=[];
      const inc=1+s.level*0.3;
      s.balls[0].vx*=inc; s.balls[0].vy*=inc;
    }
  }, [recordGame]);

  const gameLoop = useCallback(()=>{
    update(); draw();
    rafRef.current=requestAnimationFrame(gameLoop);
  },[update,draw]);

  const startGame = useCallback(()=>{
    const s=initState(); s.running=true;
    stateRef.current=s;
    setScore(0); setLives(3); setLevel(1); setPaused(false); setStatus('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(gameLoop);
  },[gameLoop]);

  const togglePause = useCallback(()=>{
    if(!stateRef.current) return;
    stateRef.current.paused=!stateRef.current.paused;
    setPaused(p=>!p);
  },[]);

  useEffect(()=>{
    const onDown=(e)=>{
      keysRef.current[e.code]=true;
      ['ArrowLeft','ArrowRight','Space'].includes(e.code)&&e.preventDefault();
      if(e.code==='Space'&&stateRef.current?.running&&!stateRef.current.launched){
        stateRef.current.launched=true;
      }
      if(e.code==='Escape') togglePause();
    };
    const onUp=(e)=>{ keysRef.current[e.code]=false; };
    window.addEventListener('keydown',onDown);
    window.addEventListener('keyup',onUp);
    return()=>{ window.removeEventListener('keydown',onDown); window.removeEventListener('keyup',onUp); cancelAnimationFrame(rafRef.current); };
  },[togglePause]);

  useEffect(()=>{ draw(); },[draw]);

  return (
    <ProtectedRoute>
      <GameWrapper gameId="breakout" title="Breakout" icon="🧱"
        score={score} lives={lives} level={level} status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause} onRestart={startGame}>
        <div className="flex flex-col items-center gap-3 relative">
          {status==='menu'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-5">
                <div className="text-5xl">🧱</div>
                <h2 className="text-2xl font-bold">Breakout</h2>
                <p className="text-sm text-[#555]">Break all bricks. Catch powerups!</p>
                <button onClick={startGame} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Start Game</button>
                <p className="text-xs text-[#333]">Arrow Keys / A,D to move • Space to launch</p>
              </div>
            </div>
          )}
          {status==='gameover'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                <p className="text-2xl font-bold mb-1">Game Over</p>
                <p className="text-3xl font-mono font-bold text-white mb-1">{score.toLocaleString()}</p>
                <p className="text-sm text-[#555] mb-5">Level {level}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={startGame} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Play Again</button>
                  <button onClick={()=>{stateRef.current=initState();setStatus('menu');cancelAnimationFrame(rafRef.current);draw();}} className="px-5 py-2 rounded-xl glass border border-white/10 text-sm">Menu</button>
                </div>
              </div>
            </div>
          )}
          {paused&&status==='playing'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 rounded-xl">
              <div className="text-center"><p className="text-xl font-bold mb-3">Paused</p>
                <button onClick={togglePause} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold">Resume</button></div>
            </div>
          )}
          <canvas ref={canvasRef} width={W} height={H} className="rounded-xl game-canvas"
            style={{border:'1px solid #1a1a1a',maxWidth:'90vw',maxHeight:'72vh',objectFit:'contain'}} />
          {status==='playing'&&!stateRef.current?.launched&&<p className="text-xs text-[#444] animate-blink">Press SPACE to launch</p>}
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

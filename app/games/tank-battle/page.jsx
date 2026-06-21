'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { useControls } from '@/context/ControlsContext';
import { saveScore } from '@/lib/storage';

const W=800,H=600,TANK_R=18,BULLET_R=5,BULLET_SPD=8,BULLET_TTL=90;

const WALLS=[
  {x:150,y:80,w:120,h:20},{x:540,y:80,w:120,h:20},
  {x:80,y:200,w:20,h:120},{x:700,y:200,w:20,h:120},
  {x:300,y:150,w:200,h:20},{x:300,y:280,w:80,h:20},{x:420,y:280,w:80,h:20},
  {x:80,y:400,w:20,h:120},{x:700,y:400,w:20,h:120},
  {x:150,y:500,w:120,h:20},{x:540,y:500,w:120,h:20},
  {x:320,y:420,w:160,h:20},
];

function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}

function initTanks(n){
  const starts=[
    {x:80,y:80,angle:Math.PI/4,color:'#fff'},
    {x:720,y:520,angle:-Math.PI*3/4,color:'#888'},
    {x:720,y:80,angle:-Math.PI/4,color:'#aaa'},
  ];
  return starts.slice(0,Math.max(n,2)).map((t,i)=>({
    ...t, hp:3, shootCooldown:0, isAI:i>0&&i>=n, aiTimer:0, bullets:[],
  }));
}

export default function TankBattlePage(){
  const {recordGame}=useAuth();
  const {controls}=useControls();
  const canvasRef=useRef(null);
  const stateRef=useRef(null);
  const rafRef=useRef(null);
  const keysRef=useRef({});

  const [scores,setScores]=useState([0,0,0]);
  const [status,setStatus]=useState('menu');
  const [mode,setMode]=useState('1p');
  const [paused,setPaused]=useState(false);

  const drawTank=useCallback((ctx,t)=>{
    ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.angle);
    ctx.fillStyle=t.color;
    ctx.beginPath(); ctx.roundRect(-TANK_R,-TANK_R,TANK_R*2,TANK_R*2,4); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.roundRect(-6,-6,12,12,3); ctx.fill();
    ctx.fillStyle=t.color;
    ctx.fillRect(-3,-TANK_R-12,6,16);
    if(t.hp<3){
      ctx.restore();
      ctx.fillStyle='rgba(255,80,80,0.8)';
      const bw=36*(t.hp/3);
      ctx.fillRect(t.x-18,t.y-TANK_R-18,bw,5);
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
      ctx.strokeRect(t.x-18,t.y-TANK_R-18,36,5);
      return;
    }
    ctx.restore();
  },[]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    ctx.fillStyle='#1a1a1a';
    WALLS.forEach(w=>{ ctx.fillRect(w.x,w.y,w.w,w.h); });
    ctx.strokeStyle='rgba(255,255,255,0.08)';
    WALLS.forEach(w=>{ ctx.strokeRect(w.x,w.y,w.w,w.h); });

    const s=stateRef.current;
    if(!s) return;
    s.tanks.forEach(t=>{
      if(t.hp<=0) return;
      t.bullets.forEach(b=>{
        ctx.fillStyle=t.color;
        ctx.beginPath(); ctx.arc(b.x,b.y,BULLET_R,0,Math.PI*2); ctx.fill();
      });
    });
    s.tanks.forEach(t=>{ if(t.hp>0) drawTank(ctx,t); });

    s.explosions?.forEach(e=>{
      const a=e.life/e.maxLife;
      ctx.fillStyle=`rgba(255,${180*a},0,${a*0.8})`;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r*(1.5-a),0,Math.PI*2); ctx.fill();
    });

    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='13px monospace'; ctx.textAlign='left';
    s.tanks.forEach((t,i)=>{
      ctx.fillStyle=t.color+(t.hp<=0?'44':'');
      ctx.fillText(`P${i+1}${t.isAI?' (AI)':''}: ${'♥'.repeat(Math.max(0,t.hp))}`, 10, 20+i*20);
    });
  },[drawTank]);

  const moveWithCollision=(tank,dx,dy)=>{
    const nx=tank.x+dx, ny=tank.y+dy;
    const canMoveX=!WALLS.some(w=>rectsOverlap(nx-TANK_R,tank.y-TANK_R,TANK_R*2,TANK_R*2,w.x,w.y,w.w,w.h));
    const canMoveY=!WALLS.some(w=>rectsOverlap(tank.x-TANK_R,ny-TANK_R,TANK_R*2,TANK_R*2,w.x,w.y,w.w,w.h));
    if(canMoveX) tank.x=Math.max(TANK_R,Math.min(W-TANK_R,nx));
    if(canMoveY) tank.y=Math.max(TANK_R,Math.min(H-TANK_R,ny));
  };

  const update=useCallback(()=>{
    const s=stateRef.current;
    if(!s?.running||s.paused) return;
    const SPDY=3;

    s.tanks.forEach((t,i)=>{
      if(t.hp<=0) return;
      t.shootCooldown=Math.max(0,t.shootCooldown-1);
      if(t.isAI){
        const target=s.tanks.find((ot,j)=>j!==i&&ot.hp>0);
        if(target){
          const dx=target.x-t.x, dy=target.y-t.y;
          const ang=Math.atan2(dy,dx)+Math.PI/2;
          t.angle+=(ang-t.angle)*0.08;
          const dist=Math.sqrt(dx*dx+dy*dy);
          if(dist>120) moveWithCollision(t,Math.sin(t.angle)*SPDY,-Math.cos(t.angle)*SPDY);
          if(dist<300&&t.shootCooldown===0){
            t.bullets.push({x:t.x+Math.sin(t.angle)*22,y:t.y-Math.cos(t.angle)*22,vx:Math.sin(t.angle)*BULLET_SPD,vy:-Math.cos(t.angle)*BULLET_SPD,ttl:BULLET_TTL});
            t.shootCooldown=60+Math.random()*30;
          }
        }
      } else {
        const c=controls[`p${i+1}`];
        if(c){
          if(keysRef.current[c.left])  t.angle-=0.07;
          if(keysRef.current[c.right]) t.angle+=0.07;
          if(keysRef.current[c.up])    moveWithCollision(t,Math.sin(t.angle)*SPDY,-Math.cos(t.angle)*SPDY);
          if(keysRef.current[c.down])  moveWithCollision(t,-Math.sin(t.angle)*SPDY,Math.cos(t.angle)*SPDY);
          if(keysRef.current[c.action]&&t.shootCooldown===0){
            t.bullets.push({x:t.x+Math.sin(t.angle)*22,y:t.y-Math.cos(t.angle)*22,vx:Math.sin(t.angle)*BULLET_SPD,vy:-Math.cos(t.angle)*BULLET_SPD,ttl:BULLET_TTL});
            t.shootCooldown=25;
          }
        }
      }

      for(let bi=t.bullets.length-1;bi>=0;bi--){
        const b=t.bullets[bi];
        b.x+=b.vx; b.y+=b.vy; b.ttl--;
        const hitWall=WALLS.some(w=>rectsOverlap(b.x-BULLET_R,b.y-BULLET_R,BULLET_R*2,BULLET_R*2,w.x,w.y,w.w,w.h));
        if(hitWall||b.ttl<=0||b.x<0||b.x>W||b.y<0||b.y>H){ t.bullets.splice(bi,1); continue; }
        let hitTank=false;
        s.tanks.forEach((ot,j)=>{
          if(j===i||ot.hp<=0) return;
          if(Math.sqrt((b.x-ot.x)**2+(b.y-ot.y)**2)<TANK_R+BULLET_R){
            ot.hp--;
            s.explosions=s.explosions||[];
            s.explosions.push({x:ot.x,y:ot.y,r:30,life:20,maxLife:20});
            t.bullets.splice(bi,1); hitTank=true;
          }
        });
      }
    });

    s.explosions=s.explosions?.filter(e=>{ e.life--; return e.life>0; })||[];
    const alive=s.tanks.filter(t=>t.hp>0);
    if(alive.length<=1){
      s.running=false;
      const playerWon=alive[0]&&!alive[0].isAI;
      setStatus('gameover');
      recordGame(playerWon);
      saveScore('tank-battle',{name:'Player',score:s.tanks.filter(t=>!t.isAI).reduce((acc,t)=>acc+(3-t.hp),0)});
    }
  },[controls,recordGame]);

  const gameLoop=useCallback(()=>{ update(); draw(); rafRef.current=requestAnimationFrame(gameLoop); },[update,draw]);

  const startGame=useCallback((n=1)=>{
    stateRef.current={ tanks:initTanks(n), explosions:[], running:true, paused:false };
    setPaused(false); setStatus('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(gameLoop);
  },[gameLoop]);

  const togglePause=useCallback(()=>{ if(!stateRef.current) return; stateRef.current.paused=!stateRef.current.paused; setPaused(p=>!p); },[]);

  useEffect(()=>{
    const onDown=(e)=>{ keysRef.current[e.code]=true; ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&e.preventDefault(); if(e.code==='Escape') togglePause(); };
    const onUp=(e)=>{ keysRef.current[e.code]=false; };
    window.addEventListener('keydown',onDown);
    window.addEventListener('keyup',onUp);
    return()=>{ window.removeEventListener('keydown',onDown); window.removeEventListener('keyup',onUp); cancelAnimationFrame(rafRef.current); };
  },[togglePause]);

  useEffect(()=>{ draw(); },[draw]);

  const modeCount={'1p':1,'2p':2};

  return(
    <ProtectedRoute>
      <GameWrapper gameId="tank-battle" title="Tank Battle" icon="🪖" status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause} onRestart={()=>startGame(modeCount[mode]||1)}>
        <div className="flex flex-col items-center gap-3 relative">
          {status==='menu'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-5">
                <div className="text-5xl">🪖</div>
                <h2 className="text-2xl font-bold">Tank Battle</h2>
                <p className="text-sm text-[#555]">Destroy enemy tanks. 3 HP each.</p>
                <div className="flex gap-2 mb-1">
                  {['1p','2p'].map(m=>(
                    <button key={m} onClick={()=>setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode===m?'bg-white text-black':'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                      {m==='1p'?'1 Player (vs AI)':'2 Players'}
                    </button>
                  ))}
                </div>
                <button onClick={()=>startGame(modeCount[mode])} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Start</button>
                <p className="text-xs text-[#333]">P1: WASD + F to shoot | P2: Arrows + Enter</p>
              </div>
            </div>
          )}
          {status==='gameover'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                {stateRef.current?.tanks?.find(t=>t.hp>0&&!t.isAI)
                  ? <p className="text-2xl font-bold mb-4">🏆 You Win!</p>
                  : <p className="text-2xl font-bold mb-4">💥 Destroyed!</p>
                }
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>startGame(modeCount[mode])} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Play Again</button>
                  <button onClick={()=>{stateRef.current=null;setStatus('menu');cancelAnimationFrame(rafRef.current);draw();}} className="px-5 py-2 rounded-xl glass border border-white/10 text-sm">Menu</button>
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
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

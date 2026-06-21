'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { saveScore } from '@/lib/storage';

const W=600,H=700,PLAYER_W=36,PLAYER_H=36;

function initState(){
  return{
    player:{ x:W/2,y:H-80,vx:0,speed:5,hp:3,maxHp:3,iframes:0,shootCooldown:0 },
    bullets:[],enemyBullets:[],enemies:[],stars:[],explosions:[],
    score:0,wave:0,waveTimer:0,bossActive:false,boss:null,
    running:false,paused:false,spawnTimer:0,lives:3,
  };
}

function makeStars(){
  return Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H,speed:0.5+Math.random()*2,r:Math.random()*1.5+0.5}));
}

export default function SpaceShooterPage(){
  const {recordGame}=useAuth();
  const canvasRef=useRef(null);
  const stateRef=useRef(initState());
  const rafRef=useRef(null);
  const keysRef=useRef({});
  const starsRef=useRef(makeStars());

  const [score,setScore]=useState(0);
  const [lives,setLives]=useState(3);
  const [wave,setWave]=useState(0);
  const [status,setStatus]=useState('menu');
  const [paused,setPaused]=useState(false);

  const spawnWave=useCallback((s)=>{
    s.wave++;
    setWave(s.wave);
    if(s.wave%5===0){
      s.bossActive=true;
      s.boss={ x:W/2,y:80,vx:2,hp:20+s.wave*3,maxHp:20+s.wave*3,w:80,h:55,shootTimer:0 };
    } else {
      const count=5+s.wave*2;
      for(let i=0;i<count;i++){
        s.enemies.push({
          x:40+Math.random()*(W-80),y:-30-i*50,
          vx:(Math.random()-0.5)*2,vy:1.2+s.wave*0.15,
          hp:1+(s.wave>3?1:0),maxHp:1+(s.wave>3?1:0),
          type:i%3===0?'shooter':'basic',
          shootTimer:Math.random()*120,w:28,h:22,
        });
      }
    }
  },[]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const s=stateRef.current;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

    starsRef.current.forEach(st=>{
      ctx.fillStyle=`rgba(255,255,255,${0.2+st.r*0.2})`;
      ctx.beginPath(); ctx.arc(st.x,st.y,st.r,0,Math.PI*2); ctx.fill();
    });

    s.bullets.forEach(b=>{
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.roundRect(b.x-2,b.y-8,4,16,2); ctx.fill();
    });
    s.enemyBullets.forEach(b=>{
      ctx.fillStyle='#ff6666';
      ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
    });

    s.enemies.forEach(e=>{
      ctx.fillStyle=e.hp>1?'#888':'#aaa';
      ctx.beginPath(); ctx.moveTo(e.x,e.y-e.h/2); ctx.lineTo(e.x-e.w/2,e.y+e.h/2); ctx.lineTo(e.x+e.w/2,e.y+e.h/2); ctx.closePath(); ctx.fill();
      if(e.hp>1){
        ctx.fillStyle='#555'; ctx.fillRect(e.x-e.w/2,e.y-e.h/2-8,e.w*(e.hp/e.maxHp),4);
      }
    });

    if(s.boss){
      const b=s.boss;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.roundRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h,8); ctx.fill();
      ctx.fillStyle='#000';
      ctx.beginPath(); ctx.arc(b.x-15,b.y-5,8,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x+15,b.y-5,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,100,100,0.8)';
      ctx.fillRect(b.x-b.w/2,b.y+b.h/2+4,b.w*(b.hp/b.maxHp),8);
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
      ctx.strokeRect(b.x-b.w/2,b.y+b.h/2+4,b.w,8);
    }

    if(s.player.hp>0){
      const p=s.player;
      const alpha=p.iframes>0?(Math.sin(p.iframes*0.4)>0?0.3:1):1;
      ctx.globalAlpha=alpha;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.moveTo(p.x,p.y-PLAYER_H/2); ctx.lineTo(p.x-PLAYER_W/2,p.y+PLAYER_H/2); ctx.lineTo(p.x,p.y+PLAYER_H/4); ctx.lineTo(p.x+PLAYER_W/2,p.y+PLAYER_H/2); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#555';
      ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }

    s.explosions.forEach(e=>{
      const a=e.life/e.maxLife;
      ctx.fillStyle=`rgba(255,${100+100*a},0,${a})`;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r*(1-a+0.3),0,Math.PI*2); ctx.fill();
    });

    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='14px monospace'; ctx.textAlign='left';
    ctx.fillText(`Score: ${s.score}`,12,24);
    ctx.textAlign='right';
    ctx.fillText(`HP: ${'♥ '.repeat(s.player.hp).trim()}`,W-12,24);
    ctx.textAlign='center';
    ctx.fillText(`Wave ${s.wave}`,W/2,24);
  },[]);

  const update=useCallback(()=>{
    const s=stateRef.current;
    if(!s.running||s.paused) return;
    const p=s.player;

    starsRef.current.forEach(st=>{ st.y+=st.speed; if(st.y>H) st.y=0; });

    if(keysRef.current['ArrowLeft']||keysRef.current['KeyA']) p.x=Math.max(PLAYER_W/2,p.x-p.speed);
    if(keysRef.current['ArrowRight']||keysRef.current['KeyD']) p.x=Math.min(W-PLAYER_W/2,p.x+p.speed);
    if(keysRef.current['ArrowUp']||keysRef.current['KeyW']) p.y=Math.max(60,p.y-p.speed);
    if(keysRef.current['ArrowDown']||keysRef.current['KeyS']) p.y=Math.min(H-60,p.y+p.speed);
    if(p.iframes>0) p.iframes--;

    p.shootCooldown=Math.max(0,p.shootCooldown-1);
    if((keysRef.current['Space']||keysRef.current['KeyZ'])&&p.shootCooldown===0){
      s.bullets.push({x:p.x,y:p.y-PLAYER_H/2,vy:-10});
      p.shootCooldown=12;
    }

    for(let i=s.bullets.length-1;i>=0;i--){
      const b=s.bullets[i];
      b.y+=b.vy;
      if(b.y<-20){ s.bullets.splice(i,1); continue; }
      let hit=false;
      for(let j=s.enemies.length-1;j>=0;j--){
        const e=s.enemies[j];
        if(Math.abs(b.x-e.x)<e.w/2&&Math.abs(b.y-e.y)<e.h/2){
          e.hp--;
          if(e.hp<=0){
            s.explosions.push({x:e.x,y:e.y,r:25,life:20,maxLife:20});
            s.score+=100; s.enemies.splice(j,1);
          }
          s.bullets.splice(i,1); hit=true; break;
        }
      }
      if(!hit&&s.boss){
        const bx=s.boss;
        if(Math.abs(b.x-bx.x)<bx.w/2&&Math.abs(b.y-bx.y)<bx.h/2){
          bx.hp--;
          s.bullets.splice(i,1);
          if(bx.hp<=0){
            s.explosions.push({x:bx.x,y:bx.y,r:60,life:40,maxLife:40});
            s.score+=1000; s.boss=null; s.bossActive=false;
            setScore(s.score);
          }
        }
      }
    }

    for(let i=s.enemies.length-1;i>=0;i--){
      const e=s.enemies[i];
      e.x+=e.vx; e.y+=e.vy;
      if(e.x<0||e.x>W) e.vx=-e.vx;
      if(e.y>H+40){ s.enemies.splice(i,1); continue; }
      e.shootTimer--;
      if(e.type==='shooter'&&e.shootTimer<=0){
        const dx=p.x-e.x, dy=p.y-e.y, d=Math.sqrt(dx*dx+dy*dy)||1;
        s.enemyBullets.push({x:e.x,y:e.y,vx:dx/d*3,vy:dy/d*3});
        e.shootTimer=90+Math.random()*60;
      }
      if(p.iframes===0&&Math.abs(e.x-p.x)<18&&Math.abs(e.y-p.y)<18){
        p.hp--; p.iframes=90; setLives(p.hp);
        s.explosions.push({x:e.x,y:e.y,r:20,life:15,maxLife:15});
        s.enemies.splice(i,1);
        if(p.hp<=0){ s.running=false; setStatus('gameover'); recordGame(false); saveScore('space-shooter',{name:'Player',score:s.score}); return; }
      }
    }

    for(let i=s.enemyBullets.length-1;i>=0;i--){
      const b=s.enemyBullets[i];
      b.x+=b.vx; b.y+=b.vy;
      if(b.x<0||b.x>W||b.y<0||b.y>H){ s.enemyBullets.splice(i,1); continue; }
      if(p.iframes===0&&Math.abs(b.x-p.x)<16&&Math.abs(b.y-p.y)<16){
        p.hp--; p.iframes=90; setLives(p.hp);
        s.enemyBullets.splice(i,1);
        if(p.hp<=0){ s.running=false; setStatus('gameover'); recordGame(false); saveScore('space-shooter',{name:'Player',score:s.score}); return; }
      }
    }

    if(s.boss){
      const bx=s.boss;
      bx.x+=bx.vx;
      if(bx.x<bx.w/2||bx.x>W-bx.w/2) bx.vx=-bx.vx;
      bx.shootTimer--;
      if(bx.shootTimer<=0){
        for(let a=0;a<8;a++){
          const ang=a/8*Math.PI*2;
          s.enemyBullets.push({x:bx.x,y:bx.y,vx:Math.cos(ang)*4,vy:Math.sin(ang)*4});
        }
        bx.shootTimer=50;
      }
    }

    for(let i=s.explosions.length-1;i>=0;i--){
      s.explosions[i].life--;
      if(s.explosions[i].life<=0) s.explosions.splice(i,1);
    }

    if(s.enemies.length===0&&!s.bossActive&&!s.boss){
      s.spawnTimer++;
      if(s.spawnTimer>120){ s.spawnTimer=0; spawnWave(s); }
    }

    setScore(s.score);
  },[recordGame,spawnWave]);

  const gameLoop=useCallback(()=>{
    update(); draw();
    rafRef.current=requestAnimationFrame(gameLoop);
  },[update,draw]);

  const startGame=useCallback(()=>{
    const s=initState();
    s.running=true;
    starsRef.current=makeStars();
    stateRef.current=s;
    setScore(0); setLives(3); setWave(0); setPaused(false); setStatus('playing');
    spawnWave(s);
    cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(gameLoop);
  },[gameLoop,spawnWave]);

  const togglePause=useCallback(()=>{
    if(!stateRef.current) return;
    stateRef.current.paused=!stateRef.current.paused;
    setPaused(p=>!p);
  },[]);

  useEffect(()=>{
    const onDown=(e)=>{ keysRef.current[e.code]=true; ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&e.preventDefault(); if(e.code==='Escape') togglePause(); };
    const onUp=(e)=>{ keysRef.current[e.code]=false; };
    window.addEventListener('keydown',onDown);
    window.addEventListener('keyup',onUp);
    return()=>{ window.removeEventListener('keydown',onDown); window.removeEventListener('keyup',onUp); cancelAnimationFrame(rafRef.current); };
  },[togglePause]);

  useEffect(()=>{ draw(); },[draw]);

  return(
    <ProtectedRoute>
      <GameWrapper gameId="space-shooter" title="Space Shooter" icon="🚀"
        score={score} lives={lives} level={wave} status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause} onRestart={startGame}>
        <div className="flex flex-col items-center gap-3 relative">
          {status==='menu'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-4">
                <div className="text-5xl">🚀</div>
                <h2 className="text-2xl font-bold">Space Shooter</h2>
                <p className="text-sm text-[#555]">Survive waves. Beat the boss every 5 waves.</p>
                <button onClick={startGame} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Launch</button>
                <p className="text-xs text-[#333]">Arrow Keys / WASD to move • Space / Z to shoot</p>
              </div>
            </div>
          )}
          {status==='gameover'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                <p className="text-2xl font-bold mb-1">Mission Failed</p>
                <p className="text-3xl font-mono font-bold mb-1">{score.toLocaleString()}</p>
                <p className="text-sm text-[#555] mb-5">Wave {wave}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={startGame} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Try Again</button>
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
            style={{border:'1px solid #1a1a1a',maxWidth:'90vw',maxHeight:'76vh',objectFit:'contain'}} />
        </div>
      </GameWrapper>
    </ProtectedRoute>
  );
}

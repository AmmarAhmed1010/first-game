'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { useControls } from '@/context/ControlsContext';
import { saveScore } from '@/lib/storage';

const W=800,H=600,TOTAL_LAPS=3;

// Oval track waypoints (center of track)
const WAYPOINTS=[
  {x:400,y:100},{x:580,y:110},{x:680,y:160},{x:720,y:250},
  {x:720,y:350},{x:680,y:440},{x:580,y:490},{x:400,y:500},
  {x:220,y:490},{x:120,y:440},{x:80,y:350},
  {x:80,y:250},{x:120,y:160},{x:220,y:110},
];
const TRACK_WIDTH=80;

function initCar(x,y,angle,color,isAI,wpIdx){
  return{x,y,angle,speed:0,maxSpeed:isAI?4.2:5.5,accel:0.18,friction:0.94,
    steerSpeed:0.055,color,isAI,hp:3,
    lap:0,wpIdx:wpIdx||0,finished:false,
    checkpointTimer:0,
  };
}

function initState(n){
  return{
    cars:[
      initCar(370,530,0,'#ffffff',false,0),
      initCar(430,530,0,'#888888',true,0),
      initCar(400,555,0,'#555555',true,0),
    ].map((c,i)=>({...c,isAI:i>0||i>=n})).slice(0,3),
    running:false,paused:false,time:0,winner:null,
  };
}

function drawTrack(ctx){
  ctx.strokeStyle='#222';ctx.lineWidth=TRACK_WIDTH*2;
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();
  WAYPOINTS.forEach((p,i)=>{
    if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
  });
  ctx.closePath();ctx.stroke();

  ctx.strokeStyle='#111';ctx.lineWidth=TRACK_WIDTH*2-8;
  ctx.beginPath();
  WAYPOINTS.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.closePath();ctx.stroke();

  ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=2;ctx.setLineDash([12,10]);
  ctx.beginPath();
  WAYPOINTS.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.closePath();ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish line
  const s=WAYPOINTS[0],s2=WAYPOINTS[WAYPOINTS.length-1];
  ctx.strokeStyle='#fff';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(s.x-40,s.y-20);ctx.lineTo(s.x+40,s.y-20);ctx.stroke();
}

export default function RacingArenaPage(){
  const {recordGame}=useAuth();
  const {controls}=useControls();
  const canvasRef=useRef(null);
  const stateRef=useRef(null);
  const rafRef=useRef(null);
  const keysRef=useRef({});

  const [status,setStatus]=useState('menu');
  const [mode,setMode]=useState('1p');
  const [paused,setPaused]=useState(false);
  const [laps,setLaps]=useState([0,0,0]);
  const [winner,setWinner]=useState(null);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,W,H);
    drawTrack(ctx);
    const s=stateRef.current;
    if(!s)return;
    s.cars.forEach((car,i)=>{
      ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.angle);
      ctx.fillStyle=car.color+(car.isAI?'99':'');
      ctx.beginPath();ctx.roundRect(-10,-16,20,32,3);ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.5)';
      ctx.fillRect(-7,-10,14,10);
      ctx.restore();
      ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='bold 11px monospace';ctx.textAlign='center';
      ctx.fillText(`P${i+1}${car.isAI?' AI':''}`,car.x,car.y-22);
      if(car.lap>0){
        ctx.fillStyle=car.color;
        ctx.fillText(`${car.lap}/${TOTAL_LAPS}`,car.x,car.y+32);
      }
    });
    // HUD
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,36);
    s.cars.forEach((car,i)=>{
      ctx.fillStyle=car.color;ctx.font='13px monospace';ctx.textAlign='left';
      ctx.fillText(`P${i+1}: Lap ${car.lap}/${TOTAL_LAPS}`,12+i*200,22);
    });
  },[]);

  const updateAICar=useCallback((car)=>{
    const wp=WAYPOINTS[car.wpIdx%WAYPOINTS.length];
    const dx=wp.x-car.x,dy=wp.y-car.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const targetAngle=Math.atan2(dx,-(dy));
    let diff=targetAngle-car.angle;
    while(diff>Math.PI)diff-=Math.PI*2;
    while(diff<-Math.PI)diff+=Math.PI*2;
    car.angle+=Math.sign(diff)*Math.min(Math.abs(diff),car.steerSpeed*1.2);
    if(dist<35){
      car.wpIdx++;
      if(car.wpIdx>=WAYPOINTS.length){
        car.wpIdx=0;
        car.lap++;
      }
    }
    car.speed=Math.min(car.maxSpeed,car.speed+car.accel);
    car.x+=Math.sin(car.angle)*car.speed;
    car.y-=Math.cos(car.angle)*car.speed;
  },[]);

  const update=useCallback(()=>{
    const s=stateRef.current;
    if(!s?.running||s.paused)return;

    s.cars.forEach((car,i)=>{
      if(car.finished)return;
      if(car.isAI){
        updateAICar(car);
      } else {
        const c=controls[`p${i+1}`];
        if(c){
          if(keysRef.current[c.up])    car.speed=Math.min(car.maxSpeed,car.speed+car.accel);
          if(keysRef.current[c.down])  car.speed=Math.max(-2,car.speed-car.accel*1.5);
          if(keysRef.current[c.left])  car.angle-=car.steerSpeed*(car.speed/car.maxSpeed);
          if(keysRef.current[c.right]) car.angle+=car.steerSpeed*(car.speed/car.maxSpeed);
        }
        car.speed*=car.friction;
        car.x+=Math.sin(car.angle)*car.speed;
        car.y-=Math.cos(car.angle)*car.speed;
        car.x=Math.max(0,Math.min(W,car.x));
        car.y=Math.max(0,Math.min(H,car.y));

        // checkpoint via waypoints
        const wp=WAYPOINTS[car.wpIdx%WAYPOINTS.length];
        const dx=wp.x-car.x,dy=wp.y-car.y;
        if(Math.sqrt(dx*dx+dy*dy)<45){
          car.wpIdx++;
          if(car.wpIdx>=WAYPOINTS.length){
            car.wpIdx=0;
            car.lap++;
          }
        }
      }

      if(car.lap>=TOTAL_LAPS&&!car.finished){
        car.finished=true;
        if(!s.winner){
          s.winner=i;
          s.running=false;
          setWinner(i);
          setStatus('gameover');
          recordGame(!car.isAI);
          saveScore('racing-arena',{name:`P${i+1}`,score:car.isAI?0:1000});
        }
      }
    });

    setLaps(s.cars.map(c=>c.lap));
    draw();
  },[controls,draw,updateAICar,recordGame]);

  const gameLoop=useCallback(()=>{update();rafRef.current=requestAnimationFrame(gameLoop);},[update]);

  const startGame=useCallback((n=1)=>{
    const s=initState(n);
    s.running=true;
    stateRef.current=s;
    setLaps([0,0,0]);setWinner(null);setPaused(false);setStatus('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(gameLoop);
  },[gameLoop]);

  const togglePause=useCallback(()=>{
    if(!stateRef.current)return;
    stateRef.current.paused=!stateRef.current.paused;
    setPaused(p=>!p);
  },[]);

  useEffect(()=>{
    const onDown=(e)=>{
      keysRef.current[e.code]=true;
      ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&e.preventDefault();
      if(e.code==='Escape')togglePause();
    };
    const onUp=(e)=>{keysRef.current[e.code]=false;};
    window.addEventListener('keydown',onDown);
    window.addEventListener('keyup',onUp);
    return()=>{window.removeEventListener('keydown',onDown);window.removeEventListener('keyup',onUp);cancelAnimationFrame(rafRef.current);};
  },[togglePause]);

  useEffect(()=>{draw();},[draw]);

  return(
    <ProtectedRoute>
      <GameWrapper gameId="racing-arena" title="Racing Arena" icon="🏎️"
        level={laps[0]} status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause}
        onRestart={()=>startGame(mode==='2p'?2:1)}>
        <div className="flex flex-col items-center gap-3 relative">
          {status==='menu'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-5">
                <div className="text-5xl">🏎️</div>
                <h2 className="text-2xl font-bold">Racing Arena</h2>
                <p className="text-sm text-[#555]">Complete {TOTAL_LAPS} laps first to win!</p>
                <div className="flex gap-2 mb-1">
                  {['1p','2p'].map(m=>(
                    <button key={m} onClick={()=>setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode===m?'bg-white text-black':'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                      {m==='1p'?'1 Player (vs AI)':'2 Players'}
                    </button>
                  ))}
                </div>
                <button onClick={()=>startGame(mode==='2p'?2:1)} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Race!</button>
                <p className="text-xs text-[#333]">W/S or ↑/↓ = Accelerate/Brake | A/D or ←/→ = Steer</p>
              </div>
            </div>
          )}
          {status==='gameover'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                <p className="text-2xl font-bold mb-4">
                  {winner===0?'🏆 You Win!':stateRef.current?.cars[winner]?.isAI?'🤖 AI Wins!':'🏆 Player 2 Wins!'}
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>startGame(mode==='2p'?2:1)} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Race Again</button>
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

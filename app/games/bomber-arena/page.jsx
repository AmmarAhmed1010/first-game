'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { useControls } from '@/context/ControlsContext';
import { saveScore } from '@/lib/storage';

const COLS=13,ROWS=13,CELL=44,W=COLS*CELL,H=ROWS*CELL;
const BOMB_TIMER=150,EXPLOSION_TIME=40,EXPLOSION_RANGE=3;
// Cell types
const EMPTY=0,WALL=1,BLOCK=2,BOMB=3,EXPLOSION=4;

function makeGrid(){
  const g=Array.from({length:ROWS},()=>Array(COLS).fill(EMPTY));
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(r%2===0&&c%2===0) g[r][c]=WALL;
    else if(r>1&&c>1&&!(r<=2&&c<=2)&&!(r<=2&&c>=COLS-3)&&!(r>=ROWS-3&&c<=2)&&Math.random()<0.45) g[r][c]=BLOCK;
  }
  g[1][1]=EMPTY;g[1][2]=EMPTY;g[2][1]=EMPTY;
  g[1][COLS-2]=EMPTY;g[1][COLS-3]=EMPTY;g[2][COLS-2]=EMPTY;
  g[ROWS-2][1]=EMPTY;g[ROWS-2][2]=EMPTY;g[ROWS-3][1]=EMPTY;
  return g;
}

function initState(n){
  const grid=makeGrid();
  return{
    grid,
    players:[
      {x:1,y:1,color:'#fff',alive:true,isAI:false,bombCooldown:0,bombs:2,range:EXPLOSION_RANGE,aiTimer:0,aiDir:[1,0]},
      {x:COLS-2,y:1,color:'#aaa',alive:true,isAI:n<2,bombCooldown:0,bombs:2,range:EXPLOSION_RANGE,aiTimer:0,aiDir:[-1,0]},
      {x:1,y:ROWS-2,color:'#666',alive:true,isAI:n<3,bombCooldown:0,bombs:2,range:EXPLOSION_RANGE,aiTimer:0,aiDir:[0,-1]},
    ].slice(0,3),
    activeBombs:[],explosions:[],
    running:false,paused:false,winner:null,
  };
}

export default function BomberArenaPage(){
  const {recordGame}=useAuth();
  const {controls}=useControls();
  const canvasRef=useRef(null);
  const stateRef=useRef(null);
  const tickRef=useRef(null);
  const keysRef=useRef({});
  const [status,setStatus]=useState('menu');
  const [mode,setMode]=useState('1p');
  const [paused,setPaused]=useState(false);
  const [aliveCounts,setAlive]=useState([true,true,true]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const s=stateRef.current;
    ctx.fillStyle='#0d0d0d';ctx.fillRect(0,0,W,H);
    if(!s)return;
    const {grid,players,activeBombs,explosions}=s;

    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const cell=grid[r][c];
      const px=c*CELL,py=r*CELL;
      if(cell===WALL){
        ctx.fillStyle='#1a1a1a';ctx.fillRect(px,py,CELL,CELL);
        ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;ctx.strokeRect(px+0.5,py+0.5,CELL-1,CELL-1);
      } else if(cell===EMPTY){
        ctx.fillStyle='#0a0a0a';ctx.fillRect(px,py,CELL,CELL);
        ctx.strokeStyle='rgba(255,255,255,0.02)';ctx.lineWidth=0.5;ctx.strokeRect(px,py,CELL,CELL);
      } else if(cell===BLOCK){
        ctx.fillStyle='#2a2a2a';ctx.fillRect(px+2,py+2,CELL-4,CELL-4);
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;ctx.strokeRect(px+2,py+2,CELL-4,CELL-4);
      }
    }

    explosions.forEach(e=>{
      const a=e.life/EXPLOSION_TIME;
      ctx.fillStyle=`rgba(255,${150*a+50},0,${a*0.85})`;
      ctx.beginPath();ctx.roundRect(e.x*CELL+4,e.y*CELL+4,CELL-8,CELL-8,4);ctx.fill();
    });

    activeBombs.forEach(b=>{
      const pct=b.timer/BOMB_TIMER;
      ctx.fillStyle=pct<0.3?'#ff4444':'#fff';
      ctx.font=`${22+Math.sin(b.timer*0.2)*3}px monospace`;ctx.textAlign='center';
      ctx.fillText('💣',b.x*CELL+CELL/2,b.y*CELL+CELL/2+7);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px monospace';
      ctx.fillText(Math.ceil(b.timer/60),b.x*CELL+CELL/2,b.y*CELL+8);
    });

    players.forEach((p,i)=>{
      if(!p.alive)return;
      const px=p.x*CELL+CELL/2,py=p.y*CELL+CELL/2;
      ctx.fillStyle=p.isAI?p.color+'99':p.color;
      ctx.beginPath();ctx.arc(px,py,CELL/2-5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';ctx.font='bold 12px monospace';ctx.textAlign='center';
      ctx.fillText(p.isAI?'A':`${i+1}`,px,py+4);
    });
  },[]);

  const explode=useCallback((bomb,s)=>{
    const {grid,players,activeBombs,explosions}=s;
    grid[bomb.y][bomb.x]=EMPTY;
    const cells=[[bomb.x,bomb.y]];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      for(let i=1;i<=bomb.range;i++){
        const nx=bomb.x+dx*i,ny=bomb.y+dy*i;
        if(nx<0||nx>=COLS||ny<0||ny>=ROWS||grid[ny][nx]===WALL)break;
        cells.push([nx,ny]);
        if(grid[ny][nx]===BLOCK){grid[ny][nx]=EMPTY;break;}
        const chainBomb=activeBombs.findIndex(b=>b.x===nx&&b.y===ny);
        if(chainBomb>=0){const cb=activeBombs.splice(chainBomb,1)[0];explode(cb,s);}
      }
    }
    cells.forEach(([x,y])=>explosions.push({x,y,life:EXPLOSION_TIME,maxLife:EXPLOSION_TIME}));
    players.forEach(p=>{
      if(p.alive&&cells.some(([x,y])=>x===p.x&&y===p.y)){p.alive=false;}
    });
  },[]);

  const gameTick=useCallback(()=>{
    const s=stateRef.current;
    if(!s?.running||s.paused)return;
    const {grid,players,activeBombs,explosions}=s;

    for(let i=activeBombs.length-1;i>=0;i--){
      activeBombs[i].timer--;
      if(activeBombs[i].timer<=0){const b=activeBombs.splice(i,1)[0];explode(b,s);}
    }
    for(let i=explosions.length-1;i>=0;i--){
      explosions[i].life--;
      if(explosions[i].life<=0)explosions.splice(i,1);
    }

    players.forEach((p,i)=>{
      if(!p.alive)return;
      p.bombCooldown=Math.max(0,p.bombCooldown-1);
      p.aiTimer=Math.max(0,(p.aiTimer||0)-1);

      if(p.isAI){
        if(p.aiTimer<=0){
          const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
          const safe=dirs.filter(([dx,dy])=>{
            const nx=p.x+dx,ny=p.y+dy;
            if(nx<0||nx>=COLS||ny<0||ny>=ROWS)return false;
            if(grid[ny][nx]!==EMPTY)return false;
            return!explosions.some(e=>e.x===nx&&e.y===ny);
          });
          if(safe.length>0){
            p.aiDir=safe[Math.floor(Math.random()*safe.length)];
          }
          p.aiTimer=18+Math.floor(Math.random()*20);

          const humanPlayer=players.find(hp=>!hp.isAI&&hp.alive);
          if(humanPlayer&&p.bombCooldown===0&&Math.abs(humanPlayer.x-p.x)+Math.abs(humanPlayer.y-p.y)<4){
            activeBombs.push({x:p.x,y:p.y,timer:BOMB_TIMER,range:p.range,owner:i});
            grid[p.y][p.x]=BOMB;
            p.bombCooldown=60;
          }
        }
        const [dx,dy]=p.aiDir;
        const nx=p.x+dx,ny=p.y+dy;
        if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&grid[ny][nx]===EMPTY&&!explosions.some(e=>e.x===nx&&e.y===ny)){
          p.x=nx;p.y=ny;
        }
      } else {
        const c=controls[`p${i+1}`];
        if(c){
          let moved=false;
          const tryMove=(dx,dy)=>{
            if(moved)return;
            const nx=p.x+dx,ny=p.y+dy;
            if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&grid[ny][nx]===EMPTY){p.x=nx;p.y=ny;moved=true;}
          };
          if(keysRef.current[c.up])    tryMove(0,-1);
          if(keysRef.current[c.down])  tryMove(0,1);
          if(keysRef.current[c.left])  tryMove(-1,0);
          if(keysRef.current[c.right]) tryMove(1,0);
          if(keysRef.current[c.action]&&p.bombCooldown===0&&grid[p.y][p.x]===EMPTY){
            activeBombs.push({x:p.x,y:p.y,timer:BOMB_TIMER,range:p.range,owner:i});
            grid[p.y][p.x]=BOMB;
            p.bombCooldown=40;
          }
        }
      }
    });

    players.forEach(p=>{
      if(p.alive&&explosions.some(e=>e.x===p.x&&e.y===p.y))p.alive=false;
    });

    setAlive(players.map(p=>p.alive));
    const alive=players.filter(p=>p.alive);
    if(alive.length<=1&&!s.winner){
      s.winner=alive[0]?players.indexOf(alive[0]):null;
      s.running=false;
      setStatus('gameover');
      const humanWon=alive[0]&&!alive[0].isAI;
      recordGame(humanWon);
      saveScore('bomber-arena',{name:'Player',score:humanWon?500:0});
    }
    draw();
  },[controls,draw,explode,recordGame]);

  const startGame=useCallback((n=1)=>{
    const s=initState(n);
    s.running=true;
    stateRef.current=s;
    setAlive([true,true,true]);setPaused(false);setStatus('playing');
    clearInterval(tickRef.current);
    tickRef.current=setInterval(gameTick,100);
  },[gameTick]);

  const togglePause=useCallback(()=>{
    if(!stateRef.current)return;
    stateRef.current.paused=!stateRef.current.paused;
    setPaused(p=>!p);
  },[]);

  useEffect(()=>{
    const onDown=(e)=>{
      keysRef.current[e.code]=true;
      ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&e.preventDefault();
      if(e.code==='Escape')togglePause();
    };
    const onUp=(e)=>{delete keysRef.current[e.code];};
    window.addEventListener('keydown',onDown);
    window.addEventListener('keyup',onUp);
    return()=>{window.removeEventListener('keydown',onDown);window.removeEventListener('keyup',onUp);clearInterval(tickRef.current);};
  },[togglePause]);

  useEffect(()=>{draw();},[draw]);

  const modeMap={'1p':1,'2p':2,'3p':3};

  return(
    <ProtectedRoute>
      <GameWrapper gameId="bomber-arena" title="Bomber Arena" icon="💣" status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause}
        onRestart={()=>startGame(modeMap[mode]||1)}>
        <div className="flex flex-col items-center gap-3 relative">
          {status==='menu'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-5">
                <div className="text-5xl">💣</div>
                <h2 className="text-2xl font-bold">Bomber Arena</h2>
                <p className="text-sm text-[#555]">Place bombs. Destroy blocks. Eliminate enemies.</p>
                <div className="flex gap-2 mb-1">
                  {[['1p','1 Player'],['2p','2 Players'],['3p','3 Players']].map(([m,label])=>(
                    <button key={m} onClick={()=>setMode(m)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${mode===m?'bg-white text-black':'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>startGame(modeMap[mode])} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Start</button>
                <div className="text-xs text-[#333] text-center space-y-1">
                  <p>P1: WASD + Space=Bomb</p>
                  <p>P2: Arrow Keys + Enter=Bomb</p>
                  <p>P3: IJKL + O=Bomb</p>
                </div>
              </div>
            </div>
          )}
          {status==='gameover'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                {stateRef.current?.winner!=null?(
                  <p className="text-2xl font-bold mb-4">
                    {!stateRef.current.players[stateRef.current.winner]?.isAI
                      ?`🏆 Player ${stateRef.current.winner+1} Wins!`
                      :`🤖 AI Wins!`}
                  </p>
                ):(
                  <p className="text-2xl font-bold mb-4">💥 Draw!</p>
                )}
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>startGame(modeMap[mode])} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">Play Again</button>
                  <button onClick={()=>{stateRef.current=null;setStatus('menu');clearInterval(tickRef.current);draw();}} className="px-5 py-2 rounded-xl glass border border-white/10 text-sm">Menu</button>
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

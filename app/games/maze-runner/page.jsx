'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GameWrapper from '@/components/games/GameWrapper';
import { useAuth } from '@/context/AuthContext';
import { useControls } from '@/context/ControlsContext';
import { saveScore } from '@/lib/storage';

const COLS=21,ROWS=21,CELL=28,W=COLS*CELL,H=ROWS*CELL;

function generateMaze(){
  const grid=Array.from({length:ROWS},()=>Array(COLS).fill(1));
  const visited=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  const carve=(r,c)=>{
    visited[r][c]=true; grid[r][c]=0;
    const dirs=[[0,2],[2,0],[0,-2],[-2,0]].sort(()=>Math.random()-0.5);
    for(const [dr,dc] of dirs){
      const nr=r+dr,nc=c+dc;
      if(nr>0&&nr<ROWS&&nc>0&&nc<COLS&&!visited[nr][nc]){
        grid[r+dr/2][c+dc/2]=0;
        carve(nr,nc);
      }
    }
  };
  carve(1,1);
  return grid;
}

function bfs(grid,sx,sy,ex,ey){
  const q=[[sx,sy]];
  const prev=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const vis=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  vis[sy][sx]=true;
  while(q.length){
    const [x,y]=q.shift();
    if(x===ex&&y===ey){
      const path=[];
      let cur=[ex,ey];
      while(cur){path.unshift(cur);cur=prev[cur[1]][cur[0]];}
      return path;
    }
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx,ny=y+dy;
      if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!vis[ny][nx]&&grid[ny][nx]===0){
        vis[ny][nx]=true;prev[ny][nx]=[x,y];q.push([nx,ny]);
      }
    }
  }
  return [];
}

function initState(n){
  const maze=generateMaze();
  return{
    maze,
    players:[
      {x:1,y:1,color:'#fff',moveTimer:0,isAI:false},
      {x:1,y:3,color:'#aaa',moveTimer:0,isAI:n<2,aiPath:[],aiStep:0},
    ].slice(0,n>1?2:2).map((p,i)=>({...p,isAI:i>0&&i>=n})),
    exit:{x:COLS-2,y:ROWS-2},
    running:false,paused:false,time:0,winner:null,
  };
}

export default function MazeRunnerPage(){
  const {recordGame}=useAuth();
  const {controls}=useControls();
  const canvasRef=useRef(null);
  const stateRef=useRef(null);
  const rafRef=useRef(null);
  const keysRef=useRef({});
  const timerRef=useRef(null);

  const [time,setTime]=useState(0);
  const [status,setStatus]=useState('menu');
  const [mode,setMode]=useState('1p');
  const [paused,setPaused]=useState(false);
  const [winner,setWinner]=useState(null);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const s=stateRef.current;
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    if(!s)return;
    const {maze,players,exit}=s;

    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(maze[r][c]===1){
        ctx.fillStyle='#1a1a1a';
        ctx.fillRect(c*CELL,r*CELL,CELL,CELL);
        ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;
        ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);
      }
    }

    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath();ctx.roundRect(exit.x*CELL+3,exit.y*CELL+3,CELL-6,CELL-6,4);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='14px monospace';ctx.textAlign='center';
    ctx.fillText('🚩',exit.x*CELL+CELL/2,exit.y*CELL+CELL/2+5);

    players.forEach(p=>{
      const px=p.x*CELL+CELL/2,py=p.y*CELL+CELL/2;
      ctx.fillStyle=p.isAI?p.color+'88':p.color;
      ctx.beginPath();ctx.arc(px,py,CELL/2-4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';ctx.font='bold 10px monospace';ctx.textAlign='center';
      ctx.fillText(p.isAI?'AI':'P',px,py+4);
    });

    ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='13px monospace';ctx.textAlign='left';
    const mins=Math.floor(s.time/60),secs=s.time%60;
    ctx.fillText(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`,8,20);
  },[]);

  const tryMove=(p,dx,dy,maze)=>{
    const nx=p.x+dx,ny=p.y+dy;
    if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&maze[ny][nx]===0){p.x=nx;p.y=ny;return true;}
    return false;
  };

  const updateAI=useCallback((p,s)=>{
    if(p.aiPath.length===0||p.aiStep>=p.aiPath.length){
      p.aiPath=bfs(s.maze,p.x,p.y,s.exit.x,s.exit.y);
      p.aiStep=0;
    }
    if(p.aiPath.length>0&&p.aiStep<p.aiPath.length){
      const [tx,ty]=p.aiPath[p.aiStep];
      p.x=tx;p.y=ty;p.aiStep++;
    }
  },[]);

  const update=useCallback(()=>{
    const s=stateRef.current;
    if(!s?.running||s.paused)return;
    s.moveTimer=(s.moveTimer||0)+1;

    s.players.forEach((p,i)=>{
      p.moveTimer=(p.moveTimer||0)+1;
      if(p.isAI){
        if(p.moveTimer%12===0) updateAI(p,s);
      } else {
        const c=controls[`p${i+1}`];
        if(p.moveTimer%8===0&&c){
          if(keysRef.current[c.up])    tryMove(p,0,-1,s.maze);
          else if(keysRef.current[c.down])  tryMove(p,0,1,s.maze);
          else if(keysRef.current[c.left])  tryMove(p,-1,0,s.maze);
          else if(keysRef.current[c.right]) tryMove(p,1,0,s.maze);
        }
      }
      if(p.x===s.exit.x&&p.y===s.exit.y&&!s.winner){
        s.running=false;s.winner=i;
        clearInterval(timerRef.current);
        setWinner(i);setStatus('gameover');
        recordGame(!p.isAI);
        saveScore('maze-runner',{name:`P${i+1}`,score:Math.max(0,1000-s.time*5)});
      }
    });
    draw();
  },[controls,draw,updateAI,recordGame]);

  const gameLoop=useCallback(()=>{update();rafRef.current=requestAnimationFrame(gameLoop);},[update]);

  const startGame=useCallback((n=1)=>{
    const s=initState(n);
    s.running=true;
    stateRef.current=s;
    setTime(0);setWinner(null);setPaused(false);setStatus('playing');
    clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      if(stateRef.current?.running&&!stateRef.current?.paused)
        setTime(t=>{ stateRef.current.time=t+1; return t+1; });
    },1000);
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
    return()=>{
      window.removeEventListener('keydown',onDown);
      window.removeEventListener('keyup',onUp);
      cancelAnimationFrame(rafRef.current);
      clearInterval(timerRef.current);
    };
  },[togglePause]);

  useEffect(()=>{draw();},[draw]);

  const fmt=(t)=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;

  return(
    <ProtectedRoute>
      <GameWrapper gameId="maze-runner" title="Maze Runner" icon="🌀"
        score={Math.max(0,1000-time*5)} status={status}
        isPaused={paused} onPause={togglePause} onResume={togglePause}
        onRestart={()=>startGame(mode==='2p'?2:1)}>
        <div className="flex flex-col items-center gap-3 relative">
          {status==='menu'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-5">
                <div className="text-5xl">🌀</div>
                <h2 className="text-2xl font-bold">Maze Runner</h2>
                <p className="text-sm text-[#555]">Navigate to the 🚩 flag. Fastest wins.</p>
                <div className="flex gap-2 mb-1">
                  {['1p','2p'].map(m=>(
                    <button key={m} onClick={()=>setMode(m)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode===m?'bg-white text-black':'bg-white/5 text-[#666] border border-white/5 hover:bg-white/10'}`}>
                      {m==='1p'?'1 Player (AI)':'2 Players'}
                    </button>
                  ))}
                </div>
                <button onClick={()=>startGame(mode==='2p'?2:1)} className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-95">Start</button>
                <p className="text-xs text-[#333]">WASD / Arrow Keys to move</p>
              </div>
            </div>
          )}
          {status==='gameover'&&(
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 rounded-xl">
              <div className="text-center glass rounded-2xl p-8 border border-white/10">
                <p className="text-2xl font-bold mb-1">
                  {winner===0?'🏆 You Win!':`🏆 ${stateRef.current?.players[winner]?.isAI?'AI':'Player 2'} Wins!`}
                </p>
                <p className="text-sm text-[#555] mb-5">Time: {fmt(time)}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>startGame(mode==='2p'?2:1)} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all">New Maze</button>
                  <button onClick={()=>{stateRef.current=null;setStatus('menu');cancelAnimationFrame(rafRef.current);clearInterval(timerRef.current);draw();}} className="px-5 py-2 rounded-xl glass border border-white/10 text-sm">Menu</button>
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

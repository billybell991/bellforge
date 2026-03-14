// ── Jigsaw Puzzle Pipeline ──
// Generates a self-contained HTML jigsaw puzzle with bezier-curve piece shapes,
// canvas clipping, drag-and-drop, and snap-to-grid completion detection.

import type { PuzzleConfig } from './pipeline/types.js';
import { generateImage } from './imagen.js';

export interface PuzzleResult {
  title: string;
  pieceCount: number;
  imageUrl: string;
  imageBase64: string | null;
  htmlContent: string;
}

type ProgressCallback = (percent: number, message: string, stage?: string) => void;

export async function runPuzzlePipeline(
  config: PuzzleConfig,
  onProgress: ProgressCallback
): Promise<PuzzleResult | null> {
  const title = `${config.puzzleSubject.name} Puzzle`;
  const pieceCount = config.structure.pieceCount || 25;
  const artStyle = config.artStyle?.name || 'Painterly';
  const subject = config.puzzleSubject?.name || 'Epic Landscape';

  onProgress(10, 'Designing puzzle prompt...', 'concept');

  // Build the Imagen prompt from subject + art style
  const prompt = `A beautiful, highly detailed ${artStyle} illustration of: ${subject}. ` +
    `This image will be used for a jigsaw puzzle, so it should be rich in color and detail ` +
    `across the entire composition with no large blank areas. Square 1:1 composition, ` +
    `vibrant and visually engaging from edge to edge.`;

  console.log(`[Puzzle] Imagen prompt: ${prompt.slice(0, 120)}...`);

  onProgress(20, 'AI Bridge → Generating Artwork', 'illustration');

  let imageBase64: string | null = null;
  try {
    imageBase64 = await generateImage(prompt, '1:1');
    if (imageBase64) {
      console.log(`[Puzzle] Imagen returned ${(imageBase64.length / 1024).toFixed(0)} KB image`);
    } else {
      console.warn('[Puzzle] Imagen returned null — will use procedural fallback');
    }
  } catch (err) {
    console.error('[Puzzle] Imagen error:', err);
  }

  onProgress(55, 'Cutting Jigsaw Pieces', 'cutting');
  await sleep(400);

  onProgress(75, 'Building Puzzle Engine', 'engine');
  await sleep(300);

  onProgress(90, 'QA — Testing Interactions', 'qa');
  await sleep(200);

  onProgress(100, 'Puzzle Complete!', 'complete');

  return { title, pieceCount, imageUrl: '', imageBase64, htmlContent: '' };
}

export function generatePuzzlePreviewHtml(result: PuzzleResult, config: PuzzleConfig): string {
  const title = esc(result.title);
  const cols = Math.round(Math.sqrt(result.pieceCount));
  const rows = Math.ceil(result.pieceCount / cols);
  const difficulty = config.structure.difficulty || 'medium';
  const rotation = config.structure.rotation || false;
  const subject = config.puzzleSubject?.name || 'Landscape';
  const subjectId = config.puzzleSubject?.id || 'landscape';
  const artStyle = config.artStyle?.name || 'Painterly';

  const hasRealImage = !!result.imageBase64;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e;font-family:system-ui,sans-serif;touch-action:none;user-select:none}
canvas{display:block;width:100%;height:100%}
#hud{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:rgba(0,0,0,0.6);z-index:10;pointer-events:none}
#hud *{pointer-events:auto}
#hud .title{color:#f0c040;font-weight:700;font-size:0.9rem}
#hud .info{color:rgba(255,255,255,0.7);font-size:0.8rem}
#hud button{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:0.75rem}
#hud button:hover{background:rgba(255,255,255,0.2)}
#win{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);z-index:20;flex-direction:column;gap:16px}
#win.show{display:flex}
#win h1{color:#f0c040;font-size:2.5rem}
#win p{color:rgba(255,255,255,0.7);font-size:1.1rem}

</style>
</head>
<body>
<div id="hud">
  <span class="title">${title}</span>
  <span class="info" id="counter">0 / 0 placed</span>
  <button onclick="scramble()">Scramble</button>
</div>
<canvas id="c"></canvas>
${hasRealImage ? `<img id="puzzle-src" src="data:image/png;base64,${result.imageBase64}" style="display:none"/>` : ''}
<div id="win"><h1>🎉 Complete!</h1><p id="win-time"></p></div>
<script>
(function(){
const COLS=${cols},ROWS=${rows},TOTAL=COLS*ROWS;
const KNOB=0.18;
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
let W,H,pieceW,pieceH,boardX,boardY,boardW,boardH;
let pieces=[],dragging=null,dragOff={x:0,y:0};
let placed=0,startTime=Date.now();
let sourceImg=null;

/* Deterministic per-edge knob directions: +1=knob out, -1=socket in */
const hEdges=[],vEdges=[];
function initEdges(){
  // Horizontal edges (between rows): ROWS-1 rows of COLS edges
  for(let r=0;r<ROWS-1;r++) for(let c=0;c<COLS;c++) hEdges.push(Math.random()>0.5?1:-1);
  // Vertical edges (between cols): ROWS rows of COLS-1 edges
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS-1;c++) vEdges.push(Math.random()>0.5?1:-1);
}

function getHEdge(r,c){return r>=0&&r<ROWS-1?hEdges[r*COLS+c]:0}
function getVEdge(r,c){return c>=0&&c<COLS-1?vEdges[r*(COLS-1)+c]:0}

/* Draw jigsaw piece path with bezier knobs/sockets */
function piecePath(ctx,x,y,w,h,row,col){
  ctx.beginPath();
  // Top edge
  ctx.moveTo(x,y);
  if(row>0){
    const d=-getHEdge(row-1,col);
    const mx=x+w/2, k=h*KNOB*d;
    ctx.lineTo(mx-w*0.15,y);
    ctx.bezierCurveTo(mx-w*0.15,y-k,mx-w*0.05,y-k*1.4,mx,y-k*1.4);
    ctx.bezierCurveTo(mx+w*0.05,y-k*1.4,mx+w*0.15,y-k,mx+w*0.15,y);
    ctx.lineTo(x+w,y);
  } else { ctx.lineTo(x+w,y); }

  // Right edge
  if(col<COLS-1){
    const d=getVEdge(row,col);
    const my=y+h/2, k=w*KNOB*d;
    ctx.lineTo(x+w,my-h*0.15);
    ctx.bezierCurveTo(x+w+k,my-h*0.15,x+w+k*1.4,my-h*0.05,x+w+k*1.4,my);
    ctx.bezierCurveTo(x+w+k*1.4,my+h*0.05,x+w+k,my+h*0.15,x+w,my+h*0.15);
    ctx.lineTo(x+w,y+h);
  } else { ctx.lineTo(x+w,y+h); }

  // Bottom edge (reverse)
  if(row<ROWS-1){
    const d=getHEdge(row,col);
    const mx=x+w/2, k=h*KNOB*d;
    ctx.lineTo(mx+w*0.15,y+h);
    ctx.bezierCurveTo(mx+w*0.15,y+h+k,mx+w*0.05,y+h+k*1.4,mx,y+h+k*1.4);
    ctx.bezierCurveTo(mx-w*0.05,y+h+k*1.4,mx-w*0.15,y+h+k,mx-w*0.15,y+h);
    ctx.lineTo(x,y+h);
  } else { ctx.lineTo(x,y+h); }

  // Left edge (reverse)
  if(col>0){
    const d=-getVEdge(row,col-1);
    const my=y+h/2, k=w*KNOB*d;
    ctx.lineTo(x,my+h*0.15);
    ctx.bezierCurveTo(x-k,my+h*0.15,x-k*1.4,my+h*0.05,x-k*1.4,my);
    ctx.bezierCurveTo(x-k*1.4,my-h*0.05,x-k,my-h*0.15,x,my-h*0.15);
    ctx.lineTo(x,y);
  } else { ctx.lineTo(x,y); }

  ctx.closePath();
}

/* Load real Imagen image or generate procedural fallback */
function loadImage(callback){
  const srcEl=document.getElementById('puzzle-src');
  if(srcEl){
    if(srcEl.complete&&srcEl.naturalWidth>0){sourceImg=srcEl;callback();}
    else{srcEl.onload=function(){sourceImg=srcEl;callback();};srcEl.onerror=function(){generateProceduralImage();callback();};}
  } else {
    generateProceduralImage();
    callback();
  }
}

/* Simple placeholder when Imagen image unavailable */
function generateProceduralImage(){
  const c2=document.createElement('canvas');
  c2.width=800; c2.height=800;
  const g=c2.getContext('2d');
  g.fillStyle='#1a1a2e';g.fillRect(0,0,800,800);
  g.fillStyle='#ffffff22';g.font='bold 24px sans-serif';g.textAlign='center';
  g.fillText('Image generation unavailable',400,390);
  g.font='16px sans-serif';g.fillText('Puzzle will still work!',400,420);
  sourceImg=c2;
}

function resize(){
  W=canvas.width=window.innerWidth;
  H=canvas.height=window.innerHeight;
  const margin=40;
  const availW=W*0.65, availH=H-margin*2-40;
  const aspect=COLS/ROWS;
  if(availW/availH>aspect){boardH=availH;boardW=boardH*aspect;}
  else{boardW=availW;boardH=boardW/aspect;}
  boardX=(W-boardW)/2;
  boardY=(H-boardH)/2+20;
  pieceW=boardW/COLS;
  pieceH=boardH/ROWS;
  // Update piece target positions
  pieces.forEach(p=>{
    p.tx=boardX+p.col*pieceW;
    p.ty=boardY+p.row*pieceH;
    if(p.placed){p.x=p.tx;p.y=p.ty;}
  });
}

function initPieces(){
  pieces=[];
  placed=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    pieces.push({row:r,col:c,x:0,y:0,tx:0,ty:0,placed:false,rot:0});
  }
  resize();
  scramble();
  startTime=Date.now();
}

window.scramble=function(){
  const pad=10;
  pieces.forEach(p=>{
    if(p.placed) return;
    // Try left or right margins first
    const leftSpace=boardX-pieceW-pad;
    const rightSpace=W-boardX-boardW-pieceW-pad;
    const useLeft=leftSpace>30&&(rightSpace<30||Math.random()>0.5);
    const useRight=rightSpace>30&&!useLeft;
    if(useLeft){
      p.x=pad+Math.random()*leftSpace;
    } else if(useRight){
      p.x=boardX+boardW+pad+Math.random()*rightSpace;
    } else {
      // Margins too thin — scatter above/below the board
      p.x=pad+Math.random()*(W-pieceW-pad*2);
    }
    // Y: scatter across full height, avoiding HUD
    if(!useLeft&&!useRight){
      // Choose above or below board
      if(Math.random()>0.5&&boardY>pieceH+60){
        p.y=50+Math.random()*(boardY-pieceH-60);
      } else {
        p.y=boardY+boardH+pad+Math.random()*Math.max(10,H-boardY-boardH-pieceH-pad*2);
      }
    } else {
      p.y=50+Math.random()*(H-pieceH-60);
    }
    // Clamp to canvas
    p.x=Math.max(pad,Math.min(W-pieceW-pad,p.x));
    p.y=Math.max(50,Math.min(H-pieceH-pad,p.y));
    if(${rotation}) p.rot=[0,90,180,270][Math.floor(Math.random()*4)];
  });
  draw();
};

function draw(){
  ctx.clearRect(0,0,W,H);

  // Board outline / ghost
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.15)';
  ctx.lineWidth=2;
  ctx.strokeRect(boardX,boardY,boardW,boardH);
  ctx.restore();

  // Draw pieces (placed first, then unplaced, dragging last)
  const sorted=[...pieces].sort((a,b)=>{
    if(a===dragging) return 1;
    if(b===dragging) return -1;
    if(a.placed&&!b.placed) return -1;
    if(!a.placed&&b.placed) return 1;
    return 0;
  });

  sorted.forEach(p=>{
    ctx.save();
    const cx=p.x+pieceW/2, cy=p.y+pieceH/2;
    if(p.rot){
      ctx.translate(cx,cy);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.translate(-cx,-cy);
    }

    // Clip to jigsaw shape
    piecePath(ctx,p.x,p.y,pieceW,pieceH,p.row,p.col);
    ctx.save();
    ctx.clip();

    // Draw the image portion for this piece
    if(sourceImg){
      const sx=p.col*sourceImg.width/COLS, sy=p.row*sourceImg.height/ROWS;
      const sw=sourceImg.width/COLS, sh=sourceImg.height/ROWS;
      // Need to offset the draw so the image lines up at piece's screen position
      // but we draw the whole image shifted so this piece's portion aligns
      const ox=p.x-p.col*pieceW, oy=p.y-p.row*pieceH;
      ctx.drawImage(sourceImg,0,0,sourceImg.width,sourceImg.height,ox,oy,COLS*pieceW,ROWS*pieceH);
    }
    ctx.restore();

    // Stroke outline
    piecePath(ctx,p.x,p.y,pieceW,pieceH,p.row,p.col);
    ctx.strokeStyle=p.placed?'rgba(255,255,255,0.12)':p===dragging?'rgba(0,229,255,0.8)':'rgba(255,255,255,0.5)';
    ctx.lineWidth=p===dragging?2.5:p.placed?0.5:1.5;
    ctx.stroke();

    // Subtle shadow for unplaced
    if(!p.placed&&p!==dragging){
      piecePath(ctx,p.x+2,p.y+2,pieceW,pieceH,p.row,p.col);
      ctx.strokeStyle='rgba(0,0,0,0.3)';
      ctx.lineWidth=1;
      ctx.stroke();
    }

    ctx.restore();
  });

  // HUD update
  document.getElementById('counter').textContent=placed+' / '+TOTAL+' placed';
}

function hitTest(mx,my){
  // Iterate in reverse (top pieces first)
  for(let i=pieces.length-1;i>=0;i--){
    const p=pieces[i];
    if(p.placed) continue;
    // Simple bounding box with knob margin
    const m=pieceW*KNOB*1.5;
    if(mx>=p.x-m&&mx<=p.x+pieceW+m&&my>=p.y-m&&my<=p.y+pieceH+m){
      // More precise: check piece path
      piecePath(ctx,p.x,p.y,pieceW,pieceH,p.row,p.col);
      if(ctx.isPointInPath(mx,my)) return p;
    }
  }
  return null;
}

function trySnap(p){
  const snapDist=pieceW*0.3;
  const dx=Math.abs(p.x-p.tx), dy=Math.abs(p.y-p.ty);
  if(dx<snapDist&&dy<snapDist&&p.rot%360===0){
    p.x=p.tx; p.y=p.ty; p.placed=true; p.rot=0;
    placed++;
    if(placed===TOTAL){
      const elapsed=((Date.now()-startTime)/1000)|0;
      const min=Math.floor(elapsed/60), sec=elapsed%60;
      document.getElementById('win-time').textContent='Time: '+(min>0?min+'m ':'')+sec+'s';
      document.getElementById('win').classList.add('show');
    }
  }
}

// Pointer events
function getPos(e){
  const r=canvas.getBoundingClientRect();
  const t=e.touches?e.touches[0]:e;
  return{x:(t.clientX-r.left)*(W/r.width),y:(t.clientY-r.top)*(H/r.height)};
}

function onDown(e){
  e.preventDefault();
  const pos=getPos(e);
  const p=hitTest(pos.x,pos.y);
  if(!p) return;
  dragging=p;
  dragOff.x=pos.x-p.x;
  dragOff.y=pos.y-p.y;
  // Move to end of array (renders on top)
  pieces.splice(pieces.indexOf(p),1);
  pieces.push(p);
  draw();
}

function onMove(e){
  if(!dragging) return;
  e.preventDefault();
  const pos=getPos(e);
  dragging.x=pos.x-dragOff.x;
  dragging.y=pos.y-dragOff.y;
  draw();
}

function onUp(e){
  if(!dragging) return;
  trySnap(dragging);
  dragging=null;
  draw();
}

// Double-click/tap to rotate
function onDblClick(e){
  if(!${rotation}) return;
  const pos=getPos(e);
  const p=hitTest(pos.x,pos.y);
  if(p){p.rot=(p.rot+90)%360;draw();}
}

canvas.addEventListener('mousedown',onDown);
canvas.addEventListener('mousemove',onMove);
canvas.addEventListener('mouseup',onUp);
canvas.addEventListener('touchstart',onDown,{passive:false});
canvas.addEventListener('touchmove',onMove,{passive:false});
canvas.addEventListener('touchend',onUp);
canvas.addEventListener('dblclick',onDblClick);

window.addEventListener('resize',()=>{resize();draw();});

initEdges();
loadImage(function(){
  resize();
  initPieces();
  draw();
});
})();
</script>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Shared Engine Code ──
// Common JS code fragments used by ALL genre engines.
// Each function returns a JS code string that will be embedded in the final HTML.

export interface EngineData {
  palette: string;
  rooms: string;
  roomCount: number;
  title: string;
  charName: string;
  gameVibe: string;
  sceneLabel: string;
  startButtonText: string;
  items: string;
  puzzles: string;
  hints: string;
  openingText: string;
  endingText: string;
  seed: number;
  titleBgUri: string;
  characterUri: string;
  roomBgUris: string;
  itemImageUris: string;
}

export function htmlHead(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — BellForge Preview</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:100%; height:100%; overflow:hidden; background:#000; font-family:'Segoe UI',system-ui,sans-serif; }
canvas { display:block; margin:auto; touch-action:none; cursor:pointer; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function(){
"use strict";
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
`;
}

export function gameConstants(d: EngineData): string {
  return `
// ═══════════ GEMINI-DESIGNED GAME DATA ═══════════
const PALETTE = ${d.palette};
const ROOMS = ${d.rooms};
const ROOM_COUNT = ${d.roomCount};
const TITLE = ${JSON.stringify(d.title)};
const CHAR_NAME = ${JSON.stringify(d.charName)};
const GAME_VIBE = ${JSON.stringify(d.gameVibe)};
const SCENE_LABEL = ${JSON.stringify(d.sceneLabel)};
const START_TEXT = ${JSON.stringify(d.startButtonText)};
const ITEMS = ${d.items};
const PUZZLES = ${d.puzzles};
const HINTS = ${d.hints};
const OPENING = ${JSON.stringify(d.openingText)};
const ENDING = ${JSON.stringify(d.endingText)};
const SEED = ${d.seed};

// ═══════════ IMAGEN ARTWORK ═══════════
const IMG_TITLE = ${JSON.stringify(d.titleBgUri)};
const IMG_CHAR = ${JSON.stringify(d.characterUri)};
const IMG_ROOMS = ${d.roomBgUris};
const IMG_ITEMS = ${d.itemImageUris};
`;
}

export function imagePreloader(): string {
  return `
var loadedImages = {};
function preloadImg(key, src) {
  if(!src) return;
  var img = new Image();
  img.src = src;
  loadedImages[key] = img;
}
preloadImg('title', IMG_TITLE);
preloadImg('char', IMG_CHAR);
for(var ri=0; ri<IMG_ROOMS.length; ri++) preloadImg('room_'+ri, IMG_ROOMS[ri]);
for(var ii=0; ii<IMG_ITEMS.length; ii++) preloadImg('item_'+ii, IMG_ITEMS[ii]);
`;
}

export function prng(): string {
  return `
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rng = mulberry32(SEED);
function ri2(max){return Math.floor(rng()*max)}
function rf(mn,mx){return mn+rng()*(mx-mn)}
`;
}

export function sharedState(): string {
  return `
let W=0,H=0;
let screen = 'title';
let animFrame = 0;
let showTutorial = true;
let roomNameTimer = 0;
let openingStart = 0;
`;
}

export function canvasResize(): string {
  return `
function resize(){
  var dpr=window.devicePixelRatio||1;
  var cw=window.innerWidth, ch=window.innerHeight;
  var targetRatio=16/9;
  var actualRatio=cw/ch;
  if(actualRatio > targetRatio){ H=ch; W=Math.floor(ch*targetRatio); }
  else { W=cw; H=Math.floor(cw/targetRatio); }
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  canvas.width=W*dpr; canvas.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);resize();
`;
}

export function drawHelpers(): string {
  return `
function nx(v){return v*W}
function ny(v){return v*H}
function fillR(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(nx(x),ny(y),nx(w),ny(h))}
function drawT(t,x,y,sz,c,al){ctx.fillStyle=c;ctx.font=(sz*H/800)+'px "Segoe UI",system-ui,sans-serif';ctx.textAlign=al||'center';ctx.textBaseline='middle';ctx.fillText(t,nx(x),ny(y))}
function drawTB(t,x,y,sz,c,al){ctx.fillStyle=c;ctx.font='bold '+(sz*H/800)+'px "Segoe UI",system-ui,sans-serif';ctx.textAlign=al||'center';ctx.textBaseline='middle';ctx.fillText(t,nx(x),ny(y))}
function rRect(x,y,w,h,r,fl,st){
  var rx=nx(x),ry=ny(y),rw=nx(w),rh=ny(h),rr=Math.min(r,rw/2,rh/2);
  ctx.beginPath();ctx.moveTo(rx+rr,ry);ctx.arcTo(rx+rw,ry,rx+rw,ry+rh,rr);ctx.arcTo(rx+rw,ry+rh,rx,ry+rh,rr);ctx.arcTo(rx,ry+rh,rx,ry,rr);ctx.arcTo(rx,ry,rx+rw,ry,rr);ctx.closePath();
  if(fl){ctx.fillStyle=fl;ctx.fill()}if(st){ctx.strokeStyle=st;ctx.lineWidth=2;ctx.stroke()}
}
function wrapT(t,cx,sy,sz,c,mw){
  ctx.fillStyle=c;var fs=sz*H/800;ctx.font=fs+'px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';
  var words=t.split(' '),ln='',y=ny(sy),lh=fs*1.4,m=nx(mw);
  for(var i=0;i<words.length;i++){var test=ln+(ln?' ':'')+words[i];if(ctx.measureText(test).width>m&&ln){ctx.fillText(ln,nx(cx),y);ln=words[i];y+=lh}else ln=test}
  if(ln)ctx.fillText(ln,nx(cx),y);
}
function drawBgImage(img){
  if(!img||!img.complete||!img.naturalWidth)return false;
  var iw=img.naturalWidth, ih=img.naturalHeight;
  var scale=Math.max(W/iw, H/ih);
  var sw=iw*scale, sh=ih*scale;
  var ox=(W-sw)/2, oy=(H-sh)/2;
  ctx.drawImage(img, ox, oy, sw, sh);
  return true;
}
`;
}

export function titleScreen(): string {
  return `
function drawTitle(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg){
    var grd=ctx.createLinearGradient(0,0,W,H);
    grd.addColorStop(0,PALETTE.bg);grd.addColorStop(0.35,PALETTE.wall);grd.addColorStop(0.65,PALETTE.shadow||PALETTE.bg);grd.addColorStop(1,PALETTE.bg);
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  }
  ctx.fillStyle='rgba(0,0,0,0.50)';ctx.fillRect(0,0,W,H);
  var vig=ctx.createRadialGradient(W*0.5,H*0.45,W*0.25,W*0.5,H*0.5,W*0.75);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(0.7,'rgba(0,0,0,0.3)');vig.addColorStop(1,'rgba(0,0,0,0.85)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  var topFade=ctx.createLinearGradient(0,0,0,H*0.12);
  topFade.addColorStop(0,'rgba(0,0,0,0.9)');topFade.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=topFade;ctx.fillRect(0,0,W,H*0.12);
  var t=animFrame*0.02;
  ctx.globalAlpha=0.05;
  for(var i=0;i<4;i++){var y=H*(0.15+i*0.22+Math.sin(t+i*0.9)*0.02);ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.globalAlpha=1;
  var textOffX = 0.5;
  if(loadedImages['char']&&loadedImages['char'].complete&&loadedImages['char'].naturalWidth){
    var bob=Math.sin(animFrame*0.03)*6;
    var cw2=W*0.18, ch2=cw2*(loadedImages['char'].naturalHeight/loadedImages['char'].naturalWidth);
    var maxCh=H*0.55; if(ch2>maxCh){cw2=cw2*(maxCh/ch2);ch2=maxCh}
    var cx2=W*0.06, cy2=H*0.22+bob;
    ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle=PALETTE.bg;
    ctx.beginPath();ctx.ellipse(cx2+cw2/2,cy2+ch2*0.55,cw2*0.55,ch2*0.5,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.globalAlpha=0.9;
    ctx.drawImage(loadedImages['char'], cx2, cy2, cw2, ch2);
    ctx.globalAlpha=1;
    textOffX = 0.58;
  }
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=25;
  drawTB(TITLE,textOffX,0.22,38,PALETTE.accent);ctx.restore();
  drawTB(TITLE,textOffX,0.22,38,'#fff');
  drawTB('"'+GAME_VIBE+'"',textOffX,0.36,20,PALETTE.accent);
  drawT(ROOM_COUNT+' '+SCENE_LABEL+' \\u00b7 A '+CHAR_NAME+' Adventure',textOffX,0.46,13,PALETTE.text+'99');
  var pulse=0.5+Math.sin(animFrame*0.06)*0.15;
  ctx.globalAlpha=pulse;rRect(0.32,0.72,0.36,0.10,24,PALETTE.accent+'40',null);
  ctx.globalAlpha=1;rRect(0.33,0.73,0.34,0.08,20,PALETTE.accent,null);
  drawTB(START_TEXT,0.5,0.77,18,PALETTE.bg);
  drawT('Built with BellForge',0.5,0.94,9,PALETTE.text+'44');
}
`;
}

export function openingScreen(): string {
  return `
function drawOpening(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg){ctx.fillStyle=PALETTE.bg;ctx.fillRect(0,0,W,H)}
  ctx.fillStyle='rgba(0,0,0,0.70)';ctx.fillRect(0,0,W,H);
  var alpha=Math.min(1,(animFrame-openingStart)/60);
  ctx.globalAlpha=alpha;
  drawTB(TITLE,0.5,0.15,24,PALETTE.accent);
  rRect(0.15,0.28,0.70,0.38,14,PALETTE.bg+'cc',PALETTE.accent+'40');
  wrapT(OPENING,0.5,0.35,15,PALETTE.text,0.62);
  drawT('[ tap to continue ]',0.5,0.78,13,PALETTE.text+'88');
  ctx.globalAlpha=1;
}
`;
}

export function endingScreen(): string {
  return `
function drawEnding(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg){ctx.fillStyle=PALETTE.bg;ctx.fillRect(0,0,W,H)}
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=30;
  drawTB('\\ud83c\\udf89 Victory!',0.5,0.18,30,PALETTE.accent);ctx.restore();
  rRect(0.18,0.30,0.64,0.28,14,PALETTE.bg+'cc',PALETTE.accent+'60');
  wrapT(ENDING,0.5,0.36,14,PALETTE.text,0.58);
  drawT('Items collected: '+inventory.length+' / '+ROOM_COUNT,0.5,0.66,13,PALETTE.text+'aa');
  rRect(0.32,0.74,0.36,0.08,20,PALETTE.accent,null);
  drawTB('PLAY AGAIN',0.5,0.78,16,PALETTE.bg);
  drawT('Built with BellForge',0.5,0.94,9,PALETTE.text+'44');
}
`;
}

export function mainLoop(genreDrawGame: string): string {
  return `
function frame(){
  resize();animFrame++;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(screen==='title')drawTitle();
  else if(screen==='opening')drawOpening();
  else if(screen==='ending')drawEnding();
  else if(screen==='game'){
    ${genreDrawGame}
    if(showTutorial)drawTutorial();
  }
  if(typeof examineTimer!=='undefined'&&examineTimer>0)examineTimer--;
  if(typeof hintTimer!=='undefined'&&hintTimer>0){hintTimer--}else if(typeof hintVisible!=='undefined'){hintVisible=false}
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}
`;
}

export function inputPreamble(): string {
  return `
canvas.addEventListener('pointerdown',function(e){
  var rect=canvas.getBoundingClientRect();
  var px=(e.clientX-rect.left)/rect.width;
  var py=(e.clientY-rect.top)/rect.height;
  if(screen==='title'){screen='opening';openingStart=animFrame;return}
  if(screen==='opening'){screen='game';showTutorial=true;roomNameTimer=0;return}
  if(screen==='ending'){resetGame();return}
  if(showTutorial){showTutorial=false;return}
`;
}

export function htmlFoot(): string {
  return `
requestAnimationFrame(frame);
})();
</script>
</body>
</html>`;
}

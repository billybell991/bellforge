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
  packIconUri: string;
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
const IMG_PACK = ${JSON.stringify(d.packIconUri)};
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
preloadImg('pack', IMG_PACK);
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
function drawTGlow(t,x,y,sz,c,blur){
  ctx.save();ctx.shadowColor=c;ctx.shadowBlur=blur||15;
  drawTB(t,x,y,sz,c);ctx.restore();
  drawTB(t,x,y,sz,'#fff');
}
function rRect(x,y,w,h,r,fl,st){
  var rx=nx(x),ry=ny(y),rw=nx(w),rh=ny(h),rr=Math.min(r,rw/2,rh/2);
  ctx.beginPath();ctx.moveTo(rx+rr,ry);ctx.arcTo(rx+rw,ry,rx+rw,ry+rh,rr);ctx.arcTo(rx+rw,ry+rh,rx,ry+rh,rr);ctx.arcTo(rx,ry+rh,rx,ry,rr);ctx.arcTo(rx,ry,rx+rw,ry,rr);ctx.closePath();
  if(fl){ctx.fillStyle=fl;ctx.fill()}if(st){ctx.strokeStyle=st;ctx.lineWidth=2;ctx.stroke()}
}
function glowRect(x,y,w,h,r,bgCol,glowCol){
  rRect(x,y,w,h,r,bgCol+'cc',null);
  ctx.save();ctx.shadowColor=glowCol;ctx.shadowBlur=12;
  var rx=nx(x),ry=ny(y),rw=nx(w),rh=ny(h),rr=Math.min(r,rw/2,rh/2);
  ctx.beginPath();ctx.moveTo(rx+rr,ry);ctx.arcTo(rx+rw,ry,rx+rw,ry+rh,rr);ctx.arcTo(rx+rw,ry+rh,rx,ry+rh,rr);ctx.arcTo(rx,ry+rh,rx,ry,rr);ctx.arcTo(rx,ry,rx+rw,ry,rr);ctx.closePath();
  ctx.strokeStyle=glowCol;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
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
var cleanedChar=null;
function getCleanChar(){
  if(cleanedChar)return cleanedChar;
  var img=loadedImages['char'];
  if(!img||!img.complete||!img.naturalWidth)return null;
  var tc=document.createElement('canvas');
  tc.width=img.naturalWidth;tc.height=img.naturalHeight;
  var tctx=tc.getContext('2d');
  tctx.drawImage(img,0,0);
  var d=tctx.getImageData(0,0,tc.width,tc.height);
  var px=d.data;
  for(var i=0;i<px.length;i+=4){
    var br=(px[i]+px[i+1]+px[i+2])/3;
    if(br<30){px[i+3]=0}else if(br<60){px[i+3]=Math.floor((br-30)/30*255)}
  }
  tctx.putImageData(d,0,0);
  cleanedChar=tc;return tc;
}

// ══ Ambient particle system ══
var particles=[];
function initParticles(count){
  particles=[];
  for(var i=0;i<count;i++){
    particles.push({x:Math.random(),y:Math.random(),s:0.5+Math.random()*1.5,sp:0.0002+Math.random()*0.0008,a:0.1+Math.random()*0.4,dx:Math.random()*0.0004-0.0002});
  }
}
initParticles(50);
function drawParticles(c,dir){
  var d=dir||1;
  for(var i=0;i<particles.length;i++){
    var p=particles[i];
    p.y+=p.sp*d;p.x+=p.dx;
    if(d>0&&p.y>1.05){p.y=-0.02;p.x=Math.random()}
    if(d<0&&p.y<-0.05){p.y=1.02;p.x=Math.random()}
    if(p.x<-0.02)p.x=1.02;if(p.x>1.02)p.x=-0.02;
    ctx.globalAlpha=p.a*(0.5+0.5*Math.sin(animFrame*0.03+i));
    ctx.fillStyle=c;
    ctx.beginPath();ctx.arc(nx(p.x),ny(p.y),p.s,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

// ══ Atmospheric fallback background ══
function drawFallbackBg(){
  var g1=ctx.createLinearGradient(0,0,W*0.3,H);
  g1.addColorStop(0,PALETTE.shadow||PALETTE.bg);g1.addColorStop(0.5,PALETTE.bg);g1.addColorStop(1,PALETTE.wall);
  ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);
  // Radial light source from upper area
  var rl=ctx.createRadialGradient(W*0.5,H*0.2,0,W*0.5,H*0.3,W*0.7);
  rl.addColorStop(0,PALETTE.accent+'18');rl.addColorStop(0.4,PALETTE.accent+'08');rl.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rl;ctx.fillRect(0,0,W,H);
  // Silhouette shapes (distant architecture/landscape)
  ctx.fillStyle=PALETTE.bg+'cc';
  var t=animFrame*0.003;
  for(var i=0;i<7;i++){
    var bx=i*0.16-0.04+Math.sin(t+i*1.3)*0.005;
    var bh=0.15+Math.sin(i*2.7)*0.12;
    var by=0.82-bh;
    ctx.fillRect(nx(bx),ny(by),nx(0.08),ny(bh+0.20));
  }
  // Ground mist
  var mist=ctx.createLinearGradient(0,H*0.85,0,H);
  mist.addColorStop(0,'rgba(0,0,0,0)');mist.addColorStop(0.5,PALETTE.accent+'0c');mist.addColorStop(1,PALETTE.bg+'88');
  ctx.fillStyle=mist;ctx.fillRect(0,H*0.85,W,H*0.15);
  // Ambient particles
  drawParticles(PALETTE.accent,-1);
  // Scanline overlay
  ctx.globalAlpha=0.03;
  for(var s=0;s<H;s+=4){ctx.fillStyle=s%8<4?'#000':'#fff';ctx.fillRect(0,s,W,1)}
  ctx.globalAlpha=1;
}

// ══ Room fallback background ══
function drawRoomFallbackBg(room){
  var wc=room.wallColor||PALETTE.wall;
  var fc=room.floorColor||PALETTE.floor;
  // Perspective room: ceiling, back wall, floor with vanishing point
  var g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,PALETTE.bg);g.addColorStop(0.3,wc);g.addColorStop(0.8,wc);g.addColorStop(1,fc);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Perspective lines from corners to vanishing point
  ctx.save();ctx.globalAlpha=0.08;ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;
  var vx=W*0.5,vy=H*0.35;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(vx,vy);ctx.moveTo(W,0);ctx.lineTo(vx,vy);
  ctx.moveTo(0,H);ctx.lineTo(vx,vy);ctx.moveTo(W,H);ctx.lineTo(vx,vy);ctx.stroke();ctx.restore();
  // Central radial glow
  var rl=ctx.createRadialGradient(vx,vy,0,vx,vy,W*0.5);
  rl.addColorStop(0,PALETTE.accent+'15');rl.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rl;ctx.fillRect(0,0,W,H);
  // Floor reflection line
  ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,H*0.80);ctx.lineTo(W,H*0.80);ctx.stroke();ctx.restore();
  // Light shaft
  ctx.save();ctx.globalAlpha=0.04;
  ctx.fillStyle=PALETTE.accent;
  ctx.beginPath();ctx.moveTo(W*0.35,0);ctx.lineTo(W*0.55,0);ctx.lineTo(W*0.52,H*0.7);ctx.lineTo(W*0.38,H*0.7);ctx.fill();
  ctx.restore();
}
`;
}

export function titleScreen(): string {
  return `
function drawTitle(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg) drawFallbackBg();
  // Dark overlay with radial vignette
  ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,W,H);
  var vig=ctx.createRadialGradient(W*0.5,H*0.40,W*0.18,W*0.5,H*0.5,W*0.85);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(0.6,'rgba(0,0,0,0.25)');vig.addColorStop(1,'rgba(0,0,0,0.80)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  // Animated accent lines with glow
  var t=animFrame*0.015;
  ctx.save();
  for(var i=0;i<3;i++){
    var ly=H*(0.30+i*0.20+Math.sin(t+i*1.1)*0.015);
    ctx.globalAlpha=0.08+Math.sin(t*0.7+i)*0.04;
    ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=8;
    ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(W,ly);ctx.stroke();
  }
  ctx.restore();

  // ── Character art ──
  var textOffX = 0.5;
  var charSrc=getCleanChar();
  if(charSrc){
    var bob=Math.sin(animFrame*0.025)*5;
    var cw2=W*0.18, ch2=cw2*(loadedImages['char'].naturalHeight/loadedImages['char'].naturalWidth);
    var maxCh=H*0.55; if(ch2>maxCh){cw2=cw2*(maxCh/ch2);ch2=maxCh}
    var cx2=W*0.06, cy2=H*0.20+bob;
    // Glow behind character
    ctx.save();
    var cGlow=ctx.createRadialGradient(cx2+cw2/2,cy2+ch2*0.5, cw2*0.2, cx2+cw2/2,cy2+ch2*0.5, cw2*0.8);
    cGlow.addColorStop(0,PALETTE.accent+'30');cGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cGlow;ctx.fillRect(cx2-cw2*0.3,cy2-ch2*0.1,cw2*1.6,ch2*1.3);
    // Shadow under character
    ctx.globalAlpha=0.25;ctx.fillStyle=PALETTE.bg;
    ctx.beginPath();ctx.ellipse(cx2+cw2/2,cy2+ch2+8,cw2*0.4,10,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.drawImage(charSrc, cx2, cy2, cw2, ch2);
    textOffX = 0.56;
  }

  // ── Title text with multi-layer glow ──
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=35;
  drawTB(TITLE,textOffX,0.20,38,PALETTE.accent);
  ctx.shadowBlur=12;
  drawTB(TITLE,textOffX,0.20,38,PALETTE.accent);ctx.restore();
  drawTB(TITLE,textOffX,0.20,38,'#fff');

  // Subtitle / game vibe
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=10;
  drawT('"'+GAME_VIBE+'"',textOffX,0.34,17,PALETTE.accent);ctx.restore();
  drawT('"'+GAME_VIBE+'"',textOffX,0.34,17,PALETTE.accent);

  // Scene count
  drawT(ROOM_COUNT+' '+SCENE_LABEL+' \\u00b7 A '+CHAR_NAME+' Adventure',textOffX,0.44,12,PALETTE.text+'88');

  // ── Tap to begin (pulsing) ──
  var pulse=0.35+Math.sin(animFrame*0.04)*0.35;
  ctx.globalAlpha=pulse;
  drawT('tap anywhere to begin',0.5,0.72,14,PALETTE.text);
  ctx.globalAlpha=1;

  // ── How to Play link ──
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=6;
  drawT('How to Play',0.5,0.86,11,PALETTE.accent+'cc');ctx.restore();

  // ── BellForge credit ──
  drawT('Built with BellForge',0.5,0.95,8,PALETTE.text+'33');
}
`;
}

export function openingScreen(): string {
  return `
function drawOpening(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg) drawFallbackBg();
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
  var alpha=Math.min(1,(animFrame-openingStart)/60);
  ctx.globalAlpha=alpha;
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=20;
  drawTB(TITLE,0.5,0.12,22,PALETTE.accent);ctx.restore();
  drawTB(TITLE,0.5,0.12,22,'#fff');
  glowRect(0.12,0.24,0.76,0.44,12,PALETTE.bg,PALETTE.accent+'60');
  wrapT(OPENING,0.5,0.32,14,PALETTE.text,0.68);
  var p2=0.5+Math.sin(animFrame*0.05)*0.3;
  ctx.globalAlpha=alpha*p2;
  drawT('tap to continue',0.5,0.80,13,PALETTE.text+'aa');
  ctx.globalAlpha=1;
}
`;
}

export function endingScreen(): string {
  return `
function drawEnding(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg) drawFallbackBg();
  ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(0,0,W,H);
  drawParticles(PALETTE.accent,-1);
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=40;
  drawTB('\\ud83c\\udf89 Victory!',0.5,0.15,32,PALETTE.accent);ctx.restore();
  drawTB('\\ud83c\\udf89 Victory!',0.5,0.15,32,'#fff');
  glowRect(0.15,0.28,0.70,0.30,14,PALETTE.bg,PALETTE.accent+'70');
  wrapT(ENDING,0.5,0.34,14,PALETTE.text,0.62);
  drawT('Items collected: '+inventory.length+' / '+ROOM_COUNT,0.5,0.64,12,PALETTE.text+'aa');
  // Play again button with glow
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=15;
  rRect(0.32,0.72,0.36,0.08,20,PALETTE.accent,null);ctx.restore();
  rRect(0.32,0.72,0.36,0.08,20,PALETTE.accent,null);
  drawTB('PLAY AGAIN',0.5,0.76,15,PALETTE.bg);
  drawT('Built with BellForge',0.5,0.94,8,PALETTE.text+'33');
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
  else if(screen==='howto'){drawTutorial()}
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
  if(screen==='title'){
    if(py>0.82&&py<0.90&&px>0.35&&px<0.65){screen='howto';return}
    screen='opening';openingStart=animFrame;return;
  }
  if(screen==='howto'){screen='title';return}
  if(screen==='opening'){screen='game';showTutorial=false;roomNameTimer=0;return}
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

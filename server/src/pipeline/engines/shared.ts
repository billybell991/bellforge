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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap" rel="stylesheet">
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
const NEEDS_OPENING = !!(${JSON.stringify(d.openingText)});

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
function drawTTitle(t,x,y,sz,c){ctx.fillStyle=c;ctx.font='900 '+(sz*H/800)+'px Cinzel,"Segoe UI",system-ui,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.letterSpacing=(sz*H/800*0.12)+'px';ctx.fillText(t.toUpperCase(),nx(x),ny(y));ctx.letterSpacing='0px'}
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

// ══ Minimal fallback background (Imagen unavailable) ══
function drawFallbackBg(){
  ctx.fillStyle=PALETTE.bg||'#0f0f1a';ctx.fillRect(0,0,W,H);
  // Subtle vignette (UI chrome, not art)
  var vig=ctx.createRadialGradient(W*0.5,H*0.5,W*0.2,W*0.5,H*0.5,W*0.8);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ══ Minimal room fallback (Imagen unavailable) ══
function drawRoomFallbackBg(room){
  var wc=room.wallColor||PALETTE.wall;
  ctx.fillStyle=wc;ctx.fillRect(0,0,W,H);
  // Simple floor line (UI chrome)
  var fc=room.floorColor||PALETTE.floor;
  ctx.fillStyle=fc;ctx.fillRect(0,H*0.80,W,H*0.20);
  ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,H*0.80);ctx.lineTo(W,H*0.80);ctx.stroke();ctx.restore();
}
`;
}

export function titleScreen(): string {
  return `
var LAYOUTS=[
  {n:"Classic",cx:0.06,cy:0.20,cs:0.18,ch:true,tx:0.56,ty:0.18,ts:55,sy:0.34,gy:0.44,cta:0.72,ht:0.86,bar:true,pan:false},
  {n:"Cinematic",cx:0.41,cy:0.08,cs:0.18,ch:true,tx:0.5,ty:0.68,ts:50,sy:0.76,gy:0.82,cta:0.90,ht:0.95,bar:false,pan:true},
  {n:"Dramatic",cx:0.76,cy:0.38,cs:0.14,ch:true,tx:0.45,ty:0.14,ts:66,sy:0.27,gy:0.33,cta:0.85,ht:0.92,bar:true,pan:false},
  {n:"Split",cx:0.70,cy:0.12,cs:0.20,ch:true,tx:0.28,ty:0.30,ts:58,sy:0.40,gy:0.47,cta:0.75,ht:0.82,bar:false,pan:true},
  {n:"Hero",cx:0,cy:0,cs:0,ch:false,tx:0.5,ty:0.30,ts:70,sy:0.42,gy:0.49,cta:0.75,ht:0.82,bar:true,pan:false}
];
var chosenLayout=LAYOUTS[ri2(LAYOUTS.length)];
function drawTitle(){
  var L=chosenLayout;
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

  // ── Bottom panel (if layout uses it) ──
  if(L.pan){
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(0,H*0.60,W,H*0.40);
    ctx.strokeStyle=PALETTE.accent+'44';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,H*0.60);ctx.lineTo(W,H*0.60);ctx.stroke();
  }

  // ── Banner bar behind title ──
  if(L.bar){
    ctx.save();ctx.globalAlpha=0.12;
    ctx.fillStyle=PALETTE.accent;
    ctx.fillRect(0,ny(L.ty)-H*0.035,W,H*0.07);
    ctx.restore();
    ctx.save();ctx.globalAlpha=0.25;ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,ny(L.ty)-H*0.035);ctx.lineTo(W,ny(L.ty)-H*0.035);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,ny(L.ty)+H*0.035);ctx.lineTo(W,ny(L.ty)+H*0.035);ctx.stroke();
    ctx.restore();
  }

  // ── Character art ──
  var charSrc=L.ch?getCleanChar():null;
  if(charSrc){
    var bob=Math.sin(animFrame*0.025)*5;
    var cw2=W*L.cs, ch2=cw2*(loadedImages['char'].naturalHeight/loadedImages['char'].naturalWidth);
    var maxCh=H*0.55; if(ch2>maxCh){cw2=cw2*(maxCh/ch2);ch2=maxCh}
    var cx2=W*L.cx, cy2=H*L.cy+bob;
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
  }

  // ── Title text with multi-layer glow ──
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=50;
  drawTTitle(TITLE,L.tx,L.ty,L.ts,PALETTE.accent);
  ctx.shadowBlur=20;
  drawTTitle(TITLE,L.tx,L.ty,L.ts,PALETTE.accent);ctx.restore();
  drawTTitle(TITLE,L.tx,L.ty,L.ts,'#fff');

  // Subtitle / game vibe
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=14;
  drawT('"'+GAME_VIBE+'"',L.tx,L.sy,26,PALETTE.accent);ctx.restore();
  drawT('"'+GAME_VIBE+'"',L.tx,L.sy,26,PALETTE.accent);

  // Character tagline
  drawT('A '+CHAR_NAME+' Adventure',L.tx,L.gy,18,PALETTE.text+'aa');

  // ── Tap to begin (pulsing) ──
  var pulse=0.35+Math.sin(animFrame*0.04)*0.35;
  ctx.globalAlpha=pulse;
  drawT('TAP ANYWHERE TO BEGIN',0.5,L.cta,24,PALETTE.text);
  ctx.globalAlpha=1;

  // ── How to Play link ──
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=6;
  drawT('How to Play',0.5,L.ht,18,PALETTE.accent+'cc');ctx.restore();

  // ── BellForge credit ──
  drawT('Built with BellForge',0.5,0.95,9,PALETTE.text+'33');
}
`;
}

export function openingScreen(): string {
  return `
var scrollY = 0;
var scrollSpeed = 0.4;
function drawOpening(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg) drawFallbackBg();
  // Heavy cinematic letterbox + vignette
  ctx.fillStyle='rgba(0,0,0,0.70)';ctx.fillRect(0,0,W,H);
  var vig=ctx.createRadialGradient(W*0.5,H*0.5,W*0.1,W*0.5,H*0.5,W*0.7);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);

  // Fade in
  var fadeIn=Math.min(1,(animFrame-openingStart)/45);
  ctx.globalAlpha=fadeIn;

  // ── Scrolling text crawl ──
  var fs=16*H/800;
  ctx.font=fs+'px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle=PALETTE.text;
  ctx.textAlign='center';
  var maxW=W*0.65;
  // Word-wrap into lines
  var words=OPENING.split(' '),lines=[],ln='';
  for(var i=0;i<words.length;i++){
    var test=ln+(ln?' ':'')+words[i];
    if(ctx.measureText(test).width>maxW&&ln){lines.push(ln);ln=words[i]}else ln=test;
  }
  if(ln)lines.push(ln);
  var lh=fs*1.6;
  var totalH=lines.length*lh;
  // Scroll position: start below screen, crawl up
  scrollY+=scrollSpeed;
  var baseY=H*0.95 - scrollY;
  // Clip to central area
  ctx.save();
  ctx.beginPath();ctx.rect(W*0.1,H*0.08,W*0.8,H*0.80);ctx.clip();
  // Gradient fade at top and bottom edges
  for(var li=0;li<lines.length;li++){
    var ly=baseY+li*lh;
    if(ly<H*0.02||ly>H*0.95) continue; // fully offscreen
    var lineAlpha=1;
    if(ly<H*0.18) lineAlpha=(ly-H*0.02)/(H*0.16); // fade in at top
    if(ly>H*0.78) lineAlpha=(H*0.95-ly)/(H*0.17); // fade out at bottom
    if(lineAlpha<=0) continue;
    ctx.globalAlpha=fadeIn*Math.max(0,Math.min(1,lineAlpha));
    ctx.fillStyle=PALETTE.text;
    ctx.fillText(lines[li],W*0.5,ly);
  }
  ctx.restore();
  // Auto-advance when scroll finishes
  if(baseY+totalH < H*0.1){
    screen='game';showTutorial=false;roomNameTimer=0;
  }
  // ── Skip prompt ──
  ctx.globalAlpha=fadeIn*(0.4+Math.sin(animFrame*0.04)*0.25);
  drawT('tap to skip \u276f',0.88,0.94,12,PALETTE.text+'99','right');
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
    var htY=chosenLayout.ht;
    if(py>htY-0.04&&py<htY+0.04&&px>0.30&&px<0.70){screen='howto';return}
    if(NEEDS_OPENING){screen='opening';openingStart=animFrame;scrollY=0;return}
    screen='game';showTutorial=false;roomNameTimer=0;return;
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

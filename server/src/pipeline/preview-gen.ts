import type { CreativeBrief, CreativeRoom, RoomFurniture, PuzzleConnection } from '../gemini.js';

/**
 * Generates a self-contained HTML5 Canvas game preview.
 * THE WINNING FORMULA (SpaceSloths proven):
 * - Imagen-generated PNG backgrounds for title, rooms, items, character
 * - Code-drawn HUD, doors, hit areas, state indicators on top
 * - Every game gets unique Gemini artwork — no two look alike
 *
 * BellForge UX rules still in effect:
 * - Persistent HUD (menu top-left, hint top-right, pack bottom-right)
 * - Room transitions with crossfade
 * - Examine text near tap point (not fixed position)
 * - Glowing navigation doors with arrows
 * - Puzzle gates (locked doors requiring items)
 * - Context-aware hint system
 * - Opening/ending story screens
 * - Tutorial overlay on first launch
 */

export interface GameImages {
  titleBg: string | null;
  roomBgs: Array<string | null>;
  character: string | null;
  itemImages: Array<string | null>;
}

interface PreviewConfig {
  genre: { id: string; name: string };
  theme: { id: string; name: string; color?: string };
  artStyle: { id: string; name: string };
  structure: { roomCount: number; difficulty: string; puzzleDensity: string };
  story: { title: string; description: string; characterName: string; setting: string };
  seed: number;
  creative: CreativeBrief;
  images: GameImages;
  sceneLabel?: string; // e.g. "rooms", "levels", "chapters" — defaults to "rooms"
}

export function generatePreviewHtml(config: PreviewConfig): string {
  const c = config.creative;
  const palette = c.palette;
  const roomCount = config.structure.roomCount;
  const seed = config.seed;
  const rooms = c.rooms;
  const title = config.story.title || 'Untitled Game';
  const charName = config.story.characterName || 'Protagonist';
  const gameVibe = c.gameVibe;
  const images = config.images;
  const sceneLabel = config.sceneLabel || 'rooms';

  // Themed start button text based on theme + seed
  const THEMED_BUTTONS: Record<string, string[]> = {
    horror: ['Enter If You Dare', 'Face Your Fear', 'Step Into Darkness', 'Descend'],
    fantasy: ['Begin Your Quest', 'Enter the Realm', 'Draw Your Sword', 'Adventure Awaits'],
    scifi: ['Initiate Sequence', 'Launch Mission', 'Engage', 'Step Aboard'],
    mystery: ['Open the Case', 'Begin Investigation', 'Follow the Trail', 'Examine'],
    cozy: ['Come On In', 'Begin Your Day', 'Step Inside', 'Settle In'],
    cyberpunk: ['Jack In', 'Go Online', 'Enter the Grid', 'Connect'],
    steampunk: ['Pull the Lever', 'Engage the Engine', 'Wind the Key', 'Full Steam Ahead'],
    postapoc: ['Brave the Wasteland', 'Venture Out', 'Begin Survival', 'Emerge'],
  };
  const themeButtons = THEMED_BUTTONS[config.theme.id] || ['Begin', 'Enter', 'Start', 'Play'];
  const startButtonText = themeButtons[seed % themeButtons.length];

  // Serialize room data for the client
  const roomsData = rooms.map((r: CreativeRoom) => ({
    name: r.name,
    description: r.description,
    examineText: r.examineText,
    atmosphere: r.atmosphere,
    wallColor: r.wallColor || palette.wall,
    floorColor: r.floorColor || palette.floor,
    ceilingColor: r.ceilingColor || palette.wall,
    furniture: (r.furniture || []).map((f: RoomFurniture) => ({
      type: f.type, x: f.x, y: f.y, w: f.w, h: f.h,
      color: f.color, label: f.label
    })),
    hasWindow: r.hasWindow !== false,
    windowType: r.windowType || 'tall',
    lightingDir: r.lightingDir || 'center',
  }));

  // Build image data URIs for embedding (only include non-null images)
  const titleBgUri = images.titleBg ? `data:image/png;base64,${images.titleBg}` : '';
  const characterUri = images.character ? `data:image/png;base64,${images.character}` : '';
  const roomBgUris = images.roomBgs.map(b => b ? `data:image/png;base64,${b}` : '');
  const itemImageUris = images.itemImages.map(b => b ? `data:image/png;base64,${b}` : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)} — BellForge Preview</title>
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

// ═══════════ GEMINI-DESIGNED GAME DATA ═══════════
const PALETTE = ${JSON.stringify(palette)};
const ROOMS = ${JSON.stringify(roomsData)};
const ROOM_COUNT = ${roomCount};
const TITLE = ${JSON.stringify(title)};
const CHAR_NAME = ${JSON.stringify(charName)};
const GAME_VIBE = ${JSON.stringify(gameVibe)};
const SCENE_LABEL = ${JSON.stringify(sceneLabel)};
const START_TEXT = ${JSON.stringify(startButtonText)};
const ITEMS = ${JSON.stringify(c.items)};
const PUZZLES = ${JSON.stringify(c.puzzles)};
const HINTS = ${JSON.stringify(c.hintTexts)};
const OPENING = ${JSON.stringify(c.openingText)};
const ENDING = ${JSON.stringify(c.endingText)};
const SEED = ${seed};

// ═══════════ IMAGEN ARTWORK ═══════════
const IMG_TITLE = ${JSON.stringify(titleBgUri)};
const IMG_CHAR = ${JSON.stringify(characterUri)};
const IMG_ROOMS = ${JSON.stringify(roomBgUris)};
const IMG_ITEMS = ${JSON.stringify(itemImageUris)};

// Pre-load all images
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

// ═══════════ SEEDED PRNG ═══════════
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rng = mulberry32(SEED);
function ri2(max){return Math.floor(rng()*max)}
function rf(mn,mx){return mn+rng()*(mx-mn)}

// ═══════════ STATE ═══════════
let W=0,H=0;
let screen = 'title';
let currentRoom = 0;
let transitionAlpha = 0;
let inventory = [];
let foundItems = new Set();
let solvedPuzzles = new Set();
let examineText = '';
let examineX = 0.5, examineY = 0.7;
let examineTimer = 0;
let bagOpen = false;
let hintVisible = false;
let hintTimer = 0;
let showTutorial = true;
let animFrame = 0;
let menuOpen = false;
let roomNameTimer = 0;
let openingStart = 0;

// Pre-compute item positions per room (seeded)
const itemPositions = ITEMS.map(function(){return{x:rf(0.15,0.72),y:rf(0.40,0.68)}});

// Pre-compute ambient particles per room
const roomParticles = [];
for(var r=0;r<ROOM_COUNT;r++){
  var ps=[];var count=5+ri2(8);
  for(var i=0;i<count;i++){ps.push({x:rf(0.05,0.95),y:rf(0.05,0.85),size:rf(1,3),speed:rf(0.0003,0.001),phase:rf(0,Math.PI*2)})}
  roomParticles.push(ps);
}

// ═══════════ HELPERS ═══════════
function resize(){
  var dpr=window.devicePixelRatio||1;
  var cw=window.innerWidth, ch=window.innerHeight;
  // Landscape 16:9 aspect ratio, letterboxed
  var targetRatio=16/9;
  var actualRatio=cw/ch;
  if(actualRatio > targetRatio){
    H=ch; W=Math.floor(ch*targetRatio);
  } else {
    W=cw; H=Math.floor(cw/targetRatio);
  }
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  canvas.width=W*dpr; canvas.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);resize();

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

// Draw an image scaled to cover the canvas (like CSS background-size: cover)
function drawBgImage(img){
  if(!img||!img.complete||!img.naturalWidth)return false;
  var iw=img.naturalWidth, ih=img.naturalHeight;
  var scale=Math.max(W/iw, H/ih);
  var sw=iw*scale, sh=ih*scale;
  var ox=(W-sw)/2, oy=(H-sh)/2;
  ctx.drawImage(img, ox, oy, sw, sh);
  return true;
}

// ═══════════ PUZZLE HELPERS ═══════════
function isDoorLocked(fromRoom, toRoom){
  for(var i=0;i<PUZZLES.length;i++){var p=PUZZLES[i];
    if(p.doorInRoom===fromRoom&&p.leadsToRoom===toRoom&&!solvedPuzzles.has(fromRoom+'>'+toRoom))return p;
    if(p.doorInRoom===toRoom&&p.leadsToRoom===fromRoom&&!solvedPuzzles.has(toRoom+'>'+fromRoom))return p;
  }return null;
}
function tryUnlock(fromRoom, toRoom){
  for(var i=0;i<PUZZLES.length;i++){var p=PUZZLES[i];
    var key=p.doorInRoom+'>'+p.leadsToRoom;var rkey=p.leadsToRoom+'>'+p.doorInRoom;
    if((p.doorInRoom===fromRoom&&p.leadsToRoom===toRoom)||(p.doorInRoom===toRoom&&p.leadsToRoom===fromRoom)){
      if(solvedPuzzles.has(key)||solvedPuzzles.has(rkey))return true;
      if(inventory.some(function(it){return it.name===p.requiredItem})){
        solvedPuzzles.add(key);solvedPuzzles.add(rkey);
        examineText=p.unlockedMessage;examineX=0.5;examineY=0.5;examineTimer=180;return true;
      }else{examineText=p.lockedMessage;examineX=0.5;examineY=0.5;examineTimer=150;return false}
    }
  }return true;
}

// ═══════════ TITLE SCREEN ═══════════
function drawTitle(){
  // Background: Imagen art or gradient fallback
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg){
    var grd=ctx.createLinearGradient(0,0,W,H);
    grd.addColorStop(0,PALETTE.bg);grd.addColorStop(0.35,PALETTE.wall);grd.addColorStop(0.65,PALETTE.shadow||PALETTE.bg);grd.addColorStop(1,PALETTE.bg);
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  }
  // Dark overlay for text readability
  ctx.fillStyle='rgba(0,0,0,0.50)';ctx.fillRect(0,0,W,H);
  // Animated accent lines
  var t=animFrame*0.02;
  ctx.globalAlpha=0.05;
  for(var i=0;i<4;i++){var y=H*(0.15+i*0.22+Math.sin(t+i*0.9)*0.02);ctx.strokeStyle=PALETTE.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.globalAlpha=1;
  // Character on left side (if available)
  var textOffX = 0.5; // center by default
  if(loadedImages['char']&&loadedImages['char'].complete&&loadedImages['char'].naturalWidth){
    var bob=Math.sin(animFrame*0.03)*6;
    var cw2=W*0.18, ch2=cw2*(loadedImages['char'].naturalHeight/loadedImages['char'].naturalWidth);
    var maxCh=H*0.55; if(ch2>maxCh){cw2=cw2*(maxCh/ch2);ch2=maxCh}
    ctx.globalAlpha=0.9;
    ctx.drawImage(loadedImages['char'], W*0.06, H*0.22+bob, cw2, ch2);
    ctx.globalAlpha=1;
    textOffX = 0.58; // shift text right when character is shown
  }
  // Title glow
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=25;
  drawTB(TITLE,textOffX,0.22,38,PALETTE.accent);ctx.restore();
  drawTB(TITLE,textOffX,0.22,38,'#fff');
  // Vibe tagline — punchy, large, themed
  drawTB('"'+GAME_VIBE+'"',textOffX,0.36,20,PALETTE.accent);
  // Subtitle line
  drawT(ROOM_COUNT+' '+SCENE_LABEL+' · A '+CHAR_NAME+' Adventure',textOffX,0.46,13,PALETTE.text+'99');
  // Start pulse — centered bottom
  var pulse=0.5+Math.sin(animFrame*0.06)*0.15;
  ctx.globalAlpha=pulse;rRect(0.32,0.72,0.36,0.10,24,PALETTE.accent+'40',null);
  ctx.globalAlpha=1;rRect(0.33,0.73,0.34,0.08,20,PALETTE.accent,null);
  drawTB(START_TEXT,0.5,0.77,18,PALETTE.bg);
  drawT('Built with BellForge',0.5,0.94,9,PALETTE.text+'44');
}

// ═══════════ OPENING ═══════════
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

// ═══════════ TUTORIAL ═══════════
function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTB('How to Play',0.5,0.12,24,PALETTE.accent);
  var tips=['\ud83d\udc46  Tap objects to examine them','\ud83d\udeaa  Tap glowing doors to move between '+SCENE_LABEL,'\u2728  Pick up items \u2014 they go in your pack','\ud83c\udf92  Tap the pack (bottom-right) to see items','\ud83d\udca1  Tap the hint button (top-right) when stuck','\ud83d\udd12  Some doors need an item to open'];
  for(var i=0;i<tips.length;i++){drawT(tips[i],0.5,0.26+i*0.10,13,PALETTE.text)}
  var pulse2=0.6+Math.sin(animFrame*0.08)*0.2;
  ctx.globalAlpha=pulse2;rRect(0.35,0.84,0.30,0.08,18,PALETTE.accent,null);
  ctx.globalAlpha=1;rRect(0.36,0.845,0.28,0.065,16,PALETTE.accent,null);
  drawTB('GOT IT',0.5,0.878,15,PALETTE.bg);
}

// ═══════════ ENDING ═══════════
function drawEnding(){
  var hasImg = drawBgImage(loadedImages['title']);
  if(!hasImg){ctx.fillStyle=PALETTE.bg;ctx.fillRect(0,0,W,H)}
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=30;
  drawTB('\ud83c\udf89 Victory!',0.5,0.18,30,PALETTE.accent);ctx.restore();
  rRect(0.18,0.30,0.64,0.28,14,PALETTE.bg+'cc',PALETTE.accent+'60');
  wrapT(ENDING,0.5,0.36,14,PALETTE.text,0.58);
  drawT('Items collected: '+inventory.length+' / '+ROOM_COUNT,0.5,0.66,13,PALETTE.text+'aa');
  rRect(0.32,0.74,0.36,0.08,20,PALETTE.accent,null);
  drawTB('PLAY AGAIN',0.5,0.78,16,PALETTE.bg);
  drawT('Built with BellForge',0.5,0.94,9,PALETTE.text+'44');
}

// ═══════════ DRAW ROOM ═══════════
function drawRoom(roomIdx){
  var room=ROOMS[roomIdx];

  // Background: Imagen room art or code-drawn fallback
  var hasImg = drawBgImage(loadedImages['room_'+roomIdx]);
  if(!hasImg){
    // Fallback: gradient background with room colors
    ctx.fillStyle=PALETTE.bg;ctx.fillRect(0,0,W,H);
    // Ceiling
    fillR(0,0,1,0.06,room.ceilingColor);
    ctx.globalAlpha=0.3;fillR(0,0.055,1,0.008,PALETTE.accent);ctx.globalAlpha=1;
    // Walls
    fillR(0,0.06,0.04,0.82,room.wallColor);
    fillR(0.96,0.06,0.04,0.82,room.wallColor);
    // Lighting gradient
    var lg=ctx.createLinearGradient(0,0,W,0);var ld=room.lightingDir||'center';
    if(ld==='left'){lg.addColorStop(0,PALETTE.accent+'18');lg.addColorStop(1,'transparent')}
    else if(ld==='right'){lg.addColorStop(0,'transparent');lg.addColorStop(1,PALETTE.accent+'18')}
    else if(ld==='dim'){lg.addColorStop(0,(PALETTE.shadow||'#000')+'40');lg.addColorStop(0.5,(PALETTE.shadow||'#000')+'20');lg.addColorStop(1,(PALETTE.shadow||'#000')+'40')}
    else{lg.addColorStop(0,'transparent');lg.addColorStop(0.5,PALETTE.accent+'0d');lg.addColorStop(1,'transparent')}
    ctx.fillStyle=lg;ctx.fillRect(0,ny(0.06),W,ny(0.82));
    // Window (only in fallback mode)
    if(room.hasWindow){
      var wt=room.windowType||'tall';
      if(wt==='round'){
        ctx.fillStyle=PALETTE.bg+'cc';ctx.beginPath();ctx.arc(nx(0.5),ny(0.22),nx(0.08),0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=PALETTE.accent+'66';ctx.lineWidth=3;ctx.stroke();
      }else if(wt==='wide'){
        rRect(0.25,0.10,0.50,0.16,6,PALETTE.bg+'cc',PALETTE.accent+'66');
      }else{
        rRect(0.38,0.10,0.10,0.28,6,PALETTE.bg+'cc',PALETTE.accent+'66');
        rRect(0.52,0.10,0.10,0.28,6,PALETTE.bg+'cc',PALETTE.accent+'66');
      }
    }
    // Floor
    fillR(0,0.88,1,0.12,room.floorColor);
    fillR(0.04,0.87,0.92,0.015,PALETTE.accent+'30');
    // Furniture (only in fallback mode — when we have room images, skip this)
    if(room.furniture){for(var fi=0;fi<room.furniture.length;fi++){drawFurniture(room.furniture[fi])}}
  } else {
    // With a room image, add a subtle atmospheric overlay
    var lg2=ctx.createLinearGradient(0,0,0,H);
    lg2.addColorStop(0,'rgba(0,0,0,0.1)');lg2.addColorStop(0.5,'rgba(0,0,0,0)');lg2.addColorStop(1,'rgba(0,0,0,0.2)');
    ctx.fillStyle=lg2;ctx.fillRect(0,0,W,H);
  }

  // Ambient particles (always, adds life to both image and fallback rooms)
  var pts=roomParticles[roomIdx];
  ctx.globalAlpha=0.3;
  for(var pi=0;pi<pts.length;pi++){var p=pts[pi];var py2=p.y+Math.sin(animFrame*p.speed*10+p.phase)*0.03;ctx.fillStyle=PALETTE.accent;ctx.beginPath();ctx.arc(nx(p.x),ny(py2),p.size,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;

  // Door glow animation
  var doorGlow=0.3+Math.sin(animFrame*0.05)*0.15;
  if(roomIdx>0){
    var locked=isDoorLocked(roomIdx,roomIdx-1);var dc=locked?'#ff4444':PALETTE.accent;
    ctx.globalAlpha=doorGlow;rRect(0.01,0.30,0.06,0.38,6,dc+'30',null);ctx.globalAlpha=1;
    rRect(0.02,0.32,0.04,0.34,4,dc+'22',dc);
    drawTB(locked?'\\ud83d\\udd12':'\\u25c0',0.04,0.50,20,dc);
  }
  if(roomIdx<ROOM_COUNT-1){
    var locked2=isDoorLocked(roomIdx,roomIdx+1);var dc2=locked2?'#ff4444':PALETTE.accent;
    ctx.globalAlpha=doorGlow;rRect(0.93,0.30,0.06,0.38,6,dc2+'30',null);ctx.globalAlpha=1;
    rRect(0.94,0.32,0.04,0.34,4,dc2+'22',dc2);
    drawTB(locked2?'\\ud83d\\udd12':'\\u25b6',0.96,0.50,20,dc2);
  }

  // Item on floor (if not picked up) — use Imagen item image or emoji fallback
  if(!foundItems.has(roomIdx)){
    var it=ITEMS[roomIdx];var pos=itemPositions[roomIdx];
    if(it&&pos){
      var bob=Math.sin(animFrame*0.04)*0.008;
      var itemImg = loadedImages['item_'+roomIdx];
      if(itemImg&&itemImg.complete&&itemImg.naturalWidth){
        // Glow behind item
        ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=20;
        var isz=nx(0.10);
        ctx.drawImage(itemImg, nx(pos.x)-isz/2, ny(pos.y+bob)-isz/2, isz, isz);
        ctx.restore();
      } else {
        // Emoji fallback with glow
        ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=18;
        rRect(pos.x-0.035,pos.y-0.035,0.07,0.07,10,PALETTE.accent+'35',PALETTE.accent+'aa');ctx.restore();
        drawTB(it.emoji,pos.x,pos.y+bob,28,'#fff');
      }
    }
  }

  // ═══ HUD (always visible — BellForge rule) ═══
  // Room name fade-in
  var nameAlpha=Math.min(1,roomNameTimer/30);
  ctx.globalAlpha=nameAlpha;rRect(0.10,0.008,0.80,0.040,10,PALETTE.bg+'dd',null);
  drawTB(room.name,0.5,0.028,14,PALETTE.accent);ctx.globalAlpha=1;
  // Menu (top-left)
  rRect(0.02,0.008,0.06,0.035,8,PALETTE.bg+'cc',PALETTE.accent+'66');
  drawT('\\u2630',0.05,0.025,14,PALETTE.accent);
  // Hint (top-right)
  rRect(0.92,0.008,0.06,0.035,8,PALETTE.bg+'cc',PALETTE.accent+'66');
  drawT('\\ud83d\\udca1',0.95,0.025,14,'#fff');
  // Room counter
  drawT((roomIdx+1)+' / '+ROOM_COUNT,0.5,0.955,11,PALETTE.text+'77');
  // Atmosphere
  if(room.atmosphere){ctx.globalAlpha=0.4;drawT(room.atmosphere,0.5,0.975,9,PALETTE.text);ctx.globalAlpha=1}
  // Pack icon (bottom-right)
  var bagX=0.90,bagY=0.92;
  rRect(bagX-0.04,bagY-0.030,0.08,0.06,12,PALETTE.bg+'dd',PALETTE.accent);
  drawT('\\ud83c\\udf92',bagX,bagY,20,'#fff');
  if(inventory.length>0){ctx.fillStyle=PALETTE.accent;ctx.beginPath();ctx.arc(nx(bagX+0.03),ny(bagY-0.020),8,0,Math.PI*2);ctx.fill();drawTB(String(inventory.length),bagX+0.03,bagY-0.020,9,'#fff')}
  // Pack slide-out
  if(bagOpen&&inventory.length>0){
    var iw=Math.min(inventory.length,6)*0.08+0.04;
    rRect(bagX-iw,bagY-0.06,iw,0.055,10,PALETTE.bg+'f0',PALETTE.accent+'88');
    for(var bi=0;bi<Math.min(inventory.length,6);bi++){
      var ix=bagX-iw+0.04+bi*0.08;
      var bagItemImg=loadedImages['item_'+getItemRoomIndex(inventory[bi].name)];
      if(bagItemImg&&bagItemImg.complete&&bagItemImg.naturalWidth){
        var bisz=nx(0.05);ctx.drawImage(bagItemImg,nx(ix)-bisz/2,ny(bagY-0.035)-bisz/2,bisz,bisz);
      } else {
        drawT(inventory[bi].emoji,ix,bagY-0.035,16,'#fff');
      }
    }
    if(inventory.length>6)drawT('+'+(inventory.length-6),bagX-0.02,bagY-0.035,10,PALETTE.text);
  }
  // Hint overlay
  if(hintVisible&&hintTimer>0){
    var ha=Math.min(1,hintTimer/30);ctx.globalAlpha=ha;
    rRect(0.06,0.05,0.88,0.08,12,PALETTE.bg+'f0',PALETTE.accent+'88');
    var hintText=HINTS[roomIdx]||'Look around carefully...';
    drawT('\\ud83d\\udca1 '+hintText,0.5,0.09,12,PALETTE.text);ctx.globalAlpha=1;
  }
  // Examine text (NEAR tap point — BellForge rule)
  if(examineText&&examineTimer>0){
    var ea=Math.min(1,examineTimer/30);ctx.globalAlpha=ea;
    var ex=Math.max(0.25,Math.min(0.75,examineX));
    var ey=Math.max(0.15,Math.min(0.78,examineY));
    rRect(ex-0.22,ey-0.04,0.44,0.08,10,PALETTE.bg+'f0',PALETTE.accent+'88');
    wrapT(examineText,ex,ey-0.01,12,PALETTE.text,0.40);ctx.globalAlpha=1;
  }
  // Menu overlay
  if(menuOpen){
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    rRect(0.12,0.25,0.76,0.42,16,PALETTE.bg+'f8',PALETTE.accent+'66');
    drawTB('\\u23f8 Paused',0.5,0.32,24,PALETTE.accent);
    drawT(TITLE,0.5,0.40,14,PALETTE.text+'aa');
    drawT('Room: '+ROOMS[currentRoom].name,0.5,0.46,12,PALETTE.text+'88');
    drawT('Items: '+inventory.length+' / '+ROOM_COUNT,0.5,0.51,12,PALETTE.text+'88');
    rRect(0.25,0.58,0.50,0.05,12,PALETTE.accent,null);
    drawTB('RESUME',0.5,0.605,16,PALETTE.bg);
  }
}

function getItemRoomIndex(name){
  for(var i=0;i<ITEMS.length;i++){if(ITEMS[i].name===name)return i}return -1;
}

// ═══════════ FURNITURE (fallback only — used when no Imagen room image) ═══════════
function drawFurniture(f){
  var c=f.color||PALETTE.wall;
  switch(f.type){
    case 'circle':
      ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(nx(f.x+f.w/2),ny(f.y+f.h/2),nx(f.w/2),ny(f.h/2),0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=PALETTE.accent+'40';ctx.lineWidth=1.5;ctx.stroke();break;
    case 'arch':
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(nx(f.x),ny(f.y+f.h));ctx.lineTo(nx(f.x),ny(f.y+f.h*0.3));
      ctx.quadraticCurveTo(nx(f.x+f.w/2),ny(f.y),nx(f.x+f.w),ny(f.y+f.h*0.3));ctx.lineTo(nx(f.x+f.w),ny(f.y+f.h));ctx.closePath();ctx.fill();
      ctx.strokeStyle=PALETTE.accent+'50';ctx.lineWidth=1.5;ctx.stroke();break;
    case 'triangle':
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(nx(f.x+f.w/2),ny(f.y));ctx.lineTo(nx(f.x+f.w),ny(f.y+f.h));ctx.lineTo(nx(f.x),ny(f.y+f.h));ctx.closePath();ctx.fill();
      ctx.strokeStyle=PALETTE.accent+'40';ctx.lineWidth=1;ctx.stroke();break;
    default:
      rRect(f.x,f.y,f.w,f.h,4,c,PALETTE.accent+'30');
      ctx.globalAlpha=0.15;fillR(f.x+f.w*0.1,f.y+f.h*0.3,f.w*0.8,0.003,PALETTE.accent);
      fillR(f.x+f.w*0.1,f.y+f.h*0.6,f.w*0.8,0.003,PALETTE.accent);ctx.globalAlpha=1;
  }
  if(f.label){ctx.globalAlpha=0.5;drawT(f.label,f.x+f.w/2,f.y+f.h+0.02,8,PALETTE.text);ctx.globalAlpha=1}
}

// ═══════════ MAIN RENDER LOOP ═══════════
function frame(){
  resize();animFrame++;
  // Clear to black (letterbox bars)
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(screen==='title')drawTitle();
  else if(screen==='opening')drawOpening();
  else if(screen==='ending')drawEnding();
  else if(screen==='game'){
    if(transitionAlpha>0){
      drawRoom(currentRoom);ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    }else{drawRoom(currentRoom)}
    if(showTutorial)drawTutorial();
  }
  if(examineTimer>0)examineTimer--;
  if(hintTimer>0){hintTimer--}else{hintVisible=false}
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}

// ═══════════ INPUT ═══════════
canvas.addEventListener('pointerdown',function(e){
  var rect=canvas.getBoundingClientRect();
  var px=(e.clientX-rect.left)/rect.width;
  var py=(e.clientY-rect.top)/rect.height;
  if(screen==='title'){screen='opening';openingStart=animFrame;return}
  if(screen==='opening'){screen='game';showTutorial=true;roomNameTimer=0;return}
  if(screen==='ending'){screen='title';currentRoom=0;inventory=[];foundItems.clear();solvedPuzzles.clear();examineText='';bagOpen=false;hintVisible=false;menuOpen=false;return}
  if(showTutorial){showTutorial=false;return}
  if(menuOpen){if(px>0.25&&px<0.75&&py>0.58&&py<0.63)menuOpen=false;return}
  // Menu button
  if(px<0.08&&py<0.045){menuOpen=true;return}
  // Hint button
  if(px>0.92&&py<0.045){hintVisible=true;hintTimer=180;return}
  // Pack
  if(px>0.86&&px<0.98&&py>0.88){bagOpen=!bagOpen;return}
  if(bagOpen){bagOpen=false;return}
  // Left door
  if(currentRoom>0&&px<0.08&&py>0.28&&py<0.70){
    if(tryUnlock(currentRoom,currentRoom-1)){currentRoom--;transitionAlpha=1;roomNameTimer=0;checkWin()}return;
  }
  // Right door
  if(currentRoom<ROOM_COUNT-1&&px>0.92&&py>0.28&&py<0.70){
    if(tryUnlock(currentRoom,currentRoom+1)){currentRoom++;transitionAlpha=1;roomNameTimer=0;checkWin()}return;
  }
  // Item pickup
  if(!foundItems.has(currentRoom)){
    var it=ITEMS[currentRoom];var pos=itemPositions[currentRoom];
    if(it&&pos&&Math.abs(px-pos.x)<0.06&&Math.abs(py-pos.y)<0.06){
      inventory.push({name:it.name,emoji:it.emoji});foundItems.add(currentRoom);
      examineText=it.description;examineX=px;examineY=py-0.1;examineTimer=150;checkWin();return;
    }
  }
  // Furniture examine (only in fallback mode — when we have a room image, tap anywhere for room description)
  var room=ROOMS[currentRoom];
  if(!loadedImages['room_'+currentRoom]||!loadedImages['room_'+currentRoom].complete){
    if(room.furniture){for(var fi=0;fi<room.furniture.length;fi++){var f=room.furniture[fi];
      if(px>=f.x&&px<=f.x+f.w&&py>=f.y&&py<=f.y+f.h){examineText='You examine the '+f.label+'.';examineX=px;examineY=py-0.1;examineTimer=120;return}
    }}
  }
  // Floor/general examine
  if(py>0.82){examineText=ROOMS[currentRoom].examineText;examineX=px;examineY=py-0.12;examineTimer=120;return}
  // General tap
  examineText=room.description;examineX=px;examineY=py-0.1;examineTimer=100;
});

function checkWin(){if(inventory.length>=ROOM_COUNT&&foundItems.size>=ROOM_COUNT){setTimeout(function(){screen='ending'},800)}}

requestAnimationFrame(frame);
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

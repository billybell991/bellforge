// ── Point & Click Adventure Engine ──
// The original BellForge engine: rooms, doors, items, puzzles, inventory, examine.
// Also used for Escape Room genre (identical mechanics).

import {
  type EngineData,
  htmlHead, gameConstants, imagePreloader, prng, sharedState,
  canvasResize, drawHelpers, titleScreen, openingScreen, endingScreen,
  mainLoop, inputPreamble, htmlFoot,
} from './shared.js';

export function generatePointClickHtml(data: EngineData): string {
  return `${htmlHead(data.title)}
${gameConstants(data)}
${imagePreloader()}
${prng()}
${sharedState()}

// ═══════════ POINT & CLICK STATE ═══════════
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
let menuOpen = false;

const itemPositions = ITEMS.map(function(){return{x:rf(0.15,0.72),y:rf(0.40,0.68)}});

var roomParticles = [];
for(var r=0;r<ROOM_COUNT;r++){
  var ps=[];var count=5+ri2(8);
  for(var i=0;i<count;i++){ps.push({x:rf(0.05,0.95),y:rf(0.05,0.85),size:rf(1,3),speed:rf(0.0003,0.001),phase:rf(0,Math.PI*2)})}
  roomParticles.push(ps);
}

${canvasResize()}
${drawHelpers()}

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

${titleScreen()}
${openingScreen()}

// ═══════════ TUTORIAL ═══════════
function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTB('How to Play',0.5,0.12,24,PALETTE.accent);
  var tips=['\\ud83d\\udc46  Tap objects to examine them','\\ud83d\\udeaa  Tap glowing doors to move between '+SCENE_LABEL,'\\u2728  Pick up items \\u2014 they go in your pack','\\ud83c\\udf92  Tap the pack (bottom-right) to see items','\\ud83d\\udca1  Tap the hint button (top-right) when stuck','\\ud83d\\udd12  Some doors need an item to open'];
  for(var i=0;i<tips.length;i++){drawT(tips[i],0.5,0.26+i*0.10,13,PALETTE.text)}
  var pulse2=0.6+Math.sin(animFrame*0.08)*0.2;
  ctx.globalAlpha=pulse2;rRect(0.35,0.84,0.30,0.08,18,PALETTE.accent,null);
  ctx.globalAlpha=1;rRect(0.36,0.845,0.28,0.065,16,PALETTE.accent,null);
  drawTB('GOT IT',0.5,0.878,15,PALETTE.bg);
}

${endingScreen()}

// ═══════════ DRAW ROOM ═══════════
function drawRoom(roomIdx){
  var room=ROOMS[roomIdx];
  var hasImg = drawBgImage(loadedImages['room_'+roomIdx]);
  if(!hasImg){
    ctx.fillStyle=PALETTE.bg;ctx.fillRect(0,0,W,H);
    fillR(0,0,1,0.06,room.ceilingColor);
    ctx.globalAlpha=0.3;fillR(0,0.055,1,0.008,PALETTE.accent);ctx.globalAlpha=1;
    fillR(0,0.06,0.04,0.82,room.wallColor);
    fillR(0.96,0.06,0.04,0.82,room.wallColor);
    var lg=ctx.createLinearGradient(0,0,W,0);var ld=room.lightingDir||'center';
    if(ld==='left'){lg.addColorStop(0,PALETTE.accent+'18');lg.addColorStop(1,'transparent')}
    else if(ld==='right'){lg.addColorStop(0,'transparent');lg.addColorStop(1,PALETTE.accent+'18')}
    else if(ld==='dim'){lg.addColorStop(0,(PALETTE.shadow||'#000')+'40');lg.addColorStop(0.5,(PALETTE.shadow||'#000')+'20');lg.addColorStop(1,(PALETTE.shadow||'#000')+'40')}
    else{lg.addColorStop(0,'transparent');lg.addColorStop(0.5,PALETTE.accent+'0d');lg.addColorStop(1,'transparent')}
    ctx.fillStyle=lg;ctx.fillRect(0,ny(0.06),W,ny(0.82));
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
    fillR(0,0.88,1,0.12,room.floorColor);
    fillR(0.04,0.87,0.92,0.015,PALETTE.accent+'30');
    if(room.furniture){for(var fi=0;fi<room.furniture.length;fi++){drawFurniture(room.furniture[fi])}}
  } else {
    var lg2=ctx.createLinearGradient(0,0,0,H);
    lg2.addColorStop(0,'rgba(0,0,0,0.1)');lg2.addColorStop(0.5,'rgba(0,0,0,0)');lg2.addColorStop(1,'rgba(0,0,0,0.2)');
    ctx.fillStyle=lg2;ctx.fillRect(0,0,W,H);
  }
  var pts=roomParticles[roomIdx];
  ctx.globalAlpha=0.3;
  for(var pi=0;pi<pts.length;pi++){var p=pts[pi];var py2=p.y+Math.sin(animFrame*p.speed*10+p.phase)*0.03;ctx.fillStyle=PALETTE.accent;ctx.beginPath();ctx.arc(nx(p.x),ny(py2),p.size,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
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
  if(!foundItems.has(roomIdx)){
    var it=ITEMS[roomIdx];var pos=itemPositions[roomIdx];
    if(it&&pos){
      var bob=Math.sin(animFrame*0.04)*0.008;
      var itemImg = loadedImages['item_'+roomIdx];
      if(itemImg&&itemImg.complete&&itemImg.naturalWidth){
        ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=20;
        var isz=nx(0.10);
        ctx.drawImage(itemImg, nx(pos.x)-isz/2, ny(pos.y+bob)-isz/2, isz, isz);
        ctx.restore();
      } else {
        ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=18;
        rRect(pos.x-0.035,pos.y-0.035,0.07,0.07,10,PALETTE.accent+'35',PALETTE.accent+'aa');ctx.restore();
        drawTB(it.emoji,pos.x,pos.y+bob,28,'#fff');
      }
    }
  }
  // ═══ HUD ═══
  var nameAlpha=Math.min(1,roomNameTimer/30);
  ctx.globalAlpha=nameAlpha;rRect(0.10,0.008,0.80,0.040,10,PALETTE.bg+'dd',null);
  drawTB(room.name,0.5,0.028,14,PALETTE.accent);ctx.globalAlpha=1;
  rRect(0.02,0.008,0.06,0.035,8,PALETTE.bg+'cc',PALETTE.accent+'66');
  drawT('\\u2630',0.05,0.025,14,PALETTE.accent);
  rRect(0.92,0.008,0.06,0.035,8,PALETTE.bg+'cc',PALETTE.accent+'66');
  drawT('\\ud83d\\udca1',0.95,0.025,14,'#fff');
  drawT((roomIdx+1)+' / '+ROOM_COUNT,0.5,0.955,11,PALETTE.text+'77');
  if(room.atmosphere){ctx.globalAlpha=0.4;drawT(room.atmosphere,0.5,0.975,9,PALETTE.text);ctx.globalAlpha=1}
  var bagX=0.90,bagY=0.92;
  rRect(bagX-0.04,bagY-0.030,0.08,0.06,12,PALETTE.bg+'dd',PALETTE.accent);
  drawT('\\ud83c\\udf92',bagX,bagY,20,'#fff');
  if(inventory.length>0){ctx.fillStyle=PALETTE.accent;ctx.beginPath();ctx.arc(nx(bagX+0.03),ny(bagY-0.020),8,0,Math.PI*2);ctx.fill();drawTB(String(inventory.length),bagX+0.03,bagY-0.020,9,'#fff')}
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
  if(hintVisible&&hintTimer>0){
    var ha=Math.min(1,hintTimer/30);ctx.globalAlpha=ha;
    rRect(0.06,0.05,0.88,0.08,12,PALETTE.bg+'f0',PALETTE.accent+'88');
    var hintText=HINTS[roomIdx]||'Look around carefully...';
    drawT('\\ud83d\\udca1 '+hintText,0.5,0.09,12,PALETTE.text);ctx.globalAlpha=1;
  }
  if(examineText&&examineTimer>0){
    var ea=Math.min(1,examineTimer/30);ctx.globalAlpha=ea;
    var ex=Math.max(0.25,Math.min(0.75,examineX));
    var ey=Math.max(0.15,Math.min(0.78,examineY));
    rRect(ex-0.22,ey-0.04,0.44,0.08,10,PALETTE.bg+'f0',PALETTE.accent+'88');
    wrapT(examineText,ex,ey-0.01,12,PALETTE.text,0.40);ctx.globalAlpha=1;
  }
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

function resetGame(){
  screen='title';currentRoom=0;inventory=[];foundItems.clear();solvedPuzzles.clear();
  examineText='';bagOpen=false;hintVisible=false;menuOpen=false;
}

function checkWin(){if(inventory.length>=ROOM_COUNT&&foundItems.size>=ROOM_COUNT){setTimeout(function(){screen='ending'},800)}}

${mainLoop(`
    if(transitionAlpha>0){
      drawRoom(currentRoom);ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    }else{drawRoom(currentRoom)}
`)}

${inputPreamble()}
  if(menuOpen){if(px>0.25&&px<0.75&&py>0.58&&py<0.63)menuOpen=false;return}
  if(px<0.08&&py<0.045){menuOpen=true;return}
  if(px>0.92&&py<0.045){hintVisible=true;hintTimer=180;return}
  if(px>0.86&&px<0.98&&py>0.88){bagOpen=!bagOpen;return}
  if(bagOpen){bagOpen=false;return}
  if(currentRoom>0&&px<0.08&&py>0.28&&py<0.70){
    if(tryUnlock(currentRoom,currentRoom-1)){currentRoom--;transitionAlpha=1;roomNameTimer=0;checkWin()}return;
  }
  if(currentRoom<ROOM_COUNT-1&&px>0.92&&py>0.28&&py<0.70){
    if(tryUnlock(currentRoom,currentRoom+1)){currentRoom++;transitionAlpha=1;roomNameTimer=0;checkWin()}return;
  }
  if(!foundItems.has(currentRoom)){
    var it=ITEMS[currentRoom];var pos=itemPositions[currentRoom];
    if(it&&pos&&Math.abs(px-pos.x)<0.06&&Math.abs(py-pos.y)<0.06){
      inventory.push({name:it.name,emoji:it.emoji});foundItems.add(currentRoom);
      examineText=it.description;examineX=px;examineY=py-0.1;examineTimer=150;checkWin();return;
    }
  }
  var room=ROOMS[currentRoom];
  if(!loadedImages['room_'+currentRoom]||!loadedImages['room_'+currentRoom].complete){
    if(room.furniture){for(var fi=0;fi<room.furniture.length;fi++){var f=room.furniture[fi];
      if(px>=f.x&&px<=f.x+f.w&&py>=f.y&&py<=f.y+f.h){examineText='You examine the '+f.label+'.';examineX=px;examineY=py-0.1;examineTimer=120;return}
    }}
  }
  if(py>0.82){examineText=ROOMS[currentRoom].examineText;examineX=px;examineY=py-0.12;examineTimer=120;return}
  examineText=room.description;examineX=px;examineY=py-0.1;examineTimer=100;
});

${htmlFoot()}`;
}

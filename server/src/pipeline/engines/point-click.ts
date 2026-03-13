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

const itemPositions = ITEMS.map(function(){return{x:rf(0.15,0.72),y:rf(0.70,0.82)}});

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
        examineText=p.unlockedMessage||'The way forward opens!';examineX=0.5;examineY=0.5;examineTimer=180;return true;
      }else{examineText=p.lockedMessage||'This passage is sealed.';examineX=0.5;examineY=0.5;examineTimer=150;return false}
    }
  }return true;
}

${titleScreen()}
${openingScreen()}

// ═══════════ TUTORIAL ═══════════
function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTGlow('How to Play',0.5,0.10,30,PALETTE.accent,14);
  var tips=['\\ud83d\\udc46  Tap objects to examine them','\\ud83d\\udeaa  Tap glowing doors to move between '+SCENE_LABEL,'\\u2728  Pick up items \\u2014 they go in your pack','\\ud83c\\udf92  Tap the pack (bottom-right) to see items','\\ud83d\\udca1  Tap the hint button (top-right) when stuck','\\ud83d\\udd12  Some doors need an item to open'];
  for(var i=0;i<tips.length;i++){drawT(tips[i],0.5,0.24+i*0.10,16,PALETTE.text)}
  var pulse2=0.6+Math.sin(animFrame*0.08)*0.2;
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=16;
  ctx.globalAlpha=pulse2;rRect(0.35,0.84,0.30,0.08,18,PALETTE.accent,null);
  ctx.globalAlpha=1;rRect(0.36,0.845,0.28,0.065,16,PALETTE.accent,null);
  ctx.restore();
  drawTB('GOT IT',0.5,0.878,17,PALETTE.bg);
}

${endingScreen()}

// ═══════════ DRAW ROOM ═══════════
function drawRoom(roomIdx){
  var room=ROOMS[roomIdx];
  var hasImg = drawBgImage(loadedImages['room_'+roomIdx]);
  if(!hasImg){
    drawRoomFallbackBg(room);
    if(room.hasWindow){
      var wt=room.windowType||'tall';
      ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=18;
      if(wt==='round'){
        ctx.fillStyle=PALETTE.bg+'cc';ctx.beginPath();ctx.arc(nx(0.5),ny(0.22),nx(0.08),0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=PALETTE.accent+'66';ctx.lineWidth=3;ctx.stroke();
      }else if(wt==='wide'){
        rRect(0.25,0.10,0.50,0.16,6,PALETTE.bg+'cc',PALETTE.accent+'66');
      }else{
        rRect(0.38,0.10,0.10,0.28,6,PALETTE.bg+'cc',PALETTE.accent+'66');
        rRect(0.52,0.10,0.10,0.28,6,PALETTE.bg+'cc',PALETTE.accent+'66');
      }
      ctx.restore();
    }
    if(room.furniture){for(var fi=0;fi<room.furniture.length;fi++){drawFurniture(room.furniture[fi])}}
  } else {
    var lg2=ctx.createLinearGradient(0,0,0,H);
    lg2.addColorStop(0,'rgba(0,0,0,0.1)');lg2.addColorStop(0.5,'rgba(0,0,0,0)');lg2.addColorStop(1,'rgba(0,0,0,0.2)');
    ctx.fillStyle=lg2;ctx.fillRect(0,0,W,H);
  }
  // Room ambient particles
  drawParticles(PALETTE.accent,1);
  
  var pts=roomParticles[roomIdx];
  ctx.globalAlpha=0.3;
  for(var pi=0;pi<pts.length;pi++){var p=pts[pi];var py2=p.y+Math.sin(animFrame*p.speed*10+p.phase)*0.03;ctx.fillStyle=PALETTE.accent;ctx.beginPath();ctx.arc(nx(p.x),ny(py2),p.size,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
  var doorGlow=0.3+Math.sin(animFrame*0.05)*0.15;
  if(roomIdx>0){
    var locked=isDoorLocked(roomIdx,roomIdx-1);var dc=locked?'#ff4444':PALETTE.accent;
    // Subtle sparkle particles along left edge instead of big bars
    ctx.save();ctx.globalAlpha=doorGlow*0.8;
    for(var si=0;si<5;si++){var sy=0.35+si*0.07+Math.sin(animFrame*0.03+si)*0.02;ctx.fillStyle=dc;ctx.beginPath();ctx.arc(nx(0.02),ny(sy),2+Math.sin(animFrame*0.06+si)*1.5,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    drawTB(locked?'\ud83d\udd12':'\u25c0',0.03,0.50,16,dc+'aa');
  }
  if(roomIdx<ROOM_COUNT-1){
    var locked2=isDoorLocked(roomIdx,roomIdx+1);var dc2=locked2?'#ff4444':PALETTE.accent;
    ctx.save();ctx.globalAlpha=doorGlow*0.8;
    for(var si2=0;si2<5;si2++){var sy2=0.35+si2*0.07+Math.sin(animFrame*0.03+si2+3)*0.02;ctx.fillStyle=dc2;ctx.beginPath();ctx.arc(nx(0.98),ny(sy2),2+Math.sin(animFrame*0.06+si2)*1.5,0,Math.PI*2);ctx.fill()}
    ctx.restore();
    drawTB(locked2?'\ud83d\udd12':'\u25b6',0.97,0.50,16,dc2+'aa');
  }
  if(!foundItems.has(roomIdx)){
    var it=ITEMS[roomIdx];var pos=itemPositions[roomIdx];
    if(it&&pos){
      var itemImg = loadedImages['item_'+roomIdx];
      if(itemImg&&itemImg.complete&&itemImg.naturalWidth){
        var isz=nx(0.08);
        var icx=nx(pos.x),icy=ny(pos.y);
        ctx.save();
        // Subtle glow instead of obvious circle
        ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=6;
        ctx.drawImage(itemImg, icx-isz/2, icy-isz/2, isz, isz);
        ctx.restore();
      } else {
        ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=10;
        drawTB(it.emoji,pos.x,pos.y,24,'#fff');
        ctx.restore();
      }
    }
  }
  // ═══ HUD ═══
  var nameAlpha=Math.min(1,roomNameTimer/30);
  ctx.globalAlpha=nameAlpha;
  drawT(room.name,0.5,0.025,13,PALETTE.accent+'cc');ctx.globalAlpha=1;
  drawT('\u2630',0.03,0.025,14,PALETTE.accent+'aa');
  drawT('\ud83d\udca1',0.97,0.025,14,'#fff');
  drawT((roomIdx+1)+' / '+ROOM_COUNT,0.5,0.955,11,PALETTE.text+'77');
  if(room.atmosphere){ctx.globalAlpha=0.4;drawT(room.atmosphere,0.5,0.975,9,PALETTE.text);ctx.globalAlpha=1}
  var bagX=0.90,bagY=0.92;
  var packImg=loadedImages['pack'];
  if(packImg&&packImg.complete&&packImg.naturalWidth){
    var psz=nx(0.09);
    var pcx=nx(bagX),pcy=ny(bagY);
    ctx.save();
    ctx.drawImage(packImg,pcx-psz/2,pcy-psz/2,psz,psz);
    // Black outline instead of circle clip
    ctx.strokeStyle='#000';ctx.lineWidth=2;
    ctx.strokeRect(pcx-psz/2,pcy-psz/2,psz,psz);
    ctx.restore();
  } else {
    drawT('\ud83c\udf92',bagX,bagY,22,'#fff');
  }
  if(inventory.length>0){ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=8;ctx.fillStyle=PALETTE.accent;ctx.beginPath();ctx.arc(nx(bagX+0.03),ny(bagY-0.020),8,0,Math.PI*2);ctx.fill();ctx.restore();drawTB(String(inventory.length),bagX+0.03,bagY-0.020,9,'#fff')}
  if(bagOpen&&inventory.length>0){
    var iw=Math.min(inventory.length,6)*0.09+0.05;
    glowRect(bagX-iw,bagY-0.07,iw,0.065,10,'#0f0f14eb',PALETTE.accent+'88');
    for(var bi=0;bi<Math.min(inventory.length,6);bi++){
      var ix=bagX-iw+0.04+bi*0.08;
      var bagItemImg=loadedImages['item_'+getItemRoomIndex(inventory[bi].name)];
      if(bagItemImg&&bagItemImg.complete&&bagItemImg.naturalWidth){
        var bisz=nx(0.07);var bcx=nx(ix),bcy=ny(bagY-0.035);
        ctx.save();ctx.beginPath();ctx.arc(bcx,bcy,bisz/2,0,Math.PI*2);ctx.clip();
        ctx.drawImage(bagItemImg,bcx-bisz/2,bcy-bisz/2,bisz,bisz);ctx.restore();
      } else {
        drawT(inventory[bi].emoji,ix,bagY-0.035,16,'#fff');
      }
    }
    if(inventory.length>6)drawT('+'+(inventory.length-6),bagX-0.02,bagY-0.035,10,PALETTE.text);
  }
  if(hintVisible&&hintTimer>0){
    var ha=Math.min(1,hintTimer/30);ctx.globalAlpha=ha;
    glowRect(0.06,0.05,0.88,0.08,12,'#0f0f14eb',PALETTE.accent+'88');
    var hintText=HINTS[roomIdx]||'Look around carefully...';
    drawT('\\ud83d\\udca1 '+hintText,0.5,0.09,12,'#f0f0f0');ctx.globalAlpha=1;
  }
  if(examineText&&examineTimer>0){
    var ea=Math.min(1,examineTimer/30);ctx.globalAlpha=ea;
    var ex=Math.max(0.25,Math.min(0.75,examineX));
    var ey=Math.max(0.15,Math.min(0.78,examineY));
    glowRect(ex-0.22,ey-0.04,0.44,0.08,10,'#0f0f14eb',PALETTE.accent+'88');
    wrapT(examineText,ex,ey-0.01,12,'#f0f0f0',0.40);ctx.globalAlpha=1;
  }
  if(menuOpen){
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    glowRect(0.12,0.20,0.76,0.52,16,PALETTE.bg+'f8',PALETTE.accent+'66');
    drawTGlow('\u23f8 Paused',0.5,0.27,24,PALETTE.accent,12);
    drawT(TITLE,0.5,0.35,14,PALETTE.text+'aa');
    drawT('Room: '+ROOMS[currentRoom].name,0.5,0.41,12,PALETTE.text+'88');
    drawT('Items: '+inventory.length+' / '+ROOM_COUNT,0.5,0.46,12,PALETTE.text+'88');
    ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=14;
    rRect(0.25,0.53,0.50,0.05,12,PALETTE.accent,null);ctx.restore();
    drawTB('RESUME',0.5,0.555,16,PALETTE.bg);
    rRect(0.25,0.60,0.50,0.05,12,PALETTE.accent+'44',PALETTE.accent);
    drawTB('How to Play',0.5,0.625,14,PALETTE.accent);
  }
}

function getItemRoomIndex(name){
  for(var i=0;i<ITEMS.length;i++){if(ITEMS[i].name===name)return i}return -1;
}

function drawFurniture(f){
  var c=f.color||PALETTE.wall;
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=10;
  switch(f.type){
    case 'circle':
      ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(nx(f.x+f.w/2),ny(f.y+f.h/2),nx(f.w/2),ny(f.h/2),0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=PALETTE.accent+'60';ctx.lineWidth=2;ctx.stroke();break;
    case 'arch':
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(nx(f.x),ny(f.y+f.h));ctx.lineTo(nx(f.x),ny(f.y+f.h*0.3));
      ctx.quadraticCurveTo(nx(f.x+f.w/2),ny(f.y),nx(f.x+f.w),ny(f.y+f.h*0.3));ctx.lineTo(nx(f.x+f.w),ny(f.y+f.h));ctx.closePath();ctx.fill();
      ctx.strokeStyle=PALETTE.accent+'60';ctx.lineWidth=2;ctx.stroke();break;
    case 'triangle':
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(nx(f.x+f.w/2),ny(f.y));ctx.lineTo(nx(f.x+f.w),ny(f.y+f.h));ctx.lineTo(nx(f.x),ny(f.y+f.h));ctx.closePath();ctx.fill();
      ctx.strokeStyle=PALETTE.accent+'50';ctx.lineWidth=1.5;ctx.stroke();break;
    default:
      var grd=ctx.createLinearGradient(nx(f.x),ny(f.y),nx(f.x),ny(f.y+f.h));
      grd.addColorStop(0,c);grd.addColorStop(1,PALETTE.bg+'88');
      glowRect(f.x,f.y,f.w,f.h,6,grd,PALETTE.accent+'50');
  }
  ctx.restore();
  if(f.label){
    ctx.save();ctx.shadowColor=PALETTE.bg;ctx.shadowBlur=4;
    ctx.globalAlpha=0.6;drawT(f.label,f.x+f.w/2,f.y+f.h+0.02,8,PALETTE.text);
    ctx.restore();ctx.globalAlpha=1;
  }
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
  if(menuOpen){
    if(px>0.25&&px<0.75&&py>0.53&&py<0.58){menuOpen=false;return}
    if(px>0.25&&px<0.75&&py>0.60&&py<0.65){menuOpen=false;showTutorial=true;return}
    return;
  }
  if(px<0.08&&py<0.045){menuOpen=true;return}
  if(px>0.92&&py<0.045){hintVisible=true;hintTimer=180;return}
  if(px>0.83&&px<0.98&&py>0.86){bagOpen=!bagOpen;return}
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
      examineText=it.description&&it.description.length>60?it.description.slice(0,57)+'...':it.description;examineX=px;examineY=py-0.1;examineTimer=150;checkWin();return;
    }
  }
  var room=ROOMS[currentRoom];
  if(!loadedImages['room_'+currentRoom]||!loadedImages['room_'+currentRoom].complete){
    if(room.furniture){for(var fi=0;fi<room.furniture.length;fi++){var f=room.furniture[fi];
      if(px>=f.x&&px<=f.x+f.w&&py>=f.y&&py<=f.y+f.h){examineText='You examine the '+f.label+'.';examineX=px;examineY=py-0.1;examineTimer=120;return}
    }}
  }
  if(py>0.82){var et=ROOMS[currentRoom].examineText;examineText=et&&et.length>65?et.slice(0,62)+'...':et;examineX=px;examineY=py-0.12;examineTimer=120;return}
  var rd=room.description;examineText=rd&&rd.length>65?rd.slice(0,62)+'...':rd;examineX=px;examineY=py-0.1;examineTimer=100;
});

${htmlFoot()}`;
}

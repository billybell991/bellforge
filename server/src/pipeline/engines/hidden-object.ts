// ── Hidden Object Engine ──
// Find concealed items in detailed scenes by tapping on them.
// Rooms → scenes. Furniture → hidden item locations. Items → objects to find.

import {
  type EngineData,
  htmlHead, gameConstants, imagePreloader, prng, sharedState,
  canvasResize, drawHelpers, titleScreen, openingScreen, endingScreen,
  mainLoop, inputPreamble, htmlFoot,
} from './shared.js';

export function generateHiddenObjectHtml(data: EngineData): string {
  return `${htmlHead(data.title)}
${gameConstants(data)}
${imagePreloader()}
${prng()}
${sharedState()}

// ═══════════ HIDDEN OBJECT STATE ═══════════
let currentScene = 0;
let inventory = [];
let foundItems = new Set();
let transitionAlpha = 0;
let examineText = '';
let examineX = 0.5, examineY = 0.5;
let examineTimer = 0;
let hintVisible = false;
let hintTimer = 0;

// Each scene has objects to find scattered at furniture positions
// The item for this room is the "main" find; furniture labels are bonus objects
var sceneObjects = [];
for (var si = 0; si < ROOM_COUNT; si++) {
  var room = ROOMS[si];
  var objects = [];
  var item = ITEMS[si];

  // Add the room's main item as the primary object to find
  if (item) {
    // Position from furniture (first furniture piece) or random
    var mainPos = room.furniture && room.furniture.length > 0
      ? { x: room.furniture[0].x + room.furniture[0].w / 2, y: room.furniture[0].y + room.furniture[0].h / 2 }
      : { x: rf(0.15, 0.85), y: rf(0.20, 0.75) };
    objects.push({
      name: item.name,
      emoji: item.emoji,
      x: mainPos.x,
      y: mainPos.y,
      radius: 0.06,
      found: false,
      isMain: true,
      description: item.description
    });
  }

  // Add bonus objects from furniture labels (3-5 extras per scene)
  if (room.furniture) {
    var bonusEmojis = ['\\ud83d\\udd0d', '\\u2b50', '\\ud83d\\udc8e', '\\ud83d\\udd11', '\\ud83c\\udf1f', '\\ud83e\\uddea', '\\ud83d\\udcf7', '\\ud83e\\ude99'];
    for (var fi = 1; fi < room.furniture.length && objects.length < 6; fi++) {
      var f = room.furniture[fi];
      objects.push({
        name: f.label || 'Hidden Object',
        emoji: bonusEmojis[(fi - 1) % bonusEmojis.length],
        x: f.x + f.w / 2 + rf(-0.03, 0.03),
        y: f.y + f.h / 2 + rf(-0.03, 0.03),
        radius: 0.05,
        found: false,
        isMain: false,
        description: 'You found the ' + (f.label || 'hidden object') + '!'
      });
    }
  }

  // Ensure at least 3 objects per scene
  while (objects.length < 3) {
    objects.push({
      name: 'Secret ' + (objects.length + 1),
      emoji: ['\\u2b50', '\\ud83d\\udc8e', '\\ud83d\\udd11'][objects.length % 3],
      x: rf(0.10, 0.90),
      y: rf(0.15, 0.80),
      radius: 0.05,
      found: false,
      isMain: false,
      description: 'You discovered a secret!'
    });
  }

  sceneObjects.push(objects);
}

function getSceneProgress(idx) {
  var objs = sceneObjects[idx];
  var found = 0;
  for (var i = 0; i < objs.length; i++) {
    if (objs[i].found) found++;
  }
  return { found: found, total: objs.length };
}

function isSceneComplete(idx) {
  var p = getSceneProgress(idx);
  return p.found >= p.total;
}

${canvasResize()}
${drawHelpers()}

${titleScreen()}
${openingScreen()}

function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTGlow('How to Play',0.5,0.10,30,PALETTE.accent,14);
  var tips=[
    '\\ud83d\\udd0d  Find hidden objects in each scene',
    '\\ud83d\\udc46  Tap where you think an object is',
    '\\ud83d\\udcdd  Check the object list at the bottom',
    '\\u2728  Main items (starred) go in your collection',
    '\\ud83d\\udca1  Tap the hint button when stuck',
    '\\ud83c\\udfc6  Find all objects to advance!'
  ];
  for(var i=0;i<tips.length;i++){drawT(tips[i],0.5,0.24+i*0.10,16,PALETTE.text)}
  var pulse2=0.6+Math.sin(animFrame*0.08)*0.2;
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=16;
  ctx.globalAlpha=pulse2;rRect(0.35,0.84,0.30,0.08,18,PALETTE.accent,null);
  ctx.globalAlpha=1;rRect(0.36,0.845,0.28,0.065,16,PALETTE.accent,null);
  ctx.restore();
  drawTB('GOT IT',0.5,0.878,17,PALETTE.bg);
}

${endingScreen()}

// ═══════════ DRAW SCENE ═══════════
function drawHOScene() {
  var room = ROOMS[currentScene];

  // Full-screen room image
  var hasImg = drawBgImage(loadedImages['room_' + currentScene]);
  if (!hasImg) {
    drawRoomFallbackBg(room);
  }

  var objs = sceneObjects[currentScene];

  // Draw subtle glow hints for unfound objects
  for (var oi = 0; oi < objs.length; oi++) {
    var obj = objs[oi];
    if (!obj.found) {
      // Very subtle sparkle to hint at locations
      var sparkle = Math.sin(animFrame * 0.03 + oi * 1.7) * 0.5 + 0.5;
      ctx.globalAlpha = sparkle * 0.08;
      ctx.fillStyle = PALETTE.accent;
      ctx.beginPath();
      ctx.arc(nx(obj.x), ny(obj.y), nx(obj.radius * 0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Show found marker
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nx(obj.x), ny(obj.y), nx(0.03), 0, Math.PI * 2);
      ctx.stroke();
      drawT('\\u2713', obj.x, obj.y, 14, PALETTE.accent);
      ctx.globalAlpha = 1;
    }
  }

  // ═══ Object List (bottom panel) ═══
  var prog = getSceneProgress(currentScene);
  var panelY = 0.88;
  glowRect(0.02, panelY, 0.96, 0.10, 10, PALETTE.bg + 'ee', PALETTE.accent + '44');

  // List objects in a row
  var objSpacing = Math.min(0.14, 0.90 / Math.max(1, objs.length));
  var listStartX = 0.5 - (objs.length * objSpacing) / 2;
  for (var li = 0; li < objs.length; li++) {
    var lo = objs[li];
    var lx = listStartX + li * objSpacing + objSpacing / 2;
    if (lo.found) {
      ctx.globalAlpha = 0.4;
      drawT(lo.emoji, lx, panelY + 0.03, 14, PALETTE.text);
      // Strikethrough line
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nx(lx - 0.025), ny(panelY + 0.03));
      ctx.lineTo(nx(lx + 0.025), ny(panelY + 0.03));
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      drawT(lo.emoji, lx, panelY + 0.03, 14, '#fff');
      if (lo.isMain) {
        drawT('\\u2b50', lx + 0.02, panelY + 0.015, 7, PALETTE.accent);
      }
    }
    // Name below emoji
    ctx.globalAlpha = lo.found ? 0.3 : 0.7;
    drawT(lo.name.substring(0, 10), lx, panelY + 0.07, 7, PALETTE.text);
    ctx.globalAlpha = 1;
  }

  // ═══ HUD ═══
  var nameAlpha = Math.min(1, roomNameTimer / 30);
  ctx.globalAlpha = nameAlpha;
  glowRect(0.10, 0.008, 0.80, 0.040, 10, PALETTE.bg + 'dd', PALETTE.accent + '40');
  drawTGlow(room.name, 0.5, 0.028, 14, PALETTE.accent, 8);
  ctx.globalAlpha = 1;

  // Found counter
  glowRect(0.02, 0.008, 0.08, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT(prog.found + '/' + prog.total, 0.06, 0.025, 11, PALETTE.accent);

  // Hint button
  glowRect(0.92, 0.008, 0.06, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT('\\ud83d\\udca1', 0.95, 0.025, 14, '#fff');

  // Scene counter
  drawT('Scene ' + (currentScene + 1) + ' / ' + ROOM_COUNT, 0.5, 0.85, 10, PALETTE.text + '77');

  // Hint overlay (shows unfound object location)
  if (hintVisible && hintTimer > 0) {
    hintTimer--;
    // Find first unfound object and highlight it
    for (var hi = 0; hi < objs.length; hi++) {
      if (!objs[hi].found) {
        var ho = objs[hi];
        ctx.globalAlpha = 0.5 + Math.sin(animFrame * 0.1) * 0.3;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(nx(ho.x), ny(ho.y), nx(0.06), 0, Math.PI * 2);
        ctx.stroke();
        // Magnifying glass icon
        drawT('\\ud83d\\udd0d', ho.x + 0.06, ho.y - 0.04, 16, '#ffff00');
        ctx.globalAlpha = 1;
        break;
      }
    }
    if (hintTimer <= 0) hintVisible = false;
  }

  // Examine text
  if (examineText && examineTimer > 0) {
    var ea = Math.min(1, examineTimer / 20);
    ctx.globalAlpha = ea;
    var ex = Math.max(0.25, Math.min(0.75, examineX));
    var ey = Math.max(0.15, Math.min(0.78, examineY));
    glowRect(ex - 0.22, ey - 0.04, 0.44, 0.08, 10, PALETTE.bg + 'f0', PALETTE.accent + '88');
    wrapT(examineText, ex, ey - 0.01, 12, PALETTE.text, 0.40);
    ctx.globalAlpha = 1;
    examineTimer--;
  }

  // Scene complete overlay
  if (isSceneComplete(currentScene)) {
    var alpha = Math.min(0.8, (animFrame % 200) < 100 ? 0.8 : 0.5);
    ctx.globalAlpha = alpha;
    glowRect(0.20, 0.35, 0.60, 0.20, 14, PALETTE.bg + 'ee', PALETTE.accent);
    drawTGlow('\\u2728 Scene Complete!', 0.5, 0.40, 18, PALETTE.accent, 12);
    if (currentScene < ROOM_COUNT - 1) {
      drawT('Tap to continue to next scene', 0.5, 0.48, 12, PALETTE.text + 'cc');
    } else {
      drawT('All scenes complete!', 0.5, 0.48, 12, PALETTE.text + 'cc');
    }
    ctx.globalAlpha = 1;
  }
}

function resetGame(){
  screen = 'title'; currentScene = 0; inventory = []; foundItems.clear();
  examineText = ''; examineTimer = 0; hintVisible = false; hintTimer = 0;
  // Reset all objects to unfound
  for (var si = 0; si < sceneObjects.length; si++) {
    for (var oi = 0; oi < sceneObjects[si].length; oi++) {
      sceneObjects[si][oi].found = false;
    }
  }
}

function checkWin(){
  if(inventory.length >= ROOM_COUNT) {
    setTimeout(function(){ screen = 'ending'; }, 800);
  }
}

// ═══════════ MAIN LOOP ═══════════
function frame(){
  resize();animFrame++;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(screen==='title') drawTitle();
  else if(screen==='opening') drawOpening();
  else if(screen==='howto'){drawTutorial()}
  else if(screen==='ending') drawEnding();
  else if(screen==='game'){
    if(transitionAlpha>0){
      drawHOScene();
      ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    } else {
      drawHOScene();
    }
    if(showTutorial) drawTutorial();
  }
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}

// ═══════════ INPUT ═══════════
${inputPreamble()}
  // Scene complete — advance
  if (isSceneComplete(currentScene)) {
    if (currentScene < ROOM_COUNT - 1) {
      currentScene++;
      transitionAlpha = 1;
      roomNameTimer = 0;
    } else {
      checkWin();
    }
    return;
  }

  // Hint button
  if (px > 0.92 && py < 0.045) {
    hintVisible = true;
    hintTimer = 120;
    return;
  }

  // Check object taps
  var objs = sceneObjects[currentScene];
  for (var oi = 0; oi < objs.length; oi++) {
    var obj = objs[oi];
    if (!obj.found) {
      var dist = Math.sqrt(Math.pow(px - obj.x, 2) + Math.pow(py - obj.y, 2));
      if (dist < obj.radius) {
        obj.found = true;
        examineText = obj.description;
        examineX = px;
        examineY = py - 0.1;
        examineTimer = 100;
        // If it's the main item, add to inventory
        if (obj.isMain) {
          if (!foundItems.has(currentScene)) {
            var it = ITEMS[currentScene];
            if (it) {
              inventory.push({ name: it.name, emoji: it.emoji });
              foundItems.add(currentScene);
              checkWin();
            }
          }
        }
        return;
      }
    }
  }

  // Missed tap — show a "miss" indicator
  examineText = 'Nothing here... keep looking!';
  examineX = px;
  examineY = py - 0.08;
  examineTimer = 40;
});

${htmlFoot()}`;
}

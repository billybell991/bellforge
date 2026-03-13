// ── Dismantling Engine ──
// Take apart machines, devices, and contraptions piece by piece.
// Rooms → devices. Furniture → removable components. Items → extracted parts.

import {
  type EngineData,
  htmlHead, gameConstants, imagePreloader, prng, sharedState,
  canvasResize, drawHelpers, titleScreen, openingScreen, endingScreen,
  mainLoop, inputPreamble, htmlFoot,
} from './shared.js';

export function generateDismantleHtml(data: EngineData): string {
  return `${htmlHead(data.title)}
${gameConstants(data)}
${imagePreloader()}
${prng()}
${sharedState()}

// ═══════════ DISMANTLE STATE ═══════════
let currentDevice = 0;
let inventory = [];
let removedParts = new Set();
let transitionAlpha = 0;
let examineText = '';
let examineX = 0.5, examineY = 0.5;
let examineTimer = 0;
let hintVisible = false;
let hintTimer = 0;
let shakeTimer = 0;
let shakeTarget = null;
let sparkX = 0, sparkY = 0, sparkTimer = 0;

// Build removal order for each device
// Components are layered: higher-index furniture = deeper inside
// Player must remove from lowest index (outermost) first
var deviceParts = [];
for (var di = 0; di < ROOM_COUNT; di++) {
  var room = ROOMS[di];
  var parts = [];
  if (room.furniture) {
    for (var fi = 0; fi < room.furniture.length; fi++) {
      var f = room.furniture[fi];
      // Each part has a removal order — lower index must be removed first
      // A part is "blocked" if any part with a lower index is still attached
      parts.push({
        name: f.label || 'Component ' + (fi + 1),
        type: f.type || 'rect',
        x: f.x,
        y: f.y,
        w: f.w,
        h: f.h,
        color: f.color || PALETTE.wall,
        order: fi,
        removed: false,
        // A part can only be removed if all parts before it (with lower order) are removed
        // But we make it more interesting: parts in the same "layer" can be removed in any order
        // We assign layers: every 2-3 parts = one layer
        layer: Math.floor(fi / 2)
      });
    }
  }
  // Ensure at least 3 parts per device
  while (parts.length < 3) {
    var idx = parts.length;
    parts.push({
      name: ['Outer Panel', 'Inner Cover', 'Core Housing', 'Side Plate', 'Access Hatch'][idx % 5],
      type: 'rect',
      x: 0.25 + rf(-0.1, 0.1),
      y: 0.20 + idx * 0.15 + rf(-0.05, 0.05),
      w: 0.15 + rf(0, 0.1),
      h: 0.10 + rf(0, 0.05),
      color: PALETTE.wall,
      order: idx,
      removed: false,
      layer: Math.floor(idx / 2)
    });
  }
  deviceParts.push(parts);
}

function getCurrentLayer(devIdx) {
  var parts = deviceParts[devIdx];
  // Find the lowest layer that still has unremoved parts
  var minLayer = 999;
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i].removed && parts[i].layer < minLayer) {
      minLayer = parts[i].layer;
    }
  }
  return minLayer;
}

function isPartRemovable(devIdx, partIdx) {
  var part = deviceParts[devIdx][partIdx];
  if (part.removed) return false;
  return part.layer <= getCurrentLayer(devIdx);
}

function getDeviceProgress(devIdx) {
  var parts = deviceParts[devIdx];
  var removed = 0;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].removed) removed++;
  }
  return { removed: removed, total: parts.length };
}

function isDeviceComplete(devIdx) {
  var p = getDeviceProgress(devIdx);
  return p.removed >= p.total;
}

${canvasResize()}
${drawHelpers()}

${titleScreen()}
${openingScreen()}

function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTGlow('How to Play',0.5,0.10,30,PALETTE.accent,14);
  var tips=[
    '\\ud83d\\udd27  Take apart each device piece by piece',
    '\\ud83d\\udc46  Tap removable components to detach them',
    '\\u26a0\\ufe0f  Remove outer layers first, then inner ones',
    '\\u2728  Blocked parts will shake — remove outer parts first!',
    '\\ud83d\\udca1  Tap the hint button when stuck',
    '\\ud83c\\udfc6  Fully disassemble each device to advance!'
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

// ═══════════ DRAW DEVICE SCENE ═══════════
function drawDeviceScene() {
  var room = ROOMS[currentDevice];

  // Full-screen background image (workbench / environment)
  var hasImg = drawBgImage(loadedImages['room_' + currentDevice]);
  if (!hasImg) {
    drawRoomFallbackBg(room);
  }

  // Darkened overlay to make parts pop
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, W, H);

  var parts = deviceParts[currentDevice];
  var activeLayer = getCurrentLayer(currentDevice);

  // Draw all parts (removed ones as outlines, active as solid, deeper as dimmed)
  for (var pi = 0; pi < parts.length; pi++) {
    var part = parts[pi];
    if (part.removed) {
      // Ghost outline where the part was
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(nx(part.x), ny(part.y), nx(part.w), ny(part.h));
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      continue;
    }

    var isActive = part.layer <= activeLayer;
    var isShaking = shakeTimer > 0 && shakeTarget === pi;

    // Shake offset for blocked tap feedback
    var sx = 0, sy = 0;
    if (isShaking) {
      sx = Math.sin(shakeTimer * 1.2) * 3;
      sy = Math.cos(shakeTimer * 1.5) * 1.5;
    }

    ctx.save();
    if (!isActive) {
      // Deeper layer — dimmed and slightly blurred look
      ctx.globalAlpha = 0.4;
    }

    // Draw the component based on type
    var px2 = nx(part.x) + sx;
    var py2 = ny(part.y) + sy;
    var pw = nx(part.w);
    var ph = ny(part.h);

    // Component shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (part.type === 'circle') {
      ctx.beginPath();
      ctx.ellipse(px2 + pw/2 + 3, py2 + ph/2 + 3, pw/2, ph/2, 0, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillRect(px2 + 3, py2 + 3, pw, ph);
    }

    // Component body
    ctx.fillStyle = part.color;
    if (part.type === 'circle') {
      ctx.beginPath();
      ctx.ellipse(px2 + pw/2, py2 + ph/2, pw/2, ph/2, 0, 0, Math.PI*2);
      ctx.fill();
      // Metallic highlight arc
      ctx.strokeStyle = PALETTE.highlight + '66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px2 + pw/2 - pw*0.15, py2 + ph/2 - ph*0.15, Math.min(pw, ph) * 0.3, -0.8, 0.8);
      ctx.stroke();
    } else if (part.type === 'arch') {
      // Rounded top component
      ctx.beginPath();
      ctx.moveTo(px2, py2 + ph);
      ctx.lineTo(px2, py2 + ph * 0.3);
      ctx.quadraticCurveTo(px2 + pw/2, py2 - ph * 0.1, px2 + pw, py2 + ph * 0.3);
      ctx.lineTo(px2 + pw, py2 + ph);
      ctx.closePath();
      ctx.fill();
    } else if (part.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(px2 + pw/2, py2);
      ctx.lineTo(px2 + pw, py2 + ph);
      ctx.lineTo(px2, py2 + ph);
      ctx.closePath();
      ctx.fill();
    } else {
      // Default rect with rounded corners for mechanical look
      var rr = Math.min(6, pw/4, ph/4);
      ctx.beginPath();
      ctx.moveTo(px2 + rr, py2);
      ctx.arcTo(px2 + pw, py2, px2 + pw, py2 + ph, rr);
      ctx.arcTo(px2 + pw, py2 + ph, px2, py2 + ph, rr);
      ctx.arcTo(px2, py2 + ph, px2, py2, rr);
      ctx.arcTo(px2, py2, px2 + pw, py2, rr);
      ctx.closePath();
      ctx.fill();
    }

    // Rivet / bolt decorations on active parts
    if (isActive) {
      ctx.fillStyle = PALETTE.shadow + 'aa';
      var boltR = Math.min(pw, ph) * 0.06;
      if (boltR > 1.5) {
        // Corner bolts
        ctx.beginPath(); ctx.arc(px2 + boltR*2.5, py2 + boltR*2.5, boltR, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px2 + pw - boltR*2.5, py2 + boltR*2.5, boltR, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px2 + boltR*2.5, py2 + ph - boltR*2.5, boltR, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px2 + pw - boltR*2.5, py2 + ph - boltR*2.5, boltR, 0, Math.PI*2); ctx.fill();
      }

      // Glow pulse on removable parts
      var pulse = Math.sin(animFrame * 0.05 + pi * 0.7) * 0.5 + 0.5;
      ctx.strokeStyle = PALETTE.accent + (Math.floor(pulse * 100 + 30)).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      if (part.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(px2 + pw/2, py2 + ph/2, pw/2 + 2, ph/2 + 2, 0, 0, Math.PI*2);
        ctx.stroke();
      } else {
        ctx.strokeRect(px2 - 1, py2 - 1, pw + 2, ph + 2);
      }
    }

    // Part label
    ctx.globalAlpha = isActive ? 0.75 : 0.3;
    var labelSize = Math.min(10, Math.max(6, Math.floor(part.w * 60)));
    drawT(part.name, part.x + part.w/2, part.y + part.h/2, labelSize, PALETTE.text);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // Spark/pop effect when a part is removed
  if (sparkTimer > 0) {
    sparkTimer--;
    var sparkCount = 8;
    var sparkProgress = 1 - sparkTimer / 25;
    for (var si = 0; si < sparkCount; si++) {
      var angle = (si / sparkCount) * Math.PI * 2 + sparkProgress * 0.5;
      var dist = sparkProgress * 0.08;
      var sx2 = sparkX + Math.cos(angle) * dist;
      var sy2 = sparkY + Math.sin(angle) * dist;
      ctx.globalAlpha = (1 - sparkProgress) * 0.9;
      ctx.fillStyle = PALETTE.accent;
      ctx.beginPath();
      ctx.arc(nx(sx2), ny(sy2), 3 - sparkProgress * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ═══ Shake timer decay ═══
  if (shakeTimer > 0) {
    shakeTimer--;
    if (shakeTimer <= 0) shakeTarget = null;
  }

  // ═══ Parts list panel (bottom) ═══
  var prog = getDeviceProgress(currentDevice);
  var panelY = 0.88;
  glowRect(0.02, panelY, 0.96, 0.10, 10, PALETTE.bg + 'ee', PALETTE.accent + '44');

  var partSpacing = Math.min(0.12, 0.90 / Math.max(1, parts.length));
  var listStartX = 0.5 - (parts.length * partSpacing) / 2;
  for (var li = 0; li < parts.length; li++) {
    var lo = parts[li];
    var lx2 = listStartX + li * partSpacing + partSpacing / 2;
    var partEmoji = lo.removed ? '\\u2705' : (isPartRemovable(currentDevice, li) ? '\\ud83d\\udd27' : '\\ud83d\\udd12');
    if (lo.removed) {
      ctx.globalAlpha = 0.35;
      drawT(partEmoji, lx2, panelY + 0.03, 12, PALETTE.text);
      ctx.globalAlpha = 1;
    } else {
      drawT(partEmoji, lx2, panelY + 0.03, 12, '#fff');
    }
    ctx.globalAlpha = lo.removed ? 0.3 : 0.7;
    drawT(lo.name.substring(0, 8), lx2, panelY + 0.07, 6, PALETTE.text);
    ctx.globalAlpha = 1;
  }

  // ═══ HUD ═══
  var nameAlpha = Math.min(1, roomNameTimer / 30);
  ctx.globalAlpha = nameAlpha;
  glowRect(0.10, 0.008, 0.80, 0.040, 10, PALETTE.bg + 'dd', PALETTE.accent + '40');
  drawTGlow(room.name, 0.5, 0.028, 14, PALETTE.accent, 8);
  ctx.globalAlpha = 1;

  // Progress counter
  glowRect(0.02, 0.008, 0.08, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT(prog.removed + '/' + prog.total, 0.06, 0.025, 11, PALETTE.accent);

  // Hint button
  glowRect(0.92, 0.008, 0.06, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT('\\ud83d\\udca1', 0.95, 0.025, 14, '#fff');

  // Device counter
  drawT('Device ' + (currentDevice + 1) + ' / ' + ROOM_COUNT, 0.5, 0.85, 10, PALETTE.text + '77');

  // Layer indicator
  if (!isDeviceComplete(currentDevice)) {
    var layerLabel = 'Layer ' + (activeLayer + 1);
    glowRect(0.42, 0.050, 0.16, 0.030, 8, PALETTE.bg + 'bb', PALETTE.accent + '33');
    drawT(layerLabel, 0.5, 0.065, 9, PALETTE.accent + 'cc');
  }

  // Hint overlay
  if (hintVisible && hintTimer > 0) {
    hintTimer--;
    for (var hi = 0; hi < parts.length; hi++) {
      if (isPartRemovable(currentDevice, hi)) {
        var ho = parts[hi];
        ctx.globalAlpha = 0.5 + Math.sin(animFrame * 0.1) * 0.3;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(nx(ho.x) - 4, ny(ho.y) - 4, nx(ho.w) + 8, ny(ho.h) + 8);
        drawT('\\ud83d\\udd27', ho.x + ho.w + 0.03, ho.y, 16, '#ffff00');
        ctx.globalAlpha = 1;
        break;
      }
    }
    if (hintTimer <= 0) hintVisible = false;
  }

  // Examine text popup
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

  // Device complete overlay
  if (isDeviceComplete(currentDevice)) {
    var alpha = Math.min(0.8, (animFrame % 200) < 100 ? 0.8 : 0.5);
    ctx.globalAlpha = alpha;
    glowRect(0.20, 0.35, 0.60, 0.20, 14, PALETTE.bg + 'ee', PALETTE.accent);
    drawTGlow('\\ud83d\\udd27 Fully Dismantled!', 0.5, 0.40, 18, PALETTE.accent, 12);
    if (currentDevice < ROOM_COUNT - 1) {
      drawT('Tap to move to next device', 0.5, 0.48, 12, PALETTE.text + 'cc');
    } else {
      drawT('All devices dismantled!', 0.5, 0.48, 12, PALETTE.text + 'cc');
    }
    ctx.globalAlpha = 1;
  }
}

function resetGame(){
  screen = 'title'; currentDevice = 0; inventory = [];
  removedParts.clear();
  examineText = ''; examineTimer = 0; hintVisible = false; hintTimer = 0;
  shakeTimer = 0; shakeTarget = null; sparkTimer = 0;
  for (var di = 0; di < deviceParts.length; di++) {
    for (var pi = 0; pi < deviceParts[di].length; pi++) {
      deviceParts[di][pi].removed = false;
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
      drawDeviceScene();
      ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    } else {
      drawDeviceScene();
    }
    if(showTutorial) drawTutorial();
  }
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}

// ═══════════ INPUT ═══════════
${inputPreamble()}
  // Device complete — advance
  if (isDeviceComplete(currentDevice)) {
    if (currentDevice < ROOM_COUNT - 1) {
      currentDevice++;
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

  // Check part taps
  var parts = deviceParts[currentDevice];
  for (var pi = parts.length - 1; pi >= 0; pi--) {
    var part = parts[pi];
    if (part.removed) continue;
    // Hit test
    if (px >= part.x && px <= part.x + part.w && py >= part.y && py <= part.y + part.h) {
      if (isPartRemovable(currentDevice, pi)) {
        // Remove the part!
        part.removed = true;
        removedParts.add(currentDevice + '_' + pi);

        // Spark effect
        sparkX = part.x + part.w / 2;
        sparkY = part.y + part.h / 2;
        sparkTimer = 25;

        examineText = 'Removed: ' + part.name;
        examineX = px;
        examineY = py - 0.1;
        examineTimer = 60;

        // If device is now complete, collect the main item
        if (isDeviceComplete(currentDevice)) {
          var it = ITEMS[currentDevice];
          if (it) {
            inventory.push({ name: it.name, emoji: it.emoji });
            examineText = 'Extracted: ' + it.name + '!';
            examineTimer = 100;
            checkWin();
          }
        }
      } else {
        // Part is blocked — shake it
        shakeTimer = 20;
        shakeTarget = pi;
        examineText = 'Blocked! Remove outer parts first.';
        examineX = px;
        examineY = py - 0.1;
        examineTimer = 50;
      }
      return;
    }
  }

  // Missed tap
  examineText = 'Tap a glowing component to remove it.';
  examineX = px;
  examineY = py - 0.08;
  examineTimer = 40;
});

${htmlFoot()}`;
}

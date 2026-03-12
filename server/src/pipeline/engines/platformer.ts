// ── Platformer Engine ──
// Side-scrolling platformer: gravity, jumping, platforms, collectibles, enemies.
// Rooms → levels. Furniture → platforms. Items → collectibles.

import {
  type EngineData,
  htmlHead, gameConstants, imagePreloader, prng, sharedState,
  canvasResize, drawHelpers, titleScreen, openingScreen, endingScreen,
  mainLoop, inputPreamble, htmlFoot,
} from './shared.js';

export function generatePlatformerHtml(data: EngineData): string {
  return `${htmlHead(data.title)}
${gameConstants(data)}
${imagePreloader()}
${prng()}
${sharedState()}

// ═══════════ PLATFORMER STATE ═══════════
let currentLevel = 0;
let transitionAlpha = 0;
let inventory = [];
let foundItems = new Set();
let solvedPuzzles = new Set();

// Player physics
var player = { x: 0.08, y: 0.75, vx: 0, vy: 0, w: 0.05, h: 0.08, onGround: false, facing: 1, frame: 0 };
var GRAVITY = 0.0012;
var JUMP_FORCE = -0.022;
var MOVE_SPEED = 0.006;
var moveDir = 0; // -1, 0, 1
var jumpPressed = false;
var touchId = null;
var lastTime = 0;

// Per-level platform data (generated from furniture + procedural)
var levelPlatforms = [];
var levelEnemies = [];
var levelDoors = [];

function buildLevel(idx) {
  var room = ROOMS[idx];
  var plats = [];
  // Ground platform
  plats.push({ x: 0, y: 0.88, w: 1.0, h: 0.12, color: room.floorColor || PALETTE.floor });
  // Platforms from furniture data
  if (room.furniture) {
    for (var i = 0; i < room.furniture.length; i++) {
      var f = room.furniture[i];
      // Convert furniture rects to platforms — clamped to reasonable platformer positions
      var px = Math.max(0.05, Math.min(0.90, f.x));
      var py = Math.max(0.30, Math.min(0.78, f.y + f.h)); // platform at bottom of furniture
      var pw = Math.max(0.08, Math.min(0.25, f.w));
      plats.push({ x: px, y: py, w: pw, h: 0.025, color: f.color || PALETTE.wall, label: f.label });
    }
  }
  // Procedural floating platforms to fill gaps — guarantee vertical traversal
  var existingCount = plats.length;
  if (existingCount < 5) {
    for (var j = 0; j < 5 - existingCount; j++) {
      plats.push({
        x: rf(0.1, 0.7),
        y: rf(0.35, 0.75),
        w: rf(0.10, 0.20),
        h: 0.025,
        color: PALETTE.wall
      });
    }
  }

  // Sort by y descending so lower platforms are rendered first
  plats.sort(function(a, b) { return b.y - a.y; });

  // Enemies (one per level on harder difficulties, skip level 0)
  var enemies = [];
  if (idx > 0 && idx < ROOM_COUNT) {
    var ep = plats[Math.min(2, plats.length - 1)]; // Walk on a mid-height platform
    if (ep && ep.w >= 0.10) {
      enemies.push({
        x: ep.x + ep.w * 0.3,
        y: ep.y - 0.05,
        w: 0.04, h: 0.05,
        minX: ep.x + 0.01,
        maxX: ep.x + ep.w - 0.05,
        speed: rf(0.001, 0.003),
        dir: 1
      });
    }
  }

  // Exit door (right side)
  var exitDoor = idx < ROOM_COUNT - 1 ? { x: 0.92, y: 0.72, w: 0.06, h: 0.16 } : null;
  // Entry marker (left side)
  var entryDoor = idx > 0 ? { x: 0.02, y: 0.72, w: 0.06, h: 0.16 } : null;

  return { platforms: plats, enemies: enemies, exitDoor: exitDoor, entryDoor: entryDoor };
}

// Pre-build all levels
for (var li = 0; li < ROOM_COUNT; li++) {
  var level = buildLevel(li);
  levelPlatforms.push(level.platforms);
  levelEnemies.push(level.enemies);
  levelDoors.push({ exit: level.exitDoor, entry: level.entryDoor });
}

// Item positions — floating above a random platform
var itemPositions = [];
for (var ii = 0; ii < ITEMS.length; ii++) {
  var platIdx = 1 + ri2(Math.max(1, levelPlatforms[ii] ? levelPlatforms[ii].length - 2 : 1));
  var platRef = levelPlatforms[ii] ? levelPlatforms[ii][Math.min(platIdx, levelPlatforms[ii].length - 1)] : null;
  if (platRef) {
    itemPositions.push({ x: platRef.x + platRef.w * 0.5, y: platRef.y - 0.08 });
  } else {
    itemPositions.push({ x: rf(0.2, 0.7), y: rf(0.4, 0.7) });
  }
}

${canvasResize()}
${drawHelpers()}

${titleScreen()}
${openingScreen()}

function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTB('How to Play',0.5,0.12,24,PALETTE.accent);
  var tips=[
    '\\u2b05\\ufe0f  Tap LEFT side to run left',
    '\\u27a1\\ufe0f  Tap RIGHT side to run right',
    '\\u2b06\\ufe0f  Tap TOP of screen to jump',
    '\\u2728  Collect glowing items in each level',
    '\\ud83d\\udeaa  Reach the exit door to advance',
    '\\ud83d\\udc7e  Avoid enemies \\u2014 they push you back!'
  ];
  for(var i=0;i<tips.length;i++){drawT(tips[i],0.5,0.26+i*0.10,13,PALETTE.text)}
  var pulse2=0.6+Math.sin(animFrame*0.08)*0.2;
  ctx.globalAlpha=pulse2;rRect(0.35,0.84,0.30,0.08,18,PALETTE.accent,null);
  ctx.globalAlpha=1;rRect(0.36,0.845,0.28,0.065,16,PALETTE.accent,null);
  drawTB('GOT IT',0.5,0.878,15,PALETTE.bg);
}

${endingScreen()}

// ═══════════ PHYSICS ═══════════
function updatePhysics() {
  var dt = 1; // fixed timestep
  // Horizontal movement
  player.vx = moveDir * MOVE_SPEED;
  player.x += player.vx * dt;
  // Clamp to screen
  if (player.x < 0.01) player.x = 0.01;
  if (player.x + player.w > 0.99) player.x = 0.99 - player.w;
  if (moveDir !== 0) { player.facing = moveDir; player.frame++; }

  // Gravity
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  // Platform collision
  var plats = levelPlatforms[currentLevel];
  for (var i = 0; i < plats.length; i++) {
    var p = plats[i];
    // Only collide from above (falling onto platform)
    if (player.vy >= 0 &&
        player.x + player.w > p.x + 0.01 && player.x < p.x + p.w - 0.01 &&
        player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 0.02) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }

  // Fall off bottom — respawn
  if (player.y > 1.1) {
    player.x = 0.08;
    player.y = 0.75;
    player.vy = 0;
    player.vx = 0;
  }

  // Jump
  if (jumpPressed && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    jumpPressed = false;
  }

  // Enemy collision
  var enemies = levelEnemies[currentLevel];
  for (var ei = 0; ei < enemies.length; ei++) {
    var en = enemies[ei];
    // Move enemy
    en.x += en.speed * en.dir;
    if (en.x <= en.minX || en.x + en.w >= en.maxX) en.dir *= -1;
    // Check collision with player
    if (player.x + player.w > en.x && player.x < en.x + en.w &&
        player.y + player.h > en.y && player.y < en.y + en.h) {
      // Push player back
      player.x += (player.x < en.x ? -0.08 : 0.08);
      player.vy = JUMP_FORCE * 0.6; // small bounce
    }
  }

  // Item pickup
  if (!foundItems.has(currentLevel)) {
    var ip = itemPositions[currentLevel];
    var it = ITEMS[currentLevel];
    if (it && ip && Math.abs(player.x + player.w/2 - ip.x) < 0.05 && Math.abs(player.y - ip.y) < 0.06) {
      inventory.push({ name: it.name, emoji: it.emoji });
      foundItems.add(currentLevel);
      checkWin();
    }
  }

  // Exit door
  var doors = levelDoors[currentLevel];
  if (doors.exit && player.x + player.w > doors.exit.x && player.y + player.h > doors.exit.y) {
    if (currentLevel < ROOM_COUNT - 1) {
      currentLevel++;
      player.x = 0.08;
      player.y = 0.75;
      player.vy = 0;
      transitionAlpha = 1;
      roomNameTimer = 0;
    }
  }
}

// ═══════════ DRAW LEVEL ═══════════
function drawLevel() {
  var room = ROOMS[currentLevel];

  // Background
  var hasImg = drawBgImage(loadedImages['room_' + currentLevel]);
  if (!hasImg) {
    // Gradient sky/environment fallback
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, PALETTE.bg);
    sky.addColorStop(0.6, PALETTE.wall);
    sky.addColorStop(1, PALETTE.floor);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  }

  // Draw platforms
  var plats = levelPlatforms[currentLevel];
  for (var i = 0; i < plats.length; i++) {
    var p = plats[i];
    // Ground is full width, regular platforms have edges
    if (p.w >= 0.9) {
      fillR(p.x, p.y, p.w, p.h, p.color);
      // Grass/surface line
      fillR(p.x, p.y, p.w, 0.005, PALETTE.accent + '66');
    } else {
      rRect(p.x, p.y, p.w, p.h, 4, p.color, PALETTE.accent + '55');
      // Highlight on top edge
      fillR(p.x + 0.005, p.y, p.w - 0.01, 0.004, PALETTE.accent + '44');
      if (p.label) {
        ctx.globalAlpha = 0.3;
        drawT(p.label, p.x + p.w / 2, p.y + 0.04, 7, PALETTE.text);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Draw exit door
  var doors = levelDoors[currentLevel];
  if (doors.exit) {
    var d = doors.exit;
    var glow = 0.4 + Math.sin(animFrame * 0.05) * 0.2;
    ctx.globalAlpha = glow;
    rRect(d.x - 0.01, d.y - 0.01, d.w + 0.02, d.h + 0.02, 6, PALETTE.accent + '30', null);
    ctx.globalAlpha = 1;
    rRect(d.x, d.y, d.w, d.h, 4, PALETTE.accent + '22', PALETTE.accent);
    drawTB('EXIT', d.x + d.w / 2, d.y + d.h / 2, 10, PALETTE.accent);
    drawTB('\\u25b6', d.x + d.w / 2, d.y + d.h * 0.3, 14, PALETTE.accent);
  }
  // Entry marker
  if (doors.entry) {
    var de = doors.entry;
    rRect(de.x, de.y, de.w, de.h, 4, PALETTE.bg + '44', PALETTE.accent + '44');
    drawT('\\u25c0', de.x + de.w / 2, de.y + de.h / 2, 12, PALETTE.accent + '66');
  }

  // Draw collectible item
  if (!foundItems.has(currentLevel)) {
    var ip = itemPositions[currentLevel];
    var it = ITEMS[currentLevel];
    if (it && ip) {
      var bob = Math.sin(animFrame * 0.06) * 0.01;
      var itemImg = loadedImages['item_' + currentLevel];
      var sparkle = 0.6 + Math.sin(animFrame * 0.08) * 0.3;
      // Sparkle ring
      ctx.save();
      ctx.globalAlpha = sparkle * 0.4;
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 2;
      var sparkR = nx(0.04) + Math.sin(animFrame * 0.05) * 3;
      ctx.beginPath();
      ctx.arc(nx(ip.x), ny(ip.y + bob), sparkR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (itemImg && itemImg.complete && itemImg.naturalWidth) {
        var isz = nx(0.07);
        ctx.drawImage(itemImg, nx(ip.x) - isz / 2, ny(ip.y + bob) - isz / 2, isz, isz);
      } else {
        drawTB(it.emoji, ip.x, ip.y + bob, 24, '#fff');
      }
    }
  }

  // Draw enemies
  var enemies = levelEnemies[currentLevel];
  for (var ei = 0; ei < enemies.length; ei++) {
    var en = enemies[ei];
    // Simple enemy: red blob with eyes
    rRect(en.x, en.y, en.w, en.h, 6, '#cc2244', '#ff4466');
    // Eyes
    var eyeY = en.y + en.h * 0.3;
    var eyeSize = en.w * 0.15;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(nx(en.x + en.w * 0.3), ny(eyeY), nx(eyeSize), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(nx(en.x + en.w * 0.7), ny(eyeY), nx(eyeSize), 0, Math.PI * 2); ctx.fill();
    // Pupils (look toward player)
    var pupDir = player.x < en.x ? -0.3 : 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(nx(en.x + en.w * 0.3 + eyeSize * pupDir), ny(eyeY), nx(eyeSize * 0.5), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(nx(en.x + en.w * 0.7 + eyeSize * pupDir), ny(eyeY), nx(eyeSize * 0.5), 0, Math.PI * 2); ctx.fill();
  }

  // Draw player
  var charImg = loadedImages['char'];
  if (charImg && charImg.complete && charImg.naturalWidth) {
    ctx.save();
    if (player.facing < 0) {
      ctx.translate(nx(player.x + player.w), 0);
      ctx.scale(-1, 1);
      ctx.drawImage(charImg, 0, ny(player.y), nx(player.w), ny(player.h));
    } else {
      ctx.drawImage(charImg, nx(player.x), ny(player.y), nx(player.w), ny(player.h));
    }
    ctx.restore();
  } else {
    // Fallback: colored rectangle
    rRect(player.x, player.y, player.w, player.h, 4, PALETTE.accent, '#fff');
    drawT(CHAR_NAME[0], player.x + player.w / 2, player.y + player.h / 2, 12, '#fff');
  }

  // ═══ HUD ═══
  var nameAlpha = Math.min(1, roomNameTimer / 30);
  ctx.globalAlpha = nameAlpha;
  rRect(0.10, 0.008, 0.80, 0.040, 10, PALETTE.bg + 'dd', null);
  drawTB(room.name, 0.5, 0.028, 14, PALETTE.accent);
  ctx.globalAlpha = 1;

  // Level counter
  drawT('Level ' + (currentLevel + 1) + ' / ' + ROOM_COUNT, 0.5, 0.955, 11, PALETTE.text + '77');

  // Items collected
  var collectStr = '\\u2728 ' + inventory.length + ' / ' + ROOM_COUNT;
  rRect(0.02, 0.008, 0.10, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT(collectStr, 0.07, 0.025, 10, PALETTE.accent);

  // Touch controls hint (bottom corners)
  ctx.globalAlpha = 0.15;
  drawT('\\u25c0', 0.06, 0.82, 24, PALETTE.text);
  drawT('\\u25b6', 0.94, 0.82, 24, PALETTE.text);
  drawT('JUMP', 0.5, 0.08, 10, PALETTE.text);
  ctx.globalAlpha = 1;
}

function resetGame(){
  screen='title';currentLevel=0;inventory=[];foundItems.clear();solvedPuzzles.clear();
  player.x=0.08;player.y=0.75;player.vx=0;player.vy=0;moveDir=0;jumpPressed=false;
}

function checkWin(){
  if(inventory.length>=ROOM_COUNT&&foundItems.size>=ROOM_COUNT){
    setTimeout(function(){screen='ending'},800);
  }
}

// ═══════════ MAIN LOOP ═══════════
function frame(){
  resize();animFrame++;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(screen==='title') drawTitle();
  else if(screen==='opening') drawOpening();
  else if(screen==='ending') drawEnding();
  else if(screen==='game'){
    updatePhysics();
    if(transitionAlpha>0){
      drawLevel();
      ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    } else {
      drawLevel();
    }
    if(showTutorial) drawTutorial();
  }
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}

// ═══════════ INPUT ═══════════
${inputPreamble()}
  // Game input — touch controls
  moveDir = 0;
  if(px < 0.25) { moveDir = -1; }
  else if(px > 0.75) { moveDir = 1; }
  if(py < 0.30) { jumpPressed = true; }
});

// Touch move for continuous movement
canvas.addEventListener('pointermove', function(e){
  if(screen !== 'game' || showTutorial) return;
  var rect = canvas.getBoundingClientRect();
  var px = (e.clientX - rect.left) / rect.width;
  moveDir = 0;
  if(px < 0.25) moveDir = -1;
  else if(px > 0.75) moveDir = 1;
});

canvas.addEventListener('pointerup', function(e){
  moveDir = 0;
  jumpPressed = false;
});

canvas.addEventListener('pointerleave', function(e){
  moveDir = 0;
  jumpPressed = false;
});

${htmlFoot()}`;
}

// ── Puzzle Game Engine ──
// Grid-based puzzles: sliding tiles, memory match, pattern sequence.
// Each "room" = a puzzle stage with a different puzzle type.
// Items → rewards for completing each stage.

import {
  type EngineData,
  htmlHead, gameConstants, imagePreloader, prng, sharedState,
  canvasResize, drawHelpers, titleScreen, openingScreen, endingScreen,
  mainLoop, inputPreamble, htmlFoot,
} from './shared.js';

export function generatePuzzleHtml(data: EngineData): string {
  return `${htmlHead(data.title)}
${gameConstants(data)}
${imagePreloader()}
${prng()}
${sharedState()}

// ═══════════ PUZZLE STATE ═══════════
let currentStage = 0;
let inventory = [];
let foundItems = new Set();
let transitionAlpha = 0;
let moveCount = 0;
let puzzleSolved = false;
let solveTimer = 0;
let examineText = '';
let examineTimer = 0;

// Puzzle types cycle per stage
var PUZZLE_TYPES = ['memory', 'sliding', 'sequence'];

// ─── Memory Match Puzzle ───
// Grid of face-down cards; flip two at a time to find pairs
var memCards = [];
var memFlipped = [];
var memMatched = new Set();
var memLockout = 0;

// ─── Sliding Tile Puzzle ───
// 3x3 grid with one empty space; slide tiles into order
var slideTiles = [];
var slideEmpty = 8; // index 0-8 of the empty tile

// ─── Sequence Pattern Puzzle ───
// Watch a pattern, then repeat it
var seqPattern = [];
var seqInput = [];
var seqShowIdx = 0;
var seqPhase = 'show'; // 'show' | 'input' | 'success' | 'fail'
var seqShowTimer = 0;
var seqLen = 3;

function getPuzzleType(idx) {
  return PUZZLE_TYPES[idx % PUZZLE_TYPES.length];
}

function initPuzzle(idx) {
  puzzleSolved = false;
  solveTimer = 0;
  moveCount = 0;
  var type = getPuzzleType(idx);

  if (type === 'memory') {
    // Create pairs from items + room emojis
    var symbols = [];
    for (var i = 0; i < ITEMS.length && symbols.length < 6; i++) {
      symbols.push(ITEMS[i].emoji);
    }
    while (symbols.length < 6) symbols.push(['\\u2b50', '\\ud83d\\udd25', '\\ud83d\\udc8e', '\\ud83c\\udf1f', '\\u2764', '\\ud83d\\ude80'][symbols.length]);
    // Take first N pairs based on difficulty (3-6 pairs → 6-12 cards)
    var pairCount = Math.min(6, 3 + Math.floor(idx / 2));
    var deck = [];
    for (var pi = 0; pi < pairCount; pi++) {
      deck.push({ id: pi, emoji: symbols[pi % symbols.length] });
      deck.push({ id: pi, emoji: symbols[pi % symbols.length] });
    }
    // Shuffle
    for (var si = deck.length - 1; si > 0; si--) {
      var sj = ri2(si + 1);
      var tmp = deck[si]; deck[si] = deck[sj]; deck[sj] = tmp;
    }
    memCards = deck;
    memFlipped = [];
    memMatched = new Set();
    memLockout = 0;

  } else if (type === 'sliding') {
    // Create solvable 3x3 sliding puzzle
    slideTiles = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = empty
    slideEmpty = 8;
    // Scramble by making random valid moves
    var movesDone = 30 + idx * 10;
    for (var mi = 0; mi < movesDone; mi++) {
      var neighbors = getSlideNeighbors(slideEmpty);
      var pick = neighbors[ri2(neighbors.length)];
      slideTiles[slideEmpty] = slideTiles[pick];
      slideTiles[pick] = 0;
      slideEmpty = pick;
    }

  } else if (type === 'sequence') {
    seqLen = 3 + Math.floor(idx / 2);
    if (seqLen > 8) seqLen = 8;
    seqPattern = [];
    for (var qi = 0; qi < seqLen; qi++) {
      seqPattern.push(ri2(4)); // 0-3 for 4 buttons
    }
    seqInput = [];
    seqShowIdx = 0;
    seqPhase = 'show';
    seqShowTimer = 0;
  }
}

function getSlideNeighbors(idx) {
  var r = Math.floor(idx / 3), c = idx % 3;
  var n = [];
  if (r > 0) n.push(idx - 3);
  if (r < 2) n.push(idx + 3);
  if (c > 0) n.push(idx - 1);
  if (c < 2) n.push(idx + 1);
  return n;
}

function isSlideSolved() {
  for (var i = 0; i < 8; i++) {
    if (slideTiles[i] !== i + 1) return false;
  }
  return true;
}

// Initialize first puzzle
initPuzzle(0);

${canvasResize()}
${drawHelpers()}

${titleScreen()}
${openingScreen()}

function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTGlow('How to Play',0.5,0.12,24,PALETTE.accent,12);
  var tips=[
    '\\ud83e\\udde9  Solve a different puzzle in each stage',
    '\\ud83c\\udccf  Memory: Flip cards to find matching pairs',
    '\\ud83d\\udd22  Slider: Slide numbered tiles into order',
    '\\ud83c\\udfb5  Sequence: Watch the pattern, then repeat it',
    '\\u2728  Complete each puzzle to earn an item',
    '\\ud83c\\udfc6  Solve all ' + ROOM_COUNT + ' stages to win!'
  ];
  for(var i=0;i<tips.length;i++){drawT(tips[i],0.5,0.26+i*0.10,13,PALETTE.text)}
  var pulse2=0.6+Math.sin(animFrame*0.08)*0.2;
  ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=16;
  ctx.globalAlpha=pulse2;rRect(0.35,0.84,0.30,0.08,18,PALETTE.accent,null);
  ctx.globalAlpha=1;rRect(0.36,0.845,0.28,0.065,16,PALETTE.accent,null);
  ctx.restore();
  drawTB('GOT IT',0.5,0.878,15,PALETTE.bg);
}

${endingScreen()}

// ═══════════ DRAW PUZZLE ═══════════
function drawPuzzleScreen() {
  var room = ROOMS[currentStage];

  // Background (dimmed room image)
  var hasImg = drawBgImage(loadedImages['room_' + currentStage]);
  if (!hasImg) {
    drawRoomFallbackBg(room);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.fillRect(0, 0, W, H);
  drawParticles(PALETTE.accent, 1);

  var type = getPuzzleType(currentStage);

  // ─── MEMORY MATCH ───
  if (type === 'memory') {
    var cols = memCards.length <= 8 ? 4 : (memCards.length <= 12 ? 4 : 6);
    var rows = Math.ceil(memCards.length / cols);
    var cardW = 0.12;
    var cardH = 0.14;
    var gap = 0.02;
    var gridW = cols * (cardW + gap) - gap;
    var gridH = rows * (cardH + gap) - gap;
    var startX = 0.5 - gridW / 2;
    var startY = 0.38 - gridH / 2 + 0.08;

    drawTGlow('\\ud83c\\udccf Memory Match', 0.5, 0.12, 18, PALETTE.accent, 10);
    drawT('Find all matching pairs', 0.5, 0.18, 11, PALETTE.text + 'aa');

    if (memLockout > 0) memLockout--;

    for (var mi = 0; mi < memCards.length; mi++) {
      var col = mi % cols;
      var row = Math.floor(mi / cols);
      var cx = startX + col * (cardW + gap);
      var cy = startY + row * (cardH + gap);
      var isFlipped = memFlipped.indexOf(mi) >= 0 || memMatched.has(memCards[mi].id);

      if (isFlipped) {
        ctx.save();ctx.shadowColor=PALETTE.accent;ctx.shadowBlur=14;
        rRect(cx, cy, cardW, cardH, 8, PALETTE.accent + '33', PALETTE.accent);
        ctx.restore();
        drawTB(memCards[mi].emoji, cx + cardW / 2, cy + cardH / 2, 22, '#fff');
      } else {
        glowRect(cx, cy, cardW, cardH, 8, PALETTE.wall, PALETTE.accent + '44');
        drawTB('?', cx + cardW / 2, cy + cardH / 2, 18, PALETTE.accent + '44');
      }
    }

    // Check for match after 2 flipped
    if (memFlipped.length === 2 && memLockout === 0) {
      var a = memFlipped[0], b = memFlipped[1];
      if (memCards[a].id === memCards[b].id) {
        memMatched.add(memCards[a].id);
        memFlipped = [];
        if (memMatched.size * 2 >= memCards.length) {
          puzzleSolved = true;
          solveTimer = 60;
        }
      } else {
        memLockout = 30; // show both cards briefly then flip back
      }
      if (memLockout === 1) {
        memFlipped = [];
      }
    }

  // ─── SLIDING TILE ───
  } else if (type === 'sliding') {
    var sz = 0.11;
    var ggap = 0.015;
    var gw = 3 * (sz + ggap) - ggap;
    var gsx = 0.5 - gw / 2;
    var gsy = 0.28;

    drawTGlow('\\ud83d\\udd22 Slide to Order', 0.5, 0.12, 18, PALETTE.accent, 10);
    drawT('Arrange tiles 1-8 in order', 0.5, 0.18, 11, PALETTE.text + 'aa');

    for (var ti = 0; ti < 9; ti++) {
      var tc = ti % 3, tr = Math.floor(ti / 3);
      var tx = gsx + tc * (sz + ggap);
      var ty = gsy + tr * (sz + ggap);
      var val = slideTiles[ti];
      if (val === 0) {
        // Empty space
        rRect(tx, ty, sz, sz, 6, PALETTE.bg + '44', PALETTE.accent + '22');
      } else {
        var isCorrect = val === ti + 1;
        var tileColor = isCorrect ? PALETTE.accent + '55' : PALETTE.wall;
        ctx.save();ctx.shadowColor=isCorrect?PALETTE.accent:'transparent';ctx.shadowBlur=isCorrect?12:0;
        rRect(tx, ty, sz, sz, 6, tileColor, PALETTE.accent);
        ctx.restore();
        drawTB(String(val), tx + sz / 2, ty + sz / 2, 20, isCorrect ? PALETTE.accent : PALETTE.text);
      }
    }

  // ─── SEQUENCE PATTERN ───
  } else if (type === 'sequence') {
    drawTGlow('\\ud83c\\udfb5 Repeat the Pattern', 0.5, 0.12, 18, PALETTE.accent, 10);

    var btnColors = [PALETTE.accent, '#ff4466', '#44cc88', '#ffaa22'];
    var btnLabels = ['\\u25b2', '\\u25c6', '\\u25cf', '\\u25a0'];
    var btnW = 0.14, btnH = 0.12;
    var btnGap = 0.04;
    var totalW = 4 * btnW + 3 * btnGap;
    var bsx = 0.5 - totalW / 2;
    var bsy = 0.50;

    if (seqPhase === 'show') {
      drawT('Watch carefully...', 0.5, 0.22, 13, PALETTE.text + 'aa');
      seqShowTimer++;
      // Flash each pattern element for 30 frames
      var currentShow = Math.floor(seqShowTimer / 40);
      if (currentShow >= seqPattern.length) {
        seqPhase = 'input';
        seqInput = [];
        seqShowTimer = 0;
      }
      for (var bi = 0; bi < 4; bi++) {
        var bx = bsx + bi * (btnW + btnGap);
        var lit = (currentShow < seqPattern.length && seqPattern[currentShow] === bi && (seqShowTimer % 40) < 25);
        ctx.save();if(lit){ctx.shadowColor=btnColors[bi];ctx.shadowBlur=22;}
        rRect(bx, bsy, btnW, btnH, 10, lit ? btnColors[bi] : PALETTE.bg + '44', btnColors[bi] + (lit ? '' : '88'));
        ctx.restore();
        drawTB(btnLabels[bi], bx + btnW / 2, bsy + btnH / 2, 20, lit ? '#fff' : btnColors[bi] + '88');
      }
    } else if (seqPhase === 'input') {
      drawT('Your turn! (' + seqInput.length + '/' + seqPattern.length + ')', 0.5, 0.22, 13, PALETTE.accent);
      for (var bi2 = 0; bi2 < 4; bi2++) {
        var bx2 = bsx + bi2 * (btnW + btnGap);
        rRect(bx2, bsy, btnW, btnH, 10, PALETTE.bg + '66', btnColors[bi2]);
        drawTB(btnLabels[bi2], bx2 + btnW / 2, bsy + btnH / 2, 20, btnColors[bi2]);
      }
      // Show input progress
      for (var pi = 0; pi < seqInput.length; pi++) {
        var dotX = 0.5 - (seqPattern.length * 0.03) / 2 + pi * 0.03;
        ctx.fillStyle = PALETTE.accent;
        ctx.beginPath(); ctx.arc(nx(dotX), ny(0.42), 4, 0, Math.PI * 2); ctx.fill();
      }
      for (var pj = seqInput.length; pj < seqPattern.length; pj++) {
        var dotX2 = 0.5 - (seqPattern.length * 0.03) / 2 + pj * 0.03;
        ctx.fillStyle = PALETTE.text + '33';
        ctx.beginPath(); ctx.arc(nx(dotX2), ny(0.42), 4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (seqPhase === 'success') {
      drawTB('\\u2705 Correct!', 0.5, 0.35, 20, PALETTE.accent);
      for (var bi3 = 0; bi3 < 4; bi3++) {
        var bx3 = bsx + bi3 * (btnW + btnGap);
        rRect(bx3, bsy, btnW, btnH, 10, btnColors[bi3] + '44', btnColors[bi3]);
        drawTB(btnLabels[bi3], bx3 + btnW / 2, bsy + btnH / 2, 20, btnColors[bi3]);
      }
      solveTimer++;
      if (solveTimer > 60) { puzzleSolved = true; }
    } else if (seqPhase === 'fail') {
      drawTB('\\u274c Try Again!', 0.5, 0.35, 20, '#ff4444');
      for (var bi4 = 0; bi4 < 4; bi4++) {
        var bx4 = bsx + bi4 * (btnW + btnGap);
        rRect(bx4, bsy, btnW, btnH, 10, PALETTE.bg + '44', '#ff4444' + '44');
        drawTB(btnLabels[bi4], bx4 + btnW / 2, bsy + btnH / 2, 20, '#ff4444' + '44');
      }
      seqShowTimer++;
      if (seqShowTimer > 45) {
        seqPhase = 'show';
        seqShowTimer = 0;
        seqShowIdx = 0;
      }
    }
  }

  // Solve animation
  if (puzzleSolved) {
    solveTimer--;
    if (solveTimer > 0) {
      ctx.globalAlpha = Math.min(1, (60 - solveTimer) / 30);
      glowRect(0.25, 0.38, 0.50, 0.14, 14, PALETTE.bg + 'ee', PALETTE.accent);
      var item = ITEMS[currentStage];
      if (item) {
        drawTGlow('\\u2728 ' + item.emoji + ' ' + item.name + ' earned!', 0.5, 0.43, 14, PALETTE.accent, 10);
      }
      drawT('Tap to continue', 0.5, 0.49, 10, PALETTE.text + '88');
      ctx.globalAlpha = 1;
    }
  }

  // ═══ HUD ═══
  var nameAlpha = Math.min(1, roomNameTimer / 30);
  ctx.globalAlpha = nameAlpha;
  glowRect(0.10, 0.008, 0.80, 0.040, 10, PALETTE.bg + 'dd', PALETTE.accent + '40');
  drawTGlow('Stage ' + (currentStage + 1) + ': ' + room.name, 0.5, 0.028, 13, PALETTE.accent, 8);
  ctx.globalAlpha = 1;

  // Moves counter
  glowRect(0.02, 0.008, 0.08, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT('\\ud83d\\udc63 ' + moveCount, 0.06, 0.025, 10, PALETTE.accent);

  // Progress
  drawT('Stage ' + (currentStage + 1) + ' / ' + ROOM_COUNT, 0.5, 0.955, 11, PALETTE.text + '77');

  // Items collected
  glowRect(0.88, 0.008, 0.10, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
  drawT('\\u2728 ' + inventory.length + '/' + ROOM_COUNT, 0.93, 0.025, 10, PALETTE.accent);

  // Examine text (shows briefly on solve)
  if (examineText && examineTimer > 0) {
    var ea = Math.min(1, examineTimer / 20);
    ctx.globalAlpha = ea;
    glowRect(0.15, 0.80, 0.70, 0.06, 10, PALETTE.bg + 'f0', PALETTE.accent + '88');
    drawT(examineText, 0.5, 0.83, 11, PALETTE.text);
    ctx.globalAlpha = 1;
    examineTimer--;
  }
}

function resetGame(){
  screen = 'title'; currentStage = 0; inventory = []; foundItems.clear();
  moveCount = 0; examineText = ''; examineTimer = 0;
  initPuzzle(0);
}

function checkWin(){
  if(inventory.length >= ROOM_COUNT) {
    setTimeout(function(){ screen = 'ending'; }, 600);
  }
}

function advanceStage() {
  if (!foundItems.has(currentStage)) {
    var it = ITEMS[currentStage];
    if (it) {
      inventory.push({ name: it.name, emoji: it.emoji });
      foundItems.add(currentStage);
    }
  }
  if (currentStage < ROOM_COUNT - 1) {
    currentStage++;
    initPuzzle(currentStage);
    transitionAlpha = 1;
    roomNameTimer = 0;
  } else {
    checkWin();
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
    if(transitionAlpha>0){
      drawPuzzleScreen();
      ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    } else {
      drawPuzzleScreen();
    }
    if(showTutorial) drawTutorial();
  }
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}

// ═══════════ INPUT ═══════════
${inputPreamble()}
  // Puzzle solved — tap to advance
  if (puzzleSolved) {
    advanceStage();
    return;
  }

  var type = getPuzzleType(currentStage);
  moveCount++;

  if (type === 'memory') {
    if (memLockout > 0) return;
    if (memFlipped.length >= 2) return;
    // Find which card was tapped
    var cols = memCards.length <= 8 ? 4 : (memCards.length <= 12 ? 4 : 6);
    var rows = Math.ceil(memCards.length / cols);
    var cardW = 0.12, cardH = 0.14, gap = 0.02;
    var gridW = cols * (cardW + gap) - gap;
    var startX = 0.5 - gridW / 2;
    var startY = 0.38 - (rows * (cardH + gap) - gap) / 2 + 0.08;
    for (var mi = 0; mi < memCards.length; mi++) {
      var col = mi % cols;
      var row = Math.floor(mi / cols);
      var cx = startX + col * (cardW + gap);
      var cy = startY + row * (cardH + gap);
      if (px >= cx && px <= cx + cardW && py >= cy && py <= cy + cardH) {
        if (memFlipped.indexOf(mi) < 0 && !memMatched.has(memCards[mi].id)) {
          memFlipped.push(mi);
        }
        break;
      }
    }

  } else if (type === 'sliding') {
    var sz = 0.11, ggap = 0.015;
    var gw = 3 * (sz + ggap) - ggap;
    var gsx = 0.5 - gw / 2;
    var gsy = 0.28;
    for (var ti = 0; ti < 9; ti++) {
      var tc = ti % 3, tr = Math.floor(ti / 3);
      var tx = gsx + tc * (sz + ggap);
      var ty = gsy + tr * (sz + ggap);
      if (px >= tx && px <= tx + sz && py >= ty && py <= ty + sz) {
        // Can only click a tile adjacent to empty
        var neighbors = getSlideNeighbors(slideEmpty);
        if (neighbors.indexOf(ti) >= 0) {
          slideTiles[slideEmpty] = slideTiles[ti];
          slideTiles[ti] = 0;
          slideEmpty = ti;
          if (isSlideSolved()) {
            puzzleSolved = true;
            solveTimer = 60;
          }
        }
        break;
      }
    }

  } else if (type === 'sequence') {
    if (seqPhase === 'input') {
      var btnW = 0.14, btnH = 0.12, btnGap = 0.04;
      var totalW = 4 * btnW + 3 * btnGap;
      var bsx = 0.5 - totalW / 2;
      var bsy = 0.50;
      for (var bi = 0; bi < 4; bi++) {
        var bx = bsx + bi * (btnW + btnGap);
        if (px >= bx && px <= bx + btnW && py >= bsy && py <= bsy + btnH) {
          seqInput.push(bi);
          // Check if correct so far
          var lastIdx = seqInput.length - 1;
          if (seqInput[lastIdx] !== seqPattern[lastIdx]) {
            seqPhase = 'fail';
            seqShowTimer = 0;
            seqInput = [];
          } else if (seqInput.length === seqPattern.length) {
            seqPhase = 'success';
            solveTimer = 0;
          }
          break;
        }
      }
    }
  }
});

${htmlFoot()}`;
}

// ── Visual Novel Engine ──
// Story-driven with dialogue, character portraits, and branching choices.
// Rooms → chapters/scenes. Items → key story items/evidence. Furniture → ignored.
// Also used for Interactive Fiction (text-heavy variant).

import {
  type EngineData,
  htmlHead, gameConstants, imagePreloader, prng, sharedState,
  canvasResize, drawHelpers, titleScreen, openingScreen, endingScreen,
  mainLoop, inputPreamble, htmlFoot,
} from './shared.js';

export function generateVisualNovelHtml(data: EngineData, isInteractiveFiction: boolean = false): string {
  return `${htmlHead(data.title)}
${gameConstants(data)}
${imagePreloader()}
${prng()}
${sharedState()}

// ═══════════ VISUAL NOVEL STATE ═══════════
let currentScene = 0;
let inventory = [];
let foundItems = new Set();
let transitionAlpha = 0;

// Dialogue system
var dialogueQueue = [];
var currentDialogue = null;
var textProgress = 0;
var textSpeed = 0.8; // chars per frame
var waitingForTap = false;
var choiceActive = false;
var choices = [];
var choiceResult = -1;
var narratorMode = ${isInteractiveFiction ? 'true' : 'false'};

// Build dialogue sequences from room data
var sceneDialogues = [];
for (var si = 0; si < ROOM_COUNT; si++) {
  var room = ROOMS[si];
  var seq = [];

  // Scene intro narration
  seq.push({ speaker: 'narrator', text: room.description, portrait: null });

  // Atmospheric detail
  if (room.examineText) {
    seq.push({ speaker: 'narrator', text: room.examineText, portrait: null });
  }

  // Character dialogue about the scene
  seq.push({ speaker: CHAR_NAME, text: room.atmosphere ? '"' + room.atmosphere + '..." I murmur, looking around.' : '"I should look around carefully."', portrait: 'char' });

  // Item discovery (if present)
  var item = ITEMS[si];
  if (item) {
    seq.push({ speaker: 'narrator', text: 'Something catches your eye \\u2014 ' + item.emoji + ' ' + item.name + '.', portrait: null });
    seq.push({ speaker: CHAR_NAME, text: item.description, portrait: 'char', giveItem: si });
  }

  // Hint as a thought
  var hint = HINTS[si];
  if (hint) {
    seq.push({ speaker: CHAR_NAME, text: '"' + hint + '"', portrait: 'char' });
  }

  // Choice at certain scenes (every 2nd scene if enough content)
  if (si > 0 && si < ROOM_COUNT - 1 && si % 2 === 0) {
    seq.push({
      speaker: 'choice',
      text: 'What do you want to do?',
      options: [
        { text: 'Investigate further', next: 'continue' },
        { text: 'Move on quickly', next: 'skip' }
      ]
    });
    seq.push({ speaker: CHAR_NAME, text: '"The path forward becomes clearer..."', portrait: 'char' });
  }

  // Transition to next scene
  if (si < ROOM_COUNT - 1) {
    seq.push({ speaker: 'narrator', text: 'You steel yourself and move forward to the next chapter.', portrait: null });
  }

  sceneDialogues.push(seq);
}

var dialogueIndex = 0;
var sceneComplete = false;

function startScene(idx) {
  currentScene = idx;
  dialogueIndex = 0;
  sceneComplete = false;
  textProgress = 0;
  waitingForTap = false;
  choiceActive = false;
  transitionAlpha = 1;
  roomNameTimer = 0;
}

function getCurrentDialogue() {
  if (currentScene >= ROOM_COUNT) return null;
  var seq = sceneDialogues[currentScene];
  if (dialogueIndex >= seq.length) return null;
  return seq[dialogueIndex];
}

${canvasResize()}
${drawHelpers()}

${titleScreen()}
${openingScreen()}

function drawTutorial(){
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(0,0,W,H);
  drawTGlow('How to Play',0.5,0.12,24,PALETTE.accent,12);
  var tips = narratorMode ? [
    '\\ud83d\\udcdc  Read the story as it unfolds',
    '\\ud83d\\udc46  Tap to advance the text',
    '\\ud83d\\udd00  Make choices when they appear',
    '\\u2728  Key items are collected automatically',
    '\\ud83d\\udcda  Experience ' + ROOM_COUNT + ' unique passages',
    '\\ud83c\\udfa0  Your choices shape the narrative'
  ] : [
    '\\ud83d\\udcdc  Read the story as it unfolds',
    '\\ud83d\\udc46  Tap to advance dialogue',
    '\\ud83d\\udd00  Make choices when they appear',
    '\\u2728  Key items are collected automatically',
    '\\ud83d\\udcda  Experience ' + ROOM_COUNT + ' chapters',
    '\\ud83c\\udfa0  Immerse yourself in the world'
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

// ═══════════ DRAW SCENE ═══════════
function drawScene() {
  var room = ROOMS[currentScene];

  // Full-screen background
  var hasImg = drawBgImage(loadedImages['room_' + currentScene]);
  if (!hasImg) {
    drawRoomFallbackBg(room);
  }

  // Dim overlay for text readability
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, H);
  
  // Ambient particles
  drawParticles(PALETTE.accent, -1);

  var dlg = getCurrentDialogue();

  // Character portrait (left side)
  if (dlg && dlg.portrait === 'char' && loadedImages['char'] && loadedImages['char'].complete) {
    var bob = Math.sin(animFrame * 0.03) * 3;
    var pw = W * 0.22, ph = pw * (loadedImages['char'].naturalHeight / loadedImages['char'].naturalWidth);
    var maxPh = H * 0.6; if (ph > maxPh) { pw = pw * (maxPh / ph); ph = maxPh; }
    var pcx = W * 0.03, pcy = H * 0.18 + bob;
    // Radial glow behind character
    ctx.save();
    var charGlow = ctx.createRadialGradient(pcx + pw / 2, pcy + ph * 0.5, pw * 0.1, pcx + pw / 2, pcy + ph * 0.5, pw * 0.7);
    charGlow.addColorStop(0, PALETTE.accent + '30');
    charGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = charGlow;
    ctx.fillRect(pcx - pw * 0.2, pcy - ph * 0.1, pw * 1.4, ph * 1.2);
    ctx.restore();
    ctx.drawImage(loadedImages['char'], pcx, pcy, pw, ph);
  }

  // ═══ Dialogue box ═══
  if (dlg) {
    if (dlg.speaker === 'choice') {
      // Choice mode
      glowRect(0.15, 0.25, 0.70, 0.50, 14, PALETTE.bg + 'f0', PALETTE.accent + '88');
      drawTGlow(dlg.text, 0.5, 0.30, 16, PALETTE.accent, 8);
      for (var ci = 0; ci < dlg.options.length; ci++) {
        var cy = 0.40 + ci * 0.12;
        ctx.save(); ctx.shadowColor = PALETTE.accent; ctx.shadowBlur = 10;
        rRect(0.22, cy, 0.56, 0.08, 10, PALETTE.accent + '33', PALETTE.accent);
        ctx.restore();
        drawTB(dlg.options[ci].text, 0.5, cy + 0.04, 14, PALETTE.text);
      }
      choiceActive = true;
      choices = dlg.options;
    } else {
      // Dialogue/narration box
      var boxY = 0.70;
      var boxH = 0.22;
      glowRect(0.05, boxY, 0.90, boxH, 12, PALETTE.bg + 'f0', PALETTE.accent + '55');

      // Speaker name plate
      if (dlg.speaker !== 'narrator') {
        ctx.save(); ctx.shadowColor = PALETTE.accent; ctx.shadowBlur = 10;
        rRect(0.08, boxY - 0.025, 0.25, 0.04, 8, PALETTE.accent, null);
        ctx.restore();
        drawTB(dlg.speaker, 0.205, boxY - 0.005, 11, PALETTE.bg);
      } else {
        glowRect(0.08, boxY - 0.025, 0.18, 0.04, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
        drawT('\\ud83d\\udcdc Narration', 0.17, boxY - 0.005, 10, PALETTE.accent);
      }

      // Text with typing effect
      var fullText = dlg.text;
      var visibleChars = Math.min(fullText.length, Math.floor(textProgress));
      var displayText = fullText.substring(0, visibleChars);
      textProgress += textSpeed;

      wrapT(displayText, 0.5, boxY + 0.06, 13, PALETTE.text, 0.78);

      // "Tap to continue" indicator
      if (visibleChars >= fullText.length) {
        waitingForTap = true;
        var alpha = 0.4 + Math.sin(animFrame * 0.08) * 0.3;
        ctx.globalAlpha = alpha;
        drawT('\\u25bc tap to continue', 0.5, boxY + boxH - 0.02, 9, PALETTE.accent);
        ctx.globalAlpha = 1;
      }
    }
  } else if (!sceneComplete) {
    // Scene complete — advance to next
    sceneComplete = true;
    if (currentScene < ROOM_COUNT - 1) {
      startScene(currentScene + 1);
    } else {
      screen = 'ending';
    }
  }

  // ═══ HUD ═══
  var nameAlpha = Math.min(1, roomNameTimer / 30);
  ctx.globalAlpha = nameAlpha;
  glowRect(0.10, 0.008, 0.80, 0.040, 10, PALETTE.bg + 'dd', PALETTE.accent + '40');
  drawTGlow((narratorMode ? 'Passage ' : 'Chapter ') + (currentScene + 1) + ': ' + room.name, 0.5, 0.028, 13, PALETTE.accent, 8);
  ctx.globalAlpha = 1;

  // Progress indicator
  var progW = 0.30;
  var progX = 0.35;
  rRect(progX, 0.955, progW, 0.012, 4, PALETTE.bg + '88', PALETTE.accent + '44');
  var fill = (currentScene + (dialogueIndex / Math.max(1, sceneDialogues[currentScene].length))) / ROOM_COUNT;
  ctx.save(); ctx.shadowColor = PALETTE.accent; ctx.shadowBlur = 8;
  rRect(progX, 0.955, progW * fill, 0.012, 4, PALETTE.accent, null);
  ctx.restore();
  drawT((currentScene + 1) + ' / ' + ROOM_COUNT, 0.5, 0.985, 9, PALETTE.text + '77');

  // Items collected
  if (inventory.length > 0) {
    glowRect(0.02, 0.008, 0.08, 0.035, 8, PALETTE.bg + 'cc', PALETTE.accent + '66');
    drawT('\\u2728 ' + inventory.length, 0.06, 0.025, 10, PALETTE.accent);
  }
}

function resetGame(){
  screen = 'title'; currentScene = 0; inventory = []; foundItems.clear();
  dialogueIndex = 0; textProgress = 0; waitingForTap = false;
  choiceActive = false; sceneComplete = false;
}

function checkWin(){
  if(inventory.length >= ROOM_COUNT) {
    setTimeout(function(){ screen = 'ending'; }, 600);
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
      drawScene();
      ctx.fillStyle=PALETTE.bg;ctx.globalAlpha=transitionAlpha;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
      transitionAlpha-=0.04;if(transitionAlpha<=0)transitionAlpha=0;
    } else {
      drawScene();
    }
    if(showTutorial) drawTutorial();
  }
  if(roomNameTimer<60)roomNameTimer++;
  requestAnimationFrame(frame);
}

// ═══════════ INPUT ═══════════
${inputPreamble()}
  // Game input
  if (choiceActive && choices.length > 0) {
    // Check which choice was tapped
    for (var ci = 0; ci < choices.length; ci++) {
      var cy = 0.40 + ci * 0.12;
      if (px > 0.22 && px < 0.78 && py > cy && py < cy + 0.08) {
        choiceActive = false;
        choices = [];
        dialogueIndex++;
        textProgress = 0;
        waitingForTap = false;
        break;
      }
    }
    return;
  }

  if (waitingForTap) {
    var dlg = getCurrentDialogue();
    // Check for item giving
    if (dlg && dlg.giveItem !== undefined && !foundItems.has(dlg.giveItem)) {
      var it = ITEMS[dlg.giveItem];
      if (it) {
        inventory.push({ name: it.name, emoji: it.emoji });
        foundItems.add(dlg.giveItem);
        checkWin();
      }
    }
    // Advance dialogue
    dialogueIndex++;
    textProgress = 0;
    waitingForTap = false;
    return;
  }

  // Fast-forward text
  var cdlg = getCurrentDialogue();
  if (cdlg && cdlg.speaker !== 'choice') {
    textProgress = cdlg.text.length + 1;
    return;
  }
});

${htmlFoot()}`;
}

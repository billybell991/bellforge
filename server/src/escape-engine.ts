// ── Boxed Escape Room HTML Engine ──
// Generates a self-contained HTML page simulating a tabletop boxed escape room
// Experience: tabletop → click box → items slide to toolbar → solve sealed envelopes

import type { EscapeRoomData } from './escape-pipeline.js';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function generateEscapePreviewHtml(data: EscapeRoomData): string {
  // Fix double-encoded UTF-8 emoji (Gemini SDK sometimes returns mojibake)
  const fixEncoding = (s: string): string => {
    // Skip base64 data URIs and long strings (content HTML, etc.) — only fix short display strings
    if (s.length > 500 || s.startsWith('data:')) return s;
    try {
      const bytes = Buffer.from(s, 'latin1');
      const fixed = bytes.toString('utf8');
      if (fixed.length < s.length && !fixed.includes('\uFFFD')) return fixed;
    } catch { /* not double-encoded, use original */ }
    return s;
  };
  const fixObj = (obj: unknown): unknown => {
    if (typeof obj === 'string') return fixEncoding(obj);
    if (Array.isArray(obj)) return obj.map(fixObj);
    if (obj && typeof obj === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = fixObj(v);
      return out;
    }
    return obj;
  };
  const cleanData = fixObj(data) as EscapeRoomData;
  const dataJson = JSON.stringify(cleanData).replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#1a1008">
<title>${escapeHtml(data.title)}</title>
<link rel="manifest" href="data:application/json,${encodeURIComponent(JSON.stringify({
    name: data.title,
    short_name: data.title.slice(0, 12),
    start_url: '.',
    display: 'standalone',
    background_color: '#1a1008',
    theme_color: '#1a1008',
    icons: [{ src: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>', sizes: 'any', type: 'image/svg+xml' }]
  }))}">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Special+Elite&display=swap');

  :root {
    --bg: #0e0a06;
    --tabletop: #1a1008;
    --box-base: #14100e;
    --box-accent: #8B4513;
    --paper: #f2e8d0;
    --paper-dark: #d4c5a0;
    --ink: #2a1f14;
    --seal-red: #8B0000;
    --gold: #c9a84c;
    --gold-dim: #8a6f2f;
    --brass: #b8a64d;
    --success: #2ecc71;
    --danger: #c0392b;
    --text: #e8e0d4;
    --text-dim: #887766;
    --shadow: rgba(0,0,0,0.6);
    --shadow-heavy: rgba(0,0,0,0.85);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--bg);
    font-family: 'Crimson Text', Georgia, serif;
    color: var(--text);
    overflow: hidden;
    width: 100vw; height: 100vh;
    user-select: none; -webkit-user-select: none;
  }

  /* ── Tabletop ── */
  #tabletop {
    position: fixed; inset: 0;
    background: var(--tabletop);
    background-size: cover;
    background-position: center;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
  }
  #tabletop::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);
    pointer-events: none;
  }

  /* ── Box ── */
  #escape-box {
    position: relative; z-index: 10;
    width: 320px; height: 420px;
    cursor: pointer;
    transition: transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s;
    filter: drop-shadow(0 20px 40px rgba(0,0,0,0.7));
  }
  #escape-box:hover { transform: scale(1.03) translateY(-4px); }
  #escape-box.opened {
    transform: scale(0.3) translateY(-200px);
    opacity: 0; pointer-events: none;
  }
  .box-cover {
    width: 100%; height: 100%;
    background: var(--box-base);
    border: 3px solid var(--box-accent);
    border-radius: 4px;
    overflow: hidden;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative;
  }
  .box-cover img {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; opacity: 0.85;
  }
  .box-title-overlay {
    position: relative; z-index: 1;
    text-align: center; padding: 1.5rem;
    background: rgba(0,0,0,0.65);
    border-top: 2px solid var(--gold-dim);
    border-bottom: 2px solid var(--gold-dim);
    width: 100%;
  }
  .box-title-overlay h1 {
    font-family: 'Cinzel Decorative', serif;
    font-size: 1.3rem; color: var(--gold);
    text-shadow: 0 2px 8px rgba(0,0,0,0.8);
    letter-spacing: 2px; text-transform: uppercase;
  }
  .box-title-overlay .subtitle {
    font-size: 0.85rem; color: var(--text-dim);
    margin-top: 0.3rem; font-style: italic;
  }
  .box-prompt {
    position: absolute; bottom: 16px; z-index: 2;
    font-family: 'Special Elite', monospace;
    font-size: 0.75rem; color: var(--gold);
    animation: pulse 2s ease-in-out infinite;
    letter-spacing: 1px;
  }
  @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }

  /* ── Main Game Area (visible after box opens) ── */
  #game-area {
    position: fixed; inset: 0;
    display: none; flex-direction: column;
    z-index: 20;
  }
  #game-area.active { display: flex; }

  /* ── HUD ── */
  #hud {
    height: 52px; display: flex; align-items: center;
    padding: 0 16px;
    background: linear-gradient(180deg, rgba(20,16,14,0.95) 0%, rgba(14,10,6,0.9) 100%);
    border-bottom: 1px solid rgba(201,168,76,0.2);
    z-index: 30; flex-shrink: 0;
  }
  #hud .title {
    font-family: 'Cinzel Decorative', serif;
    font-size: 0.8rem; color: var(--gold); flex: 1;
    letter-spacing: 1px;
  }
  #hud .timer {
    font-family: 'Special Elite', monospace;
    font-size: 1rem; color: var(--text); margin-right: 12px;
  }
  .hud-btn {
    background: none; border: 1px solid rgba(201,168,76,0.3);
    color: var(--text); padding: 6px 12px; border-radius: 4px;
    cursor: pointer; font-size: 0.75rem; margin-left: 8px;
    font-family: 'Special Elite', monospace;
    transition: background 0.15s, border-color 0.15s;
  }
  .hud-btn:hover { background: rgba(201,168,76,0.1); border-color: var(--gold); }
  .stage-pips {
    display: flex; gap: 6px; margin-right: 16px;
  }
  .pip {
    width: 12px; height: 12px; border-radius: 50%;
    border: 2px solid var(--gold-dim);
    transition: background 0.4s, border-color 0.4s, box-shadow 0.4s;
  }
  .pip.solved { background: var(--success); border-color: var(--success); }
  .pip.current { border-color: var(--gold); box-shadow: 0 0 8px rgba(201,168,76,0.5); }
  .pip.locked { opacity: 0.3; }

  /* ── Content Area ── */
  #content-area {
    flex: 1; position: relative; overflow: hidden;
    background: var(--tabletop);
    background-size: cover; background-position: center;
  }
  #content-area::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%);
    pointer-events: none;
  }

  /* ── Viewer (center document) ── */
  #viewer {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 90%; max-width: 640px;
    max-height: calc(100% - 20px);
    overflow-y: auto;
    z-index: 5;
  }
  .card {
    background: var(--paper);
    color: var(--ink);
    border-radius: 4px;
    padding: 2rem 2.5rem;
    box-shadow: 0 8px 32px var(--shadow-heavy), 0 1px 0 var(--paper-dark);
    font-size: 1rem; line-height: 1.7;
    position: relative;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  }
  .card h2 {
    font-family: 'Cinzel Decorative', serif;
    font-size: 1.2rem; color: var(--seal-red);
    margin-bottom: 1rem; text-align: center;
    border-bottom: 1px solid rgba(42,31,20,0.2);
    padding-bottom: 0.75rem;
  }
  .card p { margin-bottom: 0.75rem; }
  .card em { color: #5a3e28; }
  .card strong { color: #1a0f08; }

  /* ── Sealed Envelope ── */
  .envelope {
    background: linear-gradient(145deg, #3a2a1a, #2a1c10);
    border: 2px solid var(--box-accent);
    border-radius: 6px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 16px var(--shadow);
    position: relative;
    max-width: 400px; margin: 0 auto;
  }
  .envelope:hover { transform: translateY(-3px); box-shadow: 0 8px 24px var(--shadow-heavy); }
  .envelope .wax-seal {
    width: 64px; height: 64px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.8rem;
    margin: 0 auto 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.1);
  }
  .envelope .envelope-label {
    font-family: 'Cinzel Decorative', serif;
    font-size: 1rem; color: var(--gold);
    letter-spacing: 1px;
  }
  .envelope .envelope-hint {
    font-size: 0.8rem; color: var(--text-dim);
    margin-top: 0.5rem; font-style: italic;
  }
  .envelope.locked { opacity: 0.4; pointer-events: none; cursor: default; }
  .envelope.solved {
    opacity: 0.5; pointer-events: none;
    border-color: var(--success);
  }
  .envelope.solved .wax-seal { box-shadow: 0 0 12px rgba(46,204,113,0.3); }

  /* ── Puzzle Overlay ── */
  #puzzle-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.85);
    display: none; align-items: center; justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
  }
  #puzzle-overlay.active { display: flex; }
  .puzzle-panel {
    background: var(--paper);
    color: var(--ink);
    border-radius: 6px;
    padding: 2rem;
    max-width: 520px; width: 90%;
    max-height: 85vh; overflow-y: auto;
    box-shadow: 0 12px 48px var(--shadow-heavy);
    position: relative;
  }
  .puzzle-panel h3 {
    font-family: 'Cinzel Decorative', serif;
    font-size: 1.1rem; color: var(--seal-red);
    margin-bottom: 0.75rem; text-align: center;
  }
  .puzzle-panel p { margin-bottom: 0.75rem; line-height: 1.6; }
  .puzzle-close {
    position: absolute; top: 12px; right: 12px;
    background: var(--seal-red); color: white;
    border: none; width: 28px; height: 28px;
    border-radius: 50%; cursor: pointer;
    font-size: 1rem; line-height: 1;
  }

  /* ── Code Entry ── */
  .code-entry {
    display: flex; gap: 8px; justify-content: center; margin: 1.5rem 0;
  }
  .code-digit {
    width: 52px; height: 64px;
    border: 2px solid var(--box-accent);
    border-radius: 4px;
    background: #fff;
    font-family: 'Special Elite', monospace;
    font-size: 1.8rem; text-align: center;
    color: var(--ink);
  }

  /* ── Riddle Options ── */
  .riddle-options { display: flex; flex-direction: column; gap: 8px; margin: 1rem 0; }
  .riddle-opt {
    padding: 12px 16px;
    border: 2px solid var(--box-accent);
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background 0.15s, border-color 0.15s;
  }
  .riddle-opt:hover { background: #fdf5e6; border-color: var(--gold); }
  .riddle-opt.correct { background: #d4edda; border-color: var(--success); }
  .riddle-opt.wrong { background: #f8d7da; border-color: var(--danger); }

  /* ── Sequence Buttons ── */
  .seq-btns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 1rem 0; }
  .seq-btn {
    padding: 10px 16px;
    border: 2px solid var(--box-accent);
    border-radius: 4px;
    background: #fff;
    cursor: pointer; font-size: 0.9rem;
    transition: background 0.15s, transform 0.1s;
  }
  .seq-btn:hover { background: #fdf5e6; }
  .seq-btn.pressed { background: var(--gold); color: #fff; transform: scale(0.95); }

  /* ── Combination Dials ── */
  .dial-row { display: flex; gap: 16px; justify-content: center; margin: 1rem 0; flex-wrap: wrap; }
  .dial {
    text-align: center;
  }
  .dial label { display: block; font-size: 0.8rem; margin-bottom: 4px; font-weight: 600; }
  .dial select {
    padding: 8px 12px; border: 2px solid var(--box-accent);
    border-radius: 4px; background: #fff;
    font-size: 1rem; font-family: 'Special Elite', monospace;
    cursor: pointer;
  }

  /* ── Cipher Input ── */
  .cipher-display {
    background: #2a1f14; color: var(--gold);
    padding: 1rem; border-radius: 4px;
    font-family: 'Special Elite', monospace;
    font-size: 1.1rem; text-align: center;
    letter-spacing: 3px; margin: 1rem 0;
  }
  .cipher-input {
    width: 100%; padding: 10px;
    border: 2px solid var(--box-accent);
    border-radius: 4px; font-size: 1rem;
    font-family: 'Special Elite', monospace;
    text-align: center; letter-spacing: 2px;
  }

  /* ── Fragment Arrange ── */
  .frag-tray { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 1rem 0; }
  .frag {
    padding: 8px 14px;
    border: 2px solid var(--box-accent);
    border-radius: 4px;
    background: var(--paper-dark);
    cursor: grab; font-family: 'Special Elite', monospace;
    font-size: 1rem;
    transition: transform 0.1s;
  }
  .frag:hover { transform: translateY(-2px); }
  .frag-answer {
    display: flex; gap: 4px; justify-content: center; margin: 1rem 0;
    min-height: 44px; border: 2px dashed var(--box-accent);
    border-radius: 4px; padding: 6px;
    align-items: center;
  }
  .frag-answer .frag { cursor: pointer; background: var(--gold); color: #fff; }

  /* ── Puzzle Submit ── */
  .puzzle-submit {
    display: block; margin: 1.5rem auto 0;
    background: var(--box-accent);
    color: #fff; border: none;
    padding: 12px 32px; border-radius: 4px;
    font-family: 'Cinzel Decorative', serif;
    font-size: 1rem; cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .puzzle-submit:hover { background: var(--gold); transform: translateY(-1px); }
  .puzzle-feedback {
    text-align: center; margin-top: 0.75rem;
    font-size: 0.9rem; min-height: 1.5rem;
  }
  .puzzle-feedback.success { color: #155724; }
  .puzzle-feedback.error { color: var(--danger); }

  /* ── Toolbar ── */
  #toolbar {
    height: 110px; flex-shrink: 0;
    background: linear-gradient(0deg, rgba(14,10,6,0.98) 0%, rgba(20,16,14,0.95) 100%);
    border-top: 1px solid rgba(201,168,76,0.2);
    display: flex; align-items: center;
    padding: 8px 12px; gap: 10px;
    overflow-x: auto; z-index: 30;
    transform: translateY(100%);
    transition: transform 0.6s cubic-bezier(0.34,1.56,0.64,1);
  }
  #toolbar.visible { transform: translateY(0); }

  .tool-item {
    flex-shrink: 0;
    width: 80px; height: 88px;
    border: 2px solid rgba(201,168,76,0.25);
    border-radius: 6px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s, background 0.2s;
    background: rgba(255,255,255,0.03);
    padding: 4px;
    gap: 2px;
  }
  .tool-item:hover {
    border-color: var(--gold);
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(201,168,76,0.2);
  }
  .tool-item.active {
    border-color: var(--gold);
    background: rgba(201,168,76,0.1);
    box-shadow: 0 0 16px rgba(201,168,76,0.25);
  }
  .tool-item .tool-icon { font-size: 1.6rem; }
  .tool-item .tool-name {
    font-size: 0.55rem; color: var(--text-dim);
    text-align: center; line-height: 1.1;
    max-width: 72px; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .tool-item.locked { opacity: 0.25; pointer-events: none; }
  .tool-item.envelope-item .tool-icon { position: relative; }

  /* ── Toast ── */
  #toast {
    position: fixed; top: 64px; left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: rgba(20,16,14,0.95);
    color: var(--gold);
    padding: 10px 20px;
    border-radius: 6px;
    font-family: 'Special Elite', monospace;
    font-size: 0.85rem;
    border: 1px solid rgba(201,168,76,0.3);
    opacity: 0; transition: opacity 0.3s, transform 0.3s;
    z-index: 200; pointer-events: none;
    text-align: center; max-width: 90%;
  }
  #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* ── Win Screen ── */
  #win-screen {
    position: fixed; inset: 0;
    display: none; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0a1a0a 0%, #1a2e1a 50%, #0a1a0a 100%);
    z-index: 300; text-align: center; padding: 2rem;
  }
  #win-screen.active { display: flex; }
  #win-screen h1 {
    font-family: 'Cinzel Decorative', serif;
    font-size: 2.2rem; color: var(--success);
    margin-bottom: 1rem;
    text-shadow: 0 0 30px rgba(46,204,113,0.3);
  }
  #win-screen .stats {
    color: var(--text-dim); font-size: 1rem; line-height: 2;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 3px; }
</style>
</head>
<body>

<!-- Tabletop + Box -->
<div id="tabletop">
  <div id="escape-box" onclick="openBox()">
    <div class="box-cover">
      ${data.boxCoverImage ? `<img src="${data.boxCoverImage}" alt="Box Art">` : ''}
      <div class="box-title-overlay">
        <h1>${escapeHtml(data.title)}</h1>
        <div class="subtitle">${escapeHtml(data.subtitle)}</div>
      </div>
      <div class="box-prompt">▶ CLICK TO OPEN</div>
    </div>
  </div>
</div>

<!-- Game Area -->
<div id="game-area">
  <div id="hud">
    <div class="title">${escapeHtml(data.title)}</div>
    <div class="stage-pips" id="stage-pips"></div>
    <div class="timer" id="timer">00:00</div>
    <button class="hud-btn" onclick="showHint()">💡 Hint</button>
  </div>
  <div id="content-area">
    <div id="viewer"></div>
  </div>
  <div id="toolbar"></div>
</div>

<!-- Puzzle Overlay -->
<div id="puzzle-overlay">
  <div class="puzzle-panel" id="puzzle-panel"></div>
</div>

<!-- Toast -->
<div id="toast"></div>

<!-- Win Screen -->
<div id="win-screen">
  <h1>🎉 You Escaped!</h1>
  <div class="stats" id="win-stats"></div>
</div>

<script>
// ── Game Data ──
const GAME = ${dataJson};

// ── State ──
const state = {
  started: false,
  currentStage: 0,          // 0 = not started, 1..N = current stage
  solvedStages: new Set(),
  availableElements: new Set(), // IDs of elements player can access
  activeElementId: null,     // which toolbar element is selected/viewing
  startTime: 0,
  timerInterval: null,
};

// ── Init ──
function init() {
  // Set tabletop background
  if (GAME.tabletopImage) {
    document.getElementById('tabletop').style.backgroundImage = 'url(' + GAME.tabletopImage + ')';
    document.getElementById('content-area').style.backgroundImage = 'url(' + GAME.tabletopImage + ')';
  }
}

function openBox() {
  if (state.started) return;
  state.started = true;
  state.startTime = Date.now();

  // Animate box away
  document.getElementById('escape-box').classList.add('opened');

  // After box animation, show game area
  setTimeout(() => {
    document.getElementById('tabletop').style.display = 'none';
    document.getElementById('game-area').classList.add('active');

    // Reveal stage 0 elements
    GAME.boxElements.forEach(function(elem) {
      if (elem.stage === 0 || elem.stage === undefined) {
        state.availableElements.add(elem.id);
      }
    });

    renderToolbar();
    renderStagePips();
    showStorySheet();

    // Slide toolbar in
    setTimeout(function() {
      document.getElementById('toolbar').classList.add('visible');
    }, 200);

    // Start timer
    state.timerInterval = setInterval(updateTimer, 1000);

    // Set stage to 1 (first envelope)
    state.currentStage = 1;
    renderStagePips();

    toast('The box is open. Examine the contents...');
  }, 700);
}

// ── Toolbar ──
function renderToolbar() {
  var tb = document.getElementById('toolbar');
  tb.innerHTML = '';

  GAME.boxElements.forEach(function(elem) {
    var div = document.createElement('div');
    div.className = 'tool-item';
    if (!state.availableElements.has(elem.id)) div.className += ' locked';
    if (state.activeElementId === elem.id) div.className += ' active';
    if (elem.type === 'sealed_envelope') div.className += ' envelope-item';

    div.innerHTML = '<span class="tool-icon">' + elem.icon + '</span><span class="tool-name">' + escapeH(elem.name) + '</span>';
    div.onclick = function() { clickToolbarItem(elem.id); };
    tb.appendChild(div);
  });
}

function clickToolbarItem(elemId) {
  if (!state.availableElements.has(elemId)) return;
  var elem = GAME.boxElements.find(function(e) { return e.id === elemId; });
  if (!elem) return;

  if (elem.type === 'sealed_envelope') {
    handleEnvelope(elem);
    return;
  }

  state.activeElementId = elemId;
  renderToolbar();
  showElement(elem);
}

// ── Content Display ──
function showStorySheet() {
  var storyCard = GAME.boxElements.find(function(e) { return e.type === 'story_card' && (e.stage === 0 || e.stage === undefined); });
  if (storyCard) {
    state.activeElementId = storyCard.id;
    renderToolbar();
    showElement(storyCard);
  } else {
    showIntro();
  }
}

function showIntro() {
  var viewer = document.getElementById('viewer');
  viewer.innerHTML = '<div class="card"><h2>' + escapeH(GAME.title) + '</h2>' + GAME.intro + '</div>';
}

function showElement(elem) {
  var viewer = document.getElementById('viewer');
  var html = '<div class="card">';
  html += '<h2>' + elem.icon + ' ' + escapeH(elem.name) + '</h2>';

  if (elem.image) {
    html += '<div style="text-align:center;margin-bottom:1rem"><img src="' + elem.image + '" style="max-width:100%;max-height:300px;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,0.3)"></div>';
  }

  html += '<div>' + (elem.content || '') + '</div>';

  // Check if this element is usedWith another available element
  if (elem.usedWith && state.availableElements.has(elem.usedWith)) {
    var partner = GAME.boxElements.find(function(e) { return e.id === elem.usedWith; });
    if (partner && elem.revealsText) {
      html += '<div style="margin-top:1rem;padding:1rem;background:rgba(201,168,76,0.1);border:1px solid var(--gold-dim);border-radius:4px">';
      html += '<p style="font-size:0.8rem;color:#8a6f2f;margin-bottom:0.5rem"><em>Combined with ' + partner.icon + ' ' + escapeH(partner.name) + ':</em></p>';
      html += '<p>' + elem.revealsText + '</p></div>';
    }
  }

  html += '</div>';
  viewer.innerHTML = html;
}

// ── Envelopes ──
function handleEnvelope(elem) {
  // Find which stage this envelope belongs to
  // Envelope with stage=N-1 is the trigger for stageNumber N
  var stage = GAME.stages.find(function(s) { return s.stageNumber === (elem.stage || 0) + 1; })
    || GAME.stages.find(function(s) { return s.unlocksElements && s.unlocksElements.indexOf(elem.id) >= 0; })
    || GAME.stages[state.currentStage - 1];

  if (!stage) return;

  if (state.solvedStages.has(stage.id)) {
    toast('This envelope has already been opened.');
    return;
  }

  // Check if previous stages are solved (must solve in order)
  var prevStage = GAME.stages.find(function(s) { return s.stageNumber === stage.stageNumber - 1; });
  if (prevStage && !state.solvedStages.has(prevStage.id)) {
    toast('Solve the previous stage first.');
    return;
  }

  // Show the stage card + puzzle
  showStageCard(stage);
}

function showStageCard(stage) {
  var viewer = document.getElementById('viewer');
  var html = '<div class="card">';
  html += '<h2>' + stage.sealIcon + ' ' + escapeH(stage.name) + '</h2>';
  html += '<div>' + stage.introText + '</div>';

  // Unlock the elements for this stage
  if (stage.unlocksElements) {
    stage.unlocksElements.forEach(function(eid) {
      state.availableElements.add(eid);
    });
    renderToolbar();
  }

  // Show puzzle button
  var puzzle = GAME.puzzles.find(function(p) { return p.id === stage.puzzleId; });
  if (puzzle && !state.solvedStages.has(stage.id)) {
    html += '<div style="text-align:center;margin-top:1.5rem">';
    html += '<button class="puzzle-submit" onclick="openPuzzle(\\''+puzzle.id+'\\')">🔐 Attempt Puzzle</button>';
    if (puzzle.requiredElements && puzzle.requiredElements.length > 0) {
      var elemNames = puzzle.requiredElements.map(function(eid) {
        var el = GAME.boxElements.find(function(e) { return e.id === eid; });
        return el ? el.icon + ' ' + el.name : eid;
      });
      html += '<p style="font-size:0.75rem;color:#8a6f2f;margin-top:0.5rem">Required: ' + elemNames.join(', ') + '</p>';
    }
    html += '</div>';
  }

  html += '</div>';
  viewer.innerHTML = html;
  state.currentStage = stage.stageNumber;
  renderStagePips();
}

// ── Stage Pips ──
function renderStagePips() {
  var container = document.getElementById('stage-pips');
  container.innerHTML = '';
  GAME.stages.forEach(function(s) {
    var pip = document.createElement('div');
    pip.className = 'pip';
    if (state.solvedStages.has(s.id)) pip.className += ' solved';
    else if (s.stageNumber === state.currentStage) pip.className += ' current';
    else pip.className += ' locked';
    container.appendChild(pip);
  });
}

// ── Puzzles ──
function openPuzzle(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;

  var panel = document.getElementById('puzzle-panel');
  var html = '<button class="puzzle-close" onclick="closePuzzle()">&times;</button>';
  html += '<h3>' + escapeH(puzzle.name) + '</h3>';
  html += '<p>' + escapeH(puzzle.description) + '</p>';

  if (puzzle.clueText) {
    html += '<p style="font-size:0.8rem;color:#8a6f2f;font-style:italic">💡 ' + escapeH(puzzle.clueText) + '</p>';
  }

  // Render puzzle by type
  if (puzzle.type === 'code') {
    var len = puzzle.codeLength || 4;
    html += '<div class="code-entry" id="code-entry">';
    for (var i = 0; i < len; i++) {
      html += '<input class="code-digit" type="text" maxlength="1" inputmode="numeric" data-idx="'+i+'" oninput="codeInput(this,'+i+','+len+')">';
    }
    html += '</div>';
    html += '<button class="puzzle-submit" onclick="checkCode(\\''+puzzleId+'\\')">Submit</button>';
  }

  else if (puzzle.type === 'riddle') {
    if (puzzle.riddle) html += '<div style="margin:1rem 0;padding:1rem;background:#fdf5e6;border-radius:4px;font-style:italic;text-align:center">' + escapeH(puzzle.riddle) + '</div>';
    html += '<div class="riddle-options">';
    (puzzle.options || []).forEach(function(opt, idx) {
      html += '<div class="riddle-opt" onclick="checkRiddle(\\''+puzzleId+'\\','+idx+',this)">' + escapeH(opt) + '</div>';
    });
    html += '</div>';
  }

  else if (puzzle.type === 'sequence') {
    html += '<div class="frag-answer" id="seq-answer"></div>';
    html += '<div class="seq-btns" id="seq-btns">';
    var shuffled = (puzzle.sequence || []).slice().sort(function() { return Math.random() - 0.5; });
    shuffled.forEach(function(item) {
      html += '<div class="seq-btn" onclick="seqPick(this,\\''+puzzleId+'\\')">'+escapeH(item)+'</div>';
    });
    html += '</div>';
    html += '<button class="puzzle-submit" onclick="checkSequence(\\''+puzzleId+'\\')">Submit</button>';
  }

  else if (puzzle.type === 'combination') {
    html += '<div class="dial-row">';
    (puzzle.dials || []).forEach(function(dial, idx) {
      html += '<div class="dial"><label>' + escapeH(dial.label) + '</label>';
      html += '<select id="dial-'+idx+'">';
      // Shuffle options so correct answer isn't always first/selected
      var shuffOpts = dial.options.slice().sort(function() { return Math.random() - 0.5; });
      shuffOpts.forEach(function(opt) {
        html += '<option value="'+escapeH(opt)+'">' + escapeH(opt) + '</option>';
      });
      html += '</select></div>';
    });
    html += '</div>';
    html += '<button class="puzzle-submit" onclick="checkCombo(\\''+puzzleId+'\\')">Submit</button>';
  }

  else if (puzzle.type === 'cipher') {
    html += '<div class="cipher-display">' + escapeH(puzzle.encodedText || '') + '</div>';
    html += '<p style="font-size:0.8rem;color:#8a6f2f;text-align:center">Decode the message above</p>';
    html += '<input class="cipher-input" id="cipher-input" type="text" placeholder="Enter decoded message...">';
    html += '<button class="puzzle-submit" onclick="checkCipher(\\''+puzzleId+'\\')">Submit</button>';
  }

  else if (puzzle.type === 'overlay') {
    html += '<p style="text-align:center;font-size:0.85rem">Stack the correct elements to reveal the hidden message.</p>';
    var layers = puzzle.overlayLayers || [];
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:1rem 0">';
    layers.forEach(function(eid, idx) {
      var el = GAME.boxElements.find(function(e) { return e.id === eid; });
      var label = el ? el.icon + ' ' + el.name : eid;
      html += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:6px 10px;border:1px solid #ccc;border-radius:4px">';
      html += '<input type="checkbox" data-layer="'+idx+'" onchange="checkOverlay(\\''+puzzleId+'\\')">';
      html += '<span>' + label + '</span></label>';
    });
    html += '</div>';
    html += '<div id="overlay-result" style="text-align:center;margin-top:1rem;min-height:2rem"></div>';
  }

  else if (puzzle.type === 'jigsaw_word') {
    html += '<div class="frag-answer" id="jig-answer"></div>';
    html += '<div class="frag-tray" id="jig-tray">';
    var frags = (puzzle.fragments || []).slice().sort(function() { return Math.random() - 0.5; });
    frags.forEach(function(f) {
      html += '<div class="frag" onclick="jigPick(this,\\''+puzzleId+'\\')">'+escapeH(f)+'</div>';
    });
    html += '</div>';
    html += '<button class="puzzle-submit" onclick="checkJigsaw(\\''+puzzleId+'\\')">Submit</button>';
  }

  html += '<div class="puzzle-feedback" id="puzzle-feedback"></div>';
  panel.innerHTML = html;
  document.getElementById('puzzle-overlay').classList.add('active');

  // Reset puzzle-specific state
  resetSeqState();
  resetJigState();

  // Focus first code input if code puzzle
  if (puzzle.type === 'code') {
    setTimeout(function() {
      var first = panel.querySelector('.code-digit');
      if (first) first.focus();
    }, 100);
  }
}

function closePuzzle() {
  document.getElementById('puzzle-overlay').classList.remove('active');
}

// Escape key closes puzzle overlay
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closePuzzle();
});

// ── Code Puzzle Logic ──
function codeInput(el, idx, total) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value && idx < total - 1) {
    var next = el.parentElement.children[idx + 1];
    if (next) next.focus();
  }
}

function checkCode(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  var digits = document.querySelectorAll('#code-entry .code-digit');
  var code = '';
  digits.forEach(function(d) { code += d.value; });
  if (code === puzzle.solution) {
    solvePuzzle(puzzleId);
  } else {
    showFeedback('Incorrect code. Try again.', false);
  }
}

// ── Riddle Logic ──
function checkRiddle(puzzleId, idx, el) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  if (idx === puzzle.correctOption) {
    el.classList.add('correct');
    setTimeout(function() { solvePuzzle(puzzleId); }, 600);
  } else {
    el.classList.add('wrong');
    showFeedback(puzzle.wrongFeedback || 'Not quite...', false);
    setTimeout(function() { el.classList.remove('wrong'); }, 1000);
  }
}

// ── Sequence Logic ──
var seqOrder = [];
function resetSeqState() { seqOrder = []; }
function seqPick(el, puzzleId) {
  var text = el.textContent;
  seqOrder.push(text);
  el.classList.add('pressed');
  el.style.pointerEvents = 'none';
  var answer = document.getElementById('seq-answer');
  var span = document.createElement('span');
  span.textContent = text;
  span.style.cssText = 'padding:4px 8px;background:var(--gold);color:#fff;border-radius:3px;font-size:0.85rem;cursor:pointer';
  span.onclick = function() {
    seqOrder = seqOrder.filter(function(s) { return s !== text; });
    span.remove();
    el.classList.remove('pressed');
    el.style.pointerEvents = '';
  };
  answer.appendChild(span);
}

function checkSequence(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  var correct = puzzle.sequence || [];
  if (seqOrder.length === correct.length && seqOrder.every(function(s, i) { return s === correct[i]; })) {
    solvePuzzle(puzzleId);
  } else {
    showFeedback('Wrong order. Try again.', false);
    // Reset
    seqOrder = [];
    document.getElementById('seq-answer').innerHTML = '';
    document.querySelectorAll('.seq-btn').forEach(function(b) {
      b.classList.remove('pressed');
      b.style.pointerEvents = '';
    });
  }
}

// ── Combination Logic ──
function checkCombo(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle || !puzzle.dials) return;
  // Check against pipe-delimited solution string
  if (puzzle.solution) {
    var parts = puzzle.solution.split('|');
    var match = true;
    puzzle.dials.forEach(function(dial, idx) {
      var sel = document.getElementById('dial-' + idx);
      if (sel && parts[idx] && sel.value !== parts[idx]) match = false;
    });
    if (match) { solvePuzzle(puzzleId); return; }
  }
  showFeedback('Wrong combination.', false);
}

// ── Cipher Logic ──
function checkCipher(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  var input = document.getElementById('cipher-input');
  if (input && input.value.trim().toUpperCase() === (puzzle.decodedAnswer || '').toUpperCase()) {
    solvePuzzle(puzzleId);
  } else {
    showFeedback('Incorrect decoding. Check the cipher wheel.', false);
  }
}

// ── Overlay Logic ──
function checkOverlay(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  var checks = document.querySelectorAll('[data-layer]');
  var active = [];
  checks.forEach(function(c) { if (c.checked) active.push(parseInt(c.dataset.layer)); });
  active.sort();
  // Check if the correct subset of layers is selected (or all if no specific subset)
  var total = (puzzle.overlayLayers || []).length;
  var requiredCount = puzzle.requiredLayerCount || total;
  if (active.length === requiredCount) {
    document.getElementById('overlay-result').innerHTML = '<p style="color:var(--seal-red);font-weight:600">' + escapeH(puzzle.revealText || 'Hidden message revealed!') + '</p>';
    setTimeout(function() { solvePuzzle(puzzleId); }, 1000);
  } else {
    document.getElementById('overlay-result').innerHTML = '<p style="color:#8a6f2f;font-size:0.85rem">Stack the right layers together...</p>';
  }
}

// ── Jigsaw Word Logic ──
var jigOrder = [];
function resetJigState() { jigOrder = []; }
function jigPick(el, puzzleId) {
  var text = el.textContent;
  jigOrder.push(text);
  el.style.display = 'none';
  var answer = document.getElementById('jig-answer');
  var frag = document.createElement('div');
  frag.className = 'frag';
  frag.textContent = text;
  frag.onclick = function() {
    jigOrder = jigOrder.filter(function(s) { return s !== text; });
    frag.remove();
    el.style.display = '';
  };
  answer.appendChild(frag);
}

function checkJigsaw(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  var assembled = jigOrder.join('');
  if (assembled.toUpperCase() === (puzzle.correctWord || '').toUpperCase()) {
    solvePuzzle(puzzleId);
  } else {
    showFeedback('Not quite right. Rearrange the fragments.', false);
    jigOrder = [];
    document.getElementById('jig-answer').innerHTML = '';
    document.querySelectorAll('#jig-tray .frag').forEach(function(f) { f.style.display = ''; });
  }
}

// ── Solve ──
function solvePuzzle(puzzleId) {
  // Find the stage this puzzle belongs to
  var stage = GAME.stages.find(function(s) { return s.puzzleId === puzzleId; });
  if (!stage) return;

  state.solvedStages.add(stage.id);
  closePuzzle();

  // Show completion text
  var viewer = document.getElementById('viewer');
  viewer.innerHTML = '<div class="card"><h2>✅ Stage Complete!</h2><p>' + stage.completionText + '</p></div>';

  toast('🎉 ' + stage.name + ' solved!');

  // Advance to next stage
  var nextStage = GAME.stages.find(function(s) { return s.stageNumber === stage.stageNumber + 1; });
  if (nextStage) {
    state.currentStage = nextStage.stageNumber;
  }

  // Unlock all elements whose stage number matches the just-solved stage
  // (e.g. envelope_2 with stage=1 becomes available when stage 1 is solved)
  GAME.boxElements.forEach(function(elem) {
    if (elem.stage === stage.stageNumber && !state.availableElements.has(elem.id)) {
      state.availableElements.add(elem.id);
    }
  });

  renderToolbar();
  renderStagePips();

  // Check win
  if (state.solvedStages.size === GAME.stages.length) {
    setTimeout(showWin, 1500);
  }
}

// ── Win ──
function showWin() {
  clearInterval(state.timerInterval);
  var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  var mins = Math.floor(elapsed / 60);
  var secs = elapsed % 60;

  document.getElementById('win-stats').innerHTML =
    'Time: ' + mins + 'm ' + secs + 's<br>' +
    'Stages: ' + GAME.stages.length + '<br>' +
    'Difficulty: ' + (GAME.difficulty || 'standard');

  document.getElementById('win-screen').classList.add('active');
}

// ── Hints ──
function showHint() {
  var stage = GAME.stages.find(function(s) { return s.stageNumber === state.currentStage && !state.solvedStages.has(s.id); });
  if (stage) {
    toast('💡 ' + stage.hint);
  } else {
    toast('No hints available right now.');
  }
}

// ── Timer ──
function updateTimer() {
  var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  var mins = Math.floor(elapsed / 60);
  var secs = elapsed % 60;
  document.getElementById('timer').textContent =
    String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

// ── Toast ──
var toastTimer = null;
function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  if (toastTimer) clearTimeout(toastTimer);
  el.classList.add('show');
  toastTimer = setTimeout(function() { el.classList.remove('show'); toastTimer = null; }, 3000);
}

// ── Feedback ──
function showFeedback(msg, success) {
  var el = document.getElementById('puzzle-feedback');
  if (!el) return;
  el.textContent = msg;
  el.className = 'puzzle-feedback ' + (success ? 'success' : 'error');
}

// ── Util ──
function escapeH(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ── Start ──
init();
</script>
</body>
</html>`;
}

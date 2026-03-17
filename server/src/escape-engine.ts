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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Special+Elite&display=optional">
<style>

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
    background: transparent;
    border: none;
    border-radius: 0;
    overflow: visible;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative;
  }
  .box-cover img {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: contain; opacity: 1;
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
    flex: 1; position: relative; overflow-y: auto;
    display: flex; align-items: flex-start; justify-content: center;
    background: var(--tabletop);
    background-size: cover; background-position: center;
    padding: 1.25rem 0 2rem;
  }
  #content-area::after {
    content: ''; position: fixed; inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%);
    pointer-events: none; z-index: 0;
  }

  /* ── Viewer (center document) ── */
  #viewer {
    width: 90%; max-width: 640px;
    position: relative; z-index: 5;
    flex-shrink: 0;
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

  /* ── Interactive Cipher Wheel ── */
  .cw-container { text-align: center; margin: 1rem 0; }
  .cw-container svg { touch-action: none; user-select: none; display: inline-block; cursor: grab; }
  .cw-container svg:active { cursor: grabbing; }
  .cw-alignment {
    text-align: center; font-size: 0.9rem;
    font-family: 'Special Elite', monospace;
    color: var(--gold); min-height: 1.5rem; letter-spacing: 1px;
    margin: 0.25rem 0;
  }
  .cw-label { font-size: 0.75rem; color: var(--text-dim); text-align: center; margin-bottom: 4px; font-style: italic; }
  .cw-hint { font-size: 0.7rem; color: #8a6f2f; text-align: center; margin-top: 6px; }

  /* ── Floating Draggable Cards ── */
  #float-layer {
    position: fixed;
    top: 52px; left: 0; right: 0; bottom: 110px;
    pointer-events: none;
    z-index: 25;
    overflow: hidden;
  }
  .float-card {
    position: absolute;
    width: 320px; max-height: calc(100% - 20px);
    background: var(--paper); color: var(--ink);
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.75), 0 1px 0 var(--paper-dark);
    display: flex; flex-direction: column;
    pointer-events: all;
    overflow: hidden;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  }
  .float-card-titlebar {
    display: flex; align-items: center; gap: 7px;
    background: #2a1f14; border-bottom: 1px solid var(--gold-dim);
    padding: 7px 10px; cursor: grab; user-select: none; flex-shrink: 0;
  }
  .float-card-titlebar:active { cursor: grabbing; }
  .float-card-icon { font-size: 1rem; flex-shrink: 0; }
  .float-card-name {
    flex: 1; font-family: 'Cinzel Decorative', serif; font-size: 0.6rem;
    color: var(--gold); letter-spacing: 0.5px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .float-card-minimize {
    width: 22px; height: 22px; border-radius: 3px;
    background: none; border: 1px solid var(--gold-dim);
    color: var(--gold); cursor: pointer; font-size: 14px; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s;
  }
  .float-card-minimize:hover { background: rgba(201,168,76,0.2); }
  .float-card-body {
    overflow-y: auto; padding: 1rem 1.25rem; flex: 1;
    font-size: 0.9rem; line-height: 1.65;
  }
  .float-card-body img {
    max-width: 100%; max-height: 220px; border-radius: 4px;
    display: block; margin: 0 auto 0.75rem;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
  }
  .float-card-body .card { padding: 0; background: none; box-shadow: none; }
  .float-card-body .card h2 { display: none; }

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
  .tool-item.card-open {
    border-color: var(--gold);
    background: rgba(201,168,76,0.1);
    box-shadow: 0 0 12px rgba(201,168,76,0.2);
  }
  .tool-item.card-minimized {
    border-color: rgba(201,168,76,0.5);
    border-bottom: 3px solid var(--gold-dim);
    background: rgba(201,168,76,0.05);
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

  /* ══════════════════════════════════════════════════
     AAA PREMIUM EFFECTS
  ══════════════════════════════════════════════════ */

  /* 1. Living Parchment — breathes with subtle candlelight drift */
  .card::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 4px;
    background: radial-gradient(ellipse 60% 40% at 30% 40%, rgba(255,240,200,0.12) 0%, transparent 70%);
    animation: parchmentBreath 14s ease-in-out infinite;
    pointer-events: none; z-index: 0;
  }
  @keyframes parchmentBreath {
    0%,100% { opacity: 0.6; transform: scale(1) translateX(0); }
    35%     { opacity: 1;   transform: scale(1.03) translateX(6px); }
    70%     { opacity: 0.7; transform: scale(0.98) translateX(-4px); }
  }
  .card > * { position: relative; z-index: 1; }

  /* 2. Spectral Aura — eerie glow on interactive elements */
  .tool-item:hover, .tool-item.active {
    box-shadow: 0 0 8px rgba(139,0,0,0.35), 0 0 20px rgba(139,0,0,0.15), inset 0 0 6px rgba(201,168,76,0.06);
    animation: spectralPulse 2.8s ease-in-out infinite;
  }
  @keyframes spectralPulse {
    0%,100% { box-shadow: 0 0 8px rgba(139,0,0,0.35), 0 0 20px rgba(139,0,0,0.15); }
    50%     { box-shadow: 0 0 14px rgba(180,0,0,0.55), 0 0 32px rgba(139,0,0,0.25); }
  }
  .puzzle-submit:hover {
    box-shadow: 0 0 12px rgba(139,69,19,0.5), 0 0 24px rgba(201,168,76,0.15);
  }
  .riddle-opt:hover {
    box-shadow: 0 2px 8px rgba(139,0,0,0.25);
  }

  /* 3. Decay Text Reveal — characters materialise with organic shimmer */
  .reveal-char {
    display: inline;
    animation: charMaterialise 0.35s ease-out both;
  }
  @keyframes charMaterialise {
    from { opacity: 0; filter: blur(4px); transform: translateY(-2px); }
    60%  { opacity: 0.8; filter: blur(0.5px); }
    to   { opacity: 1; filter: none; transform: none; }
  }

  /* 4. Ambient Vignette + Slow Light Drift */
  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 1000; pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.65) 100%);
  }
  body::after {
    content: '';
    position: fixed; inset: -20%; z-index: 999; pointer-events: none;
    background: radial-gradient(ellipse 30% 20% at 50% 50%, rgba(255,240,180,0.04) 0%, transparent 100%);
    animation: lightDrift 22s ease-in-out infinite;
  }
  @keyframes lightDrift {
    0%   { transform: translate(0, 0); opacity: 0.7; }
    25%  { transform: translate(8%, -6%); opacity: 1; }
    50%  { transform: translate(-5%, 8%); opacity: 0.6; }
    75%  { transform: translate(10%, 4%); opacity: 0.9; }
    100% { transform: translate(0, 0); opacity: 0.7; }
  }

  /* 5. Wax Seal Shatter — stage completion effect */
  .seal-shard {
    position: fixed; pointer-events: none; z-index: 500;
    border-radius: 2px;
    animation: shardFly 0.9s ease-out both;
  }
  @keyframes shardFly {
    from { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
    to   { transform: var(--shard-dest) rotate(var(--shard-rot)) scale(0.1); opacity: 0; }
  }

  /* ══════════════════════════════════════════════════
     NEW PUZZLE TYPES
  ══════════════════════════════════════════════════ */

  /* Decay Restoration puzzle */
  .decay-document {
    background: var(--paper-dark);
    border: 1px solid rgba(42,31,20,0.3);
    border-radius: 4px;
    padding: 1.2rem;
    margin: 1rem 0;
    text-align: center;
    min-height: 80px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Special Elite', monospace;
    font-size: 1.1rem;
    letter-spacing: 2px;
    transition: filter 0.3s;
    position: relative; overflow: hidden;
  }
  .decay-document::after {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
  }
  .decay-sliders { margin: 1rem 0; }
  .decay-slider-row {
    display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .decay-slider-row label {
    font-family: 'Special Elite', monospace;
    font-size: 0.75rem; color: #5a3e28; min-width: 62px;
  }
  .decay-slider-row input[type=range] {
    flex: 1; accent-color: var(--box-accent);
    -webkit-appearance: none; height: 4px;
    background: linear-gradient(to right, var(--box-accent), var(--gold));
    border-radius: 2px; cursor: pointer;
  }
  .decay-meter {
    text-align: center; font-family: 'Special Elite', monospace;
    font-size: 0.8rem; color: #8a6f2f; margin-top: 0.5rem;
    min-height: 1.2rem;
  }

  /* Layer Alignment puzzle */
  .layer-canvas {
    position: relative;
    width: 260px; height: 260px;
    margin: 1rem auto;
    background: #1a1208;
    border: 1px solid rgba(201,168,76,0.2);
    border-radius: 4px;
    overflow: hidden;
    cursor: crosshair;
  }
  .layer-glyph {
    position: absolute;
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 5rem;
    user-select: none;
    cursor: grab;
    transition: filter 0.2s;
    will-change: transform;
  }
  .layer-glyph:active { cursor: grabbing; }
  .layer-glyph.aligned { filter: drop-shadow(0 0 12px gold); }
  .layer-reveal-text {
    text-align: center;
    font-family: 'Cinzel Decorative', serif;
    font-size: 1.2rem;
    color: var(--gold);
    min-height: 2rem; margin-top: 0.5rem;
    letter-spacing: 3px;
    text-shadow: 0 0 16px rgba(201,168,76,0.5);
    opacity: 0; transition: opacity 0.8s;
  }
  .layer-reveal-text.visible { opacity: 1; }
  .layer-hint { text-align: center; font-size: 0.75rem; color: #8a6f2f; margin-top: 4px; font-style: italic; }

  /* Morse Decode puzzle */
  .morse-visualiser {
    display: flex; align-items: center; justify-content: center;
    gap: 6px; margin: 1.2rem 0;
    min-height: 48px;
    background: #1a1208;
    border: 1px solid rgba(201,168,76,0.2);
    border-radius: 4px;
    padding: 10px;
    flex-wrap: wrap;
  }
  .morse-symbol {
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(201,168,76,0.15);
    border: 1px solid var(--gold-dim);
    border-radius: 3px;
    font-family: 'Special Elite', monospace;
    font-size: 1rem; color: var(--gold);
    padding: 4px 8px;
  }
  .morse-symbol.dot  { min-width: 28px; }
  .morse-symbol.dash { min-width: 52px; }
  .morse-symbol.gap  { min-width: 16px; background: transparent; border: none; }
  .morse-symbol.active {
    background: rgba(201,168,76,0.6);
    box-shadow: 0 0 12px rgba(201,168,76,0.6);
  }
  .morse-controls {
    display: flex; gap: 10px; justify-content: center; margin: 0.75rem 0;
  }
  .morse-btn {
    padding: 8px 18px;
    border: 1px solid var(--box-accent);
    border-radius: 4px; background: rgba(139,69,19,0.2);
    color: var(--text); font-family: 'Special Elite', monospace;
    cursor: pointer; font-size: 0.8rem;
  }
  .morse-btn:hover { background: rgba(139,69,19,0.4); }
  .morse-input {
    width: 100%; padding: 10px;
    border: 2px solid var(--box-accent);
    border-radius: 4px; font-size: 1rem;
    font-family: 'Special Elite', monospace;
    text-align: center; letter-spacing: 4px;
    text-transform: uppercase;
  }
  .morse-pattern-display {
    text-align: center;
    font-family: 'Special Elite', monospace;
    font-size: 0.95rem; color: var(--gold);
    letter-spacing: 3px; margin-bottom: 0.5rem;
    background: #1a1208;
    border: 1px solid rgba(201,168,76,0.15);
    border-radius: 4px; padding: 8px;
  }

  /* Stage progress within multi-puzzle stages */
  .stage-puzzle-progress {
    display: flex; gap: 6px; justify-content: center;
    margin: 0.75rem 0;
  }
  .stage-puzzle-pip {
    width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--gold-dim);
    transition: background 0.4s, border-color 0.4s;
  }
  .stage-puzzle-pip.done { background: var(--success); border-color: var(--success); }
  .stage-puzzle-pip.active { border-color: var(--gold); box-shadow: 0 0 6px rgba(201,168,76,0.4); }

  /* Midway narrative reveal card */
  .midway-card {
    background: linear-gradient(145deg, #1a1208, #2a1c10);
    border: 1px solid rgba(201,168,76,0.25);
    border-radius: 4px;
    padding: 1.5rem;
    text-align: center;
    font-style: italic;
    color: var(--text);
    margin: 1rem 0;
    box-shadow: 0 4px 16px var(--shadow);
  }
  .midway-card p { margin: 0; line-height: 1.7; }
</style>
</head>
<body>

<!-- Tabletop + Box -->
<div id="tabletop">
  <div id="escape-box" onclick="openBox()">
    <div class="box-cover">
      ${data.boxCoverImage ? `<img src="${data.boxCoverImage}" alt="Box Art">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.5rem;padding:1.5rem;text-align:center"><span style="font-family:'Cinzel Decorative',serif;color:var(--gold);font-size:1.2rem">${escapeHtml(data.title)}</span><span style="color:var(--text-dim);font-size:0.8rem;font-style:italic">${escapeHtml(data.subtitle)}</span></div>`}
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
  <div id="float-layer"></div>
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
  solvedPuzzles: new Set(),  // individual puzzle IDs solved
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
    div.setAttribute('data-elem-id', elem.id);
    if (!state.availableElements.has(elem.id)) div.className += ' locked';
    if (elem.type === 'sealed_envelope') div.className += ' envelope-item';
    var cardInfo = floatState.openCards.get(elem.id);
    if (cardInfo && !cardInfo.minimized) div.className += ' card-open';
    else if (cardInfo && cardInfo.minimized) div.className += ' card-minimized';

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

  openFloatCard(elem);
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

function buildCipherWheelSvg() {
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var N = 26;
  var DEG = 360 / N;
  var CX = 150, CY = 150, outerR = 122, innerR = 82;
  var svg = '';
  // Outer bezel
  svg += '<circle cx="150" cy="150" r="148" fill="#1a1008" stroke="#c9a84c" stroke-width="3"/>';
  svg += '<circle cx="150" cy="150" r="136" fill="none" stroke="#8a6f2f" stroke-width="0.5" stroke-dasharray="3,5"/>';
  // Inner disk background
  svg += '<circle cx="150" cy="150" r="97" fill="#0e0a06" stroke="#8a6f2f" stroke-width="1.5"/>';
  // Outer letters + tick marks (fixed)
  for (var i = 0; i < N; i++) {
    var ang = (i * DEG - 90) * Math.PI / 180;
    var ox = (CX + outerR * Math.cos(ang)).toFixed(1);
    var oy = (CY + outerR * Math.sin(ang)).toFixed(1);
    var t1x = (CX + 135 * Math.cos(ang)).toFixed(1);
    var t1y = (CY + 135 * Math.sin(ang)).toFixed(1);
    var t2x = (CX + 143 * Math.cos(ang)).toFixed(1);
    var t2y = (CY + 143 * Math.sin(ang)).toFixed(1);
    svg += '<text x="' + ox + '" y="' + oy + '" dy="0.35em" text-anchor="middle" font-size="13" fill="#c9a84c" font-family="monospace" font-weight="bold">' + LETTERS[i] + '</text>';
    svg += '<line x1="' + t1x + '" y1="' + t1y + '" x2="' + t2x + '" y2="' + t2y + '" stroke="#8a6f2f" stroke-width="1"/>';
  }
  // Inner rotatable ring (letters at innerR)
  var innerContent = '<circle cx="150" cy="150" r="96" fill="transparent"/>';
  for (var j = 0; j < N; j++) {
    var jang = (j * DEG - 90) * Math.PI / 180;
    var ix = (CX + innerR * Math.cos(jang)).toFixed(1);
    var iy = (CY + innerR * Math.sin(jang)).toFixed(1);
    innerContent += '<text x="' + ix + '" y="' + iy + '" dy="0.35em" text-anchor="middle" font-size="11" fill="#e8e0d4" font-family="monospace">' + LETTERS[j] + '</text>';
  }
  svg += '<g id="cw-inner" onmousedown="cwDragStart(event)" ontouchstart="cwDragStart(event)">' + innerContent + '</g>';
  // Center hub
  svg += '<circle cx="150" cy="150" r="38" fill="#14100e" stroke="#c9a84c" stroke-width="2"/>';
  svg += '<text x="150" y="143" dy="0.35em" text-anchor="middle" fill="#8a6f2f" font-size="9" font-family="monospace" letter-spacing="1">SHIFT</text>';
  svg += '<text id="cw-shift-val" x="150" y="161" dy="0.35em" text-anchor="middle" fill="#c9a84c" font-size="22" font-weight="bold" font-family="monospace">0</text>';
  // Indicator arrow at 12 o\'clock
  svg += '<polygon points="150,1 144,14 156,14" fill="#c9a84c"/>';
  return svg;
}

// Build the inner body HTML for an element (shared by viewer cards and float cards)
function buildElementBody(elem) {
  var html = '';

  if (elem.image && elem.type !== 'cipher_wheel') {
    html += '<div style="text-align:center;margin-bottom:0.75rem"><img src="' + elem.image + '" style="max-width:100%;max-height:220px;object-fit:contain;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,0.3)" loading="eager"></div>';
  }

  html += '<div>' + (elem.content || '') + '</div>';

  // Interactive cipher wheel
  if (elem.type === 'cipher_wheel') {
    cwState.currentRotation = 0;
    html += '<div class="cw-container"><svg id="cw-svg" width="280" height="280" viewBox="0 0 300 300">';
    html += buildCipherWheelSvg();
    html += '</svg></div>';
    html += '<div class="cw-alignment" id="cw-alignment">outer A &#x2192; inner A &nbsp;(shift: 0)</div>';
    html += '<p style="font-size:0.75rem;color:#8a6f2f;text-align:center;margin-bottom:0.5rem">Drag the inner ring to align the letters</p>';
    var cipherPuzzle = GAME.puzzles.find(function(p) { return p.type === \'cipher\' && p.encodedText; });
    if (cipherPuzzle) {
      var enc = cipherPuzzle.encodedText || \'\';
      html += '<div id="cw-decode-panel" data-encoded="' + escapeH(enc) + '" style="background:#2a1f14;border-radius:4px;padding:0.6rem">';
      html += '<p class="cw-label">Rotate the wheel to decode:</p>';
      html += '<div class="cipher-display" style="font-size:0.85rem;margin:0 0 4px">' + escapeH(enc) + '</div>';
      html += '<div id="cw-decoded" class="cipher-display" style="font-size:0.85rem;margin:0;background:#3a2f24;color:#e8d4a0">' + escapeH(enc) + '</div>';
      html += '</div>';
      html += '<p class="cw-hint">Once decoded, open the sealed envelope to submit your answer</p>';
    }
  }

  // usedWith combination
  if (elem.usedWith && state.availableElements.has(elem.usedWith)) {
    var partner = GAME.boxElements.find(function(e) { return e.id === elem.usedWith; });
    if (partner && elem.revealsText) {
      html += '<div style="margin-top:0.75rem;padding:0.75rem;background:rgba(201,168,76,0.1);border:1px solid var(--gold-dim);border-radius:4px">';
      html += '<p style="font-size:0.75rem;color:#8a6f2f;margin-bottom:0.4rem"><em>Combined with ' + partner.icon + ' ' + escapeH(partner.name) + ':</em></p>';
      html += '<p>' + elem.revealsText + '</p></div>';
    }
  }

  return html;
}

// Used only for the story sheet (stays in center viewer)
function showElement(elem) {
  var viewer = document.getElementById('viewer');
  var html = '<div class="card">';
  html += '<h2>' + elem.icon + ' ' + escapeH(elem.name) + '</h2>';
  html += buildElementBody(elem);
  html += '</div>';
  viewer.innerHTML = html;
}

// ── Float Card System ──
var floatState = {
  topZ: 51,
  openCards: new Map(), // elemId -> { dom, body, minimized }
  drag: { active: false, elemId: null, startMX: 0, startMY: 0, startCX: 0, startCY: 0 }
};

function openFloatCard(elem) {
  var existing = floatState.openCards.get(elem.id);
  if (existing) {
    existing.minimized ? restoreCard(elem.id) : bringCardToFront(elem.id);
    return;
  }

  var layer = document.getElementById('float-layer');
  if (!layer) return;

  // Stagger position
  var count = floatState.openCards.size;
  var layerW = layer.offsetWidth || window.innerWidth;
  var cardW = 320;
  var startX = Math.max(10, Math.min(layerW - cardW - 10, (layerW - cardW) / 2 + (count * 28) - 28));
  var startY = Math.max(10, 30 + count * 22);

  var card = document.createElement('div');
  card.className = 'float-card';
  card.id = 'fcard-' + elem.id;
  card.style.left = startX + 'px';
  card.style.top = startY + 'px';
  floatState.topZ++;
  card.style.zIndex = String(floatState.topZ);

  // Title bar
  var titlebar = document.createElement('div');
  titlebar.className = 'float-card-titlebar';
  titlebar.innerHTML =
    '<span class="float-card-icon">' + elem.icon + '</span>' +
    '<span class="float-card-name">' + escapeH(elem.name) + '</span>' +
    '<button class="float-card-minimize" onclick="minimizeCard(\\'' + elem.id + '\\')" title="Minimize to toolbar">\u2014</button>';
  titlebar.addEventListener('mousedown', function(e) { floatDragStart(e, elem.id); });
  titlebar.addEventListener('touchstart', function(e) { floatDragStart(e, elem.id); }, { passive: false });
  card.appendChild(titlebar);

  // Body
  var body = document.createElement('div');
  body.className = 'float-card-body';
  body.innerHTML = buildElementBody(elem);
  card.appendChild(body);

  layer.appendChild(card);

  // Bring to front on click
  card.addEventListener('mousedown', function() { bringCardToFront(elem.id); });

  // Animate in from below
  card.style.opacity = '0';
  card.style.transform = 'translateY(50px) scale(0.92)';
  card.style.transition = 'opacity 0.3s, transform 0.38s cubic-bezier(0.34,1.56,0.64,1)';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      card.style.opacity = '1';
      card.style.transform = 'none';
    });
  });

  floatState.openCards.set(elem.id, { dom: card, body: body, minimized: false });
  renderToolbar();
}

function bringCardToFront(elemId) {
  var info = floatState.openCards.get(elemId);
  if (!info) return;
  floatState.topZ++;
  info.dom.style.zIndex = String(floatState.topZ);
}

function minimizeCard(elemId) {
  var info = floatState.openCards.get(elemId);
  if (!info || info.minimized) return;
  info.minimized = true;

  var card = info.dom;
  var layer = document.getElementById('float-layer');
  var toolItem = document.querySelector('[data-elem-id="' + elemId + '"]');

  if (toolItem && layer) {
    var toolRect = toolItem.getBoundingClientRect();
    var layerRect = layer.getBoundingClientRect();
    var curL = parseFloat(card.style.left) || 0;
    var curT = parseFloat(card.style.top) || 0;
    var targetX = (toolRect.left + toolRect.width / 2) - layerRect.left - 160;
    var targetY = toolRect.top - layerRect.top;
    var dx = targetX - curL;
    var dy = targetY - curT;
    card.style.transformOrigin = 'bottom center';
    card.style.transition = 'transform 0.32s cubic-bezier(0.4,0,1,1), opacity 0.28s';
    card.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(0.12)';
    card.style.opacity = '0';
  } else {
    card.style.transition = 'transform 0.3s, opacity 0.28s';
    card.style.transform = 'translateY(80px) scale(0.15)';
    card.style.opacity = '0';
  }

  setTimeout(function() { card.style.display = 'none'; renderToolbar(); }, 340);
}

function restoreCard(elemId) {
  var info = floatState.openCards.get(elemId);
  if (!info) return;
  info.minimized = false;
  var card = info.dom;
  card.style.display = 'flex';
  card.style.transition = 'none';
  // Reset transform before animating back
  card.style.transform = 'translateY(50px) scale(0.7)';
  card.style.opacity = '0';
  bringCardToFront(elemId);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      card.style.transition = 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s';
      card.style.transform = 'none';
      card.style.opacity = '1';
    });
  });
  renderToolbar();
}

function floatDragStart(event, elemId) {
  if (event.target.classList.contains('float-card-minimize')) return;
  event.preventDefault();
  bringCardToFront(elemId);
  var info = floatState.openCards.get(elemId);
  if (!info) return;
  var card = info.dom;
  var clientX = event.touches ? event.touches[0].clientX : event.clientX;
  var clientY = event.touches ? event.touches[0].clientY : event.clientY;
  floatState.drag = {
    active: true, elemId: elemId,
    startMX: clientX, startMY: clientY,
    startCX: parseFloat(card.style.left) || 0,
    startCY: parseFloat(card.style.top) || 0
  };
  card.style.transition = 'none';
  card.style.cursor = 'grabbing';
  document.addEventListener('mousemove', floatDragMove);
  document.addEventListener('touchmove', floatDragMove, { passive: false });
  document.addEventListener('mouseup', floatDragEnd);
  document.addEventListener('touchend', floatDragEnd);
}

function floatDragMove(event) {
  var d = floatState.drag;
  if (!d.active) return;
  event.preventDefault();
  var clientX = event.touches ? event.touches[0].clientX : event.clientX;
  var clientY = event.touches ? event.touches[0].clientY : event.clientY;
  var info = floatState.openCards.get(d.elemId);
  if (!info) return;
  var card = info.dom;
  var layer = document.getElementById('float-layer');
  var maxX = (layer ? layer.offsetWidth : window.innerWidth) - card.offsetWidth;
  var maxY = (layer ? layer.offsetHeight : window.innerHeight) - 40;
  card.style.left = Math.max(0, Math.min(maxX, d.startCX + clientX - d.startMX)) + 'px';
  card.style.top = Math.max(0, Math.min(maxY, d.startCY + clientY - d.startMY)) + 'px';
}

function floatDragEnd() {
  if (!floatState.drag.active) return;
  var info = floatState.openCards.get(floatState.drag.elemId);
  if (info) info.dom.style.cursor = '';
  floatState.drag.active = false;
  document.removeEventListener('mousemove', floatDragMove);
  document.removeEventListener('touchmove', floatDragMove);
  document.removeEventListener('mouseup', floatDragEnd);
  document.removeEventListener('touchend', floatDragEnd);
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

function showStageCard(stage, fromMidway) {
  var viewer = document.getElementById('viewer');

  // Unlock the elements for this stage
  if (stage.unlocksElements) {
    stage.unlocksElements.forEach(function(eid) {
      state.availableElements.add(eid);
    });
    renderToolbar();
  }

  state.currentStage = stage.stageNumber;
  renderStagePips();

  // Find the active puzzle in this stage (first unsolved one)
  var puzzleIds = stage.puzzleIds || (stage.puzzleId ? [stage.puzzleId] : []);
  var activePuzzleId = puzzleIds.find(function(pid) { return !state.solvedPuzzles.has(pid); });
  var activePuzzle = activePuzzleId ? GAME.puzzles.find(function(p) { return p.id === activePuzzleId; }) : null;
  var solvedCount = puzzleIds.filter(function(pid) { return state.solvedPuzzles.has(pid); }).length;

  // Build pip row for multi-puzzle stages
  var pipRowHtml = '';
  if (puzzleIds.length > 1) {
    pipRowHtml = '<div class="stage-puzzle-progress">';
    puzzleIds.forEach(function(pid, idx) {
      var cls = 'stage-puzzle-pip';
      if (state.solvedPuzzles.has(pid)) cls += ' done';
      else if (pid === activePuzzleId) cls += ' active';
      pipRowHtml += '<div class="' + cls + '"></div>';
    });
    pipRowHtml += '</div>';
  }

  var html = '<div class="card">';
  html += '<h2>' + stage.sealIcon + ' ' + escapeH(stage.name) + '</h2>';

  if (!fromMidway) {
    // First view — show intro text with typewriter effect
    html += '<div id="stage-intro-text" data-reveal="true">' + stage.introText + '</div>';
  }

  html += pipRowHtml;

  if (activePuzzle && !state.solvedStages.has(stage.id)) {
    if (solvedCount > 0 || fromMidway) {
      html += '<p style="font-size:0.85rem;color:#5a3e28;text-align:center;margin-bottom:0.5rem"><em>Part ' + (solvedCount + 1) + ' of ' + puzzleIds.length + '</em></p>';
    }
    html += '<div style="text-align:center;margin-top:1.5rem">';
    html += '<button class="puzzle-submit" onclick="openPuzzle(\\'' + activePuzzle.id + '\\')">🔐 ' + escapeH(activePuzzle.name) + '</button>';
    if (activePuzzle.requiredElements && activePuzzle.requiredElements.length > 0) {
      var elemNames = activePuzzle.requiredElements.map(function(eid) {
        var el = GAME.boxElements.find(function(e) { return e.id === eid; });
        return el ? el.icon + ' ' + el.name : eid;
      });
      html += '<p style="font-size:0.75rem;color:#8a6f2f;margin-top:0.5rem">Required: ' + elemNames.join(', ') + '</p>';
    }
    html += '</div>';
  }

  html += '</div>';
  viewer.innerHTML = html;

  // Trigger typewriter reveal for intro text
  if (!fromMidway) {
    var introEl = viewer.querySelector('#stage-intro-text');
    if (introEl) revealText(introEl);
  }
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

// ── Typewriter text reveal ──
function revealText(el) {
  if (!el) return;
  // Extract text content, preserve inline HTML tags
  var rawHtml = el.innerHTML;
  el.innerHTML = '';
  var temp = document.createElement('div');
  temp.innerHTML = rawHtml;
  var textNodes = [];
  (function walk(node) {
    if (node.nodeType === 3) { textNodes.push({ node: node, text: node.textContent }); }
    else { node.childNodes.forEach(walk); }
  })(temp);
  el.innerHTML = rawHtml; // Restore, then animate chars
  var chars = el.querySelectorAll ? [] : [];
  // Simpler: just animate the whole element fading in with chars
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.4s';
  setTimeout(function() { el.style.opacity = '1'; }, 50);
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

  else if (puzzle.type === 'decay_restore') {
    var sliders = puzzle.decaySliders || [
      {label:'Focus', min:0, max:100, correct:60, tolerance:12},
      {label:'Contrast', min:0, max:100, correct:75, tolerance:12},
      {label:'Shift', min:0, max:100, correct:40, tolerance:15}
    ];
    // Build initial filter values (far from correct)
    var initFocus = 5, initContrast = 20, initShift = 50;
    html += '<div class="decay-document" id="decay-doc" style="filter:blur(8px) contrast(0.3) hue-rotate(40deg)">';
    html += '<span id="decay-text">' + escapeH(puzzle.decayText || 'HIDDEN MESSAGE') + '</span>';
    html += '</div>';
    html += '<div class="decay-sliders">';
    sliders.forEach(function(sl, idx) {
      var initVal = Math.round((sl.correct + sl.tolerance + 20) % sl.max) || 10;
      html += '<div class="decay-slider-row">';
      html += '<label>' + escapeH(sl.label) + '</label>';
      html += '<input type="range" min="' + sl.min + '" max="' + sl.max + '" value="' + initVal + '" id="decay-sl-' + idx + '" oninput="updateDecay(\\''+puzzleId+'\\','+JSON.stringify(sliders)+')">';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="decay-meter" id="decay-meter">Adjust sliders to restore the document...</div>';
  }

  else if (puzzle.type === 'layer_align') {
    var layers = puzzle.glyphLayers || [
      {symbol:'✦', color:'rgba(180,120,40,0.55)', startX:-110, startY:60, correctX:0, correctY:0},
      {symbol:'◈', color:'rgba(80,160,200,0.55)', startX:90, startY:-80, correctX:0, correctY:0},
      {symbol:'⬡', color:'rgba(160,60,160,0.55)', startX:-40, startY:120, correctX:0, correctY:0}
    ];
    var tol = puzzle.alignTolerance || 18;
    html += '<p style="font-size:0.8rem;color:#8a6f2f;text-align:center;margin-bottom:0.5rem">Drag the sigils to align them at the centre</p>';
    html += '<div class="layer-canvas" id="layer-canvas">';
    layers.forEach(function(layer, idx) {
      html += '<div class="layer-glyph" id="layer-' + idx + '" data-x="' + layer.startX + '" data-y="' + layer.startY + '" data-cx="' + layer.correctX + '" data-cy="' + layer.correctY + '" style="color:' + layer.color + ';transform:translate(' + layer.startX + 'px,' + layer.startY + 'px)" onmousedown="layerDragStart(event,' + idx + ')" ontouchstart="layerDragStart(event,' + idx + ')">' + layer.symbol + '</div>';
    });
    html += '</div>';
    html += '<div class="layer-reveal-text" id="layer-reveal">' + escapeH(puzzle.revealWord || '') + '</div>';
    html += '<div class="layer-hint">Drag each sigil toward the centre — when aligned, the word reveals itself</div>';
    html += '<button class="puzzle-submit" id="layer-submit" style="display:none" onclick="checkLayerAlign(\\''+puzzleId+'\\','+tol+')">Confirm</button>';
  }

  else if (puzzle.type === 'morse_decode') {
    var morsePattern = puzzle.morsePattern || '... --- ...';
    html += '<p style="font-size:0.8rem;color:#8a6f2f;text-align:center;margin-bottom:0.5rem">Listen to the morse code pattern and decode it</p>';
    html += '<div class="morse-pattern-display">' + escapeH(morsePattern) + '</div>';
    html += '<div class="morse-visualiser" id="morse-vis">';
    morsePattern.split('').forEach(function(ch, idx) {
      if (ch === '.') html += '<div class="morse-symbol dot" id="morse-sym-' + idx + '">·</div>';
      else if (ch === '-') html += '<div class="morse-symbol dash" id="morse-sym-' + idx + '">—</div>';
      else if (ch === ' ') html += '<div class="morse-symbol gap" id="morse-sym-' + idx + '"> </div>';
    });
    html += '</div>';
    html += '<div class="morse-controls">';
    html += '<button class="morse-btn" onclick="playMorse(\\''+escapeH(morsePattern)+'\\')">▶ Play</button>';
    html += '<button class="morse-btn" onclick="stopMorse()">■ Stop</button>';
    html += '</div>';
    html += '<input class="morse-input" id="morse-input" type="text" placeholder="Enter decoded text..." maxlength="20">';
    html += '<button class="puzzle-submit" onclick="checkMorse(\\''+puzzleId+'\\')">Submit</button>';
  }

  html += '<div class="puzzle-feedback" id="puzzle-feedback"></div>';
  panel.innerHTML = html;
  document.getElementById('puzzle-overlay').classList.add('active');

  // Reset puzzle-specific state
  resetSeqState();
  resetJigState();
  stopMorse();

  // Focus first code input if code puzzle
  if (puzzle.type === 'code') {
    setTimeout(function() {
      var first = panel.querySelector('.code-digit');
      if (first) first.focus();
    }, 100);
  }

  // Init layer drag for layer_align puzzle
  if (puzzle.type === 'layer_align') {
    setTimeout(initLayerDrag, 50);
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

// ── Decay Restoration Logic ──
function updateDecay(puzzleId, sliders) {
  var values = sliders.map(function(sl, idx) {
    var el = document.getElementById('decay-sl-' + idx);
    return el ? parseInt(el.value) : 50;
  });
  // Check if all sliders are within tolerance
  var allGood = sliders.every(function(sl, idx) {
    return Math.abs(values[idx] - sl.correct) <= sl.tolerance;
  });
  // Map slider values to CSS filter — blur: 0-10, contrast: 0.2-2, hue-rotate: 0-40
  var blurVal = sliders[0] ? (10 - Math.min(10, (values[0] / 100) * 10)) : 5;
  var contrastVal = sliders[1] ? Math.max(0.2, (values[1] / 100) * 2) : 0.5;
  var hueVal = sliders[2] ? (40 - (values[2] / 100) * 40) : 20;
  var doc = document.getElementById('decay-doc');
  var meter = document.getElementById('decay-meter');
  if (doc) {
    doc.style.filter = 'blur(' + blurVal.toFixed(1) + 'px) contrast(' + contrastVal.toFixed(2) + ') hue-rotate(' + hueVal.toFixed(0) + 'deg)';
  }
  var proximity = sliders.reduce(function(acc, sl, idx) {
    return acc + Math.max(0, 1 - Math.abs(values[idx] - sl.correct) / 50);
  }, 0) / sliders.length;
  if (meter) {
    if (allGood) {
      meter.textContent = '✓ Document restored!';
      meter.style.color = '#155724';
      setTimeout(function() { solvePuzzle(puzzleId); }, 800);
    } else if (proximity > 0.8) {
      meter.textContent = 'Almost... keep adjusting';
      meter.style.color = '#856404';
    } else if (proximity > 0.5) {
      meter.textContent = 'Getting clearer...';
      meter.style.color = '#8a6f2f';
    } else {
      meter.textContent = 'Adjust sliders to restore the document...';
      meter.style.color = '#8a6f2f';
    }
  }
}

// ── Layer Alignment Logic ──
var layerDragState = { active: false, idx: -1, startMouseX: 0, startMouseY: 0, startElemX: 0, startElemY: 0 };

function initLayerDrag() {
  var canvas = document.getElementById('layer-canvas');
  if (!canvas) return;
  canvas.addEventListener('mousemove', layerDragMove);
  canvas.addEventListener('mouseup', layerDragEnd);
  canvas.addEventListener('mouseleave', layerDragEnd);
  canvas.addEventListener('touchmove', function(e) { e.preventDefault(); layerDragMove(e); }, {passive:false});
  canvas.addEventListener('touchend', layerDragEnd);
}

function layerDragStart(e, idx) {
  e.preventDefault();
  var el = document.getElementById('layer-' + idx);
  if (!el) return;
  var clientX = e.touches ? e.touches[0].clientX : e.clientX;
  var clientY = e.touches ? e.touches[0].clientY : e.clientY;
  layerDragState = {
    active: true, idx: idx,
    startMouseX: clientX, startMouseY: clientY,
    startElemX: parseFloat(el.dataset.x) || 0,
    startElemY: parseFloat(el.dataset.y) || 0
  };
}

function layerDragMove(e) {
  if (!layerDragState.active) return;
  var clientX = e.touches ? e.touches[0].clientX : e.clientX;
  var clientY = e.touches ? e.touches[0].clientY : e.clientY;
  var dx = clientX - layerDragState.startMouseX;
  var dy = clientY - layerDragState.startMouseY;
  var newX = layerDragState.startElemX + dx;
  var newY = layerDragState.startElemY + dy;
  var el = document.getElementById('layer-' + layerDragState.idx);
  if (!el) return;
  el.dataset.x = newX;
  el.dataset.y = newY;
  el.style.transform = 'translate(' + newX + 'px,' + newY + 'px)';
  checkLayerProximity();
}

function layerDragEnd() {
  layerDragState.active = false;
  checkLayerProximity();
}

function checkLayerProximity() {
  var allAligned = true;
  var count = 0;
  while (document.getElementById('layer-' + count)) {
    var el = document.getElementById('layer-' + count);
    var cx = parseFloat(el.dataset.cx) || 0;
    var cy = parseFloat(el.dataset.cy) || 0;
    var x = parseFloat(el.dataset.x) || 0;
    var y = parseFloat(el.dataset.y) || 0;
    var tol = 25; // generous proximity for drag
    var aligned = Math.abs(x - cx) < tol && Math.abs(y - cy) < tol;
    if (aligned) { el.classList.add('aligned'); } else { el.classList.remove('aligned'); allAligned = false; }
    count++;
  }
  var revealEl = document.getElementById('layer-reveal');
  var submitBtn = document.getElementById('layer-submit');
  if (revealEl) revealEl.classList.toggle('visible', allAligned);
  if (submitBtn) submitBtn.style.display = allAligned ? '' : 'none';
}

function checkLayerAlign(puzzleId, tolerance) {
  // Already confirmed by checkLayerProximity — just solve
  solvePuzzle(puzzleId);
}

// ── Morse Decode Logic ──
var morseAudioCtx = null;
var morseStopFlag = false;

var MORSE_TABLE = {
  'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
  'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
  'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'
};

function stopMorse() {
  morseStopFlag = true;
  if (morseAudioCtx) { try { morseAudioCtx.close(); } catch(e){} morseAudioCtx = null; }
}

async function playMorse(pattern) {
  stopMorse();
  morseStopFlag = false;
  morseAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var ctx = morseAudioCtx;
  var t = ctx.currentTime + 0.05;
  var dotLen = 0.08;
  var freq = 680;
  var symbols = pattern.split('');
  for (var i = 0; i < symbols.length; i++) {
    if (morseStopFlag) break;
    var ch = symbols[i];
    var dur = ch === '.' ? dotLen : ch === '-' ? dotLen * 3 : 0;
    if (dur > 0) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain.gain.setValueAtTime(0.4, t + dur - 0.01);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t); osc.stop(t + dur);
      // Highlight symbol
      (function(idx, start, len) {
        setTimeout(function() {
          var el = document.getElementById('morse-sym-' + idx);
          if (el) { el.classList.add('active'); setTimeout(function() { el.classList.remove('active'); }, len * 1000); }
        }, (start - ctx.currentTime) * 1000);
      })(i, t, dur);
      t += dur + dotLen;
    } else if (ch === ' ') {
      t += dotLen * 3;
    } else if (ch === '/') {
      t += dotLen * 7;
    }
  }
  // Wait for audio to finish then close
  setTimeout(function() {
    if (ctx === morseAudioCtx) { try { ctx.close(); } catch(e){} morseAudioCtx = null; }
  }, (t - ctx.currentTime + 0.5) * 1000);
}

function checkMorse(puzzleId) {
  var puzzle = GAME.puzzles.find(function(p) { return p.id === puzzleId; });
  if (!puzzle) return;
  var input = document.getElementById('morse-input');
  if (input && input.value.trim().toUpperCase() === (puzzle.morseAnswer || '').toUpperCase()) {
    solvePuzzle(puzzleId);
  } else {
    showFeedback('Incorrect decoding. Listen again carefully.', false);
  }
}

// ── Solve ──
function solvePuzzle(puzzleId) {
  // Find the stage this puzzle belongs to (support both puzzleIds[] and legacy puzzleId)
  var stage = GAME.stages.find(function(s) {
    var ids = s.puzzleIds || (s.puzzleId ? [s.puzzleId] : []);
    return ids.indexOf(puzzleId) >= 0;
  });
  if (!stage) return;

  state.solvedPuzzles.add(puzzleId);
  closePuzzle();

  var puzzleIds = stage.puzzleIds || (stage.puzzleId ? [stage.puzzleId] : []);
  var solvedInStage = puzzleIds.filter(function(pid) { return state.solvedPuzzles.has(pid); });
  var puzzleIndex = puzzleIds.indexOf(puzzleId);
  var isLastPuzzle = solvedInStage.length === puzzleIds.length;

  if (isLastPuzzle) {
    // Stage complete!
    state.solvedStages.add(stage.id);
    sealShatter();

    var viewer = document.getElementById('viewer');
    var html = '<div class="card"><h2>✅ ' + escapeH(stage.name) + ' — Complete!</h2>';
    html += '<div id="completion-text" data-reveal="true">' + stage.completionText + '</div></div>';
    viewer.innerHTML = html;
    var completionEl = viewer.querySelector('#completion-text');
    if (completionEl) revealText(completionEl);

    toast('🎉 ' + stage.name + ' complete!');

    // Advance to next stage
    var nextStage = GAME.stages.find(function(s) { return s.stageNumber === stage.stageNumber + 1; });
    if (nextStage) { state.currentStage = nextStage.stageNumber; }

    // Unlock elements for next stage
    GAME.boxElements.forEach(function(elem) {
      if (elem.stage === stage.stageNumber && !state.availableElements.has(elem.id)) {
        state.availableElements.add(elem.id);
      }
    });

    renderToolbar();
    renderStagePips();

    if (state.solvedStages.size === GAME.stages.length) {
      setTimeout(showWin, 1800);
    }
  } else {
    // Mid-stage puzzle solved — show midway narrative reveal then next puzzle
    var midwayText = (stage.midwayTexts || [])[puzzleIndex] || '';
    var viewer = document.getElementById('viewer');
    var html = '<div class="card">';
    html += '<h2>' + stage.sealIcon + ' ' + escapeH(stage.name) + '</h2>';
    if (midwayText) {
      html += '<div class="midway-card"><p id="midway-reveal" data-reveal="true">' + escapeH(midwayText) + '</p></div>';
    }
    html += '<div style="text-align:center;margin-top:1rem"><button class="puzzle-submit" onclick="showStageCard(GAME.stages.find(function(s){return s.id===\\'' + stage.id + '\\';}),true)">Continue →</button></div>';
    html += '</div>';
    viewer.innerHTML = html;

    var midwayEl = viewer.querySelector('#midway-reveal');
    if (midwayEl) revealText(midwayEl);

    toast('✓ Part ' + (puzzleIndex + 1) + ' solved — a new truth surfaces...');
  }
}

// ── Wax Seal Shatter ──
function sealShatter() {
  var colors = ['#8B0000','#2d1b4e','#a83232','#6b1515'];
  var cx = window.innerWidth / 2;
  var cy = window.innerHeight / 2;
  for (var i = 0; i < 8; i++) {
    var shard = document.createElement('div');
    shard.className = 'seal-shard';
    var angle = (i / 8) * 360 + Math.random() * 30;
    var dist = 60 + Math.random() * 80;
    var dx = Math.cos(angle * Math.PI / 180) * dist;
    var dy = Math.sin(angle * Math.PI / 180) * dist;
    var size = 8 + Math.random() * 14;
    var rot = (Math.random() - 0.5) * 720;
    shard.style.cssText = 'left:' + (cx - size/2) + 'px;top:' + (cy - size/2) + 'px;width:' + size + 'px;height:' + size + 'px;background:' + colors[i % colors.length] + ';--shard-dest:translate(' + dx + 'px,' + dy + 'px);--shard-rot:' + rot + 'deg;border-radius:' + (Math.random() > 0.5 ? '2px' : '50%') + ';animation-duration:' + (0.7 + Math.random() * 0.4) + 's;animation-delay:' + (Math.random() * 0.1) + 's';
    document.body.appendChild(shard);
    setTimeout(function(s) { s.remove(); }, 1200, shard);
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

// ── Cipher Wheel Drag ──
var cwState = { dragging: false, startMouseAngle: 0, startRotation: 0, currentRotation: 0 };

function cwGetAngle(event) {
  var svg = document.getElementById('cw-svg');
  if (!svg) return 0;
  var rect = svg.getBoundingClientRect();
  var scaleX = rect.width / 300;
  var scaleY = rect.height / 300;
  var clientX = event.touches ? event.touches[0].clientX : event.clientX;
  var clientY = event.touches ? event.touches[0].clientY : event.clientY;
  var x = (clientX - rect.left) / scaleX - 150;
  var y = (clientY - rect.top) / scaleY - 150;
  return Math.atan2(y, x) * 180 / Math.PI;
}

function cwDragStart(event) {
  event.preventDefault();
  event.stopPropagation();
  cwState.dragging = true;
  cwState.startMouseAngle = cwGetAngle(event);
  cwState.startRotation = cwState.currentRotation;
  document.addEventListener('mousemove', cwDragMove);
  document.addEventListener('touchmove', cwDragMove, { passive: false });
  document.addEventListener('mouseup', cwDragEnd);
  document.addEventListener('touchend', cwDragEnd);
}

function cwDragMove(event) {
  if (!cwState.dragging) return;
  event.preventDefault();
  var angle = cwGetAngle(event);
  var delta = angle - cwState.startMouseAngle;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  cwState.currentRotation = cwState.startRotation + delta;
  var inner = document.getElementById('cw-inner');
  if (inner) inner.setAttribute('transform', 'rotate(' + cwState.currentRotation.toFixed(2) + ',150,150)');
  cwUpdateDisplay(cwState.currentRotation);
}

function cwDragEnd() {
  if (!cwState.dragging) return;
  cwState.dragging = false;
  document.removeEventListener('mousemove', cwDragMove);
  document.removeEventListener('touchmove', cwDragMove);
  document.removeEventListener('mouseup', cwDragEnd);
  document.removeEventListener('touchend', cwDragEnd);
  var DEG_PER_LETTER = 360 / 26;
  var snapped = Math.round(cwState.currentRotation / DEG_PER_LETTER) * DEG_PER_LETTER;
  cwState.currentRotation = snapped;
  var inner = document.getElementById('cw-inner');
  if (!inner) return;
  var m = (inner.getAttribute('transform') || '').match(/-?\\d+\\.?\\d*/);
  var from = m ? parseFloat(m[0]) : snapped;
  var t0 = performance.now();
  function animSnap(now) {
    var t = Math.min(1, (now - t0) / 160);
    var ease = 1 - Math.pow(1 - t, 3);
    var cur = from + (snapped - from) * ease;
    inner.setAttribute('transform', 'rotate(' + cur.toFixed(2) + ',150,150)');
    if (t < 1) { requestAnimationFrame(animSnap); }
  }
  requestAnimationFrame(animSnap);
  cwUpdateDisplay(snapped);
}

function cwUpdateDisplay(rotation) {
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var DEG_PER_LETTER = 360 / 26;
  // k = encode shift: rotating inner ring counterclockwise by k steps brings inner LETTERS[k] under outer A
  var k = (Math.round(-rotation / DEG_PER_LETTER) % 26 + 26) % 26;
  var shiftEl = document.getElementById('cw-shift-val');
  if (shiftEl) shiftEl.textContent = String(k);
  var alignEl = document.getElementById('cw-alignment');
  if (alignEl) alignEl.textContent = 'outer A \u2192 inner ' + LETTERS[k] + '\u00a0\u00a0(shift: ' + k + ')';
  var panel = document.getElementById('cw-decode-panel');
  var decodedEl = document.getElementById('cw-decoded');
  if (panel && decodedEl) {
    var raw = panel.getAttribute('data-encoded') || '';
    var decoded = raw.split('').map(function(ch) {
      if (ch >= 'A' && ch <= 'Z') return LETTERS[((ch.charCodeAt(0) - 65 - k) % 26 + 26) % 26];
      if (ch >= 'a' && ch <= 'z') return LETTERS[((ch.charCodeAt(0) - 97 - k) % 26 + 26) % 26].toLowerCase();
      return ch;
    }).join('');
    decodedEl.textContent = decoded;
  }
}

// ── Start ──
init();
</script>
</body>
</html>`;
}

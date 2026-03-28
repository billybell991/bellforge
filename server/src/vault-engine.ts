// ── Tales From The Forge — EC Comics HTML Viewer Generator ──
// Generates a self-contained HTML page with full EC Comics horror aesthetic.
// Cover page + 2 story pages (5 panels each). Aged parchment, blood red, Bangers.

import type { VaultStory, VaultPanel } from './vault-pipeline.js';

function escapeHtmlTemplate(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function generateVaultPreviewHtml(story: VaultStory): string {
  const storyJson = JSON.stringify(story);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<title>${escapeHtmlTemplate(story.title)} — Tales From The Forge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Special+Elite&family=Creepster&display=swap" rel="stylesheet">
<style>
  :root {
    --page-bg: #F0E4C2;
    --page-edge: #C8A86B;
    --panel-border: #1A0800;
    --title-red: #8B0000;
    --title-gold: #B8960C;
    --bellman-box-bg: #2D4A2D;
    --bellman-box-border: #1A3A1A;
    --bubble-bg: #FFFEF0;
    --bubble-border: #1A0800;
    --narration-bg: #FFF8DC;
    --narration-border: #8B6914;
    --thought-bg: #F0F0FF;
    --thought-border: #6B6B9A;
    --nav-pill-bg: rgba(10, 4, 0, 0.88);
    --comic-bg: #0A0400;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--comic-bg);
    font-family: 'Special Elite', serif;
    color: #1A0800;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Heavy vignette — like a worn paperback */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%);
    z-index: 50;
  }

  #comic-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  #page-content {
    position: absolute;
    inset: 0;
  }

  /* ── Cover ── */
  .cover-page {
    background: #0A0400;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .cover-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }
  .cover-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }
  .cover-top {
    padding: 1rem 1.2rem 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
    min-height: 22%;
  }
  .cover-publisher {
    font-family: 'Bangers', cursive;
    font-size: 0.65rem;
    letter-spacing: 5px;
    color: var(--title-gold);
    text-transform: uppercase;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
    margin-bottom: 0.1rem;
  }
  .cover-series {
    font-family: 'Bangers', cursive;
    font-size: clamp(1.2rem, 4.5vw, 2.2rem);
    color: var(--title-red);
    text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 0 0 25px rgba(139,0,0,0.5);
    letter-spacing: 2px;
    line-height: 1;
  }
  .cover-issue {
    font-family: 'Special Elite', serif;
    font-size: 0.6rem;
    color: rgba(255,255,255,0.5);
    text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
    margin-top: 0.2rem;
  }
  .cover-title {
    font-family: 'Bangers', cursive;
    font-size: clamp(1.5rem, 5.5vw, 2.8rem);
    color: #FFFEF0;
    text-shadow: 3px 3px 0 var(--title-red), -1px -1px 0 #000, 0 0 15px rgba(139,0,0,0.4);
    letter-spacing: 1px;
    line-height: 1.05;
    margin-top: 0.3rem;
  }
  .cover-bottom {
    margin-top: auto;
    padding: 0 1.2rem 1.2rem;
    background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
    min-height: 14%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .cover-subtitle {
    font-family: 'Special Elite', serif;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.75);
    font-style: italic;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
    max-width: 60%;
    line-height: 1.3;
  }
  .cover-tap {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    color: var(--title-gold);
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
    animation: pulse 2s ease-in-out infinite;
    pointer-events: auto;
  }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

  .cover-fallback {
    width: 80%;
    max-width: 380px;
    aspect-ratio: 2/3;
    border: 3px solid var(--title-gold);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    background: linear-gradient(135deg, rgba(139,0,0,0.18) 0%, rgba(184,150,12,0.1) 50%, rgba(10,4,0,0.85) 100%);
    text-align: center;
    padding: 1.5rem;
  }

  /* ── Story Page ── */
  .vault-page {
    background: var(--page-bg);
    width: 100%;
    height: 100%;
    padding: 6px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* Aged paper texture via subtle border */
    box-shadow: inset 0 0 30px rgba(139, 90, 0, 0.15);
  }

  /* Worn paper edge effect */
  .vault-page::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 70%, rgba(100, 60, 0, 0.12) 100%);
    pointer-events: none;
    z-index: 0;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px 4px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .page-series-label {
    font-family: 'Bangers', cursive;
    font-size: 0.6rem;
    letter-spacing: 3px;
    color: var(--title-red);
    text-transform: uppercase;
    opacity: 0.7;
  }
  .page-number {
    font-family: 'Special Elite', serif;
    font-size: 0.55rem;
    color: #8B6914;
    opacity: 0.6;
  }

  /* ── Panel Grid ── */
  /* Pages 1 & 2: panel 0 spans full width (wide opener), panels 1-4 in 2x2 */
  .panel-grid {
    display: grid;
    gap: 5px;
    flex: 1;
    position: relative;
    z-index: 1;
    min-height: 0;
  }
  .panel-grid.page-open {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1.6fr 1fr 1fr;
  }
  .panel-grid.page-open .panel:first-child {
    grid-column: 1 / -1;
  }
  /* Pages 3 & 4: panels 0-3 in 2x2, panel 4 spans full width (wide closer) */
  .panel-grid.page-close {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr 1.6fr;
  }
  .panel-grid.page-close .panel:last-child {
    grid-column: 1 / -1;
  }

  /* ── Individual Panel ── */
  .panel {
    border: 3px solid var(--panel-border);
    border-radius: 2px;
    background: #1A0800;
    position: relative;
    overflow: hidden;
  }

  /* Host panels (Bellman) get a faint green tint border */
  .panel.host-panel {
    border-color: #1A3A1A;
    box-shadow: inset 0 0 12px rgba(45, 74, 45, 0.3);
  }

  .panel-art {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(240, 228, 194, 0.6);
    font-style: italic;
    font-size: 0.65rem;
    line-height: 1.4;
    padding: 8px;
    text-align: center;
    background: linear-gradient(135deg, #1A0800 0%, #2D1A0A 100%);
  }
  .panel-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Dialogue overlay — captions at top, speech at bottom, faces stay clear */
  .dialogue-layer {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }
  .dialogue-captions {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 4px 0;
  }
  .dialogue-speech {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 4px 4px;
  }

  .bubble {
    padding: 3px 6px;
    border-radius: 6px;
    font-family: 'Special Elite', serif;
    font-size: 0.58rem;
    line-height: 1.25;
    word-wrap: break-word;
    opacity: 0.95;
  }
  .bubble-speaker {
    display: block;
    font-family: 'Bangers', cursive;
    font-size: 0.5rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    opacity: 0.65;
    margin-bottom: 1px;
  }
  .bubble-speech {
    background: var(--bubble-bg);
    border: 1.5px solid var(--bubble-border);
    font-weight: 700;
    color: #1A0800;
  }
  .bubble-thought {
    background: var(--thought-bg);
    border: 1.5px dashed var(--thought-border);
    font-style: italic;
    border-radius: 14px;
    color: #2A2A5A;
  }
  /* Standard narration: aged paper caption box */
  .bubble-narration {
    background: var(--narration-bg);
    border: 1px solid var(--narration-border);
    font-style: italic;
    font-size: 0.56rem;
    border-radius: 1px;
    color: #4A3000;
  }
  /* Bellman narration: sickly green crypt-voice caption box */
  .bubble-bellman {
    background: var(--bellman-box-bg);
    border: 1.5px solid var(--bellman-box-border);
    font-family: 'Special Elite', serif;
    font-style: italic;
    font-size: 0.56rem;
    border-radius: 1px;
    color: #C8E8B0;
    text-shadow: 0 0 4px rgba(100, 200, 80, 0.3);
  }

  /* ── Navigation ── */
  #nav-bar {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--nav-pill-bg);
    padding: 6px 16px;
    border-radius: 24px;
    display: flex;
    gap: 10px;
    align-items: center;
    z-index: 200;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(184,150,12,0.25);
    opacity: 1;
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  #nav-bar.nav-hidden {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
    pointer-events: none;
  }
  .nav-btn {
    background: none;
    border: 1.5px solid rgba(184,150,12,0.5);
    color: var(--title-gold);
    font-family: 'Bangers', cursive;
    font-size: 0.8rem;
    padding: 3px 10px;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .nav-btn:hover { background: rgba(184,150,12,0.15); border-color: var(--title-gold); }
  .nav-btn:disabled { opacity: 0.25; cursor: default; }
  .nav-btn:disabled:hover { background: none; }
  .nav-counter {
    color: rgba(240,228,194,0.5);
    font-family: 'Special Elite', serif;
    font-size: 0.7rem;
    min-width: 52px;
    text-align: center;
  }

  /* ── Page thumb strip ── */
  #thumb-strip {
    position: fixed;
    bottom: 52px;
    left: 50%;
    transform: translateX(-50%);
    display: none;
    gap: 3px;
    padding: 5px 10px;
    background: var(--nav-pill-bg);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(184,150,12,0.2);
    border-radius: 16px;
    overflow-x: auto;
    z-index: 199;
    max-width: 85vw;
    -webkit-overflow-scrolling: touch;
  }
  #thumb-strip.visible { display: flex; }
  .thumb-item {
    min-width: 36px;
    height: 24px;
    border: 1.5px solid rgba(184,150,12,0.25);
    border-radius: 10px;
    background: rgba(240,228,194,0.05);
    color: rgba(240,228,194,0.5);
    font-family: 'Special Elite', serif;
    font-size: 0.55rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .thumb-item:hover, .thumb-item.active {
    border-color: var(--title-gold);
    background: rgba(184,150,12,0.15);
    color: var(--title-gold);
  }

  .nav-thumb-btn {
    background: none;
    border: none;
    color: rgba(240,228,194,0.4);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 2px 4px;
    transition: color 0.2s;
  }
  .nav-thumb-btn:hover { color: var(--title-gold); }

  /* ── Transitions ── */
  .page-enter { animation: pageFadeIn 0.4s ease; }
  @keyframes pageFadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
</head>
<body>
<div id="comic-container">
  <div id="page-content"></div>
</div>
<div id="thumb-strip"></div>
<div id="nav-bar"></div>

<script>
(function() {
  var STORY = ${storyJson};

  var currentIndex = -1; // -1 = cover

  var pageContent = document.getElementById('page-content');
  var navBar = document.getElementById('nav-bar');
  var thumbStrip = document.getElementById('thumb-strip');
  var thumbsVisible = false;

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }

  function sanitizeImageSrc(src) {
    if (typeof src !== 'string') return '';
    if (src.startsWith('data:image/')) return src;
    return '';
  }

  function renderCover() {
    currentIndex = -1;
    var html = '<div class="cover-page" id="cover-click">';
    if (STORY.coverIllustration) {
      html += '<img class="cover-bg" src="' + sanitizeImageSrc(STORY.coverIllustration) + '" alt="Cover">';
      html += '<div class="cover-overlay">';
      // Top band
      html += '<div class="cover-top">';
      html += '<div class="cover-publisher">BellForge Comics</div>';
      html += '<div class="cover-series">Tales From The Forge</div>';
      html += '<div class="cover-issue">Issue #' + (STORY.issueNumber || 1) + ' &mdash; A Tale of ' + escapeHTML(STORY.sinType.charAt(0).toUpperCase() + STORY.sinType.slice(1)) + '</div>';
      html += '<h1 class="cover-title">' + escapeHTML(STORY.title) + '</h1>';
      html += '</div>';
      // Bottom band
      html += '<div class="cover-bottom">';
      html += '<div class="cover-subtitle">' + escapeHTML(STORY.subtitle || '') + '</div>';
      html += '<div class="cover-tap">Open the Vault &#x2192;</div>';
      html += '</div>';
      html += '</div>';
    } else {
      // Fallback — no cover image
      html += '<div class="cover-fallback">';
      html += '<div class="cover-publisher">BellForge Comics</div>';
      html += '<div class="cover-series">Tales From The Forge</div>';
      html += '<h1 class="cover-title">' + escapeHTML(STORY.title) + '</h1>';
      html += '<div class="cover-subtitle">' + escapeHTML(STORY.subtitle || '') + '</div>';
      html += '<div class="cover-tap">Open the Vault &#x2192;</div>';
      html += '</div>';
    }
    html += '</div>';
    pageContent.innerHTML = html;
    pageContent.className = 'page-enter';
    document.getElementById('cover-click').addEventListener('click', function() { renderPage(0); });
    updateNav();
    resetNavTimer();
  }

  function renderPage(idx) {
    if (idx < 0 || idx >= STORY.pages.length) return;
    currentIndex = idx;
    var page = STORY.pages[idx];
    var gridClass = idx < 2 ? 'page-open' : 'page-close';

    var html = '<div class="vault-page">';

    // Page header
    html += '<div class="page-header">';
    html += '<span class="page-series-label">Tales From The Forge</span>';
    html += '<span class="page-number">Pg. ' + (idx + 1) + ' of ' + STORY.pages.length + '</span>';
    html += '</div>';

    // Panel grid
    html += '<div class="panel-grid ' + gridClass + '">';
    for (var i = 0; i < page.panels.length; i++) {
      var panel = page.panels[i];
      var hostClass = panel.isHostPanel ? ' host-panel' : '';
      html += '<div class="panel' + hostClass + '">';

      // Art
      if (panel.illustration) {
        html += '<div class="panel-art"><img src="' + sanitizeImageSrc(panel.illustration) + '" alt="Panel ' + panel.panelNumber + '"></div>';
      } else {
        html += '<div class="panel-art">' + escapeHTML(panel.artDirection ? panel.artDirection.slice(0, 80) + '...' : 'Panel ' + panel.panelNumber) + '</div>';
      }

      // Dialogue overlay — captions at top, speech at bottom, faces stay clear
      if (panel.dialogue && panel.dialogue.length > 0) {
        var captions = panel.dialogue.filter(function(d) { return d.type === 'narration'; });
        var speeches = panel.dialogue.filter(function(d) { return d.type !== 'narration'; });
        html += '<div class="dialogue-layer">';
        if (captions.length > 0) {
          html += '<div class="dialogue-captions">';
          for (var d = 0; d < captions.length; d++) {
            var dlg = captions[d];
            var isBellman = panel.isHostPanel;
            html += '<div class="bubble ' + (isBellman ? 'bubble-bellman' : 'bubble-narration') + '">' + escapeHTML(dlg.text) + '</div>';
          }
          html += '</div>';
        }
        if (speeches.length > 0) {
          html += '<div class="dialogue-speech">';
          for (var d = 0; d < speeches.length; d++) {
            var dlg = speeches[d];
            var bubClass = dlg.type === 'thought' ? 'bubble-thought' : 'bubble-speech';
            html += '<div class="bubble ' + bubClass + '">';
            if (dlg.speaker && dlg.speaker.toUpperCase() !== 'NARRATOR') {
              html += '<span class="bubble-speaker">' + escapeHTML(dlg.speaker) + '</span>';
            }
            html += escapeHTML(dlg.text) + '</div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div>'; // .panel
    }
    html += '</div>'; // .panel-grid
    html += '</div>'; // .vault-page

    pageContent.innerHTML = html;
    pageContent.className = 'page-enter';
    updateNav();
    resetNavTimer();
  }

  function updateNav() {
    var total = STORY.pages.length;
    var html = '<button class="nav-btn" id="nav-prev"' + (currentIndex <= -1 ? ' disabled' : '') + '>&#x2190; Prev</button>';
    html += '<span class="nav-counter">' + (currentIndex === -1 ? 'Cover' : (currentIndex + 1) + ' / ' + total) + '</span>';
    html += '<button class="nav-thumb-btn" id="nav-thumbs" title="Page list">&#x2630;</button>';
    html += '<button class="nav-btn" id="nav-next"' + (currentIndex >= total - 1 ? ' disabled' : '') + '>Next &#x2192;</button>';
    navBar.innerHTML = html;

    document.getElementById('nav-prev').addEventListener('click', function() {
      if (currentIndex === 0) renderCover();
      else if (currentIndex > 0) renderPage(currentIndex - 1);
    });
    document.getElementById('nav-next').addEventListener('click', function() {
      if (currentIndex === -1) renderPage(0);
      else if (currentIndex < total - 1) renderPage(currentIndex + 1);
    });
    document.getElementById('nav-thumbs').addEventListener('click', function() {
      thumbsVisible = !thumbsVisible;
      updateThumbs();
    });
    updateThumbs();
  }

  function updateThumbs() {
    if (!thumbsVisible) { thumbStrip.className = ''; return; }
    thumbStrip.className = 'visible';
    var html = '<div class="thumb-item' + (currentIndex === -1 ? ' active' : '') + '" data-idx="-1">Cover</div>';
    for (var t = 0; t < STORY.pages.length; t++) {
      html += '<div class="thumb-item' + (t === currentIndex ? ' active' : '') + '" data-idx="' + t + '">Pg ' + (t + 1) + '</div>';
    }
    thumbStrip.innerHTML = html;
    var thumbItems = thumbStrip.querySelectorAll('.thumb-item');
    for (var ti = 0; ti < thumbItems.length; ti++) {
      thumbItems[ti].addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-idx'));
        if (idx === -1) renderCover();
        else renderPage(idx);
        thumbsVisible = false;
        thumbStrip.className = '';
      });
    }
    var active = thumbStrip.querySelector('.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // ── Auto-hide nav ──
  var navHideTimer = null;
  var NAV_HIDE_DELAY = 3000;

  function resetNavTimer() {
    navBar.classList.remove('nav-hidden');
    if (navHideTimer) clearTimeout(navHideTimer);
    navHideTimer = setTimeout(function() {
      navBar.classList.add('nav-hidden');
    }, NAV_HIDE_DELAY);
  }

  document.addEventListener('mousemove', resetNavTimer);
  document.addEventListener('touchstart', resetNavTimer);
  document.addEventListener('keydown', function(e) {
    resetNavTimer();
    if (e.key === 'ArrowRight' || e.key === ' ') {
      if (currentIndex === -1) renderPage(0);
      else if (currentIndex < STORY.pages.length - 1) renderPage(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      if (currentIndex === 0) renderCover();
      else if (currentIndex > 0) renderPage(currentIndex - 1);
    }
  });

  // Touch swipe
  var touchStartX = 0;
  document.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) {
      if (currentIndex === -1) renderPage(0);
      else if (currentIndex < STORY.pages.length - 1) renderPage(currentIndex + 1);
    } else {
      if (currentIndex === 0) renderCover();
      else if (currentIndex > 0) renderPage(currentIndex - 1);
    }
  }, { passive: true });

  // Start on cover
  renderCover();
})();
</script>
</body>
</html>`;
}

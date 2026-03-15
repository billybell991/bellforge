// ── Comic HTML Viewer Generator ──
// Generates a self-contained HTML page for viewing an AI-generated comic book

import type { ComicStory } from './comic-pipeline.js';

export function generateComicPreviewHtml(story: ComicStory): string {
  const storyJson = JSON.stringify(story);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<title>${escapeHtml(story.title)}</title>
<link rel="manifest" href="data:application/json,${encodeURIComponent(JSON.stringify({
  name: story.title,
  short_name: story.title.slice(0, 12),
  start_url: '.',
  display: 'standalone',
  background_color: '#1a1a2e',
  theme_color: '#e53935',
  icons: [{ src: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💥</text></svg>', sizes: 'any', type: 'image/svg+xml' }],
}))}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#e53935">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;700;900&display=swap');

  :root {
    --comic-bg: #0a0a14;
    --panel-border: #222;
    --bubble-bg: #ffffff;
    --bubble-border: #222;
    --narration-bg: #fff8dc;
    --narration-border: #c9a84c;
    --thought-bg: #f0f0ff;
    --thought-border: #aaa;
    --title-red: #e53935;
    --title-gold: #ffd700;
    --page-bg: #f5f0e8;
    --nav-pill-bg: rgba(10, 10, 20, 0.85);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--comic-bg);
    font-family: 'Nunito', sans-serif;
    color: #222;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Vignette overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
    z-index: 50;
  }

  #comic-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Page content — stacked for crossfade */
  #page-content {
    position: absolute;
    inset: 0;
  }

  /* Cover */
  .cover-page {
    background: #0a0a0a;
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
    padding: 1.2rem 1.2rem 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%);
    min-height: 20%;
  }
  .cover-publisher {
    font-family: 'Bangers', cursive;
    font-size: 0.75rem;
    letter-spacing: 4px;
    color: var(--title-gold);
    text-transform: uppercase;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    margin-bottom: 0.15rem;
  }
  .cover-issue {
    font-family: 'Bangers', cursive;
    font-size: 0.65rem;
    color: rgba(255,255,255,0.6);
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  }
  .cover-title {
    font-family: 'Bangers', cursive;
    font-size: clamp(1.6rem, 6vw, 3rem);
    color: var(--title-red);
    text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 0 0 20px rgba(229,57,53,0.4);
    letter-spacing: 2px;
    line-height: 1.05;
    margin-top: 0.2rem;
  }
  .cover-bottom {
    margin-top: auto;
    padding: 0 1.2rem 1.2rem;
    background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%);
    min-height: 12%;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .cover-subtitle {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.8);
    font-style: italic;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    max-width: 65%;
  }
  .cover-tap {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    color: var(--title-gold);
    text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
    animation: pulse 2s ease-in-out infinite;
    pointer-events: auto;
  }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .cover-fallback {
    width: 80%;
    max-width: 400px;
    aspect-ratio: 2/3;
    border: 2px solid var(--title-gold);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    background: linear-gradient(135deg, rgba(229,57,53,0.15) 0%, rgba(255,215,0,0.1) 50%, rgba(26,26,46,0.8) 100%);
    text-align: center;
    padding: 1.5rem;
  }

  /* Page — fills the viewport */
  .comic-page {
    background: var(--page-bg);
    width: 100%;
    height: 100%;
    padding: 8px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .page-number {
    position: absolute;
    bottom: 6px;
    right: 10px;
    font-family: 'Bangers', cursive;
    font-size: 0.7rem;
    color: #999;
    z-index: 5;
  }

  /* Panel grid */
  .panel-grid {
    display: grid;
    gap: 5px;
    flex: 1;
  }
  .panel-grid.panels-3 { grid-template-columns: 1fr; grid-template-rows: 1.2fr 1fr 0.8fr; }
  .panel-grid.panels-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .panel-grid.panels-5 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; }
  .panel-grid.panels-5 .panel:first-child { grid-column: 1 / -1; }
  .panel-grid.panels-6 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; }
  .panel-grid.panels-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
  .panel-grid.panels-2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }

  /* Panel */
  .panel {
    border: 3px solid var(--panel-border);
    border-radius: 3px;
    background: #fff;
    position: relative;
    overflow: hidden;
  }
  .panel-art {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.85);
    font-style: italic;
    font-size: 0.7rem;
    line-height: 1.4;
    padding: 8px;
    text-align: center;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
  .panel:nth-child(1) .panel-art { background: linear-gradient(135deg, #2d3436 0%, #636e72 100%); }
  .panel:nth-child(2) .panel-art { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); }
  .panel:nth-child(3) .panel-art { background: linear-gradient(135deg, #2c3e50 0%, #4a69bd 100%); }
  .panel:nth-child(4) .panel-art { background: linear-gradient(135deg, #341f97 0%, #6c5ce7 100%); }
  .panel:nth-child(5) .panel-art { background: linear-gradient(135deg, #2d3436 0%, #b2bec3 100%); }
  .panel:nth-child(6) .panel-art { background: linear-gradient(135deg, #0c2461 0%, #4a69bd 100%); }
  .panel-art img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }

  /* Dialogue positioning */
  .dialogue-layer {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    pointer-events: none;
  }
  .bubble-zone-top { align-self: stretch; }
  .bubble-zone-left { align-self: flex-start; max-width: 55%; }
  .bubble-zone-right { align-self: flex-end; max-width: 55%; }
  .bubble-zone-center { align-self: center; max-width: 60%; }
  .bubble {
    padding: 5px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
    line-height: 1.25;
    word-wrap: break-word;
    opacity: 0.92;
  }
  .bubble-speech {
    background: var(--bubble-bg);
    border: 2px solid var(--bubble-border);
    font-weight: 700;
  }
  .bubble-thought {
    background: var(--thought-bg);
    border: 2px dashed var(--thought-border);
    font-style: italic;
    border-radius: 20px;
  }
  .bubble-narration {
    background: var(--narration-bg);
    border: 1px solid var(--narration-border);
    font-style: italic;
    font-size: 0.65rem;
    border-radius: 2px;
    text-align: center;
  }
  .bubble-speaker { display: none; }

  /* ── Navigation pill — auto-hiding ── */
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
    border: 1px solid rgba(255,255,255,0.08);
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
    border: 1.5px solid rgba(255,215,0,0.5);
    color: var(--title-gold);
    font-family: 'Bangers', cursive;
    font-size: 0.8rem;
    padding: 3px 10px;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .nav-btn:hover { background: rgba(255,215,0,0.15); border-color: var(--title-gold); }
  .nav-btn:disabled { opacity: 0.25; cursor: default; }
  .nav-btn:disabled:hover { background: none; }
  .nav-counter {
    color: rgba(255,255,255,0.5);
    font-family: 'Bangers', cursive;
    font-size: 0.75rem;
    min-width: 48px;
    text-align: center;
  }

  /* Page transitions */
  .page-enter { animation: pageFadeIn 0.35s ease; }
  @keyframes pageFadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Page thumbnail strip */
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
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow-x: auto;
    z-index: 199;
    max-width: 85vw;
    -webkit-overflow-scrolling: touch;
  }
  #thumb-strip.visible { display: flex; }
  .thumb-item {
    min-width: 32px;
    height: 24px;
    border: 1.5px solid rgba(255,215,0,0.25);
    border-radius: 10px;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.5);
    font-family: 'Bangers', cursive;
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
    background: rgba(255,215,0,0.15);
    color: var(--title-gold);
  }

  /* Swipe hint */
  .swipe-hint {
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: var(--title-gold);
    font-family: 'Bangers', cursive;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.75rem;
    z-index: 300;
    animation: fadeHint 3.5s ease forwards;
    pointer-events: none;
  }
  @keyframes fadeHint { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }

  /* Thumb toggle */
  .nav-thumb-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 2px 4px;
    transition: color 0.2s;
  }
  .nav-thumb-btn:hover { color: var(--title-gold); }
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
      html += '<div class="cover-top">';
      html += '<div class="cover-publisher">BellForge Comics</div>';
      html += '<div class="cover-issue">Issue #' + (STORY.issueNumber || 1) + '</div>';
      html += '<h1 class="cover-title">' + escapeHTML(STORY.title) + '</h1>';
      html += '</div>';
      html += '<div class="cover-bottom">';
      html += '<div class="cover-subtitle">' + escapeHTML(STORY.subtitle || '') + '</div>';
      html += '<div class="cover-tap">Tap to read \u2192</div>';
      html += '</div>';
      html += '</div>';
    } else {
      html += '<div class="cover-fallback">';
      html += '<div class="cover-publisher">BellForge Comics</div>';
      html += '<h1 class="cover-title">' + escapeHTML(STORY.title) + '</h1>';
      html += '<div class="cover-subtitle">' + escapeHTML(STORY.subtitle || '') + '</div>';
      html += '<div class="cover-tap">Tap to read \u2192</div>';
      html += '</div>';
    }
    html += '</div>';
    pageContent.innerHTML = html;
    pageContent.className = 'page-enter';

    document.getElementById('cover-click').addEventListener('click', function() {
      renderPage(0);
    });

    updateNav();
  }

  function renderPage(idx) {
    if (idx < 0 || idx >= STORY.pages.length) return;
    currentIndex = idx;
    var page = STORY.pages[idx];

    var html = '<div class="comic-page">';

    // Full-page Gemini composition (dialogue baked in) — the proven approach
    if (page.pageIllustration) {
      html += '<div style="width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;">';
      html += '<img src="' + sanitizeImageSrc(page.pageIllustration) + '" alt="Page ' + (idx+1) + '" style="width:100%;height:100%;object-fit:contain;">';
      html += '</div>';
    } else {
      // Fallback: per-panel grid with HTML dialogue overlays
      var panelCount = page.panels.length;
      var gridClass = 'panels-' + Math.min(panelCount, 6);

      html += '<div class="panel-grid ' + gridClass + '">';

      for (var i = 0; i < page.panels.length; i++) {
        var panel = page.panels[i];
        html += '<div class="panel">';

        // Art
        if (panel.illustration) {
          html += '<div class="panel-art"><img src="' + sanitizeImageSrc(panel.illustration) + '" alt="Panel"></div>';
        } else {
          html += '<div class="panel-art">' + escapeHTML(panel.artDirection || 'Panel ' + (i+1)) + '</div>';
        }

        // Dialogue — skip overlay when panel has illustration (dialogue is baked into the art)
        if (!panel.illustration && panel.dialogue && panel.dialogue.length > 0) {
          html += '<div class=\"dialogue-layer\">';
          for (var d = 0; d < panel.dialogue.length; d++) {
            var dlg = panel.dialogue[d];
            var bubbleClass = dlg.type === 'thought' ? 'bubble-thought' : dlg.type === 'narration' ? 'bubble-narration' : 'bubble-speech';
            // Position bubble OPPOSITE to speaker: speaker left → bubble right, etc.
            var zoneClass = 'bubble-zone-top';
            if (dlg.type === 'narration') {
              zoneClass = 'bubble-zone-top';
            } else if (dlg.speakerPosition === 'left') {
              zoneClass = 'bubble-zone-right';
            } else if (dlg.speakerPosition === 'right') {
              zoneClass = 'bubble-zone-left';
            } else {
              zoneClass = d % 2 === 0 ? 'bubble-zone-left' : 'bubble-zone-right';
            }
            html += '<div class=\"bubble ' + bubbleClass + ' ' + zoneClass + '\">';
            html += escapeHTML(dlg.text);
            html += '</div>';
          }
          html += '</div>';
        }

        html += '</div>';
      }

      html += '</div>';
    }

    html += '<div class="page-number">Page ' + (idx + 1) + ' of ' + STORY.pages.length + '</div>';
    html += '</div>';

    pageContent.innerHTML = html;
    pageContent.className = 'page-enter';
    updateNav();
    resetNavTimer();
  }

  function updateNav() {
    var total = STORY.pages.length;
    var html = '<button class="nav-btn" id="nav-prev"' + (currentIndex <= -1 ? ' disabled' : '') + '>\\u2190 Prev</button>';
    html += '<span class="nav-counter">' + (currentIndex === -1 ? 'Cover' : (currentIndex + 1) + ' / ' + total) + '</span>';
    html += '<button class="nav-thumb-btn" id="nav-thumbs" title="Page thumbnails">\\u2630</button>';
    html += '<button class="nav-btn" id="nav-next"' + (currentIndex >= total - 1 ? ' disabled' : '') + '>Next \\u2192</button>';
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
    if (!thumbsVisible) {
      thumbStrip.className = '';
      return;
    }
    thumbStrip.className = 'visible';
    var html = '<div class="thumb-item' + (currentIndex === -1 ? ' active' : '') + '" data-idx="-1">Cover</div>';
    for (var t = 0; t < STORY.pages.length; t++) {
      html += '<div class="thumb-item' + (t === currentIndex ? ' active' : '') + '" data-idx="' + t + '">' + (t + 1) + '</div>';
    }
    thumbStrip.innerHTML = html;
    var thumbItems = thumbStrip.querySelectorAll('.thumb-item');
    for (var ti = 0; ti < thumbItems.length; ti++) {
      thumbItems[ti].addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-idx'));
        if (idx === -1) renderCover();
        else renderPage(idx);
      });
    }
    // Scroll active thumb into view
    var active = thumbStrip.querySelector('.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // ── Auto-hide nav after inactivity ──
  var navHideTimer = null;
  var NAV_HIDE_DELAY = 3000;

  function resetNavTimer() {
    navBar.classList.remove('nav-hidden');
    if (navHideTimer) clearTimeout(navHideTimer);
    if (currentIndex >= 0) { // Don't hide on cover
      navHideTimer = setTimeout(function() {
        if (!thumbsVisible) navBar.classList.add('nav-hidden');
      }, NAV_HIDE_DELAY);
    }
  }

  // Show nav on any interaction
  document.addEventListener('mousemove', resetNavTimer, { passive: true });
  document.addEventListener('touchstart', resetNavTimer, { passive: true });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (currentIndex === -1) renderPage(0);
      else if (currentIndex < STORY.pages.length - 1) renderPage(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentIndex === 0) renderCover();
      else if (currentIndex > 0) renderPage(currentIndex - 1);
    }
  });

  // ── Touch swipe navigation ──
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var isSwiping = false;

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isSwiping = true;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    isSwiping = false;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    var dt = Date.now() - touchStartTime;
    // Must be a horizontal swipe: |dx| > 50px, |dx| > |dy|, under 400ms
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) || dt > 400) return;
    if (dx < 0) {
      // Swipe left → next page
      if (currentIndex === -1) renderPage(0);
      else if (currentIndex < STORY.pages.length - 1) renderPage(currentIndex + 1);
    } else {
      // Swipe right → previous page
      if (currentIndex === 0) renderCover();
      else if (currentIndex > 0) renderPage(currentIndex - 1);
    }
  }, { passive: true });

  // Show swipe hint on first visit (mobile only)
  if ('ontouchstart' in window) {
    var hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.textContent = '\\u2190 Swipe to turn pages \\u2192';
    document.body.appendChild(hint);
    setTimeout(function() { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 3500);
  }

  // ── Service Worker for offline reading ──
  if ('serviceWorker' in navigator) {
    var swBlob = new Blob([
      'self.addEventListener("install", function(e) { self.skipWaiting(); });',
      'self.addEventListener("activate", function(e) { e.waitUntil(clients.claim()); });',
      'self.addEventListener("fetch", function(e) {',
      '  e.respondWith(caches.match(e.request).then(function(r) {',
      '    return r || fetch(e.request).then(function(resp) {',
      '      if (resp.status === 200) {',
      '        var c = resp.clone();',
      '        caches.open("comic-v1").then(function(cache) { cache.put(e.request, c); });',
      '      }',
      '      return resp;',
      '    });',
      '  }));',
      '});',
    ], { type: 'application/javascript' });
    var swUrl = URL.createObjectURL(swBlob);
    navigator.serviceWorker.register(swUrl).catch(function() {});
  }

  // Boot
  renderCover();
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

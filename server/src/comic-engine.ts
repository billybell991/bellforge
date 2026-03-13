// ── Comic HTML Viewer Generator ──
// Generates a self-contained HTML page for viewing an AI-generated comic book

import type { ComicStory } from './comic-pipeline.js';

export function generateComicPreviewHtml(story: ComicStory): string {
  const storyJson = JSON.stringify(story);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(story.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;700;900&display=swap');

  :root {
    --comic-bg: #1a1a2e;
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
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--comic-bg);
    font-family: 'Nunito', sans-serif;
    color: #222;
    overflow-x: hidden;
  }

  #comic-container {
    max-width: 780px;
    margin: 0 auto;
    padding: 0;
  }

  /* Cover */
  .cover-page {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    position: relative;
  }
  .cover-publisher {
    font-family: 'Bangers', cursive;
    font-size: 0.9rem;
    letter-spacing: 4px;
    color: var(--title-gold);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }
  .cover-issue {
    font-family: 'Bangers', cursive;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.6);
    margin-bottom: 1rem;
  }
  .cover-title {
    font-family: 'Bangers', cursive;
    font-size: 3.5rem;
    color: var(--title-red);
    text-shadow: 3px 3px 0 #000, -1px -1px 0 #000;
    letter-spacing: 3px;
    line-height: 1.1;
    margin-bottom: 0.5rem;
  }
  .cover-subtitle {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.8);
    font-style: italic;
    margin-bottom: 2rem;
    max-width: 500px;
  }
  .cover-art-placeholder {
    width: 300px;
    height: 400px;
    border: 3px solid var(--title-gold);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.5);
    font-style: italic;
    font-size: 0.9rem;
    margin-bottom: 2rem;
    background: linear-gradient(135deg, rgba(229,57,53,0.15) 0%, rgba(255,215,0,0.1) 50%, rgba(26,26,46,0.8) 100%);
    box-shadow: 0 0 40px rgba(229,57,53,0.2), inset 0 0 60px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  }
  .cover-art-placeholder::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid rgba(255,215,0,0.2);
    border-radius: 4px;
  }
  .cover-tap {
    font-family: 'Bangers', cursive;
    font-size: 1.2rem;
    color: var(--title-gold);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

  /* Page */
  .comic-page {
    background: var(--page-bg);
    margin: 4px 0;
    padding: 12px;
    position: relative;
    min-height: 80vh;
  }
  .page-number {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-family: 'Bangers', cursive;
    font-size: 0.75rem;
    color: #999;
  }

  /* Panel grid */
  .panel-grid {
    display: grid;
    gap: 6px;
    height: 100%;
    min-height: 70vh;
  }
  .panel-grid.panels-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .panel-grid.panels-3 .panel:first-child { grid-column: 1 / -1; }
  .panel-grid.panels-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .panel-grid.panels-5 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .panel-grid.panels-5 .panel:nth-child(4) { grid-column: 1 / 2; }
  .panel-grid.panels-5 .panel:nth-child(5) { grid-column: 2 / 4; }
  .panel-grid.panels-6 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .panel-grid.panels-1 { grid-template-columns: 1fr; }
  .panel-grid.panels-2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }

  /* Panel */
  .panel {
    border: 3px solid var(--panel-border);
    border-radius: 4px;
    background: #fff;
    position: relative;
    overflow: hidden;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 8px;
  }
  .panel-art {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.85);
    font-style: italic;
    font-size: 0.75rem;
    line-height: 1.4;
    padding: 12px;
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
    object-fit: cover;
  }

  /* Dialogue bubbles */
  .dialogue-layer {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
  }
  .bubble {
    padding: 6px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    line-height: 1.3;
    max-width: 85%;
    word-wrap: break-word;
  }
  .bubble-speech {
    background: var(--bubble-bg);
    border: 2px solid var(--bubble-border);
    font-weight: 700;
    align-self: flex-start;
  }
  .bubble-thought {
    background: var(--thought-bg);
    border: 2px dashed var(--thought-border);
    font-style: italic;
    align-self: flex-end;
    border-radius: 20px;
  }
  .bubble-narration {
    background: var(--narration-bg);
    border: 1px solid var(--narration-border);
    font-style: italic;
    font-size: 0.75rem;
    align-self: stretch;
    border-radius: 2px;
    text-align: center;
  }
  .bubble-speaker {
    font-family: 'Bangers', cursive;
    font-size: 0.65rem;
    color: #888;
    margin-bottom: 1px;
    font-style: normal;
  }

  /* Navigation */
  #nav-bar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(26,26,46,0.95);
    padding: 8px 16px;
    border-radius: 12px 12px 0 0;
    display: flex;
    gap: 12px;
    align-items: center;
    z-index: 100;
    backdrop-filter: blur(8px);
  }
  .nav-btn {
    background: none;
    border: 2px solid var(--title-gold);
    color: var(--title-gold);
    font-family: 'Bangers', cursive;
    font-size: 0.9rem;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .nav-btn:hover { background: var(--title-gold); color: #1a1a2e; }
  .nav-btn:disabled { opacity: 0.3; cursor: default; }
  .nav-btn:disabled:hover { background: none; color: var(--title-gold); }
  .nav-counter {
    color: rgba(255,255,255,0.7);
    font-family: 'Bangers', cursive;
    font-size: 0.85rem;
  }

  /* Transitions */
  .page-enter { animation: slideIn 0.3s ease; }
  @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
</style>
</head>
<body>
<div id="comic-container">
  <div id="page-content"></div>
</div>
<div id="nav-bar"></div>

<script>
(function() {
  var STORY = ${storyJson};

  var currentIndex = -1; // -1 = cover

  var pageContent = document.getElementById('page-content');
  var navBar = document.getElementById('nav-bar');

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
    html += '<div class="cover-publisher">BellForge Comics</div>';
    html += '<div class="cover-issue">Issue #' + (STORY.issueNumber || 1) + '</div>';
    if (STORY.coverIllustration) {
      html += '<div class="cover-art-placeholder" style="border:none;background:none;"><img src="' + sanitizeImageSrc(STORY.coverIllustration) + '" alt="Cover" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>';
    } else {
      html += '<h1 class="cover-title">' + escapeHTML(STORY.title) + '</h1>';
      html += '<div class="cover-subtitle">' + escapeHTML(STORY.subtitle) + '</div>';
      html += '<div class="cover-art-placeholder">\u2726 ' + escapeHTML(STORY.title) + ' \u2726</div>';
    }
    html += '<div class="cover-tap">Tap to read \\u2192</div>';
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
      html += '<div style="width:100%;min-height:70vh;position:relative;">';
      html += '<img src="' + sanitizeImageSrc(page.pageIllustration) + '" alt="Page ' + (idx+1) + '" style="width:100%;height:auto;display:block;border-radius:4px;">';
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

        // Dialogue
        if (panel.dialogue && panel.dialogue.length > 0) {
          html += '<div class="dialogue-layer">';
          for (var d = 0; d < panel.dialogue.length; d++) {
            var dlg = panel.dialogue[d];
            var bubbleClass = dlg.type === 'thought' ? 'bubble-thought' : dlg.type === 'narration' ? 'bubble-narration' : 'bubble-speech';
            html += '<div class="bubble ' + bubbleClass + '">';
            if (dlg.speaker && dlg.type !== 'narration') {
              html += '<div class="bubble-speaker">' + escapeHTML(dlg.speaker) + '</div>';
            }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateNav();
  }

  function updateNav() {
    var total = STORY.pages.length;
    var html = '<button class="nav-btn" id="nav-prev"' + (currentIndex <= -1 ? ' disabled' : '') + '>\\u2190 Prev</button>';
    html += '<span class="nav-counter">' + (currentIndex === -1 ? 'Cover' : (currentIndex + 1) + ' / ' + total) + '</span>';
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
  }

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

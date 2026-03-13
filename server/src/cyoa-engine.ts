// ── CYOA HTML Engine Generator ──
// Generates a self-contained HTML page for playing a Choose Your Own Adventure story

import type { CYOAStory } from './cyoa-pipeline.js';

export function generateCYOAPreviewHtml(story: CYOAStory): string {
  const storyJson = JSON.stringify(story);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(story.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

  :root {
    --paper-cream: #f4e8c1;
    --paper-edge: #d4c49a;
    --ink-brown: #3d2b1f;
    --ink-light: #5a4a3a;
    --accent-red: #8b2500;
    --accent-gold: #c19a49;
    --bantam-blue: #1a3a5c;
    --forge-fire: #d4780a;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #2a1f14;
    font-family: 'Crimson Text', Georgia, serif;
    color: var(--ink-brown);
    display: flex;
    justify-content: center;
    min-height: 100vh;
    padding: 0;
  }

  #book-container {
    background: var(--paper-cream);
    width: 100%;
    max-width: 700px;
    min-height: 100vh;
    padding: 2rem 2.5rem;
    box-shadow: 0 0 40px rgba(0,0,0,0.5);
    position: relative;
  }

  .page-number {
    text-align: center;
    font-family: 'Special Elite', monospace;
    font-size: 0.8rem;
    color: var(--ink-light);
    margin-bottom: 1.5rem;
    letter-spacing: 2px;
  }

  .story-text {
    font-size: 1.1rem;
    line-height: 1.8;
    margin-bottom: 1rem;
    text-indent: 1.5em;
    color: var(--ink-brown);
  }

  .story-text.drop-cap::first-letter {
    float: left;
    font-size: 3.5em;
    line-height: 0.8;
    margin-right: 0.05em;
    color: var(--accent-red);
    font-weight: 600;
  }

  .story-text.flavor-text {
    font-style: italic;
    color: var(--ink-light);
    border-left: 3px solid var(--accent-gold);
    padding-left: 1em;
    text-indent: 0;
  }

  /* Illustration */
  .illustration-frame {
    margin: 1.5rem auto;
    max-width: 90%;
  }
  .frame-border {
    border: 3px solid var(--paper-edge);
    padding: 4px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .frame-border img {
    width: 100%;
    display: block;
  }
  .illustration-caption {
    text-align: center;
    font-family: 'Special Elite', monospace;
    font-size: 0.75rem;
    color: var(--ink-light);
    margin-top: 0.4rem;
    font-style: italic;
  }

  /* Choices */
  .choices-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid var(--paper-edge);
  }
  .choice-link {
    display: block;
    padding: 0.8rem 1rem;
    margin: 0.6rem 0;
    font-family: 'Special Elite', monospace;
    font-size: 1rem;
    color: var(--bantam-blue);
    text-decoration: none;
    border: 1px solid var(--paper-edge);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    background: rgba(255,255,255,0.5);
  }
  .choice-link:hover {
    background: var(--bantam-blue);
    color: var(--paper-cream);
    border-color: var(--bantam-blue);
  }
  .page-ref {
    float: right;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  /* Ending */
  .the-end {
    text-align: center;
    margin-top: 2rem;
    padding: 2rem 0;
  }
  .the-end .divider {
    width: 60%;
    height: 2px;
    background: var(--accent-gold);
    margin: 0 auto 1.5rem;
  }
  .the-end h2 {
    font-family: 'Special Elite', monospace;
    font-size: 1.8rem;
    color: var(--accent-red);
    letter-spacing: 4px;
    margin-bottom: 0.5rem;
  }
  .end-flavor {
    font-style: italic;
    color: var(--ink-light);
    margin-bottom: 1.5rem;
  }
  .restart-link, .reforge-link {
    font-family: 'Special Elite', monospace;
    font-size: 0.9rem;
    color: var(--forge-fire);
    text-decoration: underline;
    cursor: pointer;
    border: none;
    background: none;
  }

  /* Title page */
  .title-page {
    text-align: center;
    padding: 2rem 0;
  }
  .series-header {
    font-family: 'Special Elite', monospace;
    font-size: 0.85rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--ink-light);
    margin-bottom: 0.5rem;
  }
  .book-number {
    font-family: 'Special Elite', monospace;
    font-size: 0.8rem;
    color: var(--accent-gold);
    margin-bottom: 1rem;
  }
  .book-title {
    font-family: 'Special Elite', monospace;
    font-size: 2.2rem;
    color: var(--accent-red);
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
    line-height: 1.2;
  }
  .subtitle {
    font-style: italic;
    color: var(--ink-light);
    margin-bottom: 1.5rem;
    font-size: 1.05rem;
  }
  .warning-box {
    border: 2px solid var(--accent-red);
    padding: 1.2rem;
    margin: 1.5rem auto;
    max-width: 80%;
    text-align: left;
  }
  .warning-box h3 {
    font-family: 'Special Elite', monospace;
    color: var(--accent-red);
    margin-bottom: 0.5rem;
  }
  .warning-box p {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--ink-light);
  }
  .tagline {
    font-family: 'Special Elite', monospace;
    font-size: 0.9rem;
    color: var(--accent-gold);
    letter-spacing: 2px;
    margin: 1rem 0;
  }
  .begin-link {
    display: inline-block;
    margin-top: 1rem;
    font-family: 'Special Elite', monospace;
    font-size: 1.1rem;
    color: var(--forge-fire);
    text-decoration: none;
    cursor: pointer;
    border: 2px solid var(--forge-fire);
    padding: 0.6rem 1.5rem;
    border-radius: 4px;
    transition: all 0.2s;
  }
  .begin-link:hover {
    background: var(--forge-fire);
    color: var(--paper-cream);
  }

  /* Inventory bar */
  #inventory-bar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background: var(--ink-brown);
    color: var(--paper-cream);
    padding: 0.4rem 1rem;
    font-family: 'Special Elite', monospace;
    font-size: 0.8rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    border-radius: 6px 6px 0 0;
    z-index: 100;
    max-width: 600px;
  }
  #inventory-bar.empty { display: none; }
  .inv-label { color: var(--accent-gold); margin-right: 0.3rem; }
  .inv-items { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .inv-item {
    background: rgba(255,255,255,0.15);
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    font-size: 0.75rem;
  }

  /* History bar */
  #history-bar {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: var(--ink-brown);
    color: var(--paper-cream);
    padding: 0.3rem 0.8rem;
    font-family: 'Special Elite', monospace;
    font-size: 0.7rem;
    display: flex;
    gap: 0.3rem;
    align-items: center;
    border-radius: 0 0 6px 6px;
    z-index: 100;
  }
  .hist-page {
    cursor: pointer;
    color: var(--accent-gold);
    text-decoration: underline;
  }
  .hist-sep { opacity: 0.5; }
  .hist-current { color: #fff; font-weight: bold; }

  /* Page transitions */
  .page-enter { animation: fadeIn 0.3s ease; }
  .page-exit { opacity: 0; transition: opacity 0.2s; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  /* Item toast */
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%); } }
</style>
</head>
<body>
<div id="book-container">
  <div id="page-content"></div>
</div>
<div id="inventory-bar" class="empty"></div>
<div id="history-bar"></div>

<script>
(function() {
  const STORY = ${storyJson};

  const state = {
    currentPage: null,
    history: [],
    inventory: [],
    flags: new Set(),
  };

  const pageContent = document.getElementById('page-content');
  const inventoryBar = document.getElementById('inventory-bar');
  const historyBar = document.getElementById('history-bar');

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/[&"'<>]/g, function(c) {
      return {'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c];
    });
  }

  function sanitizeImageSrc(src) {
    if (typeof src !== 'string') return '';
    if (src.startsWith('data:image/')) return src;
    return '';
  }

  function formatItemName(item) {
    return item.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
  }

  function showItemToast(item) {
    var toast = document.createElement('div');
    toast.textContent = 'Found: ' + formatItemName(item);
    toast.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:var(--bantam-blue);color:var(--paper-cream);padding:0.5em 1.2em;font-family:Special Elite,monospace;font-size:0.85rem;z-index:200;border-radius:3px;box-shadow:0 3px 10px rgba(0,0,0,0.3);animation:toastIn 0.3s ease';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2000);
  }

  function renderPage(pageId) {
    var page = STORY.pages[pageId];
    if (!page) return;

    if (state.currentPage !== null) state.history.push(state.currentPage);
    state.currentPage = pageId;

    if (page.items) {
      page.items.forEach(function(item) {
        if (state.inventory.indexOf(item) === -1) {
          state.inventory.push(item);
          showItemToast(item);
        }
      });
    }
    if (page.flags) page.flags.forEach(function(f) { state.flags.add(f); });

    pageContent.classList.remove('page-enter');
    pageContent.classList.add('page-exit');

    setTimeout(function() {
      var html = '<div class="page-number">' + escapeHTML(pageId) + '</div>';

      if (page.illustration) {
        html += '<div class="illustration-frame"><div class="frame-border">';
        html += '<img src="' + sanitizeImageSrc(page.illustration) + '" alt="Illustration">';
        html += '</div>';
        if (page.illustrationCaption) html += '<div class="illustration-caption">' + escapeHTML(page.illustrationCaption) + '</div>';
        html += '</div>';
      }

      if (page.text) {
        page.text.forEach(function(para, i) {
          var cls = (i === 0 && !page.illustration) ? ' drop-cap' : '';
          html += '<p class="story-text' + cls + '">' + escapeHTML(para) + '</p>';
        });
      }

      if (page.conditionalText) {
        page.conditionalText.forEach(function(ct) {
          if (state.flags.has(ct.flag) || state.inventory.indexOf(ct.flag) !== -1) {
            html += '<p class="story-text flavor-text">' + escapeHTML(ct.text) + '</p>';
          }
        });
      }

      if (page.isEnding) {
        var endLabel = page.endingType === 'good' ? 'A Triumphant End'
          : page.endingType === 'bad' ? 'A Grim Fate' : 'The End';
        html += '<div class="the-end"><div class="divider"></div>';
        html += '<h2>' + endLabel + '</h2>';
        html += '<p class="end-flavor">Your journey has concluded on page ' + escapeHTML(pageId) + '.</p>';
        html += '<button class="restart-link" id="restart-btn">Turn back to page 1</button>';
        html += '</div>';
      }

      if (page.choices && page.choices.length > 0) {
        html += '<div class="choices-section">';
        page.choices.forEach(function(choice) {
          if (choice.itemRequired && state.inventory.indexOf(choice.itemRequired) === -1) return;
          html += '<a class="choice-link" href="#" data-page="' + escapeAttr(choice.page) + '">';
          html += escapeHTML(choice.text);
          html += '<span class="page-ref">(turn to page ' + escapeHTML(String(choice.page)) + ')</span></a>';
        });
        html += '</div>';
      }

      pageContent.innerHTML = html;
      pageContent.classList.remove('page-exit');
      pageContent.classList.add('page-enter');

      pageContent.querySelectorAll('.choice-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          renderPage(link.dataset.page);
        });
      });

      var restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', function(e) {
          e.preventDefault();
          resetAndRestart();
        });
      }

      updateInventoryBar();
      updateHistoryBar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  }

  function renderTitlePage() {
    var coverHtml = STORY.coverIllustration
      ? '<img src="' + sanitizeImageSrc(STORY.coverIllustration) + '" alt="Cover">'
      : '<div style="width:100%;height:200px;display:flex;align-items:center;justify-content:center;color:var(--ink-light);font-style:italic">[ Cover Illustration ]</div>';

    pageContent.innerHTML = '<div class="title-page">'
      + '<div class="series-header">BellForge Presents</div>'
      + '<div class="book-number">Book #' + (STORY.bookNumber || 1) + '</div>'
      + '<h1 class="book-title">' + escapeHTML(STORY.title) + '</h1>'
      + '<div class="subtitle">' + escapeHTML(STORY.subtitle || '') + '</div>'
      + '<div class="illustration-frame"><div class="frame-border">' + coverHtml + '</div></div>'
      + '<div class="warning-box"><h3>Warning!</h3><p>Do not read this book straight through from beginning to end! These pages contain many different adventures you can go on. From time to time as you read along, you will be asked to make a choice. Your choice may lead to success or disaster!</p></div>'
      + '<div class="tagline">You are the hero of this story</div>'
      + '<a class="begin-link" href="#" id="begin-adventure">Turn to page 1 to begin your adventure\\u2026</a>'
      + '</div>';

    document.getElementById('begin-adventure').addEventListener('click', function(e) {
      e.preventDefault();
      renderPage('1');
    });

    updateInventoryBar();
    updateHistoryBar();
  }

  function updateInventoryBar() {
    if (state.inventory.length === 0) {
      inventoryBar.className = 'empty';
      inventoryBar.innerHTML = '';
      return;
    }
    inventoryBar.className = '';
    var html = '<span class="inv-label">Pack:</span><div class="inv-items">';
    state.inventory.forEach(function(item) {
      html += '<span class="inv-item">' + escapeHTML(formatItemName(item)) + '</span>';
    });
    html += '</div>';
    inventoryBar.innerHTML = html;
  }

  function updateHistoryBar() {
    if (!state.currentPage) { historyBar.innerHTML = ''; return; }
    var html = '';
    var recent = state.history.slice(-8);
    recent.forEach(function(p) {
      html += '<span class="hist-page" data-page="' + escapeAttr(p) + '">' + escapeHTML(p) + '</span>';
      html += '<span class="hist-sep">\\u2192</span>';
    });
    html += '<span class="hist-current">' + escapeHTML(state.currentPage) + '</span>';
    historyBar.innerHTML = html;

    historyBar.querySelectorAll('.hist-page').forEach(function(el) {
      el.addEventListener('click', function() {
        var target = el.dataset.page;
        var idx = state.history.lastIndexOf(target);
        if (idx >= 0) {
          state.history = state.history.slice(0, idx);
          state.currentPage = null;
        }
        renderPage(target);
      });
    });
  }

  function resetAndRestart() {
    state.currentPage = null;
    state.history = [];
    state.inventory = [];
    state.flags.clear();
    renderTitlePage();
  }

  // Boot
  renderTitlePage();
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

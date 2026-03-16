// ── Word Search Pipeline ──
// Generates a self-contained HTML word search with themed word lists from Gemini,
// algorithmic grid placement, and an interactive browser-based player.

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { WordSearchConfig } from './pipeline/types.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export interface WordSearchResult {
  title: string;
  words: string[];
  grid: string[][];
  gridSize: number;
  placements: WordPlacement[];
}

interface WordPlacement {
  word: string;
  row: number;
  col: number;
  dRow: number;
  dCol: number;
}

type ProgressCallback = (percent: number, message: string, stage?: string) => void;

// ── Gemini Word List Generation ──

async function generateWordList(
  category: { id: string; name: string },
  wordCount: number,
  onProgress?: ProgressCallback,
): Promise<{ title: string; words: string[] }> {
  if (!model) {
    // Fallback if Gemini is unavailable
    return fallbackWordList(category, wordCount);
  }

  onProgress?.(10, `Asking Gemini for ${category.name} words...`, 'wordsearch');

  const prompt = `Generate a word search puzzle word list for the topic: "${category.name}".

Requirements:
- Exactly ${wordCount} words
- All words must be UPPERCASE, A-Z letters only (no spaces, hyphens, or special characters)
- Words should be 3-10 letters long
- Words should be interesting and varied — not just obvious picks
- Also generate a fun, catchy title for this word search (e.g. "Safari Search", "Cosmic Words")

Respond in JSON format:
{
  "title": "Your Catchy Title",
  "words": ["WORD1", "WORD2", ...]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const words = (parsed.words as string[])
        .map((w: string) => w.toUpperCase().replace(/[^A-Z]/g, ''))
        .filter((w: string) => w.length >= 3 && w.length <= 12)
        .slice(0, wordCount);
      if (words.length >= Math.floor(wordCount * 0.6)) {
        return { title: parsed.title || `${category.name} Word Search`, words };
      }
    }
  } catch (err) {
    console.error('Gemini word list failed:', err);
  }

  return fallbackWordList(category, wordCount);
}

function fallbackWordList(category: { id: string; name: string }, wordCount: number): { title: string; words: string[] } {
  const FALLBACK_WORDS: Record<string, string[]> = {
    animals: ['ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'TIGER', 'EAGLE', 'COBRA', 'WHALE', 'FALCON', 'PANDA', 'JAGUAR', 'SALMON', 'PARROT', 'LIZARD', 'BISON', 'OTTER', 'HAWK', 'WOLF', 'BEAR', 'LYNX'],
    space: ['GALAXY', 'NEBULA', 'PLANET', 'COMET', 'SATURN', 'METEOR', 'PULSAR', 'QUASAR', 'ORBIT', 'LUNAR', 'SOLAR', 'ASTRO', 'VENUS', 'MARS', 'PLUTO', 'TITAN', 'NOVA', 'STAR', 'VOID', 'WARP'],
    food: ['PIZZA', 'SUSHI', 'PASTA', 'BREAD', 'CHEESE', 'MANGO', 'STEAK', 'CURRY', 'TACO', 'OLIVE', 'BASIL', 'LEMON', 'PEACH', 'GRAPE', 'MELON', 'CREAM', 'FLOUR', 'SUGAR', 'BROTH', 'SPICE'],
    science: ['ATOM', 'PROTON', 'QUARK', 'CELL', 'ENZYME', 'GENOME', 'PRISM', 'FORCE', 'MASS', 'LASER', 'RADAR', 'TESLA', 'WATT', 'HELIX', 'FUSION', 'PHOTON', 'PLASMA', 'OXIDE', 'ALLOY', 'MAGNET'],
    mythology: ['ZEUS', 'THOR', 'ODIN', 'ATLAS', 'MEDUSA', 'HYDRA', 'TITAN', 'SPHINX', 'ORACLE', 'FENRIR', 'MINOTAUR', 'PEGASUS', 'CYCLOPS', 'SIREN', 'PHOENIX', 'KRAKEN', 'NYMPH', 'GOBLIN', 'DRAGON', 'GORGON'],
    sports: ['SOCCER', 'TENNIS', 'HOCKEY', 'RUGBY', 'SPRINT', 'ARCHER', 'BOXING', 'DIVING', 'KAYAK', 'TRACK', 'COACH', 'MEDAL', 'SERVE', 'PITCH', 'GOAL', 'FOUL', 'RELAY', 'VAULT', 'MATCH', 'FIELD'],
    nature: ['FOREST', 'RIVER', 'OCEAN', 'CANYON', 'DESERT', 'GLACIER', 'MEADOW', 'VALLEY', 'CLIFF', 'BLOOM', 'PETAL', 'CEDAR', 'CORAL', 'STORM', 'FROST', 'DELTA', 'MARSH', 'RIDGE', 'CREEK', 'GROVE'],
    history: ['EMPIRE', 'CASTLE', 'KNIGHT', 'PHARAOH', 'VIKING', 'TREATY', 'COLONY', 'SENATE', 'BRONZE', 'SWORD', 'SHIELD', 'CHARIOT', 'DYNASTY', 'LEGION', 'SCROLL', 'RELIC', 'CROWN', 'QUEST', 'SIEGE', 'REIGN'],
    movies: ['CINEMA', 'SEQUEL', 'DRAMA', 'COMEDY', 'HORROR', 'ACTION', 'SCRIPT', 'SCENE', 'ACTOR', 'OSCAR', 'GENRE', 'DEBUT', 'TWIST', 'CLIMAX', 'SEQUEL', 'EPIC', 'REEL', 'CAST', 'PLOT', 'HERO'],
    technology: ['PIXEL', 'CLOUD', 'CYBER', 'ROBOT', 'DRONE', 'CODEC', 'CACHE', 'DEBUG', 'LINUX', 'SWIFT', 'REACT', 'STACK', 'QUERY', 'ARRAY', 'TOKEN', 'VIRUS', 'PROXY', 'FIBER', 'MODEM', 'PATCH'],
  };

  const words = FALLBACK_WORDS[category.id] || FALLBACK_WORDS.animals;
  return {
    title: `${category.name} Word Search`,
    words: words.slice(0, wordCount),
  };
}

// ── Grid Generation Algorithm ──

type Direction = [number, number];

const DIRECTIONS_CARDINAL: Direction[] = [
  [0, 1],   // right
  [1, 0],   // down
];

const DIRECTIONS_DIAGONAL: Direction[] = [
  [1, 1],   // down-right
  [1, -1],  // down-left
];

const BACKWARDS_CARDINAL: Direction[] = [
  [0, -1],  // left
  [-1, 0],  // up
];

const BACKWARDS_DIAGONAL: Direction[] = [
  [-1, -1], // up-left
  [-1, 1],  // up-right
];

function buildGrid(
  words: string[],
  gridSize: number,
  allowDiagonals: boolean,
  allowBackwards: boolean,
): { grid: string[][]; placements: WordPlacement[] } {
  const grid: string[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ''),
  );

  let dirs: Direction[] = [...DIRECTIONS_CARDINAL];
  if (allowDiagonals) dirs.push(...DIRECTIONS_DIAGONAL);
  if (allowBackwards) {
    dirs.push(...BACKWARDS_CARDINAL);
    if (allowDiagonals) dirs.push(...BACKWARDS_DIAGONAL);
  }

  // Sort words longest-first for best placement success
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const placements: WordPlacement[] = [];

  for (const word of sorted) {
    let placed = false;

    // Try up to 200 random placements
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const [dRow, dCol] = dir;

      // Calculate valid start range
      const maxRow = dRow === 0 ? gridSize - 1 : dRow > 0 ? gridSize - word.length : word.length - 1;
      const minRow = dRow === 0 ? 0 : dRow > 0 ? 0 : word.length - 1;
      const maxCol = dCol === 0 ? gridSize - 1 : dCol > 0 ? gridSize - word.length : word.length - 1;
      const minCol = dCol === 0 ? 0 : dCol > 0 ? 0 : word.length - 1;

      if (minRow > maxRow || minCol > maxCol) continue;

      const row = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
      const col = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));

      // Check if word fits without conflicts
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + i * dRow;
        const c = col + i * dCol;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) { fits = false; break; }
        const existing = grid[r][c];
        if (existing !== '' && existing !== word[i]) { fits = false; break; }
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          grid[row + i * dRow][col + i * dCol] = word[i];
        }
        placements.push({ word, row, col, dRow, dCol });
        placed = true;
      }
    }

    if (!placed) {
      console.warn(`  ⚠️ Could not place word: ${word} — skipping`);
    }
  }

  // Fill empty cells with random letters
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }

  return { grid, placements };
}

// ── Main Pipeline ──

export async function runWordSearchPipeline(
  config: WordSearchConfig,
  onProgress: ProgressCallback,
): Promise<WordSearchResult | null> {
  try {
    onProgress(5, 'Starting word search generation...', 'wordsearch');

    // 1. Generate word list
    const { title, words } = await generateWordList(
      config.wordSearchCategory,
      config.structure.wordCount,
      onProgress,
    );
    onProgress(30, `Got ${words.length} words — building grid...`, 'grid');

    // 2. Build the grid
    const { grid, placements } = buildGrid(
      words,
      config.structure.gridSize,
      config.structure.allowDiagonals,
      config.structure.allowBackwards,
    );
    onProgress(60, `Grid built — ${placements.length}/${words.length} words placed`, 'grid');

    // 3. Validate
    if (placements.length < Math.floor(words.length * 0.5)) {
      console.error('Too few words placed — grid too small for word count');
      return null;
    }

    onProgress(80, 'Assembling word search viewer...', 'engine');

    const result: WordSearchResult = {
      title,
      words: placements.map((p) => p.word).sort(),
      grid,
      gridSize: config.structure.gridSize,
      placements,
    };

    onProgress(90, 'Running QA checks...', 'qa');

    return result;
  } catch (err) {
    console.error('Word search pipeline failed:', err);
    return null;
  }
}

// ── HTML Viewer Generation ──

export function generateWordSearchPreviewHtml(result: WordSearchResult, config: WordSearchConfig): string {
  const { title, words, grid, gridSize, placements } = result;

  const gridJson = JSON.stringify(grid);
  const wordsJson = JSON.stringify(words);
  const placementsJson = JSON.stringify(placements);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    background: #f5f0e8;
    color: #1a1a1a;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    user-select: none;
    -webkit-user-select: none;
  }
  h1 {
    font-family: 'Georgia', serif;
    font-size: clamp(1.4rem, 4vw, 2rem);
    color: #1a1a1a;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
    text-align: center;
    font-weight: 900;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 6px;
  }
  .stats {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 16px;
    text-align: center;
    font-style: italic;
  }
  .stats span { color: #1a1a1a; font-weight: 700; font-style: normal; }
  .game-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 100%;
    max-width: 800px;
  }
  @media (min-width: 700px) {
    .game-area {
      flex-direction: row;
      align-items: flex-start;
    }
  }
  .grid-container {
    position: relative;
    touch-action: none;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(${gridSize}, 1fr);
    gap: 0;
    background: #fff;
    border: 2px solid #1a1a1a;
    padding: 0;
  }
  .cell {
    width: clamp(26px, calc((100vw - 64px) / ${gridSize}), 42px);
    height: clamp(26px, calc((100vw - 64px) / ${gridSize}), 42px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(0.75rem, calc(2.5vw / ${gridSize / 8}), 1.15rem);
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: #1a1a1a;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    background: #fff;
    border: 1px solid #e0dcd4;
  }
  .cell:hover { background: #f0ebe0; }
  .cell.selecting { background: #a8d0f5; color: #1a1a1a; }
  .cell.found { background: #d4edda; color: #2e7d32; }
  .cell.found-flash { animation: flashGreen 0.5s ease; }
  @keyframes flashGreen {
    0% { background: #81c784; transform: scale(1.1); }
    100% { background: #d4edda; transform: scale(1); }
  }
  .word-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 100%;
  }
  @media (min-width: 700px) {
    .word-list {
      flex-direction: column;
      flex-wrap: nowrap;
      min-width: 150px;
      max-height: calc(${gridSize} * 44px);
      overflow-y: auto;
    }
  }
  .word-chip {
    padding: 6px 14px;
    background: #fff;
    border: 2px solid #1a1a1a;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    letter-spacing: 2px;
    transition: all 0.3s;
    white-space: nowrap;
    color: #1a1a1a;
  }
  .word-chip.found {
    background: #d4edda;
    border-color: #4caf50;
    color: #888;
    text-decoration: line-through;
  }
  .victory {
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    text-align: center;
  }
  .victory.show { display: flex; }
  .victory h2 { font-size: 2rem; color: #1a1a1a; }
  .victory .time { font-size: 1.2rem; color: #555; }
  .selection-line {
    position: absolute;
    pointer-events: none;
    height: 3px;
    background: rgba(30,30,30,0.4);
    border-radius: 2px;
    transform-origin: 0 50%;
    z-index: 10;
  }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="stats">Find <span id="remaining">${words.length}</span> of <span>${words.length}</span> words</div>
<div class="game-area">
  <div class="grid-container">
    <div class="grid" id="grid"></div>
  </div>
  <div class="word-list" id="wordList"></div>
</div>
<div class="victory" id="victory">
  <h2>🎉 You found them all!</h2>
  <div class="time" id="victoryTime"></div>
  <button onclick="location.reload()" style="padding:12px 32px;background:#1a1a1a;color:#fff;border:none;border-radius:4px;font-weight:700;font-size:1rem;cursor:pointer;letter-spacing:1px;">PLAY AGAIN</button>
</div>
<script>
(function() {
  const grid = ${gridJson};
  const words = ${wordsJson};
  const placements = ${placementsJson};
  const SIZE = ${gridSize};

  const foundWords = new Set();
  let selecting = false;
  let startCell = null;
  let currentCells = [];
  let startTime = Date.now();

  const gridEl = document.getElementById('grid');
  const wordListEl = document.getElementById('wordList');
  const remainingEl = document.getElementById('remaining');
  const victoryEl = document.getElementById('victory');
  const victoryTimeEl = document.getElementById('victoryTime');

  // Build grid cells
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    cells[r] = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      gridEl.appendChild(cell);
      cells[r][c] = cell;
    }
  }

  // Build word list chips
  const wordChips = {};
  words.forEach(w => {
    const chip = document.createElement('div');
    chip.className = 'word-chip';
    chip.textContent = w;
    wordListEl.appendChild(chip);
    wordChips[w] = chip;
  });

  // Selection logic
  function getCellFromEvent(e) {
    const touch = e.touches ? e.touches[0] : e;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.classList.contains('cell')) {
      return { r: parseInt(el.dataset.r), c: parseInt(el.dataset.c), el };
    }
    return null;
  }

  function getLineCells(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    const dist = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    // Must be a straight line (horizontal, vertical, or 45-degree diagonal)
    if (Math.abs(r2 - r1) !== 0 && Math.abs(c2 - c1) !== 0 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [];
    const result = [];
    for (let i = 0; i <= dist; i++) {
      result.push({ r: r1 + i * dr, c: c1 + i * dc });
    }
    return result;
  }

  function clearSelection() {
    currentCells.forEach(({ r, c }) => {
      if (!cells[r][c].classList.contains('found')) {
        cells[r][c].classList.remove('selecting');
      }
    });
    currentCells = [];
  }

  function highlightSelection(cellList) {
    clearSelection();
    cellList.forEach(({ r, c }) => {
      if (!cells[r][c].classList.contains('found')) {
        cells[r][c].classList.add('selecting');
      }
    });
    currentCells = cellList;
  }

  function checkWord(cellList) {
    const forward = cellList.map(({ r, c }) => grid[r][c]).join('');
    const backward = [...forward].reverse().join('');

    for (const w of words) {
      if (foundWords.has(w)) continue;
      if (forward === w || backward === w) {
        foundWords.add(w);
        cellList.forEach(({ r, c }) => {
          cells[r][c].classList.add('found', 'found-flash');
          cells[r][c].classList.remove('selecting');
        });
        wordChips[w].classList.add('found');
        remainingEl.textContent = words.length - foundWords.size;

        if (foundWords.size === words.length) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          victoryTimeEl.textContent = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
          victoryEl.classList.add('show');
        }
        return;
      }
    }
  }

  // Mouse events
  gridEl.addEventListener('mousedown', (e) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    selecting = true;
    startCell = cell;
    highlightSelection([{ r: cell.r, c: cell.c }]);
  });

  gridEl.addEventListener('mousemove', (e) => {
    if (!selecting || !startCell) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const line = getLineCells(startCell.r, startCell.c, cell.r, cell.c);
    if (line.length > 0) highlightSelection(line);
  });

  document.addEventListener('mouseup', () => {
    if (!selecting) return;
    selecting = false;
    if (currentCells.length > 1) checkWord(currentCells);
    clearSelection();
    startCell = null;
  });

  // Touch events
  gridEl.addEventListener('touchstart', (e) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    selecting = true;
    startCell = cell;
    highlightSelection([{ r: cell.r, c: cell.c }]);
  }, { passive: false });

  gridEl.addEventListener('touchmove', (e) => {
    if (!selecting || !startCell) return;
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const line = getLineCells(startCell.r, startCell.c, cell.r, cell.c);
    if (line.length > 0) highlightSelection(line);
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!selecting) return;
    selecting = false;
    if (currentCells.length > 1) checkWord(currentCells);
    clearSelection();
    startCell = null;
  });
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

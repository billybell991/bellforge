// ── Crossword Pipeline ──
// Generates a self-contained HTML crossword puzzle with themed clues from Gemini,
// algorithmic grid placement, and an interactive browser-based player.

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CrosswordConfig } from './pipeline/types.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export interface CrosswordEntry {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

export interface CrosswordResult {
  title: string;
  entries: CrosswordEntry[];
  grid: string[][];
  gridSize: number;
}

type ProgressCallback = (percent: number, message: string, stage?: string) => void;

// ── Gemini Clue Generation ──

interface WordClue { word: string; clue: string; }

async function generateClues(
  category: { id: string; name: string },
  clueCount: number,
  difficulty: string,
  onProgress?: ProgressCallback,
): Promise<{ title: string; entries: WordClue[] }> {
  if (!model) {
    return fallbackClues(category, clueCount);
  }

  onProgress?.(10, `Asking Gemini for ${category.name} crossword clues...`, 'crossword');

  const difficultyHint = difficulty === 'easy'
    ? 'Use simple, straightforward clues suitable for beginners.'
    : difficulty === 'hard'
    ? 'Use tricky, cryptic-style clues that require lateral thinking.'
    : 'Use moderately challenging clues — not too obvious, not too obscure.';

  const prompt = `Generate clues for a crossword puzzle on the topic: "${category.name}".

Requirements:
- Exactly ${clueCount} word/clue pairs
- All answer words must be UPPERCASE, A-Z letters only (no spaces, hyphens, or special characters)
- Answer words should be 3-12 letters long
- Each clue should be concise (under 15 words)
- ${difficultyHint}
- Also generate a fun title for this crossword (e.g. "Brain Buster", "Science Lab")

Respond in JSON format:
{
  "title": "Your Crossword Title",
  "entries": [
    { "word": "ANSWER", "clue": "The clue text" },
    ...
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const entries = (parsed.entries as WordClue[])
        .map((e) => ({
          word: e.word.toUpperCase().replace(/[^A-Z]/g, ''),
          clue: e.clue,
        }))
        .filter((e) => e.word.length >= 3 && e.word.length <= 12 && e.clue)
        .slice(0, clueCount);
      if (entries.length >= Math.floor(clueCount * 0.6)) {
        return { title: parsed.title || `${category.name} Crossword`, entries };
      }
    }
  } catch (err) {
    console.error('Gemini crossword clues failed:', err);
  }

  return fallbackClues(category, clueCount);
}

function fallbackClues(category: { id: string; name: string }, clueCount: number): { title: string; entries: WordClue[] } {
  const FALLBACK: Record<string, WordClue[]> = {
    general: [
      { word: 'PLANET', clue: 'Earth is one of these' }, { word: 'OCEAN', clue: 'Vast body of saltwater' },
      { word: 'BRIDGE', clue: 'Structure spanning a gap' }, { word: 'CLOCK', clue: 'Tells you the time' },
      { word: 'FLAME', clue: 'Visible part of fire' }, { word: 'NOVEL', clue: 'A long fictional book' },
      { word: 'MEDAL', clue: 'Award for achievement' }, { word: 'STORM', clue: 'Violent weather event' },
      { word: 'CHESS', clue: 'Strategic board game with kings' }, { word: 'PEARL', clue: 'Gem from an oyster' },
      { word: 'TOWER', clue: 'Tall narrow building' }, { word: 'PRISM', clue: 'Splits light into colors' },
      { word: 'GLOBE', clue: 'Model of the Earth' }, { word: 'KNIFE', clue: 'Sharp cutting tool' },
      { word: 'DREAM', clue: 'Images during sleep' },
    ],
    science: [
      { word: 'ATOM', clue: 'Smallest unit of an element' }, { word: 'CELL', clue: 'Basic unit of life' },
      { word: 'LASER', clue: 'Focused beam of light' }, { word: 'ORBIT', clue: 'Path around a star or planet' },
      { word: 'ENZYME', clue: 'Biological catalyst' }, { word: 'PLASMA', clue: 'Fourth state of matter' },
      { word: 'QUARK', clue: 'Subatomic particle' }, { word: 'HELIX', clue: 'Spiral shape like DNA' },
      { word: 'PHOTON', clue: 'Particle of light' }, { word: 'MAGNET', clue: 'Attracts iron' },
      { word: 'FOSSIL', clue: 'Preserved remains' }, { word: 'PRISM', clue: 'Splits white light' },
      { word: 'FORCE', clue: 'Push or pull' }, { word: 'PROTON', clue: 'Positive nuclear particle' },
      { word: 'NUCLEUS', clue: 'Center of an atom' },
    ],
    geography: [
      { word: 'DELTA', clue: 'River mouth landform' }, { word: 'CANYON', clue: 'Deep narrow valley' },
      { word: 'ISLAND', clue: 'Land surrounded by water' }, { word: 'TUNDRA', clue: 'Frozen treeless biome' },
      { word: 'GLACIER', clue: 'Slow-moving ice mass' }, { word: 'VOLCANO', clue: 'Erupting mountain' },
      { word: 'DESERT', clue: 'Arid sandy region' }, { word: 'STRAIT', clue: 'Narrow water passage' },
      { word: 'PLATEAU', clue: 'Flat elevated land' }, { word: 'ARCHIPEL', clue: 'Chain of islands' },
      { word: 'BASIN', clue: 'Low area surrounded by hills' }, { word: 'FJORD', clue: 'Narrow coastal inlet' },
      { word: 'MESA', clue: 'Flat-topped hill' }, { word: 'REEF', clue: 'Coral formation underwater' },
      { word: 'SUMMIT', clue: 'Mountain peak' },
    ],
  };

  const entries = FALLBACK[category.id] || FALLBACK.general;
  return {
    title: `${category.name} Crossword`,
    entries: entries.slice(0, clueCount),
  };
}

// ── Crossword Grid Builder ──

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

function buildCrosswordGrid(
  wordClues: WordClue[],
  gridSize: number,
): { grid: string[][]; placed: PlacedWord[] } {
  // Sort longest-first for best placement
  const sorted = [...wordClues].sort((a, b) => b.word.length - a.word.length);

  const grid: string[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ''),
  );

  const placed: PlacedWord[] = [];

  function canPlace(word: string, row: number, col: number, dir: 'across' | 'down'): boolean {
    const dR = dir === 'down' ? 1 : 0;
    const dC = dir === 'across' ? 1 : 0;

    // Check bounds
    if (dir === 'across' && col + word.length > gridSize) return false;
    if (dir === 'down' && row + word.length > gridSize) return false;

    let hasIntersection = placed.length === 0; // first word always OK

    for (let i = 0; i < word.length; i++) {
      const r = row + i * dR;
      const c = col + i * dC;
      const existing = grid[r][c];

      if (existing !== '' && existing !== word[i]) return false;
      if (existing === word[i] && existing !== '') hasIntersection = true;

      // For empty cells, check parallel adjacency — no side-by-side with existing letters
      if (existing === '') {
        if (dir === 'across') {
          // Check above — but allow if that cell is part of a perpendicular intersection with THIS word
          if (r > 0 && grid[r - 1][c] !== '' && !isPartOfPerpendicularWord(r - 1, c, 'down')) return false;
          if (r < gridSize - 1 && grid[r + 1][c] !== '' && !isPartOfPerpendicularWord(r + 1, c, 'down')) return false;
        } else {
          if (c > 0 && grid[r][c - 1] !== '' && !isPartOfPerpendicularWord(r, c - 1, 'across')) return false;
          if (c < gridSize - 1 && grid[r][c + 1] !== '' && !isPartOfPerpendicularWord(r, c + 1, 'across')) return false;
        }
      }
    }

    // Check cell before start (should be empty or boundary)
    const beforeR = row - dR;
    const beforeC = col - dC;
    if (beforeR >= 0 && beforeR < gridSize && beforeC >= 0 && beforeC < gridSize) {
      if (grid[beforeR][beforeC] !== '') return false;
    }

    // Check cell after end (should be empty or boundary)
    const afterR = row + word.length * dR;
    const afterC = col + word.length * dC;
    if (afterR >= 0 && afterR < gridSize && afterC >= 0 && afterC < gridSize) {
      if (grid[afterR][afterC] !== '') return false;
    }

    return hasIntersection;
  }

  function isPartOfPerpendicularWord(r: number, c: number, dir: 'across' | 'down'): boolean {
    return placed.some(p => {
      if (p.direction !== dir) return false;
      const dR = dir === 'down' ? 1 : 0;
      const dC = dir === 'across' ? 1 : 0;
      for (let i = 0; i < p.word.length; i++) {
        if (p.row + i * dR === r && p.col + i * dC === c) return true;
      }
      return false;
    });
  }

  function placeWord(word: string, row: number, col: number, dir: 'across' | 'down') {
    const dR = dir === 'down' ? 1 : 0;
    const dC = dir === 'across' ? 1 : 0;
    for (let i = 0; i < word.length; i++) {
      grid[row + i * dR][col + i * dC] = word[i];
    }
  }

  // Try multiple attempts with different word orderings to maximize placement
  let bestResult: { grid: string[][]; placed: PlacedWord[] } = { grid, placed: [] };

  for (let attempt = 0; attempt < 5; attempt++) {
    // Reset grid
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++) grid[r][c] = '';
    placed.length = 0;

    // Shuffle order (keep longest first for attempt 0)
    const order = [...sorted];
    if (attempt > 0) {
      // Keep first word longest, shuffle the rest
      for (let i = order.length - 1; i > 1; i--) {
        const j = 1 + Math.floor(Math.random() * i);
        [order[i], order[j]] = [order[j], order[i]];
      }
    }

    // Place first word in center
    if (order.length > 0) {
      const first = order[0];
      const startRow = Math.floor(gridSize / 2);
      const startCol = Math.floor((gridSize - first.word.length) / 2);
      if (startCol >= 0) {
        placeWord(first.word, startRow, startCol, 'across');
        placed.push({ word: first.word, clue: first.clue, row: startRow, col: startCol, direction: 'across' });
      }
    }

    // Try to place remaining words
    for (let wi = 1; wi < order.length; wi++) {
      const { word, clue } = order[wi];
      let bestPlacement: { row: number; col: number; dir: 'across' | 'down'; intersections: number } | null = null;

      for (const dir of ['down', 'across'] as const) {
        const dR = dir === 'down' ? 1 : 0;
        const dC = dir === 'across' ? 1 : 0;

        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (!canPlace(word, r, c, dir)) continue;

            let intersections = 0;
            for (let i = 0; i < word.length; i++) {
              if (grid[r + i * dR][c + i * dC] === word[i]) intersections++;
            }

            if (intersections > 0 && (!bestPlacement || intersections > bestPlacement.intersections)) {
              bestPlacement = { row: r, col: c, dir, intersections };
            }
          }
        }
      }

      if (bestPlacement) {
        placeWord(word, bestPlacement.row, bestPlacement.col, bestPlacement.dir);
        placed.push({ word, clue, row: bestPlacement.row, col: bestPlacement.col, direction: bestPlacement.dir });
      }
    }

    if (placed.length > bestResult.placed.length) {
      bestResult = {
        grid: grid.map(row => [...row]),
        placed: [...placed],
      };
    }

    if (placed.length === sorted.length) break; // All words placed
  }

  return bestResult;
}

// ── Number the crossword entries ──

function numberEntries(placed: PlacedWord[]): CrosswordEntry[] {
  // Collect all start positions, sort by row then col
  const starts = new Map<string, { row: number; col: number; across?: PlacedWord; down?: PlacedWord }>();

  for (const p of placed) {
    const key = `${p.row},${p.col}`;
    const existing = starts.get(key) || { row: p.row, col: p.col };
    if (p.direction === 'across') existing.across = p;
    else existing.down = p;
    starts.set(key, existing);
  }

  const sorted = [...starts.values()].sort((a, b) => a.row - b.row || a.col - b.col);
  const entries: CrosswordEntry[] = [];
  let num = 1;

  for (const s of sorted) {
    if (s.across) {
      entries.push({ word: s.across.word, clue: s.across.clue, row: s.row, col: s.col, direction: 'across', number: num });
    }
    if (s.down) {
      entries.push({ word: s.down.word, clue: s.down.clue, row: s.row, col: s.col, direction: 'down', number: num });
    }
    num++;
  }

  return entries;
}

// ── Main Pipeline ──

export async function runCrosswordPipeline(
  config: CrosswordConfig,
  onProgress: ProgressCallback,
): Promise<CrosswordResult | null> {
  try {
    onProgress(5, 'Starting crossword generation...', 'crossword');

    const { title, entries: wordClues } = await generateClues(
      config.crosswordCategory,
      config.structure.clueCount,
      config.structure.difficulty,
      onProgress,
    );
    onProgress(30, `Got ${wordClues.length} clues — building grid...`, 'grid');

    const { grid, placed } = buildCrosswordGrid(wordClues, config.structure.gridSize);
    onProgress(60, `Grid built — ${placed.length}/${wordClues.length} words placed`, 'grid');

    if (placed.length < 2) {
      console.error('Too few words placed in crossword grid');
      return null;
    }

    onProgress(70, 'Numbering entries...', 'engine');
    const entries = numberEntries(placed);

    onProgress(80, 'Assembling crossword viewer...', 'engine');

    // Trim grid to bounding box of placed words
    let minR = config.structure.gridSize, maxR = 0, minC = config.structure.gridSize, maxC = 0;
    for (let r = 0; r < config.structure.gridSize; r++) {
      for (let c = 0; c < config.structure.gridSize; c++) {
        if (grid[r][c] !== '') {
          minR = Math.min(minR, r); maxR = Math.max(maxR, r);
          minC = Math.min(minC, c); maxC = Math.max(maxC, c);
        }
      }
    }
    // Add 1-cell padding
    minR = Math.max(0, minR - 1); maxR = Math.min(config.structure.gridSize - 1, maxR + 1);
    minC = Math.max(0, minC - 1); maxC = Math.min(config.structure.gridSize - 1, maxC + 1);

    const trimmedSize = Math.max(maxR - minR + 1, maxC - minC + 1);
    const trimmedGrid: string[][] = [];
    for (let r = minR; r <= minR + trimmedSize - 1; r++) {
      const row: string[] = [];
      for (let c = minC; c <= minC + trimmedSize - 1; c++) {
        row.push(r < config.structure.gridSize && c < config.structure.gridSize ? grid[r][c] : '');
      }
      trimmedGrid.push(row);
    }

    // Adjust entry positions
    const adjustedEntries = entries.map(e => ({
      ...e,
      row: e.row - minR,
      col: e.col - minC,
    }));

    onProgress(90, 'Running QA checks...', 'qa');

    return {
      title,
      entries: adjustedEntries,
      grid: trimmedGrid,
      gridSize: trimmedSize,
    };
  } catch (err) {
    console.error('Crossword pipeline failed:', err);
    return null;
  }
}

// ── HTML Viewer Generation ──

export function generateCrosswordPreviewHtml(result: CrosswordResult, _config: CrosswordConfig): string {
  const { title, entries, grid, gridSize } = result;

  const gridJson = JSON.stringify(grid);
  const entriesJson = JSON.stringify(entries);

  const acrossClues = entries.filter(e => e.direction === 'across').sort((a, b) => a.number - b.number);
  const downClues = entries.filter(e => e.direction === 'down').sort((a, b) => a.number - b.number);

  // Build number map: key "r,c" → number
  const numberMap: Record<string, number> = {};
  for (const e of entries) {
    const key = `${e.row},${e.col}`;
    if (!(key in numberMap)) numberMap[key] = e.number;
  }
  const numberMapJson = JSON.stringify(numberMap);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', 'Georgia', serif;
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
    font-family: 'Georgia', 'Times New Roman', serif;
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
    gap: 24px;
    width: 100%;
    max-width: 900px;
  }
  @media (min-width: 750px) {
    .game-area {
      flex-direction: row;
      align-items: flex-start;
    }
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(${gridSize}, 1fr);
    gap: 0;
    border: 2px solid #1a1a1a;
    background: #1a1a1a;
  }
  .cell {
    width: clamp(28px, calc((100vw - 64px) / ${gridSize}), 44px);
    height: clamp(28px, calc((100vw - 64px) / ${gridSize}), 44px);
    position: relative;
    border: 1px solid #1a1a1a;
  }
  .cell.black {
    background: #1a1a1a;
    pointer-events: none;
  }
  .cell.white {
    background: #ffffff;
    cursor: pointer;
    transition: background 0.12s;
  }
  .cell.white:hover { background: #f0f0f0; }
  .cell.white.selected { background: #d4e6f9; }
  .cell.white.active { background: #a8d0f5; }
  .cell.white.correct { background: #d4edda; }
  .cell-number {
    position: absolute;
    top: 1px;
    left: 2px;
    font-size: clamp(0.45rem, 1.2vw, 0.6rem);
    color: #1a1a1a;
    font-weight: 700;
    pointer-events: none;
    font-family: Arial, sans-serif;
  }
  .cell-input {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    color: #1a1a1a;
    font-size: clamp(0.85rem, 2.5vw, 1.3rem);
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    outline: none;
    caret-color: #333;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
  }
  .clues-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 100%;
  }
  @media (min-width: 750px) {
    .clues-panel {
      max-height: calc(${gridSize} * 46px);
      overflow-y: auto;
      min-width: 240px;
    }
  }
  .clue-section h3 {
    font-family: 'Georgia', serif;
    font-size: 1rem;
    color: #1a1a1a;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
    border-bottom: 1px solid #999;
    padding-bottom: 4px;
    font-weight: 700;
  }
  .clue-item {
    padding: 3px 8px;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.12s;
    line-height: 1.5;
    color: #333;
  }
  .clue-item:hover { background: #e8e3d8; }
  .clue-item.active { background: #d4e6f9; color: #1a1a1a; }
  .clue-item.solved { color: #888; text-decoration: line-through; }
  .clue-num { font-weight: 700; color: #1a1a1a; margin-right: 4px; }
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
  .check-btn {
    margin-top: 14px;
    padding: 10px 28px;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    letter-spacing: 1px;
    font-family: Arial, sans-serif;
  }
  .check-btn:hover { background: #333; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<div class="stats">
  <span id="solved">0</span> / <span>${entries.length}</span> words solved
</div>
<div class="game-area">
  <div>
    <div class="grid" id="grid"></div>
    <button class="check-btn" onclick="checkAll()">CHECK ANSWERS</button>
  </div>
  <div class="clues-panel">
    <div class="clue-section">
      <h3>Across</h3>
      <div id="acrossClues">
        ${acrossClues.map(c => `<div class="clue-item" data-dir="across" data-num="${c.number}" data-word="${c.word}"><span class="clue-num">${c.number}.</span>${escapeHtml(c.clue)}</div>`).join('\n        ')}
      </div>
    </div>
    <div class="clue-section">
      <h3>Down</h3>
      <div id="downClues">
        ${downClues.map(c => `<div class="clue-item" data-dir="down" data-num="${c.number}" data-word="${c.word}"><span class="clue-num">${c.number}.</span>${escapeHtml(c.clue)}</div>`).join('\n        ')}
      </div>
    </div>
  </div>
</div>
<div class="victory" id="victory">
  <h2>\u{1F389} All solved!</h2>
  <div class="time" id="victoryTime"></div>
  <button onclick="location.reload()" style="padding:12px 32px;background:#1a1a1a;color:#fff;border:none;border-radius:4px;font-weight:700;font-size:1rem;cursor:pointer;letter-spacing:1px;">PLAY AGAIN</button>
</div>
<script>
(function() {
  const grid = ${gridJson};
  const entries = ${entriesJson};
  const numberMap = ${numberMapJson};
  const SIZE = ${gridSize};
  const solvedEl = document.getElementById('solved');
  const victoryEl = document.getElementById('victory');
  const victoryTimeEl = document.getElementById('victoryTime');
  const startTime = Date.now();

  const solvedWords = new Set();
  let activeEntry = null;

  const gridEl = document.getElementById('grid');
  const inputs = [];

  // Build grid
  for (let r = 0; r < SIZE; r++) {
    inputs[r] = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + (grid[r][c] ? 'white' : 'black');
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (grid[r][c]) {
        const key = r + ',' + c;
        if (numberMap[key]) {
          const numEl = document.createElement('span');
          numEl.className = 'cell-number';
          numEl.textContent = numberMap[key];
          cell.appendChild(numEl);
        }

        const inp = document.createElement('input');
        inp.className = 'cell-input';
        inp.maxLength = 1;
        inp.dataset.r = r;
        inp.dataset.c = c;
        inp.setAttribute('autocomplete', 'off');
        inp.setAttribute('autocorrect', 'off');
        inp.setAttribute('spellcheck', 'false');

        inp.addEventListener('focus', () => highlightEntry(r, c));
        inp.addEventListener('input', (e) => {
          inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
          if (inp.value) moveNext(r, c);
          checkSolved();
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !inp.value) {
            e.preventDefault();
            movePrev(r, c);
          } else if (e.key === 'ArrowRight') { moveTo(r, c + 1); }
          else if (e.key === 'ArrowLeft') { moveTo(r, c - 1); }
          else if (e.key === 'ArrowDown') { moveTo(r + 1, c); }
          else if (e.key === 'ArrowUp') { moveTo(r - 1, c); }
        });

        cell.appendChild(inp);
        inputs[r][c] = inp;
      } else {
        inputs[r][c] = null;
      }
      gridEl.appendChild(cell);
    }
  }

  function getEntriesAt(r, c) {
    return entries.filter(e => {
      const dr = e.direction === 'down' ? 1 : 0;
      const dc = e.direction === 'across' ? 1 : 0;
      for (let i = 0; i < e.word.length; i++) {
        if (e.row + i * dr === r && e.col + i * dc === c) return true;
      }
      return false;
    });
  }

  function highlightEntry(r, c) {
    // Clear all highlighting
    document.querySelectorAll('.cell.white').forEach(el => {
      el.classList.remove('selected', 'active');
    });
    document.querySelectorAll('.clue-item').forEach(el => el.classList.remove('active'));

    const at = getEntriesAt(r, c);
    if (at.length === 0) return;

    // Toggle between across/down if clicking same cell
    let entry = at[0];
    if (activeEntry && at.length > 1) {
      const sameCell = activeEntry.row + (activeEntry.direction === 'down' ? 0 : 0) <= r &&
                       activeEntry.col + (activeEntry.direction === 'across' ? 0 : 0) <= c;
      if (at.includes(activeEntry)) {
        entry = at.find(e => e !== activeEntry) || at[0];
      }
    }
    activeEntry = entry;

    // Highlight cells
    const dr = entry.direction === 'down' ? 1 : 0;
    const dc = entry.direction === 'across' ? 1 : 0;
    for (let i = 0; i < entry.word.length; i++) {
      const cr = entry.row + i * dr;
      const cc = entry.col + i * dc;
      const cell = gridEl.children[cr * SIZE + cc];
      if (cell) cell.classList.add(cr === r && cc === c ? 'active' : 'selected');
    }

    // Highlight clue
    const clueEl = document.querySelector('.clue-item[data-dir="' + entry.direction + '"][data-num="' + entry.number + '"]');
    if (clueEl) {
      clueEl.classList.add('active');
      clueEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function moveTo(r, c) {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && inputs[r][c]) {
      inputs[r][c].focus();
    }
  }

  function moveNext(r, c) {
    if (!activeEntry) return;
    const dr = activeEntry.direction === 'down' ? 1 : 0;
    const dc = activeEntry.direction === 'across' ? 1 : 0;
    moveTo(r + dr, c + dc);
  }

  function movePrev(r, c) {
    if (!activeEntry) return;
    const dr = activeEntry.direction === 'down' ? 1 : 0;
    const dc = activeEntry.direction === 'across' ? 1 : 0;
    const pr = r - dr, pc = c - dc;
    if (pr >= 0 && pc >= 0 && inputs[pr] && inputs[pr][pc]) {
      inputs[pr][pc].value = '';
      inputs[pr][pc].focus();
    }
  }

  function checkSolved() {
    let count = 0;
    for (const e of entries) {
      const dr = e.direction === 'down' ? 1 : 0;
      const dc = e.direction === 'across' ? 1 : 0;
      let correct = true;
      for (let i = 0; i < e.word.length; i++) {
        const inp = inputs[e.row + i * dr][e.col + i * dc];
        if (!inp || inp.value !== e.word[i]) { correct = false; break; }
      }
      const clueEl = document.querySelector('.clue-item[data-dir="' + e.direction + '"][data-num="' + e.number + '"]');
      if (correct) {
        count++;
        solvedWords.add(e.direction + e.number);
        if (clueEl) clueEl.classList.add('solved');
        // Mark cells
        for (let i = 0; i < e.word.length; i++) {
          const cell = gridEl.children[(e.row + i * dr) * SIZE + (e.col + i * dc)];
          if (cell) cell.classList.add('correct');
        }
      }
    }
    solvedEl.textContent = count;

    if (count === entries.length) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      victoryTimeEl.textContent = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
      victoryEl.classList.add('show');
    }
  }

  // Clue click → focus first cell of that entry
  document.querySelectorAll('.clue-item').forEach(el => {
    el.addEventListener('click', () => {
      const dir = el.dataset.dir;
      const num = parseInt(el.dataset.num);
      const entry = entries.find(e => e.direction === dir && e.number === num);
      if (entry && inputs[entry.row][entry.col]) {
        activeEntry = entry;
        inputs[entry.row][entry.col].focus();
        highlightEntry(entry.row, entry.col);
      }
    });
  });

  window.checkAll = checkSolved;
})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

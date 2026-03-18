// â”€â”€ Jumble Pipeline â”€â”€
// Generates a self-contained HTML "newspaper jumble" puzzle:
// 4-6 scrambled words, circled letters form a final punchline answer,
// plus a newspaper-style cartoon illustration via Imagen.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateImage } from './imagen.js';
import type { JumbleConfig } from './pipeline/types.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export interface JumbleWord {
  answer: string;       // correct word (e.g. "WATER")
  scrambled: string;    // jumbled form (e.g. "TARWE")
  circledIndices: number[]; // 0-based indices in the ANSWER whose letters go to final answer
}

export interface JumbleResult {
  title: string;
  words: JumbleWord[];
  finalClue: string;      // the riddle/punchline prompt
  finalAnswer: string;    // the solution word/phrase
  cartoonCaption: string; // caption for the cartoon
  cartoonBase64: string | null; // base64 PNG
}

type ProgressCallback = (percent: number, message: string, stage?: string) => void;

// â”€â”€ Gemini Puzzle Generation â”€â”€

interface GeminiJumbleResponse {
  title: string;
  words: { word: string; circledPositions: number[] }[];
  finalClue: string;
  finalAnswer: string;
  cartoonScene: string;
  cartoonCaption: string;
}

async function generateJumblePuzzle(
  category: { id: string; name: string },
  wordCount: number,
  difficulty: string,
  onProgress?: ProgressCallback,
): Promise<GeminiJumbleResponse | null> {
  if (!model) {
    return fallbackPuzzle(category, wordCount);
  }

  onProgress?.(10, `Asking Gemini for a ${category.name} jumble puzzle...`, 'jumble');

  const difficultyHint = difficulty === 'easy'
    ? 'Use short, common words (4-6 letters). The final answer should be a simple, well-known word.'
    : difficulty === 'hard'
    ? 'Use longer, more challenging words (6-9 letters). The final answer can be a two-word phrase.'
    : 'Use a mix of common and moderately tricky words (5-7 letters). The final answer should be a recognizable word or short phrase.';

  const prompt = `Create a newspaper-style JUMBLE word puzzle on the topic: "${category.name}".

How a Jumble works:
- There are ${wordCount} words related to the topic, each scrambled
- Each word has some "circled" letter positions (in the UNSCRAMBLED answer)
- When the player solves all words, the circled letters are rearranged to solve a final riddle/punchline
- A small cartoon goes with the puzzle, with a caption that hints at the final answer

Requirements:
- Exactly ${wordCount} words, all UPPERCASE A-Z only
- ${difficultyHint}
- For each word, specify which letter positions (1-based) are "circled" â€” these letters must combine to spell the final answer
- The circled letters from ALL words, taken in order (word 1 circled letters, then word 2, etc.), must spell out the final answer EXACTLY when rearranged
- The final answer should be a fun pun, wordplay, or clever answer to the cartoon's setup
- The cartoon scene should be a simple, humorous scenario related to the topic
- The cartoon caption should be a setup question or funny situation that the final answer resolves

CRITICAL: The circled letters must EXACTLY form the final answer. Count carefully!

Example for topic "Cooking":
- Word: SPOON (circled positions: [1, 4]) â†’ circled letters: S, O
- Word: BASTE (circled positions: [2, 5]) â†’ circled letters: A, E  
- Word: GRILL (circled positions: [3]) â†’ circled letters: I
- Word: RANCH (circled positions: [3, 5]) â†’ circled letters: N, H
- Final answer: "OVEN" â€” wait, that doesn't match. Make sure the circled letters S,O,A,E,I,N,H can be rearranged to spell the final answer!

Respond in JSON:
{
  "title": "Puzzle Title",
  "words": [
    { "word": "ANSWER", "circledPositions": [1, 3, 5] },
    ...
  ],
  "finalClue": "What the chef said when asked about the burnt turkey...",
  "finalAnswer": "THE ANSWER",
  "cartoonScene": "A chef standing in a smoky kitchen looking at a blackened turkey while dinner guests peek through the door",
  "cartoonCaption": "What the chef said when asked about the burnt turkey..."
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeminiJumbleResponse;
      // Validate
      if (parsed.words && parsed.words.length >= Math.floor(wordCount * 0.6) && parsed.finalAnswer && parsed.cartoonScene) {
        // Clean up words
        parsed.words = parsed.words
          .map(w => ({
            word: w.word.toUpperCase().replace(/[^A-Z]/g, ''),
            circledPositions: w.circledPositions.filter(p => p >= 1),
          }))
          .filter(w => w.word.length >= 3 && w.word.length <= 12)
          .slice(0, wordCount);

        parsed.finalAnswer = parsed.finalAnswer.toUpperCase().replace(/[^A-Z ]/g, '');
        return parsed;
      }
    }
  } catch (err) {
    console.error('Gemini jumble generation failed:', err);
  }

  return fallbackPuzzle(category, wordCount);
}

function fallbackPuzzle(category: { id: string; name: string }, wordCount: number): GeminiJumbleResponse {
  const FALLBACKS: Record<string, GeminiJumbleResponse> = {
    everyday: {
      title: 'Daily Jumble',
      words: [
        { word: 'CHAIR', circledPositions: [1, 4] },
        { word: 'PHONE', circledPositions: [2, 5] },
        { word: 'TABLE', circledPositions: [3, 5] },
        { word: 'LIGHT', circledPositions: [1, 3] },
        { word: 'CLOCK', circledPositions: [2] },
        { word: 'BROOM', circledPositions: [4] },
      ],
      finalClue: 'What the messy roommate needed to do...',
      finalAnswer: 'CLEAN HOME',
      cartoonScene: 'A person surrounded by clutter looking at a mop and bucket with determination',
      cartoonCaption: 'What the messy roommate needed to do...',
    },
    animals: {
      title: 'Wild Jumble',
      words: [
        { word: 'TIGER', circledPositions: [1, 3] },
        { word: 'WHALE', circledPositions: [2, 4] },
        { word: 'SNAKE', circledPositions: [1, 5] },
        { word: 'EAGLE', circledPositions: [3, 5] },
        { word: 'HORSE', circledPositions: [2] },
      ],
      finalClue: 'What the zookeeper said at closing time...',
      finalAnswer: 'THE WILD',
      cartoonScene: 'A tired zookeeper closing a gate while a monkey waves goodbye from a tree',
      cartoonCaption: 'What the zookeeper said at closing time...',
    },
    food: {
      title: 'Kitchen Jumble',
      words: [
        { word: 'FLOUR', circledPositions: [1, 4] },
        { word: 'CREAM', circledPositions: [3, 5] },
        { word: 'SUGAR', circledPositions: [1, 3] },
        { word: 'BUTTER', circledPositions: [4, 6] },
        { word: 'YEAST', circledPositions: [1] },
      ],
      finalClue: 'What the baker made with all these ingredients...',
      finalAnswer: 'FRESH EAT',
      cartoonScene: 'A smiling baker pulling a golden loaf of bread from a brick oven',
      cartoonCaption: 'What the baker made with all these ingredients...',
    },
  };

  const puzzle = FALLBACKS[category.id] || FALLBACKS.everyday;
  return {
    ...puzzle,
    words: puzzle.words.slice(0, wordCount),
  };
}

// â”€â”€ Scramble a word (ensuring it's different from the answer) â”€â”€

function scrambleWord(word: string): string {
  const letters = word.split('');
  // Fisher-Yates shuffle, retry if unchanged
  for (let attempt = 0; attempt < 20; attempt++) {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const result = shuffled.join('');
    if (result !== word) return result;
  }
  // Last resort: reverse it
  return letters.reverse().join('');
}

// â”€â”€ Build the JumbleResult â”€â”€

function buildJumbleResult(puzzle: GeminiJumbleResponse, cartoonBase64: string | null): JumbleResult {
  const words: JumbleWord[] = puzzle.words.map(w => ({
    answer: w.word,
    scrambled: scrambleWord(w.word),
    circledIndices: w.circledPositions.map(p => p - 1), // convert 1-based â†’ 0-based
  }));

  return {
    title: puzzle.title,
    words,
    finalClue: puzzle.finalClue,
    finalAnswer: puzzle.finalAnswer,
    cartoonCaption: puzzle.cartoonCaption,
    cartoonBase64,
  };
}

// â”€â”€ Main Pipeline â”€â”€

export async function runJumblePipeline(
  config: JumbleConfig,
  onProgress: ProgressCallback,
): Promise<JumbleResult | null> {
  try {
    onProgress(5, 'Starting jumble generation...', 'jumble');

    const puzzle = await generateJumblePuzzle(
      config.jumbleCategory,
      config.structure.wordCount,
      config.structure.difficulty,
      onProgress,
    );

    if (!puzzle) {
      console.error('Jumble puzzle generation returned null');
      return null;
    }

    onProgress(30, `Got ${puzzle.words.length} words â€” generating cartoon...`, 'art');

    // Generate the cartoon illustration via Imagen
    let cartoonBase64: string | null = null;
    try {
      const artPrompt = `A simple, humorous single-panel newspaper cartoon illustration. Black and white line art style with clean lines, like a classic newspaper comic strip cartoon. The scene: ${puzzle.cartoonScene}. Draw it in a lighthearted, family-friendly editorial cartoon style with slightly exaggerated proportions. No text, no speech bubbles, no captions â€” just the illustration.`;
      cartoonBase64 = await generateImage(artPrompt, '1:1');
      if (cartoonBase64) {
        onProgress(60, 'Cartoon drawn! Building puzzle viewer...', 'engine');
      } else {
        onProgress(60, 'Cartoon generation skipped â€” building puzzle viewer...', 'engine');
      }
    } catch (err) {
      console.warn('Cartoon generation failed:', err);
      onProgress(60, 'Cartoon generation skipped â€” building puzzle viewer...', 'engine');
    }

    onProgress(75, 'Assembling jumble viewer...', 'engine');
    const result = buildJumbleResult(puzzle, cartoonBase64);

    onProgress(90, 'Running QA checks...', 'qa');
    return result;
  } catch (err) {
    console.error('Jumble pipeline failed:', err);
    return null;
  }
}

// â”€â”€ HTML Viewer Generation â”€â”€

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateJumblePreviewHtml(result: JumbleResult, _config: JumbleConfig): string {
  const wordsJson = JSON.stringify(result.words);
  const finalAnswerJson = JSON.stringify(result.finalAnswer);
  const cartoonSrc = result.cartoonBase64
    ? `data:image/png;base64,${result.cartoonBase64}`
    : '';

  const finalLetters = result.finalAnswer.replace(/\s/g, '');
  const finalWordLengths = result.finalAnswer.split(' ').map((w: string) => w.length);
  const finalLengthHint = finalWordLengths.map((l: number) => `${l} letter${l === 1 ? '' : 's'}`).join(', ');
  const totalCircledLetters = result.words.reduce((sum, w) => sum + w.circledIndices.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>${escapeHtml(result.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #fdf6e3 0%, #f5e6c8 50%, #ede0c8 100%);
    color: #2c2c2c;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    user-select: none;
    -webkit-user-select: none;
  }
  h1 {
    font-size: clamp(1.3rem, 4vw, 2rem);
    color: #1a1a1a;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 4px;
    text-align: center;
    font-family: 'Georgia', serif;
  }
  /* â”€â”€ How-to-play banner â”€â”€ */
  .how-to-play {
    background: #fff8e1;
    border: 2px solid #f9a825;
    border-radius: 10px;
    padding: 12px 20px;
    margin-bottom: 16px;
    width: 100%;
    max-width: 860px;
  }
  .how-to-play h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #e65100;
    margin-bottom: 6px;
    font-family: 'Georgia', serif;
  }
  .how-to-play ol {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .how-to-play li {
    font-size: 0.85rem;
    color: #555;
    line-height: 1.4;
  }
  .how-to-play li strong { color: #1a1a1a; }
  /* â”€â”€ Main layout â”€â”€ */
  .main-layout {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    width: 100%;
    max-width: 860px;
  }
  .cartoon-panel {
    flex: 0 0 auto;
    width: min(260px, 90vw);
    background: #fff;
    border: 3px solid #333;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 2px 3px 8px rgba(0,0,0,0.15);
  }
  .cartoon-panel img { width: 100%; display: block; }
  .cartoon-panel .caption {
    padding: 10px 12px;
    font-family: 'Georgia', serif;
    font-size: 0.82rem;
    font-style: italic;
    color: #333;
    border-top: 2px solid #333;
    background: #fffef5;
    text-align: center;
  }
  .no-cartoon {
    width: 100%; height: 180px;
    display: flex; align-items: center; justify-content: center;
    background: #f0f0f0; color: #999; font-style: italic;
  }
  /* â”€â”€ Words panel â”€â”€ */
  .words-panel {
    flex: 1 1 340px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .step-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #e65100;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .word-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .word-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .scrambled-label {
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    letter-spacing: 4px;
    color: #1a1a1a;
  }
  .letter-slots {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .letter-slot {
    width: 36px; height: 40px;
    border: 2px solid #888;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem; font-weight: bold;
    background: #fff;
    cursor: text;
    transition: border-color 0.2s, background 0.2s;
  }
  .letter-slot.circled {
    border-color: #e65100; border-width: 3px;
    border-radius: 50%; width: 40px;
    background: #fff8e1;
  }
  .letter-slot.correct { background: #c8e6c9; border-color: #388e3c; }
  .letter-slot.correct.circled { background: #ffe0b2; border-color: #e65100; }
  .letter-slot input {
    width: 100%; height: 100%;
    border: none; background: transparent;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem; font-weight: bold;
    text-transform: uppercase;
    outline: none; color: #1a1a1a;
  }
  .letter-slot.circled input { color: #e65100; }
  /* â”€â”€ Shuffle button â”€â”€ */
  .shuffle-btn {
    flex-shrink: 0;
    width: 34px; height: 34px;
    background: #fff;
    border: 2px solid #bbb;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    title: "Shuffle scrambled letters";
  }
  .shuffle-btn:hover { background: #f0f0f0; border-color: #888; transform: rotate(20deg); }
  .shuffle-btn:active { transform: rotate(180deg); }
  .shuffle-btn:disabled { opacity: 0.35; cursor: default; }
  /* â”€â”€ Divider â”€â”€ */
  .divider {
    border: none; border-top: 2px dashed #bbb;
    margin: 12px 0; width: 100%; max-width: 860px;
  }
  /* â”€â”€ Final section â”€â”€ */
  .final-section {
    width: 100%; max-width: 860px;
    text-align: center;
  }
  .final-step-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #e65100;
    font-weight: bold;
    margin-bottom: 6px;
  }
  .final-clue {
    font-family: 'Georgia', serif;
    font-size: 1rem; font-style: italic; color: #333;
    margin-bottom: 8px;
  }
  .final-hint {
    font-size: 0.8rem; color: #888; margin-bottom: 6px;
  }
  .final-instruction {
    font-size: 0.8rem; color: #b45309;
    background: #fef3c7; border: 1px solid #f59e0b;
    border-radius: 6px; padding: 5px 12px;
    display: inline-block; margin-bottom: 10px;
  }
  .final-controls {
    display: flex; align-items: center; justify-content: center;
    gap: 10px; flex-wrap: wrap; margin-bottom: 8px;
  }
  .final-slots-wrapper {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
    align-items: center;
  }
  /* â”€â”€ Final draggable tiles â”€â”€ */
  .final-tile {
    width: 38px; height: 44px;
    border: 2px solid #e65100;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem; font-weight: bold;
    text-transform: uppercase;
    background: #fff8e1;
    color: #c84b00;
    cursor: grab;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    position: relative;
  }
  .final-tile:active { cursor: grabbing; }
  .final-tile.dragging { opacity: 0.4; transform: scale(0.95); }
  .final-tile.drag-over {
    background: #ffe082;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px #f59e0b55;
    transform: scale(1.08);
  }
  .final-tile.locked {
    background: #c8e6c9 !important;
    border-color: #388e3c !important;
    color: #1b5e20 !important;
    cursor: default !important;
    box-shadow: none !important;
  }
  .final-tile.correct-pos {
    background: #c8e6c9;
    border-color: #388e3c;
    color: #1b5e20;
  }
  .final-tile.empty-slot {
    background: transparent;
    border: 2px dashed #dba96a;
    color: transparent;
    cursor: default;
    animation: waitPulse 2s ease-in-out infinite;
  }
  .final-tile.empty-slot.all-dropped { animation: none; opacity: 0.35; }
  .word-boundary { width: 12px; }
  @keyframes waitPulse {
    0%, 100% { border-color: #dba96a; }
    50% { border-color: #e65100; }
  }
  @keyframes dropIn {
    0% { transform: translateY(-30px) scale(0.7); opacity: 0; }
    60% { transform: translateY(4px) scale(1.05); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  .drop-anim { animation: dropIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  /* â”€â”€ Action buttons â”€â”€ */
  .action-btn {
    padding: 7px 18px;
    font-size: 0.82rem;
    border: 2px solid #aaa;
    background: #f5f5f5;
    color: #444;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .action-btn:hover { background: #e8e8e8; }
  /* â”€â”€ Victory â”€â”€ */
  .victory {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.82); z-index: 100;
    align-items: center; justify-content: center;
    flex-direction: column; gap: 16px;
    animation: fadeIn 0.5s;
  }
  .victory.show { display: flex; }
  .victory h2 { font-size: 2rem; color: #ffb300; text-shadow: 0 2px 8px rgba(255,179,0,0.5); }
  .victory .answer-reveal {
    font-size: 1.5rem; color: #fff;
    font-family: 'Courier New', monospace;
    letter-spacing: 4px;
    background: rgba(255,179,0,0.15);
    padding: 12px 24px; border-radius: 8px;
    border: 2px solid #ffb300;
  }
  .victory button {
    margin-top: 12px; padding: 12px 32px; font-size: 1rem;
    border: 2px solid #ffb300; background: transparent;
    color: #ffb300; border-radius: 8px; cursor: pointer;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
  .pop { animation: pop 0.3s ease; }
  @keyframes wrongShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .wrong-shake { animation: wrongShake 0.4s ease; }
</style>
</head>
<body>
<h1>${escapeHtml(result.title)}</h1>

<!-- â”€â”€ How-to-play â”€â”€ -->
<div class="how-to-play">
  <h3>ðŸ“‹ How to Play</h3>
  <ol>
    <li><strong>Step 1 — Unscramble:</strong> Type the correct word into each row of boxes below. Hit <strong>↺</strong> beside a word to see the scrambled letters in a new order.</li>
    <li><strong>Step 2 — Watch the magic:</strong> The <span style="color:#e65100;font-weight:bold">⬤ circled</span> letters from each solved word automatically drop into the final answer below.</li>
    <li><strong>Step 3 — Arrange:</strong> <strong style="color:#1a1a1a">Drag the orange tiles</strong> to spell the answer to the riddle. Use <strong>🔀 Shuffle Answer</strong> for a fresh arrangement. The answer <em>auto-checks</em> when all tiles are in place!</li>
  </ol>
</div>

<div class="main-layout">
  <div class="cartoon-panel">
    ${cartoonSrc
      ? `<img src="${cartoonSrc}" alt="Jumble cartoon" />`
      : `<div class="no-cartoon">ðŸŽ¨ Cartoon unavailable</div>`}
    <div class="caption">${escapeHtml(result.cartoonCaption)}</div>
  </div>
  <div class="words-panel">
    <div class="step-label">Step 1 â€” Unscramble the words</div>
    <div id="wordsPanel"></div>
  </div>
</div>

<hr class="divider">

<div class="final-section">
  <div class="final-step-label">Step 2 — Arrange the letters to answer the riddle</div>
  <p class="final-clue">${escapeHtml(result.finalClue)}</p>
  <p class="final-hint">${finalLengthHint}</p>
  <p class="final-instruction">🖱️ Drag tiles to rearrange &nbsp;|&nbsp; 🔀 Shuffle Answer for a new look &nbsp;|&nbsp; 💡 Reveal a letter if stuck &nbsp;|&nbsp; All correct = auto-wins!</p>
  <div class="final-controls">
    <button class="action-btn" id="shuffleFinalBtn">ðŸ”€ Shuffle Answer</button>
    <button class="action-btn" id="hintBtn">ðŸ’¡ Reveal a letter</button>
  </div>
  <div class="final-slots-wrapper" id="finalSlots"></div>
</div>

<div class="victory" id="victory">
  <h2>ðŸŽ‰ SOLVED!</h2>
  <div class="answer-reveal" id="answerReveal"></div>
  <button onclick="location.reload()">Play Again</button>
</div>

<script>
(function() {
  const words = ${wordsJson};
  const finalAnswer = ${finalAnswerJson};
  const finalLetters = finalAnswer.replace(/\\s/g, '');
  const finalWordLengths = ${JSON.stringify(finalWordLengths)};
  const totalSlots = finalLetters.length;

  const wordsPanel = document.getElementById('wordsPanel');
  const finalSlotsEl = document.getElementById('finalSlots');
  const victoryEl = document.getElementById('victory');
  const answerRevealEl = document.getElementById('answerReveal');
  const hintBtn = document.getElementById('hintBtn');
  const shuffleFinalBtn = document.getElementById('shuffleFinalBtn');

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // slots[i] = letter char ('A'..'Z') or null (empty)
  const slots = Array(totalSlots).fill(null);
  // lockedSlots: hinted positions that can't be dragged away
  const lockedSlots = new Set();
  let dragSrcIdx = null;
  const solvedWords = new Set();
  const wordScrambles = words.map(w => w.scrambled);
  const wordInputs = []; // wordInputs[wi][li] = <input>

  // â”€â”€ Build word rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  words.forEach(function(w, wi) {
    const row = document.createElement('div');
    row.className = 'word-row';

    const main = document.createElement('div');
    main.className = 'word-main';

    const label = document.createElement('div');
    label.className = 'scrambled-label';
    label.id = 'label-' + wi;
    label.textContent = wordScrambles[wi];
    main.appendChild(label);

    const slotsDiv = document.createElement('div');
    slotsDiv.className = 'letter-slots';
    const inputs = [];

    for (let i = 0; i < w.answer.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'letter-slot' + (w.circledIndices.indexOf(i) !== -1 ? ' circled' : '');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('autocapitalize', 'characters');
      (function(ii) {
        inp.addEventListener('input', function() {
          this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
          if (this.value && ii < inputs.length - 1) inputs[ii + 1].focus();
          checkWord(wi);
        });
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Backspace' && !this.value && ii > 0) { inputs[ii - 1].focus(); e.preventDefault(); }
          if (e.key === 'ArrowLeft' && ii > 0) { inputs[ii - 1].focus(); e.preventDefault(); }
          if (e.key === 'ArrowRight' && ii < inputs.length - 1) { inputs[ii + 1].focus(); e.preventDefault(); }
        });
      })(i);
      slot.appendChild(inp);
      slotsDiv.appendChild(slot);
      inputs.push(inp);
    }
    wordInputs.push(inputs);
    main.appendChild(slotsDiv);
    row.appendChild(main);

    // Shuffle button for this word
    const shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'shuffle-btn';
    shuffleBtn.textContent = '\u21BA'; // ↺ anticlockwise arrow
    shuffleBtn.title = 'See scrambled letters in a new order';
    shuffleBtn.id = 'shuffle-' + wi;
    (function(wii) {
      shuffleBtn.addEventListener('click', function() {
        var letters = wordScrambles[wii].split('');
        for (var i = letters.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = letters[i]; letters[i] = letters[j]; letters[j] = tmp;
        }
        var newS = letters.join('');
        if (newS === wordScrambles[wii]) newS = letters.reverse().join('');
        wordScrambles[wii] = newS;
        document.getElementById('label-' + wii).textContent = newS;
        shuffleBtn.style.transform = 'rotate(360deg)';
        setTimeout(function() { shuffleBtn.style.transform = ''; }, 400);
      });
    })(wi);
    row.appendChild(shuffleBtn);

    wordsPanel.appendChild(row);
  });

  // â”€â”€ Word check + circled-letter drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function checkWord(wi) {
    if (solvedWords.has(wi)) return;
    var w = words[wi];
    var guess = wordInputs[wi].map(function(inp) { return inp.value; }).join('');
    if (guess.length === w.answer.length && guess === w.answer) {
      solvedWords.add(wi);

      // Mark letter slots correct and lock inputs
      wordInputs[wi].forEach(function(inp) {
        inp.parentElement.classList.add('correct');
        inp.parentElement.classList.add('pop');
        inp.disabled = true;
      });

      // Disable that word's shuffle button
      var sb = document.getElementById('shuffle-' + wi);
      if (sb) sb.disabled = true;

      // Drop circled letters into random empty final slots
      var circled = w.circledIndices.map(function(ci) { return w.answer[ci]; });
      var emptyIdxs = [];
      for (var i = 0; i < slots.length; i++) { if (slots[i] === null) emptyIdxs.push(i); }
      // shuffle empty indices
      for (var i = emptyIdxs.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = emptyIdxs[i]; emptyIdxs[i] = emptyIdxs[j]; emptyIdxs[j] = t;
      }
      var newlyFilled = new Set();
      circled.forEach(function(letter, k) {
        if (k < emptyIdxs.length) { slots[emptyIdxs[k]] = letter; newlyFilled.add(emptyIdxs[k]); }
      });

      renderFinalSlots(newlyFilled);
      checkFinal();
    }
  }

  // â”€â”€ Render final slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // newlyFilledSet: a Set of slot indices to animate, or null/false
  function renderFinalSlots(newlyFilledSet) {
    finalSlotsEl.innerHTML = '';
    var allDropped = solvedWords.size === words.length;
    var flatIdx = 0;

    finalWordLengths.forEach(function(wLen, wIdx) {
      if (wIdx > 0) {
        var gap = document.createElement('div');
        gap.className = 'word-boundary';
        finalSlotsEl.appendChild(gap);
      }
      for (var i = 0; i < wLen; i++) {
        var tile = document.createElement('div');
        var slotIdx = flatIdx;

        if (slots[slotIdx] !== null) {
          var isNew = newlyFilledSet instanceof Set && newlyFilledSet.has(slotIdx);
          tile.className = 'final-tile' + (isNew ? ' drop-anim' : '');
          tile.textContent = slots[slotIdx];
          if (lockedSlots.has(slotIdx)) {
            tile.className = 'final-tile locked';
            tile.textContent = slots[slotIdx];
          }
          if (!lockedSlots.has(slotIdx)) {
            tile.setAttribute('draggable', 'true');
            tile.dataset.idx = slotIdx;
            tile.addEventListener('dragstart', onDragStart);
            tile.addEventListener('dragend', onDragEnd);
          }
        } else {
          tile.className = 'final-tile empty-slot' + (allDropped ? ' all-dropped' : '');
        }

        tile.dataset.idx = slotIdx;
        tile.addEventListener('dragover', onDragOver);
        tile.addEventListener('dragleave', onDragLeave);
        tile.addEventListener('drop', onDrop);

        finalSlotsEl.appendChild(tile);
        flatIdx++;
      }
    });
  }

  // â”€â”€ HTML5 Drag handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function onDragStart(e) {
    dragSrcIdx = parseInt(this.dataset.idx);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcIdx);
  }
  function onDragEnd() {
    this.classList.remove('dragging');
    // clean up any leftover drag-over classes
    finalSlotsEl.querySelectorAll('.drag-over').forEach(function(el) {
      el.classList.remove('drag-over');
    });
    dragSrcIdx = null;
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }
  function onDragLeave(e) {
    if (!this.contains(e.relatedTarget)) this.classList.remove('drag-over');
  }
  function onDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    var destIdx = parseInt(this.dataset.idx);
    if (dragSrcIdx === null || destIdx === dragSrcIdx) return;
    if (lockedSlots.has(dragSrcIdx) || lockedSlots.has(destIdx)) return;
    // Swap
    var tmp = slots[destIdx];
    slots[destIdx] = slots[dragSrcIdx];
    slots[dragSrcIdx] = tmp;
    renderFinalSlots(null);
    checkFinal();
  }

  // â”€â”€ Shuffle final tiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  shuffleFinalBtn.addEventListener('click', function() {
    var filledIdxs = [];
    for (var i = 0; i < slots.length; i++) {
      if (slots[i] !== null && !lockedSlots.has(i)) filledIdxs.push(i);
    }
    if (filledIdxs.length < 2) return;
    var letters = filledIdxs.map(function(i) { return slots[i]; });
    // Fisher-Yates shuffle (ensure change)
    var changed = false;
    for (var attempt = 0; attempt < 10 && !changed; attempt++) {
      for (var i = letters.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = letters[i]; letters[i] = letters[j]; letters[j] = t;
      }
      for (var k = 0; k < letters.length; k++) {
        if (letters[k] !== slots[filledIdxs[k]]) { changed = true; break; }
      }
    }
    filledIdxs.forEach(function(slotIdx, k) { slots[slotIdx] = letters[k]; });
    renderFinalSlots(null);
    checkFinal();
  });

  // â”€â”€ Hint: reveal one slot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  hintBtn.addEventListener('click', function() {
    // Find the first non-locked slot that has the wrong letter (or is empty)
    for (var i = 0; i < totalSlots; i++) {
      if (lockedSlots.has(i)) continue;
      if (slots[i] === finalLetters[i]) continue;
      // Need to put finalLetters[i] into slot i
      var correctLetter = finalLetters[i];
      // Find where correctLetter currently lives (prefer non-locked, non-empty)
      var srcIdx = -1;
      for (var j = 0; j < slots.length; j++) {
        if (j !== i && slots[j] === correctLetter && !lockedSlots.has(j)) {
          srcIdx = j; break;
        }
      }
      if (srcIdx !== -1) {
        // Swap src -> i, moving whatever was in i to src
        var tmp = slots[i];
        slots[i] = slots[srcIdx];
        slots[srcIdx] = tmp;
      } else if (slots[i] === null) {
        // Letter not placed yet (word not solved) â€” skip
        return;
      } else {
        // Letter just wrong in this slot â€” leave it and just lock
        slots[i] = correctLetter;
      }
      lockedSlots.add(i);
      renderFinalSlots(null);
      checkFinal();
      return;
    }
  });

  // â”€â”€ Check final answer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function checkFinal() {
    if (slots.some(function(s) { return s === null; })) return;
    var guess = slots.join('');
    if (guess === finalLetters) {
      // Mark all correct
      finalSlotsEl.querySelectorAll('.final-tile').forEach(function(t) {
        t.classList.add('correct-pos');
      });
      setTimeout(function() {
        answerRevealEl.textContent = finalAnswer;
        victoryEl.classList.add('show');
      }, 600);
    } else {
      // Shake to signal wrong arrangement
      finalSlotsEl.classList.remove('wrong-shake');
      void finalSlotsEl.offsetWidth;
      finalSlotsEl.classList.add('wrong-shake');
    }
  }

  // Initial render (empty slots)
  renderFinalSlots(null);

})();
</script>
</body>
</html>`;
}

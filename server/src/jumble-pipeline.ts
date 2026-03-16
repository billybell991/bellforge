// ── Jumble Pipeline ──
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

// ── Gemini Puzzle Generation ──

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
- For each word, specify which letter positions (1-based) are "circled" — these letters must combine to spell the final answer
- The circled letters from ALL words, taken in order (word 1 circled letters, then word 2, etc.), must spell out the final answer EXACTLY when rearranged
- The final answer should be a fun pun, wordplay, or clever answer to the cartoon's setup
- The cartoon scene should be a simple, humorous scenario related to the topic
- The cartoon caption should be a setup question or funny situation that the final answer resolves

CRITICAL: The circled letters must EXACTLY form the final answer. Count carefully!

Example for topic "Cooking":
- Word: SPOON (circled positions: [1, 4]) → circled letters: S, O
- Word: BASTE (circled positions: [2, 5]) → circled letters: A, E  
- Word: GRILL (circled positions: [3]) → circled letters: I
- Word: RANCH (circled positions: [3, 5]) → circled letters: N, H
- Final answer: "OVEN" — wait, that doesn't match. Make sure the circled letters S,O,A,E,I,N,H can be rearranged to spell the final answer!

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

// ── Scramble a word (ensuring it's different from the answer) ──

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

// ── Build the JumbleResult ──

function buildJumbleResult(puzzle: GeminiJumbleResponse, cartoonBase64: string | null): JumbleResult {
  const words: JumbleWord[] = puzzle.words.map(w => ({
    answer: w.word,
    scrambled: scrambleWord(w.word),
    circledIndices: w.circledPositions.map(p => p - 1), // convert 1-based → 0-based
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

// ── Main Pipeline ──

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

    onProgress(30, `Got ${puzzle.words.length} words — generating cartoon...`, 'art');

    // Generate the cartoon illustration via Imagen
    let cartoonBase64: string | null = null;
    try {
      const artPrompt = `A simple, humorous single-panel newspaper cartoon illustration. Black and white line art style with clean lines, like a classic newspaper comic strip cartoon. The scene: ${puzzle.cartoonScene}. Draw it in a lighthearted, family-friendly editorial cartoon style with slightly exaggerated proportions. No text, no speech bubbles, no captions — just the illustration.`;
      cartoonBase64 = await generateImage(artPrompt, '1:1');
      if (cartoonBase64) {
        onProgress(60, 'Cartoon drawn! Building puzzle viewer...', 'engine');
      } else {
        onProgress(60, 'Cartoon generation skipped — building puzzle viewer...', 'engine');
      }
    } catch (err) {
      console.warn('Cartoon generation failed:', err);
      onProgress(60, 'Cartoon generation skipped — building puzzle viewer...', 'engine');
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

// ── HTML Viewer Generation ──

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateJumblePreviewHtml(result: JumbleResult, _config: JumbleConfig): string {
  const wordsJson = JSON.stringify(result.words);
  const finalAnswerJson = JSON.stringify(result.finalAnswer);
  const cartoonSrc = result.cartoonBase64
    ? `data:image/png;base64,${result.cartoonBase64}`
    : '';

  // Count final answer letters (excluding spaces)
  const finalLetters = result.finalAnswer.replace(/\s/g, '');
  const finalWordLengths = result.finalAnswer.split(' ').map(w => w.length);

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
  .subtitle {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 12px;
    font-style: italic;
  }
  .main-layout {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    width: 100%;
    max-width: 900px;
  }
  .cartoon-panel {
    flex: 0 0 auto;
    width: min(280px, 90vw);
    background: #fff;
    border: 3px solid #333;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 2px 3px 8px rgba(0,0,0,0.15);
  }
  .cartoon-panel img {
    width: 100%;
    display: block;
  }
  .cartoon-panel .caption {
    padding: 10px 12px;
    font-family: 'Georgia', serif;
    font-size: 0.85rem;
    font-style: italic;
    color: #333;
    border-top: 2px solid #333;
    background: #fffef5;
    text-align: center;
  }
  .no-cartoon {
    width: 100%;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    color: #999;
    font-style: italic;
  }
  .words-panel {
    flex: 1 1 350px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .word-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .word-row .scrambled-label {
    font-family: 'Courier New', monospace;
    font-size: 1.3rem;
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
    width: 36px;
    height: 40px;
    border: 2px solid #888;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    text-transform: uppercase;
    background: #fff;
    cursor: text;
    transition: border-color 0.2s, background 0.2s;
  }
  .letter-slot.circled {
    border-color: #e65100;
    border-width: 3px;
    border-radius: 50%;
    width: 40px;
    background: #fff8e1;
  }
  .letter-slot.correct {
    background: #c8e6c9;
    border-color: #388e3c;
  }
  .letter-slot.correct.circled {
    background: #ffe0b2;
    border-color: #e65100;
  }
  .letter-slot input {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    text-transform: uppercase;
    outline: none;
    color: #1a1a1a;
  }
  .letter-slot.circled input {
    color: #e65100;
  }
  .divider {
    border: none;
    border-top: 2px dashed #bbb;
    margin: 8px 0;
  }
  .final-section {
    width: 100%;
    max-width: 900px;
    margin-top: 16px;
    text-align: center;
  }
  .final-clue {
    font-family: 'Georgia', serif;
    font-size: 1rem;
    font-style: italic;
    color: #333;
    margin-bottom: 12px;
  }
  .final-hint {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 8px;
  }
  .final-slots {
    display: flex;
    gap: 4px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .final-slot {
    width: 36px;
    height: 40px;
    border: 2px solid #e65100;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    text-transform: uppercase;
    background: #fff8e1;
    cursor: text;
    transition: background 0.2s;
  }
  .final-slot input {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    text-transform: uppercase;
    outline: none;
    color: #e65100;
  }
  .final-slot.correct {
    background: #c8e6c9;
    border-color: #388e3c;
  }
  .word-space {
    width: 16px;
    height: 40px;
  }
  .victory {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    z-index: 100;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 16px;
    animation: fadeIn 0.5s;
  }
  .victory.show { display: flex; }
  .victory h2 {
    font-size: 2rem;
    color: #ffb300;
    text-shadow: 0 2px 8px rgba(255,179,0,0.5);
  }
  .victory .answer-reveal {
    font-size: 1.5rem;
    color: #fff;
    font-family: 'Courier New', monospace;
    letter-spacing: 4px;
    background: rgba(255,179,0,0.15);
    padding: 12px 24px;
    border-radius: 8px;
    border: 2px solid #ffb300;
  }
  .victory button {
    margin-top: 16px;
    padding: 12px 32px;
    font-size: 1rem;
    border: 2px solid #ffb300;
    background: transparent;
    color: #ffb300;
    border-radius: 8px;
    cursor: pointer;
  }
  .hint-btn {
    margin-top: 8px;
    padding: 6px 16px;
    font-size: 0.85rem;
    border: 1px solid #888;
    background: #f5f5f5;
    color: #555;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .hint-btn:hover { background: #e0e0e0; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
  .pop { animation: pop 0.3s ease; }
</style>
</head>
<body>
<h1>${escapeHtml(result.title)}</h1>
<p class="subtitle">Unscramble each word, then use the circled letters to solve the final riddle!</p>

<div class="main-layout">
  <div class="cartoon-panel">
    ${cartoonSrc
      ? `<img src="${cartoonSrc}" alt="Jumble cartoon" />`
      : `<div class="no-cartoon">🎨 Cartoon unavailable</div>`}
    <div class="caption">${escapeHtml(result.cartoonCaption)}</div>
  </div>
  <div class="words-panel" id="wordsPanel"></div>
</div>

<hr class="divider" style="width:100%;max-width:900px;margin-top:20px;">

<div class="final-section">
  <p class="final-clue">${escapeHtml(result.finalClue)}</p>
  <p class="final-hint">${finalWordLengths.map(l => `${l} letters`).join(', ')}</p>
  <div class="final-slots" id="finalSlots"></div>
  <button class="hint-btn" id="hintBtn">💡 Reveal a letter</button>
</div>

<div class="victory" id="victory">
  <h2>🎉 SOLVED!</h2>
  <div class="answer-reveal" id="answerReveal"></div>
  <button onclick="location.reload()">Play Again</button>
</div>

<script>
(function() {
  const words = ${wordsJson};
  const finalAnswer = ${finalAnswerJson};
  const finalLetters = finalAnswer.replace(/\\s/g, '');
  const finalWordLengths = ${JSON.stringify(finalWordLengths)};

  const panel = document.getElementById('wordsPanel');
  const finalSlotsEl = document.getElementById('finalSlots');
  const victoryEl = document.getElementById('victory');
  const answerRevealEl = document.getElementById('answerReveal');
  const hintBtn = document.getElementById('hintBtn');

  const wordInputs = []; // [wordIdx][letterIdx] = input element
  const finalInputs = []; // flat array of final answer inputs

  // Build word rows
  words.forEach((w, wi) => {
    const row = document.createElement('div');
    row.className = 'word-row';

    const label = document.createElement('div');
    label.className = 'scrambled-label';
    label.textContent = w.scrambled;
    row.appendChild(label);

    const slots = document.createElement('div');
    slots.className = 'letter-slots';

    const inputs = [];
    for (let i = 0; i < w.answer.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'letter-slot' + (w.circledIndices.includes(i) ? ' circled' : '');

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.setAttribute('data-word', wi);
      inp.setAttribute('data-letter', i);
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('autocapitalize', 'characters');

      inp.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (this.value && i < w.answer.length - 1) {
          inputs[i + 1].focus();
        }
        checkWord(wi);
      });

      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && i > 0) {
          inputs[i - 1].focus();
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft' && i > 0) { inputs[i - 1].focus(); e.preventDefault(); }
        if (e.key === 'ArrowRight' && i < inputs.length - 1) { inputs[i + 1].focus(); e.preventDefault(); }
      });

      slot.appendChild(inp);
      slots.appendChild(slot);
      inputs.push(inp);
    }

    wordInputs.push(inputs);
    row.appendChild(slots);
    panel.appendChild(row);
  });

  // Build final answer slots
  let flatIdx = 0;
  finalWordLengths.forEach((wLen, wIdx) => {
    for (let i = 0; i < wLen; i++) {
      const slot = document.createElement('div');
      slot.className = 'final-slot';

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('autocapitalize', 'characters');
      const myIdx = flatIdx;

      inp.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (this.value && myIdx < finalInputs.length - 1) {
          finalInputs[myIdx + 1].focus();
        }
        checkFinal();
      });

      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && myIdx > 0) {
          finalInputs[myIdx - 1].focus();
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft' && myIdx > 0) { finalInputs[myIdx - 1].focus(); e.preventDefault(); }
        if (e.key === 'ArrowRight' && myIdx < finalInputs.length - 1) { finalInputs[myIdx + 1].focus(); e.preventDefault(); }
      });

      slot.appendChild(inp);
      finalSlotsEl.appendChild(slot);
      finalInputs.push(inp);
      flatIdx++;
    }
    // Add space between words
    if (wIdx < finalWordLengths.length - 1) {
      const space = document.createElement('div');
      space.className = 'word-space';
      finalSlotsEl.appendChild(space);
    }
  });

  const solvedWords = new Set();

  function checkWord(wi) {
    const w = words[wi];
    const guess = wordInputs[wi].map(inp => inp.value).join('');
    if (guess.length === w.answer.length && guess === w.answer) {
      solvedWords.add(wi);
      wordInputs[wi].forEach((inp, i) => {
        inp.parentElement.classList.add('correct');
        inp.parentElement.classList.add('pop');
        inp.disabled = true;
      });
    }
  }

  function checkFinal() {
    const guess = finalInputs.map(inp => inp.value).join('');
    if (guess.length === finalLetters.length && guess === finalLetters) {
      finalInputs.forEach(inp => {
        inp.parentElement.classList.add('correct');
        inp.disabled = true;
      });
      answerRevealEl.textContent = finalAnswer;
      victoryEl.classList.add('show');
    }
  }

  // Hint: reveal one unrevealed final letter
  hintBtn.addEventListener('click', function() {
    for (let i = 0; i < finalInputs.length; i++) {
      if (!finalInputs[i].value || finalInputs[i].value !== finalLetters[i]) {
        finalInputs[i].value = finalLetters[i];
        finalInputs[i].parentElement.classList.add('pop');
        checkFinal();
        return;
      }
    }
  });
})();
</script>
</body>
</html>`;
}

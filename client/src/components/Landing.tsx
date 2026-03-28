import { useEffect, useState } from 'react';
import type { EntertainmentType } from '../types';

// 'puzzles' is the sub-menu — not a real entertainment type
type LandingSelection = EntertainmentType | 'puzzles' | null;

interface LandingProps {
  onStart: (type: EntertainmentType) => void;
  onAutoForge: (type: EntertainmentType) => void;
  onLibrary: () => void;
  libraryCount: number;
}

const GAME_FEATURES = [
  { icon: '🎮', title: 'Choose Your Genre', desc: 'Point & click, puzzle, platformer, visual novel — pick your path.' },
  { icon: '🤖', title: 'AI-Powered Art', desc: 'Gemini AI Bridge generates beautiful, stylized game assets.' },
  { icon: '⚡', title: 'One-Click Build', desc: 'Full game code generated and compiled — ready to play instantly.' },
  { icon: '🌐', title: 'Play Anywhere', desc: 'Runs right in any browser — desktop, phone, or tablet.' },
];

const ADVENTURE_FEATURES = [
  { icon: '📚', title: 'Pick Your Genre', desc: 'Space opera, spooky mystery, deep sea, jungle, time travel.' },
  { icon: '🤖', title: 'AI-Written Prose', desc: 'Gemini writes vivid second-person narrative with branching paths.' },
  { icon: '🖼️', title: 'Illustrated Pages', desc: 'Imagen generates atmospheric art for key moments.' },
  { icon: '📖', title: 'Instant Play', desc: 'Your adventure loads right in the browser — no install needed.' },
];

const COMIC_FEATURES = [
  { icon: '💥', title: 'Pick Your Story', desc: 'Origin story, heist, team-up, revenge, war epic, coming of age.' },
  { icon: '🎨', title: 'AI-Drawn Panels', desc: 'Imagen generates every panel — covers, splash pages, close-ups.' },
  { icon: '💬', title: 'Speech Bubbles', desc: 'Dialogue, thought bubbles, and narration boxes auto-composed.' },
  { icon: '📖', title: 'Read Instantly', desc: 'Full comic viewer right in your browser with page navigation.' },
];

const ESCAPE_FEATURES = [
  { icon: '🔑', title: 'Pick Your Scenario', desc: 'Heist, cold case, haunted estate, lab lockdown, and more.' },
  { icon: '🧩', title: 'Premium Puzzles', desc: 'Cipher wheels, wire puzzles, overlay reveals — every puzzle serves the story.' },
  { icon: '🎨', title: 'AI Scene Art', desc: 'Imagen generates atmospheric environments for every stage.' },
  { icon: '🔓', title: 'Play in Browser', desc: 'A complete escape room experience — no app install required.' },
];

const PUZZLE_FEATURES = [
  { icon: '🖼️', title: 'Pick Your Subject', desc: 'Landscapes, fantasy scenes, animals, space, cityscapes — or describe your own.' },
  { icon: '🎨', title: 'AI-Painted Image', desc: 'Imagen generates one beautiful illustration in your chosen art style.' },
  { icon: '✂️', title: 'Precision Cut', desc: 'Classic jigsaw shapes with knobs and sockets — 9 to 100 interlocking pieces.' },
  { icon: '🧩', title: 'Drag & Solve', desc: 'Drag, snap, and complete — play right in your browser with touch support.' },
];

const WORDSEARCH_FEATURES = [
  { icon: '📋', title: 'Pick a Topic', desc: 'Animals, space, food, mythology, sports — or describe your own.' },
  { icon: '🤖', title: 'AI-Picked Words', desc: 'Gemini selects interesting, themed words for every puzzle.' },
  { icon: '🔤', title: 'Custom Grid', desc: 'Choose grid size, diagonals, backwards — easy to expert.' },
  { icon: '👆', title: 'Swipe & Find', desc: 'Drag to select words in the grid — plays great on touch and desktop.' },
];

const CROSSWORD_FEATURES = [
  { icon: '📋', title: 'Pick a Topic', desc: 'Science, geography, movies, literature — or any custom topic.' },
  { icon: '🤖', title: 'AI-Written Clues', desc: 'Gemini writes clever clues at your chosen difficulty level.' },
  { icon: '✏️', title: 'Classic Grid', desc: 'Proper numbered crossword grid with across and down clues.' },
  { icon: '🧠', title: 'Type & Solve', desc: 'Click a clue, type your answer — auto-checks when complete.' },
];

const JUMBLE_FEATURES = [
  { icon: '🔀', title: 'Classic Scramble', desc: 'Unscramble 4-6 jumbled words, then use circled letters to solve the final riddle.' },
  { icon: '🎨', title: 'Cartoon Panel', desc: 'Each puzzle comes with an AI-drawn newspaper-style cartoon — just like the real thing.' },
  { icon: '💡', title: 'Punchline Payoff', desc: 'The circled letters rearrange into a clever punchline tied to the cartoon.' },
  { icon: '🤖', title: 'AI-Crafted Puzzles', desc: 'Gemini writes the words, clues, and cartoon scene — every puzzle is unique.' },
];

export function Landing({ onStart, onAutoForge, onLibrary, libraryCount }: LandingProps) {
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ available: boolean; hint: string } | null>(null);
  const [selection, setSelection] = useState<LandingSelection>(null);
  const [featureNudge, setFeatureNudge] = useState<string | null>(null);

  // The actual entertainment type (null when at top level or in puzzles sub-menu)
  const entertainmentType: EntertainmentType | null =
    selection && selection !== 'puzzles' ? selection : null;

  useEffect(() => {
    const timer = setTimeout(() => setTaglineVisible(true), 300);
    fetch('/api/gemini/status')
      .then((r) => r.json())
      .then((data) => setGeminiStatus(data))
      .catch(() => setGeminiStatus({ available: false, hint: 'Server unreachable' }));
    return () => clearTimeout(timer);
  }, []);

  const features = selection === 'adventure' ? ADVENTURE_FEATURES
    : selection === 'comic' ? COMIC_FEATURES
    : selection === 'escape' ? ESCAPE_FEATURES
    : selection === 'puzzle' ? PUZZLE_FEATURES
    : selection === 'wordsearch' ? WORDSEARCH_FEATURES
    : selection === 'crossword' ? CROSSWORD_FEATURES
    : selection === 'jumble' ? JUMBLE_FEATURES
    : GAME_FEATURES;
  const tagline = !selection
    ? 'AI-Powered Entertainment. Built in Minutes.'
    : selection === 'adventure'
    ? 'Forge Your Adventure. You Are the Hero.'
    : selection === 'comic'
    ? 'Forge Your Comic. Every Panel AI-Drawn.'
    : selection === 'escape'
    ? 'Forge Your Escape. Crack Every Puzzle.'
    : selection === 'puzzles'
    ? 'Forge a Puzzle. Pick Your Challenge.'
    : selection === 'puzzle'
    ? 'Forge Your Puzzle. Piece by Piece.'
    : selection === 'wordsearch'
    ? 'Forge Your Word Search. Find Every Word.'
    : selection === 'crossword'
    ? 'Forge Your Crossword. Clue by Clue.'
    : selection === 'jumble'
    ? 'Forge Your Jumble. Unscramble the Fun.'
    : 'Forge Your Game. No Code Required.';

  return (
    <div className="landing">
      <h1 className="landing-title">
        <img src="/bellforge-logo.png" alt="" className="landing-title-logo" />
        BELLFORGE
        <img src="/bellforge-logo.png" alt="" className="landing-title-logo" />
      </h1>
      <p className={`landing-tagline ${taglineVisible ? 'visible' : ''}`}>
        {tagline}
      </p>

      {geminiStatus && (
        <div className={`gemini-status ${geminiStatus.available ? 'gemini-online' : 'gemini-offline'}`}>
          <span className="gemini-status-dot">{geminiStatus.available ? '🟢' : '🟡'}</span>
          <span className="gemini-status-text">{geminiStatus.hint}</span>
        </div>
      )}

      {/* Entertainment Type Selector */}
      {!selection && (
        <div className="entertainment-selector">
          <h2 className="entertainment-prompt">The forge is hot. What are we making?</h2>
          <div className="entertainment-cards">
            <div className="entertainment-card faceplate" onClick={() => setSelection('adventure')}>
              <div className="faceplate-art" style={{ backgroundImage: 'url(/card-art/adventure.png)' }} />
              <div className="faceplate-body">
                <h3 className="entertainment-card-title">Adventure</h3>
                <p className="entertainment-card-desc">A branching illustrated storybook — you make the choices.</p>
              </div>
            </div>
            <div className="entertainment-card faceplate" onClick={() => setSelection('comic')}>
              <div className="faceplate-art" style={{ backgroundImage: 'url(/card-art/comic.png)' }} />
              <div className="faceplate-body">
                <h3 className="entertainment-card-title">Comic</h3>
                <p className="entertainment-card-desc">A full comic book — every panel AI-drawn, dialogue auto-placed.</p>
              </div>
            </div>
            <div className="entertainment-card faceplate" onClick={() => setSelection('escape')}>
              <div className="faceplate-art" style={{ backgroundImage: 'url(/card-art/escape.png)' }} />
              <div className="faceplate-body">
                <h3 className="entertainment-card-title">Escape Room</h3>
                <p className="entertainment-card-desc">Locked in with puzzles, codes, and clues — solve your way out before time runs out.</p>
              </div>
            </div>
            <div className="entertainment-card faceplate" onClick={() => setSelection('puzzles')}>
              <div className="faceplate-art" style={{ backgroundImage: 'url(/card-art/puzzles.png)' }} />
              <div className="faceplate-body">
                <h3 className="entertainment-card-title">Puzzles</h3>
                <p className="entertainment-card-desc">Jigsaw puzzles, word searches, crosswords, and jumbles — AI-generated brain teasers.</p>
              </div>
            </div>
            <div className="entertainment-card faceplate" onClick={() => onStart('anthology')}>
              <div className="faceplate-art" style={{ backgroundImage: 'url(/card-art/casebook.png)' }} />
              <div className="faceplate-body">
                <h3 className="entertainment-card-title">The Casebook</h3>
                <p className="entertainment-card-desc">Logic-puzzle mysteries across noir, fantasy, sci-fi, and horror — find the flaw before the detective does.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Puzzle Sub-Type Selector */}
      {selection === 'puzzles' && (
        <div className="entertainment-selector">
          <h2 className="entertainment-prompt">Pick your puzzle type</h2>
          <div className="entertainment-cards">
            <div className="entertainment-card" onClick={() => setSelection('puzzle')}>
              <span className="entertainment-card-icon">🖼️</span>
              <h3 className="entertainment-card-title">Jigsaw Puzzle</h3>
              <p className="entertainment-card-desc">A beautiful AI-painted image cut into classic jigsaw pieces — drag, snap, and solve.</p>
            </div>
            <div className="entertainment-card" onClick={() => setSelection('wordsearch')}>
              <span className="entertainment-card-icon">🔤</span>
              <h3 className="entertainment-card-title">Word Search</h3>
              <p className="entertainment-card-desc">Find hidden words in a grid — themed by topic, with diagonals and backwards options.</p>
            </div>
            <div className="entertainment-card" onClick={() => setSelection('crossword')}>
              <span className="entertainment-card-icon">✏️</span>
              <h3 className="entertainment-card-title">Crossword</h3>
              <p className="entertainment-card-desc">AI-written clues on any topic — classic numbered grid with across and down.</p>
            </div>
            <div className="entertainment-card" onClick={() => setSelection('jumble')}>
              <span className="entertainment-card-icon">🔀</span>
              <h3 className="entertainment-card-title">Jumble</h3>
              <p className="entertainment-card-desc">Unscramble words, find the circled letters, solve the punchline — with a cartoon!</p>
            </div>
          </div>
          <div className="landing-buttons" style={{ marginTop: 16 }}>
            <div className="landing-btn-wrapper">
              <button className="forge-btn forge-btn-auto" onClick={() => {
                const puzzleTypes: EntertainmentType[] = ['puzzle', 'wordsearch', 'crossword', 'jumble'];
                const pick = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
                onAutoForge(pick);
              }}>
                🎲 SURPRISE ME
              </button>
              <span className="forge-btn-tooltip">
                Randomly pick a puzzle type and build it — total surprise!
              </span>
            </div>
          </div>
          <button className="landing-type-switch" onClick={() => setSelection(null)}>
            ← Choose a different type
          </button>
        </div>
      )}

      {/* Feature cards + action buttons shown after picking a concrete type */}
      {entertainmentType && (
        <>
          <div className="landing-features">
            {features.map((f) => (
              <div key={f.title} className={`feature-card ${featureNudge === f.title ? 'nudged' : ''}`} onClick={() => {
                setFeatureNudge(f.title);
                setTimeout(() => setFeatureNudge(null), 2500);
              }}>
                <span className="feature-icon">{f.icon}</span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                {featureNudge === f.title && (
                  <div className="feature-nudge">↓ Use a forge button below to begin</div>
                )}
              </div>
            ))}
          </div>

          <div className="landing-buttons">
            <div className="landing-btn-wrapper">
              <button className="forge-btn forge-btn-manual" onClick={() => onStart(entertainmentType)}>
                <img src="/bellforge-logo.png" alt="" style={{ width: 20, height: 'auto', verticalAlign: 'middle', marginRight: 6 }} /> FORGE MY OWN
              </button>
              <span className="forge-btn-tooltip">
                Walk through each step — you pick the topic, settings, and style
              </span>
            </div>
            <div className="landing-btn-wrapper">
              <button className="forge-btn forge-btn-auto" onClick={() => onAutoForge(entertainmentType)}>
                🤖 FORGE FOR ME
              </button>
              <span className="forge-btn-tooltip">
                Let Gemini AI choose everything and build you a surprise {entertainmentType === 'adventure' ? 'adventure' : entertainmentType === 'comic' ? 'comic' : entertainmentType === 'escape' ? 'escape room' : entertainmentType === 'puzzle' ? 'puzzle' : entertainmentType === 'wordsearch' ? 'word search' : entertainmentType === 'crossword' ? 'crossword' : entertainmentType === 'jumble' ? 'jumble' : 'game'}
              </span>
            </div>
          </div>

          <button className="landing-type-switch" onClick={() => {
            // Go back to puzzle sub-menu if we came from there
            if (selection === 'puzzle' || selection === 'wordsearch' || selection === 'crossword' || selection === 'jumble') {
              setSelection('puzzles');
            } else {
              setSelection(null);
            }
          }}>
            ← Choose a different type
          </button>
        </>
      )}

      <button className={`landing-library-link ${libraryCount > 0 ? 'has-games' : ''}`} onClick={onLibrary}>
        📚 {libraryCount > 0 ? `Your Library — ${libraryCount} Creation${libraryCount !== 1 ? 's' : ''} Forged` : 'View Your Library'}
      </button>
    </div>
  );
}

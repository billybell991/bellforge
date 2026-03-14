import { useEffect, useState } from 'react';
import type { EntertainmentType } from '../types';

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

export function Landing({ onStart, onAutoForge, onLibrary, libraryCount }: LandingProps) {
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ available: boolean; hint: string } | null>(null);
  const [entertainmentType, setEntertainmentType] = useState<EntertainmentType | null>(null);
  const [featureNudge, setFeatureNudge] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTaglineVisible(true), 300);
    fetch('/api/gemini/status')
      .then((r) => r.json())
      .then((data) => setGeminiStatus(data))
      .catch(() => setGeminiStatus({ available: false, hint: 'Server unreachable' }));
    return () => clearTimeout(timer);
  }, []);

  const features = entertainmentType === 'adventure' ? ADVENTURE_FEATURES
    : entertainmentType === 'comic' ? COMIC_FEATURES
    : entertainmentType === 'escape' ? ESCAPE_FEATURES
    : entertainmentType === 'puzzle' ? PUZZLE_FEATURES
    : GAME_FEATURES;
  const tagline = !entertainmentType
    ? 'AI-Powered Entertainment. Built in Minutes.'
    : entertainmentType === 'adventure'
    ? 'Forge Your Adventure. You Are the Hero.'
    : entertainmentType === 'comic'
    ? 'Forge Your Comic. Every Panel AI-Drawn.'
    : entertainmentType === 'escape'
    ? 'Forge Your Escape. Crack Every Puzzle.'
    : entertainmentType === 'puzzle'
    ? 'Forge Your Puzzle. Piece by Piece.'
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
      {!entertainmentType && (
        <div className="entertainment-selector">
          <h2 className="entertainment-prompt">The forge is hot. What are we making?</h2>
          <div className="entertainment-cards">
            <div className="entertainment-card" onClick={() => setEntertainmentType('adventure')}>
              <span className="entertainment-card-icon">📚</span>
              <h3 className="entertainment-card-title">Adventure</h3>
              <p className="entertainment-card-desc">A branching illustrated storybook — you make the choices.</p>
            </div>
            <div className="entertainment-card" onClick={() => setEntertainmentType('comic')}>
              <span className="entertainment-card-icon">💥</span>
              <h3 className="entertainment-card-title">Comic</h3>
              <p className="entertainment-card-desc">A full comic book — every panel AI-drawn, dialogue auto-placed.</p>
            </div>
            <div className="entertainment-card" onClick={() => setEntertainmentType('escape')}>
              <span className="entertainment-card-icon">🔑</span>
              <h3 className="entertainment-card-title">Escape Room</h3>
              <p className="entertainment-card-desc">A premium puzzle experience — intricate rooms, cunning riddles, total immersion.</p>
            </div>
            <div className="entertainment-card" onClick={() => setEntertainmentType('puzzle')}>
              <span className="entertainment-card-icon">🧩</span>
              <h3 className="entertainment-card-title">Jigsaw Puzzle</h3>
              <p className="entertainment-card-desc">A beautiful AI-painted image cut into classic jigsaw pieces — drag, snap, and solve.</p>
            </div>
            <div className="entertainment-card" onClick={() => setEntertainmentType('game')}>
              <span className="entertainment-card-icon">🎮</span>
              <h3 className="entertainment-card-title">Online Game</h3>
              <p className="entertainment-card-desc">Craft a playable game — puzzles, platformers, adventures, visual novels, and more.</p>
            </div>
          </div>
        </div>
      )}

      {/* Feature cards + action buttons shown after picking type */}
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
                ⚒️ FORGE MY OWN
              </button>
              <span className="forge-btn-tooltip">
                {entertainmentType === 'adventure'
                  ? 'Walk through each step — you pick the genre, theme, art style, and story seed'
                  : entertainmentType === 'comic'
                  ? 'Walk through each step — you pick the genre, theme, art style, and story'
                  : 'Walk through each step — you pick the genre, theme, art style, and story'}
              </span>
            </div>
            <div className="landing-btn-wrapper">
              <button className="forge-btn forge-btn-auto" onClick={() => onAutoForge(entertainmentType)}>
                🤖 FORGE FOR ME
              </button>
              <span className="forge-btn-tooltip">
                Let Gemini AI choose everything and build you a surprise {entertainmentType === 'adventure' ? 'adventure' : entertainmentType === 'comic' ? 'comic' : entertainmentType === 'escape' ? 'escape room' : entertainmentType === 'puzzle' ? 'puzzle' : 'game'}
              </span>
            </div>
          </div>

          <button className="landing-type-switch" onClick={() => setEntertainmentType(null)}>
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

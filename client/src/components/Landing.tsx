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
  { icon: '⚡', title: 'One-Click Build', desc: 'Kotlin/Canvas code generated and compiled into a real APK.' },
  { icon: '📱', title: 'Instant Deploy', desc: 'Push your game straight to your Android phone over USB.' },
];

const ADVENTURE_FEATURES = [
  { icon: '📚', title: 'Pick Your Genre', desc: 'Space opera, spooky mystery, deep sea, jungle, time travel.' },
  { icon: '🤖', title: 'AI-Written Prose', desc: 'Gemini writes vivid second-person narrative with branching paths.' },
  { icon: '🖼️', title: 'Illustrated Pages', desc: 'Imagen generates atmospheric art for key moments.' },
  { icon: '📖', title: 'Instant Play', desc: 'Your adventure loads right in the browser — no install needed.' },
];

export function Landing({ onStart, onAutoForge, onLibrary, libraryCount }: LandingProps) {
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ available: boolean; hint: string } | null>(null);
  const [entertainmentType, setEntertainmentType] = useState<EntertainmentType | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTaglineVisible(true), 300);
    fetch('/api/gemini/status')
      .then((r) => r.json())
      .then((data) => setGeminiStatus(data))
      .catch(() => setGeminiStatus({ available: false, hint: 'Server unreachable' }));
    return () => clearTimeout(timer);
  }, []);

  const features = entertainmentType === 'adventure' ? ADVENTURE_FEATURES : GAME_FEATURES;
  const tagline = entertainmentType === 'adventure'
    ? 'Forge Your Adventure. You Are the Hero.'
    : 'Forge Your Game. No Code Required.';

  return (
    <div className="landing">
      <div className="landing-logo">⚒️</div>
      <h1 className="landing-title">BELLFORGE</h1>
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
          <h2 className="entertainment-prompt">What are you forging today?</h2>
          <div className="entertainment-cards">
            <div className="entertainment-card" onClick={() => setEntertainmentType('game')}>
              <span className="entertainment-card-icon">🎮</span>
              <h3 className="entertainment-card-title">Android Game</h3>
              <p className="entertainment-card-desc">Point & click, puzzle, platformer — a real playable game with AI art.</p>
            </div>
            <div className="entertainment-card" onClick={() => setEntertainmentType('adventure')}>
              <span className="entertainment-card-icon">📚</span>
              <h3 className="entertainment-card-title">Choose Your Own Adventure</h3>
              <p className="entertainment-card-desc">A branching illustrated storybook — you make the choices.</p>
            </div>
          </div>
        </div>
      )}

      {/* Feature cards + action buttons shown after picking type */}
      {entertainmentType && (
        <>
          <div className="landing-features">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
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
                  : 'Walk through each step — you pick the genre, theme, art style, and story'}
              </span>
            </div>
            <div className="landing-btn-wrapper">
              <button className="forge-btn forge-btn-auto" onClick={() => onAutoForge(entertainmentType)}>
                🤖 FORGE FOR ME
              </button>
              <span className="forge-btn-tooltip">
                Let Gemini AI choose everything and build you a surprise {entertainmentType === 'adventure' ? 'adventure' : 'game'}
              </span>
            </div>
          </div>

          <button className="landing-type-switch" onClick={() => setEntertainmentType(null)}>
            ← Switch to {entertainmentType === 'game' ? 'Adventure' : 'Game'}
          </button>
        </>
      )}

      <button className={`landing-library-link ${libraryCount > 0 ? 'has-games' : ''}`} onClick={onLibrary}>
        📚 {libraryCount > 0 ? `Your Library — ${libraryCount} Creation${libraryCount !== 1 ? 's' : ''} Forged` : 'View Your Library'}
      </button>
    </div>
  );
}

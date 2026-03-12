import { useEffect, useState } from 'react';

interface LandingProps {
  onStart: () => void;
  onAutoForge: () => void;
  onLibrary: () => void;
  libraryCount: number;
}

const FEATURES = [
  { icon: '🎮', title: 'Choose Your Genre', desc: 'Point & click, puzzle, platformer, visual novel — pick your path.' },
  { icon: '🤖', title: 'AI-Powered Art', desc: 'Gemini AI Bridge generates beautiful, stylized game assets.' },
  { icon: '⚡', title: 'One-Click Build', desc: 'Kotlin/Canvas code generated and compiled into a real APK.' },
  { icon: '📱', title: 'Instant Deploy', desc: 'Push your game straight to your Android phone over USB.' },
];

export function Landing({ onStart, onAutoForge, onLibrary, libraryCount }: LandingProps) {
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ available: boolean; hint: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTaglineVisible(true), 300);
    fetch('/api/gemini/status')
      .then((r) => r.json())
      .then((data) => setGeminiStatus(data))
      .catch(() => setGeminiStatus({ available: false, hint: 'Server unreachable' }));
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing">
      <div className="landing-logo">⚒️</div>
      <h1 className="landing-title">BELLFORGE</h1>
      <p className={`landing-tagline ${taglineVisible ? 'visible' : ''}`}>
        Forge Your Game. No Code Required.
      </p>

      {geminiStatus && (
        <div className={`gemini-status ${geminiStatus.available ? 'gemini-online' : 'gemini-offline'}`}>
          <span className="gemini-status-dot">{geminiStatus.available ? '🟢' : '🟡'}</span>
          <span className="gemini-status-text">{geminiStatus.hint}</span>
        </div>
      )}

      <div className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="landing-buttons">
        <div className="landing-btn-wrapper">
          <button className="forge-btn forge-btn-manual" onClick={onStart}>
            ⚒️ FORGE MY OWN
          </button>
          <span className="forge-btn-tooltip">Walk through each step — you pick the genre, theme, art style, and story</span>
        </div>
        <div className="landing-btn-wrapper">
          <button className="forge-btn forge-btn-auto" onClick={onAutoForge}>
            🤖 FORGE FOR ME
          </button>
          <span className="forge-btn-tooltip">Let Gemini AI choose everything and build you a surprise game</span>
        </div>
      </div>

      <button className={`landing-library-link ${libraryCount > 0 ? 'has-games' : ''}`} onClick={onLibrary}>
        📚 {libraryCount > 0 ? `Your Library — ${libraryCount} Game${libraryCount !== 1 ? 's' : ''} Forged` : 'View Your Library'}
      </button>
    </div>
  );
}

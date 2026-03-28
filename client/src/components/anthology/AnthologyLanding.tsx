import { useState } from 'react';

const GENRES = [
  { id: 'gumshoe', label: 'Gumshoe',  icon: '🔍' },
  { id: 'fantasy', label: 'Fantasy',  icon: '⚔️'  },
  { id: 'scifi',   label: 'Sci-Fi',   icon: '🚀'  },
  { id: 'horror',  label: 'Horror',   icon: '🕷️'  },
  { id: 'random',  label: 'Surprise', icon: '🎲'  },
] as const;

type GenreId = typeof GENRES[number]['id'];

interface Props {
  onGenerate: (seed: string, genre: string) => void;
  onBack: () => void;
}

export default function AnthologyLanding({ onGenerate, onBack }: Props) {
  const [seed, setSeed]   = useState('');
  const [genre, setGenre] = useState<GenreId>('gumshoe');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(seed.trim(), genre);
  };

  return (
    <div className="phase landing">
      <div className="landing-vignette" aria-hidden="true" />

      <div className="landing-card">
        <div className="brand">
          <h1 className="brand-title">BellAnthologies</h1>
          <div className="brand-rule" aria-hidden="true" />
          <h2 className="brand-subtitle">The Investigator</h2>
          <p className="brand-tagline">
            Every lie leaves a fingerprint.<br />
            Can you find it before they do?
          </p>
        </div>

        {/* Genre picker */}
        <div className="genre-section">
          <span className="genre-label">Genre</span>
          <div className="genre-grid" role="group" aria-label="Select genre">
            {GENRES.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`btn-genre${genre === g.id ? ' selected' : ''}`}
                onClick={() => setGenre(g.id)}
                aria-pressed={genre === g.id}
              >
                <span className="genre-icon" aria-hidden="true">{g.icon}</span>
                <span className="genre-name">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="seed-form" onSubmit={handleSubmit}>
          <label className="seed-label" htmlFor="seed-input">
            Seed the mystery{' '}
            <span className="optional">(optional)</span>
          </label>
          <input
            id="seed-input"
            type="text"
            className="seed-input"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="e.g. 1940s New Orleans, a missing heir..."
            maxLength={120}
            autoComplete="off"
          />
          <button type="submit" className="btn-generate">
            <span className="btn-icon" aria-hidden="true">⚿</span>
            Open the Case File
          </button>
        </form>

        <footer className="landing-footer">
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--c-ash)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: 0,
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--c-stone)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--c-ash)')}
          >
            ← Back to BellForge
          </button>
        </footer>
      </div>
    </div>
  );
}

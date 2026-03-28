import { useState } from 'react';
import type { VaultConfig, SinType } from '../../types';

interface Props {
  onForge: (config: VaultConfig) => void;
  onBack: () => void;
}

const SINS: { id: SinType; label: string; icon: string; tagline: string }[] = [
  { id: 'greed',    label: 'Greed',    icon: '💰', tagline: 'What you hoard shall consume you.' },
  { id: 'betrayal', label: 'Betrayal', icon: '🗡️',  tagline: 'Every knife thrust returns tenfold.' },
  { id: 'cruelty',  label: 'Cruelty',  icon: '👁️',  tagline: 'The torturer learns how it feels.' },
  { id: 'hubris',   label: 'Hubris',   icon: '👑',  tagline: 'Pride carves the deepest grave.' },
  { id: 'lust',     label: 'Lust',     icon: '🕷️',  tagline: 'The chase becomes the trap.' },
  { id: 'cowardice',label: 'Cowardice',icon: '🕯️',  tagline: 'Flee long enough and it finds you.' },
];

export default function VaultLanding({ onForge, onBack }: Props) {
  const [premise, setPremise] = useState('');
  const [sinType, setSinType] = useState<SinType>('greed');
  const [hoveredSin, setHoveredSin] = useState<SinType | null>(null);

  const displayedSin = SINS.find(s => s.id === (hoveredSin || sinType))!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onForge({ premise: premise.trim() || `A tale of ${sinType}`, sinType });
  };

  return (
    <div className="vault-landing">
      <div className="vault-vignette" aria-hidden="true" />

      <div className="vault-card">
        {/* Brand */}
        <div className="vault-brand">
          <div className="vault-publisher">BellForge Comics</div>
          <h1 className="vault-title">Tales From The Forge</h1>
          <div className="vault-rule" aria-hidden="true" />
          <p className="vault-bellman-quote">
            "Another visitor? Come in, come in...<br />
            The Bellman has been expecting you."
          </p>
        </div>

        {/* Sin Picker */}
        <div className="vault-section">
          <span className="vault-section-label">Choose The Sin</span>
          <div className="vault-sin-grid">
            {SINS.map((s) => (
              <button
                key={s.id}
                type="button"
                data-sin={s.id}
                className={`vault-sin-btn${sinType === s.id ? ' selected' : ''}`}
                onClick={() => setSinType(s.id)}
                onMouseEnter={() => setHoveredSin(s.id)}
                onMouseLeave={() => setHoveredSin(null)}
                aria-pressed={sinType === s.id}
              >
                <div className="vault-sin-img-wrap">
                  <img
                    src={`/card-art/sins/${s.id}.png`}
                    alt={s.label}
                    className="vault-sin-img"
                    draggable={false}
                  />
                </div>
                <span className="vault-sin-name">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="vault-sin-tagline">
            {displayedSin.tagline}
          </div>
        </div>

        {/* Premise Input */}
        <form onSubmit={handleSubmit} className="vault-section">
          <label className="vault-section-label" htmlFor="vault-premise">
            Describe The Sinner's Act
          </label>
          <textarea
            id="vault-premise"
            className="vault-premise-input"
            value={premise}
            onChange={e => setPremise(e.target.value)}
            placeholder="Optional: A greedy landlord who evicts a widow in a blizzard to build a luxury spa on her land..."
            rows={3}
            maxLength={400}
            aria-describedby="vault-premise-hint"
          />
          <div className="vault-premise-hint" id="vault-premise-hint">
            {premise.length}/400 — Optional. Leave blank and The Bellman will choose your sinner’s crime.
          </div>

          <button
            type="submit"
            className="vault-forge-btn"
          >
            <span className="vault-forge-icon">⚒️</span>
            Summon The Bellman
          </button>
        </form>

        {/* Back link */}
        <button className="vault-back-btn" onClick={onBack} type="button">
          ← Back to BellForge
        </button>
      </div>
    </div>
  );
}

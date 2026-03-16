import { useState } from 'react';
import type { JumbleCategoryOption } from '../../types';
import { JUMBLE_CATEGORIES } from '../../types';

interface JumbleCategoryStepProps {
  selected: JumbleCategoryOption | null;
  onSelect: (s: JumbleCategoryOption) => void;
}

export function JumbleCategoryStep({ selected, onSelect }: JumbleCategoryStepProps) {
  const [customText, setCustomText] = useState(selected?.id === 'custom' ? selected.description : '');

  function handleCustomConfirm() {
    if (!customText.trim()) return;
    onSelect({
      id: 'custom',
      name: customText.trim(),
      icon: '✨',
      description: customText.trim(),
      tag: 'NEW',
    });
  }

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Pick a Topic</h2>
        <p className="step-subtitle">What should the jumble words be about?</p>
      </div>

      <div className="options-grid">
        {JUMBLE_CATEGORIES.map((s) => (
          <div
            key={s.id}
            className={`option-card ${selected?.id === s.id ? 'selected' : ''}`}
            onClick={() => {
              if (s.id === 'custom') {
                onSelect({ ...s, name: customText.trim() || 'Custom Topic', description: customText.trim() || s.description });
              } else {
                onSelect(s);
              }
            }}
          >
            <span className="option-icon">{s.icon}</span>
            <div className="option-name">
              {s.name}
              {s.tag && (
                <span className={`option-tag ${s.tag.toLowerCase()}`}>
                  {s.tag}
                </span>
              )}
            </div>
            <p className="option-desc">{s.description}</p>
          </div>
        ))}
      </div>

      {selected?.id === 'custom' && (
        <div className="custom-input-area" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Describe your topic
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomConfirm(); }}
            placeholder="e.g. Beach vacation, Space exploration..."
            autoFocus
            style={{
              width: '100%', maxWidth: '500px', padding: '14px 18px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px', color: '#e0e0e0', fontSize: '1rem',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button
            onClick={handleCustomConfirm}
            disabled={!customText.trim()}
            style={{
              padding: '10px 28px', background: customText.trim() ? 'var(--forge-orange)' : 'rgba(255,255,255,0.1)',
              color: customText.trim() ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
              border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem',
              cursor: customText.trim() ? 'pointer' : 'not-allowed', letterSpacing: '1px',
            }}
          >
            ✨ Use This Topic
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { PuzzleSubjectOption } from '../../types';
import { PUZZLE_SUBJECTS } from '../../types';

interface PuzzleSubjectStepProps {
  selected: PuzzleSubjectOption | null;
  onSelect: (s: PuzzleSubjectOption) => void;
}

export function PuzzleSubjectStep({ selected, onSelect }: PuzzleSubjectStepProps) {
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
        <h2 className="step-title">What's the picture?</h2>
        <p className="step-subtitle">Pick a subject for your jigsaw puzzle image.</p>
      </div>

      <div className="options-grid">
        {PUZZLE_SUBJECTS.map((s) => (
          <div
            key={s.id}
            className={`option-card ${selected?.id === s.id ? 'selected' : ''}`}
            onClick={() => {
              if (s.id === 'custom') {
                // Select custom but don't auto-advance — wait for text input
                onSelect({ ...s, name: customText.trim() || 'Custom Subject', description: customText.trim() || s.description });
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
            Describe your puzzle image
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomConfirm(); }}
            placeholder="e.g. A serene Japanese garden in autumn..."
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
            ✨ Use This Subject
          </button>
        </div>
      )}
    </div>
  );
}

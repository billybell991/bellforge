import { useEffect } from 'react';
import type { EscapeStructureConfig } from '../../types';

interface EscapeStructureStepProps {
  value: EscapeStructureConfig;
  onChange: (s: EscapeStructureConfig) => void;
}

const ENVELOPE_PRESETS = [
  { label: 'Quick', count: 3 },
  { label: 'Standard', count: 4 },
  { label: 'Extended', count: 5 },
];

const DIFFICULTY_OPTIONS: { id: EscapeStructureConfig['difficulty']; label: string; desc: string }[] = [
  { id: 'casual', label: 'Casual', desc: '3-digit codes, generous hints, forgiving puzzles' },
  { id: 'standard', label: 'Standard', desc: '4-digit codes, moderate hints, balanced challenge' },
  { id: 'expert', label: 'Expert', desc: '5-digit codes, minimal hints, devious puzzles' },
];

const DURATION_PRESETS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

export function EscapeStructureStep({ value, onChange }: EscapeStructureStepProps) {
  useEffect(() => {
    if (value.envelopeCount < 3 || value.envelopeCount > 6) {
      onChange({ ...value, envelopeCount: 4 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Shape your escape</h2>
        <p className="step-subtitle">How many stages, how tough, and how long?</p>
      </div>

      <div className="structure-controls">
        {/* Envelope Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Number of Stages</span>
          <span className="control-value">{value.envelopeCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={3}
            max={6}
            value={value.envelopeCount}
            onChange={(e) => onChange({ ...value, envelopeCount: parseInt(e.target.value) })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {ENVELOPE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={`pill ${value.envelopeCount === preset.count ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, envelopeCount: preset.count })}
              >
                {preset.label} ({preset.count})
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Difficulty</span>
          <div className="option-row">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                className={`pill-card ${value.difficulty === opt.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, difficulty: opt.id })}
              >
                <strong>{opt.label}</strong>
                <span className="pill-card-desc">{opt.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Target Duration</span>
          <span className="control-value">{value.duration} minutes</span>
          <input
            type="range"
            className="forge-slider"
            min={15}
            max={120}
            step={5}
            value={value.duration}
            onChange={(e) => onChange({ ...value, duration: parseInt(e.target.value) })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={`pill ${value.duration === preset.value ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, duration: preset.value })}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

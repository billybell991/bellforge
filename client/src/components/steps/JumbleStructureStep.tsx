import type { JumbleStructureConfig } from '../../types';

interface JumbleStructureStepProps {
  value: JumbleStructureConfig;
  onChange: (s: JumbleStructureConfig) => void;
}

const DIFFICULTY_OPTIONS: { id: JumbleStructureConfig['difficulty']; label: string; desc: string }[] = [
  { id: 'easy', label: 'Easy', desc: 'Short, common words (4-6 letters) — great for warming up' },
  { id: 'medium', label: 'Medium', desc: 'A mix of common and moderately tricky words (5-7 letters)' },
  { id: 'hard', label: 'Hard', desc: 'Longer, more challenging words (6-9 letters) — brain buster!' },
];

const WORD_COUNT_PRESETS = [
  { label: '4', count: 4 },
  { label: '5', count: 5 },
  { label: '6', count: 6 },
];

export function JumbleStructureStep({ value, onChange }: JumbleStructureStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">How challenging?</h2>
        <p className="step-subtitle">Pick difficulty and how many words to unscramble.</p>
      </div>

      <div className="structure-controls">
        {/* Difficulty */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Difficulty</span>
          <div className="option-pills">
            {DIFFICULTY_OPTIONS.map((d) => (
              <button
                key={d.id}
                className={`pill ${value.difficulty === d.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, difficulty: d.id })}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="control-hint">
            {DIFFICULTY_OPTIONS.find((d) => d.id === value.difficulty)?.desc}
          </p>
        </div>

        {/* Word Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Number of Words</span>
          <span className="control-value">{value.wordCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={3}
            max={6}
            step={1}
            value={value.wordCount}
            onChange={(e) => onChange({ ...value, wordCount: parseInt(e.target.value) })}
          />
          <div className="preset-pills">
            {WORD_COUNT_PRESETS.map((p) => (
              <button
                key={p.count}
                className={`pill ${value.wordCount === p.count ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, wordCount: p.count })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

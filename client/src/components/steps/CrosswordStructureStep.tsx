import type { CrosswordStructureConfig } from '../../types';

interface CrosswordStructureStepProps {
  value: CrosswordStructureConfig;
  onChange: (s: CrosswordStructureConfig) => void;
}

const DIFFICULTY_OPTIONS: { id: CrosswordStructureConfig['difficulty']; label: string; desc: string }[] = [
  { id: 'easy', label: 'Easy', desc: 'Simple, straightforward clues — great for beginners' },
  { id: 'medium', label: 'Medium', desc: 'Moderately challenging — a satisfying solve' },
  { id: 'hard', label: 'Hard', desc: 'Tricky clues that require lateral thinking' },
];

const SIZE_PRESETS = [
  { label: '10×10', size: 10 },
  { label: '13×13', size: 13 },
  { label: '15×15', size: 15 },
];

const CLUE_PRESETS = [
  { label: '8', count: 8 },
  { label: '12', count: 12 },
  { label: '16', count: 16 },
  { label: '20', count: 20 },
];

export function CrosswordStructureStep({ value, onChange }: CrosswordStructureStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">How challenging?</h2>
        <p className="step-subtitle">Pick difficulty, grid size, and number of clues.</p>
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

        {/* Grid Size */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Grid Size</span>
          <span className="control-value">{value.gridSize}×{value.gridSize}</span>
          <input
            type="range"
            className="forge-slider"
            min={8}
            max={20}
            step={1}
            value={value.gridSize}
            onChange={(e) => onChange({ ...value, gridSize: parseInt(e.target.value) })}
          />
          <div className="preset-pills">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.size}
                className={`pill ${value.gridSize === p.size ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, gridSize: p.size })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clue Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Number of Clues</span>
          <span className="control-value">{value.clueCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={5}
            max={25}
            step={1}
            value={value.clueCount}
            onChange={(e) => onChange({ ...value, clueCount: parseInt(e.target.value) })}
          />
          <div className="preset-pills">
            {CLUE_PRESETS.map((p) => (
              <button
                key={p.count}
                className={`pill ${value.clueCount === p.count ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, clueCount: p.count })}
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

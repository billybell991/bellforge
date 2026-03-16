import type { WordSearchStructureConfig } from '../../types';

interface WordSearchStructureStepProps {
  value: WordSearchStructureConfig;
  onChange: (s: WordSearchStructureConfig) => void;
}

const GRID_PRESETS = [
  { label: '8×8', size: 8 },
  { label: '10×10', size: 10 },
  { label: '12×12', size: 12 },
  { label: '15×15', size: 15 },
];

const WORD_COUNT_PRESETS = [
  { label: '6', count: 6 },
  { label: '10', count: 10 },
  { label: '15', count: 15 },
  { label: '20', count: 20 },
];

export function WordSearchStructureStep({ value, onChange }: WordSearchStructureStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">How challenging?</h2>
        <p className="step-subtitle">Pick grid size, word count, and allowed directions.</p>
      </div>

      <div className="structure-controls">
        {/* Grid Size */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Grid Size</span>
          <span className="control-value">{value.gridSize}×{value.gridSize}</span>
          <input
            type="range"
            className="forge-slider"
            min={6}
            max={20}
            step={1}
            value={value.gridSize}
            onChange={(e) => onChange({ ...value, gridSize: parseInt(e.target.value) })}
          />
          <div className="preset-pills">
            {GRID_PRESETS.map((p) => (
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

        {/* Word Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Words to Find</span>
          <span className="control-value">{value.wordCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={4}
            max={25}
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

        {/* Diagonal toggle */}
        <div className="control-group">
          <span className="control-label">Diagonals</span>
          <div className="option-pills">
            <button
              className={`pill ${!value.allowDiagonals ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, allowDiagonals: false })}
            >
              Off
            </button>
            <button
              className={`pill ${value.allowDiagonals ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, allowDiagonals: true })}
            >
              On
            </button>
          </div>
          <p className="control-hint">
            {value.allowDiagonals ? 'Words can go diagonally — trickier!' : 'Words only go horizontal or vertical'}
          </p>
        </div>

        {/* Backwards toggle */}
        <div className="control-group">
          <span className="control-label">Backwards</span>
          <div className="option-pills">
            <button
              className={`pill ${!value.allowBackwards ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, allowBackwards: false })}
            >
              Off
            </button>
            <button
              className={`pill ${value.allowBackwards ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, allowBackwards: true })}
            >
              On
            </button>
          </div>
          <p className="control-hint">
            {value.allowBackwards ? 'Words can be spelled backwards — extra challenge!' : 'All words read forwards only'}
          </p>
        </div>
      </div>
    </div>
  );
}

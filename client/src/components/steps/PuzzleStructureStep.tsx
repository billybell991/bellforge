import type { PuzzleStructureConfig } from '../../types';

interface PuzzleStructureStepProps {
  value: PuzzleStructureConfig;
  onChange: (s: PuzzleStructureConfig) => void;
}

const PIECE_PRESETS = [
  { label: '3×3', count: 9 },
  { label: '5×5', count: 25 },
  { label: '7×7', count: 49 },
  { label: '10×10', count: 100 },
];

const DIFFICULTY_OPTIONS: { id: PuzzleStructureConfig['difficulty']; label: string; desc: string }[] = [
  { id: 'easy', label: 'Easy', desc: '9 pieces (3×3) — great for quick fun' },
  { id: 'medium', label: 'Medium', desc: '25 pieces (5×5) — a satisfying challenge' },
  { id: 'hard', label: 'Hard', desc: '49 pieces (7×7) — test your patience' },
  { id: 'expert', label: 'Expert', desc: '100 pieces (10×10) — the full experience' },
];

export function PuzzleStructureStep({ value, onChange }: PuzzleStructureStepProps) {
  const handleDifficulty = (d: PuzzleStructureConfig['difficulty']) => {
    const preset = DIFFICULTY_OPTIONS.find((o) => o.id === d);
    const count = d === 'easy' ? 9 : d === 'medium' ? 25 : d === 'hard' ? 49 : 100;
    onChange({ ...value, difficulty: d, pieceCount: count });
  };

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">How challenging?</h2>
        <p className="step-subtitle">Pick your difficulty and piece count.</p>
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
                onClick={() => handleDifficulty(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="control-hint">
            {DIFFICULTY_OPTIONS.find((d) => d.id === value.difficulty)?.desc}
          </p>
        </div>

        {/* Piece Count Slider */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Pieces</span>
          <span className="control-value">{value.pieceCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={9}
            max={100}
            step={1}
            value={value.pieceCount}
            onChange={(e) => onChange({ ...value, pieceCount: parseInt(e.target.value) })}
          />
          <div className="preset-pills">
            {PIECE_PRESETS.map((p) => (
              <button
                key={p.count}
                className={`pill ${value.pieceCount === p.count ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, pieceCount: p.count })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rotation Toggle */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Piece Rotation</span>
          <div className="option-pills">
            <button
              className={`pill ${!value.rotation ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, rotation: false })}
            >
              Off
            </button>
            <button
              className={`pill ${value.rotation ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, rotation: true })}
            >
              On
            </button>
          </div>
          <p className="control-hint">
            {value.rotation ? 'Pieces start rotated — you must orient them correctly too.' : 'Pieces only need to be dragged to the right spot.'}
          </p>
        </div>
      </div>
    </div>
  );
}

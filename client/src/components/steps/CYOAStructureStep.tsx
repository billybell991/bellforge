import { useEffect } from 'react';
import type { CYOAStructureConfig } from '../../types';

interface CYOAStructureStepProps {
  value: CYOAStructureConfig;
  onChange: (s: CYOAStructureConfig) => void;
}

const PAGE_PRESETS = [
  { label: 'Short Story', count: 15 },
  { label: 'Standard', count: 28 },
  { label: 'Epic', count: 45 },
];

const DEADLINESS_OPTIONS: { id: CYOAStructureConfig['deadliness']; label: string; desc: string }[] = [
  { id: 'low', label: 'Forgiving', desc: 'Mostly divergent paths, few deadly ends' },
  { id: 'medium', label: 'Balanced', desc: 'Some dead ends, consequential choices' },
  { id: 'high', label: 'Dangerous', desc: 'Many deadly endings, choose wisely' },
  { id: 'brutal', label: 'Brutal', desc: 'Death lurks behind nearly every wrong choice' },
];

const BRANCH_OPTIONS: { id: CYOAStructureConfig['branchDensity']; label: string; desc: string }[] = [
  { id: 'linear', label: 'Linear', desc: 'A few key decision points' },
  { id: 'forking', label: 'Forking', desc: 'Frequent meaningful choices' },
  { id: 'web', label: 'Web', desc: 'Densely branching, many paths to discover' },
];

export function CYOAStructureStep({ value, onChange }: CYOAStructureStepProps) {
  // Ensure defaults on mount
  useEffect(() => {
    if (value.pageCount < 10 || value.pageCount > 60) {
      onChange({ ...value, pageCount: 28 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Shape your adventure</h2>
        <p className="step-subtitle">How big, how deadly, and how branching?</p>
      </div>

      <div className="structure-controls">
        {/* Page Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Number of Pages</span>
          <span className="control-value">{value.pageCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={10}
            max={60}
            value={value.pageCount}
            onChange={(e) => onChange({ ...value, pageCount: parseInt(e.target.value) })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {PAGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={`pill ${value.pageCount === preset.count ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, pageCount: preset.count })}
              >
                {preset.label} ({preset.count})
              </button>
            ))}
          </div>
        </div>

        {/* Deadliness */}
        <div className="control-group">
          <span className="control-label">Deadliness</span>
          <div className="pill-group">
            {DEADLINESS_OPTIONS.map((d) => (
              <button
                key={d.id}
                className={`pill ${value.deadliness === d.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, deadliness: d.id })}
                title={d.desc}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Branch Density */}
        <div className="control-group">
          <span className="control-label">Branch Density</span>
          <div className="pill-group">
            {BRANCH_OPTIONS.map((b) => (
              <button
                key={b.id}
                className={`pill ${value.branchDensity === b.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, branchDensity: b.id })}
                title={b.desc}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { ComicStructureConfig } from '../../types';

interface ComicStructureStepProps {
  value: ComicStructureConfig;
  onChange: (s: ComicStructureConfig) => void;
}

const PAGE_PRESETS = [
  { label: 'One-Shot', count: 6 },
  { label: 'Standard Issue', count: 10 },
  { label: 'Double Issue', count: 16 },
];

const PANEL_STYLES: { id: ComicStructureConfig['panelStyle']; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Traditional American comic grids' },
  { id: 'manga', label: 'Manga', desc: 'Dynamic Japanese-style layouts' },
  { id: 'strip', label: 'Strip', desc: 'Horizontal newspaper-style rows' },
];

const TONE_OPTIONS: { id: ComicStructureConfig['tone']; label: string; desc: string }[] = [
  { id: 'action', label: 'Action', desc: 'Fast-paced, explosive, kinetic' },
  { id: 'dramatic', label: 'Dramatic', desc: 'Character-driven, emotional beats' },
  { id: 'comedic', label: 'Comedic', desc: 'Witty, irreverent, funny' },
  { id: 'horror', label: 'Horror', desc: 'Dread, suspense, body horror' },
];

export function ComicStructureStep({ value, onChange }: ComicStructureStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Shape your comic</h2>
        <p className="step-subtitle">How many pages, what layout style, and what tone?</p>
      </div>

      <div className="structure-controls">
        {/* Page Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Number of Pages</span>
          <span className="control-value">{value.pageCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={4}
            max={24}
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

        {/* Panel Style */}
        <div className="control-group">
          <span className="control-label">Panel Style</span>
          <div className="pill-group">
            {PANEL_STYLES.map((ps) => (
              <button
                key={ps.id}
                className={`pill ${value.panelStyle === ps.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, panelStyle: ps.id })}
                title={ps.desc}
              >
                {ps.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="control-group">
          <span className="control-label">Tone</span>
          <div className="pill-group">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.id}
                className={`pill ${value.tone === t.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, tone: t.id })}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { EscapeThemeOption } from '../../types';
import { ESCAPE_THEMES } from '../../types';

interface EscapeThemeStepProps {
  selected: EscapeThemeOption | null;
  onSelect: (t: EscapeThemeOption) => void;
}

export function EscapeThemeStep({ selected, onSelect }: EscapeThemeStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Choose your scenario</h2>
        <p className="step-subtitle">What kind of escape room are you locked inside?</p>
      </div>

      <div className="options-grid">
        {ESCAPE_THEMES.map((t) => (
          <div
            key={t.id}
            className={`option-card ${selected?.id === t.id ? 'selected' : ''}`}
            onClick={() => onSelect(t)}
          >
            <span className="option-icon">{t.icon}</span>
            <div className="option-name">
              {t.name}
              {t.tag && (
                <span className={`option-tag ${t.tag.toLowerCase()}`}>
                  {t.tag}
                </span>
              )}
            </div>
            <p className="option-desc">{t.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

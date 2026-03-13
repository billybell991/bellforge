import type { ThemeOption } from '../../types';
import { THEMES } from '../../types';

interface ThemeStepProps {
  selected: ThemeOption | null;
  onSelect: (theme: ThemeOption) => void;
}

export function ThemeStep({ selected, onSelect }: ThemeStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Set the mood</h2>
        <p className="step-subtitle">Choose a theme that defines the world and atmosphere.</p>
      </div>

      <div className="options-grid">
        {THEMES.map((theme) => (
          <div
            key={theme.id}
            className={`option-card ${selected?.id === theme.id ? 'selected' : ''}`}
            onClick={() => onSelect(theme)}
            style={{
              borderBottomColor: selected?.id === theme.id ? theme.color : undefined,
              borderBottomWidth: selected?.id === theme.id ? '3px' : undefined,
            }}
          >
            <span className="option-icon">{theme.icon}</span>
            <div className="option-name">{theme.name}</div>
            <p className="option-desc">{theme.description}</p>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: theme.color,
                opacity: selected?.id === theme.id ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

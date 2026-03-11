import type { ArtStyleOption } from '../../types';
import { ART_STYLES } from '../../types';

interface ArtStyleStepProps {
  selected: ArtStyleOption | null;
  onSelect: (style: ArtStyleOption) => void;
}

export function ArtStyleStep({ selected, onSelect }: ArtStyleStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Pick your art style</h2>
        <p className="step-subtitle">
          This drives how the AI Bridge renders every asset in your game.
        </p>
      </div>

      <div className="options-grid">
        {ART_STYLES.map((style) => (
          <div
            key={style.id}
            className={`option-card ${selected?.id === style.id ? 'selected' : ''}`}
            onClick={() => onSelect(style)}
          >
            <span className="option-icon">{style.icon}</span>
            <div className="option-name">
              {style.name}
              {style.recommended && (
                <span className="option-tag recommended">RECOMMENDED</span>
              )}
            </div>
            <p className="option-desc">{style.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

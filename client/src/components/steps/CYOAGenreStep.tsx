import type { CYOAGenreOption } from '../../types';
import { CYOA_GENRES } from '../../types';

interface CYOAGenreStepProps {
  selected: CYOAGenreOption | null;
  onSelect: (genre: CYOAGenreOption) => void;
}

export function CYOAGenreStep({ selected, onSelect }: CYOAGenreStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">What kind of adventure?</h2>
        <p className="step-subtitle">Pick the world your reader will explore.</p>
      </div>

      <div className="options-grid">
        {CYOA_GENRES.map((genre) => (
          <div
            key={genre.id}
            className={`option-card ${selected?.id === genre.id ? 'selected' : ''}`}
            onClick={() => onSelect(genre)}
          >
            <span className="option-icon">{genre.icon}</span>
            <div className="option-name">
              {genre.name}
              {genre.tag && (
                <span className={`option-tag ${genre.tag.toLowerCase()}`}>
                  {genre.tag}
                </span>
              )}
            </div>
            <p className="option-desc">{genre.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

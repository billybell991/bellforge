import type { GenreOption } from '../../types';
import { GENRES } from '../../types';

interface GenreStepProps {
  selected: GenreOption | null;
  onSelect: (genre: GenreOption) => void;
}

export function GenreStep({ selected, onSelect }: GenreStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">What kind of game?</h2>
        <p className="step-subtitle">Pick the genre that speaks to your vision.</p>
      </div>

      <div className="options-grid">
        {GENRES.map((genre) => (
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

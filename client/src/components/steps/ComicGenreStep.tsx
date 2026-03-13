import type { ComicGenreOption } from '../../types';
import { COMIC_GENRES } from '../../types';

interface ComicGenreStepProps {
  selected: ComicGenreOption | null;
  onSelect: (genre: ComicGenreOption) => void;
}

export function ComicGenreStep({ selected, onSelect }: ComicGenreStepProps) {
  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">What kind of story?</h2>
        <p className="step-subtitle">Pick the story archetype — the theme step sets the world &amp; atmosphere.</p>
      </div>

      <div className="options-grid">
        {COMIC_GENRES.map((genre) => (
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

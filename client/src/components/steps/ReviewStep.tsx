import type { GenreOption, ThemeOption, ArtStyleOption, StructureConfig, StoryConfig, WizardStep } from '../../types';

interface ReviewStepProps {
  genre: GenreOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: StructureConfig;
  story: StoryConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
}

export function ReviewStep({ genre, theme, artStyle, structure, story, onEditStep, onForge }: ReviewStepProps) {
  const ready = genre && theme && artStyle && story.title;

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Blueprint</h2>
        <p className="step-subtitle">
          Everything looks good? Hit the forge button and watch the magic happen.
        </p>
      </div>

      <div className="review-grid">
        {/* Genre */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Genre</span>
            <button className="review-edit-btn" onClick={() => onEditStep('genre')}>
              EDIT
            </button>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{genre?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{genre?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{genre?.description}</div>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Theme</span>
            <button className="review-edit-btn" onClick={() => onEditStep('theme')}>
              EDIT
            </button>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{theme?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{theme?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{theme?.description}</div>
            </div>
          </div>
        </div>

        {/* Art Style */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Art Style</span>
            <button className="review-edit-btn" onClick={() => onEditStep('artStyle')}>
              EDIT
            </button>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{artStyle?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{artStyle?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{artStyle?.description}</div>
            </div>
          </div>
        </div>

        {/* Structure */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Structure</span>
            <button className="review-edit-btn" onClick={() => onEditStep('structure')}>
              EDIT
            </button>
          </div>
          <div className="review-value">
            <span className="review-value-icon">🏗️</span>
            <div>
              <div className="review-value-text">
                {structure.roomCount} {
                  genre?.id === 'visual_novel' ? 'Chapters'
                  : genre?.id === 'interactive_fiction' ? 'Passages'
                  : genre?.id === 'hidden_object' ? 'Scenes'
                  : (genre?.id === 'platformer' || genre?.id === 'puzzle') ? 'Levels'
                  : 'Rooms'
                }
              </div>
              <div className="review-value-desc">
                {structure.difficulty} difficulty · {structure.puzzleDensity} density
              </div>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="review-card" style={{ gridColumn: '1 / -1' }}>
          <div className="review-card-header">
            <span className="review-card-title">Story</span>
            <button className="review-edit-btn" onClick={() => onEditStep('story')}>
              EDIT
            </button>
          </div>
          <div className="review-value">
            <span className="review-value-icon">📝</span>
            <div>
              <div className="review-value-text">
                {story.title || 'Untitled Game'}
              </div>
              <div className="review-value-desc">
                {story.characterName && <>Character: {story.characterName}<br /></>}
                {story.setting && <>Setting: {story.setting}<br /></>}
                {story.description && <>{story.description}</>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forge Button */}
      <div className="forge-it-section">
        <button
          className="forge-it-btn"
          onClick={onForge}
          disabled={!ready}
        >
          ⚒️ FORGE IT
        </button>
        {!ready && (
          <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '0.9rem' }}>
            Complete all steps above before forging.
          </p>
        )}
      </div>

      {/* Back */}
      <div className="wizard-nav">
        <button className="nav-btn back" onClick={() => onEditStep('story')}>
          ← Back
        </button>
        <div />
      </div>
    </div>
  );
}

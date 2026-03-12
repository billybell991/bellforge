import { useState, useCallback } from 'react';
import type { GenreOption, ThemeOption, ArtStyleOption, StructureConfig, StoryConfig, WizardStep } from '../../types';
import { GENRES, THEMES, ART_STYLES } from '../../types';

interface ReviewStepProps {
  genre: GenreOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: StructureConfig;
  story: StoryConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onGenreChange?: (g: GenreOption) => void;
  onThemeChange?: (t: ThemeOption) => void;
  onArtStyleChange?: (a: ArtStyleOption) => void;
  onStructureChange?: (s: StructureConfig) => void;
  onStoryChange?: (s: StoryConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

const DIFFICULTIES = ['casual', 'standard', 'challenging'] as const;
const DENSITIES = ['light', 'moderate', 'heavy'] as const;

export function ReviewStep({ genre, theme, artStyle, structure, story, onEditStep, onForge,
  onGenreChange, onThemeChange, onArtStyleChange, onStructureChange, onStoryChange }: ReviewStepProps) {
  const ready = genre && theme && artStyle && story.title;
  const [confirmForge, setConfirmForge] = useState(false);
  const [rerollingStory, setRerollingStory] = useState(false);

  const rerollGenre = useCallback(() => {
    onGenreChange?.(pickDifferent(GENRES, genre));
  }, [genre, onGenreChange]);

  const rerollTheme = useCallback(() => {
    onThemeChange?.(pickDifferent(THEMES, theme));
  }, [theme, onThemeChange]);

  const rerollArtStyle = useCallback(() => {
    onArtStyleChange?.(pickDifferent(ART_STYLES, artStyle));
  }, [artStyle, onArtStyleChange]);

  const rerollStructure = useCallback(() => {
    const newCount = 4 + Math.floor(Math.random() * 9);
    const newDiff = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
    const newDensity = DENSITIES[Math.floor(Math.random() * DENSITIES.length)];
    onStructureChange?.({ roomCount: newCount, difficulty: newDiff, puzzleDensity: newDensity });
  }, [onStructureChange]);

  const rerollStory = useCallback(async () => {
    if (rerollingStory) return;
    setRerollingStory(true);
    try {
      const res = await fetch('/api/gemini/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: genre?.name, theme: theme?.name }),
      });
      if (res.ok) {
        const s = await res.json();
        onStoryChange?.(s);
      }
    } catch { /* keep existing story */ }
    setRerollingStory(false);
  }, [genre, theme, rerollingStory, onStoryChange]);

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
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollGenre} title="Reroll genre">
                🎲
              </button>
              <button className="review-edit-btn" onClick={() => onEditStep('genre')}>
                EDIT
              </button>
            </div>
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
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollTheme} title="Reroll theme">
                🎲
              </button>
              <button className="review-edit-btn" onClick={() => onEditStep('theme')}>
                EDIT
              </button>
            </div>
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
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollArtStyle} title="Reroll art style">
                🎲
              </button>
              <button className="review-edit-btn" onClick={() => onEditStep('artStyle')}>
                EDIT
              </button>
            </div>
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
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollStructure} title="Reroll structure">
                🎲
              </button>
              <button className="review-edit-btn" onClick={() => onEditStep('structure')}>
                EDIT
              </button>
            </div>
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
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollStory} disabled={rerollingStory} title="Reroll story (Gemini)">
                {rerollingStory ? '⏳' : '🎲'}
              </button>
              <button className="review-edit-btn" onClick={() => onEditStep('story')}>
                EDIT
              </button>
            </div>
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
        {!confirmForge ? (
          <button
            className="forge-it-btn"
            onClick={() => setConfirmForge(true)}
            disabled={!ready}
          >
            ⚒️ FORGE IT
          </button>
        ) : (
          <div className="forge-confirm">
            <p className="forge-confirm-text">Ready to start building? This will fire up the forge.</p>
            <div className="forge-confirm-actions">
              <button className="forge-confirm-yes" onClick={onForge}>
                🔥 Light the Forge
              </button>
              <button className="forge-confirm-no" onClick={() => setConfirmForge(false)}>
                ← Wait, let me tweak
              </button>
            </div>
          </div>
        )}
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

import { useState, useCallback } from 'react';
import type { ComicGenreOption, ThemeOption, ArtStyleOption, ComicStructureConfig, StoryConfig, WizardStep } from '../../types';
import { COMIC_GENRES, THEMES, ART_STYLES } from '../../types';

interface ComicReviewStepProps {
  comicGenre: ComicGenreOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: ComicStructureConfig;
  story: StoryConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onGenreChange?: (g: ComicGenreOption) => void;
  onThemeChange?: (t: ThemeOption) => void;
  onArtStyleChange?: (a: ArtStyleOption) => void;
  onStructureChange?: (s: ComicStructureConfig) => void;
  onStoryChange?: (s: StoryConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

const PANEL_OPTS = ['classic', 'manga', 'strip'] as const;
const TONE_OPTS = ['action', 'dramatic', 'comedic', 'horror'] as const;

export function ComicReviewStep({ comicGenre, theme, artStyle, structure, story, onEditStep, onForge,
  onGenreChange, onThemeChange, onArtStyleChange, onStructureChange, onStoryChange }: ComicReviewStepProps) {
  const ready = comicGenre && theme && artStyle && story.title;
  const [rerollingStory, setRerollingStory] = useState(false);

  const rerollGenre = useCallback(() => {
    onGenreChange?.(pickDifferent(COMIC_GENRES, comicGenre));
  }, [comicGenre, onGenreChange]);

  const rerollTheme = useCallback(() => {
    onThemeChange?.(pickDifferent(THEMES, theme));
  }, [theme, onThemeChange]);

  const rerollArtStyle = useCallback(() => {
    onArtStyleChange?.(pickDifferent(ART_STYLES, artStyle));
  }, [artStyle, onArtStyleChange]);

  const rerollStructure = useCallback(() => {
    const newCount = 4 + Math.floor(Math.random() * 21);
    const newPanel = PANEL_OPTS[Math.floor(Math.random() * PANEL_OPTS.length)];
    const newTone = TONE_OPTS[Math.floor(Math.random() * TONE_OPTS.length)];
    onStructureChange?.({ pageCount: newCount, panelStyle: newPanel, tone: newTone });
  }, [onStructureChange]);

  const rerollStory = useCallback(async () => {
    if (rerollingStory) return;
    setRerollingStory(true);
    try {
      const res = await fetch('/api/gemini/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genreHint: comicGenre?.name, themeHint: theme?.name }),
      });
      if (res.ok) {
        const s = await res.json();
        if (s.story) onStoryChange?.(s.story);
      }
    } catch { /* keep existing story */ }
    setRerollingStory(false);
  }, [comicGenre, theme, rerollingStory, onStoryChange]);

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Comic</h2>
        <p className="step-subtitle">
          Everything looks good? Hit the forge button and your comic takes shape.
        </p>
      </div>

      <div className="review-grid">
        {/* Genre */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Genre</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollGenre} title="Reroll genre">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('genre')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{comicGenre?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{comicGenre?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{comicGenre?.description}</div>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Theme</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollTheme} title="Reroll theme">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('theme')}>EDIT</button>
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
              <button className="review-reroll-btn" onClick={rerollArtStyle} title="Reroll art style">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('artStyle')}>EDIT</button>
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
              <button className="review-reroll-btn" onClick={rerollStructure} title="Reroll structure">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('structure')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">📐</span>
            <div>
              <div className="review-value-text">{structure.pageCount} Pages</div>
              <div className="review-value-desc">
                {structure.panelStyle} panels · {structure.tone} tone
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
              <button className="review-edit-btn" onClick={() => onEditStep('story')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">📝</span>
            <div>
              <div className="review-value-text">{story.title || 'Untitled Comic'}</div>
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
        <button className="forge-it-btn" onClick={onForge} disabled={!ready}>
          🔥 Forge the Comic
        </button>
        {!ready && (
          <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '0.9rem' }}>
            Complete all steps above before forging.
          </p>
        )}
      </div>

      <div className="wizard-nav">
        <button className="nav-btn back" onClick={() => onEditStep('story')}>
          ← Back
        </button>
        <div />
      </div>
    </div>
  );
}

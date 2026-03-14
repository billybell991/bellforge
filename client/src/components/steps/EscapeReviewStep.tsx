import { useState, useCallback } from 'react';
import type { EscapeThemeOption, ThemeOption, ArtStyleOption, EscapeStructureConfig, StoryConfig, WizardStep } from '../../types';
import { ESCAPE_THEMES, THEMES, ART_STYLES } from '../../types';

interface EscapeReviewStepProps {
  escapeTheme: EscapeThemeOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: EscapeStructureConfig;
  story: StoryConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onEscapeThemeChange?: (t: EscapeThemeOption) => void;
  onThemeChange?: (t: ThemeOption) => void;
  onArtStyleChange?: (a: ArtStyleOption) => void;
  onStructureChange?: (s: EscapeStructureConfig) => void;
  onStoryChange?: (s: StoryConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

const DIFFICULTY_OPTS = ['casual', 'standard', 'expert'] as const;

export function EscapeReviewStep({ escapeTheme, theme, artStyle, structure, story, onEditStep, onForge,
  onEscapeThemeChange, onThemeChange, onArtStyleChange, onStructureChange, onStoryChange }: EscapeReviewStepProps) {
  const ready = escapeTheme && theme && artStyle && story.title;
  const [rerollingStory, setRerollingStory] = useState(false);

  const rerollEscapeTheme = useCallback(() => {
    onEscapeThemeChange?.(pickDifferent(ESCAPE_THEMES, escapeTheme));
  }, [escapeTheme, onEscapeThemeChange]);

  const rerollTheme = useCallback(() => {
    onThemeChange?.(pickDifferent(THEMES, theme));
  }, [theme, onThemeChange]);

  const rerollArtStyle = useCallback(() => {
    onArtStyleChange?.(pickDifferent(ART_STYLES, artStyle));
  }, [artStyle, onArtStyleChange]);

  const rerollStructure = useCallback(() => {
    const newCount = 3 + Math.floor(Math.random() * 4);
    const newDiff = DIFFICULTY_OPTS[Math.floor(Math.random() * DIFFICULTY_OPTS.length)];
    const newDuration = [30, 45, 60, 90][Math.floor(Math.random() * 4)];
    onStructureChange?.({ envelopeCount: newCount, difficulty: newDiff, duration: newDuration });
  }, [onStructureChange]);

  const rerollStory = useCallback(async () => {
    if (rerollingStory) return;
    setRerollingStory(true);
    try {
      const res = await fetch('/api/gemini/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genreHint: escapeTheme?.name, themeHint: theme?.name }),
      });
      if (res.ok) {
        const s = await res.json();
        if (s.story) onStoryChange?.(s.story);
      }
    } catch { /* keep existing story */ }
    setRerollingStory(false);
  }, [escapeTheme, theme, rerollingStory, onStoryChange]);

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Escape Room</h2>
        <p className="step-subtitle">
          Everything looks good? Hit the forge button and your escape room takes shape.
        </p>
      </div>

      <div className="review-grid">
        {/* Scenario */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Scenario</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollEscapeTheme} title="Randomize scenario">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('genre')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{escapeTheme?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{escapeTheme?.name ?? 'Not selected'}</div>
            </div>
          </div>
        </div>

        {/* Atmosphere */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Atmosphere</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollTheme} title="Randomize atmosphere">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('theme')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{theme?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{theme?.name ?? 'Not selected'}</div>
            </div>
          </div>
        </div>

        {/* Art Style */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Art Style</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollArtStyle} title="Randomize art style">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('artStyle')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{artStyle?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{artStyle?.name ?? 'Not selected'}</div>
            </div>
          </div>
        </div>

        {/* Structure */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Structure</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollStructure} title="Randomize structure">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('structure')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">🏗️</span>
            <div>
              <div className="review-value-text">{structure.envelopeCount} stages · {structure.difficulty}</div>
              <div className="review-value-desc">{structure.duration} min</div>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="review-card review-card-wide">
          <div className="review-card-header">
            <span className="review-card-title">Story</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollStory} title="Generate new story idea" disabled={rerollingStory}>
                {rerollingStory ? '⏳' : '🎲'}
              </button>
              <button className="review-edit-btn" onClick={() => onEditStep('story')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">📖</span>
            <div>
              <div className="review-value-text">{story.title || 'Untitled'}</div>
              {story.description && <div className="review-value-desc">{story.description}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-forge-area">
        <button className="forge-btn forge-btn-primary" onClick={onForge} disabled={!ready}>
          ⚒️ FORGE THIS ESCAPE ROOM
        </button>
        {!ready && <p className="forge-hint">Complete all steps to unlock the forge.</p>}
      </div>
    </div>
  );
}

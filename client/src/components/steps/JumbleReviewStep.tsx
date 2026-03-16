import { useCallback } from 'react';
import type { JumbleCategoryOption, JumbleStructureConfig, WizardStep } from '../../types';
import { JUMBLE_CATEGORIES } from '../../types';

interface JumbleReviewStepProps {
  jumbleCategory: JumbleCategoryOption | null;
  structure: JumbleStructureConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onCategoryChange?: (s: JumbleCategoryOption) => void;
  onStructureChange?: (s: JumbleStructureConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

export function JumbleReviewStep({ jumbleCategory, structure, onEditStep, onForge,
  onCategoryChange, onStructureChange }: JumbleReviewStepProps) {
  const ready = !!jumbleCategory;

  const rerollCategory = useCallback(() => {
    onCategoryChange?.(pickDifferent(JUMBLE_CATEGORIES.filter((c) => c.id !== 'custom'), jumbleCategory));
  }, [jumbleCategory, onCategoryChange]);

  const rerollStructure = useCallback(() => {
    const counts = [4, 5, 6];
    const diffs: JumbleStructureConfig['difficulty'][] = ['easy', 'medium', 'hard'];
    onStructureChange?.({
      wordCount: counts[Math.floor(Math.random() * counts.length)],
      difficulty: diffs[Math.floor(Math.random() * diffs.length)],
    });
  }, [onStructureChange]);

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Jumble</h2>
        <p className="step-subtitle">
          Looking good? Hit forge and your jumble puzzle takes shape — complete with a cartoon!
        </p>
      </div>

      <div className="review-grid">
        {/* Category */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Topic</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollCategory} title="Randomize topic">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('genre')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{jumbleCategory?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{jumbleCategory?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{jumbleCategory?.description}</div>
            </div>
          </div>
        </div>

        {/* Structure */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Settings</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollStructure} title="Randomize settings">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('structure')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">🔀</span>
            <div>
              <div className="review-value-text">{structure.wordCount} words to unscramble</div>
              <div className="review-value-desc">{structure.difficulty} difficulty</div>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-forge-area">
        <button className="forge-btn forge-btn-primary" onClick={onForge} disabled={!ready}>
          <img src="/bellforge-logo.png" alt="" style={{ width: 20, height: 'auto', verticalAlign: 'middle', marginRight: 6 }} /> FORGE THIS JUMBLE
        </button>
        {!ready && <p className="forge-hint">Pick a topic to unlock the forge.</p>}
      </div>
    </div>
  );
}

import { useCallback } from 'react';
import type { CrosswordCategoryOption, CrosswordStructureConfig, WizardStep } from '../../types';
import { CROSSWORD_CATEGORIES } from '../../types';

interface CrosswordReviewStepProps {
  crosswordCategory: CrosswordCategoryOption | null;
  structure: CrosswordStructureConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onCategoryChange?: (s: CrosswordCategoryOption) => void;
  onStructureChange?: (s: CrosswordStructureConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

export function CrosswordReviewStep({ crosswordCategory, structure, onEditStep, onForge,
  onCategoryChange, onStructureChange }: CrosswordReviewStepProps) {
  const ready = !!crosswordCategory;

  const rerollCategory = useCallback(() => {
    onCategoryChange?.(pickDifferent(CROSSWORD_CATEGORIES.filter((c) => c.id !== 'custom'), crosswordCategory));
  }, [crosswordCategory, onCategoryChange]);

  const rerollStructure = useCallback(() => {
    const sizes = [10, 13, 15];
    const counts = [8, 12, 16, 20];
    const diffs: CrosswordStructureConfig['difficulty'][] = ['easy', 'medium', 'hard'];
    onStructureChange?.({
      gridSize: sizes[Math.floor(Math.random() * sizes.length)],
      clueCount: counts[Math.floor(Math.random() * counts.length)],
      difficulty: diffs[Math.floor(Math.random() * diffs.length)],
    });
  }, [onStructureChange]);

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Crossword</h2>
        <p className="step-subtitle">
          Looking good? Hit forge and your crossword takes shape.
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
            <span className="review-value-icon">{crosswordCategory?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{crosswordCategory?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{crosswordCategory?.description}</div>
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
            <span className="review-value-icon">✏️</span>
            <div>
              <div className="review-value-text">{structure.gridSize}×{structure.gridSize} grid · {structure.clueCount} clues</div>
              <div className="review-value-desc">{structure.difficulty} difficulty</div>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-forge-area">
        <button className="forge-btn forge-btn-primary" onClick={onForge} disabled={!ready}>
          <img src="/bellforge-logo.png" alt="" style={{ width: 20, height: 'auto', verticalAlign: 'middle', marginRight: 6 }} /> FORGE THIS CROSSWORD
        </button>
        {!ready && <p className="forge-hint">Pick a topic to unlock the forge.</p>}
      </div>
    </div>
  );
}

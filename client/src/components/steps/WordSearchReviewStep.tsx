import { useCallback } from 'react';
import type { WordSearchCategoryOption, WordSearchStructureConfig, WizardStep } from '../../types';
import { WORDSEARCH_CATEGORIES } from '../../types';

interface WordSearchReviewStepProps {
  wordSearchCategory: WordSearchCategoryOption | null;
  structure: WordSearchStructureConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onCategoryChange?: (s: WordSearchCategoryOption) => void;
  onStructureChange?: (s: WordSearchStructureConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

export function WordSearchReviewStep({ wordSearchCategory, structure, onEditStep, onForge,
  onCategoryChange, onStructureChange }: WordSearchReviewStepProps) {
  const ready = !!wordSearchCategory;

  const rerollCategory = useCallback(() => {
    onCategoryChange?.(pickDifferent(WORDSEARCH_CATEGORIES.filter((c) => c.id !== 'custom'), wordSearchCategory));
  }, [wordSearchCategory, onCategoryChange]);

  const rerollStructure = useCallback(() => {
    const sizes = [8, 10, 12, 15];
    const counts = [6, 10, 15, 20];
    onStructureChange?.({
      gridSize: sizes[Math.floor(Math.random() * sizes.length)],
      wordCount: counts[Math.floor(Math.random() * counts.length)],
      allowDiagonals: Math.random() > 0.5,
      allowBackwards: Math.random() > 0.5,
    });
  }, [onStructureChange]);

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Word Search</h2>
        <p className="step-subtitle">
          Looking good? Hit forge and your word search takes shape.
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
            <span className="review-value-icon">{wordSearchCategory?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{wordSearchCategory?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{wordSearchCategory?.description}</div>
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
            <span className="review-value-icon">🔤</span>
            <div>
              <div className="review-value-text">{structure.gridSize}×{structure.gridSize} grid · {structure.wordCount} words</div>
              <div className="review-value-desc">
                diagonals {structure.allowDiagonals ? 'on' : 'off'} · backwards {structure.allowBackwards ? 'on' : 'off'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-forge-area">
        <button className="forge-btn forge-btn-primary" onClick={onForge} disabled={!ready}>
          <img src="/bellforge-logo.png" alt="" style={{ width: 20, height: 'auto', verticalAlign: 'middle', marginRight: 6 }} /> FORGE THIS WORD SEARCH
        </button>
        {!ready && <p className="forge-hint">Pick a topic to unlock the forge.</p>}
      </div>
    </div>
  );
}

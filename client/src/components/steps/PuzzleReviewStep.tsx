import { useState, useCallback } from 'react';
import type { PuzzleSubjectOption, ArtStyleOption, PuzzleStructureConfig, WizardStep } from '../../types';
import { PUZZLE_SUBJECTS, ART_STYLES } from '../../types';

interface PuzzleReviewStepProps {
  puzzleSubject: PuzzleSubjectOption | null;
  artStyle: ArtStyleOption | null;
  structure: PuzzleStructureConfig;
  onEditStep: (step: WizardStep) => void;
  onForge: () => void;
  onSubjectChange?: (s: PuzzleSubjectOption) => void;
  onArtStyleChange?: (a: ArtStyleOption) => void;
  onStructureChange?: (s: PuzzleStructureConfig) => void;
}

function pickDifferent<T extends { id: string }>(arr: T[], current: T | null): T {
  const others = current ? arr.filter((x) => x.id !== current.id) : arr;
  return others[Math.floor(Math.random() * others.length)];
}

export function PuzzleReviewStep({ puzzleSubject, artStyle, structure, onEditStep, onForge,
  onSubjectChange, onArtStyleChange, onStructureChange }: PuzzleReviewStepProps) {
  const ready = puzzleSubject && artStyle;

  const gridLabel = (() => {
    const sqrt = Math.round(Math.sqrt(structure.pieceCount));
    return `${sqrt}×${sqrt}`;
  })();

  const rerollSubject = useCallback(() => {
    onSubjectChange?.(pickDifferent(PUZZLE_SUBJECTS, puzzleSubject));
  }, [puzzleSubject, onSubjectChange]);

  const rerollArtStyle = useCallback(() => {
    onArtStyleChange?.(pickDifferent(ART_STYLES, artStyle));
  }, [artStyle, onArtStyleChange]);

  const rerollStructure = useCallback(() => {
    const counts = [9, 25, 49, 100];
    const diffs: PuzzleStructureConfig['difficulty'][] = ['easy', 'medium', 'hard', 'expert'];
    const pc = counts[Math.floor(Math.random() * counts.length)];
    const d = diffs[Math.floor(Math.random() * diffs.length)];
    onStructureChange?.({ pieceCount: pc, difficulty: d, rotation: Math.random() > 0.5 });
  }, [onStructureChange]);

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Review Your Puzzle</h2>
        <p className="step-subtitle">
          Looking good? Hit forge and your jigsaw takes shape.
        </p>
      </div>

      <div className="review-grid">
        {/* Subject */}
        <div className="review-card">
          <div className="review-card-header">
            <span className="review-card-title">Subject</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollSubject} title="Randomize subject">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('genre')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">{puzzleSubject?.icon ?? '❓'}</span>
            <div>
              <div className="review-value-text">{puzzleSubject?.name ?? 'Not selected'}</div>
              <div className="review-value-desc">{puzzleSubject?.description}</div>
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
            <span className="review-card-title">Difficulty</span>
            <div className="review-card-actions">
              <button className="review-reroll-btn" onClick={rerollStructure} title="Randomize difficulty">🎲</button>
              <button className="review-edit-btn" onClick={() => onEditStep('structure')}>EDIT</button>
            </div>
          </div>
          <div className="review-value">
            <span className="review-value-icon">🧩</span>
            <div>
              <div className="review-value-text">{structure.pieceCount} pieces ({gridLabel})</div>
              <div className="review-value-desc">{structure.difficulty} · rotation {structure.rotation ? 'on' : 'off'}</div>
            </div>
          </div>
        </div>


      </div>

      <div className="wizard-forge-area">
        <button className="forge-btn forge-btn-primary" onClick={onForge} disabled={!ready}>
          <img src="/bellforge-logo.png" alt="" style={{ width: 20, height: 'auto', verticalAlign: 'middle', marginRight: 6 }} /> FORGE THIS PUZZLE
        </button>
        {!ready && <p className="forge-hint">Pick a subject and art style to unlock the forge.</p>}
      </div>
    </div>
  );
}

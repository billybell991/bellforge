import { useState, useMemo, useCallback } from 'react';
import type { PuzzleSubjectOption, ArtStyleOption, PuzzleStructureConfig, WizardStep } from '../types';
import { PUZZLE_WIZARD_STEPS } from '../types';
import { PuzzleSubjectStep } from './steps/PuzzleSubjectStep';
import { ArtStyleStep } from './steps/ArtStyleStep';
import { PuzzleStructureStep } from './steps/PuzzleStructureStep';
import { PuzzleReviewStep } from './steps/PuzzleReviewStep';

interface PuzzleWizardContainerProps {
  puzzleSubject: PuzzleSubjectOption | null;
  artStyle: ArtStyleOption | null;
  structure: PuzzleStructureConfig;
  onSubjectChange: (s: PuzzleSubjectOption) => void;
  onArtStyleChange: (a: ArtStyleOption) => void;
  onStructureChange: (s: PuzzleStructureConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function PuzzleWizardContainer(props: PuzzleWizardContainerProps) {
  const allFilled = !!(props.puzzleSubject && props.artStyle);
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');

  const stepIndex = PUZZLE_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.puzzleSubject) done.add('genre');
    if (props.artStyle) done.add('artStyle');
    if (props.puzzleSubject && props.artStyle) done.add('structure');
    return done;
  }, [props.puzzleSubject, props.artStyle]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < PUZZLE_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(PUZZLE_WIZARD_STEPS[i].id)) return i;
    }
    return PUZZLE_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < PUZZLE_WIZARD_STEPS.length - 1) {
      setCurrentStep(PUZZLE_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(PUZZLE_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = PUZZLE_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = PUZZLE_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < PUZZLE_WIZARD_STEPS.length - 1 ? PUZZLE_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {PUZZLE_WIZARD_STEPS.map((step, i) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id) && !isActive;
          const isReachable = i <= highestUnlocked;
          const isLocked = !isReachable && !isActive;
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => isReachable && goToStep(step.id)}
                style={{ cursor: isReachable ? 'pointer' : 'not-allowed' }}
              >
                <div className="step-dot">{step.icon}</div>
                <span className="step-label">{step.label}</span>
              </div>
              {i < PUZZLE_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <PuzzleSubjectStep selected={props.puzzleSubject} onSelect={(s) => {
            props.onSubjectChange(s);
            // For custom: only advance when they've entered text (name won't be 'Custom Subject')
            const shouldAdvance = s.id !== 'custom' || (s.name && s.name !== 'Custom Subject');
            if (shouldAdvance) {
              setTimeout(() => {
                setCurrentStep((prev) => {
                  const idx = PUZZLE_WIZARD_STEPS.findIndex((st) => st.id === prev);
                  return idx < PUZZLE_WIZARD_STEPS.length - 1 ? PUZZLE_WIZARD_STEPS[idx + 1].id : prev;
                });
              }, 350);
            }
          }} />
        )}
        {currentStep === 'artStyle' && (
          <ArtStyleStep selected={props.artStyle} onSelect={(a) => selectAndAdvance(() => props.onArtStyleChange(a))} />
        )}
        {currentStep === 'structure' && (
          <PuzzleStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'review' && (
          <PuzzleReviewStep
            puzzleSubject={props.puzzleSubject}
            artStyle={props.artStyle}
            structure={props.structure}
            onEditStep={goToStep}
            onForge={props.onForge}
            onSubjectChange={props.onSubjectChange}
            onArtStyleChange={props.onArtStyleChange}
            onStructureChange={props.onStructureChange}
          />
        )}
      </div>

      {/* Navigation */}
      {currentStep !== 'review' && (
        <div className="wizard-nav">
          <button className="nav-btn back" onClick={goBack}>
            ← Back
          </button>
          <button className="nav-btn next" onClick={goNext} disabled={!canProceed}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

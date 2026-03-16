import { useState, useMemo, useCallback } from 'react';
import type { CrosswordCategoryOption, CrosswordStructureConfig, WizardStep } from '../types';
import { CROSSWORD_WIZARD_STEPS } from '../types';
import { CrosswordCategoryStep } from './steps/CrosswordCategoryStep';
import { CrosswordStructureStep } from './steps/CrosswordStructureStep';
import { CrosswordReviewStep } from './steps/CrosswordReviewStep';

interface CrosswordWizardContainerProps {
  crosswordCategory: CrosswordCategoryOption | null;
  structure: CrosswordStructureConfig;
  onCategoryChange: (s: CrosswordCategoryOption) => void;
  onStructureChange: (s: CrosswordStructureConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function CrosswordWizardContainer(props: CrosswordWizardContainerProps) {
  const allFilled = !!props.crosswordCategory;
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');

  const stepIndex = CROSSWORD_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.crosswordCategory) done.add('genre');
    if (props.crosswordCategory) done.add('structure');
    return done;
  }, [props.crosswordCategory]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < CROSSWORD_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(CROSSWORD_WIZARD_STEPS[i].id)) return i;
    }
    return CROSSWORD_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < CROSSWORD_WIZARD_STEPS.length - 1) {
      setCurrentStep(CROSSWORD_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(CROSSWORD_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = CROSSWORD_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = CROSSWORD_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < CROSSWORD_WIZARD_STEPS.length - 1 ? CROSSWORD_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {CROSSWORD_WIZARD_STEPS.map((step, i) => {
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
              {i < CROSSWORD_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <CrosswordCategoryStep selected={props.crosswordCategory} onSelect={(s) => {
            const shouldAdvance = s.id !== 'custom' || (s.name && s.name !== 'Custom Topic');
            if (shouldAdvance) {
              selectAndAdvance(() => props.onCategoryChange(s));
            } else {
              props.onCategoryChange(s);
            }
          }} />
        )}
        {currentStep === 'structure' && (
          <CrosswordStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'review' && (
          <CrosswordReviewStep
            crosswordCategory={props.crosswordCategory}
            structure={props.structure}
            onEditStep={goToStep}
            onForge={props.onForge}
            onCategoryChange={props.onCategoryChange}
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

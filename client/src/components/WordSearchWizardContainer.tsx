import { useState, useMemo, useCallback } from 'react';
import type { WordSearchCategoryOption, WordSearchStructureConfig, WizardStep } from '../types';
import { WORDSEARCH_WIZARD_STEPS } from '../types';
import { WordSearchCategoryStep } from './steps/WordSearchCategoryStep';
import { WordSearchStructureStep } from './steps/WordSearchStructureStep';
import { WordSearchReviewStep } from './steps/WordSearchReviewStep';

interface WordSearchWizardContainerProps {
  wordSearchCategory: WordSearchCategoryOption | null;
  structure: WordSearchStructureConfig;
  onCategoryChange: (s: WordSearchCategoryOption) => void;
  onStructureChange: (s: WordSearchStructureConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function WordSearchWizardContainer(props: WordSearchWizardContainerProps) {
  const allFilled = !!props.wordSearchCategory;
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');

  const stepIndex = WORDSEARCH_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.wordSearchCategory) done.add('genre');
    if (props.wordSearchCategory) done.add('structure');
    return done;
  }, [props.wordSearchCategory]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < WORDSEARCH_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(WORDSEARCH_WIZARD_STEPS[i].id)) return i;
    }
    return WORDSEARCH_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < WORDSEARCH_WIZARD_STEPS.length - 1) {
      setCurrentStep(WORDSEARCH_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(WORDSEARCH_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = WORDSEARCH_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = WORDSEARCH_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < WORDSEARCH_WIZARD_STEPS.length - 1 ? WORDSEARCH_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {WORDSEARCH_WIZARD_STEPS.map((step, i) => {
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
              {i < WORDSEARCH_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <WordSearchCategoryStep selected={props.wordSearchCategory} onSelect={(s) => {
            const shouldAdvance = s.id !== 'custom' || (s.name && s.name !== 'Custom Topic');
            if (shouldAdvance) {
              selectAndAdvance(() => props.onCategoryChange(s));
            } else {
              props.onCategoryChange(s);
            }
          }} />
        )}
        {currentStep === 'structure' && (
          <WordSearchStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'review' && (
          <WordSearchReviewStep
            wordSearchCategory={props.wordSearchCategory}
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

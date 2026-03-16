import { useState, useMemo, useCallback } from 'react';
import type { JumbleCategoryOption, JumbleStructureConfig, WizardStep } from '../types';
import { JUMBLE_WIZARD_STEPS } from '../types';
import { JumbleCategoryStep } from './steps/JumbleCategoryStep';
import { JumbleStructureStep } from './steps/JumbleStructureStep';
import { JumbleReviewStep } from './steps/JumbleReviewStep';

interface JumbleWizardContainerProps {
  jumbleCategory: JumbleCategoryOption | null;
  structure: JumbleStructureConfig;
  onCategoryChange: (s: JumbleCategoryOption) => void;
  onStructureChange: (s: JumbleStructureConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function JumbleWizardContainer(props: JumbleWizardContainerProps) {
  const allFilled = !!props.jumbleCategory;
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');

  const stepIndex = JUMBLE_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.jumbleCategory) done.add('genre');
    if (props.jumbleCategory) done.add('structure');
    return done;
  }, [props.jumbleCategory]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < JUMBLE_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(JUMBLE_WIZARD_STEPS[i].id)) return i;
    }
    return JUMBLE_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < JUMBLE_WIZARD_STEPS.length - 1) {
      setCurrentStep(JUMBLE_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(JUMBLE_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = JUMBLE_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = JUMBLE_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < JUMBLE_WIZARD_STEPS.length - 1 ? JUMBLE_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {JUMBLE_WIZARD_STEPS.map((step, i) => {
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
              {i < JUMBLE_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <JumbleCategoryStep selected={props.jumbleCategory} onSelect={(s) => {
            const shouldAdvance = s.id !== 'custom' || (s.name && s.name !== 'Custom Topic');
            if (shouldAdvance) {
              selectAndAdvance(() => props.onCategoryChange(s));
            } else {
              props.onCategoryChange(s);
            }
          }} />
        )}
        {currentStep === 'structure' && (
          <JumbleStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'review' && (
          <JumbleReviewStep
            jumbleCategory={props.jumbleCategory}
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

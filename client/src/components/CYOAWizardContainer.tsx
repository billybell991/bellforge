import { useState, useMemo, useCallback } from 'react';
import type { CYOAGenreOption, ThemeOption, ArtStyleOption, CYOAStructureConfig, StoryConfig, WizardStep } from '../types';
import { CYOA_WIZARD_STEPS } from '../types';
import { CYOAGenreStep } from './steps/CYOAGenreStep';
import { ThemeStep } from './steps/ThemeStep';
import { ArtStyleStep } from './steps/ArtStyleStep';
import { CYOAStructureStep } from './steps/CYOAStructureStep';
import { StoryStep } from './steps/StoryStep';
import { CYOAReviewStep } from './steps/CYOAReviewStep';

interface CYOAWizardContainerProps {
  cyoaGenre: CYOAGenreOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: CYOAStructureConfig;
  story: StoryConfig;
  onGenreChange: (g: CYOAGenreOption) => void;
  onThemeChange: (t: ThemeOption) => void;
  onArtStyleChange: (a: ArtStyleOption) => void;
  onStructureChange: (s: CYOAStructureConfig) => void;
  onStoryChange: (s: StoryConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function CYOAWizardContainer(props: CYOAWizardContainerProps) {
  const allFilled = !!(props.cyoaGenre && props.theme && props.artStyle && props.story.title);
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');

  const stepIndex = CYOA_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.cyoaGenre) done.add('genre');
    if (props.theme) done.add('theme');
    if (props.artStyle) done.add('artStyle');
    if (props.cyoaGenre && props.theme && props.artStyle) done.add('structure');
    if (props.story.title) done.add('story');
    return done;
  }, [props.cyoaGenre, props.theme, props.artStyle, props.story.title]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < CYOA_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(CYOA_WIZARD_STEPS[i].id)) return i;
    }
    return CYOA_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < CYOA_WIZARD_STEPS.length - 1) {
      setCurrentStep(CYOA_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(CYOA_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = CYOA_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = CYOA_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < CYOA_WIZARD_STEPS.length - 1 ? CYOA_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {CYOA_WIZARD_STEPS.map((step, i) => {
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
              {i < CYOA_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <CYOAGenreStep selected={props.cyoaGenre} onSelect={(g) => selectAndAdvance(() => props.onGenreChange(g))} />
        )}
        {currentStep === 'theme' && (
          <ThemeStep selected={props.theme} onSelect={(t) => selectAndAdvance(() => props.onThemeChange(t))} />
        )}
        {currentStep === 'artStyle' && (
          <ArtStyleStep selected={props.artStyle} onSelect={(a) => selectAndAdvance(() => props.onArtStyleChange(a))} />
        )}
        {currentStep === 'structure' && (
          <CYOAStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'story' && (
          <StoryStep
            value={props.story}
            onChange={props.onStoryChange}
            genreHint={props.cyoaGenre?.name}
            themeHint={props.theme?.name}
          />
        )}
        {currentStep === 'review' && (
          <CYOAReviewStep
            cyoaGenre={props.cyoaGenre}
            theme={props.theme}
            artStyle={props.artStyle}
            structure={props.structure}
            story={props.story}
            onEditStep={goToStep}
            onForge={props.onForge}
            onGenreChange={props.onGenreChange}
            onThemeChange={props.onThemeChange}
            onArtStyleChange={props.onArtStyleChange}
            onStructureChange={props.onStructureChange}
            onStoryChange={props.onStoryChange}
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

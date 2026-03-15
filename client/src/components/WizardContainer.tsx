import { useState, useMemo, useCallback } from 'react';
import type { GenreOption, ThemeOption, ArtStyleOption, StructureConfig, StoryConfig, WizardStep } from '../types';
import { WIZARD_STEPS } from '../types';
import { GenreStep } from './steps/GenreStep';
import { ThemeStep } from './steps/ThemeStep';
import { ArtStyleStep } from './steps/ArtStyleStep';
import { StructureStep } from './steps/StructureStep';
import { StoryStep } from './steps/StoryStep';
import { ReviewStep } from './steps/ReviewStep';

interface WizardContainerProps {
  genre: GenreOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: StructureConfig;
  story: StoryConfig;
  onGenreChange: (g: GenreOption) => void;
  onThemeChange: (t: ThemeOption) => void;
  onArtStyleChange: (a: ArtStyleOption) => void;
  onStructureChange: (s: StructureConfig) => void;
  onStoryChange: (s: StoryConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function WizardContainer(props: WizardContainerProps) {
  // If all steps are pre-filled (auto-forge), start at review
  const allFilled = !!(props.genre && props.theme && props.artStyle && props.story.title);
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');
  const [surpriseGenerating, setSurpriseGenerating] = useState(false);

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  // Determine which steps are completed
  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.genre) done.add('genre');
    if (props.theme) done.add('theme');
    if (props.artStyle) done.add('artStyle');
    // Structure has defaults, but only mark done once all prior steps are done
    if (props.genre && props.theme && props.artStyle) done.add('structure');
    if (props.story.title) done.add('story');
    return done;
  }, [props.genre, props.theme, props.artStyle, props.story.title]);

  // The highest step index the user has unlocked (completed all prior steps)
  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(WIZARD_STEPS[i].id)) return i;
    }
    return WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = WIZARD_STEPS.findIndex((s) => s.id === step);
    // Only allow jumping to completed steps or the next available one
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  // Auto-advance after single-pick steps (genre, theme, art style)
  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {WIZARD_STEPS.map((step, i) => {
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
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={`step-connector ${
                    completedSteps.has(step.id)
                      ? 'completed'
                      : ''
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <GenreStep selected={props.genre} onSelect={(g) => selectAndAdvance(() => props.onGenreChange(g))} />
        )}
        {currentStep === 'theme' && (
          <ThemeStep selected={props.theme} onSelect={(t) => selectAndAdvance(() => props.onThemeChange(t))} />
        )}
        {currentStep === 'artStyle' && (
          <ArtStyleStep selected={props.artStyle} onSelect={(a) => selectAndAdvance(() => props.onArtStyleChange(a))} />
        )}
        {currentStep === 'structure' && (
          <StructureStep value={props.structure} onChange={props.onStructureChange} genre={props.genre} />
        )}
        {currentStep === 'story' && (
          <StoryStep
            value={props.story}
            onChange={props.onStoryChange}
            genreHint={props.genre?.name}
            themeHint={props.theme?.name}
            hideButton
            onGeneratingChange={setSurpriseGenerating}
          />
        )}
        {currentStep === 'review' && (
          <ReviewStep
            genre={props.genre}
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
          {currentStep === 'story' && (
            <button className="surprise-btn" onClick={() => {
              setSurpriseGenerating(true);
              fetch('/api/gemini/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genreHint: props.genre?.name, themeHint: props.theme?.name }),
              }).then(r => r.json()).then(data => {
                if (data.story) props.onStoryChange(data.story);
              }).finally(() => setSurpriseGenerating(false));
            }} disabled={surpriseGenerating}>
              {surpriseGenerating ? '🤖 Weaving...' : '✨ Surprise Me'}
            </button>
          )}
          <button className="nav-btn next" onClick={goNext} disabled={!canProceed}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

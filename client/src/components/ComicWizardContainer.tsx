import { useState, useMemo, useCallback } from 'react';
import { useSurpriseLabel } from '../hooks/useSurpriseLabel';
import type { ComicGenreOption, ThemeOption, ArtStyleOption, ComicStructureConfig, StoryConfig, WizardStep } from '../types';
import { COMIC_WIZARD_STEPS } from '../types';
import { ComicGenreStep } from './steps/ComicGenreStep';
import { ThemeStep } from './steps/ThemeStep';
import { ArtStyleStep } from './steps/ArtStyleStep';
import { ComicStructureStep } from './steps/ComicStructureStep';
import { StoryStep } from './steps/StoryStep';
import { ComicReviewStep } from './steps/ComicReviewStep';

interface ComicWizardContainerProps {
  comicGenre: ComicGenreOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: ComicStructureConfig;
  story: StoryConfig;
  onGenreChange: (g: ComicGenreOption) => void;
  onThemeChange: (t: ThemeOption) => void;
  onArtStyleChange: (a: ArtStyleOption) => void;
  onStructureChange: (s: ComicStructureConfig) => void;
  onStoryChange: (s: StoryConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function ComicWizardContainer(props: ComicWizardContainerProps) {
  const allFilled = !!(props.comicGenre && props.theme && props.artStyle && props.story.title);
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');
  const [surpriseGenerating, setSurpriseGenerating] = useState(false);
  const surpriseLabel = useSurpriseLabel(surpriseGenerating);

  const stepIndex = COMIC_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.comicGenre) done.add('genre');
    if (props.theme) done.add('theme');
    if (props.artStyle) done.add('artStyle');
    if (props.comicGenre && props.theme && props.artStyle) done.add('structure');
    if (props.story.title) done.add('story');
    return done;
  }, [props.comicGenre, props.theme, props.artStyle, props.story.title]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < COMIC_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(COMIC_WIZARD_STEPS[i].id)) return i;
    }
    return COMIC_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < COMIC_WIZARD_STEPS.length - 1) {
      setCurrentStep(COMIC_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(COMIC_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = COMIC_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = COMIC_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < COMIC_WIZARD_STEPS.length - 1 ? COMIC_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {COMIC_WIZARD_STEPS.map((step, i) => {
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
              {i < COMIC_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <ComicGenreStep selected={props.comicGenre} onSelect={(g) => selectAndAdvance(() => props.onGenreChange(g))} />
        )}
        {currentStep === 'theme' && (
          <ThemeStep selected={props.theme} onSelect={(t) => selectAndAdvance(() => props.onThemeChange(t))} />
        )}
        {currentStep === 'artStyle' && (
          <ArtStyleStep selected={props.artStyle} onSelect={(a) => selectAndAdvance(() => props.onArtStyleChange(a))} />
        )}
        {currentStep === 'structure' && (
          <ComicStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'story' && (
          <StoryStep
            value={props.story}
            onChange={props.onStoryChange}
            genreHint={props.comicGenre?.name}
            themeHint={props.theme?.name}            entertainmentType="comic"            hideButton
            onGeneratingChange={setSurpriseGenerating}
          />
        )}
        {currentStep === 'review' && (
          <ComicReviewStep
            comicGenre={props.comicGenre}
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
            <button className={`surprise-btn${surpriseGenerating ? ' generating' : ''}`} onClick={() => {
              setSurpriseGenerating(true);
              fetch('/api/gemini/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genreHint: props.comicGenre?.name, themeHint: props.theme?.name }),
              }).then(r => r.json()).then(data => {
                if (data.story) props.onStoryChange(data.story);
              }).finally(() => setSurpriseGenerating(false));
            }} disabled={surpriseGenerating}>
              {surpriseLabel}
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

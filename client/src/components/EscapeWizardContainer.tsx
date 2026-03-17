import { useState, useMemo, useCallback } from 'react';
import { useSurpriseLabel } from '../hooks/useSurpriseLabel';
import type { EscapeThemeOption, ThemeOption, ArtStyleOption, EscapeStructureConfig, StoryConfig, WizardStep } from '../types';
import { ESCAPE_WIZARD_STEPS } from '../types';
import { EscapeThemeStep } from './steps/EscapeThemeStep';
import { ThemeStep } from './steps/ThemeStep';
import { ArtStyleStep } from './steps/ArtStyleStep';
import { EscapeStructureStep } from './steps/EscapeStructureStep';
import { StoryStep } from './steps/StoryStep';
import { EscapeReviewStep } from './steps/EscapeReviewStep';

// Theme × atmosphere coherence — mirrors server-side THEME_COHERENCE
const THEME_COHERENCE: Record<string, string[]> = {
  heist:       ['mystery', 'scifi', 'cyberpunk', 'noir', 'steampunk'],
  detective:   ['mystery', 'horror', 'cozy', 'noir', 'fantasy'],
  haunted:     ['horror', 'mystery', 'fantasy', 'postapoc'],
  laboratory:  ['scifi', 'horror', 'cyberpunk', 'postapoc', 'mystery'],
  shipwreck:   ['horror', 'mystery', 'scifi', 'postapoc', 'fantasy'],
  time_capsule:['mystery', 'cozy', 'steampunk', 'fantasy', 'scifi'],
};

interface EscapeWizardContainerProps {
  escapeTheme: EscapeThemeOption | null;
  theme: ThemeOption | null;
  artStyle: ArtStyleOption | null;
  structure: EscapeStructureConfig;
  story: StoryConfig;
  onEscapeThemeChange: (t: EscapeThemeOption) => void;
  onThemeChange: (t: ThemeOption) => void;
  onArtStyleChange: (a: ArtStyleOption) => void;
  onStructureChange: (s: EscapeStructureConfig) => void;
  onStoryChange: (s: StoryConfig) => void;
  onForge: () => void;
  onBack: () => void;
}

export function EscapeWizardContainer(props: EscapeWizardContainerProps) {
  const allFilled = !!(props.escapeTheme && props.theme && props.artStyle && props.story.title);
  const [currentStep, setCurrentStep] = useState<WizardStep>(allFilled ? 'review' : 'genre');
  const [surpriseGenerating, setSurpriseGenerating] = useState(false);
  const surpriseLabel = useSurpriseLabel(surpriseGenerating);

  const coherenceWarning = useMemo(() => {
    if (!props.escapeTheme || !props.theme) return null;
    const compatible = THEME_COHERENCE[props.escapeTheme.id] ?? [];
    if (compatible.includes(props.theme.id)) return null;
    return `"${props.theme.name}" is an unconventional mood for ${props.escapeTheme.name}. Gemini will creatively reconcile the clash — expect a bold, dissonant result.`;
  }, [props.escapeTheme, props.theme]);

  const stepIndex = ESCAPE_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  const completedSteps = useMemo(() => {
    const done = new Set<WizardStep>();
    if (props.escapeTheme) done.add('genre');
    if (props.theme) done.add('theme');
    if (props.artStyle) done.add('artStyle');
    if (props.escapeTheme && props.theme && props.artStyle) done.add('structure');
    if (props.story.title) done.add('story');
    return done;
  }, [props.escapeTheme, props.theme, props.artStyle, props.story.title]);

  const highestUnlocked = useMemo(() => {
    for (let i = 0; i < ESCAPE_WIZARD_STEPS.length; i++) {
      if (!completedSteps.has(ESCAPE_WIZARD_STEPS[i].id)) return i;
    }
    return ESCAPE_WIZARD_STEPS.length - 1;
  }, [completedSteps]);

  const canProceed = completedSteps.has(currentStep);

  function goNext() {
    if (stepIndex < ESCAPE_WIZARD_STEPS.length - 1) {
      setCurrentStep(ESCAPE_WIZARD_STEPS[stepIndex + 1].id);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setCurrentStep(ESCAPE_WIZARD_STEPS[stepIndex - 1].id);
    } else {
      props.onBack();
    }
  }

  function goToStep(step: WizardStep) {
    const targetIndex = ESCAPE_WIZARD_STEPS.findIndex((s) => s.id === step);
    if (targetIndex <= highestUnlocked) {
      setCurrentStep(step);
    }
  }

  const selectAndAdvance = useCallback((setter: () => void) => {
    setter();
    setTimeout(() => {
      setCurrentStep((prev) => {
        const idx = ESCAPE_WIZARD_STEPS.findIndex((s) => s.id === prev);
        return idx < ESCAPE_WIZARD_STEPS.length - 1 ? ESCAPE_WIZARD_STEPS[idx + 1].id : prev;
      });
    }, 350);
  }, []);

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <div className="step-indicator">
        {ESCAPE_WIZARD_STEPS.map((step, i) => {
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
              {i < ESCAPE_WIZARD_STEPS.length - 1 && (
                <div className={`step-connector ${completedSteps.has(step.id) ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="wizard-step" key={currentStep}>
        {currentStep === 'genre' && (
          <EscapeThemeStep selected={props.escapeTheme} onSelect={(t) => selectAndAdvance(() => props.onEscapeThemeChange(t))} />
        )}
        {currentStep === 'theme' && (
          <>
            {coherenceWarning && (
              <div style={{
                margin: '0 0 1rem 0',
                padding: '0.75rem 1rem',
                background: 'rgba(139, 69, 19, 0.15)',
                border: '1px solid rgba(139, 69, 19, 0.4)',
                borderRadius: '6px',
                fontSize: '0.82rem',
                color: '#c8956a',
                lineHeight: 1.5,
              }}>
                ⚠️ {coherenceWarning}
              </div>
            )}
            <ThemeStep selected={props.theme} onSelect={(t) => selectAndAdvance(() => props.onThemeChange(t))} />
          </>
        )}
        {currentStep === 'artStyle' && (
          <ArtStyleStep selected={props.artStyle} onSelect={(a) => selectAndAdvance(() => props.onArtStyleChange(a))} />
        )}
        {currentStep === 'structure' && (
          <EscapeStructureStep value={props.structure} onChange={props.onStructureChange} />
        )}
        {currentStep === 'story' && (
          <StoryStep
            value={props.story}
            onChange={props.onStoryChange}
            genreHint={props.escapeTheme?.name}
            themeHint={props.theme?.name}
            entertainmentType="escape"
            hideButton
            onGeneratingChange={setSurpriseGenerating}
          />
        )}
        {currentStep === 'review' && (
          <EscapeReviewStep
            escapeTheme={props.escapeTheme}
            theme={props.theme}
            artStyle={props.artStyle}
            structure={props.structure}
            story={props.story}
            onEditStep={goToStep}
            onForge={props.onForge}
            onEscapeThemeChange={props.onEscapeThemeChange}
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
                body: JSON.stringify({ genreHint: props.escapeTheme?.name, themeHint: props.theme?.name }),
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

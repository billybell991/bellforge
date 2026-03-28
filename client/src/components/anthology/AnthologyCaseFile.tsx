import { useState } from 'react';
import type { CaseData } from '../../types/anthology';
import { useTypewriter } from '../../hooks/useTypewriter';

interface Props {
  caseData: CaseData;
  onReveal: (theory: string) => void;
}

export default function AnthologyCaseFile({ caseData, onReveal }: Props) {
  const [theory, setTheory] = useState('');
  const [theoryOpen, setTheoryOpen] = useState(false);

  const { displayedText, isComplete } = useTypewriter(caseData.story, 14, 800);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theory.trim()) onReveal(theory.trim());
  };

  return (
    <div className="phase case-file">

      {/* ── Sticky Header ── */}
      <header className="case-header">
        <div className="case-header-left">
          <span className="case-number">{caseData.case_number}</span>
          <span className="case-setting">{caseData.setting}</span>
        </div>
        <h1 className="case-title">{caseData.case_title}</h1>
        <div className="case-header-right">
          <span className="case-detective">Det. {caseData.detective_name}</span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="case-content">

        {/* Crime Scene Photo */}
        <div className="evidence-wrapper">
          {caseData.image_base64 ? (
            <figure className="polaroid">
              <img
                src={`data:image/png;base64,${caseData.image_base64}`}
                alt="Crime scene photograph"
                className="polaroid-img"
              />
              <figcaption className="polaroid-label">
                EVIDENCE PHOTO — {caseData.case_number}
              </figcaption>
            </figure>
          ) : (
            <figure className="polaroid polaroid-empty">
              <div className="polaroid-empty-inner">
                <span className="polaroid-empty-icon" aria-hidden="true">❗</span>
                <span className="polaroid-empty-text">Photo Unavailable</span>
              </div>
              <figcaption className="polaroid-label">
                {caseData.case_number}
              </figcaption>
            </figure>
          )}
        </div>

        {/* Story / Case Notes */}
        <div className="story-wrapper">
          <div className="story-paper">
            <div className="story-stamp" aria-hidden="true">CONFIDENTIAL</div>
            <p className="story-text">
              {displayedText}
              {!isComplete && (
                <span className="typewriter-cursor" aria-hidden="true">|</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Question + Theory (appears after typewriter finishes) ── */}
      {isComplete && (
        <section className="theory-section">
          <div className="case-question">
            <span className="question-mark" aria-hidden="true">?</span>
            <p>{caseData.question}</p>
          </div>

          {!theoryOpen ? (
            <button
              className="btn-theory-trigger"
              onClick={() => setTheoryOpen(true)}
            >
              Submit My Theory
            </button>
          ) : (
            <form className="theory-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="theory-input">
                Your theory
              </label>
              <textarea
                id="theory-input"
                className="theory-input"
                value={theory}
                onChange={(e) => setTheory(e.target.value)}
                placeholder="Describe what you noticed…"
                rows={4}
                maxLength={1000}
                autoFocus
              />
              <button
                type="submit"
                className="btn-reveal"
                disabled={!theory.trim()}
              >
                Reveal the Truth
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

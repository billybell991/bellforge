import { useEffect, useState } from 'react';
import type { CaseData } from '../../types/anthology';

interface Props {
  caseData: CaseData;
  playerTheory: string;
  isCorrect: boolean | null;
  feedback: string;
  onNewCase: () => void;
}

export default function AnthologyReveal({ caseData, playerTheory, isCorrect, feedback, onNewCase }: Props) {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayFading, setOverlayFading] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setOverlayFading(true);
      setContentVisible(true);
    }, 600);
    const t2 = setTimeout(() => {
      setOverlayVisible(false);
    }, 1150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="phase reveal">
      {overlayVisible && (
        <div
          className={`reveal-ink-overlay${overlayFading ? ' fading' : ''}`}
          aria-hidden="true"
        />
      )}

      {contentVisible && (
        <div className="reveal-content">
          <div className="reveal-stamp" aria-hidden="true">CASE CLOSED</div>

          {isCorrect !== null && (
            <div
              className={`verdict-banner ${isCorrect ? 'verdict-correct' : 'verdict-wrong'}`}
              role="status"
              aria-live="polite"
            >
              <span className="verdict-icon" aria-hidden="true">
                {isCorrect ? '✓' : '✗'}
              </span>
              <div className="verdict-body">
                <span className="verdict-headline">
                  {isCorrect ? 'Deduction Confirmed' : 'Not Quite, Detective'}
                </span>
                <span className="verdict-subline">
                  {feedback || (isCorrect
                    ? 'You spotted the inconsistency. Well reasoned.'
                    : 'The flaw eluded you this time. Study the deduction below.')}
                </span>
              </div>
            </div>
          )}

          <h2 className="reveal-title">{caseData.case_title}</h2>

          {playerTheory && (
            <section className="reveal-section reveal-player-theory">
              <h3 className="reveal-section-label">Your Theory</h3>
              <p className="theory-text">&#8220;{playerTheory}&#8221;</p>
            </section>
          )}

          <section className="reveal-section reveal-flaw">
            <h3 className="reveal-section-label">The Flaw</h3>
            <p className="flaw-text">{caseData.the_flaw}</p>
          </section>

          <section className="reveal-section reveal-answer">
            <h3 className="reveal-section-label">The Deduction</h3>
            <p className="answer-text">{caseData.answer}</p>
          </section>

          <section className="reveal-section reveal-clues">
            <h3 className="reveal-section-label">Clues You May Have Missed</h3>
            <ul className="clue-list">
              {(caseData.clues_in_story ?? []).map((clue, i) => (
                <li key={i} className="clue-item">
                  <span className="clue-quote">&#8220;{clue}&#8221;</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="reveal-actions">
            <button className="btn-new-case" onClick={onNewCase}>
              <span aria-hidden="true">⚿</span> Open Another Case File
            </button>
          </div>

          <div className="reveal-case-ref" aria-label="Case reference">
            {caseData.case_number} — Det.&nbsp;{caseData.detective_name}
          </div>
        </div>
      )}
    </div>
  );
}

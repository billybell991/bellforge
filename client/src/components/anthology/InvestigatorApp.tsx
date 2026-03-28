import { useState, useCallback } from 'react';
import type { CaseData, AnthologyPhase } from '../../types/anthology';
import AnthologyLanding from './AnthologyLanding';
import AnthologyGenerating from './AnthologyGenerating';
import AnthologyGrading from './AnthologyGrading';
import AnthologyCaseFile from './AnthologyCaseFile';
import AnthologyReveal from './AnthologyReveal';

interface Props {
  onBack: () => void;
}

export default function InvestigatorApp({ onBack }: Props) {
  const [phase, setPhase] = useState<AnthologyPhase>('idle');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [playerTheory, setPlayerTheory] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (seed: string, genre: string) => {
    setError(null);
    setPhase('generating');
    try {
      const resp = await fetch('/api/anthology/generate/investigator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, genre }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server error ${resp.status}: ${text.slice(0, 200)}`);
      }
      const data: CaseData = await resp.json();
      setCaseData(data);
      setPhase('case_file');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred.');
      setPhase('idle');
    }
  }, []);

  const handleReveal = useCallback(async (theory: string) => {
    if (!caseData) return;
    setPlayerTheory(theory);
    setPhase('grading');
    try {
      const resp = await fetch('/api/anthology/grade/investigator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          the_flaw: caseData.the_flaw,
          answer: caseData.answer,
          player_theory: theory,
        }),
      });
      const result = resp.ok ? await resp.json() : { correct: false, feedback: '' };
      setIsCorrect(result.correct);
      setGradingFeedback(result.feedback ?? '');
    } catch {
      setIsCorrect(false);
      setGradingFeedback('');
    }
    setPhase('reveal');
  }, [caseData]);

  const handleNewCase = useCallback(() => {
    setCaseData(null);
    setPlayerTheory('');
    setIsCorrect(null);
    setGradingFeedback('');
    setPhase('idle');
  }, []);

  return (
    <div className="app-root">
      {error && (
        <div className="error-toast" role="alert">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}

      {phase === 'idle' && (
        <AnthologyLanding onGenerate={handleGenerate} onBack={onBack} />
      )}
      {phase === 'generating' && (
        <AnthologyGenerating />
      )}
      {phase === 'case_file' && caseData && (
        <AnthologyCaseFile caseData={caseData} onReveal={handleReveal} />
      )}
      {phase === 'grading' && (
        <AnthologyGrading genre={caseData?.genre} />
      )}
      {phase === 'reveal' && caseData && (
        <AnthologyReveal
          caseData={caseData}
          playerTheory={playerTheory}
          isCorrect={isCorrect}
          feedback={gradingFeedback}
          onNewCase={handleNewCase}
        />
      )}
    </div>
  );
}

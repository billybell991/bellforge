import { useState, useEffect, useRef } from 'react';

const GENERATING_MESSAGES = [
  '🤖 Asking Gemini for ideas...',
  '🧠 Brainstorming characters...',
  '🌍 Dreaming up a setting...',
  '✍️ Crafting the premise...',
  '🎭 Inventing a twist...',
  '🔮 Almost there...',
];

/**
 * Returns a label that cycles through descriptive messages while `generating` is true.
 * Shows elapsed seconds after a few cycles so the user knows it's still alive.
 */
export function useSurpriseLabel(generating: boolean): string {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!generating) {
      setIndex(0);
      setElapsed(0);
      return;
    }

    startRef.current = Date.now();

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 2500);

    return () => clearInterval(interval);
  }, [generating]);

  if (!generating) return '✨ Surprise Me — Generate with AI';

  const msg = GENERATING_MESSAGES[index];
  return elapsed >= 8 ? `${msg} (${elapsed}s)` : msg;
}

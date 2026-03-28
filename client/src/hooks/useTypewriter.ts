import { useState, useEffect, useRef } from 'react';

/**
 * Types out `text` one character at a time (with optional chunk size for
 * longer passages), returning the current visible slice and a completion flag.
 */
export function useTypewriter(
  text: string,
  speedMs: number = 14,
  startDelayMs: number = 700,
) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!text) return;

    setDisplayedText('');
    setIsComplete(false);
    indexRef.current = 0;

    // Longer stories tick in small chunks so it doesn't take forever
    const chunkSize = text.length > 600 ? 3 : 1;

    const startHandle = setTimeout(() => {
      const tick = () => {
        if (indexRef.current < text.length) {
          const next = Math.min(indexRef.current + chunkSize, text.length);
          setDisplayedText(text.slice(0, next));
          indexRef.current = next;
          timerRef.current = setTimeout(tick, speedMs);
        } else {
          setIsComplete(true);
        }
      };
      timerRef.current = setTimeout(tick, 0);
    }, startDelayMs);

    return () => {
      clearTimeout(startHandle);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speedMs, startDelayMs]);

  return { displayedText, isComplete };
}

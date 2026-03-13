import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import type { AppPage, EntertainmentType } from '../types';

interface DebugButtonProps {
  page: AppPage;
  entertainmentType: EntertainmentType;
  buildPercent: number;
  buildStageName: string;
}

export function DebugButton({ page, entertainmentType, buildPercent, buildStageName }: DebugButtonProps) {
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);

    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#050509',
        scale: 1,
        logging: false,
        useCORS: true,
      });

      const image = canvas.toDataURL('image/png');
      const state = {
        page,
        entertainmentType,
        buildPercent,
        buildStageName,
        url: window.location.href,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent,
      };

      const res = await fetch('/api/debug/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, state, timestamp: Date.now() }),
      });

      if (res.ok) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, page, entertainmentType, buildPercent, buildStageName]);

  return (
    <button
      className={`debug-screenshot-btn ${flash ? 'debug-flash' : ''}`}
      onClick={handleCapture}
      disabled={capturing}
      title="Save debug screenshot to qa-temp/ for VS Code"
    >
      {capturing ? '⏳' : flash ? '✅' : '📸'}
    </button>
  );
}

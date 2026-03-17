import { useState, useRef, useEffect, useCallback } from 'react';
import type { Orientation, QAReport, EntertainmentType } from '../types';
import { QAPanel } from './QAPanel';

interface GamePreviewProps {
  previewUrl: string;
  apkPath: string;
  apkSize: string;
  orientation: Orientation;
  onDeploy: () => void;
  onStartOver: () => void;
  onReForge?: () => void;
  qaReport?: QAReport | null;
  entertainmentType?: EntertainmentType;
}

export function GamePreview({ previewUrl, apkPath, apkSize, orientation, onDeploy, onStartOver, onReForge, qaReport, entertainmentType = 'game' }: GamePreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [qaDismissed, setQaDismissed] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const isAdventure = entertainmentType === 'adventure';
  const isComic = entertainmentType === 'comic';
  const isEscape = entertainmentType === 'escape';
  const isPuzzle = entertainmentType === 'puzzle';
  const isWordSearch = entertainmentType === 'wordsearch';
  const isCrossword = entertainmentType === 'crossword';
  const isJumble = entertainmentType === 'jumble';

  const titleLabel = isAdventure ? '📚 Your Adventure is Ready!'
    : isComic ? '💥 Your Comic is Ready!'
    : isEscape ? '🔑 Your Escape Room is Ready!'
    : isPuzzle ? '🧩 Your Puzzle is Ready!'
    : isWordSearch ? '🔍 Your Word Search is Ready!'
    : isCrossword ? '✏️ Your Crossword is Ready!'
    : isJumble ? '🔀 Your Jumble is Ready!'
    : '🎮 Your Game is Ready!';

  const subtitleLabel = isAdventure ? 'Your adventure book awaits — dive in and explore every path.'
    : isComic ? 'Your comic book is hot off the press — start reading!'
    : isEscape ? 'Step inside and start solving.'
    : isPuzzle ? 'Drag the pieces into place — can you complete the image?'
    : isWordSearch ? 'Find all the hidden words!'
    : isCrossword ? 'Fill in the grid — one clue at a time.'
    : isJumble ? 'Unscramble the words and solve the puzzle!'
    : 'Review the report, then play-test it right here.';

  // Sync fullscreen state with browser Fullscreen API events
  useEffect(() => {
    const handleChange = () => {
      const isFs = !!document.fullscreenElement;
      setFullscreen(isFs);
      // Notify puzzle iframe of fullscreen state
      if (isPuzzle && viewerRef.current) {
        const iframe = viewerRef.current.querySelector('iframe');
        iframe?.contentWindow?.postMessage({ type: 'fullscreen-state', fullscreen: isFs }, '*');
      }
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [isPuzzle]);

  // Listen for postMessage from puzzle iframe for fullscreen/exit
  useEffect(() => {
    if (!isPuzzle) return;
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'puzzle-fullscreen') {
        if (viewerRef.current && !document.fullscreenElement) {
          viewerRef.current.requestFullscreen().catch(() => {});
        }
      } else if (e.data?.type === 'puzzle-exit-fs') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [isPuzzle]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (viewerRef.current) {
      viewerRef.current.requestFullscreen();
    }
  }, []);

  // QA interstitial — show before the preview
  const showQaInterstitial = qaReport && qaReport.overallScore > 0 && !qaDismissed;

  if (showQaInterstitial) {
    return (
      <div className="qa-interstitial">
        <h1 className="preview-title">{titleLabel}</h1>
        <QAPanel report={qaReport} onDismiss={() => setQaDismissed(true)} entertainmentType={entertainmentType} />
      </div>
    );
  }

  return (
    <div className="preview-screen preview-screen-compact">
      {!isEscape && <h1 className="preview-title">{titleLabel}</h1>}
      {!isEscape && (
        <p className="preview-subtitle">
          {subtitleLabel}
        </p>
      )}

      {/* Auto-saved indicator */}
      <div className="preview-auto-saved">
        ✅ Automatically saved to your library
      </div>

      {/* Wide viewer — no phone emulator for any type */}
      <div ref={viewerRef} className={`comic-viewer-frame ${isEscape ? 'comic-viewer-landscape' : ''} ${fullscreen ? 'comic-viewer-fullscreen' : ''}`}>
        <iframe
          src={previewUrl}
          className="comic-viewer-screen"
          title={`${titleLabel.replace(/^\S+\s/, '')} Preview`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Controls */}
      <div className="preview-controls preview-controls-compact">
        {!isPuzzle && (
          <button
            className="preview-btn preview-btn-secondary"
            onClick={toggleFullscreen}
          >
            {fullscreen ? '✖️ Exit Fullscreen' : '🖥️ Fullscreen'}
          </button>
        )}
        {onReForge && (
          <button className="preview-btn preview-btn-secondary" onClick={onReForge}>
            🔄 Re-Forge
          </button>
        )}
        <button className="preview-btn preview-btn-secondary" onClick={onStartOver}>
          <img src="/bellforge-logo.png" alt="" style={{ width: 14, height: 'auto', verticalAlign: 'middle', marginRight: 4 }} /> New {isComic ? 'Comic' : isAdventure ? 'Adventure' : isPuzzle || isWordSearch || isCrossword || isJumble ? 'Puzzle' : 'Build'}
        </button>
      </div>
    </div>
  );
}

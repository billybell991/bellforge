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
  const viewerRef = useRef<HTMLDivElement>(null);
  const isLandscape = true;
  const isAdventure = entertainmentType === 'adventure';
  const isComic = entertainmentType === 'comic';
  const isEscape = entertainmentType === 'escape';
  const isPuzzle = entertainmentType === 'puzzle';
  const isNonGame = isAdventure || isComic || isEscape || isPuzzle;

  const titleLabel = isAdventure ? '📚 Your Adventure is Ready!'
    : isComic ? '💥 Your Comic is Ready!'
    : isEscape ? '🔑 Your Escape Room is Ready!'
    : isPuzzle ? '🧩 Your Puzzle is Ready!'
    : '🎮 Your Game is Ready!';

  const subtitleLabel = isAdventure ? 'Your adventure book awaits — dive in and explore every path.'
    : isComic ? 'Your comic book is hot off the press — start reading!'
    : isEscape ? 'Step inside and start solving.'
    : isPuzzle ? 'Drag the pieces into place — can you complete the image?'
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

  return (
    <div className="preview-screen">
      <h1 className="preview-title">{titleLabel}</h1>
      <p className="preview-subtitle">
        {subtitleLabel}
      </p>

      {/* QA Report — shown prominently before the preview */}
      {qaReport && qaReport.overallScore > 0 && (
        <QAPanel report={qaReport} />
      )}

      {/* Auto-saved indicator */}
      <div className="preview-auto-saved">
        ✅ Automatically saved to your library
      </div>

      {/* Non-game types: wide viewer (no phone frame) */}
      {isNonGame ? (
        <div ref={viewerRef} className={`comic-viewer-frame ${fullscreen ? 'comic-viewer-fullscreen' : ''}`}>
          <iframe
            src={previewUrl}
            className="comic-viewer-screen"
            title={isComic ? 'Comic Preview' : isAdventure ? 'Adventure Preview' : isEscape ? 'Escape Room Preview' : 'Puzzle Preview'}
            sandbox="allow-scripts"
          />
        </div>
      ) : (
        /* Phone frame with iframe */
        <div ref={viewerRef} className={`phone-frame ${isLandscape ? 'phone-landscape' : ''} ${fullscreen ? 'phone-fullscreen' : ''}`}>
          <div className="phone-notch" />
          <iframe
            src={previewUrl}
            className="phone-screen"
            title="Game Preview"
            sandbox="allow-scripts"
          />
          <div className="phone-home-bar" />
          {fullscreen && (
            <div className="fullscreen-hint">Press <kbd>Esc</kbd> to exit fullscreen</div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="preview-controls">
        {!isPuzzle && (
          <button
            className="preview-btn preview-btn-secondary"
            onClick={toggleFullscreen}
          >
            {fullscreen ? '✖️ Exit Fullscreen' : '🖥️ Fullscreen'}
          </button>
        )}
        {!isNonGame && (
          <button className="preview-btn preview-btn-primary preview-btn-disabled" disabled title="Real APK pipeline coming soon">
            📲 Push to Phone — Coming Soon
          </button>
        )}
      </div>

      {/* Info */}
      {!isNonGame && (
        <div className="preview-info">
          <span className="preview-info-item">📦 APK: {apkSize}</span>
          <span className="preview-info-item">📁 {apkPath.split('\\').pop()}</span>
        </div>
      )}

      <div className="preview-bottom-actions">
        {onReForge && (
          <button className="preview-reforge" onClick={onReForge}>
            🔄 Re-Forge — Tweak &amp; Rebuild
          </button>
        )}
        <button className="preview-forge-another" onClick={onStartOver}>
          ⚒️ Forge Another {isAdventure ? 'Adventure' : isComic ? 'Comic' : isEscape ? 'Escape Room' : isPuzzle ? 'Puzzle' : 'Game'}
        </button>
      </div>
    </div>
  );
}

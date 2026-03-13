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
  const isNonGame = isAdventure || isComic;

  const titleLabel = isAdventure ? '📚 Your Adventure is Ready!'
    : isComic ? '💥 Your Comic is Ready!'
    : '🎮 Your Game is Ready!';

  const subtitleLabel = isAdventure ? 'Your adventure book awaits — dive in and explore every path.'
    : isComic ? 'Your comic book is hot off the press — start reading!'
    : 'Review the report, then play-test it right here.';

  // Sync fullscreen state with browser Fullscreen API events
  useEffect(() => {
    const handleChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

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
            title={isComic ? 'Comic Preview' : 'Adventure Preview'}
            sandbox="allow-scripts"
          />
          {fullscreen && (
            <div className="fullscreen-hint">Press <kbd>Esc</kbd> to exit fullscreen</div>
          )}
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
        <button
          className="preview-btn preview-btn-secondary"
          onClick={toggleFullscreen}
        >
          {fullscreen ? '✖️ Exit Fullscreen' : '🖥️ Fullscreen'}
        </button>
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
          ⚒️ Forge Another {isAdventure ? 'Adventure' : isComic ? 'Comic' : 'Game'}
        </button>
      </div>
    </div>
  );
}

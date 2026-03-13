import { useState } from 'react';
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
        <div className={`comic-viewer-frame ${fullscreen ? 'comic-viewer-fullscreen' : ''}`}>
          <iframe
            src={previewUrl}
            className="comic-viewer-screen"
            title={isComic ? 'Comic Preview' : 'Adventure Preview'}
            sandbox="allow-scripts"
          />
        </div>
      ) : (
        /* Phone frame with iframe */
        <div className={`phone-frame ${isLandscape ? 'phone-landscape' : ''} ${fullscreen ? 'phone-fullscreen' : ''}`}>
          <div className="phone-notch" />
          <iframe
            src={previewUrl}
            className="phone-screen"
            title="Game Preview"
            sandbox="allow-scripts"
          />
          <div className="phone-home-bar" />
        </div>
      )}

      {/* Controls */}
      <div className="preview-controls">
        <button
          className="preview-btn preview-btn-secondary"
          onClick={() => setFullscreen((f) => !f)}
        >
          {fullscreen ? '📱 Phone Size' : '🖥️ Fullscreen'}
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

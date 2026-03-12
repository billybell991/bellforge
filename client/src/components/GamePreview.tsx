import { useState } from 'react';
import type { Orientation } from '../types';

interface GamePreviewProps {
  previewUrl: string;
  apkPath: string;
  apkSize: string;
  orientation: Orientation;
  onDeploy: () => void;
  onStartOver: () => void;
  onReForge?: () => void;
}

export function GamePreview({ previewUrl, apkPath, apkSize, orientation, onDeploy, onStartOver, onReForge }: GamePreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const isLandscape = true; // games always render in 16:9 landscape

  return (
    <div className="preview-screen">
      <h1 className="preview-title">🎮 Your Game is Ready!</h1>
      <p className="preview-subtitle">
        Play-test it right here, then push to your phone when you're happy.
      </p>

      {/* Auto-saved indicator */}
      <div className="preview-auto-saved">
        ✅ Automatically saved to your library
      </div>

      {/* Phone frame with iframe */}
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

      {/* Controls */}
      <div className="preview-controls">
        <button
          className="preview-btn preview-btn-secondary"
          onClick={() => setFullscreen((f) => !f)}
        >
          {fullscreen ? '📱 Phone Size' : '🖥️ Fullscreen'}
        </button>
        <button className="preview-btn preview-btn-primary preview-btn-disabled" disabled title="Real APK pipeline coming soon">
          📲 Push to Phone — Coming Soon
        </button>
      </div>

      {/* Info */}
      <div className="preview-info">
        <span className="preview-info-item">📦 APK: {apkSize}</span>
        <span className="preview-info-item">📁 {apkPath.split('\\').pop()}</span>
      </div>

      <div className="preview-bottom-actions">
        {onReForge && (
          <button className="preview-reforge" onClick={onReForge}>
            🔄 Re-Forge — Tweak &amp; Rebuild
          </button>
        )}
        <button className="preview-forge-another" onClick={onStartOver}>
          ⚒️ Forge Another Game
        </button>
      </div>
    </div>
  );
}

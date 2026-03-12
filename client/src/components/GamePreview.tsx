import { useState, useCallback } from 'react';
import type { Orientation } from '../types';

interface GamePreviewProps {
  previewUrl: string;
  apkPath: string;
  apkSize: string;
  orientation: Orientation;
  buildId: string | null;
  onDeploy: () => void;
  onStartOver: () => void;
}

export function GamePreview({ previewUrl, apkPath, apkSize, orientation, buildId, onDeploy, onStartOver }: GamePreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLandscape = true; // games always render in 16:9 landscape

  const handleSave = useCallback(async () => {
    if (!buildId || saved) return;
    setSaving(true);
    try {
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId }),
      });
      setSaved(true);
    } catch {
      alert('Failed to save to library');
    } finally {
      setSaving(false);
    }
  }, [buildId, saved]);

  return (
    <div className="preview-screen">
      <h1 className="preview-title">🎮 Your Game is Ready!</h1>
      <p className="preview-subtitle">
        Play-test it right here, then push to your phone when you're happy.
      </p>

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
        <button
          className={`preview-btn preview-btn-save ${saved ? 'preview-btn-saved' : ''}`}
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saved ? '✅ Saved to Library' : saving ? '💾 Saving...' : '💾 Save to Library'}
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

      <button className="preview-forge-another" onClick={onStartOver}>
        ⚒️ Forge Another Game
      </button>
    </div>
  );
}

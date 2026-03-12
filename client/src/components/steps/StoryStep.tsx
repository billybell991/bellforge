import { useState } from 'react';
import type { StoryConfig } from '../../types';

interface StoryStepProps {
  value: StoryConfig;
  genreHint?: string;
  themeHint?: string;
  onChange: (s: StoryConfig) => void;
}

export function StoryStep({ value, genreHint, themeHint, onChange }: StoryStepProps) {
  const [generating, setGenerating] = useState(false);

  async function handleSurprise() {
    setGenerating(true);
    try {
      const res = await fetch('/api/gemini/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genreHint, themeHint }),
      });
      const data = await res.json();
      if (data.story) {
        onChange(data.story);
      }
    } catch {
      // Shouldn't happen — server has built-in fallback bank
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Tell your story</h2>
        <p className="step-subtitle">
          Give your game a name and a soul — or let us surprise you.
        </p>
      </div>

      <div className="story-form">
        <div className="input-group">
          <label className="input-label">Game Title</label>
          <input
            type="text"
            className="forge-input"
            placeholder="e.g. Whispers of the Forgotten"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            maxLength={60}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Main Character</label>
          <input
            type="text"
            className="forge-input"
            placeholder="e.g. Alex"
            value={value.characterName}
            onChange={(e) => onChange({ ...value, characterName: e.target.value })}
            maxLength={30}
          />
        </div>

        <div className="input-group full-width">
          <label className="input-label">Setting</label>
          <input
            type="text"
            className="forge-input"
            placeholder="e.g. An abandoned Victorian mansion on a fog-covered cliff"
            value={value.setting}
            onChange={(e) => onChange({ ...value, setting: e.target.value })}
            maxLength={200}
          />
        </div>

        <div className="input-group full-width">
          <label className="input-label">Brief Description</label>
          <textarea
            className="forge-textarea"
            placeholder="Describe what the player does, the feel of the game, the goal..."
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            maxLength={500}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="surprise-btn" onClick={handleSurprise} disabled={generating}>
          {generating ? '🤖 Weaving your tale...' : '✨ Surprise Me — AI-Generated Story'}
        </button>
      </div>
    </div>
  );
}

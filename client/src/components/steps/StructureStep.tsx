import { useEffect } from 'react';
import type { GenreOption, StructureConfig } from '../../types';

interface StructureStepProps {
  value: StructureConfig;
  onChange: (s: StructureConfig) => void;
  genre: GenreOption | null;
}

// ── Per-genre configuration ──

interface GenreStructure {
  unitLabel: string;
  subtitle: string;
  presets: { label: string; count: number }[];
  sliderRange: [number, number];
  difficulties: { id: 'casual' | 'standard' | 'challenging'; label: string; desc: string }[];
  densityLabel: string;
  densities: { id: 'light' | 'moderate' | 'heavy'; label: string; desc: string }[];
}

const GENRE_STRUCTURES: Record<string, GenreStructure> = {
  point_click: {
    unitLabel: 'Rooms',
    subtitle: 'How many rooms to explore, and how tricky are the puzzles?',
    presets: [
      { label: 'Quick Play', count: 4 },
      { label: 'Standard', count: 8 },
      { label: 'Epic', count: 15 },
    ],
    sliderRange: [3, 20],
    difficulties: [
      { id: 'casual', label: 'Casual', desc: 'Relaxed, forgiving' },
      { id: 'standard', label: 'Standard', desc: 'Balanced challenge' },
      { id: 'challenging', label: 'Challenging', desc: 'Real brain work' },
    ],
    densityLabel: 'Puzzle Density',
    densities: [
      { id: 'light', label: 'Light', desc: 'A few puzzles' },
      { id: 'moderate', label: 'Moderate', desc: 'Solid mix' },
      { id: 'heavy', label: 'Heavy', desc: 'Puzzle-packed' },
    ],
  },
  puzzle: {
    unitLabel: 'Levels',
    subtitle: 'How many levels, and how fast does the difficulty ramp up?',
    presets: [
      { label: 'Snack', count: 10 },
      { label: 'Standard', count: 25 },
      { label: 'Marathon', count: 50 },
    ],
    sliderRange: [5, 60],
    difficulties: [
      { id: 'casual', label: 'Gentle Curve', desc: 'Slow ramp, easy to pick up' },
      { id: 'standard', label: 'Steady Climb', desc: 'Balanced difficulty curve' },
      { id: 'challenging', label: 'Steep Ascent', desc: 'Gets hard fast' },
    ],
    densityLabel: 'Mechanic Variety',
    densities: [
      { id: 'light', label: 'Focused', desc: 'One core mechanic' },
      { id: 'moderate', label: 'Mixed', desc: 'A few mechanics' },
      { id: 'heavy', label: 'Diverse', desc: 'Many puzzle types' },
    ],
  },
  visual_novel: {
    unitLabel: 'Chapters',
    subtitle: 'How long is the story, and how branching are the choices?',
    presets: [
      { label: 'Short Story', count: 3 },
      { label: 'Novella', count: 7 },
      { label: 'Epic Saga', count: 12 },
    ],
    sliderRange: [2, 15],
    difficulties: [
      { id: 'casual', label: 'Relaxed Read', desc: 'No fail states' },
      { id: 'standard', label: 'Meaningful Choices', desc: 'Decisions have weight' },
      { id: 'challenging', label: 'High Stakes', desc: 'Bad choices end your story' },
    ],
    densityLabel: 'Branch Complexity',
    densities: [
      { id: 'light', label: 'Linear', desc: 'Mostly one path' },
      { id: 'moderate', label: 'Forking', desc: 'Key decision points' },
      { id: 'heavy', label: 'Web', desc: 'Densely branching narrative' },
    ],
  },
  platformer: {
    unitLabel: 'Levels',
    subtitle: 'How many levels, and how intense is the action?',
    presets: [
      { label: 'Quick Run', count: 5 },
      { label: 'Standard', count: 12 },
      { label: 'Full Game', count: 20 },
    ],
    sliderRange: [3, 30],
    difficulties: [
      { id: 'casual', label: 'Breezy', desc: 'Generous checkpoints, slow pace' },
      { id: 'standard', label: 'Balanced', desc: 'Fair challenge with some tricky bits' },
      { id: 'challenging', label: 'Hardcore', desc: 'Precision jumps, one-hit KO' },
    ],
    densityLabel: 'Enemy Density',
    densities: [
      { id: 'light', label: 'Sparse', desc: 'Mostly platforming' },
      { id: 'moderate', label: 'Populated', desc: 'Enemies at every turn' },
      { id: 'heavy', label: 'Swarming', desc: 'Constant combat' },
    ],
  },
  hidden_object: {
    unitLabel: 'Scenes',
    subtitle: 'How many scenes to search, and how well-hidden are the items?',
    presets: [
      { label: 'Quick Search', count: 5 },
      { label: 'Standard', count: 10 },
      { label: 'Deep Dive', count: 18 },
    ],
    sliderRange: [3, 25],
    difficulties: [
      { id: 'casual', label: 'Easy Find', desc: 'Items stand out' },
      { id: 'standard', label: 'Sharp Eye', desc: 'Takes some looking' },
      { id: 'challenging', label: 'Eagle Eye', desc: 'Fiendishly camouflaged' },
    ],
    densityLabel: 'Item Density',
    densities: [
      { id: 'light', label: 'Few Items', desc: '3–5 items per scene' },
      { id: 'moderate', label: 'Packed', desc: '8–12 items per scene' },
      { id: 'heavy', label: 'Overflowing', desc: '15+ items per scene' },
    ],
  },
  escape_room: {
    unitLabel: 'Rooms',
    subtitle: 'How many rooms to escape, and how devious are the locks?',
    presets: [
      { label: 'Single Room', count: 1 },
      { label: 'Suite', count: 4 },
      { label: 'Complex', count: 8 },
    ],
    sliderRange: [1, 12],
    difficulties: [
      { id: 'casual', label: 'Casual', desc: 'Generous hints, simple locks' },
      { id: 'standard', label: 'Standard', desc: 'Multi-step puzzles' },
      { id: 'challenging', label: 'Diabolical', desc: 'No hints, chained puzzles' },
    ],
    densityLabel: 'Puzzle Density',
    densities: [
      { id: 'light', label: 'Light', desc: '1–2 puzzles per room' },
      { id: 'moderate', label: 'Loaded', desc: '3–5 puzzles per room' },
      { id: 'heavy', label: 'Packed', desc: '6+ interlocking puzzles' },
    ],
  },
  interactive_fiction: {
    unitLabel: 'Passages',
    subtitle: 'How sprawling is the story, and how complex are the choices?',
    presets: [
      { label: 'Flash Fiction', count: 8 },
      { label: 'Short Story', count: 20 },
      { label: 'Novel', count: 40 },
    ],
    sliderRange: [5, 50],
    difficulties: [
      { id: 'casual', label: 'Reader Mode', desc: 'Enjoy the story, no wrong answers' },
      { id: 'standard', label: 'Choices Matter', desc: 'Consequences shape the story' },
      { id: 'challenging', label: 'Survival', desc: 'One wrong choice means game over' },
    ],
    densityLabel: 'Choice Density',
    densities: [
      { id: 'light', label: 'Sparse', desc: 'Occasional forks' },
      { id: 'moderate', label: 'Frequent', desc: 'Choices every passage' },
      { id: 'heavy', label: 'Dense', desc: 'Multi-layered decision trees' },
    ],
  },
};

const DEFAULT_STRUCTURE: GenreStructure = GENRE_STRUCTURES.point_click;

export function StructureStep({ value, onChange, genre }: StructureStepProps) {
  const gs = (genre && GENRE_STRUCTURES[genre.id]) || DEFAULT_STRUCTURE;

  // Clamp roomCount into the genre's valid range when genre changes
  useEffect(() => {
    const [min, max] = gs.sliderRange;
    if (value.roomCount < min || value.roomCount > max) {
      onChange({ ...value, roomCount: gs.presets[1]?.count ?? gs.presets[0].count });
    }
  }, [genre?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="step-header">
        <h2 className="step-title">Shape your world</h2>
        <p className="step-subtitle">{gs.subtitle}</p>
      </div>

      <div className="structure-controls">
        {/* Unit Count */}
        <div className="control-group" style={{ gridColumn: '1 / -1' }}>
          <span className="control-label">Number of {gs.unitLabel}</span>
          <span className="control-value">{value.roomCount}</span>
          <input
            type="range"
            className="forge-slider"
            min={gs.sliderRange[0]}
            max={gs.sliderRange[1]}
            value={value.roomCount}
            onChange={(e) =>
              onChange({ ...value, roomCount: parseInt(e.target.value) })
            }
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {gs.presets.map((preset) => (
              <button
                key={preset.label}
                className={`pill ${value.roomCount === preset.count ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, roomCount: preset.count })}
              >
                {preset.label} ({preset.count})
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="control-group">
          <span className="control-label">Difficulty</span>
          <div className="pill-group">
            {gs.difficulties.map((d) => (
              <button
                key={d.id}
                className={`pill ${value.difficulty === d.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, difficulty: d.id })}
                title={d.desc}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Genre-specific density axis */}
        <div className="control-group">
          <span className="control-label">{gs.densityLabel}</span>
          <div className="pill-group">
            {gs.densities.map((p) => (
              <button
                key={p.id}
                className={`pill ${value.puzzleDensity === p.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...value, puzzleDensity: p.id })}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

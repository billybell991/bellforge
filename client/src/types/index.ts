// ─────────────────────────────────────────────────────────────
// BellForge Types — shared type definitions for wizard & pipeline
// ─────────────────────────────────────────────────────────────

// ── Entertainment Type ──

export type EntertainmentType = 'game' | 'adventure' | 'comic';

export interface GameConfig {
  genre: GenreOption;
  theme: ThemeOption;
  artStyle: ArtStyleOption;
  structure: StructureConfig;
  story: StoryConfig;
}

export interface StructureConfig {
  roomCount: number;
  difficulty: 'casual' | 'standard' | 'challenging';
  puzzleDensity: 'light' | 'moderate' | 'heavy';
}

export interface StoryConfig {
  title: string;
  description: string;
  characterName: string;
  setting: string;
}

// ── CYOA Adventure Config ──

export interface AdventureConfig {
  cyoaGenre: CYOAGenreOption;
  theme: ThemeOption;
  artStyle: ArtStyleOption;
  structure: CYOAStructureConfig;
  story: StoryConfig;
}

export interface CYOAStructureConfig {
  pageCount: number;
  deadliness: 'low' | 'medium' | 'high' | 'brutal';
  branchDensity: 'linear' | 'forking' | 'web';
}

export interface CYOAGenreOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const CYOA_GENRES: CYOAGenreOption[] = [
  { id: 'exploration', name: 'Exploration', icon: '🗺️', description: 'Chart the unknown, discover secrets, map new territory', tag: 'FLAGSHIP' },
  { id: 'survival', name: 'Survival', icon: '🏕️', description: 'Against the elements — stay alive, find resources, endure', tag: 'POPULAR' },
  { id: 'investigation', name: 'Investigation', icon: '🔎', description: 'Gather clues, interview witnesses, solve the case', tag: '' },
  { id: 'heist_escape', name: 'Heist / Escape', icon: '🔓', description: 'Break in or break out — stealth, cunning, and timing', tag: '' },
  { id: 'quest', name: 'Epic Quest', icon: '⚔️', description: 'A grand mission with allies, enemies, and a world to save', tag: '' },
  { id: 'diplomacy', name: 'Diplomacy / Intrigue', icon: '👑', description: 'Political maneuvering, alliances, betrayal', tag: 'NEW' },
];

// ── Comic Config ──

export interface ComicConfig {
  comicGenre: ComicGenreOption;
  theme: ThemeOption;
  artStyle: ArtStyleOption;
  structure: ComicStructureConfig;
  story: StoryConfig;
}

export interface ComicStructureConfig {
  pageCount: number;
  panelStyle: 'classic' | 'manga' | 'strip';
  tone: 'action' | 'dramatic' | 'comedic' | 'horror';
}

export interface ComicGenreOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const COMIC_GENRES: ComicGenreOption[] = [
  { id: 'origin_story', name: 'Origin Story', icon: '🌟', description: 'A hero is born — powers discovered, destiny revealed', tag: 'FLAGSHIP' },
  { id: 'team_up', name: 'Team-Up', icon: '🤝', description: 'Heroes assemble against a common threat', tag: 'POPULAR' },
  { id: 'heist', name: 'Heist / Caper', icon: '💎', description: 'A daring plan, the perfect crew, the big score', tag: '' },
  { id: 'revenge', name: 'Revenge / Vendetta', icon: '⚡', description: 'Personal stakes, a wrong that must be righted', tag: '' },
  { id: 'war_epic', name: 'War Epic', icon: '⚔️', description: 'Large-scale conflict, sacrifice, and the fog of war', tag: '' },
  { id: 'coming_of_age', name: 'Coming of Age', icon: '🌱', description: 'Growing up, finding identity, first big challenge', tag: 'NEW' },
];

// ── Genre ──

export type Orientation = 'portrait' | 'landscape';

export interface GenreOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
  orientation: Orientation;
}

export const GENRES: GenreOption[] = [
  { id: 'point_click', name: 'Point & Click Adventure', icon: '🎯', description: 'Explore rooms, solve puzzles, uncover stories', tag: 'FLAGSHIP', orientation: 'landscape' },
  { id: 'puzzle', name: 'Puzzle Game', icon: '🧩', description: 'Brain teasers and logic challenges', tag: '', orientation: 'portrait' },
  { id: 'visual_novel', name: 'Visual Novel', icon: '📖', description: 'Story-driven with dialogue choices', tag: '', orientation: 'portrait' },
  { id: 'platformer', name: 'Platformer', icon: '🏃', description: 'Jump, run, and collect through levels', tag: '', orientation: 'landscape' },
  { id: 'hidden_object', name: 'Hidden Object', icon: '🔍', description: 'Find concealed items in detailed scenes', tag: '', orientation: 'landscape' },
  { id: 'escape_room', name: 'Escape Room', icon: '🚪', description: 'Crack clues to escape locked rooms', tag: 'POPULAR', orientation: 'landscape' },
  { id: 'interactive_fiction', name: 'Interactive Fiction', icon: '🗺️', description: 'Text-heavy adventures with rich narratives', tag: '', orientation: 'portrait' },
  { id: 'dismantle', name: 'Dismantling', icon: '🔧', description: 'Take apart machines, devices, and contraptions piece by piece', tag: 'NEW', orientation: 'landscape' },
];

// ── Theme ──

export interface ThemeOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'horror', name: 'Horror / Supernatural', icon: '👻', description: 'Dark atmospheres and spine-tingling mysteries', color: '#ff3d00' },
  { id: 'fantasy', name: 'Fantasy / Medieval', icon: '🏰', description: 'Castles, dragons, and magical realms', color: '#7c4dff' },
  { id: 'scifi', name: 'Sci-Fi / Space', icon: '🚀', description: 'Futuristic tech and cosmic exploration', color: '#00e5ff' },
  { id: 'mystery', name: 'Mystery / Detective', icon: '🔎', description: 'Crime scenes, clues, and whodunits', color: '#ffa726' },
  { id: 'cozy', name: 'Cozy / Slice of Life', icon: '🌸', description: 'Warm, relaxing, everyday adventures', color: '#f48fb1' },
  { id: 'cyberpunk', name: 'Cyberpunk / Neon', icon: '🌃', description: 'High-tech dystopia, neon-soaked streets', color: '#e040fb' },
  { id: 'steampunk', name: 'Steampunk', icon: '⚙️', description: 'Victorian era with brass and steam machinery', color: '#ff8a65' },
  { id: 'postapoc', name: 'Post-Apocalyptic', icon: '🏚️', description: 'Surviving in the ruins of civilization', color: '#8d6e63' },
];

// ── Art Style ──

export interface ArtStyleOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  recommended?: boolean;
}

export const ART_STYLES: ArtStyleOption[] = [
  { id: 'cel_shaded', name: 'Cel-Shaded / Toonish', icon: '🎨', description: 'Bold outlines, flat colors, cartoon charm', recommended: true },
  { id: 'pixel_art', name: 'Pixel Art / Retro', icon: '👾', description: 'Nostalgic 8-bit and 16-bit aesthetics' },
  { id: 'watercolor', name: 'Watercolor / Painterly', icon: '🖌️', description: 'Soft, flowing, artistic brushstrokes' },
  { id: 'noir', name: 'Noir / Black & White', icon: '🎬', description: 'High contrast, dramatic shadows' },
  { id: 'neon', name: 'Neon / Synthwave', icon: '💫', description: 'Glowing lights, retro-futuristic vibes' },
  { id: 'hand_drawn', name: 'Hand-Drawn / Sketch', icon: '✏️', description: 'Pencil and ink illustration style' },
  { id: 'low_poly', name: 'Low Poly / Flat Design', icon: '🔷', description: 'Clean, minimal, geometric shapes' },
];

// ── Build Pipeline ──

export interface BuildStage {
  id: string;
  name: string;
  percent: number;
  icon: string;
}

export const BUILD_STAGES: BuildStage[] = [
  { id: 'init', name: 'Initializing Project', percent: 5, icon: '📁' },
  { id: 'architecture', name: 'Generating Game Architecture', percent: 12, icon: '🏗️' },
  { id: 'rooms', name: 'Designing Room Layouts', percent: 22, icon: '🗺️' },
  { id: 'qa_brief', name: 'Gemini QA — Inspecting Blueprint', percent: 28, icon: '🔍' },
  { id: 'art_bg', name: 'AI Bridge → Generating Backgrounds', percent: 35, icon: '🎨' },
  { id: 'art_items', name: 'AI Bridge → Creating Item Assets', percent: 48, icon: '✨' },
  { id: 'art_ui', name: 'AI Bridge → Crafting UI Elements', percent: 55, icon: '🖼️' },
  { id: 'logic', name: 'Writing Game Logic (Kotlin)', percent: 65, icon: '⚡' },
  { id: 'inventory', name: 'Wiring Inventory & Hotspot Systems', percent: 72, icon: '🎒' },
  { id: 'qa_game', name: 'Gemini QA — Playtesting Code', percent: 80, icon: '🔍' },
  { id: 'gradle_setup', name: 'Assembling Android Project', percent: 85, icon: '📦' },
  { id: 'gradle_build', name: 'Building APK with Gradle', percent: 92, icon: '🔨' },
  { id: 'signing', name: 'Signing APK', percent: 96, icon: '🔐' },
  { id: 'complete', name: 'Build Complete!', percent: 100, icon: '🎉' },
];

export const ADVENTURE_BUILD_STAGES: BuildStage[] = [
  { id: 'concept', name: 'Designing Story Concept', percent: 5, icon: '📝' },
  { id: 'outline', name: 'Building Story Outline', percent: 12, icon: '🗺️' },
  { id: 'prose', name: 'Writing Adventure Prose', percent: 20, icon: '✍️' },
  { id: 'prose_mid', name: 'Expanding Narrative Branches', percent: 35, icon: '🌿' },
  { id: 'prose_final', name: 'Polishing Page Prose', percent: 45, icon: '📖' },
  { id: 'assembly', name: 'Assembling Story Graph', percent: 55, icon: '🔗' },
  { id: 'illustrations', name: 'AI Bridge → Cover Art', percent: 65, icon: '🎨' },
  { id: 'qa_graph', name: 'QA — Verifying Graph Integrity', percent: 75, icon: '🔍' },
  { id: 'qa_items', name: 'QA — Validating Item Gates', percent: 82, icon: '🔑' },
  { id: 'qa_endings', name: 'QA — Checking Endings', percent: 88, icon: '🏁' },
  { id: 'viewer', name: 'Building Interactive Viewer', percent: 95, icon: '📱' },
  { id: 'complete', name: 'Adventure Complete!', percent: 100, icon: '🎉' },
];

export const COMIC_BUILD_STAGES: BuildStage[] = [
  { id: 'story', name: 'Crafting Story Beats', percent: 5, icon: '📝' },
  { id: 'script', name: 'Writing Panel Scripts', percent: 15, icon: '✍️' },
  { id: 'layouts', name: 'Designing Page Layouts', percent: 25, icon: '📐' },
  { id: 'cover_art', name: 'AI Bridge → Generating Cover', percent: 35, icon: '🎨' },
  { id: 'panel_art', name: 'AI Bridge → Drawing Panels', percent: 45, icon: '🖼️' },
  { id: 'panel_art_mid', name: 'AI Bridge → Interior Pages', percent: 55, icon: '✨' },
  { id: 'panel_art_final', name: 'AI Bridge → Final Pages', percent: 65, icon: '🎭' },
  { id: 'text_overlay', name: 'Rendering Speech Bubbles', percent: 75, icon: '💬' },
  { id: 'qa_panels', name: 'QA — Panel Continuity', percent: 82, icon: '🔍' },
  { id: 'qa_story', name: 'QA — Story Flow', percent: 88, icon: '📖' },
  { id: 'viewer', name: 'Assembling Comic Viewer', percent: 95, icon: '📱' },
  { id: 'complete', name: 'Comic Complete!', percent: 100, icon: '🎉' },
];

// ── Wizard State ──

export type WizardStep = 'genre' | 'theme' | 'artStyle' | 'structure' | 'story' | 'review';

export const WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Genre', icon: '🎮' },
  { id: 'theme', label: 'Theme', icon: '🎭' },
  { id: 'artStyle', label: 'Art Style', icon: '🎨' },
  { id: 'structure', label: 'Structure', icon: '🏗️' },
  { id: 'story', label: 'Story', icon: '📝' },
  { id: 'review', label: 'Review', icon: '✅' },
];

// CYOA wizard reuses the same WizardStep type but with different labels
export const CYOA_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Genre', icon: '📚' },
  { id: 'theme', label: 'Theme', icon: '🎭' },
  { id: 'artStyle', label: 'Art Style', icon: '🎨' },
  { id: 'structure', label: 'Structure', icon: '📖' },
  { id: 'story', label: 'Story', icon: '📝' },
  { id: 'review', label: 'Review', icon: '✅' },
];

export const COMIC_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Genre', icon: '💥' },
  { id: 'theme', label: 'Theme', icon: '🎭' },
  { id: 'artStyle', label: 'Art Style', icon: '🎨' },
  { id: 'structure', label: 'Structure', icon: '📐' },
  { id: 'story', label: 'Story', icon: '📝' },
  { id: 'review', label: 'Review', icon: '✅' },
];

// ── App Page State ──

export type AppPage = 'landing' | 'wizard' | 'building' | 'preview' | 'deploy' | 'library';

// ── Library ──

export interface LibraryEntry {
  id: string;
  name: string;
  rating: number;
  config: GameConfig | AdventureConfig | ComicConfig;
  entertainmentType?: EntertainmentType;
  buildId: string;
  apkSize: string;
  createdAt: string;
}

// ── WebSocket Messages ──

export interface WSProgressMessage {
  type: 'progress';
  stage: string;
  name: string;
  percent: number;
  detail: string;
  timestamp: number;
}

export interface WSCompleteMessage {
  type: 'complete';
  percent: number;
  apkPath: string;
  apkSize: string;
  previewUrl: string;
  qaReport?: QAReport;
}

export interface QAReport {
  overallScore: number;
  categories: QACategory[];
  summary: string;
  images: { title: boolean; character: boolean; packIcon: boolean; rooms: boolean[]; items: boolean[] } | null;
  config: { genre: string; theme: string; artStyle: string; roomCount: number; title: string } | null;
  timing: { startedAt: number; completedAt?: number };
}

export interface QACategory {
  name: string;
  score: number;
  detail: string;
}

export interface WSErrorMessage {
  type: 'error';
  message: string;
}

export type WSMessage = WSProgressMessage | WSCompleteMessage | WSErrorMessage;

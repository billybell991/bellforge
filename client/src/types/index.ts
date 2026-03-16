// ─────────────────────────────────────────────────────────────
// BellForge Types — shared type definitions for wizard & pipeline
// ─────────────────────────────────────────────────────────────

// ── Entertainment Type ──

export type EntertainmentType = 'game' | 'adventure' | 'comic' | 'escape' | 'puzzle' | 'wordsearch' | 'crossword' | 'jumble';

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

// ── Escape Room Config ──

export interface EscapeConfig {
  escapeTheme: EscapeThemeOption;
  theme: ThemeOption;
  artStyle: ArtStyleOption;
  structure: EscapeStructureConfig;
  story: StoryConfig;
}

export interface EscapeStructureConfig {
  envelopeCount: number;
  difficulty: 'casual' | 'standard' | 'expert';
  duration: number;
}

export interface EscapeThemeOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const ESCAPE_THEMES: EscapeThemeOption[] = [
  { id: 'heist', name: 'The Heist', icon: '💎', description: 'Break into the vault before security resets — crack safes, bypass lasers, decode intel', tag: 'FLAGSHIP' },
  { id: 'detective', name: 'Cold Case', icon: '🔎', description: 'A case was closed too soon — buried evidence, conflicting alibis, one night to find the truth', tag: 'POPULAR' },
  { id: 'haunted', name: 'Haunted Estate', icon: '👻', description: 'Locked inside a decaying mansion with restless spirits and cryptic warnings', tag: '' },
  { id: 'laboratory', name: 'The Laboratory', icon: '🧪', description: 'A research facility in lockdown — decipher experiments before containment fails', tag: '' },
  { id: 'shipwreck', name: 'Sunken Vessel', icon: '⚓', description: 'Trapped in a flooded submarine — restore power, seal breaches, signal for rescue', tag: '' },
  { id: 'time_capsule', name: 'Time Capsule', icon: '⏳', description: 'Someone left a trail of puzzles across decades — each envelope unlocks a memory', tag: 'NEW' },
];

// ── Jigsaw Puzzle Config ──

export interface PuzzleConfig {
  puzzleSubject: PuzzleSubjectOption;
  artStyle: ArtStyleOption;
  structure: PuzzleStructureConfig;
}

export interface PuzzleStructureConfig {
  pieceCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  rotation: boolean;
}

export interface PuzzleSubjectOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const PUZZLE_SUBJECTS: PuzzleSubjectOption[] = [
  { id: 'landscape', name: 'Epic Landscape', icon: '🏔️', description: 'Sweeping vistas — mountains, valleys, sunsets, and horizons', tag: 'FLAGSHIP' },
  { id: 'fantasy_scene', name: 'Fantasy Scene', icon: '🐉', description: 'Dragons, castles, enchanted forests, and magical creatures', tag: 'POPULAR' },
  { id: 'animal', name: 'Animal Portrait', icon: '🦁', description: 'A majestic animal rendered in stunning detail', tag: '' },
  { id: 'space', name: 'Cosmic Vista', icon: '🌌', description: 'Nebulae, planets, starfields, and galactic panoramas', tag: '' },
  { id: 'cityscape', name: 'Cityscape', icon: '🏙️', description: 'Urban skylines, neon streets, and architectural wonders', tag: '' },
  { id: 'abstract', name: 'Abstract Art', icon: '🎨', description: 'Shapes, colors, and patterns — beautiful chaos', tag: '' },
  { id: 'underwater', name: 'Underwater World', icon: '🐠', description: 'Coral reefs, deep sea creatures, and sunken treasures', tag: '' },
  { id: 'custom', name: 'Custom Subject', icon: '✨', description: 'Describe anything — the AI will paint it for you', tag: 'NEW' },
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
  { id: 'story_dna', name: 'Mixing Creative DNA', percent: 5, icon: '🧬' },
  { id: 'story_concept', name: 'Gemini → Writing Concept', percent: 7, icon: '💡' },
  { id: 'story_outline', name: 'Building Story Outline', percent: 10, icon: '📋' },
  { id: 'story_chars', name: 'Locking Character Designs', percent: 12, icon: '👤' },
  { id: 'script', name: 'Writing Panel Scripts', percent: 15, icon: '✍️' },
  { id: 'layouts', name: 'Designing Page Layouts', percent: 28, icon: '📐' },
  { id: 'char_refs', name: 'Sketching Character Portraits', percent: 33, icon: '🖊️' },
  { id: 'cover_art', name: 'AI Bridge → Painting Cover', percent: 36, icon: '🎨' },
  { id: 'panel_art', name: 'AI Bridge → Drawing Panels', percent: 42, icon: '🖼️' },
  { id: 'text_overlay', name: 'Composing Dialogue', percent: 75, icon: '💬' },
  { id: 'qa', name: 'QA — Confidence Report', percent: 95, icon: '🔍' },
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

export const ESCAPE_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Scenario', icon: '🔑' },
  { id: 'theme', label: 'Atmosphere', icon: '🎭' },
  { id: 'artStyle', label: 'Art Style', icon: '🎨' },
  { id: 'structure', label: 'Structure', icon: '🏗️' },
  { id: 'story', label: 'Story', icon: '📝' },
  { id: 'review', label: 'Review', icon: '✅' },
];

export const ESCAPE_BUILD_STAGES: BuildStage[] = [
  { id: 'concept', name: 'Designing Escape Room Concept', percent: 5, icon: '📝' },
  { id: 'outline', name: 'Building Puzzle Graph', percent: 12, icon: '🧩' },
  { id: 'puzzles', name: 'Crafting Puzzle Details', percent: 22, icon: '🔑' },
  { id: 'puzzles_mid', name: 'Threading Clues & Answers', percent: 35, icon: '🔗' },
  { id: 'puzzles_final', name: 'Polishing Hint Chains', percent: 45, icon: '💡' },
  { id: 'assembly', name: 'Assembling Escape Structure', percent: 52, icon: '📦' },
  { id: 'illustrations', name: 'AI Bridge → Scene Art', percent: 62, icon: '🎨' },
  { id: 'illustrations_items', name: 'AI Bridge → Puzzle Assets', percent: 72, icon: '✨' },
  { id: 'qa_graph', name: 'QA — Verifying Solvability', percent: 80, icon: '🔍' },
  { id: 'qa_cohesion', name: 'QA — Story Cohesion Check', percent: 88, icon: '🧭' },
  { id: 'viewer', name: 'Building Interactive Viewer', percent: 95, icon: '📱' },
  { id: 'complete', name: 'Escape Room Complete!', percent: 100, icon: '🎉' },
];

export const PUZZLE_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Subject', icon: '🖼️' },
  { id: 'artStyle', label: 'Art Style', icon: '🎨' },
  { id: 'structure', label: 'Difficulty', icon: '🧩' },
  { id: 'review', label: 'Review', icon: '✅' },
];

export const PUZZLE_BUILD_STAGES: BuildStage[] = [
  { id: 'concept', name: 'Designing Puzzle Image', percent: 10, icon: '📝' },
  { id: 'illustration', name: 'AI Bridge → Generating Artwork', percent: 30, icon: '🎨' },
  { id: 'cutting', name: 'Cutting Jigsaw Pieces', percent: 55, icon: '✂️' },
  { id: 'engine', name: 'Building Puzzle Engine', percent: 75, icon: '⚙️' },
  { id: 'qa', name: 'QA — Testing Interactions', percent: 90, icon: '🔍' },
  { id: 'complete', name: 'Puzzle Complete!', percent: 100, icon: '🎉' },
];

// ── Word Search Config ──

export interface WordSearchConfig {
  wordSearchCategory: WordSearchCategoryOption;
  structure: WordSearchStructureConfig;
}

export interface WordSearchStructureConfig {
  gridSize: number;
  wordCount: number;
  allowDiagonals: boolean;
  allowBackwards: boolean;
}

export interface WordSearchCategoryOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const WORDSEARCH_CATEGORIES: WordSearchCategoryOption[] = [
  { id: 'animals', name: 'Animals', icon: '🦁', description: 'Lions, dolphins, eagles — creatures from every habitat', tag: 'POPULAR' },
  { id: 'space', name: 'Space & Astronomy', icon: '🚀', description: 'Planets, galaxies, astronauts, and cosmic phenomena', tag: '' },
  { id: 'food', name: 'Food & Cooking', icon: '🍕', description: 'Ingredients, dishes, and culinary terms from around the world', tag: '' },
  { id: 'science', name: 'Science', icon: '🔬', description: 'Elements, experiments, theories, and discoveries', tag: '' },
  { id: 'mythology', name: 'Mythology', icon: '⚡', description: 'Gods, heroes, and legendary creatures from world myths', tag: '' },
  { id: 'sports', name: 'Sports', icon: '⚽', description: 'Games, athletes, equipment, and sporting terms', tag: '' },
  { id: 'nature', name: 'Nature', icon: '🌿', description: 'Trees, flowers, ecosystems, weather, and geology', tag: '' },
  { id: 'history', name: 'History', icon: '🏛️', description: 'Events, figures, civilizations, and eras that shaped the world', tag: '' },
  { id: 'movies', name: 'Movies & TV', icon: '🎬', description: 'Genres, characters, directors, and cinematic terms', tag: '' },
  { id: 'technology', name: 'Technology', icon: '💻', description: 'Gadgets, programming, inventions, and digital culture', tag: '' },
  { id: 'custom', name: 'Custom Topic', icon: '✨', description: 'Describe any topic — the AI will pick the words', tag: 'NEW' },
];

export const WORDSEARCH_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Topic', icon: '📋' },
  { id: 'structure', label: 'Difficulty', icon: '🔤' },
  { id: 'review', label: 'Review', icon: '✅' },
];

export const WORDSEARCH_BUILD_STAGES: BuildStage[] = [
  { id: 'concept', name: 'Choosing Words', percent: 15, icon: '📝' },
  { id: 'grid', name: 'Building Grid', percent: 40, icon: '🔤' },
  { id: 'engine', name: 'Building Word Search Engine', percent: 70, icon: '⚙️' },
  { id: 'qa', name: 'QA — Verifying Grid', percent: 90, icon: '🔍' },
  { id: 'complete', name: 'Word Search Complete!', percent: 100, icon: '🎉' },
];

// ── Crossword Config ──

export interface CrosswordConfig {
  crosswordCategory: CrosswordCategoryOption;
  structure: CrosswordStructureConfig;
}

export interface CrosswordStructureConfig {
  gridSize: number;
  clueCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CrosswordCategoryOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const CROSSWORD_CATEGORIES: CrosswordCategoryOption[] = [
  { id: 'general', name: 'General Knowledge', icon: '🧠', description: 'A mix of trivia, vocabulary, and everyday knowledge', tag: 'POPULAR' },
  { id: 'science', name: 'Science', icon: '🔬', description: 'Biology, chemistry, physics, and earth sciences', tag: '' },
  { id: 'geography', name: 'Geography', icon: '🌍', description: 'Countries, capitals, landmarks, and natural features', tag: '' },
  { id: 'history', name: 'History', icon: '🏛️', description: 'Historical events, figures, and ancient civilizations', tag: '' },
  { id: 'literature', name: 'Literature', icon: '📚', description: 'Authors, characters, books, and literary terms', tag: '' },
  { id: 'movies', name: 'Movies & TV', icon: '🎬', description: 'Films, shows, actors, directors, and cinematic terms', tag: '' },
  { id: 'music', name: 'Music', icon: '🎵', description: 'Instruments, genres, artists, and musical terms', tag: '' },
  { id: 'food', name: 'Food & Drink', icon: '🍽️', description: 'Cuisines, ingredients, cooking techniques, and beverages', tag: '' },
  { id: 'nature', name: 'Nature & Animals', icon: '🌿', description: 'Wildlife, plants, ecosystems, and natural phenomena', tag: '' },
  { id: 'sports', name: 'Sports', icon: '🏆', description: 'Athletes, rules, equipment, and sporting events', tag: '' },
  { id: 'custom', name: 'Custom Topic', icon: '✨', description: 'Describe any topic — the AI writes the clues', tag: 'NEW' },
];

export const CROSSWORD_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Topic', icon: '📋' },
  { id: 'structure', label: 'Difficulty', icon: '✏️' },
  { id: 'review', label: 'Review', icon: '✅' },
];

export const CROSSWORD_BUILD_STAGES: BuildStage[] = [
  { id: 'concept', name: 'Writing Clues', percent: 15, icon: '📝' },
  { id: 'grid', name: 'Building Grid', percent: 40, icon: '✏️' },
  { id: 'engine', name: 'Building Crossword Engine', percent: 70, icon: '⚙️' },
  { id: 'qa', name: 'QA — Verifying Grid', percent: 90, icon: '🔍' },
  { id: 'complete', name: 'Crossword Complete!', percent: 100, icon: '🎉' },
];

// ── Jumble Config ──

export interface JumbleConfig {
  jumbleCategory: JumbleCategoryOption;
  structure: JumbleStructureConfig;
}

export interface JumbleStructureConfig {
  wordCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface JumbleCategoryOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  tag: string;
}

export const JUMBLE_CATEGORIES: JumbleCategoryOption[] = [
  { id: 'everyday', name: 'Everyday Life', icon: '🏠', description: 'Common words from daily life — perfect for warming up', tag: 'POPULAR' },
  { id: 'animals', name: 'Animals', icon: '🦁', description: 'Unscramble creatures from every corner of the animal kingdom', tag: '' },
  { id: 'food', name: 'Food & Cooking', icon: '🍕', description: 'Ingredients, dishes, and kitchen vocabulary all mixed up', tag: '' },
  { id: 'science', name: 'Science', icon: '🔬', description: 'Lab words, elements, and discoveries — scrambled for brainy solvers', tag: '' },
  { id: 'sports', name: 'Sports', icon: '⚽', description: 'Athletic terms, games, and equipment in a jumble', tag: '' },
  { id: 'travel', name: 'Travel & Places', icon: '✈️', description: 'Destinations, landmarks, and travel lingo all scrambled', tag: '' },
  { id: 'movies', name: 'Movies & TV', icon: '🎬', description: 'Hollywood vocabulary and screen culture in a mix', tag: '' },
  { id: 'music', name: 'Music', icon: '🎵', description: 'Instruments, genres, and musical terms to unscramble', tag: '' },
  { id: 'nature', name: 'Nature', icon: '🌿', description: 'Trees, flowers, weather, and the great outdoors — scrambled', tag: '' },
  { id: 'holidays', name: 'Holidays & Celebrations', icon: '🎉', description: 'Festive words from holidays around the world', tag: '' },
  { id: 'custom', name: 'Custom Topic', icon: '✨', description: 'Describe any topic — the AI picks the words and punchline', tag: 'NEW' },
];

export const JUMBLE_WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'genre', label: 'Topic', icon: '📋' },
  { id: 'structure', label: 'Difficulty', icon: '🔀' },
  { id: 'review', label: 'Review', icon: '✅' },
];

export const JUMBLE_BUILD_STAGES: BuildStage[] = [
  { id: 'concept', name: 'Crafting Puzzle', percent: 15, icon: '📝' },
  { id: 'art', name: 'Drawing Cartoon', percent: 50, icon: '🎨' },
  { id: 'engine', name: 'Building Jumble Engine', percent: 75, icon: '⚙️' },
  { id: 'qa', name: 'QA — Verifying Puzzle', percent: 90, icon: '🔍' },
  { id: 'complete', name: 'Jumble Complete!', percent: 100, icon: '🎉' },
];

// ── App Page State ──

export type AppPage = 'landing' | 'wizard' | 'building' | 'preview' | 'deploy';

// ── Library ──

export interface LibraryEntry {
  id: string;
  name: string;
  rating: number;
  config: GameConfig | AdventureConfig | ComicConfig | EscapeConfig | PuzzleConfig | WordSearchConfig | CrosswordConfig | JumbleConfig;
  entertainmentType?: EntertainmentType;
  buildId: string;
  apkSize: string;
  createdAt: string;
  thumbnail?: string;
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

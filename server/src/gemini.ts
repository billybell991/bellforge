import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GameConfig } from './pipeline/types.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

export function isGeminiAvailable(): boolean {
  return model !== null;
}

// ── Creative Brief — Gemini drives ALL creative content ──

export interface RoomFurniture {
  type: 'rect' | 'circle' | 'arch' | 'triangle';
  x: number; y: number; w: number; h: number;
  color: string;
  label: string;
}

export interface RoomHotspot {
  id: string;
  x: number; y: number; w: number; h: number;
  type: 'examine' | 'item' | 'door' | 'puzzle';
  label: string;
  examineText: string;
  targetRoom?: number;
  requiredItem?: string;
  lockedText?: string;
}

export interface CreativeRoom {
  name: string;
  description: string;
  examineText: string;
  atmosphere: string;
  wallColor: string;
  floorColor: string;
  ceilingColor: string;
  furniture: RoomFurniture[];
  hotspots: RoomHotspot[];
  hasWindow: boolean;
  windowType: 'round' | 'tall' | 'wide' | 'none';
  lightingDir: 'left' | 'right' | 'center' | 'dim';
}

export interface CreativeItem {
  name: string;
  emoji: string;
  description: string;
  roomIndex: number;
}

export interface CreativePalette {
  bg: string;
  wall: string;
  accent: string;
  floor: string;
  text: string;
  highlight: string;
  shadow: string;
}

export interface PuzzleConnection {
  doorInRoom: number;
  leadsToRoom: number;
  requiredItem: string;
  lockedMessage: string;
  unlockedMessage: string;
}

export interface CreativeBrief {
  rooms: CreativeRoom[];
  items: CreativeItem[];
  palette: CreativePalette;
  puzzles: PuzzleConnection[];
  gameVibe: string;
  hintTexts: string[];
  openingText: string;
  endingText: string;
}

// ── Curated fallback bank (Gemini-generated at design time) ──

const STORY_BANK = [
  { title: 'Whispering Manor Curse', characterName: 'Elara', setting: 'An ancient, decrepit mansion on a forgotten hill, where shadows dance with a life of their own.', description: 'Uncover the dark history of your ancestral home, solving gruesome puzzles to appease restless spirits. Each room holds a terrifying secret and a key to breaking the curse.' },
  { title: "Dragon's Labyrinth Escape", characterName: 'Kael', setting: 'Deep within the molten heart of an active volcano, a legendary dragon guards an intricate treasure maze.', description: 'Navigate perilous traps and ancient runes in the dragon\'s lair to retrieve a stolen artifact. Outwit the fiery beast and find a way out before the volcano erupts.' },
  { title: 'Derelict Asteroid Mine', characterName: 'Jax', setting: 'A massive, abandoned asteroid mining facility drifts silently in the void, its systems failing one by one.', description: 'Trapped after a salvage operation gone awry, reactivate the mine\'s core systems and discover why everyone disappeared to signal for rescue.' },
  { title: 'The Missing Heir', characterName: 'Rook', setting: 'A lavish, gaslit Victorian-era mansion belonging to an eccentric industrialist, now silent and empty.', description: 'Meticulously examine clues, decipher cryptic notes, and piece together the mystery of the family\'s youngest son\'s disappearance.' },
  { title: 'Bakery Breakout Bash', characterName: 'Lily', setting: 'A whimsical, delightfully aromatic village bakery, famous for its magical pastries and intricate kitchen contraptions.', description: 'Accidentally locked in on the eve of the annual bake-off, use your ingenuity to solve baking-themed puzzles and unlock the front door to deliver your masterpiece.' },
  { title: 'Neon Alley Glitch', characterName: 'Kai', setting: 'A rain-slicked, neon-drenched alleyway in Neo-Kyoto, where augmented reality flickers over grimy street art.', description: 'Wake up in a locked data-den with no memory. Hack into systems, bypass firewalls, and reconstruct shattered memories to find an escape route and clear your name.' },
  { title: 'Clockwork Airship Plight', characterName: 'Ada', setting: 'High above cloud-piercing spires, a magnificent clockwork airship slowly loses altitude.', description: 'Repair damaged gears and steam engines using intricate mechanisms. Restore the vessel\'s flight, navigate a perilous storm, and prevent a catastrophic crash.' },
  { title: 'Bunker 7 Survival', characterName: 'Silas', setting: 'A dust-choked, forgotten underground bunker, its decaying systems barely clinging to life.', description: 'As the last survivor, scavenge for resources, repair critical infrastructure, and decipher ancient logs to find an exit to the ravaged surface world.' },
  { title: "Asylum's Forgotten Wing", characterName: 'Thorne', setting: 'The abandoned, overgrown west wing of Blackwood Asylum, rumored to house restless souls.', description: 'Navigate unsettling corridors, piece together chilling medical records, and confront manifestations of past trauma before you lose your sanity.' },
  { title: 'Bewitched Forest Enigma', characterName: 'Lyra', setting: 'A vibrant, ancient forest pulsating with magic, where trees whisper secrets and glowing flora lights the way.', description: 'Commune with nature spirits, solve elemental puzzles, and restore the forest\'s harmony to open a path to freedom from the enchanted grove.' },
  { title: 'Orient Express Betrayal', characterName: 'Dubois', setting: 'A luxurious, snowbound passenger train stopped in the desolate, mountainous Balkans.', description: 'A priceless jewel was stolen and the train ground to a halt. Interview eccentric passengers through clues, find the artifact, and deduce the culprit.' },
  { title: "Grandparent's Attic", characterName: 'Finn', setting: 'A dusty, treasure-filled attic in an old countryside home, filled with forgotten trinkets and memories.', description: 'Discover hidden compartments, piece together family history through nostalgic artifacts, and solve delightful puzzles to open the attic door.' },
  { title: "Data Ghost's Hideout", characterName: 'Zero', setting: 'A clandestine data fortress nestled beneath the district\'s grimy market stalls.', description: 'Manipulate digital constructs, rewrite security protocols, and outsmart a rogue AI to escape with your life and the valuable data.' },
  { title: 'Submersible Lost Depths', characterName: 'Octavia', setting: 'A majestic, brass-riveted submersible lies stranded on the abyssal floor, its pressure hull groaning.', description: 'Repair damaged sonar, restore power to the propeller array, and navigate a treacherous undersea cavern to surface safely.' },
  { title: 'Frozen Wastes Echo', characterName: 'Anya', setting: 'A research outpost buried under thick ice and snow, abandoned since the great freeze.', description: 'Reactivate archaic heating systems, decode fragmented scientist logs, and uncover the truth behind the global freeze to find a route to safety.' },
  { title: "Library's Midnight Spell", characterName: 'June', setting: 'A vast, ancient library filled with towering shelves and an air of quiet magic, locked for the night.', description: 'Arrange misplaced books, solve literary riddles, and consult ancient scrolls to lift the enchantment before sunrise.' },
  { title: 'Martian Colony Shutdown', characterName: 'Eva', setting: 'An isolated Martian research colony, its biodomes silent and dark after an unknown incident.', description: 'Restore critical life support, investigate the fate of your crew through environmental logs, and escape before a monstrous entity finds you.' },
  { title: 'Gnomish Cogwork Dungeon', characterName: 'Pip', setting: 'A vast underground dungeon crafted from intricate clockwork and ingenious gnomish traps.', description: 'Manipulate complex contraptions, solve gear-based puzzles, and outsmart automated guardians to navigate the mechanical maze.' },
  { title: 'Sunken City Data Vault', characterName: 'Ghost', setting: 'The bioluminescent ruins of a drowned mega-city\'s server vault, patrolled by corrupted AI drones.', description: 'Navigate underwater ruins, bypass ancient security systems, and decrypt data fragments before your oxygen runs out.' },
  { title: 'The Crimson Theorem', characterName: 'Vesper', setting: 'A locked mathematics library at midnight, where equations on the chalkboards seem to shift and rearrange themselves.', description: 'Solve increasingly complex mathematical puzzles that warp reality itself. Each solution reveals a fragment of a forbidden theorem that could reshape the world — or destroy it.' },
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPicks<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Creativity seeds — injected into prompts to guarantee wild variety ──

const WILD_SETTINGS = [
  'inside a sentient coral reef that breathes and thinks',
  'aboard a dimension-hopping steam locomotive',
  'in a city built on the back of a sleeping colossus',
  'within the folds of a painting that has come to life',
  'on a ring-shaped space station orbiting a dying star',
  'in a clockwork forest where trees are machines',
  'beneath a frozen ocean under glass domes',
  'inside a massive library where books rewrite reality',
  'on floating islands connected by root bridges',
  'in an underground fungal network with bioluminescent caves',
  'aboard a massive submarine exploring alien seas',
  'in a snow-globe world that someone keeps shaking',
  'within the gears of a planet-sized clock',
  'in a desert made of crushed gemstones',
  'inside a dream that multiple sleepers share',
  'on the skeleton of a dead god turned into a city',
  'in a mirror dimension where everything is backwards',
  'aboard a flying whale used as a trading vessel',
  'in a vertical city carved into a canyon wall',
  'inside a giant music box with living melody creatures',
  'in a swamp where memories manifest as ghosts',
  'on a comet hurtling through inhabited nebulae',
  'in a carnival that exists between seconds of time',
  'within an enormous hollow tree spanning miles upward',
  'in a volcanic glass palace above a magma sea',
  'inside a collapsed star where physics is wrong',
  'on a network of bridges spanning an endless abyss',
  'in an upside-down mountain range floating in mist',
  'within the digestive system of a cosmic space whale',
  'in a city of perpetual twilight lit by captive stars',
];

const WILD_CHARACTERS = [
  'a retired circus acrobat with mechanical limbs',
  'a sentient cloud of ink that possesses mannequins',
  'an amnesiac cartographer who draws maps of places that shouldn\'t exist',
  'a deaf alchemist who communicates through color-changing potions',
  'a child raised by automatons who doesn\'t know humans exist',
  'a failed wizard whose spells always do the opposite',
  'a ghost who doesn\'t know they\'re dead yet',
  'a time-displaced samurai in a world of lasers',
  'a retired villain trying to do one good deed',
  'a librarian who can read emotions like books',
  'a street musician whose songs literally change weather',
  'an elderly astronaut on one final impossible mission',
  'a shapeshifter stuck in a form that isn\'t their own',
  'a botanist who can hear what plants are thinking',
  'a detective who can only solve crimes while sleepwalking',
  'a blacksmith who forges weapons from solidified emotions',
  'a courier who delivers packages between dimensions',
  'a painter whose portraits trap people inside them',
  'a chef whose dishes grant temporary superpowers',
  'a lighthouse keeper on a lighthouse that walks',
];

const WILD_TWISTS = [
  'but nothing is what it seems — the biggest ally is the real threat',
  'and the solution requires thinking in a direction that doesn\'t exist',
  'where the "rescue" might actually be the worse outcome',
  'and the player slowly realizes they ARE the mystery',
  'but every solved puzzle changes the rules of the next one',
  'where time flows differently in each room',
  'and the environment has opinions about being explored',
  'but the items collected are actually parts of the player\'s lost identity',
  'where helping one faction inevitably betrays another',
  'and the ending depends on which items you DIDN\'T pick up',
];

// ── Genres/Themes/ArtStyles/Structure for auto-config ──

const GENRE_IDS = ['point_click', 'puzzle', 'visual_novel', 'platformer', 'hidden_object', 'escape_room', 'interactive_fiction'];
const THEME_IDS = ['horror', 'fantasy', 'scifi', 'mystery', 'cozy', 'cyberpunk', 'steampunk', 'postapoc'];
const ART_STYLE_IDS = ['cel_shaded', 'pixel_art', 'watercolor', 'noir', 'neon', 'hand_drawn', 'low_poly'];
const DIFFICULTIES = ['casual', 'standard', 'challenging'] as const;
const DENSITIES = ['light', 'moderate', 'heavy'] as const;

export interface GeneratedStory {
  title: string;
  characterName: string;
  setting: string;
  description: string;
}

export interface AutoConfig {
  genreId: string;
  themeId: string;
  artStyleId: string;
  structure: { roomCount: number; difficulty: string; puzzleDensity: string };
  story: GeneratedStory;
}

/**
 * Generate a story using Gemini if available, otherwise pick from curated bank.
 * Injects random creativity seeds so no two stories are alike.
 */
export async function generateStory(genreHint?: string, themeHint?: string): Promise<GeneratedStory> {
  if (model) {
    try {
      // Inject wild randomness so Gemini doesn't settle into patterns
      const settingSeed = randomPick(WILD_SETTINGS);
      const charSeed = randomPick(WILD_CHARACTERS);
      const twistSeed = randomPick(WILD_TWISTS);
      const avoidNames = randomPicks(STORY_BANK, 5).map(s => s.characterName);
      const timestamp = Date.now(); // unique per call

      const prompt = `You are a wildly creative game designer who NEVER repeats yourself. Seed: ${timestamp}

═══ THE #1 RULE: THE THEME IS ${(themeHint || 'mystery').toUpperCase()} ═══
Every element of this story MUST be rooted in the "${themeHint || 'mystery'}" theme — the setting, characters, mood, vocabulary, and plot.
DO NOT drift into generic sci-fi, space, or fantasy UNLESS "${themeHint}" explicitly IS one of those.
If the theme is Horror — make it HORRIFYING. If Cozy — make it WARM. If Steampunk — BRASS AND STEAM. If Cyberpunk — NEON AND RAIN.

CREATIVE DIRECTION — use these as INSPIRATION (warp them to fit the ${themeHint || 'mystery'} theme, don't use them literally):
- Setting spark: "${settingSeed}"
- Character spark: "${charSeed}"  
- Plot twist spark: "${twistSeed}"

Generate a completely original, surprising story for a ${genreHint || 'point-and-click adventure'} game.

MANDATORY RULES:
- The title must be UNIQUE, unexpected, and THEMED to ${themeHint || 'mystery'}
- The character name must be memorable and unusual — NEVER use: ${avoidNames.join(', ')}, Anya, Kael, Elara, Luna, or any other overused fantasy names
- The setting must feel specific, lived-in, and DRENCHED in ${themeHint || 'mystery'} atmosphere
- The description must hint at a surprising twist or unusual mechanic
- BE WEIRD. BE BOLD. Surprise me. No safe choices. But STAY IN THEME.

Return EXACTLY this JSON (no markdown, no code fences, just raw JSON):
{"title":"2-5 word evocative title","characterName":"single memorable protagonist name","setting":"one vivid sentence describing the location","description":"2-3 sentences about what the player does, the mystery, and the stakes"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(clean);
      if (parsed.title && parsed.characterName && parsed.setting && parsed.description) {
        return parsed as GeneratedStory;
      }
    } catch (err) {
      console.error('[Gemini Story] Error:', err);
    }
  }
  return randomPick(STORY_BANK);
}

/**
 * Generate a complete auto-config using Gemini if available, otherwise random from curated.
 * Fully random genre/theme/art combos + wild Gemini story.
 */
export async function generateAutoConfig(
  onProgress?: (step: string, detail: string, percent: number) => void,
): Promise<AutoConfig> {
  onProgress?.('🎲 Rolling the dice...', 'Picking a genre for your game', 10);
  const genreId = randomPick(GENRE_IDS);
  await new Promise(r => setTimeout(r, 400));

  onProgress?.('🎨 Weaving a theme...', `Genre locked: ${genreId.replace(/_/g, ' ')}`, 25);
  const themeId = randomPick(THEME_IDS);
  const artStyleId = randomPick(ART_STYLE_IDS);
  await new Promise(r => setTimeout(r, 400));

  onProgress?.('🏗️ Designing the structure...', `Theme: ${themeId.replace(/_/g, ' ')} · Art: ${artStyleId.replace(/_/g, ' ')}`, 40);
  const roomCount = 4 + Math.floor(Math.random() * 9); // 4-12
  const difficulty = randomPick([...DIFFICULTIES]);
  const puzzleDensity = randomPick([...DENSITIES]);
  await new Promise(r => setTimeout(r, 300));

  onProgress?.('🤖 Gemini is dreaming up your story...', 'This is the creative part — sit tight', 55);
  const story = await generateStory(
    genreId.replace(/_/g, ' '),
    themeId.replace(/_/g, ' '),
  );

  onProgress?.('✨ Polishing the details...', `"${story.title}" — starring ${story.characterName}`, 90);
  await new Promise(r => setTimeout(r, 500));

  onProgress?.('🔥 Configuration complete!', 'Ready to forge', 100);

  return {
    genreId,
    themeId,
    artStyleId,
    structure: { roomCount, difficulty, puzzleDensity },
    story,
  };
}

// ── Fallback palettes (used when Gemini is unavailable) ──

const FALLBACK_PALETTES: Record<string, CreativePalette> = {
  horror:    { bg: '#1a0a0a', wall: '#3d1515', accent: '#ff3d00', floor: '#2a1010', text: '#ffccbc', highlight: '#ff6e40', shadow: '#120505' },
  fantasy:   { bg: '#0f0a1e', wall: '#2a1f5e', accent: '#7c4dff', floor: '#1a1040', text: '#e8daff', highlight: '#b388ff', shadow: '#070510' },
  scifi:     { bg: '#0a1520', wall: '#153045', accent: '#00e5ff', floor: '#0d1f30', text: '#b2ebf2', highlight: '#18ffff', shadow: '#050d15' },
  mystery:   { bg: '#1a1508', wall: '#3d3010', accent: '#ffa726', floor: '#2a2510', text: '#ffe0b2', highlight: '#ffcc80', shadow: '#100d05' },
  cozy:      { bg: '#1a0f15', wall: '#4a2040', accent: '#f48fb1', floor: '#2a1525', text: '#fce4ec', highlight: '#f8bbd0', shadow: '#10080d' },
  cyberpunk: { bg: '#0f0518', wall: '#2a1040', accent: '#e040fb', floor: '#1a0a25', text: '#f3e5f5', highlight: '#ea80fc', shadow: '#08030d' },
  steampunk: { bg: '#1a1008', wall: '#4a3020', accent: '#ff8a65', floor: '#2a2010', text: '#ffe0b2', highlight: '#ffab91', shadow: '#0d0805' },
  postapoc:  { bg: '#15100a', wall: '#3d2a1a', accent: '#8d6e63', floor: '#251a10', text: '#d7ccc8', highlight: '#a1887f', shadow: '#0a0805' },
};

const FALLBACK_ROOM_POOLS: Record<string, string[]> = {
  point_click: ['Entrance Hall','Library','Kitchen','Cellar','Attic','Garden','Tower','Vault','Chapel','Observatory'],
  escape_room: ['The Locked Office','Basement Cell','The Cabin','Lab 42','Vault Room','The Freezer','Control Room','The Archive','Engine Room','Panic Room'],
  puzzle: ['Starter Grid','Mirror Chamber','Gear Nexus','Crystal Maze','Logic Gate','Color Prism','Gravity Well','Time Lock','Shadow Match','Cascade Room'],
  visual_novel: ['The Encounter','Rising Tension','Crossroads','Revelation','Turning Point','Dark Hour','Reconciliation','Climax','Aftermath','New Dawn'],
  platformer: ['Green Meadows','Crystal Caverns','Lava Fortress','Sky Archipelago','Frost Peak','Shadow Factory','Neon Circuit','Jungle Canopy','Storm Citadel','Clockwork Spire'],
  hidden_object: ['The Study','Victorian Parlor','Old Workshop','Market Square','Train Station','Abandoned Pier','Museum Hall','Garden Shed','Antique Shop','Clock Tower'],
  interactive_fiction: ['The Threshold','Forked Path','Whispering Hall','Memory Lane','The Crossroads','Echo Chamber','Forgotten Gate','Liminal Space','The Descent','Ascension'],
};

const FALLBACK_ITEMS = [
  { name: 'Key', emoji: '🔑' }, { name: 'Gem', emoji: '💎' }, { name: 'Note', emoji: '📜' },
  { name: 'Coin', emoji: '🪙' }, { name: 'Map', emoji: '🗺️' }, { name: 'Lens', emoji: '🔍' },
  { name: 'Ring', emoji: '💍' }, { name: 'Skull', emoji: '💀' }, { name: 'Candle', emoji: '🕯️' },
  { name: 'Feather', emoji: '🪶' }, { name: 'Compass', emoji: '🧭' }, { name: 'Vial', emoji: '🧪' },
];

const FALLBACK_EXAMINE = [
  'Dust swirls in the dim light...',
  'Something feels off about this place.',
  'The walls whisper forgotten secrets.',
  'A faint hum emanates from below.',
  'Shadows dance in the corners.',
  'The air is thick with anticipation.',
  'Echoes of the past linger here.',
  'A chill runs down your spine.',
  'The floor creaks underfoot.',
  'An eerie silence fills the room.',
];

function buildFallbackBrief(config: GameConfig): CreativeBrief {
  const themeId = config.theme.id;
  const genreId = config.genre.id;
  const roomCount = config.structure.roomCount;
  const pool = FALLBACK_ROOM_POOLS[genreId] || FALLBACK_ROOM_POOLS.point_click;
  const pal = FALLBACK_PALETTES[themeId] || FALLBACK_PALETTES.mystery;

  const rooms: CreativeRoom[] = [];
  for (let i = 0; i < roomCount; i++) {
    const furnitureCount = 3 + Math.floor(Math.random() * 4);
    const furniture: RoomFurniture[] = [];
    for (let f = 0; f < furnitureCount; f++) {
      furniture.push({
        type: (['rect', 'rect', 'circle', 'arch'] as const)[Math.floor(Math.random() * 4)],
        x: 0.08 + Math.random() * 0.7,
        y: 0.15 + Math.random() * 0.5,
        w: 0.06 + Math.random() * 0.15,
        h: 0.06 + Math.random() * 0.2,
        color: pal.wall,
        label: ['shelf', 'table', 'chair', 'crate', 'cabinet', 'lamp', 'pillar', 'statue'][Math.floor(Math.random() * 8)],
      });
    }
    rooms.push({
      name: pool[i % pool.length],
      description: `A ${themeId}-themed area with shadowy corners and hidden details.`,
      examineText: FALLBACK_EXAMINE[i % FALLBACK_EXAMINE.length],
      atmosphere: ['Eerie silence', 'Distant echoes', 'Faint humming', 'Creaking wood', 'Dripping water'][i % 5],
      wallColor: pal.wall,
      floorColor: pal.floor,
      ceilingColor: pal.wall,
      furniture,
      hotspots: [],
      hasWindow: i % 3 !== 2,
      windowType: (['round', 'tall', 'wide'] as const)[i % 3],
      lightingDir: (['left', 'right', 'center', 'dim'] as const)[i % 4],
    });
  }

  const items: CreativeItem[] = [];
  for (let i = 0; i < roomCount; i++) {
    const fi = FALLBACK_ITEMS[i % FALLBACK_ITEMS.length];
    items.push({ name: fi.name, emoji: fi.emoji, description: `You found a ${fi.name.toLowerCase()} in the ${rooms[i].name}.`, roomIndex: i });
  }

  const puzzles: PuzzleConnection[] = [];
  if (roomCount > 3) {
    puzzles.push({
      doorInRoom: Math.floor(roomCount / 2) - 1,
      leadsToRoom: Math.floor(roomCount / 2),
      requiredItem: items[0].name,
      lockedMessage: `This passage is locked. You need the ${items[0].name}.`,
      unlockedMessage: `The ${items[0].name} fits perfectly. The way forward opens.`,
    });
  }

  const hintTexts: string[] = rooms.map((r, i) =>
    i === 0 ? `Look around the ${r.name} for something useful...` : `Maybe there's something interesting in the ${r.name}...`
  );

  return {
    rooms,
    items,
    palette: { ...pal, highlight: pal.accent + 'cc', shadow: pal.bg + 'ee' },
    puzzles,
    gameVibe: `A ${config.theme.name} ${config.genre.name} rendered in ${config.artStyle.name} style.`,
    hintTexts,
    openingText: `${config.story.characterName} arrives at ${config.story.setting}`,
    endingText: `${config.story.characterName} has uncovered the truth. The adventure is complete.`,
  };
}

function cleanJson(text: string): string {
  let s = text.trim();
  // Strip markdown fences anywhere: ```json ... ``` or ``` ... ```
  s = s.replace(/^\s*```(?:json)?\s*\n?/im, '').replace(/\n?\s*```\s*$/im, '').trim();
  return s;
}

/**
 * Generate the complete creative brief for a game via Gemini.
 * Uses CHUNKED calls per the Gemini usage rules — never one giant prompt.
 * Each step is a focused Gemini call that builds on the previous results.
 */

// Art style palette guidance — tells Gemini HOW the art style affects colors
function artStylePaletteGuide(artId: string): string {
  const guides: Record<string, string> = {
    cel_shaded: 'Bold, saturated, high-contrast colors with strong accent pops. Think Borderlands — vivid but not pastel.',
    pixel_art: 'Limited retro palette (12-16 colors). Rich, chunky colors typical of SNES/GBA era. Slightly desaturated, warm.',
    watercolor: 'Soft, muted, translucent washes of color. Pastel-leaning. Colors should feel blended and gentle.',
    noir: 'Primarily grayscale with ONE selective accent color (red, amber, or cyan). Very high contrast. Deep blacks, bright whites.',
    neon: 'Dark/black backgrounds with electric neon accent colors (cyan, magenta, hot pink, electric blue). Glowing, vivid.',
    hand_drawn: 'Earthy, natural tones like pencil and ink. Warm off-whites, sepia, charcoal grays. Muted organic palette.',
    low_poly: 'Clean, modern, flat-design colors. Limited palette, medium saturation. Think Google Material Design.',
  };
  return guides[artId] || guides.cel_shaded;
}

// Genre-specific scene design instructions
function genreSceneGuide(genreId: string): string {
  const guides: Record<string, string> = {
    point_click: 'Design rooms as explorable environments with interactive objects. Each room should feel like a place to investigate.',
    escape_room: 'Rooms are confined puzzle spaces. Pack each with mechanisms, locks, and hidden compartments. Claustrophobic feeling.',
    platformer: 'Design levels as side-scrolling environments. Furniture becomes platforms, obstacles, and landmarks at various heights. Emphasize verticality.',
    visual_novel: 'Design scenes as story backdrops. Focus on atmosphere and character interaction spaces. Fewer objects, more mood.',
    interactive_fiction: 'Design locations as evocative text-adventure spaces. Rich atmospheric descriptions matter more than furniture count.',
    puzzle: 'Design stages as puzzle environments. Objects should suggest logic, patterns, and mechanisms. Clean, focused layouts.',
    hidden_object: 'Design scenes PACKED with objects and details. Cluttered, rich, detailed environments where things can hide.',
  };
  return guides[genreId] || guides.point_click;
}

// Shared context builder for brief chunks
function briefContext(config: GameConfig): string {
  const roomCount = config.structure.roomCount;
  const creativitySeed = `Creativity seed: ${Date.now()}. Wild setting inspiration: "${randomPick(WILD_SETTINGS)}". Plot twist spark: "${randomPick(WILD_TWISTS)}".`;
  return `Genre: ${config.genre.name}.
═══ THEME (PRIMARY CREATIVE CONSTRAINT): ${config.theme.name} — EVERY room, item, color, and description MUST reflect this theme. Do NOT drift into space/sci-fi/generic fantasy unless the theme IS one of those. ═══
═══ ART STYLE (VISUAL CONSTRAINT): ${config.artStyle.name} — ALL visual descriptions, color choices, and atmosphere MUST match this art style. ${artStylePaletteGuide(config.artStyle.id)} ═══
Story: "${config.story.title}" — ${config.story.description}. Setting: ${config.story.setting}. Protagonist: ${config.story.characterName}. Scenes: ${roomCount}. Difficulty: ${config.structure.difficulty}. Puzzle density: ${config.structure.puzzleDensity}. ${creativitySeed}`;
}

/** CHUNK 1: Palette + Vibe + Opening/Ending */
export async function generateBriefPalette(
  config: GameConfig,
  onStatus?: (msg: string) => void,
): Promise<{ palette: CreativePalette; gameVibe: string; openingText: string; endingText: string }> {
  if (!model) {
    onStatus?.('Gemini unavailable — using curated palette');
    const fb = buildFallbackBrief(config);
    return { palette: fb.palette, gameVibe: fb.gameVibe, openingText: fb.openingText, endingText: fb.endingText };
  }

  const ctx = briefContext(config);
  onStatus?.('Asking Gemini to design the color palette and creative vision...');
  try {
    const p1 = await model.generateContent(`You are a creative director designing a game. ${ctx}

Return ONLY this JSON (no fences, no explanation):
{"gameVibe":"A punchy 3-8 word tagline — the FEELING of this game (short enough to read at a glance)","palette":{"bg":"#hex dark bg","wall":"#hex mid wall","accent":"#hex vibrant accent","floor":"#hex floor","text":"#hex light text","highlight":"#hex glow/highlight","shadow":"#hex deep shadow"},"openingText":"2-3 sentences. The player just arrived. Set the scene in second person. Make it gripping. Proofread carefully.","endingText":"2-3 sentences. The player solved it. Wrap up the story satisfyingly in second person. Proofread carefully."}`);
    const d1 = JSON.parse(cleanJson(p1.response.text()));
    onStatus?.(`Palette locked: accent ${d1.palette.accent} · "${d1.gameVibe}"`);
    return { palette: d1.palette, gameVibe: d1.gameVibe, openingText: d1.openingText, endingText: d1.endingText };
  } catch (err) {
    console.error('[Gemini Chunk 1 - Palette] Error:', err);
    onStatus?.('Palette generation failed — using fallback colors');
    const fb = buildFallbackBrief(config);
    return { palette: fb.palette, gameVibe: fb.gameVibe, openingText: fb.openingText, endingText: fb.endingText };
  }
}

/** CHUNK 2: Room designs with furniture layouts */
export async function generateBriefRooms(
  config: GameConfig,
  palette: CreativePalette,
  onStatus?: (msg: string) => void,
): Promise<CreativeRoom[]> {
  const roomCount = config.structure.roomCount;

  if (!model) {
    onStatus?.('Gemini unavailable — using curated rooms');
    return buildFallbackBrief(config).rooms;
  }

  const ctx = briefContext(config);
  onStatus?.(`Designing ${roomCount} unique scenes with furniture layouts...`);
  try {
    const genreGuide = genreSceneGuide(config.genre.id);
    const difficultyGuide = config.structure.difficulty === 'challenging' ? 'Complex layouts, more objects, denser environments.' : config.structure.difficulty === 'casual' ? 'Simple, open layouts. Fewer objects, clear paths.' : 'Moderate complexity. Balanced layouts.';
    const furnitureCount = config.genre.id === 'hidden_object' ? '6-10' : config.structure.difficulty === 'challenging' ? '5-8' : '3-6';
    const p2 = await model.generateContent(`You are a game level designer. ${ctx}
Accent color: ${palette.accent}. Wall color: ${palette.wall}. Floor color: ${palette.floor}.

GENRE-SPECIFIC DESIGN: ${genreGuide}
DIFFICULTY: ${difficultyGuide}

Design ${roomCount} unique scenes. Each must feel DIFFERENT — different furniture, different layouts, different mood.

Return ONLY JSON array (no fences):
[{"name":"Scene Name","description":"What this scene looks like (1 vivid sentence matching the ${config.artStyle.name} art style)","examineText":"Atmospheric first-person text when examining","atmosphere":"2-3 word mood tag","wallColor":"#hex unique to this scene","floorColor":"#hex","ceilingColor":"#hex","hasWindow":true,"windowType":"round|tall|wide|none","lightingDir":"left|right|center|dim","furniture":[{"type":"rect|circle|arch|triangle","x":0.1,"y":0.2,"w":0.15,"h":0.25,"color":"#hex","label":"what this is (bookshelf, desk, etc)"}]}]

RULES:
- Furniture x/y/w/h are normalized 0-1. x+w must be < 0.95, y+h must be < 0.85.
- Each scene needs ${furnitureCount} furniture pieces — vary by scene.
- Vary furniture positions scene to scene — NOT all the same layout.
- Wall/floor colors should vary subtly but stay in ${config.theme.name} theme and ${config.artStyle.name} palette.
- Exactly ${roomCount} scenes.`);
    const d2 = JSON.parse(cleanJson(p2.response.text()));
    if (Array.isArray(d2) && d2.length === roomCount) {
      const rooms = d2.map((r: Record<string, unknown>) => ({
        name: String(r.name || 'Room'),
        description: String(r.description || ''),
        examineText: String(r.examineText || ''),
        atmosphere: String(r.atmosphere || ''),
        wallColor: String(r.wallColor || palette.wall),
        floorColor: String(r.floorColor || palette.floor),
        ceilingColor: String(r.ceilingColor || palette.wall),
        hasWindow: r.hasWindow !== false,
        windowType: (r.windowType as CreativeRoom['windowType']) || 'tall',
        lightingDir: (r.lightingDir as CreativeRoom['lightingDir']) || 'center',
        hotspots: [],
        furniture: (r.furniture as RoomFurniture[]) || [],
      })) as CreativeRoom[];
      const totalFurniture = rooms.reduce((s, r) => s + r.furniture.length, 0);
      onStatus?.(`${roomCount} scenes designed — ${totalFurniture} furniture pieces placed`);
      return rooms;
    }
    throw new Error('Wrong room count');
  } catch (err) {
    console.error('[Gemini Chunk 2 - Rooms] Error:', err);
    onStatus?.('Scene design failed — using fallback layouts');
    return buildFallbackBrief(config).rooms;
  }
}

/** CHUNK 3: Items + puzzles */
export async function generateBriefItems(
  config: GameConfig,
  rooms: CreativeRoom[],
  onStatus?: (msg: string) => void,
): Promise<{ items: CreativeItem[]; puzzles: PuzzleConnection[] }> {
  const roomCount = config.structure.roomCount;

  if (!model) {
    onStatus?.('Gemini unavailable — using curated items');
    const fb = buildFallbackBrief(config);
    return { items: fb.items, puzzles: fb.puzzles };
  }

  onStatus?.('Crafting thematic items and puzzle connections...');
  try {
    const roomNames = rooms.map(r => r.name);
    const p3 = await model.generateContent(`You are a puzzle designer for a ${config.genre.name} game with ${config.artStyle.name} art style and ${config.theme.name} theme.
Scenes (in order): ${roomNames.map((n, i) => `${i}: ${n}`).join(', ')}
Story: "${config.story.title}" — ${config.story.description}. Setting: ${config.story.setting}. Protagonist: ${config.story.characterName}.
Difficulty: ${config.structure.difficulty}, Puzzle Density: ${config.structure.puzzleDensity}

Return ONLY this JSON (no fences):
{"items":[{"name":"Thematic Item Name","emoji":"single emoji","description":"Flavor text when picked up (1 sentence, atmospheric)","roomIndex":0}],"puzzles":[{"doorInRoom":2,"leadsToRoom":3,"requiredItem":"Item Name","lockedMessage":"Why this door won't open (atmospheric)","unlockedMessage":"What happens when you use the item (atmospheric)"}]}

RULES:
- Exactly ${roomCount} items, one per scene, roomIndex 0 to ${roomCount - 1}.
- Items MUST fit the ${config.theme.name} theme — no generic "Key" or "Gem" unless the theme demands it.
- Item descriptions should evoke the ${config.artStyle.name} visual style.
- ${config.structure.puzzleDensity === 'heavy' ? '2-3' : config.structure.puzzleDensity === 'moderate' ? '1-2' : '0-1'} puzzle connections where a door between scenes requires a specific item to pass.
- Each puzzle's requiredItem must exactly match an item name from the items array.
- Locked doors should have atmospheric messages, not generic text.`);
    const d3 = JSON.parse(cleanJson(p3.response.text()));
    const items = d3.items;
    const puzzles = d3.puzzles || [];
    onStatus?.(`${items.length} items created, ${puzzles.length} puzzle gates wired`);
    return { items, puzzles };
  } catch (err) {
    console.error('[Gemini Chunk 3 - Items] Error:', err);
    onStatus?.('Item/puzzle design failed — using fallbacks');
    const fb = buildFallbackBrief(config);
    return { items: fb.items, puzzles: fb.puzzles };
  }
}

/** CHUNK 4: Context-aware hints */
export async function generateBriefHints(
  config: GameConfig,
  rooms: CreativeRoom[],
  items: CreativeItem[],
  onStatus?: (msg: string) => void,
): Promise<string[]> {
  const roomCount = config.structure.roomCount;

  if (!model) {
    onStatus?.('Gemini unavailable — using generic hints');
    return rooms.map(r => `Something catches your eye in the ${r.name}...`);
  }

  onStatus?.('Writing context-aware hints for every room...');
  try {
    const roomNames = rooms.map(r => r.name);
    const itemNames = items.map(i => i.name);
    const p4 = await model.generateContent(`You are writing hint text for a game. The player might get stuck in any room.
Rooms: ${roomNames.join(', ')}
Items (in room order): ${itemNames.join(', ')}
Story: "${config.story.title}"

Return ONLY a JSON array of ${roomCount} hint strings (no fences):
["Hint for room 0 — a gentle nudge like a companion would give, e.g. 'That old desk looks like it hasn't been opened in years...'", ...]

RULES:
- Each hint should feel like a friend nudging the player, not a walkthrough.
- Reference specific objects in that room.
- Never say "go here" or "pick up X" directly — be suggestive.
- Exactly ${roomCount} strings.`);
    const d4 = JSON.parse(cleanJson(p4.response.text()));
    const hintTexts = Array.isArray(d4) && d4.length === roomCount ? d4 : rooms.map(r => `Something catches your eye in the ${r.name}...`);
    onStatus?.(`${hintTexts.length} companion-style hints written`);
    return hintTexts;
  } catch (err) {
    console.error('[Gemini Chunk 4 - Hints] Error:', err);
    onStatus?.('Hint generation failed — using generic hints');
    return rooms.map(r => `Something catches your eye in the ${r.name}...`);
  }
}

/** Convenience wrapper that runs all 4 chunks — kept for backward compat */
export async function generateCreativeBrief(
  config: GameConfig,
  onStatus?: (msg: string) => void,
): Promise<CreativeBrief> {
  if (!model) {
    onStatus?.('Gemini unavailable — using curated creative content');
    return buildFallbackBrief(config);
  }

  const roomCount = config.structure.roomCount;
  const creativitySeed = `Creativity seed: ${Date.now()}. Wild setting inspiration: "${randomPick(WILD_SETTINGS)}". Plot twist spark: "${randomPick(WILD_TWISTS)}".`;
  const ctx = `Genre: ${config.genre.name}.
═══ THEME: ${config.theme.name} — ALL content MUST reflect this theme. ═══
═══ ART STYLE: ${config.artStyle.name} — ${artStylePaletteGuide(config.artStyle.id)} ═══
Story: "${config.story.title}" — ${config.story.description}. Setting: ${config.story.setting}. Protagonist: ${config.story.characterName}. Scenes: ${roomCount}. Difficulty: ${config.structure.difficulty}. Puzzle density: ${config.structure.puzzleDensity}. ${creativitySeed}`;

  // ─── CHUNK 1: Palette + Vibe + Opening/Ending ───
  onStatus?.('Gemini → Step 1/4: Designing color palette and creative vision...');
  let palette: CreativePalette;
  let gameVibe: string;
  let openingText: string;
  let endingText: string;
  try {
    const p1 = await model.generateContent(`You are a creative director designing a game. ${ctx}

CRITICAL — The palette MUST match the art style:
${artStylePaletteGuide(config.artStyle.id)}

Return ONLY this JSON (no fences, no explanation):
{"gameVibe":"A punchy 3-8 word tagline — the FEELING of this game (short enough to read at a glance)","palette":{"bg":"#hex dark bg","wall":"#hex mid wall","accent":"#hex vibrant accent","floor":"#hex floor","text":"#hex light text","highlight":"#hex glow/highlight","shadow":"#hex deep shadow"},"openingText":"2-3 sentences. The player just arrived. Set the scene in second person. Make it gripping. Proofread carefully.","endingText":"2-3 sentences. The player solved it. Wrap up the story satisfyingly in second person. Proofread carefully."}`);
    const d1 = JSON.parse(cleanJson(p1.response.text()));
    palette = d1.palette;
    gameVibe = d1.gameVibe;
    openingText = d1.openingText;
    endingText = d1.endingText;
    onStatus?.(`Palette designed: accent ${palette.accent}, vibe: "${gameVibe}"`);
  } catch (err) {
    console.error('[Gemini Chunk 1 - Palette] Error:', err);
    onStatus?.('Palette generation failed — using fallback');
    const fb = buildFallbackBrief(config);
    palette = fb.palette; gameVibe = fb.gameVibe; openingText = fb.openingText; endingText = fb.endingText;
  }

  // ─── CHUNK 2: Room designs with furniture layouts ───
  onStatus?.('Gemini → Step 2/4: Designing unique room layouts and furniture...');
  let rooms: CreativeRoom[];
  try {
    const genreGuide = genreSceneGuide(config.genre.id);
    const difficultyGuide = config.structure.difficulty === 'challenging' ? 'Complex layouts, more objects, denser environments.' : config.structure.difficulty === 'casual' ? 'Simple, open layouts. Fewer objects, clear paths.' : 'Moderate complexity. Balanced layouts.';
    const furnitureCount = config.genre.id === 'hidden_object' ? '6-10' : config.structure.difficulty === 'challenging' ? '5-8' : '3-6';
    const p2 = await model.generateContent(`You are a game level designer. ${ctx}
Accent color: ${palette!.accent}. Wall color: ${palette!.wall}. Floor color: ${palette!.floor}.

GENRE-SPECIFIC DESIGN: ${genreGuide}
DIFFICULTY: ${difficultyGuide}

Design ${roomCount} unique scenes. Each must feel DIFFERENT — different furniture, different layouts, different mood.

Return ONLY JSON array (no fences):
[{"name":"Scene Name","description":"What this scene looks like (1 vivid sentence matching the ${config.artStyle.name} art style)","examineText":"Atmospheric first-person text when examining","atmosphere":"2-3 word mood tag","wallColor":"#hex unique to this scene","floorColor":"#hex","ceilingColor":"#hex","hasWindow":true,"windowType":"round|tall|wide|none","lightingDir":"left|right|center|dim","furniture":[{"type":"rect|circle|arch|triangle","x":0.1,"y":0.2,"w":0.15,"h":0.25,"color":"#hex","label":"what this is (bookshelf, desk, etc)"}]}]

RULES:
- Furniture x/y/w/h are normalized 0-1. x+w must be < 0.95, y+h must be < 0.85.
- Each scene needs ${furnitureCount} furniture pieces — vary by scene.
- Vary furniture positions scene to scene — NOT all the same layout.
- Wall/floor colors should vary subtly but stay in ${config.theme.name} theme and ${config.artStyle.name} palette.
- Exactly ${roomCount} scenes.`);
    const d2 = JSON.parse(cleanJson(p2.response.text()));
    if (Array.isArray(d2) && d2.length === roomCount) {
      rooms = d2.map((r: Record<string, unknown>) => ({
        name: String(r.name || 'Room'),
        description: String(r.description || ''),
        examineText: String(r.examineText || ''),
        atmosphere: String(r.atmosphere || ''),
        wallColor: String(r.wallColor || palette.wall),
        floorColor: String(r.floorColor || palette.floor),
        ceilingColor: String(r.ceilingColor || palette.wall),
        hasWindow: r.hasWindow !== false,
        windowType: (r.windowType as CreativeRoom['windowType']) || 'tall',
        lightingDir: (r.lightingDir as CreativeRoom['lightingDir']) || 'center',
        hotspots: [],
        furniture: (r.furniture as RoomFurniture[]) || [],
      })) as CreativeRoom[];
      onStatus?.(`${roomCount} unique rooms designed with ${rooms.reduce((s, r) => s + r.furniture.length, 0)} total furniture pieces`);
    } else {
      throw new Error('Wrong room count');
    }
  } catch (err) {
    console.error('[Gemini Chunk 2 - Rooms] Error:', err);
    onStatus?.('Room design failed — using fallback');
    rooms = buildFallbackBrief(config).rooms;
  }

  // ─── CHUNK 3: Items + puzzles ───
  onStatus?.('Gemini → Step 3/4: Creating items and puzzle connections...');
  let items: CreativeItem[];
  let puzzles: PuzzleConnection[];
  try {
    const roomNames = rooms!.map(r => r.name);
    const p3 = await model.generateContent(`You are a puzzle designer for a ${config.genre.name} game with ${config.artStyle.name} art style and ${config.theme.name} theme.
Scenes (in order): ${roomNames.map((n, i) => `${i}: ${n}`).join(', ')}
Story: "${config.story.title}" — ${config.story.description}. Setting: ${config.story.setting}. Protagonist: ${config.story.characterName}.
Difficulty: ${config.structure.difficulty}, Puzzle Density: ${config.structure.puzzleDensity}

Return ONLY this JSON (no fences):
{"items":[{"name":"Thematic Item Name","emoji":"single emoji","description":"Flavor text when picked up (1 sentence, atmospheric)","roomIndex":0}],"puzzles":[{"doorInRoom":2,"leadsToRoom":3,"requiredItem":"Item Name","lockedMessage":"Why this door won't open (atmospheric)","unlockedMessage":"What happens when you use the item (atmospheric)"}]}

RULES:
- Exactly ${roomCount} items, one per scene, roomIndex 0 to ${roomCount - 1}.
- Items MUST fit the ${config.theme.name} theme — no generic "Key" or "Gem" unless the theme demands it.
- Item descriptions should evoke the ${config.artStyle.name} visual style.
- ${config.structure.puzzleDensity === 'heavy' ? '2-3' : config.structure.puzzleDensity === 'moderate' ? '1-2' : '0-1'} puzzle connections where a door between scenes requires a specific item to pass.
- Each puzzle's requiredItem must exactly match an item name from the items array.
- Locked doors should have atmospheric messages, not generic text.`);
    const d3 = JSON.parse(cleanJson(p3.response.text()));
    items = d3.items;
    puzzles = d3.puzzles || [];
    onStatus?.(`${items.length} items and ${puzzles.length} puzzle gates designed`);
  } catch (err) {
    console.error('[Gemini Chunk 3 - Items] Error:', err);
    onStatus?.('Item/puzzle design failed — using fallback');
    const fb = buildFallbackBrief(config);
    items = fb.items; puzzles = fb.puzzles;
  }

  // ─── CHUNK 4: Context-aware hints ───
  onStatus?.('Gemini → Step 4/4: Writing context-aware hints and examine details...');
  let hintTexts: string[];
  try {
    const roomNames = rooms!.map(r => r.name);
    const itemNames = items!.map(i => i.name);
    const p4 = await model.generateContent(`You are writing hint text for a game. The player might get stuck in any room.
Rooms: ${roomNames.join(', ')}
Items (in room order): ${itemNames.join(', ')}
Story: "${config.story.title}"

Return ONLY a JSON array of ${roomCount} hint strings (no fences):
["Hint for room 0 — a gentle nudge like a companion would give, e.g. 'That old desk looks like it hasn't been opened in years...'", ...]

RULES:
- Each hint should feel like a friend nudging the player, not a walkthrough.
- Reference specific objects in that room.
- Never say "go here" or "pick up X" directly — be suggestive.
- Exactly ${roomCount} strings.`);
    const d4 = JSON.parse(cleanJson(p4.response.text()));
    hintTexts = Array.isArray(d4) && d4.length === roomCount ? d4 : rooms!.map(r => `Something catches your eye in the ${r.name}...`);
    onStatus?.('Hint system designed — contextual nudges for every room');
  } catch (err) {
    console.error('[Gemini Chunk 4 - Hints] Error:', err);
    onStatus?.('Hint generation failed — using generic hints');
    hintTexts = rooms!.map(r => `Something catches your eye in the ${r.name}...`);
  }

  onStatus?.('Creative brief complete — all 4 Gemini design passes finished');
  return {
    rooms: rooms!,
    items: items!,
    palette: palette!,
    puzzles: puzzles!,
    gameVibe: gameVibe!,
    hintTexts: hintTexts!,
    openingText: openingText!,
    endingText: endingText!,
  };
}

// ── QA Pass — Gemini reviews the assembled creative brief for issues ──

export interface QAResult {
  passed: boolean;
  issues: string[];
  fixes: string[];
}

/**
 * Send the assembled creative brief to Gemini for a QA review.
 * Checks for: orphan items, broken puzzle chains, unreachable rooms,
 * theme drift, incoherent story, unhelpful hints, and spelling errors.
 * Returns a structured report. If fixable issues are found, mutates
 * the brief in-place with corrections.
 */
export async function qaCreativeBrief(
  config: GameConfig,
  brief: CreativeBrief,
  onStatus?: (msg: string) => void,
): Promise<QAResult> {
  if (!model) {
    onStatus?.('Gemini unavailable — skipping QA pass');
    return { passed: true, issues: [], fixes: ['QA skipped (no Gemini)'] };
  }

  onStatus?.('Sending creative brief to Gemini for quality review...');

  const roomSummary = brief.rooms.map((r, i) => `${i}: "${r.name}" — ${r.description} (${r.furniture.length} furniture)`).join('\n');
  const itemSummary = brief.items.map((it, i) => `${i}: ${it.emoji} ${it.name} (in room ${it.roomIndex}) — "${it.description}"`).join('\n');
  const puzzleSummary = brief.puzzles.map((p, i) => `${i}: door in room ${p.doorInRoom} → room ${p.leadsToRoom}, requires "${p.requiredItem}"`).join('\n') || '(none)';
  const hintSummary = brief.hintTexts.map((h, i) => `${i}: "${h}"`).join('\n');

  const prompt = `You are a QA analyst reviewing a creative brief for a ${config.genre.name} game.
Theme: ${config.theme.name}. Art Style: ${config.artStyle.name}.
Story: "${config.story.title}" — ${config.story.description}
Setting: ${config.story.setting}. Protagonist: ${config.story.characterName}.
Game vibe: "${brief.gameVibe}"

ROOMS:
${roomSummary}

ITEMS:
${itemSummary}

PUZZLES:
${puzzleSummary}

HINTS:
${hintSummary}

OPENING: "${brief.openingText}"
ENDING: "${brief.endingText}"

Review this brief and check for ALL of these issues:
1. ORPHAN ITEMS — any item whose roomIndex is out of bounds (>= ${brief.rooms.length}) or duplicated?
2. BROKEN PUZZLES — any puzzle referencing a requiredItem that doesn't exist in the items array (exact name match)? Any doorInRoom or leadsToRoom out of bounds?
3. UNREACHABLE ROOMS — are puzzle gates creating a dead end where the player can't reach the item needed to pass?
4. THEME DRIFT — do room names, item names, descriptions, and vibe actually match "${config.theme.name}"? Flag anything that feels generic or off-theme.
5. STORY COHERENCE — does the opening/ending text match the story title and setting? Any contradictions?
6. HINT QUALITY — are any hints too vague ("look around") or too direct ("pick up the key")? Do they reference real objects in their rooms?
7. SPELLING/GRAMMAR — any typos or broken sentences in opening, ending, descriptions, or hints?

Return ONLY this JSON (no fences):
{"passed":true/false,"issues":["description of each issue found"],"fixes":["description of each fix applied"],"fixedItems":null or [{"name":"...","emoji":"...","description":"...","roomIndex":0},...],"fixedPuzzles":null or [{"doorInRoom":0,"leadsToRoom":1,"requiredItem":"...","lockedMessage":"...","unlockedMessage":"..."},...],"fixedHints":null or ["hint0","hint1",...],"fixedVibe":null or "corrected vibe","fixedOpening":null or "corrected opening","fixedEnding":null or "corrected ending"}`;

  try {
    const result = await model.generateContent(prompt);
    const qa = JSON.parse(cleanJson(result.response.text()));

    const issues: string[] = Array.isArray(qa.issues) ? qa.issues : [];
    const fixes: string[] = Array.isArray(qa.fixes) ? qa.fixes : [];

    // Apply fixes to the brief in-place
    if (Array.isArray(qa.fixedItems) && qa.fixedItems.length === brief.items.length) {
      brief.items = qa.fixedItems;
      onStatus?.(`QA fixed ${qa.fixedItems.length} items`);
    }
    if (Array.isArray(qa.fixedPuzzles)) {
      brief.puzzles = qa.fixedPuzzles;
      onStatus?.(`QA fixed ${qa.fixedPuzzles.length} puzzle connections`);
    }
    if (Array.isArray(qa.fixedHints) && qa.fixedHints.length === brief.hintTexts.length) {
      brief.hintTexts = qa.fixedHints;
      onStatus?.(`QA fixed ${qa.fixedHints.length} hints`);
    }
    if (typeof qa.fixedVibe === 'string' && qa.fixedVibe) {
      brief.gameVibe = qa.fixedVibe;
      onStatus?.(`QA fixed vibe: "${qa.fixedVibe}"`);
    }
    if (typeof qa.fixedOpening === 'string' && qa.fixedOpening) {
      brief.openingText = qa.fixedOpening;
      onStatus?.('QA fixed opening text');
    }
    if (typeof qa.fixedEnding === 'string' && qa.fixedEnding) {
      brief.endingText = qa.fixedEnding;
      onStatus?.('QA fixed ending text');
    }

    const passed = issues.length === 0;
    onStatus?.(passed
      ? '✅ QA passed — no issues found'
      : `⚠️ QA found ${issues.length} issue(s), applied ${fixes.length} fix(es)`);

    return { passed, issues, fixes };
  } catch (err) {
    console.error('[Gemini QA] Error:', err);
    onStatus?.('QA review failed — proceeding without fixes');
    return { passed: true, issues: [], fixes: ['QA call failed — skipped'] };
  }
}

/**
 * Post-preview QA — Gemini reviews the assembled game code for logic bugs.
 * Receives the game JS (stripped of base64 images to stay within token limits)
 * and checks for dead-end rooms, unreachable items, broken state machines, etc.
 */
export async function qaGameCode(
  config: GameConfig,
  previewHtml: string,
  onStatus?: (msg: string) => void,
): Promise<QAResult> {
  if (!model) {
    onStatus?.('Gemini unavailable — skipping game code QA');
    return { passed: true, issues: [], fixes: ['Game QA skipped (no Gemini)'] };
  }

  onStatus?.('Extracting game logic for review...');

  // Strip base64 image data to keep within token limits
  // Replace data URIs with placeholders so Gemini sees the structure but not the bulk
  const stripped = previewHtml
    .replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, 'data:image/png;base64,[IMAGE_DATA_STRIPPED]')
    .replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g, 'data:image/jpeg;base64,[IMAGE_DATA_STRIPPED]');

  // If still too large (>80k chars), truncate to the script section only
  let codeToReview = stripped;
  const scriptStart = stripped.indexOf('<script>');
  const scriptEnd = stripped.lastIndexOf('</script>');
  if (scriptStart !== -1 && scriptEnd !== -1 && stripped.length > 80000) {
    codeToReview = stripped.substring(scriptStart, scriptEnd + '</script>'.length);
  }

  // Further truncate if still massive (shouldn't happen after image strip)
  if (codeToReview.length > 100000) {
    codeToReview = codeToReview.substring(0, 100000) + '\n// [TRUNCATED]';
  }

  onStatus?.('Sending game code to Gemini for logic review...');

  const prompt = `You are a senior game QA engineer reviewing the JavaScript source code of a ${config.genre.name} game.
Theme: ${config.theme.name}. Title: "${config.story.title}".

Below is the complete game code. Review it for FUNCTIONAL issues only (not style/formatting):

\`\`\`html
${codeToReview}
\`\`\`

Check for these specific issues:
1. DEAD-END ROOMS — can the player get trapped in a room with no way out?
2. UNREACHABLE ITEMS — is any item placed in a room the player can't reach due to puzzle gates?
3. PUZZLE LOGIC — does every locked door's requiredItem actually exist in the game data? Can the player always get the item BEFORE needing it?
4. WIN CONDITION — is there a clear path from room 0 to the ending? Can the player actually complete the game?
5. STATE BUGS — any variables used before initialization? Any array index out-of-bounds risks?
6. NAVIGATION — does every room have at least one door/exit? Are door connections bidirectional where expected?
7. INVENTORY — can the player pick up all items? Are item pickup handlers wired correctly?

IMPORTANT: Only report REAL bugs that would prevent the player from completing the game. Ignore cosmetic issues, naming style, or subjective design choices.

Return ONLY this JSON (no fences):
{"passed":true/false,"issues":["description of each real bug found"],"fixes":["description of what should be fixed"]}`;

  try {
    const result = await model.generateContent(prompt);
    const qa = JSON.parse(cleanJson(result.response.text()));

    const issues: string[] = Array.isArray(qa.issues) ? qa.issues : [];
    const fixes: string[] = Array.isArray(qa.fixes) ? qa.fixes : [];
    const passed = issues.length === 0;

    onStatus?.(passed
      ? '✅ Game code QA passed — no logic bugs found'
      : `⚠️ Game QA found ${issues.length} potential issue(s)`);

    return { passed, issues, fixes };
  } catch (err) {
    console.error('[Gemini Game QA] Error:', err);
    onStatus?.('Game code QA failed — proceeding anyway');
    return { passed: true, issues: [], fixes: ['Game QA call failed — skipped'] };
  }
}

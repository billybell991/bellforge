import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

export function isGeminiAvailable(): boolean {
  return model !== null;
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
 * Accepts optional genre/theme context for more relevant results.
 */
export async function generateStory(genreHint?: string, themeHint?: string): Promise<GeneratedStory> {
  if (model) {
    try {
      const prompt = `You are a creative game designer. Generate a unique, compelling story concept for a ${genreHint || 'point-and-click adventure'} game with a ${themeHint || 'mystery'} theme.

Return EXACTLY this JSON format (no markdown, no code fences, just raw JSON):
{"title":"2-5 word evocative title","characterName":"single memorable protagonist name","setting":"one vivid sentence describing the location","description":"2-3 sentences about what the player does, the mystery, and the stakes"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      // Strip markdown fences if present
      const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(clean);
      if (parsed.title && parsed.characterName && parsed.setting && parsed.description) {
        return parsed as GeneratedStory;
      }
    } catch {
      // Fall through to curated bank
    }
  }
  return randomPick(STORY_BANK);
}

/**
 * Generate a complete auto-config using Gemini if available, otherwise random from curated.
 */
export async function generateAutoConfig(): Promise<AutoConfig> {
  const genreId = randomPick(GENRE_IDS);
  const themeId = randomPick(THEME_IDS);
  const artStyleId = randomPick(ART_STYLE_IDS);
  const roomCount = 4 + Math.floor(Math.random() * 9); // 4-12
  const difficulty = randomPick([...DIFFICULTIES]);
  const puzzleDensity = randomPick([...DENSITIES]);
  const story = await generateStory(genreId.replace('_', ' '), themeId);

  return {
    genreId,
    themeId,
    artStyleId,
    structure: { roomCount, difficulty, puzzleDensity },
    story,
  };
}

// â”€â”€ Escape Room Pipeline â”€â”€
// Generates a fully interactive escape room via Gemini AI

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { EscapeConfig } from './pipeline/types.js';
import { generateEscapePreviewHtml } from './escape-engine.js';
import { generateImage } from './imagen.js';

const apiKey = process.env.GEMINI_API_KEY;
let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// â”€â”€ Types (Boxed Escape Room model) â”€â”€

/** A physical item found in the escape room box */
export interface BoxElement {
  id: string;
  name: string;
  type: 'story_card' | 'cipher_wheel' | 'decoder_key' | 'map_fragment' | 'uv_card' | 'torn_note' | 'photo' | 'sealed_envelope' | 'combination_dial' | 'transparency' | 'custom';
  icon: string;           // emoji icon for toolbar
  description: string;    // flavour text when examining
  content?: string;       // HTML content shown when clicked (card text, note text)
  imagePrompt?: string;   // prompt for Imagen to generate the item's visual
  image?: string;         // base64 data URI after generation
  stage?: number;         // which stage unlocks this item (0 = available from start)
  usedWith?: string;      // ID of another element this combines with
  revealsText?: string;   // text revealed when this item is used correctly
}

/** A puzzle within a stage */
export interface EscapePuzzle {
  id: string;
  name: string;
  type: 'code' | 'riddle' | 'sequence' | 'combination' | 'cipher' | 'overlay' | 'jigsaw_word' | 'decay_restore' | 'layer_align' | 'morse_decode';
  description: string;    // what the player reads as instructions
  hint: string;           // hint text for when player is stuck
  clueText?: string;      // where the clue can be found
  narrativeSignificance?: string; // WHY this answer matters to the story
  // Which box elements are needed to solve this
  requiredElements?: string[];
  // Code puzzle (enter digits)
  solution?: string;
  codeLength?: number;
  // Riddle puzzle (multiple choice)
  riddle?: string;
  options?: string[];
  correctOption?: number;
  wrongFeedback?: string;
  // Sequence puzzle (order items)
  sequence?: string[];
  // Combination puzzle (set dials)
  dials?: { label: string; options: string[] }[];
  // Cipher puzzle (decode text using cipher wheel/decoder key)
  encodedText?: string;
  cipherType?: 'caesar' | 'substitution' | 'symbol';
  decodedAnswer?: string;
  // Overlay puzzle (stack transparencies to reveal)
  overlayLayers?: string[];   // IDs of box elements to stack
  revealText?: string;
  // Jigsaw word puzzle (arrange torn fragments)
  fragments?: string[];
  correctWord?: string;
  // Decay Restoration: adjust CSS-filter sliders to reveal the corrupted document
  decayText?: string;         // the message hidden beneath the corruption
  decaySliders?: { label: string; min: number; max: number; correct: number; tolerance: number }[];
  // Layer Alignment: drag three translucent sigil layers to align them
  glyphLayers?: { symbol: string; color: string; startX: number; startY: number; correctX: number; correctY: number }[];
  alignTolerance?: number;
  revealWord?: string;        // word revealed when layers align
  // Morse Decode: listen to a Web Audio tone pattern, identify the character
  morsePattern?: string;      // e.g. "... --- ..." (spaces separate letters, / separates words)
  morseAnswer?: string;       // decoded string to type in
}

/** A stage (sealed envelope) in the escape room */
export interface EscapeStage {
  id: string;
  stageNumber: number;
  name: string;           // e.g. "Envelope A: The First Clue"
  sealColor: string;      // wax seal CSS color
  sealIcon: string;       // emoji on the seal
  introText: string;      // text on the card inside the envelope
  hint: string;           // stage-level hint
  /** @deprecated use puzzleIds instead */
  puzzleId?: string;
  puzzleIds: string[];    // 2-3 puzzle IDs — solved sequentially to complete this stage
  midwayTexts?: string[]; // optional narrative reveals between puzzles (length = puzzleIds.length - 1)
  unlocksElements: string[];  // box element IDs revealed when stage is opened
  completionText: string; // text shown when stage is solved
}

export interface EscapeRoomData {
  title: string;
  subtitle: string;
  intro: string;          // story setup text (printed on the story sheet)
  difficulty: string;
  targetDuration: number;
  boxArt: string;         // description for box cover art generation
  tabletopStyle: string;  // description for tabletop background generation
  boxElements: BoxElement[];
  puzzles: EscapePuzzle[];
  stages: EscapeStage[];
  // Generated images
  tabletopImage?: string;
  boxCoverImage?: string;
}

export interface EscapeRoomResult {
  title: string;
  envelopes: { id: number; title: string; puzzles: string[] }[];
  htmlContent: string;
  data: EscapeRoomData;
}

type ProgressCallback = (percent: number, message: string, stage?: string) => void;

// â”€â”€ Helpers â”€â”€

async function askGemini(prompt: string, temperature = 0.8, jsonMode = false, timeoutMs = 90000): Promise<string | null> {
  if (!model) return null;

  const config: Record<string, unknown> = { temperature };
  if (jsonMode) {
    (config as Record<string, unknown>).responseMimeType = 'application/json';
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const generatePromise = model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: config as Parameters<typeof model.generateContent>[0] extends { generationConfig?: infer G } ? G : never,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('gemini_timeout')), timeoutMs)
      );
      const result = await Promise.race([generatePromise, timeoutPromise]);
      return result.response.text();
    } catch (e: unknown) {
      const errStr = String(e).toLowerCase();
      if (errStr.includes('gemini_timeout')) {
        console.warn(`askGemini timeout on attempt ${attempt + 1}`);
        if (attempt < 2) await sleep(3000);
      } else if (errStr.includes('resource_exhausted') || errStr.includes('quota')) {
        await sleep(30000);
      } else {
        await sleep((2 ** attempt) * 4000);
      }
    }
  }
  return null;
}

function parseJsonResponse(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPicks<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5-LAYER CREATIVITY ALGORITHM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Layer 1: Story DNA â€” premise sparks per escapeThemeÃ—atmosphere combo
const ESCAPE_STORY_DNA: Record<string, string[]> = {
  'heist+horror': [
    'The vault you\'re robbing is inside a condemned asylum â€” and the security system is the building itself, which remembers every visitor who never left',
    'You\'re stealing a painting that screams when removed from its frame â€” the previous thieves are still in the gallery, frozen mid-step',
    'The safe deposit box contains something that\'s been paying its own rental fees for 200 years',
  ],
  'heist+scifi': [
    'You\'re stealing data from a quantum computer that exists in multiple timelines â€” the heist plan has to work in ALL of them simultaneously',
    'Breaking into a vault on a space station where gravity is a security feature â€” each room has different g-forces',
    'The AI guarding the vault has developed empathy and is leaving breadcrumb clues because it WANTS to be stolen from',
  ],
  'heist+mystery': [
    'You\'re robbing a detective\'s office to destroy evidence â€” but the detective left the case file open on purpose, and the clues point at YOU',
    'A museum heist where every artifact is a fake â€” the real treasures are hidden in the security system itself',
  ],
  'detective+horror': [
    'The cold case files keep updating themselves â€” new evidence appearing for a murder that happened in 1923',
    'You\'re investigating a room where something terrible happened â€” and the room is slowly recreating the event around you',
    'The suspect confessed 40 years ago. The problem: the crime was committed yesterday. Same fingerprints.',
  ],
  'detective+mystery': [
    'Every piece of evidence points to a different person â€” and they all have perfect alibis because they were all committing DIFFERENT crimes',
    'The victim left a locked room with 13 clues, each pointing to a different killer â€” but only ONE is real, and the victim knew who\'d investigate',
    'A forensic lab where the evidence for twelve cases has been deliberately shuffled â€” solve the meta-puzzle to untangle them',
  ],
  'detective+cozy': [
    'The town\'s beloved baker has disappeared, leaving behind 7 cakes â€” each one contains a clue baked into the recipe',
    'A cat cafÃ© where the cats are trained to hide and reveal objects â€” the owner left a treasure hunt before retiring',
  ],
  'haunted+horror': [
    'The house isn\'t haunted â€” it\'s ALIVE, and the "ghosts" are its immune system trying to expel you like a virus',
    'A sÃ©ance room where the spirit you\'re contacting isn\'t dead â€” they\'re trapped in the walls, fully conscious, for 100 years',
    'The haunted mansion\'s previous escape room guests are still here, solving puzzles forever, not realizing they never left',
  ],
  'haunted+mystery': [
    'A ghost is trying to tell you who murdered them â€” but they can only communicate by rearranging objects and flickering lights',
    'The mansion has two timelines overlapping â€” present-day clues unlock 1890s secrets, and vice versa',
  ],
  'haunted+fantasy': [
    'The enchanted castle rearranges itself every hour â€” rooms you\'ve solved might be somewhere new when you return',
    'You\'re trapped in a witch\'s dollhouse â€” everything is a miniature, including you, and the witch is coming home at midnight',
  ],
  'laboratory+scifi': [
    'The experiment escaped, but it\'s not a monster â€” it\'s a THEOREM, and reality is changing to accommodate its proof',
    'Containment breach, but what escaped isn\'t dangerous â€” it\'s the CURE, and the corporation is locking down to prevent it from getting out',
    'The lab\'s AI has split itself into puzzle-fragments hidden in each room â€” reassemble it before the auto-destruct, but each fragment has its own personality',
  ],
  'laboratory+horror': [
    'You\'re in a pharmaceutical lab where the test subjects wrote the puzzles â€” each one designed to test whether YOU deserve to escape',
    'The lab bred something that feeds on solved puzzles â€” every lock you crack makes it stronger and the next puzzle harder',
  ],
  'shipwreck+adventure': [
    'The submarine isn\'t sinking â€” it\'s being PULLED down by something that communicates through pressure changes in the hull',
    'You find a message in a bottle inside a submarine â€” written by YOU, dated tomorrow, with instructions for surviving tonight',
  ],
  'shipwreck+horror': [
    'The lifeboats were deployed empty 3 hours ago â€” the ship\'s manifest shows 47 passengers, but you can only count 46 shadows',
    'The wreck is underwater but the rooms aren\'t flooded â€” something is keeping an air pocket alive, and it wants company',
  ],
  'time_capsule+mystery': [
    'A time capsule from 2075 â€” everything inside is mundane except a newspaper clipping about YOUR disappearance, dated today',
    'Objects from different decades that shouldn\'t exist together â€” a medieval key that opens a 1960s padlock that powers a quantum device',
  ],
  'time_capsule+cozy': [
    'A beloved grandparent left a series of puzzles spanning their entire life â€” each decade\'s puzzle reveals a family secret and a piece of their legacy',
    'A hidden room in a vintage shop where items from different eras tell the love story of the shop\'s founders through clues they left for each other',
  ],
};

// Layer 2: Narrative Hooks
const ESCAPE_NARRATIVE_HOOKS = [
  'The player doesn\'t know WHY they need to escape. The first puzzle reveals the stakes â€” and they\'re worse than expected.',
  'Someone is "helping" via notes left throughout the rooms â€” but their handwriting gets more desperate as you progress.',
  'The escape room used to be something else (a home, a clinic, an office). The puzzles use the ORIGINAL purpose of each room.',
  'Time is already running out when the player starts â€” a pre-existing countdown that wasn\'t set for them.',
  'The rooms tell the story of someone who DIDN\'T escape, in reverse â€” the first room is their last moment.',
  'A voice on an old intercom system gives cryptic hints, but sometimes contradicts itself â€” is it helping or trapping you?',
  'You find another escape room player\'s journal â€” they solved 3 of 4 stages before... the entries stop.',
  'The rooms are a test designed by someone who knew you â€” the puzzles reference your (the character\'s) memories.',
  'Each room gets more surreal as you progress â€” the first is mundane, the last defies physics. Is this real?',
  'You broke IN on purpose â€” you\'re looking for something hidden here, and the locks work both ways.',
];

// Layer 3: Scene Dynamics
const ESCAPE_SCENE_DYNAMICS = [
  'a room where the environment itself is a clue â€” the wallpaper pattern, the arrangement of furniture, the angle of shadows all encode information',
  'a puzzle where the "wrong" answer to an earlier puzzle becomes the KEY to a later one â€” failure is secretly progress',
  'a moment where two items combine in an unexpected way â€” the puzzle answer requires using things together',
  'a room that changes when you\'re not looking â€” return to find something different each time',
  'a clue hidden in plain sight that the player has been staring at since the first room â€” recontextualized by new information',
  'a locked door with no visible lock â€” the "key" is an action, not an object (standing in the right place, saying the right thing)',
  'a puzzle where the clue is auditory â€” a ticking rhythm, a musical sequence, a spoken phrase you need to decode',
  'an item that seems useless when you find it but becomes critical 2 rooms later â€” rewarding players who explore thoroughly',
  'two puzzles that seem independent but share a hidden connection â€” solving one gives the aha moment for the other',
  'a final puzzle that uses pieces from EVERY previous room â€” a metacognitive challenge that rewards the observant player',
  'a red herring so well-crafted it teaches the player something useful before they realize it\'s not the solution',
  'a secret area that isn\'t required but contains backstory that makes the whole escape room richer',
];

// Layer 4: Anti-Formula Directives
const ESCAPE_ANTI_FORMULA = [
  'Skip your first two puzzle ideas. The code-on-a-sticky-note and key-under-the-mat puzzles are boring. Think harder.',
  'Every puzzle must feel INEVITABLE in its setting â€” "of COURSE there\'s a cipher in the old radio. Of COURSE the painting hides a safe."',
  'NO arbitrary number puzzles (why would there be a 4-digit code on a medieval door?). The mechanism must match the world.',
  'Puzzles should make players feel CLEVER when they solve them, not lucky. The "aha" should be visible in hindsight.',
  'The atmosphere should be thick enough to cut â€” every examine text should make the player feel like they\'re INSIDE the room.',
  'Don\'t frontload all the hard puzzles. The difficulty curve should build â€” early wins create momentum and teach the logic.',
  'Items should have CHARACTER â€” not just "a key" but "a brass key with teeth filed into an unusual pattern." Description is gameplay.',
  'At least one puzzle should be solvable by OBSERVATION alone â€” no items, no codes, just paying attention to what\'s already there.',
  'The final puzzle should make the player use EVERYTHING they\'ve learned â€” it\'s a thesis statement for the whole escape room.',
  'Red herrings are OK but they must be FUN to investigate. A wrong path should still be entertaining, not punishing.',
  'Don\'t make the player hunt for hotspots â€” if something is interactive, it should be visually distinct and narratively interesting.',
  'Every room should have at least one moment of discovery â€” something that makes the player go "oh!" when they find it.',
];

// Layer 5: Theme-specific Quality Guides
const ESCAPE_QUALITY_GUIDES: Record<string, string> = {
  heist: `HEIST ESCAPE RULES: The security should feel REAL and systematic â€” cameras, laser grids, timed patrols, vault mechanisms. Each puzzle is bypassing a security layer. The player should feel like a criminal genius. Complications should cascade (disabling one alarm triggers another). Include a "vault door" finale that uses multiple solved puzzle outputs as its combination.`,
  detective: `DETECTIVE ESCAPE RULES: Evidence should build a coherent case. Every clue connects to a central mystery. Include red herrings that are interesting to investigate even when wrong. The "aha" moment should recontextualize everything the player has seen. Use classic detective tools: magnifying glass, blacklight, fingerprints, witness statements, timelines.`,
  haunted: `HAUNTED ESCAPE RULES: The atmosphere is EVERYTHING. Jump scares are cheap â€” build sustained dread through environmental storytelling. Objects should feel wrong (photos with people scratched out, clocks running backwards). The house/space should feel like it has memory â€” echoes of what happened here. Puzzles should use supernatural mechanics (candles that respond to "breath", mirrors that show different reflections).`,
  laboratory: `LABORATORY ESCAPE RULES: Science should feel REAL even when fictional. Chemical combinations, biological sequences, physics experiments â€” puzzles grounded in logic. The lab should tell the story of what was researched here through equipment, notes, and containment protocols. Include at least one "experiment" the player conducts to get a puzzle answer.`,
  shipwreck: `SHIPWRECK ESCAPE RULES: Claustrophobia and urgency. Water/pressure is the enemy. Navigation instruments (compass, maps, sonar) should be puzzle tools. The ship/sub should feel like a character â€” creaking, groaning, systems failing. Puzzles involve emergency protocols, sealed compartments, and mechanical systems. The player should feel the water rising (metaphorically) with each stage.`,
  time_capsule: `TIME CAPSULE ESCAPE RULES: Nostalgia meets mystery. Objects from different eras should feel authentic â€” 1950s radio, 1980s computer, Victorian lockbox. The puzzle logic should use era-appropriate technology. Hidden connections across decades reveal a larger story. Include personal touches (letters, photographs, recordings) that make the time periods HUMAN, not just aesthetic.`,
};

function getEscapeStoryDNA(themeId: string, atmosphereId: string): string {
  const specific = ESCAPE_STORY_DNA[`${themeId}+${atmosphereId}`];
  if (specific?.length) return randomPick(specific);
  const themeKeys = Object.keys(ESCAPE_STORY_DNA).filter(k => k.startsWith(themeId + '+'));
  if (themeKeys.length) {
    const pool = themeKeys.flatMap(k => ESCAPE_STORY_DNA[k]);
    return randomPick(pool);
  }
  return '';
}

// â”€â”€ Theme-specific context for Gemini â”€â”€

const THEME_ATMO: Record<string, string> = {
  heist: 'a high-security vault or museum at night â€” laser grids, security cameras, safes with combination locks, guard patrol schedules, ventilation ducts',
  detective: 'a dusty cold case investigation â€” evidence boards, locked filing cabinets, old photographs, hidden compartments in desks, redacted documents',
  haunted: 'a decaying haunted mansion â€” creaking floorboards, locked secret passages, mysterious portraits, ghostly writing on mirrors, music boxes that play backwards',
  laboratory: 'a research facility in lockdown â€” biometric scanners, chemical formulas on whiteboards, specimen jars, encrypted terminals, containment chambers',
  shipwreck: 'a flooding submarine or shipwreck â€” bulkhead doors, pressure gauges, flooded compartments, emergency controls, sonar readings',
  time_capsule: 'a trail of puzzles spanning decades â€” vintage objects from different eras, time-locked capsules, nostalgic photographs, handwritten letters, retro technology',
};

// ── Theme × Atmosphere coherence matrix ──
const THEME_COHERENCE: Record<string, string[]> = {
  heist:       ['mystery', 'scifi', 'cyberpunk', 'noir', 'steampunk'],
  detective:   ['mystery', 'horror', 'cozy', 'noir', 'fantasy'],
  haunted:     ['horror', 'mystery', 'fantasy', 'postapoc'],
  laboratory:  ['scifi', 'horror', 'cyberpunk', 'postapoc', 'mystery'],
  shipwreck:   ['horror', 'mystery', 'scifi', 'postapoc', 'fantasy'],
  time_capsule:['mystery', 'cozy', 'steampunk', 'fantasy', 'scifi'],
};

function getCoherenceNote(themeId: string, atmosphereId: string): string {
  const compatible = THEME_COHERENCE[themeId] ?? [];
  if (compatible.includes(atmosphereId)) return '';
  return `ATMOSPHERE COHERENCE DIRECTIVE: The "${atmosphereId}" atmosphere is unconventional for a ${themeId} escape room. You MUST treat this as intentional artistic dissonance — find a unifying visual and narrative language that makes it feel deliberate rather than accidental. The escape theme is dominant; treat the atmosphere as a surprising twist on it. Never produce a jarring, incoherent mix. All visual descriptions, room aesthetics, and narrative tone MUST feel unified.`;
}

const ROOM_GRADIENTS: string[] = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b2e 0%, #1a1a2e 50%, #0d1117 100%)',
  'linear-gradient(135deg, #1a2e1a 0%, #0d170d 50%, #1a2e2e 100%)',
  'linear-gradient(135deg, #2e1a1a 0%, #1a0d0d 50%, #2e2e1a 100%)',
  'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
  'linear-gradient(135deg, #1a1a0d 0%, #2e2e1a 50%, #1a1a2e 100%)',
  'linear-gradient(135deg, #0f3460 0%, #1a1a2e 50%, #16213e 100%)',
  'linear-gradient(135deg, #2e1a2e 0%, #1a0d1a 50%, #0d1117 100%)',
];

const PUZZLE_ICONS: Record<string, string> = {
  key: 'ðŸ”‘', lock: 'ðŸ”’', book: 'ðŸ“•', note: 'ðŸ“', map: 'ðŸ—ºï¸',
  flashlight: 'ðŸ”¦', screwdriver: 'ðŸ”§', card: 'ðŸ’³', badge: 'ðŸªª',
  gem: 'ðŸ’Ž', coin: 'ðŸª™', bottle: 'ðŸ§ª', pill: 'ðŸ’Š', usb: 'ðŸ’¾',
  photo: 'ðŸ“·', phone: 'ðŸ“±', wire: 'ðŸ”Œ', battery: 'ðŸ”‹', tape: 'ðŸ“¼',
  compass: 'ðŸ§­', magnifier: 'ðŸ”', candle: 'ðŸ•¯ï¸', bell: 'ðŸ””', skull: 'ðŸ’€',
  eye: 'ðŸ‘ï¸', hand: 'âœ‹', gear: 'âš™ï¸', crystal: 'ðŸ”®', feather: 'ðŸª¶',
  scissors: 'âœ‚ï¸', rope: 'ðŸª¢', mirror: 'ðŸªž', clock: 'â°', hammer: 'ðŸ”¨',
};

// â”€â”€ Pipeline â”€â”€

const SEAL_COLORS = ['#8B0000', '#2d1b4e', '#1a3a1a', '#4a3d1c', '#1a2a4a', '#4a1a1a'];

export async function runEscapePipeline(
  config: EscapeConfig,
  onProgress: ProgressCallback
): Promise<EscapeRoomResult | null> {
  const themeId = config.escapeTheme.id;
  const themeName = config.escapeTheme.name;
  const stageCount = config.structure.envelopeCount || 4;

  // Phase 1: Gemini concept generation with heartbeat
  onProgress(3, 'Mixing creative DNA...', 'story_dna');
  await sleep(300);
  onProgress(5, 'Choosing box contents...', 'escape_concept');
  await sleep(300);
  onProgress(7, 'Composing the master prompt...', 'escape_concept');
  await sleep(200);

  const conceptMessages = [
    'Gemini is designing box contents...', 'Crafting cipher wheels...',
    'Writing story cards...', 'Sealing envelopes...',
    'Hiding clues in the elements...', 'Designing puzzle narrative arcs...',
    'Balancing difficulty curve...', 'Threading puzzle connections...',
    'Weaving the story together...', 'Calibrating puzzle answers...',
    'Composing midway reveals...', 'Polishing seal descriptions...',
    'Finalising box contents...', 'Almost there...',
  ];
  let hbIdx = 0, hbPct = 8;
  const heartbeat = setInterval(() => {
    // Keep cycling messages; nudge percent slowly up to 25 max
    if (hbPct < 25) hbPct = Math.min(25, hbPct + 1);
    onProgress(hbPct, conceptMessages[hbIdx++ % conceptMessages.length], 'escape_concept');
  }, 5000);

  onProgress(8, 'Gemini is designing the escape room box...', 'escape_concept');
  let conceptData: EscapeRoomData | null;
  try { conceptData = await generateEscapeConcept(config); }
  finally { clearInterval(heartbeat); }

  if (!conceptData) {
    console.error('Gemini concept generation failed â€” using built-in template');
    onProgress(100, 'Escape Room Complete!', 'complete');
    return generateFallbackEscapeRoom(config);
  }

  onProgress(18, `"${conceptData.title}" â€” ${conceptData.stages.length} stages, ${conceptData.boxElements.length} box elements`, 'escape_outline');

  // Phase 2: Validate
  onProgress(22, 'Validating puzzle flow...', 'validation');
  validateBoxedEscape(conceptData);

  // Phase 2.5: Structural QA (instant, auto-fix) + Gemini review (background, non-blocking)
  onProgress(24, 'Running structural QA...', 'flow_qa');
  const structIssues = [
    ...checkAndFixElementGating(conceptData),
    ...fixCaesarCiphers(conceptData),
    ...checkDeadElements(conceptData),
  ];
  const structFixed    = structIssues.filter(i => i.fix).length;
  const structCritical = structIssues.filter(i => i.severity === 'critical').length;
  if (structIssues.length > 0) {
    console.log('\n[Flow QA - Structural]');
    for (const issue of structIssues) {
      const lbl = issue.severity === 'critical' ? 'ERR' : issue.severity === 'warning' ? 'WRN' : 'INF';
      console.log(`  [${lbl}] [${issue.category}] ${issue.description}`);
      if (issue.fix) console.log("       -> Fixed: " + issue.fix);
    }
  } else {
    console.log('[Flow QA] Structural: no issues found');
  }
  onProgress(26, structCritical > 0
    ? `Structural QA: auto-fixed ${structFixed} issue(s) - continuing...`
    : `Structural QA passed${structFixed > 0 ? ` (${structFixed} auto-fix)` : ''} - Gemini review running in background`,
    'flow_qa');

  // Gemini narrative review fires in background - does NOT block art generation
  void runFlowQA(conceptData).then(flowQA => {
    const qaCriticals = flowQA.issues.filter(i => i.severity === 'critical');
    const qaWarnings  = flowQA.issues.filter(i => i.severity === 'warning');
    console.log('\n[Flow QA - Gemini Narrative Review]');
    if (flowQA.geminiScore !== undefined) console.log(`  Score: ${flowQA.geminiScore}/10`);
    if (flowQA.geminiSummary)             console.log(`  Assessment: ${flowQA.geminiSummary}`);
    console.log(`  Criticals: ${qaCriticals.length}  Warnings: ${qaWarnings.length}`);
    for (const issue of flowQA.issues) {
      const lbl = issue.severity === 'critical' ? 'ERR' : issue.severity === 'warning' ? 'WRN' : 'INF';
      console.log(`  [${lbl}] [${issue.category}] ${issue.description}`);
      if (issue.fix) console.log("       -> Fixed: " + issue.fix);
    }
    if (flowQA.issues.length === 0) console.log('  No issues found - game flow looks great!');
  }).catch(() => { /* non-fatal */ });
  // Phase 3: Art generation
  const artStyle = config.artStyle?.name || 'dark atmospheric';

  onProgress(28, 'Painting the tabletop...', 'art_rooms');
  const tabletopPrompt = `${artStyle} overhead photograph of ${conceptData.tabletopStyle || 'a dark wooden table with moody atmospheric lighting'}. Bird's eye view looking straight down at the table surface. Rich wood grain texture, warm shadows, slightly worn and aged. Empty table ready for a board game. Photorealistic. No text.`;
  const tabletopImg = await generateImage(tabletopPrompt, '16:9');
  if (tabletopImg) conceptData.tabletopImage = `data:image/png;base64,${tabletopImg}`;
  await sleep(300);

  onProgress(34, 'Designing the box art...', 'art_rooms');
  const boxArtPrompt = `${artStyle} board game box cover art for an escape room game called "${conceptData.title}". ${conceptData.boxArt || 'Mysterious and atmospheric design'}. Dramatic composition, premium board game quality, moody lighting. Portrait orientation. No text.`;
  const boxImg = await generateImage(boxArtPrompt, '3:4');
  if (boxImg) conceptData.boxCoverImage = `data:image/png;base64,${boxImg}`;
  await sleep(300);

  const elementsWithArt = conceptData.boxElements.filter(e => e.imagePrompt);
  for (let i = 0; i < elementsWithArt.length; i++) {
    const elem = elementsWithArt[i];
    const pct = 38 + Math.floor(((i + 1) / elementsWithArt.length) * 30);
    onProgress(pct, `Illustrating: ${elem.name}...`, 'art_rooms');
    const elemPrompt = `${artStyle} illustration for a tabletop escape room game prop: ${elem.imagePrompt}. Flat lay photograph style, on a dark surface. Premium quality. No text unless part of the prop.`;
    const elemImg = await generateImage(elemPrompt, '1:1');
    if (elemImg) elem.image = `data:image/png;base64,${elemImg}`;
    await sleep(400);
  }

  // Phase 4: Polish & Build
  onProgress(72, 'Polishing hint chains...', 'puzzles_final');
  await sleep(200);
  onProgress(78, 'Assembling escape structure...', 'assembly');
  await sleep(200);

  onProgress(90, 'Building interactive viewer...', 'viewer');
  const htmlContent = generateEscapePreviewHtml(conceptData);
  await sleep(200);

  const envelopes = conceptData.stages.map((s, i) => ({
    id: i + 1, title: s.name,
    puzzles: (s.puzzleIds || []).map(pid => conceptData.puzzles.find(p => p.id === pid)?.name ?? pid),
  }));

  onProgress(100, 'Escape Room Complete!', 'complete');
  return { title: conceptData.title, envelopes, htmlContent, data: conceptData };
}

// â”€â”€ Gemini concept generation (Boxed Escape Room) â”€â”€
async function generateEscapeConcept(config: EscapeConfig): Promise<EscapeRoomData | null> {
  const themeId = config.escapeTheme.id;
  const themeName = config.escapeTheme.name;
  const stageCount = config.structure.envelopeCount || 4;
  const difficulty = config.structure.difficulty || 'standard';
  const duration = config.structure.duration || 45;
  const storyTitle = config.story.title || 'Untitled';
  const storyDesc = config.story.description || '';
  const setting = config.story.setting || '';
  const character = config.story.characterName || '';
  const atmosphereId = config.theme?.id || 'mystery';
  const atmosphere = config.theme?.name || 'mysterious';
  const themeAtmo = THEME_ATMO[themeId] || 'a mysterious experience with hidden clues and puzzles';
  const codeLength = difficulty === 'casual' ? 3 : difficulty === 'expert' ? 5 : 4;
  const puzzlesPerStage = difficulty === 'casual' ? 1 : difficulty === 'expert' ? 3 : 2;
  const coherenceNote = getCoherenceNote(themeId, atmosphereId);
  const totalPuzzles = stageCount * puzzlesPerStage;

  const narrativeHook = randomPick(ESCAPE_NARRATIVE_HOOKS);
  const sceneDynamic1 = randomPick(ESCAPE_SCENE_DYNAMICS);
  const sceneDynamic2 = randomPick(ESCAPE_SCENE_DYNAMICS.filter(s => s !== sceneDynamic1));
  const antiFormulas = randomPicks(ESCAPE_ANTI_FORMULA, 2);
  const qualityGuide = ESCAPE_QUALITY_GUIDES[themeId] || '';
  const storyDNA = getEscapeStoryDNA(themeId, atmosphereId);

  const prompt = `You are a master designer of BOXED escape room games - think Exit: The Game, Unlock!, Deckscape. Premium tabletop escape experiences with physical components: story cards, cipher wheels, decoder keys, maps, transparencies, torn notes, sealed envelopes. Creativity seed: ${Date.now()}.

PHYSICAL BOX DESIGN - the player opens a box on a tabletop, pulls out components, and works through sealed envelopes using tactile props.

THEME: "${themeName}" - ${themeAtmo}
TITLE: "${storyTitle}"
DESCRIPTION: ${storyDesc || 'Be creative'}
SETTING: ${setting || 'Match the theme'}
CHARACTER: ${character || 'The player'}
ATMOSPHERE: ${atmosphere}
STAGES: ${stageCount} sealed envelopes (${puzzlesPerStage} puzzles each = ${totalPuzzles} total puzzles)
DIFFICULTY: ${difficulty}
TARGET DURATION: ${duration} minutes
${coherenceNote ? `\nATMOSPHERE COHERENCE DIRECTIVE:\n${coherenceNote}\n` : ''}

=== CREATIVE SPARKS ===
"${narrativeHook}"
"${sceneDynamic1}" and "${sceneDynamic2}"
${storyDNA ? `Story DNA: "${storyDNA}"\n` : ''}
=== QUALITY BAR ===
${antiFormulas.join('\n')}
${qualityGuide}

=== NARRATIVE-DRIVEN ANSWERS (CRITICAL) ===
Every puzzle answer must be a narrative keystone — a character name, location, date, phrase, or revelation that the player has been discovering clues about. Never use placeholder answers like "1234" or "HELLO".
- Choose the story reveal FIRST, make that the answer, then design the puzzle around it.
- Set each puzzle's "narrativeSignificance" to 1 sentence explaining why this answer matters.

=== MULTI-PUZZLE STAGE FLOW ===
Each stage has ${puzzlesPerStage} puzzles in puzzleIds[]. Solved SEQUENTIALLY:
- Player opens envelope, reads introText, solves puzzle[0]
- Solving puzzle[0] reveals midwayTexts[0] (1-2 sentence narrative snippet) then unlocks puzzle[1]
- Solving final puzzle triggers completionText and completes the stage
This creates cascading discovery moments within each stage.

BOX ELEMENT TYPES: story_card, cipher_wheel, decoder_key, map_fragment, uv_card, torn_note, photo, sealed_envelope, combination_dial, transparency, custom

IMPORTANT — cipher_wheel rendering: The cipher wheel is ALWAYS rendered as two rings of A–Z letters (a standard Caesar cipher wheel). Do NOT describe dates, symbols, numbers, runes, or any other markings on it — they will not appear. Write content/description that accurately reflects what the player sees: an outer ring of A–Z (fixed) and an inner ring of A–Z (rotatable) with a SHIFT counter in the centre.

PUZZLE TYPES (use a diverse mix — at least 4 different types across all stages):
- code: ${codeLength}-digit numeric code (fields: solution, codeLength)
- riddle: 4-option multiple choice (fields: riddle, options[], correctOption, wrongFeedback)
- sequence: order items correctly (fields: sequence[])
- combination: set dials to values (fields: dials[], solution as pipe-delimited e.g. "A|X")
- cipher: decode encoded text (fields: encodedText, decodedAnswer, cipherType: caesar/substitution)
- overlay: stack transparencies (fields: overlayLayers[] element IDs, revealText)
- jigsaw_word: arrange fragments (fields: fragments[], correctWord)
- decay_restore: sliders restore corrupted doc (fields: decayText, decaySliders[{label,min,max,correct,tolerance}])
- layer_align: drag glyphs to centre (fields: glyphLayers[{symbol,color,startX,startY,correctX,correctY}], alignTolerance, revealWord)
- morse_decode: decode morse audio (fields: morsePattern e.g. "... --- ...", morseAnswer)

RULES:
- Stage 0 elements are in the box from the start
- Each stage has a sealed_envelope that unlocks new elements when opened
- Puzzles MUST reference requiredElements by ID
- Design ${6 + stageCount} to ${8 + stageCount * 2} box elements total
- Every puzzle's clue comes from available box elements
- Content field uses simple HTML (<p>, <em>, <strong>, <br>)
- puzzleIds must contain exactly ${puzzlesPerStage} valid puzzle IDs per stage
- midwayTexts must have exactly ${puzzlesPerStage - 1} entries per stage (narrative reveals between puzzles)

JSON STRUCTURE (return EXACTLY this shape):
{
  "title": "string",
  "subtitle": "short evocative tagline",
  "intro": "2-4 sentence story setup for the story sheet",
  "difficulty": "${difficulty}",
  "targetDuration": ${duration},
  "boxArt": "1-2 sentence box cover art description",
  "tabletopStyle": "1 sentence tabletop surface description",
  "boxElements": [
    {
      "id": "elem_id", "name": "Name", "type": "story_card",
      "icon": "emoji", "description": "Physical description",
      "content": "<p>HTML text on the card</p>",
      "imagePrompt": "optional Imagen art prompt",
      "stage": 0, "usedWith": "optional element ID", "revealsText": "optional"
    }
  ],
  "puzzles": [
    {
      "id": "puz_1a", "name": "Puzzle Name", "type": "code",
      "description": "Player instructions", "hint": "Hint text",
      "clueText": "Where clue is found",
      "narrativeSignificance": "Why this answer matters to the story (required)",
      "requiredElements": ["elem_id"],
      "solution": "1492", "codeLength": ${codeLength}
    }
  ],
  "stages": [
    {
      "id": "stage_1", "stageNumber": 1,
      "name": "Envelope A: Evocative Name",
      "sealColor": "#8B0000", "sealIcon": "emoji",
      "introText": "Narrative card text inside the envelope",
      "hint": "Stage hint",
      "puzzleIds": ["puz_1a", "puz_1b"],
      "midwayTexts": ["1-2 sentence narrative reveal between puzzle 1 and 2"],
      "unlocksElements": ["elem_id"],
      "completionText": "Dramatic completion text"
    }
  ]
}

Only include fields relevant to each puzzle type. narrativeSignificance is required for every puzzle. Return ONLY valid JSON.`;

  const response = await askGemini(prompt, 0.85, true);
  const parsed = parseJsonResponse(response);
  if (!parsed) return null;
  return validateAndFixBoxedEscape(parsed as unknown as EscapeRoomData, config);
}

// ── Validation ──

function validateAndFixBoxedEscape(data: EscapeRoomData, config: EscapeConfig): EscapeRoomData | null {
  if (!data.boxElements || !Array.isArray(data.boxElements) || data.boxElements.length === 0) return null;
  if (!data.puzzles || !Array.isArray(data.puzzles) || data.puzzles.length === 0) return null;
  if (!data.stages || !Array.isArray(data.stages) || data.stages.length === 0) return null;

  data.title = data.title || config.story.title || 'Untitled Escape Room';
  data.subtitle = data.subtitle || '';
  data.intro = data.intro || 'Your mission begins now.';
  data.difficulty = config.structure.difficulty || 'standard';
  data.targetDuration = config.structure.duration || 45;
  data.boxArt = data.boxArt || 'Mysterious dark imagery';
  data.tabletopStyle = data.tabletopStyle || 'dark wooden table with warm lamplight';

  data.boxElements.forEach(elem => {
    elem.icon = elem.icon || '📄';
    elem.stage = elem.stage ?? 0;
    elem.description = elem.description || elem.name;
    elem.content = elem.content || `<p>${elem.description}</p>`;
  });

  data.stages.forEach((stage, i) => {
    stage.stageNumber = stage.stageNumber || (i + 1);
    stage.name = stage.name || `Stage ${i + 1}`;
    stage.sealColor = stage.sealColor || SEAL_COLORS[i % SEAL_COLORS.length];
    stage.sealIcon = stage.sealIcon || '🔮';
    stage.introText = stage.introText || 'A new challenge awaits...';
    stage.hint = stage.hint || 'Examine the available elements for clues.';
    stage.completionText = stage.completionText || 'Solved! The next envelope beckons...';
    stage.unlocksElements = stage.unlocksElements || [];
    stage.midwayTexts = stage.midwayTexts || [];
    // Normalise: if only puzzleId (legacy), promote to puzzleIds
    if (!stage.puzzleIds || stage.puzzleIds.length === 0) {
      stage.puzzleIds = stage.puzzleId ? [stage.puzzleId] : [];
    }
  });

  const codeLen = config.structure.difficulty === 'casual' ? 3 : config.structure.difficulty === 'expert' ? 5 : 4;
  data.puzzles.forEach(puzzle => {
    puzzle.hint = puzzle.hint || 'Examine the available elements for clues.';
    puzzle.requiredElements = puzzle.requiredElements || [];
    if (puzzle.type === 'code') {
      puzzle.codeLength = puzzle.codeLength || codeLen;
      if (!puzzle.solution || puzzle.solution.length !== puzzle.codeLength) {
        puzzle.solution = String(Math.floor(Math.random() * (10 ** codeLen - 10 ** (codeLen - 1)) + 10 ** (codeLen - 1)));
      }
    }
    if (puzzle.type === 'riddle') {
      if (!puzzle.options || puzzle.options.length < 2) { puzzle.options = ['Yes', 'No', 'Maybe', 'Never']; puzzle.correctOption = 0; }
      if (typeof puzzle.correctOption !== 'number') puzzle.correctOption = 0;
    }
    if (puzzle.type === 'sequence' && (!puzzle.sequence || puzzle.sequence.length < 2)) puzzle.sequence = ['First', 'Second', 'Third'];
    if (puzzle.type === 'combination' && (!puzzle.dials || puzzle.dials.length === 0)) {
      puzzle.dials = [{ label: 'Position 1', options: ['A', 'B', 'C'] }, { label: 'Position 2', options: ['X', 'Y', 'Z'] }];
    }
    if (puzzle.type === 'combination' && puzzle.dials && !puzzle.solution) {
      // Auto-generate pipe-delimited solution from first option of each dial
      puzzle.solution = puzzle.dials.map(d => d.options[0]).join('|');
    }
    if (puzzle.type === 'cipher') {
      puzzle.encodedText = puzzle.encodedText || 'KHOOR';
      puzzle.cipherType = puzzle.cipherType || 'caesar';
      puzzle.decodedAnswer = puzzle.decodedAnswer || 'HELLO';
    }
    if (puzzle.type === 'overlay') { puzzle.overlayLayers = puzzle.overlayLayers || []; puzzle.revealText = puzzle.revealText || 'A hidden message appears...'; }
    if (puzzle.type === 'jigsaw_word') { puzzle.fragments = puzzle.fragments || ['MISS', 'ING']; puzzle.correctWord = puzzle.correctWord || puzzle.fragments.join(''); }
    if (puzzle.type === 'decay_restore') {
      puzzle.decayText = puzzle.decayText || 'THE ANSWER IS HERE';
      puzzle.decaySliders = puzzle.decaySliders || [
        { label: 'Focus', min: 0, max: 100, correct: 60, tolerance: 12 },
        { label: 'Contrast', min: 0, max: 100, correct: 75, tolerance: 12 },
        { label: 'Shift', min: 0, max: 100, correct: 40, tolerance: 15 },
      ];
    }
    if (puzzle.type === 'layer_align') {
      puzzle.alignTolerance = puzzle.alignTolerance ?? 18;
      puzzle.revealWord = puzzle.revealWord || 'REVEALED';
      if (!puzzle.glyphLayers || puzzle.glyphLayers.length < 3) {
        puzzle.glyphLayers = [
          { symbol: '✦', color: 'rgba(180,120,40,0.55)', startX: -110, startY: 60, correctX: 0, correctY: 0 },
          { symbol: '◈', color: 'rgba(80,160,200,0.55)', startX: 90, startY: -80, correctX: 0, correctY: 0 },
          { symbol: '⬡', color: 'rgba(160,60,160,0.55)', startX: -40, startY: 120, correctX: 0, correctY: 0 },
        ];
      }
    }
    if (puzzle.type === 'morse_decode') {
      puzzle.morsePattern = puzzle.morsePattern || '... --- ...';
      puzzle.morseAnswer = puzzle.morseAnswer || 'SOS';
    }
  });

  return data;
}

function validateBoxedEscape(data: EscapeRoomData): void {
  const allPuzzleIds = new Set(data.puzzles.map(p => p.id));
  const elemIds = new Set(data.boxElements.map(e => e.id));
  for (const stage of data.stages) {
    for (const pid of (stage.puzzleIds || [])) {
      if (!allPuzzleIds.has(pid)) console.warn(`Stage "${stage.name}" references unknown puzzle "${pid}"`);
    }
    for (const eid of stage.unlocksElements) {
      if (!elemIds.has(eid)) console.warn(`Stage "${stage.name}" unlocks unknown element "${eid}"`);
    }
  }
  for (const puzzle of data.puzzles) {
    for (const eid of (puzzle.requiredElements || [])) {
      if (!elemIds.has(eid)) console.warn(`Puzzle "${puzzle.name}" requires unknown element "${eid}"`);
    }
  }
}

// ── Game Flow QA ──

interface FlowIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'gating' | 'cipher' | 'narrative' | 'structure' | 'dead_element' | 'progression';
  description: string;
  fix?: string;
}

interface FlowQAResult {
  issues: FlowIssue[];
  autoFixed: number;
  geminiScore?: number;
  geminiSummary?: string;
}

/** Build a compact game summary for Gemini — strips base64 images and long HTML */
function buildQASummary(data: EscapeRoomData): string {
  return JSON.stringify({
    title: data.title,
    subtitle: data.subtitle,
    intro: data.intro,
    stages: data.stages.map(s => ({
      stageNumber: s.stageNumber,
      name: s.name,
      introText: s.introText,
      puzzleIds: s.puzzleIds,
      midwayTexts: s.midwayTexts,
      unlocksElements: s.unlocksElements,
      completionText: s.completionText,
    })),
    puzzles: data.puzzles.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      description: p.description,
      clueText: p.clueText,
      narrativeSignificance: p.narrativeSignificance,
      requiredElements: p.requiredElements,
      solution: p.solution,
      encodedText: p.encodedText,
      decodedAnswer: p.decodedAnswer,
      cipherType: p.cipherType,
      riddle: p.riddle,
      options: p.options,
      correctOption: p.correctOption,
      morsePattern: p.morsePattern,
      morseAnswer: p.morseAnswer,
      hint: p.hint,
    })),
    boxElements: data.boxElements.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      stage: e.stage,
      description: e.description,
      content: (e.content ?? '').substring(0, 300),
    })),
  }, null, 2);
}

/**
 * Check that every puzzle's requiredElements are all unlocked at a stage ≤ the puzzle's stage.
 * Auto-fixes by pulling the element forward to the required stage - 1.
 */
function checkAndFixElementGating(data: EscapeRoomData): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const elemStage = new Map(data.boxElements.map(e => [e.id, e.stage ?? 0]));
  const puzzleStageNum = new Map<string, number>();
  data.stages.forEach(s => s.puzzleIds.forEach(pid => puzzleStageNum.set(pid, s.stageNumber)));

  for (const puzzle of data.puzzles) {
    const pStage = puzzleStageNum.get(puzzle.id) ?? 1;
    for (const elemId of (puzzle.requiredElements ?? [])) {
      const eStage = elemStage.get(elemId);
      if (eStage === undefined) {
        issues.push({
          severity: 'critical',
          category: 'structure',
          description: `Puzzle "${puzzle.name}" requires element "${elemId}" which doesn't exist`,
        });
      } else if (eStage > pStage) {
        const elem = data.boxElements.find(e => e.id === elemId);
        const targetStage = Math.max(0, pStage - 1);
        issues.push({
          severity: 'critical',
          category: 'gating',
          description: `Puzzle "${puzzle.name}" (stage ${pStage}) requires "${elem?.name ?? elemId}" which only unlocks at stage ${eStage}`,
          fix: `Moved "${elem?.name ?? elemId}" to stage ${targetStage}`,
        });
        if (elem) { elem.stage = targetStage; elemStage.set(elemId, targetStage); }
      }
    }
  }
  return issues;
}

/**
 * Warn about box elements never referenced by any puzzle.
 * Sealed envelopes are exempt (they're structural).
 */
function checkDeadElements(data: EscapeRoomData): FlowIssue[] {
  const usedIds = new Set<string>();
  for (const puzzle of data.puzzles) {
    (puzzle.requiredElements ?? []).forEach(id => usedIds.add(id));
    (puzzle.overlayLayers ?? []).forEach(id => usedIds.add(id));
  }
  return data.boxElements
    .filter(e => e.type !== 'sealed_envelope' && !usedIds.has(e.id))
    .map(e => ({
      severity: 'warning' as const,
      category: 'dead_element' as const,
      description: `"${e.name}" (${e.id}, stage ${e.stage ?? 0}) is never used by any puzzle`,
    }));
}

/**
 * Verify Caesar cipher encodedText actually decodes to decodedAnswer for some shift 1-25.
 * If it doesn't, re-encode decodedAnswer with shift 3 and flag the fix.
 */
function fixCaesarCiphers(data: EscapeRoomData): FlowIssue[] {
  const fixes: FlowIssue[] = [];
  for (const puzzle of data.puzzles) {
    if (puzzle.type !== 'cipher' || puzzle.cipherType !== 'caesar') continue;
    if (!puzzle.encodedText || !puzzle.decodedAnswer) continue;

    const encAlpha = puzzle.encodedText.toUpperCase().replace(/[^A-Z]/g, '');
    const decAlpha = puzzle.decodedAnswer.toUpperCase().replace(/[^A-Z]/g, '');
    if (encAlpha.length === 0 || decAlpha.length === 0) continue;

    let valid = false;
    for (let s = 1; s <= 25; s++) {
      const candidate = encAlpha.split('').map(c =>
        String.fromCharCode((c.charCodeAt(0) - 65 - s + 26) % 26 + 65)
      ).join('');
      if (candidate === decAlpha) { valid = true; break; }
    }
    if (valid) continue;

    // Re-encode decodedAnswer with shift 3 (classic Caesar)
    const shift = 3;
    const newEncoded = puzzle.decodedAnswer.toUpperCase().split('').map(c =>
      /[A-Z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 65 + shift) % 26 + 65) : c
    ).join('');

    fixes.push({
      severity: 'warning',
      category: 'cipher',
      description: `Caesar mismatch in "${puzzle.name}": "${puzzle.encodedText}" doesn't decode to "${puzzle.decodedAnswer}"`,
      fix: `Re-encoded with shift ${shift}: "${newEncoded}"`,
    });
    puzzle.encodedText = newEncoded;
  }
  return fixes;
}

/**
 * Full game flow QA: structural checks (instant + auto-fix) + Gemini narrative review.
 */
async function runFlowQA(data: EscapeRoomData): Promise<FlowQAResult> {
  const issues: FlowIssue[] = [];

  // Structural checks (programmatic, no AI)
  issues.push(...checkAndFixElementGating(data));
  issues.push(...fixCaesarCiphers(data));
  issues.push(...checkDeadElements(data));

  const autoFixed = issues.filter(i => i.fix).length;

  // Gemini narrative review
  const summary = buildQASummary(data);
  const qaPrompt = `You are a QA analyst for boxed escape room games (think Exit: The Game, Unlock!). Review this game structure and identify real problems that would confuse or frustrate a player.

GAME STRUCTURE:
${summary}

Analyze ALL of the following:
1. GATING — Can the player access every puzzle's requiredElements before they reach that puzzle? Element stage must be <= puzzle stage.
2. CLUE LOGIC — Does each puzzle's clueText and description actually guide the player toward using the listed requiredElements to find the solution?
3. NARRATIVE COHERENCE — Do introTexts, midwayTexts, completionTexts, and narrativeSignificance fields tell a satisfying connected story arc? Are answers (solution/decodedAnswer) narratively motivated?
4. CIPHER VALIDITY — For cipher puzzles: does the encodedText logically encode the decodedAnswer? For riddle puzzles: is the correctOption defensible based on the riddle text?
5. PROGRESSION — Does difficulty and narrative tension escalate across the stages?

Return ONLY valid JSON in exactly this shape (no markdown, no extra text):
{
  "score": 7,
  "summary": "2-3 sentence overall assessment of play quality",
  "issues": [
    { "severity": "critical", "category": "gating", "description": "specific problem", "affected": "puzzle_or_element_id" }
  ]
}

Only flag real, substantive problems. Skip trivial style observations. severity must be "critical", "warning", or "info".`;

  const geminiRaw = await askGemini(qaPrompt, 0.2, true, 50000);
  type GeminiQA = { score?: number; summary?: string; issues?: { severity?: string; category?: string; description?: string; affected?: string }[] };
  const geminiParsed = parseJsonResponse(geminiRaw) as GeminiQA | null;

  let geminiScore: number | undefined;
  let geminiSummary: string | undefined;

  if (geminiParsed) {
    geminiScore = typeof geminiParsed.score === 'number' ? geminiParsed.score : undefined;
    geminiSummary = typeof geminiParsed.summary === 'string' ? geminiParsed.summary : undefined;
    if (Array.isArray(geminiParsed.issues)) {
      for (const gi of geminiParsed.issues) {
        const sev = gi.severity === 'critical' ? 'critical' : gi.severity === 'warning' ? 'warning' : 'info';
        const cat = (['gating', 'cipher', 'narrative', 'structure', 'dead_element', 'progression'].includes(gi.category ?? '') ? gi.category : 'narrative') as FlowIssue['category'];
        issues.push({
          severity: sev as FlowIssue['severity'],
          category: cat,
          description: gi.affected ? `[${gi.affected}] ${gi.description}` : (gi.description ?? ''),
        });
      }
    }
  }

  return { issues, autoFixed, geminiScore, geminiSummary };
}

// ── Fallback ──

function generateFallbackEscapeRoom(config: EscapeConfig): EscapeRoomResult {
  const title = config.story.title || 'The Locked Box';
  const stageCount = config.structure.envelopeCount || 4;
  const difficulty = config.structure.difficulty || 'standard';
  const codeLen = difficulty === 'casual' ? 3 : difficulty === 'expert' ? 5 : 4;

  const boxElements: BoxElement[] = [{
    id: 'story_sheet', name: 'Story Sheet', type: 'story_card', icon: '📜',
    description: 'A weathered parchment.',
    content: '<p>A mysterious box has arrived. Open the first sealed envelope to begin.</p>',
    stage: 0,
  }];
  const stages: EscapeStage[] = [];
  const puzzles: EscapePuzzle[] = [];

  for (let i = 1; i <= stageCount; i++) {
    const stageId = `stage_${i}`;
    const code = String(Math.floor(Math.random() * (10 ** codeLen - 10 ** (codeLen - 1)) + 10 ** (codeLen - 1)));
    boxElements.push({
      id: `envelope_${i}`, name: `Envelope ${i}`, type: 'sealed_envelope', icon: '✉️',
      description: `Sealed envelope #${i}.`,
      content: `<p>Stage ${i}: Enter the code to proceed.</p>`,
      stage: i === 1 ? 0 : i - 1,
    });
    boxElements.push({
      id: `clue_${i}`, name: `Clue Card ${i}`, type: 'story_card', icon: '📄',
      description: 'A card with markings.',
      content: `<p>The code: <strong>${code.split('').join(' - ')}</strong></p>`,
      stage: i,
    });
    stages.push({
      id: stageId, stageNumber: i, name: `Stage ${i}`,
      sealColor: SEAL_COLORS[(i - 1) % SEAL_COLORS.length], sealIcon: '🔮',
      introText: `Open envelope ${i}.`, hint: `Check Clue Card ${i}.`,
      puzzleIds: [stageId], midwayTexts: [],
      unlocksElements: [`clue_${i}`],
      completionText: i < stageCount ? 'Open the next envelope.' : 'You escaped!',
    });
    puzzles.push({
      id: stageId, name: `Lock ${i}`, type: 'code',
      description: `Enter the ${codeLen}-digit code.`,
      hint: `The code is on Clue Card ${i}.`,
      solution: code, codeLength: codeLen,
      requiredElements: [`clue_${i}`],
    });
  }

  const data: EscapeRoomData = {
    title, subtitle: 'Can you escape?',
    intro: 'A mysterious box has arrived. Open the sealed envelopes and solve the puzzles within.',
    difficulty, targetDuration: config.structure.duration || 45,
    boxArt: 'Dark mysterious box', tabletopStyle: 'dark wooden desk',
    boxElements, puzzles, stages,
  };

  const htmlContent = generateEscapePreviewHtml(data);
  const envelopes = stages.map((s, i) => ({ id: i + 1, title: s.name, puzzles: (s.puzzleIds || []).map(pid => data.puzzles.find(p => p.id === pid)?.name || pid) }));
  return { title, envelopes, htmlContent, data };
}

export { generateEscapePreviewHtml } from './escape-engine.js';

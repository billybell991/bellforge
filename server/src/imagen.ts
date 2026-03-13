/**
 * Multi-tier image generation with automatic fallback.
 * Generates real PNG artwork as base64 strings for embedding in game previews.
 *
 * THE WINNING FORMULA (from SpaceSloths):
 * - Imagen PNGs for backgrounds, characters, objects, items — everything visual
 * - Code-drawn only for HUD chrome, hit-test overlays, dynamic state indicators
 * - Every build generates NEW images — no two games look alike
 *
 * IMAGE MODEL CHAIN (each has its own daily quota):
 *   Tier 1: imagen-4.0-generate-001       — highest quality, 70/day
 *   Tier 2: imagen-4.0-fast-generate-001   — fast variant, separate 70/day quota
 *   Tier 3: gemini-2.5-flash-image         — native Gemini image gen, separate quota pool
 *
 * Circuit breaker: when a model returns RESOURCE_EXHAUSTED (daily quota hit),
 * it's skipped for all remaining calls in this server session.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ── Model definitions ──
interface ImageModel {
  id: string;
  type: 'predict' | 'generateContent';
  name: string;
}

const IMAGE_MODELS: ImageModel[] = [
  { id: 'imagen-4.0-generate-001', type: 'predict', name: 'Imagen 4.0' },
  { id: 'imagen-4.0-fast-generate-001', type: 'predict', name: 'Imagen 4.0 Fast' },
  { id: 'gemini-2.5-flash-image', type: 'generateContent', name: 'Gemini Flash Image' },
];

// Circuit breaker: models that have hit their daily quota this session
const exhaustedModels = new Set<string>();

export interface GeneratedImage {
  base64: string;       // PNG data as base64 string
  mimeType: string;     // always 'image/png'
  label: string;        // what this image is for (e.g. 'title_bg', 'room_0', 'character')
}

/** Check if a 429 response body indicates daily quota exhaustion (not just rate limiting) */
function isQuotaExhausted(bodyText: string): boolean {
  return bodyText.includes('RESOURCE_EXHAUSTED') || bodyText.includes('quota');
}

/** Aspect ratio hint for Gemini native image gen (doesn't support aspectRatio param) */
function aspectHint(ratio: string): string {
  switch (ratio) {
    case '16:9': return 'wide landscape 16:9 composition,';
    case '9:16': return 'tall portrait 9:16 composition,';
    case '3:4': return 'portrait 3:4 composition,';
    case '4:3': return 'landscape 4:3 composition,';
    case '1:1': return 'square 1:1 composition,';
    default: return '';
  }
}

/**
 * Try generating an image via an Imagen predict endpoint.
 * Returns base64 string on success, 'QUOTA_EXHAUSTED' if daily limit hit, null on other failure.
 */
async function tryImagenPredict(
  model: ImageModel,
  prompt: string,
  aspectRatio: string,
  apiKey: string,
): Promise<string | 'QUOTA_EXHAUSTED' | null> {
  const url = `${API_BASE}/models/${model.id}:predict?key=${apiKey}`;

  // Patient retries — quality over speed. We'd rather wait than skip.
  const MAX_RETRIES = 4;
  const TIMEOUT_MS = 90_000; // 90s per request — abort if Google hangs
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio },
        }),
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const body = await res.text();
        if (isQuotaExhausted(body)) {
          console.warn(`[${model.name}] Daily quota exhausted — circuit breaker tripped`);
          return 'QUOTA_EXHAUSTED';
        }
        // Transient rate limit — wait patiently
        if (attempt < MAX_RETRIES) {
          const wait = 4000 * Math.pow(2, attempt); // 4s, 8s, 16s, 32s
          console.warn(`[${model.name}] Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.warn(`[${model.name}] Rate limit retries exhausted after ${MAX_RETRIES} attempts`);
        return null;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[${model.name}] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }

      const data = await res.json() as {
        predictions?: Array<{ bytesBase64Encoded?: string }>;
      };

      if (data.predictions?.[0]?.bytesBase64Encoded) {
        return data.predictions[0].bytesBase64Encoded;
      }
      console.error(`[${model.name}] No image data in response`);
      return null;
    } catch (err) {
      console.error(`[${model.name}] Error:`, err);
      if (attempt < MAX_RETRIES) {
        const wait = 3000 * Math.pow(2, attempt);
        console.warn(`[${model.name}] Network error, retry in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Try generating an image via Gemini's native generateContent with responseModalities.
 * Returns base64 string on success, 'QUOTA_EXHAUSTED' if daily limit hit, null on other failure.
 * Includes patient retries for rate limits — this is our last-resort tier so we try hard.
 */
async function tryGeminiImage(
  model: ImageModel,
  prompt: string,
  aspectRatio: string,
  apiKey: string,
): Promise<string | 'QUOTA_EXHAUSTED' | null> {
  const url = `${API_BASE}/models/${model.id}:generateContent?key=${apiKey}`;

  const MAX_RETRIES = 5; // Extra patient — this is our last-resort tier
  const TIMEOUT_MS = 90_000; // 90s per request — abort if Google hangs
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${aspectHint(aspectRatio)} ${prompt}` }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const body = await res.text();
        if (isQuotaExhausted(body)) {
          console.warn(`[${model.name}] Daily quota exhausted — circuit breaker tripped`);
          return 'QUOTA_EXHAUSTED';
        }
        if (attempt < MAX_RETRIES) {
          const wait = 5000 * Math.pow(2, attempt); // 5s, 10s, 20s, 40s, 80s
          console.warn(`[${model.name}] Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.warn(`[${model.name}] Rate limit retries exhausted`);
        return null;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[${model.name}] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }

      const data = await res.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }>;
          };
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
      console.error(`[${model.name}] No image data in response`);
      return null;
    } catch (err) {
      console.error(`[${model.name}] Error:`, err);
      if (attempt < MAX_RETRIES) {
        const wait = 5000 * Math.pow(2, attempt);
        console.warn(`[${model.name}] Network error, retry in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return null;
    }
  }
  return null; // All retries exhausted
}

/**
 * Generate a single image using the multi-tier model chain.
 * Automatically falls through Imagen → Imagen Fast → Gemini Flash Image.
 * Returns the base64-encoded PNG string, or null if ALL tiers fail.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '16:9',
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[ImageGen] No API key');
    return null;
  }

  for (const model of IMAGE_MODELS) {
    if (exhaustedModels.has(model.id)) continue;

    const result = model.type === 'predict'
      ? await tryImagenPredict(model, prompt, aspectRatio, apiKey)
      : await tryGeminiImage(model, prompt, aspectRatio, apiKey);

    if (result === 'QUOTA_EXHAUSTED') {
      exhaustedModels.add(model.id);
      console.warn(`[ImageGen] ${model.name} quota exhausted, trying next tier...`);
      continue;
    }

    if (result) {
      // Log which tier succeeded (for visibility)
      if (model.id !== IMAGE_MODELS[0].id) {
        console.log(`[ImageGen] Generated via fallback: ${model.name}`);
      }
      return result;
    }

    // null = transient failure on this model, try next
    console.warn(`[ImageGen] ${model.name} failed, trying next tier...`);
  }

  console.error('[ImageGen] All image generation tiers exhausted');
  return null;
}

/** Throttle delay between sequential image gen calls */
const THROTTLE_MS = 1500;
function throttle(): Promise<void> {
  return new Promise(r => setTimeout(r, THROTTLE_MS));
}

/**
 * Generate all images needed for a game build.
 * Calls Imagen for: title background, each room background, character, and key items.
 * Reports progress via onStatus callback.
 */
export async function generateGameImages(
  config: {
    title: string;
    artStyle: string;
    theme: string;
    genre: string;
    setting: string;
    characterName: string;
    rooms: Array<{ name: string; description: string; atmosphere: string }>;
    items: Array<{ name: string; emoji: string; description: string }>;
    palette: { bg: string; accent: string; wall: string };
    sceneLabel?: string;  // e.g. "room", "level", "chapter" — defaults to "room"
  },
  onStatus?: (msg: string) => void,
  onProgress?: (msg: string, stepIndex: number, totalSteps: number, timing?: { elapsed: number; etaSec: number; avgMs: number }) => void,
): Promise<{
  titleBg: string | null;
  roomBgs: Array<string | null>;
  character: string | null;
  itemImages: Array<string | null>;
  packIcon: string | null;
}> {
  const artPrompt = buildArtStylePrefix(config.artStyle);
  const themePrompt = buildThemeAtmosphere(config.theme);
  const label = config.sceneLabel || 'room';
  const Label = label.charAt(0).toUpperCase() + label.slice(1);

  // Total steps: title + character + pack icon + rooms + items
  const itemsToGen = config.items.slice(0, 6);
  const totalSteps = 3 + config.rooms.length + itemsToGen.length;
  let stepIdx = 0;

  // Timing tracking for ETA
  const artStartTime = Date.now();
  const imageDurations: number[] = [];
  let lastImageStart = Date.now();

  let currentMsg = '';
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const getTiming = () => {
    const avgMs = imageDurations.length > 0
      ? imageDurations.reduce((a, b) => a + b, 0) / imageDurations.length
      : 0;
    const remaining = totalSteps - stepIdx;
    const etaSec = Math.round((avgMs * remaining) / 1000);
    const elapsed = Math.round((Date.now() - artStartTime) / 1000);
    return { elapsed, etaSec, avgMs: Math.round(avgMs) };
  };

  const report = (msg: string, imageJustFinished = false) => {
    if (imageJustFinished) {
      const dur = Date.now() - lastImageStart;
      imageDurations.push(dur);
    }
    currentMsg = msg;
    const timing = getTiming();
    onStatus?.(msg);
    onProgress?.(msg, stepIdx, totalSteps, timing);
    if (imageJustFinished) {
      lastImageStart = Date.now();
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      const timing = getTiming();
      // Re-send current message with updated elapsed time
      onProgress?.(currentMsg, stepIdx, totalSteps, timing);
    }, 3000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  // Show active tier info
  const activeTier = IMAGE_MODELS.find(m => !exhaustedModels.has(m.id));
  if (activeTier && activeTier.id !== IMAGE_MODELS[0].id) {
    report(`🔄 Using ${activeTier.name} (primary model quota reached)`);
  }

  // Title screen background (landscape)
  report('🎨 Generating title screen artwork...');
  startHeartbeat();
  const titleBg = await generateImage(
    `${artPrompt} game environment background illustration, ${config.setting}, ${themePrompt}, dramatic cinematic composition, landscape orientation, pure scenery only, ${artPrompt} absolutely no text no words no letters no writing no logos no UI no signage no titles no menus no buttons no captions no labels no headers`,
    '16:9',
  );
  stopHeartbeat();
  stepIdx++;
  report(titleBg ? '🎨 Title artwork generated!' : '⚠️ Title artwork failed — will use code-drawn fallback', true);

  await throttle();

  // Character portrait
  report(`🎨 Generating ${config.characterName} character art...`);
  startHeartbeat();
  const character = await generateImage(
    `${artPrompt} game character portrait, ${config.characterName}, adventurer in ${config.setting}, full body, facing forward, ${themePrompt}, on a pure solid black #000000 void background, no ground plane, no shadow on ground, game sprite art, ${artPrompt} absolutely no text no words no letters no captions no labels`,
    '3:4',
  );
  stopHeartbeat();
  stepIdx++;
  report(character ? '🎨 Character art generated!' : '⚠️ Character art failed — will use code-drawn fallback', true);

  await throttle();

  // Inventory / pack icon (themed to genre and art style)
  const packLabels: Record<string, string> = {
    horror: 'worn leather satchel',
    fantasy: 'adventurer backpack with buckles',
    scifi: 'futuristic utility belt pouch',
    mystery: 'detective briefcase',
    cozy: 'woven basket',
    cyberpunk: 'neon-lit tech sling bag',
    steampunk: 'brass and leather rucksack with gears',
    postapoc: 'scavenged military duffel bag',
  };
  const packLabel = packLabels[config.theme] || 'adventurer backpack';
  report('🎨 Generating inventory icon...');
  startHeartbeat();
  const packIcon = await generateImage(
    `${artPrompt} game UI icon, single ${packLabel}, centered on pure black #000000 background, simple clean icon, ${artPrompt} absolutely no text no words no letters`,
    '1:1',
  );
  stopHeartbeat();
  stepIdx++;
  report(packIcon ? '🎨 Pack icon generated!' : '⚠️ Pack icon skipped — will use fallback', true);

  await throttle();

  // Scene backgrounds (landscape for gameplay)
  const roomBgs: Array<string | null> = [];
  for (let i = 0; i < config.rooms.length; i++) {
    const room = config.rooms[i];
    report(`🎨 Painting ${label} ${i + 1}/${config.rooms.length}: ${room.name}...`);
    startHeartbeat();
    const bg = await generateImage(
      config.genre === 'dismantle'
        ? `${artPrompt} game scene, a ${room.name} sitting on a workbench surface ready to be taken apart, ${room.description}, ${room.atmosphere} mood, ${themePrompt}, single object centered in frame, detailed mechanical illustration, ${artPrompt} absolutely no text no words no letters no UI no characters`
        : `${artPrompt} game background scene, interior view of ${room.name}, ${room.description}, ${room.atmosphere} mood, ${themePrompt}, detailed environment art, ${artPrompt} absolutely no text no words no letters no UI no characters`,
      '16:9',
    );
    stopHeartbeat();
    roomBgs.push(bg);
    stepIdx++;
    report(bg ? `🎨 ${Label} "${room.name}" artwork done!` : `⚠️ ${Label} "${room.name}" failed — will use code-drawn fallback`, true);
    if (i < config.rooms.length - 1) await throttle();
  }

  // Key item images (square icons)
  const itemImages: Array<string | null> = [];
  // Only generate images for up to 6 items to keep build time reasonable
  for (let i = 0; i < itemsToGen.length; i++) {
    const item = itemsToGen[i];
    report(`🎨 Generating item art ${i + 1}/${itemsToGen.length}: ${item.name}...`);
    startHeartbeat();
    const img = await generateImage(
      `${artPrompt} game item icon, single ${item.name} object, ${item.description}, centered on dark background, collectible game item, ${artPrompt} clean illustration, absolutely no text no words no letters`,
      '1:1',
    );
    stopHeartbeat();
    itemImages.push(img);
    stepIdx++;
    if (i < itemsToGen.length - 1) await throttle();
  }
  // Fill remaining items with null
  while (itemImages.length < config.items.length) {
    itemImages.push(null);
  }

  const successCount = [titleBg, character, packIcon, ...roomBgs, ...itemImages].filter(Boolean).length;
  stopHeartbeat();
  report(`🎨 Image generation complete: ${successCount}/${totalSteps} images generated`);

  return { titleBg, roomBgs, character, itemImages, packIcon };
}

function buildArtStylePrefix(artStyle: string): string {
  const styles: Record<string, string> = {
    cel_shaded: 'cel-shaded Borderlands style, thick ink outlines, bold colors,',
    pixel_art: 'pixel art style, retro 16-bit aesthetic, crisp pixels,',
    watercolor: 'watercolor painting style, soft washes, blended colors, artistic,',
    noir: 'film noir style, high contrast black and white with selective color,',
    neon: 'neon cyberpunk style, glowing neon lights, dark backgrounds, vivid electric colors,',
    hand_drawn: 'hand-drawn sketch style, pencil and ink illustration, charming imperfect lines,',
    low_poly: 'low-poly 3D style, geometric faceted surfaces, clean modern aesthetic,',
  };
  return styles[artStyle] || styles.cel_shaded;
}

function buildThemeAtmosphere(theme: string): string {
  const themes: Record<string, string> = {
    horror: 'dark eerie atmosphere, shadows, cobwebs, dim flickering light',
    fantasy: 'magical enchanted atmosphere, glowing runes, mystical energy',
    scifi: 'futuristic sci-fi atmosphere, holographic displays, sleek technology',
    mystery: 'moody detective atmosphere, warm lamplight, foggy shadows',
    cozy: 'warm cozy atmosphere, soft golden light, comfortable inviting',
    cyberpunk: 'neon-lit cyberpunk atmosphere, rain-slicked streets, holographic ads',
    steampunk: 'Victorian steampunk atmosphere, brass gears, steam pipes, warm amber light',
    postapoc: 'post-apocalyptic atmosphere, overgrown ruins, muted dusty tones',
  };
  return themes[theme] || themes.mystery;
}

/**
 * Imagen 4.0 image generation via Google's predict REST API.
 * Generates real PNG artwork as base64 strings for embedding in game previews.
 *
 * THE WINNING FORMULA (from SpaceSloths):
 * - Imagen PNGs for backgrounds, characters, objects, items — everything visual
 * - Code-drawn only for HUD chrome, hit-test overlays, dynamic state indicators
 * - Every build generates NEW images — no two games look alike
 */

const IMAGEN_MODEL = 'imagen-4.0-generate-001';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeneratedImage {
  base64: string;       // PNG data as base64 string
  mimeType: string;     // always 'image/png'
  label: string;        // what this image is for (e.g. 'title_bg', 'room_0', 'character')
}

/**
 * Generate a single image via Imagen 4.0.
 * Returns the base64-encoded PNG string, or null on failure.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '16:9',
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Imagen] No API key');
    return null;
  }

  const url = `${API_BASE}/models/${IMAGEN_MODEL}:predict?key=${apiKey}`;
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio },
        }),
      });

      if (res.status === 429) {
        const wait = Math.min(5000, 1000 * Math.pow(2, attempt));
        console.warn(`[Imagen] Rate limited (429), retry ${attempt + 1}/${MAX_RETRIES} after ${wait}ms`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.error('[Imagen] Exhausted retries on 429');
        return null;
      }

      if (!res.ok) {
        console.error(`[Imagen] HTTP ${res.status}: ${await res.text()}`);
        return null;
      }

      const data = await res.json() as {
        predictions?: Array<{ bytesBase64Encoded?: string }>;
      };

      if (data.predictions?.[0]?.bytesBase64Encoded) {
        return data.predictions[0].bytesBase64Encoded;
      }

      console.error('[Imagen] No image data in response');
      return null;
    } catch (err) {
      console.error('[Imagen] Error:', err);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return null;
    }
  }
  return null;
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
  onProgress?: (msg: string, stepIndex: number, totalSteps: number) => void,
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

  const report = (msg: string) => {
    onStatus?.(msg);
    onProgress?.(msg, stepIdx, totalSteps);
  };

  // Title screen background (landscape)
  report('Generating title screen artwork...');
  const titleBg = await generateImage(
    `${artPrompt} game environment background illustration, ${config.setting}, ${themePrompt}, dramatic cinematic composition, landscape orientation, pure scenery only, ${artPrompt} absolutely no text no words no letters no writing no logos no UI no signage no titles no menus no buttons no captions no labels no headers`,
    '16:9',
  );
  stepIdx++;
  report(titleBg ? 'Title artwork generated!' : 'Title artwork failed — will use code-drawn fallback');

  // Character portrait
  report(`Generating ${config.characterName} character art...`);
  const character = await generateImage(
    `${artPrompt} game character portrait, ${config.characterName}, adventurer in ${config.setting}, full body, facing forward, ${themePrompt}, on a pure solid black #000000 void background, no ground plane, no shadow on ground, game sprite art, ${artPrompt} absolutely no text no words no letters no captions no labels`,
    '3:4',
  );
  stepIdx++;
  report(character ? 'Character art generated!' : 'Character art failed — will use code-drawn fallback');

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
  report('Generating inventory icon...');
  const packIcon = await generateImage(
    `${artPrompt} game UI icon, single ${packLabel}, centered on pure black #000000 background, simple clean icon, ${artPrompt} absolutely no text no words no letters`,
    '1:1',
  );
  stepIdx++;
  report(packIcon ? 'Pack icon generated!' : 'Pack icon skipped — will use fallback');

  // Scene backgrounds (landscape for gameplay)
  const roomBgs: Array<string | null> = [];
  for (let i = 0; i < config.rooms.length; i++) {
    const room = config.rooms[i];
    report(`Painting ${label} ${i + 1}/${config.rooms.length}: ${room.name}...`);
    const bg = await generateImage(
      `${artPrompt} game background scene, interior view of ${room.name}, ${room.description}, ${room.atmosphere} mood, ${themePrompt}, detailed environment art, ${artPrompt} absolutely no text no words no letters no UI no characters`,
      '16:9',
    );
    roomBgs.push(bg);
    stepIdx++;
    report(bg ? `${Label} "${room.name}" artwork done!` : `${Label} "${room.name}" failed — will use code-drawn fallback`);
  }

  // Key item images (square icons)
  const itemImages: Array<string | null> = [];
  // Only generate images for up to 6 items to keep build time reasonable
  for (let i = 0; i < itemsToGen.length; i++) {
    const item = itemsToGen[i];
    report(`Generating item art ${i + 1}/${itemsToGen.length}: ${item.name}...`);
    const img = await generateImage(
      `${artPrompt} game item icon, single ${item.name} object, ${item.description}, centered on dark background, collectible game item, ${artPrompt} clean illustration, absolutely no text no words no letters`,
      '1:1',
    );
    itemImages.push(img);
    stepIdx++;
  }
  // Fill remaining items with null
  while (itemImages.length < config.items.length) {
    itemImages.push(null);
  }

  report(`Image generation complete: ${[titleBg, character, ...roomBgs, ...itemImages].filter(Boolean).length} images generated`);

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

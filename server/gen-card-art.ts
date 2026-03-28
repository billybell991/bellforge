/**
 * One-shot script: generate beautiful faceplate images for the 5 landing cards.
 * Run: npx tsx gen-card-art.ts
 * Output: ../client/public/card-art/*.png
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { generateImage } from './src/imagen.js';

const OUT_DIR = join(process.cwd(), '..', 'client', 'public', 'card-art');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Each card: { filename, prompt }
// Prompts crafted for 3:4 portrait (card shape), no text, cinematic quality.
const CARDS = [
  {
    name: 'adventure',
    prompt: [
      'epic illustrated book cover art, a lone traveler standing at a fork in a misty enchanted forest,',
      'three diverging magical paths each glowing a different color — amber, violet, and emerald,',
      'ancient twisted trees with glowing runes carved into bark, fireflies drifting upward,',
      'dramatic volumetric god-rays breaking through the canopy, painterly fantasy illustration style,',
      'rich jewel-tone color palette, cinematic depth of field, storybook atmosphere,',
      'absolutely no text no words no letters no titles no captions no UI',
    ].join(' '),
  },
  {
    name: 'comic',
    prompt: [
      'explosive comic book splash page art, dynamic superhero figure bursting through a shattered panel border,',
      'bold halftone dot background in vivid red and yellow, dramatic action lines radiating outward,',
      'ink-splatter textures, cel-shaded pop-art style, ultra-high contrast black outlines,',
      'vibrant primary colors, kinetic energy, mid-century American comic book aesthetic,',
      'absolutely no text no words no letters no speech bubbles no captions no sound effects',
    ].join(' '),
  },
  {
    name: 'escape',
    prompt: [
      'atmospheric escape room box cover illustration, moody candlelit stone chamber,',
      'ornate locked chest at center glowing with mysterious blue light, ancient mechanisms and cogs on the walls,',
      'cryptic symbols etched into stone, hanging lanterns casting warm amber pools,',
      'dramatic chiaroscuro lighting, deep shadows, sense of mystery and adventure,',
      'painterly digital art style, rich dark color palette of navy, gold, and crimson,',
      'absolutely no text no words no letters no numbers no UI elements',
    ].join(' '),
  },
  {
    name: 'puzzles',
    prompt: [
      'colorful playful illustration of a mosaic of puzzle types arranged beautifully,',
      'giant jigsaw pieces in vivid colors fitting together to reveal a landscape, crossword grid squares filled with',
      'colorful tiles, jumbled letter blocks tumbling through the air, all arranged in a dynamic swirling composition,',
      'isometric flat-design style, bright saturated palette of coral, teal, yellow, and purple,',
      'clean graphic illustration, sense of playful fun and brain challenge,',
      'absolutely no text no words no letters no numbers',
    ].join(' '),
  },
  {
    name: 'casebook',
    prompt: [
      'film noir detective illustration, rain-soaked 1940s city street at night viewed from below,',
      'silhouette of a detective in a trench coat and fedora standing under a glowing street lamp,',
      'rain streaks catching the amber light, foggy atmosphere, reflections in puddles,',
      'a magnifying glass in the foreground revealing hidden clues in the shadows,',
      'high-contrast black and white with selective warm amber accent lighting,',
      'cinematic pulp fiction illustration style, dramatic atmosphere,',
      'absolutely no text no words no letters no titles',
    ].join(' '),
  },
];

async function main() {
  console.log('🎨 Generating landing card artwork via Imagen...\n');

  for (const card of CARDS) {
    process.stdout.write(`  Painting ${card.name}... `);
    const b64 = await generateImage(card.prompt, '3:4');
    if (!b64) {
      console.log('❌ failed (quota or error — check Imagen logs above)');
      continue;
    }
    const outPath = join(OUT_DIR, `${card.name}.png`);
    writeFileSync(outPath, Buffer.from(b64, 'base64'));
    console.log(`✓  saved to client/public/card-art/${card.name}.png`);
  }

  console.log('\n✅ Done. Commit client/public/card-art/ to deploy.');
}

main().catch(console.error);

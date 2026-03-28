/**
 * One-shot script: generate faceplate images for the 4 puzzle sub-menu cards.
 * Run: npx tsx gen-puzzle-art.ts
 * Output: ../client/public/card-art/*.png
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { generateImage } from './src/imagen.js';

const OUT_DIR = join(process.cwd(), '..', 'client', 'public', 'card-art');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const CARDS = [
  {
    name: 'jigsaw',
    prompt: [
      'beautiful close-up illustration of a partially completed jigsaw puzzle,',
      'the assembled section reveals a stunning sunset mountain landscape with vivid orange and purple skies,',
      'scattered unplaced pieces in the foreground catching warm golden light,',
      'a few pieces mid-air dramatically fitting together, satisfying snap moment,',
      'rich jewel-tone colors, painterly digital art style, dramatic lighting from below,',
      'elegant and inviting, sense of meditative concentration and reward,',
      'absolutely no text no words no letters no numbers no UI',
    ].join(' '),
  },
  {
    name: 'wordsearch',
    prompt: [
      'dramatic stylized illustration of a word search puzzle grid from a slight angle,',
      'glowing neon cyan and amber highlights tracing found words across the grid,',
      'letters rendered in crisp clean typography on dark textured paper,',
      'a hand with a pencil elegantly circling a word, motion blur effect,',
      'some letters float upward off the page like fireflies,',
      'retro-modern graphic design style, deep indigo and gold color palette, dramatic studio lighting,',
      'absolutely no actual readable words no real text just illustrated letter shapes',
    ].join(' '),
  },
  {
    name: 'crossword',
    prompt: [
      'elegant editorial illustration of a classic crossword puzzle grid filling an ornate stone tablet,',
      'dramatic overhead angle, individual squares glowing softly in amber light,',
      'a golden fountain pen resting diagonally across the grid casting a long shadow,',
      'near-complete puzzle with some squares filled in dark ink, across and down structure visible,',
      'sophisticated dark academia atmosphere, warm candlelight, polished wood desk beneath,',
      'painterly realistic illustration style, rich deep brown and gold palette,',
      'absolutely no readable text no actual words no letters that form real words',
    ].join(' '),
  },
  {
    name: 'jumble',
    prompt: [
      'vibrant retro newspaper-style illustration, massive scrambled letters tumbling through mid-air,',
      'bold chunky block letters in red, black, and yellow spinning and rearranging dramatically,',
      'in the background a classic hand-drawn cartoon panel scene — a comedic situation with two figures,',
      'halftone dot texture overlaid, newsprint grain, thick ink outlines, vintage editorial cartoon style,',
      'kinetic energy like a word explosion, sense of playful chaos and the aha moment approaching,',
      'absolutely no readable text no actual words no coherent letter sequences',
    ].join(' '),
  },
];

async function main() {
  console.log('🎨 Generating puzzle sub-menu artwork via Imagen...\n');

  for (const card of CARDS) {
    process.stdout.write(`  Painting ${card.name}... `);
    const b64 = await generateImage(card.prompt, '3:4');
    if (!b64) {
      console.log('❌ failed (quota or error — check logs above)');
      continue;
    }
    const outPath = join(OUT_DIR, `${card.name}.png`);
    writeFileSync(outPath, Buffer.from(b64, 'base64'));
    console.log(`✓  saved to client/public/card-art/${card.name}.png`);
  }

  console.log('\n✅ Done. Commit client/public/card-art/ to deploy.');
}

main().catch(console.error);

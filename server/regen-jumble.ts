// One-shot script to regenerate a jumble preview HTML using the current engine
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateJumblePreviewHtml } from './src/jumble-pipeline.js';

const buildId = process.argv[2];
if (!buildId) { console.error('Usage: npx tsx regen-jumble.ts <buildId>'); process.exit(1); }

const htmlPath = join(process.cwd(), 'data', 'previews', `${buildId}.html`);
const html = readFileSync(htmlPath, 'utf-8');

const wordsM = html.match(/const words = (\[[\s\S]+?\]);/);
const finalM = html.match(/const finalAnswer = ("[^"]+");/);
const titleM = html.match(/<title>([^<]+)<\/title>/);
const imgM = html.match(/src="(data:image\/png;base64,[^"]+)"/);
const clueM = html.match(/class="final-clue">([^<]+)<\/p>/);
const captionM = html.match(/class="caption">([^<]+)<\/div>/);

if (!wordsM || !finalM) { console.error('Could not extract words/finalAnswer from HTML'); process.exit(1); }

const words = JSON.parse(wordsM[1]);
const finalAnswer = JSON.parse(finalM[1]);
const title = titleM ? titleM[1] : 'Jumble';
const cartoonBase64 = imgM ? imgM[1].replace('data:image/png;base64,', '') : null;
const finalClue = clueM ? clueM[1] : '';
const cartoonCaption = captionM ? captionM[1] : finalClue;

const result = { title, words, finalClue, finalAnswer, cartoonCaption, cartoonBase64 };

const newHtml = generateJumblePreviewHtml(result as any, {} as any);
writeFileSync(htmlPath, newHtml, 'utf-8');
console.log(`✓ Jumble preview regenerated for buildId: ${buildId}`);

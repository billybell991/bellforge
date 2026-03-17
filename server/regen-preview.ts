// One-shot script to regenerate a single escape room preview HTML using the current engine
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateEscapePreviewHtml } from './src/escape-engine.js';

const buildId = process.argv[2];
if (!buildId) { console.error('Usage: npx tsx regen-preview.ts <buildId>'); process.exit(1); }

const htmlPath = join(process.cwd(), 'data', 'previews', `${buildId}.html`);
const html = readFileSync(htmlPath, 'utf-8');

// The escape engine embeds: const GAME = <single-line JSON>;
const match = html.match(/const GAME\s*=\s*(\{.+\});/);
if (!match) { console.error('Could not find GAME JSON in HTML'); process.exit(1); }

const gameData = JSON.parse(match[1]);
const newHtml = generateEscapePreviewHtml(gameData);
writeFileSync(htmlPath, newHtml, 'utf-8');
console.log(`✓ Preview regenerated for buildId: ${buildId}`);

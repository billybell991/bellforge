// ── Escape Room Pipeline (stub) ──
// This will be expanded with full Gemini-driven puzzle generation.
// For now it returns a minimal placeholder so the forge endpoint works end-to-end.

import type { EscapeConfig } from './pipeline/types.js';

export interface EscapeRoomResult {
  title: string;
  envelopes: { id: number; title: string; puzzles: string[] }[];
  htmlContent: string;
}

type ProgressCallback = (percent: number, message: string, stage?: string) => void;

export async function runEscapePipeline(
  config: EscapeConfig,
  onProgress: ProgressCallback
): Promise<EscapeRoomResult | null> {
  const title = config.story.title || 'Untitled Escape Room';
  const envelopeCount = config.structure.envelopeCount || 4;

  onProgress(5, 'Designing Escape Room Concept', 'concept');
  await sleep(600);

  onProgress(15, 'Building Puzzle Graph', 'outline');
  await sleep(400);

  // Build placeholder envelopes
  const envelopes: EscapeRoomResult['envelopes'] = [];
  for (let i = 1; i <= envelopeCount; i++) {
    onProgress(15 + Math.round((i / envelopeCount) * 40), `Crafting Stage ${i} Puzzles`, 'puzzles');
    await sleep(300);
    envelopes.push({
      id: i,
      title: `Stage ${i}`,
      puzzles: [`Placeholder puzzle for stage ${i}`],
    });
  }

  onProgress(60, 'Assembling Escape Structure', 'assembly');
  await sleep(400);

  onProgress(75, 'QA — Verifying Solvability', 'qa_graph');
  await sleep(300);

  onProgress(90, 'Building Interactive Viewer', 'viewer');
  await sleep(300);

  onProgress(100, 'Escape Room Complete!', 'complete');

  return { title, envelopes, htmlContent: '' };
}

export function generateEscapePreviewHtml(result: EscapeRoomResult): string {
  const title = result.title;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .container{max-width:600px;text-align:center;padding:2rem}
    h1{font-size:2rem;margin-bottom:1rem;color:#f0c040}
    p{margin-bottom:0.5rem;opacity:0.8}
    .stages{margin-top:1.5rem;text-align:left}
    .stage{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:1rem;margin-bottom:0.75rem}
    .stage h3{color:#f0c040;margin-bottom:0.25rem}
    .badge{display:inline-block;background:#f0c040;color:#1a1a2e;padding:2px 8px;border-radius:4px;font-size:0.75rem;margin-bottom:1rem}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">ESCAPE ROOM — PREVIEW</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${result.envelopes.length} stages · Full puzzle engine coming soon</p>
    <div class="stages">
      ${result.envelopes.map((e) => `<div class="stage"><h3>🔑 ${escapeHtml(e.title)}</h3><p>${escapeHtml(e.puzzles[0])}</p></div>`).join('\n      ')}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

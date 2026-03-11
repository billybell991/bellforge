/**
 * Generates a self-contained HTML5 Canvas game preview.
 * Maps 1:1 to the Kotlin/Canvas output — same drawing primitives,
 * same normalized coordinate system, same room/hotspot architecture.
 */

interface PreviewConfig {
  genre: { id: string; name: string };
  theme: { id: string; name: string; color?: string };
  artStyle: { id: string; name: string };
  structure: { roomCount: number; difficulty: string; puzzleDensity: string };
  story: { title: string; description: string; characterName: string; setting: string };
  seed: number; // unique per build — ensures no two runs produce the same game
}

// ── Theme color palettes ──

const THEME_PALETTES: Record<string, { bg: string; wall: string; accent: string; floor: string; text: string }> = {
  horror:    { bg: '#1a0a0a', wall: '#3d1515', accent: '#ff3d00', floor: '#2a1010', text: '#ffccbc' },
  fantasy:   { bg: '#0f0a1e', wall: '#2a1f5e', accent: '#7c4dff', floor: '#1a1040', text: '#e8daff' },
  scifi:     { bg: '#0a1520', wall: '#153045', accent: '#00e5ff', floor: '#0d1f30', text: '#b2ebf2' },
  mystery:   { bg: '#1a1508', wall: '#3d3010', accent: '#ffa726', floor: '#2a2510', text: '#ffe0b2' },
  cozy:      { bg: '#1a0f15', wall: '#4a2040', accent: '#f48fb1', floor: '#2a1525', text: '#fce4ec' },
  cyberpunk: { bg: '#0f0518', wall: '#2a1040', accent: '#e040fb', floor: '#1a0a25', text: '#f3e5f5' },
  steampunk: { bg: '#1a1008', wall: '#4a3020', accent: '#ff8a65', floor: '#2a2010', text: '#ffe0b2' },
  postapoc:  { bg: '#15100a', wall: '#3d2a1a', accent: '#8d6e63', floor: '#251a10', text: '#d7ccc8' },
};

// ── Room name generators per genre ──

// Expanded room name pools — shuffled per seed so each build gets unique combinations
const ROOM_POOLS: Record<string, string[]> = {
  point_click: ['Entrance Hall','Library','Kitchen','Cellar','Attic','Garden','Tower','Vault','Chapel','Observatory','Dining Room','Dungeon','Conservatory','Study','Balcony','Throne Room','Armory','Laboratory','Gallery','Secret Passage','Parlor','Wine Cellar','Servants Quarters','Map Room','Solarium','Greenhouse','Crypt','Bell Tower','Courtyard','Grand Staircase','Music Room','Portrait Gallery','Pantry','Guard Room','Trophy Hall','Clock Tower','Archive'],
  escape_room: ['The Locked Office','Basement Cell','The Cabin','Lab 42','Vault Room','The Freezer','Control Room','The Archive','Engine Room','Panic Room','Storage Unit','The Lounge','Server Room','Maintenance Shaft','Interrogation Room','Evidence Locker','Generator Bay','The Penthouse','Loading Dock','Radio Tower','Boiler Room','Safe House','Warden Office'],
  puzzle: ['Starter Grid','Mirror Chamber','Gear Nexus','Crystal Maze','Logic Gate','Color Prism','Gravity Well','Time Lock','Shadow Match','Cascade Room','Prism Hall','Cipher Den','Tile Arena','Sequence Core'],
  visual_novel: ['The Encounter','Rising Tension','Crossroads','Revelation','Turning Point','Dark Hour','Reconciliation','Climax','Aftermath','New Dawn','First Light','The Promise','Betrayal','Redemption'],
  platformer: ['Green Meadows','Crystal Caverns','Lava Fortress','Sky Archipelago','Frost Peak','Shadow Factory','Neon Circuit','Jungle Canopy','Storm Citadel','Clockwork Spire','Coral Reef','Magma Core','Wind Valley','Star Bridge'],
  hidden_object: ['The Study','Victorian Parlor','Old Workshop','Market Square','Train Station','Abandoned Pier','Museum Hall','Garden Shed','Antique Shop','Clock Tower','Wine Cellar','Rooftop Terrace','Curiosity Cabinet','Shipwreck Deck','Opera House','Carnival Grounds','Toy Factory','Lighthouse','Darkroom','Apothecary'],
  interactive_fiction: ['The Threshold','Forked Path','Whispering Hall','Memory Lane','The Crossroads','Echo Chamber','Forgotten Gate','Liminal Space','The Descent','Ascension','Twilight Corridor','The Precipice','Inner Sanctum','The Revelation'],
};

// Seeded Fisher-Yates shuffle (server-side, for room name selection)
function seededShuffle(arr: string[], seed: number): string[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getRoomNames(genreId: string, count: number, seed: number): string[] {
  const pool = ROOM_POOLS[genreId] || ROOM_POOLS.point_click;
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, count);
}

export function generatePreviewHtml(config: PreviewConfig): string {
  const palette = THEME_PALETTES[config.theme.id] || THEME_PALETTES.mystery;
  const roomCount = config.structure.roomCount;
  const seed = config.seed;
  const rooms = getRoomNames(config.genre.id, roomCount, seed);
  const charName = config.story.characterName || 'The Explorer';
  const title = config.story.title || 'Untitled Game';
  const setting = config.story.setting || 'a mysterious place';
  const description = config.story.description || `${charName} finds themselves in ${setting}. Explore each room, find items, solve puzzles, and uncover the truth.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)} — BellForge Preview</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:100%; height:100%; overflow:hidden; background:${palette.bg}; font-family:'Segoe UI',system-ui,sans-serif; }
canvas { display:block; width:100%; height:100%; touch-action:none; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function(){
"use strict";
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ── Config ──
const PALETTE = ${JSON.stringify(palette)};
const ROOMS = ${JSON.stringify(rooms)};
const ROOM_COUNT = ${roomCount};
const TITLE = ${JSON.stringify(title)};
const CHAR_NAME = ${JSON.stringify(charName)};
const SETTING = ${JSON.stringify(setting)};
const DESCRIPTION = ${JSON.stringify(description)};
const GENRE = ${JSON.stringify(config.genre.id)};
const DIFFICULTY = ${JSON.stringify(config.structure.difficulty)};
const SEED = ${seed};

// ── Seeded PRNG (Mulberry32) — same seed = same game, different seed = different game ──
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
function seededInt(max) { return Math.floor(rng() * max); }
function seededFloat(min, max) { return min + rng() * (max - min); }

// ── State ──
let W = 0, H = 0;
let currentRoom = -1; // -1 = title screen
let inventory = [];
let foundItems = new Set();
let examineText = '';
let examineTimer = 0;
let doorAnim = 0;
let bagOpen = false;

// Items per room (procedurally placed with seeded RNG)
const ITEMS = ['Key', 'Gem', 'Note', 'Coin', 'Map', 'Lens', 'Ring', 'Skull', 'Candle', 'Feather', 'Compass', 'Vial', 'Gear', 'Locket', 'Scroll', 'Dagger', 'Orb', 'Fossil', 'Mirror', 'Bell'];
// Shuffle items with RNG so each build gets different items in different rooms
const shuffledItems = [...ITEMS].sort(() => rng() - 0.5);
const roomItems = ROOMS.map((_, i) => {
  const itemIdx = i % shuffledItems.length;
  return { name: shuffledItems[itemIdx], x: seededFloat(0.15, 0.75), y: seededFloat(0.45, 0.70) };
});

// Pre-compute wall texture rectangles per room (seeded)
const wallTextures = ROOMS.map(() => {
  const count = 3 + seededInt(5); // 3-7 textures per room
  const rects = [];
  for (let i = 0; i < count; i++) {
    rects.push({ x: seededFloat(0.06, 0.80), y: seededFloat(0.08, 0.55), w: seededFloat(0.06, 0.18), h: seededFloat(0.04, 0.12) });
  }
  return rects;
});

// Title screen decoration line positions (seeded)
const titleDecoCount = 5 + seededInt(6); // 5-10 lines
const titleDecoLines = [];
for (let i = 0; i < titleDecoCount; i++) { titleDecoLines.push(seededFloat(0.05, 0.95)); }

// Hotspot areas per room (doors + item)
function getHotspots(ri) {
  const spots = [];
  // Item hotspot (if not picked up)
  if (!foundItems.has(ri)) {
    const it = roomItems[ri];
    spots.push({ type:'item', x:it.x-0.04, y:it.y-0.04, w:0.08, h:0.08, room:ri });
  }
  // Left door
  if (ri > 0) spots.push({ type:'door', x:0.0, y:0.3, w:0.08, h:0.35, target:ri-1 });
  // Right door
  if (ri < ROOM_COUNT-1) spots.push({ type:'door', x:0.92, y:0.3, w:0.08, h:0.35, target:ri+1 });
  // Examine floor
  spots.push({ type:'examine', x:0.2, y:0.85, w:0.6, h:0.12, text: getExamineText(ri) });
  return spots;
}

// Expanded examine text pool — shuffled once at init by seeded RNG
const EXAMINE_POOL = [
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
  'You notice faint scratch marks on the wall.',
  'A distant melody drifts through the air.',
  'The temperature drops suddenly.',
  'Faded writing covers the far wall.',
  'Everything here feels... watched.',
  'The scent of something old and forgotten lingers.',
  'A floorboard shifts beneath your weight.',
  'There are footprints in the dust — not yours.',
  'Light bends strangely in this corner.',
  'You feel a draft from somewhere you cannot see.',
].sort(() => rng() - 0.5);

function getExamineText(ri) {
  return EXAMINE_POOL[ri % EXAMINE_POOL.length];
}

// ── Resize ──
function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ── Drawing Helpers ──
function nx(v) { return v * W; }
function ny(v) { return v * H; }

function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(nx(x), ny(y), nx(w), ny(h));
}

function drawText(text, x, y, size, color, align) {
  ctx.fillStyle = color;
  ctx.font = (size * H / 800) + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, nx(x), ny(y));
}

function drawTextBold(text, x, y, size, color, align) {
  ctx.fillStyle = color;
  ctx.font = 'bold ' + (size * H / 800) + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, nx(x), ny(y));
}

function roundRect(x, y, w, h, r, fill, stroke) {
  const rx = nx(x), ry = ny(y), rw = nx(w), rh = ny(h), rr = Math.min(r, rw/2, rh/2);
  ctx.beginPath();
  ctx.moveTo(rx+rr, ry);
  ctx.arcTo(rx+rw, ry, rx+rw, ry+rh, rr);
  ctx.arcTo(rx+rw, ry+rh, rx, ry+rh, rr);
  ctx.arcTo(rx, ry+rh, rx, ry, rr);
  ctx.arcTo(rx, ry, rx+rw, ry, rr);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

// ── Draw Title Screen ──
function drawTitle() {
  // Background gradient
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, PALETTE.bg);
  grd.addColorStop(0.5, PALETTE.wall);
  grd.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // Decorative lines (seeded positions)
  ctx.strokeStyle = PALETTE.accent + '40';
  ctx.lineWidth = 1;
  for (let i = 0; i < titleDecoLines.length; i++) {
    const y = H * titleDecoLines[i];
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Title
  drawTextBold(TITLE, 0.5, 0.22, 42, PALETTE.accent);
  drawText(CHAR_NAME + "'s Adventure", 0.5, 0.32, 20, PALETTE.text + 'cc');

  // Description box
  roundRect(0.08, 0.40, 0.84, 0.22, 12, PALETTE.wall + 'cc', PALETTE.accent + '60');
  wrapText(DESCRIPTION, 0.5, 0.45, 16, PALETTE.text, 0.76);

  // Room count info
  drawText(ROOM_COUNT + ' rooms to explore', 0.5, 0.70, 18, PALETTE.text + 'aa');

  // Start button
  roundRect(0.25, 0.78, 0.5, 0.08, 20, PALETTE.accent, null);
  drawTextBold('TAP TO BEGIN', 0.5, 0.82, 22, PALETTE.bg);

  // BellForge credit
  drawText('Built with BellForge', 0.5, 0.95, 12, PALETTE.text + '60');
}

function wrapText(text, cx, startY, size, color, maxW) {
  ctx.fillStyle = color;
  const fontSize = size * H / 800;
  ctx.font = fontSize + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  const words = text.split(' ');
  let line = '';
  let y = ny(startY);
  const lineH = fontSize * 1.4;
  const mw = nx(maxW);
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > mw && line) {
      ctx.fillText(line, nx(cx), y);
      line = word;
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, nx(cx), y);
}

// ── Draw Room ──
function drawRoom(ri) {

  // Background
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);

  // Walls
  fillRect(0, 0, 1, 0.05, PALETTE.wall);    // ceiling
  fillRect(0, 0, 0.03, 1, PALETTE.wall);     // left wall
  fillRect(0.97, 0, 0.03, 1, PALETTE.wall);  // right wall
  fillRect(0, 0.88, 1, 0.12, PALETTE.floor); // floor

  // Wall textures (unique per room via seeded positions computed at init)
  ctx.globalAlpha = 0.15;
  const wt = wallTextures[ri];
  for (let i = 0; i < wt.length; i++) {
    fillRect(wt[i].x, wt[i].y, wt[i].w, wt[i].h, PALETTE.accent);
  }
  ctx.globalAlpha = 1;

  // Window or painting
  roundRect(0.35, 0.10, 0.30, 0.20, 6, PALETTE.wall, PALETTE.accent + '80');
  fillRect(0.36, 0.11, 0.28, 0.18, PALETTE.bg + 'aa');
  drawText('~', 0.5, 0.20, 40, PALETTE.accent + '30');

  // Left door (if not first room)
  if (ri > 0) {
    roundRect(0.03, 0.35, 0.06, 0.30, 4, PALETTE.accent + '30', PALETTE.accent);
    drawText('<', 0.06, 0.50, 24, PALETTE.accent);
  }

  // Right door (if not last room)
  if (ri < ROOM_COUNT - 1) {
    roundRect(0.91, 0.35, 0.06, 0.30, 4, PALETTE.accent + '30', PALETTE.accent);
    drawText('>', 0.94, 0.50, 24, PALETTE.accent);
  }

  // Item on floor (if not picked up)
  if (!foundItems.has(ri)) {
    const it = roomItems[ri];
    // Glow
    ctx.save();
    ctx.shadowColor = PALETTE.accent;
    ctx.shadowBlur = 15;
    roundRect(it.x - 0.03, it.y - 0.03, 0.06, 0.06, 8, PALETTE.accent + '40', PALETTE.accent);
    ctx.restore();
    drawTextBold(getItemEmoji(it.name), it.x, it.y, 28, '#fff');
  }

  // Floor pattern
  ctx.globalAlpha = 0.1;
  for (let x = 0.05; x < 0.95; x += 0.1) {
    fillRect(x, 0.89, 0.08, 0.005, PALETTE.accent);
  }
  ctx.globalAlpha = 1;

  // HUD - Room name
  roundRect(0.15, 0.01, 0.70, 0.04, 8, PALETTE.bg + 'dd', null);
  drawTextBold(ROOMS[ri], 0.5, 0.03, 16, PALETTE.accent);

  // HUD - Room counter
  drawText((ri+1) + ' / ' + ROOM_COUNT, 0.5, 0.935, 14, PALETTE.text + '88');

  // Bag icon
  const bagX = 0.88, bagY = 0.90;
  roundRect(bagX - 0.04, bagY - 0.03, 0.08, 0.06, 10, PALETTE.wall, PALETTE.accent);
  drawText('🎒', bagX, bagY, 22, '#fff');
  if (inventory.length > 0) {
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(nx(bagX + 0.03), ny(bagY - 0.02), 10, 0, Math.PI * 2);
    ctx.fill();
    drawTextBold(String(inventory.length), bagX + 0.03, bagY - 0.02, 11, '#fff');
  }

  // Inventory slide-out
  if (bagOpen && inventory.length > 0) {
    const iw = Math.min(inventory.length, 5) * 0.09 + 0.04;
    roundRect(bagX - iw, bagY - 0.06, iw, 0.06, 8, PALETTE.bg + 'ee', PALETTE.accent + '80');
    inventory.forEach((item, idx) => {
      const ix = bagX - iw + 0.04 + idx * 0.09;
      drawText(getItemEmoji(item), ix, bagY - 0.03, 20, '#fff');
    });
  }

  // Examine text toast
  if (examineText && examineTimer > 0) {
    const alpha = Math.min(1, examineTimer / 30).toFixed(2);
    roundRect(0.08, 0.72, 0.84, 0.10, 10, PALETTE.bg + 'ee', PALETTE.accent + (Math.floor(parseFloat(alpha)*255)).toString(16).padStart(2,'0'));
    drawText(examineText, 0.5, 0.77, 15, PALETTE.text);
  }
}

function getItemEmoji(name) {
  const map = { Key:'🔑', Gem:'💎', Note:'📜', Coin:'🪙', Map:'🗺️', Lens:'🔍', Ring:'💍', Skull:'💀', Candle:'🕯️', Feather:'🪶', Compass:'🧭', Vial:'🧪', Gear:'⚙️', Locket:'📿', Scroll:'📋', Dagger:'🗡️', Orb:'🔮', Fossil:'🦴', Mirror:'🪞', Bell:'🔔' };
  return map[name] || '📦';
}

// ── Input ──
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;

  if (currentRoom === -1) {
    // Title screen — tap anywhere to start
    currentRoom = 0;
    return;
  }

  // Check bag tap
  if (px > 0.84 && px < 0.92 && py > 0.87 && py < 0.96) {
    bagOpen = !bagOpen;
    return;
  }

  // Close bag if open and tapped elsewhere
  if (bagOpen) { bagOpen = false; return; }

  // Check hotspots
  const spots = getHotspots(currentRoom);
  for (const s of spots) {
    if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) {
      if (s.type === 'door') {
        currentRoom = s.target;
        examineText = '';
        examineTimer = 0;
      } else if (s.type === 'item') {
        const item = roomItems[s.room];
        inventory.push(item.name);
        foundItems.add(s.room);
        examineText = 'Found: ' + item.name + '!';
        examineTimer = 120;
      } else if (s.type === 'examine') {
        examineText = s.text;
        examineTimer = 120;
      }
      return;
    }
  }
});

// ── Game Loop ──
function frame() {
  resize();
  if (currentRoom === -1) {
    drawTitle();
  } else {
    drawRoom(currentRoom);
  }
  if (examineTimer > 0) examineTimer--;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

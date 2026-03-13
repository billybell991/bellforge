import type { CreativeBrief, CreativeRoom, RoomFurniture } from '../gemini.js';
import type { EngineData } from './engines/shared.js';
import { generatePointClickHtml } from './engines/point-click.js';
import { generatePlatformerHtml } from './engines/platformer.js';
import { generateVisualNovelHtml } from './engines/visual-novel.js';
import { generatePuzzleHtml } from './engines/puzzle.js';
import { generateHiddenObjectHtml } from './engines/hidden-object.js';
import { generateDismantleHtml } from './engines/dismantle.js';

export interface GameImages {
  titleBg: string | null;
  roomBgs: Array<string | null>;
  character: string | null;
  itemImages: Array<string | null>;
  packIcon: string | null;
}

interface PreviewConfig {
  genre: { id: string; name: string };
  theme: { id: string; name: string; color?: string };
  artStyle: { id: string; name: string };
  structure: { roomCount: number; difficulty: string; puzzleDensity: string };
  story: { title: string; description: string; characterName: string; setting: string };
  seed: number;
  creative: CreativeBrief;
  images: GameImages;
  sceneLabel?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEngineData(config: PreviewConfig): EngineData {
  const c = config.creative;
  const images = config.images;
  const rooms = c.rooms;
  const roomCount = config.structure.roomCount;
  const seed = config.seed;
  const title = config.story.title || 'Untitled Game';
  const charName = config.story.characterName || 'Protagonist';
  const sceneLabel = config.sceneLabel || 'rooms';

  // Themed start button text
  const THEMED_BUTTONS: Record<string, string[]> = {
    horror: ['Enter If You Dare', 'Face Your Fear', 'Step Into Darkness', 'Descend'],
    fantasy: ['Begin Your Quest', 'Enter the Realm', 'Draw Your Sword', 'Adventure Awaits'],
    scifi: ['Initiate Sequence', 'Launch Mission', 'Engage', 'Step Aboard'],
    mystery: ['Open the Case', 'Begin Investigation', 'Follow the Trail', 'Examine'],
    cozy: ['Come On In', 'Begin Your Day', 'Step Inside', 'Settle In'],
    cyberpunk: ['Jack In', 'Go Online', 'Enter the Grid', 'Connect'],
    steampunk: ['Pull the Lever', 'Engage the Engine', 'Wind the Key', 'Full Steam Ahead'],
    postapoc: ['Brave the Wasteland', 'Venture Out', 'Begin Survival', 'Emerge'],
  };
  const themeButtons = THEMED_BUTTONS[config.theme.id] || ['Begin', 'Enter', 'Start', 'Play'];
  const startButtonText = themeButtons[seed % themeButtons.length];

  // Serialize room data
  const roomsData = rooms.map((r: CreativeRoom) => ({
    name: r.name,
    description: r.description,
    examineText: r.examineText,
    atmosphere: r.atmosphere,
    wallColor: r.wallColor || c.palette.wall,
    floorColor: r.floorColor || c.palette.floor,
    ceilingColor: r.ceilingColor || c.palette.wall,
    furniture: (r.furniture || []).map((f: RoomFurniture) => ({
      type: f.type, x: f.x, y: f.y, w: f.w, h: f.h,
      color: f.color, label: f.label
    })),
    hasWindow: r.hasWindow !== false,
    windowType: r.windowType || 'tall',
    lightingDir: r.lightingDir || 'center',
  }));

  // Build image data URIs
  const titleBgUri = images.titleBg ? `data:image/png;base64,${images.titleBg}` : '';
  const characterUri = images.character ? `data:image/png;base64,${images.character}` : '';
  const packIconUri = images.packIcon ? `data:image/png;base64,${images.packIcon}` : '';
  const roomBgUris = images.roomBgs.map(b => b ? `data:image/png;base64,${b}` : '');
  const itemImageUris = images.itemImages.map(b => b ? `data:image/png;base64,${b}` : '');

  return {
    palette: JSON.stringify(c.palette),
    rooms: JSON.stringify(roomsData),
    roomCount,
    title: escapeHtml(title),
    charName,
    gameVibe: c.gameVibe,
    sceneLabel,
    startButtonText,
    items: JSON.stringify(c.items),
    puzzles: JSON.stringify(c.puzzles),
    hints: JSON.stringify(c.hintTexts),
    openingText: c.openingText,
    endingText: c.endingText,
    seed,
    titleBgUri,
    characterUri,
    packIconUri,
    roomBgUris: JSON.stringify(roomBgUris),
    itemImageUris: JSON.stringify(itemImageUris),
  };
}

export function generatePreviewHtml(config: PreviewConfig): string {
  const data = buildEngineData(config);
  const genre = config.genre.id;

  switch (genre) {
    case 'platformer':
      return generatePlatformerHtml(data);
    case 'visual_novel':
      return generateVisualNovelHtml(data, false);
    case 'interactive_fiction':
      return generateVisualNovelHtml(data, true);
    case 'puzzle':
      return generatePuzzleHtml(data);
    case 'hidden_object':
      return generateHiddenObjectHtml(data);
    case 'dismantle':
      return generateDismantleHtml(data);
    case 'point_click':
    case 'escape_room':
    default:
      return generatePointClickHtml(data);
  }
}

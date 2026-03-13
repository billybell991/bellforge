// ── Pipeline shared types ──

export interface GameConfig {
  genre: { id: string; name: string };
  theme: { id: string; name: string };
  artStyle: { id: string; name: string };
  structure: { roomCount: number; difficulty: string; puzzleDensity: string };
  story: { title: string; description: string; characterName: string; setting: string };
}

export interface AdventureConfig {
  cyoaGenre: { id: string; name: string };
  theme: { id: string; name: string };
  artStyle: { id: string; name: string };
  structure: { pageCount: number; deadliness: string; branchDensity: string };
  story: { title: string; description: string; characterName: string; setting: string };
}

export interface ComicConfig {
  comicGenre: { id: string; name: string };
  theme: { id: string; name: string };
  artStyle: { id: string; name: string };
  structure: { pageCount: number; panelStyle: string; tone: string };
  story: { title: string; description: string; characterName: string; setting: string };
}

export interface PipelineContext {
  buildId: string;
  config: GameConfig;
  projectDir: string;
  appDir: string;
  srcDir: string;
  resDir: string;
  packageName: string;
  safeName: string;
  apkPath: string;
  sendProgress: (stage: string, name: string, percent: number, detail: string) => void;
}

// Genre ↔ unit label mapping (matches client)
export function getUnitLabel(genreId: string): string {
  switch (genreId) {
    case 'visual_novel': return 'Chapters';
    case 'interactive_fiction': return 'Passages';
    case 'hidden_object': return 'Scenes';
    case 'platformer':
    case 'puzzle': return 'Levels';
    case 'dismantle': return 'Devices';
    default: return 'Rooms';
  }
}

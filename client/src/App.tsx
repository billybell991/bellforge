import { useState, useCallback, useRef } from 'react';
import type { AppPage, GameConfig, GenreOption, ThemeOption, ArtStyleOption, StructureConfig, StoryConfig, LibraryEntry } from './types';
import { GENRES, THEMES, ART_STYLES } from './types';
import { Landing } from './components/Landing';
import { WizardContainer } from './components/WizardContainer';
import { BuildProgress } from './components/BuildProgress';
import { GamePreview } from './components/GamePreview';
import { DeployGuide } from './components/DeployGuide';
import { Library } from './components/Library';
import { EmberField } from './components/EmberField';

const defaultStructure: StructureConfig = {
  roomCount: 6,
  difficulty: 'standard',
  puzzleDensity: 'moderate',
};

const defaultStory: StoryConfig = {
  title: '',
  description: '',
  characterName: '',
  setting: '',
};

export default function App() {
  const [page, setPage] = useState<AppPage>('landing');
  const [genre, setGenre] = useState<GenreOption | null>(null);
  const [theme, setTheme] = useState<ThemeOption | null>(null);
  const [artStyle, setArtStyle] = useState<ArtStyleOption | null>(null);
  const [structure, setStructure] = useState<StructureConfig>(defaultStructure);
  const [story, setStory] = useState<StoryConfig>(defaultStory);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [apkInfo, setApkInfo] = useState<{ path: string; size: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoForging, setAutoForging] = useState(false);
  const wsDisconnectRef = useRef<(() => void) | null>(null);

  const config: GameConfig | null =
    genre && theme && artStyle
      ? { genre, theme, artStyle, structure, story }
      : null;

  const handleStartForging = useCallback(() => setPage('wizard'), []);

  const handleAutoForge = useCallback(async () => {
    setAutoForging(true);
    try {
      const res = await fetch('/api/gemini/auto-config', { method: 'POST' });
      const data = await res.json();
      const ac = data.config;

      // Look up full objects from our type arrays
      const g = GENRES.find((x) => x.id === ac.genreId) || GENRES[0];
      const t = THEMES.find((x) => x.id === ac.themeId) || THEMES[0];
      const a = ART_STYLES.find((x) => x.id === ac.artStyleId) || ART_STYLES[0];

      setGenre(g);
      setTheme(t);
      setArtStyle(a);
      setStructure(ac.structure);
      setStory(ac.story);
      setPage('wizard'); // Goes to wizard at 'review' step via autoForge flag
    } catch {
      // No server — use client-side random auto-config for demo mode
      const g = GENRES[Math.floor(Math.random() * GENRES.length)];
      const t = THEMES[Math.floor(Math.random() * THEMES.length)];
      const a = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
      setGenre(g);
      setTheme(t);
      setArtStyle(a);
      setStructure({ roomCount: 4 + Math.floor(Math.random() * 9), difficulty: 'standard', puzzleDensity: 'moderate' });
      setStory({ title: 'Auto-Forged Adventure', description: 'A surprise game crafted by the forge.', characterName: 'The Explorer', setting: 'A mysterious realm' });
      setPage('wizard');
    } finally {
      setAutoForging(false);
    }
  }, []);

  const handleForgeIt = useCallback(async () => {
    if (!config) return;

    try {
      const res = await fetch('/api/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setBuildId(data.buildId);
      setPage('building');
    } catch {
      alert('The forge server is not running here — this is a static demo.\n\nTo forge real games, clone the repo and run it locally:\n  git clone → npm run install:all → npm run dev');
    }
  }, [config]);

  const handleBuildComplete = useCallback((apkPath: string, apkSize: string, previewUrlPath: string) => {
    setApkInfo({ path: apkPath, size: apkSize });
    setPreviewUrl(previewUrlPath);
    setPage('preview');
  }, []);

  const handleGoToDeploy = useCallback(() => {
    setPage('deploy');
  }, []);

  const handleGoToLibrary = useCallback(() => {
    setPage('library');
  }, []);

  const handleViewFromLibrary = useCallback((entry: LibraryEntry) => {
    // Restore the preview for a library entry
    const c = entry.config;
    setGenre(c.genre);
    setTheme(c.theme);
    setArtStyle(c.artStyle);
    setStructure(c.structure);
    setStory(c.story);
    setBuildId(entry.buildId);
    setApkInfo({ path: '', size: entry.apkSize });
    setPreviewUrl(`/api/preview/${entry.buildId}`);
    setPage('preview');
  }, []);

  const handleStartOver = useCallback(() => {
    wsDisconnectRef.current?.();
    setPage('landing');
    setGenre(null);
    setTheme(null);
    setArtStyle(null);
    setStructure(defaultStructure);
    setStory(defaultStory);
    setBuildId(null);
    setApkInfo(null);
    setPreviewUrl(null);
  }, []);

  const showHeader = page !== 'landing';

  return (
    <div className="app-shell">
      <EmberField />

      {showHeader && (
        <header className="forge-header">
          <div className="forge-header-brand" onClick={handleStartOver}>
            <span>⚒️</span> BELLFORGE
          </div>
          <div className="forge-header-right">
            <button className="forge-header-library" onClick={handleGoToLibrary}>
              📚 Library
            </button>
            <div className="forge-header-version">v1.0.0</div>
          </div>
        </header>
      )}

      <div className={showHeader ? 'has-header' : ''}>
        {page === 'landing' && (
          <Landing onStart={handleStartForging} onAutoForge={handleAutoForge} onLibrary={handleGoToLibrary} />
        )}
        {autoForging && (
          <div className="auto-forge-overlay">
            <div className="auto-forge-spinner" />
            <p className="auto-forge-text">🤖 Gemini is crafting your game...</p>
          </div>
        )}

        {page === 'wizard' && (
          <WizardContainer
            genre={genre}
            theme={theme}
            artStyle={artStyle}
            structure={structure}
            story={story}
            onGenreChange={setGenre}
            onThemeChange={setTheme}
            onArtStyleChange={setArtStyle}
            onStructureChange={setStructure}
            onStoryChange={setStory}
            onForge={handleForgeIt}
            onBack={() => setPage('landing')}
          />
        )}

        {page === 'building' && buildId && (
          <BuildProgress
            buildId={buildId}
            onComplete={handleBuildComplete}
            onWsDisconnect={(fn: () => void) => { wsDisconnectRef.current = fn; }}
          />
        )}

        {page === 'preview' && apkInfo && previewUrl && genre && (
          <GamePreview
            previewUrl={previewUrl}
            apkPath={apkInfo.path}
            apkSize={apkInfo.size}
            orientation={genre.orientation}
            buildId={buildId}
            onDeploy={handleGoToDeploy}
            onStartOver={handleStartOver}
          />
        )}

        {page === 'deploy' && apkInfo && (
          <DeployGuide
            apkPath={apkInfo.path}
            apkSize={apkInfo.size}
            buildId={buildId!}
            onStartOver={handleStartOver}
          />
        )}

        {page === 'library' && (
          <Library
            onBack={() => setPage('landing')}
            onViewPreview={handleViewFromLibrary}
          />
        )}
      </div>
    </div>
  );
}

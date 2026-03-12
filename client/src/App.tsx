import { useState, useCallback, useEffect, useRef } from 'react';
import type { AppPage, GameConfig, GenreOption, ThemeOption, ArtStyleOption, StructureConfig, StoryConfig, LibraryEntry, WSProgressMessage, WSCompleteMessage } from './types';
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

// ── Build log entry for the progress display ──
interface BuildLogEntry {
  name: string;
  percent: number;
  done: boolean;
}

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
  const [autoForgePercent, setAutoForgePercent] = useState(0);
  const [autoForgeStep, setAutoForgeStep] = useState('Warming up the forge...');
  const [autoForgeDetail, setAutoForgeDetail] = useState('');

  // ── Lifted build progress state (survives page navigation) ──
  const [buildPercent, setBuildPercent] = useState(0);
  const [buildStageName, setBuildStageName] = useState('Connecting to forge...');
  const [buildDetail, setBuildDetail] = useState('');
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildLog, setBuildLog] = useState<BuildLogEntry[]>([]);
  const [buildActive, setBuildActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const buildCompletedRef = useRef(false);
  // Track what page we came from when navigating away from build
  const preNavPageRef = useRef<AppPage | null>(null);

  const config: GameConfig | null =
    genre && theme && artStyle
      ? { genre, theme, artStyle, structure, story }
      : null;

  // ── WebSocket management (lives at App level, survives page changes) ──
  const connectWs = useCallback((id: string) => {
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws?buildId=${encodeURIComponent(id)}`);

    ws.onopen = () => {
      setBuildActive(true);
    };

    ws.onclose = () => {
      // Don't clear buildActive — the build may still be running server-side
      // We'll clear it only when we get 'complete' or 'error', or on explicit reset
    };

    ws.onerror = () => {
      // Will trigger onclose
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          const msg = data as WSProgressMessage;
          setBuildPercent(msg.percent);
          setBuildStageName(msg.name);
          setBuildDetail(msg.detail);
          setBuildLog((prev) => {
            const updated = prev.map((e) => ({ ...e, done: true }));
            return [...updated, { name: msg.name, percent: msg.percent, done: false }];
          });
        }

        if (data.type === 'complete' && !buildCompletedRef.current) {
          buildCompletedRef.current = true;
          const msg = data as WSCompleteMessage;
          setBuildPercent(100);
          setBuildStageName('Build Complete!');
          setBuildDetail('Your game is ready to deploy!');
          setBuildLog((prev) => prev.map((e) => ({ ...e, done: true })));
          setBuildActive(false);

          // Set result info
          setApkInfo({ path: msg.apkPath, size: msg.apkSize });
          setPreviewUrl(msg.previewUrl);

          // Navigate to preview after a brief pause
          setTimeout(() => {
            setPage('preview');
          }, 1500);
        }

        if (data.type === 'error') {
          setBuildError(data.message);
          setBuildStageName('Build Failed');
          setBuildDetail(data.message);
          setBuildActive(false);
        }
      } catch {
        // ignore malformed messages
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleStartForging = useCallback(() => setPage('wizard'), []);

  const handleAutoForge = useCallback(async () => {
    setAutoForging(true);
    setAutoForgePercent(0);
    setAutoForgeStep('Warming up the forge...');
    setAutoForgeDetail('');

    try {
      const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const evtSource = new EventSource('/api/gemini/auto-config/stream');

        evtSource.addEventListener('progress', (e) => {
          const d = JSON.parse(e.data);
          setAutoForgePercent(d.percent);
          setAutoForgeStep(d.step);
          setAutoForgeDetail(d.detail);
        });

        evtSource.addEventListener('complete', (e) => {
          const d = JSON.parse(e.data);
          setAutoForgePercent(100);
          setAutoForgeStep('\u2728 Configuration ready!');
          setAutoForgeDetail('');
          evtSource.close();
          resolve(d);
        });

        evtSource.addEventListener('error', (e) => {
          evtSource.close();
          // Check if it's an SSE error event with data
          const me = e as MessageEvent;
          if (me.data) {
            try { reject(new Error(JSON.parse(me.data).message)); } catch { reject(new Error('Stream failed')); }
          } else {
            reject(new Error('Connection lost'));
          }
        });

        evtSource.onerror = () => {
          evtSource.close();
          reject(new Error('Connection lost'));
        };
      });

      const ac = result.config as Record<string, unknown>;
      const g = GENRES.find((x) => x.id === (ac.genreId as string)) || GENRES[0];
      const t = THEMES.find((x) => x.id === (ac.themeId as string)) || THEMES[0];
      const a = ART_STYLES.find((x) => x.id === (ac.artStyleId as string)) || ART_STYLES[0];

      setGenre(g);
      setTheme(t);
      setArtStyle(a);
      setStructure(ac.structure as StructureConfig);
      setStory(ac.story as StoryConfig);
      setPage('wizard');
    } catch {
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
      const newBuildId = data.buildId;

      // Reset build state for fresh build
      setBuildId(newBuildId);
      setBuildPercent(0);
      setBuildStageName('Connecting to forge...');
      setBuildDetail('');
      setBuildError(null);
      setBuildLog([]);
      setBuildActive(true);
      buildCompletedRef.current = false;

      // Connect WS and navigate to build screen
      connectWs(newBuildId);
      setPage('building');
    } catch {
      alert('The forge server is not running here — this is a static demo.\n\nTo forge real games, clone the repo and run it locally:\n  git clone → npm run install:all → npm run dev');
    }
  }, [config, connectWs]);

  const handleBuildComplete = useCallback((apkPath: string, apkSize: string, previewUrlPath: string) => {
    setApkInfo({ path: apkPath, size: apkSize });
    setPreviewUrl(previewUrlPath);
    setPage('preview');
  }, []);

  const handleGoToDeploy = useCallback(() => {
    setPage('deploy');
  }, []);

  const handleGoToLibrary = useCallback(() => {
    // If build is in progress, remember we came from building
    if (page === 'building') {
      preNavPageRef.current = 'building';
    }
    setPage('library');
  }, [page]);

  const handleViewFromLibrary = useCallback((entry: LibraryEntry) => {
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
    disconnectWs();
    setBuildActive(false);
    buildCompletedRef.current = false;
    setBuildId(null);
    setBuildPercent(0);
    setBuildStageName('Connecting to forge...');
    setBuildDetail('');
    setBuildError(null);
    setBuildLog([]);
    preNavPageRef.current = null;
    setPage('landing');
    setGenre(null);
    setTheme(null);
    setArtStyle(null);
    setStructure(defaultStructure);
    setStory(defaultStory);
    setApkInfo(null);
    setPreviewUrl(null);
  }, [disconnectWs]);

  // When navigating back from library while build was active, reconnect WS
  const handleLibraryBack = useCallback(() => {
    if (buildActive && buildId) {
      // Reconnect to the running build
      connectWs(buildId);
      setPage('building');
      preNavPageRef.current = null;
    } else if (preNavPageRef.current === 'building' && buildId) {
      connectWs(buildId);
      setPage('building');
      preNavPageRef.current = null;
    } else {
      setPage('landing');
    }
  }, [buildActive, buildId, connectWs]);

  // Clicking the "build in progress" indicator in the header
  const handleReturnToBuild = useCallback(() => {
    if (buildId) {
      // Reconnect WS if not connected (in case we navigated away)
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWs(buildId);
      }
      setPage('building');
    }
  }, [buildId, connectWs]);

  // Clean up WS on unmount
  useEffect(() => {
    return () => disconnectWs();
  }, [disconnectWs]);

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
            {/* Build-in-progress indicator */}
            {buildActive && page !== 'building' && (
              <button
                className="forge-header-building"
                onClick={handleReturnToBuild}
                title="Return to build in progress"
              >
                <span className="build-pulse" />
                ⚒️ Building {buildPercent}%
              </button>
            )}
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
            <div className="auto-forge-percent">{autoForgePercent}%</div>
            <div className="auto-forge-bar-track">
              <div className="auto-forge-bar-fill" style={{ width: `${autoForgePercent}%` }} />
            </div>
            <p className="auto-forge-step">{autoForgeStep}</p>
            {autoForgeDetail && <p className="auto-forge-detail">{autoForgeDetail}</p>}
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
            percent={buildPercent}
            stageName={buildStageName}
            detail={buildDetail}
            error={buildError}
            log={buildLog}
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
            onBack={handleLibraryBack}
            onViewPreview={handleViewFromLibrary}
          />
        )}
      </div>
    </div>
  );
}

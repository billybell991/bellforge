import { useState, useCallback, useEffect, useRef } from 'react';
import type { AppPage, GameConfig, AdventureConfig, ComicConfig, EscapeConfig, PuzzleConfig, EntertainmentType, GenreOption, ThemeOption, ArtStyleOption, StructureConfig, StoryConfig, CYOAGenreOption, CYOAStructureConfig, ComicGenreOption, ComicStructureConfig, EscapeThemeOption, EscapeStructureConfig, PuzzleSubjectOption, PuzzleStructureConfig, LibraryEntry, WSProgressMessage, WSCompleteMessage, QAReport } from './types';
import { GENRES, THEMES, ART_STYLES, CYOA_GENRES, COMIC_GENRES, ESCAPE_THEMES, PUZZLE_SUBJECTS } from './types';
import { Landing } from './components/Landing';
import { WizardContainer } from './components/WizardContainer';
import { CYOAWizardContainer } from './components/CYOAWizardContainer';
import { ComicWizardContainer } from './components/ComicWizardContainer';
import { EscapeWizardContainer } from './components/EscapeWizardContainer';
import { PuzzleWizardContainer } from './components/PuzzleWizardContainer';
import { BuildProgress } from './components/BuildProgress';
import { GamePreview } from './components/GamePreview';
import { DeployGuide } from './components/DeployGuide';
import { Library } from './components/Library';
import { EmberField } from './components/EmberField';
import { DebugButton } from './components/DebugButton';

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

const defaultCYOAStructure: CYOAStructureConfig = {
  pageCount: 28,
  deadliness: 'medium',
  branchDensity: 'forking',
};

const defaultComicStructure: ComicStructureConfig = {
  pageCount: 10,
  panelStyle: 'classic',
  tone: 'action',
};

const defaultEscapeStructure: EscapeStructureConfig = {
  envelopeCount: 4,
  difficulty: 'standard',
  duration: 45,
};

const defaultPuzzleStructure: PuzzleStructureConfig = {
  pieceCount: 25,
  difficulty: 'medium',
  rotation: false,
};

// ── Build log entry for the progress display ──
interface BuildLogEntry {
  name: string;
  percent: number;
  done: boolean;
}

export default function App() {
  const [page, setPage] = useState<AppPage>('landing');
  const [entertainmentType, setEntertainmentType] = useState<EntertainmentType>('game');
  const [genre, setGenre] = useState<GenreOption | null>(null);
  const [theme, setTheme] = useState<ThemeOption | null>(null);
  const [artStyle, setArtStyle] = useState<ArtStyleOption | null>(null);
  const [structure, setStructure] = useState<StructureConfig>(defaultStructure);
  const [story, setStory] = useState<StoryConfig>(defaultStory);
  // CYOA-specific state
  const [cyoaGenre, setCyoaGenre] = useState<CYOAGenreOption | null>(null);
  const [cyoaStructure, setCyoaStructure] = useState<CYOAStructureConfig>(defaultCYOAStructure);
  // Comic-specific state
  const [comicGenre, setComicGenre] = useState<ComicGenreOption | null>(null);
  const [comicStructure, setComicStructure] = useState<ComicStructureConfig>(defaultComicStructure);
  // Escape-specific state
  const [escapeTheme, setEscapeTheme] = useState<EscapeThemeOption | null>(null);
  const [escapeStructure, setEscapeStructure] = useState<EscapeStructureConfig>(defaultEscapeStructure);
  // Puzzle-specific state
  const [puzzleSubject, setPuzzleSubject] = useState<PuzzleSubjectOption | null>(null);
  const [puzzleStructure, setPuzzleStructure] = useState<PuzzleStructureConfig>(defaultPuzzleStructure);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [apkInfo, setApkInfo] = useState<{ path: string; size: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [autoForging, setAutoForging] = useState(false);
  const [autoForgePercent, setAutoForgePercent] = useState(0);
  const [autoForgeStep, setAutoForgeStep] = useState('Warming up the forge...');
  const [autoForgeDetail, setAutoForgeDetail] = useState('');

  // ── Lifted build progress state (survives page navigation) ──
  const [buildPercent, setBuildPercent] = useState(0);
  const [buildStageName, setBuildStageName] = useState('Stoking the forge...');
  const [buildDetail, setBuildDetail] = useState('');
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildLog, setBuildLog] = useState<BuildLogEntry[]>([]);
  const [buildActive, setBuildActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const buildCompletedRef = useRef(false);
  // Track what page we came from when navigating away from build
  const preNavPageRef = useRef<AppPage | null>(null);

  // Library count for badge display
  const [libraryCount, setLibraryCount] = useState(0);
  // Library as modal overlay (never interrupts what's behind it)
  const [showLibrary, setShowLibrary] = useState(false);

  const config: GameConfig | null =
    genre && theme && artStyle
      ? { genre, theme, artStyle, structure, story }
      : null;

  const adventureConfig: AdventureConfig | null =
    cyoaGenre && theme && artStyle
      ? { cyoaGenre, theme, artStyle, structure: cyoaStructure, story }
      : null;

  const comicConfig: ComicConfig | null =
    comicGenre && theme && artStyle
      ? { comicGenre, theme, artStyle, structure: comicStructure, story }
      : null;

  const escapeConfig: EscapeConfig | null =
    escapeTheme && theme && artStyle
      ? { escapeTheme, theme, artStyle, structure: escapeStructure, story }
      : null;

  const puzzleConfig: PuzzleConfig | null =
    puzzleSubject && artStyle
      ? { puzzleSubject, artStyle, structure: puzzleStructure }
      : null;

  // ── Library count fetcher ──
  const fetchLibraryCount = useCallback(async () => {
    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      setLibraryCount(data.entries?.length || 0);
    } catch { /* server may be down */ }
  }, []);

  // ── WebSocket management (lives at App level, survives page changes) ──
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const currentBuildId = useRef<string | null>(null);

  const connectWs = useCallback((id: string) => {
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    currentBuildId.current = id;
    reconnectAttempts.current = 0;

    function doConnect() {
      // Clear any pending reconnect timer (guard against rapid close/reopen)
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws?buildId=${encodeURIComponent(id)}`);

      ws.onopen = () => {
        setBuildActive(true);
        reconnectAttempts.current = 0;
      };

      ws.onclose = () => {
        // Auto-reconnect with exponential backoff if build is still active
        if (currentBuildId.current === id && !buildCompletedRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 16000);
          reconnectAttempts.current++;
          if (reconnectAttempts.current <= 8) {
            setBuildDetail(`Connection lost — reconnecting in ${Math.round(delay / 1000)}s...`);
            reconnectTimer.current = setTimeout(doConnect, delay);
          } else {
            setBuildDetail('Connection lost — please refresh the page.');
          }
        }
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
              // If the last entry has the same name, update it in place (heartbeat)
              if (prev.length > 0 && prev[prev.length - 1].name === msg.name) {
                return prev.map((e, i) =>
                  i === prev.length - 1 ? { ...e, percent: msg.percent } : e
                );
              }
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
            setQaReport(msg.qaReport || null);

            // Refresh library count (server auto-saved this game)
            fetchLibraryCount();

            // Navigate to preview after a brief pause
            setTimeout(() => {
              setPage('preview');
            }, 1500);
          }

          if (data.type === 'error') {
            buildCompletedRef.current = true; // prevent reconnect on error
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
    }

    buildCompletedRef.current = false;
    doConnect();
  }, []);

  const disconnectWs = useCallback(() => {
    currentBuildId.current = null;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleStartForging = useCallback((type: EntertainmentType) => {
    setEntertainmentType(type);
    setPage('wizard');
  }, []);

  const handleAutoForge = useCallback(async (type: EntertainmentType) => {
    setEntertainmentType(type);
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

      if (type === 'adventure') {
        const cg = CYOA_GENRES.find((x) => x.id === (ac.cyoaGenreId as string)) || CYOA_GENRES[0];
        const t = THEMES.find((x) => x.id === (ac.themeId as string)) || THEMES[0];
        const a = ART_STYLES.find((x) => x.id === (ac.artStyleId as string)) || ART_STYLES[0];
        setCyoaGenre(cg);
        setTheme(t);
        setArtStyle(a);
        setCyoaStructure(ac.structure as CYOAStructureConfig || defaultCYOAStructure);
        setStory(ac.story as StoryConfig);
      } else if (type === 'escape') {
        const et = ESCAPE_THEMES.find((x) => x.id === (ac.escapeThemeId as string)) || ESCAPE_THEMES[0];
        const t = THEMES.find((x) => x.id === (ac.themeId as string)) || THEMES[0];
        const a = ART_STYLES.find((x) => x.id === (ac.artStyleId as string)) || ART_STYLES[0];
        setEscapeTheme(et);
        setTheme(t);
        setArtStyle(a);
        setEscapeStructure(ac.structure as EscapeStructureConfig || defaultEscapeStructure);
        setStory(ac.story as StoryConfig);
      } else if (type === 'puzzle') {
        const ps = PUZZLE_SUBJECTS.find((x) => x.id === (ac.puzzleSubjectId as string)) || PUZZLE_SUBJECTS[0];
        const a = ART_STYLES.find((x) => x.id === (ac.artStyleId as string)) || ART_STYLES[0];
        setPuzzleSubject(ps);
        setArtStyle(a);
        setPuzzleStructure(ac.structure as PuzzleStructureConfig || defaultPuzzleStructure);
        setStory(ac.story as StoryConfig);
      } else if (type === 'comic') {
        const cg = COMIC_GENRES.find((x) => x.id === (ac.comicGenreId as string)) || COMIC_GENRES[0];
        const t = THEMES.find((x) => x.id === (ac.themeId as string)) || THEMES[0];
        const a = ART_STYLES.find((x) => x.id === (ac.artStyleId as string)) || ART_STYLES[0];
        setComicGenre(cg);
        setTheme(t);
        setArtStyle(a);
        setComicStructure(ac.structure as ComicStructureConfig || defaultComicStructure);
        setStory(ac.story as StoryConfig);
      } else {
        const g = GENRES.find((x) => x.id === (ac.genreId as string)) || GENRES[0];
        const t = THEMES.find((x) => x.id === (ac.themeId as string)) || THEMES[0];
        const a = ART_STYLES.find((x) => x.id === (ac.artStyleId as string)) || ART_STYLES[0];
        setGenre(g);
        setTheme(t);
        setArtStyle(a);
        setStructure(ac.structure as StructureConfig);
        setStory(ac.story as StoryConfig);
      }
      setPage('wizard');
    } catch {
      if (type === 'adventure') {
        const cg = CYOA_GENRES[Math.floor(Math.random() * CYOA_GENRES.length)];
        const t = THEMES[Math.floor(Math.random() * THEMES.length)];
        const a = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
        setCyoaGenre(cg);
        setTheme(t);
        setArtStyle(a);
        setCyoaStructure({ pageCount: 15 + Math.floor(Math.random() * 31), deadliness: 'medium', branchDensity: 'forking' });
        setStory({ title: '', description: '', characterName: '', setting: '' });
      } else if (type === 'escape') {
        const et = ESCAPE_THEMES[Math.floor(Math.random() * ESCAPE_THEMES.length)];
        const t = THEMES[Math.floor(Math.random() * THEMES.length)];
        const a = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
        setEscapeTheme(et);
        setTheme(t);
        setArtStyle(a);
        setEscapeStructure({ envelopeCount: 3 + Math.floor(Math.random() * 4), difficulty: 'standard', duration: [30, 45, 60][Math.floor(Math.random() * 3)] });
        setStory({ title: '', description: '', characterName: '', setting: '' });
      } else if (type === 'puzzle') {
        const ps = PUZZLE_SUBJECTS[Math.floor(Math.random() * PUZZLE_SUBJECTS.length)];
        const a = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
        setPuzzleSubject(ps);
        setArtStyle(a);
        setPuzzleStructure({ pieceCount: [9, 25, 49][Math.floor(Math.random() * 3)], difficulty: 'medium', rotation: false });
        setStory({ title: '', description: '', characterName: '', setting: '' });
      } else if (type === 'comic') {
        const cg = COMIC_GENRES[Math.floor(Math.random() * COMIC_GENRES.length)];
        const t = THEMES[Math.floor(Math.random() * THEMES.length)];
        const a = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
        setComicGenre(cg);
        setTheme(t);
        setArtStyle(a);
        setComicStructure({ pageCount: 4 + Math.floor(Math.random() * 13), panelStyle: 'classic', tone: 'action' });
        setStory({ title: '', description: '', characterName: '', setting: '' });
      } else {
        const g = GENRES[Math.floor(Math.random() * GENRES.length)];
        const t = THEMES[Math.floor(Math.random() * THEMES.length)];
        const a = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
        setGenre(g);
        setTheme(t);
        setArtStyle(a);
        setStructure({ roomCount: 4 + Math.floor(Math.random() * 9), difficulty: 'standard', puzzleDensity: 'moderate' });
        setStory({ title: '', description: '', characterName: '', setting: '' });
      }
      setPage('wizard');
    } finally {
      setAutoForging(false);
    }
  }, []);

  const handleForgeIt = useCallback(async () => {
    const payload = entertainmentType === 'adventure' ? adventureConfig
      : entertainmentType === 'comic' ? comicConfig
      : entertainmentType === 'escape' ? escapeConfig
      : entertainmentType === 'puzzle' ? puzzleConfig
      : config;
    if (!payload) return;

    try {
      const endpoint = entertainmentType === 'adventure' ? '/api/forge/adventure'
        : entertainmentType === 'comic' ? '/api/forge/comic'
        : entertainmentType === 'escape' ? '/api/forge/escape'
        : entertainmentType === 'puzzle' ? '/api/forge/puzzle'
        : '/api/forge';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const newBuildId = data.buildId;

      // Reset build state for fresh build
      setBuildId(newBuildId);
      setBuildPercent(0);
      setBuildStageName('Stoking the forge...');
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
  }, [config, adventureConfig, comicConfig, escapeConfig, puzzleConfig, entertainmentType, connectWs]);

  const handleBuildComplete = useCallback((apkPath: string, apkSize: string, previewUrlPath: string) => {
    setApkInfo({ path: apkPath, size: apkSize });
    setPreviewUrl(previewUrlPath);
    setPage('preview');
  }, []);

  const handleGoToDeploy = useCallback(() => {
    setPage('deploy');
  }, []);

  const handleGoToLibrary = useCallback(() => {
    setShowLibrary(true);
  }, []);

  const handleViewFromLibrary = useCallback((entry: LibraryEntry) => {
    const c = entry.config;
    if ('cyoaGenre' in c) {
      const ac = c as AdventureConfig;
      setEntertainmentType('adventure');
      setCyoaGenre(ac.cyoaGenre);
      setTheme(ac.theme);
      setArtStyle(ac.artStyle);
      setCyoaStructure(ac.structure);
      setStory(ac.story);
    } else if ('comicGenre' in c) {
      const cc = c as ComicConfig;
      setEntertainmentType('comic');
      setComicGenre(cc.comicGenre);
      setTheme(cc.theme);
      setArtStyle(cc.artStyle);
      setComicStructure(cc.structure);
      setStory(cc.story);
    } else if ('escapeTheme' in c) {
      const ec = c as EscapeConfig;
      setEntertainmentType('escape');
      setEscapeTheme(ec.escapeTheme);
      setTheme(ec.theme);
      setArtStyle(ec.artStyle);
      setEscapeStructure(ec.structure);
      setStory(ec.story);
    } else if ('puzzleSubject' in c) {
      const pc = c as PuzzleConfig;
      setEntertainmentType('puzzle');
      setPuzzleSubject(pc.puzzleSubject);
      setArtStyle(pc.artStyle);
      setPuzzleStructure(pc.structure);
    } else {
      const gc = c as GameConfig;
      setEntertainmentType('game');
      setGenre(gc.genre);
      setTheme(gc.theme);
      setArtStyle(gc.artStyle);
      setStructure(gc.structure);
      setStory(gc.story);
    }
    setBuildId(entry.buildId);
    setApkInfo({ path: '', size: entry.apkSize });
    setPreviewUrl(`/api/preview/${entry.buildId}`);
    setShowLibrary(false);
    setPage('preview');
  }, []);

  const handleReForgeFromLibrary = useCallback((entry: LibraryEntry) => {
    const c = entry.config;
    if ('cyoaGenre' in c) {
      const ac = c as AdventureConfig;
      setEntertainmentType('adventure');
      setCyoaGenre(ac.cyoaGenre);
      setTheme(ac.theme);
      setArtStyle(ac.artStyle);
      setCyoaStructure(ac.structure);
      setStory(ac.story);
    } else if ('comicGenre' in c) {
      const cc = c as ComicConfig;
      setEntertainmentType('comic');
      setComicGenre(cc.comicGenre);
      setTheme(cc.theme);
      setArtStyle(cc.artStyle);
      setComicStructure(cc.structure);
      setStory(cc.story);
    } else if ('escapeTheme' in c) {
      const ec = c as EscapeConfig;
      setEntertainmentType('escape');
      setEscapeTheme(ec.escapeTheme);
      setTheme(ec.theme);
      setArtStyle(ec.artStyle);
      setEscapeStructure(ec.structure);
      setStory(ec.story);
    } else if ('puzzleSubject' in c) {
      const pc = c as PuzzleConfig;
      setEntertainmentType('puzzle');
      setPuzzleSubject(pc.puzzleSubject);
      setArtStyle(pc.artStyle);
      setPuzzleStructure(pc.structure);
    } else {
      const gc = c as GameConfig;
      setEntertainmentType('game');
      setGenre(gc.genre);
      setTheme(gc.theme);
      setArtStyle(gc.artStyle);
      setStructure(gc.structure);
      setStory(gc.story);
    }
    setBuildActive(false);
    buildCompletedRef.current = false;
    setBuildId(null);
    preNavPageRef.current = null;
    setShowLibrary(false);
    setPage('wizard');
  }, []);

  const handleStartOver = useCallback(() => {
    disconnectWs();
    setBuildActive(false);
    buildCompletedRef.current = false;
    setBuildId(null);
    setBuildPercent(0);
    setBuildStageName('Stoking the forge...');
    setBuildDetail('');
    setBuildError(null);
    setBuildLog([]);
    preNavPageRef.current = null;
    setPage('landing');
    setEntertainmentType('game');
    setGenre(null);
    setTheme(null);
    setArtStyle(null);
    setStructure(defaultStructure);
    setStory(defaultStory);
    setCyoaGenre(null);
    setCyoaStructure(defaultCYOAStructure);
    setComicGenre(null);
    setComicStructure(defaultComicStructure);
    setEscapeTheme(null);
    setEscapeStructure(defaultEscapeStructure);
    setPuzzleSubject(null);
    setPuzzleStructure(defaultPuzzleStructure);
    setApkInfo(null);
    setPreviewUrl(null);
    setQaReport(null);
  }, [disconnectWs]);

  const handleLibraryBack = useCallback(() => {
    setShowLibrary(false);
  }, []);

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

  // Fetch library count on mount
  useEffect(() => {
    fetchLibraryCount();
  }, [fetchLibraryCount]);

  return (
    <div className="app-shell">
      <EmberField />
      <DebugButton page={page} entertainmentType={entertainmentType} buildPercent={buildPercent} buildStageName={buildStageName} />

      <header className="forge-header">
        <div className="forge-header-brand" onClick={handleStartOver}>
          <img src="/bellforge-logo.png" alt="" className="header-logo-img" /> BELLFORGE
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
            📚 Library{libraryCount > 0 && <span className="library-badge">{libraryCount}</span>}
          </button>
          <div className="forge-header-version">v1.0.0</div>
        </div>
      </header>

      <div className="has-header">
        {page === 'landing' && (
          <Landing onStart={handleStartForging} onAutoForge={handleAutoForge} onLibrary={handleGoToLibrary} libraryCount={libraryCount} />
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

        {page === 'wizard' && entertainmentType === 'game' && (
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

        {page === 'wizard' && entertainmentType === 'adventure' && (
          <CYOAWizardContainer
            cyoaGenre={cyoaGenre}
            theme={theme}
            artStyle={artStyle}
            structure={cyoaStructure}
            story={story}
            onGenreChange={setCyoaGenre}
            onThemeChange={setTheme}
            onArtStyleChange={setArtStyle}
            onStructureChange={setCyoaStructure}
            onStoryChange={setStory}
            onForge={handleForgeIt}
            onBack={() => setPage('landing')}
          />
        )}

        {page === 'wizard' && entertainmentType === 'comic' && (
          <ComicWizardContainer
            comicGenre={comicGenre}
            theme={theme}
            artStyle={artStyle}
            structure={comicStructure}
            story={story}
            onGenreChange={setComicGenre}
            onThemeChange={setTheme}
            onArtStyleChange={setArtStyle}
            onStructureChange={setComicStructure}
            onStoryChange={setStory}
            onForge={handleForgeIt}
            onBack={() => setPage('landing')}
          />
        )}

        {page === 'wizard' && entertainmentType === 'escape' && (
          <EscapeWizardContainer
            escapeTheme={escapeTheme}
            theme={theme}
            artStyle={artStyle}
            structure={escapeStructure}
            story={story}
            onEscapeThemeChange={setEscapeTheme}
            onThemeChange={setTheme}
            onArtStyleChange={setArtStyle}
            onStructureChange={setEscapeStructure}
            onStoryChange={setStory}
            onForge={handleForgeIt}
            onBack={() => setPage('landing')}
          />
        )}

        {page === 'wizard' && entertainmentType === 'puzzle' && (
          <PuzzleWizardContainer
            puzzleSubject={puzzleSubject}
            artStyle={artStyle}
            structure={puzzleStructure}
            onSubjectChange={setPuzzleSubject}
            onArtStyleChange={setArtStyle}
            onStructureChange={setPuzzleStructure}
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
            entertainmentType={entertainmentType}
          />
        )}

        {page === 'preview' && previewUrl && (
          <GamePreview
            previewUrl={previewUrl}
            apkPath={apkInfo?.path ?? ''}
            apkSize={apkInfo?.size ?? ''}
            orientation={(entertainmentType === 'adventure' || entertainmentType === 'comic' || entertainmentType === 'escape' || entertainmentType === 'puzzle') ? 'landscape' : (genre?.orientation ?? 'landscape')}
            onDeploy={handleGoToDeploy}
            onStartOver={handleStartOver}
            onReForge={() => { setBuildActive(false); buildCompletedRef.current = false; setPage('wizard'); }}
            qaReport={qaReport}
            entertainmentType={entertainmentType}
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

      </div>

      {/* Library modal overlay — never interrupts what's behind it */}
      {showLibrary && (
        <div className="library-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLibrary(false); }}>
          <div className="library-overlay-content">
            <Library
              onBack={handleLibraryBack}
              onViewPreview={handleViewFromLibrary}
              onReForge={handleReForgeFromLibrary}
              onCountChange={setLibraryCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}

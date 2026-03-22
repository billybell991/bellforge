import { useState, useEffect, useCallback } from 'react';
import type { LibraryEntry, GameConfig, AdventureConfig, ComicConfig, PuzzleConfig, EscapeConfig, WordSearchConfig, CrosswordConfig, JumbleConfig, EntertainmentType } from '../types';

function getClientId(): string {
  let id = localStorage.getItem('bellforge-client-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('bellforge-client-id', id);
  }
  return id;
}

const LOCAL_LIBRARY_KEY = 'bellforge-library';

function loadLocalLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalLibrary(entries: LibraryEntry[]): void {
  try {
    localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded — best effort */ }
}

function getEntryType(entry: LibraryEntry): EntertainmentType {
  if (entry.entertainmentType) return entry.entertainmentType;
  if ('cyoaGenre' in entry.config) return 'adventure';
  if ('comicGenre' in entry.config) return 'comic';
  return 'game';
}

const TYPE_BADGES: Record<EntertainmentType, { icon: string; label: string; color: string }> = {
  game: { icon: '🎮', label: 'Game', color: '#00e5ff' },
  adventure: { icon: '📚', label: 'Adventure', color: '#ffa726' },
  comic: { icon: '💥', label: 'Comic', color: '#ff5252' },
  puzzle: { icon: '🧩', label: 'Puzzle', color: '#ab47bc' },
  escape: { icon: '🚪', label: 'Escape Room', color: '#66bb6a' },
  wordsearch: { icon: '🔍', label: 'Word Search', color: '#29b6f6' },
  crossword: { icon: '✏️', label: 'Crossword', color: '#ef5350' },
  jumble: { icon: '🔀', label: 'Jumble', color: '#ffa726' },
};

function getEntryGenreDisplay(entry: LibraryEntry): { icon: string; name: string } {
  const c = entry.config;
  if ('cyoaGenre' in c) {
    return { icon: (c as AdventureConfig).cyoaGenre.icon, name: (c as AdventureConfig).cyoaGenre.name };
  }
  if ('comicGenre' in c) {
    return { icon: (c as ComicConfig).comicGenre.icon, name: (c as ComicConfig).comicGenre.name };
  }
  if ('puzzleSubject' in c) {
    const pc = c as PuzzleConfig;
    return { icon: '🧩', name: pc.puzzleSubject?.name || 'Puzzle' };
  }
  if ('wordSearchCategory' in c) {
    const wc = c as WordSearchConfig;
    return { icon: '🔍', name: wc.wordSearchCategory?.name || 'Word Search' };
  }
  if ('crosswordCategory' in c) {
    const xc = c as CrosswordConfig;
    return { icon: '✏️', name: xc.crosswordCategory?.name || 'Crossword' };
  }
  if ('jumbleCategory' in c) {
    const jc = c as JumbleConfig;
    return { icon: '🔀', name: jc.jumbleCategory?.name || 'Jumble' };
  }
  if ('escapeTheme' in c) {
    return { icon: '🚪', name: (c as EscapeConfig).escapeTheme?.name || 'Escape Room' };
  }
  const gc = c as GameConfig;
  return { icon: gc.genre?.icon || '🎮', name: gc.genre?.name || 'Game' };
}

interface LibraryProps {
  onBack: () => void;
  onViewPreview: (entry: LibraryEntry) => void;
  onReForge: (entry: LibraryEntry) => void;
  onCountChange?: (count: number) => void;
}

export function Library({ onBack, onViewPreview, onReForge, onCountChange }: LibraryProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchLibrary = useCallback(async () => {
    // Show cached entries immediately so library isn't empty after a redeploy
    const cached = loadLocalLibrary();
    if (cached.length) {
      setEntries(cached);
      onCountChange?.(cached.length);
    }

    try {
      const res = await fetch('/api/library', {
        headers: { 'X-Client-Id': getClientId() },
      });
      const data = await res.json();
      const serverEntries: LibraryEntry[] = data.entries || [];

      // Merge: keep all server entries + any local-only entries the server lost
      const serverIds = new Set(serverEntries.map((e) => e.id));
      const localOnly = cached.filter((e) => !serverIds.has(e.id));

      const merged = [...serverEntries, ...localOnly];
      setEntries(merged);
      saveLocalLibrary(merged);
      onCountChange?.(merged.length);

      // Re-sync local-only entries back to server (e.g. after Railway redeploy)
      if (localOnly.length > 0) {
        fetch('/api/library/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
          body: JSON.stringify({ entries: localOnly }),
        }).catch(() => {});
      }
    } catch {
      // Server down — cached entries already displayed above
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleRate = async (id: string, rating: number) => {
    await fetch(`/api/library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
      body: JSON.stringify({ rating }),
    });
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, rating } : e));
      saveLocalLibrary(next);
      return next;
    });
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, name: editName.trim() } : e));
      saveLocalLibrary(next);
      return next;
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/library/${id}`, { method: 'DELETE', headers: { 'X-Client-Id': getClientId() } });
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveLocalLibrary(next);
      onCountChange?.(next.length);
      return next;
    });
  };

  const handleDownload = (entry: LibraryEntry) => {
    window.open(`/api/library/${entry.id}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="library-screen">
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading library...</p>
      </div>
    );
  }

  return (
    <div className="library-screen">
      <h1 className="library-title">📚 Your Forge Library</h1>
      <p className="library-subtitle">
        All your forged creations in one place. Rate, rename, download, or revisit.
      </p>

      {entries.length === 0 ? (
        <div className="library-empty">
          <span className="library-empty-icon">🗃️</span>
          <p>No creations saved yet.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Forge a game, adventure, or comic, and it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="library-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="library-card">
              {/* Thumbnail */}
              {entry.thumbnail && (
                <div className={`library-card-thumb${getEntryType(entry) === 'comic' ? ' library-card-thumb-comic' : ''}`} onClick={() => onViewPreview(entry)}>
                  <img
                    src={`/api/library/${entry.id}/thumbnail`}
                    alt={entry.name}
                    loading="lazy"
                  />
                </div>
              )}
              <div className="library-card-header">
                {/* Type badge */}
                {(() => {
                  const badge = TYPE_BADGES[getEntryType(entry)];
                  return (
                    <span className="library-type-badge" style={{ background: badge.color }}>
                      {badge.icon} {badge.label}
                    </span>
                  );
                })()}
                {editingId === entry.id ? (
                  <div className="library-rename">
                    <input
                      className="library-rename-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(entry.id)}
                      autoFocus
                      maxLength={100}
                    />
                    <button className="library-rename-ok" onClick={() => handleRename(entry.id)}>✓</button>
                    <button className="library-rename-cancel" onClick={() => setEditingId(null)}>✗</button>
                  </div>
                ) : (
                  <h3
                    className="library-card-name"
                    onClick={() => { setEditingId(entry.id); setEditName(entry.name); }}
                    title="Click to rename"
                  >
                    {entry.name}
                  </h3>
                )}
              </div>

              <div className="library-card-meta">
                <span>{getEntryGenreDisplay(entry).icon} {getEntryGenreDisplay(entry).name}</span>
                {'theme' in entry.config && (entry.config as GameConfig).theme && (
                  <span>{(entry.config as GameConfig).theme?.icon} {(entry.config as GameConfig).theme?.name}</span>
                )}
                {'artStyle' in entry.config && (entry.config as PuzzleConfig).artStyle && (
                  <span>🎨 {(entry.config as PuzzleConfig).artStyle.name}</span>
                )}
              </div>

              <div className="library-card-meta">
                <span>📦 {entry.apkSize}</span>
                <span>🕐 {new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Star Rating */}
              <div className="library-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`library-star ${star <= entry.rating ? 'filled' : ''}`}
                    onClick={() => handleRate(entry.id, star === entry.rating ? 0 : star)}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="library-card-actions">
                <button className="library-action-btn" onClick={() => onViewPreview(entry)} title={(['game', 'escape', 'puzzle', 'wordsearch', 'crossword', 'jumble'] as EntertainmentType[]).includes(getEntryType(entry)) ? 'Play' : 'Open in viewer'}>
                  {(() => { const t = getEntryType(entry); if (t === 'game') return '🎮 Play'; if (t === 'escape') return '🚪 Play'; if (t === 'puzzle' || t === 'wordsearch' || t === 'crossword' || t === 'jumble') return '🧩 Play'; if (t === 'adventure') return '📖 Read'; if (t === 'comic') return '📖 Read'; return '📖 Read'; })()}
                </button>
                <button className="library-action-btn library-action-reforge" onClick={() => onReForge(entry)} title="Load settings into the forge and rebuild with latest improvements">
                  🔄 Re-Forge
                </button>
                <button className="library-action-btn" onClick={() => handleDownload(entry)} title="Download HTML file">
                  💾 Download
                </button>
                <button className="library-action-btn library-action-delete" onClick={() => handleDelete(entry.id)} title="Remove from library">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="library-back-btn" onClick={onBack}>
        ← Back to Forge
      </button>
    </div>
  );
}

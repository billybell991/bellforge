import { useState, useEffect, useCallback } from 'react';
import type { LibraryEntry, GameConfig, AdventureConfig, ComicConfig, PuzzleConfig, EscapeConfig, EntertainmentType } from '../types';

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
    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      const list = data.entries || [];
      setEntries(list);
      onCountChange?.(list.length);
    } catch {
      /* server may be down */
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, rating } : e)));
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name: editName.trim() } : e)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/library/${id}`, { method: 'DELETE' });
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
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
                <button className="library-action-btn" onClick={() => onViewPreview(entry)} title={getEntryType(entry) === 'game' ? 'Play in browser' : getEntryType(entry) === 'puzzle' ? 'Solve puzzle' : 'Open in viewer'}>
                  {getEntryType(entry) === 'game' ? '🎮 Play' : getEntryType(entry) === 'puzzle' ? '🧩 Solve' : getEntryType(entry) === 'escape' ? '🚪 Play' : getEntryType(entry) === 'adventure' ? '📖 Read' : '📖 Read'}
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

import { useState, useEffect, useCallback } from 'react';
import type { LibraryEntry, GameConfig, AdventureConfig } from '../types';

function getEntryGenreDisplay(entry: LibraryEntry): { icon: string; name: string } {
  const c = entry.config;
  if ('cyoaGenre' in c) {
    return { icon: (c as AdventureConfig).cyoaGenre.icon, name: (c as AdventureConfig).cyoaGenre.name };
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
        All your forged games in one place. Rate, rename, download, or revisit.
      </p>

      {entries.length === 0 ? (
        <div className="library-empty">
          <span className="library-empty-icon">🗃️</span>
          <p>No games saved yet.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Forge a game, then save it from the preview screen.
          </p>
        </div>
      ) : (
        <div className="library-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="library-card">
              <div className="library-card-header">
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
                <span>{entry.config?.theme?.icon} {entry.config?.theme?.name}</span>
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
                <button className="library-action-btn" onClick={() => onViewPreview(entry)} title="Play in browser">
                  🎮 Play
                </button>
                <button className="library-action-btn library-action-reforge" onClick={() => onReForge(entry)} title="Load settings into the forge and rebuild with latest improvements">
                  🔄 Re-Forge
                </button>
                <button className="library-action-btn" onClick={() => handleDownload(entry)} title="Download HTML game file">
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

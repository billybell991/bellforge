import type { QAReport } from '../types';

interface QAPanelProps {
  report: QAReport;
  onDismiss?: () => void;
  entertainmentType?: string;
}

function scoreColor(score: number): string {
  if (score >= 9) return '#4caf50';
  if (score >= 7) return '#ffa726';
  if (score >= 5) return '#ff9800';
  return '#ef5350';
}

const TYPE_LABELS: Record<string, string> = {
  comic: 'Comic',
  adventure: 'Adventure',
  puzzle: 'Puzzle',
  escape: 'Escape Room',
  game: 'Game',
};

export function QAPanel({ report, onDismiss, entertainmentType }: QAPanelProps) {
  const overall = report.overallScore;
  const overallColor = scoreColor(overall);

  // Build time
  const elapsed = report.timing.completedAt
    ? Math.round((report.timing.completedAt - report.timing.startedAt) / 1000)
    : 0;
  const elMin = Math.floor(elapsed / 60);
  const elSec = elapsed % 60;
  const timeStr = elMin > 0 ? `${elMin}m ${elSec}s` : `${elSec}s`;

  // Image stats
  const imgs = report.images;
  const imgTotal = imgs ? 3 + imgs.rooms.length + imgs.items.length : 0;
  const imgSuccess = imgs
    ? [imgs.title, imgs.character, imgs.packIcon, ...imgs.rooms, ...imgs.items].filter(Boolean).length
    : 0;

  return (
    <div className="qa-scored-panel">
      <div className="qa-scored-header">
        <span className="qa-scored-icon">🔮</span> Gemini QA Report
      </div>

      {/* Overall Score */}
      <div className="qa-overall">
        <div className="qa-overall-score" style={{ color: overallColor }}>
          {overall}/10
        </div>
        <div className="qa-overall-label">OVERALL QUALITY</div>
      </div>

      {/* Category Grid */}
      <div className="qa-category-grid">
        {report.categories.map((cat, i) => (
          <div key={i} className="qa-category-card">
            <div className="qa-category-name">{cat.name.toUpperCase()}</div>
            <div className="qa-category-score" style={{ color: scoreColor(cat.score) }}>
              {cat.score}/10
            </div>
            <div className="qa-category-detail">{cat.detail}</div>
          </div>
        ))}
      </div>

      {/* Summary + Stats */}
      <div className="qa-summary-row">
        <span className="qa-summary-bullet">•</span>
        <span className="qa-summary-text">{report.summary}</span>
      </div>

      <div className="qa-stats-row">
        {imgs && <span className="qa-stat">🎨 {imgSuccess}/{imgTotal} images</span>}
        <span className="qa-stat">⏱️ {timeStr}</span>
        {report.config && report.config.roomCount > 0 && (
          <span className="qa-stat">🎬 {report.config.roomCount} {imgs ? 'scenes' : 'pages'}</span>
        )}
      </div>

      {onDismiss && (
        <button className="qa-dismiss-btn" onClick={onDismiss}>
          Continue to {TYPE_LABELS[entertainmentType || ''] || 'Preview'} →
        </button>
      )}
    </div>
  );
}

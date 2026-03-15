import { useEffect, useRef } from 'react';
import { BUILD_STAGES, ADVENTURE_BUILD_STAGES, COMIC_BUILD_STAGES, ESCAPE_BUILD_STAGES, PUZZLE_BUILD_STAGES, type EntertainmentType } from '../types';

interface LogEntry {
  name: string;
  percent: number;
  done: boolean;
}

interface BuildProgressProps {
  percent: number;
  stageName: string;
  detail: string;
  error: string | null;
  log: LogEntry[];
  entertainmentType?: EntertainmentType;
}

export function BuildProgress({ percent, stageName, detail, error, log, entertainmentType = 'game' }: BuildProgressProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="build-screen">
      <h1 className="build-title"><img src="/bellforge-logo.png" alt="" style={{ width: 28, height: 'auto', verticalAlign: 'middle', marginRight: 8, filter: 'drop-shadow(0 0 6px rgba(255,107,53,0.4))' }} />Forging Your {entertainmentType === 'adventure' ? 'Adventure' : entertainmentType === 'comic' ? 'Comic' : entertainmentType === 'escape' ? 'Escape Room' : entertainmentType === 'puzzle' ? 'Puzzle' : 'Game'}</h1>
      <p className="build-subtitle">
        Sit back — the forge is hot and the hammers are swinging.
      </p>

      {/* Percentage */}
      <div className="progress-percent">{percent}%</div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Current Stage */}
      <div className="progress-stage-name">{stageName}</div>
      <div className="progress-detail">{detail}</div>

      {/* Log */}
      <div className="stage-log">
        <div className="stage-log-title">Build Log</div>
        {log.map((entry, i) => (
          <div
            key={i}
            className={`stage-log-entry ${entry.done ? 'done' : 'active'}`}
          >
            <span className="stage-check">
              {entry.done ? '✓' : '⏳'}
            </span>
            <span>{entry.name}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.75rem' }}>
              {entry.percent}%
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Pipeline Overview */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {entertainmentType === 'adventure'
            ? `${ADVENTURE_BUILD_STAGES.length} stages · Interactive Fiction · Gemini AI Bridge`
            : entertainmentType === 'comic'
            ? `${COMIC_BUILD_STAGES.length} stages · AI Comics · Gemini AI Bridge · Imagen`
            : entertainmentType === 'escape'
            ? `${ESCAPE_BUILD_STAGES.length} stages · Escape Room · Gemini AI Bridge`
            : entertainmentType === 'puzzle'
            ? `${PUZZLE_BUILD_STAGES.length} stages · Jigsaw Puzzle · Gemini AI Bridge · Imagen`
            : `${BUILD_STAGES.length} stages · Kotlin/Canvas · Gemini AI Bridge · Gradle Build`}
        </p>
      </div>
    </div>
  );
}

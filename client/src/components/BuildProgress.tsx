import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WSProgressMessage, WSCompleteMessage } from '../types';
import { BUILD_STAGES } from '../types';

interface BuildProgressProps {
  buildId: string;
  onComplete: (apkPath: string, apkSize: string, previewUrl: string) => void;
  onWsDisconnect?: (fn: () => void) => void;
}

interface LogEntry {
  name: string;
  percent: number;
  done: boolean;
}

export function BuildProgress({ buildId, onComplete, onWsDisconnect }: BuildProgressProps) {
  const { connect, disconnect, lastMessage } = useWebSocket();
  const [percent, setPercent] = useState(0);
  const [stageName, setStageName] = useState('Connecting to forge...');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  // Expose disconnect so parent can clean up if user navigates away
  useEffect(() => {
    onWsDisconnect?.(disconnect);
  }, [disconnect, onWsDisconnect]);

  useEffect(() => {
    connect(buildId);
  }, [buildId, connect]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'progress') {
      const msg = lastMessage as WSProgressMessage;
      setPercent(msg.percent);
      setStageName(msg.name);
      setDetail(msg.detail);

      setLog((prev) => {
        const updated = prev.map((e) => ({ ...e, done: true }));
        return [...updated, { name: msg.name, percent: msg.percent, done: false }];
      });
    }

    if (lastMessage.type === 'complete' && !completedRef.current) {
      completedRef.current = true;
      const msg = lastMessage as WSCompleteMessage;
      setPercent(100);
      setStageName('Build Complete!');
      setDetail('Your game is ready to deploy!');
      setLog((prev) => prev.map((e) => ({ ...e, done: true })));

      setTimeout(() => {
        onComplete(msg.apkPath, msg.apkSize, msg.previewUrl);
      }, 1500);
    }

    if (lastMessage.type === 'error') {
      setError(lastMessage.message);
      setStageName('Build Failed');
      setDetail(lastMessage.message);
    }
  }, [lastMessage, onComplete]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="build-screen">
      <h1 className="build-title">⚒️ Forging Your Game</h1>
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
          {BUILD_STAGES.length} stages · Kotlin/Canvas · Gemini AI Bridge · Gradle Build
        </p>
      </div>
    </div>
  );
}

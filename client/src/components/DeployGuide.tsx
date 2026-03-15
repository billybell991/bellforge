import { useState, useEffect, useCallback } from 'react';

interface DeployGuideProps {
  apkPath: string;
  apkSize: string;
  buildId: string;
  onStartOver: () => void;
}

interface AdbDevice {
  serial: string;
  model: string;
}

const DEPLOY_STEPS = [
  {
    title: 'Enable Developer Options',
    body: 'Go to Settings → About Phone → tap "Build Number" 7 times. A toast will confirm Developer Options is enabled.',
  },
  {
    title: 'Enable USB Debugging',
    body: 'Go to Settings → Developer Options → toggle on "USB Debugging". Tap OK on the prompt.',
  },
  {
    title: 'Connect Your Phone',
    body: 'Plug your Android phone into your computer via USB cable. If prompted on the phone, tap "Allow" for USB debugging access.',
  },
  {
    title: 'Deploy to Device',
    body: 'Click the "Push to Phone" button below. BellForge will use ADB to install the APK and launch your game automatically.',
  },
];

export function DeployGuide({ apkPath, apkSize, buildId, onStartOver }: DeployGuideProps) {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      setDevices(data.devices ?? []);
      if (data.devices?.length === 1) {
        setSelectedDevice(data.devices[0].serial);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshDevices();
    const iv = setInterval(refreshDevices, 5000);
    return () => clearInterval(iv);
  }, [refreshDevices]);

  async function handleDeploy() {
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId, serial: selectedDevice || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setDeployResult({ ok: true, msg: data.message });
      } else {
        setDeployResult({ ok: false, msg: data.error || 'Deployment failed.' });
      }
    } catch {
      setDeployResult({ ok: false, msg: 'Deployment failed. Check USB connection and try again.' });
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="deploy-screen">
      {/* Success Header */}
      <div className="deploy-success">
        <span className="deploy-success-icon">🎉</span>
        <h1 className="deploy-success-title">Your Game Is Ready!</h1>
        <p className="deploy-success-info">
          The forge has done its work. Your APK is compiled and waiting.
        </p>
      </div>

      {/* APK Info */}
      <div className="deploy-apk-info">
        <span className="deploy-apk-icon">📦</span>
        <div className="deploy-apk-details">
          <div className="deploy-apk-path">{apkPath}</div>
          <div className="deploy-apk-size">{apkSize}</div>
        </div>
      </div>

      {/* Phone Warning */}
      <div className="phone-warning">
        <span className="phone-warning-icon">⚠️</span>
        <div className="phone-warning-text">
          <strong>Plug in your phone BEFORE pushing!</strong>
          <br />
          Make sure your Android device is connected via USB with USB Debugging enabled
          in Developer Options. BellForge uses ADB to beam the game directly to your device.
        </div>
      </div>

      {/* Setup Steps */}
      <h2 style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: '1.1rem',
        fontWeight: 700,
        marginBottom: '20px',
        color: 'var(--text-primary)',
      }}>
        First-Time Setup
      </h2>

      <div className="deploy-steps">
        {DEPLOY_STEPS.map((step, i) => (
          <div key={i} className="deploy-step">
            <span className="deploy-step-num">{i + 1}</span>
            <div className="deploy-step-content">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Device Status */}
      <div className="deploy-device-status" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Connected Devices
          </span>
          <button onClick={refreshDevices} style={{
            background: 'none', border: '1px solid var(--border-card)',
            color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '6px',
            padding: '4px 12px', fontSize: '0.8rem',
          }}>
            🔄 Refresh
          </button>
        </div>
        {devices.length === 0 ? (
          <p style={{ color: 'var(--forge-orange)', fontSize: '0.9rem', margin: 0 }}>
            ⚠️ No devices detected. Connect your phone via USB and enable USB Debugging.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {devices.map((d) => (
              <label key={d.serial} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                background: selectedDevice === d.serial ? 'rgba(0, 191, 165, 0.1)' : 'transparent',
                border: selectedDevice === d.serial ? '1px solid var(--teal)' : '1px solid transparent',
              }}>
                <input
                  type="radio"
                  name="device"
                  checked={selectedDevice === d.serial}
                  onChange={() => setSelectedDevice(d.serial)}
                />
                <span style={{ color: 'var(--teal)', fontSize: '1.1rem' }}>📱</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {d.model} <span style={{ color: 'var(--text-muted)' }}>({d.serial})</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Deploy Result */}
      {deployResult && (
        <div style={{
          padding: '16px 20px', borderRadius: '10px', marginBottom: '20px',
          background: deployResult.ok ? 'rgba(0, 191, 165, 0.1)' : 'rgba(255, 107, 53, 0.1)',
          border: `1px solid ${deployResult.ok ? 'var(--teal)' : 'var(--forge-orange)'}`,
          color: deployResult.ok ? 'var(--teal)' : 'var(--forge-orange)',
          fontSize: '0.95rem',
        }}>
          {deployResult.ok ? '✅' : '❌'} {deployResult.msg}
        </div>
      )}

      {/* Action Buttons */}
      <div className="deploy-actions">
        <button
          className="deploy-btn primary"
          onClick={handleDeploy}
          disabled={deploying || devices.length === 0}
          style={{ opacity: (deploying || devices.length === 0) ? 0.5 : 1 }}
        >
          {deploying ? '⏳ Deploying...' : '📱 Push to Phone'}
        </button>
        <button className="deploy-btn secondary" onClick={onStartOver}>
          <img src="/bellforge-logo.png" alt="" style={{ width: 18, height: 'auto', verticalAlign: 'middle', marginRight: 6 }} /> Forge Another Game
        </button>
      </div>
    </div>
  );
}

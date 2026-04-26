import { Loader2, Play, RotateCcw, ShieldCheck } from 'lucide-react';

export function FaceSensorPanel({ sensor, playerName, compact = false }) {
  const statusTone = sensor.error ? 'error' : sensor.isRunning ? 'ready' : 'idle';
  const canStart = Boolean(playerName);

  return (
    <section className={compact ? 'sensor-panel sensor-panel--overlay' : 'sensor-panel'} aria-label="Webcam face sensor">
      <div className="panel-header sensor-panel-header">
        {!compact && (
          <div>
            <p className="eyebrow">Live input</p>
            <h2>Webcam sensor</h2>
          </div>
        )}
        <span className={`sensor-state ${statusTone}`}>{sensor.status}</span>
      </div>

      <div className="video-stage">
        <video ref={sensor.videoRef} autoPlay muted playsInline aria-label="Live webcam feed" />
        <canvas ref={sensor.overlayRef} aria-hidden="true" />
        <div className="calibration-chip">{sensor.calibrationMessage}</div>
      </div>

      {sensor.error && <p className="error-message">{sensor.error}</p>}

      {!compact && (
        <div className="sensor-actions">
          <button type="button" onClick={sensor.start} disabled={!canStart || sensor.isBooting || sensor.isRunning}>
            {sensor.isBooting ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            {sensor.isBooting ? 'Starting' : sensor.isRunning ? 'Running' : 'Start'}
          </button>
          <button type="button" className="ghost-button" onClick={sensor.recalibrate} disabled={!sensor.isRunning}>
            <RotateCcw size={18} />
            Recenter
          </button>
        </div>
      )}

      {!compact && (
        <div className="privacy-line">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Detection runs locally in the browser. Use localhost or HTTPS for camera permission.</span>
        </div>
      )}
    </section>
  );
}

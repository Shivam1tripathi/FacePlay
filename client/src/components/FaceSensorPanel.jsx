import { Loader2, Play, RotateCcw, ShieldCheck } from 'lucide-react';

export function FaceSensorPanel({ sensor }) {
  const statusTone = sensor.error ? 'error' : sensor.isRunning ? 'ready' : 'idle';

  return (
    <section className="sensor-panel" aria-label="Webcam face sensor">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live input</p>
          <h2>Webcam sensor</h2>
        </div>
        <span className={`sensor-state ${statusTone}`}>{sensor.status}</span>
      </div>

      <div className="video-stage">
        <video ref={sensor.videoRef} autoPlay muted playsInline aria-label="Live webcam feed" />
        <canvas ref={sensor.overlayRef} aria-hidden="true" />
        <div className="calibration-chip">{sensor.calibrationMessage}</div>
      </div>

      {sensor.error && <p className="error-message">{sensor.error}</p>}

      <div className="sensor-actions">
        <button type="button" onClick={sensor.start} disabled={sensor.isBooting || sensor.isRunning}>
          {sensor.isBooting ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
          {sensor.isBooting ? 'Starting sensor' : sensor.isRunning ? 'Sensor running' : 'Start camera'}
        </button>
        <button type="button" className="ghost-button" onClick={sensor.recalibrate} disabled={!sensor.isRunning}>
          <RotateCcw size={18} />
          Recenter
        </button>
      </div>

      <div className="privacy-line">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>Detection runs locally in the browser. Use localhost or HTTPS for camera permission.</span>
      </div>
    </section>
  );
}

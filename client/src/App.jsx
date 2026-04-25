import { useEffect, useRef, useState } from 'react';
import { Crosshair, Gauge, MoveHorizontal, Smile } from 'lucide-react';
import { FaceSensorPanel } from './components/FaceSensorPanel.jsx';
import { GamePreviewCanvas } from './components/GamePreviewCanvas.jsx';
import { MetricCard } from './components/MetricCard.jsx';
import { useFaceControls } from './hooks/useFaceControls.js';

function App() {
  const sensor = useFaceControls();
  const fullscreenRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await fullscreenRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  };

  return (
    <main className="app-shell">
      <section className="hero-band">
        <nav className="top-nav" aria-label="FacePilot status">
          <div className="brand-lockup">
            <img className="brand-logo" src="/facepilot-logo.svg" alt="FacePilot logo" />
            <span>
              FacePilot
              <small>Neural runner</small>
            </span>
          </div>
          <div className="nav-status">
            <span className={sensor.isRunning ? 'status-pill is-live' : 'status-pill'}>
              {sensor.isRunning ? 'Sensor live' : 'Sensor standby'}
            </span>
          </div>
        </nav>
      </section>

      <section ref={fullscreenRef} className="dashboard-grid" aria-label="FacePilot sensor dashboard">
        <FaceSensorPanel sensor={sensor} />

        <aside className="control-column">
          <GamePreviewCanvas
            controls={sensor.controls}
            isRunning={sensor.isRunning}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onStop={sensor.stop}
          />

          <div className="metrics-grid">
            <MetricCard
              icon={Smile}
              label="Smile"
              value={sensor.controls.isSmiling ? 'Jump' : 'Idle'}
              detail={`${Math.round(sensor.controls.smileScore * 100)}% confidence`}
              active={sensor.controls.isSmiling}
            />
            <MetricCard
              icon={Crosshair}
              label="Mouth"
              value={sensor.controls.didShoot ? 'Shoot' : sensor.controls.isShootCoolingDown ? 'Cooldown' : 'Idle'}
              detail={`Open ${sensor.controls.mouthOpenRatio.toFixed(2)} / ${sensor.controls.mouthOpenThreshold.toFixed(2)}`}
              active={sensor.controls.didShoot}
            />
            <MetricCard
              icon={MoveHorizontal}
              label="Head"
              value={sensor.controls.headDirection}
              detail={`${Math.round(sensor.controls.headOffset * 100)}% offset`}
              active={sensor.controls.headDirection !== 'Center'}
            />
            <MetricCard
              icon={Gauge}
              label="Calibration"
              value={sensor.controls.faceDetected ? 'Tracking' : 'Searching'}
              detail={sensor.calibrationMessage}
              active={sensor.controls.faceDetected}
            />
          </div>

        </aside>
      </section>
    </main>
  );
}

export default App;

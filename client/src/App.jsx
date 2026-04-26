import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Gauge,
  Loader2,
  MoveHorizontal,
  Play,
  RotateCcw,
  Smile,
} from "lucide-react";
import { FaceSensorPanel } from "./components/FaceSensorPanel.jsx";
import { GamePreviewCanvas } from "./components/GamePreviewCanvas.jsx";
import { LoginModal } from "./components/LoginModal.jsx";
import { MetricCard } from "./components/MetricCard.jsx";
import { useFaceControls } from "./hooks/useFaceControls.js";
import { fetchLeaderboard, submitScore } from "./services/leaderboardApi.js";
import { startUserSession } from "./services/userApi.js";

function App() {
  const sensor = useFaceControls();
  const fullscreenRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [playerName, setPlayerName] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] =
    useState("Loading scores...");

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    fetchLeaderboard()
      .then((scores) => {
        setLeaderboard(scores);
        setLeaderboardStatus(scores.length ? "" : "No scores yet");
      })
      .catch(() => {
        setLeaderboard([]);
        setLeaderboardStatus("Leaderboard unavailable");
      });
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await fullscreenRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  };

  const confirmPlayerName = async (event) => {
    event.preventDefault();
    const username = credentials.username.trim().slice(0, 18);
    const password = credentials.password;

    if (!username || password.length < 4) {
      setAuthStatus("Enter username and 4+ character password");
      return;
    }

    try {
      setAuthStatus("Checking user...");
      const user = await startUserSession({ username, password });
      setPlayerName(user.displayName || user.username);
      setAuthStatus("User ready");
      setShowInstructions(true);
    } catch (error) {
      setPlayerName("");
      setAuthStatus(error.message);
    }
  };

  const resetPlayerName = () => {
    if (sensor.isRunning) return;
    setPlayerName("");
    setCredentials({ username: "", password: "" });
    setAuthStatus("");
    setShowInstructions(false);
  };

  const saveScore = async (score) => {
    if (
      !playerName ||
      !credentials.username ||
      !credentials.password ||
      score <= 0
    )
      return;

    try {
      const scores = await submitScore({
        username: credentials.username,
        password: credentials.password,
        score: Math.floor(score),
      });
      setLeaderboard(scores);
      setLeaderboardStatus(scores.length ? "" : "No scores yet");
    } catch {
      setLeaderboardStatus("Could not save score");
    }
  };

  return (
    <main className="app-shell">
      <section className="hero-band">
        <nav className="top-nav" aria-label="FacePilot status">
          <div className="brand-lockup">
            <img
              className="brand-logo"
              src="/facepilot-logo.svg"
              alt="FacePilot logo"
            />
            <span>
              FacePilot
              <small>Neural runner</small>
            </span>
          </div>
          <div className="nav-status">
            {playerName && (
              <button
                type="button"
                className="user-chip"
                onClick={resetPlayerName}
                disabled={sensor.isRunning}
              >
                {playerName}
              </button>
            )}
          </div>
        </nav>
      </section>

      <section
        ref={fullscreenRef}
        className="dashboard-grid"
        aria-label="FacePilot sensor dashboard"
      >
        <aside className="control-column">
          <div className="arena-stack">
            <GamePreviewCanvas
              controls={sensor.controls}
              isRunning={sensor.isRunning}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onStop={sensor.stop}
              playerName={playerName}
              onGameOver={saveScore}
              sensorActions={
                <div className="game-sensor-actions">
                  <button
                    type="button"
                    className="sensor-start-button"
                    onClick={sensor.start}
                    disabled={
                      !playerName || sensor.isBooting || sensor.isRunning
                    }
                  >
                    {sensor.isBooting ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                    {sensor.isBooting
                      ? "Starting"
                      : sensor.isRunning
                        ? "Running"
                        : "Start"}
                  </button>
                  <button
                    type="button"
                    className="sensor-recenter-button"
                    onClick={sensor.recalibrate}
                    disabled={!sensor.isRunning}
                  >
                    <RotateCcw size={18} />
                    Recenter
                  </button>
                </div>
              }
            />
            <FaceSensorPanel sensor={sensor} playerName={playerName} compact />
          </div>

          <div className="metrics-grid">
            <MetricCard
              icon={Smile}
              label="Smile"
              value={sensor.controls.isSmiling ? "Jump" : "Idle"}
              detail={`${Math.round(sensor.controls.smileScore * 100)}% confidence`}
              active={sensor.controls.isSmiling}
            />
            <MetricCard
              icon={Crosshair}
              label="Mouth"
              value={
                sensor.controls.didShoot
                  ? "Shoot"
                  : sensor.controls.isShootCoolingDown
                    ? "Cooldown"
                    : "Idle"
              }
              detail={`Open ${sensor.controls.mouthOpenRatio.toFixed(2)} / ${sensor.controls.mouthOpenThreshold.toFixed(2)}`}
              active={sensor.controls.didShoot}
            />
            <MetricCard
              icon={MoveHorizontal}
              label="Head"
              value={sensor.controls.headDirection}
              detail={`${Math.round(sensor.controls.headOffset * 100)}% offset`}
              active={sensor.controls.headDirection !== "Center"}
            />
            <MetricCard
              icon={Gauge}
              label="Calibration"
              value={sensor.controls.faceDetected ? "Tracking" : "Searching"}
              detail={sensor.calibrationMessage}
              active={sensor.controls.faceDetected}
            />
          </div>

          <section className="leaderboard-panel" aria-label="Leaderboard">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Leaderboard</p>
                <h2>Top pilots</h2>
              </div>
            </div>
            <ol className="leaderboard-list">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <li key={`${entry.name}-${entry.score}-${entry.date}`}>
                    <span>#{index + 1}</span>
                    <strong>{entry.name}</strong>
                    <em>{entry.score}</em>
                  </li>
                ))
              ) : (
                <li className="empty-score">{leaderboardStatus}</li>
              )}
            </ol>
          </section>
        </aside>
      </section>

      {!playerName && (
        <LoginModal
          credentials={credentials}
          authStatus={authStatus}
          onCredentialsChange={setCredentials}
          onSubmit={confirmPlayerName}
        />
      )}

      {playerName && showInstructions && (
        <div className="instruction-backdrop" role="presentation">
          <section
            className="instruction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructionTitle"
          >
            <div className="instruction-header">
              <img src="/facepilot-logo.svg" alt="" aria-hidden="true" />
              <div>
                <p className="eyebrow">Quick guide</p>
                <h2 id="instructionTitle">How to play FacePilot</h2>
              </div>
            </div>

            <div className="instruction-grid">
              <article>
                <Smile size={20} aria-hidden="true" />
                <span>Smile</span>
                <strong>Jump</strong>
              </article>
              <article>
                <Crosshair size={20} aria-hidden="true" />
                <span>Open mouth</span>
                <strong>Shoot 4 bullets</strong>
              </article>
              <article>
                <MoveHorizontal size={20} aria-hidden="true" />
                <span>Turn head</span>
                <strong>Move left/right</strong>
              </article>
              <article>
                <Gauge size={20} aria-hidden="true" />
                <span>Stay centered</span>
                <strong>Better tracking</strong>
              </article>
            </div>

            <ul className="instruction-list">
              <li>Destroy obstacles to earn points.</li>
              <li>Obstacle collisions reduce health based on obstacle type.</li>
              <li>When health reaches zero, one life is lost.</li>
            </ul>

            <button type="button" onClick={() => setShowInstructions(false)}>
              Got it
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;

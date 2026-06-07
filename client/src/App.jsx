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
import { MetricCard } from "./components/MetricCard.jsx";
import { LeaderboardModal } from "./components/LeaderboardModal.jsx";
import { UsernameMenu } from "./components/UsernameMenu.jsx";
import { useFaceControls } from "./hooks/useFaceControls.js";
import { fetchLeaderboard, submitScore } from "./services/leaderboardApi.js";
import { fetchUsernamePrefixes } from "./services/userApi.js";
import {
  generateAnonymousUsername,
  readStoredUsername,
  storeUsername,
} from "./services/usernameGenerator.js";

const USERNAME_STORAGE_KEY =
  import.meta.env.VITE_USERNAME_STORAGE_KEY || "facepilot.username";

function App() {
  const sensor = useFaceControls();
  const fullscreenRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerName, setPlayerName] = useState(() =>
    readStoredUsername(USERNAME_STORAGE_KEY),
  );
  const [isUsernameLoading, setIsUsernameLoading] = useState(
    () => !readStoredUsername(USERNAME_STORAGE_KEY),
  );
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] =
    useState("Loading scores...");
  const [gameOverModal, setGameOverModal] = useState({
    open: false,
    score: 0,
    isSaving: false,
  });

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

  useEffect(() => {
    let cancelled = false;

    const resolveIdentity = async () => {
      const storedUsername = readStoredUsername(USERNAME_STORAGE_KEY);

      if (storedUsername) {
        return;
      }

      try {
        const prefixes = await fetchUsernamePrefixes();
        const nextUsername = generateAnonymousUsername(prefixes);

        if (cancelled) {
          return;
        }

        storeUsername(USERNAME_STORAGE_KEY, nextUsername);
        setPlayerName(nextUsername);
      } catch {
        const fallbackUsername = generateAnonymousUsername();

        if (cancelled) {
          return;
        }

        storeUsername(USERNAME_STORAGE_KEY, fallbackUsername);
        setPlayerName(fallbackUsername);
      } finally {
        if (!cancelled) {
          setIsUsernameLoading(false);
        }
      }
    };

    resolveIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await fullscreenRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  };

  const handleGameOver = async (score) => {
    const finalScore = Math.floor(score);

    setGameOverModal({
      open: true,
      score: finalScore,
      isSaving: Boolean(playerName && finalScore > 0),
    });

    if (!playerName) {
      setGameOverModal((current) => ({ ...current, isSaving: false }));
      return;
    }

    try {
      const scores =
        finalScore > 0
          ? await submitScore({
              username: playerName,
              score: finalScore,
            })
          : await fetchLeaderboard();

      setLeaderboard(scores);
      setLeaderboardStatus(scores.length ? "" : "No scores yet");
    } catch {
      setLeaderboardStatus("Could not save score");
    } finally {
      setGameOverModal((current) => ({ ...current, isSaving: false }));
    }
  };

  const closeGameOverModal = () => {
    setGameOverModal((current) => ({ ...current, open: false }));
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
            {isUsernameLoading ? (
              <span
                className="username-loading-chip user-chip"
                aria-live="polite"
                aria-busy="true"
              >
                <Loader2 size={16} className="spin" aria-hidden="true" />
                Assigning pilot...
              </span>
            ) : (
              playerName && (
                <UsernameMenu
                  username={playerName}
                  storageKey={USERNAME_STORAGE_KEY}
                  onUsernameChange={setPlayerName}
                />
              )
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
              onGameOver={handleGameOver}
              sensorActions={
                <div className="game-sensor-actions">
                  <button
                    type="button"
                    className="sensor-start-button"
                    onClick={sensor.start}
                    disabled={
                      isUsernameLoading ||
                      !playerName ||
                      sensor.isBooting ||
                      sensor.isRunning
                    }
                  >
                    <Play size={18} />
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

      <LeaderboardModal
        open={gameOverModal.open}
        score={gameOverModal.score}
        playerName={playerName}
        leaderboard={leaderboard}
        status={leaderboardStatus}
        isSaving={gameOverModal.isSaving}
        onClose={closeGameOverModal}
      />
    </main>
  );
}

export default App;

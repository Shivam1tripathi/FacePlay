import { Loader2, RotateCcw, Square, Trophy, X } from "lucide-react";

export function LeaderboardModal({
  open,
  variant = "gameOver",
  score,
  playerName,
  leaderboard,
  playerEntry,
  status,
  isLoading,
  onRestart,
  onStop,
  onClose,
}) {
  if (!open) {
    return null;
  }

  const isLeaderboardVariant = variant === "leaderboard";

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose}>
      <div
        className={`leaderboard-modal${isLeaderboardVariant ? " leaderboard-modal--board" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-leaderboard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="leaderboard-modal-topbar">
          <div>
            <p className="eyebrow">
              {isLeaderboardVariant ? "Leaderboard" : "Game over"}
            </p>
            <h2 id="game-over-leaderboard-title">
              {isLeaderboardVariant ? "Top pilots" : "Top pilots"}
            </h2>
          </div>
          <button
            type="button"
            className="leaderboard-modal-close"
            onClick={onClose}
            aria-label="Close leaderboard"
          >
            <X size={18} />
          </button>
        </div>

        {!isLeaderboardVariant && (
          <p className="leaderboard-modal-score">
            Your run: <strong>{Math.floor(score)}</strong>
            {playerName && (
              <>
                {" "}
                as <strong>{playerName}</strong>
              </>
            )}
          </p>
        )}

        {isLoading ? (
          <p className="leaderboard-modal-status">
            <Loader2 size={16} className="spin" aria-hidden="true" />
            {isLeaderboardVariant ? "Loading leaderboard..." : "Saving score..."}
          </p>
        ) : null}

        <div className="leaderboard-modal-section">
          <p className="leaderboard-modal-section-title">Top 5</p>
          <ol className="leaderboard-list leaderboard-modal-list">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => {
                const isCurrentPlayer =
                  playerName &&
                  (entry.username === playerName || entry.name === playerName);

                return (
                  <li
                    key={`${entry.name}-${entry.score}-${entry.rank ?? entry.date}`}
                    className={isCurrentPlayer ? "is-current-player" : undefined}
                  >
                    <span>#{entry.rank ?? "?"}</span>
                    <strong>{entry.name}</strong>
                    <em>{entry.score}</em>
                  </li>
                );
              })
            ) : (
              <li className="empty-score">{status || "No scores yet"}</li>
            )}
          </ol>
        </div>

        <div className="leaderboard-modal-rank">
          <p className="leaderboard-modal-section-title">
            <Trophy size={14} />
            Your rank
          </p>
          {playerEntry ? (
            <div className="leaderboard-modal-rank-row">
              <span>#{playerEntry.rank ?? "?"}</span>
              <strong>{playerEntry.name}</strong>
              <em>{playerEntry.score}</em>
            </div>
          ) : (
            <div className="leaderboard-modal-rank-row is-muted">
              <span>--</span>
              <strong>{playerName || "Pilot"}</strong>
              <em>0</em>
            </div>
          )}
        </div>

        <div className="leaderboard-modal-actions">
          {isLeaderboardVariant ? (
            <button type="button" className="leaderboard-modal-continue" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="leaderboard-modal-stop" onClick={onStop}>
                <Square size={16} />
                Stop game
              </button>
              <button type="button" className="leaderboard-modal-continue" onClick={onRestart}>
                <RotateCcw size={16} />
                Restart game
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

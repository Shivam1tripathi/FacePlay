import { Loader2 } from "lucide-react";

export function LeaderboardModal({
  open,
  score,
  playerName,
  leaderboard,
  status,
  isSaving,
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose}>
      <div
        className="leaderboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-leaderboard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Game over</p>
        <h2 id="game-over-leaderboard-title">Top pilots</h2>
        <p className="leaderboard-modal-score">
          Your run: <strong>{Math.floor(score)}</strong>
          {playerName && (
            <>
              {" "}
              as <strong>{playerName}</strong>
            </>
          )}
        </p>

        {isSaving ? (
          <p className="leaderboard-modal-status">
            <Loader2 size={16} className="spin" aria-hidden="true" />
            Saving score...
          </p>
        ) : null}

        <ol className="leaderboard-list leaderboard-modal-list">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => {
              const isCurrentPlayer =
                playerName &&
                (entry.username === playerName || entry.name === playerName);

              return (
                <li
                  key={`${entry.name}-${entry.score}-${entry.date}`}
                  className={isCurrentPlayer ? "is-current-player" : undefined}
                >
                  <span>#{index + 1}</span>
                  <strong>{entry.name}</strong>
                  <em>{entry.score}</em>
                </li>
              );
            })
          ) : (
            <li className="empty-score">{status || "No scores yet"}</li>
          )}
        </ol>

        <button type="button" className="leaderboard-modal-continue" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}

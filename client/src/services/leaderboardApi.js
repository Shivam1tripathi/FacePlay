const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchLeaderboard({ username } = {}) {
  const query = username ? `?username=${encodeURIComponent(username)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/leaderboard${query}`);

  if (!response.ok) {
    throw new Error('Could not fetch leaderboard');
  }

  const data = await response.json();
  return {
    scores: normalizeScores(data.scores),
    playerEntry: normalizeScore(data.playerEntry)
  };
}

export async function submitScore({ username, score }) {
  const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, score })
  });

  if (!response.ok) {
    throw new Error('Could not submit score');
  }

  const data = await response.json();
  return {
    scores: normalizeScores(data.scores),
    playerEntry: normalizeScore(data.playerEntry)
  };
}

export function normalizeScores(scores) {
  return Array.isArray(scores)
    ? scores.map((entry) => ({
        name: entry.name,
        username: entry.username || entry.name,
        score: Number(entry.score) || 0,
        date: entry.createdAt || entry.date || new Date().toISOString()
      }))
    : [];
}

function normalizeScore(entry) {
  if (!entry) {
    return null;
  }

  return {
    name: entry.name,
    username: entry.username || entry.name,
    score: Number(entry.score) || 0,
    rank: Number(entry.rank) || null,
    date: entry.createdAt || entry.date || new Date().toISOString()
  };
}


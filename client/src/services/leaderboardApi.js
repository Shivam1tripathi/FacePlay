const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/api/leaderboard`);

  if (!response.ok) {
    throw new Error('Could not fetch leaderboard');
  }

  const data = await response.json();
  return normalizeScores(data.scores);
}

export async function submitScore({ username, password, score }) {
  const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password, score })
  });

  if (!response.ok) {
    throw new Error('Could not submit score');
  }

  const data = await response.json();
  return normalizeScores(data.scores);
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

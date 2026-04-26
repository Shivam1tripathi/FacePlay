const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function startUserSession({ username, password }) {
  const response = await fetch(`${API_BASE_URL}/api/users/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not start user session');
  }

  const data = await response.json();
  return data.user;
}

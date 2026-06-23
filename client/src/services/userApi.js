const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchUsernamePrefixes() {
  const response = await fetch(`${API_BASE_URL}/api/usernames`);

  if (!response.ok) {
    throw new Error('Could not load username prefixes');
  }

  const data = await response.json();
  return Array.isArray(data.prefixes) ? data.prefixes : [];
}

export async function changeUsername({ username }) {
  const response = await fetch(`${API_BASE_URL}/api/users/change-username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not change username');
  }

  const data = await response.json();
  return data.user;
}

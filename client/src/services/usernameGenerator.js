const FALLBACK_PREFIXES = ['Shadow', 'Nova', 'Mystic', 'Blaze', 'Phantom', 'Orbit', 'Zenith'];

export function generateAnonymousUsername(prefixes = FALLBACK_PREFIXES) {
  const pool = Array.isArray(prefixes) && prefixes.length > 0 ? prefixes : FALLBACK_PREFIXES;
  const prefix = pool[Math.floor(Math.random() * pool.length)] || 'Nova';
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}_${suffix}`;
}

export function readStoredUsername(storageKey) {
  try {
    return window.localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

export function storeUsername(storageKey, username) {
  try {
    window.localStorage.setItem(storageKey, username);
  } catch {
    // Ignore storage failures and keep the app usable.
  }
}

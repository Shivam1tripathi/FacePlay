import { Username } from '../models/Username.js';

const DEFAULT_USERNAME_LABELS = [
  'Shadow',
  'Nova',
  'Mystic',
  'Blaze',
  'Phantom',
  'Orbit',
  'Zenith',
  'Echo',
  'Vortex',
  'Rune'
];

export async function ensureDefaultUsernames() {
  const count = await Username.countDocuments();

  if (count > 0) {
    return;
  }

  await Username.insertMany(
    DEFAULT_USERNAME_LABELS.map((label) => ({
      label
    })),
    { ordered: false }
  );
}

export async function getActiveUsernamePrefixes() {
  const usernames = await Username.find({ active: true })
    .sort({ label: 1 })
    .select('label')
    .lean();

  return usernames.map((entry) => entry.label);
}

export function buildAnonymousUsername(prefixes = DEFAULT_USERNAME_LABELS) {
  const pool = prefixes.length > 0 ? prefixes : DEFAULT_USERNAME_LABELS;
  const prefix = pool[Math.floor(Math.random() * pool.length)] || 'Nova';
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}_${suffix}`;
}

export function sanitizeUsernameLabel(value) {
  return String(value || '')
    .replace(/[^\w.-]/g, '')
    .trim()
    .slice(0, 24);
}

export async function addUsernameLabel(label) {
  const cleanLabel = sanitizeUsernameLabel(label);
  if (!cleanLabel) {
    throw createValidationError('Label is required');
  }

  const existing = await Username.findOne({ label: cleanLabel });

  if (existing) {
    if (!existing.active) {
      existing.active = true;
      await existing.save();
    }

    return existing;
  }

  return Username.create({ label: cleanLabel });
}

export async function addUsernameLabels(labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    throw createValidationError('Labels array is required');
  }

  const cleanLabels = [...new Set(labels.map(sanitizeUsernameLabel).filter(Boolean))];

  if (cleanLabels.length === 0) {
    throw createValidationError('At least one valid label is required');
  }

  const usernames = [];
  for (const label of cleanLabels) {
    usernames.push(await addUsernameLabel(label));
  }

  return usernames;
}

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

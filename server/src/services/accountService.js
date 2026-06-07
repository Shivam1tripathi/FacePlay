import { Account } from '../models/Account.js';
import {
  buildAnonymousUsername,
  getActiveUsernamePrefixes
} from './usernameService.js';

export async function findOrCreateAccount({ username }) {
  const cleanUsername = sanitizeUsername(username);
  if (!cleanUsername) {
    throw createValidationError('Username is required');
  }

  return findOrCreateByCleanUsername(cleanUsername);
}

export function sanitizeUsername(value) {
  return String(value || '')
    .replace(/[^\w.-]/g, '')
    .trim()
    .slice(0, 18);
}

export async function reassignAccountUsername({ username }) {
  const cleanUsername = sanitizeUsername(username);
  if (!cleanUsername) {
    throw createValidationError('Username is required');
  }

  const oldAccount = await Account.findOne({ username: cleanUsername });
  const prefixes = await getActiveUsernamePrefixes();
  const newUsername = await generateUniqueAccountUsername(prefixes, {
    exclude: [cleanUsername]
  });

  const newAccount = await Account.create({
    username: newUsername,
    displayName: newUsername,
    highScore: oldAccount?.highScore ?? 0
  });

  if (oldAccount) {
    await Account.deleteOne({ _id: oldAccount._id });
  }

  return newAccount;
}

async function generateUniqueAccountUsername(prefixes, { exclude = [], maxAttempts = 16 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = sanitizeUsername(buildAnonymousUsername(prefixes));
    if (!candidate || exclude.includes(candidate)) {
      continue;
    }

    const taken = await Account.exists({ username: candidate });
    if (!taken) {
      return candidate;
    }
  }

  const error = new Error('Could not generate a unique username');
  error.statusCode = 503;
  throw error;
}

async function findOrCreateByCleanUsername(cleanUsername) {
  const existingAccount = await Account.findOne({ username: cleanUsername });

  if (existingAccount) {
    return existingAccount;
  }

  return Account.create({
    username: cleanUsername,
    displayName: cleanUsername
  });
}

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

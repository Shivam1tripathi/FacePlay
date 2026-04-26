import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);

  return {
    passwordHash: derivedKey.toString('hex'),
    passwordSalt: salt
  };
}

export async function verifyPassword(password, passwordHash, passwordSalt) {
  const derivedKey = await scryptAsync(password, passwordSalt, KEY_LENGTH);
  const storedKey = Buffer.from(passwordHash, 'hex');

  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

import { User } from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

export async function findOrCreateUser({ username, password }) {
  const cleanUsername = sanitizeUsername(username);

  if (!cleanUsername || !password || String(password).length < 4) {
    const error = new Error(
      "Username and password with at least 4 characters are required",
    );
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ username: cleanUsername });

  if (existingUser) {
    const passwordMatches = await verifyPassword(
      password,
      existingUser.passwordHash,
      existingUser.passwordSalt,
    );

    if (!passwordMatches) {
      const error = new Error(
        "Username already exist Incorrect password for this username",
      );
      error.statusCode = 401;
      throw error;
    }

    return existingUser;
  }

  const { passwordHash, passwordSalt } = await hashPassword(password);

  return User.create({
    username: cleanUsername,
    displayName: cleanUsername,
    passwordHash,
    passwordSalt,
  });
}

export function sanitizeUsername(value) {
  return String(value || "")
    .replace(/[^\w.-]/g, "")
    .trim()
    .toLowerCase()
    .slice(0, 18);
}

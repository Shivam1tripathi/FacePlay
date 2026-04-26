import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { User } from '../models/User.js';
import { findOrCreateUser } from '../services/userService.js';

const router = Router();

router.get('/', async (_request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const scores = await User.find({ highScore: { $gt: 0 } })
      .sort({ highScore: -1, updatedAt: 1 })
      .limit(5)
      .select('displayName username highScore updatedAt')
      .lean();

    return response.json({ scores: mapUsersToScores(scores) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const user = await findOrCreateUser({
      username: request.body?.username,
      password: request.body?.password
    });
    const score = Math.floor(Number(request.body?.score));

    if (!Number.isFinite(score) || score <= 0) {
      return response.status(400).json({ message: 'Positive score is required' });
    }

    if (score > user.highScore) {
      user.highScore = score;
      await user.save();
    }

    const scores = await User.find({ highScore: { $gt: 0 } })
      .sort({ highScore: -1, updatedAt: 1 })
      .limit(5)
      .select('displayName username highScore updatedAt')
      .lean();

    return response.status(201).json({ scores: mapUsersToScores(scores) });
  } catch (error) {
    return next(error);
  }
});

function mapUsersToScores(users) {
  return users.map((user) => ({
    name: user.displayName,
    username: user.username,
    score: user.highScore,
    createdAt: user.updatedAt
  }));
}

export { router as leaderboardRouter };

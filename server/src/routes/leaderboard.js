import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { Account } from '../models/Account.js';
import { findOrCreateAccount } from '../services/accountService.js';

const router = Router();

router.get('/', async (_request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const scores = await Account.find({ highScore: { $gt: 0 } })
      .sort({ highScore: -1, updatedAt: 1 })
      .limit(5)
      .select('displayName username highScore updatedAt')
      .lean();

    return response.json({ scores: mapAccountsToScores(scores) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const account = await findOrCreateAccount({
      username: request.body?.username
    });
    const score = Math.floor(Number(request.body?.score));

    if (!Number.isFinite(score) || score <= 0) {
      return response.status(400).json({ message: 'Positive score is required' });
    }

    if (score > account.highScore) {
      account.highScore = score;
      await account.save();
    }

    const scores = await Account.find({ highScore: { $gt: 0 } })
      .sort({ highScore: -1, updatedAt: 1 })
      .limit(5)
      .select('displayName username highScore updatedAt')
      .lean();

    return response.status(201).json({ scores: mapAccountsToScores(scores) });
  } catch (error) {
    return next(error);
  }
});

function mapAccountsToScores(accounts) {
  return accounts.map((account) => ({
    name: account.displayName,
    username: account.username,
    score: account.highScore,
    createdAt: account.updatedAt
  }));
}

export { router as leaderboardRouter };

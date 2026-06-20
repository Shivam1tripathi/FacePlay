import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { Account } from '../models/Account.js';
import { findOrCreateAccount } from '../services/accountService.js';
import { sanitizeUsername } from '../services/accountService.js';

const router = Router();

router.get('/', async (_request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const username = sanitizeUsername(_request.query?.username);
    const scores = await Account.find({ highScore: { $gt: 0 } })
      .sort({ highScore: -1, updatedAt: 1 })
      .limit(5)
      .select('displayName username highScore updatedAt')
      .lean();

    const playerEntry = username
      ? await getPlayerLeaderboardEntry(username)
      : null;

    return response.json({
      scores: mapAccountsToScores(scores),
      playerEntry: mapAccountToScore(playerEntry)
    });
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

    const playerEntry = await getPlayerLeaderboardEntry(account.username);

    return response.status(201).json({
      scores: mapAccountsToScores(scores),
      playerEntry: mapAccountToScore(playerEntry)
    });
  } catch (error) {
    return next(error);
  }
});

function mapAccountsToScores(accounts) {
  return accounts.map((account, index) => ({
    name: account.displayName,
    username: account.username,
    score: account.highScore,
    rank: index + 1,
    createdAt: account.updatedAt
  }));
}

async function getPlayerLeaderboardEntry(username) {
  const account = await Account.findOne({ username })
    .select('displayName username highScore updatedAt')
    .lean();

  if (!account || account.highScore <= 0) {
    return null;
  }

  const aheadCount = await Account.countDocuments({
    $or: [
      { highScore: { $gt: account.highScore } },
      { highScore: account.highScore, updatedAt: { $lt: account.updatedAt } }
    ]
  });

  return {
    ...account,
    rank: aheadCount + 1
  };
}

function mapAccountToScore(account) {
  if (!account) {
    return null;
  }

  return {
    name: account.displayName,
    username: account.username,
    score: account.highScore,
    rank: account.rank,
    createdAt: account.updatedAt
  };
}

export { router as leaderboardRouter };

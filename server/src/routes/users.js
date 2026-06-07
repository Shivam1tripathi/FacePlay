import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { reassignAccountUsername } from '../services/accountService.js';

const router = Router();

router.post('/change-username', async (request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const account = await reassignAccountUsername({
      username: request.body?.username
    });

    return response.json({
      user: {
        username: account.username,
        displayName: account.displayName,
        highScore: account.highScore
      }
    });
  } catch (error) {
    return next(error);
  }
});

export { router as usersRouter };

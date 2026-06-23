import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { getActiveUsernamePrefixes } from '../services/usernameService.js';

const router = Router();

router.get('/prefixes', async (_request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const prefixes = await getActiveUsernamePrefixes();

    return response.json({ prefixes });
  } catch (error) {
    return next(error);
  }
});

export { router as identityRouter };

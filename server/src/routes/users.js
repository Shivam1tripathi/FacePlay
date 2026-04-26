import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { findOrCreateUser } from '../services/userService.js';

const router = Router();

router.post('/session', async (request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    const user = await findOrCreateUser({
      username: request.body?.username,
      password: request.body?.password
    });

    return response.json({
      user: {
        username: user.username,
        displayName: user.displayName
      }
    });
  } catch (error) {
    return next(error);
  }
});

export { router as usersRouter };

import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import {
  addUsernameLabel,
  addUsernameLabels,
  getActiveUsernamePrefixes
} from '../services/usernameService.js';

const router = Router();

router.get('/', async (_request, response, next) => {
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

router.post('/', async (request, response, next) => {
  try {
    if (!isDatabaseConnected()) {
      return response.status(503).json({ message: 'Database unavailable' });
    }

    if (Array.isArray(request.body?.labels)) {
      const usernames = await addUsernameLabels(request.body.labels);

      return response.status(201).json({
        usernames: usernames.map((entry) => ({
          label: entry.label,
          active: entry.active
        }))
      });
    }

    const username = await addUsernameLabel(request.body?.label);

    return response.status(201).json({
      username: {
        label: username.label,
        active: username.active
      }
    });
  } catch (error) {
    return next(error);
  }
});

export { router as usernamesRouter };

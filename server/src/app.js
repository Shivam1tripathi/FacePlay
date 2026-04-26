import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import { isDatabaseConnected } from './config/database.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );
  app.use(cors({ origin: getAllowedOrigins() }));
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'facepilot-api',
      milestone: 'leaderboard',
      database: isDatabaseConnected() ? 'connected' : 'unavailable'
    });
  });

  app.use('/api/users', usersRouter);
  app.use('/api/leaderboard', leaderboardRouter);

  if (process.env.NODE_ENV === 'production' && existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    app.get('*', (_request, response) => {
      response.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Internal server error' });
  });

  return app;
}

function getAllowedOrigins() {
  const configuredOrigin = process.env.CLIENT_ORIGIN;

  if (!configuredOrigin) {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  return configuredOrigin.split(',').map((origin) => origin.trim());
}

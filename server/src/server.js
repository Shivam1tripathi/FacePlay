import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { ensureDefaultUsernames } from './services/usernameService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const port = Number(process.env.PORT || 5000);

await connectDatabase();
await ensureDefaultUsernames();

const app = createApp();
app.listen(port, () => {
  console.log(`FacePilot API listening on http://localhost:${port}`);
});

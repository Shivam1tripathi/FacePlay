import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const port = Number(process.env.PORT || 5000);

await connectDatabase();

const app = createApp();
app.listen(port, () => {
  console.log(`FacePilot API listening on http://localhost:${port}`);
});

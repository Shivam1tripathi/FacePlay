import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const port = Number(process.env.PORT || 5000);
const app = createApp();

app.listen(port, () => {
  console.log(`FacePilot API listening on http://localhost:${port}`);
});

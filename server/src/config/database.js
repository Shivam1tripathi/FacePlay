import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('MONGODB_URI is not set. Leaderboard API will return database unavailable.');
    return;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected for FacePilot leaderboard');
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

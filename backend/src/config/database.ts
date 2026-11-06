import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connects to MongoDB using MONGODB_URI.
 * Fails safely and gracefully if MONGODB_URI is absent or unreachable,
 * allowing the server to start and run existing simulated features without crashing.
 */
export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || uri.includes('your_mongodb_uri')) {
    console.log('[Database] MONGODB_URI not set. Running in simulated fallback mode.');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log('[Database] Connected successfully to MongoDB');

    mongoose.connection.on('error', (err) => {
      console.warn('[Database] MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
      isConnected = false;
    });

    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Database] MongoDB connection notice: ${message}. Server will continue in fallback mode.`);
    isConnected = false;
    return false;
  }
}

/**
 * Checks whether MongoDB is currently connected and ready.
 */
export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Disconnects from MongoDB (useful for test tear-downs).
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

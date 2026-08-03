import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/photobooth';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnected: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  isConnected: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<{ mongoose: typeof mongoose | null; isConnected: boolean }> {
  if (cached.conn && cached.isConnected) {
    return { mongoose: cached.conn, isConnected: true };
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500, // Fast timeout if MongoDB service is not running locally
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      cached.isConnected = true;
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    cached.isConnected = true;
    return { mongoose: cached.conn, isConnected: true };
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    cached.isConnected = false;
    console.warn('⚠️ MongoDB not accessible (ECONNREFUSED). Operating in Standalone Memory/JSON DB Fallback mode.');
    return { mongoose: null, isConnected: false };
  }
}

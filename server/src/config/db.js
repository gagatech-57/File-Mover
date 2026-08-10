import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`🍃 Connected to MongoDB Atlas: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB Atlas Connection Error:', err.message);
    // Fall back gracefully if offline, maintaining temporary in-memory store
    console.warn('⚠️ Server will operate with in-memory session cache');
  }
}

import mongoose from "mongoose";

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Wait 10s before failing
      connectTimeoutMS: 10000,
    });
    console.log("MongoDB Connected successfully.");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    // Don't throw, let the app try to survive or retry on next request
  }
}

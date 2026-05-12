import mongoose from "mongoose";

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Mask password for safe logging
    const maskedUri = uri.replace(/:([^:@]{1,})@/, ':****@');
    console.log(`Connecting to MongoDB with URI: ${maskedUri}`);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // Increased timeout
      connectTimeoutMS: 15000,
    });
    console.log("MongoDB Connected successfully.");
  } catch (err) {
    console.error("CRITICAL: MongoDB connection error details:", {
      message: err.message,
      code: err.code,
      codeName: err.codeName
    });
    // Rethrow to ensure middleware knows it failed
    throw err;
  }
}

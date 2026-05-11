import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});

const scanHistorySchema = new mongoose.Schema({
  user_id: { type: Number, required: true }, // Keeping as Number for compatibility with existing logic
  element_name: String,
  confidence: Number,
  symptoms: String,
  causes: String,
  recommendations: String,
  image_thumbnail: String,
  input_mode: { type: String, default: "image" },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
});

const cacheSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  data: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now, expires: "7d" } // Auto-delete after 7 days
});

export const User = mongoose.model("User", userSchema);
export const ScanHistory = mongoose.model("ScanHistory", scanHistorySchema);
export const Setting = mongoose.model("Setting", settingsSchema);
export const Cache = mongoose.model("Cache", cacheSchema);

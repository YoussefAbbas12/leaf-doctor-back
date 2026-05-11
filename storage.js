import { User, ScanHistory, Setting, Cache } from "./models.js";

class Storage {
  // ─── Settings ──────────────────────────────────────────────────────────────
  async getAdminSetting(key) {
    const setting = await Setting.findOne({ key });
    return setting ? setting.value : null;
  }

  async setAdminSetting(key, value) {
    await Setting.updateOne({ key }, { value }, { upsert: true });
  }

  async getElementRecommendations() {
    const setting = await Setting.findOne({ key: "element_recommendations" });
    return setting ? setting.value : {};
  }

  async setElementRecommendations(data) {
    await Setting.updateOne({ key: "element_recommendations" }, { value: data }, { upsert: true });
  }

  // ─── Users ─────────────────────────────────────────────────────────────────
  async createUser(email, hashedPassword) {
    const count = await User.countDocuments();
    const id = count + 1;
    const user = new User({ id, email, password: hashedPassword });
    await user.save();
    return { id, email: user.email };
  }

  async getUserByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async getUserById(id) {
    return await User.findOne({ id });
  }

  // ─── Scan History ──────────────────────────────────────────────────────────
  async saveScanHistory(userId, { element_name, confidence, symptoms, causes, recommendations, image_thumbnail, input_mode }) {
    const entry = new ScanHistory({
      user_id: userId,
      element_name,
      confidence,
      symptoms: symptoms || null,
      causes: causes || null,
      recommendations: recommendations || null,
      image_thumbnail: image_thumbnail || null,
      input_mode: input_mode || "image"
    });
    await entry.save();
    return { id: entry._id };
  }

  async getUserHistory(userId) {
    return await ScanHistory.find({ user_id: userId }).sort({ created_at: -1 });
  }

  // ─── Cache ─────────────────────────────────────────────────────────────────
  async getCache(hash) {
    const cached = await Cache.findOne({ hash });
    return cached ? cached.data : null;
  }

  async setCache(hash, data) {
    await Cache.updateOne({ hash }, { data }, { upsert: true });
  }
}

export const storage = new Storage();

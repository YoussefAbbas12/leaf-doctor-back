import { pgTable, text, serial, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
const diseases = pgTable("diseases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  symptoms: text("symptoms").notNull(),
  causes: text("causes").notNull(),
  treatmentOrganic: text("treatment_organic").notNull(),
  treatmentChemical: text("treatment_chemical").notNull()
});
const scanHistory = pgTable("scan_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  imageUrl: text("image_url").notNull(),
  diseaseId: integer("disease_id").references(() => diseases.id),
  confidence: numeric("confidence").notNull()
});
const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull()
});
const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
const insertDiseaseSchema = createInsertSchema(diseases).omit({ id: true });
const insertScanHistorySchema = createInsertSchema(scanHistory).omit({ id: true });
const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({ id: true });
export {
  adminSettings,
  diseases,
  insertAdminSettingSchema,
  insertDiseaseSchema,
  insertScanHistorySchema,
  insertUserSchema,
  scanHistory,
  users
};

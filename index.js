import "dotenv/config";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import cors from "cors";
import { connectDB } from "./database.js";

const app = express();

// CORS configuration for web and mobile
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost",
    "capacitor://localhost",
    /\.vercel\.app$/,
    "https://leaf-doctor-back.vercel.app"
  ],
  credentials: true
}));

const httpServer = createServer(app);
const MemStore = MemoryStore(session);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || "doctorplant-secret-2024",
  resave: false,
  saveUninitialized: false,
  store: new MemStore({ checkPeriod: 86400000 }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  },
}));

// Simple Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is live" });
});

app.get("/", (req, res) => {
  res.send("<h1>Leaf Doctor API is running!</h1>");
});

// Async initialization wrapped in a promise to prevent freezing
const initApp = async () => {
  try {
    console.log("Initializing database...");
    await connectDB();
    console.log("Registering routes...");
    await registerRoutes(httpServer, app);
    console.log("Init complete.");
  } catch (err) {
    console.error("Initialization failed:", err);
  }
};

// Start init but don't block the export
initApp();

// Local server startup
if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;

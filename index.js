import "dotenv/config";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import cors from "cors";
import { connectDB } from "./database.js";

const app = express();

// Increase payload limits for large images
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

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

// Root route
app.get("/", (req, res) => {
  res.send("<h1>Leaf Doctor API is running!</h1>");
});

// Database middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: "Database connection failed" });
  }
});

// Register routes
await registerRoutes(httpServer, app);

// Handle 404 for all other requests as JSON (prevents HTML errors)
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Error handling middleware
app.use((err, _req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error("Server Error:", err);
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

// Local server startup
if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`Server running locally on port ${port}`);
  });
}

export default app;

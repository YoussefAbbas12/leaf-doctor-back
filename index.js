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

// Root route
app.get("/", (req, res) => {
  res.send("<h1>Leaf Doctor API is running!</h1>");
});

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: "Database connection in progress, please try again." });
  }
});

// Register routes
await registerRoutes(httpServer, app);

// Error handling middleware
app.use((err, _req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

// Local server startup
if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;

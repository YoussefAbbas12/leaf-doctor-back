import "dotenv/config";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
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
    /\.vercel\.app$/ // Allow all Vercel subdomains
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
    secure: false, // Set to true if using HTTPS in production
  },
}));

function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Middleware for logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });
// Root route for health check
app.get("/", (req, res) => {
  res.send("<h1>Leaf Doctor API is running!</h1><p>Frontend is hosted separately.</p>");
});

next();
});

// Async initialization
await connectDB();
await registerRoutes(httpServer, app);

// Error handling middleware
app.use((err, _req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

// Static serving for production (only if not on Vercel)
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  serveStatic(app);
}

// Local server startup (Skipped on Vercel)
if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`Server running locally on port ${port}`);
  });
}

export default app;
export { log };

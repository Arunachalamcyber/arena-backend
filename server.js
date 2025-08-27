// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const app = express();

/* ---------- CORS ---------- */
// Make sure ALLOWED_ORIGINS on Render includes your real frontends:
// http://localhost:5173, https://arunachalamcyber.github.io, https://arunachalamcyber.github.io/Code_-Arena_2025
const raw = process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173";
const ALLOWED_ORIGINS = raw.split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/server-to-server
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return cb(new Error("CORS policy: origin not allowed"), false);
    }
    return cb(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
// Optional: handle preflight explicitly (usually not required, but harmless)
app.options("*", cors(corsOptions));

/* ---------- Middleware ---------- */
app.use(express.json({ limit: "1mb" }));
app.use(helmet());
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

/* ---------- Models (import after app init) ---------- */
import "./models/User.js";
import "./models/Question.js";
import "./models/Submission.js";

/* ---------- Routes ---------- */
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";
import runRouter from "./routes/run.js";
import adminRouter from "./routes/admin.js";

app.use("/api/questions", questionsRouter);
app.use("/api/users", usersRouter);
app.use("/api/run", runRouter);
app.use("/api/admin", adminRouter);

// Health
app.get("/", (_req, res) => res.json({ ok: true, service: "Code Arena API" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- Error handling (CORS + generic) ---------- */
app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith("CORS policy")) {
    return res.status(403).json({ error: "cors_denied", detail: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "server_error" });
});

/* ---------- Start only after Mongo connects ---------- */
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌ MONGO_URI missing in environment");
  process.exit(1);
}

try {
  await mongoose.connect(uri, {
    dbName: "code_arena",
    serverSelectionTimeoutMS: 8000, // faster fail if Atlas not reachable
  });
  console.log("✅ MongoDB connected");

  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 API listening on http://${HOST}:${PORT}`);
  });

  // Graceful shutdown (Render sends SIGTERM on redeploy)
  process.on("SIGTERM", async () => {
    console.log("⏩ Shutting down...");
    server.close(() => console.log("HTTP server closed"));
    await mongoose.connection.close();
    process.exit(0);
  });

} catch (err) {
  console.error("❌ Mongo error:", err?.message || err);
  process.exit(1);
}

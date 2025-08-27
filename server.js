// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const app = express();

/* ------------------ CORS ------------------
   Read ALLOWED_ORIGINS from env (comma-separated).
   Default allows localhost dev ports so local testing works.
*/
const raw = process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173";
const ALLOWED_ORIGINS = raw.split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) === -1){
      return callback(new Error("CORS policy: origin not allowed"), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// --- Middleware (after CORS, before routes) ---
app.use(express.json({ limit: "1mb" }));
app.use(helmet());
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// --- DB ---
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌ MONGO_URI missing in .env");
  process.exit(1);
}
mongoose
  .connect(uri, { dbName: "code_arena" })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ Mongo error:", err.message);
    process.exit(1);
  });

// --- Models ---
import "./models/User.js";
import "./models/Question.js";
import "./models/Submission.js";

// --- Routes ---
import questionsRouter from "./routes/questions.js";
import usersRouter from "./routes/users.js";
import runRouter from "./routes/run.js";
import adminRouter from "./routes/admin.js";

app.use("/api/questions", questionsRouter);
app.use("/api/users", usersRouter);
app.use("/api/run", runRouter);
app.use("/api/admin", adminRouter);

// health
app.get("/", (_req, res) => res.json({ ok: true, service: "Code Arena API" }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🚀 API listening on http://localhost:${port}`));

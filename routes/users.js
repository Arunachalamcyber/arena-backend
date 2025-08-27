// routes/users.js
import { Router } from "express";
import User from "../models/User.js";

const r = Router();

/* ---------------- helpers ---------------- */
const norm = (s = "") => s.toString().trim();
const makeTeamId = (a, b) =>
  `${norm(a)}-${norm(b)}`.toLowerCase().replace(/\s+/g, "_");

/* 
POST /api/users
Body can be:
  { m1, m2 } 
  { member1, member2 }
Optionally: { teamId }
Upserts the user and sets loginAt to now.
Returns the user document.
*/
r.post("/", async (req, res) => {
  try {
    const m1 = norm(req.body.m1 ?? req.body.member1);
    const m2 = norm(req.body.m2 ?? req.body.member2);
    if (!m1 || !m2) {
      return res.status(400).json({ error: "m1/m2 (or member1/member2) required" });
    }

    const teamId = norm(req.body.teamId) || makeTeamId(m1, m2);

    // Upsert: create if missing; always update loginAt on login
    const user = await User.findOneAndUpdate(
      { teamId },
      {
        $setOnInsert: { m1, m2, teamId, points: 0, currentQ: 0, submitted: {} },
        $set: { loginAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // If user existed, ensure names are up to date (avoid surprising overwrites on every hit)
    if (user.m1 !== m1 || user.m2 !== m2) {
      user.m1 = m1;
      user.m2 = m2;
      await user.save();
    }

    return res.json(user);
  } catch (e) {
    console.error("users POST error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/*
POST /api/users/submit
Body: { teamId, qIndex, points?=5 }
Marks question as submitted once and increments points.
Idempotent per (teamId, qIndex).
*/
r.post("/submit", async (req, res) => {
  try {
    const teamId = norm(req.body.teamId);
    const qIndex = Number(req.body.qIndex);
    const award = Number.isFinite(req.body.points) ? Number(req.body.points) : 5;

    if (!teamId || !Number.isInteger(qIndex)) {
      return res.status(400).json({ error: "teamId and integer qIndex required" });
    }

    const user = await User.findOne({ teamId });
    if (!user) return res.status(404).json({ error: "user_not_found" });

    const key = String(qIndex);

    if (user.submitted?.get?.(key) || user.submitted?.[key]) {
      // already submitted — return current points; do not double count
      return res.json({ ok: true, already: true, points: user.points });
    }

    // Mark submitted and add points
    if (user.submitted?.set) {
      user.submitted.set(key, true); // Map style
    } else {
      user.submitted = { ...(user.submitted || {}), [key]: true }; // plain object fallback
    }
    user.points = (user.points || 0) + award;
    await user.save();

    return res.json({ ok: true, points: user.points });
  } catch (e) {
    console.error("submit error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/*
PATCH /api/users/:teamId
Body: any subset of { points, currentQ, submitted, exitAt }
(You can expand allowed fields as you need.)
*/
r.patch("/:teamId", async (req, res) => {
  try {
    const teamId = norm(req.params.teamId);
    if (!teamId) return res.status(400).json({ error: "teamId required" });

    const allowed = {};
    if (Number.isFinite(req.body.points)) allowed.points = Number(req.body.points);
    if (Number.isInteger(req.body.currentQ)) allowed.currentQ = Number(req.body.currentQ);
    if (req.body.submitted && typeof req.body.submitted === "object") {
      allowed.submitted = req.body.submitted;
    }
    if (req.body.exitAt) allowed.exitAt = new Date(req.body.exitAt);

    const user = await User.findOneAndUpdate({ teamId }, { $set: allowed }, { new: true });
    if (!user) return res.status(404).json({ error: "user_not_found" });

    return res.json(user);
  } catch (e) {
    console.error("users PATCH error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* GET /api/users  (admin list) */
r.get("/", async (_req, res) => {
  try {
    const users = await User.find({}).lean();
    return res.json(users);
  } catch (e) {
    console.error("users GET list error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

/* GET /api/users/:teamId  (helper) */
r.get("/:teamId", async (req, res) => {
  try {
    const teamId = norm(req.params.teamId);
    const user = await User.findOne({ teamId }).lean();
    if (!user) return res.status(404).json({ error: "user_not_found" });
    return res.json(user);
  } catch (e) {
    console.error("users GET one error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

export default r;

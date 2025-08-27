import { Router } from "express";
import User from "../models/User.js";
const r = Router();

// register/login user
r.post("/", async (req, res)=>{
  const { m1, m2 } = req.body;
  if(!m1 || !m2) return res.status(400).json({ error:"m1/m2 required" });
  const teamId = `${m1}-${m2}`.toLowerCase().replace(/\s+/g,"_");
  const user = await User.findOneAndUpdate(
    { teamId },
    { $setOnInsert: { m1, m2, teamId }, $set: { loginAt: new Date() } },
    { upsert: true, new: true }
  );
  res.json(user);
});

// update progress
r.patch("/:teamId", async (req, res)=>{
  const { teamId } = req.params;
  const update = req.body;
  const user = await User.findOneAndUpdate({ teamId }, update, { new: true });
  res.json(user);
});

// list (admin)
r.get("/", async (_req, res)=>{
  const users = await User.find({}).lean();
  res.json(users);
});

export default r;

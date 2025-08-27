import { Router } from "express";
import User from "../models/User.js";
const r = Router();

r.post("/reset", async (_req, res)=>{
  await User.deleteMany({});
  res.json({ ok:true });
});

export default r;

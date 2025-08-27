import { Router } from "express";
import axios from "axios";
const r = Router();

r.post("/", async (req, res)=>{
  const { language="python", version="3.10.0", code="", stdin="" } = req.body;
  if(!code) return res.status(400).json({ error:"code required" });

  try{
    const url = process.env.PISTON_URL; // default in .env
    // Piston format
    const { data } = await axios.post(url, {
      language, version,
      files: [{ name: "main.py", content: code }],
      stdin
    }, { timeout: 15000 });
    // Normalize a bit
    const out = (data?.run?.stdout || "") + (data?.run?.stderr || "");
    const codeExit = data?.run?.code ?? 0;
    res.json({ ok:true, output: out, exitCode: codeExit });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
});

export default r;

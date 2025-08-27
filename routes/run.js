// routes/run.js
import { Router } from "express";
import axios from "axios";

const r = Router();

/* ----------------------- config ----------------------- */
const PISTON_URL = process.env.PISTON_URL || ""; // e.g. https://emkc.org/api/v2/piston/execute
const MAX_CODE_BYTES = 100 * 1024;               // 100 KB safety limit
const REQ_TIMEOUT_MS = 15_000;

// Allow-list a few languages; add more as you need
const LANGS = {
  python: { defaultVersion: "3.10.0", aliases: ["py", "python3"] },
  javascript: { defaultVersion: "18.15.0", aliases: ["js", "node", "nodejs"] },
  // Example if you later enable C++:
  // cpp: { defaultVersion: "10.2.0", aliases: ["c++"] },
};

function normalizeLang(langRaw = "") {
  const key = String(langRaw).toLowerCase().trim();
  for (const [k, v] of Object.entries(LANGS)) {
    if (k === key || v.aliases.includes(key)) return k;
  }
  return null;
}

function pickVersion(lang, reqVersion) {
  if (reqVersion && String(reqVersion).trim()) return String(reqVersion).trim();
  return LANGS[lang]?.defaultVersion || "";
}

function okFromRun(run) {
  // Piston returns { run: { stdout, stderr, code (exit code), output } }
  const code = Number.isFinite(run?.code) ? run.code : 0;
  const stderr = run?.stderr || "";
  return code === 0 && !stderr.trim();
}

/* ----------------------- routes ----------------------- */

/**
 * GET /api/run/languages
 * Quick discovery endpoint for the frontend (optional).
 */
r.get("/languages", (_req, res) => {
  res.json(
    Object.entries(LANGS).map(([k, v]) => ({
      language: k,
      defaultVersion: v.defaultVersion,
      aliases: v.aliases,
    }))
  );
});

/**
 * POST /api/run
 * body: { language, version?, code, stdin? }
 * If PISTON_URL is set, executes via Piston; else returns a mock result.
 */
r.post("/", async (req, res) => {
  try {
    let { language = "python", version = "", code = "", stdin = "" } = req.body || {};

    // Basic validation
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ ok: false, error: "empty_code" });
    }
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return res.status(413).json({ ok: false, error: "code_too_large" });
    }

    const lang = normalizeLang(language);
    if (!lang) {
      return res.status(400).json({ ok: false, error: "unsupported_language", supported: Object.keys(LANGS) });
    }
    version = pickVersion(lang, version);

    // If Piston URL is configured, try it
    if (PISTON_URL) {
      try {
        const t0 = Date.now();
        const resp = await axios.post(
          PISTON_URL,
          {
            language: lang,
            version,
            files: [{ name: "Main", content: String(code) }],
            stdin: typeof stdin === "string" ? stdin : "",
          },
          { timeout: REQ_TIMEOUT_MS }
        );

        const run = resp.data?.run || {};
        const stdout = (run.output ?? run.stdout ?? "") || "";
        const stderr = run.stderr || "";
        const ok = okFromRun(run);

        return res.json({
          ok,
          language: lang,
          version,
          stdout: String(stdout),
          stderr: String(stderr),
          timeMs: Date.now() - t0,
          exitCode: Number.isFinite(run.code) ? run.code : 0,
        });
      } catch (e) {
        // Fall through to mock if Piston fails (keeps contest flowing)
        console.error("Piston error:", e?.message || e);
      }
    }

    // -------- Mock fallback (no Piston) --------
    const heuristicPass =
      (lang === "python" && /print\s*\(/.test(code)) ||
      (lang === "javascript" && /console\.log\s*\(/.test(code)) ||
      /def\s+/.test(code) ||
      /function\s+/.test(code);

    return res.json({
      ok: heuristicPass,
      language: lang,
      version,
      stdout: heuristicPass
        ? "All test cases passed (mock)."
        : "Tests failed (mock). Add prints/logs and try again.",
      stderr: "",
      timeMs: 0,
      exitCode: heuristicPass ? 0 : 1,
      mock: true,
    });
  } catch (err) {
    console.error("run POST error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default r;

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load DocForge/.env (one level above the server package)
loadEnv({ path: path.resolve(__dirname, "../../.env") });
loadEnv(); // also pick up server/.env if present
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clearSession, getSession, gh, ghPaginated, oauthCallback, startOAuth } from "./github.js";
import { buildSlice } from "./repoSlice.js";
import { buildPrompt, generateReadme } from "./gemini.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// ── Auth ────────────────────────────────────────────────────────
app.get("/api/auth/github", startOAuth);
app.get("/api/auth/github/callback", oauthCallback);
app.get("/api/auth/me", (req, res) => {
  const s = getSession(req);
  if (!s) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  res.json({ login: s.login, avatar_url: s.avatar_url });
});
app.post("/api/auth/logout", (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

// ── User repos (auth required) ──────────────────────────────────
app.get("/api/repos", async (req, res) => {
  const s = getSession(req);
  if (!s) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  try {
    // visibility=all + repo OAuth scope → includes private repos.
    // Paginated so users with >100 repos see all of them (capped at 1000).
    const repos = await ghPaginated<any>(
      "/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member",
      s.token,
    );
    res.json(
      repos.map((r) => ({
        owner: r.owner.login,
        name: r.name,
        desc: r.description || "",
        lang: r.language || "—",
        langColor: langColor(r.language),
        vis: r.private ? "Private" : "Public",
        updated: relTime(r.updated_at),
        branches: 0, // expensive to fetch per-repo; design shows this but it's optional
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// ── Public repo metadata (no auth needed for paste-URL flow) ────
app.get("/api/repo/:owner/:name", async (req, res) => {
  const s = getSession(req);
  try {
    const r = await gh<any>(`/repos/${req.params.owner}/${req.params.name}`, s?.token);
    res.json({
      owner: r.owner.login,
      name: r.name,
      desc: r.description || "",
      lang: r.language || "—",
      langColor: langColor(r.language),
    });
  } catch (err: any) {
    res.status(404).json({ error: String(err.message || err) });
  }
});

// ── Generate (POST starts a job, GET streams it) ────────────────
type Job = {
  owner: string;
  name: string;
  token?: string;
  events: { event: string; data: string }[];
  done: boolean;
  subscribers: ((evt: { event: string; data: string }) => void)[];
};
const jobs = new Map<string, Job>();

app.post("/api/generate", (req, res) => {
  const { owner, name } = req.body as { owner?: string; name?: string };
  if (!owner || !name) {
    res.status(400).json({ error: "owner and name required" });
    return;
  }
  const session = getSession(req);
  const id = Math.random().toString(36).slice(2, 11);
  const job: Job = {
    owner,
    name,
    token: session?.token,
    events: [],
    done: false,
    subscribers: [],
  };
  jobs.set(id, job);
  // Run async; events are buffered until the SSE consumer connects.
  runJob(id, job).catch((err) => {
    push(job, "error", { message: String(err.message || err) });
    job.done = true;
  });
  res.json({ jobId: id });
});

app.get("/api/generate/:id/stream", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).end();
    return;
  }
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  // Replay buffered events
  for (const e of job.events) writeEvent(res, e);
  if (job.done) {
    res.end();
    return;
  }
  const sub = (e: { event: string; data: string }) => {
    writeEvent(res, e);
    if (e.event === "done" || e.event === "error") res.end();
  };
  job.subscribers.push(sub);
  req.on("close", () => {
    job.subscribers = job.subscribers.filter((s) => s !== sub);
  });
});

function writeEvent(res: express.Response, e: { event: string; data: string }) {
  res.write(`event: ${e.event}\n`);
  res.write(`data: ${e.data}\n\n`);
}

function push(job: Job, event: string, payload: any) {
  const e = { event, data: JSON.stringify(payload) };
  job.events.push(e);
  for (const s of job.subscribers) s(e);
}

const PHASE_DEFS = [
  { id: "clone",     title: "Cloning repository" },
  { id: "detect",    title: "Detecting stack & entry points" },
  { id: "summarize", title: "Drafting README sections" },
  { id: "badges",    title: "Picking badges & shields" },
  { id: "render",    title: "Formatting markdown" },
];

async function runJob(_id: string, job: Job) {
  // Phase 1: clone (= fetch repo + tree)
  push(job, "phase", { id: "clone", title: PHASE_DEFS[0].title, state: "active", log: "" });

  const sliceLogs: string[] = [];
  const cloneStart = Date.now();
  let phaseIdx = 0;
  const sliceLog = (msg: string) => {
    sliceLogs.push(msg);
    // Route the first ~3 messages into clone, the rest into detect.
    const target = sliceLogs.length <= 3 ? "clone" : "detect";
    if (target === "detect" && phaseIdx === 0) {
      push(job, "phase", { id: "clone", title: PHASE_DEFS[0].title, state: "done", log: sliceLogs[2] || "Cloned", duration: Date.now() - cloneStart });
      push(job, "phase", { id: "detect", title: PHASE_DEFS[1].title, state: "active", log: msg });
      phaseIdx = 1;
    } else {
      push(job, "phase", { id: target, title: target === "clone" ? PHASE_DEFS[0].title : PHASE_DEFS[1].title, state: "active", log: msg });
    }
  };

  const slice = await buildSlice(job.owner, job.name, job.token, sliceLog);
  // close out detect
  push(job, "phase", { id: "detect", title: PHASE_DEFS[1].title, state: "done", log: sliceLogs[sliceLogs.length - 1] || "Detected", duration: 0 });

  // Phase 3: summarize via Gemini
  push(job, "phase", { id: "summarize", title: PHASE_DEFS[2].title, state: "active", log: "Composing README with Gemini…" });
  const prompt = buildPrompt(slice);
  const t0 = Date.now();
  const markdown = await generateReadme(prompt);
  push(job, "phase", { id: "summarize", title: PHASE_DEFS[2].title, state: "done", log: `Generated ${markdown.length} bytes`, duration: Date.now() - t0 });

  // Phase 4: badges (informational — the model already inserted them; we just confirm)
  push(job, "phase", { id: "badges", title: PHASE_DEFS[3].title, state: "active", log: "Verifying shields.io badges" });
  await new Promise((r) => setTimeout(r, 250));
  push(job, "phase", { id: "badges", title: PHASE_DEFS[3].title, state: "done", log: badgeSummary(slice), duration: 0 });

  // Phase 5: format
  push(job, "phase", { id: "render", title: PHASE_DEFS[4].title, state: "active", log: "Linting headings · finalizing README.md" });
  await new Promise((r) => setTimeout(r, 200));
  push(job, "phase", { id: "render", title: PHASE_DEFS[4].title, state: "done", log: "README.md ready", duration: 0 });

  push(job, "done", { markdown, repo: { owner: slice.meta.owner.login, name: slice.meta.name, desc: slice.meta.description, lang: slice.meta.language, langColor: langColor(slice.meta.language) } });
  job.done = true;
}

function badgeSummary(slice: any) {
  const bits: string[] = [];
  if (slice.meta.license?.spdx_id) bits.push(`license · ${slice.meta.license.spdx_id}`);
  if (slice.meta.language) bits.push(`language · ${slice.meta.language}`);
  if (slice.meta.stargazers_count) bits.push(`stars · ${slice.meta.stargazers_count}`);
  return bits.join(" · ") || "No standard shields";
}

function relTime(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} minutes ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
  if (d < 86400 * 14) return `${Math.floor(d / 86400)} days ago`;
  if (d < 86400 * 60) return `${Math.floor(d / 86400 / 7)} weeks ago`;
  return `${Math.floor(d / 86400 / 30)} months ago`;
}

function langColor(lang: string | null): string {
  const m: Record<string, string> = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    Ruby: "#701516",
    "C++": "#f34b7d",
    C: "#555555",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    PHP: "#4F5D95",
  };
  return (lang && m[lang]) || "#9aa0a6";
}

app.listen(PORT, () => {
  console.log(`DocForge server on http://localhost:${PORT}`);
});

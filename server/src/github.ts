// GitHub REST helpers + OAuth handlers.
import type { Request, Response } from "express";

const GH = "https://api.github.com";

export type Session = { token: string; login: string; avatar_url: string };

const sessions = new Map<string, Session>(); // sid -> session
const states = new Map<string, number>();    // oauth state -> ts

function makeId() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ghHeaders(token?: string) {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DocForge",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const t = token || process.env.GITHUB_TOKEN;
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function gh<T = any>(path: string, token?: string): Promise<T> {
  const r = await fetch(GH + path, { headers: ghHeaders(token) });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`GitHub ${r.status} ${path}: ${body.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

export async function ghRaw(url: string, token?: string): Promise<string> {
  const r = await fetch(url, { headers: ghHeaders(token) });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${url}`);
  return r.text();
}

// Fetch a file's raw content via the authenticated contents API. Works for
// both public and private repos (raw.githubusercontent.com 404s on private).
// Uses the `application/vnd.github.raw` Accept header so we get the file body
// directly instead of a base64-encoded JSON envelope.
export async function ghContents(
  owner: string,
  name: string,
  path: string,
  ref: string,
  token?: string,
): Promise<string> {
  const url = `${GH}/repos/${owner}/${name}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`;
  const r = await fetch(url, {
    headers: { ...ghHeaders(token), Accept: "application/vnd.github.raw" },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${url}`);
  return r.text();
}

// Paginated GET for endpoints that return arrays. Walks `Link: rel="next"`
// up to a hard cap so users with many repos see all of them.
export async function ghPaginated<T = any>(path: string, token?: string, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = GH + path;
  let page = 0;
  while (url && page < maxPages) {
    const r: globalThis.Response = await fetch(url, { headers: ghHeaders(token) });
    if (!r.ok) {
      const body: string = await r.text().catch(() => "");
      throw new Error(`GitHub ${r.status} ${url}: ${body.slice(0, 200)}`);
    }
    const batch = (await r.json()) as T[];
    out.push(...batch);
    const link: string = r.headers.get("link") || "";
    const m: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
    page++;
  }
  return out;
}

export function getSession(req: Request): Session | null {
  const sid = req.cookies?.sid as string | undefined;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

export function clearSession(req: Request, res: Response) {
  const sid = req.cookies?.sid as string | undefined;
  if (sid) sessions.delete(sid);
  res.clearCookie("sid");
}

export async function startOAuth(_req: Request, res: Response) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(501).json({
      error: "GitHub OAuth not configured",
      hint: "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env (see README).",
    });
    return;
  }
  const state = makeId();
  states.set(state, Date.now());
  // expire old states
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, ts] of states) if (ts < cutoff) states.delete(k);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://localhost:${process.env.PORT || 8787}/api/auth/github/callback`,
    scope: "read:user repo",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

export async function oauthCallback(req: Request, res: Response) {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state || !states.has(state)) {
    res.status(400).send("Invalid OAuth state");
    return;
  }
  states.delete(state);

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = (await r.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    res.status(400).send(`OAuth exchange failed: ${data.error || "no token"}`);
    return;
  }

  const me = await gh<{ login: string; avatar_url: string }>("/user", data.access_token);
  const sid = makeId();
  sessions.set(sid, { token: data.access_token, login: me.login, avatar_url: me.avatar_url });

  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect(process.env.CLIENT_ORIGIN || "http://localhost:5173");
}

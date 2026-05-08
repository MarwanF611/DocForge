// Thin API helpers that talk to the Express proxy via /api (Vite dev-proxied).

export type Repo = {
  owner: string;
  name: string;
  desc?: string;
  lang?: string;
  langColor?: string;
  vis?: string;
  updated?: string;
  branches?: number;
};

export async function getMe(): Promise<{ login: string; avatar_url: string } | null> {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error(`auth/me ${r.status}`);
  return r.json();
}

export async function getRepos(): Promise<Repo[]> {
  const r = await fetch("/api/repos", { credentials: "include" });
  if (!r.ok) throw new Error(`repos ${r.status}`);
  return r.json();
}

export async function startGenerate(owner: string, name: string): Promise<string> {
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ owner, name }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`generate ${r.status}: ${body}`);
  }
  const { jobId } = (await r.json()) as { jobId: string };
  return jobId;
}

export type PhaseEvent = {
  id: string;
  title: string;
  state: "active" | "done";
  log: string;
  duration?: number;
};

export type DoneEvent = {
  markdown: string;
  repo: { owner: string; name: string; desc?: string; lang?: string; langColor?: string };
};

export type StreamHandlers = {
  onPhase: (e: PhaseEvent) => void;
  onDone: (e: DoneEvent) => void;
  onError: (msg: string) => void;
};

export function streamJob(jobId: string, h: StreamHandlers): () => void {
  const es = new EventSource(`/api/generate/${jobId}/stream`);
  es.addEventListener("phase", (ev) => h.onPhase(JSON.parse((ev as MessageEvent).data)));
  es.addEventListener("done", (ev) => {
    h.onDone(JSON.parse((ev as MessageEvent).data));
    es.close();
  });
  es.addEventListener("error", (ev) => {
    const data = (ev as MessageEvent).data;
    if (data) {
      try {
        h.onError(JSON.parse(data).message || "stream error");
      } catch {
        h.onError(String(data));
      }
    } else if (es.readyState === EventSource.CLOSED) {
      // Connection closed without a payload.
    }
  });
  return () => es.close();
}

export function parseRepoFromUrl(url: string): { owner: string; name: string } {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/\s?#]+)/);
  if (m) return { owner: m[1], name: m[2].replace(/\.git$/, "") };
  // bare owner/repo
  const m2 = url.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (m2) return { owner: m2[1], name: m2[2] };
  return { owner: "user", name: url.trim().split("/").pop() || "repository" };
}

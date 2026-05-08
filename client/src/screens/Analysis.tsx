import * as React from "react";
import { I } from "../icons";
import {
  startGenerate,
  streamJob,
  type DoneEvent,
  type PhaseEvent,
  type Repo,
} from "../lib/api";

type PhaseState = {
  id: string;
  title: string;
  state: "pending" | "active" | "done";
  log: string;
};

const INITIAL: PhaseState[] = [
  { id: "clone",     title: "Cloning repository",            state: "pending", log: "" },
  { id: "detect",    title: "Detecting stack & entry points", state: "pending", log: "" },
  { id: "summarize", title: "Drafting README sections",       state: "pending", log: "" },
  { id: "badges",    title: "Picking badges & shields",       state: "pending", log: "" },
  { id: "render",    title: "Formatting markdown",            state: "pending", log: "" },
];

const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧"];

export function Analysis({
  repo,
  onComplete,
  onCancel,
  onError,
}: {
  repo: Repo;
  onComplete: (e: DoneEvent) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [phases, setPhases] = React.useState<PhaseState[]>(INITIAL);
  const [elapsed, setElapsed] = React.useState(0);
  const [spinFrame, setSpinFrame] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(t);
  }, []);
  React.useEffect(() => {
    const t = setInterval(() => setSpinFrame((f) => (f + 1) % 8), 90);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    let close: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      try {
        const jobId = await startGenerate(repo.owner, repo.name);
        if (cancelled) return;
        close = streamJob(jobId, {
          onPhase: (e: PhaseEvent) => {
            setPhases((prev) =>
              prev.map((p) =>
                p.id === e.id ? { ...p, state: e.state, log: e.log || p.log, title: e.title || p.title } : p,
              ),
            );
          },
          onDone: (e) => {
            setDone(true);
            setTimeout(() => onComplete(e), 350);
          },
          onError: (msg) => onError(msg),
        });
      } catch (err: any) {
        onError(String(err.message || err));
      }
    })();
    return () => {
      cancelled = true;
      close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.owner, repo.name]);

  const activeIdx = phases.findIndex((p) => p.state === "active");
  const totalActive = activeIdx === -1 ? (done ? phases.length : 0) : activeIdx + 1;

  return (
    <main className="analysis-screen fade-in">
      <div className="analysis">
        <div className="analysis-h">
          <div className="a-avatar">{repo.owner[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>Generating README</h3>
            <div className="repo-path">github.com/{repo.owner}/{repo.name}</div>
          </div>
          <button className="iconbtn" onClick={onCancel} aria-label="Cancel">
            <I.x />
          </button>
        </div>

        <div className="phases">
          {phases.map((p) => (
            <div key={p.id} className="phase" data-state={p.state}>
              <span className="phase-dot">{p.state === "done" && <I.check />}</span>
              <div className="phase-body">
                <div className="phase-title">{p.title}</div>
                <div className="phase-detail">
                  {p.log || (p.state === "pending" ? "Waiting…" : "")}
                </div>
              </div>
              <div className="phase-time">
                {p.state === "done" ? "✓" : p.state === "active" ? "…" : "—"}
              </div>
            </div>
          ))}
        </div>

        <div className="analysis-foot">
          <span>
            <span className="ascii-spinner">{SPIN[spinFrame]}</span>{" "}
            {done ? "Complete" : "Working…"} · {elapsed.toFixed(1)}s elapsed
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>
            {totalActive}/{phases.length}
          </span>
        </div>
      </div>
    </main>
  );
}

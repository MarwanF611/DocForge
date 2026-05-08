import * as React from "react";
import { I } from "../icons";
import { getMe, getRepos, type Repo } from "../lib/api";

export function Picker({
  onPick,
  onBack,
}: {
  onPick: (r: Repo) => void;
  onBack: () => void;
}) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Repo | null>(null);
  const [repos, setRepos] = React.useState<Repo[] | null>(null);
  const [me, setMe] = React.useState<{ login: string; avatar_url: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await getMe().catch(() => null);
      if (cancelled) return;
      setMe(m);
      if (!m) {
        setError("not_authed");
        return;
      }
      try {
        const list = await getRepos();
        if (!cancelled) setRepos(list);
      } catch (err: any) {
        if (!cancelled) setError(String(err.message || err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (repos || []).filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (r.name + " " + r.owner + " " + (r.desc || "")).toLowerCase().includes(s);
  });

  if (error === "not_authed") {
    return (
      <main className="picker-screen fade-in">
        <div className="picker">
          <div className="picker-h" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <button className="iconbtn" onClick={onBack} aria-label="Back">
              <I.arrowLeft />
            </button>
            <div style={{ flex: 1 }}>
              <h2>Connect GitHub</h2>
              <p>Authorize DocForge to read your repositories.</p>
            </div>
          </div>
          <div style={{ padding: 32, textAlign: "center" }}>
            <a className="btn accent" href="/api/auth/github">
              <I.github /> Continue with GitHub
            </a>
            <p style={{ marginTop: 16, fontSize: 12.5, color: "var(--muted)" }}>
              No OAuth App configured? See README → "Connect GitHub (optional)".
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="picker-screen fade-in">
      <div className="picker">
        <div className="picker-h" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <button className="iconbtn" onClick={onBack} aria-label="Back">
            <I.arrowLeft />
          </button>
          <div style={{ flex: 1 }}>
            <h2>Choose a repository</h2>
            <p>
              {me ? (
                <>
                  Connected as{" "}
                  <strong style={{ color: "var(--ink-2)" }}>@{me.login}</strong>
                  {repos ? ` · ${repos.length} repositories accessible` : ""}
                </>
              ) : (
                "Loading…"
              )}
            </p>
          </div>
        </div>

        <div className="picker-search">
          <I.search />
          <input
            type="text"
            placeholder="Search repositories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        <div className="picker-list">
          {repos === null && !error && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Loading repositories…
            </div>
          )}
          {error && error !== "not_authed" && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              {error}
            </div>
          )}
          {filtered.map((r) => {
            const isSel =
              selected && selected.name === r.name && selected.owner === r.owner;
            return (
              <button
                key={r.owner + "/" + r.name}
                className={"picker-item" + (isSel ? " selected" : "")}
                onClick={() => setSelected(r)}
                onDoubleClick={() => onPick(r)}
              >
                <span className="pi-avatar">{r.owner[0]?.toUpperCase()}</span>
                <span className="pi-body">
                  <span className="pi-name">
                    {r.owner}/{r.name}
                    {r.vis && <span className="pi-vis">{r.vis}</span>}
                  </span>
                  {r.desc && (
                    <span className="pi-meta" style={{ display: "block", marginTop: 2 }}>
                      {r.desc}
                    </span>
                  )}
                  <span className="pi-meta">
                    {r.lang && (
                      <span>
                        <span
                          className="lang-dot"
                          style={{ background: r.langColor || "#9aa0a6" }}
                        />
                        {r.lang}
                      </span>
                    )}
                    {r.updated && <span>Updated {r.updated}</span>}
                  </span>
                </span>
                <I.arrowRight className="pi-arrow" style={{ width: 14, height: 14 }} />
              </button>
            );
          })}
          {repos && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              No repositories match "{q}"
            </div>
          )}
        </div>

        <div className="picker-foot">
          <span className="help">Tip: double-click a repo to generate.</span>
          <button
            className="btn accent"
            disabled={!selected}
            style={{
              opacity: selected ? 1 : 0.4,
              cursor: selected ? "pointer" : "default",
            }}
            onClick={() => selected && onPick(selected)}
          >
            Generate README
            <I.arrowRight />
          </button>
        </div>
      </div>
    </main>
  );
}

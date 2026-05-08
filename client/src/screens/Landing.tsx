import * as React from "react";
import { I } from "../icons";
import { SAMPLE_REPOS } from "../data/sampleRepos";
import type { Repo } from "../lib/api";

export function Landing({
  onSubmit,
  onConnect,
}: {
  onSubmit: (r: Repo) => void;
  onConnect: () => void;
}) {
  const [url, setUrl] = React.useState("");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    const m = url.match(/github\.com[/:]([^/]+)\/([^/\s?#]+)/);
    if (m) {
      onSubmit({ owner: m[1], name: m[2].replace(/\.git$/, "") });
      return;
    }
    const m2 = url.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
    if (m2) onSubmit({ owner: m2[1], name: m2[2] });
  };

  return (
    <main className="landing fade-in">
      <div className="landing-bg" />
      <div className="landing-grid" />
      <div className="landing-inner">
        <div className="eyebrow">
          <span className="pill">New</span>
          Now indexing private repos in seconds
        </div>
        <h1 className="hero">
          Write a great <em>README</em> for any repository
        </h1>
        <p className="hero-sub">
          Point DocForge at a GitHub repo and get a polished, ready-to-commit
          README.md—with the right install steps, usage examples, badges, and
          structure your project actually needs.
        </p>

        <form className="repo-input" onSubmit={submit}>
          <I.github className="gh" />
          <input
            type="text"
            placeholder="github.com/owner/repository"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn accent">
            Generate README
            <I.arrowRight />
          </button>
        </form>

        <div className="divider-or">or</div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button className="connect-btn" onClick={onConnect}>
            <I.github />
            Connect GitHub to pick from your repositories
          </button>
        </div>

        <div className="suggested">
          <h3>Try with a popular open-source project</h3>
          <div className="suggested-list">
            {SAMPLE_REPOS.map((r) => (
              <button
                key={r.name}
                className="suggested-item"
                onClick={() => onSubmit(r)}
              >
                <span className="si-icon">
                  <I.book />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div className="si-name">
                    {r.owner}/{r.name}
                  </div>
                  <div className="si-meta">{r.desc}</div>
                </span>
                <I.arrowRight style={{ width: 14, height: 14, color: "var(--muted-2)" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="feature-strip">
          <div className="feature">
            <h4>
              <I.spark /> Tone-aware drafts
            </h4>
            <p>
              Picks the right voice for the project—friendly OSS, dry internal
              tool, hobby script—and writes the prose to match.
            </p>
          </div>
          <div className="feature">
            <h4>
              <I.terminal /> Real install steps
            </h4>
            <p>
              Reads your package manifests so the quick-start commands actually
              work, not generic boilerplate.
            </p>
          </div>
          <div className="feature">
            <h4>
              <I.zap /> One-click PR
            </h4>
            <p>
              Open a pull request that adds the README to your repo without
              leaving DocForge.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

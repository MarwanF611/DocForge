import * as React from "react";
import { I, type IconKey } from "../icons";
import { renderMarkdown, sliceSections, slug } from "../lib/markdown";
import type { Repo } from "../lib/api";

const SECTION_ICON: Record<string, IconKey> = {
  "header": "book",
  "features": "spark",
  "installation": "terminal",
  "quick-start": "zap",
  "configuration": "code",
  "project-structure": "folder",
  "contributing": "fork",
  "license": "file",
};

export function Docs({
  repo,
  markdown,
  layout,
  onNew,
  onRegenerate,
}: {
  repo: Repo;
  markdown: string;
  layout: "single" | "two" | "three";
  onNew: () => void;
  onRegenerate: () => void;
}) {
  const sections = React.useMemo(() => sliceSections(markdown), [markdown]);
  const fullHtml = React.useMemo(() => renderMarkdown(markdown), [markdown]);
  const [active, setActive] = React.useState(sections[0]?.id || "header");
  const [view, setView] = React.useState<"rendered" | "raw">("rendered");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY + 120;
      let cur = sections[0]?.id || "header";
      for (const s of sections) {
        const el = document.getElementById(`sec-${s.id}`);
        if (el && el.getBoundingClientRect().top + window.scrollY <= top) cur = s.id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`sec-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportMd = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bytes = new Blob([markdown]).size.toLocaleString();
  const lines = markdown.split("\n").length;

  return (
    <div className="docs-screen" data-layout={layout}>
      {/* Left TOC */}
      <aside className="docs-toc">
        <div className="toc-repo">
          <span className="toc-mark">{repo.owner[0]?.toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <div className="toc-r-name">README.md</div>
            <div className="toc-r-meta">
              {repo.owner}/{repo.name}
            </div>
          </div>
        </div>

        <div className="toc-section">Sections</div>
        {sections.map((s) => {
          const Icon = I[SECTION_ICON[s.id] || "file"];
          return (
            <button
              key={s.id}
              className={"toc-link" + (active === s.id ? " active" : "")}
              onClick={() => scrollTo(s.id)}
            >
              <Icon />
              {s.title}
            </button>
          );
        })}

        <div className="toc-section">Actions</div>
        <button className="toc-link" onClick={onRegenerate}>
          <I.refresh />
          Regenerate README
        </button>
        <button className="toc-link" onClick={onNew}>
          <I.arrowLeft />
          New repository
        </button>
        <button className="toc-link" onClick={exportMd}>
          <I.download />
          Download README.md
        </button>
      </aside>

      {/* Main content */}
      <div className="docs-main">
        <div className="readme-bar">
          <div className="readme-bar-l">
            <span className="readme-file">
              <I.file /> README.md
            </span>
            <span className="readme-meta">
              {bytes} bytes · {lines} lines · markdown
            </span>
          </div>
          <div className="readme-bar-r">
            <div className="readme-toggle" role="tablist">
              <button
                role="tab"
                className={view === "rendered" ? "active" : ""}
                onClick={() => setView("rendered")}
              >
                Preview
              </button>
              <button
                role="tab"
                className={view === "raw" ? "active" : ""}
                onClick={() => setView("raw")}
              >
                Raw
              </button>
            </div>
            <button className="btn ghost" title="Copy markdown" onClick={copy}>
              <I.copy /> {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn accent" onClick={exportMd} title="Download README.md">
              <I.download /> Export
            </button>
          </div>
        </div>

        {view === "rendered" ? (
          <article className="docs-content readme">
            {sections.length > 1 ? (
              sections.map((s) => (
                <section key={s.id} id={`sec-${s.id}`}>
                  <div
                    className="md-body"
                    dangerouslySetInnerHTML={{ __html: s.html }}
                  />
                </section>
              ))
            ) : (
              <div
                id={`sec-header`}
                className="md-body"
                dangerouslySetInnerHTML={{ __html: fullHtml }}
              />
            )}
          </article>
        ) : (
          <pre className="readme-raw">{markdown}</pre>
        )}
      </div>

      {layout === "three" && (
        <aside className="docs-rail">
          <div className="rail-section">
            <h4 className="rail-h">Repository</h4>
            <div className="rail-stat">
              <span>Language</span>
              <span className="v">{repo.lang || "—"}</span>
            </div>
            <div className="rail-stat">
              <span>Owner</span>
              <span className="v">{repo.owner}</span>
            </div>
          </div>
          <div className="rail-section">
            <h4 className="rail-h">README sections</h4>
            <div className="rail-onthis">
              {sections.map((s) => (
                <a
                  key={s.id}
                  className={active === s.id ? "active" : ""}
                  onClick={() => scrollTo(s.id)}
                >
                  {s.title}
                </a>
              ))}
            </div>
          </div>
          <div className="rail-section">
            <h4 className="rail-h">Output</h4>
            <div className="rail-stat">
              <span>Length</span>
              <span className="v">{bytes} bytes</span>
            </div>
            <div className="rail-stat">
              <span>Lines</span>
              <span className="v">{lines}</span>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

// Used by the App for the topbar breadcrumb when on the docs screen.
export { slug };

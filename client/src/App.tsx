import * as React from "react";
import "./styles.css";
import "./readme-overrides.css";
import { I } from "./icons";
import { Landing } from "./screens/Landing";
import { Picker } from "./screens/Picker";
import { Analysis } from "./screens/Analysis";
import { Docs } from "./screens/Docs";
import {
  TweaksPanel,
  TweakSection,
  TweakRadio,
  TweakColor,
  TweakButton,
  useTweaks,
} from "./tweaks/TweaksPanel";
import type { DoneEvent, Repo } from "./lib/api";

type Step = "landing" | "picker" | "analysis" | "docs";

type Tweaks = {
  theme: "light" | "dark";
  accent: string;
  font: "sans" | "serif" | "mixed" | "mono";
  layout: "single" | "two" | "three";
  density: "compact" | "regular" | "comfy";
};

const DEFAULTS: Tweaks = {
  theme: "light",
  accent: "#d97757",
  font: "sans",
  layout: "two",
  density: "regular",
};

export function App() {
  const [t, setTweak] = useTweaks<Tweaks>(DEFAULTS);
  const [step, setStep] = React.useState<Step>("landing");
  const [repo, setRepo] = React.useState<Repo | null>(null);
  const [markdown, setMarkdown] = React.useState<string>("");
  const [genError, setGenError] = React.useState<string | null>(null);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = t.theme;
    root.dataset.font = t.font;
    root.dataset.density = t.density;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", hexToSoft(t.accent, t.theme === "dark"));
    root.style.setProperty("--accent-ink", hexToInk(t.accent));
  }, [t.theme, t.font, t.density, t.accent]);

  const goLanding = () => {
    setStep("landing");
    setRepo(null);
    setMarkdown("");
    setGenError(null);
  };
  const goPicker = () => setStep("picker");
  const goAnalysis = (r: Repo) => {
    setRepo(r);
    setGenError(null);
    setStep("analysis");
  };
  const onComplete = (e: DoneEvent) => {
    setMarkdown(e.markdown);
    setRepo({ ...(repo as Repo), ...e.repo });
    setStep("docs");
  };

  return (
    <div className="app-shell">
      <Topbar
        step={step}
        repo={repo}
        onHome={goLanding}
        theme={t.theme}
        onToggleTheme={() => setTweak("theme", t.theme === "light" ? "dark" : "light")}
        onOpenTweaks={() => setTweaksOpen(true)}
      />

      {step === "landing" && (
        <Landing onSubmit={goAnalysis} onConnect={goPicker} />
      )}
      {step === "picker" && <Picker onPick={goAnalysis} onBack={goLanding} />}
      {step === "analysis" && repo && (
        <Analysis
          repo={repo}
          onComplete={onComplete}
          onCancel={goLanding}
          onError={(msg) => {
            setGenError(msg);
            setStep("landing");
          }}
        />
      )}
      {step === "docs" && repo && markdown && (
        <Docs
          repo={repo}
          markdown={markdown}
          layout={t.layout}
          onNew={goLanding}
          onRegenerate={() => setStep("analysis")}
        />
      )}

      {genError && step === "landing" && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            maxWidth: 420,
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: "var(--shadow)",
            fontSize: 13,
            color: "var(--ink-2)",
            zIndex: 100,
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>
            Generation failed
          </strong>
          {genError}
        </div>
      )}

      <TweaksPanel
        title="DocForge tweaks"
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
      >
        <TweakSection label="Appearance" />
        <TweakRadio
          label="Theme"
          value={t.theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => setTweak("theme", v)}
        />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#d97757", "#2a6fdb", "#1f8a5b", "#7a5ae0"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakRadio
          label="Font"
          value={t.font}
          options={[
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serif" },
            { value: "mixed", label: "Mixed" },
            { value: "mono", label: "Mono" },
          ]}
          onChange={(v) => setTweak("font", v)}
        />

        <TweakSection label="Docs viewer" />
        <TweakRadio
          label="Layout"
          value={t.layout}
          options={[
            { value: "single", label: "1-col" },
            { value: "two", label: "2-pane" },
            { value: "three", label: "3-pane" },
          ]}
          onChange={(v) => setTweak("layout", v)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          options={[
            { value: "compact", label: "Compact" },
            { value: "regular", label: "Regular" },
            { value: "comfy", label: "Comfy" },
          ]}
          onChange={(v) => setTweak("density", v)}
        />

        <TweakSection label="Flow" />
        <TweakButton label="Restart from landing" onClick={goLanding} secondary />
      </TweaksPanel>
    </div>
  );
}

function Topbar({
  step,
  repo,
  onHome,
  theme,
  onToggleTheme,
  onOpenTweaks,
}: {
  step: Step;
  repo: Repo | null;
  onHome: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenTweaks: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-l">
        <a className="brand" onClick={onHome} style={{ cursor: "pointer" }}>
          <span className="brand-mark accent">D</span>
          DocForge
        </a>
        {step === "docs" && repo && (
          <div className="crumbs">
            <span className="sep">/</span>
            <span>{repo.owner}</span>
            <span className="sep">/</span>
            <span className="here">{repo.name}</span>
          </div>
        )}
        {step === "picker" && (
          <div className="crumbs">
            <span className="sep">/</span>
            <span className="here">Choose repository</span>
          </div>
        )}
        {step === "analysis" && (
          <div className="crumbs">
            <span className="sep">/</span>
            <span className="here">Generating…</span>
          </div>
        )}
      </div>
      <div className="topbar-r">
        <button className="iconbtn" onClick={onOpenTweaks} title="Tweaks">
          <I.sliders />
        </button>
        <button className="iconbtn" onClick={onToggleTheme} title="Toggle theme">
          {theme === "dark" ? <I.sun /> : <I.moon />}
        </button>
      </div>
    </header>
  );
}

// Helpers — derive accent variants in the same way as the design prototype.
function hexParse(hex: string) {
  const h = hex.replace("#", "");
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = parseInt(x.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function hexToSoft(hex: string, dark: boolean): string {
  const { r, g, b } = hexParse(hex);
  if (dark) {
    return `rgb(${Math.round(r * 0.28)}, ${Math.round(g * 0.28)}, ${Math.round(b * 0.28)})`;
  }
  return `rgb(${Math.round(r * 0.12 + 255 * 0.88)}, ${Math.round(g * 0.12 + 255 * 0.88)}, ${Math.round(b * 0.12 + 255 * 0.88)})`;
}
function hexToInk(hex: string): string {
  const { r, g, b } = hexParse(hex);
  return `rgb(${Math.round(r * 0.78)}, ${Math.round(g * 0.78)}, ${Math.round(b * 0.78)})`;
}

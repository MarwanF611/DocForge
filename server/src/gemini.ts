// Gemini call + prompt builder for README generation.
import type { Slice } from "./repoSlice.js";

const SECTIONS = [
  "Header & badges",
  "Features",
  "Installation",
  "Quick start",
  "Configuration",
  "Project structure",
  "Contributing",
  "License",
];

export function buildPrompt(slice: Slice): string {
  const { meta, treeText, files, existingReadme } = slice;

  const filesBlock = files
    .map((f) => `\n----- FILE: ${f.path} -----\n${f.content}\n`)
    .join("");

  const existing = existingReadme
    ? `\n----- EXISTING README -----\n${existingReadme}\n`
    : "";

  return `You are writing a polished, ready-to-commit README.md for a real GitHub repository.

REPOSITORY METADATA
  full_name:     ${meta.full_name}
  description:   ${meta.description ?? "(none)"}
  language:      ${meta.language ?? "(unknown)"}
  topics:        ${(meta.topics || []).join(", ") || "(none)"}
  license:       ${meta.license?.spdx_id ?? "(none)"}
  default_branch:${meta.default_branch}
  stars:         ${meta.stargazers_count}
  homepage:      ${meta.homepage ?? "(none)"}

TOP-LEVEL FILE TREE
${treeText}
${existing}${filesBlock}

INSTRUCTIONS
- Output a single Markdown document. No preamble, no code fences around the whole document, no commentary.
- Use exactly these top-level sections (## headings) in this order, with these literal titles:
  ${SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n  ")}
- "Header & badges" is rendered as the document header — use a centered HTML block:
  <div align="center">
  # <project name>
  **<one-line tagline>**
  shields.io badges (build, license, version, language, etc.) — only badges that make sense for this repo.
  </div>
- "Features" should be a 3-6 item bulleted list.
- "Installation" must contain a runnable shell code block; pull the right commands out of the manifest files (npm/yarn/pnpm/pip/uv/cargo/go/etc.).
- "Quick start" must show a minimal usage example as a code block.
- "Configuration" is a markdown table of env vars / config keys. Skip the section if the repo has no configuration surface.
- "Project structure" is a fenced \`\`\` code block showing the top-level tree with one-line comments.
- "Contributing" is a short paragraph plus a 2-4 step ordered list.
- "License" is one line with a markdown link to ./LICENSE — name the SPDX license if known.
- Do not invent commands or env vars that aren't supported by the manifests/source you were shown.
- Tone: friendly OSS, concise, technically precise. No marketing fluff.
- The full output must be valid GitHub-flavored markdown.`;
}

export async function generateReadme(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "text/plain",
        },
      }),
    },
  );

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Gemini ${r.status}: ${body.slice(0, 400)}`);
  }
  const data = (await r.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
  if (!text.trim()) {
    const reason = data.promptFeedback?.blockReason || "empty response";
    throw new Error(`Gemini returned no text (${reason})`);
  }
  return postprocess(text);
}

// Strip a possible enclosing ```markdown fence and trim trailing whitespace.
function postprocess(md: string): string {
  let s = md.trim();
  const fence = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i;
  const m = s.match(fence);
  if (m) s = m[1];
  return s.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Builds a "smart slice" of repo context to feed Gemini.
import { gh, ghContents } from "./github.js";

const MANIFESTS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Dockerfile",
  "Makefile",
  ".env.example",
  "deno.json",
  "bun.lockb",
  "pnpm-lock.yaml",
];

const ENTRY_PATTERNS = [
  /^main\.[a-z]+$/i,
  /^index\.[a-z]+$/i,
  /^app\.[a-z]+$/i,
  /^server\.[a-z]+$/i,
  /^src\/(main|index|app|lib)\.[a-z]+$/i,
  /^cmd\/[^/]+\/main\.go$/i,
];

const MAX_README = 8 * 1024;
const MAX_MANIFEST = 4 * 1024;
const MAX_SOURCE = 3 * 1024;
const MAX_TREE_ENTRIES = 80;
const MAX_SOURCE_FILES = 5;

export type RepoMeta = {
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  default_branch: string;
  license: { spdx_id?: string | null } | null;
  stargazers_count: number;
  homepage: string | null;
  html_url: string;
  owner: { login: string };
  name: string;
};

export type Slice = {
  meta: RepoMeta;
  treeText: string;
  detectedManifests: string[];
  files: { path: string; content: string }[];
  existingReadme: string | null;
};

export type SliceLogger = (msg: string) => void;

export async function buildSlice(
  owner: string,
  name: string,
  token: string | undefined,
  log: SliceLogger,
): Promise<Slice> {
  log(`git clone --depth=1 https://github.com/${owner}/${name}.git`);
  const meta = await gh<RepoMeta>(`/repos/${owner}/${name}`, token);
  log(`Resolved ${meta.full_name} · default branch ${meta.default_branch}`);

  log(`Fetching git tree on ${meta.default_branch}…`);
  const treeRes = await gh<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `/repos/${owner}/${name}/git/trees/${meta.default_branch}?recursive=1`,
    token,
  );

  const allPaths = treeRes.tree.filter((t) => t.type === "blob").map((t) => t.path);
  log(`Indexed ${allPaths.length} files`);

  // Top-level + 1-level deep tree, capped
  const depth = (p: string) => p.split("/").length;
  const treePaths = treeRes.tree
    .filter((t) => depth(t.path) <= 2)
    .slice(0, MAX_TREE_ENTRIES)
    .map((t) => (t.type === "tree" ? t.path + "/" : t.path));
  const treeText = treePaths.join("\n");

  // Detect manifests
  const detectedManifests = MANIFESTS.filter((m) =>
    allPaths.some((p) => p === m || p.endsWith("/" + m)),
  );
  if (detectedManifests.length) {
    log(`Detected manifests: ${detectedManifests.join(", ")}`);
  } else {
    log("No standard manifests detected");
  }

  // README (case-insensitive, top-level)
  const readmePath = allPaths.find((p) => /^readme(\.|$)/i.test(p));
  let existingReadme: string | null = null;
  if (readmePath) {
    log(`Reading existing ${readmePath}`);
    existingReadme = await fetchFile(owner, name, meta.default_branch, readmePath, token, MAX_README);
  }

  // Manifest contents
  const files: { path: string; content: string }[] = [];
  for (const m of detectedManifests) {
    const path = allPaths.find((p) => p === m) || allPaths.find((p) => p.endsWith("/" + m));
    if (!path) continue;
    try {
      const content = await fetchFile(owner, name, meta.default_branch, path, token, MAX_MANIFEST);
      files.push({ path, content });
      log(`Read ${path} (${content.length} bytes)`);
    } catch {
      // skip
    }
  }

  // Entry-point heuristic source files
  const entryPaths = allPaths
    .filter((p) => ENTRY_PATTERNS.some((re) => re.test(p)))
    .slice(0, MAX_SOURCE_FILES);
  for (const p of entryPaths) {
    try {
      const content = await fetchFile(owner, name, meta.default_branch, p, token, MAX_SOURCE);
      files.push({ path: p, content });
      log(`Sampled ${p}`);
    } catch {
      // skip
    }
  }

  log("Topic & language summary built");
  return { meta, treeText, detectedManifests, files, existingReadme };
}

async function fetchFile(
  owner: string,
  name: string,
  branch: string,
  path: string,
  token: string | undefined,
  cap: number,
): Promise<string> {
  // Use the authenticated contents API so private repos work too — the raw
  // CDN host returns 404 for anything that requires auth.
  const text = await ghContents(owner, name, path, branch, token);
  return text.length > cap ? text.slice(0, cap) + "\n…[truncated]" : text;
}

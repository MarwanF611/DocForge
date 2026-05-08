import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Split a README into sections keyed by their `## ` heading slug.
// Pre-`##` content (h1 + tagline + badges) becomes the synthetic "header" section.
export function sliceSections(md: string): { id: string; title: string; html: string }[] {
  const out: { id: string; title: string; html: string }[] = [];
  const firstH2 = md.search(/^##\s+/m);
  const headerMd = firstH2 === -1 ? md : md.slice(0, firstH2);
  out.push({ id: "header", title: "Header & badges", html: renderMarkdown(headerMd) });

  if (firstH2 === -1) return out;
  const rest = md.slice(firstH2);
  const re = /^##\s+(.+?)\s*$/gm;
  const heads: { idx: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest))) heads.push({ idx: m.index, title: m[1] });
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].idx;
    const end = i + 1 < heads.length ? heads[i + 1].idx : rest.length;
    out.push({
      id: slug(heads[i].title),
      title: heads[i].title,
      html: renderMarkdown(rest.slice(start, end)),
    });
  }
  return out;
}

export type SampleRepo = {
  owner: string;
  name: string;
  desc: string;
  lang?: string;
  langColor?: string;
};

export const SAMPLE_REPOS: SampleRepo[] = [
  { owner: "vercel", name: "next.js", desc: "The React Framework", lang: "TypeScript", langColor: "#3178c6" },
  { owner: "facebook", name: "react", desc: "The library for web and native UIs", lang: "JavaScript", langColor: "#f1e05a" },
  { owner: "tailwindlabs", name: "tailwindcss", desc: "A utility-first CSS framework", lang: "TypeScript", langColor: "#3178c6" },
  { owner: "remix-run", name: "remix", desc: "Build better websites", lang: "TypeScript", langColor: "#3178c6" },
];

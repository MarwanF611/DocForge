# DocForge

Point DocForge at any GitHub repository and it generates a polished, ready-to-commit `README.md` using Gemini.

Implements the Claude Design handoff for *Technical documentation writer (Remix)* — landing → repo picker → phased analysis → README viewer with rendered/raw toggle, inline section actions, and a tweaks panel (theme, accent, font, layout, density).

## Stack

- **client/** — Vite + React, ports the design 1:1 (CSS, icons, screens, tweaks panel)
- **server/** — Express proxy that holds the Gemini key, walks the repo via the GitHub REST API, streams analysis phases over Server-Sent Events, and (optionally) handles GitHub OAuth for the "Connect GitHub" flow

## Run it

```bash
cp .env.example .env
# paste your GEMINI_API_KEY into .env

npm --prefix server install
npm --prefix client install

# terminal 1
npm --prefix server run dev

# terminal 2
npm --prefix client run dev
```

Open http://localhost:5173 and paste a public repo URL.

### Connect GitHub (optional)

To enable the picker:

1. Create an OAuth App at https://github.com/settings/applications/new with callback `http://localhost:8787/api/auth/github/callback`.
2. Paste `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` into `.env`.
3. Restart the server.
# DocForge

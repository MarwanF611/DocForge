<div align="center">
  <h1>DocForge</h1>
  **Generates polished `README.md` files for GitHub repositories using Gemini.**

  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
  ![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
</div>

## Features

*   Generates polished, ready-to-commit `README.md` files for GitHub repositories using Gemini.
*   Interactive web UI for repository selection, analysis, and README preview.
*   Phased analysis of repository content with real-time updates via Server-Sent Events.
*   README viewer with rendered/raw toggle, inline section actions, and a tweaks panel.
*   Customizable README output, including theme, accent, font, layout, and density.
*   Optional GitHub OAuth integration for seamless repository browsing and selection.

## Installation

1.  Copy the example environment file and populate it with your `GEMINI_API_KEY`.
    ```bash
    cp .env.example .env
    # Paste your GEMINI_API_KEY into .env
    # Optionally, configure other variables as needed.
    ```
2.  Install dependencies for both the server and client applications.
    ```bash
    npm --prefix server install
    npm --prefix client install
    ```

## Quick start

1.  Start the backend server in one terminal:
    ```bash
    npm --prefix server run dev
    ```
2.  Start the frontend client in another terminal:
    ```bash
    npm --prefix client run dev
    ```
3.  Open your browser to `http://localhost:5173`. You can then paste a public GitHub repository URL to generate its README.

## Configuration

Configure DocForge using environment variables in your `.env` file.

| Variable             | Description                                                                                             | Required |
| :------------------- | :------------------------------------------------------------------------------------------------------ | :------- |
| `GEMINI_API_KEY`     | Your Google Gemini API key.                                                                             | Yes      |
| `GEMINI_MODEL`       | The Gemini model to use for README generation. Defaults to `gemini-2.5-flash`.                          | No       |
| `GITHUB_TOKEN`       | Optional: A GitHub Personal Access Token (no scopes needed) to increase public repository rate limits.  | No       |
| `GITHUB_CLIENT_ID`   | Required for GitHub OAuth integration. Your GitHub OAuth App client ID.                                 | No       |
| `GITHUB_CLIENT_SECRET` | Required for GitHub OAuth integration. Your GitHub OAuth App client secret.                             | No       |
| `SESSION_SECRET`     | A random string for signing session cookies. **Change this to a long, random string.**                  | No       |
| `CLIENT_ORIGIN`      | The URL the OAuth callback redirects back to (e.g., `http://localhost:5173` for development).           | No       |
| `PORT`               | The port the server listens on. Defaults to `8787`.                                                     | No       |

## Project structure

```
.env.example             # Example environment variables for configuration
.gitignore               # Specifies intentionally untracked files to ignore
README.md                # This README file
client/                  # Frontend application directory
client/index.html        # Main HTML entry point for the client
client/package-lock.json # Locked dependencies for the client
client/package.json      # Client application metadata and scripts (React, Vite)
client/src/              # Client source code
client/tsconfig.json     # TypeScript configuration for the client
client/tsconfig.tsbuildinfo # TypeScript build info for incremental builds
client/vite.config.ts    # Vite configuration for the client
server/                  # Backend application directory
server/package-lock.json # Locked dependencies for the server
server/package.json      # Server application metadata and scripts
server/src/              # Server source code
server/tsconfig.json     # TypeScript configuration for the server
```

## Contributing

We welcome contributions to DocForge! If you have suggestions for improvements or new features, please feel free to open an issue or submit a pull request.

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure they adhere to the project's coding standards.
4.  Submit a pull request with a clear description of your changes.

## License

This project is not currently licensed.

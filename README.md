<div align="center">
  <h1>DocForge</h1>
  **Generates polished `README.md` files for GitHub repositories using Gemini.**
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
| `GITHUB_TOKEN`       | Optional: A GitHub Personal Access

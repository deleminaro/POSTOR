# Vivid Music Player

A modern full-stack music player built with React, Vite, and Express.

## Features
- SoundCloud streaming proxy
- Spotify Search & Authentication
- YouTube Search & Playback
- Genius Lyrics with Gemini AI fallback
- Dark mode UI with Framer Motion animations

## Deployment to GitHub

1.  **Create a new repository** on GitHub.
2.  **Push your code** to the repository:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git remote add origin <your-github-repo-url>
    git branch -M main
    git push -u origin main
    ```

## Hosting (Render, Railway, or Vercel)

Since this is a full-stack app, you need a Node.js environment.

### 1. Render (Recommended)
- Create a new **Web Service**.
- Connect your GitHub repository.
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:** Copy all variables from `.env.example` and set your real API keys.

### 2. Vercel
- Connect your GitHub repository.
- Vercel will automatically detect the Vite frontend.
- For the backend, you may need to adjust the structure to use Vercel's `/api` serverless functions or use a separate hosting for the Express server.

## Environment Variables
Create a `.env` file based on `.env.example` and fill in your API keys:
- `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_API_KEY`
- `GENIUS_ACCESS_TOKEN`
- `GEMINI_API_KEY`
- `SOUNDCLOUD_CLIENT_ID` (Optional, has fallback)

# BellForge ⚒️

**Forge Your Game. No Code Required.**

BellForge is a one-stop game creation tool that lets anyone build their own Android game with a handful of simple prompts. Walk through a 6-step wizard — pick your genre, theme, art style, structure, story — and the forge does the rest.

## Live Demo

**[Try BellForge →](https://billybell991.github.io/bellforge/)**

> The live demo showcases the full wizard UI. To forge real games (with Gemini AI + APK builds), clone and run locally.

## Features

- **7 Genres** — Point & Click, Puzzle, Visual Novel, Platformer, Hidden Object, Escape Room, Interactive Fiction
- **8 Themes** — Horror, Fantasy, Sci-Fi, Mystery, Cozy, Cyberpunk, Steampunk, Post-Apocalyptic
- **7 Art Styles** — Cel-Shaded, Pixel Art, Watercolor, Noir, Neon, Hand-Drawn, Low Poly
- **AI-Powered** — Gemini generates stories, assets, and game configs
- **In-Browser Preview** — Play-test your game in a Canvas-based preview right in the browser
- **Android APK Build** — Compiles a real Kotlin/Canvas APK via Gradle
- **Game Library** — Save, rate, rename, and revisit your forged games

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express + WebSocket (ws) |
| AI | Google Gemini 2.0 Flash |
| Build | Kotlin + Canvas + Gradle |
| Deploy | GitHub Pages (demo) |

## Quick Start (Local)

```bash
git clone https://github.com/billybell991/bellforge.git
cd BellForge
npm run install:all
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create `server/.env`:
```
GEMINI_API_KEY=your_key_here
```

Without the key, BellForge falls back to a curated story bank (still works great).

## Project Structure

```
BellForge/
├── client/          # React + Vite SPA
│   └── src/
│       ├── components/    # Landing, Wizard, BuildProgress, Preview, Deploy, Library
│       ├── hooks/         # useWebSocket
│       ├── styles/        # forge.css (full theme)
│       └── types/         # Shared types, genre/theme/art options
├── server/          # Express + WebSocket API
│   └── src/
│       ├── gemini.ts      # Gemini AI integration + fallback bank
│       ├── index.ts       # API routes + build pipeline
│       └── pipeline/      # Preview generator, scaffold, types
└── .github/workflows/     # GitHub Pages auto-deploy
```

## License

MIT

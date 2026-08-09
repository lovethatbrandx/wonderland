# Wonderland — Fantasy Story Organizer

A creative writing tool for collaborative story building with AI. Users create stories with branching threads, manage characters, and co-write with AI models via OpenRouter, Ollama, or LM Studio.

Built by [Brand X](https://github.com/lovethatbrandx).

## Features

- **AI-Powered Co-Writing** — Write with OpenRouter (cloud), Ollama (local), or LM Studio (local)
- **Branching Stories** — Fork any story at any point to explore different directions
- **Character System** — Create characters with descriptions, traits, knowledge, and aliases
- **@Mention Characters** — Type `@CharacterName` in the editor to inject their context into AI prompts
- **Your Profile** — Tell the AI about your writing preferences so stories are personalized
- **System Prompts** — Save and reuse writing instructions for the AI
- **Import/Export** — JSON, Markdown, chat logs; full library backup
- **Folder Organization** — Nested folders to keep stories organized
- **PWA / Offline** — Installable as an app; works offline for reading

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Docker

```bash
docker compose build
docker compose up -d
# Runs on http://localhost:5173
```

Multi-stage build: Node 22 (build) → Nginx Alpine (serve). See `Dockerfile` and `docker-compose.yml`.

## Deployment

The app is client-side only (React + Vite + static assets). Build once, serve the `dist/` folder with any static file server.

### Nginx

```nginx
server {
    listen 80;
    server_name wonderland.example.com;

    root /path/to/wonderland/dist;
    index index.html;

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker must not be cached
    location /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

> [!NOTE]
> Because the app uses client-side routing, the Nginx `try_files` rule is required to serve `index.html` for all routes (SPA fallback).

### Static Hosting (Vercel, Netlify, etc.)

Upload the `dist/` folder. Most platforms auto-detect Vite projects and apply the SPA fallback automatically.

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4 (with `@tailwindcss/vite` plugin)
- Framer Motion animations
- Lucide React icons
- React Markdown for rendering story content
- localStorage for data persistence
- OpenRouter, Ollama, and LM Studio APIs for AI
- Service Worker + Web Manifest for PWA/offline support

## File Structure

```
public/
├── favicon.svg, manifest.json, sw.js, PWA icons

src/
├── index.css           # Tailwind v4 theme, light/dark palettes, global styles
├── App.jsx             # Main app shell with view routing and theme state
├── store.js            # localStorage CRUD, export, theme, Supabase sync
├── promptBuilder.js    # System prompt assembly (prompt + characters + profile)
├── openrouter.js       # OpenRouter API client (cloud AI)
├── ollama.js           # Ollama API client (local AI)
├── lmstudio.js         # LM Studio API client (local AI, OpenAI-compatible)
└── components/
    ├── Sidebar.jsx         # Navigation, folder/story tree, theme toggle
    ├── StartStory.jsx      # Landing page: story creation, AI prompt, search, export
    ├── StoryEditor.jsx     # Chat-style editor with streaming, branching, @mentions
    ├── CharacterManager.jsx # Character CRUD, SillyTavern import, knowledge sources
    ├── Settings.jsx        # API keys, model management, prompts, cloud sync config
    └── UserProfile.jsx     # User preferences injected into AI prompts
```

## Branding

- App name: "WONDERLAND" in Playfair Display serif font
- Logo: Sparkles (lucide-react) in lavender gradient
- Developer: Brand X (@lovethatbrandx on GitHub)

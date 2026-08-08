# Wonderland — Fantasy Story Organizer

A creative writing tool for collaborative story building with AI. Users create stories with branching threads, manage characters, and co-write with AI models via OpenRouter, Ollama, or LM Studio.

Built by [Brand X](https://github.com/lovethatbrandx).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

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
- Tailwind CSS v4
- Framer Motion
- Lucide React icons
- localStorage for data persistence
- OpenRouter / Ollama / LM Studio for AI

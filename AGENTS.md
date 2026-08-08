# Wonderland - Fantasy Story Organizer

A fantasy story building app developed by [Brand X](https://github.com/lovethatbrandx) (@lovethatbrandx on GitHub).

## Project Overview

**Purpose:** A creative writing tool for collaborative story building with AI. Users create stories with branching threads, manage characters, and co-write with AI models.

**Stack:**
- React + Vite
- Tailwind CSS v4.2.2 (with `@tailwindcss/vite` plugin)
- Framer Motion for animations
- Lucide React for icons
- localStorage for data persistence
- OpenRouter and Ollama APIs for AI
- Service Worker + Web Manifest for PWA/offline support

## File Structure

```
public/
├── favicon.svg         # Lavender sparkles icon
├── manifest.json       # PWA web manifest
├── sw.js               # Service worker with cache-first strategy
├── pwa-192x192.png     # PWA icon (placeholder)
└── pwa-512x512.png     # PWA icon (placeholder)

src/
├── index.css           # Tailwind v4 theme config, light/dark palettes, global styles
├── App.jsx             # Main app shell with view routing and theme state
├── store.js            # Data layer (localStorage CRUD, export, theme)
├── openrouter.js       # OpenRouter API client
├── ollama.js           # Ollama API client
└── components/
    ├── Sidebar.jsx         # Navigation, folder/story tree, theme toggle
    ├── StartStory.jsx      # Landing page: story creation, AI prompt, search, export all
    ├── StoryEditor.jsx     # Chat-style editor, message bubbles, model/prompt select, export
    ├── CharacterManager.jsx # Character CRUD, SillyTavern import
    ├── Settings.jsx        # API keys, models, prompts config
    └── UserProfile.jsx     # Author preferences
```

## Key Features

### PWA / Offline
- Web manifest for installable app (standalone display)
- Service worker with cache-first strategy for static assets
- Network-only for API/cloud calls

### Stories
- Create, edit, delete stories with branching threads
- Folder organization with nested subfolders
- Import from JSON (chat logs) or text/markdown
- Search stories by title or content
- Export individual stories as JSON or Markdown
- Export all stories as a full library backup (JSON or Markdown)
- AI-powered writing with model selection

### Characters
- Character profiles with avatar, description, personality
- Aliases for in-story name references
- Knowledge sources (backstory, notes)
- Context injection rules (when/how character info appears)
- SillyTavern character card import (.png, .json, .tavern)

### AI Integration
- OpenRouter API (with key validation)
- Ollama (local models via CORS proxy)
- Per-thread model selection
- System prompts (customizable per thread)
- Streaming responses

### User Profile
- Author name, bio, writing style preferences
- Injected into AI system prompts for better co-writing

### Theme
- Dark/Light mode toggle with localStorage persistence
- Alice in Wonderland aesthetic - whimsical, elegant, generous spacing
- Light theme: warm lavender/cream backgrounds, deep purple text
- Dark theme: deep purple-black backgrounds, light lavender text

## Design System

### Theme (Alice in Wonderland Aesthetic)

**Dark Palette (default):**
```css
--color-bg-primary: #0d0a1a      /* Deep purple-black */
--color-bg-secondary: #151129      /* Dark purple */
--color-bg-tertiary: #1e1833      /* Medium purple */
--color-bg-card: #1a1530         /* Card background */
--color-bg-input: #12101f        /* Input background */

--color-accent: #c9a0dc          /* Soft lavender */
--color-accent-hover: #dab3ee    /* Lighter lavender */
--color-accent-muted: rgba(201, 160, 220, 0.12)

--color-secondary: #7ecac3        /* Teal */
--color-gold: #e8c872            /* Gold highlights */

--color-text-primary: #f0e6ff     /* Light lavender-white */
--color-text-secondary: #a89cc4  /* Muted lavender */
--color-text-muted: #6b5f8a      /* Dark muted purple */

--color-border: #2d2645          /* Border color */
```

**Light Palette (toggled via `data-theme="light"` on `<html>`):**
```css
--color-bg-primary: #faf5ff      /* Very light lavender-white */
--color-bg-secondary: #f3eef9    /* Light lavender */
--color-bg-tertiary: #ebe3f2     /* Slightly darker lavender */
--color-bg-card: #ffffff         /* White */
--color-bg-input: #f5f0fa        /* Light input background */

--color-accent: #8b5cf6          /* Vibrant purple */
--color-accent-hover: #7c3aed    /* Darker hover */

--color-text-primary: #2d1b4e    /* Deep purple */
--color-text-secondary: #6b558a  /* Muted purple */
--color-text-muted: #a898c4      /* Light muted purple */

--color-border: #d4c8e6          /* Light lavender border */
```

**Typography:**
```css
--font-family-display: 'Playfair Display', Georgia, serif  /* Headers */
--font-family-sans: 'Inter', system-ui, sans-serif        /* Body */
```

**Spacing Scale (generous):**
- Page containers: `px-16 py-16`
- Cards: `p-10-12`
- Buttons: `px-8 py-5`, text-xl, gap-5-6
- Inputs: `py-5 px-6`, text-lg
- Section gaps: `mb-10-16`, `gap-6-8`

**Border Radius:**
```css
--radius-sm: 12px
--radius-md: 16px
--radius-lg: 24px
--radius-xl: 32px
```

**Shadows:**
```css
--shadow-md: 0 12px 32px rgba(0, 0, 0, 0.5)
--shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.6)
```

### Component Classes

**Buttons:**
- `.btn` - Base button (display: inline-flex, padding: 14px 24px, rounded-16px)
- `.btn-primary` - Lavender gradient with glow shadow
- `.btn-secondary` - Dark background with border
- `.btn-ghost` - Transparent with hover state
- `.btn-icon` - Icon-only button (padding: 12px)
- `.btn-danger` - Delete/remove actions

**Inputs:**
- `.input` - Full-width, 2px border, padding: 16px 20px
- `.textarea` - Same styling, resizable vertically

**Cards:**
- `.card` - Dark purple with 2px border, rounded-24px, shadow
- `.card-interactive` - Adds hover lift and glow effect

**Badges/Chips:**
- `.badge` - Rounded pill, subtle background
- `.badge-accent` - Accent color variant
- `.chip` - Removable tag with X button

**Layout:**
- `.dropdown` - Positioned menu with shadow
- `.dropdown-item` - Menu item with hover state
- `.empty-state` - Centered empty state with icon

### Icons
All icons use Lucide React. No emoji in UI.

### Animations
Framer Motion for page transitions, list stagger, modals, and micro-interactions.

## Commands

```bash
npm run dev    # Development server
npm run build  # Production build (outputs to dist/)
npm run lint   # Run ESLint
npm run preview # Preview production build locally
```

## Docker (Local AI)

Ollama setup with CORS proxy:
- `~/docker/local-ai/`
- Nginx proxy on port 11435

## Deployment

The app is client-side only. See `README.md` for Nginx config and static hosting instructions.

## Branding

- App name: "WONDERLAND" in Playfair Display serif font
- Logo icon: Sparkles (lucide-react) in lavender gradient
- Developer: "Brand X" in footer with Globe icon
- GitHub: "@lovethatbrandx" in footer with Code icon

## Notes for AI Agents

- Always use Lucide React icons, never emoji
- Use Tailwind CSS v4 `@theme` variables for colors
- Follow existing component patterns for consistency
- Test build with `npm run build` before committing changes
- Run `npm run lint` and ensure zero errors before committing
- localStorage is the persistence layer (see `store.js`)
- Theme preference is persisted under `wonderland_theme` key
- Design aesthetic: Alice in Wonderland - whimsical, elegant, generous spacing
- Headers use `fontFamily: 'var(--font-family-display)'` (Playfair Display)
- PWA assets (manifest, SW, icons) live in `public/` and are copied to `dist/` by Vite

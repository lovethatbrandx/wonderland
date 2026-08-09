# Wonderland — Fantasy Story Organizer

A fantasy story building app developed by [Brand X](https://github.com/lovethatbrandx) (@lovethatbrandx on GitHub).

## Project Overview

**Purpose:** A creative writing tool for collaborative story building with AI. Users create stories with branching threads, manage characters, and co-write with AI models.

**Stack:**
- React 19 + Vite 8
- Tailwind CSS v4.2.2 (with `@tailwindcss/vite` plugin)
- Framer Motion for animations
- Lucide React for icons
- React Markdown for rendering story content
- localStorage for data persistence
- OpenRouter, Ollama, and LM Studio APIs for AI
- Service Worker + Web Manifest for PWA/offline support
- Supabase for optional cloud character sync

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
├── store.js            # Data layer (localStorage CRUD, export, theme, Supabase sync)
├── promptBuilder.js    # System prompt assembly from prompt + characters + profile
├── openrouter.js       # OpenRouter API client (cloud AI)
├── ollama.js           # Ollama API client (local AI)
├── lmstudio.js         # LM Studio API client (local AI, OpenAI-compatible)
└── components/
    ├── Sidebar.jsx         # Navigation, folder/story tree, theme toggle
    ├── StartStory.jsx      # Landing page: story creation, AI prompt, search, export
    ├── StoryEditor.jsx     # Chat-style editor, streaming, branching, @mentions
    ├── CharacterManager.jsx # Character CRUD, SillyTavern import, knowledge sources
    ├── Settings.jsx        # API keys, models, prompts, Ollama/LM Studio/Supabase config
    └── UserProfile.jsx     # User preferences injected into AI prompts
```

## AI Integration

### Providers (3 supported)

| Provider | Type | Auth | Default URL |
|----------|------|------|-------------|
| **OpenRouter** | Cloud | API key required | `https://openrouter.ai/api/v1` |
| **Ollama** | Local | None | `http://localhost:11434` |
| **LM Studio** | Local | None | `http://localhost:1234/v1` |

Each provider has its own API client (`openrouter.js`, `ollama.js`, `lmstudio.js`) with:
- Streaming responses (SSE for OpenRouter/LM Studio, line-delimited JSON for Ollama)
- Configurable timeout (60s default)
- Exponential backoff retry (3 attempts)
- AbortController for request cancellation

### System Prompt Pipeline (`promptBuilder.js`)

The system prompt sent to the AI is assembled from three sources:

```
┌─────────────────────────────────────────┐
│ 1. System Prompt (user-created)         │
│    e.g. "Write in dark fantasy style"   │
├─────────────────────────────────────────┤
│ 2. Character Context (@mention-based)   │
│    [Character: Elara]                   │
│    Description: An elven ranger...      │
│    Personality: Brave, cunning          │
│    Background: Born in the forest...    │
│    Known as: Ella, Ellie                │
│    [/Character]                         │
├─────────────────────────────────────────┤
│ 3. User Profile                         │
│    [User Profile]                       │
│    Name: Alex                           │
│    Writing Style: Dark and atmospheric  │
│    Preferred Genres: High fantasy       │
│    Background: Loves moral ambiguity    │
│    Bio: Writer from Portland            │
│    [/User Profile]                      │
└─────────────────────────────────────────┘
```

The `buildSystemPrompt()` function takes:
- `activePromptId` — which saved prompt to use
- `prompts` — array of all saved prompts
- `profile` — user profile object
- `characters` — array of characters to inject (only @mentioned ones)

### Character @Mention System

In the StoryEditor, when a user types `@CharacterName` in their message:
1. The editor scans all user entries for `@Name` patterns
2. Matching characters are looked up from the character list
3. Only matched characters are injected into the system prompt
4. This keeps context relevant — no bloated prompts with unused characters

The `@` character panel in the editor also provides a clickable list to insert character names.

## Stories

- Create, edit, delete stories with branching threads
- Folder organization with nested subfolders (recursive `parentId` structure)
- Import from JSON (chat logs with `messages` array), text, or markdown
- Search stories by title or content
- Export individual stories as JSON or Markdown
- Export all stories as a full library backup (JSON or Markdown)
- AI-powered writing with per-thread model selection and system prompt selection
- Continue, regenerate (replaces last AI response), and branch (fork story at any entry)
- Auto-generated titles from first 5 words of AI response
- Streaming responses with live preview

### Story Data Model

```javascript
{
  id: UUID,
  title: string,
  folderId: UUID | null,
  entries: [
    {
      id: UUID,
      text: string,
      author: 'You' | 'AI Model Name' | 'System' | 'Imported',
      timestamp: number
    }
  ],
  modelId: string,        // per-story model override
  systemPromptId: UUID,   // per-story prompt override
  contextSummary: string, // optional context summary
  createdAt: number,
  updatedAt: number
}
```

## Characters

- Character profiles with name, description, traits, portrait image
- Aliases for @mention references (e.g. "Ella" for "Elara")
- Knowledge sources (URL-based, fetched and stored as text)
- Manual knowledge/backstory text
- Character system prompt (injected when @mentioned)
- SillyTavern character card import (.json format)
- Cloud sync via Supabase (reads from `characters` table, skips duplicates by name)

### Character Data Model

```javascript
{
  id: UUID,
  name: string,
  description: string,
  traits: string,        // comma-separated
  aliases: string[],
  systemPrompt: string,  // injected into AI prompt on @mention
  knowledgeManual: string, // backstory, facts, relationships
  knowledgeSources: [
    { id: UUID, url: string, content: string, summary: string | null }
  ],
  image: string,         // base64 data URL
  nsfw: boolean,
  tags: string[],
  sillyTavernData: object | null,
  createdAt: number
}
```

## User Profile

Framed as "Your Profile" — information about the user, not an author character.

Fields: name, bio, writingStyle, preferredGenres, backgroundNotes

Injected into AI system prompts as `[User Profile]...[/User Profile]` blocks so the LLM knows the user's preferences when co-writing.

## System Prompts

- Create, edit, delete named system prompts
- Favorite/star prompts for quick access
- Set a default prompt (used automatically in new stories)
- Per-story prompt override in the editor

## Settings

### API Keys Tab
- OpenRouter API key with validation (tests by fetching models)

### Ollama Tab
- Configurable server URL
- Browse and add local models
- Refresh to discover new models

### LM Studio Tab
- Configurable server URL (OpenAI-compatible API)
- Browse and add local models
- Refresh to discover new models

### Cloud Sync Tab
- Supabase URL and Anon Key configuration
- One-way sync: reads characters from Supabase → localStorage
- Skips duplicates by name (case-insensitive)

### System Prompts Tab
- CRUD for named prompts with favorites and default setting

### Models Tab
- Search and add models from any provider (OpenRouter, Ollama, LM Studio)
- Favorite/star models for quick access
- Set a default model
- Remove models from your collection

## Design System

### Theme (Alice in Wonderland Aesthetic)

**Dark Palette (default):**
```css
--color-bg-primary: #0d0a1a      /* Deep purple-black */
--color-bg-secondary: #151129    /* Dark purple */
--color-bg-tertiary: #1e1833     /* Medium purple */
--color-bg-card: #1a1530         /* Card background */
--color-bg-input: #12101f        /* Input background */

--color-accent: #c9a0dc          /* Soft lavender */
--color-accent-hover: #dab3ee    /* Lighter lavender */
--color-accent-muted: rgba(201, 160, 220, 0.12)

--color-secondary: #7ecac3       /* Teal */
--color-gold: #e8c872            /* Gold highlights */

--color-text-primary: #f0e6ff    /* Light lavender-white */
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
npm run dev     # Development server
npm run build   # Production build (outputs to dist/)
npm run lint    # Run ESLint
npm run preview # Preview production build locally
```

## Docker

Multi-stage build: Node 22 Alpine (build) → Nginx Alpine (serve).

```bash
docker compose build
docker compose up -d
# Runs on http://localhost:5173
```

The `nginx.conf` provides SPA fallback and static asset caching.

## Deployment

The app is client-side only. Build with `npm run build`, then serve the `dist/` folder.

For Nginx, ensure `try_files $uri $uri/ /index.html;` for SPA routing. See `README.md` for full Nginx config.

Static hosting (Vercel, Netlify, etc.): upload `dist/` — most platforms auto-detect Vite and apply SPA fallback.

## Branding

- App name: "WONDERLAND" in Playfair Display serif font
- Logo icon: Sparkles (lucide-react) in lavender gradient
- Developer: "Brand X" in footer with Globe icon
- GitHub: "@lovethatbrandx" in footer with Code icon

## localStorage Keys

| Key | Contents |
|-----|----------|
| `wonderland_stories` | All stories with entries |
| `wonderland_characters` | All characters |
| `wonderland_settings` | API keys, models, prompts config, Supabase config |
| `wonderland_folders` | Folder hierarchy |
| `wonderland_profile` | User profile preferences |
| `wonderland_prompts` | Saved system prompts |
| `wonderland_theme` | Dark/light theme preference |

## Notes for AI Agents

- Always use Lucide React icons, never emoji
- Use Tailwind CSS v4 `@theme` variables for colors (defined in `index.css`)
- Follow existing component patterns for consistency
- Test build with `npm run build` before committing changes
- Run `npm run lint` and ensure zero errors before committing
- localStorage is the persistence layer (see `store.js`)
- Theme preference is persisted under `wonderland_theme` key
- Design aesthetic: Alice in Wonderland — whimsical, elegant, generous spacing
- Headers use `fontFamily: 'var(--font-family-display)'` (Playfair Display)
- PWA assets (manifest, SW, icons) live in `public/` and are copied to `dist/` by Vite
- This is a client-side only app — no backend server for the app itself
- The three AI providers (OpenRouter, Ollama, LM Studio) each have their own API client file
- System prompts are assembled by `promptBuilder.js` from three sources: saved prompt, @mentioned characters, and user profile
- Character @mentions use `@CharacterName` syntax in the editor, scanned via regex
- The `store.js` file handles all localStorage CRUD, export functions, and Supabase cloud sync

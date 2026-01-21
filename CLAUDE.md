# Redash

Browser & Mobile Simulator Manager with Proxy Support - an Electron desktop application.

## Project Overview

Redash allows users to create and manage browser profiles with:
- Proxy configuration (HTTP with authentication)
- Mobile device emulation (iPhone, Android, iPad)
- Multiple browser sessions with isolated storage
- Reddit karma fetching for profiles
- AI integration via Ollama for content generation
- Media file processing (video/image flipping via ffmpeg)

## Tech Stack

- **Framework**: Electron 28
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Phosphor Icons
- **Media**: fluent-ffmpeg with ffmpeg-static
- **AI**: Ollama (local LLM)

## UI Styling Rules

- **Inputs**: Always use `border: none` and `borderRadius: 100px`
- **Buttons**: Always use `borderRadius: 100px`

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Main entry, IPC handlers, browser management
│   ├── preload.ts  # Context bridge for renderer
│   └── flipper.ts  # Media file processing
├── renderer/       # React frontend
│   ├── App.tsx     # Main app component
│   ├── main.tsx    # React entry point
│   └── components/
│       ├── ProfileList.tsx      # Profile list view
│       ├── CreateProfileModal.tsx
│       ├── EditProfileModal.tsx
│       ├── BrowserPanel.tsx     # Embedded browser controls
│       ├── FlipperPage.tsx      # Media processing UI
│       ├── AIPage.tsx           # Ollama AI interface
│       └── ModelModal.tsx       # Model (profile group) modal
└── shared/
    └── types.ts    # Shared TypeScript interfaces
```

## Key Commands

```bash
# Development
yarn dev              # Start dev server (renderer + main)

# Build
yarn build            # Build both renderer and main
yarn package          # Build and package for distribution

# Individual builds
yarn build:renderer   # Vite build for renderer
yarn build:main       # TypeScript compile for main process
```

## Architecture Notes

### Main Process (`src/main/index.ts`)
- Manages browser sessions using `BrowserView` for embedded browsing
- Each profile gets isolated session storage via `session.fromPartition()`
- Proxy authentication handled via `app.on('login')` event
- IPC handlers for all profile/model CRUD operations

### Data Storage
- Profiles and models stored as JSON in `app.getPath('userData')/redash-data/`
- Browser session data persisted per-profile in `profiles/{profileId}/`

### Profile Types
- **Desktop**: Standard browser with custom user agent
- **Mobile**: Device emulation with specific viewport and user agent

### Mobile Devices Supported
iPhone 14/13/12, Pixel 7/6, Galaxy S23/S22, iPad Pro 11, iPad Mini

## IPC Channels

### Profiles
- `profiles:list` / `profiles:create` / `profiles:update` / `profiles:delete`

### Browser Control
- `browser:launch` / `browser:close` / `browser:active`
- `browser:navigate` / `browser:back` / `browser:forward` / `browser:refresh`
- `browser:newTab` / `browser:switchTab` / `browser:closeTab`

### Models (Profile Groups)
- `models:list` / `models:create` / `models:update` / `models:delete`

### AI (Ollama)
- `ollama:isRunning` / `ollama:listModels` / `ollama:generate`
- `ollama:pullModel` / `ollama:deleteModel` / `ollama:install`

## Build Output

- macOS: ARM64 builds (dir + zip) in `release/`
- Windows: x64 portable + zip
- Linux: AppImage + zip

## Database (Supabase)

The app uses Supabase for data storage. Credentials are in `.env` file.

**Supabase Dashboard:** https://supabase.com/dashboard/project/hvesxkydjpqoswxbkysx

For schema changes (new columns, constraints, migrations), run SQL in the **Supabase Dashboard > SQL Editor**.

**Key tables:**
- `app_users` - User accounts with roles (dev, admin, basic). User "roger" should always be 'dev' role.
- `profiles` - Browser profiles
- `models` - Profile groups/models
- `user_model_assignments` - Links users to their assigned models
- `main_emails` / `sub_emails` - Email management

**User Roles:**
- `dev` - Full access (can delete users, models, etc.)
- `admin` - Can create/assign but NOT delete
- `basic` - Limited to assigned models only

## Claude Commands

### "release vX.X.X" or "tag and release vX.X.X"
When the user says "release vX.X.X" or "tag and release vX.X.X" (e.g., "release v1.2.0"), automatically:
1. Run `git add -A && git commit -m "vX.X.X" && git tag vX.X.X && git push origin main --tags`
2. GitHub Actions will build and publish the release automatically

### "release update" (local build)
When the user says "release update", automatically:
1. Run `yarn package` to build for macOS
2. Run `npx electron-builder --win` to build for Windows
3. Clean the release folder (remove `mac-arm64/`, `win-unpacked/`, `*.yml`, `*.blockmap`)
4. List the final distributable files

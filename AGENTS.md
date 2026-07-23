# Reminders (提醒事项)

Apple-style reminders desktop app. Rust + Tauri 2 + React 18 + TypeScript + Tailwind CSS + Vite.

## Commands

```bash
npm install           # frontend deps only (Rust deps resolved automatically by cargo via tauri-cli)
npm run dev           # Vite frontend dev server only (http://localhost:5173)
cargo tauri dev       # full app: dev server + Tauri desktop window
npm run build         # tsc typecheck + vite build (run before cargo tauri build)
cargo tauri build     # production desktop app bundle
npm run build:windows # build Windows EXE (frontend + Tauri)
npm run build:dev     # build development version (debug)
```

No test / lint / format scripts in package.json. TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`.

## Git Flow Workflow

### Branch Structure
- `main` — production releases
- `develop` — development branch (default)
- `release/*` — release preparation branches
- `beta/*` — beta testing branches

### GitHub Actions
Automatic builds triggered on:
- Push to `main`, `develop`, `release/**`, `beta/**`
- Pull request to `main` or `develop`
- Manual workflow dispatch

### Build Environments
| Branch Pattern | Environment | Release Type |
|---------------|-------------|--------------|
| `main` | production | Full release |
| `release/**` | production | Full release |
| `beta/**` | beta | Pre-release |
| `develop` | development | Dev build |

### Optional GitHub Secrets
- `WINDOWS_CERTIFICATE` — Base64-encoded Authenticode certificate (.pfx)
- `WINDOWS_CERTIFICATE_PASSWORD` — Certificate password
- `SLACK_WEBHOOK` — Slack webhook URL for build notifications

### Local Build Script
```powershell
.\scripts\build-windows.ps1 -Branch develop -Version 0.1.0 -Environment development
.\scripts\build-windows.ps1 -Branch release/0.2.0 -Version 0.2.0 -Environment production
```

## Structure

- `src/` — React frontend (entry: `src/main.tsx`)
  - `@/` path alias maps to `src/`
- `src-tauri/` — Rust backend (entry: `src-tauri/src/main.rs`)
  - Tauri commands in `commands.rs`, Repository pattern in `repository/`, SQLite schema in `database/schema.rs`
- `dist/` — Vite build output (consumed by Tauri via `frontendDist: "../dist"`)
- `target/` — Rust build artifacts (gitignored)

## Architecture

- SQLite via rusqlite (`bundled` feature, no system SQLite needed). DB file at Tauri app data dir (`reminders.db`), auto-created on first launch with schema + initial data.
- Date model: `created_date/time` = record creation stamp; `end_date/time` = user due/deadline (drives today/planned/overdue filters and calendar).
- All IDs are UUID v4 strings. Tauri commands accept/return them as plain `String` (not `Uuid`).
- Rust backend: each command receives `State<'_, Database>` which wraps `Arc<Mutex<Connection>>`.
- Frontend: `src/hooks/useApi.ts` (Tauri invoke wrappers) + `src/hooks/useReminderData.ts` (data layer / cache).
- Tauri window: 800×660, frameless (`decorations: false`), transparent background.

## Tailwind Design System

Apple-style color palette and radii defined in `tailwind.config.js` under `theme.extend`. Classes prefixed with `apple-` (e.g. `bg-apple-bg`, `text-apple-blue`, `rounded-apple`). Use these instead of raw Tailwind colors.

## Tauri v2 Notes

- Uses Tauri 2 APIs: `@tauri-apps/api` v2, `tauri::Manager` trait for `path().data_dir()`.
- CSP set in `tauri.conf.json`: `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.

## Important

- Do NOT add tests or CI unless asked — there is none and no convention for it.
- Do NOT change the window decoration or transparency behavior in `tauri.conf.json` without explicit request — these are intentional for the Apple-style UI.

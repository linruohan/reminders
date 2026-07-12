# Reminders (提醒事项)

Apple-style reminders desktop app. Rust + Tauri 2 + React 18 + TypeScript + Tailwind CSS + Vite.

## Commands

```bash
npm install           # frontend deps only (Rust deps resolved automatically by cargo via tauri-cli)
npm run dev           # Vite frontend dev server only (http://localhost:5173)
cargo tauri dev       # full app: dev server + Tauri desktop window
npm run build         # tsc typecheck + vite build (run before cargo tauri build)
cargo tauri build     # production desktop app bundle
```

No test / lint / format scripts in package.json. TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`.

## Structure

- `src/` — React frontend (entry: `src/main.tsx`)
  - `@/` path alias maps to `src/`
- `src-tauri/` — Rust backend (entry: `src-tauri/src/main.rs`)
  - Tauri commands in `commands.rs`, Repository pattern in `repository/`, SQLite schema in `database/schema.rs`
- `dist/` — Vite build output (consumed by Tauri via `frontendDist: "../dist"`)
- `target/` — Rust build artifacts (gitignored)

## Architecture

- SQLite via rusqlite (`bundled` feature, no system SQLite needed). DB file at Tauri app data dir (`reminders.db`), auto-created on first launch with schema + initial data.
- All IDs are UUID v4 strings. Tauri commands accept/return them as plain `String` (not `Uuid`).
- Rust backend: each command receives `State<'_, Database>` which wraps `Arc<Mutex<Connection>>`.
- Frontend calls backend via `@tauri-apps/api` `invoke()` — see `src/hooks/useApi.ts` (Renamed to `useReminderData.ts`).
- Tauri window: 800×660, frameless (`decorations: false`), transparent background.

## Tailwind Design System

Apple-style color palette and radii defined in `tailwind.config.js` under `theme.extend`. Classes prefixed with `apple-` (e.g. `bg-apple-bg`, `text-apple-blue`, `rounded-apple`). Use these instead of raw Tailwind colors.

## Tauri v2 Notes

- Uses Tauri 2 APIs: `@tauri-apps/api` v2, `tauri::Manager` trait for `path().data_dir()`.
- CSP set in `tauri.conf.json`: `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.

## Important

- Do NOT add tests or CI unless asked — there is none and no convention for it.
- Do NOT change the window decoration or transparency behavior in `tauri.conf.json` without explicit request — these are intentional for the Apple-style UI.

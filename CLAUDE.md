# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Build:** `npm run build` (runs `tsc -p tsconfig.json`)
- **Typecheck only:** `npm run typecheck` (runs `tsc --noEmit`)
- **Run:** `npm run start` (runs `node dist/cli.js`)
- **Test:** `npm run test` (builds first, then `node --test`)
- **Run single test:** `npm run build && node --test test/<file>.test.js`

Tests import from `dist/` (compiled JS), so always build before running tests.

## Architecture

This is a terminal virtual pet app built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs). TypeScript source in `src/`, compiled to `dist/`.

### Two layers

- **`src/buddy/`** — Pet data model and rendering. Pure logic, no React dependency (except `CompanionSprite.tsx`).
  - `types.ts` — Species, rarities, stats, hats, eyes. Species names are constructed via `String.fromCharCode` (intentional obfuscation).
  - `companion.ts` — Deterministic pet generation using a seeded PRNG (mulberry32). `roll(userId)` always produces the same companion for a given user. Soul data (name, personality) is stored separately in config and merged at read time via `getCompanion()`.
  - `sprites.ts` — ASCII art frames per species (3 frames each, 5 lines tall, 12 wide). `{E}` placeholder is replaced with the companion's eye glyph.
  - `CompanionSprite.tsx` — Ink component for animated sprite display with idle animation, speech bubbles, and pet-heart effects.

- **`src/app/`** — Shell UI and state management.
  - `App.tsx` — Main Ink app with a scrolling log, text input, and side-panel sprite. Handles terminal resize.
  - `AppState.tsx` — React context for transient UI state (current reaction, pet timestamp).
  - `commands.ts` — `/buddy` command dispatcher (hatch, pet, name, stats, mute/unmute, reroll).
  - `config.ts` — Reads/writes `.data/companion.json` in the project root. Config holds the companion's "soul" (name, personality, hatchedAt) plus mute state. Bones (species, stats, etc.) are always re-derived from the deterministic roll.
  - `reactions.ts` — Random reaction text for petting and name-mention events.

### Key design decisions

- **Bones vs Soul split:** Companion appearance/stats (bones) are deterministic from `userId + SALT` and never persisted. Only soul data (name, personality, hatchedAt) is saved to disk. This means changing `SALT` or the roll algorithm changes everyone's companion.
- **`BUDDY_USER_ID` env var** controls which companion you get (falls back to OS username).
- **Config is a module-level singleton** (`globalConfig` in `config.ts`), loaded once at startup and mutated in-place via `setGlobalConfig`.

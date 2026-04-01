# Claude Pet (Buddy)

Play with the Buddy (virtual pet) in your terminal.

## Quick Start

1. Install dependencies
   - `npm install`
2. Build and run
   - `npm run build`
   - `npm run start`

You should see a prompt. Type `/buddy` to hatch your companion.

## Commands

- `/buddy` — hatch or show buddy status
- `/buddy pet` — pet your buddy
- `/buddy name <name>` — rename your buddy
- `/buddy stats` — show stats
- `/buddy mute` / `/buddy unmute` — hide or show the sprite

## Tips

- Exit with `Ctrl+C` or `Ctrl+D`.
- Buddy data is saved to `.data/companion.json` in this repo.
- Set `BUDDY_USER_ID` to control deterministic species/rarity rolls.

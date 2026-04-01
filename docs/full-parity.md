# Buddy Full Parity Notes

This repo implements the core Buddy (virtual pet) feature as a standalone
Ink-based CLI. Current scope includes:
- Sprite rendering and idle/pet animations
- Deterministic companion roll (by user id)
- `/buddy` commands (hatch, pet, name, stats, mute/unmute)
- Local persistence in `.data/companion.json`
- Logic tests under `test/buddy.test.js`

To reach full parity with the leaked Claude Code implementation, add the
following integrations:

1. Command routing
   - Wire `/buddy` into the main command router and slash-command palette.
   - Add teaser-style highlighting for `/buddy` mentions in the input buffer.

2. Companion observer
   - Implement the per-turn observer that inspects assistant output and
     triggers `companionReaction` updates.

3. Notifications and teaser window
   - Add notification context for the rainbow `/buddy` teaser.
   - Implement teaser window gating (April 1-7, 2026) and always-on after launch.

4. Intro attachment injection
   - Emit `companion_intro` attachments in message history to trigger the
     companion intro text.

5. Config + feature flags
   - Reconnect to the upstream config system and feature flags (BUDDY on/off,
     companion-muted, and deterministic identity via account UUID).

# Timurlenk Turkish Chess - Engine Source Notice

This public repository is kept for open-source license notices and the Fairy-Stockfish / WASM engine files used during Timurlenk Turkish Chess engine experiments.

The full game application source code is not published in this repository.

## What This Repository Contains

- GPL license text.
- Third-party license notices.
- Source distribution notes.
- Fairy-Stockfish / WASM runtime files.
- Timur chess variant configuration and engine experiment files.

## About The Game Engine

Timurlenk Turkish Chess uses a custom Timur chess rules layer because the game is not standard 8x8 chess. Timur chess has a larger board, different pieces, special movement rules, special royal behavior, and different endgame dynamics.

The engine work is split into two areas:

- **Custom Timur rules layer**: validates Timur-specific legal moves and game state.
- **Fairy-Stockfish / WASM layer**: used as an experimental stronger search backend and comparison engine.

The public files in this repository are related to the open-source engine dependency and compatibility work, not the full commercial/game UI codebase.

## GPL Notice

Fairy-Stockfish is GPL licensed. If an application build is distributed with GPL engine components, the corresponding source obligations must be handled correctly for that distributed build.

See:

- `LICENSE`
- `SOURCE_DISTRIBUTION.md`
- `THIRD_PARTY_NOTICES.md`

## Not Included

The following are intentionally not published here:

- full game UI source
- Android project source
- Firebase configuration
- private analytics/storage code
- local build files
- APK/AAB packages
- secrets, service accounts, and signing keys

## License

This repository is distributed under `GPL-3.0-only` for the included GPL-related engine files and notices.

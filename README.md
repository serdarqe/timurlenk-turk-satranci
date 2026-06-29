# Timurlenk Turkish Chess

Timurlenk Turkish Chess is a GPL-3.0-only source release for the Android/Web game and the bundled Fairy-Stockfish / WASM engine integration used by the app.

This repository is intended to provide the corresponding source for public application builds that include GPL engine components. Release builds should be matched to a Git tag so the source, bundled WASM files, and Android/Web build inputs can be reproduced from the same revision.

## What This Repository Contains

- Web game source under `src/`.
- Android / Capacitor project source under `android/`.
- Optional Firebase Functions source under `functions/`.
- Build, release, and validation scripts under `scripts/`.
- Automated tests under `tests/`.
- Public assets under `public`, including Fairy-Stockfish WASM runtime files and attribution files.
- GPL license text.
- Third-party license notices.
- Source distribution notes.

## About The Game Engine

Timurlenk Turkish Chess uses a custom Timur chess rules layer because the game is not standard 8x8 chess. Timur chess has a larger board, different pieces, special movement rules, special royal behavior, and different endgame dynamics.

The engine work is split into two areas:

- **Custom Timur rules layer**: validates Timur-specific legal moves and game state.
- **Fairy-Stockfish / WASM layer**: used as a stronger search backend and comparison engine.

The application can run without private Firebase credentials. Optional Firebase/analytics/game-record features require local configuration files that are intentionally not committed.

## GPL Notice

Fairy-Stockfish is GPL licensed. Application builds distributed with GPL engine components must keep the corresponding source available for that exact build.

See:

- `LICENSE`
- `SOURCE_DISTRIBUTION.md`
- `THIRD_PARTY_NOTICES.md`

## Not Included

The following are intentionally not published here:

- Firebase project secrets and local `.env` files
- Android signing keys and keystore properties
- `google-services.json` with real Firebase values
- APK/AAB packages
- generated build output, caches, and local test artifacts
- service accounts, admin credentials, and private deployment secrets

## License

This repository is distributed under `GPL-3.0-only`.

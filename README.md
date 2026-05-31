# Timurlenk Turkish Chess

[![CI](https://github.com/serdarqe/timurlenk-turk-satranci/actions/workflows/ci.yml/badge.svg)](https://github.com/serdarqe/timurlenk-turk-satranci/actions/workflows/ci.yml)

Timurlenk Turkish Chess is an Android/Web implementation of Tamerlane chess, focused on making a historical chess variant playable, learnable, and testable on modern devices.

The project includes the game rules, board UI, tutorials, match history, time controls, AI opponents, bot ladder, analytics-ready game records, and an evolving chess-engine layer built specifically for Timur chess.

## Highlights

- Play Timur chess on an 11x10 board with variant-specific pieces and movement rules.
- Choose classic difficulty modes, character personalities, or bot opponents.
- Use time controls such as unlimited, 5 minutes, 15 minutes, and 30 minutes.
- Learn the pieces through tutorial and piece-information panels.
- Review match history and game-end analysis.
- Run Android builds through Capacitor.
- Test the rules and AI engine with automated Node.js test suites.

## Engine Overview

This game does not use a standard chess engine as a direct drop-in replacement. Timur chess has different pieces, rules, board size, promotion behavior, and special historical rule handling, so the project keeps a Timur-specific rules and validation layer.

The current engine stack has two main parts:

- **Timur JavaScript engine**: validates legal moves, owns the game rules, handles the board state, evaluates positions, manages AI profiles, opening logic, endgame helpers, bot personalities, and fallback play.
- **Fairy-Stockfish / WASM layer**: used as an experimental hybrid candidate engine for stronger search, debug/shadow comparison, and future Fairy-first play. The app keeps compatibility checks so Fairy output can be compared against the Timur rules layer before it is trusted.

In practical terms, the game engine is a hybrid architecture:

- The Timur engine remains the source of truth for rules.
- Fairy-Stockfish can be used as a stronger move-search candidate.
- The app can fall back to the JavaScript engine when Fairy support is disabled or not available.

Useful developer toggles:

```text
?fairyFork=1   Enable Fairy-first fork mode
?fairyFork=0   Force JS-only fallback mode
```

In the browser console:

```js
window.timurFairyDebug.status()
```

## Repository Layout

```text
android/       Capacitor Android project
fairy-poc/     Fairy-Stockfish proof-of-concept and variant assets
public/        Runtime static assets, Fairy WASM files, sounds, and privacy page
scripts/       Build, GPL, Fairy, validation, and release helper scripts
src/           Game, UI, rules, AI, storage, tutorial, and analysis source code
tests/         Node.js tests for rules, AI, Fairy integration, storage, and UI helpers
```

Important root files:

```text
LICENSE                     GPL-3.0-only license text
SOURCE_DISTRIBUTION.md      Source distribution and GPL release notes
THIRD_PARTY_NOTICES.md      Third-party license notices
package.json                Development, test, build, and release scripts
capacitor.config.json       Capacitor app configuration
firebase.json               Firebase configuration used by the project
firestore.rules             Firestore rules for stored game data
```

These root files are intentional. They make the repository buildable, auditable, and GPL-compliant.

## Quick Start

Requirements:

- Node.js 20+
- npm
- Android Studio / Android SDK for Android builds

Install dependencies:

```powershell
npm install
```

Run a production web build:

```powershell
npm run build
```

Run tests:

```powershell
npm test
```

Run GPL/source release checks:

```powershell
npm run release:gpl:check
```

Run the full release check:

```powershell
npm run release:check
```

## Android Build

Sync the web build into Android:

```powershell
npx cap sync android
```

Build from Android Studio, or use Gradle from the Android folder:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

Release bundle builds require local signing configuration. Keystore files must never be committed.

## Privacy and Game Data

The app can store anonymous game records for match history, balancing, and engine improvement. Private keys, service accounts, keystores, local exports, APK/AAB files, and `.env` files are intentionally excluded from Git.

Ignored local-only files include:

- `.env`
- `secrets/`
- Firebase service account JSON files
- Android keystore files
- generated APK/AAB/APKS packages
- `dist/`, `node_modules/`, local exports, screenshots, and temporary analysis reports

## Third-Party Components

This repository includes Fairy-Stockfish WASM assets and related attribution files. Fairy-Stockfish is GPL-licensed, so this project is distributed under `GPL-3.0-only` when shipped with that engine layer.

See:

- `THIRD_PARTY_NOTICES.md`
- `SOURCE_DISTRIBUTION.md`
- `public/fairy/Copying.txt`
- `public/fairy-singlethread/Copying.txt`

## License

Timurlenk Turkish Chess is released under `GPL-3.0-only`.

See `LICENSE` for the full license text.

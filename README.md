# Timurlenk Fairy-Stockfish Engine Pack

This repository contains a clean public engine package used for Timurlenk Turkish Chess engine experiments.

It does **not** contain the private game application source code, UI code, Android project, Firebase configuration, analytics code, signing keys, or generated APK/AAB builds.

## Engine Status (Experimental / In Progress)

**This engine is experimental and not shipped yet.** The Fairy-Stockfish–based engine in this
repository is still in active testing and is **not** included in the current published Android
build on Google Play. The live app currently runs on the project's own custom Timur
rules-and-AI layer.

The native Timur (Tamerlane) chess engine — both its **rules and its gameplay** — is being
built from scratch and is **not finished yet**. The experimental engine already handles the
larger board, the historical piece set, Picket and Giraffe move generation, core movement,
and a growing set of Timur-specific rule hooks natively. Current native validation covers:

- fortress/citadel entry and citadel-exchange token handling,
- royal swap (king–prince exchange) token handling,
- the pawn-of-pawns staged repatriation and Adventitious King cycle,
- prince / adventitious-king backup royal result gates,
- threefold repetition, fifty-move draw, and stalemate-win rule settings.

The private game rules layer still remains the production authority while the native engine
is being validated against app-state parity fixtures and longer match replay tests.

Because the work is ongoing, the engine files here may change or be rebuilt until the
integration is complete and validated. They are published for transparency and
experimentation, not as a finished production component.

## Related Game

This engine package is used alongside **Timurlenk Turkish Chess**, a mobile game about Tamerlane chess and historical Turkish chess culture.

- Google Play: https://play.google.com/store/apps/details?id=com.timurlenk.turkchess
- Platform: Android
- Focus: playable Timur chess, learning tools, AI opponents, bot difficulty levels, match history, and historical presentation.

The game itself is a separate private application. This repository only publishes the open-source engine dependency package and variant configuration files.

## Purpose

Timurlenk Turkish Chess explores Tamerlane chess, a historical chess variant with a larger board and non-standard pieces. A normal 8x8 chess engine cannot be used directly for this variant, so this repository keeps the open-source engine dependency and variant configuration work separate from the private game app.

This repository is intended to document and preserve:

- Fairy-Stockfish WASM engine binaries and loaders.
- Modified Fairy-Stockfish C++ source for the experimental native Timur build.
- GPL license and attribution files.
- Timur chess variant configuration experiments.
- Checksum information for the included engine binaries.
- A small movement probe that verifies every center-board Timur piece move.

## What Is Timur Chess?

Timur chess, also known as Tamerlane chess, is a large historical chess variant associated with the Timurid period. It is traditionally linked to Timur, also known as Tamerlane, and is remembered for being far more complex than modern 8x8 chess.

Compared with modern chess, Timur chess uses:

- a larger board,
- more piece types,
- different movement patterns,
- variant-specific pawn behavior,
- special royal and fortress/citadel concepts,
- slower and more strategic development.

The result is a game that feels familiar to chess players, but plays differently because the board is wider, pieces have unusual movement rules, and long-term positioning matters heavily.

## Gameplay Overview

The Timurlenk Turkish Chess app adapts Timur chess into a modern mobile format. The game is designed to make the variant easier to learn while preserving its historical identity.

Typical gameplay flow:

1. Choose a starting setup, difficulty mode, side color, AI personality, bot opponent, and time control.
2. Move pieces according to Timur chess movement rules.
3. Use the piece information panel to learn how unfamiliar pieces move.
4. Play against AI opponents with different levels and personalities.
5. Review match history and game-end analysis after the game.

The goal is to outplay the opposing royal side through legal Timur chess moves, tactical threats, material advantage, endgame conversion, or royal/checkmate-style winning conditions implemented by the private game rules layer.

## Rule Concepts

The private game implementation contains the full playable rules. This repository only includes engine-side variant configuration files. At a high level, the game works with these concepts:

- **Large board**: Timur chess is played on a larger board than modern chess, so engines need wider board representation and move generation.
- **Many piece types**: Pieces such as giraffe, camel, elephant, dabbaba, vizier, general, rook, knight, and other historical/variant pieces require custom movement logic.
- **No direct standard-chess drop-in**: A normal chess engine cannot fully understand the game without variant configuration and rule adaptation.
- **Variant pawns**: Pawns are not simply modern chess pawns. Their movement and promotion behavior are tied to Timur chess rules.
- **Royal safety**: The game uses royal-piece safety, check/checkmate-like pressure, and special historical rule handling.
- **Fortress/citadel ideas**: Timur chess traditions include special fortress/citadel concepts that require additional engine-side care.

Because of these rule differences, the app keeps a custom Timur rules layer privately, while this public repository focuses on the open-source Fairy-Stockfish engine package and draft variant configuration work.

## What Is Included

```text
engines/
  fairy-stockfish-nnue-wasm/
    stockfish.js
    stockfish.wasm
    stockfish.worker.js
    uci.js
    package.json

  fairy-stockfish-singlethread-wasm/
    AUTHORS
    Copying.txt
    stockfish.js
    stockfish.wasm
    uci.js
    package.json

variants/
  timur-draft.variants.ini
  timur-piece-map.json

src/
  Modified Fairy-Stockfish source used to build the experimental single-thread Timur WASM.

tests/
  timur-piece-movement-probe.js

LICENSE
SOURCE_DISTRIBUTION.md
CHECKSUMS.sha256
```

## What Is Not Included

The following private application files are intentionally not part of this repository:

- game UI source code
- Android / Capacitor application source
- Firebase configuration
- analytics and cloud storage implementation
- private game assets
- generated APK, AAB, APKS, or build output
- keystores, service accounts, `.env` files, or signing credentials

## Engine Dependency

This repository includes **two separate engine packages**, and they are not the same kind of build.

### 1. `engines/fairy-stockfish-nnue-wasm/` — upstream build (unmodified)

This is the stock multi-threaded WebAssembly build taken directly from the Fairy-Stockfish WASM ecosystem, kept for engine experiments and comparison.

- Package: `fairy-stockfish-nnue.wasm`
- Version: `1.1.11`
- License: `GPL-3.0`
- Upstream WASM project: https://github.com/fairy-stockfish/fairy-stockfish.wasm
- Upstream engine project: https://github.com/fairy-stockfish/Fairy-Stockfish

### 2. `engines/fairy-stockfish-singlethread-wasm/` — modified build

This single-threaded build is **not** an unmodified upstream binary. It is compiled from the Fairy-Stockfish source tree (the same `1.1.11` line) with a **native `timur` (Tamerlane) chess variant added to the engine's `variant.cpp`**, then built to single-threaded WebAssembly with Emscripten for Android / WebView use.

- Base: Fairy-Stockfish (`1.1.11` line)
- Modification: native `timur` variant — larger board, historical pieces, and variant-specific rules
- License: `GPL-3.0`
- Status: experimental / in progress (see **Engine Status** above)

> The `package.json`, `AUTHORS`, and `Copying.txt` files inside this folder are inherited from the upstream package and still carry upstream metadata; the `stockfish.wasm` itself is the modified build described here.

Because this single-threaded build is a **modified version of GPL-3.0 software**, the corresponding modified source is included in this repository under `src/`.

This repository does not claim authorship of upstream Fairy-Stockfish or Stockfish. The multi-threaded package is redistributed as-is; the single-threaded build adds a Timur variant on top of that GPL-3.0 base.

## Timur Variant Configuration

The files in `variants/` are draft configuration files used to experiment with Timur chess compatibility in the Fairy-Stockfish ecosystem.

They are not the full private game implementation. They are kept here so the engine-side work can be inspected independently.

## Quick Verification

The included movement probe loads the single-thread WASM package and checks the center-board legal moves for every Timur piece, including Picket and Giraffe:

```bash
node tests/timur-piece-movement-probe.js
```

## License

This repository is distributed under `GPL-3.0-only` because the included engine dependency is GPL licensed.

See `LICENSE` and `SOURCE_DISTRIBUTION.md`.

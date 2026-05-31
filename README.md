# Timurlenk Fairy-Stockfish Engine Pack

This repository contains a clean public engine package used for Timurlenk Turkish Chess engine experiments.

It does **not** contain the private game application source code, UI code, Android project, Firebase configuration, analytics code, signing keys, or generated APK/AAB builds.

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
- GPL license and attribution files.
- Timur chess variant configuration experiments.
- Checksum information for the included engine binaries.

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

LICENSE
THIRD_PARTY_NOTICES.md
SOURCE_DISTRIBUTION.md
UPSTREAM.md
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

The included engine files come from the Fairy-Stockfish WASM ecosystem:

- Package: `fairy-stockfish-nnue.wasm`
- Version: `1.1.11`
- License: `GPL-3.0`
- Upstream WASM project: https://github.com/fairy-stockfish/fairy-stockfish.wasm
- Upstream engine project: https://github.com/fairy-stockfish/Fairy-Stockfish

This repository does not claim authorship of Fairy-Stockfish or Stockfish. It is a transparent packaging, attribution, and variant-configuration repository for Timurlenk Turkish Chess engine experiments.

## Timur Variant Configuration

The files in `variants/` are draft configuration files used to experiment with Timur chess compatibility in the Fairy-Stockfish ecosystem.

They are not the full private game implementation. They are kept here so the engine-side work can be inspected independently.

## License

This repository is distributed under `GPL-3.0-only` because the included engine dependency is GPL licensed.

See `LICENSE` and `THIRD_PARTY_NOTICES.md`.

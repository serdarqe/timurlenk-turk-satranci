# Timurlenk Fairy-Stockfish Engine Pack

This repository contains a clean public engine package used for Timurlenk Turkish Chess engine experiments.

It does **not** contain the private game application source code, UI code, Android project, Firebase configuration, analytics code, signing keys, or generated APK/AAB builds.

## Purpose

Timurlenk Turkish Chess explores Tamerlane chess, a historical chess variant with a larger board and non-standard pieces. A normal 8x8 chess engine cannot be used directly for this variant, so this repository keeps the open-source engine dependency and variant configuration work separate from the private game app.

This repository is intended to document and preserve:

- Fairy-Stockfish WASM engine binaries and loaders.
- GPL license and attribution files.
- Timur chess variant configuration experiments.
- Checksum information for the included engine binaries.

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

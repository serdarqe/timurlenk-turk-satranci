# Contributions In This Fork

This repository is a downstream Fairy-Stockfish / Stockfish-based engine package for Timur / Tamerlane chess experiments.

It does not claim authorship of Stockfish or Fairy-Stockfish. Those upstream projects provide the base engine architecture, search, evaluation, UCI protocol, build system, and much of the variant infrastructure.

The work in this fork focuses on adapting that base for Timurlenk Turkish Chess engine research.

## Upstream Base

- Stockfish: https://github.com/official-stockfish/Stockfish
- Fairy-Stockfish: https://github.com/fairy-stockfish/Fairy-Stockfish
- Fairy-Stockfish WASM package: https://github.com/fairy-stockfish/fairy-stockfish.wasm

## Timur-Specific Native Engine Work

The main fork-specific work is in the Fairy-Stockfish source under `src/`.

Important areas:

- `src/variant.cpp` and `src/variant.h`
  - Adds the experimental native `timur` variant path.
  - Models the larger Timur board and variant-specific piece/rule configuration.
  - Key symbols include `timur_variant()` and the registered `timur` / `timur_poc` variants.

- `src/position.cpp` and `src/position.h`
  - Adds Timur-specific position-state hooks used by special rule validation.
  - Adds custom attacker/checker handling required by Timur pieces such as Picket and Giraffe.
  - Supports citadel, royal-swap, backup-royal, repetition, and rule-state experiments.
  - Key custom movement helpers include `timur_giraffe_attacks_bb()` and `timur_picket_attacks_bb()`.
  - Key attack/check integration points include `Position::attackers_to()` and the `checkersBB` recomputation path after moves.
  - Key citadel helpers include `timur_try_make_citadel_special_move()`, `timur_try_make_citadel_exchange_plan()`, `timur_try_make_citadel_exchange_native_plan()`, and `timur_citadel_exchange_native_perft_root_token()`.
  - Key royal-swap helpers include `timur_try_make_royal_swap_native_plan()`, `timur_make_royal_swap_native_move()`, and `timur_royal_swap_native_perft_root_token()`.
  - Key pawn-of-pawns helpers include `timur_try_make_pawn_of_pawns_cycle_plan()`, `timur_try_make_pawn_of_pawns_cycle_native_plan()`, and `timur_pawn_of_pawns_cycle_native_perft_root_token()`.
  - Key backup-royal helpers include `timur_has_backup_royal()`, `timur_has_any_royal()`, `timur_effective_royal_piece_type()`, `timur_effective_royal_square()`, and `timur_multi_royal_native_perft_root_token()`.

- `src/movegen.cpp` and `src/movegen.h`
  - Adds or adjusts Timur movement handling where native move generation needs special behavior.
  - Includes pawn-of-pawns cycle handling used by the experimental Timur rules path.

- `src/search.cpp`
  - Exposes special Timur root channels for perft/search validation.
  - Emits special bestmove forms such as `citadel_exchange:...`, `royal_swap:...`, and `pawn_cycle:...` when the position requires a native special-rule action.

- `src/types.h`
  - Carries shared type-level support needed by the custom variant and piece model.

- `src/emscripten/embedded_nnue.h`
  - Supports the single-thread WASM build layout used by this package.

## Variant Configuration Work

The `variants/` folder contains draft engine-side configuration files:

- `variants/timur-draft.variants.ini`
- `variants/timur-piece-map.json`

These files help document and test how Timur chess pieces and board concepts map into the Fairy-Stockfish ecosystem. They are not the private game implementation.

## Validation And Test Work

The `tests/` folder contains Node.js validation scripts for the public engine package:

- `tests/run-timur-rules.js`
  - Runs the main rule validation suite.

- `tests/timur-piece-movement-probe.js`
  - Checks center-board movement for the Timur piece set.

- `tests/timur-piece-edge-blocker-probe.js`
  - Checks edge cases and blockers for custom movement behavior.

- `tests/timur-native-rule-smoke.js`
  - Exercises native special-rule hooks such as citadel exchange, royal swap, pawn cycles, and repetition.

- `tests/timur-app-state-parity.js`
  - Checks selected app-state parity fixtures against the native engine model.

- `tests/timur-js-match-replay.js`
  - Replays selected historical JS-engine match data for rule and move compatibility checks.

The `scripts/` folder contains automation used for engine validation:

- `scripts/run-wasm-ai-vs-ai.mjs`
  - Runs WASM AI-vs-AI smoke/self-play tests.
  - Validates each selected engine `bestmove` against legal root moves.
  - Writes local reports under `reports/`, which is ignored by git.

## Packaging And Compliance Work

This repository also includes:

- `engines/fairy-stockfish-nnue-wasm/`
  - Unmodified upstream WASM engine package kept for comparison and compatibility testing.

- `engines/fairy-stockfish-singlethread-wasm/`
  - Modified single-thread WASM build produced from the source in this repository.

- `CHECKSUMS.sha256`
  - SHA-256 checksums for distributed WASM engine binaries.

- `SOURCE_DISTRIBUTION.md`
  - Notes what source and package files are included for GPL source distribution.

- `.github/workflows/ci.yml`
  - Runs public validation tests on GitHub Actions.

## Private Game Code

The private Timurlenk Turkish Chess game application is intentionally not included here.

This repository only publishes the open-source engine package, the modified engine source needed for GPL compliance, variant configuration experiments, and validation tooling.

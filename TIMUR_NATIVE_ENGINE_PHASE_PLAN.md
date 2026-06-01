# Timur Native Engine Phase Plan

This plan defines the safe path for turning the experimental Fairy-Stockfish Timur fork into a correct native Timur chess engine.

Main priority:

1. Fix all piece movement first.
2. Add automated movement/perft tests.
3. Rebuild and verify the WASM engine.
4. Move special Timur rules from the app wrapper into native C++ step by step.

The private game application must not be mixed into this repository. This plan is for the public GPL engine fork only.

## Current Status

The native `timur` variant exists in the modified Fairy-Stockfish source tree and is visible through UCI:

- `UCI_Variant = timur`
- Board size: 11 files x 10 ranks
- Starting position: native Timur-style setup
- Basic pieces: mostly working

Verified status after the clean single-thread WASM rebuild:

- `T` / Picket generates diagonal moves of distance 2 or more.
- `Z` / Giraffe generates the native diagonal-step plus long-orthogonal continuation pattern.
- The permanent center-board movement probe passes for all Timur pieces.
- Citadel entry is now partially native: root search recognizes a legal opposite-citadel royal entry as an optional draw claim and returns a draw result instead of an ordinary move.
- Citadel exchange now has a native root special channel plus a guarded internal `SPECIAL` move encoding bridge. The exchange move can now be applied and reverted through `do_move` / `undo_move` in perft, with the lower royal removed from the board as an off-board citadel occupant and restored through `StateInfo`. Exchange target selection is no longer locked to the original `F5/F6` smoke squares; the native generator scans the board for same-color lower royal targets (`Q/A`) and emits dynamic tokens such as `citadel_exchange:a10:c4@blackcitadel`. The one-time exchange flag is now tracked in reversible native state and included in the position key so a side cannot perform a second exchange after its royal returns to the citadel-entry square.
- Royal swap, pawn-of-pawns cycle, and multi-royal result logic are still being promoted step by step. The current native layer now knows that Shah, Prince, or Adventitious King can keep a Timur side alive, and it blocks royalless sides from continuing.

## Phase 0: Source Hygiene and Reproducibility

Status: partially complete. The modified Fairy-Stockfish C++ source tree is now included under `src/`, generated object/WASM files are excluded, and README/source distribution notes no longer describe the modified binary as source-on-request only. A dedicated `BUILD.md`, `MODIFICATIONS.md`, and `TESTING.md` still need to be finalized.

Goal: make the engine fork auditable before changing behavior.

Tasks:

- Add the modified Fairy-Stockfish C++ source tree to the public engine repository.
- Exclude object files, generated WASM, temporary build files, caches, and private app files.
- Add `BUILD.md` with Emscripten version, exact build command, output paths, and expected checksums.
- Add `MODIFICATIONS.md` describing Timur-specific C++ changes.
- Add `TESTING.md` describing UCI/perft test commands.

Acceptance criteria:

- Public repo contains the corresponding source for any modified GPL binary it ships.
- A fresh checkout can rebuild the same style of WASM binary.
- The README no longer says or implies that a modified binary is only stock upstream packaging.

## Phase 1: Piece Movement Baseline

Goal: define the correct expected movement for every Timur piece before fixing code.

Pieces to cover:

- Shah / King
- Vizier
- General
- Rook
- Knight
- Elephant
- Dabbaba
- Camel
- Sea monster
- Lion
- Bull
- Revealer
- Prince
- Adventitious king
- Pawn
- Picket
- Giraffe

Tasks:

- Create a machine-readable piece movement test table.
- For each piece, define center-board legal moves.
- For each piece, define edge/corner legal moves.
- For jumping pieces, confirm blockers do not stop the jump.
- For sliding pieces, confirm blockers stop movement and captures are legal only on the first occupied square.
- For special two-stage pieces, define blocker behavior precisely.

Acceptance criteria:

- Every piece has at least one empty-board test.
- Every non-trivial piece has blocker/capture tests.
- Tests can run against the WASM engine and fail clearly when moves are wrong.

## Phase 2: Fix Picket and Giraffe Move Generation

Goal: make the currently failing native pieces generate legal moves.

Original verified failures:

- `Picket` / `T`: expected diagonal slider with minimum 2 squares, but the stale WASM generated no moves.
- `Giraffe` / `Z`: expected one empty diagonal step, then at least 3 straight orthogonal squares in the same diagonal direction, but the stale WASM generated no moves.

Resolution:

- The C++ source already contained native helper hooks for these two pieces.
- The packaged WASM was stale; `make clean` plus a fresh single-thread Emscripten rebuild pulled the native movement code into the binary.
- `tests/timur-piece-movement-probe.js` now passes for both pieces and the rest of the center-board movement table.

Likely technical checks:

- Confirm that `CUSTOM_PIECE_9` and `CUSTOM_PIECE_10` are valid and included in `PieceSet`.
- Confirm `variant.cpp` registers enough custom pieces safely.
- Confirm `position.h` helper checks identify `T` and `Z` correctly.
- Confirm `movegen.cpp` calls `Position::moves_from()` / `Position::attacks_from()` for these piece types.
- Confirm the rebuilt WASM actually includes the modified source.

Implementation tasks:

- Fix the native piece type registration if the custom-piece range is too small.
- If needed, move `PICKET` and `GIRAFFE` to supported built-in/custom slots.
- Wire `timur_picket_attacks_bb()` and `timur_giraffe_attacks_bb()` into generated legal moves.
- Add capture and blocker tests for both pieces.

Acceptance criteria:

- `Picket` generates diagonal moves of distance 2 or more.
- `Picket` does not generate one-square diagonal moves.
- `Giraffe` requires the first diagonal step to be empty.
- `Giraffe` generates valid long orthogonal continuation moves after the diagonal leg.
- Both pieces support captures correctly.
- Existing passing pieces still pass.

## Phase 3: Complete Piece Movement Test Suite

Status: started. `tests/timur-piece-movement-probe.js` is now permanent and covers center-board movement for every Timur piece. Edge/corner, blocker, capture, black-side mirror, and promotion-region tests still need to be added.

Goal: prevent future fixes from breaking other pieces.

Tasks:

- Convert the current probe into a permanent test script.
- Add tests for initial position move count.
- Add per-piece empty-board tests.
- Add per-piece blocker tests.
- Add promotion-region movement tests.
- Add black-side mirrored tests.

Acceptance criteria:

- Test suite reports pass/fail by piece name.
- All basic movement tests pass before special rules are started.
- The suite runs from a simple command documented in `TESTING.md`.

## Phase 4: Native WASM Rebuild and Package Update

Status: partially complete for the single-thread WASM package. The rebuilt `stockfish.js` and `stockfish.wasm` are copied into `engines/fairy-stockfish-singlethread-wasm`, `CHECKSUMS.sha256` is regenerated, and the movement probe passes. Source-to-binary documentation still needs a final pass after the public C++ source tree is committed.

Goal: ensure the game/repo uses the fixed engine binary, not an old stale WASM.

Tasks:

- Rebuild the single-thread WASM from the corrected C++ source.
- Copy updated `stockfish.js`, `stockfish.wasm`, and `stockfish.worker.js` into the engine package.
- Regenerate `CHECKSUMS.sha256`.
- Run the piece movement test suite against the rebuilt WASM.
- Update `SOURCE_DISTRIBUTION.md` with exact source-to-binary mapping.

Acceptance criteria:

- The included WASM passes all piece movement tests.
- Checksums match the newly built files.
- The repo clearly says which source produced which binary.

## Phase 5: Native Rule Boundary Definition

Goal: define exactly which rules are still app-wrapper rules and which will move native.

Status: started. `tests/timur-native-rule-smoke.js` now locks the current native smoke-token contract for citadel entry, citadel exchange, royal swap, and pawn-of-pawns cycle. It also verifies that citadel entry/exchange tokens are not emitted for the wrong side to move or non-royal pieces. These are still not full legal native moves yet; the test exists so each rule can be promoted one by one without losing the existing bridge behavior or accidentally over-allowing illegal citadel cases.

Rules to classify:

- Threefold repetition
- 50-move rule
- Stalemate win/loss handling
- Citadel draw
- Citadel entry
- Citadel exchange
- Royal swap
- Prince royal backup logic
- Adventitious king logic
- Pawn-of-pawns promotion/repatriation cycle
- Promotion suffix handling
- Final game result classification

Acceptance criteria:

- Each rule has one owner: native engine, app wrapper, or transitional dual-validation.
- No rule has ambiguous authority.
- `MODIFICATIONS.md` documents the current owner for every special rule.

## Phase 6: Native Repetition, 50-Move, and Stalemate Result Validation

Goal: lock the already simple rule layer before complex Timur-specific rules.

Tasks:

- Verify `nFoldRule = 3`.
- Verify `nMoveRule = 50`.
- Verify `stalemateValue = VALUE_MATE` behaves like the intended Timur result.
- Add UCI/perft or direct result tests where possible.
- Keep JS wrapper validation until native behavior is proven.

Acceptance criteria:

- Repetition result is detectable.
- 50-move result is detectable.
- Stalemate result matches the app's Timur result rule.

## Phase 7: Native Citadel Entry and Citadel Draw

Status: partially complete. Citadel entry is now recognized as a native optional draw claim for the `timur` variant at root search. In a citadel-entry position, UCI `go depth 1` returns a depth-0 draw score and `bestmove (none)` instead of continuing with an ordinary board move. The existing perft smoke token remains as bridge/debug output until the full special-move representation is designed.

Goal: move citadel entry/draw from wrapper-only logic into the native engine.

Key design issue:

- Citadels are off-board coordinates in the game model.
- The native 11x10 board does not naturally contain those squares.

Tasks:

- Decide native representation: special move token, virtual square, or result-only event.
- Implement native legal detection for royal entry into own citadel.
- Implement draw/result resolution.
- Add apply/revert safety tests.
- Add perft root-token tests for citadel entry.

Acceptance criteria:

- Legal citadel entry is recognized as an optional root draw claim.
- Illegal citadel entry is rejected by the smoke-token gate.
- Draw/result state is stable for root search.
- Search does not crash or corrupt board state in the tested root-claim path.
- Remaining: decide whether citadel entry should stay result-only or become a real reversible special move.

## Phase 8: Native Citadel Exchange

Status: partially complete. The native smoke test verifies exchange-token detection and target royal filtering. Root search now has a native special bestmove channel for valid exchange positions: it returns dynamic tokens such as `bestmove citadel_exchange:a10:f5@blackcitadel`, `bestmove citadel_exchange:a10:c4@blackcitadel`, `bestmove citadel_exchange:k1:f6@whitecitadel`, or `bestmove citadel_exchange:k1:e7@whitecitadel` instead of collapsing the position into the citadel-entry draw claim. The native exchange snapshot also emits the intended dual-relocation effect string, for example `apply=a10->f5,f5->blackcitadel flag=1`. A guarded internal bridge encodes the same exchange as a Fairy-Stockfish `SPECIAL` move (`a10f5`, `a10c4`, `k1f6`, `k1e7`, etc.) and reports it through `info string timur_special citadel_exchange encoded=... type=special`. The bridge is now reversible in perft: `do_move` moves the active royal to the lower royal's square, stores the lower royal in `StateInfo` as an off-board citadel occupant, and `undo_move` restores both pieces. The one-time exchange flag is now stored in copied `StateInfo`, included in the hash key, consumed on exchange, and verified by a smoke test that returns the royal to the entry square and confirms no second exchange is generated.

Goal: support the compound citadel exchange rule natively.

Important rule/channel decision:

- A citadel exchange setup also satisfies the citadel-entry draw-claim condition.
- Current native behavior now distinguishes the two channels at root: exchange is emitted as a custom `bestmove` token, while plain citadel entry remains `bestmove (none)` with a draw score.
- Current native behavior also records the intended two-piece relocation contract: active royal moves to the lower royal's square, the lower royal moves to the off-board citadel, and the one-time flag is consumed and carried forward in native state.
- Current native behavior also validates an internal `SPECIAL` move encoding for the exchange and exposes it through `MoveList<LEGAL>` for any board-scanned same-color lower royal target that passes the native gate.
- Remaining promotion work: decide when the root search should prefer the custom bestmove token versus ordinary special-move search, and broaden app/native parity tests beyond synthetic smoke positions.

Tasks:

- Model one-time exchange flags. Done for native copied state and position hashing.
- Generate the special exchange move only when legal.
- Apply both piece relocations atomically.
- Revert both relocations correctly in search.
- Encode the move in UCI-compatible or documented custom notation.

Acceptance criteria:

- Exchange is generated only in valid positions.
- Exchange is generated only in valid smoke positions.
- Root search can return exchange through the native special bestmove channel.
- Native smoke verifies the dual-relocation effect string for both colors.
- Native smoke verifies the guarded internal `SPECIAL` move encoding for both colors.
- Exchange can be applied/reverted through `go perft 2` without state corruption in both the original smoke positions and broader non-smoke target positions.
- Exchange is blocked after the same side has already used its one-time exchange flag, even if the active royal returns to the citadel-entry square.
- Remaining: exchange can be searched under long search/depth conditions without state corruption.
- Remaining: repetition/hash stability should be stress-tested against longer real-game sequences.
- Remaining: app wrapper and native engine agree on legal positions beyond the two smoke positions.

## Phase 9: Native Royal Swap

Status: partially complete. Royal swap is now represented as a native check-escape move for the `timur` variant. The native generator emits the swap during evasions, `do_move` / `undo_move` apply and revert the king-target relocation, and the one-time ransom flag is stored in copied `StateInfo` and included in the position key. The smoke suite now verifies both colors, apply/revert stability, and the important one-time case where the royal returns to a swap-capable square but the consumed flag prevents a second swap. It also verifies a post-swap continuation sequence where the swapped position receives a later check and the engine still enforces strict evasion instead of allowing unrelated quiet moves. A state-ordering bug was fixed by detecting royal-swap before `do_move` switches to the new `StateInfo`; this avoids reading not-yet-recomputed checker state and prevents the move from degrading into an ordinary same-color occupied-square move.

Goal: move king-prince royal swap logic into the engine.

Tasks:

- Define exact trigger condition.
- Generate royal swap as a special move.
- Preserve check/evasion rules.
- Update royal-state tracking after swap.
- Add apply/revert tests.

Acceptance criteria:

- Legal royal swap appears in the native evasion move list. Done for current smoke coverage.
- Illegal second royal swap is blocked after the one-time flag is consumed. Done for current smoke coverage.
- Swap can escape/check states only when historically/legalistically allowed. Partially done: current native gate requires side-to-move to be in check and the target to be a friendly non-king piece; post-swap strict evasion is now covered by smoke.
- Search/perft can evaluate after swap without state corruption. Done for current smoke depth, including one post-swap continuation search case.
- Remaining: broaden royal hierarchy parity tests beyond synthetic smoke positions and connect this with longer Phase 11 multi-royal result sequences.

## Phase 10: Native Pawn-of-Pawns Cycle

Goal: implement the full pawn-of-pawns repatriation and adventitious king path.

Status: partially complete. The first native cycle layer is now implemented as a reversible `SPECIAL` move for the `timur` variant. A pawn on the promotion rank can generate a native repatriation move back to the file-specific return square, the move is applied/reverted through `do_move` / `undo_move`, and pawn cycle stage data is carried in copied `StateInfo` so staged pawns can keep their cycle state after ordinary pawn movement. The position key now includes staged pawn markers, and captures of staged pawns clear that marker. The smoke suite verifies the existing token bridge plus white and black native apply/revert repatriation through perft.

Tasks:

- Define pawn subtype stages.
- Define first return square.
- Define second return square.
- Define final promotion to adventitious king.
- Track cycle state in reversible game state.
- Add UCI notation for the special cycle.
- Add promotion tests.

Acceptance criteria:

- Pawn-of-pawns cycle follows the app rule exactly. Partially done: native repatriation and stage tracking are implemented, while full app parity for every historical subtype path still needs longer sequence tests.
- Illegal cycle shortcuts are rejected. Partially done: native generation requires `timur`, side-to-move pawn, promotion rank, valid stage, and an empty return square unless creating an adventitious king.
- Apply/revert is stable. Done for current white/black repatriation smoke coverage.
- Hash/repetition state accounts for cycle state. Partially done: staged pawn markers are included in the key and move with ordinary pawn movement; broader long-game repetition stress tests remain.
- Remaining: add full adventitious-king apply/revert sequence tests and connect the resulting custom royal piece with Phase 11 multi-royal result logic.

## Phase 11: Native Multi-Royal Result Logic

Goal: make the engine understand Shah, Prince, and Adventitious King result logic natively.

Status: partially complete. Native Timur royal classification now recognizes three survival pieces: Shah/King, Prince, and Adventitious King. `is_immediate_game_end()` now has a Timur-specific safety gate: if a side has none of those royal pieces, the game is immediately resolved as a loss for that side; if both sides have no royal, it resolves as a draw. If the Shah is absent but a Prince or Adventitious King exists, the side remains alive and legal move generation continues.

Second-layer native check handling is also in place. The engine now computes an "effective royal square" for Timur positions. While the Shah exists, this remains the Shah. If the Shah is gone, the Prince is used as the effective royal; if the Prince is also absent and an Adventitious King exists, the Adventitious King is used. `set_check_info()`, `legal()`, `pseudo_legal()`, `gives_check()`, `do_move()` checker updates, and evasion move generation now use this effective royal target in the guarded Timur path. This means a checked backup royal can move out of check like a royal, and unrelated moves are blocked while the backup royal is under attack.

The smoke suite now covers Prince backup, Adventitious King backup, royalless loss gates for both colors, backup-Prince check/evasion filtering for both colors, backup-Adventitious-King check/evasion filtering for both colors, royal-swap continuation/evasion sanity, and root-search sanity checks proving backup royals still produce real bestmoves instead of `bestmove (none)`. It also verifies that a root position where either side has no remaining royal stops immediately with `info depth 0 score mate 0` and `bestmove (none)` instead of searching ordinary pawn moves. Additional checkmate-like root-result smoke positions now cover both colors for Shah, Prince backup, and Adventitious King backup, proving that the native search stops cleanly when the effective royal has no legal continuation.

Tasks:

- Define which pieces are royal at each phase. Partially done for the native survival/check target gate: Shah, Prince, and Adventitious King are classified.
- Define what happens when the Shah is lost but Prince exists. Partially done: the side remains alive and the Prince becomes the effective royal check target.
- Define what happens after royal swap.
- Define what happens when Adventitious King exists. Partially done: the side remains alive and the Adventitious King can become the effective royal check target when no Shah/Prince exists.
- Implement native check/checkmate/result logic. Partially done for immediate royalless loss, effective backup royal check detection, move legality, and evasion generation.
- Add result classification tests. Started: smoke tests cover backup survival, no-royal loss gates, root-search stop behavior when either side has no royal, Shah/Prince/Adventitious-King checkmate-like root stops for both colors, backup royal check/evasion filtering, and backup royal root-search sanity.

Acceptance criteria:

- Engine and app agree on win/loss/draw for royal scenarios. Partially proven for no-royal loss, royalless root-result stop behavior, Shah/Prince/Adventitious-King checkmate-like root stops, backup-royal survival, backup-royal check/evasion, and root-search sanity smoke positions.
- Engine no longer relies on JS for final royal result.
- Checkmate/search output is meaningful for Timur royal hierarchy. Started: synthetic root-result smoke positions now cover Shah, Prince backup, and Adventitious King backup for both colors.
- Remaining: broaden true checkmate parity tests beyond synthetic smoke positions and add longer app/native result comparison cases.

## Phase 12: App Integration Safety Phase

Goal: switch the game from wrapper-authoritative to native-authoritative safely.

Tasks:

- Add a feature flag: `nativeTimurRules`.
- Run dual validation: JS legal moves vs native legal moves.
- Log mismatches without crashing release builds.
- Use native engine for bot search only after movement and rules match.
- Keep rollback path to custom JS motor.

Acceptance criteria:

- No user-facing rule regression.
- Mismatch logs are actionable.
- Native engine can be disabled remotely or by config if needed.

## Phase 13: AI Quality and Search Tuning

Goal: use the correct native engine to improve actual gameplay quality.

Tasks:

- Re-test openings after native move correctness.
- Re-test endgames after native royal/citadel rules.
- Re-run AI-vs-AI automation.
- Tune evaluation only after legal move correctness is proven.
- Compare JS AI vs native Fairy engine behavior.

Acceptance criteria:

- Fewer illegal/missing special moves.
- Fewer artificial draws from engine misunderstanding.
- Stronger endgame conversion.
- Opening and middlegame decisions no longer depend on wrong piece mobility.

## Phase 14: Public Release Readiness

Goal: prepare the engine repo for GPL/public review.

Tasks:

- Ensure source, build scripts, license, notices, and checksums are complete.
- Tag a release for the exact engine version used by the APK.
- Link the public source repo from the app privacy/about page.
- Add changelog for engine changes.
- Add known limitations if any native rules remain incomplete.

Acceptance criteria:

- GPL source distribution is defensible.
- The public repo does not contain private game code.
- The public repo does contain enough source to rebuild the modified engine binary.
- Documentation clearly separates upstream Fairy-Stockfish work from Timurlenk-specific modifications.

## Recommended Execution Order

Do not start native special rules before piece movement is fully correct.

Safe order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7+

The most urgent bug is Phase 2: `Picket` and `Giraffe` currently do not move in the tested WASM.

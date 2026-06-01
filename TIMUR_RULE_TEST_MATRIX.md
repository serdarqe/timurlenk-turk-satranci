# Timur Rule Test Matrix

This matrix tracks the native Timur rule coverage for the public Fairy-Stockfish fork.

Run all current rule checks with:

```powershell
npm run test:timur-rules
```

## Current Automated Coverage

| Rule area | What is checked | Test file | Status |
|---|---|---|---|
| Basic piece movement | Center-board legal moves for every Timur piece | `tests/timur-piece-movement-probe.js` | Covered |
| Edge and corner movement | Corner/edge legal moves for every Timur piece class | `tests/timur-piece-edge-blocker-probe.js` | Covered |
| Blocker and capture movement | Own-piece blockers, first enemy captures, pawn captures, and jumper path behavior | `tests/timur-piece-edge-blocker-probe.js` | Covered |
| Full per-piece blocker matrix | Individual blocker/capture fixtures for pawn, royal, slider, jumper, and fixed-range piece classes | `tests/timur-piece-edge-blocker-probe.js` | Covered |
| Black mirrored edge/blocker movement | Vertical mirror of white edge/blocker fixtures for black pieces | `tests/timur-piece-edge-blocker-probe.js` | Covered |
| Picket movement | Diagonal moves of distance 2 or more | `tests/timur-piece-movement-probe.js` | Covered |
| Giraffe movement | Diagonal step plus long orthogonal continuation | `tests/timur-piece-movement-probe.js` | Covered |
| Citadel entry | Side-to-move gate, royal-only gate, root draw claim | `tests/timur-native-rule-smoke.js` | Covered |
| Citadel exchange | Dynamic target scan, royal target filter, special bestmove channel | `tests/timur-native-rule-smoke.js` | Covered |
| Citadel exchange state | Apply/revert stability and one-time exchange flag | `tests/timur-native-rule-smoke.js` | Covered |
| Royal swap | Native special evasion move for both colors | `tests/timur-native-rule-smoke.js` | Covered |
| Royal swap state | Apply/revert stability and one-time ransom flag | `tests/timur-native-rule-smoke.js` | Covered |
| Pawn-of-pawns cycle | Stage token bridge, first native repatriation, and apply/revert stability | `tests/timur-native-rule-smoke.js` | Covered |
| Pawn-of-pawns stage carry | Stage-two pawn state survives ordinary forward movement after first repatriation | `tests/timur-native-rule-smoke.js` | Covered |
| Pawn-of-pawns promotion boundary | Staged pawn re-enters the promotion rank as a pawn instead of being forced into ordinary promotion | `tests/timur-native-rule-smoke.js` | Covered |
| Pawn-of-pawns repeated repatriation | Stage-two pawn can repatriate again after promotion-rank re-entry | `tests/timur-native-rule-smoke.js` | Covered |
| Pawn-of-pawns Adventitious King cycle | Full white and black mirrored cycles create an Adventitious King after the final stage | `tests/timur-native-rule-smoke.js` | Covered |
| Prince backup royal | Side survives without Shah, Prince becomes effective royal | `tests/timur-native-rule-smoke.js` | Covered |
| Adventitious King backup royal | Side survives without Shah/Prince, Adventitious King becomes effective royal | `tests/timur-native-rule-smoke.js` | Covered |
| No-royal result gate | Side with no remaining royal cannot continue | `tests/timur-native-rule-smoke.js` | Covered |
| Root result stop | Search returns `bestmove (none)` when either side has no royal | `tests/timur-native-rule-smoke.js` | Covered |
| Checkmate-like root result | Shah, Prince backup, and Adventitious King backup stop at root for both colors | `tests/timur-native-rule-smoke.js` | Covered |
| Backup royal evasion | Checked Prince/Adventitious King must respond like a royal | `tests/timur-native-rule-smoke.js` | Covered |
| App-state parity fixtures | App-style snapshots convert to native FEN and expose the same special root moves for citadel, royal swap, and pawn-of-pawns cycles | `tests/timur-app-state-parity.js` + `tests/fixtures/app-game-state-parity.json` | Covered |

## Known Gaps

| Gap | Why it matters | Next test direction |
|---|---|---|
| Live exported game records | App-style parity fixtures are covered; full Firestore/local exported match records are not yet replayed end-to-end | Add a replay importer that derives parity fixtures from exported match JSON |
| True game-history parity | Smoke positions are synthetic and short | Compare native results against recorded app game states |
| Repetition/hash stress after special moves | Citadel exchange, royal swap, and pawn cycle modify state flags | Add longer perft/search sequences with repeated positions |
| Full stalemate classification parity | Current root-result tests prove no-move stop, not every app result label | Add app/native result label comparison fixtures |

## Test Philosophy

- Keep synthetic smoke positions small and readable.
- Every special native rule needs at least one positive and one negative test.
- Every reversible special move needs an apply/revert test through `go perft 2`.
- Longer AI-vs-AI automation should run only after this rule matrix passes.

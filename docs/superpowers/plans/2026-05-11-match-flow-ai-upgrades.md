# Match Flow and AI Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add timed games, rematch, quick start, match history, AI personas, opening book support, and stronger hard/endgame behavior without breaking the current Firebase game record and analysis flow.

**Architecture:** Keep the existing `main.js` orchestration style, but move each new system into focused modules under `src/game`, `src/ai`, and `src/storage`. UI additions should extend the existing menu overlays and game HUD rather than introducing a second navigation model. AI improvements should feed the current worker pipeline before minimax, not replace the engine.

**Tech Stack:** Vite, plain JavaScript ES modules, Capacitor Android, Firebase Auth/Firestore, Web Worker AI, Node test runner.

---

## Current Findings

- Game start currently flows through `src/main.js:startGame(formation, difficulty, isScripted, onlineSnapshot)`.
- Difficulty is currently selected with `selectedDifficulty` and stored on `gameState.difficulty`.
- AI is black-only in normal local games and is driven by `src/ai/AIEngine.js` plus `src/ai/ai.worker.js`.
- AI already has profile weights in `src/ai/AIProfiles.js`, adaptive depth in `src/ai/AiStrategy.js`, and evaluation in `src/ai/AiEvaluation.js`.
- Game records already go to Firebase through `src/storage/GameRecordBuilder.js` and include moves, difficulty, formation, result, and duration.
- There is already a move log panel, but not a proper match history screen.
- There is no current time-control model on `GameState`.
- There is no opening book layer before worker search.
- There is no endgame tablebase. A practical first version should be a deterministic endgame policy/evaluator, not a true exhaustive tablebase.

## Proposed Build Order

1. Time controls and clock UI
2. Rematch and quick start
3. Local match history screen
4. AI personas
5. Hard opening book
6. Endgame policy improvements
7. Telemetry/report updates and release QA

This order gives the player-visible flow first, then makes AI stronger in a controlled way.

---

## Task 1: Time Controls

**Files:**
- Create: `src/game/TimeControls.js`
- Modify: `src/game/GameState.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `src/styles/board.css`
- Modify: `src/utils/i18n.js`
- Modify: `src/storage/GameRecordBuilder.js`
- Test: `tests/time-controls.test.js`

- [ ] Add `TIME_CONTROLS` constants for `none`, `5+0`, `15+0`, `30+0`.

Expected model:

```js
export const TIME_CONTROLS = Object.freeze({
  NONE: Object.freeze({ id: 'none', labelKey: 'time.none', initialMs: null, incrementMs: 0 }),
  FIVE: Object.freeze({ id: '5m', labelKey: 'time.5m', initialMs: 5 * 60 * 1000, incrementMs: 0 }),
  FIFTEEN: Object.freeze({ id: '15m', labelKey: 'time.15m', initialMs: 15 * 60 * 1000, incrementMs: 0 }),
  THIRTY: Object.freeze({ id: '30m', labelKey: 'time.30m', initialMs: 30 * 60 * 1000, incrementMs: 0 })
});
```

- [ ] Add `timeControl`, `clock`, and `clockStartedAt` fields to `GameState`.

Expected state shape:

```js
this.timeControl = 'none';
this.clock = {
  whiteMs: null,
  blackMs: null,
  activeColor: COLORS.WHITE,
  running: false,
  lastTickAt: null
};
```

- [ ] Add a time-control selector to `#formation-menu` below difficulty.

UI options:
- `Süresiz`
- `5 dk`
- `15 dk`
- `30 dk`

- [ ] Add two compact clock labels to the game HUD.

Expected placement:
- AI clock near top player info
- Player clock near bottom player info

- [ ] In `main.js`, start the clock when the first game state is created.

Clock rules:
- Local AI games: both sides use the same clock.
- Online games: both sides use the same selected time control.
- Scripted tutorial: always `none`.
- Puzzle: always `none`.

- [ ] On every legal move, subtract elapsed time from the mover and switch active clock.

- [ ] If a player reaches zero, set game over.

Expected result types:
- `timeout_win`
- winner is the opponent of the side whose clock expired.

- [ ] Add time fields to game records.

Add to `game` object:

```js
timeControl: '15m',
whiteTimeLeftMs: 123000,
blackTimeLeftMs: 87000,
resultType: 'timeout_win'
```

- [ ] Add tests for clock initialization, switching, timeout result, and record serialization.

Run:

```powershell
npm test
npm run build
```

---

## Task 2: Rematch

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles/analysis.css`
- Modify: `src/utils/i18n.js`
- Test: `tests/rematch-flow.test.js`

- [ ] Add `Tekrar Oyna` button to the game-end result card.

Expected buttons:
- `Tekrar Oyna`
- `Analize Git`
- `Ana Menü`

- [ ] Store last playable match setup in `main.js`.

Expected object:

```js
let lastMatchSetup = null;

lastMatchSetup = {
  formation,
  difficulty,
  timeControl,
  aiPersonaId,
  mode
};
```

- [ ] On rematch, call `startGame()` with the same setup.

Rules:
- AI game: rematch starts immediately.
- Puzzle/tutorial: no rematch button.
- Online: first version should not support rematch unless both users agree; hide button for online.

- [ ] Track analytics event `rematch_started`.

- [ ] Test that rematch keeps formation, difficulty, time control, and AI persona.

---

## Task 3: Quick Start

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles/menu.css`
- Modify: `src/utils/i18n.js`
- Test: `tests/quick-start.test.js`

- [ ] Add `Hızlı Başlat` button to the main menu.

Default setup:

```js
{
  formation: FORMATIONS.MASCULINE,
  difficulty: DIFFICULTY.MEDIUM,
  timeControl: 'none',
  aiPersonaId: 'timur'
}
```

- [ ] If the player has a previous match setup, quick start should reuse it.

Source:
- `localStorage.last_match_setup`

- [ ] If no previous setup exists, use the default setup.

- [ ] Track analytics event `quick_start_used`.

- [ ] Test fallback default and previous setup restore.

---

## Task 4: Match History

**Files:**
- Create: `src/storage/MatchHistoryStore.js`
- Create: `src/ui/MatchHistoryOverlay.js`
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles/menu.css`
- Modify: `src/utils/i18n.js`
- Modify: `OYUN-KAYIT-KOMUTLARI.txt`
- Test: `tests/match-history-store.test.js`

- [ ] Add a local history store backed by `localStorage`.

Store last 50 finished games.

Record shape:

```js
{
  gameId,
  finishedAt,
  mode,
  difficulty,
  timeControl,
  aiPersonaId,
  winner,
  resultType,
  moveCount,
  durationSeconds,
  uploaded: true
}
```

- [ ] Save a history summary when `game_finished` is handled.

- [ ] Add `Maç Geçmişi` button to main menu.

- [ ] Add match history overlay with compact cards.

Each card should show:
- result badge
- difficulty/persona
- time control
- move count
- date

- [ ] Add actions:
- `Hamleleri Gör`
- `Aynı Ayarla Oyna`

- [ ] `Hamleleri Gör` may initially show local summary only if full move record is not available locally.

- [ ] `Aynı Ayarla Oyna` reuses formation, difficulty, time control, and persona.

- [ ] Test max 50 records and newest-first ordering.

---

## Task 5: AI Personas

**Files:**
- Create: `src/ai/AIPersonas.js`
- Modify: `src/ai/AIProfiles.js`
- Modify: `src/ai/AIEngine.js`
- Modify: `src/ai/ai.worker.js`
- Modify: `src/ai/AiEvaluation.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `src/utils/i18n.js`
- Modify: `src/storage/GameRecordBuilder.js`
- Test: `tests/ai-personas.test.js`

- [ ] Add persona definitions.

Recommended first set:

```js
export const AI_PERSONAS = Object.freeze({
  timur: {
    id: 'timur',
    labelKey: 'ai.persona.timur',
    style: 'conqueror',
    modifiers: { pressure: 1.18, conversion: 1.16, repetition: 1.12, material: 1.0 }
  },
  beyazid: {
    id: 'beyazid',
    labelKey: 'ai.persona.beyazid',
    style: 'bold_attacker',
    modifiers: { pressure: 1.2, material: 0.96, royalSafety: 0.95, mobility: 1.1 }
  },
  ulu_bey: {
    id: 'ulu_bey',
    labelKey: 'ai.persona.ulu_bey',
    style: 'calculated',
    modifiers: { royalSafety: 1.15, repetition: 1.08, material: 1.04, pressure: 1.0 }
  },
  saray_veziri: {
    id: 'saray_veziri',
    labelKey: 'ai.persona.saray_veziri',
    style: 'defensive',
    modifiers: { royalSafety: 1.25, material: 1.05, pressure: 0.92, conversion: 0.95 }
  }
});
```

- [ ] Add persona selector to new-game setup.

- [ ] Serialize `aiPersonaId` into worker state.

- [ ] Merge persona modifiers into profile before evaluation.

- [ ] Save persona in game records and local match history.

- [ ] Show persona name in top player label instead of generic `Yapay Zeka`.

- [ ] Test that two personas with same difficulty produce different evaluation priorities.

---

## Task 6: Hard Opening Book

**Files:**
- Create: `src/ai/OpeningBook.js`
- Modify: `src/ai/AIEngine.js`
- Modify: `src/ai/ai.worker.js`
- Modify: `src/analysis/AnalysisSerialization.js`
- Test: `tests/opening-book.test.js`

- [ ] Build an opening book for black for first 6-7 ply.

Initial scope:
- Hard only
- Local AI mode only
- Masculine and feminine formations
- Disable in puzzles/tutorials

- [ ] Use position hashes, not just move numbers.

Opening entry shape:

```js
{
  formation: 'masculine',
  personaId: 'timur',
  ply: 1,
  hash: '...',
  moves: [
    { from: { row: 1, col: 5 }, to: { row: 2, col: 5 }, weight: 100, note: 'central pawn' }
  ]
}
```

- [ ] Add `findOpeningBookMove(state, context)` before worker minimax.

Rules:
- If exact hash exists, choose weighted legal move.
- If book move is no longer legal, skip to minimax.
- If move count exceeds book depth, skip to minimax.

- [ ] Add telemetry metadata to move record where possible.

Suggested special tag:
- `opening_book`

- [ ] Add tests:
- exact opening hit returns move
- illegal book move falls back
- medium/easy do not use hard book unless explicitly enabled

---

## Task 7: Endgame Policy Layer

**Files:**
- Create: `src/ai/EndgamePolicy.js`
- Modify: `src/ai/AiEvaluation.js`
- Modify: `src/ai/ai.worker.js`
- Modify: `src/ai/AiStrategy.js`
- Test: `tests/endgame-policy.test.js`

- [ ] Add an endgame classifier.

Classification examples:

```js
{
  phase: 'sparse_endgame',
  ownMaterialLead: 120,
  opponentRoyalCount: 1,
  opponentNonRoyalCount: 0,
  shouldForceConversion: true
}
```

- [ ] Add deterministic endgame move priority before general candidate selection.

Priority:
- immediate win
- avoid accidental citadel draw when winning
- restrict opponent royal mobility
- approach with supporting royal/non-royal piece
- capture last non-royal defender
- avoid repeated position

- [ ] Strengthen hard only.

Easy and medium can receive safer defaults, but hard should get the full policy.

- [ ] Add tests using small constructed endgames.

Test goals:
- hard avoids a repeating move when winning
- hard prefers royal net tightening over irrelevant material shuffle
- hard avoids citadel draw when materially winning
- hard takes immediate terminal result when available

---

## Task 8: Game Record and Reports Update

**Files:**
- Modify: `src/storage/GameRecordBuilder.js`
- Modify: `functions/scripts/analyze-game-records.mjs`
- Modify: `functions/scripts/report-ai-struggles.mjs`
- Modify: `functions/scripts/print-games-commands.mjs`
- Modify: `OYUN-KAYIT-KOMUTLARI.txt`
- Test: existing export/report commands

- [ ] Add fields to game record:
- `timeControl`
- `aiPersonaId`
- `openingBookUsedCount`
- `timeoutResult`

- [ ] Update reports to group by persona and time control.

- [ ] Add report command:

```json
"report:persona-performance": "node functions/scripts/report-persona-performance.mjs"
```

- [ ] Update text command file so the user can find every report command quickly.

Run:

```powershell
npm run export:games:csv
npm run report:games-analysis
npm run report:all
```

---

## Task 9: Final QA

**Files:**
- No new files expected.

- [ ] Run unit tests.

```powershell
npm test
```

- [ ] Build web bundle.

```powershell
npm run build
```

- [ ] Copy Android assets.

```powershell
npx cap copy android
```

- [ ] Install debug build on emulator.

```powershell
cd android
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat installDebug
```

- [ ] Manual emulator test:
- quick start starts a match immediately
- setup flow can select `5 dk`, `15 dk`, `30 dk`
- clocks count down and switch after moves
- timeout ends game with result card
- rematch starts with same setup
- match history shows the finished game
- hard AI uses opening book for early moves
- hard AI behaves more decisively in sparse endgames

---

## Risks and Decisions

- A true exhaustive endgame tablebase is too large for this app right now. The first deliverable should be a deterministic endgame policy layer.
- Time controls in online play need both clients to agree. First implementation should include the selected time control in the room init payload.
- Rematch for online games should be postponed until there is a handshake flow. Local AI rematch is safe now.
- AI personas should start as profile modifiers, not separate engines.
- Opening book should be small and explainable at first, then expanded using collected game records.

## Recommended Milestones

### Milestone 1: Player Flow

Deliver:
- Time controls
- Quick start
- Rematch
- Local match history

Why first:
- These are visible, useful, and low-risk compared with AI engine changes.

### Milestone 2: AI Identity

Deliver:
- AI personas
- Persona selector
- Persona saved in records

Why second:
- It improves feel without requiring deep engine surgery.

### Milestone 3: AI Strength

Deliver:
- Hard opening book
- Endgame policy layer
- New reports grouped by persona/time control

Why third:
- It changes behavior and needs more testing with stored games.

## Self-Review

- Spec coverage: The plan covers time controls, rematch, hard AI, opening book, endgame behavior, quick start, match history, and AI characters.
- No-placeholder scan: The plan gives concrete files, data shapes, UI locations, and test commands.
- Type consistency: `timeControl`, `aiPersonaId`, and `difficulty` are carried through setup, state, records, and reports.

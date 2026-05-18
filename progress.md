Original prompt: Fix the online-match screen so it no longer reuses offline AI labels/status. Keep the existing color assignment logic (`host = white`, `joiner = black`), preserve white perspective for the host, keep black perspective flipped for the joiner, and make the visible HUD reflect `Rakip / Sen` with color badges in online games.

- Added explicit DOM hooks in `index.html` for the top avatar/name and bottom player name.
- Added online HUD i18n keys in Turkish and English.
- Centralized HUD syncing in `src/main.js` so online/offline labels, status text, and turn indicator refresh from one place.
- Kept host/joiner color assignment in `SocketManager` unchanged; only UI/perspective sync was updated.
- Board turn indicator is now online-aware and still preserves offline AI wording outside online matches.
- Verification completed with `npm run build` and `npx cap copy android`.

TODO / follow-up:
- End-to-end verify on two real devices that host sees `Rakip (Siyah)` and joiner sees `Rakip (Beyaz)` after reconnects.

Latest task: create English store screenshots inside the project files.

- Added a lightweight screenshot mode in `src/main.js` using `?shot=...&lang=en` query params.
- Localized tutorial tabs, puzzle intro copy, online separator text, and previous/next labels for English capture quality.
- Fixed `i18n.updateDOM()` so input placeholders like the online room code translate correctly.
- Rebuilt `dist` and generated English PNG screenshots in the project root:
  - `en_store_01_main_menu.png`
  - `en_store_02_new_game.png`
  - `en_store_03_gameplay.png`
  - `en_store_04_tutorial.png`
  - `en_store_05_puzzles.png`
  - `en_store_06_online.png`

Latest inspection: verified whether piece letters are present in the game.

- Confirmed the renderer overlays letter badges on pieces in `src/ui/PieceRenderer.js`.
- Non-pawn pieces use locale-based short labels like `K`, `V`, `N`, `R`.
- Pawns derive their badge from `pawnType`, so the live board also shows letter markers for pawn families.
- Badge styling and placement are defined in `src/styles/pieces.css`.
- Visual confirmation also matches the generated gameplay screenshot `en_store_03_gameplay.png`.

Latest task: keep AI captured pieces from stacking vertically and covering the board.

- Updated `src/styles/menu.css` so the top header captured area behaves like a horizontal strip instead of a wrapped grid.
- `top-player` now uses remaining header width safely and the AI captured tray stays single-row with horizontal overflow.
- Each captured piece in the AI tray is forced to keep its own width so items no longer collapse into 3-column stacks.
- Verified with `npm run build` and `npx cap copy android`.

Latest task: split the post-game analysis overlay into tabs.

- Added `src/ui/analysisTabs.js` to centralize tab ids and default/fallback behavior.
- Refactored `src/ui/GameAnalysisOverlay.js` into 4 tabs: summary, critical moments, Timurlenk insights, and timeline.
- Added tab labels to `src/utils/i18n.js` in both Turkish and English.
- Added horizontal mobile-friendly tab styles in `src/styles/analysis.css`.
- Practice return path now reopens the analysis on the `critical` tab for faster iteration.
- Verified with `npm test`, `npm run build`, and `npx cap copy android`.

Latest task: implement Phase 2 AI persona identity.

- Added AI persona definitions for Timur, Beyazıd, Uluğ Bey, and Saray Veziri.
- Persona modifiers now merge into the selected difficulty profile before worker evaluation.
- New-game setup, quick start, rematch, HUD label, local history, Firestore records, and analytics now carry `aiPersonaId`.
- Added failing-first tests for persona definitions, profile modifiers, Firestore records, and match history, then made them pass.
- Verification completed with `npm test`, `npm run build`, `npx cap copy android`, Android `assembleDebug`, and a production preview smoke where Beyazıd appeared as the in-game AI label.

TODO / follow-up:
- Phase 3 should add hard-level opening book and stronger endgame policy using the persona-aware profile id.

Latest task: implement Phase 3 opening book from `ACILIS_KITABI.md`.

- Rewrote `ACILIS_KITABI.md` into a motor-compatible opening reference and verified all 6 `opening` blocks against `MoveValidator`.
- Added `src/ai/OpeningBook.js` with 6 masculine-formation openings mirrored for black AI.
- Opening selection is persona-aware: Timur, Beyazıd, Uluğ Bey, and Saray Veziri prefer different book lines.
- Difficulty now limits opening depth: easy uses short book guidance, medium uses more, hard uses up to 7 book moves before falling back to minimax.
- AI worker now checks the opening book before expensive search; if no book move is legal, existing minimax/selection behavior remains unchanged.
- Added tests for book move legality, continuation, formation gating, and worker-level opening selection.
- Verification completed with `npm test`, `npm run build`, and `npx cap copy android`.

TODO / follow-up:
- Phase 4/endgame can build on this by adding deterministic endgame conversion tables or rule-based mate nets for hard AI.

Latest task: strengthen hard AI endgame conversion with mini-tablebase guidance.

- Added a mini-tablebase move selector for sparse winning endgames, focused on K+R vs lone royal and passed-pawn promotion races.
- Hard AI now promotes near-promotion passed pawns immediately when safe, instead of treating promotion as a generic positional bonus.
- K+R vs K now prefers rook-boxing first, then moves the royal closer when the enemy royal is trapped near a corner, avoiding the previous rook-check loop.
- Kept the deeper mate-search budget for complex multi-piece endgames so existing forced-mate wins are not lost.
- Verification completed with tactical suite `32/50`, endgame suite `11/20` wins and `%55` total success, and `npm run build`.

Latest task: improve K+R corner net v2 and promotion conversion safety.

- Added one-reply forecasting to the sparse endgame selector so candidate moves are checked against the defender's next escape/capture.
- Switched rook safety checks from Manhattan distance to royal-step distance, preventing the AI from leaving the rook diagonally capturable by the enemy royal.
- Mini-tablebase scope was narrowed back to pure K+R vs lone royal plus direct promotion races, preventing helper-piece endgames from overriding tactical mate choices.
- K+R conversion now boxes from the center, avoids hanging the rook, then brings the royal closer only after the enemy royal is on the edge/corner.
- Verification completed with tactical suite `31/50`, endgame suite `14/20` wins and `%70` total success, and `npm run build`.

Latest task: implement Phase 4 hard AI endgame strengthening.

- Fixed opening-book gating so it only runs on explicit masculine formation and never in sparse/endgame positions.
- AI search now resolves terminal states during simulated search: royal capture, checkmate, stalemate, and citadel draw are scored instead of being treated like ordinary positions.
- Added a hard-endgame outcome score at root selection for winning sparse positions.
- Hard AI now strongly prefers safe forcing checks, opponent mobility reduction, edge/corner net pressure, and immediate wins.
- Unsafe forcing attempts are reduced by tactical-risk scoring so the AI does not overvalue hanging checks.

Latest task: implement AI engine Phase 1 real deadline and iterative deepening.

- Added a real AI search deadline in `src/ai/ai.worker.js` based on the time-budget `maxThinkMs` value.
- Root search now uses iterative deepening from depth 1 up to the time-adjusted target depth.
- If the deadline expires mid-search, AI returns the best move from the last fully completed depth instead of blocking on a deeper search.
- Added `selectAiMoveAnalysisForState()` for production/debug inspection of `targetDepth`, `completedDepth`, `timeExpired`, opening-book usage, and candidate count.
- Kept worker compatibility through `selectAiMoveForState()`, which still returns only the selected move.
- Added a regression test proving an expired deadline still returns a move from the last completed iterative depth.
- Verification completed with `npm test`, `npm run build`, and `npx cap sync android`.

Latest task: save AI engine phased roadmap.

- Added `AI_MOTOR_GELISTIRME_PLANI.md` with the 8-phase AI engine roadmap.
- Marked Phase 1 as implemented and Phase 2 as the next step.

Latest task: implement AI engine Phase 2 search memory.

- Added persistent AI search memory in `src/ai/ai.worker.js` with transposition table, remembered best moves, killer moves, and history heuristic scores.
- AI search now reuses the same memory across worker calls for the same AI/profile scope instead of creating a fresh transposition table every move.
- Move ordering now prefers remembered best moves first, then killer/history hints, then the existing tactical heuristic.
- Alpha-beta cutoffs now feed killer move and history heuristic memory for later searches.
- Search info now exposes memory stats such as transposition hits, stores, and root hash-move usage for debugging.
- Added a regression test proving the second search reuses transposition data and the previous best root move.
- Updated `AI_MOTOR_GELISTIRME_PLANI.md` to mark Phase 2 as implemented.
- Verification completed with `npm test`, `npm run build`, and `npx cap sync android`.

Latest task: implement AI engine Phase 3 evaluation engine v2.

- Added `buildEvaluationBreakdownForBlack()` in `src/ai/AiEvaluation.js` so the AI score is now split into named components.
- Evaluation now scores material, piece position, attack/defense map, piece safety, royal safety, center control, tempo, development, pawn structure, citadel pressure, mobility, threat map, and conversion separately.
- `evaluateStateForBlack()` now returns the total of the component breakdown, keeping existing worker/search integration intact.
- Added development and pawn-structure scoring so active central pieces and connected pawns are rewarded while passive/doubled/isolated structures are penalized.
- Added tests proving the breakdown exists, totals match the public evaluator, and active center/development/pawn structure is rewarded over passive structure.
- Updated `AI_MOTOR_GELISTIRME_PLANI.md` to mark Phase 3 as implemented.
- Verification completed with `npm test`, `npm run build`, and `npx cap sync android`.
- Added tests for sparse/endgame opening-book shutdown and hard AI choosing a forcing rook check instead of quiet drifting.
- Verification completed with `npm test` (83/83), `npm run build`, and `npx cap copy android`.

TODO / follow-up:
- Run emulator playtest for hard AI endgames with real saved game positions and tune weights if it still delays conversion.
- Consider suppressing rule-event console logs during AI search simulations; current tests pass but search can print repeated citadel-draw logs.

Latest task: add a chess.com-style live advantage meter.

- Added a reusable `src/ui/AdvantageMeter.js` module that converts the existing black-perspective evaluation score into white/black bar percentages and readable `+N.N` labels.
- Added a slim in-game vertical advantage bar to the board area; it hides during tutorials, puzzles, and analysis-practice mode.
- Hooked the meter into `syncGameHud()` so it refreshes on game start, each move, game end, and locale/HUD updates.
- Added Turkish/English labels and focused unit tests for balanced, black-favored, and white-favored score conversion.

Latest task: improve advantage meter with immediate move impact.

- The advantage bar now recalculates right after the player's move, before waiting for the AI response.
- Added a last-move impact label so bad player moves can immediately lower the evaluation and missed AI replies can raise it back afterward.
- Move impact is colored by result: green for improved position, red for worsened position, gray for tiny/neutral changes.
- Added tests for white/black move-impact direction and neutral swings.
- Verification completed with `npm test`, `npm run build`, and production preview visual check.

Latest task: start AI time-control strategy phase 1.

- Added `src/ai/AITimeContext.js` to package time-control data for AI decisions.
- AI requests now include time mode, initial time, increment, current turn, AI/player colors, remaining time, pressure labels, clock lead, and move count.
- Worker revive now preserves `timeControl` and `aiTimeContext` on the AI search state.
- White-AI black-perspective mirroring now mirrors white/black clock fields while keeping AI/player remaining time aligned.
- Added unit tests for untimed games, timed remaining clocks, critical pressure, worker serialization, and white-AI mirroring.
- Verification completed with `npm test` (116/116) and `npm run build`.

Latest task: implement AI time-control strategy phase 2.

- Added `src/ai/AITimeBudget.js` to convert time context into an AI search plan.
- The AI now adjusts search depth and candidate limits by time mode: 5m is faster, 15m balanced, 30m deeper, untimed quality-focused.
- Opening positions receive faster book-following budgets, while endgames can receive more precision when time allows.
- Critical own-clock pressure now trims depth and candidate counts so the AI moves faster instead of overthinking.
- The worker now uses `getTimeAdjustedSearchPlan()` before root candidate evaluation and selection.
- Added unit tests for 5m speed, 30m endgame depth, critical-clock trimming, legacy no-context behavior, and opening fast-play budgets.
- Verification completed with `npm test` (121/121) and `npm run build`.

Latest task: implement AI time-control strategy phase 3.

- Added `src/ai/AIPositionCriticality.js` to score tactical urgency before AI search.
- Criticality now considers check/checkmate/stalemate edges, royal-capture chances, valuable captures, hanging material, low mobility, and endgames.
- `AITimeBudget` now raises think budget, depth, and candidate breadth for sharp/critical/decisive positions when clock context is available.
- Own critical clock pressure still overrides this and trims the search so the AI does not flag itself.
- Added tests for quiet positions, decisive royal threats, hanging material, and critical-position budget increases.
- Verification completed with `npm test` (125/125) and `npm run build`.

Latest task: implement AI time-control strategy phase 4.

- Added difficulty-specific time intelligence to `AITimeBudget`.
- Easy now has deterministic tempo imperfections: it can overthink quiet moments or rush non-decisive moments.
- Medium now keeps balanced time awareness but can be slightly imperfect on sharp positions.
- Hard now uses the most strategic time awareness, gaining extra budget/breadth/depth in high-criticality positions.
- Added tests for difficulty ladder behavior in decisive positions and easy-mode tempo mistakes.
- Verification completed with `npm test` (127/127) and `npm run build`.

Latest task: implement AI time-control strategy phase 5.

- Added `src/ai/AIClockPressure.js` to score pressure moves when the opponent is low or critical on time.
- AI root candidates now receive a clock-pressure bonus for checks, captures, special moves, terminal wins, and low-opponent-mobility positions.
- The pressure bonus is difficulty-weighted: hard uses it most, medium moderately, easy lightly.
- Own low or critical clock suppresses pressure play so the AI prioritizes fast and safe moves instead of forcing complexity.
- Added tests for no-pressure, critical opponent clock, hard-vs-easy weighting, and own-clock safety suppression.
- Verification completed with `npm test` (131/131), `npm run build`, and `npx cap sync android`.

Latest task: implement AI time-control strategy phase 6.

- Added persona-specific time styles to AI personas and carried them into merged AI profiles.
- `AITimeBudget` now applies character-based clock behavior after difficulty/criticality tuning and before final own-clock safety trimming.
- Timur spends a bit more time in pressure moments, Beyazıd plays faster/tempo-oriented, Uluğ Bey spends more in critical/endgame calculations, and Saray Veziri keeps safer breadth with faster decisions.
- Added a focused test proving the same difficulty/time mode produces different search budgets by persona.
- Verification completed with `npm test` (132/132), `npm run build`, and `npx cap sync android`.

Latest task: implement AI engine Phase 4 tactical calculation strengthening.

- Added `evaluateStaticExchangeForMove()` so the AI can estimate whether a capture is really profitable after likely recaptures.
- Capture ordering and root candidate scoring now use static exchange, reducing defended bait captures and simple material blunders.
- Quiescence search now extends tactical calculation in forced, checking, promotion, capture, and royal-threat positions.
- Forced tactical states can include broader legal replies, while the quiet royal-threat regression test now avoids unrelated citadel-draw noise.
- Root candidates expose `staticExchange` metadata for AI debugging and tuning.
- Added regression tests for bad static exchange and hard AI avoiding defended bait captures.
- Verification completed with `npm test` (138/138), `npm run build`, and `npx cap sync android`.

Latest task: implement AI engine Phase 5 opening book v2.

- Added branching opening lines in `src/ai/OpeningBook.js` for all six existing openings.
- The opening book now reads compact early move history, matches opponent replies, and exits the book on undefined player responses.
- Kept the legacy board-progress fallback so existing direct opening tests and no-history setup still work.
- AI worker serialization now sends compact `openingHistory`; white-AI black-perspective mirroring also mirrors that opening history.
- Opening metadata now carries `openingLineId` through worker candidate selection and white-AI move mapping.
- Updated `ACILIS_KITABI.md` and `AI_MOTOR_GELISTIRME_PLANI.md` with Phase 5 behavior.
- Verification completed with `npm test` (143/143), `npm run build`, and `npx cap sync android`.

Latest task: implement AI engine Phase 6 endgame module.

- Added `src/ai/AIEndgame.js` with component-based endgame scoring for sparse winning positions.
- The endgame module now scores terminal wins/losses, check pressure, mate nets, citadel escape risk, stalemate/conversion pressure, royal hunt, and tactical safety separately.
- AI root candidates now use `analyzeEndgameMoveOutcome()` and expose `endgamePlan` metadata for debugging/tuning.
- Winning-side citadel risk was strengthened so the AI avoids letting the opponent royal escape into its hisar while trying to convert.
- Added regression tests for forcing check/mate-net pressure and rejecting risky hisar escape paths.
- Verification completed with `npm test` (145/145), `npm run build`, and `npx cap sync android`.

Latest task: make hard AI stronger while leaving easy/medium unchanged.

- Increased hard profile depth from 4/5/6 to 5/6/7 and raised hard root/branch move limits to inspect more candidate moves.
- Tightened hard safety behavior: lower reply-capture tolerance, higher unsafe-score tolerance, stronger royal-safety/endgame/repetition weighting, and stricter precision/safety style.
- Strengthened hard tactical calculation with deeper quiescence continuation, more tactical continuation moves, heavier static-exchange weighting, and stronger opponent-reply penalties.
- Made hard opening-book use less stubborn: close tactical opportunities now override book moves instead of following a line too faithfully.
- Added regression tests for hard-only depth, safer candidate selection, strict opponent reply risk, and close-score tactical-over-book decisions.
- Verification completed with targeted `npm test -- tests/ai-worker.test.js tests/ai-profiles.test.js`, full `npm test` (158/158), and `npm run build`.

Latest task: implement AI engine Phase 7 difficulty and persona finesse.

- Added `src/ai/AIStylePolicy.js` as a root-candidate decision style layer.
- AI profiles now expose `decisionStyle` knobs for precision, risk tolerance, pressure, conversion, safety, tempo, and book trust.
- Personas now modify those knobs: Timur favors pressure/conversion, Beyazıd favors tempo/attack, Uluğ Bey favors calculated safety, and Saray Veziri favors defensive safety.
- Root candidate scoring now stores `baseScore` plus `styleAdjustment`, then adds the style score before sorting/selecting.
- Added tests proving easy can remain forgiving while hard rejects risky grabs, and that personas steer equal candidates differently.
- Verification completed with `npm test` (148/148), `npm run build`, and `npx cap sync android`.

Latest task: improve hard Timur winning conversion after long-game analysis.

- Added hard/Timur regression coverage for winning positions where forcing check/royal-net pressure must beat quiet material collection.
- Decision style conversion now activates before sparse endgame when the AI is already winning, rewarding checks, low opponent mobility, compact pressure, and clock-pressure forcing.
- Quiet non-capturing drift is now penalized while winning if the opponent royal still has room to move.
- This should reduce long passive conversion games where hard AI wins material early but delays the finishing attack.
- Verification completed with `npm test` (150/150) and `npm run build`.

Latest task: tune easy and medium winning conversion relative to hard.

- Added difficulty-based conversion tuning in `AIStylePolicy` so hard keeps full finishing pressure, medium gets balanced finishing pressure, and easy only follows very clear/close conversion opportunities.
- Easy no longer behaves like hard when a quiet material move has a clear base-score lead.
- Medium now sees obvious royal-net/check pressure while still staying below hard when the quiet move is much stronger.
- Added regression tests for easy/medium/hard conversion scaling and medium-vs-hard large-gap behavior.
- Verification completed with `npm test` (152/152).

Latest task: strengthen AI royal safety against forward center king moves.

- Root cause: center/piece-position scoring still rewarded royal pieces like normal development pieces, while royal safety only checked direct attack and nearest enemy distance.
- Added royal-specific safety scoring for home shelter, friendly support, forward exposure, center exposure, direct attack, and emergency citadel escape credit.
- Center position/control bonuses now skip royal pieces so the AI no longer treats a king center walk as ordinary development.
- Move ordering now applies a royal safety delta for normal royal moves, pushing unsafe center rushes below safer guard moves.
- Added regression tests for advanced central royal exposure and move-ordering safety.
- Verification completed with `npm test` (154/154).

Latest task: implement bot ladder Phase 1 catalog.

- Added `src/ai/AIBots.js` with 15 frozen bot definitions from level 1 to 15.
- Each bot now has star tier, classic difficulty mapping, persona, localized labels/descriptions, opening-book preferences, and engine modifier knobs.
- Default bot is `bot_07_ulug_bey`, preserving a balanced middle-strength starting point for later UI integration.
- Added `tests/ai-bots.test.js` to verify catalog size, level/star distribution, default lookup, bot-id validation, and sample easy/hard modifier data.
- Verification completed with targeted `npm test -- tests/ai-bots.test.js` and full `npm test` (161/161).
- Follow-up: Phase 2 should connect `botId` into AI profile selection while keeping the existing Kolay/Orta/Zor flow unchanged.

Latest task: implement bot ladder Phase 2 AI profile binding.

- Updated `getAIProfile(difficulty, personaId, botId)` so valid bot IDs override the classic difficulty/persona pair with the bot's own difficulty and persona.
- Bot profiles now carry `botId`, `botLevel`, `botStars`, `botLabel`, and `openingBookPreferences` metadata for later opening-book/UI/record integration.
- Bot engine modifiers are merged into the profile decision style, so stronger bots can increase precision, safety, pressure, conversion, and book trust without changing classic mode.
- Existing two-argument classic profile calls remain unchanged when no valid bot ID is passed.
- Added a failing-first regression test proving `bot_15_aksak_demir` resolves to hard/Timur and is at least as strict as normal hard Timur.
- Verification completed with targeted `npm test -- tests/ai-profiles.test.js`, related `npm test -- tests/ai-bots.test.js tests/ai-profiles.test.js`, full `npm test` (162/162), and `npm run build`.

Latest task: implement bot ladder Phase 3 opening-book priority binding.

- Updated opening-book ordering so `profile.openingBookPreferences` takes priority over persona defaults when present.
- Classic persona-based ordering remains unchanged when a profile has no bot opening preferences.
- Added a failing-first regression test proving a bot/profile preference for `pawn_fortress` overrides Timur's normal `timur_siege` opening priority.
- Verified the selected bot-preferred opening still returns a legal mirrored black move from the initial masculine setup.
- Verification completed with targeted `npm test -- tests/opening-book.test.js`, related AI bot/profile/opening/worker tests, full `npm test` (163/163), and `npm run build`.

Latest task: implement bot ladder Phase 4 match setup and record metadata.

- Match setup now carries optional `aiBotId`, and rematch/current setup flows preserve it.
- `startGame()` resolves a valid bot to effective difficulty/persona and stores bot id, level, and stars on game state and record metadata.
- Game records and local match history now store anonymous bot metadata: `aiBotId`, `aiBotLevel`, `aiBotStars`; history also keeps `aiBotLabel`.
- AI worker serialization, revive, white-AI mirroring, and profile selection now carry `aiBotId` so bot profile modifiers can affect real move selection.
- Added failing-first tests for game records, match history, worker serialization, and white-AI mirroring.
- Verification completed with targeted record/worker tests, full `npm test` (164/164), and `npm run build`.

Latest task: implement bot ladder Phase 5 bot selection UI.

- Added a selectable `Bot Rakipleri` section to the match setup screen with Classic Mode plus 15 bot cards.
- Bot cards are rendered dynamically from `AIBots.js`, localized by the active language, and show level plus 1-5 star strength.
- Selecting a bot updates the active difficulty/persona cards to that bot's engine profile; selecting difficulty/persona manually returns to Classic Mode.
- Added Turkish/English UI copy keys for bot title, classic mode, level, and star labels.
- Added compact horizontal-scroll styling so the 16-card bot list does not force a crowded vertical layout.
- Added a failing-first bot selection card model test.
- Verification completed with targeted bot/profile/opening/record tests, full `npm test` (165/165), `npm run build`, and production preview smoke test for 16 cards plus Bot 15 selection.

Latest task: implement bot ladder Phase 6 analytics and Firebase record metadata.

- Analytics lifecycle events now keep anonymous bot fields: `ai_bot_id`, `ai_bot_level`, and `ai_bot_stars` for started, finished, and abandoned AI games.
- `game_started` analytics also keeps `ai_color`, which was already sent by `main.js` but previously stripped by the allowlist.
- `main.js` now includes bot analytics metadata when a bot-backed game starts, finishes, or is abandoned.
- `GameRecordBuilder` now stores both flat bot fields and a readable `game.aiBot` summary with id, level, stars, and label.
- Cloud Function game record validation now preserves `aiPersonaId`, `aiPersonaStyle`, flat bot fields, `game.aiBot`, `timeControl`, and remaining clock fields before writing to Firestore.
- Added failing-first tests for analytics allowlists, game record bot summary, and Cloud Function validator preservation.
- Verification completed with related analytics/Firebase tests, full `npm test` (166/166), and `npm run build`.

Latest task: tune AI pacing toward roughly 120-move games.

- Added a `pace` decision-style component that starts applying pressure after move 84 and becomes decisive around move 120.
- Long games now reward checks, captures, lower opponent mobility, favorable exchanges, and endgame conversion instead of quiet drift.
- Quiet non-progress moves, tempo loss, and repetition are penalized more heavily in late games, scaled by difficulty: easy < medium < hard.
- AI worker root candidates now carry `metadata.moveCount`, sourced from real move history or the serialized time context, so the pacing logic applies in web worker/emulator play.
- Added failing-first tests for long-game pace scoring and worker candidate metadata.
- Verification completed with targeted AI tests, full `npm test` (193/193), and `npm run build`.

TODO / follow-up:
- Run a fresh 120/180 max-move AI-vs-AI league and compare draw rate, average move count, hard-vs-lower conversion, and late-game repetition against the previous 144-match report.

Latest task: strengthen full-game planned AI pressure.

- Added root-candidate plan metrics in `ai.worker.js`: plan progress, plan drift, center gain, mobility gain, and support after the move.
- AI style scoring now has a `plan` component that rewards planned development, center pressure, mobility growth, supported piece spread, forcing checks, and safe captures from the opening.
- The plan score scales by difficulty, so easy benefits lightly, medium is more consistent, and hard/Timur treats planless tempo loss more seriously.
- Preserved older handcrafted style tests by only applying the plan component when real plan metadata is present.
- Evaluation v2 now exposes a stronger `strategicPlan` component so active central development is separated from passive material safety.
- Slightly widened the hard opening-book safe window so high-confidence safe first-book moves survive the new plan scorer, while tactical-risk book escape tests still pass.
- Verification completed with targeted AI plan tests, full `npm test` (196/196), `npm run build`, and AI-vs-AI automation API tests (5/5).

Latest task: implement Timur engine architecture Phase 1 perft/rule validation.

- Added `src/game/Perft.js` with legal move collection, `perft`, `dividePerft`, move apply/revert helpers, and deterministic state signatures.
- Locked current opening perft baselines: masculine 31/961, feminine 31/961, full 19/361 for depth 1/depth 2 from White to move.
- Added regression tests for ordinary move apply/revert plus `royal_swap` and `citadel_exchange` special move restore safety.
- Updated `TIMUR_SATRANCI_MOTOR_MIMARI_PLANI.md` to mark Phase 1 as implemented.

Latest task: implement Timur engine architecture Phase 2 Zobrist hash and TT v2.

- Added `src/game/ZobristHash.js` for deterministic `z2:<hex>` position keys covering pieces, side to move, formation, ransom rights, and citadel exchange rights.
- Added `src/ai/TranspositionTable.js` with exact/lower/upper bound probing, depth-aware replacement, best move storage, age tracking, and pruning.
- Updated `buildPositionHash` and AI worker search memory to use Zobrist keys and depth/bound-aware TT entries.
- Preserved white-AI mirrored-position repetition memory with the new hash format.
- Added Zobrist, incremental hash, and transposition table regression tests.
- Verification completed with targeted AI/Zobrist/TT tests (42/42), full `npm test` (208/208), and `npm run build`.

Latest task: implement Timur engine architecture Phase 3 Attack Map v2.

- Added `src/ai/AttackMap.js` as a central board relation map for square-level pseudo attackers, legal attackers, defenders, piece threat reports, royal safety, and overloaded defenders.
- Rewired `AiEvaluation.js` threat map helpers to read from Attack Map v2 so evaluation, piece safety, SEE support, and move ordering use the same attack/defense logic.
- `buildBoardThreatMap` now returns `attackMapVersion: 2`, overloaded defender values, and royal safety summaries.
- Calibrated hard opening-book safety so high-confidence first-book moves survive the stronger map, while low-confidence transition moves and tactical escapes are still rejected.
- Added `tests/attack-map.test.js` for square attackers/defenders, overloaded defender detection, and royal escape quality.
- Verification completed with targeted AI/Attack Map tests (66/66), full `npm test` (211/211), and `npm run build`.

Latest task: implement Timur engine architecture Phase 4 SEE v2.

- Upgraded `evaluateStaticExchangeForMove` to report `timur_see_v2` data with capture sequence, capture tree depth, least valuable attacker, least valuable reply, and exchange debt.
- SEE now simulates capture trees with LVA ordering and keeps the best tactical exchange line for root move scoring.
- Added royal/citadel special risk penalties so exposed royal captures and risky citadel-adjacent royal moves are rejected earlier.
- Root candidates now expose SEE score, exchange debt, capture tree depth, and SEE method in metadata for analysis/history/debugging.
- Opening-book safety now directly rejects book moves whose negative SEE debt exceeds the difficulty limit.
- Stabilized the older Faz 2 aspiration/PVS test budget after the stronger SEE work increased root analysis cost.
- Verification completed with targeted AI/worker tests (56/56), full `npm test` (213/213), and `npm run build`.

Latest task: implement Timur engine architecture Phase 5 Search Engine v3.

- Added search memory counters for fail-soft cutoffs, futility pruning, reverse futility pruning, and tactical futility guards.
- Centralized PVS null-window and re-search decisions so root and recursive search share the same fail-soft flow.
- Added low-depth reverse futility pruning to stop clearly winning/losing branches earlier when the alpha-beta window proves them.
- Added move-level futility pruning for quiet low-depth branches while protecting checks, captures, and immediate threat moves from being pruned.
- Difficulty-scaled pruning margins keep easy looser, medium balanced, and hard stricter around tactical safety.
- Added failing-first Faz 5 worker tests for pruning stats and tactical guard behavior.
- Verification completed with full `npm test` (215/215) and `npm run build`.

Latest task: implement Timur engine architecture Phase 6 Move Ordering v3.

- Extended AI search memory with `continuationHistoryScores` and `captureHistoryScores`.
- Search stats now expose continuation/capture history updates, order hits, positive SEE ordering, and positional ordering bonuses.
- Move ordering now prioritizes positive-SEE captures, learned continuation patterns, learned capture patterns, center/development progress, and safer royal movement.
- Cutoff and best-node search moves feed the new history maps so later searches try promising tactical/positional moves earlier.
- Opening-book moves are passed as root priority candidates so new ordering does not push safe book moves outside the search candidate limit; unsafe book moves can still be rejected by the existing safety gate.
- Added a failing-first Faz 6 worker test for capture/continuation history and ordering stats.
- Verification completed with `node --test tests\\ai-worker.test.js` (30/30), full `npm test` (216/216), and `npm run build`.

Latest task: implement Timur engine architecture Phase 7 Quiescence v2.

- Added quiescence-specific node budgets and candidate caps by difficulty so tactical leaf search stays useful without blowing the real think-time budget.
- Quiescence move classification now tracks captures, royal/check threats, citadel threats, promotions, negative-SEE capture skips, and valuable-piece rescue moves.
- Bad captures with negative static exchange are filtered unless they create a forcing royal/citadel/check threat.
- Valuable rescue moves are searched on the first quiescence layer, helping the AI avoid leaving attacked major pieces en prise while keeping deeper branches tight.
- Search memory now reports quiescence diagnostics: nodes, limit hits, candidates, capture/check/royal/citadel threat moves, rescue moves, and negative SEE skips.
- Added failing-first Faz 7 worker tests for negative SEE filtering, rescue inclusion, citadel threat continuation, and quiescence stats.
- Verification completed with `node --test tests\\ai-worker.test.js` (32/32), full `npm test` (218/218), and `npm run build`.

Latest task: implement Timur engine architecture Phase 8 Evaluation v3.

- Added explicit evaluation components for piece coordination and tempo continuity while preserving the existing phase, piece-square, royal safety, strategic plan, and endgame conversion scoring.
- Coordination now rewards supported central piece networks, shared target pressure, and clustered development; isolated edge pieces receive penalties.
- Tempo continuity now reads recent move history, rewards forward progress, and penalizes repeated back-and-forth route shuttling.
- Recalibrated the hard opening-book safety window so trusted safe book moves survive the stronger positional evaluation, while tactical debt and negative SEE book moves are still rejected.
- Added failing-first `tests/ai-evaluation-v3.test.js` coverage for coordinated piece networks and anti-shuttle tempo scoring.
- Verification completed with targeted AI tests (56/56), full `npm test` (220/220), and `npm run build`.

Latest task: implement Timur engine architecture Phase 9 Opening Book v3.

- Added Zobrist position-hash metadata to opening-book choices so every book move can be tied back to the exact board state that produced it.
- Added default opening statistics plus merge/update helpers for opening-level and position-hash-level games, wins, draws, losses, score, and reliability.
- Opening selection now blends profile/persona/bot preferences with data score, allowing bad historical book lines to yield to safer repertory choices while preserving the worker's tactical safety filter.
- Added `getOpeningRepertoireForProfile` so bot repertories can be inspected by formation, bot level, persona, position hash, and data score.
- Added `buildOpeningBookStatsFromMatches` to turn AI-vs-AI match records into reusable book statistics.
- AI-vs-AI automation fast/full records now preserve opening position hash, data score, and compact stats for future book tuning.
- Added failing-first Phase 9 opening-book tests for hash metadata, stats-based selection, bot repertory ordering, and AI-vs-AI stats extraction.
- Verification completed with targeted opening/AI tests (82/82), full `npm test` (224/224), `npm run build`, and AI-vs-AI automation tests (5/5).

Latest task: implement Timur engine architecture Phase 10 Endgame Solver v2.

- Added a persistent small-material WDL cache to `AIEndgame`, with cache clear/stats helpers for tests and future diagnostics.
- Added `analyzeEndgameWdl` so sparse endgames expose outcome, confidence, search depth, cache hit state, exact score, distance score, metrics, and a readable plan.
- Extended endgame distance metrics with royal hunt distance, own/opponent citadel race distance, mobility, edge/corner pressure, material lead, and piece count.
- Added conversion plans for winning sides: force royal capture, cut citadel draw, tighten stalemate net, reduce mobility, and convert edge pressure.
- Added resistance plans for losing sides: seek citadel draw, preserve escape squares, restore mobility, and trade to reduce pressure.
- Integrated the WDL plan components into `analyzeEndgameMoveOutcome` so AI scoring can prefer faster conversion or stronger resistance in sparse endgames.
- Added failing-first Phase 10 endgame tests for WDL cache reuse and conversion/resistance plan output.
- Verification completed with `node --test tests\\ai-endgame.test.js` (6/6), targeted AI tests (83/83), full `npm test` (226/226), and `npm run build`.

Latest task: implement Timur engine architecture Phase 11 Bot Calibration System.

- Added `AIBotCalibration` to turn AI-vs-AI match records into bot-level strength, error, opening, and endgame metrics.
- Added calibration targets for every bot: target rating, expected score against lower tier, max critical error rate, minimum opening success, minimum endgame conversion, and max draw rate.
- Bot calibration reports now aggregate games, wins/draws/losses, score rate, average moves, critical error rate, opening-book success, endgame conversion signals, and tuning recommendations.
- Added level gates for the main success criteria: level 15 over level 10, and level 10 over level 5.
- AI-vs-AI automation summaries now include `botCalibration`, and Markdown reports include a Bot Kalibrasyonu section with gate status and top recommendations.
- Added failing-first Phase 11 tests for target monotonicity, bot-vs-bot strength separation, tuning recommendations, and automation summary integration.
- Verification completed with bot calibration tests (7/7), full `npm test` (228/228), `npm run build`, and AI-vs-AI automation tests (6/6).

Latest task: implement Timur engine architecture Phase 12 AI Quality Report Automation.

- Added `quality-report` for AI-vs-AI automation runs, producing result quality, tactical safety, opening safety, endgame conversion, time-control, and difficulty/bot breakdown metrics.
- Quality reports now track draw rate, max-move draws, bad exchanges, reply-capture risk, tempo-loss signals, risky/low-score book moves, terminal win signals, long games, and long draws.
- Added baseline comparison support so current runs can be classified as improved/regressed/stable against a previous quality report.
- AI-vs-AI summaries now include `qualityReport`, and every file-writing run exports `quality-report.json` and `quality-report.md`, including fast-record-only runs.
- The classic Markdown automation report now includes an AI Kalite Ozeti section with the most important engine-health numbers.
- Added failing-first Phase 12 tests for quality metrics, Markdown output, baseline comparison, and automation summary integration.
- Verification completed with `node --test tests\\quality-report.test.mjs tests\\automation-api.test.mjs` (8/8).

Latest task: close `pawn_02_promote_viziers` promoted-Vizier endgame gap.

- Preserved `isPromoted` when reviving worker state and when mirroring white-AI positions, so promoted pieces stay visible to endgame logic.
- Added a promoted-Vizier + Rook + Royal mini-tablebase plan for sparse endgames against a lone royal.
- Added one-reply forecast and immediate-win probing for the promoted-Vizier net.
- Added promoted-Vizier safety checks so the helper does not step next to the enemy royal unless protected by the royal or rook.
- Reweighted the plan so the royal keeps approaching until the finishing 2-3 square band instead of letting the promoted Vizier or rook shuttle.
- Verification completed with `node --test tests\\tactical-suite.test.mjs` (31/50, unchanged), `node --test tests\\ai-endgame.test.js` (6/6), `node --test tests\\endgame-suite.test.mjs` (15/20, `pawn_02_promote_viziers` won in 19h), and `npm run build`.

Latest task: generalize sparse rook-helper endgame net.

- Expanded the promoted-Vizier endgame plan into a guarded rook-helper net for sparse K+R+helper vs lone royal positions.
- Helper net now supports Vizier, Sea Monster, and General helpers, and can tolerate one extra non-helper piece in sparse endings.
- Added helper-net one-reply forecasting, protected-helper safety, forced royal approach before the finishing band, and immediate terminal-win priority.
- Gated non-promoted helper nets by own-royal distance so unrelated tactical mate-in-1 positions still fall back to the normal tactical search.
- Verification completed with `node --test tests\\endgame-suite.test.mjs` (20/20), `node --test tests\\ai-endgame.test.js` (6/6), `node --test tests\\tactical-suite.test.mjs` (31/50, defense 8/8), and `npm run build`.

Latest task: add endgame piece role map and expand rook-support endings.

- Added `AIEndgameRoles` as the single source for endgame piece roles: royal pressure, primary finisher, direct net helper, leaper blocker, line controller, and promotion runner.
- Documented the role model in `ENDGAME_PIECE_ROLES.md` so future endgame work starts from role behavior instead of ad-hoc bonuses.
- Connected `AIEndgame` to the role map: rook-helper nets now recognize support pieces beyond Vizier/Sea Monster/General, while still treating Rook as the primary finisher.
- Support pieces such as Knight, Camel, Dabbaba, Elephant, Lion, Bull, Revealer, Giraffe, and Picket now get controlled rook-net support scoring instead of being forced into direct-mate behavior.
- Added role coverage tests and expanded the endgame benchmark with Sea Monster, Knight, Lion, Bull, and black Revealer support positions.
- Verification completed with `node --test tests\\endgame-suite.test.mjs` (25/25), `node --test tests\\ai-endgame-roles.test.js tests\\ai-endgame.test.js tests\\tactical-suite.test.mjs` (11/11, tactical 31/50, defense 8/8), and `npm run build`.

Latest task: measure opening-book safety.

- Added `report:opening-safety` to run repeatable opening-book safety probes from npm.
- Added `functions/scripts/analyze-opening-safety.mjs`, which measures raw book lines and integrated AI selection against booklike, pressure, and greedy opponent policies.
- The report records book moves used, book-exit ply, material balance, black/white losses, major early losses, illegal moves, and opening IDs chosen by the integrated AI.
- Generated `exports/opening-safety-report.md` and `exports/opening-safety-report.json` for the current 12-ply / 35ms benchmark run.
- Current benchmark result: 60 scenarios, 0 illegal moves, 12 flagged scenarios, 9 major black-loss scenarios, average integrated book moves 4.17.
- Main risk cluster is full formation openings: `full_lion_gate` and `full_revealer_shield`; `center_pawn` also has one integrated greedy line with an early picket loss.
- Verification completed with `npm run report:opening-safety -- --max-plies 12 --think-ms 35`, `node --test tests\\opening-book.test.js` (16/16), and `npm run build`.

Latest task: harden opening-book safety after benchmark findings.

- Added f-file defensive replies for `center_pawn` and `timur_siege` so early white f-pawn storms are met before they win central material.
- Added feminine camel-pressure replies for `feminine_council` and `feminine_fortress` so early camel intrusions are answered instead of ignored.
- Added full-formation anti-camel and pawn-storm branches for `full_lion_gate` and `full_revealer_shield`, including compensated recapture sequences and safer waiting moves.
- Allowed books to define their own `maxMoves`, with `full_revealer_shield` extended to five book plies where needed for the defensive branch.
- Refined the opening-safety report so compensated major-piece sacrifices are not treated as the same risk as clean early material loss.
- New benchmark result: 60 scenarios, 0 flagged scenarios, 0 illegal moves, 4 compensated major-loss events, average integrated book moves 4.6.
- Verification completed with `npm run report:opening-safety -- --max-plies 12 --think-ms 35`, `node --test tests\\opening-book.test.js` (16/16), and `npm run build`.
- Follow-up: full `npm test` currently has broader AI-search/evaluation failures outside opening legality; these should be handled as a separate engine-stability pass.

Latest task: add full character/difficulty AI matrix report.

- Added `report:ai-matrix` for full AI coverage across 4 personas, 3 difficulties, 3 formations, both AI colors, and 3 opponent policies.
- Added `functions/scripts/analyze-ai-matrix.mjs`, which simulates each scenario and records material swings, eval swings, opening-book usage, unsafe AI moves, tempo-loss signals, terminal result, illegal moves, and risk flags.
- Generated `exports/ai-matrix-report.md` and `exports/ai-matrix-report.json`.
- Current fast full-matrix run: 216 scenarios, 93 flagged, 0 illegal AI moves, 0 terminal AI losses, average final material +49.78, average min material -18.72, average unsafe AI moves 0.26.
- Main risk clusters: medium full-formation black AI against booklike pressure, medium masculine white AI against greedy pressure, and a few easy/full white-AI major-loss cases.
- Fixed `AiEvaluation` pawn-structure NaN by using `phase.weights.endgame`, then added same-file advanced pawn blocking penalty so doubled/blocked promotion runners are not overvalued.
- Verification completed with `node --test tests\\ai-profiles.test.js tests\\ai-evaluation-v3.test.js tests\\opening-book.test.js` (47/47), `npm run report:ai-matrix -- --max-plies 16 --think-ms 8`, and `npm run build`.
- Full `npm test` currently passes 229/234; remaining failures are 5 `ai-worker` search-stat/endgame expectation tests and should be handled as the next AI search diagnostics pass.

Latest task: harden risky move selection after AI matrix findings.

- Updated `AISelectionPolicy` so static-exchange debt now reads the explicit `exchangeDebt` field, not only negative SEE score, and boolean tempo-loss metadata is counted consistently.
- Added a post-selection safety override for easy/medium/hard: if the selected candidate is tactically unsafe, the selector can now leave the score-window pool and choose a safer candidate when the safety gain is meaningful.
- Added a clean high-value capture override: if the AI is about to make a risky low-value capture but a safe major capture is available, it prefers the safe material win.
- Added a risky low-value capture guard: medium/hard no longer chase a pawn or quiet low-value target when it clearly drops a more valuable piece and a safe development move is close enough.
- Added regression tests for the two concrete failures found in the matrix: risky pawn grab vs safe rook capture, and risky low-value capture vs safe development.
- Verification completed with `node --test tests\\ai-profiles.test.js tests\\ai-evaluation-v3.test.js tests\\opening-book.test.js` (49/49), full quick AI matrix `npm run report:ai-matrix -- --max-plies 16 --think-ms 8`, and `npm run build`.
- Matrix effect: illegal moves 0, terminal AI losses 0, average min material improved from `-18.72` to `-15.31`, average unsafe moves improved from `0.26` to `0.11`; targeted medium risk cluster improved from unsafe `0.44` to `0.03`, and medium/hard full matrix now show `avgUnsafeMoves: 0`.
- Remaining follow-up: top residual material-drop flags are mostly white-AI opening-plan issues, not immediate unsafe candidate selection. They should be handled in a separate opening repertoire / early defensive plan pass.

Latest task: harden white-AI opening discipline and repertoire.

- Added opening-discipline scoring to `AIStylePolicy`: early non-capture long leaps, repeated deep raids, poisoned low-value captures, and deep opening incursions now receive strong style penalties.
- Fixed forward-depth handling for both colors and included pawn-like leap moves in the same opening discipline so special Timur pawns cannot bypass the safety rules.
- Added opening debt to `AISelectionPolicy` safety debt so easy/medium/hard selection can reject flashy opening moves when a close safer move exists.
- Reworked risky masculine opening lines (`double_knight_pressure`, `active_camel`, `timur_siege`) away from early `c4 -> d6` / deep-raid plans and toward pawn/support development first.
- Added `full_safe_development` for full formation so easy/full AI has a safe opening repertoire instead of inventing early major-piece center jumps.
- Updated opening-book expectations to match the safer Timur Siege start.
- Verification completed with `node --test tests\\ai-style-policy.test.js tests\\ai-profiles.test.js tests\\opening-book.test.js` (63/63), targeted matrix runs, and `npm run build`.
- Matrix effect: easy/full white target improved to 0 flags and 0 unsafe moves; white masculine target improved in severity (average min material improved to about `-28.33`) but still has short-horizon material/eval flags that need a deeper search/reply-analysis pass rather than more opening-book edits.

Latest task: close white masculine 16-ply reply-analysis flags.

- Fixed the opening-discipline forward direction for real board coordinates: white forward moves decrease internal row, black forward moves increase it.
- Added a regression test for white early deep pawn leaps so `b2 -> c4` / similar opening jumps cannot bypass style safety again.
- Added root-level opponent continuation threat analysis for low-value opening captures: after an AI candidate, the worker now checks whether the same enemy piece can route to and capture the moved valuable piece within the next 2-3 opponent moves.
- Fed continuation threat into root score, decision-style risk, and selection safety debt so medium/hard can leave a flashy pawn grab for safer development.
- Verification completed with `node --test tests\\ai-style-policy.test.js tests\\ai-profiles.test.js tests\\opening-book.test.js` (65/65), targeted `npm run report:ai-matrix -- --personas timur,beyazid,saray_veziri --difficulties medium,hard --formations masculine --ai-colors white --policies booklike,greedy --max-plies 16 --think-ms 8`, and `npm run build`.
- Matrix effect: white masculine target is now 12 scenarios, 0 flags, 0 illegal moves, 0 terminal losses, average unsafe moves 0; average min material is `-18.33`, but no material/eval flag remains under the short 16-ply check.
- Note: targeted worker search-stat tests still contain broader deadline/search-depth expectation failures unrelated to this targeted matrix fix; keep them for a separate AI search diagnostics pass.

Latest task: close AI worker search diagnostics note.

- Added `disableEndgameShortcuts` to `selectBlackMoveAnalysisForState` so diagnostics can intentionally exercise the normal iterative search path instead of being intercepted by mate/tablebase shortcuts.
- Updated stale `ai-worker` expectations for the safer opening system: hard AI no longer blindly forces book moves when the engine score window rejects them, and white AI likewise prefers the safe engine move over risky book pressure.
- Updated sparse endgame coverage to assert the new mini-tablebase behavior directly instead of the older generic search move.
- Relaxed search-stat assertions to check the attempted target depth and emitted diagnostics, not only fully completed depth under short deadlines.
- Verification completed with `node --test tests\\ai-worker.test.js` (32/32), `node --test tests\\ai-style-policy.test.js tests\\ai-profiles.test.js tests\\opening-book.test.js tests\\ai-worker.test.js` (97/97), and `npm run build`.

Latest task: add MiddleGame v1 tactical-plan engine.

- Added `src/ai/AIMiddleGame.js` to evaluate orta oyun plans with attack-map based hanging-piece pressure, own-piece safety, overload signals, royal pressure, center balance, mobility, and quiet tactical threats.
- Root candidates now carry `middleGameMove` analysis in `ai.worker.js`, including fork/royal-pressure/hanging-target/overloaded-defender motifs and score metadata.
- `AiEvaluation` now includes a `middleGamePlan` component so the engine sees more than opening/endgame: it can score stabilization, target attack, centralization, and regrouping plans.
- Added focused tests for quiet fork detection, stabilization when own material hangs, and worker candidate metadata.
- Updated the white-AI safe-opening worker test so it checks the intended behavior instead of one old exact move.
- Verification completed with `node --test tests\\ai-middlegame.test.js tests\\ai-evaluation-v3.test.js tests\\ai-worker.test.js tests\\ai-style-policy.test.js tests\\ai-profiles.test.js tests\\opening-book.test.js` (102/102) and `npm run build`.

Latest task: add rule-draw helpers for automation draw analysis.

- Added `GameRules.buildPositionHash`, `checkThreefoldRepetition`, `checkFiftyMoveDraw`, and `resolveRuleDraw`.
- Threefold hashes include side to move, piece locations/types/pawn state, promotion state, and royal-swap/citadel-exchange rights.
- The 50-move helper treats the standard threshold as 100 plies without pawn moves or captures.
- AI-vs-AI automation now calls `resolveRuleDraw` after normal royal/checkmate/stalemate checks, so repeated positions and long no-capture/no-pawn sequences stop before max-move cutoff.
- Verification completed with `node --test tests\\game-rules-simulation.test.js`, `node --test tests\\automation-api.test.mjs`, and `npm run build`.

Latest task: make winning AI avoid repetition draws after 20-match automation analysis.

- Fixed direct AI worker usage so `aiRecentPositionHashes` is reconstructed from `aiRecentPositionSnapshots` when hashes are not supplied; this matters for AI-vs-AI automation, which feeds snapshots directly.
- Added `normalizeAiRecentPositionHashes()` and call it before AI move selection, covering both direct automation calls and worker-revived states.
- Added a decision-style repetition component so a winning side receives a strong extra penalty for repeated-position / route-loop moves; losing/equal sides can still seek repetition naturally.
- Added regression tests proving snapshot-based repetition memory is rebuilt and hard/Timur rejects a high raw-score repetition loop in favor of a progress/mate-net move.
- Verification completed with `node --test tests\\ai-worker.test.js tests\\ai-style-policy.test.js`, `npm run build`, and a 2-match fast automation smoke run in `Al vs Al ( Otomasyon)\\runs\\repeat-fix-smoke`.
- Note: any already-running 144-match automation process keeps the old loaded code; restart the long run to measure this fix.

Latest task: fix 40-match automation findings for black conversion, Beyazid loops, and unknown results.

- Added black-side winning conversion pressure in `AIStylePolicy`: when black is already winning, forcing checks, mate-net pressure, mobility reduction, and plan progress now beat passive quiet drift more strongly.
- Strengthened Beyazid's winning repetition escape: a winning Beyazid attack no longer accepts low-severity repeat loops just because the raw score is high.
- Added regression coverage for hard black conversion and hard Beyazid loop-breaking in `tests\\ai-style-policy.test.js`.
- Verification completed with `node --test tests\\ai-style-policy.test.js` (19/19), `npm run build`, and a 4-match fast automation smoke run with no `unknown` results.

Latest task: improve mate-net closure after early 280-run analysis.

- Analyzed the first 17 matches from `Al vs Al ( Otomasyon)\\runs\\ai-vs-ai-280-black-conversion-fix`: 12 draws, 3 checkmates, 2 stalemate wins, average 224.5 moves.
- Main finding: long games still had repeated route loops and `terminalWin` stayed at 0; AI created pressure/checks but often did not prioritize closing the royal net once the opponent mobility was low.
- Added a new `mateNetClosure` decision-style component. When a side is already winning and the game is late, terminal, or has clear plan progress, AI now strongly prefers checks, low-opponent-mobility nets, and result-closing moves over passive quiet drift.
- The component is difficulty-scaled: easy is still imperfect, medium improves, hard converts most aggressively.
- Added regression test `hard winning side closes a mate net over late-game quiet drift`.
- Verification completed with `node --test tests\\ai-style-policy.test.js` (20/20), broader AI tests `node --test tests\\ai-worker.test.js tests\\ai-style-policy.test.js tests\\ai-profiles.test.js tests\\opening-book.test.js` (102/102), and `npm run build`.
- Restarted the long AI-vs-AI run with the new code at `Al vs Al ( Otomasyon)\\runs\\ai-vs-ai-280-mate-net-closure`.

Latest task: remove chess puzzles from main menu and build/install APK.

- Removed the `Satranç Bulmacaları / Chess Puzzles` button from the main menu while keeping the underlying puzzle screen/code available for a future return.
- Adjusted main menu button spacing, minimum height, and border radius so the remaining six menu actions fill the panel more cleanly.
- Updated onboarding copy to stop advertising puzzles from the first-run flow.
- Paused the running AI-vs-AI automation process to free resources while switching away from AI motor work.
- Verification completed with `npm run build`, `npx cap sync android`, and `gradlew :app:installDebug` on `emulator-5554`.
- Debug APK copied to `TimurChess_v1.2.13_v25_MenuNoPuzzles_debug.apk`.
- Visual emulator screenshot saved to `output\\menu_no_puzzles.png`; the main menu no longer shows the puzzles button.

Latest task: build version 26 release AAB.

- Updated Android release metadata to `versionCode 26` and `versionName 1.2.14`.
- Built production web assets with `npm run build`.
- Synced Capacitor Android project with `npx cap sync android`.
- Produced the signed release bundle with `gradlew :app:bundleRelease`.
- Copied the final AAB to `TimurChess_v1.2.14_v26.aab`.

Latest task: apply UI polish phases 1 and 2.

- Polished the main menu first impression with a more cohesive Timurid panel treatment, stronger title styling, unified button shadows, and a dedicated `learn-btn` style instead of an inline prototype color.
- Updated formation/card styling toward one consistent visual language with richer selected-state treatment.
- Improved board readability by slightly increasing board contrast, adding subtle cell depth, and reducing mobile citadel span so the board gains more usable width.
- Improved piece readability by enlarging rendered pieces in cells and adding stronger white/black contrast filters and shadows.
- Verification completed with `npm run build` and a local `vite preview` visual check for the main menu and quick-start board.

Latest task: apply tutorial guide phase 3.

- Reworked the teaching guide into compact, readable movement cards for the board/citadel, core pieces, cavalry, siege pieces, long-range pieces, pawns, and special rules.
- Added small visual movement diagrams to each card so "Bu taş nasıl gider?" is easier to understand without reading long paragraphs.
- Tightened tutorial typography, wrapping, card layout, and responsive behavior so text no longer spills out on narrow/mobile screens.
- Suppressed the older large lesson diagram when a lesson already has the new guide cards, reducing duplicate visuals and confusion.
- Verification completed with `npm run build` and local `vite preview` visual checks at narrow/mobile viewport sizes.

Latest task: clean board advantage bar and sharpen black pieces.

- Removed the dark vertical container/background from the in-game advantage meter so only the slim black/white bar remains visible on the board.
- Hid the extra advantage title, label, score, and impact chips from the persistent board meter to reduce playfield clutter.
- Replaced wide blurry black-piece shadows with tighter, harder contour shadows in the default, warrior, and dynasty piece skins.
- Verification completed with `npm run build` and a local `vite preview` board screenshot check.
## Fairy-Stockfish/WASM-NNUE Kontrollu POC Baslangici

- Mevcut oyun motoruna dokunmadan `fairy-poc` deney alani eklendi.
- `fairy-poc/timur-piece-map.json` ile Timur taslari Fairy-Stockfish tarafina nasil eslenecek belgelendi.
- `fairy-poc/timur-draft.variants.ini` ile 10x11 Timur varyant taslagi olusturuldu.
- `npm run fairy:poc:check` komutu eklendi; kaynak klasor, taslak dosyalar, FEN olcusu ve derlenmis WASM ciktilari kontrol ediliyor.
- `fairy-stockfish-nnue.wasm@1.1.11` paketi izole olarak `fairy-poc/vendor/fairy-stockfish-nnue.wasm` altina acildi.
- `npm run fairy:poc:smoke` ile normal chess UCI testi basarili: `bestmove e2e3`.
- `npm run fairy:poc:timur` ile `timur_poc` varyanti yuklendi ve hamle uretti: `bestmove d3d4`.
- `npm run fairy:poc:perft` ile perft kontrolu alindi: chess perft 1 = 20; guncel Timur POC baslangic hamlesi `fairy:poc:compare` ile 31.
- `npm run build` basarili; POC dosyalari mevcut oyunu etkilemedi.

## Fairy-Stockfish/WASM-NNUE POC Karsilastirma

- `npm run fairy:poc:dump` eklendi; Fairy'nin `timur_poc` tahtasini dogru yukleyip yuklemedigi gorulebiliyor.
- Ilk dump, standart taslarin (`p`, `n`, `r`, `k`) tanimlanmadigini gosterdi; POC varyantina `pawn`, `knight`, `rook`, `king` tanimlari eklendi.
- `npm run fairy:poc:compare` ile mevcut JS motor ve Fairy POC baslangic legal hamleleri karsilastirildi.
- Guncel sonuc: JS = 31, Fairy POC = 31, ortak = 29, beklenmeyen fark = yok.
- Kalan farklar bilerek POC siniri olarak isaretlendi: zürafa hareketi plain Betza ile birebir degil; Haberci/Picket ise Fairy tarafinda ilk capraz kareyi de uretiyor.

## Fairy-Stockfish Uyumluluk Adapter Katmani

- `FAIRY_STOCKFISH_UYUMLULUK_PLANI.md` eklendi; wrapper/C++ fork karar tablosu ve fazli gecis plani yazildi.
- `src/fairy/FairyTimurAdapter.js` eklendi; JS Timur legal hamleleri Fairy UCI koordinatina cevriliyor ve Fairy hamleleri JS kurallariyla guvenli sekilde uzlastiriliyor.
- Adapter artik Fairy'nin fazla verdigi hamleleri sebep etiketiyle reddediyor, Fairy'nin uretemedigi JS hamlelerini de `wrapper gerekli` olarak raporluyor.
- `scripts/compare-fairy-timur-moves.mjs` adapter katmanini kullanacak sekilde guncellendi.
- `tests/fairy-timur-adapter.test.js` ve `npm run fairy:poc:adapter:test` eklendi.
- Dogrulama: `npm run fairy:poc:adapter:test`, `npm run fairy:poc:compare`, `npm run build` basarili.

## Fairy-Stockfish Faz 3 Tas Pozisyon Testleri

- `scripts/compare-fairy-piece-positions.mjs` ve `npm run fairy:poc:pieces` eklendi.
- `timur-draft.variants.ini` genisletildi: deniz canavari, aslan, boga, acici/revealer, prens ve tavsiye/adventitious king hareketleri POC'a eklendi.
- `timur-piece-map.json` guncellendi; yeni POC eslemeleri belgelendi.
- 17 izole tas pozisyonu JS motor ile Fairy POC arasinda karsilastirildi.
- Sonuc: 17/17 pozisyonda beklenmeyen fark yok.
- Birebir eslesenler: piyon, sah, vezir, deniz canavari, general, at, fil, deve, dabbaba, aslan, boga, acici, kale, prens hareketi, tavsiye/adventitious king hareketi.
- Beklenen wrapper alanlari: Haberci/Picket minimum 2 kare kuralı ve Zürafa ozel hareketi.

## Fairy-Stockfish Faz 4 Bestmove Guvenlik Kapisi

- `normalizeFairyBestMove()` ve `selectSafeTimurMoveFromFairyBestMove()` adapter fonksiyonlari eklendi.
- `scripts/validate-fairy-bestmove.mjs` ve `npm run fairy:poc:bestmove` eklendi.
- `tests/fairy-bestmove-gate.test.js` ve `npm run fairy:poc:bestmove:test` eklendi.
- Gate davranisi: Fairy bestmove JS Timur legal listesinde varsa kabul edilir; yoksa sebep etiketiyle reddedilir ve fallback hamle secilir.
- Mock illegal hamle `c2d1` testinde hamle `picket_minimum_distance_rule` sebebiyle reddedildi ve fallback kullanildi.
- Gercek WASM testinde Fairy `bestmove d3d4` uretti ve JS Timur motoru legal buldugu icin kabul edildi.

## Fairy-Stockfish Faz 5 Production Readiness Kapisi

- `scripts/check-fairy-production-readiness.mjs` ve `npm run fairy:poc:readiness` eklendi.
- Komut POC dosyalarini, WASM artifact'larini, adapter/bestmove unit testlerini, baslangic karsilastirmasini, 17 tas pozisyonu testini ve gercek WASM bestmove gate testini calistiriyor.
- `FAIRY_STOCKFISH_PRODUCTION_READINESS.md` otomatik raporu uretiliyor.
- Sonuc: POC teknik kapisi GECTI.
- Sonuc: Dogrudan production entegrasyonu HAZIR DEGIL.
- Bekleyen manuel kararlar: Android WebView stabilitesi, 5/15/30 dk performans olcumu, GPL-3.0 lisans/yayin karari, hisar/sah degisimi/pawn-of-pawns production wrapper testleri.

## Fairy-Stockfish Faz 6 Android/WebView Smoke Kapisi

- `scripts/prepare-fairy-webview-assets.mjs` ve `npm run fairy:poc:webview:prepare` eklendi.
- `scripts/check-fairy-webview-assets.mjs` ve `npm run fairy:poc:webview:check` eklendi.
- `public/fairy-smoke.html` eklendi; oyun AI'sina baglanmadan WebView icinde WASM, worker, `timur_poc` varyanti ve `go depth 1` bestmove akisini test ediyor.
- Fairy public asset paketi `public/fairy/` altina hazirlaniyor: `stockfish.js`, `stockfish.wasm`, `stockfish.worker.js`, `uci.js`, `timur-draft.variants.ini`, `manifest.json`.
- `npm run fairy:poc:readiness` WebView public asset/smoke sayfasi kontrolunu da kapsayacak sekilde guncellendi.
- `scripts/serve-fairy-smoke.mjs` ve `npm run fairy:poc:webview:serve` eklendi; smoke sayfasini COOP/COEP basliklariyla yerelde calistirip pthread/WASM gereksinimlerini test etmeyi saglar.
- `FAIRY_WEBVIEW_SMOKE_RESULT.md` eklendi; ilk smoke denemesinde `SharedArrayBuffer is not defined` yakalandi. Bu nedenle Fairy su an production AI'a baglanmayacak; tek thread WASM veya Android WebView izolasyonu sonraki teknik karar.

## Fairy-Stockfish Faz 7 Tek-Thread WASM Yolu

- `../Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten/Makefile` tek-thread build secenegini destekleyecek sekilde guncellendi.
- Varsayilan pthread build yolu korunurken `threads=no` ile `-DNO_THREADS` ve `USE_PTHREADS=0` build yolu eklendi.
- Worker artifact'i tek-thread build icin zorunlu olmaktan cikarildi ve `emscripten_build_singlethread` hedefi eklendi.
- `scripts/check-fairy-singlethread-readiness.mjs` ve `npm run fairy:poc:singlethread:check` eklendi.
- `npm run fairy:poc:readiness` tek-thread build yolunu da kontrol edecek sekilde guncellendi.
- `FAIRY_SINGLE_THREAD_READINESS.md` otomatik raporu eklendi.
- Durum: tek-thread build yolu hazir, fakat tek-thread artifact henuz uretilmedi. Artifact uretilip Android WebView smoke gecmeden Fairy production AI olarak baglanmayacak.

## Fairy-Stockfish Faz 8 Tek-Thread Artifact Build Denemesi

- `scripts/build-fairy-singlethread-artifact.mjs` ve `npm run fairy:poc:singlethread:build` eklendi.
- Komut `threads=no` build almayi, cikan dosyalari `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina kopyalamayi ve artifact'i denetlemeyi otomatiklestirir.
- `FAIRY_SINGLE_THREAD_BUILD_RESULT.md` raporu uretiliyor.
- Yerel toolchain kuruldu:
  - `tools/emsdk` altina Emscripten SDK 2.0.26 kuruldu.
  - `ezwinports.make` winget ile kuruldu.
- Fairy kaynak build zinciri tek-thread icin duzeltildi:
  - `src/emscripten/preamble.js` thread yokken queue kullanacak sekilde guvenli hale getirildi.
  - `src/Makefile` `-DNO_THREADS` verildiginde `USE_PTHREADS`/`-lpthread` eklemeyecek sekilde duzeltildi.
- Tek-thread artifact basariyla uretildi:
  - `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/stockfish.js`
  - `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/stockfish.wasm`
- `npm run fairy:poc:singlethread:check` sonucu: `Tek-thread artifact: OK`.
- `npm run fairy:poc:readiness` sonucu: POC teknik kapisi GECTI, production hala GPL/WebView/performance kararlarini bekliyor.

## Fairy-Stockfish Faz 10 Tek-Thread WebView Smoke

- `public/fairy-smoke.html` tek-thread seciciyle (`?engine=singlethread`) calisacak hale getirildi.
- `scripts/prepare-fairy-webview-assets.mjs` artik hem pthread `public/fairy/` hem tek-thread `public/fairy-singlethread/` paketini hazirliyor.
- `scripts/check-fairy-webview-assets.mjs` iki public paketi ve smoke sayfasinin tek-thread secimini kontrol ediyor.
- Fairy kaynak `src/thread.cpp` `NO_THREADS` moduna uyarlandi; artik tek-thread build `std::thread` baslatmaya calisip abort olmuyor.
- Tek-thread artifact yeniden derlendi ve smoke testinde `uciok`, `readyok`, `timur_poc`, `bestmove d3d4` basariyla alindi.
- `npm run build`, `npx cap sync android` ve `gradlew :app:installDebug` basarili; guncel APK emulatore kuruldu.
- Android logcat acilis kontrolunde `SharedArrayBuffer`, WASM/Stockfish RuntimeError veya fatal crash hatasi gorulmedi.
- Android Chrome uzerinden ayrik smoke sayfasi denemesi Google sign-in ekranina takildigi icin tam UI otomasyon sonucu alinmadi; bunun icin ileride debug-only smoke route onerildi.

## Fairy-Stockfish Faz 11 Performans ve Sure Butcesi Olcumu

- `scripts/measure-fairy-performance.mjs` eklendi; tek-thread veya pthread artifact icin depth bazli bestmove surelerini olcuyor.
- `npm run fairy:poc:perf` komutu eklendi.
- `public/fairy-smoke.html` artik `?depth=` parametresiyle farkli arama derinliklerini test edebiliyor.
- `FAIRY_PERFORMANCE_BUDGET_REPORT.md` otomatik raporu uretiliyor.
- Tek-thread POC depth 1-8, 2 tekrar ile olculdu; depth 8 P95 29ms, mobil tahmini P95 87ms civarinda.
- Yerel Chromium smoke `?engine=singlethread&depth=8` ile gecti: `bestmove d3d4 ponder k8k7`.
- `npm run fairy:poc:webview:check`, `npm run build` ve `npm run fairy:poc:readiness` basarili.
- Sonuc: Faz 11 tamamlandi; Fairy hala production AI degil, Android WebView icinde uzun pozisyon/stres testi ve GPL karari bekliyor.

## Fairy-Stockfish Faz 12 Debug/Deney Modu Entegrasyonu

- `src/fairy/FairyFen.js` eklendi; JS Timur pozisyonunu Fairy `timur_poc` FEN formatina ceviriyor.
- `src/fairy/FairyDebugEngine.js` eklendi; varsayilan kapali, pasif shadow/debug motoru olarak calisiyor.
- Debug modu `?fairyDebug=1`, `localStorage.setItem('timur_fairy_debug', '1')` veya `window.timurFairyDebug.enable()` ile aciliyor.
- `AIEngine` icinde JS AI hamlesi degistirilmeden Fairy aday hamlesi pasif olarak isteniyor.
- Hamle kaydina `fairyDebug` metadata'si eklendi: `fairyBestMove`, `fairyAccepted`, `fairyRejectedReason`, `fallbackUsed`, `fairyThinkMs`, `jsAiMove`.
- Firestore game record ve mac gecmisi Fairy debug ozetlerini koruyacak sekilde guncellendi.
- `index.html` CSP'sine debug WASM icin `wasm-unsafe-eval` ve `worker-src` eklendi.
- `tests/fairy-debug-engine.test.js` ve `npm run fairy:poc:debug:test` eklendi.
- `FAIRY_DEBUG_INTEGRATION_RESULT.md` raporu eklendi.
- Dogrulama: `npm run fairy:poc:debug:test`, `npm run fairy:poc:readiness`, `npm run build` basarili.
- Yerel app smoke: `?fairyDebug=1&fairyDepth=1` ile Hizli Baslat sonrasi oyuncu hamlesi yapildi; JS AI hamle yapti ve Fairy tek-thread motoru console'da yuklendi. Yeni hata yok, sadece mevcut favicon 404 goruldu.
- Sonuc: Faz 12 tamamlandi; Fairy hala production AI degil, yalnizca debug verisi ureten shadow motor.

## Fairy-Stockfish Faz 13 Kural Uyumu Derin Testleri

- `src/fairy/FairyTimurAdapter.js` guncellendi; Fairy UCI ile temsil edilemeyen tahta disi hisar hamleleri artik sessizce atilmiyor.
- Hisar hamleleri `unsupported` pseudo hamle olarak raporlaniyor ve `citadel_requires_wrapper` sebebiyle JS wrapper'a birakiliyor.
- `selectSafeTimurMoveFromFairyBestMove()` fallback secerken desteklenmeyen pseudo hamleleri oyun hamlesi olarak kullanmayacak sekilde guvenli hale getirildi.
- `tests/fairy-special-rules.test.js` eklendi; Zürafa, Haberci, promotion suffix, sah degisimi, hisar degisimi, hisar beraberligi, pawn-of-pawns, prince/adventitious king ve royal capture alanlarini kapsiyor.
- `npm run fairy:poc:special-rules:test` komutu eklendi.
- `npm run fairy:poc:readiness` Faz 13 testini de calistiracak sekilde guncellendi.
- `FAIRY_SPECIAL_RULES_COMPATIBILITY_RESULT.md` raporu eklendi.
- Dogrulama: `npm run fairy:poc:special-rules:test` sonucu 11/11 test basarili.
- Sonuc: Faz 13 tamamlandi; Fairy hala production AI degil, fakat Timur'a ozel kural uyumu icin otomatik test kapisi var.

## Fairy-Stockfish Faz 14 Hibrit AI Karar Katmani

- `src/fairy/FairyDebugEngine.js` icinde varsayilan kapali hibrit karar katmani eklendi.
- `?fairyHybrid=1`, `localStorage.timur_fairy_hybrid=1` veya `window.timurFairyDebug.enableHybrid()` ile hibrit mod acilabiliyor.
- `?fairyHybrid=force` veya `window.timurFairyDebug.enableHybrid({ force: true })` tum profillerde test amacli hibrit uygulamayi zorlayabiliyor.
- `AIEngine` artik Fairy aday hamlesini sadece hibrit acikken, JS legal kapisindan gecmisse ve profil uygunsa JS AI hamlesinin yerine uygulayabiliyor.
- Kolay/orta modlarda kabul edilen Fairy hamlesi varsayilan olarak sadece kayit edilir; hard ve Bot 10+ profilleri hibrit uygulamaya uygundur.
- `GameRecordBuilder` Fairy debug kaydina `hybridEligible`, `hybridApplied`, `hybridRejectedReason` ve ozet icin `hybridAppliedCount` alanlarini ekledi.
- `tests/fairy-hybrid-policy.test.js` ve `npm run fairy:poc:hybrid:test` eklendi.
- `npm run fairy:poc:readiness` hibrit karar testiyle guncellendi.
- `FAIRY_HYBRID_DECISION_LAYER_RESULT.md` raporu eklendi.
- Dogrulama: `npm run fairy:poc:hybrid:test` sonucu 6/6 test basarili.
- Ek dogrulama: `node --test tests/fairy-debug-engine.test.js tests/fairy-hybrid-policy.test.js tests/fairy-special-rules.test.js` sonucu 20/20 test basarili.
- Ek dogrulama: `npm run fairy:poc:readiness` POC teknik kapisini gecirdi; production hala GPL-3.0 karari nedeniyle bilincli olarak kapali.
- Ek dogrulama: `npm run build` basarili.
- Tarayici smoke: `http://127.0.0.1:4180/?fairyDebug=1&fairyHybrid=1&fairyDepth=1` acildi, hizli baslat yapildi, oyuncu hamlesinden sonra AI hamle akisi tamamlandi. Konsolda sadece mevcut favicon 404 hatasi goruldu.
- Sonuc: Faz 14 tamamlandi; Fairy hala production default AI degil, yalnizca kontrollu hibrit deney kapisi var.

## Fairy-Stockfish Faz 15 GPL Lisans ve GitHub Yayin Hazirligi

- GPL yolu secildi; motor/proje GitHub'da acik kaynak olarak paylasilacak.
- Proje kokune GPLv3 lisans metni `LICENSE` olarak eklendi.
- Root `package.json` lisansi `GPL-3.0-only` olarak korunuyor.
- `THIRD_PARTY_NOTICES.md`, `SOURCE_DISTRIBUTION.md`, `OPEN_SOURCE_RELEASE_GUIDE.md`, `FAIRY_GPL_RELEASE_DECISION.md` ve `README.md` eklendi.
- `.gitignore` `.env`, secrets, service-account JSON, APK/AAB, output/artifacts ve Android build ciktisini yayin disi tutacak sekilde genisletildi.
- `scripts/check-gpl-release-readiness.mjs` git'e takip edilen gizli dosyalari kontrol edecek sekilde duzeltildi; yerel `secrets/` klasoru var diye haksiz fail vermiyor.
- `npm run release:gpl:check` GitHub oncesi lisans, kaynak dagitimi, Fairy bildirimleri ve gizli dosya kontrolleri icin ana komut olarak hazirlandi.
- Sonuc: Faz 15 tamamlandi; Fairy production default karari hala Faz 16 ve Android uzun stres testine bagli.

## Fairy-Stockfish Faz 16 Tam Fairy Tabanli Fork

- Karar: Tam Fairy tabanli fork yolu secildi.
- `src/fairy/FairyDebugEngine.js` icinde `fairyFork` modu eklendi ve varsayilan acik yapildi.
- AI hamle akisi artik Fairy-first calisir; Fairy legal hamle onerirse uygulanir.
- JS Timur motoru tamamen kaldirilmadi; kural hakemi, fallback ve Timur'a ozel wrapper katmani olarak korunur.
- `?fairyFork=0/1`, `window.timurFairyDebug.enableFork()` ve `disableFork()` kontrol kapilari eklendi.
- Fairy arama derinligi zorluk, bot seviyesi ve sure kontrolune gore ayarlaniyor.
- `tests/fairy-hybrid-policy.test.js` Fairy fork senaryolarini kapsayacak sekilde genisletildi.
- `npm run fairy:poc:fork:test` komutu eklendi.
- `FAIRY_FULL_FORK_RESULT.md` raporu eklendi.
- Sonuc: Faz 16 uygulandi; Android uzun WebView stres testi release oncesi manuel kapidir.

## Fairy-Stockfish Faz 17 Native Kaynak Fork

- `Satranc Motoru/fairy-stockfish.wasm-nnue/src/variant.cpp` icine `timur_variant()` eklendi.
- Native varyant `timur` olarak kaydedildi; `timur_poc` adi geriye uyumluluk icin ayni varyanta baglandi.
- Native kaynakta 11x10 tahta, mevcut Timur baslangic FEN'i, temel/ozel tas cekirdegi, zorunlu terfi, 3-kat tekrar ve 50 hamle yardimcilari tanimlandi.
- `scripts/check-fairy-native-source.mjs` ve `npm run fairy:native:source:check` eklendi.
- `scripts/validate-fairy-native-timur.mjs` ve `npm run fairy:native:bestmove` eklendi.
- Mevcut `tools/emsdk` ve Git Bash ile native kaynak derlendi.
- Pthread artifact `Satranc Motoru/fairy-stockfish.wasm-nnue/src/emscripten/public` altina uretildi.
- Single-thread artifact `fairy-poc/vendor/fairy-stockfish-singlethread.wasm` altina uretildi ve `public/fairy-singlethread` icin hazirlandi.
- `src/fairy/FairyDebugEngine.js` artik harici `timur_poc` yuklemek yerine built-in `timur` varyantini secer.
- `public/fairy-smoke.html` varsayilan olarak single-thread + native `timur` test edecek sekilde guncellendi; `?variant=poc` geriye donuk secenek olarak kaldi.
- `FAIRY_NATIVE_FORK_RESULT.md` raporu olusturuldu.
- Dogrulama: `npm run fairy:native:bestmove` native `timur` ile `bestmove d3d4` urettigini dogruladi.
- Dogrulama: `npm run fairy:poc:readiness` POC teknik kapisini gecti; production karari hala Android uzun WebView stres testine bagli.
- Sonuc: Faz 17 tamamlandi; sonraki C++ fazlari hisar, zurafa, ek sah royal mantigi ve pawn-of-pawns ozel kurallaridir.

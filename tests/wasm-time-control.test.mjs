import test from "node:test";
import assert from "node:assert/strict";

import {
  LEVELS,
  countPiecesFromFen,
  selectTimeControl,
} from "../scripts/wasm-time-control.mjs";

const fullBoardFen = "rnzbgvghbznr/ppppppppppp/11/11/11/11/11/11/PPPPPPPPPPP/RNZBGVGHBZNR w - - 0 1";
const endgameFen = "K10/11/11/11/11/5r5/11/11/11/10k w - - 0 120";
const criticalFen = "K10/11/11/11/11/11/11/11/9r1/10k w - - 88 180";

test("counts Timur FEN pieces for phase detection", () => {
  assert.deepEqual(countPiecesFromFen(endgameFen), { white: 1, black: 2, total: 3 });
});

test("uses faster opening time and stronger endgame time by level", () => {
  const opening = selectTimeControl(LEVELS.hard, {
    fen: fullBoardFen,
    ply: 6,
    maxMoves: 280,
    halfmoveClock: 0,
    checkers: "",
  });
  const middle = selectTimeControl(LEVELS.hard, {
    fen: fullBoardFen,
    ply: 80,
    maxMoves: 280,
    halfmoveClock: 0,
    checkers: "",
  });
  const endgame = selectTimeControl(LEVELS.hard, {
    fen: endgameFen,
    ply: 210,
    maxMoves: 280,
    halfmoveClock: 20,
    checkers: "",
  });

  assert.equal(opening.phase, "opening");
  assert.equal(middle.phase, "middlegame");
  assert.equal(endgame.phase, "critical_endgame");
  assert.ok(opening.movetime < middle.movetime);
  assert.ok(middle.movetime < endgame.movetime);
});

test("keeps short smoke runs from classifying the first move as endgame", () => {
  const opening = selectTimeControl(LEVELS.medium, {
    fen: fullBoardFen,
    ply: 0,
    maxMoves: 40,
    halfmoveClock: 0,
    checkers: "",
  });

  assert.equal(opening.phase, "opening");
});

test("separates easy, medium, and hard more strongly in critical endgames", () => {
  const context = {
    fen: criticalFen,
    ply: 252,
    maxMoves: 280,
    halfmoveClock: 88,
    checkers: "",
  };

  const easy = selectTimeControl(LEVELS.easy, context);
  const medium = selectTimeControl(LEVELS.medium, context);
  const hard = selectTimeControl(LEVELS.hard, context);

  assert.equal(easy.phase, "critical_endgame");
  assert.equal(medium.phase, "critical_endgame");
  assert.equal(hard.phase, "critical_endgame");
  assert.ok(easy.movetime < medium.movetime);
  assert.ok(medium.movetime < hard.movetime);
  assert.ok(hard.movetime >= 600);
});

test("explicit movetime override remains fixed for controlled experiments", () => {
  const fixed = selectTimeControl(LEVELS.hard, {
    fen: criticalFen,
    ply: 252,
    maxMoves: 280,
    halfmoveClock: 88,
    checkers: "",
    movetimeOverride: 80,
  });

  assert.equal(fixed.movetime, 80);
  assert.equal(fixed.phase, "override");
});

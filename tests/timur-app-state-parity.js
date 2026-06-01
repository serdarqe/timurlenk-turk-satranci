const fs = require("fs");
const path = require("path");

const publicDir = path.resolve(
  __dirname,
  "..",
  "engines",
  "fairy-stockfish-singlethread-wasm"
);
const fixturesPath = path.resolve(__dirname, "fixtures", "app-game-state-parity.json");

const Stockfish = require(path.join(publicDir, "stockfish.js"));
const wasmBinary = fs.readFileSync(path.join(publicDir, "stockfish.wasm"));

const FILES = "abcdefghijk";
const PIECE_TO_FEN = {
  king: "k",
  prince: "q",
  adventitious_king: "a",
  rook: "r",
  knight: "n",
  pawn: "p",
  vizier: "v",
  general: "g",
  elephant: "e",
  dabbaba: "d",
  camel: "c",
  sea_monster: "s",
  lion: "l",
  bull: "b",
  revealer: "h",
  picket: "t",
  giraffe: "z",
};

function assertFixturesFileExists() {
  if (!fs.existsSync(fixturesPath)) {
    throw new Error(`Missing app parity fixtures: ${fixturesPath}`);
  }
}

function appColorToFenPiece(color, type) {
  const fen = PIECE_TO_FEN[type];
  if (!fen) throw new Error(`Unsupported app piece type: ${type}`);
  return color === "white" ? fen.toUpperCase() : fen;
}

function appSnapshotToFen(snapshot) {
  const board = Array.from({ length: 10 }, () => Array(11).fill(null));
  for (const piece of snapshot?.board?.pieces || []) {
    if (!Number.isInteger(piece.row) || !Number.isInteger(piece.col)) {
      throw new Error(`Invalid app piece coordinates in ${JSON.stringify(piece)}`);
    }
    if (piece.row < 0 || piece.row > 9 || piece.col < 0 || piece.col > 10) {
      continue;
    }
    board[piece.row][piece.col] = appColorToFenPiece(piece.color, piece.type);
  }

  const rows = board.map((row) => {
    let out = "";
    let empty = 0;
    for (const cell of row) {
      if (!cell) {
        empty += 1;
        continue;
      }
      if (empty) {
        out += String(empty);
        empty = 0;
      }
      out += cell;
    }
    if (empty) out += String(empty);
    return out;
  });

  const side = snapshot.currentTurn === "black" ? "b" : "w";
  return `${rows.join("/")} ${side} - - 0 1`;
}

function parsePerftMoves(lines) {
  return lines
    .map((line) => String(line).trim())
    .map((line) => line.match(/^(.+):\s+\d+$/))
    .filter(Boolean)
    .map((match) => match[1].toLowerCase());
}

async function createEngine() {
  const sf = await Stockfish({ wasmBinary });
  const messages = [];
  sf.addMessageListener((message) => messages.push(String(message)));
  const send = (command) => sf.postMessage(command);
  const waitFor = (predicate, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const joined = messages.join("\n");
        if (predicate(joined, messages)) {
          clearInterval(timer);
          resolve([...messages]);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error(`Timed out waiting after ${timeoutMs}ms`));
        }
      }, 20);
    });

  send("uci");
  await waitFor((joined) => joined.includes("uciok"));
  send("setoption name UCI_Variant value timur");
  send("isready");
  await waitFor((joined) => joined.includes("readyok"));

  return {
    async perftMoves(fen, moves = []) {
      messages.length = 0;
      send(`position fen ${fen}${moves.length ? ` moves ${moves.join(" ")}` : ""}`);
      send("go perft 1");
      const lines = await waitFor((joined) => joined.includes("Nodes searched"));
      return parsePerftMoves(lines);
    },
    quit() {
      send("quit");
    },
  };
}

(async () => {
  assertFixturesFileExists();
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
  const engine = await createEngine();
  let failures = 0;

  for (const fixture of fixtures) {
    const fen = appSnapshotToFen(fixture.appSnapshot);
    const fenMatches = !fixture.expectedFen || fixture.expectedFen === fen;
    const actual = await engine.perftMoves(fen, fixture.moveHistoryUci || []);
    const missing = (fixture.expectedNativeRootMoves || [])
      .map((move) => move.toLowerCase())
      .filter((move) => !actual.includes(move));
    const forbidden = (fixture.forbiddenNativeRootMoves || [])
      .map((move) => move.toLowerCase())
      .filter((move) => actual.includes(move));
    const ok = fenMatches && missing.length === 0 && forbidden.length === 0;

    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${fixture.id}`);
    if (!ok) {
      console.log(`  fen: ${fen}`);
      if (!fenMatches) console.log(`  expected fen: ${fixture.expectedFen}`);
      if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
      if (forbidden.length) console.log(`  forbidden present: ${forbidden.join(", ")}`);
      console.log(`  actual: ${actual.join(", ")}`);
    }
  }

  engine.quit();
  if (failures) process.exit(1);
})();

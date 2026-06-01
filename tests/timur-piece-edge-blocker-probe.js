const fs = require("fs");
const path = require("path");

const publicDir = path.resolve(
  __dirname,
  "..",
  "engines",
  "fairy-stockfish-singlethread-wasm"
);

const Stockfish = require(path.join(publicDir, "stockfish.js"));
const wasmBinary = fs.readFileSync(path.join(publicDir, "stockfish.wasm"));

const files = "abcdefghijk";

function squareToIndex(square) {
  const file = files.indexOf(square[0]);
  const rank = Number(square.slice(1));
  if (file < 0 || rank < 1 || rank > 10)
    throw new Error(`Invalid square: ${square}`);
  return { file, row: 10 - rank };
}

function fenFromPieces(pieces, side = "w") {
  const board = Array.from({ length: 10 }, () => Array(11).fill(null));
  for (const { piece, square } of pieces) {
    const { file, row } = squareToIndex(square);
    if (board[row][file])
      throw new Error(`Duplicate square in fixture: ${square}`);
    board[row][file] = piece;
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
    return out + (empty ? String(empty) : "");
  });

  return `${rows.join("/")} ${side} - - 0 1`;
}

function piecesFromFen(fen) {
  const [boardPart] = fen.split(" ");
  const pieces = [];
  const rows = boardPart.split("/");
  for (let row = 0; row < rows.length; row += 1) {
    let file = 0;
    for (let i = 0; i < rows[row].length; i += 1) {
      const char = rows[row][i];
      if (/\d/.test(char)) {
        let digits = char;
        while (i + 1 < rows[row].length && /\d/.test(rows[row][i + 1])) {
          i += 1;
          digits += rows[row][i];
        }
        file += Number(digits);
        continue;
      }
      pieces.push({
        piece: char,
        square: `${files[file]}${10 - row}`,
      });
      file += 1;
    }
  }
  return pieces;
}

function withRoyals(piece, square, side = "w") {
  const pieces = [{ piece, square }];
  if (side === "w") {
    if (!["K", "Q", "A"].includes(piece))
      pieces.push({ piece: "K", square: "f5" });
    pieces.push({ piece: "k", square: "k10" });
  } else {
    if (!["k", "q", "a"].includes(piece))
      pieces.push({ piece: "k", square: "f6" });
    pieces.push({ piece: "K", square: "k1" });
  }
  return pieces;
}

function mirrorSquare(square) {
  const file = square[0];
  const rank = Number(square.slice(1));
  return `${file}${11 - rank}`;
}

function mirrorMove(move) {
  const match = move.match(/^([a-k](?:10|[1-9]))([a-k](?:10|[1-9]))(.*)$/);
  if (!match)
    throw new Error(`Unsupported move format for mirror: ${move}`);
  return `${mirrorSquare(match[1])}${mirrorSquare(match[2])}${match[3] || ""}`;
}

function swapPieceColor(piece) {
  return piece === piece.toUpperCase() ? piece.toLowerCase() : piece.toUpperCase();
}

function mirrorFenForBlack(fen) {
  const pieces = piecesFromFen(fen).map(({ piece, square }) => ({
    piece: swapPieceColor(piece),
    square: mirrorSquare(square),
  }));
  return fenFromPieces(pieces, "b");
}

function mirrorCaseForBlack(test) {
  return {
    ...test,
    name: `black mirror: ${test.name}`,
    from: mirrorSquare(test.from),
    fen: mirrorFenForBlack(test.fen),
    moves: test.moves.map(mirrorMove),
  };
}

function sortMoves(moves) {
  return [...moves].sort((a, b) => a.localeCompare(b));
}

function sameSet(actual, expected) {
  const a = sortMoves(actual);
  const e = sortMoves(expected);
  return a.length === e.length && a.every((move, i) => move === e[i]);
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
          resolve(joined);
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
    async perftMoves(fen, from) {
      messages.length = 0;
      send(`position fen ${fen}`);
      send("go perft 1");
      await waitFor((joined) => joined.includes("Nodes searched"));
      return messages
        .filter((line) => line.startsWith(from))
        .map((line) => line.split(":")[0]);
    },
    quit() {
      send("quit");
    },
  };
}

const edgeCases = [
  {
    name: "white pawn edge file",
    from: "a1",
    fen: fenFromPieces(withRoyals("P", "a1")),
    moves: ["a1a2"],
  },
  {
    name: "black pawn edge file",
    from: "a10",
    fen: fenFromPieces(withRoyals("p", "a10", "b"), "b"),
    moves: ["a10a9"],
  },
  {
    name: "knight corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("N", "a1")),
    moves: ["a1b3", "a1c2"],
  },
  {
    name: "rook corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("R", "a1")),
    moves: [
      "a1a2", "a1a3", "a1a4", "a1a5", "a1a6", "a1a7", "a1a8", "a1a9", "a1a10",
      "a1b1", "a1c1", "a1d1", "a1e1", "a1f1", "a1g1", "a1h1", "a1i1", "a1j1", "a1k1",
    ],
  },
  {
    name: "king corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("K", "a1")),
    moves: ["a1a2", "a1b1", "a1b2"],
  },
  {
    name: "vizier corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("V", "a1")),
    moves: ["a1a2", "a1b1"],
  },
  {
    name: "general corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("G", "a1")),
    moves: ["a1b2"],
  },
  {
    name: "elephant corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("E", "a1")),
    moves: ["a1c3"],
  },
  {
    name: "dabbaba corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("D", "a1")),
    moves: ["a1a3", "a1c1"],
  },
  {
    name: "camel corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("C", "a1")),
    moves: ["a1b4", "a1d2"],
  },
  {
    name: "sea monster corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("S", "a1")),
    moves: ["a1a2", "a1b1"],
  },
  {
    name: "lion corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("L", "a1")),
    moves: ["a1a4", "a1d1"],
  },
  {
    name: "bull corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("B", "a1")),
    moves: ["a1c4", "a1d3"],
  },
  {
    name: "revealer corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("H", "a1")),
    moves: ["a1d4"],
  },
  {
    name: "prince corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("Q", "a1")),
    moves: ["a1a2", "a1b1", "a1b2"],
  },
  {
    name: "adventitious king corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("A", "a1")),
    moves: ["a1a2", "a1b1", "a1b2"],
  },
  {
    name: "picket corner excludes one-square diagonal",
    from: "a1",
    fen: fenFromPieces(withRoyals("T", "a1")),
    moves: ["a1c3", "a1d4", "a1e5", "a1f6", "a1g7", "a1h8", "a1i9", "a1j10"],
  },
  {
    name: "giraffe corner",
    from: "a1",
    fen: fenFromPieces(withRoyals("Z", "a1")),
    moves: [
      "a1b5", "a1b6", "a1b7", "a1b8", "a1b9", "a1b10",
      "a1e2", "a1f2", "a1g2", "a1h2", "a1i2", "a1j2", "a1k2",
    ],
  },
];

const blockerCases = [
  {
    name: "pawn cannot move into an occupied forward square",
    from: "f5",
    fen: fenFromPieces([
      { piece: "P", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "f6" },
    ]),
    moves: [],
  },
  {
    name: "pawn cannot capture a forward enemy piece",
    from: "f5",
    fen: fenFromPieces([
      { piece: "P", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "p", square: "f6" },
    ]),
    moves: [],
  },
  {
    name: "pawn can advance and capture diagonal enemy pieces",
    from: "f5",
    fen: fenFromPieces([
      { piece: "P", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "p", square: "e6" },
      { piece: "p", square: "g6" },
    ]),
    moves: ["f5e6", "f5f6", "f5g6"],
  },
  {
    name: "rook stops at own blockers and can capture first enemy",
    from: "f5",
    fen: fenFromPieces([
      { piece: "R", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "f7" },
      { piece: "P", square: "h5" },
      { piece: "p", square: "f3" },
      { piece: "p", square: "d5" },
    ]),
    moves: ["f5d5", "f5e5", "f5f3", "f5f4", "f5f6", "f5g5"],
  },
  {
    name: "king blocks own landings, captures enemy, and avoids attacked squares",
    from: "f5",
    fen: fenFromPieces([
      { piece: "K", square: "f5" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e5" },
      { piece: "p", square: "g5" },
    ]),
    moves: ["f5e4", "f5e6", "f5f6", "f5g4", "f5g5", "f5g6"],
  },
  {
    name: "prince blocks own landings and captures enemy landings",
    from: "f5",
    fen: fenFromPieces([
      { piece: "Q", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e5" },
      { piece: "p", square: "g5" },
    ]),
    moves: ["f5e4", "f5e6", "f5f4", "f5f6", "f5g4", "f5g5", "f5g6"],
  },
  {
    name: "adventitious king blocks own landings and captures enemy landings",
    from: "f5",
    fen: fenFromPieces([
      { piece: "A", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e5" },
      { piece: "p", square: "g5" },
    ]),
    moves: ["f5e4", "f5e6", "f5f4", "f5f6", "f5g4", "f5g5", "f5g6"],
  },
  {
    name: "picket stops at diagonal blockers and can capture first enemy",
    from: "f5",
    fen: fenFromPieces([
      { piece: "T", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "h7" },
      { piece: "P", square: "d3" },
      { piece: "p", square: "d7" },
      { piece: "p", square: "h3" },
    ]),
    moves: ["f5d7", "f5h3"],
  },
  {
    name: "giraffe first diagonal step blockers suppress only those directions",
    from: "f5",
    fen: fenFromPieces([
      { piece: "Z", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e6" },
      { piece: "P", square: "g6" },
    ]),
    moves: ["f5a4", "f5b4", "f5e1", "f5g1", "f5j4", "f5k4"],
  },
  {
    name: "knight ignores path blockers but cannot land on own piece",
    from: "f5",
    fen: fenFromPieces([
      { piece: "N", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "d4" },
      { piece: "P", square: "f6" },
      { piece: "p", square: "h6" },
    ]),
    moves: ["f5d6", "f5e3", "f5e7", "f5g3", "f5g7", "f5h4", "f5h6"],
  },
  {
    name: "elephant jumps over midpoint blockers but cannot land on own piece",
    from: "f5",
    fen: fenFromPieces([
      { piece: "E", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e6" },
      { piece: "P", square: "d7" },
      { piece: "p", square: "h7" },
    ]),
    moves: ["f5d3", "f5h3", "f5h7"],
  },
  {
    name: "dabbaba jumps over blockers but cannot land on own piece",
    from: "f5",
    fen: fenFromPieces([
      { piece: "D", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "f6" },
      { piece: "P", square: "f7" },
      { piece: "p", square: "h5" },
    ]),
    moves: ["f5d5", "f5f3", "f5h5"],
  },
  {
    name: "camel captures landing piece and ignores path blockers",
    from: "f5",
    fen: fenFromPieces([
      { piece: "C", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "c4" },
      { piece: "P", square: "f6" },
      { piece: "p", square: "i6" },
    ]),
    moves: ["f5c6", "f5e2", "f5e8", "f5g2", "f5g8", "f5i4", "f5i6"],
  },
  {
    name: "one-step orthogonal pieces block own landings and capture enemy landings",
    from: "f5",
    fen: fenFromPieces([
      { piece: "V", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e5" },
      { piece: "p", square: "g5" },
    ]),
    moves: ["f5f4", "f5f6", "f5g5"],
  },
  {
    name: "sea monster blocks own landings and captures enemy landings",
    from: "f5",
    fen: fenFromPieces([
      { piece: "S", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e5" },
      { piece: "p", square: "g5" },
    ]),
    moves: ["f5f4", "f5f6", "f5g5"],
  },
  {
    name: "one-step diagonal pieces block own landings and capture enemy landings",
    from: "f5",
    fen: fenFromPieces([
      { piece: "G", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "e4" },
      { piece: "p", square: "g6" },
    ]),
    moves: ["f5e6", "f5g4", "f5g6"],
  },
  {
    name: "lion jumps to fixed range, blocks own landing, and captures enemy landing",
    from: "f5",
    fen: fenFromPieces([
      { piece: "L", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "f8" },
      { piece: "p", square: "i5" },
    ]),
    moves: ["f5c5", "f5f2", "f5i5"],
  },
  {
    name: "bull jumps to fixed range, blocks own landing, and captures enemy landing",
    from: "f5",
    fen: fenFromPieces([
      { piece: "B", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "c3" },
      { piece: "p", square: "i7" },
    ]),
    moves: ["f5c7", "f5d2", "f5d8", "f5h2", "f5h8", "f5i3", "f5i7"],
  },
  {
    name: "revealer jumps to fixed diagonal range, blocks own landing, and captures enemy landing",
    from: "f5",
    fen: fenFromPieces([
      { piece: "H", square: "f5" },
      { piece: "K", square: "a1" },
      { piece: "k", square: "k10" },
      { piece: "P", square: "c2" },
      { piece: "p", square: "i8" },
    ]),
    moves: ["f5c8", "f5i2", "f5i8"],
  },
];

const blackMirrorCases = [...edgeCases, ...blockerCases]
  .filter((test) => !test.name.startsWith("black "))
  .map(mirrorCaseForBlack);

(async () => {
  const engine = await createEngine();
  let failures = 0;
  for (const test of [...edgeCases, ...blockerCases, ...blackMirrorCases]) {
    const actual = await engine.perftMoves(test.fen, test.from);
    const ok = sameSet(actual, test.moves);
    if (!ok)
      failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${test.name}`);
    if (!ok) {
      console.log(`  expected: ${sortMoves(test.moves).join(" ")}`);
      console.log(`  actual:   ${sortMoves(actual).join(" ")}`);
      console.log(`  fen:      ${test.fen}`);
    }
  }
  engine.quit();
  process.exitCode = failures ? 1 : 0;
})();

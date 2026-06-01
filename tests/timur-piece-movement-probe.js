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

function fenFor(piece, side = "w", rank = 5) {
  const rows = Array(10).fill("11");
  rows[1] = side === "w" ? "10k" : "K10";
  rows[10 - rank] = `5${piece}5`;
  rows[9] = side === "w" && piece !== "K" ? "K10" : rows[9];
  rows[0] = side === "b" && piece !== "k" ? "10k" : rows[0];
  return `${rows.join("/")} ${side} - - 0 1`;
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

const expected = [
  { name: "white pawn", piece: "P", from: "f5", fen: fenFor("P"), moves: ["f5f6"] },
  { name: "black pawn", piece: "p", from: "f6", fen: fenFor("p", "b", 6), moves: ["f6f5"] },
  {
    name: "knight",
    piece: "N",
    from: "f5",
    fen: fenFor("N"),
    moves: ["f5d4", "f5d6", "f5e3", "f5e7", "f5g3", "f5g7", "f5h4", "f5h6"],
  },
  {
    name: "rook",
    piece: "R",
    from: "f5",
    fen: fenFor("R"),
    moves: [
      "f5a5", "f5b5", "f5c5", "f5d5", "f5e5",
      "f5g5", "f5h5", "f5i5", "f5j5", "f5k5",
      "f5f1", "f5f2", "f5f3", "f5f4", "f5f6", "f5f7", "f5f8", "f5f9", "f5f10",
    ],
  },
  {
    name: "king",
    piece: "K",
    from: "f5",
    fen: fenFor("K"),
    moves: ["f5e4", "f5e5", "f5e6", "f5f4", "f5f6", "f5g4", "f5g5", "f5g6"],
  },
  {
    name: "vizier",
    piece: "V",
    from: "f5",
    fen: fenFor("V"),
    moves: ["f5e5", "f5f4", "f5f6", "f5g5"],
  },
  {
    name: "general",
    piece: "G",
    from: "f5",
    fen: fenFor("G"),
    moves: ["f5e4", "f5e6", "f5g4", "f5g6"],
  },
  {
    name: "elephant",
    piece: "E",
    from: "f5",
    fen: fenFor("E"),
    moves: ["f5d3", "f5d7", "f5h3", "f5h7"],
  },
  {
    name: "dabbaba",
    piece: "D",
    from: "f5",
    fen: fenFor("D"),
    moves: ["f5d5", "f5f3", "f5f7", "f5h5"],
  },
  {
    name: "camel",
    piece: "C",
    from: "f5",
    fen: fenFor("C"),
    moves: ["f5c4", "f5c6", "f5e2", "f5e8", "f5g2", "f5g8", "f5i4", "f5i6"],
  },
  {
    name: "sea monster",
    piece: "S",
    from: "f5",
    fen: fenFor("S"),
    moves: ["f5e5", "f5f4", "f5f6", "f5g5"],
  },
  {
    name: "lion",
    piece: "L",
    from: "f5",
    fen: fenFor("L"),
    moves: ["f5c5", "f5f2", "f5f8", "f5i5"],
  },
  {
    name: "bull",
    piece: "B",
    from: "f5",
    fen: fenFor("B"),
    moves: ["f5c3", "f5c7", "f5d2", "f5d8", "f5h2", "f5h8", "f5i3", "f5i7"],
  },
  {
    name: "revealer",
    piece: "H",
    from: "f5",
    fen: fenFor("H"),
    moves: ["f5c2", "f5c8", "f5i2", "f5i8"],
  },
  {
    name: "prince",
    piece: "Q",
    from: "f5",
    fen: fenFor("Q"),
    moves: ["f5e4", "f5e5", "f5e6", "f5f4", "f5f6", "f5g4", "f5g5", "f5g6"],
  },
  {
    name: "adventitious king",
    piece: "A",
    from: "f5",
    fen: fenFor("A"),
    moves: ["f5e4", "f5e5", "f5e6", "f5f4", "f5f6", "f5g4", "f5g5", "f5g6"],
  },
  {
    name: "picket",
    piece: "T",
    from: "f5",
    fen: fenFor("T"),
    moves: [
      "f5a10", "f5b1", "f5b9", "f5c2", "f5c8", "f5d3", "f5d7",
      "f5h3", "f5h7", "f5i2", "f5i8", "f5j1", "f5j9", "f5k10",
    ],
  },
  {
    name: "giraffe",
    piece: "Z",
    from: "f5",
    fen: fenFor("Z"),
    moves: [
      "f5a4", "f5a6", "f5b4", "f5b6", "f5e1", "f5e9", "f5e10",
      "f5g1", "f5g9", "f5g10", "f5j4", "f5j6", "f5k4", "f5k6",
    ],
  },
];

(async () => {
  const engine = await createEngine();
  let failures = 0;
  for (const test of expected) {
    const actual = await engine.perftMoves(test.fen, test.from);
    const ok = sameSet(actual, test.moves);
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${test.name} (${test.piece})`);
    if (!ok) {
      console.log(`  expected: ${sortMoves(test.moves).join(" ")}`);
      console.log(`  actual:   ${sortMoves(actual).join(" ")}`);
    }
  }
  engine.quit();
  process.exitCode = failures ? 1 : 0;
})();

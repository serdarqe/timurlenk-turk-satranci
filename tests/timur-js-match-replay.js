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

const PIECE_TO_PROMOTION = {
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

function parseArgs(argv) {
  const args = {
    matchesDir: process.env.TIMUR_REPLAY_MATCH_DIR || "",
    limit: 0,
    maxMoves: 0,
    report: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--matches") args.matchesDir = argv[++i] || "";
    else if (arg === "--limit") args.limit = Number(argv[++i] || 0);
    else if (arg === "--max-moves") args.maxMoves = Number(argv[++i] || 0);
    else if (arg === "--report") args.report = argv[++i] || "";
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return args;
}

function printUsage() {
  console.log(`
Usage:
  node tests/timur-js-match-replay.js --matches "<match-json-folder>" [--limit 10] [--max-moves 80] [--report replay.json]

Purpose:
  Replays old JS-engine AI-vs-AI match records through the native/Fairy Timur move generator.
  The recorded moves are test data, not an opponent. A mismatch means the native engine and JS
  rules disagree at that position.
`);
}

function assertMatchesDir(matchesDir) {
  if (!matchesDir) {
    printUsage();
    throw new Error("Missing --matches path or TIMUR_REPLAY_MATCH_DIR.");
  }
  if (!fs.existsSync(matchesDir)) {
    throw new Error(`Matches folder does not exist: ${matchesDir}`);
  }
}

function jsonFiles(matchesDir, limit) {
  const files = fs
    .readdirSync(matchesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => path.join(matchesDir, file));
  return limit > 0 ? files.slice(0, limit) : files;
}

function parseRootMoves(lines) {
  return lines
    .map((line) => String(line).trim())
    .map((line) => line.match(/^(.+):\s+\d+$/))
    .filter(Boolean)
    .map((match) => match[1].toLowerCase());
}

function recordedBaseMove(move) {
  const from = move?.from?.label;
  const to = move?.to?.label;
  if (!from || !to) {
    throw new Error(`Move record is missing from/to labels: ${JSON.stringify(move)}`);
  }
  return `${from}${to}`.toLowerCase();
}

function expectedPromotionSuffix(move) {
  const before = move?.piece?.typeBefore;
  const after = move?.piece?.typeAfter;
  if (!before || !after || before === after) return "";
  if (before !== "pawn") return "";
  return PIECE_TO_PROMOTION[after] || "";
}

function matchRecordedMove(rootMoves, move) {
  const base = recordedBaseMove(move);
  const suffix = expectedPromotionSuffix(move);
  const exactPromotion = suffix ? `${base}${suffix}` : "";

  if (exactPromotion && rootMoves.includes(exactPromotion)) {
    return { ok: true, appendMove: exactPromotion, matchedRootMove: exactPromotion };
  }
  if (rootMoves.includes(base)) {
    return { ok: true, appendMove: base, matchedRootMove: base };
  }

  if (move.specialMoveType === "royal_swap") {
    const token = rootMoves.find((candidate) => candidate.startsWith(`royal_swap:${move.from.label.toLowerCase()}:${move.to.label.toLowerCase()}@`));
    if (token) {
      return { ok: true, appendMove: base, matchedRootMove: token };
    }
  }

  const promotionCandidates = rootMoves.filter((candidate) => candidate.startsWith(base));
  if (promotionCandidates.length === 1) {
    return {
      ok: true,
      appendMove: promotionCandidates[0],
      matchedRootMove: promotionCandidates[0],
      warning: suffix ? "" : "accepted_single_promotion_candidate",
    };
  }

  return {
    ok: false,
    appendMove: base,
    matchedRootMove: null,
    nearby: rootMoves.filter((candidate) => candidate.startsWith(base.slice(0, 3))).slice(0, 12),
  };
}

async function createEngine() {
  const sf = await Stockfish({ wasmBinary });
  const messages = [];
  sf.addMessageListener((message) => messages.push(String(message)));
  const send = (command) => sf.postMessage(command);
  const waitFor = (predicate, timeoutMs = 10000) =>
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
    async rootMoves(appliedMoves) {
      messages.length = 0;
      send(`position startpos${appliedMoves.length ? ` moves ${appliedMoves.join(" ")}` : ""}`);
      send("go perft 1");
      const lines = await waitFor((joined) => joined.includes("Nodes searched"));
      return parseRootMoves(lines);
    },
    quit() {
      send("quit");
    },
  };
}

async function replayMatch(engine, file, maxMoves) {
  const match = JSON.parse(fs.readFileSync(file, "utf8"));
  const appliedMoves = [];
  const failures = [];
  const warnings = [];
  const moves = maxMoves > 0 ? (match.moves || []).slice(0, maxMoves) : (match.moves || []);

  for (const move of moves) {
    const rootMoves = await engine.rootMoves(appliedMoves);
    const matched = matchRecordedMove(rootMoves, move);

    if (!matched.ok) {
      failures.push({
        index: move.index,
        moveNumber: move.moveNumber,
        color: move.color,
        notation: move.notation,
        expected: matched.appendMove,
        specialMoveType: move.specialMoveType || null,
        piece: move.piece || null,
        legalRootMoveSample: rootMoves.slice(0, 30),
        nearby: matched.nearby,
      });
      break;
    }

    if (matched.warning) {
      warnings.push({
        index: move.index,
        notation: move.notation,
        warning: matched.warning,
        matchedRootMove: matched.matchedRootMove,
      });
    }
    appliedMoves.push(matched.appendMove);
  }

  return {
    file: path.basename(file),
    id: match.id || path.basename(file, ".json"),
    scenario: match.scenario || null,
    resultType: match.resultType || null,
    winner: match.winner || null,
    recordedMoveCount: match.moveCount || (match.moves || []).length,
    replayedMoveCount: appliedMoves.length,
    ok: failures.length === 0,
    failures,
    warnings,
  };
}

function summarize(results) {
  const failed = results.filter((result) => !result.ok);
  const replayedMoves = results.reduce((sum, result) => sum + result.replayedMoveCount, 0);
  const resultTypes = {};
  for (const result of results) {
    const key = result.resultType || "unknown";
    resultTypes[key] = (resultTypes[key] || 0) + 1;
  }
  return {
    matches: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    replayedMoves,
    resultTypes,
  };
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  assertMatchesDir(args.matchesDir);

  const files = jsonFiles(args.matchesDir, args.limit);
  if (!files.length) {
    throw new Error(`No .json match files found in ${args.matchesDir}`);
  }

  const engine = await createEngine();
  const results = [];

  try {
    for (const [index, file] of files.entries()) {
      const result = await replayMatch(engine, file, args.maxMoves);
      results.push(result);
      console.log(
        `${result.ok ? "PASS" : "FAIL"} ${index + 1}/${files.length} ${result.file} ` +
          `(${result.replayedMoveCount}/${result.recordedMoveCount})`
      );
      if (!result.ok) {
        const failure = result.failures[0];
        console.log(`  first mismatch: #${failure.index} ${failure.color} ${failure.notation} expected ${failure.expected}`);
        console.log(`  nearby: ${(failure.nearby || []).join(", ") || "-"}`);
      }
    }
  } finally {
    engine.quit();
  }

  const summary = summarize(results);
  console.log("\n=== JS match replay summary ===");
  console.log(JSON.stringify(summary, null, 2));

  if (args.report) {
    const reportPath = path.resolve(args.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ summary, results }, null, 2));
    console.log(`Report written: ${reportPath}`);
  }

  if (summary.failed > 0) {
    process.exit(1);
  }
})();

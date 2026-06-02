import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = path.join(repoRoot, "engines", "fairy-stockfish-singlethread-wasm");
const Stockfish = require(path.join(engineDir, "stockfish.js"));
const wasmBinary = fs.readFileSync(path.join(engineDir, "stockfish.wasm"));

const LEVELS = {
  easy: { label: "easy", depth: 1, movetime: 30 },
  medium: { label: "medium", depth: 2, movetime: 80 },
  hard: { label: "hard", depth: 3, movetime: 150 },
};

function parseArgs(argv) {
  const args = {
    preset: "smoke",
    games: 0,
    maxMoves: 120,
    openingPlies: 2,
    depth: 0,
    movetime: 0,
    hash: 256,
    outDir: "",
    trackKeys: true,
    stopOnOptionalDraw: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--preset") args.preset = argv[++i] || args.preset;
    else if (arg === "--games") args.games = Number(argv[++i] || 0);
    else if (arg === "--max-moves") args.maxMoves = Number(argv[++i] || args.maxMoves);
    else if (arg === "--opening-plies") args.openingPlies = Number(argv[++i] || args.openingPlies);
    else if (arg === "--depth") args.depth = Number(argv[++i] || 0);
    else if (arg === "--movetime") args.movetime = Number(argv[++i] || 0);
    else if (arg === "--hash") args.hash = Number(argv[++i] || 0);
    else if (arg === "--out") args.outDir = argv[++i] || "";
    else if (arg === "--no-track-keys") args.trackKeys = false;
    else if (arg === "--play-optional-draws") args.stopOnOptionalDraw = false;
    else if (arg === "--stop-on-optional-draw") args.stopOnOptionalDraw = true;
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!["smoke", "standard", "full"].includes(args.preset)) {
    throw new Error(`Unknown preset: ${args.preset}`);
  }

  return args;
}

function printUsage() {
  console.log(`
Usage:
  npm run wasm-ai:smoke
  npm run wasm-ai:standard -- --max-moves 280
  node scripts/run-wasm-ai-vs-ai.mjs --preset full --max-moves 280 --out reports/wasm-ai-run

What it validates:
  - WASM bestmove is legal at every ply via native perft-1 root moves.
  - Special Timur channels are normalized for play: citadel_exchange, royal_swap, pawn_cycle.
  - Draw endings are separated: threefold, fifty_move, citadel_draw, stalemate, max_moves.
  - Optional citadel draws are played through by default for AI-quality testing.
  - Performance is recorded per move: elapsed ms, root move count, search score/depth/nodes.
`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseRootMoves(lines) {
  return lines
    .map((line) => String(line).trim())
    .map((line) => line.match(/^(.+):\s+\d+$/))
    .filter(Boolean)
    .map((match) => match[1].toLowerCase())
    .filter((move) => move !== "nodes searched");
}

function parseBestMove(lines) {
  const bestLine = [...lines].reverse().find((line) => /^bestmove\s+/i.test(String(line).trim()));
  if (!bestLine) return "";
  return bestLine.trim().split(/\s+/)[1]?.toLowerCase() || "";
}

function parseSearchInfo(lines) {
  const infoLines = lines.map(String).filter((line) => line.startsWith("info "));
  const lastPv = [...infoLines].reverse().find((line) => /\bscore\b/.test(line)) || "";
  const depth = Number(lastPv.match(/\bdepth\s+(-?\d+)/)?.[1] || 0);
  const nodes = Number(lastPv.match(/\bnodes\s+(\d+)/)?.[1] || 0);
  const nps = Number(lastPv.match(/\bnps\s+(\d+)/)?.[1] || 0);
  const scoreCp = lastPv.match(/\bscore\s+cp\s+(-?\d+)/)?.[1];
  const scoreMate = lastPv.match(/\bscore\s+mate\s+(-?\d+)/)?.[1];
  return {
    depth,
    nodes,
    nps,
    score: scoreMate !== undefined ? { type: "mate", value: Number(scoreMate) }
      : scoreCp !== undefined ? { type: "cp", value: Number(scoreCp) }
      : null,
    raw: lastPv,
  };
}

function parseDump(lines) {
  const joined = lines.join("\n");
  const fen = joined.match(/^Fen:\s+(.+)$/m)?.[1]?.trim() || "";
  const key = joined.match(/^Key:\s+([A-Fa-f0-9]+)$/m)?.[1]?.trim() || "";
  const checkers = joined.match(/^Checkers:\s*(.*)$/m)?.[1]?.trim() || "";
  const parts = fen.split(/\s+/);
  return {
    fen,
    key,
    checkers,
    sideToMove: parts[1] || "",
    halfmoveClock: Number(parts[4] || 0),
    fullmoveNumber: Number(parts[5] || 0),
  };
}

function countPiecesFromFen(fen) {
  const placement = String(fen || "").split(/\s+/)[0] || "";
  let white = 0;
  let black = 0;
  for (const ch of placement) {
    if (/[A-Z]/.test(ch)) white += 1;
    else if (/[a-z]/.test(ch)) black += 1;
  }
  return { white, black, total: white + black };
}

function finishModeConfig(baseConfig, dump, ply) {
  const pieces = countPiecesFromFen(dump?.fen || "");
  const halfmoveClock = Number(dump?.halfmoveClock || 0);
  const endgame = pieces.total > 0 && pieces.total <= 12;
  const criticalEndgame = pieces.total > 0 && pieces.total <= 8;
  const lateGame = ply >= 220;
  const lowProgress = halfmoveClock >= 60;

  if (!endgame && !criticalEndgame && !lateGame && !lowProgress) {
    return { ...baseConfig, finishMode: false, pieces };
  }

  const levelFloor = {
    easy: criticalEndgame ? 60 : 45,
    medium: criticalEndgame ? 160 : 120,
    hard: criticalEndgame ? 300 : 220,
  };
  const floor = levelFloor[baseConfig.label] || baseConfig.movetime || 0;
  const lateBonus = lateGame ? 40 : 0;
  const progressBonus = lowProgress ? 40 : 0;
  const movetime = baseConfig.movetime > 0
    ? Math.min(420, Math.max(baseConfig.movetime, floor + lateBonus + progressBonus))
    : 0;

  return {
    ...baseConfig,
    movetime,
    depth: baseConfig.depth + (criticalEndgame ? 2 : endgame ? 1 : 0),
    finishMode: true,
    finishReasons: {
      endgame,
      criticalEndgame,
      lateGame,
      lowProgress,
    },
    pieces,
  };
}

function normalizeSpecialBestMove(bestmove) {
  let match = bestmove.match(/^citadel_exchange:([^:]+):([^@]+)@/);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();

  match = bestmove.match(/^royal_swap:([^:]+):([^@]+)@/);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();

  match = bestmove.match(/^pawn_cycle:([^:]+):([^@]+)@/);
  if (match) return `${match[1]}${match[2]}`.toLowerCase();

  return bestmove;
}

function isRootMoveLegal(rootMoves, bestmove, appendMove) {
  if (rootMoves.includes(bestmove)) return true;
  if (rootMoves.includes(appendMove)) return true;
  return rootMoves.some((move) => normalizeSpecialBestMove(move) === appendMove);
}

function optionalCitadelToken(rootMoves) {
  return rootMoves.find((move) => move === "a10@blackcitadel" || move === "k1@whitecitadel") || "";
}

function chooseOpeningMove(rootMoves, gameIndex, ply) {
  const playable = rootMoves.filter((move) => !move.includes("@") || move.startsWith("citadel_exchange:") || move.startsWith("royal_swap:") || move.startsWith("pawn_cycle:"));
  if (!playable.length) return "";
  return playable[(gameIndex + ply) % playable.length];
}

function chooseDrawAvoidanceMove(rootMoves, gameIndex, ply) {
  const playable = rootMoves.filter((move) => {
    if (move === "a10@blackcitadel" || move === "k1@whitecitadel") return false;
    return !move.includes("@") || move.startsWith("citadel_exchange:") || move.startsWith("royal_swap:") || move.startsWith("pawn_cycle:");
  });
  if (!playable.length) return "";
  return playable[(gameIndex * 7 + ply) % playable.length];
}

function sideConfig(scenario, color, args) {
  const config = scenario[color];
  return {
    ...config,
    depth: args.depth > 0 ? args.depth : config.depth,
    movetime: args.movetime > 0 ? args.movetime : config.movetime,
  };
}

function buildScenarios(args) {
  const pairs = args.preset === "smoke"
    ? [
        ["easy", "easy"],
        ["easy", "hard"],
        ["hard", "easy"],
        ["hard", "hard"],
      ]
    : Object.keys(LEVELS).flatMap((white) => Object.keys(LEVELS).map((black) => [white, black]));

  const defaultOpeningOffsetCount = args.preset === "full" ? 4 : args.preset === "standard" ? 2 : 1;
  const requestedOpeningOffsetCount = args.games > 0 ? Math.ceil(args.games / pairs.length) : defaultOpeningOffsetCount;
  const openingOffsetCount = Math.max(defaultOpeningOffsetCount, requestedOpeningOffsetCount);
  const openingOffsets = Array.from({ length: openingOffsetCount }, (_, index) => index);
  const scenarios = [];

  for (const offset of openingOffsets) {
    for (const [whiteLevel, blackLevel] of pairs) {
      scenarios.push({
        id: `${whiteLevel}-vs-${blackLevel}-o${offset}`,
        openingOffset: offset,
        white: { ...LEVELS[whiteLevel] },
        black: { ...LEVELS[blackLevel] },
      });
    }
  }

  return args.games > 0 ? scenarios.slice(0, args.games) : scenarios;
}

class WasmEngine {
  constructor() {
    this.messages = [];
    this.sf = null;
  }

  async init(options = {}) {
    this.sf = await Stockfish({ wasmBinary });
    this.sf.addMessageListener((message) => this.messages.push(String(message)));
    this.send("uci");
    await this.waitFor((joined) => joined.includes("uciok"));
    this.send("setoption name UCI_Variant value timur");
    if (options.hash > 0) {
      this.send(`setoption name Hash value ${options.hash}`);
    }
    this.send("isready");
    await this.waitFor((joined) => joined.includes("readyok"));
  }

  send(command) {
    this.sf.postMessage(command);
  }

  waitFor(predicate, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const timer = setInterval(() => {
        const joined = this.messages.join("\n");
        if (predicate(joined, this.messages)) {
          clearInterval(timer);
          resolve([...this.messages]);
        } else if (performance.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error(`Timed out after ${timeoutMs}ms. Last output:\n${joined.slice(-2000)}`));
        }
      }, 20);
    });
  }

  positionCommand(appliedMoves) {
    return `position startpos${appliedMoves.length ? ` moves ${appliedMoves.join(" ")}` : ""}`;
  }

  async dump(appliedMoves) {
    this.messages.length = 0;
    this.send(this.positionCommand(appliedMoves));
    this.send("d");
    const lines = await this.waitFor((joined) => joined.includes("Key:"));
    return parseDump(lines);
  }

  async rootMoves(appliedMoves) {
    this.messages.length = 0;
    this.send(this.positionCommand(appliedMoves));
    this.send("go perft 1");
    const lines = await this.waitFor((joined) => joined.includes("Nodes searched"));
    return parseRootMoves(lines);
  }

  async search(appliedMoves, config) {
    this.messages.length = 0;
    this.send(this.positionCommand(appliedMoves));
    const started = performance.now();
    if (config.movetime > 0) this.send(`go movetime ${config.movetime}`);
    else this.send(`go depth ${Math.max(1, config.depth || 1)}`);
    const lines = await this.waitFor((joined) => /^bestmove\s+/im.test(joined), Math.max(15000, (config.movetime || 0) + 10000));
    return {
      bestmove: parseBestMove(lines),
      elapsedMs: Math.round(performance.now() - started),
      info: parseSearchInfo(lines),
      rawTail: lines.slice(-8),
    };
  }

  quit() {
    if (this.sf) this.send("quit");
  }
}

function classifyNoMove(dump) {
  if (dump.checkers) {
    return {
      resultType: "checkmate",
      winner: dump.sideToMove === "w" ? "black" : "white",
    };
  }
  return { resultType: "stalemate", winner: "draw" };
}

async function playGame(engine, scenario, gameIndex, args) {
  const appliedMoves = [];
  const moves = [];
  const keyCounts = new Map();
  const startedAt = new Date().toISOString();
  let resultType = "";
  let winner = "";
  let failure = null;

  for (let ply = 0; ply < args.maxMoves; ply += 1) {
    const color = ply % 2 === 0 ? "white" : "black";
    const baseConfig = sideConfig(scenario, color, args);
    const dump = args.trackKeys ? await engine.dump(appliedMoves) : null;
    const config = finishModeConfig(baseConfig, dump, ply);

    if (dump?.key) {
      const count = (keyCounts.get(dump.key) || 0) + 1;
      keyCounts.set(dump.key, count);
      if (count >= 3) {
        resultType = "threefold_repetition";
        winner = "draw";
        break;
      }
    }

    if (dump?.halfmoveClock >= 100) {
      resultType = "fifty_move_draw";
      winner = "draw";
      break;
    }

    const rootMoves = await engine.rootMoves(appliedMoves);
    const citadelToken = optionalCitadelToken(rootMoves);
    if (citadelToken && args.stopOnOptionalDraw) {
      resultType = "citadel_draw";
      winner = "draw";
      moves.push({
        ply: ply + 1,
        color,
        optionalDraw: citadelToken,
        fen: dump?.fen || "",
        key: dump?.key || "",
      });
      break;
    }

    if (!rootMoves.length) {
      const noMove = classifyNoMove(dump || {});
      resultType = noMove.resultType;
      winner = noMove.winner;
      break;
    }

    let search = null;
    let bestmove = "";
    if (ply < args.openingPlies) {
      bestmove = chooseOpeningMove(rootMoves, gameIndex + scenario.openingOffset, ply);
      search = {
        bestmove,
        elapsedMs: 0,
        info: { depth: 0, nodes: 0, nps: 0, score: null, raw: "generated legal opening diversifier" },
        rawTail: [],
      };
    } else {
      search = await engine.search(appliedMoves, config);
      bestmove = search.bestmove;
    }

    let drawAvoidanceFallback = false;
    if ((!bestmove || bestmove === "(none)" || bestmove === "0000") && citadelToken && !args.stopOnOptionalDraw) {
      const fallbackMove = chooseDrawAvoidanceMove(rootMoves, gameIndex + scenario.openingOffset, ply);
      if (fallbackMove) {
        bestmove = fallbackMove;
        drawAvoidanceFallback = true;
        search = {
          ...search,
          bestmove,
          info: {
            ...(search?.info || {}),
            raw: "draw-avoidance fallback after optional citadel bestmove none",
          },
        };
      }
    }

    if (!bestmove || bestmove === "(none)" || bestmove === "0000") {
      const noMove = classifyNoMove(dump || {});
      resultType = citadelToken ? "citadel_draw" : noMove.resultType;
      winner = resultType.endsWith("draw") || resultType === "stalemate" ? "draw" : noMove.winner;
      break;
    }

    const appendMove = normalizeSpecialBestMove(bestmove);
    const legal = isRootMoveLegal(rootMoves, bestmove, appendMove);
    if (!legal) {
      resultType = "illegal_bestmove";
      winner = "invalid";
      failure = {
        ply: ply + 1,
        color,
        bestmove,
        appendMove,
        rootMoveSample: rootMoves.slice(0, 40),
        fen: dump?.fen || "",
        key: dump?.key || "",
        checkers: dump?.checkers || "",
        search,
      };
      break;
    }

    appliedMoves.push(appendMove);
    moves.push({
      ply: ply + 1,
      color,
      level: config.label,
      finishMode: config.finishMode,
      finishReasons: config.finishReasons || null,
      pieces: config.pieces || null,
      optionalDrawAvailable: citadelToken || "",
      drawAvoidanceFallback,
      bestmove,
      appendMove,
      rootMoveCount: rootMoves.length,
      elapsedMs: search.elapsedMs,
      score: search.info.score,
      depth: search.info.depth,
      nodes: search.info.nodes,
      nps: search.info.nps,
      fen: dump?.fen || "",
      key: dump?.key || "",
      checkers: dump?.checkers || "",
    });
  }

  if (!resultType) {
    resultType = "max_moves_draw";
    winner = "draw";
  }

  const elapsed = moves.reduce((sum, move) => sum + (move.elapsedMs || 0), 0);
  return {
    id: `${String(gameIndex + 1).padStart(3, "0")}-${scenario.id}`,
    scenario,
    startedAt,
    finishedAt: new Date().toISOString(),
    resultType,
    winner,
    moveCount: moves.length,
    maxMoves: args.maxMoves,
    totalSearchMs: elapsed,
    averageSearchMs: moves.length ? Math.round(elapsed / moves.length) : 0,
    failure,
    moves,
  };
}

function summarize(games) {
  const resultTypes = {};
  const winners = {};
  const levels = {};
  let illegalBestmoves = 0;
  let totalMoves = 0;
  let totalMs = 0;
  let totalNodes = 0;
  let totalDepth = 0;

  for (const game of games) {
    resultTypes[game.resultType] = (resultTypes[game.resultType] || 0) + 1;
    winners[game.winner] = (winners[game.winner] || 0) + 1;
    if (game.resultType === "illegal_bestmove") illegalBestmoves += 1;
    totalMoves += game.moveCount;
    totalMs += game.totalSearchMs;
    for (const move of game.moves) {
      const level = move.level || "unknown";
      levels[level] ||= { moves: 0, searchMs: 0, nodes: 0, depth: 0 };
      levels[level].moves += 1;
      levels[level].searchMs += move.elapsedMs || 0;
      levels[level].nodes += move.nodes || 0;
      levels[level].depth += move.depth || 0;
      totalNodes += move.nodes || 0;
      totalDepth += move.depth || 0;
    }
  }

  for (const stats of Object.values(levels)) {
    stats.averageSearchMs = stats.moves ? Math.round(stats.searchMs / stats.moves) : 0;
    stats.averageNodes = stats.moves ? Math.round(stats.nodes / stats.moves) : 0;
    stats.averageDepth = stats.moves ? Number((stats.depth / stats.moves).toFixed(2)) : 0;
  }

  const qualityFlags = [];
  if (illegalBestmoves > 0) qualityFlags.push("illegal_bestmove_detected");
  if ((resultTypes.max_moves_draw || 0) / Math.max(1, games.length) > 0.75) qualityFlags.push("high_max_moves_draw_rate");
  if (totalMoves > 0 && totalMs / totalMoves > 500) qualityFlags.push("slow_average_search");
  if (!qualityFlags.length) qualityFlags.push("ok");

  return {
    games: games.length,
    resultTypes,
    winners,
    illegalBestmoves,
    totalMoves,
    averageMoves: games.length ? Math.round(totalMoves / games.length) : 0,
    totalSearchMs: totalMs,
    averageSearchMsPerMove: totalMoves ? Math.round(totalMs / totalMoves) : 0,
    averageDepth: totalMoves ? Number((totalDepth / totalMoves).toFixed(2)) : 0,
    averageNodes: totalMoves ? Math.round(totalNodes / totalMoves) : 0,
    levels,
    qualityFlags,
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeGameCsv(outDir, games) {
  const rows = [
    ["id", "white", "black", "resultType", "winner", "moves", "totalSearchMs", "averageSearchMs"],
    ...games.map((game) => [
      game.id,
      game.scenario.white.label,
      game.scenario.black.label,
      game.resultType,
      game.winner,
      game.moveCount,
      game.totalSearchMs,
      game.averageSearchMs,
    ]),
  ];
  fs.writeFileSync(path.join(outDir, "games.csv"), rows.map((row) => row.map(csvCell).join(",")).join("\n"));
}

function writeSingleGame(outDir, game) {
  fs.mkdirSync(path.join(outDir, "matches"), { recursive: true });
  fs.writeFileSync(path.join(outDir, "matches", `${game.id}.json`), JSON.stringify(game, null, 2));
}

function writeLiveSummary(outDir, games, args) {
  const summary = summarize(games);
  fs.mkdirSync(outDir, { recursive: true });
  writeGameCsv(outDir, games);
  fs.writeFileSync(path.join(outDir, "summary.partial.json"), JSON.stringify({ args, summary }, null, 2));
  return summary;
}

function writeOutputs(outDir, games, summary, args) {
  fs.mkdirSync(path.join(outDir, "matches"), { recursive: true });
  for (const game of games) {
    writeSingleGame(outDir, game);
  }
  writeGameCsv(outDir, games);
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify({ args, summary }, null, 2));
  fs.writeFileSync(
    path.join(outDir, "SUMMARY.md"),
    [
      "# WASM AI vs AI Run",
      "",
      `- Games: ${summary.games}`,
      `- Total moves: ${summary.totalMoves}`,
      `- Average moves: ${summary.averageMoves}`,
      `- Illegal bestmoves: ${summary.illegalBestmoves}`,
      `- Average search ms / move: ${summary.averageSearchMsPerMove}`,
      `- Average depth: ${summary.averageDepth}`,
      `- Average nodes / move: ${summary.averageNodes}`,
      `- Quality flags: ${summary.qualityFlags.join(", ")}`,
      "",
      "## Result Types",
      ...Object.entries(summary.resultTypes).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## Winners",
      ...Object.entries(summary.winners).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## Level Performance",
      ...Object.entries(summary.levels).map(
        ([key, value]) => `- ${key}: ${value.moves} moves, ${value.averageSearchMs} ms/move, depth ${value.averageDepth}, nodes ${value.averageNodes}`
      ),
      "",
    ].join("\n")
  );
}

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.outDir || path.join(repoRoot, "reports", `wasm-ai-${args.preset}-${timestamp()}`));
const scenarios = buildScenarios(args);
const engine = new WasmEngine();
const games = [];

try {
  await engine.init({ hash: args.hash });
  for (const [index, scenario] of scenarios.entries()) {
    const game = await playGame(engine, scenario, index, args);
    games.push(game);
    writeSingleGame(outDir, game);
    writeLiveSummary(outDir, games, args);
    console.log(
      `${game.resultType === "illegal_bestmove" ? "FAIL" : "PASS"} ${index + 1}/${scenarios.length} ${game.id} ` +
        `${game.resultType} winner=${game.winner} moves=${game.moveCount} avgMs=${game.averageSearchMs}`
    );
    if (game.failure) {
      console.log(`  illegal: ply ${game.failure.ply} ${game.failure.color} ${game.failure.bestmove}`);
      console.log(`  checkers: ${game.failure.checkers || "-"}`);
    }
  }
} finally {
  engine.quit();
}

const summary = summarize(games);
writeOutputs(outDir, games, summary, args);

console.log("\n=== WASM AI vs AI summary ===");
console.log(JSON.stringify(summary, null, 2));
console.log(`Report directory: ${outDir}`);

if (summary.illegalBestmoves > 0) {
  process.exit(1);
}

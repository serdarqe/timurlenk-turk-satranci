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

function hasLine(lines, expected) {
  return lines.some((line) => line.trim() === expected);
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
    async perftLines(fen, depth = 1, moves = []) {
      messages.length = 0;
      send(`position fen ${fen}${moves.length ? ` moves ${moves.join(" ")}` : ""}`);
      send(`go perft ${depth}`);
      return waitFor((joined) => joined.includes("Nodes searched"));
    },
    async searchLines(fen, moves = []) {
      messages.length = 0;
      send(`position fen ${fen}${moves.length ? ` moves ${moves.join(" ")}` : ""}`);
      send("go depth 1");
      return waitFor((joined) => joined.includes("bestmove"));
    },
    quit() {
      send("quit");
    },
  };
}

const cases = [
  {
    name: "white citadel entry token",
    fen: "K10/10k/11/11/11/11/11/11/11/11 w - - 0 1",
    expected: "a10@blackcitadel: 1",
    forbidden: ["k1@whitecitadel: 1"],
  },
  {
    name: "white citadel entry is side-to-move gated",
    fen: "K10/10k/11/11/11/11/11/11/11/11 b - - 0 1",
    forbidden: ["a10@blackcitadel: 1"],
  },
  {
    name: "white citadel entry rejects non-royal piece",
    fen: "P10/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    forbidden: ["a10@blackcitadel: 1"],
  },
  {
    name: "black citadel entry token",
    fen: "11/K10/11/11/11/11/11/11/11/10k b - - 0 1",
    expected: "k1@whitecitadel: 1",
    forbidden: ["a10@blackcitadel: 1"],
  },
  {
    name: "black citadel entry rejects non-royal piece",
    fen: "10k/K10/11/11/11/11/11/11/11/10p b - - 0 1",
    forbidden: ["k1@whitecitadel: 1"],
  },
  {
    name: "white citadel exchange token",
    fen: "K10/10k/11/11/11/5Q5/11/11/11/11 w - - 0 1",
    expected: "citadel_exchange:a10:f5@blackcitadel: 1",
  },
  {
    name: "white citadel exchange supports a non-smoke royal target",
    fen: "K10/10k/11/11/11/11/2Q8/11/11/11 w - - 0 1",
    expected: "citadel_exchange:a10:c4@blackcitadel: 1",
  },
  {
    name: "white citadel exchange is one-time after the royal returns to entry",
    fen: "K10/1Q8k/11/11/11/11/2A8/11/11/11 w - - 0 1",
    moves: ["a10b9", "k9j8", "b9a10", "j8k9"],
    forbidden: ["citadel_exchange:a10:c4@blackcitadel: 1"],
  },
  {
    name: "white citadel exchange rejects non-royal target",
    fen: "K10/10k/11/11/11/5P5/11/11/11/11 w - - 0 1",
    forbidden: ["citadel_exchange:a10:f5@blackcitadel: 1"],
  },
  {
    name: "black citadel exchange token",
    fen: "11/K10/11/11/5q5/11/11/11/11/10k b - - 0 1",
    expected: "citadel_exchange:k1:f6@whitecitadel: 1",
  },
  {
    name: "black citadel exchange supports a non-smoke royal target",
    fen: "11/K10/11/4q6/11/11/11/11/11/10k b - - 0 1",
    expected: "citadel_exchange:k1:e7@whitecitadel: 1",
  },
  {
    name: "black citadel exchange rejects non-royal target",
    fen: "11/K10/11/11/5p5/11/11/11/11/10k b - - 0 1",
    forbidden: ["citadel_exchange:k1:f6@whitecitadel: 1"],
  },
  {
    name: "white royal swap token",
    fen: "10k/11/11/11/11/11/11/11/4Q6/r4K5 w - - 0 1",
    expected: "royal_swap:f1:e2@ransom: 1",
  },
  {
    name: "white royal swap is one-time after ransom flag is consumed",
    fen: "10k/11/11/11/11/11/2A8/11/4Q6/r4K5 w - - 0 1",
    moves: ["f1e2", "a1e1"],
    forbidden: ["e2c4: 1"],
  },
  {
    name: "white royal swap sequence keeps later evasion strict",
    fen: "10k/11/11/11/11/11/2A8/P10/4Q6/r4K5 w - - 0 1",
    moves: ["f1e2", "a1e1"],
    expected: "f1e1: 1",
    forbidden: ["a3a4: 1", "e2c4: 1"],
  },
  {
    name: "black royal swap token",
    fen: "5k4R/4q6/11/11/11/11/11/11/11/K10 b - - 0 1",
    expected: "royal_swap:f10:e9@ransom: 1",
  },
  {
    name: "picket diagonal check enables broad royal swap evasions",
    fen: "ecd5dce/r1tz1kv3r/ppp2g4p/3pppp3t/4z6/6N2n1/2CPPPP4/PPP2G1PPPP/R1TZ2VZT1R/E1D1K3D1E w - - 5 17",
    expected: "e1a1: 1",
    forbidden: ["a3a4: 1"],
  },
  {
    name: "white pawn-of-pawns enters promotion rank as pawn",
    fen: "11/4P5/10k/11/11/11/11/11/11/K10 w - - 0 1",
    expected: "e9e10: 1",
    forbidden: ["e9e10z: 1", "e9e10t: 1", "e9e10q: 1"],
  },
  {
    name: "black pawn-of-pawns enters promotion rank as pawn",
    fen: "10k/11/11/11/11/11/11/10K/4p6/11 b - - 0 1",
    expected: "e2e1: 1",
    forbidden: ["e2e1z: 1", "e2e1t: 1", "e2e1q: 1"],
  },
  {
    name: "white pawn-of-pawns stage two token",
    fen: "4P6/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    expected: "pawn_cycle:e10:e3@stage2: 1",
  },
  {
    name: "black pawn-of-pawns stage three token",
    fen: "10k/11/11/11/11/11/11/11/K10/4p6 b - - 0 1",
    expected: "pawn_cycle:e1:e8@stage3: 1",
  },
  {
    name: "white pawn-of-pawns adventitious king token",
    fen: "5P5/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    expected: "pawn_cycle:f10:f10@adventitious: 1",
  },
  {
    name: "white pawn-of-pawns stage two survives ordinary forward movement",
    fen: "4P6/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    moves: ["e10e3", "k9k8"],
    expected: "e3e4: 1",
  },
  {
    name: "white pawn-of-pawns staged pawn re-enters promotion rank without ordinary promotion",
    fen: "4P6/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    moves: [
      "e10e3", "k9k8",
      "e3e4", "k8k9",
      "e4e5", "k9k8",
      "e5e6", "k8k9",
      "e6e7", "k9k8",
      "e7e8", "k8k9",
      "e8e9", "k9k8",
    ],
    expected: "e9e10: 1",
    forbidden: ["e9e10q: 1"],
  },
  {
    name: "white pawn-of-pawns stage two can repatriate again after re-entry",
    fen: "4P6/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    moves: [
      "e10e3", "k9k8",
      "e3e4", "k8k9",
      "e4e5", "k9k8",
      "e5e6", "k8k9",
      "e6e7", "k9k8",
      "e7e8", "k8k9",
      "e8e9", "k9k8",
      "e9e10", "k8k9",
    ],
    expected: "e10e3: 1",
  },
  {
    name: "white pawn-of-pawns full cycle creates adventitious king",
    fen: "4P6/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    moves: [
      "e10e3", "k9k8",
      "e3e4", "k8k9",
      "e4e5", "k9k8",
      "e5e6", "k8k9",
      "e6e7", "k9k8",
      "e7e8", "k8k9",
      "e8e9", "k9k8",
      "e9e10", "k8k9",
      "e10e3", "k9k8",
      "e3e4", "k8k9",
      "e4e5", "k9k8",
      "e5e6", "k8k9",
      "e6e7", "k9k8",
      "e7e8", "k8k9",
      "e8e9", "k9k8",
      "e9e10", "k8k9",
    ],
    expected: "e10e10: 1",
    forbidden: ["e10e3: 1"],
  },
  {
    name: "black pawn-of-pawns full cycle creates adventitious king",
    fen: "10k/11/11/11/11/11/11/11/K10/4p6 b - - 0 1",
    moves: [
      "e1e8", "a2a3",
      "e8e7", "a3a2",
      "e7e6", "a2a3",
      "e6e5", "a3a2",
      "e5e4", "a2a3",
      "e4e3", "a3a2",
      "e3e2", "a2a3",
      "e2e1", "a3a2",
      "e1e8", "a2a3",
      "e8e7", "a3a2",
      "e7e6", "a2a3",
      "e6e5", "a3a2",
      "e5e4", "a2a3",
      "e4e3", "a3a2",
      "e3e2", "a2a3",
      "e2e1", "a3a2",
    ],
    expected: "e1e1: 1",
    forbidden: ["e1e8: 1"],
  },
  {
    name: "white prince keeps the side alive after shah loss",
    fen: "10k/11/11/11/11/11/11/11/4Q6/11 w - - 0 1",
    expected: "multi_royal:white:prince_backup: 1",
    forbidden: ["multi_royal:white:no_royal_loss: 1"],
  },
  {
    name: "white adventitious king keeps the side alive after shah loss",
    fen: "10k/11/11/11/11/11/11/11/4A6/11 w - - 0 1",
    expected: "multi_royal:white:adventitious_backup: 1",
    forbidden: ["multi_royal:white:no_royal_loss: 1"],
  },
  {
    name: "white side with no royal is an immediate Timur loss gate",
    fen: "10k/11/11/11/11/11/11/11/4P6/11 w - - 0 1",
    expected: "multi_royal:white:no_royal_loss: 1",
    forbidden: ["e2e3: 1"],
  },
  {
    name: "black side with no royal is an immediate Timur loss gate",
    fen: "11/4p6/11/11/11/11/11/11/11/K10 b - - 0 1",
    expected: "multi_royal:black:no_royal_loss: 1",
    forbidden: ["e9e8: 1"],
  },
  {
    name: "white prince backup is treated as check target during evasions",
    fen: "4r6/10k/11/11/11/11/11/P10/4Q6/11 w - - 0 1",
    expected: "e2d1: 1",
    forbidden: ["a3a4: 1"],
  },
  {
    name: "black prince backup is treated as check target during evasions",
    fen: "11/4q6/p10/11/11/11/11/11/11/K3R6 b - - 0 1",
    expected: "e9d8: 1",
    forbidden: ["a8a7: 1"],
  },
  {
    name: "white adventitious king backup is treated as check target during evasions",
    fen: "4r6/10k/11/11/11/11/11/P10/4A6/11 w - - 0 1",
    expected: "e2d1: 1",
    forbidden: ["a3a4: 1"],
  },
  {
    name: "black adventitious king backup is treated as check target during evasions",
    fen: "11/4a6/p10/11/11/11/11/11/11/K3R6 b - - 0 1",
    expected: "e9d8: 1",
    forbidden: ["a8a7: 1"],
  },
];

const searchCases = [
  {
    name: "white citadel entry is a native draw claim at root",
    fen: "K10/10k/11/11/11/11/11/11/11/11 w - - 0 1",
    expectedLines: ["info depth 0 score cp 0", "bestmove (none)"],
  },
  {
    name: "black citadel entry is a native draw claim at root",
    fen: "11/K10/11/11/11/11/11/11/11/10k b - - 0 1",
    expectedLines: ["info depth 0 score cp 0", "bestmove (none)"],
  },
  {
    name: "white citadel exchange uses a native special bestmove channel",
    fen: "K10/10k/11/11/11/5Q5/11/11/11/11 w - - 0 1",
    expectedLines: [
      "info depth 0 score cp 0 string timur_special citadel_exchange",
      "info string timur_special citadel_exchange apply=a10->f5,f5->blackcitadel flag=1",
      "info string timur_special citadel_exchange encoded=a10f5 type=special",
      "bestmove citadel_exchange:a10:f5@blackcitadel",
    ],
    forbiddenLines: ["bestmove (none)"],
  },
  {
    name: "black citadel exchange uses a native special bestmove channel",
    fen: "11/K10/11/11/5q5/11/11/11/11/10k b - - 0 1",
    expectedLines: [
      "info depth 0 score cp 0 string timur_special citadel_exchange",
      "info string timur_special citadel_exchange apply=k1->f6,f6->whitecitadel flag=1",
      "info string timur_special citadel_exchange encoded=k1f6 type=special",
      "bestmove citadel_exchange:k1:f6@whitecitadel",
    ],
    forbiddenLines: ["bestmove (none)"],
  },
  {
    name: "white dynamic citadel exchange uses the same special bestmove channel",
    fen: "K10/10k/11/11/11/11/2Q8/11/11/11 w - - 0 1",
    expectedLines: [
      "info depth 0 score cp 0 string timur_special citadel_exchange",
      "info string timur_special citadel_exchange apply=a10->c4,c4->blackcitadel flag=1",
      "info string timur_special citadel_exchange encoded=a10c4 type=special",
      "bestmove citadel_exchange:a10:c4@blackcitadel",
    ],
    forbiddenLines: ["bestmove (none)"],
  },
  {
    name: "black dynamic citadel exchange uses the same special bestmove channel",
    fen: "11/K10/11/4q6/11/11/11/11/11/10k b - - 0 1",
    expectedLines: [
      "info depth 0 score cp 0 string timur_special citadel_exchange",
      "info string timur_special citadel_exchange apply=k1->e7,e7->whitecitadel flag=1",
      "info string timur_special citadel_exchange encoded=k1e7 type=special",
      "bestmove citadel_exchange:k1:e7@whitecitadel",
    ],
    forbiddenLines: ["bestmove (none)"],
  },
  {
    name: "white prince backup can search a real root move",
    fen: "10k/11/11/11/11/11/11/11/4Q6/11 w - - 0 1",
    expectedIncludes: ["bestmove "],
    forbiddenLines: ["bestmove (none)"],
  },
  {
    name: "white adventitious backup can search a real root move",
    fen: "10k/11/11/11/11/11/11/11/4A6/11 w - - 0 1",
    expectedIncludes: ["bestmove "],
    forbiddenLines: ["bestmove (none)"],
  },
  {
    name: "white royalless side ends at root instead of searching a pawn move",
    fen: "10k/11/11/11/11/11/11/11/4P6/11 w - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
    forbiddenLines: ["bestmove e2e3"],
  },
  {
    name: "black royalless side ends at root instead of searching a pawn move",
    fen: "11/4p6/11/11/11/11/11/11/11/K10 b - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
    forbiddenLines: ["bestmove e9e8"],
  },
  {
    name: "white root search stops when black has no remaining royal",
    fen: "11/4p6/11/11/11/11/11/11/11/K10 w - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "black root search stops when white has no remaining royal",
    fen: "10k/11/11/11/11/11/11/11/4P6/11 b - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "white shah checkmate-like root result returns no move",
    fen: "10k/11/11/11/11/11/11/11/rr9/Kr9 w - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "black shah checkmate-like root result returns no move",
    fen: "kR9/RR9/11/11/11/11/11/11/11/K10 b - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "white prince backup checkmate-like root result returns no move",
    fen: "10k/11/11/11/11/11/11/11/rr9/Qr9 w - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "white adventitious backup checkmate-like root result returns no move",
    fen: "10k/11/11/11/11/11/11/11/rr9/Ar9 w - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "black prince backup checkmate-like root result returns no move",
    fen: "qR9/RR9/11/11/11/11/11/11/11/K10 b - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "black adventitious backup checkmate-like root result returns no move",
    fen: "aR9/RR9/11/11/11/11/11/11/11/K10 b - - 0 1",
    expectedLines: ["info depth 0 score mate 0", "bestmove (none)"],
  },
  {
    name: "checked adventitious backup searches an evasion, not a quiet pawn move",
    fen: "4r6/10k/11/11/11/11/11/P10/4A6/11 w - - 0 1",
    expectedIncludes: ["bestmove e2"],
    forbiddenLines: ["bestmove (none)", "bestmove a3a4"],
  },
  {
    name: "white royal swap sequence searches the later evasion",
    fen: "10k/11/11/11/11/11/2A8/P10/4Q6/r4K5 w - - 0 1",
    moves: ["f1e2", "a1e1"],
    expectedIncludes: ["bestmove f1"],
    forbiddenLines: ["bestmove (none)", "bestmove a3a4"],
  },
  {
    name: "black royal swap sequence can continue root search",
    fen: "5k4R/4q6/11/11/11/11/11/11/11/K10 b - - 0 1",
    moves: ["f10e9"],
    expectedIncludes: ["bestmove "],
    forbiddenLines: ["bestmove (none)"],
  },
];

const reversibleCases = [
  {
    name: "white citadel exchange applies and reverts inside perft",
    fen: "K10/10k/11/11/11/5Q5/11/11/11/11 w - - 0 1",
    depth: 2,
    expectedPrefix: "a10f5:",
  },
  {
    name: "black citadel exchange applies and reverts inside perft",
    fen: "11/K10/11/11/5q5/11/11/11/11/10k b - - 0 1",
    depth: 2,
    expectedPrefix: "k1f6:",
  },
  {
    name: "white dynamic citadel exchange applies and reverts inside perft",
    fen: "K10/10k/11/11/11/11/2Q8/11/11/11 w - - 0 1",
    depth: 2,
    expectedPrefix: "a10c4:",
  },
  {
    name: "black dynamic citadel exchange applies and reverts inside perft",
    fen: "11/K10/11/4q6/11/11/11/11/11/10k b - - 0 1",
    depth: 2,
    expectedPrefix: "k1e7:",
  },
  {
    name: "white royal swap applies and reverts inside perft",
    fen: "10k/11/11/11/11/11/11/11/4Q6/r4K5 w - - 0 1",
    depth: 2,
    expectedPrefix: "f1e2:",
  },
  {
    name: "black royal swap applies and reverts inside perft",
    fen: "5k4R/4q6/11/11/11/11/11/11/11/K10 b - - 0 1",
    depth: 2,
    expectedPrefix: "f10e9:",
  },
  {
    name: "white pawn-of-pawns stage two applies and reverts inside perft",
    fen: "4P6/10k/11/11/11/11/11/11/11/K10 w - - 0 1",
    depth: 2,
    expectedPrefix: "e10e3:",
  },
  {
    name: "black pawn-of-pawns repatriation applies and reverts inside perft",
    fen: "10k/11/11/11/11/11/11/11/K10/4p6 b - - 0 1",
    depth: 2,
    expectedPrefix: "e1e8:",
  },
];

(async () => {
  const engine = await createEngine();
  let failures = 0;
  for (const testCase of cases) {
    const lines = await engine.perftLines(testCase.fen, 1, testCase.moves || []);
    const hasExpected = testCase.expected ? hasLine(lines, testCase.expected) : true;
    const forbiddenHits = (testCase.forbidden || []).filter((line) => hasLine(lines, line));
    const ok = hasExpected && forbiddenHits.length === 0;
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${testCase.name}`);
    if (!ok) {
      if (!hasExpected)
        console.log(`  expected: ${testCase.expected}`);
      if (forbiddenHits.length)
        console.log(`  forbidden present: ${forbiddenHits.join(", ")}`);
      console.log(`  actual:\n${lines.join("\n")}`);
    }
  }
  for (const testCase of searchCases) {
    const lines = await engine.searchLines(testCase.fen, testCase.moves || []);
    const missing = (testCase.expectedLines || []).filter((line) => !hasLine(lines, line));
    const missingIncludes = (testCase.expectedIncludes || []).filter(
      (fragment) => !lines.some((line) => line.includes(fragment))
    );
    const forbiddenHits = (testCase.forbiddenLines || []).filter((line) => hasLine(lines, line));
    const ok = missing.length === 0 && missingIncludes.length === 0 && forbiddenHits.length === 0;
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${testCase.name}`);
    if (!ok) {
      if (missing.length)
        console.log(`  missing: ${missing.join(", ")}`);
      if (missingIncludes.length)
        console.log(`  missing includes: ${missingIncludes.join(", ")}`);
      if (forbiddenHits.length)
        console.log(`  forbidden present: ${forbiddenHits.join(", ")}`);
      console.log(`  actual:\n${lines.join("\n")}`);
    }
  }
  for (const testCase of reversibleCases) {
    const lines = await engine.perftLines(testCase.fen, testCase.depth);
    const hasExpected = lines.some((line) => line.trim().startsWith(testCase.expectedPrefix));
    const hasNodes = lines.some((line) => line.trim().startsWith("Nodes searched:"));
    const ok = hasExpected && hasNodes;
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${testCase.name}`);
    if (!ok) {
      if (!hasExpected)
        console.log(`  missing prefix: ${testCase.expectedPrefix}`);
      if (!hasNodes)
        console.log("  missing Nodes searched line");
      console.log(`  actual:\n${lines.join("\n")}`);
    }
  }
  engine.quit();
  if (failures)
    process.exit(1);
})();

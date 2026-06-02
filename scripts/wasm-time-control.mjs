export const LEVELS = {
  easy: { label: "easy", depth: 1, movetime: 30 },
  medium: { label: "medium", depth: 2, movetime: 80 },
  hard: { label: "hard", depth: 3, movetime: 150 },
};

const PHASE_MOVETIMES = {
  easy: {
    opening: 20,
    middlegame: 30,
    late_middlegame: 45,
    endgame: 70,
    critical_endgame: 100,
  },
  medium: {
    opening: 45,
    middlegame: 80,
    late_middlegame: 120,
    endgame: 180,
    critical_endgame: 300,
  },
  hard: {
    opening: 70,
    middlegame: 200,
    late_middlegame: 320,
    endgame: 800,
    critical_endgame: 1200,
  },
};

const PHASE_DEPTH_BONUS = {
  opening: 0,
  middlegame: 0,
  late_middlegame: 1,
  endgame: 2,
  critical_endgame: 3,
};

export function countPiecesFromFen(fen) {
  const placement = String(fen || "").split(/\s+/)[0] || "";
  let white = 0;
  let black = 0;
  for (const ch of placement) {
    if (/[A-Z]/.test(ch)) white += 1;
    else if (/[a-z]/.test(ch)) black += 1;
  }
  return { white, black, total: white + black };
}

function classifyPhase({ pieces, ply, maxMoves, halfmoveClock, checkers }) {
  const safeMaxMoves = Number(maxMoves || 280);
  const isInCheck = Boolean(String(checkers || "").trim());
  const canUseMoveCapPressure = safeMaxMoves >= 160;
  const nearMoveCap = canUseMoveCapPressure && ply >= safeMaxMoves - 32;
  const lateMoveCap = canUseMoveCapPressure && ply >= safeMaxMoves - 75;
  const lowProgress = halfmoveClock >= 80;

  if (pieces.total > 0 && (pieces.total <= 8 || nearMoveCap || lowProgress || (pieces.total <= 10 && isInCheck))) {
    return "critical_endgame";
  }

  if (pieces.total > 0 && (pieces.total <= 14 || halfmoveClock >= 55 || lateMoveCap)) {
    return "endgame";
  }

  if (pieces.total > 0 && (pieces.total <= 24 || ply >= 120)) {
    return "late_middlegame";
  }

  if (ply < 24 && pieces.total >= 30) {
    return "opening";
  }

  return "middlegame";
}

export function selectTimeControl(baseConfig, context = {}) {
  const pieces = countPiecesFromFen(context.fen || "");
  const halfmoveClock = Number(context.halfmoveClock || 0);
  const ply = Number(context.ply || 0);
  const maxMoves = Number(context.maxMoves || 280);

  if (Number(context.movetimeOverride || 0) > 0) {
    return {
      ...baseConfig,
      movetime: Number(context.movetimeOverride),
      depth: Number(context.depthOverride || 0) > 0 ? Number(context.depthOverride) : baseConfig.depth,
      phase: "override",
      finishMode: false,
      finishReasons: null,
      pieces,
    };
  }

  const phase = classifyPhase({
    pieces,
    ply,
    maxMoves,
    halfmoveClock,
    checkers: context.checkers,
  });
  const levelTimes = PHASE_MOVETIMES[baseConfig.label] || PHASE_MOVETIMES.medium;
  const movetime = levelTimes[phase] || baseConfig.movetime;
  const depth = baseConfig.depth + (PHASE_DEPTH_BONUS[phase] || 0);
  const finishMode = phase === "endgame" || phase === "critical_endgame";

  return {
    ...baseConfig,
    movetime,
    depth,
    phase,
    finishMode,
    finishReasons: finishMode
      ? {
          endgame: phase === "endgame",
          criticalEndgame: phase === "critical_endgame",
          lowProgress: halfmoveClock >= 55,
          lateGame: ply >= maxMoves - 75,
        }
      : null,
    pieces,
  };
}

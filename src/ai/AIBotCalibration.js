import { AI_BOTS, getAIBot, isAIBotId } from './AIBots.js';
import { COLORS } from '../utils/constants.js';

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function roundTo(value, decimals = 3) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function getLevelProgress(level) {
    return clampNumber(((Number(level) || 1) - 1) / 14, 0, 1);
}

function resolveBot(botOrId) {
    if (typeof botOrId === 'string') return getAIBot(botOrId);
    if (botOrId?.id && isAIBotId(botOrId.id)) return getAIBot(botOrId.id);
    return null;
}

function getWinnerScoreForSide(winner, color) {
    if (winner === color) return 1;
    if (winner === getOppositeColor(color)) return 0;
    return 0.5;
}

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function getMoveSearchChoice(move = {}) {
    const search = move.ai?.search || {};
    return search.chosen
        || search.chosenCandidate
        || search.best
        || search.bestCandidate
        || {};
}

function isCriticalMoveError(move = {}) {
    const chosen = getMoveSearchChoice(move);
    const loss = Number(move.loss ?? move.analysisLoss ?? 0);
    const dangerLevel = Number(chosen.dangerLevel ?? chosen.tacticalRisk?.dangerLevel ?? 0);
    const replyCaptureValue = Number(chosen.replyCaptureValue ?? chosen.replyThreat?.bestCaptureValue ?? 0);
    const staticExchange = Number(chosen.staticExchange ?? chosen.metadata?.staticExchange ?? 0);
    const tempoLoss = Number(chosen.tempoLoss ?? chosen.metadata?.tempoLoss ?? 0);

    return loss >= 90
        || dangerLevel >= 3
        || replyCaptureValue >= 80
        || staticExchange <= -45
        || tempoLoss >= 8;
}

function getOpeningDataScore(move = {}) {
    const score = Number(move.ai?.openingDataScore);
    if (!Number.isFinite(score)) return null;
    return clampNumber(score, 0, 1);
}

function createBotStats(bot) {
    const target = getBotCalibrationTarget(bot.id);
    return {
        botId: bot.id,
        label: bot.labels?.tr || bot.id,
        level: bot.level,
        stars: bot.stars,
        targetRating: target.targetRating,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        score: 0,
        scoreRate: 0,
        moveCount: 0,
        criticalErrors: 0,
        criticalErrorRate: 0,
        openingBookMoves: 0,
        openingScoreTotal: 0,
        openingSuccessRate: null,
        endgameSignals: 0,
        endgameConversionRate: 0,
        averageMoves: 0,
        tuning: {
            recommendation: 'no-data',
            ratingAdjustment: 0,
            reasons: []
        }
    };
}

function addSideResult(stats, winner, color, moveCount) {
    const sideScore = getWinnerScoreForSide(winner, color);
    stats.games += 1;
    stats.score += sideScore;
    stats.averageMoves += moveCount || 0;

    if (sideScore === 1) stats.wins += 1;
    else if (sideScore === 0) stats.losses += 1;
    else stats.draws += 1;
}

function addMoveStats(stats, move) {
    stats.moveCount += 1;
    if (isCriticalMoveError(move)) stats.criticalErrors += 1;

    if (move.ai?.openingBook) {
        stats.openingBookMoves += 1;
        const openingScore = getOpeningDataScore(move);
        if (openingScore != null) stats.openingScoreTotal += openingScore;
    }

    if (getMoveSearchChoice(move).terminalWin || move.resultType) {
        stats.endgameSignals += 1;
    }
}

function finalizeBotStats(stats) {
    const target = getBotCalibrationTarget(stats.botId);
    const reasons = [];

    stats.scoreRate = stats.games ? roundTo(stats.score / stats.games) : 0;
    stats.criticalErrorRate = stats.moveCount ? roundTo(stats.criticalErrors / stats.moveCount) : 0;
    stats.openingSuccessRate = stats.openingBookMoves
        ? roundTo(stats.openingScoreTotal / stats.openingBookMoves)
        : null;
    stats.endgameConversionRate = stats.games ? roundTo(stats.endgameSignals / stats.games) : 0;
    stats.averageMoves = stats.games ? roundTo(stats.averageMoves / stats.games, 1) : 0;

    let ratingAdjustment = Math.round((stats.scoreRate - 0.5) * 180);
    if (stats.criticalErrorRate > target.maxCriticalErrorRate) {
        reasons.push('critical-error-rate');
        ratingAdjustment -= Math.round((stats.criticalErrorRate - target.maxCriticalErrorRate) * 220);
    }

    if (stats.openingSuccessRate != null && stats.openingSuccessRate < target.minOpeningSuccessRate) {
        reasons.push('opening-success');
        ratingAdjustment -= Math.round((target.minOpeningSuccessRate - stats.openingSuccessRate) * 90);
    }

    if (stats.endgameConversionRate < target.minEndgameConversionRate && stats.games >= 2) {
        reasons.push('endgame-conversion');
        ratingAdjustment -= Math.round((target.minEndgameConversionRate - stats.endgameConversionRate) * 100);
    }

    if (stats.games === 0) {
        stats.tuning = {
            recommendation: 'needs-data',
            ratingAdjustment: 0,
            reasons: ['no-games']
        };
        return stats;
    }

    const recommendation = ratingAdjustment >= 35
        ? 'strengthen-rating'
        : (ratingAdjustment <= -35 ? 'reduce-or-fix' : 'hold');

    stats.tuning = {
        recommendation,
        ratingAdjustment,
        reasons
    };

    return stats;
}

function getSideBotId(match, color) {
    return color === COLORS.WHITE
        ? match.scenario?.white?.botId
        : match.scenario?.black?.botId;
}

function buildLevelScores(byBot) {
    return Object.values(byBot).reduce((levels, bot) => {
        if (!bot.games) return levels;
        if (!levels[bot.level]) {
            levels[bot.level] = {
                level: bot.level,
                games: 0,
                score: 0,
                scoreRate: 0,
                criticalErrors: 0,
                moveCount: 0,
                criticalErrorRate: 0
            };
        }

        levels[bot.level].games += bot.games;
        levels[bot.level].score += bot.score;
        levels[bot.level].criticalErrors += bot.criticalErrors;
        levels[bot.level].moveCount += bot.moveCount;
        return levels;
    }, {});
}

function finalizeLevelScores(levelScores) {
    return Object.values(levelScores)
        .map((entry) => ({
            ...entry,
            scoreRate: entry.games ? roundTo(entry.score / entry.games) : 0,
            criticalErrorRate: entry.moveCount ? roundTo(entry.criticalErrors / entry.moveCount) : 0
        }))
        .sort((a, b) => a.level - b.level);
}

function buildGate(highLevel, lowLevel, levelScores) {
    const high = levelScores.find((entry) => entry.level === highLevel) || null;
    const low = levelScores.find((entry) => entry.level === lowLevel) || null;
    const highTarget = getBotCalibrationTarget(AI_BOTS.find((bot) => bot.level === highLevel)?.id);
    const lowTarget = getBotCalibrationTarget(AI_BOTS.find((bot) => bot.level === lowLevel)?.id);

    if (!high || !low) {
        return {
            status: 'needs-data',
            highLevel,
            lowLevel,
            scoreGap: null,
            targetRatingGap: highTarget.targetRating - lowTarget.targetRating
        };
    }

    const scoreGap = roundTo(high.scoreRate - low.scoreRate);
    return {
        status: scoreGap >= 0.08 ? 'pass' : 'fail',
        highLevel,
        lowLevel,
        scoreGap,
        targetRatingGap: highTarget.targetRating - lowTarget.targetRating,
        highScoreRate: high.scoreRate,
        lowScoreRate: low.scoreRate
    };
}

export function getBotCalibrationTarget(botOrId) {
    const bot = resolveBot(botOrId);
    const level = Number(bot?.level) || 1;
    const progress = getLevelProgress(level);

    return Object.freeze({
        botId: bot?.id || null,
        level,
        stars: Number(bot?.stars) || 1,
        targetRating: Number(bot?.rating) || Math.round(500 + level * 95),
        expectedScoreVsPreviousTier: roundTo(0.55 + progress * 0.12),
        maxCriticalErrorRate: roundTo(0.34 - progress * 0.25),
        minOpeningSuccessRate: roundTo(0.46 + progress * 0.18),
        minEndgameConversionRate: roundTo(0.35 + progress * 0.34),
        maxDrawRate: roundTo(0.62 - progress * 0.22)
    });
}

export function buildBotCalibrationTable() {
    return Object.freeze(AI_BOTS.map((bot) => Object.freeze({
        ...getBotCalibrationTarget(bot.id),
        label: bot.labels?.tr || bot.id,
        difficulty: bot.difficulty,
        personaId: bot.personaId
    })));
}

export function buildBotCalibrationReport(matches = []) {
    const byBot = Object.fromEntries(AI_BOTS.map((bot) => [bot.id, createBotStats(bot)]));

    matches.forEach((match) => {
        const whiteBotId = match.scenario?.white?.botId;
        const blackBotId = match.scenario?.black?.botId;
        const moveCount = Number(match.moveCount || match.moves?.length || 0);

        if (isAIBotId(whiteBotId)) addSideResult(byBot[whiteBotId], match.winner, COLORS.WHITE, moveCount);
        if (isAIBotId(blackBotId)) addSideResult(byBot[blackBotId], match.winner, COLORS.BLACK, moveCount);

        (match.moves || []).forEach((move) => {
            const botId = move.ai?.botId || getSideBotId(match, move.color);
            if (!isAIBotId(botId)) return;
            addMoveStats(byBot[botId], move);
        });
    });

    Object.values(byBot).forEach(finalizeBotStats);

    const levels = finalizeLevelScores(buildLevelScores(byBot));
    const recommendations = Object.values(byBot)
        .filter((bot) => bot.games > 0 && bot.tuning.recommendation !== 'hold')
        .sort((a, b) => Math.abs(b.tuning.ratingAdjustment) - Math.abs(a.tuning.ratingAdjustment))
        .map((bot) => ({
            botId: bot.botId,
            level: bot.level,
            recommendation: bot.tuning.recommendation,
            ratingAdjustment: bot.tuning.ratingAdjustment,
            reasons: bot.tuning.reasons
        }));

    return {
        summary: {
            totalMatches: matches.length,
            calibratedBots: Object.values(byBot).filter((bot) => bot.games > 0).length,
            totalBotGames: Object.values(byBot).reduce((sum, bot) => sum + bot.games, 0),
            averageCriticalErrorRate: roundTo(
                Object.values(byBot).reduce((sum, bot) => sum + bot.criticalErrors, 0)
                / Math.max(1, Object.values(byBot).reduce((sum, bot) => sum + bot.moveCount, 0))
            )
        },
        targets: buildBotCalibrationTable(),
        levels,
        gates: {
            level15Over10: buildGate(15, 10, levels),
            level10Over5: buildGate(10, 5, levels)
        },
        byBot,
        recommendations
    };
}

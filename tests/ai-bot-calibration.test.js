import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildBotCalibrationReport,
    buildBotCalibrationTable,
    getBotCalibrationTarget
} from '../src/ai/AIBotCalibration.js';

function move(color, botId, extras = {}) {
    return {
        color,
        ai: {
            botId,
            openingBook: Boolean(extras.openingBook),
            openingDataScore: extras.openingDataScore ?? null,
            search: {
                chosen: {
                    dangerLevel: extras.dangerLevel ?? 0,
                    replyCaptureValue: extras.replyCaptureValue ?? 0,
                    staticExchange: extras.staticExchange ?? 0,
                    terminalWin: Boolean(extras.terminalWin)
                }
            }
        }
    };
}

function botMatch(id, whiteBotId, blackBotId, winner, moves) {
    return {
        id,
        winner,
        resultType: winner === 'draw' ? 'max_moves_draw' : 'checkmate',
        scenario: {
            kind: 'bot',
            white: { botId: whiteBotId },
            black: { botId: blackBotId }
        },
        moves
    };
}

test('faz 11 bot kalibrasyon hedefleri level arttikca sikilasir', () => {
    const table = buildBotCalibrationTable();
    const level5 = getBotCalibrationTarget('bot_05_bozkir_suvarisi');
    const level10 = getBotCalibrationTarget('bot_10_demir_pence');
    const level15 = getBotCalibrationTarget('bot_15_aksak_demir');

    assert.equal(table.length, 15);
    assert.ok(level15.targetRating > level10.targetRating);
    assert.ok(level10.targetRating > level5.targetRating);
    assert.ok(level15.maxCriticalErrorRate < level10.maxCriticalErrorRate);
    assert.ok(level10.maxCriticalErrorRate < level5.maxCriticalErrorRate);
    assert.ok(level15.minEndgameConversionRate > level10.minEndgameConversionRate);
});

test('faz 11 bot-vs-bot liginden guc farki ve tune onerisi cikarir', () => {
    const matches = [
        botMatch('m1', 'bot_10_demir_pence', 'bot_15_aksak_demir', 'black', [
            move('white', 'bot_10_demir_pence', { staticExchange: -80, replyCaptureValue: 110 }),
            move('black', 'bot_15_aksak_demir', { openingBook: true, openingDataScore: 0.72, terminalWin: true })
        ]),
        botMatch('m2', 'bot_15_aksak_demir', 'bot_10_demir_pence', 'white', [
            move('white', 'bot_15_aksak_demir', { openingBook: true, openingDataScore: 0.76, terminalWin: true }),
            move('black', 'bot_10_demir_pence', { dangerLevel: 3 })
        ]),
        botMatch('m3', 'bot_05_bozkir_suvarisi', 'bot_10_demir_pence', 'black', [
            move('white', 'bot_05_bozkir_suvarisi', { staticExchange: -95 }),
            move('black', 'bot_10_demir_pence', { openingBook: true, openingDataScore: 0.62, terminalWin: true })
        ]),
        botMatch('m4', 'bot_10_demir_pence', 'bot_05_bozkir_suvarisi', 'white', [
            move('white', 'bot_10_demir_pence', { openingBook: true, openingDataScore: 0.66, terminalWin: true }),
            move('black', 'bot_05_bozkir_suvarisi', { replyCaptureValue: 120 })
        ])
    ];

    const report = buildBotCalibrationReport(matches);
    const level5 = report.byBot.bot_05_bozkir_suvarisi;
    const level10 = report.byBot.bot_10_demir_pence;
    const level15 = report.byBot.bot_15_aksak_demir;

    assert.equal(report.summary.totalMatches, 4);
    assert.equal(report.gates.level15Over10.status, 'pass');
    assert.equal(report.gates.level10Over5.status, 'pass');
    assert.ok(level15.scoreRate > level10.scoreRate);
    assert.ok(level10.scoreRate > level5.scoreRate);
    assert.ok(level10.criticalErrorRate > level15.criticalErrorRate);
    assert.ok(level15.tuning.ratingAdjustment > 0);
    assert.ok(level5.tuning.reasons.includes('critical-error-rate'));
});

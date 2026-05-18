import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_AI_BOT_ID,
    getAIBot,
    getAIBotSelectionCards,
    getAllAIBots,
    isAIBotId
} from '../src/ai/AIBots.js';

test('bot katalogu 15 bot ve varsayilan bot tasir', () => {
    const bots = getAllAIBots();

    assert.equal(bots.length, 15);
    assert.equal(DEFAULT_AI_BOT_ID, 'bot_07_ulug_bey');
    assert.equal(isAIBotId('bot_15_aksak_demir'), true);
    assert.equal(isAIBotId('unknown'), false);
});

test('botlar 1-5 yildiz araliginda ve 1-15 level araliginda siralanir', () => {
    const bots = getAllAIBots();

    assert.deepEqual(bots.map((bot) => bot.level), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    assert.deepEqual(bots.map((bot) => bot.stars), [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]);
    assert.equal(bots[0].stars, 1);
    assert.equal(bots[14].stars, 5);
});

test('bot motor ayarlari zorluk ve karakter bilgisi tasir', () => {
    const easyBot = getAIBot('bot_01_cirak_alp');
    const hardBot = getAIBot('bot_15_aksak_demir');

    assert.equal(easyBot.difficulty, 'easy');
    assert.equal(hardBot.difficulty, 'hard');
    assert.equal(easyBot.personaId, 'timur');
    assert.equal(hardBot.personaId, 'timur');
    assert.ok(hardBot.engineModifiers.precision > easyBot.engineModifiers.precision);
    assert.ok(hardBot.openingBookPreferences.length > 0);
});

test('bot katalogu elo ve kalibrasyon verisini seviyeye gore artirir', () => {
    const bots = getAllAIBots();

    bots.forEach((bot) => {
        assert.ok(Number.isFinite(bot.rating));
        assert.ok(bot.rating >= 400);
        assert.ok(Number.isFinite(bot.calibration?.strengthScore));
        assert.ok(Number.isFinite(bot.calibration?.search?.rootMoveScale));
        assert.ok(Number.isFinite(bot.calibration?.selection?.preferBestProbabilityDelta));
        assert.ok(Number.isFinite(bot.calibration?.weights?.endgameScale));
    });

    for (let index = 1; index < bots.length; index++) {
        assert.ok(bots[index].rating > bots[index - 1].rating);
        assert.ok(bots[index].calibration.strengthScore > bots[index - 1].calibration.strengthScore);
    }
});

test('bot secim kartlari klasik mod ve 15 botu yerel metinlerle tasir', () => {
    const cards = getAIBotSelectionCards('tr');

    assert.equal(cards.length, 16);
    assert.equal(cards[0].id, '');
    assert.equal(cards[0].isClassic, true);
    assert.equal(cards[0].labelKey, 'ai.bot.classic');
    assert.equal(cards[1].id, 'bot_01_cirak_alp');
    assert.equal(cards[1].levelText, 'Seviye 1');
    assert.match(cards[1].ratingText, /^ELO /);
    assert.equal(cards[1].starsLabel, '1 yıldız');
    assert.equal(cards[1].starsText, '★☆☆☆☆');
    assert.equal(cards[15].id, 'bot_15_aksak_demir');
    assert.equal(cards[15].levelText, 'Seviye 15');
    assert.match(cards[15].ratingText, /^ELO /);
    assert.equal(cards[15].starsLabel, '5 yıldız');
    assert.equal(cards[15].starsText, '★★★★★');
});

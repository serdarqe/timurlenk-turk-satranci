import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('bot menu marks bots defeated by the player', () => {
    const main = readProjectFile('src/main.js');
    const menuCss = readProjectFile('src/styles/menu.css');
    const landscapeCss = readProjectFile('src/styles/orientation-landscape.css');
    const i18n = readProjectFile('src/utils/i18n.js');

    assert.match(main, /AI_BOT_DEFEATED_KEY\s*=\s*'timur_ai_bot_defeated_v1'/);
    assert.match(main, /function markAiBotDefeatedByPlayer/);
    assert.match(main, /winner !== playerColor/);
    assert.match(main, /card\.classList\.add\('is-defeated'\)/);
    assert.match(main, /ai-bot-defeated-badge/);
    assert.match(main, /markAiBotDefeatedByPlayer\(\{ state: gameState, winner, resultType \}\)/);
    assert.match(i18n, /'ai\.bot\.defeated_badge': 'Yenildi'/);
    assert.match(i18n, /'ai\.bot\.defeated_badge': 'Defeated'/);
    assert.match(menuCss, /#bot-menu \.ai-bot-card\.is-defeated/);
    assert.match(menuCss, /#bot-menu \.ai-bot-defeated-badge/);
    assert.match(landscapeCss, /#bot-menu \.ai-bot-defeated-badge span/);
});

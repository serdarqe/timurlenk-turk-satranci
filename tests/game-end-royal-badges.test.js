import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('game end shows royal badges before opening the result overlay', () => {
    const mainSource = readProjectFile('src/main.js');
    const boardRendererSource = readProjectFile('src/ui/BoardRenderer.js');
    const boardCss = readProjectFile('src/styles/board.css');
    const i18nSource = readProjectFile('src/utils/i18n.js');

    assert.match(mainSource, /GAME_END_ROYAL_BADGE_DELAY_MS\s*=\s*2000/);
    assert.match(mainSource, /revealGameEndRoyalBadges\(winner\)/);
    assert.match(mainSource, /scheduleGameEndResultOverlay\(\{[\s\S]*delayMs:\s*shouldDelayResultOverlay \? GAME_END_ROYAL_BADGE_DELAY_MS : 0/);
    assert.match(mainSource, /gameState\.showRoyalResultBadges\s*=\s*true/);

    assert.match(boardRendererSource, /_syncRoyalResultBadges\(\)/);
    assert.match(boardRendererSource, /royal-result-badge is-\$\{role\}/);
    assert.match(boardRendererSource, /GameRules\.getRoyalRank/);
    assert.match(boardRendererSource, /PIECE_TYPES\.KING/);

    assert.match(boardCss, /\.royal-result-badge\s*\{/);
    assert.match(boardCss, /\.royal-result-badge\.is-winner\s*\{/);
    assert.match(boardCss, /\.royal-result-badge\.is-loser\s*\{/);
    assert.match(boardCss, /royalResultBadgeEnter/);

    assert.match(i18nSource, /game_end\.royal_badge\.winner/);
    assert.match(i18nSource, /game_end\.royal_badge\.loser/);
});

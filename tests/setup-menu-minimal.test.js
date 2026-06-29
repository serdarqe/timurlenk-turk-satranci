import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const menuCss = readFileSync(new URL('../src/styles/menu.css', import.meta.url), 'utf8');

test('match setup keeps primary choices visible and moves details into a tabbed sheet', () => {
    assert.match(html, /id="match-setup-summary"/);
    assert.match(html, /id="btn-open-setup-sheet"/);
    assert.match(html, /id="match-settings-sheet"[\s\S]*role="dialog"/);
    assert.match(html, /data-setup-tab="formation"/);
    assert.match(html, /data-setup-tab="color"/);
    assert.match(html, /data-setup-tab="time"/);
    assert.match(html, /class="difficulty-cards setup-choice-row"/);
    assert.match(html, /class="ai-persona-cards setup-choice-row setup-choice-row--four"/);
    assert.match(html, /class="player-color-cards setup-sheet-color-cards"/);
});

test('match setup summary and settings sheet are wired in JavaScript', () => {
    assert.match(mainJs, /function updateMatchSetupSummary\(\)/);
    assert.match(mainJs, /function setSetupSheetOpen\(isOpen\)/);
    assert.match(mainJs, /function activateSetupTab\(tabName = 'formation'\)/);
    assert.match(mainJs, /btnOpenSetupSheet\?\.addEventListener\('click'/);
    assert.match(mainJs, /setupTabButtons\.forEach\(button =>/);
});

test('minimal match setup CSS overrides the old dense formation grid', () => {
    assert.match(menuCss, /Faz 14 .*Minimal maç kurulumu/);
    assert.match(menuCss, /#formation-menu \.setup-summary-card/);
    assert.match(menuCss, /#formation-menu \.setup-sheet/);
    assert.match(menuCss, /#formation-menu \.setup-choice-row/);
});

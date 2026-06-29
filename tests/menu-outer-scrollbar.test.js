import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('formation and bot menu lock the outer panel while keeping the bot list scrollable', () => {
    const menuCss = readProjectFile('src/styles/menu.css');
    const portraitCss = readProjectFile('src/styles/orientation-portrait.css');

    assert.match(menuCss, /#formation-menu \.menu-box,\s*#bot-menu \.menu-box\s*\{[\s\S]*overflow:\s*hidden !important/);
    assert.match(menuCss, /#formation-menu \.menu-box,\s*#bot-menu \.menu-box\s*\{[\s\S]*scrollbar-width:\s*none !important/);
    assert.match(menuCss, /#formation-menu \.menu-box::\-webkit-scrollbar,\s*#bot-menu \.menu-box::\-webkit-scrollbar\s*\{[\s\S]*display:\s*none !important/);
    assert.match(portraitCss, /#main-menu,\s*:root\[data-orientation="portrait"\] #formation-menu,\s*:root\[data-orientation="portrait"\] #bot-menu[\s\S]*overflow:\s*hidden !important/);
    assert.match(portraitCss, /#formation-menu \.menu-box,\s*:root\[data-orientation="portrait"\] #bot-menu \.menu-box/);
    assert.match(portraitCss, /#formation-menu \.menu-box,\s*:root\[data-orientation="portrait"\] #bot-menu \.menu-box[\s\S]*overflow:\s*hidden !important/);
    assert.match(portraitCss, /#bot-menu \.menu-box::\-webkit-scrollbar/);

    // The inner bot list remains independently scrollable for the 15-bot grid.
    assert.match(menuCss, /\.ai-bot-list\s*\{[\s\S]*overflow-y:\s*auto/);
    assert.match(portraitCss, /#bot-menu \.ai-bot-list,\s*:root:not\(\[data-orientation\]\) #bot-menu \.ai-bot-list\s*\{[\s\S]*overflow-y:\s*auto !important/);
    assert.doesNotMatch(menuCss, /\.ai-bot-list::\-webkit-scrollbar\s*\{[\s\S]*display:\s*none/);
});

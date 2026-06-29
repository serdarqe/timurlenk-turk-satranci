import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const menuCss = readFileSync(new URL('../src/styles/menu.css', import.meta.url), 'utf8');
const tutorialCss = readFileSync(new URL('../src/styles/tutorial.css', import.meta.url), 'utf8');
const analysisCss = readFileSync(new URL('../src/styles/analysis.css', import.meta.url), 'utf8');
const mainCss = readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8');

function ruleBody(css, selector) {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `${selector} rule should exist`);
    const bodyStart = css.indexOf('{', start) + 1;
    const bodyEnd = css.indexOf('\n}', bodyStart);
    assert.notEqual(bodyEnd, -1, `${selector} rule should close`);
    return css.slice(bodyStart, bodyEnd);
}

test('tab transitions use lightweight transform and opacity animations', () => {
    assert.match(menuCss, /@keyframes setupTabPanelEnter[\s\S]*opacity[\s\S]*transform/);
    assert.match(tutorialCss, /@keyframes tutorialTabContentEnter[\s\S]*opacity[\s\S]*transform/);
    assert.match(analysisCss, /@keyframes analysisTabPanelEnter[\s\S]*opacity[\s\S]*transform/);
});

test('tab buttons avoid transition all and preserve reduced motion fallback', () => {
    assert.doesNotMatch(ruleBody(tutorialCss, '.tutorial-tab'), /transition:\s*all/);
    assert.doesNotMatch(ruleBody(analysisCss, '.analysis-tab-btn'), /transition:\s*all/);
    assert.match(mainCss, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(mainCss, /#formation-menu \.setup-tab:hover/);
    assert.match(mainCss, /\.tutorial-tab:hover/);
    assert.match(mainCss, /\.analysis-tab-btn:hover/);
});

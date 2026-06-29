import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const historicalCss = fs.readFileSync(path.join(projectRoot, 'src', 'styles', 'historical-theme.css'), 'utf8');

test('historical theme uses a light period backdrop for the app and game scene', () => {
    assert.match(historicalCss, /Faz 13 .*Açık tarihsel sahne zemini/);
    assert.match(
        historicalCss,
        /:root\[data-historical-theme="on"\] body,[\s\S]*:root\[data-historical-theme="on"\] #game-view\s*\{[\s\S]*background-color:\s*#ead9ac/
    );
    assert.match(historicalCss, /var\(--bg-pattern-url\)/);
    assert.match(historicalCss, /var\(--bg-parchment-url\)/);
});

test('board backdrop is warm and textured instead of a dark blue stage layer', () => {
    assert.match(
        historicalCss,
        /:root\[data-historical-theme="on"\] \.board-container::before\s*\{[\s\S]*rgba\(255,\s*252,\s*236,\s*0\.38\)/
    );
    assert.doesNotMatch(
        historicalCss,
        /Faz 13[\s\S]*\.board-container::before\s*\{[\s\S]*var\(--color-lapis-deep\)/
    );
});

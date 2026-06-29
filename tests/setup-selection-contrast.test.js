import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const historicalCss = readFileSync(
    new URL('../src/styles/historical-theme.css', import.meta.url),
    'utf8'
);
const portraitCss = readFileSync(
    new URL('../src/styles/orientation-portrait.css', import.meta.url),
    'utf8'
);

function channel(value) {
    const normalized = value / 255;
    return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
    const value = hex.replace('#', '');
    return (0.2126 * channel(Number.parseInt(value.slice(0, 2), 16)))
        + (0.7152 * channel(Number.parseInt(value.slice(2, 4), 16)))
        + (0.0722 * channel(Number.parseInt(value.slice(4, 6), 16)));
}

function contrastRatio(foreground, background) {
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    return (lighter + 0.05) / (darker + 0.05);
}

test('selected setup cards use a clearly contrasting historical palette without motion or resizing', () => {
    const surface = '#285e63';
    const surfaceDeep = '#1d474b';
    const text = '#fff4d6';

    assert.ok(contrastRatio(text, surface) >= 4.5);
    assert.ok(contrastRatio(text, surfaceDeep) >= 4.5);

    assert.match(historicalCss, /--setup-selected-surface:\s*#285e63\s*;/i);
    assert.match(historicalCss, /--setup-selected-surface-deep:\s*#1d474b\s*;/i);
    assert.match(historicalCss, /--setup-selected-text:\s*#fff4d6\s*;/i);
    assert.match(historicalCss, /#formation-menu \.card\.selected\s*\{[\s\S]*?var\(--setup-selected-surface\)[\s\S]*?var\(--setup-selected-surface-deep\)/);
    assert.match(historicalCss, /#formation-menu \.card\.selected (?:h3|h3,)[\s\S]*?color:\s*var\(--setup-selected-text\)\s*!important\s*;/);
    assert.match(portraitCss, /#formation-menu \.card\.selected[\s\S]*?var\(--setup-selected-surface\)[\s\S]*?var\(--setup-selected-surface-deep\)/);
    assert.match(portraitCss, /#formation-menu \.card\.selected h3,[\s\S]*?#formation-menu \.card\.selected p[\s\S]*?color:\s*var\(--setup-selected-text\)\s*!important\s*;/);

    const selectedRule = historicalCss.match(/#formation-menu \.card\.selected\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    assert.doesNotMatch(selectedRule, /animation|transition|scale\(|width|height|padding|font-size/);
});

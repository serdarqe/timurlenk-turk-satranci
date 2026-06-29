import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const portraitCss = readFileSync(new URL('../src/styles/orientation-portrait.css', import.meta.url), 'utf8');

test('portrait main and setup menus use expanded panel heights without changing control scale', () => {
    assert.match(portraitCss, /Faz 15 .*Portre menüleri ekrana daha tok oturtma/);
    assert.match(portraitCss, /--portrait-main-menu-height:\s*min\(var\(--portrait-panel-height\),\s*clamp\(590px,\s*78dvh,\s*690px\)\)/);
    assert.match(portraitCss, /--portrait-setup-menu-height:\s*min\(var\(--portrait-panel-height\),\s*clamp\(600px,\s*76dvh,\s*680px\)\)/);
    assert.match(portraitCss, /#main-menu \.menu-box[\s\S]*height:\s*var\(--portrait-main-menu-height\)/);
    assert.match(portraitCss, /#formation-menu \.menu-box[\s\S]*height:\s*var\(--portrait-setup-menu-height\)/);
});

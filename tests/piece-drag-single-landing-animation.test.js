import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('drag-drop never hands off ghost animation while tap and ai keep the shared short speed', () => {
    const touchInteraction = read('src/ui/TouchInteraction.js');
    const boardRenderer = read('src/ui/BoardRenderer.js');

    assert.doesNotMatch(touchInteraction, /ghost:\s*state\.ghost/);
    assert.doesNotMatch(touchInteraction, /startRect:/);
    assert.match(touchInteraction, /instantDrop:\s*true/);
    assert.match(touchInteraction, /if \(isLegalDrop\) \{\s*this\._cleanupPieceDrag\(\);\s*this\.onDragDrop\?\.\(coords\.row, coords\.col, dragContext\);/);

    assert.match(boardRenderer, /const DEFAULT_MOVE_ANIMATION_MS\s*=\s*140/);
    assert.doesNotMatch(boardRenderer, /handoffGhost/);
    assert.doesNotMatch(boardRenderer, /dragStartRect/);
    assert.match(boardRenderer, /const durationMs\s*=\s*options\?\.durationMs\s*\?\?\s*DEFAULT_MOVE_ANIMATION_MS/);
    assert.match(boardRenderer, /instant:\s*Boolean\(options\?\.dragContext\?\.instantDrop\)/);
});

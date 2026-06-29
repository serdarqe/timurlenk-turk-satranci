import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const touchSource = readProjectFile('src/ui/TouchInteraction.js');
const boardRendererSource = readProjectFile('src/ui/BoardRenderer.js');
const mobileTouchCss = readProjectFile('src/styles/mobile-touch.css');

test('touch interaction supports drag-select-drop without bypassing board move validation', () => {
    assert.match(boardRendererSource, /_ensureTouchInteraction\(\)/);
    assert.match(boardRendererSource, /_fullRender\(\)\s*\{[\s\S]*this\._ensureTouchInteraction\(\)/);
    assert.match(touchSource, /_startPieceDrag\(touch\)/);
    assert.match(touchSource, /this\.onDragSelect\?\.\(candidate\.row,\s*candidate\.col\)/);
    assert.match(touchSource, /this\.canDropOn\?\.\(coords\.row,\s*coords\.col\)/);
    assert.match(touchSource, /this\.onDragDrop\?\.\(coords\.row,\s*coords\.col,\s*dragContext\)/);
    assert.match(boardRendererSource, /onDragDrop:\s*\(row,\s*col,\s*dragContext\)\s*=>\s*this\.handleCellClick\(row,\s*col,\s*\{\s*dragContext\s*\}\)/);
});

test('piece drag works when the event target is the cell instead of the piece', () => {
    assert.match(touchSource, /target\?\.closest\?\.\('\.cell'\)/);
    assert.match(touchSource, /cellEl\.querySelector\?\.\('\.piece'\)/);
});

test('piece drag is available for mouse and suppresses the follow-up click after a drop', () => {
    assert.match(touchSource, /_setupMouseListeners\(\)/);
    assert.match(touchSource, /addEventListener\('mousedown',\s*this\._boundMouseDown\)/);
    assert.match(touchSource, /window\.addEventListener\('mousemove',\s*this\._boundMouseMove/);
    assert.match(touchSource, /window\.addEventListener\('mouseup',\s*this\._boundMouseUp/);
    assert.match(touchSource, /_suppressNextClick\s*=\s*true/);
    assert.match(touchSource, /stopImmediatePropagation\(\)/);
});

test('piece drag has a lifted ghost and a dimmed source state for touch screens', () => {
    assert.match(mobileTouchCss, /\.piece\.drag-source\s*\{/);
    assert.match(mobileTouchCss, /\.piece-drag-ghost\s*\{/);
    assert.match(mobileTouchCss, /\.chess-board\.piece-dragging\s*\{/);
    assert.match(touchSource, /scale\(1\.18\)/);
});

test('piece drag follows the grabbed point and commits without ghost handoff', () => {
    assert.match(touchSource, /grabOffsetX:\s*touch\.clientX\s*-\s*pieceRect\.left/);
    assert.match(touchSource, /grabOffsetY:\s*touch\.clientY\s*-\s*pieceRect\.top/);
    assert.match(touchSource, /_getDragVisualOffset\(\)/);
    assert.match(touchSource, /const coords\s*=\s*this\._getCoordsFromPoint\(clientX,\s*clientY\)/);
    assert.match(touchSource, /instantDrop:\s*true/);
    assert.doesNotMatch(touchSource, /ghost:\s*state\.ghost/);
    assert.doesNotMatch(touchSource, /startRect:/);
    assert.match(touchSource, /if \(isLegalDrop\) \{\s*this\._cleanupPieceDrag\(\);/);
    assert.match(boardRendererSource, /instant:\s*Boolean\(options\?\.dragContext\?\.instantDrop\)/);
});

test('player and ai movement use the same short animation speed', () => {
    assert.match(boardRendererSource, /const DEFAULT_MOVE_ANIMATION_MS\s*=\s*140/);
    assert.match(boardRendererSource, /const durationMs\s*=\s*options\?\.durationMs\s*\?\?\s*DEFAULT_MOVE_ANIMATION_MS/);
    assert.match(boardRendererSource, /instant:\s*Boolean\(options\?\.dragContext\?\.instantDrop\)/);
    assert.doesNotMatch(boardRendererSource, /handoffGhost/);
    assert.doesNotMatch(boardRendererSource, /dragStartRect/);
    assert.match(boardRendererSource, /setTimeout\(finishAnimation,\s*durationMs\s*\+\s*90\)/);
    assert.match(readProjectFile('src/styles/pieces.css'), /transition:\s*opacity 140ms ease,\s*transform 140ms ease/);
});

test('long-press magnifier is disabled by default so dragging stays unobstructed', () => {
    assert.match(touchSource, /this\._magnifierEnabled\s*=\s*options\.enableMagnifier\s*===\s*true/);
    assert.match(touchSource, /if\s*\(this\._magnifierEnabled\)\s*\{[\s\S]*this\._showMagnifier\(touch\.clientX,\s*touch\.clientY\)/);
    assert.match(touchSource, /_showMagnifier\(clientX,\s*clientY\)\s*\{[\s\S]*if\s*\(!this\._magnifierEnabled\)\s*return/);
});

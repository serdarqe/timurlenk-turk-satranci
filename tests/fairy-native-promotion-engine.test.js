import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('native Fairy engine emits Timur promotion suffix moves for fixed pawn promotions', () => {
    const result = spawnSync(process.execPath, [
        'scripts/validate-fairy-native-promotion.mjs',
        '--json'
    ], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 30000
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const jsonLine = result.stdout
        .trim()
        .split(/\r?\n/)
        .findLast((line) => line.trim().startsWith('{'));
    const payload = JSON.parse(jsonLine);
    assert.equal(payload.ok, true);
    assert.equal(payload.variant, 'timur');
    assert.equal(payload.fromTo, 'e9e10');
    assert.equal(payload.missingPromotionMoves.length, 0);
    assert.ok(payload.promotionMoves.includes('e9e10v'));
    assert.ok(payload.promotionMoves.includes('e9e10z'));
    assert.ok(payload.promotionMoves.includes('e9e10q'));
});

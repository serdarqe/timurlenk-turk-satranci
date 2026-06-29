import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildCitadelOffboardTokenFromMove,
    evaluateCitadelOffboardNativeSmoke,
    getCitadelOffboardNativeSmokeCases,
    parseCitadelOffboardToken
} from '../src/fairy/FairyCitadelOffboardNativeSmoke.js';
import { parsePerftRootMoves } from '../scripts/fairy-citadel-offboard-smoke-runner.mjs';

test('citadel off-board smoke defines both opponent citadel entry cases', () => {
    const cases = getCitadelOffboardNativeSmokeCases();

    assert.deepEqual(
        cases.map((entry) => entry.id),
        [
            'white_king_to_black_offboard_citadel',
            'black_king_to_white_offboard_citadel'
        ]
    );
    assert.equal(cases[0].jsMoveId, 'a10->citadel:black');
    assert.equal(cases[1].jsMoveId, 'k1->citadel:white');
});

test('citadel off-board smoke blocks native promotion when native UCI cannot encode citadel squares', () => {
    const report = evaluateCitadelOffboardNativeSmoke([
        {
            id: 'white_king_to_black_offboard_citadel',
            jsMovePresent: true,
            nativeRootMoves: ['a10a9', 'a10b10', 'a10b9']
        },
        {
            id: 'black_king_to_white_offboard_citadel',
            jsMovePresent: true,
            nativeRootMoves: ['k1j1', 'k1j2', 'k1k2']
        }
    ]);

    assert.equal(report.nativeOffboardCitadelSemantics, false);
    assert.deepEqual(report.blockers, ['native_offboard_citadel_semantics_missing']);
    assert.equal(report.cases.every((entry) => entry.jsMovePresent), true);
    assert.equal(report.cases.every((entry) => entry.nativeOffboardMovePresent), false);
});

test('citadel off-board smoke passes only when every native case reports an explicit off-board token', () => {
    const report = evaluateCitadelOffboardNativeSmoke([
        {
            id: 'white_king_to_black_offboard_citadel',
            jsMovePresent: true,
            nativeRootMoves: ['a10@blackcitadel']
        },
        {
            id: 'black_king_to_white_offboard_citadel',
            jsMovePresent: true,
            nativeRootMoves: ['k1@whitecitadel']
        }
    ]);

    assert.equal(report.nativeOffboardCitadelSemantics, true);
    assert.deepEqual(report.blockers, []);
});

test('citadel off-board token parser maps native tokens to JS citadel moves', () => {
    assert.deepEqual(parseCitadelOffboardToken('A10@BlackCitadel'), {
        token: 'a10@blackcitadel',
        fromSquare: 'a10',
        from: { row: 0, col: 0 },
        to: { row: 0, col: -1, label: 'citadel:black' },
        jsMoveId: 'a10->citadel:black',
        nativeTarget: 'blackcitadel'
    });
    assert.deepEqual(parseCitadelOffboardToken('k1@whitecitadel'), {
        token: 'k1@whitecitadel',
        fromSquare: 'k1',
        from: { row: 9, col: 10 },
        to: { row: 9, col: 11, label: 'citadel:white' },
        jsMoveId: 'k1->citadel:white',
        nativeTarget: 'whitecitadel'
    });
    assert.equal(parseCitadelOffboardToken('a10a9'), null);
});

test('citadel off-board token builder creates the canonical native token from JS wrapper moves', () => {
    assert.equal(buildCitadelOffboardTokenFromMove({
        from: 'a10',
        to: 'citadel:black',
        toRow: 0,
        toCol: -1
    }), 'a10@blackcitadel');

    assert.equal(buildCitadelOffboardTokenFromMove({
        from: 'k1',
        to: 'citadel:white',
        toRow: 9,
        toCol: 11
    }), 'k1@whitecitadel');
});

test('citadel smoke parser keeps native off-board token root moves from perft output', () => {
    assert.deepEqual(parsePerftRootMoves([
        'a10a9: 1',
        'a10@blackcitadel: 1',
        'Nodes searched: 4',
        'k1@whitecitadel: 1'
    ]), [
        'a10@blackcitadel',
        'a10a9',
        'k1@whitecitadel'
    ]);
});

test('citadel smoke parser keeps native citadel-exchange root tokens from perft output', () => {
    assert.deepEqual(parsePerftRootMoves([
        'a10@blackcitadel: 1',
        'citadel_exchange:a10:f5@blackcitadel: 1',
        'citadel_exchange:k1:f6@whitecitadel: 1',
        'Nodes searched: 14'
    ]), [
        'a10@blackcitadel',
        'citadel_exchange:a10:f5@blackcitadel',
        'citadel_exchange:k1:f6@whitecitadel'
    ]);
});

test('citadel smoke parser keeps native royal-swap root tokens from perft output', () => {
    assert.deepEqual(parsePerftRootMoves([
        'royal_swap:f1:e2@ransom: 1',
        'royal_swap:f10:e9@ransom: 1',
        'Nodes searched: 18'
    ]), [
        'royal_swap:f1:e2@ransom',
        'royal_swap:f10:e9@ransom'
    ]);
});

test('citadel smoke parser keeps native pawn-cycle root tokens from perft output', () => {
    assert.deepEqual(parsePerftRootMoves([
        'pawn_cycle:e10:e3@stage2: 1',
        'pawn_cycle:e1:e8@stage3: 1',
        'pawn_cycle:f10:f10@adventitious: 1',
        'Nodes searched: 21'
    ]), [
        'pawn_cycle:e1:e8@stage3',
        'pawn_cycle:e10:e3@stage2',
        'pawn_cycle:f10:f10@adventitious'
    ]);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import {
    AdventitiousKing,
    King,
    Prince
} from '../src/game/PieceFactory.js';
import {
    getCitadelDrawNativeEvidenceReport,
    getCitadelDrawNativeEvidenceVerdict
} from '../src/fairy/FairyCitadelDrawNativeEvidence.js';
import { COLORS, GAME_STATES, PIECE_TYPES } from '../src/utils/constants.js';

const ROYAL_FACTORIES = Object.freeze({
    [PIECE_TYPES.KING]: King,
    [PIECE_TYPES.PRINCE]: Prince,
    [PIECE_TYPES.ADVENTITIOUS_KING]: AdventitiousKing
});

test('citadel draw native evidence report describes off-board and result semantics before native promotion', () => {
    const report = getCitadelDrawNativeEvidenceReport();

    assert.equal(report.ruleId, 'citadel_draw');
    assert.equal(report.evidencePhase, 'native_preparation');
    assert.equal(report.ready, false);
    assert.equal(report.jsAuthoritative, true);
    assert.deepEqual(report.offboardCitadels, [
        {
            id: 'black_citadel',
            owner: COLORS.BLACK,
            enteredBy: COLORS.WHITE,
            row: 0,
            col: -1,
            fairySquare: 'citadel:black'
        },
        {
            id: 'white_citadel',
            owner: COLORS.WHITE,
            enteredBy: COLORS.BLACK,
            row: 9,
            col: 11,
            fairySquare: 'citadel:white'
        }
    ]);
    assert.deepEqual(report.requiredNativeEvidence, [
        'wasm_rebuild_after_native_source',
        'native_offboard_citadel_semantics',
        'native_game_result_semantics',
        'native_apply_revert_parity',
        'native_engine_smoke'
    ]);
    assert.deepEqual(report.blockers, [
        'native_source_marker_missing',
        'wasm_rebuild_missing',
        'native_offboard_citadel_semantics_missing',
        'native_game_result_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
    assert.equal(report.resultSemanticsCases.length, 6);
    assert.equal(report.ownCitadelNoDrawCases.length, 2);
});

test('citadel draw native evidence report exposes explicit WASM rebuild evidence', () => {
    const report = getCitadelDrawNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        wasmRebuildEvidence: {
            sourceSha256: 'source-hash',
            sourceLastModifiedAt: '2026-05-19T10:00:00.000Z',
            bundles: [
                {
                    bundle: 'singlethread',
                    ok: true,
                    sourceHashMatches: true,
                    manifestGeneratedAfterSource: true,
                    wasmModifiedAfterSource: true
                }
            ]
        }
    });

    assert.equal(report.wasmRebuildEvidence.sourceSha256, 'source-hash');
    assert.equal(report.wasmRebuildEvidence.bundles[0].bundle, 'singlethread');
    assert.equal(report.blockers.includes('wasm_rebuild_missing'), false);
});

test('citadel draw native evidence report exposes off-board native smoke details', () => {
    const report = getCitadelDrawNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeOffboardCitadelSemantics: false,
        offboardSmoke: {
            nativeOffboardCitadelSemantics: false,
            cases: [
                {
                    id: 'white_king_to_black_offboard_citadel',
                    nativeOffboardMovePresent: false
                }
            ]
        }
    });

    assert.equal(report.offboardSmoke.nativeOffboardCitadelSemantics, false);
    assert.equal(report.offboardSmoke.cases[0].id, 'white_king_to_black_offboard_citadel');
    assert.equal(report.blockers.includes('wasm_rebuild_missing'), false);
    assert.equal(report.blockers.includes('native_offboard_citadel_semantics_missing'), true);
});

test('citadel draw native evidence report exposes game-result bridge smoke details', () => {
    const report = getCitadelDrawNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeOffboardCitadelSemantics: true,
        nativeGameResultSemantics: true,
        gameResultSmoke: {
            nativeGameResultSemantics: true,
            cases: [
                {
                    id: 'white_prince_enters_black_citadel_native_result',
                    jsResultMatches: true,
                    nativeOffboardMovePresent: true
                }
            ]
        }
    });

    assert.equal(report.gameResultSmoke.nativeGameResultSemantics, true);
    assert.equal(report.gameResultSmoke.cases[0].id, 'white_prince_enters_black_citadel_native_result');
    assert.equal(report.blockers.includes('native_offboard_citadel_semantics_missing'), false);
    assert.equal(report.blockers.includes('native_game_result_semantics_missing'), false);
    assert.equal(report.blockers.includes('native_apply_revert_parity_missing'), true);
});

test('citadel draw result semantics cover every royal type for both opponent citadels', () => {
    const report = getCitadelDrawNativeEvidenceReport();

    for (const parityCase of report.resultSemanticsCases) {
        const PieceClass = ROYAL_FACTORIES[parityCase.pieceType];
        const state = new GameState();
        const piece = new PieceClass(parityCase.color, parityCase.from.row, parityCase.from.col);

        state.board.setPiece(parityCase.from.row, parityCase.from.col, piece);
        state.board.movePiece(parityCase.from.row, parityCase.from.col, parityCase.to.row, parityCase.to.col);
        const activePiece = state.board.getPieceAt(parityCase.to.row, parityCase.to.col);
        const effects = GameRules.applyPostMoveEffects(state, activePiece, parityCase.to.row, parityCase.to.col);

        assert.equal(state.status, GAME_STATES.GAME_OVER, parityCase.id);
        assert.equal(state.winner, 'Draw (Hisar)', parityCase.id);

        GameRules.revertPostMoveEffects(state, effects);

        assert.equal(state.status, null, parityCase.id);
        assert.equal(state.winner, null, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.to.row, parityCase.to.col), activePiece, parityCase.id);
    }
});

test('citadel draw native evidence verdict only passes when all native proof is explicit', () => {
    const verdict = getCitadelDrawNativeEvidenceVerdict({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeOffboardCitadelSemantics: true,
        nativeGameResultSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.blockers, []);
});

import {
    getCitadelDrawParityCases,
    getOwnCitadelEntryParityCases
} from './FairyCitadelParity.js';
import { getSpecialRuleNativeTransitionVerdict } from './FairySpecialRuleNativeRisk.js';
import { COLORS, GAME_STATES, PIECE_TYPES } from '../utils/constants.js';

export const CITADEL_DRAW_NATIVE_REQUIRED_EVIDENCE = Object.freeze([
    'wasm_rebuild_after_native_source',
    'native_offboard_citadel_semantics',
    'native_game_result_semantics',
    'native_apply_revert_parity',
    'native_engine_smoke'
]);

export const CITADEL_OFFBOARD_SQUARES = Object.freeze([
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

const RESULT_ROYAL_TYPES = Object.freeze([
    PIECE_TYPES.KING,
    PIECE_TYPES.PRINCE,
    PIECE_TYPES.ADVENTITIOUS_KING
]);

export function getCitadelDrawNativeEvidenceReport(evidence = {}) {
    const verdict = getCitadelDrawNativeEvidenceVerdict(evidence);

    return {
        ruleId: 'citadel_draw',
        evidencePhase: 'native_preparation',
        ready: verdict.allowed,
        jsAuthoritative: !verdict.allowed,
        offboardCitadels: CITADEL_OFFBOARD_SQUARES.map(cloneSquare),
        resultSemanticsCases: buildResultSemanticsCases(),
        ownCitadelNoDrawCases: getOwnCitadelEntryParityCases(),
        requiredNativeEvidence: [...CITADEL_DRAW_NATIVE_REQUIRED_EVIDENCE],
        wasmRebuildEvidence: evidence.wasmRebuildEvidence || null,
        offboardSmoke: evidence.offboardSmoke || null,
        gameResultSmoke: evidence.gameResultSmoke || null,
        blockers: verdict.blockers,
        notes: [
            'Citadel draw is the smallest state-changing special rule.',
            'Native promotion requires off-board coordinate support, exact draw result semantics, apply/revert parity and a Fairy engine smoke proof.'
        ]
    };
}

export function getCitadelDrawNativeEvidenceVerdict(evidence = {}) {
    return getSpecialRuleNativeTransitionVerdict('citadel_draw', evidence);
}

function buildResultSemanticsCases() {
    const cases = [];
    for (const baseCase of getCitadelDrawParityCases()) {
        for (const pieceType of RESULT_ROYAL_TYPES) {
            cases.push({
                id: `${baseCase.id}_${pieceType}`,
                color: baseCase.color,
                pieceType,
                from: { ...baseCase.from },
                to: { ...baseCase.to },
                citadel: baseCase.citadel,
                expectedStatus: GAME_STATES.GAME_OVER,
                expectedWinner: 'Draw (Hisar)'
            });
        }
    }
    return cases;
}

function cloneSquare(square) {
    return { ...square };
}

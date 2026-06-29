import { COLORS, GAME_STATES } from '../utils/constants.js';

export const CITADEL_DRAW_PARITY_CASES = Object.freeze([
    {
        id: 'white_king_enters_black_citadel_draw',
        color: COLORS.WHITE,
        from: { row: 0, col: 0 },
        to: { row: 0, col: -1 },
        citadel: 'black',
        expectedStatus: GAME_STATES.GAME_OVER,
        expectedWinner: 'Draw (Hisar)'
    },
    {
        id: 'black_king_enters_white_citadel_draw',
        color: COLORS.BLACK,
        from: { row: 9, col: 10 },
        to: { row: 9, col: 11 },
        citadel: 'white',
        expectedStatus: GAME_STATES.GAME_OVER,
        expectedWinner: 'Draw (Hisar)'
    }
]);

export const OWN_CITADEL_ENTRY_PARITY_CASES = Object.freeze([
    {
        id: 'white_adventitious_king_enters_white_citadel_no_draw',
        color: COLORS.WHITE,
        from: { row: 9, col: 10 },
        to: { row: 9, col: 11 },
        citadel: 'white',
        expectedStatus: null,
        expectedWinner: null
    },
    {
        id: 'black_adventitious_king_enters_black_citadel_no_draw',
        color: COLORS.BLACK,
        from: { row: 0, col: 0 },
        to: { row: 0, col: -1 },
        citadel: 'black',
        expectedStatus: null,
        expectedWinner: null
    }
]);

export function getCitadelDrawParityCases() {
    return CITADEL_DRAW_PARITY_CASES.map(cloneCase);
}

export function getOwnCitadelEntryParityCases() {
    return OWN_CITADEL_ENTRY_PARITY_CASES.map(cloneCase);
}

function cloneCase(item) {
    return {
        ...item,
        from: { ...item.from },
        to: { ...item.to }
    };
}

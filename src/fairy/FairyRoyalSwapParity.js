import { COLORS } from '../utils/constants.js';

export const ROYAL_SWAP_PARITY_CASES = Object.freeze([
    {
        id: 'white_king_ransom_swaps_with_rook_while_in_check',
        color: COLORS.WHITE,
        enemyColor: COLORS.BLACK,
        kingFrom: { row: 9, col: 5 },
        targetFrom: { row: 8, col: 4 },
        checkerFrom: { row: 9, col: 0 },
        enemyKingFrom: { row: 0, col: 0 },
        expectedStatus: null,
        expectedWinner: null
    },
    {
        id: 'black_king_ransom_swaps_with_rook_while_in_check',
        color: COLORS.BLACK,
        enemyColor: COLORS.WHITE,
        kingFrom: { row: 0, col: 5 },
        targetFrom: { row: 1, col: 4 },
        checkerFrom: { row: 0, col: 10 },
        enemyKingFrom: { row: 9, col: 10 },
        expectedStatus: null,
        expectedWinner: null
    }
]);

export function getRoyalSwapParityCases() {
    return ROYAL_SWAP_PARITY_CASES.map((item) => ({
        ...item,
        kingFrom: { ...item.kingFrom },
        targetFrom: { ...item.targetFrom },
        checkerFrom: { ...item.checkerFrom },
        enemyKingFrom: { ...item.enemyKingFrom }
    }));
}

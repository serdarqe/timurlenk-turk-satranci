import { COLORS } from '../utils/constants.js';

export const CITADEL_EXCHANGE_PARITY_CASES = Object.freeze([
    {
        id: 'white_king_exchanges_prince_through_black_citadel',
        color: COLORS.WHITE,
        royalFrom: { row: 0, col: 0 },
        targetRoyalFrom: { row: 5, col: 5 },
        citadel: { row: 0, col: -1 },
        expectedStatus: null,
        expectedWinner: null
    },
    {
        id: 'black_king_exchanges_prince_through_white_citadel',
        color: COLORS.BLACK,
        royalFrom: { row: 9, col: 10 },
        targetRoyalFrom: { row: 4, col: 5 },
        citadel: { row: 9, col: 11 },
        expectedStatus: null,
        expectedWinner: null
    }
]);

export function getCitadelExchangeParityCases() {
    return CITADEL_EXCHANGE_PARITY_CASES.map((item) => ({
        ...item,
        royalFrom: { ...item.royalFrom },
        targetRoyalFrom: { ...item.targetRoyalFrom },
        citadel: { ...item.citadel }
    }));
}

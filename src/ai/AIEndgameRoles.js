import { PIECE_TYPES } from '../utils/constants.js';

export const ENDGAME_ROLES = Object.freeze({
    ROYAL: 'royal',
    PRIMARY_FINISHER: 'primary_finisher',
    DIRECT_NET_HELPER: 'direct_net_helper',
    LEAPER_BLOCKER: 'leaper_blocker',
    LINE_CONTROLLER: 'line_controller',
    PROMOTION_RUNNER: 'promotion_runner'
});

export const ENDGAME_PIECE_ROLES = Object.freeze({
    [PIECE_TYPES.KING]: {
        role: ENDGAME_ROLES.ROYAL,
        summary: 'Ana sıkıştırma taşıdır; rakip şahı kenarda karşılar ve kaçış karelerini kapatır.'
    },
    [PIECE_TYPES.PRINCE]: {
        role: ENDGAME_ROLES.ROYAL,
        summary: 'Terfi sonrası yedek kraliyet taşıdır; kale ağına şah gibi destek verir.'
    },
    [PIECE_TYPES.ADVENTITIOUS_KING]: {
        role: ENDGAME_ROLES.ROYAL,
        summary: 'Yedek kraldır; oyun sonunda rakip şahı yaklaştırma ve hisar riskini kesme görevi alır.'
    },
    [PIECE_TYPES.ROOK]: {
        role: ENDGAME_ROLES.PRIMARY_FINISHER,
        netStrength: 1,
        summary: 'Ana bitirici taştır; sıra/sütun keserek rakip şahı kenara ve köşeye sürer.'
    },
    [PIECE_TYPES.VIZIER]: {
        role: ENDGAME_ROLES.DIRECT_NET_HELPER,
        netStrength: 0.72,
        idealStepDistance: 1,
        summary: 'Düz bir kare kontrol eder; kale mat ağında bitiş karelerini kapatır.'
    },
    [PIECE_TYPES.SEA_MONSTER]: {
        role: ENDGAME_ROLES.DIRECT_NET_HELPER,
        netStrength: 0.72,
        idealStepDistance: 1,
        summary: 'Vezir gibi kısa düz kontrol sağlar; terfi sonrası kale ağına doğrudan destek verir.'
    },
    [PIECE_TYPES.GENERAL]: {
        role: ENDGAME_ROLES.DIRECT_NET_HELPER,
        netStrength: 0.68,
        idealStepDistance: 1,
        summary: 'Çapraz bir kare kontrol eder; vezirin kapatamadığı kaçış karelerini tamamlar.'
    },
    [PIECE_TYPES.KNIGHT]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.46,
        idealStepDistance: 2,
        summary: 'Çatal ve sıçrama tehdidiyle kaçış karelerini bozar; tek başına bitirici değildir.'
    },
    [PIECE_TYPES.CAMEL]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.42,
        idealStepDistance: 3,
        summary: 'Uzun L sıçramasıyla uzak kaçış yollarını keser; kale/şah planını destekler.'
    },
    [PIECE_TYPES.DABBABA]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.4,
        idealStepDistance: 2,
        summary: 'Düz iki kare sıçrar; kenar sıkıştırmada ara kaçış karelerini kapatır.'
    },
    [PIECE_TYPES.ELEPHANT]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.36,
        idealStepDistance: 2,
        summary: 'Çapraz iki kare sıçrar; köşe ağına destek olur ama bitirici değildir.'
    },
    [PIECE_TYPES.LION]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.38,
        idealStepDistance: 3,
        summary: 'Üç kare düz sıçrama ile uzak savunma/kapatma görevi görür.'
    },
    [PIECE_TYPES.BULL]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.34,
        idealStepDistance: 3,
        summary: 'Geniş sıçrama tehdidi verir; daha çok alan kesici yardımcıdır.'
    },
    [PIECE_TYPES.REVEALER]: {
        role: ENDGAME_ROLES.LEAPER_BLOCKER,
        netStrength: 0.32,
        idealStepDistance: 3,
        summary: 'Uzak çapraz sıçrama tehdidiyle köşe kaçışlarını destekler.'
    },
    [PIECE_TYPES.GIRAFFE]: {
        role: ENDGAME_ROLES.LINE_CONTROLLER,
        netStrength: 0.52,
        idealStepDistance: 3,
        summary: 'Geniş hat kontrolü kurar; rakip şahı uzun kaçışlardan vazgeçirir.'
    },
    [PIECE_TYPES.PICKET]: {
        role: ENDGAME_ROLES.LINE_CONTROLLER,
        netStrength: 0.5,
        idealStepDistance: 2,
        summary: 'Uzun çapraz kontrolle kaçış yollarını keser; kale ağına alan desteği verir.'
    },
    [PIECE_TYPES.PAWN]: {
        role: ENDGAME_ROLES.PROMOTION_RUNNER,
        netStrength: 0.2,
        summary: 'Asıl oyun sonu görevi güvenli terfidir; terfi sonrası yeni role dönüşür.'
    }
});

export function getEndgamePieceRole(pieceOrType) {
    const type = typeof pieceOrType === 'string' ? pieceOrType : pieceOrType?.type;
    return ENDGAME_PIECE_ROLES[type] || null;
}

export function isPrimaryEndgameFinisher(pieceOrType) {
    return getEndgamePieceRole(pieceOrType)?.role === ENDGAME_ROLES.PRIMARY_FINISHER;
}

export function isDirectNetHelper(pieceOrType) {
    return getEndgamePieceRole(pieceOrType)?.role === ENDGAME_ROLES.DIRECT_NET_HELPER;
}

export function isEndgameSupportPiece(pieceOrType) {
    const role = getEndgamePieceRole(pieceOrType)?.role;
    return role === ENDGAME_ROLES.DIRECT_NET_HELPER
        || role === ENDGAME_ROLES.LEAPER_BLOCKER
        || role === ENDGAME_ROLES.LINE_CONTROLLER;
}

export function getEndgameSupportStrength(pieceOrType) {
    return getEndgamePieceRole(pieceOrType)?.netStrength || 0;
}

export function getEndgameIdealStepDistance(pieceOrType) {
    return getEndgamePieceRole(pieceOrType)?.idealStepDistance || 2;
}

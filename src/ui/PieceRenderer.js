// src/ui/PieceRenderer.js
import { PIECE_TYPES } from '../utils/constants.js';
import { PIECE_SVGS } from './PieceSVGs.js';
import { PIECE_SVGS_WARRIOR } from './PieceSVGs_Warrior.js';
import { PIECE_SVGS_DYNASTY } from './PieceSVGs_Dynasty.js';
import { i18n } from '../utils/i18n.js';
import { userPreferences } from '../utils/UserPreferences.js';
import { themeManager, PIECE_SKINS } from '../utils/ThemeManager.js';

function buildSVGMap(svgs) {
    return {
        [PIECE_TYPES.KING]: svgs.KING,
        [PIECE_TYPES.VIZIER]: svgs.VIZIER,
        [PIECE_TYPES.SEA_MONSTER]: svgs.VIZIER,
        [PIECE_TYPES.GENERAL]: svgs.GENERAL,
        [PIECE_TYPES.KNIGHT]: svgs.KNIGHT,
        [PIECE_TYPES.LION]: svgs.KNIGHT,
        [PIECE_TYPES.ELEPHANT]: svgs.ELEPHANT,
        [PIECE_TYPES.CAMEL]: svgs.CAMEL,
        [PIECE_TYPES.DABBABA]: svgs.DABBABA,
        [PIECE_TYPES.BULL]: svgs.CAMEL,
        [PIECE_TYPES.REVEALER]: svgs.GENERAL,
        [PIECE_TYPES.GIRAFFE]: svgs.GIRAFFE,
        [PIECE_TYPES.PICKET]: svgs.PICKET,
        [PIECE_TYPES.ROOK]: svgs.ROOK,
        [PIECE_TYPES.PAWN]: svgs.PAWN,
        [PIECE_TYPES.PRINCE]: svgs.PRINCE,
        [PIECE_TYPES.ADVENTITIOUS_KING]: svgs.ADVENTITIOUS_KING
    };
}

const SVG_MAPS = {
    [PIECE_SKINS.CLASSIC]: buildSVGMap(PIECE_SVGS),
    [PIECE_SKINS.WARRIOR]: buildSVGMap(PIECE_SVGS_WARRIOR),
    [PIECE_SKINS.DYNASTY]: buildSVGMap(PIECE_SVGS_DYNASTY)
};

function getCurrentSVGMap() {
    const skin = themeManager.getPieceSkin();
    return SVG_MAPS[skin] || SVG_MAPS[PIECE_SKINS.CLASSIC];
}

const PIECE_SHORT_NAMES = {
    tr: {
        [PIECE_TYPES.KING]: 'S',
        [PIECE_TYPES.VIZIER]: 'V',
        [PIECE_TYPES.SEA_MONSTER]: 'DC',
        [PIECE_TYPES.GENERAL]: 'B',
        [PIECE_TYPES.KNIGHT]: 'A',
        [PIECE_TYPES.LION]: 'Ar',
        [PIECE_TYPES.ELEPHANT]: 'F',
        [PIECE_TYPES.CAMEL]: 'D',
        [PIECE_TYPES.DABBABA]: 'Db',
        [PIECE_TYPES.BULL]: 'Bo',
        [PIECE_TYPES.REVEALER]: 'Ks',
        [PIECE_TYPES.GIRAFFE]: 'Z',
        [PIECE_TYPES.PICKET]: 'G',
        [PIECE_TYPES.ROOK]: 'K',
        [PIECE_TYPES.PAWN]: '',
        [PIECE_TYPES.PRINCE]: 'P',
        [PIECE_TYPES.ADVENTITIOUS_KING]: 'ES'
    },
    en: {
        [PIECE_TYPES.KING]: 'K',
        [PIECE_TYPES.VIZIER]: 'V',
        [PIECE_TYPES.SEA_MONSTER]: 'SM',
        [PIECE_TYPES.GENERAL]: 'G',
        [PIECE_TYPES.KNIGHT]: 'N',
        [PIECE_TYPES.LION]: 'Li',
        [PIECE_TYPES.ELEPHANT]: 'E',
        [PIECE_TYPES.CAMEL]: 'C',
        [PIECE_TYPES.DABBABA]: 'D',
        [PIECE_TYPES.BULL]: 'Bu',
        [PIECE_TYPES.REVEALER]: 'Re',
        [PIECE_TYPES.GIRAFFE]: 'Gi',
        [PIECE_TYPES.PICKET]: 'P',
        [PIECE_TYPES.ROOK]: 'R',
        [PIECE_TYPES.PAWN]: '',
        [PIECE_TYPES.PRINCE]: 'Pr',
        [PIECE_TYPES.ADVENTITIOUS_KING]: 'EK'
    }
};

const PIECE_TEMPLATE_CACHE = new Map();

function getBadgeText(type, pawnType, lang) {
    if (!userPreferences.getShowPieceLetters()) {
        return '';
    }

    if (type === PIECE_TYPES.PAWN && pawnType) {
        return pawnType.replace('pawn_of_', '').charAt(0).toUpperCase();
    }

    return PIECE_SHORT_NAMES[lang]?.[type] || PIECE_SHORT_NAMES.tr[type] || '';
}

function buildPieceTemplate(type, color, pawnType, lang) {
    const div = document.createElement('div');
    div.className = `piece ${color} ${type}`;
    div.dataset.type = type;
    div.dataset.color = color;

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'piece-img';

    const svgMap = getCurrentSVGMap();
    const svgTemplate = document.createElement('template');
    svgTemplate.innerHTML = (svgMap[type] || svgMap[PIECE_TYPES.PAWN] || '').trim();
    const svgElement = svgTemplate.content.firstElementChild;
    if (svgElement) {
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.style.display = 'block';
        svgElement.style.pointerEvents = 'none';
        imgWrapper.appendChild(svgElement);
    }

    div.appendChild(imgWrapper);

    const badgeText = getBadgeText(type, pawnType, lang);
    if (badgeText) {
        div.dataset.pawnType = pawnType || '';
        const badge = document.createElement('div');
        badge.className = 'pawn-badge';
        badge.textContent = badgeText;
        div.appendChild(badge);
    }

    return div;
}

export class PieceRenderer {
    static getRenderVariant() {
        const letters = userPreferences.getShowPieceLetters() ? 'letters-on' : 'letters-off';
        const skin = themeManager.getPieceSkin();
        return `${letters}|${skin}`;
    }

    static clearCache() {
        PIECE_TEMPLATE_CACHE.clear();
    }

    static createPieceElement(type, color, pawnType = null) {
        const lang = i18n.getLocale();
        const normalizedPawnType = pawnType || '';
        const cacheKey = `${lang}|${type}|${color}|${normalizedPawnType}|${this.getRenderVariant()}`;

        let template = PIECE_TEMPLATE_CACHE.get(cacheKey);
        if (!template) {
            template = buildPieceTemplate(type, color, normalizedPawnType, lang);
            PIECE_TEMPLATE_CACHE.set(cacheKey, template);
        }

        return template.cloneNode(true);
    }

    static refreshAllPieces() {
        PIECE_TEMPLATE_CACHE.clear();
        const svgMap = getCurrentSVGMap();
        document.querySelectorAll('.piece').forEach(pieceEl => {
            const type = pieceEl.dataset.type;
            if (!type) return;
            const imgWrapper = pieceEl.querySelector('.piece-img');
            if (!imgWrapper) return;
            const svgHtml = (svgMap[type] || svgMap[PIECE_TYPES.PAWN] || '').trim();
            const tpl = document.createElement('template');
            tpl.innerHTML = svgHtml;
            const svgElement = tpl.content.firstElementChild;
            if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgElement.style.display = 'block';
                svgElement.style.pointerEvents = 'none';
                imgWrapper.innerHTML = '';
                imgWrapper.appendChild(svgElement);
            }
        });
    }
}

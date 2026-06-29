// src/ui/PieceInfoPanel.js
import { PIECE_TYPES } from '../utils/constants.js';
import { PieceRenderer } from './PieceRenderer.js';
import { i18n } from '../utils/i18n.js';

const PIECE_INFO = {
    [PIECE_TYPES.KING]: {
        nameKey: 'pieces.king.name',
        descKey: 'pieces.king.desc',
        diagram: [[0,0,0,0,0],[0,'M','M','M',0],[0,'M','C','M',0],[0,'M','M','M',0],[0,0,0,0,0]]
    },
    [PIECE_TYPES.VIZIER]: {
        nameKey: 'pieces.vizier.name',
        descKey: 'pieces.vizier.desc',
        diagram: [[0,0,0,0,0],[0,0,'M',0,0],[0,'M','C','M',0],[0,0,'M',0,0],[0,0,0,0,0]]
    },
    [PIECE_TYPES.SEA_MONSTER]: {
        nameKey: 'pieces.sea_monster.name',
        descKey: 'pieces.sea_monster.desc',
        diagram: [[0,0,0,0,0],[0,0,'M',0,0],[0,'M','C','M',0],[0,0,'M',0,0],[0,0,0,0,0]]
    },
    [PIECE_TYPES.GENERAL]: {
        nameKey: 'pieces.general.name',
        descKey: 'pieces.general.desc',
        diagram: [[0,0,0,0,0],[0,'M',0,'M',0],[0,0,'C',0,0],[0,'M',0,'M',0],[0,0,0,0,0]]
    },
    [PIECE_TYPES.KNIGHT]: {
        nameKey: 'pieces.knight.name',
        descKey: 'pieces.knight.desc',
        diagram: [[0,'M',0,'M',0],['M',0,0,0,'M'],[0,0,'C',0,0],['M',0,0,0,'M'],[0,'M',0,'M',0]]
    },
    [PIECE_TYPES.LION]: {
        nameKey: 'pieces.lion.name',
        descKey: 'pieces.lion.desc',
        diagram: [[0,0,'M',0,0],[0,0,0,0,0],['M',0,'C',0,'M'],[0,0,0,0,0],[0,0,'M',0,0]]
    },
    [PIECE_TYPES.ELEPHANT]: {
        nameKey: 'pieces.elephant.name',
        descKey: 'pieces.elephant.desc',
        diagram: [['M',0,0,0,'M'],[0,0,0,0,0],[0,0,'C',0,0],[0,0,0,0,0],['M',0,0,0,'M']]
    },
    [PIECE_TYPES.CAMEL]: {
        nameKey: 'pieces.camel.name',
        descKey: 'pieces.camel.desc',
        diagram: [[0,'M',0,'M',0],[0,0,0,0,0],['M',0,'C',0,'M'],[0,0,0,0,0],[0,'M',0,'M',0]]
    },
    [PIECE_TYPES.DABBABA]: {
        nameKey: 'pieces.dabbaba.name',
        descKey: 'pieces.dabbaba.desc',
        diagram: [[0,0,'M',0,0],[0,0,0,0,0],['M',0,'C',0,'M'],[0,0,0,0,0],[0,0,'M',0,0]]
    },
    [PIECE_TYPES.BULL]: {
        nameKey: 'pieces.bull.name',
        descKey: 'pieces.bull.desc',
        diagram: [['M',0,0,0,'M'],[0,0,0,0,0],[0,0,'C',0,0],[0,0,0,0,0],['M',0,0,0,'M']]
    },
    [PIECE_TYPES.REVEALER]: {
        nameKey: 'pieces.revealer.name',
        descKey: 'pieces.revealer.desc',
        diagram: [['M',0,0,0,'M'],[0,0,0,0,0],[0,0,'C',0,0],[0,0,0,0,0],['M',0,0,0,'M']]
    },
    [PIECE_TYPES.GIRAFFE]: {
        nameKey: 'pieces.giraffe.name',
        descKey: 'pieces.giraffe.desc',
        diagram: [[0,'M',0,'M',0],[0,0,'P',0,0],['M','P','C','P','M'],[0,0,'P',0,0],[0,'M',0,'M',0]]
    },
    [PIECE_TYPES.PICKET]: {
        nameKey: 'pieces.picket.name',
        descKey: 'pieces.picket.desc',
        diagram: [['M',0,0,0,'M'],[0,'P',0,'P',0],[0,0,'C',0,0],[0,'P',0,'P',0],['M',0,0,0,'M']]
    },
    [PIECE_TYPES.ROOK]: {
        nameKey: 'pieces.rook.name',
        descKey: 'pieces.rook.desc',
        diagram: [[0,0,'M',0,0],[0,0,'P',0,0],['M','P','C','P','M'],[0,0,'P',0,0],[0,0,'M',0,0]]
    },
    [PIECE_TYPES.PAWN]: {
        nameKey: 'pieces.pawn.name',
        descKey: 'pieces.pawn.desc',
        diagram: [[0,0,0,0,0],[0,'M','M','M',0],[0,0,'C',0,0],[0,0,0,0,0],[0,0,0,0,0]]
    },
    [PIECE_TYPES.PRINCE]: {
        nameKey: 'pieces.prince.name',
        descKey: 'pieces.prince.desc',
        diagram: [[0,0,0,0,0],[0,'M','M','M',0],[0,'M','C','M',0],[0,'M','M','M',0],[0,0,0,0,0]]
    },
    [PIECE_TYPES.ADVENTITIOUS_KING]: {
        nameKey: 'pieces.adventitious_king.name',
        descKey: 'pieces.adventitious_king.desc',
        diagram: [[0,0,0,0,0],[0,'M','M','M',0],[0,'M','C','M',0],[0,'M','M','M',0],[0,0,0,0,0]]
    }
};

export class PieceInfoPanel {
    constructor(containerElement) {
        this.container = containerElement;
        this.isShowingDetail = false;
        this.currentPiece = null;
        this._buildDOM();
    }

    _buildDOM() {
        this.container.innerHTML = '';
        this.defaultSection = document.createElement('div');
        this.defaultSection.className = 'piece-info-default';
        this.defaultSection.innerHTML = `
            <div class="player-info piece-info-summary">
                <div class="avatar"><i class="fas fa-circle-info"></i></div>
                <div class="details">
                    <span class="name">${i18n.t('common.info_panel')}</span>
                    <span class="status">${i18n.t('common.piece_info_hint')}</span>
                </div>
            </div>
        `;

        this.detailSection = document.createElement('div');
        this.detailSection.className = 'piece-info-detail';
        this.container.appendChild(this.defaultSection);
        this.container.appendChild(this.detailSection);
    }

    showPieceInfo(piece) {
        if (!piece) {
            this.hide();
            return;
        }

        const info = PIECE_INFO[piece.type];
        if (!info) {
            this.hide();
            return;
        }

        this.currentPiece = {
            type: piece.type,
            color: piece.color,
            pawnType: piece.pawnType || null
        };

        const piecePreview = PieceRenderer.createPieceElement(piece.type, piece.color, piece.pawnType);
        const diagramHTML = this._buildDiagram(info.diagram);

        let pawnSubInfo = '';
        if (piece.type === PIECE_TYPES.PAWN && piece.pawnType) {
            const parentName = this._getPawnParentName(piece.pawnType);
            pawnSubInfo = `<span class="piece-type-badge">${i18n.t('pieces.pawn_of', { type: parentName })}</span>`;
        }

        this.detailSection.innerHTML = `
            <div class="info-piece-preview"></div>
            <div class="info-piece-text">
                <div class="info-piece-name">${i18n.t(info.nameKey)} ${pawnSubInfo}</div>
                <div class="info-piece-desc">${i18n.t(info.descKey)}</div>
            </div>
            <div class="info-move-diagram">${diagramHTML}</div>
        `;

        this.detailSection.querySelector('.info-piece-preview').appendChild(piecePreview);
        this.container.classList.add('showing-detail');
        this.isShowingDetail = true;
    }

    hide() {
        this.container.classList.remove('showing-detail');
        this.isShowingDetail = false;
        this.currentPiece = null;
    }

    refresh() {
        if (this.isShowingDetail && this.currentPiece) {
            this.showPieceInfo(this.currentPiece);
        }
    }

    _buildDiagram(diagram) {
        let html = '';
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const val = diagram[r][c];
                let cls = 'diagram-cell';
                if (val === 'C') cls += ' center';
                else if (val === 'M') cls += ' move-target';
                else if (val === 'P') cls += ' path-cell';
                html += `<div class="${cls}"></div>`;
            }
        }
        return html;
    }

    _getPawnParentName(pawnType) {
        return i18n.t(`pieces.pawn.subtypes.${pawnType}`);
    }
}

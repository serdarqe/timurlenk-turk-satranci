import { COLORS } from '../utils/constants.js';
import { PieceRenderer } from './PieceRenderer.js';
import { MoveValidator } from '../game/MoveValidator.js';
import { GameRules } from '../game/GameRules.js';
import { PieceInfoPanel } from './PieceInfoPanel.js';
import { TouchInteraction } from './TouchInteraction.js';
import { i18n } from '../utils/i18n.js';
import { audioManager } from '../utils/AudioManager.js';
import { buildMoveRecord, serializeGameStateSnapshot, serializePiece } from '../analysis/AnalysisSerialization.js';
import { buildPieceMovedEventDetail } from '../utils/MoveEventDetail.js';

export class BoardRenderer {
    constructor(containerElement, gameState) {
        this.container = containerElement;
        this.boardContainer = containerElement?.closest('.board-container') || null;
        this.gameState = gameState;
        this.selectedCell = null;
        this.validMoves = [];
        this.moveValidator = new MoveValidator(gameState);
        this.isAnimating = false;
        this.lastMove = null;
        this.isRendered = false;
        this.cellCache = Array.from({ length: 10 }, () => Array(11).fill(null));
        this.lastMoveElements = [];
        this.validMoveElements = [];
        this.scriptedElements = [];
        this.analysisHintElements = [];
        this.selectedCellElement = null;
        this.selectedPieceElement = null;
        this.scriptedStepData = null;
        this.analysisHintMove = null;
        this.perspectiveColor = COLORS.WHITE;

        this.focusOverlay = document.getElementById('board-focus-overlay');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.citadelAi = document.getElementById('citadel-ai');
        this.citadelPlayer = document.getElementById('citadel-player');
        this.aiCapturedEl = document.getElementById('ai-captured');
        this.playerCapturedEl = document.getElementById('player-captured');

        const infoPanelEl = document.getElementById('piece-info-panel');
        if (infoPanelEl) {
            this.pieceInfoPanel = new PieceInfoPanel(infoPanelEl);
        }

        const magnifierEl = document.getElementById('magnifier');
        if (magnifierEl) {
            this.touchInteraction = new TouchInteraction(
                containerElement,
                magnifierEl,
                () => this._getCellSize(),
                {
                    getCellElement: (row, col) => this._getCellElement(row, col),
                    isBoardFlipped: () => this._isPerspectiveFlipped()
                }
            );
        }

        this._applyPerspective();
    }

    _getCellSize() {
        const val = getComputedStyle(document.documentElement).getPropertyValue('--cell-size');
        return parseFloat(val) || 40;
    }

    _isPerspectiveFlipped() {
        return this.perspectiveColor === COLORS.BLACK;
    }

    _applyPerspective() {
        const isFlipped = this._isPerspectiveFlipped();
        this.container?.classList.toggle('board-flipped', isFlipped);
        this.boardContainer?.classList.toggle('board-perspective-black', isFlipped);
        this.focusOverlay?.classList.toggle('board-flipped', isFlipped);
        this.citadelAi?.classList.toggle('board-flipped', isFlipped);
        this.citadelPlayer?.classList.toggle('board-flipped', isFlipped);
    }

    setPerspective(color = COLORS.WHITE) {
        this.perspectiveColor = color === COLORS.BLACK ? COLORS.BLACK : COLORS.WHITE;
        this._applyPerspective();
        this.touchInteraction?.invalidateBoardSnapshot();
    }

    _getTurnIndicatorText() {
        if (!this.gameState) return i18n.t('common.your_turn');

        if (this.gameState.analysisPractice?.enabled) {
            return i18n.t('analysis.practice_prompt_short');
        }

        const onlineMatch = this.gameState.onlineMatch;
        if (onlineMatch?.enabled) {
            return this.gameState.currentTurn === onlineMatch.localPlayerColor
                ? i18n.t('common.your_turn')
                : i18n.t('online.opponent_turn');
        }

        const playerColor = this.gameState.aiColor ? this._getOfflinePlayerColor() : COLORS.WHITE;
        return this.gameState.currentTurn === playerColor
            ? i18n.t('common.your_turn')
            : i18n.t('common.ai_turn');
    }

    syncTurnIndicator() {
        if (this.turnIndicator) {
            this.turnIndicator.textContent = this._getTurnIndicatorText();
        }
    }

    _getPieceSignature(piece) {
        if (!piece) return '';
        return `${piece.type}|${piece.color}|${piece.pawnType || ''}|${PieceRenderer.getRenderVariant()}|${i18n.getLocale()}`;
    }

    _getPieceElement(holder) {
        return holder?._pieceEl || null;
    }

    _setPieceElement(holder, pieceEl) {
        if (holder) holder._pieceEl = pieceEl || null;
    }

    _clearLastMoveHighlights() {
        this.lastMoveElements.forEach(({ element, className }) => element?.classList.remove(className));
        this.lastMoveElements = [];
    }

    _syncLastMoveHighlights() {
        this._clearLastMoveHighlights();
        if (!this.lastMove) return;

        const fromCell = this._getCellElement(this.lastMove.fromRow, this.lastMove.fromCol);
        const toCell = this._getCellElement(this.lastMove.toRow, this.lastMove.toCol);

        if (fromCell) {
            fromCell.classList.add('last-move-from');
            this.lastMoveElements.push({ element: fromCell, className: 'last-move-from' });
        }

        if (toCell) {
            toCell.classList.add('last-move-to');
            this.lastMoveElements.push({ element: toCell, className: 'last-move-to' });
        }
    }

    _clearSelectionHighlights() {
        if (this.selectedCellElement) this.selectedCellElement.classList.remove('selected');
        if (this.selectedPieceElement) this.selectedPieceElement.classList.remove('selected');
        this.validMoveElements.forEach(({ element, className }) => element?.classList.remove(className));
        this.selectedCellElement = null;
        this.selectedPieceElement = null;
        this.validMoveElements = [];
    }

    _syncSelectionHighlights() {
        this._clearSelectionHighlights();
        if (!this.selectedCell) return;

        const cellEl = this._getCellElement(this.selectedCell.row, this.selectedCell.col);
        if (!cellEl) return;

        cellEl.classList.add('selected');
        this.selectedCellElement = cellEl;

        const pieceEl = this._getPieceElement(cellEl);
        if (pieceEl) {
            pieceEl.classList.add('selected');
            this.selectedPieceElement = pieceEl;
        }

        this.validMoves.forEach(move => {
            const targetCell = this._getCellElement(move.row, move.col);
            if (!targetCell) return;

            const selectedPiece = this.gameState.board.getPieceAt(this.selectedCell.row, this.selectedCell.col);
            const targetPiece = this.gameState.board.getPieceAt(move.row, move.col);
            const hasEnemy = Boolean(targetPiece && targetPiece.color !== selectedPiece?.color);
            const className = move.specialMove === 'royal_swap'
                ? 'valid-move'
                : (hasEnemy ? 'valid-capture' : 'valid-move');
            targetCell.classList.add(className);
            this.validMoveElements.push({ element: targetCell, className });
        });
    }

    _clearScriptedHighlights() {
        this.scriptedElements.forEach(({ element, className }) => element?.classList.remove(className));
        this.scriptedElements = [];
    }

    _syncScriptedHighlights() {
        this._clearScriptedHighlights();
        if (!this.scriptedStepData) return;

        const fromCell = this._getCellElement(this.scriptedStepData.from.row, this.scriptedStepData.from.col);
        const toCell = this._getCellElement(this.scriptedStepData.to.row, this.scriptedStepData.to.col);

        if (fromCell) {
            fromCell.classList.add('scripted-from');
            this.scriptedElements.push({ element: fromCell, className: 'scripted-from' });
        }

        if (toCell) {
            toCell.classList.add('scripted-to');
            this.scriptedElements.push({ element: toCell, className: 'scripted-to' });
        }
    }

    _clearAnalysisHighlights() {
        this.analysisHintElements.forEach(({ element, className }) => element?.classList.remove(className));
        this.analysisHintElements = [];
    }

    _syncAnalysisHighlights() {
        this._clearAnalysisHighlights();
        if (!this.analysisHintMove) return;

        const fromCell = this._getCellElement(this.analysisHintMove.fromRow, this.analysisHintMove.fromCol);
        const toCell = this._getCellElement(this.analysisHintMove.toRow, this.analysisHintMove.toCol);

        if (fromCell) {
            fromCell.classList.add('analysis-best-from');
            this.analysisHintElements.push({ element: fromCell, className: 'analysis-best-from' });
        }

        if (toCell) {
            toCell.classList.add('analysis-best-to');
            this.analysisHintElements.push({ element: toCell, className: 'analysis-best-to' });
        }
    }

    clear() {
        if (this.touchInteraction) {
            this.touchInteraction.destroy();
            this.touchInteraction = null;
        }

        this.container.innerHTML = '';
        this.cellCache = Array.from({ length: 10 }, () => Array(11).fill(null));
        this.isRendered = false;
        this._clearLastMoveHighlights();
        this._clearSelectionHighlights();
        this._clearScriptedHighlights();
        this._clearAnalysisHighlights();
        this.scriptedStepData = null;
        this.analysisHintMove = null;

        if (this.citadelAi) {
            this.citadelAi.innerHTML = '';
            this._setPieceElement(this.citadelAi, null);
            this.citadelAi._pieceSignature = '';
        }

        if (this.citadelPlayer) {
            this.citadelPlayer.innerHTML = '';
            this._setPieceElement(this.citadelPlayer, null);
            this.citadelPlayer._pieceSignature = '';
        }
    }

    render() {
        if (!this.isRendered) {
            this._fullRender();
        } else {
            this._updateBoard();
        }

        if (this.touchInteraction) {
            this.touchInteraction.invalidateBoardSnapshot();
        }

        this.syncTurnIndicator();
        this._syncLastMoveHighlights();
        this._syncSelectionHighlights();
        this._syncScriptedHighlights();
        this._syncAnalysisHighlights();
        this._renderCapturedPieces();
    }

    _fullRender() {
        this.clear();
        this.moveValidator = new MoveValidator(this.gameState);
        const board = this.gameState.board;
        const fragment = document.createDocumentFragment();

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 11; c++) {
                const cellEl = this._createCell(r, c);
                this.cellCache[r][c] = cellEl;
                this._updateCellContent(cellEl, r, c);
                fragment.appendChild(cellEl);
            }
        }

        this.container.appendChild(fragment);
        this._renderCitadel(this.citadelAi, board.citadelBlack, 0, -1);
        this._renderCitadel(this.citadelPlayer, board.citadelWhite, 9, 11);
        this.isRendered = true;
    }

    _updateBoard() {
        const board = this.gameState.board;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 11; c++) {
                const cellEl = this.cellCache[r][c];
                if (cellEl) this._updateCellContent(cellEl, r, c);
            }
        }

        this._updateCitadel(this.citadelAi, board.citadelBlack);
        this._updateCitadel(this.citadelPlayer, board.citadelWhite);
    }

    _updateCellContent(cellEl, r, c) {
        const piece = this.gameState.board.getPieceAt(r, c);
        const nextSignature = this._getPieceSignature(piece);
        if (cellEl._pieceSignature === nextSignature) return;

        const existingPieceEl = this._getPieceElement(cellEl);
        if (existingPieceEl) existingPieceEl.remove();

        if (!piece) {
            this._setPieceElement(cellEl, null);
            cellEl._pieceSignature = '';
            return;
        }

        const pieceEl = PieceRenderer.createPieceElement(piece.type, piece.color, piece.pawnType);
        pieceEl.dataset.type = piece.type;
        pieceEl.dataset.color = piece.color;
        cellEl.appendChild(pieceEl);
        this._setPieceElement(cellEl, pieceEl);
        cellEl._pieceSignature = nextSignature;
    }

    _renderCapturedPieces() {
        const onlineMatch = this.gameState.onlineMatch;
        const bottomColor = onlineMatch?.enabled
            ? (onlineMatch.localPlayerColor || COLORS.WHITE)
            : this._getOfflinePlayerColor();
        const topColor = onlineMatch?.enabled
            ? (bottomColor === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK)
            : this._getOfflineAiColor();

        this._renderCapturedCollection(this.aiCapturedEl, this.gameState.capturedPieces[topColor] || []);
        this._renderCapturedCollection(this.playerCapturedEl, this.gameState.capturedPieces[bottomColor] || []);
    }

    _renderCapturedCollection(container, capturedPieces) {
        if (!container) return;

        const nextSignature = capturedPieces
            .map(piece => this._getPieceSignature(piece))
            .join(',');

        if (container._captureSignature === nextSignature) return;

        container.innerHTML = '';
        capturedPieces.forEach(piece => {
            const el = PieceRenderer.createPieceElement(piece.type, piece.color, piece.pawnType);
            container.appendChild(el);
        });
        container._captureSignature = nextSignature;
    }

    refreshVisualSettings() {
        PieceRenderer.clearCache();
        this.render();
        this.pieceInfoPanel?.refresh();
    }

    showAnalysisHintMove(move) {
        if (
            !move
            || typeof move.fromRow !== 'number'
            || typeof move.fromCol !== 'number'
            || typeof move.toRow !== 'number'
            || typeof move.toCol !== 'number'
        ) {
            this.clearAnalysisHintMove();
            return;
        }

        this.analysisHintMove = {
            fromRow: move.fromRow,
            fromCol: move.fromCol,
            toRow: move.toRow,
            toCol: move.toCol
        };
        this._syncAnalysisHighlights();
    }

    clearAnalysisHintMove() {
        this.analysisHintMove = null;
        this._clearAnalysisHighlights();
    }

    _createCell(row, col) {
        const cell = document.createElement('div');
        const isDark = (row + col) % 2 === 1;
        cell.className = `cell ${isDark ? 'dark' : 'light'}`;
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell._pieceSignature = '';
        cell._pieceEl = null;

        if (col === 0) cell.dataset.rankLabel = 10 - row;
        if (row === 9) {
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
            cell.dataset.fileLabel = files[col];
        }

        cell.addEventListener('click', () => this.handleCellClick(row, col));
        return cell;
    }

    _renderCitadel(citadel, piece, row, col) {
        if (!citadel) return;

        citadel.innerHTML = '';
        citadel._pieceSignature = '';
        citadel._pieceEl = null;

        if (piece) {
            const pieceEl = PieceRenderer.createPieceElement(piece.type, piece.color, piece.pawnType);
            pieceEl.dataset.type = piece.type;
            pieceEl.dataset.color = piece.color;
            citadel.appendChild(pieceEl);
            this._setPieceElement(citadel, pieceEl);
            citadel._pieceSignature = this._getPieceSignature(piece);
        }

        citadel.onclick = () => this.handleCellClick(row, col);
    }

    _updateCitadel(citadel, piece) {
        if (!citadel) return;

        const nextSignature = this._getPieceSignature(piece);
        if (citadel._pieceSignature === nextSignature) return;

        const existingPieceEl = this._getPieceElement(citadel);
        if (existingPieceEl) existingPieceEl.remove();

        if (!piece) {
            this._setPieceElement(citadel, null);
            citadel._pieceSignature = '';
            return;
        }

        const pieceEl = PieceRenderer.createPieceElement(piece.type, piece.color, piece.pawnType);
        pieceEl.dataset.type = piece.type;
        pieceEl.dataset.color = piece.color;
        citadel.appendChild(pieceEl);
        this._setPieceElement(citadel, pieceEl);
        citadel._pieceSignature = nextSignature;
    }

    _getCellElement(row, col) {
        if (col === -1) return this.citadelAi;
        if (col === 11) return this.citadelPlayer;
        return this.cellCache[row]?.[col] || null;
    }

    _isRemoteSimulation() {
        return Boolean(this.gameState.onlineMatch?.enabled && this.gameState.onlineMatch.isRemoteSimulation?.());
    }

    _getOfflinePlayerColor() {
        return this.gameState?.playerColor === COLORS.BLACK ? COLORS.BLACK : COLORS.WHITE;
    }

    _getOfflineAiColor() {
        return this.gameState?.aiColor === COLORS.WHITE ? COLORS.WHITE : COLORS.BLACK;
    }

    _isLocalTurnAllowed() {
        const onlineMatch = this.gameState.onlineMatch;
        if (!onlineMatch?.enabled) {
            if (this.gameState.isScripted || this.gameState.analysisPractice?.enabled || !this.gameState.aiColor) return true;
            return this.gameState.currentTurn === this._getOfflinePlayerColor();
        }
        if (this._isRemoteSimulation()) return true;

        return !onlineMatch.isOpponentTurn?.() && this.gameState.currentTurn === onlineMatch.localPlayerColor;
    }

    _canControlPiece(piece) {
        if (!piece) return false;

        const onlineMatch = this.gameState.onlineMatch;
        if (!onlineMatch?.enabled) {
            if (this.gameState.isScripted || this.gameState.analysisPractice?.enabled || !this.gameState.aiColor) return true;
            return piece.color === this._getOfflinePlayerColor() && this._isLocalTurnAllowed();
        }
        if (this._isRemoteSimulation()) return true;

        return piece.color === onlineMatch.localPlayerColor && this._isLocalTurnAllowed();
    }

    _animateMove(fromRow, fromCol, toRow, toCol, hasCaptured, afterAnimationCallback) {
        const sourceCell = this._getCellElement(fromRow, fromCol);
        const destCell = this._getCellElement(toRow, toCol);
        const sourcePiece = this._getPieceElement(sourceCell);
        const capturedPiece = hasCaptured ? this._getPieceElement(destCell) : null;

        if (!sourceCell || !destCell || !sourcePiece) {
            if (hasCaptured) {
                audioManager.playCaptureSound();
            } else {
                audioManager.playMoveSound();
            }
            afterAnimationCallback();
            return;
        }

        const sourcePieceRect = sourcePiece.getBoundingClientRect();
        const destRect = destCell.getBoundingClientRect();
        const targetLeft = destRect.left + ((destRect.width - sourcePieceRect.width) / 2);
        const targetTop = destRect.top + ((destRect.height - sourcePieceRect.height) / 2);
        const deltaX = targetLeft - sourcePieceRect.left;
        const deltaY = targetTop - sourcePieceRect.top;
        const flyingPiece = sourcePiece.cloneNode(true);

        flyingPiece.classList.remove('selected');
        flyingPiece.classList.add('piece-motion-layer');
        flyingPiece.style.position = 'fixed';
        flyingPiece.style.left = sourcePieceRect.left + 'px';
        flyingPiece.style.top = sourcePieceRect.top + 'px';
        flyingPiece.style.width = sourcePieceRect.width + 'px';
        flyingPiece.style.height = sourcePieceRect.height + 'px';
        flyingPiece.style.margin = '0';
        flyingPiece.style.pointerEvents = 'none';
        flyingPiece.style.zIndex = '2000';
        flyingPiece.style.transform = 'translate3d(0, 0, 0) scale(1)';
        flyingPiece.style.transformOrigin = 'center center';
        flyingPiece.style.transition = 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), filter 360ms ease';

        sourcePiece.style.opacity = '0';
        sourcePiece.style.visibility = 'hidden';

        if (capturedPiece) {
            capturedPiece.classList.add('capture-fade');
        }

        document.body.appendChild(flyingPiece);
        flyingPiece.getBoundingClientRect();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                flyingPiece.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.03)`;
            });
        });

        let finished = false;
        const finishAnimation = () => {
            if (finished) return;
            finished = true;
            if (flyingPiece.parentNode) flyingPiece.parentNode.removeChild(flyingPiece);
            sourcePiece.style.opacity = '';
            sourcePiece.style.visibility = '';

            if (hasCaptured) {
                audioManager.playCaptureSound();
            } else {
                audioManager.playMoveSound();
            }

            afterAnimationCallback();
        };

        flyingPiece.addEventListener('transitionend', finishAnimation, { once: true });
        setTimeout(finishAnimation, 420);
    }

    handleCellClick(row, col) {
        if (this.isAnimating) return;
        if (this.gameState?.analysisPractice?.locked) return;

        if (this.selectedCell) {
            const selectedMove = this.validMoves.find(m => m.row === row && m.col === col);
            if (selectedMove) {
                if (!this._isLocalTurnAllowed()) return;

                if (this.gameState.isScripted && this.gameState.scriptData && this.gameState.currentTurn === COLORS.WHITE) {
                    const expectedTo = this.gameState.scriptData.to;
                    if (row !== expectedTo.row || col !== expectedTo.col) {
                        const langHint = i18n.getLocale() === 'en' ? 'en' : 'tr';
                        const hint = this.gameState.scriptData.hint[langHint] || this.gameState.scriptData.hint.tr;
                        if (window.showToast) window.showToast(hint);

                        const targetCell = this._getCellElement(row, col);
                        if (targetCell) {
                            targetCell.classList.add('error-shake');
                            setTimeout(() => targetCell.classList.remove('error-shake'), 400);
                        }
                        return;
                    }
                }

                this.isAnimating = true;

                const fromRow = this.selectedCell.row;
                const fromCol = this.selectedCell.col;
                const isRoyalSwap = selectedMove.specialMove === 'royal_swap';
                const capturedPiece = isRoyalSwap ? null : this.gameState.board.getPieceAt(row, col);
                const movingPiece = this.gameState.board.getPieceAt(fromRow, fromCol);

                this._animateMove(fromRow, fromCol, row, col, !!capturedPiece, () => {
                    const preSnapshot = serializeGameStateSnapshot(this.gameState);
                    const movedPieceBefore = serializePiece(movingPiece);
                    let captured = null;

                    if (isRoyalSwap) {
                        const targetPiece = this.gameState.board.getPieceAt(row, col);
                        GameRules.applyRoyalSwap(this.gameState, movingPiece, targetPiece);
                    } else {
                        const moveData = this.gameState.board.movePiece(fromRow, fromCol, row, col);
                        captured = moveData ? moveData.capturedPiece : null;
                    }

                    if (captured) {
                        this.gameState.addCapture(captured);
                        if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
                    } else if ('vibrate' in navigator) {
                        navigator.vibrate(5);
                    }

                    const movedPieceAfterMove = this.gameState.board.getPieceAt(row, col);
                    const postMoveEffects = isRoyalSwap
                        ? { activePiece: movedPieceAfterMove }
                        : GameRules.postMoveChecks(this.gameState, movingPiece, row, col);

                    this.gameState.switchTurn();
                    this.selectedCell = null;
                    this.validMoves = [];
                    this.lastMove = { fromRow, fromCol, toRow: row, toCol: col };

                    if (this.pieceInfoPanel) this.pieceInfoPanel.hide();

                    this.render();
                    this.isAnimating = false;

                    const validator = new MoveValidator(this.gameState);
                    const currentTurn = this.gameState.currentTurn;
                    let isCheck = false;
                    let resultType = null;

                    const royalElimination = GameRules.resolveRoyalElimination(this.gameState, currentTurn);

                    if (royalElimination) {
                        audioManager.playGameOverSound();
                        resultType = royalElimination;
                    } else if (validator.isCheckmate(currentTurn)) {
                        this.gameState.checkmate = true;
                        this.gameState.status = 'game_over';
                        this.gameState.winner = currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                        audioManager.playGameOverSound();
                        resultType = 'checkmate';
                    } else if (validator.isStalemate(currentTurn)) {
                        this.gameState.stalemate = true;
                        this.gameState.status = 'game_over';
                        this.gameState.winner = currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                        audioManager.playGameOverSound();
                        resultType = 'stalemate';
                    } else if (validator.isCheck(currentTurn)) {
                        audioManager.playCheckSound();
                        console.log(i18n.t('game.check'));
                        isCheck = true;
                    }

                    if (this.gameState.winner === 'Draw (Hisar)') {
                        resultType = 'citadel_draw';
                    }

                    const movedPieceAfter =
                        postMoveEffects?.activePiece
                        || this.gameState.board.getPieceAt(row, col)
                        || this.gameState.board.pieces.find(piece =>
                            piece.color === movedPieceBefore.color
                            && piece.pawnType === movedPieceBefore.pawnType
                            && piece.type === movedPieceBefore.type
                        )
                        || this.gameState.board.pieces.find(piece =>
                            piece.color === movedPieceBefore.color
                            && piece.row === row
                            && piece.col === col
                        )
                        || null;

                    const postSnapshot = serializeGameStateSnapshot(this.gameState);
                    const moveRecord = buildMoveRecord({
                        gameState: this.gameState,
                        fromRow,
                        fromCol,
                        toRow: row,
                        toCol: col,
                        movedPieceBefore,
                        movedPieceAfter: serializePiece(movedPieceAfter),
                        capturedPiece: serializePiece(captured),
                        preSnapshot,
                        postSnapshot,
                        isCheck,
                        resultType,
                        specialMoveType: isRoyalSwap ? 'royal_swap' : null
                    });
                    this.gameState.moveHistory.push(moveRecord);

                    const event = new CustomEvent('pieceMoved', {
                        detail: buildPieceMovedEventDetail({
                            gameState: this.gameState,
                            fromRow,
                            fromCol,
                            toRow: row,
                            toCol: col,
                            movedColor: movingPiece?.color || null,
                            moveRecord,
                            resultType,
                        })
                    });
                    document.dispatchEvent(event);
                });
                return;
            }
        }

        const piece = this.gameState.board.getPieceAt(row, col);

        this.selectedCell = null;
        this.validMoves = [];
        this._clearSelectionHighlights();
        this._setFocusMode(false);

        if (this.pieceInfoPanel) this.pieceInfoPanel.hide();

        if (piece && piece.color === this.gameState.currentTurn && this._canControlPiece(piece)) {
            if ('vibrate' in navigator) navigator.vibrate(10);

            this.selectedCell = { row, col };

            const cellQuery = this._getCellElement(row, col);
            if (cellQuery) {
                cellQuery.classList.add('selected');
                this.selectedCellElement = cellQuery;

                const pieceEl = this._getPieceElement(cellQuery);
                if (pieceEl) {
                    pieceEl.classList.add('selected');
                    this.selectedPieceElement = pieceEl;
                }
            }

            this.validMoves = this.moveValidator.getLegalMoves(row, col);
            this.validMoves.forEach(move => {
                const targetCell = this._getCellElement(move.row, move.col);
                if (!targetCell) return;

                const targetPiece = this.gameState.board.getPieceAt(move.row, move.col);
                const hasEnemy = Boolean(targetPiece && targetPiece.color !== piece.color);
                const className = move.specialMove === 'royal_swap'
                    ? 'valid-move'
                    : (hasEnemy ? 'valid-capture' : 'valid-move');
                targetCell.classList.add(className);
                this.validMoveElements.push({ element: targetCell, className });
            });

            this.pieceInfoPanel?.showPieceInfo(piece);
        }
    }

    _setFocusMode(active) {
        if (this.focusOverlay) {
            this.focusOverlay.classList.toggle('active', active);
        }
        this.container.classList.toggle('focus-active', active);
    }

    guideScriptedMatch(stepData, options = {}) {
        if (!stepData) return;

        this.scriptedStepData = stepData;
        this._syncScriptedHighlights();

        const lang = i18n.getLocale() === 'en' ? 'en' : 'tr';
        const text = stepData.instruction[lang] || stepData.instruction.tr;

        if (options.announce !== false && window.showToast) {
            window.showToast(text, 6000);
        }
    }
}

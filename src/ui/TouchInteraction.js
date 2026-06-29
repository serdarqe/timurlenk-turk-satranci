// src/ui/TouchInteraction.js
// Mobile touch enhancements: offset magnifier + smart snapping
// Only activates on touch-capable devices

export class TouchInteraction {
    /**
     * @param {HTMLElement} boardElement - The .chess-board grid element
     * @param {HTMLElement} magnifierElement - The #magnifier element
     * @param {Function} getCellSize - Returns current cell size in px
     * @param {{
     *  getCellElement?: Function,
     *  isBoardFlipped?: Function,
     *  getPieceAt?: Function,
     *  canDragPiece?: Function,
     *  onDragSelect?: Function,
     *  canDropOn?: Function,
     *  onDragDrop?: Function,
     *  onDragCancel?: Function
     * }} options
     */
    constructor(boardElement, magnifierElement, getCellSize, options = {}) {
        this.board = boardElement;
        this.magnifier = magnifierElement;
        this.magnifierContent = magnifierElement.querySelector('.magnifier-content');
        this.getCellSize = getCellSize;
        this.getCellElement = options.getCellElement || null;
        this.isBoardFlipped = options.isBoardFlipped || (() => false);
        this.getPieceAt = options.getPieceAt || null;
        this.canDragPiece = options.canDragPiece || (() => false);
        this.onDragSelect = options.onDragSelect || null;
        this.canDropOn = options.canDropOn || null;
        this.onDragDrop = options.onDragDrop || null;
        this.onDragCancel = options.onDragCancel || null;
        this.isTouch = false;
        this.activeTouchId = null;
        this._holdTimer = null;
        this._boardClone = null;
        this._boardSnapshotDirty = true;
        this._frameId = 0;
        this._pendingMagnifierPoint = null;
        this._activeBoardRect = null;
        this._dragCandidate = null;
        this._dragState = null;
        this._dragFrameId = 0;
        this._pendingDragPoint = null;
        this._dragThresholdPx = 8;
        this._mouseActive = false;
        this._suppressNextClick = false;
        this._magnifierEnabled = options.enableMagnifier === true;

        this._boundTouchStart = (e) => this._onTouchStart(e);
        this._boundTouchMove = (e) => this._onTouchMove(e);
        this._boundTouchEnd = (e) => this._onTouchEnd(e);
        this._boundTouchCancel = () => this._onTouchCancel();
        this._boundMouseDown = (e) => this._onMouseDown(e);
        this._boundMouseMove = (e) => this._onMouseMove(e);
        this._boundMouseUp = (e) => this._onMouseUp(e);
        this._boundMouseCancel = () => this._onMouseCancel();
        this._boundClickCapture = (e) => this._onClickCapture(e);

        // Only setup on touch-capable devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this._setupTouchListeners();
        }
        this._setupMouseListeners();
    }

    _setupTouchListeners() {
        // Use passive: false so we can preventDefault to stop scroll during board interaction
        this.board.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        this.board.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        this.board.addEventListener('touchend', this._boundTouchEnd, { passive: false });
        this.board.addEventListener('touchcancel', this._boundTouchCancel, { passive: true });
    }

    _setupMouseListeners() {
        this.board.addEventListener('mousedown', this._boundMouseDown);
        this.board.addEventListener('click', this._boundClickCapture, true);
        window.addEventListener('mousemove', this._boundMouseMove, { passive: false });
        window.addEventListener('mouseup', this._boundMouseUp, { passive: false });
        window.addEventListener('blur', this._boundMouseCancel);
    }

    _onTouchStart(e) {
        // Only handle single finger touches
        if (e.touches.length !== 1) {
            this._hideMagnifier();
            return;
        }

        this.isTouch = true;
        this.activeTouchId = e.touches[0].identifier;
        this._activeBoardRect = this.board.getBoundingClientRect();

        const touch = e.touches[0];
        this._dragCandidate = this._getDragCandidate(touch, e.target);

        if (this._magnifierEnabled) {
            // Show magnifier after a short hold (150ms)
            this._holdTimer = setTimeout(() => {
                this._showMagnifier(touch.clientX, touch.clientY);
            }, 150);
        }
    }

    _onTouchMove(e) {
        if (!this.isTouch) return;
        e.preventDefault(); // Prevent scrolling while interacting with board

        const touch = this._getActiveTouch(e.touches);
        if (!touch) return;

        if (this._dragState) {
            this._queueDragUpdate(touch.clientX, touch.clientY);
            return;
        }

        if (this._dragCandidate && this._hasPassedDragThreshold(touch)) {
            this._startPieceDrag(touch);
            return;
        }

        // If hold timer hasn't fired yet but user is moving, show magnifier immediately
        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
            this._showMagnifier(touch.clientX, touch.clientY);
            return;
        }

        this._queueMagnifierUpdate(touch.clientX, touch.clientY);
    }

    _onTouchEnd(e) {
        if (!this.isTouch) return;

        // Clear hold timer
        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }

        const touch = this._getActiveTouch(e.changedTouches);
        if (touch && this._dragState) {
            this._finishPieceDrag(touch.clientX, touch.clientY);
            this.isTouch = false;
            this.activeTouchId = null;
            this._activeBoardRect = null;
            this._dragCandidate = null;
            return;
        }

        if (touch) {
            // Smart snapping: find nearest valid cell
            this._snapToNearestCell(touch.clientX, touch.clientY);
        }

        this._hideMagnifier();
        this.isTouch = false;
        this.activeTouchId = null;
        this._activeBoardRect = null;
        this._dragCandidate = null;
    }

    _onTouchCancel() {
        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }

        this._cancelPieceDrag();
        this._hideMagnifier();
        this.isTouch = false;
        this.activeTouchId = null;
        this._activeBoardRect = null;
        this._dragCandidate = null;
    }

    _onMouseDown(e) {
        if (e.button !== 0 || this.isTouch) return;

        const candidate = this._getDragCandidate(e, e.target);
        if (!candidate) return;

        this._mouseActive = true;
        this._activeBoardRect = this.board.getBoundingClientRect();
        this._dragCandidate = candidate;
    }

    _onMouseMove(e) {
        if (!this._mouseActive) return;

        if (this._dragState) {
            e.preventDefault();
            this._queueDragUpdate(e.clientX, e.clientY);
            return;
        }

        if (this._dragCandidate && this._hasPassedDragThreshold(e)) {
            e.preventDefault();
            this._startPieceDrag(e);
        }
    }

    _onMouseUp(e) {
        if (!this._mouseActive) return;

        if (this._dragState) {
            e.preventDefault();
            this._finishPieceDrag(e.clientX, e.clientY);
            this._suppressNextClick = true;
        }

        this._mouseActive = false;
        this._activeBoardRect = null;
        this._dragCandidate = null;
    }

    _onMouseCancel() {
        if (!this._mouseActive && !this._dragState) return;

        this._cancelPieceDrag();
        this._mouseActive = false;
        this._activeBoardRect = null;
        this._dragCandidate = null;
        this._suppressNextClick = true;
    }

    _onClickCapture(e) {
        if (!this._suppressNextClick) return;
        this._suppressNextClick = false;
        e.preventDefault();
        e.stopImmediatePropagation();
    }

    _getActiveTouch(touchList) {
        for (let i = 0; i < touchList.length; i++) {
            if (touchList[i].identifier === this.activeTouchId) {
                return touchList[i];
            }
        }
        return null;
    }

    // ===== PIECE DRAG =====

    _getDragCandidate(touch, target) {
        const directPieceEl = target?.closest?.('.piece');
        const cellEl = directPieceEl?.closest('.cell') || target?.closest?.('.cell');
        if (!cellEl) return null;
        if (!this.board.contains(cellEl)) return null;

        const pieceEl = directPieceEl || cellEl.querySelector?.('.piece');
        if (!pieceEl || !this.board.contains(pieceEl)) return null;

        const row = Number(cellEl.dataset.row);
        const col = Number(cellEl.dataset.col);
        if (!Number.isInteger(row) || !Number.isInteger(col)) return null;

        const piece = this.getPieceAt?.(row, col);
        if (!piece || !this.canDragPiece(piece, row, col)) return null;

        const pieceRect = pieceEl.getBoundingClientRect();

        return {
            row,
            col,
            pieceEl,
            startX: touch.clientX,
            startY: touch.clientY,
            grabOffsetX: touch.clientX - pieceRect.left,
            grabOffsetY: touch.clientY - pieceRect.top
        };
    }

    _hasPassedDragThreshold(touch) {
        if (!this._dragCandidate) return false;

        const dx = touch.clientX - this._dragCandidate.startX;
        const dy = touch.clientY - this._dragCandidate.startY;
        return Math.hypot(dx, dy) >= this._dragThresholdPx;
    }

    _startPieceDrag(touch) {
        const candidate = this._dragCandidate;
        if (!candidate || this._dragState) return false;

        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }
        this._hideMagnifier();

        const selected = this.onDragSelect?.(candidate.row, candidate.col);
        if (selected === false) {
            this._dragCandidate = null;
            return false;
        }

        const sourceCell = this.getCellElement?.(candidate.row, candidate.col) || candidate.pieceEl.closest('.cell');
        const sourcePiece = sourceCell?.querySelector?.('.piece') || candidate.pieceEl;
        const rect = sourcePiece.getBoundingClientRect();
        const ghost = sourcePiece.cloneNode(true);

        ghost.classList.remove('selected', 'drag-source');
        ghost.classList.add('piece-drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = '0';
        ghost.style.top = '0';
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.margin = '0';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.transformOrigin = 'center center';

        sourcePiece.classList.add('drag-source');
        document.body.appendChild(ghost);
        this.board.classList.add('piece-dragging');

        this._dragState = {
            sourceRow: candidate.row,
            sourceCol: candidate.col,
            sourcePiece,
            ghost,
            width: rect.width,
            height: rect.height,
            grabOffsetX: Math.min(rect.width, Math.max(0, candidate.grabOffsetX ?? (rect.width / 2))),
            grabOffsetY: Math.min(rect.height, Math.max(0, candidate.grabOffsetY ?? (rect.height / 2)))
        };
        this._queueDragUpdate(touch.clientX, touch.clientY);
        return true;
    }

    _queueDragUpdate(clientX, clientY) {
        this._pendingDragPoint = { clientX, clientY };
        if (this._dragFrameId) return;

        this._dragFrameId = requestAnimationFrame(() => {
            this._dragFrameId = 0;
            if (!this._pendingDragPoint) return;

            const { clientX: nextX, clientY: nextY } = this._pendingDragPoint;
            this._pendingDragPoint = null;
            this._updateDragGhost(nextX, nextY);
        });
    }

    _updateDragGhost(clientX, clientY) {
        if (!this._dragState?.ghost) return;

        const visualOffset = this._getDragVisualOffset();
        const x = clientX - this._dragState.grabOffsetX + visualOffset.x;
        const y = clientY - this._dragState.grabOffsetY + visualOffset.y;
        this._dragState.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.18)`;
    }

    _finishPieceDrag(clientX, clientY) {
        const state = this._dragState;
        if (!state) return;

        const coords = this._getCoordsFromPoint(clientX, clientY);
        const dragContext = {
            clientX,
            clientY,
            dropClientX: clientX,
            dropClientY: clientY,
            instantDrop: true
        };

        const isSameSource = coords?.row === state.sourceRow && coords?.col === state.sourceCol;
        const isLegalDrop = coords && !isSameSource && (this.canDropOn?.(coords.row, coords.col) ?? true);
        if (isLegalDrop) {
            this._cleanupPieceDrag();
            this.onDragDrop?.(coords.row, coords.col, dragContext);
        } else {
            this._cleanupPieceDrag();
            this.onDragCancel?.();
        }
    }

    _getDragVisualCenter(clientX, clientY) {
        const state = this._dragState;
        if (!state) return { clientX, clientY };

        return {
            clientX: clientX - state.grabOffsetX + (state.width / 2) + this._getDragVisualOffset().x,
            clientY: clientY - state.grabOffsetY + (state.height / 2) + this._getDragVisualOffset().y
        };
    }

    _getDragVisualOffset() {
        const state = this._dragState;
        if (!state) return { x: 0, y: 0 };

        const lift = Math.min(46, Math.max(28, state.height * 0.78));
        return { x: 0, y: -lift };
    }

    _cancelPieceDrag() {
        if (!this._dragState) return;
        this._cleanupPieceDrag();
        this.onDragCancel?.();
    }

    _cleanupPieceDrag() {
        if (this._dragFrameId) {
            cancelAnimationFrame(this._dragFrameId);
            this._dragFrameId = 0;
        }

        const state = this._dragState;
        if (state?.ghost?.parentNode) state.ghost.parentNode.removeChild(state.ghost);
        state?.sourcePiece?.classList.remove('drag-source');

        this.board.classList.remove('piece-dragging');
        this._pendingDragPoint = null;
        this._dragState = null;
        this._dragCandidate = null;
    }

    // ===== MAGNIFIER =====

    _showMagnifier(clientX, clientY) {
        if (!this._magnifierEnabled) return;
        this.magnifier.classList.add('active');
        this._ensureBoardClone();
        this._queueMagnifierUpdate(clientX, clientY);
    }

    _queueMagnifierUpdate(clientX, clientY) {
        this._pendingMagnifierPoint = { clientX, clientY };
        if (this._frameId) return;

        this._frameId = requestAnimationFrame(() => {
            this._frameId = 0;
            if (!this._pendingMagnifierPoint) return;

            const { clientX: nextX, clientY: nextY } = this._pendingMagnifierPoint;
            this._pendingMagnifierPoint = null;
            this._updateMagnifier(nextX, nextY);
        });
    }

    _updateMagnifier(clientX, clientY) {
        if (!this.magnifier.classList.contains('active')) return;

        const OFFSET_Y = -70; // 70px above finger
        const MAGNIFIER_SIZE = 120;
        const HALF = MAGNIFIER_SIZE / 2;

        // Position magnifier above the touch point
        let magX = clientX - HALF;
        let magY = clientY + OFFSET_Y - HALF;

        // Keep magnifier on screen
        magX = Math.max(4, Math.min(window.innerWidth - MAGNIFIER_SIZE - 4, magX));
        magY = Math.max(4, Math.min(window.innerHeight - MAGNIFIER_SIZE - 4, magY));

        this.magnifier.style.left = `${magX}px`;
        this.magnifier.style.top = `${magY}px`;

        // Clone the board region around touch point into magnifier
        this._renderMagnifiedRegion(clientX, clientY);
    }

    _renderMagnifiedRegion(clientX, clientY) {
        if (!this._boardClone) return;

        const boardRect = this._activeBoardRect || this.board.getBoundingClientRect();
        const SCALE = 2;
        const MAGNIFIER_SIZE = 120;

        // Calculate offset: center the touch point in the magnifier
        const relX = clientX - boardRect.left;
        const relY = clientY - boardRect.top;
        const offsetX = -(relX * SCALE) + MAGNIFIER_SIZE / 2;
        const offsetY = -(relY * SCALE) + MAGNIFIER_SIZE / 2;

        this._boardClone.style.left = `${offsetX}px`;
        this._boardClone.style.top = `${offsetY}px`;
    }

    _hideMagnifier() {
        this.magnifier.classList.remove('active');
        this._pendingMagnifierPoint = null;

        if (this._frameId) {
            cancelAnimationFrame(this._frameId);
            this._frameId = 0;
        }
    }

    _ensureBoardClone() {
        if (this._boardClone && !this._boardSnapshotDirty) return;

        this.magnifierContent.innerHTML = '';
        this._boardClone = this.board.cloneNode(true);
        this._boardClone.style.position = 'absolute';
        this._boardClone.style.transform = 'scale(2)';
        this._boardClone.style.transformOrigin = '0 0';
        this._boardClone.style.pointerEvents = 'none';
        this.magnifierContent.appendChild(this._boardClone);
        this._boardSnapshotDirty = false;
    }

    // ===== SMART SNAPPING =====

    /**
     * Find the nearest valid cell to the touch point and trigger a click on it.
     * Uses mathematical indexing to avoid scanning the DOM.
     */
    _snapToNearestCell(clientX, clientY) {
        const coords = this._getCoordsFromPoint(clientX, clientY);
        if (!coords) return;

        // Handle Citadels
        if (coords.col === -1 && coords.row >= 0 && coords.row < 10) {
            const el = document.getElementById('citadel-ai');
            if (el) el.click();
            return;
        }

        if (coords.col === 11 && coords.row >= 0 && coords.row < 10) {
            const el = document.getElementById('citadel-player');
            if (el) el.click();
            return;
        }

        if (coords.row >= 0 && coords.row < 10 && coords.col >= 0 && coords.col < 11) {
            const cell = this.getCellElement
                ? this.getCellElement(coords.row, coords.col)
                : this.board.querySelector(`.cell[data-row="${coords.row}"][data-col="${coords.col}"]`);
            if (cell) cell.click();
        }
    }

    _getCoordsFromPoint(clientX, clientY) {
        const cellSize = this.getCellSize();
        const boardRect = this._activeBoardRect || this.board.getBoundingClientRect();

        const relX = clientX - boardRect.left;
        const relY = clientY - boardRect.top;

        const rawCol = Math.floor(relX / cellSize);
        const rawRow = Math.floor(relY / cellSize);
        const isFlipped = !!this.isBoardFlipped();
        const col = isFlipped ? 10 - rawCol : rawCol;
        const row = isFlipped ? 9 - rawRow : rawRow;

        if ((col === -1 || col === 11) && row >= 0 && row < 10) {
            return { row, col };
        }

        if (row >= 0 && row < 10 && col >= 0 && col < 11) {
            return { row, col };
        }

        return null;
    }

    invalidateBoardSnapshot() {
        this._boardSnapshotDirty = true;
        if (this.magnifier.classList.contains('active')) {
            this._ensureBoardClone();
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }

        if (this._frameId) {
            cancelAnimationFrame(this._frameId);
            this._frameId = 0;
        }

        this._cancelPieceDrag();

        this.board.removeEventListener('touchstart', this._boundTouchStart);
        this.board.removeEventListener('touchmove', this._boundTouchMove);
        this.board.removeEventListener('touchend', this._boundTouchEnd);
        this.board.removeEventListener('touchcancel', this._boundTouchCancel);
        this.board.removeEventListener('mousedown', this._boundMouseDown);
        this.board.removeEventListener('click', this._boundClickCapture, true);
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
        window.removeEventListener('blur', this._boundMouseCancel);

        this._hideMagnifier();
        this.magnifierContent.innerHTML = '';
        this._boardClone = null;
        this._boardSnapshotDirty = true;
        this._activeBoardRect = null;
    }
}

// src/ui/TouchInteraction.js
// Mobile touch enhancements: offset magnifier + smart snapping
// Only activates on touch-capable devices

export class TouchInteraction {
    /**
     * @param {HTMLElement} boardElement - The .chess-board grid element
     * @param {HTMLElement} magnifierElement - The #magnifier element
     * @param {Function} getCellSize - Returns current cell size in px
     * @param {{ getCellElement?: Function, isBoardFlipped?: Function }} options
     */
    constructor(boardElement, magnifierElement, getCellSize, options = {}) {
        this.board = boardElement;
        this.magnifier = magnifierElement;
        this.magnifierContent = magnifierElement.querySelector('.magnifier-content');
        this.getCellSize = getCellSize;
        this.getCellElement = options.getCellElement || null;
        this.isBoardFlipped = options.isBoardFlipped || (() => false);
        this.isTouch = false;
        this.activeTouchId = null;
        this._holdTimer = null;
        this._boardClone = null;
        this._boardSnapshotDirty = true;
        this._frameId = 0;
        this._pendingMagnifierPoint = null;
        this._activeBoardRect = null;

        this._boundTouchStart = (e) => this._onTouchStart(e);
        this._boundTouchMove = (e) => this._onTouchMove(e);
        this._boundTouchEnd = (e) => this._onTouchEnd(e);
        this._boundTouchCancel = () => this._onTouchCancel();

        // Only setup on touch-capable devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this._setupTouchListeners();
        }
    }

    _setupTouchListeners() {
        // Use passive: false so we can preventDefault to stop scroll during board interaction
        this.board.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        this.board.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        this.board.addEventListener('touchend', this._boundTouchEnd, { passive: false });
        this.board.addEventListener('touchcancel', this._boundTouchCancel, { passive: true });
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

        // Show magnifier after a short hold (150ms)
        this._holdTimer = setTimeout(() => {
            this._showMagnifier(touch.clientX, touch.clientY);
        }, 150);
    }

    _onTouchMove(e) {
        if (!this.isTouch) return;
        e.preventDefault(); // Prevent scrolling while interacting with board

        const touch = this._getActiveTouch(e.touches);
        if (!touch) return;

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
        if (touch) {
            // Smart snapping: find nearest valid cell
            this._snapToNearestCell(touch.clientX, touch.clientY);
        }

        this._hideMagnifier();
        this.isTouch = false;
        this.activeTouchId = null;
        this._activeBoardRect = null;
    }

    _onTouchCancel() {
        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }

        this._hideMagnifier();
        this.isTouch = false;
        this.activeTouchId = null;
        this._activeBoardRect = null;
    }

    _getActiveTouch(touchList) {
        for (let i = 0; i < touchList.length; i++) {
            if (touchList[i].identifier === this.activeTouchId) {
                return touchList[i];
            }
        }
        return null;
    }

    // ===== MAGNIFIER =====

    _showMagnifier(clientX, clientY) {
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
        const cellSize = this.getCellSize();
        const boardRect = this._activeBoardRect || this.board.getBoundingClientRect();

        const relX = clientX - boardRect.left;
        const relY = clientY - boardRect.top;

        const rawCol = Math.floor(relX / cellSize);
        const rawRow = Math.floor(relY / cellSize);
        const isFlipped = !!this.isBoardFlipped();
        const col = isFlipped ? 10 - rawCol : rawCol;
        const row = isFlipped ? 9 - rawRow : rawRow;

        // Handle Citadels
        if (col === -1 && row >= 0 && row < 10) {
            const el = document.getElementById('citadel-ai');
            if (el) el.click();
            return;
        }

        if (col === 11 && row >= 0 && row < 10) {
            const el = document.getElementById('citadel-player');
            if (el) el.click();
            return;
        }

        if (row >= 0 && row < 10 && col >= 0 && col < 11) {
            const cell = this.getCellElement ? this.getCellElement(row, col) : this.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.click();
        }
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

        this.board.removeEventListener('touchstart', this._boundTouchStart);
        this.board.removeEventListener('touchmove', this._boundTouchMove);
        this.board.removeEventListener('touchend', this._boundTouchEnd);
        this.board.removeEventListener('touchcancel', this._boundTouchCancel);

        this._hideMagnifier();
        this.magnifierContent.innerHTML = '';
        this._boardClone = null;
        this._boardSnapshotDirty = true;
        this._activeBoardRect = null;
    }
}

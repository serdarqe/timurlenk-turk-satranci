// src/tutorial/InteractiveTutorial.js
// Interactive tutorial engine — renders mini-board and guides player through scenarios

import { SCENARIOS } from './TutorialScenarios.js';
import { PieceRenderer } from '../ui/PieceRenderer.js';

export class InteractiveTutorial {
    constructor(containerElement) {
        this.container = containerElement;
        this.currentScenarioIndex = 0;
        this.selectedCell = null;
        this.scenarioComplete = false;
        this.onComplete = null;
        this.onClose = null;
        this.onProgressChange = null;
        // Store deep copies of scenario pieces for reset
        this.originalPieces = SCENARIOS.map(s => JSON.parse(JSON.stringify(s.pieces)));
    }

    start(startIndex = 0) {
        this.currentScenarioIndex = Math.max(0, Math.min(startIndex, SCENARIOS.length - 1));
        this._resetCurrentScenario();
        this.renderScenario();
    }

    _resetCurrentScenario() {
        const idx = this.currentScenarioIndex;
        SCENARIOS[idx].pieces = JSON.parse(JSON.stringify(this.originalPieces[idx]));
    }

    renderScenario() {
        const scenario = SCENARIOS[this.currentScenarioIndex];
        if (!scenario) return;

        this.selectedCell = null;
        this.scenarioComplete = false;

        const totalScenarios = SCENARIOS.length;
        const progress = Math.round(((this.currentScenarioIndex + 1) / totalScenarios) * 100);

        this.container.innerHTML = `
            <div class="itut-header">
                <h2><i class="fas fa-gamepad"></i> Oynayarak Öğren</h2>
                <button id="itut-close" class="btn icon-btn" aria-label="Kapat"><i class="fas fa-times"></i></button>
            </div>

            <div class="itut-progress-bar">
                <div class="itut-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="itut-progress-label">Bölüm ${this.currentScenarioIndex + 1} / ${totalScenarios}</div>

            <div class="itut-title">${scenario.title}</div>
            <div class="itut-description">${scenario.description}</div>

            <div class="itut-board-wrapper">
                <div id="itut-board" class="itut-board grid-${scenario.boardSize}"></div>
            </div>

            <div id="itut-message" class="itut-message itut-instruction">${scenario.instruction}</div>

            <div class="itut-nav">
                <button id="itut-prev" class="btn secondary-btn" ${this.currentScenarioIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-left"></i> Önceki
                </button>
                <button id="itut-hint" class="btn hint-btn">
                    <i class="fas fa-lightbulb"></i> İpucu
                </button>
                <button id="itut-next" class="btn primary-btn" ${this.currentScenarioIndex >= totalScenarios - 1 ? 'disabled' : ''}>
                    Sonraki <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;

        if (typeof this.onProgressChange === 'function') {
            this.onProgressChange({
                scenarioIndex: this.currentScenarioIndex,
                totalScenarios,
                scenarioId: scenario.id
            });
        }

        // Render mini board
        this._renderBoard(scenario);

        // Set up event listeners
        this._setupListeners(scenario);
    }

    _renderBoard(scenario) {
        const boardEl = document.getElementById('itut-board');
        if (!boardEl) return;

        const size = scenario.boardSize;
        boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        boardEl.innerHTML = '';

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement('div');
                const isDark = (r + c) % 2 === 1;
                cell.className = `itut-cell ${isDark ? 'dark' : 'light'}`;
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Check if this is a valid target
                const isTarget = scenario.validTargets.some(t => t.row === r && t.col === c);
                if (isTarget && !this.scenarioComplete) {
                    cell.classList.add('itut-target');
                }

                // Check if this is the selectable piece
                if (scenario.selectPiece && scenario.selectPiece.row === r && scenario.selectPiece.col === c) {
                    cell.classList.add('itut-selectable');
                }

                // Add piece if exists
                const pieceData = scenario.pieces.find(p => p.row === r && p.col === c);
                if (pieceData) {
                    const pieceEl = PieceRenderer.createPieceElement(
                        pieceData.type, pieceData.color, pieceData.pawnType || null
                    );
                    cell.appendChild(pieceEl);
                }

                // Click handler
                cell.addEventListener('click', () => this._handleCellClick(r, c, scenario));

                boardEl.appendChild(cell);
            }
        }
    }

    _handleCellClick(row, col, scenario) {
        if (this.scenarioComplete) return;

        const clickedPiece = scenario.pieces.find(p => p.row === row && p.col === col);

        // If clicking on the selectable piece — select it
        if (clickedPiece && scenario.selectPiece &&
            row === scenario.selectPiece.row && col === scenario.selectPiece.col) {
            this.selectedCell = { row, col };

            // Visual feedback
            document.querySelectorAll('.itut-cell').forEach(c => c.classList.remove('itut-selected'));
            const cell = this._getCellAt(row, col);
            if (cell) cell.classList.add('itut-selected');
            return;
        }

        // If we have a selected piece and clicked a target — check if valid
        if (this.selectedCell) {
            const isValidTarget = scenario.validTargets.some(t => t.row === row && t.col === col);

            if (isValidTarget) {
                this._executeMove(scenario, this.selectedCell.row, this.selectedCell.col, row, col);
            } else {
                // Wrong move
                this._showMessage(scenario.hintMessage, 'itut-hint-msg');
                const cell = this._getCellAt(row, col);
                if (cell) {
                    cell.classList.add('itut-wrong');
                    setTimeout(() => cell.classList.remove('itut-wrong'), 600);
                }
            }
        } else {
            // Nothing selected, prompt to select
            this._showMessage(scenario.hintMessage, 'itut-hint-msg');
        }
    }

    _executeMove(scenario, fromRow, fromCol, toRow, toCol) {
        const boardEl = document.getElementById('itut-board');
        const sourceCell = this._getCellAt(fromRow, fromCol);
        const destCell = this._getCellAt(toRow, toCol);

        if (!sourceCell || !destCell) return;

        const pieceEl = sourceCell.querySelector('.piece');
        if (!pieceEl) return;

        // Calculate slide animation
        const sourceRect = sourceCell.getBoundingClientRect();
        const destRect = destCell.getBoundingClientRect();
        const deltaX = destRect.left - sourceRect.left;
        const deltaY = destRect.top - sourceRect.top;

        // Remove selection visuals
        document.querySelectorAll('.itut-cell').forEach(c => {
            c.classList.remove('itut-selected', 'itut-target', 'itut-selectable');
        });

        // Capture animation if target has a piece
        const capturedEl = destCell.querySelector('.piece');
        if (capturedEl) {
            capturedEl.classList.add('being-captured');
        }

        // Slide animation
        pieceEl.style.transition = 'none';
        pieceEl.style.transform = 'translate(0, 0)';
        pieceEl.style.zIndex = '100';
        pieceEl.style.position = 'relative';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                pieceEl.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
                pieceEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            });
        });

        setTimeout(() => {
            // Update scenario piece data
            const movedPiece = scenario.pieces.find(
                p => p.row === fromRow && p.col === fromCol
            );
            if (movedPiece) {
                movedPiece.row = toRow;
                movedPiece.col = toCol;
            }

            // Remove captured piece
            const capturedIdx = scenario.pieces.findIndex(
                p => p !== movedPiece && p.row === toRow && p.col === toCol
            );
            if (capturedIdx !== -1) {
                scenario.pieces.splice(capturedIdx, 1);
            }

            // Re-render board
            this.scenarioComplete = true;
            this._renderBoard(scenario);

            // Show success
            this._showMessage(scenario.successMessage, 'itut-success');

            // Highlight the moved piece's new position
            const newCell = this._getCellAt(toRow, toCol);
            if (newCell) {
                newCell.classList.add('itut-completed');
                const arrivedPiece = newCell.querySelector('.piece');
                if (arrivedPiece) {
                    arrivedPiece.classList.add('arriving');
                }
            }

            // Auto-advance after a delay
            if (this.currentScenarioIndex < SCENARIOS.length - 1) {
                const nextBtn = document.getElementById('itut-next');
                if (nextBtn) {
                    nextBtn.classList.add('itut-pulse');
                }
            } else if (typeof this.onComplete === 'function') {
                setTimeout(() => {
                    this.onComplete();
                }, 900);
            }
        }, 450);
    }

    _getCellAt(row, col) {
        return document.querySelector(`.itut-cell[data-row="${row}"][data-col="${col}"]`);
    }

    _showMessage(text, className) {
        const msgEl = document.getElementById('itut-message');
        if (msgEl) {
            msgEl.className = `itut-message ${className}`;
            msgEl.innerHTML = text;
        }
    }

    _setupListeners(scenario) {
        const closeBtn = document.getElementById('itut-close');
        const prevBtn = document.getElementById('itut-prev');
        const nextBtn = document.getElementById('itut-next');
        const hintBtn = document.getElementById('itut-hint');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.onClose) this.onClose();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentScenarioIndex > 0) {
                    this.currentScenarioIndex--;
                    // Reset scenario pieces to original
                    this._resetCurrentScenario();
                    this.renderScenario();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentScenarioIndex < SCENARIOS.length - 1) {
                    this.currentScenarioIndex++;
                    this._resetCurrentScenario();
                    this.renderScenario();
                }
            });
        }

        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                this._showMessage(scenario.hintMessage, 'itut-hint-msg');
            });
        }
    }


    goToScenario(index) {
        if (index >= 0 && index < SCENARIOS.length) {
            this.currentScenarioIndex = index;
            this.renderScenario();
        }
    }
}

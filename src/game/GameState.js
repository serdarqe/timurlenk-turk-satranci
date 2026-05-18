// src/game/GameState.js
import { Board } from './Board.js';
import { COLORS } from '../utils/constants.js';

export class GameState {
    constructor(difficulty = 'medium') {
        this.board = new Board();
        this.currentTurn = COLORS.WHITE;
        this.difficulty = difficulty;
        this.status = null; // null = playing, 'game_over' = ended
        this.winner = null;

        // Scripted Match (Tutorial)
        this.isScripted = false;
        this.scriptStep = 0;
        this.scriptData = null;

        // Game History
        this.moveHistory = [];
        this.capturedPieces = {
            [COLORS.WHITE]: [],
            [COLORS.BLACK]: []
        };
        this.analysisStatus = 'idle';
        this.analysisReport = null;

        // Special Rules State
        this.ransomMoveUsed = {
            [COLORS.WHITE]: false,
            [COLORS.BLACK]: false
        };
        this.citadelExchangeUsed = {
            [COLORS.WHITE]: false,
            [COLORS.BLACK]: false
        };

        this.kings = {
            [COLORS.WHITE]: [],
            [COLORS.BLACK]: []
        };
    }

    addCapture(piece) {
        if (!piece) return;
        const capturer = this.currentTurn;
        this.capturedPieces[capturer].push(piece);
    }

    switchTurn() {
        this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    }

    isGameOver() {
        if (this.status === 'game_over') return true;
        if (this.checkmate || this.stalemate) return true;
        return false;
    }

    static async createInitialState(formationType) {
        const state = new GameState();
        const { PieceFactory } = await import('./PieceFactory.js');
        PieceFactory.setupBoard(state.board, formationType);
        return state;
    }

    static async createPuzzleState(puzzleData) {
        const state = new GameState();
        state.currentTurn = puzzleData.turn || COLORS.WHITE;
        state.isScripted = false; // Bulmacalar serbest hareket edilebilir olmalı
        state.isPuzzle = true;
        state.puzzleObjective = puzzleData.objective;

        const { PieceFactory } = await import('./PieceFactory.js');
        PieceFactory.setupPuzzleBoard(state.board, puzzleData.pieces);
        return state;
    }
}

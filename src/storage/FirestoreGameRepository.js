import { collection, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { getGamesFirestore, isAnonymousGamesAuthReady } from './FirebaseGamesConfig.js';

function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function stripUndefined(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    );
}

function buildGameSummary(record) {
    return stripUndefined({
        schemaVersion: record.schemaVersion,
        gameId: record.gameId,
        createdAt: record.createdAt,
        finishedAt: record.finishedAt,
        uploadedAt: serverTimestamp(),
        storedMoveCount: record.moves?.length || 0,
        app: record.app,
        player: record.player,
        game: record.game,
        flags: record.flags,
        analysisSummary: record.analysisSummary || null
    });
}

function buildMoveDocument(move) {
    return stripUndefined({
        index: move.index,
        moveNumber: move.moveNumber,
        color: move.color,
        pieceTypeBefore: move.pieceTypeBefore,
        pieceTypeAfter: move.pieceTypeAfter,
        pawnType: move.pawnType || null,
        fromRow: move.fromRow,
        fromCol: move.fromCol,
        toRow: move.toRow,
        toCol: move.toCol,
        fromLabel: move.fromLabel,
        toLabel: move.toLabel,
        notation: move.notation,
        capturedPieceType: move.capturedPieceType || null,
        specialMoveType: move.specialMoveType || null,
        specialTags: move.specialTags || [],
        isCheck: Boolean(move.isCheck),
        resultType: move.resultType || null,
        beforeHash: move.beforeHash || null,
        afterHash: move.afterHash || null
    });
}

export class FirestoreGameRepository {
    constructor({ collectionName = 'games' } = {}) {
        this.collectionName = collectionName;
    }

    requiresAuth() {
        return true;
    }

    isReady() {
        return Boolean(getGamesFirestore() && isAnonymousGamesAuthReady());
    }

    async saveGameRecord(record) {
        const db = getGamesFirestore();
        if (!db) {
            const error = new Error('Firestore oyun kaydi icin hazir degil.');
            error.code = 'firestore_not_configured';
            throw error;
        }

        const gameRef = doc(db, this.collectionName, record.gameId);
        await setDoc(gameRef, buildGameSummary(record), { merge: true });

        const movesCollection = collection(gameRef, 'moves');
        const moveChunks = chunkArray(record.moves || [], 400);

        for (const chunk of moveChunks) {
            const batch = writeBatch(db);
            chunk.forEach((move) => {
                batch.set(doc(movesCollection, String(move.index)), buildMoveDocument(move), { merge: true });
            });
            await batch.commit();
        }

        return {
            ok: true,
            status: 'stored',
            gameId: record.gameId,
            storedMoveCount: record.moves?.length || 0
        };
    }
}

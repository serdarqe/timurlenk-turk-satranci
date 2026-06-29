import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import admin from 'firebase-admin';
import { validateAndSanitizeGameRecord } from './gameRecordValidator.js';

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const db = admin.firestore();
const collectionName = 'games';

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
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        fromLabel: move.fromLabel || null,
        toLabel: move.toLabel || null,
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

function analysisSummaryChanged(existingSummary, incomingSummary) {
    if (!incomingSummary) return false;
    return JSON.stringify(existingSummary || null) !== JSON.stringify(incomingSummary);
}

export const ingestGameRecord = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({
            ok: false,
            status: 'rejected',
            errorCode: 'method_not_allowed',
            message: 'Sadece POST destekleniyor.'
        });
        return;
    }

    const validation = validateAndSanitizeGameRecord(req.body);
    if (!validation.ok) {
        res.status(400).json({
            ok: false,
            status: 'rejected',
            errorCode: validation.errorCode,
            message: validation.message
        });
        return;
    }

    const record = validation.record;
    const gameRef = db.collection(collectionName).doc(record.gameId);
    const existingSnapshot = await gameRef.get();

    if (existingSnapshot.exists) {
        const existingData = existingSnapshot.data() || {};
        const sameMoveCount = Number(existingData.storedMoveCount || 0) === (record.moves?.length || 0);
        const hasNewAnalysis = analysisSummaryChanged(existingData.analysisSummary, record.analysisSummary);

        if (sameMoveCount && !hasNewAnalysis) {
            res.status(200).json({
                ok: true,
                status: 'duplicate',
                gameId: record.gameId,
                storedMoveCount: record.moves?.length || 0
            });
            return;
        }
    }

    await gameRef.set(buildGameSummary(record), { merge: true });

    const moveChunks = chunkArray(record.moves || [], 400);
    for (const chunk of moveChunks) {
        const batch = db.batch();
        for (const move of chunk) {
            const moveRef = gameRef.collection('moves').doc(String(move.index));
            batch.set(moveRef, buildMoveDocument(move), { merge: true });
        }
        await batch.commit();
    }

    res.status(200).json({
        ok: true,
        status: existingSnapshot.exists ? 'updated' : 'stored',
        gameId: record.gameId,
        storedMoveCount: record.moves?.length || 0
    });
});

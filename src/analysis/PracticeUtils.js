export function canPracticeAnalysisEntry(entry) {
    return Boolean(
        entry
        && entry.bestMove
        && typeof entry.bestMove.fromRow === 'number'
        && typeof entry.bestMove.fromCol === 'number'
        && typeof entry.bestMove.toRow === 'number'
        && typeof entry.bestMove.toCol === 'number'
    );
}

export function isMatchingExpectedMove(moveRecord, expectedMove) {
    if (!moveRecord || !expectedMove) return false;

    return (
        moveRecord.from?.row === expectedMove.fromRow
        && moveRecord.from?.col === expectedMove.fromCol
        && moveRecord.to?.row === expectedMove.toRow
        && moveRecord.to?.col === expectedMove.toCol
    );
}

export function getPracticeExplanationDetails(entry) {
    if (!entry?.bestMove) {
        return { reasons: [] };
    }

    const reasons = [];
    const bestMoveTags = entry.bestMove.tags || [];

    if (bestMoveTags.includes('checkmate')) {
        reasons.push({ key: 'analysis.explanation.reason.checkmate' });
    } else if (bestMoveTags.includes('stalemate')) {
        reasons.push({ key: 'analysis.explanation.reason.stalemate' });
    } else if (bestMoveTags.includes('check')) {
        reasons.push({ key: 'analysis.explanation.reason.check' });
    } else if (bestMoveTags.includes('citadel_exchange')) {
        reasons.push({ key: 'analysis.explanation.reason.citadel_exchange' });
    } else if (bestMoveTags.includes('royal_swap')) {
        reasons.push({ key: 'analysis.explanation.reason.royal_swap' });
    }

    if (entry.capturedPiece) {
        reasons.push({ key: 'analysis.explanation.reason.stronger_than_capture' });
    }

    if (typeof entry.loss === 'number' && entry.loss >= 15) {
        reasons.push({
            key: 'analysis.explanation.reason.swing',
            params: { value: Math.round(entry.loss) }
        });
    }

    if (
        reasons.length < 3
        && (
            (typeof entry.delta === 'number' && Math.abs(entry.delta) >= 18)
            || (typeof entry.loss === 'number' && entry.loss >= 40)
        )
    ) {
        reasons.push({ key: 'analysis.explanation.reason.balance' });
    }

    if (!reasons.length) {
        reasons.push({ key: 'analysis.explanation.reason.balance' });
    }

    return {
        reasons: reasons.slice(0, 3)
    };
}

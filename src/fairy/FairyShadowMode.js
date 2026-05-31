import {
    collectTimurLegalMoves,
    reconcileFairyMovesWithTimurRules,
    selectSafeTimurMoveFromFairyBestMove
} from './FairyTimurAdapter.js';

export function buildFairyShadowModeReport(state, {
    jsMoves = null,
    nativeRootMoves = null,
    nativeBestMove = null,
    fallbackMove = null
} = {}) {
    const legalJsMoves = jsMoves || collectTimurLegalMoves(state);
    const rootComparisonAvailable = Array.isArray(nativeRootMoves);
    const reconciliation = rootComparisonAvailable
        ? reconcileFairyMovesWithTimurRules(state, nativeRootMoves, {
            jsMoves: legalJsMoves
        })
        : buildBestMoveOnlyReconciliation(legalJsMoves);
    const nativeDecision = nativeBestMove
        ? selectSafeTimurMoveFromFairyBestMove(state, nativeBestMove, {
            jsMoves: legalJsMoves,
            fallbackMove
        })
        : null;
    const status = getShadowStatus(reconciliation, nativeDecision, rootComparisonAvailable);

    return {
        mode: 'fairy_shadow',
        authoritativeSource: 'js',
        status,
        rootComparisonAvailable,
        exactMatch: reconciliation.exactMatch,
        onlyExpectedDiffs: reconciliation.onlyExpectedPocDiffs,
        nativeBestMove: nativeDecision
            ? {
                status: nativeDecision.accepted ? 'accepted' : 'rejected',
                reason: nativeDecision.reason,
                normalizedBestMove: nativeDecision.normalizedBestMove,
                selectedMoveUci: nativeDecision.selectedMove?.uci ?? null
            }
            : null,
        stats: { ...reconciliation.stats },
        missingWrapperMoves: reconciliation.missingWrapperMoves,
        rejectedFairyMoves: reconciliation.rejectedFairyMoves,
        unexpectedJsOnly: reconciliation.unexpectedJsOnly,
        unexpectedFairyOnly: reconciliation.unexpectedFairyOnly,
        safeToLog: true
    };
}

export function selectJsAuthoritativeMoveWithFairyShadow(state, fairyBestMove, options = {}) {
    const jsMoves = options.jsMoves || collectTimurLegalMoves(state);
    const fallbackMove = options.fallbackMove ?? jsMoves.find((move) => !move.unsupported) ?? null;
    const nativeDecision = selectSafeTimurMoveFromFairyBestMove(state, fairyBestMove, {
        jsMoves,
        fallbackMove
    });
    const shadowReport = buildFairyShadowModeReport(state, {
        jsMoves,
        nativeRootMoves: options.nativeRootMoves ?? null,
        nativeBestMove: fairyBestMove,
        fallbackMove
    });

    if (typeof options.onShadowReport === 'function') {
        options.onShadowReport(shadowReport);
    }

    return {
        accepted: Boolean(fallbackMove),
        source: fallbackMove ? 'js_shadow' : 'none',
        reason: fallbackMove ? 'js_authoritative_shadow_mode' : 'no_js_fallback_move',
        selectedMove: fallbackMove,
        fallbackMove,
        nativeDecision,
        shadowReport
    };
}

function buildBestMoveOnlyReconciliation(jsMoves) {
    return {
        jsMoves,
        fairyMoves: [],
        acceptedMoves: [],
        missingWrapperMoves: [],
        rejectedFairyMoves: [],
        unexpectedJsOnly: [],
        unexpectedFairyOnly: [],
        exactMatch: false,
        onlyExpectedPocDiffs: true,
        stats: {
            jsMoveCount: jsMoves.length,
            fairyMoveCount: 0,
            acceptedMoveCount: 0,
            missingWrapperCount: 0,
            rejectedFairyCount: 0,
            unexpectedJsOnlyCount: 0,
            unexpectedFairyOnlyCount: 0
        }
    };
}

function getShadowStatus(reconciliation, nativeDecision, rootComparisonAvailable) {
    if (!rootComparisonAvailable) {
        if (nativeDecision?.accepted === true) return 'bestmove_only_accepted';
        if (nativeDecision?.accepted === false) return 'bestmove_only_rejected';
        return 'bestmove_only';
    }

    if (hasUnexpectedDiff(reconciliation) || nativeDecision?.accepted === false) {
        return 'mismatch';
    }
    if (reconciliation.exactMatch && (nativeDecision === null || nativeDecision.accepted)) {
        return 'in_sync';
    }
    if (reconciliation.onlyExpectedPocDiffs) {
        return 'expected_differences';
    }
    return 'mismatch';
}

function hasUnexpectedDiff(reconciliation) {
    return reconciliation.stats.unexpectedJsOnlyCount > 0
        || reconciliation.stats.unexpectedFairyOnlyCount > 0;
}

const MAX_MOVES = 800;
const MAX_NOTATION_LENGTH = 80;
const MAX_TOKEN_LENGTH = 128;
const FORBIDDEN_KEYS = new Set([
    'email',
    'ip',
    'ipaddress',
    'roomcode',
    'peertid',
    'peerid',
    'stack',
    'rawerror'
]);

const ALLOWED_MODES = new Set(['ai', 'online', 'tutorial', 'puzzle', 'analysis_practice']);
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const ALLOWED_COLORS = new Set(['white', 'black', 'draw']);
const ALLOWED_RECORDED_BY = new Set(['local_player', 'host', 'guest']);

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}

function isFiniteInteger(value) {
    return Number.isInteger(value) && Number.isFinite(value);
}

function normalizeOptionalInteger(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value == null) return null;
    if (!isFiniteInteger(value)) return null;
    if (value < min || value > max) return null;
    return value;
}

function isSlug(value) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 64
        && /^[a-z0-9_]+$/i.test(value);
}

function findForbiddenKey(value, path = '$') {
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            const result = findForbiddenKey(value[index], `${path}[${index}]`);
            if (result) return result;
        }
        return null;
    }

    if (!isPlainObject(value)) return null;

    for (const [key, nestedValue] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(String(key).toLowerCase())) {
            return `${path}.${key}`;
        }
        const nestedResult = findForbiddenKey(nestedValue, `${path}.${key}`);
        if (nestedResult) return nestedResult;
    }

    return null;
}

function normalizeString(value, { maxLength = MAX_TOKEN_LENGTH, allowEmpty = false } = {}) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!allowEmpty && !trimmed) return null;
    if (trimmed.length > maxLength) return null;
    return trimmed;
}

function normalizeTimestamp(value) {
    const normalized = normalizeString(value, { maxLength: 64 });
    if (!normalized) return null;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function normalizeBoolean(value) {
    return value === true;
}

function normalizeOptionalSlug(value) {
    if (value == null) return null;
    return isSlug(value) ? value : null;
}

function normalizeAiBotSummary(game) {
    const source = isPlainObject(game?.aiBot) ? game.aiBot : {};
    const id = normalizeOptionalSlug(source.id) || normalizeOptionalSlug(game?.aiBotId);
    if (!id) return null;

    return {
        id,
        level: normalizeOptionalInteger(source.level ?? game?.aiBotLevel, { min: 1, max: 15 }),
        stars: normalizeOptionalInteger(source.stars ?? game?.aiBotStars, { min: 1, max: 5 }),
        label: normalizeString(source.label, { maxLength: 64, allowEmpty: true })
    };
}

function normalizeSpecialTags(value) {
    if (!Array.isArray(value)) return [];
    const tags = [];

    for (const item of value) {
        if (!isSlug(item)) return null;
        tags.push(String(item));
    }

    return tags;
}

function normalizeMove(move, index) {
    if (!isPlainObject(move)) {
        return { ok: false, error: `moves[${index}] object degil.` };
    }

    const normalized = {
        index: isFiniteInteger(move.index) ? move.index : null,
        moveNumber: isFiniteInteger(move.moveNumber) ? move.moveNumber : null,
        color: ALLOWED_COLORS.has(move.color) ? move.color : null,
        pieceTypeBefore: normalizeOptionalSlug(move.pieceTypeBefore),
        pieceTypeAfter: normalizeOptionalSlug(move.pieceTypeAfter),
        pawnType: normalizeOptionalSlug(move.pawnType),
        fromRow: isFiniteInteger(move.fromRow) ? move.fromRow : null,
        fromCol: isFiniteInteger(move.fromCol) ? move.fromCol : null,
        toRow: isFiniteInteger(move.toRow) ? move.toRow : null,
        toCol: isFiniteInteger(move.toCol) ? move.toCol : null,
        fromLabel: normalizeString(move.fromLabel, { maxLength: 16, allowEmpty: true }),
        toLabel: normalizeString(move.toLabel, { maxLength: 16, allowEmpty: true }),
        notation: normalizeString(move.notation, { maxLength: MAX_NOTATION_LENGTH }),
        capturedPieceType: normalizeOptionalSlug(move.capturedPieceType),
        specialMoveType: normalizeOptionalSlug(move.specialMoveType),
        specialTags: normalizeSpecialTags(move.specialTags),
        isCheck: normalizeBoolean(move.isCheck),
        resultType: normalizeOptionalSlug(move.resultType),
        beforeHash: normalizeString(move.beforeHash, { maxLength: 256, allowEmpty: true }),
        afterHash: normalizeString(move.afterHash, { maxLength: 256, allowEmpty: true })
    };

    if (!normalized.index || !normalized.moveNumber || !normalized.color || !normalized.notation) {
        return { ok: false, error: `moves[${index}] zorunlu alanlari gecersiz.` };
    }

    if (!Array.isArray(normalized.specialTags)) {
        return { ok: false, error: `moves[${index}].specialTags gecersiz.` };
    }

    return { ok: true, move: normalized };
}

function normalizeAnalysisSummary(value) {
    if (value == null) return null;
    if (!isPlainObject(value)) return null;

    const rawAccuracy = isPlainObject(value.rawAccuracy)
        ? {
            white: Number.isFinite(value.rawAccuracy.white) ? Number(value.rawAccuracy.white) : null,
            black: Number.isFinite(value.rawAccuracy.black) ? Number(value.rawAccuracy.black) : null
        }
        : null;

    return {
        whiteAccuracy: Number.isFinite(value.whiteAccuracy) ? Number(value.whiteAccuracy) : null,
        blackAccuracy: Number.isFinite(value.blackAccuracy) ? Number(value.blackAccuracy) : null,
        biggestSwingIndex: isFiniteInteger(value.biggestSwingIndex) ? value.biggestSwingIndex : null,
        biggestSwingDelta: Number.isFinite(value.biggestSwingDelta) ? Number(value.biggestSwingDelta) : null,
        resultType: normalizeString(value.resultType, { maxLength: 64 }) || null,
        winner: ALLOWED_COLORS.has(value.winner) ? value.winner : null,
        analysisProfile: normalizeOptionalSlug(value.analysisProfile),
        outcomeAdjusted: normalizeBoolean(value.outcomeAdjusted),
        rawAccuracy
    };
}

export function validateAndSanitizeGameRecord(payload) {
    if (!isPlainObject(payload)) {
        return { ok: false, errorCode: 'invalid_payload', message: 'Payload object degil.' };
    }

    const forbiddenPath = findForbiddenKey(payload);
    if (forbiddenPath) {
        return {
            ok: false,
            errorCode: 'forbidden_field',
            message: `Yasakli alan bulundu: ${forbiddenPath}`
        };
    }

    const schemaVersion = payload.schemaVersion;
    const gameId = normalizeString(payload.gameId, { maxLength: 64 });
    const createdAt = normalizeTimestamp(payload.createdAt);
    const finishedAt = normalizeTimestamp(payload.finishedAt);
    const app = isPlainObject(payload.app) ? payload.app : {};
    const player = isPlainObject(payload.player) ? payload.player : {};
    const game = isPlainObject(payload.game) ? payload.game : {};
    const flags = isPlainObject(payload.flags) ? payload.flags : {};
    const moves = Array.isArray(payload.moves) ? payload.moves : null;
    const aiBot = normalizeAiBotSummary(game);

    if (schemaVersion !== 1 || !gameId || !createdAt || !finishedAt || !moves) {
        return {
            ok: false,
            errorCode: 'invalid_payload',
            message: 'Temel oyun kaydi alanlari eksik veya gecersiz.'
        };
    }

    if (moves.length > MAX_MOVES) {
        return {
            ok: false,
            errorCode: 'too_many_moves',
            message: `Maksimum ${MAX_MOVES} hamle destekleniyor.`
        };
    }

    if (!ALLOWED_MODES.has(game.mode) || !ALLOWED_DIFFICULTIES.has(game.difficulty)) {
        return {
            ok: false,
            errorCode: 'invalid_game_meta',
            message: 'Oyun modu veya zorluk seviyesi gecersiz.'
        };
    }

    if (
        !ALLOWED_COLORS.has(game.localColor)
        || (game.aiColor != null && !ALLOWED_COLORS.has(game.aiColor))
        || (game.winner != null && !ALLOWED_COLORS.has(game.winner))
    ) {
        return {
            ok: false,
            errorCode: 'invalid_color_meta',
            message: 'Renk alanlari gecersiz.'
        };
    }

    if (!ALLOWED_RECORDED_BY.has(player.recordedBy)) {
        return {
            ok: false,
            errorCode: 'invalid_player_meta',
            message: 'recordedBy alani gecersiz.'
        };
    }

    if (!isFiniteInteger(game.moveCount) || game.moveCount !== moves.length) {
        return {
            ok: false,
            errorCode: 'move_count_mismatch',
            message: 'moveCount ile moves uzunlugu uyusmuyor.'
        };
    }

    const normalizedMoves = [];
    for (let index = 0; index < moves.length; index += 1) {
        const result = normalizeMove(moves[index], index);
        if (!result.ok) {
            return {
                ok: false,
                errorCode: 'invalid_move',
                message: result.error
            };
        }
        normalizedMoves.push(result.move);
    }

    return {
        ok: true,
        record: {
            schemaVersion: 1,
            gameId,
            createdAt,
            finishedAt,
            app: {
                platform: normalizeString(app.platform, { maxLength: 32 }) || 'android',
                version: normalizeString(app.version, { maxLength: 32 }) || 'unknown',
                buildNumber: normalizeString(app.buildNumber, { maxLength: 16 }) || 'unknown',
                locale: normalizeString(app.locale, { maxLength: 10 }) || 'tr'
            },
            player: {
                installToken: normalizeString(player.installToken, { maxLength: 96 }) || 'anon_unknown',
                authUid: normalizeString(player.authUid, { maxLength: 128, allowEmpty: true }) || null,
                recordedBy: player.recordedBy
            },
            game: {
                mode: game.mode,
                difficulty: game.difficulty,
                aiPersonaId: normalizeOptionalSlug(game.aiPersonaId),
                aiPersonaStyle: normalizeOptionalSlug(game.aiPersonaStyle),
                aiBotId: aiBot?.id || null,
                aiBotLevel: aiBot?.level || null,
                aiBotStars: aiBot?.stars || null,
                aiBot,
                formation: normalizeOptionalSlug(game.formation),
                isOnline: normalizeBoolean(game.isOnline),
                isScripted: normalizeBoolean(game.isScripted),
                isPuzzle: normalizeBoolean(game.isPuzzle),
                localColor: game.localColor,
                aiColor: game.aiColor || null,
                timeControl: normalizeOptionalSlug(game.timeControl) || 'none',
                whiteTimeLeftMs: normalizeOptionalInteger(game.whiteTimeLeftMs, { min: 0 }),
                blackTimeLeftMs: normalizeOptionalInteger(game.blackTimeLeftMs, { min: 0 }),
                winner: game.winner || null,
                resultType: normalizeOptionalSlug(game.resultType) || 'unknown',
                moveCount: game.moveCount,
                durationSeconds: isFiniteInteger(game.durationSeconds) ? game.durationSeconds : 0,
                specialEventCount: isFiniteInteger(game.specialEventCount) ? game.specialEventCount : 0
            },
            flags: {
                hasRoyalSwap: normalizeBoolean(flags.hasRoyalSwap),
                hasCitadelExchange: normalizeBoolean(flags.hasCitadelExchange),
                hasPawnCycle: normalizeBoolean(flags.hasPawnCycle),
                hasPromotion: normalizeBoolean(flags.hasPromotion)
            },
            analysisSummary: normalizeAnalysisSummary(payload.analysisSummary),
            moves: normalizedMoves
        }
    };
}

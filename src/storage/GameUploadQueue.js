const STORAGE_KEY = 'timur_game_upload_queue_v1';
const MAX_QUEUE_SIZE = 50;

function readQueue(storage) {
    try {
        const raw = storage?.getItem?.(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Game upload queue read failed:', error);
        return [];
    }
}

function writeQueue(storage, entries) {
    try {
        storage?.setItem?.(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_QUEUE_SIZE)));
    } catch (error) {
        console.warn('Game upload queue write failed:', error);
    }
}

export class GameUploadQueue {
    constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        this.storage = storage;
    }

    list() {
        return readQueue(this.storage);
    }

    upsert(record) {
        if (!record?.gameId) return;

        const current = this.list();
        const existing = current.find((entry) => entry.gameId === record.gameId);
        const nextEntry = {
            gameId: record.gameId,
            queuedAt: existing?.queuedAt || new Date().toISOString(),
            attempts: existing?.attempts || 0,
            lastErrorCode: existing?.lastErrorCode || null,
            record
        };

        const nextEntries = [
            ...current.filter((entry) => entry.gameId !== record.gameId),
            nextEntry
        ];

        writeQueue(this.storage, nextEntries);
    }

    remove(gameId) {
        const nextEntries = this.list().filter((entry) => entry.gameId !== gameId);
        writeQueue(this.storage, nextEntries);
    }

    markFailure(gameId, errorCode = 'upload_failed') {
        const nextEntries = this.list().map((entry) => (
            entry.gameId === gameId
                ? {
                    ...entry,
                    attempts: (entry.attempts || 0) + 1,
                    lastErrorCode: errorCode,
                    lastAttemptAt: new Date().toISOString()
                }
                : entry
        ));

        writeQueue(this.storage, nextEntries);
    }
}


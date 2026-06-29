import { createGameRecordRepository } from './GameRecordRepositoryFactory.js';
import {
    ensureAnonymousGamesAuth,
    getCurrentGamesAuthUid,
    subscribeGamesAuthState
} from './FirebaseGamesConfig.js';
import { GameUploadQueue } from './GameUploadQueue.js';

function defaultIsOnline() {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
}

function applyAuthUidToRecord(record, authUid) {
    if (!record || !authUid) return record;
    if (record.player?.authUid === authUid) return record;

    return {
        ...record,
        player: {
            ...(record.player || {}),
            authUid
        }
    };
}

export class GameUploadService {
    constructor({
        queue = new GameUploadQueue(),
        repository = createGameRecordRepository(),
        isOnline = defaultIsOnline,
        getAuthUid = getCurrentGamesAuthUid
    } = {}) {
        this.queue = queue;
        this.repository = repository;
        this.isOnline = isOnline;
        this.getAuthUid = getAuthUid;
        this.isFlushing = false;
        this.started = false;
        this.unsubscribeAuth = null;
    }

    start() {
        if (this.started) return;
        this.started = true;

        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                void this.flush();
            });
        }

        if (this.repository.requiresAuth?.()) {
            this.unsubscribeAuth = subscribeGamesAuthState(() => {
                void this.flush();
            });

            void ensureAnonymousGamesAuth().catch((error) => {
                console.warn('Anonymous Firebase auth baslatilamadi:', error);
            });
        }

        void this.flush();
    }

    async enqueue(record) {
        if (!record?.gameId) return false;

        this.queue.upsert(record);
        await this.flush();
        return true;
    }

    async flush() {
        if (this.isFlushing) return false;
        if (!this.repository.isReady()) return false;
        if (!this.isOnline()) return false;

        this.isFlushing = true;
        try {
            const entries = this.queue.list();

            for (const entry of entries) {
                try {
                    let recordToUpload = entry.record;

                    if (this.repository.requiresAuth?.()) {
                        const authUid = this.getAuthUid();
                        if (!authUid) {
                            break;
                        }

                        if (recordToUpload?.player?.authUid !== authUid) {
                            recordToUpload = applyAuthUidToRecord(recordToUpload, authUid);
                            this.queue.upsert(recordToUpload);
                        }
                    }

                    await this.repository.saveGameRecord(recordToUpload);
                    this.queue.remove(entry.gameId);
                } catch (error) {
                    this.queue.markFailure(entry.gameId, error?.code || 'upload_failed');
                    console.warn(`Game record upload failed for ${entry.gameId}:`, error);
                }
            }

            return true;
        } finally {
            this.isFlushing = false;
        }
    }
}

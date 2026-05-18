import test from 'node:test';
import assert from 'node:assert/strict';
import { GameUploadQueue } from '../src/storage/GameUploadQueue.js';
import { GameUploadService } from '../src/storage/GameUploadService.js';

function createMemoryStorage() {
    const data = new Map();
    return {
        getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            data.set(key, value);
        }
    };
}

test('GameUploadService auth gerektiren kayda authUid ekleyip yukler', async () => {
    const queue = new GameUploadQueue(createMemoryStorage());
    const uploads = [];
    const repository = {
        requiresAuth() {
            return true;
        },
        isReady() {
            return true;
        },
        async saveGameRecord(record) {
            uploads.push(record);
        }
    };

    const service = new GameUploadService({
        queue,
        repository,
        isOnline: () => true,
        getAuthUid: () => 'firebase_uid_123'
    });

    await service.enqueue({
        gameId: 'g_auth_1',
        player: {
            installToken: 'anon_install',
            authUid: null,
            recordedBy: 'local_player'
        },
        moves: []
    });

    assert.equal(uploads.length, 1);
    assert.equal(uploads[0].player.authUid, 'firebase_uid_123');
    assert.equal(queue.list().length, 0);
});

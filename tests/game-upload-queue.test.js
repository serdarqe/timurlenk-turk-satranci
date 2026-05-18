import test from 'node:test';
import assert from 'node:assert/strict';
import { GameUploadQueue } from '../src/storage/GameUploadQueue.js';

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

test('queue upsert ayni gameId icin kaydi gunceller', () => {
    const queue = new GameUploadQueue(createMemoryStorage());
    queue.upsert({ gameId: 'g1', analysisSummary: null });
    queue.upsert({ gameId: 'g1', analysisSummary: { whiteAccuracy: 70 } });

    const entries = queue.list();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].record.analysisSummary.whiteAccuracy, 70);
});

test('queue markFailure deneme sayisini artirir', () => {
    const queue = new GameUploadQueue(createMemoryStorage());
    queue.upsert({ gameId: 'g2' });
    queue.markFailure('g2', 'permission_denied');

    const entry = queue.list()[0];
    assert.equal(entry.attempts, 1);
    assert.equal(entry.lastErrorCode, 'permission_denied');
});

test('queue remove kaydi listeden siler', () => {
    const queue = new GameUploadQueue(createMemoryStorage());
    queue.upsert({ gameId: 'g3' });
    queue.remove('g3');
    assert.equal(queue.list().length, 0);
});


import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudGameRepository } from '../src/storage/CloudGameRepository.js';

test('CloudGameRepository hazir endpoint varsa calisir', () => {
    const repository = new CloudGameRepository({
        endpoint: 'https://example.com/ingestGameRecord',
        fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, status: 'stored' }) })
    });

    assert.equal(repository.isReady(), true);
});

test('CloudGameRepository basarili cevabi dondurur', async () => {
    let requestBody = null;
    const repository = new CloudGameRepository({
        endpoint: 'https://example.com/ingestGameRecord',
        fetchImpl: async (_url, options) => {
            requestBody = JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({ ok: true, status: 'stored', gameId: 'g1', storedMoveCount: 2 })
            };
        }
    });

    const result = await repository.saveGameRecord({
        gameId: 'g1',
        app: { version: '1.2.10', buildNumber: '22', platform: 'android' },
        player: { installToken: 'anon' },
        moves: [{ index: 1 }, { index: 2 }]
    });

    assert.equal(requestBody.gameId, 'g1');
    assert.equal(result.status, 'stored');
});

test('CloudGameRepository hata cevabini koduyla firlatir', async () => {
    const repository = new CloudGameRepository({
        endpoint: 'https://example.com/ingestGameRecord',
        fetchImpl: async () => ({
            ok: false,
            status: 400,
            json: async () => ({
                ok: false,
                status: 'rejected',
                errorCode: 'invalid_payload',
                message: 'bad payload'
            })
        })
    });

    await assert.rejects(
        () => repository.saveGameRecord({ gameId: 'g1', app: {}, player: {}, moves: [] }),
        (error) => error.code === 'invalid_payload'
    );
});

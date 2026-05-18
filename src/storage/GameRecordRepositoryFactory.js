import { CloudGameRepository } from './CloudGameRepository.js';
import { FirestoreGameRepository } from './FirestoreGameRepository.js';
import { hasFirebaseGamesConfig, hasGameRecordEndpoint } from './FirebaseGamesConfig.js';

export function createGameRecordRepository() {
    if (hasGameRecordEndpoint()) {
        return new CloudGameRepository();
    }

    if (hasFirebaseGamesConfig()) {
        return new FirestoreGameRepository();
    }

    return {
        requiresAuth() {
            return false;
        },
        isReady() {
            return false;
        },
        async saveGameRecord() {
            const error = new Error('Game record repository hazir degil.');
            error.code = 'repository_not_configured';
            throw error;
        }
    };
}

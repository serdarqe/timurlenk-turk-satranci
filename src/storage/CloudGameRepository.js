import { getGameRecordEndpoint } from './FirebaseGamesConfig.js';

function createRepositoryError(message, code, status = 0) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

export class CloudGameRepository {
    constructor({
        endpoint = getGameRecordEndpoint(),
        fetchImpl = globalThis.fetch,
        timeoutMs = 15000
    } = {}) {
        this.endpoint = endpoint;
        this.fetchImpl = fetchImpl;
        this.timeoutMs = timeoutMs;
    }

    isReady() {
        return Boolean(this.endpoint && typeof this.fetchImpl === 'function');
    }

    requiresAuth() {
        return false;
    }

    async saveGameRecord(record) {
        if (!this.isReady()) {
            throw createRepositoryError(
                'Game ingest endpoint hazir degil.',
                'cloud_endpoint_not_configured'
            );
        }

        const controller = typeof AbortController !== 'undefined'
            ? new AbortController()
            : null;
        const timeoutId = controller
            ? setTimeout(() => controller.abort(), this.timeoutMs)
            : null;

        try {
            const response = await this.fetchImpl(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-App-Version': String(record?.app?.version || 'unknown'),
                    'X-Build-Number': String(record?.app?.buildNumber || 'unknown'),
                    'X-Platform': String(record?.app?.platform || 'web'),
                    'X-Install-Token': String(record?.player?.installToken || 'anon_unknown')
                },
                body: JSON.stringify(record),
                signal: controller?.signal
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok || payload?.ok === false) {
                const code = payload?.errorCode
                    || payload?.status
                    || `http_${response.status}`;
                throw createRepositoryError(
                    payload?.message || 'Game ingest istegi basarisiz oldu.',
                    code,
                    response.status
                );
            }

            return payload || {
                ok: true,
                status: 'stored',
                gameId: record.gameId,
                storedMoveCount: record.moves?.length || 0
            };
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw createRepositoryError(
                    'Game ingest istegi zaman asimina ugradi.',
                    'request_timeout'
                );
            }
            throw error;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }
}

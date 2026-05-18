export class GameAnalysisEngine {
    static worker = null;
    static pendingRequestId = 0;
    static analytics = null;

    static setAnalytics(analytics) {
        GameAnalysisEngine.analytics = analytics;
    }

    static initWorker() {
        if (!GameAnalysisEngine.worker) {
            GameAnalysisEngine.worker = new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' });
        }
    }

    static analyzeGame(moveHistory = [], meta = {}) {
        GameAnalysisEngine.initWorker();

        const requestId = ++GameAnalysisEngine.pendingRequestId;

        return new Promise((resolve, reject) => {
            const onMessage = (event) => {
                const data = event.data;
                if (data.requestId !== requestId) return;

                GameAnalysisEngine.worker.removeEventListener('message', onMessage);
                GameAnalysisEngine.worker.removeEventListener('error', onError);

                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }

                resolve(data.report);
            };

            const onError = (error) => {
                GameAnalysisEngine.worker.removeEventListener('message', onMessage);
                GameAnalysisEngine.worker.removeEventListener('error', onError);
                GameAnalysisEngine.analytics?.track('worker_error', {
                    worker_type: 'analysis_worker',
                    stage: 'onerror',
                    error_code: 'worker_crash'
                });
                reject(error);
            };

            GameAnalysisEngine.worker.addEventListener('message', onMessage);
            GameAnalysisEngine.worker.addEventListener('error', onError);
            GameAnalysisEngine.worker.postMessage({
                requestId,
                moveHistory,
                meta
            });
        });
    }
}

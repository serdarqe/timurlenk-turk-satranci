import { isAllowedAnalyticsEvent, sanitizeAnalyticsPayload } from './AnalyticsCatalog.js';

function createFallbackAdapter() {
    return {
        track(eventName, payload) {
            console.debug('[analytics]', eventName, payload);
        }
    };
}

function createAnonymousId(prefix = 'anon') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export class AnalyticsManager {
    constructor({
        adapter,
        installId,
        sessionId,
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        appVersion = 'dev',
        buildNumber = 'dev',
        language = 'tr',
        platform = 'web'
    } = {}) {
        this.adapter = adapter || createFallbackAdapter();
        this.installId = installId;
        this.sessionId = sessionId;
        this.storage = storage;
        this.appVersion = appVersion;
        this.buildNumber = buildNumber;
        this.language = language;
        this.platform = platform;
        this.sessionStartedAt = null;
    }

    setLanguage(language) {
        this.language = language;
    }

    setPlatform(platform) {
        this.platform = platform;
    }

    setAppInfo({ appVersion, buildNumber } = {}) {
        if (appVersion) this.appVersion = appVersion;
        if (buildNumber) this.buildNumber = buildNumber;
    }

    ensureInstallId() {
        if (this.installId) return this.installId;

        const existing = this.storage?.getItem?.('analytics_install_id');
        this.installId = existing || createAnonymousId('install');
        this.storage?.setItem?.('analytics_install_id', this.installId);
        return this.installId;
    }

    startSession(screenName = 'app_boot') {
        this.ensureInstallId();
        this.sessionId = createAnonymousId('session');
        this.sessionStartedAt = Date.now();
        this.track('session_start', { screen_name: screenName });
        return this.sessionId;
    }

    endSession(screenName = 'app_exit') {
        if (!this.sessionStartedAt) return null;

        const durationSeconds = Math.max(1, Math.round((Date.now() - this.sessionStartedAt) / 1000));
        this.track('session_end', {
            screen_name: screenName,
            duration_seconds: durationSeconds
        });
        this.sessionStartedAt = null;
        return durationSeconds;
    }

    track(eventName, payload = {}) {
        if (!isAllowedAnalyticsEvent(eventName)) return;

        this.ensureInstallId();
        const sanitizedPayload = sanitizeAnalyticsPayload(eventName, payload);
        const enrichedPayload = {
            ...sanitizedPayload,
            install_id_hash: this.installId,
            session_id: this.sessionId,
            app_version: this.appVersion,
            build_number: this.buildNumber,
            language: this.language,
            platform: this.platform
        };

        try {
            this.adapter.track(eventName, enrichedPayload);
        } catch (error) {
            console.warn(`Analytics adapter failed for ${eventName}`, error);
        }
    }
}

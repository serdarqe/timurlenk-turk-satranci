import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { mapFirebaseEventName, mapFirebaseParams } from './FirebaseAnalyticsNaming.js';

export class FirebaseAnalyticsAdapter {
    constructor({ enabled = true } = {}) {
        this.enabled = enabled;
        this.initPromise = null;
    }

    async ensureReady() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            if (!Capacitor.isNativePlatform()) return false;

            try {
                await FirebaseAnalytics.setEnabled({ enabled: this.enabled });
                return true;
            } catch (error) {
                console.warn('Firebase Analytics could not be enabled.', error);
                return false;
            }
        })();

        return this.initPromise;
    }

    track(eventName, payload = {}) {
        void this.logEvent(eventName, payload);
    }

    async logEvent(eventName, payload = {}) {
        const ready = await this.ensureReady();
        if (!ready) return;

        try {
            if (payload.screen_name) {
                await FirebaseAnalytics.setCurrentScreen({
                    screenName: String(payload.screen_name).slice(0, 36),
                    screenClassOverride: 'TimurChess'
                });
            }

            await FirebaseAnalytics.logEvent({
                name: mapFirebaseEventName(eventName),
                params: mapFirebaseParams(payload)
            });
        } catch (error) {
            console.warn(`Firebase Analytics event failed: ${eventName}`, error);
        }
    }
}


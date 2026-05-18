import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    BannerAdPluginEvents,
    InterstitialAdPluginEvents
} from '@capacitor-community/admob';
import { Device } from '@capacitor/device';

export class AdManager {
    static isInitialized = false;
    static analytics = null;

    // Gerçek AdMob ID'leri
    static BANNER_ID = 'ca-app-pub-6602015870544309/9348182727';
    static INTERSTITIAL_ID = 'ca-app-pub-6602015870544309/6155731530';

    static setAnalytics(analytics) {
        this.analytics = analytics;
    }

    static async initialize() {
        if (this.isInitialized) return;

        try {
            const info = await Device.getInfo();
            if (info.platform === 'web') {
                console.log('AdMob: Ads are disabled on web platform.');
                return;
            }

            // 1. Olay dinleyicilerini kur
            this.setupEventListeners();

            // 2. GDPR / UMP Consent Kontrolü
            await this.handleConsent(info.platform);

            // 3. AdMob'u başlat
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                testingDevices: [],
                initializeForTesting: false,
            });

            this.isInitialized = true;
            console.log('AdMob: Initialized successfully.');

            // Başlangıçta banner göster ve geçiş reklamını hazırla
            this.showBanner();
            this.prepareInterstitial();
        } catch (error) {
            console.error('AdMob: Initialization failed:', error);
        }
    }

    static async handleConsent(platform = 'native') {
        try {
            console.log('AdMob: Checking consent status...');
            const consentInfo = await AdMob.requestConsentInfoUpdate();

            if (consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED') {
                console.log('AdMob: Consent form required, showing form...');
                this.analytics?.track('consent_shown', { platform });
                await AdMob.showConsentForm();
                console.log('AdMob: Consent form completed.');
            } else {
                console.log('AdMob: Consent already obtained or not required. Status:', consentInfo.status);
            }

            this.analytics?.track('consent_completed', {
                platform,
                status: consentInfo.status || 'UNKNOWN'
            });
        } catch (error) {
            console.warn('AdMob: Consent process failed or skipped:', error);
        }
    }

    static setupEventListeners() {
        // Banner Olayları
        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            console.log('AdMob: Banner ad loaded.');
            this.analytics?.track('ad_loaded', { ad_type: 'banner', placement: 'bottom_banner' });
        });

        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdMob: Banner ad failed to load:', error);
            this.analytics?.track('ad_failed', {
                ad_type: 'banner',
                placement: 'bottom_banner',
                error_code: String(error?.code || 'unknown')
            });
        });

        AdMob.addListener(BannerAdPluginEvents.Opened, () => {
            console.log('AdMob: Banner ad opened.');
            this.analytics?.track('ad_shown', { ad_type: 'banner', placement: 'bottom_banner' });
        });

        AdMob.addListener(BannerAdPluginEvents.Closed, () => {
            console.log('AdMob: Banner ad closed.');
            this.analytics?.track('ad_closed', { ad_type: 'banner', placement: 'bottom_banner' });
        });

        // Interstitial (Geçiş) Olayları
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
            console.log('AdMob: Interstitial ad loaded.');
            this.analytics?.track('ad_loaded', { ad_type: 'interstitial', placement: 'between_matches' });
        });

        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
            console.error('AdMob: Interstitial ad failed to load:', error);
            this.analytics?.track('ad_failed', {
                ad_type: 'interstitial',
                placement: 'between_matches',
                error_code: String(error?.code || 'unknown')
            });
        });

        AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
            console.log('AdMob: Interstitial ad showed.');
            this.analytics?.track('ad_shown', { ad_type: 'interstitial', placement: 'between_matches' });
        });

        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            console.log('AdMob: Interstitial ad dismissed.');
            this.analytics?.track('ad_closed', { ad_type: 'interstitial', placement: 'between_matches' });
            // Kapatıldıktan sonra yenisini hazırla
            this.prepareInterstitial();
        });

        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
            console.error('AdMob: Interstitial ad failed to show:', error);
            this.analytics?.track('ad_failed', {
                ad_type: 'interstitial',
                placement: 'between_matches',
                error_code: String(error?.code || 'unknown')
            });
            // Başarısız olursa tekrar hazırla
            this.prepareInterstitial();
        });
    }

    static async showBanner() {
        if (!this.isInitialized) await this.initialize();
        if (!this.isInitialized) return;

        const options = {
            adId: this.BANNER_ID,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: false
        };

        try {
            this.analytics?.track('ad_request', { ad_type: 'banner', placement: 'bottom_banner' });
            await AdMob.showBanner(options);
            console.log('AdMob: showBanner command sent.');
        } catch (error) {
            console.error('AdMob: Failed to show banner:', error);
        }
    }

    static async hideBanner() {
        if (!this.isInitialized) return;
        try {
            await AdMob.hideBanner();
            console.log('AdMob: Banner hidden.');
        } catch (error) {
            console.error('AdMob: Failed to hide banner:', error);
        }
    }

    static async prepareInterstitial() {
        if (!this.isInitialized) await this.initialize();
        if (!this.isInitialized) return;

        const options = {
            adId: this.INTERSTITIAL_ID,
            isTesting: false
        };

        try {
            this.analytics?.track('ad_request', { ad_type: 'interstitial', placement: 'between_matches' });
            await AdMob.prepareInterstitial(options);
            console.log('AdMob: Interstitial request sent.');
        } catch (error) {
            console.error('AdMob: Failed to prepare interstitial:', error);
        }
    }

    static async showInterstitial() {
        if (!this.isInitialized) return;

        try {
            await AdMob.showInterstitial();
        } catch (error) {
            console.log('AdMob: Interstitial show failed or not ready.');
            // Başarısız olursa tekrar hazırlamayı dene
            this.prepareInterstitial();
        }
    }
}

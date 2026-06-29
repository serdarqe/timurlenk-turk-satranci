// src/utils/OrientationManager.js
//
// Yön (Orientation) Yöneticisi — Faz 1 / UI Yatay Mod Sistemi
// =============================================================
// Kullanıcının ekran yönü tercihini (portrait / landscape) yönetir.
// Cihazın fiziksel rotasyonunu ALGILAMAZ — sadece kullanıcı tercihine
// göre layout değiştirir.
//
// Tercih localStorage'da saklanır. Capacitor ortamında, varsa
// @capacitor/screen-orientation plugin'i ile cihaz da kilitlenir.
// Plugin yoksa sessizce yalnızca CSS data-attr ile çalışır.
//
// Kullanım:
//   import { orientationManager, ORIENTATIONS } from './utils/OrientationManager.js';
//   orientationManager.init();                              // app start
//   orientationManager.toggle();                            // tıklamada
//   orientationManager.set(ORIENTATIONS.LANDSCAPE);         // explicit
//   orientationManager.get();                               // mevcut mod

const ORIENTATION_KEY = 'orientation_pref';

export const ORIENTATIONS = Object.freeze({
    PORTRAIT: 'portrait',
    LANDSCAPE: 'landscape'
});

function readPref(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
}

function writePref(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function normalize(mode) {
    return mode === ORIENTATIONS.LANDSCAPE
        ? ORIENTATIONS.LANDSCAPE
        : ORIENTATIONS.PORTRAIT;
}

/**
 * Capacitor @capacitor/screen-orientation plugin'i ile cihazı fiziksel
 * olarak kilitler. Web ortamında sessizce devre dışı (Capacitor API yok).
 */
async function lockDeviceOrientation(mode) {
    try {
        // Dynamic import — web ortamında bile build'i bozmaz
        const mod = await import('@capacitor/screen-orientation').catch(() => null);
        if (!mod || !mod.ScreenOrientation) return;

        const lockMode = mode === ORIENTATIONS.LANDSCAPE ? 'landscape' : 'portrait';
        await mod.ScreenOrientation.lock({ orientation: lockMode });
    } catch (err) {
        // Web ortamında veya plugin hatası — sessizce devam et
    }
}

const TRANSITION_DURATION_MS = 180;
const TRANSITION_OVERLAY_ID = 'orientation-transition';

/**
 * Parşömen perdesi geçiş animasyonu.
 * Faz 3 — orientation değişirken pürüzsüz visual transition.
 */
async function runTransitionAnimation(mode, applyFn) {
    if (typeof document === 'undefined') {
        // SSR / Node ortamı — direkt apply
        applyFn(mode);
        return;
    }

    const overlay = document.getElementById(TRANSITION_OVERLAY_ID);
    if (!overlay) {
        // Overlay yok — animasyon olmadan apply (graceful degradation)
        applyFn(mode);
        return;
    }

    return new Promise((resolve) => {
        // Önceki animasyon class'larını temizle
        overlay.classList.remove('parchment-roll-down', 'parchment-roll-up');
        // Force reflow
        void overlay.offsetWidth;

        let appliedYet = false;

        // 1. Perdeyi aç (top → bottom)
        overlay.classList.add('parchment-roll-down');

        const onDownEnd = () => {
            overlay.removeEventListener('animationend', onDownEnd);
            if (!appliedYet) {
                // 2. Layout değiştir (perde kapalıyken)
                applyFn(mode);
                appliedYet = true;
            }
            // 3. Render bekle, sonra perdeyi kaldır
            requestAnimationFrame(() => {
                overlay.classList.remove('parchment-roll-down');
                overlay.classList.add('parchment-roll-up');

                const onUpEnd = () => {
                    overlay.removeEventListener('animationend', onUpEnd);
                    overlay.classList.remove('parchment-roll-up');
                    resolve();
                };
                overlay.addEventListener('animationend', onUpEnd);
            });
        };
        overlay.addEventListener('animationend', onDownEnd);

        // Fallback — animasyon tetiklenmezse 1 saniyede yine de uygula
        setTimeout(() => {
            if (!appliedYet) {
                applyFn(mode);
                appliedYet = true;
                overlay.classList.remove('parchment-roll-down', 'parchment-roll-up');
                resolve();
            }
        }, TRANSITION_DURATION_MS * 3);
    });
}

export const orientationManager = {
    /**
     * Mevcut tercihi döndürür ('portrait' | 'landscape').
     */
    get() {
        return normalize(readPref(ORIENTATION_KEY, ORIENTATIONS.PORTRAIT));
    },

    /**
     * Tercihi değiştirir, kaydeder ve uygular.
     * Animasyon ister: { animate: true } (varsayılan false — geriye uyumlu)
     */
    set(mode, options = {}) {
        const next = normalize(mode);
        writePref(ORIENTATION_KEY, next);

        const applyFn = (m) => this._apply(m);

        if (options.animate) {
            return runTransitionAnimation(next, applyFn).then(() => next);
        }
        applyFn(next);
        return next;
    },

    /**
     * Mevcut moddan diğerine geçer. Geçtiği mod'u döndürür.
     * Animasyonlu geçiş için: orientationManager.toggle({ animate: true })
     */
    toggle(options = {}) {
        const current = this.get();
        const next = current === ORIENTATIONS.PORTRAIT
            ? ORIENTATIONS.LANDSCAPE
            : ORIENTATIONS.PORTRAIT;
        return this.set(next, options);
    },

    /**
     * HTML root element'ine data-orientation attribute uygular.
     * Capacitor varsa cihazı da kilitler (best-effort, başarısızlık sessiz).
     */
    _apply(mode) {
        const normalized = normalize(mode);
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.dataset.orientation = normalized;

            // Toggle butonunun aria-pressed state'i güncelle
            const btn = document.getElementById('btn-orientation-toggle');
            if (btn) {
                const isLandscape = normalized === ORIENTATIONS.LANDSCAPE;
                btn.setAttribute('aria-pressed', isLandscape ? 'true' : 'false');
            }

            // Custom event yay (UI bileşenleri için)
            try {
                document.dispatchEvent(new CustomEvent('orientationchange:pref', {
                    detail: { mode: normalized }
                }));
            } catch (e) { /* ignore */ }
        }
        // Fire-and-forget — cihaz lock async
        lockDeviceOrientation(normalized);
    },

    /**
     * Uygulama açılışında bir kez çağrılır.
     * Saklı tercihi okur ve uygular.
     */
    init(options = {}) {
        const initialMode = options.forcePortrait
            ? ORIENTATIONS.PORTRAIT
            : this.get();

        if (options.forcePortrait) {
            writePref(ORIENTATION_KEY, initialMode);
        }

        this._apply(initialMode);
    },

    /**
     * Tercih değiştiğinde dinleyici eklemek için.
     */
    subscribe(callback) {
        if (typeof document === 'undefined') return () => {};
        const handler = (e) => callback(e.detail?.mode || this.get());
        document.addEventListener('orientationchange:pref', handler);
        return () => document.removeEventListener('orientationchange:pref', handler);
    }
};

// Convenience exports
export const ORIENTATION_PORTRAIT = ORIENTATIONS.PORTRAIT;
export const ORIENTATION_LANDSCAPE = ORIENTATIONS.LANDSCAPE;

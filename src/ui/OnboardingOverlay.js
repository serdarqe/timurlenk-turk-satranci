// src/ui/OnboardingOverlay.js
// First-launch onboarding experience for new users

import { i18n } from '../utils/i18n.js';

const ONBOARDING_KEY = 'onboarding_done';

const SLIDES = [
    {
        icon: 'fas fa-chess-board',
        title: { tr: 'Timurlenk Satrancına Hoş Geldin!', en: 'Welcome to Timur Chess!' },
        desc: {
            tr: 'Timurlenk\'in 14. yüzyılda icat ettiği tarihi satranç oyununu keşfet. 10×11 tahtada, 17 farklı taş türüyle stratejik bir mücadele seni bekliyor.',
            en: 'Discover the historic chess game invented by Tamerlane in the 14th century. A strategic battle awaits you on a 10×11 board with 17 unique piece types.'
        },
        color: 'hsl(45, 100%, 60%)'
    },
    {
        icon: 'fas fa-chess-knight',
        title: { tr: 'Eşsiz Taşlar', en: 'Unique Pieces' },
        desc: {
            tr: 'Deve, Zürafa, Arslan, Fil, Gözcü ve daha fazlası! Her taşın kendine özel hareketi var. Rehber bölümünden tüm taşları öğrenebilirsin.',
            en: 'Camel, Giraffe, Lion, Elephant, War Engine and more! Each piece has its own unique movement. Learn all pieces in the Tutorial Guide.'
        },
        color: 'hsl(190, 80%, 50%)'
    },
    {
        icon: 'fas fa-gamepad',
        title: { tr: 'Oyna ve Öğren', en: 'Play & Learn' },
        desc: {
            tr: 'Yapay zekaya karşı oyna, maç geçmişini incele veya arkadaşınla çevrimiçi mücadele et. "Oynayarak Öğren" moduyla adım adım ilerle!',
            en: 'Play against AI, review your match history, or battle a friend online. Step through the game with "Play & Learn" mode!'
        },
        color: 'hsl(120, 60%, 50%)'
    }
];

export class OnboardingOverlay {
    constructor() {
        this.currentSlide = 0;
        this.overlay = null;
    }

    shouldShow() {
        return !localStorage.getItem(ONBOARDING_KEY);
    }

    markDone() {
        localStorage.setItem(ONBOARDING_KEY, '1');
    }

    show(onComplete) {
        if (!this.shouldShow()) {
            if (onComplete) onComplete();
            return;
        }

        this.onComplete = onComplete;
        this._createOverlay();
        this._renderSlide();

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.overlay.classList.add('visible');
            });
        });
    }

    _createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        this.overlay.innerHTML = `
            <div class="onboarding-card glass-panel">
                <div class="onboarding-icon-wrapper">
                    <i class="onboarding-icon"></i>
                </div>
                <h2 class="onboarding-title"></h2>
                <p class="onboarding-desc"></p>
                <div class="onboarding-dots"></div>
                <div class="onboarding-actions">
                    <button class="btn onboarding-skip">${i18n.getLocale() === 'en' ? 'Skip' : 'Atla'}</button>
                    <button class="btn primary-btn onboarding-next">
                        ${i18n.getLocale() === 'en' ? 'Next' : 'İleri'} <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        this.overlay.querySelector('.onboarding-skip').addEventListener('click', () => this._finish());
        this.overlay.querySelector('.onboarding-next').addEventListener('click', () => this._next());

        document.body.appendChild(this.overlay);
    }

    _renderSlide() {
        const lang = i18n.getLocale() === 'en' ? 'en' : 'tr';
        const slide = SLIDES[this.currentSlide];

        const iconEl = this.overlay.querySelector('.onboarding-icon');
        iconEl.className = `onboarding-icon ${slide.icon}`;
        iconEl.style.color = slide.color;

        const wrapper = this.overlay.querySelector('.onboarding-icon-wrapper');
        wrapper.style.background = `${slide.color}22`;
        wrapper.style.boxShadow = `0 0 40px ${slide.color}33`;

        this.overlay.querySelector('.onboarding-title').textContent = slide.title[lang];
        this.overlay.querySelector('.onboarding-desc').textContent = slide.desc[lang];

        // Dots
        const dotsEl = this.overlay.querySelector('.onboarding-dots');
        dotsEl.innerHTML = SLIDES.map((_, i) =>
            `<span class="onboarding-dot ${i === this.currentSlide ? 'active' : ''}" style="${i === this.currentSlide ? `background: ${slide.color}` : ''}"></span>`
        ).join('');

        // Update button text on last slide
        const nextBtn = this.overlay.querySelector('.onboarding-next');
        if (this.currentSlide === SLIDES.length - 1) {
            nextBtn.innerHTML = `${lang === 'en' ? "Let's Play!" : 'Hadi Oynayalım!'} <i class="fas fa-play"></i>`;
        } else {
            nextBtn.innerHTML = `${lang === 'en' ? 'Next' : 'İleri'} <i class="fas fa-arrow-right"></i>`;
        }

        // Animate card content
        const card = this.overlay.querySelector('.onboarding-card');
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = 'onboarding-slide-in 0.4s ease-out';
    }

    _next() {
        if (this.currentSlide < SLIDES.length - 1) {
            this.currentSlide++;
            this._renderSlide();
        } else {
            this._finish();
        }
    }

    _finish() {
        this.markDone();
        this.overlay.classList.remove('visible');
        setTimeout(() => {
            if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
            if (this.onComplete) this.onComplete();
        }, 400);
    }
}

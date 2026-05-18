export class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.basePath = './sounds/';

        // Ses dosyalarını tanımla
        this.soundManifest = {
            move: 'move.mp3',
            capture: 'capture.mp3',
            check: 'check.mp3',
            win: 'win.mp3',
            success: 'success.mp3',
            click: 'click.mp3'
        };

        this._preloadSounds();
    }

    _preloadSounds() {
        Object.keys(this.soundManifest).forEach(key => {
            const audio = new Audio(`${this.basePath}${this.soundManifest[key]}`);
            audio.preload = 'auto';
            this.sounds[key] = audio;
        });
    }

    playSound(key) {
        if (!this.enabled || !this.sounds[key]) return;

        // Aynı sesin üst üste binmesi durumunda baştan başlat
        const audio = this.sounds[key];
        audio.currentTime = 0;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Tarayıcı otomatik çalma engeli için sessizce yut
                console.log(`Playback prevented for ${key}:`, error.message);
            });
        }
    }

    playMoveSound() {
        this.playSound('move');
    }

    playCaptureSound() {
        this.playSound('capture');
    }

    playCheckSound() {
        this.playSound('check');
    }

    playGameOverSound() {
        this.playSound('win');
    }

    playSuccessSound() {
        this.playSound('success');
    }

    playClickSound() {
        this.playSound('click');
    }

    toggle(enabled) {
        this.enabled = enabled;
    }
}

export const audioManager = new AudioManager();

class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {
            title: '/static/music/02-title.mp3',
            gameOver: '/static/music/08-game-over.mp3'
        };
        this.bgMusic = [
            '/static/music/melody/02-a-type-music-version-1_1.mp3',
            '/static/music/melody/03-b-type-music.mp3',
            '/static/music/melody/04-c-type-music.mp3',
            '/static/music/melody/06-2-player-mode-danger.mp3'
        ];
        this.currentMusic = null;
        this.titleMusic = null;
        this.isMuted = false;
        this.loadingPromises = new Map();
        this.activeSounds = new Set();
        this.isGameOver = false;
        this.isPaused = false;
    }

    stopAllSounds() {
        // Немедленная остановка всех звуков
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }

        if (this.titleMusic) {
            this.titleMusic.stop();
            this.titleMusic = null;
        }

        // Остановка всех активных звуков
        for (const sound of this.activeSounds) {
            try {
                sound.stop();
            } catch (error) {
                console.error('Error stopping sound:', error);
            }
        }
        this.activeSounds.clear();
    }

    async playSound(soundKey, loop = false) {
        if (this.isMuted) return null;

        try {
            const soundUrl = this.sounds[soundKey];
            if (!soundUrl) {
                console.error(`Sound ${soundKey} not found`);
                return null;
            }

            // Всегда останавливаем все звуки перед воспроизведением нового
            this.stopAllSounds();

            const buffer = await this.loadSound(soundUrl);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.loop = loop;

            source.start(0);
            this.activeSounds.add(source);

            if (soundKey === 'title') {
                this.titleMusic = source;
            }

            source.onended = () => {
                this.activeSounds.delete(source);
                if (soundKey === 'title') {
                    this.titleMusic = null;
                }
            };

            return source;
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }

    async playRandomBgMusic() {
        // Строгая проверка состояния игры
        if (this.isMuted || this.isGameOver || this.isPaused || this.titleMusic) {
            return;
        }

        try {
            // Останавливаем все звуки перед началом новой мелодии
            this.stopAllSounds();

            // Повторная проверка состояния после остановки звуков
            if (this.isGameOver || this.isPaused || this.titleMusic) {
                return;
            }

            const randomIndex = Math.floor(Math.random() * this.bgMusic.length);
            const musicUrl = this.bgMusic[randomIndex];

            const buffer = await this.loadSound(musicUrl);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.loop = false;

            source.onended = () => {
                this.currentMusic = null;
                // Проверяем состояние игры перед запуском следующей мелодии
                if (!this.isGameOver && !this.isPaused && !this.titleMusic) {
                    this.playRandomBgMusic();
                }
            };

            source.start(0);
            this.currentMusic = source;
            this.activeSounds.add(source);
        } catch (error) {
            console.error('Error playing background music:', error);
        }
    }

    stopMusic() {
        this.stopAllSounds();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopAllSounds();
        } else {
            // Воспроизводим музыку в зависимости от текущего состояния
            if (!this.isGameOver && !this.isPaused && !this.titleMusic) {
                this.playRandomBgMusic();
            } else if (!this.isGameOver && !this.isPaused) {
                this.playSound('title', true);
            }
        }
    }

    setPause(paused) {
        this.isPaused = paused;
        if (paused) {
            this.stopAllSounds();
        } else if (!this.isGameOver && !this.titleMusic) {
            this.playRandomBgMusic();
        }
    }

    reset() {
        this.isGameOver = false;
        this.isPaused = false;
        this.stopAllSounds();
    }

    async loadSound(url) {
        try {
            if (this.loadingPromises.has(url)) {
                return await this.loadingPromises.get(url);
            }

            const loadPromise = new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to load sound: ${response.statusText}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
                    resolve(audioBuffer);
                } catch (error) {
                    console.error(`Error loading sound ${url}:`, error);
                    reject(error);
                }
            });

            this.loadingPromises.set(url, loadPromise);
            return await loadPromise;
        } catch (error) {
            console.error(`Failed to load sound ${url}:`, error);
            throw error;
        }
    }
    createModemSound() {
        const duration = 3;
        const audioBuffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < audioBuffer.length; i++) {
            const t = i / this.context.sampleRate;
            const freq1 = 1000 + Math.sin(t * 10) * 500;
            const freq2 = 2000 + Math.sin(t * 5) * 300;

            channelData[i] = 
                0.3 * Math.sin(2 * Math.PI * freq1 * t) +
                0.3 * Math.sin(2 * Math.PI * freq2 * t) +
                0.2 * Math.sin(2 * Math.PI * 800 * t) *
                Math.exp(-t);
        }

        return audioBuffer;
    }

    async playModemSound() {
        if (this.isMuted) return null;

        try {
            const buffer = this.createModemSound();
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.start(0);
            return new Promise((resolve) => {
                source.onended = resolve;
            });
        } catch (error) {
            console.error('Error playing modem sound:', error);
            return Promise.resolve();
        }
    }
}
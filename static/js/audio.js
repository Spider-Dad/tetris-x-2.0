class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {
            title: '/static/music/01-title.mp3',
            gameOver: '/static/music/08-game-over.mp3',
            levelUp: '/static/music/07-stage-clear.mp3'
        };
        this.bgMusic = [
            '/static/music/02-a-type-music-version-1_1.mp3',
            '/static/music/03-b-type-music.mp3',
            '/static/music/04-c-type-music.mp3',
            '/static/music/06-2-player-mode-danger.mp3'
        ];
        this.currentMusic = null;
        this.titleMusic = null;
        this.isMuted = false;
        this.loadingPromises = new Map();
        this.activeSounds = new Set();
    }

    createModemSound() {
        const duration = 3; // 3 seconds
        const audioBuffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        // Создаем характерный звук модема
        for (let i = 0; i < audioBuffer.length; i++) {
            // Базовая частота
            const t = i / this.context.sampleRate;
            const freq1 = 1000 + Math.sin(t * 10) * 500;
            const freq2 = 2000 + Math.sin(t * 5) * 300;

            // Смешиваем разные частоты для получения характерного звука
            channelData[i] = 
                0.3 * Math.sin(2 * Math.PI * freq1 * t) +
                0.3 * Math.sin(2 * Math.PI * freq2 * t) +
                0.2 * Math.sin(2 * Math.PI * 800 * t) *
                Math.exp(-t); // Затухание
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

    async playSound(soundKey, loop = false) {
        if (this.isMuted) return null;

        try {
            const soundUrl = this.sounds[soundKey];
            if (!soundUrl) {
                console.error(`Sound ${soundKey} not found`);
                return null;
            }

            const buffer = await this.loadSound(soundUrl);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.loop = loop;
            source.start(0);

            // Сохраняем ссылку на звук
            this.activeSounds.add(source);

            // Если это титульная музыка, сохраняем отдельную ссылку
            if (soundKey === 'title') {
                this.titleMusic = source;
            }

            // Удаляем звук из активных при завершении
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
        if (this.isMuted) return;

        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }

        const randomIndex = Math.floor(Math.random() * this.bgMusic.length);
        const musicUrl = this.bgMusic[randomIndex];

        try {
            const buffer = await this.loadSound(musicUrl);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.loop = false;
            source.onended = () => this.playRandomBgMusic();
            source.start(0);
            this.currentMusic = source;
        } catch (error) {
            console.error('Error playing background music:', error);
            // Try playing the next song if current one fails
            this.playRandomBgMusic();
        }
    }

    stopMusic() {
        // Останавливаем текущую фоновую музыку
        if (this.currentMusic) {
            try {
                this.currentMusic.stop();
            } catch (error) {
                console.error('Error stopping current music:', error);
            }
            this.currentMusic = null;
        }

        // Останавливаем титульную музыку, если она играет
        if (this.titleMusic) {
            try {
                this.titleMusic.stop();
            } catch (error) {
                console.error('Error stopping title music:', error);
            }
            this.titleMusic = null;
        }

        // Останавливаем все активные звуки
        this.activeSounds.forEach(sound => {
            try {
                sound.stop();
            } catch (error) {
                console.error('Error stopping sound:', error);
            }
        });
        this.activeSounds.clear();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopMusic();
        } else {
            this.playRandomBgMusic();
        }
    }
}
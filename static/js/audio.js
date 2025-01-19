class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {
            title: '/static/music/01-title.mp3',
            modem: '/static/music/modem.mp3',
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
        this.isMuted = false;
        this.loadingPromises = new Map();
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
        if (this.currentMusic) {
            try {
                this.currentMusic.stop();
            } catch (error) {
                console.error('Error stopping music:', error);
            }
            this.currentMusic = null;
        }
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
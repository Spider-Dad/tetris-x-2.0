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
    }

    async loadSound(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.context.decodeAudioData(arrayBuffer);
    }

    async playSound(soundKey, loop = false) {
        if (this.isMuted) return;
        
        try {
            const buffer = await this.loadSound(this.sounds[soundKey]);
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.loop = loop;
            source.start(0);
            return source;
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    async playRandomBgMusic() {
        if (this.currentMusic) {
            this.currentMusic.stop();
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
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.stop();
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

class ASCIIVideoPlayer {
    constructor() {
        this.video = document.getElementById('hiddenVideo');
        this.audio = document.getElementById('audioPlayer');
        this.canvas = document.getElementById('hiddenCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.asciiDisplay = document.getElementById('asciiDisplay');
        
        this.isPlaying = false;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.fps = 30;
        this.animationId = null;
        
        this.asciiChars = ' .:-=+*#%@';
        this.width = 80;
        this.contrast = 1.0;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.videoInput = document.getElementById('videoInput');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.widthSlider = document.getElementById('widthSlider');
        this.contrastSlider = document.getElementById('contrastSlider');
        this.widthValue = document.getElementById('widthValue');
        this.contrastValue = document.getElementById('contrastValue');
        this.status = document.getElementById('status');
        this.fpsDisplay = document.getElementById('fps');
        this.resolution = document.getElementById('resolution');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
    }
    
    setupEventListeners() {
        this.videoInput.addEventListener('change', (e) => this.loadVideo(e));
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        this.widthSlider.addEventListener('input', (e) => {
            this.width = parseInt(e.target.value);
            this.widthValue.textContent = this.width;
            this.updateAsciiSize();
        });
        
        this.contrastSlider.addEventListener('input', (e) => {
            this.contrast = parseFloat(e.target.value);
            this.contrastValue.textContent = this.contrast.toFixed(1);
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            this.setupVideo();
        });
        
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
    }
    
    loadVideo(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.status.textContent = 'LOADING...';
        
        const url = URL.createObjectURL(file);
        this.video.src = url;
        this.audio.src = url;
        
        this.video.load();
        this.audio.load();
        
        // Update filename in terminal
        const filename = file.name.length > 30 ? 
            file.name.substring(0, 27) + '...' : file.name;
        document.querySelector('.command').textContent = `./ascii_player.exe "${filename}"`;
    }
    
    setupVideo() {
        this.totalFrames = Math.floor(this.video.duration * this.fps);
        this.resolution.textContent = `${this.video.videoWidth}x${this.video.videoHeight}`;
        
        this.updateAsciiSize();
        this.enableControls();
        this.status.textContent = 'LOADED';
        
        // Show first frame
        this.renderFrame();
    }
    
    updateAsciiSize() {
        if (!this.video.videoWidth) return;
        
        const aspectRatio = this.video.videoHeight / this.video.videoWidth;
        this.height = Math.floor(this.width * aspectRatio * 0.5); // 0.5 for character aspect ratio
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.asciiDisplay.style.fontSize = `${Math.max(6, Math.floor(800 / this.width))}px`;
    }
    
    enableControls() {
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = false;
        this.stopBtn.disabled = false;
    }
    
    play() {
        if (!this.video.src) return;
        
        this.isPlaying = true;
        this.status.textContent = 'PLAYING';
        
        this.video.play();
        this.audio.play();
        
        this.startRendering();
    }
    
    pause() {
        this.isPlaying = false;
        this.status.textContent = 'PAUSED';
        
        this.video.pause();
        this.audio.pause();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    stop() {
        this.isPlaying = false;
        this.status.textContent = 'STOPPED';
        
        this.video.pause();
        this.audio.pause();
        this.video.currentTime = 0;
        this.audio.currentTime = 0;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.renderFrame();
        this.updateProgress();
    }
    
    startRendering() {
        const render = () => {
            if (!this.isPlaying) return;
            
            this.renderFrame();
            this.updateFPS();
            
            this.animationId = requestAnimationFrame(render);
        };
        
        render();
    }
    
    renderFrame() {
        if (!this.video.videoWidth) return;
        
        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        
        // Convert to ASCII
        let ascii = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate brightness
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                const adjustedBrightness = Math.pow(brightness, 1/this.contrast);
                
                // Map to ASCII character
                const charIndex = Math.floor(adjustedBrightness * (this.asciiChars.length - 1));
                ascii += this.asciiChars[charIndex];
            }
            ascii += '\n';
        }
        
        this.asciiDisplay.textContent = ascii;
    }
    
    updateFPS() {
        if (!this.lastFrameTime) {
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            return;
        }
        
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        if (elapsed >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            this.fpsDisplay.textContent = `${fps} FPS`;
            this.lastFrameTime = now;
            this.frameCount = 0;
        }
    }
    
    updateProgress() {
        if (!this.video.duration) return;
        
        const progress = (this.video.currentTime / this.video.duration) * 100;
        this.progressFill.style.width = `${progress}%`;
        
        const currentTime = this.formatTime(this.video.currentTime);
        const totalTime = this.formatTime(this.video.duration);
        this.progressText.textContent = `${currentTime} / ${totalTime}`;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize the player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ASCIIVideoPlayer();
    
    // Add some terminal-like startup animation
    setTimeout(() => {
        const status = document.getElementById('status');
        status.textContent = 'SYSTEM READY';
        
        // Add blinking cursor to command line
        const commandLine = document.querySelector('.command-line');
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        cursor.textContent = '█';
        commandLine.appendChild(cursor);
    }, 1000);
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            const playBtn = document.getElementById('playBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            if (!playBtn.disabled) {
                if (document.getElementById('status').textContent === 'PLAYING') {
                    pauseBtn.click();
                } else {
                    playBtn.click();
                }
            }
            break;
        case 'Escape':
            document.getElementById('stopBtn').click();
            break;
    }
});
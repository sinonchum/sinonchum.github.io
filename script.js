class Particle {
    constructor(x, y, color, size) {
        this.originX = x;
        this.originY = y;

        // Slight random scatter for the resting "floating matrix" look
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 6;
        this.baseX = x + Math.cos(angle) * dist;
        this.baseY = y + Math.sin(angle) * dist;

        this.x = this.baseX;
        this.y = this.baseY;

        this.originalColor = color;

        // Grayscale for resting state
        const lum = color.r * 0.3 + color.g * 0.59 + color.b * 0.11;
        this.grayColor = { r: lum * 0.6, g: lum * 0.6, b: lum * 0.6 };

        this.size = size;
        this.currentFactor = 0; // 0 = resting, 1 = gathered

        // Floating animation parameters
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatSpeed = 0.0008 + Math.random() * 0.001;

        // Spring physics
        this.vx = 0;
        this.vy = 0;
    }

    draw(ctx) {
        const f = this.currentFactor;
        const r = this.grayColor.r + (this.originalColor.r - this.grayColor.r) * f;
        const g = this.grayColor.g + (this.originalColor.g - this.grayColor.g) * f;
        const b = this.grayColor.b + (this.originalColor.b - this.grayColor.b) * f;
        const alpha = 0.55 + 0.45 * f;

        ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${alpha})`;
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    }

    update(isHovered, time) {
        let targetX, targetY;
        const targetFactor = isHovered ? 1 : 0;

        if (isHovered) {
            targetX = this.originX;
            targetY = this.originY;
        } else {
            // Gentle floating
            targetX = this.baseX + Math.cos(time * this.floatSpeed + this.floatOffset) * 2;
            targetY = this.baseY + Math.sin(time * this.floatSpeed + this.floatOffset) * 2;
        }

        // Color/alpha easing
        this.currentFactor += (targetFactor - this.currentFactor) * 0.12;

        // Spring physics for position
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        this.vx += dx * 0.18;
        this.vy += dy * 0.18;
        this.vx *= 0.82;
        this.vy *= 0.82;
        this.x += this.vx;
        this.y += this.vy;
    }
}

class ParticleEffect {
    constructor(canvas, image) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.image = image;
        this.particles = [];
        this.isHovered = false;

        this.container = document.getElementById('profile-container');
        this.hdImage = document.getElementById('profile-hd');

        this.init();
        this.bindEvents();
    }

    bindEvents() {
        // Listen on the CONTAINER div for hover (not just canvas)
        const target = this.container || this.canvas;

        target.addEventListener('mouseenter', () => {
            this.isHovered = true;
            if (this.hdImage) this.hdImage.style.opacity = '1';
        });

        target.addEventListener('mouseleave', () => {
            this.isHovered = false;
            if (this.hdImage) this.hdImage.style.opacity = '0';
        });

        // Also handle touch for mobile
        target.addEventListener('touchstart', () => {
            this.isHovered = true;
            if (this.hdImage) this.hdImage.style.opacity = '1';
        }, { passive: true });

        target.addEventListener('touchend', () => {
            this.isHovered = false;
            if (this.hdImage) this.hdImage.style.opacity = '0';
        }, { passive: true });
    }

    init() {
        this.canvas.width = 300;
        this.canvas.height = 400;

        // Extract pixel data
        const offscreen = document.createElement('canvas');
        const offCtx = offscreen.getContext('2d');
        offscreen.width = 300;
        offscreen.height = 400;

        // object-fit: cover math
        const canvasAspect = 300 / 400;
        const imgAspect = this.image.width / this.image.height;
        let sWidth, sHeight, sx, sy;

        if (imgAspect > canvasAspect) {
            sHeight = this.image.height;
            sWidth = sHeight * canvasAspect;
            sx = (this.image.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = this.image.width;
            sHeight = sWidth / canvasAspect;
            sx = 0;
            sy = (this.image.height - sHeight) / 2;
        }

        offCtx.drawImage(this.image, sx, sy, sWidth, sHeight, 0, 0, 300, 400);
        const pixels = offCtx.getImageData(0, 0, 300, 400).data;

        // Small step size = dense particles = recognizable face
        const gap = 3;
        const particleSize = 2.5;

        // Background color sample for removal
        const bgR = pixels[0], bgG = pixels[1], bgB = pixels[2];

        for (let y = 0; y < 400; y += gap) {
            for (let x = 0; x < 300; x += gap) {
                const i = (y * 300 + x) * 4;
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                if (pixels[i + 3] < 128) continue;

                // Skip background-colored pixels
                const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
                if (dist > 30) {
                    this.particles.push(new Particle(x, y, { r, g, b }, particleSize));
                }
            }
        }

        console.log(`[ParticleEffect] Initialized ${this.particles.length} particles`);
    }

    animate(time) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update(this.isHovered, time);
            this.particles[i].draw(this.ctx);
        }

        requestAnimationFrame((t) => this.animate(t));
    }
}

// Bootstrapper
window.addEventListener('load', () => {
    const canvas = document.getElementById('profile-canvas');
    if (!canvas) return;

    const image = new Image();
    image.src = 'profile.jpg';
    image.onload = () => {
        const effect = new ParticleEffect(canvas, image);
        requestAnimationFrame((t) => effect.animate(t));
    };
    image.onerror = () => {
        console.error('Failed to load profile.jpg');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0033';
        ctx.font = '10px monospace';
        ctx.fillText('ERR: IMAGE_NOT_FOUND', 20, 200);
    };
});

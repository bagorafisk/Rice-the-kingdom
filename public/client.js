const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.addEventListener('mousedown', () => {
    canvas.focus();
});

window.addEventListener('load', () => {
    canvas.focus();
});

const TILE_SIZE = 32;
const MAP_HEIGHT = 64;
const MAP_WIDTH = 64;
const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 900;
const SCALE = 2;
const DRAG_SENSITIVITY = 1;

const players = {};
let map = [];

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.scale = SCALE;
        this.width = Math.ceil(canvas.width / (TILE_SIZE * this.scale));
        this.height = Math.ceil(canvas.height / (TILE_SIZE * this.scale));
        this.following = null;
        this.moveSpeed = 0.07;
        this.isDragging = false;
    }

    setViewport(x, y) {
        this.x = Math.max(0, Math.min(MAP_WIDTH - this.width, x));
        this.y = Math.max(0, Math.min(MAP_HEIGHT - this.height, y));
    }

    follow(entity) {
        this.following = entity;
    }

    update() {
        if (!this.isDragging && this.following) {
            this.x += (this.following.x - this.width / 2 - this.x) * this.moveSpeed;
            this.y += (this.following.y - this.height / 2 - this.y) * this.moveSpeed;
            this.setViewport(this.x, this.y);
        }
    }
}

const camera = new Camera(0, 0);

const tileImages = {
    1: new Image(),
    2: new Image(),
    3: new Image(),
    4: new Image(),
    5: new Image(),
    6: new Image(),
    7: new Image(),
};

tileImages[1].src = 'assets/grass.png';
tileImages[2].src = 'assets/river.png';
tileImages[3].src = 'assets/river-horizontal.png';
tileImages[4].src = 'assets/river-right-turn.png';
tileImages[5].src = 'assets/river-left-turn.png';
tileImages[6].src = 'assets/river-right-down.png';
tileImages[7].src = 'assets/river-left-down.png';


socket.on('init', (data) => {
    map = data.map;
    requestAnimationFrame(render);
});

setInterval(() => {
    // renderMap();
}, 1000 / 60);

function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.scale, camera.scale);

    camera.update();

    const startX = Math.floor(camera.x - 1);
    const startY = Math.floor(camera.y - 1);
    const endX = Math.ceil(camera.x + camera.width + 1);
    const endY = Math.ceil(camera.y + camera.height + 1);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) continue;

            const tile = map[y][x];
            const img = tileImages[tile];

            if (!img.complete) {
                ctx.fillStyle = '#ccc';
                ctx.fillRect(
                    (x - camera.x) * TILE_SIZE,
                    (y - camera.y) * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );
                continue;
            }

            ctx.drawImage(
                img,
                (x - camera.x) * TILE_SIZE,
                (y - camera.y) * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            );
        }
    }

    ctx.restore();
    requestAnimationFrame(render);
}

canvas.addEventListener('click', () => canvas.focus());
window.addEventListener('load', () => canvas.focus());

let isDragging = false;
let lastMouseX, lastMouseY;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.offsetX;
    lastMouseY = e.offsetY;
    camera.isDragging = true;
    canvas.focus();
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.offsetX - lastMouseX;
    const deltaY = e.offsetY - lastMouseY;

    // Calculate movement in world coordinates
    const worldDeltaX = deltaX / (TILE_SIZE * camera.scale) * DRAG_SENSITIVITY;
    const worldDeltaY = deltaY / (TILE_SIZE * camera.scale) * DRAG_SENSITIVITY;

    // Update camera position
    camera.x -= worldDeltaX;
    camera.y -= worldDeltaY;

    // Clamp to map boundaries
    camera.setViewport(camera.x, camera.y);

    // Update last position
    lastMouseX = e.offsetX;
    lastMouseY = e.offsetY;
});
canvas.addEventListener('mouseup', () => {
    isDragging = false;
    camera.isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    camera.isDragging = false;
});

const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const MAP_HEIGHT = 64;
const MAP_WIDTH = 64;
const SCALE = 0.5;

const players = {};
const map = [];

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
    renderMap(data.map);
});

setInterval(() => {
    // renderMap();
}, 1000 / 60);

function renderMap(map) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            const image = tileImages[tile];
            if (image.complete) {
                ctx.drawImage(image, x * TILE_SIZE * SCALE, y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
            } else {
                ctx.fillStyle = 'gray';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                image.onload = () => {
                    ctx.drawImage(image, x * TILE_SIZE * SCALE, y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
                };
            }
        }
    }
}

window.addEventListener('mousedown', (event) => {});

window.addEventListener('mousemove', (event) => {});


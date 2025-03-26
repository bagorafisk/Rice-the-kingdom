const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const EasyStar = require('easystarjs');

app.use(express.static('public'));

const MAP_WIDTH = 64;
const MAP_HEIGHT = 64;
const RIVERS = 3;
const RIVER_STARTS = [16, 32, 48];
const TILE_SIZE = 32;
const ACCEPTABLE_TILES = [1];
const RIVER_BUFFER = 3;

let prevDir;

const players = {};

function createMap() {
    const map = Array.from({ length: MAP_HEIGHT }, () =>
        Array(MAP_WIDTH).fill(1)
    );
    createRivers(map);
    return map;
}

function createRivers(map) {
    for (const startX of RIVER_STARTS) {
        createSingleRiver(map, startX);
    }
}

/**
 * Create one river from (startX,0) downwards, chunking horizontal moves
 * and calling placeRiverTile(...) to assign the correct tile index.
 */
function createSingleRiver(map, startX) {
    let x = startX;
    let y = 0;
    // We'll say the "previous direction" was 'down' when we place the first tile
    let prevDir = 'down';

    // Place the initial tile
    placeRiverTile(map, x, y, 'down', prevDir);

    while (y < MAP_HEIGHT - 1) {
        // 70% chance to move down, 30% chance to move horizontally
        if (Math.random() < 0.3) {
            // Decide whether to go left or right, respecting “momentum”
            let horizDir = decideHorizontalDir(prevDir);
            if (horizDir === 'down') {
                // fallback to moving down
                if (!canMoveDown(map, x, y)) break;
                y++;
                placeRiverTile(map, x, y, 'down', prevDir);
                prevDir = 'down';
            } else {
                // Move horizontally for 2–4 tiles
                const chunkSize = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < chunkSize; i++) {
                    if (!canMoveHoriz(map, x, y, horizDir)) break;
                    x = (horizDir === 'left') ? x - 1 : x + 1;
                    placeRiverTile(map, x, y, horizDir, prevDir);
                    prevDir = horizDir;
                }
                // After moving horizontally, force at least one step down
                if (!canMoveDown(map, x, y)) break;
                y++;
                placeRiverTile(map, x, y, 'down', prevDir);
                prevDir = 'down';
            }
        } else {
            // Just move down
            if (!canMoveDown(map, x, y)) break;
            y++;
            placeRiverTile(map, x, y, 'down', prevDir);
            prevDir = 'down';
        }
    }
}

/**
 * Decide whether to go left or right, but avoid flipping if we just moved horizontally.
 * Return 'left', 'right', or 'down' (to skip horizontal).
 */
function decideHorizontalDir(prevDir) {
    const randomDir = (Math.random() < 0.5) ? 'left' : 'right';
    // If we just moved left, sometimes skip going right immediately
    if (prevDir === 'left' && randomDir === 'right') {
        if (Math.random() < 0.5) return 'down';
    }
    // If we just moved right, sometimes skip going left immediately
    if (prevDir === 'right' && randomDir === 'left') {
        if (Math.random() < 0.5) return 'down';
    }
    return randomDir;
}

// --- Movement checks ---

function canMoveDown(map, x, y) {
    if (y + 1 >= MAP_HEIGHT) return false;
    if (map[y + 1][x] !== 1) return false;
    return true;
}

function canMoveHoriz(map, x, y, dir) {
    let newX = (dir === 'left') ? x - 1 : x + 1;
    if (newX < 0 || newX >= MAP_WIDTH) return false;
    if (map[y][newX] !== 1) return false;
    return true;
}

// --- Placing the tile ---

/**
 * Place a river tile at (x,y), using your direction-based indexing.
 * @param {string} currentDir The direction of the current move.
 * @param {string} prevDir The previous direction used in the last placed tile.
 */
function placeRiverTile(map, x, y, currentDir, prevDir) {
    map[y][x] = getTileIndexForDirection(prevDir, currentDir);
}

/**
 * This function maps the transition from prevDir -> currentDir to a tile index.
 * Adjust these to match the exact shapes you want.
 */
function getTileIndexForDirection(prevDir, newDir) {
    //
    // Common definitions for 4-direction river sets:
    // 2 = vertical
    // 3 = horizontal
    // 4 = "right turn"
    // 5 = "left turn"
    //
    // But we need to decide carefully what "turn right" or "turn left" means
    // when going from left->down, right->down, down->left, etc.
    //
    // The snippet below is one possible arrangement.
    //

    // 1) If continuing down
    if (prevDir === 'down' && newDir === 'down') {
        return 2; // vertical
    }
    // 2) If continuing left->left or right->right => horizontal
    if (prevDir === 'left' && newDir === 'left') {
        return 3; // horizontal
    }
    if (prevDir === 'right' && newDir === 'right') {
        return 3; // horizontal
    }

    // 3) If turning from down to left => 5
    if (prevDir === 'down' && newDir === 'left') {
        return 5; // turn left
    }
    // 4) If turning from down to right => 4
    if (prevDir === 'down' && newDir === 'right') {
        return 4; // turn right
    }

    // 5) If turning from left to down => that might be a right turn
    //    (Imagine you're traveling left, turning down is a right turn from that perspective.)
    if (prevDir === 'left' && newDir === 'down') {
        return 4;
    }
    // 6) If turning from right to down => that might be a left turn
    if (prevDir === 'right' && newDir === 'down') {
        return 5;
    }

    // Fallback (if something unexpected occurs):
    return 2; // vertical
}

map = createMap();
let easystar = new EasyStar.js();
easystar.setGrid(map);
easystar.setAcceptableTiles([1]);

class Player {
    constructor(id) {
        this.id = id;
        this.x = Math.floor(Math.random() * MAP_WIDTH);
        this.y = Math.floor(Math.random() * MAP_HEIGHT);
    }
}

class GameData {
    constructor() {
        this.players = players;
        this.map = map;
    }
}

io.on('connection', (socket) => {
    console.log('Player connected: ', socket.id);
    players[socket.id] = new Player(socket.id);

    socket.emit('init', new GameData());
});

function updateGame() {

}

console.log(map);

http.listen(3000, () => {
    console.log('listening on localhost:3000');
});
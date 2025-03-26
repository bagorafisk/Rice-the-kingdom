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
      let x = startX;
      let y = 0;
      let prevDir = "down";
      let failedAttempts = 0;
      const maxFailedAttempts = 50; // Increase threshold so we don't quit too early
  
      // Initialize first two tiles
      map[y][x] = 2; // Start tile
      y++;
      if (y < MAP_HEIGHT) {
        map[y][x] = 2; // Second tile
        y++;
      }
  
      while (y < MAP_HEIGHT && failedAttempts < maxFailedAttempts) {
        const result = nextRiverTile(map, x, y, prevDir, startX);
  
        if (result) {
          // Check that the next tile is grass before using it
          if (map[result.nextTile.y][result.nextTile.x] !== 1) {
            failedAttempts++;
            // Optionally log the failure:
            console.log(`Tile at ${result.nextTile.x}, ${result.nextTile.y} is not grass.`);
            continue;
          }
  
          // Update position/direction and assign tile based on turn
          let tileIndex = getTileIndexForDirection(prevDir, result.newDir);
          map[y][x] = tileIndex;
          x = result.nextTile.x;
          y = result.nextTile.y;
          prevDir = result.newDir;
          failedAttempts = 0; // Reset failure count on success
        } else {
          // If no move returned, try forcing a downward step if available.
          if (y < MAP_HEIGHT - 1 && map[y + 1][x] === 1) {
            y++;
            map[y][x] = 2; // Down tile
            prevDir = "down";
            failedAttempts = 0;
          } else {
            failedAttempts++;
          }
        }
      }
      // Ensure the river reaches the bottom if possible
      if (y >= MAP_HEIGHT - 1 && map[y][x] === 1) {
        map[y][x] = 2;
      }
    }
  }
  
  function nextRiverTile(map, x, y, prevDir, currentStartX) {
    let possibleMoves = [];
  
    // Always allow downward movement if the tile is grass.
    if (y < MAP_HEIGHT - 1 && map[y + 1][x] === 1) {
      possibleMoves.push({ move: { x, y: y + 1, dir: "down" }, weight: 5 });
    }
  
    // Allow horizontal movement only after the second row
    if (y >= 2) {
      let nearOtherStart = RIVER_STARTS.some(startX =>
        startX !== currentStartX &&
        x >= startX - RIVER_BUFFER &&
        x <= startX + RIVER_BUFFER
      );
  
      // Only allow horizontal if not too near another river’s start
      if (!nearOtherStart) {
        // Left move
        if (x > 0 && map[y][x - 1] === 1) {
          possibleMoves.push({ move: { x: x - 1, y, dir: "left" }, weight: 2 });
        }
        // Right move
        if (x < MAP_WIDTH - 1 && map[y][x + 1] === 1) {
          possibleMoves.push({ move: { x: x + 1, y, dir: "right" }, weight: 2 });
        }
      }
    }
  
    if (possibleMoves.length === 0) return null;
  
    // Weighted random selection among the possible moves
    const totalWeight = possibleMoves.reduce((sum, m) => sum + m.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const option of possibleMoves) {
      rand -= option.weight;
      if (rand < 0) {
        return { nextTile: option.move, newDir: option.move.dir };
      }
    }
    return null; // Fallback (should not normally happen)
  }
  
  function getTileIndexForDirection(prevDir, newDir) {
    const directions = {
      'down>down': 2,   // Straight down
      'down>right': 4,  // Turning right (from down)
      'down>left': 5,   // Turning left (from down)
      'left>down': 3,   // Coming from left then down (horizontal to down)
      'right>down': 3,  // Coming from right then down (horizontal to down)
      'left>left': 6,   // Continuing left
      'right>right': 7  // Continuing right
    };
    return directions[`${prevDir}>${newDir}`] || 2;
  }
  
  function isValidTile(x, y) {
    return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
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
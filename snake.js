const canvas = document.getElementById('snakeGame');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('currentScore');
const highscoreEl = document.getElementById('highScore');
const uiLayer = document.getElementById('ui-layer');
const finalScoreEl = document.getElementById('finalScore');
const statusText = document.getElementById('status-text');

const box = 20;
let snake, food, score, d, game, enemies;
let isGameOver = true;
let highScore = localStorage.getItem('snakeHighScore') || 0;

// --- AUDIO SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmInterval;

function playTone(freq, type, duration, volume = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function startBGM() {
    if (bgmInterval) clearInterval(bgmInterval);
    const notes = [110, 123.47, 130.81, 116.54]; 
    let step = 0;
    bgmInterval = setInterval(() => {
        if (!isGameOver && d) {
            playTone(notes[step % notes.length], 'sine', 0.4, 0.04);
            step++;
        }
    }, 500);
}

const sounds = {
    eat: () => playTone(800, 'sine', 0.1),
    move: () => playTone(150, 'triangle', 0.05),
    dead: () => { playTone(200, 'sawtooth', 0.4); playTone(100, 'sawtooth', 0.6); },
    spawn: () => playTone(400, 'square', 0.3)
};

// --- GAME LOGIC ---
highscoreEl.innerText = highScore;

function toggleUI(show, text) {
    uiLayer.style.display = show ? 'flex' : 'none';
    if (text) statusText.innerText = text;
}

function resetGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    snake = [{ x: 9 * box, y: 10 * box }];
    enemies = [];
    spawnFood();
    score = 0;
    scoreEl.innerText = score;
    d = null;
    isGameOver = false;
    toggleUI(false);
    if (game) clearInterval(game);
    game = setInterval(draw, 110);
    startBGM();
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * 19) * box,
        y: Math.floor(Math.random() * 19) * box,
    };
}

function drawMouse(x, y) {
    ctx.fillStyle = "#8e8e8e";
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 12, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5, y + 7, 3, 0, Math.PI * 2);
    ctx.arc(x + 15, y + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffafaf";
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 17);
    ctx.quadraticCurveTo(x + 15, y + 19, x + 18, y + 15);
    ctx.stroke();
}

document.addEventListener('keydown', e => {
    if (isGameOver && e.keyCode == 32) resetGame();
    let oldD = d;
    if (e.keyCode == 37 && d != 'RIGHT') d = 'LEFT';
    else if (e.keyCode == 38 && d != 'DOWN') d = 'UP';
    else if (e.keyCode == 39 && d != 'LEFT') d = 'RIGHT';
    else if (e.keyCode == 40 && d != 'UP') d = 'DOWN';
    if (oldD !== d) sounds.move();
});

let tX = 0, tY = 0;
canvas.addEventListener('touchstart', e => { tX = e.touches[0].clientX; tY = e.touches[0].clientY; }, {passive: true});
canvas.addEventListener('touchend', e => {
    let dX = e.changedTouches[0].clientX - tX;
    let dY = e.changedTouches[0].clientY - tY;
    if (Math.abs(dX) > Math.abs(dY)) {
        if (dX > 30 && d !== 'LEFT') d = 'RIGHT';
        else if (dX < -30 && d !== 'RIGHT') d = 'LEFT';
    } else {
        if (dY > 30 && d !== 'UP') d = 'DOWN';
        else if (dY < -30 && d !== 'DOWN') d = 'UP';
    }
    if (isGameOver) resetGame();
    sounds.move();
}, {passive: true});

function moveEnemies() {
    enemies.forEach(enemy => {
        const h = snake[0];
        if (enemy.x < h.x) enemy.x += box;
        else if (enemy.x > h.x) enemy.x -= box;
        else if (enemy.y < h.y) enemy.y += box;
        else if (enemy.y > h.y) enemy.y -= box;
    });
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMouse(food.x, food.y);

    enemies.forEach(e => {
        ctx.fillStyle = "rgba(200, 230, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(e.x + 10, e.y + 10, 9, Math.PI, 0);
        ctx.lineTo(e.x + 19, e.y + 19);
        ctx.lineTo(e.x + 1, e.y + 19);
        ctx.fill();
        ctx.fillStyle = "red";
        ctx.fillRect(e.x + 5, e.y + 7, 3, 3);
        ctx.fillRect(e.x + 12, e.y + 7, 3, 3);
    });

    snake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#00e676' : '#00a455';
        ctx.beginPath();
        ctx.roundRect(p.x + 1, p.y + 1, box - 2, box - 2, 6);
        ctx.fill();
    });

    if (!d) return;
    if (Math.random() > 0.55) moveEnemies();

    let sX = snake[0].x;
    let sY = snake[0].y;
    if (d == 'LEFT') sX -= box;
    if (d == 'UP') sY -= box;
    if (d == 'RIGHT') sX += box;
    if (d == 'DOWN') sY += box;

    let hitE = enemies.some(e => e.x === sX && e.y === sY);
    if (sX < 0 || sX >= canvas.width || sY < 0 || sY >= canvas.height || 
        snake.some(p => p.x === sX && p.y === sY) || hitE) {
        isGameOver = true;
        clearInterval(game);
        sounds.dead();
        finalScoreEl.innerText = score;
        toggleUI(true, hitE ? "復讐された！" : "Game Over");
        return;
    }

    if (sX == food.x && sY == food.y) {
        score++;
        sounds.eat();
        scoreEl.innerText = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highscoreEl.innerText = highScore;
        }
        if (score === 5 || (score > 5 && (score - 5) % 10 === 0 && enemies.length < 4)) {
            enemies.push({ x: 0, y: 0 });
            sounds.spawn();
        }
        spawnFood();
    } else {
        snake.pop();
    }
    snake.unshift({ x: sX, y: sY });
}

toggleUI(true, "準備はいい？");

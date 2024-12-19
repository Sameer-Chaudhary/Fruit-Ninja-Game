const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let fruits = [];
let score = 0;
let lives = 3;
let gameInterval = null;
let knifeActive = false;
let knifePosition = { x: 0, y: 0 };
let level = 1;
const maxLevel = 10;
let speedIncreaseInterval = 10000; // Interval to increase speed (in ms)

const fruitTypes = [
    { type: 'apple', points: 10 },
    { type: 'banana', points: 15 },
    { type: 'watermelon', points: 20 },
    { type: 'pineapple', points: 25 }
];

const sliceSound = new Audio('assets/sounds/slice.mp3');
const bombSound = new Audio('assets/sounds/bomb.mp3');
const backgroundMusic = new Audio('assets/music.mp3');
backgroundMusic.loop = true;

const restartButton = document.getElementById('restartButton');

// Fruit burst animation
class Burst {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 10 + 5;
            const speed = Math.random() * 3 + 2;
            const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

            this.particles.push({
                x: this.x,
                y: this.y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                color: color,
                life: Math.random() * 30 + 20,
            });
        }
    }

    update() {
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.life--;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                i--;
            }
        }
    }

    draw() {
        for (const particle of this.particles) {
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class BombExplosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 50;
        this.exploded = false;
    }

    update() {
        if (this.radius < this.maxRadius) {
            this.radius += 2; // Expanding radius
        } else {
            this.exploded = true;
        }
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

let bursts = [];
let explosions = [];
let currentFruitSpeed = 2; // Initial speed of fruits
const maxSpeed = 4; // Maximum speed the fruits can have

function spawnFruit() {
    const fruitType = Math.random() < 0.1 ? 'bomb' : fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    const fruit = {
        x: Math.random() * (canvas.width - 100) + 50, // Ensure fruits spawn within visible screen bounds
        y: canvas.height - 50,
        dx: Math.random() * 4 - 2,
        dy: -(Math.random() * 6 + 6),
        type: fruitType.type || fruitType,
        sliced: false,
        speed: currentFruitSpeed,
    };
    fruits.push(fruit);
}

function drawFruit(fruit) {
    const img = new Image();
    img.src = fruit.type === 'bomb' ? 'assets/fruits/bomb.png' : `assets/fruits/${fruit.type}.png`;
    ctx.drawImage(img, fruit.x, fruit.y, 80, 80); // Increased fruit size
}

function createBurst(x, y) {
    const newBurst = new Burst(x, y);
    bursts.push(newBurst);
}

function createExplosion(x, y) {
    const explosion = new BombExplosion(x, y);
    explosions.push(explosion);
}

function detectSlice(x, y) {
    for (let i = 0; i < fruits.length; i++) {
        const fruit = fruits[i];
        const dx = x - fruit.x;
        const dy = y - fruit.y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
            if (fruit.type === 'bomb') {
                bombSound.play();
                createExplosion(fruit.x, fruit.y);
                gameOver(); // Trigger game over when a bomb is hit
                return;
            } else if (!fruit.sliced) {
                fruit.sliced = true;
                const fruitInfo = fruitTypes.find((f) => f.type === fruit.type);
                score += fruitInfo ? fruitInfo.points : 0;
                sliceSound.play();
                createBurst(fruit.x, fruit.y);
            }
        }
    }
}

function drawKnife() {
    if (!knifeActive) return;
    const knifeImg = new Image();
    knifeImg.src = 'assets/knife.png';
    ctx.drawImage(knifeImg, knifePosition.x - 20, knifePosition.y - 20, 40, 40);
}

function updateFruits() {
    for (let i = 0; i < fruits.length; i++) {
        const fruit = fruits[i];
        fruit.x += fruit.dx;
        fruit.y += fruit.dy;
        fruit.dy += 0.1;

        if (fruit.y > canvas.height) {
            if (fruit.type !== 'bomb' && !fruit.sliced) {
                lives--; // Only decrease lives for regular fruits
                if (lives <= 0) {
                    gameOver();
                }
            }
            fruits.splice(i, 1);
            i--;
        } else if (fruit.sliced) {
            fruits.splice(i, 1);
            i--;
        }
    }
}

function updateExplosions() {
    for (let i = 0; i < explosions.length; i++) {
        explosions[i].update();
        if (explosions[i].exploded) {
            explosions.splice(i, 1);
            i--;
        }
    }
}

function updateBursts() {
    for (let i = 0; i < bursts.length; i++) {
        bursts[i].update();
        if (bursts[i].particles.length === 0) {
            bursts.splice(i, 1);
            i--;
        }
    }
}

function drawBursts() {
    for (const burst of bursts) {
        burst.draw();
    }
}

function drawExplosions() {
    for (const explosion of explosions) {
        explosion.draw();
    }
}

function drawScoreAndLives() {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(10, 10, 200, 100); // Background box
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 100); // Border
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FF5733';
    ctx.fillText(`🌟 Score: ${score}`, 20, 50);
    ctx.fillStyle = '#FF3333';
    ctx.fillText(`❤️ Lives: ${lives}`, 20, 80);
}

function gameOver() {
    clearInterval(gameInterval);
    backgroundMusic.pause();
    restartButton.style.display = 'block';
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    fruits = [];
    bursts = [];
    explosions = [];
    currentFruitSpeed = 2; // Reset speed to the initial value
    restartButton.style.display = 'none';
    backgroundMusic.play(); // Start music immediately
    gameInterval = setInterval(spawnFruit, 1000);
    gameLoop();

    // Gradually increase fruit speed over time
    setInterval(() => {
        if (currentFruitSpeed < maxSpeed) { // Ensure speed doesn't exceed maxSpeed
            currentFruitSpeed += 0.05; // Gradually increase speed by a small amount
        }
    }, speedIncreaseInterval); // Speed increase every 10 seconds
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateFruits();
    updateBursts();
    updateExplosions();
    drawBursts();
    drawExplosions();
    for (const fruit of fruits) drawFruit(fruit);
    drawKnife();
    drawScoreAndLives();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousedown', (event) => {
    knifeActive = true;
    knifePosition = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('mouseup', () => {
    knifeActive = false;
});
canvas.addEventListener('mousemove', (event) => {
    if (!knifeActive) return;
    knifePosition = { x: event.clientX, y: event.clientY };
    detectSlice(event.clientX, event.clientY);
});

restartButton.addEventListener('click', startGame);

startGame();

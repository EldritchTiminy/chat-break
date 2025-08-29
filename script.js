const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restart");
let gameState = "playing"; // "playing", "paused", or "gameover"

// Game constants
const W = canvas.width;
const H = canvas.height;

// Ball
let ballX = W / 2; // initial horizontal position
let ballY = H - 60; // initial vertical position
let ballR = 8; // ball radius
let ballVX = 4; // horizontal speed
let ballVY = -4; // vertical speed

// paddle
const paddleW = 110; // paddle width
const paddleH = 14; // paddle height
let paddleX = (W - paddleW) / 2; // Initial horizontal position
const paddleY = H - 40; // Fixed vertical position
const paddleSpeed = 7;
let leftPressed = false, rightPressed = false;

// Bricks (grid)
const brickRows = 5;
const brickCols = 9;
const brickW = 70; // Brick width
const brickH = 22; // Brick height
const brickPad = 10;

// center the brick grid
const bricksTotalWidth = brickCols * brickW + (brickCols - 1) * brickPad;
const offsetLeft = (W - bricksTotalWidth) / 2;
const offsetTop = 60;

let bricks = [];
for (let c = 0; c < brickCols; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRows; r++) {
        bricks[c][r] = { x: 0, y: 0, alive: true };
    }
}

// Score / lives / level
let score = 0;
let lives = 3;
let level = 1;
let bricksRemaining = brickCols * brickRows;

function restartGame() {
    cancelAnimationFrame(loopId);
    score = 0;
    lives = 3;
    level = 1;
    ballVX = 4; // Default Speed
    ballVY = -4; // Default Speed
    resetBall();
    resetBricks();
    paddleX = (W - paddleW) / 2;
    gameState = "playing";
    requestAnimationFrame(update);
}

function clear() {
    ctx.clearRect(0, 0, W, H);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
    ctx.fillStyle = "#fff#";
    ctx.fill();
}

function drawPaddle() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(paddleX, paddleY, paddleW, paddleH);
}

function drawBricks() {
    for (let c = 0; c < brickCols; c++) {
        for (let r = 0; r < brickRows; r++) {
            const b = bricks[c][r];
            if (!b.alive) continue;
            const x = offsetLeft + c * (brickW + brickPad);
            const y = offsetTop + r * (brickH + brickPad);
            b.x = x;
            b.y = y;
            ctx.fillStyle = "#0fe";
            ctx.fillRect(x, y, brickW, brickH);
        }
    }
}

function drawHUD() {
    ctx.font = "20px system-ui, Arial, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 16, 28);
    ctx.textAlign = "center";
    ctx.fillText(`Level: ${level}`, W / 2, 28);
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${lives}`, W - 16, 28);
}


// Event Listeners
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") leftPressed = true;
  if (e.key === "ArrowRight" || e.key === "d") rightPressed = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") leftPressed = false;
  if (e.key === "ArrowRight" || e.key === "d") rightPressed = false;
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && gameState === "gameover") {
        restartGame();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p" && gameState === "playing") {
        gameState = "paused";
    } else if (e.key.toLowerCase() === "p" && gameState === "paused") {
        gameState = "playing";
        requestAnimationFrame(update); // resumes game loop
    }
});

pauseBtn.addEventListener("click", () => {
    if (gameState === "playing") {
        gameState = "paused";
        event.target.textContent = "Resume";
    } else if (gameState === "paused") {
        gameState = "playing";
        event.target.textContent = "Pause";
        requestAnimationFrame(update); // resume game loop
    }
});

restartBtn.addEventListener("click", restartGame);


// Optional: mouse moves paddle
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  paddleX = Math.min(Math.max(mx - paddleW / 2, 0), W - paddleW);
});

function updateBall() {
  ballX += ballVX;
  ballY += ballVY;

  // Walls: left/right
  if (ballX - ballR < 0) {
    ballX = ballR;
    ballVX *= -1;
}
  if (ballX + ballR > W) {
    ballX = W - ballR;
    ballVX *= -1;
}

  // Top wall
  if (ballY - ballR < 0) {
    ballY = ballR;
    ballVY *= -1;
}

  // Bottom (missed paddle)
  if (ballY - ballR > H) {
    lives--;
    //resetBall();
    if (lives <= 0) {
        gameState = "gameover";
        resetBall();
    } else {
        resetBall();
    }
  }

  // Paddle collision (simple AABB w/ circle center)
  const withinX = ballX > paddleX && ballX < paddleX + paddleW;
  const hitY = ballY + ballR >= paddleY && ballY + ballR <= paddleY + paddleH;
  if (withinX && hitY && ballVY > 0) {
    ballY = paddleY - ballR;
    ballVY *= -1;

    // add a little "spin": change horizontal speed based on hit position
    const hitPos = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2); // -1..1
    ballVX += hitPos * 1.5; // tweak for feel
    // clamp VX so it doesn't get silly
    const maxVX = 9;
    ballVX = Math.max(-maxVX, Math.min(maxVX, ballVX));
  }
}

function updatePaddle() {
  if (leftPressed) paddleX -= paddleSpeed;
  if (rightPressed) paddleX += paddleSpeed;
  paddleX = Math.min(Math.max(paddleX, 0), W - paddleW);
}

function checkBrickCollisions() {
  // We’ll just reverse vertical velocity when we hit a brick (simple, feels good)
  for (let c = 0; c < brickCols; c++) {
    for (let r = 0; r < brickRows; r++) {
      const b = bricks[c][r];
      if (!b.alive) continue;

      if (
        ballX > b.x && ballX < b.x + brickW &&
        ballY - ballR < b.y + brickH && ballY + ballR > b.y
      ) {
        b.alive = false;
        bricksRemaining--;
        score += 10;

        // Decide which way to bounce: vertical by default
        // (Optional: do more precise side/top detection if you want)
        ballVY *= -1;

        // Slight speed-up to ramp difficulty
        ballVX *= 1.01;
        ballVY *= 1.01;

        if (bricksRemaining === 0) nextLevel();
        return; // handle one brick per frame for stability
      }
    }
  }
}

function resetBall() {
  ballX = W / 2;
  ballY = H - 60;
  ballVX = 4 * (Math.random() < 0.5 ? -1 : 1);
  ballVY = -4 - (level - 1) * 0.5; // a bit faster per level
}

function resetBricks() {
  bricksRemaining = 0;
  for (let c = 0; c < brickCols; c++) {
    for (let r = 0; r < brickRows; r++) {
      bricks[c][r].alive = true;
      bricksRemaining++;
    }
  }
}

function nextLevel() {
  level++;
  lives++;
  resetBricks();
  resetBall();
}

function gameOver(won) {
  // Freeze game by removing the loop and show a message
  cancelAnimationFrame(loopId);
  clear();
  ctx.fillStyle = "#fff";
  ctx.font = "48px system-ui, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(won ? "YOU WIN! 🎉" : "GAME OVER 💀", W / 2, H / 2);
  ctx.font = "20px system-ui, Arial, sans-serif";
  ctx.fillText("Press Enter to Restart", W / 2, H / 2 + 40);
}

function gamePause() {
    cancelAnimationFrame(loopId);
    ctx.fillStyle = "#fff"
    ctx.font = "30px system-ui, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", canvas.width / 2 - 50, canvas.height / 2);
}

let loopId;
function update() {
  console.log(ballVY);
  if (gameState === "gameover") {
    gameOver(false);
    return;
  } else if (gameState === "paused") {
    gamePause();
    return;
  }

  clear();

  // update
  updatePaddle();
  updateBall();
  checkBrickCollisions();

  // draw
  drawBricks();
  drawPaddle();
  drawBall();
  drawHUD();

  // win condition: all bricks cleared across all levels? (Optional)
  // For now, endless levels—comment this in if you want a finite game:
  // if (level === 5 && bricksRemaining === 0) return gameOver(true);

  loopId = requestAnimationFrame(update);
}

// Kickoff
resetBricks();
resetBall();
update();

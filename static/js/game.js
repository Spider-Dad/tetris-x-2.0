document.addEventListener('DOMContentLoaded', () => {
    const audioManager = new AudioManager();
    const gameCanvas = document.getElementById('gameCanvas');
    const nextPieceCanvas = document.getElementById('nextPiece');
    const ctx = gameCanvas.getContext('2d');
    const nextCtx = nextPieceCanvas.getContext('2d');

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;

    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameLoop = null;
    let isPaused = false;

    function initGame() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        currentPiece = getRandomTetromino();
        nextPiece = getRandomTetromino();
        score = 0;
        level = 1;
        lines = 0;
        updateStats();
        audioManager.playRandomBgMusic();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#003300';
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                ctx.strokeRect(j * BLOCK_SIZE, i * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }

        // Draw placed pieces
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = value;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            });
        });

        // Draw current piece
        if (currentPiece) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillStyle = currentPiece.color;
                        ctx.fillRect(
                            (currentPiece.x + x) * BLOCK_SIZE,
                            (currentPiece.y + y) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                });
            });
        }
    }

    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        if (nextPiece) {
            nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        nextCtx.fillStyle = nextPiece.color;
                        nextCtx.fillRect(
                            x * BLOCK_SIZE + 20,
                            y * BLOCK_SIZE + 20,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                });
            });
        }
    }

    function moveDown() {
        currentPiece.y++;
        if (checkCollision()) {
            currentPiece.y--;
            placePiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = getRandomTetromino();
            currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
            currentPiece.y = 0;
            
            if (checkCollision()) {
                gameOver();
            }
            drawNextPiece();
        }
    }

    function checkCollision() {
        return currentPiece.shape.some((row, dy) => {
            return row.some((value, dx) => {
                if (!value) return false;
                const newX = currentPiece.x + dx;
                const newY = currentPiece.y + dy;
                return newX < 0 || newX >= COLS || newY >= ROWS || (board[newY] && board[newY][newX]);
            });
        });
    }

    function placePiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
                }
            });
        });
    }

    function clearLines() {
        let linesCleared = 0;
        board.forEach((row, y) => {
            if (row.every(value => value !== 0)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
            }
        });

        if (linesCleared > 0) {
            lines += linesCleared;
            score += [0, 100, 300, 700, 1500][linesCleared];
            if (score >= level * 3000) {
                level++;
                audioManager.playSound('levelUp');
            }
            updateStats();
        }
    }

    function updateStats() {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }

    function gameOver() {
        cancelAnimationFrame(gameLoop);
        audioManager.stopMusic();
        audioManager.playSound('gameOver');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('gameOverScreen').classList.add('active');
    }

    // Event Listeners
    document.addEventListener('keydown', (e) => {
        if (!currentPiece || isPaused) return;

        switch(e.key) {
            case 'ArrowLeft':
            case '4':
                currentPiece.x--;
                if (checkCollision()) currentPiece.x++;
                break;
            case 'ArrowRight':
            case '6':
                currentPiece.x++;
                if (checkCollision()) currentPiece.x--;
                break;
            case 'ArrowDown':
            case '2':
                moveDown();
                break;
            case 'ArrowUp':
            case '8':
                const matrix = currentPiece.shape;
                const N = matrix.length;
                const rotated = matrix.map((row, i) =>
                    matrix.map(col => col[N - i - 1])
                );
                const previousShape = currentPiece.shape;
                currentPiece.shape = rotated;
                if (checkCollision()) currentPiece.shape = previousShape;
                break;
            case ' ':
            case '5':
                while (!checkCollision()) {
                    currentPiece.y++;
                }
                currentPiece.y--;
                placePiece();
                clearLines();
                currentPiece = nextPiece;
                nextPiece = getRandomTetromino();
                currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
                currentPiece.y = 0;
                drawNextPiece();
                break;
            case 'Enter':
                isPaused = !isPaused;
                break;
            case 'Control':
                audioManager.toggleMute();
                break;
            case 'Escape':
                location.reload();
                break;
        }
        drawBoard();
    });

    document.getElementById('startButton').addEventListener('click', () => {
        const loadingDots = document.getElementById('loadingDots');
        loadingDots.classList.remove('hidden');
        audioManager.playSound('modem').then(() => {
            document.getElementById('startScreen').classList.remove('active');
            document.getElementById('gameScreen').classList.add('active');
            initGame();
            gameLoop = setInterval(() => {
                if (!isPaused) {
                    moveDown();
                    drawBoard();
                }
            }, Math.max(50, 1000 * (48 - level * 5) / 60));
        });
    });

    document.getElementById('restartButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        initGame();
    });

    document.getElementById('exitButton').addEventListener('click', () => {
        location.reload();
    });

    // Start title screen music
    audioManager.playSound('title', true);
});

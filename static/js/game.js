document.addEventListener('DOMContentLoaded', async () => {
    const audioManager = new AudioManager();

    // Попытка воспроизвести титульную музыку при загрузке страницы
    try {
        await audioManager.playSound('title', true);
    } catch (error) {
        console.error('Error playing initial title music:', error);
    }

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
    let isGameOver = false;

    function getNewPiece() {
        const piece = getRandomTetromino();
        piece.x = Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2);
        piece.y = 0;
        return piece;
    }

    function initGame() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        currentPiece = getNewPiece();
        nextPiece = getNewPiece();
        score = 0;
        level = 1;
        lines = 0;
        isPaused = false;
        isGameOver = false;
        updateStats();
        drawBoard();
        drawNextPiece();
        startGameLoop();
        audioManager.playRandomBgMusic();
    }

    function startGameLoop() {
        if (gameLoop) {
            clearInterval(gameLoop);
        }
        gameLoop = setInterval(() => {
            if (!isPaused && !isGameOver) {
                moveDown();
            }
        }, Math.max(50, 1000 - (level - 1) * 50));
    }

    function drawBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

        // Добавляем эффект свечения
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        ctx.shadowBlur = 0;
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
                    drawBlock(ctx, x, y, value);
                }
            });
        });

        // Draw current piece
        if (currentPiece && !isGameOver) {
            currentPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                    }
                });
            });
        }
    }

    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        if (nextPiece && !isGameOver) {
            const offsetX = (nextPieceCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
            const offsetY = (nextPieceCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;

            nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        nextCtx.fillStyle = nextPiece.color;
                        nextCtx.fillRect(
                            x * BLOCK_SIZE + offsetX,
                            y * BLOCK_SIZE + offsetY,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );

                        // Добавляем эффект свечения
                        nextCtx.shadowColor = nextPiece.color;
                        nextCtx.shadowBlur = 5;
                        nextCtx.strokeStyle = '#ffffff';
                        nextCtx.strokeRect(
                            x * BLOCK_SIZE + offsetX,
                            y * BLOCK_SIZE + offsetY,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                        nextCtx.shadowBlur = 0;
                    }
                });
            });
        }
    }

    function moveDown() {
        if (!currentPiece || isGameOver) return;

        currentPiece.y++;
        if (checkCollision()) {
            currentPiece.y--;
            placePiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = getNewPiece();

            if (checkGameOver()) {
                endGame();
                return;
            }
            drawNextPiece();
        }
        drawBoard();
    }

    function checkGameOver() {
        return currentPiece.shape.some((row, y) => {
            return row.some((value, x) => {
                return value && currentPiece.y + y <= 0 && board[currentPiece.y + y] && board[currentPiece.y + y][currentPiece.x + x];
            });
        });
    }

    function checkCollision() {
        return currentPiece.shape.some((row, dy) => {
            return row.some((value, dx) => {
                if (!value) return false;
                const newX = currentPiece.x + dx;
                const newY = currentPiece.y + dy;
                return newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY] && board[newY][newX]);
            });
        });
    }

    function placePiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value && currentPiece.y + y >= 0) {
                    board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
                }
            });
        });
    }

    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(value => value !== 0)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++; // Check the same row again
            }
        }

        if (linesCleared > 0) {
            lines += linesCleared;
            score += [0, 100, 300, 700, 1500][linesCleared];
            if (score >= level * 3000) {
                level++;
                startGameLoop(); // Обновляем только скорость игры
            }
            updateStats();
        }
    }

    function updateStats() {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }

    function endGame() {
        isGameOver = true;
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        audioManager.stopMusic();
        audioManager.playSound('gameOver');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('gameOverScreen').classList.add('active');
    }

    function dropPiece() {
        if (isGameOver || isPaused) return;

        let dropDistance = 0;
        while (!checkCollision()) {
            currentPiece.y++;
            dropDistance++;
        }
        if (dropDistance > 0) {
            currentPiece.y--;
            placePiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = getNewPiece();
            if (checkGameOver()) {
                endGame();
                return;
            }
            drawNextPiece();
            drawBoard();
        }
    }

    function togglePause() {
        if (isGameOver) return;

        isPaused = !isPaused;
        audioManager.setPause(isPaused);
    }

    // Event Listeners
    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;

        switch(e.key) {
            case 'ArrowLeft':
            case '4':
                if (!isPaused) {
                    currentPiece.x--;
                    if (checkCollision()) currentPiece.x++;
                    drawBoard();
                }
                break;
            case 'ArrowRight':
            case '6':
                if (!isPaused) {
                    currentPiece.x++;
                    if (checkCollision()) currentPiece.x--;
                    drawBoard();
                }
                break;
            case 'ArrowDown':
            case '2':
                if (!isPaused) {
                    moveDown();
                }
                break;
            case 'ArrowUp':
            case '8':
                if (!isPaused) {
                    const matrix = currentPiece.shape;
                    const N = matrix.length;
                    const rotated = matrix.map((row, i) =>
                        matrix.map(col => col[N - i - 1])
                    );
                    const previousShape = currentPiece.shape;
                    currentPiece.shape = rotated;
                    if (checkCollision()) currentPiece.shape = previousShape;
                    drawBoard();
                }
                break;
            case ' ':
            case '5':
                if (!isPaused) {
                    dropPiece();
                }
                break;
            case 'Enter':
                togglePause();
                break;
            case 'Control':
                audioManager.toggleMute();
                break;
            case 'Escape':
                (async () => {
                    await audioManager.stopMusic();
                    audioManager.reset();
                    document.getElementById('gameScreen').classList.remove('active');
                    document.getElementById('startScreen').classList.add('active');
                    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
                    score = 0;
                    level = 1;
                    lines = 0;
                    isGameOver = false;
                    isPaused = false;
                    if (gameLoop) {
                        clearInterval(gameLoop);
                        gameLoop = null;
                    }
                    updateStats();
                    // Даем время на полную остановку музыки
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (!audioManager.stoppingMusic && !audioManager.currentMusic) {
                        audioManager.playSound('title', true);
                    }
                })();
                break;
        }
    });

    document.getElementById('startButton').addEventListener('click', async () => {
        const startButton = document.getElementById('startButton');
        const startScreen = document.getElementById('startScreen');
        const loadingScreen = document.getElementById('loadingScreen');
        const gameScreen = document.getElementById('gameScreen');

        // Сначала пытаемся воспроизвести титульную музыку
        try {
            await audioManager.playSound('title', true);
        } catch (error) {
            console.error('Error playing title music:', error);
        }

        // Остальная логика остается без изменений
        startButton.disabled = true;
        audioManager.stopMusic();
        startScreen.classList.remove('active');
        loadingScreen.classList.add('active');

        try {
            await audioManager.playModemSound();
            await new Promise(resolve => setTimeout(resolve, 2000));
            loadingScreen.classList.remove('active');
            gameScreen.classList.add('active');
            initGame();
        } catch (error) {
            console.error('Error during game initialization:', error);
        } finally {
            startButton.disabled = false;
        }
    });

    document.getElementById('restartButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        initGame();
    });

    document.getElementById('exitButton').addEventListener('click', () => {
        location.reload();
    });
});
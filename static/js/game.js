document.addEventListener('DOMContentLoaded', async () => {
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
        updateStats();
        drawBoard();
        drawNextPiece();
        audioManager.playRandomBgMusic();
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
        if (currentPiece) {
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
        if (nextPiece) {
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
        if (!currentPiece) return;

        currentPiece.y++;
        if (checkCollision()) {
            currentPiece.y--;
            placePiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = getNewPiece();

            if (checkCollision()) {
                gameOver();
            }
            drawNextPiece();
        }
        drawBoard();
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
                nextPiece = getNewPiece();
                if (checkCollision()) {
                    gameOver();
                }
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

    document.getElementById('startButton').addEventListener('click', async () => {
        const startButton = document.getElementById('startButton');
        const loadingDots = document.getElementById('loadingDots');

        // Отключаем кнопку на время загрузки
        startButton.disabled = true;

        // Останавливаем титульную музыку и сохраняем ссылку на null
        if (titleMusic) {
            titleMusic.stop();
            titleMusic = null;
        }
        audioManager.stopMusic();

        // Показываем точки загрузки
        loadingDots.classList.remove('hidden');

        try {
            // Воспроизводим звук модема и ждем его окончания
            await audioManager.playModemSound();

            // Переходим к игре
            document.getElementById('startScreen').classList.remove('active');
            document.getElementById('gameScreen').classList.add('active');

            // Инициализируем игру
            initGame();

            // Запускаем игровой цикл
            gameLoop = setInterval(() => {
                if (!isPaused) {
                    moveDown();
                }
            }, Math.max(50, 1000 - (level - 1) * 50));

        } catch (error) {
            console.error('Error during game initialization:', error);
        } finally {
            // Скрываем точки загрузки и включаем кнопку
            loadingDots.classList.add('hidden');
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

    // Start title screen music
    let titleMusic = await audioManager.playSound('title', true);
});
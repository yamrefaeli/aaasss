document.addEventListener('DOMContentLoaded', () => {
    // --- Constants for Stats ---
    const PROTECTOR_STATS = {
        regular_falafel: { cost: 100, damage: 25, range: 180, attackSpeed: 1000 /*ms*/, color: 'lightgreen', display_name: 'כדור פלאפל רגיל' },
        spicy_falafel: {
            cost: 175,
            damage: 35, // Increased from 30
            attackSpeed: 2000,
            range: 160,
            splashRadius: 85, // Increased from 75
            splashDamageFactor: 0.5,
            color: 'orangered',
            display_name: 'פלאפל חריף'
        },
        tahini_tower: { cost: 75, damage: 10, range: 220, attackSpeed: 700, color: 'lightgoldenrodyellow', display_name: 'מגדל טחינה' } // Example, adjust as needed
    };
    const MONSTER_STATS = {
        basic_glob: { speed: 30 /*pixels per second*/, maxHealth: 100, reward: 10, damageToBase: 10, color: 'purple', display_name: 'גוש חומוס' },
        fast_pita: {
            speed: 60,
            maxHealth: 65, // Decreased from 70
            reward: 15,
            damageToBase: 5,
            color: 'sandybrown',
            display_name: 'פיתה מהירה'
        }
    };

    const WAVES_CONFIG = [
        { numMonsters: 5, monsterType: 'basic_glob', spawnInterval: 3000, message: "גל 1: גושי חומוס ראשונים!" },
        { numMonsters: 8, monsterType: 'basic_glob', spawnInterval: 2500, message: "גל 2: עוד גושי חומוס!" },
        { numMonsters: 6, monsterType: 'fast_pita', spawnInterval: 2200, message: "גל 3: פיתות מהירות!" }, // Spawn interval increased from 2000
        { numMonsters: 7, monsterType: 'basic_glob', spawnInterval: 2200, message: "גל 4: גושים מתגברים!" },
        { numMonsters: 5, monsterType: 'basic_glob', spawnInterval: 2500, andThen: { numMonsters: 5, monsterType: 'fast_pita', spawnInterval: 1500 }, message: "גל 5: מעורב!" },
        { numMonsters: 10, monsterType: 'fast_pita', spawnInterval: 1800, message: "גל 6: מתקפת פיתות!"},
        { numMonsters: 10, monsterType: 'basic_glob', spawnInterval: 1500, andThen: { numMonsters: 8, monsterType: 'fast_pita', spawnInterval: 1000}, message: "גל 7: כאוס טוטאלי!" }
    ];

    // --- Game State Variables ---
    let gameBoardArray = [];
    let chickpeaCoins = 300; // Initial coins
    let selectedProtectorType = null; // Store only the type key
    let monsters = [];
    let gameRunning = false; // Start paused, or after an initial countdown/start button
    let lastTimestamp = 0;
    let baseHealth = 100;
    let currentWaveNumber = 0;
    let monstersSpawnedThisWave = 0;
    let monstersDefeatedThisWave = 0; // Includes monsters that reached base
    let waveSpawnTimerId = null; // To clear setInterval for spawning
    let projectiles = []; // Holds active projectiles

    const GRID_ROWS = 6;
    const GRID_COLS = 10;
    const CELL_SIZE = 60; // px

    // --- DOM Element References ---
    const gameBoardElement = document.getElementById('game-board');
    const coinsDisplayElement = document.getElementById('coins-display');
    const waveDisplayElement = document.getElementById('wave-display');
    const baseHealthDisplayElement = document.getElementById('base-health-display');
    const protectorOptions = document.querySelectorAll('.protector-option');
    const gameMessageElement = document.getElementById('game-message');
    const pauseButton = document.getElementById('pause-button');


    // --- Game Board Initialization ---
    function initGameBoard() {
        gameBoardElement.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${CELL_SIZE}px)`;
        gameBoardElement.style.gridTemplateRows = `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`;
        gameBoardElement.style.width = `${GRID_COLS * CELL_SIZE}px`;
        gameBoardElement.style.height = `${GRID_ROWS * CELL_SIZE}px`;

        for (let row = 0; row < GRID_ROWS; row++) {
            gameBoardArray[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => handleCellClick(row, col, cell));
                gameBoardElement.appendChild(cell);
                gameBoardArray[row][col] = {
                    element: cell,
                    protector: null
                };
            }
        }
    }

    // --- Display Updates ---
    function updateCoinsDisplay() {
        coinsDisplayElement.textContent = `מטבעות: ${chickpeaCoins}`;
    }
    function updateBaseHealthDisplay() {
        baseHealthDisplayElement.textContent = `חיים: ${baseHealth}`;
    }
    function updateWaveDisplay() {
        waveDisplayElement.textContent = `גל: ${currentWaveNumber} / ${WAVES_CONFIG.length}`;
    }
    function addCoins(amount) {
        chickpeaCoins += amount;
        updateCoinsDisplay();
    }
    function spendCoins(amount) {
        if (chickpeaCoins >= amount) {
            chickpeaCoins -= amount;
            updateCoinsDisplay();
            return true;
        }
        return false;
    }

    // --- Protector Logic ---
    function updateProtectorOptionsText() {
        protectorOptions.forEach(option => {
            const type = option.dataset.type;
            if (PROTECTOR_STATS[type]) {
                option.textContent = `${PROTECTOR_STATS[type].display_name} (${PROTECTOR_STATS[type].cost})`;
            }
        });
    }

    protectorOptions.forEach(option => {
        option.addEventListener('click', () => {
            protectorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedProtectorType = option.dataset.type;
        });
    });

    function handleCellClick(row, col, cellElement) {
        if (!gameRunning || !selectedProtectorType || gameBoardArray[row][col].protector) {
            if (gameBoardArray[row][col].protector) console.log("Cell occupied.");
            if (!selectedProtectorType) console.log("No protector selected.");
            return;
        }

        const stats = PROTECTOR_STATS[selectedProtectorType];
        if (spendCoins(stats.cost)) {
            gameBoardArray[row][col].protector = {
                type: selectedProtectorType,
                lastAttackTime: 0, // Can be set to game time for varied initial attack
                x: col, // grid col
                y: row, // grid row
                ...stats // Spread all stats like damage, range, attackSpeed
            };
            // cellElement.classList.remove('protector-regular_falafel', 'protector-spicy_falafel', 'protector-tahini_tower'); // Remove any existing type class
            cellElement.classList.add('protector-' + selectedProtectorType); // e.g. protector-regular_falafel
            cellElement.style.backgroundColor = stats.color;

            // Example for adding specific text content for spicy_falafel
            if (selectedProtectorType === 'spicy_falafel') {
                cellElement.textContent = '🌶️'; // or 'S' or similar symbol
                cellElement.style.fontSize = `${CELL_SIZE / 3}px`; // Adjust size of symbol
                cellElement.style.textAlign = 'center';
                cellElement.style.lineHeight = `${CELL_SIZE}px`; // Center vertically
            } else {
                cellElement.textContent = ''; // Clear text for other types if any was set
            }


            protectorOptions.forEach(opt => opt.classList.remove('selected'));
            selectedProtectorType = null;
        } else {
            alert("אין מספיק מטבעות!");
        }
    }

    // --- Monster Class ---
    class Monster {
        constructor(type, startRow) {
            this.stats = MONSTER_STATS[type];
            if (!this.stats) {
                console.error(`Unknown monster type: ${type}`);
                return; // Or throw error
            }
            this.type = type;
            this.currentHealth = this.stats.maxHealth;
            this.row = startRow; // Grid row index
            this.x = GRID_COLS * CELL_SIZE; // Start at the right edge (pixel value)
            this.yPx = this.row * CELL_SIZE + (CELL_SIZE - 30) / 2; // Pixel y, assuming monster height 30px

            this.createElement();
        }

        createElement() {
            this.element = document.createElement('div');
            this.element.classList.add('monster');
            // this.element.classList.add(`monster-${this.type}`); // Generic monster-type class if needed
            this.element.classList.add(this.type); // Specific type class e.g. 'basic_glob', 'fast_pita'
            this.element.style.backgroundColor = this.stats.color;
            this.element.style.top = `${this.yPx}px`;
            this.element.style.left = `${this.x}px`;
            // this.element.textContent = this.type.substring(0,1).toUpperCase(); // Simple text

            const healthBarContainer = document.createElement('div');
            healthBarContainer.classList.add('monster-health-bar-container');
            this.healthBar = document.createElement('div');
            this.healthBar.classList.add('monster-health-bar');
            healthBarContainer.appendChild(this.healthBar);
            this.element.appendChild(healthBarContainer);

            gameBoardElement.appendChild(this.element);
        }

        move(deltaTime) {
            this.x -= this.stats.speed * deltaTime;
            if (this.x < 0) { // Reached base
                baseHealth -= this.stats.damageToBase;
                updateBaseHealthDisplay();
                this.remove(false); // false = not defeated by protector
                monstersDefeatedThisWave++;
                checkWaveCompletion();
                if (baseHealth <= 0) triggerGameOver("הבסיס הושמד!");
            }
        }

        updatePosition() {
            if (this.element) {
                this.element.style.left = `${this.x}px`;
            }
        }

        takeDamage(amount) {
            this.currentHealth -= amount;
            this.updateHealthBar();
            if (this.currentHealth <= 0) {
                this.remove(true); // true = defeated by protector
                return true; // Defeated
            }
            return false; // Still alive
        }

        updateHealthBar() {
            if (this.healthBar) {
                const healthPercentage = Math.max(0, (this.currentHealth / this.stats.maxHealth) * 100);
                this.healthBar.style.width = `${healthPercentage}%`;
            }
        }

        remove(isDefeatedByProtector) {
            if (this.element && this.element.parentElement) {
                this.element.remove();
            }
            monsters = monsters.filter(m => m !== this);
            if (isDefeatedByProtector) {
                 addCoins(this.stats.reward);
                 monstersDefeatedThisWave++;
                 checkWaveCompletion();
            }
        }
    }

    // --- Wave and Spawning Logic ---
    function spawnMonster(monsterType) {
        if (!gameRunning) return;
        const startRow = Math.floor(Math.random() * GRID_ROWS);
        const newMonster = new Monster(monsterType, startRow);
        if (newMonster.stats) { // Check if monster was created successfully
             monsters.push(newMonster);
        }
    }

    function spawnWaveMonsters(waveData) {
        let spawnedCount = 0;
        let totalToSpawn = waveData.numMonsters;
        let currentMonsterType = waveData.monsterType;
        let currentSpawnInterval = waveData.spawnInterval;
        let isPrimaryWavePart = true;

        function doSpawn() {
            if (!gameRunning) return;

            // Bug Fix: Ensure we don't spawn more than the total logical wave amount if paused/resumed.
            if (monstersSpawnedThisWave >= gameBoardArray.currentWaveTotalMonsters) {
                if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
                waveSpawnTimerId = null;
                return;
            }

            if (spawnedCount < totalToSpawn) {
                spawnMonster(currentMonsterType);
                monstersSpawnedThisWave++;
                spawnedCount++;
            }

            if (spawnedCount >= totalToSpawn) {
                if (isPrimaryWavePart && waveData.andThen) {
                    // Transition to the 'andThen' part of the wave
                    isPrimaryWavePart = false;
                    spawnedCount = 0; // Reset for the next part
                    totalToSpawn = waveData.andThen.numMonsters;
                    currentMonsterType = waveData.andThen.monsterType;
                    currentSpawnInterval = waveData.andThen.spawnInterval;
                    // Interval will continue with new settings if it was already running
                    // or will be set if the first part was short.
                    // To ensure the interval changes, we clear and reset if it's running.
                    if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
                    waveSpawnTimerId = setInterval(doSpawn, currentSpawnInterval);

                } else {
                    // All parts of the wave are done spawning
                    if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
                    waveSpawnTimerId = null;
                }
            }
        }
        // Start the spawning process
        if (waveSpawnTimerId) clearInterval(waveSpawnTimerId); // Clear any existing timer
        waveSpawnTimerId = setInterval(doSpawn, currentSpawnInterval);
    }


    function startNextWave() {
        if (currentWaveNumber >= WAVES_CONFIG.length) {
            triggerGameWon();
            return;
        }
        currentWaveNumber++;
        updateWaveDisplay();
        monstersSpawnedThisWave = 0; // Total monsters intended to be spawned in this wave (including sub-waves)
        monstersDefeatedThisWave = 0; // Reset for the new wave

        const waveData = WAVES_CONFIG[currentWaveNumber - 1];
        // Calculate total monsters for this logical wave (including andThen part)
        let totalMonstersInLogicalWave = waveData.numMonsters;
        if (waveData.andThen) {
            totalMonstersInLogicalWave += waveData.andThen.numMonsters;
        }
        // Store this total for checkWaveCompletion
        gameBoardArray.currentWaveTotalMonsters = totalMonstersInLogicalWave; // Storing on gameBoardArray is a bit hacky, consider better state management

        spawnWaveMonsters(waveData);
        console.log(`Starting Wave ${currentWaveNumber}: ${waveData.message || ''}`);
    }

    function checkWaveCompletion() {
        // Use the stored total monsters for the current logical wave
        const totalMonstersForThisWave = gameBoardArray.currentWaveTotalMonsters;

        if (totalMonstersForThisWave && monstersDefeatedThisWave >= totalMonstersForThisWave) {
            console.log(`Wave ${currentWaveNumber} complete!`);
            if (waveSpawnTimerId) {
                clearInterval(waveSpawnTimerId);
                waveSpawnTimerId = null;
            }
            if (currentWaveNumber >= WAVES_CONFIG.length) {
                 triggerGameWon();
            } else {
                 setTimeout(startNextWave, 3000);
            }
        }
    }

    // --- Protector Attack Logic ---
    function updateProtectorsAttacks(currentTime) {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const pData = gameBoardArray[r][c].protector;
                if (pData) {
                    if (currentTime - pData.lastAttackTime >= pData.attackSpeed) {
                        let target = null;
                        for (const monster of monsters) {
                            if (monster.row === pData.y) {
                                const protectorPixelX = pData.x * CELL_SIZE + CELL_SIZE / 2;
                                // Using monster.x (left edge) for distance check, as range is from protector center to monster left edge
                                const distanceToMonsterEdge = protectorPixelX - monster.x;

                                if (monster.x < protectorPixelX && // Monster is to the left
                                    distanceToMonsterEdge <= pData.range) {
                                    if (!target || monster.x < target.x) { // Target closest monster (whose left edge is furthest left)
                                        target = monster;
                                    }
                                }
                            }
                        }

                        if (target) {
                            pData.lastAttackTime = currentTime;

                            // Create projectile
                            const projectileSpeed = 250; // pixels per second, can be tuned
                            const protectorCenterX = pData.x * CELL_SIZE + CELL_SIZE / 2;
                            const protectorCenterY = pData.y * CELL_SIZE + CELL_SIZE / 2;
                            projectiles.push(new Projectile(
                                protectorCenterX,
                                protectorCenterY,
                                target,
                                pData.damage, // Damage itself is instant, this is for projectile info
                                projectileSpeed,
                                pData.color, // Projectile color based on protector
                                pData.type === 'spicy_falafel'
                            ));

                            // Apply damage instantly (current game model)
                            target.takeDamage(pData.damage);

                            if (pData.type === 'spicy_falafel' && pData.splashRadius > 0) {
                                // Splash damage occurs regardless of primary target defeat by this specific hit.
                                let splashVictims = [];
                                const primaryTargetCenterX = target.x + target.element.offsetWidth / 2;
                                const primaryTargetCenterY = target.yPx + target.element.offsetHeight / 2;

                                for (const otherMonster of monsters) {
                                    if (otherMonster === target || !otherMonster.element) continue;

                                    const otherMonsterCenterX = otherMonster.x + otherMonster.element.offsetWidth / 2;
                                    const otherMonsterCenterY = otherMonster.yPx + otherMonster.element.offsetHeight / 2;

                                    const dx = primaryTargetCenterX - otherMonsterCenterX;
                                    const dy = primaryTargetCenterY - otherMonsterCenterY;
                                    const distance = Math.sqrt(dx * dx + dy * dy);

                                    if (distance <= pData.splashRadius) {
                                        splashVictims.push(otherMonster);
                                    }
                                }
                                for (const victim of splashVictims) {
                                     // Ensure victim is still in the monsters array before dealing damage
                                    if (monsters.includes(victim)) {
                                        victim.takeDamage(pData.damage * pData.splashDamageFactor);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // --- Game Loop ---
    function gameLoop(currentTime) {
        if (!gameRunning && pauseButton.textContent === 'המשך' && gameMessageElement.style.display === 'none') {
             lastTimestamp = currentTime; // Prevent large deltaTime jump when resuming
             requestAnimationFrame(gameLoop);
             return;
        }
        if (!gameRunning) { // Covers both paused, and game over/won states
            return;
        }


        const deltaTime = (currentTime - lastTimestamp) / 1000; // seconds
        lastTimestamp = currentTime;

        // Update monsters (iterate backwards if monsters can be removed during loop)
        for (let i = monsters.length - 1; i >= 0; i--) {
            const monster = monsters[i];
            if (monsters.includes(monster)) {
                monster.move(deltaTime);
                if (monster.element) monster.updatePosition();
            }
        }

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            if (projectiles[i].update(deltaTime)) {
                // Projectile requested removal (already handled in projectile.remove)
            }
        }

        // Protector attacks
        updateProtectorsAttacks(currentTime);

        requestAnimationFrame(gameLoop);
    }

    // --- Game State Control ---
    function showGameMessage(message) {
        gameMessageElement.textContent = message;
        gameMessageElement.style.display = 'flex';
    }

    function triggerGameOver(reason = "הפסדת!") {
        gameRunning = false;
        showGameMessage(`Game Over! ${reason}`);
        if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
        console.log("Game Over:", reason);
    }

    function triggerGameWon() {
        gameRunning = false;
        showGameMessage("ניצחת את כל הגלים! כל הכבוד!");
        if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
        console.log("Game Won!");
    }

    function togglePause() {
        if (gameMessageElement.style.display !== 'none') return; // Don't pause if game over/won

        gameRunning = !gameRunning;
        pauseButton.textContent = gameRunning ? 'השהה' : 'המשך';
        if (gameRunning) {
            lastTimestamp = performance.now(); // Reset timestamp to avoid jump
            requestAnimationFrame(gameLoop); // Restart loop
            // Resume wave spawning if it was active
            if (waveSpawnTimerId === -1) { // Special marker for paused timer
                 const waveData = WAVES_CONFIG[currentWaveNumber -1];
                 if (waveData && monstersSpawnedThisWave < waveData.numMonsters) {
                    spawnWaveMonsters(waveData); // This will create a new timer
                 }
            }
        } else {
            // If there's an active spawner, clear it and mark it as paused
            if (waveSpawnTimerId) {
                clearInterval(waveSpawnTimerId);
                waveSpawnTimerId = -1; // Marker that it was paused
            }
        }
        console.log(`Game ${gameRunning ? 'resumed' : 'paused'}`);
    }

    // --- Projectile Class ---
    class Projectile {
        constructor(startX, startY, targetMonster, damage, speed, color, isSplash = false) {
            this.x = startX;
            this.y = startY;
            this.target = targetMonster;
            // this.damage = damage; // Damage is instant, projectile is visual
            this.speed = speed; // pixels per second
            this.color = color;
            this.isSplash = isSplash;

            this.element = document.createElement('div');
            this.element.classList.add('projectile');
            if (this.isSplash) this.element.classList.add('splash-projectile');
            this.element.style.backgroundColor = this.color;

            // Adjust start position to be center of projectile
            this.width = 10; // Matches CSS
            this.height = 10; // Matches CSS
            this.element.style.width = `${this.width}px`;
            this.element.style.height = `${this.height}px`;

            this.x -= this.width / 2;
            this.y -= this.height / 2;

            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            gameBoardElement.appendChild(this.element);
        }

        update(deltaTime) {
            if (!this.target || !this.target.element || !this.target.element.parentElement) {
                // Target is gone
                this.remove();
                return true; // Mark as removed
            }

            const targetCenterX = this.target.x + this.target.element.offsetWidth / 2;
            const targetCenterY = this.target.yPx + this.target.element.offsetHeight / 2;

            const currentCenterX = this.x + this.width / 2;
            const currentCenterY = this.y + this.height / 2;

            const dx = targetCenterX - currentCenterX;
            const dy = targetCenterY - currentCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const moveSpeed = this.speed * deltaTime;

            if (distance < moveSpeed || distance < this.width) { // Hit condition
                createImpactEffect(targetCenterX, targetCenterY, this.color);
                this.remove();
                return true; // Reached target
            }

            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            return false; // Still moving
        }

        remove() {
            if (this.element && this.element.parentElement) {
                this.element.parentElement.removeChild(this.element);
            }
            projectiles = projectiles.filter(p => p !== this);
        }
    }

    // --- Visual Effects ---
    function createImpactEffect(x, y, color = 'yellow') {
        const impactElement = document.createElement('div');
        impactElement.classList.add('impact-effect');
        impactElement.style.backgroundColor = color;
        impactElement.style.left = `${x - 7.5}px`; // Adjust for 15px width/height
        impactElement.style.top = `${y - 7.5}px`;
        gameBoardElement.appendChild(impactElement);

        setTimeout(() => {
            impactElement.style.transform = 'scale(1.5)'; // Grow slightly
            impactElement.style.opacity = '0';
        }, 50); // Start fade/scale out quickly

        setTimeout(() => {
            if (impactElement.parentElement) {
                impactElement.parentElement.removeChild(impactElement);
            }
        }, 250); // Remove after animation
    }


    // --- Initial Setup ---
    initGameBoard();
    updateProtectorOptionsText(); // Set costs in text
    updateCoinsDisplay();
    updateBaseHealthDisplay();
    updateWaveDisplay(); // Shows 0 / total initially

    pauseButton.addEventListener('click', togglePause);

    // Simple start button to begin the game
    const startButton = document.createElement('button');
    startButton.textContent = "התחל משחק";
    startButton.style.position = 'absolute';
    startButton.style.top = '50%';
    startButton.style.left = '50%';
    startButton.style.transform = 'translate(-50%, -50%)';
    startButton.style.padding = '20px';
    startButton.style.fontSize = '1.5em';
    startButton.style.zIndex = '50'; // Above board, below messages
    gameBoardElement.appendChild(startButton);

    startButton.addEventListener('click', () => {
        if (gameRunning) return; // Prevent multiple starts
        gameRunning = true;
        pauseButton.disabled = false;
        pauseButton.textContent = 'השהה';
        startButton.remove(); // Remove start button
        lastTimestamp = performance.now();
        startNextWave(); // Start the first wave
        requestAnimationFrame(gameLoop);
        console.log("Game started");
    }, { once: true }); // Ensure it can only be clicked once

    // Initially, game is not running, so pause button should reflect that
    pauseButton.textContent = 'המשך'; // Or 'התחל' but we have a dedicated start button
    pauseButton.disabled = true; // Disabled until game starts

});

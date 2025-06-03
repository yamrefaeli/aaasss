document.addEventListener('DOMContentLoaded', () => {
    // --- Constants for Stats ---
    const PROTECTOR_STATS = {
        regular_falafel: { cost: 100, health: 200, damage: 25, range: 180, attackSpeed: 1000, color: 'lightgreen', display_name: 'כדור פלאפל רגיל', assetKey: 'regular_falafel' },
        spicy_falafel: {
            cost: 175,
            health: 200,
            damage: 35,
            attackSpeed: 2000,
            range: 160,
            splashRadius: 85,
            splashDamageFactor: 0.5,
            color: 'orangered',
            display_name: 'פלאפל חריף',
            assetKey: 'spicy_falafel'
        },
        tahini_tower: { cost: 75, health: 150, damage: 10, range: 220, attackSpeed: 700, color: 'lightgoldenrodyellow', display_name: 'מגדל טחינה', assetKey: 'tahini_tower' /* Placeholder */ },
        chickpea_plant: {
            cost: 50,
            health: 100,
            generates: 7, // Increased from 5
            generationSpeed: 7000,
            color: 'yellowgreen',
            display_name: 'שתיל חומוס',
            isCoinGenerator: true,
            assetKey: 'chickpea_plant'
        },
        pickle_wall: {
            cost: 75,
            health: 600, // Max health
            isDefensive: true, // Does not attack
            assetKey: 'pickle_wall',
            display_name: 'קיר חמוצים'
        }
    };
    const MONSTER_STATS = {
        basic_glob: { speed: 30, maxHealth: 100, reward: 10, damageToBase: 10, color: 'purple', display_name: 'גוש חומוס', assetKey: 'basic_glob', attackDamage: 20, attackSpeed: 1000 },
        fast_pita: {
            speed: 60,
            maxHealth: 65,
            reward: 15,
            damageToBase: 5,
            color: 'sandybrown',
            display_name: 'פיתה מהירה',
            assetKey: 'fast_pita',
            attackDamage: 15,
            attackSpeed: 800
        },
        amba_runner: {
            speed: 70,
            maxHealth: 50,
            reward: 8, // Decreased from 12
            damageToBase: 1,
            assetKey: 'amba_runner',
            display_name: 'עמבה נוזלית',
            attackDamage: 5,
            attackSpeed: 1000,
            onDefeatEffect: {
                type: 'slow_puddle',
                duration: 5000, // 5 seconds
                radiusCells: 0, // Affects defeat cell + cell to its right
                slowFactor: 0.5,
                color: 'rgba(255, 190, 100, 0.4)'
            }
        }
    };

    const WAVES_CONFIG = [
        { numMonsters: 5, monsterType: 'basic_glob', spawnInterval: 3000, message: "גל 1: גושי חומוס ראשונים!" },
        { numMonsters: 8, monsterType: 'basic_glob', spawnInterval: 2500, message: "גל 2: עוד גושי חומוס!" },
        { numMonsters: 6, monsterType: 'fast_pita', spawnInterval: 2200, message: "גל 3: פיתות מהירות!" },
        { numMonsters: 7, monsterType: 'basic_glob', spawnInterval: 2200, message: "גל 4: גושים מתגברים!" },
        { numMonsters: 3, monsterType: 'amba_runner', spawnInterval: 3200, message: "גל 5: ריצת עמבה!" }, // Count 5->3, Interval 2800->3200
        { numMonsters: 5, monsterType: 'basic_glob', spawnInterval: 2500, andThen: { numMonsters: 5, monsterType: 'fast_pita', spawnInterval: 1500 }, message: "גל 6: מעורב!" },
        { numMonsters: 8, monsterType: 'fast_pita', spawnInterval: 1800, andThen: {numMonsters: 3, monsterType: 'amba_runner', spawnInterval: 2000}, message: "גל 7: מהירות ועמבה!"},
        { numMonsters: 10, monsterType: 'basic_glob', spawnInterval: 1500, andThen: { numMonsters: 8, monsterType: 'fast_pita', spawnInterval: 1000}, message: "גל 8: כאוס טוטאלי!" }
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
        shoot_falafel: 'assets/sounds/shoot_falafel.wav',
        shoot_spicy: 'assets/sounds/shoot_spicy.wav',
        impact_monster: 'assets/sounds/impact_monster.wav',
        monster_defeat_glob: 'assets/sounds/monster_defeat_glob.wav',
        monster_defeat_pita: 'assets/sounds/monster_defeat_pita.wav',
        monster_defeat_amba: 'assets/sounds/monster_defeat_amba.wav',
        coin_collect: 'assets/sounds/coin_collect.wav',
        base_damage: 'assets/sounds/base_damage.wav',
        protector_place: 'assets/sounds/protector_place.wav',
        protector_destroyed: 'assets/sounds/protector_destroyed.wav',
        ui_click: 'assets/sounds/ui_click.wav',
        game_over_stinger: 'assets/sounds/game_over_stinger.wav',
        wave_start_stinger: 'assets/sounds/wave_start_stinger.wav',
        music_loop: 'assets/sounds/music_loop.mp3'
    };

    let globalVolume = 0.5;
    let isMuted = false;
    let backgroundMusic = null; // Will be an Audio object

    function preloadSounds() {
        // Preload background music
        if (soundFiles.music_loop) {
            backgroundMusic = new Audio(soundFiles.music_loop);
            backgroundMusic.loop = true;
            // Initial volume set by event listener or when played
        }
        // Other sounds are played on demand to allow overlap, so direct preloading into 'sounds' object
        // with multiple Audio elements isn't strictly necessary with current playSound implementation.
        // However, one could preload them if desired to ensure they are fetched early.
        // For now, playSound creates new Audio objects, relying on browser caching after first play.
        console.log("Sound system initialized. Background music preloaded if specified.");
    }

    function playSound(soundName, volumeOverride) {
        if (isMuted || !soundFiles[soundName]) {
            return;
        }

        const sound = new Audio(soundFiles[soundName]);
        const baseVolume = (soundName === 'music_loop' || soundName === 'game_over_stinger' || soundName === 'wave_start_stinger') ? 1.0 : 0.7; // Stingers and music at full, effects slightly lower
        const specificVolume = volumeOverride !== undefined ? volumeOverride : baseVolume;
        sound.volume = Math.max(0, Math.min(1, specificVolume * globalVolume));

        sound.play().catch(e => console.warn(`Error playing sound ${soundName}: ${e.message}. User interaction might be required.`));
    }

    function startBackgroundMusic() {
        if (backgroundMusic && !isMuted && gameRunning) {
            backgroundMusic.volume = Math.max(0, Math.min(1, (globalVolume * 0.4))); // Music usually softer
            backgroundMusic.play().catch(e => console.warn("Error starting background music: ", e.message));
        }
    }

    function stopBackgroundMusic() {
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    }

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
                    protector: null,
                    effects: [] // Initialize effects array for each cell
                };
            }
        }
    }

    // --- Visual Feedback for Coin Gain ---
    function showCoinGainAnimation(amount, x, y) {
        const coinText = document.createElement('div');
        coinText.classList.add('coin-gain-animation');
        coinText.textContent = `+${amount}`;

        coinText.style.left = `${x - 15}px`;
        coinText.style.top = `${y - 10}px`;

        gameBoardElement.appendChild(coinText);
        playSound('coin_collect', 0.7); // Play coin sound

        // Trigger animation
        requestAnimationFrame(() => {
            coinText.style.transform = 'translateY(-40px)';
            coinText.style.opacity = '0';
        });

        // Remove after animation
        setTimeout(() => {
            if (coinText.parentElement) {
                coinText.parentElement.removeChild(coinText);
            }
        }, 1000); // Match CSS transition duration
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
                ...stats // Spread all stats like damage, range, attackSpeed, health
            };
            gameBoardArray[row][col].protector.currentHealth = gameBoardArray[row][col].protector.health; // Initialize currentHealth

            // cellElement.classList.remove('protector-regular_falafel', 'protector-spicy_falafel', 'protector-tahini_tower'); // Ensure this doesn't remove base 'grid-cell'
            cellElement.className = 'grid-cell'; // Reset classes
            cellElement.innerHTML = ''; // Clear previous content (e.g. emojis)
            // cellElement.classList.add('protector-' + selectedProtectorType); // Class might not be needed if image is everything

            const protectorImg = document.createElement('img');
            protectorImg.src = `assets/images/${stats.assetKey}.png`;
            protectorImg.classList.add('protector-image');
            // protectorImg.alt = stats.display_name; // Good for accessibility
            cellElement.appendChild(protectorImg);
            // cellElement.style.backgroundColor = ''; // Remove placeholder background

            if (stats.isCoinGenerator) {
                gameBoardArray[row][col].protector.lastCoinGenerationTime = performance.now();
            }
            playSound('protector_place');

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
            this.row = startRow;
            this.x = GRID_COLS * CELL_SIZE;
            this.yPx = this.row * CELL_SIZE + (CELL_SIZE - (parseInt(this.element?.style.height) || CELL_SIZE * 0.8)) / 2; // Center based on actual height later

            this.isAttacking = false;
            this.lastAttackTime = 0;
            this.currentTargetCell = null; // {row, col} of the protector cell

            this.createElement(); // Create element before yPx uses its height
            // Recalculate yPx if monster image has specific height different from container
            const monsterImageHeight = this.element.querySelector('.monster-image')?.offsetHeight || (CELL_SIZE * 0.8);
            this.yPx = this.row * CELL_SIZE + (CELL_SIZE - monsterImageHeight) / 2;
            if(this.element) this.element.style.top = `${this.yPx}px`;


        }

        createElement() {
            this.element = document.createElement('div');
            this.element.classList.add('monster');

            const monsterImg = document.createElement('img');
            monsterImg.src = `assets/images/${this.stats.assetKey}.png`;
            monsterImg.classList.add('monster-image');
            this.element.appendChild(monsterImg);

            const healthBarContainer = document.createElement('div');
            healthBarContainer.classList.add('monster-health-bar-container');
            this.healthBar = document.createElement('div');
            this.healthBar.classList.add('monster-health-bar');
            healthBarContainer.appendChild(this.healthBar);
            this.element.appendChild(healthBarContainer);

            this.element.style.left = `${this.x}px`;
            // this.element.style.top will be set after yPx is finalized in constructor
            this.element.style.width = `${CELL_SIZE * 0.8}px`;
            this.element.style.height = `${CELL_SIZE * 0.8}px`;

            gameBoardElement.appendChild(this.element);
        }

        move(deltaTime) {
            // Check for protector in front
            const currentGridCol = Math.floor(this.x / CELL_SIZE);
            const nextStepX = this.x - this.stats.speed * deltaTime;
            const nextGridCol = Math.floor(nextStepX / CELL_SIZE);
            let targetCol = currentGridCol -1; // Cell to the left of current

            // If monster is mostly in a cell, it attacks cell to its left.
            // If its left edge is about to cross into a new cell, it considers that new cell's left.
            if (this.x % CELL_SIZE < (this.stats.speed * deltaTime)) { // If very close to left border of its current cell
                targetCol = Math.max(0, nextGridCol -1) ; // look further if about to cross
            }
            targetCol = Math.max(0, Math.floor((this.x - this.element.offsetWidth / 2) / CELL_SIZE) -1);


            if (targetCol >= 0 && this.row < GRID_ROWS && targetCol < GRID_COLS) {
                const cellData = gameBoardArray[this.row][targetCol];
                if (cellData && cellData.protector && cellData.protector.currentHealth > 0) {
                    // Protector found, stop and prepare to attack
                    this.isAttacking = true;
                    this.currentTargetCell = { row: this.row, col: targetCol };
                    // Stop the monster right before it enters the protector's cell visually
                    // Adjust x so its left edge is at the right edge of the protector's cell
                    this.x = (targetCol + 1) * CELL_SIZE;
                    // updatePosition will be called in gameLoop
                    return; // Stop moving further this frame
                }
            }

            // No protector in front or target protector is gone.
            if (!this.isAttacking) {
                 this.currentTargetCell = null; // Ensure target is cleared if not actively engaging
            }

            // Apply speed modifications based on cell effects
            let currentSpeed = this.stats.speed;
            const monsterGridCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(this.x / CELL_SIZE)));
            const monsterGridRow = this.row;

            if (gameBoardArray[monsterGridRow] && gameBoardArray[monsterGridRow][monsterGridCol]) {
                const cellData = gameBoardArray[monsterGridRow][monsterGridCol];
                let activeSlowFactor = 1.0;
                let foundActiveSlowThisTick = false;

                if (cellData.effects && cellData.effects.length > 0) { // Check if effects array exists and has items
                    for (let i = cellData.effects.length - 1; i >= 0; i--) {
                        const effect = cellData.effects[i];
                        if (effect.type === 'slow') {
                            if (performance.now() >= effect.expires) {
                                cellData.effects.splice(i, 1);
                            } else {
                                activeSlowFactor = Math.min(activeSlowFactor, effect.factor);
                                foundActiveSlowThisTick = true;
                            }
                        }
                    }
                }
                currentSpeed *= activeSlowFactor;

                // Cleanup puddle class if no more slow effects are currently active on this cell
                if (!foundActiveSlowThisTick && cellData.element.classList.contains('cell-slow-puddle')) {
                    cellData.element.classList.remove('cell-slow-puddle');
                    cellData.element.style.removeProperty('--puddle-color');
                }
            }

            this.x -= currentSpeed * deltaTime; // Apply potentially modified speed


            if (this.x < 0) { // Reached base
                baseHealth -= this.stats.damageToBase;
                playSound('base_damage');
                updateBaseHealthDisplay();
                this.remove(false);
                monstersDefeatedThisWave++;
                checkWaveCompletion();
                if (baseHealth <= 0) triggerGameOver("הבסיס הושמד!");
            }
        }

        attackTarget(gameTime) {
            if (!this.isAttacking || !this.currentTargetCell) {
                 return;
            }

            const { row, col } = this.currentTargetCell;
            const protectorData = gameBoardArray[row][col].protector;

            if (protectorData && protectorData.currentHealth > 0) {
                if (gameTime - this.lastAttackTime >= this.stats.attackSpeed) {
                    protectorData.currentHealth -= this.stats.attackDamage;
                    this.lastAttackTime = gameTime;
                    console.log(`Monster at (${this.row},${Math.floor(this.x/CELL_SIZE)}) attacks protector at (${row},${col}), health: ${protectorData.currentHealth}`);

                    // TODO: Update protector health bar if implemented

                    if (protectorData.currentHealth <= 0) {
                        const cellElement = gameBoardArray[row][col].element;
                        cellElement.innerHTML = '';
                        cellElement.style.backgroundColor = '';
                        gameBoardArray[row][col].protector = null;
                        playSound('protector_destroyed');
                        this.isAttacking = false;
                        this.currentTargetCell = null;
                        console.log(`Protector at (${row},${col}) destroyed!`);
                    }
                }
            } else {
                this.isAttacking = false;
                this.currentTargetCell = null;
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
                const centerX = this.x + this.element.offsetWidth / 2;
                const centerY = this.yPx + this.element.offsetHeight / 2;

                if (isDefeatedByProtector) {
                    addCoins(this.stats.reward); // This will call updateCoinsDisplay
                    showCoinGainAnimation(this.stats.reward, centerX, centerY); // This will play coin_collect sound

                    if (this.stats.onDefeatEffect && this.stats.onDefeatEffect.type === 'slow_puddle') {
                        let defeatCol = Math.floor(this.x / CELL_SIZE);
                        defeatCol = Math.max(0, Math.min(GRID_COLS - 1, defeatCol));
                        applySlowPuddle(defeatCol, this.row, this.stats.onDefeatEffect);
                    }

                    // Play monster defeat sound based on assetKey
                    const defeatSoundKey = `monster_defeat_${this.stats.assetKey}`;
                    if (soundFiles[defeatSoundKey]) { // Check if specific defeat sound exists
                        playSound(defeatSoundKey);
                    } else {
                        playSound('impact_monster', 0.4); // Fallback if no specific defeat sound
                    }

                    monstersDefeatedThisWave++;
                    checkWaveCompletion();
                }
                this.element.remove();
            }
            monsters = monsters.filter(m => m !== this);
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
        playSound('wave_start_stinger');
        currentWaveNumber++;
        updateWaveDisplay();
        monstersSpawnedThisWave = 0;
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
                                pData.damage,
                                projectileSpeed,
                                pData.type === 'spicy_falafel' ? 'spicy' : 'falafel', // Projectile asset type
                                pData.type === 'spicy_falafel' ? 'spicy' : 'falafel', // Projectile asset type
                                pData.type === 'spicy_falafel'
                            ));
                            if (pData.type === 'spicy_falafel') {
                                playSound('shoot_spicy');
                            } else {
                                playSound('shoot_falafel');
                            }

                            // Apply damage instantly
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

        // Update monsters
        for (let i = monsters.length - 1; i >= 0; i--) {
            const monster = monsters[i];
            if (monsters.includes(monster)) {
                monster.move(deltaTime); // Move logic now includes stopping for attack
                monster.attackTarget(currentTime); // Attack logic if conditions met
                if (monster.element) monster.updatePosition(); // Visual update
            }
        }

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            if (projectiles[i].update(deltaTime)) {
                // Projectile was removed
            }
        }

        // Protector attacks and abilities
        updateProtectorsAttacks(currentTime); // For shooting protectors
        updateCoinGenerators(currentTime);

        requestAnimationFrame(gameLoop);
    }

    // --- Game State Control ---
    function showGameMessage(message) {
        gameMessageElement.textContent = message;
        gameMessageElement.style.display = 'flex';
    }

    function triggerGameOver(reason = "הפסדת!") {
        if (!gameRunning && gameMessageElement.style.display !== 'none' && gameMessageElement.textContent.includes("Game Over")) return;

        stopBackgroundMusic();
        playSound('game_over_stinger');
        gameRunning = false;
        showGameMessage(`Game Over! ${reason}`);
        if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
        waveSpawnTimerId = null; // Ensure it's fully cleared
        console.log("Game Over:", reason);
    }

    function triggerGameWon() {
        if (!gameRunning && gameMessageElement.style.display !== 'none' && gameMessageElement.textContent.includes("ניצחת")) return;

        stopBackgroundMusic();
        playSound('wave_start_stinger'); // Placeholder for game_won_stinger
        gameRunning = false;
        showGameMessage("ניצחת את כל הגלים! כל הכבוד!");
        if (waveSpawnTimerId) clearInterval(waveSpawnTimerId);
        waveSpawnTimerId = null; // Ensure it's fully cleared
        console.log("Game Won!");
    }

    function togglePause() {
        if (gameMessageElement.style.display !== 'none') return; // Don't pause if game over/won

        gameRunning = !gameRunning;
        pauseButton.textContent = gameRunning ? 'השהה' : 'המשך';
        if (gameRunning) { // Resuming game
            lastTimestamp = performance.now();
            requestAnimationFrame(gameLoop);
            startBackgroundMusic(); // Resume music if not muted and game was running

            if (waveSpawnTimerId === -1) { // If wave spawning was paused
                 const currentWaveData = WAVES_CONFIG[currentWaveNumber - 1];
                 if (currentWaveData && gameBoardArray.currentWaveTotalMonsters && monstersSpawnedThisWave < gameBoardArray.currentWaveTotalMonsters) {
                    spawnWaveMonsters(currentWaveData);
                 }
            }
        } else { // Pausing game
            stopBackgroundMusic(); // This will pause music
            if (waveSpawnTimerId && waveSpawnTimerId !== -1) {
                clearInterval(waveSpawnTimerId);
                waveSpawnTimerId = -1;
            }
        }
        console.log(`Game ${gameRunning ? 'resumed' : 'paused'}`);
    }

    // --- Projectile Class ---
    class Projectile {
        constructor(startX, startY, targetMonster, damage, speed, assetType, isSplashVisual = false) {
            this.x = startX;
            this.y = startY;
            this.target = targetMonster;
            this.speed = speed; // pixels per second
            this.assetType = assetType; // e.g., 'falafel', 'spicy'
            this.isSplashVisual = isSplashVisual; // For CSS styling if needed

            this.element = document.createElement('div'); // Main container for projectile
            this.element.classList.add('projectile');
            // if (this.isSplashVisual) this.element.classList.add('splash-projectile'); // Not strictly needed if image is specific

            const projectileImg = document.createElement('img');
            projectileImg.src = `assets/images/projectile_${this.assetType}.png`;
            // projectileImg.alt = `projectile ${this.assetType}`;
            this.element.appendChild(projectileImg);

            this.width = 15; // Approx image size, adjust with CSS
            this.height = 15; // Approx image size
            this.element.style.width = `${this.width}px`; // Set container size
            this.element.style.height = `${this.height}px`;

            this.x -= this.width / 2; // Center the container
            this.y -= this.height / 2;

            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            gameBoardElement.appendChild(this.element);
        }

        update(deltaTime) {
            if (!this.target || !this.target.element || !this.target.element.parentElement) {
                this.remove();
                return true;
            }

            const targetCenterX = this.target.x + this.target.element.offsetWidth / 2;
            const targetCenterY = this.target.yPx + this.target.element.offsetHeight / 2;

            const currentCenterX = this.x + this.width / 2;
            const currentCenterY = this.y + this.height / 2;

            const dx = targetCenterX - currentCenterX;
            const dy = targetCenterY - currentCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const moveSpeed = this.speed * deltaTime;

            if (distance < moveSpeed || distance < this.width / 2 ) { // Hit condition: close enough or overlapping
                createImpactEffect(targetCenterX, targetCenterY);
                playSound('impact_monster', 0.6); // Play impact sound, maybe slightly softer
                this.remove();
                return true;
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
    function createImpactEffect(x, y) { // Color removed, will use image
        const impactElement = document.createElement('img');
        impactElement.src = 'assets/images/impact_effect.png';
        // impactElement.alt = "Impact";
        impactElement.classList.add('impact-effect');

        const impactSize = 20; // Matches asset spec, adjust if needed
        impactElement.style.width = `${impactSize}px`;
        impactElement.style.height = `${impactSize}px`;
        impactElement.style.left = `${x - impactSize / 2}px`;
        impactElement.style.top = `${y - impactSize / 2}px`;
        gameBoardElement.appendChild(impactElement);

        // Animation is handled by CSS transition, just need to trigger it and remove
        requestAnimationFrame(() => { // Ensure style is applied before transition starts
            impactElement.style.transform = 'scale(1.5)';
            impactElement.style.opacity = '0';
        });

        setTimeout(() => {
            if (impactElement.parentElement) {
                impactElement.parentElement.removeChild(impactElement);
            }
        }, 200); // CSS transition is 0.2s
    }


    // --- Coin Generators Logic ---
    function updateCoinGenerators(currentTime) {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const pData = gameBoardArray[r][c].protector;
                if (pData && pData.isCoinGenerator) {
                    if (currentTime - (pData.lastCoinGenerationTime || 0) >= pData.generationSpeed) {
                        addCoins(pData.generates);
                        const cellCenterX = c * CELL_SIZE + CELL_SIZE / 2;
                        const cellCenterY = r * CELL_SIZE + CELL_SIZE / 2;
                        showCoinGainAnimation(pData.generates, cellCenterX, cellCenterY);
                        pData.lastCoinGenerationTime = currentTime;
                    }
                }
            }
        }
    }

    // --- Cell Effects Logic ---
    function applySlowPuddle(col, row, effectConfig) {
        const cellsToAffect = [];
        // Defeat cell
        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
            cellsToAffect.push({ r: row, c: col });
        }
        // Cell to its right (where it came from)
        const rightCol = col + 1;
        if (row >= 0 && row < GRID_ROWS && rightCol >= 0 && rightCol < GRID_COLS) {
            cellsToAffect.push({ r: row, c: rightCol });
        }

        cellsToAffect.forEach(cellCoord => {
            const cellObject = gameBoardArray[cellCoord.r][cellCoord.c];
            if (!cellObject) return;

            const cellElement = cellObject.element;
            const effectId = `slow_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            // Add the new effect
            cellObject.effects.push({
                id: effectId,
                type: 'slow',
                factor: effectConfig.slowFactor,
                expires: performance.now() + effectConfig.duration
            });

            // Apply visual style if not already applied by another puddle
            if (!cellElement.classList.contains('cell-slow-puddle')) {
                cellElement.classList.add('cell-slow-puddle');
            }
            // Set color (latest puddle color will dominate if multiple puddles overlap, which is fine)
            cellElement.style.setProperty('--puddle-color', effectConfig.color);

            // Set a timeout to remove this specific effect's contribution
            setTimeout(() => {
                cellObject.effects = cellObject.effects.filter(e => e.id !== effectId);
                // Only remove class if no other 'slow' effects are active on this cell
                if (!cellObject.effects.some(e => e.type === 'slow')) {
                    cellElement.classList.remove('cell-slow-puddle');
                    cellElement.style.removeProperty('--puddle-color');
                } else {
                    // If other slow effects still exist, re-apply the color of one of them
                    // This handles overlapping puddles with different colors, though not perfectly.
                    // The last one to expire would ideally set the color.
                    // For simplicity, current implementation might just lose specific color if an earlier one expires.
                    // A more robust way would be to find the 'strongest' or 'latest' puddle color.
                    // For now, if any slow effect remains, the class remains, but color might not be accurate for overlaps.
                    // To fix, find an active slow effect and re-apply its color.
                    const remainingSlowEffect = cellObject.effects.find(e => e.type === 'slow');
                    if (remainingSlowEffect) {
                         // This part is tricky, as effectConfig.color is from the expiring effect.
                         // We need to store color on the effect object itself, or have a default.
                         // For now, this might mean the color disappears but puddle class remains if other effects exist.
                         // Let's assume for now the last applied color via setProperty sticks until class removed.
                    }
                }
            }, effectConfig.duration);
        });
    }

    // --- Sound System ---
    const soundFiles = {
        shoot_falafel: 'assets/sounds/shoot_falafel.wav',
        shoot_spicy: 'assets/sounds/shoot_spicy.wav',
        impact_monster: 'assets/sounds/impact_monster.wav',
        monster_defeat_glob: 'assets/sounds/monster_defeat_glob.wav',
        monster_defeat_pita: 'assets/sounds/monster_defeat_pita.wav',
        monster_defeat_amba: 'assets/sounds/monster_defeat_amba.wav',
        coin_collect: 'assets/sounds/coin_collect.wav',
        base_damage: 'assets/sounds/base_damage.wav',
        protector_place: 'assets/sounds/protector_place.wav',
        protector_destroyed: 'assets/sounds/protector_destroyed.wav',
        ui_click: 'assets/sounds/ui_click.wav',
        game_over_stinger: 'assets/sounds/game_over_stinger.wav',
        wave_start_stinger: 'assets/sounds/wave_start_stinger.wav',
        music_loop: 'assets/sounds/music_loop.mp3'
    };

    let globalVolume = 0.5;
    let isMuted = false;
    let backgroundMusic = null;

    function preloadSounds() {
        if (soundFiles.music_loop) {
            backgroundMusic = new Audio(soundFiles.music_loop);
            backgroundMusic.loop = true;
        }
        console.log("Sound system: Background music preloaded.");
    }

    function playSound(soundName, volumeOverride) {
        if (isMuted || !soundFiles[soundName]) {
            return;
        }
        const sound = new Audio(soundFiles[soundName]);
        // Determine base volume: stingers/music at full, effects at 70% of global by default
        const defaultBaseVolume = (soundName === 'music_loop' || soundName === 'game_over_stinger' || soundName === 'wave_start_stinger') ? 1.0 : 0.7;
        const specificVolumeFactor = volumeOverride !== undefined ? volumeOverride : defaultBaseVolume;
        sound.volume = Math.max(0, Math.min(1, specificVolumeFactor * globalVolume));

        sound.play().catch(e => console.warn(`Error playing sound ${soundName}: ${e.message}. User interaction might be required.`));
    }

    function startBackgroundMusic() {
        if (backgroundMusic && !isMuted && gameRunning) {
            backgroundMusic.volume = Math.max(0, Math.min(1, (globalVolume * 0.4)));
            backgroundMusic.play().catch(e => console.warn("Error starting background music: ", e.message));
        }
    }

    function stopBackgroundMusic() {
        if (backgroundMusic) {
            backgroundMusic.pause();
            // backgroundMusic.currentTime = 0; // Optional: Reset time, good for stingers but not for pause/resume of loop
        }
    }

    // --- Initial Setup ---
    initGameBoard();
    updateProtectorOptionsText();
    updateCoinsDisplay();
    updateBaseHealthDisplay();
    updateWaveDisplay();

    preloadSounds(); // Initialize sounds and backgroundMusic object

    const muteButtonElement = document.getElementById('mute-button');
    const volumeSliderElement = document.getElementById('volume-slider');

    if (muteButtonElement) {
        muteButtonElement.addEventListener('click', () => {
            if (!isMuted) playSound('ui_click', 0.8); // Play click sound before state changes if unmuting
            isMuted = !isMuted;
            muteButtonElement.textContent = isMuted ? '🔇' : '🔊';
            if (isMuted) {
                if (backgroundMusic) backgroundMusic.pause();
            } else {
                startBackgroundMusic(); // Will check gameRunning internally
                // Play click sound if unmuting
                // playSound('ui_click', 0.8); // Already played above based on old isMuted state
            }
        });
    }

    if (volumeSliderElement) {
        volumeSliderElement.value = globalVolume;
        volumeSliderElement.addEventListener('input', (e) => {
            globalVolume = parseFloat(e.target.value);
            if (backgroundMusic) {
                backgroundMusic.volume = Math.max(0, Math.min(1, (globalVolume * 0.4)));
            }
            // To make slider change audible if unmuted:
            // if(!isMuted) playSound('ui_click', 0.5);
        });
    }

    pauseButton.addEventListener('click', () => {
        playSound('ui_click');
        togglePause();
    });

    const startButton = document.createElement('button');
    startButton.textContent = "התחל משחק";
    startButton.style.position = 'absolute';
    startButton.style.top = '50%';
    startButton.style.left = '50%';
    startButton.style.transform = 'translate(-50%, -50%)';
    startButton.style.padding = '20px';
    startButton.style.fontSize = '1.5em';
    startButton.style.zIndex = '50';
    gameBoardElement.appendChild(startButton);

    startButton.addEventListener('click', () => {
        playSound('ui_click');
        if (gameRunning) return;
        gameRunning = true;
        pauseButton.disabled = false;
        pauseButton.textContent = 'השהה';
        startButton.remove();
        lastTimestamp = performance.now();
        startBackgroundMusic();
        startNextWave();
        requestAnimationFrame(gameLoop);
        console.log("Game started");
    }, { once: true });

    pauseButton.textContent = 'המשך';
    pauseButton.disabled = true;
});

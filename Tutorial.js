const Tutorial = {
    state: {
        activeTab: 'basics',
        scrollOffset: 0
    },

    content: {
        basics: {
            title: "Basics & Controls",
            html: `
                <h2>Welcome to 5 Freunde</h2>
                <p>Your goal is to survive endless waves of enemies. Defeat enemies to gain XP and Gold.</p>
                
                <h3>Keyboard & Mouse Controls</h3>
                <div class="control-grid">
                    <div class="control-item"><b>WASD / Arrows</b><span>Move</span></div>
                    <div class="control-item"><b>Mouse Cursor</b><span>Aim</span></div>
                    <div class="control-item"><b>Left Click</b><span>Shoot (Auto-fire available)</span></div>
                    <div class="control-item"><b>Right Click</b><span>Melee Attack</span></div>
                    <div class="control-item"><b>Space</b><span>Dash</span></div>
                    <div class="control-item"><b>Esc / P</b><span>Pause</span></div>
                </div>

                <h3>Gamepad Controls</h3>
                <div class="control-grid">
                    <div class="control-item"><b>Left Stick</b><span>Move</span></div>
                    <div class="control-item"><b>Right Stick</b><span>Aim</span></div>
                    <div class="control-item"><b>RT / R1</b><span>Shoot</span></div>
                    <div class="control-item"><b>LT / Face Buttons</b><span>Melee</span></div>
                    <div class="control-item"><b>A / LB / LT</b><span>Dash</span></div>
                    <div class="control-item"><b>Start</b><span>Pause</span></div>
                </div>
            `
        },
        heroes: {
            title: "Elemental Heroes",
            html: `
                <h2>Choose Your Hero</h2>
                <p>Each element has a unique playstyle and stats.</p>
                <ul>
                    <li><b style="color:#e74c3c">Fire (Red)</b>: Balanced fighter. Good speed and damage.</li>
                    <li><b style="color:#3498db">Water (Blue)</b>: Crowd control specialist. High knockback.</li>
                    <li><b style="color:#ecf0f1">Ice (White)</b>: Heavy hitter. Freezes enemies but attacks slowly.</li>
                    <li><b style="color:#2ecc71">Plant (Green)</b>: Tank. High health and regeneration.</li>
                    <li><b style="color:#95a5a6">Metal (Grey)</b>: Juggernaut. High defense/damage, very slow.</li>
                    <li><b style="color:#2c3e50">Shadow (Black)</b>: Secret hero. Overpowered but fragile early on.</li>
                </ul>
            `
        },
        modes: {
            title: "Game Modes",
            html: `
                <h2>Ways to Play</h2>
                <h3>Standard Mode</h3>
                <p>The classic survival experience. Waves get harder over time. Bosses spawn every few minutes.</p>
                
                <h3>Story Mode</h3>
                <p>Experience the narrative of the 5 Freunde. Includes special events, dialogue, and unique boss encounters.</p>

                <h3>Daily Challenge</h3>
                <p>A unique run generated every day. Everyone plays with the same random seed and mutators. 
                <br><b>Reward:</b> 1 Chaos Shard per win.</p>
                
                <h3>Weekly Challenge</h3>
                <p>A harder, longer challenge that resets weekly. 
                <br><b>Reward:</b> 3 Chaos Shards per win.</p>
            `
        },
        prestige: {
            title: "Prestige & Hard Mode",
            html: `
                <h2>Pushing the Limits</h2>
                <h3>Prestige</h3>
                <p>Once you reach a high level with a hero, you can <b>Prestige</b> them.</p>
                <ul>
                    <li><b>Resets:</b> Hero Level and Skill Tree progress to 0.</li>
                    <li><b>Gains:</b> Increases base stats (Health, Damage, Gold Gain) permanently.</li>
                    <li><b>Difficulty:</b> Enemies become tougher for that hero.</li>
                </ul>
                <p>Use Prestige to break through stat ceilings and farm Gold more efficiently.</p>

                <h3>Hard Mode</h3>
                <p>Unlocked after completing specific milestones. Increases enemy speed, health, and damage, but grants significantly more XP and Gold.</p>
            `
        },
        progression: {
            title: "Progression",
            html: `
                <h2>Power Up</h2>
                <h3>Skill Tree</h3>
                <p>Earn Skill Points by leveling up in-game. Spend them on the Skill Tree for permanent stat boosts.</p>
                
                <h3>Void Shop</h3>
                <p>Spend your total accumulated Gold to buy infinite scaling upgrades (Health, Damage, Greed, Speed).</p>
                
                <h3>Altar of Mastery</h3>
                <p>Sacrifice resources to gain powerful passive bonuses. Unlocked later in the game.</p>
            `
        },
        museum: {
            title: "Museum & Collection",
            html: `
                <h2>The Museum</h2>
                <p>A physical space where you can walk around and view your unlocked Heroes and defeated Enemies.</p>
                <p>Visit the <b>Gallery</b> to see the monsters you've conquered.</p>

                <h2>Monster Collection Cards</h2>
                <p>Enemies have a small chance to drop <b>Collector Cards</b> when defeated. Collecting these cards unlocks permanent bonuses against that specific enemy type.</p>
                
                <h3>Card Tiers</h3>
                <ul>
                    <li><b style="color:#cd7f32">Bronze</b>: +10% Damage dealt to this enemy type.</li>
                    <li><b style="color:#c0c0c0">Silver</b>: -10% Damage taken from this enemy type.</li>
                    <li><b style="color:#ffd700">Gold</b>: +20% XP gained from this enemy type.</li>
                    <li><b style="color:#e5e4e2">Platinum</b>: A unique special bonus (e.g., "Ghosts are always visible" or "Immune to Toxic Trails").</li>
                </ul>
                <p>Collect all 4 cards for an enemy to fully master them!</p>
            `
        },
        chaos: {
            title: "Chaos System",
            html: `
                <h2>Risk vs Reward</h2>
                <p>The Chaos Shop allows you to modify the game rules for massive Gold bonuses.</p>
                <ul>
                    <li><b>Chaos Shards:</b> Earned from Daily/Weekly challenges.</li>
                    <li><b>Chaos Effects:</b> Modifiers like "Inverted Controls" or "Giant Enemies".</li>
                    <li><b>Gold Multiplier:</b> Each active effect increases your Gold Gain percentage.</li>
                </ul>
                <p style="color:#e74c3c">Warning: Effects stack! Activating too many can make the game impossible.</p>
            `
        },
        rock: {
            title: "Rise of the Rock",
            html: `
                <h2>DLC: Rise of the Rock</h2>
                <p>Unearth the power of the ancients with this content expansion.</p>
                
                <h3>New Hero: Earth (Brown)</h3>
                <p>A resilient defender who commands the ground itself.</p>
                <ul>
                    <li><b>Passive:</b> Stone Skin - Reduces incoming damage permanently.</li>
                    <li><b>Ability:</b> Seismic Slam - Creates a shockwave that stuns enemies.</li>
                    <li><b>Ultimate:</b> Tectonic Shift - Reshapes the battlefield to block enemy paths.</li>
                </ul>

                <h3>New Biome: The Canyons</h3>
                <p>A rugged landscape filled with golems and falling rocks. Watch your step!</p>
            `
        },
        wind: {
            title: "The Wind Waker",
            html: `
                <h2>DLC: The Wind Waker</h2>
                <p>Master the skies and flow like the breeze.</p>
                
                <h3>New Hero: Air (Turquoise)</h3>
                <p>Agile and evasive, the Air Hero controls the battlefield from a distance.</p>
                <ul>
                    <li><b>Passive:</b> Tailwind - Movement speed increases over time.</li>
                    <li><b>Ability:</b> Zephyr Form - Transform into pure energy, changing your attacks.</li>
                    <li><b>Ultimate:</b> Hurricane - Summon a massive storm that pushes enemies away.</li>
                </ul>

                <h3>New Mechanics</h3>
                <p><b>Pushback:</b> Use your wind attacks to keep enemies at bay rather than faceting them directly.</p>
            `
        },
        thunder: {
            title: "Tournament of Thunder",
            html: `
                <h2>DLC: Tournament of Thunder</h2>
                <p>Enter the arena and prove your worth to the Storm Gods.</p>
                
                <h3>New Hero: Lightning (Yellow)</h3>
                <p>High speed, high damage, but very fragile.</p>
                <ul>
                    <li><b>Passive:</b> Static Charge - Moving builds up charge for a powerful next attack.</li>
                    <li><b>Ability:</b> Chain Lightning - Attacks arc between nearby enemies.</li>
                    <li><b>Ultimate:</b> Thunderstrike - Global damage to all enemies on screen.</li>
                </ul>

                <h3>The Tournament</h3>
                <p>A special wave-based mode where you face champions instead of mindless hordes.</p>
            `
        },
        chaos_dlc: {
            title: "Champions of Chaos",
            html: `
                <h2>DLC: Champions of Chaos</h2>
                <p>Embrace the entropy and wield the power of the void.</p>
                
                <h3>New Hero: Gravity (Purple)</h3>
                <p>Manipulates the fundamental forces of the universe.</p>
                <ul>
                    <li><b>Passive:</b> Event Horizon - Enemies near you are slowed down.</li>
                    <li><b>Ability:</b> Black Hole - Sucks enemies into a central point for massive damage.</li>
                    <li><b>Ultimate:</b> Singularity - Compresses all matter, dealing fatal damage.</li>
                </ul>

                <h3>New Hero: Void (Dark Grey)</h3>
                <p>A glitch in reality, the Void Hero is a melee assassin with strange powers.</p>
                <ul>
                    <li><b>Passive:</b> Glitch Step - Chance to phase through enemies and damage.</li>
                    <li><b>Melee:</b> Spatial Tear - Opens rifts that damage enemies over time.</li>
                    <li><b>Ultimate:</b> Reality Crash - Breaks the game logic to deal massive damage to everything.</li>
                </ul>

                <h3>Distorted Dimension</h3>
                <p>A realm where physics are mere suggestions. Prepare for inverted controls and time dilation.</p>
            `
        }
    },

    open: function () {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('tutorial-screen').style.display = 'flex';

        // Check for DLCs and show buttons
        if (window.dlcManager) {
            const list = window.dlcManager.getDLCList();

            const rock = list.find(d => d.id === 'rise_of_the_rock');
            if (rock && rock.active) document.getElementById('btn-tutorial-rock').style.display = 'block';

            const wind = list.find(d => d.id === 'the_wind_waker');
            if (wind && wind.active) document.getElementById('btn-tutorial-wind').style.display = 'block';

            const thunder = list.find(d => d.id === 'tournament_of_thunder');
            if (thunder && thunder.active) document.getElementById('btn-tutorial-thunder').style.display = 'block';

            const chaos = list.find(d => d.id === 'champions_of_chaos');
            if (chaos && chaos.active) document.getElementById('btn-tutorial-chaos-dlc').style.display = 'block';
        }

        this.showTab('basics');
        setUIState('TUTORIAL');
    },

    close: function () {
        document.getElementById('tutorial-screen').style.display = 'none';
        initMenu();
    },

    showTab: function (tabId) {
        this.state.activeTab = tabId;
        const data = this.content[tabId];

        // Update Content
        const contentDiv = document.getElementById('tutorial-content');
        contentDiv.innerHTML = data.html;
        contentDiv.scrollTop = 0; // Reset scroll

        // Update Sidebar Buttons
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('onclick').includes(tabId)) {
                btn.classList.add('active');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    },

    // Controller Navigation
    handleInput: function (gamepad) {
        const tabs = Object.keys(this.content);
        let currentIndex = tabs.indexOf(this.state.activeTab);

        // Navigate Tabs (Up/Down)
        if (gamepad.axes[1] < -0.5 && uiDebounce <= 0) { // Up
            currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            this.showTab(tabs[currentIndex]);
            uiDebounce = 10;
        } else if (gamepad.axes[1] > 0.5 && uiDebounce <= 0) { // Down
            currentIndex = (currentIndex + 1) % tabs.length;
            this.showTab(tabs[currentIndex]);
            uiDebounce = 10;
        }

        // Scroll Content (Right Stick)
        if (Math.abs(gamepad.axes[3]) > 0.1) {
            const contentDiv = document.getElementById('tutorial-content');
            contentDiv.scrollTop += gamepad.axes[3] * 10;
        }

        // Close (B Button)
        if (gamepad.buttons[1].pressed && uiDebounce <= 0) { // B button
            this.close();
            uiDebounce = 20;
        }
    }
};

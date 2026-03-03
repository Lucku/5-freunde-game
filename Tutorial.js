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
                <p>Harness the raw force of the earth itself. The Earth Hero is a slow, unstoppable juggernaut — the longer you move in a straight line, the more dangerous you become.</p>

                <h3>New Hero: Earth — Brown 🪨</h3>
                <p>A momentum-based brawler who rewards deliberate, committed movement. Erratic play loses all power; controlled ramming crushes everything in your path.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#a1887f;">Momentum</div>
                    <p>Your primary resource (0–100). It builds every frame you move in a straight line and decays when you stand still. Sharp turns are heavily punished: a full 180° reversal resets it entirely; a 90° turn cuts it in half. Momentum directly scales your <b>Tremor melee radius</b> (up to +50% larger) and your <b>Ram Damage</b> (up to 150%+ of base). Play like a runaway boulder — commit to your direction.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#a1887f;">Melee: Tremor</div>
                    <p>A ground-shaking AoE attack centered on you. Radius and damage scale with current Momentum — at zero, it's a modest pulse; at max, it's an earthquake. Deals knockback proportional to your momentum ratio. Enemies caught in the blast are briefly staggered.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#a1887f;">Special: TECTONIC SHIELD</div>
                    <p>Encases you in rock armor equal to <b>50 + 50% of your max HP</b> for 5 seconds. While the shield is active, any enemy projectile that hits you is <b>reflected back</b> at 1.5× speed and 2× damage. Cooldown: 40 seconds — use it when you're about to commit to a ram through a tight cluster.</p>
                </div>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>Ram Damage:</b> Increases collision damage on direct ramming impacts.</li>
                    <li><b>Momentum Cap:</b> Raises the ceiling of your Momentum resource, letting you build to higher damage and radius.</li>
                    <li><b>Momentum Decay:</b> Reduces how fast Momentum drains when turning or idle.</li>
                    <li><b>ULT Damage:</b> Powers up your Level 10 Obsidian Golem transformation.</li>
                </ul>
                <p><i>Tip: The "Ram Damage" level-up upgrade adds +20% collision multiplier — your highest priority pickup early on.</i></p>

                <h3>Ultimate: Obsidian Golem</h3>
                <p>At Level 10, entering your transformation grants <b>infinite Momentum</b> for 15 seconds and doubles your ramming damage. Your body turns obsidian-black and radiates a gold aura — enemies that survive one hit won't survive two.</p>

                <h3>New Biome: The Rock Quarry</h3>
                <p>A jagged, narrow arena of canyons and boulders that naturally funnels enemies into predictable lanes — perfect for a straight-line ramming build.</p>
            `
        },
        thunder: {
            title: "Tournament of Thunder",
            html: `
                <h2>DLC: Tournament of Thunder</h2>
                <p>Lightning rewards relentless movement and punishes standing still. Keep moving, build your charge, and release storms that shred entire groups at once.</p>

                <h3>New Hero: Lightning — Yellow ⚡</h3>
                <p>A high-risk, high-reward hero who builds power passively just by moving. Normal attacks chain between enemies; a fully charged shot turns the whole field into a conductor.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ffeb3b;">Static Charge</div>
                    <p>Your passive resource (0–100). It builds automatically every frame you are moving — 1 per frame normally, 2 per frame in FLASH form. A yellow bar appears below your character showing your current charge. At 100, it turns white and your next shot becomes a <b>Charged Shot</b>.</p>
                    <p>
                        <b>Normal Shot</b> — 0.6× damage, arcs to 2 nearby enemies (within 350px), 30% stun chance.<br>
                        <b>Charged Shot</b> — 2.5× damage, arcs to 5 enemies (600px range), 100% stun, consumes all charge.
                    </p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#00e5ff;">Chain Lightning</div>
                    <p>Every projectile you fire (normal or charged) automatically arcs to additional enemies within range. Chain damage decays 15% per bounce. Enemies in tight clusters take enormous total damage. Synergy with Frozen enemies via the Altar: frozen targets take 2× lightning damage (Superconductor).</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ffeb3b;">Special: STORM</div>
                    <p>Calls down a 5-second lightning storm that auto-targets the nearest enemy within 500px roughly 7 times per second, each bolt dealing <b>3× your range damage</b> in a 60px blast radius. You also gain 1 second of brief invincibility on activation. Cooldown: 15 seconds. Use it the moment a large group clusters together.</p>
                </div>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>Chain Count:</b> Each node adds +1 arc jump per projectile — critical for crowd clearing.</li>
                    <li><b>Static Gen:</b> Increases the rate at which you build Static Charge — reach 100 faster.</li>
                    <li><b>Speed:</b> Faster movement means faster charge generation; invest here early.</li>
                </ul>
                <p><i>Tip: Never stop moving. Static Charge generation stops completely when stationary.</i></p>

                <h3>Ultimate: Flash</h3>
                <p>At Level 10, FLASH form automatically fires lightning sparks while active and cuts your attack cooldown from 1 second to 0.4 seconds. Combined with double charge generation, you cycle between Charged Shots at a relentless pace.</p>

                <h3>New Biome: The Storm Cloud</h3>
                <p>A dark, turbulent arena criss-crossed by permanent lightning conductors on the ground. Enemies who walk through the conductors take periodic shock damage — herd them into the channels.</p>
            `
        },
        champions: {
            title: "Champions of Chaos",
            html: `
                <h2>DLC: Champions of Chaos</h2>
                <p>Two heroes who break the rules of the game itself. Gravity bends physics to create inescapable voids; Void exploits corrupted reality to assassinate targets and glitch through defenses.</p>

                <h3>New Hero: Gravity — Purple 🌑</h3>
                <p>A slow-building powerhouse. Patience and kill-farming fuel an increasingly devastating singularity. Weak at the start of a wave; lethal by the middle of it.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#8e44ad;">Mass</div>
                    <p>Your special fuel (0–100). You gain +1 Mass per enemy killed. Spend <b>50 Mass</b> to create a Black Hole — it appears at your position and persists for up to 10 seconds.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#8e44ad;">Black Hole</div>
                    <p>Starts at 10px and grows up to 150px (and beyond with kills). Pulls all enemies within 3× its radius toward the center. Enemies closer than 20px are instantly consumed and absorbed — the hole grows +2px per kill, and the eventual detonation gets stronger. Bosses resist the pull (0.1× force) and take DoT instead of being consumed. When you trigger <b>Collapse</b>, the hole detonates for <b>500 + 50 × enemies eaten</b> damage in a radius twice its size.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#8e44ad;">Passive: Gentle Pull</div>
                    <p>All nearby enemies are always being slowly drawn toward you (0.5px/frame). Combined with a growing black hole, you can funnel enemies into a death spiral without firing a single shot.</p>
                </div>

                <h3>Gravity Skill Tree Highlights</h3>
                <ul>
                    <li><b>Gravity Radius:</b> +5% pull radius per node — the most important upgrade for controlling large groups.</li>
                    <li><b>Mass Cap:</b> Raise the ceiling above 100 to delay detonation and grow a larger, more destructive hole.</li>
                    <li><b>Event Horizon (level-up):</b> Adds +25% gravity pull radius instantly.</li>
                </ul>

                <h3 style="margin-top:28px;">New Hero: Void — Dark Gray 👾</h3>
                <p>An assassin built around melee execution and glitch mechanics. Pathetically slow ranged attack; devastatingly fast and brutal at close range.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#00bcd4;">Melee: Rift Slash</div>
                    <p>Dashes 30px forward and unleashes a 150px cone AoE. Enemies below <b>15% HP are instantly executed</b> — no matter how much health they had. The slash also spawns delayed <b>Echo clones</b> (1 + extra projectiles) that repeat the attack 200ms later in 80px radius. Chain-execute groups of weakened enemies in a single sweep.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#00bcd4;">Special: REALM SHIFT</div>
                    <p>Activates for 10 seconds: your speed doubles and every enemy you touch is marked <b>Glitched</b> (taking 2 damage per frame). When REALM SHIFT ends, all Glitched enemies simultaneously explode for <b>200 damage each</b>. The more enemies you tag during the window, the more catastrophic the chain detonation. Cooldown: 20 seconds.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#00bcd4;">Range: Glitch Bolt</div>
                    <p>An extremely slow projectile (3px/frame) that visually jitters and flickers. Only 1 bolt at base, but "Multi-Thread" level-up upgrades add more. Primarily a poke tool — Void is a melee-first hero and range is a last resort.</p>
                </div>

                <h3>Void Skill Tree Highlights</h3>
                <ul>
                    <li><b>Dash Speed:</b> Faster Rift Slash dash — reach your execute target before they recover.</li>
                    <li><b>Rift Size:</b> Expands the cone AOE of each Rift Slash.</li>
                    <li><b>Multi-Thread (level-up):</b> +1 Glitch Bolt and +1 Echo per purchase.</li>
                </ul>
                <p><i>Tip: In ENTROPY form (Level 10), a 200px corruption aura deals 20 damage per frame to all nearby enemies and has a 5% chance to instantly kill anything below 30% HP. Pair with REALM SHIFT for absolute carnage.</i></p>

                <h3>New Biomes: Chaos & Fractured Dimension</h3>
                <p>Two distorted arenas where geometry bends: curved corridors, fractured floor tiles, and enemies that phase between visible and invisible states.</p>
            `
        },
        wind: {
            title: "Waker of Winds",
            html: `
                <h2>DLC: Waker of Winds</h2>
                <p>The Air Hero turns mobility into its own weapon. Lower raw damage than other heroes, but unmatched speed, returning projectiles, and a dynamic weather system that rewards adaptability.</p>

                <h3>New Hero: Air — Turquoise 🌀</h3>
                <p>An agile kiter who attacks with chakrams that curve and return to you. 20% faster base speed, 15% lower damage — your power comes from positioning, not brute force.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#40e0d0;">Flow</div>
                    <p>Your passive resource (0–100). Flow decays at 0.5 per frame when you stand still, so constant movement is essential. Higher Flow increases your damage multiplier and helps fuel certain Wind Direction abilities. Think of it as a momentum reward: always be moving.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#40e0d0;">Chakram — Returning Projectile</div>
                    <p>Your chakrams arc outward and curve back to your current position. Enemies can be hit on both the outward and return trip. Use your movement to guide the return path through clusters, effectively doubling each throw's damage output.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#40e0d0;">Special: TORNADO (ZEPHYR Form)</div>
                    <p>Transforms you into ZEPHYR for a burst of enhanced movement. A powerful vortex spins out from your position, dealing area damage and knocking enemies back. Cooldown: 20 seconds. Use it to escape surrounded situations or to push enemies off ledges and into clusters.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#40e0d0;">Story Mode: The Weather Vane</div>
                    <p>In Story Mode, each wave is assigned a <b>Wind Direction</b> (North, East, South, West) that rotates each wave. The direction sets a wave objective you must complete before the wave boss appears:</p>
                    <ul style="margin:8px 0 0;">
                        <li><b>North:</b> COLLECT — gather Wind Artifacts scattered around the map.</li>
                        <li><b>East:</b> KILL — defeat a specific enemy type.</li>
                        <li><b>South:</b> COMBO — chain attacks to build a hit streak.</li>
                        <li><b>West:</b> SURVIVE — complete the wave without taking more than a set amount of damage.</li>
                    </ul>
                    <p>Some objectives also include ABILITY challenges (use your special N times). Complete the objective to unlock the boss fight.</p>
                </div>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>Speed:</b> +5% movement speed per node — amplifies your already-superior mobility.</li>
                    <li><b>Flow Cap:</b> Raises the max Flow ceiling, sustaining your damage multiplier at higher levels.</li>
                    <li><b>Knockback:</b> +1 push per node — keep enemies at range and direct their movement.</li>
                </ul>
                <p><i>Tip: The "Wind Shift" level-up upgrade manually rotates your Weather Vane direction in Story Mode, letting you choose objectives that suit your playstyle.</i></p>
                <p><i>Tip: Chakrams hit on the return path — position yourself so incoming chakrams sweep through tight groups behind you.</i></p>

                <h3>New Biome: The Wind Peaks</h3>
                <p>An open, elevated arena with constant gale-force crosswinds that slow enemies moving against the current. Learn the wind direction early — your chakrams curve with it.</p>
            `
        },
        faith: {
            title: "Faith of Fortune",
            html: `
                <h2>DLC: Faith of Fortune</h2>
                <p>Two heroes at opposite ends of the spectrum: one demands discipline and stillness; the other embraces pure, wild randomness. Master either extreme for devastating results.</p>

                <h3>New Hero: Spirit — Amber/Gold 🧘</h3>
                <p>A meditating monk with a deceptively weak baseline. Spirit's power is entirely resource-gated — patient, still players are rewarded with near-invincibility; aggressive, frantic play is punished hard.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#f0d080;">Inner Peace</div>
                    <p>Your core resource (0–100). It fills only while you are <b>standing completely still</b> (0.2 per frame, ~12 per second). It drains when you take damage (−15) or when you fire an attack (−5 per shot). Managing Peace is the entire game — never let it hit zero before activating your special.</p>
                    <p>Standing still for more than 2 seconds also triggers passive HP regeneration. The longer you hold position, the faster you fill.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#f0d080;">Attack: Mantra</div>
                    <p>A slow, golden orb (8px/frame) that deals damage scaling with your current Inner Peace: at 0 Peace it deals 50% base damage; at 100 Peace it deals 150%. Each shot costs 5 Peace, so spamming fire rapidly drains your resource. Upgrade <b>Mantra Pierce</b> to hit multiple enemies per shot — critical for making each costly shot count.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#f0d080;">Special: TRANSCEND (Enlightened Form)</div>
                    <p>Requires at least <b>30 Inner Peace</b> to activate. Converts 50% of your current Peace into an immediate HP heal, then enters ENLIGHTENED form: <b>full invincibility</b> for as long as Peace lasts (drains 0.5/frame). While Enlightened, a 150px damage aura pulses every 15 frames dealing 20 damage to everything nearby. No fixed cooldown — it ends when Peace is depleted.</p>
                </div>

                <h3>Spirit Skill Tree Highlights</h3>
                <ul>
                    <li><b>Peace Recharge Rate:</b> Fills Inner Peace faster while standing still — the most important node.</li>
                    <li><b>Max Peace (level-up):</b> Increases the cap by +50, allowing longer TRANSCEND windows.</li>
                    <li><b>Shield (level-up):</b> 20% damage reduction whenever Peace exceeds 50 — rewards keeping it topped up.</li>
                    <li><b>Regen (level-up):</b> Gain 5 HP per frame while meditating — turns stillness into a heal station.</li>
                </ul>
                <p><i>Tip: Find a corner, fill Peace to 100, then activate TRANSCEND and sweep the center of the map with your aura. Rinse and repeat each wave.</i></p>

                <h3 style="margin-top:28px;">New Hero: Chance — Magenta 🎲</h3>
                <p>A gambler whose every aspect is driven by Luck. Every attack roll is randomized, every special activation is a gamble — but the higher your Luck stat, the more the odds tilt in your favor.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ff00ff;">Luck</div>
                    <p>Your core stat (base: 10, no cap with upgrades). Luck affects: the damage range of your dice, the probability of good slot outcomes, your crit chance, and whether your RNG results get rerolled for better values. Every Luck Charm level-up and Skill Tree node adds +10 Luck. Invest heavily and often — Luck is everything.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ff00ff;">Attack: Dice Shots</div>
                    <p>Spinning dice projectiles with damage randomized between 1 and (Luck × 5). At Luck 10 that's 1–50; at Luck 100 that's 1–500. Matching dice earn bonuses:</p>
                    <ul style="margin:8px 0 0;">
                        <li><b>All matching (EXPLOSIVE_DICE):</b> 2× damage + 60px explosion on impact.</li>
                        <li><b>Pair:</b> 1.5× damage, magenta color.</li>
                        <li><b>Single:</b> Base damage, white color.</li>
                    </ul>
                    <p>At 50+ Luck, low rolls have a 25% chance to be rerolled upward automatically.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ff00ff;">Special: SLOTS (Slot Machine)</div>
                    <p>Spins for 2 seconds then resolves a luck-weighted outcome. Higher Luck shifts probability toward better results:</p>
                    <div class="tut-flask-grid" style="grid-template-columns: 1fr 1fr;">
                        <div class="tut-flask"><b style="color:#ffd700;">JACKPOT</b>7777 dmg to all enemies + permanent buff</div>
                        <div class="tut-flask"><b style="color:#00bcd4;">DIAMOND</b>5s invincibility + 2× damage</div>
                        <div class="tut-flask"><b style="color:#2ecc71;">GOOD</b>Full heal + gold drops</div>
                        <div class="tut-flask"><b style="color:#aaa;">MEH</b>Small 50 dmg explosion</div>
                        <div class="tut-flask"><b style="color:#e74c3c;">BAD</b>Self damage (10) or −25% max HP</div>
                    </div>
                    <p style="margin-top:8px;">Cooldown: 15 seconds. At JACKPOT ultimate form, outcomes are forced GOOD or better.</p>
                </div>

                <h3>Chance Skill Tree Highlights</h3>
                <ul>
                    <li><b>Luck:</b> The single most important node — +10 Luck per purchase compounds across every system.</li>
                    <li><b>Crit Chance:</b> +10% per node, stacks with the Luck-derived crit bonus.</li>
                    <li><b>All In (level-up):</b> +20% maximum damage potential — raises the ceiling of your dice rolls.</li>
                    <li><b>High Roller (level-up):</b> +10% crit chance per purchase.</li>
                </ul>
                <p><i>Tip: JACKPOT form (Level 10) forces Luck to 100 and ensures slot outcomes are always GOOD or better. Save your special for large enemy groups where JACKPOT damage hits everything at once.</i></p>

                <h3>New Biomes</h3>
                <p><b>The Temple:</b> A serene stone sanctuary filled with Spirit enemies. Narrow corridors reward Mantra pierce upgrades.</p>
                <p><b>The Madness:</b> A neon-lit, chaotic carnival where Chance enemies have randomized stats and unpredictable movement patterns.</p>
            `
        },
        sickness: {
            title: "Symphony of Sickness",
            html: `
                <h2>DLC: Symphony of Sickness</h2>
                <p>Two new heroes defined by timing, alchemy, and relentless attrition. Master the rhythm or brew the perfect poison — both demand patience and punish aggression.</p>

                <h3>New Hero: Sound — Light Blue 🎵</h3>
                <p>A rhythm fighter who rewards well-timed attacks with escalating power. Weak without setup; unstoppable when in Sync.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#4fc3f7;">Ritual of Resonance</div>
                    <p>Three <b>Resonance Totems</b> appear on the map each wave. Stand inside a totem's circle to capture it — enemies will contest your capture, turning it red. Capture all 3 to trigger a <b>Biome Transformation</b>, converting the current arena into the Sound Biome. This is required to use your Sync Meter.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#00e5ff;">Sync Meter &amp; Sync State</div>
                    <p>Once inside the Sound Biome, every <b>on-beat attack</b> fills your Sync Meter. The beat is indicated by a pulsing ring around your character. Fill the meter to 100 to enter <b>Sync State</b> — a 10-second window where your damage and speed are greatly amplified. The meter decays slowly when idle.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#4fc3f7;">Special: CRESCENDO</div>
                    <p>Releases an omnidirectional sound-wave burst that damages and applies a <b>Resonating</b> debuff to all nearby enemies. Simultaneously activates <b>Performer Form</b> for 10 seconds, during which your AoE pulses continuously. Cooldown: 15 seconds.</p>
                </div>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>Sync Cap:</b> Increases max Sync Meter size, giving more room to build before triggering Sync State.</li>
                    <li><b>Beat Window:</b> Widens the on-beat timing window, making it easier to land rhythmic hits.</li>
                </ul>
                <p><i>Tip: Upgrade the Metronome in the level-up shop to make on-beat attacks fire automatically.</i></p>

                <h3 style="margin-top:30px;">New Hero: Poison — Toxic Green ⚗️</h3>
                <p>An alchemist who trades raw damage for DoT build-up and flask chemistry. Direct damage is low — your power lies in layering effects and mixing the right brew.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#76ff03;">Poison Stacks &amp; DoT</div>
                    <p>Your gas clouds apply <b>Poison Stacks</b> to enemies. Each stack ticks for damage every 0.5 seconds. Stacks cap at 100 per enemy — the higher the stack count, the faster enemies melt. Stacks decay slowly over time if you stop applying them.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#76ff03;">Poison Flasks</div>
                    <p>Flasks spawn in the Poison Biome — collect up to 2 at a time. You hold a maximum of 2 flasks simultaneously. Flasks reset each wave, so plan your combination before using your special.</p>
                    <div class="tut-flask-grid">
                        <div class="tut-flask"><b style="color:#e74c3c;">🔴 RED</b>Vampiric Mist (Life Steal)</div>
                        <div class="tut-flask"><b style="color:#3498db;">🔵 BLUE</b>Liquid Nitrogen (Freeze)</div>
                        <div class="tut-flask"><b style="color:#2ecc71;">🟢 GREEN</b>Corrosive Sludge (Defense Down)</div>
                        <div class="tut-flask"><b style="color:#e74c3c;">🔴🔴</b>Blood Nova (Chain Reaction)</div>
                        <div class="tut-flask"><b style="color:#3498db;">🔵🔵</b>Absolute Zero (Time Stop)</div>
                        <div class="tut-flask"><b style="color:#2ecc71;">🟢🟢</b>Toxic Tsunami (Wave)</div>
                        <div class="tut-flask"><b style="color:#9b59b6;">🔵🔴</b>Hallucinogen (Confusion)</div>
                        <div class="tut-flask"><b style="color:#f39c12;">🟢🔴</b>Unstable Compound (Nuke)</div>
                        <div class="tut-flask"><b style="color:#1abc9c;">🔵🟢</b>Viral Outbreak (Epidemic)</div>
                    </div>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#76ff03;">Special: ALCHEMICAL MIX</div>
                    <p>Consumes your current flasks and triggers the matching effect above. With no flasks held, activates <b>Miasma Unleashed</b> — a Decay Field centered on you that continuously damages and poisons all enemies within range for several seconds. Cooldown: 10 seconds.</p>
                </div>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>DoT Duration:</b> Extends how long Poison stacks persist before decaying.</li>
                    <li><b>Attack Range:</b> Widens your gas cloud reach.</li>
                    <li><b>Potency:</b> Increases DoT damage per stack tick.</li>
                </ul>
                <p><i>Tip: "Venom Potency" level-up upgrades stack multiplicatively — prioritize them for late-wave scaling.</i></p>
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

            const wind = list.find(d => d.id === 'waker_of_winds');
            if (wind && wind.active) document.getElementById('btn-tutorial-wind').style.display = 'block';

            const thunder = list.find(d => d.id === 'tournament_of_thunder');
            if (thunder && thunder.active) document.getElementById('btn-tutorial-thunder').style.display = 'block';

            const champions = list.find(d => d.id === 'champions_of_chaos');
            if (champions && champions.active) document.getElementById('btn-tutorial-chaos').style.display = 'block';

            const faith = list.find(d => d.id === 'faith_of_fortune');
            if (faith && faith.active) document.getElementById('btn-tutorial-faith').style.display = 'block';

            const sickness = list.find(d => d.id === 'symphony_of_sickness');
            if (sickness && sickness.active) document.getElementById('btn-tutorial-sickness').style.display = 'block';
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

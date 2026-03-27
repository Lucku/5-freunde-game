const Manual = {
    state: {
        activeTab: 'basics',
        scrollOffset: 0
    },

    content: {
        basics: {
            title: "Basics & Controls",
            html: `
                <h2>Welcome to 5 Freunde</h2>
                <p>5 Freunde is a top-down arena survival game. You fight endless waves of enemies, earn XP and Gold, and grow stronger between waves through upgrades. Each run ends when your HP reaches zero — then your permanent progress (Void Shop, Collector Cards, Achievements) carries forward into the next.</p>

                <h3>Core Loop</h3>
                <div class="tut-card">
                    <div class="tut-card-title">Every Wave</div>
                    <p>Enemies spawn continuously until you kill enough to trigger the Boss. Defeat the Boss to end the wave. Every 4th wave a Shop opens — spend your run Gold on upgrades before continuing. Then the next wave begins in a new biome.</p>
                </div>

                <h3>Keyboard & Mouse Controls</h3>
                <div class="control-grid">
                    <div class="control-item"><b>WASD / Arrow Keys</b><span>Move</span></div>
                    <div class="control-item"><b>Mouse Cursor</b><span>Aim (ranged attacks track your cursor)</span></div>
                    <div class="control-item"><b>Left Click / Hold</b><span>Shoot — auto-fires on cooldown while held</span></div>
                    <div class="control-item"><b>Right Click</b><span>Melee Attack</span></div>
                    <div class="control-item"><b>Shift</b><span>Dash (3-second cooldown)</span></div>
                    <div class="control-item"><b>E</b><span>Special Ability</span></div>
                    <div class="control-item"><b>Esc / P</b><span>Pause</span></div>
                </div>

                <h3>Gamepad Controls</h3>
                <div class="control-grid">
                    <div class="control-item"><b>Left Stick</b><span>Move</span></div>
                    <div class="control-item"><b>Right Stick</b><span>Aim</span></div>
                    <div class="control-item"><b>RT / R2</b><span>Shoot</span></div>
                    <div class="control-item"><b>LT / LB</b><span>Melee Attack</span></div>
                    <div class="control-item"><b>A / Cross</b><span>Dash</span></div>
                    <div class="control-item"><b>Y / Triangle</b><span>Special Ability</span></div>
                    <div class="control-item"><b>Start / Options</b><span>Pause</span></div>
                </div>

                <h3>Dash</h3>
                <div class="tut-card">
                    <div class="tut-card-title">Invincibility Dash</div>
                    <p>Dash in the direction you are moving. During the dash you are <b>completely invincible</b> for a short window — use it to dodge boss attacks, projectiles, or explosions. Cooldown: <b>3 seconds</b>. The dash does not deal damage; it is a defensive repositioning tool only. Some Chaos modifiers disable dashing entirely.</p>
                </div>

                <h3>Ranged Attacks</h3>
                <p>Your ranged attack fires automatically on its cooldown timer as long as you hold the shoot button. Projectiles always travel toward your cursor. Cooldown speed varies by hero — Fire attacks slowly but hits hard; Water fires rapidly at lower damage. The "Haste" shop upgrade reduces ranged cooldown by 10% per purchase.</p>

                <h3>Melee Attacks</h3>
                <p>Melee deals significantly more damage than ranged but requires you to be in close range. Each hero has a distinct melee shape — a radial explosion (Fire), a knockback shockwave (Water), a piercing sweep (Ice), or a massive ground slam (Metal). Melee damage and area size both scale with skill tree upgrades and shop pickups.</p>

                <h3>Combo Multiplier</h3>
                <div class="tut-card">
                    <div class="tut-card-title">Kill Streak → Gold Bonus</div>
                    <p>Each enemy you kill increments your combo counter. If you go <b>4 seconds</b> without a kill, the combo resets to zero. Higher combos multiply your Gold income:</p>
                    <ul>
                        <li><b>25+ combo:</b> ×1.5 Gold per enemy</li>
                        <li><b>50+ combo:</b> ×2.0 Gold per enemy</li>
                    </ul>
                    <p>Chaining kills rapidly is the fastest way to farm Gold within a run.</p>
                </div>

                <h3>Critical Hits</h3>
                <p>All damage types (ranged, melee, special) can critically hit. Base crit chance is <b>5%</b> with a <b>1.5× damage multiplier</b>. Both values scale with the "Lethality" shop upgrade (+5% crit chance, +20% crit multiplier per purchase) and certain skill tree and Chaos reward nodes.</p>

                <h3>Damage Reduction</h3>
                <p>Incoming damage is reduced by your defense stat. Each point of defense lowers damage taken by 1%. The cap is <b>75% reduction</b> — no matter how tanky you build, at least 25% of incoming damage always goes through. Formula: <i>actual damage = incoming × (1 − reduction)</i>.</p>
            `
        },
        heroes: {
            title: "Elemental Heroes",
            html: `
                <h2>Choose Your Hero</h2>
                <p>Six elemental heroes are available from the start, each with distinct stats, a unique melee attack, a special ability, and an Ultimate transformation unlocked at level 10. Your hero determines your playstyle for the entire run.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#e74c3c;">🔥 Fire — Red</div>
                    <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★☆☆☆ &nbsp;<span style="color:#2ecc71;"><b>2/5 — Easy</b></span></p>
                    <p><b>Playstyle:</b> Balanced all-rounder. Solid speed, damage, and area attacks make Fire forgiving and effective at any wave.</p>
                    <ul>
                        <li><b>HP:</b> 60 &nbsp;|&nbsp; <b>Speed:</b> 4.0 &nbsp;|&nbsp; <b>Ranged Damage:</b> 25 &nbsp;|&nbsp; <b>Melee Damage:</b> 100</li>
                        <li><b>Melee — Flame Burst:</b> An AoE explosion centered on you (~80px radius). Deals heavy damage to anything nearby.</li>
                        <li><b>Special — INFERNO:</b> Fires 12 explosions in a ring (150px radius) around you, each dealing 50 damage. Cooldown: 15s. Excellent for clearing clustered groups.</li>
                        <li><b>Ultimate — LAVA Form:</b> At level 10, entering LAVA mode boosts all damage and surrounds you with a smoldering aura. Lasts until you take a hit.</li>
                        <li><b>Skill Tree Focus:</b> Explosion Chance (30%), Damage (25%), Cooldown reduction (15%)</li>
                    </ul>
                    <p><i>Tip: The "Ram Damage" and "Explosion Chance" upgrades stack — late game you detonate on almost every shot.</i></p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#3498db;">💧 Water — Blue</div>
                    <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★☆☆☆ &nbsp;<span style="color:#2ecc71;"><b>2/5 — Easy</b></span></p>
                    <p><b>Playstyle:</b> Crowd control specialist. The fastest base hero. Keeps enemies at bay with high knockback; trades burst damage for sustained harassment.</p>
                    <ul>
                        <li><b>HP:</b> 60 &nbsp;|&nbsp; <b>Speed:</b> 4.5 (fastest base) &nbsp;|&nbsp; <b>Ranged Damage:</b> 12 &nbsp;|&nbsp; <b>Melee Damage:</b> 80</li>
                        <li><b>Melee — Surge:</b> A knockback shockwave that blasts all nearby enemies away. Lower damage but massive repositioning potential.</li>
                        <li><b>Special — TIDAL WAVE:</b> Detonates a push-explosion, launching all enemies outward with 200px of force and dealing 20 damage each. Cooldown: 10s. Great for escaping surrounded situations.</li>
                        <li><b>Ultimate — OCEAN Form:</b> At level 10, movement and knockback are dramatically amplified for the duration.</li>
                        <li><b>Skill Tree Focus:</b> Knockback (30%), Cooldown reduction (30%), Speed (20%)</li>
                    </ul>
                    <p><i>Tip: Speed + Knockback upgrades make you nearly untouchable — keep enemies perpetually staggered while peppering them with rapid ranged fire.</i></p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ecf0f1;">❄️ Ice — White</div>
                    <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★☆☆ &nbsp;<span style="color:#f1c40f;"><b>3/5 — Medium</b></span></p>
                    <p><b>Playstyle:</b> Control and burst. Slower attack speed, but piercing projectiles and Freeze let you line up devastating combos against immobilised enemies.</p>
                    <ul>
                        <li><b>HP:</b> 50 (lowest base) &nbsp;|&nbsp; <b>Speed:</b> 4.0 &nbsp;|&nbsp; <b>Ranged Damage:</b> 15 &nbsp;|&nbsp; <b>Melee Damage:</b> 90</li>
                        <li><b>Melee — Ice Spike:</b> A piercing melee strike that passes through multiple enemies in a line. Upgrade Pierce in the skill tree to hit entire rows.</li>
                        <li><b>Special — DEEP FREEZE:</b> Instantly freezes all enemies on screen for 3–4.5 seconds (scales with upgrades). Cooldown: 20s. While enemies are frozen, your melee deals massive bonus damage.</li>
                        <li><b>Ultimate — BLACK ICE Form:</b> At level 10, all attacks apply a slow effect and the Freeze duration is doubled for the transformation window.</li>
                        <li><b>Skill Tree Focus:</b> Pierce (30%), Damage (20%), Health (15%), Cooldown reduction (15%)</li>
                    </ul>
                    <p><i>Tip: Use DEEP FREEZE then immediately melee into the frozen crowd — Ice's melee pierces through frozen rows for enormous burst damage.</i></p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#2ecc71;">🌿 Plant — Green</div>
                    <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★☆☆ &nbsp;<span style="color:#f1c40f;"><b>3/5 — Medium</b></span></p>
                    <p><b>Playstyle:</b> Sustain tank. Highest melee damage and health. Excels at holding ground and recovering from bad situations via healing.</p>
                    <ul>
                        <li><b>HP:</b> 70 (highest base) &nbsp;|&nbsp; <b>Speed:</b> 3.5 (slower) &nbsp;|&nbsp; <b>Ranged Damage:</b> 10 &nbsp;|&nbsp; <b>Melee Damage:</b> 120 (2nd highest)</li>
                        <li><b>Melee — Root Slam:</b> A heavy downward slam that hits in a wide arc. Slow but devastating up close. Can split into multiple projectiles at higher skill tree investment.</li>
                        <li><b>Special — OVERGROWTH:</b> Heals you for 30% of your max HP and spawns supportive turrets around you that assist in clearing enemies. Cooldown: 30s (longest of all heroes). Save it for emergencies.</li>
                        <li><b>Ultimate — CREEPER Form:</b> At level 10, melee reach and the healing radius of OVERGROWTH are both significantly extended.</li>
                        <li><b>Skill Tree Focus:</b> Health (30%), Split projectiles (25%), Ultimate Damage (20%), Cooldown reduction (15%)</li>
                    </ul>
                    <p><i>Tip: Plant's 30s special cooldown is steep — invest in Cooldown reduction early so OVERGROWTH is available more than once per boss fight.</i></p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#95a5a6;">⚙️ Metal — Grey</div>
                    <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★☆☆ &nbsp;<span style="color:#f1c40f;"><b>3/5 — Medium</b></span></p>
                    <p><b>Playstyle:</b> Juggernaut. The slowest, toughest, hardest-hitting hero in the base roster. A high-risk, high-reward brawler built entirely around getting close.</p>
                    <ul>
                        <li><b>HP:</b> 100 (highest of all heroes) &nbsp;|&nbsp; <b>Speed:</b> 3.0 (slowest) &nbsp;|&nbsp; <b>Ranged Damage:</b> 40 &nbsp;|&nbsp; <b>Melee Damage:</b> 150 (highest base)</li>
                        <li><b>Ranged Attack Cooldown:</b> 40 frames — attacks very infrequently at range, rewarding melee play.</li>
                        <li><b>Melee — Ground Slam:</b> Massive AoE slam (80px base radius, expandable via "Melee Size" skill tree nodes). Devastates anything nearby.</li>
                        <li><b>Special — IRON WILL:</b> Activates a defensive barrier that boosts your armor and damage reduction for its duration. Cooldown: 20s. Use it during boss phases or when you can't avoid hits.</li>
                        <li><b>Ultimate — IRON Form:</b> At level 10, damage reduction and melee hit area both increase dramatically. You become a near-indestructible wrecking ball.</li>
                        <li><b>Skill Tree Focus:</b> Armor (30%), Health (25%), Melee Area (25%), Damage (10%)</li>
                    </ul>
                    <p><i>Tip: Metal is the only hero where going directly into the boss and meleeing is consistently correct. Your HP pool and armor absorb hits that would one-shot other heroes.</i></p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#888;">☯️ Shadow — Black</div>
                    <p><b>Playstyle:</b> Unlockable secret hero. Dominant across all stat categories — but earning this hero requires progression or completing Daily Challenge runs.</p>
                    <ul>
                        <li><b>HP:</b> 150 &nbsp;|&nbsp; <b>Speed:</b> 5.0 &nbsp;|&nbsp; <b>Ranged Damage:</b> 50 &nbsp;|&nbsp; <b>Melee Damage:</b> 200</li>
                        <li><b>Attack Rate:</b> Fastest of all heroes (ranged cooldown 10 frames, melee cooldown 80 frames)</li>
                        <li><b>Special — VOID ERUPTION:</b> Creates void explosions in a wide area dealing massive damage. Cooldown: 15s.</li>
                        <li><b>Ultimate — THE SHADOW:</b> At level 10, void attacks are further amplified and the ultimate aura extends further.</li>
                        <li><b>Skill Tree Focus:</b> 100% Damage nodes — straightforward max-damage build.</li>
                    </ul>
                    <p><i>Shadow's stats are intentionally excessive — it is a reward hero for players who have cleared the base game's progression milestones.</i></p>
                </div>

                <h3>Stat Summary</h3>
                <div class="control-grid">
                    <div class="control-item"><b style="color:#e74c3c">Fire</b><span>60 HP · 4.0 spd · 25 dmg</span></div>
                    <div class="control-item"><b style="color:#3498db">Water</b><span>60 HP · 4.5 spd · 12 dmg</span></div>
                    <div class="control-item"><b style="color:#ecf0f1">Ice</b><span>50 HP · 4.0 spd · 15 dmg</span></div>
                    <div class="control-item"><b style="color:#2ecc71">Plant</b><span>70 HP · 3.5 spd · 10 dmg</span></div>
                    <div class="control-item"><b style="color:#95a5a6">Metal</b><span>100 HP · 3.0 spd · 40 dmg</span></div>
                    <div class="control-item"><b style="color:#888">Shadow</b><span>150 HP · 5.0 spd · 50 dmg</span></div>
                </div>
            `
        },
        modes: {
            title: "Game Modes",
            html: `
                <h2>Ways to Play</h2>

                <div class="tut-card">
                    <div class="tut-card-title">Standard Mode</div>
                    <p>The core survival experience. Waves of enemies scale in difficulty indefinitely. Every 4th wave, a Shop opens — spend run Gold on upgrades before continuing. There is no finish line: survive as long as possible and climb the score.</p>
                    <ul>
                        <li><b>30 enemies</b> must be killed per wave to trigger the Boss.</li>
                        <li>The biome changes randomly each wave.</li>
                        <li>Enemy HP and speed increase with each wave (see Enemy Types tab for scaling formulas).</li>
                        <li>Boss type is randomised from the pool of 6 boss variants.</li>
                        <li>Story events can be toggled on or off from the pause menu — when on, special encounters and dialogue activate at key waves.</li>
                    </ul>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Story Mode</div>
                    <p>The full narrative campaign of the 5 Freunde. Story Mode adds structured events, unique boss encounters, and companion mechanics on top of Standard survival gameplay.</p>
                    <ul>
                        <li><b>Companion System:</b> Allied heroes can join and fight alongside you. Pairings: Fire/Ice, Plant/Metal, Water/Plant.</li>
                        <li><b>Wave 50 — Makuta (First Form):</b> 2× HP, 1.5× damage, 1.2× speed. Radius 80px.</li>
                        <li><b>Wave 100 — Makuta (True Form):</b> 5× HP, 2.5× damage, 1.5× speed. The ultimate challenge of a Story run.</li>
                        <li><b>Objectives:</b> Some waves include special objectives — defend a sapling, maintain a kill combo, stay inside a moving eye-of-the-storm zone, and more.</li>
                        <li>Story events and chapter progress are saved automatically. Completing Story Mode at your current Prestige rank unlocks the next Prestige tier.</li>
                    </ul>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Daily Challenge</div>
                    <p>A seeded run that resets every day at midnight UTC. Every player in the world plays the exact same conditions: same enemy spawn order, same mutators, same biomes.</p>
                    <ul>
                        <li><b>Mutators:</b> 2–3 random mutators are applied automatically (see below).</li>
                        <li><b>Fixed hero:</b> Hero selection is locked at run start — choose carefully.</li>
                        <li><b>Reward:</b> 1 Chaos Shard on completion.</li>
                        <li>Results contribute to lifetime Daily Challenge achievement tracking.</li>
                    </ul>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Weekly Challenge</div>
                    <p>Like Daily, but harder and longer. Seed resets every Monday. Features 3–5 mutators and steeper enemy scaling.</p>
                    <ul>
                        <li><b>Reward:</b> 5 Chaos Shards on completion — the best source of shards in the game.</li>
                        <li>Weekly wins are tracked separately for achievement purposes.</li>
                    </ul>
                </div>

                <h3>Mutators</h3>
                <p>Mutators are applied automatically in Daily and Weekly Challenges. They alter the rules of a run and cannot be removed mid-run.</p>
                <div class="control-grid">
                    <div class="control-item"><b>Tiny Arena</b><span>Arena 50% smaller — enemies close in fast</span></div>
                    <div class="control-item"><b>Explosive</b><span>All enemies explode on death</span></div>
                    <div class="control-item"><b>Slug</b><span>Your speed −50%, damage +200%</span></div>
                    <div class="control-item"><b>Fog of War</b><span>Enemies invisible until close range</span></div>
                    <div class="control-item"><b>Giants</b><span>2× enemy HP and size, 50% spawn rate</span></div>
                    <div class="control-item"><b>Swarm</b><span>50% enemy HP and size, 2× spawn rate</span></div>
                    <div class="control-item"><b>Fragile</b><span>Your HP capped at 1, but damage ×5</span></div>
                    <div class="control-item"><b>No Regen</b><span>Health pickups do not spawn</span></div>
                    <div class="control-item"><b>Windy</b><span>Strong winds push you around constantly</span></div>
                    <div class="control-item"><b>One Type</b><span>Only a single random enemy type spawns</span></div>
                    <div class="control-item"><b>Melee Only</b><span>Ranged attacks disabled</span></div>
                    <div class="control-item"><b>No Dash</b><span>Dashing completely disabled</span></div>
                    <div class="control-item"><b>Double Boss</b><span>Two bosses spawn simultaneously</span></div>
                    <div class="control-item"><b>Fast Enemies</b><span>All enemies move 50% faster</span></div>
                    <div class="control-item"><b>Shadow Form</b><span>Forces Hero of Darkness regardless of selection</span></div>
                    <div class="control-item"><b>Low Visibility</b><span>Your visible light radius is reduced</span></div>
                </div>
            `
        },
        prestige: {
            title: "Prestige & Hard Mode",
            html: `
                <h2>Pushing the Limits</h2>

                <h3>Prestige</h3>
                <div class="tut-card">
                    <div class="tut-card-title">How to Prestige</div>
                    <p>Each hero can be Prestiged independently. To unlock Prestige 1 for a hero, you must first <b>complete a Story Mode run</b> (reach Wave 50) at Prestige 0. Each further Prestige rank requires beating Story Mode at the current rank before advancing. The Prestige button appears in the Skill Tree screen once all conditions are met.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">What Resets on Prestige</div>
                    <ul>
                        <li><b>Skill Tree:</b> All unlocked nodes reset to 0. You re-earn them through levelling up again.</li>
                        <li><b>Prestige counter</b> increments by 1 for that hero.</li>
                        <li>The current run ends immediately.</li>
                    </ul>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">What Persists Across Prestige</div>
                    <ul>
                        <li>Total Gold collected (Void Shop eligibility)</li>
                        <li>Lifetime stats (kills, bosses defeated, damage dealt)</li>
                        <li>All Achievements unlocked</li>
                        <li>Altar of Mastery rune progress</li>
                        <li>All Void Shop purchases</li>
                        <li>Collector Cards</li>
                    </ul>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Difficulty Scaling per Prestige</div>
                    <p>Prestige makes every run harder for that hero. Enemy and boss HP scale by the following formula:</p>
                    <p style="text-align:center;font-size:13px;margin:8px 0;"><b>HP multiplier = 1 + (Prestige Rank × 0.5)</b></p>
                    <ul>
                        <li>Prestige 1: enemies have 1.5× HP</li>
                        <li>Prestige 2: enemies have 2.0× HP</li>
                        <li>Prestige 3: enemies have 2.5× HP</li>
                    </ul>
                    <p>Boss HP and spawn scaling follow the same formula. There is no Gold or XP bonus for higher Prestige — the reward is the Altar of Mastery progression it unlocks.</p>
                </div>

                <h3>Altar of Mastery</h3>
                <div class="tut-card">
                    <div class="tut-card-title">Unlock Condition</div>
                    <p>The Altar of Mastery unlocks permanently once any hero reaches <b>Prestige 1</b>. It is a separate progression layer that lets you apply powerful passive rune buffs to specific hero abilities. Rune tiers unlock with further Prestige rank — higher tiers grant stronger effects like cooldown reduction, radius boosts, and special mechanics (projectile reflection, shatter damage, viral spread). Rune selection requires no Gold; it is purely Prestige-gated.</p>
                </div>
            `
        },
        progression: {
            title: "Progression",
            html: `
                <h2>Power Up</h2>
                <p>5 Freunde has four distinct progression layers: in-run upgrades (Level-Up Shop), permanent hero progression (Skill Tree), permanent meta upgrades (Void Shop), and advanced ability modifiers (Altar of Mastery).</p>

                <h3>XP & Levelling</h3>
                <div class="tut-card">
                    <div class="tut-card-title">XP Sources & Level Scaling</div>
                    <ul>
                        <li>Normal enemies: <b>10 XP</b> each</li>
                        <li>Elite enemies: <b>50 XP</b> each</li>
                        <li>XP required to level up starts at 100 and multiplies by <b>1.2× per level</b> (100 → 120 → 144 → …)</li>
                        <li>Each level-up shows 2 upgrade choices. Every 10th level offers an Ultimate Form transformation instead.</li>
                    </ul>
                </div>

                <h3>Level-Up Shop (In-Run Upgrades)</h3>
                <p>On every level-up, pick one of two randomly offered upgrades. These apply immediately and last for the current run only.</p>
                <div class="control-grid">
                    <div class="control-item"><b>Vitality</b><span>+25 Max HP, restore 20% HP now</span></div>
                    <div class="control-item"><b>Blast Radius</b><span>+25% Melee AoE size</span></div>
                    <div class="control-item"><b>Multishot</b><span>+1 additional projectile</span></div>
                    <div class="control-item"><b>Swiftness</b><span>+10% Movement Speed</span></div>
                    <div class="control-item"><b>Haste</b><span>−10% Ranged Attack cooldown</span></div>
                    <div class="control-item"><b>Iron Skin</b><span>−5% Incoming Damage</span></div>
                    <div class="control-item"><b>Power</b><span>+10% All Damage</span></div>
                    <div class="control-item"><b>Lethality</b><span>+5% Crit Chance, +20% Crit Damage</span></div>
                    <div class="control-item"><b>Fortune</b><span>Increases rare drop chances</span></div>
                </div>
                <p>At every 10th level, you are offered <b>Ultimate Form</b> as one of your choices — entering it transforms your hero and grants a powerful temporary state that lasts until you take a hit.</p>

                <h3>Between-Wave Shop (Every 4th Wave)</h3>
                <p>After completing every 4th wave, the Shop opens. Spend the Gold you earned that run on the same upgrade pool listed above. Upgrades stack — buying Haste twice reduces cooldown by 20%.</p>

                <h3>Skill Tree (Permanent, Per Hero)</h3>
                <div class="tut-card">
                    <div class="tut-card-title">100 Nodes — Permanent Hero Growth</div>
                    <p>Each hero has its own 100-node skill tree. Nodes are earned by spending Skill Points, which are granted by levelling up. The tree resets on Prestige, allowing you to re-invest points into the same or a different build. Every 10th node is a <b>Major Node</b> with 5× the normal effect.</p>
                    <p>Node types available (hero-specific weightings determine how often each appears):</p>
                    <div class="control-grid">
                        <div class="control-item"><b>Damage</b><span>+2% all damage</span></div>
                        <div class="control-item"><b>Health</b><span>+2% max HP</span></div>
                        <div class="control-item"><b>Speed</b><span>+1% movement speed</span></div>
                        <div class="control-item"><b>Cooldown</b><span>−1% attack cooldown</span></div>
                        <div class="control-item"><b>Armor</b><span>+1% damage reduction</span></div>
                        <div class="control-item"><b>Pierce</b><span>+1 piercing target (Ice)</span></div>
                        <div class="control-item"><b>Split</b><span>+1 projectile, −20% damage (Plant)</span></div>
                        <div class="control-item"><b>Explode Chance</b><span>+5% shot explosion chance (Fire)</span></div>
                        <div class="control-item"><b>Knockback</b><span>+5% push force (Water)</span></div>
                        <div class="control-item"><b>Melee Size</b><span>+5% melee AoE radius (Metal)</span></div>
                        <div class="control-item"><b>Ult Damage</b><span>+5% Ultimate Form damage</span></div>
                        <div class="control-item"><b>Ult Speed</b><span>+5% speed during Ultimate Form</span></div>
                    </div>
                </div>

                <h3>Void Shop (Permanent Meta Upgrades)</h3>
                <div class="tut-card">
                    <div class="tut-card-title">Spend Lifetime Gold — Applies to All Heroes</div>
                    <p>The Void Shop uses your <b>total Gold ever accumulated</b> across all runs. Purchases apply to every hero permanently. Each upgrade has an exponentially increasing cost — buy early and often. Prices never reset.</p>
                    <div class="control-grid">
                        <div class="control-item"><b>Void Heart</b><span>+5 starting HP · starts 1,000g · ×1.2/purchase</span></div>
                        <div class="control-item"><b>Void Coin</b><span>+5% Gold gain · starts 2,000g · ×1.3/purchase</span></div>
                        <div class="control-item"><b>Void Strength</b><span>+1% all damage · starts 5,000g · ×1.4/purchase</span></div>
                        <div class="control-item"><b>Void Step</b><span>+1% speed · starts 3,000g · ×1.3/purchase</span></div>
                        <div class="control-item"><b>Void Shell</b><span>+1% damage reduction · starts 4,000g · ×1.5/purchase</span></div>
                        <div class="control-item"><b>Void Mind</b><span>+2% XP gain · starts 2,500g · ×1.3/purchase</span></div>
                    </div>
                    <p><i>Tip: Void Coin is the highest-priority early purchase — more Gold income compounds into faster Void Shop progress on every future run.</i></p>
                </div>

                <h3>Altar of Mastery (Ability Runes)</h3>
                <p>Unlocked at Prestige 1. Lets you apply powerful rune modifiers to your hero's specific abilities — cooldown reductions, radius increases, new secondary effects (e.g., reflected projectiles, freeze on melee, viral spread on special). Rune tiers I, II, and III unlock at higher Prestige ranks. See the Prestige & Hard Mode tab for unlock details.</p>
            `
        },
        museum: {
            title: "Museum & Collection",
            html: `
                <h2>The Museum</h2>
                <p>The Museum is a physical space you can freely explore between runs. It spans a 2400×2200 world with seven themed rooms — one per element — plus a central Gallery and a Creature Wing. Your selected hero navigates the museum directly using the same movement controls as in-game.</p>

                <h3>Museum Rooms</h3>
                <div class="control-grid">
                    <div class="control-item"><b>🔥 Fire Room</b><span>Blazing braziers, fire trophies</span></div>
                    <div class="control-item"><b>💧 Water Room</b><span>Fountains, tidal decorations</span></div>
                    <div class="control-item"><b>❄️ Ice Room</b><span>Mirrors, frozen exhibits</span></div>
                    <div class="control-item"><b>🌿 Plant Room</b><span>Vines, nature dioramas</span></div>
                    <div class="control-item"><b>⚙️ Metal Room</b><span>Workbenches, industrial displays</span></div>
                    <div class="control-item"><b>🏛️ Gallery</b><span>Central hub — all defeated enemy types</span></div>
                    <div class="control-item"><b>🔒 Creature Wing</b><span>Rare and elite enemy exhibits</span></div>
                </div>
                <p>NPCs in each room offer hero-specific flavour dialogue. New exhibits appear as you unlock heroes and collect Collector Cards.</p>

                <h2>Collector Cards</h2>
                <p>Every enemy type has four collectible cards — Bronze, Silver, Gold, and Platinum. Cards drop randomly when you defeat that enemy. Collecting a card grants a <b>permanent, stackable bonus</b> against that enemy type across all future runs.</p>

                <h3>Card Tiers & Drop Rates</h3>
                <div class="tut-card">
                    <div class="tut-card-title" style="color:#cd7f32;">Bronze Card — 0.5% drop rate</div>
                    <p><b>+10% Damage dealt</b> to this specific enemy type. The most common card and the starting bonus for mastery.</p>
                </div>
                <div class="tut-card">
                    <div class="tut-card-title" style="color:#c0c0c0;">Silver Card — 0.25% drop rate</div>
                    <p><b>−10% Damage taken</b> from this specific enemy type. Particularly valuable for Shooters, Snipers, and Bombers that threaten you from range.</p>
                </div>
                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ffd700;">Gold Card — 0.10% drop rate</div>
                    <p><b>+20% XP gained</b> from this specific enemy type. Stack multiple Gold Cards to dramatically accelerate levelling in waves where that type is common.</p>
                </div>
                <div class="tut-card">
                    <div class="tut-card-title" style="color:#e5e4e2;">Platinum Card — 0.05% drop rate</div>
                    <p>A <b>unique special effect</b> per enemy type. Examples:</p>
                    <ul>
                        <li>Ghost card: Ghosts are always visible (removes the stealth mechanic)</li>
                        <li>Toxic card: Immune to poison trails left by Toxic enemies</li>
                        <li>Bomber card: Explosion radius reduced by 20%</li>
                        <li>Summoner card: Summoned minion HP reduced by 50%</li>
                    </ul>
                    <p>Platinum Cards are rare enough that collecting one is a meaningful milestone. Multiple copies of a card stack their bonuses.</p>
                </div>

                <h3>Enemy Types with Cards</h3>
                <p>Cards exist for every enemy type including all elites: Basic, Shooter, Brute, Speedster, Swarm, Summoner, Ghost, Sniper, Bomber, Toxic, Shielder — plus the elite variants Commander, Mender, Volatile, and Juggernaut. See the Enemy Types tab for full details on each.</p>
                <p><i>Tip: Farm cards deliberately by choosing waves where a specific enemy type dominates. The Void Shop's "Fortune" upgrades can slightly increase card drop rates.</i></p>
            `
        },
        chaos: {
            title: "Chaos System",
            html: `
                <h2>Risk vs Reward</h2>
                <p>The Chaos System lets you voluntarily handicap your runs in exchange for permanent Gold bonuses. The harder you make the game for yourself, the more Gold every enemy drops. Chaos is entirely opt-in — you choose which effects to enable before starting a run.</p>

                <h3>Chaos Shards</h3>
                <p>Chaos Shards are the currency used to <b>permanently unlock</b> individual Chaos Effects. Once unlocked, an effect can be toggled on or off for free before any run. Sources:</p>
                <ul>
                    <li>Daily Challenge completion: <b>1 Shard</b></li>
                    <li>Weekly Challenge completion: <b>5 Shards</b></li>
                </ul>

                <h3>Chaos Effects</h3>
                <p>Each effect has an unlock cost (in Shards) and a Gold bonus it adds to your multiplier while active. Effects stack — running four active effects combines all four bonuses and all four handicaps simultaneously.</p>
                <div class="control-grid">
                    <div class="control-item"><b>Inverted Controls</b><span>Cost 5 · +50% Gold · Movement reversed</span></div>
                    <div class="control-item"><b>Slippery</b><span>Cost 3 · +20% Gold · Zero friction movement</span></div>
                    <div class="control-item"><b>Giant Enemies</b><span>Cost 5 · +30% Gold · Enemies 2× size and HP</span></div>
                    <div class="control-item"><b>Tiny Player</b><span>Cost 4 · +25% Gold · You take 200% damage</span></div>
                    <div class="control-item"><b>Explosive Steps</b><span>Cost 8 · +40% Gold · Your movement spawns explosions</span></div>
                    <div class="control-item"><b>Drunk Camera</b><span>Cost 2 · +15% Gold · Camera constantly rotates</span></div>
                    <div class="control-item"><b>Speed Demon</b><span>Cost 6 · +30% Gold · Game runs at 1.5× speed</span></div>
                    <div class="control-item"><b>Ghost Town</b><span>Cost 3 · +20% Gold · Enemies partially transparent</span></div>
                    <div class="control-item"><b>Melee Only</b><span>Cost 5 · +40% Gold · Ranged attacks disabled</span></div>
                </div>
                <p style="color:#e74c3c"><b>Warning:</b> Effects stack — running Inverted Controls + Speed Demon + Tiny Player simultaneously is lethal unless you are extremely experienced. Start with one low-cost effect and build up.</p>

                <h3>Chaos Objectives</h3>
                <p>In certain Chaos modes, waves include a timed <b>Chaos Objective</b> — a challenge that, if completed, grants an immediate reward bonus for that wave.</p>
                <div class="control-grid">
                    <div class="control-item"><b>Survive</b><span>Take zero hits for one full wave</span></div>
                    <div class="control-item"><b>Kill Fast</b><span>Kill 20 enemies within 10 seconds</span></div>
                    <div class="control-item"><b>Pacifist</b><span>Do not attack for 10 consecutive seconds</span></div>
                    <div class="control-item"><b>No Heal</b><span>Do not pick up any health drops for one wave</span></div>
                    <div class="control-item"><b>Don't Move</b><span>Stand still for 10 cumulative seconds</span></div>
                    <div class="control-item"><b>Collect Gold</b><span>Pick up 50 Gold within 30 seconds</span></div>
                    <div class="control-item"><b>Dash Maniac</b><span>Dash 10 times within 20 seconds</span></div>
                    <div class="control-item"><b>No Dash</b><span>Do not dash for the entire wave</span></div>
                    <div class="control-item"><b>Melee Kills</b><span>Land 10 melee kills within 30 seconds</span></div>
                    <div class="control-item"><b>Ranged Kills</b><span>Land 15 ranged kills within 30 seconds</span></div>
                    <div class="control-item"><b>No Special</b><span>Do not use your special ability for the wave</span></div>
                </div>

                <h3>Objective Rewards</h3>
                <p>Completing a Chaos Objective grants one of the following bonuses for the remainder of the run:</p>
                <div class="control-grid">
                    <div class="control-item"><b>+10% Damage</b><span></span></div>
                    <div class="control-item"><b>+25 HP</b><span></span></div>
                    <div class="control-item"><b>+10% Speed</b><span></span></div>
                    <div class="control-item"><b>+5% Defense</b><span></span></div>
                    <div class="control-item"><b>+20% Gold</b><span></span></div>
                    <div class="control-item"><b>+10% Luck</b><span></span></div>
                    <div class="control-item"><b>+15% XP</b><span></span></div>
                    <div class="control-item"><b>−5% Cooldown</b><span></span></div>
                    <div class="control-item"><b>+15% AoE Area</b><span></span></div>
                    <div class="control-item"><b>+5% Crit Chance</b><span></span></div>
                </div>
            `
        },
        enemies: {
            title: "Enemy Types",
            html: `
                <h2>Know Your Enemies</h2>
                <p>Enemies spawn in waves of 30. Type variety expands as waves progress — early waves are mostly Basic enemies; later waves mix in every type including dangerous elites. All enemies scale in HP and speed per wave.</p>

                <h3>Scaling Formula</h3>
                <div class="tut-card">
                    <div class="tut-card-title">Enemy Stat Scaling</div>
                    <p><b>HP</b> = (25–50 base) × (1 + wave × 0.35) × (1 + prestige × 0.5)</p>
                    <p><b>Speed</b> = (1–2.5 base) × (1 + wave × 0.025)</p>
                    <p><b>Boss HP</b> = 1,500 × wave × type modifier × prestige modifier</p>
                    <p>At wave 10, a Basic enemy has roughly 3× its starting HP. At wave 30 it has over 10×. Plan your damage upgrades accordingly.</p>
                </div>

                <h3>Base Enemy Types</h3>

                <div class="tut-card">
                    <div class="tut-card-title">Basic</div>
                    <p>The standard melee enemy. Moves directly toward you and deals contact damage. Spawns from wave 1. The most common enemy throughout the game — never underestimate them in large groups.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Shooter</div>
                    <p>Keeps distance and fires projectiles at you on a cooldown. Prioritise these over Basic enemies — their ranged fire can chip through your HP while you are occupied with melee threats.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Brute</div>
                    <p>High HP, high contact damage, lower speed. Tanky frontliners that absorb a lot of punishment before going down. Excellent targets for melee combos once they are slowed or frozen.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Speedster — unlocks wave 3</div>
                    <p>Low HP but very fast movement. Rushes you from range and closes the gap before you can react. Use AoE attacks or knockback to keep them controlled. Water hero's knockback trivialises this type.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Swarm — unlocks wave 1</div>
                    <p>Small, low-HP enemies that arrive in large numbers. Individually harmless; collectively dangerous due to contact damage stacking. Explosion-chance upgrades and wide melee attacks excel here.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Summoner</div>
                    <p>Periodically spawns minion enemies. Left alive, a Summoner can flood the arena within seconds. Always kill Summoners before clearing normal enemies — their minions do not count toward the wave kill threshold.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Ghost — unlocks wave 6</div>
                    <p>Partially invisible — you can only see a faint outline unless you have the Ghost Platinum Collector Card, which makes them always visible. Moves through normal pathing restrictions. Stay near the centre to give yourself room to react.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Sniper — unlocks wave 10</div>
                    <p>Long-range, high-damage projectile attacks with a brief wind-up telegraph. Deals the highest single-hit ranged damage of all base enemies. Keep moving between shots — standing still makes you an easy target.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Bomber — unlocks wave 8</div>
                    <p>Explodes on death, dealing AoE damage to anything nearby — including other enemies. Do not melee a Bomber at close range unless you have high HP or the Bomber Platinum Card (reduces explosion radius by 20%). Use ranged attacks to detonate them safely.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Toxic — unlocks wave 4</div>
                    <p>Leaves poison trails and gas clouds on the ground as it moves. Walking through these zones deals ongoing damage. The Toxic Platinum Collector Card grants immunity to these trails.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title">Shielder — unlocks wave 12</div>
                    <p>Projects a protective aura around nearby allies, reducing the damage they take. Always kill the Shielder first when one is present — your damage to shielded enemies is dramatically reduced until the Shielder goes down.</p>
                </div>

                <h3>Elite Enemies — unlocks wave 50+</h3>
                <p>After wave 50, any non-boss enemy has a <b>5% chance</b> to spawn as an Elite variant with 3× HP, 1.2× size, and a powerful aura ability. Elites drop <b>50 XP</b> instead of the standard 10.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#e74c3c;">Commander (Speed Aura)</div>
                    <p>Grants nearby enemies increased movement speed. Prioritise over regular enemies — letting a Commander live accelerates every enemy in its radius.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#2ecc71;">Mender (Heal Aura)</div>
                    <p>Continuously regenerates HP for all nearby enemies. Can undo your damage output if left alive. The Mender Collector Card reduces its healing effectiveness by 50%.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#f39c12;">Volatile (Exploder)</div>
                    <p>Moves 1.3× faster than the base enemy and explodes on death for massive AoE damage — more than a standard Bomber. Treat it as a high-priority ranged target. The Volatile Collector Card reduces explosion radius by 20%.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#95a5a6;">Juggernaut (Tank)</div>
                    <p>2× HP on top of the Elite 3× multiplier (total 6× base HP), 0.7× speed. An extremely durable slow bruiser. The Juggernaut Collector Card reduces its total HP by 10%.</p>
                </div>

                <h3>Bosses</h3>
                <p>A Boss spawns at the end of each wave once enough enemies have been killed. Boss type is selected randomly from the pool below. Boss HP scales with wave number and your Prestige rank.</p>
                <div class="control-grid">
                    <div class="control-item"><b>Tank</b><span>1.5× HP · 0.5× speed · Phase 2: speed doubles</span></div>
                    <div class="control-item"><b>Speedster</b><span>0.7× HP · 1.5× speed · Hardest to hit</span></div>
                    <div class="control-item"><b>Nova</b><span>0.8× HP · Very slow · Creates radial explosions</span></div>
                    <div class="control-item"><b>Summoner</b><span>Normal HP · Phase 2: becomes immune; kill 5 minions first</span></div>
                    <div class="control-item"><b>Rhino</b><span>1.2× HP · Charges in straight lines</span></div>
                    <div class="control-item"><b>Hydra</b><span>Normal HP · Multi-hit attack patterns</span></div>
                </div>
                <p><b>Makuta</b> is the Story Mode boss encountered at Wave 50 and Wave 100. At Wave 50: 2× HP, 1.5× damage, 1.2× speed. At Wave 100: 5× HP, 2.5× damage, 1.5× speed — the hardest encounter in the base game.</p>
            `
        },
        rock: {
            title: "Rise of the Rock",
            html: `
                <h2>DLC: Rise of the Rock</h2>
                <p>Harness the raw force of the earth itself. The Earth Hero is a versatile fighter who can unleash his true power by transforming into a rolling boulder — a slow, unstoppable juggernaut that grows more dangerous the longer it stays on course.</p>

                <h3>New Hero: Earth — Brown 🪨</h3>
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★★ &nbsp;<span style="color:#e74c3c;"><b>5/5 — Very Hard</b></span></p>
                <p>A two-mode brawler: walk and shoot like any other hero, or press <b>Dash</b> to enter Rolling Mode and become a momentum-fueled wrecking ball. Press Dash again to exit. Mastery means knowing when to roll and when to hold back.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#a1887f;">Rolling Mode (Dash to Toggle)</div>
                    <p>Press <b>Dash</b> to enter or exit Rolling Mode at any time. While rolling, movement becomes momentum-based: Momentum builds each frame you travel in a straight cardinal direction and decays when you stand still. Sharp turns are heavily punished — a full 180° reversal resets it entirely; a 90° turn cuts it in half. High Momentum directly scales your <b>Tremor radius</b> and <b>Ram Damage</b>. In normal mode you move freely at full speed but deal no ram damage.</p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★☆☆☆ &nbsp;<span style="color:#2ecc71;"><b>2/5 — Easy</b></span></p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★☆☆ &nbsp;<span style="color:#f1c40f;"><b>3/5 — Medium</b></span></p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★☆ &nbsp;<span style="color:#e67e22;"><b>4/5 — Hard</b></span></p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★☆ &nbsp;<span style="color:#e67e22;"><b>4/5 — Hard</b></span></p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★☆ &nbsp;<span style="color:#e67e22;"><b>4/5 — Hard</b></span></p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★★ &nbsp;<span style="color:#e74c3c;"><b>5/5 — Very Hard</b></span></p>
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
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★★ &nbsp;<span style="color:#e74c3c;"><b>5/5 — Very Hard</b></span></p>
                <p>An alchemist who trades raw damage for DoT build-up and flask chemistry. Direct damage is low — your power lies in layering effects and mixing the right brew.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#76ff03;">Poison Stacks &amp; DoT</div>
                    <p>Your gas clouds apply <b>Poison Stacks</b> to enemies. Each stack ticks for damage every 0.5 seconds. Stacks cap at 100 per enemy — the higher the stack count, the faster enemies melt. Stacks decay slowly over time if you stop applying them.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#76ff03;">Poison Flasks</div>
                    <p>Flasks spawn in the Poison Biome — collect up to 2 at a time. Each combination produces a completely unique effect. Experiment to discover powerful synergies!</p>
                    <div class="tut-flask-grid">
                        <div class="tut-flask"><b style="color:#76ff03;">∅ NONE</b>Miasma Unleashed — rotating decay aura follows you, slowing &amp; poisoning all nearby enemies for 8s</div>
                        <div class="tut-flask"><b style="color:#e74c3c;">🔴 RED</b>Sanguine Leech — blood vortex pulls enemies toward you and drains their life, healing you in return</div>
                        <div class="tut-flask"><b style="color:#3498db;">🔵 BLUE</b>Cryogenic Burst — expanding ice shockwave freezes everything it touches, leaving a lingering frost zone</div>
                        <div class="tut-flask"><b style="color:#2ecc71;">🟢 GREEN</b>Acid Rain — corrosive droplets rain down across a wide area, creating pools that shred enemy defense</div>
                        <div class="tut-flask"><b style="color:#c0392b;">🔴🔴</b>Hemorrhage Chain — blood nova hits nearby enemies with bleed, then chain-detonates all bleeders for massive AoE</div>
                        <div class="tut-flask"><b style="color:#00bfff;">🔵🔵</b>Absolute Zero — three staggered ice waves expand outward; already-frozen enemies are shattered for triple damage</div>
                        <div class="tut-flask"><b style="color:#00e676;">🟢🟢</b>Toxic Tsunami — a rolling wave of poison surges in your aim direction, knocking back and drenching enemies in toxin</div>
                        <div class="tut-flask"><b style="color:#9b59b6;">🔵🔴</b>Hallucinogen — psychedelic cloud causes enemies to attack each other and stumble in confusion for 6 seconds</div>
                        <div class="tut-flask"><b style="color:#f39c12;">🟢🔴</b>Unstable Compound — a chemical vortex pulls enemies in, then detonates in a massive explosion amplified by their poison stacks</div>
                        <div class="tut-flask"><b style="color:#1abc9c;">🔵🟢</b>Viral Mutation — infects nearby enemies, turning them into carriers that spread the mutation to anything they touch</div>
                    </div>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#76ff03;">Special: ALCHEMICAL MIX</div>
                    <p>Triggers the effect matching your held flasks. Flasks are <b>not consumed</b> — you keep them between uses. Cooldown: 10 seconds. <i>Tip: Combos scale with your Poison Stacks, so build up DoT before detonating.</i></p>
                </div>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>DoT Duration:</b> Extends how long Poison stacks persist before decaying.</li>
                    <li><b>Attack Range:</b> Widens your gas cloud reach.</li>
                    <li><b>Potency:</b> Increases DoT damage per stack tick.</li>
                </ul>
                <p><i>Tip: "Venom Potency" level-up upgrades stack multiplicatively — prioritize them for late-wave scaling.</i></p>
            `
        },
        echos: {
            title: "Echos of Eternity",
            html: `
                <h2>DLC: Echos of Eternity</h2>
                <p>The narrative and mechanical culmination of 5 Freunde. Reality is fracturing — timelines bleed into one another, and the echoes of every choice ever made are converging. This DLC introduces the <b>Time Hero</b>, the persistent <b>Maze of Time</b> branching map, a <b>Hunting List</b> of formidable foes, and a new endgame challenge unlike anything before it.</p>
                <p><i>The DLC also contains a secret. Some paths through the Maze reveal more than others.</i></p>

                <h3>New Hero: Time — Sand Gold ⌛</h3>
                <p style="margin:2px 0 8px; font-size:0.85em;"><b>Difficulty:</b> ★★★★☆ &nbsp;<span style="color:#e67e22;"><b>4/5 — Hard</b></span></p>
                <p>Time bends the battlefield to his will. He does not simply fight — he reshapes encounters across multiple realities simultaneously. Mastering Time means riding the edge of chaos: the stronger you become, the more fractured your timeline grows.</p>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#c8aa6e;">Chrono Energy (0–100)</div>
                    <p>Your primary resource, shown as a golden arc around your character. Builds by shooting (+7 per shot) and using Chrono Strike (+14 per hit). At 70+, your ranged attack fires a bonus shot. Decays slowly when not attacking. Using the Eternal Paradox ultimate drains 30 Chrono Energy.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#e74c3c;">Timeline Burden (0–100)</div>
                    <p>A risk resource that rises passively during combat and when you use Timeline Fracture (+10 per use). At 20+ it spawns <b>Fracture Shadows</b> — ghostly enemy copies that hunt you. At 60+, a red warning ring pulses around you. If it reaches 100 the Eternal Paradox triggers automatically. Burden resets to 0 on Paradox activation.</p>
                    <p>Skilled play means staying at high burden for stronger shadows (and the damage boost Paradox brings) without losing control.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#c8aa6e;">Melee — Chrono Strike</div>
                    <p>A temporal shockwave in a ~120px radius. Deals heavy melee damage and slows all hit enemies to 25% speed for 1.5 seconds. Each hit grants 14 Chrono Energy. Hitting multiple enemies multiplies the energy gain (capped at 3 hits). The slow timer stacks — hitting a slowed enemy resets their slow duration.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#c8aa6e;">Special — Timeline Fracture</div>
                    <p>Immediately spawns a wave of Fracture Shadows based on your current Fracture tier. Slows all real enemies by 55% for 3 seconds. Grants a 30% damage boost for 4 seconds. Raises Timeline Burden by 10. Cooldown: 25 seconds. Use it offensively when you need burst damage, but watch your Burden — each use pushes you closer to Paradox.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ffd700;">Temporal Echoes (Passive)</div>
                    <p>Up to 2 ghostly echoes orbit near you at all times. Each echo periodically fires at the nearest enemy for 35% of your ranged damage. They do not take damage from enemies, but are limited by range (~320px). Echoes spawn automatically on a timer and expire after a set duration. Altar upgrades can increase their count and lifetime.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#ffd700;">Fracture Shadows</div>
                    <p>When Timeline Burden reaches 20 (Fracture Tier 1), shadows begin spawning near enemies and drifting toward you. They have HP, can be destroyed by your attacks, and deal contact damage. Higher fracture tiers spawn more shadows, more frequently, with more HP. Killing a shadow with Altar node <b>Paradox Engine</b> active triggers an AoE explosion.</p>
                </div>

                <div class="tut-card">
                    <div class="tut-card-title" style="color:#fff5a0;">Ultimate — Eternal Paradox (Level 10)</div>
                    <p>Triggered automatically when Timeline Burden hits 100, or available as a Level 10 upgrade card. All existing Fracture Shadows simultaneously explode in AoE bursts. Timeline Burden resets to 0. You gain <b>+70% damage</b> and <b>+35% speed</b> for 10 seconds. All enemies are slowed to 40% speed for 5 seconds. The ultimate visual transforms your character gold.</p>
                    <p><i>Strategy: intentionally race your Burden toward 100 to guarantee a massive Paradox activation at the right moment.</i></p>
                </div>

                <h3>Level-Up: Fast-Forward or Reverse</h3>
                <p>Time's level-up always presents exactly two options (plus the Ultimate at multiples of 10):</p>
                <div class="control-grid">
                    <div class="control-item"><b>Fast-Forward</b><span>+8% to all stats — stronger but burden escalates faster</span></div>
                    <div class="control-item"><b>Reverse</b><span>Weaken current tier, release all active Fracture Shadows (resolve the chaos)</span></div>
                </div>
                <p>Expert play means taking Fast-Forward repeatedly and managing the growing chaos through positioning and well-timed Paradox activations.</p>

                <h3>Skill Tree Highlights</h3>
                <ul>
                    <li><b>Chrono Gain:</b> Increases Chrono Energy earned per attack.</li>
                    <li><b>Echo Duration:</b> Extends how long Temporal Echoes stay active.</li>
                    <li><b>Slow Power:</b> Increases the duration of Chrono Strike's slow.</li>
                    <li><b>Echo Count:</b> Adds additional orbiting echoes (up to 4 total).</li>
                </ul>

                <h3>Altar of Mastery — Time Nodes</h3>
                <ul>
                    <li><b>Temporal Precision (Prestige 1):</b> Chrono Energy gain +20% from all sources.</li>
                    <li><b>Echo Mastery (Prestige 3):</b> Begin each run with a Temporal Echo already active.</li>
                    <li><b>Paradox Engine (Prestige 5):</b> Fracture Shadows explode in AoE on death.</li>
                </ul>

                <h3>Convergence Mutations (Time)</h3>
                <p>Cross-element altar nodes that require Prestige 5 in both Time and another hero:</p>
                <div class="control-grid">
                    <div class="control-item"><b>Delayed Lightning</b><span>Echo hits trigger chain lightning after 2 seconds</span></div>
                    <div class="control-item"><b>Time Dilation</b><span>Chrono Strike spawns a gravity well that pulls enemies</span></div>
                    <div class="control-item"><b>Burning Moment</b><span>Slowed enemies take periodic fire damage</span></div>
                    <div class="control-item"><b>Frozen Timeline</b><span>Chrono Strike fully freezes instead of slowing</span></div>
                    <div class="control-item"><b>Void Echo</b><span>Echo bolts deal 40% bonus void damage</span></div>
                    <div class="control-item"><b>Stone Moment</b><span>Chrono Strike also briefly roots enemies in place</span></div>
                    <div class="control-item"><b>Temporal Gust</b><span>Echo bolts travel slower but at double effective range</span></div>
                </div>

                <h3>The Maze of Time</h3>
                <p>After each wave in Story Mode, a <b>branching map</b> opens where you choose your next path. This is the heart of the Echos of Eternity DLC.</p>
                <div class="tut-card">
                    <div class="tut-card-title" style="color:#c8aa6e;">How It Works</div>
                    <ul>
                        <li>Each node on the map represents a unique encounter or story chapter.</li>
                        <li>Undiscovered paths are marked with <b>?</b> until you choose them.</li>
                        <li>Completed nodes are marked permanently — progress carries across all runs.</li>
                        <li>Each run only passes through one strand, but you must eventually explore every path to reach the true ending.</li>
                        <li>Some nodes have prerequisites — earlier paths in other strands must be cleared first.</li>
                        <li>The map has roughly 75 unique nodes spanning multiple strands (A through Omega).</li>
                    </ul>
                </div>
                <div class="tut-card">
                    <div class="tut-card-title" style="color:#c8aa6e;">Node Types</div>
                    <div class="control-grid">
                        <div class="control-item"><b>⚔ Combat</b><span>Standard wave with unique modifiers or biome</span></div>
                        <div class="control-item"><b>📖 Narrative</b><span>Story chapter — no combat, just revelation</span></div>
                        <div class="control-item"><b>💀 Formidable Foe</b><span>Hunting List boss — see below</span></div>
                        <div class="control-item"><b>⭐ Elite</b><span>Combat with stronger enemies and elite scaling</span></div>
                        <div class="control-item"><b>🎁 Reward</b><span>Passive bonus or unlock</span></div>
                        <div class="control-item"><b>🌀 Omega</b><span>The Maze Finale strand — the true ending</span></div>
                    </div>
                </div>

                <h3>The Hunting List</h3>
                <p>Certain Maze paths lead to <b>Formidable Foes</b> — uniquely powerful bosses found nowhere else in the game. Defeating them is permanent: once slain, they are checked off the Hunting List forever.</p>
                <ul>
                    <li>Hunting List progress is visible after each wave ends, alongside the Maze map.</li>
                    <li>Each defeated Foe grants a permanent run buff.</li>
                    <li>Clearing the entire list grants a special super-buff active in all future campaign runs.</li>
                    <li>Formidable Foes are scaled by the node's <b>Wave Strength</b> modifier — Elite nodes make them significantly harder.</li>
                </ul>

                <h3>New Biome: The Shattered Continuum</h3>
                <p>Floating fragments of fractured timelines. Sand drifts upward. Clock-face shards pulse in the background. Reality bleeds.</p>
                <ul>
                    <li><b>Time Rift Zones:</b> Areas on the floor where time is thinner. Non-Time enemies are slowed to 75% movement speed inside. Time hero is immune to this effect.</li>
                    <li>The biome is procedurally tiled with cracked timeline lines and drifting sand grain clusters.</li>
                </ul>

                <h3>Collector Cards</h3>
                <div class="control-grid">
                    <div class="control-item"><b>Time Wraith</b><span>Temporal phantom — earns defense and XP bonuses</span></div>
                    <div class="control-item"><b>Temporal Rift</b><span>Environmental hazard enemy — earns Rift immunity</span></div>
                </div>
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

            const echos = list.find(d => d.id === 'echos_of_eternity');
            if (echos && echos.active) document.getElementById('btn-tutorial-echos').style.display = 'block';
        }

        Manual.showTab('basics');
        setUIState('TUTORIAL');
    },

    close: function () {
        document.getElementById('tutorial-screen').style.display = 'none';
        initMenu();
    },

    showTab: function (tabId) {
        Manual.state.activeTab = tabId;
        const data = Manual.content[tabId];

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
            Manual.showTab(tabs[currentIndex]);
            uiDebounce = 10;
        } else if (gamepad.axes[1] > 0.5 && uiDebounce <= 0) { // Down
            currentIndex = (currentIndex + 1) % tabs.length;
            Manual.showTab(tabs[currentIndex]);
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

window.Manual = Manual;
window.Tutorial = Manual; // Backward-compatibility alias

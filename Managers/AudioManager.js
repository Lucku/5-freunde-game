class AudioManager {
    constructor() {
        this.tracks = {
            menu: new Audio('audio/music/main_menu.wav'),
            museum: new Audio('audio/music/museum.wav'),
            makuta: new Audio('audio/music/boss_makuta.wav'),
            goblin: new Audio('audio/music/boss_green_goblin.wav'),
            battle: new Audio('audio/music/battle.wav'),
            gameover: new Audio('audio/music/game_over.wav'),

            // DLC Battle variants (may be overwritten/added by DLC on load)
            battle_rock_1: new Audio('dlc/rise_of_the_rock/audio/music/battle_1.wav'),
            battle_rock_2: new Audio('dlc/rise_of_the_rock/audio/music/battle_2.wav'),
            golem: new Audio('dlc/rise_of_the_rock/audio/music/boss_dark_golem.wav'),

            battle_thunder_1: new Audio('dlc/tournament_of_thunder/audio/music/battle_1.wav'),
            battle_thunder_2: new Audio('dlc/tournament_of_thunder/audio/music/battle_2.wav'),
            zeus: new Audio('dlc/tournament_of_thunder/audio/music/boss_zeus.wav'),

            // DLC Champions of Chaos
            battle_chaos_1: new Audio('dlc/champions_of_chaos/audio/music/battle_1.wav'),
            battle_chaos_2: new Audio('dlc/champions_of_chaos/audio/music/battle_2.wav'),
            boss_chaos_all: new Audio('dlc/champions_of_chaos/audio/music/boss_all.wav'),
            boss_entropy: new Audio('dlc/champions_of_chaos/audio/music/boss_entropy_mage.wav'),

            // DLC Waker of Winds
            battle_air_1: new Audio('dlc/waker_of_winds/audio/music/battle_1.mp3'),
            battle_air_2: new Audio('dlc/waker_of_winds/audio/music/battle_2.mp3'),
            boss_air: new Audio('dlc/waker_of_winds/audio/music/boss.mp3'),

            // New Air Hero SFX
            attack_air_1: new Audio('dlc/waker_of_winds/audio/sounds/attack_air_1.wav'),
            attack_air_2: new Audio('dlc/waker_of_winds/audio/sounds/attack_air_2.wav'),
            attack_air_3: new Audio('dlc/waker_of_winds/audio/sounds/attack_air_3.wav'),
            attack_air_4: new Audio('dlc/waker_of_winds/audio/sounds/attack_air_4.wav'),

            special_air_1: new Audio('dlc/waker_of_winds/audio/sounds/special_air_1.wav'),
            special_air_2: new Audio('dlc/waker_of_winds/audio/sounds/special_air_2.wav'),
            special_air_3: new Audio('dlc/waker_of_winds/audio/sounds/special_air_3.wav'),
            special_air_4: new Audio('dlc/waker_of_winds/audio/sounds/special_air_4.wav'),

            // SFX
            level_up: new Audio('audio/sounds/level_up.wav'),
            pickup_card: new Audio('audio/sounds/pick_up_collectors_card.wav'),
            pickup_mask: new Audio('audio/sounds/pick_up_golden_mark.wav'),
            dash: new Audio('audio/sounds/dash_all.wav'),
            boss_shooter: new Audio('audio/sounds/attack_boss_shooter.wav'),
            challenge_success: new Audio('audio/sounds/challenge_success.wav'),
            challenge_fail: new Audio('audio/sounds/challenge_fail.wav'),

            attack_fire: new Audio('audio/sounds/attack_fire.wav'),
            attack_water: new Audio('audio/sounds/attack_water.wav'),
            attack_ice: new Audio('audio/sounds/attack_ice.wav'),
            attack_plant: new Audio('audio/sounds/attack_plant.wav'),
            attack_metal: new Audio('audio/sounds/attack_metal.wav'),
            attack_black: new Audio('audio/sounds/attack_black.wav'),
            attack_shooter: new Audio('audio/sounds/attack_shooter.wav'),
            melee_all: new Audio('audio/sounds/melee_all.wav'),
            damage: new Audio('audio/sounds/damage.wav'),
            death: new Audio('audio/sounds/death.wav'),

            boss_rhino_charge: new Audio('audio/sounds/attack_boss_rhino.wav'),
            boss_stomp: new Audio('audio/sounds/attack_boss_rhino_2.wav'),


            // Special SFX
            special_black: new Audio('audio/sounds/special_black.wav'),
            special_fire: new Audio('audio/sounds/special_fire.wav'),
            special_ice: new Audio('audio/sounds/special_ice.wav'),
            special_metal: new Audio('audio/sounds/special_metal.wav'), // Note: iron vs metal in filename
            special_plant: new Audio('audio/sounds/special_plant.wav'),
            special_water: new Audio('audio/sounds/special_water.wav'),

            attack_earth: new Audio('dlc/rise_of_the_rock/audio/sounds/attack_earth.wav'),
            attack_earth_roll: new Audio('dlc/rise_of_the_rock/audio/sounds/attack_earth_roll.wav'),
            melee_earth: new Audio('dlc/rise_of_the_rock/audio/sounds/melee_earth.wav'),

            attack_lightning: new Audio('dlc/tournament_of_thunder/audio/sounds/attack_lightning.wav'),
            attack_lightning_charged: new Audio('dlc/tournament_of_thunder/audio/sounds/attack_lightning_charged.wav'),
            special_lightning: new Audio('dlc/tournament_of_thunder/audio/sounds/special_lightning.wav'),

            // DLC Champions of Chaos
            attack_gravity: new Audio('dlc/champions_of_chaos/audio/sounds/attack_gravity.wav'),
            special_gravity: new Audio('dlc/champions_of_chaos/audio/sounds/special_gravity.wav'),
            attack_void: new Audio('dlc/champions_of_chaos/audio/sounds/attack_void.wav'),
            melee_void: new Audio('dlc/champions_of_chaos/audio/sounds/melee_void.wav'),
            special_void: new Audio('dlc/champions_of_chaos/audio/sounds/special_void.wav'),
            dash_void: new Audio('dlc/champions_of_chaos/audio/sounds/dash_void.wav'),

            // DLC Faith of Fortune
            attack_chance: new Audio('dlc/faith_of_fortune/audio/sounds/attack_chance.wav'),
            special_chance: new Audio('dlc/faith_of_fortune/audio/sounds/special_chance.wav'),
            special_chance_jackpot: new Audio('dlc/faith_of_fortune/audio/sounds/special_chance_jackpot.wav'),
            special_chance_win: new Audio('dlc/faith_of_fortune/audio/sounds/special_chance_win.wav'),
            special_chance_neutral: new Audio('dlc/faith_of_fortune/audio/sounds/special_chance_neutral.wav'),
            special_chance_lose: new Audio('dlc/faith_of_fortune/audio/sounds/special_chance_lose.wav'),
            big_gamble: new Audio('dlc/faith_of_fortune/audio/sounds/big_gamble.wav'),
            big_gamble_jackpot: new Audio('dlc/faith_of_fortune/audio/sounds/big_gamble_jackpot.wav'),
            big_gamble_win: new Audio('dlc/faith_of_fortune/audio/sounds/big_gamble_win.wav'),
            big_gamble_neutral: new Audio('dlc/faith_of_fortune/audio/sounds/big_gamble_neutral.wav'),
            big_gamble_lose: new Audio('dlc/faith_of_fortune/audio/sounds/big_gamble_lose.wav'),

            // DLC Faith of Fortune - Spirit Hero
            attack_spirit: new Audio('dlc/faith_of_fortune/audio/sounds/attack_spirit.wav'),
            special_spirit: new Audio('dlc/faith_of_fortune/audio/sounds/special_spirit.wav'),
            special_spirit_charging: new Audio('dlc/faith_of_fortune/audio/sounds/special_spirit_charging.wav'),

            // DLC Symphony of Sickness — Sound Hero SFX
            attack_sound_1:       new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_1.wav'),
            attack_sound_2:       new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_2.wav'),
            attack_sound_3:       new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_3.wav'),
            attack_sound_4:       new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_4.wav'),
            attack_sound_crit:    new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_crit.wav'),
            attack_sound_sync_1:  new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_1.wav'),
            attack_sound_sync_2:  new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_2.wav'),
            attack_sound_sync_3:  new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_3.wav'),
            attack_sound_sync_4:  new Audio('dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_4.wav'),
            special_sound:        new Audio('dlc/symphony_of_sickness/audio/sounds/special_sound.wav'),

            // DLC Symphony of Sickness
            battle_poison: new Audio('dlc/symphony_of_sickness/audio/music/battle_poison.wav'),
            battle_sound: new Audio('dlc/symphony_of_sickness/audio/music/battle_sound.wav'),
            battle_sound_sync: new Audio('dlc/symphony_of_sickness/audio/music/battle_sound_sync.wav'),
            boss_poison: new Audio('dlc/symphony_of_sickness/audio/music/boss_poison.wav'),
            boss_sound: new Audio('dlc/symphony_of_sickness/audio/music/boss_sound.wav'),
            attack_poison: new Audio('dlc/symphony_of_sickness/audio/sounds/attack_poison.wav'),
            special_poison_1: new Audio('dlc/symphony_of_sickness/audio/sounds/special_poison_1.wav'),
            special_poison_2: new Audio('dlc/symphony_of_sickness/audio/sounds/special_poison_2.wav'),
            special_poison_3: new Audio('dlc/symphony_of_sickness/audio/sounds/special_poison_3.wav'),
            special_poison_4: new Audio('dlc/symphony_of_sickness/audio/sounds/special_poison_4.wav'),

            // Base game SFX
            pickup_gold: new Audio('audio/sounds/pickup_gold.wav'),
            wave_completed: new Audio('audio/sounds/wave_completed.wav'),

            // DLC Boss SFX — Shadow Clone (Symphony of Sickness)
            shadow_step_vanish:       new Audio('dlc/symphony_of_sickness/audio/sounds/boss_shadow_step_vanish.wav'),
            shadow_step_reappear:     new Audio('dlc/symphony_of_sickness/audio/sounds/boss_shadow_step_reappear.wav'),
            shadow_trail_tick:        new Audio('dlc/symphony_of_sickness/audio/sounds/boss_shadow_trail_tick.wav'),
            shadow_fan_shot:          new Audio('dlc/symphony_of_sickness/audio/sounds/boss_shadow_fan_shot.wav'),
            shadow_phase_transition:  new Audio('dlc/symphony_of_sickness/audio/sounds/boss_shadow_phase_transition.wav'),
            dark_pulse_ring:          new Audio('dlc/symphony_of_sickness/audio/sounds/boss_dark_pulse_ring.wav'),

            // DLC Boss SFX — Mimic King (Faith of Fortune)
            wheel_tick:               new Audio('dlc/faith_of_fortune/audio/sounds/boss_wheel_tick.wav'),
            wheel_spin_start:         new Audio('dlc/faith_of_fortune/audio/sounds/boss_wheel_spin_start.wav'),
            wheel_land:               new Audio('dlc/faith_of_fortune/audio/sounds/boss_wheel_land.wav'),
            gambit_jackpot:           new Audio('dlc/faith_of_fortune/audio/sounds/boss_gambit_jackpot.wav'),
            gambit_nothing:           new Audio('dlc/faith_of_fortune/audio/sounds/boss_gambit_nothing.wav'),
            mimic_nova_burst:         new Audio('dlc/faith_of_fortune/audio/sounds/boss_mimic_nova.wav'),
            mimic_spiral_arms:        new Audio('dlc/faith_of_fortune/audio/sounds/boss_mimic_spiral.wav'),
            mimic_copy_hit:           new Audio('dlc/faith_of_fortune/audio/sounds/boss_mimic_copy.wav'),
            mimic_phase2_transition:  new Audio('dlc/faith_of_fortune/audio/sounds/boss_mimic_phase2.wav'),
            mimic_phase3_transition:  new Audio('dlc/faith_of_fortune/audio/sounds/boss_mimic_phase3.wav'),

            // DLC Boss SFX — Cloud Golem (Waker of Winds)
            gust_push:                new Audio('dlc/waker_of_winds/audio/sounds/boss_gust_push.wav'),
            hailstorm_burst:          new Audio('dlc/waker_of_winds/audio/sounds/boss_hailstorm_burst.wav'),
            cloud_golem_stomp:        new Audio('dlc/waker_of_winds/audio/sounds/boss_cloud_golem_stomp.wav'),

            // DLC Boss SFX — Storm Crow (Waker of Winds)
            crow_dive_screech:        new Audio('dlc/waker_of_winds/audio/sounds/boss_crow_dive_screech.wav'),
            screech_land:             new Audio('dlc/waker_of_winds/audio/sounds/boss_crow_screech_land.wav'),

            // DLC Boss SFX — Tornado Machina (Waker of Winds)
            tornado_projectile_spawn: new Audio('dlc/waker_of_winds/audio/sounds/boss_tornado_spawn.wav'),
            spin_dash:                new Audio('dlc/waker_of_winds/audio/sounds/boss_tornado_spin_dash.wav'),

            // DLC Boss SFX — Tempest (Waker of Winds)
            vortex_pull:              new Audio('dlc/waker_of_winds/audio/sounds/boss_vortex_pull.wav'),
            eye_of_storm_ring:        new Audio('dlc/waker_of_winds/audio/sounds/boss_eye_storm_ring.wav'),
            tempest_phase2_transition:new Audio('dlc/waker_of_winds/audio/sounds/boss_tempest_phase2.wav'),

            // DLC Boss SFX — Zeus (Tournament of Thunder)
            thunder_spear_telegraph:  new Audio('dlc/tournament_of_thunder/audio/sounds/boss_thunder_spear_telegraph.wav'),
            thunder_spear_launch:     new Audio('dlc/tournament_of_thunder/audio/sounds/boss_thunder_spear_launch.wav'),
            zeus_storm_ring:          new Audio('dlc/tournament_of_thunder/audio/sounds/boss_zeus_storm_ring.wav'),
            zeus_static_field:        new Audio('dlc/tournament_of_thunder/audio/sounds/boss_zeus_static_field.wav'),
            wrath_of_olympus:         new Audio('dlc/tournament_of_thunder/audio/sounds/boss_wrath_olympus.wav'),
            zeus_phase2_transition:   new Audio('dlc/tournament_of_thunder/audio/sounds/boss_zeus_phase2.wav'),
            zeus_phase3_transition:   new Audio('dlc/tournament_of_thunder/audio/sounds/boss_zeus_phase3.wav'),
            zeus_teleport_flash:      new Audio('dlc/tournament_of_thunder/audio/sounds/boss_zeus_teleport.wav'),

            // DLC Boss SFX — Dark Golem (Rise of the Rock)
            dark_golem_boulder:       new Audio('dlc/rise_of_the_rock/audio/sounds/boss_dark_golem_boulder.wav'),
            dark_golem_slam:          new Audio('dlc/rise_of_the_rock/audio/sounds/boss_dark_golem_slam.wav'),
            dark_golem_lava:          new Audio('dlc/rise_of_the_rock/audio/sounds/boss_dark_golem_lava.wav'),
            dark_golem_crack:         new Audio('dlc/rise_of_the_rock/audio/sounds/boss_dark_golem_crack.wav'),
            dark_golem_charge:        new Audio('dlc/rise_of_the_rock/audio/sounds/boss_dark_golem_charge.wav'),
            dark_golem_berserk:       new Audio('dlc/rise_of_the_rock/audio/sounds/boss_dark_golem_berserk.wav'),

            // DLC Boss SFX — Void Walker Boss (Champions of Chaos)
            void_bolt:                new Audio('dlc/champions_of_chaos/audio/sounds/boss_void_bolt.wav'),
            void_pulse_ring:          new Audio('dlc/champions_of_chaos/audio/sounds/boss_void_pulse_ring.wav'),
            dimensional_rift:         new Audio('dlc/champions_of_chaos/audio/sounds/boss_dimensional_rift.wav'),
            void_phase_in:            new Audio('dlc/champions_of_chaos/audio/sounds/boss_void_phase_in.wav'),
            void_phase_out:           new Audio('dlc/champions_of_chaos/audio/sounds/boss_void_phase_out.wav'),
            void_gravity_pull:        new Audio('dlc/champions_of_chaos/audio/sounds/boss_void_gravity_pull.wav'),
            void_storm:               new Audio('dlc/champions_of_chaos/audio/sounds/boss_void_storm.wav'),

            // DLC Boss SFX — Glitch Boss (Champions of Chaos)
            glitch_teleport:          new Audio('dlc/champions_of_chaos/audio/sounds/boss_glitch_teleport.wav'),
            glitch_corruption_beam:   new Audio('dlc/champions_of_chaos/audio/sounds/boss_glitch_beam.wav'),
            glitch_fragmentation:     new Audio('dlc/champions_of_chaos/audio/sounds/boss_glitch_fragment.wav'),
            glitch_system_crash:      new Audio('dlc/champions_of_chaos/audio/sounds/boss_glitch_crash.wav'),

            // DLC Boss SFX — Entropy Lord (Champions of Chaos)
            entropy_surge:            new Audio('dlc/champions_of_chaos/audio/sounds/boss_entropy_surge.wav'),
            chaos_storm:              new Audio('dlc/champions_of_chaos/audio/sounds/boss_chaos_storm.wav'),
            entropy_phase2_transition:new Audio('dlc/champions_of_chaos/audio/sounds/boss_entropy_phase2.wav'),
            entropy_phase3_transition:new Audio('dlc/champions_of_chaos/audio/sounds/boss_entropy_phase3.wav'),
            shield_orb_hit:           new Audio('dlc/champions_of_chaos/audio/sounds/boss_shield_orb_hit.wav'),
            entropy_teleport:         new Audio('dlc/champions_of_chaos/audio/sounds/boss_entropy_teleport.wav'),

            // Base game UI SFX
            achievement_unlocked: new Audio('audio/sounds/achievement_unlocked.wav'),
        };

        // Configuration
        this.tracks.menu.loop = true;
        this.tracks.menu.volume = 0.5;

        this.tracks.museum.loop = true;
        this.tracks.museum.volume = 0.5;

        this.tracks.makuta.loop = true;
        this.tracks.makuta.volume = 0.6;

        this.tracks.goblin.loop = true;
        this.tracks.goblin.volume = 0.6;

        this.tracks.battle.loop = true;
        this.tracks.battle.volume = 0.4;

        this.tracks.gameover.loop = true;
        this.tracks.gameover.volume = 0.6;

        this.tracks.battle_rock_1.loop = true;
        this.tracks.battle_rock_1.volume = 0.4;

        this.tracks.battle_rock_2.loop = true;
        this.tracks.battle_rock_2.volume = 0.4;

        this.tracks.golem.loop = true;
        this.tracks.golem.volume = 0.6;

        this.tracks.battle_chaos_1.loop = true;
        this.tracks.battle_chaos_1.volume = 0.4;
        this.tracks.battle_chaos_2.loop = true;
        this.tracks.battle_chaos_2.volume = 0.4;
        this.tracks.boss_chaos_all.loop = true;
        this.tracks.boss_chaos_all.volume = 0.6;
        this.tracks.boss_entropy.loop = true;
        this.tracks.boss_entropy.volume = 0.6;

        this.tracks.battle_air_1.loop = true;
        this.tracks.battle_air_1.volume = 0.4;
        this.tracks.battle_air_2.loop = true;
        this.tracks.battle_air_2.volume = 0.4;
        this.tracks.boss_air.loop = true;
        this.tracks.boss_air.volume = 0.6;

        this.tracks.battle_thunder_1.loop = true;
        this.tracks.battle_thunder_1.volume = 0.4;
        this.tracks.battle_thunder_2.loop = true;
        this.tracks.battle_thunder_2.volume = 0.4;

        this.tracks.zeus.loop = true;
        this.tracks.zeus.volume = 0.6;

        if (this.tracks.level_up) {
            this.tracks.level_up.volume = 0.5;
        }
        if (this.tracks.pickup_card) this.tracks.pickup_card.volume = 0.5;
        if (this.tracks.pickup_mask) this.tracks.pickup_mask.volume = 0.6;
        if (this.tracks.dash) this.tracks.dash.volume = 0.4;
        if (this.tracks.boss_shooter) this.tracks.boss_shooter.volume = 0.4;
        if (this.tracks.challenge_success) this.tracks.challenge_success.volume = 0.6;
        if (this.tracks.challenge_fail) this.tracks.challenge_fail.volume = 0.6;
        if (this.tracks.boss_rhino_charge) this.tracks.boss_rhino_charge.volume = 0.6;
        if (this.tracks.boss_stomp) this.tracks.boss_stomp.volume = 0.6;

        if (this.tracks.special_gravity) {
            this.tracks.special_gravity.loop = true;
            this.tracks.special_gravity.volume = 0.6;
        }
        if (this.tracks.attack_gravity) this.tracks.attack_gravity.volume = 0.4;
        if (this.tracks.attack_void) this.tracks.attack_void.volume = 0.4;
        if (this.tracks.melee_void) this.tracks.melee_void.volume = 0.5;
        if (this.tracks.special_void) this.tracks.special_void.volume = 0.6;
        if (this.tracks.dash_void) this.tracks.dash_void.volume = 0.6;
        if (this.tracks.damage) this.tracks.damage.volume = 0.4;
        if (this.tracks.death) this.tracks.death.volume = 0.6;

        if (this.tracks.attack_earth_roll) {
            this.tracks.attack_earth_roll.loop = true;
            this.tracks.attack_earth_roll.volume = 0.3;
        }

        if (this.tracks.big_gamble) {
            this.tracks.big_gamble.loop = true;
            this.tracks.big_gamble.volume = 0.5;
        }
        if (this.tracks.special_chance) {
            this.tracks.special_chance.loop = true;
            this.tracks.special_chance.volume = 0.5;
        }
        if (this.tracks.special_spirit_charging) {
            this.tracks.special_spirit_charging.loop = true;
            this.tracks.special_spirit_charging.volume = 0.4;
        }

        this.tracks.battle_poison.loop = true;
        this.tracks.battle_poison.volume = 0.4;
        this.tracks.battle_sound.loop = true;
        this.tracks.battle_sound.volume = 0.4;
        this.tracks.battle_sound_sync.loop = true;
        this.tracks.battle_sound_sync.volume = 0.42;
        this.tracks.boss_poison.loop = true;
        this.tracks.boss_poison.volume = 0.6;
        this.tracks.boss_sound.loop = true;
        this.tracks.boss_sound.volume = 0.6;
        if (this.tracks.attack_poison) this.tracks.attack_poison.volume = 0.5;
        if (this.tracks.special_poison_1) this.tracks.special_poison_1.volume = 0.6;
        if (this.tracks.special_poison_2) this.tracks.special_poison_2.volume = 0.6;
        if (this.tracks.special_poison_3) this.tracks.special_poison_3.volume = 0.6;
        if (this.tracks.special_poison_4) this.tracks.special_poison_4.volume = 0.6;
        if (this.tracks.pickup_gold) this.tracks.pickup_gold.volume = 0.4;
        if (this.tracks.wave_completed) this.tracks.wave_completed.volume = 0.6;
        if (this.tracks.attack_chance) this.tracks.attack_chance.volume = 0.3;
        if (this.tracks.attack_spirit) this.tracks.attack_spirit.volume = 0.3;
        if (this.tracks.special_spirit) this.tracks.special_spirit.volume = 0.5;

        ['special_chance_jackpot', 'special_chance_win', 'special_chance_neutral', 'special_chance_lose'].forEach(k => {
            if (this.tracks[k]) this.tracks[k].volume = 0.6;
        });
        ['big_gamble_jackpot', 'big_gamble_win', 'big_gamble_neutral', 'big_gamble_lose'].forEach(k => {
            if (this.tracks[k]) this.tracks[k].volume = 0.6;
        });

        // Air SFX config
        for (let i = 1; i <= 4; i++) {
            if (this.tracks[`attack_air_${i}`]) this.tracks[`attack_air_${i}`].volume = 0.3;
            if (this.tracks[`special_air_${i}`]) this.tracks[`special_air_${i}`].volume = 0.5;
        }

        // SFX Configuration, 'attack_shooter', 'special_black', 'special_fire', 'special_ice', 'special_metal', 'special_plant', 'special_water', 'special_lightning'
        ['attack_fire', 'attack_water', 'attack_ice', 'attack_plant', 'attack_metal', 'attack_black', 'attack_earth', 'attack_lightning', 'attack_lightning_charged', 'melee_all', 'melee_earth'].forEach(key => {
            if (this.tracks[key]) this.tracks[key].volume = 0.25; // Low volume to not dominate music
        });

        // DLC Boss SFX volumes
        // Short attack sounds — quieter so they don't override music
        [
            'shadow_step_vanish', 'shadow_step_reappear', 'shadow_trail_tick', 'shadow_fan_shot',
            'wheel_tick', 'wheel_land', 'gambit_nothing',
            'gust_push', 'crow_dive_screech', 'screech_land', 'tornado_projectile_spawn',
            'thunder_spear_launch', 'zeus_static_field', 'zeus_teleport_flash',
            'dark_golem_boulder', 'dark_golem_charge',
            'void_bolt', 'void_phase_in', 'void_phase_out',
            'glitch_teleport', 'glitch_corruption_beam',
            'shield_orb_hit', 'entropy_teleport',
        ].forEach(k => { if (this.tracks[k]) this.tracks[k].volume = 0.4; });

        // Bigger impact / explosion sounds
        [
            'dark_pulse_ring', 'mimic_nova_burst', 'mimic_spiral_arms', 'mimic_copy_hit',
            'gambit_jackpot', 'wheel_spin_start',
            'hailstorm_burst', 'cloud_golem_stomp',
            'spin_dash', 'vortex_pull', 'eye_of_storm_ring',
            'thunder_spear_telegraph', 'zeus_storm_ring', 'wrath_of_olympus',
            'dark_golem_slam', 'dark_golem_lava',
            'void_pulse_ring', 'dimensional_rift', 'void_gravity_pull', 'void_storm',
            'glitch_fragmentation', 'glitch_system_crash',
            'entropy_surge', 'chaos_storm',
        ].forEach(k => { if (this.tracks[k]) this.tracks[k].volume = 0.55; });

        // Phase transition / dramatic sounds — full presence
        [
            'shadow_phase_transition',
            'mimic_phase2_transition', 'mimic_phase3_transition',
            'tempest_phase2_transition',
            'zeus_phase2_transition', 'zeus_phase3_transition',
            'dark_golem_crack', 'dark_golem_berserk',
            'entropy_phase2_transition', 'entropy_phase3_transition',
        ].forEach(k => { if (this.tracks[k]) this.tracks[k].volume = 0.7; });

        this.musicEnabled = true;
        this.sfxEnabled = true;

        this.updateSettings();

        // Loop Tracking
        this.activeLoops = {};
    }

    startLoop(key) {
        if (!this.sfxEnabled) return;
        if (this.activeLoops[key]) return; // Already looping

        const sound = this.tracks[key];
        if (sound) {
            const loopNode = sound.cloneNode();
            loopNode.loop = true;
            loopNode.volume = sound.volume;
            loopNode.play().catch(e => console.warn(`Audio loop fail: ${key}`, e));
            this.activeLoops[key] = loopNode;
        }
    }

    stopLoop(key) {
        if (this.activeLoops[key]) {
            this.activeLoops[key].pause();
            this.activeLoops[key].currentTime = 0;
            delete this.activeLoops[key];
        }
    }

    playAttack(hero, isCharged = false) {
        if (!this.sfxEnabled) return;

        let key = `attack_${hero}`;
        if (hero === 'lightning' && isCharged) {
            key = 'attack_lightning_charged';
        }

        const sound = this.tracks[key];

        if (sound) {
            const sfx = sound.cloneNode();
            sfx.volume = 0.3;
            sfx.play().catch(e => {
                // Ignore errors
            });
        }
    }

    hasVoice(hero, index) {
        if (index < 0 || index >= 50) return false;
        // In a real implementation, we would check if the file exists.
        // For now, we assume if the index is valid, the file *might* exist.
        return true;
    }

    playVoice(hero, index) {
        if (!this.sfxEnabled) return; // Treating voice as SFX for now, or use separate flag

        if (this.voice) {
            this.voice.pause();
            this.voice = null;
        }

        const id = index + 1;
        let path = "";

        // DLC: Rise of the Rock (Earth Hero)
        if (hero === 'earth') {
            path = `dlc/rise_of_the_rock/audio/memories/${hero}_${id}.mp3`;
        } else if (hero === 'lightning') {
            path = `dlc/tournament_of_thunder/audio/memories/${hero}_${id}.mp3`;
        } else if (hero === 'gravity' || hero === 'void') {
            path = `dlc/champions_of_chaos/audio/memories/${hero}_${id}.mp3`;
        } else if (hero === 'air') {
            path = `dlc/waker_of_winds/audio/memories/${hero}_${id}.mp3`;
        } else if (hero === 'sound' || hero === 'poison') {
            path = `dlc/symphony_of_sickness/audio/memories/${hero}_${id}.mp3`;
        } else {
            // Standard Heroes (and potentially others if added strictly to base)
            path = `audio/memories/${hero}_${id}.mp3`;
        }

        this.voice = new Audio(path);
        this.voice.volume = 0.8;
        this.voice.play().catch(e => {
            console.warn(`Audio memory file not found or failed to play: ${path}`, e);
        });
        if (this.tracks.museum) this.tracks.museum.volume = 0.2;

        this.voice.onended = () => {
            if (this.tracks.museum) this.tracks.museum.volume = 0.5;
        };
    }

    toggleMute() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopAllMusic();
        }
        return !this.musicEnabled;
    }

    updateSettings() {
        if (typeof gameConfig !== 'undefined') {
            // Sync Music
            if (this.musicEnabled !== gameConfig.musicEnabled) {
                this.musicEnabled = gameConfig.musicEnabled;
                if (!this.musicEnabled) this.stopAllMusic();
            }

            // Sync SFX
            this.sfxEnabled = gameConfig.sfxEnabled;

            // Handle Earth Roll special case (continuous SFX)
            if (!this.sfxEnabled && this.tracks.attack_earth_roll && !this.tracks.attack_earth_roll.paused) {
                this.tracks.attack_earth_roll.pause();
            }
        }
    }

    isMusic(trackName) {
        const track = this.tracks[trackName];
        if (!track) return false;

        // Use src to detect type based on folder structure
        // Note: src is absolute path (file:// or http://)
        const src = track.src;

        // Verify if it's in the audio/music subdirectory
        if (src.includes('/audio/music/')) {
            return true;
        }

        return false;
    }

    play(trackName) {
        const isMusic = this.isMusic(trackName);

        if (isMusic) {
            if (!this.musicEnabled) return;
            const track = this.tracks[trackName];
            if (track && track.paused) {
                track.play().catch(e => { /* Ignore autoplay errors */ });
            }
        } else {
            // Assume SFX
            if (!this.sfxEnabled) return;
            const track = this.tracks[trackName];
            if (track) {
                // Clone for polyphony (overlap)
                const sfx = track.cloneNode();
                sfx.volume = track.volume;
                sfx.play().catch(e => { /* Ignore autoplay errors */ });
            }
        }
    }

    stop(trackName) {
        const track = this.tracks[trackName];
        if (track && !track.paused) {
            track.pause();
            track.currentTime = 0;
        }
    }

    // New helper to stop only music
    stopAllMusic() {
        for (const key in this.tracks) {
            if (this.isMusic(key)) {
                this.stop(key);
            }
        }
    }

    stopAllExcept(trackName) {
        // This is mainly used for music switching, so we should filter by music tracks mostly?
        // But invalidating 'all' is safer for state changes.
        for (const key in this.tracks) {
            if (key !== trackName) {
                this.stop(key);
            }
        }
    }

    update() {
        // Ensure global variables are available
        if (typeof uiState === 'undefined') return;
        // Don't switch music while the game is interrupted — lets manual pause/resume hold
        if (uiState === 'PAUSE' || uiState === 'LEVELUP') return;

        const menuStates = ['MENU', 'OPTIONS', 'PERMSHOP', 'ACHIEVEMENTS', 'COLLECTION', 'HIGHSCORE', 'STORY', 'ALTAR', 'CHAOSSHOP', 'TUTORIAL', 'STATS', 'COMPLETION', 'SKILLTREE'];

        if (uiState === 'GAMEOVER') {
            this.stopAllExcept('gameover');
            this.play('gameover');
        } else if (uiState === 'MUSEUM') {
            this.stopAllExcept('museum');
            this.play('museum');
        } else if (menuStates.includes(uiState)) {
            this.stopAllExcept('menu');
            this.play('menu');
        } else {
            // Game Mode
            // Check for Bosses
            const isMakutaActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'MAKUTA');

            const isGoblinActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'GREEN_GOBLIN');

            const isGolemActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'DARK_GOLEM');

            const isZeusActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'ZEUS');

            const isEntropyMageActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'ENTROPY_LORD');

            const isChaosBossActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && (e.type === 'VOID_WALKER_BOSS' || e.type === 'GLITCH_BOSS'));
            const isAirBossActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && ['CLOUD_GOLEM', 'STORM_CROW', 'TORNADO_MACHINA', 'TEMPEST'].includes(e.type));

            const isPoisonBossActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof player !== 'undefined' && player && player.type === 'poison';
            const isSoundBossActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof player !== 'undefined' && player && player.type === 'sound';

            if (isMakutaActive) {
                this.stopAllExcept('makuta');
                this.play('makuta');
            } else if (isGoblinActive) {
                this.stopAllExcept('goblin');
                this.play('goblin');
            } else if (isGolemActive) {
                this.stopAllExcept('golem');
                this.play('golem');
            } else if (isZeusActive) {
                this.stopAllExcept('zeus');
                this.play('zeus');
            } else if (isEntropyMageActive) {
                this.stopAllExcept('boss_entropy');
                this.play('boss_entropy');
            } else if (isChaosBossActive) {
                this.stopAllExcept('boss_chaos_all');
                this.play('boss_chaos_all');
            } else if (isAirBossActive) {
                this.stopAllExcept('boss_air');
                this.play('boss_air');
            } else if (isPoisonBossActive) {
                this.stopAllExcept('boss_poison');
                this.play('boss_poison');
            } else if (isSoundBossActive) {
                this.stopAllExcept('boss_sound');
                this.play('boss_sound');
            } else {
                // If the Earth hero is active in the run, prefer DLC rock battle variants (randomized)
                // Story Mode only (Not Daily/Weekly)
                const isEarthActive = typeof player !== 'undefined' && player && player.type === 'earth';
                const isLightningActive = typeof player !== 'undefined' && player && player.type === 'lightning';
                const isGravityActive = typeof player !== 'undefined' && player && player.type === 'gravity';
                const isAirActive = typeof player !== 'undefined' && player && player.type === 'air';
                const isVoidActive = typeof player !== 'undefined' && player && player.type === 'void';
                const isPoisonActive = typeof player !== 'undefined' && player && player.type === 'poison';
                const isStoryMode = typeof isDailyMode !== 'undefined' && !isDailyMode &&
                    typeof isWeeklyMode !== 'undefined' && !isWeeklyMode &&
                    typeof saveData !== 'undefined' && saveData.story && saveData.story.enabled;

                if (isEarthActive && isStoryMode && this.tracks['battle_rock_1'] && this.tracks['battle_rock_2']) {
                    const t1 = this.tracks['battle_rock_1'];
                    const t2 = this.tracks['battle_rock_2'];

                    if (!t1.paused) {
                        this.stopAllExcept('battle_rock_1');
                    } else if (!t2.paused) {
                        this.stopAllExcept('battle_rock_2');
                    } else {
                        // None playing, pick random
                        const pick = Math.random() < 0.5 ? 'battle_rock_1' : 'battle_rock_2';
                        this.stopAllExcept(pick);
                        this.play(pick);
                    }
                } else if (isLightningActive && isStoryMode && this.tracks['battle_thunder_1'] && this.tracks['battle_thunder_2']) {
                    const t1 = this.tracks['battle_thunder_1'];
                    const t2 = this.tracks['battle_thunder_2'];

                    if (!t1.paused) {
                        this.stopAllExcept('battle_thunder_1');
                    } else if (!t2.paused) {
                        this.stopAllExcept('battle_thunder_2');
                    } else {
                        // None playing, pick random
                        const pick = Math.random() < 0.5 ? 'battle_thunder_1' : 'battle_thunder_2';
                        this.stopAllExcept(pick);
                        this.play(pick);
                    }
                } else if (isGravityActive && isStoryMode) {
                    this.stopAllExcept('battle_chaos_1');
                    this.play('battle_chaos_1');
                } else if (isVoidActive && isStoryMode) {
                    this.stopAllExcept('battle_chaos_2');
                    this.play('battle_chaos_2');
                } else if (isAirActive && isStoryMode && this.tracks['battle_air_1'] && this.tracks['battle_air_2']) {
                    const t1 = this.tracks['battle_air_1'];
                    const t2 = this.tracks['battle_air_2'];

                    if (!t1.paused) {
                        this.stopAllExcept('battle_air_1');
                    } else if (!t2.paused) {
                        this.stopAllExcept('battle_air_2');
                    } else {
                        const pick = Math.random() < 0.5 ? 'battle_air_1' : 'battle_air_2';
                        this.stopAllExcept(pick);
                        this.play(pick);
                    }
                } else if (isPoisonActive && isStoryMode && this.tracks['battle_poison']) {
                    this.stopAllExcept('battle_poison');
                    this.play('battle_poison');
                } else if ((typeof player !== 'undefined' && player && player.type === 'sound') && isStoryMode && this.tracks['battle_sound'] &&
                    !((typeof currentBiomeType !== 'undefined' && currentBiomeType === 'sound') || (typeof window.currentBiome !== 'undefined' && window.currentBiome === 'sound'))) {
                    this.stopAllExcept('battle_sound');
                    this.play('battle_sound');
                } else if (((typeof currentBiomeType !== 'undefined' && currentBiomeType === 'sound') || (typeof window.currentBiome !== 'undefined' && window.currentBiome === 'sound')) && this.tracks['battle_sound_sync']) {
                    this.stopAllExcept('battle_sound_sync');
                    this.play('battle_sound_sync');
                } else {
                    this.stopAllExcept('battle');
                    this.play('battle');
                }
            }
        }
    }
}

const audioManager = new AudioManager();

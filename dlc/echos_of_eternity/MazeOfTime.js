// Echos of Eternity — The Maze of Time
// A persistent branching node map with ~75 deterministic nodes.
// All node parameters (enemies, biome, difficulty) are fixed across every playthrough.
// Player state persists across runs in localStorage.

// ─── NODE DEFINITIONS ────────────────────────────────────────────────────────
// Each node is fully deterministic: same enemies, same biome, same difficulty, always.
//
// Coordinate space: 2620 × 1100 (logical canvas pixels)
// Node types: STORY | COMBAT | BOSS | FORMIDABLE_FOE | BIOME | DISCOVERY | CONVERGENCE | COMPANION | FINALE | HIDDEN

const MAZE_NODES = [

    // ─── ORIGIN ──────────────────────────────────────────────────────────────
    {
        id: 'origin',
        type: 'STORY',
        title: 'The First Fracture',
        icon: '⌛',
        strand: 'ORIGIN',
        narrative: 'Time feels it first — a tremor beneath existence. The timeline cracks, and from the rupture, two paths emerge.\n\nThe present calls. The past haunts. He must choose which wound to tend first.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 5 }, { type: 'FAST', count: 3 }],
        waveStrength: 0.8,
        modifiers: [],
        bossType: null,
        x: 100, y: 500,
        children: ['gate_a', 'gate_b'],
        requires: [],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },

    // ─── STRAND A: THE FRACTURING PRESENT ────────────────────────────────────
    {
        id: 'gate_a',
        type: 'STORY',
        title: 'The Present Calling',
        icon: '🕐',
        strand: 'A',
        narrative: 'The present demands attention. Time turns to face what is happening now — the fractures spreading across the living world.\n\nEvery second he delays, another timeline splinters.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 7 }, { type: 'FAST', count: 4 }],
        waveStrength: 1.0,
        modifiers: [],
        bossType: null,
        x: 290, y: 310,
        children: ['a1_sand', 'a1_echo'],
        requires: ['origin'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a1_sand',
        type: 'COMBAT',
        title: 'The Sand War',
        icon: '⚔️',
        strand: 'A',
        narrative: 'Across the Shattered Continuum, time-touched soldiers march in impossible formations — armies from different eras colliding in a single moment.\n\nThey do not know each other. They only know the fight.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 12 }, { type: 'SHOOTER', count: 4 }, { type: 'FAST', count: 6 }],
        waveStrength: 1.1,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 490, y: 170,
        children: ['a2_loop', 'a2_burden'],
        requires: ['gate_a'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a1_echo',
        type: 'DISCOVERY',
        title: 'The First Echo',
        icon: '✨',
        strand: 'A',
        narrative: 'He watches himself — a perfect replica fighting alongside him, mimicking every move. The timeline has split. Two versions of Time exist in one moment.\n\nThe echo does not speak. It only acts.',
        biome: 'time',
        enemyOverride: [{ type: 'FAST', count: 8 }, { type: 'BASIC', count: 10 }],
        waveStrength: 1.0,
        modifiers: ['DOUBLE_ECHO'],
        bossType: null,
        x: 490, y: 360,
        children: ['a2_burden', 'c1_whatif'],
        requires: ['gate_a'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'chronoEnergy', value: 30 },
    },
    {
        id: 'a2_loop',
        type: 'BIOME',
        title: 'The Endless Loop',
        icon: '🔄',
        strand: 'A',
        narrative: 'He runs. But no matter how far he travels, he returns to the same spot. Same enemies. Same wounds. Time itself has formed a closed loop around him.\n\nThe only way out is through.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 10 }, { type: 'BASIC', count: 10 }],
        waveStrength: 1.2,
        modifiers: ['ENEMY_RESPAWN'],
        bossType: null,
        x: 700, y: 110,
        children: ['a3_wraith', 'a3_anchor'],
        requires: ['a1_sand'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a2_burden',
        type: 'STORY',
        title: "Ancestor's Burden",
        icon: '📜',
        strand: 'A',
        narrative: 'Deep in the fractures, he finds a memory — not his own, but of those who carried time before him. Each one broke under the weight.\n\nWill he?',
        biome: 'time',
        enemyOverride: [{ type: 'TANK', count: 5 }, { type: 'BOMBER', count: 3 }, { type: 'BASIC', count: 8 }],
        waveStrength: 1.15,
        modifiers: [],
        bossType: null,
        x: 700, y: 280,
        children: ['a3_anchor', 'a3_sandstorm'],
        requires: ['a1_sand', 'a1_echo'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a2_mirror',
        type: 'CONVERGENCE',
        title: 'The Mirror War',
        icon: '🔀',
        strand: 'A',
        narrative: 'An alternate version of himself — one who chose differently — stands across the battlefield. His echo attacks without mercy or hesitation.\n\nFighting yourself is harder than fighting anyone else.',
        biome: 'time',
        enemyOverride: [{ type: 'FAST', count: 10 }, { type: 'SHOOTER', count: 8 }, { type: 'FLANKER', count: 5 }],
        waveStrength: 1.3,
        modifiers: ['HARD_MODE'],
        bossType: null,
        x: 700, y: 450,
        children: ['a3_sandstorm'],
        requires: ['a1_echo'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'damage', value: 0.1 },
    },
    {
        id: 'a3_wraith',
        type: 'BOSS',
        title: 'The Time Wraith',
        icon: '👁️',
        strand: 'A',
        narrative: 'It has no origin and no future — only the eternal present. The Time Wraith feeds on fractured timelines, growing stronger with every paradox that is left unresolved.\n\nIt has been waiting.',
        biome: 'time',
        enemyOverride: null,
        waveStrength: 1.5,
        modifiers: ['BOSS_WAVE'],
        bossType: 'TIME_WRAITH',
        x: 910, y: 80,
        children: ['a4_fracture', 'hunt1'],
        requires: ['a2_loop'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'maxHp', value: 25 },
    },
    {
        id: 'a3_anchor',
        type: 'COMBAT',
        title: 'Shattered Anchors',
        icon: '⚓',
        strand: 'A',
        narrative: 'The temporal anchors — keystones holding reality together — are dissolving. Without them, the present will collapse into the past and never reform.\n\nProtect what remains.',
        biome: 'time',
        enemyOverride: [{ type: 'TANK', count: 8 }, { type: 'BOMBER', count: 5 }, { type: 'BASIC', count: 10 }],
        waveStrength: 1.2,
        modifiers: [],
        bossType: null,
        x: 910, y: 240,
        children: ['a4_fracture', 'a4_echo_battle'],
        requires: ['a2_burden', 'a2_loop'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a3_sandstorm',
        type: 'BIOME',
        title: 'The Temporal Sandstorm',
        icon: '🌪️',
        strand: 'A',
        narrative: 'A storm of crystallized time — every grain a frozen moment, cutting like glass. Vision drops to nothing. Only instinct survives.\n\nIn the chaos, enemies move faster than the eye can follow.',
        biome: 'time',
        enemyOverride: [{ type: 'FAST', count: 16 }, { type: 'FLANKER', count: 8 }],
        waveStrength: 1.25,
        modifiers: ['HIGH_SPEED', 'DENSE_SPAWN'],
        bossType: null,
        x: 910, y: 420,
        children: ['a4_echo_battle', 'd1_makuta'],
        requires: ['a2_mirror', 'a2_burden'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a4_fracture',
        type: 'STORY',
        title: 'The Deep Fracture',
        icon: '💥',
        strand: 'A',
        narrative: 'The Timeline Fracture is no longer just a tool. It is alive — pulling him in, demanding more paradoxes, more sacrifices.\n\nHe must decide how far he will go.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 10 }, { type: 'SHOOTER', count: 8 }, { type: 'TANK', count: 4 }],
        waveStrength: 1.4,
        modifiers: ['HIGH_BURDEN'],
        bossType: null,
        x: 1120, y: 90,
        children: ['a5_paradox', 'a5_black'],
        requires: ['a3_wraith', 'a3_anchor'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a4_echo_battle',
        type: 'COMBAT',
        title: 'The Echo Battles',
        icon: '⚔️',
        strand: 'A',
        narrative: "His echoes have turned against him. Fragments of past decisions, armed with his own abilities, seek to overwrite his present self.\n\nHe is fighting his own history.",
        biome: 'time',
        enemyOverride: [{ type: 'FAST', count: 12 }, { type: 'FLANKER', count: 8 }, { type: 'SHOOTER', count: 6 }],
        waveStrength: 1.35,
        modifiers: ['ENEMY_MIRRORS'],
        bossType: null,
        x: 1120, y: 270,
        children: ['a5_black', 'a5_paradox'],
        requires: ['a3_anchor', 'a3_sandstorm'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'speed', value: 0.1 },
    },
    {
        id: 'a5_paradox',
        type: 'STORY',
        title: 'The Eternal Paradox Rises',
        icon: '🌀',
        strand: 'A',
        narrative: 'At the nexus of all fractured paths, time collapses into a singularity. The Eternal Paradox is not a choice — it is an inevitability.\n\nHe has been walking toward this moment since the first fracture.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 18 }, { type: 'TANK', count: 6 }, { type: 'SHOOTER', count: 8 }],
        waveStrength: 1.6,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 1330, y: 75,
        children: ['a6_conv'],
        requires: ['a4_fracture'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a5_black',
        type: 'COMPANION',
        title: 'Black in the Shadows',
        icon: '🤝',
        strand: 'A',
        narrative: "From the darkest fracture, Black emerges — the hero of void, the unspoken. He joins without words. His power fills the gaps in Time's defenses.\n\nSome allies only appear when things are truly desperate.",
        biome: 'void',
        enemyOverride: [{ type: 'BASIC', count: 14 }, { type: 'FAST', count: 10 }, { type: 'FLANKER', count: 6 }],
        waveStrength: 1.45,
        modifiers: ['BLACK_COMPANION'],
        bossType: null,
        x: 1330, y: 245,
        children: ['a6_conv', 'a6_truth'],
        requires: ['a4_echo_battle', 'a4_fracture'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a6_conv',
        type: 'CONVERGENCE',
        title: 'All Timelines Intersect',
        icon: '🔀',
        strand: 'A',
        narrative: "For one frozen moment, every version of every hero stands at the same crossroads. The fracture hasn't destroyed time — it has connected everything.\n\nThis is what Time never understood: connection was the point.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 20 }, { type: 'SHOOTER', count: 10 }, { type: 'TANK', count: 8 }, { type: 'FAST', count: 12 }],
        waveStrength: 1.8,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 1540, y: 90,
        children: ['a7_last', 'omega1'],
        requires: ['a5_paradox', 'a5_black'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'a6_truth',
        type: 'DISCOVERY',
        title: 'The Buried Truth',
        icon: '🔍',
        strand: 'A',
        narrative: "He lied. About where he was. About who he was becoming. The fractures aren't just in time — they're in him.\n\nEvery fissure in the timeline mirrors a lie he told.",
        biome: 'time',
        enemyOverride: [{ type: 'TANK', count: 10 }, { type: 'BOMBER', count: 6 }, { type: 'BASIC', count: 12 }],
        waveStrength: 1.7,
        modifiers: [],
        bossType: null,
        x: 1540, y: 265,
        children: ['a7_last', 'e1_hint'],
        requires: ['a5_black'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'memory', value: 'time_memory_17' },
    },
    {
        id: 'a7_last',
        type: 'BOSS',
        title: 'The Last Sand',
        icon: '⌛',
        strand: 'A',
        narrative: "The hourglass empties. The last grain falls. Everything Time has done — every fracture, every echo, every lie — reaches its conclusion here.\n\nAnd from that conclusion, a monster is born.",
        biome: 'time',
        enemyOverride: null,
        waveStrength: 2.0,
        modifiers: ['BOSS_WAVE'],
        bossType: 'TEMPORAL_RIFT',
        x: 1750, y: 130,
        children: ['omega1'],
        requires: ['a6_conv', 'a6_truth'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'maxHp', value: 35 },
    },

    // ─── STRAND B: ECHOES OF THE PAST ────────────────────────────────────────
    {
        id: 'gate_b',
        type: 'STORY',
        title: 'The Past Haunting',
        icon: '🕰️',
        strand: 'B',
        narrative: "The past bleeds through. Echoes of other heroes' struggles fill his mind. He peers backward — to understand what led to this moment.\n\nThe answers are in what already happened.",
        biome: 'time',
        enemyOverride: [{ type: 'TANK', count: 3 }, { type: 'BASIC', count: 8 }],
        waveStrength: 1.0,
        modifiers: [],
        bossType: null,
        x: 290, y: 690,
        children: ['b1_rock', 'b1_thunder'],
        requires: ['origin'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b1_rock',
        type: 'CONVERGENCE',
        title: 'The Rock Kingdom Falls',
        icon: '⛰️',
        strand: 'B',
        narrative: 'In another timeline, Earth never held. The Rock Kingdom crumbled — not to enemies, but to neglect. Time witnesses its fall through the fracture.\n\nA kingdom no one chose to defend.',
        biome: 'rock',
        enemyOverride: [{ type: 'TANK', count: 8 }, { type: 'BASIC', count: 10 }, { type: 'BOMBER', count: 4 }],
        waveStrength: 1.1,
        modifiers: [],
        bossType: null,
        x: 490, y: 560,
        children: ['b2_chaos', 'b2_spirit'],
        requires: ['gate_b'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b1_thunder',
        type: 'CONVERGENCE',
        title: 'The Silent Storm',
        icon: '⚡',
        strand: 'B',
        narrative: "The Tournament of Thunder never happened. Lightning died in silence, alone, believing no one would remember him. His echo fills the void with rage.\n\nForgotten heroes become dangerous echoes.",
        biome: 'lightning',
        enemyOverride: [{ type: 'FAST', count: 10 }, { type: 'SHOOTER', count: 8 }, { type: 'BASIC', count: 8 }],
        waveStrength: 1.15,
        modifiers: [],
        bossType: null,
        x: 490, y: 760,
        children: ['b2_chaos', 'b2_wind'],
        requires: ['gate_b'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b2_chaos',
        type: 'CONVERGENCE',
        title: 'When Chaos Reigned',
        icon: '🌌',
        strand: 'B',
        narrative: 'A timeline where Gravity lost control. Chaos consumed everything — the dimension distorted beyond recognition, heroes consumed, enemies everywhere at once.\n\nThis is what happens when the center does not hold.',
        biome: 'chaos',
        enemyOverride: [{ type: 'FLANKER', count: 12 }, { type: 'FAST', count: 10 }, { type: 'BOMBER', count: 8 }],
        waveStrength: 1.3,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 700, y: 600,
        children: ['b3_spirit', 'b3_sound'],
        requires: ['b1_rock', 'b1_thunder'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b2_spirit',
        type: 'CONVERGENCE',
        title: "Fortune's Other Side",
        icon: '🎰',
        strand: 'B',
        narrative: 'Spirit and Chance diverged. In this path, Chance won — and without balance, fortune became cruelty. The battlefield holds no pattern, no mercy.\n\nLuck without wisdom is just suffering.',
        biome: 'temple',
        enemyOverride: [{ type: 'BASIC', count: 8 }, { type: 'SHOOTER', count: 8 }, { type: 'FAST', count: 8 }, { type: 'BOMBER', count: 5 }],
        waveStrength: 1.35,
        modifiers: [],
        bossType: null,
        x: 700, y: 790,
        children: ['b3_spirit', 'b3_sound'],
        requires: ['b1_rock'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b2_wind',
        type: 'CONVERGENCE',
        title: 'The Sky That Fell',
        icon: '🌪️',
        strand: 'B',
        narrative: "Air's Sky Palace vanished overnight. No battle, no explosion — just gone. Time searches the fractured sky for what erased it.\n\nSome things disappear quietly, which makes them more terrifying.",
        biome: 'air',
        enemyOverride: [{ type: 'FAST', count: 14 }, { type: 'FLANKER', count: 8 }, { type: 'BASIC', count: 10 }],
        waveStrength: 1.2,
        modifiers: ['HIGH_SPEED'],
        bossType: null,
        x: 700, y: 950,
        children: ['b3_sound', 'b3_sickness'],
        requires: ['b1_thunder'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b3_spirit',
        type: 'STORY',
        title: 'The Fallen Heroes',
        icon: '📜',
        strand: 'B',
        narrative: "Fire, Water, Earth, Lightning, Gravity, Air, Spirit — in some timelines, they all failed. Time stands over their echoes, wondering why he alone remains.\n\nPerhaps he is the last one because he is the one who broke everything.",
        biome: 'time',
        enemyOverride: [{ type: 'TANK', count: 12 }, { type: 'SHOOTER', count: 8 }, { type: 'BASIC', count: 16 }],
        waveStrength: 1.6,
        modifiers: [],
        bossType: null,
        x: 910, y: 580,
        children: ['b4_fallen', 'b4_alternate'],
        requires: ['b2_chaos', 'b2_spirit'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'memory', value: 'time_memory_18' },
    },
    {
        id: 'b3_sound',
        type: 'CONVERGENCE',
        title: 'The Dying Symphony',
        icon: '🎵',
        strand: 'B',
        narrative: "Sound's music stopped. Not silenced — but forgotten. When no one listens, the beat dies. Poison filled the silence left behind.\n\nA world without rhythm falls apart differently than a world without light.",
        biome: 'poison',
        enemyOverride: [{ type: 'BASIC', count: 14 }, { type: 'TANK', count: 6 }, { type: 'BOMBER', count: 6 }],
        waveStrength: 1.3,
        modifiers: ['POISON_AURA'],
        bossType: null,
        x: 910, y: 760,
        children: ['b4_fallen', 'b3_sickness'],
        requires: ['b2_wind', 'b2_chaos'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b3_sickness',
        type: 'COMBAT',
        title: 'Poison and Sound United',
        icon: '⚗️',
        strand: 'B',
        narrative: 'In one timeline, Sound turned and joined Poison. Together they became something neither could be alone — a symphony of decay.\n\nThe rhythm is wrong, but it still pulls you in.',
        biome: 'poison',
        enemyOverride: [{ type: 'FAST', count: 15 }, { type: 'SHOOTER', count: 10 }, { type: 'BOMBER', count: 8 }],
        waveStrength: 1.5,
        modifiers: ['POISON_AURA', 'DENSE_SPAWN'],
        bossType: null,
        x: 910, y: 950,
        children: ['d3_poison_sound'],
        requires: ['b2_wind'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b4_fallen',
        type: 'STORY',
        title: 'The Echo Council',
        icon: '👥',
        strand: 'B',
        narrative: 'All hero echoes converge. Fire, Water, Air, Earth, Spirit, Sound, Lightning — all present, all broken, all watching Time.\n\nWhat he does next will define all their fates.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 22 }, { type: 'FAST', count: 12 }, { type: 'SHOOTER', count: 10 }, { type: 'TANK', count: 8 }, { type: 'FLANKER', count: 6 }],
        waveStrength: 1.9,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 1120, y: 590,
        children: ['b5_heroes'],
        requires: ['b3_spirit', 'b3_sound'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'maxHp', value: 30 },
    },
    {
        id: 'b4_alternate',
        type: 'DISCOVERY',
        title: 'The Alternate Victory',
        icon: '🏆',
        strand: 'B',
        narrative: "A world where Makuta was defeated without Time. The heroes celebrated, unaware that the real war — for the integrity of time itself — had not yet begun.\n\nA victory can still be a prelude to collapse.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 20 }, { type: 'FAST', count: 10 }],
        waveStrength: 1.4,
        modifiers: [],
        bossType: null,
        x: 1120, y: 780,
        children: ['b5_heroes', 'c4_revelation'],
        requires: ['b3_spirit'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'b5_heroes',
        type: 'CONVERGENCE',
        title: 'The Final Assembly',
        icon: '🌟',
        strand: 'B',
        narrative: 'Every echo of every hero stands together for the last time. They have all seen what Time carries. They choose, in this moment, to stand beside him anyway.\n\nHe has never deserved it less. They have never given it more freely.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 24 }, { type: 'FAST', count: 14 }, { type: 'SHOOTER', count: 10 }, { type: 'TANK', count: 8 }],
        waveStrength: 2.0,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 1330, y: 670,
        children: ['omega1', 'e1_hint'],
        requires: ['b4_fallen'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'maxHp', value: 30 },
    },

    // ─── STRAND C: DIVERGENT FUTURES ─────────────────────────────────────────
    {
        id: 'c1_whatif',
        type: 'DISCOVERY',
        title: 'What If?',
        icon: '❓',
        strand: 'C',
        narrative: 'A node in the maze that leads into the void — a path not yet written. Time peers into the emptiness and sees possibilities flickering like candle flames in a windstorm.\n\nEvery choice carves a new scar in the timeline.',
        biome: 'void',
        enemyOverride: [{ type: 'FAST', count: 10 }, { type: 'FLANKER', count: 8 }],
        waveStrength: 1.1,
        modifiers: [],
        bossType: null,
        x: 700, y: 470,
        children: ['c2_conquered', 'c2_mask'],
        requires: ['a1_echo'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'c2_conquered',
        type: 'COMBAT',
        title: 'The Conquered World',
        icon: '🌑',
        strand: 'C',
        narrative: 'A timeline where enemies never stopped. No hero strong enough to turn the tide. The world is silent now — controlled, cold, and waiting for the final end.\n\nThis is what failure looks like from the inside.',
        biome: 'void',
        enemyOverride: [{ type: 'TANK', count: 12 }, { type: 'BOMBER', count: 8 }, { type: 'BASIC', count: 20 }],
        waveStrength: 1.8,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 910, y: 540,
        children: ['c3_secret', 'd1_makuta'],
        requires: ['c1_whatif'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'c2_mask',
        type: 'DISCOVERY',
        title: 'The Golden Path',
        icon: '🏅',
        strand: 'C',
        narrative: 'A path that glimmers with possibility. The true golden mask exists — not as myth or legend, but as a destination reachable through this fracture.\n\nSome treasures can only be found by those who stop running.',
        biome: 'temple',
        enemyOverride: [{ type: 'BASIC', count: 8 }, { type: 'SHOOTER', count: 6 }, { type: 'FAST', count: 6 }],
        waveStrength: 1.2,
        modifiers: [],
        bossType: null,
        x: 910, y: 730,
        children: ['c3_mask_truth'],
        requires: ['c1_whatif'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'gold', value: 80 },
    },
    {
        id: 'c3_secret',
        type: 'STORY',
        title: "Makuta's True Origin",
        icon: '🕵️',
        strand: 'C',
        narrative: "In this path, Makuta was not born evil. He was made that way — by a fracture in the timeline. By Time himself.\n\nThe revelation does not excuse what was done. It only explains what was caused.",
        biome: 'void',
        enemyOverride: [{ type: 'BOMBER', count: 10 }, { type: 'TANK', count: 8 }, { type: 'SHOOTER', count: 8 }],
        waveStrength: 1.7,
        modifiers: [],
        bossType: null,
        x: 1120, y: 450,
        children: ['c4_revelation'],
        requires: ['c2_conquered'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'memory', value: 'time_memory_19' },
    },
    {
        id: 'c3_mask_truth',
        type: 'BOSS',
        title: 'Guardian of the Mask',
        icon: '🛡️',
        strand: 'C',
        narrative: 'The true golden mask is guarded by a construct of pure time — a creature that has waited since the first fracture for someone worthy enough to claim it.\n\nIt will not yield to power alone.',
        biome: 'temple',
        enemyOverride: null,
        waveStrength: 1.8,
        modifiers: ['BOSS_WAVE'],
        bossType: 'MASK_GUARDIAN',
        x: 1120, y: 730,
        children: ['c4_revelation'],
        requires: ['c2_mask'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'goldenMask', value: true },
    },
    {
        id: 'c4_revelation',
        type: 'STORY',
        title: 'The Revelation',
        icon: '💡',
        strand: 'C',
        narrative: 'He has seen too many paths. Too many alternatives. Every version of the future contains the same truth — he is the cause of his own suffering, and that of everyone he loves.\n\nKnowing this changes nothing. And everything.',
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 16 }, { type: 'FAST', count: 12 }, { type: 'TANK', count: 8 }],
        waveStrength: 2.0,
        modifiers: [],
        bossType: null,
        x: 1330, y: 500,
        children: ['omega1', 'e2_memory'],
        requires: ['c3_secret', 'c3_mask_truth', 'b4_alternate'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'memory', value: 'time_memory_20' },
    },

    // ─── STRAND D: MAJOR ENCOUNTERS ──────────────────────────────────────────
    {
        id: 'd1_makuta',
        type: 'BOSS',
        title: "Makuta's Echo",
        icon: '👁️',
        strand: 'D',
        narrative: "An echo of Makuta — not the real one, but powerful enough. He has found the fractures and seeks to exploit them, to enter a timeline where he already won.\n\nTime cannot let that happen.",
        biome: 'void',
        enemyOverride: null,
        waveStrength: 1.8,
        modifiers: ['BOSS_WAVE'],
        bossType: 'MAKUTA_ECHO',
        x: 1120, y: 860,
        children: ['d2_goblin', 'hunt4'],
        requires: ['a3_sandstorm', 'c2_conquered'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'maxHp', value: 40 },
    },
    {
        id: 'd2_goblin',
        type: 'BOSS',
        title: 'The Green Goblin Returns',
        icon: '🃏',
        strand: 'D',
        narrative: "He followed the fractures here. Green Goblin, always drawn to chaos, has found a perfect hunting ground — a timeline where consequences don't exist.\n\nHe is not here to win. He is here because he enjoys this.",
        biome: 'time',
        enemyOverride: null,
        waveStrength: 2.0,
        modifiers: ['BOSS_WAVE'],
        bossType: 'GREEN_GOBLIN',
        x: 1330, y: 850,
        children: ['d3_poison_sound', 'hunt5'],
        requires: ['d1_makuta'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'damage', value: 0.15 },
    },
    {
        id: 'd3_poison_sound',
        type: 'COMBAT',
        title: 'Poison and Sound — United',
        icon: '🎵',
        strand: 'D',
        narrative: 'Two corrupted echoes — Poison and Sound — have merged across the timeline fracture. Their combined attack is unlike anything Time has faced.\n\nDecay and rhythm. A symphony of ending.',
        biome: 'poison',
        enemyOverride: [{ type: 'FAST', count: 20 }, { type: 'SHOOTER', count: 15 }, { type: 'BOMBER', count: 10 }],
        waveStrength: 2.2,
        modifiers: ['DENSE_SPAWN', 'POISON_AURA'],
        bossType: null,
        x: 1540, y: 800,
        children: ['d4_black'],
        requires: ['d2_goblin', 'b3_sickness'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'speed', value: 0.15 },
    },
    {
        id: 'd4_black',
        type: 'COMPANION',
        title: 'Black Steps Forward',
        icon: '🌑',
        strand: 'D',
        narrative: "Black has been watching from the void. He never shows himself unless the timeline is truly threatened. For the first time, he steps forward as an ally.\n\nHe doesn't say why. He doesn't need to.",
        biome: 'void',
        enemyOverride: [{ type: 'BASIC', count: 25 }, { type: 'TANK', count: 10 }, { type: 'SHOOTER', count: 12 }, { type: 'FAST', count: 15 }],
        waveStrength: 2.3,
        modifiers: ['BLACK_COMPANION', 'DENSE_SPAWN'],
        bossType: null,
        x: 1750, y: 730,
        children: ['omega1'],
        requires: ['d3_poison_sound'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'maxHp', value: 50 },
    },

    // ─── STRAND E: LOVE'S THREAD ──────────────────────────────────────────────
    {
        id: 'e1_hint',
        type: 'DISCOVERY',
        title: 'A Presence in the Fractures',
        icon: '💗',
        strand: 'E',
        narrative: "Something moves through the cracks — not violent, not powerful, but... warm. Time feels it.\n\nA presence that should not exist in these fractured timelines. Something that doesn't fight. Something that simply stays.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 8 }, { type: 'FAST', count: 8 }],
        waveStrength: 1.2,
        modifiers: [],
        bossType: null,
        x: 1540, y: 960,
        children: ['e2_memory'],
        requires: ['a6_truth', 'b5_heroes'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'memory', value: 'time_memory_14' },
    },
    {
        id: 'e2_memory',
        type: 'STORY',
        title: 'Her Memory',
        icon: '💝',
        strand: 'E',
        narrative: "A fragment of a life he destroyed. A woman who waited, who hoped, who was never told the truth. Her love persists even through the fractures — unchanged, unchanging.\n\nHe broke time. She held together.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 6 }, { type: 'FAST', count: 6 }],
        waveStrength: 0.9,
        modifiers: [],
        bossType: null,
        x: 1750, y: 920,
        children: ['e3_unlock'],
        requires: ['e1_hint', 'c4_revelation'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'memory', value: 'time_memory_15' },
    },
    {
        id: 'e3_unlock',
        type: 'HIDDEN',
        title: 'Love, Found',
        icon: '💖',
        strand: 'E',
        narrative: "She was always here. In every timeline. In every fracture. The Love hero was never hidden — she was waiting for the moment Time would stop running and finally see her.\n\nShe is unlocked now. And she has her own story to tell.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 5 }],
        waveStrength: 0.7,
        modifiers: ['NARRATIVE_ONLY'],
        bossType: null,
        x: 1960, y: 820,
        children: ['f1_herstory', 'omega_love'],
        requires: ['e2_memory'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'unlockHero', value: 'love' },
    },

    // ─── STRAND F: LOVE'S PATH ────────────────────────────────────────────────
    {
        id: 'f1_herstory',
        type: 'STORY',
        title: 'Her Story',
        icon: '💗',
        strand: 'F',
        narrative: "She didn't know. She trusted completely. Every absence was explained away, every late night given a reason. She built a life on foundations he had hollowed out.\n\nShe called it love. He called it comfort.",
        biome: 'love',
        enemyOverride: [{ type: 'BASIC', count: 6 }, { type: 'FAST', count: 6 }, { type: 'SHOOTER', count: 4 }],
        waveStrength: 1.0,
        modifiers: [],
        bossType: null,
        x: 1960, y: 660,
        children: ['f2_broken'],
        requires: ['e3_unlock'],
        requiresAny: false,
        heroOnly: 'love',
        huntingId: null,
        reward: null,
    },
    {
        id: 'f2_broken',
        type: 'STORY',
        title: 'The Broken Heart',
        icon: '💔',
        strand: 'F',
        narrative: "The moment of discovery. The fracture is not just in time — it is in her. Everything she built, everything she believed, shattered in a single moment of clarity.\n\nHe made time fracture. She found out why.",
        biome: 'love',
        enemyOverride: [{ type: 'BOMBER', count: 8 }, { type: 'FAST', count: 12 }, { type: 'SHOOTER', count: 8 }],
        waveStrength: 1.5,
        modifiers: [],
        bossType: null,
        x: 2170, y: 680,
        children: ['omega_love'],
        requires: ['f1_herstory'],
        requiresAny: false,
        heroOnly: 'love',
        huntingId: null,
        reward: { type: 'memory', value: 'love_memory_special' },
    },

    // ─── HUNTING LIST NODES ───────────────────────────────────────────────────
    {
        id: 'hunt1',
        type: 'FORMIDABLE_FOE',
        title: 'The Ancient Wraith',
        icon: '💀',
        strand: 'HUNT',
        narrative: "A Time Wraith that has existed since the first fracture. Older than memory, it cannot truly be killed — only temporarily dispersed.\n\nEvery hunter who faces it grows stronger. Every hunter who falls feeds it.",
        biome: 'time',
        enemyOverride: null,
        waveStrength: 3.0,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'TIME_WRAITH',
        x: 1120, y: 1000,
        children: [],
        requires: ['a3_wraith'],
        requiresAny: false,
        heroOnly: null,
        huntingId: 'ancient_wraith',
        reward: { type: 'huntingBuff', value: { maxHp: 20, damage: 0.05 } },
    },
    {
        id: 'hunt2',
        type: 'FORMIDABLE_FOE',
        title: 'The Chrome Leviathan',
        icon: '🦕',
        strand: 'HUNT',
        narrative: "A mechanical titan assembled from the wreckage of a thousand timelines. Its armor is plated with moments that never happened.\n\nIt moves through time as water moves through rock. Slowly. Inevitably.",
        biome: 'time',
        enemyOverride: null,
        waveStrength: 3.5,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'CHROME_LEVIATHAN',
        x: 1330, y: 1000,
        children: [],
        requires: ['a4_fracture', 'hunt1'],
        requiresAny: true,
        heroOnly: null,
        huntingId: 'chrome_leviathan',
        reward: { type: 'huntingBuff', value: { damage: 0.1, cooldown: 0.05 } },
    },
    {
        id: 'hunt3',
        type: 'FORMIDABLE_FOE',
        title: 'The Temporal Warden',
        icon: '⚖️',
        strand: 'HUNT',
        narrative: "Enforcer of the original timeline. It seeks to erase every paradox — including Time himself. Its existence predates the fractures. It wants them sealed, permanently.\n\nIf it succeeds, there is no Maze of Time. There is nothing.",
        biome: 'time',
        enemyOverride: null,
        waveStrength: 4.0,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'TEMPORAL_WARDEN',
        x: 1540, y: 1000,
        children: [],
        requires: ['hunt2', 'b4_fallen'],
        requiresAny: true,
        heroOnly: null,
        huntingId: 'temporal_warden',
        reward: { type: 'huntingBuff', value: { defense: 0.08, speed: 0.1 } },
    },
    {
        id: 'hunt4',
        type: 'FORMIDABLE_FOE',
        title: 'Makuta Prime',
        icon: '👁️',
        strand: 'HUNT',
        narrative: "Not an echo. The real Makuta, who has found a way to walk through the fractures. He doesn't seek to win — he seeks to unmake the idea of victory.\n\nFighting him is fighting despair itself.",
        biome: 'void',
        enemyOverride: null,
        waveStrength: 4.5,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'MAKUTA_ECHO',
        x: 1750, y: 960,
        children: [],
        requires: ['d1_makuta', 'hunt3'],
        requiresAny: true,
        heroOnly: null,
        huntingId: 'makuta_prime',
        reward: { type: 'huntingBuff', value: { damage: 0.1, maxHp: 30 } },
    },
    {
        id: 'hunt5',
        type: 'FORMIDABLE_FOE',
        title: 'The Chaos Engine',
        icon: '⚙️',
        strand: 'HUNT',
        narrative: "Born from Gravity's descent into madness, the Chaos Engine exists to demonstrate that structure is an illusion. It warps terrain, reverses damage, and multiplies endlessly.\n\nThere is no strategy against it. Only endurance.",
        biome: 'chaos',
        enemyOverride: null,
        waveStrength: 4.0,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'GREEN_GOBLIN',
        x: 1540, y: 1060,
        children: [],
        requires: ['d2_goblin', 'hunt2'],
        requiresAny: true,
        heroOnly: null,
        huntingId: 'chaos_engine',
        reward: { type: 'huntingBuff', value: { speed: 0.12, cooldown: 0.08 } },
    },
    {
        id: 'hunt6',
        type: 'FORMIDABLE_FOE',
        title: 'The Thunder Titan',
        icon: '⚡',
        strand: 'HUNT',
        narrative: "Zeus was never the strongest lightning being. The Thunder Titan is what remains when the tournament ends and the champion goes unchallenged for an eternity.\n\nLightning without purpose becomes destruction.",
        biome: 'lightning',
        enemyOverride: null,
        waveStrength: 3.8,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'BOSS_THUNDER',
        x: 1960, y: 950,
        children: [],
        requires: ['b1_thunder', 'hunt3'],
        requiresAny: true,
        heroOnly: null,
        huntingId: 'thunder_titan',
        reward: { type: 'huntingBuff', value: { damage: 0.08, maxHp: 25 } },
    },
    {
        id: 'hunt7',
        type: 'FORMIDABLE_FOE',
        title: 'The Spirit Revenant',
        icon: '🔮',
        strand: 'HUNT',
        narrative: "A Spirit hero who never found balance. He absorbed too much chaos, too much luck. Now he is an unpredictable force that even Time cannot anticipate.\n\nFighting him is like fighting a die that keeps rolling.",
        biome: 'temple',
        enemyOverride: null,
        waveStrength: 4.2,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'BOSS_SPIRIT',
        x: 2170, y: 870,
        children: [],
        requires: ['b3_spirit', 'hunt4'],
        requiresAny: true,
        heroOnly: null,
        huntingId: 'spirit_revenant',
        reward: { type: 'huntingBuff', value: { luck: 0.02, defense: 0.08 } },
    },

    // ─── FINALE ───────────────────────────────────────────────────────────────
    {
        id: 'omega1',
        type: 'STORY',
        title: 'All Timelines Converge',
        icon: '🌟',
        strand: 'OMEGA',
        narrative: "The fractures stop spreading. All paths through the maze have been walked. Time stands at the point where everything converges — past and future collapsing into a single moment.\n\nThis was always coming. He just didn't know he was the one bringing it.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 20 }, { type: 'FAST', count: 15 }, { type: 'TANK', count: 12 }, { type: 'SHOOTER', count: 10 }, { type: 'BOMBER', count: 8 }],
        waveStrength: 2.5,
        modifiers: ['DENSE_SPAWN'],
        bossType: null,
        x: 1960, y: 320,
        children: ['omega2_boss'],
        requires: ['a7_last', 'a6_conv', 'd4_black', 'b5_heroes', 'c4_revelation'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: null,
    },
    {
        id: 'omega2_boss',
        type: 'FINALE',
        title: 'The Eternal Collapse',
        icon: '💫',
        strand: 'OMEGA',
        narrative: "Reality itself has become the enemy. The Eternal Collapse is not a being — it is the consequence of every fracture, every paradox, every lie he told.\n\nTime must face what he created. There is no timeline where this does not happen.",
        biome: 'time',
        enemyOverride: null,
        waveStrength: 5.0,
        modifiers: ['BOSS_WAVE', 'ELITE'],
        bossType: 'ETERNAL_COLLAPSE',
        x: 2170, y: 280,
        children: ['omega_end'],
        requires: ['omega1'],
        requiresAny: false,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'completion', value: 'eternal_collapse' },
    },
    {
        id: 'omega_love',
        type: 'FINALE',
        title: 'Heart of Unity',
        icon: '💖',
        strand: 'OMEGA',
        narrative: "Love's path to the finale. She does not destroy the Eternal Collapse — she heals it.\n\nWhere Time fractures, Love mends. The ending is not a battle. It is a reunion.",
        biome: 'love',
        enemyOverride: null,
        waveStrength: 3.5,
        modifiers: ['BOSS_WAVE'],
        bossType: 'ETERNAL_COLLAPSE',
        x: 2170, y: 520,
        children: ['omega_end'],
        requires: ['f2_broken', 'e3_unlock'],
        requiresAny: true,
        heroOnly: 'love',
        huntingId: null,
        reward: { type: 'completion', value: 'heart_of_unity' },
    },
    {
        id: 'omega_end',
        type: 'STORY',
        title: 'The Silence After',
        icon: '⭐',
        strand: 'OMEGA',
        narrative: "It is over. The timelines are still. For the first time in his existence, Time has nowhere to run. No future to flee to. No past to hide in.\n\nOnly now. Only this. Only what remains.",
        biome: 'time',
        enemyOverride: [{ type: 'BASIC', count: 3 }],
        waveStrength: 0.5,
        modifiers: ['NARRATIVE_ONLY'],
        bossType: null,
        x: 2400, y: 420,
        children: [],
        requires: ['omega2_boss', 'omega_love'],
        requiresAny: true,
        heroOnly: null,
        huntingId: null,
        reward: { type: 'completion', value: 'true_ending' },
    },
];

// ─── HUNTING LIST ─────────────────────────────────────────────────────────────
// The 7 Formidable Foes — persistent boss tracker alongside the map.
// Defeating all 7 grants a permanent super buff for all Time hero runs.
const HUNTING_LIST = [
    { id: 'ancient_wraith',   nodeId: 'hunt1', title: 'The Ancient Wraith',    icon: '💀', buff: '+20 Max HP, +5% Damage' },
    { id: 'chrome_leviathan', nodeId: 'hunt2', title: 'The Chrome Leviathan',  icon: '🦕', buff: '+10% Damage, -5% Cooldown' },
    { id: 'temporal_warden',  nodeId: 'hunt3', title: 'The Temporal Warden',   icon: '⚖️', buff: '+8% Defense, +10% Speed' },
    { id: 'makuta_prime',     nodeId: 'hunt4', title: 'Makuta Prime',           icon: '👁️', buff: '+10% Damage, +30 Max HP' },
    { id: 'chaos_engine',     nodeId: 'hunt5', title: 'The Chaos Engine',       icon: '⚙️', buff: '+12% Speed, -8% Cooldown' },
    { id: 'thunder_titan',    nodeId: 'hunt6', title: 'The Thunder Titan',      icon: '⚡', buff: '+8% Damage, +25 Max HP' },
    { id: 'spirit_revenant',  nodeId: 'hunt7', title: 'The Spirit Revenant',    icon: '🔮', buff: '+2% Luck, +8% Defense' },
];

// ─── MAZE OF TIME ─────────────────────────────────────────────────────────────
class MazeOfTime {
    static SAVE_KEY = 'maze_of_time_v1';

    // ─── State Persistence ────────────────────────────────────────────────────
    static getState() {
        try {
            const raw = localStorage.getItem(MazeOfTime.SAVE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return {
            version: 1,
            completed: [],       // node IDs completed in any run
            discovered: [],      // node IDs that are visible (parents done)
            huntingDefeated: [], // hunting IDs confirmed defeated
            allHuntingBonus: false,
        };
    }

    static saveState(state) {
        try {
            localStorage.setItem(MazeOfTime.SAVE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }

    // ─── Node Queries ─────────────────────────────────────────────────────────
    static getNodeById(id) {
        return MAZE_NODES.find(n => n.id === id) || null;
    }

    static isCompleted(nodeId, state) {
        return state.completed.includes(nodeId);
    }

    static isDiscovered(nodeId, state) {
        return state.discovered.includes(nodeId) || state.completed.includes(nodeId);
    }

    // A node is AVAILABLE for selection if:
    // 1. Discovered (at least one parent completed)
    // 2. Not yet completed
    // 3. Hero requirement met (null = any hero, 'love' = love hero only)
    static isAvailable(nodeId, state, heroType) {
        const node = MazeOfTime.getNodeById(nodeId);
        if (!node) return false;
        if (state.completed.includes(nodeId)) return false;
        if (!state.discovered.includes(nodeId) && !state.completed.includes(nodeId)) {
            // Auto-discover if all requires are met (or requiresAny and one is met)
            if (!MazeOfTime._parentsMet(node, state)) return false;
        }
        if (node.heroOnly && node.heroOnly !== heroType) return false;
        return true;
    }

    static _parentsMet(node, state) {
        if (node.requires.length === 0) return true;
        if (node.requiresAny) {
            return node.requires.some(r => state.completed.includes(r));
        }
        return node.requires.every(r => state.completed.includes(r));
    }

    // Discover children of a completed node (call after marking complete)
    static _discoverChildren(node, state) {
        for (const childId of node.children) {
            const child = MazeOfTime.getNodeById(childId);
            if (!child) continue;
            if (state.discovered.includes(childId) || state.completed.includes(childId)) continue;
            // Discover this child if parents are met
            if (MazeOfTime._parentsMet(child, state)) {
                state.discovered.push(childId);
            }
        }
    }

    // Mark a node complete; discover children; save
    static completeNode(nodeId) {
        const state = MazeOfTime.getState();
        const node = MazeOfTime.getNodeById(nodeId);
        if (!node) return state;

        if (!state.completed.includes(nodeId)) {
            state.completed.push(nodeId);
        }

        // Handle hunting buff
        if (node.huntingId && !state.huntingDefeated.includes(node.huntingId)) {
            state.huntingDefeated.push(node.huntingId);
            MazeOfTime._applyHuntingBuff(node);
        }

        // Handle special rewards
        if (node.reward) MazeOfTime._applyReward(node.reward);

        // Discover children
        MazeOfTime._discoverChildren(node, state);

        // Check all-hunting bonus
        if (!state.allHuntingBonus && HUNTING_LIST.every(h => state.huntingDefeated.includes(h.id))) {
            state.allHuntingBonus = true;
            MazeOfTime._applyAllHuntingBonus();
        }

        MazeOfTime.saveState(state);

        // Update current run tracking
        window.mazeCurrentNode = null;
        window.mazeCurrentNodeId = null;

        return state;
    }

    // Get nodes the player can pick next from the given completed node (or from start)
    static getAvailableFrom(completedNodeId, heroType) {
        const state = MazeOfTime.getState();
        const node = completedNodeId ? MazeOfTime.getNodeById(completedNodeId) : null;

        // After completing a node, children of that node are the natural next choices
        // Plus any other discovered, non-completed nodes
        const options = [];
        const allDiscovered = [...state.discovered, ...state.completed];

        for (const n of MAZE_NODES) {
            if (state.completed.includes(n.id)) continue;
            if (!MazeOfTime._parentsMet(n, state) && !state.discovered.includes(n.id)) continue;
            if (n.heroOnly && n.heroOnly !== heroType) continue;
            options.push(n);
        }

        return options;
    }

    // Set node as active for this wave
    static selectNode(nodeId) {
        window.mazeCurrentNode = MazeOfTime.getNodeById(nodeId);
        window.mazeCurrentNodeId = nodeId;
        return window.mazeCurrentNode;
    }

    // Apply node combat params to the current wave
    // Returns { enemyTypePool, waveStrengthMult, bossType, modifiers }
    static getWaveParams(nodeId) {
        const node = MazeOfTime.getNodeById(nodeId);
        if (!node) return null;

        let enemyTypePool = null;
        if (node.enemyOverride) {
            // Build weighted pool from override
            enemyTypePool = [];
            for (const entry of node.enemyOverride) {
                for (let i = 0; i < entry.count; i++) {
                    enemyTypePool.push(entry.type);
                }
            }
            // Shuffle the pool
            for (let i = enemyTypePool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [enemyTypePool[i], enemyTypePool[j]] = [enemyTypePool[j], enemyTypePool[i]];
            }
        }

        return {
            enemyTypePool,
            waveStrengthMult: node.waveStrength,
            bossType: node.bossType,
            modifiers: node.modifiers || [],
        };
    }

    // ─── Hunting List ─────────────────────────────────────────────────────────
    static getHuntingStatus() {
        const state = MazeOfTime.getState();
        return HUNTING_LIST.map(h => ({
            ...h,
            defeated: state.huntingDefeated.includes(h.id),
            available: MazeOfTime.isAvailable(h.nodeId, state, 'time') ||
                       MazeOfTime.isAvailable(h.nodeId, state, 'love'),
        }));
    }

    // ─── Rewards ─────────────────────────────────────────────────────────────
    static _applyReward(reward) {
        if (!window.player) return;
        switch (reward.type) {
            case 'maxHp':
                window.player.maxHp = (window.player.maxHp || 100) + reward.value;
                window.player.hp = Math.min(window.player.maxHp, (window.player.hp || 0) + reward.value);
                break;
            case 'damage':
                window.player.damageMultiplier = (window.player.damageMultiplier || 1) + reward.value;
                break;
            case 'speed':
                window.player.speedMultiplier = (window.player.speedMultiplier || 1) + reward.value;
                break;
            case 'chronoEnergy':
                if (typeof window.player.chronoEnergy !== 'undefined') {
                    window.player.chronoEnergy = Math.min(100, (window.player.chronoEnergy || 0) + reward.value);
                }
                break;
            case 'gold':
                window.player.gold = (window.player.gold || 0) + reward.value;
                break;
            case 'unlockHero':
                if (typeof saveData !== 'undefined' && saveData[reward.value]) {
                    saveData[reward.value].unlocked = 1;
                    if (window.saveGame) window.saveGame();
                }
                if (window.showNotification) window.showNotification(`💖 ${reward.value.toUpperCase()} hero unlocked!`);
                break;
            case 'memory':
                if (window.showNotification) window.showNotification(`📜 Memory shard collected`);
                break;
            case 'completion':
                if (window.showNotification) window.showNotification(`⭐ ${reward.value === 'true_ending' ? 'True Ending reached!' : 'Chapter complete!'}`);
                break;
        }
    }

    static _applyHuntingBuff(node) {
        if (!node.reward || !node.reward.value || !window.player) return;
        const buff = node.reward.value;
        if (buff.maxHp)    { window.player.maxHp += buff.maxHp; window.player.hp = Math.min(window.player.maxHp, window.player.hp + buff.maxHp); }
        if (buff.damage)   { window.player.damageMultiplier = (window.player.damageMultiplier || 1) + buff.damage; }
        if (buff.speed)    { window.player.speedMultiplier = (window.player.speedMultiplier || 1) + buff.speed; }
        if (buff.defense)  { window.player.damageReduction = Math.min(0.5, (window.player.damageReduction || 0) + buff.defense); }
        if (buff.cooldown) { window.player.cooldownMultiplier = (window.player.cooldownMultiplier || 1) * (1 - buff.cooldown); }
        if (buff.luck)     { window.player.maskChance = (window.player.maskChance || 0) + buff.luck; }
        if (window.showNotification) window.showNotification(`💀 ${node.title} defeated! Permanent buff applied.`);
    }

    static _applyAllHuntingBonus() {
        if (window.showNotification) window.showNotification(`🏆 ALL FORMIDABLE FOES DEFEATED! Eternal Hunter bonus active.`);
        // Persistent flag — picked up in player init via saveData
        try {
            const hunterData = JSON.parse(localStorage.getItem('maze_hunter_complete') || '{}');
            hunterData.complete = true;
            localStorage.setItem('maze_hunter_complete', JSON.stringify(hunterData));
        } catch (e) { /* ignore */ }
    }

    // ─── Initialization ───────────────────────────────────────────────────────
    // Called on game start for Time hero: seeds initial discovered nodes
    static initForRun() {
        const state = MazeOfTime.getState();
        // Always discover origin if nothing completed
        if (state.completed.length === 0 && !state.discovered.includes('origin')) {
            state.discovered.push('origin');
        }
        // Discover children of all completed nodes
        for (const completedId of state.completed) {
            const node = MazeOfTime.getNodeById(completedId);
            if (node) MazeOfTime._discoverChildren(node, state);
        }
        MazeOfTime.saveState(state);
        return state;
    }

    // Reset all progress (debug / new game+)
    static resetAll() {
        localStorage.removeItem(MazeOfTime.SAVE_KEY);
        window.mazeCurrentNode = null;
        window.mazeCurrentNodeId = null;
    }

    // ─── Enemy Spawn Pool Access ──────────────────────────────────────────────
    // Call this to pick the next enemy type when a maze node is active
    static pickNextEnemyType() {
        const node = window.mazeCurrentNode;
        if (!node || !node.enemyOverride) return null;

        if (!window._mazeEnemyPool) {
            // Build pool on first call for this wave
            window._mazeEnemyPool = [];
            for (const entry of node.enemyOverride) {
                for (let i = 0; i < Math.ceil(entry.count / 2); i++) {
                    window._mazeEnemyPool.push(entry.type);
                }
            }
            window._mazeEnemyPoolIdx = 0;
        }

        if (window._mazeEnemyPoolIdx >= window._mazeEnemyPool.length) {
            window._mazeEnemyPoolIdx = 0;
        }

        return window._mazeEnemyPool[window._mazeEnemyPoolIdx++];
    }

    // Clear enemy pool on wave start/end
    static clearEnemyPool() {
        window._mazeEnemyPool = null;
        window._mazeEnemyPoolIdx = 0;
    }
}

window.MazeOfTime = MazeOfTime;
window.MAZE_NODES = MAZE_NODES;
window.HUNTING_LIST = HUNTING_LIST;
window.mazeCurrentNode = null;
window.mazeCurrentNodeId = null;
window._mazeEnemyPool = null;
window._mazeEnemyPoolIdx = 0;

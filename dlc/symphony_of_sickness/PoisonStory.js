/*
    POISON HERO — "THE GREAT INFECTION"
    The Plague-Bringer's world conquest through corruption.
    Arc 1: Home (Poison biome) — the sickness learns itself.
    Arc 2: Plant biome — infect the green. Fungus conquers the forest.
    Arc 3: Water biome — poison the springs. The rivers run black.
    Arc 4: Fire biome — even the flames fall. Spores survive the heat.
    Arc 5: Metal biome — rust the machines. Technology has no antibodies.
    Arc 6: Ice biome — freeze the infection in. Preserved forever.
    Arc 7 (Final): All biomes corrupted. Face the Pure Toxin.

    Biome mechanic: Foreign biome waves require the player to
    spread the infection meter (infect enough enemies at once)
    to trigger biome assimilation mid-wave.
*/

window.POISON_STORY_CHAPTERS = [

    // ─── ARC 1: THE SWAMP — Home (Waves 1–10) ───────────────────────────────
    // The Plague-Bringer wakes. The poison biome is already theirs.
    // Learn the infection mechanics before taking the sickness outward.

    {
        id: "poison_1", wave: 1, hero: "POISON", type: "NARRATIVE",
        title: "Patient Zero",
        text: "You wake in the swamp with black veins and a smile. The world around you wilts at your touch. You are not sick — you are sickness. This fetid, beautiful biome is yours: the first foothold of a plague that will consume every clean thing on the map. It starts here. It ends everywhere.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_2", wave: 2, hero: "POISON", type: "NARRATIVE",
        title: "Contagion",
        text: "The first enemies approach still breathing clean air. One scratch is enough. They stagger, they green, they fall. Watching the infection spread from host to host is a quiet satisfaction. You don't need to kill everything. You just need to touch it.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_3", wave: 3, hero: "POISON", type: "NARRATIVE",
        title: "Miasma",
        text: "A toxic cloud forms around you — uninvited, permanent, yours. It chokes small creatures mid-stride. You breathe it in deeply; it smells like potential. The swamp amplifies it, concentrates it, sends it outward in slow-rolling waves. The first biome has always been yours. Now you must take the rest.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_4", wave: 4, hero: "POISON", type: "NARRATIVE",
        title: "Festering Wounds",
        text: "Your own wounds do not heal — they bubble, hiss, and weep infection. This would concern most. For you, it is a delivery system. Pain is just another vector. You resolve: everything that bleeds can be infected. Everything that breathes can be converted.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_5", wave: 5, hero: "POISON", type: "NARRATIVE",
        title: "The Swamp Throne",
        text: "This fetid kingdom is truly yours now — every creature here carries your mark, every root is threaded with your chemistry. But a swamp is a small domain. The forest is out there, pristine and green and arrogantly clean. Your spores are already drifting toward it.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_6", wave: 6, hero: "POISON", type: "NARRATIVE",
        title: "Viral Load",
        text: "The infection spreads faster. It jumps between enemies like fire through dry grass, except wetter, more intimate. Chains of sickness wipe out entire squads before you fire a shot. You are becoming less a fighter and more a biohazard.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_7", wave: 7, hero: "POISON", type: "NARRATIVE",
        title: "Carrier",
        text: "Some enemies are resistant — they carry the disease without dying immediately. Unwitting allies. They spread it behind their own lines, deeper into their formations than you could reach alone. You do not kill them. They are more useful breathing.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_8", wave: 8, hero: "POISON", type: "NARRATIVE",
        title: "Necrosis",
        text: "The land behind you dies. Grass to ash, trees to rot, stone to slow dissolution. You are leaving a trail that cannot be undone. This is the rehearsal. Beyond the swamp, the forest waits — centuries of growth about to meet something that makes growth its first casualty.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_9", wave: 9, hero: "POISON", type: "NARRATIVE",
        title: "Fever Dream",
        text: "The toxins cloud your mind. You see the other biomes in hallucinations — the green forest, the running rivers, the frozen peaks. Clean. Whole. Untouched. The image fills you with something between disgust and appetite. Tomorrow, the forest. Tonight, you let the swamp whisper its strategy.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_10", wave: 10, hero: "POISON", type: "BOSS_SPAWN",
        title: "The Antibody",
        text: "A massive, sterile construct descends — white, burning with disinfectant fire. It has been summoned to sanitize you before you can leave the swamp. Its creators think chemistry can contain biology. Show it the difference between a cure and a host.",
        data: { bossId: 'TANK', biome: 'HERO' }
    },

    // ─── ARC 2: THE LIVING FOREST — Plant Biome (Waves 11–20) ───────────────
    // The Plague-Bringer enters the plant biome. Fertile soil: perfect host.
    // Waves 11–12: plant biome. Infect enough enemies to trigger assimilation.
    // Waves 13–15: HERO (plant converted). Waves 16–17: water. Waves 18–20: HERO.

    {
        id: "poison_11", wave: 11, hero: "POISON", type: "NARRATIVE",
        title: "The Living Forest",
        text: "The plant biome. Centuries of growth, pristine canopy, the unbearable smell of clean earth. Fertile soil is not a habitat — it is a growth medium for whatever takes it first. You have arrived. Infect enough of the creatures that call this home and the toxicity meter will tip: the forest will accept its new nature.",
        data: { biome: 'plant' }
    },
    {
        id: "poison_12", wave: 12, hero: "POISON", type: "NARRATIVE",
        title: "Fungal Invasion",
        text: "The forest fights back. Its defenders are fast, rooted, drawing strength from the very soil you wish to corrupt. But you don't need to kill them all. You need to infect enough of them at once — let the contagion density reach critical mass. Spread broadly. Everywhere a scratch lands, a colony begins.",
        data: { biome: 'plant' }
    },
    {
        id: "poison_13", wave: 13, hero: "POISON", type: "NARRATIVE",
        title: "The Rot Takes Root",
        text: "The moment of conversion. The green dims. The canopy shudders and discolors. Mushrooms erupt from trunks that were growing for a hundred years. The forest doesn't die — it transforms. It is still full of life. Your kind of life. First conquest beyond the swamp.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_14", wave: 14, hero: "POISON", type: "NARRATIVE",
        title: "Blight",
        text: "The forest defenders retreat into their corrupted home, already infected, already changing. The trees now drip with something that wasn't there before. You walk among them and feel something like pride. This was a cathedral. Now it is your laboratory.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_15", wave: 15, hero: "POISON", type: "NARRATIVE",
        title: "Dead Grove",
        text: "The blight spreads beyond where you stood. The corrupted forest propagates your chemistry on its own now, without your help. Good. Your work here is self-sustaining. The rivers beyond are clean — for now. They carry the water that everything downstream drinks.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_16", wave: 16, hero: "POISON", type: "NARRATIVE",
        title: "The Poisoned Spring",
        text: "The water biome. Rivers, lakes, the arteries of a clean world. Every civilization downstream drinks from these. Infect enough of the creatures living in and around the water and the toxicity reaches a tipping point — the water assimilates. Everything that drinks downstream becomes a vector.",
        data: { biome: 'water' }
    },
    {
        id: "poison_17", wave: 17, hero: "POISON", type: "NARRATIVE",
        title: "Contamination",
        text: "The water resists differently than the forest. The current dilutes your toxins, flushes them away, slows the spread. You must work harder — infect more creatures at once, reach the critical mass faster, overwhelm the water's natural filtration with sheer volume of biological chaos.",
        data: { biome: 'water' }
    },
    {
        id: "poison_18", wave: 18, hero: "POISON", type: "NARRATIVE",
        title: "Acid Rain",
        text: "The rivers turn. The surface films with green-black iridescence. The water still flows — it will always flow — but now it carries your chemistry wherever gravity takes it. Two biomes corrupted. The springs feed the fields that feed the world.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_19", wave: 19, hero: "POISON", type: "NARRATIVE",
        title: "Turbid Waters",
        text: "The water creatures move slowly now, adapted to the new chemistry. They have become carriers without knowing it, spreading your work downstream faster than you ever could alone. A defense force turned distribution network. Two biomes down. The world's rivers now run with your chemistry.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_20", wave: 20, hero: "POISON", type: "BOSS_SPAWN",
        title: "The Quarantine",
        text: "A field barrier materializes — the world's immune system, desperate. A guardian of containment descends to cage you before you reach the earth. It does not want you dead. It wants you buried, sealed, isolated forever. It has underestimated how well plague travels through walls.",
        data: { bossId: 'NOVA', biome: 'HERO' }
    },

    // ─── ARC 3: THE DEPTHS & THE FLAMES (Waves 21–30) ───────────────────────
    // HERO (21–25), Fire biome (26–27), HERO (28–30).

    {
        id: "poison_21", wave: 21, hero: "POISON", type: "NARRATIVE",
        title: "Deep Roots",
        text: "The infection spreads through underground channels — through the water table, through root networks, through the seeping aquifers that connect the corrupted forest to the poisoned rivers. You don't need to be present for it to grow. Two biomes under the plague, and the sickness is learning to travel without you.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_22", wave: 22, hero: "POISON", type: "NARRATIVE",
        title: "Spore Pressure",
        text: "The spore count in the air has reached concentrations that would be fatal to any ordinary life. You breathe it in with satisfaction. Somewhere ahead, fire waits — nature's oldest sanitizer. Your predecessors died to infection when they met flame. You have been cultivating spores that do not. This will be the test that proves it.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_23", wave: 23, hero: "POISON", type: "NARRATIVE",
        title: "The Tally",
        text: "You survey what you have built: the corrupted forest, the poisoned springs. The infection spreads without your intervention now, replicating across both biomes. Two down. Three remain — and the hardest is next. Fire has killed every plague in history. Until yours.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_24", wave: 24, hero: "POISON", type: "NARRATIVE",
        title: "Buried Infection",
        text: "The earth carries your chemistry deep underground now. The corruption travels through the water table, through root networks, through cracks in the bedrock. You have gone subterranean without meaning to. The infection is working independently of you. It no longer needs your direct intervention to spread.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_25", wave: 25, hero: "POISON", type: "NARRATIVE",
        title: "The Cure?",
        text: "You find a purity potion on the battlefield, dropped by some desperate adventurer. You hold it up to the dim light filtering through corrupted canopy. It smells of clean water and hope. You let it fall. The glass shatters. A cure suggests there was something to cure. You are not sick. This is just what you are.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_26", wave: 26, hero: "POISON", type: "NARRATIVE",
        title: "The Last Resistance",
        text: "Fire. The one biome that should resist you — nature's own sanitizer, the thing civilizations used to burn plague from their cities. Your spores have been waiting for this test. Fire kills most biological material. Not all of it. The survivors of a fire are the most dangerous things alive. Infect the fire creatures. Let the heat prove you.",
        data: { biome: 'fire' }
    },
    {
        id: "poison_27", wave: 27, hero: "POISON", type: "NARRATIVE",
        title: "Viral Combustion",
        text: "The fire burns your lesser spores — but the ones that survive the heat are harder, stronger, impossible to sanitize. You need to infect enough fire creatures at once to overwhelm the biome's natural sterilization. This is the hardest conversion yet. It should be. Nothing worth having is easy.",
        data: { biome: 'fire' }
    },
    {
        id: "poison_28", wave: 28, hero: "POISON", type: "NARRATIVE",
        title: "Toxic Flames",
        text: "The fire changes color — from orange to a sickly green-black. It still burns, but now it burns with your chemistry. The smoke is poisonous. The ash is toxic. The fire biome has become a delivery mechanism, spreading your infection on the wind wherever it blows. You have weaponized fire. Four biomes corrupted.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_29", wave: 29, hero: "POISON", type: "NARRATIVE",
        title: "Withering",
        text: "You drain vitality from those around you — a plague vampire. As the fire enemies wither, you grow stronger on the absorbed energy. You no longer feel like a host for the infection. You feel like the infection itself, finding a body to work through.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_30", wave: 30, hero: "POISON", type: "BOSS_SPAWN",
        title: "The Surgeon",
        text: "A twisted doctor approaches with rusty blades and the absolute certainty that your condition can be corrected surgically. He claims to want to operate. He uses words like 'excise' and 'remove'. You use a simpler word. Infect.",
        data: { bossId: 'RHINO', biome: 'HERO' }
    },

    // ─── ARC 4: THE IRON LUNG & THE FROZEN VAULT (Waves 31–40) ─────────────
    // Metal biome (31–32), HERO (33–35), Ice biome (36–37), HERO (38–40).

    {
        id: "poison_31", wave: 31, hero: "POISON", type: "NARRATIVE",
        title: "The Iron Lung",
        text: "Metal. Machines. The built world — engineered, sealed, sterile by design. Technology's greatest boast is that it can exist outside biology. That claim is about to be tested. Infect enough mechanical defenders and the metal biome's chemistry tips: rust, acid, the slow biological conquest of alloys.",
        data: { biome: 'metal' }
    },
    {
        id: "poison_32", wave: 32, hero: "POISON", type: "NARRATIVE",
        title: "Circuit Infection",
        text: "The machines scrub and filter and irradiate. They were built to be sterile. But biology always finds a way — it simply requires enough pressure. Infect the metal creatures in volume, overwhelm their sterilization, and the corrosion begins at the molecular level. Rust is just iron that learned to breathe.",
        data: { biome: 'metal' }
    },
    {
        id: "poison_33", wave: 33, hero: "POISON", type: "NARRATIVE",
        title: "Digital Plague",
        text: "The machines seize. Their joints corrode, their filters clog with organic matter, their sensors blind over with film. The metal biome has fallen — not in fire, but in rust and slime. Five biomes corrupted. One remains: the frozen vault that thought the cold would protect it.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_34", wave: 34, hero: "POISON", type: "NARRATIVE",
        title: "Corrosive Touch",
        text: "You touch the rusted metal barriers and they dissolve. No wall was ever built that biology cannot break down, given sufficient time and sufficient hunger. You are both. The corrupted machines now serve as incubators, warm and sealed, perfect for propagating the next generation of your spores.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_35", wave: 35, hero: "POISON", type: "NARRATIVE",
        title: "Airborne",
        text: "You realize you no longer need proximity. The spores are airborne now, riding the corrupted winds from six infected biomes. Enemies fall dead hundreds of meters away. You haven't become a plague. You have become a weather system.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_36", wave: 36, hero: "POISON", type: "NARRATIVE",
        title: "The Frozen Vault",
        text: "Ice. The final biome — the cold that was supposed to preserve, to protect, to hold the world's clean things in suspended animation. They thought freezing would stop the infection. They were thinking like engineers. Think like a virus: cold doesn't kill it. Cold preserves it. Infect the ice creatures at scale. Make the vault a storage medium.",
        data: { biome: 'ice' }
    },
    {
        id: "poison_37", wave: 37, hero: "POISON", type: "NARRATIVE",
        title: "Cryogenic Infection",
        text: "The cold slows the infection's spread — each contagion event takes longer to manifest. But your infection doesn't need speed. It needs saturation. Infect broadly, reach the critical mass, and the ice biome tips not into death but into deep-freeze preservation of your plague. Suspended. Perfectly preserved. Waiting to thaw.",
        data: { biome: 'ice' }
    },
    {
        id: "poison_38", wave: 38, hero: "POISON", type: "NARRATIVE",
        title: "Thawing Plague",
        text: "The ice cracks, discolored now, threaded with dark veins. The frozen creatures carry your chemistry suspended in their very cellular structure. The cold doesn't kill the infection — it concentrates it. Six biomes corrupted. The world is entirely yours. Almost.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_39", wave: 39, hero: "POISON", type: "NARRATIVE",
        title: "Patient Infinity",
        text: "You look back across the map. Six biomes — swamp, forest, water, fire, metal, ice — all threaded with your chemistry, all producing new vectors without you. You have become redundant, in the best possible way. But there is one thing left: the only entity that was never exposed. Your own shadow.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_40", wave: 40, hero: "POISON", type: "BOSS_SPAWN",
        title: "The Alchemist",
        text: "A master of potions appears, throwing explosive cocktails with practiced precision. He has been studying your chemistry for the entire campaign, formulating a counter-agent. He thinks chemistry can beat biology. He is wrong. Chemistry is just biology that hasn't been infected yet.",
        data: { bossId: 'SPEEDSTER', biome: 'HERO' }
    },

    // ─── ARC 5: THE TERMINAL PHASE — Final Corruption (Waves 41–50) ─────────
    // All biomes fall. The shadow self: the only thing left uncorrupted.

    {
        id: "poison_41", wave: 41, hero: "POISON", type: "NARRATIVE",
        title: "Terminal",
        text: "The Alchemist dissolves. You drink his potions out of curiosity. They taste like water. You are beyond chemical intervention. The world is fully infected. Six self-sustaining plague biomes, propagating without your involvement. You are no longer spreading the infection. You are the infection. Personified. Anthropomorphic. Inevitable.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_42", wave: 42, hero: "POISON", type: "NARRATIVE",
        title: "Global Infection",
        text: "You feel the sickness reaching the planet's core. The mantle itself carries your chemistry. Tectonic activity spreads the infection through volcanic vents across the surface. You did not plan this. It simply happened. The plague has a will of its own now, and its will is expansion.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_43", wave: 43, hero: "POISON", type: "NARRATIVE",
        title: "Entropy",
        text: "Everything is breaking down at once. Order into chaos. Clean into corrupt. Life into a different kind of life. You are the agent of entropy — not destruction, but transformation. The world is not ending. It is changing. You simply redefined what it is changing into.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_44", wave: 44, hero: "POISON", type: "NARRATIVE",
        title: "Viral God",
        text: "The lesser corrupted creatures bow before you — not from programming, not from compulsion. They have evolved enough to recognize their origin. You are the thing they came from. They accept your plague as a gift. You accept their deference as its due.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_45", wave: 45, hero: "POISON", type: "NARRATIVE",
        title: "Wasteland",
        text: "You look at what the world used to be. The forests, the rivers, the frozen peaks — all still there, all still functional, all thoroughly yours. It is beautiful in the way that ancient geology is beautiful: not clean, not safe, not designed for comfort. Just real. Just permanent.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_46", wave: 46, hero: "POISON", type: "NARRATIVE",
        title: "Final Host",
        text: "Your body is straining. It cannot contain this much concentrated plague. You are full — of toxins, of potential, of the accumulated chemistry of six corrupted biomes. You need somewhere to put the rest of it. The Shadow Realm offers a container of sufficient size.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_47", wave: 47, hero: "POISON", type: "NARRATIVE",
        title: "Injection",
        text: "You prepare to inject reality itself — the fabric of space, the membrane between dimensions. Everything that exists beyond can be infected, if you are willing to become the syringe. You are willing. You were always willing.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_48", wave: 48, hero: "POISON", type: "NARRATIVE",
        title: "Fever Break",
        text: "The heat is unbearable. Your own poison is fighting your body for final supremacy. But a plague does not kill its last host. It evolves to coexist. You are coexisting with yourself, barely. One more enemy waits — the only thing in the world that shares your exact chemistry and has used it to become your opposite.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_49", wave: 49, hero: "POISON", type: "NARRATIVE",
        title: "The Zero Point",
        text: "You reach the final barrier. Your own shadow waits beyond it — the version of you that absorbed six biomes of infection and became the cure. It is the distillation of everything that tried to stop you. It has your face, your chemistry, your hunger. The difference: it wants to consume you to save the world. You want to consume it to finish the job.",
        data: { biome: 'HERO' }
    },
    {
        id: "poison_50", wave: 50, hero: "POISON", type: "BOSS_FIGHT",
        title: "The Pure Toxin",
        text: "The swamp drains away. A void opens. Your own toxicity has crystallized a shadow — the concentrated immune response of a world that fought back and lost. It is the end of all resistance. It is the last clean thing. You are the cure or the final disease. There is no difference anymore.",
        data: { bossId: 'SHADOW_CLONE', biome: 'black' }
    }
];

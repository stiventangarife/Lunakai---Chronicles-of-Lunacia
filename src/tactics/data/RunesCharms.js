// RunesCharms.js — Catálogo de las 90 runas maestras y los 90 charms (Crónica Celeste · pantallas 16 y 17).
// El arte vive en assets/ui/runes-charms.json (id «runes/<id>» o «charms/<id>» → imagen), que se carga al abrir el panel.
//
// Reglas (pantalla 17 · Preparación):
//   · Runa: 1 por axie, de su propia clase (las neutrales sirven para cualquiera). No gasta PP.
//   · Charm: se engarza en una PARTE. Un charm neutral entra en cualquier parte; uno de clase, solo en partes de esa clase.
//   · Cada axie tiene 15 Potential Points (PP) para sus charms, repartidos por clase (GDD §3): 3 PP de la clase del axie
//     y 2 PP por cada parte de la clase de esa parte. Un charm de clase gasta PP de SU clase; un charm neutral gasta
//     primero de la clase de la parte donde va y luego en el orden canónico (Aquatic → Beast → Bird → Bug → Dawn →
//     Dusk → Mech → Plant → Reptile). Ver ppAllocate. Un mismo charm no se repite en dos partes del mismo axie.
// `desc` = efecto en combate (tactics/combat/RuneCharmEffects.js, guía «Matriz de runas y catálogo de charms»).
// Las 27 runas de las clases secretas (Mech, Dawn, Dusk) no están en la guía: siguen sin efecto (`desc` vacío).

export const PP_MAX = 15;

export const RUNES = [
{
"id": "aquatic-bloodlust",
"name": "Bloodlust",
"class": "aquatic",
"rarity": "mystic",
"desc": "Cada vez que elimina a un enemigo, gana +1 PA y +1 PM al momento."
},
{
"id": "aquatic-blunt-teeth",
"name": "Blunt Teeth",
"class": "aquatic",
"rarity": "rare",
"desc": "+15 % de daño contra objetivos que no se movieron en su último turno."
},
{
"id": "aquatic-bombshell-maker",
"name": "Bombshell Maker",
"class": "aquatic",
"rarity": "mystic",
"desc": "Sus ataques a distancia (2+ casillas) hacen 20 de daño a los enemigos en cruz alrededor del objetivo."
},
{
"id": "aquatic-calcium-armor",
"name": "Calcium Armor",
"class": "aquatic",
"rarity": "epic",
"desc": "Si termina su turno sin gastar PM, gana +50 de escudo."
},
{
"id": "aquatic-giant-bubble",
"name": "Giant Bubble",
"class": "aquatic",
"rarity": "rare",
"desc": "Empieza el combate con +35 de escudo y tiene +10 de iniciativa."
},
{
"id": "aquatic-heart-of-ocean",
"name": "Heart of Ocean",
"class": "aquatic",
"rarity": "mystic",
"desc": "+18 % de daño y +1 PM."
},
{
"id": "aquatic-hearty-warrior",
"name": "Hearty Warrior",
"class": "aquatic",
"rarity": "epic",
"desc": "+45 de vida máxima y +12 % de daño con las cartas de 2 PA o más."
},
{
"id": "aquatic-puffers-plight",
"name": "Puffer’s Plight",
"class": "aquatic",
"rarity": "epic",
"desc": "Ante un golpe letal sobrevive con 1 HP y gana +100 de escudo (una vez por combate)."
},
{
"id": "aquatic-way-of-aquatic",
"name": "Way of Aquatic",
"class": "aquatic",
"rarity": "rare",
"desc": "+15 de iniciativa y +10 % de daño a distancia (2+ casillas)."
},
{
"id": "beast-brutal-claw",
"name": "Brutal Claw",
"class": "beast",
"rarity": "mystic",
"desc": "+25 % de daño crítico y +15 % de daño en los ataques cuerpo a cuerpo (1 casilla)."
},
{
"id": "beast-counter-stance",
"name": "Counter Stance",
"class": "beast",
"rarity": "mystic",
"desc": "Si le atacan cuerpo a cuerpo, contraataca con 35 de daño físico (una vez por ataque)."
},
{
"id": "beast-dominant-predator",
"name": "Dominant Predator",
"class": "beast",
"rarity": "rare",
"desc": "+15 % de daño contra enemigos con menos del 50 % de vida."
},
{
"id": "beast-endless-anger",
"name": "Endless Anger",
"class": "beast",
"rarity": "mystic",
"desc": "+1 PA al empezar su turno en las rondas 1 y 3."
},
{
"id": "beast-glorious-mane",
"name": "Glorious Mane",
"class": "beast",
"rarity": "rare",
"desc": "+40 de vida máxima y +8 de iniciativa."
},
{
"id": "beast-inspirational-hero",
"name": "Inspirational Hero",
"class": "beast",
"rarity": "epic",
"desc": "Cuando asesta un golpe crítico, todo el escuadrón gana +1 PM en su próximo turno."
},
{
"id": "beast-pangolin-scale",
"name": "Pangolin Scale",
"class": "beast",
"rarity": "epic",
"desc": "Empieza el combate con +60 de escudo y recibe un 15 % menos de daño a distancia (2+ casillas)."
},
{
"id": "beast-reckless-hunter",
"name": "Reckless Hunter",
"class": "beast",
"rarity": "epic",
"desc": "+20 % de daño, pero recibe un 10 % más de daño de los ataques."
},
{
"id": "beast-way-of-beast",
"name": "Way of Beast",
"class": "beast",
"rarity": "rare",
"desc": "+10 % de daño y +10 % de probabilidad de crítico."
},
{
"id": "bird-energy-guru",
"name": "Energy Guru",
"class": "bird",
"rarity": "epic",
"desc": "La primera carta que usa en la ronda 1 cuesta 1 PA menos (mínimo 1)."
},
{
"id": "bird-feather-descend",
"name": "Feather Descend",
"class": "bird",
"rarity": "mystic",
"desc": "+1 PM y +1 al alcance (AL) máximo de sus cartas a distancia."
},
{
"id": "bird-flock-might",
"name": "Flock Might",
"class": "bird",
"rarity": "mystic",
"desc": "Mientras siga con vida, todo el escuadrón hace +8 % de daño."
},
{
"id": "bird-frail-egg",
"name": "Frail Egg",
"class": "bird",
"rarity": "rare",
"desc": "+25 de iniciativa y +15 % de daño, pero −30 de vida máxima."
},
{
"id": "bird-gates-of-unity",
"name": "Gates of Unity",
"class": "bird",
"rarity": "rare",
"desc": "Con un aliado a 2 casillas o menos, los dos esquivan el 15 % de los ataques a distancia."
},
{
"id": "bird-ravens-tactic",
"name": "Raven's Tactic",
"class": "bird",
"rarity": "epic",
"desc": "Su primer ataque de cada ronda hace +25 % de daño."
},
{
"id": "bird-sacred-feather",
"name": "Sacred Feather",
"class": "bird",
"rarity": "epic",
"desc": "+2 PM en su primer turno y anula las reducciones de PM que sufra."
},
{
"id": "bird-sharp-talon",
"name": "Sharp Talon",
"class": "bird",
"rarity": "mystic",
"desc": "Sus ataques a distancia ignoran el 30 % del escudo del objetivo."
},
{
"id": "bird-way-of-bird",
"name": "Way of Bird",
"class": "bird",
"rarity": "rare",
"desc": "+20 de iniciativa y +1 PM."
},
{
"id": "bug-blood-beetle",
"name": "Blood Beetle",
"class": "bug",
"rarity": "rare",
"desc": "Sus ataques cuerpo a cuerpo aplican Sangrado de 15 (2 turnos)."
},
{
"id": "bug-collect-protect",
"name": "Collect & Protect",
"class": "bug",
"rarity": "mystic",
"desc": "Cada carta que lanza le da +20 de escudo."
},
{
"id": "bug-fate-maker",
"name": "Fate Maker",
"class": "bug",
"rarity": "epic",
"desc": "Su carta de cuerno o de boca cuesta 1 PA menos una vez cada 2 rondas (mínimo 1)."
},
{
"id": "bug-greedy-leech",
"name": "Greedy Leech",
"class": "bug",
"rarity": "mystic",
"desc": "Se cura el 30 % del daño a la vida que hace a los enemigos."
},
{
"id": "bug-leech",
"name": "Leech",
"class": "bug",
"rarity": "epic",
"desc": "+30 de vida máxima y se cura el 15 % del daño que hace a los enemigos."
},
{
"id": "bug-metamorphosis",
"name": "Metamorphosis",
"class": "bug",
"rarity": "mystic",
"desc": "Al empezar la ronda 3 gana +50 de vida, +15 % de daño y +1 PM hasta el final del combate."
},
{
"id": "bug-sturdy-fighter",
"name": "Sturdy Fighter",
"class": "bug",
"rarity": "epic",
"desc": "Recibe un 15 % menos de daño físico y es inmune al daño de colisión."
},
{
"id": "bug-vault-builder",
"name": "Vault Builder",
"class": "bug",
"rarity": "rare",
"desc": "Empieza el combate con +50 de escudo y tiene +10 de iniciativa."
},
{
"id": "bug-way-of-bug",
"name": "Way of Bug",
"class": "bug",
"rarity": "rare",
"desc": "+40 de vida máxima y +15 % a los escudos que da."
},
{
"id": "dawn-arcane-protection",
"name": "Arcane Protection",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-celestial-might",
"name": "Celestial Might",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-divine-ring",
"name": "Divine Ring",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-guardian-angel",
"name": "Guardian Angel",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-healing-force",
"name": "Healing Force",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-heavens-echoes",
"name": "Heaven's Echoes",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-holy-prayer",
"name": "Holy Prayer",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-rejuvenate",
"name": "Rejuvenate",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dawn-tiny-guardian",
"name": "Tiny Guardian",
"class": "dawn",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-cursed-ritual",
"name": "Cursed Ritual",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-dark-flame",
"name": "Dark Flame",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-fading-eclipse",
"name": "Fading Eclipse",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-gloomy-dice",
"name": "Gloomy Dice",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-malediction",
"name": "Malediction",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-moonlight-thief",
"name": "Moonlight Thief",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-plague-bearer",
"name": "Plague Bearer",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-soul-eater",
"name": "Soul Eater",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "dusk-wicked-ward",
"name": "Wicked Ward",
"class": "dusk",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-adaptive-program",
"name": "Adaptive Program",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-last-stand",
"name": "Last Stand",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-lens-of-truth",
"name": "Lens of Truth",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-rocket-barrage",
"name": "Rocket Barrage",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-shield-backup",
"name": "Shield Backup",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-solid-bulwark",
"name": "Solid Bulwark",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-steelskin",
"name": "Steelskin",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-trap-nullifier",
"name": "Trap Nullifier",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "mech-zap-armor",
"name": "Zap Armor",
"class": "mech",
"rarity": "secret",
"desc": ""
},
{
"id": "neutral-energy-shard",
"name": "Energy Shard",
"class": "neutral",
"rarity": "neutral",
"desc": "En las rondas 2 y 4, todo el escuadrón gana +1 PA en su turno."
},
{
"id": "neutral-last-wish",
"name": "Last Wish",
"class": "neutral",
"rarity": "neutral",
"desc": "+50 de vida máxima; al caer da +80 de escudo a los aliados con vida."
},
{
"id": "neutral-philosophers-stone",
"name": "Philosopher’s Stone",
"class": "neutral",
"rarity": "neutral",
"desc": "+10 % al daño, los escudos y las curaciones de este Axie."
},
{
"id": "neutral-pure-instinct",
"name": "Pure Instinct",
"class": "neutral",
"rarity": "neutral",
"desc": "El segundo ataque de cada turno hace +25 % de daño."
},
{
"id": "neutral-pure-luck",
"name": "Pure Luck",
"class": "neutral",
"rarity": "neutral",
"desc": "+20 % de probabilidad de crítico y esquiva el 15 % de los ataques a distancia."
},
{
"id": "neutral-pure-power",
"name": "Pure Power",
"class": "neutral",
"rarity": "neutral",
"desc": "+12 % de daño."
},
{
"id": "neutral-pure-skill",
"name": "Pure Skill",
"class": "neutral",
"rarity": "neutral",
"desc": "+15 % a los escudos y curaciones que da; los empujes que sufre se acortan un 25 %."
},
{
"id": "neutral-shady-exchange",
"name": "Shady Exchange",
"class": "neutral",
"rarity": "neutral",
"desc": "Al empezar su turno pierde 25 HP (nunca muere por ello) y gana +1 PA y +1 PM."
},
{
"id": "neutral-vengeful-soul",
"name": "Vengeful Soul",
"class": "neutral",
"rarity": "neutral",
"desc": "+60 de vida máxima; al caer, el resto del escuadrón hace +15 % de daño hasta el final del combate."
},
{
"id": "plant-destiny-leaf",
"name": "Destiny Leaf",
"class": "plant",
"rarity": "rare",
"desc": "+50 de vida máxima y +20 % a las curaciones que recibe."
},
{
"id": "plant-forest-aroma",
"name": "Forest Aroma",
"class": "plant",
"rarity": "rare",
"desc": "Al final de su turno cura 25 HP al aliado con menos vida a 2 casillas o menos (él incluido)."
},
{
"id": "plant-gaias-embrace",
"name": "Gaia's Embrace",
"class": "plant",
"rarity": "mystic",
"desc": "Al empezar cada ronda da +40 de escudo a este Axie y a los aliados adyacentes."
},
{
"id": "plant-healing-pulse",
"name": "Healing Pulse",
"class": "plant",
"rarity": "mystic",
"desc": "+25 % a las curaciones y escudos que da este Axie."
},
{
"id": "plant-jungle-nightmare",
"name": "Jungle Nightmare",
"class": "plant",
"rarity": "mystic",
"desc": "Sus ataques quitan 1 PM al objetivo en su próximo turno."
},
{
"id": "plant-leaf-cloak",
"name": "Leaf Cloak",
"class": "plant",
"rarity": "epic",
"desc": "Recibe un 20 % menos de daño a distancia (2+ casillas)."
},
{
"id": "plant-miracle-leaf",
"name": "Miracle Leaf",
"class": "plant",
"rarity": "epic",
"desc": "La primera vez que su vida baja del 25 %, gana +90 de escudo (una vez por combate)."
},
{
"id": "plant-rise-ruin",
"name": "Rise & Ruin",
"class": "plant",
"rarity": "epic",
"desc": "+20 % de daño contra objetivos con escudo."
},
{
"id": "plant-way-of-plant",
"name": "Way of Plant",
"class": "plant",
"rarity": "rare",
"desc": "+60 de vida máxima y +15 % a los escudos de sus cartas de Planta."
},
{
"id": "reptile-desert-protector",
"name": "Desert Protector",
"class": "reptile",
"rarity": "epic",
"desc": "Recibe el 20 % del daño que sufren los aliados adyacentes."
},
{
"id": "reptile-paralyzing-glare",
"name": "Paralyzing Glare",
"class": "reptile",
"rarity": "mystic",
"desc": "Sus golpes a distancia quitan 20 de iniciativa y 1 PM al objetivo en su próximo turno."
},
{
"id": "reptile-poison-touch",
"name": "Poison Touch",
"class": "reptile",
"rarity": "rare",
"desc": "Sus ataques aplican Veneno de 12 (2 turnos)."
},
{
"id": "reptile-prehistoric-armor",
"name": "Prehistoric Armor",
"class": "reptile",
"rarity": "epic",
"desc": "+70 de vida máxima; el daño extra de los críticos que recibe se reduce a la mitad."
},
{
"id": "reptile-regenerator",
"name": "Regenerator",
"class": "reptile",
"rarity": "mystic",
"desc": "Al final de su turno se cura 35 HP."
},
{
"id": "reptile-shellshock",
"name": "Shellshock",
"class": "reptile",
"rarity": "rare",
"desc": "Mientras tenga escudo, sus golpes hacen +18 de daño."
},
{
"id": "reptile-spike-spray",
"name": "Spike Spray",
"class": "reptile",
"rarity": "mystic",
"desc": "Devuelve 20 de daño a quien le golpee cuerpo a cuerpo."
},
{
"id": "reptile-venom-master",
"name": "Venom Master",
"class": "reptile",
"rarity": "epic",
"desc": "+25 % de daño contra enemigos con Veneno o Sangrado."
},
{
"id": "reptile-way-of-reptile",
"name": "Way of Reptile",
"class": "reptile",
"rarity": "rare",
"desc": "+55 de vida máxima y +10 % de daño cuerpo a cuerpo."
}
];

export const CHARMS = [
{
"id": "aquatic-aquatics-charm-of-focus-i",
"name": "Aquatic's Charm of Focus I",
"class": "aquatic",
"pp": 1,
"rarity": "common",
"desc": "+6 de iniciativa."
},
{
"id": "aquatic-aquatics-charm-of-focus-ii",
"name": "Aquatic's Charm of Focus II",
"class": "aquatic",
"pp": 2,
"rarity": "rare",
"desc": "+14 de iniciativa y +5 de daño a la carta."
},
{
"id": "aquatic-aquatics-charm-of-power-i",
"name": "Aquatic's Charm of Power I",
"class": "aquatic",
"pp": 1,
"rarity": "common",
"desc": "+6 de daño a la carta."
},
{
"id": "aquatic-aquatics-charm-of-power-ii",
"name": "Aquatic's Charm of Power II",
"class": "aquatic",
"pp": 2,
"rarity": "rare",
"desc": "+12 de daño a la carta."
},
{
"id": "aquatic-aquatics-energy-drink-s",
"name": "Aquatic's Energy Drink S",
"class": "aquatic",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta, +1 PM ese turno (una vez por turno)."
},
{
"id": "aquatic-awaken-stamp-aquatic",
"name": "Awaken Stamp (Aquatic)",
"class": "aquatic",
"pp": 4,
"rarity": "mystic",
"desc": "+18 de daño a la carta y +10 de iniciativa."
},
{
"id": "aquatic-bubble-paste",
"name": "Bubble Paste",
"class": "aquatic",
"pp": 3,
"rarity": "epic",
"desc": "Al usar la carta, el Axie gana +20 de escudo."
},
{
"id": "aquatic-exploding-bombshell",
"name": "Exploding Bombshell",
"class": "aquatic",
"pp": 4,
"rarity": "mystic",
"desc": "La carta hace 18 de daño a los enemigos en cruz alrededor del objetivo."
},
{
"id": "aquatic-paralyzing-jellyfish",
"name": "Paralyzing JellyFish",
"class": "aquatic",
"pp": 3,
"rarity": "epic",
"desc": "El objetivo golpeado pierde 15 de iniciativa durante la ronda siguiente."
},
{
"id": "aquatic-sticky-octopus",
"name": "Sticky Octopus",
"class": "aquatic",
"pp": 3,
"rarity": "epic",
"desc": "La carta atrae al objetivo 1 casilla hacia el lanzador."
},
{
"id": "beast-awaken-stamp-beast",
"name": "Awaken Stamp (Beast)",
"class": "beast",
"pp": 4,
"rarity": "mystic",
"desc": "+18 de daño a la carta y empuja 1 casilla más (con daño de colisión)."
},
{
"id": "beast-beasts-charm-of-focus-i",
"name": "Beast's Charm of Focus I",
"class": "beast",
"pp": 1,
"rarity": "common",
"desc": "+6 % de probabilidad de crítico a la carta."
},
{
"id": "beast-beasts-charm-of-focus-ii",
"name": "Beast's Charm of Focus II",
"class": "beast",
"pp": 2,
"rarity": "rare",
"desc": "+12 % de probabilidad de crítico y +10 % de daño crítico a la carta."
},
{
"id": "beast-beasts-charm-of-power-i",
"name": "Beast's Charm of Power I",
"class": "beast",
"pp": 1,
"rarity": "common",
"desc": "+6 de daño a la carta."
},
{
"id": "beast-beasts-charm-of-power-ii",
"name": "Beast's Charm of Power II",
"class": "beast",
"pp": 2,
"rarity": "rare",
"desc": "+12 de daño a la carta."
},
{
"id": "beast-beasts-energy-drink-m",
"name": "Beast's Energy Drink M",
"class": "beast",
"pp": 3,
"rarity": "epic",
"desc": "+1 PM al Axie y +8 de daño a la carta."
},
{
"id": "beast-beasts-energy-drink-s",
"name": "Beast's Energy Drink S",
"class": "beast",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta, +1 PM ese turno (una vez por turno)."
},
{
"id": "beast-hidden-razor",
"name": "Hidden Razor",
"class": "beast",
"pp": 3,
"rarity": "epic",
"desc": "La carta aplica Sangrado de 12 (2 turnos)."
},
{
"id": "beast-mad-moon-mask",
"name": "Mad Moon Mask",
"class": "beast",
"pp": 4,
"rarity": "mystic",
"desc": "+22 de daño y +15 % de daño crítico a la carta."
},
{
"id": "beast-mask-of-frenzy",
"name": "Mask of Frenzy",
"class": "beast",
"pp": 3,
"rarity": "epic",
"desc": "Si la carta asesta un crítico, recupera 1 PA (una vez por turno)."
},
{
"id": "bird-awaken-stamp-bird",
"name": "Awaken Stamp (Bird)",
"class": "bird",
"pp": 4,
"rarity": "mystic",
"desc": "+16 de daño a la carta y +1 AL si es una carta a distancia."
},
{
"id": "bird-birds-charm-of-focus-i",
"name": "Bird's Charm of Focus I",
"class": "bird",
"pp": 1,
"rarity": "common",
"desc": "+8 de iniciativa."
},
{
"id": "bird-birds-charm-of-focus-ii",
"name": "Bird's Charm of Focus II",
"class": "bird",
"pp": 2,
"rarity": "rare",
"desc": "+18 de iniciativa."
},
{
"id": "bird-birds-charm-of-power-i",
"name": "Bird's Charm of Power I",
"class": "bird",
"pp": 1,
"rarity": "common",
"desc": "+6 de daño a la carta."
},
{
"id": "bird-birds-charm-of-power-ii",
"name": "Bird's Charm of Power II",
"class": "bird",
"pp": 2,
"rarity": "rare",
"desc": "+12 de daño a la carta."
},
{
"id": "bird-birds-energy-drink-s",
"name": "Bird's Energy Drink S",
"class": "bird",
"pp": 3,
"rarity": "rare",
"desc": "+1 PM al Axie."
},
{
"id": "bird-feather-fan",
"name": "Feather Fan",
"class": "bird",
"pp": 3,
"rarity": "epic",
"desc": "+1 al alcance (AL) máximo de la carta."
},
{
"id": "bird-flamingo-hammer",
"name": "Flamingo Hammer",
"class": "bird",
"pp": 3,
"rarity": "epic",
"desc": "+15 de daño a la carta y empuja al objetivo 1 casilla."
},
{
"id": "bird-secret-egg",
"name": "Secret Egg",
"class": "bird",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta con menos del 50 % de vida, el Axie gana +30 de escudo."
},
{
"id": "bird-storm-shuriken",
"name": "Storm Shuriken",
"class": "bird",
"pp": 4,
"rarity": "mystic",
"desc": "+20 de daño si el objetivo está a 3 casillas o más."
},
{
"id": "bug-awaken-stamp-bug",
"name": "Awaken Stamp (Bug)",
"class": "bug",
"pp": 4,
"rarity": "mystic",
"desc": "+14 de daño a la carta; al usarla, el Axie se cura 15 HP."
},
{
"id": "bug-bugs-charm-of-endurance-i",
"name": "Bug's Charm of Endurance I",
"class": "bug",
"pp": 1,
"rarity": "common",
"desc": "+15 de vida máxima y empieza el combate con +5 de escudo."
},
{
"id": "bug-bugs-charm-of-endurance-ii",
"name": "Bug's Charm of Endurance II",
"class": "bug",
"pp": 2,
"rarity": "rare",
"desc": "+35 de vida máxima y +12 al escudo de la carta."
},
{
"id": "bug-bugs-charm-of-power-i",
"name": "Bug's Charm of Power I",
"class": "bug",
"pp": 1,
"rarity": "common",
"desc": "+6 de daño a la carta."
},
{
"id": "bug-bugs-charm-of-power-ii",
"name": "Bug's Charm of Power II",
"class": "bug",
"pp": 2,
"rarity": "rare",
"desc": "+12 de daño a la carta."
},
{
"id": "bug-bugs-energy-drink-m",
"name": "Bug's Energy Drink M",
"class": "bug",
"pp": 3,
"rarity": "epic",
"desc": "+1 PM y +25 de vida máxima."
},
{
"id": "bug-lazy-snail",
"name": "Lazy Snail",
"class": "bug",
"pp": 3,
"rarity": "epic",
"desc": "Si la carta golpea a 1 casilla, quita 1 PM al objetivo en su próximo turno."
},
{
"id": "bug-mantis-dagger",
"name": "Mantis Dagger",
"class": "bug",
"pp": 4,
"rarity": "mystic",
"desc": "+18 de daño y +15 % de daño crítico a la carta."
},
{
"id": "bug-secret-cocoon",
"name": "Secret Cocoon",
"class": "bug",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta, el Axie gana +20 de escudo."
},
{
"id": "bug-tricksters-card",
"name": "Trickster's Card",
"class": "bug",
"pp": 2,
"rarity": "rare",
"desc": "La carta cuesta 1 PA menos en la ronda 1 (mínimo 1)."
},
{
"id": "neutral-awaken-stamp-l",
"name": "Awaken Stamp (L)",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "+60 de vida máxima."
},
{
"id": "neutral-awaken-stamp-m",
"name": "Awaken Stamp (M)",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+35 de vida máxima."
},
{
"id": "neutral-awaken-stamp-s",
"name": "Awaken Stamp (S)",
"class": "neutral",
"pp": 1,
"rarity": "common",
"desc": "+15 de vida máxima."
},
{
"id": "neutral-beans-charm",
"name": "Bean's Charm",
"class": "neutral",
"pp": 1,
"rarity": "common",
"desc": "Al usar la carta, el Axie se cura 12 HP."
},
{
"id": "neutral-black-sage",
"name": "Black Sage",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "La carta quita 1 beneficio al objetivo."
},
{
"id": "neutral-bloodpact",
"name": "Bloodpact",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "+30 de daño a la carta; el lanzador pierde 20 HP al usarla."
},
{
"id": "neutral-blue-mirror",
"name": "Blue Mirror",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "Si la usas después de otra carta en el mismo turno, el Axie gana +15 de escudo."
},
{
"id": "neutral-charm-of-endurance-ii",
"name": "Charm of Endurance II",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+30 de vida máxima y +10 al escudo de la carta."
},
{
"id": "neutral-charm-of-faith-ii",
"name": "Charm of Faith II",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+14 al escudo o a la curación de la carta."
},
{
"id": "neutral-charm-of-focus-ii",
"name": "Charm of Focus II",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+10 % de probabilidad de crítico a la carta."
},
{
"id": "neutral-charm-of-power-ii",
"name": "Charm of Power II",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+10 de daño a la carta."
},
{
"id": "neutral-charm-of-vitality-ii",
"name": "Charm of Vitality II",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+40 de vida máxima."
},
{
"id": "neutral-cursed-doll",
"name": "Cursed Doll",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "El objetivo golpeado hace un 15 % menos de daño en su próximo turno."
},
{
"id": "neutral-deadly-spell",
"name": "Deadly Spell",
"class": "neutral",
"pp": 4,
"rarity": "mystic",
"desc": "+18 de daño a la carta."
},
{
"id": "neutral-discount-coupon",
"name": "Discount Coupon",
"class": "neutral",
"pp": 4,
"rarity": "mystic",
"desc": "La carta cuesta 1 PA menos (mínimo 1)."
},
{
"id": "neutral-earth-stamp",
"name": "Earth Stamp",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta, el Axie gana +20 de escudo."
},
{
"id": "neutral-energy-drink-m",
"name": "Energy Drink M",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "+1 PM al Axie."
},
{
"id": "neutral-energy-drink-s",
"name": "Energy Drink S",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta, +1 PM ese turno (una vez por turno)."
},
{
"id": "neutral-green-mirror",
"name": "Green Mirror",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "Si la usas después de otra carta en el mismo turno, el Axie se cura 15 HP."
},
{
"id": "neutral-last-gift",
"name": "Last Gift",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "Al caer el Axie, el Sapidae gana +50 de escudo y +1 PA."
},
{
"id": "neutral-lens-of-revelation",
"name": "Lens of Revelation",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "+1 al alcance (AL) máximo de la carta (solo cartas de alcance 2 o más)."
},
{
"id": "neutral-novice-spell",
"name": "Novice Spell",
"class": "neutral",
"pp": 1,
"rarity": "common",
"desc": "+5 de daño a la carta."
},
{
"id": "neutral-pre-order-tag",
"name": "Pre Order Tag",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "La carta está disponible desde el turno 1 (en Lunakai las 6 cartas ya lo están siempre)."
},
{
"id": "neutral-purifying-incense",
"name": "Purifying Incense",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "Al empezar la ronda 2, el Axie se quita todos sus perjuicios."
},
{
"id": "neutral-red-mirror",
"name": "Red Mirror",
"class": "neutral",
"pp": 2,
"rarity": "rare",
"desc": "Si la usas después de otra carta en el mismo turno, +10 de daño."
},
{
"id": "neutral-rocket-stamp",
"name": "Rocket Stamp",
"class": "neutral",
"pp": 4,
"rarity": "mystic",
"desc": "+2 al alcance (AL) de la carta y no necesita línea de visión."
},
{
"id": "neutral-scotch-tape",
"name": "Scotch Tape",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "Si no usaste la carta en tu turno anterior, hace +10 % de daño."
},
{
"id": "neutral-sun-stamp",
"name": "Sun Stamp",
"class": "neutral",
"pp": 3,
"rarity": "epic",
"desc": "+15 de daño a la carta y destruye 15 de escudo del objetivo."
},
{
"id": "neutral-white-sage",
"name": "White Sage",
"class": "neutral",
"pp": 1,
"rarity": "common",
"desc": "Los perjuicios que recibe el Axie duran 1 turno menos (mínimo 1)."
},
{
"id": "neutral-wooden-idol",
"name": "Wooden Idol",
"class": "neutral",
"pp": 4,
"rarity": "mystic",
"desc": "Ante el primer golpe letal sobrevive con 1 HP (una vez por combate)."
},
{
"id": "plant-ancient-root",
"name": "Ancient Root",
"class": "plant",
"pp": 3,
"rarity": "epic",
"desc": "Si la carta golpea a un enemigo, le quita 1 PM en su próximo turno."
},
{
"id": "plant-awaken-stamp-plant",
"name": "Awaken Stamp (Plant)",
"class": "plant",
"pp": 4,
"rarity": "mystic",
"desc": "+50 de vida máxima y +15 % a las curaciones y escudos que da."
},
{
"id": "plant-leafy-pot",
"name": "Leafy Pot",
"class": "plant",
"pp": 3,
"rarity": "epic",
"desc": "Al usar la carta, el Axie gana +25 de escudo."
},
{
"id": "plant-oak-bud",
"name": "Oak Bud",
"class": "plant",
"pp": 4,
"rarity": "mystic",
"desc": "Empieza el combate con +35 de escudo y +20 al escudo de la carta."
},
{
"id": "plant-plants-charm-of-faith-i",
"name": "Plant's Charm of Faith I",
"class": "plant",
"pp": 1,
"rarity": "common",
"desc": "+8 al escudo o a la curación de la carta."
},
{
"id": "plant-plants-charm-of-faith-ii",
"name": "Plant's Charm of Faith II",
"class": "plant",
"pp": 2,
"rarity": "rare",
"desc": "+16 al escudo o a la curación de la carta."
},
{
"id": "plant-plants-charm-of-vitality-i",
"name": "Plant's Charm of Vitality I",
"class": "plant",
"pp": 1,
"rarity": "common",
"desc": "+20 de vida máxima."
},
{
"id": "plant-plants-charm-of-vitality-ii",
"name": "Plant's Charm of Vitality II",
"class": "plant",
"pp": 2,
"rarity": "rare",
"desc": "+45 de vida máxima."
},
{
"id": "plant-red-sage",
"name": "Red Sage",
"class": "plant",
"pp": 4,
"rarity": "mystic",
"desc": "Al usar la carta, el Axie se quita 1 perjuicio."
},
{
"id": "plant-secret-sprout",
"name": "Secret Sprout",
"class": "plant",
"pp": 2,
"rarity": "rare",
"desc": "Al usar la carta, cura 15 HP al aliado adyacente con menos vida."
},
{
"id": "reptile-awaken-stamp-reptile",
"name": "Awaken Stamp (Reptile)",
"class": "reptile",
"pp": 4,
"rarity": "mystic",
"desc": "+55 de vida máxima y devuelve 15 de daño a quien le golpee cuerpo a cuerpo."
},
{
"id": "reptile-gecko-mask",
"name": "Gecko Mask",
"class": "reptile",
"pp": 3,
"rarity": "epic",
"desc": "Recibe un 10 % menos de daño mientras tenga escudo."
},
{
"id": "reptile-gloves-of-infection",
"name": "Gloves of Infection",
"class": "reptile",
"pp": 4,
"rarity": "mystic",
"desc": "+14 de daño a la carta y aplica Veneno de 15 (2 turnos)."
},
{
"id": "reptile-reptiles-charm-of-endurance-i",
"name": "Reptile's Charm of Endurance I",
"class": "reptile",
"pp": 1,
"rarity": "common",
"desc": "+20 de vida máxima."
},
{
"id": "reptile-reptiles-charm-of-endurance-ii",
"name": "Reptile's Charm of Endurance II",
"class": "reptile",
"pp": 2,
"rarity": "rare",
"desc": "+40 de vida máxima y +10 al escudo de la carta."
},
{
"id": "reptile-reptiles-charm-of-vitality-i",
"name": "Reptile's Charm of Vitality I",
"class": "reptile",
"pp": 1,
"rarity": "common",
"desc": "+20 de vida máxima."
},
{
"id": "reptile-reptiles-charm-of-vitality-ii",
"name": "Reptile's Charm of Vitality II",
"class": "reptile",
"pp": 2,
"rarity": "rare",
"desc": "+45 de vida máxima."
},
{
"id": "reptile-reptiles-energy-drink-m",
"name": "Reptile's Energy Drink M",
"class": "reptile",
"pp": 3,
"rarity": "epic",
"desc": "+1 PM y +30 de vida máxima."
},
{
"id": "reptile-sticky-lizard",
"name": "Sticky Lizard",
"class": "reptile",
"pp": 2,
"rarity": "rare",
"desc": "Si la carta empuja al rival contra un obstáculo, +15 de daño de colisión."
},
{
"id": "reptile-vipers-venom",
"name": "Viper's Venom",
"class": "reptile",
"pp": 2,
"rarity": "rare",
"desc": "La carta aplica Veneno de 10 (2 turnos)."
}
];

export const RUNE_BY_ID = Object.fromEntries(RUNES.map((r) => [r.id, r]));
export const CHARM_BY_ID = Object.fromEntries(CHARMS.map((c) => [c.id, c]));

/** ¿La runa sirve para un axie de esta clase? */
export const runeFits = (rune, axieClass) => !!rune && (rune.class === 'neutral' || rune.class === axieClass);
/** ¿El charm entra en una parte de esta clase? */
export const charmFits = (charm, partClass) => !!charm && (charm.class === 'neutral' || charm.class === partClass);

// ─────────────────────────────────────────── Potential Points por clase (GDD §3)

export const PP_CLASS = 3;     // PP de la clase del axie
export const PP_PER_PART = 2;  // PP de cada parte (para la clase de esa parte)
/** Orden canónico en que los charms neutrales gastan PP (después de la clase de su parte). */
export const NEUTRAL_PP_PRIORITY = ['aquatic', 'beast', 'bird', 'bug', 'dawn', 'dusk', 'mech', 'plant', 'reptile'];
const PARTS6 = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail'];
const lc = (s) => String(s || '').toLowerCase();

/** PP de cada clase: { bug: 7, beast: 2, bird: 6 }. partClasses = { eyes: 'bug', ears: 'bug', … }. */
export function ppPools(axieClass, partClasses = {}) {
  const pools = {};
  const add = (c, n) => { if (c) pools[c] = (pools[c] || 0) + n; };
  add(lc(axieClass), PP_CLASS);
  for (const p of PARTS6) add(lc(partClasses[p]), PP_PER_PART);
  return pools;
}

/**
 * Reparte el coste de los charms engarzados ({ parte: charmId }) entre los PP de cada clase.
 * Los charms de clase pagan con su clase; luego los neutrales (por orden de parte) con la clase de su parte y,
 * si no alcanza, con el resto de clases en el orden canónico.
 * Devuelve { pools, used, left, over, ok, total, totalUsed }: over = PP que faltan por clase ('neutral' si un neutral no cabe).
 */
export function ppAllocate(axieClass, partClasses = {}, charms = {}) {
  const pools = ppPools(axieClass, partClasses);
  const left = { ...pools };
  const used = {};
  const over = {};
  const spend = (c, n) => { left[c] = (left[c] || 0) - n; used[c] = (used[c] || 0) + n; };
  for (const p of PARTS6) {
    const ch = CHARM_BY_ID[charms[p]];
    if (!ch || ch.class === 'neutral') continue;
    const have = Math.max(0, left[ch.class] || 0);
    if (ch.pp > have) over[ch.class] = (over[ch.class] || 0) + ch.pp - have;
    spend(ch.class, Math.min(ch.pp, have));
  }
  for (const p of PARTS6) {
    const ch = CHARM_BY_ID[charms[p]];
    if (!ch || ch.class !== 'neutral') continue;
    let rest = ch.pp;
    for (const c of [lc(partClasses[p]), ...NEUTRAL_PP_PRIORITY]) {
      if (!rest) break;
      const take = Math.min(rest, Math.max(0, left[c] || 0));
      if (take > 0) { spend(c, take); rest -= take; }
    }
    if (rest > 0) over.neutral = (over.neutral || 0) + rest;
  }
  const total = Object.values(pools).reduce((a, b) => a + b, 0);
  const totalUsed = Object.values(used).reduce((a, b) => a + b, 0);
  return { pools, used, left, over, ok: !Object.keys(over).length, total, totalUsed };
}

/** ¿Se puede engarzar charmId en la parte sin pasarse de los PP de ninguna clase? (null = retirar, siempre se puede) */
export function ppCanSet(axieClass, partClasses, charms, part, charmId) {
  if (!charmId) return { ok: true, over: {} };
  const next = { ...charms, [part]: charmId };
  const r = ppAllocate(axieClass, partClasses, next);
  return { ok: r.ok, over: r.over, alloc: r };
}


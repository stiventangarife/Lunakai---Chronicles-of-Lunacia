# VFX pendientes: Bing, Pomodoro y enemigos

> **Estado: completado (19-oct).** El equipo de arte hizo los 66 efectos: `mod-starter-bing.js`, `mod-starter-pomodoro.js`, las fábricas `mod-basicos-*.js` y `mod-enemigos.js`. La auditoría da 12/12 en Bing y Pomodoro y 61/61 en enemigos, sin fallos. Detalles en el [Hito 42](HITO_42_AUDITORIA_VFX_COMPLETOS_Y_PRECOMPILADO.md). Esta lista queda como referencia de diseño.

_19-oct-2026 · Lista para el motor de VFX (`src/vfx/`). Sale de la auditoría del 19-oct: las 235 cartas de partes, las 30 de colección, el Sapidae y las ultimates ya tienen efecto; faltan **66 habilidades**: 5 de Bing y Pomodoro y 61 de enemigos._

## 1. Cómo usar esta lista

- Cada habilidad tiene un **tipo de efecto** (sección 3). Con **21 tipos** se cubren las 61 de enemigos: no hace falta un módulo por habilidad. Un módulo por tipo, con la paleta como parámetro.
- Cada tipo parte de una **plantilla base** del motor (`lanza`, `tajo`, `area`, `aura`, `heal`) y respeta el contrato de módulo `{key, name, dur, ti, phases, pal, build(a), pose(te, o)}` registrado con `VFX.module(nombre, defs)`.
- Las 5 de Bing y Pomodoro sí merecen efecto propio (son cartas del jugador y se ven todo el rato). Van en la sección 2.
- **Duración**: enemigos entre 0,5 y 1,0 s (el turno enemigo no debe hacerse largo); solo el cataclismo del jefe pasa de 1,5 s.

### Paletas
Ya existen: Arcano, Fuego, Veneno, Estelar, Sagrado. Propuestas nuevas (`PALETTES` en `vfx-core.js`, 2 colores: claro y oscuro):

| Paleta | Claro | Oscuro | Para |
|---|---|---|---|
| Salvaje | `#ffd9a0` | `#c2452d` | marrón/rojo, mordiscos y garras |
| Tierra | `#e8c48a` | `#7a5230` | roca, polvo, sísmicos |
| Hielo | `#e6fbff` | `#4fa8ff` | lobos grises, novas de hielo |
| Agua | `#a8f0ff` | `#1f7fd6` | lobos acuáticos, curas de slime |
| Baba | `#d8ff9a` | `#3bbf6a` | slimes |
| Naturaleza | `#c8ff8a` | `#2f9e3f` | dríades, espinas, lianas |
| Madera | `#f0d29a` | `#8a5a2b` | treants, osos, corteza |
| Esporas | `#fff3b0` | `#c27bd6` | esporas y polen de flores |
| Polen | `#fff3b0` | `#e0a23a` | slime floral |
| Roca | `#d6d2c8` | `#6b6560` | slime de caverna |

## 2. Bing y Pomodoro (5 cartas con efecto propio)

| Personaje | Carta (id) | PA · alcance | Qué hace | Plantilla | Paleta | Dur. | Idea de VFX |
|---|---|---|---|---|---|---|---|
| Bing | Puppy (`starter_bing_mouth`) | 2 · 1-1 | 50–61 de daño. +20 % de daño a todos los aliados (2 turnos). | `tajo` | Fuego + Estelar | 0,8 s | Mordisco juguetón: dos arcos cortos tipo «ñam» sobre el objetivo con huesitos/estrellas que saltan. Después, un pulso dorado sale de Bing y toca a cada aliado (aro breve a sus pies = Potenciado). |
| Bing | Toy Ball (`starter_bing_horn`) | 2 · 1-3 | 45–55 de daño. Aplica Provocación al lanzador (2 turnos). | `lanza` | Fuego | 0,8 s | Una pelota que bota en parábola (1–3 casillas) con 1–2 botes y rebota de vuelta hacia Bing; al volver, aro rojo de provocación sobre Bing. |
| Bing | Cone Shell (`starter_bing_back`) | 2 · 0-3 | Cura 60 HP a un aliado. | `heal` | Sagrado | 0,9 s | Concha cónica que gira sobre el aliado y suelta una espiral de agua/luz que baja hasta él; brillo verde al terminar. |
| Pomodoro | Lost Dream (`starter_pomodoro_horn`) | 2 · 0-0 | +50 de escudo y −20 % de daño recibido (2 turnos) al lanzador. +20 de escudo a todos los aliados. | `aura` | Sagrado + Estelar | 1,1 s | Burbuja de sueño (luna/estrellitas) que se infla sobre Pomodoro y se convierte en escudo hexagonal; luego se reparte en burbujas pequeñas que vuelan a cada aliado (+20 de escudo). |
| Pomodoro | Village Hero (`starter_pomodoro_back`) | 2 · 1-1 | 45–55 de daño (+10 por cada aliado con escudo, máx. +40). | `tajo` | Sagrado | 0,7 s | Golpe heroico: tajo con capa/destello dorado. Por cada aliado con escudo, una chispa extra que sale de ese aliado hacia el objetivo antes del impacto (lectura del bonus). |

**Integración**: añadir 5 entradas en `CARD_VFX` (`src/vfx/vfx-cards.js`), p. ej. `starter_bing_mouth: ['bingPuppy', 'bing-pomodoro']`, y un módulo `src/vfx/modules/mod-bing-pomodoro.js` con las 5 claves. `effectFor` ya las reproduce porque `cardIdFor` busca el `spell.id` en `CARD_VFX`.

## 3. Tipos de efecto para enemigos (21)

| Tipo | Plantilla | Dur. | Cómo se ve | Usos |
|---|---|---|---|---|
| **MORDISCO** | `tajo` | 0,7 s | Dos arcos de colmillo (arriba/abajo) que se cierran sobre el objetivo, chispa de impacto y 3–4 gotas/esquirlas. Sin proyectil. | 6 |
| **ZARPAZO** | `tajo` | 0,6 s | Tres estelas paralelas en diagonal (garras) que cruzan al objetivo; destello blanco al final. | 4 |
| **GOLPE** | `tajo` | 0,5 s | Onda corta de choque en el punto de impacto + anillo plano en el suelo; ligero temblor de cámara. | 6 |
| **EMBESTIDA** | `lanza` | 0,8 s | Estela que sale del lanzador hacia el objetivo (carga), impacto grande con polvo/salpicadura y flecha de empuje si hay `push`. | 4 |
| **GOLPE_SISMICO** | `area` | 1,0 s | Puño/pisotón en el centro, grietas que se abren en el suelo y rocas que saltan; anillo de polvo que se expande al radio del área. | 3 |
| **ESTOCADA** | `lanza` | 0,5 s | Línea recta fina y muy rápida (hoja) con brillo en la punta; impacto pequeño y preciso. | 1 |
| **GIRO_EMPUJE** | `area` | 0,9 s | Remolino de hojas/pétalos alrededor del lanzador que golpea las casillas vecinas y las empuja hacia fuera. | 1 |
| **ESCUPITAJO** | `lanza` | 0,8 s | Proyectil en parábola (bola líquida) con estela de gotas; charco/salpicadura al impactar. Si aplica veneno, burbujas verdes que se quedan 0,5 s. | 4 |
| **BABA_PEGAJOSA** | `lanza` | 0,9 s | Igual que escupitajo pero más lento y espeso; al impactar deja un charco que se estira (lectura de «ralentizado/pegado»). | 1 |
| **FLECHA** | `lanza` | 0,5 s | Flecha recta y rápida con estela fina; impacto con astillas. El «disparo certero» con una línea de mira previa de 0,2 s. | 2 |
| **PROYECTIL_MAGICO** | `lanza` | 0,7 s | Orbe brillante con estela de chispas y leve ondulación; estallido en estrella al impactar. | 2 |
| **RAFAGA** | `area` | 0,9 s | Varios orbes pequeños que salen en abanico y caen sobre las casillas del área. | 1 |
| **NOVA_CRUZ** | `area` | 1,0 s | Carga de 0,3 s en el centro y estallido que recorre la forma del área (cruz/círculo) casilla a casilla; cristales, esporas o llamas según la paleta. | 5 |
| **CATACLISMO** | `area` | 1,6 s | Efecto de jefe: oscurecer más el velo, columna de energía en el centro, ondas que recorren toda el área y temblor fuerte. Es el único que merece más de 1,5 s. | 1 |
| **ESPINAS** | `area` | 0,9 s | Espinas/raíces que brotan del suelo bajo el objetivo y se retraen; si inmoviliza, quedan enroscadas 0,5 s. | 2 |
| **ENREDO** | `area` | 1,0 s | Lianas que salen del suelo y se enroscan en espiral alrededor del objetivo (lectura clara de «inmovilizado»). | 1 |
| **NUBE_ESPORAS** | `area` | 1,1 s | Nube de partículas lentas que se expande en el área y se disipa; motas que flotan hacia arriba. | 1 |
| **RUGIDO** | `aura` | 0,9 s | Ondas concéntricas que salen de la boca del lanzador (cono o anillo) + polvo; si provoca, un icono/aro rojo sobre el lanzador. Temblor suave. | 6 |
| **AUTOBUFF** | `aura` | 0,9 s | Columna de energía que sube por el lanzador y aro en el suelo; destello al final (potenciado). | 2 |
| **ESCUDO** | `aura` | 0,8 s | Cúpula/hexágonos que se forman alrededor del objetivo y se desvanecen dejando un brillo; para corteza, placas de madera. | 5 |
| **CURA** | `heal` | 0,9 s | Partículas ascendentes y cruz/hoja suave sobre el objetivo; número verde ya lo pone la UI. | 3 |

Orden recomendado (más usos primero): MORDISCO, RUGIDO, GOLPE → NOVA_CRUZ, ESCUDO → ESCUPITAJO, EMBESTIDA, ZARPAZO → el resto. Con los 8 primeros ya se cubren 41 de 61.

## 4. Lista de enemigos (61 habilidades)

Columnas: PA · alcance (mín-máx) · área · objetivo. Los efectos vienen del `SpellManager`.

### Quimeras (tutorial y niveles)

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Fierce Bite (`chimera_bite`) | 3 · 1-1 · single · enemy | — | MORDISCO | Salvaje |
| Seismic Roar (`chimera_bellow`) | 3 · 1-2 · single · enemy | 25–32 de daño y empuje. Provocación al lanzador (2 turnos): hay que atacarle a él si está a tiro. | RUGIDO | Tierra |
| Acid Spit (`chimera_spit`) | 3 · 2-4 · single · enemy | 28–38 de daño a distancia. Veneno (8 por turno, 2 turnos). | ESCUPITAJO | Veneno |
| Regenerative Howl (`chimera_heal`) | 3 · 1-3 · single · ally | Cura 40–55 HP a un aliado y le quita un perjuicio. | CURA | Sagrado |
| Puffy's Glacial Nova (`chimera_frost_nova`) | 4 · 1-3 · cross1 · enemy | 35–45 de daño en cruz. −1 PM en su próximo turno. | NOVA_CRUZ | Hielo |

### Slime básico

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Viscous Strike (`slime_strike`) | 3 · 1-1 · single · enemy | Heavy bludgeon with dense gelatinous mass. | GOLPE | Baba |
| Gelatinous Shield (`slime_barrier`) | 2 · 0-0 · single · ally | +30 de escudo y −20 % de daño recibido (1 turno) a sí mismo o a un aliado. | ESCUDO | Baba |

### Slime de ataque

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Acid Shot (`slime_attack_spit`) | 3 · 2-4 · single · enemy | 28–38 de daño a distancia. Veneno (8 por turno, 2 turnos). | ESCUPITAJO | Veneno |
| Debilitating Slime (`slime_attack_goo`) | 3 · 1-1 · single · enemy | 26–34 de daño. Baba pegajosa: −1 PM en su próximo turno. | BABA_PEGAJOSA | Baba |

### Slime defensor

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Liquid Rock Charge (`slime_defense_slam`) | 3 · 1-1 · single · enemy | Battering ram strike that pushes the target 1 tile. | EMBESTIDA | Baba |
| Viscous Carapace (`slime_defense_barrier`) | 2 · 0-0 · single · ally | Solidifies the body granting +45 shield. | ESCUDO | Baba |

### Slime de apoyo

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Slime Pinch (`slime_support_pinch`) | 3 · 1-1 · single · enemy | Attack with gelatinous pseudopod. | GOLPE | Baba |
| Regenerative Mist (`slime_support_heal`) | 3 · 1-3 · single · ally | Watery balm that restores health to an ally. | CURA | Agua |

### Slime floral

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Floral Swipe (`slime_forest_a_swipe`) | 3 · 1-1 · single · enemy | Botanical slash with flower thorns. | ZARPAZO | Naturaleza |
| Acid Pollen (`slime_forest_a_spit`) | 3 · 2-4 · single · enemy | 28–38 de daño a distancia. Veneno (8 por turno, 2 turnos). | ESCUPITAJO | Polen |
| Thorny Sprout (`slime_forest_a_thorn`) | 2 · 1-2 · single · enemy | 22–30 de daño. Sangrado (12, 1 turno). | ESPINAS | Naturaleza |

### Lobo acuático

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Aquatic Bite (`wolf_aquatic_bite`) | 3 · 1-1 · single · enemy | Lunging bite infused with ocean currents. | MORDISCO | Agua |

### Lobo acuático alfa

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Tidal Bite (`wolf_aquatic_alpha_splash`) | 3 · 1-1 · single · enemy | Torrential bite that batters the enemy. | MORDISCO | Agua |
| Ancestral Roar (`wolf_aquatic_alpha_roar`) | 3 · 1-2 · single · enemy | 28–36 de daño y empuje. Provocación al lanzador (2 turnos). | RUGIDO | Agua |

### Lobo gris

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Frost Bite (`wolf_gray_bite`) | 3 · 1-1 · single · enemy | Chilling jaws that freeze the target. | MORDISCO | Hielo |
| Glacial Claw (`wolf_gray_slash`) | 3 · 1-1 · single · enemy | Razor ice claws delivering a swift rend. | ZARPAZO | Hielo |

### Lobo alfa

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Savage Bite (`wolf_alpha_bite`) | 3 · 1-1 · single · enemy | Alpha leader rend dealing severe damage. | MORDISCO | Salvaje |
| Polar Howl (`wolf_alpha_roar`) | 3 · 1-2 · single · enemy | 32–42 de daño y empuje. Provocación al lanzador (2 turnos). | RUGIDO | Hielo |
| Blizzard Fury (`wolf_alpha_nova`) | 4 · 1-3 · cross1 · enemy | Chilling gale punishing in a cross (5 tiles). | NOVA_CRUZ | Hielo |
| Aullido Alfa (`wolf_alpha_howl`) | 2 · 0-0 · single · self | Aullido intimidante que otorga +1 PA y +1 PM. | AUTOBUFF | Hielo |

### Treant flor

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Frozen Root Strike (`treant_flower_slam`) | 3 · 1-1 · single · enemy | Crushing blow from frost-covered roots. | GOLPE | Hielo |
| Glacial Spores (`treant_flower_nova`) | 4 · 1-3 · cross1 · enemy | 34–45 de daño en cruz. Débil: −20 % de daño (2 turnos). | NOVA_CRUZ | Esporas |

### Treant luchador

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Oak Fist (`treant_fighter_punch`) | 3 · 1-1 · single · enemy | Devastating punch with solid hardwood knuckles. | GOLPE | Madera |
| Sylvan Bash (`treant_fighter_bash`) | 3 · 1-1 · single · enemy | Heavy blow that knocks the enemy back 1 tile. | EMBESTIDA | Madera |
| Thick Bark (`treant_fighter_bark`) | 2 · 0-0 · single · ally | Hardens plant skin granting +55 shield. | ESCUDO | Madera |

### Dríade luchadora

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Sylvan Blade (`dryad_fighter_blade`) | 3 · 1-1 · single · enemy | Magical thrust infused with ancient sap. | ESTOCADA | Naturaleza |
| Thorn Dance (`dryad_fighter_dance`) | 3 · 1-2 · single · enemy | Agile spin with thorns that pushes the target 1 tile. | GIRO_EMPUJE | Naturaleza |
| Astral Slash (`dryad_fighter_slash`) | 3 · 1-1 · single · enemy | 38–50 de daño. Sangrado (12, 1 turno). | ZARPAZO | Estelar |

### Dríade maga

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Astral Spark (`dryad_mage_spark`) | 3 · 2-4 · single · enemy | Guided burst of stardust from a distance. | PROYECTIL_MAGICO | Estelar |
| Elven Dew (`dryad_mage_heal`) | 3 · 1-3 · single · ally | Cura 45–60 HP a un aliado y le quita un perjuicio. | CURA | Sagrado |
| Cosmic Channeling (`dryad_mage_burst`) | 4 · 1-3 · cross1 · enemy | 34–45 de daño en cruz. Frágil: +25 % de daño recibido (1 turno). | NOVA_CRUZ | Estelar |
| Orbe Arcano (`dryad_mage_orb`) | 3 · 1-4 · single · enemy | Proyectil mágico concentrado que inflige 38-52 de daño arcano a distancia. | PROYECTIL_MAGICO | Arcano |
| Ráfaga de la Espesura (`dryad_mage_blast`) | 4 · 1-3 · single · enemy | Descarga devastadora de energía que inflige 50-68 de daño. | RAFAGA | Naturaleza |
| Barrera Silvestre (`dryad_mage_barrier`) | 2 · 0-3 · single · ally | Crea un escudo de corteza que otorga +45 de Escudo. | ESCUDO | Madera |

### Dríade arquera

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Vine Arrow (`dryad_range_arrow`) | 3 · 2-4 · single · enemy | Precise botanical shaft fired with sylvan bow. | FLECHA | Naturaleza |
| Piercing Shot (`dryad_range_snipe`) | 3 · 1-4 · single · enemy | Focused high-range shot with armor penetration. | FLECHA | Arcano |
| Restraining Bramble (`dryad_range_root`) | 2 · 1-2 · single · enemy | Thorn whip punishing at close quarters. | ESPINAS | Naturaleza |

### Slime de caverna

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Cavern Slam (`slime_forest_b_slam`) | 3 · 1-1 · single · enemy | Heavy strike of hardened dark slime. | GOLPE | Roca |
| Volcanic Bile (`slime_forest_b_spit`) | 3 · 2-4 · single · enemy | Stream of toxic fluids and subterranean magma. | ESCUPITAJO | Fuego |
| Seismic Charge (`slime_forest_b_heavy`) | 3 · 1-1 · single · enemy | Brutal charge that knocks back 1 tile. | EMBESTIDA | Roca |

### Slime de fusión

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Magma Fusion (`slime_fusion_burst`) | 3 · 1-3 · cross1 · enemy | Fiery explosion from fusing viscous cores. | NOVA_CRUZ | Fuego |

### Jefe hombre lobo

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Lupine Rend (`werewolf_boss_bite`) | 3 · 1-1 · single · enemy | 58–75 de daño. Sangrado (12 por turno, 2 turnos). | MORDISCO | Salvaje |
| Terrifying Howl (`werewolf_boss_roar`) | 3 · 1-2 · single · enemy | 38–50 de daño y empuje de 2. Provocación al lanzador (2 turnos). | RUGIDO | Salvaje |
| Beast Cataclysm (`werewolf_boss_cataclysm`) | 5 · 2-5 · cross1 · enemy | 60–80 de daño en cruz. Quemadura (20, 1 turno). | CATACLISMO | Fuego |

### Mamá osa

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Ladle Strike (`bear_mom_strike`) | 3 · 1-1 · single · enemy | Relentless bludgeoning with a war ladle. | GOLPE | Madera |
| Maternal Fury (`bear_mom_roar`) | 3 · 1-2 · single · enemy | Protective roar stunning and pushing 1 tile. | RUGIDO | Tierra |
| Sylvan Claw (`bear_mom_slam`) | 4 · 1-1 · single · enemy | Claw swipe that shakes the ground. | GOLPE_SISMICO | Tierra |

### Papá oso

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Colossal Claw (`bear_dad_claw`) | 3 · 1-1 · single · enemy | Devastating giant bear swipe crushing prey. | ZARPAZO | Salvaje |
| Earthquake Roar (`bear_dad_roar`) | 3 · 1-2 · single · enemy | Colossal bellow knocking back 1 tile causing a tremor. | RUGIDO | Tierra |
| Paternal Protection (`bear_dad_shield`) | 2 · 0-0 · single · ally | Deploys a protective barrier granting +70 shield. | ESCUDO | Sagrado |
| Titanic Bash (`bear_dad_slam`) | 4 · 1-1 · single · enemy | Unleashes full weight into a crushing blow. | GOLPE_SISMICO | Tierra |

### Treant

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Esporas Tóxicas (`treant_spore`) | 3 · 1-3 · single · enemy | Nube de esporas venenosas que infligen 30-44 de daño. | NUBE_ESPORAS | Veneno |
| Enredo de Raíces (`treant_entangle`) | 3 · 1-2 · single · enemy | Lanza raíces que atrapan al enemigo infligiendo 35-48 de daño. | ENREDO | Naturaleza |

### Hombre lobo

| Habilidad (id) | PA · alc. · área · obj. | Qué hace | Tipo | Paleta |
|---|---|---|---|---|
| Aplastamiento Feral (`werewolf_crush`) | 4 · 1-1 · single · enemy | Golpe demoledor cuerpo a cuerpo con 55-75 de daño. | GOLPE_SISMICO | Salvaje |
| Embate de Hielo (`werewolf_slam`) | 3 · 1-2 · single · enemy | Embate brutal que inflige 42-58 de daño glacial. | EMBESTIDA | Hielo |
| Rugido Cataclísmico (`werewolf_roar`) | 2 · 0-0 · single · self | Rugido ensordecedor que otorga +50 de Escudo y +1 PA. | AUTOBUFF | Salvaje |

## 5. Integración en el motor

1. **Módulos**: un archivo `src/vfx/modules/mod-enemigos.js` (o uno por familia de tipos) con un `def` por tipo. La paleta no va fija en el módulo: el puente llama a `core.setPalette(pal)` antes de reproducir.
2. **Tabla nueva `ENEMY_VFX`** en `VfxBridge.js` (hoy `effectFor` solo resuelve cartas de partes, Sapidae y ultimates):
```js
// id de habilidad enemiga → [clave del tipo, módulo, paleta]
const ENEMY_VFX = {
  chimera_bite: ['enMordisco', 'enemigos', 'Salvaje'],
  wolf_alpha_nova: ['enNovaCruz', 'enemigos', 'Hielo'],
  // …
};
// en effectFor(spell), antes de cardIdFor:
const en = ENEMY_VFX[spell?.id];
if (en) return { id: spell.id, key: en[0], module: en[1], pal: en[2] };
```
3. **Paleta por habilidad**: hoy `VfxBridge` toma la paleta del módulo (`core.palOf(ab)`, si no existe usa Arcano); hay que darle prioridad a `fx.pal` cuando venga de `ENEMY_VFX`, y añadir las paletas nuevas a `PALETTES`.
4. **Comprobación**: `lkDebug.vfxPlay('<id>')` en combate y `_test/vfxaudit.html` (debe pasar de 0/61 a 61/61 enemigos y de 7/12 a 12/12 Bing/Pomodoro).

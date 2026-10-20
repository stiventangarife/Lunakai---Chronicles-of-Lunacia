# Pruebas de habilidades

Lista de comandos para probar cada habilidad en la **arena de pruebas**: un muñeco con 25.000 de vida que no ataca ni se mueve. Copia una línea y pégala en la consola del navegador (F12 → Consola).

## Cómo empezar

```js
await lkDebug.arena()      // abre la arena (desde el mundo abierto o desde otro combate)
lkDebug.vfxAll(true)       // opcional: efectos nuevos en las 235 cartas, no solo en las de los Axies jugables
lkDebug.pruebas()          // tabla con las cartas del equipo actual y su comando
```

- `lkDebug.probar('id', distancia)` busca la unidad que tiene la carta (si nadie la tiene, la lanza el Axie principal), le da PA de sobra, cura al muñeco, lo coloca a esa distancia en una dirección libre y con visión, centra la cámara y lanza la carta por el camino normal del combate.
- Si la distancia no entra en el alcance de la carta, se usa la más cercana posible y la consola lo avisa.
- Cada lanzamiento escribe en la consola quién la lanzó, a qué distancia y cuánto daño hizo.
- **Las cartas de 1 a varias casillas aparecen dos veces** (cuerpo a cuerpo y distancia) para probar los dos casos.
- Para un bloque entero: `await lkDebug.probarLista([...], distancia)` (2,5 s entre cartas).
- ✨ = la carta usa un efecto del motor de VFX nuevo.

## Axies jugables

Shinji, Early Bird y Big Yak (cartas de partes) y las cartas α de Bing y Pomodoro.

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_aquatic_eyes_gero', 1)          // ✨ Gero · Shinji · Acuático ojos · AL 1–4
lkDebug.probar('part_beast_ears_nyan', 1)            // ✨ Nyan · Shinji · Bestia orejas · AL 1–2
lkDebug.probar('part_reptile_mouth_tiny_turtle', 1)  // ✨ Tiny Turtle · Shinji · Reptil boca · AL 1
lkDebug.probar('part_reptile_back_green_thorns', 1)  // ✨ Green Thorns · Shinji · Reptil espalda · AL 1–4
lkDebug.probar('part_reptile_tail_tiny_dino', 1)     // ✨ Tiny Dino · Shinji · Reptil cola · AL 1–2
lkDebug.probar('part_plant_mouth_zigzag', 1)         // ✨ Zigzag · Big Yak · Planta boca · AL 1
lkDebug.probar('part_plant_horn_cactus', 1)          // ✨ Cactus · Big Yak · Planta cuerno · AL 1–2
lkDebug.probar('part_reptile_tail_iguana', 1)        // ✨ Iguana · Big Yak · Reptil cola · AL 1–3
lkDebug.probar('starter_bing_ears', 1)               // ✨ Puppy · Bing · Bestia orejas · AL 1–2
lkDebug.probar('starter_bing_mouth', 1)              // Puppy · Bing · Bestia boca · AL 1
lkDebug.probar('starter_bing_horn', 1)               // Toy Ball · Bing · Bestia cuerno · AL 1–3
lkDebug.probar('starter_bing_tail', 1)               // ✨ Shiba · Bing · Bestia cola · AL 1–2
lkDebug.probar('starter_pomodoro_back', 1)           // Village Hero · Pomodoro · Mech espalda · AL 1
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_aquatic_eyes_gero', 'part_beast_ears_nyan', 'part_reptile_mouth_tiny_turtle', 'part_reptile_back_green_thorns', 'part_reptile_tail_tiny_dino', 'part_plant_mouth_zigzag', 'part_plant_horn_cactus', 'part_reptile_tail_iguana', 'starter_bing_ears', 'starter_bing_mouth', 'starter_bing_horn', 'starter_bing_tail', 'starter_pomodoro_back'], 1)
```

### Distancia

```js
lkDebug.probar('part_aquatic_eyes_gero', 3)          // ✨ Gero · Shinji · Acuático ojos · AL 1–4
lkDebug.probar('part_beast_ears_nyan', 2)            // ✨ Nyan · Shinji · Bestia orejas · AL 1–2
lkDebug.probar('part_bird_horn_trump', 3)            // ✨ Trump · Shinji · Pájaro cuerno · AL 2–4
lkDebug.probar('part_reptile_back_green_thorns', 3)  // ✨ Green Thorns · Shinji · Reptil espalda · AL 1–4
lkDebug.probar('part_reptile_tail_tiny_dino', 2)     // ✨ Tiny Dino · Shinji · Reptil cola · AL 1–2
lkDebug.probar('part_bird_ears_early_bird', 3)       // ✨ Early Bird · Early Bird · Pájaro orejas · AL 2–4
lkDebug.probar('part_bird_mouth_little_owl', 3)      // ✨ Little Owl · Early Bird · Pájaro boca · AL 2–4
lkDebug.probar('part_bird_back_cupid', 3)            // ✨ Cupid · Early Bird · Pájaro espalda · AL 2–5
lkDebug.probar('part_bird_tail_the_last_one', 3)     // ✨ The Last One · Early Bird · Pájaro cola · AL 2–5
lkDebug.probar('part_plant_horn_cactus', 2)          // ✨ Cactus · Big Yak · Planta cuerno · AL 1–2
lkDebug.probar('part_reptile_tail_iguana', 3)        // ✨ Iguana · Big Yak · Reptil cola · AL 1–3
lkDebug.probar('starter_bing_ears', 2)               // ✨ Puppy · Bing · Bestia orejas · AL 1–2
lkDebug.probar('starter_bing_horn', 3)               // Toy Ball · Bing · Bestia cuerno · AL 1–3
lkDebug.probar('starter_bing_tail', 2)               // ✨ Shiba · Bing · Bestia cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_aquatic_eyes_gero', 'part_beast_ears_nyan', 'part_bird_horn_trump', 'part_reptile_back_green_thorns', 'part_reptile_tail_tiny_dino', 'part_bird_ears_early_bird', 'part_bird_mouth_little_owl', 'part_bird_back_cupid', 'part_bird_tail_the_last_one', 'part_plant_horn_cactus', 'part_reptile_tail_iguana', 'starter_bing_ears', 'starter_bing_horn', 'starter_bing_tail'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_beast_eyes_puppy')          // ✨ Puppy · Early Bird · Bestia ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_horn_scaly_spoon')  // ✨ Scaly Spoon · Early Bird · Reptil cuerno · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_eyes_blossom')        // ✨ Blossom · Big Yak · Planta ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_ears_hollow', 1)      // ✨ Hollow · Big Yak · Planta orejas · AL 1–3 · casilla vacía
lkDebug.probar('part_plant_back_bidens')         // ✨ Bidens · Big Yak · Planta espalda · AL 0–3 · sobre un aliado
lkDebug.probar('starter_bing_eyes')              // ✨ Puppy · Bing · Bestia ojos · AL 0–3 · sobre un aliado
lkDebug.probar('starter_bing_back')              // Cone Shell · Bing · Planta espalda · AL 0–3 · sobre un aliado
lkDebug.probar('starter_pomodoro_eyes')          // ✨ Passion · Pomodoro · Pájaro ojos · AL 0–3 · sobre un aliado
lkDebug.probar('starter_pomodoro_ears')          // ✨ Leaf Bug · Pomodoro · Bicho orejas · AL 0–3 · sobre un aliado
lkDebug.probar('starter_pomodoro_mouth')         // ✨ Platypus · Pomodoro · Bestia boca · AL 0 · sobre sí mismo
lkDebug.probar('starter_pomodoro_horn')          // Lost Dream · Pomodoro · Mech cuerno · AL 0 · sobre sí mismo
lkDebug.probar('starter_pomodoro_tail')          // ✨ Leaf Bug · Pomodoro · Bicho cola · AL 0–3 · sobre un aliado
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_beast_eyes_puppy', 'part_reptile_horn_scaly_spoon', 'part_plant_eyes_blossom', 'part_plant_ears_hollow', 'part_plant_back_bidens', 'starter_bing_eyes', 'starter_bing_back', 'starter_pomodoro_eyes', 'starter_pomodoro_ears', 'starter_pomodoro_mouth', 'starter_pomodoro_horn', 'starter_pomodoro_tail'])
```

## Sapidae (24)

Las lanza tu Sapidae si es de esa clase; si no, las lanza el Axie principal (sirve para ver el efecto y el daño).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('craft_anvil', 1)             // Yunque Táctico · Forjacubiles · AL 1–2
lkDebug.probar('craft_quake', 1)             // Impacto Sísmico · Forjacubiles · AL 1–2
lkDebug.probar('craft_turret', 1)            // Balista de Lunacia · Forjacubiles · AL 1–4
lkDebug.probar('shepard_astral_strike', 1)   // Fulgor Cósmico · Susurrador · AL 1–3
lkDebug.probar('lunalogist_bramble', 1)      // Zarzas Lunares · Lunalogista · AL 1–3
lkDebug.probar('lunalogist_spores', 1)       // Esporas Vigorizantes · Lunalogista · AL 1–3
lkDebug.probar('lunalogist_seed', 1)         // Semilla Parásita · Lunalogista · AL 1–3
lkDebug.probar('lunalogist_bloom', 1)        // Brotación Primigenia · Lunalogista · AL 1–3
lkDebug.probar('stargazer_vortex', 1)        // Vórtice Gravitacional · Astromante · AL 1–3
lkDebug.probar('stargazer_nova', 1)          // Nova Estelar · Astromante · AL 1–3
lkDebug.probar('stargazer_gravity_well', 1)  // Pozo Gravitatorio · Astromante · AL 1–4
lkDebug.probar('stargazer_eclipse', 1)       // Eclipse Cataclísmico · Astromante · AL 1–4
```

Todo el bloque:

```js
await lkDebug.probarLista(['craft_anvil', 'craft_quake', 'craft_turret', 'shepard_astral_strike', 'lunalogist_bramble', 'lunalogist_spores', 'lunalogist_seed', 'lunalogist_bloom', 'stargazer_vortex', 'stargazer_nova', 'stargazer_gravity_well', 'stargazer_eclipse'], 1)
```

### Distancia

```js
lkDebug.probar('craft_anvil', 2)             // Yunque Táctico · Forjacubiles · AL 1–2
lkDebug.probar('craft_quake', 2)             // Impacto Sísmico · Forjacubiles · AL 1–2
lkDebug.probar('craft_turret', 3)            // Balista de Lunacia · Forjacubiles · AL 1–4
lkDebug.probar('shepard_astral_strike', 3)   // Fulgor Cósmico · Susurrador · AL 1–3
lkDebug.probar('lunalogist_bramble', 3)      // Zarzas Lunares · Lunalogista · AL 1–3
lkDebug.probar('lunalogist_spores', 3)       // Esporas Vigorizantes · Lunalogista · AL 1–3
lkDebug.probar('lunalogist_seed', 3)         // Semilla Parásita · Lunalogista · AL 1–3
lkDebug.probar('lunalogist_bloom', 3)        // Brotación Primigenia · Lunalogista · AL 1–3
lkDebug.probar('stargazer_vortex', 3)        // Vórtice Gravitacional · Astromante · AL 1–3
lkDebug.probar('stargazer_nova', 3)          // Nova Estelar · Astromante · AL 1–3
lkDebug.probar('stargazer_gravity_well', 3)  // Pozo Gravitatorio · Astromante · AL 1–4
lkDebug.probar('stargazer_eclipse', 3)       // Eclipse Cataclísmico · Astromante · AL 1–4
```

Todo el bloque:

```js
await lkDebug.probarLista(['craft_anvil', 'craft_quake', 'craft_turret', 'shepard_astral_strike', 'lunalogist_bramble', 'lunalogist_spores', 'lunalogist_seed', 'lunalogist_bloom', 'stargazer_vortex', 'stargazer_nova', 'stargazer_gravity_well', 'stargazer_eclipse'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('craft_totem')                 // Tótem de Resguardo · Forjacubiles · AL 1–3 · sobre un aliado
lkDebug.probar('craft_barricade', 1)          // Barricada de Lunacia · Forjacubiles · AL 1–3 · casilla vacía
lkDebug.probar('craft_reinforce')             // Refuerzo de Placas · Forjacubiles · AL 1–3 · sobre un aliado
lkDebug.probar('shepard_balsam')              // Bálsamo Astral · Susurrador · AL 1–3 · sobre un aliado
lkDebug.probar('shepard_attunement')          // Sintonía Genética · Susurrador · AL 1–4 · sobre un aliado
lkDebug.probar('shepard_pack_howl')           // Aullido de Manada · Susurrador · AL 0 · sobre sí mismo
lkDebug.probar('shepard_spirit_bond')         // Lazo Simbiótico · Susurrador · AL 1–4 · sobre un aliado
lkDebug.probar('shepard_chimeric_awakening')  // Despertar Quimérico · Susurrador · AL 1–3 · sobre un aliado
lkDebug.probar('lunalogist_berry')            // Baya Lunar Alquímica · Lunalogista · AL 1–3 · sobre un aliado
lkDebug.probar('lunalogist_cloak')            // Manto Clorofílico · Lunalogista · AL 0 · sobre sí mismo
lkDebug.probar('stargazer_transpose')         // Transposición Estelar · Astromante · AL 1–4 · sobre un aliado
lkDebug.probar('stargazer_jump', 2)           // Salto Astral · Astromante · AL 2–4 · casilla vacía
```

Todo el bloque:

```js
await lkDebug.probarLista(['craft_totem', 'craft_barricade', 'craft_reinforce', 'shepard_balsam', 'shepard_attunement', 'shepard_pack_howl', 'shepard_spirit_bond', 'shepard_chimeric_awakening', 'lunalogist_berry', 'lunalogist_cloak', 'stargazer_transpose', 'stargazer_jump'])
```

## Cartas de partes · Bestia

Para ver sus efectos nuevos, ejecuta antes lkDebug.vfxAll(true).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_beast_eyes_little_peas', 1)    // ✨ Little Peas · Bestia ojos · AL 1–4
lkDebug.probar('part_beast_eyes_sobby', 1)          // ✨ Sobby · Bestia ojos · AL 1–3
lkDebug.probar('part_beast_ears_belieber', 1)       // ✨ Belieber · Bestia orejas · AL 1–3
lkDebug.probar('part_beast_ears_nut_cracker', 1)    // ✨ Nut Cracker · Bestia orejas · AL 1–2
lkDebug.probar('part_beast_ears_nyan', 1)           // ✨ Nyan · Bestia orejas · AL 1–2
lkDebug.probar('part_beast_mouth_axie_kiss', 1)     // ✨ Axie Kiss · Bestia boca · AL 1–2
lkDebug.probar('part_beast_mouth_foxy', 1)          // ✨ Foxy · Bestia boca · AL 1
lkDebug.probar('part_beast_mouth_goda', 1)          // ✨ Goda · Bestia boca · AL 1
lkDebug.probar('part_beast_mouth_nut_cracker', 1)   // ✨ Nut Cracker · Bestia boca · AL 1
lkDebug.probar('part_beast_mouth_puff', 1)          // ✨ Puff · Bestia boca · AL 1
lkDebug.probar('part_beast_horn_arco', 1)           // ✨ Arco · Bestia cuerno · AL 1–2
lkDebug.probar('part_beast_horn_dual_blade', 1)     // ✨ Dual Blade · Bestia cuerno · AL 1
lkDebug.probar('part_beast_horn_imp', 1)            // ✨ Imp · Bestia cuerno · AL 1
lkDebug.probar('part_beast_horn_little_branch', 1)  // ✨ Little Branch · Bestia cuerno · AL 1–2
lkDebug.probar('part_beast_horn_pocky', 1)          // ✨ Pocky · Bestia cuerno · AL 1–3
lkDebug.probar('part_beast_back_furball', 1)        // ✨ Furball · Bestia espalda · AL 1–3
lkDebug.probar('part_beast_back_hero', 1)           // ✨ Hero · Bestia espalda · AL 1–2
lkDebug.probar('part_beast_back_jaguar', 1)         // ✨ Jaguar · Bestia espalda · AL 1
lkDebug.probar('part_beast_back_risky_beast', 1)    // ✨ Risky Beast · Bestia espalda · AL 1
lkDebug.probar('part_beast_back_ronin', 1)          // ✨ Ronin · Bestia espalda · AL 1
lkDebug.probar('part_beast_tail_buba_brush', 1)     // ✨ Buba Brush · Bestia cola · AL 1–2
lkDebug.probar('part_beast_tail_gerbil', 1)         // ✨ Gerbil · Bestia cola · AL 1–3
lkDebug.probar('part_beast_tail_hare', 1)           // ✨ Hare · Bestia cola · AL 1–3
lkDebug.probar('part_beast_tail_nut_cracker', 1)    // ✨ Nut Cracker · Bestia cola · AL 1
lkDebug.probar('part_beast_tail_rice', 1)           // ✨ Rice · Bestia cola · AL 1
lkDebug.probar('part_beast_tail_shiba', 1)          // ✨ Shiba · Bestia cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_beast_eyes_little_peas', 'part_beast_eyes_sobby', 'part_beast_ears_belieber', 'part_beast_ears_nut_cracker', 'part_beast_ears_nyan', 'part_beast_mouth_axie_kiss', 'part_beast_mouth_foxy', 'part_beast_mouth_goda', 'part_beast_mouth_nut_cracker', 'part_beast_mouth_puff', 'part_beast_horn_arco', 'part_beast_horn_dual_blade', 'part_beast_horn_imp', 'part_beast_horn_little_branch', 'part_beast_horn_pocky', 'part_beast_back_furball', 'part_beast_back_hero', 'part_beast_back_jaguar', 'part_beast_back_risky_beast', 'part_beast_back_ronin', 'part_beast_tail_buba_brush', 'part_beast_tail_gerbil', 'part_beast_tail_hare', 'part_beast_tail_nut_cracker', 'part_beast_tail_rice', 'part_beast_tail_shiba'], 1)
```

### Distancia

```js
lkDebug.probar('part_beast_eyes_little_peas', 3)    // ✨ Little Peas · Bestia ojos · AL 1–4
lkDebug.probar('part_beast_eyes_sobby', 3)          // ✨ Sobby · Bestia ojos · AL 1–3
lkDebug.probar('part_beast_ears_belieber', 3)       // ✨ Belieber · Bestia orejas · AL 1–3
lkDebug.probar('part_beast_ears_foxy', 3)           // ✨ Foxy · Bestia orejas · AL 2–5
lkDebug.probar('part_beast_ears_nut_cracker', 2)    // ✨ Nut Cracker · Bestia orejas · AL 1–2
lkDebug.probar('part_beast_ears_nyan', 2)           // ✨ Nyan · Bestia orejas · AL 1–2
lkDebug.probar('part_beast_mouth_axie_kiss', 2)     // ✨ Axie Kiss · Bestia boca · AL 1–2
lkDebug.probar('part_beast_horn_arco', 2)           // ✨ Arco · Bestia cuerno · AL 1–2
lkDebug.probar('part_beast_horn_boomerang', 3)      // ✨ Boomerang · Bestia cuerno · AL 2–4
lkDebug.probar('part_beast_horn_little_branch', 2)  // ✨ Little Branch · Bestia cuerno · AL 1–2
lkDebug.probar('part_beast_horn_pocky', 3)          // ✨ Pocky · Bestia cuerno · AL 1–3
lkDebug.probar('part_beast_back_furball', 3)        // ✨ Furball · Bestia espalda · AL 1–3
lkDebug.probar('part_beast_back_hero', 2)           // ✨ Hero · Bestia espalda · AL 1–2
lkDebug.probar('part_beast_tail_buba_brush', 2)     // ✨ Buba Brush · Bestia cola · AL 1–2
lkDebug.probar('part_beast_tail_gerbil', 3)         // ✨ Gerbil · Bestia cola · AL 1–3
lkDebug.probar('part_beast_tail_hare', 3)           // ✨ Hare · Bestia cola · AL 1–3
lkDebug.probar('part_beast_tail_shiba', 2)          // ✨ Shiba · Bestia cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_beast_eyes_little_peas', 'part_beast_eyes_sobby', 'part_beast_ears_belieber', 'part_beast_ears_foxy', 'part_beast_ears_nut_cracker', 'part_beast_ears_nyan', 'part_beast_mouth_axie_kiss', 'part_beast_horn_arco', 'part_beast_horn_boomerang', 'part_beast_horn_little_branch', 'part_beast_horn_pocky', 'part_beast_back_furball', 'part_beast_back_hero', 'part_beast_tail_buba_brush', 'part_beast_tail_gerbil', 'part_beast_tail_hare', 'part_beast_tail_shiba'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_beast_eyes_chubby')         // ✨ Chubby · Bestia ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_eyes_puppy')          // ✨ Puppy · Bestia ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_eyes_sparky')         // ✨ Sparky · Bestia ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_eyes_zeal')           // ✨ Zeal · Bestia ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_ears_innocent_lamb')  // ✨ Innocent Lamb · Bestia orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_ears_puppy')          // ✨ Puppy · Bestia orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_ears_zen')            // ✨ Zen · Bestia orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_mouth_confident')     // ✨ Confident · Bestia boca · AL 0–3 · sobre un aliado
lkDebug.probar('part_beast_mouth_platypus')      // ✨ Platypus · Bestia boca · AL 0 · sobre sí mismo
lkDebug.probar('part_beast_horn_lump')           // ✨ Lump · Bestia cuerno · AL 0–3 · sobre un aliado
lkDebug.probar('part_beast_horn_merry')          // ✨ Merry · Bestia cuerno · AL 0–4 · sobre un aliado
lkDebug.probar('part_beast_back_timber')         // ✨ Timber · Bestia espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_beast_tail_cottontail')     // ✨ Cottontail · Bestia cola · AL 0–3 · sobre un aliado
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_beast_eyes_chubby', 'part_beast_eyes_puppy', 'part_beast_eyes_sparky', 'part_beast_eyes_zeal', 'part_beast_ears_innocent_lamb', 'part_beast_ears_puppy', 'part_beast_ears_zen', 'part_beast_mouth_confident', 'part_beast_mouth_platypus', 'part_beast_horn_lump', 'part_beast_horn_merry', 'part_beast_back_timber', 'part_beast_tail_cottontail'])
```

## Cartas de partes · Planta

Para ver sus efectos nuevos, ejecuta antes lkDebug.vfxAll(true).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_plant_eyes_confusion', 1)     // ✨ Confusion · Planta ojos · AL 1–4
lkDebug.probar('part_plant_ears_leafy', 1)         // ✨ Leafy · Planta orejas · AL 1–3
lkDebug.probar('part_plant_ears_rosa', 1)          // ✨ Rosa · Planta orejas · AL 1–3
lkDebug.probar('part_plant_mouth_beetroot', 1)     // ✨ Beetroot · Planta boca · AL 1–2
lkDebug.probar('part_plant_mouth_herbivore', 1)    // ✨ Herbivore · Planta boca · AL 1
lkDebug.probar('part_plant_mouth_serious', 1)      // ✨ Serious · Planta boca · AL 1
lkDebug.probar('part_plant_mouth_zigzag', 1)       // ✨ Zigzag · Planta boca · AL 1
lkDebug.probar('part_plant_horn_bamboo_shoot', 1)  // ✨ Bamboo Shoot · Planta cuerno · AL 1–2
lkDebug.probar('part_plant_horn_beech', 1)         // ✨ Beech · Planta cuerno · AL 1–2
lkDebug.probar('part_plant_horn_cactus', 1)        // ✨ Cactus · Planta cuerno · AL 1–2
lkDebug.probar('part_plant_horn_persimmon', 1)     // ✨ Persimmon · Planta cuerno · AL 1–4
lkDebug.probar('part_plant_horn_watermelon', 1)    // ✨ Watermelon · Planta cuerno · AL 1–3
lkDebug.probar('part_plant_back_death_shroom', 1)  // ✨ Death Shroom · Planta espalda · AL 1–4
lkDebug.probar('part_plant_back_forest_hero', 1)   // ✨ Forest Hero · Planta espalda · AL 1–2
lkDebug.probar('part_plant_back_shiitake', 1)      // ✨ Shiitake · Planta espalda · AL 1–2
lkDebug.probar('part_plant_back_turnip', 1)        // ✨ Turnip · Planta espalda · AL 1–3
lkDebug.probar('part_plant_tail_carrot', 1)        // ✨ Carrot · Planta cola · AL 1–2
lkDebug.probar('part_plant_tail_cattail', 1)       // ✨ Cattail · Planta cola · AL 1–3
lkDebug.probar('part_plant_tail_hot_butt', 1)      // ✨ Hot Butt · Planta cola · AL 1–2
lkDebug.probar('part_plant_tail_potato_leaf', 1)   // ✨ Potato Leaf · Planta cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_plant_eyes_confusion', 'part_plant_ears_leafy', 'part_plant_ears_rosa', 'part_plant_mouth_beetroot', 'part_plant_mouth_herbivore', 'part_plant_mouth_serious', 'part_plant_mouth_zigzag', 'part_plant_horn_bamboo_shoot', 'part_plant_horn_beech', 'part_plant_horn_cactus', 'part_plant_horn_persimmon', 'part_plant_horn_watermelon', 'part_plant_back_death_shroom', 'part_plant_back_forest_hero', 'part_plant_back_shiitake', 'part_plant_back_turnip', 'part_plant_tail_carrot', 'part_plant_tail_cattail', 'part_plant_tail_hot_butt', 'part_plant_tail_potato_leaf'], 1)
```

### Distancia

```js
lkDebug.probar('part_plant_eyes_confusion', 3)     // ✨ Confusion · Planta ojos · AL 1–4
lkDebug.probar('part_plant_ears_leafy', 3)         // ✨ Leafy · Planta orejas · AL 1–3
lkDebug.probar('part_plant_ears_rosa', 3)          // ✨ Rosa · Planta orejas · AL 1–3
lkDebug.probar('part_plant_mouth_beetroot', 2)     // ✨ Beetroot · Planta boca · AL 1–2
lkDebug.probar('part_plant_horn_bamboo_shoot', 2)  // ✨ Bamboo Shoot · Planta cuerno · AL 1–2
lkDebug.probar('part_plant_horn_beech', 2)         // ✨ Beech · Planta cuerno · AL 1–2
lkDebug.probar('part_plant_horn_cactus', 2)        // ✨ Cactus · Planta cuerno · AL 1–2
lkDebug.probar('part_plant_horn_persimmon', 3)     // ✨ Persimmon · Planta cuerno · AL 1–4
lkDebug.probar('part_plant_horn_watermelon', 3)    // ✨ Watermelon · Planta cuerno · AL 1–3
lkDebug.probar('part_plant_back_death_shroom', 3)  // ✨ Death Shroom · Planta espalda · AL 1–4
lkDebug.probar('part_plant_back_forest_hero', 2)   // ✨ Forest Hero · Planta espalda · AL 1–2
lkDebug.probar('part_plant_back_shiitake', 2)      // ✨ Shiitake · Planta espalda · AL 1–2
lkDebug.probar('part_plant_back_turnip', 3)        // ✨ Turnip · Planta espalda · AL 1–3
lkDebug.probar('part_plant_tail_carrot', 2)        // ✨ Carrot · Planta cola · AL 1–2
lkDebug.probar('part_plant_tail_cattail', 3)       // ✨ Cattail · Planta cola · AL 1–3
lkDebug.probar('part_plant_tail_hot_butt', 2)      // ✨ Hot Butt · Planta cola · AL 1–2
lkDebug.probar('part_plant_tail_potato_leaf', 2)   // ✨ Potato Leaf · Planta cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_plant_eyes_confusion', 'part_plant_ears_leafy', 'part_plant_ears_rosa', 'part_plant_mouth_beetroot', 'part_plant_horn_bamboo_shoot', 'part_plant_horn_beech', 'part_plant_horn_cactus', 'part_plant_horn_persimmon', 'part_plant_horn_watermelon', 'part_plant_back_death_shroom', 'part_plant_back_forest_hero', 'part_plant_back_shiitake', 'part_plant_back_turnip', 'part_plant_tail_carrot', 'part_plant_tail_cattail', 'part_plant_tail_hot_butt', 'part_plant_tail_potato_leaf'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_plant_eyes_blossom')               // ✨ Blossom · Planta ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_eyes_cucumber_slice')        // ✨ Cucumber Slice · Planta ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_eyes_papi')                  // ✨ Papi · Planta ojos · AL 0–4 · sobre un aliado
lkDebug.probar('part_plant_eyes_risky_trunk')           // ✨ Risky Trunk · Planta ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_ears_clover')                // ✨ Clover · Planta orejas · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_ears_hollow', 1)             // ✨ Hollow · Planta orejas · AL 1–3 · casilla vacía
lkDebug.probar('part_plant_ears_lotus')                 // ✨ Lotus · Planta orejas · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_ears_sakura')                // ✨ Sakura · Planta orejas · AL 0–4 · sobre un aliado
lkDebug.probar('part_plant_mouth_silence_whisper')      // ✨ Silence Whisper · Planta boca · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_horn_mandarine')             // ✨ Mandarine · Planta cuerno · AL 0–4 · sobre un aliado
lkDebug.probar('part_plant_horn_rose_bud')              // ✨ Rose Bud · Planta cuerno · AL 0–4 · sobre un aliado
lkDebug.probar('part_plant_horn_strawberry_shortcake')  // ✨ Strawberry Shortcake · Planta cuerno · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_back_bidens')                // ✨ Bidens · Planta espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_back_mint')                  // ✨ Mint · Planta espalda · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_back_pumpkin')               // ✨ Pumpkin · Planta espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_back_succulent')             // ✨ Succulent · Planta espalda · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_back_watering_can')          // ✨ Watering Can · Planta espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_tail_hatsune')               // ✨ Hatsune · Planta cola · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_tail_mystery_seed')          // ✨ Mystery Seed · Planta cola · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_tail_shield_shroom')         // ✨ Shield Shroom · Planta cola · AL 0 · sobre sí mismo
lkDebug.probar('part_plant_tail_sprout')                // ✨ Sprout · Planta cola · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_tail_tropical_guardian')     // ✨ Tropical Guardian · Planta cola · AL 0–3 · sobre un aliado
lkDebug.probar('part_plant_tail_yam')                   // ✨ Yam · Planta cola · AL 0 · sobre sí mismo
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_plant_eyes_blossom', 'part_plant_eyes_cucumber_slice', 'part_plant_eyes_papi', 'part_plant_eyes_risky_trunk', 'part_plant_ears_clover', 'part_plant_ears_hollow', 'part_plant_ears_lotus', 'part_plant_ears_sakura', 'part_plant_mouth_silence_whisper', 'part_plant_horn_mandarine', 'part_plant_horn_rose_bud', 'part_plant_horn_strawberry_shortcake', 'part_plant_back_bidens', 'part_plant_back_mint', 'part_plant_back_pumpkin', 'part_plant_back_succulent', 'part_plant_back_watering_can', 'part_plant_tail_hatsune', 'part_plant_tail_mystery_seed', 'part_plant_tail_shield_shroom', 'part_plant_tail_sprout', 'part_plant_tail_tropical_guardian', 'part_plant_tail_yam'])
```

## Cartas de partes · Acuático

Para ver sus efectos nuevos, ejecuta antes lkDebug.vfxAll(true).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_aquatic_eyes_gero', 1)         // ✨ Gero · Acuático ojos · AL 1–4
lkDebug.probar('part_aquatic_eyes_sleepless', 1)    // ✨ Sleepless · Acuático ojos · AL 1–3
lkDebug.probar('part_aquatic_ears_gill', 1)         // ✨ Gill · Acuático orejas · AL 1–3
lkDebug.probar('part_aquatic_ears_inkling', 1)      // ✨ Inkling · Acuático orejas · AL 1–3
lkDebug.probar('part_aquatic_ears_little_crab', 1)  // ✨ Little Crab · Acuático orejas · AL 1–2
lkDebug.probar('part_aquatic_ears_seaslug', 1)      // ✨ Seaslug · Acuático orejas · AL 1
lkDebug.probar('part_aquatic_mouth_catfish', 1)     // ✨ Catfish · Acuático boca · AL 1
lkDebug.probar('part_aquatic_mouth_lam', 1)         // ✨ Lam · Acuático boca · AL 1
lkDebug.probar('part_aquatic_mouth_piranha', 1)     // ✨ Piranha · Acuático boca · AL 1
lkDebug.probar('part_aquatic_mouth_risky_fish', 1)  // ✨ Risky Fish · Acuático boca · AL 1
lkDebug.probar('part_aquatic_horn_anemone', 1)      // ✨ Anemone · Acuático cuerno · AL 1–3
lkDebug.probar('part_aquatic_horn_babylonia', 1)    // ✨ Babylonia · Acuático cuerno · AL 1–2
lkDebug.probar('part_aquatic_horn_clamshell', 1)    // ✨ Clamshell · Acuático cuerno · AL 1–2
lkDebug.probar('part_aquatic_horn_oranda', 1)       // ✨ Oranda · Acuático cuerno · AL 1–3
lkDebug.probar('part_aquatic_back_anemone', 1)      // ✨ Anemone · Acuático espalda · AL 1–3
lkDebug.probar('part_aquatic_back_blue_moon', 1)    // ✨ Blue Moon · Acuático espalda · AL 1–3
lkDebug.probar('part_aquatic_back_goldfish', 1)     // ✨ Goldfish · Acuático espalda · AL 1–3
lkDebug.probar('part_aquatic_back_perch', 1)        // ✨ Perch · Acuático espalda · AL 1–4
lkDebug.probar('part_aquatic_tail_koi', 1)          // ✨ Koi · Acuático cola · AL 1–3
lkDebug.probar('part_aquatic_tail_navaga', 1)       // ✨ Navaga · Acuático cola · AL 1–2
lkDebug.probar('part_aquatic_tail_puff', 1)         // ✨ Puff · Acuático cola · AL 1–3
lkDebug.probar('part_aquatic_tail_tadpole', 1)      // ✨ Tadpole · Acuático cola · AL 1–4
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_aquatic_eyes_gero', 'part_aquatic_eyes_sleepless', 'part_aquatic_ears_gill', 'part_aquatic_ears_inkling', 'part_aquatic_ears_little_crab', 'part_aquatic_ears_seaslug', 'part_aquatic_mouth_catfish', 'part_aquatic_mouth_lam', 'part_aquatic_mouth_piranha', 'part_aquatic_mouth_risky_fish', 'part_aquatic_horn_anemone', 'part_aquatic_horn_babylonia', 'part_aquatic_horn_clamshell', 'part_aquatic_horn_oranda', 'part_aquatic_back_anemone', 'part_aquatic_back_blue_moon', 'part_aquatic_back_goldfish', 'part_aquatic_back_perch', 'part_aquatic_tail_koi', 'part_aquatic_tail_navaga', 'part_aquatic_tail_puff', 'part_aquatic_tail_tadpole'], 1)
```

### Distancia

```js
lkDebug.probar('part_aquatic_eyes_gero', 3)         // ✨ Gero · Acuático ojos · AL 1–4
lkDebug.probar('part_aquatic_eyes_sleepless', 3)    // ✨ Sleepless · Acuático ojos · AL 1–3
lkDebug.probar('part_aquatic_ears_gill', 3)         // ✨ Gill · Acuático orejas · AL 1–3
lkDebug.probar('part_aquatic_ears_inkling', 3)      // ✨ Inkling · Acuático orejas · AL 1–3
lkDebug.probar('part_aquatic_ears_little_crab', 2)  // ✨ Little Crab · Acuático orejas · AL 1–2
lkDebug.probar('part_aquatic_horn_anemone', 3)      // ✨ Anemone · Acuático cuerno · AL 1–3
lkDebug.probar('part_aquatic_horn_babylonia', 2)    // ✨ Babylonia · Acuático cuerno · AL 1–2
lkDebug.probar('part_aquatic_horn_clamshell', 2)    // ✨ Clamshell · Acuático cuerno · AL 1–2
lkDebug.probar('part_aquatic_horn_oranda', 3)       // ✨ Oranda · Acuático cuerno · AL 1–3
lkDebug.probar('part_aquatic_horn_shoal_star', 3)   // ✨ Shoal Star · Acuático cuerno · AL 2–4
lkDebug.probar('part_aquatic_back_anemone', 3)      // ✨ Anemone · Acuático espalda · AL 1–3
lkDebug.probar('part_aquatic_back_blue_moon', 3)    // ✨ Blue Moon · Acuático espalda · AL 1–3
lkDebug.probar('part_aquatic_back_goldfish', 3)     // ✨ Goldfish · Acuático espalda · AL 1–3
lkDebug.probar('part_aquatic_back_perch', 3)        // ✨ Perch · Acuático espalda · AL 1–4
lkDebug.probar('part_aquatic_tail_koi', 3)          // ✨ Koi · Acuático cola · AL 1–3
lkDebug.probar('part_aquatic_tail_navaga', 2)       // ✨ Navaga · Acuático cola · AL 1–2
lkDebug.probar('part_aquatic_tail_puff', 3)         // ✨ Puff · Acuático cola · AL 1–3
lkDebug.probar('part_aquatic_tail_shrimp', 3)       // ✨ Shrimp · Acuático cola · AL 2–5
lkDebug.probar('part_aquatic_tail_tadpole', 3)      // ✨ Tadpole · Acuático cola · AL 1–4
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_aquatic_eyes_gero', 'part_aquatic_eyes_sleepless', 'part_aquatic_ears_gill', 'part_aquatic_ears_inkling', 'part_aquatic_ears_little_crab', 'part_aquatic_horn_anemone', 'part_aquatic_horn_babylonia', 'part_aquatic_horn_clamshell', 'part_aquatic_horn_oranda', 'part_aquatic_horn_shoal_star', 'part_aquatic_back_anemone', 'part_aquatic_back_blue_moon', 'part_aquatic_back_goldfish', 'part_aquatic_back_perch', 'part_aquatic_tail_koi', 'part_aquatic_tail_navaga', 'part_aquatic_tail_puff', 'part_aquatic_tail_shrimp', 'part_aquatic_tail_tadpole'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_aquatic_eyes_baby')         // ✨ Baby · Acuático ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_aquatic_eyes_clear')        // ✨ Clear · Acuático ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_aquatic_eyes_telescope')    // ✨ Telescope · Acuático ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_aquatic_ears_bubblemaker')  // ✨ Bubblemaker · Acuático orejas · AL 0–4 · sobre un aliado
lkDebug.probar('part_aquatic_ears_nimo')         // ✨ Nimo · Acuático orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_aquatic_ears_tiny_fan')     // ✨ Tiny Fan · Acuático orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_aquatic_horn_teal_shell')   // ✨ Teal Shell · Acuático cuerno · AL 0–3 · sobre un aliado
lkDebug.probar('part_aquatic_back_hermit')       // ✨ Hermit · Acuático espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_aquatic_back_sponge')       // ✨ Sponge · Acuático espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_aquatic_tail_nimo')         // ✨ Nimo · Acuático cola · AL 0 · sobre sí mismo
lkDebug.probar('part_aquatic_tail_ranchu')       // ✨ Ranchu · Acuático cola · AL 0 · sobre sí mismo
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_aquatic_eyes_baby', 'part_aquatic_eyes_clear', 'part_aquatic_eyes_telescope', 'part_aquatic_ears_bubblemaker', 'part_aquatic_ears_nimo', 'part_aquatic_ears_tiny_fan', 'part_aquatic_horn_teal_shell', 'part_aquatic_back_hermit', 'part_aquatic_back_sponge', 'part_aquatic_tail_nimo', 'part_aquatic_tail_ranchu'])
```

## Cartas de partes · Pájaro

Para ver sus efectos nuevos, ejecuta antes lkDebug.vfxAll(true).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_bird_eyes_robin', 1)         // ✨ Robin · Pájaro ojos · AL 1–3
lkDebug.probar('part_bird_mouth_hungry_bird', 1)  // ✨ Hungry Bird · Pájaro boca · AL 1–3
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_bird_eyes_robin', 'part_bird_mouth_hungry_bird'], 1)
```

### Distancia

```js
lkDebug.probar('part_bird_eyes_little_owl', 3)       // ✨ Little Owl · Pájaro ojos · AL 2–5
lkDebug.probar('part_bird_eyes_robin', 3)            // ✨ Robin · Pájaro ojos · AL 1–3
lkDebug.probar('part_bird_ears_curly', 3)            // ✨ Curly · Pájaro orejas · AL 2–4
lkDebug.probar('part_bird_ears_early_bird', 3)       // ✨ Early Bird · Pájaro orejas · AL 2–4
lkDebug.probar('part_bird_ears_little_owl', 3)       // ✨ Little Owl · Pájaro orejas · AL 2–4
lkDebug.probar('part_bird_ears_peace_maker', 3)      // ✨ Peace Maker · Pájaro orejas · AL 2–4
lkDebug.probar('part_bird_ears_risky_bird', 3)       // ✨ Risky Bird · Pájaro orejas · AL 2–4
lkDebug.probar('part_bird_mouth_doubletalk', 3)      // ✨ Doubletalk · Pájaro boca · AL 2–4
lkDebug.probar('part_bird_mouth_feather_dagger', 3)  // ✨ Feather Dagger · Pájaro boca · AL 2–4
lkDebug.probar('part_bird_mouth_hungry_bird', 3)     // ✨ Hungry Bird · Pájaro boca · AL 1–3
lkDebug.probar('part_bird_mouth_little_owl', 3)      // ✨ Little Owl · Pájaro boca · AL 2–4
lkDebug.probar('part_bird_mouth_peace_maker', 3)     // ✨ Peace Maker · Pájaro boca · AL 2–4
lkDebug.probar('part_bird_horn_eggshell', 3)         // ✨ Eggshell · Pájaro cuerno · AL 2–4
lkDebug.probar('part_bird_horn_feather_spear', 3)    // ✨ Feather Spear · Pájaro cuerno · AL 2–5
lkDebug.probar('part_bird_horn_kestrel', 3)          // ✨ Kestrel · Pájaro cuerno · AL 2–4
lkDebug.probar('part_bird_horn_trump', 3)            // ✨ Trump · Pájaro cuerno · AL 2–4
lkDebug.probar('part_bird_horn_wing_horn', 3)        // ✨ Wing Horn · Pájaro cuerno · AL 2–5
lkDebug.probar('part_bird_back_balloon', 3)          // ✨ Balloon · Pájaro espalda · AL 2–4
lkDebug.probar('part_bird_back_cupid', 3)            // ✨ Cupid · Pájaro espalda · AL 2–5
lkDebug.probar('part_bird_back_lil_bro', 3)          // ✨ Lil Bro · Pájaro espalda · AL 2–4
lkDebug.probar('part_bird_back_paper_wing', 3)       // ✨ Paper Wing · Pájaro espalda · AL 2–4
lkDebug.probar('part_bird_back_pigeon_post', 3)      // ✨ Pigeon Post · Pájaro espalda · AL 2–4
lkDebug.probar('part_bird_back_raven', 3)            // ✨ Raven · Pájaro espalda · AL 2–4
lkDebug.probar('part_bird_back_tri_feather', 3)      // ✨ Tri Feather · Pájaro espalda · AL 2–4
lkDebug.probar('part_bird_tail_cloud', 3)            // ✨ Cloud · Pájaro cola · AL 2–5
lkDebug.probar('part_bird_tail_feather_fan', 3)      // ✨ Feather Fan · Pájaro cola · AL 2–4
lkDebug.probar('part_bird_tail_granmas_fan', 3)      // ✨ Granma's Fan · Pájaro cola · AL 2–4
lkDebug.probar('part_bird_tail_post_fight', 3)       // ✨ Post Fight · Pájaro cola · AL 2–4
lkDebug.probar('part_bird_tail_swallow', 3)          // ✨ Swallow · Pájaro cola · AL 2–4
lkDebug.probar('part_bird_tail_the_last_one', 3)     // ✨ The Last One · Pájaro cola · AL 2–5
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_bird_eyes_little_owl', 'part_bird_eyes_robin', 'part_bird_ears_curly', 'part_bird_ears_early_bird', 'part_bird_ears_little_owl', 'part_bird_ears_peace_maker', 'part_bird_ears_risky_bird', 'part_bird_mouth_doubletalk', 'part_bird_mouth_feather_dagger', 'part_bird_mouth_hungry_bird', 'part_bird_mouth_little_owl', 'part_bird_mouth_peace_maker', 'part_bird_horn_eggshell', 'part_bird_horn_feather_spear', 'part_bird_horn_kestrel', 'part_bird_horn_trump', 'part_bird_horn_wing_horn', 'part_bird_back_balloon', 'part_bird_back_cupid', 'part_bird_back_lil_bro', 'part_bird_back_paper_wing', 'part_bird_back_pigeon_post', 'part_bird_back_raven', 'part_bird_back_tri_feather', 'part_bird_tail_cloud', 'part_bird_tail_feather_fan', 'part_bird_tail_granmas_fan', 'part_bird_tail_post_fight', 'part_bird_tail_swallow', 'part_bird_tail_the_last_one'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_bird_eyes_concentrate')      // ✨ Concentrate · Pájaro ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bird_eyes_lucas')            // ✨ Lucas · Pájaro ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bird_eyes_mavis')            // ✨ Mavis · Pájaro ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bird_eyes_passion')          // ✨ Passion · Pájaro ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bird_ears_pink_cheek')       // ✨ Pink Cheek · Pájaro orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_bird_horn_big_sister')       // ✨ Big Sister · Pájaro cuerno · AL 0 · sobre sí mismo
lkDebug.probar('part_bird_horn_cuckoo')           // ✨ Cuckoo · Pájaro cuerno · AL 0–4 · sobre un aliado
lkDebug.probar('part_bird_back_kingfisher')       // ✨ Kingfisher · Pájaro espalda · AL 0–4 · sobre un aliado
lkDebug.probar('part_bird_back_rubber_duckling')  // ✨ Rubber Duckling · Pájaro espalda · AL 0–3 · sobre un aliado
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_bird_eyes_concentrate', 'part_bird_eyes_lucas', 'part_bird_eyes_mavis', 'part_bird_eyes_passion', 'part_bird_ears_pink_cheek', 'part_bird_horn_big_sister', 'part_bird_horn_cuckoo', 'part_bird_back_kingfisher', 'part_bird_back_rubber_duckling'])
```

## Cartas de partes · Bicho

Para ver sus efectos nuevos, ejecuta antes lkDebug.vfxAll(true).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_bug_eyes_kotaro', 1)              // ✨ Kotaro · Bicho ojos · AL 1–3
lkDebug.probar('part_bug_eyes_neo', 1)                 // ✨ Neo · Bicho ojos · AL 1–4
lkDebug.probar('part_bug_eyes_pacu', 1)                // ✨ Pacu · Bicho ojos · AL 1–3
lkDebug.probar('part_bug_ears_beetle_spike', 1)        // ✨ Beetle Spike · Bicho orejas · AL 1–2
lkDebug.probar('part_bug_ears_ear_breathing', 1)       // ✨ Ear Breathing · Bicho orejas · AL 1–3
lkDebug.probar('part_bug_ears_earwing', 1)             // ✨ Earwing · Bicho orejas · AL 1–3
lkDebug.probar('part_bug_mouth_cute_bunny', 1)         // ✨ Cute Bunny · Bicho boca · AL 1
lkDebug.probar('part_bug_mouth_mosquito', 1)           // ✨ Mosquito · Bicho boca · AL 1
lkDebug.probar('part_bug_mouth_pincer', 1)             // ✨ Pincer · Bicho boca · AL 1
lkDebug.probar('part_bug_mouth_square_teeth', 1)       // ✨ Square Teeth · Bicho boca · AL 1
lkDebug.probar('part_bug_horn_caterpillars', 1)        // ✨ Caterpillars · Bicho cuerno · AL 1–2
lkDebug.probar('part_bug_horn_lagging', 1)             // ✨ Lagging · Bicho cuerno · AL 1–3
lkDebug.probar('part_bug_horn_parasite', 1)            // ✨ Parasite · Bicho cuerno · AL 1–2
lkDebug.probar('part_bug_horn_pliers', 1)              // ✨ Pliers · Bicho cuerno · AL 1
lkDebug.probar('part_bug_back_buzz_buzz', 1)           // ✨ Buzz Buzz · Bicho espalda · AL 1–3
lkDebug.probar('part_bug_back_garish_worm', 1)         // ✨ Garish Worm · Bicho espalda · AL 1–2
lkDebug.probar('part_bug_back_sandal', 1)              // ✨ Sandal · Bicho espalda · AL 1
lkDebug.probar('part_bug_back_scarab', 1)              // ✨ Scarab · Bicho espalda · AL 1–2
lkDebug.probar('part_bug_back_spiky_wing', 1)          // ✨ Spiky Wing · Bicho espalda · AL 1–2
lkDebug.probar('part_bug_tail_centipede', 1)           // ✨ Centipede · Bicho cola · AL 1–3
lkDebug.probar('part_bug_tail_shield_crusher', 1)      // ✨ Shield Crusher · Bicho cola · AL 1–2
lkDebug.probar('part_bug_tail_thorny_caterpillar', 1)  // ✨ Thorny Caterpillar · Bicho cola · AL 1–2
lkDebug.probar('part_bug_tail_twin_tail', 1)           // ✨ Twin Tail · Bicho cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_bug_eyes_kotaro', 'part_bug_eyes_neo', 'part_bug_eyes_pacu', 'part_bug_ears_beetle_spike', 'part_bug_ears_ear_breathing', 'part_bug_ears_earwing', 'part_bug_mouth_cute_bunny', 'part_bug_mouth_mosquito', 'part_bug_mouth_pincer', 'part_bug_mouth_square_teeth', 'part_bug_horn_caterpillars', 'part_bug_horn_lagging', 'part_bug_horn_parasite', 'part_bug_horn_pliers', 'part_bug_back_buzz_buzz', 'part_bug_back_garish_worm', 'part_bug_back_sandal', 'part_bug_back_scarab', 'part_bug_back_spiky_wing', 'part_bug_tail_centipede', 'part_bug_tail_shield_crusher', 'part_bug_tail_thorny_caterpillar', 'part_bug_tail_twin_tail'], 1)
```

### Distancia

```js
lkDebug.probar('part_bug_eyes_kotaro', 3)              // ✨ Kotaro · Bicho ojos · AL 1–3
lkDebug.probar('part_bug_eyes_neo', 3)                 // ✨ Neo · Bicho ojos · AL 1–4
lkDebug.probar('part_bug_eyes_pacu', 3)                // ✨ Pacu · Bicho ojos · AL 1–3
lkDebug.probar('part_bug_ears_beetle_spike', 2)        // ✨ Beetle Spike · Bicho orejas · AL 1–2
lkDebug.probar('part_bug_ears_ear_breathing', 3)       // ✨ Ear Breathing · Bicho orejas · AL 1–3
lkDebug.probar('part_bug_ears_earwing', 3)             // ✨ Earwing · Bicho orejas · AL 1–3
lkDebug.probar('part_bug_horn_caterpillars', 2)        // ✨ Caterpillars · Bicho cuerno · AL 1–2
lkDebug.probar('part_bug_horn_lagging', 3)             // ✨ Lagging · Bicho cuerno · AL 1–3
lkDebug.probar('part_bug_horn_parasite', 2)            // ✨ Parasite · Bicho cuerno · AL 1–2
lkDebug.probar('part_bug_back_buzz_buzz', 3)           // ✨ Buzz Buzz · Bicho espalda · AL 1–3
lkDebug.probar('part_bug_back_garish_worm', 2)         // ✨ Garish Worm · Bicho espalda · AL 1–2
lkDebug.probar('part_bug_back_scarab', 2)              // ✨ Scarab · Bicho espalda · AL 1–2
lkDebug.probar('part_bug_back_spiky_wing', 2)          // ✨ Spiky Wing · Bicho espalda · AL 1–2
lkDebug.probar('part_bug_tail_centipede', 3)           // ✨ Centipede · Bicho cola · AL 1–3
lkDebug.probar('part_bug_tail_shield_crusher', 2)      // ✨ Shield Crusher · Bicho cola · AL 1–2
lkDebug.probar('part_bug_tail_thorny_caterpillar', 2)  // ✨ Thorny Caterpillar · Bicho cola · AL 1–2
lkDebug.probar('part_bug_tail_twin_tail', 2)           // ✨ Twin Tail · Bicho cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_bug_eyes_kotaro', 'part_bug_eyes_neo', 'part_bug_eyes_pacu', 'part_bug_ears_beetle_spike', 'part_bug_ears_ear_breathing', 'part_bug_ears_earwing', 'part_bug_horn_caterpillars', 'part_bug_horn_lagging', 'part_bug_horn_parasite', 'part_bug_back_buzz_buzz', 'part_bug_back_garish_worm', 'part_bug_back_scarab', 'part_bug_back_spiky_wing', 'part_bug_tail_centipede', 'part_bug_tail_shield_crusher', 'part_bug_tail_thorny_caterpillar', 'part_bug_tail_twin_tail'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_bug_eyes_bookworm')         // ✨ Bookworm · Bicho ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_eyes_ladybug_goggles')  // ✨ Ladybug Goggles · Bicho ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_eyes_nerdy')            // ✨ Nerdy · Bicho ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_ears_brimstone')        // ✨ Brimstone · Bicho orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_ears_larva')            // ✨ Larva · Bicho orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_ears_leaf_bug')         // ✨ Leaf Bug · Bicho orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_ears_tassels')          // ✨ Tassels · Bicho orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_ears_termite')          // ✨ Termite · Bicho orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_horn_antenna')          // ✨ Antenna · Bicho cuerno · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_horn_leaf_bug')         // ✨ Leaf Bug · Bicho cuerno · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_back_snail_shell')      // ✨ Snail Shell · Bicho espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_bug_tail_ant')              // ✨ Ant · Bicho cola · AL 0 · sobre sí mismo
lkDebug.probar('part_bug_tail_fish_snack')       // ✨ Fish Snack · Bicho cola · AL 0–3 · sobre un aliado
lkDebug.probar('part_bug_tail_gravel_ant')       // ✨ Gravel Ant · Bicho cola · AL 0–3 · sobre un aliado
lkDebug.probar('part_bug_tail_leaf_bug')         // ✨ Leaf Bug · Bicho cola · AL 0–3 · sobre un aliado
lkDebug.probar('part_bug_tail_pupae')            // ✨ Pupae · Bicho cola · AL 0–3 · sobre un aliado
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_bug_eyes_bookworm', 'part_bug_eyes_ladybug_goggles', 'part_bug_eyes_nerdy', 'part_bug_ears_brimstone', 'part_bug_ears_larva', 'part_bug_ears_leaf_bug', 'part_bug_ears_tassels', 'part_bug_ears_termite', 'part_bug_horn_antenna', 'part_bug_horn_leaf_bug', 'part_bug_back_snail_shell', 'part_bug_tail_ant', 'part_bug_tail_fish_snack', 'part_bug_tail_gravel_ant', 'part_bug_tail_leaf_bug', 'part_bug_tail_pupae'])
```

## Cartas de partes · Reptil

Para ver sus efectos nuevos, ejecuta antes lkDebug.vfxAll(true).

### Cuerpo a cuerpo (muñeco a 1 casilla)

```js
lkDebug.probar('part_reptile_eyes_topaz', 1)           // ✨ Topaz · Reptil ojos · AL 1–4
lkDebug.probar('part_reptile_ears_pogona', 1)          // ✨ Pogona · Reptil orejas · AL 1–3
lkDebug.probar('part_reptile_ears_sidebarb', 1)        // ✨ Sidebarb · Reptil orejas · AL 1–3
lkDebug.probar('part_reptile_ears_swirl', 1)           // ✨ Swirl · Reptil orejas · AL 1–4
lkDebug.probar('part_reptile_ears_venom_nail', 1)      // ✨ Venom Nail · Reptil orejas · AL 1–3
lkDebug.probar('part_reptile_mouth_chemical_fang', 1)  // ✨ Chemical Fang · Reptil boca · AL 1
lkDebug.probar('part_reptile_mouth_kotaro', 1)         // ✨ Kotaro · Reptil boca · AL 1–3
lkDebug.probar('part_reptile_mouth_razor_bite', 1)     // ✨ Razor Bite · Reptil boca · AL 1
lkDebug.probar('part_reptile_mouth_tiny_turtle', 1)    // ✨ Tiny Turtle · Reptil boca · AL 1
lkDebug.probar('part_reptile_horn_incisor', 1)         // ✨ Incisor · Reptil cuerno · AL 1–2
lkDebug.probar('part_reptile_horn_poison_tube', 1)     // ✨ Poison Tube · Reptil cuerno · AL 1–3
lkDebug.probar('part_reptile_horn_scaly_spear', 1)     // ✨ Scaly Spear · Reptil cuerno · AL 1–3
lkDebug.probar('part_reptile_horn_unko', 1)            // ✨ Unko · Reptil cuerno · AL 1–3
lkDebug.probar('part_reptile_back_green_thorns', 1)    // ✨ Green Thorns · Reptil espalda · AL 1–4
lkDebug.probar('part_reptile_back_tri_spikes', 1)      // ✨ Tri Spikes · Reptil espalda · AL 1–3
lkDebug.probar('part_reptile_tail_grass_snake', 1)     // ✨ Grass Snake · Reptil cola · AL 1–3
lkDebug.probar('part_reptile_tail_iguana', 1)          // ✨ Iguana · Reptil cola · AL 1–3
lkDebug.probar('part_reptile_tail_tiny_dino', 1)       // ✨ Tiny Dino · Reptil cola · AL 1–2
lkDebug.probar('part_reptile_tail_wall_gecko', 1)      // ✨ Wall Gecko · Reptil cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_reptile_eyes_topaz', 'part_reptile_ears_pogona', 'part_reptile_ears_sidebarb', 'part_reptile_ears_swirl', 'part_reptile_ears_venom_nail', 'part_reptile_mouth_chemical_fang', 'part_reptile_mouth_kotaro', 'part_reptile_mouth_razor_bite', 'part_reptile_mouth_tiny_turtle', 'part_reptile_horn_incisor', 'part_reptile_horn_poison_tube', 'part_reptile_horn_scaly_spear', 'part_reptile_horn_unko', 'part_reptile_back_green_thorns', 'part_reptile_back_tri_spikes', 'part_reptile_tail_grass_snake', 'part_reptile_tail_iguana', 'part_reptile_tail_tiny_dino', 'part_reptile_tail_wall_gecko'], 1)
```

### Distancia

```js
lkDebug.probar('part_reptile_eyes_topaz', 3)            // ✨ Topaz · Reptil ojos · AL 1–4
lkDebug.probar('part_reptile_ears_pogona', 3)           // ✨ Pogona · Reptil orejas · AL 1–3
lkDebug.probar('part_reptile_ears_sidebarb', 3)         // ✨ Sidebarb · Reptil orejas · AL 1–3
lkDebug.probar('part_reptile_ears_swirl', 3)            // ✨ Swirl · Reptil orejas · AL 1–4
lkDebug.probar('part_reptile_ears_venom_nail', 3)       // ✨ Venom Nail · Reptil orejas · AL 1–3
lkDebug.probar('part_reptile_mouth_kotaro', 3)          // ✨ Kotaro · Reptil boca · AL 1–3
lkDebug.probar('part_reptile_mouth_toothless_bite', 3)  // ✨ Toothless Bite · Reptil boca · AL 2–5
lkDebug.probar('part_reptile_horn_incisor', 2)          // ✨ Incisor · Reptil cuerno · AL 1–2
lkDebug.probar('part_reptile_horn_poison_tube', 3)      // ✨ Poison Tube · Reptil cuerno · AL 1–3
lkDebug.probar('part_reptile_horn_scaly_spear', 3)      // ✨ Scaly Spear · Reptil cuerno · AL 1–3
lkDebug.probar('part_reptile_horn_unko', 3)             // ✨ Unko · Reptil cuerno · AL 1–3
lkDebug.probar('part_reptile_back_green_thorns', 3)     // ✨ Green Thorns · Reptil espalda · AL 1–4
lkDebug.probar('part_reptile_back_tri_spikes', 3)       // ✨ Tri Spikes · Reptil espalda · AL 1–3
lkDebug.probar('part_reptile_tail_grass_snake', 3)      // ✨ Grass Snake · Reptil cola · AL 1–3
lkDebug.probar('part_reptile_tail_iguana', 3)           // ✨ Iguana · Reptil cola · AL 1–3
lkDebug.probar('part_reptile_tail_tiny_dino', 2)        // ✨ Tiny Dino · Reptil cola · AL 1–2
lkDebug.probar('part_reptile_tail_wall_gecko', 2)       // ✨ Wall Gecko · Reptil cola · AL 1–2
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_reptile_eyes_topaz', 'part_reptile_ears_pogona', 'part_reptile_ears_sidebarb', 'part_reptile_ears_swirl', 'part_reptile_ears_venom_nail', 'part_reptile_mouth_kotaro', 'part_reptile_mouth_toothless_bite', 'part_reptile_horn_incisor', 'part_reptile_horn_poison_tube', 'part_reptile_horn_scaly_spear', 'part_reptile_horn_unko', 'part_reptile_back_green_thorns', 'part_reptile_back_tri_spikes', 'part_reptile_tail_grass_snake', 'part_reptile_tail_iguana', 'part_reptile_tail_tiny_dino', 'part_reptile_tail_wall_gecko'], 3)
```

### Apoyo: sobre sí mismo, aliados o casilla vacía

```js
lkDebug.probar('part_reptile_eyes_gecko')         // ✨ Gecko · Reptil ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_eyes_punky')         // ✨ Punky · Reptil ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_eyes_scar')          // ✨ Scar · Reptil ojos · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_eyes_tricky')        // ✨ Tricky · Reptil ojos · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_ears_curved_spine')  // ✨ Curved Spine · Reptil orejas · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_ears_friezard')      // ✨ Friezard · Reptil orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_ears_hidden_ears')   // ✨ Hidden Ears · Reptil orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_ears_small_frill')   // ✨ Small Frill · Reptil orejas · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_mouth_tiny_dino')    // ✨ Tiny Dino · Reptil boca · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_horn_bumpy')         // ✨ Bumpy · Reptil cuerno · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_horn_cerastes')      // ✨ Cerastes · Reptil cuerno · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_horn_scaly_spoon')   // ✨ Scaly Spoon · Reptil cuerno · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_back_bone_sail')     // ✨ Bone Sail · Reptil espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_back_croc')          // ✨ Croc · Reptil espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_back_indian_star')   // ✨ Indian Star · Reptil espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_back_red_ear')       // ✨ Red Ear · Reptil espalda · AL 0–3 · sobre un aliado
lkDebug.probar('part_reptile_tail_gila')          // ✨ Gila · Reptil cola · AL 0 · sobre sí mismo
lkDebug.probar('part_reptile_tail_snake_jar')     // ✨ Snake Jar · Reptil cola · AL 0–3 · sobre un aliado
```

Todo el bloque:

```js
await lkDebug.probarLista(['part_reptile_eyes_gecko', 'part_reptile_eyes_punky', 'part_reptile_eyes_scar', 'part_reptile_eyes_tricky', 'part_reptile_ears_curved_spine', 'part_reptile_ears_friezard', 'part_reptile_ears_hidden_ears', 'part_reptile_ears_small_frill', 'part_reptile_mouth_tiny_dino', 'part_reptile_horn_bumpy', 'part_reptile_horn_cerastes', 'part_reptile_horn_scaly_spoon', 'part_reptile_back_bone_sail', 'part_reptile_back_croc', 'part_reptile_back_indian_star', 'part_reptile_back_red_ear', 'part_reptile_tail_gila', 'part_reptile_tail_snake_jar'])
```


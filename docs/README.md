# Lunakai: Chronicles of Lunacia - Documentación del Proyecto

Bienvenido al repositorio de documentación técnica, arquitectura y especificaciones de **Lunakai: Chronicles of Lunacia** (anteriormente *Axie Tactics*), un RPG táctico 3D con exploración de mundo abierto (*Overworld*) estilizado y combates estratégicos por turnos basado en la propiedad intelectual de Axie Infinity.

> **Estado actual (17-oct-2026) — versión de prueba:** el mundo jugable son las **5 grandes islas** con dirección de arte Genshin: Bosque, Sabana, Ártico, Mística y **Genesis** (la antigua Mazmorra, rediseñada en el Hito 24).
> - **Viaje entre islas:** se habla con el barquero **Pomodoro** en la playa de cada isla; los portales cardinales están retirados.
> - **Cuentas y nube (Hito 25):** inicio de sesión con Sky Mavis o correo y guardado en Supabase; falta la configuración del servidor.
> - **Motor de combate nuevo (Hitos 26–32):**
>   - eventos separados de los VFX;
>   - 22 estados alterados y triángulo de clases;
>   - las 24 habilidades de Sapidae;
>   - vínculo y Duo Ultimates, y Axie Care para subir el vínculo;
>   - las 235 cartas de partes con las cartas reales de cada Axie;
>   - pronóstico de daño, enemigos con estados y primera pasada de equilibrio.
> - **Pruebas de equilibrio:** cada combate queda registrado en el navegador. En la consola (F12), `lkDebug.balanceExport()` descarga el registro (Hito 32).
>
> Los hitos 2, 3, 6, 9, 10, 11 y 21 describen sistemas históricos y llevan una nota de estado al principio. Donde aparece "Mazmorra", hoy es Genesis.

---

## 📚 Índice Completo de Hitos de Desarrollo

1. [**Hito 1: Motor de Combate Táctico 3D por Turnos**](HITO_01_MOTOR_TACTICO.md)
   - Tablero táctico con cuadrícula isométrica ($N \times M$).
   - Sistema de turnos por iniciativa y línea de tiempo.
   - Sistema de cartas de partes de Axie (Boca, Cuerno, Espalda, Cola) con cálculo de afinidad elemental.
   - Modelos 3D, animaciones esqueléticas y barras de vida proyectadas.

2. [**Hito 2: Overworld Estilizado, Maestro Paladill y Quimeras Errantes**](HITO_02_OVERWORLD_PRADERA.md)
   - Entorno estilizado con hierba instanciada y viento procedural en GPU.
   - Flores con sombreado cel-shaded y árboles estilizados.
   - Camino de losas de piedra con Signed Distance Fields (SDF) y eliminación de Z-fighting.
   - NPC Maestro Paladill (`paladill.glb`) con diálogo interactivo (`[E]` para hablar).
   - Quimeras errantes con IA de patrulla, estado de alerta "!" y transición fluida a combate.

3. [**Hito 3: Macro-Cuadrícula de Lunacia (5x5 / 25 Zonas), 5 Biomas y Estructura Dofus**](HITO_03_MAPAS_CONTINUOS_Y_BIOMAS.md)
   - Macro-cuadrícula de Lunacia calibrada a $5 \times 5$ (25 regiones) con centro en el Dojo `[3, 3]`.
   - 5 biomas temáticos: Bosque (Verde 3x3), Ártico (Norte), Sabana (Este), Místico (Oeste) y Mazmorra (Sur).
   - Portales cardinales 3D en el suelo estilo Dofus y cortinillas direccionales.
   - Interfaz interactiva del **Mapa del Mundo (Tecla [M])** con pin del jugador en tiempo real.
   - *Histórico: la cuadrícula y los portales se retiraron en favor de las 5 islas y el barquero Pomodoro (Hito 23, sección 6).*

4. [**Hito 4: Sistema de Misiones, Diario de Aventuras y Gestión de NPCs**](HITO_04_SISTEMA_MISIONES_Y_NPCS.md)
   - Motor de misiones progresivas (`QuestManager.js`) con estados, objetivos y recompensas de graduación.
   - Diario de Aventuras / Libro de Misiones (`[L]`) con pestañas de activas/completadas y estilo pergamino.
   - Mini-panel HUD reactivo para seguimiento de objetivos activos en el Overworld.
   - Control territorial estricto en `NPCManager.js` para evitar duplicación del Maestro Paladill.

5. [**Hito 5: Progresión de Experiencia por Escuadrón, Habilidades e Inventario**](HITO_05_PROGRESION_EXP_HABILIDADES_E_INVENTARIO.md)
   - Curva dinámica de EXP de escuadrón: $\text{EXP}(L) = \text{round}(100 \times L^{1.35})$.
   - 4 Atributos Elementales: Vitalidad (HP), Ferocidad (Melee/Colisión), Agilidad (Rango/Crítico), Esencia (Magia/Curación).
   - Rediseño de Inventario (`[I]`) en 3 columnas: Paper Doll cruciforme 3x3, slots limpios con iconos, tooltip dinámico y desequipado rápido.

6. [**Hito 6: Skybox Mágico y Partículas Ambientales por Bioma**](HITO_06_SKYBOX_MAGICO_Y_PARTICULAS_AMBIENTALES.md)
   - Bóveda celeste procedimental reactiva a cada bioma con ciclo y atmósfera dinámica.
   - Sistemas de partículas GPU para hojas flotantes, nieve, arena, luciérnagas y brasas de lava.

7. [**Hito 7: HUD del Escuadrón de Mundo Abierto**](HITO_07_UI_ESCUADRON_MUNDO_ABIERTO.md)
   - Interfaz superior de héroes con barras de salud en tiempo real, clase e indicadores de estado.

8. [**Hito 8: Retratos 3D Dinámicos de Personajes**](HITO_08_RETRATOS_3D_DINAMICOS.md)
   - Renderizador secundario offscreen a $128 \times 128$ para generar retratos 3D en tiempo real para el HUD y la línea de iniciativa.

9. [**Hito 9: Corredor Fluvial Continuo, Lagos Glaciares y Abismo Volcánico**](HITO_09_RIO_EXTENDIDO_Y_ABISMO.md)
   - Río continuo que atraviesa la columna central (`gx = 3`, filas 1 a 5).
   - Nacimiento en lago glacial norte `[3, 1]`, ripples de manantial, puente de piedra transitable en `[3, 3]` y abismo de magma terminal en `[3, 5]`.

10. [**Hito 10: Santuario del Dojo, Pagoda Japonesa 3D, Arces Rojos y Estanque Zen**](HITO_10_SANTUARIO_DOJO_PAGODA_Y_ESTANQUE.md)
    - Integración del templo Pagoda 3D (`stylized_dojo.glb`) con colisiones sólidas en `[3, 3]`.
    - Estanque Zen con depresión física del terreno, agua traslúcida, lirios y peces vivos nadando con aleteo sinusoidal.
    - Arces japoneses rojos otoñales (`maple_red`), santuario de rocas monolíticas, bosque de bambú GPU y NPCs Maestro Paladill y Xia.

11. [**Hito 11: Naturaleza y Vegetación del Bioma Bosque (9 Macro-Zonas)**](HITO_11_VEGETACION_BIOMA_BOSQUE.md)
    - Sistema `ForestNatureManager.js` que puebla orgánicamente las 9 zonas centrales de bosque (`[2,2]` a `[4,4]`).
    - Pinos estilizados, rocas con colisión física, arbustos con bayas, setas silvestres, flores y tréboles de ribera.
    - Variantes arbóreas en `StylizedTrees.js`: `maple_red`, `golden` y `green`.

12. [**Hito 12: Sistema Multi-Ranura de Guardado, Nuevos Héroes e Iconos de Habilidades**](HITO_12_SISTEMA_SLOTS_GUARDADO_Y_HEROES.md)
    - 3 ranuras independientes en `localStorage` con auto-guardado en eventos clave.
    - Nuevo héroe líder Shinji (Beast #10455), Early Bird, Big Yak, Bing y Pomodoro.
    - Paquetes de iconos 2D dedicados para habilidades en combate e inventario (`assets/skills/heroes/`).

13. [**Hito 13: Pantalla de Carga GPU a 60 FPS, Transición Limpia de Salida y Menú de Opciones**](HITO_13_PANTALLA_CARGA_GPU_Y_TRANSICIONES_CAMARA.md)
    - Pantalla de carga profesional en inglés: "Loading Biome...", "LUNAKAI" y eliminación de emojis.
    - Animaciones 100% en GPU libres de *reflows* (orbe `translateZ` y barra con `translateX`/`scaleX`).
    - Transición de salida limpia esperando al primer frame útil renderizado (`waitForNextRenderFrame(2)`) con bloqueo de controles durante el desvanecimiento.
    - Método `snapToTarget(target)` en cámara para eliminar sacudidas y caídas de frames entre portales.
    - Botón de Opciones `⚙️ Options [ESC]` y modal de calibración de gráficos y sonido (`SettingsModal.js`).

14. [**Hito 14: Estudio de Personalización Sapidae estilo Dofus, Diorama 3D y Clases**](HITO_14_PERSONALIZACION_SAPIDAE_Y_DIORAMA.md)
    - Estudio de creación de personaje ergonómico en 3 columnas inspirado en *Dofus*.
    - Personalización estética en tiempo real con `SapidaeModularController.js`: peinados, ojos, cornamenta ancestral, tintes RGB y botón "Base Texture".
    - `CharacterPreviewDiorama.js`: Escenario 3D interactivo en la pantalla de inicio con pedestal, controles de rotación 360° y renderizado simultáneo de avatar y compañero Axie.
    - 4 Clases de Sapidae (Forjacubiles, Pastor de Estrellas, Lunalogista, Astromante) con estadísticas base y previsualización de 6 hechizos.
    - Localización integral de la interfaz de creación al inglés.

15. [**Hito 15: Criaturas Slime 3D en el Overworld, Filtro Fluvial y Depuración de Combate**](HITO_15_CRIATURAS_SLIME_Y_ENCUENTROS_BOSQUE.md)
    - Integración de criaturas Slime 3D interactivas en el bioma de bosque con `SlimeCreaturesManager.js`.
    - Sustitución de modelos preliminares por el modelo optimizado `slime.glb` y escala calibrada respecto al personaje.
    - Física de salto orgánico con altura y pausas atenuadas.
    - Restricción espacial para prevenir la aparición de slimes sobre el cauce del río central (`gx = 3`).
    - Resolución de bug crítico de combate táctico donde los slimes a 0 HP quedaban en estado `null` sin morir.
    - Depuración de nombres eliminando emojis informales.

16. [**Hito 16: Sistema de 6 Habilidades para Compañeros Axie, Partes Corporales Oficiales e Ilustraciones Dedicadas**](HITO_16_HABILIDADES_COMPANEROS_AXIE_Y_PARTES_CORPORALES.md)
    - Expansión del repertorio táctico a 6 habilidades completas por compañero Axie (Shinji, Early Bird y Big Yak).
    - Mapeo 1-a-1 de las 6 partes corporales oficiales de Axie Infinity (Eyes, Ears, Mouth, Horn, Back, Tail) con iconos de `assets/parts/`.
    - Medallas visuales circulares en la esquina de cada tarjeta de habilidad en `StartScreenUI.js` exclusivas para Axies.
    - Tooltips enriquecidos mostrando el badge de la parte corporal con su icono oficial.
    - Asignación de ilustraciones temáticas 100% únicas para las 18 habilidades de los compañeros.

17. [**Hito 17: Escena Abierta de Alta Fidelidad Visual (Demo_Scena)**](HITO_17_ESCENA_ALTA_CALIDAD_DEMO_SCENA.md)
    - Entorno de alta fidelidad estilo anime/cel-shaded en `demo_scena/`.
    - Terreno orgánico y continuo con ruido determinista Simplex (`Terrain.js`).
    - Césped estilizado V3 con 50.000 briznas instanciadas en GPU, viento y deformación al pisar (`VegetationManager.js`).
    - Árboles y rocas 3D de alta fidelidad instanciados en ~30 draw calls totales (`PropsManager.js`).
    - Río continuo con peces vivos animados, espadañas, rocas y ondas de choque (`WaterManager.js`).
    - Monumentos sagrados y monolitos con levitación mágica (`LandmarksManager.js`).

18. [**Hito 18: Arquitectura de las 5 Grandes Islas, Sistema Dual de Mapas y Minimapa Radar**](HITO_18_ARQUITECTURA_5_ISLAS_Y_SISTEMA_DUAL_MAPAS.md)
    - Reestructuración geográfica a 5 Grandes Islas Bioma: Bosque (Centro), Ártico (Norte), Sabana (Este), Místico (Oeste) y Mazmorra/Volcán (Sur).
    - Acceso libre a todas las islas desde el inicio (sin candados ni bloqueos) y 3 POIs emblemáticos por isla.
    - Modal de mapas dual (`[M]`): Pestaña Mapa Mundi y Pestaña Mapa de la Isla.
    - Botón de mapa insular contextual activo únicamente para la isla donde se encuentra el jugador.
    - Minimapa radar circular en pantalla (`MinimapHUD.js`) con cono de visión y rotación dinámica orientada en tiempo real.
    - Actualización: viaje entre islas con el barquero Pomodoro (`FerryTravelUI.js`) en la playa de cada isla.

19. [**Hito 19: Islas Lejanas del Horizonte, Balizas de Misión y Determinismo Procedimental**](HITO_19_ISLAS_LEJANAS_HORIZONTE_Y_DETERMINISMO_SEMILLAS.md)
    - Islas lejanas visibles en 360° en el horizonte con shaders atmosféricos sin coste en GPU (`DistantIsland.js`).
    - Silueta volcánica lunar en el sur con caldera principal, cráter de impacto con pico central y espiras de basalto (sustituida por la silueta de Genesis en el Hito 24).
    - Baliza de misión estilizada con punta de flecha limpia (sin carteles permanentes ni círculos deformados en el suelo).
    - Desaparición suave del indicador al aproximarse al NPC.
    - Determinismo procedural 100% consistente mediante algoritmo Mulberry32 (`createSeededRandom`), fijando posiciones permanentes de árboles, rocas y vegetación en cada reinicio.

20. [**Hito 20: Primera Gran Isla — Isla de la Sabana, Geografía de Meseta Alta y Ecosistema Árido**](HITO_20_ISLA_DE_LA_SABANA_ARQUITECTURA_Y_MESETAS.md)
    - Construcción de la primera gran isla tras el Bosque con idéntica escala macro-insular pero orografía distintiva de gran meseta / cañón tepuy escalonado ($Y \approx 25.5\text{ m}$).
    - Terreno estratificado con arenisca roja y ocre, dunas doradas y playas costeras (`SavannaTerrain.js`).
    - Mar abierto turquesa tropical en 360°, rompientes marinas de olas y oasis interior a $Y = 11.2\text{ m}$ con peces animados en cardumen (`SavannaWaterManager.js`).
    - Vegetación y props temáticos: palmeras del desierto, rocas de cañón, 45.000 briznas de hierba dorada instanciada (`InstancedMesh`) y ráfagas de viento/arena GPU (`SavannaParticles.js`).
    - Reubicación de NPCs (Bing, Desert Sentinel, Blacksmith Baruk, Hunter Zarek) sobre la meseta y purga de colisiones y capas del bosque legacy.
    - Siluetas panorámicas 360° de las demás islas visibles desde la cima (`SavannaDistantIslands.js`).

21. [**Hito 21: Auditoría de Postprocesado WebGL (Eliminación de Parpadeos Negros NaN), Sombras y Aislamiento de Entradas en UI**](HITO_21_AUDITORIA_POSTPROCESADO_NAN_Y_AISLAMIENTO_INPUTS.md)
    - Diagnóstico y eliminación definitiva de parpadeos negros por intoxicación de tiles en `UnrealBloomPass` + `OutputPass` (ACESFilmicToneMapping) causados por `NaN` / `-Infinity` en evaluadores GLSL.
    - Corrección de `smoothstep` invertidos en agua de sabana y bosque, río, estelas, césped y terreno a `1.0 - smoothstep(min, max, x)`.
    - Blindaje de operaciones `pow(x, y)` contra bases nulas (`log2(0) = -Inf`) y normalización segura de vectores en shaders.
    - Eliminación de *shadow acne* en laderas y mesetas corrigiendo el sesgo de luz direccional (`0.00002`) y actualizando su matriz en el mismo fotograma (`updateMatrixWorld()`).
    - Blindaje de portales cardinales en altura ($\Delta Y \le 3.5\text{ m}$) con muestreo real vía `getGroundHeight()` y CSS `.zone-curtain.hidden { display: none !important; }`.
    - Aislamiento completo de teclado en el estudio de creación del Sapidae (`StartScreenUI.js`), impidiendo bloqueos de escritura del nombre del héroe y desactivando atajos del Overworld mientras se escribe en inputs.

22. [**Hito 22: Dirección de Arte "Genshin Impact" para la Isla del Bosque (Isla 1)**](HITO_22_DIRECCION_DE_ARTE_GENSHIN_ISLA_BOSQUE.md)
    - Nueva capa de arte `demo_scena/genshin/` (orquestador `GenshinForestArt`) que cambia el look sin tocar jugabilidad, posiciones, colisiones ni HUD.
    - Iluminación de hora dorada con sombras azuladas, cielo anime con nubes cel-shaded procedurales y montañas lejanas con bruma (cordilleras nevadas + pilares kársticos estilo Liyue).
    - Césped denso y suave con flores silvestres en tiles instanciados que siguen al jugador, leyendo alturas y máscaras horneadas del terreno (frustum culling y LOD).
    - Árboles voluminosos pictóricos (otoño rojo/naranja/dorado + coníferas) en 14 draw calls; río translúcido con profundidad real, espuma, destellos y cáusticas; mar abierto renovado.
    - Rocas erosionadas con musgo, personajes en cel-shading suave con rim light, y postprocesado con god rays, lens flare y gradación de color.
    - Ajustes posteriores:
      - coníferas con tronco recto;
      - LOD del césped con fundido cruzado, sin *pop-in*;
      - corteza pintada a mano por variedad de árbol;
      - caminos de tierra a parches con surcos;
      - bruma de distancia celeste persistente.

23. [**Hito 23: Rediseño Genshin de las 4 Islas (Sabana, Ártico, Mística y Mazmorra)**](HITO_23_REDISENO_GENSHIN_CUATRO_ISLAS.md)
    - Kit compartido `world/islands/kit/` que hereda de los módulos del Bosque (sin modificarlos): terreno pictórico, caminos a parches, césped, árboles, cielo, agua, cristales, partículas y PostFX por isla.
    - Sabana: oasis en la cima a ras de suelo, hierba dorada, acacias y palmeras, estratos de arenisca y peñas en el mar.
    - Ártico: cuernos glaciares, valle en U, río y lago helados, cristales de hielo y permafrost con las rocas del pack Ártico.
    - Mística: Árbol Arcano, rocas grandes de cristal púrpura, pantano luminoso, santuario y observatorio.
    - Mazmorra: luna volcánica con cráteres en todo el mapa, volcán, ríos de lava, cripta y fortaleza (reemplazada por Genesis en el Hito 24); carga diferida de las islas nuevas.
    - Sabana:
      - acacias con la copa apoyada en las ramas;
      - paleta de la sabana de Axie Infinity;
      - pináculos y chimeneas de hada hechos con las rocas `Rock_sabana`.
    - Auditoría de NPC y monstruos sobre los terrenos reales, con anclas de patrulla validadas por isla y nodos de misión apoyados en el suelo.
    - Mundo demo 1.0.0 retirado: menos objetos, mallas, memoria y tiempo de arranque.
    - Zonas de esquina fusionadas en sus islas.
    - Barquero Pomodoro en lugar de las flechas de teleport.
    - Corrección del spawn de la Quimera Picuda (misión “Hunt of the Beaked Chimera”).

24. [**Hito 24: Mejora de Biomas (Bosque, Sabana, Ártico, Mística) y Rediseño de Genesis**](HITO_24_MEJORA_BIOMAS_SABANA_ARTICO_MISTICA_GENESIS.md)
    - Bosque: puente de madera (`bridge.glb`, 4 módulos en arco) sobre los rápidos, con tablero caminable y barandillas.
    - Sabana: cactus `cactus_forge3D`, casa de Bing, Altar de Atia, fragua y casa de Baruk, oasis con espuma, plantas y peces, rocas, arbustos, flores y polen dorado.
    - Ártico: casa de Pomodoro con hoguera, granja helada, puesto del Chef, cabaña del Ermitaño, Altar de Atia, hielo translúcido, peces congelados y niebla.
    - Ártico: 76 árboles nuevos (abetos turquesa, árboles menta y muertos blanqueados) con *Fade LOD* por *dither* de 70 a 95 m.
    - Mística: Observatorio Astral y casa del astrólogo, sauce luminoso con pilar rúnico, hongos y flores luminosos del pack, mariposas, peces, luciérnagas, lianas del Árbol Arcano, cristales emisivos con 3 luces, hierba en dos tonos y espuma.
    - Genesis (antes Mazmorra): rediseño total con Puerta del Santuario, Jardín Real, cantera de cristal y Santuario del Origen; caminos dorados, pilares lavanda y auroras.
    - Genesis: nombres, misiones y textos actualizados, nueva silueta en el horizonte y NPC reubicados.

25. [**Hito 25: Cuentas (Sign in with Sky Mavis + correo) y guardado en la nube**](HITO_25_CUENTAS_SKY_MAVIS_Y_GUARDADO_EN_LA_NUBE.md)
    - Inicio de sesión con Sky Mavis (OAuth + PKCE, validado en una Edge Function de Supabase) o con código por correo; modo invitado.
    - Ranuras de guardado por jugador en Supabase con control de versión; `localStorage` queda como caché.
    - Indicador «Guardado en la nube / Guardando… / Sin conexión» y resolución de conflictos entre dispositivos.
    - Pendiente del dueño del proyecto: crear el proyecto de Supabase y registrar la app en la Ronin Developer Console. El *client secret* va solo en los *secrets* de Supabase.

26. [**Hito 26: Motor de combate — Fase 0 (lógica separada de la presentación)**](HITO_26_MOTOR_DE_COMBATE_FASE_0_EVENTOS.md)
    - `castSpell` convertido en un pipeline que emite eventos (`CombatEvents.js`); los VFX y sonidos escuchan esos eventos (`SpellPresentation.js`).
    - Azar propio de las reglas (`spellManager.rng`), clase de Axie en cada unidad y consola de pruebas `lkDebug`.

27. [**Hito 27: Motor de combate — Fase 1 (estados, áreas, triángulo elemental y efectos por datos)**](HITO_27_MOTOR_DE_COMBATE_FASE_1_ESTADOS_Y_EFECTOS.md)
    - 22 estados alterados con iconos y duración, obstáculos y zonas temporales, y áreas nuevas (cruz 2, círculos, líneas, todos los enemigos…).
    - Triángulo de clases ±15 %: Asalto → Bastión → Torrente → Asalto.
    - Habilidades escritas como datos (`effects: [...]`, `EffectResolver.js`).

28. [**Hito 28: Motor de combate — Fase 2 (las 24 habilidades de Sapidae)**](HITO_28_MOTOR_DE_COMBATE_FASE_2_HABILIDADES_SAPIDAE.md)
    - Las 24 habilidades de las 4 clases de Sapidae hacen lo que dice su descripción (Manifiesto, sección 3), escritas como efectos por datos.

29. [**Hito 29: Motor de combate — Fase 3 (vínculo y Duo Ultimates)**](HITO_29_MOTOR_DE_COMBATE_FASE_3_VINCULO_Y_ULTIMATES.md)
    - Vínculo guardado por Axie y 3 Duo Ultimates según la tríada del Axie principal: Embestida Destructiva, Égida de Gaia y Maelstrom Celeste.
    - Requisitos de la Ultimate: vínculo al 100 %, desde la ronda 2, una vez por combate. Se lanza con la tecla 7 o el botón del HUD.

30. [**Hito 30: Axie Care — subir el vínculo con tu compañero**](HITO_30_AXIE_CARE_VINCULO.md)
    - Clic sobre el Axie compañero: acariciar, dar de comer (comida en el inventario y el botín) y caminar juntos.

31. [**Hito 31: Fase 4 — Cartas de partes (235) y Axies reales**](HITO_31_FASE_4_CARTAS_DE_PARTES.md)
    - 235 cartas de partes con ilustración oficial de Origins.
    - Cada Axie usa las 6 cartas de sus partes reales: se leen de la API de Sky Mavis o de sus genes, con caché.
    - Bing (Beast) y Pomodoro (Bug) con sus 6 cartas α de Origins y su historia reescrita.
    - Cartas de colección Japan y Xmas, y un VFX propio para cada colección especial.
    - Herramienta `tools/part-mapper.html` y la lista de imágenes pendientes (`IMAGENES_PENDIENTES_CARTAS.md`).

32. [**Hito 32: Fase 5 — Integración y equilibrio**](HITO_32_FASE_5_INTEGRACION_Y_EQUILIBRIO.md)
    - Pronóstico de daño exacto en el HUD: clase, escudo, crítico, golpe letal, estados y área.
    - 19 hechizos enemigos con estados (veneno, provocación, sangrado…) y una IA que decide con el pronóstico.
    - Correcciones:
      - 1 uso por turno para las cartas que dan PA o PM;
      - unidades superpuestas al pasar turno;
      - tutorial siempre superable.
    - Primera pasada de equilibrio de las cartas y registro de partidas para las siguientes (`lkDebug.balance()`).

---

## 🎮 Controles y Atajos de Teclado

| Tecla | Acción en el Modo Overworld | Acción en Modo Combate |
| :---: | :--- | :--- |
| **`[W] [A] [S] [D]`** / Flechas | Desplazamiento del héroe en 3D. | Desplazamiento de cámara táctica. |
| **`[E]`** | Interactuar con NPCs y cofres (con el barquero Pomodoro: elegir isla de destino). | — |
| **`[Espacio]`** | Avanzar líneas de diálogo. | Pasar turno / Confirmar acción. |
| **`[I]`** | Abrir / Cerrar Inventario y Habilidades. | — |
| **`[L]` o `[J]`** | Abrir / Cerrar Diario de Aventuras. | — |
| **`[M]`** | Abrir / Cerrar Mapa del Mundo e Isla. | — |
| **`[ESC]`** | Abrir / Cerrar Menú de Opciones. | Deseleccionar acción. |
| **`[1]`–`[6]`** | — | Seleccionar las 6 habilidades de la unidad activa. |
| **`[7]`** | — | Duo Ultimate (Sapidae, vínculo al 100 %, desde la ronda 2). |
| **Botón ⓘ del HUD** | — | Ayuda de combate: controles, estados, triángulo de clases y pronóstico. |
| **Clic en el Axie compañero** | Panel Axie Care (acariciar, comida, paseo). | — |
| **`F12` → `lkDebug.help()`** | — | Consola de pruebas; `lkDebug.balance()` / `balanceExport()` para el equilibrio. |

---

## 🛠️ Tecnologías y Arquitectura
- **Motor 3D**: Three.js (WebGL 2.0) en `vendor/three.module.js` — Cero dependencias CDN.
- **Modelos 3D**: glTF / GLB optimizados con animaciones esqueléticas personalizadas.
- **Shaders GLSL**: Shaders propios para hierba instanciada con viento GPU, ríos animados, atmósfera y siluetas lejanas.
- **Arquitectura**: Vanilla JavaScript modular (ES6 Modules) bajo filosofía *Zero-Build*.
- **Servidor HTTP**: Node.js estático (`server.js`) en puerto `8082`.


# Lunakai: Chronicles of Lunacia - Documentación del Proyecto

Bienvenido al repositorio de documentación técnica, arquitectura y especificaciones de **Lunakai: Chronicles of Lunacia** (anteriormente *Axie Tactics*), un RPG táctico 3D con exploración de mundo abierto (*Overworld*) estilizado y combates estratégicos por turnos basado en la propiedad intelectual de Axie Infinity.

> **Estado actual (23-oct-2026) — versión de prueba:** el mundo jugable son las **5 grandes islas** con dirección de arte Genshin: Bosque, Sabana, Ártico, Mística y **Genesis** (la antigua Mazmorra, rediseñada en el Hito 24).
> - **Viaje entre islas:** se habla con el barquero **Kawa** en la playa de cada isla (hasta el Hito 51 era Pomodoro; se llamó Kappa hasta el Hito 56); los portales cardinales están retirados.
> - **Cuentas y nube (Hito 25):** inicio de sesión con Sky Mavis o correo y guardado en Supabase; falta la configuración del servidor.
> - **Motor de combate nuevo (Hitos 26–32):**
>   - eventos separados de los VFX;
>   - 22 estados alterados y triángulo de clases;
>   - las 24 habilidades de Sapidae;
>   - vínculo y Duo Ultimates, y Axie Care para subir el vínculo;
>   - las 235 cartas de partes con las cartas reales de cada Axie;
>   - pronóstico de daño, enemigos con estados y primera pasada de equilibrio.
> - **Pruebas de equilibrio:** cada combate queda registrado en el navegador. En la consola (F12), `lkDebug.balanceExport()` descarga el registro (Hito 32).
> - **VFX y tableros (Hitos 33–37, 42):** efectos del motor propio para todas las cartas, Sapidae, Ultimates y enemigos; 15 mapas de combate por bioma y *dither fading*.
> - **Economía (Hitos 43–46):** Forja (crear y evolucionar), Tienda del Mercader Ochi, runas y charms con efecto en combate, recolección (pesca, tala, minería y flores) y la lista de ítems del Excel.
> - **Personaje (Hito 47):** el jugador es **Ema** o **Kai**, con peinado, ojos, boca y colores.
> - **Inicio de partida (Hito 48):** cinemática del prólogo con final épico y tutorial en 7 fases con el Maestro Paladill (se puede saltar).
> - **Estatuas de Genesis (Hito 58):** en el Jardín Real, el peluche en el centro y siete estatuas de armas a su alrededor (lanza, hacha, doble, mando, bastón, arco y maná); el Espíritu de Atia es ahora la estatua `atias.glb`.
> - **Modelos de la Mística (Hito 57):** la casa del Bosque para el astrólogo, `statue_mystic` frente al sauce del pantano (en lugar del pilar de runas) y en la puerta del Observatorio; la flor del pantano ya no está dentro del agua.
> - **Modelos del Ártico (Hito 56):** casa del Bosque en Pomodoro, el Ermitaño y el Campamento Boreal; tienda para el Chef Boreal; tótem de hielo en el valle de las quimeras; altar de Atia en una zona nueva junto al camino de la playa; banderas y tótem de decoración. Los edificios en pendiente llevan zócalo de piedra (también en la Sabana).
> - **Modelos de la Sabana (Hito 55):** la casa del Bosque en el campamento de Bing y en lugar de la fragua de Baruk, el altar de Atia en lugar del altar del Sol, un tótem junto a la casa de Bing, una tabla de surf en la playa y la balsa flotando junto al barquero.
> - **Tutorial y runas como objetos (Hito 54):** el tutorial ya no anuncia el 30 % del duelo, pide cerrar la Forja antes de la recompensa, llena el vínculo con la caricia y la comida y resalta la habilidad del charm. Las runas y los charms ahora se tienen: caen neutros en los combates, salen de las bolsas de runa y de charm de la Forja (de clase, al azar) y se venden en la tienda.
> - **Memoria y rendimiento (Hito 53):** la cinemática del prólogo ya no guarda las texturas de sus modelos y lo libera todo al terminar; las variantes ocultas del Sapidae (peinados, cabezas, camisas, expresiones) no vuelven a la tarjeta gráfica después de un combate. En el mundo abierto, sombras uno de cada dos fotogramas, sin sombra en la vegetación pequeña y las farolas, un solo esqueleto para el Sapidae del jugador y brillo a media resolución.
> - **Armas del mixer (Hito 52):** espadas, arcos y bastones de la librería del mixer (un nivel por Tier) en la mano del Sapidae y del Axie, cada uno con su arma; el Axie usa las animaciones del arma. En el Sapidae van en la mano derecha, por el puño y hacia delante, y miden lo mismo en Ema y en Kai.
> - **Pueblo del Bosque (Hito 51):** el camino de la Isla del Bosque es ahora un pueblo con dojo (y el Maestro Paladill), tienda de Ochi, Forja con su árbol y el Guardián de los Pergaminos, casas, altar de Atia, tótem, parada con bus y farolas; puesto de pescado y balsa junto al barquero, que ahora es **Kawa**. El antiguo Dojō Secreto se retiró y su patio vuelve a tener hierba. Tras la cinemática, la cámara aparece detrás del jugador, frente a Paladill.
> - **Tutorial guiado (Hito 50):** el tutorial y sus combates señalan cada acción con flecha y resaltado y bloquean todo lo demás hasta hacerla; corazones y media luna en la cinemática, tienda en (-77, 3.7) y slimes ocultos durante el tutorial.
> - **Rendimiento (Hito 49):** optimización isla por isla y de los tableros de combate sin cambiar la imagen: texturas a 1024, carga diferida, horizonte combinado, menos memoria de GPU (~1220 → ~400 MB) y combates sin tirones al mover la cámara o lanzar habilidades.
>
> Los hitos 2, 3, 6, 9, 10, 11 y 21 describen sistemas históricos y llevan una nota de estado al principio. Los hitos 4, 12, 14, 15, 29, 30, 42, 43, 44, 45, 48 y 49 llevan una nota de actualización con lo que cambió después. Donde aparece "Mazmorra", hoy es Genesis.

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
    - Actualización: viaje entre islas con el barquero (`FerryTravelUI.js`) en la playa de cada isla: Pomodoro hasta el Hito 51, ahora Kawa (Kappa hasta el Hito 56).

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
    - Barquero Pomodoro en lugar de las flechas de teleport (desde el Hito 51 es Kappa, Kawa desde el Hito 56).
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

33. [**Hito 33: Fase 6 (VFX), etapa 1 — Núcleo compartido**](HITO_33_FASE_6_VFX_ETAPA_1_NUCLEO_COMPARTIDO.md)
    - El motor de VFX del laboratorio pasa a `src/vfx/` (núcleo sin DOM + 36 módulos con los 235 efectos de las cartas) y el laboratorio a `tools/vfx-lab/`, ambos sobre el three r160 del proyecto.
    - Tabla carta → efecto para las 235 cartas y comprobación automática en Node (`node tools/vfx-lab/gen-cards.mjs`).

34. [**Hito 34: Fase 6 (VFX), etapa 2 — Los efectos llegan al combate**](HITO_34_FASE_6_VFX_ETAPA_2_PUENTE_EN_COMBATE.md)
    - `src/vfx/VfxBridge.js` reproduce en combate los efectos del laboratorio de las 24 cartas de los Axies jugables: Shinji, Early Bird, Big Yak, Bing y Pomodoro.
    - El daño llega en el fotograma del impacto; además hay tablero oscurecido, *hit-stop* y movimiento visual de las unidades, que siempre vuelven a su casilla.
    - Consola: `lkDebug.vfx()`, `lkDebug.vfxAll(true)`, `lkDebug.vfxPlay(id)`.
    - **Arena de pruebas** (`src/tactics/combat/TestArena.js`): `lkDebug.arena()` abre un combate contra un muñeco de 25.000 de vida que no ataca ni se mueve; `lkDebug.probar('id', distancia)` lanza cualquier carta contra él. La lista de comandos de las 319 pruebas está en [PRUEBAS_HABILIDADES.md](PRUEBAS_HABILIDADES.md).

35. [**Hito 35: Mapas de combate por bioma**](HITO_35_MAPAS_DE_COMBATE_POR_BIOMA.md)
    - 15 mapas, 3 por bioma: al empezar un combate del mundo abierto sale uno al azar del bioma, y los jefes usan siempre el suyo.
    - Tamaños y formas distintos (de 7×12 a 13×12): esquinas recortadas, cruces, anillos, ríos con puentes, grietas e islas flotantes.
    - El escenario usa el arte de la isla: árboles IslandTrees, rocas con su material, vegetación, partículas, cielo y luz.
    - La campaña antigua y la arena de pruebas siguen en el 10×10 de siempre (el tutorial pasó al Claro de Arces en el Hito 37).
    - Validador: `node tools/battle-maps/check-maps.mjs`. Visor: `battle_maps_preview.html`. Consola: `lkDebug.maps()` y `lkDebug.map('id')`.
    - 18-oct: sin árboles en los tableros de Bosque (salvo el Gran Árbol), Sabana, Ártico y Pantano Luminoso, para ver mejor el combate.

36. [**Hito 36: Fase 6 (VFX) — Sapidae y Ultimates en combate, efectos más grandes**](HITO_36_FASE_6_VFX_SAPIDAE_Y_ULTIMATES.md)
    - Las 24 habilidades del Sapidae y las 3 Ultimates de dúo usan sus efectos del motor.
    - Los muñecos del laboratorio ya no aparecen en el tablero.
    - Efectos un 35 % más grandes (`lkDebug.vfxScale()`); `o.dark` y `o.white` funcionan en el juego.

37. [**Hito 37: Dither fading en los tableros de combate y tutorial en el Claro de Arces**](HITO_37_DITHER_FADING_TABLEROS_DE_COMBATE.md)
    - Lo que el escenario pone entre la cámara y una unidad (o la casilla bajo el ratón) se disuelve con un tramado de pantalla, desde cualquier ángulo.
    - Los obstáculos del tablero nunca bajan del 35 % visible; la decoración de alrededor, hasta el 8 %.
    - El tutorial se juega ahora en el Claro de Arces, con su escenario y su dither.
    - Consola: `lkDebug.dither(false|true)`, `lkDebug.dither({ radius: 1.1 })`.

38. [**Hito 38: Vida persistente, turnos alternados y correcciones**](HITO_38_CORRECCIONES_VIDA_TURNOS_HUELLAS_BARQUERO.md)
    - La vida del mundo abierto es la del combate: se entra con ella y se guarda al terminar; quien cae vuelve con 1 de vida. En el mundo abierto se regenera +10 cada 5 s.
    - Turnos alternados jugador/enemigo según la iniciativa (el tutorial mantiene el orden de siempre).
    - Huellas sobre puentes y hielo, Espacio desactivado al elegir isla en el barquero y habilidades del Sapidae en la Mochila.

39. [**Hito 39: Vínculo equilibrado, cartas de partes en los menús, pelo blanco, fuego amigo y fin de combate limpio**](HITO_39_VINCULO_CARTAS_PELO_FUEGO_AMIGO_FIN_DE_COMBATE.md)
    - Vínculo: comida +3/+5/+8 %, paseo +0,5 % cada 500 m, −1 % cada 10 min de juego sin cuidados y −5 % por día sin jugar.
    - El selector de compañero y la Mochila muestran las 6 cartas de partes del combate.
    - Pelo con textura blanca para que tome bien el color elegido.
    - Fuego amigo: los ataques y sus áreas dañan también a los aliados; curas y potenciadores, solo aliados.
    - Al ganar o perder se retira toda la UI de combate.

40. [**Hito 40: Atributos, estadísticas base por clase y rol, fichas de daño, Axies por ID y cambio de compañero**](HITO_40_ATRIBUTOS_ESTADISTICAS_BASE_AXIES_POR_ID_Y_COMPANERO.md)
    - Crítico base de verdad al 20 %; el Sapidae usa sus atributos de daño (Esencia en Lunalogista y Astromante); en los Axies la Esencia es solo apoyo.
    - 6 PA y 3 PM para todos los héroes; vida e iniciativa de los Axies por clase y rol (`AxieBaseStats.js`).
    - Las cartas muestran el daño con nivel, atributos y estados (Potenciado, Débil) y su desglose.
    - Comida bloqueada con el vínculo al 100 %; peces con la cola bien; humo al cambiar de Axie principal.
    - Invitados: «Mis axies» carga cualquier Axie por su ID (colecciones Japan, Xmas…).
    - Partes 3D que faltaban (Axie #585), cartas del Axie por ID en el tutorial, retratos que persisten y partes Japan de nivel 2 con el modelo correcto.
41. [**Hito 41: Inicio de sesión con Sky Mavis (OIDC), API key en el servidor y tus Axies**](HITO_41_INICIO_SESION_RONIN_WAYPOINT_Y_TUS_AXIES.md)
    - Inicio de sesión OIDC con PKCE; el intercambio del código y el cierre de sesión en Sky Mavis pasan por la función `skymavis-auth`.
    - La API key de Sky Mavis solo vive en el servidor (función `axie-data`); el juego ya no la lleva.
    - Carga de Axies por ID también con cuenta (aunque no tengas Axies).
    - Nivel y AXP de Sky Mavis en la ficha (solo informativo); barra de AXP de la victoria ficticia, con tope en 60 y en los topes de evolución.
42. [**Hito 42: Auditoría del core loop, todos los VFX en combate y sin tirón en el primer lanzamiento**](HITO_42_AUDITORIA_VFX_COMPLETOS_Y_PRECOMPILADO.md)
    - Auditoría: 328 VFX sin fallos y 10 pruebas del core loop sin errores críticos.
    - En combate tienen efecto todas las cartas (235 de partes, 30 de colección), Bing y Pomodoro (12/12) y los 61 ataques de enemigos (fábricas `VFX.basic.*` y `mod-enemigos.js`). Lista de trabajo: [`VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md`](VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md).
    - Precompilado de shaders en las condiciones reales del render: el primer lanzamiento ya no se traba.
    - Retratos del HUD sin errores, Beaked Alpha Chimera como sub-jefe (lobo acuático alfa) y orden de turnos fijo durante el combate.
    - Se probó un estilo «toon» para los VFX y se descartó.
43. [**Hito 43: Forja y Tienda del Valle del Dojō**](HITO_43_FORJA_Y_TIENDA.md)
    - Forja (yunque del patio, tecla E): crear equipo Tier 0 con oro y materiales, y evolucionar piezas por su línea con SLP, materiales, esquirlas y bAXS; 2 yunques, tiempo real y rapidez ×2/×4.
    - Tienda del Mercader Ochi: compra y venta de materiales, comida, pociones y equipo Tier 0; reposición cada 6 h y recompra.
    - Revisión y correcciones: la forja aparta la pieza que está en un yunque (ya no se duplica equipo), Tier 0 a 60 de oro, el horno libera su memoria y su luz ya no hace recompilar la escena.
44. [**Hito 44: Runas y charms en el combate**](HITO_44_RUNAS_Y_CHARMS_EN_COMBATE.md)
    - Las 63 runas y los 90 charms de la guía tienen efecto en combate: estadísticas del Axie, cartas modificadas por el charm de su parte, % de daño, críticos, esquiva, reacciones, robo de vida, turnos, rondas y golpe letal.
    - El HUD y la Mochila muestran el coste, el alcance y el daño reales; la ficha del charm enseña el «antes → después» de la carta.
    - Consola: `lkDebug.runes()`, `lkDebug.rune()`, `lkDebug.charm()`.
45. [**Hito 45: Recolección de recursos**](HITO_45_RECOLECCION.md)
    - Pesca en el río del Bosque y tala (el Axie, con la caña y el hacha del Mixer); minería en la Sabana y flores en Mística (el Sapidae). Tala de abetos en el Ártico y un árbol junto a la Forja.
    - 3 puntos por isla, 6 s sin poder moverse: 1–3 unidades y un 10 % de raro, a la bolsa de la Forja (pestaña «Materiales» de la Mochila); el punto vuelve a los 8 min reales. Iconos en el minimapa y en el mapa del mundo.
    - Consola: `lunakaiGathering.status()`, `.check()`, `.reset()`.
46. [**Hito 46: Lista de ítems de la demo**](HITO_46_LISTA_DE_ITEMS.md)
    - Solo los ítems del Excel: 7 líneas de equipo × 4 rarezas (Común se crea; Raro, Épico y Místico solo evolucionando en 1, 2 y 3 min), 14 materiales con rareza, comida nueva (fruta, pescado y koi) y 3 pociones.
    - Recetas, botín por isla, recompensas de misión, Tienda y lote inicial de la Forja rehechos con los materiales nuevos; las partidas viejas se limpian al cargar.
    - Iconos en WEBP (equipo, consumibles, materiales y objetos de misión) con el fondo del color de su rareza.
    - La Forja se queda la pieza mientras evoluciona y la devuelve equipada; pantalla de arranque que avisa si un archivo falla; la tecla H ya no abre el panel de evaluación.
47. [**Hito 47: Sapidae Ema y Kai**](HITO_47_SAPIDAE_EMA_KAI.md)
    - Modelos nuevos del jugador con piezas A–E: Kai (5 peinados, 5 ojos, 3 bocas, camisa D) y Ema (5 peinados con Rizos por defecto, 5 ojos, 5 bocas, camisa B).
    - Color de pelo y cabeza a la vez, color de ojos, de cuernos y de camisa; cada opción con su imagen en el creador.
    - En combate la cara cambia al atacar y al recibir daño; las partidas existentes pasan a Ema / Kai al cargarse.
48. [**Hito 48: Cinemática del prólogo y tutorial nuevo**](HITO_48_CINEMATICA_Y_TUTORIAL.md)
    - Cinemática de 73 s en papel y teatro de sombras con final épico (el Señor de las Quimeras, tu Sapidae y tu Axie, el logo LUNAKAI).
    - Tutorial en 7 fases con diálogos cortos: defensa del Dojo, Mochila, duelo con Paladill, Forja, vínculo y Ultimate, runas y graduación. Botón «Saltar tutorial».
    - Funciones bloqueadas hasta su fase, tarjetas de recompensa y guardado por paso. Corregido el 21-oct: la cinemática se veía en negro por el velo de carga.
49. [**Hito 49: Optimización de rendimiento**](HITO_49_OPTIMIZACION_DE_RENDIMIENTO.md)
    - Bosque: río instanciado, partículas en pausa fuera de cámara, recorte por árbol, sombras ajustadas y calidad Media/Baja; el Bosque se construye solo cuando hace falta. CPU de render 8,8 → 4,5 ms.
    - Memoria: 40 GLB con texturas a 1024 (jefe y cuerpo del Sapidae a 2048), árboles antiguos y variantes del Sapidae fuera de la GPU, texturas de islas inactivas liberadas: ~1220 → ~400 MB de texturas.
    - Sabana con carga diferida (8,6 → 6,8 s) y horizonte de islas lejanas combinado en todas las islas (174 → ~10 mallas, `render/StaticMerge.js`); Mística con islotes y lugares combinados; minimapa con el nombre real de cada isla.
    - Combate: casillas resaltadas y ficha de unidad sin rehacerse en cada movimiento del ratón, shaders de efectos conservados (`render/ProgramKeepAlive.js`), precalentado completo detrás del velo, nubes combinadas y fin de los avisos «glGetProgramiv».
50. [**Hito 50: Tutorial guiado paso a paso y ajustes del inicio**](HITO_50_TUTORIAL_GUIADO_Y_AJUSTES.md)
    - Guía con velo, hueco, flecha y frase en cada paso del tutorial (Mochila, Forja, vínculo, runas); solo responden el objetivo y sus teclas, y el panel se desplaza solo hasta él.
    - Combates guiados: casillas, cartas, Pasar turno y Ultimate bloqueados fuera de su paso; duelo y prueba de la Ultimate con guía calculada por turno (`TutorialManager.startDynamic`).
    - Cinemática con corazones en el pecho y luna en media luna; elegir personaje sin modelos superpuestos; tienda en (-77.0, 3.7); solo Paladill habla y los slimes se ocultan durante el tutorial.
51. [**Hito 51: Pueblo del Bosque**](HITO_51_PUEBLO_DEL_BOSQUE.md)
    - Pueblo a lo largo del camino del Bosque con los modelos de `assets/environment` (dojo, tienda, Forja, 4 casas, altar, tótem, parada, bus, 6 farolas), puesto de pescado y balsa en el embarcadero; claros en la hierba y sin árboles encima.
    - Ochi en la tienda, Paladill en el dojo, árbol de la Forja junto a ella; Kawa es el barquero y el Guardián de los Pergaminos abre la Forja.
    - Se libera al salir del Bosque; relieve de los GLB a 512; fuga de esqueletos de los NPC corregida; sin pétalos sobre el dojo; cámara tras la cinemática detrás del jugador.
52. [**Hito 52: Armas del mixer en el Sapidae y en el Axie**](HITO_52_ARMAS_DEL_MIXER.md)
    - Espadas (niveles 1, 2, 4, 5), arcos y bastones (1–4) por Tier; cada personaje lleva su arma.
    - Sapidae: mano derecha, mango por el puño, hacia delante; tamaño compensado aunque la animación escale el hueso (Kai).
    - Axie: arma y animaciones del mixer; las armas que se cambian liberan su esqueleto.
53. [**Hito 53: Memoria y rendimiento**](HITO_53_MEMORIA_TUTORIAL.md)
    - Cinemática sin texturas de modelos y liberada al terminar; variantes ocultas del Sapidae fuera de la GPU también después de los combates.
    - Mundo abierto: sombras uno de cada dos fotogramas, vegetación pequeña y farolas sin sombra, un esqueleto para el Sapidae del jugador y brillo a media resolución.
54. [**Hito 54: Ajustes del tutorial y runas y charms como objetos**](HITO_54_TUTORIAL_Y_RUNAS_COMO_OBJETOS.md)
    - Tutorial: sin el 30 % del duelo, moneda de oro real, «Cierra la Forja» antes de la recompensa, avisos ocultos durante los diálogos, vínculo al 100 % con caricia y comida, consejo de la Ultimate con retrato y paso del charm guiado.
    - Bolsa de runas y charms por partida: botín neutro en combate, bolsas de clase en la Forja (se abren en la Mochila) y venta en la tienda.
55. [**Hito 55: Modelos GLB en la Sabana**](HITO_55_MODELOS_DE_LA_SABANA.md)
    - Casa del Bosque (campamento de Bing y casa de Baruk, sin fragua), altar de Atia, tótem, tabla de surf y balsa en el embarcadero de Kawa.
    - Clave de caché `#sabana` (el Bosque descarga los suyos), piezas estáticas y mapas de normales a 512.
56. [**Hito 56: Modelos GLB en el Ártico**](HITO_56_MODELOS_DEL_ARTICO.md)
    - Casas, tienda del Chef, tótem de hielo en el valle, altar de Atia en una zona nueva, banderas (entrada, tienda, campamento) y tótem en Pomodoro.
    - Kit compartido `islands/kit/IslandProps.js` (caché `#islas`, zócalo de piedra en pendiente); casas de la Sabana sin enterrar.
57. [**Hito 57: Modelos GLB en la Isla Mística**](HITO_57_MODELOS_DE_LA_MISTICA.md)
    - Casa del astrólogo, estatua del islote, estatua en el Observatorio; flor del pantano en la orilla.
58. [**Hito 58: Estatuas GLB en Genesis**](HITO_58_ESTATUAS_DE_GENESIS.md)
    - Peluche en el centro de la plaza y siete estatuas de armas en el círculo de 17 m (en lugar del tótem y los seis monumentos); Espíritu de Atia con el modelo `atias.glb`.
59. [**Hito 59: Dos idiomas (español / inglés)**](HITO_59_DOS_IDIOMAS.md)
    - Sistema `src/i18n` (1466 claves por idioma), inglés por defecto, cambio de idioma con guardado y recarga; interfaz completa traducida (Fases 0 y 1). Historia, datos y mensajes del sistema quedan para las Fases 2–4.
60. [**Hito 60: Dos idiomas · historia**](HITO_60_IDIOMAS_HISTORIA.md)
    - Misiones, diálogos de NPC, tutorial y cinemáticas en español e inglés (2136 claves por idioma); cargos traducidos, nombres propios iguales; la navegación lee la versión inglesa del paso (`i18n.en`) y se comporta igual en los dos idiomas.
61. [**Hito 61: Dos idiomas · datos del juego**](HITO_61_IDIOMAS_DATOS.md)
    - Objetos, habilidades, estados, héroes, descripciones de cartas, runas y charms, enemigos, niveles y creador en los dos idiomas (3501 claves); nombres oficiales de Axie en inglés; `i18n.applyText` para listas grandes sin reescribir los datos.
62. [**Hito 62: Dos idiomas · mensajes del sistema**](HITO_62_IDIOMAS_SISTEMA.md)
    - Texto flotante de combate, avisos de tienda, Forja y recolección, cuenta y nube, y restos (3597 claves por idioma); cartel de zona por id; decimales según el idioma; barrido final de lo que queda sin traducir a propósito.
63. [**Hito 63: Seguimiento de misiones desactivable**](HITO_63_SEGUIMIENTO_DESACTIVABLE.md)
    - Pulsar «Siguiendo» desactiva el seguimiento (sin flecha, marcador ni pista en el HUD); se reactiva con «Seguir» o al empezar un nuevo capítulo; no se puede apagar en el tutorial; se guarda en la partida.
64. [**Hito 64: Revisión de Ema, musgo, flechas y abetos**](HITO_64_REVISION_EMA_MUSGO_FLECHAS_ARBOLES.md)
    - Rosalba pasa a llamarse Ema (el nombre por defecto del jugador es Lunara); el musgo aparece sin tirón; flecha de misión solo con la misión activa; abetos de tala del Ártico reubicados y marcados con 🪓; Xia y el Cartero reubicados.
65. [**Hito 65: Casillas de combate**](HITO_65_CASILLAS_COMBATE.md)
    - Al elegir una carta se ve todo su alcance aunque no haya enemigos (rojo; gris apagado sin línea de visión; objetivos con pulso; área naranja). Movimiento en azul con ruta y destino en verde. Capas instanciadas: repintado de 0,02 ms, 60 fps estables.
66. [**Hito 66: Colisiones del Bosque, agua poco profunda y río de mar a mar**](HITO_66_COLISIONES_BOSQUE_AGUA_RIO.md)
    - Rejilla espacial de colisiones (consultas hasta 15× más rápidas, mismos resultados); troncos, rocas y Gran Árbol con colisión; agua caminable hasta la rodilla con ondas, salpicaduras y chapoteo; el río llega al mar del norte, con puente nuevo en el pueblo y vados al norte y al sur; la vegetación de la isla sale idéntica.
67. [**Hito 67: Final de la cinemática con el «¡Resonad!» del equipo**](HITO_67_FINAL_CINEMATICA_RESONAD.md)
    - El Axie delante del Sapidae, un hilo de luz los une y el destello nace entre los dos; el grito lo dice el narrador (Maestro Paladill) y el guion de voces queda con una sola toma.
68. [**Hito 68: Voces y música nueva del prólogo**](HITO_68_VOCES_Y_MUSICA_PROLOGO.md)
    - Voces del narrador en español sincronizadas con los subtítulos (volumen igualado, música que baja bajo la voz); pieza musical a medida cuyo clímax cae en el «¡Resonad!».
69. [**Hito 69: Colisiones de la Sabana, mar y oasis caminables**](HITO_69_COLISIONES_SABANA.md)
    - 192 objetos nuevos con colisión (palmeras, acacias, árboles secos, cactus, montículos altos y agujas sueltas); las paredes de las mesetas no se suben (las rampas sí); mar hasta la rodilla y oasis somero que se cruza entero, ambos con ondas. Toda la isla sigue siendo alcanzable.
70. [**Hito 70: Deslizamiento al chocar (sin atascos)**](HITO_70_DESLIZAMIENTO_COLISIONES.md)
    - Al chocar en diagonal contra troncos, rocas, vallas, edificios, la orilla o un acantilado, el personaje desliza por el borde con fricción según el ángulo; rodea los troncos de frente; se para limpio en rincones y huecos estrechos. Ya no queda nunca dentro de una colisión. Sirve para todas las islas y para los monstruos.
71. [**Hito 71: Colisiones del Ártico**](HITO_71_COLISIONES_ARTICO.md)
    - 213 objetos nuevos con colisión (abetos y árboles anchos —también los lejanos del LOD—, árboles secos, bloques de hielo, rocas de mineral y rocas de más de 0,7 m); cuernos, acantilado de la costa y pared de hielo del sur no se suben; mar hasta la rodilla en las plataformas del sur; el hielo del lago, el estanque y los ríos se sigue caminando. Base común para Mística y Génesis.
72. [**Hito 72: Colisiones de Mística**](HITO_72_COLISIONES_MISTICA.md)
    - 133 objetos nuevos con colisión (árboles, agujas y cúmulos de amatista, rocas de más de 0,7 m); el pantano luminoso se cruza entero con el agua a media pierna (se llega al islote del sauce); mar hasta la rodilla; pendientes de más de 35° (tramos de costa, borde del observatorio) no se suben. Setas, flores y arbustos se atraviesan.
73. [**Hito 73: Colisiones de Génesis**](HITO_73_COLISIONES_GENESIS.md)
    - 67 árboles con colisión en el tronco; cristales de la cantera con su huella exacta; troncos huecos con colisión de punta a punta; mar hasta la rodilla. Cierra la revisión de colisiones de las cinco islas (Bosque, Sabana, Ártico, Mística y Génesis).
74. [**Hito 74: Bolsas, oro de combate, opciones en combate, cámara y misiones de Génesis**](HITO_74_MEJORAS_VARIAS.md)
    - Bolsas con icono propio y cobradas en SLP (runas 80, charms 50); lo que sale de la bolsa se ve en la estantería con la marca «Nuevo»; 20–45 de oro por combate ganado contra quimeras; el menú de opciones funciona en combate; la cámara ya no se mete en casas ni rocas (brazo con colisión) y ve a través de los árboles; Kotaro y Tripp tienen su propio grupo de monstruos con flecha.
75. [**Hito 75: Escuadrón con tus Axies, sin emojis y runas Ronin**](HITO_75_ESCUADRON_EMOJIS_RONIN.md)
    - El Escuadrón se abre al reclutar a Bing, con un mini-tutorial de 3 pasos (abrir, colocar a Bing, «Cargar mis Axies»); los demás Axies de tu cuenta de Sky Mavis entran a la colección en nivel 1 y se pueden poner de principal o de apoyo; fuera los emojis de textos, HUD, mapa y combate; las runas y charms NFT de tu cuenta dan una copia jugable con la insignia R (no se venden). Diseño técnico del Mercado entre jugadores ([DISENO_TIENDA_JUGADORES.md](DISENO_TIENDA_JUGADORES.md)).
76. [**Hito 76: Oro, bAXS y SLP en el servidor (fase 1 del Mercado)**](HITO_76_ECONOMIA_SERVIDOR.md)
    - Con cuenta, el saldo de cada partida lo guarda y lo cambia Supabase: combates, tienda de Ochi, Forja, misiones y tutorial pasan por funciones del servidor con límites, y el guardado ya no acepta monedas inventadas. Los invitados juegan como siempre. Bono de inicio: 500 SLP y 30 bAXS. Se despliega con `supabase db push`.
77. [**Hito 77: Mercado entre jugadores (fase 2)**](HITO_77_MERCADO_JUGADORES.md)
    - Tercer modo «Mercado» en la tienda de Ochi: comprar a otros jugadores, publicar materiales, comida y pociones con precio propio (entre lo que paga Ochi y 3 × su precio), tus anuncios e historial. Pago en oro con 5 % de comisión al vendedor, anuncios de 3 días y 20 como máximo. Los objetos nunca están a la vez en la partida y en un anuncio, y un aumento imposible entre guardados bloquea el mercado de esa partida. Invitados: solo mirar.
78. [**Hito 78: Equipo, runas y charms por bAXS (fase 3 del Mercado)**](HITO_78_MERCADO_BAXS.md)
    - El oro de una venta llega al momento, con aviso, sin reiniciar. Equipo T1–3, runas y charms se venden en bAXS con solo precio mínimo; filtros por tipo y tier; comparación de equipo; confirmación en dos clics al comprar en bAXS; comisión del 5 % en la moneda de la venta.
79. [**Hito 79: Sombras, cámara con colisión, color del daño y pesca en alto**](HITO_79_SOMBRAS_CAMARA_CARTAS_PESCA.md)
    - Las sombras ya no titilan en la Sabana, el Ártico, la Mística y Génesis. La cámara usa cajas orientadas, ignora lo pequeño y lo que flota, no se acerca por rozar una esquina y se mueve sin rebotes. El daño de las cartas va siempre en su color, con ▲ o ▼. Se pesca desde los dos puentes y desde un muelle nuevo, con hilo desde la punta del látigo hasta el corcho.
80. [**Hito 80: Iconos de los estados de combate**](HITO_80_ICONOS_ESTADOS.md)
    - Los 31 estados tienen icono propio (37 iconos en WebP de 64 px, 76 KB en total) en las chapas de estado, la ficha de la unidad y la previsión del ataque. Fuera el último emoji.
81. [**Hito 81: Iconos de estado en los avisos de combate**](HITO_81_ICONOS_EN_AVISOS.md)
    - Los avisos flotantes de un estado («POTENCIADO (2)», veneno «-12», «PIERDE EL TURNO»…) llevan su icono delante en vez del símbolo de texto. El daño y las curaciones normales no cambian.
82. [**Hito 82: Ataques en el sitio, posición tras ataques, muelle, cartel de pesca, zoom y segundo plano**](HITO_82_QUIMERAS_MUELLE_CARTEL_ZOOM.md)
    - Al atacar, la unidad se queda en su casilla (solo su animación) y el objetivo retrocede como mucho 0,25 m. Un empujón durante un efecto ya no deja a la unidad entre dos casillas. El muelle sale de la arena junto a Kawa, con su barca amarrada al costado. Los puntos de pesca tienen cartel nuevo. Se quitan el punto de la orilla del puente y la roca de (-5,4, -40,6). El zoom va de 4 a 22 m y es suave. El combate sigue al minimizar.
83. [**Hito 83: Sombras sin parpadeo al caminar**](HITO_83_SOMBRAS_SIN_PARPADEO.md)
    - El sol de las islas solo se mueve en los fotogramas en que se recalcula el mapa de sombras, y los árboles ya no cambian la matriz con la que se leen: fuera el parpadeo de rocas, puentes y árboles (14.852 → 0 píxeles por fotograma en la prueba). Caja de sombras en pasos también en profundidad; bias −0.0002 y normalBias de 1,5 celdas; los objetos fijos meten su cara delantera en el mapa (sin rayas). Mismo coste. Consola: `lkDebug.shadows()`.
84. [**Hito 84: Sombra de las copas con viento y revisión por objeto**](HITO_84_SOMBRAS_COPAS_Y_FILTRO.md)
    - La sombra de las copas se mueve con el viento igual que las hojas (597 → 16 píxeles mal sombreados por fotograma): fuera el "hervor" de los árboles. Rocas, puentes y casas son de dos caras y ya quedan limpios con el bias del Hito 83. Se probó PCF con radio 2–3 para una penumbra más suave y se descartó (rayas, bordes dobles y recompilar todo el juego, combate incluido): se mantiene PCFSoft.
85. [**Hito 85: Accesibilidad — lectura, visión y movimiento**](HITO_85_ACCESIBILIDAD.md)
    - Todas las opciones de Accesibilidad funcionan: tamaño del texto en toda la interfaz (rem y px) y en los nombres 3D, velocidad del texto desde el arranque con «Instantánea» real, alto contraste (anillo círculo/rombo, casillas con dibujo, barras con rayas, paneles más legibles), reducir movimiento (destellos, bloom, pulso, sacudidas y todas las reglas `prefers-reduced-motion`) y temblor de cámara. Nuevas: **modo daltonismo** (rojo-verde y azul-amarillo) y **avance automático** de diálogos unido al botón Auto. Módulo común `src/ui/AccessPrefs.js`; consola `lkDebug.a11y()`.
86. [**Hito 86: Sonido ambiente (fases 0 y 1)**](HITO_86_SONIDO_AMBIENTE.md)
    - Cada isla suena distinta, todo sintetizado (sin archivos): viento con ráfagas, silbido helado; mar que se detecta solo y suena hacia el lado del agua; río, rápidos, hogueras, yunque, campanillas, oasis, pantano con ranas, llama de Atia; pájaros, halcón, hielo, búho y gaviotas. En combate, la base de la isla más baja. El volumen «Ambiente» de Opciones ya funciona y los 5 sonidos de interfaz que faltaban existen. Consola `lkDebug.audio()`. Lista de grabaciones a conseguir: `AUDIO_ARCHIVOS_A_CONSEGUIR.md`.
87. [**Hito 87: Sonidos del mundo y reto de pesca**](HITO_87_SONIDOS_DEL_MUNDO_Y_PESCA.md)
    - Pasos según el suelo, sincronizados con las huellas: hierba, tierra, arena, madera, piedra, nieve, hielo y agua (el Axie, más agudo). Voz de pitidos de los NPC (cada personaje con su tono y las vocales con su timbre). Slimes que hacen «boing», quimeras que gruñen y gritan al verte, y un Axie que gorjea al acariciarlo o traer el botín. Sonidos de tala, minería y flores. **Reto de pesca:** esperar sin picar en los mordisquitos de engaño, clavar a tiempo y acertar la zona de la barra («¡Perfecto!» da botín extra); si el pez se escapa, el punto no se gasta. Todo sintetizado, con grabaciones opcionales en `assets/sounds/sfx/` (activadas con `CREDITOS.txt`). Consola `lkDebug.sfx()`.
88. [**Hito 88: Sonido de combate por clase y peso**](HITO_88_SONIDO_DE_COMBATE.md)
    - Los golpes suenan al llegar según la clase de quien golpea (bestia, planta, acuático, pájaro, bicho, reptil o mágico del Sapidae) y el peso de la carta (1, 2 o 3+ PA: volumen, grave y golpe sordo). Barrido de aire al atacar, crítico, escudos (para, se rompe, nuevo), curación, potenciar, debilitar, aturdir, veneno y quemadura por turno, caída enemiga o aliada, Ultimate lista y lanzada, aterrizaje, tic del reloj en los últimos 5 s y latido con un aliado por debajo del 25 % de vida. Pasos del tablero con el suelo de la isla. Grabaciones opcionales en `assets/sounds/sfx/combat/`. Consola `lkDebug.sfx('golpes')` y `lkDebug.sfx('combate')`.
89. [**Hito 89: *Game feel* del combate**](HITO_89_GAME_FEEL_COMBATE.md)
    - Temblor de cámara por «trauma» (suave, con un poco de giro, igual a cualquier FPS y según el daño: un rasguño casi no mueve, un golpe que quita media vida sí). Pausa de impacto de 35–90 ms según el coste de la carta (+crítico, +derribo). Barra de vida «fantasma» que muestra lo que se acaba de perder y baja tras 0,45 s. Números de daño más grandes cuanto más fuerte es el golpe. Respeta las opciones de temblor y de reducir movimiento.
90. [**Hito 90: *Game feel* del mundo abierto**](HITO_90_GAME_FEEL_MUNDO_ABIERTO.md)
    - Inercia corta al moverse: el Sapidae llega a su velocidad en ~0,15 s y frena deslizando ~0,25 m (antes, 0 → 6,8 m/s de golpe y parada en seco); contra una pared no acumula velocidad; media vuelta al instante. La cámara se adelanta hasta ~1,2 m hacia donde caminas y vuelve al parar (apagado con «Reducir movimiento»).
91. [**Hito 91: Mezcla de sonido**](HITO_91_MEZCLA_DE_SONIDO.md)
    - Todas las canciones igualadas a −20,5 LUFS (la del combate y la victoria sonaban 6–8 dB más fuertes que las de las islas). Bus de efectos de 0,25 a 0,6 con compresor suave: los efectos quedaban unos 20 dB por debajo de la música y los golpes casi no se oían. Golpes del combate +2,8 dB y ambiente del Ártico −3 dB. Con las opciones por defecto: música ~−25 LUFS, ambiente 8 dB por debajo, golpes a ~7 dB de la música del combate (antes ~24). Silenciar ya respeta el nivel de Opciones.
92. [**Hito 92: Cascos y armaduras de Ema y Kai**](HITO_92_CASCOS_Y_ARMADURAS_EMA_KAI.md)
    - Los 4 cascos (calabaza, paja, bronce, obsidiana) y las 4 armaduras (viajero, quitina, bronce, obsidiana) son mallas del modelo y cambian con el equipo, en el mundo, el inventario, el combate y los retratos. Con armadura se oculta la camisa; con casco, Kai oculta el pelo y a Ema se le aplasta el pelo bajo el casco (conserva trenzas, coletas y melena). La «Corona arcana» pasa a ser el «Casco de bronce». Los GLB nuevos bajan de 17,2/14,9 MB a 10,2/8,9 MB sin perder calidad.
93. [**Hito 93: Retratos de Axies por ID, equipo fuera del escuadrón y retratos de NPC**](HITO_93_RETRATOS_Y_EQUIPO_DEL_ESCUADRON.md)
    - Un Axie cargado por ID ya tiene retrato aunque no haya salido en el mundo ni en combate: se le hace la foto 3D fuera de pantalla (y mientras, se ve su imagen del marketplace). La Mochila muestra solo el escuadrón; el Axie que sale conserva su equipo, runa y charms (etiqueta en Escuadrón) y hay un botón para devolverlos a la bolsa. Retratos nuevos de los 10 NPC Sapidae (con la base de Ema y Kai, sin pose T ni retratos repetidos; la herbolaria con su sombrero) y de la estatua de Atia actual.
94. [**Hito 94: Tamaño de los enemigos, retratos del fin de combate y correcciones del mundo**](HITO_94_ESCALA_DE_ENEMIGOS_Y_CORRECCIONES.md)
    - En combate los enemigos son tan grandes como pide su escala sin salirse de la casilla (solo brazos, colas y armas asoman ~17 cm); en el mundo, los grandes (dríades, osos, lobo jefe, alfas, treant) son más altos que el Sapidae. Retratos de los Axies por ID en el panel de victoria y derrota. Las botas ya no tiñen el pantalón. Luz y chispas de la Forja en la boca del horno. La cámara ya no salta al cruzar el arco de Génesis. Sin paredes invisibles en la ladera de la costa de la Mística (junto a la balsa). Gaviotas sobre el mar del Bosque y la Sabana. Remesh de los 17 enemigos (de 176.000 a 61.300 triángulos) con retratos de combate nuevos; el «Treant Florido» pasa a ser Slime Knight / Slime Caballero, con hechizos nuevos.

---

## 🎮 Controles y Atajos de Teclado

| Tecla | Acción en el Modo Overworld | Acción en Modo Combate |
| :---: | :--- | :--- |
| **`[W] [A] [S] [D]`** / Flechas | Desplazamiento del héroe en 3D. | Desplazamiento de cámara táctica. |
| **`[E]`** | Interactuar con NPCs y cofres (con el barquero Pomodoro: elegir isla de destino). | — |
| **`[Espacio]`** | Avanzar líneas de diálogo. | Pasar turno / Confirmar acción. |
| **`[I]`** | Abrir / Cerrar Inventario y Habilidades. | — |
| **`[U]`** | Mochila › Runas y charms. | — |
| **`[K]`** | Abrir / Cerrar Escuadrón. | — |
| **`[L]` o `[J]`** | Abrir / Cerrar Diario de Aventuras. | — |
| **`[M]`** | Abrir / Cerrar Mapa del Mundo e Isla. | — |
| **`[ESC]`** | Abrir / Cerrar Menú de Opciones (en la cinemática del prólogo: saltarla). | Deseleccionar acción. |
| **`[1]`–`[6]`** | — | Seleccionar las 6 habilidades de la unidad activa. |
| **`[7]`** | — | Duo Ultimate (Sapidae, vínculo al 100 %, desde la ronda 2; ronda 1 en la prueba del tutorial). |
| **Botón ⓘ del HUD** | — | Ayuda de combate: controles, estados, triángulo de clases y pronóstico. |
| **Clic en el Axie compañero** | Panel Axie Care (acariciar, comida, paseo). | — |
| **`F12` → `lkDebug.help()`** | `lunakaiTutorial.state()` / `.goto(paso)` / `.skip()` para el tutorial. | Consola de pruebas; `lkDebug.balance()` / `balanceExport()` para el equilibrio. |

---

## 🛠️ Tecnologías y Arquitectura
- **Motor 3D**: Three.js (WebGL 2.0) en `vendor/three.module.js` — Cero dependencias CDN.
- **Modelos 3D**: glTF / GLB optimizados con animaciones esqueléticas personalizadas.
- **Shaders GLSL**: Shaders propios para hierba instanciada con viento GPU, ríos animados, atmósfera y siluetas lejanas.
- **Arquitectura**: Vanilla JavaScript modular (ES6 Modules) bajo filosofía *Zero-Build*.
- **Servidor HTTP**: Node.js estático (`server.js`) en puerto `8082`.


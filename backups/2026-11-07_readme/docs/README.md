# Lunakai: Chronicles of Lunacia - Documentación del Proyecto

Bienvenido al repositorio de documentación técnica, arquitectura y especificaciones de **Lunakai: Chronicles of Lunacia** (anteriormente *Axie Tactics*), un RPG táctico 3D con exploración de mundo abierto (*Overworld*) estilizado y combates estratégicos por turnos basado en la propiedad intelectual de Axie Infinity.

> **Estado actual (5-nov-2026) — versión de prueba v0.5.0:** el mundo jugable son las **5 grandes islas** con dirección de arte Genshin: Bosque, Sabana, Ártico, Mística y **Genesis** (la antigua Mazmorra, rediseñada en el Hito 24).
> - **Códice de Lunacia (Hito 126, tecla C):** enciclopedia ilustrada del bucle del juego con Bestiario; el Escuadrón (T) se abre al graduarse con un recorrido guiado.
> - **Misión del mercader Ochi (Hito 124):** tras graduarse, una misión corta enseña la Tienda y el Mercado (comprar y equiparse un casco) antes de ir a por Bing.
> - **Koliseo (Hitos 122–123, tecla K):** Desafío de la Bruma (reto semanal de 5 combates con clasificación y premios) y **Arena PvP** (duelos 1 contra 1 con el Sapidae y el Axie principal igualados, temporadas con Elo, SLP y bAXS, árbitro en Supabase). Puesta en marcha: `DEPLOYMENT_GUIDE.md` y `docs/PLAN_ARENA_PVP.md`.
> - **Viaje entre islas:** se habla con el barquero **Kawa** en la playa de cada isla (hasta el Hito 51 era Pomodoro; se llamó Kappa hasta el Hito 56); los portales cardinales están retirados.
> - **Cuentas y nube (Hito 25):** inicio de sesión con Sky Mavis (el botón de correo se quitó de la pantalla de inicio en el Hito 115) y guardado en Supabase; falta la configuración del servidor.
> - **Economía (Hito 110):** oro (Ochi, Forja T0, recursos) · SLP (evolución y bolsas) · **AXS** (Mercado entre jugadores de equipo T1–3, runas, charms y bolsas, con sello NFT de Ronin) · bAXS (tasas de la Forja; más adelante, premios de arena y reto semanal).
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
> **Revisión de pendientes (7-nov-2026):** migraciones de Supabase todas aplicadas; los bugs menores que listaban los hitos 28, 46, 59, 92, 95, 126 y 132 ya no ocurren. Siguen abiertos la carga de la partida nueva (`PLAN_CARGA_PARTIDA_NUEVA.md`) y el equilibrio PvP. Puerto local 8082; la Duo Ultimate cuesta 6 PA y se lanza desde la ronda 2; las clases del Sapidae son las del Hito 95. Detalle en `PROJECT_CONTEXT.md` §5.62.
>
> Los hitos 2, 3, 6, 9, 10, 11 y 21 describen sistemas históricos y llevan una nota de estado al principio. Los hitos 4, 12, 14, 15, 25, 29, 30, 38, 42, 43, 44, 45, 48, 49, 50, 93 y 110 llevan una nota de actualización con lo que cambió después. Donde aparece "Mazmorra", hoy es Genesis.

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
    - 4 Clases de Sapidae (Forjacubiles, Pastor de Estrellas, Lunalogista, Astromante) con estadísticas base y previsualización de 6 hechizos. *Desde el Hito 95: Alfarero de Gólems, Comandante de Sombrero, Guardián de Campanas y Rastreador Gogo.*
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
95. [**Hito 95: Gólems de arcilla espiritual y las 4 clases del Sapidae según el lore**](HITO_95_GOLEMS_Y_CLASES_SAPIDAE.md)
    - Las clases pasan a ser Alfarero de Gólems, Comandante de Sombrero, Guardián de Campanas y Rastreador Gogo, con 24 habilidades nuevas basadas en el lore (Wind Bells, caracoles Gogo, petrasentido, Luna de Sangre). Cada clase invoca su gólem (Centinela, Sombrero, Campanario, Caparazón): sin turno propio, actúa al final del turno de su dueño, inmune a estados negativos y no cuenta para ganar o perder. Los guardados conservan el nivel de las habilidades. Gólems con modelos GLB propios (primitivas si faltan), emblemas de clase en WEBP con colores nuevos e iconos propios para las 24 habilidades.
96. [**Hito 96: El equipo del mundo sigue a la Forja y humo en las chimeneas**](HITO_96_EQUIPO_TRAS_EVOLUCIONAR_Y_HUMO_DE_CHIMENEAS.md)
    - Al evolucionar una pieza equipada, el modelo del mundo la quita y al recogerla lleva la evolucionada (Sapidae y arma del Axie compañero), sin desequipar y volver a equipar: el mundo escucha cualquier cambio del equipo. Humo gris claro y tranquilo en las chimeneas de tres casas del Bosque, la de Baruk, las de Pomodoro y del Ermitaño y la del astrólogo (una llamada de dibujo por isla, movimiento en el shader, se adapta a la luz).
97. [**Hito 97: Recarga de habilidades y usos por objetivo**](HITO_97_RECARGA_Y_USOS_POR_OBJETIVO.md)
    - Las cartas pueden tener recarga (turnos propios sin poder usarla), espera inicial y usos por objetivo y turno, además de los usos por turno. La carta en recarga se apaga con los turnos que faltan y la ficha lo explica. Valores: invocaciones de gólem 3, Luna de Sangre 4 (espera 1), áreas y control del Sapidae 1–2; cartas de Axie por reglas (control, daño alto, área, PA/PM, curas, apoyo, 1 PA: 105 de 235 con límite); enemigos solo en sus golpes fuertes. La IA respeta las recargas.
98. [**Hito 98: Habilidades que se desbloquean al subir de nivel**](HITO_98_HABILIDADES_POR_NIVEL.md)
    - A nivel 1 cada héroe tiene 3 cartas: en los Axies, ojos, orejas y boca; cuernos a nivel 3, espalda a 7 y cola a 10 (por tipo de parte). El Sapidae, igual por posición: 4.ª, 5.ª y 6.ª habilidad a 3, 7 y 10. Candado y «Nv. N» en la carta, aviso de «¡Nueva habilidad!» al subir, candados en el creador y en runas y charms. El tutorial elige la carta de la ranura [1] entre las desbloqueadas.
99. [**Hito 99: VFX cuerpo a cuerpo corregidos y piloto del estilo estilizado**](HITO_99_VFX_CUERPO_A_CUERPO_Y_PILOTO_ESTILIZADO.md)
    - Los ataques cuerpo a cuerpo ya caen sobre el objetivo y a tamaño completo: el puente usa las anclas de diseño de cada efecto (antes, a 1 casilla el mordisco caía a mitad de camino y al 57 %).
    - Kit estilizado `src/vfx/vfx-stylized.js` (erosión del alfa, rampa de 4 tonos, mezcla por capas, luz del sol en 3 bandas, atlas de formas) y piloto con Mordisco, Watermelon y Esporas. Se enciende con `lkDebug.vfxEstilo(true)`; comparación lado a lado en `tools/vfx-lab/estilizado.html`.
100. [**Hito 100: VFX estilizados para los 61 ataques de enemigos, las 24 habilidades del Sapidae y los gólems**](HITO_100_VFX_ESTILIZADOS_ENEMIGOS_Y_SAPIDAE.md)
    - Las 21 plantillas básicas en el estilo nuevo (cuerpo a cuerpo, distancia y área, control y apoyo), con estados estilizados compartidos; los 61 ataques de enemigos las usan (`mod-estilizado-enemigos.js`).
    - Efecto propio para las 24 habilidades del Sapidae (fuera la tabla de alias) y para el pulso y la rotura de los gólems; 114 efectos estilizados en total, apagados por defecto (`lkDebug.vfxEstilo(true)`).
101. [**Hito 101: VFX estilizados hechos a mano para las 235 cartas de partes, las cartas α y las Ultimates**](HITO_101_VFX_ESTILIZADOS_CARTAS.md)
    - El estilo nuevo va encendido por defecto (`lkDebug.vfxEstilo(false)` lo apaga). Las 235 cartas de partes (36 módulos `mod-estilizado-<clase>-<parte>.js`), las 5 cartas α de Bing y Pomodoro y las 3 Ultimates de dúo tienen efecto estilizado propio; las cartas de colección usan el de su carta base.
    - Cartas de aliado lanzadas sobre sí mismo dibujadas en el lanzador; partículas repartidas en grupos parejos (`vfx-core.js`); laboratorio con `?fx=card:<id>`.
102. [**Hito 102: Recorrido de todos los VFX y efectos de aliado que caían sobre el lanzador**](HITO_102_RECORRIDO_VFX_Y_ALIADOS.md)
    - `lkDebug.vfxRecorrido()` reproduce en orden los 387 efectos (cartas, α, Ultimates, Sapidae, enemigos, gólems) con su nombre en pantalla; M marca «necesita arreglo» y `lkDebug.vfxMarcadas()` exporta la lista.
    - Cuatro cartas α que usaban un efecto de su carta base pensado para otro objetivo tienen efecto propio; las cartas de aliado sin receptor declarado ya no se dibujan delante del lanzador.
103. [**Hito 103: Sin congelamientos al empezar la partida ni al viajar entre islas**](HITO_103_TIRONES_MUNDO_ABIERTO_Y_VIAJES.md)
    - Al abrir el telón: de un fotograma de 18 s a ninguno por encima de 70 ms. Causas: la transparencia de la cámara cambiaba los shaders de árboles y edificios tras el precalentado, y el retrato del autoguardado compilaba el Sapidae en un segundo contexto WebGL en cada sesión. Ahora la transparencia se aplica antes de precalentar y el retrato solo se rehace si cambia el aspecto, en segundo plano (`captureModelAsync`).
    - Viajes en barca: de ~17 s con congelamientos a 2–5 s detrás del telón. El mundo no se dibuja mientras se cambia de isla, el jugador y la cámara llegan al muelle antes del precalentado, y el pueblo, los edificios GLB, las texturas de caminos y las máscaras se esperan detrás del telón (`src/render/LoadGate.js`). El precalentado dibuja un fotograma completo con sombras.
    - `lkDebug.perf` dice qué código ocupó cada fotograma largo, qué llamadas a WebGL bloquearon y quién las pidió (con su pila), y la evolución del heap.
104. [**Hito 104: Arreglos de los VFX marcados en el recorrido y Ultimates de arcilla espiritual**](HITO_104_ARREGLOS_VFX_RECORRIDO_Y_ULTIMATES_ARCILLA.md)
    - Motor: el suelo cerca del lanzador y del objetivo ya no se estira (auras, charcos, sellos); las áreas en cruz quedan en la cuadrícula en diagonal; los efectos de «todos los enemigos» usan la posición real de cada unidad.
    - 20 efectos rehechos o mejorados (Hero, Jaguar, Garra colosal, Scarab, Parasite, Neo, Pincer, Cute Bunny, Mosquito, Gila, Village Hero α, Oranda, Piranha, Koi, Ranchu, Shrimp, Tri Feather…).
    - Ultimates de arcilla espiritual: Asalto es una ola de arcilla, Torrente un tornado de arcilla, agua y plumas, y Bastión hace 60–80 de daño a los enemigos del círculo. Danza de Espinas de la Dríada pasa a alcance 1.
    - `lkDebug.vfxRecorrido({ marcadas: true })` repasa solo los efectos marcados.
105. [**Hito 105: Las áreas en cruz del tamaño exacto de una casilla**](HITO_105_CRUCES_A_TAMANO_DE_CASILLA.md)
    - El puente encogía el efecto a 1–2 casillas del objetivo y la cruz salía al 37–75 %. Ahora las habilidades de área se dibujan alrededor del objetivo a la escala real de la casilla, a cualquier distancia y con cualquier tamaño de VFX.
    - Buzz Buzz, Maelstrom, Tri Feather, Shiitake y Death Shroom marcan casillas enteras con borde.
    - Ráfaga de la Espesura, Cataclismo y Esporas declaran su propia área (`areaCells`); el Cataclismo ya no sale en X en diagonal.

106. [**Hito 106: Respawn de mobs en puntos aleatorios de cada isla**](HITO_106_RESPAWN_DE_MOBS.md)
    - Los mobs caídos reaparecen: manadas normales en un punto aleatorio del pool de la isla (≥ 50 m del jugador y ≥ 30 m de otros mobs), con retardos por bioma; jefes y mobs de misión con retardo largo, en su puesto. Cinco manadas por isla (slimes en el Bosque, lejos del pueblo), con humo al aparecer.
    - Los mobs de misión solo dan su recompensa y su aviso la primera vez. Los mobs lejanos se quedan quietos y los de media distancia se actualizan a medio ritmo: con 5 manadas, 59,5 FPS y +0,4 ms de CPU frente a las 2 de antes.
    - Consola: `lkDebug.respawn({ fast, kill })` y `lkDebug.spawnPool()` (generador de los puntos de aparición de cada isla).
107. [**Hito 107: Números de combate con el sistema de diseño**](HITO_107_NUMEROS_DE_COMBATE.md)
    - Números flotantes del sistema de diseño: blanco el daño que haces, carmesí suave el que recibes, crítico dorado con etiqueta, estados y recursos en píldoras apiladas, golpes seguidos sumados y total de área.
    - Opción «Números de combate» (Todos / Solo daño / Ocultos).
108. [**Hito 108: Sonido de las habilidades (pack de combate, Sapidae, enemigos, estados y Ultimates)**](HITO_108_SONIDO_DE_HABILIDADES.md)
    - El pack de combate (161 WAV, 35,6 MB) pasa a 145 MP3 mono (2,8 MB) con nivel igualado y manifiesto (`tools/audio/build_skill_sfx.py`); los WAV quedan en `backups/2026-10-30_sounds/combat/`.
    - Las 235 cartas suenan con la clase del Axie que lanza y su tipo de ataque (mordisco, cornada, tajo, golpe, magia, disparo, lanzamiento), sincronizadas con el impacto de su VFX (±10 ms). El Sapidae, los gólems, los enemigos (86 habilidades) y las 3 Ultimates usan el pack más firmas sintetizadas; los 31 estados, curas y escudos tienen sonido del pack.
    - Mezcla frente a la música (cartas +3 dB sobre ella, Ultimates con la música atenuada 6 dB), carga solo de lo que hay en cada combate (tope 32 MB) y `lkDebug.sfx('skills' | 'sapidae' | 'enemigos' | 'estados' | 'ultimates' | 'recorrido' | 'skill' | 'memoria')`.
109. [**Hito 109: Versión de los assets en las rutas (caché del hosting)**](HITO_109_VERSION_DE_ASSETS.md)
    - Modelos, texturas, KTX2, DRACO, Axies y audio se piden con `?v=ASSET_VERSION` (`src/render/AssetVersion.js`): un asset reemplazado llega a todos los jugadores aunque tengan guardado el viejo (caso: cactus de la Sabana optimizado). La caché de un año se mantiene.
    - `.htaccess` (Hostinger): imágenes revalidadas (`no-cache`), un año `immutable` para modelos, audio, `.ktx2`, `.bin` y `.wasm`.
    - Regla: si cambias algo en `assets/`, sube `ASSET_VERSION` antes de subir el juego. Pasos en `DEPLOYMENT_GUIDE.md`.
110. [**Hito 110: Moneda AXS en el Mercado entre jugadores**](HITO_110_MONEDA_AXS.md)
    - El equipo Tier 1–3, las runas y los charms se compran y venden entre jugadores en **AXS** (antes bAXS, que es una recompensa y no se intercambia), con sello NFT y comisión del 5 % en AXS. Las bolsas de runa y de charm también se venden solo en el Mercado. Ochi ya no compra runas, charms, bolsas ni equipo T1–3, y el regalo del tutorial (una runa y un charm) no se comercia.
    - Economía: oro (Ochi, Forja T0, recursos) · SLP (evolución y bolsas) · AXS (Mercado de equipo, runas y charms) · bAXS (tasas de la Forja; más adelante, premios de arena y reto semanal).
    - Bono: partidas nuevas 5 AXS + 15 bAXS (antes 30 bAXS); las existentes, +5 AXS +15 bAXS una vez. Migraciones `20261101000000` a `20261101000005`.
    - Sello NFT (logo de Ronin) en el equipo T1–3 en la Mochila, la Tienda, el Mercado y la Forja; AXS en la cabecera de la Tienda, la Mochila y la Forja. Versión del juego en pantalla: v0.4.0 (`GAME_VERSION`).
111. [**Hito 111: Interfaz adaptable a ventanas de PC (bajas y estrechas)**](HITO_111_RESPONSIVE_PC.md)
    - Medido a 1920×1080, 1600×900, 1440×900, 1366×768, 1280×720, 1024×768 y 1280×600: el botón principal de Forja y Tienda queda siempre a la vista (`sticky`), la Forja ya no tiene un scroll fantasma (las chispas del yunque) y Mochila y Runas conservan las tres columnas hasta 981 px.
    - «Reglas y controles» cabe entera hasta 1280×720 (compactación por altura); la cola de turnos se recorta al ancho libre y la ficha de la unidad reserva una fila de 3 chips de estado (sin saltos). Las pantallas pendientes se trataron en el Hito 112.
112. [**Hito 112: Escuadra, inicio y scrollbars visibles (PC)**](HITO_112_RESPONSIVE_PC_PANTALLAS.md)
    - Escuadra compacta las ranuras con poca altura (la colección gana ~90 px a 1280×600); la pantalla de inicio escala el logo por altura y ya no hace scroll hasta 1280×720 y 1024×768; fin de combate compacta el encabezado; barras de scroll doradas visibles en misiones, mapa, escuadra y fin de combate. Mundo abierto ya estaba bien. Sin auditar: formulario de email y selector de slots.

113. [**Hito 113: Égida de Gaia centrada en el Sapidae**](HITO_113_GAIA_CENTRADA_EN_EL_SAPIDAE.md)
    - La cúpula, los pilares y el pulso de la Ultimate de Gaia se centran en el Sapidae (antes en el promedio del trío, que quedaba desplazado hacia atrás en el tablero).

114. [**Hito 114: Tarjetas de la Mochila iguales y nueva interfaz de pesca**](HITO_114_MOCHILA_Y_PESCA.md)
    - Las casillas de la Mochila ya no bajan el arte cuando su pie tiene 1 línea (el `<button>` centraba el contenido): arte arriba y pie de 2 líneas en todas.
    - Pesca: un solo panel de tamaño fijo con corcho animado, anzuelos que quedan, hilo del tiempo y botín dentro; el marcador se mueve con `transform`. Sin cambios en las reglas del reto.
115. [**Hito 115: Ajustes de runas, inicio, derrota, tutorial y ranura de partida**](HITO_115_AJUSTES_TUTORIAL_INICIO_Y_DERROTA.md)
    - Runas y charms: sin candado en el regalo del tutorial y la cantidad («×N») pasa abajo a la derecha para no tapar la clase. Inicio: sin botón de correo. Sin el disco de sombra bajo el Sapidae.
    - Al perder un combate el escuadrón despierta frente al altar de Atia del pueblo del Bosque (el tutorial sigue volviendo junto a Paladill).
    - Tutorial: la cámara mantiene al Axie a la vista al acariciarlo y alimentarlo; en el primer combate el Axie ve una sola casilla azul; en el duelo con Paladill el Axie se mueve con total libertad (todas las casillas alcanzables marcadas, también en los pasos libres).
    - Sin el cartel «Bosque» sobre la cinemática del prólogo. La tarjeta de la ranura en la selección de aventura muestra el Axie principal actual (`slot.mainAxie`), no el de creación.
116. [**Hito 116: Los escudos de enemigos salen sobre el lanzador**](HITO_116_ESCUDOS_PROPIOS_DE_ENEMIGOS.md)
    - Gelatinous Shield, Viscous Carapace, Paternal Protection y Thick Bark se dibujaban en una casilla vacía lejos del lanzador (el puente movía un receptor que el efecto ya dibujaba en el lanzador). Ahora declaran `receiver:'caster'`.
117. [**Hito 117: Las partes místicas de nivel 1 se ven en el juego**](HITO_117_PARTES_MISTICAS_NIVEL_1.md)
    - El shader `Mystic_Final` del mixer declaraba `uv1` y three r160 también (las piezas de nivel 1 traen un segundo juego de UV): no compilaba y solo se veía el contorno oscuro. Ahora la declaración va dentro de `#ifndef USE_UV1`. Sin subir `ASSET_VERSION` (los `.js` se revalidan solos).
118. [**Hito 118: Menos brillo en las partes místicas**](HITO_118_BRILLO_MISTICOS.md)
    - Los materiales místicos del mixer daban colores muy por encima del blanco (en Unity se recortan) y el bloom los convertía en un destello que tapaba las partes. Ahora su color se limita a 0,88, por debajo del umbral del bloom; queda el brillo suave de sus partículas.
119. [**Hito 119: Música del título y sonido en todos los botones**](HITO_119_MUSICA_TITULO_Y_SONIDO_BOTONES.md)
    - El inicio de sesión y la creación de personaje tienen música (`AVATAR_THEME_V1`) y sus sonidos ya se oyen desde la primera visita (el audio se enciende con el primer gesto). Arreglados el corte y la bajada de volumen de una pista retenida por el navegador.
    - Clic común en todos los botones sin dobles sonidos (`audio/UiClickSfx.js`, `data-sfx="none"` para excluir) y la Mochila, la Escuadra y el Libro de misiones dejan de usar el sonido de paso como clic.
120. [**Hito 120: Tutorial rápido, cámara isométrica de combate y correcciones**](HITO_120_TUTORIAL_RAPIDO_CAMARA_ISOMETRICA_Y_CORRECCIONES.md)
    - Tutorial corto: Dojo → Mochila → Forja → vínculo → runas → combate final contra el Slime Caballero (Rastro de Miasma, Ultimate) → graduación. Duelo con Paladill opcional. Cámara de combate isométrica fija (FOV 14, `Q`/`E` 90°, opción `combatCam`) y clic en el modelo = su casilla.
    - Mapa con coordenadas en vez de niveles, «Isla» → «Tierra», aviso y aspecto nuevo del miasma, árboles transparentes sobre las unidades, Ultimate solo en el turno del Sapidae y precalentado de los efectos (muerte, marcas, miasma) contra los tirones.
121. [**Hito 121: Formulario de feedback**](HITO_121_FORMULARIO_DE_FEEDBACK.md)
    - Botón 💬 (tecla **F**) entre Mapa y Opciones (también durante el tutorial: la guía deja un hueco sobre él) que abre «Envíanos tu opinión». Se guarda en Supabase (`feedback`, función `submit_feedback`) como invitado o con la cuenta de Sky Mavis; el tipo de cuenta lo decide el servidor y hay antispam.
    - Al graduarse en el tutorial, en lugar del mapa, «¿Te está gustando Lunakai?» con «Enviar mi opinión» / «Ahora no». Versión v0.4.1.
122. [**Hito 122: Koliseo · Desafío de la Bruma**](HITO_122_KOLISEO_DESAFIO_DE_LA_BRUMA.md)
    - Koliseo (botón del HUD, tecla **K**, o Paladill; el Escuadrón pasa a la **T**): reto semanal de 5 combates en los tableros de un bioma (rotación desde el Bosque), enemigos ×1 → ×3, jefe final Slime Caballero con miasma, un modificador por semana, 2 intentos y 2 derrotas.
    - Clasificación (combates superados y luego rondas, top 10 y tu puesto) y premios al top 3 (bAXS, Esquirla lunar, Ámbar de Atia y oro) entregados sin perderse ni duplicarse. Servidor en Supabase (`bruma_*`, `koliseo_pending`, `koliseo_ack`). Versión v0.5.0.
123. [**Hito 123: Arena PvP**](HITO_123_ARENA_PVP.md)
    - Duelos 1 contra 1 en el Koliseo con el Sapidae y el Axie principal igualados (nivel 10, sin equipo, runas ni Ultimate), en 7 tableros simétricos; cola por puntos, turnos de 45 s con la hora del servidor, temporadas mensuales con Elo, 15 SLP por victoria y bAXS al top 10.
    - Los dos jugadores ejecutan el mismo motor con la misma semilla (huella del estado en cada turno) y un árbitro en Supabase (Edge Function `pvp-arbiter`) repite las partidas en disputa y castiga al tramposo. Equilibrio y estadísticas (`balance.mjs`, `pvp_stats`). Versión v0.5.0.
124. [**Hito 124: Misión «El mercader del Dojō» (Ochi)**](HITO_124_MISION_OCHI.md)
    - Nueva misión principal 2, entre la graduación y Bing: Paladill manda con Ochi, que explica el oro, la Tienda y el Mercado, da un monedero (completa hasta 60 de oro) y pide comprar un casco y ponérselo; recompensa de 80 de oro y 2 pociones.
    - El Yelmo Bestial deja de caer en combate (Tienda y Forja). Migración `20261111000000_quest_merchant_ochi.sql`. Versión v0.5.0.
125. [**Hito 125: Koliseo más claro**](HITO_125_KOLISEO_MAS_CLARO.md)
    - Arena PvP en dos tarjetas (temporada y duelo) con historial que dice tablero y hace cuánto; la Bruma marca la amenaza de cada combate, los intentos como rombos y cuándo vuelven; la Clasificación en una sola barra con el premio en cada fila.
    - La ventana ya no cambia de alto entre pestañas. Sin cambios en el servidor.
126. [**Hito 126: Escuadrón tras la graduación y Códice de Lunacia**](HITO_126_ESCUADRON_Y_CODICE.md)
    - El Escuadrón (T) se abre al graduarse, con un recorrido de 3 tarjetas la primera vez y botón «?»; con Bing solo queda colocarlo en apoyo.
    - Códice (C): libro de 12 capítulos sobre el bucle del juego, con capturas, diagramas en SVG y páginas generadas de los datos (Bestiario de 18 quimeras en silueta hasta vencerlas, tus cartas, tu clase y las tres Ultimate). Botones «?» en la Tienda, la Forja y el Koliseo. Versión v0.5.0.
127. [**Hito 127: Códice más claro**](HITO_127_CODICE_MAS_CLARO.md)
    - Sin cambiar el contenido: índice del capítulo bajo la ilustración, capturas ampliables (Esc vuelve), pasar página con texto que nombra el capítulo siguiente, contador en el Bestiario y progreso de lectura en el carril.
128. [**Hito 128: Ajustes del Koliseo, las runas, la Forja y la apariencia**](HITO_128_AJUSTES_KOLISEO_RUNAS_FORJA_APARIENCIA.md)
    - El Koliseo (K) tiene punto de «Nuevo» y un recorrido de 3 tarjetas en su primera apertura (componente común `PanelTour` con el Escuadrón); la etiqueta «Nuevo» de las runas vuelve a su tamaño.
    - En la Forja del tutorial, la ficha de un material ya no se queda encima de «Acelerar»; el creador de personaje ya no muestra «Ema» ni «Kai». Versión v0.5.0.
129. [**Hito 129: Recorridos de panel como «coach marks»**](HITO_129_RECORRIDOS_DE_PANEL_COACH_MARKS.md)
    - Las tarjetas de primera apertura del Escuadrón y el Koliseo señalan su zona con una flecha y un foco que atenúa el resto; añaden «Atrás», «Saltar» arriba y teclas → / ← / Esc (Esc no cierra el panel).
130. [**Hito 130: Avisos de «Nuevo» en el HUD**](HITO_130_AVISOS_DE_NUEVO.md)
    - Gestor común `NewBadges` para el Escuadrón, el Koliseo y el Códice: número de páginas sin leer en el Códice (baja al leer cada una), texto del aviso al pasar el ratón, late 3 veces y queda fijo; el Escuadrón y el Koliseo se apagan al abrirlos.
131. [**Hito 131: Selector de aventura con escenario 3D**](HITO_131_SELECTOR_DE_AVENTURA.md)
    - «Elige tu aventura» con un escenario grande (Sapidae y Axie en 3D, flechas ‹ ›, Jugar junto al nombre) y lista de ranuras; el mundo ya no se dibuja detrás del título. Un solo visor 3D a 30 fps, sin sombras, que se libera al jugar.
132. [**Hito 132: Selector: isla por bioma y panel «Tu partida»**](HITO_132_SELECTOR_ISLA_Y_TU_PARTIDA.md)
    - El personaje del selector está sobre una isla flotante del bioma de su zona (SVG, sin coste de gráfica) y la columna derecha muestra la misión actual con su siguiente paso, el escuadrón y desde cuándo existe la partida.
133. [**Hito 133: Selector: cielo del título e islas 3D**](HITO_133_SELECTOR_CIELO_E_ISLAS_3D.md)
    - El escenario del selector lleva el cielo estrellado del título y los personajes se paran sobre una isla 3D con el aspecto de la isla de su partida (bosque, sabana, ártico, místico o Génesis), con props del juego y el mismo sombreado toon.
134. [**Hito 134: Selector: terreno cuadrado de casillas**](HITO_134_SELECTOR_TERRENO_DE_CASILLAS.md)
    - El personaje del selector se para sobre un trozo de tablero de combate flotante (5 × 4 casillas en damero con los colores de la arena de su bioma) en lugar de una isla redonda.
135. [**Hito 135: Contextos WebGL liberados y lista de ranuras**](HITO_135_CONTEXTOS_WEBGL_Y_LISTA_DE_RANURAS.md)
    - Los visores 3D (creador, selector, Mochila) cierran su contexto WebGL al liberarse: abrirlos muchas veces ya no hace que Chrome cierre el contexto del juego. En la lista de ranuras, la fila ya no se sale del marco al pasar el ratón y los retratos quedan centrados.
136. [**Hito 136: Guía por migas y mapa de rumbo (fase 1), y ajustes visuales**](HITO_136_GUIA_MIGAS_Y_MAPA_DE_RUMBO.md)
    - Una chispa dorada recorre el camino hacia el objetivo dejando migas de polvo, rodeando árboles, agua, vallas y mesetas. El camino se calcula por partes (≈2 ms por fotograma), ocupa 0,5 MB en la isla más grande y la estela se dibuja en una sola llamada. Se quita la flecha flotante delante del personaje.
    - Ajustes visuales:
      - retratos de Axie enteros dentro de su marco (HUD, Mochila, Escuadrón, fin de combate y creación);
      - escuadrón de la Mochila en una fila de 4, con el corazón del vínculo visible;
      - runa centrada en su ranura y Philosopher's Stone al tamaño de las demás;
      - ramas de los árboles sobre el tronco curvado (Bosque e islas).
137. [**Hito 137: Puente plano del Bosque**](HITO_137_PUENTE_PLANO_DEL_BOSQUE.md)
    - Los puentes y el muelle del Bosque usan `puente_plano.glb`. Su textura pasa de WebP a KTX2 (el mismo atlas de madera que ya había): de ~5,6 MB a ~0,7 MB de memoria de vídeo.
138. [**Hito 138: Rivales bot en la Arena PvP**](HITO_138_RIVALES_BOT_ARENA.md)
    - A los 10 s en la cola sin rival humano, se juega contra un bot que se comporta como un jugador: puntos, SLP, clasificación y árbitro como siempre. Los bots juegan desde el servidor (Edge Function `pvp-bot`) con el mismo motor, así que no se pueden manipular desde el navegador.

139. [**Hito 139: Carga del creador, farola del Dojo y Axies a distancia en el primer combate**](HITO_139_CREADOR_FAROLA_Y_TUTORIAL_A_DISTANCIA.md)
    - Creador: precarga en el título (GLB del Sapidae, mixer y partes de la API de los Axies iniciales), API en paralelo y modelos que aparecen ya compilados con una luna de carga: primera apertura de 1,26 / 2,85 s a 0,98 / 1,65 s (Sapidae / Axie) y parón máximo de 577 a 130 ms.
    - La farola que tapaba al jugador tras la cinemática (`lamp_6`) pasa a (−92.7, 15.8), hacia el altar de Atia.
    - Primer combate del tutorial: un Axie que solo ataca a distancia usa su propia carta (antes, los hechizos de Shinji) y la guía le marca una casilla a tiro en lugar de pegarlo al Slime.
140. [**Hito 140: Tirones al equipar la espada y ritmo de la victoria**](HITO_140_TIRONES_ESPADA_Y_VICTORIA.md)
    - Equipar la espada: el retrato del Sapidae se genera en segundo plano y se lee de la GPU solo cuando ha terminado de dibujar. Fotogramas de 79–186 ms → máximo 31 ms.
    - Victoria del primer combate: el remate del último enemigo empieza antes (pausa 380 → 150 ms) y el panel espera al estallido en lugar de a un tiempo fijo.
    - Hacha al cortar el árbol de la Forja: ya se precompilaba; sin tirones en ninguna medida.
    - Errores 404: la ficha de las cartas en combate vuelve a mostrar su imagen (ruta absoluta en `--art`), y los sonidos opcionales solo se piden si están en `assets/sounds/sfx/manifest.json`. `ASSET_VERSION` 0.4.1.
    - El corazón del vínculo del escuadrón se rellena en cuanto sube el vínculo (antes no cambiaba en el tutorial), y el cartel de la forja sale en el idioma elegido.
141. [**Hito 141: Colisión de la cámara del mundo**](HITO_141_COLISION_DE_CAMARA.md)
    - Esfera de 0,35 m en vez de rayo fino, mínimo de 1,8 m desde la cabeza (si no cabe, la cámara sube por encima del personaje) y una sola regla de suavizado: rápido al acercarse, 0,3 s de espera y vuelta despacio. En la simulación, la cámara metida en una pared o en el suelo pasa de 4028 fotogramas a 0.
142. [**Hito 142: Revisión de rendimiento y menos draw calls**](HITO_142_RENDIMIENTO_DRAW_CALLS.md)
    - Medidas por estado (el límite es la CPU de los draw calls). Tablero del combate instanciado (296 → 113 draws) y hierba y flores en 4 draws (mundo 308 → 251; CPU de dibujo 6,6 → 5,2 ms). Mismo aspecto.
143. [**Hito 143: Resolución dinámica, tiempo de GPU y memoria del Sapidae**](HITO_143_RESOLUCION_DINAMICA_Y_GPU.md)
    - La escala de resolución de Opciones ya reduce lo que dibuja el posprocesado (antes no ahorraba GPU). Nueva «Resolución dinámica»: baja hasta un 20 % solo si la GPU no llega a 60 fps y vuelve sola. `lkDebug.perf` mide el tiempo de GPU (`gpuDibujoMs`). Memoria del Sapidae investigada (~150 MB por diseño; opciones en el documento).
144. [**Hito 144: Cambiar la calidad sin congelar y texturas del Sapidae a 512×512**](HITO_144_CALIDAD_SIN_CONGELAR_Y_TEXTURAS_SAPIDAE.md)
    - Pasar de Alta a Baja ya no congela el juego: los shaders sin sombras se compilan en paralelo antes de volver a dibujar, con el aviso «Aplicando calidad gráfica…» si tarda (unos 8 s la primera vez en Chrome). Las texturas de las variantes de Ema y Kai pasan a 512×512 (RAM de imágenes 165 → 87 MB, GPU 64 → 40 MB, GLB −2,7 / −2,1 MB). `ASSET_VERSION` 0.4.2.
145. [**Hito 145: Menos memoria de texturas (NPC Sapidae, slimes y kappa)**](HITO_145_TEXTURAS_NPC_SLIMES_KAPPA.md)
    - Sapidae de los aldeanos a 512, mejillas y pantalón de Ema a 256, kappa y slimes en KTX2 (UASTC). Texturas del contexto principal 326 → 192 MB, sin diferencia visible de cerca. `ASSET_VERSION` 0.4.3.

> Resumen de los Hitos 129–137 (qué se hizo, rendimiento, reglas nuevas y pendientes): [RESUMEN_HITOS_129_137.md](RESUMEN_HITOS_129_137.md)
---

## 🎮 Controles y Atajos de Teclado

| Tecla | Acción en el Modo Overworld | Acción en Modo Combate |
| :---: | :--- | :--- |
| **`[W] [A] [S] [D]`** / Flechas | Desplazamiento del héroe en 3D. | Desplazamiento de cámara táctica. |
| **`[E]`** | Interactuar con NPCs y cofres (con el barquero Kawa: elegir tierra de destino). | Girar la cámara 90°. |
| **`[Espacio]`** | Avanzar líneas de diálogo. | Pasar turno / Confirmar acción. |
| **`[I]`** | Abrir / Cerrar Inventario y Habilidades. | — |
| **`[U]`** | Mochila › Runas y charms. | — |
| **`[T]`** | Abrir / Cerrar Escuadrón. | — |
| **`[C]`** | Abrir / Cerrar el Códice de Lunacia (desde la graduación). | — |
| **`[K]`** | Abrir / Cerrar Koliseo (Desafío de la Bruma y clasificaciones). | — |
| **`[L]` o `[J]`** | Abrir / Cerrar Diario de Aventuras. | — |
| **`[M]`** | Abrir / Cerrar Mapa del Mundo y de la Tierra. | — |
| **`[F]`** | Enviar opinión (formulario de feedback; también durante el tutorial). | — |
| **`[Q]`** | — | Girar la cámara 90°. |
| **Clic derecho o rueda pulsada + arrastrar** | — | Desplazar la cámara isométrica. |
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


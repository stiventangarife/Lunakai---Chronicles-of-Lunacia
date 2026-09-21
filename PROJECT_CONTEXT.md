# PROJECT_CONTEXT.md — Axie Tactics: Guía de Continuación para Agentes y Desarrolladores

> **Última actualización:** 2026-09-20  
> **Estado actual:** Mundo abierto funcional con 25 zonas, 5 biomas, río extendido y árboles estilizados con soporte de variantes (incluyendo arces japoneses otoñales rojo/carmesí en el Dojo [3,3]).  
> **Idioma de comunicación:** **Siempre en español** con el usuario.

---

## 1. Visión General del Proyecto

**Axie Tactics** es un RPG táctico 3D web con exploración de mundo abierto (Overworld) estilizado y combates estratégicos por turnos. Está inspirado en *Final Fantasy Tactics*, *Dofus* y *Fire Emblem*, usando el lore e IP de **Axie Infinity**.

- **Tecnología**: Vanilla JavaScript ES6 Modules + Three.js (WebGL 2.0)  
- **Three.js**: Bundleado localmente en `vendor/three.module.js` — **NO es un paquete npm**  
- **Servidor**: `node server.js` (servidor HTTP estático propio, puerto 8081)  
- **URL del juego**: `http://127.0.0.1:8081`  
- **Recarga**: `Ctrl+F5` en el navegador  
- **Sin git**: El proyecto NO tiene repositorio git  
- **Sin package.json ni node_modules**: No hay framework de build. Todos los imports son ES Modules nativos del browser

---

## 2. Arquitectura del Proyecto

### 2.1 Estructura de Carpetas

```
axie-tactics-web/
├── server.js                    ← Servidor HTTP Node.js estático (puerto 8081)
├── server.py                    ← Alternativa en Python
├── index.html                   ← Punto de entrada HTML único
├── styles.css                   ← Todos los estilos CSS del juego (~150KB)
├── vendor/
│   ├── three.module.js          ← Three.js completo bundleado localmente
│   ├── GLTFLoader.js            ← Cargador GLTF/GLB
│   └── ...otros loaders
├── assets/
│   ├── stylized/                ← Texturas y modelos del overworld base
│   ├── arctic/                  ← Assets del bioma ártico
│   ├── savannah/                ← Cactus, palmeras, rocas desérticas
│   ├── mystic/                  ← Setas, flores místicas
│   ├── dungeon/                 ← Árboles muertos, obsidiana
│   └── models/                  ← paladill.glb y otros NPCs
├── src/
│   ├── main.js                  ← Orquestador central (combate + overworld)
│   ├── tactics/                 ← Sistema de combate táctico por turnos
│   └── rpg/
│       ├── OverworldManager.js  ← Director maestro del mundo abierto
│       ├── PlayerEntity.js      ← Entidad del héroe jugable
│       ├── PlayerController.js  ← Input WASD + físicas
│       ├── OverworldCollisions.js
│       ├── OverworldCamera.js
│       ├── NPCManager.js        ← Maestro Paladill y NPCs
│       ├── WanderingMonsters.js ← Quimeras errantes con IA
│       ├── QuestManager.js      ← Sistema de misiones
│       ├── BattleTransition.js  ← Transición Overworld ↔ Combate
│       ├── DialogSystem.js
│       ├── SaveSlotManager.js
│       ├── AxieMixerService.js
│       ├── stylized/            ← Entorno visual procedural
│       │   ├── StylizedEnvironment.js   ← Coordinador de todos los sub-sistemas
│       │   ├── StylizedGround.js        ← Suelo 80x80m con shader PBR
│       │   ├── StylizedGrass.js         ← 18,000 briznas instanciadas GPU
│       │   ├── StylizedFlowers.js       ← 380 flores instanciadas
│       │   ├── StylizedTrees.js         ← Árboles procedurales por zona
│       │   ├── StylizedGroundFoliage.js ← Follaje del suelo cerca de árboles
│       │   ├── StylizedTreeVines.js     ← Hiedra/vines en troncos
│       │   ├── StylizedRiver.js         ← Río animado con zonas [3,1]→[3,5]
│       │   ├── PathSDF.js               ← Signed Distance Field del camino
│       │   └── ToonOutline.js
│       ├── world/               ← Gestión del mundo, biomas y zonas
│       │   ├── MapRegistry.js           ← Genera las 25 macro-zonas y portales
│       │   ├── WorldMapManager.js       ← Cambio de zonas y estado del mundo
│       │   ├── WorldMapModal.js         ← Mapa [M] interactivo
│       │   ├── BiomeThemeManager.js     ← Transiciones de bioma (luz, niebla)
│       │   ├── BiomeDecorationManager.js ← Props 3D por bioma (cactus, rocas)
│       │   ├── BiomeEnemyCatalog.js
│       │   ├── BiomePOIManager.js
│       │   ├── MagicalSkybox.js         ← Cúpula celeste procedural
│       │   ├── ZoneParticleManager.js   ← Partículas ambientales por bioma
│       │   ├── ZoneTransitionManager.js ← Portales cardinales Dofus
│       │   ├── DojoBambooGrove.js       ← Bambúes GPU zona [3,3]
│       │   ├── DojoRockSanctuary.js     ← Rocas y ruinas del Dojo
│       │   ├── DojoBuilding.js          ← Pagoda y templo del Dojo [3,3]
│       │   └── DojoNatureManager.js     ← Vegetación MegaKit (Arbustos florales, Hongos, Pétalos Petal_1/2 y Rocas Pebble_Round_1..5) [3,3]
│       └── ui/
│           ├── SquadHUD.js
│           └── StartScreenUI.js
├── docs/                        ← Hitos de desarrollo completados
└── scratch/                     ← Scripts de diagnóstico y pruebas temporales
```

### 2.2 Flujo de Inicialización (Orden crítico)

```
index.html
  └─ main.js
       └─ OverworldManager.init()
            ├─ StylizedEnvironment.init()      ← await (carga texturas + grass + flowers + trees + foliage + vines)
            ├─ MagicalSkybox (new)
            ├─ ZoneParticleManager (new)
            ├─ DojoRockSanctuary.init()         ← await
            ├─ StylizedRiver.init()             ← await
            ├─ DojoBambooGrove.init()           ← await
            ├─ PlayerEntity.loadModel()         ← await
            ├─ NPCManager.init()                ← await
            ├─ WanderingMonsters.init()         ← await
            ├─ BiomeDecorationManager.init()    ← await
            └─ WorldMapManager.init()           ← sincrónico → llama loadMap() → setZone()
```

> ⚠️ **Regla crítica**: `WorldMapManager.init()` llama internamente a `loadMap()` y `setZone()` de forma **sincrónica**. Si cualquier `await` anterior falla silenciosamente, el juego queda congelado en la pantalla de carga.

---

## 3. Sistemas Implementados (Hitos completados)

### Hito 1 — Motor de Combate Táctico ✅
- Tablero N×M con cuadrícula isométrica y elevaciones
- Sistema de turnos por iniciativa con timeline visual
- Cartas de partes de Axie (Boca, Cuerno, Espalda, Cola) con afinidad elemental
- Fórmulas de daño, estados alterados (Sangrado, Aturdimiento, Escudo, Curación)
- Modelos 3D con animaciones esqueléticas (idle, walk, attack, faint)

### Hito 2 — Overworld Estilizado ✅
- 18,000 briznas de hierba instanciadas con viento GPU (Perlin noise)
- 380 flores procedurales cel-shaded
- Suelo 80×80m con camino SDF (adoquines + transición tierra/pasto sin Z-fighting)
- Árboles estilizados en esquinas con copas esféricas y viento en canopia
- NPC Maestro Paladill (`paladill.glb`) con diálogos dinámicos
- Quimeras errantes con IA de patrulla/alerta, transición a combate

### Hito 3 — 25 Zonas, 5 Biomas, Estructura Dofus ✅
- Macro-cuadrícula 5×5 (25 regiones), centro en Dojo `[3,3]`
- Biomas: 🌲 Bosque (3×3 centro), ❄️ Ártico (norte), 🏜️ Sabana (este), 🔮 Místico (oeste), 🏰 Mazmorra (sur)
- Portales cardinales 3D estilo Dofus en los 4 bordes de cada zona
- Mapa del Mundo interactivo `[M]` con pin del jugador en tiempo real
- Transiciones suaves entre zonas (niebla, iluminación, decoraciones)
- Props específicos por bioma: cactus, palmeras, rocas nevadas, setas místicas, árboles muertos

### Hito 4 — Misiones y NPCs ✅
- Motor de misiones progresivas con estados/objetivos/recompensas
- Diario de Aventuras `[L]` con pergamino animado
- Control estricto de Maestro Paladill: solo aparece en zona `[3,3]`

### Hito 5 — Progresión, Inventario ✅
- Curva de EXP: `round(100 × L^1.35)`
- 4 Atributos: Vitalidad, Ferocidad, Agilidad, Esencia
- Inventario `[I]` con Paper Doll 3×3, tooltip flotante, desequipado en 1 clic

### Hito 6 — Skybox Mágico y Partículas ✅
- Cúpula celeste procedural con sol/luna/estrellas/nubes/auroras reactivos por bioma
- 5 sistemas de partículas ambientales (hojas voladoras, arena, nieve, luciérnagas, brasas)
- Transición cinematográfica entre biomas con smoothstep

### Hito 7 — HUD del Escuadrón ✅
- Marcos heráldicos por clase (Bestia/Pájaro/Planta) con HP, PA, PM en tiempo real
- Reactivo a equipamiento, niveles y cambios de combate

### Hito 8 — Retratos 3D Dinámicos ✅
- `CharacterPortraitService.js`: mini-render offscreen 128×128 por héroe/enemigo
- Integrado en HUD escuadrón, barra de iniciativa y HUD táctico activo

### Sistema de Río Extendido ✅ (última sesión)
- Río pasa por zonas `[3,1] → [3,2] → [3,3] → [3,4] → [3,5]`
- Zona `[3,1]` (Ártico): lago glacial de nacimiento + ripples de manantial
- Zona `[3,5]` (Mazmorra): abismo volcánico terminal
- Puente de piedra transitable al 100% en z=0 (no bloquea el paso)
- Collisiones y waypoints de monstruos adaptados por zona del río
- `StylizedRiver.setZone(zoneId, gx, gy)` controla visibilidad de sub-grupos por zona

### Bambú GPU en zona [3,3] ✅
- `DojoBambooGrove.js`: InstancedMesh unificado (stalk+branches+leaves)
- Solo visible en `[3,3]`, noroeste del prado

---

## 4. Coordenadas y Sistema de Zonas

```
gx = columna (1=oeste ... 5=este)
gy = fila    (1=norte ... 5=sur)

Mapa 5×5:
     gx=1     gx=2     gx=3     gx=4     gx=5
gy=1 ÁRTICO  ÁRTICO   ÁRTICO   ÁRTICO   SABANA
gy=2 MÍSTICO BOSQUE   BOSQUE   BOSQUE   SABANA
gy=3 MÍSTICO BOSQUE   DOJO⚔️  BOSQUE   SABANA
gy=4 MÍSTICO BOSQUE   BOSQUE   BOSQUE   SABANA
gy=5 MÍSTICO MAZMORRA MAZMORRA MAZMORRA MAZMORRA
```

- **Corredor del río**: `gx=3, gy=1..5` (columna 3 completa)
- **Límites físicos**: `minX/maxX: ±38.5`, `minZ/maxZ: ±38.5`
- **Portales**: z=±38m (N/S), x=±38m (E/O), offset de spawn: ±32.5m

---

## 5. Sistemas Clave — Detalles Técnicos

### StylizedTrees.js
- `TREE_LAYOUT[]`: array global que se rellena con `generateTreeLayoutForZone(gx, gy)` → 1-3 árboles por esquina (4 esquinas) = 4-12 árboles por zona
- `load()`: carga `tree-tronk.glb`, `tree-leaves-mesh.glb`, `leaves-alpha-map.png`. Guarda `this.leafLocalCenter`, `this.leafBaseY`, `this.leafHeight` como propiedades de instancia
- `_buildTrees()`: usa `this.leafLocalCenter` etc. (NO variables locales de `load()`)
- `setZone(gx, gy, collisions)`: llama `generateTreeLayoutForZone()` + `_buildTrees()` sincrónicamente
- Biomas especiales: `setSnowAmount(1.0)` (Ártico), `setDualTone(1.0, 0xFCA6B0, 0xB66C8A)` (Místico), `setLeafless(true)` + `setTrunkColor(0x1E1820)` (Mazmorra)

### StylizedTreeVines.js
- Genera hiedra clinging en los troncos usando `TREE_LAYOUT`
- `setZone()` usa `setTimeout(() => _buildVines(), 0)` para no bloquear el hilo principal
- Limitado a 2 vine paths por árbol cuando hay >8 árboles; 4 paths si hay ≤8
- `TubeGeometry` con solo 8 segmentos (no 32) para rendimiento

### StylizedGroundFoliage.js
- Genera follaje en el suelo: 60 instancias por árbol (skirt) + 23 clusters en el meadow
- `load()` se ejecuta una vez al inicio; `setZone()` solo guarda gx/gy (no reconstruye)
- Los clusters del meadow son fijos; el skirt de árbol usa `TREE_LAYOUT` del momento del `load()`

### StylizedRiver.js (~1,450 líneas)
- Función pública: `getRiverCenter(z)` → `{ x, dx }` usada por `PathSDF.js`
- `setZone(zoneId, gx, gy)`: activa/desactiva sub-grupos según la zona del río
- Sub-grupos: `waterfallLakeGroup` (gy=1), `dungeonChasmGroup` (gy=5), `stoneBridgeGroup`, `bridgeGroups.arctic`, `bridgeGroups.dungeon`
- `_registerCollisions()`: colisiones zona-aware (gy=1 ártico, gy=5 mazmorra, else bosque)

### StylizedEnvironment.js
- Coordinador de: Ground, Grass, Flowers, Trees, GroundFoliage, TreeVines
- `setZone(gx, gy, collisions)`: propaga a Trees, GroundFoliage, TreeVines
- `setRiverActive(bool)`: propaga a Ground y Grass (limpia textura del camino sobre el río)

### WorldMapManager.js
- `changeMap(targetMapId, portalDir)`: async, maneja transición de zona
- `loadMap(mapId, spawnOverride)`: sincrónico, llamado desde `init()`
- Ambos llaman `stylizedEnv.setZone()` y `stylizedRiver.setZone()` al cambiar de zona
- `isRiverZone = (gx === 3 && gy >= 1 && gy <= 5)` para activar el río

### MapRegistry.js
- Genera las 25 zonas en un loop
- Waypoints de monstruos: si `gx === 3` (corredor del río) → solo lado este (x ≥ 13)
- Portales: 4 cardinales por zona apuntando hacia afuera

---

## 6. Reglas que DEBE Respetar el Agente

### ❌ NO modificar sin consultar
1. `vendor/three.module.js` — librería principal, no tocar
2. `vendor/GLTFLoader.js` — cargador GLB, no tocar
3. `styles.css` — CSS global de >150KB, modificar solo lo estrictamente necesario
4. `assets/` — carpeta de assets binarios, no borrar ni renombrar archivos existentes
5. `src/tactics/` — sistema de combate táctico estable, no afectar sin motivo
6. `server.js` — servidor HTTP funcional, no modificar

### ⚠️ Reglas de arquitectura
- **Nunca usar `require('three')`** — Three.js es ES Module local en `vendor/`
- **No instalar paquetes npm** — No hay `package.json`. Si necesitas una librería, debe ir en `vendor/`
- **No usar Vite ni ningún bundler** — El proyecto usa importaciones ES Modules nativas del browser
- **El servidor es `node server.js`** en el directorio raíz del proyecto
- **Siempre verificar sintaxis** con el script `scratch/verify_foliage_fix.cjs` o similar antes de declarar una corrección lista
- **`TREE_LAYOUT`** es un array global exportado de `StylizedTrees.js` — múltiples archivos lo importan (`StylizedTreeVines.js`, `StylizedGroundFoliage.js`)
- **Las variables computadas en `load()` deben guardarse como `this.*`** si `_buildTrees()` u otros métodos las necesitan desde `setZone()`

### ✅ Convenciones de código
- Comentarios y mensajes de log en inglés dentro del código
- Comunicación con el usuario **siempre en español**
- Prefijos de log: `[NombreSistema]` (ej: `[StylizedTrees]`, `[DIAG]`)
- Tags de colisión con guiones bajos: `forest_tree_0`, `river_bank`, `arctic_rock_0`

---

## 7. Bugs Conocidos

| Bug | Severidad | Estado | Descripción |
|-----|-----------|--------|-------------|
| `leafLocalCenter` no definida en `setZone()` | 🔴 Crítico | ✅ Corregido | Variables locales de `load()` no accesibles desde métodos externos. Fix: guardar como `this.*` |
| Vines bloqueando hilo principal | 🟡 Medio | ✅ Corregido | `TubeGeometry(curve, 32)` × 80 tubos freeze. Fix: 8 segmentos + máx 2 paths/árbol + `setTimeout` |
| Follaje excesivo (count=145) | 🟡 Medio | ✅ Corregido | 145 instancias/árbol × 20 árboles = 2,900 extras. Fix: reducido a 60 |
| `_buildTrees()` con timeout = invisible | 🟡 Medio | ✅ Corregido | Árbol invisible si se difiere con `setTimeout`. Fix: sincrónicos de nuevo |
| Logs de diagnóstico en `OverworldManager` | 🔵 Info | Pendiente limpiar | Quedan `[DIAG]` console.log temporales que se pueden quitar cuando el juego sea estable |

---

## 8. Funcionalidades Pendientes / Próximos Pasos

### Pendientes de alta prioridad
- [ ] **Limpiar logs `[DIAG]`** de `OverworldManager.js` y `StylizedEnvironment.js` una vez confirmado que el juego carga sin problemas
- [ ] **Contenido de zonas del río** `[3,1]`, `[3,2]`, `[3,4]`, `[3,5]` — actualmente usan el río pero el contenido de quimeras, misiones y POIs es genérico
- [ ] **NPCs zonales** — Paladill solo está en `[3,3]`. Las demás zonas no tienen NPCs únicos con misiones propias

### Pendientes de funcionalidad
- [ ] Sistema de guardado en servidor (actualmente solo `localStorage`)
- [ ] Más tipos de quimeras por bioma (el catálogo `BiomeEnemyCatalog.js` existe pero falta ampliar)
- [ ] Pantalla de selección de Axie conectada a wallet Web3 real (actualmente mock)
- [ ] Más misiones después de la misión inicial del Dojo
- [ ] Sistema de tienda/comercio con NPCs
- [ ] Efectos de sonido ambientales por bioma
- [ ] Más zonas más allá del demo 5×5 (hacia una grilla 7×7 o mayor)

### Mejoras visuales deseadas
- [ ] Sombras dinámicas más detalladas en el río
- [ ] Reflejo del agua animado en `StylizedRiver.js`
- [ ] Follaje de suelo específico por zona (actualmente `StylizedGroundFoliage` no se reconstruye por zona)
- [ ] Cascada real con geometría de agua vertical en `[3,1]`

---

## 9. Decisiones Importantes Tomadas

| Decisión | Razón |
|----------|-------|
| Three.js como archivo local (`vendor/`) | Evita dependencia de CDN, funciona offline, control de versión |
| No usar Vite/Webpack | Simplicidad máxima. El browser soporta ES Modules nativamente |
| Servidor Node.js propio (`server.js`) | Control de headers CORS y MIME types para `.glb`, `.webp` |
| Un solo `index.html` para todo | El juego completo (combate + overworld) en una sola página SPA |
| `TREE_LAYOUT` como array global | Permite que Vines y GroundFoliage accedan sin pasar referencias |
| `setZone()` en Trees es sincrónico | Los árboles DEBEN aparecer en el mismo frame que el cambio de zona |
| `setZone()` en Vines es diferido (`setTimeout`) | Los tubos de hiedra son costosos; 1 frame de delay es aceptable |
| Río en columna 3 completa (`gx=3, gy=1..5`) | Consistencia visual del corredor acuático norte-sur de Lunacia |
| Puente siempre transitable en z=0 | El jugador no puede quedar atrapado; la colisión del río no cubre z=0 |

---

## 10. Estado Actual del Juego (2026-09-19)

### ✅ Lo que funciona
- El juego **carga correctamente** después del fix de `leafLocalCenter`
- Los 5 biomas son visitables con transiciones fluidas
- El río pasa por toda la columna 3 (zonas `[3,1]` a `[3,5]`)
- Los árboles procedurales se generan y son visibles al cargar cada zona
- El bambú del Dojo `[3,3]` es visible
- Maestro Paladill en el Dojo con diálogos
- Combate táctico por turnos funcional
- Sistema de misiones y progresión de EXP
- HUD del escuadrón con retratos 3D
- Mapa del mundo `[M]` con pin del jugador

### ⚠️ Cosas a verificar
- Los árboles procedurales se ven correctamente en TODAS las zonas (no solo en `[3,3]`)
- Las vines de hiedra aparecen unidas a los troncos (no flotando solas)
- El río se ve correctamente en `[3,1]`, `[3,2]`, `[3,4]`, `[3,5]`

---

## 11. Cómo Arrancar el Servidor

```bash
# Desde la raíz del proyecto:
node server.js

# El juego estará disponible en:
# http://127.0.0.1:8081
```

Para scripts de diagnóstico (Node.js, no browser):
```bash
node scratch/verify_foliage_fix.cjs
```

---

## 12. Lo Que Se Estaba Haciendo en los Últimos Turnos

### Sesión reciente (2026-09-19)

**Problemas reportados por el usuario:**
1. ❌ Roca flotante en zona `[3,1]` → eliminada
2. ❌ Altura del puente incorrecta en `[3,1]` → ajustada al nivel del suelo
3. ❌ Defecto visual en bordes del río (textura/iluminación) → follaje de suelo/flores/rocas añadidos
4. ❌ Follaje verde pasto aparecía sobre el camino → eliminado del corredor del camino
5. ✅ Bambú GPU probado y ajustado en `[3,3]`
6. ✅ Río extendido de `[3,1]` a `[3,5]` completo
7. ❌ Roca/plano rectangular en cascada `[3,1]` → eliminado
8. ❌ Agujero entre roca y límite norte `[3,1]` → sellado con rocas extra hasta z=-38
9. 🔴 **Freeze al cargar el mundo** después de cambios del usuario en follaje/árboles

**Fix del freeze (causa raíz):**
- El usuario cambió `count = 145` instancias de follaje (era ~58)
- El usuario cambió árboles de fijos a `1-5 aleatorios por esquina` → hasta 20 árboles
- Con 20 árboles × 4 vine paths × 32 segmentos TubeGeometry = 80 tubos en el hilo principal → freeze
- **Fixes aplicados:**
  1. `StylizedTrees.js`: máx 3 árboles por esquina (no 5)
  2. `StylizedGroundFoliage.js`: 60 instancias/árbol (no 145)
  3. `StylizedTreeVines.js`: 8 segmentos (no 32) + máx 2 paths si >8 árboles + `setTimeout`
  4. `StylizedTrees.js`: `leafLocalCenter`, `leafBaseY`, `leafHeight` como `this.*` (fix del `ReferenceError`)

### Actualizaciones de Héroes, Visuales e Iconos de Habilidades (2026-09-20)
1. **Nuevo Axie Bestia Shinji (#10455)**:
   - Sustituido el antiguo Axie Bestia #11968787 por el ID #10455 bautizado como **Shinji**.
   - Retrato local renderizado en `assets/portraits/shinji.png` e integrado en `SaveSlotManager.js`, `EquipmentManager.js`, `PlayerEntity.js`, etc.
2. **Textura de Suelo Estilizada de Bosque**:
   - Generada textura seamless de alta calidad `assets/stylized/grass_texture/forest_ground_1k.png` (junto con normal y roughness maps).
   - Integrada en `StylizedGround.js`, `StylizedEnvironment.js` y `BiomeThemeManager.js`.
3. **Nuevos Iconos de Habilidades para Héroes y Aliados**:
   - Copiados los iconos desde `D:\Proyectos Unity\assets\Icon Skill Heroes` a `assets/skills/heroes/`:
     - **Shinji**: `assets/skills/heroes/shinji/1.png`, `2.png`, `3.png` (`kotaro_slash`, `kotaro_push`, `kotaro_jump`)
     - **Early Bird**: `assets/skills/heroes/early-bird/1.png`, `2.png`, `3.png` (`bird_cupid`, `bird_owl`, `bird_aerial_jump`)
     - **Big Yak**: `assets/skills/heroes/big-yak/1.png`, `2.png`, `3.png` (`plant_cactus`, `plant_drain`, `plant_shield`)
     - **Bing**: `assets/skills/heroes/bing/1.png`, `2.png`, `3.png` (`bing_explosive`, `bing_retreat`, `bing_slow`)
     - **Pomodoro**: `assets/skills/heroes/pomodoro/1.png`, `2.png`, `3.png` (`pomodoro_heal`, `pomodoro_stim`, `pomodoro_bramble`)
   - Mapeados en `src/tactics/Spells.js` (`SPELLS_DB`), `SaveSlotManager.js` (`HERO_ROSTER`), y en la pantalla de selección de héroes `StartScreenUI.js`. Se renderizan automáticamente en el HUD táctico y la pestaña de Habilidades de `InventoryModal.js`.
4. **Modelo 3D del Templo Dojo en Zona [3, 3] (`stylized_dojo.glb`)**:
   - Copiado `stylized_dojo.glb` a `assets/models/stylized_dojo.glb`.
   - Creado `src/rpg/world/DojoBuilding.js` para normalizar el modelo, aplicar sombras PBR y colisiones sólidas.
   - Posicionado en la pradera occidental (`x: -10.5, y: -0.22, z: -15.5`, escala `2.9`, rotación `Math.PI * 0.5`), dejando el camino de piedra libre y hundiendo ligeramente los pilares de madera (`y: -0.22`) para que asienten firmemente en el terreno.
   - Integrado en `OverworldManager.js` y `WorldMapManager.js` para que sea exclusivo de la macro-zona `[3, 3]`.
   - Reajustadas las rocas del santuario en `DojoRockSanctuary.js`: la roca monolítica actúa de cordillera trasera (`x: -11.5, z: -25.5`), la roca de entrada se apartó a `x: -5.0, z: -10.5` junto al camino, y la formación de 3 rocas frontales (`Rock1_4`, `Rock3_2`, `Rock2_4`) se trasladó al claro suroeste (`x: -20.5, z: -3.0`) despejando la entrada principal del dojo.
   - Maestro Paladill reubicado al patio frontal del dojo (`x: -14.5, y: 0.0, z: -8.5`), junto a las escaleras del templo, con su pedestal, aura dorada y colisiones actualizadas en `NPCManager.js`, `OverworldManager.js` y `MapRegistry.js`.
   - Expuesto helper interactivo `window.__dojoBuilding` en consola (`setPosition`, `setScale`, `setRotationY`).

---

## 13. Instrucciones para Continuar el Desarrollo

### Antes de hacer cualquier cambio
1. Arrancar el servidor: `node server.js`
2. Verificar que el juego carga en `http://127.0.0.1:8081`
3. Abrir F12 → Console para ver errores
4. Leer los archivos relevantes antes de modificar

### Para añadir contenido a una zona específica
- Las zonas se definen en `src/rpg/world/MapRegistry.js`
- El contenido visual por bioma está en `src/rpg/world/BiomeDecorationManager.js`
- Los NPCs específicos de zona están en `src/rpg/NPCManager.js`
- Las misiones están en `src/rpg/QuestManager.js`

### Para modificar el entorno visual
- El sistema de árboles: `StylizedTrees.js` + `StylizedTreeVines.js`
- El suelo/camino/río: `StylizedGround.js`, `PathSDF.js`, `StylizedRiver.js`
- El follaje: `StylizedGroundFoliage.js`, `StylizedGrass.js`, `StylizedFlowers.js`
- Coordinar cambios: `StylizedEnvironment.js` (coordinator)

### Para cambiar la lógica de zonas
- `WorldMapManager.js`: cambio de zona, portales, carga inicial
- `MapRegistry.js`: definición de zonas, portales, waypoints
- `BiomeThemeManager.js`: iluminación y niebla por bioma

### Para depurar un freeze al cargar
1. Añadir logs `[DIAG]` temporales en `OverworldManager.init()` antes de cada `await`
2. Ver el último `[DIAG]` en consola antes del freeze = sistema problemático
3. El patrón más común: un `load()` async que tiene variables locales que luego usa `setZone()` → **siempre guardar como `this.*`**

### Verificación de sintaxis (sin browser)
```bash
node scratch/verify_foliage_fix.cjs
```

---

## 14. Referencia Rápida de Archivos por Tema

| Tema | Archivos principales |
|------|---------------------|
| Combate táctico | `src/main.js`, `src/tactics/` |
| Director del mundo | `src/rpg/OverworldManager.js` |
| Héroe y movimiento | `PlayerEntity.js`, `PlayerController.js` |
| Zonas y portales | `MapRegistry.js`, `WorldMapManager.js`, `ZoneTransitionManager.js` |
| Biomas visuales | `BiomeThemeManager.js`, `BiomeDecorationManager.js` |
| Río animado | `StylizedRiver.js` |
| Árboles + Vines | `StylizedTrees.js`, `StylizedTreeVines.js` |
| Suelo + Camino | `StylizedGround.js`, `PathSDF.js` |
| Hierba y flores | `StylizedGrass.js`, `StylizedFlowers.js` |
| Skybox + Partículas | `MagicalSkybox.js`, `ZoneParticleManager.js` |
| NPCs y diálogos | `NPCManager.js`, `DialogSystem.js` |
| Misiones | `QuestManager.js` |
| Bambú | `DojoBambooGrove.js` |
| Rocas del Dojo | `DojoRockSanctuary.js` |
| Edificio Pagoda Dojo | `DojoBuilding.js` |
| Colisiones Overworld | `OverworldCollisions.js` (repulsión continua iterativa y deslizamiento suave) |
| HUD escuadrón | `src/rpg/ui/SquadHUD.js` |
| Retratos 3D | `src/tactics/CharacterPortraitService.js` |
| Guardado | `SaveSlotManager.js` |
| Bloqueo UI en Combate | En `body.state-combat`, el Mapa (`M`), Inventario (`I`) y Misiones (`J`/`L`) están bloqueados a nivel de input, métodos `open/toggle` y CSS (`display: none !important`). |
| Naturaleza Bioma Bosque (9 macro-zonas) | `src/rpg/world/ForestNatureManager.js` (cubre las 9 macro-zonas [2,2]..[4,4]: pinos `Pine_1..3`, rocas medianas `Rock_Medium_1..3` con colisiones físicas, arbustos `Bush_Common_Flowers` y `Bush_Common`, setas `Mushroom_Common` y `Mushroom_Laetiporus`, flores `Flower_3/4_Group`, helechos `Fern_1`, pétalos `Petal_1..2` y guijarros `Pebble_Round_1..5` y `Pebble_Square_1..2`). |
| Árboles Multicolores del Bosque | `StylizedTrees.js` (soporte de variantes `maple_red` [arce rojo japonés], `golden` [abedul dorado] y `green` [verde exuberante] distribuidos armoniosamente en todas las zonas del bosque). |
| Ribera del Río y Tréboles | `StylizedRiver.js` (remplazo de flores por tréboles instanciados `Clover_1` y `Clover_2` con shader de viento), `StylizedFlowers.js` (corredor de despeje de 5.2m). |
| Estanque del Dojo [3,3] | `src/rpg/stylized/StylizedPond.js` (estanque estilizado en `[-30.3, 12.0]` con depresión física de suelo a -0.78m en `StylizedGround.js`, agua translúcida a -0.36m con espuma y reflejos solares, borde denso de rocas `Pebble_Round_1..5` y boulders, rocas y guijarros sumergidos en el lecho interior, sombras animadas de peces nadando con aleteo de cola y tréboles de ribera). |
| NPC Xia | En `MapRegistry.js`, ubicada en `[-21.2, 16.4]` con modelo `xia.glb`, animación Idle activa, nombre "Xia" y delineado estilizado cartoon toon outline (`ToonOutline.js`). |



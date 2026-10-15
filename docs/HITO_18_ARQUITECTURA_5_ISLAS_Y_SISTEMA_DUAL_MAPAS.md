# Hito 18: Arquitectura de las 5 Grandes Islas, Sistema Dual de Mapas y Minimapa Radar

> [!IMPORTANT]
> **Estado actual (13-oct-2026):** las 5 islas ya están construidas (Hitos 20, 22 y 23). Además del botón “⛵ Viajar a …” del mapa `[M]`, ahora se viaja hablando con el barquero Pomodoro en la playa de cada isla (sección 6). Los portales cardinales se retiraron.


> **Fecha de implementación:** Octubre 2026  
> **Estado:** Completado y Verificado en Producción  
> **Módulos clave:** `MapRegistry.js`, `WorldMapModal.js`, `MinimapHUD.js`, `PlayerEntity.js`

---

## 1. Visión General

El Hito 18 reestructura la geografía mundial de Lunakai, sustituyendo la cuadrícula rígida de macro-zonas por un archipiélago de **5 Grandes Islas Bioma**. Adicionalmente, implementa una interfaz integral de navegación compuesta por un **Modal de Mapas Dual** (Mapa Mundi y Mapa de la Isla) y un **Minimapa Radar en Pantalla** con orientación angular en tiempo real.

---

## 2. Distribución Geográfica de las 5 Grandes Islas

El mundo se organiza en un esquema cruciforme cardinal:

```
                      [ NORTE ]
                 ❄️ Isla del Ártico
                   (Nivel 4 - 6)
                         |
  [ OESTE ]              |              [ ESTE ]
🔮 Isla Mística --- 🌲 Isla del Bosque --- 🏜️ Isla de la Sabana
  (Nivel 7 - 9)       (Nivel 1 - Demo)     (Nivel 1 - 3)
                         |
                         |
                 🌋 Isla de la Mazmorra
                   (Nivel > 10)
                      [ SUR ]
```

### Características de las Islas y Puntos de Interés (3 POIs por Isla)
1. **🌲 Isla del Bosque (Centro - Nivel 1):**
   * *🥋 Valle del Dojō:* Centro de entrenamiento marcial y dojo del Maestro Paladill.
   * *🌳 Gran Árbol Ancestral de Atia:* Monumento natural místico que irradia bendición y vida.
   * *🏛️ Santuario del Portal Antiguo:* Monolitos flotantes y portal ancestral de teletransporte.
2. **🏜️ Isla de la Sabana (Este - Nivel 1 - 3):**
   * *☀️ Desierto del Sol Naciente:* Inmensas dunas doradas patrulladas por centinelas nómadas.
   * *🏹 Campamento de Bing:* Refugio del arquero alado y sus aprendices nómadas.
   * *🔨 Fragua Nómada de Baruk:* Gran herrería del cañón forjando acero de Atia.
3. **❄️ Isla del Ártico (Norte - Nivel 4 - 6):**
   * *🏔️ Valle de la Escarcha Eterna:* Santuario congelado resguardado por tótems sagrados.
   * *🌱 Invernadero de Pomodoro:* Refugio botánico aclimatado contra las ventiscas polares.
   * *🍲 Campamento de Cocina Boreal:* Puesto de provisiones y estofado de nieve.
4. **🔮 Isla Mística (Oeste - Nivel 7 - 9):**
   * *✨ Santuario del Vacío Astral:* Monolitos celestes que resuenan con las constelaciones.
   * *🌌 Nebulosa de Lunacia:* Fisura arcana de polvo estelar y tiempo distorsionado.
   * *🔮 Observatorio del Oráculo:* Torre de contemplación cósmica y profecías estelares.
5. **🌋 Isla de la Mazmorra / Lunar Volcánica (Sur - Nivel > 10):**
   * *🌋 Caldera de Magma:* Epicentro volcánico activo sobre ríos de lava y azufre.
   * *🌑 Cráter de la Cripta Lunar:* Cuenca de impacto cósmica y catacumbas ancestrales.
   * *🏰 Fortaleza de las Sombras:* Cámara volcánica suprema y combate definitivo de Lunacia.

> **Acceso Libre:** Todas las islas se encuentran desbloqueadas desde el comienzo del juego sin candados ni requisitos de nivel restrictivos.

---

## 3. Sistema Dual de Mapas (`WorldMapModal.js`)

Se diseñó una ventana modal accesible mediante la tecla `[M]` con dos modos de visualización:

1. **Pestaña Mapa Mundi:**
   * Cuadrícula interactiva con la disposición cardinal de las 5 islas.
   * Tarjetas con icono del bioma, nombre, nivel recomendado y estado.
   * Panel lateral con descripción del bioma y lista de los 3 puntos de interés destacados.
2. **Pestaña Mapa de la Isla:**
   * Renderizado en canvas 2D de alta resolución de la isla activa.
   * Topografía, caminos empedrados, río continuo y puentes.
   * Marcadores con chinchetas e iconos representativos para los 3 POIs principales.
   * Indicador del jugador en tiempo real con cono de visión giratorio.
   * **Restricción Contextual:** El botón *"🏝️ Ver Mapa de la Isla"* solo aparece disponible cuando se inspecciona la isla en la que el jugador se encuentra físicamente (Isla del Bosque).

---

## 4. Minimapa Radar en Pantalla (`MinimapHUD.js`)

* **HUD Circular Flotante:** Radar estilizado en la esquina superior derecha con borde dorado, rosa de los vientos (Norte) y radar de POIs cercanos.
* **Rotación Dinámica de Orientación:**
  * Implementación del ángulo de visión en tiempo real: `canvasHeading = Math.atan2(Math.cos(yaw), Math.sin(yaw))`.
  * La flecha y el cono de visión rotan de forma suave e instantánea al girar la cámara o el personaje, eliminando el fallo donde la flecha quedaba fija mirando hacia arriba.

---

## 6. Actualización (13-oct-2026): viaje en barca con Pomodoro

* **Sin portales:** `WorldMapManager` llama a `setPortals({})`, así que ya no se crean anillos ni flechas cardinales.
* **Barquero `ferry_pomodoro`:**
  * usa el modelo `pomodoro.glb` y no tiene `heroId`, así que sigue en su sitio después de reclutar a Pomodoro;
  * está en la playa de cada isla (`FERRY_DOCKS` en `world/islands/IslandWorldLayout.js`).

  | Isla | Barquero (x, z) | Llegada del jugador (x, z) |
  | :--- | :---: | :---: |
  | 🌲 Bosque | (43, 132.2) | (40, 126) |
  | 🏜️ Sabana | (−133, 42), al pie de la rampa A | (−126, 42) |
  | ❄️ Ártico | (14.3, 136.2) | (5, 120) |
  | 🔮 Mística | (136, 14) | (128, 8) |
  | 🌋 Mazmorra | (136, 18) | (130, 22) |

* **Selector (`ui/FerryTravelUI.js`):**
  * lista las 5 islas y marca la actual (“📍 Estás aquí”);
  * viaja con el mismo telón de carga de los cambios de zona;
  * se cierra con `Esc` y bloquea la entrada del jugador mientras está abierto (`#ferry-travel-modal` en `isAnyModalOpen`).
* **Tutorial:** mientras los portales siguen bloqueados por el tutorial, Pomodoro responde que aún no se puede zarpar.
* **Brújula de misión:** si el objetivo está en otra isla, apunta al barquero (“⛵ Habla con Pomodoro en la playa ➔ Isla …”).
* **Botón del mapa `[M]`:** “⛵ Viajar a …” sigue disponible y lleva al mismo punto de llegada.


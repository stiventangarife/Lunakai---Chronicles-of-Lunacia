# Hito 08: Generador Dinámico de Retratos 3D para HUD de Escuadrón y Barra de Iniciativa

## 1. Visión y Objetivos
Sustituir los emojis y representaciones textuales genéricas (`⚔️`, `🏹`, `🌱`, `🥊`, etc.) tanto en el **HUD del Escuadrón del Mundo Abierto** como en la **Barra de Iniciativa de Combate (`#initiative-timeline`)** y el **HUD Táctico del Personaje Activo (`#unit-avatar`)**, utilizando capturas 3D en tiempo real generadas dinámicamente mediante Three.js (**Opción B**).

Esta opción garantiza que en el futuro, cuando los jugadores conecten sus billeteras Web3 con cualquier Axie personalizado o con partes únicas, el juego genere automáticamente su miniatura 3D sin requerir imágenes estáticas precargadas.

---

## 2. Componentes Implementados

### 2.1. `CharacterPortraitService` (`src/tactics/CharacterPortraitService.js`)
Servicio singleton que administra un mini-estudio de renderizado 3D fuera de pantalla:
- **WebGLRenderer Offscreen**: Lienzo de 128x128 píxeles con fondo transparente (`alpha: true`), preservando el color sRGB.
- **Set de Iluminación de Retrato**:
  - Luz ambiental (`0xffffff`, intensidad `1.3`) para claridad general.
  - Luz direccional frontal/superior (`0xffffff`, intensidad `1.8`) para realzar volúmenes y reflejos.
  - Rim light suave en tono celeste (`0x93c5fd`, intensidad `0.9`) para perfilar la silueta y separar el personaje del fondo oscuro de la interfaz.
- **Carga Limpia de Modelos GLTF**:
  - Evita el problema de deformación de `SkinnedMesh` ocasionado por `clone(true)` en Three.js sin recreación de esqueleto. Carga asíncronamente una instancia limpia del GLTF a través de `GLTFLoader.loadAsync()`.
  - Los GLTF se obtienen instantáneamente de la caché HTTP del navegador.
- **Normalización y Encuadre**:
  - Centra el modelo en el origen `(0, 0, 0)` usando `THREE.Box3`.
  - Escala la altura al rango visual idóneo (`~1.25` unidades para Axies, `~1.05` para Slimes, `0.018` para zorros).
  - Orienta la cámara y el modelo con rotación suave en Y (`-0.28 rad`) y X (`0.08 rad`) para obtener un ángulo heroico 3/4.
- **Caché y Notificación Reactiva**:
  - Almacena el resultado en un `Map<string, string>` con formato Data URL Base64 (`image/png`).
  - Provee `getPortraitSync(id)` para consumo síncrono inmediato si ya existe en caché.
  - Provee `addListener(fn)` para notificar a observadores tan pronto como se genera un nuevo retrato.

### 2.2. Integración en `SquadHUD` (`src/rpg/ui/SquadHUD.js`)
- En lugar del emoji textual, la tarjeta del héroe renderiza `<img class="squad-avatar-img" src="...">`.
- Se suscribe al `portraitService` para actualizar dinámicamente el `src` al completar la carga.
- Mantiene los marcos heráldicos de clase:
  - **Bestia (Kotaro)**: Marco en rombo dorado con gema de topacio y badge de nivel.
  - **Pájaro (Bing)**: Marco en rombo cian con gema de zafiro y badge de nivel.
  - **Planta (Pomodoro)**: Marco en rombo esmeralda con gema de jade y badge de nivel.

### 2.3. Integración en Turnos de Combate (`src/main.js`)
- **Barra de Iniciativa (`#initiative-timeline`)**:
  - Cada tarjeta de combatiente en la cola de turnos incluye la imagen `<img class="timeline-avatar-img">`.
  - Aplica tanto a héroes aliados como a enemigos (Quimera Guardián Buba, Quimera Slime, etc.).
- **HUD Táctico Activo (`#unit-avatar`)**:
  - El retrato circular de la unidad cuyo turno está activo se actualiza con `<img class="tactical-hud-avatar-img">`.
- **Tarjeta de Presentación del Héroe**:
  - La ventana de bienvenida e introducción del héroe en el Dojo muestra la miniatura 3D en su marco circular superior.

### 2.4. Estilos Visuales (`styles.css`)
- `.squad-avatar-img`: Tamaño 36x36px, `object-fit: contain`, sombra `drop-shadow(0 2px 5px rgba(0, 0, 0, 0.75))`, animación de escala (`scale(1.14)`) en `:hover`.
- `.timeline-avatar-img`: Tamaño 28x28px, `object-fit: contain`, sombra de alto contraste.
- `.tactical-hud-avatar-img`: Tamaño 46x46px, encuadre circular con `overflow: hidden`.

---

## 3. Verificación y Resultados
Se ejecutaron pruebas automatizadas completas vía CDP (`scratch/verify_dynamic_portraits.cjs`):
- Verificación de renderizado de Kotaro, Bing y Pomodoro en el HUD del Escuadrón con generación de Base64 válida (>11 KB cada una).
- Verificación en combate táctico de Kotaro, Quimera Guardián y Quimera Slime en la barra de iniciativa y HUD de unidad activa.
- Confirmación visual de nitidez, pose y compatibilidad en navegadores modernos.

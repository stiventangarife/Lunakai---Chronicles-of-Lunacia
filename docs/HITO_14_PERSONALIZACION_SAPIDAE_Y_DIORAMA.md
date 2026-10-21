# Hito 14: Estudio de Personalización Sapidae estilo Dofus, Diorama 3D en Tiempo Real y Selector de Héroe/Compañero

> **Estado:** Completado y Verificado ✅  
> **Actualización (21-oct-2026):** el panel de apariencia del estudio usa ahora los modelos **Ema y Kai** de piezas A–E (peinados, ojos, bocas y colores con imagen en cada opción). Ver `HITO_47_SAPIDAE_EMA_KAI.md`. Lo que sigue describe el estudio original con los modelos `sapidae-f-*` / `sapidae-m-*`, que hoy solo usan los NPC.  
> **Área:** UI / UX / Modelado 3D / Personalización Procedimental / Three.js / Localización  
> **Archivos Involucrados:**  
> - `src/rpg/ui/StartScreenUI.js`  
> - `src/rpg/ui/CharacterPreviewDiorama.js`  
> - `src/rpg/SapidaeModularController.js`  
> - `src/rpg/SaveSlotManager.js`  
> - `styles.css`  

---

## 1. Objetivos del Hito

Diseñar e implementar un **Estudio de Personalización de Personaje** inmersivo y profesional, inspirado en la dirección de arte y ergonomía de *Dofus* y *Wakfu*. El sistema permite al jugador moldear su avatar humanoide **Sapidae** (género, peinado, forma de ojos, cornamenta ancestral, paletas de colores RGB y vestimenta), elegir su **Clase de Sapidae** con previsualización táctica de estadísticas y 6 hechizos, y seleccionar su **Compañero Axie 3D** inicial, todo visualizado en un **Diorama 3D interactivo en tiempo real**. Asimismo, se internacionalizó la interfaz al inglés para ofrecer una experiencia limpia y libre de textos residuales.

---

## 2. Estudio de Personalización en 3 Columnas (Estilo Dofus)

La interfaz de creación de personaje (`.dofus-studio-modal`) está organizada en un layout ergonómico de 3 paneles principales:

### 2.1 Columna Izquierda: Clases y Arquetipos Sapidae
- **Píldoras de Clase (`.dofus-class-pill`)**:
  - **Forjacubiles (Crafter)**: Maestro de la artesanía ancestral; soporte táctico, escudos y estructuras.
  - **Pastor de Estrellas (Shepard)**: Domador astral; combate con bastón, curaciones y auras.
  - **Lunalogista (Lunalogist)**: Erudito rúnico; daño elemental a distancia y trampas arcanas.
  - **Astromante (Stargazer)**: Manipulador cósmico; daño masivo en área y teletransportación.
- **Ficha Técnica de Clase**: Muestra puntos de vida (`HP`), puntos de acción (`AP`), puntos de movimiento (`MP`), e iniciativa (`INIT`).
- **Fila de Hechizos de Clase (6)**: Marcos de iconos con previsualización táctica mediante tooltips flotantes al pasar el cursor (`_showSkillTooltip`).
- **Selector de Compañero Axie**: Tarjetas interactivas con retrato, nombre y clase de Shinji (Beast), Early Bird (Bird) y Big Yak (Plant).

### 2.2 Columna Central: Escenario Diorama 3D Interactivo
- Administrado por `CharacterPreviewDiorama.js`.
- Renderiza simultáneamente en un canvas Three.js dedicado:
  - **Pedestal Estilizado**: Plataforma circular de piedra/madera con runas luminosas.
  - **Avatar Sapidae 3D**: Modelo humanoide con animaciones de idle, responsive a cada cambio de peinado, ojos, cuernos y colores.
  - **Compañero Axie 3D**: Modelo oficial del Axie seleccionado acompañando al avatar con animación continua.
  - **Controles de Rotación (`[⟲] [⟳]`)**: Botones para rotar la plataforma en 360 grados y apreciar el diseño desde cualquier ángulo.
  - **Insignia Superior**: Retrato circular y nombre de la clase seleccionada con borde dorado y resplandor.

### 2.3 Columna Derecha: Rasgos Modulares y Paleta de Colores
- **Selector de Género / Modelo Base**: Alternancia inmediata entre `sapidae_male.glb` y `sapidae_female.glb`.
- **Peinados (Hair Styles)**:
  - Opciones con previsualización en tarjetas SVG: *Braids* (Trenzas), *Short Crop* (Corto), *Spiky* (Puntiagudo), *Wild* (Salvaje).
- **Forma de Ojos (Eye Gaze)**:
  - Opciones estilizadas: *Wide* (Abiertos), *Determined* (Decididos), *Fierce* (Feroces), *Narrow* (Concentrados).
- **Cornamenta Ancestral Sapidae (Horns)**:
  - Variantes: *Antlers* (Ramificados), *Ram* (Carnero), *Curved* (Curvados), *Spike* (Picos).
- **Selector Intuitivo de Colores RGB + Muestrario Rápido**:
  - Control de color para cabello, pupilas, cornamenta y atuendo base (`Robe Color`).
  - Paleta de muestras rápidas + botón nativo de selección de color hexadecimal RGB (`input[type="color"]`).
  - Botón **"Original / Base Texture"** en la túnica para restaurar la textura original pintada a mano del modelo 3D sin tinte forzado.
- **Nombre del Personaje**: Entrada de texto con botón de dado aleatorio (`🎲`) para generar nombres de fantasía acordes a Lunacia (*Ema, Lunara, Vael, Zephyr, etc.*).
- **Botón "Randomize All" (🎲)**: Genera combinaciones aleatorias estéticas instantáneas.

---

## 3. Arquitectura del Controlador Modular (`SapidaeModularController.js`)

Para lograr que los modelos GLB respondan dinámicamente a la personalización sin sobrecargar memoria ni requerir múltiples modelos completos:
- **Separación de Mallas y Huesos**: El controlador localiza los nodos de malla correspondientes al cabello, cuernos, iris y cuerpo.
- **Tinte Shader y Material Clonado**: Los materiales se clonan de forma aislada para no afectar otras instancias, modificando propiedades como `material.color` y canales de emisión.
- **Preservación de Textura Base**: El material del traje mantiene un toggle entre `map` original puro o multiplicación de tinte, permitiendo volver a la apariencia de tela original con un solo clic.

---

## 4. Localización y Ergonomía Visual

- Todos los títulos, etiquetas y textos del modal de personalización fueron traducidos al inglés estándar de videojuegos:
  - `"CHOOSE CLASS"`, `"CLASS DETAILS"`, `"CLASS SPELLS"`, `"COMPANION AXIE"`.
  - `"GENDER / BASE MODEL"`, `"HAIR STYLE"`, `"EYES & GAZE"`, `"SAPIDAE HORNS"`, `"OUTFIT COLOR"`, `"CHARACTER NAME"`.
  - `"Base Texture"`, `"Original"`, `"Reset"`, `"START ADVENTURE"`.
- Estilos visuales pulidos con sombras profundas, bordes esmeralda y dorados, micro-interacciones de hover y fuentes optimizadas.

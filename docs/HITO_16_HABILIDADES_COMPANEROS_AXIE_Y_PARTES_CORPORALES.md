# Hito 16: Sistema de 6 Habilidades para Compañeros Axie, Partes Corporales Oficiales e Ilustraciones Dedicadas

> **Estado:** Completado y Verificado ✅  
> **Área:** Motor Táctico / Habilidades (Spells) / UI Estudio / Metadatos de Axie / Assets Visuales  
> **Archivos Involucrados:**  
> - `src/rpg/SaveSlotManager.js`  
> - `src/tactics/Spells.js`  
> - `src/rpg/ui/StartScreenUI.js`  
> - `styles.css`  
> - `assets/parts/`  
> - `assets/skills/heroes/`  

---

## 1. Objetivos del Hito

Completar el conjunto táctico de los **Compañeros Axie** elevando su repertorio de 3 a **6 habilidades completas** por héroe (Shinji, Early Bird y Big Yak), tanto en el catálogo del motor de combate como en la interfaz de selección del juego. Asimismo, asociar cada una de las 6 habilidades a las **6 partes corporales oficiales de Axie Infinity** con sus correspondientes medallas e iconos en las tarjetas, enriquecer los tooltips tácticos y corregir las repeticiones de ilustraciones causadas por fallos en rutas de archivos (`.webp` vs `.png`).

---

## 2. Mapeo de las 6 Partes Corporales del Axie

En la mitología de *Axie Infinity*, cada Axie posee exactamente 6 partes anatómicas. Se estableció un mapeo estricto del 1 al 6 con los iconos de medallas oficiales ubicados en `assets/parts/`:

| Ranura | Parte del Axie | Icono Oficial en Disco | Nombre en Tooltip / Meta |
| :---: | :---: | :--- | :--- |
| **1** | **Eyes (Ojos)** | `assets/parts/beast-eyes.png` | `EYES` |
| **2** | **Ears (Orejas)** | `assets/parts/beast-ears.png` | `EARS` |
| **3** | **Mouth (Boca)** | `assets/parts/beast-mouth.png` | `MOUTH` |
| **4** | **Horn (Cuerno)** | `assets/parts/beast-horn.png` | `HORN` |
| **5** | **Back (Espalda)** | `assets/parts/beast-back.png` | `BACK` |
| **6** | **Tail (Cola)** | `assets/parts/beast-tail.png` | `TAIL` |

> [!NOTE]
> Este sistema de medallas es **exclusivo para los Axies**. Las habilidades de las clases de Sapidae (Forjacubiles, Pastor de Estrellas, etc.) se mantienen limpias sin marcas corporales, preservando la coherencia del lore.

---

## 3. Repertorio Completo de Habilidades por Compañero

Cada habilidad fue configurada con balance competitivo (coste en Puntos de Acción `AP`, alcance en casillas, tipo de efecto y daño/escudo) tanto en `HERO_ROSTER` (`SaveSlotManager.js`) como en `SPELLS_DB` (`Spells.js`):

### 3.1 Shinji (Beast Lunakai - Melee Duelist)
1. **Fierce Strike** (Eyes): Ataque cuerpo a cuerpo feroz. Inflige 65-80 de daño físico directo (3 AP).
2. **Knockback Rush** (Ears): Embestida que inflige 25-35 de daño y empuja al enemigo 2 casillas (2 AP).
3. **Tactical Jump** (Mouth): Salto acrobático que supera obstáculos, otorga +40 de Escudo y 25 de daño en caída (3 AP).
4. **Mordisco Bestial** (Horn): Mordisco desgarrador que causa 45-58 de daño y reduce la defensa rival (2 AP).
5. **Rugido Territorial** (Back): Aura que otorga +1 PM y +25 de Escudo protector a aliados cercanos (2 AP).
6. **Furia Lunar** (Tail): Golpe definitivo que asesta 85-110 de daño letal con probabilidad de crítico (4 AP).

### 3.2 Early Bird (Bird Lunakai - Swift Marksman)
1. **Cupid's Arrow** (Eyes): Disparo perforante de largo alcance (1-4 casillas) con 70-85 de daño (3 AP).
2. **Owl Gaze** (Ears): Ataque certero (1-3 casillas) que inflige 35-45 de daño y otorga +1 PM (2 AP).
3. **Aerial Jump** (Mouth): Planeo sobre obstáculos con +30 de Escudo y 25 de daño en cruz al aterrizar (3 AP).
4. **Lluvia de Plumas** (Horn): Ráfaga de proyectiles en área causando 42-55 de daño a todos los enemigos (3 AP).
5. **Viento de Cola** (Back): Corrientes favorables que conceden +2 PM inmediatos y +20 de Escudo a un aliado (2 AP).
6. **Picado Celestial** (Tail): Picado terminal desde las nubes infligiendo 80-105 de daño y aturdiendo al objetivo (-1 PA) (4 AP).

### 3.3 Big Yak (Plant Lunakai - Guardian Tank)
1. **Cactus Strike** (Eyes): Pesado golpe espinoso que inflige 65-80 de daño físico y desgarra armaduras (3 AP).
2. **Zigzag Bite** (Ears): Drena energía vital, causando 40-50 de daño y restaurando 35 HP al Axie (2 AP).
3. **Bidens Shell** (Mouth): Caparazón vegetal que otorga un masivo +90 de Escudo a un aliado o a sí mismo (2 AP).
4. **Trampa de Espinas** (Horn): Siembra raíces que apresan e inmovilizan (-2 PM) causando 30-40 de daño (2 AP).
5. **Fotosíntesis** (Back): Absorbe los rayos solares restaurando 55 HP de inmediato y +30 de Escudo (2 AP).
6. **Estallido de Semillas** (Tail): Detona semillas orgánicas causando 50-65 de daño en cruz (4 AP).

---

## 4. UI: Medallas de Parte y Tooltips Enriquecidos

### 4.1 Medalla en la Esquina de la Tarjeta (`.comp-skill-part-badge`)
- Se posicionó en la esquina superior izquierda (`top: 2px; left: 2px;`) de cada marco de habilidad de 48x48 px.
- Diseño circular con fondo semitransparente oscuro (`rgba(15, 23, 42, 0.92)`), borde dorado tenue (`rgba(245, 158, 11, 0.75)`) y sombra proyectada.
- No interfiere con el badge del número de ranura (1 al 6), ubicado en la esquina diagonal opuesta (`bottom: 2px; right: 2px;`).
- Animación interactiva en hover: escala a 1.15x con borde brillante.

### 4.2 Tooltip Táctico Dinámico
- Al pasar el cursor sobre la habilidad, se muestra el badge de la parte corporal con su icono oficial y texto en mayúsculas (`EYES`, `EARS`, etc.), complementando los metadatos de Tipo, Coste de AP y Alcance.

---

## 5. Resolución de Repetición de Habilidades e Ilustraciones Dedicadas

### 5.1 Causa del Error Original
- En Shinji, las imágenes 3 y 6 estaban almacenadas en disco como `3.webp` y `6.webp`.
- El código las solicitaba erróneamente como `3.png` y `6.png`, generando un error `404 Not Found` en el navegador.
- El evento `onerror` de la imagen ejecutaba `onerror="this.src='./assets/skills/heroes/shinji/1.png'"`, provocando que las ranuras 3 y 6 adoptaran automáticamente la imagen de la ranura 1 (el Axie azul bajo el agua).

### 5.2 Corrección Definitiva
1. **Soporte Dual en Shinji**: Se crearon copias sincronizadas de `3.png` y `6.png` para acompañar a `3.webp` y `6.webp`, evitando cualquier posibilidad de 404.
2. **Ilustraciones Exclusivas para Early Bird y Big Yak**:
   - Se sustituyeron las copias temporales de las ranuras 4, 5 y 6 por ilustraciones 100% exclusivas y acordes a la temática de cada habilidad:
     - **Early Bird**: Ráfaga de flechas celestiales (`4.png`), pluma en remolino de viento (`5.png`) y proyectil descendente en picada (`6.png`).
     - **Big Yak**: Enredadera espinosa de captura (`4.png`), flor radiante de fotosíntesis (`5.png`) y flor explosiva expulsando semillas (`6.png`).
   - Se añadió `this.onerror = null` preventivo para neutralizar cualquier bucle de recarga en el navegador.

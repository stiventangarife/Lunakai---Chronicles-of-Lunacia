# Hito 80: Iconos de los estados de combate

Los 31 estados de combate tienen icono propio. Antes eran símbolos de texto (◉, ▲, PM+…).

## Imágenes
- **Origen:** los PNG de `assets/ui/buff` y `assets/ui/debuff` (27 del primer lote y 10 nuevos), unos 130 px y 271 KB en total.
- **Convertidas a WebP de 64 × 64 px:** recortadas a su contenido, centradas y con fondo transparente. Quedan en las mismas carpetas, 37 archivos y 76 KB en total.
- **Los PNG originales se quedan** como fuente, por si hay que volver a generarlos.

## Qué icono lleva cada estado

| Estado | Icono | Estado | Icono |
|---|---|---|---|
| Veneno | debuff-poison | Potenciado | buff-damageBoost |
| Sangrado | debuff-bleed | Protegido | buff-shieldBoost |
| Quemadura | debuff-burn | Cobertura | buff-feather |
| Aturdido | debuff-stunned | Crítico + | buff-rage |
| Dormido | debuff-sleep | Alcance + | buff-rangeUp |
| Miedo | debuff-fear | Espinas y Reflejo | buff-bubbleBomb |
| Provocación | neutral-taunt | Inmune | buff-meditate |
| Frágil | debuff-fragile | Regeneración | buff-leaf |
| Debilitado | debuff-damageDown | Lazo | buff-soulLink |
| Alcance − | debuff-rangeDown | Nutrido | buff-healingBoost |
| Herida | debuff-healBlock | Represalia | buff-fury |
| Gafe | debuff-hex | Barrera | buff-bubble |
| PA − | debuff-drained | Arraigado | buff-unmovable |
| PM − | debuff-weak (caracol) | Guarda | buff-ward |
| | | PA + / PM + | buff-energized / buff-hasted |

**Libres para estados futuros:** deathMark, doubt, vulnerable, silence, disarmed, stealth y cleanser.

## Dónde se ven
- **Chapas de estado** junto al retrato, en la barra de combate.
- **Ficha de la unidad** al pasar el ratón por su retrato en la línea de turnos.
- **Chapas de la previsión** del ataque.

## Detalles técnicos
- **`StatusSystem.js`:**
  - cada estado tiene `img`;
  - `statusIconHtml(id, símbolo)` pinta la imagen, con el símbolo como texto alternativo;
  - `preloadStatusIcons()` carga las 31 imágenes al montar la interfaz de combate, para que no aparezcan a destiempo.
- **La marca sobre la cabeza de cada unidad sigue en texto:** se dibuja en el lienzo 3D, y meter imágenes ahí costaría rendimiento sin aportar.
- **Represalia** perdió el último emoji (↩️ → ↩).
- **Estilos:** `.lk-st-ico` en `lunakai-ui.css` (15–16 px).

## Comprobado
- **Las 31 imágenes cargan** sin errores.
- **En la arena de pruebas,** con veneno, quemadura, potenciado, regeneración, PM + y guarda, se ven en las chapas y en la ficha (capturas de antes y después).
- **La partida del usuario quedó intacta.**

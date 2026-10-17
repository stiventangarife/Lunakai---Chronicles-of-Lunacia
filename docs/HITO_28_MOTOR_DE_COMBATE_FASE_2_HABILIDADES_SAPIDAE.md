# Hito 28: Motor de combate — Fase 2 (las 24 habilidades de Sapidae)

> **Estado:** completado. Las 24 habilidades hacen lo que dice la sección 3 del Manifiesto y están escritas como efectos por datos.
> Se conservan ids, iconos, sonidos y VFX: los guardados y la interfaz no cambian.

## Qué cambió en cada habilidad

| Habilidad | Antes | Ahora |
| --- | --- | --- |
| Yunque Táctico | — | Sin cambios (45-60, empuje 1). |
| Tótem de Resguardo | +1 PM inmediato (se perdía si no era el turno del aliado) | +50 escudo y +1 PM **en el turno del aliado**. |
| Barricada de Lunacia | Permanente | Dura **2 rondas fijas** y desaparece sola. +30 escudo al lanzador. |
| Impacto Sísmico | Dañaba también a aliados de la cruz | Solo enemigos; −1 PM en su próximo turno. |
| Refuerzo de Placas | Solo escudo | +70 escudo y **quita las penalizaciones de PM**. |
| Balista de Lunacia | Daño normal | **Ignora el 25 % del escudo** del rival. |
| Fulgor Cósmico | — | Sin cambios (48-62). |
| Bálsamo Astral | — | Sin cambios (30-42 HP, +40 escudo). |
| Sintonía Genética | Cualquier aliado, sin visión | Solo el **Axie compañero**, con visión; +1 PA en su turno. |
| Aullido de Manada | +1 PM y +1 PA | +1 PM y **+15 % de daño** durante 1 turno, radio 2 (incluye al lanzador). |
| Lazo Simbiótico | Escudo y cura inmediata | **Vincula** al Sapidae y su Axie 2 turnos: el daño de habilidades se reparte a medias y ambos regeneran 25 HP por turno. |
| Despertar Quimérico | Faltaba el crítico | +60 escudo, +2 PM y **+20 % de crítico** al Axie compañero. |
| Zarzas Lunares | El −1 PA se aplicaba al momento (no servía) | −1 PA y −1 PM en el **próximo turno** del enemigo. |
| Esporas Vigorizantes | Curaba solo al Sapidae | Daña a los enemigos y **cura 25 a los aliados** de la cruz. |
| Baya Lunar Alquímica | +1 PM inmediato (se perdía) | +40 escudo y +1 PM en el turno del aliado. |
| Semilla Parásita | Curaba 22 fijo | Cura el **60 % del daño** infligido. |
| Manto Clorofílico | Solo escudo | +55 escudo y **−30 % de daño a distancia** durante 1 ronda. |
| Brotación Primigenia | Cruz | Área **3×3**, solo enemigos, −2 PM en su próximo turno. |
| Vórtice Gravitacional | Colisión normal | Empuje 2 con **+20 de colisión** extra. |
| Transposición Estelar | Cualquier aliado, sin visión | Solo el **Axie compañero**, con visión; ambos +25 escudo. |
| Salto Astral | No ralentizaba | Salta y gana +35 escudo; **−1 PM a los enemigos adyacentes** al aterrizar. |
| Nova Estelar | Faltaba el efecto | Cruz y **−1 de alcance** a los enemigos alcanzados. |
| Pozo Gravitatorio | Buff de +2 PM a un aliado | **Zona de 2×2 durante 2 rondas**: aliados que empiezan su turno dentro +2 PM, enemigos −1 PM. |
| Eclipse Cataclísmico | Cruz | Área **3×3** y **atrae** a los enemigos 1 casilla hacia el centro. |

## Cambios de reglas que afectan a todo el combate

- **Los escudos de habilidades duran una ronda.** Antes todo escudo desaparecía al final del turno de quien lo tenía, así que los escudos que el Sapidae se daba a sí mismo (Barricada, Manto, Salto) no protegían nunca. Ahora un escudo dura hasta el final del turno del receptor **en la ronda siguiente**. El escudo inicial de los enemigos sigue caducando como antes.
- **PA/PM para un aliado se dan en su turno.** Los PA y PM se reponen al empezar cada turno, así que dárselos a una unidad que no está jugando se perdía. Ahora se aplican al empezar su próximo turno (si es la unidad activa, al momento).
- **"Axie Aliado"** = cualquier aliado que no sea un Sapidae (`allyFilter: 'companion'`).
- **Pozo Gravitatorio:** se aplica al empezar el turno dentro de la zona; el efecto al cruzarla en mitad de un movimiento queda para más adelante.

## Motor (nuevo en esta fase)

- Estados `regen` (cura al empezar el turno, respeta Herida) y `soulLink` (reparte el daño con su pareja).
- `cleanse` con `only: [...]`; `resource` con `when: 'auto'`; `teleport` con `animate: 'hop'`; objetivo `enemiesAroundCaster`; área `box2x2`; la atracción va por un eje (nunca en diagonal).
- `SpellManager._grantShield`, `_flatDamageBonus` (la misma regla de bonus de daño para hechizos antiguos y nuevos).
- La vista previa de área en el tablero recibe al lanzador (necesario para áreas en línea).

## Verificación

- **59 pruebas** de Fase 2: cada habilidad comparada con su tooltip, la duración de los escudos y el paso 1 del tutorial (el Yunque sigue derrotando a la quimera exploradora).
- Fase 1 (56 pruebas) y Fase 0 siguen pasando; la regresión del resto de hechizos (Axies, enemigos y tutorial) sigue en **0 diferencias**.
- En el navegador se lanzaron las 24 en un combate real sin errores.

## Prueba manual recomendada

Con el Sapidae de cada clase: `lkDebug.give("active", {pa: 20})` y lanzar sus 6 habilidades. Comprobar que la barricada desaparece al empezar la ronda +2 y que el escudo del Manto sigue durante el turno enemigo.

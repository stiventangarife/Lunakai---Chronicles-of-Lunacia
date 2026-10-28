# Hito 81: Iconos de estado en los avisos de combate

Los avisos flotantes de combate relacionados con un estado llevan delante el icono de ese estado ([Hito 80](HITO_80_ICONOS_ESTADOS.md)), en lugar del símbolo de texto.

## Avisos con icono

| Aviso | Antes | Ahora |
|---|---|---|
| Estado aplicado | `▲ POTENCIADO (2)` | [icono] POTENCIADO (2) |
| Daño por turno (veneno, sangrado, quemadura) | `◉ -12` | [icono] -12 |
| Curación por turno (regeneración) | `✚ +8 PV` | [icono] +8 PV |
| Pierde el turno (aturdido, dormido) | `✶ PIERDE EL TURNO` | [icono] PIERDE EL TURNO |
| Sin curación | `SIN CURACIÓN` | [icono de Herida] SIN CURACIÓN |
| Daño compartido | `LAZO` | [icono de Lazo] LAZO |
| Despierta | `¡DESPIERTA!` | [icono de Dormido] ¡DESPIERTA! |

**Sin cambios:**
- daño, críticos, curaciones y escudos normales;
- −PA y −PM;
- «INMUNE» y «PURIFICADO»;
- choques, Ultimate, runas y charms.

## Detalles
- **`FloatingCombatText.spawn(pos, texto, tipo, { icon, alt })`:**
  - el icono es opcional; sin él, el aviso es igual que antes;
  - `alt` es el símbolo de texto, que se ve si la imagen no carga.
- **`SpellPresentation.js`:** usa `STATUS_DEFS[id].img`. Cuando hay icono, quita el símbolo del texto.
- **`styles.css`:** `.float-st-ico`.
  - 0,9 em (unos 29 px en los avisos de estado y 36 px en el daño por turno), con la sombra negra del texto;
  - crece, cae y se desvanece con el aviso;
  - el plan decía 22–24 px, pero a ese tamaño el icono se veía más pequeño que las mayúsculas.
- **Coste:** una imagen pequeña por aviso, ya cargada al empezar el combate.

## Comprobado
En la arena de pruebas:
- «POTENCIADO (2)», «QUEMADURA (3)» y «REGENERACIÓN (2)» al aplicarse;
- veneno «-12» por turno;
- «PIERDE EL TURNO» con el icono de aturdido.

Capturas de antes y después. El daño normal sigue sin icono.

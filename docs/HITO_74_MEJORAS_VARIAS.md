# Hito 74: Bolsas, oro de combate, opciones en combate, cámara y misiones de Génesis

Siete tareas revisadas.

## 1. Iconos de las bolsas
- Bolsa de runas → `assets/consumable/bag_rune.webp`.
- Bolsa de charms → `assets/consumable/bag_charms.webp`.

## 2. La Forja cobra SLP por las bolsas
| Receta | Antes | Ahora |
|---|---|---|
| Bolsa de runas | oro + materiales | **80 SLP** + materiales |
| Bolsa de charms | oro + materiales | **50 SLP** + materiales |

- El botón muestra «Forjar · N SLP» con el icono de SLP.
- Si no alcanza, la receta aparece como no disponible.
- `ForgeService.recipes()/craft()` comprueban y descuentan el SLP.

## 3. La estantería no mostraba lo que salía de la bolsa
- **Causa:** el filtro «Solo compatibles» venía activado. La bolsa da una clase al azar, así que una runa de otra clase quedaba oculta.
- **Ahora:**
  - el filtro viene apagado;
  - lo recién conseguido lleva la marca **«Nuevo»** hasta que se ve en la estantería (`slot.runeCharmNew`);
  - la nota de la bolsa dice dónde está.

## 4. Oro en los combates
- Al ganar un combate contra quimeras (no en el tutorial ni en duelos) se suman **20–45 de oro**.
- El oro aparece primero en el botín.

## 5. Menú de opciones en combate
- **Causa:** una regla de `styles.css` ocultaba `#settings-modal` en `body.state-combat`. El menú se abría pero quedaba con `display:none`.
- Se quitó el modal de esa regla. Ahora se abre con su pestaña de combate («Volver al combate»).

## 6. Cámara que se metía en las casas
Nuevo `src/rpg/CameraOcclusion.js` con dos piezas: brazo con colisión y transparencia.

**Brazo con colisión**
- Al cambiar de isla, las mallas sólidas de más de 1,4 m (casas, rocas, muros, puentes) se guardan como cajas en una rejilla de 8 m.
- Cada fotograma se lanza un rayo de la cabeza a la cámara, contra las cajas y el terreno.
- Si choca, el brazo se acorta al instante. Al quedar libre, se alarga suave.

**Transparencia**
- Árboles y follaje no frenan la cámara.
- Si quedan entre la cámara y el personaje, se ven a través con un tramado alrededor del personaje.

**Coste:** 0,015 ms por fotograma; 182 cajas en el Bosque, construidas en ~1 ms.

## 7. Misiones de Génesis más claras
**Kotaro (El umbral del azufre)**
- Ahora hay un grupo concreto, los **Guardianes de Genesis**, con flecha de misión, en (62, 26).
- Solo ese combate cuenta. Antes valía cualquier combate de la isla.

**Tripp (La reliquia de Tripp)**
- El pico lo tiene el **Guardián de Cristal** de la cantera rosa (-58, -72), con flecha.
- Aparece tras hablar con Tripp.
- Solo ese combate cuenta.

**Quimera final (Purificación primigenia)**
- El rastreador apunta al santuario del Origen.

**Textos (es/en):** reescritos con nombres de lugares en lugar de coordenadas [x, y].

## Comprobado
- Opciones visibles en modo combate.
- Recetas de las bolsas a 80 y 50 SLP, con sus iconos.
- La bolsa abierta aparece en la lista con marca «Nuevo» (prueba sin guardar).
- El Guardián de Cristal aparece en la cantera con flecha y el rastreador dice «En la zona objetivo».
- La cámara se para antes del tejado de la tienda del Bosque.

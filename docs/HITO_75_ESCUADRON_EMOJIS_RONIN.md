# Hito 75: Escuadrón con los Axies de la cuenta, sin emojis, runas Ronin y diseño del Mercado

## 1. Escuadrón

**Desbloqueo**
- El Escuadrón se abre al **reclutar a Bing**. Antes se abría al terminar el entrenamiento.
- Las partidas que ya tenían a Bing lo conservan y no repiten nada.
- El aviso de bloqueo dice ahora «El Escuadrón se desbloquea al reclutar a Bing en la Sabana».

**Mini-tutorial al reclutar a Bing** (franja «Escuadrón · paso N de 3» y guía con señalador):
1. **Abre el Escuadrón** (botón o tecla K).
2. **Pon a Bing en un puesto de apoyo**: arrastrándolo, o con «Añadir al escuadrón». Bing ya no entra solo al escuadrón.
3. **Pulsa «Cargar mis Axies».**

El progreso se guarda en `tutorialProgress.flags.squadIntro` (`waiting` → `open` → `place` → `load` → `done`).

**Cargar mis Axies** (nuevo botón en la colección del Escuadrón):
- Con sesión de Sky Mavis, trae todos los Axies de tus direcciones Ronin. Usa la misma función de servidor que la creación de partida (`axie-data · owned`).
- Cada Axie pasa a ser un héroe `ax_<id>` con:
  - su modelo 3D;
  - sus cartas de partes reales;
  - vida e iniciativa por clase y rol;
  - **nivel 1** y su propio progreso;
  - su propio equipo.
- Se puede poner de **principal** o de **apoyo**. El compañero del mundo abierto sigue al principal.
- Bing y Pomodoro siguen siendo solo de apoyo.
- No se duplica tu compañero: el Axie que ya es tu compañero no se añade otra vez.
- Si un Axie ya no está en la cuenta, sale de la colección y del escuadrón, y su progreso se guarda por si vuelve.
- **Como invitado**, el botón explica que hay que vincular la cuenta de Sky Mavis desde el menú principal.
- Los nombres largos se cortan con «…».
- **Cargar por ID** (75b): cualquier Axie por su ID o por el enlace del marketplace, también como invitado. Entra en nivel 1 y no sale al sincronizar la cuenta. Avisa si ya es tu compañero, si ya está en la colección o si el ID no existe.

**Archivos**
- `rpg/AccountAxiesService.js` (nuevo).
- `EquipmentManager`: `registerAccountAxie`, `syncAccountAxies`, `accountAxies` en el guardado.
- `SquadModal`.
- `TutorialDirector`.
- `SaveSlotManager` y `main.js` (guardado y cartas en combate).

## 2. Emojis
- Fuera los emojis de:
  - los textos en español e inglés: títulos de NPC, carteles de misión, pasos de misión, rastreador, insignias del tutorial, ayudas de combate, textos flotantes y mensajes de bloqueo;
  - el rastreador del HUD y el pin de la misión, que ahora llevan un rombo ◆ y una flecha ➔;
  - el mapa del mundo, que ahora usa rombos y marcas dibujadas;
  - los nombres de los monstruos de misión.
- **Estados de combate:** glifos tipográficos en lugar de emojis (◉ veneno, ✶ aturdido, ✚ regeneración, PA−/PM+…).
- **Escudo y PM** en la ficha de unidad: texto en lugar de emojis.
- **Corazones de los cuidados:** el icono `heart.png` del juego.
- **Hacha de la recolección:** dibujada.
- **Objetos sin icono:** `resource.png`.
- Se mantienen los símbolos que ya encajan con el estilo: ✓ ★ ✕ ➔ ✦.
- **Comprobación:** recorrido del HUD buscando emojis en lo que se ve. Solo queda ➔, que se mantiene a propósito.

## 3. Runas y charms Ronin (NFT)
- **Servidor:** la función `axie-data` tiene la consulta nueva `op: 'items'`. Lee los ERC-1155 de tipo `Rune` y `Charm` de las direcciones Ronin del jugador (`erc1155Tokens` del marketplace) y suma las cantidades de todas sus direcciones.
- **Juego:**
  - `RoninItemsService` empareja cada NFT con el catálogo por nombre, y por clase si el nombre se repite.
  - `RuneCharmService.setRonin` da una **copia jugable mientras siga en la billetera**.
  - Si una copia desaparece de la billetera y estaba equipada, se quita del Axie.
- **Las copias Ronin no se venden ni se gastan:** `sellable` excluye las copias Ronin, y la Tienda explica por qué.
- **En la estantería** llevan el icono de Ronin (`assets/ui/icons/ronin.webp`, 75b). Se leen la primera vez que se abre la estantería en cada sesión.
- **Hay que desplegar la función** para que funcione con cuentas reales: `supabase functions deploy axie-data --no-verify-jwt`.

## 4. Mercado entre jugadores
Diseño técnico en [DISENO_TIENDA_JUGADORES.md](DISENO_TIENDA_JUGADORES.md). Es una demo para Sky Mavis: el bAXS es ficticio, y el flujo con bAXS real se simula.

## Comprobado
- **Partida con Bing ya reclutado:** el Escuadrón sigue abierto, sin mini-tutorial.
- **Simulación de partida sin Bing:**
  - el Escuadrón está bloqueado;
  - al reclutar a Bing, este no entra solo;
  - los pasos 1 → 2 (arrastrando a Bing) → 3 → fin funcionan;
  - como invitado sale el aviso de vincular la cuenta.
- **Cargar Axies** con 4 IDs de prueba (cuenta simulada):
  - se añaden 3, y el compañero no se duplica;
  - quedan en nivel 1 con 6 cartas reales;
  - uno de ellos puesto de principal → el compañero del mundo cambia, y entra en combate con sus cartas.
- **Runas Ronin simuladas:**
  - «Bloodlust» y «Aquatic's Charm of Focus I» se emparejan, y lo que no está en el catálogo se ignora;
  - `sellable` = 0;
  - la estantería muestra la insignia R.
- La partida del usuario quedó como estaba: las pruebas no guardaron nada.

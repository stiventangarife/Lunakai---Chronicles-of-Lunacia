// TutorialScript.js — Textos del tutorial nuevo (Hito 48). Diálogos cortos: como mucho 2–3 líneas por momento.
// {name} = nombre del Sapidae · {axie} = nombre del Axie compañero.
// Cada paso: fase (para los rombos de la franja), tipo ('talk' = conversación con Paladill, 'task' = acción del jugador)
// y la franja que se ve arriba (title + text). Las conversaciones están en DIALOGS.

export const PHASES = ['Defensa', 'Mochila', 'Duelo', 'Forja', 'Vínculo', 'Runas', 'Graduación'];

export const STEPS = {
  defend:        { phase: 0, kind: 'talk', dialog: 'alarm',      title: '¡Quimeras en el Dojo!', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  equip_talk:    { phase: 1, kind: 'talk', dialog: 'after_dojo', title: 'Habla con el Maestro Paladill', text: 'Acércate y pulsa <kbd>E</kbd>.' },
  equip_sword:   { phase: 1, kind: 'task', title: 'Equipa la Espada de madera', text: 'Abre la Mochila <kbd>I</kbd> y ponla en la ranura de arma.' },
  duel_talk:     { phase: 2, kind: 'talk', dialog: 'duel',       title: 'Duelo de entrenamiento', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  forge_talk:    { phase: 3, kind: 'talk', dialog: 'forge',      title: 'Mejora tu espada', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  chop:          { phase: 3, kind: 'task', title: 'Consigue madera', text: 'Tala el <b>Árbol de la Forja</b>: acércate y pulsa <kbd>E</kbd>.' },
  forge_open:    { phase: 3, kind: 'task', title: 'Ve a la Forja', text: 'Acércate al yunque y pulsa <kbd>E</kbd>.' },
  forge_evolve:  { phase: 3, kind: 'task', title: 'Evoluciona tu espada', text: 'Elige la <b>Espada de madera</b> y pulsa <b>Evolucionar</b>.' },
  forge_speed:   { phase: 3, kind: 'task', title: 'Acelera ×4', text: 'Pulsa <b>×4</b> en el yunque. <b>Esta vez invita Paladill</b>: te devuelve los bAXS.' },
  forge_collect: { phase: 3, kind: 'task', title: 'Recoge tu espada nueva', text: 'Espera unos segundos y pulsa <b>Recoger</b>.' },
  bond_talk:     { phase: 4, kind: 'talk', dialog: 'bond',       title: 'El vínculo', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  pet:           { phase: 4, kind: 'task', title: 'Acaricia a {axie}', text: 'Haz <b>clic sobre {axie}</b> y pulsa <b>Acariciar</b>.' },
  feed:          { phase: 4, kind: 'task', title: 'Dale de comer', text: 'En el mismo panel, dale una <b>fruta</b> a {axie}.' },
  ult_talk:      { phase: 4, kind: 'talk', dialog: 'ultimate',   title: 'La Ultimate en pareja', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  runes_talk:    { phase: 5, kind: 'talk', dialog: 'runes',      title: 'Runas y charms', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  runes:         { phase: 5, kind: 'task', title: 'Equipa una runa y un charm', text: 'Pulsa <kbd>U</kbd> (Mochila › Runas) y equípalos en {axie}.' },
  grad_talk:     { phase: 6, kind: 'talk', dialog: 'graduation', title: 'Graduación', text: 'Habla con el Maestro Paladill <kbd>E</kbd>.' },
  done:          { phase: 7, kind: 'done', title: '¡Mundo abierto!', text: 'Pulsa <kbd>M</kbd> para ver el mapa. Bing te espera en la Sabana.' },
};

export const ORDER = Object.keys(STEPS);

/** Conversaciones (cada entrada es una línea de Paladill; `me` = respuesta del jugador como opción). */
export const DIALOGS = {
  alarm: [
    '¡{name}! ¡Las quimeras han llegado hasta el Dojo!',
    'Tú y {axie} sois mi primera línea. ¡Ahora te toca a ti!',
  ],
  after_dojo: [
    '¡Bien hecho! Has defendido el Dojo.',
    'Esa <span class="lk-kw">Espada de madera</span> es tuya. Ábrela en la Mochila <span class="lk-kw">[I]</span> y equípala.',
  ],
  duel: [
    'Te queda bien. Ahora, enséñame lo que sabes.',
    'Es un entrenamiento: paramos cuando uno baje al <span class="lk-kw">30 %</span> de vida.',
  ],
  duel_yield: ['¡Ja! Me rindo, me rindo. Tienes buen brazo.'],
  duel_stop: ['Basta por hoy. Ya irás cogiendo el ritmo.'],
  forge: [
    'Toma <span class="lk-kw">50 de oro</span>. Y esa espada se te queda pequeña: vamos a mejorarla.',
    'En la <span class="lk-place">Forja</span> todo evoluciona con materiales, SLP y algo de tiempo.',
    'Te doy un <span class="lk-kw">lote de aprendiz</span>. Falta madera: tala el árbol junto a la Forja.',
  ],
  bond: [
    'Esa espada ya es otra cosa. Pero tu mayor fuerza es {axie}.',
    'Con el <span class="lk-kw">vínculo al 100 %</span> lanzáis juntos vuestra <span class="lk-kw">Ultimate</span>. Haz clic en {axie} y acarícialo.',
  ],
  ultimate: [
    'Así se cuida un vínculo: caricias, comida y paseos juntos.',
    'Para la prueba te presto mi resonancia: <span class="lk-kw">vínculo al 100 %</span>.',
    'Lanza la Ultimate con tu Sapidae. ¡Adelante!',
  ],
  runes: [
    '¡Eso es resonancia! Mi préstamo termina aquí; el resto lo ganáis vosotros.',
    'Toma una <span class="lk-kw">runa</span> y un <span class="lk-kw">charm</span> neutros. La runa mejora a tu Axie; el charm, una de sus partes.',
    'Equípaselos a {axie} en Mochila › Runas <span class="lk-kw">[U]</span>.',
  ],
  graduation: [
    'Ya estás listo, {name}. Las puertas del Dojo se abren para ti.',
    'Bing te espera en la <span class="lk-place">Sabana</span>. Pulsa <span class="lk-kw">[M]</span> para ver el mapa. ¡Que Atia te guíe!',
  ],
  // Recordatorios cortos si el jugador habla con Paladill durante una tarea
  remind_equip_sword: ['Abre la Mochila <span class="lk-kw">[I]</span> y equipa la espada.'],
  remind_chop: ['El árbol está justo al lado de la Forja. Acércate y pulsa <span class="lk-kw">[E]</span>.'],
  remind_forge: ['La Forja está a pocos pasos, en el patio.'],
  remind_pet: ['Haz clic sobre {axie}. Te está esperando.'],
  remind_runes: ['Pulsa <span class="lk-kw">[U]</span> y equipa la runa y el charm a {axie}.'],
  ambient: ['Que el honor guíe cada movimiento en el tablero de Lunacia, {name}.'],
};

/** Consejos del maestro durante los combates del tutorial (franja «coach»). */
export const COACH = {
  duel: 'Entrenamiento: termina cuando alguien baje al <b>30 %</b> de vida.',
  ult_wait: 'Con tu <b>Sapidae</b>, pulsa la <b>Ultimate</b> <kbd>7</kbd> y elige un objetivo.',
  ult_axie: 'Turno de tu Axie: muévelo o pulsa <b>Pasar turno</b>. La Ultimate la lanza tu <b>Sapidae</b>.',
  ult_done: '¡Resonancia! Ahora termina el combate.',
};

/** Mensajes al intentar usar algo que el tutorial aún no ha enseñado. */
export const LOCKED = {
  inventory: 'La Mochila se abre tras tu primer combate.',
  squad: 'El Escuadrón se desbloquea al terminar el entrenamiento.',
  worldMap: 'El mapa se desbloquea al graduarte en el Dojo.',
  forge: 'El Maestro Paladill te enseñará la Forja enseguida.',
  care: 'Paladill te enseñará a cuidar a tu Axie un poco más adelante.',
  runes: 'Las runas y los charms llegan al final del entrenamiento.',
  shop: 'La tienda abre cuando termines el entrenamiento del Dojo.',
  gather: 'Termina el entrenamiento del Dojo para recolectar aquí.',
};

/** Recompensas que da el tutorial (también las da «Saltar tutorial» si faltan). */
export const REWARDS = {
  duelGold: 50,
  bundle: { mat_wolf_tooth: 1, mat_wool: 1 },
  rune: 'neutral-pure-power',
  charm: 'neutral-awaken-stamp-m',
  food: ['food_berry', 'food_berry'],
};

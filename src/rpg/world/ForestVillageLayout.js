// ForestVillageLayout.js — Dónde va cada pieza del pueblo de la Isla del Bosque (zona 2_2). Hito 51 (23-oct).
// Solo datos y cálculo, sin imports: lo usan ForestVillage (modelos), ForgeStation (yunque), MapRegistry (Ochi y
// Paladill), NPCManager y OverworldManager (Paladill), GatheringCatalog (árbol de la Forja) y TutorialDirector.
//
// · Los edificios bordean el camino principal desde su final (-95, 25) hasta la salida hacia el Gran Árbol
//   (-23, -29), unos 90 m. Lado A = noroeste del camino, lado B = sureste.
// · x, z es el CENTRO de la planta del modelo (ForestVillage corrige los modelos con el origen descentrado,
//   como el bus o la parada). yaw gira el modelo: el frente de todos (+z local) mira al camino.
// · Tamaño: los GLB vienen encogidos a una caja de ~1,9 m; `scale` les da su tamaño real. Los Sapidae miden
//   ~2,8 m, así que dojo, Forja, tienda, parada y bus van grandes (puertas y bancos a su medida).
// · Separación: ≥ 2,5 m entre la calle (4,8 m de ancho) y cada fachada, y ≥ 5 m entre edificios.
// · smoke: true → humo en la chimenea (solo casas; Hito 96, ver ChimneySmoke).

export const VILLAGE_ZONE = '2_2';

export const VILLAGE_MODELS = {
  dojo: { url: './assets/environment/dojo.glb', scale: 9 },        // 17 × 14,6 m, 12 m de alto
  shop: { url: './assets/environment/shop.glb', scale: 6 },        // 11 × 11 m
  forja: { url: './assets/environment/forja.glb', scale: 6.5 },    // 12 × 7 m
  house: { url: './assets/environment/house.glb', scale: 4 },
  altar_atia: { url: './assets/environment/altar_atia.glb', scale: 3 },
  totem: { url: './assets/environment/totem.glb', scale: 2.5 },
  lamp: { url: './assets/environment/lamp.glb', scale: 1.2, collider: 'circle', radius: 0.35, small: true }, // 2,3 m
  parada: { url: './assets/environment/parada.glb', scale: 4 },    // 5,9 m de alto
  bus: { url: './assets/environment/bus.glb', scale: 5, conform: true }, // 9,5 m de largo; se inclina con el terreno
  shop_fish: { url: './assets/environment/shop_fish.glb', scale: 4 },
  balsa: { url: './assets/environment/balsa.glb', scale: 3.5, float: true, collider: 'circle', radius: 1.5, small: true }
};

export const VILLAGE = [
  // Lado A (noroeste), desde el final del camino
  { id: 'shop', model: 'shop', x: -79.6, z: 0.6, yaw: 0.647 },
  { id: 'forja', model: 'forja', x: -64.9, z: -8.6, yaw: 0.703 },
  { id: 'house_1', model: 'house', x: -50.8, z: -18.9, yaw: 0.681, smoke: true },
  { id: 'parada', model: 'parada', x: -41.5, z: -29.8, yaw: 0.573 }, // 2,5 m detrás del bus
  // Bus aparcado en el arcén delante de la parada: el morro (−x del modelo) mira hacia el Gran Árbol de Atia y la
  // puerta (+z) da a la parada
  { id: 'bus', model: 'bus', x: -38.2, z: -24.8, yaw: -2.569 },
  // Final del camino: el altar de Atia cierra la calle, mirando hacia el pueblo
  { id: 'altar', model: 'altar_atia', x: -97.7, z: 27.0, yaw: 2.214 },
  // Lado B (sureste); el camino del Gran Árbol sale entre house_3 y house_4
  { id: 'house_2', model: 'house', x: -87.4, z: 28.6, yaw: -2.513, plinth: true }, // en pendiente: zócalo de piedra
  { id: 'house_3', model: 'house', x: -72.8, z: 17.9, yaw: -2.503, plinth: true, smoke: true },
  { id: 'house_4', model: 'house', x: -50.6, z: 0.1, yaw: -2.435, smoke: true },
  { id: 'dojo', model: 'dojo', x: -33.2, z: -6.0, yaw: -2.492 },   // el Maestro Paladill espera delante del porche
  { id: 'totem', model: 'totem', x: -24.0, z: -22.6, yaw: -2.615 }, // a la salida del pueblo
  // Farolas a lo largo del camino
  { id: 'lamp_1', model: 'lamp', x: -79.9, z: 18.6, yaw: -2.509 },
  { id: 'lamp_2', model: 'lamp', x: -68.8, z: 0.9, yaw: 0.674 },
  { id: 'lamp_3', model: 'lamp', x: -59.1, z: 2.6, yaw: -2.444 },
  { id: 'lamp_4', model: 'lamp', x: -52.1, z: -13.2, yaw: 0.696 },
  { id: 'lamp_5', model: 'lamp', x: -46.9, z: -7.8, yaw: -2.447 },
  { id: 'lamp_6', model: 'lamp', x: -43.3, z: -20.2, yaw: 0.647 },
  // Embarcadero de Pomodoro el barquero (43, 132.2)
  { id: 'shop_fish', model: 'shop_fish', x: 36.0, z: 132.0, yaw: 1.2 },
  { id: 'balsa', model: 'balsa', x: 48.5, z: 135.5, yaw: 0.4 }
];

/** La calle del pueblo (puntos del camino): los árboles a menos de `halfWidth` m de ella se ocultan. */
export const VILLAGE_STREET = {
  points: [{ x: -95.0, z: 25.0 }, { x: -78.9, z: 13.2 }, { x: -63.0, z: 1.0 }, { x: -47.7, z: -11.9 }, { x: -35.8, z: -20.9 }, { x: -22.9, z: -28.6 }],
  halfWidth: 6
};

/** Punto del mundo a `lx`, `lz` metros (ejes locales del modelo) del centro de la pieza `id`. */
export function villagePoint(id, lx = 0, lz = 0) {
  const b = VILLAGE.find((v) => v.id === id);
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return { x: b.x + c * lx + s * lz, z: b.z - s * lx + c * lz };
}

/** Giro (como el de los NPC) para mirar en la dirección del frente de la pieza `id`. */
export function villageFacing(id) { return VILLAGE.find((v) => v.id === id).yaw; }

/** Mercader Ochi: delante de la tienda. */
export const OCHI_SPOT = { ...villagePoint('shop', 0, 6.7), rotation: villageFacing('shop') };

/** Yunque: delante de la puerta de la Forja (donde se pulsa E). */
export const FORGE_USE_SPOT = { ...villagePoint('forja', 0, 5.0), yaw: villageFacing('forja') };

/** Árbol de la Forja (se tala en el tutorial): al lado de la Forja, junto a su esquina delantera. */
export const FORGE_TREE_SPOT = villagePoint('forja', 8.7, 2.4);

/** Guardián de los Pergaminos: a la izquierda de la puerta de la Forja (el árbol está a la derecha), mirando a la calle.
 *  A > 4 m del punto de uso del yunque, para que los dos avisos de «E» no se pisen. */
export const SCROLL_KEEPER_SPOT = { ...villagePoint('forja', -5.2, 4.4), rotation: villageFacing('forja') };

/** Maestro Paladill: delante del porche del dojo, mirando a la calle. */
export const PALADILL_SPOT = { ...villagePoint('dojo', 0, 8.9), rotation: villageFacing('dojo') };

/** Donde queda el jugador tras la cinemática: frente al maestro, mirándole. */
export const PALADILL_GREET_SPOT = { ...villagePoint('dojo', 0, 12.5), yaw: villageFacing('dojo') + Math.PI };

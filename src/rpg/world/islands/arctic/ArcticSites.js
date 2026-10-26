/**
 * Ártico — places of the improvement plan (Hito 23 · mejora del bioma).
 * Shared by the terrain (pond basin, exclusions for trees / boulders / grass) and the
 * primitive landmarks. NPC positions live in MapRegistry (pomodoro_npc, chef) and in
 * IslandWorldLayout.MERGED_NPC_POSITIONS (hermit); the values below are the same.
 */
export const ARCTIC_SITES = {
  // Pomodoro: wooden house + stone lamp + campfire with fish, outside the greenhouse (south exit)
  pomodoro: {
    house: { x: 17.0, z: 13.0, yaw: -Math.PI / 2 },
    lamp: { x: 13.4, z: 16.0 },
    fire: { x: 9.6, z: 16.4 },
    npc: { x: 8.0, z: 18.6, rotation: -0.5 }
  },
  // Frost farm: 4 fenced plots + cold frames + scarecrow, north of the greenhouse (by the path)
  farm: {
    x0: 8.0, x1: 20.4, z0: 39.3, z1: 51.7,
    gate: { z0: 44.4, z1: 46.6 },                         // opening on the west side (path)
    plots: [[11.2, 42.5], [17.2, 42.5], [11.2, 48.5], [17.2, 48.5]],
    scarecrow: { x: 14.2, z: 45.5 },
    // Hito 71b: las parcelas y el espantapájaros van dentro de la cúpula del invernadero (centro 8, 29; radio
    // 7,5 m), en 2×2 y sin valla. x0…z1 se conservan solo como hueco sin árboles (para no mover la vegetación).
    greenhouse: { x: 8.0, z: 29.0, step: 5.4, domeR: 7.5 }
  },
  // Chef Boreal: shop.glb (Hito 56; was a market stall at -2.4, -40.4) + campfire with a cooking pot on the
  // east shore of the lake. The shop sits a bit further back so the Chef stands in front of its counter.
  chef: {
    stall: { x: -2.4, z: -40.4, yaw: -Math.PI / 2 },
    shop: { x: 0.0, z: -40.2, yaw: -Math.PI / 2 },
    fire: { x: -6.6, z: -35.4 },
    npc: { x: -5.4, z: -39.0, rotation: -0.3 }
  },
  // Glacial Hermit: cabin + campfire at the east edge of the frost valley, new frozen pond
  hermit: {
    cabin: { x: -33.5, z: -69.5, yaw: -Math.PI / 2 },
    fire: { x: -38.6, z: -73.0 },
    npc: { x: -39.2, z: -70.4, rotation: -0.98 },
    pond: { x: -31.5, z: -82.5, r: 5.0, level: 6.75, depth: 1.3 }
  },
  // Valley of Eternal Frost: totem_ice where the frost chimeras patrol (Hito 56; the old primitive Altar de
  // Atia stood here). Key kept as `altar` because the terrain and the boulder clean-up read it.
  altar: { x: -60.0, z: -76.0, face: 1.03, r: 4.4 },
  // Altar de Atia (altar_atia.glb, Hito 56): new clearing beside the path from the beach, facing the path
  atia: { x: 19.0, z: 76.0, yaw: -Math.PI / 2, r: 3.6 },
  // Flag at the island entrance: beside the path, a few metres up from the boat arrival (5, 120), facing the beach
  entranceFlag: { x: 9.5, z: 114.0, yaw: 0 },
  // Boreal Cooking Camp house (house.glb; was house_artic.glb on the lake shore at -18, -26). Moved next to
  // Pomodoro's house so the frozen lake stays clear; door towards the path, like Pomodoro's
  campHouse: { x: 10.0, z: 4.0, yaw: -Math.PI / 2 },
  // Abetos de tala (recolección, Hito 64): uno junto al Altar de Atia, otro junto a la tienda del Chef y otro junto
  // a la cabaña del Ermitaño, en claros despejados (footprint de 3 m sin abetos, rocas ni hierba alrededor)
  chopTrees: {
    atia: { x: 25.0, z: 71.5 },
    shop: { x: 6.0, z: -34.5 },
    hermit: { x: -28.5, z: -62.5 }
  }
};

/** Footprints kept clear of trees, boulders and grass blades: [x, z, radius]. */
export function arcticSiteFootprints() {
  const S = ARCTIC_SITES;
  const fx = (S.farm.x0 + S.farm.x1) / 2, fz = (S.farm.z0 + S.farm.z1) / 2;
  return [
    [S.pomodoro.house.x, S.pomodoro.house.z, 4.2],
    [S.pomodoro.fire.x, S.pomodoro.fire.z, 2.6],
    [S.pomodoro.lamp.x, S.pomodoro.lamp.z, 1.2],
    [S.campHouse.x, S.campHouse.z, 4.2],
    [fx, fz, 9.2],
    [S.chef.stall.x, S.chef.stall.z, 4.0],
    [S.chef.shop.x, S.chef.shop.z, 4.4],
    [S.chef.fire.x, S.chef.fire.z, 2.6],
    [S.hermit.cabin.x, S.hermit.cabin.z, 4.2],
    [S.hermit.fire.x, S.hermit.fire.z, 2.6],
    [S.hermit.pond.x, S.hermit.pond.z, S.hermit.pond.r + 2.5],
    [S.altar.x, S.altar.z, S.altar.r + 1.5],
    [S.atia.x, S.atia.z, S.atia.r + 1.5],
    ...Object.values(S.chopTrees).map((t) => [t.x, t.z, 3.0])
  ];
}

export function nearArcticSite(x, z, pad = 0) {
  for (const [sx, sz, r] of arcticSiteFootprints()) if (Math.hypot(x - sx, z - sz) < r + pad) return true;
  return false;
}

// MobSpawnPools.js — Puntos de aparición de los mobs de cada isla y ajustes del respawn (Hito 106).
//
// Solo datos (sin imports), como IslandWorldLayout.js. Los puntos salen de `lkDebug.spawnPool()` (SpawnPoolTool.js),
// revisados a mano en el juego: tierra seca con margen respecto al agua, sin colliders, alcanzables a pie desde el
// muelle y lejos de NPC, edificios y pueblos. Si cambia el terreno o se colocan edificios nuevos, hay que regenerarlos.

export const ISLAND_SPAWN_POOL = {
  // Bosque (51 puntos)
  '2_2': [
    { x: -45, z: -114 }, { x: -25, z: -110 }, { x: 71, z: -100 }, { x: 49, z: -99 }, { x: -69, z: -98 },
    { x: -44, z: -95 }, { x: -85, z: -89 }, { x: -26, z: -80 }, { x: -57, z: -76 }, { x: 65, z: -75 },
    { x: 89, z: -74 }, { x: 47, z: -72 }, { x: -85, z: -65 }, { x: 107, z: -64 }, { x: 73, z: -55 },
    { x: 41, z: -47 }, { x: -106, z: -44 }, { x: 120, z: -41 }, { x: 93, z: -39 }, { x: 57, z: -38 },
    { x: -119, z: -21 }, { x: 70, z: -20 }, { x: 94, z: -16 }, { x: 116, z: -11 }, { x: 74, z: 0 },
    { x: 91, z: 9 }, { x: 110, z: 12 }, { x: 80, z: 25 }, { x: 0, z: 34 }, { x: 99, z: 35 },
    { x: 120, z: 37 }, { x: -36, z: 40 }, { x: -15, z: 44 }, { x: 82, z: 49 }, { x: 4, z: 59 },
    { x: -40, z: 60 }, { x: -19, z: 65 }, { x: 110, z: 65 }, { x: 75, z: 68 }, { x: -101, z: 70 },
    { x: -51, z: 79 }, { x: -6, z: 79 }, { x: 89, z: 80 }, { x: -69, z: 84 }, { x: -25, z: 85 },
    { x: -90, z: 90 }, { x: 74, z: 101 }, { x: -69, z: 105 }, { x: -11, z: 108 }, { x: -36, z: 111 },
    { x: -22, z: 123 }
  ],
  // Sabana (60 puntos)
  '3_2': [
    { x: -3, z: -108 }, { x: 34, z: -108 }, { x: -35, z: -106 }, { x: -59, z: -98 }, { x: 56, z: -98 },
    { x: 15, z: -95 }, { x: -32, z: -88 }, { x: -8, z: -88 }, { x: 35, z: -86 }, { x: -44, z: -65 },
    { x: 53, z: -65 }, { x: -67, z: -61 }, { x: 4, z: -60 }, { x: 30, z: -59 }, { x: -14, z: -54 },
    { x: 97, z: -52 }, { x: -55, z: -47 }, { x: 47, z: -46 }, { x: 78, z: -46 }, { x: -84, z: -40 },
    { x: -39, z: -37 }, { x: 32, z: -31 }, { x: -59, z: -29 }, { x: -111, z: -25 }, { x: 109, z: -21 },
    { x: 81, z: -20 }, { x: -77, z: -18 }, { x: -113, z: -6 }, { x: 71, z: -1 }, { x: -84, z: 6 },
    { x: -24, z: 12 }, { x: 47, z: 14 }, { x: -60, z: 15 }, { x: 95, z: 15 }, { x: 78, z: 23 },
    { x: -35, z: 33 }, { x: 2, z: 33 }, { x: 24, z: 38 }, { x: -75, z: 40 }, { x: 102, z: 40 },
    { x: 65, z: 41 }, { x: -50, z: 45 }, { x: -16, z: 45 }, { x: 14, z: 53 }, { x: -68, z: 58 },
    { x: -96, z: 60 }, { x: -25, z: 61 }, { x: 0, z: 67 }, { x: 85, z: 67 }, { x: 55, z: 74 },
    { x: -79, z: 78 }, { x: -24, z: 80 }, { x: -51, z: 81 }, { x: 27, z: 83 }, { x: -6, z: 89 },
    { x: 69, z: 90 }, { x: 50, z: 102 }, { x: -49, z: 103 }, { x: -26, z: 109 }, { x: -3, z: 110 }
  ],
  // Ártico (52 puntos)
  '2_1': [
    { x: -16, z: -91 }, { x: 34, z: -91 }, { x: 65, z: -85 }, { x: -71, z: -82 }, { x: 19, z: -79 },
    { x: 1, z: -74 }, { x: 40, z: -74 }, { x: -82, z: -65 }, { x: 71, z: -64 }, { x: 20, z: -61 },
    { x: 38, z: -55 }, { x: 90, z: -44 }, { x: -58, z: -42 }, { x: -100, z: -40 }, { x: 57, z: -40 },
    { x: 35, z: -37 }, { x: -80, z: -35 }, { x: 75, z: -25 }, { x: -101, z: -19 }, { x: 44, z: -19 },
    { x: 100, z: -17 }, { x: -76, z: -16 }, { x: 62, z: -7 }, { x: -86, z: 1 }, { x: 46, z: 5 },
    { x: 94, z: 6 }, { x: -70, z: 10 }, { x: 69, z: 11 }, { x: -95, z: 19 }, { x: 87, z: 26 },
    { x: 105, z: 28 }, { x: -53, z: 29 }, { x: -30, z: 30 }, { x: 39, z: 34 }, { x: -81, z: 36 },
    { x: -15, z: 40 }, { x: 11, z: 41 }, { x: 56, z: 43 }, { x: 83, z: 47 }, { x: -36, z: 48 },
    { x: 25, z: 55 }, { x: 43, z: 59 }, { x: -69, z: 61 }, { x: 7, z: 61 }, { x: 60, z: 65 },
    { x: -14, z: 70 }, { x: -54, z: 79 }, { x: 5, z: 79 }, { x: 50, z: 80 }, { x: 24, z: 82 },
    { x: -35, z: 85 }, { x: -15, z: 92 }
  ],
  // Mística (60 puntos)
  '1_2': [
    { x: -18, z: -124 }, { x: 26, z: -120 }, { x: -38, z: -119 }, { x: 1, z: -111 }, { x: 59, z: -110 },
    { x: -55, z: -104 }, { x: 35, z: -104 }, { x: -72, z: -96 }, { x: -24, z: -91 }, { x: 69, z: -90 },
    { x: 40, z: -85 }, { x: -54, z: -80 }, { x: -96, z: -76 }, { x: -74, z: -76 }, { x: 59, z: -75 },
    { x: 92, z: -64 }, { x: -53, z: -61 }, { x: -114, z: -49 }, { x: -73, z: -48 }, { x: -91, z: -47 },
    { x: 110, z: -47 }, { x: 90, z: -45 }, { x: 69, z: -43 }, { x: -57, z: -38 }, { x: -81, z: -31 },
    { x: -119, z: -30 }, { x: 100, z: -29 }, { x: 64, z: -21 }, { x: -94, z: -17 }, { x: 101, z: -11 },
    { x: -70, z: -10 }, { x: 81, z: -10 }, { x: -115, z: 1 }, { x: -88, z: 5 }, { x: 65, z: 9 },
    { x: 27, z: 10 }, { x: -116, z: 21 }, { x: 85, z: 21 }, { x: 42, z: 28 }, { x: 118, z: 39 },
    { x: 17, z: 41 }, { x: 57, z: 41 }, { x: 94, z: 44 }, { x: -115, z: 50 }, { x: 35, z: 50 },
    { x: 84, z: 59 }, { x: -5, z: 61 }, { x: 21, z: 64 }, { x: 51, z: 70 }, { x: 90, z: 84 },
    { x: -2, z: 86 }, { x: 51, z: 88 }, { x: 33, z: 90 }, { x: 69, z: 96 }, { x: -15, z: 104 },
    { x: 8, z: 105 }, { x: -46, z: 111 }, { x: 31, z: 111 }, { x: 51, z: 114 }, { x: -15, z: 124 }
  ],
  // Genesis (56 puntos)
  '2_3': [
    { x: 11, z: -91 }, { x: -22, z: -90 }, { x: 46, z: -84 }, { x: -1, z: -76 }, { x: -54, z: -74 },
    { x: 29, z: -74 }, { x: 61, z: -73 }, { x: -30, z: -69 }, { x: -75, z: -61 }, { x: 43, z: -60 },
    { x: -1, z: -56 }, { x: -19, z: -54 }, { x: 61, z: -54 }, { x: 14, z: -45 }, { x: 85, z: -44 },
    { x: 34, z: -41 }, { x: -26, z: -35 }, { x: 67, z: -35 }, { x: -71, z: -34 }, { x: -3, z: -32 },
    { x: 49, z: -29 }, { x: 84, z: -22 }, { x: -80, z: -15 }, { x: 34, z: -15 }, { x: -1, z: -14 },
    { x: -63, z: -7 }, { x: 56, z: -6 }, { x: 96, z: -6 }, { x: 74, z: -5 }, { x: -14, z: 1 },
    { x: -66, z: 11 }, { x: 47, z: 11 }, { x: 95, z: 15 }, { x: -95, z: 16 }, { x: -45, z: 20 },
    { x: 78, z: 21 }, { x: -24, z: 24 }, { x: 51, z: 32 }, { x: -4, z: 34 }, { x: 21, z: 34 },
    { x: -79, z: 35 }, { x: 91, z: 35 }, { x: 69, z: 37 }, { x: -64, z: 45 }, { x: -46, z: 46 },
    { x: -12, z: 52 }, { x: -81, z: 53 }, { x: 32, z: 54 }, { x: 78, z: 54 }, { x: 8, z: 55 },
    { x: 60, z: 60 }, { x: -64, z: 70 }, { x: -43, z: 74 }, { x: 45, z: 74 }, { x: 23, z: 77 },
    { x: -24, z: 80 }
  ],
};

/**
 * Ajustes del respawn. Tiempos en segundos de juego (el reloj solo corre mientras se explora, no en combate ni menús).
 */
export const RESPAWN_CONFIG = {
  population: 5,            // manadas libres vivas por isla (en el Bosque, slimes)
  // Retardo de las manadas normales por isla [mín, máx]
  delay: { '2_2': [45, 75], '3_2': [60, 90], '2_1': [75, 105], '1_2': [90, 120], '2_3': [120, 150] },
  uniqueDelay: [240, 360],  // jefes y mobs de misión (reaparecen donde estaban)
  minPlayerDist: 50,        // un mob no aparece más cerca que esto del jugador (m)
  minMobDist: 30,           // ni más cerca que esto de otro mob (se relaja si el pool no da más)
  recentAvoid: 3,           // no repite ninguno de los últimos N puntos
  retryDelay: 6,            // s hasta reintentar si no había punto válido
  checkEvery: 1,            // s entre comprobaciones de la cola
  farFreezeDist: 75,        // un mob que patrulla más lejos que esto se queda quieto (m)
  nearUpdateDist: 40        // entre esto y farFreezeDist se actualiza un fotograma de cada dos (m)
};

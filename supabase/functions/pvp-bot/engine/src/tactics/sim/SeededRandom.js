// SeededRandom.js — Azar sembrado para las reglas del combate (Arena PvP, fase P0).
// Mulberry32: rápido, 32 bits y con la misma secuencia en todos los navegadores, Node y Deno (solo enteros de 32 bits y
// una división final exacta). Es el mismo algoritmo que usan el Desafío de la Bruma y el mundo abierto.

/** Generador: cada llamada devuelve un número en [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  const rng = function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.state = () => a;       // para la huella del estado (cuántos números se han sacado no basta: el estado sí)
  return rng;
}

/** Semilla de 32 bits a partir de un texto (id de partida, etc.). FNV-1a. */
export function seedFrom(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

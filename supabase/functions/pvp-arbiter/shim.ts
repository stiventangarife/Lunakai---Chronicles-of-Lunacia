// shim.ts — Lo mínimo del navegador que el motor del juego usa al cargar (preferencias de idioma y ranuras de
// guardado en localStorage). En la función no hay nada que leer ni guardar: un almacén en memoria basta.
const mem = new Map<string, string>();
// deno-lint-ignore no-explicit-any
const g = globalThis as any;
if (!g.localStorage) {
  g.localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
}
export {};

#!/usr/bin/env node
// run-once.mjs — Ejecuta una vez la Edge Function del árbitro (supabase/functions/pvp-arbiter/index.ts) en Node, sin
// Deno, contra un Supabase (el local de pruebas o el de verdad) y escribe su respuesta. Para pruebas y para arbitrar a
// mano. Necesita `node tools/pvp/arbiter/build.mjs` hecho.
// Uso: SUPABASE_URL=http://localhost:8200 SUPABASE_SERVICE_ROLE_KEY=service-test \
//      node --experimental-strip-types tools/pvp/arbiter/run-once.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const key = process.env.PVP_ARBITER_KEY || 'local-run';
const env = { ...process.env, PVP_ARBITER_KEY: key };
let handler = null;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h; }, readTextFile: (u) => fs.promises.readFile(fileURLToPath(u), 'utf8') };
await import(new URL('../../../supabase/functions/pvp-arbiter/index.ts', import.meta.url));
const res = await handler(new Request('http://local/pvp-arbiter', { method: 'POST', headers: { 'x-arbiter-key': key } }));
console.log(JSON.stringify(await res.json()));

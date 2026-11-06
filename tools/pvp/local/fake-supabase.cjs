// fake-supabase.cjs — «Supabase» local para probar la Arena PvP (fase P2) sin la nube: /rest/v1/rpc/<fn> → PostgreSQL
// (con el usuario del JWT de prueba) y /realtime/v1/websocket (Phoenix: canales, presencia y los avisos de realtime.send).
// Uso: DB=lunakai PGARGS="-h localhost -p 5432 -U postgres" [SERVICE_KEY=…] node tools/pvp/local/fake-supabase.cjs   (puerto 8200; necesita `ws`)
// La base de datos: las migraciones del proyecto + tools/pvp/local/realtime-setup.sql.
const http = require('http');
const { execFile } = require('child_process');
const { WebSocketServer } = require('ws');
const PSQL = [process.env.PSQL || 'psql', [...(process.env.PGARGS || '-h /tmp/pg -p 5499 -U postgres').split(' '), '-d', process.env.DB || 'lunakai', '-At', '-v', 'ON_ERROR_STOP=1']];
const q = (sql) => new Promise((res, rej) => execFile(PSQL[0], [...PSQL[1], '-c', sql], (e, out, err) => (e ? rej(new Error(err || e.message)) : res(out.trim()))));
const lit = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const subOf = (h) => { try { return JSON.parse(Buffer.from(String(h).split(' ').pop().split('.')[1], 'base64').toString()).sub; } catch { return null; } };
const argTypes = {};
async function types(fn) {
  if (!argTypes[fn]) {
    const out = await q(`select array_to_json(proargnames)::text || '|' || array_to_json(array(select format_type(t, null) from unnest(proargtypes) t))::text from pg_proc where proname = ${lit(fn)} and pronamespace = 'public'::regnamespace`);
    const [n, t] = out.split('|'); const names = JSON.parse(n || '[]'), tps = JSON.parse(t || '[]');
    argTypes[fn] = Object.fromEntries(names.map((x, i) => [x, tps[i]]));
  }
  return argTypes[fn];
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const m = req.url.match(/^\/rest\/v1\/rpc\/(\w+)/);
  if (!m) { res.statusCode = 404; res.end('{}'); return; }
  let body = ''; for await (const c of req) body += c;
  const args = body ? JSON.parse(body) : {};
  try {
    const t = await types(m[1]);
    const parts = Object.entries(args).filter(([k]) => t[k]).map(([k, v]) => `${k} => ${v === null ? 'null' : t[k] === 'jsonb' ? lit(JSON.stringify(v)) + '::jsonb' : lit(typeof v === 'object' ? JSON.stringify(v) : v) + '::' + t[k]}`);
    // Clave de servicio de prueba (SERVICE_KEY): entra como service_role, como la Edge Function del árbitro (fase P4)
    const service = process.env.SERVICE_KEY && req.headers.apikey === process.env.SERVICE_KEY;
    const sub = service ? null : subOf(req.headers.authorization);
    const role = service ? 'service_role' : sub ? 'authenticated' : 'anon';
    const out = await q(`select set_config('request.jwt.claim.sub', ${lit(sub || '')}, false); set role ${role}; select to_jsonb(public.${m[1]}(${parts.join(', ')}))`);
    res.setHeader('Content-Type', 'application/json'); res.end(out.split('\n').pop());
  } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ code: 'sql', message: String(e.message).slice(0, 300) })); }
});
// ---- Realtime (Phoenix) ----
const wss = new WebSocketServer({ server, path: '/realtime/v1/websocket' });
const members = new Map(); // topic → Map(ws → { key, metas, joinRef })
let refN = 0;
const send = (ws, msg) => { try { ws.send(JSON.stringify(msg)); } catch {} };
function presenceState(topic) { const out = {}; for (const [, p] of members.get(topic) || []) if (p.metas.length) (out[p.key] ||= { metas: [] }).metas.push(...p.metas); return out; }
function broadcastPresenceDiff(topic, joins, leaves) { for (const [ws] of members.get(topic) || []) send(ws, { topic, event: 'presence_diff', payload: { joins, leaves }, ref: null }); }
wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    const msg = JSON.parse(raw); const { topic, event, payload, ref, join_ref } = msg;
    if (topic === 'phoenix' && event === 'heartbeat') return send(ws, { topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref });
    if (event === 'phx_join') {
      const sub = subOf('x ' + (payload.access_token || ''));
      const bare = topic.replace(/^realtime:/, '');
      let ok = false;
      try { ok = (await q(`select set_config('request.jwt.claim.sub', ${lit(sub || '')}, false); select public.pvp_can_listen(${lit(bare)})`)).split('\n').pop() === 't'; } catch {}
      if (!ok) return send(ws, { topic, event: 'phx_reply', payload: { status: 'error', response: { reason: 'Unauthorized' } }, ref });
      if (!members.has(topic)) members.set(topic, new Map());
      members.get(topic).set(ws, { key: payload.config?.presence?.key || sub, metas: [], joinRef: join_ref });
      send(ws, { topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref });
      return send(ws, { topic, event: 'presence_state', payload: presenceState(topic), ref: null });
    }
    if (event === 'presence' && payload?.event === 'track') {
      const p = members.get(topic)?.get(ws); if (!p) return;
      const meta = { ...payload.payload, phx_ref: 'p' + (++refN) };
      const old = p.metas; p.metas = [meta];
      broadcastPresenceDiff(topic, { [p.key]: { metas: [meta] } }, old.length ? { [p.key]: { metas: old } } : {});
      return;
    }
    if (event === 'phx_leave') { leave(ws, topic); return send(ws, { topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref }); }
    if (event === 'access_token') return;
  });
  ws.on('close', () => { for (const t of [...members.keys()]) leave(ws, t); });
});
function leave(ws, topic) {
  const p = members.get(topic)?.get(ws); if (!p) return;
  members.get(topic).delete(ws);
  if (p.metas.length) broadcastPresenceDiff(topic, {}, { [p.key]: { metas: p.metas } });
}
// Reparto de los avisos de realtime.send
let last = 0;
q('select coalesce(max(id),0) from realtime.outbox').then((v) => { last = Number(v) || 0; setInterval(poll, 60); });
let polling = false;
async function poll() {
  if (polling) return; polling = true;
  try {
    const out = await q(`select coalesce(json_agg(o order by id), '[]') from realtime.outbox o where id > ${last}`);
    for (const o of JSON.parse(out)) {
      last = o.id;
      const topic = 'realtime:' + o.topic;
      for (const [ws] of members.get(topic) || []) send(ws, { topic, event: 'broadcast', payload: { type: 'broadcast', event: o.event, payload: o.payload }, ref: null });
    }
  } catch {} finally { polling = false; }
}
server.listen(8200, () => console.log('fake supabase :8200'));

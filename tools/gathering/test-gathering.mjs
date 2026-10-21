// test-gathering.mjs — Pruebas de la recolección sin navegador (catálogo y reglas del servicio).
// Uso (desde axie-tactics-web): node tools/gathering/test-gathering.mjs
// Las posiciones contra el terreno real se comprueban en el juego: consola → lunakaiGathering.check()
globalThis.localStorage={getItem(){return null},setItem(){},removeItem(){}};
globalThis.window=globalThis; globalThis.document={addEventListener(){},getElementById(){return null}};
const { GatheringServiceImpl, formatWait } = await import('../../src/rpg/GatheringService.js');
const { GATHER_NODES, GATHER_LOOT, nodesForZone } = await import('../../src/tactics/data/GatheringCatalog.js');
const { MATERIALS } = await import('../../src/tactics/data/EconomyCatalog.js');
const { ITEMS_DB } = await import('../../src/tactics/ItemDatabase.js');
let fails=0; const ok=(c,m)=>{ if(!c){fails++; console.log('FAIL',m);} };
// catalog
ok(GATHER_NODES.length===13,'13 nodes');
for (const z of ['2_2','3_2','2_1','1_2']) ok(nodesForZone(z).length>=3, 'zone '+z);
ok(nodesForZone('2_3').length===0,'genesis none'); ok(nodesForZone('zone_2_2').length===4,'zone_ prefix');
for (const t of Object.values(GATHER_LOOT)) { ok(MATERIALS[t.mat]||ITEMS_DB[t.mat],'loot '+t.mat); if(t.rare) ok(MATERIALS[t.rare]||ITEMS_DB[t.rare],'rare '+t.rare); }
ok(new Set(GATHER_NODES.map(n=>n.id)).size===13,'unique ids');
// service with fake slot + forge
let t=1e12; const slot={}; const mats={}; const inv=[]; let saves=0;
const svc=new GatheringServiceImpl({ slots:{activeSlotId:1,getActiveSlot:()=>slot}, forge:{ em:{ addItemsToInventory(ids){ inv.push(...ids); } }, addMats(id,n,save){mats[id]=(mats[id]||0)+n; if(save) saves++; return true;}, onSave(){ saves++; } }, now:()=>t });
const seq=(arr)=>{let i=0; return ()=>arr[i++%arr.length];};
let r=svc.gather('fish_forest_1', seq([0.99,0.05]));
ok(r.ok && r.loot[0].id==='food_fish' && r.loot[0].n===3 && r.loot[1]?.id==='food_koi','fish 3 + koi '+JSON.stringify(r.loot));
ok(inv.filter(i=>i==='food_fish').length===3 && inv.includes('food_koi') && !mats.food_fish,'fish to backpack '+inv);
ok(saves===1,'one save '+saves);
ok(slot.gathering.until.fish_forest_1===t+480000,'respawn 8min');
r=svc.gather('fish_forest_1'); ok(!r.ok && /8 min/.test(r.why),'depleted '+r.why);
t+=479000; ok(!svc.isAvailable('fish_forest_1'),'still depleted'); t+=1000; ok(svc.isAvailable('fish_forest_1'),'respawned');
r=svc.gather('tree_forest_forge', seq([0,0])); ok(r.ok && r.loot.length===1 && r.loot[0].n===1 && r.loot[0].id==='mat_wood','tree no rare');
// distribution
const cnt={1:0,2:0,3:0}; let rare=0; const N=30000;
const s2=new GatheringServiceImpl({ slots:null, forge:null, now:()=>0 });
for(let i=0;i<N;i++){ const l=s2.roll('mine_savannah_1'); cnt[l[0].n]++; if(l[1]) rare++; }
ok(Math.abs(rare/N-0.1)<0.01,'rare ~10% '+rare/N); for(const k of [1,2,3]) ok(Math.abs(cnt[k]/N-1/3)<0.02,'amount '+k);
ok(formatWait(45000)==='45 s' && formatWait(7*60000+12000)==='8 min','fmt');
ok(svc.gather('nope').ok===false,'unknown');
svc.reset(); ok(svc.isAvailable('tree_forest_forge'),'reset');
console.log(fails ? `${fails} FALLOS` : 'OK: todas las comprobaciones pasan');
process.exit(fails ? 1 : 0);

// =====================================================================
// ESTILIZADO · ENEMIGOS — las 61 habilidades de enemigos con las fábricas estilizadas (VFX.sty.basic.*).
// Usa la misma tabla que mod-enemigos.js (VFX.ENEMY_ROWS: id, nombre, TIPO, paleta, opciones) y registra cada una
// con la clave sty__<id>. Si un tipo aún no tiene versión estilizada, se registra la original con esa clave,
// así el puente siempre encuentra efecto (con el estilo nuevo encendido) y nunca se queda sin VFX.
// Requiere mod-enemigos.js y los tres mod-estilizado-*.js cargados antes (VFX_MODULE_DEPS).
// =====================================================================
(function(){
if(!window.VFX||!VFX.sty||!VFX.ENEMY_ROWS)return;
const S=VFX.sty, missing=new Set();
for(const [mod,rows] of Object.entries(VFX.ENEMY_ROWS)){
  const defs=[];
  for(const [id,name,type,pal,opt] of rows){
    const sty=S.basic[type], fab=sty||VFX.basic[type];
    if(!fab){console.warn("[vfx-sty] falta el tipo",type,"para",id);continue;}
    if(!sty)missing.add(type);
    defs.push(Object.assign(fab(Object.assign({key:"sty__"+id,name,pal},opt)),{basicType:type,styFallback:!sty}));
  }
  VFX.module(mod.replace("Enemigos","Estilizado · Enemigos"),defs);
}
if(missing.size)console.info("[vfx-sty] tipos aún sin versión estilizada (usan la original):",[...missing].join(", "));
})();

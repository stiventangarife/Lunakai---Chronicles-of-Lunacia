// =====================================================================
// MÓDULO · ENEMIGOS — las 61 habilidades de enemigos como instancias de los efectos básicos (mod-basicos-*.js).
// Cada fila: [id del hechizo (= clave del efecto), nombre, TIPO de VFX.basic, paleta, opciones de la fábrica].
// Requiere vfx-lib.js y los tres mod-basicos-*.js cargados antes.
// =====================================================================
(function(){
if(!window.VFX||!VFX.basic)return;
const G={
"Enemigos · Quimeras":[
 ["chimera_bite","Fierce Bite","MORDISCO","Salvaje",{}],
 ["chimera_bellow","Seismic Roar","RUGIDO","Tierra",{push:1,taunt:true}],
 ["chimera_spit","Acid Spit","ESCUPITAJO","Veneno",{poison:true}],
 ["chimera_heal","Regenerative Howl","CURA","Sagrado",{cleanse:true}],
 ["chimera_frost_nova","Puffy's Glacial Nova","NOVA_CRUZ","Hielo",{style:"cristal",slow:true}],
],
"Enemigos · Slimes":[
 ["slime_strike","Viscous Strike","GOLPE","Baba",{}],
 ["slime_barrier","Gelatinous Shield","ESCUDO","Baba",{self:true,style:"hex"}],
 ["slime_attack_spit","Acid Shot","ESCUPITAJO","Veneno",{poison:true}],
 ["slime_attack_goo","Debilitating Slime","BABA_PEGAJOSA","Baba",{slow:true}],
 ["slime_defense_slam","Liquid Rock Charge","EMBESTIDA","Baba",{push:1}],
 ["slime_defense_barrier","Viscous Carapace","ESCUDO","Baba",{self:true,style:"hex"}],
 ["slime_support_pinch","Slime Pinch","GOLPE","Baba",{}],
 ["slime_support_heal","Regenerative Mist","CURA","Agua",{}],
 ["slime_forest_a_swipe","Floral Swipe","ZARPAZO","Naturaleza",{}],
 ["slime_forest_a_spit","Acid Pollen","ESCUPITAJO","Polen",{poison:true}],
 ["slime_forest_a_thorn","Thorny Sprout","ESPINAS","Naturaleza",{bleed:true}],
 ["slime_forest_b_slam","Cavern Slam","GOLPE","Roca",{}],
 ["slime_forest_b_spit","Volcanic Bile","ESCUPITAJO","Fuego",{poison:true}],
 ["slime_forest_b_heavy","Seismic Charge","EMBESTIDA","Roca",{push:1}],
 ["slime_fusion_burst","Magma Fusion","NOVA_CRUZ","Fuego",{style:"llamas"}],
],
"Enemigos · Lobos":[
 ["wolf_aquatic_bite","Aquatic Bite","MORDISCO","Agua",{}],
 ["wolf_aquatic_alpha_splash","Tidal Bite","MORDISCO","Agua",{}],
 ["wolf_aquatic_alpha_roar","Ancestral Roar","RUGIDO","Agua",{push:1,taunt:true}],
 ["wolf_gray_bite","Frost Bite","MORDISCO","Hielo",{}],
 ["wolf_gray_slash","Glacial Claw","ZARPAZO","Hielo",{}],
 ["wolf_alpha_bite","Savage Bite","MORDISCO","Salvaje",{}],
 ["wolf_alpha_roar","Polar Howl","RUGIDO","Hielo",{push:1,taunt:true}],
 ["wolf_alpha_nova","Blizzard Fury","NOVA_CRUZ","Hielo",{style:"cristal"}],
 ["wolf_alpha_howl","Aullido Alfa","AUTOBUFF","Hielo",{}],
 ["werewolf_crush","Aplastamiento Feral","GOLPE_SISMICO","Salvaje",{}],
 ["werewolf_slam","Embate de Hielo","EMBESTIDA","Hielo",{}],
 ["werewolf_roar","Rugido Cataclísmico","AUTOBUFF","Salvaje",{shield:true}],
 ["werewolf_boss_bite","Lupine Rend","MORDISCO","Salvaje",{bleed:true}],
 ["werewolf_boss_roar","Terrifying Howl","RUGIDO","Salvaje",{push:2,taunt:true}],
 ["werewolf_boss_cataclysm","Beast Cataclysm","CATACLISMO","Fuego",{burn:true}],
],
"Enemigos · Bosque":[
 ["treant_flower_slam","Frozen Root Strike","GOLPE","Hielo",{}],
 ["treant_flower_nova","Glacial Spores","NOVA_CRUZ","Esporas",{style:"esporas",weak:true}],
 ["treant_fighter_punch","Oak Fist","GOLPE","Madera",{}],
 ["treant_fighter_bash","Sylvan Bash","EMBESTIDA","Madera",{push:1}],
 ["treant_fighter_bark","Thick Bark","ESCUDO","Madera",{self:true,style:"corteza"}],
 ["treant_spore","Esporas Tóxicas","NUBE_ESPORAS","Veneno",{poison:true}],
 ["treant_entangle","Enredo de Raíces","ENREDO","Naturaleza",{}],
 ["dryad_fighter_blade","Sylvan Blade","ESTOCADA","Naturaleza",{}],
 ["dryad_fighter_dance","Thorn Dance","GIRO_EMPUJE","Naturaleza",{push:1}],
 ["dryad_fighter_slash","Astral Slash","ZARPAZO","Estelar",{bleed:true}],
 ["dryad_mage_spark","Astral Spark","PROYECTIL_MAGICO","Estelar",{}],
 ["dryad_mage_heal","Elven Dew","CURA","Sagrado",{cleanse:true}],
 ["dryad_mage_burst","Cosmic Channeling","NOVA_CRUZ","Estelar",{style:"estrellas",fragile:true}],
 ["dryad_mage_orb","Orbe Arcano","PROYECTIL_MAGICO","Arcano",{}],
 ["dryad_mage_blast","Ráfaga de la Espesura","RAFAGA","Naturaleza",{}],
 ["dryad_mage_barrier","Barrera Silvestre","ESCUDO","Madera",{style:"corteza"}],
 ["dryad_range_arrow","Vine Arrow","FLECHA","Naturaleza",{}],
 ["dryad_range_snipe","Piercing Shot","FLECHA","Arcano",{style:"certero"}],
 ["dryad_range_root","Restraining Bramble","ESPINAS","Naturaleza",{root:true}],
],
"Enemigos · Osos":[
 ["bear_mom_strike","Ladle Strike","GOLPE","Madera",{}],
 ["bear_mom_roar","Maternal Fury","RUGIDO","Tierra",{push:1,stun:true}],
 ["bear_mom_slam","Sylvan Claw","GOLPE_SISMICO","Tierra",{}],
 ["bear_dad_claw","Colossal Claw","ZARPAZO","Salvaje",{}],
 ["bear_dad_roar","Earthquake Roar","RUGIDO","Tierra",{push:1}],
 ["bear_dad_shield","Paternal Protection","ESCUDO","Sagrado",{self:true,style:"hex"}],
 ["bear_dad_slam","Titanic Bash","GOLPE_SISMICO","Tierra",{}],
],
};
for(const [mod,rows] of Object.entries(G)){
  const defs=[];
  for(const [key,name,type,pal,opt] of rows){
    const fab=VFX.basic[type];
    if(!fab){console.warn("[vfx] falta el tipo básico",type,"para",key);continue;}
    defs.push(Object.assign(fab(Object.assign({key,name,pal},opt)),{basicType:type}));
  }
  VFX.module(mod,defs);
}
})();

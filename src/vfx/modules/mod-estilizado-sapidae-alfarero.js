// =====================================================================
// ESTILIZADO · SAPIDAE · ALFARERO DE GÓLEMS (Hito 95) — las 6 habilidades de la clase con efecto propio y el
// pulso y la rotura de su gólem (Centinela de Vasija). Kit vfx-stylized.js; mismo estilo que el piloto (Hito 99).
// Claves: sty_<id de la habilidad> (el puente las usa con el estilo nuevo encendido) · golem_pulse_sentinel · golem_break_sentinel.
// Identidad: terracota #C8643B: arcilla espiritual, vasijas torneadas, vetas minerales doradas, losas de piedra; «para resistir, no para conquistar».
// Lanzador = Sapidae: mano ≈ (-3.35,1.15,0.25), cabeza ≈ (-3.7,1.6,0). Los efectos de gólem se lanzan sobre el propio gólem
// (en reposo donde está el lanzador del laboratorio, -3.7).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Alfarero",["#f2b183","#a8492a"]);
const PAL="Alfarero";
const HAND=V3(-3.35,1.15,0.25);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const TILE=1.93;                         // una casilla en unidades del laboratorio
const VV=`varying float vR;varying float vK;`;
const defs=[];

const {helixGeo}=VFX;
const EARTH="vec3(.6,.48,.34)";          // polvo de tierra
const GOLD="vec3(1.,.78,.34)";           // vetas de la arcilla espiritual (color semántico fijo)

// ---------- materiales propios ----------
// arcilla espiritual: materia con luz en 3 bandas (rampa de la paleta: terracota → arcilla clara), vetas doradas que
// brillan (uV), erosión dura para desmoronarse (uEr), anillos de torno opcionales (uBand) y mezcla con piedra (uStone)
const CLAY_FS=`uniform float uV;uniform float uEr;uniform float uBand;uniform float uStone;uniform float uRev;
void main(){if(uRev<1.5&&vUv.x>uRev)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec2 tc=vP.xy*.42+vP.zx*.29;
 float g=styNoise(tc).g;float vein=smoothstep(.3,.2,g)*smoothstep(.02,.1,g);
 float er=styErode(styNoise(tc*1.6+.37).r*.8+.2,uEr,.05);if(er<.5)discard;
 float band=uBand>0.?.07*sin(vP.y*uBand):0.;
 vec3 c=styMatter(l,-.16+band);
 vec3 st=styRampOf(vec3(.62,.57,.5),.22+.55*l)*styTint(l);c=mix(c,st,uStone);
 c+=${GOLD}*vein*uV*1.7;
 c+=vec3(1.,.8,.4)*smoothstep(.0,.08,er-.5)*0.;
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.16*smoothstep(.62,.72,fr)*step(.5,l);
 gl_FragColor=vec4(c,1.);}`;
const clayMat=(o={})=>S.mat(CLAY_FS,{uV:{value:0},uEr:{value:-0.2},uBand:{value:o.band||0},uStone:{value:o.stone||0},uRev:{value:2}},
  Object.assign({mode:'solid'},o.double?{side:THREE.DoubleSide}:{}));
const setClay=(m,v,er,rev)=>{const u=m.uniforms;u.uV.value=v;u.uEr.value=er;if(rev!==undefined)u.uRev.value=rev;};
// glifo dorado en el suelo (energía): anillos y marcas que giran; uP = erosión
const GLYPH_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float m=band(r,.9,.022)+band(r,.74,.014)+band(r,.58,.045)*step(.55,fract(an/6.2832*12.+uT*.25))+band(r,.36,.012);
 float er=styErode(styNoise(vUv*1.2).r*.7+.3,uP,.1);
 gl_FragColor=vec4(${GOLD}*1.25,m*er*uA);}`;
// vetas que trepan por un cilindro (energía dorada); uP = altura revelada (0..1)
const VEIN_SHELL=`void main(){float h=vP.y/1.9+.5;vec2 tc=vec2(atan(vP.z,vP.x)/6.2832*2.,vP.y*.45);
 float g=styNoise(tc).g;float vein=smoothstep(.3,.21,g)*smoothstep(.02,.1,g);
 float rev=smoothstep(uP+.02,uP-.08,h);float head=smoothstep(.1,0.,abs(h-uP))*step(h,uP+.02);
 gl_FragColor=vec4(mix(${GOLD},vec3(1.,.94,.75),head)*1.45,(vein*.95+head*vein*.6)*rev*uA);}`;
// cúpula de escudo (energía suave, fresnel dorado)
const SHIELD_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
 float n=styNoise(vUv*vec2(3.,1.5)+vec2(uT*.1,0.)).g;float hex=smoothstep(.28,.22,n)*smoothstep(.04,.1,n);
 gl_FragColor=vec4(mix(styRamp(.75),${GOLD},.5)*1.2,(fr*.75+hex*.25)*uA);}`;

// ---------- partículas reutilizables (dentro de build: fábricas de vs) ----------
// terrones: esquirlas de arcilla iluminadas (color oscuro de la paleta)
const CHUNK_FS=S.MATTER_FS(C.shard,{relief:3.2,col:'uC2',bias:.05});
const DUST_FS=S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05});
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.25});
// vs de estallido: desde O, dirección sesgada D, velocidad v0..v1, gravedad g, vida, tamaño
const burstVS=(O,D,v0,v1,g,life,sz,t0,spread=.06,spin=9)=>VV+`const vec3 O=${v3(O)};
void main(){float s=${f(t0)}+aSeed.x*${f(spread)};float life=${f(life)}+aSeed.y*${f(life*.4)};float age=(uT-s)/life;float t=max(uT-s,0.);
 vec3 v=normalize(rnd()+vec3(${D}))*(${f(v0)}+${f(v1-v0)}*aSeed.z);vec3 p=O+v*t+vec3(0.,-${f(g)}*t*t,0.);
 vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*${f(spin)}*(aSeed.w-.5);
 put(p,${sz});}`;
// polvo en anillo a ras de suelo: centro O, radio r0→r1, a partir de t0
const dustRingVS=(O,r0,r1,t0,life,sz)=>VV+`const vec3 O=${v3(O)};
void main(){float s=${f(t0)}+aSeed.x*.06;float life=${f(life)}+aSeed.y*${f(life*.35)};float age=(uT-s)/life;float t=max(uT-s,0.);
 float an=aSeed.z*6.2832;vec3 p=O+vec3(cos(an),0.,sin(an))*(${f(r0)}+${f(r1-r0)}*(1.-exp(-t*4.)))+vec3(0.,.12+t*.35*aSeed.w,0.);
 vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;
 put(p,(${sz})*(.7+.5*age));}`;

// =====================================================================
// 1 · PUÑO DE ARCILLA — el puño brota del suelo delante del Sapidae, toma impulso y golpea en línea; al chocar
//     suelta terrones y polvo y se desmorona. Empuje 1 (lo mueve el motor). ti 0,42 s
// =====================================================================
defs.push({key:"sty_craft_clay_fist",name:"Puño de Arcilla",dur:1.05,ti:0.42,tier:3,pal:PAL,stylized:true,
  phases:[["Forma",0],["Impulso",0.2],["Golpe",0.42],["Desmorona",0.6]],
build(a){
  const L=a.L,TF=0.2,TP=0.3,TI=0.42,X0=-2.5,XB=-2.85,X1=2.7,Y=0.95;
  const fist=new THREE.Group(); L.mesh.add(fist);
  const mat=clayMat();
  const add=(geo,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);fist.add(m);return m;};
  add(new THREE.SphereGeometry(0.4,24,16),0,0,0,1.05,0.95,0.9);
  const kg=new THREE.SphereGeometry(0.15,16,12);
  for(const z of [-0.24,-0.08,0.08,0.24]){add(kg,0.34,0.13,z);add(kg,0.3,-0.12,z,0.9,0.85,0.9);}
  add(new THREE.SphereGeometry(0.14,16,12),0.12,-0.05,0.36,1.4,0.8,0.9);
  add(new THREE.CylinderGeometry(0.24,0.3,0.55,18).rotateZ(Math.PI/2),-0.5,-0.04,0,1,1,1);
  const shadow=S.contactShadow(L.decal,1.3), spark=S.hitSpark(L.mesh,1.7,{seed:0.21}), ring=S.groundRing(L.decal,2.8);
  const K=`const float TI=${f(TI)};`;
  a.count+=S.pts(L.part,8,dustRingVS(V3(X0,0,0),0.2,0.9,0.02,0.5,'.3+.14*aSeed.y'),DUST_FS);
  // estela de polvo durante el puñetazo
  a.count+=S.pts(L.part,14,VV+K+`float px(float t){float k=clamp((t-${f(TP)})/${f(TI-TP)},0.,1.);return ${f(XB)}+${f(X1-XB)}*k*k;}
  void main(){float s=${f(TP)}+aSeed.x*${f(TI-TP)};float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(px(s)-.35,${f(Y)}+(aSeed.z-.5)*.45,(aSeed.w-.5)*.45)+vec3(-.3*t,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28;put(p,(.2+.12*aSeed.y)*(.6+.8*age));}`,DUST_FS);
  a.count+=S.pts(L.part,14,burstVS(V3(X1+0.3,Y,0),"-.35,.55,0.",2.,4.,7.,.5,'.2+.1*aSeed.w',TI),CHUNK_FS);
  a.count+=S.pts(L.part,10,dustRingVS(V3(3.2,0,0),0.3,1.2,TI,0.6,'.32+.16*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,12,burstVS(V3(X1,Y-0.1,0),"0.,-.2,0.",.4,1.2,6.,.45,'.14+.08*aSeed.w',TI+0.14,0.3),CHUNK_FS);
  a.count+=S.pts(L.part,10,burstVS(V3(X1+0.2,Y,0),"-.2,.4,0.",1.,2.5,1.,.35,'.09+.05*aSeed.w',TI,0.03),MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TF,te);
    let x=X0;
    if(te>=TF&&te<TP)x=X0+(XB-X0)*ss(TF,TP,te);
    else if(te>=TP&&te<TI){const k=(te-TP)/(TI-TP);x=XB+(X1-XB)*k*k;}
    else if(ia>=0)x=X1-0.18*ss(0,0.2,ia);
    const y=ia<0?-0.45+(Y+0.45)*(1-Math.pow(1-form,3))+0.05*Math.sin(te*20)*(te<TF?1:0):Y-0.25*ss(0.15,0.5,ia);
    fist.position.set(x,y,0); fist.scale.setScalar(Math.max(0.35+0.65*form,0.001));
    fist.rotation.z=ia<0?-0.25*ss(TF,TP,te)+0.25*ss(TP,TI,te):-0.15*ss(0.1,0.5,ia);
    const er=ia<0?-0.2:-0.2+1.25*ss(0.12,0.5,ia);
    fist.visible=er<1.02; setClay(mat,0.25*form+0.75*ss(TP,TI,te)+(ia>=0?0.6*Math.exp(-ia*5):0),er);
    shadow.pose(x,0,1.0,fist.visible?form*(1-ss(0.2,0.5,ia)):0);
    spark.pose(ia,tmp.set(X1+0.35,Y,0),1.1); ring.pose(ia,3.3,0,0.45);
    const hit=hitE(ia,6); target.position.x=3.4+0.3*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-hit*0.25*Math.cos(ia*14);
    caster.rotation.z=0.12*ss(0,TF,te)-0.3*ss(TP,TI,te)+0.18*ss(TI,TI+0.4,te);
    if(ia<0){o.g.set(x,Y,0);o.gs=0.6*form;o.ga=0.1*form;o.li=1.2*form;}
    else{o.g.set(X1+0.3,Y,0);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*14)*0.35;o.li=4.5*Math.exp(-ia*7);}
    o.ia=ia;o.c.set(X1+0.3,Y,0);o.shake=1.1;o.dist=1;
  };
}});

// =====================================================================
// 2 · CENTINELA DE VASIJA (invocación) — glifo dorado; la arcilla se tornea en espiral desde el suelo como una vasija
//     con vetas que se encienden; en ti la espiral revienta en terrones y un anillo de polvo a ras de suelo acompaña la
//     salida del gólem (que sube con su propia animación ~0,4 s): nada tapa el centro por encima de 0,6 u. ti 0,55 s
// =====================================================================
defs.push({key:"sty_craft_sentinel_golem",name:"Centinela de Vasija",dur:1.35,ti:0.55,tier:3,pal:PAL,stylized:true,
  phases:[["Glifo",0],["Torno",0.08],["Estallido",0.55],["Polvo",0.7]],
build(a){
  const L=a.L,TI=0.55,CX=3.4,O=V3(CX,0,0);
  const glyph=groundPlane(3.0,CX,0.02,S.mat(GLYPH_FS,{},{mode:'energy'})); L.decal.add(glyph);
  const mat=clayMat({double:true,band:0});
  const spiral=new THREE.Mesh(helixGeo(2.4,0.66,0.4,1.55,0.24,180),mat); spiral.position.set(CX,0.02,0); L.mesh.add(spiral);
  const inner=new THREE.Mesh(helixGeo(1.6,0.42,0.3,1.1,0.16,120),mat); inner.position.set(CX,0.02,0); inner.rotation.y=2; L.mesh.add(inner);
  const ring=S.groundRing(L.decal,3.6), spark=S.hitSpark(L.mesh,1.4,{seed:0.6,life:0.2});
  // remolino de polvo dentro del torno, terrones del estallido y anillo de polvo de la salida
  a.count+=S.pts(L.part,8,VV+`void main(){float life=.5;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*5.;vec3 p=vec3(${f(CX)},0.,0.)+vec3(cos(an)*.5,.1+age*1.,sin(an)*.5);
   vA=(uT<${f(TI)})?sin(age*3.14159)*.9:0.;vK=age;vR=r.y*6.28;put(p,.2+.1*r.z);}`,DUST_FS);
  a.count+=S.pts(L.part,18,burstVS(V3(CX,0.7,0),"0.,.25,0.",1.8,3.6,7.,.55,'.18+.1*aSeed.w',TI),CHUNK_FS);
  a.count+=S.pts(L.part,16,dustRingVS(O,0.5,1.5,TI,0.75,'.36+.18*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,14,burstVS(V3(CX,0.4,0),"0.,.9,0.",.8,2.,.5,.6,'.09+.05*aSeed.w',TI,0.15),MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, rev=ss(0.06,TI-0.04,te), er=ia<0?-0.2:-0.2+1.3*ss(0,0.16,ia);
    glyph.material.uniforms.uA.value=ss(0,0.15,te); glyph.material.uniforms.uP.value=-0.1+1.1*ss(TI+0.35,1.3,te);
    for(const m of [spiral,inner]){m.visible=er<1.05;m.rotation.y+=0;}
    spiral.rotation.y=te*2.2; inner.rotation.y=2-te*2.8;
    spiral.scale.set(1+0.08*ss(TI-0.1,TI,te),1,1+0.08*ss(TI-0.1,TI,te));
    setClay(mat,0.15+0.85*ss(0.2,TI,te),er,rev);
    ring.pose(ia,CX,0,0.55,1.2); spark.pose(ia,tmp.set(CX,0.55,0),0.9);
    if(ia<0){o.g.set(CX,0.7,0);o.gs=0.8*rev;o.ga=0.12*rev;o.li=2*rev;}
    else{o.g.set(CX,0.5,0);o.gs=1.2+2*ia;o.ga=Math.exp(-ia*12)*0.3;o.li=4*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(CX,0.5,0);o.shake=0.8;o.dist=1;
  };
}});

// =====================================================================
// 3 · VETAS DE PIEDRA (aliado: +60 escudo y Arraigado; sobre el gólem, +80 de vida) — un hilo dorado sale de la mano;
//     vetas minerales trepan por el aliado, seis losas de piedra orbitan y se ajustan a su cuerpo y brotan raíces de
//     piedra a sus pies. ti 0,45 s
// =====================================================================
defs.push({key:"sty_craft_stone_veins",name:"Vetas de Piedra",dur:1.3,ti:0.45,tier:2,pal:PAL,stylized:true,
  phases:[["Hilo",0],["Vetas",0.15],["Losas",0.45],["Raíces",0.55]],
build(a){
  const L=a.L,TI=0.45,CX=3.4,H=1.9;
  const glyph=groundPlane(2.6,CX,0.02,S.mat(GLYPH_FS,{},{mode:'energy'})); L.decal.add(glyph);
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.56,H,40,1,true),S.mat(VEIN_SHELL,{},{mode:'energy'})); shell.position.set(CX,H/2,0); L.mesh.add(shell);
  const pmat=clayMat({stone:1}), plates=[];
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.3,0.08,1,1,1),pmat);L.mesh.add(m);plates.push({m,an:i*1.047+0.3,y:0.45+(i%3)*0.42});}
  const rmat=clayMat({stone:0.8}), roots=[];
  for(let i=0;i<7;i++){const an=i*0.9+0.4;const g=new THREE.ConeGeometry(0.09,0.5,7).translate(0,0.25,0);const m=new THREE.Mesh(g,rmat);
    m.position.set(CX+Math.cos(an)*0.5,0,Math.sin(an)*0.5);m.rotation.set(Math.sin(an)*0.5,0,-Math.cos(an)*0.5);L.mesh.add(m);roots.push(m);}
  const ring=S.groundRing(L.decal,2.4);
  a.count+=S.pts(L.part,24,VV+`const vec3 HA=${v3(HAND)};const vec3 B=vec3(${f(CX)},1.,0.);
  void main(){float s=aSeed.x*.3;float k=clamp((uT-s)/.22,0.,1.);vec3 m=mix(HA,B,.5)+vec3(0.,1.2,0.);
   vec3 p=mix(mix(HA,m,k),mix(m,B,k),k)+rnd()*.05;vA=(uT>s&&k<1.)?1.:0.;vK=0.;vR=aSeed.y*6.28;put(p,.08+.05*aSeed.z);}`,MOTE_FS,{mode:'energy'});
  a.count+=S.pts(L.part,8,dustRingVS(V3(CX,0,0),0.35,0.9,TI+0.05,0.5,'.24+.12*aSeed.y'),DUST_FS);
  a.pose=function(te,o){
    const ia=te-TI, k=ss(TI-0.25,TI,te), out=ss(0.9,1.25,te);
    glyph.material.uniforms.uA.value=ss(0.05,0.2,te); glyph.material.uniforms.uP.value=-0.1+1.1*out;
    shell.visible=te>0.12&&te<1.2; set(shell,ss(0.15,TI+0.12,te),1-ss(0.85,1.15,te));
    plates.forEach((p,i)=>{const an=p.an+te*(1-k)*3,r=1.45-0.9*k;
      p.m.position.set(CX+Math.cos(an)*r,p.y+0.25*(1-k),Math.sin(an)*r); p.m.rotation.set(0.15*Math.sin(i),Math.PI/2-an,0);
      p.m.scale.setScalar(Math.max(ss(0.1+i*0.03,0.28+i*0.03,te),0.001)); p.m.visible=te>0.1&&out<0.99;});
    setClay(pmat,0.4+0.6*(ia>=0?Math.exp(-ia*4):k),-0.2+1.25*out);
    const gr=ss(TI,TI+0.12,te); roots.forEach((m,i)=>{m.scale.set(1,Math.max(gr*(0.8+0.4*((i*37)%5)/5),0.001),1);m.visible=gr>0.01&&out<0.99;});
    setClay(rmat,0.3,-0.2+1.25*ss(0.95,1.28,te));
    ring.pose(ia,CX,0,0.45,0.9);
    o.em=0.35*k*(1-out); o.emc.setRGB(1,0.78,0.34);
    if(ia<0){o.g.set(CX,1,0);o.gs=0.6*k;o.ga=0.12*k;o.li=1.5+2*k;}
    else{o.g.set(CX,1,0);o.gs=1+ia;o.ga=Math.exp(-ia*10)*0.25;o.li=3*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.4;o.flash=0.4;
  };
}});

// =====================================================================
// 4 · MURALLA DE ARCILLA (casilla vacía: muro 2 rondas; +30 escudo al lanzador) — la muralla de rollos de arcilla
//     brota con polvo y terrones; al asentarse se consume para dejar paso al obstáculo real del tablero. El lanzador
//     recibe un brillo de escudo corto. ti 0,4 s
// =====================================================================
defs.push({key:"sty_craft_clay_wall",name:"Muralla de Arcilla",dur:1.2,ti:0.4,tier:2,pal:PAL,stylized:true,
  phases:[["Marca",0],["Brote",0.12],["Asiento",0.4],["Escudo",0.45]],
build(a){
  const L=a.L,TI=0.4,CX=3.4,HW=1.6;
  const mat=clayMat({band:22});
  const wall=new THREE.Mesh(new THREE.BoxGeometry(0.55,HW,1.75,2,14,6).translate(0,HW/2,0),mat); wall.position.set(CX,0,0); L.mesh.add(wall);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,1.8,14).rotateX(Math.PI/2),mat); L.mesh.add(cap);
  const glyph=groundPlane(2.4,CX,0.02,S.mat(GLYPH_FS,{},{mode:'energy'})); L.decal.add(glyph);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.85,32,16),S.mat(SHIELD_FS,{},{mode:'energy'})); dome.position.set(-3.7,0.9,0); L.mesh.add(dome);
  const ring=S.groundRing(L.decal,2.2);
  a.count+=S.pts(L.part,16,VV+`void main(){float s=${f(TI-0.12)}+aSeed.x*.1;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float side=aSeed.w<.5?-1.:1.;vec3 p=vec3(${f(CX)}+side*(.35+.6*(1.-exp(-t*4.))),.1+t*.3,(aSeed.z-.5)*1.9);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.z*6.28;put(p,(.28+.14*aSeed.y)*(.7+.5*age));}`,DUST_FS);
  a.count+=S.pts(L.part,12,burstVS(V3(CX,1.0,0),"0.,.6,0.",1.4,2.8,7.,.5,'.15+.08*aSeed.w',TI-0.06,0.08),CHUNK_FS);
  a.count+=S.pts(L.part,12,VV+`void main(){float s=${f(TI+0.02)}+aSeed.x*.25;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7,0.,0.)+vec3(cos(an)*.8,.2+t*1.3+aSeed.w*.6,sin(an)*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=aSeed.y*6.28;put(p,.08+.05*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, up=ss(0.1,TI,te), over=1+0.08*Math.sin(Math.PI*cl((te-TI)/0.15))*(ia>=0?1:0), out=ss(0.62,0.95,te);
    wall.scale.set(1,Math.max(up*over,0.001),1); wall.position.x=CX+(ia<0?0.02*Math.sin(te*60):0);
    cap.position.set(CX,HW*up*over,0); cap.scale.setScalar(Math.max(up,0.001));
    wall.visible=cap.visible=up>0.01&&out<0.99; setClay(mat,0.2+0.8*(ia>=0?Math.exp(-ia*5):up*0.4),-0.2+1.25*out);
    glyph.material.uniforms.uA.value=ss(0,0.1,te)*(1-ss(0.5,0.8,te)); glyph.material.uniforms.uP.value=0;
    const dk=cl((te-TI-0.05)/0.5); dome.visible=dk>0&&dk<1; dome.scale.setScalar(0.85+0.2*dk); set(dome,0,Math.sin(Math.PI*dk)*0.9);
    ring.pose(te-TI-0.05,-3.7,0,0.5,0.8);
    const hit=hitE(ia,8); caster.rotation.z=0.12*ss(0,0.15,te)-0.2*ss(0.15,TI,te)+0.08*ss(TI,0.8,te);
    if(ia<0){o.g.set(CX,0.6,0);o.gs=0.6*up;o.ga=0.08*up;o.li=1.5*up;}
    else{o.g.set(CX,1.2,0);o.gs=1+ia;o.ga=hit*0.2;o.li=3*hit+1.5*Math.sin(Math.PI*dk);}
    o.ia=ia;o.c.set(CX,0.8,0);o.shake=0.6;o.dist=0.8;
  };
}});

// =====================================================================
// 5 · LLEVAR AL HERIDO (aliado: cura 30–40 y lo trae junto al gólem) — una cinta de arcilla blanda sube en espiral y
//     envuelve al aliado con vetas tibias; en ti se suelta en motas de cura que suben. ti 0,5 s
// =====================================================================
defs.push({key:"sty_craft_carry_wounded",name:"Llevar al Herido",dur:1.3,ti:0.5,tier:2,pal:PAL,stylized:true,
  phases:[["Cinta",0],["Abrazo",0.3],["Cura",0.5],["Suelta",0.65]],
build(a){
  const L=a.L,TI=0.5,CX=3.4;
  const mat=clayMat({double:true});
  const rib=new THREE.Mesh(helixGeo(2.2,0.66,0.52,1.6,0.2,160),mat); rib.position.set(CX,0.05,0); L.mesh.add(rib);
  const rib2=new THREE.Mesh(helixGeo(1.8,0.6,0.5,1.4,0.14,120),mat); rib2.position.set(CX,0.1,0); rib2.rotation.y=Math.PI; L.mesh.add(rib2);
  const glyph=groundPlane(2.4,CX,0.02,S.mat(GLYPH_FS,{},{mode:'energy'})); L.decal.add(glyph);
  const ring=S.groundRing(L.decal,2.4);
  a.count+=S.pts(L.part,28,VV+`void main(){float s=${f(TI)}+aSeed.x*.35;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.;float rad=.3+.35*aSeed.w;vec3 p=vec3(${f(CX)},0.,0.)+vec3(cos(an)*rad,.3+t*1.4+aSeed.w*.5,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=aSeed.y*6.28;put(p,.1+.07*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  a.count+=S.pts(L.part,10,burstVS(V3(CX,0.9,0),"0.,.1,0.",.6,1.5,4.,.5,'.13+.07*aSeed.w',TI+0.03,0.1),CHUNK_FS);
  a.pose=function(te,o){
    const ia=te-TI, rev=ss(0.02,TI-0.05,te), er=ia<0?-0.2:-0.2+1.25*ss(0.04,0.35,ia);
    rib.rotation.y=te*2.4; rib2.rotation.y=Math.PI-te*2;
    const sq=1-0.12*ss(TI-0.2,TI,te); rib.scale.set(sq,1,sq); rib2.scale.set(sq,1,sq);
    rib.visible=rib2.visible=er<1.05; setClay(mat,0.15+0.6*ss(0.2,TI,te),er,rev);
    glyph.material.uniforms.uA.value=ss(0,0.15,te); glyph.material.uniforms.uP.value=-0.1+1.1*ss(0.85,1.25,te);
    ring.pose(ia,CX,0,0.5,0.9);
    o.em=0.35*ss(TI-0.1,TI+0.1,te)*(1-ss(0.75,1.2,te)); o.emc.setRGB(1,0.85,0.5);
    o.g.set(CX,1,0);o.gs=0.8+0.6*rev;o.ga=ia<0?0.1*rev:Math.exp(-ia*8)*0.25;o.li=ia<0?1.5*rev:3*Math.exp(-ia*4);
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.35;o.flash=0.3;
  };
}});

// =====================================================================
// 6 · FORTIFICAR (el gólem propio: +100 escudo y Espinas 20) — ocho placas de arcilla cocida vuelan y se cierran
//     sobre el gólem con las vetas encendidas; en ti brotan púas. ti 0,5 s
// =====================================================================
defs.push({key:"sty_craft_fortify",name:"Fortificar",dur:1.3,ti:0.5,tier:2,pal:PAL,stylized:true,
  phases:[["Placas",0],["Cierre",0.3],["Púas",0.5],["Asiento",0.7]],
build(a){
  const L=a.L,TI=0.5,CEN=V3(3.4,0.95,0),R=0.95;
  const mat=clayMat({stone:0.3,band:0}), plates=[];
  for(let i=0;i<8;i++){
    const ph=i*Math.PI/4, g=new THREE.SphereGeometry(R,10,10,ph+0.04,Math.PI/4-0.08,0.35,1.25);
    const m=new THREE.Mesh(g,mat); m.position.copy(CEN); L.mesh.add(m);
    const mid=ph+Math.PI/8; plates.push({m,d:V3(Math.cos(mid),0.15,-Math.sin(mid)).normalize()});
  }
  const smat=clayMat({stone:0.5}), spikes=[];
  for(let i=0;i<10;i++){const an=i*0.628,el=(i%2?0.25:-0.15);const d=V3(Math.cos(an)*Math.cos(el),Math.sin(el),-Math.sin(an)*Math.cos(el));
    const m=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.42,7).translate(0,0.21,0),smat);
    m.position.copy(CEN).addScaledVector(d,R*0.96); m.quaternion.setFromUnitVectors(V3(0,1,0),d); L.mesh.add(m); spikes.push(m);}
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.83,life:0.22}), ring=S.groundRing(L.decal,2.8);
  a.count+=S.pts(L.part,8,dustRingVS(V3(3.4,0,0),0.5,1.1,TI,0.5,'.26+.12*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,12,burstVS(V3(3.4,1.,0),"0.,.3,0.",1.2,2.6,1.2,.4,'.1+.05*aSeed.w',TI,0.04),MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, k=ss(0.05,TI,te), kk=k*k, out=ss(0.95,1.28,te);
    plates.forEach((p,i)=>{const d=1.5*(1-kk)+0.03*Math.sin(te*30+i)*(1-k);p.m.position.copy(CEN).addScaledVector(p.d,d);p.m.visible=te>0.03&&out<0.99;
      p.m.scale.setScalar(Math.max(ss(0.02,0.15,te),0.001));});
    setClay(mat,0.2+0.8*(ia>=0?Math.exp(-ia*3):kk),-0.2+1.25*out);
    const sk=ss(TI,TI+0.12,te); spikes.forEach(m=>{m.scale.set(1,Math.max(sk,0.001),1);m.visible=sk>0.01&&out<0.99;});
    setClay(smat,0.4,-0.2+1.25*out);
    spark.pose(ia,CEN,1); ring.pose(ia,3.4,0,0.5,1);
    o.em=0.25*k*(1-out); o.emc.setRGB(1,0.7,0.35);
    if(ia<0){o.g.copy(CEN);o.gs=0.6*k;o.ga=0.1*k;o.li=1.5*k;}
    else{o.g.copy(CEN);o.gs=1.2+ia;o.ga=Math.exp(-ia*12)*0.3;o.li=4*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(CEN);o.shake=0.5;o.dist=0.6;o.flash=0.3;
  };
}});

// =====================================================================
// 7 · ROTURA DEL CENTINELA (sobre sí mismo: +30 de escudo a los aliados de al lado) — la vasija se agrieta con las
//     vetas cada vez más encendidas y revienta en terrones; un anillo dorado de escudo barre la casilla vecina. ti 0,25 s
// =====================================================================
defs.push({key:"golem_break_sentinel",name:"Rotura del Centinela",dur:1.1,ti:0.25,tier:2,pal:PAL,stylized:true,
  phases:[["Grietas",0],["Estallido",0.25],["Escudo",0.35]],
build(a){
  const L=a.L,TI=0.25,CX=-3.7,O=V3(CX,0,0);
  const prof=[[0,0],[0.4,0.04],[0.55,0.35],[0.56,0.7],[0.44,1.05],[0.3,1.25],[0.33,1.4],[0.39,1.48],[0.34,1.52]].map(([r,y])=>new THREE.Vector2(r,y));
  const mat=clayMat({band:16});
  const vase=new THREE.Mesh(new THREE.LatheGeometry(prof,28),mat); vase.position.copy(O); L.mesh.add(vase);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),S.mat(SHIELD_FS,{},{mode:'energy'})); dome.position.copy(O); L.mesh.add(dome);
  const ring=S.groundRing(L.decal,4.4), spark=S.hitSpark(L.mesh,1.8,{seed:0.12,life:0.2});
  a.count+=S.pts(L.part,22,VV+`void main(){float s=${f(TI)}+aSeed.x*.03;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 o=vec3(${f(CX)},.2+aSeed.w*1.2,0.);vec3 v=vec3(cos(an),.4+aSeed.y*.8,sin(an))*(1.6+1.8*aSeed.y);
   vec3 p=o+v*t+vec3(0.,-7.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*8.;
   put(p,.18+.12*aSeed.w);}`,CHUNK_FS);
  a.count+=S.pts(L.part,12,dustRingVS(O,0.4,1.4,TI,0.6,'.32+.16*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,14,burstVS(V3(CX,0.8,0),"0.,.5,0.",1.,2.6,.6,.5,'.09+.05*aSeed.w',TI,0.05),MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, crack=ss(0,TI,te);
    vase.visible=ia<0.02; vase.position.x=CX+0.03*Math.sin(te*70)*crack; vase.scale.set(1+0.06*crack,1-0.03*crack,1+0.06*crack);
    setClay(mat,0.3+1.2*crack,-0.2);
    const dk=cl((ia-0.08)/0.5); dome.visible=ia>0.08&&dk<1; dome.scale.setScalar(0.8+1.3*(1-Math.pow(1-dk,2))); set(dome,0,Math.sin(Math.PI*dk)*0.8);
    ring.pose(ia-0.05,CX,0,0.6,1.3); spark.pose(ia,tmp.set(CX,0.8,0),1.1);
    if(ia<0){o.g.set(CX,0.8,0);o.gs=0.6*crack;o.ga=0.15*crack;o.li=2.5*crack;}
    else{o.g.set(CX,0.8,0);o.gs=1.2+2*ia;o.ga=Math.exp(-ia*10)*0.3;o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(CX,0.8,0);o.shake=1;o.dist=1;
  };
}});


VFX.module("Estilizado · Sapidae · Alfarero de Gólems",defs);
})();

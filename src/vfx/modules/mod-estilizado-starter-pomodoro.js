// =====================================================================
// ESTILIZADO · STARTER · POMODORO (Hito 101) — las 2 cartas α propias de Pomodoro, hechas a mano con el kit vfx-stylized.js.
// Claves: sty_starter_pomodoro_horn (Lost Dream) · sty_starter_pomodoro_back (Village Hero) ·
//   Hito 102: sty_starter_pomodoro_eyes (Passion α, aliado) · sty_starter_pomodoro_ears (Leaf Bug α, aliado).
// Mismos dur / ti / fases que mod-starter-pomodoro.js, así el daño y el escudo llegan igual. Nivel 2 (2 PA).
// Identidad: Pomodoro es el «Guardián de Hojas» (Bicho cocinero que se refugia bajo hojas de otoño): carmesí, ámbar y
// hojas de otoño, con el acento Sagrado (jade) y Estelar (oro y añil) de sus cartas. Sin caras ni ojos.
// Semántica (docs/VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md):
//   Lost Dream (sobre sí, 0–0): +50 de escudo y −20 % de daño recibido al lanzador; +20 de escudo a todos los aliados →
//          orbe de sueño añil con luna dorada sobre la cabeza que cae y se abre en un caparazón de placas hexagonales;
//          después 6 escuditos salen en abanico por el campo (llegan a los aliados estén donde estén).
//   Village Hero (cuerpo a cuerpo): 45–55 de daño, +10 por aliado con escudo → (Hito 104) estandarte de la aldea que carga
//          en lanza; blasones dorados bajan desde los aliados (VFX.friends, hasta 4) y entran con la estocada y el latigazo del paño.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_DREAM=pal("Sty Pomodoro · Sueño",["#ffd77a","#3f6fd0"]);
const P_HERO=pal("Sty Pomodoro · Héroe",["#ffc94a","#c2361e"]);

const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const INDIGO=lin(0x2c2f7a), INDIGOD=lin(0x15163e), GOLD=lin(0xf2b43a), GOLDD=lin(0x9a5a14), JADE=lin(0x2fae8e),
  JADED=lin(0x0f4d48), CRIMSON=lin(0xb8241c), CRIMSOND=lin(0x5e0e12), RUST=lin(0x7a2c10), DARK=lin(0x1e1414),
  LEAFO=lin(0xe0701c), LEAFR=lin(0xb8301a), EARTH=lin(0xa88860);

const CX=-3.7, TX=3.4, TC=V3(3.15,1.2,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const GOLDC=new THREE.Color(1,0.75,0.3), JADEC=new THREE.Color(0.3,0.95,0.75);

// mancha de tierra en el suelo
const STAIN=(col,alpha=.5)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.15+.3*n),m*er*uA*${f(alpha)});}`;
// onda de pincel en el suelo; uP = vida
const WAVE_FS=col=>`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float w=.05+.025*styNoise(vec2(an*2.,uP*3.)).r;float m=smoothstep(w,0.,abs(r-.9))+smoothstep(.2,0.,abs(r-.9))*.25;
 if(m<.03)discard;float er=styErode(m*.5+styNoise(vec2(an*3.,r)).g*.5,uP,.15);
 gl_FragColor=vec4(styRampOf(${col},.55+.4*m)*1.2,m*er*uA);}`;
// escudito hexagonal (partícula): placa jade con borde dorado y contorno oscuro
const HEXP_FS=S.PV+`void main(){vec2 q=(styPC()-.5)*2.;q=abs(q);float d=max(q.x*.866+q.y*.5,q.y);
 float m=step(d,.92);if(m<.5||vA<.01)discard;float rim=smoothstep(.7,.8,d);float out=smoothstep(.84,.9,d);
 vec3 c=mix(styRampOf(${JADE},.45+.3*(1.-q.y)),styRampOf(${GOLD},.75),rim);c=mix(c,${DARK},out*.8);
 gl_FragColor=vec4(c,vA);}`.replace(/\bout\b/g,'oe');
const defs=[];

// =====================================================================
// 1 · LOST DREAM (sobre sí) — sobre la cabeza de Pomodoro se infla un orbe de sueño añil con una luna creciente dorada y
//     estrellitas que lo orbitan; a 0,38 s cae sobre él y se abre en un caparazón de placas hexagonales jade con juntas
//     oscuras y borde dorado, que se sella de abajo arriba (+50 de escudo, −20 % de daño). Después 6 escuditos salen en
//     abanico por el campo (+20 de escudo a todos los aliados) y estallan en anillos dorados. ti 0,38 s
// =====================================================================
defs.push({key:"sty_starter_pomodoro_horn",name:"Lost Dream (estilizado)",dur:1.1,ti:0.38,pal:P_DREAM,tier:2,stylized:true,
  phases:[["Ensueño",0],["Escudo",0.38],["Reparto",0.5],["Escuditos",0.76]],
build(a){
  const L=a.L,TI=0.38,TB=0.5,TA=0.76,TF=0.96;
  const B0=V3(CX,2.05,0), SC=V3(CX,0.85,0);
  // orbe de sueño: noche añil con remolino y borde dorado (materia opaca, luz en bandas)
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.5,32,20),S.mat(`uniform float uQ;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
   float l=styLight(n,stySunV());float fr=1.-abs(dot(n,normalize(vV)));float sw=styNoise(vUv*vec2(3.,1.5)+vec2(uT*.4,0.)).r;
   if(styErode(sw,uQ,.06)<.5)discard;
   vec3 c=styRampOf(mix(${INDIGOD},${INDIGO},.4+.6*sw),.25+.45*l)*styTint(l);
   c=mix(c,styRampOf(${GOLD},.8),smoothstep(.72,.9,fr)*.9);gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1}},{mode:'solid'}));
  L.mesh.add(orb); const oU=orb.material.uniforms;
  // luna creciente dorada (billboard delante del orbe)
  const moon=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.62),S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float d=max(r-.8,-(length(p-vec2(.38,.22))-.7));float m=smoothstep(.04,-.02,d);if(m<.05)discard;
   float o=smoothstep(-.12,-.04,d);gl_FragColor=vec4(mix(styRampOf(${GOLD},.7+.25*p.y),${GOLDD},o*.8),m*uA);}`,{},{mode:'matter',depthTest:false}));
  L.mesh.add(moon);
  // caparazón hexagonal: placas jade, juntas oscuras, borde dorado; se sella de abajo arriba (uS) y se erosiona (uQ)
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1.08,48,28),S.mat(`uniform float uS;uniform float uQ;uniform float uK;uniform float uL;void main(){
   vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());float fr=1.-abs(dot(n,normalize(vV)));
   vec2 g=vec2(atan(vP.z,vP.x)*2.6,vP.y*3.);vec2 r=vec2(1.,1.732);vec2 h=r*.5;vec2 a1=mod(g,r)-h;vec2 b1=mod(g-h,r)-h;
   vec2 gv=dot(a1,a1)<dot(b1,b1)?a1:b1;vec2 q=abs(gv);float hd=max(q.x*.866+q.y*.5,q.y);
   float seam=smoothstep(.4,.46,hd);float y=vP.y/1.08*.5+.5;float sealed=step(y,uS);if(sealed<.5)discard;
   float nz=styNoise(vUv*3.).r;if(styErode(nz,uQ,.08)<.5)discard;
   float front=smoothstep(uS-.06,uS,y);
   vec3 plate=styRampOf(mix(${JADED},${JADE},.55+.3*nz),.3+.45*l)*styTint(l);
   vec3 c=mix(plate,mix(${DARK},styRampOf(${GOLD},.8),uL*.85),seam*.9);c=mix(c,styRampOf(${GOLD},.85),front*.9+smoothstep(.75,.92,fr)*.5);c+=vec3(.4,1.,.8)*uK*(1.-seam);
   float fill=mix(.35,.08,uL);float al=mix(fill,.95,max(fr*fr*(1.-uL*.6),seam))+front;gl_FragColor=vec4(c,clamp(al,0.,1.)*uA);}`,
   {uS:{value:0},uQ:{value:-1},uK:{value:0},uL:{value:0}},{mode:'matter',side:THREE.DoubleSide,depthWrite:false}));
  shell.position.copy(SC); L.mesh.add(shell); const shU=shell.material.uniforms;
  const ring=S.groundRing(L.decal,3.0);
  const wave=groundPlane(1,CX,0.035,S.mat(WAVE_FS(GOLD),{},{mode:'energy'})); L.decal.add(wave);
  const K=`const float TI=${f(TI)};const float TB=${f(TB)};const float TA=${f(TA)};const vec3 B0=${v3(B0)};const vec3 SC=${v3(SC)};`;
  // estrellitas que orbitan el orbe y luego el caparazón
  S.pts(L.part,12,VV+K+`void main(){float an=aSeed.x*6.2832+uT*4.;float drop=smoothstep(TI-.06,TI+.04,uT);
   vec3 c=mix(B0,SC+vec3(0.,.4,0.),drop);float rad=mix(.75,1.25,drop)+.1*sin(uT*9.+aSeed.y*6.);
   vec3 p=c+vec3(cos(an)*rad,(aSeed.y-.5)*.6,sin(an)*rad*.8);vA=smoothstep(0.,.12,uT)*(1.-smoothstep(.85,1.05,uT));vK=0.;vR=uT*3.;
   put(p,.2+.1*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // 6 escuditos que salen en abanico por el campo y estallan
  S.pts(L.part,6,VV+K+`void main(){float i=mod(float(gl_VertexID),6.);float an=i*1.0472+.52;float u=clamp((uT-TB)/(TA-TB),0.,1.);
   float rad=mix(.9,3.6,u*u*(3.-2.*u));vec3 p=vec3(${f(CX)}+cos(an)*rad,1.2+1.4*sin(u*3.1416)-.6*u,sin(an)*rad);
   float pop=smoothstep(TA,TA+.12,uT);vA=(uT>TB&&uT<TA+.14)?1.-pop:0.;vK=0.;vR=uT*2.;put(p,(.55+.25*sin(u*3.1416))*(1.+pop*.6));}`,HEXP_FS);
  // anillos dorados donde estallan los escuditos
  S.pts(L.part,6,VV+K+`void main(){float i=mod(float(gl_VertexID),6.);float an=i*1.0472+.52;float t=uT-TA;
   vec3 p=vec3(${f(CX)}+cos(an)*3.6,.6,sin(an)*3.6);vA=(t>0.&&t<.3)?1.-t/.3:0.;vK=smoothstep(.05,.3,t);vR=0.;put(p,.6+t*3.);}`,
   S.ENERGY_FS(C.ring,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    const grow=ss(0,0.3,te), drop=ss(TI-0.08,TI,te);
    orb.visible=te<TI+0.02; orb.position.set(B0.x,B0.y-1.1*drop*drop+0.06*Math.sin(te*10),B0.z);
    orb.scale.setScalar(Math.max(0.35+0.95*grow,0.001)*(1+0.2*drop)); oU.uQ.value=te>TI-0.04?-0.1+1.2*ss(TI-0.04,TI+0.02,te):-1;
    moon.visible=orb.visible; towardCam(moon.position,tmp.copy(orb.position),0.62*orb.scale.x); billboard(moon,0.15*Math.sin(te*3));
    moon.scale.setScalar(Math.max(orb.scale.x,0.001)); moon.material.uniforms.uA.value=1;
    shell.visible=te>=TI-0.01&&te<1.08; shU.uS.value=-0.05+1.15*ss(TI,TI+0.13,te);
    shU.uL.value=ss(TI+0.14,TB+0.05,te); shU.uQ.value=te>TF?-0.1+1.1*ss(TF,1.08,te):-1; shU.uK.value=0.6*hitE(te-(TI+0.13),9);
    shell.material.uniforms.uA.value=1; shell.scale.setScalar(1+0.04*Math.sin(te*14)*ss(TI,TB,te));
    ring.pose(ia,CX,0,0.45,1);
    const wp=cl((te-TB)/0.32); wave.visible=te>TB&&wp<1; wave.scale.setScalar(Math.max(1.5+6.5*(1-Math.pow(1-wp,2)),0.001)); set(wave,0.05+0.9*wp,0.8);
    const sq=hitE(ia,12); caster.scale.set(1+0.05*sq,1-0.07*sq,1+0.05*sq);
    glowOf(caster,JADEC,0.35*ss(TI,TI+0.1,te)*(1-ss(0.8,1.05,te)));
    o.em=0; o.emc.setRGB(0.4,1,0.8);
    o.g.copy(SC); o.gs=1.1; o.ga=0.1+0.14*ss(TI,TI+0.1,te)*(1-ss(0.85,1.05,te)); o.li=1.4+2.2*hitE(ia,6);
    o.ia=ia; o.c.copy(SC); o.shake=0.08*sq; o.dist=0; o.flash=0.2;
  };
}});

// =====================================================================
// 2 · VILLAGE HERO (Hito 104) — Pomodoro alza el estandarte de la aldea (asta de madera oscura con moharra dorada y paño
//     carmesí con orla y hoja de oro, cola de golondrina) y carga con él: el estandarte se inclina en lanza y avanza
//     levantando un surco de polvo. Por cada aliado con escudo (VFX.friends con shield===true, hasta 4 · el bonus) baja desde
//     su lado un pequeño blasón dorado que se une al paño y entra con el golpe. Impacto (0,28 s): estocada con la moharra
//     del asta y latigazo del paño, que gira alrededor del asta y deja un arco carmesí; esquirlas doradas y hojas. ti 0,28 s
// =====================================================================
defs.push({key:"sty_starter_pomodoro_back",name:"Village Hero (estilizado)",dur:0.75,ti:0.28,pal:P_HERO,tier:2,stylized:true,
  zoneCaster:0.5,zoneTarget:1.6,
  phases:[["Estandarte",0],["Carga",0.1],["Estocada",0.28],["Disipación",0.42]],
build(a){
  const L=a.L,TC0=0.1,TI=0.28,TD=0.42;
  const PL=2.3, CW=1.3, CH=0.85, NE=4;
  const WOOD=lin(0x4a2a16), WOODD=lin(0x1f120a);
  // asta: grupo con el pie en el agarre; rotation.z=-th la inclina hacia el rival
  const pole=new THREE.Group(); L.mesh.add(pole);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.052,PL,10,1).translate(0,PL/2,0),S.mat(`uniform float uQ;void main(){vec3 n=normalize(vN);
   float l=styLight(n,stySunV());float g=styNoise(vec2(vUv.x*2.,vUv.y*9.)).r;if(styErode(g,uQ,.06)<.5)discard;
   vec3 c=styRampOf(mix(${WOODD},${WOOD},.55+.45*g),.2+.5*l)*styTint(l);c=mix(c,${GOLDD},step(.9,vUv.y)*step(vUv.y,.93)*.9);gl_FragColor=vec4(c,1.);}`,
   {uQ:{value:-1}},{mode:'solid'}));
  pole.add(shaft);
  const METAL=`uniform float uQ;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   float g=styNoise(vUv*3.).g;if(styErode(g,uQ,.06)<.5)discard;float fr=1.-abs(dot(n,normalize(vV)));
   vec3 c=styRampOf(${GOLD},.35+.55*l)*styTint(l);c=mix(c,${GOLDD},smoothstep(.75,.95,fr)*.8);gl_FragColor=vec4(c,1.);}`;
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.42,4,1).translate(0,PL+0.21,0),S.mat(METAL,{uQ:{value:-1}},{mode:'solid'}));
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.28,6).rotateZ(Math.PI/2).translate(-0.02,PL-0.1,0),S.mat(METAL,{uQ:{value:-1}},{mode:'solid'}));
  pole.add(tip,bar);
  // paño: plano subdividido que ondea en CPU (lado -x del asta); sombra de pliegues con la misma onda en el shader
  const cg=new THREE.PlaneGeometry(CW,CH,20,6).translate(-CW/2,PL-0.1-CH/2,0);
  const cBase=Float32Array.from(cg.attributes.position.array);
  const cloth=new THREE.Mesh(cg,S.mat(`uniform float uQ;uniform float uAmp;uniform float uPh;void main(){
   float u=1.-vUv.x;float v=vUv.y-.5;
   float sw=u>.78?step(abs(v),(u-.78)*2.3):0.;if(sw>.5)discard;
   float nz=styNoise(vUv*vec2(2.,1.3)+.21).r;if(styErode(nz*.7+u*.3,uQ,.08)<.5)discard;
   float slope=uAmp*(cos(6.*u-uPh)*6.*u+sin(6.*u-uPh));float l=clamp(.55-slope*1.6,0.,1.);
   float hem=max(step(.86,abs(v)*2.),step(u,.06));float tailE=u>.7?smoothstep(.06,0.,abs(abs(v)-(u-.78)*2.3)-.0):0.;
   vec2 lp=vec2((u-.42)*2.4,v*2.6);float leaf=length(vec2(lp.x,lp.y*1.9))-.5+.12*lp.y;float lm=smoothstep(.04,-.02,leaf);
   float rib=smoothstep(.04,0.,abs(lp.x))*step(leaf,0.);
   vec3 c=styRampOf(mix(${CRIMSOND},${CRIMSON},.55+.3*nz),.22+.5*l)*styTint(l);
   c=mix(c,styRampOf(${GOLD},.35+.45*l),max(hem*(1.-step(.92,abs(v)*2.)),lm));c=mix(c,${GOLDD},rib*.9);
   c=mix(c,${DARK},max(step(.93,abs(v)*2.),tailE)*.75);gl_FragColor=vec4(c,1.);}`,
   {uQ:{value:-1},uAmp:{value:0},uPh:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  pole.add(cloth); const clU=cloth.material.uniforms;
  const qMats=[shaft,tip,bar,cloth].map(m=>m.material.uniforms.uQ);
  // blasones dorados de los aliados (escudo de punta con hoja), en billboard
  const EMB_FS=`uniform float uG;void main(){vec2 p=(vUv-.5)*2.;p.y-=.05;float hw=p.y>0.?.74:.74*sqrt(max(0.,1.-p.y*p.y));
   float d=max(abs(p.x)-hw,max(p.y-.78,-p.y-1.));float m=smoothstep(.05,-.02,d);if(m<.05)discard;
   float rim=smoothstep(-.2,-.11,d);float oe=smoothstep(-.07,-.02,d);
   vec2 lp=vec2(p.x*1.9,(p.y-.02)*1.15);float leaf=length(lp)-.5+.15*lp.y;float lm=smoothstep(.05,-.02,leaf);
   vec3 c=styRampOf(${CRIMSON},.35+.25*(1.-p.y));c=mix(c,styRampOf(${GOLD},.65+.25*p.y),max(rim,lm));c=mix(c,${GOLDD},smoothstep(.05,0.,abs(p.x))*lm*.8);
   c=mix(c,${DARK},oe*.85);c+=vec3(1.,.7,.3)*uG;gl_FragColor=vec4(c,m*uA);}`;
  const embs=[]; for(let i=0;i<NE;i++){const e=new THREE.Mesh(new THREE.PlaneGeometry(0.46,0.52),S.mat(EMB_FS,{uG:{value:0}},{mode:'matter',depthWrite:false}));e.renderOrder=3;L.mesh.add(e);embs.push(e);}
  // latigazo del paño: arco carmesí con orla dorada que barre delante del rival y se deshilacha
  const grp=new THREE.Group(); grp.position.set(2.95,1.25,0.3); grp.rotation.set(-0.2,0.3,-0.35); L.mesh.add(grp);
  const whip=new THREE.Mesh(new THREE.RingGeometry(0.75,1.05,64,1,-1.6,3.6),S.mat(`uniform float uEr;void main(){vec2 p=vP.xy;float ang=atan(p.y,p.x);
   float sw=clamp((2.-ang)/3.6,0.,1.);float rr=(length(p)-.75)/.3;float vis=step(sw,uP);
   float nz=styNoise(vec2(sw*7.,rr*2.)).g;float w=(1.-abs(rr-.5)*2.)*smoothstep(0.,.3,sw)*smoothstep(1.,.7,sw);
   float m=smoothstep(.05,.25,w+(nz-.5)*.3)*vis;if(m<.05)discard;if(styErode(nz*.6+(1.-sw)*.4,uEr,.1)<.5)discard;
   float fold=.5+.5*sin(sw*26.+rr*3.);vec3 c=styRampOf(mix(${CRIMSOND},${CRIMSON},.5+.4*fold),.3+.4*fold);
   c=mix(c,styRampOf(${GOLD},.7),smoothstep(.3,.15,w)*step(.5,rr));c=mix(c,${DARK},smoothstep(.22,.08,w)*step(rr,.5)*.8);
   float head=smoothstep(uP-.1,uP,sw);c+=vec3(1.,.6,.3)*head*.25;gl_FragColor=vec4(c,m);}`,
   {uEr:{value:-1}},{mode:'matter',side:THREE.DoubleSide,depthWrite:false}));
  grp.add(whip); const wU=whip.material.uniforms;
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.29});
  const ring=S.groundRing(L.decal,2.8);
  // surco de polvo a lo largo de la carga, construido a lo largo completo; uF = frente (x) del agarre
  const FL=6.6, F0=-3.5;
  const furrow=new THREE.Mesh(new THREE.PlaneGeometry(FL,0.8,60,1).rotateX(-Math.PI/2),S.mat(`uniform float uF;void main(){float x=${f(F0)}+vUv.x*${f(FL)};
   float v=abs(vUv.y-.5)*2.;float n=styNoise(vec2(vUv.x*4.,vUv.y*.7)).r;float m=smoothstep(1.,.55,v+(n-.5)*.5)*smoothstep(uF+.1,uF-.5,x)*smoothstep(${f(F0)},${f(F0+.6)},x);
   if(m<.02)discard;float er=styErode(n*.7+(1.-v)*.3,uP,.14);gl_FragColor=vec4(styRampOf(${EARTH},.15+.3*n),m*er*uA*.45);}`,{uF:{value:-9}},{mode:'matter'}));
  furrow.position.set(F0+FL/2,0.026,0); L.decal.add(furrow); const fU=furrow.material.uniforms;
  const K=`const float TI=${f(TI)};const vec3 HC=${v3(TC)};`;
  // esquirlas doradas y hojas de otoño en el golpe; las hojas caen después
  S.pts(L.part,12,VV+K+`void main(){float t=uT-TI;vec3 r=rnd();vec3 dir=normalize(vec3(abs(r.x)*.7+.2,r.y*.8+.4,r.z));
   vec3 p=HC+dir*t*(4.+1.5*aSeed.z)+vec3(0.,-t*t*8.,0.);vA=(t>0.&&t<.26)?1.:0.;vK=smoothstep(.1,.26,t);vR=aSeed.w*6.28;put(p,.18+.08*aSeed.z);}`,
   S.MATTER_FS(C.shard,{relief:5,col:GOLD,bias:.05}));
  S.pts(L.part,14,VV+K+`void main(){float t=uT-TI;vec3 r=rnd();vec3 dir=normalize(vec3(r.x*.8+.3,abs(r.y)*.7+.5,r.z));
   float ou=1.-exp(-t*6.);vec3 p=HC+dir*ou*(1.3+.8*aSeed.z)+vec3(sin(t*7.+aSeed.x*6.)*.2,-t*t*1.6,0.);
   vA=(t>0.)?1.-smoothstep(.32,.45,t):0.;vK=smoothstep(.28,.45,t);vR=aSeed.w*6.28+t*5.*(r.x);put(p,.42+.18*aSeed.z);}`,
   S.MATTER_FS(C.leaf,{relief:5,col:`mix(${LEAFO},${LEAFR},step(.5,vMix))`,bias:0}));
  const ease=(x)=>x*x*(3-2*x);
  // punto del marco del asta (px,py) → espacio del efecto
  const poleAt=(out,px,py,th,G)=>out.set(G.x+px*Math.cos(th)+py*Math.sin(th),G.y-px*Math.sin(th)+py*Math.cos(th),G.z);
  const G0=V3(CX+0.32,0.72,0.18), G=V3(0,0,0), GI=V3(0,0,0), cc=V3(0,0,0), src=V3(0,0,0), mid=V3(0,0,0), ep=V3(0,0,0);
  const TH0=-0.18, THI=1.7;
  GI.set(TC.x-Math.sin(THI)*(PL+0.12)+0.0,TC.y-Math.cos(THI)*(PL+0.12),TC.z);
  const pos=cg.attributes.position;
  a.pose=function(te,o){
    const ia=te-TI;
    // inclinación y agarre: alzado → carga acelerada → estocada (tip en el rival) → retroceso y erosión
    const lev=ss(0.08,0.25,te);
    const th=TH0+(THI-TH0)*lev - 0.12*hitE(ia,9)*(ia>0?1:0);
    const ch=Math.pow(ss(TC0,TI,te),1.6);
    const rec=ia>0?0.35*(1-Math.exp(-ia*10)):0;
    G.lerpVectors(G0,GI,ch); G.x-=rec*Math.sin(THI); G.y+=0.25*Math.sin(Math.PI*ss(TC0,TI,te))*0.4;
    G.y+=0.08*ss(0,0.08,te)*(1-lev);
    pole.position.copy(G); pole.rotation.set(0,0,-th);
    const fade=-0.1+1.1*ss(TD,0.72,te);
    for(const q of qMats)q.value=fade;
    pole.visible=te<0.74;
    // ondeo del paño + latigazo (gira alrededor del asta)
    const sp=ss(TC0,TI,te)*(1-ss(TI,0.5,te));
    const amp=0.06+0.1*sp+0.16*hitE(ia,5)*(ia>0?1:0), ph=te*(18+14*sp);
    clU.uAmp.value=amp; clU.uPh.value=ph;
    const p=pos.array;
    for(let i=0;i<pos.count;i++){const x=cBase[i*3],y=cBase[i*3+1];const u=-x/CW;
      p[i*3]=x; p[i*3+1]=y-0.06*u*u*(1-lev*0.5); p[i*3+2]=amp*u*Math.sin(6*u-ph);}
    pos.needsUpdate=true;
    cloth.rotation.y=ia>0?2.4*Math.sin(ia*13)*Math.exp(-ia*5):0;
    // blasones: bajan desde cada aliado hasta el paño, viajan con él y entran con la estocada
    const fr=(VFX.friends||[]).filter(u=>u&&u.shield===true); const n=Math.min(NE,fr.length);
    for(let i=0;i<NE;i++){const e=embs[i];const eU=e.material.uniforms;
      if(i>=n){e.visible=false;continue;}
      const t0=0.02+0.025*i, t1=0.2+0.012*i;
      const off=(i-(n-1)/2)*0.24;
      poleAt(cc,-CW*0.45+0.12*Math.abs(off),PL-0.1-CH*0.5+off*0.9,th,G); cc.z+=0.12;
      src.set(fr[i].x,3.3,fr[i].z);
      let sc=1, gl=0;
      if(te<t1){const u=ease(cl((te-t0)/(t1-t0),0,1)); mid.set((src.x+cc.x)/2,Math.max(src.y,cc.y)+0.4,(src.z+cc.z)/2);
        ep.copy(src).lerp(mid,u).lerp(tmp.copy(mid).lerp(cc,u),u); sc=0.7+0.3*u; gl=0.15*(1-u);}
      else if(te<TI){ep.copy(cc);}
      else{const u=cl(ia/0.05,0,1); ep.copy(cc).lerp(TC,ease(u)); gl=0.4*u; sc=1+0.6*cl((ia-0.05)/0.08,0,1);}
      e.position.copy(ep); billboard(e,0.15*Math.sin(te*9+i)); e.scale.setScalar(sc);
      eU.uG.value=gl; eU.uA.value=te<t0?0:(ia>0.05?1-cl((ia-0.05)/0.08,0,1):ss(t0,t0+0.04,te));
      e.visible=eU.uA.value>0.01;
    }
    // surco de polvo detrás del agarre
    furrow.visible=te>0.1; fU.uF.value=G.x+0.3; fU.uA.value=ss(0.1,0.16,te); fU.uP.value=0.05+0.9*ss(0.35,0.74,te);
    // arco del latigazo
    wU.uP.value=ss(TI-0.01,TI+0.08,te); wU.uEr.value=-0.1+1.1*ss(TI+0.08,0.6,te); whip.visible=te>TI-0.01&&te<0.62;
    // Pomodoro da medio paso al alzar y cargar
    const lunge=ss(0.02,0.16,te)*(1-ss(TD,0.66,te));
    caster.position.x=CX+0.5*lunge; caster.rotation.z=-0.1*ss(0.05,0.15,te)*(1-ss(TI,TI+0.1,te));
    spark.pose(ia,tmp2.copy(TC),1.05); ring.pose(ia,TX,0,0.4,1);
    const hit=hitE(ia,13);
    target.position.x=TX+0.22*hit; target.rotation.z=-0.1*hit; target.scale.set(1+0.07*hit,1-0.09*hit,1+0.07*hit);
    glowOf(caster,GOLDC,0.3*ss(0.0,0.1,te)*(1-ss(TI,0.5,te)));
    o.em=0.55*hit; o.emc.setRGB(1,0.7,0.3);
    o.g.copy(TC); o.gs=1; o.ga=0.15*hit; o.li=1.5+3*hit;
    o.ia=ia; o.c.copy(TC); o.shake=0.2*hit; o.dist=0; o.flash=0.25;
  };
}});

// =====================================================================
// Hito 102 · cartas α que antes usaban el efecto de su carta base (con otro objetivo) y caían en el lanzador
// =====================================================================
const P_PASSION=pal("Sty Pomodoro · Pasión",["#ff9ab8","#c2304e"]);
const P_LEAF=pal("Sty Pomodoro · Insecto hoja",["#9fd86a","#2f7a3a"]);
const ROSE=lin(0xe0506e), ROSED=lin(0x6e1630), EMBER=lin(0xff8a3a), WISP=lin(0x3a2450), HEALG=lin(0x6fd86f),
  LEAFG=lin(0x5aa83a), LEAFGD=lin(0x1f4a22), VEIN=lin(0xb8301a);
const PINKC=new THREE.Color(1,0.45,0.6), HEALC=new THREE.Color(0.42,1,0.55), LEAFC=new THREE.Color(0.5,1,0.45);
const PLUS_FS=S.PV+`void main(){vec2 q=styPC()-.5;float m=max(step(abs(q.x),.1)*step(abs(q.y),.33),step(abs(q.y),.1)*step(abs(q.x),.33));
 if(m<.5||vA<.01)discard;gl_FragColor=vec4(styRampOf(${HEALG},.75+.25*step(abs(q.x),.05))*1.15,vA);}`;
// pluma de rosa (partícula): raquis oscuro, barbas rosa con punta de brasa, contorno oscuro
const FEATHER_P=S.PV+`void main(){vec2 q=(styPC()-.5)*2.;float c=cos(vR),s=sin(vR);q=mat2(c,-s,s,c)*q;
 float w=.34*(1.-q.y*q.y)*step(abs(q.y),1.);float d=abs(q.x)-w;float m=smoothstep(.05,-.03,d);if(m*vA<.05)discard;
 float rach=smoothstep(.06,.0,abs(q.x));float barb=.5+.5*sin(q.y*26.+abs(q.x)*14.);float tip=smoothstep(.3,.9,q.y);
 vec3 col=mix(styRampOf(${ROSE},.4+.35*barb),styRampOf(${EMBER},.8),tip*vK);col=mix(col,${ROSED},max(rach*.8,smoothstep(-.1,-.01,d)*.8));
 gl_FragColor=vec4(col,m*vA);}`;
// silueta de insecto hoja (plano): cuerpo de hoja con nervios carmesí, 6 patas finas y antenas, contorno oscuro; uQ = erosión
const LEAFBUG_FS=`uniform float uQ;void main(){vec2 p=(vUv-.5)*2.;vec2 b=p*vec2(1.,1.9);
 float body=length(b*vec2(1.,1.))-.62+.12*b.x*b.x;float leaf=smoothstep(.04,-.03,body);
 float legs=0.;for(int i=0;i<3;i++){float x=-.35+.35*float(i);float kx=x+.18*sign(p.y)*abs(p.y);
   legs=max(legs,smoothstep(.035,.0,abs(p.x-kx-.12*abs(p.y)))*step(.28,abs(p.y))*step(abs(p.y),.75));}
 float ant=smoothstep(.03,.0,abs(p.y-(p.x-.55)*.9*sign(p.y+1e-3)*.6))*step(.55,p.x)*step(p.x,.95)*step(abs(p.y),.28);
 float m=max(leaf,max(legs,ant));if(m<.05)discard;float nz=styNoise(p*.6+.3).r;if(styErode(nz,uQ,.08)<.5)discard;
 float mid=smoothstep(.03,0.,abs(b.y))*step(body,0.);float side=smoothstep(.035,0.,abs(fract((b.x+abs(b.y)*.9)*3.)-.5)-.44)*step(body,-.05);
 float rim=smoothstep(-.12,-.02,body)*leaf;
 vec3 col=styRampOf(${LEAFG},.35+.35*nz+.2*(1.-abs(b.y)));col=mix(col,${VEIN},max(mid,side*.6));col=mix(col,${LEAFGD},max(rim*.85,(legs+ant)*(1.-leaf)));
 gl_FragColor=vec4(col*styTint(.6),1.);}`;
// coraza de hojas (esfera): escamas de hoja superpuestas, juntas oscuras, se sella de abajo arriba (uP) y se erosiona (uQ)
const LEAFSHELL_FS=`uniform float uQ;uniform float uP2;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
 vec3 L=stySunV();float l=styLight(n,L);float h=vP.y/.9*.5+.5;if(h>uP2)discard;
 float an=atan(vP.z,vP.x);vec2 g=vec2(an*1.6,h*5.);vec2 c=fract(g+vec2(.5*floor(g.y),0.))-.5;float sc=length(c*vec2(1.,1.6));
 float seam=smoothstep(.43,.5,sc);float nz=styNoise(g*.4).r;if(styErode(nz,uQ,.08)<.5)discard;
 vec3 col=styRampOf(${LEAFG},clamp(.45+.45*l+.15*(1.-sc)+(nz-.5)*.1,0.,1.))*styTint(l);col=mix(col,${LEAFGD},seam*.9);
 float front=smoothstep(.06,0.,uP2-h);col+=vec3(.5,.9,.3)*front;
 float a=mix(.22,.95,seam)+front*.5;gl_FragColor=vec4(col,min(a,1.)*uA);}`;

// =====================================================================
// 3 · PASSION α (aliado 0–3) — cura 5 y quita hasta 3 perjuicios: dos abanicos de plumas de rosa se abren en Pomodoro y
//     baten; 8 plumas con punta de brasa vuelan en arco al ALIADO y lo envuelven (0,6 s); volutas oscuras de los
//     perjuicios se le despegan y suben deshaciéndose; cruces verdes y brillo rosa. ti 0,6 s
// =====================================================================
defs.push({key:"sty_starter_pomodoro_eyes",name:"Passion α (estilizado)",dur:1.3,ti:0.6,pal:P_PASSION,tier:1,stylized:true,receiver:'target',
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Abanicos",0],["Plumas",0.24],["Llegada",0.6],["Limpieza",0.66],["Fin",1.1]],
build(a){
  const L=a.L,TF=0.24,TI=0.6,TW=0.66;
  const spark=S.hitSpark(L.mesh,1.0,{seed:0.29}), ring=S.groundRing(L.decal,2.4);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float TW=${f(TW)};const vec3 HC=vec3(${f(CX)},1.55,0.);const vec3 AC=vec3(${f(TX)},1.0,0.);`;
  // abanicos: 2 × 6 plumas que se abren detrás de la cabeza y baten una vez
  S.pts(L.part,12,VV+K+`void main(){float i=mod(float(gl_VertexID),12.);float side=i<6.?-1.:1.;float j=mod(i,6.);
   float open=smoothstep(0.,.16,uT)*(1.-smoothstep(TF+.02,TF+.1,uT));float beat=sin(clamp((uT-.14)/.12,0.,1.)*3.14159)*.35;
   float an=side*(.3+j*.27*open+beat)+1.5708;vec3 p=HC+vec3(-.2,0.,0.)+vec3(cos(an)*.8,sin(an)*.8-.05,side*.32);
   vA=open>.02?1.:0.;vK=.6;vR=an-1.5708;put(p,1.05*open);}`,FEATHER_P,{mode:'matter'});
  // 8 plumas que vuelan al aliado (arco alto, girando) y se quedan orbitando un momento
  S.pts(L.part,8,VV+K+`void main(){float i=mod(float(gl_VertexID),8.);float s=TF+i*.025;float u=clamp((uT-s)/(TI-TF-.06),0.,1.);
   float an0=i*.785;vec3 a0=HC+vec3(cos(an0)*.5,sin(an0)*.4,sin(an0)*.3);float orb=uT-TI;
   vec3 a1=AC+vec3(cos(an0+orb*7.)*.55,.2*sin(an0*2.)+orb*.6,sin(an0+orb*7.)*.48);
   vec3 p=mix(a0,a1,u*u*(3.-2.*u));p.y+=1.3*sin(u*3.14159)*(1.-step(1.,u));
   vA=(uT>s&&orb<.32)?1.-smoothstep(.2,.32,orb):0.;vK=1.;vR=uT*9.+i;put(p,.72);}`,FEATHER_P,{mode:'matter'});
  // brasas detrás de las plumas
  S.pts(L.part,24,VV+K+`void main(){float i=mod(float(gl_VertexID),8.);float s0=TF+i*.025;float s=s0+aSeed.y*(TI-TF-.08);
   float u=clamp((s-s0)/(TI-TF-.06),0.,1.);float age=(uT-s)/.22;float an0=i*.785;vec3 a0=HC+vec3(cos(an0)*.5,sin(an0)*.4,sin(an0)*.3);
   vec3 p=mix(a0,AC,u*u*(3.-2.*u))+rnd()*.07;p.y+=1.3*sin(u*3.14159);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.18);}`,S.ENERGY_FS(C.flame,{gain:1.}),{mode:'energy'});
  // volutas oscuras de los perjuicios que se despegan del aliado y suben (limpieza)
  S.pts(L.part,12,VV+K+`void main(){float s=TW+aSeed.x*.18;float age=(uT-s)/(.42+aSeed.y*.15);float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)}+cos(an)*(.35+age*.5),.5+aSeed.w*.6+age*1.4,sin(an)*(.3+age*.4));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+age;put(p,(.42+.2*aSeed.w)*(1.-.3*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:WISP,bias:-.1}));
  // cruces de cura
  S.pts(L.part,6,VV+K+`void main(){float s=TI+.08+aSeed.x*.2;float age=(uT-s)/.4;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(TX)}+cos(an)*.48,.4+age*1.4,sin(an)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3);}`,PLUS_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.scale.y=1+0.04*Math.sin(cl((te-0.14)/0.12)*Math.PI);
    spark.pose(ia,tmp.set(TX,1.1,0),0.6); ring.pose(ia,TX,0,0.42,1);
    const h=ss(TI-0.04,TI+0.04,te)*(1-ss(TI+0.35,1.2,te));
    glowOf(target,PINKC,0.5*h); glowOf(caster,PINKC,0.3*ss(0.05,0.15,te)*(1-ss(TF,TF+0.15,te)));
    target.scale.y=1+0.04*hitE(ia,9);
    o.em=0; o.emc.setRGB(1,0.5,0.6);
    o.g.set(TX,1.1,0); o.gs=0.9; o.ga=0.1*h; o.li=1.2+2*h;
    o.ia=ia; o.c.set(TX,1.0,0); o.shake=0; o.dist=0; o.flash=0.15;
  };
}});

// =====================================================================
// 4 · LEAF BUG α (OREJAS, aliado 0–3) — +60 de escudo y −20 % de daño recibido: un insecto hoja (silueta de hoja con
//     nervios carmesí, patas y antenas, sin cara) brota del suelo junto a Pomodoro y salta en dos arcos hasta el ALIADO;
//     al llegar (0,75 s) se deshace en hojas que giran y cierran una coraza de escamas de hoja de abajo arriba, con
//     escuditos hexagonales que orbitan (protegido). Al final la coraza se deshoja. ti 0,75 s
// =====================================================================
defs.push({key:"sty_starter_pomodoro_ears",name:"Leaf Bug α (estilizado)",dur:1.4,ti:0.75,pal:P_LEAF,tier:2,stylized:true,receiver:'target',
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Brote",0],["Saltos",0.14],["Coraza",0.75],["Protegido",0.9],["Fin",1.25]],
build(a){
  const L=a.L,TS=0.14,TM=0.45,TI=0.75,TG=0.9;
  const P0=V3(CX+0.7,0.35,0.35), PM=V3((CX+TX)/2,0.35,0.2), P1=V3(TX-0.1,1.55,0.15);
  const bug=new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.8),S.mat(LEAFBUG_FS,{uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide}));
  L.mesh.add(bug);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(0.9,32,18),S.mat(LEAFSHELL_FS,{uQ:{value:-1},uP2:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  shell.position.set(TX,0.72,0); L.mesh.add(shell);
  const ring=S.groundRing(L.decal,2.6), spark=S.hitSpark(L.mesh,0.9,{seed:0.61});
  const sprout=groundPlane(1.4,P0.x,0.025,S.mat(STAIN(EARTH,.45),{},{mode:'matter'})); sprout.position.z=P0.z; L.decal.add(sprout);
  const K=`const float TI=${f(TI)};const float TG=${f(TG)};const float TM=${f(TM)};const vec3 AC=vec3(${f(TX)},.72,0.);`;
  // hojas que suelta en cada salto y el remolino que cierra la coraza
  S.pts(L.part,24,VV+K+`void main(){bool sw=aSeed.x>.35;float t=uT-(sw?TI-.06:TM);vec3 r=rnd();vec3 p;
   if(sw){float an=aSeed.y*6.2832+t*9.;float rad=1.3-t*1.6;p=AC+vec3(cos(an)*rad,(aSeed.z-.3)*.9+t*.4,sin(an)*rad*.9);vA=(t>0.&&t<.35)?1.:0.;}
   else{p=vec3(${f(PM.x)},.4,${f(PM.z)})+vec3(r.x*.4,abs(r.y)*.4+t*.8,r.z*.4)+vec3(0.,-t*t*3.,0.);vA=(t>0.&&t<.4)?1.:0.;}
   vK=smoothstep(.2,.4,t);vR=aSeed.w*6.28+t*6.;put(p,.3+.12*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:4,col:LEAFG,bias:-.02}));
  // escuditos hexagonales (protegido −20 %) que orbitan la coraza
  S.pts(L.part,4,VV+K+`void main(){float i=mod(float(gl_VertexID),4.);float age=(uT-TG)/.42;float an=i*1.5708+uT*3.;
   vec3 p=AC+vec3(cos(an)*1.1,.35+.15*sin(an*2.),sin(an)*1.0);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.4);}`,HEXP_FS,{mode:'matter'});
  a.pose=function(te,o){
    const ia=te-TI;
    // insecto: brota, salta a medio camino y luego hasta el aliado
    let p=tmp, ang=0;
    if(te<TS){p.copy(P0);p.y=0.05+0.3*ss(0,TS,te);}
    else if(te<TM){const u=(te-TS)/(TM-TS);p.lerpVectors(P0,PM,u);p.y+=1.2*Math.sin(Math.PI*u);ang=0.6*(0.5-u);}
    else if(te<TI){const u=(te-TM)/(TI-TM);p.lerpVectors(PM,P1,u);p.y+=1.4*Math.sin(Math.PI*u);ang=0.6*(0.5-u);}
    else p.copy(P1);
    bug.visible=te>0.02&&te<TI+0.1; bug.position.copy(p); billboard(bug,ang);
    const sq=1.7*(te<TS?0.6+0.4*ss(0,TS,te):1); bug.scale.set(sq,sq*(1+0.12*Math.sin(te*30)),1);
    bug.material.uniforms.uQ.value=te>TI-0.02?-0.1+1.2*ss(TI-0.02,TI+0.1,te):-1;
    sprout.visible=te<0.6; set(sprout,0.05+0.9*ss(0.2,0.6,te),1);
    // coraza: se sella de abajo arriba y al final se deshoja
    shell.visible=te>TI-0.05; const sU=shell.material.uniforms;
    sU.uP2.value=ss(TI-0.05,TI+0.12,te)*1.02; sU.uQ.value=-0.1+1.1*ss(1.05,1.35,te); sU.uA.value=1;
    shell.rotation.y=te*0.8; const sb=1+0.05*hitE(ia-0.12,10)*(ia>0.12?1:0); shell.scale.setScalar(sb);
    spark.pose(ia,tmp2.set(TX,1.3,0),0.6); ring.pose(ia,TX,0,0.45,1);
    const h=ss(TI,TI+0.1,te)*(1-ss(1.0,1.35,te));
    glowOf(target,LEAFC,0.35*h);
    o.em=0; o.emc.setRGB(0.5,1,0.45);
    o.g.set(TX,1.0,0); o.gs=1; o.ga=0.08*h; o.li=1.2+1.5*h;
    o.ia=ia; o.c.set(TX,0.9,0); o.shake=0; o.dist=0; o.flash=0.15;
  };
}});

VFX.module("Estilizado · Starter · Pomodoro",defs);
})();

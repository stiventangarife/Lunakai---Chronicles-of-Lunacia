// =====================================================================
// ESTILIZADO · BICHO · OREJAS (Hito 101) — las 8 cartas de orejas de Bicho hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_ioEarwing, sty_ioLeafBug…). Mismos dur / ti / fases que las originales.
// Identidad de Bicho: quitina carmesí con bandas oscuras y brillo duro; cada carta añade su acento.
// Las criaturas (insecto hoja, termitas) son siluetas estilizadas, sin caras ni ojos de dibujo animado.
// Semántica según PartCards.js:
//   Earwing (línea de 3: daño + rompe 20 % del escudo) · Leaf Bug (sobre sí: escudo 55 + 1 PM) · Tassels (sobre sí: cura
//   a todos los aliados) · Termite (sobre sí: rompe 35 % del escudo y Frágil a todos los enemigos) · Brimstone (sobre sí:
//   +2 PA) · Ear Breathing (4 golpes) · Beetle Spike (daño que ignora el escudo + Sangrado) · Larva (+1 PA el próximo turno)
// Las cartas «a todos» se dibujan como ondas radiales desde el lanzador: en el juego un efecto sobre sí mismo se orienta
// hacia el enemigo más cercano, así que piezas en muñecos fijos caerían en casillas arbitrarias.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,helixGeo}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
// colores a mano en sRGB → lineal (los vec3 de los shaders son lineales; sin esto salen lavados)
const L3=(r,g,b)=>`vec3(${f(Math.pow(r,2.2))},${f(Math.pow(g,2.2))},${f(Math.pow(b,2.2))})`;

const P_WING=pal("Sty Bicho · Élitro",["#ff6a58","#7a1024"]);
const P_LEAF=pal("Sty Bicho · Hoja",["#9fe05a","#2f6a1c"]);
const P_TASSEL=pal("Sty Bicho · Borla",["#ff8fb0","#a0204a"]);
const P_TERM=pal("Sty Bicho · Termita",["#ffae5a","#8a2a14"]);
const P_BRIM=pal("Sty Bicho · Azufre",["#ffc63a","#b01e10"]);
const P_BREATH=pal("Sty Bicho · Aliento",["#ff7c8c","#82142e"]);
const P_SPIKE=pal("Sty Bicho · Púa",["#ff5a4a","#5e0c18"]);
const P_LARVA=pal("Sty Bicho · Larva",["#ffd27a","#a8322a"]);

const EAR=[V3(-3.72,1.82,0.26),V3(-3.72,1.82,-0.26)], EM=V3(-3.7,1.86,0);
const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7, TILE=1.93;
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0);
const aim=(o,d)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};

// ---------- colores de materia (semánticos, fijos) ----------
const CRIM=L3(.78,.12,.14), CRIMD=L3(.32,.04,.07), CHITD=L3(.16,.05,.07), AMBER=L3(1.,.62,.2),
  SHIELD=L3(.45,.78,1.), SILK=L3(.97,.92,.8), EARTH=L3(.62,.48,.33), SOOT=L3(.18,.13,.11), GOLD=L3(1.,.78,.28),
  LEAFD=L3(.2,.45,.12), LEAFL=L3(.6,.82,.3), SULF=L3(1.,.82,.2), HEAL=L3(.45,.95,.45), PINK=L3(1.,.55,.72);

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.25,er=.05}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*vec2(1.7,.9)+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 float sp=pow(max(dot(reflect(-normalize(vV),n),L),0.),24.);c+=vec3(1.,.95,.88)*step(.55,sp)*.35;
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// quitina carmesí con bandas oscuras a lo largo de u (cuernos, púas, élitros)
const CHITIN_BODY=(bands=7)=>`float bd=smoothstep(.35,.5,abs(fract(vUv.y*${f(bands)})-.5));
 base=mix(${CRIM},${CHITD},.15+.65*bd*(1.-vUv.y*.4));base=mix(base,${CHITD},smoothstep(.75,1.,vUv.y));lb=-.1*bd;`;
// hoja en un plano (u = ancho, v = largo de la base a la punta), nervio y nervaduras carmesí
const LEAF_BODY=`float v=vUv.y,u=vUv.x-.5;float w=.5*pow(sin(3.1416*pow(clamp(v,0.,1.),.7)),.85);
 if(abs(u)>w)discard;float rib=smoothstep(.04,0.,abs(u));float vein=smoothstep(.06,0.,abs(fract(v*5.-abs(u)*2.2)-.5)-.0)*step(abs(u),w*.85);
 float edge=smoothstep(w-.06,w,abs(u));
 base=mix(${LEAFD},${LEAFL},.2+.6*v);base=mix(base,${CRIMD},rib*.75+edge*.5);lb=-.08*vein;`;
// cúpula de energía: borde de fresnel, bandas finas que suben, revela de abajo arriba (uP) y se erosiona (uD)
const SHELL_FS=(extra='')=>`uniform float uD;uniform float uR;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 if(h>uP*1.15-.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);if(er<.01)discard;
 float bands=0.;${extra}
 float m=(pow(fr,2.2)*.8+.06+bands)*er;
 gl_FragColor=vec4(styRamp(.4+.5*fr),min(m,1.)*uA);}`;
// sello de pincel en el suelo con un dibujo propio; uP = erosión
const GLYPH=(draw,lift=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(${f(lift)}+.35*s.g),m*er*uA*.85);}`;
// mancha en el suelo (materia): col = color, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// onda radial en el suelo (plano grande, el radio lo da uR 0..1): anillo de pincel + relleno tenue detrás del frente
const WAVE_FS=(col,fill=.18)=>`uniform float uR;uniform float uW;
void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float nz=styNoise(vec2(an*1.3,r*2.)+.2).r;float d=r-uR+(nz-.5)*.06;
 float front=smoothstep(uW,0.,abs(d));float inner=step(d,0.)*smoothstep(0.,-.35,d)*${f(fill)};
 float m=(front+inner)*(1.-smoothstep(.9,1.,r));if(m<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.55+.4*front),m*uA);}`;
// partícula redonda iluminada (esfera falsa): col = color
const BALL_P=(col,hot='vec3(0.)')=>S.PV+`void main(){vec2 q=styPC()-.5;if(length(q)>.46)discard;
 vec3 n=normalize(vec3(q*2.1,sqrt(max(0.,1.-dot(q*2.1,q*2.1)))));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.7+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 gl_FragColor=vec4(styRampOf(${col},.25+.6*l)*styTint(l)+${hot},er*vA);}`;
// cruz de cura (materia verde con borde oscuro)
const CROSS_P=S.PV+`void main(){vec2 q=gl_PointCoord-.5;vec2 a=abs(q);float d=min(max(a.x-.11,a.y-.34),max(a.x-.34,a.y-.11));
 if(d>0.)discard;float edge=smoothstep(-.05,0.,d);
 gl_FragColor=vec4(mix(${HEAL},${L3(.08,.36,.12)},edge*.85),vA);}`;
// chevrón hacia arriba (velocidad, potenciar)
const CHEVUP_P=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(-y+.1-abs(q.x)*.9);
 float a=smoothstep(.1,.065,d)*step(abs(q.x),.38)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.6+.35*step(d,.04)),a);}`;
// termita estilizada (silueta: abdomen segmentado, tórax, cabeza, mandíbulas, patas); vR = rumbo en pantalla
const TERMITE_P=S.PV+`void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float cr=cos(vR),sr=sin(vR);q=vec2(cr*q.x+sr*q.y,-sr*q.x+cr*q.y);
 float ab=length((q-vec2(-.14,0.))*vec2(1.,1.75))-.16;float th=length((q-vec2(.07,0.))*vec2(1.25,1.5))-.07;
 float hd=length(q-vec2(.19,0.))-.075;float mx=length(vec2(q.x-.29,abs(q.y)-.035)*vec2(1.,2.4))-.038;
 float lg=max(abs(abs(q.y)-.13-.04*sin(q.x*30.+vMix*40.))-.014,abs(q.x-.02)-.12);
 float d=min(min(ab,th),min(min(hd,mx),lg));float a=smoothstep(.015,-.01,d)*vA;if(a<.01)discard;
 float seg=smoothstep(.3,.5,abs(fract(q.x*14.)-.5));
 vec3 c=ab<0.?mix(${AMBER},${L3(.55,.2,.08)},seg*.6):${CRIMD};c=mix(c,${CHITD},smoothstep(-.03,.005,d));
 gl_FragColor=vec4(c,a);}`;
const defs=[];

// =====================================================================
// 1 · EARWING — las orejas se abren como alas de élitro y vibran; de ellas salen tres medias lunas de sonido carmesí
//     que atraviesan la línea (objetivo y dos casillas detrás). Cada frente astilla el escudo (esquirlas azules) y deja
//     un surco de ondas en el suelo. ti 0,62 s
// =====================================================================
const ARC_FS=`uniform float uEr;void main(){vec2 p=(vUv-.5)*2.;float d=length(p-vec2(-1.05,0.));
 float band=smoothstep(.2,.0,abs(d-1.)-.02)*smoothstep(.95,.55,abs(p.y));if(band<.01)discard;
 float nz=styNoise(vUv*vec2(1.,2.5)+uP).r;float er=styErode(band*.5+nz*.5,uEr,.1);if(er<.01)discard;
 float core=smoothstep(.09,.0,abs(d-1.04));
 vec3 c=styRampOf(${CRIM},.35+.5*band)+${L3(1.,.55,.45)}*core*.6;
 gl_FragColor=vec4(c,band*er*uA);}`;
const WING_FS=`uniform float uQ;void main(){vec2 p=vUv-vec2(.5,0.);float w=.5*pow(sin(3.1416*pow(clamp(vUv.y,0.,1.),.6)),.9);
 if(abs(p.x)>w)discard;float vein=smoothstep(.05,0.,abs(fract(vUv.y*4.+abs(p.x)*3.)-.5)-.38)+smoothstep(.04,0.,abs(p.x));
 float nz=styNoise(vUv*1.3+.4).r;if(styErode(nz,uQ,.06)<.5)discard;float edge=smoothstep(w-.07,w,abs(p.x));
 vec3 c=mix(${CRIM},${CRIMD},.35+.5*vUv.y);c=mix(c,${CHITD},clamp(vein*.8+edge,0.,1.));
 gl_FragColor=vec4(c,(.55+.4*clamp(vein+edge,0.,1.))*uA);}`;
defs.push({key:"sty_ioEarwing",name:"Earwing (estilizado)",dur:2.0,ti:0.62,pal:P_WING,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Zumbido",0],["Onda sónica",0.4],["Impacto",0.62],["Astillas",0.82],["Disipación",1.5]],
build(a){
  const L=a.L,TO=0.4,TI=0.62,FLY=TI-TO,END=V3(TX+2*TILE+0.4,1.05,0);
  // alas de élitro en cada oreja
  const wingMat=S.mat(WING_FS,{uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide});
  const wings=[];
  for(let e=0;e<2;e++)for(let k=0;k<2;k++){const g=new THREE.Group();g.position.copy(EAR[e]);L.mesh.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.62,1.35).translate(0,0.67,0),wingMat);g.add(m);wings.push({g,e,k});}
  // tres medias lunas de sonido
  const arcs=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),S.mat(ARC_FS,{uEr:{value:0}},{mode:'matter',side:THREE.DoubleSide,depthTest:false}));
    m.material.uniforms.uP.value=i*0.37;L.mesh.add(m);return {m,t0:TO+i*0.07};});
  // surco de ondas a lo largo de la línea (plano a lo largo completo, se revela con uR)
  const furrow=new THREE.Mesh(new THREE.PlaneGeometry(END.x-TX+1.2,1.1,48,1).rotateX(-Math.PI/2),S.mat(`uniform float uR;
   void main(){float x=vUv.x;if(x>uR)discard;float w=abs(vUv.y-.5)*2.;float ch=smoothstep(.12,.0,abs(fract(x*9.-w*.8)-.5)-.3)*smoothstep(1.,.4,w);
    float nz=styNoise(vUv*vec2(4.,1.)+.3).r;float er=styErode(nz*.6+ch*.4,uP,.12);
    gl_FragColor=vec4(styRampOf(${CRIM},.5+.3*ch),ch*er*uA*.75);}`,{uR:{value:0}},{mode:'matter'}));
  furrow.position.set((TX-0.6+END.x+0.6)/2,0.03,0); L.decal.add(furrow);
  const sparks=[0,1,2].map(i=>S.hitSpark(L.mesh,1.25-i*0.2,{seed:0.2+i*0.3}));
  const rings=[0,1,2].map(()=>S.groundRing(L.decal,2.2));
  const K=`const float TI=${f(TI)};const vec3 TC=${v3(TC)};const float TILE=${f(TILE)};const float TXX=${f(TX)};`;
  // esquirlas azules de escudo en cada casilla de la línea
  S.pts(L.part,36,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+i*.06+aSeed.y*.03;float life=.55+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 c0=vec3(TXX+i*TILE-.2,1.05,0.);vec3 v=normalize(rnd()+vec3(.6,.5,0.))*(2.2+1.6*aSeed.w);vec3 p=c0+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,(.2+.1*aSeed.z)*(1.-.35*i));}`,
   S.MATTER_FS(C.shard,{relief:3,col:SHIELD,bias:.05}));
  // polvo de la vibración en la línea
  S.pts(L.part,18,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+i*.06+aSeed.y*.08;float life=.7+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vec3(TXX+i*TILE,.15,0.)+vec3(cos(an),0.,sin(an)*.7)*(.25+.6*(1.-exp(-t*5.)))+vec3(0.,t*.6,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=an+t;put(p,(.34+.16*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.06}));
  // zumbido: motas en las orejas
  S.pts(L.part,16,VV+`void main(){float life=.22;float k=uT/life+aSeed.x;float age=fract(k);float e=step(.5,aSeed.y);
   vec3 c0=vec3(-3.72,1.95,e>.5?.26:-.26);vec3 p=c0+normalize(rnd())*(.15+.45*age);
   vA=(uT<.55?1.:0.)*sin(age*3.14159);vK=0.;vR=aSeed.z*6.28;put(p,.13);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, open=back(ss(0,0.25,te))*(1-ss(0.6,0.9,te));
    wings.forEach(w=>{const sd=w.e?-1:1, fl=Math.sin(te*95+w.k*1.7)*0.35*(1-ss(0.45,0.6,te));
      w.g.rotation.set(sd*(0.6+0.5*w.k)+fl*sd,0,(w.k?0.5:-0.5)*sd+0.15*fl);w.g.scale.setScalar(Math.max(open*1.15,0.001));});
    wingMat.uniforms.uA.value=1; wingMat.uniforms.uQ.value=-0.1+1.1*ss(0.55,0.9,te);
    caster.scale.set(1,1-0.03*Math.sin(te*90)*(1-ss(0.4,0.5,te)),1);
    arcs.forEach((r,i)=>{const u=(te-r.t0)/FLY;const vis=u>0&&u<1.6;r.m.visible=vis;if(!vis)return;
      if(u<=1){tmp.lerpVectors(EM,TC,u);}else{tmp.lerpVectors(TC,END,(u-1)/0.6);}
      r.m.position.copy(tmp);billboard(r.m,0);
      const sc=(0.5+0.8*e3(u*1.4))*(1-0.25*i);r.m.scale.setScalar(Math.max(sc*1.25,0.001));
      r.m.material.uniforms.uA.value=1;r.m.material.uniforms.uEr.value=-0.1+1.1*ss(1.1,1.6,u);});
    sparks.forEach((s,i)=>s.pose(ia-i*0.06,tmp.set(TX+i*TILE-0.25,1.1,0.1),1-0.25*i));
    rings.forEach((r,i)=>r.pose(ia-i*0.06,TX+i*TILE,0,0.4,0.85-0.15*i));
    const fr=furrow.material.uniforms; fr.uR.value=cl((te-TI+0.04)/0.18); set(furrow,ia>=0?-0.1+1.1*ss(0.5,1.3,ia):1,ia>=0?1:0); furrow.visible=ia>=0;
    const h=hitE(ia,7); target.position.x=TX+0.22*h*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.16*h*Math.cos(ia*20);
    o.em=0.45*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(EM);o.gs=0.7*open;o.ga=0.12*open;o.li=1.2*open;o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0.2;}
    else{o.g.copy(TC);o.gs=1.3;o.ga=0.32*Math.exp(-ia*8);o.li=4*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=0.6;o.dist=0.8;o.flash=0.6;}
  };
}});

// =====================================================================
// 2 · LEAF BUG (Bing / Pomodoro) — un insecto hoja (silueta de hojas superpuestas, nervios carmesí) brota del suelo,
//     salta y se posa en la espalda del lanzador; se deshace en hojas que giran y se cierran en una coraza de hojas
//     (escudo 55). Un remolino verde en los pies y chevrones marcan el +1 PM. ti 0,7 s
// =====================================================================
defs.push({key:"sty_ioLeafBug",name:"Leaf Bug (estilizado)",dur:2.2,ti:0.7,pal:P_LEAF,tier:2,stylized:true,
  phases:[["Brote",0],["Salto",0.38],["Aterrizaje",0.7],["Camuflaje",0.85],["Escudo",1.25],["Fin",1.85]],
build(a){
  const L=a.L,TJ=0.38,TI=0.7,TC2=0.85,TS=1.25,TE=2.2,SPAWN=V3(-2.55,0,0.75),BACK=V3(-3.8,1.55,-0.15);
  const leafMat=S.mat(SOLID(LEAF_BODY,{hot:'uC1',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  // silueta del insecto hoja: abdomen y tórax (hojas grandes), 6 patas (hojas finas), 2 antenas
  const bug=new THREE.Group(); L.mesh.add(bug);
  const flat=new THREE.Group(); flat.rotation.x=-0.5; bug.add(flat);
  const leaf=(w,h,x,y,rz)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h).translate(0,h/2,0),leafMat);m.position.set(x,y,0);m.rotation.z=rz;flat.add(m);return m;};
  leaf(0.62,1.15,0,-0.85,0); leaf(0.4,0.5,0,-0.02,0); leaf(0.22,0.26,0,0.42,0);
  const legs=[]; for(let i=0;i<3;i++)for(const sd of [1,-1])legs.push(leaf(0.12,0.55,0.08*sd,-0.25-i*0.22,sd*(1.05+i*0.35)));
  const antM=S.mat(SOLID(`base=${CRIMD};`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  for(const sd of [1,-1]){const c=new THREE.CatmullRomCurve3([V3(0,0.62,0),V3(0.1*sd,0.9,0.05),V3(0.28*sd,1.12,0.1)]);
    flat.add(new THREE.Mesh(taperTube(c,10,5,0.018,0.006),antM));}
  // coraza de hojas: 14 hojas que orbitan y se cierran alrededor del lanzador
  const shellLeaves=[]; for(let i=0;i<14;i++){const g=new THREE.Group();L.mesh.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.85).translate(0,0.42,0),leafMat);g.add(m);
    const lat=-0.55+1.25*((i*7)%14)/13, lon=i*2.39996; shellLeaves.push({g,m,lat,lon});}
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.1,32,20,0,Math.PI*2,0,Math.PI*0.6),S.mat(SHELL_FS(`bands=smoothstep(.06,0.,.5-abs(fract(h*5.-uT*.8)-.5))*.12;`),{uD:{value:0},uR:{value:1.1}},{mode:'matter',side:THREE.DoubleSide}));
  dome.position.set(CX,0,0); L.mesh.add(dome);
  const ring=S.groundRing(L.decal,2.4), land=S.hitSpark(L.mesh,1.0,{seed:0.55}), shadow=S.contactShadow(L.decal,1.0);
  const swirl=groundPlane(2.2,CX,0.03,S.mat(GLYPH(`float sp=smoothstep(.06,0.,abs(fract(an/6.2832*2.+r*1.6-uT*1.5)-.5)-.4)*step(.35,r)*step(r,.85);m=max(m*.3,sp*.9);`,.5),{},{mode:'energy'}));
  L.decal.add(swirl);
  const K=`const float TI=${f(TI)};const float TC2=${f(TC2)};const float TS=${f(TS)};const vec3 SPAWN=${v3(SPAWN)};`;
  // brote: hojas y tierra que saltan en el punto de aparición
  S.pts(L.part,14,VV+K+`void main(){float s=.05+aSeed.x*.2;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.5+aSeed.w),1.8+aSeed.y,sin(an)*(.5+aSeed.w));vec3 p=SPAWN+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // camuflaje: hojas sueltas que giran alrededor al deshacerse el insecto
  S.pts(L.part,20,VV+K+`void main(){float s=TC2+aSeed.x*.25;float life=.55+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*5.;float rad=1.2-.6*age;vec3 p=vec3(-3.7+cos(an)*rad,.4+1.3*aSeed.w+.3*age,sin(an)*rad);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.75,1.,age);vR=an*1.3;put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:LEAFL,bias:-.05}));
  // +1 PM: chevrones verdes que suben en los pies y motas de viento
  S.pts(L.part,4,VV+K+`void main(){float i=floor(aSeed.x*4.);float s=TS+.05+i*.09;float age=(uT-s)/.55;float an=i*1.5708+.4;
   vec3 p=vec3(-3.7+cos(an)*.75,.2+age*1.,sin(an)*.6);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.42);}`,CHEVUP_P(LEAFL));
  S.pts(L.part,16,VV+K+`void main(){float s=TS+aSeed.x*.5;float life=.4;float age=(uT-s)/life;float an=aSeed.z*6.2832+uT*7.;
   vec3 p=vec3(-3.7+cos(an)*.95,.12+.25*aSeed.w,sin(an)*.8);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=an;put(p,.16);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, grow=back(ss(0,TJ,te)), dis=ss(TC2,TC2+0.3,te);
    // insecto: brota → salta en arco → se posa en la espalda → se deshace
    const u=cl((te-TJ)/(TI-TJ));
    if(te<TJ){bug.position.copy(SPAWN);bug.position.y=0.05+0.2*grow;bug.rotation.set(0,0.25,0.6);}
    else{tmp.lerpVectors(SPAWN,BACK,u);tmp.y=SPAWN.y+(BACK.y-SPAWN.y)*u+Math.sin(u*Math.PI)*1.4;bug.position.copy(tmp);bug.rotation.set(0,0.25,0.6-0.9*u+0.5*Math.sin(u*Math.PI));}
    const bs=Math.max(1.9*grow*(1-dis),0.001); bug.scale.setScalar(bs); bug.visible=te<TC2+0.3;
    legs.forEach((l,i)=>{l.rotation.z+=0;});
    shadow.pose(bug.position.x,bug.position.z,0.8,te<TI?0.5*grow:0); shadow.mesh.position.z=bug.position.z;
    land.pose(ia,tmp.set(-3.75,1.5,0.1),0.7); ring.pose(ia,CX,0,0.45,1);
    // coraza de hojas
    const lock=back(ss(TC2,TS,te)), fade=ss(1.85,TE,te);
    shellLeaves.forEach((s,i)=>{const R=1.05, lon=s.lon+(1-lock)*3.5+te*0.25*(1-lock), lat=s.lat;
      const rr=R*(1.6-0.6*lock);s.g.position.set(CX+Math.cos(lon)*Math.cos(lat)*rr,0.95+Math.sin(lat)*R*0.95,Math.sin(lon)*Math.cos(lat)*rr);
      s.g.rotation.set(-lat*0.8-0.25,Math.PI/2-lon,0,'YXZ');s.g.visible=te>TC2;s.g.scale.setScalar(Math.max(ss(TC2,TC2+0.25,te)*(1-0.15*fade),0.001));});
    leafMat.uniforms.uQ.value=-0.1+1.15*fade; leafMat.uniforms.uK.value=0.35*ss(TS-0.1,TS,te)*(1-ss(TS,TS+0.3,te));
    dome.visible=te>TC2; set(dome,ss(TC2,TS,te),1); dome.material.uniforms.uD.value=-0.1+1.15*fade;
    swirl.visible=te>TS-0.05; set(swirl,-0.1+1.15*ss(1.8,TE,te),ss(TS-0.05,TS+0.15,te)); swirl.rotation.y=-te*2;
    glowOf(caster,U.uC1.value,0.3*ss(TS-0.1,TS,te)*(1-ss(TS,TS+0.4,te)));
    o.em=0; o.emc.copy(U.uC1.value);
    o.g.set(CX,1.0,0);o.gs=1+0.6*ss(TC2,TS,te);o.ga=0.05+0.1*ss(TS-0.1,TS,te)*(1-ss(TS,TS+0.5,te));o.li=0.8+1.2*ss(TS-0.1,TS,te)*(1-fade);
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 3 · TASSELS — dos borlas de plumas carmesí se alzan sobre las orejas y se mecen; sueltan feromonas rosas en espiral
//     y, en la cura, una onda rosa y verde recorre todo el campo (cura a todos los aliados) con cruces que suben en el
//     lanzador y a lo largo del frente. ti 0,9 s
// =====================================================================
const PLUME_FS=`uniform float uQ;void main(){vec2 p=(vUv-vec2(.5,0.))*vec2(2.,1.);float y=vUv.y;
 float w=.55*sin(3.1416*pow(clamp(y,0.,1.),.75));float d=abs(p.x);if(d>w)discard;
 float barb=smoothstep(.25,.5,abs(fract(y*14.+d*3.)-.5));float rib=smoothstep(.06,0.,d);
 float nz=styNoise(vUv*1.4+.6).r;if(styErode(nz*.6+(1.-y)*.4,uQ,.08)<.5)discard;
 vec3 c=mix(${PINK},${CRIM},.25+.5*barb+.3*(1.-y));c=mix(c,${CRIMD},rib*.8+smoothstep(w-.08,w,d)*.6);
 gl_FragColor=vec4(c*(.85+.3*y),1.);}`;
defs.push({key:"sty_ioTassels",name:"Tassels (estilizado)",dur:2.3,ti:0.9,pal:P_TASSEL,tier:2,stylized:true,
  phases:[["Vaivén",0],["Feromonas",0.4],["Cura",0.9],["Brillo",1.2],["Disipación",1.8]],
build(a){
  const L=a.L,TF=0.4,TI=0.9,TB=1.2,TE=2.3,RMAX=5.2;
  const stalkM=S.mat(SOLID(`base=${CRIMD};lb=.05;`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const plumeM=S.mat(PLUME_FS,{uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide});
  const tassels=EAR.map((e,i)=>{const g=new THREE.Group();g.position.copy(e);L.mesh.add(g);
    const sd=i?-1:1;const c=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.05,0.35,0.1*sd),V3(0.2,0.7,0.22*sd)]);
    g.add(new THREE.Mesh(taperTube(c,12,6,0.035,0.02),stalkM));
    const tip=new THREE.Group();tip.position.set(0.2,0.7,0.22*sd);g.add(tip);
    for(let k=0;k<3;k++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.85).translate(0,0.42,0),plumeM);m.rotation.y=k*Math.PI/3;tip.add(m);}
    return {g,tip,sd};});
  const wave=groundPlane(RMAX*2,CX,0.035,S.mat(WAVE_FS(L3(.85,.3,.5),.14),{uR:{value:0},uW:{value:.06}},{mode:'matter'}));
  L.decal.add(wave);
  const wave2=groundPlane(RMAX*2,CX,0.04,S.mat(WAVE_FS(L3(.25,.7,.3),.0),{uR:{value:0},uW:{value:.03}},{mode:'matter'}));
  L.decal.add(wave2);
  const glyph=groundPlane(2.2,CX,0.03,S.mat(GLYPH(`float pet=abs(cos(an*3.));m=max(m*.5,smoothstep(.05,0.,abs(r-.6*(.75+.25*pet)))*.85);`),{},{mode:'energy'}));
  L.decal.add(glyph);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float RMAX=${f(RMAX)};`;
  // feromonas rosas en espiral desde las borlas
  S.pts(L.part,40,VV+K+`void main(){float s=TF+aSeed.x*.6;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float e=step(.5,aSeed.w);
   vec3 c0=vec3(-3.5,2.55,e>.5?.48:-.48);float an=aSeed.z*6.28+age*6.;float rad=.15+1.4*age;
   vec3 p=c0+vec3(cos(an)*rad,-.3*age+.2*sin(age*6.),sin(an)*rad);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=an;
   put(p,.14+.08*aSeed.y);}`,S.ENERGY_FS(C.spark,{gain:1.15}),{mode:'energy'});
  // cruces de cura en el lanzador
  S.pts(L.part,8,VV+K+`void main(){float s=TI+.05+aSeed.x*.5;float life=.7;float age=(uT-s)/life;float an=aSeed.z*6.28;
   vec3 p=vec3(-3.7+cos(an)*.55,.5+age*1.5,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.36+.1*aSeed.w);}`,CROSS_P);
  // cruces a lo largo del frente de la onda
  S.pts(L.part,28,VV+K+`void main(){float s=TI+aSeed.x*.55;float R=RMAX*clamp((s-TI)/.75,0.,1.)*.92;float life=.55;float age=(uT-s)/life;float an=aSeed.z*6.28;
   vec3 p=vec3(-3.7+cos(an)*R,.25+age*1.,sin(an)*R);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.08*aSeed.w);}`,CROSS_P);
  // polen dorado que cae en el brillo
  S.pts(L.part,18,VV+K+`void main(){float s=TI+.2+aSeed.x*.7;float life=.8;float age=(uT-s)/life;float an=aSeed.z*6.28;float rad=.4+1.3*aSeed.w;
   vec3 p=vec3(-3.7+cos(an)*rad,2.3-age*1.8,sin(an)*rad*.8);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*3.;put(p,.13);}`,
   S.ENERGY_FS(C.spark,{gain:1.05}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, up=back(ss(0,0.35,te)), fade=ss(1.8,TE,te);
    tassels.forEach((t,i)=>{const sw=Math.sin(te*5+i*1.3)*0.35*(1-ss(TI,TI+0.2,te)*0.5)+0.25*hitE(ia,6)*Math.sin(ia*25);
      t.g.rotation.set(t.sd*0.1,0,-0.3+sw);t.g.scale.setScalar(Math.max(up*1.45,0.001));t.tip.rotation.z=sw*0.6;});
    stalkM.uniforms.uQ.value=plumeM.uniforms.uQ.value=-0.1+1.15*fade; stalkM.uniforms.uK.value=0.4*hitE(ia,5);
    const wr=e3(cl(ia/0.75)); wave.visible=wave2.visible=ia>=0&&ia<1.1;
    wave.material.uniforms.uR.value=wave2.material.uniforms.uR.value=wr*0.95;
    set(wave,0,(1-ss(0.6,1.1,ia))); set(wave2,0,(1-ss(0.5,0.95,ia)));
    glyph.visible=te>TF; set(glyph,-0.1+1.15*ss(1.8,TE,te),ss(TF,TF+0.3,te)); glyph.rotation.y=te*0.8;
    glowOf(caster,U.uC1.value,0.45*hitE(ia,4)+0.15*ss(TF,TI,te)*(ia<0?1:0));
    caster.rotation.z=0.05*Math.sin(te*5)*(1-fade);
    o.em=0; o.emc.copy(U.uC1.value);
    o.g.set(CX,2.0,0);o.gs=0.9+1.2*hitE(ia,3);o.ga=0.1+0.25*hitE(ia,4);o.li=1.2+3*hitE(ia,4);
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 4 · TERMITE — un enjambre de termitas (siluetas ámbar y carmesí) sale de las orejas, aterriza y corre en una ola por
//     todo el campo (rompe el 35 % del escudo y Frágil a todos los enemigos): en el frente saltan astillas azules de
//     escudo y esquirlas rosas de Frágil, y queda un anillo de suelo roído. ti 0,42 s
// =====================================================================
defs.push({key:"sty_ioTermite",name:"Termite (estilizado)",dur:1.3,ti:0.42,pal:P_TERM,tier:2,stylized:true,
  phases:[["Enjambre",0],["Vuelo",0.1],["Mordisco",0.42],["Frágil",0.8]],
build(a){
  const L=a.L,TV=0.1,TI=0.42,TF=0.8,TE=1.3,RMAX=5.4;
  const wave=groundPlane(RMAX*2,CX,0.035,S.mat(`uniform float uR;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float nz=styNoise(vec2(an*2.,r*3.)+.4).r;float d=r-uR+(nz-.5)*.08;
   float chew=step(d,0.)*smoothstep(-.28,-.02,d)*smoothstep(.35,.65,nz)*.8;float front=smoothstep(.04,0.,abs(d))*.9;
   float m=(chew+front)*(1.-smoothstep(.9,1.,r))*step(.12,r);if(m<.01)discard;
   gl_FragColor=vec4(mix(styRampOf(${EARTH},.2+.2*nz),styRampOf(${AMBER},.6),front),m*uA);}`,{uR:{value:0}},{mode:'matter'}));
  L.decal.add(wave);
  const K=`const float TV=${f(TV)};const float TI=${f(TI)};const float TF=${f(TF)};const float RMAX=${f(RMAX)};
  float rad(float t){return RMAX*.92*(1.-exp(-max(t-TI,0.)*3.2));}`;
  // enjambre: salen de las orejas en abanico, caen al suelo y corren hacia fuera con el frente
  S.pts(L.part,70,VV+K+`void main(){float an=aSeed.x*6.2832;float t=uT;vec3 ear=vec3(-3.72,1.85,aSeed.y>.5?.26:-.26);
   vec3 dir=vec3(cos(an),0.,sin(an));vec3 land=vec3(-3.7,0.,0.)+dir*(.7+.3*aSeed.z);vec3 p;
   if(t<TI){float u=clamp((t-TV+aSeed.w*.08)/(TI-TV),0.,1.);p=mix(ear,land,u)+vec3(0.,sin(u*3.14159)*.7,0.);}
   else{float R=.7+.3*aSeed.z+rad(t)*(.75+.25*aSeed.w);p=vec3(-3.7,0.,0.)+dir*R+vec3(0.,.12+.06*abs(sin(t*30.+aSeed.y*9.)),0.);}
   vec3 q=p+(t<TI?normalize(land-ear):dir)*.2;vec4 A=projectionMatrix*modelViewMatrix*vec4(p,1.),B=projectionMatrix*modelViewMatrix*vec4(q,1.);
   vec2 sd=B.xy/B.w-A.xy/A.w;vR=atan(sd.y,sd.x);vK=0.;
   vA=(t>TV-aSeed.w*.08&&t<1.12+aSeed.y*.15)?1.:0.;put(p,.68+.16*aSeed.z);}`,TERMITE_P);
  // astillas de escudo (azul) y esquirlas de Frágil (rosa) que saltan en el frente
  S.pts(L.part,40,VV+K+`void main(){float s=TI+.04+aSeed.x*.55;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 dir=vec3(cos(an),0.,sin(an));vec3 p=vec3(-3.7,0.,0.)+dir*(.7+rad(s))+dir*t*1.2+vec3(0.,.2+t*3.-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*10.;put(p,.22+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:SHIELD}));
  S.pts(L.part,26,VV+K+`void main(){float s=TF-.1+aSeed.x*.35;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 dir=vec3(cos(an),0.,sin(an));vec3 p=vec3(-3.7,0.,0.)+dir*(.9+rad(s)*(.6+.35*aSeed.w))+vec3(0.,1.3-1.2*t*t*2.,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.22+.07*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:L3(.98,.62,.74)}));
  // serrín al aterrizar
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7,.1,0.)+vec3(cos(an),0.,sin(an))*(.6+1.2*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=an;put(p,(.36+.12*aSeed.w)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.scale.set(1,1-0.05*ss(0,TV,te)+0.05*ss(TV,TV+0.08,te),1);
    const R=RMAX*0.92*(1-Math.exp(-Math.max(ia,0)*3.2));
    wave.visible=ia>=0; wave.material.uniforms.uR.value=(0.7+R)/RMAX; set(wave,0,1-ss(TF,TE,te));
    o.em=0; o.emc.copy(U.uC1.value);
    o.g.set(CX,0.8,0);o.gs=1.2;o.ga=0.15*hitE(ia,5);o.li=1.5*hitE(ia,4);
    o.ia=ia;o.c.set(CX,0.6,0);o.shake=0.4;o.dist=0.4;o.flash=0;
  };
}});

// =====================================================================
// 5 · BRIMSTONE — llamas de azufre (carmesí → amarillo, con bandas oscuras) brotan de las orejas; erupción de brasas y
//     humo sulfuroso; dos gemas de azufre fundido se condensan sobre la cabeza, orbitan y se hunden en el pecho (+2 PA).
//     ti 0,55 s
// =====================================================================
const GEM_BODY=`float cr=smoothstep(.07,0.,abs(styNoise(vUv*2.2+.3).g-.5)-.02);base=mix(${L3(.28,.1,.07)},${L3(.45,.16,.08)},styNoise(vUv*3.).r);lb=-.05;`;
defs.push({key:"sty_ioBrimstone",name:"Brimstone (estilizado)",dur:2.3,ti:0.55,pal:P_BRIM,tier:1,stylized:true,
  phases:[["Calor",0],["Erupción",0.55],["Condensación",1.0],["Brasa",1.5],["Fin",1.95]],
build(a){
  const L=a.L,TI=0.55,TC2=1.0,TB=1.5,TE=2.3,TOP=V3(-3.7,2.75,0);
  const gemM=S.mat(SOLID(GEM_BODY,{hot:`(${SULF}*1.6)`,rim:.2})+``,{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  // grieta brillante encima del cuerpo de la gema
  const crackM=S.mat(`void main(){float cr=smoothstep(.03,0.,abs(styNoise(vUv*1.6+.3).g-.5));if(cr<.2)discard;
   gl_FragColor=vec4(mix(${L3(1.,.35,.08)},${SULF},cr)*1.7,cr*uA);}`,{},{mode:'energy'});
  const gems=[0,1].map(i=>{const g=new THREE.Group();L.mesh.add(g);
    const geo=new THREE.OctahedronGeometry(0.24,0);geo.scale(0.85,1.25,0.85);
    g.add(new THREE.Mesh(geo,gemM));g.add(new THREE.Mesh(geo.clone().scale(1.03,1.03,1.03),crackM));return g;});
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.4}), ring=S.groundRing(L.decal,2.2);
  const seal=groundPlane(2.0,CX,0.03,S.mat(STAIN(SOOT,.55),{},{mode:'matter'})); L.decal.add(seal);
  const glyph=groundPlane(2.2,CX,0.035,S.mat(GLYPH(`float tri=smoothstep(.05,0.,abs(r*cos(mod(an+.5236,2.0944)-1.0472)-.42))*step(r,.7);m=max(m*.4,tri*.9);`,.6),{},{mode:'energy'}));
  L.decal.add(glyph);
  const K=`const float TI=${f(TI)};const float TC2=${f(TC2)};const float TB=${f(TB)};`;
  // llamas de azufre en las orejas (materia: no se lavan a blanco)
  S.pts(L.part,30,VV+K+`void main(){float life=.32+aSeed.y*.15;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float e=step(.5,r.x);
   vec3 c0=vec3(-3.72,1.9,e>.5?.26:-.26);vec3 p=c0+vec3((r.y-.5)*.15,age*(.55+.35*r.z),(r.z-.5)*.12);
   float on=uT<TC2?1.:1.-smoothstep(TC2,TC2+.3,uT);vA=on*smoothstep(0.,.15,age);vK=smoothstep(.35,1.,age);vR=(r.y-.5)*.5;
   put(p,(.5+.2*r.z)*(1.-.4*age)*(1.+.6*smoothstep(TI-.2,TI,uT)*(1.-step(TI+.2,uT))));}`,
   S.MATTER_FS(C.flame,{relief:3,col:L3(.95,.38,.08),bias:.05}));
  // erupción: brasas que suben y humo sulfuroso
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()*vec3(.6,.3,.6)+vec3(0.,1.,0.))*(3.+2.*aSeed.z);vec3 p=vec3(-3.7,1.9,0.)+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.14+.08*aSeed.w);}`,S.MATTER_FS(C.spark,{relief:2,col:L3(1.,.55,.1),bias:.1}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+.02+aSeed.x*.2;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-3.7,2.,0.)+vec3((aSeed.z-.5)*1.2*t,t*1.1,(aSeed.w-.5)*1.*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t;put(p,(.5+.25*aSeed.y)*(.6+.8*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:L3(.62,.54,.3),bias:-.05}));
  // condensación: brasas que convergen hacia las gemas
  S.pts(L.part,24,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TI+.25+aSeed.y*.35;float u=clamp((uT-s)/.3,0.,1.);
   vec3 g0=vec3(-3.7,2.75,0.)+vec3(i>.5?.55:-.55,0.,0.);vec3 p0=g0+normalize(rnd())*1.2;vec3 p=mix(p0,g0,u*u);
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.12);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // brasas que caen al final
  S.pts(L.part,12,VV+K+`void main(){float s=TB+aSeed.x*.4;float life=.6;float age=(uT-s)/life;float an=aSeed.z*6.28;
   vec3 p=vec3(-3.7+cos(an)*.7*aSeed.w,1.9-1.8*age,sin(an)*.6*aSeed.w);vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;vK=0.;vR=0.;put(p,.12);}`,
   S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=-0.05*ss(TI-0.15,TI,te)+0.05*ss(TI,TI+0.2,te);
    spark.pose(ia,tmp.set(-3.7,2.05,0.15),0.8); ring.pose(ia,CX,0,0.45,1);
    set(seal,-0.1+1.15*ss(1.7,TE,te),ss(TI,TI+0.15,te)); seal.visible=ia>=0;
    set(glyph,-0.1+1.15*ss(1.6,TE,te),ss(TI,TI+0.2,te)); glyph.visible=ia>=0; glyph.rotation.y=te*0.6;
    gems.forEach((g,i)=>{const form=back(ss(TI+0.3,TC2,te)), sink=ss(TB-0.1,TB+0.25,te);const an=te*3.2+i*Math.PI;
      const orb=(1-sink);tmp.set(Math.cos(an)*0.6*orb,0,Math.sin(an)*0.5*orb);
      g.position.copy(TOP).add(tmp);g.position.y=TOP.y-1.5*sink*sink+0.08*Math.sin(te*6+i);g.rotation.set(0,te*2.5+i,0.2);
      g.visible=te>TI+0.3&&sink<1;g.scale.setScalar(Math.max(2.1*form*(1-0.6*sink),0.001));});
    gemM.uniforms.uK.value=0.45*ss(TB-0.1,TB+0.2,te); crackM.uniforms.uA.value=0.6+0.4*Math.sin(te*14);
    const pa=ss(TB+0.15,TB+0.25,te)*(1-ss(TB+0.3,TB+0.7,te)); glowOf(caster,U.uC1.value,0.5*pa+0.25*hitE(ia,5));
    o.em=0; o.emc.copy(U.uC1.value);
    o.g.set(CX,2.2,0);o.gs=1+0.8*hitE(ia,4);o.ga=0.1+0.25*hitE(ia,5)+0.15*pa;o.li=1+3*hitE(ia,4)+2*pa;
    o.ia=ia;o.c.set(CX,1.9,0);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

// =====================================================================
// 6 · EAR BREATHING — las orejas aspiran aire (motas que entran), los espiráculos se encienden y lanzan cuatro ráfagas de
//     aire comprimido carmesí (anillo de pincel + estelas) que golpean una tras otra; la última es la más grande. ti 1,62 s
// =====================================================================
const BLAST_FS=`uniform float uEr;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float nz=styNoise(vec2(an*1.6,r)+uP).r;float band=smoothstep(.22,.0,abs(r-.72+(nz-.5)*.12));if(band<.01)discard;
 float er=styErode(band*.5+nz*.5,uEr,.1);if(er<.01)discard;float core=smoothstep(.07,0.,abs(r-.72));
 vec3 c=styRampOf(${CRIM},.3+.55*band)+${L3(1.,.6,.55)}*core*.5;gl_FragColor=vec4(c,band*er*uA);}`;
defs.push({key:"sty_ioEarBreathing",name:"Ear Breathing (estilizado)",dur:3.2,ti:1.62,pal:P_BREATH,tier:3,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Inhalar",0],["Carga",0.3],["Ráfagas",0.68],["Golpe final",1.62],["Eco",1.95],["Disipación",2.6]],
build(a){
  const L=a.L,TCH=0.3,FLY=0.24,H=[0.92,1.16,1.4,1.62],TI=1.62,TE=3.2;
  const blasts=H.map((h,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),S.mat(BLAST_FS,{uEr:{value:0}},{mode:'matter',side:THREE.DoubleSide,depthTest:false}));
    m.material.uniforms.uP.value=i*0.31;L.mesh.add(m);return {m,h,big:i===3};});
  const sparks=H.map((h,i)=>S.hitSpark(L.mesh,i===3?1.5:1.0,{seed:0.1+i*0.23}));
  const rings=H.map(()=>S.groundRing(L.decal,2.4));
  const spir=EAR.map(e=>{const m=new THREE.Mesh(new THREE.RingGeometry(0.1,0.2,24),S.mat(`void main(){float a=atan(vP.y,vP.x);float k=smoothstep(.2,.5,abs(fract(a*1.91)-.5));
     gl_FragColor=vec4(styRampOf(${CRIM},.5+.4*k)*1.2,(.6+.4*k)*uA);}`,{},{mode:'energy',side:THREE.DoubleSide}));m.position.copy(e);L.mesh.add(m);return m;});
  const K=`const float TCH=${f(TCH)};const vec3 TC=${v3(TC)};const vec3 EM=${v3(EM)};
  const float H0=${f(H[0])};const float H1=${f(H[1])};const float H2=${f(H[2])};const float H3=${f(H[3])};const float FLY=${f(FLY)};`;
  // aspiración: motas que entran en las orejas
  S.pts(L.part,30,VV+K+`void main(){float life=.3;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float e=step(.5,r.x);
   vec3 ear=vec3(-3.72,1.82,e>.5?.26:-.26);vec3 p=ear+normalize(r-.5+vec3(.2,.1,0.))*(1.3*(1.-age));
   vA=(uT<.7?1.:0.)*smoothstep(0.,.3,age);vK=0.;vR=0.;put(p,.1+.06*r.z);}`,S.ENERGY_FS(C.spark,{gain:.95}),{mode:'energy'});
  // estelas de viento de cada ráfaga
  S.pts(L.part,48,VV+K+`void main(){float i=floor(aSeed.x*4.);float h=i<.5?H0:(i<1.5?H1:(i<2.5?H2:H3));float s=h-FLY+aSeed.y*FLY;
   float u=(s-(h-FLY))/FLY;float life=.25;float age=(uT-s)/life;vec3 p=mix(EM,TC,u)+vec3(0.,0.,0.)+rnd()*(.25+.15*step(2.5,i));
   p+=vec3(-1.,0.,0.)*age*.4;vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=0.;put(p,.22+.1*step(2.5,i));}`,
   S.MATTER_FS(C.slash,{relief:2,col:L3(1.,.72,.72),bias:.1}));
  // vapor que queda tras el golpe final
  S.pts(L.part,14,VV+K+`void main(){float s=H3+aSeed.x*.25;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=TC+vec3(.2,-.3,0.)+normalize(rnd()+vec3(.4,.2,0.))*(.3+.9*(1.-exp(-t*3.)))+vec3(0.,t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.42+.2*aSeed.z)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:L3(.95,.7,.72),bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    // inhalar: el lanzador se hincha; cada ráfaga lo sacude
    const inh=ss(0,TCH+0.3,te)*(1-ss(H[0]-FLY,H[0]-FLY+0.1,te));
    let kick=0;H.forEach(h=>{kick+=hitE(te-(h-FLY),14)*(te>=h-FLY?1:0);});
    caster.scale.set(1+0.06*inh,1+0.05*inh-0.04*kick,1+0.06*inh);
    spir.forEach((m,i)=>{billboard(m,te*2);m.scale.setScalar(Math.max(ss(0.15,TCH+0.2,te)*(1.6+0.6*kick),0.001));m.material.uniforms.uA.value=(1-ss(TI,TI+0.3,te));m.visible=te>0.15&&te<TI+0.3;});
    blasts.forEach((b,i)=>{const u=(te-(b.h-FLY))/FLY;const vis=u>0&&u<1.35;b.m.visible=vis;if(!vis)return;
      tmp.lerpVectors(EM,TC,Math.min(u,1));b.m.position.copy(tmp);billboard(b.m,i);
      const sc=(0.45+0.75*Math.min(u,1)+0.6*Math.max(u-1,0))*(b.big?1.45:1);b.m.scale.setScalar(Math.max(sc*1.7,0.001));
      b.m.material.uniforms.uA.value=1;b.m.material.uniforms.uEr.value=-0.1+1.1*ss(1,1.35,u);});
    sparks.forEach((s,i)=>s.pose(te-H[i],tmp.set(TC.x+0.05,TC.y+(i%2?0.12:-0.05),0.12),i===3?1.1:0.75));
    rings.forEach((r,i)=>r.pose(te-H[i],TX,0,0.4,i===3?1:0.6));
    let rec=0,rz=0;H.forEach((h,i)=>{const k=hitE(te-h,8)*(te>=h?1:0)*(i===3?1.6:1);rec+=k;rz+=k*Math.cos((te-h)*22);});
    target.position.x=TX+0.12*Math.min(rec,2.2); target.rotation.z=-0.1*rz;
    o.em=0.35*Math.min(rec,1.5); o.emc.copy(U.uC1.value);
    // impacto vigente: el último golpe ya ocurrido (o el próximo)
    let hi=H.findIndex(h=>te<h); if(hi<0)hi=3; const hNow=te>=H[3]?H[3]:H[Math.max(hi-1,0)];
    if(te<H[0]){o.g.copy(EM);o.gs=0.8*inh+0.3;o.ga=0.12*inh;o.li=1.2*inh;o.ia=te-H[0];o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0.3;}
    else{const ih=te-hNow;o.g.copy(TC);o.gs=1+(te>=H[3]?0.8:0.3);o.ga=0.3*Math.exp(-ih*9);o.li=3.5*Math.exp(-ih*6);
      o.ia=ia;o.c.copy(TC);o.shake=te>=H[3]?1:0.3;o.dist=te>=H[3]?1:0.5;o.flash=0.5;}
  };
}});

// =====================================================================
// 7 · BEETLE SPIKE — tres púas de quitina carmesí con bandas negras brotan de las orejas y la frente, se abren en abanico
//     y atraviesan al rival una tras otra (ignoran el escudo: estalla la burbuja azul en esquirlas) y salen por detrás
//     con gotas de sangre; después Sangrado. ti 0,74 s
// =====================================================================
defs.push({key:"sty_ioBeetleSpike",name:"Beetle Spike (estilizado)",dur:2.1,ti:0.74,pal:P_SPIKE,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.15,
  phases:[["Púas",0],["Abanico",0.4],["Impacto",0.74],["Sangrado",0.95],["Disipación",1.6]],
build(a){
  const L=a.L,TA=0.4,TI=0.74,TS=0.95,TE=2.1;
  const spikeM=S.mat(SOLID(CHITIN_BODY(6),{hot:'vec3(1.,.3,.2)',rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const geo=new THREE.ConeGeometry(0.2,1.25,14,6).rotateZ(-Math.PI/2).translate(-0.62,0,0);   // punta en el origen, hacia +x
  const roots=[V3(-3.72,1.9,0.28),V3(-3.62,2.0,0),V3(-3.72,1.9,-0.28)];
  const fan=[V3(-3.2,2.55,0.75),V3(-3.05,2.95,0),V3(-3.2,2.55,-0.75)];
  const hit=[V3(TX-0.15,1.25,0.12),V3(TX-0.15,1.0,0),V3(TX-0.15,1.15,-0.12)];
  const spikes=[0,1,2].map(i=>{const m=new THREE.Mesh(geo,spikeM);L.mesh.add(m);return {m,t0:TI+i*0.05-0.2,th:TI+i*0.05};});
  const bubble=new THREE.Mesh(new THREE.SphereGeometry(0.95,28,18),S.mat(`uniform float uEr;void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
   float hx=styNoise(vUv*vec2(6.,3.)).g;float cell=smoothstep(.42,.5,abs(fract(hx*4.)-.5)*2.);float er=styErode(styNoise(vUv*2.).r,uEr,.08);if(er<.01)discard;
   gl_FragColor=vec4(styRampOf(${SHIELD},.5+.45*fr),(pow(fr,2.)*.6+cell*.15+.04)*er*uA);}`,{uEr:{value:0}},{mode:'matter'}));
  bubble.position.set(TX,1.0,0); L.mesh.add(bubble);
  const sparks=[0,1,2].map(i=>S.hitSpark(L.mesh,1.1,{seed:0.3+i*0.2})), ring=S.groundRing(L.decal,2.3);
  const K=`const float TI=${f(TI)};const vec3 TC=${v3(TC)};`;
  // esquirlas del escudo
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.3,.4,0.))*(2.+1.8*aSeed.z);vec3 p=vec3(3.4,1.,0.)+normalize(rnd())*.9+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.2+.09*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:SHIELD}));
  // sangre que sale por detrás
  S.pts(L.part,22,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+i*.05+aSeed.y*.04;float life=.5+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(vec3(1.,.4,0.)+rnd()*.5)*(2.4+1.5*aSeed.w);vec3 p=vec3(3.6,1.1,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=atan(v.y-14.*t,v.x)-1.5708;put(p,.18+.07*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:L3(.75,.05,.08)}));
  const bleed=S.status(a,'bleed',[target],TS,TE);
  a.pose=function(te,o){
    const ia=te-TI, sprout=back(ss(0.02,TA,te));
    spikes.forEach((s,i)=>{const m=s.m;let vis=true;
      if(te<TA){m.position.copy(roots[i]);tmp.copy(fan[i]).sub(roots[i]);aim(m,tmp);m.scale.setScalar(Math.max(1.2*sprout,0.001));}
      else if(te<s.t0){const u=e3((te-TA)/(s.t0-TA));m.position.lerpVectors(roots[i],fan[i],u);tmp.copy(hit[i]).sub(m.position);aim(m,tmp);m.scale.setScalar(1.2);}
      else if(te<s.th){const u=(te-s.t0)/(s.th-s.t0);m.position.lerpVectors(fan[i],hit[i],u*u);tmp.copy(hit[i]).sub(fan[i]);aim(m,tmp);m.scale.set(1.45,1.1,1.1);}
      else{const u=(te-s.th)/0.25;tmp2.copy(hit[i]).sub(fan[i]).normalize();m.position.copy(hit[i]).addScaledVector(tmp2,1.4*u);aim(m,tmp2);m.scale.setScalar(1.2);vis=u<1;}
      m.visible=vis&&te>0.02;});
    spikeM.uniforms.uK.value=0.25*ss(TA-0.1,TA,te)*(1-ss(TA,TA+0.2,te)); spikeM.uniforms.uQ.value=-1;
    bubble.visible=te>TA&&ia<0.35; set(bubble,0,ss(TA,TA+0.2,te)*0.9); bubble.material.uniforms.uEr.value=ia<0?-0.1:-0.1+1.2*ss(0,0.3,ia);
    bubble.scale.setScalar(1+0.08*hitE(ia,10));
    sparks.forEach((s,i)=>s.pose(ia-i*0.05,hit[i],0.85)); ring.pose(ia,TX,0,0.45,0.9);
    const be=bleed.pose(te);
    let rec=0;[0,1,2].forEach(i=>{rec+=hitE(ia-i*0.05,9)*(ia>=i*0.05?1:0);});
    target.position.x=TX+0.14*Math.min(rec,1.8); target.rotation.z=-0.12*rec*Math.cos(ia*24);
    o.em=0.4*Math.min(rec,1); o.emc.copy(U.uC1.value); S.statusGlow(o,[{kind:'bleed',env:be}]);
    if(ia<0){o.g.copy(EM);o.gs=0.6*sprout;o.ga=0.1;o.li=1;o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0.2;}
    else{o.g.copy(TC);o.gs=1.2;o.ga=0.3*Math.exp(-ia*8);o.li=3.5*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=0.6;o.dist=0.8;o.flash=0.6;}
  };
}});

// =====================================================================
// 8 · LARVA — hilos de seda bajan en espiral y envuelven al lanzador en un capullo de seda con hilo carmesí; en la muda
//     el capullo se agrieta y suelta pelusa, y una semilla de energía dorada (+1 PA el próximo turno) sube y se queda
//     orbitando sobre la cabeza hasta apagarse. ti 0,42 s
// =====================================================================
const COCOON_FS=`uniform float uQ;uniform float uGrow;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float h=vUv.y;if(h<1.-uGrow)discard;float nz=styNoise(vUv*vec2(2.,4.)+.2).r;if(styErode(nz*.7+abs(h-.5)*.3,uQ,.06)<.5)discard;
 float wrap=smoothstep(.25,.5,abs(fract(h*10.+vUv.x*2.+nz*.3)-.5));float red=smoothstep(.06,0.,abs(fract(h*3.+vUv.x*1.)-.5)-.42);
 vec3 base=mix(${SILK},${L3(.82,.72,.58)},wrap*.5);base=mix(base,${CRIM},red*.85);
 vec3 c=styRampOf(base,clamp(.25+.55*l-.08*wrap,0.,1.))*styTint(l);gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_ioLarva",name:"Larva (estilizado)",dur:1.4,ti:0.42,pal:P_LARVA,tier:1,stylized:true,
  phases:[["Caída",0],["Hilado",0.2],["Capullo",0.42],["Muda",0.7],["Disipación",1.0]],
build(a){
  const L=a.L,TH=0.2,TI=0.42,TM=0.7,TE=1.4,TOP=V3(-3.7,2.6,0);
  const silkM=S.mat(`uniform float uGrow;void main(){if(vUv.x<1.-uGrow)discard;gl_FragColor=vec4(styRampOf(${SILK},.75),.9*uA);}`,{uGrow:{value:0}},{mode:'matter',side:THREE.DoubleSide});
  const threads=[0,1,2].map(i=>{const m=new THREE.Mesh(helixGeo(2.2,0.85,0.55,2.4,0.05,90),silkM);m.position.set(CX,0.05,0);m.rotation.y=i*2.094;L.mesh.add(m);return m;});
  const cocoon=new THREE.Mesh(new THREE.SphereGeometry(0.62,28,20),S.mat(COCOON_FS,{uQ:{value:-1},uGrow:{value:0}},{mode:'solid'}));
  cocoon.scale.set(1,1.55,1); cocoon.position.set(CX,0.95,0); L.mesh.add(cocoon);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.17,20,14),S.mat(SOLID(`base=${GOLD};lb=.08;`,{hot:'vec3(1.,.55,.15)',rim:.4}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(orb);
  const crack=S.hitSpark(L.mesh,1.2,{seed:0.7}), ring=S.groundRing(L.decal,2.2);
  const glyph=groundPlane(1.8,CX,0.03,S.mat(GLYPH(`float hx=smoothstep(.05,0.,abs(r*cos(mod(an,1.0472)-.5236)-.5))*step(r,.75);m=max(m*.4,hx*.9);`,.6),{},{mode:'energy'}));
  L.decal.add(glyph);
  const K=`const float TI=${f(TI)};const float TM=${f(TM)};`;
  // pelusa de seda al romperse
  S.pts(L.part,24,VV+K+`void main(){float s=TM+aSeed.x*.08;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.5,0.))*(1.4+1.2*aSeed.z);vec3 p=vec3(-3.7,1.1,0.)+normalize(rnd())*vec3(.5,.8,.5)+v*t*(1.-.5*t)+vec3(0.,-1.2*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*4.;put(p,.26+.1*aSeed.w);}`,
   S.MATTER_FS(C.puff,{relief:3,col:SILK,bias:.05}));
  // estela de la semilla dorada
  S.pts(L.part,14,VV+K+`void main(){float s=TM+aSeed.x*.6;float life=.25;float age=(uT-s)/life;float u=clamp((s-TM)/.25,0.,1.);
   float an=s*4.;vec3 p=mix(vec3(-3.7,1.3,0.),vec3(-3.7,2.6,0.),u*u*(3.-2.*u))+vec3(cos(an)*.45,0.,sin(an)*.4)*smoothstep(0.,1.,u)+rnd()*.04;
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;vK=0.;vR=0.;put(p,.13);}`,S.ENERGY_FS(C.spark,{gain:1.15}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, im=te-TM, wrapG=ss(0,TI,te);
    threads.forEach(m=>{m.visible=te<TM+0.05;m.rotation.y+=0;});
    silkM.uniforms.uGrow.value=wrapG; silkM.uniforms.uA.value=1-ss(TI,TM,te);
    cocoon.visible=te>TH&&im<0.35; cocoon.material.uniforms.uGrow.value=ss(TH,TI,te)*1.02;
    cocoon.material.uniforms.uQ.value=im<0?-1:-0.1+1.2*ss(0,0.3,im);
    cocoon.scale.set(1+0.05*hitE(ia,10)+0.03*Math.sin(te*40)*ss(TI,TM,te)*(im<0?1:0),1.55,1);
    crack.pose(im,tmp.set(-3.7,1.4,0.2),0.75); ring.pose(ia,CX,0,0.4,0.9);
    const rise=ss(TM,TM+0.25,te), fade=ss(1.15,TE,te);const an=te*4;
    orb.visible=im>=0&&fade<1; orb.position.set(CX+Math.cos(an)*0.45*rise,1.3+1.3*(rise*rise*(3-2*rise))+0.05*Math.sin(te*7),Math.sin(an)*0.4*rise);
    orb.scale.setScalar(Math.max((0.8+0.9*rise)*(1-fade),0.001)); orb.material.uniforms.uK.value=0.25+0.2*Math.sin(te*12);
    glyph.visible=ia>=0; set(glyph,-0.1+1.15*ss(1.0,TE,te),ss(TI,TI+0.15,te)); glyph.rotation.y=te;
    o.em=0; o.emc.copy(U.uC1.value);
    o.g.copy(im>=0?orb.position:TOP);o.gs=0.7+0.5*rise;o.ga=0.1+0.18*rise*(1-fade);o.li=1+2*rise*(1-fade);
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

VFX.module("Estilizado · Bicho · Orejas",defs);
})();

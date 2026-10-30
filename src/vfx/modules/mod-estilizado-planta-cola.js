// =====================================================================
// ESTILIZADO · PLANTA · COLA (Hito 101) — las 10 cartas de cola de Planta hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_ptCarrot, sty_ptCattail…). Mismos dur / ti / fases que las originales (ya con su
// nivel aplicado), así el daño llega igual. Los efectos nacen del punto de la cola del lanzador (≈ (-4.15,0.7,0)).
// Semántica según PartCards.js (no la del módulo antiguo, que en varias cartas era de la versión anterior):
//   Carrot (daño, +1 PA si daña) · Cattail (daño, Provocación al lanzador) · Hatsune (aliado: escudo + Miedo al atacante)
//   Hot Butt (daño + Quemadura) · Mystery Seed (sobre sí: +2 PA) · Potato Leaf (daño) · Shield Shroom (sobre sí: escudo + cura)
//   Sprout (aliado: escudo + cura) · Tropical Guardian (aliado: escudo + inamovible) · Yam (sobre sí: daño y Veneno a todos)
// Cartas sobre aliado: el receptor es el muñeco objetivo (x = 3,4; allies 0), como en el Sapidae. receiver:'target' lo marca
// para el puente (si la carta se lanza sobre sí misma, el receptor debería ser el lanzador).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,enemies,ENEMY_POS}=VFX;
const {v3,billboard,towardCam,taperTube,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CARROT=pal("Cola · Zanahoria",["#ffb347","#c8500e"]);
const P_CATTAIL=pal("Cola · Espadaña",["#e8b56e","#6b3d1a"]);
const P_HATSUNE=pal("Cola · Hatsune",["#8ff3ee","#128f96"]);
const P_CHILI=pal("Cola · Chile",["#ffae3a","#c9221a"]);
const P_SEED=pal("Cola · Semilla",["#ffb3d6","#b8336f"]);
const P_POTATO=pal("Cola · Patata",["#d4ec6e","#3f7d22"]);
const P_SHROOM=pal("Cola · Hongo",["#ffd166","#c0601a"]);
const P_SPROUT=pal("Cola · Brote",["#c9f26a","#2b8640"]);
const P_TOTEM=pal("Cola · Tótem",["#ff7092","#11a08a"]);
const P_YAM=pal("Cola · Ñame",["#d690ff","#5a1c98"]);

const TL0=V3(-0.45,0.7,0);                  // cola, en coordenadas del lanzador
const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7;    // objetivo (base x, pecho visible) y lanzador
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0), qa=new THREE.Quaternion(), qb=new THREE.Quaternion();
const aim=(o,d,spin)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());if(spin)o.quaternion.multiply(qb.setFromAxisAngle(XA,spin));};
function tailW(out){const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),x=TL0.x*caster.scale.x,y=TL0.y*caster.scale.y;
  return out.set(caster.position.x+x*c-y*s,caster.position.y+x*s+y*c,caster.position.z);}
const bez3=(out,a,b,c,d,t)=>{const s=1-t;return out.set(s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y,s*s*s*a.z+3*s*s*t*b.z+3*s*t*t*c.z+t*t*t*d.z);};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
// plano de suelo con segmentos a lo largo de x (el pasillo del puente se deforma vértice a vértice)
const groundStrip=(len,w,x,y,mat,seg=48)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,w,seg,1).rotateX(-Math.PI/2),mat);m.position.set(x,y,0);return m;};

// ---------- colores de materia (semánticos, fijos) ----------
const EARTH="vec3(.55,.42,.29)", SOOT="vec3(.2,.16,.13)", LEAFD="vec3(.17,.42,.1)", LEAFL="vec3(.5,.74,.2)",
  CREAM="vec3(.96,.9,.7)", WOOD="vec3(.52,.32,.17)", GOLD="vec3(1.,.74,.26)", CARROT="vec3(.96,.46,.08)",
  CHILI="vec3(.86,.1,.06)", YAMSK="vec3(.46,.26,.42)", RUBY="vec3(1.,.16,.22)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.2,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// hoja en un plano (u = ancho, v = largo de la base a la punta): nervio claro, nervaduras y borde dentado opcional
const LEAF_BODY=(dark,light,serr=0)=>`float v=vUv.y,u=vUv.x-.5;float w=.5*pow(sin(3.1416*pow(clamp(v,0.,1.),.7)),.85)*(1.+${f(serr)}*sin(v*40.));
 if(abs(u)>w)discard;float rib=smoothstep(.035,0.,abs(u));float vein=band(fract(v*6.-abs(u)*2.2),.5,.07)*step(abs(u),w*.85);
 base=mix(${dark},${light},.25+.55*v);base=mix(base,${CREAM},rib*.45);lb=-.12*vein+.06*rib;`;
// tubo (raíz, tallo) que crece de la base: uGrow = hasta dónde (u), uQ = erosión
const TUBE_FS=(col)=>`uniform float uGrow;uniform float uQ;
void main(){float u=vUv.x;if(u>uGrow)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vec2(u*6.,vUv.y*.6)+.3).r;if(styErode(nz*.7+u*.3,uQ,.06)<.5)discard;
 vec3 c=styRampOf(${col},clamp(.2+.55*l+(nz-.5)*.15,0.,1.))*styTint(l);
 gl_FragColor=vec4(c,1.);}`;
// cúpula o caparazón de energía: borde de fresnel, bandas que suben, revela de abajo arriba (uP) y se erosiona (uD)
const SHELL_FS=(extra='')=>`uniform float uD;uniform float uF;uniform float uR;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 if(h>uP*1.15-.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);
 float bands=0.;${extra}
 float m=(pow(fr,1.8)*.95+.17+bands)*er*(1.-smoothstep(uP*1.15-.25,uP*1.15-.1,h)*.6);
 gl_FragColor=vec4(styRamp(.5+.45*fr)*(.95+.6*uF),min(m,1.)*uA);}`;
// sello de pincel en el suelo con un dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.8);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// partícula redonda iluminada (cuerpo esférico falso): colExpr en función de q (−.5..+.5)
const BALL_P=(colExpr,shape='float m=step(length(q),.46);')=>S.PV+`void main(){vec2 q=styPC()-.5;${shape}if(m<.5)discard;
 vec3 n=normalize(vec3(q*2.1,sqrt(max(0.,1.-dot(q*2.1,q*2.1)))));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.7+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 vec3 c=${colExpr};gl_FragColor=vec4(c*styTint(l),er*vA);}`;
const defs=[];

// =====================================================================
// 1 · CARROT — una zanahoria-flecha brota de la cola, vuela en arco dejando gotas de jugo, se clava en el rival,
//     se calienta (vibra y se agrieta) y revienta en trozos naranjas, hojas, tierra y humo. Si daña, tres chispas
//     naranjas vuelven al lanzador (+1 PA). ti 0,95 s
// =====================================================================
const CARROT_BODY=`float ring=smoothstep(.55,.9,sin(vP.x*62.+styNoise(vec2(atan(vP.z,vP.y)*.5,vP.x*2.)).r*3.));
 base=mix(${CARROT},vec3(1.,.62,.2),smoothstep(-.6,0.,vP.x)*.5);lb=-.16*ring;`;
defs.push({key:"sty_ptCarrot",name:"Carrot (estilizado)",dur:2.2,ti:0.95,pal:P_CARROT,tier:2,stylized:true,
  phases:[["Brote",0],["Disparo",0.35],["Clavada",0.7],["Explosión",0.95],["Humo",1.172]],
build(a){
  const L=a.L,TS=0.35,TK=0.7,TI=0.95,CS=1.7;
  const HP=V3(3.02,1.3,0.12), P1=V3(-5.0,2.7,0.3), P2=V3(-0.8,3.6,0.35);
  const P0=V3(-4.25,0.9,0), DEND=V3(0.95,-0.32,0).normalize(), EP=HP.clone().addScaledVector(DEND,-0.25);
  const car=new THREE.Group(); L.mesh.add(car);
  const body=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.66,20,6).rotateZ(Math.PI/2),S.mat(SOLID(CARROT_BODY,{hot:'vec3(1.,.42,.12)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  body.position.x=-0.33; car.add(body);   // punta en el origen del grupo
  const leafMat=S.mat(SOLID(LEAF_BODY(LEAFD,LEAFL,0.1)),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  for(let i=0;i<3;i++){const lf=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.46).rotateZ(Math.PI/2),leafMat);
    lf.position.x=-0.86; lf.rotation.x=i*Math.PI/3; lf.rotation.z=(i-1)*0.18; car.add(lf);}
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.62}), boomSpark=S.hitSpark(L.mesh,1.6,{seed:0.21});
  const ring=S.groundRing(L.decal,3.0);
  const scorch=groundPlane(2.2,TX-0.1,0.026,S.mat(STAIN(SOOT,.55),{},{mode:'matter'})); L.decal.add(scorch);
  const shadow=S.contactShadow(L.decal,0.9);
  // reventón de pulpa naranja: esfera que se expande y se consume desde el borde
  const pulp=new THREE.Mesh(new THREE.SphereGeometry(0.55,32,20),S.mat(`uniform float uEr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
   vec3 q=normalize(vP);float nz=styNoise(vec2(atan(q.z,q.x)*.32,q.y*.5+.5)).r*.6+styNoise(vec2(atan(q.z,q.x)*.8,q.y*1.3)).g*.4;
   float fr=abs(dot(n,normalize(vV)));float er=styErode(nz*.75+fr*.25,uEr,.08);if(er<.01)discard;
   gl_FragColor=vec4(styRampOf(${CARROT},.3+.55*l)*styTint(l),er*uA);}`,{uEr:{value:0}},{mode:'matter',side:THREE.FrontSide}));
  pulp.position.copy(EP); L.mesh.add(pulp);
  const K=`const float TS=${f(TS)};const float TK=${f(TK)};const float TI=${f(TI)};const vec3 EP=${v3(EP)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 HP=${v3(HP)};
  vec3 bz(float t){float s=1.-t;return s*s*s*P0+3.*s*s*t*P1+3.*s*t*t*P2+t*t*t*HP;}`;
  // gotas de jugo que se desprenden en el vuelo
  S.pts(L.part,16,VV+K+`void main(){float s=TS+aSeed.x*(TK-TS)*.95;float u=(s-TS)/(TK-TS);float ue=u*(.55+.45*u);
   float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz(ue)+rnd()*.08+vec3(0.,-3.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=3.14159;
   put(p,.12+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:CARROT}));
  // trozos de zanahoria, hojas y tierra en la explosión
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.75,0.))*(2.2+2.4*aSeed.z);vec3 p=EP+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*(8.+6.*aSeed.w);put(p,.26+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:CARROT}));
  S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.1,1.,0.))*(1.6+1.6*aSeed.z);vec3 p=EP+v*t*(1.-.4*t)+vec3(0.,-2.6*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+sin(t*7.+aSeed.w*6.)*1.2;put(p,.24+.08*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.36,.62,.15)'}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.02+aSeed.x*.1;float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(EP.x,.3,0.)+vec3(cos(an),0.,sin(an)*.8)*(.3+.8*(1.-exp(-t*5.)))+vec3(0.,.15+t*(.5+.4*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.42+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.08}));
  // +1 PA: chispas que vuelven al lanzador
  S.pts(L.part,3,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+.25+i*.07;float u=clamp((uT-s)/.42,0.,1.);
   vec3 a0=EP+vec3(0.,.3,0.),a1=vec3(-3.7,1.95,0.);vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*(1.6+.3*i),(i-1.)*.4*sin(u*3.14159));
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*6.;put(p,.3);}`,S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  const smat=body.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ik=te-TK, grow=ss(0.03,TS,te);
    caster.rotation.z=0.08*ss(0,TS,te)-0.16*ss(TS,TS+0.08,te)+0.08*ss(TS+0.15,TI+0.3,te);
    // posición: brote en la cola → vuelo por la curva → clavada (vibra) → oculta en la explosión
    if(te<TS){tailW(tmp);car.position.copy(tmp).add(tmp2.set(-0.05,0.25*grow,0));aim(car,tmp2.set(-0.35,1,0),te*4);car.scale.setScalar(Math.max(CS*(0.2+0.8*e3(te/TS)),0.001));}
    else if(te<TK){const u=cl((te-TS)/(TK-TS)),ue=u*(0.55+0.45*u);bez3(car.position,P0,P1,P2,HP,ue);
      const u2=Math.min(ue+0.02,1);bez3(tmp,P0,P1,P2,HP,u2);aim(car,tmp.sub(car.position).lengthSq()>1e-6?tmp:DEND,te*16);car.scale.setScalar(CS);}
    else{const sh=0.025*ss(TK,TI,te)*Math.sin(te*90);car.position.copy(HP).add(tmp.set(sh,sh*0.6,0));aim(car,DEND,0);car.scale.setScalar(CS*(1+0.08*ss(TK,TI,te)));}
    car.visible=ia<0&&grow>0.001;
    smat.uK.value=0.9*ss(TK,TI,te)*(0.6+0.4*Math.sin(te*60));
    shadow.pose(car.position.x,0,0.6+0.25*car.position.y*0.2,ia<0?0.5*grow*cl(1.5-car.position.y*0.3):0);
    spark.pose(ik,HP,0.8);
    boomSpark.pose(ia,EP,1.1);
    ring.pose(ia,EP.x,0,0.45,1);
    const pk=cl(ia/0.16),pe=e3(pk); pulp.visible=ia>=0&&ia<0.34; pulp.scale.set(0.5+1.05*pe,0.45+0.75*pe,0.5+1.05*pe);
    pulp.material.uniforms.uA.value=1; pulp.material.uniforms.uEr.value=-0.1+1.15*ss(0.04,0.32,ia);
    scorch.visible=ia>=0; scorch.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(scorch,ia>=0?-0.1+1.15*ss(0.5,1.25,ia):0,1);
    const h1=hitE(ik,9),h2=hitE(ia,6);
    target.position.x=TX+0.05*h1+0.26*h2*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.07*h1*Math.cos(ik*30)-0.24*h2*Math.cos(ia*14);
    target.scale.set(1+0.05*h2,1-0.07*h2,1+0.05*h2);
    o.em=0.3*ss(TK,TI,te)*(ia<0?1:0)+0.4*h2; o.emc.copy(U.uC1.value);
    const pa=ss(TI+0.6,TI+0.7,te)*(1-ss(TI+0.75,TI+1.05,te)); glowOf(caster,U.uC1.value,0.45*pa);
    if(te<TK){o.g.copy(car.position);o.gs=0.6*grow;o.ga=0.12*grow;o.li=1.2*grow;}
    else if(ia<0){o.g.copy(HP);o.gs=0.8+0.6*ss(TK,TI,te);o.ga=0.15+0.2*ss(TK,TI,te);o.li=1.5+2.5*ss(TK,TI,te);}
    else{o.g.copy(EP);o.gs=1.4+3*ia;o.ga=Math.exp(-ia*10)*0.45;o.li=6*Math.exp(-ia*5);}
    if(ia<0){o.ia=ik;o.c.copy(HP);o.shake=0;o.dist=0.3;o.flash=0.4;}
    else{o.ia=ia;o.c.copy(EP);o.shake=1;o.dist=1;o.flash=0.8;}
  };
}});

// =====================================================================
// 2 · CATTAIL — cinco espigas de espadaña se abren en abanico detrás del lanzador y salen disparadas una tras otra
//     contra el rival: cada golpe suelta pelusa de vilano. Después, el lanzador queda con Provocación (anillo rojo).
//     Variante «bestia»: el vilano vuelve en estela hacia el lanzador (decorativo). ti 0,72 s
// =====================================================================
const CATHEAD_BODY=`float fz=styNoise(vUv*vec2(9.,3.)+.4).g;base=mix(vec3(.42,.22,.1),vec3(.62,.38,.18),fz);lb=-.08+.12*fz;`;
defs.push({key:"sty_ptCattail",name:"Cattail (estilizado)",dur:2.3,ti:0.72,pal:P_CATTAIL,tier:2,stylized:true,vlabel:"Rival",
  variants:[["otro","Otro"],["bestia","Bestia/Bicho"]],v:"otro",
  phases:[["Abanico",0],["Latigazo",0.32],["Golpes",0.72],["Semillas",0.959],["Fin",1.938]],
build(a){
  const L=a.L,TL=0.32,TI=0.72,DT=0.06,FL=TI-TL,N=5,VG=variantGroups(a,["otro","bestia"]);
  const headMat=S.mat(SOLID(CATHEAD_BODY,{hot:'vec3(1.,.5,.2)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const stemMat=S.mat(SOLID(`base=mix(${LEAFD},${LEAFL},.45);`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const darts=[];
  for(let i=0;i<N;i++){
    const g=new THREE.Group(); L.mesh.add(g);
    const head=new THREE.Mesh(new THREE.CapsuleGeometry(0.085,0.32,4,12).rotateZ(Math.PI/2),headMat); head.position.x=-0.26; g.add(head);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.025,0.18,6).rotateZ(-Math.PI/2),stemMat); tip.position.x=-0.02; g.add(tip);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.6,6).rotateZ(Math.PI/2),stemMat); stem.position.x=-0.72; g.add(stem);
    const ang=(i-(N-1)/2)*0.42;                          // abanico detrás del lanzador
    const fan=V3(-4.25-0.55*Math.cos(ang)+0.2,1.3+1.0*Math.cos(ang*0.7),Math.sin(ang)*0.9);
    const hit=V3(TX-0.32,0.85+0.16*((i*37)%5)/4,(i-2)*0.06);
    darts.push({g,fan,hit,ang,t0:TL+i*DT});
  }
  const sparks=darts.map((d,i)=>S.hitSpark(L.mesh,1.0,{seed:0.15+i*0.17}));
  const ring=S.groundRing(L.decal,2.6);
  const taunt=S.status(a,'taunt',[caster],TI+0.3,2.3);
  const K=`const float TI=${f(TI)};const float DT=${f(DT)};const float TX=${f(TX)};`;
  // pelusa de vilano en cada golpe (materia crema) y motas de semilla
  S.pts(L.part,30,VV+K+`void main(){float i=floor(aSeed.x*5.);float s=TI+i*DT;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(TX-.35,.85+.04*i,(i-2.)*.06);vec3 v=normalize(rnd()+vec3(-.55,.35,0.))*(1.2+1.2*aSeed.z);
   vec3 p=b+v*t*(1.-.5*min(t,1.))+vec3(0.,.25*t,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t*2.;
   put(p,(.34+.16*aSeed.w)*(.6+.7*age));}`,S.MATTER_FS(C.puff,{relief:3,col:CREAM,bias:.05}));
  S.pts(L.part,16,VV+K+`void main(){float i=floor(aSeed.x*5.);float s=TI+i*DT+.02;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(TX-.35,.9,(i-2.)*.06);vec3 v=normalize(rnd()+vec3(-.3,.6,0.))*(1.6+1.2*aSeed.z);
   vec3 p=b+v*t*(1.-.45*t)+vec3(0.,-.6*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*5.;
   put(p,.12+.05*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.5,.3,.14)'}));
  // variante bestia: el vilano vuelve en estela al lanzador
  S.pts(VG.bestia.part,22,VV+K+`void main(){float s=TI+.25+aSeed.x*.35;float u=clamp((uT-s)/.7,0.,1.);
   vec3 a0=vec3(TX-.4,.9,0.),a1=vec3(-3.7,1.2,0.);vec3 p=mix(a0,a1,u)+vec3(0.,sin(u*3.14159)*(1.2+.6*aSeed.y),(aSeed.z-.5)*1.2*sin(u*3.14159))+rnd()*.12;
   vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.75,1.,u);vR=aSeed.w*6.28+u*8.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.puff,{relief:3,col:CREAM,bias:.1}));
  a.setVariant=v=>{if(v!=="bestia")v="otro";a.v=v;for(const k of VFX.LK){VG.otro[k].visible=v==="otro";VG.bestia[k].visible=v==="bestia";}};
  a.setVariant(a.v);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,TL,te)-0.2*ss(TL,TL+0.1,te)+0.1*ss(TL+0.2,TI+0.2,te);
    let hit=0,last=-1;
    darts.forEach((d,i)=>{
      const ti=d.t0+FL, rise=ss(0.02+i*0.03,0.2+i*0.025,te);
      tailW(tmp);
      if(te<d.t0){d.g.position.copy(tmp).lerp(d.fan,e3(rise)); d.g.position.y+=0.06*Math.sin(te*20+i);
        aim(d.g,tmp2.set(TX-0.3,1.0,0).sub(d.g.position).lerp(tmp3.set(0,1,0),0.5*(1-rise)),0);d.g.scale.setScalar(Math.max(1.5*(0.3+0.7*rise),0.001));}
      else if(te<ti){const u=(te-d.t0)/FL,uu=u*u*(0.6+0.4*u);
        d.g.position.lerpVectors(d.fan,d.hit,uu); d.g.position.y+=Math.sin(u*Math.PI)*0.9*(1-Math.abs(d.ang)*0.6);
        tmp2.lerpVectors(d.fan,d.hit,Math.min(uu+0.03,1)); tmp2.y+=Math.sin(Math.min(u+0.03,1)*Math.PI)*0.9*(1-Math.abs(d.ang)*0.6);
        aim(d.g,tmp2.sub(d.g.position).lengthSq()>1e-7?tmp2:tmp3.set(1,0,0),u*8);d.g.scale.setScalar(1.5);}
      else{d.g.position.copy(d.hit);d.g.position.x+=0.04*Math.sin((te-ti)*40)*Math.exp(-(te-ti)*8);}
      d.g.visible=rise>0.001&&te<ti+0.5;
      const ih=te-ti; hit+=hitE(ih,10); if(ih>=0)last=i;
      sparks[i].pose(ih,d.hit,0.7);
    });
    headMat.uniforms.uQ.value=-0.1+1.15*ss(TI+0.15,TI+0.6,te); stemMat.uniforms.uQ.value=headMat.uniforms.uQ.value;
    ring.pose(te-(TI+0.3),CX,0,0.5,0.9);
    target.position.x=TX+0.08*Math.min(hit,2); target.rotation.z=-0.1*Math.min(hit,2)*Math.cos(te*40);
    o.em=0.2*Math.min(hit,1); o.emc.copy(U.uC1.value);
    const tn=taunt.pose(te); glowOf(caster,COL.setRGB(1,0.3,0.16),0.28*tn*(0.7+0.3*Math.sin(te*12)));
    if(ia<0){tailW(o.g);o.gs=0.5;o.ga=0.06;o.li=0.8*ss(0,TL,te);}
    else{o.g.set(TX-0.35,0.9,0);o.gs=0.9+ia;o.ga=Math.exp(-ia*8)*0.2;o.li=2.5*Math.exp(-ia*3);}
    o.ia=ia;o.c.set(TX-0.32,0.9,0);o.shake=0.4;o.dist=0.5;o.flash=0.4;
  };
}});

// =====================================================================
// 3 · HATSUNE — la cola vibra y suelta ondas sónicas turquesa con notas que viajan hasta el aliado; en ti se forma a
//     su alrededor una cúpula de sonido (escudo). Dos proyectiles enemigos chocan contra ella, se frenan, pierden el
//     color y se deshacen en humo gris (el Miedo del atacante). ti 0,8 s
// =====================================================================
const NOTE_P=S.PV+`void main(){vec2 q=styPC();
 vec2 h=q-vec2(.36,.24);h=vec2(h.x*.94+h.y*.34,-h.x*.34+h.y*.94);float hd=step(length(h/vec2(.15,.1)),1.);
 float stem=step(abs(q.x-.49),.035)*step(.25,q.y)*step(q.y,.86);
 float fx=q.x-.49;float fy=.86-fx*1.1-fx*fx*2.;float flag=step(abs(q.y-fy),.05)*step(0.,fx)*step(fx,.24);
 float m=max(max(hd,stem),flag);if(m<.5)discard;
 float er=styErode(styNoise(q*.6+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 float l=step(0.,-h.x-h.y+.03)*.5+.5;
 gl_FragColor=vec4(styRampOf(uC2,.45+.45*l*hd+.25*(1.-hd)),er*vA);}`;
const WAVE_FS=`uniform float uW;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float arc=smoothstep(.09,.02,abs(r-.82))*smoothstep(1.15,.5,abs(an));float inner=smoothstep(.05,.01,abs(r-.62))*smoothstep(.8,.3,abs(an))*.6;
 float m=max(arc,inner);if(m<.02)discard;float er=styErode(styNoise(vUv*vec2(1.,2.)+uW).r*.8+.2,uP,.12);
 gl_FragColor=vec4(styRamp(.6+.35*arc),m*er*uA);}`;
const COMET_FS=`uniform float uPw;void main(){vec2 p=vUv-vec2(.78,.5);float r=length(p*vec2(1.,1.2));
 float head=smoothstep(.13,.07,r);float w=max(.13*(1.+p.x*1.3),0.);float tl=p.x<0.?exp(p.x*4.)*smoothstep(w,w*.2,abs(p.y)):0.;
 float nz=styNoise(vUv*vec2(2.,1.)-vec2(uT*3.,0.)).r;
 vec3 hot=mix(vec3(.9,.16,.08),vec3(1.,.55,.25),head);vec3 dead=vec3(.38,.35,.4);
 vec3 c=mix(dead,hot,uPw)*(.7+.8*uPw);
 gl_FragColor=vec4(c,min(head+tl*(.4+.4*nz),1.)*uA*(.35+.65*uPw));}`;
defs.push({key:"sty_ptHatsune",name:"Hatsune (estilizado)",dur:2.3,ti:0.8,pal:P_HATSUNE,tier:2,stylized:true,receiver:'target',
  phases:[["Vibración",0],["Ondas",0.24],["Proyectiles",0.44],["Amortiguación",0.8],["Calma",1.775]],
build(a){
  const L=a.L,TW=0.24,TI=0.8,TP0=1.0,TE=2.3,R=1.05;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(R,40,20,0,Math.PI*2,0,Math.PI*0.55),S.mat(SHELL_FS(
    `bands=smoothstep(.06,0.,.5-abs(fract(h*3.-uT*1.6)-.5))*.45;`),{uD:{value:0},uF:{value:0},uR:{value:R}},{mode:'energy',side:THREE.DoubleSide}));
  dome.position.set(TX,0,0); L.mesh.add(dome);
  const glyph=groundPlane(2.8,TX,0.025,S.mat(GLYPH(`float st=smoothstep(.06,0.,abs(r-.86))*step(.5,fract(an/6.2832*16.));m=max(m*.55,st*.8);`),{},{mode:'energy'})); L.decal.add(glyph);
  const waves=[]; for(let i=0;i<3;i++){const w=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(WAVE_FS,{uW:{value:i*0.31}},{mode:'energy',depthTest:false})); L.mesh.add(w); waves.push(w);}
  const comets=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.3,0.8),S.mat(COMET_FS,{uPw:{value:1}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const CP=[{y:1.35,z:0.15,t0:TP0,v:6.5},{y:0.75,z:-0.1,t0:TP0+0.22,v:6.0}];
  const dings=[S.hitSpark(L.mesh,1.0,{seed:0.3}),S.hitSpark(L.mesh,1.0,{seed:0.7})];
  const K=`const float TW=${f(TW)};const float TI=${f(TI)};const float TX=${f(TX)};const float R=${f(R)};`;
  // notas que van de la cola al aliado
  S.pts(L.part,14,VV+K+`void main(){float s=TW+aSeed.x*.55;float u=clamp((uT-s)/.55,0.,1.);
   vec3 a0=vec3(-4.15,.95,0.),a1=vec3(TX-.2,1.3,0.);vec3 p=mix(a0,a1,u)+vec3(0.,sin(u*3.14159)*(.9+.7*aSeed.y)+sin(u*9.+aSeed.z*6.)*.12,(aSeed.w-.5)*1.3*sin(u*3.14159));
   vA=(uT>s&&u<1.)?smoothstep(0.,.1,u):0.;vK=smoothstep(.8,1.,u);vR=sin(u*8.+aSeed.z*5.)*.4;put(p,.5+.14*aSeed.w);}`,NOTE_P);
  // notas que giran en la cúpula y suben al calmarse
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.5;float life=.9+aSeed.y*.4;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;vec3 p=vec3(TX+cos(an)*R*.95,.35+age*1.5,sin(an)*R*.95);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=sin(age*6.)*.3;put(p,.44+.1*aSeed.w);}`,NOTE_P);
  // humo gris de los proyectiles apagados
  S.pts(L.part,16,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=${f(TP0+0.34)}+i*.22+aSeed.y*.08;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(TX+R+.05,i<.5?1.35:.75,0.);vec3 p=b+rnd()*vec3(.2,.15,.2)+vec3(.25*t,.5*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.28+.12*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:'vec3(.5,.48,.52)',grey:.3}));
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI-0.05,TI+0.1,te)*(1-ss(1.85,TE-0.05,te));
    caster.rotation.z=0.05*Math.sin(te*55)*ss(0,0.1,te)*(1-ss(TW+0.4,TW+0.6,te));
    caster.scale.set(1+0.02*Math.sin(te*70)*(1-ss(0.4,0.6,te)),1,1);
    waves.forEach((w,i)=>{const s=TW+i*0.12,u=cl((te-s)/0.5);tailW(tmp);tmp.lerp(tmp2.set(TX-0.6,1.2,0),u);tmp.y+=Math.sin(u*Math.PI)*0.5;
      towardCam(w.position,tmp,0.2);billboard(w,0);w.visible=te>s&&u<1;w.scale.setScalar(0.45+0.9*u);set(w,ss(0.6,1,u),1);});
    const du=dome.material.uniforms; dome.visible=te>TI-0.08;
    du.uP.value=ss(TI-0.08,TI+0.12,te); du.uA.value=1; du.uD.value=ss(1.85,TE-0.05,te)*1.1;
    let ripple=0;
    comets.forEach((m,i)=>{const c=CP[i],u=te-c.t0,xh=TX+R+0.1,x0=xh+c.v*0.34;
      const k=cl(u/0.34),x=x0+(xh-x0)*(1-Math.pow(1-k,2)),slow=ss(0.28,0.4,u),xs=x+0.15*slow;
      m.position.set(xs,c.y,c.z);billboard(m,Math.PI);m.visible=u>0&&u<0.62;
      m.scale.setScalar(Math.max(1-0.6*ss(0.3,0.6,u),0.001));m.material.uniforms.uPw.value=1-ss(0.26,0.5,u);m.material.uniforms.uA.value=1-ss(0.48,0.62,u);
      dings[i].pose(u-0.33,tmp.set(xh,c.y,c.z),0.55);ripple+=hitE(u-0.33,7);});
    du.uF.value=hitE(ia,8)*0.8+ripple*0.9;
    {const k=1+0.05*hitE(ia,10)+0.03*ripple;dome.scale.set(k,1.75*k,k);}
    set(glyph,te>TI?-0.1+1.15*ss(1.85,TE,te):0.6*(1-ss(TI-0.2,TI,te)),ss(TI-0.15,TI+0.05,te)*(1-ss(TE-0.2,TE,te)));
    o.em=0.32*env+0.25*hitE(ia,6); o.emc.copy(U.uC1.value);
    if(ia<0){tailW(o.g);o.gs=0.6;o.ga=0.06;o.li=1.2*ss(TW,TI,te);}
    else{o.g.set(TX,1.0,0);o.gs=1.3+0.3*env;o.ga=0.15*Math.exp(-ia*6)+0.05*env;o.li=2.5*Math.exp(-ia*4)+0.8*env;}
    o.ia=ia;o.c.set(TX,1.0,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 4 · HOT BUTT — la cola se pone roja y escupe una llamarada de chile que cruza por encima del lanzador con
//     rodajas de chile y semillas girando; en ti prende al rival (estallido de fuego, humo) y le deja Quemadura. ti 0,8 s
// =====================================================================
const CHILI_P=S.PV+`void main(){vec2 q=styPC()-.5;q.x*=1.12;float r=length(q);if(r>.47)discard;
 float wall=step(.31,r);float sd=0.;for(int i=0;i<5;i++){float an=float(i)*1.2566+.3;sd+=step(length(q-vec2(cos(an),sin(an))*.18),.055);}
 float core=step(r,.08);vec3 n=normalize(vec3(q*2.,sqrt(max(0.,1.-dot(q*2.,q*2.)))));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.7+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 vec3 c=wall>.5?styRampOf(${CHILI},.3+.55*l):styRampOf(vec3(.95,.55,.35),.4+.4*l);c=mix(c,styRampOf(vec3(1.,.86,.5),.6+.3*l),min(sd+core,1.));
 gl_FragColor=vec4(c*styTint(l),er*vA);}`;
defs.push({key:"sty_ptHotButt",name:"Hot Butt (estilizado)",dur:2.3,ti:0.8,pal:P_CHILI,tier:2,stylized:true,
  phases:[["Picor",0],["Llamarada",0.35],["Quemadura",0.8],["Brasas",1.025],["Ascuas",1.887]],
build(a){
  const L=a.L,TF=0.35,TI=0.8,HP=V3(3.1,1.15,0);
  const Q0=V3(-4.2,0.85,0),Q1=V3(-5.2,3.0,0.2),Q2=V3(-0.6,3.8,0.3);
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.44});
  const ring=S.groundRing(L.decal,2.8);
  const burn=S.status(a,'burn',[target],TI+0.08,2.3);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const vec3 Q0=${v3(Q0)};const vec3 Q1=${v3(Q1)};const vec3 Q2=${v3(Q2)};const vec3 HP=${v3(HP)};
  vec3 bz(float t){float s=1.-t;return s*s*s*Q0+3.*s*s*t*Q1+3.*s*t*t*Q2+t*t*t*HP;}`;
  // picor: chispas y llamitas en la cola
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x*TF;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=Q0+rnd()*vec3(.18,.12,.18)+vec3(-.1*t,.9*t,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=(aSeed.w-.5)*.5;
   put(p,(.22+.1*aSeed.z)*(1.-.4*age));}`,S.ENERGY_FS(C.flame,{gain:1.25}),{mode:'energy'});
  // llamarada: lenguas de fuego que recorren la curva
  S.pts(L.part,90,VV+K+`void main(){float s=TF+aSeed.x*(TI-TF-.08);float life=.3+aSeed.y*.08;float u=clamp((uT-s)/life,0.,1.);
   float uu=u*(.6+.4*u);vec3 p=bz(uu)+rnd()*.14*(1.-u*.4);vA=(uT>s&&u<1.)?smoothstep(0.,.08,u):0.;vK=smoothstep(.55,1.,u);
   vR=(aSeed.w-.5)*.6;put(p,(.6+.25*aSeed.z)*(1.-.3*u));}`,S.ENERGY_FS(C.flame,{gain:1.3}),{mode:'energy'});
  // rodajas de chile y semillas que giran en la llamarada y salen despedidas en el impacto
  S.pts(L.part,10,VV+K+`void main(){float s=TF+.03+aSeed.x*(TI-TF-.15);float u=clamp((uT-s)/.32,0.,1.);float t=max(uT-s-.32,0.);
   vec3 v=normalize(rnd()+vec3(.2,.9,0.))*(1.8+1.5*aSeed.z);vec3 p=u<1.?bz(u*(.6+.4*u))+rnd()*.2:HP+v*t+vec3(0.,-8.*t*t,0.);
   vA=(uT>s&&t<.6&&p.y>0.)?1.:0.;vK=smoothstep(.4,.6,t);vR=aSeed.y*6.28+uT*(8.+5.*aSeed.w);put(p,.34+.1*aSeed.w);}`,CHILI_P);
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.8,0.))*(2.+2.*aSeed.z);vec3 p=HP+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.1+.04*aSeed.w);}`,
   BALL_P(`styRampOf(vec3(1.,.86,.5),.4+.5*l)`,`float m=step(length(q*vec2(1.,1.5)),.42);`));
  // estallido de fuego y humo
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.32+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.6,0.))*(1.4+1.4*aSeed.z);vec3 p=HP+v*t*(1.-1.2*t)+vec3(0.,.8*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.55+.25*aSeed.w)*(1.-.4*age));}`,S.ENERGY_FS(C.flame,{gain:1.3}),{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.06+aSeed.x*.12;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HP+rnd()*vec3(.35,.25,.35)+vec3(.15*t,.25+.8*t,0.);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);
   vR=aSeed.w*6.28+t;put(p,(.45+.2*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:SOOT,bias:.05}));
  a.pose=function(te,o){
    const ia=te-TI, itch=ss(0,TF,te);
    caster.rotation.z=0.06*Math.sin(te*40)*itch*(1-ss(TF,TF+0.05,te))+0.14*ss(TF,TF+0.08,te)*(1-ss(TI,TI+0.3,te));
    glowOf(caster,COL.setRGB(1,0.3,0.1),0.35*itch*(1-ss(TF+0.1,TI,te)));
    spark.pose(ia,HP,0.9); ring.pose(ia,TX,0,0.42,0.9);
    const hit=hitE(ia,6);
    target.position.x=TX+0.2*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.2*hit*Math.cos(ia*14);
    const bn=burn.pose(te); S.statusGlow(o,[{kind:'burn',env:bn}]); o.em=Math.max(o.em,0.45*hit);
    if(te<TF){tailW(o.g);o.gs=0.5*itch;o.ga=0.15*itch;o.li=2*itch;}
    else if(ia<0){const u=cl((te-TF)/(TI-TF));bez3(o.g,Q0,Q1,Q2,HP,u);o.gs=0.9;o.ga=0.25;o.li=3;}
    else{o.g.copy(HP);o.gs=1.2+1.5*ia;o.ga=Math.exp(-ia*8)*0.4+0.05*bn;o.li=5*Math.exp(-ia*4)+1*bn;}
    o.ia=ia;o.c.copy(HP);o.shake=0.5;o.dist=0.8;o.flash=0.6;
  };
}});

// =====================================================================
// 5 · MYSTERY SEED — sobre sí: una semilla mágica sale de la cola, salta por encima del lanzador y se entierra a sus
//     pies; brota un tallo y se abre una flor de cerezo que suelta dos orbes dorados que entran en el lanzador (+2 PA).
//     ti 0,7 s (la siembra)
// =====================================================================
const SEEDM_BODY=`float sw=smoothstep(.55,.9,sin(vP.y*30.+atan(vP.z,vP.x)*2.));base=mix(vec3(.45,.27,.16),vec3(.62,.4,.24),.5);lb=-.1*sw;`;
const PETAL_BODY=`vec2 p=vUv-vec2(.5,0.);float w=.42*sin(3.1416*pow(clamp(vUv.y,0.,1.),.8))*(1.-.35*smoothstep(.82,1.,vUv.y)*smoothstep(.1,0.,abs(p.x)));
 if(abs(p.x)>w)discard;base=mix(uC2,uC1,.35+.6*vUv.y);lb=.05;`;
defs.push({key:"sty_ptSeed",name:"Mystery Seed (estilizado)",dur:2.4,ti:0.7,pal:P_SEED,tier:2,stylized:true,
  phases:[["Semilla",0],["Vuelo",0.3],["Siembra",0.7],["Brote",1],["Floración",1.3],["Energía",1.65],["Fin",1.9]],
build(a){
  const L=a.L,TV=0.3,TI=0.7,TB=1.0,TF=1.3,TO=1.65,TE=2.4,SP=V3(-2.85,0,0.45);
  const seed=new THREE.Mesh(new THREE.SphereGeometry(0.16,20,14),S.mat(SOLID(SEEDM_BODY,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  seed.scale.set(0.8,1.15,0.8); L.mesh.add(seed);
  const plant=new THREE.Group(); plant.position.copy(SP); L.mesh.add(plant);
  const stemCurve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.05,0.3,0),V3(-0.04,0.6,0.02),V3(0.02,0.85,0)]);
  const stem=new THREE.Mesh(taperTube(stemCurve,24,6,0.04,0.025),S.mat(TUBE_FS(LEAFL),{uGrow:{value:0},uQ:{value:-1}},{mode:'solid'})); plant.add(stem);
  const leafMat=S.mat(SOLID(LEAF_BODY(LEAFD,LEAFL)),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const leaves=[1,-1].map(sd=>{const g=new THREE.Group();g.position.set(0.02,0.32+(sd>0?0:0.12),0);g.rotation.z=-sd*1.0;plant.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.36).translate(0,0.18,0),leafMat);g.add(m);return g;});
  const flower=new THREE.Group(); flower.position.set(0.02,0.85,0); plant.add(flower);
  const petalMat=S.mat(SOLID(PETAL_BODY,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const petals=[]; for(let i=0;i<5;i++){const g=new THREE.Group();g.rotation.y=i*Math.PI*2/5;flower.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.38).translate(0,0.19,0),petalMat);g.add(m);petals.push(m);}
  const heart=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8),S.mat(SOLID(`base=${GOLD};lb=.1;`,{hot:'vec3(1.,.7,.25)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'})); flower.add(heart);
  const glyph=groundPlane(1.9,SP.x,0.025,S.mat(GLYPH(`float pet=abs(cos(an*2.5));m=max(m*.6,smoothstep(.05,0.,abs(r-.62*pet))*step(r,.75)*.7);`),{},{mode:'energy'}));
  glyph.position.z=SP.z; L.decal.add(glyph);
  const ring=S.groundRing(L.decal,1.8), puff=S.hitSpark(L.mesh,1.0,{seed:0.8});
  const K=`const float TI=${f(TI)};const float TO=${f(TO)};const vec3 SP=${v3(SP)};`;
  // tierra al enterrarse
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.6+aSeed.w),2.2+1.2*aSeed.y,sin(an)*(.6+aSeed.w));vec3 p=SP+vec3(cos(an),0.,sin(an))*.15+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.14+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // brillo rosa de la semilla al salir y al volar
  S.pts(L.part,14,VV+K+`void main(){float s=aSeed.x*TI;float life=.3+aSeed.y*.15;float age=(uT-s)/life;
   vec3 c0=vec3(-4.2,1.,0.);vec3 p=c0+vec3(1.35*s/TI,1.6*sin(3.14159*s/TI),.45*s/TI)+rnd()*.15+vec3(0.,-.3*age,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vR=aSeed.w*6.28;put(p,.12+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // dos orbes dorados (+2 PA) que rodean al lanzador y entran en su pecho
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TO+i*.08;float u=clamp((uT-s)/.4,0.,1.);
   vec3 a0=SP+vec3(0.,1.55,0.),a1=vec3(-3.7,1.2,0.);float an=u*5.+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.5,.5*sin(u*3.14159),sin(an)*.5)*sin(u*3.14159);
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*5.;put(p,.42);}`,S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  S.pts(L.part,18,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TO+i*.08+aSeed.y*.35;float u=clamp((s-TO-i*.08)/.4,0.,1.);
   float life=.25;float age=(uT-s)/life;vec3 a0=SP+vec3(0.,1.55,0.),a1=vec3(-3.7,1.2,0.);float an=u*5.+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.5,.5*sin(u*3.14159),sin(an)*.5)*sin(u*3.14159)+rnd()*.06;
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vR=0.;put(p,.12);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // pétalos que caen al abrirse los orbes
  S.pts(L.part,10,VV+K+`void main(){float s=TO+aSeed.x*.45;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=SP+vec3(0.,1.55,0.)+vec3((aSeed.z-.5)*1.2*t+sin(t*4.+aSeed.w*6.)*.15,-.9*t+.25*t*(1.-t),(aSeed.w-.5)*1.*t);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*4.;put(p,.2+.06*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'uC1',bias:.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,TV,te)-0.18*ss(TV,TV+0.08,te)+0.08*ss(TV+0.2,TI,te);
    // semilla: brota en la cola, salta en arco y se entierra
    if(te<TV){tailW(seed.position);seed.position.y+=0.15*ss(0,TV,te);seed.scale.set(1.3*e3(te/TV),1.85*e3(te/TV),1.3*e3(te/TV));seed.rotation.z=te*6;}
    else{const u=cl((te-TV)/(TI-TV));tailW(tmp);seed.position.lerpVectors(tmp,SP,u);seed.position.y+=Math.sin(u*Math.PI)*1.6*(1-u*0.2)-0.12*u;seed.scale.set(1.3,1.85,1.3);seed.rotation.z=te*10;}
    seed.visible=ia<0&&te>0.02; seed.material.uniforms.uK.value=0.35+0.25*Math.sin(te*30);
    puff.pose(ia,tmp.set(SP.x,0.25,SP.z),0.5); ring.pose(ia,SP.x,SP.z,0.45,0.8);
    // planta: tallo, hojas, flor
    const g=ss(TB,TF,te), sink=ss(2.0,TE,te);
    plant.visible=te>TB-0.02; plant.scale.setScalar(Math.max(1.8*(1-0.6*sink),0.001));
    stem.material.uniforms.uGrow.value=g*1.02; stem.material.uniforms.uQ.value=-0.1+1.15*sink;
    leaves.forEach((l,i)=>{const k=back(ss(TB+0.1+i*0.08,TF,te));l.scale.setScalar(Math.max(k,0.001));});
    leafMat.uniforms.uQ.value=-0.1+1.15*sink;
    const op=back(ss(TF,TO,te)); flower.scale.setScalar(Math.max(ss(TF-0.1,TF+0.05,te),0.001));
    petals.forEach(p=>{p.parent.rotation.x=0;p.rotation.x=-(0.15+1.15*op)+0.1*Math.sin(te*3);});
    petalMat.uniforms.uQ.value=-0.1+1.15*ss(TO+0.35,TE-0.1,te); petalMat.uniforms.uK.value=0.25*ss(TF,TO,te)*(1-ss(TO,TO+0.2,te));
    heart.material.uniforms.uK.value=0.6*ss(TF,TO,te)*(1-ss(TO,TO+0.1,te)); heart.material.uniforms.uQ.value=petalMat.uniforms.uQ.value;
    set(glyph,-0.1+1.15*ss(1.9,TE,te),ss(TI,TI+0.15,te));
    const pa=ss(TO+0.3,TO+0.42,te)*(1-ss(TO+0.5,TO+0.8,te)); glowOf(caster,COL.setRGB(1,0.75,0.3),0.5*pa);
    if(ia<0){o.g.copy(seed.position);o.gs=0.5;o.ga=0.06;o.li=1.2;}
    else if(te<TO){o.g.set(SP.x,0.6,SP.z);o.gs=0.7+0.5*g;o.ga=0.06*g;o.li=1+1.5*g;}
    else{o.g.set(-3.7,1.2,0);o.gs=1;o.ga=0.1*pa;o.li=2.5*pa+0.3;}
    o.ia=ia;o.c.set(SP.x,0.4,SP.z);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 6 · POTATO LEAF — una raíz se hunde en la cola y avanza bajo el suelo hasta el rival (lomo de tierra que se abre);
//     alrededor de él brotan seis hojas de patata que se cierran de golpe como una trampa: daño, hojas rotas, tierra
//     y tres patatas que saltan. ti 1,0 s
// =====================================================================
defs.push({key:"sty_ptPotato",name:"Potato Leaf (estilizado)",dur:2.3,ti:1.0,pal:P_POTATO,tier:2,stylized:true,
  phases:[["Raíces",0],["Avance",0.2],["Brote",0.6],["Cierre",1],["Disipación",1.95]],
build(a){
  const L=a.L,TR=0.2,TB=0.62,TI=1.0,TE=2.3,X0=-3.3,X1=TX-0.55;
  const trail=groundStrip(X1-X0,0.8,(X0+X1)/2,0.024,S.mat(`uniform float uQ;void main(){float u=vUv.x;float y=vUv.y-.5;
   float n=styNoise(vec2(u*5.,vUv.y*.5)+.2).r;float w=.12+.1*n;float m=smoothstep(w,w*.4,abs(y+(n-.5)*.15))*step(u,uP);if(m<.02)discard;
   float er=styErode(n*.7+.3*(1.-u),uQ,.12);float lip=smoothstep(w*.4,w,abs(y));
   gl_FragColor=vec4(mix(styRampOf(${EARTH},.06+.12*n),styRampOf(${EARTH},.55+.25*n),lip),m*er*uA*.9);}`,{uQ:{value:0}},{mode:'matter'})); L.decal.add(trail);
  const pit=groundPlane(2.4,TX,0.026,S.mat(STAIN(EARTH,.7),{},{mode:'matter'})); L.decal.add(pit);
  const leafMat=S.mat(SOLID(LEAF_BODY("vec3(.09,.28,.06)","vec3(.32,.56,.1)",0.06),{hot:'vec3(.8,1.,.4)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const leaves=[];
  for(let i=0;i<6;i++){const g=new THREE.Group();const an=i*Math.PI/3+0.3;g.position.set(TX+Math.cos(an)*0.95,0,Math.sin(an)*0.75);
    g.rotation.y=-an+Math.PI/2; L.mesh.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.7,1.55,1,6).translate(0,0.77,0),leafMat); g.add(m);
    // curva: dobla un poco la hoja hacia dentro (vértices) para que no sea un plano rígido
    const pa=m.geometry.attributes.position;for(let k=0;k<pa.count;k++){const y=pa.getY(k);pa.setZ(k,-0.18*Math.pow(Math.max(y,0)/1.55,2));}
    pa.needsUpdate=true;m.geometry.computeVertexNormals();
    leaves.push({g,an,d:0.03*i});}
  const potMat=S.mat(SOLID(`float sp=smoothstep(.7,.8,styNoise(vUv*vec2(3.,2.)+.5).g);base=mix(vec3(.72,.52,.3),vec3(.5,.34,.2),sp);`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const pots=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.15,14,10),potMat);m.scale.set(1.25,0.9,1);L.mesh.add(m);
    const an=i*2.1+0.6;return {m,v:V3(Math.cos(an)*1.3-0.6,4.0+0.6*i,Math.sin(an)*1.1)};});
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.55}), ring=S.groundRing(L.decal,3.0);
  const K=`const float TR=${f(TR)};const float TB=${f(TB)};const float TI=${f(TI)};const float X0=${f(X0)};const float X1=${f(X1)};const float TX=${f(TX)};
  float rx(float t){float k=clamp((t-TR)/(TB-TR),0.,1.);return X0+(X1-X0)*k*k*(3.-2.*k);}`;
  // tierra en la cola al hundirse la raíz y lomo de tierra que avanza
  S.pts(L.part,26,VV+K+`void main(){float s=aSeed.x*TB;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=s<TR?X0:rx(s);vec3 p=vec3(x+(aSeed.z-.5)*.3,.08+t*(.5+.4*aSeed.w),(aSeed.w-.5)*.5)+vec3(0.,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;put(p,(.3+.15*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  S.pts(L.part,14,VV+K+`void main(){float s=TR+aSeed.x*(TB-TR);float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=vec3((aSeed.z-.5)*1.2,1.8+1.2*aSeed.w,(aSeed.y-.5)*1.2);vec3 p=vec3(rx(s),.05,0.)+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.12+.06*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // hojas rotas y tierra en el cierre
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.,0.))*(1.6+1.8*aSeed.z);vec3 p=vec3(TX,1.,0.)+v*t*(1.-.4*t)+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+sin(t*6.+aSeed.w*6.)*1.4;put(p,.26+.1*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.34,.6,.12)'}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(TX,.15,0.)+vec3(cos(an),0.,sin(an)*.8)*(.4+.8*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.18*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.06*ss(0,TR,te)-0.12*ss(TR,TR+0.1,te)+0.06*ss(TR+0.2,TB,te);
    set(trail,ss(TR,TB,te),1); trail.material.uniforms.uQ.value=-0.1+1.15*ss(1.2,TE-0.2,te);
    pit.visible=te>TB-0.05; pit.scale.setScalar(0.6+0.4*e3((te-TB)/0.3)); set(pit,-0.1+1.15*ss(1.5,TE,te),ss(TB-0.05,TB+0.1,te));
    leaves.forEach(l=>{const up=back(ss(TB+l.d,TB+0.28+l.d,te)), shut=ss(TI-0.07,TI,te), wilt=ss(1.5,TE,te);
      l.g.visible=te>TB+l.d; l.g.scale.setScalar(Math.max(up*(1-0.25*wilt),0.001));
      l.g.rotation.x=(0.35+0.08*Math.sin(te*9+l.an))*(1-shut)-1.0*shut*(1-0.4*wilt);});
    leafMat.uniforms.uQ.value=-0.1+1.15*ss(1.55,TE-0.1,te); leafMat.uniforms.uK.value=0.25*hitE(ia,10);
    pots.forEach(p=>{const t=te-TI;p.m.visible=t>0&&t<0.8;p.m.position.set(TX+p.v.x*t,0.1+p.v.y*t-9*t*t,p.v.z*t);p.m.rotation.set(t*8,t*5,0);
      if(p.m.position.y<0.12)p.m.position.y=0.12;});
    potMat.uniforms.uQ.value=-0.1+1.15*ss(TI+0.55,TI+0.8,te);
    spark.pose(ia,tmp.set(TX,1.05,0),1.0); ring.pose(ia,TX,0,0.45,1);
    const hit=hitE(ia,6);
    target.position.x=TX; target.scale.set(1-0.1*hit,1+0.04*hit,1-0.1*hit); target.rotation.z=-0.14*hit*Math.cos(ia*16);
    o.em=0.3*hit; o.emc.copy(U.uC1.value);
    if(te<TB){o.g.set(te<TR?X0:X0+(X1-X0)*ss(TR,TB,te),0.2,0);o.gs=0.5;o.ga=0.05;o.li=0.8;}
    else if(ia<0){o.g.set(TX,0.6,0);o.gs=0.8;o.ga=0.08;o.li=1.2;}
    else{o.g.set(TX,1,0);o.gs=1.3+ia;o.ga=Math.exp(-ia*9)*0.3;o.li=4*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(TX,1,0);o.shake=0.8;o.dist=0.8;o.flash=0.5;
  };
}});

// =====================================================================
// 7 · SHIELD SHROOM — sobre sí: esporas doradas caen de la cola, detrás del lanzador brota un hongo que abre su
//     sombrero por encima de él como una sombrilla; en ti cae un velo dorado (escudo) y una lluvia de esporas lo cura.
//     ti 0,8 s
// =====================================================================
const CAP_BODY=`vec3 q=normalize(vP);float sp=smoothstep(.72,.78,styNoise(vec2(atan(q.z,q.x)*.55,q.y*1.3)+.3).g);
 float under=smoothstep(.12,.0,vP.y/.6);float gill=smoothstep(.5,.9,sin(atan(q.z,q.x)*40.));
 base=mix(mix(uC2,uC1,.25+.5*q.y),${CREAM},sp*(1.-under));base=mix(base,mix(vec3(.62,.45,.3),vec3(.48,.33,.22),gill),under);lb=-.1*under;`;
const VEIL_FS=`uniform float uD;void main(){float y=vUv.y;float an=vUv.x;
 float st=smoothstep(.5,.9,sin(an*120.+styNoise(vec2(an*6.,y*.6)).r*4.))*.5+.25;
 float nz=styNoise(vec2(an*4.,y*.8-uT*.25)).r;float er=styErode(nz*.7+(1.-y)*.3,uD,.12);
 float m=st*smoothstep(0.,.25,y)*smoothstep(1.,.85,y)*step(1.-uP,y)*er;if(m<.02)discard;
 gl_FragColor=vec4(styRamp(.6+.35*st),m*uA*.7);}`;
defs.push({key:"sty_ptShroom",name:"Shield Shroom (estilizado)",dur:2.4,ti:0.8,pal:P_SHROOM,tier:2,stylized:true,
  phases:[["Esporas",0],["Crecimiento",0.25],["Apertura",0.605],["Blindaje",0.8],["Lluvia de esporas",1.133],["Cierre",1.95]],
build(a){
  const L=a.L,TG=0.25,TO=0.605,TI=0.8,TL=1.133,TC=1.95,TE=2.4,MX=CX-0.75,MZ=-0.55,CAPY=2.45,CR=1.15;
  const shroom=new THREE.Group(); shroom.position.set(MX,0,MZ); L.mesh.add(shroom);
  const stemCurve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.08,0.8,0.05),V3(0.32,1.7,0.22),V3(0.75,CAPY,0.55)]);
  const stem=new THREE.Mesh(taperTube(stemCurve,40,10,0.17,0.11),S.mat(TUBE_FS(CREAM),{uGrow:{value:0},uQ:{value:-1}},{mode:'solid'})); shroom.add(stem);
  const cap=new THREE.Group(); cap.position.set(0.75,CAPY,0.55); shroom.add(cap);
  const capMesh=new THREE.Mesh(new THREE.SphereGeometry(CR,40,18,0,Math.PI*2,0,Math.PI*0.5),S.mat(SOLID(CAP_BODY,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  capMesh.scale.set(1,0.52,1); cap.add(capMesh);
  const veil=new THREE.Mesh(new THREE.CylinderGeometry(CR*0.92,CR*1.0,CAPY,48,1,true).translate(0,CAPY/2,0),S.mat(VEIL_FS,{uD:{value:0}},{mode:'energy',side:THREE.DoubleSide}));
  veil.position.set(CX,0,0); L.mesh.add(veil);
  const glyph=groundPlane(2.6,CX,0.025,S.mat(GLYPH(`float dots=smoothstep(.07,.0,length(vec2(mod(an*3.82+.5,1.)-.5,(r-.8)*4.)))*step(abs(r-.8),.2);m=max(m*.5,dots*.9);`),{},{mode:'energy'})); L.decal.add(glyph);
  const ring=S.groundRing(L.decal,3.0);
  const dirt=S.contactShadow(L.decal,1.4);
  const K=`const float TI=${f(TI)};const float TL=${f(TL)};const float TC=${f(TC)};const float CX=${f(CX)};const float CAPY=${f(CAPY)};`;
  // esporas doradas que caen de la cola antes de brotar
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x*.3;float life=.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-4.15,.8,0.)+rnd()*vec3(.25,.1,.25)+vec3(-.2*t,-1.8*t,(aSeed.z-.5)*.6*t);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=0.;vR=0.;put(p,.11+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // tierra al brotar el hongo
  S.pts(L.part,10,VV+K+`void main(){float s=.22+aSeed.x*.08;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(MX)},.1,${f(MZ)})+vec3(cos(an),0.,sin(an))*(.25+.5*(1.-exp(-t*5.)))+vec3(0.,t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.14*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // lluvia de esporas bajo el sombrero (energía dorada) y motas de cura que suben del lanzador
  S.pts(L.part,36,VV+K+`void main(){float per=.7;float k=(uT-TL)/per+aSeed.x;float tt=fract(k)*per;vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rad=sqrt(r.y)*.95;vec3 p=vec3(CX+cos(an)*rad,CAPY-.35-tt*2.9,sin(an)*rad);
   vA=(uT>TL&&uT<TC+.1&&p.y>.05)?1.:0.;vK=0.;vR=0.;put(p,.1+.05*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float per=.8;float k=(uT-TL)/per+aSeed.x;float tt=fract(k)*per;vec3 r=rr(floor(k));
   float an=r.x*6.2832+tt*3.;vec3 p=vec3(CX+cos(an)*.6,.2+tt*2.,sin(an)*.6);
   vA=(uT>TL&&uT<TC&&k>0.)?sin(tt/per*3.14159):0.;vK=smoothstep(.7,1.,tt/per);vR=an+1.57;put(p,.2+.06*r.z);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.95,.72,.25)',bias:.05}));
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(TG,TO,te), open=back(ss(TO-0.05,TI,te)), close=ss(TC,TE-0.05,te);
    caster.rotation.z=0.06*ss(0,TG,te)-0.1*ss(TG,TG+0.1,te)+0.04*ss(TG+0.2,TO,te);
    shroom.visible=te>TG-0.02;
    stem.material.uniforms.uGrow.value=grow*1.02; stem.material.uniforms.uQ.value=-0.1+1.15*close;
    stemCurve.getPoint(Math.min(grow,1),cap.position);
    cap.scale.set(Math.max((0.25+0.75*open)*(1-0.3*close),0.001),Math.max((0.6+0.4*open)*(1-0.3*close),0.001),Math.max((0.25+0.75*open)*(1-0.3*close),0.001));
    cap.visible=grow>0.15; cap.rotation.z=0.06*Math.sin(te*3);
    capMesh.material.uniforms.uQ.value=-0.1+1.15*close; capMesh.material.uniforms.uK.value=0.22*hitE(ia,7);
    // velo dorado (escudo): cae desde el borde del sombrero en ti
    veil.position.set(CX,0,0); veil.visible=te>TI-0.05&&te<TE;
    set(veil,ss(TI-0.05,TI+0.15,te),1); veil.material.uniforms.uD.value=ss(1.6,TC+0.2,te)*1.1;
    set(glyph,-0.1+1.15*ss(TC,TE,te),ss(TI-0.1,TI+0.05,te));
    ring.pose(ia,CX,0,0.45,1);
    dirt.pose(MX,MZ,0.9,0.5*ss(TG,TG+0.1,te)*(1-close));
    const heal=ss(TL,TL+0.2,te)*(1-ss(TC-0.2,TC+0.1,te));
    glowOf(caster,U.uC1.value,0.25*heal+0.35*hitE(ia,7));
    if(ia<0){o.g.set(CX,CAPY*grow,MZ);o.gs=0.6+0.4*grow;o.ga=0.04;o.li=0.8+1.2*grow;}
    else{o.g.set(CX,1.3,0);o.gs=1.4;o.ga=0.12*Math.exp(-ia*7)+0.04*heal;o.li=3*Math.exp(-ia*4)+1*heal;}
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 8 · SPROUT — una gota de savia salta de la cola a los pies del aliado y revienta en brotes; dos hojas grandes crecen
//     y lo envuelven (escudo) y hojas y motas suben en espiral (cura). ti 0,36 s
// =====================================================================
defs.push({key:"sty_ptSprout",name:"Sprout (estilizado)",dur:2.2,ti:0.36,pal:P_SPROUT,tier:2,stylized:true,receiver:'target',
  phases:[["Savia",0],["Brote",0.36],["Hojas",0.654],["Escudo",0.963],["Fin",1.813]],
build(a){
  const L=a.L,TI=0.36,TH=0.654,TS=0.963,TF=1.813,TE=2.2;
  const drop=new THREE.Mesh(new THREE.SphereGeometry(0.24,16,12),S.mat(SOLID(`base=mix(uC2,${GOLD},.25);lb=.05;`,{hot:'uC1',rim:.35}),{uQ:{value:-1},uK:{value:0.15}},{mode:'solid'}));
  drop.scale.set(0.85,1.15,0.85); L.mesh.add(drop);
  const patch=groundPlane(2.4,TX,0.024,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*1.3+.4).r;float g=styNoise(vUv*3.+.1).g;
   float m=smoothstep(uP+.02,uP-.18,r+(n-.5)*.3);if(m<.02)discard;float blade=smoothstep(.55,.75,g);
   vec3 c=mix(styRampOf(vec3(.16,.36,.08),.15+.25*n),styRampOf(vec3(.5,.66,.16),.5),blade);
   gl_FragColor=vec4(c,m*uA*.85);}`,{},{mode:'matter'})); L.decal.add(patch);
  const leafMat=S.mat(SOLID(LEAF_BODY("vec3(.1,.33,.08)","vec3(.42,.66,.14)"),{hot:'vec3(.75,1.,.35)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const leaves=[0,1,2].map(i=>{const g=new THREE.Group();const an=i*2.094+0.5;g.position.set(TX+Math.cos(an)*0.72,0,Math.sin(an)*0.62);g.rotation.y=-an+Math.PI/2;L.mesh.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.95,1,8).translate(0,0.97,0),leafMat);g.add(m);
    const pa=m.geometry.attributes.position;for(let k=0;k<pa.count;k++){const y=pa.getY(k),x=pa.getX(k);pa.setZ(k,-0.5*Math.pow(Math.max(y,0)/1.95,1.6)-0.25*x*x);}
    pa.needsUpdate=true;m.geometry.computeVertexNormals();return {g,an,d:i*0.06};});
  const ring=S.groundRing(L.decal,2.8), splash=S.hitSpark(L.mesh,1.1,{seed:0.35});
  const P0=V3(-4.15,0.8,0), K=`const float TI=${f(TI)};const float TS=${f(TS)};const float TF=${f(TF)};const float TX=${f(TX)};`;
  // brotes que salen del suelo alrededor del aliado
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.25;float life=.9+aSeed.y*.4;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;float rad=.35+.75*aSeed.w;vec3 p=vec3(TX+cos(an)*rad,.12+.2*smoothstep(0.,.2,age),sin(an)*rad*.85);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.75,1.,age);vR=(aSeed.y-.5)*.6;put(p,(.24+.1*aSeed.y)*smoothstep(0.,.18,age));}`,
   S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.42,.68,.14)',bias:.05}));
  // salpicadura de savia
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.4+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+aSeed.w),2.+1.4*aSeed.y,sin(an)*(1.+aSeed.w));vec3 p=vec3(TX,.1,0.)+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,v.y-18.*t);put(p,.13+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1'}));
  // cura: hojas y motas en espiral
  S.pts(L.part,18,VV+K+`void main(){float s=TS-.2+aSeed.x*.6;float life=.6+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*4.;float rad=.8-.35*age;vec3 p=vec3(TX+cos(an)*rad,.15+age*(1.8+aSeed.w*.5),sin(an)*rad);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=an+1.57;put(p,.22+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.72,.86,.3)',bias:.08}));
  S.pts(L.part,16,VV+K+`void main(){float s=TS+aSeed.x*.5;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(TX+r.x*.55,.4+aSeed.w*1.2+t*1.,r.z*.55);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.13+.05*aSeed.y);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,0.12,te)-0.16*ss(0.12,0.2,te)+0.06*ss(0.25,0.5,te);
    const u=cl(te/TI); tailW(tmp); drop.position.lerpVectors(tmp,tmp2.set(TX-0.1,0.12,0),u); drop.position.y+=Math.sin(u*Math.PI)*2.0;
    drop.visible=ia<0; drop.rotation.z=-u*2;
    splash.pose(ia,tmp.set(TX,0.25,0),0.6); ring.pose(ia,TX,0,0.45,0.9);
    set(patch,0.15+1.0*e3(ia/0.4),ia>=0?1-ss(TF,TE,te):0);
    leaves.forEach(l=>{const g=back(ss(TH-0.25+l.d,TS+l.d*0.5,te)), wilt=ss(TF-0.2,TE,te);
      l.g.visible=te>TH-0.25+l.d; l.g.scale.setScalar(Math.max(g*(1-0.2*wilt),0.001)); l.g.rotation.x=-0.1+0.05*Math.sin(te*3+l.an);});
    leafMat.uniforms.uQ.value=-0.1+1.15*ss(TF-0.1,TE-0.05,te); leafMat.uniforms.uK.value=0.3*hitE(te-TS,6);
    const env=ss(TS-0.1,TS+0.1,te)*(1-ss(TF,TE,te));
    o.em=0.3*env+0.25*hitE(te-TS,6); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(drop.position);o.gs=0.5;o.ga=0.06;o.li=1.2;}
    else{o.g.set(TX,0.9,0);o.gs=1.2;o.ga=0.1*Math.exp(-ia*6)+0.04*env;o.li=2.5*Math.exp(-ia*4)+0.8*env;}
    o.ia=ia;o.c.set(TX,0.6,0);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

// =====================================================================
// 9 · TROPICAL GUARDIAN — una raíz corre desde la cola hasta el aliado; detrás de él emerge un tótem tallado con
//     penacho tropical; sus ojos de rubí se encienden y unas raíces le atan los pies (inamovible); en ti se cierra un
//     caparazón turquesa (escudo). Al final el tótem se hunde. ti 1,1 s
// =====================================================================
const TOTEM_BODY=`float h=vUv.y;float face=smoothstep(.12,.06,abs(fract(h*3.)-.5)-.3);float groove=smoothstep(.6,.9,sin(vUv.x*6.2832*10.))*.3;
 base=mix(vec3(.5,.28,.12),vec3(.68,.42,.2),.35+.3*styNoise(vUv*vec2(4.,8.)).b);base=mix(base,mix(uC2,vec3(.25,.15,.1),.45),face*.4);lb=-.12*groove-.1*face;`;
defs.push({key:"sty_ptTotem",name:"Tropical Guardian (estilizado)",dur:2.4,ti:1.1,pal:P_TOTEM,tier:2,stylized:true,receiver:'target',
  phases:[["Raíz",0],["Emerger",0.15],["Ojos de rubí",0.634],["Anclaje",0.874],["Retirada",1.95]],
build(a){
  const L=a.L,TR=0.15,TM=0.634,TA=0.874,TI=1.1,TS=1.95,TE=2.4,X0=-3.4,X1=TX-0.6,TOX=TX+0.35,TOZ=-0.95,H=2.0;
  const trail=groundStrip(X1-X0,0.7,(X0+X1)/2,0.024,S.mat(`uniform float uQ;void main(){float u=vUv.x;float y=vUv.y-.5;
   float n=styNoise(vec2(u*5.,vUv.y*.5)+.6).r;float w=.1+.08*n;float m=smoothstep(w,w*.4,abs(y+(n-.5)*.2))*step(u,uP);if(m<.02)discard;
   float er=styErode(n*.7+.3*(1.-u),uQ,.12);gl_FragColor=vec4(styRampOf(${EARTH},.08+.2*n),m*er*uA*.85);}`,{uQ:{value:0}},{mode:'matter'})); L.decal.add(trail);
  const totem=new THREE.Group(); totem.position.set(TOX,0,TOZ); L.mesh.add(totem);
  const woodMat=S.mat(SOLID(TOTEM_BODY,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.4,H,16,6),woodMat); body.position.y=H/2; totem.add(body);
  for(let i=0;i<3;i++){const lip=new THREE.Mesh(new THREE.CylinderGeometry(0.43,0.43,0.08,16),woodMat);lip.position.y=H*(i+1)/3-0.04;totem.add(lip);}
  const crestMat=S.mat(SOLID(LEAF_BODY("uC2*.7","uC1",0.08),{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  for(let i=0;i<5;i++){const g=new THREE.Group();g.position.y=H;g.rotation.z=(i-2)*0.38;g.rotation.y=0.2*(i%2);totem.add(g);
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.8).translate(0,0.4,0),crestMat));}
  const eyeMat=S.mat(`void main(){vec3 n=normalize(vN);float fr=abs(dot(n,normalize(vV)));gl_FragColor=vec4(mix(${RUBY}*.35,${RUBY}*(.6+1.2*uP),fr),1.);}`,{},{mode:'solid'});
  const eyes=[];for(let i=0;i<3;i++)for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8),eyeMat);
    const y=H*(i+0.55)/3,an=s*0.42;e.position.set(Math.sin(an)*0.36,y,Math.cos(an)*0.36);totem.add(e);eyes.push(e);}
  // raíces que atan los pies del aliado
  const rootMat=S.mat(TUBE_FS(WOOD),{uGrow:{value:0},uQ:{value:-1}},{mode:'solid'});
  const roots=[];for(let i=0;i<5;i++){const an=i*1.257+0.3,r0=V3(TOX-TX+Math.cos(an)*0.2,0.02,TOZ+Math.sin(an)*0.2);
    const end=V3(Math.cos(an+2.2)*0.32,0.32+0.1*(i%2),Math.sin(an+2.2)*0.28);
    const cv=new THREE.CatmullRomCurve3([r0,V3(r0.x*0.5+Math.cos(an)*0.5,0.04,r0.z*0.5+Math.sin(an)*0.4),V3(Math.cos(an+1.2)*0.55,0.15,Math.sin(an+1.2)*0.45),end]);
    const m=new THREE.Mesh(taperTube(cv,32,6,0.055,0.018),rootMat); m.position.x=TX; L.mesh.add(m); roots.push(m);}
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1.0,40,20,0,Math.PI*2,0,Math.PI*0.55),S.mat(SHELL_FS(
    `float hx=abs(fract(vUv.x*14.)-.5);float hy=abs(fract(h*5.+step(.5,fract(vUv.x*7.))*.5)-.5);bands=smoothstep(.06,0.,min(hx,hy))*.3;`),
    {uD:{value:0},uF:{value:0},uR:{value:1.0}},{mode:'energy',side:THREE.DoubleSide}));
  shell.position.set(TX,0,0); L.mesh.add(shell);
  const glyph=groundPlane(2.6,TX,0.025,S.mat(GLYPH(`float sq=smoothstep(.05,.0,abs(max(abs(p.x),abs(p.y))*2.-.62))*.7;m=max(m*.5,sq);`),{},{mode:'energy'})); L.decal.add(glyph);
  const ring=S.groundRing(L.decal,3.0), dirt=S.contactShadow(L.decal,1.3);
  const K=`const float TR=${f(TR)};const float TM=${f(TM)};const float X0=${f(X0)};const float X1=${f(X1)};const vec3 TO=vec3(${f(TOX)},0.,${f(TOZ)});`;
  // tierra que levanta la raíz y el tótem al salir
  S.pts(L.part,20,VV+K+`void main(){float s=aSeed.x*TM;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TR)/(TM-TR),0.,1.);vec3 b=s<TR?vec3(X0,0.,0.):vec3(X0+(X1-X0)*k,0.,0.);
   vec3 p=b+vec3((aSeed.z-.5)*.3,.08+t*(.45+.3*aSeed.w),(aSeed.w-.5)*.4);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.28+.12*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  S.pts(L.part,14,VV+K+`void main(){float s=TR+aSeed.x*(TM-TR);float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TO+vec3(cos(an),0.,sin(an)*.8)*(.4+.6*(1.-exp(-t*4.)))+vec3(0.,.1+t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.36+.16*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // hojitas tropicales que caen del penacho al encenderse los ojos
  S.pts(L.part,10,VV+K+`void main(){float s=TM+aSeed.x*.5;float life=.9+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=TO+vec3(0.,${f(H+0.4)},0.)+vec3((aSeed.z-.5)*1.4*t+sin(t*4.+aSeed.w*6.)*.15,-1.2*t,(aSeed.w-.5)*1.2*t);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*4.;put(p,.22+.06*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'uC1'}));
  a.pose=function(te,o){
    const ia=te-TI, up=back(ss(TR,TM,te)), sink=ss(TS,TE-0.05,te);
    caster.rotation.z=0.06*ss(0,TR,te)-0.12*ss(TR,TR+0.1,te)+0.06*ss(TR+0.2,TM,te);
    set(trail,ss(0.02,TM,te),1); trail.material.uniforms.uQ.value=-0.1+1.15*ss(1.0,1.8,te);
    totem.visible=te>TR; totem.position.y=-H*(1-up)-H*0.9*sink*sink; totem.rotation.y=0.3*(1-up);
    woodMat.uniforms.uQ.value=-0.1+1.15*ss(TS+0.1,TE,te); crestMat.uniforms.uQ.value=woodMat.uniforms.uQ.value;
    eyeMat.uniforms.uP.value=ss(TM,TM+0.08,te)*(0.75+0.25*Math.sin(te*14))*(1-sink)+0.6*hitE(ia,6);
    dirt.pose(TOX,TOZ,1,0.5*ss(TR,TM,te)*(1-sink));
    const rg=ss(TA,TI,te); rootMat.uniforms.uGrow.value=rg*1.02; rootMat.uniforms.uQ.value=-0.1+1.15*ss(TS,TE-0.1,te);
    roots.forEach(r=>{r.visible=te>TA;});
    const su=shell.material.uniforms; shell.visible=te>TI-0.08;
    su.uP.value=ss(TI-0.08,TI+0.12,te); su.uA.value=1; su.uD.value=ss(TS-0.1,TE-0.05,te)*1.1; su.uF.value=hitE(ia,8)*0.8;
    {const k=1+0.05*hitE(ia,10);shell.scale.set(k,1.7*k,k);}
    set(glyph,-0.1+1.15*ss(TS,TE,te),ss(TA,TI,te));
    ring.pose(ia,TX,0,0.45,1);
    const env=ss(TI-0.05,TI+0.1,te)*(1-ss(TS,TE,te));
    target.scale.set(1,1-0.04*hitE(te-TA-0.1,8),1);
    o.em=0.3*env+0.25*hitE(ia,6); o.emc.copy(U.uC2.value);
    if(te<TM){o.g.set(TOX,0.5+H*up*0.5,TOZ);o.gs=0.6;o.ga=0.04;o.li=0.8*up;}
    else if(ia<0){o.g.set(TOX,H*0.6,TOZ);o.gs=0.8;o.ga=0.1;o.li=1.6;}
    else{o.g.set(TX,1,0);o.gs=1.3;o.ga=0.14*Math.exp(-ia*6)+0.04*env;o.li=2.8*Math.exp(-ia*4)+0.8*env;}
    o.ia=ia;o.c.set(TX,1,0);o.shake=0.3;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 10 · YAM — sobre sí: un ñame silvestre crece en la cola, sale lanzado en parábola hacia los rivales y estalla en el
//      aire en gas púrpura que se extiende por su carril y envenena a todos (daño leve + Veneno). ti 0,42 s
// =====================================================================
const YAM_BODY=`float ring=smoothstep(.6,.9,sin(vP.y*40.+styNoise(vec2(atan(vP.z,vP.x)*.5,vP.y*2.)).r*3.));
 float sp=smoothstep(.75,.8,styNoise(vUv*vec2(4.,2.)+.2).g);base=mix(${YAMSK},vec3(.6,.38,.5),.3);base=mix(base,vec3(.3,.15,.25),sp);lb=-.12*ring;`;
defs.push({key:"sty_ptYam",name:"Yam (estilizado)",dur:1.4,ti:0.42,pal:P_YAM,tier:1,stylized:true,enemies:2,
  phases:[["Tubérculo",0],["Lanzamiento",0.12],["Estallido",0.42],["Nube",0.48],["Veneno",0.6],["Fin",1.1]],
build(a){
  const L=a.L,TL=0.12,TI=0.42,BP=V3(-1.3,1.7,0.15);
  const yam=new THREE.Mesh(new THREE.SphereGeometry(0.2,18,12),S.mat(SOLID(YAM_BODY,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(yam);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.12});
  const stain=groundPlane(5.5,BP.x+0.6,0.025,S.mat(STAIN('uC2',.4),{},{mode:'matter'})); stain.position.z=0.1; L.decal.add(stain);
  const who=[target,enemies[0],enemies[1]];
  const poison=S.status(a,'poison',who,0.6,1.4);
  const EP0=ENEMY_POS[0],EP1=ENEMY_POS[1];
  const K=`const float TI=${f(TI)};const vec3 BP=${v3(BP)};const vec3 E0=${v3(EP0)};const vec3 E1=${v3(EP1)};const float TX=${f(TX)};
  vec3 dst(float i){return i<.5?vec3(TX,0.,0.):(i<1.5?E0:E1);}`;
  // gas: bocanadas que salen del estallido y ruedan hasta cada rival
  S.pts(L.part,70,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+aSeed.y*.12;float t=max(uT-s,0.);float life=.75+aSeed.z*.25;float age=t/life;
   float k=1.-exp(-t*4.5);vec3 d=dst(i);float an=aSeed.w*6.2832;float rr=fract(aSeed.y*7.3)*.65;
   vec3 ringP=vec3(BP.x,0.,BP.z)+vec3(cos(an)*(1.+3.6*k),.4+fract(aSeed.z*5.1)*.5,sin(an)*(.8+2.8*k));
   vec3 p=aSeed.y<.45?mix(BP,ringP,k):mix(BP,d+vec3(cos(an)*rr,.45+fract(aSeed.z*5.1)*.6,sin(an)*rr),k);p+=vec3(0.,.15*t,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t*.6;put(p,(.55+.3*fract(aSeed.w*3.7))*(.35+.75*smoothstep(0.,.18,t)));}`,
   S.MATTER_FS(C.puff,{relief:4.5,bias:-.05,erodeSoft:.12}));
  // trozos de ñame y motas tóxicas
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(1.8+1.6*aSeed.z);vec3 p=BP+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:YAMSK}));
  S.pts(L.part,18,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+.1+aSeed.y*.4;float life=.5+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dst(i)+vec3((aSeed.w-.5)*1.3,.3+t*.9+aSeed.z*.4,(fract(aSeed.w*9.1)-.5)*1.1);
   vA=(age>0.&&age<1.)?(.5+.5*sin(uT*16.+aSeed.x*40.))*(1.-age):0.;vK=0.;vR=0.;put(p,.08+.04*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0,TL,te);
    caster.rotation.z=0.08*ss(0,TL,te)-0.18*ss(TL,TL+0.06,te)+0.1*ss(TL+0.1,TI,te);
    if(te<TL){tailW(yam.position);yam.position.y+=0.15*grow;yam.rotation.z=0.6;}
    else{const u=cl((te-TL)/(TI-TL));tailW(tmp);yam.position.lerpVectors(tmp,BP,u);yam.position.y+=Math.sin(u*Math.PI)*1.5;yam.rotation.z=0.6-u*7;}
    yam.visible=ia<0&&grow>0.001; yam.scale.set(1.2*Math.max(grow,0.001),2.4*Math.max(grow,0.001),1.2*Math.max(grow,0.001));
    yam.material.uniforms.uK.value=0.2*ss(TL,TI,te);
    spark.pose(ia,BP,0.6);
    stain.visible=ia>=0; stain.scale.setScalar(0.5+0.5*e3((te-TI-0.1)/0.4)); set(stain,-0.1+1.15*ss(1.0,1.4,te),ss(TI+0.1,TI+0.3,te));
    const hit=hitE(ia-0.12,8);
    target.position.x=TX+0.06*hit; target.rotation.z=-0.1*hit*Math.cos(ia*16);
    const pz=poison.pose(te); S.statusGlow(o,[{kind:'poison',env:pz}]);
    if(ia<0){o.g.copy(yam.position);o.gs=0.5*grow;o.ga=0.04;o.li=0.8*grow;}
    else{o.g.copy(BP);o.gs=1.2+2*ia;o.ga=Math.exp(-ia*10)*0.3;o.li=3.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(TX,0.8,0);o.shake=0.3;o.dist=0.6;o.flash=0.3;
  };
}});

VFX.module("Estilizado · Planta · Cola",defs);
})();

// =====================================================================
// ESTILIZADO · REPTIL · COLA (Hito 101) — las 6 cartas de cola de Reptil hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_rtGila, sty_rtTinyDino…). Mismos dur / ti / fases que las originales, así el daño
// llega igual. Todo nace de la cola del lanzador (≈ (-4.15,0.7,0)): criaturas, objetos o energía escamada.
// Semántica según PartCards.js:
//   Gila (3 PA, sobre sí: daño a todos los enemigos, más con veneno) · Grass Snake (daño + −2 alcance)
//   Iguana (daño + Débil; Big Yak) · Snake Jar (aliado: anula el próximo golpe) · Tiny Dino (daño; Shinji)
//   Wall Gecko (daño, el lanzador pierde 30 HP y recibe −30 % de daño): la cola se desprende (autotomía) y golpea.
// Identidad de clase: escamas violeta/púrpura con el acento propio de cada carta (cuentas naranjas del Gila, jade de la
// iguana, ámbar del dino, menta del geco). Cartas sobre aliado: receptor = muñeco objetivo (receiver:'target').
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,enemies,ENEMY_POS}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_GILA=pal("Sty Reptil · Gila",["#ff9a52","#6a2386"]);
const P_SNAKE=pal("Sty Reptil · Hierba",["#9be86a","#6b2aa0"]);
const P_IGUANA=pal("Sty Reptil · Iguana",["#ffb347","#1d7a55"]);
const P_JAR=pal("Sty Reptil · Jarro",["#e7a0ff","#47197e"]);
const P_DINO=pal("Sty Reptil · Dino",["#ffcc66","#8a3a8c"]);
const P_GECKO=pal("Sty Reptil · Geco",["#8ff0c4","#1f7f6c"]);

const TL0=V3(-0.45,0.7,0);                  // cola, en coordenadas del lanzador
const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7;    // objetivo (base x, pecho visible) y lanzador
const ZONES={zoneCaster:0.6,zoneTarget:1.15}; // a 1 casilla el efecto conserva su tamaño
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0), YA=V3(0,1,0), qb=new THREE.Quaternion();
const aim=(o,d,spin)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());if(spin)o.quaternion.multiply(qb.setFromAxisAngle(XA,spin));};
function tailW(out){const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),x=TL0.x*caster.scale.x,y=TL0.y*caster.scale.y;
  return out.set(caster.position.x+x*c-y*s,caster.position.y+x*s+y*c,caster.position.z);}
const bez3=(out,a,b,c,d,t)=>{const s=1-t;return out.set(s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y,s*s*s*a.z+3*s*s*t*b.z+3*s*t*t*c.z+t*t*t*d.z);};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const groundStrip=(len,w,x,y,mat,seg=48)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,w,seg,1).rotateX(-Math.PI/2),mat);m.position.set(x,y,0);return m;};

// ---------- colores de materia (semánticos, fijos) ----------
const EARTH="vec3(.55,.42,.29)", SOOT="vec3(.2,.15,.16)", GOLD="vec3(1.,.76,.3)", BONE="vec3(.95,.86,.66)",
  VIOLET="vec3(.42,.2,.62)", VIOLD="vec3(.2,.08,.32)", MINT="vec3(.45,.9,.7)", BLOOD="vec3(.8,.08,.1)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.2,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;float glow=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*(uK+glow);gl_FragColor=vec4(c,1.);}`;
// escamas: borde de escama imbricada en coordenadas q (devuelve 0 en el centro, 1 en el borde)
const SCALE=`float scaleEdge(vec2 q){float r=floor(q.y);q.x+=.5*mod(r,2.);vec2 c=vec2(fract(q.x)-.5,fract(q.y));return length(c*vec2(1.,1.3));}`;
// cúpula o caparazón de energía: borde de fresnel, revela de abajo arriba (uP) y se erosiona (uD)
const SHELL_FS=(extra='')=>SCALE+`uniform float uD;uniform float uF;uniform float uR;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 if(h>uP*1.15-.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);
 float bands=0.;${extra}
 float m=(pow(fr,1.8)*.95+.15+bands)*er*(1.-smoothstep(uP*1.15-.25,uP*1.15-.1,h)*.6);
 gl_FragColor=vec4(styRamp(.28+.42*fr+bands*.35)*(.95+.5*uF),min(m,1.)*uA);}`;
// sello de pincel en el suelo con un dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.8);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// grietas en el suelo (materia oscura con brillo de energía uK); uP = cuánto se abren
const CRACK_FS=`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*1.1+.37);vec4 s2=styNoise(vUv*2.3+.71);
 float cr=max(smoothstep(.05,.0,abs(s.b-.5)),smoothstep(.035,0.,abs(s2.b-.5))*.8)*smoothstep(1.,.35,r)*step(r+s.r*.2,uP*1.15);
 if(cr<.05)discard;vec3 c=mix(styRampOf(${SOOT},.15),styRamp(.85)*1.2,uK*smoothstep(.6,1.,cr));
 gl_FragColor=vec4(c,cr*uA*.9);}`;
const defs=[];

// =====================================================================
// 1 · GILA (3 PA) — un saco de veneno con cuentas naranjas y negras (piel del monstruo de Gila) se hincha en la cola,
//     latiguea el suelo detrás del lanzador y suelta una onda de veneno violeta que corre por el suelo hasta cada
//     rival: en cada uno estalla un géiser tóxico con su cruz; el principal agrieta las baldosas. Veneno en todos.
//     ti 1,667 s (llegada de la onda al objetivo)
// =====================================================================
const GILA_BODY=`vec3 q=normalize(vP);vec4 cz=styNoise(vec2(atan(q.z,q.x)*.55,q.y*.85)+.2);
 float bead=smoothstep(.42,.62,cz.g);base=mix(vec3(.13,.06,.12),vec3(1.,.52,.34),bead);lb=-.08+.1*bead;glow=(1.-bead)*.6*uK;`;
defs.push(Object.assign({key:"sty_rtGila",name:"Gila (estilizado)",dur:3.2,ti:1.667,pal:P_GILA,tier:3,stylized:true,enemies:2,
  phases:[["Hinchazón",0],["Azote",0.72],["Onda",0.98],["Erupción",1.48],["Veneno",2.15],["Disipación",2.7]],
build(a){
  // Hito 104: los géiseres, cruces y ramales caen sobre los rivales REALES del tablero (VFX.foes, en el laboratorio),
  // hasta NF; el más cercano recibe el impacto en ti y los demás un poco después según su distancia. Sin rivales, la
  // onda se abre en anillo desde el azote.
  const L=a.L,TW=0.72,TS=0.98,TI=1.667,SP=V3(-4.85,0,0),END=3.2,NF=5,SL=12;
  const EP=[...Array(NF)].map((_,i)=>V3(TX,0,0)), TE=new Array(NF).fill(TI);
  const uEP={value:EP}, uET={value:TE.slice()}, uNF={value:1};
  const whip=new THREE.CatmullRomCurve3([V3(-4.15,0.7,0),V3(-4.5,1.6,0.1),V3(-5.05,1.9,0.12),V3(-5.3,1.05,0.06),V3(SP.x,0.1,0)]);
  // saco de veneno: cuentas de la piel del Gila con brillo violeta entre ellas
  const sac=new THREE.Mesh(new THREE.SphereGeometry(1,32,22),S.mat(SOLID(GILA_BODY,{hot:'uC2*1.6',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(sac);
  // trazo del azote
  const lash=new THREE.Mesh(new THREE.TubeGeometry(whip,64,0.13,8,false),S.mat(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.5)discard;
   float n=styNoise(vec2(u*3.-uT*2.,vUv.y)).r;float al=exp(-d*5.)*(.5+.5*n);gl_FragColor=vec4(styRamp(.4+.55*exp(-d*8.))*1.3,al*uA);}`,{},{mode:'energy'}));
  L.mesh.add(lash);
  // onda de veneno por el suelo: un ramal desde el azote hasta cada rival (geometría a lo largo completo, se escala en x)
  const STRIP=`uniform float uD;uniform float uLen;void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;float z=abs(vUv.y-.5)*2.;
   vec4 s=styNoise(vec2(u*uLen*.22,vUv.y*.7)+.3);float w=.62+.3*s.r;float m=smoothstep(w,w*.35,z);
   float fade=exp(-d*uLen*.18);float er=styErode(s.r*.6+s.g*.4,uD,.1);
   float bub=smoothstep(.7,.78,styNoise(vec2(u*uLen*.5-uT*.25,vUv.y*1.3)).a);
   vec3 c=styRamp(.3+.45*exp(-d*uLen*.9)+bub*.35+.15*s.g);
   float a=m*(.45+.55*fade)*er*uA;if(a<.01)discard;gl_FragColor=vec4(c*1.1,a);}`;
  const strips=[...Array(NF)].map((_,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(SL,1,64,1).rotateX(-Math.PI/2),
    S.mat(STRIP,{uD:{value:-1},uLen:{value:SL}},{mode:'matter'}));m.position.y=0.022+0.0007*i;L.decal.add(m);return m;});
  // anillo de onda (sin rivales)
  const wave=groundPlane(1,SP.x,0.021,S.mat(`uniform float uD;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*2.+.3);
   float m=smoothstep(.12,0.,abs(r-.86-(s.r-.5)*.08))*step(r,1.);if(m<.02)discard;float er=styErode(s.r,uD,.1);
   gl_FragColor=vec4(styRamp(.35+.4*s.g),m*er*uA*.9);}`,{uD:{value:-1}},{mode:'matter'}));L.decal.add(wave);
  // cruces de veneno bajo cada rival y grietas bajo el principal
  const CROSS=`uniform float uD;void main(){vec2 p=(vUv-.5)*2.;vec4 s=styNoise(vUv*.9+.17);
   float arm=min(abs(p.x),abs(p.y));float len=max(abs(p.x),abs(p.y));
   float m=smoothstep(.3+.1*s.r,.1,arm)*smoothstep(1.,.75,len+(s.g-.5)*.3)*step(len,uP*1.05);if(m<.02)discard;
   float er=styErode(s.r*.6+s.b*.4,uD,.1);gl_FragColor=vec4(styRamp(.3+.4*s.g+.25*(1.-len)),m*er*uA*.85);}`;
  const crosses=EP.map((e,i)=>{const m=groundPlane(i?2.2:3.0,e.x,0.024+0.001*i,S.mat(CROSS,{uD:{value:-1}},{mode:'matter'}));L.decal.add(m);return m;});
  const crack=groundPlane(3.6,TX,0.03,S.mat(CRACK_FS,{uK:{value:0}},{mode:'matter'})); L.decal.add(crack);
  // géiseres: lenguas de veneno iluminadas que suben y se consumen
  const GEY=`uniform float uH;uniform float uD;void main(){float h=vP.y/uH;vec2 uv=vec2(atan(vP.z,vP.x)*.32,h*1.1-uT*1.5);
   vec4 s=styNoise(uv);float fl=s.r*.7+s.g*.3-h*.95+.3+.15*uP;if(fl<.12)discard;
   float er=styErode(s.r,uD,.1);if(er<.02)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   float hot=smoothstep(.45,.75,fl);vec3 c=styRampOf(mix(${VIOLET},uC2*1.25,smoothstep(.12,.5,fl)),clamp(.25+.5*l,0.,1.))*styTint(l);
   c=mix(c,styRampOf(uC1,.6+.3*l),hot*.55*(1.-h));
   float see=gl_FrontFacing?1.-.8*smoothstep(.62,.25,h):1.;
   gl_FragColor=vec4(c,smoothstep(.12,.26,fl)*er*uA*see);}`;
  const geysers=EP.map((e,i)=>{const H=i?2.3:3.3,r=i?0.42:0.62;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r*0.55,r,H,24,6,true).translate(0,H/2,0),S.mat(GEY,{uH:{value:H},uD:{value:-1}},{mode:'matter'}));
    L.mesh.add(m); return m;});
  const sparks=EP.map((e,i)=>S.hitSpark(L.mesh,i?1.2:1.8,{seed:0.2+i*0.23}));
  const rings=EP.map((e,i)=>S.groundRing(L.decal,i?2.2:3.0));
  const slamSpark=S.hitSpark(L.mesh,1.3,{seed:0.55}), slamRing=S.groundRing(L.decal,2.6);
  // veneno sobre cada rival: marcadores propios (sin rival, lejos de la vista)
  const marks=EP.map(()=>new THREE.Object3D());
  const poison=S.status(a,'poison',marks,TI,END);
  const K=`const float TW=${f(TW)};const float TS=${f(TS)};const vec3 SP=${v3(SP)};const float END=${f(END)};
   uniform vec3 uEP[${NF}];uniform float uET[${NF}];uniform float uNF;
   int fi(float x){return int(min(floor(x*uNF),uNF-1.));}
   vec3 ep(int i){return uEP[i];} float et(int i){return uET[i];}`;
  const U2={uniforms:{uEP,uET,uNF}};
  const P=(n,vs,fs,o)=>S.pts(L.part,n,VV+K+vs,fs,Object.assign({},U2,o||{},{uniforms:Object.assign({},U2.uniforms,(o&&o.uniforms)||{})}));
  // hinchazón: gotas de veneno que caen del saco
  P(14,`void main(){float s=aSeed.x*TW;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-4.15,.6,0.)+rnd()*.15+vec3(0.,-3.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;
   put(p,.13+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:VIOLET}));
  // azote: salpicadura violeta y polvo detrás del lanzador
  P(22,`void main(){float s=TS+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+2.*aSeed.w),2.6+2.4*aSeed.y,sin(an)*(1.+2.*aSeed.w));
   vec3 p=SP+vec3(0.,.1,0.)+v*t+vec3(0.,-8.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,v.y-16.*t);
   put(p,.17+.07*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC2'}));
  P(10,`void main(){float s=TS+aSeed.x*.08;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=SP+vec3(cos(an),0.,sin(an))*(.3+1.1*(1.-exp(-t*4.)))+vec3(0.,.15+.4*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // erupciones: humo de veneno que sube en columna, gotas que llueven (cada partícula en uno de los rivales)
  P(48,`void main(){int i=fi(aSeed.x);float big=i==0?1.:.75;float s=et(i)+aSeed.y*.35;
   float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=ep(i)+vec3(cos(an)*.35*big,.3+t*(2.6+1.2*aSeed.w)*big,sin(an)*.35*big);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t;put(p,(.5+.25*aSeed.w)*big*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'uC2',bias:.04}));
  P(46,`void main(){int i=fi(aSeed.x);float big=i==0?1.:.75;float s=et(i)+aSeed.y*.06;
   float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(.6+1.5*aSeed.w),(3.2+3.*aSeed.y)*big,sin(an)*(.6+1.5*aSeed.w))*big;
   vec3 p=ep(i)+vec3(cos(an)*.3,.3,sin(an)*.3)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.x,v.y-14.*t);put(p,(.17+.07*aSeed.w)*big);}`,
   S.MATTER_FS(C.drop,{relief:4,col:VIOLET}));
  // esquirlas de baldosa en el impacto principal
  P(14,`void main(){float s=et(0);float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+2.2*aSeed.w),2.5+2.5*aSeed.y,sin(an)*(1.+2.2*aSeed.w));
   vec3 p=ep(0)+vec3(0.,.05,0.)+vec3(cos(an),0.,sin(an))*.6+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // brillo violeta a lo largo del frente de cada ramal
  P(36,`void main(){int i=fi(aSeed.z);vec3 e=ep(i);float u=aSeed.x;vec3 q=mix(SP,e,u);float s=TS+u*(et(i)-TS);
   float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=q+vec3(rnd().x*.2,.08+t*.9,rnd().z*.3);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.16+.08*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  const sp=V3(0,0,0), sm=sac.material.uniforms, FAR=V3(999,-50,999);
  let n=1;
  function syncFoes(){
    const foes=(VFX.foes&&VFX.foes.length)?VFX.foes:null;
    n=foes?Math.min(NF,foes.length):0;
    const V=12, d0=foes?Math.hypot(foes[0].x-SP.x,foes[0].z-SP.z):0;
    for(let i=0;i<NF;i++){
      if(i<n){EP[i].set(foes[i].x,0,foes[i].z);const di=Math.hypot(EP[i].x-SP.x,EP[i].z-SP.z);TE[i]=TI+Math.min(0.5,Math.max(0,(di-d0)/V));}
      else{EP[i].copy(FAR);TE[i]=99;}
      uET.value[i]=TE[i];}
    uNF.value=Math.max(n,1);
  }
  a.pose=function(te,o){
    syncFoes();
    const ia=te-TI, sw=ss(0,TW,te), wk=cl((te-TW)/(TS-TW)), is=te-TS, fade=1-ss(END-0.7,END,te), gs=-(VFX.gridSnap||0);
    caster.rotation.z=-0.12*sw+0.32*ss(TW,TW+0.1,te)-0.24*ss(TS-0.05,TS+0.15,te)+0.04*ss(TS+0.15,TS+0.6,te);
    caster.scale.set(1+0.04*sw*(1-ss(TW,TS,te)),1-0.06*sw*(1-ss(TW,TS,te)),1);
    const throb=0.06*Math.sin(te*(9+22*te))*sw;
    glowOf(caster,U.uC2.value,0.3*sw*(1-ss(TS,TS+0.3,te)));
    if(te<TW){tailW(sac.position);}else{whip.getPointAt(Math.min(wk*wk,1),sp);sac.position.copy(sp);}
    const sz=0.18+0.5*sw+throb; sac.visible=te<TS;
    sac.scale.set(sz*(1+0.25*wk),sz*(1-0.15*wk),sz); sm.uK.value=0.3+0.7*sw*(0.5+0.5*Math.sin(te*20));
    lash.visible=te>TW&&te<TS+0.3; set(lash,wk*wk*1.25,1-ss(TS,TS+0.3,te));
    slamSpark.pose(is,tmp.set(SP.x,0.35,0),1); slamRing.pose(is,SP.x,0,0.5,1);
    const uD=-0.1+1.1*ss(END-1.1,END-0.1,te);
    // ramales: del azote a cada rival; el frente llega en TE[i]
    strips.forEach((m,i)=>{const on=i<n&&is>=0;m.visible=on;if(!on)return;const e=EP[i],dx=e.x-SP.x,dz=e.z-SP.z,len=Math.hypot(dx,dz)+0.6;
      m.position.set(SP.x+dx/2*(len/(len-0.6)),m.position.y,SP.z+dz/2*(len/(len-0.6)));m.rotation.y=-Math.atan2(dz,dx);m.scale.x=len/SL;
      m.material.uniforms.uLen.value=len;set(m,cl(is/(TE[i]-TS)),fade);m.material.uniforms.uD.value=uD;});
    // sin rivales: anillo que se abre desde el azote
    wave.visible=n===0&&is>=0; if(wave.visible){const r=1+9*e3(is/0.9);wave.scale.set(r,1,r);set(wave,1,fade);wave.material.uniforms.uD.value=uD;}
    crosses.forEach((c,i)=>{const ie=te-TE[i];c.visible=i<n&&ie>=0;c.position.set(EP[i].x,c.position.y,EP[i].z);c.rotation.y=gs;
      set(c,e3(ie/0.35),fade);c.material.uniforms.uD.value=-0.1+1.1*ss(END-0.9,END,te);});
    crack.visible=n>0&&ia>=0; crack.position.set(EP[0].x,crack.position.y,EP[0].z); crack.rotation.y=gs;
    set(crack,e3(ia/0.35),1-ss(END-0.5,END,te)); crack.material.uniforms.uK.value=0.8*hitE(ia,3);
    geysers.forEach((g,i)=>{const ie=te-TE[i],d=i?0.75:1.0,k=ie<0?0:Math.sin(Math.PI*0.5*cl(ie/0.18));
      g.position.copy(EP[i]);g.visible=i<n&&ie>=0&&ie<d+0.3; g.scale.set(0.85+0.3*k,Math.max(k,0.001),0.85+0.3*k); set(g,k,1);
      g.material.uniforms.uD.value=-0.1+1.15*ss(d*0.45,d+0.25,ie);});
    sparks.forEach((s,i)=>s.pose(i<n?te-TE[i]:-1,tmp.set(EP[i].x,i?0.8:1.0,EP[i].z),i?0.9:1.2));
    rings.forEach((r,i)=>r.pose(i<n?te-TE[i]:-1,EP[i].x,EP[i].z,0.45,1));
    marks.forEach((m,i)=>m.position.copy(EP[i]));
    const hit=hitE(ia,4);
    const pA=poison.pose(te); S.statusGlow(o,[{kind:'poison',env:pA}]);
    o.em=Math.max(o.em||0,0.4*hit);
    const E0=n?EP[0]:tmp2.set(SP.x+6,0,0);
    if(te<TW){tailW(o.g);o.gs=0.5+0.8*sw;o.ga=0.1+0.15*sw;o.li=1+2*sw;}
    else if(te<TS){o.g.copy(sac.position);o.gs=1.2;o.ga=0.25;o.li=3;}
    else if(ia<0){o.g.copy(SP).lerp(E0,cl(is/(TI-TS)));o.g.y=0.4;o.gs=1.2+1.2*hitE(is,6);o.ga=0.2+0.3*hitE(is,8);o.li=2+5*hitE(is,5);}
    else{o.g.set(E0.x,1.2,E0.z);o.gs=1.6+3*Math.min(ia,0.6);o.ga=Math.exp(-ia*7)*0.5+0.05*fade;o.li=8*Math.exp(-ia*4)+1*fade;}
    o.ia=ia; o.c.set(E0.x,0.9,E0.z); o.shake=1.6; o.dist=1.3; o.flash=0.6;
  };
}},ZONES));

// =====================================================================
// 2 · GRASS SNAKE — una serpiente de hierba (verde con rombos violeta) sale de la cola, serpentea a ras de suelo
//     aplastando la hierba, se enrosca en el rival y lo muerde; sobre su cabeza aparece una retícula rota que se cierra
//     (−2 de alcance). ti 1,08 s
// =====================================================================
defs.push(Object.assign({key:"sty_rtGrassSnake",name:"Grass Snake (estilizado)",dur:2.2,ti:1.08,pal:P_SNAKE,tier:2,stylized:true,
  phases:[["Salida",0],["Serpenteo",0.15],["Enroscar",0.78],["Hex",1.08],["Disolución",1.65]],
build(a){
  const L=a.L,T0=0.12,TI=1.08,TQ=1.65,TE=2.05,X0=-4.3,X1=2.6,RAD=0.18,HR=0.68,TURN=1.5;
  const zf=x=>0.8*Math.sin((x-X0)/(X1-X0)*3*Math.PI);
  const pts=[V3(-4.15,0.7,0),V3(-4.35,0.3,0.06)];
  for(let i=1;i<=24;i++){const x=X0+(X1-X0)*i/24;pts.push(V3(x,RAD,zf(x)));}
  const NG=pts.length;
  for(let i=1;i<=24;i++){const t=i/24,an=Math.PI+t*TURN*2*Math.PI;pts.push(V3(TX+Math.cos(an)*HR,0.18+t*1.05,-Math.sin(an)*HR));}
  let len=0;const cum=[0];for(let i=1;i<pts.length;i++){len+=pts[i].distanceTo(pts[i-1]);cum.push(len);}
  const UG0=cum[2]/len, UG1=cum[NG-1]/len, LB=Math.min(4.4,len*0.34)/len;
  const curve=new THREE.CatmullRomCurve3(pts);
  const uHead=te=>{const k=cl((te-T0)/(TI-T0));return 1-Math.pow(1-k,1.5);};
  const VS=`uniform float uP;uniform float uL;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;varying vec3 vON;
  void main(){vUv=uv;vON=normal;float s=clamp((uv.x-(uP-uL))/uL,0.,1.);
   float th=max(smoothstep(0.,.8,s)*(1.-.25*smoothstep(.92,1.,s)),.12);
   vec3 pos=position-normal*${f(RAD)}*(1.-th);vP=pos;vec4 mv=modelViewMatrix*vec4(pos,1.);
   vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  const bodyMat=S.mat(`uniform float uL;uniform float uQ;varying vec3 vON;
  void main(){float s=(vUv.x-(uP-uL))/uL;if(s<0.||s>1.)discard;
   vec4 nz=styNoise(vec2(vUv.x*${f(len*0.7)},vUv.y*2.));if(styErode(nz.r,uQ,.05)<.5)discard;
   vec3 n=normalize(vN);float l=styLight(n,stySunV());float dorsal=smoothstep(-.1,.6,vON.y);
   float fx=(fract(vUv.x*${f(len*2.2)})-.5)*2.;float dia=step(abs(fx)*.9+(1.-vON.y)*1.6,.62);
   float ring=step(.82,abs(fx));float sc=smoothstep(.35,.7,styNoise(vec2(vUv.x*${f(len*5)},vUv.y*7.)).g);
   vec3 base=mix(vec3(.17,.52,.16),vec3(.34,.74,.24),sc*.5);base=mix(base,uC2*.9,dia);base=mix(base,vec3(.86,.84,.52),(1.-dorsal)*.55);
   base*=1.-.18*ring*dorsal;
   vec3 c=styRampOf(base,clamp(.18+.62*l,0.,1.))*styTint(l);
   float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.2*smoothstep(.62,.72,fr)*step(.5,l);
   c+=uC2*uA*.5*dia;gl_FragColor=vec4(c,1.);}`,{uL:{value:LB},uQ:{value:-1}},{mode:'solid',vertexShader:VS});
  const body=new THREE.Mesh(new THREE.TubeGeometry(curve,320,RAD,12,false),bodyMat); L.mesh.add(body);
  // cabeza escamada con ojos violeta y boca que se abre al morder
  const headMat=S.mat(SOLID(`vec3 q=normalize(vP);float dorsal=smoothstep(-.2,.4,q.y);
    base=mix(vec3(.18,.55,.18),vec3(.86,.84,.52),(1.-dorsal)*.55);base=mix(base,uC2*.9,step(.6,q.y)*step(abs(q.z),.35)*step(q.x,.2));
    float eye=step(length(vec2(q.x-.45,q.y-.38)*vec2(1.,1.3)),.2)*step(.45,abs(q.z));base=mix(base,vec3(.12,.04,.2),eye);glow=eye*2.;`,
    {hot:'mix(uC2,vec3(1.,.8,1.),.3)',rim:.25}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const head=new THREE.Group(); L.mesh.add(head);
  const skull=new THREE.Mesh(new THREE.SphereGeometry(0.2,24,16),headMat); skull.scale.set(1.6,0.75,1.0); head.add(skull);
  const jaw=new THREE.Mesh(new THREE.SphereGeometry(0.16,20,12,0,Math.PI*2,Math.PI/2,Math.PI/2),headMat); jaw.scale.set(1.6,0.6,0.9); jaw.position.set(0.02,-0.03,0); head.add(jaw);
  const fangMat=S.mat(SOLID(`base=${BONE};lb=.1;`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  [-1,1].forEach(sg=>{const fg=new THREE.Mesh(new THREE.ConeGeometry(0.025,0.11,6).rotateX(Math.PI),fangMat);fg.position.set(0.23,-0.05,sg*0.07);head.add(fg);});
  // retícula rota (−2 de alcance) sobre el rival
  const reticle=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),S.mat(`uniform float uK;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float seg=step(.3,fract(an/6.2832*6.+.08+uK*.12));float ring=smoothstep(.07,.0,abs(r-(.72-.16*uK)))*seg;
   float tick=smoothstep(.07,.0,min(abs(p.x),abs(p.y)))*step(r,.98)*step(.55-.25*uK,r);
   float crack=smoothstep(.05,0.,abs(p.y-p.x*.4-.1))*step(.5,r)*step(r,.85)*uK;
   float m=max(max(ring,tick),crack*.8);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.5+.45*m)*1.3,m*uA);}`,{uK:{value:0}},{mode:'energy',depthTest:false}));
  L.mesh.add(reticle);
  // hierba aplastada que sigue el serpenteo
  const trail=groundStrip(X1-X0,2.2,(X0+X1)/2,0.018,S.mat(`void main(){float u=vUv.x;float z=(vUv.y-.5)*2.2;float zc=.8*sin(u*${f(3*Math.PI)});
   float d=abs(z-zc);vec4 s=styNoise(vec2(u*9.,vUv.y*2.)+.2);float m=smoothstep(.3+.1*s.r,.08,d)*step(u,uP);if(m<.02)discard;
   float head=exp(-max(uP-u,0.)*7.);float blade=smoothstep(.5,.75,s.g);
   vec3 c=mix(styRampOf(vec3(.2,.38,.1),.2+.3*s.r),styRampOf(vec3(.55,.72,.25),.55),blade);
   gl_FragColor=vec4(c,m*(.4+.45*head)*uA);}`,{},{mode:'matter'}),64);
  const squeeze=S.groundRing(L.decal,2.8), bite=S.hitSpark(L.mesh,1.3,{seed:0.44});
  L.decal.add(trail);
  const K=`const float T0=${f(T0)};const float TI=${f(TI)};const float TQ=${f(TQ)};const float UG0=${f(UG0)};const float UG1=${f(UG1)};
  float zf(float x){return .8*sin((x-(${f(X0)}))/${f(X1-X0)}*${f(3*Math.PI)});}
  float tAt(float u){float k=1.-pow(1.-clamp(u,0.,1.),1./1.5);return T0+k*(TI-T0);}`;
  // briznas que saltan al paso de la serpiente
  S.pts(L.part,40,VV+K+`void main(){float x=${f(X0)}+aSeed.x*${f(X1-X0)};float s=tAt(mix(UG0,UG1,aSeed.x));
   float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vec3 r=rnd();
   vec3 p=vec3(x,.05,zf(x))+vec3(r.x*.5,1.5+r.y*.5,r.z*.6)*(1.-exp(-t*4.))*.35+vec3(0.,-1.4*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*(4.+3.*aSeed.z);put(p,.2+.08*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.42,.7,.2)'}));
  // al morder: escamas violeta que saltan; después, motas que giran hacia la retícula
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.7,0.))*(1.6+1.6*aSeed.z);vec3 p=vec3(${f(TX-0.25)},1.25,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.17+.07*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2'}));
  S.pts(L.part,16,VV+K+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TI-.05)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*4.;float rad=(.8-.5*age);vec3 p=vec3(${f(TX)}+cos(an)*rad,.4+age*1.9+r.y*.2,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=uT*3.;put(p,.16+.06*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  const hp=V3(0,0,0), hd=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, uH=uHead(te), q=ss(TQ,TE,te);
    caster.rotation.z=-0.08*ss(0,T0,te)+0.08*ss(T0,0.4,te);
    body.visible=te>=T0&&q<0.999; bodyMat.uniforms.uP.value=uH; bodyMat.uniforms.uA.value=hitE(ia,4)+0.1; bodyMat.uniforms.uQ.value=-0.1+1.15*q;
    curve.getPointAt(cl(uH,0.0005,1),hp); curve.getTangentAt(cl(uH,0.0005,1),hd);
    head.visible=body.visible&&uH>0.003; head.position.copy(hp).addScaledVector(hd,0.1);
    // al llegar arriba, la cabeza mira al rival y muerde
    const lunge=ss(TI-0.12,TI,te)*(1-ss(TI+0.25,TI+0.5,te));
    tmp.copy(hd).lerp(tmp2.set(-0.2,-0.6,0.8).normalize(),lunge*0.8); aim(head,tmp,0);
    head.scale.setScalar(1+0.15*lunge); jaw.rotation.z=-0.6*ss(TI-0.12,TI-0.03,te)*(1-ss(TI,TI+0.08,te));
    headMat.uniforms.uQ.value=-0.1+1.15*q; fangMat.uniforms.uQ.value=headMat.uniforms.uQ.value;
    bite.pose(ia,tmp.set(TX-0.15,1.25,0.25),1);
    const sq=ss(TI-0.08,TI+0.1,te)*(1-ss(TQ,TE,te)), hit=hitE(ia,6);
    target.scale.set(1-0.08*sq,1+0.04*sq,1-0.08*sq); target.rotation.z=0.07*hit*Math.sin(ia*40);
    const hx=ss(TI+0.02,TI+0.35,te), hfade=1-ss(TQ+0.1,2.15,te);
    reticle.visible=te>TI&&hfade>0.001; towardCam(reticle.position,tmp.set(TX,2.45+0.05*Math.sin(te*4),0),0.3); billboard(reticle);
    reticle.scale.setScalar(0.75+0.3*hx); set(reticle,0,hx*hfade); reticle.material.uniforms.uK.value=ss(TI+0.2,TI+0.6,te);
    U.uE.value=sq;
    set(trail,cl((uH-UG0)/(UG1-UG0)),ss(T0,T0+0.1,te)*(1-ss(1.3,1.9,te)));
    squeeze.pose(ia,TX,0,0.45,1);
    o.em=0.25*sq; o.emc.copy(U.uC2.value);
    if(te<TI){o.g.copy(hp).y+=0.15;o.gs=0.6;o.ga=0.1*ss(T0,T0+0.1,te);o.li=1.2;}
    else{o.g.set(TX,1.6,0);o.gs=1.4;o.ga=0.25*hitE(ia,7)+0.05*hfade;o.li=4*hitE(ia,5)+1*hfade;}
    o.ia=ia; o.c.set(TX-0.05,1.0,0); o.shake=0; o.dist=0.6; o.flash=0.5;
  };
}},ZONES,{zoneTarget:1.3}));

// =====================================================================
// 3 · IGUANA (Big Yak) — la cola se carga hacia atrás y suelta un coletazo: una cola de iguana espectral (jade con
//     anillos oscuros y cresta de púas naranja) barre el suelo a la altura de las piernas dejando un corte de pincel,
//     derriba al rival y lo deja Débil. ti 0,68 s
// =====================================================================
const IG_BODY=`float u=vUv.x;float rings=smoothstep(.55,.75,sin(u*6.2832*7.));float sc=smoothstep(.3,.7,styNoise(vec2(u*16.,vUv.y*6.)).g);
 base=mix(vec3(.1,.45,.28),vec3(.24,.62,.32),sc*.55);base=mix(base,vec3(.04,.16,.12),rings*.7);lb=-.1-.06*rings;`;
defs.push(Object.assign({key:"sty_rtIguana",name:"Iguana (estilizado)",dur:1.9,ti:0.68,pal:P_IGUANA,tier:2,stylized:true,
  phases:[["Torsión",0],["Coletazo",0.32],["Barrido",0.68],["Debilidad",0.85],["Fin",1.6]],
build(a){
  const L=a.L,TW=0.32,TI=0.68,TK=0.85,TF=1.6,Y=0.34,X0=-4.2,X1=2.75;
  const cxAt=te=>te<TW?X0:X0+(X1-X0)*Math.pow(cl((te-TW)/(TI-TW)),1.6);
  // cola: arco en el plano del suelo (convexo hacia +x), de la base gruesa (z−) a la punta fina (z+)
  const arc=[];for(let i=0;i<=10;i++){const an=-1.15+2.3*i/10;arc.push(V3(Math.cos(an)*0.82,0.04*Math.sin(i*0.9),Math.sin(an)*0.82));}
  const tailCurve=new THREE.CatmullRomCurve3(arc);
  const tailMat=S.mat(SOLID(IG_BODY,{hot:'uC1',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const tg=new THREE.Group(); L.mesh.add(tg);
  const tube=new THREE.Mesh(taperTube(tailCurve,64,12,0.24,0.04),tailMat); tg.add(tube);
  const spineMat=S.mat(SOLID(`base=mix(vec3(.95,.45,.1),vec3(1.,.7,.25),vUv.y);lb=-.04;`,{hot:'uC1',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  for(let i=0;i<9;i++){const u=0.06+i*0.1;const p=tailCurve.getPointAt(u),r=0.2+(0.035-0.2)*u;
    const sp=new THREE.Mesh(new THREE.ConeGeometry(0.06+0.07*(1-u),0.22+0.28*(1-u),5),spineMat);sp.position.copy(p).y+=r*0.85;tg.add(sp);}
  // estela de pincel del barrido (energía, sigue a la cola)
  const smear=new THREE.Mesh(new THREE.RingGeometry(0.5,1.15,40,1,-1.2,2.4).rotateX(-Math.PI/2),S.mat(`void main(){vec2 p=vec2(vP.x,-vP.z);float r=length(p);float an=atan(p.y,p.x);
   vec4 s=styShape(6.,vec2((an+1.2)/2.4,(r-.5)/.65));float m=s.r;if(m<.03)discard;float er=styErode(s.r*.5+s.b*.5,1.-uP,.1);
   gl_FragColor=vec4(styRamp(.55+.4*s.g)*1.2,m*er*uA);}`,{},{mode:'energy'})); tg.add(smear);
  // corte de pincel a la altura de las piernas en el impacto
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),S.mat(`void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.03)discard;
   float er=styErode(s.r*.5+s.b*.5,uP,.1);gl_FragColor=vec4(styRamp(.55+.42*s.g)*1.35,m*er*uA);}`,{},{mode:'energy',depthTest:false}));
  L.mesh.add(slash);
  const scuff=groundStrip(X1-X0+0.8,1.4,(X0+X1)/2+0.4,0.02,S.mat(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;vec4 s=styNoise(vec2(u*7.,vUv.y*1.5)+.6);
   float m=smoothstep(.65+.25*s.r,.15,v)*step(u,uP)*smoothstep(0.,.06,u);if(m<.02)discard;float head=exp(-max(uP-u,0.)*6.);
   gl_FragColor=vec4(styRampOf(${EARTH},.2+.3*s.g),m*(.3+.35*head)*uA);}`,{},{mode:'matter'}),48);
  L.decal.add(scuff);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.31}), ring=S.groundRing(L.decal,3.0);
  const weak=S.status(a,'weak',[target],TK,TF+0.25);
  const K=`const float TW=${f(TW)};const float TI=${f(TI)};const float TX=${f(TX)};const float Y=${f(Y)};
  float cx(float t){return ${f(X0)}+${f(X1-X0)}*pow(clamp((t-TW)/(TI-TW),0.,1.),1.6);}`;
  // torsión: escamas jade que se enroscan en la cola
  S.pts(L.part,14,VV+K+`void main(){float s=aSeed.x*(TW-.08);float life=.24;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*5.;float rd=mix(.8,.15,k*k);vec3 p=vec3(-4.15,.7,0.)+vec3(cos(an)*rd,(aSeed.w-.5)*.4*(1.-k),sin(an)*rd);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.7,1.,k);vR=an;put(p,.17+.06*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2',bias:.1}));
  // barrido: polvo a ras de suelo
  S.pts(L.part,20,VV+K+`void main(){float s=TW+aSeed.x*(TI-TW);float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(cx(s)+.5,.08+.35*(1.-exp(-t*3.)),rnd().z*.6);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.35+.2*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.04}));
  // impacto: escamas jade y púas que saltan, polvo bajo
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.5,0.))*(2.+2.*aSeed.z);vec3 p=vec3(TX-.3,Y,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2',bias:.08}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(TX,.1,0.)+vec3(cos(an),0.,sin(an))*(.4+1.*(1.-exp(-t*4.)))+vec3(0.,.25*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.04}));
  a.pose=function(te,o){
    const ia=te-TI, x=cxAt(te), k=cl((te-TW)/(TI-TW));
    caster.rotation.z=0.2*ss(0,TW,te)-0.32*ss(TW,TW+0.12,te)+0.12*ss(TW+0.12,0.9,te);
    glowOf(caster,U.uC2.value,0.3*ss(0,TW,te)*(1-ss(TW,TI,te)));
    // la cola gira desde detrás del lanzador y barre el suelo hacia el rival
    tg.visible=te>0.03&&te<TI+0.12; tg.position.set(x,Y,0);
    tg.rotation.y=te<TW?Math.PI*(1-ss(0.03,TW,te)):0.45*Math.sin(k*Math.PI*2)*(1-k)-0.5*ss(TI,TI+0.12,te);
    tg.scale.setScalar(Math.max(0.75+0.35*ss(0,TW,te)+0.55*k,0.001));
    tailMat.uniforms.uK.value=0.25*ss(TW,TI,te); tailMat.uniforms.uQ.value=-0.1+1.15*ss(TI+0.02,TI+0.12,te); spineMat.uniforms.uQ.value=tailMat.uniforms.uQ.value;
    set(smear,ss(TW,TW+0.1,te)*0.9,te>TW?1-ss(TI,TI+0.1,te):0);
    // impacto en las piernas
    const ps=cl(ia/0.28); slash.visible=ia>=0&&ps<1; towardCam(slash.position,tmp.set(TX-0.2,0.45,0),0.5); billboard(slash,-0.12);
    slash.scale.set(0.8+0.5*e3(ps*2),0.8+0.3*e3(ps*2),1); set(slash,-0.1+1.1*ss(0.08,0.28,ia),1);
    spark.pose(ia,tmp.set(TX-0.25,0.45,0),1); ring.pose(ia,TX,0,0.45,1);
    const hit=hitE(ia,5), wk=weak.pose(te);
    target.rotation.z=ia>=0?0.34*hit*Math.sin(ia*12+0.4):0; target.position.y=-0.06*hit*(ia>=0?1:0);
    target.scale.set(1+0.03*wk,1-0.08*wk-0.06*hit,1+0.03*wk);
    S.statusGlow(o,[{kind:'weak',env:wk}]); o.em=Math.max(o.em||0,0.35*hit);
    set(scuff,cl((x-X0)/(X1-X0+0.8)),ss(TW,TW+0.05,te)*(1-ss(1.1,1.6,te)));
    if(te<TW){tailW(o.g);o.gs=0.6;o.ga=0.1;o.li=1.2;}
    else if(ia<0){o.g.set(x+0.6,Y+0.1,0);o.gs=0.9;o.ga=0.15;o.li=2;}
    else{o.g.set(TX-0.1,0.45,0);o.gs=1.2+1.2*Math.min(ia,0.4);o.ga=0.35*hitE(ia,8);o.li=4*hitE(ia,5);}
    o.ia=ia; o.c.set(TX-0.05,0.45,0); o.shake=0.5; o.dist=0.7; o.flash=0.6;
  };
}},ZONES,{zoneTarget:1.3}));

// =====================================================================
// 4 · SNAKE JAR (aliado) — un jarrón vidriado violeta con una serpiente dorada pintada sale de la cola, vuela hasta el
//     aliado y se agrieta; al romperse sale una cobra que se alza detrás del aliado y abre la capucha sobre él; se
//     funde en un velo de escamas (anula el próximo golpe) que queda como una serpiente enroscada a sus pies. ti 0,92 s
// =====================================================================
defs.push({key:"sty_rtSnakeJar",name:"Snake Jar (estilizado)",dur:2.3,ti:0.92,pal:P_JAR,tier:2,stylized:true,receiver:'target',
  phases:[["Jarrón",0],["Lanzamiento",0.28],["Grietas",0.7],["Rotura",0.92],["Cobra",1.0],["Velo",1.5],["Guardia",1.9]],
build(a){
  const L=a.L,TL=0.28,TLD=0.7,TI=0.92,TC0=1.0,TV=1.5,TW=1.9,END=2.3;
  const JL=V3(TX+0.75,0,-0.35);
  const prof=[[0.001,0],[0.16,0.01],[0.26,0.08],[0.31,0.2],[0.3,0.33],[0.22,0.46],[0.13,0.53],[0.11,0.61],[0.16,0.65],[0.15,0.7],[0.11,0.7]].map(p=>new THREE.Vector2(p[0]*1.6,p[1]*1.6));
  const jarMat=S.mat(`uniform float uQ;uniform float uK;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   float y=vP.y/1.6;float an=atan(vP.x,vP.z);
   float serp=smoothstep(.035,.0,abs(y-.3-.06*sin(an*3.+y*4.)));float bands=smoothstep(.016,0.,abs(y-.12))+smoothstep(.016,0.,abs(y-.5));
   vec3 base=mix(vec3(.24,.1,.4),vec3(.46,.24,.66),smoothstep(0.,.6,y));base=mix(base,vec3(1.,.78,.32),max(serp,bands));
   float cr=smoothstep(.05,0.,abs(styNoise(vec2(an*.5,y*1.6)+.3).b-.5))*uK;
   vec3 c=styRampOf(base,clamp(.22+.56*l,0.,1.))*styTint(l);float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.3*smoothstep(.62,.72,fr)*step(.5,l);
   c+=uC1*cr*2.4;gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const jar=new THREE.Mesh(new THREE.LatheGeometry(prof,24),jarMat); L.mesh.add(jar);
  const jarShadow=S.contactShadow(L.decal,1.0);
  // cobra: cuerpo que sube del jarrón detrás del aliado, capucha con anteojos dorados y cabeza
  const cobraPts=[V3(JL.x,0.25,JL.z),V3(TX+0.75,0.75,-0.6),V3(TX+0.45,1.35,-0.75),V3(TX+0.15,1.95,-0.65),V3(TX+0.02,2.35,-0.45)];
  const cobraCurve=new THREE.CatmullRomCurve3(cobraPts);
  const cobraMat=S.mat(`uniform float uGrow;uniform float uQ;${SCALE}void main(){float u=vUv.x;if(u>uGrow)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   float nz=styNoise(vec2(u*6.,vUv.y*.6)+.3).r;if(styErode(nz*.7+(1.-u)*.3,uQ,.06)<.5)discard;
   float e=scaleEdge(vec2(vUv.y*14.,u*40.));float sc=smoothstep(.62,.25,e);float belly=smoothstep(.15,.0,abs(fract(vUv.y)-.75));
   vec3 base=mix(vec3(.14,.06,.24),vec3(.34,.16,.52),sc*.6);base=mix(base,vec3(.86,.7,.4),belly*.6);
   vec3 c=styRampOf(base,clamp(.2+.6*l,0.,1.))*styTint(l)+uC1*(1.-sc)*.25;gl_FragColor=vec4(c,1.);}`,{uGrow:{value:0},uQ:{value:-1}},{mode:'solid'});
  const cobra=new THREE.Mesh(taperTube(cobraCurve,64,12,0.17,0.12),cobraMat); L.mesh.add(cobra);
  const hoodMat=S.mat(`uniform float uQ;void main(){vec2 p=(vUv-.5)*2.;float w=1.-pow(abs(p.y*.9+.1),2.2);float m=step(abs(p.x),w*.95)*step(-.95,p.y)*step(p.y,.95);
   if(m<.5)discard;vec4 nz=styNoise(vUv*1.3+.5);if(styErode(nz.r*.7+(1.-abs(p.x))*.3,uQ,.06)<.5)discard;
   float rim=smoothstep(w*.95-.14,w*.95,abs(p.x));float spec=smoothstep(.2,.12,length(vec2(abs(p.x)-.34,p.y-.18)))+smoothstep(.07,0.,abs(length(vec2(p.x,(p.y-.05)*1.4))-.36))*step(-.05,p.y);
   float l=.55+.45*(1.-abs(p.x));vec3 base=mix(vec3(.32,.15,.5),vec3(.16,.06,.26),rim);base=mix(base,vec3(1.,.76,.3),clamp(spec,0.,1.));
   vec3 c=styRampOf(base,clamp(.25+.5*l,0.,1.))*styTint(l)+uC1*clamp(spec,0.,1.)*.4;gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1}},{mode:'solid',side:THREE.DoubleSide});
  const hood=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.15),hoodMat); L.mesh.add(hood);
  const cHeadMat=S.mat(SOLID(`vec3 q=normalize(vP);base=vec3(.3,.14,.46);float eye=step(length(vec2(q.x-.4,q.y-.3)),.22)*step(.4,abs(q.z));base=mix(base,vec3(.1,.02,.12),eye);glow=eye*2.2;`,{hot:'vec3(1.,.82,.3)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const cHead=new THREE.Mesh(new THREE.SphereGeometry(0.17,20,14),cHeadMat); cHead.scale.set(1.5,0.8,1.05); L.mesh.add(cHead);
  // velo de escamas (barrera) alrededor del aliado y serpiente enroscada en el suelo
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.05,40,24,0,Math.PI*2,0,Math.PI*0.62),S.mat(SHELL_FS(`float e=scaleEdge(vec2(atan(vP.z,vP.x)*3.2,vP.y*7.));bands=smoothstep(.42,.5,e)*.35;`),{uD:{value:-1},uF:{value:0},uR:{value:1.05}},{mode:'matter',side:THREE.DoubleSide}));
  dome.position.set(TX,0,0); L.mesh.add(dome);
  const coil=groundPlane(2.3,TX,0.03,S.mat(GLYPH(`float sp=fract((atan(p.y,p.x)/6.2832)+r*1.6-uT*.25);m=max(smoothstep(.12,0.,abs(sp-.5)-.32)*step(.3,r)*step(r,.92)*.9,smoothstep(.04,0.,abs(r-.95))*.6)*s.r;`),{},{mode:'energy'}));
  L.decal.add(coil);
  const brk=S.hitSpark(L.mesh,1.3,{seed:0.48}), ring=S.groundRing(L.decal,2.4);
  const P0=V3(-4.25,0.95,0.15), K=`const float TI=${f(TI)};const vec3 JL=${v3(JL)};`;
  // fragmentos del jarrón y pan de oro
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(1.6+1.8*aSeed.z);vec3 p=JL+vec3(0.,.45,0.)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.36,.18,.56)'}));
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.9,0.))*(1.2+1.4*aSeed.z);vec3 p=JL+vec3(0.,.5,0.)+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;vK=0.;vR=uT*4.;put(p,.14+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // humo violeta al romperse
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.1;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=JL+vec3(cos(an)*.4,.3+t*.9,sin(an)*.4);vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;
   put(p,(.5+.2*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:'uC2',bias:.1}));
  const hdir=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,TL,te)-0.18*ss(TL,TL+0.1,te)+0.08*ss(TL+0.2,0.7,te);
    // jarrón: aparece en la cola, vuela en arco, aterriza junto al aliado, tiembla y se agrieta
    const grow=ss(0.02,TL,te);
    if(te<TL){tailW(jar.position);jar.position.y+=0.2*grow;jar.rotation.set(0,0,0.3*Math.sin(te*12));}
    else if(te<TLD){const u=(te-TL)/(TLD-TL);jar.position.lerpVectors(P0,JL,u);jar.position.y+=Math.sin(u*Math.PI)*2.4;jar.rotation.set(0,u*4,-0.5*Math.sin(u*Math.PI));}
    else{const sh=0.035*ss(TLD,TI,te)*Math.sin(te*70);jar.position.copy(JL);jar.position.x+=sh;jar.rotation.set(0,0,sh*1.5);}
    const land=te>=TLD?hitE(te-TLD,12):0; jar.scale.set(Math.max(grow,0.001)*(1+0.12*land),Math.max(grow,0.001)*(1-0.15*land),Math.max(grow,0.001)*(1+0.12*land));
    jar.visible=ia<0&&grow>0.001; jarMat.uniforms.uK.value=ss(TLD,TI,te);
    jarShadow.pose(jar.position.x,jar.position.z,0.8,ia<0?0.5*grow*cl(1.4-jar.position.y*0.4):0);
    brk.pose(ia,tmp.set(JL.x,0.5,JL.z),1); ring.pose(ia,JL.x,JL.z,0.4,0.9);
    // cobra: crece, abre la capucha y se funde en el velo
    const cg=ss(TC0-0.08,TV-0.15,te), cq=ss(TV,TV+0.35,te);
    cobra.visible=te>TC0-0.08&&cq<0.999; cobraMat.uniforms.uGrow.value=cg*1.02; cobraMat.uniforms.uQ.value=-0.1+1.15*cq;
    cobraCurve.getPointAt(cl(cg,0.001,1),tmp); cobraCurve.getTangentAt(cl(cg,0.001,1),hdir);
    cHead.visible=cobra.visible&&cg>0.02; cHead.position.copy(tmp).addScaledVector(hdir,0.12);
    tmp2.copy(hdir).lerp(tmp3.set(-0.6,-0.5,0.6),ss(TV-0.3,TV-0.1,te)*0.7); aim(cHead,tmp2,0); cHeadMat.uniforms.uQ.value=cobraMat.uniforms.uQ.value;
    const hf=back(ss(TV-0.4,TV-0.15,te));
    hood.visible=cobra.visible&&hf>0.01; hood.position.copy(tmp).addScaledVector(hdir,-0.42); hood.position.z+=0.06;
    towardCam(hood.position,hood.position,0.12); billboard(hood);
    hood.scale.set(Math.max(hf,0.001),Math.max(0.4+0.6*hf,0.001),1); hoodMat.uniforms.uQ.value=cobraMat.uniforms.uQ.value;
    // velo: se cierra de abajo arriba, late y se vuelve la serpiente enroscada
    const dv=ss(TV-0.05,TV+0.35,te);
    dome.visible=te>TV-0.05&&te<END; set(dome,dv,1); dome.material.uniforms.uF.value=hitE(te-TV-0.3,5)+0.15*Math.sin(te*9);
    dome.material.uniforms.uD.value=-0.1+1.15*ss(TW,TW+0.3,te);
    set(coil,-0.1+1.1*ss(END-0.25,END,te),ss(TW-0.1,TW+0.15,te)); coil.scale.setScalar(0.7+0.3*ss(TW-0.1,TW+0.2,te));
    const env=ss(TV,TV+0.3,te);
    o.em=0.35*env+0.3*hitE(ia,6); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(jar.position);o.gs=0.5;o.ga=0.06+0.15*ss(TLD,TI,te);o.li=1+2*ss(TLD,TI,te);}
    else{o.g.set(TX+0.3,1.2,-0.3);o.gs=1.4;o.ga=0.2*hitE(ia,6)+0.06*env;o.li=3*hitE(ia,4)+1*env;}
    o.ia=ia; o.c.set(TX,0.7,0); o.shake=0; o.dist=0.4; o.flash=0;
  };
}});

// =====================================================================
// 5 · TINY DINO (Shinji) — cuatro púas de hueso brotan una a una en la cola; se funden en un mazo de cola con púas
//     (thagomizer) que sube en arco, cae en vertical sobre el rival y da un golpe tectónico: anillos de onda en el
//     suelo, grietas, columnas de polvo y terrones. El mazo queda clavado y se hunde. ti 1,02 s
// =====================================================================
const DINO_SKIN=`float sc=smoothstep(.3,.7,styNoise(vUv*vec2(10.,4.)+.3).g);float bnd=smoothstep(.55,.8,sin(vUv.x*6.2832*5.));base=mix(vec3(.17,.05,.27),vec3(.3,.1,.44),sc*.6);base=mix(base,vec3(.08,.02,.13),bnd*.7);lb=-.16;`;
const BONE_BODY=`float h=clamp(vUv.y,0.,1.);float bnd=smoothstep(.6,.85,sin(h*6.2832*3.));base=mix(vec3(.22,.07,.32),vec3(.78,.46,.14),smoothstep(.15,.55,h));base=mix(base,vec3(.3,.12,.34),bnd*.5);lb=-.14;`;
defs.push(Object.assign({key:"sty_rtTinyDino",name:"Tiny Dino (estilizado)",dur:2.2,ti:1.02,pal:P_DINO,tier:2,stylized:true,
  phases:[["Retener",0],["Alzada",0.55],["Golpe",0.75],["Impacto",1.02],["Asentamiento",1.35]],
build(a){
  const L=a.L,CT=[0.06,0.17,0.28,0.39],TA=0.55,TS=0.8,TI=1.02,END=2.2;
  const P0=V3(-4.25,1.15,0), B1=V3(-2.6,4.9,0), B2=V3(1.3,5.4,0), A=V3(TX,4.6,0), H=V3(TX,1.85,0);
  const boneMat=S.mat(SOLID(BONE_BODY,{hot:'uC1',rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const skinMat=S.mat(SOLID(DINO_SKIN,{hot:'uC1',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  // púas sueltas que orbitan la cola
  const loose=CT.map(()=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.52,7).translate(0,0.26,0),boneMat);L.mesh.add(m);return m;});
  // mazo: cola corta escamada + nudo + 4 púas (apunta hacia −y local: el golpe)
  const club=new THREE.Group(); L.mesh.add(club);
  const handle=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([V3(0,0.95,0),V3(0.08,0.55,0),V3(0,0.2,0)]),24,10,0.07,0.17),skinMat); club.add(handle);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.26,20,14),skinMat); knob.scale.set(1,0.85,1); club.add(knob);
  const SPK=[[0.7,0.5],[-0.7,0.5],[0.7,-0.5],[-0.7,-0.5]].map(([ax,az])=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.55,7).translate(0,0.27,0),boneMat);
    m.position.set(ax*0.16,-0.04,az*0.2);m.quaternion.setFromUnitVectors(YA,tmp.set(ax,-0.55,az).normalize());club.add(m);return m;});
  const shadow=S.contactShadow(L.decal,1.3);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.27});
  const rings=[0,1,2].map(i=>S.groundRing(L.decal,3.0+i*1.1));
  const crack=groundPlane(4.6,TX,0.027,S.mat(CRACK_FS,{uK:{value:0}},{mode:'matter'})); L.decal.add(crack);
  const K=`const float TI=${f(TI)};const float TX=${f(TX)};const float TS=${f(TS)};const vec3 A=${v3(A)};const vec3 H=${v3(H)};`;
  // caída: estela ámbar
  S.pts(L.part,14,VV+K+`void main(){float s=TS+aSeed.x*(TI-TS);float u=(s-TS)/(TI-TS);float life=.25+aSeed.y*.12;float age=(uT-s)/life;
   vec3 p=mix(A,H,u*u)+vec3(rnd().x*.18,.3,rnd().z*.18);vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=1.57;put(p,.3+.1*aSeed.w);}`,
   S.ENERGY_FS(C.slash,{gain:1.1}),{mode:'energy'});
  // impacto: columnas de polvo, terrones y chispas
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.12;float life=.8+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=floor(aSeed.z*7.)/7.*6.2832+aSeed.w*.3;float rad=.6+.9*(1.-exp(-t*4.))*(.6+aSeed.y*.6);
   vec3 p=vec3(TX+cos(an)*rad,.15+t*(1.3+1.4*aSeed.w),sin(an)*rad*.85);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.55+.25*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.02}));
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+2.*aSeed.w),3.+3.*aSeed.y,sin(an)*(1.2+2.*aSeed.w));
   vec3 p=vec3(TX,.1,0.)+vec3(cos(an),0.,sin(an))*.5+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.26+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(2.5+2.*aSeed.z);vec3 p=H+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=atan(v.x,v.y);put(p,.18+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  const dn=V3(0,-1,0), q1=new THREE.Quaternion();
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.06*Math.sin(te*14)*ss(0,TA,te)*(1-ss(TA,TA+0.1,te))-0.22*ss(TA,TA+0.12,te)+0.22*ss(TA+0.2,TI,te);
    glowOf(caster,U.uC1.value,0.25*ss(0,TA,te)*(1-ss(TA,TA+0.2,te)));
    // púas: brotan una a una y orbitan la cola; en la alzada vuelan al mazo
    tailW(tmp2);
    loose.forEach((m,i)=>{const g=back(ss(CT[i],CT[i]+0.16,te)),an=te*5+i*Math.PI/2;
      m.visible=te>CT[i]&&te<TA+0.06; m.position.set(tmp2.x+Math.cos(an)*0.38,tmp2.y+0.3+0.08*Math.sin(an*2),Math.sin(an)*0.38);
      if(te>TA-0.04)m.position.lerp(P0,ss(TA-0.04,TA+0.06,te));
      m.quaternion.setFromUnitVectors(YA,tmp.set(Math.cos(an),0.9,Math.sin(an)).normalize()); m.scale.setScalar(Math.max(g*1.8,0.001));});
    // mazo: aparece en P0, sube en arco y cae en vertical
    const SC=2.5, form=back(ss(TA-0.02,TA+0.12,te));
    if(te<TS){const u=cl((te-TA)/(TS-TA)),uu=u*(2-u);bez3(club.position,P0,B1,B2,A,uu);
      q1.setFromAxisAngle(V3(0,0,1),Math.PI*0.9*(1-uu)+0.25*Math.sin(uu*Math.PI)); club.quaternion.copy(q1);}
    else if(ia<0){const u=cl((te-TS)/(TI-TS));club.position.lerpVectors(A,H,u*u);club.quaternion.identity();}
    else{const sink=ss(TI+0.25,TI+0.7,te);club.position.copy(H).y-=0.12*ss(0,0.05,ia)+1.9*sink;club.quaternion.setFromAxisAngle(V3(0,0,1),0.12*hitE(ia,8)*Math.sin(ia*40));}
    club.visible=te>TA-0.02&&te<END-0.05; club.scale.setScalar(Math.max(SC*form,0.001)*(ia>=0?1+0.1*hitE(ia,10):1));
    const er=-0.1+1.15*ss(1.45,END-0.15,te); boneMat.uniforms.uQ.value=er; skinMat.uniforms.uQ.value=er;
    boneMat.uniforms.uK.value=0.35*ss(TS,TI,te)*(1-ss(TI,TI+0.3,te)); skinMat.uniforms.uK.value=boneMat.uniforms.uK.value*0.6;
    shadow.pose(club.position.x,club.position.z,0.8+0.12*cl(club.position.y*0.2),club.visible?0.55*cl(1.5-club.position.y*0.25):0);
    spark.pose(ia,tmp.set(TX,0.6,0.35),0.7);
    rings.forEach((r,i)=>r.pose(ia-i*0.09,TX,0,0.5+i*0.1,1.15));
    set(crack,e3(ia/0.3),ia>=0?1-ss(END-0.45,END,te):0); crack.material.uniforms.uK.value=0.9*hitE(ia,4);
    const hit=hitE(ia,6);
    target.scale.set(1+0.18*hit,1-0.24*hit,1+0.18*hit); target.position.y=-0.05*hit; target.rotation.z=0.08*hit*Math.sin(ia*30);
    o.em=0.45*hit; o.emc.copy(U.uC1.value);
    if(te<TA){tailW(o.g);o.gs=0.6;o.ga=0.1*ss(0,TA,te);o.li=1.5*ss(0,TA,te);}
    else if(ia<0){o.g.copy(club.position);o.gs=0.9;o.ga=0.15+0.2*ss(TS,TI,te);o.li=2+3*ss(TS,TI,te);}
    else{o.g.set(TX,1.0,0);o.gs=1.2+1.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.25;o.li=5*Math.exp(-ia*4);}
    o.ia=ia; o.c.set(TX,0.9,0); o.shake=1.2; o.dist=0.9; o.flash=0.3;
  };
}},ZONES));

// =====================================================================
// 6 · WALL GECKO — autotomía: el lanzador pierde 30 HP (pulso rojo y gotas de sangre), su cola de geco se desprende
//     retorciéndose, vuela y azota al rival con salpicadura pegajosa; mientras, cuatro huellas de geco se sellan
//     alrededor del lanzador y una funda de escamas menta lo cubre (−30 % de daño recibido). ti 0,68 s
// =====================================================================
const GECKO_BODY=`float u=vUv.x;float spots=smoothstep(.62,.7,styNoise(vec2(u*5.,vUv.y*1.5)+.2).g);float rings=smoothstep(.6,.8,sin(u*6.2832*6.));
 base=vec3(.08,.44,.34);base=mix(base,vec3(.98,.55,.16),spots*.9);base=mix(base,vec3(.05,.26,.22),rings*.55);lb=-.1-.05*rings;`;
defs.push(Object.assign({key:"sty_rtWallGecko",name:"Wall Gecko (estilizado)",dur:2.0,ti:0.68,pal:P_GECKO,tier:2,stylized:true,
  phases:[["Sacrificio",0],["Lanzamiento",0.32],["Golpe",0.68],["Guardia",0.85],["Suelta",1.6]],
build(a){
  const L=a.L,TA=0.32,TI=0.68,TG=0.85,TR=1.6,END=2.0;
  const tailCurve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(-0.32,0.06,0.05),V3(-0.62,-0.03,-0.04),V3(-0.9,0.04,0)]);
  const tailMat=S.mat(SOLID(GECKO_BODY,{hot:'uC1',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const tail=new THREE.Mesh(taperTube(tailCurve,40,10,0.17,0.035),tailMat); L.mesh.add(tail);
  const HP=V3(TX-0.32,1.0,0.1), P0=V3(-4.3,0.75,0), P1=V3(-2.0,2.9,0.3), P2=V3(1.2,2.6,0.3);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.58}), ring=S.groundRing(L.decal,2.6), pop=S.hitSpark(L.mesh,0.9,{seed:0.12});
  const splat=groundPlane(1.8,TX-0.1,0.026,S.mat(STAIN(MINT,.55),{},{mode:'matter'})); L.decal.add(splat);
  // guardia: funda de escamas menta y cuatro huellas de geco alrededor del lanzador
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.98,40,24,0,Math.PI*2,0,Math.PI*0.6),S.mat(SHELL_FS(`float e=scaleEdge(vec2(atan(vP.z,vP.x)*3.6,vP.y*8.));bands=smoothstep(.4,.5,e)*.4;`),{uD:{value:-1},uF:{value:0},uR:{value:0.98}},{mode:'matter',side:THREE.DoubleSide}));
  dome.position.set(CX,0,0); L.mesh.add(dome);
  const FEET=[[0.75,0.55,0.5],[0.75,-0.55,-0.5],[-0.75,0.55,2.6],[-0.75,-0.55,-2.6]];
  const prints=FEET.map(([dx,dz,r])=>{const m=groundPlane(0.8,CX+dx,0.03,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float pad=smoothstep(.36,.3,length(p*vec2(1.,1.25)+vec2(0.,.25)));
     float toes=0.;for(int i=0;i<5;i++){float an=-1.05+float(i)*.52;vec2 d=vec2(sin(an),cos(an));float seg=step(dot(p,d),.82)*step(.2,dot(p,d))*smoothstep(.09,.05,abs(d.x*p.y-d.y*p.x));
      float tip=smoothstep(.17,.12,length(p-d*.82));toes=max(toes,max(seg,tip));}
     float m=max(pad,toes);if(m<.03)discard;float er=styErode(styNoise(vUv*.7+.2).r,uP,.1);
     gl_FragColor=vec4(styRamp(.6+.3*pad)*1.15,m*er*uA);}`,{},{mode:'energy'}));m.position.z=dz;m.rotation.y=r;L.decal.add(m);return m;});
  const bleed=S.status(a,'bleed',[caster],0.02,0.8);
  const K=`const float TI=${f(TI)};const vec3 HP=${v3(HP)};const float TX=${f(TX)};`;
  // salpicadura pegajosa al golpear
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.6,0.))*(1.6+1.8*aSeed.z);vec3 p=HP+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,v.y-16.*t);put(p,.17+.07*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:MINT}));
  // la guardia: escamas que suben y se pegan a la funda
  S.pts(L.part,16,VV+`const float TG=${f(TG)};const float TR=${f(TR)};void main(){float s=TG-.12+aSeed.x*.35;float life=.5+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;float rad=1.25-.3*age;vec3 p=vec3(${f(CX)}+cos(an)*rad,.1+age*(.9+.5*aSeed.w),sin(an)*rad);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.7,1.,age);vR=an+1.57;put(p,.2+.07*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:MINT,bias:.08}));
  const tp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    // sacrificio: pulso rojo, se encoge y suelta la cola
    const sac=ss(0,0.12,te)*(1-ss(0.35,0.6,te));
    caster.rotation.z=0.12*ss(0.05,TA,te)-0.2*ss(TA,TA+0.08,te)+0.08*ss(TA+0.1,0.6,te);
    caster.scale.set(1-0.05*sac,1-0.07*sac,1-0.05*sac);
    const g=ss(TG-0.1,TG+0.15,te)*(1-ss(TR,END,te));
    glowOf(caster,sac>0.05?COL.setRGB(0.85,0.1,0.12):U.uC1.value,Math.max(0.5*sac*(0.7+0.3*Math.sin(te*30)),0.28*g));
    const bl=bleed.pose(te);
    // cola: brota retorciéndose, sale disparada, azota al rival y cae al suelo retorciéndose
    const wig=Math.sin(te*26)*0.5;
    if(te<TA){tailW(tail.position);tail.position.x+=0.08*ss(0.1,TA,te);tail.rotation.set(0.3*wig,wig*0.6,0.4+0.2*wig);tail.scale.setScalar(Math.max(1.7*back(ss(0.02,0.25,te)),0.001));}
    else if(te<TI){const u=(te-TA)/(TI-TA);bez3(tail.position,P0,P1,P2,HP,u);bez3(tp,P0,P1,P2,HP,Math.min(u+0.04,1));
      tail.quaternion.setFromUnitVectors(XA,tmp.copy(tail.position).sub(tp).normalize());tail.quaternion.multiply(qb.setFromAxisAngle(YA,0.7*wig));tail.scale.setScalar(1.9);}
    else{const fall=ss(0.05,0.35,ia);tail.position.set(TX-0.75-0.35*fall,1.0*(1-fall)+0.12*fall,0.45*fall);
      tail.rotation.set(0.2*wig*(1-fall),0.9+wig*0.7*Math.exp(-ia*2),-0.9*(1-fall));tail.scale.setScalar(1.9);}
    tail.visible=te>0.02; tailMat.uniforms.uQ.value=-0.1+1.15*ss(TR-0.15,END-0.1,te); tailMat.uniforms.uK.value=0.25*ss(TI-0.15,TI,te)*(1-ss(TI,TI+0.2,te));
    pop.pose(te-TA+0.02,tmp.set(-4.2,0.75,0),0.7);
    spark.pose(ia,HP,1); ring.pose(ia,TX,0,0.42,1);
    set(splat,ia>=0?-0.1+1.15*ss(0.6,1.3,ia):0,ia>=0?1:0); splat.scale.setScalar(0.5+0.5*e3(ia/0.2));
    // guardia
    set(dome,ss(TG-0.1,TG+0.25,te),1); dome.visible=te>TG-0.1&&te<END; dome.material.uniforms.uF.value=hitE(te-TG-0.15,5)+0.12*Math.sin(te*9);
    dome.material.uniforms.uD.value=-0.1+1.15*ss(TR,END,te);
    prints.forEach((m,i)=>{const t0=TG-0.25+i*0.06;set(m,-0.1+1.1*ss(TR,END,te),ss(t0,t0+0.1,te));m.scale.setScalar(0.6+0.4*back(ss(t0,t0+0.18,te)));});
    const hit=hitE(ia,6);
    target.position.x=TX+0.22*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.28*hit*Math.cos(ia*14);
    target.scale.set(1+0.06*hit,1-0.08*hit,1+0.06*hit);
    o.em=0.4*hit; o.emc.copy(U.uC1.value);
    if(te<TA){tailW(o.g);o.gs=0.5;o.ga=0.08+0.1*bl;o.li=1.2;}
    else if(ia<0){o.g.copy(tail.position);o.gs=0.6;o.ga=0.1;o.li=1.5;}
    else{o.g.copy(HP);o.gs=1.2+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.4;o.li=5*Math.exp(-ia*5);}
    o.ia=ia; o.c.copy(HP); o.shake=0.5; o.dist=0.6; o.flash=0.5;
  };
}},ZONES));

VFX.module("Estilizado · Reptil · Cola",defs);
})();

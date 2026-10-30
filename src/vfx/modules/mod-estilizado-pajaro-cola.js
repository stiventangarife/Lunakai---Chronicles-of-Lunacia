// =====================================================================
// ESTILIZADO · PÁJARO · COLA (Hito 101) — las 6 cartas de cola de Pájaro hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_btCloud, sty_btFeatherFan…). Mismos dur / ti / fases que las originales, así el daño
// llega igual. Los efectos nacen de la cola del lanzador (≈ (-4.15,0.7,0)).
// Semántica según PartCards.js (el módulo antiguo era de una versión anterior en Cloud, Granma's Fan y Post Fight):
//   Cloud (daño: nube de tormenta y rayo) · Feather Fan (4 golpes) · Granma's Fan (línea de 3: daño + Frágil)
//   Post Fight (gran daño, el lanzador pierde 30 PV) · The Last One (daño perforante, +35 si es el último en pie)
//   Swallow (daño: golondrina en vuelo rasante y doble tajo)
// Todas son a distancia (2–5 casillas); zoneCaster/zoneTarget pequeños: a 1 casilla no se encogen.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_STORM=pal("Sty Pájaro · Tormenta",["#ff9fdc","#4b4fa6"]);
const P_PEACOCK=pal("Sty Pájaro · Pavo real",["#64e6c8","#1d4fae"]);
const P_GRANMA=pal("Sty Pájaro · Abanico",["#f1c6ff","#8a4fc4"]);
const P_PHOENIX=pal("Sty Pájaro · Fénix",["#ffc247","#cf2a16"]);
const P_LAST=pal("Sty Pájaro · Leyenda",["#ff86cc","#2f74e0"]);
const P_SWALLOW=pal("Sty Pájaro · Golondrina",["#8fdcff","#2a3a8c"]);

const TL0=V3(-0.45,0.7,0);                  // cola, en coordenadas del lanzador
const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7, TILE=1.93;
const ZONES={zoneCaster:0.6,zoneTarget:1.0};
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
function tailW(out){const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),x=TL0.x*caster.scale.x,y=TL0.y*caster.scale.y;
  return out.set(caster.position.x+x*c-y*s,caster.position.y+x*s+y*c,caster.position.z);}
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const groundStrip=(len,w,x,y,mat,seg=48)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,w,seg,1).rotateX(-Math.PI/2),mat);m.position.set(x,y,0);return m;};

// ---------- colores de materia (semánticos, fijos) ----------
const EARTH="vec3(.55,.42,.29)", SOOT="vec3(.2,.16,.14)", CREAM="vec3(.96,.92,.8)", GOLD="vec3(1.,.74,.26)",
  NAVY="vec3(.1,.14,.38)", RUST="vec3(.78,.27,.12)", BLOOD="vec3(.8,.07,.1)";

// ---------- shaders compartidos ----------
// sólido con luz en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo interior
const SOLID=(body,{hot='uC1',rim=.2,er=.05,nzs='vec2(1.7,.9)',side=false}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);${side?'if(!gl_FrontFacing)n=-n;':''}vec3 L=stySunV();
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 float l=styLight(n,L);
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// pluma en partícula (materia): u = cañón → punta; cA → cB a lo largo; vane curvado para la luz
const FEATHER_P=(cA,cB)=>S.PV+`void main(){vec2 q=styPC();float u=q.x;float y=(q.y-.5)*2.;
 float k=clamp((u-.06)/.9,0.,1.);float w=.6*pow(max(sin(3.1416*k),0.),.6)*(1.-.35*k);
 if(u<.04||u>.97||abs(y)>w+.02)discard;float ay=abs(y)/max(w,.05);
 float rach=smoothstep(.09,.03,abs(y));float barb=step(.5,fract(u*9.-ay*1.6));
 vec3 n=normalize(vec3(-.25,y*1.1,1.));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.45+vMix*3.).r*.7+.3*(1.-ay),vK*1.05-.05,.08);if(er*vA<.02)discard;
 vec3 col=mix(${cA},${cB},smoothstep(.25,.95,u));col=mix(col,${CREAM},rach*.55);
 vec3 c=styRampOf(col,clamp(.25+.55*l-.12*barb*ay,0.,1.))*styTint(l);
 gl_FragColor=vec4(c,er*vA*smoothstep(1.02,.9,ay+rach*0.));}`;
// pluma en malla (plano, vUv.x = cañón → punta); cA/cB expresiones GLSL; uQ erosión desde la punta, uK brillo
const FEATHER_M=(cA,cB,{edge='vec3(1.,.95,.98)',hot='uC1'}={})=>`uniform float uQ;uniform float uK;
void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float k=clamp((u-.05)/.93,0.,1.);
 float w=pow(max(sin(3.1416*pow(k,.8)),0.),.55)*(1.-.25*k)*(y>0.?1.:.82);float ay=abs(y)/max(w,.02);
 if(u<.03||abs(y)>w)discard;
 float nz=styNoise(vec2(u*2.,y*.6)+.37).r;if(styErode(nz*.6+u*.4,uQ,.05)<.5)discard;
 float slit=step(.88,fract(u*4.3+ay*1.3+nz*.6))*step(.45,ay);if(slit>.5)discard;
 float rach=smoothstep(.07,.03,abs(y))*step(u,.97);float barb=step(.5,fract(u*13.-ay*2.2));
 vec3 n=normalize(normalize(vN)+vec3(0.,y*.55,0.));if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec3 col=mix(${cA},${cB},smoothstep(.15,.95,u));col=mix(col,${edge},smoothstep(.82,.96,ay)*.6);col=mix(col,${GOLD},rach*.85);
 vec3 c=styRampOf(col,clamp(.24+.55*l-.1*barb*ay,0.,1.))*styTint(l)+${hot}*uK*(.4+.6*(1.-ay));
 gl_FragColor=vec4(c,1.);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// trazo de viento en partícula (energía): raya horizontal con cola fina
const WIND_P=S.PV+`void main(){vec2 q=styPC()-.5;float x=q.x+.5;float w=.07*sin(3.1416*clamp(x,0.,1.))*(.4+.6*x);
 float m=smoothstep(w,w*.3,abs(q.y+.06*sin(x*6.+vMix*6.)));if(m*vA<.02)discard;
 gl_FragColor=vec4(styRamp(.55+.4*x),m*vA*.85);}`;
// corte / media luna del atlas (energía); uEr = erosión, uW = semilla
const SLASH_M=`uniform float uEr;uniform float uW;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.01)discard;
 float er=styErode(m*.5+styNoise(vUv*vec2(1.,.5)+uW).r*.5,uEr,.12);
 gl_FragColor=vec4(styRamp(.5+.5*m)+vec3(1.,.95,.9)*s.g*.5,m*er*uA);}`;
// anillo de pincel en vertical (energía); uEr erosión, giro en el plano por uR
const RINGV=`uniform float uEr;uniform float uR;void main(){vec2 p=vUv-.5;float c=cos(uR),s=sin(uR);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+.5;
 vec4 sh=styShape(7.,p);float er=styErode(sh.r*.55+sh.b*.45,uEr,.12);gl_FragColor=vec4(styRamp(.6+.4*sh.g)*1.2,sh.r*er*uA);}`;
const defs=[];

// =====================================================================
// 1 · CLOUD — la cola exhala vapor que se junta en una nube blanca; la nube vuela en arco hasta encima del rival,
//     se oscurece en nubarrón con relámpagos rosas por dentro y en ti suelta un rayo sobre él; después llueve un
//     momento y la nube se deshace en jirones. ti 0,85 s
// =====================================================================
defs.push({key:"sty_btCloud",name:"Cloud (estilizado)",dur:2.3,ti:0.85,pal:P_STORM,tier:2,stylized:true,...ZONES,
  phases:[["Vapor",0],["Nube",0.25],["Tormenta",0.6],["Rayo",0.85],["Lluvia",1.05],["Disipación",1.8]],
build(a){
  const L=a.L,TV=0.25,TS=0.6,TI=0.85,TR=1.05,TD=1.8,TE=2.3;
  const CP=V3(3.3,3.35,0.05), P0=V3(-4.35,1.25,0), P1=V3(-0.6,4.6,0.25);
  const cloud=new THREE.Group(); L.mesh.add(cloud);
  const cm=S.mat(`uniform float uQ;uniform float uDark;uniform float uK;
   void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec3 q=normalize(vP);
    float nz=styNoise(vec2(atan(q.z,q.x)*.35,q.y*.45+.5)+.11).r;if(styErode(nz*.75+.25*(q.y*.5+.5),uQ,.06)<.5)discard;
    float h=smoothstep(-.7,.6,q.y);
    vec3 base=mix(mix(vec3(.66,.72,.9),vec3(.98,.97,1.),h),mix(vec3(.1,.1,.22),vec3(.28,.3,.46),h),uDark);
    vec3 c=styRampOf(base,clamp(.3+.55*l+(nz-.5)*.12,0.,1.))*styTint(l);
    float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.18*smoothstep(.6,.72,fr)*step(.5,l)*(1.-uDark);
    c+=uC1*uK*(.35+.65*smoothstep(.3,.8,nz))*(1.-h*.5);gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1},uDark:{value:0},uK:{value:0}},{mode:'solid'});
  const sg=new THREE.SphereGeometry(1,22,16), BL=[[0,0,0,.62],[.62,-.08,.12,.48],[-.6,-.1,-.05,.5],[.25,.3,-.1,.46],[-.28,.28,.12,.44],
    [1.05,-.18,-.1,.34],[-1.02,-.2,.1,.36],[.1,-.2,.42,.4],[-.1,-.15,-.42,.4]];
  const blobs=BL.map(([x,y,z,r],i)=>{const m=new THREE.Mesh(sg,cm);m.userData={x,y,z,r,ph:i*1.7};cloud.add(m);return m;});
  const shade=S.contactShadow(L.decal,2.6);
  // rayo: plano en billboard con un camino quebrado por ruido y una rama; uSeed cambia en cada descarga
  const bolt=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.7),S.mat(`uniform float uSeed;void main(){vec2 p=vUv;float y=p.y;
   float env=pow(max(sin(3.1416*clamp(y*1.05,0.,1.)),0.),.4);
   float off=((styNoise(vec2(y*.55+uSeed,uSeed*.7)).r-.5)*.6+(styNoise(vec2(y*2.1,uSeed*1.9+.3)).r-.5)*.25)*env;
   float d=abs(p.x-.5-off);float core=smoothstep(.03,.008,d);float glow=exp(-d*16.)*.6;
   float bm=step(y,.62)*smoothstep(0.,.3,.62-y);float d2=abs(p.x-.5-off-(.62-y)*(.5+.3*sin(uSeed*7.)));float br=smoothstep(.022,.006,d2)*bm;
   float m=core+glow+br*.9;if(m<.02)discard;
   vec3 c=styRamp(.5+.5*(core+br))+vec3(1.,.95,1.)*core*.8;gl_FragColor=vec4(c*1.5,min(m,1.)*uA);}`,{uSeed:{value:0}},{mode:'energy',depthTest:false}));
  bolt.position.set(TX,1.85,0); L.mesh.add(bolt);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.44}), spark2=S.hitSpark(L.mesh,1.1,{seed:0.81});
  const ring=S.groundRing(L.decal,3.0);
  const scorch=groundPlane(1.8,TX,0.026,S.mat(STAIN(SOOT,.5),{},{mode:'matter'})); L.decal.add(scorch);
  const wet=groundPlane(2.6,TX,0.022,S.mat(STAIN('vec3(.32,.4,.6)',.38),{},{mode:'matter'})); L.decal.add(wet);
  const K=`const float TV=${f(TV)};const float TS=${f(TS)};const float TI=${f(TI)};const float TR=${f(TR)};const float TD=${f(TD)};const vec3 CP=${v3(CP)};`;
  // vapor que brota de la cola y se enrosca
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*.22;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*4.;vec3 p=vec3(-4.2,.75,0.)+vec3(-.2*t+cos(an)*.18*t*3.,1.1*t,sin(an)*.18*t*3.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t;put(p,(.32+.14*aSeed.w)*(.6+.8*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'vec3(.9,.92,1.)',bias:.1}));
  // relámpagos internos: chispas rosas en la nube durante la tormenta
  S.pts(L.part,10,VV+K+`void main(){float life=.16;float k=(uT-TS)/life+aSeed.x*4.;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=CP+vec3((r.x-.5)*1.8,-.15+(r.y-.5)*.5,(r.z-.5)*.8);float on=step(TS,uT)*step(uT,TI+.25)*step(.55,r.z);
   vA=on*(1.-age);vK=age;vR=r.y*6.28;put(p,.5+.3*r.x);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // chispas eléctricas en el impacto
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.4,0.))*(2.4+2.*aSeed.z);vec3 p=vec3(${f(TC.x)},1.05,0.)+v*t*(1.-.6*t)+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=aSeed.w*6.28;put(p,.24+.12*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // lluvia
  S.pts(L.part,40,VV+K+`void main(){float life=.32+aSeed.y*.1;float k=(uT-TR+.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(CP.x+(r.x-.5)*1.9,CP.y-.35-age*2.7,(r.z-.5)*1.1);float on=step(TR-.15,uT)*step(uT,TD)*step(1.,k);
   vA=on*step(.05,p.y);vK=0.;vR=3.14159;put(p,.13+.04*r.y);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.5,.62,.92)',bias:.08}));
  // jirones al deshacerse
  S.pts(L.part,14,VV+K+`void main(){float s=TD+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=CP+vec3(cos(an)*(.5+1.3*t),-.1+.4*t,sin(an)*(.35+.8*t));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28;put(p,(.55+.25*aSeed.w)*(.8+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'vec3(.82,.84,.95)',bias:.05}));
  const bu=bolt.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    // trayectoria de la nube: se forma en la cola → arco → encima del rival
    let sc;
    if(te<TV){tailW(tmp);cloud.position.copy(tmp).add(tmp2.set(-0.15,0.55+0.6*te,0));sc=0.15+0.35*e3(te/TV);}
    else if(te<TS){const u=ss(TV,TS,te);qb(P0,P1,CP,u,cloud.position);sc=0.5+0.5*u;}
    else{cloud.position.copy(CP);cloud.position.y+=0.05*Math.sin(te*5);sc=1+0.14*ss(TS,TI,te)-0.08*ss(TI,TI+0.3,te);}
    cloud.position.x+=0; cloud.scale.setScalar(Math.max(sc,0.001));
    blobs.forEach(m=>{const u=m.userData,w=1+0.05*Math.sin(te*4+u.ph);m.position.set(u.x,u.y,u.z);m.scale.setScalar(u.r*w);});
    cloud.visible=te<TE-0.02;
    const dark=ss(TS-0.2,TS+0.12,te)*(1-ss(TD-0.2,TD+0.25,te));
    cm.uniforms.uDark.value=dark; cm.uniforms.uQ.value=-0.1+1.15*ss(TD,TE-0.05,te);
    const fl=(te>TS&&te<TI)?(Math.sin(te*53)>0.55?0.7:0)+(Math.sin(te*31+1)>0.8?0.5:0):0;
    cm.uniforms.uK.value=(0.6*fl+0.7*hitE(ia,9)+0.4*hitE(ia-0.14,12))*(1-ss(TD-0.2,TD,te));
    const s1=ia>=0&&ia<0.09, s2=ia>=0.14&&ia<0.2;
    bolt.visible=s1||s2; bu.uSeed.value=s1?0.37:1.91; bolt.material.uniforms.uA.value=s1?1:0.75;
    towardCam(bolt.position,tmp.set(TX-0.05,2.1,0),0.25); billboard(bolt); bolt.scale.set(1,s1?1+0.08*Math.sin(te*90):0.95,1);
    shade.pose(TX,0,1.1*sc,te>TV?0.5*ss(TV,TS,te)*(1-ss(TD,TE,te)):0);
    spark.pose(ia,TC,1.1); spark2.pose(ia-0.14,TC,0.8);
    ring.pose(ia,TX,0,0.45,1);
    scorch.visible=ia>=0; set(scorch,ia>=0?-0.1+1.15*ss(0.6,1.4,ia):0,1);
    wet.visible=te>TR-0.1; wet.scale.setScalar(0.4+0.6*ss(TR-0.1,TR+0.4,te)); set(wet,-0.1+1.15*ss(TD-0.1,TE,te),1);
    const h=hitE(ia,7), h2=hitE(ia-0.14,10);
    target.position.x=TX+0.1*h; target.position.y=0.04*h; target.rotation.z=-0.12*(h+0.5*h2)*Math.cos(ia*42);
    target.scale.set(1+0.05*h,1-0.06*h,1+0.05*h);
    o.em=0.6*h+0.3*h2; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(cloud.position);o.gs=0.5+0.6*dark;o.ga=0.06+0.18*fl;o.li=0.8+2*fl;}
    else{o.g.copy(TC);o.gs=1.3+3*ia;o.ga=Math.exp(-ia*9)*0.65;o.li=9*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(TC);o.shake=ia>=0?0.6:0;o.dist=0.7;o.flash=0.9;
  };
}});

// =====================================================================
// 2 · FEATHER FAN — plumas de la cola forman un abanico de pavo real con mango dorado; cuatro aletazos lanzan cuatro
//     medias lunas de viento con plumas que golpean al rival; la última, enorme, lo empuja y marca el suelo (nivel 3).
//     ti 2,15 s (golpes en 1,15 · 1,45 · 1,75 · 2,15)
// =====================================================================
defs.push({key:"sty_btFeatherFan",name:"Feather Fan (estilizado)",dur:3.2,ti:2.15,pal:P_PEACOCK,tier:3,stylized:true,...ZONES,
  phases:[["Plumas",0],["Apertura",0.35],["Ráfagas",0.85],["Golpe final",2.15],["Fractura",2.3],["Calma",2.75]],
build(a){
  const L=a.L,TO=0.35,TW=0.85,TE=3.2,NF=11,FP=V3(-4.5,1.15,-0.35),FLEN=2.1,SPREAD=2.5;
  const H=[1.15,1.45,1.75,2.15], F=[0.85,1.15,1.45,1.8], X0=-3.1, XH=2.95, TI=H[3];
  const swing=te=>{let al=0.35*ss(TO,TW-0.1,te)+0.25*ss(TW-0.25,TW-0.02,te)*(te<F[0]?1:0);
    if(te>=F[0]-0.02){al=0.6;for(let i=0;i<4;i++){const d=te-F[i],big=i===3?1.35:1;
      if(d>=-0.02&&d<0.1)al=0.6-(1.05*big)*ss(-0.02,0.08,d);
      else if(d>=0.1&&(i===3||te<F[i+1]-0.02))al=0.6-1.05*big+(1.05*big)*ss(0.1,i===3?0.6:0.28,d);}}
    return al*(1-ss(2.75,3.1,te));};
  // pluma de pavo real: barbas sueltas en peine, ocelo con anillos de colores fijos (oro, turquesa, azul, negro)
  const fanM=S.mat(`uniform float uQ;uniform float uK;void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float ay=abs(y);
   vec2 e=vec2((u-.8)/.17,y/.62);float r=length(e);
   float spread=.12+.8*smoothstep(.08,.72,u);float strand=step(ay,spread)*step(.05,u)*step(fract(ay*6.5+u*1.8),.72)*step(u,.86);
   float rach=step(ay,.06)*step(u,.8);float body=max(max(step(r,1.),strand),rach);if(body<.5)discard;
   float nz=styNoise(vUv*vec2(3.,1.)+.3).r;if(styErode(nz,uQ,.05)<.5)discard;
   vec3 n=normalize(normalize(vN)+vec3(0.,y*.5,0.));if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   vec3 col=mix(vec3(.1,.42,.34),vec3(.32,.74,.46),u);
   col=mix(col,vec3(.95,.74,.24),step(r,1.));col=mix(col,vec3(.06,.66,.62),step(r,.8));
   col=mix(col,vec3(.13,.22,.78),step(r,.55));col=mix(col,vec3(.05,.04,.18),step(r,.28));col=mix(col,${CREAM},rach*.7);
   vec3 c=styRampOf(col,clamp(.26+.52*l+.1*(1.-ay),0.,1.))*styTint(l)+uC1*uK*.5*(1.-step(r,.55));
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const fan=new THREE.Group(), fanG=new THREE.PlaneGeometry(FLEN,0.62).translate(FLEN/2,0,0);
  const fe=[]; for(let i=0;i<NF;i++){const m=new THREE.Mesh(fanG,fanM);m.position.z=i*0.006;fan.add(m);fe.push(m);}
  const goldM=S.mat(SOLID(`base=${GOLD};`,{hot:'vec3(1.,.8,.4)',rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.06,0.85,12).translate(0,-0.42,0),goldM), rivet=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),goldM);
  fan.add(handle,rivet); fan.position.copy(FP); L.mesh.add(fan);
  // medias lunas de viento (energía) que viajan hasta el rival
  const gusts=H.map((t,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.4),S.mat(SLASH_M,{uEr:{value:0},uW:{value:i*0.31}},{mode:'energy',depthTest:false}));L.trail.add(m);return m;});
  const sparks=H.map((t,i)=>S.hitSpark(L.mesh,i===3?2.1:1.2,{seed:0.2+i*0.19}));
  const rings=H.map(()=>S.groundRing(L.decal,3.2));
  const scorch=groundPlane(2.6,TX,0.026,S.mat(STAIN(EARTH,.55),{},{mode:'matter'})); L.decal.add(scorch);
  const K=`const float F0=${f(F[0])};const float F1=${f(F[1])};const float F2=${f(F[2])};const float F3=${f(F[3])};
   const float H0=${f(H[0])};const float H1=${f(H[1])};const float H2=${f(H[2])};const float H3=${f(H[3])};const vec3 FP=${v3(FP)};const vec3 TC=${v3(TC)};
   float fk(float i){return i<.5?F0:(i<1.5?F1:(i<2.5?F2:F3));}float hk(float i){return i<.5?H0:(i<1.5?H1:(i<2.5?H2:H3));}`;
  const PEA=FEATHER_P('vec3(.1,.5,.4)','vec3(.2,.32,.86)');
  // plumas que salen de la cola y suben al eje del abanico
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*.4;float k=clamp((uT-s)/.32,0.,1.);
   vec3 t0=vec3(-4.2,.7,0.);vec3 mid=t0+vec3(-.55,.7,-.2)+rnd()*.3;vec3 p=mix(mix(t0,mid,k),mix(mid,FP+vec3(0.,.4,0.),k),k);
   vA=(uT>s&&k<1.)?1.:0.;vK=0.;vR=aSeed.z*6.2832+k*8.;put(p,.36+.1*aSeed.w);}`,PEA);
  // trazos de viento que viajan con cada media luna
  S.pts(L.part,60,VV+K+`void main(){float i=floor(aSeed.x*3.999);float t0=fk(i),t1=hk(i);float k=(uT-t0)/(t1-t0);float lag=aSeed.y*.3;float kk=clamp(k-lag,0.,1.2);
   float x=${f(X0)}+${f(XH-X0)}*kk;vec3 p=vec3(x-.3*aSeed.z,.25+aSeed.w*2.,(aSeed.z-.5)*1.8*(.4+.6*kk));
   vA=(k>lag&&kk<1.12)?(1.-smoothstep(.85,1.12,kk))*(i>2.5?1.:.75):0.;vK=0.;vR=0.;put(p,.5+.3*aSeed.w);}`,WIND_P,{mode:'energy'});
  // plumas arrancadas en cada golpe; muchas más en el último
  S.pts(L.part,40,VV+K+`void main(){float i=aSeed.x<.45?floor(aSeed.x/.15):3.;float s=hk(i)+fract(aSeed.x*17.)*.04;float life=.9+aSeed.y*.4;float t=uT-s;float c=max(t,0.);
   float big=i>2.5?1.:.6;vec3 v=normalize(rnd()+vec3(.8,.5,0.))*(1.4+3.*aSeed.z)*big;
   vec3 p=TC+v*(1.-exp(-c*3.))/3.+vec3(sin(c*4.+aSeed.w*9.)*.2,-.6*c,cos(c*3.+aSeed.y*9.)*.15);
   vA=(t>0.&&t<life&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,t/life);vR=aSeed.w*6.2832+c*(3.+3.*aSeed.y);put(p,(.3+.1*aSeed.w)*(.7+.5*big));}`,PEA);
  // polvo del golpe final
  S.pts(L.part,16,VV+K+`void main(){float s=H3+aSeed.x*.08;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX)},.2,0.)+vec3(cos(an),0.,sin(an)*.8)*(.4+1.4*(1.-exp(-t*4.)))+vec3(0.,.15+.5*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.5+.25*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI, open=ss(TO-0.1,TW,te), al=swing(te), fade=1-ss(2.8,3.15,te);
    fan.visible=te>0.12&&fade>0.001; fan.rotation.z=al; fan.scale.setScalar(Math.max(ss(0.12,TO+0.1,te)*fade,0.001));
    let last=-1; for(let i=0;i<4;i++)if(te>=H[i])last=i;
    let flap=0; for(let i=0;i<4;i++){const d=te-F[i];if(d>=-0.02&&d<0.2)flap=Math.max(flap,Math.exp(-Math.abs(d-0.04)*12)*(i===3?1.4:1));}
    fe.forEach((m,i)=>{const s=i/(NF-1)-0.5, gr=ss(0.15+i*0.025,0.45+i*0.025,te);
      m.rotation.z=Math.PI/2+s*SPREAD*open+0.06*Math.sin(te*3+i)*open; m.scale.set(Math.max(gr,0.001),Math.max(0.6+0.4*gr,0.001),1);});
    fanM.uniforms.uQ.value=-0.1+1.15*ss(2.8,3.15,te); fanM.uniforms.uK.value=0.5*flap; goldM.uniforms.uQ.value=fanM.uniforms.uQ.value;
    gusts.forEach((m,i)=>{const k=(te-F[i])/(H[i]-F[i]),on=k>=0&&k<1.2;m.visible=on;
      const x=X0+(XH-X0)*Math.min(k,1)+(k>1?0.35*(k-1):0), big=i===3?1.5:1;
      towardCam(m.position,tmp.set(x,1.2,0),0.3); billboard(m,-0.1); m.scale.set(big*(0.75+0.45*Math.min(k,1)),big*(0.8+0.3*Math.min(k,1)),1);
      m.material.uniforms.uA.value=on?ss(0,0.1,k):0; m.material.uniforms.uEr.value=on?-0.1+1.1*ss(0.85,1.2,k):1;});
    H.forEach((t,i)=>{sparks[i].pose(te-t,TC,i===3?1.2:0.75);rings[i].pose(te-t,TX,0,i===3?0.55:0.4,i===3?1.1:0.6);});
    scorch.visible=ia>=0; scorch.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(scorch,ia>=0?-0.1+1.15*ss(0.5,1.0,ia):0,1);
    let push=0; for(let i=0;i<3;i++)if(te>=H[i])push+=0.08*(1-ss(H[3]+0.3,H[3]+0.9,te));
    const hl=last>=0?hitE(te-H[last],last===3?3.2:7):0, kb=last===3?0.7*hl*(1-Math.exp(-ia*18)):0.1*hl;
    target.position.x=TX+push+kb; target.rotation.z=-(last===3?0.42:0.14)*hl*Math.cos((te-(last>=0?H[last]:0))*12);
    o.em=0.4*hl; o.emc.copy(U.uC1.value);
    glowOf(caster,U.uC1.value,0.25*flap); caster.rotation.z=0.05*Math.sin(al*1.2);
    if(last<0){o.g.set(FP.x+0.2,FP.y+1.1,FP.z);o.gs=1.2*open+0.6*flap;o.ga=0.12*open+0.2*flap;o.li=1.5+2.5*flap;o.ia=te-(F[0]>te?TO:F[0]);o.c.set(FP.x,1.5,0);o.shake=0;o.dist=0.25;o.flash=0;}
    else{const il=te-H[last],bg=last===3;o.g.copy(TC);o.gs=(bg?2.2:1.3)+(bg?5:2)*Math.min(il,0.5);o.ga=Math.exp(-il*9)*(bg?0.8:0.4)+0.15*flap;
      o.li=(bg?12:4)*Math.exp(-il*4.5)+2*flap;o.ia=il;o.c.copy(TC);o.shake=bg?1.6:0.6;o.dist=bg?1.2:0.55;o.flash=1;}
  };
}});

// =====================================================================
// 3 · GRANMA'S FAN — un abanico tradicional de plumas blancas con puntas lavanda, mango de bambú y borla roja brota de la
//     cola; con un vaivén suelta una brisa de pétalos que cruza la línea de 3 casillas (el rival y las 2 de detrás);
//     al pasar deja Frágil (esquirlas rosas) y marcas de viento en las baldosas. ti 1,05 s
// =====================================================================
defs.push({key:"sty_btGranmasFan",name:"Granma's Fan (estilizado)",dur:2.2,ti:1.05,pal:P_GRANMA,tier:2,stylized:true,...ZONES,
  phases:[["Abanico",0],["Vaivén",0.4],["Brisa",0.55],["Frágil",1.05],["Remolino",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TO=0.4,TB=0.55,TI=1.05,TE=2.2,GP=V3(-4.25,1.2,0.4),NF=9,FL=0.95,XE=TX+2*TILE;
  const sway=te=>0.32*ss(TO-0.1,TO,te)+0.42*Math.sin((te-TO)*7.5)*ss(TO,TB,te)*(1-ss(1.6,1.95,te));
  const fm=S.mat(`uniform float uQ;void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float k=clamp((u-.1)/.9,0.,1.);
   float w=smoothstep(0.,.3,k)*sqrt(max(1.-k*k,0.));float ay=abs(y)/max(w,.02);if(u<.08||abs(y)>w)discard;
   float nz=styNoise(vUv*vec2(2.,1.)+.6).r;if(styErode(nz,uQ,.05)<.5)discard;
   float rach=smoothstep(.08,.03,abs(y));float barb=step(.5,fract(u*11.-ay*1.8));
   vec3 n=normalize(normalize(vN)+vec3(0.,y*.5,0.));if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   vec3 col=mix(vec3(.97,.95,.93),uC1,smoothstep(.55,1.,u)*.85);col=mix(col,uC2,smoothstep(.85,1.,u)*.5);col=mix(col,vec3(.8,.72,.55),rach*.6);
   vec3 c=styRampOf(col,clamp(.2+.52*l-.08*barb*ay,0.,1.))*styTint(l);gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1}},{mode:'solid',side:THREE.DoubleSide});
  const fan=new THREE.Group(), fg=new THREE.PlaneGeometry(FL,0.38).translate(FL/2,0,0), feats=[];
  for(let i=0;i<NF;i++){const m=new THREE.Mesh(fg,fm);m.position.z=i*0.004;fan.add(m);feats.push(m);}
  const bamM=S.mat(SOLID(`float s=fract(vP.y*5.+.3);float node=smoothstep(.07,0.,s)+smoothstep(.93,1.,s);base=mix(vec3(.62,.66,.28),vec3(.8,.76,.42),.5);lb=-.2*node;`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const bamboo=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.036,0.6,10).translate(0,-0.3,0),bamM);
  const tasM=S.mat(SOLID(`float s=step(.5,fract(atan(vP.z,vP.x)*2.2));base=vec3(.78,.1,.12);lb=-.1*s;`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const tassel=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.24,10).translate(0,-0.12,0),tasM); tassel.position.y=-0.62;
  fan.add(bamboo,tassel); fan.position.copy(GP); L.mesh.add(fan);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.57});
  const rings=[0,1,2].map(()=>S.groundRing(L.decal,2.2));
  // la línea de 3 casillas: franja de viento cepillado en el suelo
  const line=groundStrip(XE-TX+TILE,TILE*0.9,(TX+XE)/2,0.02,S.mat(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   float n=styNoise(vec2(u*2.2-uT*1.6,v*.5)+.2).r;float st=step(.62,fract(v*3.5+n*1.4+u*.3));
   float m=st*smoothstep(1.,.55,abs(v))*smoothstep(0.,.06,u)*smoothstep(1.,.9,u)*step(u,uP);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.5+.4*n),m*uA*.6);}`,{},{mode:'energy'}));
  L.decal.add(line);
  const fragile=S.status(a,'fragile',[target],TI,TE);
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const vec3 GP=${v3(GP)};const float XE=${f(XE)};`;
  // brisa: trazos de viento y pétalos lavanda que cruzan del abanico al final de la línea
  S.pts(L.part,50,VV+K+`void main(){float life=.8+aSeed.y*.3;float k=(uT-TB)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float x=mix(-3.4,XE+.6,age);vec3 p=vec3(x,.25+r.y*1.6+sin(x*1.4+r.z*6.)*.18,(r.x-.5)*1.1+sin(x*.9+r.y*7.)*.15);
   float on=step(1.,k)*step(uT,1.8);vA=on*sin(age*3.14159);vK=0.;vR=0.;put(p,.6+.35*r.z);}`,WIND_P,{mode:'energy'});
  S.pts(L.part,26,VV+K+`void main(){float life=1.+aSeed.y*.3;float k=(uT-TB-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float x=mix(-3.4,XE+.4,age);vec3 p=vec3(x,.35+r.y*1.4+sin(x*1.8+r.z*6.)*.25,(r.x-.5)*1.+sin(x*1.2+r.y*9.)*.2);
   float on=step(1.,k)*step(uT,1.85);vA=on*smoothstep(0.,.08,age)*(1.-smoothstep(.85,1.,age));vK=smoothstep(.7,1.,age);
   vR=r.z*6.2832+age*7.;put(p,.26+.08*r.y);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.82,.66,.98)',bias:.08}));
  // remolino sobre cada casilla de la línea al pasar la brisa
  S.pts(L.part,30,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+i*.08+aSeed.y*.06;float life=.55+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832+t*6.;float rad=.35+.5*age;vec3 p=vec3(${f(TX)}+i*${f(TILE)}+cos(an)*rad,.2+age*1.3,sin(an)*rad*.8);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=an;put(p,.24+.06*aSeed.y);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.95,.72,.9)',bias:.06}));
  a.pose=function(te,o){
    const ia=te-TI, open=ss(0.12,TO,te), out=1-ss(1.85,2.15,te);
    fan.visible=te>0.08&&out>0.001; fan.rotation.z=sway(te); fan.scale.setScalar(Math.max(1.35*ss(0.08,0.3,te)*out,0.001));
    feats.forEach((m,i)=>{const s=i/(NF-1)-0.5;m.rotation.z=Math.PI/2+s*2.6*open;});
    fm.uniforms.uQ.value=-0.1+1.15*ss(1.85,2.15,te); bamM.uniforms.uQ.value=fm.uniforms.uQ.value; tasM.uniforms.uQ.value=fm.uniforms.uQ.value;
    set(line,ss(TI-0.15,TI+0.3,te),0.9*ss(TI-0.15,TI,te)*(1-ss(1.6,2.1,te)));
    spark.pose(ia,TC,0.9);
    rings.forEach((r,i)=>r.pose(ia-i*0.08,TX+i*TILE,0,0.45,0.8));
    const fr=fragile.pose(te);
    const br=ss(TI-0.12,TI+0.1,te)*(1-ss(1.6,2.0,te)), h=hitE(ia,6);
    target.rotation.z=-0.06*br*(0.6+0.4*Math.sin(te*7))-0.12*h*Math.cos(ia*20); target.position.x=TX+0.06*br+0.1*h;
    o.em=0.3*fr+0.3*h; o.emc.setRGB(0.98,0.78,0.86);
    glowOf(caster,U.uC1.value,0.2*ss(TO,TB,te)*(1-ss(TI,TI+0.3,te)));
    if(te<TB){o.g.set(GP.x+0.3,GP.y+0.4,GP.z);o.gs=0.8*open;o.ga=0.12*open;o.li=1.2*open;}
    else if(te<TI){const k=ss(TB,TI,te);o.g.set(-3+6*k,1.1,0.3);o.gs=1.1;o.ga=0.12;o.li=2;}
    else{o.g.copy(TC);o.gs=1.2+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.35;o.li=4*Math.exp(-ia*4);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 4 · POST FIGHT — la cola prende y cinco plumas de fénix se abren detrás del lanzador; salen en ráfaga con estelas de
//     fuego y revientan en el rival (gran golpe); el lanzador paga su precio: grieta roja, esquirlas y latido.
//     Después caen brasas y las plumas se consumen. ti 0,6 s
// =====================================================================
defs.push({key:"sty_btPostFight",name:"Post Fight (estilizado)",dur:2.4,ti:0.6,pal:P_PHOENIX,tier:2,stylized:true,...ZONES,
  phases:[["Ignición",0],["Ráfaga",0.3],["Impacto",0.6],["Precio",0.68],["Brasas",0.95],["Ceniza",1.5],["Fin",2.05]],
build(a){
  const L=a.L,TL=0.3,TI=0.6,TP=0.68,N=5;
  const fM=S.mat(FEATHER_M('vec3(.92,.18,.08)','vec3(1.,.72,.2)',{edge:'vec3(1.,.9,.5)',hot:'vec3(1.,.5,.15)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const fg=new THREE.PlaneGeometry(1.2,0.44).translate(-0.6,0,0);   // la punta en el origen
  const feathers=[];
  for(let i=0;i<N;i++){const m=new THREE.Mesh(fg,fM);L.mesh.add(m);
    const ang=(i-(N-1)/2)*0.5;feathers.push({m,ang,fan:V3(-4.55-0.4*Math.cos(ang),1.35+0.95*Math.cos(ang*0.8),Math.sin(ang)*0.9),
      hit:V3(TC.x-0.15,1.0+0.12*((i*3)%5)/4,(i-2)*0.08),t0:TL+i*0.03,arc:0.5+0.35*Math.sin(i*1.9)});}
  const spark=S.hitSpark(L.mesh,2.1,{seed:0.33}), price=S.hitSpark(L.mesh,0.9,{seed:0.74});
  const ring=S.groundRing(L.decal,3.4), pring=S.groundRing(L.decal,1.8);
  const scorch=groundPlane(2.4,TX,0.026,S.mat(STAIN(SOOT,.6),{},{mode:'matter'})); L.decal.add(scorch);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 TC=${v3(TC)};`;
  // la cola prende
  S.pts(L.part,16,VV+K+`void main(){float life=.24+aSeed.y*.12;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=vec3(-4.2,.7,0.)+vec3((r.x-.5)*.35,age*(.7+.4*r.z),(r.y-.5)*.35);float on=step(1.,k)*(1.-smoothstep(TL+.1,TI,uT));
   vA=on;vK=smoothstep(.3,1.,age);vR=(r.y-.5)*.5;put(p,(.42+.2*r.z)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.4}),{mode:'energy'});
  // estelas de fuego detrás de cada pluma en vuelo
  S.pts(L.part,50,VV+K+`void main(){float i=floor(aSeed.x*5.);float t0=TL+i*.03;float s=t0+fract(aSeed.x*5.)*(TI-t0);
   float life=.18+aSeed.y*.12;float age=(uT-s)/life;float u=clamp((s-t0)/(TI-t0),0.,1.);
   vec3 fan=vec3(-4.55,1.6,(i-2.)*.45);vec3 hit=TC+vec3(-.15,-.1,(i-2.)*.08);vec3 p=mix(fan,hit,u*u)+vec3(0.,sin(u*3.14159)*.7,0.)+rnd()*.1+vec3(0.,.3*max(uT-s,0.),0.);
   vA=(age>0.&&age<1.&&uT>t0)?1.:0.;vK=smoothstep(.2,1.,age);vR=0.;put(p,(.36+.14*aSeed.w)*(1.-age*.5));}`,S.ENERGY_FS(C.flame,{gain:1.35}),{mode:'energy'});
  // impacto: llamarada, ascuas y humo
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(1.8+1.6*aSeed.z);vec3 p=TC+v*t*(1.-.9*t)+vec3(0.,.8*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.6+.3*aSeed.w)*(1.-age*.3));}`,S.ENERGY_FS(C.flame,{gain:1.4}),{mode:'energy'});
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.1,.6,0.))*(2.2+2.2*aSeed.z);vec3 p=TC+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.95,.45,.1)'}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.06+aSeed.x*.15;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TC+vec3(cos(an)*(.2+.5*t),-.2+t*(.8+.4*aSeed.w),sin(an)*(.2+.4*t));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.5+.2*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:SOOT,bias:.1}));
  // el precio: esquirlas rojas que saltan del pecho del lanzador
  S.pts(L.part,12,VV+K+`void main(){float s=TP+aSeed.x*.04;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.7,0.))*(1.4+1.4*aSeed.z);vec3 p=vec3(-3.6,1.1,.1)+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.18+.07*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BLOOD}));
  // brasas que caen meciéndose
  S.pts(L.part,26,VV+K+`void main(){float s=.95+aSeed.x*.5;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(TX)}+(aSeed.z-.5)*2.,2.4-t*1.6,(aSeed.w-.5)*1.4)+vec3(sin(t*5.+aSeed.y*9.)*.25,0.,cos(t*4.+aSeed.z*9.)*.15);
   vA=(age>0.&&age<1.&&p.y>.03)?sin(age*3.14159):0.;vK=smoothstep(.5,1.,age);vR=t*3.;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, ip=te-TP;
    feathers.forEach((d,i)=>{const m=d.m, rise=ss(0.02+i*0.03,0.22+i*0.02,te), ti=TI;
      if(te<d.t0){tailW(tmp);m.position.copy(tmp).lerp(d.fan,e3(rise));tmp2.set(TX,1.0,0).sub(m.position).lerp(tmp3.set(0,1,0),0.6*(1-rise));
        m.rotation.set(0,0,Math.atan2(tmp2.y,tmp2.x));m.scale.setScalar(Math.max(1.5*(0.3+0.7*rise),0.001));}
      else if(te<ti){const u=(te-d.t0)/(ti-d.t0),uu=u*u;m.position.lerpVectors(d.fan,d.hit,uu);m.position.y+=Math.sin(u*Math.PI)*d.arc;
        const u2=Math.min(u+0.04,1);tmp2.lerpVectors(d.fan,d.hit,u2*u2);tmp2.y+=Math.sin(u2*Math.PI)*d.arc;tmp2.sub(m.position);
        m.rotation.set(0,0,Math.atan2(tmp2.y,tmp2.x));m.scale.setScalar(1.5);}
      m.visible=rise>0.001&&te<ti;});
    fM.uniforms.uK.value=0.4+0.5*ss(TL-0.1,TI,te);
    spark.pose(ia,TC,1.25); ring.pose(ia,TX,0,0.5,1.1);
    price.pose(ip,tmp.set(-3.6,1.15,0.1),0.85); pring.pose(ip,CX,0,0.4,0.8);
    scorch.visible=ia>=0; scorch.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(scorch,ia>=0?-0.1+1.15*ss(0.9,1.7,ia):0,1);
    const h=hitE(ia,5);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.26*h*Math.cos(ia*13); target.scale.set(1+0.06*h,1-0.08*h,1+0.06*h);
    o.em=0.6*h; o.emc.copy(U.uC1.value);
    // el precio: latido rojo y encogimiento del lanzador
    const hp=hitE(ip,6); glowOf(caster,COL.setRGB(0.9,0.06,0.08),0.7*hp+0.35*ss(0,TL,te)*(1-ss(TL,TI,te)));
    caster.scale.set(1-0.05*hp,1-0.07*hp,1-0.05*hp); caster.rotation.z=0.12*hp*Math.sin(ip*30);
    if(ia<0){tailW(o.g);o.g.y+=0.5;o.gs=0.7+0.5*ss(0,TL,te);o.ga=0.2;o.li=2*ss(0,TL,te);}
    else{o.g.copy(TC);o.gs=1.6+4*ia;o.ga=Math.exp(-ia*8)*0.7;o.li=10*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=ia>=0?1:0;o.dist=1;o.flash=0.8;
  };
}});

// =====================================================================
// 5 · THE LAST ONE (Early Bird) — una pluma legendaria rosa con cañón dorado y punta celeste surge de la cola y se alza
//     sobre el lanzador; dos anillos de viento se cierran sobre ella (tensión) con un sello en el suelo; sale disparada
//     con estela neón, perfora al rival de lado a lado (chispa de entrada, rociada de salida) y deja plumas flotando.
//     ti 0,85 s
// =====================================================================
defs.push({key:"sty_btTheLastOne",name:"The Last One (estilizado)",dur:2.0,ti:0.85,pal:P_LAST,tier:2,stylized:true,...ZONES,
  phases:[["Pluma legendaria",0],["Tensión",0.35],["Disparo",0.55],["Perforación",0.85],["Plumas flotantes",1.0],["Fin",1.6]],
build(a){
  const L=a.L,TR=0.35,TLn=0.55,TI=0.85,TXo=1.05,AIM=V3(-3.75,1.75,0.15),PB=V3(-4.3,1.55,0.15),XE=7.2,FS=1.75;
  const lx=te=>PB.x+(TC.x-PB.x)*(te-TLn)/(TI-TLn);
  const fpos=(te,o)=>{if(te<TR)return qb(V3(-4.2,0.75,0),tmp2.set(-4.7,1.6,0.1),AIM,ss(0,TR,te),o);
    if(te<TLn)return o.lerpVectors(AIM,PB,ss(TR,TLn,te));
    const x=Math.min(lx(te),XE),k=cl((x-PB.x)/(TC.x-PB.x));return o.set(x,PB.y+(TC.y-PB.y)*k,PB.z*(1-k));};
  const AF=Math.atan2(TC.y-PB.y,TC.x-PB.x);
  const fang=te=>te<TR?1.4-(1.4-AF)*ss(0,TR,te)+0.35*Math.sin(te*12)*(1-ss(0,TR,te)):AF;
  // pluma: grupo con la punta en el origen; dos planos cruzados para que se lea desde cualquier cámara
  const fM=S.mat(FEATHER_M('vec3(1.,.42,.74)','vec3(.36,.72,1.)',{edge:'vec3(1.,.92,.98)',hot:'vec3(1.,.55,.85)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const fg=new THREE.PlaneGeometry(FS,0.5).translate(-FS/2,0,0);
  const fea=new THREE.Group(); const f1=new THREE.Mesh(fg,fM), f2=new THREE.Mesh(fg,fM); f2.rotation.x=Math.PI/2; f2.scale.y=0.55;
  fea.add(f1,f2); L.mesh.add(fea);
  // halo suave detrás de la pluma (energía)
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.0),S.mat(`void main(){vec2 p=(vUv-.5)*vec2(2.,1.);float d=length(p*vec2(.7,1.9));
   float n=styNoise(vUv*vec2(1.5,.8)-vec2(uT*1.2,0.)).r;float m=smoothstep(1.,.3,d)*(.4+.4*n);if(m<.02)discard;gl_FragColor=vec4(styRamp(.55+.3*n),m*uA*.6);}`,{},{mode:'energy',depthTest:false}));
  L.mesh.add(halo);
  const rings=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(RINGV,{uEr:{value:0},uR:{value:0}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const seal=S.groundRing(L.decal,2.4);
  // estela neón: núcleo claro, cuerpo rosa, bordes celestes; dos planos cruzados
  const trM=S.mat(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=styNoise(vec2(u*3.-uT*6.,vUv.y*.5)).r;
   float core=step(v,.1+.05*n);float body=step(v,.5+.2*n)*(1.-core);float rim=step(v,.85*n+.1)*(1.-step(v,.55+.2*n));
   vec3 c=core*vec3(1.,.85,.95)*1.2+body*uC1*1.1+rim*uC2*1.3;float m=(core+body*.85+rim*.6)*pow(u,.7);if(m<.02)discard;
   gl_FragColor=vec4(c,m*uA);}`,{},{mode:'energy'});
  const trG=new THREE.PlaneGeometry(1,0.34).translate(-0.5,0,0), trail=new THREE.Group(), t2=new THREE.Mesh(trG,trM); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(trG,trM),t2); L.trail.add(trail);
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.12}), exit=S.hitSpark(L.mesh,1.4,{seed:0.66});
  const shock=S.groundRing(L.decal,3.0);
  // surco neón en el suelo bajo la trayectoria
  const line=groundStrip(1,0.5,0,0.02,S.mat(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=styNoise(vec2(u*4.,v*.4)+.5).r;
   float m=step(v,.25+.35*n)*step(u,uP);if(m<.02)discard;float er=styErode(n,1.-uA,.1);gl_FragColor=vec4(styRamp(.5+.45*(1.-v)),m*er*.85);}`,{},{mode:'energy'}));
  line.position.x=(PB.x+XE)/2; line.scale.set(XE-PB.x,1,1); L.decal.add(line);
  const K=`const float TLn=${f(TLn)};const float TI=${f(TI)};const vec3 PB=${v3(PB)};const vec3 TC=${v3(TC)};const vec3 AIM=${v3(AIM)};
   vec3 lp(float t){float k=clamp((t-TLn)/(TI-TLn),0.,1.4);float x=PB.x+(TC.x-PB.x)*k;float kk=clamp(k,0.,1.);return vec3(x,PB.y+(TC.y-PB.y)*kk,PB.z*(1.-kk));}`;
  // carga: motas celestes que giran y se cierran sobre la pluma
  S.pts(L.part,18,VV+K+`void main(){float s=.08+aSeed.x*.4;float age=(uT-s)/.25;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*6.;float rad=mix(1.,.1,k*k);vec3 p=AIM+vec3((aSeed.y-.5)*.8,cos(an)*rad,sin(an)*rad);
   vA=(age>0.&&age<1.)?1.:0.;vK=0.;vR=an;put(p,.22+.1*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // vuelo: rayas de velocidad alrededor de la trayectoria
  S.pts(L.part,30,VV+K+`void main(){float s=TLn+aSeed.x*(TI-TLn+.15);float life=.25+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=lp(s)+vec3(-.3*age,cos(an)*(.3+.2*aSeed.w),sin(an)*(.3+.2*aSeed.w));
   vA=(age>0.&&age<1.)?(1.-age)*.6:0.;vK=0.;vR=0.;put(p,.35+.2*aSeed.w);}`,WIND_P,{mode:'energy'});
  // perforación: rociada de chispas hacia +x por detrás del rival
  S.pts(L.part,20,VV+K+`void main(){float s=TI+.02+aSeed.x*.04;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()*vec3(.5,1.,1.)+vec3(1.6,.15,0.))*(3.+3.*aSeed.z);vec3 p=TC+vec3(.45,0.,0.)+v*t*(1.-.5*t)+vec3(0.,-2.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=aSeed.w*6.28;put(p,.28+.12*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.45}),{mode:'energy'});
  // plumas flotantes (rosas y celestes) alrededor del rival
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.15;float life=1.+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.6,.5,0.))*(.8+1.4*aSeed.z);vec3 p=TC+vec3(.3,0.,0.)+v*(1.-exp(-c*3.))/3.*1.5+vec3(sin(c*3.+aSeed.w*9.)*.2,-.35*c,cos(c*2.5+aSeed.y*9.)*.15);
   vA=(t>0.&&t<life&&p.y>.03)?1.:0.;vK=smoothstep(.65,1.,t/life);vR=aSeed.w*6.2832+c*(1.5+2.*aSeed.y);put(p,.36+.12*aSeed.w);}`,
   FEATHER_P('mix(vec3(1.,.45,.75),vec3(.4,.72,1.),step(.5,vMix))','mix(vec3(1.,.7,.88),vec3(.7,.88,1.),step(.5,vMix))'));
  const fp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.02,0.2,te), fly=te>=TLn&&te<TXo, ang=fang(te), ten=ss(TR,TLn,te);
    fpos(te,fp);
    fea.visible=te<TXo&&form>0.001; fea.position.copy(fp); fea.rotation.set(0,0,ang); fea.scale.setScalar(Math.max(form,0.001)*(1+0.12*ten));
    fM.uniforms.uK.value=0.25+0.5*ten+(fly?0.3:0); fM.uniforms.uQ.value=-0.1+1.15*ss(TXo-0.14,TXo,te);
    halo.visible=te<TXo; towardCam(halo.position,fp,0.05); billboard(halo,ang); halo.position.addScaledVector(tmp.set(-Math.cos(ang),-Math.sin(ang),0),0.5);
    set(halo,0,form*(0.5+0.6*ten)*(fly?0.2:1));
    rings.forEach((m,i)=>{const k=cl((te-0.12-i*0.12)/(TLn-0.12-i*0.12));towardCam(m.position,AIM,0.2);billboard(m);m.visible=k>0&&k<1;
      m.scale.setScalar(Math.max(1.3-0.9*k*k,0.001));m.material.uniforms.uA.value=Math.sin(Math.PI*k);m.material.uniforms.uEr.value=-0.1+0.6*k;m.material.uniforms.uR.value=te*(i?-9:9);});
    seal.pose(te-0.15,CX,0,TLn-0.05,0.9);
    const len=fly?Math.max(Math.min(fp.x-PB.x-FS*0.8,5.5),0):0;
    trail.visible=fly||(te>=TXo&&te<1.35); trail.position.copy(fly?fp:tmp2.set(Math.min(lx(TXo),XE),TC.y,0)).addScaledVector(tmp3.set(Math.cos(AF),Math.sin(AF),0),fly?-FS*0.8:0); trail.rotation.z=AF;
    trail.scale.set(Math.max(fly?len:5.5*(1-ss(TXo,1.35,te)),0.001),1,1); trM.uniforms.uA.value=fly?ss(TLn,TLn+0.05,te):1-ss(TXo,1.35,te);
    spark.pose(ia,TC,1.15); exit.pose(ia-0.05,tmp.set(TC.x+0.7,TC.y,0),0.9); shock.pose(ia,TX,0,0.5,1);
    set(line,cl((Math.min(fp.x,XE)-PB.x)/(XE-PB.x)),te>=TLn?1-ss(1.15,1.7,te):0);
    const hit=hitE(ia,5); target.position.x=TX+0.22*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.2*hit*Math.cos(ia*13);
    target.scale.set(1-0.06*hit,1+0.04*hit,1);
    o.em=0.5*hit; o.emc.copy(U.uC1.value);
    glowOf(caster,U.uC1.value,0.35*ten*(1-ss(TLn,TLn+0.2,te)));
    if(te<TLn){o.g.copy(fp);o.gs=0.8+0.6*ten;o.ga=0.15*form+0.2*ten;o.li=1.5+2.5*ten;}
    else if(te<TI){o.g.copy(fp);o.gs=1.4;o.ga=0.45;o.li=4;}
    else{o.g.copy(TC);o.gs=1.4+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=ia>=0?0.5:0;o.dist=0.75;o.flash=0.7;
  };
}});

// =====================================================================
// 6 · SWALLOW — una golondrina (dorso azul noche, vientre crema, garganta rojiza) sale de la cola, vuela a ras de
//     suelo levantando polvo, abre al rival con un doble tajo de alas, remonta en un rizo y vuelve a la cola.
//     ti 0,9 s
// =====================================================================
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdTap(vec2 p,vec2 a,vec2 b,float r0,float r1){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(r0,r1,h);}
float sdEl(vec2 p,vec2 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-4);}
float sdTri(vec2 p,vec2 p0,vec2 p1,vec2 p2){vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2;vec2 v0=p-p0,v1=p-p1,v2=p-p2;
 vec2 q0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);vec2 q1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);vec2 q2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
 float s=sign(e0.x*e2.y-e0.y*e2.x);
 vec2 d=min(min(vec2(dot(q0,q0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(q1,q1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(q2,q2),s*(v2.x*e2.y-v2.y*e2.x)));
 return -sqrt(d.x)*sign(d.y);}`;
const BIRD=B=>({eye:`vec2(${f(B.hx+B.hr*.4)},${f(B.hy+B.hr*.28)})`,
 sd:SDF2+`float sdBird(vec2 p,float fl,float fo){
 vec2 q=vec2(p.x,p.y-p.x*.18);float d=sdEl(q-vec2(-.03,0.),vec2(${f(B.bl)},${f(B.bt)}));
 vec2 H=vec2(${f(B.hx)},${f(B.hy)});d=smin(d,length(p-H)-${f(B.hr)},.1);
 vec2 K0=H+vec2(${f(B.hr*.6)},0.);d=min(d,sdTap(p,K0,K0+vec2(${f(B.hr*.4+B.bk)},${f(-B.bk*.2)}),${f(B.bkw)},.004));
 vec2 T=vec2(${f(-B.bl*.8)},${f(-B.bl*.8*.18)});
 d=smin(d,sdTap(p,T,T+vec2(${f(-B.tl)},${f(B.ts)}),${f(B.tw)},${f(B.tw*B.tf)}),.05);
 d=smin(d,sdTap(p,T,T+vec2(${f(-B.tl*(1+B.fork))},${f(-B.ts-B.fork*.14)}),${f(B.tw)},${f(B.tw*B.tf)}),.05);
 float a=fl*${f(B.amp)}*(1.-fo);vec2 S=vec2(${f(B.wx)},${f(B.wy)});
 vec2 dir=normalize(vec2(-.5-.7*fo,sin(a)*1.3+.04));float wl=${f(B.wl)}*(1.-.2*fo);vec2 W=S+dir*wl;
 vec2 nr=vec2(-dir.y,dir.x);nr*=nr.x>0.?-1.:1.;
 float wg=sdTri(p,S+vec2(${f(B.ww*.7)},.02),W,S+vec2(${f(-B.ww*1.1)},-.02))-.02;
 for(int i=0;i<3;i++){float fi=float(i);wg=min(wg,sdTap(p,W-dir*.2+nr*fi*.05,W+dir*(.08-fi*.04)+nr*fi*.08,.03,.006));}
 return smin(d,wg,.04);}`});
const SW=BIRD({bl:.32,bt:.1,hx:.36,hy:.08,hr:.1,bk:.07,bkw:.03,tl:.5,ts:.1,tw:.045,tf:.2,fork:.55,wx:.04,wy:.06,wl:1.05,ww:.17,amp:.9});
defs.push({key:"sty_btSwallow",name:"Swallow (estilizado)",dur:2.2,ti:0.9,pal:P_SWALLOW,tier:2,stylized:true,...ZONES,
  phases:[["Salida",0],["Vuelo rasante",0.15],["Corte",0.9],["Rizo",1.0],["Regreso",1.4],["Posarse",1.8],["Fin",2.05]],
build(a){
  const L=a.L,T1=0.15,T2=0.78,TI=0.9,T4=1.4,TB=1.8,YL=0.4,P2=V3(2.4,YL,0),HP=V3(3.2,1.2,0),AP=V3(1.6,3.3,0.3),CB=V3(-4.1,0.85,0);
  const zw=x=>0.25*Math.sin(x*1.3);
  const spos=(te,o)=>{
    if(te<T1)return qb(V3(-4.2,0.75,0),tmp2.set(-4.0,1.35,0),tmp.set(-3.3,0.55,zw(-3.3)),ss(0,T1,te),o);
    if(te<T2){const k=(te-T1)/(T2-T1),x=-3.3+(P2.x+3.3)*k;return o.set(x,YL+(0.55-YL)*(1-ss(0,0.25,k))+0.05*Math.sin(x*3),zw(x));}
    if(te<TI)return qb(tmp2.set(P2.x,YL,zw(P2.x)),tmp.set(3.0,0.4,0),HP,(te-T2)/(TI-T2),o);
    if(te<T4)return qb(HP,tmp2.set(4.8,3.6,0),AP,ss(TI,T4,te),o);
    return qb(AP,tmp2.set(-1.5,3.0,0.3),CB,ss(T4,TB,te),o);};
  const vel=(te,out)=>{spos(te+0.01,out);spos(te-0.01,tmp3);return out.sub(tmp3);};
  // golondrina: SDF de perfil; el relieve sale del propio campo de distancia (luz en bandas)
  const bird=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2),S.mat(SW.sd+`uniform float uQ;uniform float uF;uniform float uDis;
   void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float d=sdBird(p,uQ,uF);if(d>.004)discard;
    float e=.012;float gx=sdBird(p+vec2(e,0.),uQ,uF)-sdBird(p-vec2(e,0.),uQ,uF);float gy=sdBird(p+vec2(0.,e),uQ,uF)-sdBird(p-vec2(0.,e),uQ,uF);
    float h=clamp(-d*9.,0.,1.);vec3 n=normalize(vec3(gx,gy,0.)/(2.*e)*(1.-h)+vec3(0.,0.,.6+h));
    float l=styLight(n,stySunV());
    float belly=smoothstep(.02,-.04,p.y+.03-p.x*.12)*step(-.3,p.x)*step(p.x,.45);
    float throat=step(length(p-vec2(.41,-.01)),.075);float eye=step(length(p-${SW.eye}),.022);
    vec3 col=mix(${NAVY},vec3(.14,.24,.62),smoothstep(-.3,.3,p.y));col=mix(col,${CREAM},belly*.9);col=mix(col,${RUST},throat);
    vec3 c=styRampOf(col,clamp(.25+.55*l,0.,1.))*styTint(l);c=mix(c,vec3(.02,.02,.05),eye);
    float fr=smoothstep(-.03,0.,d);c+=uC1*fr*.6*step(.5,l);
    float er=styErode(styNoise(p*.6+.2).r,uDis,.06);if(er<.5)discard;gl_FragColor=vec4(c,1.);}`,{uQ:{value:0},uF:{value:0},uDis:{value:-1}},{mode:'matter'}));
  L.mesh.add(bird);
  // doble tajo de alas
  const cuts=[0.55,-0.45].map((r,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.3),S.mat(SLASH_M,{uEr:{value:0},uW:{value:0.2+i*0.5}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.29}), home=S.hitSpark(L.mesh,0.8,{seed:0.9});
  const shock=S.groundRing(L.decal,2.8);
  // estela: cinta que corta el aire detrás de la golondrina
  const trM=S.mat(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=styNoise(vec2(u*3.-uT*5.,v*.4)).r;
   float core=step(v,.25);float body=step(v,.4+.4*n)*(1.-core);float m=(core+body*.6)*pow(u,1.4);if(m<.02)discard;
   gl_FragColor=vec4(core*vec3(.92,.97,1.)*1.2+body*styRamp(.6+.3*n),m*uA);}`,{},{mode:'energy'});
  const trG=new THREE.PlaneGeometry(1,0.18).translate(-0.5,0,0), trail=new THREE.Group(), t2=new THREE.Mesh(trG,trM); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(trG,trM),t2); L.trail.add(trail);
  // surco de viento en el suelo bajo el vuelo rasante
  const wake=groundStrip(1,0.7,0,0.02,S.mat(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;float n=styNoise(vec2(u*5.-uT*2.,v*.5)+.4).r;
   float m=step(abs(v),.2+.5*n)*step(u,uP)*smoothstep(0.,.05,u);float age=clamp(uP-u,0.,1.);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.45+.45*exp(-age*5.)),m*exp(-age*2.2)*uA*.75);}`,{},{mode:'energy'}));
  wake.position.x=(-3.3+P2.x)/2; wake.scale.set(P2.x+3.3,1,1); L.decal.add(wake);
  const K=`const float T1=${f(T1)};const float T2=${f(T2)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 HP=${v3(HP)};const vec3 CB=${v3(CB)};`+QB+`
   vec3 low(float t){float k=clamp((t-T1)/(T2-T1),0.,1.);float x=-3.3+${f(P2.x+3.3)}*k;return vec3(x,${f(YL)},.25*sin(x*1.3));}`;
  // polvo levantado a ras de suelo
  S.pts(L.part,24,VV+K+`void main(){float s=T1+.05+aSeed.x*(T2-T1);float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=low(s);float side=aSeed.z<.5?1.:-1.;vec3 p=vec3(b.x-.1,.1,b.z)+vec3(-.25*t,.3*(1.-exp(-t*4.)),side*(.2+.5*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.32+.18*aSeed.w)*(.6+.7*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.02}));
  // rayas de aire desde las puntas de las alas
  S.pts(L.part,26,VV+K+`void main(){float s=T1+aSeed.x*(TI-T1);float life=.25+aSeed.y*.2;float age=(uT-s)/life;
   float side=aSeed.z<.5?1.:-1.;vec3 p=low(s)+vec3(-.4*age,.25+.15*side,.35*side);
   vA=(age>0.&&age<1.&&s<T2)?1.-age:0.;vK=0.;vR=0.;put(p,.55+.25*aSeed.w);}`,WIND_P,{mode:'energy'});
  // plumas cortadas en el tajo (azul noche y celeste)
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.4,.5,0.))*(1.+1.6*aSeed.z);vec3 p=HP+v*(1.-exp(-c*3.))/3.+vec3(sin(c*4.+aSeed.w*9.)*.12,-.6*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,t/life);vR=aSeed.w*6.2832+c*3.;put(p,.3+.1*aSeed.w);}`,FEATHER_P(NAVY,'vec3(.5,.8,1.)'));
  const bp=V3(0,0,0), bv=V3(0,0,0), bu=bird.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, form=ss(0.0,0.08,te);
    spos(te,bp); vel(te,bv);
    bird.visible=te<TB+0.02; towardCam(bird.position,bp,0.05);
    const sx=bv.x>=0?1:-1, A=Math.atan2(bv.y,Math.abs(bv.x)+0.4*Math.abs(bv.z)+1e-4), sc=1.6*Math.max(form,0.001)*(te>TB-0.12?1-0.7*ss(TB-0.12,TB,te):1);
    billboard(bird,sx*A); bird.scale.set(sx*sc,sc,1);
    const low=te>=T1&&te<TI;
    bu.uQ.value=low?0.25*Math.sin(te*34):Math.sin(te*22); bu.uF.value=low?0.35:0; bu.uDis.value=-0.1+1.1*ss(TB-0.1,TB+0.02,te);
    const fly=te<TB, len=Math.min(bv.length()*6,1.5);
    trail.visible=fly; trail.position.copy(bp); trail.rotation.z=Math.atan2(bv.y,bv.x); trail.scale.set(Math.max(len,0.001),1,1); trM.uniforms.uA.value=form*(1-ss(TB-0.15,TB,te));
    cuts.forEach((m,i)=>{const it=ia-i*0.07;m.visible=it>=0&&it<0.42;towardCam(m.position,HP,0.55+i*0.02);billboard(m,i?-0.45:0.55);
      const g=e3(it/0.08);m.scale.set(Math.max(0.6+0.55*g,0.001),Math.max(0.7+0.4*g,0.001),1);m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*ss(0.08,0.42,it);});
    spark.pose(ia,HP,0.95); home.pose(ib,tmp.set(CB.x,CB.y+0.2,0),0.8); shock.pose(ia,TX,0,0.45,0.9);
    set(wake,cl((bp.x+3.3)/(P2.x+3.3)),te>=T1?0.9*(1-ss(1.3,1.8,te)):0);
    const hit=hitE(ia,6); target.position.x=TX+0.16*hit; target.rotation.z=0.22*hit*Math.cos(ia*14); target.position.y=0.05*hit;
    o.em=0.4*hit; o.emc.copy(U.uC1.value);
    const lv=ib>=0?ss(0,0.1,ib)*(1-ss(0.25,0.4,ib)):0; glowOf(caster,U.uC1.value,0.4*lv);
    caster.rotation.z=0.06*ss(0,0.1,te)*(1-ss(0.1,0.3,te))+(ib>=0?0.05*Math.exp(-ib*6)*Math.sin(ib*20):0);
    if(te<TI){o.g.copy(bp);o.gs=0.7;o.ga=0.12*form;o.li=1.5;}
    else if(te<TB){o.g.copy(ia<0.4?HP:bp);o.gs=ia<0.4?1.2+2.5*ia:0.7;o.ga=ia<0.4?Math.exp(-ia*10)*0.55:0.12;o.li=ia<0.4?6*Math.exp(-ia*5):1.5;}
    else{o.g.copy(CB);o.gs=1;o.ga=0.25*lv;o.li=2*lv;}
    o.ia=te<TB?ia:ib;o.c.copy(te<TB?HP:CB);o.shake=0;o.dist=te<TB?0.6:0.2;o.flash=te<TB?0.8:0;
  };
}});

VFX.module("Estilizado · Pájaro · Cola",defs);
})();

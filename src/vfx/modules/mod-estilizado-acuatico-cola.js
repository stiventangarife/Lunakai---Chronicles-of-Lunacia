// =====================================================================
// ESTILIZADO · ACUÁTICO · COLA (Hito 101) — las 7 cartas de cola de Acuático hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_qtKoi, sty_qtNavaga…). Mismos dur / ti / fases que las originales, así el daño llega igual.
// Identidad: agua turquesa saturada (no espuma blanca), burbujas de borde de color, peces como siluetas pintadas con luz en
// bandas y contorno oscuro (sin caras ni ojos de dibujo). Los efectos nacen de la cola del lanzador (≈ (-4.15,0.7,0)).
// Semántica según PartCards.js:
//   Koi (daño fuerte) · Navaga (daño) · Nimo (sobre sí: cura 15 y +1 PA a todo el equipo) · Puff (X PA: un golpe por PA)
//   Ranchu (sobre sí: daño y Débil a todos los enemigos) · Shrimp (daño a 2–5 casillas) · Tadpole (daño + Gafe)
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_KOI=pal("Sty Acuático · Koi",["#8ff0e4","#0f8a99"]);
const P_NAVAGA=pal("Sty Acuático · Navaga",["#7fd6ff","#1d4fae"]);
const P_NIMO=pal("Sty Acuático · Nimo",["#9ef5d2","#129a86"]);
const P_PUFF=pal("Sty Acuático · Puff",["#9ce8ff","#1b7fb8"]);
const P_RANCHU=pal("Sty Acuático · Ranchu",["#b3c6ff","#3a50c4"]);
const P_SHRIMP=pal("Sty Acuático · Shrimp",["#9ff0ff","#1490b8"]);
const P_TADPOLE=pal("Sty Acuático · Tadpole",["#a6f2d8","#1f8a78"]);

// colores fijos (sRGB → lineal: THREE.Color convierte el hexadecimal)
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const WATER=lin('#14a3b8'), WDEEP=lin('#0b5c80'), WLIGHT=lin('#6fd9e0'), INK=lin('#0b1c26'),
  KOIOR=lin('#ec5a14'), CREAM=lin('#f2e6cf'), RED=lin('#d8321e'), CORAL=lin('#f07a5c'), GOLD=lin('#ffbe3a'),
  INDIGO=lin('#26306e'), MINT=lin('#58e0a8'), VIOLET=lin('#8a5ad8'), OLIVE=lin('#2c4a3e'), CLOWN=lin('#f26a12');

const TP0=V3(-0.45,0.7,0);                   // cola, en coordenadas del lanzador
const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7;    // objetivo (base x, pecho visible) y lanzador
const ZONES={zoneCaster:0.6,zoneTarget:1.1};
const tmp=V3(0,0,0), tmp2=V3(0,0,0), COL=new THREE.Color(), XA=V3(1,0,0), YA=V3(0,1,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
function tailW(out){const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),x=TP0.x*caster.scale.x,y=TP0.y*caster.scale.y;
  return out.set(caster.position.x+x*c-y*s,caster.position.y+x*s+y*c,caster.position.z);}
const bez2=(out,a,b,c,t)=>{const s=1-t;return out.set(s*s*a.x+2*s*t*b.x+t*t*c.x,s*s*a.y+2*s*t*b.y+t*t*c.y,s*s*a.z+2*s*t*b.z+t*t*c.z);};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};

// ---------- GLSL compartido ----------
const SDF=`mat2 r2(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdE(vec2 p,vec2 c,vec2 r,float a){p=r2(a)*(p-c);return (length(p/r)-1.)*min(r.x,r.y);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdSeg(vec2 p,vec2 a,vec2 b,float r){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
`;
// silueta pintada en un plano (billboard): sd(p) define la forma en unidades del plano (W×H); body fija base/lb;
// relieve falso desde el gradiente del SDF → luz del sol en 3 bandas; contorno oscuro; uQ erosión; uK brillo; uWig animación
const SIL=(sd,body,{W=2,H=1,ow=.045,outline=INK,side=THREE.DoubleSide}={})=>S.mat(`uniform float uQ;uniform float uK;uniform float uWig;uniform float uRot;
${SDF}${sd}
void main(){vec2 p=(vUv-.5)*vec2(${f(W)},${f(H)});float d=sd(p);if(d>0.)discard;
 float e=.012;vec2 g=vec2(sd(p+vec2(e,0.))-sd(p-vec2(e,0.)),sd(p+vec2(0.,e))-sd(p-vec2(0.,e)))/(2.*e);g=r2(-uRot)*g;
 float bul=smoothstep(0.,-.2,d);vec3 n=normalize(vec3(g*(1.-bul)*1.4,.42+bul));
 float l=styLight(n,stySunV());float nz=styNoise(vUv*vec2(1.6,.8)+.37).r;
 if(styErode(nz,uQ,.06)<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.2+.6*l+lb,0.,1.))*styTint(l);
 c=mix(c,${outline},smoothstep(-${f(ow)},-${f(ow*0.35)},d));
 gl_FragColor=vec4(c+uC1*uK,uA);}`,{uQ:{value:-1},uK:{value:0},uWig:{value:0},uRot:{value:0}},{mode:'matter',side});
const silSet=(m,{q=-1,k=0,wig=0,rot=0,a=1}={})=>{const u=m.material.uniforms;u.uQ.value=q;u.uK.value=k;u.uWig.value=wig;u.uRot.value=rot;u.uA.value=a;};
// sólido con luz en 3 bandas (espinas, agujas, caparazones): body fija base / lb
const SOLID=(body,{hot='uC1',er=.05}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vUv*vec2(1.7,.9)+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.18*smoothstep(.62,.72,fr)*step(.5,l);
 gl_FragColor=vec4(c+${hot}*uK,1.);}`;
// burbuja: borde turquesa saturado, centro casi vacío, brillo duro pequeño
const BUBBLE_P=(col=WATER)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
 float rim=smoothstep(.33,.43,d)*smoothstep(.5,.44,d);float hl=step(length(q-vec2(-.13,-.14)),.07);
 float a=(rim*.95+.16*smoothstep(.45,0.,d)+hl*.9)*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${col},.5+.4*(-q.y+.5)),vec3(.85,1.,1.),hl*.8),a);}`;
// mancha de agua en el suelo (materia)
const STAIN=(col,alpha=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);float rim=smoothstep(.55,.75,r+(n-.5)*.5);
 gl_FragColor=vec4(styRampOf(${col},.2+.35*n+.25*rim),m*er*uA*${f(alpha)});}`;
// onda de agua que se abre en el suelo: anillo de pincel con radio uR (0..1 del plano) y ancho uW; uP erosión
const WAVE_FS=`uniform float uR;uniform float uW;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float n=styNoise(vec2(an*.9,r*1.5)+uT*.2).r;float d=abs(r-uR)/max(uW,.001);
 float m=smoothstep(1.,.2,d+(n-.5)*.6)*step(r,1.);if(m<.01)discard;float er=styErode(n*.6+m*.4,uP,.12);
 gl_FragColor=vec4(styRampOf(mix(${WATER},${WLIGHT},.35),.35+.5*m+.15*n),m*er*uA*.85);}`;
const waveU=()=>({uR:{value:0},uW:{value:.08}});
// gota de agua (materia en turquesa)
const DROP=(col=WATER)=>S.MATTER_FS(C.drop,{relief:4,col});
const defs=[];

// =====================================================================
// 1 · KOI (3 PA) — la cola borbotea y levanta un géiser turquesa; de él salta una carpa koi (silueta crema con manchas
//     naranjas), sube en un arco alto dejando una estela de agua, se lanza en picado y cae sobre el rival: corona de
//     salpicaduras, anillo, charco. Después flotan escamas naranjas como pétalos. ti 1,7 s
// =====================================================================
const KOI_SD=`float sd(vec2 p){
 float body=sdE(p,vec2(.12,0.),vec2(.6,.22),0.);
 vec2 tp=p-vec2(-.42,0.);tp.y-=sin(uWig)*.25*max(-tp.x,0.);
 float t1=sdE(tp,vec2(-.26,.11),vec2(.27,.085),.6),t2=sdE(tp,vec2(-.26,-.11),vec2(.27,.085),-.6);
 float fin=sdE(p,vec2(.18,-.19),vec2(.15,.055),-.75),fin2=sdE(p,vec2(-.18,-.17),vec2(.1,.04),-.5);
 float dors=sdE(p,vec2(-.02,.19),vec2(.3,.07),.1);
 float d=smin(body,min(t1,t2),.07);d=smin(d,min(fin,fin2),.035);d=smin(d,dors,.05);return d;}`;
const KOI_BODY=`float pt=styNoise(p*.6+vec2(.31,.77)).r*.7+styNoise(p*1.3+.2).g*.3;
 base=mix(${CREAM},${KOIOR},smoothstep(.46,.52,pt));float fins=step(.0,-p.x-.55)+step(.15,-p.y)*step(-.35,p.x);
 base=mix(base,${KOIOR}*1.05,.45*clamp(fins,0.,1.));float sc=smoothstep(.75,.95,sin(p.x*38.+sin(p.y*30.)*1.2));lb=-.08*sc*step(-.5,p.x);`;
defs.push({key:"sty_qtKoi",name:"Koi (estilizado)",dur:3.3,ti:1.7,pal:P_KOI,tier:3,stylized:true,...ZONES,
  phases:[["Borboteo",0],["Géiser",0.45],["Ascenso",0.5],["Picado",1.25],["Impacto",1.7],["Pétalos",2.05]],
build(a){
  const L=a.L,TG=0.45,TA=0.5,TD=1.25,TI=1.7;
  const P0=V3(-3.95,0.5,0.1), AP=V3(-1.0,4.3,0.25), HP=V3(3.1,1.2,0.15);
  const C1=V3(-3.4,3.6,0.2), C2=V3(1.4,4.6,0.2);
  const fish=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.7),SIL(KOI_SD,KOI_BODY,{W:2,H:1,ow:.022,outline:lin('#7a2a10')})); L.mesh.add(fish);
  // géiser: columna de agua que sube con vetas (cilindro abierto, energía + materia)
  const GEY_FS=`uniform float uH;void main(){
   float v=vUv.y;if(v>uH)discard;float an=vUv.x;float st=styNoise(vec2(an*3.,v*1.2-uT*2.2)).r;
   float top=smoothstep(uH,uH-.18,v);float er=styErode(st*.7+(1.-v)*.3,uP,.1);float m=(.55+.45*st)*top*er;if(m<.02)discard;
   vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
   gl_FragColor=vec4(styRampOf(${WATER},.35+.45*st+.25*fr),m*uA*.92);}`;
  const geyGeo=new THREE.CylinderGeometry(0.28,0.5,1,24,8,true).translate(0,0.5,0);
  const gy=new THREE.Mesh(geyGeo,S.mat(GEY_FS,{uH:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  gy.position.set(-3.95,0,0.1); L.mesh.add(gy);
  const sp2=new THREE.Mesh(geyGeo,S.mat(GEY_FS,{uH:{value:0.98}},{mode:'matter',side:THREE.DoubleSide})); sp2.position.set(TX-0.05,0,0.05); L.mesh.add(sp2);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.41}), ring=S.groundRing(L.decal,3.8), ring2=S.groundRing(L.decal,2.4);
  const pool=groundPlane(2.8,TX-0.1,0.026,S.mat(STAIN(WATER,.6),{},{mode:'matter'})); L.decal.add(pool);
  const gpool=groundPlane(1.8,-3.95,0.024,S.mat(STAIN(WATER,.5),{},{mode:'matter'})); L.decal.add(gpool);
  const shadow=S.contactShadow(L.decal,1.2);
  const K=`const float TG=${f(TG)};const float TA=${f(TA)};const float TD=${f(TD)};const float TI=${f(TI)};
  const vec3 P0=${v3(P0)};const vec3 AP=${v3(AP)};const vec3 HP=${v3(HP)};const vec3 C1=${v3(C1)};const vec3 C2=${v3(C2)};
  vec3 q2(vec3 a,vec3 b,vec3 c,float t){float s=1.-t;return s*s*a+2.*s*t*b+t*t*c;}
  vec3 path(float t){if(t<TD){float u=clamp((t-TA)/(TD-TA),0.,1.);u=1.-(1.-u)*(1.-u);return q2(P0,C1,AP,u);}
   float u=clamp((t-TD)/(TI-TD),0.,1.);u=u*u;return q2(AP,C2,HP,u);}`;
  // borboteo: burbujas que suben desde la cola
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*.55;float life=.45+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=P0+vec3((aSeed.z-.5)*.7,age*(.9+.6*aSeed.w),(aSeed.w-.5)*.5);vA=(age>0.&&age<1.)?1.-age*.5:0.;vK=0.;vR=0.;put(p,.16+.1*aSeed.y);}`,BUBBLE_P());
  // estela de agua detrás de la carpa
  S.pts(L.part,34,VV+K+`void main(){float s=TA+aSeed.x*(TI-TA);float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=path(s)+rnd()*.12+vec3(0.,-2.2*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.35,1.,age);vR=3.14159;
   put(p,.2+.1*aSeed.w);}`,DROP());
  // gotas del géiser
  S.pts(L.part,22,VV+K+`void main(){float s=TG+aSeed.x*.5;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=vec3((aSeed.z-.5)*1.8,3.+2.*aSeed.w,(aSeed.y-.5)*1.2);vec3 p=P0+vec3(0.,1.6*aSeed.w,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.18+.08*aSeed.w);}`,DROP());
  // corona de salpicaduras en el impacto + espuma turquesa
  S.pts(L.part,56,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.4+1.6*aSeed.w),3.2+2.6*aSeed.y,sin(an)*(1.1+1.2*aSeed.w));
   vec3 p=vec3(HP.x,.4,0.)+v*t+vec3(0.,-9.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=3.14159;
   put(p,.34+.18*aSeed.w);}`,DROP());
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.02+aSeed.x*.08;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(HP.x,.25,0.)+vec3(cos(an),0.,sin(an)*.8)*(.4+.9*(1.-exp(-t*5.)))+vec3(0.,.1+t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:WLIGHT,bias:-.05}));
  // escamas-pétalo que caen sobre el rival
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.3+aSeed.x*.5;float life=1.1+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(HP.x+(aSeed.z-.5)*2.4,2.6+aSeed.w*.8-t*1.4,(aSeed.y-.5)*1.6)+vec3(sin(t*4.+aSeed.w*6.)*.25,0.,cos(t*3.+aSeed.x*6.)*.2);
   vA=(age>0.&&age<1.&&p.y>.05)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*3.;put(p,.22+.08*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:KOIOR}));
  a.pose=function(te,o){
    const ia=te-TI;
    // carpa: sale del géiser, arco alto, picado acelerado
    let u,pos=tmp;
    if(te<TD){u=cl((te-TA)/(TD-TA));u=1-(1-u)*(1-u);bez2(pos,P0,C1,AP,u);}else{u=cl((te-TD)/(TI-TD));u=u*u;bez2(pos,AP,C2,HP,u);}
    const dt=0.02,t2=te+dt; if(t2<TD){let w=cl((t2-TA)/(TD-TA));w=1-(1-w)*(1-w);bez2(tmp2,P0,C1,AP,w);}else{let w=cl((t2-TD)/(TI-TD));w=w*w;bez2(tmp2,AP,C2,HP,Math.min(w,1));}
    const dx=tmp2.x-pos.x,dy=tmp2.y-pos.y; const ang=(dx*dx+dy*dy>1e-8)?Math.atan2(dy,dx):-0.6;
    fish.position.copy(pos); billboard(fish,ang); fish.visible=te>=TA&&ia<0.05;
    const sc=2.5*(0.4+0.6*ss(TA,TA+0.25,te)); fish.scale.set(sc,sc*(dx<0?-1:1),sc);
    silSet(fish,{wig:te*14,rot:ang,k:0.15*ss(TD,TI,te)});
    // géiser
    const gh=ss(TG-0.05,TA+0.1,te)*(1-ss(TA+0.35,TA+0.8,te)); gy.visible=gh>0.001||te<TA+0.8&&te>TG;
    gy.scale.set(1+0.3*gh,2.8*ss(TG-0.05,TA+0.15,te)+0.001,1+0.3*gh); gy.material.uniforms.uH.value=0.98;
    set(gy,ss(TA+0.3,TA+0.85,te),te>TG-0.05?1:0);
    gpool.visible=te>TG; gpool.scale.setScalar(0.6+0.5*ss(TG,TG+0.3,te)); set(gpool,-0.1+1.1*ss(TA+0.6,TA+1.4,te),1);
    shadow.pose(pos.x,0,0.7,fish.visible?0.45*cl(1.4-pos.y*0.25):0);
    const sk=e3(cl(ia/0.22)); sp2.visible=ia>=0&&ia<0.75; sp2.scale.set(1.6+0.8*sk,Math.max(2.4*sk*(1-0.5*ss(0.25,0.7,ia)),0.001),1.6+0.8*sk); set(sp2,ss(0.2,0.7,ia),1);
    spark.pose(ia,HP,1.2); ring.pose(ia,TX-0.1,0,0.5,1); ring2.pose(ia-0.12,TX-0.1,0,0.45,1);
    pool.visible=ia>=0; pool.scale.setScalar(0.5+0.5*e3(ia/0.25)); set(pool,ia>=0?-0.1+1.15*ss(0.6,1.5,ia):0,1);
    const h=hitE(ia,6);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.22*h*Math.cos(ia*14);
    target.scale.set(1+0.08*h,1-0.12*h,1+0.08*h);
    caster.rotation.z=0.06*Math.sin(te*20)*ss(0,TG,te)*(1-ss(TA,TA+0.3,te));
    o.em=0.45*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(te<TA?P0:pos);o.gs=0.8+0.5*ss(TD,TI,te);o.ga=0.12+0.15*ss(TD,TI,te);o.li=1.5+2*ss(TD,TI,te);}
    else{o.g.copy(HP);o.gs=1.4+3.5*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HP);o.shake=1;o.dist=1;o.flash=0.7;
  };
}});

// =====================================================================
// 2 · NAVAGA — la aleta dorsal se eriza: cinco espinas venenosas añil con punta turquesa se abren detrás del lanzador,
//     salen disparadas en abanico y se clavan una tras otra en el rival (chispa y gotas en cada una), vibran y se
//     disuelven. ti 0,67 s
// =====================================================================
const SPINE_BODY=`float v=clamp(vUv.y,0.,1.);base=mix(${INDIGO},${WATER},smoothstep(.55,.95,v));lb=.05*smoothstep(.8,1.,v);`;
defs.push({key:"sty_qtNavaga",name:"Navaga (estilizado)",dur:1.8,ti:0.67,pal:P_NAVAGA,tier:2,stylized:true,...ZONES,
  phases:[["Espinas",0],["Disparo",0.36],["Impactos",0.53],["Clavadas",0.75],["Disolución",1.2]],
build(a){
  const L=a.L,TF=0.36,TH0=0.53,TI=0.67,N=5;
  const mat=S.mat(SOLID(SPINE_BODY,{hot:'vec3(.3,.9,1.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const geo=new THREE.ConeGeometry(0.075,0.8,7,1).rotateZ(-Math.PI/2).translate(-0.34,0,0);   // la punta queda en el origen   // punta hacia +x
  const sp=[];
  for(let i=0;i<N;i++){const m=new THREE.Mesh(geo,mat);L.mesh.add(m);
    const ang=(i-(N-1)/2)*0.38;
    const fan=V3(-4.25+0.25*Math.abs(ang),1.25+0.75*Math.cos(ang),Math.sin(ang)*0.85);
    const hit=V3(TX-0.42,0.72+0.18*i,(i-2)*0.09);
    sp.push({m,fan,hit,ang,th:TH0+i*(TI-TH0)/(N-1)});}
  const sparks=sp.map((d,i)=>S.hitSpark(L.mesh,0.8,{seed:0.2+i*0.13}));
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TF=${f(TF)};const float TH0=${f(TH0)};const float TI=${f(TI)};const float TX=${f(TX)};`;
  // gotas en cada impacto
  S.pts(L.part,30,VV+K+`void main(){float i=floor(aSeed.x*5.);float s=TH0+i*(TI-TH0)/4.;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(TX-.35,.72+.18*i,(i-2.)*.09);vec3 v=normalize(rnd()+vec3(-.6,.5,0.))*(1.6+1.4*aSeed.z);
   vec3 p=b+v*t+vec3(0.,-5.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.15+.07*aSeed.w);}`,DROP());
  // estela de agua de cada espina
  S.pts(L.part,40,VV+K+`void main(){float i=floor(aSeed.x*5.);float th=TH0+i*(TI-TH0)/4.;float s=TF+aSeed.y*(th-TF);float life=.3;float age=(uT-s)/life;
   float u=(s-TF)/(th-TF);vec3 a0=vec3(-4.1,1.6,(i-2.)*.3),a1=vec3(TX-.35,.72+.18*i,(i-2.)*.09);vec3 p=mix(a0,a1,u)+vec3(0.,sin(u*3.14159)*.7,0.)+rnd()*.06;
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=0.;put(p,.16);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;let hit=0;
    caster.rotation.z=0.1*ss(0,TF,te)-0.18*ss(TF,TF+0.08,te)+0.08*ss(TF+0.15,TI+0.2,te);
    sp.forEach((d,i)=>{const rise=ss(0.02+i*0.04,0.24+i*0.02,te);
      if(te<TF){tailW(tmp);d.m.position.copy(tmp).lerp(d.fan,e3(rise));d.m.position.y+=0.04*Math.sin(te*30+i);
        tmp2.set(TX,1.1,0).sub(d.m.position).normalize().lerp(YA,0.6*(1-rise)).normalize();d.m.quaternion.setFromUnitVectors(XA,tmp2);
        d.m.scale.setScalar(Math.max(2.0*rise,0.001));}
      else if(te<d.th){const u=(te-TF)/(d.th-TF),uu=u*u*(0.5+0.5*u);
        d.m.position.lerpVectors(d.fan,d.hit,uu);d.m.position.y+=Math.sin(u*Math.PI)*0.7;
        tmp2.lerpVectors(d.fan,d.hit,Math.min(uu+0.04,1));tmp2.y+=Math.sin(Math.min(u+0.04,1)*Math.PI)*0.7;tmp2.sub(d.m.position);
        if(tmp2.lengthSq()>1e-7)d.m.quaternion.setFromUnitVectors(XA,tmp2.normalize());d.m.scale.setScalar(2.0);}
      else{const ih=te-d.th;d.m.position.copy(d.hit);d.m.position.x+=0.05*Math.sin(ih*45)*Math.exp(-ih*6);
        d.m.quaternion.setFromUnitVectors(XA,tmp2.set(1,-0.45,0).normalize());d.m.scale.setScalar(2.0);}
      d.m.visible=rise>0.001; const ih=te-d.th; hit+=hitE(ih,9); sparks[i].pose(ih,d.hit,0.75);});
    mat.uniforms.uQ.value=-0.1+1.15*ss(1.2,1.65,te); mat.uniforms.uK.value=0.5*ss(0,TF,te)*(1-ss(TF,TF+0.2,te));
    ring.pose(ia,TX-0.1,0,0.45,0.9);
    target.position.x=TX+0.09*Math.min(hit,2.2); target.rotation.z=-0.1*Math.min(hit,2)*Math.cos(te*40);
    o.em=0.3*Math.min(hit,1); o.emc.copy(U.uC1.value);
    if(te<TF){tailW(o.g);o.g.y+=0.6;o.gs=0.6;o.ga=0.1*ss(0,TF,te);o.li=1.2*ss(0,TF,te);}
    else{o.g.copy(TC);o.gs=0.9+Math.max(ia,0);o.ga=0.25*Math.min(hit,1);o.li=3*Math.min(hit,1);}
    o.ia=ia;o.c.set(TX-0.2,1.08,0);o.shake=0.5;o.dist=0.6;o.flash=0.5;
  };
}});

// =====================================================================
// 3 · NIMO (sobre sí) — un coletazo salpica y abre una corriente turquesa que se extiende en anillo por todo el campo
//     (llega a todo el equipo); dos peces payaso nadan en círculo alrededor del lanzador. En ti el agua sube por el
//     lanzador con cruces de cura menta (cura 15) y del frente de la onda saltan chispas doradas (+1 PA a los aliados).
//     ti 0,4 s
// =====================================================================
const CLOWN_SD=`float sd(vec2 p){vec2 tp=p-vec2(-.26,0.);tp.y-=sin(uWig)*.35*max(-tp.x,0.);
 float body=sdE(p,vec2(.04,0.),vec2(.34,.11),0.);float tail=min(sdE(tp,vec2(-.1,.07),vec2(.14,.04),.55),sdE(tp,vec2(-.1,-.07),vec2(.14,.04),-.55));
 float fin=sdE(p,vec2(-.02,.11),vec2(.14,.035),.3),fin2=sdE(p,vec2(.06,-.1),vec2(.1,.03),-.6);
 return smin(smin(body,tail,.04),min(fin,fin2),.03);}`;
const CLOWN_BODY=`float fin=smoothstep(.05,-.05,abs(p.y)-.1)<.5?1.:0.;float tl=smoothstep(-.18,-.3,p.x);
 base=mix(${WATER},${WLIGHT},smoothstep(-.05,.12,p.y)*.6);base=mix(base,${CORAL},max(tl,fin*.85)*.9);
 float st=smoothstep(.6,.9,sin(p.x*40.-uWig*1.5));lb=.06*st*step(abs(p.y),.08);`;
defs.push({key:"sty_qtNimo",name:"Nimo (estilizado)",dur:1.2,ti:0.4,pal:P_NIMO,tier:2,stylized:true,...ZONES,
  phases:[["Coletazo",0],["Corriente",0.16],["Llegada",0.4],["Energía",0.55]],
build(a){
  const L=a.L,TC0=0.16,TI=0.4,TE=0.55;
  const wave=groundPlane(14,CX,0.03,S.mat(WAVE_FS,waveU(),{mode:'matter'})); L.decal.add(wave);
  const wave2=groundPlane(14,CX,0.031,S.mat(WAVE_FS,waveU(),{mode:'matter'})); L.decal.add(wave2);
  const fishes=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.54),SIL(CLOWN_SD,CLOWN_BODY,{W:1,H:.6,ow:.018,outline:WDEEP}));L.mesh.add(m);return m;});
  const ring=S.groundRing(L.decal,2.4);
  const K=`const float TC0=${f(TC0)};const float TI=${f(TI)};const float TE=${f(TE)};const float CX=${f(CX)};`;
  // estelas de agua detrás de los dos peces espíritu (mismo recorrido circular que en pose)
  S.pts(L.part,28,VV+K+`void main(){float i=floor(aSeed.x*2.);float lag=aSeed.y*.22;float t=uT-lag;float an=t*4.2+i*3.14159;
   vec3 p=vec3(CX+cos(an)*1.25,1.+.25*sin(t*6.+i),sin(an)*1.)+rnd()*.05;float k=smoothstep(.05,.2,t)*(1.-smoothstep(1.,1.18,uT));
   vA=k*(1.-lag/.22)*.85;vK=lag/.22;vR=an;put(p,.22*(1.-lag/.3));}`,S.ENERGY_FS(C.slash,{gain:.9}),{mode:'energy'});
  // salpicadura del coletazo
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*.08;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.4,.9,0.))*(1.8+1.4*aSeed.z);vec3 p=vec3(-4.2,.5,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.17+.08*aSeed.w);}`,DROP());
  // vetas de corriente en el frente de la onda
  S.pts(L.part,36,VV+K+`void main(){float an=aSeed.x*6.2832;float u=clamp((uT-TC0)/.7,0.,1.);float R=.4+6.*(1.-(1.-u)*(1.-u));
   vec3 p=vec3(CX,0.,0.)+vec3(cos(an)*R,.12+.1*aSeed.y,sin(an)*R*.85);vA=(uT>TC0&&u<1.)?(1.-u)*.9:0.;vK=u;vR=an+1.57;put(p,.3+.12*aSeed.w);}`,
   S.ENERGY_FS(C.slash,{gain:1.05}),{mode:'energy'});
  // cura: cruces menta y gotas que suben por el lanzador
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX,0.,0.)+vec3(cos(an)*.5,.3+age*1.6,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.4+.1*aSeed.w);}`,
   S.PV+`void main(){vec2 q=gl_PointCoord-.5;float c=min(max(abs(q.x)-.08,abs(q.y)-.3),max(abs(q.y)-.08,abs(q.x)-.3));float m=step(c,0.);if(m<.5||vA<.01)discard;
   float ed=step(-.035,c);gl_FragColor=vec4(mix(styRampOf(${MINT},.75),${INK}*2.,ed*.6),vA);}`);
  S.pts(L.part,16,VV+K+`void main(){float s=TI-.05+aSeed.x*.3;float life=.55;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX,0.,0.)+vec3(cos(an)*(.3+.2*aSeed.w),.2+age*1.7,sin(an)*.35);vA=(age>0.&&age<1.)?1.-age*.6:0.;vK=0.;vR=0.;put(p,.15+.08*aSeed.y);}`,BUBBLE_P(WATER));
  // +1 PA: chispas doradas que saltan del frente de la onda (todo el equipo) y una que entra en el lanzador
  S.pts(L.part,12,VV+K+`void main(){float s=TE+aSeed.x*.15;float age=(uT-s)/.45;float an=aSeed.z*6.2832;float R=2.+2.5*aSeed.y;
   vec3 p=vec3(CX,0.,0.)+vec3(cos(an)*R,.2+age*1.3,sin(an)*R*.85);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*5.;put(p,.3);}`,
   S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy',uniforms:{}});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.12*Math.sin(te*28)*(1-ss(0.05,0.22,te));
    const u=cl((te-TC0)/0.7), R=1-(1-u)*(1-u);
    wave.visible=te>TC0&&u<1; wave.material.uniforms.uR.value=0.05+0.9*R; wave.material.uniforms.uW.value=0.05+0.03*(1-u); set(wave,0.1+0.8*u,1);
    const u2=cl((te-TC0-0.12)/0.7),R2=1-(1-u2)*(1-u2);
    wave2.visible=te>TC0+0.12&&u2<1; wave2.material.uniforms.uR.value=0.04+0.85*R2; wave2.material.uniforms.uW.value=0.035; set(wave2,0.2+0.8*u2,0.8);
    fishes.forEach((m,i)=>{const an=te*4.2+i*Math.PI, r=1.25;
      m.position.set(CX+Math.cos(an)*r,1.0+0.25*Math.sin(te*6+i),Math.sin(an)*r*0.8);
      const vx=-Math.sin(an),vy=0.25*6*Math.cos(te*6+i)/4.2*0.3; const ang=Math.atan2(vy,vx);
      billboard(m,ang); const k=ss(0.05,0.2,te)*(1-ss(1.0,1.18,te)); m.scale.set(1.8*k+0.001,(vx<0?-1:1)*(1.8*k+0.001),1); m.visible=k>0.001;
      silSet(m,{wig:te*22+i,rot:ang});});
    ring.pose(ia,CX,0,0.45,1);
    const h=hitE(ia,5); glowOf(caster,COL.set(0x58e0a8),0.4*h+0.3*ss(TE,TE+0.1,te)*(1-ss(TE+0.2,TE+0.5,te)));
    caster.scale.set(1+0.04*h,1+0.06*h,1+0.04*h);
    o.g.set(CX,1,0);o.gs=1.2+2*Math.max(ia,0);o.ga=ia<0?0.15:Math.exp(-ia*6)*0.4;o.li=ia<0?1.5:4*Math.exp(-ia*4);
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.3;o.flash=0.3;
  };
}});

// =====================================================================
// 4 · PUFF (X PA, un golpe por PA) — un pez globo de silueta turquesa con manchas aparece ante el lanzador e inhala:
//     se hincha y erizan sus púas. Al exhalar dispara ráfagas de agujas con chorro de agua: golpe en ti, segundo y
//     tercero (los PA extra). Al final se desinfla en vaho. ti 1,02 s
// =====================================================================
const PUFF_BODY=`vec3 q=normalize(vP);float sp=step(.62,styNoise(vec2(atan(q.z,q.x)*.6,q.y*.9)+.3).g);
 base=mix(${WATER},${lin('#e8d58a')},smoothstep(-.1,-.45,q.y));base=mix(base,${WDEEP},sp*.7*step(-.1,q.y));lb=-.05*sp;`;
defs.push({key:"sty_qtPuff",name:"Puff (estilizado)",dur:2.2,ti:1.02,pal:P_PUFF,tier:2,stylized:true,...ZONES,
  phases:[["Inhalar",0],["Exhalar",0.88],["Impacto",1.02],["Segunda",1.26],["Vapor",1.55]],
build(a){
  const L=a.L,TX0=0.88,TI=1.02,HITS=[1.02,1.26,1.45];
  const PF=V3(-2.6,1.55,0.2);
  const pf=new THREE.Group(); L.mesh.add(pf);
  const bodyMat=S.mat(SOLID(PUFF_BODY,{hot:'vec3(.4,.9,1.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.42,28,20),bodyMat); pf.add(body);
  const spMat=S.mat(SOLID(`base=mix(${CREAM},${WDEEP},smoothstep(.2,1.,vUv.y));`),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const spikes=[]; const sgeo=new THREE.ConeGeometry(0.035,0.22,5,1).translate(0,0.11,0);
  for(let i=0;i<26;i++){const m=new THREE.Mesh(sgeo,spMat);const y=1-2*(i+0.5)/26,r=Math.sqrt(1-y*y),an=i*2.39996;
    const n=V3(Math.cos(an)*r,y,Math.sin(an)*r); m.quaternion.setFromUnitVectors(V3(0,1,0),n); m.userData.n=n; pf.add(m); spikes.push(m);}
  // aletas y cola: silueta plana detrás (sin cara)
  const tail=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.6),SIL(`float sd(vec2 p){p.y-=sin(uWig)*.05;return min(sdE(p,vec2(-.12,.1),vec2(.22,.08),.5),sdE(p,vec2(-.12,-.1),vec2(.22,.08),-.5));}`,
    `base=${WATER};`,{W:.7,H:.6,ow:.025})); tail.position.set(-0.5,0,0); pf.add(tail);
  const ngeo=new THREE.ConeGeometry(0.045,0.5,6,1).rotateZ(-Math.PI/2).translate(-0.2,0,0);
  const nMat=S.mat(SOLID(`base=mix(${WDEEP},${CREAM},smoothstep(.4,1.,vUv.y));`,{hot:'vec3(.3,.9,1.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const needles=[];HITS.forEach((th,h)=>{for(let j=0;j<4;j++){const m=new THREE.Mesh(ngeo,nMat);L.mesh.add(m);
    needles.push({m,th,h,j,hit:V3(TX-0.3,0.85+0.16*j+0.05*h,(j-1.5)*0.12)});}});
  const sparks=HITS.map((t,i)=>S.hitSpark(L.mesh,0.85+0.12*i,{seed:0.3+i*0.21}));
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TI=${f(TI)};const vec3 PF=${v3(PF)};const float TX=${f(TX)};const float TX0=${f(TX0)};`;
  // motas de agua aspiradas al inhalar
  S.pts(L.part,24,VV+K+`void main(){float s=aSeed.x*.7;float u=clamp((uT-s)/.35,0.,1.);vec3 a0=PF+normalize(rnd())*1.6;
   vec3 p=mix(a0,PF,u*u);vA=(uT>s&&u<1.)?u:0.;vK=0.;vR=0.;put(p,.12+.06*aSeed.w);}`,BUBBLE_P());
  // chorros de agua de cada golpe
  S.pts(L.part,42,VV+K+`void main(){float h=floor(aSeed.x*3.);float th=h<.5?1.02:(h<1.5?1.26:1.45);float s=th-.14+aSeed.y*.12;float u=clamp((uT-s)/.16,0.,1.);
   vec3 p=mix(PF+vec3(.6,0.,0.),vec3(TX-.35,1.,0.),u)+rnd()*.14;vA=(uT>s&&u<1.)?1.:0.;vK=u*.5;vR=3.14159*.5;put(p,.3+.12*aSeed.w);}`,DROP());
  S.pts(L.part,36,VV+K+`void main(){float h=floor(aSeed.x*3.);float th=h<.5?1.02:(h<1.5?1.26:1.45);float s=th+aSeed.y*.04;float life=.45+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.6,0.))*(1.5+1.5*aSeed.w);vec3 p=vec3(TX-.35,1.,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.15+.07*aSeed.w);}`,DROP());
  // vaho al desinflarse
  S.pts(L.part,10,VV+K+`void main(){float s=1.55+aSeed.x*.2;float life=.6;float age=(uT-s)/life;vec3 p=PF+rnd()*.3+vec3(0.,age*.6,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.4+.2*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:WLIGHT}));
  a.pose=function(te,o){
    const ia=te-TI;
    const appear=ss(0,0.2,te), infl=ss(0.15,TX0,te), defl=ss(1.5,1.75,te);
    const squeeze=HITS.reduce((s,th)=>s+hitE(te-th+0.06,14)*(te>th-0.06?1:0),0);
    const sc=(0.35+0.85*infl-0.55*defl)*(1-0.12*squeeze);
    pf.position.copy(PF); pf.position.y+=0.06*Math.sin(te*5); pf.scale.setScalar(Math.max(appear*sc*1.8,0.001)); pf.visible=appear>0.001&&te<2.05;
    pf.rotation.set(0,0,0.15*Math.sin(te*3));
    const spk=ss(0.4,TX0,te)*(1-defl); spikes.forEach(m=>{m.scale.set(1,Math.max(spk*1.2,0.001),1);m.position.copy(m.userData.n).multiplyScalar(0.4);});
    bodyMat.uniforms.uQ.value=-0.1+1.1*ss(1.75,2.05,te); spMat.uniforms.uQ.value=bodyMat.uniforms.uQ.value; bodyMat.uniforms.uK.value=0.25*squeeze;
    silSet(tail,{wig:te*12,q:bodyMat.uniforms.uQ.value});
    let hit=0;
    needles.forEach(n=>{const t0=n.th-0.14,u=cl((te-t0)/0.14);
      tmp.copy(PF).add(tmp2.set(0.35,(n.j-1.5)*0.1,(n.j-1.5)*0.1));
      if(te<t0){n.m.visible=false;return;}
      if(u<1){n.m.position.lerpVectors(tmp,n.hit,u);n.m.quaternion.setFromUnitVectors(XA,tmp2.copy(n.hit).sub(tmp).normalize());n.m.visible=true;n.m.scale.setScalar(1.8);}
      else{const ih=te-n.th;n.m.position.copy(n.hit);n.m.position.x+=0.04*Math.sin(ih*40)*Math.exp(-ih*7);n.m.visible=ih<0.6;
        n.m.quaternion.setFromUnitVectors(XA,tmp2.copy(n.hit).sub(tmp).normalize());n.m.scale.setScalar(1.8);}});
    nMat.uniforms.uQ.value=-0.1+1.1*ss(1.6,1.95,te);
    HITS.forEach((th,i)=>{sparks[i].pose(te-th,tmp.set(TX-0.33,1.05,0),0.7+0.12*i);hit+=hitE(te-th,9);});
    ring.pose(ia,TX-0.1,0,0.45,0.9);
    target.position.x=TX+0.1*Math.min(hit,2); target.rotation.z=-0.12*Math.min(hit,2)*Math.cos(te*36);
    o.em=0.3*Math.min(hit,1); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(PF);o.gs=0.7+0.6*infl;o.ga=0.1+0.1*infl;o.li=1.5*infl;}
    else{o.g.set(TX-0.35,1.05,0);o.gs=1+ia;o.ga=0.3*Math.min(hit,1);o.li=4*Math.min(hit,1);}
    o.ia=ia;o.c.set(TX-0.33,1.05,0);o.shake=0.5;o.dist=0.6;o.flash=0.5;
  };
}});

// =====================================================================
// 5 · RANCHU (sobre sí: daño y Débil a todos los enemigos) — un ranchu (pez de cabeza abultada, silueta roja y crema)
//     se forma sobre el lanzador, infla los carrillos y escupe una gran burbuja que crece sobre él. En ti revienta y
//     una ola de burbujas recorre todo el campo; en el frente quedan burbujas que atrapan (con chevrones violetas del
//     Débil) y estallan al final en gotas. ti 1,05 s
// =====================================================================
const RANCHU_SD=`float sd(vec2 p){vec2 tp=p-vec2(-.4,0.);tp.y-=sin(uWig)*.2*max(-tp.x,0.);
 float body=sdE(p,vec2(0.,-.02),vec2(.46,.4),0.);
 float w1=sdE(p,vec2(.3,.26),vec2(.15,.13),0.),w2=sdE(p,vec2(.12,.36),vec2(.14,.11),0.),w3=sdE(p,vec2(.4,.08),vec2(.12,.13),0.);
 float t1=sdE(tp,vec2(-.18,.12),vec2(.24,.14),.5),t2=sdE(tp,vec2(-.18,-.14),vec2(.24,.14),-.5);
 float fin=sdE(p,vec2(.05,-.38),vec2(.12,.06),-.3);
 float d=smin(body,min(min(w1,w2),w3),.07);d=smin(d,min(t1,t2),.08);return smin(d,fin,.04);}`;
const RANCHU_BODY=`float wen=step(.18,length(p-vec2(.28,.2))<.25?1.:0.);float hd=smoothstep(.32,.2,length(p-vec2(.28,.24)));
 base=mix(${RED},${CREAM},smoothstep(-.12,-.3,p.y)*step(-.3,p.x));base=mix(base,${lin('#ff8a3a')},hd*.7);
 base=mix(base,${RED}*.9,step(p.x,-.42)*.6);float bump=styNoise(p*2.6+.4).g;lb=-.08*hd*step(.55,bump);`;
defs.push({key:"sty_qtRanchu",name:"Ranchu (estilizado)",dur:3.2,ti:1.05,pal:P_RANCHU,tier:3,stylized:true,...ZONES,
  phases:[["Carga",0],["Lanzamiento",0.35],["Impacto",1.05],["Atrapados",1.4],["Estallido",2.6]],
build(a){
  const L=a.L,TL=0.35,TI=1.05,TT=1.4,TB=2.6;
  const RP=V3(CX+0.3,2.3,0.3), BP=V3(CX,3.5,0.2);
  const fish=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.05),SIL(RANCHU_SD,RANCHU_BODY,{W:1.6,H:1.4,ow:.04})); L.mesh.add(fish);
  // gran burbuja
  const bub=new THREE.Mesh(new THREE.SphereGeometry(0.5,28,20),S.mat(`void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
   float sw=styNoise(vUv*vec2(3.,1.5)+uT*.15).r;float hl=smoothstep(.93,.97,dot(n,normalize(vec3(-.4,.6,.7))));
   float m=pow(fr,2.2)*.95+.08+hl*.9;float er=styErode(sw*.6+fr*.4,uP,.1);
   gl_FragColor=vec4(mix(styRampOf(${WATER},.45+.45*fr+.15*sw),vec3(.85,1.,1.),hl*.7),min(m,1.)*er*uA);}`,{},{mode:'matter'}));
  L.mesh.add(bub);
  const wave=groundPlane(15,CX,0.03,S.mat(WAVE_FS,waveU(),{mode:'matter'})); L.decal.add(wave);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.55}), ring=S.groundRing(L.decal,3.2);
  const K=`const float TI=${f(TI)};const float TT=${f(TT)};const float TB=${f(TB)};const float CX=${f(CX)};const vec3 BP=${v3(BP)};
  float RW(float t){float u=clamp((t-TI)/.4,0.,1.);return .6+4.6*(1.-(1.-u)*(1.-u));}`;
  // burbujas de la ola: corren por el anillo y quedan flotando (atrapan) hasta el estallido
  S.pts(L.part,44,VV+K+`void main(){float an=aSeed.x*6.2832;float R=RW(uT)+(aSeed.y-.5)*.5;
   float bob=sin(uT*3.+aSeed.z*6.)*.12;vec3 p=vec3(CX,0.,0.)+vec3(cos(an)*R,.35+.7*aSeed.w+bob,sin(an)*R*.85);
   float pop=TB+aSeed.z*.4;vA=(uT>TI&&uT<pop)?1.:0.;vK=0.;vR=0.;put(p,(.48+.3*aSeed.y)*(uT<TT?.8+.2*smoothstep(TI,TT,uT):1.));}`,BUBBLE_P());
  // gotas del estallido de cada burbuja
  S.pts(L.part,40,VV+K+`void main(){float an=aSeed.x*6.2832;float R=RW(TB)+(aSeed.y-.5)*.5;float s=TB+aSeed.z*.4;float life=.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(CX,0.,0.)+vec3(cos(an)*R,.35+.7*aSeed.w,sin(an)*R*.85);vec3 p=b+normalize(rnd())*t*1.6+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=3.14159;put(p,.13);}`,DROP());
  // Débil: chevrones violetas que bajan dentro del anillo de burbujas
  S.pts(L.part,24,VV+K+`void main(){float an=aSeed.x*6.2832+uT*.3;float R=RW(TT)+(aSeed.y-.5)*.4;float k=fract((uT-TT)/.7+aSeed.z);
   vec3 p=vec3(CX,0.,0.)+vec3(cos(an)*R,1.6-k*1.2,sin(an)*R*.85);vA=(uT>TT&&uT<TB+.2)?sin(k*3.14159):0.;vK=0.;vR=0.;put(p,.4);}`,
   S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y+.12-abs(q.x)*.9);float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;
   gl_FragColor=vec4(styRampOf(${VIOLET},.8),a);}`,{mode:'energy'});
  // gotas del estallido de la gran burbuja
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.3,0.))*(2.+2.*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.2+.1*aSeed.w);}`,DROP());
  a.pose=function(te,o){
    const ia=te-TI;
    const fk=ss(0,0.25,te)*(1-ss(TI,TI+0.35,te)), puff=ss(0.1,TL,te)*(1-ss(TL,TL+0.12,te));
    fish.position.copy(RP); fish.position.y+=0.08*Math.sin(te*4); billboard(fish,0.08*Math.sin(te*3));
    fish.scale.set(2.0*fk+0.001,2.0*fk*(1+0.08*puff)+0.001,1); fish.visible=fk>0.001;
    silSet(fish,{wig:te*9,q:-0.1+1.1*ss(TI,TI+0.35,te),k:0.2*puff});
    const bk=ss(TL,TL+0.15,te), bs=0.3+1.5*ss(TL,TI,te);
    bub.position.lerpVectors(RP,BP,ss(TL,TL+0.4,te)); bub.position.y+=0.05*Math.sin(te*7);
    bub.scale.set(bs*(1+0.04*Math.sin(te*13)),bs*(1-0.04*Math.sin(te*13)),bs); bub.visible=bk>0.001&&ia<0; set(bub,0,bk);
    const u=cl(ia/0.4),R=0.6+4.6*(1-(1-u)*(1-u));
    wave.visible=ia>=0&&ia<1.0; wave.material.uniforms.uR.value=R/7.5; wave.material.uniforms.uW.value=0.05; set(wave,0.1+0.9*ss(0.3,1.0,ia),1);
    spark.pose(ia,BP,1.3); ring.pose(ia,CX,0,0.5,1);
    caster.scale.set(1,1-0.06*puff,1);
    o.g.copy(ia<0?BP:tmp.set(CX,1,0));o.gs=ia<0?0.8+0.8*ss(TL,TI,te):1.5+3*ia;o.ga=ia<0?0.15:Math.exp(-ia*5)*0.45;o.li=ia<0?2:6*Math.exp(-ia*3);
    o.ia=ia;o.c.set(CX,1,0);o.shake=1;o.dist=1;o.flash=0.5;
  };
}});

// =====================================================================
// 6 · SHRIMP — un camarón pistola (silueta coral segmentada, con antenas y pinza grande) se encoge ante el lanzador y
//     chasquea la pinza: anillo de choque y una burbuja de cavitación sale disparada recta con anillos de estela. En ti
//     la burbuja colapsa en el rival: destello turquesa, onda de choque, gotas y burbujitas; el camarón retrocede.
//     ti 1,0 s
// =====================================================================
const SHRIMP_SD=`float sd(vec2 p){float d=1e3;float cu=uWig;
 for(int i=0;i<6;i++){float fi=float(i);float t=fi*(.24+.3*cu);vec2 c=vec2(.25-.5*sin(t),.5*(cos(t)-1.));d=smin(d,length(p-c)-(.15-.014*fi),.06);}
 float tt=6.*(.24+.3*cu);vec2 tc=vec2(.25-.5*sin(tt),.5*(cos(tt)-1.));
 d=smin(d,sdE(p,tc+vec2(-.06,-.02),vec2(.14,.06),tt+.6),.04);d=smin(d,sdE(p,tc+vec2(.02,-.08),vec2(.13,.05),tt+1.2),.04);
 d=smin(d,sdE(p,vec2(.42,.02),vec2(.22,.14),.1),.06);
 d=smin(d,sdE(p,vec2(.72,-.12),vec2(.2,.09),-.25),.05);d=min(d,sdE(p,vec2(.9,-.2),vec2(.08,.05),-.5));
 d=min(d,sdSeg(p,vec2(.58,.1),vec2(.95,.42),.012));d=min(d,sdSeg(p,vec2(.6,.08),vec2(.98,.22),.01));
 d=min(d,sdSeg(p,vec2(.2,-.12),vec2(.18,-.28),.012));d=min(d,sdSeg(p,vec2(.05,-.15),vec2(.02,-.3),.012));return d;}`;
const SHRIMP_BODY=`float seg=smoothstep(.7,.95,sin(atan(p.y+.5,p.x-.25)*20.));base=mix(${CORAL},${lin('#ffb08a')},smoothstep(-.1,.2,p.y));
 base=mix(base,${lin('#c0402e')},smoothstep(.5,.62,p.x)*smoothstep(-.02,-.2,p.y));lb=-.1*seg;`;
defs.push({key:"sty_qtShrimp",name:"Shrimp (estilizado)",dur:2.1,ti:1.0,pal:P_SHRIMP,tier:2,stylized:true,...ZONES,
  phases:[["Encogerse",0],["Impulso",0.24],["Disparo",0.3],["Impacto",1],["Regreso",1.35]],
build(a){
  const L=a.L,TP=0.24,TF=0.3,TI=1.0,TR=1.35;
  const SP=V3(-2.75,1.15,0.25), CL=V3(-1.75,0.95,0.25), HP=V3(TX-0.25,1.05,0);
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.84),SIL(SHRIMP_SD,SHRIMP_BODY,{W:2,H:1.2,ow:.035})); L.mesh.add(sh);
  const bub=new THREE.Mesh(new THREE.SphereGeometry(0.28,24,16),S.mat(`void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
   float hl=smoothstep(.9,.96,dot(n,normalize(vec3(-.4,.6,.7))));float m=pow(fr,1.6)+.12+hl;
   gl_FragColor=vec4(mix(styRampOf(${WATER},.5+.5*fr),vec3(.85,1.,1.),hl*.7)*(1.+.4*fr),min(m,1.)*uA);}`,{},{mode:'matter'}));
  L.mesh.add(bub);
  // anillos de choque en billboard (chasquido e impacto)
  const RING_BB=`uniform float uE;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=.12*(1.-uE)+.03;float m=smoothstep(w,0.,abs(r-.25-.7*uE));
   float n=styNoise(vec2(atan(p.y,p.x),r)*1.2).r;if(m*(1.-uE)<.02)discard;gl_FragColor=vec4(styRamp(.5+.5*m)*(1.+.2*n),m*(1.-uE)*uA);}`;
  const snap=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),S.mat(RING_BB,{uE:{value:0}},{mode:'energy'})); L.mesh.add(snap);
  const shock=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),S.mat(RING_BB,{uE:{value:0}},{mode:'energy'})); L.mesh.add(shock);
  const spark=S.hitSpark(L.mesh,1.0,{seed:0.71}), ring=S.groundRing(L.decal,3.2);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const vec3 CL=${v3(CL)};const vec3 HP=${v3(HP)};
  float fu(float t){float u=clamp((t-TF)/(TI-TF),0.,1.);return u*(.35+.65*u);}`;
  // estela: anillos pequeños y burbujitas detrás de la burbuja
  S.pts(L.part,30,VV+K+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.35;float age=(uT-s)/life;
   vec3 p=mix(CL,HP,fu(s))+rnd()*.16;vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,(.2+.12*aSeed.w)*(1.+age));}`,BUBBLE_P());
  S.pts(L.part,14,VV+K+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.28;float age=(uT-s)/life;
   vec3 p=mix(CL,HP,fu(s));vA=(age>0.&&age<1.)?(1.-age)*.8:0.;vK=age;vR=1.5708;put(p,.8+.8*age);}`,S.ENERGY_FS(C.ring,{gain:.9}),{mode:'energy'});
  // gotas y burbujitas del colapso
  S.pts(L.part,34,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.4,0.))*(1.8+2.*aSeed.z);vec3 p=HP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.16+.08*aSeed.w);}`,DROP());
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.03+aSeed.x*.1;float life=.6;float age=(uT-s)/life;vec3 p=HP+rnd()*.5+vec3(0.,age*1.,0.);
   vA=(age>0.&&age<1.)?1.-age*.6:0.;vK=0.;vR=0.;put(p,.12+.08*aSeed.w);}`,BUBBLE_P());
  a.pose=function(te,o){
    const ia=te-TI, ip=te-TP;
    const k=ss(0,0.15,te)*(1-ss(TR+0.25,TR+0.55,te));
    const back=ss(TR,TR+0.5,te);
    sh.position.copy(SP).add(tmp.set(-1.1*back,0.5*back,0)); billboard(sh,0.15*back);
    sh.scale.set(2.1*k+0.001,2.1*k+0.001,1); sh.visible=k>0.001;
    const curl=ss(0,TP,te)*(1-ss(TP,TP+0.12,te))+0.3*back;
    silSet(sh,{wig:curl,k:0.25*hitE(ip,10)*(ip>=0?1:0)});
    // burbuja de cavitación
    const u=cl((te-TF)/(TI-TF)),fu=u*(0.35+0.65*u);
    bub.position.lerpVectors(CL,HP,fu); bub.visible=te>=TF&&ia<0; bub.scale.setScalar(1.3+0.8*u); set(bub,0,1);
    const e1=cl(ip/0.3); snap.position.copy(CL); billboard(snap); snap.visible=ip>=0&&e1<1; snap.material.uniforms.uE.value=e1; snap.material.uniforms.uA.value=1;
    const e2=cl(ia/0.4); towardCam(shock.position,HP,0.3); billboard(shock); shock.visible=ia>=0&&e2<1; shock.material.uniforms.uE.value=e2; shock.material.uniforms.uA.value=1;
    spark.pose(ia,HP,1.0); ring.pose(ia,TX-0.1,0,0.45,1);
    const h=hitE(ia,7);
    target.position.x=TX+0.25*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.18*h*Math.cos(ia*16);
    target.scale.set(1+0.06*h,1-0.08*h,1+0.06*h);
    o.em=0.4*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(te<TF?CL:bub.position);o.gs=0.6;o.ga=0.15;o.li=1.8;}
    else{o.g.copy(HP);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*9)*0.45;o.li=6*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HP);o.shake=0.6;o.dist=0.8;o.flash=0.6;
  };
}});

// =====================================================================
// 7 · TADPOLE — huevos-burbuja en la cola eclosionan; un banco de renacuajos (siluetas oscuras que culebrean) nada por
//     el aire, se arremolina en una burbuja y la lanza contra el rival. En ti revienta en gotas y los renacuajos se
//     dispersan; después la estrella dorada del crítico aparece sobre la cabeza, se agrieta con una veta violeta y se
//     parte en dos (Gafe: sin críticos). ti 0,82 s
// =====================================================================
const TAD_P=S.PV+`void main(){vec2 q=styPC();float hd=length((q-vec2(.68,.5))/vec2(1.,.9))-.15;
 float tx=q.x;float ty=.5+sin(tx*11.-uT*18.+vMix*6.)*.07*(.75-tx);float tw=.06*smoothstep(.04,.62,tx);
 float tl=abs(q.y-ty)-tw;float inT=step(.06,tx)*step(tx,.66);float d=min(hd,inT>.5?tl:1.);if(d>0.||vA<.02)discard;
 float rim=smoothstep(-.03,-.01,d);vec3 n=normalize(vec3((q-vec2(.68,.5))*2.2*step(hd,0.),1.));float l=styLight(n,stySunV());
 vec3 c=styRampOf(${OLIVE},.3+.5*l+.25*step(hd,0.)*step(length(q-vec2(.63,.56)),.05));c=mix(c,${INK},rim*.7);
 gl_FragColor=vec4(c*styTint(l),vA);}`;
const STAR_FS=`uniform float uSide;uniform float uCr;void main(){vec2 p=(vUv-.5)*2.;float an=atan(p.y,p.x);float r=length(p);
 float rad=.32+.6*pow(abs(cos(an*2.)),6.);float d=r-rad;if(d>0.)discard;
 float cx=p.x+.06*sin(p.y*18.);if(cx*uSide<0.)discard;float seam=smoothstep(.08,0.,abs(cx))*uCr;
 float l=.55+.45*step(0.,-p.x*.6+p.y*.8);vec3 c=styRampOf(${GOLD},.3+.55*l);c=mix(c,${INK},smoothstep(-.07,-.03,d));
 c=mix(c,${VIOLET}*1.6,seam);gl_FragColor=vec4(c,uA);}`;
defs.push({key:"sty_qtTadpole",name:"Tadpole (estilizado)",dur:2.0,ti:0.82,pal:P_TADPOLE,tier:2,stylized:true,...ZONES,
  phases:[["Nace",0],["Nado",0.12],["Burbuja",0.42],["Impacto",0.82],["Gafe",1.05]],
build(a){
  const L=a.L,TN=0.12,TB=0.42,TI=0.82,TJ=1.05;
  const EG=V3(-4.25,0.85,0.1), GA=V3(-1.2,1.9,0.2), HP=V3(TX-0.3,1.15,0);
  const bub=new THREE.Mesh(new THREE.SphereGeometry(0.42,24,16),S.mat(`void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
   float hl=smoothstep(.9,.96,dot(n,normalize(vec3(-.4,.6,.7))));float m=pow(fr,1.8)*.95+.1+hl;
   gl_FragColor=vec4(mix(styRampOf(${WATER},.45+.5*fr),vec3(.85,1.,1.),hl*.7),min(m,1.)*uA);}`,{},{mode:'matter'}));
  L.mesh.add(bub);
  const halves=[1,-1].map(sd=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(STAR_FS,{uSide:{value:sd},uCr:{value:0}},{mode:'matter',depthTest:false}));L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,0.9,{seed:0.48}), ring=S.groundRing(L.decal,2.8);
  const pool=groundPlane(2.0,TX-0.1,0.026,S.mat(STAIN(WATER,.5),{},{mode:'matter'})); L.decal.add(pool);
  const K=`const float TN=${f(TN)};const float TB=${f(TB)};const float TI=${f(TI)};const vec3 EG=${v3(EG)};const vec3 GA=${v3(GA)};const vec3 HP=${v3(HP)};
  vec3 bp(float t){float u=clamp((t-TB)/(TI-TB),0.,1.);u=u*u*(.6+.4*u);return mix(GA,HP,u)+vec3(0.,sin(u*3.14159)*.7,0.);}`;
  // huevos-burbuja que eclosionan
  S.pts(L.part,10,VV+K+`void main(){vec3 p=EG+rnd()*vec3(.35,.25,.3);vA=uT<TN+.05?1.:0.;vK=0.;vR=0.;put(p,.2+.06*aSeed.y);}`,BUBBLE_P(WATER));
  // banco de renacuajos: nado → remolino en la burbuja → viaje → dispersión
  S.pts(L.part,18,VV+K+`void main(){float ph=aSeed.x*6.2832;vec3 a0=EG+rnd()*.3;
   float u=clamp((uT-TN)/(TB-TN),0.,1.);float ue=u*u*(3.-2.*u);
   vec3 p1=mix(a0,GA,ue)+vec3(0.,sin(ue*3.14159)*(.6+.5*aSeed.y),(aSeed.z-.5)*1.4*sin(ue*3.14159));
   float sw=uT-TB;float an=ph+sw*9.;float rr=.8*(1.-.35*smoothstep(0.,.3,sw));vec3 b=bp(uT);
   vec3 p2=b+vec3(cos(an)*rr,sin(an)*rr*.7,sin(an)*rr*.5);
   float id=uT-TI;vec3 p3=HP+normalize(rnd()+vec3(.2,.6,0.))*id*(2.4+1.2*aSeed.w)+vec3(0.,-2.*id*id,0.);
   vec3 p=uT<TB?p1:(uT<TI?p2:p3);
   vec3 q=uT<TB?mix(a0,GA,min(ue+.03,1.)):(uT<TI?b+vec3(cos(an+.2)*rr,sin(an+.2)*rr*.7,0.):p3+normalize(rnd()+vec3(.2,.6,0.))*.05);
   vec2 dv=(q-p).xy;vR=atan(dv.y,dv.x)+3.14159;
   vA=(uT>TN-.02&&id<.55)?1.:0.;vK=0.;put(p,.85+.15*aSeed.y);}`,TAD_P);
  // gotas del impacto
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.5,0.))*(1.8+1.8*aSeed.z);vec3 p=HP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.17+.08*aSeed.w);}`,DROP());
  // humo violeta del Gafe alrededor de la cabeza
  S.pts(L.part,10,VV+K+`void main(){float k=fract((uT-${f(TJ)})/.8+aSeed.x);float an=aSeed.y*6.2832+uT;vec3 p=vec3(${f(TX)},2.,0.)+vec3(cos(an)*.45,k*.6,sin(an)*.35);
   vA=uT>${f(TJ)}&&uT<1.95?sin(k*3.14159)*.8:0.;vK=k*.6;vR=aSeed.w*6.28;put(p,.3+.1*aSeed.z);}`,S.MATTER_FS(C.puff,{relief:3,col:VIOLET}));
  a.pose=function(te,o){
    const ia=te-TI, ij=te-TJ;
    const u=cl((te-TB)/(TI-TB)),ue=u*u*(0.6+0.4*u);
    bub.position.lerpVectors(GA,HP,ue); bub.position.y+=Math.sin(ue*Math.PI)*0.7;
    const bk=ss(TB-0.05,TB+0.15,te); bub.scale.setScalar(Math.max(bk*(1.5+0.05*Math.sin(te*10)),0.001)); bub.visible=bk>0.001&&ia<0; set(bub,0,bk);
    spark.pose(ia,HP,0.9); ring.pose(ia,TX-0.1,0,0.45,0.9);
    pool.visible=ia>=0; pool.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(pool,ia>=0?-0.1+1.1*ss(0.5,1.1,ia):0,1);
    // estrella del crítico: aparece, se agrieta y se parte en dos
    const sk=ss(0,0.15,ij), cr=ss(0.2,0.4,ij), sp=ss(0.45,0.8,ij), fade=1-ss(0.75,0.95,ij);
    halves.forEach((m,i)=>{const sd=i?-1:1; tmp.set(TX+sd*0.5*sp,2.45-0.6*sp*sp+0.05*Math.sin(te*6),0); towardCam(m.position,tmp,0.4);
      billboard(m,-sd*0.5*sp); m.scale.setScalar(Math.max(1.5*sk,0.001)); m.visible=ij>=0&&fade>0;
      m.material.uniforms.uA.value=fade; m.material.uniforms.uCr.value=cr;});
    const h=hitE(ia,7);
    target.position.x=TX+0.2*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.16*h*Math.cos(ia*16);
    o.em=0.35*h+0.25*sk*fade; o.emc.copy(ij>=0?COL.set(0x8a5ad8):U.uC1.value);
    if(ia<0){o.g.copy(te<TB?GA:bub.position);o.gs=0.6;o.ga=0.1;o.li=1.2;}
    else{o.g.copy(HP);o.gs=1+2.5*ia;o.ga=Math.exp(-ia*9)*0.4;o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HP);o.shake=0.4;o.dist=0.6;o.flash=0.5;
  };
}});

VFX.module("Estilizado · Acuático · Cola",defs);
})();

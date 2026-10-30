// =====================================================================
// ESTILIZADO · REPTIL · BOCA (Hito 101) — las 6 cartas de boca de Reptil hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_rbChemicalFang…). Mismos dur / ti / fases que las originales, así el daño llega igual.
// Identidad reptil: escamas violeta, encías y fauces de materia con luz en 3 bandas, más el acento de cada carta
// (ácido lima, sombra, carmesí, tortuga de piedra, encía rosa, cola de dinosaurio jade).
// Semántica según PartCards.js:
//   Chemical Fang (cuerpo a cuerpo, daño; más daño si el rival está envenenado) · Kotaro (1–3 casillas, 2 golpes)
//   Razor Bite (cuerpo a cuerpo, daño + robo de vida 50 %) · Tiny Turtle (cuerpo a cuerpo, daño + Aturdido)
//   Toothless Bite (2–5 casillas, daño) · Tiny Dino (aliado: cura 60 + −15 % de daño recibido)
// La boca del lanzador ≈ (−3.42, 1.52). Las fauces son billboards de materia (sin profundidad) sobre el objetivo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CHEM=pal("Sty Reptil · Ácido",["#c8ff52","#6a2fa8"]);
const P_KOT=pal("Sty Reptil · Sombra",["#c58cff","#3a1460"]);
const P_RAZ=pal("Sty Reptil · Carmesí",["#ff6b7d","#6b1240"]);
const P_TUR=pal("Sty Reptil · Tortuga",["#ffd45a","#7b3fb4"]);
const P_TOO=pal("Sty Reptil · Encía",["#ff9bd6","#5b2aa0"]);
const P_DIN=pal("Sty Reptil · Dino",["#8ff2c0","#6a34b0"]);

const TX=3.4, CX=-3.7, MO=V3(-3.42,1.52,0.05);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const ZONES={zoneCaster:0.5,zoneTarget:1.3};
// plano de suelo con segmentos a lo largo de x (el pasillo del puente se deforma vértice a vértice)
const groundStrip=(len,w,x,y,mat,seg=56)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,w,seg,1).rotateX(-Math.PI/2),mat);m.position.set(x,y,0);return m;};
// une geometrías en una sola malla (así se mueve entera, rígida). Cada pieza desplaza su uv.x en `ox` para que el
// fragment shader sepa qué parte es: part = floor(vUv.x/10).
function mergeGeos(list){
  const pos=[],nor=[],uv=[];
  for(const [g0,ox] of list){const g=g0.index?g0.toNonIndexed():g0;const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
    for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));nor.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(u.getX(i)+ox,u.getY(i));}}
  const G=new THREE.BufferGeometry();
  G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  G.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));G.computeBoundingSphere();return G;
}

// ---------- colores de materia (semánticos, fijos) ----------
const EARTH="vec3(.55,.42,.29)", ACID="vec3(.62,.95,.18)", GUMV="vec3(.4,.17,.55)", FUME="vec3(.44,.38,.52)",
  SHADOW="vec3(.17,.07,.24)", LILAC="vec3(.82,.62,1.)", GUMC="vec3(.5,.08,.2)", IVORY="vec3(.97,.9,.8)",
  BLOOD="vec3(.72,.04,.1)", CREAM="vec3(.96,.9,.74)", GUMP="vec3(.86,.3,.58)", GHOST="vec3(.72,.6,1.)",
  CURSE="vec3(.42,.18,.72)", SCALEV="vec3(.45,.26,.62)", STONE="vec3(.58,.52,.64)", HEAL="vec3(.45,.95,.55)";

// ---------- shaders compartidos ----------
// fauces en billboard (arriba uQ = 1, abajo uQ = −1): encía en tubo iluminado + dientes.
//   teeth: 'fang' (colmillos largos) · 'saw' (sierra) · 'none' (encía gomosa sin dientes, labio grueso)
const JAW=({teeth,gum,tooth=IVORY,glow='0.'})=>`uniform float uQ;uniform float uEr;
void main(){vec2 p=(vUv-.5)*2.;p.y*=uQ;
 float ax=abs(p.x);float g=.4*(1.-p.x*p.x)-.08;
 float th=${teeth==='none'?'.3':'.18'}*sqrt(max(1.-p.x*p.x,0.))+.02;
 float arcD=(p.y-g)/th;float arc=smoothstep(1.,.75,abs(arcD))*smoothstep(.98,.86,ax);
 float fang=0.,fk=0.,fx=0.;
 ${teeth==='fang'?`for(int i=0;i<3;i++){float xc=i==0?.52:(i==1?.24:.0);float Lf=i==0?.64:(i==1?.34:.22);float bw=i==0?.13:(i==1?.085:.07);
  float y0=.4*(1.-xc*xc)-.08;float dy=y0-p.y;float k=clamp(dy/Lf,0.,1.);
  float xx=(i==2?p.x:ax-xc+.07*k*k);float w=bw*(1.-k)+.006;
  float inF=step(-.02,dy)*step(dy,Lf)*smoothstep(w,w*.7,abs(xx));
  if(inF>fang){fang=inF;fk=k;fx=xx/w;}}`:''}
 ${teeth==='saw'?`{float sw=.19;float kx=(p.x+.855)/sw;float fxx=fract(kx)-.5;
  float y0=g-th*.4;float dy=y0-p.y;float Lt=.27*(1.-.3*ax);float k=clamp(dy/Lt,0.,1.);float w=.5*(1.-k);
  float inF=step(0.,dy)*step(dy,Lt)*smoothstep(w,w*.75,abs(fxx))*step(ax,.86);
  if(inF>fang){fang=inF;fk=k;fx=fxx/max(w,.01);}}`:''}
 float m=max(arc,fang);if(m<.02)discard;
 vec3 L=stySunV();
 vec3 nF=normalize(vec3(fx*.9*sign(p.x+.001),.25,1.));vec3 nA=normalize(vec3(0.,-arcD*.8*uQ,1.));
 float lF=styLight(nF,L),lA=styLight(nA,L);
 vec3 tc=${tooth};vec3 cF=styRampOf(tc,.28+.6*lF)*styTint(lF)+tc*${glow}*smoothstep(.45,1.,fk);
 vec3 cA=styRampOf(${gum},.2+.62*lA)*styTint(lA)${teeth==='none'?'+vec3(1.,.9,.95)*.22*smoothstep(.65,.95,-arcD*uQ)*step(.5,lA)':''};
 vec3 c=fang>arc?cF:cA;
 float er=styErode(m*.45+styNoise(vUv*1.2+vec2(uQ*.3,0.)).r*.55,uEr,.09);
 gl_FragColor=vec4(c,m*er*uA);}`;
const jawMat=(o)=>S.mat(JAW(o),{uQ:{value:1},uEr:{value:-0.2}},{depthTest:false});
function jawPair(L,w,h,o){const up=new THREE.Mesh(new THREE.PlaneGeometry(w,h),jawMat(o)),dn=new THREE.Mesh(new THREE.PlaneGeometry(w*0.84,h*0.86),jawMat(o));
  dn.material.uniforms.uQ.value=-1;L.add(up,dn);return [up,dn];}
// cierre de las fauces: abiertas → se cierran de golpe (con estiramiento) → rebote y se separan un poco
function jawOff(te,T0,TS,TI,G0,CO){let off,smear=1;
  if(te<TS)off=CO+G0*(0.85+0.15*ss(T0,TS,te));
  else if(te<TI){const k=(te-TS)/(TI-TS);off=CO+G0*(1-k*k*k);smear=1+0.45*k*k;}
  else{const ia=te-TI;off=CO-0.015*Math.sin(ia*70)*Math.exp(-ia*14)+0.12*ss(TI+0.06,TI+0.3,te);}
  return [off,smear];}
function poseJaws(J,P,off,smear,on,er,{dx=0,ang=0,k=1,toCam=0.5}={}){const [up,dn]=J;
  towardCam(tmp,P,toCam); up.position.copy(tmp).add(tmp2.set(dx,off,0)); dn.position.copy(tmp).add(tmp2.set(-dx,-off*0.85,0));
  billboard(up,ang+0.1*(off-0.1)); billboard(dn,ang-0.08*(off-0.1));
  up.scale.set(k,smear*k,k); dn.scale.set(k,smear*k,k);
  up.visible=dn.visible=on>0.001&&er<1.05;
  for(const j of J){j.material.uniforms.uA.value=on;j.material.uniforms.uEr.value=er;}}
// mancha en el suelo (materia): col = color GLSL, uP = erosión; sheen = brillo húmedo
const STAIN=(col,{alpha=.6,lo=.12,hi=.3,sheen=0}={})=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);vec3 c=styRampOf(${col},${f(lo)}+${f(hi)}*n);
 c+=vec3(1.)*${f(sheen)}*step(.82,styNoise(vUv*1.6+uT*.15).a)*step(r,.6);
 gl_FragColor=vec4(c,m*er*uA*${f(alpha)});}`;
// burbuja (ácido): borde de color iluminado, centro casi transparente, brillo duro
const BUB=(col)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
 float rim=smoothstep(.32,.43,d)*smoothstep(.5,.45,d);float hl=step(length(q-vec2(-.13,-.14)),.075);
 float a=(rim*.95+.22*smoothstep(.45,0.,d)+hl)*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${col},.5+.35*(.5-q.y)),vec3(1.,1.,.9),hl),a);}`;
// bola iluminada (orbe de materia): colExpr en función de q (−.5..+.5) y de la luz l
const BALL_P=(colExpr)=>S.PV+`void main(){vec2 q=styPC()-.5;if(length(q)>.46)discard;
 vec3 n=normalize(vec3(q*2.1,sqrt(max(0.,1.-dot(q*2.1,q*2.1)))));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.7+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 vec3 c=${colExpr};gl_FragColor=vec4(c*styTint(l),er*vA);}`;
// caparazón / cúpula de energía con hexágonos: borde de fresnel, revela de abajo arriba (uP), se erosiona (uD), destello uF
const HEXD=`float hexD(vec2 p){vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(p,r)-h,b=mod(p-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
 return max(dot(abs(g),vec2(.5,.866)),abs(g.x));}`;
const HEXSHELL_FS=HEXD+`uniform float uD;uniform float uF;uniform float uR;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 if(h>uP*2.3-1.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.15,uD,.1);
 float hx=smoothstep(.4,.47,hexD(vUv*vec2(16.,8.)));
 float m=(pow(fr,1.8)*.85+.12+hx*.45)*er;
 gl_FragColor=vec4(styRamp(.5+.45*fr+.2*hx)*(.95+.7*uF),min(m,1.)*uA);}`;

const defs=[];

// =====================================================================
// 1 · CHEMICAL FANG — fauces violeta con colmillos de ácido lima se abren sobre el rival goteando, muerden con
//     estiramiento y salpican ácido; el rival burbujea (picaduras), humea y queda un charco que chisporrotea.
//     (Más daño si el rival está envenenado: se lee en el ácido, no hay estado nuevo). ti 0,62 s
// =====================================================================
defs.push({key:"sty_rbChemicalFang",name:"Chemical Fang (estilizado)",dur:2.0,ti:0.62,pal:P_CHEM,tier:2,stylized:true,...ZONES,
  phases:[["Fauces",0],["Goteo",0.18],["Mordida",0.62],["Corrosión",0.8],["Disolución",1.3],["Fin",1.7]],
build(a){
  const L=a.L,T0=0.04,TS=0.46,TI=0.62;
  const BP=V3(3.08,1.38,0);
  const J=jawPair(L.mesh,2.3,1.5,{teeth:'fang',gum:GUMV,tooth:ACID,glow:'.7'});
  const spark=S.hitSpark(L.mesh,2.2,{seed:0.41,toCam:0.65,spin:0.3});
  const ring=S.groundRing(L.decal,2.7);
  const puddle=groundPlane(2.1,TX-0.05,0.026,S.mat(STAIN(ACID,{alpha:.7,lo:.25,hi:.35,sheen:.5}),{},{mode:'matter'})); L.decal.add(puddle);
  const K=`const float TI=${f(TI)};const vec3 BP=${v3(BP)};const float TX=${f(TX)};`;
  // gotas de ácido que caen de los colmillos (antes de morder) y del rival (después)
  S.pts(L.part,18,VV+K+`void main(){float s=.16+aSeed.x*1.1;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=s<TI?vec3(BP.x+(aSeed.z-.5)*.9,BP.y+.05,.45):vec3(TX+(aSeed.z-.5)*.7,.5+aSeed.y*.8,.42);
   vec3 p=b+vec3(0.,-4.8*t*t,0.);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;
   put(p,.15+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:ACID,bias:.05}));
  // salpicadura del mordisco
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.25,.6,.55))*(1.8+1.9*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,-v.y)+3.14159;put(p,.17+.08*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:ACID}));
  // picaduras que burbujean sobre el cuerpo del rival
  S.pts(L.part,22,VV+K+`void main(){float s=TI+.08+aSeed.x*1.;float life=.32+aSeed.y*.18;float age=(uT-s)/life;
   float an=(aSeed.z-.5)*2.4;vec3 p=vec3(TX+sin(an)*.44,.3+aSeed.y*1.15+age*.12,cos(an)*.44+.05);
   vA=(age>0.&&age<1.)?1.:0.;vK=0.;vR=0.;put(p,(.08+.16*aSeed.w)*(.4+.8*age));}`,BUB(ACID));
  // humo de la corrosión
  S.pts(L.part,14,VV+K+`void main(){float s=TI+.1+aSeed.x*.95;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(TX+(aSeed.z-.5)*.7,.55+aSeed.y*.7+t*.9,.25)+vec3(sin(t*3.+aSeed.w*6.)*.12,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.34+.18*aSeed.y)*(.7+.7*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:FUME,bias:.02}));
  // motas lima calientes
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.25+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=BP+normalize(rnd()+vec3(0.,.3,.4))*(.3+2.*aSeed.z)*(1.-exp(-t*6.));
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.y*6.28;put(p,.11+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.position.x=CX+0.25*ss(0.36,TI,te)-0.25*ss(TI+0.1,1.0,te);
    caster.rotation.z=0.12*ss(0,0.3,te)-0.32*ss(0.4,TI,te)+0.2*ss(TI+0.05,1.0,te);
    const hit=hitE(ia,7), cor=ss(TI+0.05,TI+0.2,te)*(1-ss(1.5,1.9,te));
    target.position.x=TX+0.16*hit*(1-Math.exp(-Math.max(ia,0)*30))+0.015*cor*Math.sin(te*47);
    target.rotation.z=-hit*0.22*Math.cos(ia*16); target.scale.set(1+0.04*hit,1-0.06*hit,1+0.04*hit);
    const tx=target.position.x-TX;
    let [off,smear]=jawOff(te,T0,TS,TI,0.78,0.16); if(te<TS)off+=0.04*Math.sin(te*9);
    const on=ss(T0-0.04,T0+0.1,te), er=ia<0?-0.2:-0.2+1.25*ss(0.1,0.42,ia);
    poseJaws(J,tmp3.set(BP.x+tx,BP.y,0),off,smear,on,er);
    spark.pose(ia,tmp3.set(BP.x+tx,BP.y,0));
    ring.pose(ia,target.position.x,0,0.45);
    puddle.visible=ia>=0; puddle.scale.setScalar(0.4+0.6*e3(ia/0.3)); set(puddle,ia>=0?-0.1+1.15*ss(1.35,1.95,te):0,1);
    o.em=0.38*cor*(0.8+0.2*Math.sin(te*20)); o.emc.setRGB(0.6,0.95,0.2);
    if(ia<0){o.g.copy(BP);o.gs=0.55*on;o.ga=0.1*on;o.li=1.3*on;}
    else{o.g.set(BP.x+tx,BP.y,0);o.gs=1+1.6*ia;o.ga=Math.exp(-ia*12)*0.35;o.li=4.2*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(BP);o.shake=0.3;o.dist=0.6;o.flash=0.6;
  };
}});

// =====================================================================
// 2 · KOTARO — el lanzador se hunde en su sombra; la sombra cruza el suelo hasta el rival y de su charco salen dos
//     fauces de sombra con colmillos lila (y ojos encendidos) que muerden dos veces seguidas. Después la sombra
//     vuelve al lanzador, que reaparece. ti 0,6 s y 0,98 s
// =====================================================================
const STRIP_FS=`uniform float uLo;uniform float uHi;
void main(){float u=vUv.x;float av=abs(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*5.-uT*.6,vUv.y*.8)).r;float w=.32+.34*n;
 float m=smoothstep(w,w-.14,av)*smoothstep(uHi,uHi-.035,u)*smoothstep(uLo,uLo+.07,u);if(m<.02)discard;
 float rim=smoothstep(w-.16,w-.04,av);vec3 c=mix(styRampOf(${SHADOW},.2+.3*n),${LILAC}*.85,rim*.45);
 gl_FragColor=vec4(c,m*uA*.95);}`;
const POOL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+uT*.05).r*.6+styNoise(vUv*.5+.3).g*.4;
 float rr=r+(n-.5)*.4;float m=smoothstep(.85,.7,rr);if(m<.01)discard;float er=styErode(n*.7+m*.3,uP,.12);
 float rim=smoothstep(.45,.72,rr);vec3 c=mix(styRampOf(${SHADOW},.18+.25*n),${LILAC}*.9,rim*.5);
 gl_FragColor=vec4(c,m*er*uA*.9);}`;
defs.push({key:"sty_rbKotaro",name:"Kotaro (estilizado)",dur:2.3,ti:0.6,pal:P_KOT,tier:2,stylized:true,...ZONES,
  phases:[["Sombra",0],["Acecho",0.18],["Mordida 1",0.6],["Mordida 2",0.98],["Retirada",1.12],["Regreso",1.5]],
build(a){
  const L=a.L,TB=[0.6,0.98];
  const X0=CX-0.3,LEN=TX-CX+0.6;
  const strip=groundStrip(LEN,1.7,X0+LEN/2,0.025,S.mat(STRIP_FS,{uLo:{value:0},uHi:{value:0}},{mode:'matter'})); L.decal.add(strip);
  const su=strip.material.uniforms;
  const poolC=groundPlane(1.7,CX,0.028,S.mat(POOL_FS,{},{mode:'matter'})), poolT=groundPlane(2.1,TX,0.029,S.mat(POOL_FS,{},{mode:'matter'}));
  L.decal.add(poolC,poolT);
  const jaw={gum:'vec3(.3,.13,.42)',tooth:LILAC,glow:'.9',teeth:'fang'};
  const J1=jawPair(L.mesh,1.85,1.2,jaw), J2=jawPair(L.mesh,2.3,1.5,jaw);
  const P1=V3(TX-0.3,0.95,0.25), P2=V3(TX-0.1,1.45,0.1);
  const sp=[S.hitSpark(L.mesh,1.8,{seed:0.23}),S.hitSpark(L.mesh,2.2,{seed:0.71})];
  const ring=S.groundRing(L.decal,2.4);
  const K=`const float TX=${f(TX)};const float CX=${f(CX)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};`;
  // ojos encendidos de las dos fauces (aparecen al salir del charco)
  const eyeU={uE1:{value:new THREE.Vector3()},uE2:{value:new THREE.Vector3()},uO1:{value:0},uO2:{value:0}};
  S.pts(L.part,4,VV+`uniform vec3 uE1;uniform vec3 uE2;uniform float uO1;uniform float uO2;void main(){float i=floor(aSeed.x*4.);
   vec3 b=i<2.?uE1:uE2;float o=i<2.?uO1:uO2;float side=mod(i,2.)*2.-1.;
   vec3 p=b+vec3(side*(i<2.?.24:.3),0.,0.);vA=o;vK=0.;vR=0.;put(p,(i<2.?.36:.44)*(.8+.2*sin(uT*30.)));}`,
   S.ENERGY_FS(C.spark,{gain:1.6}),{mode:'energy',uniforms:eyeU});
  // jirones de sombra que suben de los charcos
  S.pts(L.part,22,VV+K+`void main(){float s=aSeed.x*1.7;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float bx=(s<.35||s>1.4)?CX:TX;float an=aSeed.z*6.2832;
   vec3 p=vec3(bx+cos(an)*.55,.08+t*(.7+.5*aSeed.w),sin(an)*.45);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.3+.15*aSeed.y)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:SHADOW,bias:.12}));
  // esquirlas lila en cada mordisco
  S.pts(L.part,16,VV+K+`void main(){float i=step(.5,aSeed.x);float s=(i<.5?.6:.98)+aSeed.y*.03;float life=.42+aSeed.z*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=i<.5?P1:P2;vec3 v=normalize(rnd()+vec3(-.2,.6,.5))*(1.8+1.4*aSeed.w);vec3 p=b+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.18+.07*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:LILAC,bias:-.05}));
  a.pose=function(te,o){
    // sombra: avanza del lanzador al rival y vuelve
    let lo,hi;
    if(te<1.12){hi=e3((te-0.18)/0.4)*(te>0.18?1:0);lo=ss(0.42,0.62,te);}
    else{lo=1-e3((te-1.12)/0.36);hi=1-ss(1.3,1.52,te);if(lo<0.02)lo=0;}
    su.uLo.value=lo; su.uHi.value=Math.max(hi,lo+0.001); strip.visible=hi-lo>0.005;
    strip.material.uniforms.uA.value=1;
    const pc=ss(0,0.16,te)*(1-ss(0.25,0.5,te))+ss(1.36,1.5,te)*(1-ss(1.65,2.1,te));
    poolC.visible=pc>0.01; poolC.scale.setScalar(Math.max(0.5+0.5*pc,0.001)); set(poolC,0.15,pc);
    const pt=ss(0.42,0.6,te)*(1-ss(1.12,1.4,te));
    poolT.visible=pt>0.01; poolT.scale.setScalar(Math.max(0.5+0.5*pt,0.001)); set(poolT,0.15,pt);
    // el lanzador se funde en su sombra y reaparece
    const sink=ss(0,0.2,te)*(1-ss(1.42,1.62,te));
    caster.position.y=-0.35*sink; caster.scale.set(1+0.08*sink,1-0.25*sink,1+0.08*sink);
    glowOf(caster,COL.setRGB(0.6,0.35,1),0.5*sink+0.45*ss(1.5,1.6,te)*(1-ss(1.65,2,te)));
    // mordisco 1: sale bajo del charco
    const r1=ss(0.4,0.56,te);
    let [o1,s1]=jawOff(te,0.4,0.5,TB[0],0.62,0.13);
    const e1=te<TB[0]?-0.2:-0.2+1.25*ss(0.08,0.34,te-TB[0]);
    poseJaws(J1,tmp3.set(P1.x,P1.y-0.7*(1-r1),P1.z),o1,s1,r1,e1,{ang:-0.12});
    eyeU.uE1.value.set(P1.x-0.05,P1.y+0.65-0.7*(1-r1),P1.z+0.45); eyeU.uO1.value=r1*(1-ss(TB[0]+0.05,TB[0]+0.25,te));
    // mordisco 2: más grande, desde arriba
    const r2=ss(0.8,0.94,te);
    let [o2,s2]=jawOff(te,0.8,0.88,TB[1],0.78,0.16);
    const e2=te<TB[1]?-0.2:-0.2+1.25*ss(0.08,0.36,te-TB[1]);
    poseJaws(J2,tmp3.set(P2.x,P2.y+0.6*(1-r2),P2.z),o2,s2,r2,e2,{ang:0.15});
    eyeU.uE2.value.set(P2.x-0.05,P2.y+0.85+0.6*(1-r2),P2.z+0.45); eyeU.uO2.value=r2*(1-ss(TB[1]+0.05,TB[1]+0.25,te));
    sp[0].pose(te-TB[0],P1,0.85); sp[1].pose(te-TB[1],P2,1);
    ring.pose(te-TB[1],TX,0,0.42);
    const h1=hitE(te-TB[0],8), h2=hitE(te-TB[1],7);
    target.position.x=TX+0.12*h1+0.16*h2; target.rotation.z=-0.16*h1*Math.cos((te-TB[0])*18)-0.2*h2*Math.cos((te-TB[1])*16);
    target.scale.set(1,1-0.05*(h1+h2),1);
    o.em=0.3*Math.max(h1,h2); o.emc.setRGB(0.7,0.45,1);
    if(te<TB[0]){o.g.set(CX+(TX-CX)*hi,0.3,0);o.gs=0.5;o.ga=0.12;o.li=1.2;}
    else{const ib=te<TB[1]?te-TB[0]:te-TB[1];o.g.copy(te<TB[1]?P1:P2);o.gs=0.9+ib;o.ga=Math.exp(-ib*10)*0.3;o.li=3.5*Math.exp(-ib*5);}
    if(te<TB[1]){o.ia=te-TB[0];o.c.copy(P1);o.flash=0.6;}else{o.ia=te-TB[1];o.c.copy(P2);o.flash=0.35;}
    o.shake=0.2;o.dist=0.5;
  };
}});

// =====================================================================
// 3 · RAZOR BITE — fauces carmesí de dientes de sierra muerden y rechinan de lado a lado; quedan tres desgarros que
//     sangran y un hilo de orbes de sangre vuelve en arco al lanzador, que se cura (robo de vida). ti 0,6 s
// =====================================================================
const TEAR_FS=`uniform float uOpen;uniform float uEr;
void main(){vec2 p=(vUv-.5)*2.;float y=p.y-.22*(1.-p.x*p.x);float w=(.04+.24*(1.-p.x*p.x))*uOpen;
 float d=abs(y)/max(w,.001);float m=smoothstep(1.,.8,d)*smoothstep(.98,.85,abs(p.x));if(m<.02)discard;
 float core=smoothstep(.65,.05,d);vec3 c=mix(styRampOf(${BLOOD},.6),vec3(.2,.01,.05),core);
 float er=styErode(m*.4+styNoise(vUv*.8+uP).r*.6,uEr,.08);gl_FragColor=vec4(c,m*er);}`;
defs.push({key:"sty_rbRazorBite",name:"Razor Bite (estilizado)",dur:2.2,ti:0.6,pal:P_RAZ,tier:2,stylized:true,...ZONES,
  phases:[["Sierra",0],["Mordida",0.6],["Desgarro",0.68],["Heridas",0.95],["Sangre",1.05],["Fin",1.8]],
build(a){
  const L=a.L,T0=0.04,TS=0.44,TI=0.6;
  const BP=V3(3.08,1.3,0);
  const J=jawPair(L.mesh,2.4,1.5,{teeth:'saw',gum:GUMC,tooth:IVORY});
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.58,toCam:0.65});
  const grind=[0,1,2].map(i=>S.hitSpark(L.mesh,0.9,{seed:0.2+i*0.25,life:0.12}));
  const ring=S.groundRing(L.decal,2.6), healRing=S.groundRing(L.decal,2.4);
  const tears=[[0.68,V3(TX-0.05,1.15,0),0.5],[0.78,V3(TX+0.05,0.8,0),-0.35],[0.88,V3(TX-0.1,0.5,0),0.2]].map(([t0,p,ang],i)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1.05,0.45),S.mat(TEAR_FS,{uOpen:{value:0},uEr:{value:-0.2}},{mode:'matter',depthTest:false}));
    m.material.uniforms.uP.value=i*0.37; L.mesh.add(m); return {m,t0,p,ang};});
  const stain=groundPlane(1.6,TX,0.026,S.mat(STAIN(BLOOD,{alpha:.65,lo:.2,hi:.3,sheen:.4}),{},{mode:'matter'})); L.decal.add(stain);
  const K=`const float TI=${f(TI)};const vec3 BP=${v3(BP)};const float TX=${f(TX)};const float CX=${f(CX)};`;
  // sangre del mordisco (salpicadura) y gotas de los desgarros
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.35;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.55,.6))*(1.4+1.6*aSeed.z);vec3 p=BP+vec3((aSeed.w-.5)*.4,-.2*aSeed.y,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,-v.y)+3.14159;put(p,.15+.07*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:BLOOD,bias:.08}));
  S.pts(L.part,14,VV+K+`void main(){float s=.75+aSeed.x*.8;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(TX+(aSeed.z-.5)*.5,.45+aSeed.y*.75,.46)+vec3(0.,-4.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.13+.05*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:BLOOD,bias:.04}));
  // chispas del rechinar
  S.pts(L.part,24,VV+K+`void main(){float s=.66+aSeed.x*.3;float life=.18+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.4,.6))*(2.5+2.*aSeed.z);vec3 p=BP+vec3((aSeed.w-.5)*.8,-.05,.3)+v*t;
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=atan(v.y,v.x);put(p,.12+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // robo de vida: orbes de sangre en arco hasta el lanzador
  S.pts(L.part,10,VV+K+`void main(){float i=floor(aSeed.x*10.);float s=1.05+i*.045;float u=clamp((uT-s)/.48,0.,1.);
   vec3 a0=vec3(TX-.2,1.,.2),a1=vec3(CX+.15,1.05,.1);vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*(1.5+.3*sin(i*2.1)),(aSeed.y-.5)*.6*sin(u*3.14159));
   vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.85,1.,u);vR=0.;put(p,(.24+.06*aSeed.z)*(1.-.35*u));}`,
   BALL_P(`styRampOf(${BLOOD},.3+.55*l+.25*step(length(q-vec2(-.14,.14)),.09))`));
  // motas de cura que suben en el lanzador
  S.pts(L.part,16,VV+K+`void main(){float s=1.45+aSeed.x*.4;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*.5,.15+t*1.9,sin(an)*.45);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*2.;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.position.x=CX+0.22*ss(0.34,TI,te)-0.22*ss(TI+0.4,1.1,te);
    caster.rotation.z=0.12*ss(0,0.3,te)-0.3*ss(0.38,TI,te)+0.18*ss(TI+0.35,1.0,te);
    // rechinar: de lado a lado entre 0,68 y 0,95
    const gr=ss(TI+0.05,TI+0.1,te)*(1-ss(0.9,0.98,te)), gx=0.13*gr*Math.sin((te-TI)*42);
    const hit=hitE(ia,6);
    target.position.x=TX+0.1*hit+gx*0.5; target.rotation.z=-0.14*hit*Math.cos(ia*20)+gx*0.6;
    const tx=target.position.x-TX;
    let [off,smear]=jawOff(te,T0,TS,TI,0.76,0.15); if(gr>0)off=0.11;
    const on=ss(T0-0.04,T0+0.1,te), er=ia<0?-0.2:-0.2+1.25*ss(0.36,0.6,ia);
    poseJaws(J,tmp3.set(BP.x+tx,BP.y,0),off,smear,on,er,{dx:gx*0.6,ang:gx*0.5});
    spark.pose(ia,tmp3.set(BP.x+tx,BP.y,0));
    grind.forEach((g,i)=>g.pose(te-(0.7+i*0.09),tmp3.set(BP.x+tx+(i-1)*0.3,BP.y-0.05,0),0.8));
    ring.pose(ia,target.position.x,0,0.45);
    for(const T of tears){const k=te-T.t0;towardCam(T.m.position,T.p,0.5);T.m.position.x+=tx;billboard(T.m,T.ang);
      T.m.visible=k>=0&&te<1.95; T.m.material.uniforms.uOpen.value=e3(k/0.08); T.m.material.uniforms.uEr.value=-0.2+1.2*ss(1.45,1.9,te);}
    stain.visible=ia>=0; stain.scale.setScalar(0.4+0.6*e3((ia-0.15)/0.5)); set(stain,ia>=0?-0.1+1.15*ss(1.5,2.15,te):0,ia>0.15?1:0);
    healRing.pose(te-1.5,CX,0,0.5,0.9);
    const hl=ss(1.48,1.58,te)*(1-ss(1.7,2.05,te)); glowOf(caster,COL.setRGB(1,0.4,0.5),0.5*hl);
    o.em=0.25*hit+0.15*gr; o.emc.setRGB(1,0.25,0.3);
    if(ia<0){o.g.copy(BP);o.gs=0.5*on;o.ga=0.1*on;o.li=1.2*on;}
    else if(te<1.45){o.g.set(BP.x+tx,BP.y,0);o.gs=1+ia;o.ga=Math.exp(-ia*10)*0.3+0.08*gr;o.li=4*Math.exp(-ia*5)+gr;}
    else{o.g.set(CX,1,0);o.gs=1.2;o.ga=0.25*hl;o.li=2*hl;}
    o.ia=ia;o.c.copy(BP);o.shake=0.35;o.dist=0.6;o.flash=0.6;
  };
}});

// =====================================================================
// 4 · TINY TURTLE (Shinji) — un huevito moteado salta de la boca y eclosiona: sale una tortuguita de caparazón con
//     placas hexagonales, corretea levantando polvo hasta el pie del rival y lo muerde; el rival brinca de dolor y
//     queda Aturdido (estrellas doradas en órbita). La tortuga suelta, retrocede y se desvanece. ti 1,0 s
// =====================================================================
const EGG_FS=`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float nz=styNoise(vUv*vec2(2.,1.)+.3).g;
 vec3 base=mix(${CREAM},vec3(.55,.36,.62),step(.78,styNoise(vUv*vec2(3.,1.6)+.71).r));
 vec3 c=styRampOf(base,clamp(.22+.58*l+(nz-.5)*.06,0.,1.))*styTint(l);c+=vec3(1.,.85,.4)*uK*(.4+.6*step(.6,nz));
 gl_FragColor=vec4(c,1.);}`;
const TURTLE_FS=HEXD+`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float part=floor(vUv.x/10.+.001);vec2 uv=vec2(vUv.x-part*10.,vUv.y);
 float nz=styNoise(vUv*vec2(.13,1.)+.2).r;if(styErode(nz,uQ,.05)<.5)discard;
 vec3 base;float lb=0.;
 if(part<.5){float d=hexD(vec2(uv.x*9.,uv.y*4.4+.3));float seam=smoothstep(.39,.46,d);
  base=mix(vec3(.2,.44,.2),vec3(.4,.66,.26),smoothstep(.36,.0,d)*.75);base=mix(base,vec3(.26,.1,.38),seam);lb=-.08*seam;
  float rim=smoothstep(.16,.06,uv.y);base=mix(base,vec3(.98,.78,.32),rim);lb+=.06*rim;}
 else if(part<1.5){base=vec3(.5,.76,.38);}
 else if(part<2.5){base=vec3(.96,.86,.6);lb=.05;}
 else{base=vec3(.07,.04,.1);lb=-.3;}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb,0.,1.))*styTint(l);
 if(part>2.5)c+=vec3(1.)*step(.9,dot(n,normalize(vec3(.35,.55,.75))))*.9;
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.2*smoothstep(.62,.72,fr)*step(.5,l);
 c+=vec3(1.,.8,.3)*uK;gl_FragColor=vec4(c,1.);}`;
function turtleGeo(){
  const Y=Math.PI/2, list=[];
  list.push([new THREE.SphereGeometry(0.3,28,12,0,Math.PI*2,0,Math.PI/2).scale(1,0.78,1.05).translate(0,0.06,0),0]);   // caparazón
  list.push([new THREE.SphereGeometry(0.13,16,12).translate(0.37,0.13,0),10]);                                           // cabeza
  for(const [x,z] of [[0.19,0.21],[0.19,-0.21],[-0.17,0.2],[-0.17,-0.2]])
    list.push([new THREE.SphereGeometry(0.085,12,8).scale(1,0.62,1).translate(x,0.02,z),10]);                             // patas
  list.push([new THREE.ConeGeometry(0.05,0.16,10).rotateZ(Y).translate(-0.36,0.06,0),10]);                               // cola
  list.push([new THREE.CylinderGeometry(0.3,0.27,0.07,28).scale(1,1,1.05).translate(0,0.05,0),20]);                     // peto
  for(const z of [0.075,-0.075])list.push([new THREE.SphereGeometry(0.036,10,8).translate(0.455,0.19,z),30]);           // ojos
  return mergeGeos(list);
}
defs.push({key:"sty_rbTinyTurtle",name:"Tiny Turtle (estilizado)",dur:2.4,ti:1.0,pal:P_TUR,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.3,
  phases:[["Eclosión",0],["Carrera",0.24],["Mordisco",1.0],["Aturdido",1.12],["Retirada",1.6],["Fin",2.0]],
build(a){
  const L=a.L,TH=0.24,TR=0.27,TA=0.92,TI=1.0;
  const EG=V3(-2.55,0.26,0.3), BF=V3(2.15,0,0.3), BT=V3(3.18,0.45,0.3), SC=2.6;
  const egg=new THREE.Mesh(new THREE.SphereGeometry(0.25,22,16).scale(1,1.25,1),S.mat(EGG_FS,{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(egg);
  const tg=new THREE.Group(); L.mesh.add(tg);
  const tur=new THREE.Mesh(turtleGeo(),S.mat(TURTLE_FS,{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide})); tg.add(tur);
  const tu=tur.material.uniforms;
  const shadow=S.contactShadow(L.decal,1.0), eggShadow=S.contactShadow(L.decal,0.6);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.33,toCam:0.5}), pop=S.hitSpark(L.mesh,0.9,{seed:0.8,life:0.14});
  const ring=S.groundRing(L.decal,2.4);
  const stun=S.status(a,'stun',[target],TI+0.12,2.4);
  const K=`const float TH=${f(TH)};const float TR=${f(TR)};const float TA=${f(TA)};const float TI=${f(TI)};
  const vec3 EG=${v3(EG)};const vec3 BF=${v3(BF)};const vec3 BT=${v3(BT)};
  vec3 path(float s){float u=clamp((s-TR)/(TA-TR),0.,1.);float e=u*u*(3.-2.*u);return vec3(mix(EG.x+.2,BF.x,e),0.,mix(EG.z,BF.z,u)+.12*sin(u*9.42));}`;
  // cáscara del huevo al eclosionar
  S.pts(L.part,10,VV+K+`void main(){float s=TH+aSeed.x*.02;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.9,.2))*(1.2+1.2*aSeed.z);vec3 p=EG+vec3(0.,.1,0.)+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.15+.06*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:CREAM,bias:.06}));
  // polvo de la carrera
  S.pts(L.part,24,VV+K+`void main(){float s=TR+aSeed.x*(TA-TR+.06);float life=.42+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=path(s)+vec3(-.85-t*.4,.08+t*(.4+.3*aSeed.z),(aSeed.w-.5)*.6);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;put(p,(.2+.12*aSeed.z)*(.6+.8*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.06}));
  // polvo y esquirlas del mordisco en el pie
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(BT.x,.08,BT.z)+vec3(cos(an),0.,sin(an)*.6)*(.2+.6*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.3+.15*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.05}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.22+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=BT+normalize(rnd()+vec3(0.,.5,.4))*(.25+1.8*aSeed.z)*(1.-exp(-t*6.));
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.y*6.28;put(p,.12+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  const P=V3(0,0,0);
  const path=(te,out)=>{const u=cl((te-TR)/(TA-TR)),e=u*u*(3-2*u);return out.set(EG.x+0.2+(BF.x-EG.x-0.2)*e,0,EG.z+(BF.z-EG.z)*u+0.12*Math.sin(u*9.42));};
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,0.06,te)-0.1*ss(0.08,0.2,te);
    // huevo: sale de la boca y cae en arco
    const ue=cl(te/TH); egg.visible=te<TH+0.01;
    egg.position.set(MO.x+(EG.x-MO.x)*ue,MO.y+(EG.y-MO.y)*ue+Math.sin(ue*Math.PI)*0.55,MO.z+(EG.z-MO.z)*ue);
    egg.rotation.z=-te*9; egg.scale.setScalar(Math.max(0.6+0.4*e3(te/0.1),0.001)*(1+0.12*ss(TH-0.05,TH,te)));
    egg.material.uniforms.uK.value=0.6*ss(TH-0.07,TH,te);
    eggShadow.pose(egg.position.x,EG.z,0.6,te<TH?0.5*ue:0);
    pop.pose(te-TH,tmp.set(EG.x,0.3,EG.z),0.7);
    // tortuga: eclosiona, corretea, muerde, aguanta, suelta y retrocede
    const hatch=e3((te-TH)/0.1);
    let yaw=0,pitch=0,roll=0,bob=0;
    if(te<TR){P.set(EG.x,0,EG.z);bob=0.06*Math.sin(hatch*Math.PI);}
    else if(te<TA){path(te,P);path(te+0.02,tmp);yaw=-Math.atan2(tmp.z-P.z,tmp.x-P.x);bob=0.05*Math.abs(Math.sin(te*36));roll=0.12*Math.sin(te*36);}
    else if(te<TI+0.15){const k=ss(TA,TI,te);P.set(BF.x+0.18*k,0,BF.z);pitch=0.5*k-0.15*ss(TI,TI+0.15,te);bob=0.1*k;roll=0.05*Math.sin(te*60)*ss(TI,TI+0.05,te);}
    else{const k=ss(1.55,1.95,te);P.set(BF.x+0.18-0.75*k,0,BF.z+0.1*k);pitch=0.35*(1-ss(TI+0.15,TI+0.3,te));bob=0.03*Math.abs(Math.sin(te*30))*k;roll=0.08*Math.sin(te*30)*k;}
    tg.position.set(P.x,P.y+bob,P.z); tg.rotation.set(roll,yaw,pitch,'YXZ'); tg.scale.setScalar(Math.max(SC*(0.35+0.65*hatch),0.001));
    tg.visible=te>=TH;
    tu.uQ.value=-0.1+1.15*ss(1.7,2.05,te); tu.uK.value=0.35*hitE(ia,9);
    shadow.pose(P.x,P.z,1.1,te>=TH?0.55*(1-ss(1.75,2.05,te)):0);
    spark.pose(ia,BT,1); ring.pose(ia,BT.x,BT.z,0.42,0.8);
    // el rival brinca de dolor y se tambalea aturdido
    const hop=ss(TI,TI+0.07,te)*(1-ss(TI+0.1,TI+0.32,te));
    target.position.y=0.32*hop; target.position.x=TX+0.06*hitE(ia,8);
    const env=stun.pose(te); target.rotation.z=0.1*env*Math.sin((te-TI)*5.5)-0.16*hitE(ia,10);
    o.em=0; S.statusGlow(o,[{kind:'stun',env}]);
    if(te<TH){o.g.copy(egg.position);o.gs=0.3;o.ga=0.05;o.li=0.6;}
    else if(ia<0){o.g.set(P.x,0.4,P.z);o.gs=0.5;o.ga=0.06;o.li=0.8;}
    else{o.g.copy(BT);o.gs=0.9+1.5*ia;o.ga=Math.exp(-ia*12)*0.3;o.li=3.5*Math.exp(-ia*6)+0.8*env;}
    o.ia=ia;o.c.copy(BT);o.shake=0.35;o.dist=0.45;o.flash=0.6;
  };
}});

// =====================================================================
// 5 · TOOTHLESS BITE — un bostezo suelta ecos fantasma (anillos de pincel) que cruzan el tablero; sobre el rival
//     aparecen unas encías rosas sin dientes que muerden con rebote de gelatina. Queda una maldición: ojo rúnico,
//     espirales fantasma, y la energía del rival gotea violeta al suelo y se apaga. ti 0,9 s
// =====================================================================
const EYE_FS=`uniform float uOpen;
void main(){vec2 p=(vUv-.5)*2.;float lid=(1.-p.x*p.x)*.58*uOpen;
 float e=abs(p.y)-lid;float inside=step(e,0.)*step(abs(p.x),1.);
 float outline=smoothstep(.09,.0,abs(e))*smoothstep(1.,.9,abs(p.x));
 float ir=length(p);float iris=inside*smoothstep(.36,.33,ir);float pupil=inside*smoothstep(.09,.06,abs(p.x))*smoothstep(.34,.3,ir);
 float m=max(outline,iris*(1.-pupil*.85));if(m<.02)discard;
 vec3 c=outline>iris?styRamp(.85):styRamp(.45+.5*smoothstep(.33,.1,ir));
 float er=styErode(m*.5+styNoise(vUv*.9).r*.5,uP,.1);
 gl_FragColor=vec4(c*1.35,m*er*uA);}`;
const RUNE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float ticks=step(.6,fract(an/6.2832*12.))*smoothstep(.72,.78,r)*smoothstep(.98,.9,r);
 float m=max(s.r*.7,ticks);if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.85);}`;
defs.push({key:"sty_rbToothlessBite",name:"Toothless Bite (estilizado)",dur:2.3,ti:0.9,pal:P_TOO,tier:2,stylized:true,...ZONES,
  phases:[["Bostezo",0],["Eco",0.18],["Mordisco",0.9],["Maldición",1.02],["Drenaje",1.3],["Fin",1.9]],
build(a){
  const L=a.L,T0=0.52,TS=0.72,TI=0.9;
  const BP=V3(3.1,1.42,0), EP=V3(TX,2.45,0);
  const yawn=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),S.mat(S.FS.RING,{},{mode:'energy',depthTest:false})); L.mesh.add(yawn);
  const echoes=[0,1,2,3].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),S.mat(S.FS.RING,{},{mode:'energy'}));L.mesh.add(m);return m;});
  const J=jawPair(L.mesh,2.5,1.5,{teeth:'none',gum:GUMP});
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.12,toCam:0.65});
  const eye=new THREE.Mesh(new THREE.PlaneGeometry(1.05,0.62),S.mat(EYE_FS,{uOpen:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(eye);
  const rune=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(RUNE_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(rune);
  const ring=S.groundRing(L.decal,2.6);
  const stain=groundPlane(1.9,TX,0.026,S.mat(STAIN(CURSE,{alpha:.6,lo:.12,hi:.3}),{},{mode:'matter'})); L.decal.add(stain);
  const K=`const float TI=${f(TI)};const vec3 BP=${v3(BP)};const float TX=${f(TX)};const vec3 MO=${v3(MO)};`;
  // jirones fantasma del eco
  S.pts(L.part,18,VV+K+`void main(){float s=.18+aSeed.x*.6;float u=clamp((uT-.18)/.66,0.,1.);float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float us=clamp((s-.18)/.66,0.,1.);vec3 p=mix(MO,BP,us)+vec3(0.,sin(us*3.14159)*.4+t*.4,(aSeed.z-.5)*.8)+rnd()*.12;
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.26+.14*aSeed.w)*(.6+.7*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:GHOST,bias:.1}));
  // gotas de gelatina rosa del mordisco
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.7,.5))*(1.5+1.5*aSeed.z);vec3 p=BP+v*t+vec3(0.,-6.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,-v.y)+3.14159;put(p,.17+.07*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:GUMP,bias:.05}));
  // espirales fantasma alrededor del rival
  S.pts(L.part,20,VV+K+`void main(){float s=1.02+aSeed.x*.25;float life=.6+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*5.;float rad=.75-.35*age;vec3 p=vec3(TX+cos(an)*rad,.3+age*1.7,sin(an)*rad*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=an;put(p,.16+.07*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // la energía del rival gotea violeta al suelo
  S.pts(L.part,16,VV+K+`void main(){float s=1.28+aSeed.x*.55;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(TX+(aSeed.z-.5)*.75,.4+aSeed.y*.9,.42)+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.15+.05*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:CURSE,bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI;
    // bostezo
    caster.rotation.z=-0.12*ss(0,0.12,te)*(1-ss(0.2,0.4,te));
    const yk=cl(te/0.3); towardCam(yawn.position,MO,0.4); billboard(yawn,0); yawn.scale.setScalar(Math.max(0.4+0.8*e3(yk),0.001));
    yawn.visible=te<0.32; set(yawn,0.1+0.9*yk,1);
    // ecos que cruzan hasta el rival
    echoes.forEach((m,i)=>{const s=0.18+i*0.09,u=cl((te-s)/0.55);m.visible=te>=s&&u<1;
      tmp.lerpVectors(MO,BP,u); tmp.y+=Math.sin(u*Math.PI)*0.4; m.position.copy(tmp); billboard(m,i*0.7);
      m.scale.setScalar(Math.max(0.45+0.7*u,0.001)); set(m,0.1+0.85*ss(0.55,1,u),1);});
    // encías gomosas: mordisco con rebote de gelatina
    const hit=hitE(ia,6);
    target.position.x=TX+0.14*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.18*hit*Math.cos(ia*14);
    const jel=ia>=0?Math.exp(-ia*5)*Math.sin(ia*28):0;
    target.scale.set(1+0.08*jel,1-0.1*jel,1+0.08*jel);
    const tx=target.position.x-TX;
    let [off,smear]=jawOff(te,T0,TS,TI,0.72,0.2);
    const on=ss(T0-0.06,T0+0.06,te), er=ia<0?-0.2:-0.2+1.25*ss(0.25,0.5,ia);
    poseJaws(J,tmp3.set(BP.x+tx,BP.y,0),off,smear*(1-0.22*jel),on,er,{k:1+0.2*jel});
    spark.pose(ia,tmp3.set(BP.x+tx,BP.y,0),0.9);
    ring.pose(ia,target.position.x,0,0.45);
    // maldición: ojo rúnico sobre la cabeza
    const ek=ss(TI+0.1,TI+0.24,te)*(1-ss(1.7,1.88,te));
    towardCam(eye.position,EP,0.6); eye.position.y+=0.05*Math.sin(te*4); billboard(eye,0);
    eye.visible=te>TI+0.1&&te<1.95; eye.material.uniforms.uOpen.value=ek; set(eye,-0.1+1.1*ss(1.75,1.95,te),1);
    towardCam(rune.position,EP,0.55); billboard(rune,te*1.4); rune.visible=eye.visible;
    rune.scale.setScalar(Math.max(0.6+0.4*e3((te-TI-0.1)/0.2),0.001)); set(rune,-0.05+1.05*ss(1.6,1.95,te),ek);
    stain.visible=te>1.3; stain.scale.setScalar(0.4+0.6*e3((te-1.3)/0.4)); set(stain,te>1.3?-0.1+1.15*ss(1.75,2.25,te):0,1);
    const cu=ss(TI+0.1,TI+0.25,te)*(1-ss(1.7,2.1,te));
    o.em=0.3*hit+0.3*cu; o.emc.setRGB(0.55,0.3,0.9);
    if(te<TI-0.1){o.g.set(MO.x+(BP.x-MO.x)*cl((te-0.18)/0.6),1.5,0);o.gs=0.5;o.ga=0.1;o.li=1;}
    else if(ia<0.6){o.g.set(BP.x+tx,BP.y,0);o.gs=0.9+ia;o.ga=Math.max(Math.exp(-ia*10),0)*0.3;o.li=3.5*Math.exp(-Math.max(ia,0)*5);}
    else{o.g.copy(EP);o.gs=1;o.ga=0.15*cu;o.li=1.5*cu;}
    o.ia=ia;o.c.copy(BP);o.shake=0.2;o.dist=0.55;o.flash=0.5;
  };
}});

// =====================================================================
// 6 · TINY DINO (aliado) — se abre una grieta de luz junto al aliado y sale una cola de dinosaurio de escamas violeta
//     con púas de hueso; sube, se arquea y golpea el suelo (ondas y polvo). De la tierra sube la cura (motas jade) y
//     escamas de piedra se cierran en una coraza hexagonal sobre el aliado (−15 % de daño recibido). ti 0,95 s
// =====================================================================
const CRACK_FS=`uniform float uOpen;
void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float n=styNoise(vUv*.9+.2).r;float k=an/6.2832*7.+(n-.5)*1.4+r*.6;float d=abs(fract(k)-.5);
 float line=smoothstep(.07,.0,d*(.5+r))*step(r,.95*uOpen)*smoothstep(1.,.6,r);
 float core=smoothstep(.35*uOpen,0.,r);float m=max(line,core*.8);if(m<.02)discard;
 gl_FragColor=vec4(styRamp(.65+.35*m)*1.4,m*uA);}`;
const TAIL_FS=`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float part=floor(vUv.x/10.+.001);vec2 uv=vec2(vUv.x-part*10.,vUv.y);
 float nz=styNoise(vUv*vec2(.4,1.3)+.15).r;if(styErode(nz,uQ,.05)<.5)discard;
 vec3 base;float lb=0.;
 if(part<.5){vec2 sp=vec2(uv.x*30.,uv.y*11.);sp.x+=.5*mod(floor(sp.y),2.);
  float d=length(fract(sp)-vec2(.5,0.));float seam=smoothstep(.5,.58,d);
  base=mix(${SCALEV},vec3(.62,.42,.8),smoothstep(.5,.1,d)*.5);base=mix(base,vec3(.2,.08,.3),seam*.8);lb=-.06*seam;
  base=mix(base,vec3(.55,.9,.7),smoothstep(.7,1.,uv.x)*.6);}
 else{base=vec3(.95,.9,.78);lb=.04;}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=vec3(.5,1.,.75)*.35*smoothstep(.55,.85,fr);
 c+=vec3(.55,1.,.75)*uK;gl_FragColor=vec4(c,1.);}`;
function tailGeo(){
  const curve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.2,0.55,0),V3(0.6,0.95,0),V3(1.1,1.05,0),V3(1.55,0.8,0)]);
  const R0=0.3,R1=0.04, list=[[taperTube(curve,48,12,R0,R1),0]];
  const Yv=V3(0,1,0), q=new THREE.Quaternion(), c=V3(0,0,0), t=V3(0,0,0), nrm=V3(0,0,0);
  for(let i=0;i<6;i++){const u=0.16+i*0.13;curve.getPointAt(u,c);curve.getTangentAt(u,t);nrm.set(-t.y,t.x,0).normalize();
    const rad=R0+(R1-R0)*u, h=0.36*(1-u*0.55);
    const g=new THREE.ConeGeometry(0.11*(1-u*0.5),h,8).translate(0,h/2,0);q.setFromUnitVectors(Yv,nrm);g.applyQuaternion(q);
    g.translate(c.x+nrm.x*rad*0.8,c.y+nrm.y*rad*0.8,0);list.push([g,10]);}
  return mergeGeos(list);
}
defs.push({key:"sty_rbTinyDino",name:"Tiny Dino (estilizado)",dur:2.4,ti:0.95,pal:P_DIN,tier:2,stylized:true,allies:1,receiver:'ally',zoneCaster:0.6,zoneTarget:1.3,
  phases:[["Grieta",0],["Cola",0.25],["Golpe",0.95],["Ondas",1.05],["Curación",1.2],["Fin",1.95]],
build(a){
  const L=a.L,TC=0.25,TW=0.78,TI=0.95;
  const AP=ALLY_POS[0].clone(), PIV=AP.clone().add(V3(0.6,0,-1.0)), LAND=AP.clone().add(V3(1.4,0,1.0)), AC=AP.clone().add(V3(0,0.85,0));
  const crack=groundPlane(1.8,PIV.x,0.03,S.mat(CRACK_FS,{uOpen:{value:0}},{mode:'energy'})); crack.position.z=PIV.z; L.decal.add(crack);
  const gy=new THREE.Group(), gz=new THREE.Group(); gy.position.copy(PIV); gy.rotation.y=-Math.atan2(LAND.z-PIV.z,LAND.x-PIV.x); gy.add(gz); L.mesh.add(gy);
  const tail=new THREE.Mesh(tailGeo(),S.mat(TAIL_FS,{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide})); gz.add(tail); gz.scale.setScalar(1.24);
  const tu=tail.material.uniforms;
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.47});
  const rings=[S.groundRing(L.decal,3.0),S.groundRing(L.decal,3.8)], healRing=S.groundRing(L.decal,2.3);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(0.78,32,20),S.mat(HEXSHELL_FS,{uD:{value:0},uF:{value:0},uR:{value:0.78}},{mode:'energy'}));
  shell.position.copy(AC); L.mesh.add(shell);
  const K=`const float TI=${f(TI)};const vec3 LAND=${v3(LAND)};const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};const vec3 PIV=${v3(PIV)};`;
  // polvo y guijarros del golpe
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(LAND.x,.1,LAND.z)+vec3(cos(an),0.,sin(an)*.7)*(.3+.9*(1.-exp(-t*5.)))+vec3(0.,t*(.5+.3*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;put(p,(.38+.18*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.05}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.1,0.))*(1.8+1.6*aSeed.z);vec3 p=LAND+vec3(0.,.15,0.)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.17+.07*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:STONE}));
  // polvo de la grieta mientras sale la cola
  S.pts(L.part,10,VV+K+`void main(){float s=.2+aSeed.x*.35;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(PIV.x,.08,PIV.z)+vec3(cos(an),0.,sin(an))*(.2+.5*(1.-exp(-t*4.)))+vec3(0.,t*.6,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.3+.12*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.08}));
  // cura: motas jade que suben de la tierra y entran en el aliado
  S.pts(L.part,20,VV+K+`void main(){float s=1.15+aSeed.x*.5;float life=.6+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;float rad=.85*(1.-age*.7);vec3 p=vec3(AP.x+cos(an)*rad,.05+age*1.5,AP.z+sin(an)*rad*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=an;put(p,.17+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // escamas de piedra que vuelan y se pegan en coraza
  S.pts(L.part,16,VV+K+`void main(){float i=aSeed.x;float s=1.2+i*.25;float u=clamp((uT-s)/.25,0.,1.);
   float th=aSeed.y*6.2832;float ph=.25+aSeed.z*1.1;vec3 dir=vec3(cos(th)*sin(ph),cos(ph)*.9,sin(th)*sin(ph));
   float rad=mix(1.5,.72,u*u*(3.-2.*u));vec3 p=AC+dir*rad;
   vA=(uT>s&&uT<1.95)?1.:0.;vK=smoothstep(1.7,1.95,uT);vR=th+u*3.;put(p,.26+.07*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:4,col:`vec3(.62,.5,.74)`,bias:.05}));
  const A=allies[0];
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.08*ss(0,0.2,te)-0.08*ss(0.3,0.6,te);
    const ok=ss(0,TC,te)*(1-ss(1.55,1.9,te)); crack.visible=ok>0.01; crack.material.uniforms.uOpen.value=ok; crack.material.uniforms.uA.value=Math.min(ok*1.2,1);
    // cola: sale de la grieta, se arquea, golpea, rebota y se hunde
    const SL=-0.476;
    let ang;
    if(te<TC)ang=-1.35;
    else if(te<TW)ang=-1.35+1.9*e3((te-TC)/(TW-TC));
    else if(te<0.84)ang=0.55+0.15*ss(TW,0.84,te);
    else if(te<TI){const k=(te-0.84)/(TI-0.84);ang=0.7+(SL-0.7)*k*k;}
    else if(te<1.45)ang=SL+0.12*Math.exp(-ia*7)*Math.sin(ia*18);
    else ang=SL-0.9*ss(1.45,1.85,te);
    gz.rotation.z=ang; gy.visible=te>TC*0.6&&te<1.95;
    tu.uQ.value=-0.1+1.15*ss(1.55,1.92,te); tu.uK.value=0.5*hitE(ia,6)+0.12*ss(TC,0.5,te)*(1-ss(0.6,0.9,te));
    spark.pose(ia,tmp.set(LAND.x,0.35,LAND.z),1);
    rings[0].pose(ia,LAND.x,LAND.z,0.45,1); rings[1].pose(te-1.05,LAND.x,LAND.z,0.55,1);
    healRing.pose(te-1.2,AP.x,AP.z,0.5,0.95);
    // aliado: pequeño salto con el golpe, luego cura y coraza
    A.position.y=ALLY_POS[0].y+0.08*hitE(ia,9)*Math.abs(Math.sin(ia*30));
    const pk=ss(1.2,1.6,te); shell.visible=te>1.25&&te<2.15;
    set(shell,pk,1); shell.material.uniforms.uD.value=-0.1+1.15*ss(1.8,2.15,te); shell.material.uniforms.uF.value=Math.exp(-Math.max(te-1.6,0)*8)*ss(1.5,1.6,te);
    const hl=ss(1.2,1.4,te)*(1-ss(1.85,2.15,te)); glowOf(A,COL.setRGB(0.5,1,0.7),0.4*hl);
    if(ia<0){o.g.set(PIV.x,0.6,PIV.z);o.gs=0.7*ok;o.ga=0.12*ok;o.li=1.5*ok;}
    else if(te<1.2){o.g.set(LAND.x,0.4,LAND.z);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*10)*0.35;o.li=4.5*Math.exp(-ia*5);}
    else{o.g.copy(AC);o.gs=1.3;o.ga=0.2*hl;o.li=2.5*hl;}
    o.ia=ia;o.c.copy(AC);o.shake=0.6;o.dist=0.5;o.flash=0.4;
  };
}});

VFX.module("Estilizado · Reptil · Boca",defs);
})();

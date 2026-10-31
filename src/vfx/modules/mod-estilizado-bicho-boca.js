// =====================================================================
// ESTILIZADO · BICHO · BOCA (Hito 101) — las 4 cartas de boca de Bicho rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_ibCuteBunny, sty_ibMosquito, sty_ibPincer, sty_ibSquareTeeth).
// Mismos dur / ti / fases que mod-bicho-boca.js (el daño llega igual). El concepto sigue la carta (PartCards.js):
//  · Cute Bunny: un espíritu de conejo de quitina rosa (silueta, sin cara) da tres saltos, se encabrita y suelta un
//    chillido de medias lunas de sonido; el rival tiembla envuelto en jirones violeta (Miedo).
//  · Mosquito: zumbido de alas; un aguijón carmesí vuela en zigzag y pica el pecho; una hebra de sangre bombea gotas
//    hasta la boca del lanzador, que se cura (drenaje 50 %).
//  · Pincer: dos mandíbulas en hoz de quitina carmesí (arcos curvos con filo aserrado) muerden en tijera dos veces;
//    esquirlas, tajos y Sangrado.
//  · Square Teeth: el escudo del lanzador se vuelve fuerza (bonus por escudo) y unas fauces de hormiga león en media luna
//    con dientes cuadrados trituran: grietas, lascas de piedra y polvo.
// Bicho = quitina carmesí; cada carta con su acento. Colores fijos convertidos a lineal (lin()). Cuerpo a cuerpo:
// zonas 0,5 / 1,3 para que nada se encoja a una casilla. Módulo autónomo (no necesita mod-bicho-boca.js).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,camera,caster,target}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Bicho · Conejo",["#e8508c","#3a0822"]);
VFX.palette("Sty Bicho · Mosquito",["#ff5b4a","#7a0b1d"]);
VFX.palette("Sty Bicho · Pinza",["#ff5a3c","#6c0b16"]);
VFX.palette("Sty Bicho · Dientes",["#ffb35a","#8c1f16"]);

// sRGB (0..1) → vec3 lineal para GLSL
const lin=(r,g,b)=>`vec3(${[r,g,b].map(x=>Math.pow(x,2.2).toFixed(4)).join(',')})`;
const linA=(r,g,b)=>[r,g,b].map(x=>Math.pow(x,2.2));
const MO=V3(-3.43,1.55,0), TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), RX=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const ZONES={zoneCaster:0.5,zoneTarget:1.3};
const camRight=()=>RX.set(1,0,0).applyQuaternion(camera.quaternion);
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const emit=(d,k,r,g,b)=>{const m=d.userData.m;if(r===undefined)m.emissive.copy(U.uC1.value);else m.emissive.setRGB(r,g,b);m.emissiveIntensity=k;};
const resetDummy=d=>{d.rotation.set(0,0,0);d.scale.set(1,1,1);};
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdE(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}`;
const SDFLIT=`float sdfH(vec2 p){return sqrt(clamp(-sdf(p)/.12,0.,1.));}
vec3 sdfN(vec2 p){float e=.014;float hx=sdfH(p+vec2(e,0.))-sdfH(p-vec2(e,0.));float hy=sdfH(p+vec2(0.,e))-sdfH(p-vec2(0.,e));
 return normalize(vec3(-hx*.8,-hy*.8,1.));}`;
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.3});
const POOL_FS=(col,al=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.85,.7,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.25+.35*n),m*er*uA*${f(al)});}`;
// anillo de pincel en billboard; uP = erosión
const RINGB_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g)*1.1,s.r*er*uA);}`;
const ringBill=(parent,size)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),S.mat(RINGB_FS,{},{mode:'energy',depthTest:false}));parent.add(m);return m;};
const CHITIN=lin(.55,.06,.09), CHITIN_D=lin(.16,.015,.03), IVORY=lin(.93,.86,.7), BLOOD=lin(.62,.03,.06);
const EARTH=lin(.5,.38,.25), STONE=lin(.52,.46,.4), FEAR=lin(.2,.08,.3);

// ---------- media luna de mordisco (Pincer y Square Teeth) ----------
// arco de quitina con banda de contorno oscura y dientes en el borde interior. uUp = 1: joroba arriba, dientes abajo.
// uKind 0 = filo aserrado de hoz (dientes en sierra, puntas en gancho) · 1 = dientes cuadrados de hormiga león.
// uChit / uTooth = colores (lineales); uEr = erosión; uHot = brillo del filo (golpe)
const JAW_FS=`uniform float uUp;uniform float uKind;uniform float uEr;uniform float uHot;uniform vec3 uChit;uniform vec3 uTooth;
float inY(float x){return -.78+sqrt(max(.81-x*x,0.));}
float bandD(vec2 p){float o=length(p-vec2(0.,-.56))-.95;float i=length(p-vec2(0.,-.78))-.9;float d=max(o,-i);
 float tip=uKind<.5?.95:.86;return max(d,abs(p.x)-tip+.3*smoothstep(.45,.95,abs(p.x)));}
float teethD(vec2 p){float x=p.x;float y0=inY(x);
 if(uKind<.5){float tri=1.-abs(fract(x*6.5+.25)-.5)*2.;float h=.07+.1*tri;
  return max(max(y0-h-p.y,p.y-y0-.03),abs(x)-.74);}
 float cx=fract(x*4.2+.5)-.5;float h=.21-.05*abs(x);
 return max(max(abs(cx)-.33,max(y0-h-p.y,p.y-y0-.03)),abs(x)-.7);}
void main(){vec2 p=(vUv-.5)*vec2(2.,1.25);if(uUp<.5)p.y=-p.y;
 float n=styNoise(vec2(p.x*.6+uUp*.37,p.y*.3)+.1).b;float nb=styNoise(vUv*1.3+uUp).r;
 float db=bandD(p)+(nb-.5)*.04;float dt=teethD(p);float d=min(db,dt);
 float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float er=styErode(n*.55+.45*clamp(-d*6.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float isT=step(dt,db);
 float ry=length(p-vec2(0.,-.67))-.92;                          // línea media del arco
 vec3 N=normalize(vec3(-p.x*.45,-ry*7.,1.));float l=styLight(N,stySunV());
 vec3 chit=styRampOf(uChit,clamp(.25+.55*l+.1*(n-.5),0.,1.))*styTint(l);
 float seg=smoothstep(.03,.0,abs(fract(p.x*3.+.5)-.5)-.44)*(1.-isT);chit*=1.-.35*seg;  // juntas de los segmentos
 float sheen=smoothstep(.035,.0,abs(ry+.015))*(1.-isT);chit=mix(chit,vec3(1.,.85,.8),sheen*.35*l);
 vec3 tooth=styRampOf(uTooth,clamp(.35+.5*l+.25*clamp(-dt*10.,0.,1.),0.,1.))*styTint(l);
 vec3 c=mix(chit,tooth,isT);
 float rim=smoothstep(-.055,-.015,d);c=mix(c,vec3(.03,.004,.006),rim*.9);
 c+=uChit*2.2*uHot*smoothstep(.06,.0,abs(dt))*isT;
 gl_FragColor=vec4(c,a);}`;
const makeJaw=(parent,kind,chit,tooth,up)=>new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.78),S.mat(JAW_FS,{uUp:{value:up},uKind:{value:kind},
  uEr:{value:0},uHot:{value:0},uChit:{value:new THREE.Color().setRGB(...chit)},uTooth:{value:new THREE.Color().setRGB(...tooth)}},{mode:'matter',depthTest:false}));
const jawU=(m,a,er,hot)=>{const u=m.material.uniforms;u.uA.value=a;u.uEr.value=er;u.uHot.value=hot;};

const defs=[];

// =====================================================================
// Ayudas de billboard (Hito 104): el espíritu mira hacia donde viaja en pantalla (se refleja si va hacia la izquierda,
// así con la cámara girada no camina de espaldas) y se coloca para que un punto suyo (pico, punta) caiga en un sitio.
// =====================================================================
const UPV=V3(0,1,0), DIRV=V3(0,0,0);
const camUp=()=>UPV.set(0,1,0).applyQuaternion(camera.quaternion);
/** ángulo en pantalla de la dirección v desde p, reducido a [-π/2, π/2] + reflejo (−1 si va hacia la izquierda) */
const faceDir=(p,v)=>{let a=scrAng(p,v),fl=1;if(Math.abs(a)>Math.PI/2){fl=-1;a=a>0?a-Math.PI:a+Math.PI;}return [a,fl];};
/** billboard m girado a, reflejado fl, escala (sx,sy); el punto local (lx,ly) de la malla queda en `at` (+ hacia cámara d) */
const placeBB=(m,at,lx,ly,a,fl,sx,sy,d)=>{const R=camRight(),Up=camUp(),c=Math.cos(a),s=Math.sin(a);
  towardCam(m.position,at,d);
  m.position.addScaledVector(R,-(c*lx*fl*sx-s*ly*sy)).addScaledVector(Up,-(s*lx*fl*sx+c*ly*sy));
  billboard(m,a);m.scale.set(Math.max(Math.abs(sx),0.001)*fl,Math.max(Math.abs(sy),0.001),1);};

// =====================================================================
// 1 · CUTE BUNNY — espíritu de liebre de quitina (Hito 104: rehecho). Silueta de perfil sin cara —grupa potente, lomo con
//     placas de quitina, orejas largas con el interior encendido y antenas de insecto con puntas que brillan—, iluminada en
//     3 bandas, con borde de luz de espíritu y la parte baja que se deshace en jirones. Tres saltos con anticipación,
//     estiramiento y estelas fantasma; se encabrita y suelta un chillido en medias lunas de sonido. El rival retrocede
//     tembloroso entre jirones violeta (Miedo).
// =====================================================================
const BUN_FS=SDF2+`uniform float uEr;uniform float uQ;uniform float uGhost;
float sdBun(vec2 p){
 float d=sdE(rot2(p-vec2(-.06,-.3),.2),vec2(.42,.22));                  // lomo, inclinado hacia delante
 d=smin(d,length(p-vec2(-.4,-.36))-.25,.1);                             // grupa
 d=smin(d,sdE(rot2(p-vec2(.24,-.16),-.5),vec2(.15,.19)),.08);           // pecho
 d=smin(d,sdE(rot2(p-vec2(.4,.03),-.35),vec2(.17,.115)),.07);           // cabeza (sin cara)
 d=smin(d,sdE(rot2(p-vec2(-.35,-.66),.05),vec2(.24,.045)),.05);         // pata trasera larga
 d=smin(d,sdSeg(p,vec2(.2,-.38),vec2(.28,-.68))-.04,.04);               // pata delantera
 d=smin(d,length(p-vec2(-.66,-.22))-.075,.04);                          // cola
 float ea=.95-uQ*.55;                                                    // orejas: barridas atrás; se alzan al chillar
 d=smin(d,sdE(rot2(p-vec2(.27,.27),ea),vec2(.06,.33)),.04);
 d=smin(d,sdE(rot2(p-vec2(.37,.25),ea-.22),vec2(.05,.29)),.04);
 return d;}
float sdf(vec2 p){return sdBun(p);}
${SDFLIT}
float sdAnt(vec2 p,float q){float sw=sin(uT*5.)*.03+q*sin(uT*60.)*.025;
 vec2 a0=vec2(.46,.12),a1=vec2(.6,.3+q*.06),a2=vec2(.76+sw,.44+q*.08);
 return min(min(sdSeg(p,a0,a1),sdSeg(p,a1,a2))-.016,length(p-a2)-.045);}
void main(){vec2 p=(vUv-.5)*2.;
 float n=styNoise(vUv*.9+.3).r;float nw=styNoise(vec2(vUv.x*1.4-uT*.35,vUv.y*.9)).g;
 float d=sdBun(p);float da=sdAnt(p,uQ);
 // la parte baja de la grupa y las patas se deshacen en jirones de espíritu
 float wisp=smoothstep(-.5,-.78,p.y)*(.55+.5*nw);d+=wisp*.12;
 float dd=min(d,da);
 float m=smoothstep(.015,-.015,dd);if(m<.01)discard;
 float er=styErode(n*.6+.4*clamp(-dd*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 if(uGhost>.5){gl_FragColor=vec4(styRampOf(uC1,.85)*1.3,a*.5*(1.-wisp));return;}   // estela fantasma: solo silueta
 float l=styLight(sdfN(p),stySunV());
 vec3 body=mix(styRampOf(uC2,clamp(.1+.7*l,0.,1.)),styRampOf(uC1,clamp(.05+.55*l,0.,1.)),.45+.3*l)*styTint(l);
 // placas de quitina del lomo: juntas oscuras en arco y brillo en cada placa
 float bp=rot2(p-vec2(-.06,-.3),.2).x;float onBack=smoothstep(-.32,-.2,p.y)*smoothstep(.12,-.02,d+.06)*step(p.x,.18);
 float joint=smoothstep(.025,.0,abs(fract(bp*4.2+.2)-.5)-.43)*onBack;body*=1.-.45*joint;
 body=mix(body,styRampOf(uC1,.8),smoothstep(.35,.0,abs(fract(bp*4.2+.2)-.5)-.1)*onBack*.18*l);
 // vientre y pecho más claros
 float belly=smoothstep(.12,-.12,p.y+.38)*smoothstep(-.15,.05,p.x+.25)*(1.-onBack);body=mix(body,styRampOf(${lin(1.,.78,.82)},.35+.45*l),belly*.4);
 // interior de las orejas encendido
 float ea=.95-uQ*.55;
 float ear=max(smoothstep(.03,-.01,sdE(rot2(p-vec2(.27,.29),ea),vec2(.025,.25))),smoothstep(.03,-.01,sdE(rot2(p-vec2(.37,.27),ea-.22),vec2(.02,.21))));
 body=mix(body,${lin(1.,.32,.55)}*(1.2+.8*uQ),ear*.85);
 vec3 c=body;
 // contorno oscuro y, por fuera, borde de luz de espíritu
 float rim=smoothstep(-.05,-.014,d)*step(d,da+.001);c=mix(c,styRampOf(uC2,.08),rim*.85);
 float glowE=smoothstep(-.012,.0,dd);c=mix(c,uC1*2.2,glowE*.75);c+=uC1*.5*smoothstep(-.09,-.03,d)*smoothstep(-.02,-.05,d)*(.5+.5*nw);
 float ant=step(da,d);c=mix(c,styRampOf(uC2,.18),ant);
 float tip=smoothstep(.06,.02,length(p-vec2(.76,.44+uQ*.08)));c+=uC1*tip*(.8+1.6*uQ);
 gl_FragColor=vec4(c,a*(1.-.55*wisp));}`;
// medias lunas de sonido del chillido (materia pintada con borde oscuro), uP = tiempo desde el chillido
const SHOUT_FS=`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(3.2,2.4);float r=length(p);float an=atan(p.y,p.x);
 float win=smoothstep(.95,.5,abs(an));float m=0.;float edge=0.;
 for(int i=0;i<3;i++){float fi=float(i);float ri=(uP-fi*.1)*4.6;float w=.07+.03*fi;
  float j=(styNoise(vec2(an*.9+fi*.3,r*.2-uT*.3)).b-.5)*.12;float dd=abs(r+j-ri)-w;
  float on=step(0.,ri)*smoothstep(3.2,1.2,ri);m=max(m,smoothstep(.02,-.02,dd)*on);edge=max(edge,smoothstep(-.035,-.01,dd)*on*smoothstep(.02,-.02,dd));}
 float a=m*win*uA;if(a<.01)discard;
 vec3 c=mix(styRampOf(uC1,.7),styRampOf(uC2,.1),edge*.85);gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_ibCuteBunny",name:"Cute Bunny (estilizado)",dur:2.3,ti:1.05,tier:2,pal:"Sty Bicho · Conejo",stylized:true,...ZONES,
  phases:[["Aparición",0],["Saltitos",0.2],["Inspira",0.82],["Chillido",1.05],["Miedo",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TH0=0.2,TQ=0.82,TI=1.05,TF=1.4,TE=1.9,BS=2.25;
  const HOPS=[[0.2,0.42,-2.75,-1.05,0.75],[0.42,0.62,-1.05,0.55,0.62],[0.62,0.82,0.55,1.75,0.5]];
  const ZS=[0.2,0.12,0.05,0];
  const bpos=(te,out)=>{if(te<TH0)return out.set(HOPS[0][2],0,ZS[0]);
    for(let i=0;i<3;i++){const h=HOPS[i];if(te<h[1]){const k=(te-h[0])/(h[1]-h[0]);return out.set(h[2]+(h[3]-h[2])*k,h[4]*4*k*(1-k),ZS[i]+(ZS[i+1]-ZS[i])*k);}}
    return out.set(HOPS[2][3],0,0);};
  const bunMat=S.mat(BUN_FS,{uEr:{value:0},uQ:{value:0},uGhost:{value:0}},{mode:'matter'});
  const bun=new THREE.Mesh(new THREE.PlaneGeometry(1,1),bunMat); L.mesh.add(bun);
  // dos estelas fantasma (misma silueta, un poco atrás en el tiempo)
  const ghosts=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(BUN_FS,{uEr:{value:0},uQ:{value:0},uGhost:{value:1}},{mode:'energy'}));L.mesh.add(m);return m;});
  const shout=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.4).translate(1.6,0,0),S.mat(SHOUT_FS,{},{mode:'matter',depthTest:false})); L.mesh.add(shout);
  const shadow=S.contactShadow(L.decal,1.2), spark=S.hitSpark(L.mesh,1.5,{seed:0.41}), ring=S.groundRing(L.decal,3.0);
  const lands=HOPS.map(()=>S.groundRing(L.decal,1.3));
  const echo=ringBill(L.mesh,1.8);
  const tipU={value:V3(0,0,0)};
  const K=`const float TI=${f(TI)};const float TF=${f(TF)};const float TE=${f(TE)};const float TQ=${f(TQ)};const vec3 MO=${v3(MO)};const vec3 TH=${v3(TH)};`;
  // la luz sale de la boca y da forma al espíritu
  S.pts(L.part,26,VV+K+`void main(){float s=aSeed.x*.14;float age=(uT-s)/.16;float k=clamp(age,0.,1.);
   vec3 p=mix(MO+vec3(.1,0.,0.),vec3(${f(HOPS[0][2])},.55,.2)+rnd()*.3,k*k)+vec3(0.,.3*sin(3.14159*k),0.);
   vR=aSeed.z*6.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.08*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // polvo en cada aterrizaje
  S.pts(L.part,30,VV+K+`void main(){float i=floor(aSeed.x*2.999);float s=i<.5?${f(HOPS[0][1])}:(i<1.5?${f(HOPS[1][1])}:${f(HOPS[2][1])});
   float x=i<.5?${f(HOPS[0][3])}:(i<1.5?${f(HOPS[1][3])}:${f(HOPS[2][3])});float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.2);
   vec3 d=normalize(vec3(rnd().x,.25,rnd().z));vec3 p=vec3(x,.1,0.)+d*(.2+.45*aSeed.z)*(1.-exp(-t*6.))+vec3(0.,.25*t,0.);
   vR=aSeed.w*6.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.26+.12*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:EARTH}));
  // jirones de espíritu que se desprenden de la grupa mientras salta
  S.pts(L.part,26,VV+K+`uniform vec3 uB;void main(){float life=.35+aSeed.y*.2;float k=(uT-.15)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=uB+vec3(-.55-age*.6+r.x*.3,.35+r.y*.4+age*.25,(r.z-.5)*.3);vR=age*2.+r.x*6.;vK=smoothstep(.3,1.,age);
   vA=(k>=1.&&uT<${f(TQ+0.1)})?1.:0.;put(p,(.22+.12*r.z)*(1.-age*.5));}`,S.MATTER_FS(C.puff,{relief:2,col:'uC1'}),{uniforms:{uB:{value:V3(0,0,0)}}});
  const wispPts=L.part.children[L.part.children.length-1];
  // chispas que se cargan en las antenas al inspirar y saltan con el chillido
  S.pts(L.part,22,VV+K+`uniform vec3 uTip;void main(){float life=.12+aSeed.y*.08;float k=(uT-TQ)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k))*2.-1.;
   vec3 p=uTip+r*vec3(.14,.12,.1)+vec3(0.,age*.15,0.);vR=r.z*3.;vK=0.;
   vA=(k>=1.&&uT<TI+.15)?1.-age:0.;put(p,.16+.08*r.y);}`,MOTE_FS,{mode:'energy',uniforms:{uTip:tipU}});
  // Miedo: jirones violeta que se enroscan en el rival
  S.pts(L.part,26,VV+K+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*3.;float rd=.5+.15*r.y;vec3 p=vec3(3.4+cos(an)*rd,.35+r.z*1.3+age*.5,sin(an)*rd);
   vR=age*2.;vK=smoothstep(.4,1.,age);vA=(k>=1.)?uE:0.;put(p,(.4+.25*r.y)*(.7+age*.4));}`,S.MATTER_FS(C.puff,{relief:3,col:FEAR}));
  // gotas de sudor del miedo
  S.pts(L.part,8,VV+K+`void main(){float life=.45;float k=(uT-TI-.25)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=TH+vec3((r.x-.5)*.6,.15+.2*r.y-age*age*.6,.25);vR=3.14159;vK=smoothstep(.7,1.,age);vA=(k>=1.)?uE:0.;put(p,.16);}`,
   S.MATTER_FS(C.drop,{relief:4,col:lin(.55,.75,.95)}));
  const bp=V3(0,0,0), bq=V3(0,0,0), mouth=V3(0,0,0), gp2=V3(0,0,0);
  // pose de la liebre a un tiempo dado: posición, escala (estiramiento) e inclinación según la trayectoria
  const hare=(te,out)=>{bpos(te,out);bpos(te+0.012,bq);
    const vx=bq.x-out.x, vy=bq.y-out.y;
    let crouch=0,squash=0;
    for(const h of HOPS){crouch=Math.max(crouch,ss(h[0]-0.06,h[0],te)*(te<h[0]+0.02?1:0)); squash=Math.max(squash,Math.exp(-Math.abs(te-h[1])*30)*(te>h[0]+0.05?1:0));}
    const air=te>=HOPS[0][0]&&te<HOPS[2][1]?Math.min(1,Math.hypot(vx,vy)*25):0;
    const lean=Math.atan2(vy,Math.abs(vx)+1e-4)*0.45*air;
    return {sx:1+0.16*squash+0.12*crouch-0.06*air,sy:1-0.2*squash-0.16*crouch+0.1*air,lean,ears:cl(Math.max(0,vy)*40)};};
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TH0,te), fear=ia>0?1-ss(TE-0.2,TE+0.3,te):0;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.rotation.z=-0.06*ss(0,0.1,te)+0.06*ss(0.1,0.25,te);
    const rear=ss(TQ,TI,te)*(1-ss(TI+0.25,TF,te)), sh=ia>0?Math.exp(-ia*3)*(1-ss(TF-0.1,TF,te)):0;
    const [, fl]=faceDir(tmp3.set(0,1,0),DIRV.set(1,0,0));       // hacia dónde mira (siempre hacia el rival)
    const H=hare(te,bp), grow=0.4+0.6*back(form);
    const sx=BS*H.sx*(1-0.06*rear)*grow, sy=BS*H.sy*(1+0.12*rear)*grow;
    const ang=fl*(H.lean+0.2*rear)-0.1*sh*Math.sin(ia*40);
    towardCam(bun.position,tmp.set(bp.x,bp.y+0.42*sy,bp.z),0.15); billboard(bun,ang);
    bun.scale.set(Math.max(sx,0.001)*fl,Math.max(sy,0.001),1); bun.visible=te<TF+0.45;
    bunMat.uniforms.uQ.value=Math.max(rear*0.6,sh,H.ears*0.35); bunMat.uniforms.uA.value=form;
    bunMat.uniforms.uEr.value=-0.1+1.1*ss(TF,TF+0.42,te);
    // estelas fantasma en el aire
    ghosts.forEach((g,i)=>{const dt=0.045*(i+1), Hg=hare(te-dt,gp2), on=te-dt>HOPS[0][0]&&te-dt<HOPS[2][1]&&Math.abs(gp2.y)>0.02;
      g.visible=on&&te<TQ+0.05; if(!g.visible)return;
      towardCam(g.position,tmp.set(gp2.x,gp2.y+0.42*BS*Hg.sy,gp2.z),0.1-0.02*i); billboard(g,fl*Hg.lean);
      g.scale.set(BS*Hg.sx*fl,BS*Hg.sy,1); g.material.uniforms.uA.value=0.7/(i+1); g.material.uniforms.uQ.value=Hg.ears*0.35;});
    wispPts.material.uniforms.uB.value.copy(bp);
    shadow.pose(bp.x,bp.z,0.85+0.25*(H.sx-1)-0.3*cl(bp.y),te<TF+0.3?0.6*form:0);
    mouth.set(bp.x+0.35*sx,bp.y+0.45*sy,bp.z); tipU.value.set(bp.x+0.38*sx,bp.y+0.42*sy+0.44*sy,bp.z);
    towardCam(shout.position,mouth,0.25); billboard(shout,fl<0?Math.PI:0); shout.visible=ia>0&&ia<0.8; set(shout,Math.max(ia,0),1-ss(0.45,0.8,ia));
    HOPS.forEach((h,i)=>lands[i].pose(te-h[1],h[3],ZS[i+1],0.35,0.7));
    spark.pose(ia-0.12,TH,1.0);
    ring.pose(ia-0.12,3.4,0,0.5,1);
    {const p=cl((ia-0.1)/0.4);towardCam(echo.position,TH,0.3);billboard(echo);echo.visible=ia>=0.1&&p<1;echo.scale.setScalar(0.4+1.3*p);set(echo,-0.1+1.1*p,1);}
    U.uE.value=fear;
    const recoil=ia>0.1?ss(0.1,0.25,ia):0;
    target.position.x=3.4+0.22*recoil*fear+0.02*Math.sin(te*85)*fear*(ia>0.1?1:0); target.rotation.z=-0.14*recoil*fear;
    target.scale.set(1,1-0.07*recoil*fear,1);
    emit(target,0.3*fear*recoil,0.3,0.1,0.42);
    if(te<TI){o.g.set(bp.x,bp.y+0.5,bp.z);o.gs=0.8;o.ga=0.08*form+0.1*rear;o.li=0.8*form+1.2*rear;}
    else{o.g.copy(mouth).lerp(TH,cl(ia/0.15));o.gs=1+1.2*Math.min(ia,0.4);o.ga=Math.exp(-ia*7)*0.2;o.li=2.5*Math.exp(-ia*5)+0.4*fear;}
    o.ia=ia-0.12;o.c.copy(TH);o.shake=0;o.dist=0.6;o.flash=0.3;
  };
}});

// =====================================================================
// 2 · MOSQUITO — (Hito 104: rehecho) un espíritu de mosquito de perfil —abdomen segmentado, tórax, patas largas y finas,
//     probóscide larga, sin cara— sale zumbando de la boca con alas veteadas y abanico de movimiento, vuela en zigzag y
//     clava la probóscide en el pecho (impacto). Mientras succiona, el abdomen se hincha y late en rojo y una hebra de
//     sangre bombea gotas hasta el lanzador, que se cura (drenaje 50 %). Al cortarse la hebra, se suelta y se deshace.
// =====================================================================
// cuerpo de perfil, mirando a +x; el punto (1., -.1) es la punta de la probóscide. uSw = hinchazón del abdomen (0–1)
const MOSQ_FS=SDF2+`uniform float uEr;uniform float uSw;
float sdLegs(vec2 p){float d=1e3;
 for(int i=0;i<3;i++){float fi=float(i);vec2 r=vec2(.3-.07*fi,-.02);vec2 k=r+vec2(-.12+.16*fi,-.28+.04*fi);vec2 e=k+vec2(-.2+.22*fi,-.3);
  d=min(d,min(sdSeg(p,r,k),sdSeg(p,k,e))-.012);}return d;}
float sdBody(vec2 p){float sw=uSw;
 vec2 q=rot2(p-vec2(-.32,-.04),-.12);float ab=sdE(q,vec2(.42+.06*sw,.1+.09*sw));       // abdomen
 float d=smin(ab,sdE(p-vec2(.2,.06),vec2(.17,.13)),.06);                                // tórax jorobado
 d=smin(d,length(p-vec2(.43,.04))-.085,.03);                                            // cabeza
 d=min(d,sdSeg(p,vec2(.48,.02),vec2(1.,-.1))-.011);                                     // probóscide
 return d;}
float sdf(vec2 p){return sdBody(p);}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*vec2(2.,1.);
 float db=sdBody(p),dl=sdLegs(p),d=min(db,dl);
 float m=smoothstep(.012,-.012,d);if(m<.01)discard;
 float n=styNoise(vUv*.9).r;float er=styErode(n*.6+.4*clamp(-d*8.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());
 vec3 c=styRampOf(${lin(.36,.05,.08)},clamp(.15+.6*l,0.,1.))*styTint(l);
 // abdomen: bandas de segmentos claras/oscuras; al hincharse se llena de sangre que late
 vec2 q=rot2(p-vec2(-.32,-.04),-.12);float inAb=smoothstep(.02,-.02,sdE(q,vec2(.42+.06*uSw,.1+.09*uSw)))*step(p.x,.05);
 float band=smoothstep(.04,.0,abs(fract(q.x*5.5+.5)-.5)-.42);
 vec3 blood=styRampOf(${BLOOD},clamp(.3+.55*l+.25*sin(uT*14.-q.x*8.),0.,1.))*(1.+.8*uSw);
 c=mix(c,mix(c,blood,.15+.85*uSw),inAb);c*=1.-.45*band*inAb;
 c=mix(c,styRampOf(${lin(.95,.85,.78)},.4+.4*l),smoothstep(.03,-.02,abs(q.y+.06)-.015)*inAb*(1.-uSw)*.35);  // rayas pálidas
 c=mix(c,styRampOf(${lin(.2,.03,.05)},.15),step(dl,db));                                                     // patas oscuras
 c=mix(c,styRampOf(${lin(.15,.02,.04)},.12),smoothstep(-.03,-.008,d)*.85);                                  // contorno
 c+=${lin(1.,.35,.3)}*smoothstep(.06,.0,length(p-vec2(1.,-.1)))*1.4;                                         // punta de la probóscide
 gl_FragColor=vec4(c,a);}`;
// ala: elipse veteada, translúcida y teñida; raíz en el borde izquierdo (u=0)
const WING_FS=SDF2+`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(2.,2.);p.x-=1.;float d=sdE(p,vec2(.98,.36));float m=smoothstep(.02,-.02,d);if(m<.01)discard;
 float vein=smoothstep(.03,.0,abs(fract((p.x+p.y*.5)*3.)-.5)-.45)+smoothstep(.035,.0,abs(p.y+.08*p.x));
 vec3 c=mix(styRampOf(${lin(.85,.7,.72)},.75),styRampOf(${lin(.3,.05,.08)},.15),max(smoothstep(-.06,-.02,d),vein*.75));
 gl_FragColor=vec4(c,m*(.22+.55*max(smoothstep(-.06,-.02,d),vein))*uA);}`;
// abanico de movimiento de las alas (energía muy tenue)
const BLUR_FS=`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(1.,2.);float r=length(p);float an=atan(p.y,p.x);
 float m=smoothstep(1.,.75,r)*smoothstep(.1,.3,r)*smoothstep(1.2,.7,abs(an));if(m<.01)discard;
 gl_FragColor=vec4(styRampOf(uC1,.6)*.6,m*.22*uA);}`;
defs.push({key:"sty_ibMosquito",name:"Mosquito (estilizado)",dur:2.1,ti:0.42,tier:2,pal:"Sty Bicho · Mosquito",stylized:true,...ZONES,
  phases:[["Zumbido",0],["Picadura",0.18],["Punción",0.42],["Succión",0.55],["Corte",1.5],["Fin",1.8]],
build(a){
  const L=a.L,TL=0.18,TI=0.42,TS=0.5,TX=1.5,TE=1.8,Q1=V3(-0.2,2.7,0.6),MW=2.0,MH=1.0,MS=1.45;
  // vuelo en zigzag de la punta de la probóscide: de la boca al pecho del rival
  const sp=(te,out)=>{const k=cl((te-TL)/(TI-TL)),e=Math.sin(Math.PI*k);
    return out.set(MO.x+0.4+(TC.x-MO.x-0.4)*k,MO.y+(TC.y-MO.y)*k+0.16*Math.sin(k*28)*e+0.45*e,MO.z+(TC.z-MO.z)*k+0.12*Math.cos(k*24)*e);};
  const qb=(u,out)=>{const w=1-u;return out.set(w*w*TC.x+2*w*u*Q1.x+u*u*MO.x,w*w*TC.y+2*w*u*Q1.y+u*u*MO.y,w*w*TC.z+2*w*u*Q1.z+u*u*MO.z);};
  const QB=`vec3 qb(float u){float w=1.-u;return w*w*${v3(TC)}+2.*w*u*${v3(Q1)}+u*u*${v3(MO)};}`;
  const bodyMat=S.mat(MOSQ_FS,{uEr:{value:0},uSw:{value:0}},{mode:'matter'});
  const body=new THREE.Mesh(new THREE.PlaneGeometry(MW,MH),bodyMat); L.mesh.add(body);
  const wings=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.3).translate(0.4,0,0),S.mat(WING_FS,{},{mode:'matter'}));L.mesh.add(m);return m;});
  const blur=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85).translate(0.42,0,0),S.mat(BLUR_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(blur);
  // hebra de sangre: tubo con bandas de luz y pulsos que viajan hacia el lanzador; uP crecimiento, uQ corte
  const pts=[]; for(let i=0;i<=20;i++)pts.push(qb(i/20,V3(0,0,0)));
  const thread=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),80,8,0.1,0.06),S.mat(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;if(abs(u-.5)<uQ*.5)discard;
   float l=styLight(normalize(vN),stySunV());float pul=smoothstep(.55,.95,.5+.5*sin(u*28.-uT*15.));
   vec3 c=styRampOf(${BLOOD},clamp(.2+.55*l+.35*pul,0.,1.))*styTint(l);
   float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);c=mix(c,${lin(.2,.01,.03)},rim*.7);
   c+=uC1*pul*.5;gl_FragColor=vec4(c,(.85+.15*pul)*uA);}`,{uQ:{value:0}},{mode:'matter'}));
  L.mesh.add(thread);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.62}), ring=S.groundRing(L.decal,2.6), heal=S.groundRing(L.decal,2.0);
  const shadow=S.contactShadow(L.decal,0.9);
  const pool=groundPlane(1.3,3.4,0.024,S.mat(POOL_FS(BLOOD,.5),{},{mode:'matter'})); L.decal.add(pool);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TX=${f(TX)};const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};`+QB;
  // zumbido: motas que vibran ante la boca
  S.pts(L.part,14,VV+K+`void main(){float life=.1+aSeed.y*.05;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k))*2.-1.;
   vec3 p=MO+vec3(.25,.05,0.)+r*vec3(.18,.14,.14)*(1.+age);vR=0.;vK=0.;vA=(k>=1.&&uT<TL+.05)?1.-age:0.;put(p,.1+.05*r.z);}`,MOTE_FS,{mode:'energy'});
  // gotas que saltan de la punción
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.25);
   vec3 v=normalize(rnd()+vec3(-.6,.6,.4))*(1.+1.8*aSeed.z);vec3 p=TC+v*t+vec3(0.,-5.*t*t,0.);
   vR=3.14159+atan(v.x,v.y)*.3;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.18+.1*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  // gotas de vida que fluyen por la hebra hasta el lanzador
  S.pts(L.part,46,VV+K+`void main(){float t=uT-TS;float u=fract(aSeed.x+t*.8);float rev=clamp(t/.2,0.,1.);
   vec3 p=qb(u)+rnd()*.04;float cut=step(.5*step(TX,uT),abs(u-.5))*(1.-smoothstep(TX,TX+.15,uT));
   vR=3.14159;vK=0.;vA=(t>0.)?smoothstep(0.,.05,u)*step(u,rev)*smoothstep(1.,.93,u)*cut:0.;put(p,.16+.08*aSeed.z);}`,
   S.MATTER_FS(C.drop,{relief:4,col:lin(.85,.12,.16)}));
  // el lanzador se cura: motas rosadas que suben en espiral
  S.pts(L.part,24,VV+K+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TS-.3)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*2.;float rd=.45+.15*r.y;vec3 p=vec3(-3.7+cos(an)*rd,.2+r.z*1.1+age*.7,sin(an)*rd);
   vR=age*3.;vK=0.;vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.2+.12*r.y)*sin(age*3.14159));}`,MOTE_FS,{mode:'energy'});
  const tipP=V3(0,0,0), tipQ=V3(0,0,0), dv=V3(0,0,0), root=V3(0,0,0), away=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(TS-0.05,TS+0.2,te), cut=ss(TX,TX+0.18,te), env=te>TS?1-ss(TX,TX+0.3,te):0;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.rotation.z=-0.08*ss(0,TL,te)+0.12*ss(TL,TL+0.06,te)-0.04*ss(TL+0.1,TI,te);
    // dónde está la punta de la probóscide y hacia dónde mira el cuerpo
    let flyOff=0;
    if(te<TL){tipP.copy(MO).add(dv.set(0.4,0.05*Math.sin(te*60),0));dv.set(1,0.15,0);}
    else if(te<TI){sp(te,tipP);sp(te+0.012,tipQ);dv.copy(tipQ).sub(tipP);}
    else if(te<TX){tipP.copy(TC);tipP.x+=0.03*Math.sin(te*30)*env;dv.set(1,-0.12,0);}
    else{flyOff=ss(TX,TX+0.4,te);tipP.copy(TC).add(away.set(-1.2*flyOff,1.3*flyOff,0.4*flyOff));dv.set(1,-0.12-0.9*flyOff,0);}
    const [ang,fl]=faceDir(tipP,dv.normalize());
    const form=ss(0,0.12,te), sc=MS*(0.4+0.6*back(form)), out=ss(TX+0.1,TX+0.45,te);
    // punta local (1, −.1) del plano 2 × 1 → (1·MW/2, −.1·MH/2)
    placeBB(body,tipP,MW*0.5,-0.05,ang,fl,sc,sc,0.35);
    body.visible=te<TX+0.5;
    bodyMat.uniforms.uA.value=form; bodyMat.uniforms.uSw.value=grow*(1-out*0.3)*(0.85+0.15*Math.sin(te*14))*(te>TI?1:0);
    bodyMat.uniforms.uEr.value=-0.1+1.15*out;
    // raíz de las alas: lomo del tórax (local .2, .17)
    {const R=camRight(),Up=camUp(),c=Math.cos(ang),s=Math.sin(ang),lx=(0.2-1.0)*MW*0.5*sc*fl,ly=(0.17+0.1)*MH*0.5*sc;
      root.copy(tipP).addScaledVector(R,c*lx-s*ly).addScaledVector(Up,s*lx+c*ly);}
    const buzz=te<TX+0.45?1-out:0;
    wings.forEach((m,i)=>{const fa=Math.sin(te*95+i*1.3);
      towardCam(m.position,root,0.36+0.01*i);billboard(m,ang+fl*(Math.PI*0.85+0.55*fa+(i?0.25:-0.1)));
      m.scale.set(sc*1.05*fl,sc*(0.9+0.15*Math.abs(fa)),1);m.material.uniforms.uA.value=form*buzz*(0.6+0.4*Math.abs(fa));m.visible=buzz>0.01;});
    towardCam(blur.position,root,0.33);billboard(blur,ang+fl*Math.PI*0.85);blur.scale.set(sc*fl,sc,1);
    blur.material.uniforms.uA.value=form*buzz*(te<TI||te>TX?1:0.55);blur.visible=buzz>0.01;
    shadow.pose(tipP.x-0.5*fl,tipP.z,0.7,te<TI?0.35*form:0.45*buzz);
    thread.visible=te>TS-0.05&&te<TE+0.1; set(thread,grow,1-ss(TX+0.05,TE,te)); thread.material.uniforms.uQ.value=cut*0.9;
    spark.pose(ia,TC,1.05); ring.pose(ia,3.4,0,0.45,1); heal.pose(te-TS-0.3,-3.7,0,0.7,0.9);
    set(pool,-0.1+1.1*ss(TE-0.4,TE+0.1,te),ia>0?ss(0,0.25,ia):0);
    U.uE.value=env;
    const pulse=0.5+0.5*Math.sin(te*15-2);
    emit(caster,env*grow*(0.12+0.18*pulse),0.9,0.15,0.2);
    const hit=hitE(ia,8); target.position.x=3.4+hit*0.12; target.rotation.z=-hit*0.12*Math.cos(Math.max(ia,0)*16)+0.03*env*Math.sin(te*5);
    target.scale.set(1-0.03*env,1-0.05*env,1-0.03*env); emit(target,0.35*hit+0.12*env*pulse,0.9,0.1,0.12);
    if(te<TL){o.g.copy(MO);o.gs=0.5;o.ga=0.06;o.li=0.6;}
    else if(te<TI){o.g.copy(tipP);o.gs=0.7;o.ga=0.1;o.li=1.2;}
    else if(te<TX){qb(0.5+0.45*Math.sin(te*2),o.g);o.gs=0.9;o.ga=0.08+0.15*hitE(ia,8);o.li=1+2.5*hitE(ia,6);}
    else{o.g.copy(MO);o.gs=0.8;o.ga=0.06*(1-cut);o.li=0.8*(1-cut);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.45;o.flash=0.25;
  };
}});

// =====================================================================
// 3 · PINCER — (Hito 104: rehecho) dos mandíbulas de quitina carmesí en hoz, tumbadas a la altura del pecho, con la
//     bisagra del lado del lanzador: rodean al rival por los dos costados y cierran con las puntas por delante, como las
//     pinzas de un insecto vistas desde arriba. Filo aserrado en el borde interior, juntas de segmentos, contorno oscuro.
//     Muerden en tijera dos veces (la segunda más fuerte); esquirlas, dos tajos que sangran y Sangrado.
// =====================================================================
// Mandíbula en el plano horizontal. Coordenadas con la bisagra en el origen: el arco tiene su centro en el rival
// (1.1, 0) y radio 1.1; va de la bisagra (φ = π) por el costado (φ = π/2) hasta la punta (φ = −0.25), que cruza un poco
// la línea media por delante. uSide = ±1 elige el costado. uOff = centro del plano respecto a la bisagra.
const MAND_FS=`uniform float uSide;uniform float uEr;uniform float uHot;uniform vec2 uOff;uniform vec2 uWH;
const float RM=1.1;const float PHT=-.25;
void main(){vec2 h=vec2((vUv.x-.5)*uWH.x,-(vUv.y-.5)*uWH.y)+uOff;h.y*=uSide;
 vec2 q=h-vec2(RM,0.);float r=length(q);float ph=atan(q.y,q.x);
 if(ph<-1.5708)ph+=6.2832;
 float u=(3.14159-ph)/(3.14159-PHT);
 float dc=r-RM;
 float w=mix(.26,.03,pow(clamp(u,0.,1.),.85))*(1.+.25*smoothstep(.05,.25,u)*smoothstep(.6,.3,u));
 float th=step(.22,u)*step(u,.93)*(.055+.06*(1.-abs(fract(u*10.)-.5)*2.))*smoothstep(.93,.85,u);   // dientes de sierra
 float dBand=max(dc-w,-dc-w);float dTeeth=max(dc+w-.01,-dc-w-th);
 float d=min(dBand,dTeeth);
 float uOut=max(-u,u-1.)*RM*3.;d=max(d,uOut);                       // fuera del recorrido del arco
 d=min(d,length(h)-.17);                                                // nudillo de la bisagra
 float m=smoothstep(.02,-.02,d);if(m<.01)discard;
 float n=styNoise(vUv*1.2+uSide*.3).r;float er=styErode(n*.55+.45*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float isT=step(dTeeth,dBand)*step(.2,u);
 float sl=clamp(dc/max(w,.02),-1.,1.);vec3 N=normalize(vec3(-sl*.75*normalize(q).x,.55,-sl*.75*normalize(q).y*uSide));
 float l=styLight(N,stySunV());
 vec3 chit=styRampOf(${CHITIN},clamp(.2+.6*l+.1*(n-.5),0.,1.))*styTint(l);
 float seg=smoothstep(.03,.0,abs(fract(u*6.+.5)-.5)-.44)*(1.-isT);chit*=1.-.4*seg;
 float sheen=smoothstep(.06,.0,abs(sl-.35))*(1.-isT);chit=mix(chit,${lin(1.,.75,.72)},sheen*.35*l);
 vec3 tooth=styRampOf(${IVORY},clamp(.3+.5*l,0.,1.))*styTint(l);tooth=mix(tooth,${lin(.35,.05,.06)},smoothstep(.0,.04,-dc-w-th*.6)*.6);
 vec3 c=mix(chit,tooth,isT);
 float rim=smoothstep(-.05,-.012,d);c=mix(c,${lin(.06,.005,.01)},rim*.9);
 c+=${lin(1.,.25,.15)}*uHot*smoothstep(.06,.0,abs(dTeeth))*isT*2.;
 gl_FragColor=vec4(c,a);}`;
const GASH_FS=`uniform float uEr;uniform float uK;
void main(){vec2 p=(vUv-.5)*2.;float m=0.,core=0.;
 for(int i=0;i<2;i++){float an=i==0?.45:-.35;vec2 q=vec2(cos(an)*p.x+sin(an)*p.y,-sin(an)*p.x+cos(an)*p.y);
  float w=.09*(1.-q.x*q.x);float dy=abs(q.y+.05*sin(q.x*7.));
  m=max(m,smoothstep(w,w*.6,dy)*step(abs(q.x),.95));core=max(core,smoothstep(w*.45,.0,dy)*step(abs(q.x),.9));}
 if(m<.01)discard;float er=styErode(styNoise(vUv*.8).r*.6+.4*m,uEr,.12);
 vec3 c=mix(${lin(.18,.01,.02)},${lin(.95,.12,.1)},core*(.6+.4*uK));
 gl_FragColor=vec4(c,m*er*uA);}`;
defs.push({key:"sty_ibPincer",name:"Pincer (estilizado)",dur:2.1,ti:0.55,tier:2,pal:"Sty Bicho · Pinza",stylized:true,...ZONES,
  phases:[["Apertura",0],["Mordida",0.55],["Segunda",0.85],["Desgarro",1.0],["Desangrado",1.3],["Fin",1.9]],
build(a){
  const L=a.L,T1=0.55,T2=0.85,TD=1.0,TB=[1.3,1.65],TE=1.95,PC=V3(3.2,1.25,0.05);
  const RM=1.1, HX=3.4-RM, MW=2.7, MH=1.55;
  // cada mandíbula: plano horizontal con la bisagra en su origen (se gira alrededor de ella)
  const mands=[-1,1].map((s,i)=>{const off=[1.15,0.45*s];
    const m=new THREE.Mesh(new THREE.PlaneGeometry(MW,MH).rotateX(-Math.PI/2).translate(off[0],0,off[1]),
      S.mat(MAND_FS,{uSide:{value:s},uEr:{value:0},uHot:{value:0},uOff:{value:new THREE.Vector2(off[0],off[1])},uWH:{value:new THREE.Vector2(MW,MH)}},{mode:'matter',side:THREE.DoubleSide}));
    m.userData.s=s; m.position.set(HX,1.05+0.05*i,0.06*s); L.mesh.add(m); return m;});
  const gash=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),S.mat(GASH_FS,{uEr:{value:0},uK:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(gash);
  const sp1=S.hitSpark(L.mesh,1.3,{seed:0.21}), sp2=S.hitSpark(L.mesh,2.0,{seed:0.83}), ring=S.groundRing(L.decal,2.9);
  const shade=S.contactShadow(L.decal,2.4);
  const bleed=S.status(a,'bleed',[target],T1+0.05,TE);
  const splat=groundPlane(1.7,3.4,0.022,S.mat(POOL_FS(BLOOD,.55),{},{mode:'matter'})); L.decal.add(splat);
  const K=`const float T1=${f(T1)};const float T2=${f(T2)};const vec3 PC=${v3(PC)};`;
  // esquirlas de quitina de cada mordisco (materia carmesí oscura), desde los costados del rival
  [[T1,14],[T2,22]].forEach(([t,n])=>S.pts(L.part,n,VV+K+`void main(){float s=${f(t)}+aSeed.x*.04;float tt=max(uT-s,0.);float age=(uT-s)/(.55+aSeed.y*.3);
   float sd=aSeed.w<.5?-1.:1.;vec3 v=normalize(rnd()+vec3(.3,.6,.9*sd))*(1.5+2.*aSeed.z);vec3 p=PC+vec3(.1,-.15,.55*sd)+v*tt+vec3(0.,-5.5*tt*tt,0.);
   vR=aSeed.w*6.28+tt*(aSeed.z-.5)*10.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.22+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:CHITIN})));
  // salpicaduras de sangre en cada tic de Desangrado
  TB.forEach(t=>S.pts(L.part,10,VV+K+`void main(){float s=${f(t)};float tt=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(-.2,.4,.8))*(.8+1.1*aSeed.z);vec3 p=PC+vec3(0.,0.,.25)+v*tt+vec3(0.,-4.*tt*tt,0.);
   vR=3.14159;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.17+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD})));
  a.pose=function(te,o){
    const ia=te-T1, i2=te-T2;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    // apertura (0 = cerradas con las puntas cruzadas, 1 = abiertas): abre, muerde, reabre a medias, muerde más fuerte, suelta
    let op;
    if(te<T1-0.1)op=back(ss(0,0.3,te))+0.04*Math.sin(te*40)*ss(0.25,0.45,te);
    else if(te<T1){const k=(te-T1+0.1)/0.1;op=1-1.05*k*k;}
    else if(te<T2-0.08)op=-0.05+0.6*ss(T1+0.05,T1+0.18,te);
    else if(te<T2){const k=(te-T2+0.08)/0.08;op=0.55-0.65*k*k;}
    else op=-0.1+0.03*Math.sin(i2*50)*Math.exp(-i2*8)+0.6*ss(TD,TD+0.25,te);
    const dis=ss(TD,TD+0.35,te), form=ss(0,0.15,te), sc=0.55+0.45*back(form);
    const h1=hitE(ia,9), h2=hitE(i2,6);
    mands.forEach((m)=>{const s=m.userData.s;
      m.visible=dis<0.999&&form>0.01;
      m.rotation.set(0,-s*0.8*op,0);                       // gira alrededor de la bisagra: abre hacia fuera
      m.scale.setScalar(Math.max(sc,0.001));
      m.position.x=HX-0.15*(1-form)-0.06*Math.max(op,0)+0.05*(h1+h2);
      const u=m.material.uniforms;u.uA.value=form;u.uEr.value=-0.1+1.1*dis;u.uHot.value=Math.max(h1*0.6,h2);});
    shade.pose(3.3,0,1+0.3*Math.max(op,0),0.3*form*(1-dis));
    let tick=0; for(const t of TB)tick=Math.max(tick,te>=t?Math.exp(-(te-t)*6):0);
    towardCam(gash.position,TC,0.6); billboard(gash); gash.visible=ia>0&&te<TE+0.1;
    gash.scale.setScalar(0.85+0.1*(i2>0?1:0)); gash.material.uniforms.uA.value=ia>0?(i2>0?1:0.6):0;
    gash.material.uniforms.uK.value=Math.max(tick,hitE(i2,8)); gash.material.uniforms.uEr.value=-0.1+1.1*ss(TE-0.35,TE+0.05,te);
    sp1.pose(ia,PC,0.85); sp2.pose(i2,PC,1.1); ring.pose(i2,3.4,0,0.5,1);
    set(splat,-0.1+1.1*ss(TE-0.3,TE+0.1,te),ia>0?ss(0,0.25,ia):0);
    bleed.pose(te);
    target.position.x=3.4+h1*0.08+h2*0.18; target.rotation.z=-(h1*0.1+h2*0.2)*Math.cos(Math.max(i2,0)*14)+0.04*tick;
    target.scale.set(1-0.04*(h1+h2)*(op<0.2?1:0),1,1-0.06*(h1+h2)*(op<0.2?1:0));
    emit(target,0.25*tick+0.4*h2+0.2*h1,0.85,0.08,0.1);
    if(te<T1){o.g.copy(PC);o.gs=0.8;o.ga=0.06*form;o.li=0.8*form;}
    else{const il=i2>=0?i2:ia, k=i2>=0?1:0.6;o.g.copy(PC);o.gs=0.9+1.2*Math.min(il,0.4)*k;o.ga=Math.exp(-il*9)*0.18*k+0.05*tick;o.li=3*k*Math.exp(-il*6)+0.8*tick;}
    o.ia=i2>=0?i2:ia;o.c.copy(PC);o.shake=0;o.dist=i2>=0?0.6:0.4;o.flash=i2>=0?0.4:0.25;
  };
}});

// =====================================================================
// 4 · SQUARE TEETH — el escudo del lanzador destella en hexágonos ámbar y su fuerza viaja en motas hasta la boca
//     (bonus del 50 % del escudo); unas fauces de hormiga león en media luna con dientes cuadrados caen sobre el rival y
//     lo trituran con un rechinar seco: la armadura se resquebraja, saltan lascas de piedra, polvo y arena.
// =====================================================================
const CRACK_FS=`uniform float uEr;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float j=styNoise(vec2(r*.5,an*.3)).r-.5;
 float rays=pow(1.-abs(fract(an*1.1+j*.4)*2.-1.),20.)+pow(1.-abs(fract(an*1.9+j*.6+.3)*2.-1.),28.)*.7;
 float m=rays*smoothstep(uP,uP-.25,r)*smoothstep(1.,.55,r);if(m<.05)discard;
 float er=styErode(styNoise(vUv*.9).r*.6+.4*m,uEr,.12);
 vec3 c=mix(${lin(.12,.04,.02)},styRampOf(uC1,.85)*1.3,smoothstep(.5,1.,rays)*(1.-uEr));
 gl_FragColor=vec4(c,clamp(m*1.5,0.,1.)*er*uA);}`;
// hexágonos del escudo del lanzador (energía ámbar suave); uP = barrido
const HEX_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p*vec2(1.,.8));if(r>1.)discard;
 vec2 g=p*4.;g.x*=1.1547;g.y+=mod(floor(g.x),2.)*.5;vec2 f=abs(fract(g)-.5);float hex=abs(max(f.x*1.5+f.y,f.y*2.)-1.)<.15?1.:0.;
 float sweep=smoothstep(.2,0.,abs(p.y+1.-uP*2.4));float rim=smoothstep(.8,1.,r);
 float m=(hex*(.35+.65*sweep)+rim*.6)*smoothstep(1.,.92,r);if(m<.02)discard;
 gl_FragColor=vec4(styRampOf(uC1,.8)*1.2,m*uA);}`;
defs.push({key:"sty_ibSquareTeeth",name:"Square Teeth (estilizado)",dur:1.2,ti:0.34,tier:1,pal:"Sty Bicho · Dientes",stylized:true,...ZONES,
  phases:[["Fauces",0],["Trituración",0.34],["Polvo",0.58],["Fin",0.95]],
build(a){
  const L=a.L,T0=0.16,TI=0.34,TG=0.56,TE=0.95,JC=V3(3.2,1.32,0.05);
  const top=makeJaw(L.mesh,1,linA(.55,.08,.07),linA(.98,.8,.42),1), bot=makeJaw(L.mesh,1,linA(.55,.08,.07),linA(.98,.8,.42),0);
  L.mesh.add(top,bot);
  const crack=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),S.mat(CRACK_FS,{uEr:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(crack);
  const hex=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.9),S.mat(HEX_FS,{},{mode:'energy'})); L.mesh.add(hex);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.47}), ring=S.groundRing(L.decal,2.4);
  const K=`const float T0=${f(T0)};const float TI=${f(TI)};const float TG=${f(TG)};const vec3 JC=${v3(JC)};`;
  // fuerza del escudo: motas ámbar del lanzador a las fauces
  S.pts(L.part,18,VV+K+`void main(){float s=.02+aSeed.x*.2;float k=clamp((uT-s)/.2,0.,1.);
   vec3 a0=vec3(-3.6,.9+aSeed.y*.7,(aSeed.z-.5)*.4);vec3 p=mix(a0,JC,k*k)+vec3(0.,sin(k*3.14159)*.6,0.)+rnd()*.06;
   vR=0.;vK=0.;vA=(uT>s&&k<1.)?1.:0.;put(p,.16+.08*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // lascas de armadura (piedra)
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(.1,.55,.7))*(1.4+1.6*aSeed.z);vec3 p=JC+v*t+vec3(0.,-6.*t*t,0.);
   vR=aSeed.w*6.28+t*9.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.2+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:STONE}));
  // polvo seco del rechinar
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.15;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.3);
   vec3 d=normalize(rnd()+vec3(0.,.3,.6));vec3 p=JC+vec3(0.,-.2,0.)+d*(.2+.45*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.15*t,0.);
   vR=aSeed.w*6.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.32+.16*aSeed.w)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:EARTH}));
  // arena que se escurre de los dientes al moler
  S.pts(L.part,30,VV+K+`void main(){float life=.3+aSeed.y*.15;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=JC+vec3((r.x-.5)*.8,-.3-age*age*1.,.25+(r.z-.5)*.1);
   vR=r.z*6.;vK=0.;vA=(k>=1.&&uT<${f(TE)}&&p.y>.04)?(1.-smoothstep(TG,${f(TE)},uT)):0.;put(p,.07+.04*r.y);}`,
   S.MATTER_FS(C.shard,{relief:2,col:lin(.85,.68,.42)}));
  a.pose=function(te,o){
    const ia=te-TI, c=te<T0?0:te<TI?Math.pow((te-T0)/(TI-T0),2):1;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    const grind=ia>0?0.05*Math.sin(te*70)*(1-ss(TI,TG,te)):0, dis=ss(TG,TE,te), form=ss(0,T0,te);
    const open=Math.max(0.85*(1-c),0)+(ia>0?0.05*Math.exp(-ia*20):0);
    const R=camRight();
    [[top,1],[bot,-1]].forEach(([m,s])=>{m.visible=dis<0.999&&form>0.01;
      towardCam(m.position,tmp.copy(JC).addScaledVector(R,grind*s).add(tmp2.set(0,s*(0.14+0.5*open),0)),0.45);
      billboard(m,s*0.15*open); m.scale.setScalar(Math.max(1.6*(0.5+0.5*back(form)),0.001));
      jawU(m,form,-0.1+1.1*dis,hitE(ia,9));});
    // destello hexagonal del escudo del lanzador (la fuerza que suma al mordisco)
    const hk=ss(0,0.06,te)*(1-ss(0.2,0.32,te));
    hex.visible=hk>0.01; towardCam(hex.position,tmp.set(-3.7,0.95,0),0.5); billboard(hex); set(hex,cl(te/0.3),hk*0.8);
    towardCam(crack.position,JC,0.42); billboard(crack); crack.visible=ia>0&&te<TE+0.1;
    set(crack,ss(0,0.12,ia),1); crack.material.uniforms.uEr.value=-0.1+1.1*ss(TG,TE+0.05,te);
    spark.pose(ia,JC,0.9); ring.pose(ia,3.4,0,0.4,0.9);
    const hit=hitE(ia,10); target.scale.set(1+0.06*hit,1-0.12*hit,1+0.06*hit); target.position.x=3.4+hit*0.06+grind*0.6;
    emit(target,0.25*hit,0.95,0.55,0.2); emit(caster,0.25*hk,0.95,0.6,0.2);
    if(te<TI){o.g.copy(JC);o.gs=0.6;o.ga=0.05*form;o.li=0.7*form;}
    else{o.g.copy(JC);o.gs=0.8+1.2*Math.min(ia,0.3);o.ga=Math.exp(-ia*10)*0.15;o.li=2.5*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(JC);o.shake=0;o.dist=0.45;o.flash=0.25;
  };
}});

VFX.module("Estilizado · Bicho · Boca",defs);
})();

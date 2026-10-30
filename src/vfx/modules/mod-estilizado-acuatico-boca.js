// =====================================================================
// ESTILIZADO · ACUÁTICO · BOCA (Hito 101) — las 4 cartas de boca de Acuático rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_qbCatfish, sty_qbLam, sty_qbPiranha, sty_qbRiskyFish).
// Mismos dur / ti / fases (y variantes de Lam) que mod-acuatico-boca.js: el daño llega igual. Concepto según PartCards.js:
//  · Catfish (daño + drenaje 50 %): un espíritu de pez gato (silueta de agua oscura con barbillas, sin cara) nada bajo
//    hasta el rival, lo enlaza con las barbillas y lo descarga con arcos eléctricos turquesa; un chorro de agua viva
//    vuelve a la boca del lanzador, que se cura.
//  · Lam (daño, +20 con vida ≥ 75 %): una lamprea se lanza y su ventosa (anillo de dientes en espiral) se aferra al pecho
//    y gira; al soltarse deja la marca redonda. Variante «alta» (bonus): aura dorada de vitalidad; «baja»: latido rojo.
//  · Piranha (daño + Sangrado): un cardumen de tres pirañas nada en una cinta de agua; dos medias lunas de mordisco
//    (escamas plata y carmesí, dientes de marfil en el borde interior) cierran y desgarran; sangre en el agua.
//  · Risky Fish (gran daño, Débil en el lanzador): una columna de agua lanza un pez espíritu en un salto alto; cae en
//    picado con estela en espiral y revienta en una corona de agua; el lanzador queda Débil.
// Acuático = agua turquesa saturada (nunca espuma blanca por todas partes). Colores fijos a lineal (lin()).
// Cuerpo a cuerpo: zonas 0,5 / 1,3 para que nada se encoja a una casilla. Módulo autónomo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,camera,caster,target}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Acuático · Pez Gato",["#3fe0d0","#0b4f6c"]);
VFX.palette("Sty Acuático · Lamprea",["#7fd6c4","#2b3f63"]);
VFX.palette("Sty Acuático · Piraña",["#ff6a5a","#0e4a66"]);
VFX.palette("Sty Acuático · Riesgo",["#5ff2c4","#0a5a6e"]);

const lin=(r,g,b)=>`vec3(${[r,g,b].map(x=>Math.pow(x,2.2).toFixed(4)).join(',')})`;
const linA=(r,g,b)=>[r,g,b].map(x=>Math.pow(x,2.2));
const MO=V3(-3.43,1.55,0), TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const ZONES={zoneCaster:0.5,zoneTarget:1.3};
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const emit=(d,k,r,g,b)=>{const m=d.userData.m;if(r===undefined)m.emissive.copy(U.uC1.value);else m.emissive.setRGB(r,g,b);m.emissiveIntensity=k;};
const resetDummy=d=>{d.rotation.set(0,0,0);d.scale.set(1,1,1);};
const col3=(a)=>new THREE.Color().setRGB(...a);

// colores semánticos (lineales)
const WATER=lin(.12,.62,.72), DEEP=lin(.03,.24,.36), FOAM=lin(.55,.88,.9), BLOOD=lin(.62,.03,.06);
const IVORY=lin(.93,.86,.7), GOLD=lin(1.,.78,.3);

const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdE(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}`;
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.2});
const WATERDROP_FS=S.MATTER_FS(C.drop,{relief:4,col:WATER});
const FOAMPUFF_FS=S.MATTER_FS(C.puff,{relief:3,col:FOAM});
const POOL_FS=(col,al=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.85,.7,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);float rip=smoothstep(.04,.0,abs(fract(r*3.-uT*.6)-.5)-.44)*.3;
 gl_FragColor=vec4(styRampOf(${col},.25+.35*n+rip),m*er*uA*${f(al)});}`;

// ---------- pez espíritu: silueta SDF iluminada en 3 bandas (sin cara: solo agalla, aletas y escamas) ----------
// uKind 0 = pez gato (cabeza plana, barbillas) · 1 = piraña (cuerpo alto, vientre rojo) · 2 = pez del salto (esbelto)
// uBack / uBelly = colores lineales; uEr = erosión; uQ = barbillas extendidas / aletas abiertas; uFlip = 1 si mira a la izquierda
const FISH_FS=SDF2+`uniform float uKind;uniform float uFlip;uniform float uEr;uniform float uQ;uniform vec3 uBack;uniform vec3 uBelly;
float bodyH(){return uKind<.5?.24:(uKind<1.5?.4:.25);}
float sdBody(vec2 p){float h=bodyH();float sw=sin(uT*9.)*.05*(1.-p.x)*.5;p.y+=sw*step(p.x,0.);
 float d=sdE(p-vec2(.08,0.),vec2(.6,h));
 if(uKind<.5)d=smin(d,sdE(p-vec2(.4,-.02),vec2(.28,h*.85)),.08);          // cabeza ancha y plana del pez gato
 vec2 q=p-vec2(-.6,0.);float tw=.05+.4*clamp(-q.x/.32,0.,1.);
 float tail=max(abs(q.y)-tw*(uKind>1.5?1.1:1.),max(q.x-.06,-q.x-.32));
 tail=max(tail,-(sdE(q-vec2(-.38,0.),vec2(.1,.14))));                     // escotadura de la cola
 d=smin(d,tail,.07);
 float dors=sdE(rot2(p-vec2(-.04,h*.92),.35),vec2(uKind>1.5?.3:.22,.09+.04*uQ));d=smin(d,dors,.05);
 float pec=sdE(rot2(p-vec2(.18,-h*.55),-.6-uQ*.4),vec2(uKind>1.5?.26:.15,.06));d=smin(d,pec,.04);
 return d;}
float sdBarb(vec2 p){if(uKind>.5)return 9.;float e=.25+.75*uQ;float w=sin(uT*7.)*.06;
 vec2 a=vec2(.66,-.06);vec2 b1=a+vec2(.25*e,-.12*e+w),c1=b1+vec2(.18*e,-.2*e-w);
 vec2 b2=a+vec2(.3*e,.05*e-w),c2=b2+vec2(.22*e,.08*e+w);
 return min(min(sdSeg(p,a,b1),sdSeg(p,b1,c1)),min(sdSeg(p,a,b2),sdSeg(p,b2,c2)))-.022;}
float sdfH(vec2 p){return sqrt(clamp(-sdBody(p)/.14,0.,1.));}
vec3 sdfN(vec2 p){float e=.014;float hx=sdfH(p+vec2(e,0.))-sdfH(p-vec2(e,0.));float hy=sdfH(p+vec2(0.,e))-sdfH(p-vec2(0.,e));
 return normalize(vec3(-hx*.8,-hy*.8,1.));}
void main(){vec2 p=(vUv-.5)*2.;if(uFlip>.5)p.y=-p.y;
 float d=sdBody(p);float db=sdBarb(p);float dd=min(d,db);
 float m=smoothstep(.015,-.015,dd);if(m<.01)discard;
 float n=styNoise(vUv*.9+uKind*.3).r;float er=styErode(n*.6+.4*clamp(-dd*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 vec2 pl=p;if(uFlip>.5)pl.y=-pl.y;
 float l=styLight(sdfN(pl),stySunV());
 float h=bodyH();float bel=smoothstep(.05,-.12,p.y+h*.15);
 vec3 c=mix(styRampOf(uBack,clamp(.2+.6*l,0.,1.)),styRampOf(uBelly,clamp(.3+.55*l,0.,1.)),bel)*styTint(l);
 vec2 sc=vec2(p.x*7.,p.y*7.+.5*floor(p.x*7.));float scl=smoothstep(.06,0.,abs(length(fract(sc)-.5)-.42));
 c*=1.-.22*scl*step(d,0.)*smoothstep(-.6,.4,p.x);
 float gill=smoothstep(.03,.0,abs(length(p-vec2(.62,0.))-.3))*step(p.x,.5)*step(abs(p.y),h*.8);c*=1.-.45*gill;
 float fin=step(.01,sdE(p-vec2(.08,0.),vec2(.6,h)));c=mix(c,styRampOf(uBack,.15+.4*l),fin*.55);
 float rim=smoothstep(-.05,-.012,d)*step(d,db+.001);c=mix(c,${lin(.02,.07,.1)},rim*.9);
 c=mix(c,styRampOf(uBack,.08),step(db,d));
 gl_FragColor=vec4(c,a);}`;
const makeFish=(parent,kind,backC,bellyC)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(FISH_FS,{uKind:{value:kind},uEr:{value:0},uQ:{value:0},
  uFlip:{value:0},uBack:{value:col3(backC)},uBelly:{value:col3(bellyC)}},{mode:'matter'}));parent.add(m);return m;};
// orienta un pez en billboard según su velocidad en pantalla (lo voltea si va hacia la izquierda)
const aimFish=(m,p,v,size,toCam=0.12)=>{towardCam(m.position,p,toCam);const ang=scrAng(p,v);const left=Math.abs(ang)>Math.PI/2;
  billboard(m,ang);m.material.uniforms.uFlip.value=left?1:0;m.scale.set(size,size,1);};

// ---------- media luna de mordisco con escamas (Piranha) ----------
const BITE_FS=`uniform float uUp;uniform float uEr;uniform float uHot;uniform vec3 uScale;uniform vec3 uTooth;uniform vec3 uLip;
float inY(float x){return -.66+sqrt(max(.81-x*x,0.));}
float bandD(vec2 p){float o=length(p-vec2(0.,-.56))-.95;float i=length(p-vec2(0.,-.66))-.9;float d=max(o,-i);
 return max(d,abs(p.x)-.95+.36*smoothstep(.3,.95,abs(p.x)));}
float teethD(vec2 p){float x=p.x;float y0=inY(x);float tri=1.-abs(fract(x*9.+.25)-.5)*2.;float h=.025+.055*tri;
 return max(max(y0-h-p.y,p.y-y0-.03),abs(x)-.72);}
void main(){vec2 p=(vUv-.5)*vec2(2.,1.25);if(uUp<.5)p.y=-p.y;
 float n=styNoise(vec2(p.x*.6+uUp*.37,p.y*.3)+.1).b;float nb=styNoise(vUv*1.3+uUp).r;
 float db=bandD(p)+(nb-.5)*.04;float dt=teethD(p);float d=min(db,dt);
 float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float er=styErode(n*.55+.45*clamp(-d*6.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float isT=step(dt,db);float ry=length(p-vec2(0.,-.61))-.925;
 vec3 N=normalize(vec3(-p.x*.45,-ry*12.,1.));float l=styLight(N,stySunV());
 vec3 body=mix(styRampOf(uLip,clamp(.25+.55*l,0.,1.)),styRampOf(uScale,clamp(.3+.55*l,0.,1.)),smoothstep(-.03,.06,ry));
 vec2 sc=vec2(p.x*9.,ry*30.+.5*floor(p.x*9.));float scl=smoothstep(.07,0.,abs(length(fract(sc)-.5)-.42));
 body*=(1.-.25*scl*(1.-isT))*styTint(l);
 float sheen=smoothstep(.035,.0,abs(ry+.02))*(1.-isT);body=mix(body,${lin(.85,.95,1.)},sheen*.3*l);
 vec3 tooth=styRampOf(uTooth,clamp(.35+.5*l+.25*clamp(-dt*10.,0.,1.),0.,1.))*styTint(l);
 vec3 c=mix(body,tooth,isT);
 float rim=smoothstep(-.055,-.015,d);c=mix(c,${lin(.02,.05,.08)},rim*.9);
 c+=uLip*1.6*uHot*smoothstep(.06,.0,abs(dt))*isT;
 gl_FragColor=vec4(c,a);}`;
const makeBite=(parent,up)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.78),S.mat(BITE_FS,{uUp:{value:up},uEr:{value:0},uHot:{value:0},
  uScale:{value:col3(linA(.62,.7,.74))},uTooth:{value:col3(linA(.95,.9,.76))},uLip:{value:col3(linA(.75,.1,.12))}},{mode:'matter',depthTest:false}));parent.add(m);return m;};

// ---------- arcos eléctricos turquesa (Catfish) ----------
const ZAP_FS=`uniform float uStep;
float hsh(float x){return fract(sin(x*127.1+uStep*31.7)*43758.5);}
float zz(float x,float i){float k=x*7.+i*13.;float a=hsh(floor(k)+i*5.),b=hsh(floor(k)+1.+i*5.);return mix(a,b,fract(k))-.5;}
void main(){vec2 p=(vUv-.5)*2.;float m=0.,core=0.;
 for(int i=0;i<4;i++){float fi=float(i);float an=fi*.8+uStep*.37;vec2 q=vec2(cos(an)*p.x+sin(an)*p.y,-sin(an)*p.x+cos(an)*p.y);
  float y=zz(q.x,fi)*.32+sin(q.x*2.+fi)*.12;float dy=abs(q.y-y);float on=step(abs(q.x),.85-.15*fi*.3);
  m=max(m,smoothstep(.07,.02,dy)*on);core=max(core,smoothstep(.025,.0,dy)*on);}
 float a=m*uA;if(a<.01)discard;
 vec3 c=mix(${lin(.05,.55,.75)}*1.4,${lin(.75,1.,.55)}*2.2,core);gl_FragColor=vec4(c,a);}`;

// ---------- ventosa de lamprea (Lam): anillo de dientes en espiral, materia ----------
const SUCK_FS=`uniform float uRot;uniform float uEr;uniform float uGold;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float ring=smoothstep(.98,.94,r)*smoothstep(.5,.55,r);
 float t=0.;for(int k=0;k<2;k++){float fk=float(k);float rr=.88-fk*.15;float nT=9.-fk*2.;
  float u=fract((an+uRot*(1.+fk*.4))/6.2832*nT+fk*.33);float tri=1.-abs(u-.5)*2.;
  float hgt=.065*tri;t=max(t,step(rr-hgt-.012,r)*step(r,rr)*step(.35,tri));}
 float hole=smoothstep(.52,.47,r);
 float m=max(ring,max(t,hole*.85));if(m<.01||r>1.)discard;
 float n=styNoise(vUv*.9+.4).r;float er=styErode(n*.6+.4*ring,uEr,.1);float a=m*er*uA;if(a<.01)discard;
 vec3 N=normalize(vec3(p*.9*(r-.75),1.));float l=styLight(N,stySunV());
 vec3 skin=styRampOf(${lin(.33,.15,.3)},clamp(.25+.55*l,0.,1.))*styTint(l);
 vec3 tooth=styRampOf(mix(${lin(.95,.86,.62)},${GOLD},uGold),clamp(.4+.5*l,0.,1.))*styTint(l);
 vec3 c=mix(skin,tooth,t);c=mix(c,${lin(.02,.06,.09)},hole*.95);
 float rim=smoothstep(.9,.97,r)+smoothstep(.58,.52,r)*(1.-hole);c=mix(c,${lin(.02,.05,.08)},clamp(rim,0.,1.)*.85*(1.-t));
 c+=${GOLD}*uGold*.6*t;gl_FragColor=vec4(c,a);}`;

// estela de agua del nado: cinta en el suelo revelada por uP (construida a lo largo: no es rígida)
const WAKE_FS=`uniform float uFade;void main(){float u=vUv.x;if(u>uP)discard;float w=abs(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*3.-uT*.8,vUv.y)).b;float m=smoothstep(1.,.55,w+n*.4)*smoothstep(0.,.08,u)*smoothstep(uP,uP-.12,u);
 float er=styErode(n*.6+.4*(1.-w),uFade,.15);if(m*er<.01)discard;
 float band=smoothstep(.04,.0,abs(fract(w*2.+u*4.-uT*2.)-.5)-.42);
 gl_FragColor=vec4(styRampOf(${WATER},.3+.4*(1.-w)+.2*band),m*er*uA*.8);}`;
const wakePlane=(parent,x0,x1,w)=>{const g=new THREE.PlaneGeometry(x1-x0,w).rotateX(-Math.PI/2).translate((x0+x1)/2,0.03,0);
  const m=new THREE.Mesh(g,S.mat(WAKE_FS,{uFade:{value:0}},{mode:'matter'}));parent.add(m);return m;};

const defs=[];

// =====================================================================
// 1 · CATFISH — pez gato espíritu (silueta de agua oscura con barbillas, sin cara) nada bajo hasta el rival, lo enlaza
//     con las barbillas y lo descarga: arcos eléctricos turquesa y amarillo verdoso. Un chorro de agua viva vuelve a la
//     boca del lanzador (drenaje 50 %) con anillo y motas de cura; el pez se deshace en burbujas.
// =====================================================================
defs.push({key:"sty_qbCatfish",name:"Catfish (estilizado)",dur:2.2,ti:0.55,tier:2,pal:"Sty Acuático · Pez Gato",stylized:true,...ZONES,
  phases:[["Nado",0],["Bigotes",0.42],["Descarga",0.55],["Drenaje",0.65],["Suelta",1.5],["Regreso",1.62]],
build(a){
  const L=a.L,TB=0.42,TI=0.55,TD=0.65,TS=1.5,TE=2.0,P0=V3(-2.9,0.7,0.15),P1=V3(2.45,1.0,0.12),Q1=V3(0.2,3.0,0.5);
  const fish=makeFish(L.mesh,0,linA(.08,.34,.42),linA(.42,.78,.72));
  const zap=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),S.mat(ZAP_FS,{uStep:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(zap);
  const wake=wakePlane(L.decal,-3.2,2.9,0.9);
  const spark=S.hitSpark(L.mesh,0.9,{seed:0.52}), ring=S.groundRing(L.decal,2.8), heal=S.groundRing(L.decal,2.0);
  const shadow=S.contactShadow(L.decal,1.6);
  const pool=groundPlane(1.8,3.4,0.024,S.mat(POOL_FS(WATER,.5),{},{mode:'matter'})); L.decal.add(pool);
  const QB=`vec3 qb(float u){float w=1.-u;return w*w*${v3(TC)}+2.*w*u*${v3(Q1)}+u*u*${v3(MO)};}`;
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TD=${f(TD)};const float TS=${f(TS)};const vec3 TC=${v3(TC)};`+QB;
  const fpos=(te,out)=>{const k=cl(te/TB),e=ss(0,1,k);return out.set(P0.x+(P1.x-P0.x)*e,P0.y+(P1.y-P0.y)*e+0.18*Math.sin(k*9),P0.z+(P1.z-P0.z)*e+0.12*Math.cos(k*7));};
  // burbujas de la estela del nado
  S.pts(L.part,30,VV+K+`void main(){float s=aSeed.x*TB;float age=(uT-s)/(.6+aSeed.y*.3);float t=max(uT-s,0.);
   float k=s/TB;vec3 p=vec3(-2.9+5.35*k*k*(3.-2.*k),.55+aSeed.z*.3+t*.6,.15+(aSeed.w-.5)*.5);
   vR=0.;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.16+.1*aSeed.w);}`,WATERDROP_FS);
  // salpicadura del golpe eléctrico
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=(uT-s)/(.55+aSeed.y*.25);
   vec3 v=normalize(rnd()+vec3(-.6,.7,.3))*(1.3+1.8*aSeed.z);vec3 p=TC+v*t+vec3(0.,-6.*t*t,0.);
   vR=3.14159+atan(v.x,v.y)*.3;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.2+.1*aSeed.w);}`,WATERDROP_FS);
  // chispas turquesa que saltan de las barbillas
  S.pts(L.part,24,VV+K+`void main(){float life=.1+aSeed.y*.06;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k))*2.-1.;
   vec3 p=TC+r*vec3(.6,.7,.5)*(.5+age);vR=r.z*3.;vK=0.;vA=(k>=1.&&uT<TD+.25)?1.-age:0.;put(p,.16+.08*r.y);}`,MOTE_FS,{mode:'energy'});
  // chorro de agua viva que vuelve a la boca (drenaje)
  S.pts(L.part,50,VV+K+`void main(){float t=uT-TD;float u=fract(aSeed.x+t*.9);float rev=clamp(t/.25,0.,1.);
   vec3 p=qb(u)+rnd()*.08;float on=(t>0.&&uT<TS+.1)?1.:0.;
   vR=3.14159;vK=0.;vA=on*smoothstep(0.,.05,u)*step(u,rev)*smoothstep(1.,.92,u);put(p,.2+.1*aSeed.z);}`,WATERDROP_FS);
  // el lanzador se cura: motas turquesa en espiral
  S.pts(L.part,22,VV+K+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TD-.35)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*2.;float rd=.45+.15*r.y;vec3 p=vec3(-3.7+cos(an)*rd,.2+r.z*1.1+age*.7,sin(an)*rd);
   vR=age*3.;vK=0.;vA=(k>=1.&&uT<TS+.3)?sin(age*3.14159):0.;put(p,(.2+.12*r.y)*sin(age*3.14159));}`,MOTE_FS,{mode:'energy'});
  // el pez se deshace en burbujas
  S.pts(L.part,20,VV+K+`void main(){float s=TS+aSeed.x*.1;float t=max(uT-s,0.);float age=(uT-s)/(.6+aSeed.y*.3);
   vec3 p=vec3(2.45,1.,.12)+vec3((aSeed.y-.5)*1.1,(aSeed.z-.5)*.4+t*.9,(aSeed.w-.5)*.4);
   vR=0.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.15+.1*aSeed.w);}`,WATERDROP_FS);
  const fp=V3(0,0,0), fv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,0.12,te), dis=ss(TS,TS+0.3,te), drain=te>TD?1-ss(TS,TS+0.3,te):0;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.rotation.z=-0.08*ss(0,0.12,te)+0.08*ss(0.12,0.3,te);
    if(te<TB){fpos(te,fp);fpos(te+0.01,tmp3);fv.copy(tmp3).sub(fp);}
    else{fp.set(P1.x+0.05*Math.sin(te*20)*(1-dis),P1.y+0.04*Math.sin(te*6),P1.z);fv.set(1,0,0);}
    aimFish(fish,fp,fv,2.1*(0.5+0.5*back(form)));
    fish.visible=te<TS+0.35; const fu=fish.material.uniforms;
    fu.uA.value=form; fu.uQ.value=ss(TB-0.05,TI,te)*(1-0.4*dis); fu.uEr.value=-0.1+1.1*dis;
    shadow.pose(fp.x,fp.z,1.1,te<TS?0.5*form:0);
    set(wake,ss(0,TB,te),1); wake.material.uniforms.uFade.value=-0.1+1.1*ss(TB+0.2,TB+0.8,te); U.uE.value=1;
    // descarga: arcos que parpadean alrededor del rival
    const zk=ia>0?1-ss(0.35,0.55,ia):0; zap.visible=zk>0.01; towardCam(zap.position,TC,0.3); billboard(zap,0);
    zap.material.uniforms.uStep.value=Math.floor(te*24); zap.material.uniforms.uA.value=zk; zap.scale.setScalar(1+0.15*Math.sin(te*50));
    spark.pose(ia,TC,1.0); ring.pose(ia,3.4,0,0.45,1); heal.pose(te-TD-0.35,-3.7,0,0.7,0.9);
    set(pool,-0.1+1.1*ss(TE-0.4,TE+0.1,te),ia>0?ss(0,0.25,ia):0);
    const hit=hitE(ia,8); target.position.x=3.4+hit*0.12+0.025*Math.sin(te*90)*zk; target.rotation.z=-hit*0.12;
    emit(target,0.5*zk,0.2,0.85,0.95); emit(caster,0.25*drain*(0.5+0.5*Math.sin(te*12)),0.2,0.85,0.8);
    if(te<TI){o.g.copy(fp);o.gs=0.9;o.ga=0.06;o.li=0.7;}
    else{o.g.copy(TC);o.gs=1.2;o.ga=0.12*zk;o.li=0.8+2.6*zk;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.45;o.flash=0.25;
  };
}});

// =====================================================================
// 2 · LAM — la lamprea (silueta de anguila oscura) se lanza desde la boca; su ventosa, un anillo de dientes en espiral,
//     se aferra al pecho y gira raspando; al soltarse deja la marca redonda y gotas. «alta»: aura dorada (bonus +20) y
//     dientes dorados; «baja»: latido rojo en el lanzador y mordisco normal.
// =====================================================================
const EEL_FS=SDF2+`uniform float uEr;uniform float uFlip;
void main(){vec2 p=(vUv-.5)*vec2(2.,1.);float x=p.x;float wav=sin(x*6.-uT*14.)*.12*(1.-x)*.5;float y=p.y-wav;
 float w=mix(.05,.32,smoothstep(-1.,.6,x))*(1.-smoothstep(.85,1.,x)*.4);float d=max(abs(y)-w,abs(x)-.98);
 float fin=max(abs(y-w*.9)-.04*(1.-x*x),abs(x+.2)-.6);d=min(d,fin);
 float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float n=styNoise(vUv*.8).r;float er=styErode(n*.6+.4*clamp(-d*8.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(normalize(vec3(0.,-y/max(w,.01)*.9,1.)),stySunV());
 vec3 c=styRampOf(${lin(.2,.32,.4)},clamp(.2+.6*l,0.,1.))*styTint(l);
 c=mix(c,styRampOf(${lin(.55,.62,.55)},.5),smoothstep(0.,-w,y)*.4);
 float spot=smoothstep(.35,.42,styNoise(vec2(x*2.,y*4.)+.3).g);c*=1.-.25*spot;
 c=mix(c,${lin(.02,.05,.08)},smoothstep(-.03,-.008,d)*.9);
 gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_qbLam",name:"Lam (estilizado)",dur:1.8,ti:0.55,tier:2,pal:"Sty Acuático · Lamprea",stylized:true,...ZONES,
  vlabel:"Vida",variants:[["alta","Vida alta"],["baja","Vida baja"]],v:"alta",
  phases:[["Acecho",0],["Embestida",0.15],["Mordisco",0.55],["Retirada",0.8],["Calma",1.35]],
build(a){
  const L=a.L,TL=0.15,TI=0.55,TR=0.8,TE=1.35,PS=V3(-3.1,1.45,0.1),PE=V3(2.75,1.25,0.15);
  const eel=new THREE.Mesh(new THREE.PlaneGeometry(1,0.5),S.mat(EEL_FS,{uEr:{value:0},uFlip:{value:0}},{mode:'matter'})); L.mesh.add(eel);
  const sucker=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(SUCK_FS,{uRot:{value:0},uEr:{value:0},uGold:{value:1}},{mode:'matter',depthTest:false})); L.mesh.add(sucker);
  const markU={uEr:{value:0}};
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(`uniform float uEr;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float m=smoothstep(.1,.0,abs(r-.7)-.12);float dots=step(.55,fract(atan(p.y,p.x)/6.2832*16.))*smoothstep(.08,.0,abs(r-.55));
   m=max(m,dots);if(m<.01)discard;float er=styErode(styNoise(vUv).r*.6+.4*m,uEr,.12);
   gl_FragColor=vec4(${lin(.45,.06,.1)},m*er*uA*.85);}`,markU,{mode:'matter',depthTest:false})); L.mesh.add(mark);
  const spark=S.hitSpark(L.mesh,0.8,{seed:0.33}), ring=S.groundRing(L.decal,2.6);
  const goldRing=S.groundRing(L.decal,2.2);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TR=${f(TR)};const vec3 TC=${v3(TC)};`;
  // gotas y raspaduras mientras gira la ventosa
  S.pts(L.part,30,VV+K+`void main(){float life=.25+aSeed.y*.15;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;vec3 d=vec3(-.3,cos(an),sin(an));vec3 p=TC+vec3(-.15,0.,.2)+d*(.4+.6*age)+vec3(0.,-.8*age*age,0.);
   vR=an;vK=smoothstep(.6,1.,age);vA=(k>=1.&&uT<TR+.1)?1.:0.;put(p,.16+.08*r.y);}`,WATERDROP_FS);
  // bonus de vida (variante alta): chispas doradas que suben por el lanzador
  const goldU={value:1};
  S.pts(L.part,22,VV+K+`uniform float uGoldP;void main(){float life=.55+aSeed.y*.3;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*2.5;vec3 p=vec3(-3.7+cos(an)*.5,.2+r.z*.9+age*1.,sin(an)*.5);
   vR=age*3.;vK=0.;vA=(uT<TR)?sin(age*3.14159)*uGoldP:0.;put(p,(.18+.1*r.y)*sin(age*3.14159));}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy',uniforms:{uGoldP:goldU}});
  // gotas que caen al soltarse
  S.pts(L.part,18,VV+K+`void main(){float s=TR+aSeed.x*.06;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(-.8,.3,.4))*(.9+1.2*aSeed.z);vec3 p=TC+v*t+vec3(0.,-5.*t*t,0.);
   vR=3.14159;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  a.setVariant=v=>{a.v=(v==="baja")?"baja":"alta";goldU.value=a.v==="alta"?1:0;sucker.material.uniforms.uGold.value=goldU.value;};
  const ep=V3(0,0,0), ev=V3(0,0,0);
  a.pose=function(te,o){
    const low=a.v==="baja", ia=te-TI, ir=te-TR, form=ss(TL-0.05,TL+0.05,te);
    resetDummy(caster); resetDummy(target); target.position.x=3.4;
    const lunge=ss(TL,TI,te)*(1-ss(TR,TE,te)); caster.position.x=-3.7+0.35*lunge;
    caster.rotation.z=0.12*ss(0,TL,te)-0.3*ss(TL,TL+0.1,te)+0.18*ss(TI,TI+0.15,te);
    caster.scale.set(1,1-0.07*ss(0,TL,te)*(1-ss(TL,TL+0.08,te)),1);
    if(low)emit(caster,0.12+0.12*Math.pow(0.5+0.5*Math.sin(te*9),6),1,0.2,0.2);
    else emit(caster,0.12+0.22*lunge,1,0.75,0.3);
    // anguila: sale de la boca y vuela hasta el pecho; luego queda tirante entre ventosa y boca hasta soltarse
    const k=cl((te-TL)/(TI-TL)), e=k*k*(3-2*k);
    if(te<TI){ep.set(PS.x+(PE.x-PS.x)*e,PS.y+(PE.y-PS.y)*e+0.35*Math.sin(Math.PI*k),PS.z+(PE.z-PS.z)*e);ev.set(1,0.3*Math.cos(Math.PI*k),0);}
    else{const pull=ss(TR,TR+0.35,te);ep.set(PE.x-1.6*pull,PE.y+0.1*pull,PE.z);ev.set(1,0,0);}
    eel.visible=te>TL-0.05&&te<TE; towardCam(eel.position,tmp.copy(ep).addScaledVector(ev.normalize(),-0.7),0.1);
    billboard(eel,scrAng(ep,ev)); eel.scale.set(2.8,1.9,1);
    eel.material.uniforms.uA.value=form; eel.material.uniforms.uEr.value=-0.1+1.1*ss(TR+0.15,TE,te);
    // ventosa: se abre en vuelo, se aferra y gira; al soltarse se erosiona
    const grip=te>=TI-0.08?1:0, sk=ss(TL,TI,te);
    sucker.visible=te>TL&&te<TE; towardCam(sucker.position,te<TI?ep:TC,0.35); billboard(sucker,0.12);
    {const sc=(0.45+0.65*sk)*(te>=TI?1-0.15*hitE(ia,14):1)*0.75;sucker.scale.set(sc*0.5,sc,1);}
    const su=sucker.material.uniforms; su.uA.value=sk; su.uRot.value=te<TI?te*2:(TI*2+(te-TI)*9*(1-ss(TR,TR+0.2,te)));
    su.uEr.value=-0.1+1.1*ss(TR,TR+0.35,te);
    // marca redonda que queda al soltarse
    mark.visible=ir>0&&te<TE+0.4; towardCam(mark.position,TC,0.3); billboard(mark,0.12); mark.scale.set(0.4,0.8,1);
    mark.material.uniforms.uA.value=ss(0,0.08,ir); markU.uEr.value=-0.1+1.1*ss(TE-0.35,TE+0.4,te);
    spark.pose(ia,TC,low?0.85:1.15); ring.pose(ia,3.4,0,0.45,1);
    if(low)goldRing.mesh.visible=false; else goldRing.pose(te-TL,-3.7+0.35*lunge,0,0.6,0.85);
    U.uE.value=1;
    const hit=hitE(ia,8)*grip, tug=te>TI&&te<TR?1:0;
    target.position.x=3.4+hit*0.1-0.1*ss(TR,TR+0.15,te)*(1-ss(TR+0.15,TR+0.45,te)); target.rotation.z=-hit*0.14+0.03*tug*Math.sin(te*40);
    emit(target,0.3*hit,0.8,0.15,0.18);
    if(te<TI){o.g.copy(ep);o.gs=0.7;o.ga=0.06;o.li=0.7+0.6*lunge;}
    else{o.g.copy(TC);o.gs=1;o.ga=0.1*hitE(ia,6);o.li=0.8+2.2*hitE(ia,5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.45;o.flash=0.2;
  };
}});

// =====================================================================
// 3 · PIRANHA — tres pirañas (lomo pizarra, vientre carmesí) nadan en una cinta de agua hasta el rival; dos medias lunas
//     de mordisco con escamas plata y carmesí y dientes de marfil cierran y desgarran; sangre en el agua y Sangrado.
// =====================================================================
defs.push({key:"sty_qbPiranha",name:"Piranha (estilizado)",dur:1.9,ti:0.62,tier:2,pal:"Sty Acuático · Piraña",stylized:true,...ZONES,
  phases:[["Acecho",0],["Nado",0.15],["Fauces",0.48],["Mordisco",0.62],["Desgarro",0.72],["Sangrado",0.95]],
build(a){
  const L=a.L,TN=0.15,TF=0.48,TI=0.62,TD=0.72,TB=0.95,TE=1.85,PC=V3(3.2,1.25,0.05);
  const fishes=[0,1,2].map(()=>makeFish(L.mesh,1,linA(.2,.3,.38),linA(.85,.18,.16)));
  const bites=[1,0].map(up=>makeBite(L.mesh,up));
  const wake=wakePlane(L.decal,-3.0,2.9,0.8);
  const sp1=S.hitSpark(L.mesh,1.0,{seed:0.71}), sp2=S.hitSpark(L.mesh,0.8,{seed:0.19}), ring=S.groundRing(L.decal,2.9);
  const bleed=S.status(a,'bleed',[target],TI+0.05,TE);
  const stain=groundPlane(1.9,3.4,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=styNoise(vUv*.8+.4).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.85,.7,r+(n-.5)*.5);if(m<.01)discard;
   float er=styErode(n*.7+m*.3,uP,.14);vec3 c=mix(styRampOf(${WATER},.35+.3*n),styRampOf(${BLOOD},.3+.3*n),smoothstep(.55,.2,r+(n-.5)*.3));
   gl_FragColor=vec4(c,m*er*uA*.6);}`,{},{mode:'matter'})); L.decal.add(stain);
  const K=`const float TI=${f(TI)};const float TD=${f(TD)};const float TB=${f(TB)};const vec3 PC=${v3(PC)};`;
  // agua y sangre que saltan del mordisco y del desgarro
  [[TI,20,WATERDROP_FS],[TD,18,S.MATTER_FS(C.drop,{relief:4,col:BLOOD})]].forEach(([t,n,fs])=>S.pts(L.part,n,VV+K+`void main(){float s=${f(t)}+aSeed.x*.04;float tt=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.25);
   vec3 v=normalize(rnd()+vec3(-.3,.6,.4))*(1.3+1.7*aSeed.z);vec3 p=PC+v*tt+vec3(0.,-5.5*tt*tt,0.);
   vR=3.14159+atan(v.x,v.y)*.3;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.19+.1*aSeed.w);}`,fs));
  // escamas plateadas que saltan en el desgarro
  S.pts(L.part,14,VV+K+`void main(){float s=TD+aSeed.x*.05;float tt=max(uT-s,0.);float age=(uT-s)/(.55+aSeed.y*.3);
   vec3 v=normalize(rnd()+vec3(.2,.5,.5))*(1.4+1.6*aSeed.z);vec3 p=PC+v*tt+vec3(0.,-5.*tt*tt,0.);
   vR=aSeed.w*6.28+tt*8.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.17+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:lin(.62,.72,.78)}));
  // burbujas del cardumen
  S.pts(L.part,24,VV+K+`void main(){float s=.15+aSeed.x*.33;float age=(uT-s)/(.5+aSeed.y*.3);float t=max(uT-s,0.);
   float k=(s-.15)/.33;vec3 p=vec3(-3.+5.6*k,.7+aSeed.z*.6+t*.7,(aSeed.w-.5)*.7);
   vR=0.;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.08*aSeed.w);}`,WATERDROP_FS);
  const fp=V3(0,0,0), fv=V3(0,0,0), R=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, id=te-TD;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.rotation.z=-0.06*ss(0,TN,te)+0.06*ss(TN,TN+0.15,te);
    // cardumen: tres peces en fila que nadan y se funden en las fauces
    fishes.forEach((m,i)=>{const s0=TN+i*0.05, k=cl((te-s0)/(TF-TN)), e=k*k*(3-2*k);
      fp.set(-3.0+5.7*e,0.8+0.25*i+0.15*Math.sin(k*10+i*2),(i-1)*0.35+0.1*Math.cos(k*8+i));
      fv.set(1,0.15*Math.cos(k*10+i*2),0);
      const fk=ss(s0-0.05,s0+0.05,te)*(1-ss(TF-0.02,TF+0.08,te));
      m.visible=fk>0.01; aimFish(m,fp,fv,1.25,0.12+0.02*i); m.material.uniforms.uA.value=fk; m.material.uniforms.uQ.value=0.5;});
    set(wake,ss(TN,TF,te),1); wake.material.uniforms.uFade.value=-0.1+1.1*ss(TF+0.1,TF+0.6,te); U.uE.value=1;
    // fauces: dos medias lunas que se abren junto al rival, cierran en ti y desgarran en TD
    let op;
    if(te<TF)op=0;
    else if(te<TI-0.06)op=back(ss(TF,TI-0.06,te));
    else if(te<TI){const k=(te-TI+0.06)/0.06;op=1-1.05*k*k;}
    else if(te<TD-0.04)op=-0.05+0.35*ss(TI+0.02,TD-0.05,te);
    else if(te<TD){const k=(te-TD+0.04)/0.04;op=0.3-0.4*k*k;}
    else op=-0.1+0.4*ss(TD+0.25,TB+0.3,te);
    const form=ss(TF-0.04,TF+0.06,te), dis=ss(TD+0.25,TB+0.35,te);
    R.set(1,0,0).applyQuaternion(camera.quaternion);
    bites.forEach((m,i)=>{const s=i?-1:1;                     // 0 = arriba, 1 = abajo
      m.visible=te>=TF-0.04&&te<TB+0.45; towardCam(m.position,tmp.copy(PC).add(tmp2.set(0,s*0.55*op,0)),0.4+0.03*i);
      billboard(m,s*0.44+s*0.1*Math.max(op,0)+(id>0?0.18*Math.sin(id*40)*Math.exp(-id*7):0));
      m.position.addScaledVector(R,s*0.16+(id>0?0.06*Math.sin(id*35)*Math.exp(-id*6):0));
      m.scale.set(1.85,1.45,1); const u=m.material.uniforms; u.uA.value=form; u.uEr.value=-0.1+1.1*dis;
      u.uHot.value=Math.max(hitE(ia,12),hitE(id,12));});
    sp1.pose(ia,PC,1.0); sp2.pose(id,tmp.copy(PC).add(tmp2.set(0.1,-0.1,0.2)),0.85); ring.pose(ia,3.4,0,0.45,1);
    set(stain,-0.1+1.1*ss(TE-0.35,TE+0.1,te),ia>0?ss(0,0.3,ia):0);
    const hit=Math.max(hitE(ia,8),hitE(id,9)*0.8);
    target.position.x=3.4+hit*0.13; target.rotation.z=-hit*0.13*Math.cos(Math.max(ia,0)*14);
    emit(target,0.35*hit,0.8,0.12,0.15);
    if(te<TF){o.g.set(-0.5+3*cl((te-TN)/(TF-TN)),1,0);o.gs=1.1;o.ga=0.05;o.li=0.6;}
    else{o.g.copy(PC);o.gs=1;o.ga=0.1*hit;o.li=0.7+2.4*hit;}
    o.ia=ia;o.c.copy(PC);o.shake=0;o.dist=0.45;o.flash=0.25;
  };
}});

// =====================================================================
// 4 · RISKY FISH — una columna de agua lanza un gran pez espíritu (esbelto, aletas grandes, menta y turquesa) en un
//     salto alto; cae en picado con estela en espiral y revienta en una corona de agua sobre el rival (gran golpe);
//     el pez se deshace y el lanzador queda Débil.
// =====================================================================
const COLUMN_FS=`void main(){float u=vUv.y;float x=abs(vUv.x-.5)*2.;
 float n=styNoise(vec2(vUv.x*1.5+uT*.3,u*1.2-uT*1.8)).b;float w=mix(.8,.35,u)+(n-.5)*.4;
 float m=smoothstep(w,w-.25,x)*smoothstep(1.,.75,u+(n-.5)*.3);if(m<.01)discard;
 float er=styErode(n*.6+.4*(1.-x),uP,.14);float a=m*er*uA;if(a<.01)discard;
 float l=.4+.6*(1.-x*x);float band=smoothstep(.04,.0,abs(fract(u*4.-uT*3.+x)-.5)-.42);
 gl_FragColor=vec4(styRampOf(${WATER},clamp(.2+.5*l+.2*band,0.,1.))*styTint(l),a);}`;
defs.push({key:"sty_qbRiskyFish",name:"Risky Fish (estilizado)",dur:2.3,ti:1.2,tier:2,pal:"Sty Acuático · Riesgo",stylized:true,...ZONES,
  phases:[["Impulso",0],["Salto",0.2],["Picado",0.8],["Impacto",1.2],["Rebote",1.3],["Debilidad",1.75]],
build(a){
  const L=a.L,TJ=0.2,TP=0.8,TI=1.2,TR=1.3,TW=1.75,TE=2.3;
  const P0=V3(-3.4,0.9,0.2), PA=V3(-0.6,4.6,0.4), PB=V3(2.6,3.0,0.3), PH=V3(3.25,1.4,0.05);
  const fish=makeFish(L.mesh,2,linA(.14,.6,.55),linA(.75,.95,.82));
  const column=new THREE.Mesh(new THREE.PlaneGeometry(1.4,2.6).translate(0,1.3,0),S.mat(COLUMN_FS,{},{mode:'matter'})); L.mesh.add(column);
  const crown=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.0).translate(0,0.9,0),S.mat(COLUMN_FS,{},{mode:'matter'})); L.mesh.add(crown);
  const spark=S.hitSpark(L.mesh,0.9,{seed:0.88}), ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.4);
  const shadow=S.contactShadow(L.decal,1.6), launch=S.groundRing(L.decal,2.0);
  const pool=groundPlane(2.4,3.4,0.024,S.mat(POOL_FS(WATER,.55),{},{mode:'matter'})); L.decal.add(pool);
  const weak=S.status(a,'weak',[caster],TR+0.1,TE);
  const bez=(k,out)=>{const u=1-k;return out.set(u*u*u*P0.x+3*u*u*k*PA.x+3*u*k*k*PB.x+k*k*k*PH.x,u*u*u*P0.y+3*u*u*k*PA.y+3*u*k*k*PB.y+k*k*k*PH.y,u*u*u*P0.z+3*u*u*k*PA.z+3*u*k*k*PB.z+k*k*k*PH.z);};
  const BZ=`vec3 bz(float k){float u=1.-k;return u*u*u*${v3(P0)}+3.*u*u*k*${v3(PA)}+3.*u*k*k*${v3(PB)}+k*k*k*${v3(PH)};}`;
  const K=`const float TJ=${f(TJ)};const float TI=${f(TI)};const vec3 PH=${v3(PH)};`+BZ;
  // estela en espiral del salto y del picado
  S.pts(L.part,60,VV+K+`void main(){float s=TJ+aSeed.x*(TI-TJ);float age=(uT-s)/(.45+aSeed.y*.2);float k=pow(clamp((s-TJ)/(TI-TJ),0.,1.),1.15);
   float an=aSeed.x*40.+uT*3.;vec3 p=bz(k)+vec3(0.,cos(an),sin(an))*(.25+.2*age);p.y-=.3*age*age;
   vR=an;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.2+.1*aSeed.w)*(1.-.3*age));}`,WATERDROP_FS);
  // corona de agua del impacto (gotas grandes que caen)
  S.pts(L.part,46,VV+K+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=(uT-s)/(.7+aSeed.y*.3);
   float an=aSeed.y*6.2832;vec3 v=vec3(cos(an)*(1.2+1.4*aSeed.z),2.6+2.*aSeed.w,sin(an)*(1.2+1.4*aSeed.z));
   vec3 p=vec3(3.4,.3,0.)+v*t+vec3(0.,-9.*t*t,0.);
   vR=3.14159+atan(v.x,v.y)*.3;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;put(p,.24+.12*aSeed.w);}`,WATERDROP_FS);
  // espuma baja del rebote
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.05+aSeed.x*.1;float t=max(uT-s,0.);float age=(uT-s)/(.7+aSeed.y*.3);
   float an=aSeed.y*6.2832;vec3 p=vec3(3.4+cos(an)*(.5+1.1*(1.-exp(-t*5.))),.15+.2*t,sin(an)*(.5+1.1*(1.-exp(-t*5.))));
   vR=an;vK=smoothstep(.4,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.4+.2*aSeed.w)*(.7+.5*age));}`,FOAMPUFF_FS);
  const fp=V3(0,0,0), fv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ij=te-TJ;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.scale.set(1,1-0.1*ss(0,TJ,te)*(1-ss(TJ,TJ+0.1,te)),1); caster.rotation.z=0.1*ss(0,TJ,te)*(1-ss(TJ,TJ+0.2,te));
    // columna de agua bajo el lanzador
    const ck=ss(0,0.12,te)*(1-ss(TJ+0.15,TJ+0.5,te));
    column.visible=ck>0.01; column.position.set(-3.45,0,0.15); billboard(column,0); column.quaternion.copy(camera.quaternion);
    column.scale.set(1,0.3+0.9*ss(0,TJ+0.05,te),1); set(column,-0.1+1.1*ss(TJ+0.1,TJ+0.5,te),ck);
    // salto y picado: pez en la curva, gira hacia abajo en el picado
    const k=Math.pow(cl((te-TJ)/(TI-TJ)),1.15); bez(k,fp); bez(Math.min(k+0.02,1),fv); fv.sub(fp); if(k>=1)fv.set(0.3,-1,0);
    const fk=ss(TJ-0.05,TJ+0.05,te), dis=ss(TI,TR+0.15,te);
    fish.visible=te>TJ-0.05&&te<TR+0.3; aimFish(fish,fp,fv,2.7*(1+0.15*ss(TP,TI,te)));
    fish.material.uniforms.uA.value=fk; fish.material.uniforms.uQ.value=ss(TJ,TP,te); fish.material.uniforms.uEr.value=-0.1+1.1*dis;
    shadow.pose(fp.x,fp.z,0.6+0.9*ss(TP,TI,te),te<TI?0.55*fk:0);
    launch.pose(te-0.05,-3.45,0.15,0.45,0.9);
    // corona: la misma agua pintada, ancha y baja, que sube y cae
    const crk=ia>0?ss(0,0.06,ia)*(1-ss(0.35,0.75,ia)):0;
    crown.visible=crk>0.01; crown.position.set(3.4,0,0); crown.quaternion.copy(camera.quaternion);
    crown.scale.set(0.7+0.6*ss(0,0.2,ia),0.6+0.9*ss(0,0.1,ia)-0.4*ss(0.3,0.75,ia),1); set(crown,-0.1+1.1*ss(0.2,0.75,ia),crk);
    spark.pose(ia,PH,1.0); ring.pose(ia,3.4,0,0.5,1); ring2.pose(ia-0.12,3.4,0,0.45,0.8);
    set(pool,-0.1+1.1*ss(TE-0.45,TE+0.05,te),ia>0?ss(0,0.3,ia):0);
    U.uE.value=1;
    const hit=hitE(ia,7);
    target.position.x=3.4+hit*0.18; target.rotation.z=-hit*0.16; target.scale.set(1+0.06*hit,1-0.14*hit,1+0.06*hit);
    emit(target,0.4*hit,0.3,0.9,0.85);
    // el riesgo: el lanzador se encoge un poco al quedar Débil
    const wk=ss(TR,TW,te); caster.scale.multiplyScalar(1-0.04*wk); emit(caster,0.15*wk,0.55,0.35,0.9);
    if(te<TI){o.g.copy(fp);o.gs=1;o.ga=0.06;o.li=0.6+0.8*ss(TP,TI,te);}
    else{o.g.copy(PH);o.gs=1.3;o.ga=0.14*hit;o.li=0.8+2.8*hit;}
    o.ia=ia;o.c.copy(PH);o.shake=0.35*hit;o.dist=0.6;o.flash=0.3;
  };
}});

VFX.module("Estilizado · Acuático · Boca",defs);
})();

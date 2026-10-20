// =====================================================================
// MÓDULO 6 · CLASE BESTIA (COLA)
// Los Axies ya tienen su propia cola, así que aquí NO se dibuja ninguna: cada habilidad conserva una cadena de
// articulaciones invisible en la parte trasera del lanzador, animada en pose, que solo sirve de referencia para que
// los efectos (algodón, nuez, chispazo del pincel…) nazcan donde estaría la punta de la cola.
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points:points0,sparks:sparks0,RING_FS,BURST_FS,SCORCH_FS,
  camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

// ---------- niveles por costo de PA ----------
// PK: densidad (n) y tamaño (s) de las partículas de la habilidad que se está construyendo
const PK={n:1,s:1};
const points=(p,n,vs,fs,op)=>points0(p,Math.max(1,Math.round(n*PK.n)),PK.s===1?vs:`void putK(vec3 p,float s){put(p,s*${f(PK.s)});}\n`+vs.replace(/\bput\(/g,"putK("),fs,op);
const sparks=(p,n,ti,org,bias,lo,hi,g)=>sparks0(p,Math.max(1,Math.round(n*PK.n)),ti,org,bias,lo*PK.s,hi*PK.s,g);
// mapa de tiempo por tramos K=[[real,original],...]: la pose y los shaders (uT) siguen viendo el tiempo original,
// así el ritmo se acorta sin reescribir cada constante; dur/ti/phases pasan a tiempo real
const lerpK=(K,t)=>{let i=1;while(i<K.length-1&&t>K[i][0])i++;const [a0,b0]=K[i-1],[a1,b1]=K[i];return b0+(b1-b0)*(t-a0)/(a1-a0);};
function tier(def,o){
  const K=o.K, KI=K.map(([x,y])=>[y,x]), w=t=>lerpK(K,t), iv=t=>lerpK(KI,t), g=o.g||1, gs=o.gs||1, rec=o.rec==null?1:o.rec;
  def.dur=K[K.length-1][0]; def.ti=+iv(def.ti).toFixed(3); def.phases=def.phases.map(([n,t])=>[n,+iv(t).toFixed(3)]);
  const build=def.build;
  def.build=function(a){PK.n=o.n||1;PK.s=o.s||1;build.call(this,a);PK.n=PK.s=1;const pose=a.pose;
    a.pose=function(te,O){const t=w(te);U.uT.value=t;pose(t,O);
      O.ia=te-iv(t-O.ia);                                   // destello/distorsión del motor en tiempo real
      O.shake=0;O.ga*=g;O.li*=g;O.gs*=gs;
      target.position.x=3.4+(target.position.x-3.4)*rec;target.rotation.z*=rec;};};
  return def;
}
// quemadura suave (niveles 1–2): mancha cálida con ruido, sin grietas
const BURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=noise(vec3(p*7.,1.))*.6+noise(vec3(p*15.,4.))*.4;float m=smoothstep(1.,.15,r+(n-.5)*.35);
 gl_FragColor=vec4(mix(uC2,uC1,n*.6)*1.2,m*(.2+.25*n)*uA);}`;

const TC=V3(3.15,1.2,0);                               // pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
// uniforms de partículas con extras propios (p. ej. el punto de la barra de PA)
const PU=(extra,more)=>Object.assign({uniforms:Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},extra)},more||{});

// ---------- la cola: cadena de segmentos anidados que se curvan con rotation.z ----------
const TAIL0=V3(-0.45,0.7,0);                           // arranque de la cola, en coordenadas del lanzador
// pelaje: dos tonos (uniforms), borde de la paleta con uA y brasa con uP
const FUR_FS=`uniform vec3 uFa;uniform vec3 uFb;
void main(){vec3 N=normalize(vN);float fr=pow(1.-abs(dot(N,normalize(vV))),2.);
 float n=noise(vP*38.)*.55+noise(vP*97.)*.45;
 vec3 c=mix(uFb,uFa,clamp(n*.8+fr*.4,0.,1.))*${LIT}+uC1*fr*(.12+1.4*uA)+mix(uC2,uC1,n)*uP;
 gl_FragColor=vec4(c,1.);}`;
const furMat=(a,b)=>fxU(FUR_FS,{uFa:{value:new THREE.Color(a)},uFb:{value:new THREE.Color(b)}},DS);
function mkTail(L,n,len,rad,mat){
  const g=new THREE.Group(), base=new THREE.Group(); base.position.copy(TAIL0); g.add(base); L.mesh.add(g);
  const J=[]; let p=base;
  for(let i=0;i<n;i++){const j=new THREE.Group(); if(i)j.position.x=-len; p.add(j);
    const ra=rad(i/n), rb=rad((i+1)/n);
    j.add(new THREE.Mesh(new THREE.CylinderGeometry(rb,ra,len,14,1,true).rotateZ(Math.PI/2).translate(-len/2,0,0),mat));
    j.add(new THREE.Mesh(new THREE.SphereGeometry(ra,14,10),mat));
    J.push(j); p=j;}
  const tip=new THREE.Group(); tip.position.x=-len; p.add(tip);
  return {g,J,tip,mat};
}
// el esqueleto copia la posición, inclinación y escala del lanzador (mir: espejo si mira hacia −x); siempre invisible
function follow(T,mir){T.g.position.copy(caster.position);T.g.rotation.z=caster.rotation.z;
  T.g.scale.set(caster.scale.x*(mir?-1:1),caster.scale.y,caster.scale.z);T.g.visible=false;}
const tipWorld=(T,obj,out)=>{T.g.updateMatrixWorld(true);return obj.localToWorld(out.set(0,0,0));};
// pompón: bola opaca de algodón + capa aditiva de pelusa
const POM_FS=`void main(){vec3 q=normalize(vP);float n=noise(q*7.)*.5+noise(q*19.)*.3+noise(q*47.)*.2;
 vec3 N=normalize(vN);float fr=pow(1.-abs(dot(N,normalize(vV))),2.);
 vec3 c=mix(vec3(.6,.55,.48),vec3(1.,.97,.9),n)*${LIT}+uC1*(fr*.45+uA*(.2+fr*1.2));
 gl_FragColor=vec4(c,1.);}`;
const FUZZ_FS=`void main(){vec3 q=normalize(vP);float n=noise(q*24.+vec3(uT*.6))*.6+noise(q*61.)*.4;
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
 gl_FragColor=vec4(mix(vec3(1.,.96,.88),uC1,.35+.4*uP)*1.2,smoothstep(.45,.78,n)*fr*uA);}`;
function mkPom(parent,r){const g=new THREE.Group();
  const ball=new THREE.Mesh(new THREE.SphereGeometry(r,28,20),fx(POM_FS,DS)), fuzz=new THREE.Mesh(new THREE.SphereGeometry(r*1.22,28,20),fx(FUZZ_FS));
  g.add(ball); g.add(fuzz); parent.add(g); g.userData={ball,fuzz}; return g;}

// ---------- fragmentos de partícula del módulo ----------
// algodón dorado: copo de tres lóbulos más saturado de paleta que FLUFF_FS
const GFLUFF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;
 float l=smoothstep(.27,.1,length(q-vec2(-.1,.05)))+smoothstep(.25,.08,length(q-vec2(.11,.07)))+smoothstep(.23,.06,length(q-vec2(0.,-.1)));
 float a=min(l,1.)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.95,.8),uC1,.55+.3*vMix)*1.3+vec3(1.)*smoothstep(.12,0.,length(q))*.3,a);}`;
// raya de velocidad horizontal (en pantalla)
const STREAK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float a=smoothstep(.05,0.,abs(q.y))*smoothstep(.5,.15,abs(q.x))*smoothstep(-.5,.3,q.x)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.45+.4*vMix)*1.4,a);}`;
// hoja verde que gira (vMix = ángulo)
const LEAF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float d=length(q*vec2(1.,2.6));float a=smoothstep(.42,.3,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(vec3(.35,.95,.3)*(1.1-abs(q.y)*1.6)+vec3(.5,.6,.1)*smoothstep(.04,0.,abs(q.y)),a);}`;
// SDF 2D comunes
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float sdCap(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdTri(vec2 p,vec2 p0,vec2 p1,vec2 p2){vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2;vec2 v0=p-p0,v1=p-p1,v2=p-p2;
 vec2 q0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);vec2 q1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);vec2 q2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
 float s=sign(e0.x*e2.y-e0.y*e2.x);
 vec2 d=min(min(vec2(dot(q0,q0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(q1,q1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(q2,q2),s*(v2.x*e2.y-v2.y*e2.x)));
 return -sqrt(d.x)*sign(d.y);}
vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}`;

// =====================================================================
// 1 · COTTONTAIL — la cola se sacude y suelta pelusas que forman una nube de algodón dorado sobre el Axie;
//     la nube se deshace en una espiral que lo envuelve y se condensa en un aura esponjosa que late (recarga de energía)
// =====================================================================
const cotton={key:"cotton",name:"Cottontail",dur:2.9,ti:1.45,pal:"Dorado",
  phases:[["Sacudida",0],["Nube",0.45],["Espiral",0.95],["Aura",1.45],["Calma",2.3]],
build(a){
  const L=a.L,TS=0.45,TN=0.95,TI=1.45,TE=2.85,CL=V3(-3.75,2.4,0),PP=V3(-4.15,0.75,0),AX=-3.7;
  const T=mkTail(L,1,0.13,u=>0.075-0.02*u,furMat(0xe9dfcc,0x9a8c78));   // esqueleto invisible: solo marca el origen
  // nube: racimo de esferas suaves con volutas de ruido
  const cloudMat=fx(`void main(){float fr=abs(dot(normalize(vN),normalize(vV)));
   float n=noise(vP*2.6+vec3(uT*.5,uT*.3,0.))*.6+noise(vP*6.-vec3(0.,uT,0.))*.4;
   float a=pow(fr,1.3)*(.3+.7*smoothstep(.3,.75,n));
   gl_FragColor=vec4(mix(vec3(1.,.96,.84),uC1,.5+.3*n)*(.75+.5*n),a*uA*.5);}`);
  const cloud=new THREE.Group();
  for(const [x,y,z,r] of [[0,0,0,.5],[.42,-.08,.1,.38],[-.42,-.05,-.1,.4],[.12,.26,-.05,.36],[-.2,.22,.18,.34],[.26,.04,.32,.3],[-.08,-.18,.28,.32]]){
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),cloudMat);m.position.set(x,y,z);cloud.add(m);}
  // aura de algodón: capa esponjosa (bultos de ruido en el borde) + velo interior; uP = latido
  const AURA_FS=`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float n=noise(vP*3.2+vec3(0.,-uT*.6,uT*.3))*.55+noise(vP*7.5+vec3(uT*.4,0.,0.))*.45;
   float puff=smoothstep(.42,.72,n);float rim=band(n,.6,.05);
   float h=vP.y/2.+.5;float fade=smoothstep(0.,.12,h)*smoothstep(1.,.8,h);
   gl_FragColor=vec4(mix(vec3(1.,.97,.88),uC1,.45+.35*puff)*(1.+.6*uP)+vec3(1.)*rim*.25,(fr*(.3+.5*puff)+rim*.35+puff*.08)*fade*uA);}`;
  const auraG=new THREE.Group(); L.mesh.add(cloud,auraG);
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.55,2.0,40,10,true),fx(AURA_FS)); shell.position.y=1.0;
  const cap=new THREE.Mesh(new THREE.SphereGeometry(0.44,32,16,0,Math.PI*2,0,Math.PI/2),fx(AURA_FS)); cap.position.y=1.88;
  auraG.add(shell,cap);
  // núcleo de energía: destello cálido en el pecho que se enciende al recargar
  const core=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float star=pow(max(0.,1.-abs(p.x*p.y)*14.),3.)*smoothstep(1.,.1,r);float glow=pow(max(0.,1.-r),2.6);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.6,(glow+star*.8)*uA);}`,{depthTest:false}));
  L.mesh.add(core);
  // espiral de algodón: cinta en hélice que baja de la nube y abraza al Axie; uP = cabeza (0..1 de arriba abajo)
  const N=200,pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){const t=i/N,an=t*Math.PI*6,r=0.7-0.15*t,y=CL.y-0.2-(CL.y-0.25)*t;
    const c=Math.cos(an),s=Math.sin(an);pos.push(AX+c*r,y-0.05,s*r,AX+c*r,y+0.05,s*r);uv.push(t,0,t,1);
    if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));sg.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));sg.setIndex(idx);sg.computeVertexNormals();
  const spiralMat=fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*40.-uT*3.,vUv.y*3.,0.));
   float al=smoothstep(1.,.2,v+(n-.5)*.6)*exp(-d*1.2)*smoothstep(0.,.03,u)*uA;
   gl_FragColor=vec4(mix(vec3(1.,.96,.86),uC1,.4+.4*n)*1.3,al*.85);}`);
  L.trail.add(new THREE.Mesh(sg,spiralMat));
  const C=`const float TS=${f(TS)};const float TN=${f(TN)};const float TI=${f(TI)};const vec3 CL=${v3(CL)};const vec3 PP=${v3(PP)};`;
  // pelusas que salta la cola al sacudirse y suben a formar la nube
  a.count+=points(L.part,120,C+`void main(){float s=.05+aSeed.x*(TS-.05);float life=.5+aSeed.y*.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();vec3 dst=CL+r*vec3(.35,.2,.22);float e=1.-pow(1.-k,2.);
   vec3 p=mix(PP+r*.12,dst,e)+vec3(sin(k*6.+r.x*6.)*.25*(1.-k),.35*sin(k*3.14159),cos(k*5.+r.z*6.)*.2*(1.-k));
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-smoothstep(.8,1.,age)*.6):0.;put(p,(.1+.08*aSeed.z)*(.6+.6*k));}`,GFLUFF_FS);
  // copos que remolinean dentro de la nube
  a.count+=points(L.part,80,C+`void main(){float env=smoothstep(.35,.7,uT)*(1.-smoothstep(TN,TI-.1,uT));
   float an=aSeed.x*6.2832+uT*(.8+aSeed.y);vec3 r=rnd();float rad=.15+.3*aSeed.z;
   vec3 p=CL+vec3(cos(an)*rad,r.y*.18+sin(uT*2.+aSeed.w*6.)*.08,sin(an)*rad*.7);
   vA=env*.9;put(p,(.12+.1*aSeed.w)*env);}`,GFLUFF_FS);
  // copos que bajan girando junto a la espiral
  a.count+=points(L.part,160,C+`void main(){float s=TN+aSeed.x*(TI-TN-.1);float life=.55+aSeed.y*.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float t0=(s-TN)/(TI-TN);float t=min(t0+k*.35,1.);float an=t*18.85+aSeed.z*.6;float r=.7-.15*t+(aSeed.w-.5)*.15;
   vec3 p=vec3(${f(AX)}+cos(an)*r,CL.y-.2-(CL.y-.25)*t,sin(an)*r);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,(.1+.08*aSeed.w));}`,GFLUFF_FS);
  // estallido suave de pelusa al condensarse el aura
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.06;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.5,1.)+vec3(0.,.15,0.));vec3 p=vec3(${f(AX)},.3+aSeed.z*1.4,0.)+d*(.45+.7*(1.-exp(-t*3.)))+vec3(0.,-.25*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.12+.1*aSeed.w)*(1.-age*.4));}`,GFLUFF_FS);
  // copos que orbitan despacio mientras dura el aura, y destellos
  a.count+=points(L.part,40,C+`void main(){float an=aSeed.x*6.2832+uT*(.6+aSeed.y*.5);float rad=.62+aSeed.z*.2;
   vec3 p=vec3(${f(AX)}+cos(an)*rad,.4+aSeed.w*1.4+sin(uT*1.5+aSeed.x*9.)*.12,sin(an)*rad);
   vA=uE*.85;put(p,(.12+.08*aSeed.y)*uE);}`,GFLUFF_FS);
  a.count+=points(L.part,50,C+`void main(){float life=.7+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(AX)},0.,0.)+vec3((r.x-.5)*1.,.2+r.y*1.6+age*.4,(r.z-.5)*1.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.12+.12*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // glifo bajo el lanzador: aro con bordes de algodón, y onda suave al recargar
  const glyph=groundPlane(1.8,AX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float bump=.82+.06*abs(sin(an*5.+uT*.4));
   float m=band(r,bump,.025)+band(r,.6,.012)+band(r,.7,.04)*step(.6,fract(an/6.2832*16.+uT*.3))*.6;
   gl_FragColor=vec4(mix(uC2,uC1,r)*1.3,m*uA);}`));
  const wave=groundPlane(2.6,AX,0.03,fx(RING_FS));
  L.decal.add(glyph,wave);
  const cp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, sh=ss(0.02,0.08,te)*(1-ss(TS-0.05,TS+0.05,te)), env=ss(TI,TI+0.2,te)*(1-ss(TE-0.55,TE,te));
    caster.rotation.z=0.06*Math.sin(te*48)*sh;
    caster.position.y=0.04*Math.abs(Math.sin(te*24))*sh;
    follow(T); T.J[0].rotation.z=-0.55+0.45*Math.sin(te*46)*sh;
    // nube: crece con las pelusas y se deshace en la espiral
    const grow=ss(0.12,TN,te), drain=1-ss(TN,TI-0.1,te), cs=grow*drain;
    cloud.visible=cs>0.01; cloud.position.set(CL.x,CL.y+0.05*Math.sin(te*3),CL.z); cloud.rotation.y=te*0.4;
    cloud.scale.setScalar(Math.max((0.35+0.65*cs)*0.58,0.001)); cloudMat.uniforms.uA.value=cs;
    set({material:spiralMat},Math.min(cl((te-TN)/(TI-TN))*1.05,1.05),ss(TN,TN+0.1,te)*(1-ss(TI,TI+0.35,te)));
    // aura: se condensa con un pequeño rebote y late
    const beat=Math.pow(0.5+0.5*Math.sin((te-TI)*5.5),3), pop=ia>=0?Math.exp(-ia*5):0;
    auraG.position.set(caster.position.x,0,0); auraG.visible=env>0.01;
    auraG.scale.set(1+0.15*pop+0.03*beat,1+0.05*pop,1+0.15*pop+0.03*beat);
    set(shell,beat*0.5+pop,env*0.7); set(cap,beat*0.5+pop,env*0.7);
    towardCam(core.position,cp.set(caster.position.x+0.1,1.15,0),0.5); billboard(core,te*0.6);
    core.visible=env>0.01; core.scale.setScalar(0.6+0.4*pop+0.08*beat); core.material.uniforms.uA.value=env*(0.25+0.3*beat)+pop*0.6;
    let p=cl(ia/0.8); set(wave,1-Math.pow(1-p,2),ia>=0?(1-p)*0.45:0);
    glyph.position.x=wave.position.x=caster.position.x;
    glyph.material.uniforms.uA.value=0.6*ss(0,0.2,te)*(1-ss(TN,TI,te))+0.4*env;
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*sh+0.3*env*(0.6+0.4*beat)+0.6*pop;
    if(te<TS){o.g.copy(PP);o.gs=0.9;o.ga=0.35*sh;o.li=2*sh;}
    else if(te<TN){o.g.copy(CL);o.gs=1.8*cs+0.4;o.ga=0.3*cs;o.li=3.5*Math.max(cs,0.3);}
    else if(te<TI){o.g.set(AX,CL.y-(CL.y-1.1)*cl((te-TN)/(TI-TN)),0);o.gs=1.6;o.ga=0.3;o.li=3.5;}
    else{o.g.set(AX,1.15,0);o.gs=2.2+1.5*pop;o.ga=0.12*env+0.6*pop;o.li=2.5*env+6*pop;}
    o.ia=ia;o.c.set(AX,1.15,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 2 · NUT CRACKER (TAIL) — la cola golpea el suelo y catapulta una nuez explosiva que revienta en metralla de madera y fuego
// =====================================================================
const nutTail={key:"nutTail",name:"Nut Cracker (Tail)",dur:2.8,ti:1.3,pal:"Fuego",
  phases:[["Carga",0],["Coletazo",0.38],["Vuelo",0.5],["Explosión",1.3],["Brasas",1.6]],
build(a){
  const L=a.L,TU=0.38,TS=0.5,TI=1.3,G=V3(-5.2,0,0),P0=V3(-5.05,0.3,0),P1=V3(3.1,1.28,0),H=3.0;
  // cola de ardilla: tupida en el centro
  const T=mkTail(L,7,0.18,u=>0.055+0.12*Math.sin(Math.PI*Math.min(0.12+u*0.95,1)),furMat(0xc0743a,0x4a2410));
  // nuez: cáscara arrugada con costura y grietas incandescentes que laten cada vez más rápido
  const nutG=new THREE.Group(); L.mesh.add(nutG);
  const nut=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);
   float seam=smoothstep(.07,0.,abs(q.z));
   float w=abs(noise(vP*5.)*2.-1.),w2=abs(noise(vP*11.+3.)*2.-1.);float wr=1.-min(w*.7+w2*.5,1.);
   vec3 shell=mix(vec3(.4,.25,.12),vec3(.68,.48,.26),wr);
   float crack=pow(wr,5.)*uA;
   vec3 c=shell*${LIT}*(1.-seam*.45)+mix(uC2,uC1,crack)*crack*2.6+uC1*seam*uA*.7;
   gl_FragColor=vec4(c,1.);}`,SOLID));
  nut.scale.set(0.24,0.28,0.24);
  const fuse=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.024,0.15,6).translate(0,0.34,0),new THREE.MeshStandardMaterial({color:0x2a1a10,roughness:0.9}));
  nutG.add(nut); nutG.add(fuse);
  const spark=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42),fx(`void main(){vec2 q=abs(vUv-.5)*2.;
   float s=smoothstep(.1,0.,q.x*q.y*5.+min(q.x,q.y))*smoothstep(1.,.1,max(q.x,q.y));float c=smoothstep(.4,0.,length(q));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5+.5*c)*1.8,(s+c)*uA);}`,{depthTest:false}));
  // bola de fuego (aditiva) y hollín (mezcla normal) que se deshacen con ruido
  const fire=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){
   float n=noise(vP*2.8+vec3(0.,-uT*3.,uT))*.6+noise(vP*6.5-vec3(uT))*.4;
   float heat=n-(uP*1.05-.2);if(heat<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));
   vec3 c=mix(uC2,uC1,smoothstep(0.,.3,heat))+vec3(1.)*smoothstep(.3,.55,heat)*(1.-uP);
   gl_FragColor=vec4(c*1.6,smoothstep(0.,.08,heat)*(.25+.75*fr)*uA);}`));
  const soot=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(`void main(){
   float n=noise(vP*2.2+vec3(0.,-uT*1.5,0.))*.65+noise(vP*5.)*.35;float d=n-(uP*1.1-.1);if(d<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(vec3(.09,.07,.06)+uC2*.2*smoothstep(.2,0.,d),smoothstep(0.,.15,d)*fr*.75*uA);}`,NB));
  fire.position.copy(P1); soot.position.copy(P1); soot.renderOrder=-1;
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),fx(RING_FS,{depthTest:false}));
  L.mesh.add(spark,fire,soot,hitRing);
  // metralla de madera: astillas opacas con los extremos en brasa
  const splMat=fx(`void main(){float g=noise(vec3(vP.x*60.,vP.y*8.,vP.z*8.));vec3 wood=mix(vec3(.3,.18,.08),vec3(.62,.42,.22),g);
   float hot=smoothstep(.08,.17,abs(vP.x));
   gl_FragColor=vec4(wood*${LIT}+mix(uC2,uC1,hot)*hot*(.5+1.8*uA),1.);}`,SOLID);
  const splGeo=new THREE.BoxGeometry(0.24,0.028,0.028), spl=[];
  for(let i=0;i<8;i++){const m=new THREE.Mesh(splGeo,splMat), an=Math.random()*Math.PI*2, el=0.15+Math.random()*1.1;
    const d=V3(Math.cos(an)*Math.cos(el),Math.sin(el),Math.sin(an)*Math.cos(el)), sp=2.2+Math.random()*2.4;
    const vy=d.y*sp, tl=(vy+Math.sqrt(vy*vy+24*(P1.y-0.03)))/12;   // instante en que toca el suelo
    m.userData={d,sp,tl,sx:0.6+Math.random()*0.9,spin:V3(Math.random()*16-8,Math.random()*16-8,Math.random()*16-8)}; spl.push(m); L.mesh.add(m);}
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 G=${v3(G)};
  vec3 nutP(float t){float k=clamp((t-TS)/(TI-TS),0.,1.);return mix(P0,P1,k)+vec3(0.,4.*${f(H)}*k*(1.-k),0.);}`;
  // mecha encendida durante el vuelo
  a.count+=points(L.part,150,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.18+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=nutP(s)+vec3(0.,.34,0.)+normalize(rnd()+vec3(0.,.8,0.))*t*(1.5+2.*aSeed.z)+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.04*aSeed.w)*(1.-age*.5));}`);
  // humo de la trayectoria
  a.count+=points(L.part,90,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=nutP(s)+rnd()*.12+vec3(0.,.3*t,0.)+rnd()*.25*t;
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.18+.15*aSeed.w)*(.6+age*1.4));}`,SMOKE_FS("vec3(.3,.28,.27)"),NB);
  // polvo y esquirlas del coletazo
  a.count+=points(L.part,80,C+`void main(){float s=TS+aSeed.x*.06;float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=G+d*(.2+1.3*(1.-exp(-t*3.)))*(.5+aSeed.w)+vec3(0.,.1+.5*(1.-exp(-t*2.))*aSeed.y,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.3+.3*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // astillas en punto: rectángulo alargado orientado a su velocidad en pantalla
  a.count+=points(L.part,200,C+`varying float vAng;void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.45;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(0.,.35,0.))*(2.6+3.4*aSeed.z);float dr=exp(-t*1.8);
   vec3 p=P1+v*(1.-dr)/1.8+vec3(0.,-4.*t*t,0.);vec3 vel=v*dr+vec3(0.,-8.*t,0.);
   vec4 c0=projectionMatrix*modelViewMatrix*vec4(p,1.),c1=projectionMatrix*modelViewMatrix*vec4(p+vel*.02,1.);
   vec2 sd=c1.xy/c1.w-c0.xy/c0.w;vAng=atan(sd.y,sd.x*projectionMatrix[1][1]/projectionMatrix[0][0]);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.13+.1*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;varying float vAng;
  void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vAng),s=sin(vAng);vec2 r=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
   float w=.07*(1.-smoothstep(.1,.46,abs(r.x)))+.012;float m=smoothstep(w,w*.4,abs(r.y))*step(abs(r.x),.46);
   float a=m*vA;if(a<.003)discard;float hot=smoothstep(.1,.42,r.x);
   gl_FragColor=vec4(mix(vec3(.38,.22,.1)*(.7+.6*vMix),uC1*1.6,hot),a);}`,NB);
  // bolas de fuego de la explosión
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.08;float life=.35+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=P1+d*(.25+1.1*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.6*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,(.25+.3*aSeed.w)*(1.-age*.4));}`);
  // humo negro que sube
  a.count+=points(L.part,90,C+`void main(){float s=TI+.08+aSeed.x*.3;float life=1.2+aSeed.y*.8;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=P1+vec3(r.x*.5+sin(t*2.+r.z*6.)*.2,t*(1.+aSeed.z)+r.y*.3,r.z*.5);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.8:0.;put(p,(.35+.35*aSeed.w)*(.6+age*1.3));}`,SMOKE_FS("vec3(.12,.1,.09)"),NB);
  // brasas que arden en el suelo
  a.count+=points(L.part,40,C+`void main(){float life=.45+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=aSeed.z*6.2832;float rad=.3+aSeed.w*.75;vec3 p=vec3(P1.x+cos(an)*rad,.02+age*.35,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.14+.1*r.z)*(1.-age*.4));}`,FLAME_FS);
  a.count+=sparks(L.part,240,TI,`${f(P1.x)},${f(P1.y)},0.`,"-.3,.35,0.",3,8,3.2);
  // onda del coletazo, onda y quemadura suave del impacto (nivel 2: sin fractura de suelo)
  const slam=groundPlane(3.2,G.x,0.03,fx(RING_FS));
  const shock=groundPlane(4.4,3.2,0.03,fx(RING_FS)), scorch=groundPlane(2.2,3.2,0.015,fx(BURN_FS));
  L.decal.add(slam,shock,scorch);
  a.pose=function(te,o){
    const ia=te-TI, is=te-TS, up=ss(0.04,TU,te), k=cl((te-TU)/(TS-TU)), sl=k*k, rec=ss(0.9,1.7,te);
    caster.rotation.z=0.06*up*(1-sl)-0.12*sl*(1-rec);
    follow(T);
    const vib=te>TS?0.32*Math.exp(-is*7)*(1-rec):0;
    T.J.forEach((j,i)=>{j.rotation.z=i===0?-0.5-1.25*up*(1-sl)+1.08*sl*(1-rec)
      :-0.12-0.3*up*(1-sl)+0.1*sl*(1-rec)+vib*Math.sin(is*38-i*0.9)+0.05*Math.sin(te*5-i*0.6)*rec;});
    T.mat.uniforms.uA.value=0.6*up*(1-rec); T.mat.uniforms.uP.value=0.25*sl*Math.exp(-Math.max(is,0)*3);
    // la nuez se forma en la punta, sale catapultada en parábola y gira sobre su eje vertical
    const app=ss(0.08,0.3,te);
    if(te<TS){tipWorld(T,T.tip,nutG.position);nutG.position.y+=0.16;nutG.position.lerp(P0,ss(TS-0.06,TS,te));}
    else{const q=cl(is/(TI-TS));nutG.position.set(P0.x+(P1.x-P0.x)*q,P0.y+(P1.y-P0.y)*q+4*H*q*(1-q),0);}
    nutG.visible=te<TI&&app>0.01; nutG.scale.setScalar(Math.max(app,0.001)); nutG.rotation.y=te*(te<TS?1.5:9);
    nut.material.uniforms.uA.value=0.3+0.7*cl((te-0.2)/(TI-0.2))+0.3*Math.pow(0.5+0.5*Math.sin(te*(12+te*14)),4);
    spark.position.copy(nutG.position).add(tmp.set(0,0.42*app,0)); billboard(spark,te*25); spark.visible=nutG.visible;
    spark.scale.setScalar(0.6+0.4*Math.abs(Math.sin(te*53))); set(spark,0,app*(0.7+0.3*Math.sin(te*90)));
    // explosión
    let p=cl(ia/0.55); fire.visible=ia>=0&&p<1; fire.scale.setScalar(0.25+1.1*(1-Math.pow(1-p,3))); set(fire,p,1);
    p=cl((ia-0.05)/0.9); soot.visible=ia>=0.05&&p<1; soot.scale.setScalar(0.45+1.05*(1-Math.pow(1-p,2))); set(soot,p,1);
    p=cl(ia/0.35); towardCam(hitRing.position,P1,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    splMat.uniforms.uA.value=ia>=0?Math.exp(-ia*1.5):0;
    for(const m of spl){const u=m.userData,t=Math.max(ia,0),tt=Math.min(t,u.tl);
      m.visible=ia>=0&&te<2.75; m.position.copy(P1).addScaledVector(u.d,u.sp*tt); m.position.y-=6*tt*tt; m.position.y=Math.max(m.position.y,0.03);
      m.rotation.set(u.spin.x*tt,u.spin.y*tt,u.spin.z*tt); m.scale.set(u.sx*(1-ss(2.4,2.75,te)),1,1);}
    // suelo
    p=cl(is/0.5); set(slam,1-Math.pow(1-p,2),is>=0?(1-p)*0.6:0);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0); scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.5):0;
    const env=ss(TI,TI+0.2,te)*(1-ss(2.3,2.8,te)); U.uE.value=env;
    const hit=hitK(ia,4.5); target.position.x=3.4+hit*0.45*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.4*Math.cos(ia*14);
    o.em=0.45*env; o.emc.copy(U.uC2.value);
    if(te<TS){o.g.copy(nutG.position);o.gs=0.9*app;o.ga=0.35*app;o.li=2.5*app;}
    else if(te<TI){o.g.copy(nutG.position);o.gs=1;o.ga=0.45;o.li=3.5+(is<0.3?5*Math.exp(-is*10):0);}
    else{o.g.copy(P1);o.gs=1.6+4*ia;o.ga=Math.exp(-ia*9)*0.8;o.li=10*Math.exp(-ia*4)+2*env;}
    if(te>=TS&&te<TI){o.ia=is;o.c.copy(G);o.shake=0;o.dist=0.4;o.flash=0;}
    else{o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=1.0;}
  };
}};

// =====================================================================
// 3 · SHIBA — el espíritu de un Shiba Inu aúlla sobre el lanzador y duplica las llamas de furia del escuadrón
// =====================================================================
const shiba={key:"shiba",name:"Shiba",dur:3.4,ti:1.0,pal:"Ámbar",allies:2,
  phases:[["Llamas",0],["Espíritu",0.2],["Aullido",0.8],["Duplicación",1.05],["Fin",2.85]],
build(a){
  const L=a.L,TM=0.2,TH=0.8,TI=1.0,TE=2.85,TF=3.35,SH=V3(-3.62,3.3,0.1),SPD=5.5,TT=V3(-4.25,1.3,0);
  const M=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]], TA=M.map(m=>TI+0.04+Math.hypot(m.x+3.7,m.z)/SPD);
  // cola enroscada de shiba sobre el lomo
  const T=mkTail(L,6,0.13,u=>0.075+0.03*Math.sin(Math.PI*u)-0.035*u,furMat(0xd8762c,0xf2e2c4));
  // espíritu: perfil de shiba en SDF (cráneo, hocico, mandíbula, orejas, cuello); uP gira la cabeza, uQ abre la boca
  const spirit=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.1),fxU(SDF2+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;
   vec2 pv=vec2(-.12,-.18);vec2 h=rot2(p-pv,-uP)+pv;
   float n=noise(vec3(p*4.-vec2(0.,uT*2.5),uT*.7));
   float skull=length((h-vec2(-.1,.1))*vec2(1.,1.08))-.36;
   float snout=sdCap(h,vec2(.12,.02),vec2(.62,-.04),.19,.1);
   vec2 J=vec2(.14,-.12);float ja=-.16-uQ*.6;vec2 je=J+.44*vec2(cos(ja),sin(ja));
   float jaw=sdCap(h,J,je,.11,.06);
   float ear=sdTri(h,vec2(-.34,.3),vec2(.02,.36),vec2(-.18,.88))-.02;
   float ear2=sdTri(h,vec2(-.46,.24),vec2(-.24,.3),vec2(-.42,.74))-.02;
   float neck=sdCap(p,vec2(-.22,-.15),vec2(-.4,-.95),.3,.42);
   float d=min(min(smin(smin(smin(skull,snout,.1),jaw,.06),neck,.12),ear),ear2);
   d+=(n-.5)*.09;
   float mouth=step(sdTri(h,J+vec2(-.04,.02),vec2(.6,-.1),je),0.)*smoothstep(0.,.02,min(snout,jaw))*uQ;
   float eye=smoothstep(.035*(1.-.5*uQ),0.,sdSeg(h,vec2(.03,.14),vec2(.15,.17)));
   float cream=smoothstep(.05,-.05,h.y+.02+.1*(h.x-.3))*step(-.1,h.x)*smoothstep(.02,-.04,min(snout,jaw));
   float brow=smoothstep(.04,.02,length(h-vec2(0.,.26)));
   float fill=smoothstep(.02,-.04,d);float rim=band(d,0.,.035);
   float wisp=smoothstep(.25,0.,d)*smoothstep(.45,.75,noise(vec3(p.x*6.,p.y*3.-uT*4.,uT)))*step(0.,d);
   float fade=smoothstep(-1.,-.6,p.y);
   vec3 col=mix(uC2,uC1,.4+.6*n)*1.3;col=mix(col,vec3(1.,.93,.82)*1.3,cream*.75)+vec3(1.)*rim*.3;
   float al=(fill*(.28+.25*n+cream*.25)+rim*.9+wisp*.4)*fade+eye*1.2+brow*.6+mouth*.8;
   col=mix(col,vec3(1.,.98,.9)*1.8,clamp(eye+mouth*.8+brow*.5,0.,1.));
   gl_FragColor=vec4(col,al*uA);}`,{uQ:{value:0}}));
  // ondas del aullido: arcos que salen de la boca en la dirección del hocico (uQ = ángulo)
  const arcs=new THREE.Mesh(new THREE.PlaneGeometry(7.2,7.2),fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float da=an-uQ;da=atan(sin(da),cos(da));float win=exp(-da*da/.22);
   float m=0.;for(int i=0;i<6;i++){float t=uP-float(i)*.1;if(t<0.||t>.9)continue;
    float rr=.08+t*1.05;m+=band(r,rr,.025+.02*t)*(1.-t/.9)*(.6+.4*noise(vec3(an*8.,float(i),uT*3.)));}
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.6,m*win*uA);}`,{uQ:{value:0}},{depthTest:false}));
  // frente de onda a la altura del cuerpo que alcanza al escuadrón
  const wave=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1.7,56,1,true).translate(0,0.85,0),fx(`void main(){float h=vP.y/1.7;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*6.,h*3.-uT*2.,uT));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);
   float a=(fr*.7+.3)*smoothstep(0.,.3,h)*smoothstep(1.,.5,h)*(.55+.45*n)*(.6+.4*step(.5,fract(h*4.-uT*3.)));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,a*uA);}`));
  wave.position.copy(M[0]);
  // "×2" sobre cada miembro y anillo de llegada
  const X2_FS=SDF2+`void main(){vec2 p=(vUv-.5)*2.;
   float d=min(sdSeg(p,vec2(-.62,-.18),vec2(-.26,.18)),sdSeg(p,vec2(-.62,.18),vec2(-.26,-.18)));
   vec2 q=p-vec2(.3,.2);float an=atan(q.y,q.x);float arc=(an>-.75&&an<2.9)?abs(length(q)-.2):1.;
   d=min(d,arc);d=min(d,sdSeg(p,vec2(.446,.064),vec2(.08,-.36)));d=min(d,sdSeg(p,vec2(.08,-.36),vec2(.54,-.36)));
   float m=smoothstep(.07,.03,d);float g=smoothstep(.3,0.,d)*.35;
   gl_FragColor=vec4(mix(uC1,vec3(1.),m*.5)*1.6,(m+g)*uA);}`;
  const emb=M.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(X2_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const pulse=M.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.1),fx(RING_FS));L.mesh.add(m);return m;});
  L.mesh.add(spirit,arcs,wave);
  const C=`const float TM=${f(TM)};const float TI=${f(TI)};const vec3 SH=${v3(SH)};const vec3 TT=${v3(TT)};`;
  // jirones del espíritu que suben desde la cola
  a.count+=points(L.part,170,C+`void main(){float s=.08+aSeed.x*.55;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();vec3 m=mix(TT,SH,.5)+vec3(-.5+r.x*.3,.2,r.z*.4);vec3 p=mix(mix(TT,m,k),mix(m,SH+r*.7,k),k);
   vA=(age>0.&&age<1.)?sin(k*3.14159)*.9:0.;put(p,(.1+.1*aSeed.z)*(1.-k*.4));}`,FLAME_FS);
  // llamas de furia: la mitad "nueva" solo existe tras la llegada de la onda; todas crecen al doble
  M.forEach((mp,j)=>{
    a.count+=points(L.part,60,C+`const vec3 MP=${v3(mp)};const float TA=${f(TA[j])};
    void main(){float life=.55+aSeed.y*.35;float k=uT/life+aSeed.x*3.;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float dbl=smoothstep(TA,TA+.12,uT);float pop=1.+.6*exp(-max(uT-TA,0.)*7.)*step(TA,uT);
     float isNew=step(.5,aSeed.z);float an=r.x*6.2832;float rad=(.38+.12*r.y)*(1.+.25*dbl);
     vec3 p=MP+vec3(cos(an)*rad,.15+age*(1.1+.6*r.z)*(1.+.5*dbl),sin(an)*rad);
     vA=mix(1.-isNew,1.,dbl)*sin(age*3.14159)*uE;put(p,(.24+.12*r.z)*(1.+dbl)*pop*(1.-age*.35));}`,FLAME_FS);
    // destello de duplicación
    a.count+=points(L.part,45,C+`const vec3 MP=${v3(mp)};const float TA=${f(TA[j])};
    void main(){float life=.5+aSeed.y*.3;float age=(uT-TA-aSeed.x*.05)/life;float t=max(uT-TA,0.);
     vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=MP+vec3(0.,1.,0.)+d*(.35+1.4*aSeed.z)*(1.-exp(-t*5.));
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,.13+.1*aSeed.w);}`,STAR4_FS);});
  // pavesas alrededor del espíritu
  a.count+=points(L.part,130,C+`void main(){float life=.8+aSeed.y*.5;float k=(uT-TM)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=SH+vec3((r.x-.5)*2.3,(r.y-.6)*2.+age*1.1,(r.z-.5)*.8);
   float on=smoothstep(TM,TM+.4,uT)*(1.-smoothstep(${f(TE-0.4)},${f(TE)},uT));
   vA=(k>=1.)?sin(age*3.14159)*on:0.;put(p,.035+.04*r.z);}`);
  a.count+=sparks(L.part,260,TI,`${f(SH.x+0.7)},${f(SH.y+0.45)},${f(SH.z)}`,".3,.9,0.",4,11,1.5);
  // huellas de pata en corro bajo el lanzador
  const paws=groundPlane(3.2,-3.7,0.02,fx(`float paw(vec2 q){float d=length((q-vec2(0.,-.04))*vec2(1.,1.25))-.11;
   d=min(d,length(q-vec2(-.12,.08))-.045);d=min(d,length(q-vec2(-.045,.14))-.045);d=min(d,length(q-vec2(.045,.14))-.045);d=min(d,length(q-vec2(.12,.08))-.045);return d;}
  void main(){vec2 p=(vUv-.5)*3.2;float r=length(p);float an=atan(p.y,p.x);
   float seg=6.2832/8.;float a0=(floor(an/seg)+.5)*seg;vec2 c=vec2(cos(a0),sin(a0))*1.15;
   vec2 q=p-c;q=vec2(dot(q,vec2(-sin(a0),cos(a0))),dot(q,vec2(cos(a0),sin(a0))))*1.4;
   float d=paw(q);float m=smoothstep(.02,-.01,d)*.6+band(d,0.,.02);
   float sweep=step(fract((an+3.14159)/6.2832),uP);
   m=m*sweep+band(r,1.5,.02)+band(r,.75,.012);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,m*uA);}`));
  const groundWave=groundPlane(9,-3.7,0.03,fx(RING_FS));
  // nivel 3: el aullido agrieta en baldosas de energía el suelo bajo el lanzador
  const frac=groundPlane(5.6,-3.7,0.025,fx(tileFractureFS(5.6)));
  L.decal.add(paws,groundWave,frac);
  const R=V3(0,0,0), UP=V3(0,0,0), mw=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, sa=ss(TM,TM+0.45,te)*(1-ss(TE-0.5,TE,te)), howl=ss(TH,TI,te)*(1-ss(TE-0.9,TE-0.4,te));
    const env=ss(0,0.15,te)*(1-ss(TE,TF,te));
    caster.rotation.z=0.08*ss(TH,TI,te)*(1-ss(1.6,2.2,te));
    follow(T);
    const wag=Math.sin(te*13)*(0.1+0.1*sa);
    T.J.forEach((j,i)=>j.rotation.z=i===0?-1.3+wag:-0.5+0.06*Math.sin(te*13-i*0.7));
    T.mat.uniforms.uA.value=0.8*ss(0.05,0.3,te)*(1-ss(0.6,1.0,te))+0.3*sa; T.mat.uniforms.uP.value=0.2*sa;
    // espíritu
    const ang=0.85*howl, mo=ss(TH+0.1,TI,te)*(1-ss(TE-0.9,TE-0.4,te));
    spirit.position.copy(SH); spirit.position.y+=0.06*Math.sin(te*2.4); towardCam(spirit.position,spirit.position,0.1); billboard(spirit);
    spirit.scale.setScalar(Math.max(0.6+0.4*sa,0.001)*(1+0.12*(ia>=0?Math.exp(-ia*5):0))); spirit.visible=sa>0.005;
    set(spirit,ang,sa*(0.85+0.15*Math.sin(te*17))); spirit.material.uniforms.uQ.value=mo;
    // boca en el mundo: punta del hocico girada con la cabeza
    const c=Math.cos(ang), s=Math.sin(ang), hx=0.84, hy=0.14, sc=1.55*spirit.scale.x;
    const mx=(c*hx-s*hy-0.12)*sc, my=(s*hx+c*hy-0.18)*sc;
    R.set(1,0,0).applyQuaternion(camera.quaternion); UP.set(0,1,0).applyQuaternion(camera.quaternion);
    mw.copy(spirit.position).addScaledVector(R,mx).addScaledVector(UP,my);
    arcs.position.copy(mw); billboard(arcs); arcs.visible=te>=TH+0.1&&te<TE-0.3;
    set(arcs,(te-TH-0.1)%1.1,1-ss(TE-0.9,TE-0.4,te)); arcs.material.uniforms.uQ.value=ang-0.05;
    // frente de onda
    const r=SPD*Math.max(ia,0); wave.visible=ia>=0&&r<4.4; wave.scale.set(Math.max(r,0.001),1,Math.max(r,0.001)); wave.material.uniforms.uA.value=0.9*(1-cl(r/4.4));
    set(groundWave,r/4.3/0.95,ia>=0?1-cl(r/4.3):0);
    set(frac,cl(ia/0.75),ia>=0?(0.55+0.45*Math.exp(-ia*2.5))*(1-ss(TE-0.3,TF,te)):0);
    set(paws,ss(TM,TI,te),ss(0,0.3,te)*(1-ss(TE,TF,te))*(0.7+0.3*Math.sin(te*6)));
    U.uE.value=env;
    // miembros del escuadrón: anillo, ×2 y brillo cuando les llega la onda
    M.forEach((mp,j)=>{const d=te-TA[j], on=ss(0,0.1,d)*(1-ss(TE-0.6-TA[j],TE-TA[j],d));
      const e=emb[j]; towardCam(e.position,tmp.set(mp.x,2.35+0.05*Math.sin(te*4+j),mp.z),0.3); billboard(e);
      e.visible=on>0.01; e.scale.setScalar(Math.max(on*(1+0.8*Math.exp(-Math.max(d,0)*8)),0.001)); e.material.uniforms.uA.value=on;
      const pr=pulse[j], k=cl(d/0.45); towardCam(pr.position,tmp.set(mp.x,1,mp.z),0.3); billboard(pr); pr.visible=d>=0&&k<1; set(pr,k,1-k);
      const dm=j===0?caster.userData.m:allies[j-1].userData.m, dbl=d>=0?1:0;
      dm.emissive.copy(U.uC1.value); dm.emissiveIntensity=env*(0.12+0.3*dbl)+(d>=0?0.9*Math.exp(-d*6):0);});
    o.g.copy(SH); o.gs=3.2*sa+(ia>=0?2.2*Math.min(ia,0.5):0); o.ga=0.26*sa+(ia>=0?0.7*Math.exp(-ia*6):0);
    o.li=3.5*sa+(ia>=0?12*Math.exp(-ia*4):0)+1.5*env;
    o.ia=ia; o.c.copy(mw); o.shake=1.6; o.dist=1.6; o.flash=0;
  };
}};

// =====================================================================
// 4 · BUBA BRUSH — un pincel caligráfico gigante traza en el aire el kanji 火 con tinta de fuego y lo lanza al objetivo
// =====================================================================
// trazos de 火 en unidades del plano (1 = 1 m): [inicio, control, fin, ancho inicial, ancho final, cola afilada]
const SK=[[-0.58,0.5,-0.5,0.3,-0.36,0.13,0.075,0.115,1],[0.6,0.55,0.5,0.33,0.34,0.17,0.075,0.115,1],
  [0.0,0.9,0.05,0.05,-0.78,-0.82,0.115,0.03,1],[0.02,0.08,0.28,-0.5,0.84,-0.78,0.06,0.135,0]];
const ST=[[0.42,0.17],[0.65,0.17],[0.88,0.3],[1.24,0.3]];   // inicio y duración de cada trazo
const sEase=k=>{k=cl(k);return k*k*(3-2*k)*0.5+k*0.5;};
const SKG=`void sk(int i,out vec2 A,out vec2 B,out vec2 E,out vec3 W){A=vec2(0.);B=A;E=A;W=vec3(.1,.1,1.);`+
  SK.map((s,i)=>`${i?"else ":""}if(i==${i}){A=vec2(${f(s[0])},${f(s[1])});B=vec2(${f(s[2])},${f(s[3])});E=vec2(${f(s[4])},${f(s[5])});W=vec3(${f(s[6])},${f(s[7])},${f(s[8])});}`).join("")+`}
vec2 bz(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
float wid(vec3 W,float t){float w=mix(W.x,W.y,t)*(.55+.45*smoothstep(0.,.15,t));
 w*=mix(1.,smoothstep(1.02,.7,t),W.z);if(W.z<.5)w*=1.-.85*smoothstep(.88,1.,t);return max(w,.002);}
vec3 dStroke(vec2 p,vec2 A,vec2 B,vec2 E){float best=1e5,bt=0.,bs=0.;vec2 q0=A;
 for(int j=1;j<=14;j++){float t1=float(j)/14.;vec2 q1=bz(A,B,E,t1);
  vec2 pa=p-q0,ba=q1-q0;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);float d=length(pa-ba*h);
  if(d<best){best=d;bt=(float(j-1)+h)/14.;bs=(ba.x*pa.y-ba.y*pa.x)>0.?d:-d;}
  q0=q1;}
 return vec3(best,bt,bs);}`;
// kanji: ink=true → tinta negra (mezcla normal, algo más ancha); false → fuego aditivo. uP: trazos revelados (0..4), uQ: ignición
const kanjiFS=ink=>SKG+`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.4;float body=0.,core=0.,head=0.;
 for(int i=0;i<4;i++){float rv=clamp(uP-float(i),0.,1.);if(rv<=0.)continue;
  vec2 A,B,E;vec3 W;sk(i,A,B,E,W);vec3 s=dStroke(p,A,B,E);
  float w=wid(W,s.y)*${ink?"1.14":"1."};float ac=s.z/w;
  float e=s.x/w+(noise(vec3(s.y*26.,ac*1.5,float(i)*3.))-.5)*.4;
  float drawn=smoothstep(rv+.006,rv-.006,s.y);
  float br=noise(vec3(ac*7.,s.y*2.2,float(i)*7.+1.));
  float gap=smoothstep(.55,.72,br)*smoothstep(.3,1.,s.y)*.9;
  float b=smoothstep(1.,.8,e)*drawn*(1.-gap);
  body=max(body,b);core=max(core,smoothstep(.6,0.,e)*drawn*(1.-gap));
  head=max(head,smoothstep(.1,0.,rv-s.y)*step(rv,.995)*b);
  if(rv>.98){for(int k=0;k<4;k++){float fk=float(k)+float(i)*4.;vec2 dir=vec2(hash(vec3(fk,1.,2.)),hash(vec3(2.,fk,3.)))*2.-1.;
    vec2 c=E+dir*(.1+.18*hash(vec3(fk,fk,5.)));float rr=.012+.03*hash(vec3(3.,fk,7.));
    float sp=smoothstep(rr,rr*.5,length(p-c));body=max(body,sp);core=max(core,sp*.6);}}}
 float n=noise(vec3(p*5.-vec2(0.,uT*2.5),uT));
 ${ink?`gl_FragColor=vec4(mix(vec3(.02,.012,.01),uC2*.35,1.-core),body*.9*uA);`
 :`float heat=core*(.55+.45*n)+head+uQ*.35*body;
 vec3 c=mix(uC2,uC1,smoothstep(.1,.8,heat))*1.5+vec3(1.)*smoothstep(.65,1.1,heat)*.7;
 float al=(body*(.18+.3*n)*(1.-core)+core*.85+head)*(1.+uQ*.6);
 gl_FragColor=vec4(c,min(al,1.4)*uA);`}}`;
const buba={key:"buba",name:"Buba Brush",dur:3.0,ti:1.78,pal:"Fuego",
  phases:[["Coletazo",0],["Trazo",0.42],["Ignición",1.54],["Impacto",1.78],["Brasas",2.05]],
build(a){
  const L=a.L,TG=1.54,TL=1.62,TI=1.78,KC=V3(1.6,1.45,0.35),KE=V3(3.05,1.4,0.55),TT=V3(-4.75,1.2,0),KS=0.8;   // KS: escala del kanji y del pincel
  // cola con borla de pincel
  const T=mkTail(L,5,0.15,u=>0.06-0.025*u,furMat(0x3a2f2a,0x120d0b));
  const tuft=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.26,12).rotateZ(Math.PI/2).translate(-0.13,0,0),fx(`void main(){float x=-vP.x;
   float fib=noise(vec3(atan(vP.z,vP.y)*7.,x*8.,0.));float tip=smoothstep(.12,.26,x);
   vec3 c=mix(vec3(.85,.78,.66),vec3(.04,.02,.02),smoothstep(.06,.16,x))*${LIT}*(.7+.5*fib)+mix(uC2,uC1,tip)*tip*(.5+1.5*uA);
   gl_FragColor=vec4(c,1.);}`,DS));
  T.tip.add(tuft);
  // pincel gigante: cerdas (punta en el origen), virola dorada, mango lacado con nudos de bambú y remate
  const BR_FS=`void main(){float y=vP.y;float an=atan(vP.z,vP.x);
   float fib=noise(vec3(an*9.,y*4.,0.))*.6+noise(vec3(an*23.,y*9.,2.))*.4;
   vec3 hair=mix(vec3(.85,.8,.7),vec3(.05,.03,.03),smoothstep(.36,.18,y));
   float tip=smoothstep(.2,0.,y);
   gl_FragColor=vec4(hair*${LIT}*(.7+.5*fib)+mix(uC2,uC1,tip)*tip*(.6+1.8*uA)*(.6+.4*fib),1.);}`;
  const SPEC=`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),16.)`;
  const goldMat=fx(`void main(){gl_FragColor=vec4(vec3(.75,.55,.2)*${LIT}+vec3(1.,.9,.6)*${SPEC},1.);}`,SOLID);
  const brush=new THREE.Group(), bristle=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.5,18,4).rotateX(Math.PI).translate(0,0.25,0),fx(BR_FS,SOLID));
  brush.add(bristle);
  brush.add(new THREE.Mesh(new THREE.CylinderGeometry(0.085,0.105,0.13,18).translate(0,0.56,0),goldMat));
  brush.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.065,1.7,16).translate(0,1.47,0),fx(`void main(){
   float node=band(fract(vP.y*1.7),.5,.03);
   gl_FragColor=vec4(mix(vec3(.32,.05,.03),vec3(.85,.62,.25),node)*${LIT}+vec3(1.)*${SPEC}*.6,1.);}`,SOLID)));
  brush.add(new THREE.Mesh(new THREE.SphereGeometry(0.075,14,10).translate(0,2.35,0),goldMat));
  L.mesh.add(brush);
  // kanji: capa de tinta debajo y capa de fuego encima; copia pequeña que queda grabada en el objetivo
  const kInk=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fxU(kanjiFS(true),{uQ:{value:0}},NB));
  const kFire=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fxU(kanjiFS(false),{uQ:{value:0}}));
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fxU(kanjiFS(false),{uQ:{value:1}},{depthTest:false}));
  kInk.renderOrder=1; kFire.renderOrder=2; L.trail.add(kInk,kFire); L.mesh.add(brand);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.5),fx(RING_FS,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(BURST_FS)); burst.position.copy(TC);
  L.mesh.add(hitRing,burst);
  const SKS=SK.map(s=>`vec4(${f(s[0])},${f(s[1])},${f(s[4])},${f(s[5])})`);
  const C=SKG+`const float TI=${f(TI)};const float TG=${f(TG)};const vec3 KC=${v3(KC)};const vec3 TT=${v3(TT)};
  vec3 kw(vec2 q){return KC+vec3(q*${f(KS)},.04);}
  float st0(int i){return i==0?${f(ST[0][0])}:(i==1?${f(ST[1][0])}:(i==2?${f(ST[2][0])}:${f(ST[3][0])}));}
  float std(int i){return i==0?${f(ST[0][1])}:(i==1?${f(ST[1][1])}:(i==2?${f(ST[2][1])}:${f(ST[3][1])}));}`;
  // fuego que la cola lanza hacia donde aparece el pincel
  a.count+=points(L.part,90,C+`void main(){float s=.08+aSeed.x*.3;float life=.3+aSeed.y*.1;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 B0=kw(vec2(${f(SK[0][0])},${f(SK[0][1])}))+vec3(0.,.3,.4);vec3 m=mix(TT,B0,.5)+vec3(0.,1.6,0.);vec3 r=rnd();
   vec3 p=mix(mix(TT,m,k),mix(m,B0,k),k)+r*.15*sin(k*3.14159);
   vA=(age>0.&&age<1.)?(1.-k*.5):0.;put(p,(.05+.06*aSeed.z)*(1.-k*.3));}`);
  // remolino que materializa el pincel
  a.count+=points(L.part,70,C+`void main(){float life=.22+aSeed.y*.1;float age=(uT-.18-aSeed.x*.2)/life;
   vec3 B0=kw(vec2(${f(SK[0][0])},${f(SK[0][1])}))+vec3(0.,.8,.33);vec3 d=normalize(rnd()+.0001);vec3 tg=normalize(cross(d,vec3(0.,1.,0.)));float k=age*age;
   vec3 p=B0+(d*cos(k*2.5)+tg*sin(k*2.5))*mix(1.3,.05,k)*vec3(.6,1.,.6);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.05*aSeed.z);}`);
  // salpicaduras que suelta la punta mientras traza
  a.count+=points(L.part,160,C+`void main(){int i=int(min(aSeed.x*4.,3.));float t=aSeed.y;
   vec2 A,B,E;vec3 W;sk(i,A,B,E,W);float s=st0(i)+t*std(i);float life=.35+aSeed.z*.3;float age=(uT-s)/life;float tt=max(uT-s,0.);
   vec2 tg=normalize(bz(A,B,E,min(t+.02,1.))-bz(A,B,E,max(t-.02,0.))+.0001);vec3 r=rnd();
   vec3 v=vec3(tg*1.6,0.)+r*vec3(1.,1.,.5)+vec3(0.,.6,.7);
   vec3 p=kw(bz(A,B,E,t))+v*tt+vec3(0.,-4.*tt*tt,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.05*aSeed.w)*(1.-age*.4));}`);
  // llamas que arden sobre lo ya trazado y se avivan en la ignición
  a.count+=points(L.part,260,C+`void main(){int i=int(min(aSeed.x*4.,3.));float t=aSeed.y;
   vec2 A,B,E;vec3 W;sk(i,A,B,E,W);float born=st0(i)+t*std(i)+.05;
   float life=.4+aSeed.z*.3;float k=(uT-born)/life+aSeed.w;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec2 nr=normalize(vec2(-1.,1.)*(bz(A,B,E,min(t+.02,1.))-bz(A,B,E,max(t-.02,0.))).yx+.0001);
   vec3 p=kw(bz(A,B,E,t)+nr*(r.x-.5)*.08)+vec3((r.y-.5)*.04,age*(.25+.25*r.z),.02);
   float ign=1.+smoothstep(TG-.05,TG+.08,uT)*.8;
   vA=(k>=1.&&uT<TI)?sin(age*3.14159)*.9:0.;put(p,(.1+.08*r.z)*ign*(1.-age*.3));}`,FLAME_FS);
  // el pincel arde y se deshace
  a.count+=points(L.part,60,C+`void main(){float s=TG+.02+aSeed.x*.12;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 B3=kw(vec2(${f(SK[3][4])},${f(SK[3][5])}))+vec3(0.,.45,.33);vec3 r=rnd();
   vec3 p=B3+vec3(r.x*.3,r.y*.9+.3,r.z*.3)+vec3(r.x*.4,1.+aSeed.z,r.z*.4)*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.14+.1*aSeed.w)*(1.-age*.4));}`,FLAME_FS);
  // estallido de fuego en el objetivo
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.08;float life=.45+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.4,.4,.3));vec3 p=${v3(TC)}+d*(.25+1.2*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.5*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.12+.18*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,60,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(3.4,0.,0.)+vec3((r.x-.5)*.9,.2+r.y*1.6+age*.5,(r.z-.5)*.9);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.14+.1*r.z)*(1.-age*.3));}`,FLAME_FS);
  a.count+=sparks(L.part,260,TI,`${f(TC.x)},${f(TC.y+0.1)},.3`,"-.3,.4,.3",3,8,3);
  // reflejo naranja en el suelo bajo el kanji y quemadura en el objetivo
  const glowG=groundPlane(2.6,KC.x,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.6));
   float n=noise(vec3(p*4.,uT*1.5));gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,smoothstep(1.,.1,d)*(.25+.2*n)*uA);}`));
  const scorch=groundPlane(2.2,3.3,0.015,fx(BURN_FS)), shock=groundPlane(4.4,3.3,0.03,fx(RING_FS));
  L.decal.add(glowG,scorch,shock);
  const bzJ=(s,t,out)=>{const u=1-t;return out.set(u*u*s[0]+2*u*t*s[2]+t*t*s[4],u*u*s[1]+2*u*t*s[3]+t*t*s[5],0);};
  // punta del pincel en el plano del kanji; devuelve cuánto está levantado (0 = apoyado)
  const brushAt=(te,out)=>{
    if(te<ST[0][0]){bzJ(SK[0],0,out);return 1-0.7*ss(0.3,ST[0][0],te);}
    for(let i=0;i<4;i++){const s0=ST[i][0],e0=s0+ST[i][1];
      if(te<=e0){bzJ(SK[i],sEase((te-s0)/ST[i][1]),out);return 0;}
      if(i<3&&te<ST[i+1][0]){const k=(te-e0)/(ST[i+1][0]-e0),kk=ss(0,1,k),e=bzJ(SK[i],1,tmp3);bzJ(SK[i+1],0,out);
        out.set(e.x+(out.x-e.x)*kk,e.y+(out.y-e.y)*kk,0);return Math.sin(Math.PI*k)*0.8;}}
    bzJ(SK[3],1,out); return ss(ST[3][0]+ST[3][1],TG+0.08,te);};
  const bp=V3(0,0,0), bq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.12*ss(0,0.16,te)-0.2*ss(0.16,0.3,te)+0.08*ss(0.3,0.7,te);
    follow(T);
    const ft=Math.max(te-0.1,0);
    T.J.forEach((j,i)=>j.rotation.z=(i===0?-0.45-1.0*ss(0,0.16,te)*(1-ss(0.16,0.3,te))+0.5*ss(0.16,0.3,te)*(1-ss(0.3,0.7,te)):-0.1)
      +(te>0.1?0.35*Math.sin(ft*22-i*1.1)*Math.exp(-ft*5):0));
    tuft.material.uniforms.uA.value=ss(0.05,0.2,te)*(1-ss(0.4,0.8,te));
    // trazos
    let prog=0; for(const [s0,d] of ST)prog+=sEase((te-s0)/d);
    const ign=ss(TG,TL,te), fly=ss(TL,TI,te), kv=ia<0.12;
    for(const m of [kInk,kFire]){m.visible=kv&&te>=ST[0][0];m.position.set(KC.x+(KE.x-KC.x)*fly,KC.y+(KE.y-KC.y)*fly,KC.z+(KE.z-KC.z)*fly);
      m.scale.setScalar((1-0.35*fly)*KS);m.material.uniforms.uP.value=prog;m.material.uniforms.uQ.value=ign;}
    kInk.material.uniforms.uA.value=1-0.75*ign; kFire.material.uniforms.uA.value=(0.75+0.6*ign)*(ia>=0?1-cl(ia/0.12):1);
    // pincel
    const lift=brushAt(te,bp), stroking=te>=ST[0][0]&&te<=ST[3][0]+ST[3][1]&&lift<0.01;
    brushAt(te+0.02,bq); const vx=(bq.x-bp.x)/0.02;
    const show=ss(0.2,0.4,te)*(1-ss(TG,TG+0.12,te));
    brush.visible=show>0.01; brush.scale.setScalar(Math.max(show*KS,0.001));
    brush.position.set(KC.x+bp.x*KS,KC.y+bp.y*KS+0.2*lift,KC.z+0.03+0.32*lift);
    brush.rotation.set(0.3,0,-0.3+cl(vx*0.08,-0.5,0.5));
    bristle.scale.set(stroking?1.18:1,stroking?0.84:1,stroking?1.18:1); bristle.material.uniforms.uA.value=0.5+0.5*(stroking?1:0)+ign;
    glowG.material.uniforms.uA.value=ss(0.4,0.8,te)*(1-ss(TL,TI,te))*(0.6+0.6*ign);
    // impacto: estallido y kanji grabado en el objetivo
    let p=cl(ia/0.4); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.25+1.05*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0); scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.4):0;
    const env=ss(TI,TI+0.15,te)*(1-ss(2.4,2.95,te)); U.uE.value=env;
    towardCam(brand.position,tmp.set(target.position.x-0.1,1.25,0),0.45); billboard(brand);
    brand.visible=env>0.01; brand.scale.setScalar(0.32*(1+0.5*Math.exp(-Math.max(ia,0)*9))); set(brand,4,env*(0.7+0.3*Math.sin(te*11)));
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.35; target.rotation.z=-hit*0.3*Math.cos(ia*15);
    o.em=0.5*env; o.emc.copy(U.uC2.value);
    if(te<0.4){o.g.copy(TT);o.gs=0.8;o.ga=0.3*ss(0,0.2,te);o.li=2;}
    else if(te<TL){o.g.set(KC.x+bp.x*KS,KC.y+bp.y*KS,KC.z+0.1);o.gs=1+1.5*ign;o.ga=0.35+0.3*ign;o.li=3+5*ign;}
    else if(te<TI){o.g.set(KC.x+(KE.x-KC.x)*fly,KC.y+(KE.y-KC.y)*fly,KC.z);o.gs=2.4;o.ga=0.6;o.li=8;}
    else{o.g.copy(TC);o.gs=1.6+3.6*ia;o.ga=Math.exp(-ia*9)*0.8;o.li=9*Math.exp(-ia*4)+2*env;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.9;
  };
}};

// =====================================================================
// 5 · GERBIL — se esfuma en humo, viaja como estela por detrás y reaparece a la espalda del objetivo con un doble zarpazo
// =====================================================================
const gerbil={key:"gerbil",name:"Gerbil",dur:2.4,ti:0.86,pal:"Carmesí",
  phases:[["Amago",0],["Humo",0.24],["Reaparición",0.55],["Zarpazo I",0.62],["Zarpazo II",0.78],["Regreso",1.45]],
build(a){
  const L=a.L,TV=0.24,TR=0.55,T1=0.68,TI=0.86,TB=1.45,TH=1.72,X0=-3.7,XR=4.45,CB=V3(3.62,1.25,0),SW=0.1;
  const path=(k,out)=>{const e=k*k*(3-2*k);return out.set(X0+(XR-X0)*e,0.75+0.5*Math.sin(Math.PI*k),-1.5*Math.sin(Math.PI*k));};
  // cola de jerbo: larga y fina, con penacho oscuro
  const T=mkTail(L,8,0.11,u=>0.035-0.015*u,furMat(0xc8a676,0x6a5034));
  const plume=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),T.mat); plume.scale.set(0.11,0.045,0.045); plume.position.x=-0.06; T.tip.add(plume);
  // fantasma del lanzador que se deshace (o se rehace) en humo
  const GHOST_FS=`void main(){float n=noise(vP*4.+vec3(0.,-uT*2.,0.))*.7+noise(vP*11.)*.3;
   float d=n-(uP*1.2-.1+(vP.y-.8)*.2*uP);if(d<0.)discard;
   float edge=smoothstep(.12,0.,d);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,edge)*1.5+vec3(1.)*edge*.4,(fr*.6+.12+edge)*uA);}`;
  const mkGhost=()=>{const g=new THREE.Group(),m=fx(GHOST_FS);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.44,1.25,24).translate(0,0.625,0),m));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.29,20,14).translate(0,1.6,0),m)); g.userData.m=m; L.mesh.add(g); return g;};
  const ghA=mkGhost(), ghB=mkGhost(); ghA.position.set(X0,0,0); ghB.position.set(XR,0,0);
  // estela de humo a lo largo del camino: cintas cruzadas; uP = cabeza, uQ = cola (en recorrido 0..1)
  const N=120,pv=[],ph=[],uv=[],idx=[],pt=V3(0,0,0),nx=V3(0,0,0);
  for(let i=0;i<=N;i++){const s=i/N;path(s,pt);path(Math.min(s+0.002,1),nx);nx.sub(pt).normalize();
    const sx=-nx.z*0.24,sz=nx.x*0.24;
    pv.push(pt.x,pt.y-0.24,pt.z,pt.x,pt.y+0.24,pt.z); ph.push(pt.x-sx,pt.y,pt.z-sz,pt.x+sx,pt.y,pt.z+sz);
    uv.push(s,0,s,1); if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const mk=p=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;};
  const ribFS=dark=>`uniform float uQ;
  void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u<min(uP,uQ)||u>max(uP,uQ))discard;
   float d=abs(uP-u);float n=noise(vec3(u*30.-uT*4.,v*3.,uT*1.5));
   ${dark?`float al=smoothstep(1.,.2,v+(n-.5)*.6)*exp(-d*2.5)*uA;gl_FragColor=vec4(vec3(.16,.13,.18)+uC2*.15,al*.7);`
   :`float c=smoothstep(.35,0.,v+(n-.5)*.2)*exp(-d*6.);gl_FragColor=vec4(mix(uC2,uC1,c)*1.5,c*(.5+.5*n)*uA);`}}`;
  const smokeM=fxU(ribFS(true),{uQ:{value:0}},NB), wispM=fxU(ribFS(false),{uQ:{value:0}});
  for(const m of [smokeM,wispM])for(const p of [pv,ph])L.trail.add(new THREE.Mesh(mk(p),m));
  // zarpazos: tres surcos curvos que barren hacia −x; uQ deja la rasgadura
  const CLAW_FS=`uniform float uQ;
  void main(){vec2 p=vUv;float u=p.x;float m=0.,core=0.;
   for(int i=0;i<3;i++){float off=(float(i)-1.)*.16*(1.-.3*u);float y=(p.y-.5-off)-.12*(1.-pow(2.*u-1.,2.));
    float w=.01+.04*sin(3.14159*u);m=max(m,smoothstep(w*1.8,0.,abs(y)));core=max(core,smoothstep(w*.4,0.,abs(y)));}
   float d=uP-u;float sweep=step(0.,d)*exp(-d*2.2)*smoothstep(0.,.05,u)*smoothstep(1.,.9,u);
   float n=noise(vec3(u*12.-uT*6.,p.y*20.,uT*3.));
   float tear=core*step(u,uP)*sin(3.14159*u);
   gl_FragColor=vec4(mix(uC2,uC1,core+n*.3)*1.6+vec3(1.)*core*(sweep*uA+uQ)*.6,(m*(.5+.5*n)*.8+core)*sweep*uA+tear*uQ);}`;
  const claws=[[T1,Math.PI+0.55],[TI,Math.PI-0.55]].map(([t,ang])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.3),fxU(CLAW_FS,{uQ:{value:0}},{depthTest:false}));
    m.userData={t,ang}; L.trail.add(m); return m;});
  const xflash=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){vec2 p=(vUv-.5)*2.;float d1=abs(p.x-p.y),d2=abs(p.x+p.y);
   float x=smoothstep(.06,0.,min(d1,d2))*smoothstep(1.,.2,length(p));float c=pow(max(0.,1.-length(p)),3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.8,(x+c)*uA);}`,{depthTest:false})); L.mesh.add(xflash);
  const C=`const float TV=${f(TV)};const float TR=${f(TR)};const float T1=${f(T1)};const float TI=${f(TI)};const float X0=${f(X0)};const float XR=${f(XR)};const vec3 CB=${v3(CB)};
  vec3 path(float k){float e=k*k*(3.-2.*k);return vec3(mix(X0,XR,e),.75+.5*sin(3.14159*k),-1.5*sin(3.14159*k));}`;
  // nubes de humo al esfumarse / reaparecer (ida y vuelta)
  for(const [t0,x] of [[TV,X0],[TR,XR],[TB,XR],[TH,X0]])
    a.count+=points(L.part,50,C+`void main(){float s=${f(t0)}+aSeed.x*.05;float life=.6+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=vec3(${f(x)},.8,0.)+d*vec3(.7,.55,.7)*(.2+.75*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.4*t,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.85:0.;put(p,(.35+.35*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.22,.19,.24)"),NB);
  // humo y chispas a lo largo de la estela (ida: dir=1, vuelta: dir=-1)
  for(const [t0,t1,dir] of [[TV,TR,1],[TB,TH,-1]]){
    a.count+=points(L.part,80,C+`void main(){float k=aSeed.x;float s=${f(t0)}+k*${f(t1-t0)};float life=.6+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=path(${dir>0?"k":"1.-k"})+rnd()*.18+vec3(0.,.35*t,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.3+.25*aSeed.w)*(.6+age*1.2));}`,SMOKE_FS("vec3(.2,.17,.22)"),NB);
    a.count+=points(L.part,60,C+`void main(){float k=aSeed.x;float s=${f(t0)}+k*${f(t1-t0)};float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=path(${dir>0?"k":"1.-k"})+rnd()*.25+rnd()*.5*t;
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.04*aSeed.z)*(1.-age*.5));}`);}
  // jirones de aire en cada zarpazo y chispas hacia −x
  for(const [ti,ang] of [[T1,Math.PI+0.55],[TI,Math.PI-0.55]]){
    a.count+=points(L.part,80,C+`void main(){float s=${f(ti-SW)}+aSeed.x*${f(SW)};float life=.25+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     float l=(aSeed.x-.5)*1.8;vec3 dl=vec3(cos(${f(ang)}),sin(${f(ang)}),0.);vec3 nl=vec3(-dl.y,dl.x,0.);
     vec3 p=CB+vec3(0.,0.,.5)+dl*l+nl*(aSeed.z-.5)*.2+(nl*(aSeed.w-.5)*2.+dl*.6)*t*1.6;
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.04*aSeed.w)*(1.-age));}`);
    a.count+=sparks(L.part,150,ti,`${f(CB.x)},${f(CB.y)},.3`,ang>Math.PI?"-.6,-.4,.3":"-.6,.4,.3",2.5,7,3);}
  // anillos de humo en el suelo donde se esfuma y reaparece (nivel 2: sin surcos en el suelo)
  const ringA=groundPlane(2.4,X0,0.03,fx(RING_FS)), ringB=groundPlane(2.4,XR,0.03,fx(RING_FS));
  L.decal.add(ringA,ringB);
  const gp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, i1=te-T1, out=te>=TV&&te<TR, back=te>=TB&&te<TH;
    // lanzador: amago, desaparece, reaparece detrás (en espejo), golpea dos veces y vuelve
    let x=X0, mir=false;
    if(te<TV){const k=ss(0,TV,te);caster.scale.set(1+0.1*k,1-0.16*k,1+0.1*k);caster.rotation.z=-0.12*k;}
    else if(te<TB&&!out){mir=true;x=XR-0.25*ss(T1-0.07,T1,te)-0.15*ss(TI-0.07,TI,te)+0.4*ss(TI+0.1,TI+0.45,te);
      const pop=1+0.25*Math.exp(-(te-TR)*14); caster.scale.set(pop,2-pop,pop);
      caster.rotation.z=0.3*ss(T1-0.07,T1,te)-0.25*ss(T1,T1+0.08,te)+0.35*ss(TI-0.07,TI,te)-0.4*ss(TI+0.1,TI+0.45,te);}
    else if(te>=TH){const pop=1+0.25*Math.exp(-(te-TH)*14); caster.scale.set(pop,2-pop,pop);}
    caster.position.x=x; caster.visible=!out&&!back;
    follow(T,mir);
    const sw=(i1>=-0.1&&te<TI+0.4)?Math.sin(te*30)*0.5*(1-ss(TI+0.1,TI+0.4,te)):0;
    T.J.forEach((j,i)=>j.rotation.z=(i===0?-0.25:0.1)+0.12*Math.sin(te*7-i*0.6)+sw*(i<4?0.3:0.6)*Math.sin(-i*0.8));
    T.mat.uniforms.uA.value=0.4*ss(TR,TR+0.05,te)*(1-ss(TI+0.2,TB,te));
    // fantasmas: A se deshace al irse y se rehace al volver; B al revés
    const gA=ghA.userData.m.uniforms, gB=ghB.userData.m.uniforms;
    if(te<TB){ghA.visible=te>=TV&&te<TV+0.45; gA.uP.value=cl((te-TV)/0.45); gA.uA.value=1;
      ghB.visible=te>=TR-0.03&&te<TR+0.3; gB.uP.value=0.5+0.5*cl((te-TR+0.03)/0.33); gB.uA.value=1-cl((te-TR)/0.3);}
    else{ghB.visible=te<TB+0.45; gB.uP.value=cl((te-TB)/0.45); gB.uA.value=1;
      ghA.visible=te>=TH-0.03&&te<TH+0.3; gA.uP.value=0.5+0.5*cl((te-TH+0.03)/0.33); gA.uA.value=1-cl((te-TH)/0.3);}
    // estela
    let head,tl,al;
    if(te<TB){const k=cl((te-TV)/(TR-TV));head=k;tl=Math.max(0,k-0.55)+0.45*ss(TR,TR+0.3,te);al=te>=TV?1-ss(TR+0.15,TR+0.45,te):0;}
    else{const k=cl((te-TB)/(TH-TB));head=1-k;tl=Math.min(1,head+0.55)-0.45*ss(TH,TH+0.3,te);al=1-ss(TH+0.15,TH+0.45,te);}
    for(const m of [smokeM,wispM]){m.uniforms.uP.value=head;m.uniforms.uQ.value=tl;m.uniforms.uA.value=al;}
    // zarpazos
    for(const m of claws){const u=m.userData,s=(te-(u.t-SW))/SW;
      m.visible=s>=0&&te<TB+0.3; towardCam(m.position,CB,0.7); billboard(m,u.ang);
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.6,s>1?Math.exp(-(s-1)*1.4):1);
      m.material.uniforms.uQ.value=s>=1?Math.exp(-(te-u.t)*2)*(1-ss(TB,TB+0.3,te)):0;}
    towardCam(xflash.position,CB,0.75); billboard(xflash); xflash.material.uniforms.uA.value=ia>=0?Math.exp(-ia*9):0;
    let p=cl((te-TV)/0.5); set(ringA,p,te>=TV?1-p:0); if(te>=TH){p=cl((te-TH)/0.5);set(ringA,p,1-p);}
    p=cl((te-TR)/0.5); set(ringB,p,te>=TR&&te<TB?1-p:0); if(te>=TB){p=cl((te-TB)/0.5);set(ringB,p,1-p);}
    // el objetivo, golpeado por la espalda, se va hacia −x
    const h1=hitK(i1,8), h2=hitK(ia,5);
    target.position.x=3.4-h1*0.1-h2*0.32; target.rotation.z=h1*0.15*Math.cos(i1*18)+h2*0.32*Math.cos(ia*14);
    if(out||back){path(out?cl((te-TV)/(TR-TV)):1-cl((te-TB)/(TH-TB)),gp);o.g.copy(gp);o.gs=0.9;o.ga=0.3;o.li=2.5;}
    else if(te>=TR-0.02&&te<TB){const last=te>=TI?TI:T1;o.g.copy(CB);o.gs=1+1.6*cl(te-last);o.ga=te>=T1-0.05?Math.exp(-Math.max(te-last,0)*10)*0.7:0.2;o.li=te>=T1?5.5*Math.exp(-(te-last)*5):2;}
    else{o.g.set(caster.position.x,0.9,0);o.gs=0.8;o.ga=0.15;o.li=1;}
    const last=te>=TI?TI:T1;
    o.ia=te-last;o.c.copy(CB);o.shake=0;o.dist=last===TI?0.75:0.45;
  };
}};

// =====================================================================
// 6 · HARE — carrera a saltos con estela de zanahoria dorada, huellas luminosas y frenazo con polvo
// =====================================================================
const hare={key:"hare",name:"Hare",dur:2.4,ti:0.78,pal:"Dorado",
  phases:[["Arranque",0],["Carrera",0.12],["Golpe",0.78],["Frenazo",0.86],["Regreso",1.5]],
build(a){
  const HT=[0.12,0.33,0.54,0.78],HX=[-3.7,-1.55,0.55,2.6],TI=0.78,TK=1.15,TR=1.5,TRE=1.95,XK=1.65,HY=0.55;
  const L=a.L,FX=-0.6,FL=7.6,FW=2;
  // posición del lanzador (x, y) en función del tiempo
  const run=(te,out)=>{
    if(te<HT[0])return out.set(-3.7-0.15*ss(0,HT[0],te),0,0);
    for(let j=0;j<3;j++)if(te<HT[j+1]){const k=(te-HT[j])/(HT[j+1]-HT[j]);return out.set(HX[j]+(HX[j+1]-HX[j])*k,HY*Math.sin(Math.PI*k)*(j===2?0.6:1),0);}
    if(te<TK){const k=cl((te-TI)/(TK-TI));return out.set(HX[3]+(XK-HX[3])*(1-(1-k)*(1-k)),0,0);}
    if(te<TR)return out.set(XK,0,0);
    const k=ss(TR,TRE,te); return out.set(XK+(-3.7-XK)*k,0.25*Math.sin(Math.PI*k),0);};
  // cola: borla corta y erguida
  const T=mkTail(L,1,0.06,u=>0.05,furMat(0xf2ece0,0xa89e8c));
  const scut=mkPom(T.tip,0.13); scut.position.set(-0.06,0.05,0); scut.scale.set(0.9,1.2,0.9);
  // estela de zanahoria: punta en el lanzador, cuerpo con anillos, hojas verdes en la cola de la estela
  const tg=new THREE.PlaneGeometry(1,1).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=vUv.y-.5;
   float hw=.42*pow(clamp((1.-u)/.78,0.,1.),.7)*smoothstep(.16,.24,u);
   float body=smoothstep(hw,hw-.06,abs(v))*step(.16,u);
   float ring=band(fract(u*11.+noise(vec3(u*4.,v*3.,0.))*.4),.5,.08)*.35;
   float n=noise(vec3(u*8.-uT*10.,v*5.,uT));
   float lf=0.;for(int i=0;i<3;i++){float k=(float(i)-1.)*.9;float l=clamp((.22-u)/.22,0.,1.);
    float c=k*l*.38+sin(l*6.+uT*14.+float(i))*.03*l;float w=.075*sin(3.14159*min(l*1.05,1.));
    lf=max(lf,smoothstep(w,w*.4,abs(v-c))*step(u,.22));}
   vec3 carrot=mix(vec3(1.,.42,.06),uC1,.35)*(1.-ring)*(.8+.4*n);
   float sp=smoothstep(.04,0.,abs(v))*smoothstep(.2,1.,u)*.6;
   vec3 c=carrot*body+vec3(.35,1.,.3)*(.7+.5*n)*lf+vec3(1.,.95,.7)*sp*body;
   float al=(body*(.45+.4*n)+lf*.9+sp)*uA*smoothstep(0.,.08,u);
   gl_FragColor=vec4(c*1.4,al);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2; trail.add(new THREE.Mesh(tg,tm)); trail.add(t2); L.trail.add(trail);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  const star=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){vec2 q=abs(vUv-.5)*2.;
   float s=smoothstep(.08,0.,q.x*q.y*4.+min(q.x,q.y)*.6)*smoothstep(1.,.1,max(q.x,q.y));float c=smoothstep(.4,0.,length(q));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5+.5*c)*1.7,(s+c)*uA);}`,{depthTest:false}));
  L.mesh.add(hitRing,star);
  const C=`const float HT0=${f(HT[0])};const float HT1=${f(HT[1])};const float HT2=${f(HT[2])};const float HT3=${f(HT[3])};
  const float HX0=${f(HX[0])};const float HX1=${f(HX[1])};const float HX2=${f(HX[2])};const float HX3=${f(HX[3])};
  const float TI=${f(TI)};const float TK=${f(TK)};const float XK=${f(XK)};
  float xRun(float t){if(t<HT1)return mix(HX0,HX1,clamp((t-HT0)/(HT1-HT0),0.,1.));if(t<HT2)return mix(HX1,HX2,(t-HT1)/(HT2-HT1));return mix(HX2,HX3,clamp((t-HT2)/(HT3-HT2),0.,1.));}
  float tAt(float x){if(x<HX1)return mix(HT0,HT1,(x-HX0)/(HX1-HX0));if(x<HX2)return mix(HT1,HT2,(x-HX1)/(HX2-HX1));return mix(HT2,HT3,(x-HX2)/(HX3-HX2));}
  float xSkid(float t){float k=clamp((t-TI)/(TK-TI),0.,1.);return HX3+(XK-HX3)*(1.-(1.-k)*(1.-k));}`;
  // líneas de velocidad que aparecen cuando pasa el lanzador
  a.count+=points(L.part,140,C+`void main(){float x0=mix(HX0,HX3,aSeed.x);float s=tAt(x0);float life=.2+aSeed.y*.12;float age=(uT-s)/life;
   vec3 p=vec3(x0-age*.7,.2+aSeed.z*1.6,(aSeed.w-.5)*1.2);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.7+.5*aSeed.y);}`,STREAK_FS);
  // destellos dorados en la estela
  a.count+=points(L.part,120,C+`void main(){float s=HT0+aSeed.x*(HT3-HT0);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(xRun(s)-.3,.35+aSeed.z*.8,r.z*.3)+vec3(-.6*t,.4*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.08+.08*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  // hojas verdes que se desprenden de la cola de la estela
  a.count+=points(L.part,60,C+`void main(){float s=HT0+.15+aSeed.x*(HT3-HT0-.15);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(xRun(s)-2.4,.8+r.y*.3,r.z*.25)+vec3(-.8*t+r.x*.4*t,.3*t-1.2*t*t,r.z*.6*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.14+.08*aSeed.z);vMix=fract(aSeed.w+t*1.5);}`,LEAF_FS);
  // polvo de cada apoyo
  a.count+=points(L.part,90,C+`void main(){float j=floor(aSeed.x*2.999);float x=j<.5?HX0:(j<1.5?HX1:HX2);float s=(j<.5?HT0:(j<1.5?HT1:HT2))+aSeed.y*.03;
   float life=.45+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.w*6.2832;
   vec3 p=vec3(x,0.,0.)+vec3(cos(an)*.9-.4,0.,sin(an)*.6)*(1.-exp(-t*4.))*(.4+aSeed.y)+vec3(0.,.08+.35*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.22+.2*aSeed.z)*(.6+age));}`,DUST_FS,NB);
  // polvo del frenazo: sale despedido hacia donde patina
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*(TK-TI);float life=.6+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=vec3(-.6-1.2*aSeed.z,.5+.8*aSeed.w,r.z*.7);
   vec3 p=vec3(xSkid(s),.05,(aSeed.w-.5)*.4)+v*t*(1.-t*.4);p.y=max(p.y,.05);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.3+.3*aSeed.y)*(.5+age));}`,DUST_FS,NB);
  // estrellas del golpe
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.4,0.));vec3 p=${v3(TC)}+d*(.25+1.1*aSeed.z)*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.16+.14*aSeed.w)*(1.-age*.4));}`,STAR4_FS);
  a.count+=sparks(L.part,240,TI,`${f(TC.x)},${f(TC.y)},0.`,".6,.35,0.",3,8,3);
  // huellas (dos pies traseros largos delante y dos patitas detrás), onda de apoyo y marcas del frenazo
  const feet=groundPlane(FL,FX,0.02,fx(C+`float ell(vec2 q,vec2 c,vec2 r){return (length((q-c)/r)-1.)*min(r.x,r.y);}
  float print(vec2 q){float d=min(ell(q,vec2(.12,.12),vec2(.17,.055)),ell(q,vec2(.12,-.12),vec2(.17,.055)));
   d=min(d,length(q-vec2(-.2,.05))-.05);d=min(d,length(q-vec2(-.34,-.04))-.05);return d;}
  void main(){vec2 w=vec2(${f(FX)}+(vUv.x-.5)*${f(FL)},(.5-vUv.y)*${f(FW)});float m=0.;
   for(int j=0;j<3;j++){float tx=j==0?HX0:(j==1?HX1:HX2);float tt=j==0?HT0:(j==1?HT1:HT2);float age=uT-tt;if(age<0.)continue;
    vec2 q=w-vec2(tx,0.);float d=print(q);float fade=1.-smoothstep(.45,1.1,age);
    m+=(smoothstep(.015,-.01,d)*.7+band(d,0.,.02)*.8)*fade*(1.+2.*exp(-age*10.));
    m+=band(length(q*vec2(.8,1.)),age*2.4,.05)*exp(-age*5.);}
   float xs=xSkid(uT);float on=step(TI,uT)*(1.-smoothstep(TK+.3,TK+1.,uT));
   float sk=(smoothstep(.03,0.,abs(abs(w.y)-.15))*.8+smoothstep(.12,0.,abs(abs(w.y)-.15))*.2)*step(xs,w.x)*step(w.x,HX3+.1)*smoothstep(HX3+.1,xs,w.x);
   m+=sk*on;
   gl_FragColor=vec4(mix(uC2,uC1,.65)*1.6+vec3(1.)*.15,m*uA);}`));
  const shock=groundPlane(3.8,2.9,0.03,fx(RING_FS));
  L.decal.add(feet,shock);
  const cp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI; run(te,cp);
    caster.position.set(cp.x,cp.y,0);
    const running=te>=HT[0]&&te<TI, hop=running?Math.abs(Math.sin(Math.PI*((te-HT[0])/(HT[1]-HT[0])))):0;
    caster.rotation.z=0.1*ss(0,HT[0],te)-0.4*ss(HT[0],HT[0]+0.06,te)+0.4*ss(TI-0.02,TI+0.06,te)+0.25*ss(TI,TI+0.1,te)*(1-ss(TK,TR,te))-0.2*ss(TR,TR+0.1,te)*(1-ss(TRE-0.15,TRE,te));
    const sq=running?0.12*(hop-0.5):0; caster.scale.set(1-sq*0.5,1+sq,1-sq*0.5);
    follow(T);
    T.J[0].rotation.z=-0.3+(running?0.4*Math.sin(te*30):0);
    const glow=ss(0,HT[0],te)*(1-ss(TI+0.2,TI+0.6,te)); scut.userData.ball.material.uniforms.uA.value=glow; set(scut.userData.fuzz,glow,0.5+0.5*glow);
    // estela de zanahoria tras el lanzador
    const len=Math.min(Math.max(cp.x-HX[0]+0.2,0),3.0), ta=te<TI?ss(HT[0],HT[0]+0.05,te):1-cl((te-TI)/0.25);
    trail.visible=te>HT[0]&&te<TI+0.25; trail.position.set(Math.min(cp.x,HX[3])+0.35,0.8+cp.y*0.6,0); trail.scale.set(Math.max(len,0.001),0.75,0.75); tm.uniforms.uA.value=ta;
    set(feet,0,1);
    // golpe
    let p=cl(ia/0.35); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    towardCam(star.position,TC,0.55); billboard(star,ia*3); star.visible=ia>=0&&ia<0.3; star.scale.setScalar(0.4+1.2*cl(ia/0.3)); star.material.uniforms.uA.value=ia>=0?Math.exp(-ia*10):0;
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    const hit=hitK(ia,4.5); target.position.x=3.4+hit*0.5*(1-Math.exp(-Math.max(ia,0)*18)); target.rotation.z=-hit*0.4*Math.cos(ia*13);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*glow;
    if(te<TI){o.g.set(cp.x+0.4,0.9+cp.y,0);o.gs=te>=HT[0]?1.3:0.6;o.ga=te>=HT[0]?0.45:0.2*ss(0,HT[0],te);o.li=te>=HT[0]?4:1;}
    else{o.g.copy(TC);o.gs=1.3+3*ia;o.ga=Math.exp(-ia*11)*0.75;o.li=7*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.75;
  };
}};

// niveles: K = mapa de tiempo [real, original], n/s = densidad/tamaño de partículas, g/gs = luz y resplandor, rec = retroceso
VFX.module("Bestia · Cola",[
  tier(cotton,{K:[[0,0],[0.14,0.45],[0.32,0.95],[0.52,1.45],[1.0,2.3],[1.4,2.9]],n:0.5,s:0.7,g:0.7,gs:0.7}),     // nivel 1
  tier(nutTail,{K:[[0,0],[0.3,0.38],[0.4,0.5],[0.95,1.3],[2.1,2.8]],n:0.65,s:0.85,g:0.85,gs:0.85,rec:0.6}),       // nivel 2
  shiba,                                                                                                         // nivel 3
  tier(buba,{K:[[0,0],[0.3,0.42],[1.2,1.54],[1.4,1.78],[2.3,3.0]],n:0.7,s:0.85,g:0.85,gs:0.85,rec:0.6}),          // nivel 2
  tier(gerbil,{K:[[0,0],[0.76,0.86],[2.0,2.4]],n:0.7,s:0.85,g:0.85,gs:0.85,rec:0.65}),                            // nivel 2
  tier(hare,{K:[[0,0],[0.7,0.78],[2.1,2.4]],n:0.7,s:0.85,g:0.85,gs:0.85,rec:0.6})]);                               // nivel 2
})();

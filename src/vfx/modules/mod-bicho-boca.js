// =====================================================================
// MÓDULO · CLASE BICHO (BOCA)
// Estética de insecto: conejito de energía con antenas, chillido bioeléctrico, aguijón y hebra escarlata,
// mandíbulas de quitina en tijera y fauces cuadradas de hormiga león. No se dibuja la boca del Axie: los efectos
// nacen frente a ella (≈ x −3.43, y 1.55) y las mandíbulas son proyecciones que aparecen sobre el rival y se disuelven.
// Todas las habilidades son de 1–2 PA (niveles 1 y 2): sin temblor ni fractura de suelo.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,caster,target}=VFX;
const {NB,v3,CHIP_FS,DUST_FS,STAR4_FS,HEART_FS,SMOKE_FS,billboard,towardCam,taperTube}=VFX.lib;

const MO=V3(-3.43,1.55,0);                 // boca del lanzador
const TC=V3(3.15,1.2,0);                   // pecho del objetivo
const TH=V3(3.25,1.62,0);                  // cabeza del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdE(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}`;
// rayo bioeléctrico: recta A→B con zigzag que se re-sortea 28 veces por segundo
const BOLT=`vec3 bolt(vec3 A,vec3 B,float s,float sd,float amp){vec3 d=B-A;vec3 up=abs(normalize(d).y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.);
 vec3 n1=normalize(cross(d,up));vec3 n2=normalize(cross(n1,d));float q=floor(uT*28.+sd*7.);float e=sin(3.14159*s);
 float j1=(noise(vec3(s*6.,sd*13.,q))-.5)*2.+(noise(vec3(s*17.,sd*5.,q+3.))-.5)*.9;
 float j2=(noise(vec3(s*6.,sd*13.+40.,q))-.5)*2.+(noise(vec3(s*19.,sd*9.,q+7.))-.5)*.9;
 return mix(A,B,s)+(n1*j1+n2*j2)*amp*e;}`;
function boltLine(parent,N,defs,body,seed){
  const g=new THREE.BufferGeometry(); g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(N*6),3));
  const m=new THREE.ShaderMaterial({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uA:{value:0},uS:{value:seed||0},uX:{value:V3(0,0,0)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:HEAD+BOLT+`uniform float uA;uniform float uS;uniform vec3 uX;varying float vA;`+defs+`
    void main(){float k=float(gl_VertexID);float s=(floor(k*.5)+mod(k,2.))/${f(N)};vec3 p=vec3(0.);float a=1.;${body}
     vA=a*uA;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:HEAD+`varying float vA;void main(){gl_FragColor=vec4(mix(vec3(1.,.93,.55),vec3(1.),.45)*2.,vA);}`});
  const l=new THREE.LineSegments(g,m); l.frustumCulled=false; parent.add(l); return m;
}
// gota con brillo; col = color GLSL (mezcla normal)
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.7),q.y+.04));
 float a=smoothstep(.33,.26,d)*vA;if(a<.003)discard;float hl=smoothstep(.08,0.,length(q-vec2(-.08,.02)));
 gl_FragColor=vec4(${col}*(.75+.4*vMix)*(1.2-d*1.3)+vec3(1.)*hl*.6,a);}`;
// tono bioeléctrico (amarillo pálido fijo: es la "electricidad" de los bichos, independiente de la paleta)
const ELEC="vec3(1.,.93,.55)";

// =====================================================================
// 1 · CUTE BUNNY — frente a la boca se forma un conejito de luz con antenas de insecto; da tres saltitos tiernos
//     hacia el rival, toma aire y suelta un chillido bioeléctrico (ondas y arcos) que lo deja temblando de Miedo
//     nivel 2: firme — criatura pequeña, ondas medianas, sin marca pesada
// =====================================================================
const bunny={key:"ibCuteBunny",name:"Cute Bunny",pa:2,dur:2.3,ti:1.05,pal:"Sakura",
  phases:[["Aparición",0],["Saltitos",0.2],["Inspira",0.82],["Chillido",1.05],["Miedo",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TH0=0.2,TQ=0.82,TI=1.05,TF=1.4,TE=1.9,BS=0.95;
  const HOPS=[[0.2,0.42,-2.85,-1.3,0.6],[0.42,0.62,-1.3,0.12,0.5],[0.62,0.82,0.12,1.45,0.42]];
  const ZS=[0.18,0.1,0.04,0];
  const bpos=(te,out)=>{if(te<TH0)return out.set(-2.85,0,ZS[0]);
    for(let i=0;i<3;i++){const h=HOPS[i];if(te<h[1]){const k=(te-h[0])/(h[1]-h[0]);return out.set(h[2]+(h[3]-h[2])*k,h[4]*4*k*(1-k),ZS[i]+(ZS[i+1]-ZS[i])*k);}}
    return out.set(1.45,0,0);};
  // conejito (SDF de perfil, mirando a +x): cuerpo, cabeza, cola, patas; antenas de insecto con bolitas (uQ = chillido)
  const BUN=SDF2+`uniform float uQ;
  float sdBun(vec2 p){float d=sdE(p-vec2(-.12,-.4),vec2(.46,.33));
   d=smin(d,length(p-vec2(.3,-.04))-.27,.12);d=smin(d,length(p-vec2(-.6,-.3))-.13+.025*noise(vec3(p*14.,1.)),.05);
   d=smin(d,sdE(p-vec2(.02,-.71),vec2(.27,.07)),.06);d=min(d,sdE(p-vec2(.33,-.66),vec2(.1,.07)));return d;}
  float sdAnt(vec2 p,float q){float sw=sin(uT*5.)*.03+q*sin(uT*60.)*.025;
   vec2 a1=vec2(.12-q*.08,.56+q*.06),a2=vec2(-.06+sw-q*.04,.84+q*.08),b1=vec2(.4,.6+q*.06),b2=vec2(.3+sw,.88+q*.08);
   float d=min(sdSeg(p,vec2(.24,.18),a1),sdSeg(p,a1,a2))-.022;d=min(d,length(p-a2)-.06);
   d=min(d,min(sdSeg(p,vec2(.36,.2),b1),sdSeg(p,b1,b2))-.022);return min(d,length(p-b2)-.06);}`;
  const bun=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fxU(BUN+`
  void main(){vec2 p=(vUv-.5)*2.;float d=sdBun(p);float da=sdAnt(p,uQ);
   float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.03);float halo=smoothstep(.2,0.,min(d,da))*.25;
   float ant=smoothstep(.015,-.01,da);float zap=ant*(.6+.4*noise(vec3(p*20.,uT*20.)))*(.5+uQ);
   float sh=smoothstep(-.4,.25,p.y+p.x*.2);
   float eye=smoothstep(.05,.035,length(p-vec2(.42,.04)));float hl=smoothstep(.022,0.,length(p-vec2(.432,.06)));
   float blush=smoothstep(.07,0.,length((p-vec2(.37,-.1))*vec2(1.,1.6)))*.5;
   float mo=step(.05,uQ)*smoothstep(.01,-.01,sdE(p-vec2(.54,-.12),vec2(.05,.075*uQ+.001)));
   vec3 fur=mix(mix(uC2,vec3(1.),.55),vec3(1.,.97,.98),sh)*(1.-eye*.92-mo*.85)+vec3(1.)*hl+uC2*blush;
   float dn=noise(vec3(p*5.,2.));if(dn<uP)discard;float burn=smoothstep(.12,0.,dn-uP)*step(.001,uP);
   vec3 c=fur*fill+uC1*(rim*1.2+halo)+${ELEC}*zap*1.6+uC1*burn*2.;
   gl_FragColor=vec4(c,min(max(fill,ant)+rim+halo+burn,1.)*uA);}`,{uQ:{value:0}},NB));
  L.mesh.add(bun);
  // chillido: arcos de sonido que avanzan en abanico con el borde chisporroteante (uP = tiempo desde el chillido)
  const wave=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.4).translate(1.6,0,0),fx(`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(3.2,2.4);
   float r=length(p);float an=atan(p.y,p.x);float win=smoothstep(.85,.45,abs(an));float m=0.;
   for(int i=0;i<4;i++){float fi=float(i);float ri=(uP-fi*.08)*5.5;
    float j=(noise(vec3(an*9.,r*3.,floor(uT*30.)+fi))-.5)*.14;
    m+=band(r+j,ri,.05+.03*fi)*step(0.,ri)*smoothstep(3.3,1.,ri);}
   gl_FragColor=vec4(mix(${ELEC},uC1,.35)*1.6,m*win*uA);}`,{depthTest:false}));
  L.trail.add(wave);
  // arcos bioeléctricos del chillido hacia el rival
  const zaps=[0,1,2].map(i=>boltLine(L.trail,30,`const vec3 TH=${v3(TH)};const vec3 TC=${v3(TC)};`,
    `p=bolt(uX,mix(TH,TC,${f(i*0.45)})+vec3(0.,${f(0.12-i*0.1)},${f(0.15*(i-1))}),s,uS,.16);`,2+i*3.1));
  const C=`const float TI=${f(TI)};const float TF=${f(TF)};const float TE=${f(TE)};const vec3 MO=${v3(MO)};const vec3 TH=${v3(TH)};`;
  // la luz sale de la boca y da forma al conejito
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.14;float age=(uT-s)/.14;float k=clamp(age,0.,1.);
   vec3 p=mix(MO+vec3(.1,0.,0.),vec3(-2.85,.45,.18)+rnd()*.3,k*k)+vec3(0.,.25*sin(3.14159*k),0.);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.04+.03*aSeed.z);}`);
  // corazoncitos en cada aterrizaje
  a.count+=points(L.part,36,C+`void main(){float i=floor(aSeed.x*2.999);float s=i<.5?${f(HOPS[0][1])}:(i<1.5?${f(HOPS[1][1])}:${f(HOPS[2][1])});
   float x=i<.5?${f(HOPS[0][3])}:(i<1.5?${f(HOPS[1][3])}:${f(HOPS[2][3])});float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.2);
   vec3 d=normalize(rnd()+vec3(0.,1.,0.));vec3 p=vec3(x,.25,0.)+d*(.15+.5*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.1+.06*aSeed.w)*(1.-age*.4));}`,HEART_FS);
  // electricidad que se acumula en las antenas al inspirar
  a.count+=points(L.part,30,C+`void main(){float life=.1+aSeed.y*.06;float k=(uT-${f(TQ)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c)*2.-1.;
   vec3 p=vec3(1.52,.8,0.)+r*vec3(.2,.12,.1)+vec3(0.,age*.12,0.);
   vA=(k>=1.&&uT<TI+.1)?1.-age:0.;put(p,.03+.02*r.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(${ELEC}*1.8,a);}`);
  a.count+=sparks(L.part,90,TI+0.12,`${f(TH.x)},${f(TH.y-0.1)},0.`,"-.4,.3,0.",2,6,2.5);
  // Miedo: jirones sombríos que se enroscan en el rival
  a.count+=points(L.part,50,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rd=.45+.15*r.y;vec3 p=vec3(3.4+cos(an)*rd,.4+r.z*1.3+age*.5,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*.6*uE:0.;put(p,(.2+.15*r.y)*(.7+age*.5));}`,SMOKE_FS("vec3(.16,.06,.2)"),NB);
  // destellos al deshacerse el conejito
  a.count+=points(L.part,40,C+`void main(){float s=TF+aSeed.x*.3;float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.2);
   vec3 p=vec3(1.45+(aSeed.z-.5)*.7,.1+aSeed.w*.85,0.)+vec3(0.,.5*t,0.)+rnd()*.25*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.08+.08*aSeed.y)*(1.-age*.5));}`,STAR4_FS);
  // anillitos bajo cada aterrizaje y onda del chillido bajo el rival
  const lands=HOPS.map(h=>{const g=groundPlane(1.1,h[3],0.025,fx(RING_FS));L.decal.add(g);return g;});
  const shock=groundPlane(2.8,3.4,0.03,fx(RING_FS)); L.decal.add(shock);

  const bp=V3(0,0,0), mouth=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TH0,te), fear=ia>0?1-ss(TE-0.2,TE+0.3,te):0;
    caster.rotation.z=-0.06*ss(0,0.1,te)+0.06*ss(0.1,0.25,te);
    bpos(te,bp);
    // aplastamiento al aterrizar, estirón al inspirar
    let sq=0; for(const h of HOPS)sq=Math.max(sq,Math.exp(-Math.abs(te-h[1])*28)*(te>h[0]+0.05?1:0));
    const rear=ss(TQ,TI,te)*(1-ss(TI+0.25,TF,te)), shout=ia>0?Math.exp(-ia*3)*(1-ss(TF-0.1,TF,te)):0;
    const sx=BS*(1+0.18*sq-0.06*rear), sy=BS*(1-0.2*sq+0.1*rear);
    towardCam(bun.position,tmp.set(bp.x,bp.y+0.39*sy,bp.z),0.15); billboard(bun,0.15*rear-0.2*shout*Math.sin(ia*40));
    bun.scale.set(sx,sy,1); bun.visible=te<TF+0.4;
    bun.material.uniforms.uQ.value=Math.max(rear*0.4,shout);
    set(bun,ss(TF,TF+0.35,te),form);
    mouth.set(bp.x+0.27*sx,bp.y+0.33*sy,bp.z);
    towardCam(wave.position,mouth,0.2); billboard(wave); wave.visible=ia>0&&ia<0.75; set(wave,Math.max(ia,0),1-ss(0.4,0.75,ia));
    zaps.forEach((m,i)=>{m.uniforms.uX.value.copy(mouth);m.uniforms.uA.value=ia>0?(Math.sin(te*83+i*5)>-0.3?1:0.15)*(1-ss(0.15+i*0.06,0.35+i*0.06,ia))*ss(0.08,0.12,ia):0;});
    lands.forEach((g,i)=>{const p=cl((te-HOPS[i][1])/0.35);set(g,p,te>=HOPS[i][1]?0.6*(1-p):0);});
    let p=cl((ia-0.12)/0.5); set(shock,1-Math.pow(1-p,2),ia>=0.12?0.6*(1-p):0);
    U.uE.value=fear;
    // Miedo: el rival retrocede encogido y tiembla
    const recoil=ia>0.1?ss(0.1,0.25,ia):0;
    target.position.x=3.4+0.22*recoil*fear+0.018*Math.sin(te*85)*fear*(ia>0.1?1:0); target.rotation.z=-0.14*recoil*fear;
    target.scale.set(1,1-0.06*recoil*fear,1);
    o.em=0.25*fear*recoil; o.emc.setRGB(0.35,0.12,0.45);
    if(te<TI){o.g.set(bp.x,bp.y+0.4,bp.z);o.gs=0.9;o.ga=0.25*form+0.15*rear;o.li=1.6*form+1.5*rear;}
    else{o.g.copy(mouth).lerp(TH,cl(ia/0.15));o.gs=1.2+1.8*Math.min(ia,0.4);o.ga=Math.exp(-ia*7)*0.5;o.li=5*Math.exp(-ia*5)+0.6*fear;}
    o.ia=ia-0.12;o.c.copy(TH);o.shake=0;o.dist=0.75;o.flash=0.7;
  };
}};

// =====================================================================
// 2 · MOSQUITO — zumbido; un aguijón rojo sale de la boca en zigzag y pica el pecho del rival; de la herida nace
//     una hebra escarlata que bombea gotas de vida hasta la boca del Axie (flujo continuo, sin orbe); la hebra se corta
//     nivel 2: firme — picadura rápida, succión media
// =====================================================================
const mosquito={key:"ibMosquito",name:"Mosquito",pa:2,dur:2.1,ti:0.42,pal:"Rubí",
  phases:[["Zumbido",0],["Picadura",0.18],["Punción",0.42],["Succión",0.55],["Corte",1.5],["Fin",1.8]],
build(a){
  const L=a.L,TL=0.18,TI=0.42,TS=0.5,TX=1.5,TE=1.8,P0=V3(-3.3,1.55,0),P1=V3(2.88,1.22,0.05),Q1=V3(-0.2,2.6,0.6);
  const SP=`vec3 sp(float t){float k=clamp((t-${f(TL)})/${f(TI-TL)},0.,1.);float e=sin(3.14159*k);
   return mix(${v3(P0)},${v3(P1)},k)+vec3(0.,.12*sin(k*38.)*e+.3*e,.1*cos(k*31.)*e);}`;
  const sp=(te,out)=>{const k=cl((te-TL)/(TI-TL)),e=Math.sin(Math.PI*k);
    return out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+0.12*Math.sin(k*38)*e+0.3*e,P0.z+(P1.z-P0.z)*k+0.1*Math.cos(k*31)*e);};
  // curva de la hebra: del pecho del rival (u=0) a la boca (u=1)
  const qb=(u,out)=>{const w=1-u;return out.set(w*w*TC.x+2*w*u*Q1.x+u*u*MO.x,w*w*TC.y+2*w*u*Q1.y+u*u*MO.y,w*w*TC.z+2*w*u*Q1.z+u*u*MO.z);};
  const QB=`vec3 qb(float u){float w=1.-u;return w*w*${v3(TC)}+2.*w*u*${v3(Q1)}+u*u*${v3(MO)};}`;
  // aguijón: aguja roja con la punta al blanco
  const sting=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.75,10).rotateZ(-Math.PI/2),fx(`void main(){float l=vP.x/.75+.5;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,l)*1.5+vec3(1.)*pow(l,4.)*.8,(.5+.5*fr)*uA);}`));
  L.mesh.add(sting);
  // hebra escarlata: tubo fino con pulsos peristálticos que viajan hacia el Axie; uP = crecimiento, uQ = corte
  const pts=[]; for(let i=0;i<=20;i++)pts.push(qb(i/20,V3(0,0,0)));
  const thread=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),80,8,0.05,0.03),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;if(abs(u-.5)<uQ*.5)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);float pul=pow(.5+.5*sin(u*30.-uT*16.),6.);
   float hd=smoothstep(.05,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(uC2,uC1,pul*.7+fr*.3)*1.5+vec3(1.)*(pul*.25+hd),(.45+.4*fr+pul*.5+hd)*uA);}`,{uQ:{value:0}}));
  L.trail.add(thread);
  const punct=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(punct);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TX=${f(TX)};const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};`+SP+QB;
  // zumbido: vibración diminuta frente a la boca
  a.count+=points(L.part,30,C+`void main(){float life=.08+aSeed.y*.05;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c)*2.-1.;
   vec3 p=MO+vec3(.15,0.,0.)+r*vec3(.12,.1,.12)*(1.+age);vA=(k>=1.&&uT<TL+.05)?1.-age:0.;put(p,.025+.02*r.z);}`);
  // estela en zigzag del vuelo
  a.count+=points(L.part,80,C+`void main(){float s=TL+aSeed.x*(TI-TL);float t=max(uT-s,0.);float age=(uT-s)/(.18+aSeed.y*.12);
   vec3 p=sp(s)+rnd()*.025+rnd()*.15*t;vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.035+.03*aSeed.z)*(1.-age*.5));}`);
  // gotas que saltan de la punción
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.25);
   vec3 v=normalize(rnd()+vec3(-.9,.5,.3))*(1.+1.8*aSeed.z);vec3 p=TC+v*t+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.04*aSeed.w);}`,DROP_FS("mix(uC2,uC1,.4)"),NB);
  // gotas de vida que fluyen por la hebra del rival al Axie (flujo continuo)
  a.count+=points(L.part,120,C+`void main(){float t=uT-TS;float u=fract(aSeed.x+t*.75);float rev=clamp(t/.18,0.,1.);
   vec3 p=qb(u)+rnd()*.035;float cut=step(.5*step(TX,uT),abs(u-.5))*(1.-smoothstep(TX,TX+.15,uT));
   vA=(t>0.)?smoothstep(0.,.05,u)*step(u,rev)*smoothstep(1.,.93,u)*cut*(.6+.4*aSeed.y):0.;put(p,.05+.04*aSeed.z);}`,DROP_FS("mix(uC2,uC1,.6)"));
  // el Axie se nutre: chispas de vida que suben a su alrededor
  a.count+=points(L.part,50,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TS-.3)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=.45+.15*r.y;vec3 p=vec3(-3.7+cos(an)*rd,.2+r.z*1.1+age*.6,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.07+.07*r.y)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=sparks(L.part,40,TI,`${f(TC.x)},${f(TC.y)},.05`,"-.6,.3,.2",1.5,4,2.5);
  const shock=groundPlane(2.4,3.4,0.03,fx(RING_FS));
  L.decal.add(shock);

  const s0=V3(0,0,0), s1=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(TS-0.05,TS+0.2,te), cut=ss(TX,TX+0.18,te), env=te>TS?1-ss(TX,TX+0.3,te):0;
    caster.rotation.z=-0.08*ss(0,TL,te)+0.12*ss(TL,TL+0.06,te)-0.04*ss(TL+0.1,TI,te);
    // aguijón: vuela en zigzag apuntando a su avance; clavado, late mientras bombea y se disuelve al cortar
    if(te<TI){sp(te,s0);sp(te+0.008,s1);}else{s0.set(P1.x+0.04*Math.sin(te*30)*env,P1.y,P1.z);s1.copy(s0).x+=1;}
    sting.visible=te>=TL-0.02&&te<TX+0.2; sting.position.copy(s0); sting.rotation.z=Math.atan2(s1.y-s0.y,s1.x-s0.x);
    sting.scale.setScalar(1+0.12*Math.sin(te*16)*env); sting.material.uniforms.uA.value=1-ss(TX,TX+0.2,te);
    thread.visible=te>TS-0.05&&te<TE+0.1; set(thread,grow,(1-ss(TX+0.05,TE,te))*0.95); thread.material.uniforms.uQ.value=cut*0.9;
    let p=cl(ia/0.3); towardCam(punct.position,TC,0.3); billboard(punct); punct.visible=ia>=0&&p<1; set(punct,p,1-p);
    p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?0.5*(1-p):0);
    U.uE.value=env;
    // el Axie se enciende en rojo con cada pulso; el rival palidece
    const pulse=0.5+0.5*Math.sin(te*16-2);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=env*grow*(0.18+0.22*pulse);
    const hit=hitK(ia,8); target.position.x=3.4+hit*0.1; target.rotation.z=-hit*0.12*Math.cos(ia*16)+0.03*env*Math.sin(te*5);
    target.scale.set(1-0.03*env,1-0.04*env,1-0.03*env);
    if(te<TL){o.g.copy(MO);o.gs=0.5;o.ga=0.2;o.li=1;}
    else if(te<TI){o.g.copy(s0);o.gs=0.8;o.ga=0.4;o.li=2.5;}
    else if(te<TX){qb(0.5+0.45*Math.sin(te*2),o.g);o.gs=1+0.8*hitK(ia,6);o.ga=0.18+0.4*hitK(ia,8);o.li=2+3*hitK(ia,6);}
    else{o.g.copy(MO);o.gs=0.9;o.ga=0.2*(1-cut);o.li=1.5*(1-cut);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.45;
  };
}};

// =====================================================================
// 3 · PINCER — dos mandíbulas en hoz de quitina afilada se abren sobre el rival y muerden en tijera dos veces; saltan
//     esquirlas de quitina, quedan tajos que sangran (Bleed) y un fragmento luminoso arrancado sale volando y se
//     desmorona (el descarte de carta)
//     nivel 2: firme — dos mordiscos medios, salpicadura suave en el suelo
// =====================================================================
const pincer={key:"ibPincer",name:"Pincer",pa:2,dur:2.1,ti:0.55,pal:"Carmesí",
  phases:[["Apertura",0],["Mordida",0.55],["Segunda",0.85],["Desgarro",1.0],["Desangrado",1.3],["Fin",1.9]],
build(a){
  const L=a.L,T1=0.55,T2=0.85,TD=1.0,TB=[1.3,1.65],TE=1.95,PV=V3(TC.x-1.0,TC.y,0);
  // hoja en hoz: filo interior aserrado, garfio en la punta; uQ = 1 hoja superior, −1 inferior (pivote en u=0)
  const BLADE=`uniform float uQ;
  void main(){float u=vUv.x;float v=(vUv.y-.5)*uQ;
   float yc=.16*sin(3.14159*u*.9)-.6*pow(max(u-.62,0.),1.5);
   float w=.13*pow(sin(3.14159*min(u*.95+.03,1.)),.6)*(1.-u*.55)+.005;
   float ser=.035*abs(fract(u*11.)-.5)*2.*step(.12,u)*step(u,.8);
   float tp=yc+w,bt=yc-w-ser;float out_=max(v-tp,bt-v);
   float inB=smoothstep(.012,0.,out_);float edge=smoothstep(.025,0.,abs(v-bt))*inB;
   float sheen=smoothstep(.04,0.,abs(v-(yc+w*.35)))*inB;
   float dn=noise(vec3(u*8.,v*8.,3.));if(dn<uP)discard;float burn=smoothstep(.1,0.,dn-uP)*step(.001,uP);
   vec3 ch=mix(vec3(.12,.02,.02),uC2*.8,.4+.6*clamp((v-bt)/(tp-bt+.001),0.,1.));
   float halo=smoothstep(.12,0.,out_)*.25;
   vec3 c=ch*inB+uC1*(edge*1.8+sheen*.6+halo+burn*2.)+vec3(1.)*edge*.4;
   gl_FragColor=vec4(c,min(inB*.92+halo+burn,1.)*uA);}`;
  const geo=new THREE.PlaneGeometry(1.55,0.78).translate(0.775,0,0);
  const blades=[1,-1].map(q=>{const m=new THREE.Mesh(geo,fxU(BLADE,{uQ:{value:q}},Object.assign({depthTest:false},NB)));L.mesh.add(m);return m;});
  // tajos que sangran: dos cortes cruzados sobre el pecho; laten en cada tic de Desangrado (uP)
  const gash=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fx(`void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<2;i++){float an=i==0?.42:-.3;vec2 q=vec2(cos(an)*p.x+sin(an)*p.y,-sin(an)*p.x+cos(an)*p.y);
    float w=.05*(1.-q.x*q.x);m=max(m,smoothstep(w,0.,abs(q.y+.04*sin(q.x*9.)))*step(abs(q.x),.95));}
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.6+vec3(1.)*m*uP*.6,m*(.6+.6*uP)*uA);}`,{depthTest:false}));
  // fragmento arrancado: esquirla dentada luminosa que gira y se desmorona
  const shard=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.4),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float d=max(max(-p.y-.55,p.x*.9+p.y*.45-.5),-p.x*.9+p.y*.45-.5)+(noise(vec3(p*8.,2.))-.5)*.18;
   float fill=smoothstep(.03,-.03,d);float rim=band(d,0.,.05);
   float dn=noise(vec3(p*4.,7.));if(dn<uP)discard;float burn=smoothstep(.15,0.,dn-uP)*step(.001,uP);
   gl_FragColor=vec4(mix(uC2,uC1,.4+rim)*1.5+vec3(1.)*rim*.4+uC1*burn,(fill*.45+rim+burn)*uA);}`,{depthTest:false}));
  L.mesh.add(gash,shard);
  const shardAt=(te,out)=>{const t=Math.max(te-T2-0.05,0);return out.set(TC.x+0.15+1.1*t,TC.y+0.15+2.2*t-2.4*t*t,0.3);};
  const C=`const float T1=${f(T1)};const float T2=${f(T2)};const float TD=${f(TD)};const vec3 TC=${v3(TC)};`;
  // esquirlas de quitina de cada mordisco
  [[T1,45],[T2,70]].forEach(([t,n])=>{a.count+=points(L.part,n,C+`void main(){float s=${f(t)}+aSeed.x*.04;float tt=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.3);
   vec3 v=normalize(rnd()+vec3(.2,.4,.6))*(1.6+2.4*aSeed.z);vec3 p=TC+vec3(.1,0.,.2)+v*tt+vec3(0.,-6.*tt*tt,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);});
  a.count+=sparks(L.part,50,T1,`${f(TC.x+0.1)},${f(TC.y)},.25`,".3,.3,.6",2,5,3);
  a.count+=sparks(L.part,80,T2,`${f(TC.x+0.1)},${f(TC.y)},.25`,".3,.4,.6",2.5,7,3);
  // Desangrado: gotas que caen de los tajos (bucle) y una ráfaga en cada tic
  a.count+=points(L.part,90,C+`void main(){float life=.45+aSeed.y*.3;float k=(uT-T1-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=TC+vec3((r.x-.5)*.5,(r.y-.5)*.4,.32)+vec3(0.,-1.6*age*age,0.);p.y=max(p.y,.03);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.04*r.z);}`,DROP_FS("mix(uC2,uC1,.35)"),NB);
  TB.forEach(t=>{a.count+=points(L.part,25,C+`void main(){float s=${f(t)};float tt=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(-.2,.3,.8))*(.8+1.2*aSeed.z);vec3 p=TC+vec3(0.,0.,.3)+v*tt+vec3(0.,-4.*tt*tt,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.05+.035*aSeed.w);}`,DROP_FS("mix(uC2,uC1,.5)"),NB);});
  // el fragmento se deshace en polvo luminoso
  a.count+=points(L.part,40,C+`void main(){float s=TD+.15+aSeed.x*.35;float t0=max(s-T2-.05,0.);
   vec3 c=vec3(TC.x+.15+1.1*t0,TC.y+.15+2.2*t0-2.4*t0*t0,.3);float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.2);
   vec3 p=c+rnd()*.12+rnd()*.4*t+vec3(.2*t,-.3*t*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.z);}`);
  // salpicadura bajo el rival
  const splat=groundPlane(1.8,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,3.))*.6+noise(vec3(p*17.,8.))*.4;
   float blob=smoothstep(.6,.3,r+(n-.5)*.5);vec2 g=p*10.;float dots=smoothstep(.25,.1,length(fract(g)-.5))*step(.82,hash(vec3(floor(g),2.)))*smoothstep(1.,.5,r);
   gl_FragColor=vec4(mix(uC2*.6,uC1*.7,n),(blob*.55+dots*.6)*uA);}`,NB));
  const shock=groundPlane(2.6,3.4,0.03,fx(RING_FS));
  L.decal.add(splat,shock);

  a.pose=function(te,o){
    const ia=te-T1, i2=te-T2;
    // ángulo de apertura: abre, primer mordisco, reabre a medias, segundo mordisco más fuerte, se separan y disuelven
    let an;
    if(te<T1-0.1)an=0.85*ss(0,0.3,te)+0.04*Math.sin(te*40)*ss(0.25,0.45,te);
    else if(te<T1){const k=(te-T1+0.1)/0.1;an=0.85-0.95*k*k;}
    else if(te<T2-0.08)an=-0.1+0.6*ss(T1+0.05,T1+0.18,te);
    else if(te<T2){const k=(te-T2+0.08)/0.08;an=0.5-0.66*k*k;}
    else an=-0.16+0.03*Math.sin(i2*50)*Math.exp(-i2*8)+0.7*ss(TD,TD+0.25,te);
    const dis=ss(TD,TD+0.3,te);
    blades.forEach((m,i)=>{towardCam(m.position,PV,0.45+i*0.01); billboard(m,i?-an:an); m.scale.setScalar(0.88);
      m.visible=dis<0.999; set(m,dis,ss(0,0.15,te));});
    // tic de Desangrado: los tajos laten
    let tick=0; for(const t of TB)tick=Math.max(tick,te>=t?Math.exp(-(te-t)*6):0);
    towardCam(gash.position,TC,0.4); billboard(gash); gash.visible=ia>0&&te<TE+0.1;
    gash.scale.setScalar(0.8+0.1*(i2>0?1:0)); set(gash,Math.max(tick,hitK(ia,10),hitK(i2,8)),ia>0?(i2>0?1:0.55)*(1-ss(TE-0.3,TE+0.1,te)):0);
    shardAt(te,tmp); towardCam(shard.position,tmp,0.3); billboard(shard,(te-T2)*9); shard.visible=i2>0.05&&te<TD+0.6;
    set(shard,ss(TD+0.1,TD+0.55,te),ss(T2+0.05,T2+0.1,te));
    set(splat,0,ia>0?ss(0,0.2,ia)*(1-ss(TE-0.2,TE+0.15,te))*0.8:0);
    let p=cl(i2/0.5); set(shock,1-Math.pow(1-p,2),i2>=0?0.55*(1-p):0);
    U.uE.value=ia>0?1-ss(TE-0.3,TE,te):0;
    const h1=hitK(ia,9), h2=hitK(i2,6);
    target.position.x=3.4+h1*0.08+h2*0.18; target.rotation.z=-(h1*0.1+h2*0.2)*Math.cos(Math.max(i2,0)*14)+0.04*tick;
    o.em=0.3*tick; o.emc.copy(U.uC2.value);
    if(te<T1){o.g.copy(TC);o.gs=1;o.ga=0.2*ss(0,0.3,te);o.li=1.5*ss(0,0.3,te);}
    else{const il=i2>=0?i2:ia, k=i2>=0?1:0.6;o.g.copy(TC);o.gs=1.1+2*Math.min(il,0.4)*k;o.ga=Math.exp(-il*9)*0.55*k+0.15*tick;o.li=6*k*Math.exp(-il*6)+1.5*tick;}
    o.ia=i2>=0?i2:ia;o.c.copy(TC);o.shake=0;o.dist=i2>=0?0.7:0.4;o.flash=i2>=0?1:0.7;
  };
}};

// =====================================================================
// 4 · SQUARE TEETH — fauces de hormiga león con dientes cuadrados caen sobre el rival y lo trituran con un rechinar
//     seco: la armadura se resquebraja, saltan lascas pétreas, polvo y arena
//     nivel 1: rápido y preciso — fauces pequeñas, golpe a 0,34 s, sin marca en el suelo
// =====================================================================
const square={key:"ibSquareTeeth",name:"Square Teeth",pa:1,dur:1.2,ti:0.34,pal:"Miel",
  phases:[["Fauces",0],["Trituración",0.34],["Polvo",0.58],["Fin",0.95]],
build(a){
  const L=a.L,T0=0.18,TI=0.34,TG=0.56,TE=0.95,JC=V3(TC.x,1.28,0);
  // fila de dientes cuadrados (caja redondeada) con encía de quitina y tenazas laterales; uQ = 1 arriba, −1 abajo
  const JAW=`uniform float uQ;
  void main(){vec2 p=vUv;float y=uQ>0.?1.-p.y:p.y;float gum=.28;
   float cx=fract(p.x*5.);float id=floor(p.x*5.);float tw=.34+.06*hash(vec3(id,uQ,1.));float tl=.4+.14*hash(vec3(id,uQ,4.));
   vec2 b=vec2(abs(cx-.5)-tw,abs(y-gum-tl*.5)-tl*.5);float d=length(max(b,0.))+min(max(b.x,b.y),0.);
   float tooth=smoothstep(.03,-.01,d);float bar=smoothstep(gum+.02,gum-.02,y)*smoothstep(0.,.06,y);
   float hook=smoothstep(.06,0.,abs(length(vec2(abs(p.x-.5)-.5,y-.1)*vec2(1.,.8))-.32))*step(.38,abs(p.x-.5))*step(.1,y);
   float cr=smoothstep(.04,0.,abs(noise(vec3(p*vec2(18.,10.),id))-.5))*tooth*uP;
   float edge=band(d,0.,.03)+band(y,gum,.02)*(1.-tooth);
   vec3 en=mix(uC1,vec3(1.,.96,.86),.45)*(.7+.3*smoothstep(gum,gum+tl,y));
   vec3 c=en*tooth+mix(vec3(.25,.15,.06),uC2*.6,.5)*bar*(1.-tooth)+uC2*(edge*1.2+hook)-vec3(.4)*cr;
   gl_FragColor=vec4(c,min(tooth+bar*.9+hook+edge*.5,1.)*uA);}`;
  const jaws=[1,-1].map(q=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.48),fxU(JAW,{uQ:{value:q}},Object.assign({depthTest:false},NB)));L.mesh.add(m);return m;});
  // armadura resquebrajada sobre el rival: grietas radiales que se abren desde el centro del mordisco
  const crack=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float j=noise(vec3(r*4.,an*2.,1.))-.5;float rays=pow(1.-abs(fract(an*1.1+j*.4)*2.-1.),22.)+pow(1.-abs(fract(an*1.9+j*.6+.3)*2.-1.),30.)*.7;
   float m=rays*smoothstep(uP,uP-.2,r)*smoothstep(1.,.6,r)+band(r,uP*.9,.05)*step(uP,.99)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,rays)*1.6,m*uA);}`,{depthTest:false}));
  L.mesh.add(crack);
  const C=`const float TI=${f(TI)};const float TG=${f(TG)};const vec3 JC=${v3(JC)};`;
  // lascas de armadura (mezcla normal, tono piedra)
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=(uT-s)/(.4+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(.1,.5,.7))*(1.4+1.8*aSeed.z);vec3 p=JC+v*t+vec3(0.,-6.5*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.035+.035*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);float d=max(q.x,q.y)+min(q.x,q.y)*.4;float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.38,.33,.28),uC1*.8,.25+.25*vMix)*(1.15-d),a);}`,NB);
  // polvo seco del rechinar
  a.count+=points(L.part,35,C+`void main(){float s=TI+aSeed.x*.15;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.3);
   vec3 d=normalize(rnd()+vec3(0.,.3,.6));vec3 p=JC+d*(.15+.45*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.15*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.12+.1*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // arena que se escurre de los dientes al moler
  a.count+=points(L.part,70,C+`void main(){float life=.3+aSeed.y*.15;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=JC+vec3((r.x-.5)*.75,-.18-age*age*1.,.25+(r.z-.5)*.1);p.y=max(p.y,.03);
   vA=(k>=1.&&uT<${f(TE)})?(1.-age)*(1.-smoothstep(TG,${f(TE)},uT)):0.;put(p,.025+.02*r.y);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.3,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(vec3(.85,.7,.45),uC1,.3),a);}`,NB);
  a.count+=sparks(L.part,50,TI,`${f(JC.x)},${f(JC.y)},.3`,".2,.3,.6",1.5,4,2.5);

  a.pose=function(te,o){
    const ia=te-TI, c=te<T0?0:te<TI?Math.pow((te-T0)/(TI-T0),2):1;
    const grind=ia>0?0.045*Math.sin(te*70)*(1-ss(TI,TG,te)):0, dis=ss(TG,TE,te);
    const op=0.42*(1-c)-0.04*c+(ia>0?0.03*Math.exp(-ia*20):0), form=ss(0,T0,te);
    jaws.forEach((m,i)=>{const sg=i?-1:1;towardCam(m.position,tmp.set(JC.x+grind*sg,JC.y+sg*(0.12+op),JC.z),0.45);billboard(m);
      m.scale.set(0.95+0.05*form,0.95+0.05*form,1); m.visible=dis<0.999; set(m,ia>0?0.5+0.5*cl(ia/0.15):0,form*(1-dis));});
    towardCam(crack.position,JC,0.42); billboard(crack); crack.visible=ia>0&&te<TE+0.1; set(crack,ss(0,0.12,ia),1-ss(TG,TE+0.1,te));
    const hit=hitK(ia,10); target.scale.set(1+0.05*hit,1-0.1*hit,1+0.05*hit); target.position.x=3.4+hit*0.06+grind*0.6;
    o.em=0.15*hit; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(JC);o.gs=0.7;o.ga=0.18*form;o.li=1.2*form;}
    else{o.g.copy(JC);o.gs=0.9+1.5*Math.min(ia,0.3);o.ga=Math.exp(-ia*10)*0.45;o.li=4*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(JC);o.shake=0;o.dist=0.5;
  };
}};

VFX.module("Bicho · Boca",[bunny,mosquito,pincer,square]);
})();

// =====================================================================
// MÓDULO · CLASE ACUÁTICO (OREJAS)
// Estética de clase: agua translúcida, burbujas irisadas, espuma, vapor marino y mucosa nacarada.
// Las orejas no se dibujan: los efectos nacen en su posición (≈ x −3.72, y 1.82, z ±0.26).
// Niveles por PA: 1 (Nimo, Tiny Fan) rápido y ligero · 2 (Bubblemaker, Gill, Inkling, Little Crab) estándar,
// sin fractura · 3 (Seaslug) pesado, con fractura de baldosa bajo el rival.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,STAR4_FS,SMOKE_FS,SLASH_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;
VFX.palette("Tinta",["#a9b8ff","#2a1f6b"]);

const TC=V3(3.15,1.2,0);                                   // pecho del objetivo
const EARP=V3(-3.72,1.84,0.26), EARN=V3(-3.72,1.84,-0.26); // orejas del lanzador (+z hacia cámara)
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
// plano de suelo centrado en (x,z)
const gp=(s,x,z,mat,y)=>{const m=groundPlane(s,x,y||0.02,mat);m.position.z=z;return m;};
const emit=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};

// ---------- shaders compartidos del módulo ----------
// pompa de jabón: película fina irisada (fresnel + bandas de interferencia), dos reflejos; uP>0 la revienta con ruido
const IRID_FS=`void main(){vec3 n=normalize(vN),v=normalize(vV);float fr=1.-abs(dot(n,v));
 float th=noise(normalize(vP)*2.5+vec3(0.,uT*.5,uT*.2));
 vec3 film=.55+.45*cos(6.2832*(fr*1.3+th*.9+vec3(0.,.33,.67)));
 float sp=pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.4,.6,.7)))),40.);
 float sp2=pow(max(0.,dot(reflect(-v,n),normalize(vec3(.5,-.2,.8)))),18.)*.4;
 float dz=noise(normalize(vP)*5.+vec3(uT))-uP*1.1;if(uP>0.&&dz<0.)discard;
 float edge=uP>0.?smoothstep(.12,0.,dz):0.;
 vec3 c=mix(uC1,film,.6)*(.35+1.3*pow(fr,1.8))+vec3(1.)*(sp*1.6+sp2+edge*1.5);
 gl_FragColor=vec4(c,(pow(fr,2.2)*.8+.05+sp+sp2+edge)*uA);}`;
// ondas concéntricas en el suelo (tres crestas que se abren con uP)
const RIPPLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=0.;
 for(int i=0;i<3;i++){float c=uP*1.1-float(i)*.18;w+=band(r,c,.035+.03*max(c,0.))*step(0.,c)*(1.-clamp(c,0.,1.));}
 float n=noise(vec3(p*8.,uT));
 gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.4,w*(.6+.4*n)*uA*smoothstep(1.,.85,r));}`;
// gota de agua (mezcla normal) con brillo
const WDROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.6),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,0.)));
 gl_FragColor=vec4(mix(vec3(.7,.9,1.),uC1,.4)*(.75+.4*vMix)*(1.1-d)+vec3(1.)*hl*.8,a*.9);}`;
// espuma: copo con agujeros (mezcla normal)
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*9.,vMix*30.));
 float a=smoothstep(.5,.2,d+(n-.5)*.3)*smoothstep(.25,.5,n+.2)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.93,.98,1.),uC1,.18)*(.85+.3*n),a);}`;
// gota de tinta (mezcla normal): casi negra con reflejo índigo
const INK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q*vec2(1.,1.+vMix*.6));float a=smoothstep(.4,.3,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.1,0.,length(q-vec2(-.1,-.1)));
 gl_FragColor=vec4(vec3(.02,.015,.05)+uC2*.35*(1.-d*2.)+uC1*hl*.6,a);}`;

// =====================================================================
// 1 · BUBBLEMAKER (2 PA) — de las orejas se inflan tres pompas irisadas que flotan hasta el aliado:
//     las dos pequeñas quedan orbitando (cargas de Burbuja) y la grande lo envuelve como escudo
// =====================================================================
const bubblemaker={key:"qoBubblemaker",name:"Bubblemaker",pa:2,dur:2.2,ti:1.15,pal:"Arcano",allies:1,
  phases:[["Inflar",0],["Soplo",0.36],["Deriva",0.6],["Escudo",1.15],["Cargas",1.45],["Fin",1.9]],
build(a){
  const L=a.L,TI=1.15,TE=1.9,AP=ALLY_POS[0],AC=V3(AP.x,0.95,AP.z),RS=1.08,W=2.6;
  // s0 = oreja donde nace; s = centro ya inflado (inicio del viaje)
  const BB=[{r:0.5,i0:0,i1:0.38,t0:0.45,t1:TI,s0:V3(-3.66,1.9,0.36),big:1,ph:0},
            {r:0.19,i0:0.1,i1:0.32,t0:0.36,t1:0.92,s0:V3(-3.7,1.88,-0.3),ph:0},
            {r:0.19,i0:0.18,i1:0.4,t0:0.42,t1:1.0,s0:V3(-3.62,1.9,0.3),ph:Math.PI}];
  BB.forEach(b=>{b.off=V3(0.06,b.r*0.85,0.04*Math.sign(b.s0.z));b.s=b.s0.clone().add(b.off);});
  const orb=(b,te,o)=>o.set(AC.x+Math.cos(W*te+b.ph)*0.85,1.55+0.07*Math.sin(te*3+b.ph),AC.z+Math.sin(W*te+b.ph)*0.85);
  BB.forEach(b=>{b.e=b.big?AC.clone():orb(b,b.t1,V3(0,0,0));b.c=V3((b.s.x+b.e.x)/2,Math.max(b.s.y,b.e.y)+0.95,(b.s.z+b.e.z)/2);});
  const bpos=(b,te,o)=>{if(te<b.t0)return o.copy(b.s0).addScaledVector(b.off,ss(b.i0,b.i1,te));
    if(te<b.t1||b.big){const k=ss(b.t0,b.t1,te);qb(b.s,b.c,b.e,k,o);o.z+=Math.sin(te*5)*0.06*Math.sin(Math.PI*k);return o;}
    return orb(b,te,o);};
  const meshes=BB.map(b=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(IRID_FS));L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS));L.mesh.add(hitRing);

  const C=`const float TI=${f(TI)};const vec3 AC=${v3(AC)};`+QB+`
  vec3 bp(float i,float t){vec3 s,c,e;float t0,t1;`+BB.map((b,i)=>`${i?"else ":""}${i<2?`if(i<${f(i+0.5)})`:""}{s=${v3(b.s)};c=${v3(b.c)};e=${v3(b.e)};t0=${f(b.t0)};t1=${f(b.t1)};}`).join("")+`
   float k=smoothstep(t0,t1,t);vec3 p=qb(s,c,e,k);p.z+=sin(t*5.)*.06*sin(3.1416*k);return p;}`;
  // brillo jabonoso que converge en cada oreja mientras se inflan
  a.count+=points(L.part,70,C+`void main(){float i=floor(aSeed.x*2.999);vec3 s=i<.5?${v3(BB[0].s)}:(i<1.5?${v3(BB[1].s)}:${v3(BB[2].s)});
   float st=aSeed.y*.32;float life=.22;float age=(uT-st)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(s+normalize(rnd()+.001)*.55,s,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.z);}`);
  // estela de burbujitas soltadas por cada pompa en su deriva
  a.count+=points(L.trail,180,C+`void main(){float i=floor(aSeed.x*2.999);float t0=i<.5?${f(BB[0].t0)}:(i<1.5?${f(BB[1].t0)}:${f(BB[2].t0)});
   float t1=i<.5?${f(BB[0].t1)}:(i<1.5?${f(BB[1].t1)}:${f(BB[2].t1)});
   float s=t0+aSeed.y*(t1-t0);float life=.5+aSeed.z*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bp(i,s)+rnd()*.12*(i<.5?1.5:.8)+vec3(sin(t*6.+aSeed.w*9.)*.04,.35*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.05+.07*aSeed.w)*(i<.5?1.3:.9));}`,BUBBLE_FS);
  // al envolver: chispas, gotas que salen en corona y destellos de película
  a.count+=sparks(L.part,70,TI,`${f(AC.x)},${f(AC.y)},${f(AC.z)}`,"0.,.4,0.",2,5,1.5);
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),.6+aSeed.w*.8,sin(an))*(1.6+1.4*aSeed.y);vec3 p=AC+vec3(cos(an),0.,sin(an))*.5+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.08+.06*aSeed.w);}`,WDROP_FS,NB);
  // dentro del escudo suben burbujas en bucle; motas irisadas recorren la superficie
  a.count+=points(L.part,60,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=sqrt(r.y)*.7;vec3 p=vec3(AC.x+cos(an)*rad,.1+age*1.7,AC.z+sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.05+.06*r.z));}`,BUBBLE_FS);
  a.count+=points(L.part,50,C+`void main(){float an=aSeed.x*6.2832+uT*(.6+.5*aSeed.y);float el=(aSeed.z-.5)*2.6;
   vec3 p=AC+vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el))*${f(RS)};
   vA=uE*(.5+.5*sin(uT*7.+aSeed.w*20.));put(p,(.035+.035*aSeed.w)*uE);}`,STAR4_FS);
  // suelo: ondas bajo el aliado al envolverlo y charco irisado mientras dura el escudo
  const rip=gp(3.2,AP.x,AP.z,fx(RIPPLE_FS),0.03);
  const pool=gp(2.6,AP.x,AP.z,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*6.,uT*.5));vec3 film=.55+.45*cos(6.2832*(r*1.2+n+uT*.2+vec3(0.,.33,.67)));
   float m=smoothstep(1.,.6,r)*(.25+.35*n)+band(r,.82,.04);
   gl_FragColor=vec4(mix(uC1,film,.5)*1.2,m*uA);}`),0.02);
  L.decal.add(rip,pool);

  const bp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TE,2.18,te);
    // el lanzador toma aire (se hincha) y sopla inclinándose hacia el aliado
    const puff=ss(0,0.36,te)*(1-ss(0.36,0.5,te));
    caster.scale.set(1+0.07*puff,1+0.04*puff,1+0.07*puff); caster.rotation.z=0.08*puff-0.12*ss(0.38,0.5,te)*(1-ss(0.7,1.0,te));
    BB.forEach((b,i)=>{const m=meshes[i],inf=ss(b.i0,b.i1,te);bpos(b,te,bp);m.position.copy(bp);
      let r=b.r*Math.max(inf,0.001);const wob=0.06*Math.sin(te*9+i*2);
      if(b.big&&ia>=0){r=b.r+(RS-b.r)*(1-Math.exp(-ia*6)*Math.cos(ia*14));}
      m.scale.set(r*(1+wob),r*(1-wob),r*(1+wob*0.5)); m.visible=te>=b.i0&&fade>0.001;
      set(m,0,(0.65+0.35*inf)*fade*(b.big&&ia>=0?0.85+0.4*hitK(ia,5):1));});
    let p=cl(ia/0.4); towardCam(hitRing.position,AC,0.8); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(rip,cl(ia/0.9),ia>=0?1-cl(ia/0.9)*0.6:0); pool.material.uniforms.uA.value=ss(TI,TI+0.2,te)*fade*0.8;
    U.uE.value=ss(TI,TI+0.25,te)*fade;
    emit(allies[0],0.6*hitK(ia,4)+0.18*U.uE.value);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*ss(0,0.3,te)*(1-ss(0.45,0.7,te));
    if(te<BB[0].t0){bpos(BB[0],te,o.g);o.gs=1.2*ss(0,0.38,te);o.ga=0.3;o.li=2;}
    else if(te<TI){bpos(BB[0],te,o.g);o.gs=1.5;o.ga=0.35;o.li=2.6;}
    else{o.g.copy(AC);o.gs=2.4+1.5*Math.min(ia,0.4);o.ga=0.55*hitK(ia,8)+0.12*U.uE.value;o.li=6*hitK(ia,5)+1.5*U.uE.value;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.45;o.flash=0;
  };
}};

// =====================================================================
// 2 · GILL (2 PA) — las orejas expulsan vapor marino que se comprime en tres anillos de vórtice contra el rival;
//     después una columna de agua inunda y vacía al lanzador y a cada aliado, dejándoles una carga de Burbuja
// =====================================================================
const gill={key:"qoGill",name:"Gill",pa:2,dur:2.25,ti:0.85,pal:"Loto",allies:2,
  phases:[["Branquias",0],["Vapor",0.25],["Vórtices",0.45],["Impacto",0.85],["Inmersión",1.15],["Carga",1.7],["Fin",2.0]],
build(a){
  const L=a.L,TI=0.85,TM=1.15,TF=1.42,TD=1.75,O0=V3(-3.3,1.86,0);
  const RT=[0.45,0.53,0.61], RA=[0.85,0.92,0.99];                       // salida y llegada de cada anillo
  const MEM=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]], HIT=V3(3.2,1.35,0);
  const rpos=(i,te,o)=>{const k=cl((te-RT[i])/(RA[i]-RT[i]));return o.lerpVectors(O0,HIT,1-Math.pow(1-k,1.6)).add(tmp3.set(0,0.12*Math.sin(Math.PI*k)*(i-1),0));};
  // anillo de vórtice: niebla marina enroscada, más densa en el borde
  const VORT_FS=`void main(){vec3 n=normalize(vN),v=normalize(vV);float fr=1.-abs(dot(n,v));
   float an=atan(vP.y,vP.x);float sw=noise(vec3(an*3.+uT*9.,vUv.y*6.,uT))*.6+noise(vec3(an*9.-uT*12.,vUv.y*14.,2.))*.4;
   gl_FragColor=vec4(mix(uC2,uC1,sw)*1.4+vec3(1.)*smoothstep(.7,.9,sw)*.4,(.25+.75*fr)*(.4+.8*sw)*uA);}`;
  const rings=RT.map(()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,0.26,14,48),fx(VORT_FS));L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS));L.mesh.add(hitRing);
  // columna de inmersión: agua que sube y baja (uP = nivel), cáusticas y menisco brillante
  const COL_H=2.3, colMat=fx(`void main(){float h=vP.y/${f(COL_H)};if(h>uP)discard;
   float an=atan(vP.z,vP.x);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   vec3 q=vec3(an*3.,h*6.-uT*1.5,uT*.7);float c=pow(1.-abs(noise(q)*2.-1.),6.)+pow(1.-abs(noise(q*2.1+3.)*2.-1.),8.)*.6;
   float bub=step(.93,hash(vec3(floor(an*14.),floor(h*30.-uT*12.),1.)));
   float men=smoothstep(.06,0.,uP-h);
   gl_FragColor=vec4(mix(uC2,uC1,c*.7+men)*1.3+vec3(1.)*(men*.7+bub*.5),((.12+.45*fr)*(.5+.6*c)+men*.9+bub*.4)*uA);}`);
  const cols=MEM.map(p=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.62,COL_H,36,1,true).translate(0,COL_H/2,0),colMat);m.position.copy(p);L.mesh.add(m);return m;});
  // cargas de Burbuja: una pompa pequeña orbita la cabeza de cada miembro
  const chMat=fx(IRID_FS), charges=MEM.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),chMat);L.mesh.add(m);return m;});

  const C=`const float TI=${f(TI)};const float TM=${f(TM)};const float TF=${f(TF)};const float TD=${f(TD)};const vec3 O0=${v3(O0)};const vec3 HIT=${v3(HIT)};
  const vec3 E1=${v3(EARP)};const vec3 E2=${v3(EARN)};
  vec3 mem(float i){return i<.5?${v3(MEM[0])}:(i<1.5?${v3(MEM[1])}:${v3(MEM[2])});}`;
  // agua del aire que entra en las branquias
  a.count+=points(L.part,70,C+`void main(){vec3 e=aSeed.x<.5?E1:E2;float s=aSeed.y*.2;float life=.18;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(e+normalize(rnd()+.001)*.7,e,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // vapor marino a chorros por ambos lados de la cabeza
  a.count+=points(L.part,110,C+`void main(){float sd=aSeed.x<.5?1.:-1.;vec3 e=sd>0.?E1:E2;float s=.25+aSeed.y*.32;float life=.5+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=e+vec3((aSeed.w-.4)*.5*t,(.5+.6*aSeed.z)*t,sd*(1.4+aSeed.w)*(1.-exp(-t*3.))*.6)+rnd()*.05;
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.55:0.;put(p,(.18+.16*aSeed.w)*(.5+age*1.2));}`,SMOKE_FS("vec3(.78,.9,.96)"),NB);
  a.count+=points(L.part,60,C+`void main(){vec3 e=aSeed.x<.5?E1:E2;float sd=aSeed.x<.5?1.:-1.;float s=.25+aSeed.y*.3;float life=.35+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(vec3(rnd().x*.6,.7,sd))*(1.5+1.5*aSeed.w);vec3 p=e+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.05+.04*aSeed.w);}`,WDROP_FS,NB);
  // estela de niebla tras los anillos
  a.count+=points(L.trail,150,C+`void main(){float s=.45+aSeed.x*.5;float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-.45)/.4,0.,1.);vec3 p=mix(O0,HIT,1.-pow(1.-k,1.6))+rnd()*vec3(.08,.3,.3)+vec3(-.3*t,.15*t,0.);
   vA=(age>0.&&age<1.&&s<.99)?(1.-age)*.8:0.;put(p,(.05+.05*aSeed.w)*(1.-age*.4));}`);
  // impacto: vapor que revienta, gotas y chispas
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.15;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.3,.3,0.));vec3 p=HIT+d*(.2+.9*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.3+.25*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.8,.92,.97)"),NB);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.5,0.))*(2.+3.*aSeed.z);vec3 p=HIT+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.06+.05*aSeed.w);}`,WDROP_FS,NB);
  a.count+=sparks(L.part,60,TI,`${f(HIT.x)},${f(HIT.y)},0.`,"-.4,.3,0.",2,6,2);
  // inmersión: burbujas que suben dentro de cada columna y burbujeo final de la carga
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*2.999);vec3 m=mem(i);float s=TM+aSeed.y*(TD-TM-.1);float life=.45+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;float rad=.15+.4*fract(aSeed.w*7.3);vec3 p=m+vec3(cos(an)*rad,.05+t*(2.+aSeed.z*1.5),sin(an)*rad)+vec3(sin(t*9.+an)*.04,0.,0.);
   vA=(age>0.&&age<1.&&p.y<2.3)?(1.-age):0.;put(p,.05+.07*fract(aSeed.w*3.1));}`,BUBBLE_FS);
  a.count+=points(L.part,60,C+`void main(){float i=floor(aSeed.x*2.999);vec3 m=mem(i);float s=TF+aSeed.y*.1;float life=.45+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=m+vec3(0.,1.95,0.)+d*(.1+.5*(1.-exp(-t*5.)));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  // suelo: ondas al inundarse cada miembro y onda bajo el rival
  const rips=MEM.map(p=>{const m=gp(2.6,p.x,p.z,fx(RIPPLE_FS),0.03);L.decal.add(m);return m;});
  const shock=gp(3.4,3.4,0,fx(RING_FS),0.03); L.decal.add(shock);

  const rv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, im=te-TM;
    // branquias: el Axie se hincha al inspirar y sacude la cabeza al expulsar el vapor
    const inh=ss(0,0.25,te)*(1-ss(0.25,0.4,te));
    caster.scale.set(1+0.06*inh,1+0.03*inh,1+0.06*inh); caster.rotation.z=0.06*inh-0.08*ss(0.4,0.5,te)*(1-ss(0.6,0.8,te));
    rings.forEach((m,i)=>{const k=(te-RT[i])/(RA[i]-RT[i]);m.visible=k>=0&&k<1.08;rpos(i,te,m.position);
      const r=0.16+0.26*cl(k);m.scale.set(r,r,r*1.2);
      tmp.copy(camera.position).sub(m.position).normalize().multiplyScalar(0.7).add(tmp2.set(1,0,0)).add(m.position);m.lookAt(tmp);
      set(m,0,ss(0,0.15,k)*(1-ss(0.95,1.08,k))*(i===0?1:0.8));});
    let p=cl(ia/0.4); towardCam(hitRing.position,HIT,0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    // columnas: suben (inmersión) y se vacían
    const lv=ss(TM,TF,te)*(1-ss(TF+0.05,TD,te));
    cols.forEach((m,i)=>{m.visible=lv>0.001;const w=1+0.04*Math.sin(te*12+i);m.scale.set(w,1,w);});
    set(cols[0],lv*1.02,0.85);
    charges.forEach((m,i)=>{const P=MEM[i],an=te*3+i*2.1;m.position.set(P.x+Math.cos(an)*0.5,1.95+0.06*Math.sin(te*4+i),P.z+Math.sin(an)*0.5);
      const e=ss(TF,TF+0.2,te)*(1-ss(2.0,2.22,te));m.visible=e>0.001;m.scale.setScalar(0.13*(0.4+0.6*e));});
    chMat.uniforms.uA.value=ss(TF,TF+0.2,te)*(1-ss(2.0,2.22,te));
    rips.forEach(m=>set(m,cl(im/0.9),im>=0?1-cl(im/0.9)*0.5:0));
    const glowM=0.5*Math.exp(-Math.max(te-TF,0)*5)*(te>=TF?1:0)+0.3*lv;
    emit(caster,glowM); emit(allies[0],glowM); emit(allies[1],glowM);
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.22*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.16*Math.cos(ia*13);
    if(te<RT[0]){o.g.set(-3.72,1.9,0);o.gs=0.9*ss(0.1,0.4,te);o.ga=0.25;o.li=1.5;}
    else if(te<TI){rpos(0,te,rv);o.g.copy(rv);o.gs=1.2;o.ga=0.35;o.li=2.5;}
    else if(te<TM){o.g.copy(HIT);o.gs=1.6+2*Math.min(ia,0.3);o.ga=0.6*hitK(ia,9);o.li=6*hitK(ia,5);}
    else{o.g.set(-3.7,1.2,0);o.gs=2;o.ga=0.25*lv;o.li=2.5*lv+0.5;}
    o.ia=ia;o.c.copy(HIT);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 3 · INKLING (2 PA) — la tinta se acumula en la oreja, sale a chorro y estalla en una nube negra sobre la cabeza
//     del rival; un velo de tinta le gira alrededor (ceguera) y su anillo de alcance se encoge en el suelo
// =====================================================================
const inkling={key:"qoInkling",name:"Inkling",pa:2,dur:2.2,ti:0.7,pal:"Tinta",
  phases:[["Tinta",0],["Chorro",0.4],["Estallido",0.7],["Ceguera",0.95],["Disipación",1.7]],
build(a){
  const L=a.L,TJ=0.4,TI=0.7,TB=0.95,TX=1.7,ES=V3(-3.62,1.95,0.32),TH=V3(3.22,1.62,0.05);
  // chorro: tubo afinado en arco suave; uP = frente, uQ = cola que se retira
  const pts=[];for(let i=0;i<=10;i++){const k=i/10;pts.push(V3(ES.x+(TH.x-ES.x)*k,ES.y+(TH.y-ES.y)*k+0.75*Math.sin(Math.PI*k),ES.z+(TH.z-ES.z)*k+0.18*Math.sin(Math.PI*k*2)));}
  const jet=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),90,10,0.05,0.12),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;
   float n=noise(vec3(u*30.-uT*20.,vUv.y*6.,uT*3.));float sp=${SPEC(22)};
   float head=smoothstep(.08,0.,uP-u);
   gl_FragColor=vec4(vec3(.02,.015,.05)+uC2*.4*n+uC1*(sp*1.2+head*.3),.92*uA);}`,{uQ:{value:0}},NB));
  // nube de tinta: esfera de ruido que se expande (mezcla normal) con borde índigo aditivo
  const cloud=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);
   float n=noise(q*3.+vec3(uT*.8))*.6+noise(q*7.-vec3(uT))*.4;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float a=smoothstep(.3,.6,n+(1.-fr)*.35-uP*.6);gl_FragColor=vec4(vec3(.015,.01,.035)+uC2*.25*n,a*.92*uA);}`,NB));
  const rim=new THREE.Mesh(new THREE.SphereGeometry(1.06,40,28),fx(`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);
   float n=noise(q*5.+vec3(uT));gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,fr*smoothstep(.4,.7,n)*uA);}`));
  cloud.position.copy(TH); rim.position.copy(TH); rim.renderOrder=1; L.mesh.add(cloud,rim); L.trail.add(jet);

  const C=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TB=${f(TB)};const float TX=${f(TX)};const vec3 ES=${v3(ES)};const vec3 TH=${v3(TH)};
  vec3 jp(float k){return vec3(ES.x+(TH.x-ES.x)*k,ES.y+(TH.y-ES.y)*k+.75*sin(3.1416*k),ES.z+(TH.z-ES.z)*k+.18*sin(6.2832*k));}`;
  // gotas de tinta que se arremolinan en la oreja
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TJ-.12);float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*5.;vec3 p=ES+vec3(cos(an),sin(an)*.6,sin(an))*(.5*(1.-k*k))+rnd()*.03;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.06+.05*aSeed.z);}`,INK_FS,NB);
  // salpicaduras a lo largo del chorro
  a.count+=points(L.part,90,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=jp((s-TJ)/(TI-TJ))+rnd()*.06+vec3(rnd().x*.6*t,(rnd().y*.8)*t-3.*t*t,rnd().z*.6*t);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.04+.05*aSeed.w);vMix=aSeed.z;}`,INK_FS,NB);
  // estallido: bocanadas de tinta que se expanden y quedan flotando
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.1;float life=1.+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.1,0.));vec3 p=TH+d*(.2+.95*aSeed.z)*(1.-exp(-t*4.))+vec3(sin(t*2.+aSeed.w*6.)*.08,.12*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.85:0.;put(p,(.36+.3*aSeed.w)*(.6+age*.7));}`,SMOKE_FS("vec3(.025,.02,.05)"),NB);
  // zarcillos de tinta que se enroscan hacia fuera
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.25;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*4.*(aSeed.w-.5);float rad=.3+1.1*(1.-exp(-t*3.));
   vec3 p=TH+vec3(cos(an)*rad,sin(an*1.3)*rad*.6-.4*t,sin(an)*rad*.7);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.07+.06*aSeed.w)*(1.-age*.5));}`,INK_FS,NB);
  // destellos índigo en el borde de la nube
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.4;float life=.4+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=TH+normalize(rnd()+.001)*(.95+.25*aSeed.z);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.04*aSeed.w);}`);
  // ceguera: velo de tinta que orbita la cabeza en bucle
  a.count+=points(L.part,90,C+`void main(){float an=aSeed.x*6.2832+uT*(2.4+.8*aSeed.y);float rad=.42+.12*aSeed.z;
   vec3 p=TH+vec3(cos(an)*rad,(aSeed.w-.5)*.22+sin(an*2.)*.04,sin(an)*rad);
   vA=uE*.8;put(p,(.16+.14*aSeed.w)*uE);}`,SMOKE_FS("vec3(.03,.02,.06)"),NB);
  // suelo: salpicón de tinta bajo el rival y anillo de alcance que se contrae
  const splat=gp(2.4,3.4,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*6.,1.))*.6+noise(vec3(p*15.,4.))*.4;float sp=pow(noise(vec3(an*4.,1.,2.)),2.)*.6;
   float m=smoothstep(.65+sp,.45+sp,r+(n-.5)*.3)+step(.8,noise(vec3(p*16.,2.)))*smoothstep(1.,.55,r);
   gl_FragColor=vec4(vec3(.02,.015,.04),m*.8*uA);}`,NB),0.015);
  const range=gp(4.8,3.4,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float R=mix(.95,.42,uP);float dash=step(.45,fract(an/6.2832*28.-uT*.5));
   float m=band(r,R,.025)*dash+band(r,R,.06)*.25;
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,m*uA);}`),0.025);
  L.decal.add(splat,range);

  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB;
    caster.rotation.z=0.12*ss(0,TJ,te)-0.2*ss(TJ,TJ+0.08,te)+0.08*ss(TI,TI+0.3,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.3*ss(0,TJ,te)*(1-ss(TJ,TI,te));
    jet.visible=te>=TJ&&te<TI+0.3; set(jet,cl((te-TJ)/(TI-TJ))*1.01,1); jet.material.uniforms.uQ.value=cl((te-TI+0.04)/0.25);
    const cs=ia>=0?0.3+0.9*(1-Math.exp(-ia*7)):0, ce=ia>=0?1-ss(TB+0.2,TX,te):0;
    cloud.visible=rim.visible=ce>0.001; cloud.scale.setScalar(cs); rim.scale.setScalar(cs);
    set(cloud,ss(TB,TX,te),ce); set(rim,0,ce*(0.6+0.6*hitK(ia,6)));
    U.uE.value=ss(TB-0.1,TB+0.15,te)*(1-ss(TX,2.1,te));
    splat.material.uniforms.uA.value=ia>=0?ss(0,0.1,ia)*(1-ss(TX,2.15,te)):0;
    set(range,ss(TB,TB+0.55,te),ss(TB-0.05,TB+0.1,te)*(1-ss(TX,2.1,te))*0.9);
    // el rival recibe el golpe y sacude la cabeza, cegado
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.2*(1-Math.exp(-Math.max(ia,0)*20));
    target.rotation.z=-hit*0.15*Math.cos(ia*13)+0.05*Math.sin(te*11)*U.uE.value;
    if(te<TJ){o.g.copy(ES);o.gs=0.7*ss(0,TJ,te);o.ga=0.2;o.li=1;}
    else if(te<TI){const k=(te-TJ)/(TI-TJ);o.g.set(ES.x+(TH.x-ES.x)*k,ES.y+(TH.y-ES.y)*k+0.75*Math.sin(Math.PI*k),ES.z);o.gs=0.9;o.ga=0.25;o.li=1.8;}
    else{o.g.copy(TH);o.gs=1.6+2.5*Math.min(ia,0.4);o.ga=0.5*hitK(ia,8);o.li=5*hitK(ia,5)+0.6*U.uE.value;}
    o.ia=ia;o.c.copy(TH);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 4 · NIMO (1 PA) — un pez payaso salta de un chapoteo junto a la oreja, cruza sobre la cabeza y suelta burbujas
//     de oxígeno que caen sobre el Axie y se funden con él en un brillo cálido (recarga y cura en el mundo, sin HUD)
// =====================================================================
const nimo={key:"qoNimo",name:"Nimo",pa:1,dur:1.3,ti:0.42,pal:"Ámbar",
  phases:[["Salto",0],["Cima",0.3],["Oxígeno",0.42],["Recarga",0.68],["Fin",1.05]],
build(a){
  const L=a.L,T0=0.06,T1=0.78,TI=0.42,P0=V3(-4.25,1.72,0.34),P1=V3(-3.12,1.72,0.34),PY=0.82;
  const fpos=(te,o)=>{const k=cl((te-T0)/(T1-T0));return o.set(P0.x+(P1.x-P0.x)*k,P0.y+PY*4*k*(1-k),P0.z);};
  // pez payaso en billboard: cuerpo naranja, tres franjas blancas con borde negro, aletas y cola
  const fish=new THREE.Mesh(new THREE.PlaneGeometry(0.56,0.36),fx(`void main(){vec2 p=(vUv-.5)*vec2(2.,1.3);
   float wig=sin(uT*30.)*.05*smoothstep(-.1,-.9,p.x);p.y+=wig;
   float body=length(p*vec2(1.,1.65))-.62;
   vec2 tq=p-vec2(-.78,0.);float tail=max(abs(tq.y)-(.08+.42*(-tq.x+.12)),abs(tq.x)-.16);
   float fin=length((p-vec2(-.05,.32))*vec2(1.6,3.))-.35;
   float d=min(min(body,tail),fin);if(d>.02)discard;
   float band1=abs(p.x-.3)-.07,band2=abs(p.x+.12)-.09,band3=abs(p.x+.62)-.05;
   float bw=min(min(band1,band2),band3);
   vec3 c=mix(vec3(1.,.42,.06),uC1,.2);
   c=mix(c,vec3(1.),smoothstep(.01,-.01,bw)*step(body,.0));
   c=mix(c,vec3(.03),smoothstep(.025,.0,abs(bw))*step(body,0.)+smoothstep(.03,0.,abs(d))*.9);
   c=mix(c,vec3(.02),smoothstep(.06,.04,length(p-vec2(.45,.08))));
   float sh=.75+.35*smoothstep(-.4,.4,p.y);
   gl_FragColor=vec4(c*sh+vec3(1.)*smoothstep(.05,0.,length(p-vec2(.47,.11)))*.8,smoothstep(.02,-.01,d)*uA);}`,NB));
  // chapoteos de salida y entrada: aro de agua en billboard con corona de gotas
  const SPL_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float cr=band(r,.35+.5*uP+.08*noise(vec3(an*4.,uT*4.,1.)),.06+.04*(1.-uP));
   float sp=pow(noise(vec3(an*6.,1.,3.)),3.)*smoothstep(.3,.9,r)*smoothstep(1.,.7,r);
   gl_FragColor=vec4(mix(uC1,vec3(.85,.95,1.),.6)*1.4,(cr+sp*.8*(1.-uP))*uA);}`;
  const spl=[P0,P1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.75),fx(SPL_FS));L.mesh.add(m);return m;});
  L.mesh.add(fish);

  const C=`const float T0=${f(T0)};const float T1=${f(T1)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
  vec3 fp(float t){float k=clamp((t-T0)/(T1-T0),0.,1.);return vec3(P0.x+(P1.x-P0.x)*k,P0.y+${f(PY*4)}*k*(1.-k),P0.z);}`;
  // gotas del chapoteo al salir y al entrar
  a.count+=points(L.part,60,C+`void main(){bool b=aSeed.x>.5;float s=(b?T1-.02:T0)+aSeed.y*.04;float life=.32+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 o=b?P1:P0;vec3 v=normalize(rnd()+vec3(b?.4:-.4,.8,0.))*(1.2+1.2*aSeed.w);vec3 p=o+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.045+.035*aSeed.w);}`,WDROP_FS,NB);
  // estela de burbujitas tras el pez
  a.count+=points(L.trail,40,C+`void main(){float s=T0+aSeed.x*(T1-T0);float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=fp(s)+rnd()*.05+vec3(0.,.25*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.04*aSeed.w);}`,BUBBLE_FS);
  // burbujas de oxígeno: salen en la cima y caen flotando hasta el cuerpo del Axie
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.1;float k=clamp((uT-s)/(.3+.12*aSeed.y),0.,1.);
   vec3 o=fp(TI)+rnd()*vec3(.25,.08,.15);float an=aSeed.z*6.2832;vec3 e=vec3(-3.7+cos(an)*.3,.5+aSeed.w*1.2,sin(an)*.3);
   vec3 p=mix(o,e,k*k)+vec3(sin(k*9.+aSeed.w*6.)*.05,.12*sin(3.1416*k),0.);
   vA=(uT>s&&k<1.)?smoothstep(0.,.15,k):0.;put(p,.08+.06*aSeed.w);}`,BUBBLE_FS);
  // cada burbuja se funde con el Axie en un destello
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.1+.3+.12*aSeed.y;float life=.22;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.3,.5+aSeed.w*1.2,sin(an)*.3);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.14+.08*aSeed.w)*(.6+age));}`,STAR4_FS);
  // motas cálidas que suben del cuerpo (cura)
  a.count+=points(L.part,50,C+`void main(){float s=.68+aSeed.x*.35;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.38,.2+aSeed.w*1.3+t*.9,sin(an)*.38);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.03+.03*aSeed.w);}`);

  const fv=V3(0,0,0), fq=V3(0,0,0);
  a.pose=function(te,o){
    fpos(te,fv); fpos(te+0.01,fq).sub(fpos(te-0.01,tmp));
    towardCam(fish.position,fv,0.05); billboard(fish,Math.atan2(fq.y,fq.x)); fish.visible=te>=T0&&te<=T1;
    set(fish,0,ss(T0,T0+0.05,te)*(1-ss(T1-0.04,T1,te))); fish.scale.setScalar(0.85+0.15*ss(T0,T0+0.1,te));
    spl.forEach((m,i)=>{const t0=i?T1-0.03:T0-0.03,p=cl((te-t0)/0.3);towardCam(m.position,i?P1:P0,0.1);billboard(m);m.visible=te>=t0&&p<1;set(m,p,1-p);});
    const merge=ss(TI+0.28,TI+0.42,te)*(1-ss(0.95,1.28,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.55*merge+0.15*Math.sin(te*20)*merge;
    caster.scale.set(1+0.04*merge,1+0.04*merge,1+0.04*merge); caster.rotation.z=0.05*Math.sin(Math.PI*cl((te-T0)/(T1-T0)));
    if(te<TI+0.25){o.g.copy(fv);o.gs=0.8;o.ga=0.28;o.li=1.4;}
    else{o.g.set(-3.7,1.1,0);o.gs=1.4;o.ga=0.32*merge;o.li=2.5*merge;}
    o.ia=te-TI;o.c.copy(fpos(TI,tmp2));o.shake=0;o.dist=0.15;o.flash=0;
  };
}};

// =====================================================================
// 5 · TINY FAN (1 PA) — junto a la oreja aparece una hélice submarina que arranca a girar y dispara una corriente
//     de agua en espiral; el rival retrocede una casilla y una vuelta de corriente rodea los pies del Axie (+PM)
// =====================================================================
const tinyFan={key:"qoTinyFan",name:"Tiny Fan",pa:1,dur:1.25,ti:0.4,pal:"Rocío (Boca)",
  phases:[["Hélice",0],["Corriente",0.2],["Empuje",0.4],["Brisa",0.7],["Fin",1.0]],
build(a){
  const L=a.L,TS=0.2,TI=0.4,TE=0.82,FP=V3(-3.28,1.86,0.34),EX=3.1,LEN=EX-FP.x,SL=Math.atan2(1.25-FP.y,LEN);
  // hélice: disco con tres palas que giran (uS), desenfoque de giro y aro protector
  const fan=new THREE.Mesh(new THREE.CircleGeometry(0.2,40),fxU(`uniform float uS;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)-uS;float bl=0.;
   for(int i=0;i<3;i++){float b=mod(an+float(i)*2.0944-r*.5+3.1416,6.2832)-3.1416;float w=.62*sin(3.1416*clamp(r,0.,1.))+.05;bl=max(bl,smoothstep(w,w-.12,abs(b))*step(.16,r)*step(r,.9));}
   float hub=smoothstep(.2,.15,r);float ring=band(r,.95,.05);float blur=smoothstep(.92,.85,r)*uP*.35;
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*bl)*1.4+vec3(1.)*(hub*.4+ring*.3),(bl*(1.-uP*.6)+hub+ring+blur)*uA);}`,{uS:{value:0}}));
  L.mesh.add(fan);
  // corriente: cono abierto a lo largo de x con estrías helicoidales que fluyen; uP = frente
  const cur=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.12,LEN,28,1,true).translate(0,LEN/2,0).rotateZ(-Math.PI/2),fx(`void main(){float u=vUv.x,v=vUv.y;
   if(v>uP)discard;float s=noise(vec3(u*10.+v*14.,v*4.-uT*10.,uT));float st=smoothstep(.55,.85,s);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float head=smoothstep(.08,0.,uP-v);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.4+vec3(1.)*head*.4,(st*.7+fr*.25+head*.6)*smoothstep(0.,.08,v)*uA);}`));
  cur.position.copy(FP); cur.rotation.z=SL; L.trail.add(cur);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS));L.mesh.add(hitRing);

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 FP=${v3(FP)};const float LEN=${f(LEN)};const float SL=${f(SL)};`;
  // filamentos de agua en espiral que viajan hacia el rival
  a.count+=points(L.trail,130,C+`void main(){float s=TS+aSeed.x*.45;float t=max(uT-s,0.);float k=t*1.9;
   float an=aSeed.y*6.2832+k*14.;float rad=.05+.32*k;vec3 p=FP+vec3(k*LEN,k*LEN*tan(SL)+sin(an)*rad,cos(an)*rad);
   vA=(uT>s&&k<1.)?smoothstep(0.,.08,k)*(1.-k*.5):0.;put(p,.03+.03*aSeed.w);}`);
  // burbujas arrastradas por la corriente
  a.count+=points(L.part,40,C+`void main(){float s=TS+aSeed.x*.5;float t=max(uT-s,0.);float k=t*1.5;
   float an=aSeed.y*6.2832+k*8.;float rad=.08+.25*k;vec3 p=FP+vec3(k*LEN,k*LEN*tan(SL)+sin(an)*rad,cos(an)*rad);
   vA=(uT>s&&k<1.)?(1.-k):0.;put(p,.04+.04*aSeed.w);}`,BUBBLE_FS);
  // salpicadura en el pecho del rival
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.25;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.8,.4,0.))*(1.3+1.4*aSeed.z);vec3 p=${v3(TC)}+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,WDROP_FS,NB);
  a.count+=points(L.part,25,C+`void main(){float s=TI+aSeed.x*.2;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=${v3(TC)}+normalize(rnd()+vec3(.5,0.,0.))*.35*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,(.14+.1*aSeed.w)*(.6+age));}`,FOAM_FS,NB);
  // vuelta de corriente a los pies del lanzador
  a.count+=points(L.part,45,C+`void main(){float s=.45+aSeed.x*.3;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*12.;float rad=.5+.1*aSeed.w;vec3 p=vec3(-3.7+cos(an)*rad,.06+.12*age,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.025+.025*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, on=ss(0,0.12,te)*(1-ss(TE,1.05,te)), spin=ss(0,TS,te);
    fan.position.copy(FP); tmp.copy(camera.position).sub(FP).normalize().multiplyScalar(0.9).add(tmp2.set(1,0,0)).add(FP); fan.lookAt(tmp);
    fan.visible=on>0.001; fan.scale.setScalar(0.4+0.6*ss(0,0.12,te));
    // ángulo acumulado de una velocidad que crece: función pura del tiempo
    fan.material.uniforms.uS.value=te*6+Math.max(te-0.05,0)*Math.max(te-0.05,0)*60; set(fan,spin,on);
    set(cur,cl((te-TS)/(TI-TS))*1.01,ss(TS,TS+0.05,te)*(1-ss(0.65,0.95,te))*0.9);
    let p=cl(ia/0.3); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.8);
    // empuje de una casilla; vuelve suave al final del bucle
    target.position.x=3.4+0.85*ss(TI,TI+0.18,te)*(1-ss(1.0,1.25,te)); target.rotation.z=-0.12*hitK(ia,6)*Math.cos(Math.max(ia,0)*12);
    caster.rotation.z=-0.05*ss(TS,TI,te)*(1-ss(0.7,1,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*ss(0.45,0.6,te)*(1-ss(0.8,1.1,te));
    if(te<TI){o.g.copy(FP);o.gs=0.7;o.ga=0.25*on;o.li=1.4;}
    else{o.g.copy(TC);o.gs=1+1.4*Math.min(ia,0.3);o.ga=0.4*hitK(ia,9);o.li=3.5*hitK(ia,6);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 6 · LITTLE CRAB (2 PA) — bajo el rival se abre un charco; dos pinzas azul marino emergen, se cierran en tijera
//     sobre su pecho y la armadura salta en esquirlas entre burbujas afiladas
// =====================================================================
const crab={key:"qoLittleCrab",name:"Little Crab",pa:2,dur:2.2,ti:0.95,pal:"Loto",
  phases:[["Charco",0],["Pinzas",0.4],["Apertura",0.7],["Tijera",0.95],["Burbujas",1.1],["Hundimiento",1.55]],
build(a){
  const L=a.L,TP=0.4,TO=0.7,TI=0.95,TS=1.55,TE=1.95,X=3.4;
  // caparazón: azul marino moteado, húmedo y con borde de la paleta
  const CRAB_FS=`void main(){vec3 q=vP*9.;float n=noise(q)*.6+noise(q*2.7)*.4;float sp=smoothstep(.62,.7,noise(vP*22.));
   vec3 base=mix(vec3(.03,.07,.22),vec3(.14,.3,.6),n);base=mix(base,vec3(.85,.9,1.),sp*.3);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(base*${LIT}+vec3(1.)*${SPEC(30)}*.8+uC1*fr*(.2+.8*uA),1.);}`;
  const shell=fx(CRAB_FS,DS);
  const tube=(pp,r0,r1)=>new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pp.map(p=>V3(p[0],p[1],0))),24,10,r0,r1),shell);
  // pinza: brazo, palma, dedo fijo y dedo móvil (pivote); apunta hacia +y en su espacio local
  const mkClaw=()=>{const g=new THREE.Group(),mov=new THREE.Group();
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.1,0.75,14).translate(0,0.375,0),shell);
    const palm=new THREE.Mesh(new THREE.SphereGeometry(0.17,24,16),shell); palm.position.set(0,0.88,0); palm.scale.set(0.8,1.25,0.6);
    const fixd=tube([[0.05,1.0],[0.1,1.2],[0.06,1.38],[-0.04,1.5]],0.07,0.012);
    mov.position.set(-0.08,1.02,0); mov.add(tube([[0,0],[-0.06,0.2],[-0.02,0.36],[0.06,0.44]],0.06,0.012));
    g.add(arm,palm,fixd,mov); L.mesh.add(g); return {g,mov};};
  const CL=[mkClaw(),mkClaw()];
  const slashes=[0.75,-0.75].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,0.85),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));L.trail.add(m);return m;});

  const C=`const float TP=${f(TP)};const float TI=${f(TI)};const float X=${f(X)};const vec3 HC=${v3(TC)};`;
  // burbujas afiladas: aro con un filo en media luna que gira
  const SHARP_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float an=atan(q.y,q.x)+vMix*12.;
   float ring=smoothstep(.05,0.,abs(d-.36));float blade=smoothstep(.06,0.,abs(d-.4))*smoothstep(.2,1.,cos(an));
   float spk=smoothstep(.04,0.,abs(d-.44-.05*pow(abs(cos(an*2.)),8.)))*step(.9,abs(cos(an*2.)));
   float a=(ring*.7+blade*1.2+spk)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(uC1,vec3(1.),blade*.6)*1.5,a);}`;
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.25;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.35,.4))*(1.2+2.2*aSeed.z);vec3 p=HC+vec3(0.,0.,.4)+v*(1.-exp(-t*3.))/1.2+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.12+.1*aSeed.w)*(1.-age*.3));vMix=aSeed.w+t;}`,SHARP_FS);
  // esquirlas de armadura y chispas del corte
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.6,.5))*(2.+3.5*aSeed.z);vec3 p=HC+vec3(0.,0.,.3)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.06+.06*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,90,TI,`${f(TC.x)},${f(TC.y)},.45`,"-.3,.4,.5",2.5,7,2.5);
  a.count+=sparks(L.part,50,TI+0.06,`${f(TC.x)},${f(TC.y-0.1)},.45`,".3,.3,.5",2,5,2.5);
  // agua que brota con las pinzas y vuelve al hundirse
  a.count+=points(L.part,120,C+`void main(){float sd=aSeed.x<.5?-1.:1.;bool sink=aSeed.y>.65;float s=(sink?${f(TS)}:TP)+aSeed.z*.15;float life=.45+aSeed.w*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 o=vec3(X+sd*.75,.02,.55);vec3 v=normalize(rnd()*vec3(1.,.2,1.)+vec3(0.,1.5,0.))*(1.5+1.5*aSeed.w);vec3 p=o+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,WDROP_FS,NB);
  a.count+=points(L.part,60,C+`void main(){float sd=aSeed.x<.5?-1.:1.;float s=TP+aSeed.y*1.1;float life=.5+aSeed.z*.3;float age=(uT-s)/life;
   float an=aSeed.w*6.2832;vec3 p=vec3(X+sd*.75+cos(an)*.22,.04,.55+sin(an)*.22);
   vA=(age>0.&&age<1.&&s<${f(TE)})?sin(age*3.14159)*.8:0.;put(p,(.14+.1*aSeed.w)*(.6+age*.6));}`,FOAM_FS,NB);
  // charco centrado bajo el rival: cáusticas, ondas y anillo de espuma
  const pool=gp(3.6,X,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   vec3 q=vec3(p*7.,uT*.8);float c=pow(1.-abs(noise(q)*2.-1.),7.)+pow(1.-abs(noise(q*1.9+5.)*2.-1.),9.)*.6;
   float rip=.5+.5*sin(r*34.-uT*9.);float R=uP*.92;float in_=smoothstep(R,R-.05,r);
   float foam=band(r,R,.05)*(.6+.4*noise(vec3(p*20.,uT)));
   gl_FragColor=vec4(mix(uC2,uC1,c)*1.2+vec3(1.)*foam*.4,(in_*(.22+.45*c+.08*rip)+foam)*uA);}`),0.02);
  const rip=gp(4,X,0,fx(RIPPLE_FS),0.03);
  L.decal.add(pool,rip);

  a.pose=function(te,o){
    const ia=te-TI;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.2,te)*(1-ss(0.3,0.5,te));
    caster.rotation.z=0.06*ss(0,0.2,te)-0.1*ss(0.2,0.3,te)*(1-ss(0.5,0.8,te));
    set(pool,ss(0.05,TP,te)*(1-ss(TS+0.1,2.15,te)),ss(0.05,0.2,te)*(1-ss(TE,2.18,te)));
    set(rip,cl((te-TP)/0.8),te>=TP?1-cl((te-TP)/0.8):0);
    // emergen, se abren, cierran en tijera y se hunden
    const rise=1-Math.pow(1-ss(TP,TO,te),2), sink=ss(TS,TE,te), lean=ss(TO,TI,te)*(1-ss(TI+0.35,TS,te));
    const open=ss(TP+0.15,TO+0.1,te)*(1-ss(TI-0.08,TI,te))+0.45*ss(TI+0.15,TS,te), wob=ia>=0?0.06*Math.sin(ia*40)*Math.exp(-ia*6):0;
    CL.forEach((c,i)=>{const s=i?-1:1;c.g.visible=rise>0.001&&sink<0.999;
      c.g.position.set(X-s*0.85,-1.55*(1-rise)-1.55*sink,0.55);c.g.scale.set(s,1,1);
      c.g.rotation.z=-s*(0.25+0.48*lean+wob);c.mov.rotation.z=0.75*open;});
    shell.uniforms.uA.value=0.3+0.7*hitK(ia,4);
    slashes.forEach((m,i)=>{const t0=TI-0.04+i*0.05,s=(te-t0)/0.09;m.visible=s>=0&&te<TS;towardCam(m.position,TC,0.8);billboard(m,i?-0.75:0.75);
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.4,s>1?Math.exp(-(s-1)*1.3):1);m.material.uniforms.uQ.value=s>=1?Math.exp(-(te-t0-0.09)*2.5):0;});
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.16*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.2*Math.cos(ia*15);
    if(te<TP){o.g.set(X,0.3,0.3);o.gs=0.9*ss(0,TP,te);o.ga=0.25;o.li=1.5;}
    else if(te<TI){o.g.set(X,0.4+0.6*ss(TP,TI,te),0.55);o.gs=1.1;o.ga=0.3;o.li=2.2;}
    else{o.g.copy(TC);o.g.z=0.4;o.gs=1.5+2*Math.min(ia,0.35);o.ga=0.6*hitK(ia,9);o.li=6*hitK(ia,5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 7 · SEASLUG (3 PA) — una babosa marina translúcida trepa en espiral por el Axie y se funde en una capa de mucosa
//     brillante (limpia dos males); embestida cuerpo a cuerpo con estallido de baba, fractura de baldosas bajo el
//     rival y la capa queda reluciendo como protección
// =====================================================================
const seaslug={key:"qoSeaslug",name:"Seaslug",pa:3,dur:3.3,ti:1.35,pal:"Nabo",
  phases:[["Babosa",0],["Adhesión",0.55],["Limpieza",0.75],["Embestida",1.05],["Impacto",1.35],["Regreso",1.6],["Mucosa",2.0],["Fin",2.85]],
build(a){
  const L=a.L,TA=0.55,TCL=0.75,TD=1.05,TI=1.35,TR=1.6,TRE=2.0,TX=2.85,TE=3.25,HX=-3.7,LX=2.55,HP=V3(3.1,1.05,0);
  const cx=te=>te<TD?HX-0.12*ss(TA,TD,te):te<TI?HX-0.12+(LX-HX+0.12)*Math.pow((te-TD)/(TI-TD),2):LX-0.25*ss(TI,TI+0.12,te)-(LX-0.25-HX)*ss(TR,TRE,te);
  const bodyG=new THREE.Group(); L.mesh.add(bodyG);
  // babosa: tubo en hélice alrededor del cuerpo; solo se ve una ventana [uP−0.3, uP] que avanza (se arrastra)
  const hel=[];for(let i=0;i<=40;i++){const t=i/40,an=t*Math.PI*4.2;hel.push(V3(Math.cos(an)*0.5,0.06+1.5*t,Math.sin(an)*0.5));}
  const slug=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(hel),160,14,0.12,0.12),fxU(`uniform float uQ;
  void main(){float u=vUv.x;float w=(u-(uP-.3))/.3;if(w<0.||w>1.)discard;
   float body=sin(3.14159*pow(w,.8));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float cer=smoothstep(.6,.8,noise(vec3(u*90.,vUv.y*8.,1.)));
   float pulse=.5+.5*sin(u*80.-uT*12.);float sp=${SPEC(26)};
   vec3 c=mix(uC2,uC1,fr*.7+pulse*.2)*1.3+vec3(1.,.55,.2)*cer*.9+vec3(1.)*sp;
   gl_FragColor=vec4(c,(.25+.7*fr+cer*.6+sp)*body*uA*(1.-uQ));}`,{uQ:{value:0}}));
  // capa de mucosa: cilindro + casquete algo mayores que el cuerpo; se extiende de abajo arriba (uP) con brillo húmedo
  const MUC_FS=`void main(){float h=vP.y/1.95;if(h>uP)discard;
   vec3 n=normalize(vN),v=normalize(vV);float fr=pow(1.-abs(dot(n,v)),1.8);
   float fl=noise(vec3(vP.x*4.,vP.y*3.+uT*1.2,vP.z*4.));float sheen=band(fract(vP.y*1.6-uT*.6+fl*.5),.5,.12);
   float drip=smoothstep(.65,.8,noise(vec3(atan(vP.z,vP.x)*4.,vP.y*.8+uT*.9,3.)));
   float edge=smoothstep(.07,0.,uP-h)*step(uP,.99);float sp=pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.3,.7,.6)))),30.);
   gl_FragColor=vec4(mix(uC2,uC1,fr+sheen*.4)*1.3+vec3(1.)*(sp*1.3+edge*.6),((.1+.65*fr)*(.6+.5*fl)+sheen*.25+drip*.2+edge+sp)*uA);}`;
  const mucMat=fx(MUC_FS);
  const coatB=new THREE.Mesh(new THREE.CylinderGeometry(0.43,0.53,1.32,36,6,true).translate(0,0.66,0),mucMat);
  const coatH=new THREE.Mesh(new THREE.SphereGeometry(0.35,32,20).translate(0,1.6,0),mucMat);
  bodyG.add(slug,coatB,coatH);
  // estallido de baba: estrella gelatinosa en billboard con gotas
  const splat=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float lob=.35+.25*pow(abs(sin(an*3.5+1.)),3.)+.12*noise(vec3(an*3.,uT*2.,1.));float R=lob*(.4+.8*uP);
   float body=smoothstep(R,R-.05,r);float rim=band(r,R,.05);float hole=smoothstep(.0,.1,r-R*.35*uP);
   float n=noise(vec3(p*5.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,n*.6+rim)*1.4+vec3(1.)*rim*.4,(body*(.35+.4*n)*hole+rim)*uA);}`,{depthTest:false}));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),fx(RING_FS));
  L.mesh.add(splat,hitRing);

  const C=`const float TA=${f(TA)};const float TCL=${f(TCL)};const float TD=${f(TD)};const float TI=${f(TI)};const float TR=${f(TR)};const float TRE=${f(TRE)};const float TX=${f(TX)};
  const float HX=${f(HX)};const float LX=${f(LX)};const vec3 HP=${v3(HP)};
  float cx(float t){if(t<TD)return HX-.12*smoothstep(TA,TD,t);if(t<TI){float k=(t-TD)/(TI-TD);return HX-.12+(LX-HX+.12)*k*k;}
   return LX-.25*smoothstep(TI,TI+.12,t)-(LX-.25-HX)*smoothstep(TR,TRE,t);}
  vec3 hel(float t){float an=t*13.195;return vec3(cos(an)*.5,.06+1.5*t,sin(an)*.5);}`;
  // mucosa que gotea y brilla por la babosa mientras trepa
  a.count+=points(L.part,90,C+`void main(){float s=aSeed.x*TA;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=.3+.7*smoothstep(0.,TA,s);vec3 p=vec3(cx(s),0.,0.)+hel(k)*vec3(1.1,1.,1.1)+vec3(0.,-.9*t*t,0.)+rnd()*.03;
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.035+.04*aSeed.w);}`);
  // limpieza: dos bocanadas oscuras (males) exprimidas fuera de la capa que se deshacen en destellos
  a.count+=points(L.part,110,C+`void main(){float b=step(.5,aSeed.x);float s=TCL+b*.14+aSeed.y*.06;float life=.45+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 o=vec3(cx(s),.75+b*.6,0.);vec3 d=normalize(rnd()+vec3(b>.5?.4:-.4,.9,.5));vec3 p=o+d*(.3+.9*(1.-exp(-t*3.5)))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.85:0.;put(p,(.22+.18*aSeed.w)*(.6+age*.6));}`,SMOKE_FS("vec3(.1,.04,.12)"),NB);
  a.count+=points(L.part,60,C+`void main(){float b=step(.5,aSeed.x);float s=TCL+b*.14+.3+aSeed.y*.15;float life=.3;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(b>.5?.4:-.4,.9,.5));vec3 p=vec3(cx(s),.75+b*.6,0.)+d*(1.+.3*aSeed.z);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.08*aSeed.w));}`,STAR4_FS);
  // embestida: hilos de baba que se quedan atrás
  a.count+=points(L.trail,170,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.4+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(cx(s)+.2,.2+aSeed.z*1.6,(aSeed.w-.5)*.8)+vec3(-.5*t,-.8*t*t,0.)+rnd()*.05;
   vA=(age>0.&&age<1.&&p.y>0.)?(1.-age):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.4));}`);
  // impacto: gotas de mucosa (mezcla normal), destellos nacarados, chispas y bruma
  a.count+=points(L.part,220,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.55,0.))*(2.5+5.5*aSeed.z);vec3 p=HP+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.09+.1*aSeed.w)*(1.-age*.3));}`,`${HEAD}varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=smoothstep(.42,.32,d)*vA;if(a<.003)discard;
    float hl=smoothstep(.12,0.,length(q-vec2(-.1,-.1)));gl_FragColor=vec4(mix(uC2,uC1,.4+.6*(1.-d*2.))*1.1+vec3(1.)*hl*.7,a*.85);}`,NB);
  a.count+=sparks(L.part,260,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.5,.45,0.",4,12,3);
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.12;float life=.9+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.4,0.));vec3 p=HP+d*(.3+1.4*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.6:0.;put(p,(.4+.35*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.55,.45,.7)"),NB);
  // protección: burbujas nacaradas que suben pegadas a la capa
  a.count+=points(L.part,90,C+`void main(){float life=.8+aSeed.y*.5;float k=(uT-TRE)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;vec3 p=vec3(HX+cos(an)*.58,.1+age*1.9,sin(an)*.58);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.06*r.z);}`,BUBBLE_FS);
  // suelo: rastro de baba de la embestida, fractura bajo el rival (nivel 3), charco nacarado bajo el Axie
  const slime=groundPlane(LX-HX+0.4,(LX+HX)/2,0.016,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*20.,vUv.y*5.,1.));float m=smoothstep(.55+.25*n,.1,v)*step(u,uP);float sp=pow(noise(vec3(u*40.,vUv.y*10.,uT*.5)),4.);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.2+vec3(1.)*sp,m*(.3+.4*n+sp)*uA);}`),0.8);
  const FS=6.2, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  const shock=groundPlane(5,3.4,0.03,fx(RING_FS));
  const pool=gp(2.2,HX,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,uT*.6));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,(smoothstep(1.,.5,r)*(.2+.3*n)+band(r,.85+.05*sin(uT*3.),.04))*uA);}`),0.02);
  L.decal.add(slime,frac,shock,pool);

  a.pose=function(te,o){
    const ia=te-TI, x=cx(te);
    caster.position.x=x; bodyG.position.set(x,0,0);
    const dash=te>=TD&&te<TI?(te-TD)/(TI-TD):0;
    caster.rotation.z=0.12*ss(TA,TD,te)-0.32*ss(TD,TD+0.1,te)+0.2*ss(TI,TI+0.25,te)+0.08*dash;
    const sq=hitK(ia,8); caster.scale.set(1+0.12*sq,1-0.12*sq,1+0.12*sq);
    // babosa: trepa, se aplana y se funde en la capa
    const hk=0.3+0.7*ss(0,TA,te); slug.visible=te<TCL+0.1; set(slug,hk,ss(0,0.08,te)); slug.material.uniforms.uQ.value=ss(TA,TCL+0.1,te);
    const coat=ss(TA,TCL+0.15,te)*(1-ss(TX,TE,te)), lit=0.55+0.3*hitK(ia,4)+0.25*ss(TRE,TRE+0.2,te)*(0.6+0.4*Math.sin(te*6));
    coatB.visible=coatH.visible=coat>0.001; set(coatB,ss(TA,TCL+0.1,te)*1.02,coat*lit);
    U.uE.value=ss(TRE-0.1,TRE+0.2,te)*(1-ss(TX,TE,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*coat+0.5*hitK(te-TCL,5)*(te>=TCL?1:0);
    // impacto
    let p=cl(ia/0.45); towardCam(splat.position,HP,0.7); billboard(splat,0.3); splat.visible=ia>=0&&p<1; set(splat,p,Math.pow(1-p,1.3));
    p=cl(ia/0.4); towardCam(hitRing.position,HP,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(slime,cl((te-TD)/(TI-TD)),te>=TD?0.85*(1-ss(TRE,TX,te)):0);
    const hit=hitK(ia,3.2); target.position.x=3.4+hit*0.75*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.45*Math.cos(ia*12);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.1,TI+1.9,te):0);
    set(pool,0,ss(TA,TCL,te)*(1-ss(TD-0.1,TD,te))*0.7+U.uE.value*0.8); pool.position.x=te<TD?x:HX;
    if(te<TA){o.g.set(x+Math.cos(hk*13.195)*0.5,0.06+1.5*hk,Math.sin(hk*13.195)*0.5);o.gs=1.2;o.ga=0.35;o.li=2.5;}
    else if(te<TD){o.g.set(x,1.0,0);o.gs=1.8;o.ga=0.4+0.3*hitK(te-TCL,6)*(te>=TCL?1:0);o.li=3.5;}
    else if(te<TI){o.g.set(x+0.5,1.0,0);o.gs=2;o.ga=0.55;o.li=5;}
    else if(te<TRE){o.g.copy(HP);o.gs=2+6*Math.min(ia,0.5);o.ga=0.95*hitK(ia,8);o.li=14*hitK(ia,4.5);}
    else{o.g.set(HX,1.1,0);o.gs=2.2;o.ga=0.25*U.uE.value;o.li=2.8*U.uE.value;}
    o.ia=ia;o.c.copy(HP);o.shake=1.7;o.dist=1.3;
  };
}};

VFX.module("Acuático · Orejas",[bubblemaker,gill,inkling,nimo,tinyFan,crab,seaslug]);
})();

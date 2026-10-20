// =====================================================================
// MÓDULO · CLASE BICHO (CUERNOS)
// Estética de insecto: orugas bioluminiscentes, baba de caracol, insecto palo, parásito etéreo, pinzas de quitina
// metálica y arcos bioeléctricos. No se dibujan cuernos: los efectos "de la cabeza" nacen en la zona de las puntas
// (≈ x −3.54, y 2.05, z ±0.27) sin malla anatómica; las pinzas son proyecciones que aparecen y se disuelven.
// Todas las habilidades son de 1–2 PA (niveles 1 y 2): sin temblor ni fractura de suelo.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,v3,CHIP_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube}=VFX.lib;

const TC=V3(3.15,1.2,0);                   // pecho del objetivo
const TH=V3(3.25,1.62,0);                  // cabeza del objetivo
const HT=V3(-3.54,2.05,0);                 // zona de las puntas de los cuernos
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS={blending:THREE.NormalBlending,depthWrite:true};
// SDF 2D: segmento, unión suave y elipse aproximada
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}`;
// rejilla hexagonal (escudos de energía): 1 en el borde de cada celda
const HEX=`float hexEdge(vec2 g){vec2 r=vec2(1.,1.732);vec2 h=r*.5;vec2 a=mod(g,r)-h;vec2 b=mod(g-h,r)-h;vec2 c=dot(a,a)<dot(b,b)?a:b;
 c=abs(c);float d=max(dot(c,vec2(.5,.866)),c.x);return smoothstep(.4,.5,d);}`;
// rayo bioeléctrico: recta A→B con zigzag que se re-sortea 28 veces por segundo (sd = semilla del rayo)
const BOLT=`vec3 bolt(vec3 A,vec3 B,float s,float sd,float amp){vec3 d=B-A;vec3 up=abs(normalize(d).y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.);
 vec3 n1=normalize(cross(d,up));vec3 n2=normalize(cross(n1,d));float q=floor(uT*28.+sd*7.);float e=sin(3.14159*s);
 float j1=(noise(vec3(s*6.,sd*13.,q))-.5)*2.+(noise(vec3(s*17.,sd*5.,q+3.))-.5)*.9;
 float j2=(noise(vec3(s*6.,sd*13.+40.,q))-.5)*2.+(noise(vec3(s*19.,sd*9.,q+7.))-.5)*.9;
 return mix(A,B,s)+(n1*j1+n2*j2)*amp*e;}`;
// línea de rayo: N segmentos, el vértice se calcula con gl_VertexID; body fija vec3 p (y opcionalmente a) a partir de s∈[0,1]
function boltLine(parent,N,defs,body,seed){
  const g=new THREE.BufferGeometry(); g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(N*6),3));
  const m=new THREE.ShaderMaterial({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uA:{value:0},uS:{value:seed||0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:HEAD+BOLT+`uniform float uA;uniform float uS;varying float vA;`+defs+`
    void main(){float k=float(gl_VertexID);float s=(floor(k*.5)+mod(k,2.))/${f(N)};vec3 p=vec3(0.);float a=1.;${body}
     vA=a*uA;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:HEAD+`varying float vA;void main(){gl_FragColor=vec4(mix(uC1,vec3(1.),.55)*2.2,vA);}`});
  const l=new THREE.LineSegments(g,m); l.frustumCulled=false; parent.add(l); return m;
}
// hoja que gira (vMix = ángulo), mezcla normal
const LEAF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=max(.36*(1.-q.x*q.x*3.9),.001);float d=abs(q.y)*2./w;float a=smoothstep(1.,.7,d)*step(abs(q.x),.49)*vA;if(a<.003)discard;
 float rib=smoothstep(.04,0.,abs(q.y));
 gl_FragColor=vec4(mix(vec3(.2,.45,.12),uC1,.3+.3*q.x)*(1.1-d*.3)+vec3(.4)*rib*.3,a);}`;
// escama de quitina iridiscente (película fina: el tono cambia con el giro)
const IRI_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*12.),s=sin(vMix*12.);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 vec2 k=abs(q);float d=k.x*1.7+k.y;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 vec3 film=.5+.5*cos(6.2832*(vMix*2.+q.x*1.5+vec3(0.,.33,.67)));
 gl_FragColor=vec4(mix(film,uC1,.3)*1.3+vec3(1.)*smoothstep(.15,0.,d)*.4,a);}`;
// gota viscosa con brillo; col = color GLSL
const GOO_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.6),q.y+.04));
 float a=smoothstep(.34,.26,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,.02)));
 gl_FragColor=vec4(${col}*(.75+.4*vMix)*(1.2-d*1.3)+vec3(1.)*hl*.7,a);}`;

// =====================================================================
// 1 · CATERPILLARS — de las puntas caen larvas que eclosionan en un enjambre de orugas luminosas; reptan en
//     oleadas dejando un rastro de baba, trepan por la coraza hexagonal del rival y la perforan con ácido verde
//     nivel 2: firme y estándar — enjambre mediano, charco ácido suave (sin grietas)
// =====================================================================
const caterp={key:"icCaterpillars",name:"Caterpillars",pa:2,dur:2.2,ti:0.95,pal:"Ácido",
  phases:[["Eclosión",0],["Enjambre",0.28],["Asalto",0.82],["Corrosión",0.95],["Disipación",1.75]],
build(a){
  const L=a.L,TS=0.28,TA=0.82,TI=0.95,TE=1.75,X0=-3.0,X1=2.72,SC=V3(3.4,1.0,0),SR=0.9;
  const crawl=te=>{const k=cl((te-TS)/(TA-TS));return X0+(X1-X0)*(k*k*(3-2*k)*0.35+k*0.65);};
  const C=`const float TS=${f(TS)};const float TA=${f(TA)};const float TI=${f(TI)};const float TE=${f(TE)};const float X0=${f(X0)};const float X1=${f(X1)};const vec3 SC=${v3(SC)};const float SR=${f(SR)};`;
  // coraza del rival: celdas hexagonales que el ácido perfora desde el lado del enjambre (uP = corrosión)
  const shell=new THREE.Mesh(new THREE.SphereGeometry(SR,48,32),fx(HEX+`
  void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float hx=hexEdge(vec2(vUv.x*20.,vUv.y*10.));
   float n=noise(vP*4.2)*.6+noise(vP*9.+3.)*.4;float th=uP*(1.15-q.x*.3);
   if(n<th)discard;float acid=smoothstep(.13,0.,n-th)*step(.001,uP);
   vec3 c=vec3(.72,.9,1.)*(fr*.8+hx*.6)+mix(uC1,vec3(1.),.25)*acid*2.2;
   gl_FragColor=vec4(c,((.05+.5*fr)*.8+hx*.3+acid*1.2)*uA);}`));
  shell.position.copy(SC); shell.scale.set(1,1.22,1); L.mesh.add(shell);
  // orugas: 14 cadenas de 8 segmentos (id por gl_VertexID); reptan con joroba de gusano medidor y trepan por la coraza
  const CAT_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
   float spot=smoothstep(.17,.02,length(q-vec2(0.,-.1)));float hl=smoothstep(.12,0.,length(q-vec2(-.13,-.16)));
   vec3 c=mix(uC2*.22,uC2*.85,smoothstep(.5,0.,d))+uC1*spot*(1.1+vMix*.9)+vec3(1.)*hl*.45;
   gl_FragColor=vec4(c,a);}`;
  a.count+=points(L.part,112,C+`void main(){float vid=float(gl_VertexID);float id=floor(vid/8.);float sg=vid-id*8.;
   vec3 h=vec3(hash(vec3(id,1.7,2.3)),hash(vec3(id*1.3,5.1,3.7)),hash(vec3(id*.7,9.2,7.4)));
   float dl=h.x*.16;float t=uT-sg*.012;
   float k=clamp((t-TS-dl)/(TA-TS),0.,1.);float ke=k*k*(3.-2.*k)*.35+k*.65;
   float x=mix(X0,X1,ke)-sg*.055;float lane=(h.y-.5)*1.5*(1.-ke*.6);
   float hump=max(0.,sin(t*15.+h.z*6.-sg*.85));
   vec3 p=vec3(x,.06+.07*hump*hump*step(.001,k)*step(k,.999),lane+sin(x*2.6+h.z*6.)*.1);
   float c=clamp((t-TA-dl*.4)/.22,0.,1.);float ce=c*c*(3.-2.*c);
   float ang=3.14159+(h.y-.5)*2.6+sin(uT*9.+sg*.9+h.z*6.)*.05*ce;float el=-.4+(.3+1.*h.z)*ce-sg*.075;
   vec3 sp=SC+vec3(cos(el)*cos(ang)*SR*1.05,sin(el)*SR*1.26,cos(el)*sin(ang)*SR*1.05);
   p=mix(p,sp,ce);
   float born=smoothstep(0.,.1,uT-.18-dl*.5);float die=1.-smoothstep(TE-.25,TE,uT-h.x*.15);
   vA=born*die;put(p,(sg<.5?.14:.12-.006*sg)*born);vMix=sg<.5?1.:0.;}`,CAT_FS,NB);
  // larvas que caen desde las puntas y eclosionan en el suelo
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.2;float age=(uT-s)/.22;float k=clamp(age,0.,1.);
   vec3 A=vec3(-3.54,2.05,aSeed.y>.5?.27:-.27);vec3 B=vec3(X0+(aSeed.z-.5)*.4,.06,(aSeed.w-.5)*1.4);
   vec3 p=mix(A,B,k)+vec3(0.,.35*sin(3.14159*k),0.);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.06+.03*aSeed.z);}`);
  // ácido que gotea por la coraza (bucle mientras corroe)
  a.count+=points(L.part,110,C+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float ang=3.14159+(r.x-.5)*2.8;float el=-.2+r.y*1.1;
   vec3 p=SC+vec3(cos(el)*cos(ang)*.95,sin(el)*1.15,cos(el)*sin(ang)*.95)+vec3(0.,-2.2*age*age*life,0.);p.y=max(p.y,.03);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.06+.04*r.z);}`,GOO_FS("uC1"),NB);
  // siseo: humo ácido que sube de los agujeros
  a.count+=points(L.part,45,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=SC+vec3(-.7+r.x*.5,(r.y-.4)*1.2+age*.7,(r.z-.5)*1.2);
   vA=(k>=1.)?sin(age*3.14159)*.5*uE:0.;put(p,(.22+.2*r.z)*(.6+age));}`,SMOKE_FS("vec3(.3,.42,.16)"),NB);
  // burbujas del charco ácido
  a.count+=points(L.part,30,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=sqrt(r.y)*.9;vec3 p=vec3(3.4+cos(an)*rd,.04+age*.08,sin(an)*rd);
   vA=(k>=1.)?(1.-age)*uE:0.;put(p,(.05+.07*r.z)*(.4+age));}`,BUBBLE_FS);
  a.count+=sparks(L.part,90,TI,"2.6,1.,0.","-.6,.5,0.",2,6,3);

  // rastro de baba de las orugas: carriles que se revelan con el frente del enjambre
  const trail=groundPlane(X1-X0+0.6,(X0+X1)/2,0.016,fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   float m=0.;for(int i=0;i<5;i++){float fi=float(i);float c=(fi-2.)*.27*(1.-u*.55)+sin(u*14.+fi*2.1)*.06;m=max(m,smoothstep(.09,0.,abs(v-c)));}
   float n=noise(vec3(u*30.,v*6.,uT*.5));float gl=smoothstep(.65,.9,n)*m;
   float rev=smoothstep(uP+.01,uP-.03,u);
   gl_FragColor=vec4(mix(uC2,uC1,.4+gl)*1.2,(m*.4+gl*.6)*rev*uA);}`),1.8);
  // charco ácido burbujeante bajo el rival
  const pud=groundPlane(2.3,3.4,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,uT*.3))*.6+noise(vec3(p*15.,2.))*.4;
   float m=smoothstep(.95,.6,r/max(uP,.01)+(n-.5)*.4);
   vec2 g=p*14.;vec2 id=floor(g);vec2 fp=fract(g)-.5;float h=hash(vec3(id,3.));float ph=fract(uT*.8+h);
   float bub=smoothstep(.06,0.,abs(length(fp)-.3*ph))*step(.7,h)*(1.-ph);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,(m*(.3+.3*n)+bub*m*1.2)*uA);}`));
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(trail,pud,shock);

  a.pose=function(te,o){
    const ia=te-TI, front=crawl(te), cor=ia>0?0.8*ss(0,TE-TI,ia):0, env=ia>0?1-ss(TE-0.25,TE+0.1,te):0;
    // inclina la cabeza: las larvas caen de las puntas
    caster.rotation.z=-0.1*ss(0,0.12,te)+0.1*ss(0.18,0.4,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.1,te)*(1-ss(0.2,0.45,te));
    shell.visible=te<TE+0.15; set(shell,cor,(0.35+0.45*ss(TA-0.1,TI,te))*ss(0,0.3,te)*(1-ss(TE-0.2,TE+0.1,te)));
    set(trail,(front-X0+0.3)/(X1-X0+0.6),0.8*ss(TS,TS+0.1,te)*(1-ss(1.4,2.05,te)));
    set(pud,ia>0?0.4+0.6*ss(0,0.35,ia):0,ia>0?ss(0,0.2,ia)*(1-ss(1.6,2.15,te)):0);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.6*(1-p):0);
    U.uE.value=env;
    // el rival se estremece mientras el ácido le come el escudo
    const hit=hitK(ia,6); target.position.x=3.4+hit*0.14+(ia>0?0.012*Math.sin(te*70)*env:0); target.rotation.z=-hit*0.16*Math.cos(ia*14);
    o.em=0.28*env*(0.7+0.3*Math.sin(te*11)); o.emc.copy(U.uC1.value);
    if(te<TS){o.g.copy(HT);o.gs=0.7;o.ga=0.25*ss(0,0.1,te);o.li=1.5;}
    else if(te<TI){o.g.set(front,0.3,0);o.gs=1.2;o.ga=0.3;o.li=2.6;}
    else{o.g.set(2.7,1.0,0);o.gs=1.2+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.5+0.1*env;o.li=5*Math.exp(-ia*5)+1.3*env;}
    o.ia=ia;o.c.set(2.75,1.0,0);o.shake=0;o.dist=0.5;
  };
}};

// =====================================================================
// 2 · LAGGING — una concha de caracol (espiral logarítmica) se enrolla en las puntas y escupe un rayo de baba azul
//     viscosa; el rival queda envuelto en gelatina espesa que gotea hasta un charco y lo ralentiza
//     nivel 2: rayo medio, sin cráter; el charco es la única marca
// =====================================================================
const lagging={key:"icLagging",name:"Lagging",pa:2,dur:2.3,ti:0.68,pal:"Loto",
  phases:[["Espiral",0],["Rayo",0.38],["Impacto",0.68],["Baba",0.85],["Fin",1.95]],
build(a){
  const L=a.L,TL=0.38,TI=0.68,TD=1.35,TE=2.0,A=V3(-3.38,2.1,0),B=V3(3.0,1.22,0),GC=V3(3.4,0.95,0);
  const BL=A.distanceTo(B), BA=Math.atan2(B.y-A.y,B.x-A.x);
  const head=te=>{const k=cl((te-TL)/(TI-TL));return 1-(1-k)*(1-k);};
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 A=${v3(A)};const vec3 B=${v3(B)};const vec3 GC=${v3(GC)};
  float hu(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return 1.-(1.-k)*(1.-k);}`;
  // concha: espiral logarítmica que se enrolla (uP = giro acumulado)
  const shellG=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ph=fract(log(max(r,.001))*.9-(an+uP)/6.2832);
   float fill=smoothstep(.92,.84,r)*smoothstep(.02,.08,r);float line=band(ph,.5,.07)*fill;
   float n=noise(vec3(p*4.,uT));
   gl_FragColor=vec4(mix(uC2,uC1,ph*.7+n*.3)*1.3+vec3(1.)*line*.4,(fill*(.15+.3*ph)+line+band(r,.88,.04))*uA);}`,{depthTest:false}));
  L.mesh.add(shellG);
  // rayo viscoso: tubo con bultos que viajan (VS) y franja helicoidal; uP = frente, uQ = se descuelga tras el golpe
  const GOO_VS=HEAD+`uniform float uP;uniform float uQ;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
  void main(){vUv=uv;vec3 p=position;float u=p.x;
   float w=1.+.3*sin(u*26.-uT*16.)+.35*(noise(vec3(u*9.-uT*5.,0.,0.))-.5);w*=mix(.65,1.25,smoothstep(uP-.3,uP,u));
   p.yz*=w;p.y-=uQ*(sin(3.14159*u)*.6+.06*sin(u*30.+uT*6.));
   vP=position;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,1,18,60,true).rotateZ(-Math.PI/2).translate(0.5,0,0),fxU(`
  void main(){float u=vP.x;if(u>uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);float n=noise(vec3(u*14.-uT*9.,vUv.y*6.,uT));
   float sp=band(fract(vUv.y*2.+u*16.-uT*5.),.5,.12);
   vec3 c=mix(uC2*.7,uC1,fr*.7+n*.3)+vec3(1.)*pow(fr,3.)*.4+uC1*sp*.35;
   gl_FragColor=vec4(c*1.3,(.35+.55*fr+sp*.15)*uA*smoothstep(0.,.03,u));}`,{uQ:{value:0}},{vertexShader:GOO_VS}));
  beam.position.copy(A); beam.rotation.z=BA; beam.scale.set(BL,1,1);
  // cabeza del rayo: gota gruesa
  const blob=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float n=noise(vP*4.+vec3(uT*3.));gl_FragColor=vec4(mix(uC2,uC1,fr+n*.3)*1.3+vec3(1.)*smoothstep(.6,.9,n)*.3,(.4+.6*fr)*uA);}`));
  L.trail.add(beam); L.mesh.add(blob);
  // gelatina que envuelve al rival: avanza desde el lado del impacto (uP), tiembla (uQ) y escurre desde arriba (uR)
  const GEL_VS=HEAD+`uniform float uQ;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
  void main(){vUv=uv;vec3 p=position;p+=normal*(noise(position*2.5+vec3(0.,uT*1.5,0.))-.5)*.2*uQ;p.xz*=1.+.12*smoothstep(.0,-1.,position.y);
   vP=position;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  const gelFS=`uniform float uR;void main(){vec3 q=normalize(vP);float cov=dot(q,normalize(vec3(-1.,.25,.1)))*.5+.5;
   float n=noise(vP*3.+vec3(0.,-uT*.8,0.));float th=1.-uP*1.05+n*.08;
   if(cov<th)discard;if(q.y>1.-uR*2.2+n*.15)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float edge=smoothstep(.08,0.,cov-th)*step(uP,.99);
   vec3 c=mix(uC2*.5,uC1,fr*.8)+vec3(1.)*smoothstep(.72,.95,noise(vP*7.+uT))*.25+uC1*edge;`;
  const gel=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fxU(gelFS+`gl_FragColor=vec4(c,(.3+.45*fr+edge*.5)*uA);}`,{uQ:{value:1},uR:{value:0}},Object.assign({vertexShader:GEL_VS},NB)));
  const gelGlow=new THREE.Mesh(new THREE.SphereGeometry(1.04,40,28),fxU(gelFS+`gl_FragColor=vec4(c*1.2,pow(fr,2.)*.6*uA+edge*uA);}`,{uQ:{value:1},uR:{value:0}},{vertexShader:GEL_VS}));
  for(const m of [gel,gelGlow]){m.position.copy(GC);m.scale.set(0.62,0.98,0.62);} gelGlow.renderOrder=1; L.mesh.add(gel,gelGlow);

  // goterones que caen del rayo durante el vuelo
  a.count+=points(L.part,90,C+`void main(){float s=TL+aSeed.x*(TI-TL+.25);float t=uT-s;float life=.7;float age=t/life;
   vec3 p=mix(A,B,aSeed.y*hu(s))+rnd()*vec3(.05,.03,.05)+vec3(0.,-4.5*max(t,0.)*max(t,0.),0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;put(p,.07+.05*aSeed.z);}`,GOO_FS("mix(uC2,uC1,.6)"),NB);
  // salpicadura de baba al impactar
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=(uT-s)/(.6+aSeed.y*.4);
   vec3 v=normalize(rnd()+vec3(-.8,.6,0.))*(1.2+2.*aSeed.z);vec3 p=B+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.08+.07*aSeed.w)*(1.-age*.4));}`,GOO_FS("mix(uC2,uC1,.6)"),NB);
  // hilos espesos que escurren por la gelatina
  a.count+=points(L.part,90,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=GC+vec3(cos(an)*.6,.3+r.y*.8-age*age*1.2,sin(an)*.6);p.y=max(p.y,.03);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.06+.04*r.z);}`,GOO_FS("mix(uC2,uC1,.5)"),NB);
  // burbujas atrapadas que suben por la gelatina y revientan
  a.count+=points(L.part,40,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=.25+.35*r.y;vec3 p=GC+vec3(cos(an)*rd,-.6+age*1.4,sin(an)*rd);
   vA=(k>=1.)?(1.-age)*uE:0.;put(p,.05+.07*r.z*age);}`,BUBBLE_FS);
  a.count+=sparks(L.part,50,TI,`${f(B.x)},${f(B.y)},0.`,"-.6,.4,0.",2,5,3);

  // charco de baba azul bajo el rival (frena sus pasos)
  const pud=groundPlane(2.6,3.4,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,uT*.2))*.6+noise(vec3(p*13.,1.))*.4;
   float m=smoothstep(1.,.75,r/max(uP,.01)+(n-.5)*.35);
   float gloss=smoothstep(.62,.8,noise(vec3(p*9.+vec2(uT*.1,0.),4.)))*m;
   vec2 g=p*12.;vec2 id=floor(g);vec2 fp=fract(g)-.5;float h=hash(vec3(id,7.));float ph=fract(uT*.6+h);
   float bub=smoothstep(.06,0.,abs(length(fp)-.32*ph))*step(.75,h)*(1.-ph)*m;
   gl_FragColor=vec4(mix(uC2,uC1,n*.6+gloss)*1.2,(m*(.35+.25*n)+gloss*.5+bub)*uA);}`));
  const shock=groundPlane(3.0,3.4,0.03,fx(RING_FS));
  L.decal.add(pud,shock);

  const hp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, hu=head(te), env=ia>0?1-ss(TE-0.2,TE+0.25,te):0, form=ss(0,TL,te);
    caster.rotation.z=0.1*ss(0,TL,te)-0.2*ss(TL,TL+0.08,te)+0.1*ss(TL+0.1,TI+0.3,te);
    // concha: crece y se enrolla cada vez más rápido, luego se desenrolla en el rayo
    towardCam(shellG.position,tmp.set(-3.32,2.3,0),0.3); billboard(shellG);
    shellG.visible=te<TL+0.25; shellG.scale.setScalar(Math.max(form*(1-0.6*ss(TL,TL+0.2,te)),0.001)); set(shellG,te*6+te*te*26,form*(1-ss(TL,TL+0.2,te)));
    beam.visible=te>=TL&&ia<0.55; beam.material.uniforms.uQ.value=ss(TI,TI+0.4,te); set(beam,hu,ia>0?1-ss(0.2,0.55,ia):1);
    hp.copy(A).lerp(B,hu); blob.visible=te>=TL&&te<TI; blob.position.copy(hp); blob.scale.setScalar(0.2*(1+0.15*Math.sin(te*40))); blob.material.uniforms.uA.value=1;
    const cov=ia>0?ss(0,0.28,ia):0, dr=ss(TD,TE,te);
    for(const m of [gel,gelGlow]){m.visible=ia>0&&dr<0.995; m.material.uniforms.uP.value=cov; m.material.uniforms.uR.value=dr;
      m.material.uniforms.uQ.value=1+1.2*hitK(ia,4); m.material.uniforms.uA.value=0.9*env;}
    set(pud,ia>0?0.35+0.65*ss(0.1,1.3,ia):0,ia>0?ss(0,0.25,ia)*(1-ss(TE,TE+0.3,te)):0);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.55*(1-p):0);
    U.uE.value=env;
    // el rival queda pesado: se hunde un poco, oscila despacio
    const hit=hitK(ia,6), slow=ia>0?env:0;
    target.position.x=3.4+hit*0.18; target.rotation.z=-hit*0.2*Math.cos(ia*12)+0.05*slow*Math.sin(te*2.6);
    target.scale.set(1+0.05*slow,1-0.08*slow,1+0.05*slow);
    o.em=0.25*slow; o.emc.copy(U.uC2.value);
    if(te<TL){o.g.set(-3.32,2.3,0);o.gs=0.9*form;o.ga=0.35*form;o.li=2*form;}
    else if(te<TI){o.g.copy(hp);o.gs=1.1;o.ga=0.45;o.li=3.5;}
    else{o.g.copy(B);o.gs=1.2+2.2*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.55+0.08*env;o.li=6*Math.exp(-ia*5)+1.2*env;}
    o.ia=ia;o.c.copy(B);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 3 · LEAF BUG — entre hojas se forma un insecto palo de energía verde; salta sobre la espalda del Axie y se funde
//     en un camuflaje de hojas; hebras de seda dorada y dos placas de quitina (2 cargas de Capullo) sellan el escudo
//     nivel 2: firme — escudo medio, sello de suelo suave
// =====================================================================
const leafBug={key:"icLeafBug",name:"Leaf Bug",pa:2,dur:2.3,ti:0.8,pal:"Musgo",
  phases:[["Brote",0],["Salto",0.25],["Aterrizaje",0.8],["Capullo",1.0],["Camuflaje",1.55],["Fin",2.0]],
build(a){
  const L=a.L,TJ=0.25,TI=0.8,TE=2.0,CX=-3.7,SP=V3(-2.3,0.14,0.35),BK=V3(-3.86,1.42,0.02),JH=1.05,PL=[1.08,1.3];
  const bugAt=(te,out)=>{if(te<TJ)return out.copy(SP);if(te>=TI)return out.copy(BK).add(tmp2.set(0,0.015*Math.sin(te*9),0));
    const k=(te-TJ)/(TI-TJ);return out.set(SP.x+(BK.x-SP.x)*k,SP.y+(BK.y-SP.y)*k+4*JH*k*(1-k),SP.z+(BK.z-SP.z)*k);};
  // insecto palo de perfil (SDF): abdomen largo, tórax, cabeza, antenas y tres pares de patas; uQ = patas recogidas (salto)
  const bug=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.65),fxU(SDF2+`uniform float uQ;
  float sdBug(vec2 p,float tk){
   float d=sdSeg(p,vec2(-.88,.03),vec2(.05,0.))-(.02+.02*smoothstep(-.88,0.,p.x));
   d=smin(d,sdSeg(p,vec2(.05,0.),vec2(.44,.02))-.04,.03);d=min(d,length(p-vec2(.5,.035))-.048);
   d=min(d,sdSeg(p,vec2(.53,.05),vec2(.98,.24))-.007);d=min(d,sdSeg(p,vec2(.53,.04),vec2(.95,.13))-.007);
   for(int i=0;i<3;i++){float fi=float(i);float hx=.1+fi*.16;
    vec2 kn=vec2(hx+mix(.04+fi*.06,-.12,tk),mix(.2,.07,tk));vec2 ft=vec2(hx+mix(-.1+fi*.2,-.36-fi*.05,tk),mix(-.3,-.05,tk));
    d=min(d,sdSeg(p,vec2(hx,0.),kn)-.012);d=min(d,sdSeg(p,kn,ft)-.009);}
   return d;}
  void main(){vec2 p=(vUv-.5)*vec2(2.,1.);float d=sdBug(p,uQ);
   float n=noise(vec3(p*vec2(30.,8.),1.));float body=smoothstep(.012,-.004,d);
   float dn=noise(vec3(p*7.,uT*.5));if(dn<uP)discard;float burn=smoothstep(.12,0.,dn-uP)*step(.001,uP);
   float rim=band(d,0.,.012);float halo=smoothstep(.07,0.,d)*.25;float node=step(.9,fract(p.x*7.))*body;
   vec3 tw=mix(vec3(.2,.32,.1),vec3(.5,.66,.26),n)*(1.-node*.4);
   gl_FragColor=vec4(tw*body+uC1*(rim*1.4+halo+burn*2.),min(body+halo+rim+burn,1.)*uA);}`,{uQ:{value:0}},Object.assign({depthTest:false},NB)));
  L.mesh.add(bug);
  // camuflaje: manto de hojas translúcido que se extiende desde la espalda (uP) con un barrido de brillo
  const camo=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);
   float sp=distance(q,normalize(vec3(-1.,.35,0.)));float n=noise(vP*4.);float fr0=uP*2.2+(n-.5)*.3;if(sp>fr0)discard;
   float edge=smoothstep(.15,0.,fr0-sp)*step(uP,.99);
   vec3 g=vP*5.;float leaf=smoothstep(.45,.55,noise(g+vec3(uT*.2,0.,0.)))+smoothstep(.55,.62,noise(g*2.3+5.))*.6;
   vec3 cam=mix(mix(vec3(.12,.3,.1),vec3(.35,.6,.2),min(leaf,1.)),uC1,.15);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float sh=band(fract(vP.y*2.5-uT*.6),.5,.04);
   gl_FragColor=vec4(cam*(.6+.6*fr)+uC1*(edge*1.5+fr*.4+sh*.3),(.16+.45*fr+edge*.8+leaf*.1+sh*.15)*uA);}`,NB));
  camo.position.set(CX,0.95,0); camo.scale.set(0.58,0.98,0.58); L.mesh.add(camo);
  // seda dorada: dos cintas en hélice que se tejen alrededor del cuerpo (uP = avance)
  const SILK=`void main(){float u=vUv.x;if(u>uP)discard;float v=abs(vUv.y-.5)*2.;
   float fib=.6+.4*sin(vUv.y*30.+u*80.);float hd=smoothstep(.06,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(vec3(1.,.82,.4),uC1,.2)*1.4+vec3(1.)*hd,(smoothstep(1.,.2,v)*fib*.8+hd)*uA);}`;
  const silk=[0,Math.PI].map(r=>{const m=new THREE.Mesh(VFX.helixGeo(3.2,0.62,0.5,1.75,0.035,160),fx(SILK));m.position.set(CX,0.05,0);m.rotation.y=r;L.trail.add(m);return m;});
  // dos placas de quitina luminiscente (cargas de Capullo): segmentos de cáscara con estrías e iridiscencia
  const PLATE=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);vec2 uv=vUv;
   float ed=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float rim=smoothstep(.08,0.,ed);
   float rid=band(fract(uv.y*4.+.5*sin(uv.x*6.)),.5,.06);vec3 film=.5+.5*cos(6.2832*(fr+uv.x*.5+vec3(0.,.33,.67)));
   vec3 c=mix(uC2*.6,uC1,.3+.5*fr)+film*.25*fr+vec3(1.)*(rim*.5+uP)+uC1*rid*.35;
   gl_FragColor=vec4(c*1.2,(.28+.4*fr+rim*.8+rid*.2+uP*.5)*uA);}`;
  const plates=[[Math.PI/2+0.45,1.15],[Math.PI/2-0.4,1.95]].map(([ph,th])=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.66,20,12,ph-0.6,1.2,th-0.38,0.76),fx(PLATE));m.position.set(CX,0.95,0);L.mesh.add(m);return m;});

  const C=`const float TJ=${f(TJ)};const float TI=${f(TI)};const vec3 SP=${v3(SP)};const vec3 BK=${v3(BK)};
  vec3 jp(float t){float k=clamp((t-TJ)/(TI-TJ),0.,1.);return mix(SP,BK,k)+vec3(0.,${f(4*JH)}*k*(1.-k),0.);}`;
  // hojas que remolinean y forman el insecto
  a.count+=points(L.part,40,C+`void main(){float life=.22+aSeed.y*.08;float age=(uT-aSeed.x*.06)/life;float k=age*age;
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 tg=normalize(cross(d,vec3(0.,1.,0.)));
   vec3 p=SP+(d*cos(k*3.)+tg*sin(k*3.))*mix(1.1,.05,k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.16+.06*aSeed.z);vMix=aSeed.w+age*1.5;}`,LEAF_FS,NB);
  // rastro de motas verdes durante el salto
  a.count+=points(L.part,50,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float t=max(uT-s,0.);float age=(uT-s)/(.35+aSeed.y*.2);
   vec3 p=jp(s)+rnd()*.1+vec3(.2*t,-.3*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.04*aSeed.z)*(1.-age*.5));}`);
  // ráfaga de hojas al aterrizar en la espalda
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.06;float t=max(uT-s,0.);float age=(uT-s)/(.8+aSeed.y*.4);
   vec3 d=normalize(rnd()+vec3(-.3,.8,0.));vec3 p=BK+d*(.3+1.*aSeed.z)*(1.-exp(-t*4.))+vec3(sin(t*4.+aSeed.w*6.)*.12,-.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.15+.06*aSeed.w);vMix=aSeed.w+t*(.4+aSeed.z);}`,LEAF_FS,NB);
  // motas de seda que suben en espiral mientras se teje el capullo
  a.count+=points(L.part,80,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*5.;float rd=.62-.12*age;vec3 p=vec3(${f(CX)}+cos(an)*rd,.05+age*1.75,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.03+.03*r.z);vMix=.2;}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(vec3(1.,.85,.45),uC1,.25)*1.6,a);}`);
  // destellos al encajar cada placa
  a.count+=points(L.part,16,C+`void main(){float i=step(.5,aSeed.x);float s=i<.5?${f(PL[0])}:${f(PL[1])};float t=uT-s;float age=t/(.35+aSeed.y*.15);
   vec3 c=i<.5?vec3(-3.4,1.4,.4):vec3(-3.55,.55,.45);vec3 p=c+rnd()*.28;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.14+.12*aSeed.z)*(1.-age*.5));}`,STAR4_FS);
  a.count+=sparks(L.part,50,TI,`${f(BK.x)},${f(BK.y)},0.`,"0.,.7,0.",1.5,4,2);

  // sello de hojas y anillos bajo el Axie
  const sigil=groundPlane(2.2,CX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.02)+band(r,.78,.012);
   float lf=fract(an/6.2832*8.+uT*.05);float lr=(r-.35)/.4;float w=.18*sin(3.14159*clamp(lr,0.,1.));
   m+=smoothstep(.02,0.,abs(lf-.5)-w)*step(0.,lr)*step(lr,1.)*.6;m*=step(r,uP*1.02);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.5)*1.3,m*uA);}`));
  const shock=groundPlane(2.6,CX,0.03,fx(RING_FS));
  L.decal.add(sigil,shock);

  const bp=V3(0,0,0), bv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TJ,te), env=ia>0?1-ss(TE,TE+0.28,te):0;
    bugAt(te,bp); bugAt(te+0.01,bv); bv.sub(bugAt(te-0.01,tmp));
    const ang=te>TJ&&te<TI?-Math.atan2(bv.y,-bv.x):0;
    towardCam(bug.position,bp,0.2); billboard(bug,ang); bug.scale.set(-0.85,0.85,1);
    bug.visible=te<1.4; bug.material.uniforms.uQ.value=te>TJ-0.05&&te<TI?1:0.15*(te>=TI?1:0);
    set(bug,ia>0?ss(0.15,0.55,ia):0,form);
    // el Axie se agacha para recibirlo
    caster.rotation.z=0.06*ss(TI-0.15,TI,te)*(1-ss(TI,TI+0.3,te)); const sq=hitK(ia,9)*0.08;
    caster.scale.set(1+sq*0.5,1-sq,1+sq*0.5);
    set(camo,ia>0?ss(0.05,0.55,ia):0,0.85*env*(ia>0?1:0)); camo.visible=ia>0&&env>0.001;
    for(const m of silk){set(m,ia>0?ss(0.15,0.7,ia):0,env);m.visible=ia>0.1&&env>0.001;}
    plates.forEach((m,i)=>{const ip=te-PL[i];m.visible=ip>0&&env>0.001;const pop=ip>0?Math.exp(-ip*8):0;
      m.scale.setScalar(1+0.35*Math.pow(1-ss(0,0.15,ip),2));set(m,pop,env*ss(0,0.08,ip));});
    set(sigil,ss(TI-0.2,TI+0.3,te),ss(TI-0.2,TI,te)*(1-ss(TE,TE+0.28,te))*0.85);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.6*(1-p):0);
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    cm.emissiveIntensity=0.15*env+hitK(ia,6)*0.5;
    for(let i=0;i<2;i++){const ip=te-PL[i];if(ip>0)cm.emissiveIntensity+=0.35*Math.exp(-ip*6);}
    if(te<TI){o.g.copy(bp);o.gs=0.8+0.4*form;o.ga=0.3*form;o.li=2*form;}
    else{o.g.set(CX,1.1,0);o.gs=1.3+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*7)*0.45+0.1*env;o.li=4*Math.exp(-ia*5)+1.5*env;}
    o.ia=ia;o.c.copy(BK);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 4 · PARASITE — un parásito etéreo se gesta entre las puntas, salta sobre la cabeza del rival y le roe la mente
//     (ondas psíquicas y zarcillos que se hunden); le arranca un fragmento de memoria que se desmorona (el descarte)
//     nivel 2: firme — criatura mediana, sin marca pesada
// =====================================================================
const parasite={key:"icParasite",name:"Parasite",pa:2,dur:2.3,ti:0.75,pal:"Miasma",
  phases:[["Gestación",0],["Salto",0.25],["Mordida",0.75],["Roer",0.9],["Descarte",1.25],["Fin",1.85]],
build(a){
  const L=a.L,TJ=0.25,TI=0.75,TD=1.25,TE=1.85,G0=V3(-3.32,2.38,0),GH=V3(3.22,2.0,0.08),JH=1.5;
  const at=(te,out)=>{if(te<TJ)return out.copy(G0).add(tmp2.set(0,0.04*Math.sin(te*14),0));
    if(te>=TI){const g=te-TI;return out.copy(GH).add(tmp2.set(0.02*Math.sin(g*20),-0.035*Math.abs(Math.sin(g*18)),0));}
    const k=(te-TJ)/(TI-TJ);return out.set(G0.x+(GH.x-G0.x)*k,G0.y+(GH.y-G0.y)*k+4*JH*k*(1-k),G0.z+(GH.z-G0.z)*k);};
  // parásito: abdomen segmentado, cabeza con quelíceros que muerden (uQ) y patas finas; translúcido con venas
  const para=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),fxU(SDF2+`uniform float uQ;
  float sdPara(vec2 p,float g){
   float d=length((p-vec2(-.12,.02))*vec2(1.,1.35))/1.35-.27;
   d=smin(d,length(p-vec2(.3,.05))-.14,.08);
   d=min(d,sdSeg(p,vec2(.42,.06),vec2(.6-.06*g,.03))-.025);d=min(d,sdSeg(p,vec2(.6-.06*g,.03),vec2(.55-.05*g,-.1+.07*g))-.02);
   d=min(d,sdSeg(p,vec2(.42,.1),vec2(.62,.24))-.008);
   for(int i=0;i<3;i++){float fi=float(i);float hx=-.25+fi*.22;float sw=sin(uT*14.+fi*2.)*.03;
    vec2 kn=vec2(hx-.1+fi*.08,-.32+sw);vec2 ft=vec2(hx-.2+fi*.17,-.56+sw);
    d=min(d,sdSeg(p,vec2(hx,-.12),kn)-.02);d=min(d,sdSeg(p,kn,ft)-.012);}
   return d;}
  void main(){vec2 p=(vUv-.5)*2.;p+=vec2(noise(vec3(p*3.,uT*2.)),noise(vec3(p*3.+7.,uT*2.)))*.05-.025;
   float d=sdPara(p,uQ);float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.03);float halo=smoothstep(.25,0.,d)*.3;
   float seg=band(fract((p.x+.5)*6.),.5,.08)*step(p.x,.15)*fill;
   float vein=smoothstep(.06,0.,abs(noise(vec3(p*6.,uT*.7))-.5))*fill;
   float dn=noise(vec3(p*5.,3.));if(dn<uP)discard;float burn=smoothstep(.12,0.,dn-uP)*step(.001,uP);
   vec3 c=mix(uC2,uC1,fill*.4+rim+vein*.6)*1.3+vec3(1.)*(rim*.4+burn);
   gl_FragColor=vec4(c,(fill*.3+seg*.4+rim+halo+vein*.5+burn)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  // ondas psíquicas alrededor de la cabeza mientras roe
  const ripples=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float w=r+(noise(vec3(an*3.,r*4.,uT*2.))-.5)*.08;float ph=fract(w*2.2-uT*2.4);
   float m=band(ph,.5,.06)*smoothstep(1.,.25,r)*smoothstep(.12,.3,r);
   gl_FragColor=vec4(mix(uC2,uC1,ph)*1.4,m*uA);}`,{depthTest:false}));
  // fragmento de memoria arrancado: lámina rasgada con trazos de recuerdo; se desmorona (uP)
  const frag=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.55),fx(`void main(){vec2 p=(vUv-.5)*2.;vec2 b=abs(p)-vec2(.62,.8);
   float e=max(b.x,b.y);float d=e+(noise(vec3(p*7.,1.))-.5)*.22*step(-.25,e);
   float fill=smoothstep(.03,-.03,d);float rim=band(d,0.,.05);
   float lines=band(fract(p.y*4.+.5),.5,.05)*step(abs(p.x),.45)*step(.35,noise(vec3(p.x*6.,floor(p.y*4.),2.)))*fill;
   float glyph=band(length(p-vec2(0.,.35)),.22,.03)*fill;
   float dn=noise(vec3(p*4.,5.));if(dn<uP)discard;float burn=smoothstep(.15,0.,dn-uP)*step(.001,uP);
   gl_FragColor=vec4(mix(uC2,uC1,.5+rim)*1.4+vec3(1.)*(lines+glyph)*.6+uC1*burn,(fill*.25+rim+lines*.8+glyph+burn)*uA);}`,{depthTest:false}));
  L.mesh.add(para,ripples,frag);
  // zarcillos de alimentación que se hunden en la cabeza
  const tend=[0,1,2].map(i=>boltLine(L.trail,14,`const vec3 GH=${v3(GH)};const vec3 TH=${v3(TH)};`,
    `vec3 B=TH+vec3(sin(uS*5.)*.13,-.12-.04*uS,cos(uS*3.)*.1);p=bolt(GH+vec3(0.,-.1,0.),B,s,uS,.05);a=1.-s*.5;`,1.3+i*2.1));
  const fragAt=(te,out)=>{const k=cl((te-TD)/(TE-TD));return out.set(TH.x+0.5*k,TH.y+0.15+1.0*(1-Math.pow(1-k,2)),0.25);};

  const C=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const vec3 G0=${v3(G0)};const vec3 GH=${v3(GH)};const vec3 TH=${v3(TH)};
  vec3 jp(float t){float k=clamp((t-TJ)/(TI-TJ),0.,1.);return mix(G0,GH,k)+vec3(0.,${f(4*JH)}*k*(1.-k),0.);}`;
  const WISP=HEAD+`varying float vA;varying float vMix;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA*.7;if(a<.003)discard;
   gl_FragColor=vec4(mix(uC2,uC1,.4+.4*vMix)*1.2,a);}`;
  // gestación: jirones que convergen sobre las puntas
  a.count+=points(L.part,50,C+`void main(){float life=.2+aSeed.y*.08;float age=(uT-aSeed.x*.07)/life;
   vec3 p=G0+normalize(rnd()+.001)*mix(.9,.05,age*age);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.1+.08*aSeed.z);}`,WISP);
  // estela ectoplásmica del salto
  a.count+=points(L.part,60,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float t=max(uT-s,0.);float age=(uT-s)/(.4+aSeed.y*.25);
   vec3 p=jp(s)+rnd()*.08+vec3(-.15*t,.25*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.1+.08*aSeed.z)*(1.-age*.4));}`,WISP);
  // pensamientos que el parásito sorbe de la cabeza (espiral hacia él)
  a.count+=points(L.part,70,C+`void main(){float life=.45+aSeed.y*.25;float k=(uT-TI-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rd=(.45+.25*r.y)*(1.-age);vec3 p=mix(TH+vec3(cos(an)*rd,(r.z-.5)*.5,sin(an)*rd),GH,age*age);
   vA=(k>=1.&&uT<TD+.15)?sin(age*3.14159):0.;put(p,.03+.03*r.z);}`);
  // el fragmento se desmorona en motas
  a.count+=points(L.part,70,C+`void main(){float s=TD+.25+aSeed.x*.3;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.3);
   float k=clamp((s-TD)/(TE-TD),0.,1.);vec3 c=vec3(TH.x+.5*k,TH.y+.15+1.*(1.-(1.-k)*(1.-k)),.25);
   vec3 p=c+rnd()*vec3(.18,.24,.05)+vec3(.3*t,.5*t,0.)+rnd()*.35*t;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.z);}`);
  a.count+=sparks(L.part,40,TI,`${f(GH.x)},${f(GH.y-0.1)},.1`,"0.,-.2,.3",1.5,4,2);
  // círculo psíquico bajo el rival
  const ring=groundPlane(2.0,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float ph=fract(r*2.-uT*1.6);
   float m=(band(ph,.5,.08)*.6+band(r,.92,.02))*smoothstep(1.,.3,r);gl_FragColor=vec4(mix(uC2,uC1,ph)*1.2,m*uA);}`));
  L.decal.add(ring);

  const pp=V3(0,0,0), pv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TJ,te), gnaw=ia>0?1-ss(TD+0.2,TD+0.45,te):0, out=ss(TE-0.1,TE+0.3,te);
    caster.rotation.z=0.08*ss(0,TJ,te)-0.16*ss(TJ,TJ+0.08,te)+0.08*ss(TJ+0.1,TI,te);
    at(te,pp); at(te+0.01,pv); pv.sub(at(te-0.01,tmp));
    const spin=te>TJ&&te<TI?Math.atan2(pv.y,pv.x)*0.6:-0.15;
    towardCam(para.position,pp,0.3); billboard(para,spin); para.scale.setScalar(0.85*(0.4+0.6*form));
    para.visible=out<0.999; para.material.uniforms.uQ.value=ia>0?0.5+0.5*Math.sin((te-TI)*18):0.3;
    set(para,out,form);
    towardCam(ripples.position,TH,0.4); billboard(ripples); ripples.visible=gnaw>0.01; ripples.material.uniforms.uA.value=0.75*gnaw*ss(0,0.15,ia);
    tend.forEach((m,i)=>{m.uniforms.uA.value=gnaw*ss(0,0.1,ia)*(0.5+0.5*Math.sin(te*31+i*2.2))*(1-out);});
    fragAt(te,tmp); towardCam(frag.position,tmp,0.2); billboard(frag,0.3*Math.sin((te-TD)*5)+(te-TD)*1.5);
    frag.visible=te>TD&&te<TE+0.3; frag.scale.setScalar(0.6+0.4*ss(TD,TD+0.15,te)); set(frag,ss(TD+0.25,TE+0.2,te),ss(TD,TD+0.1,te));
    set(ring,0,0.7*gnaw*ss(0,0.2,ia));
    U.uE.value=gnaw;
    // el rival se marea: balanceo lento y destello púrpura en cada mordisco
    const hit=hitK(ia,7); target.rotation.z=-hit*0.12+0.07*gnaw*Math.sin(te*6); target.position.x=3.4+hit*0.08;
    o.em=gnaw*0.22*(0.6+0.4*Math.abs(Math.sin((te-TI)*9))); o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(pp);o.gs=0.8+0.3*form;o.ga=0.32*form;o.li=2*form;}
    else{o.g.copy(TH).y+=0.2;o.gs=1+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*8)*0.45+0.12*gnaw;o.li=4.5*Math.exp(-ia*5)+1.5*gnaw+(te>TD?1.2*(1-ss(TD,TE,te)):0);}
    o.ia=ia;o.c.copy(TH);o.shake=0;o.dist=0.45;
  };
}};

// =====================================================================
// 5 · PLIERS — dos pinzas gigantes de quitina metálica iridiscente se materializan a los lados del rival, se abren
//     temblando y se cierran de golpe; muelen al rival unos instantes y se disuelven en escamas
//     nivel 2: firme — pinzas grandes pero sin fractura ni temblor de cámara
// =====================================================================
const pliers={key:"icPliers",name:"Pliers",pa:2,dur:2.1,ti:0.66,pal:"Plata",
  phases:[["Forma",0],["Apertura",0.3],["Chasquido",0.66],["Presa",0.8],["Disolución",1.22],["Fin",1.7]],
build(a){
  const L=a.L,TO=0.3,TS=0.58,TI=0.66,TR=1.22,TE=1.65,HY=1.32,HZ=0.45,MX=1.48;
  // quitina metálica con película fina: el tono cambia con el ángulo; uP disuelve con bordes de la paleta
  const metal=fx(`void main(){float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   vec3 film=.5+.5*cos(6.2832*(fr*1.2+vUv.x*.6+vec3(0.,.33,.67)+uT*.15));
   float lit=.35+.65*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float spec=pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),24.);
   float n=noise(vP*6.);if(n<uP)discard;float edge=smoothstep(.1,0.,n-uP)*step(.001,uP);
   vec3 c=mix(vec3(.05,.06,.09),uC2*.5,.3)*lit+film*(.22+.6*fr*fr)+vec3(1.)*spec*.9+uC1*(edge*2.+fr*fr*.4*uA);
   gl_FragColor=vec4(c,1.);}`,DS);
  const curve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.45,0.3,0),V3(0.95,0.36,0),V3(1.32,0.16,0),V3(MX,-0.1,0)]);
  const tubeG=taperTube(curve,48,12,0.17,0.02), toothG=new THREE.ConeGeometry(0.055,0.2,8).rotateZ(Math.PI).translate(0,-0.1,0);
  const knobG=new THREE.SphereGeometry(0.21,20,14);
  const jaws=[1,-1].map(sd=>{const g=new THREE.Group();g.add(new THREE.Mesh(tubeG,metal),new THREE.Mesh(knobG,metal));
    for(const [x,y,r] of [[0.62,0.2,0.2],[0.95,0.22,0.35],[1.22,0.07,0.5]]){const t=new THREE.Mesh(toothG,metal);t.position.set(x,y,0);t.rotation.z=r;g.add(t);}
    g.position.set(3.4-sd*MX,HY,HZ); g.scale.set(sd,1,1); L.mesh.add(g); return g;});
  // destello del chasquido: línea horizontal donde se encuentran las puntas + anillo
  const glint=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.5),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float m=exp(-abs(p.y)*14.)*(1.-p.x*p.x)+exp(-length(p*vec2(1.,4.))*5.)*.8;gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.6,m*uA);}`,{depthTest:false}));
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false}));
  L.mesh.add(glint,ring);
  const CP=V3(3.4,1.22,HZ);
  const C=`const float TO=${f(TO)};const float TI=${f(TI)};const float TR=${f(TR)};const vec3 CP=${v3(CP)};`;
  // escamas que convergen para formar las pinzas
  a.count+=points(L.part,70,C+`void main(){float life=.22+aSeed.y*.1;float age=(uT-aSeed.x*.1)/life;float sd=aSeed.z<.5?1.:-1.;
   vec3 dst=vec3(3.4-sd*(${f(MX)}-aSeed.w*1.3),${f(HY)}+.25*sin(aSeed.w*3.),${f(HZ)});
   vec3 p=dst+normalize(rnd()+.001)*mix(1.4,0.,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.08+.05*aSeed.y);vMix=aSeed.y+age;}`,IRI_FS);
  // escamas iridiscentes del chasquido
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=(uT-s)/(.55+aSeed.y*.35);
   vec3 v=normalize(rnd()+vec3(0.,.5,.4))*(2.+2.5*aSeed.z);vec3 p=CP+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.07+.05*aSeed.w);vMix=aSeed.w+t*3.;}`,IRI_FS);
  // chispas de molienda en el punto de contacto (bucle durante la presa)
  a.count+=points(L.part,60,C+`void main(){float life=.16+aSeed.y*.1;float k=(uT-TI-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c)*2.-1.;
   vec3 p=CP+vec3(r.x*.12,r.y*.05,.05)+normalize(r+vec3(0.,.6,.5))*age*.7+vec3(0.,-age*age*.4,0.);
   vA=(k>=1.&&uT<TR)?1.-age:0.;put(p,.035+.02*r.z);}`);
  a.count+=sparks(L.part,120,TI,`${f(CP.x)},${f(CP.y)},${f(CP.z)}`,"0.,.35,.4",3,8,3);
  // escamas al disolverse
  a.count+=points(L.part,60,C+`void main(){float s=TR+aSeed.x*.35;float t=max(uT-s,0.);float age=(uT-s)/(.6+aSeed.y*.3);float sd=aSeed.z<.5?1.:-1.;
   vec3 p=vec3(3.4-sd*(${f(MX)}-aSeed.w*1.3),${f(HY)}+.3*sin(aSeed.w*3.),${f(HZ)})+rnd()*.12+vec3(0.,.4*t-.8*t*t,0.)+rnd()*.5*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.04*aSeed.y);vMix=aSeed.y+t*2.;}`,IRI_FS);
  const shock=groundPlane(3.6,3.4,0.03,fx(RING_FS));
  L.decal.add(shock);

  a.pose=function(te,o){
    const ia=te-TI;
    let an;
    if(te<TO)an=0.7;
    else if(te<TS)an=0.7+0.45*ss(TO,TS,te)+0.03*Math.sin(te*60)*ss(0.4,TS,te);
    else if(te<TI){const k=(te-TS)/(TI-TS);an=1.15-1.21*k*k;}
    else an=-0.06+0.05*Math.sin(ia*45)*Math.exp(-ia*6)+0.015*Math.sin(te*70)*(1-ss(TR-0.1,TR,te))+0.4*ss(TR,TR+0.25,te);
    jaws[0].rotation.z=an; jaws[1].rotation.z=-an;
    const dis=te<TO?1-ss(0,TO,te):ss(TR,TE,te);
    metal.uniforms.uP.value=dis; metal.uniforms.uA.value=ia>0?0.5+hitK(ia,5):0.5;
    for(const g of jaws)g.visible=dis<0.995;
    let p=cl(ia/0.22); towardCam(glint.position,CP,0.3); billboard(glint); glint.visible=ia>=0&&p<1; glint.scale.set(0.6+0.8*p,1,1); glint.material.uniforms.uA.value=1-p;
    p=cl(ia/0.4); towardCam(ring.position,CP,0.4); billboard(ring); ring.visible=ia>=0&&p<1; set(ring,p,1-p);
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?0.6*(1-p):0);
    // el rival queda apretado entre las pinzas
    const hold=ia>0?1-ss(TR,TR+0.25,te):0, hit=hitK(ia,8);
    target.scale.set(1-0.14*hold-0.06*hit,1+0.05*hold,1-0.14*hold); target.rotation.z=0.03*hold*Math.sin(te*60)*Math.exp(-ia*2);
    o.em=0.18*hold; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(CP);o.gs=1.4;o.ga=0.12+0.2*ss(TO,TI,te);o.li=1.5+2.5*ss(TO,TI,te);}
    else{o.g.copy(CP);o.gs=1.2+2.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.6+0.1*hold;o.li=7*Math.exp(-ia*6)+1.5*hold;}
    o.ia=ia;o.c.copy(CP);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 6 · ANTENNA — arcos bioeléctricos amarillos chisporrotean entre las puntas; un pulso de radar barre 5 casillas
//     revelando celdas; un rayo drena energía del rival (fluye por el arco hasta el Axie) y la reparte al escuadrón
//     nivel 1: rápido y preciso — rayos finos, barrido fino, sin marca persistente
// =====================================================================
const antenna={key:"icAntenna",name:"Antenna",pa:1,dur:1.3,ti:0.38,pal:"Estelar",allies:2,
  phases:[["Chispa",0],["Barrido",0.12],["Drenaje",0.38],["Reparto",0.66],["Fin",1.0]],
build(a){
  const L=a.L,TP=0.12,TI=0.38,TR=0.66,TE=1.0,CX=-3.7,R=5.2;
  const A=V3(-3.5,2.1,0),B=V3(3.22,1.6,0),CH=V3(-3.7,1.72,0),AH=ALLY_POS.map(p=>p.clone().add(V3(0,1.62,0)));
  const D=`const vec3 A=${v3(A)};const vec3 B=${v3(B)};const vec3 CH=${v3(CH)};const vec3 AH0=${v3(AH[0])};const vec3 AH1=${v3(AH[1])};`;
  const C=D+BOLT+`const float TP=${f(TP)};const float TI=${f(TI)};const float TR=${f(TR)};const float TE=${f(TE)};`;
  // arcos entre las dos puntas y chispas que suben de cada una
  const tipX=boltLine(L.trail,14,"",`p=bolt(vec3(-3.54,2.05,-.27),vec3(-3.54,2.05,.27),s,uS,.07);`,0.3);
  const tipU=[-1,1].map((z,i)=>boltLine(L.trail,10,"",`p=bolt(vec3(-3.54,2.05,${f(0.27*z)}),vec3(-3.44,2.45,${f(0.42*z)}),s,uS,.05);`,2.2+i));
  // rayo de drenaje (dos hebras) y bifurcaciones hacia los aliados
  const main=[0,1].map(i=>boltLine(L.trail,48,D,`p=bolt(A,B,s,uS,${i?".15":".24"});`,1+i*4.3));
  const forks=[0,1].map(i=>boltLine(L.trail,24,D,`p=bolt(CH,AH${i},s,uS,.14);`,7+i*1.7));
  // radar: anillo fino que barre 5 casillas; detrás del frente se encienden celdas sueltas (casillas reveladas)
  const radar=groundPlane(R*2,CX,0.021,fx(`void main(){vec2 p=(vUv-.5)*${f(R*2)};float r=length(p)/${f(R)};
   vec2 w=p+vec2(${f(CX)},0.);vec2 id=floor(w);vec2 fp=fract(w);float h=hash(vec3(id,5.));
   float wake=step(r,uP)*exp(-(uP-r)*5.);float cell=step(.86,h)*wake*(.5+.5*smoothstep(.5,.4,max(abs(fp.x-.5),abs(fp.y-.5))));
   float grid=smoothstep(.04,0.,min(min(fp.x,1.-fp.x),min(fp.y,1.-fp.y)))*wake*.25;
   float m=band(r,uP,.02)*step(r,1.)+cell*.6+grid;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.3,m*uA*smoothstep(1.,.85,r));}`));
  L.decal.add(radar);

  // brillo a lo largo del rayo y energía que fluye del rival al Axie por el propio arco
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x;vec3 p=bolt(A,B,s,1.,.24)+rnd()*.03;
   vA=(uT>TI&&uT<TR+.08)?(.4+.6*aSeed.y)*(1.-smoothstep(TR-.05,TR+.08,uT)):0.;put(p,.035+.035*aSeed.z);}`);
  a.count+=points(L.part,60,C+`void main(){float t=uT-TI;float s=1.-fract(aSeed.x+t*1.8);vec3 p=bolt(A,B,s,1.,.24)+rnd()*.05;
   vA=(t>0.&&uT<TR+.04)?smoothstep(0.,.08,t)*(.6+.4*aSeed.y)*smoothstep(0.,.08,s):0.;put(p,.06+.05*aSeed.z);}`);
  // chisporroteo en las puntas
  a.count+=points(L.part,30,C+`void main(){float life=.08+aSeed.y*.06;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c)*2.-1.;
   vec3 p=vec3(-3.54,2.05,r.x>0.?.27:-.27)+r*vec3(.12,.15,.08)+vec3(0.,age*.15,0.);
   vA=(k>=1.&&uT<TI+.05)?1.-age:0.;put(p,.03+.02*r.z);}`);
  // motas que saltan en las casillas reveladas al paso del radar
  a.count+=points(L.part,30,C+`void main(){float an=aSeed.x*6.2832;float rd=(.15+.85*aSeed.y)*${f(R)};float s=TP+aSeed.y*(TI-TP+.08);
   float t=max(uT-s,0.);float age=(uT-s)/.35;vec3 p=vec3(${f(CX)}+cos(an)*rd,.05+t*.9,sin(an)*rd);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.03*aSeed.z);}`);
  // brillo de las bifurcaciones hacia el escuadrón
  a.count+=points(L.part,40,C+`void main(){float i=step(.5,aSeed.w);float s=aSeed.x;vec3 p=i<.5?bolt(CH,AH0,s,7.,.14):bolt(CH,AH1,s,8.7,.14);
   vA=(uT>TR&&uT<TE)?(.4+.6*aSeed.y)*(1.-smoothstep(TE-.15,TE,uT)):0.;put(p+rnd()*.03,.035+.03*aSeed.z);}`);
  a.count+=sparks(L.part,50,TI,`${f(B.x)},${f(B.y)},0.`,"-.5,.3,0.",2,5,2.5);

  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR, flick=(k,i)=>(Math.sin(te*97+i*13)>-0.35?1:0.2)*k;
    const tips=ss(0,0.05,te)*(1-ss(TI+0.02,TI+0.12,te));
    tipX.uniforms.uA.value=flick(tips,0); tipU.forEach((m,i)=>m.uniforms.uA.value=flick(tips*0.8,i+1));
    const dr=ia>0?1-ss(TR-0.04,TR+0.08,te):0;
    main.forEach((m,i)=>m.uniforms.uA.value=flick(dr*(i?0.55:1),i+3));
    const fk=ir>0?1-ss(TE-0.15,TE,te):0;
    forks.forEach((m,i)=>m.uniforms.uA.value=flick(fk*ss(0,0.05,ir-i*0.04),i+5));
    const rp=cl((te-TP)/(TI-TP+0.1)); set(radar,rp,te>TP?0.8*(1-ss(TI,TI+0.35,te)):0);
    caster.rotation.z=0.05*Math.sin(te*50)*tips*0.4;
    // el Axie se carga de la energía drenada y la reparte
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*tips+0.55*ss(TI,TR,te)*(1-ss(TR,TE,te));
    allies.forEach((d,i)=>{const k=ir>0?ss(0,0.06,ir-i*0.04)*(1-ss(TE-0.1,TE+0.25,te)):0;d.userData.m.emissive.copy(U.uC1.value);d.userData.m.emissiveIntensity=0.5*k;});
    const hit=hitK(ia,7); target.position.x=3.4+hit*0.06; target.rotation.z=0.02*Math.sin(te*80)*dr;
    o.em=0; o.flash=0.8;
    if(te<TI){o.g.copy(HT);o.gs=0.7;o.ga=0.3*tips;o.li=1.8*tips;}
    else if(te<TR){o.g.copy(A).lerp(B,0.5+0.5*Math.cos((te-TI)*9));o.gs=0.9;o.ga=0.3;o.li=3;}
    else{o.g.copy(CH);o.gs=1;o.ga=0.25*fk;o.li=2.5*fk;}
    o.ia=ia;o.c.copy(B);o.shake=0;o.dist=0.4;
  };
}};

VFX.module("Bicho · Cuernos",[caterp,lagging,leafBug,parasite,pliers,antenna]);
})();

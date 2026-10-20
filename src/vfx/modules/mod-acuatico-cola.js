// =====================================================================
// MÓDULO · CLASE ACUÁTICO (COLA)
// Mismo contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Estética de clase: agua translúcida, burbujas irisadas, espuma, escamas y corrientes. Los efectos nacen de la
// posición de la cola (≈ -4.15,0.7,0) sin dibujarla. Cada habilidad ya está a la escala de su nivel (pa).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,BUBBLE_FS,CROSS_FS,helixGeo,camera,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,v3,CHIP_FS,STAR4_FS,SMOKE_FS,SLASH_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0);                  // pecho del objetivo, cara visible
const TP=V3(-4.15,0.7,0);                 // cola del lanzador
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const glowM=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const gpz=(s,x,z,y,mat,w)=>{const m=groundPlane(s,x,y,mat,w);m.position.z=z;return m;};
// orientación de un pez a lo largo de su velocidad (morro en +x local)
const aim=(g,d)=>g.rotation.set(0,Math.atan2(-d.z,d.x),Math.atan2(d.y,Math.hypot(d.x,d.z)));

// ---------- piezas de agua del módulo ----------
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float body=smoothstep(.5,.4,d);float rim=smoothstep(.2,.46,d)*body;
 float hl=smoothstep(.13,0.,length(q-vec2(-.13,-.13)));
 float a=(body*.22+rim*.75+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3+hl*.6)*1.3,a);}`;
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*6.,vMix*40.));
 float a=smoothstep(.5,.15,d+(n-.5)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.9,.96,1.),uC1,.18)*(.82+.3*n),a*.9);}`;
const PETAL_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=length(q*vec2(2.2,1.1));float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.25,0.,length((q-vec2(0.,-.12))*vec2(3.,1.5)));
 gl_FragColor=vec4(mix(uC1,vec3(.9,.97,1.),.35+hl*.5)*1.3,a*(.55+.45*smoothstep(.45,.2,d)));}`;
// chevrón hacia abajo (debilidad)
const DOWN_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=abs(q.y+.15-abs(q.x)*.9);
 float a=smoothstep(.09,.04,d)*step(abs(q.x),.38)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,vec3(1.),.25)*1.5,a);}`;
const RIPPLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,uT*.7));float rr=r+(n-.5)*.05;
 float m=0.;for(int i=0;i<3;i++){float fi=float(i);float c=uP-fi*.18;m+=band(rr,c,.04+.03*fi)*step(0.,c)*(1.-fi*.28);}
 m*=smoothstep(1.,.85,r);
 gl_FragColor=vec4(mix(uC2,uC1,.65)*1.3+vec3(.25)*m,m*uA);}`;
const POOL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n1=noise(vec3(p*9.,uT*.8)),n2=noise(vec3(p*17.+3.,uT*1.1));
 float cs=pow(1.-abs(n1-n2),10.);
 float e=r/max(uP,.001)+(noise(vec3(p*5.,1.))-.5)*.2;
 float body=smoothstep(1.,.8,e);float rim=band(e,.92,.08);
 gl_FragColor=vec4(mix(uC2,uC1,cs+rim)*1.2,(body*(.12+cs*.5)+rim*.6)*uA);}`;
const CAUS=`float caus(vec3 p){float a=noise(p),b=noise(p*1.7+vec3(3.1,1.7,.5));return pow(1.-abs(a-b),8.);}`;
const IRIS_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
 float th=noise(vP*2.+vec3(0.,uT*.6,0.))*1.5+fr*2.+vP.y*.6;
 vec3 iri=.5+.5*cos(6.2832*(th+vec3(0.,.33,.67)));
 vec3 c=mix(uC1,iri,.5)*(.3+1.2*fr)+vec3(1.)*pow(fr,6.)*.6;
 float hl=smoothstep(.96,1.,dot(normalize(vN),normalize(vec3(-.4,.6,.7))));
 gl_FragColor=vec4(c+vec3(hl)+vec3(1.)*uP,(.05+.6*fr+hl+uP*.5)*uA);}`;
// aleta de velo de agua (plano vertical; raíz en x=1 del uv)
const VEIL_FS=`void main(){vec2 p=vec2(1.-vUv.x,vUv.y-.5);
 float w=.1+.42*p.x;float n=noise(vec3(p*vec2(4.,7.)+vec2(-uT*4.,0.),uT*.7));float ww=w*(.75+.4*n);
 float m=smoothstep(ww,ww-.08,abs(p.y))*smoothstep(1.,.75,p.x+(n-.5)*.3);
 float rays=.7+.3*sin(atan(p.y,p.x+.15)*28.);
 gl_FragColor=vec4(mix(vec3(.95,.97,1.),uC2,smoothstep(.3,.9,p.x)*.7)*1.2*rays+uC1*n*.3,m*(.4+.4*p.x)*uA);}`;
// estela en planos cruzados (u: 0 cola → 1 cabeza)
const WAKE_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=noise(vec3(u*6.-uT*12.,v*3.,uT))*.6+noise(vec3(u*15.-uT*20.,v*8.,2.))*.4;
 float al=smoothstep(u*(.5+.5*n)+.05,0.,v)*pow(u,1.5)*uA;
 gl_FragColor=vec4(mix(uC2,uC1,u*n)*1.5+vec3(.9)*smoothstep(.6,.9,n)*u*.4,al);}`;
const crossTrail=(L,w,mat)=>{const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0),G=new THREE.Group(),m2=new THREE.Mesh(g,mat);m2.rotation.x=Math.PI/2;
  G.add(new THREE.Mesh(g,mat),m2);G.userData.mat=mat;L.trail.add(G);return G;};

// =====================================================================
// 1 · KOI — el agua borbotea bajo el Axie y estalla en un géiser que lo alza; de él asciende en espiral un koi
//     gigante de energía que se arquea y cae en picado sobre el rival (fractura de baldosas). Pétalos de agua quedan
//     girando alrededor del Axie como bufo de velocidad. Nivel 3
// =====================================================================
const koi={key:"qtKoi",name:"Koi",pa:3,dur:3.3,ti:1.7,pal:"Ámbar",
  phases:[["Borboteo",0],["Géiser",0.45],["Ascenso",0.5],["Picado",1.25],["Impacto",1.7],["Pétalos",2.05]],
build(a){
  const L=a.L,TG=0.45,TR=0.5,TA=1.25,TI=1.7,TE=3.25,GX=-3.7,GH=4.4,A=V3(-1.4,4.3,0.35),CK=V3(2.4,4.9,0.2),HP=V3(3.15,1.15,0),FSZ=7.5;
  const kp=(t,o)=>{if(t<TR)return o.set(GX+0.65,0.4,0);
    if(t<TA){const k=(t-TR)/(TA-TR),an=k*7.85,r=0.65*(1-k*0.6),w=k*k*k;
      return o.set((GX+Math.cos(an)*r)*(1-w)+A.x*w,(0.4+3.4*k)*(1-w)+A.y*w,Math.sin(an)*r*(1-w)+A.z*w);}
    const s=Math.pow(cl((t-TA)/(TI-TA)),1.6),u=1-s;
    return o.set(u*u*A.x+2*u*s*CK.x+s*s*HP.x,u*u*A.y+2*u*s*CK.y+s*s*HP.y,u*u*A.z+2*u*s*CK.z+s*s*HP.z);};
  const gh=te=>ss(TG,TG+0.15,te)*(1-ss(TA,TI,te));
  // géiser: columna de agua con vetas que suben; uP = altura del frente (espuma en la cresta)
  const geyser=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.8,GH,36,8,true).translate(0,GH/2,0),fx(`void main(){float h=vP.y/${f(GH)};if(h>uP)discard;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*3.,h*6.-uT*7.,uT*.5))*.6+noise(vec3(an*8.,h*14.-uT*11.,2.))*.4;
   float st=smoothstep(.4,.8,n);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
   float top=smoothstep(uP-.1,uP,h);vec3 water=mix(vec3(.75,.9,1.),uC1,.3);
   gl_FragColor=vec4(mix(water*.6,water*1.4,st)+vec3(1.)*top*.6,(fr*.5+st*.45+top)*smoothstep(0.,.04,h)*uA);}`));
  geyser.position.set(GX,0,0); L.mesh.add(geyser);
  // koi: cuerpo blanco con manchas de la paleta, escamas y cáusticas; aura de energía; cola y dorsal de velo
  const koiG=new THREE.Group(); L.mesh.add(koiG);
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(CAUS+`void main(){vec3 q=vP;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float pat=smoothstep(.48,.56,noise(q*vec3(2.2,3.,3.)+vec3(3.1,0.,1.7)));
   float sc=pow(.5+.25*sin(q.x*40.+sin(q.y*36.)*1.4)+.25*sin(q.y*40.),4.);
   float c1=caus(q*3.+vec3(-uT*2.,0.,uT));
   vec3 base=mix(vec3(.95,.97,1.),uC2*1.1,pat*smoothstep(-.4,.2,q.y));
   base=mix(base,uC1,.15)+sc*.12;
   float lit=.5+.5*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float eye=smoothstep(.1,.07,length(vec2(q.x-.78,q.y-.12)));
   vec3 c=base*lit+uC1*(fr*1.2+c1*.35)+vec3(1.)*uP;c=mix(c,vec3(.03),eye);
   gl_FragColor=vec4(c,(.88+.12*fr)*uA);}`,NB));
  body.scale.set(0.85,0.32,0.28);
  const aura=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(CAUS+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float c=caus(vP*4.+vec3(-uT*3.,0.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.4+vec3(1.)*c*.3,(fr*.7+c*.15)*uA);}`));
  aura.scale.set(1.05,0.45,0.4); aura.renderOrder=1;
  const tailFin=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9).translate(-0.45,0,0),fx(VEIL_FS)); tailFin.position.x=-0.78;
  const dorsal=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.42).translate(-0.45,0,0),fx(VEIL_FS)); dorsal.position.set(0.35,0.28,0); dorsal.rotation.z=-0.1;
  koiG.add(body,aura,tailFin,dorsal);
  // choque: cúpula de agua y anillo
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,44,28),fx(BURST_FS)); burst.position.copy(HP);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing);
  // suelo: estanque burbujeante y ondas bajo el Axie; fractura, ondas y charco bajo el rival (lo siguen)
  const pool=groundPlane(3.0,GX,0.018,fx(POOL_FS)), erupt=groundPlane(4.2,GX,0.03,fx(RIPPLE_FS));
  const frac=groundPlane(FSZ,3.4,0.025,fx(tileFractureFS(FSZ))), crash=groundPlane(8,3.4,0.03,fx(RIPPLE_FS)), wet=groundPlane(3.4,3.4,0.016,fx(POOL_FS));
  L.decal.add(pool,erupt,frac,crash,wet);

  const C=`const float TG=${f(TG)};const float TR=${f(TR)};const float TA=${f(TA)};const float TI=${f(TI)};const float GX=${f(GX)};
  const vec3 A=${v3(A)};const vec3 CK=${v3(CK)};const vec3 HP=${v3(HP)};varying float vR;
  float gh(float t){return ${f(GH)}*smoothstep(TG,TG+.15,t)*(1.-smoothstep(TA,TI,t));}
  vec3 kp(float t){if(t<TR)return vec3(GX+.65,.4,0.);
   if(t<TA){float k=(t-TR)/(TA-TR);float an=k*7.85;float r=.65*(1.-k*.6);float w=k*k*k;return mix(vec3(GX+cos(an)*r,.4+3.4*k,sin(an)*r),A,w);}
   float s=pow(clamp((t-TA)/(TI-TA),0.,1.),1.6);float u=1.-s;return u*u*A+2.*u*s*CK+s*s*HP;}`;
  // borboteo: burbujas que suben del estanque
  a.count+=points(L.part,110,C+`void main(){float s=aSeed.x*TG;float life=.35+aSeed.y*.25;float age=(uT-s)/life;vR=0.;
   float an=aSeed.z*6.2832;float rd=sqrt(aSeed.w)*.9;vec3 p=vec3(GX+cos(an)*rd,.03+age*.5,sin(an)*rd);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.05+.07*aSeed.y)*(.6+age));}`,BUBBLE_FS);
  // géiser: rocío que cae de la cresta y espuma en la base
  a.count+=points(L.part,230,C+`void main(){float s=TG+.03+aSeed.x*.85;float t=uT-s;float life=.8+aSeed.y*.5;float age=t/life;float c=max(t,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.6+1.4*aSeed.w),1.+2.*aSeed.y,sin(an)*(.6+1.4*aSeed.w));
   vec3 p=vec3(GX,gh(s),0.)+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02&&gh(s)>.3)?1.-age*age:0.;put(p,.05+.07*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,60,C+`void main(){float s=TG+aSeed.x*1.1;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(GX,0.,0.)+vec3(cos(an),0.,sin(an))*(.7+.6*aSeed.w)*(1.+t*.6)+vec3(0.,.08+.2*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.24+.18*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  // rastro del koi: gotas y motas de energía
  a.count+=points(L.part,180,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.45+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 r=rnd();vec3 p=kp(s)+r*.25+vec3(r.x*.3*t,-2.*t*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.05+.06*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,100,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 r=rnd();vec3 p=kp(s)+r*.35+r*.3*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.5));}`);
  // pétalos de agua: bufo de velocidad que gira alrededor del Axie
  a.count+=points(L.part,150,C+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-.8)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*5.;float rad=.7+.35*r.y;vec3 p=vec3(GX+cos(an)*rad,.15+age*(1.8+r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vR=an*1.3+uT*3.;put(p,.16+.08*r.z);}`,PETAL_FS);
  // choque: corona de agua, espuma, chispas, esquirlas y bruma
  a.count+=points(L.part,240,C+`void main(){float s=TI+aSeed.x*.06;float t=uT-s;float life=.9+aSeed.y*.5;float age=t/life;float c=max(t,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+2.2*aSeed.w),3.+4.5*aSeed.y,sin(an)*(1.2+2.2*aSeed.w));
   vec3 p=vec3(3.4,.2,0.)+vec3(cos(an),0.,sin(an))*.6+v*c+vec3(0.,-7.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.06+.07*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.15;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,0.,0.)+vec3(cos(an),0.,sin(an))*(.8+1.6*aSeed.w)*(1.-exp(-t*3.))+vec3(0.,.1+.3*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.3+.25*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  a.count+=sparks(L.part,180,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.4,.6,0.",4,12,3.2);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.7+aSeed.y*.4;float age=t/life;float c=max(t,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.5*aSeed.w),2.5+3.*aSeed.y,sin(an)*(1.+1.5*aSeed.w));
   vec3 p=vec3(3.4,.05,0.)+vec3(cos(an),0.,sin(an))*.8+v*c+vec3(0.,-9.*c*c,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.05*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.25;float life=1.2+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=HP+d*(.5+1.4*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.4:0.;put(p,(.6+.4*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.8,.88,.95)"),NB);

  const kpos=V3(0,0,0), ka=V3(0,0,0), kb=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(0.8,1.1,te)*(1-ss(2.8,TE,te)), g=gh(te);
    // géiser y Axie alzado sobre él
    geyser.visible=g>0.001||te<TI; set(geyser,g,ss(TG,TG+0.05,te)*(1-ss(TA+0.1,TI,te)));
    geyser.scale.set(1+0.15*Math.sin(te*13)*g,1,1+0.15*Math.cos(te*11)*g);
    caster.position.y=0.38*ss(TG,TG+0.15,te)*(1-ss(TA,TA+0.35,te));
    caster.rotation.z=0.05*Math.sin(te*9)*g+0.1*ss(TA,TA+0.15,te)*(1-ss(TI,TI+0.4,te));
    // koi
    kp(te,kpos); kp(te+0.01,ka); kp(te-0.01,kb); ka.sub(kb);
    const pop=ss(TR-0.05,TR+0.18,te);
    koiG.visible=pop>0.001&&te<TI+0.02; koiG.position.copy(kpos); aim(koiG,ka);
    koiG.scale.setScalar(Math.max(pop*1.3,0.001));
    tailFin.rotation.y=0.45*Math.sin(te*(te<TA?9:16)); dorsal.rotation.x=0.15*Math.sin(te*7);
    const dive=ss(TA,TI,te);
    set(body,0.2*dive,1); set(aura,0,0.7+0.5*dive); set(tailFin,0,1); set(dorsal,0,0.8);
    // choque
    let p=cl(ia/0.6); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.5+2.2*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.4); towardCam(hitRing.position,HP,0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    const tx=target.position.x;
    frac.position.x=crash.position.x=wet.position.x=tx;
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,TE,te):0);
    p=cl(ia/0.9); set(crash,p,ia>=0?1-p:0);
    set(wet,0.4+0.6*ss(TI,TI+0.4,te),ia>=0?0.8*(1-ss(2.6,TE,te)):0);
    set(pool,0.55+0.45*ss(0,TG,te),ss(0,0.2,te)*(1-ss(TI,TI+0.6,te)));
    const ig=te-TG; p=cl(ig/0.7); set(erupt,p,ig>=0?1-p:0);
    U.uE.value=env;
    glowM(caster,0.25*env+0.35*g);
    const hit=hitK(ia,3);
    target.position.x=3.4+hit*0.7*(1-Math.exp(-Math.max(ia,0)*18)); target.rotation.z=-hit*0.45*Math.cos(ia*11);
    target.scale.set(1,1-0.12*hitK(ia,8),1);
    if(te<TG){const k=ss(0,TG,te);o.g.set(GX,0.3,0);o.gs=1.4*k;o.ga=0.25*k;o.li=2*k;}
    else if(te<TI){o.g.copy(kpos);o.gs=2.2;o.ga=0.5;o.li=5+3*dive;}
    else{o.g.copy(HP);o.gs=2.2+6*Math.min(ia,0.6);o.ga=Math.exp(-ia*8)*0.9+0.08*env;o.li=15*Math.exp(-ia*4)+1.5*env;}
    if(te<TI&&te>=TG){o.ia=te-TG;o.c.set(GX,0.6,0);o.shake=0.6;o.dist=0.5;o.flash=0;}
    else{o.ia=ia;o.c.copy(HP);o.shake=1.9;o.dist=1.3;o.flash=1;}
  };
}};

// =====================================================================
// 2 · RANCHU — la cola forma un orbe de agua pesado y lo lanza en parábola; al reventar sobre el rival se expande
//     violentamente en una burbuja gigante que lo atrapa y la onda encierra también a los demás rivales. Dentro
//     flotan chevrones de debilidad; al final las burbujas revientan en gotas. Nivel 3
// =====================================================================
const ranchu={key:"qtRanchu",name:"Ranchu",pa:3,dur:3.2,ti:1.05,pal:"Arcano",enemies:2,
  phases:[["Carga",0],["Lanzamiento",0.35],["Impacto",1.05],["Atrapados",1.4],["Estallido",2.6]],
build(a){
  const L=a.L,TL=0.35,TI=1.05,P0=V3(-4.3,0.9,0),HP=V3(3.2,1.2,0),ARC=2.6,FSZ=7;
  // trampas: [centro, radio, aparición, estallido]; el objetivo primero y la onda alcanza a los otros rivales
  const TR=[[V3(3.4,1.05,0),1.25,TI,2.62],[V3(ENEMY_POS[0].x,1.0,ENEMY_POS[0].z),1.1,TI+0.18,2.72],[V3(ENEMY_POS[1].x,1.0,ENEMY_POS[1].z),1.1,TI+0.32,2.82]];
  const DUM=[target,enemies[0],enemies[1]], BX=[3.4,ENEMY_POS[0].x,ENEMY_POS[1].x];
  const orbAt=(te,o)=>{const k=cl((te-TL)/(TI-TL));return o.set(P0.x+(HP.x-P0.x)*k,P0.y+(HP.y-P0.y)*k+4*ARC*k*(1-k),0);};
  // orbe pesado: agua densa con vórtice interior y cáusticas
  const orb=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(CAUS+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   vec3 q=normalize(vP);float sw=atan(q.z,q.x)+q.y*3.+uT*6.;
   float vort=pow(.5+.5*sin(sw*3.),6.);float c=caus(vP*3.+vec3(0.,uT*2.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,fr+c*.4)*1.3+vec3(1.)*(vort*.3+c*.3),(.25+.6*fr+vort*.2+c*.2)*uA);}`));
  L.mesh.add(orb);
  const trail=crossTrail(L,0.6,fx(WAKE_FS));
  // burbujas trampa: película irisada
  const bubbles=TR.map(([c])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(IRIS_FS));m.position.copy(c);L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: fractura bajo el objetivo, gran onda que llega a los rivales y anillos bajo cada atrapado
  const frac=groundPlane(FSZ,3.4,0.025,fx(tileFractureFS(FSZ))), wave=groundPlane(9,3.4,0.03,fx(RIPPLE_FS));
  const traps=TR.map(([c])=>gpz(2.8,c.x,c.z,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float rip=band(fract(r*2.5-uT*.5),.5,.1)*smoothstep(1.,.5,r);float rim=band(r,.88,.03);
   gl_FragColor=vec4(mix(uC2,uC1,r)*1.3,(rip*.35+rim+smoothstep(.9,.2,r)*.08)*uA);}`)));
  L.decal.add(frac,wave,...traps);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 HP=${v3(HP)};
  vec3 orbAt(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,HP,k)+vec3(0.,4.*k*(1.-k)*${f(ARC)},0.);}
  vec4 trap(float i){return i<.5?vec4(${v3(TR[0][0])},${f(TR[0][1])}):(i<1.5?vec4(${v3(TR[1][0])},${f(TR[1][1])}):vec4(${v3(TR[2][0])},${f(TR[2][1])}));}
  vec2 tt(float i){return i<.5?vec2(${f(TR[0][2])},${f(TR[0][3])}):(i<1.5?vec2(${f(TR[1][2])},${f(TR[1][3])}):vec2(${f(TR[2][2])},${f(TR[2][3])}));}`;
  // carga: gotas que se enroscan hacia la cola
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TL-.15);float life=.25+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);float an=(1.-age)*3.;vec3 p=P0+vec3(d.x*cos(an)-d.z*sin(an),d.y,d.x*sin(an)+d.z*cos(an))*mix(1.2,.1,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.05+.05*aSeed.z);}`,DROP_FS);
  // vuelo: gotas y burbujas que caen del orbe
  a.count+=points(L.part,180,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=orbAt(s)+r*.3+vec3(r.x*.3*t,-3.*t*t,r.z*.3*t);
   vA=(age>0.&&age<1.&&p.y>.02)?(1.-age):0.;put(p,(.05+.06*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,80,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=orbAt(s)+r*.25+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.06+.06*aSeed.z);}`,BUBBLE_FS);
  // impacto: corona de agua, chispas y esquirlas
  a.count+=points(L.part,220,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.7+aSeed.y*.4;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.5,0.))*(2.+3.5*aSeed.z);vec3 p=HP+v*c+vec3(0.,-6.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,.06+.06*aSeed.w);}`,DROP_FS);
  a.count+=sparks(L.part,160,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.3,.5,0.",3.5,10,3);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.7+aSeed.y*.4;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.5*aSeed.w),2.5+3.*aSeed.y,sin(an)*(1.+1.5*aSeed.w));
   vec3 p=vec3(3.4,.05,0.)+vec3(cos(an),0.,sin(an))*.8+v*c+vec3(0.,-9.*c*c,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.05*aSeed.w);}`,CHIP_FS);
  // dentro de cada burbuja: burbujitas que suben y chevrones de debilidad que bajan
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*2.999);vec4 T=trap(i);vec2 w=tt(i);float life=.7+aSeed.y*.4;
   float k=(uT-w.x)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rr(c);float an=r.x*6.2832;
   vec3 p=T.xyz+vec3(cos(an)*T.w*.6*r.y,-T.w*.7+age*T.w*1.4,sin(an)*T.w*.6*r.y);
   vA=(k>=1.&&uT<w.y)?sin(age*3.14159):0.;put(p,.05+.06*r.z);}`,BUBBLE_FS);
  a.count+=points(L.part,36,C+`void main(){float i=floor(aSeed.x*2.999);vec4 T=trap(i);vec2 w=tt(i);float life=.9+aSeed.y*.3;
   float k=(uT-w.x-.15)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=T.xyz+vec3((r.x-.5)*T.w*.9,T.w*.55-age*T.w*1.1,(r.y-.5)*T.w*.6);
   vA=(k>=1.&&uT<w.y)?sin(age*3.14159):0.;put(p,.22+.08*r.z);}`,DOWN_FS);
  // estallido de cada burbuja
  a.count+=points(L.part,180,C+`void main(){float i=floor(aSeed.x*2.999);vec4 T=trap(i);float s=tt(i).y;float t=uT-s;float life=.6+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   vec3 d=normalize(rnd()+.0001);vec3 p=T.xyz+d*T.w+d*(1.+1.5*aSeed.z)*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,DROP_FS);

  const op=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    // orbe: se forma en la cola, vuela pesado y bambolea
    const form=ss(0,TL,te), wob=Math.sin(te*24);
    orb.visible=te<TI; if(te<TL)op.copy(P0); else orbAt(te,op); orb.position.copy(op);
    const os=Math.max(0.38*form,0.001); orb.scale.set(os*(1+0.12*wob),os*(1-0.1*wob),os); set(orb,0,1);
    caster.rotation.z=0.12*ss(0,TL,te)-0.25*ss(TL,TL+0.08,te)+0.13*ss(TL+0.1,TL+0.5,te);
    trail.visible=te>TL&&ia<0.15; trail.position.copy(op);
    tmp.copy(op); orbAt(te-0.05,tmp2); tmp.sub(tmp2); trail.rotation.set(0,0,Math.atan2(tmp.y,tmp.x));
    trail.scale.set(Math.max(Math.min((te-TL)*6,1.8),0.001),1,1); trail.userData.mat.uniforms.uA.value=ia>0?1-cl(ia/0.15):1;
    let p=cl(ia/0.4); towardCam(hitRing.position,HP,0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // burbujas: expansión violenta con rebote gelatinoso, se hinchan y revientan
    let lastPop=-1;
    TR.forEach(([c,r,t0,tp],i)=>{const d=te-t0,b=bubbles[i];if(te>=tp)lastPop=Math.max(lastPop,tp);
      const g=d>=0?1-Math.exp(-d*6)*Math.cos(d*13):0, sw=1+0.08*ss(tp-0.25,tp,te);
      b.visible=d>=0&&te<tp+0.04;
      b.scale.set(Math.max(r*g*sw*(1+0.04*Math.sin(te*7+i)),0.001),Math.max(r*g*sw*(1+0.04*Math.cos(te*6+i)),0.001),Math.max(r*g*sw,0.001));
      set(b,ss(tp-0.06,tp,te),1);
      const tr=ss(t0,t0+0.3,te)*(1-ss(tp,tp+0.25,te));
      set(traps[i],0,tr);
      const dm=DUM[i]; dm.position.y=0.4*tr+0.05*Math.sin(te*3+i)*tr; dm.rotation.z=0.12*Math.sin(te*2.3+i)*tr;
      if(i>0){glowM(dm,0.3*tr+(d>=0?0.9*Math.exp(-d*8):0),U.uC2.value);}});
    p=cl(ia/0.45); set(wave,p,ia>=0?(1-p)*0.9:0);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.2,3.1,te):0);
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.18;
    const tr0=ss(TI,TI+0.3,te)*(1-ss(TR[0][3],TR[0][3]+0.25,te));
    o.em=0.3*tr0; o.emc.copy(U.uC2.value);
    if(te<TL){o.g.copy(P0);o.gs=1.1*form;o.ga=0.35*form;o.li=2.5*form;}
    else if(te<TI){o.g.copy(op);o.gs=1.4;o.ga=0.5;o.li=4;}
    else{o.g.set(3.4,1.05,0);o.gs=2+5*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.85+0.08*tr0;o.li=13*Math.exp(-ia*4.5)+2*tr0;}
    if(lastPop>0){o.ia=te-lastPop;o.shake=0.4;o.dist=0.4;o.flash=0.4;}
    else{o.ia=ia;o.shake=1.8;o.dist=1.3;o.flash=1;}
    o.c.set(3.4,1.05,0);
  };
}};

// =====================================================================
// 3 · TADPOLE — un renacuajo de agua nace en la cola, pasa como una flecha junto al aliado dejándole una burbuja
//     (recarga de burbuja: la esfera se encoge y queda orbitando) y golpea al rival con un remolino de gafe (Jinx)
// =====================================================================
const tadpole={key:"qtTadpole",name:"Tadpole",pa:2,dur:2.0,ti:0.82,pal:"Rocío (Boca)",allies:1,
  phases:[["Nace",0],["Nado",0.12],["Burbuja",0.42],["Impacto",0.82],["Gafe",1.05]],
build(a){
  const L=a.L,T0=0.12,TM=0.42,TI=0.82,TE=1.95,P0=V3(-4.15,0.75,0),Q1=V3(-3.0,1.7,-1.0),M=V3(-1.5,1.3,-1.15),Q2=V3(0.9,0.55,-0.7),HP=V3(3.12,1.25,0.05);
  const AP=ALLY_POS[0], BC=V3(AP.x,0.95,AP.z);
  const bez=(A,B,D,k,o)=>{const u=1-k;return o.set(u*u*A.x+2*u*k*B.x+k*k*D.x,u*u*A.y+2*u*k*B.y+k*k*D.y,u*u*A.z+2*u*k*B.z+k*k*D.z);};
  const tp=(t,o)=>t<T0?o.copy(P0):t<TM?bez(P0,Q1,M,(t-T0)/(TM-T0),o):bez(M,Q2,HP,cl((t-TM)/(TI-TM)),o);
  // renacuajo (sprite SDF orientado en pantalla): cabeza oscura con borde luminoso y cola que ondula
  const tad=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.375),fx(`void main(){vec2 p=(vUv-.5)*vec2(2.,1.);
   float head=length((p-vec2(.55,0.))*vec2(1.,1.25))-.28;
   float tx=clamp((.4-p.x)/1.35,0.,1.);float ty=sin(p.x*7.+uT*28.)*.12*tx;float tw=.16*(1.-tx)+.01;
   float tail=max(max(abs(p.y-ty)-tw,-(p.x+.95)),p.x-.5);
   float d=min(head,tail);float body=smoothstep(.02,-.02,d);float rim=band(d,0.,.035);
   float eye=smoothstep(.06,.03,length(p-vec2(.68,.08)));
   vec3 c=mix(uC2*.35,uC2,smoothstep(0.,-.2,d))+uC1*rim*1.5+vec3(1.)*eye;
   gl_FragColor=vec4(c,(body*.85+rim)*uA);}`,Object.assign({depthTest:false},NB)));
  L.mesh.add(tad);
  // burbuja del aliado: envuelve al aliado y se condensa en una carga que orbita su cabeza
  const bub=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(IRIS_FS)); L.mesh.add(bub);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: remolino de gafe bajo el rival (sombra en mezcla normal + brazos luminosos) y onda bajo el aliado
  const whirlD=groundPlane(2.6,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sp=fract(an/6.2832*3.+r*1.8+uT*.7);float arms=band(sp,.5,.18)*smoothstep(1.,.3,r);
   gl_FragColor=vec4(vec3(.02,.04,.04),(arms*.55+smoothstep(.6,0.,r)*.35)*uA);}`,NB));
  const whirl=groundPlane(2.6,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sp=fract(an/6.2832*3.+r*1.8+uT*.7);float m=band(sp,.5,.05)*smoothstep(1.,.25,r)+band(r,.95,.02);
   gl_FragColor=vec4(mix(uC2,uC1,sp)*1.4,m*uA);}`));
  const aRing=gpz(2.4,AP.x,AP.z,0.03,fx(RIPPLE_FS)), tRing=groundPlane(2.6,3.4,0.03,fx(RIPPLE_FS));
  L.decal.add(whirlD,whirl,aRing,tRing);

  const C=`const float T0=${f(T0)};const float TM=${f(TM)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 HP=${v3(HP)};const vec3 BC=${v3(BC)};
  vec3 bez(vec3 A,vec3 B,vec3 D,float k){float u=1.-k;return u*u*A+2.*u*k*B+k*k*D;}
  vec3 tp(float t){if(t<T0)return P0;if(t<TM)return bez(P0,${v3(Q1)},${v3(M)},(t-T0)/(TM-T0));return bez(${v3(M)},${v3(Q2)},HP,clamp((t-TM)/(TI-TM),0.,1.));}`;
  // estela: burbujas y motas tras el renacuajo
  a.count+=points(L.part,140,C+`void main(){float s=T0+aSeed.x*(TI-T0);float life=.4+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=tp(s)+r*.08+vec3(0.,.35*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.06*aSeed.z);}`,BUBBLE_FS);
  a.count+=points(L.part,90,C+`void main(){float s=T0+aSeed.x*(TI-T0);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=tp(s)+r*.1+r*.25*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.03*aSeed.w)*(1.-age*.5));}`);
  // destellos sobre la burbuja del aliado
  a.count+=points(L.part,30,C+`void main(){float s=TM+aSeed.x*.5;float life=.25;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=BC+d*vec3(.95,1.1,.95);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.16*(1.-age*.5));}`,STAR4_FS);
  // impacto y gafe: salpicadura, chispas, motas oscuras que giran en torno a la cabeza
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.5+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.6,0.))*(1.4+2.6*aSeed.z);vec3 p=HP+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,DROP_FS);
  a.count+=sparks(L.part,80,TI,`${f(HP.x)},${f(HP.y)},${f(HP.z)}`,"-.5,.4,0.",2.5,7,2.5);
  a.count+=points(L.part,90,C+`void main(){float an=aSeed.x*6.2832+uT*(2.5+aSeed.y);float rad=.42+.18*aSeed.z;
   vec3 p=vec3(3.4+cos(an)*rad,1.95+(aSeed.w-.5)*.3+sin(uT*4.+aSeed.x*9.)*.05,sin(an)*rad);
   vA=uE*(.5+.5*sin(uT*9.+aSeed.y*30.));put(p,(.04+.05*aSeed.w)*uE);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.1,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(uC2*.5,uC1,smoothstep(.35,.0,d)*.6),a);}`,NB);
  a.count+=points(L.part,40,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rad=(1.-age)*.9*r.y+.1;vec3 p=vec3(3.4+cos(an)*rad,.05+age*.6,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.05*r.z);}`,BUBBLE_FS);

  const pos=V3(0,0,0), pa=V3(0,0,0), pb=V3(0,0,0), orb=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, im=te-TM, env=ss(TI,TI+0.2,te)*(1-ss(1.7,TE,te));
    // renacuajo: posición con ondulación y giro según su velocidad en pantalla
    tp(te,pos); const sw=te>T0&&te<TI?0.06*Math.sin(te*38):0; pos.y+=sw;
    tp(te+0.01,pa).project(camera); tp(te-0.01,pb).project(camera);
    const ang=Math.atan2(pa.y-pb.y,(pa.x-pb.x)*camera.aspect);
    const pop=ss(0.02,T0+0.06,te);
    tad.visible=pop>0.001&&te<TI+0.02; towardCam(tad.position,pos,0.1); billboard(tad,ang);
    tad.scale.setScalar(Math.max(pop*(1+0.15*Math.sin(te*20)),0.001)); set(tad,0,1);
    caster.rotation.z=0.06*Math.sin(te*30)*(1-ss(0,T0+0.1,te));
    // burbuja del aliado: crece al pasar el renacuajo, se condensa en una carga y orbita
    const grow=im>=0?1-Math.exp(-im*9)*Math.cos(im*12):0, cond=ss(0.95,1.2,te);
    const w=te*2.6; orb.set(AP.x+Math.cos(w)*0.55,1.85+0.08*Math.sin(te*3),AP.z+Math.sin(w)*0.55);
    bub.visible=im>=0&&te<TE; bub.position.lerpVectors(BC,orb,cond);
    const br=0.95+(0.17-0.95)*cond; bub.scale.set(Math.max(br*grow,0.001),Math.max(br*grow*(1.15-0.15*cond),0.001),Math.max(br*grow,0.001));
    set(bub,(im>=0?0.4*Math.exp(-im*8):0)+0.3*ss(0.95,1.05,te)*(1-ss(1.1,1.25,te)),1-ss(TE-0.15,TE,te));
    let p=cl(im/0.6); set(aRing,p,im>=0?(1-p)*0.8:0);
    glowM(allies[0],(im>=0?0.5*Math.exp(-im*5):0)+0.12*cond);
    p=cl(ia/0.35); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(tRing,p,ia>=0?(1-p)*0.7:0);
    whirl.material.uniforms.uA.value=env; whirlD.material.uniforms.uA.value=env;
    U.uE.value=env;
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.2; target.rotation.z=-hit*0.24*Math.cos(ia*14)+0.04*env*Math.sin(te*5);
    o.em=0.18*env; o.emc.copy(U.uC2.value);
    if(te<TI){o.g.copy(pos);o.gs=0.8;o.ga=0.3*pop;o.li=2.2*pop+(im>=0?2*Math.exp(-im*5):0);}
    else{o.g.copy(TC);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*11)*0.65;o.li=7*Math.exp(-ia*5)+env;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.6;o.flash=1;
  };
}};

// =====================================================================
// 4 · PUFF (X PA) — el Axie inhala aire (corrientes y motas que entran en espiral) y se infla; exhala dos ráfagas de
//     vapor ardiente con humo grisáceo que envuelven al rival (X = 2: dos impactos, uno por PA sobrante)
// =====================================================================
const puff={key:"qtPuff",name:"Puff",pa:2,dur:2.2,ti:1.02,pal:"Miel",
  phases:[["Inhalar",0],["Exhalar",0.88],["Impacto",1.02],["Segunda",1.26],["Vapor",1.55]],
build(a){
  const L=a.L,TIN=0.82,XT=[0.88,1.26],HT=[1.02,1.4],TE=2.15,JL=6.5;
  const inf=te=>ss(0,TIN,te)*(1-0.5*ss(XT[0],XT[0]+0.1,te)-0.5*ss(XT[1],XT[1]+0.1,te));
  const mouth=(te,o)=>{const k=inf(te);return o.set(-3.7+0.3*(1+0.3*k),1.52*(1+0.18*k),0);};
  // aire que entra: dos cintas en hélice que se estrechan hacia el Axie
  const inMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*8.+uT*9.,v*2.,0.));float st=pow(.5+.5*sin(u*18.+uT*20.),3.);
   gl_FragColor=vec4(mix(vec3(.9,.95,1.),uC1,.3)*1.2,smoothstep(1.,.2,v)*(.2+.5*st*n)*smoothstep(0.,.2,u)*smoothstep(1.,.85,u)*uA);}`);
  const inhale=new THREE.Group(); L.trail.add(inhale);
  for(let i=0;i<2;i++){const m=new THREE.Mesh(helixGeo(1.6,0.9,0.12,1.7,0.1,90).rotateZ(Math.PI/2),inMat);m.rotation.x=i*Math.PI;inhale.add(m);}
  // chorros de vapor: cono abierto (punta en la boca), vetas turbulentas, núcleo caliente y humo gris
  const STEAM_FS=`void main(){float u=vP.x/${f(JL)};if(u>uP)discard;float an=atan(vP.z,vP.y);
   float n=noise(vec3(u*8.-uT*9.,an*2.,uT))*.6+noise(vec3(u*20.-uT*16.,an*5.,3.))*.4;
   float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
   float head=smoothstep(.08,0.,uP-u)*step(uP,1.);
   vec3 hot=mix(uC1,vec3(1.),.5);vec3 c=mix(hot*1.4,vec3(.72,.7,.68),smoothstep(.1,.8,u))+uC2*head*.8;
   gl_FragColor=vec4(c,(smoothstep(.3,.7,n)*.55+.1)*fr*smoothstep(0.,.05,u)*(1.-u*.35)*uA);}`;
  const jets=XT.map(()=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.85,JL,32,12,true).rotateZ(Math.PI/2).translate(JL/2,0,0),fx(STEAM_FS));L.mesh.add(m);return m;});
  const rings=HT.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // suelo: anillo que se cierra al inhalar (bajo el Axie) y vaho húmedo bajo el rival
  const draw=groundPlane(2.6,-3.7,0.03,fx(RIPPLE_FS)), damp=groundPlane(2.8,3.4,0.018,fx(POOL_FS));
  const tR=HT.map(()=>groundPlane(2.8,3.4,0.03,fx(RIPPLE_FS)));
  L.decal.add(draw,damp,...tR);

  const C=`const float TIN=${f(TIN)};const vec3 M0=vec3(-3.31,1.72,0.);const vec3 HP=vec3(3.1,1.3,0.);
  float xt(float i){return i<.5?${f(XT[0])}:${f(XT[1])};}`;
  // inhalación: motas que entran en la boca
  a.count+=points(L.part,180,C+`void main(){float s=aSeed.x*(TIN-.25);float dur=.3+.1*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   vec3 d=normalize(rnd()+vec3(1.2,0.,0.));vec3 st=M0+d*(1.3+.9*aSeed.z);vec3 p=mix(st,M0,k*k);
   vA=(uT>s&&k<1.)?smoothstep(0.,.3,k):0.;put(p,.03+.03*aSeed.w);}`);
  // exhalaciones: humo gris que avanza y se abre, motas calientes
  a.count+=points(L.part,220,C+`void main(){float i=floor(aSeed.x*1.999);float s=xt(i)+fract(aSeed.x*2.)*.28;float t=uT-s;float life=.7+aSeed.y*.4;float age=t/life;float c=max(t,0.);
   vec3 r=rnd();float x=min(c*13.,6.4*(.75+.25*aSeed.z));vec3 p=M0+vec3(x,0.,0.)+r*vec3(.1,.3,.3)*(.4+x*.25)+vec3(0.,.25*c,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.35+.3*aSeed.w)*(.5+x*.12)*(.7+age*.5));}`,SMOKE_FS("vec3(.5,.49,.5)"),NB);
  a.count+=points(L.part,140,C+`void main(){float i=floor(aSeed.x*1.999);float s=xt(i)+fract(aSeed.x*2.)*.22;float t=uT-s;float life=.45+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   vec3 r=rnd();float x=min(c*15.,6.3);vec3 p=M0+vec3(x,0.,0.)+r*vec3(.1,.25,.25)*(.3+x*.2)+vec3(0.,.4*c,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(c*30.+aSeed.z*40.)):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.5));}`);
  // el rival envuelto en vapor
  a.count+=points(L.part,80,C+`void main(){float s=${f(HT[0])}+aSeed.x*.8;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(3.4+r.x*.6,.3+aSeed.z*1.5,r.z*.6)+vec3(r.x*.3*t,.6*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.5:0.;put(p,(.35+.3*aSeed.w)*(.7+age));}`,SMOKE_FS("vec3(.62,.6,.6)"),NB);
  HT.forEach(t=>{a.count+=sparks(L.part,55,t,"3.1,1.3,0.","-.5,.4,0.",2,6,2.2);});

  const mp=V3(0,0,0);
  a.pose=function(te,o){
    const k=inf(te); mouth(te,mp);
    caster.scale.set(1+0.3*k,1+0.18*k,1+0.3*k);
    caster.rotation.z=0.08*ss(0,TIN,te)*(1-ss(XT[0],XT[0]+0.08,te))-0.12*(hitK(te-XT[0],8)*(te>=XT[0]?1:0)+hitK(te-XT[1],8)*(te>=XT[1]?1:0));
    const ins=ss(0,0.15,te)*(1-ss(TIN-0.1,XT[0],te));
    inhale.visible=ins>0.001; inhale.position.set(mp.x+1.75,mp.y,0); inhale.rotation.x=te*5; inMat.uniforms.uA.value=ins;
    let p=1-ss(0,TIN,te); set(draw,0.25+0.7*p,ins*0.7);
    jets.forEach((m,i)=>{const d=te-XT[i];m.visible=d>=0&&d<0.75;m.position.copy(mp);
      m.scale.set(1,0.55+0.45*cl(d/0.2),0.55+0.45*cl(d/0.2));set(m,cl(d/(HT[i]-XT[i])),d<0.3?1:1-cl((d-0.3)/0.45));});
    rings.forEach((m,i)=>{const d=te-HT[i],q=cl(d/0.35);towardCam(m.position,TC,0.5);billboard(m);m.visible=d>=0&&q<1;set(m,q,1-q);});
    tR.forEach((m,i)=>{const d=te-HT[i],q=cl(d/0.6);set(m,q,d>=0?(1-q)*0.7:0);});
    set(damp,0.4+0.6*ss(HT[0],HT[1]+0.2,te),ss(HT[0],HT[0]+0.2,te)*(1-ss(1.8,TE,te))*0.7);
    // reacción: dos golpes y calor que persiste
    let li=-1; HT.forEach((t,i)=>{if(te>=t)li=i;}); const il=li>=0?te-HT[li]:-1;
    const kb=(te>=HT[0]?0.14*Math.exp(-(te-HT[0])*5):0)+(te>=HT[1]?0.2*Math.exp(-(te-HT[1])*4):0);
    target.position.x=3.4+kb+0.06*ss(HT[0],HT[1],te)*(1-ss(1.6,2.1,te)); target.rotation.z=-kb*1.2*Math.cos((il>0?il:0)*14);
    const heat=ss(HT[0],HT[0]+0.1,te)*(1-ss(1.6,TE,te)); o.em=0.25*heat; o.emc.copy(U.uC2.value);
    glowM(caster,0.25*k);
    if(te<XT[0]){o.g.copy(mp);o.gs=0.9*k+0.3;o.ga=0.25*k;o.li=1.5*k;}
    else if(li<0){o.g.set(mp.x+3,mp.y,0);o.gs=2;o.ga=0.35;o.li=4;}
    else{o.g.copy(TC);o.gs=1.4+3*il;o.ga=Math.exp(-il*10)*0.6+0.06*heat;o.li=7*Math.exp(-il*5)+1.5*heat;}
    o.ia=li>=0?il:te-HT[0]; o.c.copy(TC); o.shake=0; o.dist=0.6; o.flash=li===1?1:0.75;
  };
}};

// =====================================================================
// 5 · NIMO — tres coletazos rápidos de agua en la posición de la cola desatan una corriente marina que viaja por
//     dos hilos hasta los aliados: una chispa de energía se funde en cada uno (+1 PA) y los cura levemente. Nivel 1
// =====================================================================
const nimo={key:"qtNimo",name:"Nimo",pa:1,dur:1.2,ti:0.4,pal:"Menta",allies:2,
  phases:[["Coletazo",0],["Corriente",0.16],["Llegada",0.4],["Energía",0.55]],
build(a){
  const L=a.L,TS=0.16,TI=0.4,TE=1.15,SW=[0,0.06,0.12];
  const DEST=ALLY_POS.map(p=>V3(p.x,1.0,p.z));
  // coletazos: medias lunas de agua que barren junto a la cola (alternando sentido)
  const swish=SW.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.5),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));L.trail.add(m);return m;});
  // corriente: hilo de agua con pulsos que avanza de la cola a cada aliado
  const CUR_FS=`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float core=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
   float dash=pow(.5+.5*sin(u*40.-uT*30.),3.);float head=smoothstep(.08,0.,d);
   gl_FragColor=vec4(mix(uC2,uC1,dash)*1.4+vec3(1.)*head*.6,(.35+.65*dash+head)*core*uA);}`;
  const MID=[V3((TP.x+DEST[0].x)/2,1.7,-1.0),V3((TP.x+DEST[1].x)/2,1.5,-0.5)];
  const curves=DEST.map((d,i)=>new THREE.QuadraticBezierCurve3(TP.clone(),MID[i],d));
  const cur=curves.map(c=>{const m=new THREE.Mesh(new THREE.TubeGeometry(c,50,0.03,6,false),fx(CUR_FS));L.trail.add(m);return m;});

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 TP=${v3(TP)};
  vec3 cv(float i,float u){vec3 D=i<.5?${v3(DEST[0])}:${v3(DEST[1])};vec3 B=i<.5?${v3(MID[0])}:${v3(MID[1])};return mix(mix(TP,B,u),mix(B,D,u),u);}`;
  // gotas sacudidas por los coletazos
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*.18;float t=uT-s;float life=.35+aSeed.y*.2;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.4,0.))*(1.+1.5*aSeed.z);vec3 p=TP+v*c+vec3(0.,-4.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.035+.03*aSeed.w);}`,DROP_FS);
  // destellos que corren por la corriente
  a.count+=points(L.part,120,C+`void main(){float i=step(.5,aSeed.x);float s=TS+aSeed.y*(TI-TS);float u=clamp((uT-s)/.18,0.,1.);
   vec3 p=cv(i,u)+rnd()*.05;vA=(uT>s&&u<1.)?sin(u*3.14159):0.;put(p,.03+.03*aSeed.z);}`);
  // llegada: gotas y energía que se funde en cada aliado
  a.count+=points(L.part,80,C+`void main(){float i=step(.5,aSeed.x);vec3 D=cv(i,1.);float s=TI+aSeed.y*.05;float t=uT-s;float life=.35+aSeed.z*.2;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.3,0.))*(.8+1.2*aSeed.w);vec3 p=D+v*c+vec3(0.,-3.*c*c,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,8,C+`void main(){float i=step(.5,aSeed.x);float s=TI+aSeed.y*.08;float life=.22;float age=(uT-s)/life;
   vec3 p=cv(i,1.)+rnd()*.15;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.3*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,16,C+`void main(){float i=step(.5,aSeed.x);float s=TI+.05+aSeed.y*.25;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=cv(i,1.)+vec3(r.x*.35,-.3+aSeed.z*.8+t*.7,r.z*.35);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age)*(1.-age):0.;put(p,.11+.04*aSeed.w);}`,CROSS_FS);
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.25;float life=.3;float age=(uT-s)/life;
   float an=aSeed.y*6.2832+age*6.;vec3 p=TP+vec3(cos(an)*.35,(aSeed.z-.5)*.3+age*.2,sin(an)*.35);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.025+.025*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI;
    swish.forEach((m,i)=>{const d=te-SW[i],p=cl(d/0.09);towardCam(m.position,tmp.set(TP.x-0.1,TP.y+0.05*i,0),0.35);billboard(m,i%2?2.6:-0.5);
      m.visible=d>=0&&d<0.25;set(m,p*1.15,d>0.09?1-cl((d-0.09)/0.16):1);m.material.uniforms.uQ.value=0;});
    caster.rotation.z=0.04*Math.sin(te*55)*(1-ss(0.1,0.22,te));
    cur.forEach((m,i)=>{const d=te-TS;m.visible=d>=0&&te<0.85;set(m,d/(TI-TS)*1.02,te<0.6?1:1-cl((te-0.6)/0.25));});
    const ar=ia>=0?Math.exp(-ia*4):0;
    glowM(allies[0],0.7*ar); glowM(allies[1],0.7*ar);
    allies.forEach(d=>d.scale.set(1+0.04*hitK(ia,10),1+0.04*hitK(ia,10),1+0.04*hitK(ia,10)));
    if(te<TS){o.g.copy(TP);o.gs=0.6;o.ga=0.25;o.li=1.5;}
    else if(te<TI){curves[0].getPoint(cl((te-TS)/(TI-TS)),tmp2);o.g.copy(tmp2);o.gs=0.7;o.ga=0.25;o.li=2;}
    else{o.g.set(-3.45,1.0,-1.6);o.gs=1+2*Math.min(ia,0.3);o.ga=0.35*ar;o.li=3.5*ar;}
    o.ia=ia;o.c.copy(DEST[0]);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 6 · NAVAGA — tres espinas de agua se condensan junto a la cola y salen disparadas en ráfaga como agujas cian,
//     con anillos sónicos (sonido penetrante); se clavan en el rival y luego se deshacen en gotas
// =====================================================================
const navaga={key:"qtNavaga",name:"Navaga",pa:2,dur:1.8,ti:0.67,pal:"Loto",
  phases:[["Espinas",0],["Disparo",0.36],["Impactos",0.53],["Clavadas",0.75],["Disolución",1.2]],
build(a){
  const L=a.L,TL=[0.36,0.43,0.5],FT=0.17,TI=0.67,TD=1.2,TE=1.75;
  const S=[0,1,2].map(i=>V3(-4.35+0.05*i,0.95+0.24*(i-1),0.22*(i-1)));
  const H=[0,1,2].map(i=>V3(3.06,1.25+0.2*(i-1),0.1*(i-1)));
  const AR=TL.map(t=>t+FT);
  // aguja: cono fino con la punta en el origen; brillo que corre hacia la punta
  const needles=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.75,8,1).rotateZ(-Math.PI/2).translate(-0.375,0,0),fx(`void main(){float u=-vP.x/.75;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);float sh=pow(.5+.5*sin(u*30.-uT*40.),4.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5*(1.-u))*1.5+uC2*sh*.4,(.7+.3*fr)*smoothstep(1.,.85,u)*uA);}`));
    m.rotation.z=Math.atan2(H[i].y-S[i].y,H[i].x-S[i].x);L.mesh.add(m);return m;});
  // estelas sónicas: banda fina con ondas de presión que corren
  const SON_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float core=exp(-v*14.);float bands=pow(.5+.5*sin(u*60.-uT*90.),3.);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.6+vec3(1.)*core*.4,(core*(.5+.5*bands)+exp(-v*4.)*.2*bands)*pow(u,1.2)*uA);}`;
  const trails=[0,1,2].map(i=>{const g=crossTrail(L,0.18,fx(SON_FS));g.rotation.z=needles[i].rotation.z;return g;});
  const lRings=S.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const hRings=H.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const tRing=groundPlane(2.6,3.4,0.03,fx(RIPPLE_FS)); L.decal.add(tRing);

  const C=`vec3 sp(float i){return i<.5?${v3(S[0])}:(i<1.5?${v3(S[1])}:${v3(S[2])});}
  vec3 hp(float i){return i<.5?${v3(H[0])}:(i<1.5?${v3(H[1])}:${v3(H[2])});}
  float tl(float i){return i<.5?${f(TL[0])}:(i<1.5?${f(TL[1])}:${f(TL[2])});}`;
  // condensación: agua que se enrosca sobre cada aguja
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*2.999);float s=aSeed.y*(tl(i)-.12);float life=.22+aSeed.z*.1;float age=(uT-s)/life;
   vec3 en=sp(i)+vec3(-aSeed.w*.75,0.,0.);vec3 d=normalize(rnd()+.0001);float an=(1.-age)*4.;
   vec3 p=en+vec3(d.x,d.y*cos(an)-d.z*sin(an),d.y*sin(an)+d.z*cos(an))*mix(.6,.03,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.w);}`);
  // gotas que se desprenden en vuelo
  a.count+=points(L.part,105,C+`void main(){float i=floor(aSeed.x*2.999);float s=tl(i)+aSeed.y*${f(FT)};float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=mix(sp(i),hp(i),(s-tl(i))/${f(FT)})+rnd()*.04+vec3(-.6*t,-1.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.w);}`,DROP_FS);
  // impactos: chispas y salpicadura por aguja
  AR.forEach((t,i)=>{a.count+=sparks(L.part,45,t,`${f(H[i].x)},${f(H[i].y)},${f(H[i].z)}`,"-.6,.3,0.",2,i===2?7:5,2.5);});
  a.count+=points(L.part,90,C+`void main(){float i=floor(aSeed.x*2.999);float s=tl(i)+${f(FT)};float t=uT-s;float life=.4+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.8,.4,0.))*(1.2+2.*aSeed.z);vec3 p=hp(i)+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,DROP_FS);
  // disolución: las agujas clavadas se deshacen en gotas que caen
  a.count+=points(L.part,60,C+`void main(){float i=floor(aSeed.x*2.999);float s=${f(TD)}+aSeed.y*.3;float t=uT-s;float life=.5+aSeed.z*.3;float age=t/life;float c=max(t,0.);
   vec3 p=hp(i)+vec3(-.6*aSeed.w,0.,0.)+rnd()*.03+vec3(0.,-3.5*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.04+.03*aSeed.w);}`,DROP_FS);

  a.pose=function(te,o){
    const ia=te-TI; let li=-1; AR.forEach((t,i)=>{if(te>=t)li=i;});
    needles.forEach((m,i)=>{const k=cl((te-TL[i])/FT),form=ss(0.04+0.06*i,TL[i]-0.04,te),gone=1-ss(TD,TD+0.3,te);
      const stuck=te>=AR[i], jit=stuck?0.03*Math.exp(-(te-AR[i])*12)*Math.sin((te-AR[i])*80):0;
      if(te<TL[i])m.position.set(S[i].x-0.08*ss(TL[i]-0.12,TL[i],te),S[i].y+0.04*Math.sin(te*8+i),S[i].z);
      else if(!stuck)m.position.lerpVectors(S[i],H[i],k);
      else m.position.set(H[i].x+0.12+jit,H[i].y,H[i].z);
      m.visible=form*gone>0.001; m.scale.set(Math.max(form*gone,0.001),Math.max(form,0.001),Math.max(form,0.001));
      set(m,0,0.6+0.4*form+(stuck?0.6*Math.exp(-(te-AR[i])*6):0));
      const tg=trails[i],tr=te-TL[i]; tg.visible=tr>=0&&te<AR[i]+0.15;
      tg.position.copy(te<AR[i]?m.position:H[i]); tg.scale.set(Math.max(S[i].distanceTo(tg.position),0.001),1,1);
      tg.userData.mat.uniforms.uA.value=te<AR[i]?1:1-cl((te-AR[i])/0.15);
      let p=cl(tr/0.25); towardCam(lRings[i].position,S[i],0.2); billboard(lRings[i]); lRings[i].visible=tr>=0&&p<1; set(lRings[i],p,1-p);
      const d=te-AR[i]; p=cl(d/0.3); towardCam(hRings[i].position,H[i],0.45); billboard(hRings[i]); hRings[i].visible=d>=0&&p<1; set(hRings[i],p,1-p);});
    caster.rotation.z=-0.06*ss(0.2,TL[0],te)+0.1*hitK(te-TL[0],6)*(te>=TL[0]?1:0);
    let p=cl(ia/0.6); set(tRing,p,ia>=0?(1-p)*0.8:0);
    let kb=0; AR.forEach((t,i)=>{if(te>=t)kb+=(i===2?0.16:0.07)*Math.exp(-(te-t)*7);});
    target.position.x=3.4+kb; target.rotation.z=-kb*1.3*Math.cos((li>=0?te-AR[li]:0)*16);
    if(li<0&&te<TL[0]){const k=ss(0,TL[0],te);o.g.set(-4.4,1.0,0);o.gs=0.8*k;o.ga=0.3*k;o.li=2*k;}
    else if(li<0){const k=cl((te-TL[0])/FT);o.g.set(-4.3+7.4*k,1.2,0);o.gs=0.9;o.ga=0.35;o.li=3;}
    else{const il=te-AR[li];o.g.copy(H[li]);o.gs=(li===2?1.3:0.9)+2.5*il;o.ga=Math.exp(-il*12)*(li===2?0.7:0.4);o.li=(li===2?7:4)*Math.exp(-il*6);}
    o.ia=li>=0?te-AR[li]:te-AR[0]; o.c.copy(TC); o.shake=0; o.dist=li===2?0.7:0.35; o.flash=li===2?1:0.6;
  };
}};

// =====================================================================
// 7 · SHRIMP — el Axie se encoge y se impulsa hacia atrás como un camarón dejando una estela de espuma blanca en el
//     suelo, mientras dispara un proyectil de agua en arco al rival más alejado; luego vuelve nadando a su sitio
// =====================================================================
const shrimp={key:"qtShrimp",name:"Shrimp",pa:2,dur:2.1,ti:1.0,pal:"Pureza",enemies:2,
  phases:[["Encogerse",0],["Impulso",0.24],["Disparo",0.3],["Impacto",1.0],["Regreso",1.35]],
build(a){
  const L=a.L,TB=0.24,TK=0.55,TF=0.3,TI=1.0,TR=1.35,TRE=1.95,XB=-5.15,ARC=0.9;
  const E=ENEMY_POS[1], EC=V3(E.x-0.25,1.2,E.z+0.1);
  const cx=te=>te<TB?-3.7+0.08*ss(0,TB,te):te<TR?-3.62+(XB+3.62)*(1-Math.pow(1-cl((te-TB)/(TK-TB)),3)):XB+(-3.7-XB)*ss(TR,TRE,te);
  const F0=V3(cx(TF)+0.4,1.1,0);
  const bolt=(te,o)=>{const k=cl((te-TF)/(TI-TF));return o.set(F0.x+(EC.x-F0.x)*k,F0.y+(EC.y-F0.y)*k+4*ARC*k*(1-k),F0.z+(EC.z-F0.z)*k);};
  // proyectil: gota alargada con remolino en espiral y estela cruzada
  const boltG=new THREE.Group(); L.mesh.add(boltG);
  const core=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(CAUS+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float sw=pow(.5+.5*sin(atan(vP.z,vP.y)*2.+vP.x*9.-uT*30.),4.);float c=caus(vP*3.+vec3(uT*4.,0.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,fr+sw*.5)*1.3+vec3(1.)*(sw*.3+c*.3),(.3+.6*fr+sw*.3)*uA);}`));
  core.scale.set(0.36,0.19,0.19); boltG.add(core);
  const trail=crossTrail(L,0.42,fx(WAKE_FS));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: estela de espuma por donde pasó el Axie, onda bajo él (lo sigue) y onda bajo el rival lejano
  const X0=XB-0.3,X1=-3.4,LEN=X1-X0;
  const wake=groundPlane(LEN,(X0+X1)/2,0.02,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u<uP||u>.93)discard;
   float n=noise(vec3(u*25.,vUv.y*6.,uT*1.5))*.6+noise(vec3(u*60.,vUv.y*14.,uT*2.))*.4;
   float foam=smoothstep(.42,.75,n)*smoothstep(.75+.25*n,.2,v);float edge=band(v,.6+.2*n,.12);
   gl_FragColor=vec4(mix(uC2,uC1,foam)*1.2+vec3(.6)*foam,(foam*.8+edge*.4)*smoothstep(uP,uP+.08,u)*uA);}`),0.9);
  const kick=groundPlane(2.4,-3.7,0.03,fx(RIPPLE_FS)), eRing=gpz(2.8,E.x,E.z,0.03,fx(RIPPLE_FS)), ePool=gpz(2.2,E.x,E.z,0.018,fx(POOL_FS));
  L.decal.add(wake,kick,eRing,ePool);

  const C=`const float TB=${f(TB)};const float TK=${f(TK)};const float TF=${f(TF)};const float TI=${f(TI)};const vec3 F0=${v3(F0)};const vec3 EC=${v3(EC)};const vec3 E=${v3(E)};
  float cx(float t){if(t<TB)return -3.7;float k=clamp((t-TB)/(TK-TB),0.,1.);return -3.62+${f(XB+3.62)}*(1.-pow(1.-k,3.));}
  vec3 bolt(float t){float k=clamp((t-TF)/(TI-TF),0.,1.);return mix(F0,EC,k)+vec3(0.,4.*k*(1.-k)*${f(ARC)},0.);}`;
  // encogerse: gotas que se arremolinan en la cola
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*(TB-.08);float life=.2;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=${v3(TP)}+d*mix(.7,.05,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.03*aSeed.z);}`,DROP_FS);
  // estela de espuma blanca y burbujas a lo largo del impulso
  a.count+=points(L.part,150,C+`void main(){float s=TB+aSeed.x*(TK-TB+.1);float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s)+.2+r.x*.3,.06+aSeed.z*.45*(1.-age),r.z*.45)+vec3(.3*t,0.,r.z*.3*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.85:0.;put(p,(.22+.18*aSeed.w)*(.6+age*.6));}`,FOAM_FS,NB);
  a.count+=points(L.part,90,C+`void main(){float s=TB+aSeed.x*(TK-TB);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s)+.3,.3+aSeed.z*.9,r.z*.35)+vec3(.4*t,.6*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.05+.05*aSeed.w);}`,BUBBLE_FS);
  // gotas del proyectil en vuelo
  a.count+=points(L.part,170,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.35+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bolt(s)+r*.1+vec3(r.x*.2*t,-2.5*t*t,r.z*.2*t);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.04+.05*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  // impacto en el rival lejano: corona, espuma y chispas
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.55+aSeed.y*.35;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.6,.2))*(1.5+2.6*aSeed.z);vec3 p=EC+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,.05+.06*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.1;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=EC+r*vec3(.3,.4,.3)+r*.5*(1.-exp(-t*3.))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.18+.14*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  a.count+=sparks(L.part,90,TI,`${f(EC.x)},${f(EC.y)},${f(EC.z)}`,"-.4,.4,.2",2.5,7,2.5);

  const bp=V3(0,0,0), bq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, x=cx(te), dash=te>=TB&&te<TK?1-cl((te-TB)/(TK-TB)):0;
    // encogerse, salir despedido hacia atrás y volver nadando
    const curl=ss(0,TB,te)*(1-ss(TB,TB+0.1,te));
    caster.position.x=x; caster.scale.set(1+0.12*curl,1-0.2*curl,1+0.12*curl);
    caster.rotation.z=0.4*ss(TB,TB+0.06,te)*(1-ss(TK,TR,te))+0.08*Math.sin(te*14)*ss(TR,TR+0.1,te)*(1-ss(TRE-0.2,TRE,te));
    glowM(caster,0.25*dash);
    // proyectil
    bolt(te,bp); bolt(te+0.01,bq); bq.sub(bp);
    boltG.visible=te>=TF&&te<TI; boltG.position.copy(bp); aim(boltG,bq);
    boltG.scale.setScalar(Math.max(ss(TF,TF+0.06,te),0.001)); set(core,0,1); core.rotation.x=te*12;
    trail.visible=te>TF&&ia<0.15; trail.position.copy(bp); aim(trail,bq);
    trail.scale.set(Math.max(Math.min((te-TF)*8,1.6),0.001),1,1); trail.userData.mat.uniforms.uA.value=ia>0?1-cl(ia/0.15):1;
    let p=cl(ia/0.35); towardCam(hitRing.position,EC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // suelo
    set(wake,cl((x-X0)/LEN),te>=TB?1-ss(1.4,TRE,te):0);
    kick.position.x=x; const ik=te-TB; p=cl(ik/0.5); set(kick,p,ik>=0?(1-p)*0.8:0);
    p=cl(ia/0.6); set(eRing,p,ia>=0?1-p:0); set(ePool,0.5+0.5*ss(TI,TI+0.3,te),ia>=0?0.7*(1-ss(1.6,2.05,te)):0);
    // el rival más lejano recibe el golpe (destello propio: el motor solo destella al objetivo)
    const hit=hitK(ia,5), e1=enemies[1];
    e1.position.x=E.x+hit*0.25; e1.rotation.z=-hit*0.25*Math.cos(ia*14); glowM(e1,1.3*hitK(ia,10),U.uC1.value);
    if(te<TF){o.g.set(x-0.3,0.8,0);o.gs=0.8;o.ga=0.25*ss(0,TB,te);o.li=1.5;}
    else if(te<TI){o.g.copy(bp);o.gs=1.1;o.ga=0.45;o.li=3.5;}
    else{o.g.copy(EC);o.gs=1.3+3*ia;o.ga=Math.exp(-ia*11)*0.65;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(EC);o.shake=0;o.dist=0.6;o.flash=0;
  };
}};

VFX.module("Acuático · Cola",[koi,ranchu,tadpole,puff,nimo,navaga,shrimp]);
})();

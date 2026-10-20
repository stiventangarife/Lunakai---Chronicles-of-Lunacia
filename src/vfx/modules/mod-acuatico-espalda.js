// =====================================================================
// MÓDULO · CLASE ACUÁTICO (ESPALDA)
// Mismo contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Estética de clase: agua translúcida, burbujas irisadas, nácar, espuma y mareas. Los efectos nacen de la espalda
// (≈ -3.85,1.25,0) sin dibujar la parte. Cada habilidad ya está a la escala de su nivel (pa).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,BUBBLE_FS,CROSS_FS,helixGeo,camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0);                  // pecho del objetivo, cara visible
const CB=V3(-3.85,1.25,0);                // espalda del lanzador
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const glowM=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
// plano de suelo con z propia (aliados y rivales no están en z=0)
const gpz=(s,x,z,y,mat,w)=>{const m=groundPlane(s,x,y,mat,w);m.position.z=z;return m;};

// ---------- piezas de agua compartidas por el módulo ----------
// gota: esfera de agua con borde refractado y brillo especular
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float body=smoothstep(.5,.4,d);float rim=smoothstep(.2,.46,d)*body;
 float hl=smoothstep(.13,0.,length(q-vec2(-.13,-.13)));
 float a=(body*.22+rim*.75+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3+hl*.6)*1.3,a);}`;
// espuma: copo blanco irregular (mezcla normal)
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*6.,vMix*40.));
 float a=smoothstep(.5,.15,d+(n-.5)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.9,.96,1.),uC1,.18)*(.82+.3*n),a*.9);}`;
// media luna pequeña (rayos lunares, reflejo)
const CRESC_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=smoothstep(.42,.36,length(q))*smoothstep(.25,.31,length(q-vec2(.15,-.1)));
 float a=c*vA;if(a<.003)discard;gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.5,a);}`;
// raya de velocidad horizontal
const STREAK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float a=smoothstep(.06,0.,abs(q.y))*smoothstep(.5,.1,abs(q.x))*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.6,a);}`;
// ondas concéntricas de agua en el suelo (uP avance, uA intensidad)
const RIPPLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,uT*.7));float rr=r+(n-.5)*.05;
 float m=0.;for(int i=0;i<3;i++){float fi=float(i);float c=uP-fi*.18;m+=band(rr,c,.04+.03*fi)*step(0.,c)*(1.-fi*.28);}
 m*=smoothstep(1.,.85,r);
 gl_FragColor=vec4(mix(uC2,uC1,.65)*1.3+vec3(.25)*m,m*uA);}`;
// charco/estanque con cáusticas; uP = radio relativo
const POOL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n1=noise(vec3(p*9.,uT*.8)),n2=noise(vec3(p*17.+3.,uT*1.1));
 float cs=pow(1.-abs(n1-n2),10.);
 float e=r/max(uP,.001)+(noise(vec3(p*5.,1.))-.5)*.2;
 float body=smoothstep(1.,.8,e);float rim=band(e,.92,.08);
 gl_FragColor=vec4(mix(uC2,uC1,cs+rim)*1.2,(body*(.12+cs*.5)+rim*.6)*uA);}`;
// cáusticas para mallas de agua
const CAUS=`float caus(vec3 p){float a=noise(p),b=noise(p*1.7+vec3(3.1,1.7,.5));return pow(1.-abs(a-b),8.);}`;
// bola de agua: fresnel + cáusticas
const WBALL_FS=CAUS+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
 float c=caus(vP*3.+vec3(0.,uT*2.,uT));
 gl_FragColor=vec4(mix(uC2,uC1,fr+c*.5)*1.2+vec3(1.)*c*.4,(.1+.6*fr+c*.3)*uA);}`;
// película de burbuja irisada (fresnel + interferencia de capa fina); uP = destello al reventar
const IRIS_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
 float th=noise(vP*2.+vec3(0.,uT*.6,0.))*1.5+fr*2.+vP.y*.6;
 vec3 iri=.5+.5*cos(6.2832*(th+vec3(0.,.33,.67)));
 vec3 c=mix(uC1,iri,.5)*(.3+1.2*fr)+vec3(1.)*pow(fr,6.)*.6;
 float hl=smoothstep(.96,1.,dot(normalize(vN),normalize(vec3(-.4,.6,.7))));
 gl_FragColor=vec4(c+vec3(hl)+vec3(1.)*uP,(.05+.6*fr+hl+uP*.5)*uA);}`;
// hilo de agua sobre un tubo: cabeza en uP y cola que se drena
const STREAM_FS=`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
 float core=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
 float n=noise(vec3(u*34.-uT*22.,vUv.y*6.,0.));
 float tail=exp(-d*3.5)*(.5+.5*n);float head=smoothstep(.06,0.,d);
 gl_FragColor=vec4(mix(uC2,uC1,tail+.2)*1.4+vec3(.85,.97,1.)*(head+n*tail*.35),(tail+head)*core*uA);}`;
// pétalo/escama alargada con giro (vR)
const PETAL_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=length(q*vec2(2.2,1.1));float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.25,0.,length((q-vec2(0.,-.12))*vec2(3.,1.5)));
 gl_FragColor=vec4(mix(uC1,vec3(.9,.97,1.),.35+hl*.5)*1.3,a*(.55+.45*smoothstep(.45,.2,d)));}`;

// =====================================================================
// 1 · ANEMONE — tentáculos de anémona brotan de la espalda, lanzan un latigazo de agua urticante al rival y, tras el
//     golpe, sorben agua pura de un charco a sus pies (pulsos que bajan por los tentáculos) que cura a todo el escuadrón
// =====================================================================
const anemone={key:"qeAnemone",name:"Anemone",pa:2,dur:2.3,ti:0.8,pal:"Sakura",allies:2,
  phases:[["Despliegue",0],["Latigazo",0.48],["Impacto",0.8],["Succión",1.0],["Cura",1.45],["Repliegue",1.95]],
build(a){
  const L=a.L,TU=0.42,TJ=0.48,TI=0.8,TS=1.0,TH=1.45,TR=1.95,TE=2.28,N=7;
  const BASE=V3(-3.86,1.3,0), HP=V3(3.12,1.3,0);
  // tentáculo: crece de la base a la punta (uP); anillos rosados, punta luminosa; uQ = pulsos de agua que bajan
  const TENT_FS=`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float ring=pow(.5+.5*sin(u*46.-uT*4.),3.);
   float tip=smoothstep(.72,1.,u)+smoothstep(.05,0.,uP-u)*step(uP,.99);
   float fl=0.;for(int i=0;i<3;i++){float c=fract(uQ*1.6-float(i)*.333);fl+=band(u,1.-c,.07);}
   fl*=step(.001,uQ);
   vec3 c=mix(uC2,uC1,.3+.4*ring+tip*.5)*(.5+.9*fr)+vec3(.75,.95,1.)*fl*1.3;
   gl_FragColor=vec4(c,clamp(.45+.55*fr+fl,0.,1.)*uA);}`;
  const tents=[];
  for(let i=0;i<N;i++){const s=(i-(N-1)/2)/((N-1)/2),as=Math.abs(s),w=0.1*Math.sin(i*2.1);
    const pts=[V3(0,0,0),V3(-0.12-0.05*as,0.24,0.16*s),V3(-0.2-0.18*as+w,0.55+0.08*(1-as),0.42*s),
      V3(-0.12-0.32*as+w,0.86+0.22*(1-as),0.66*s),V3(0.06-0.25*as+w,1.04+0.26*(1-as),0.78*s)];
    const g=new THREE.Group(); g.position.copy(BASE); L.mesh.add(g);
    const m=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),40,7,0.06,0.012),fxU(TENT_FS,{uQ:{value:0}}));
    g.add(m); g.userData={i,s,d:as*0.08+0.03*((i*0.618)%1)}; tents.push([g,m]);}
  // latigazo: chorro en arco desde la copa de tentáculos hasta el pecho del rival
  const JC=new THREE.QuadraticBezierCurve3(V3(-3.75,2.25,0),V3(-0.3,3.5,0.3),HP.clone());
  const jet=new THREE.Mesh(new THREE.TubeGeometry(JC,90,0.075,8,false),fx(STREAM_FS)); L.trail.add(jet);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: charco de agua pura que se encoge al ser sorbido; ondas de cura bajo cada miembro del escuadrón
  const pool=groundPlane(2.6,-3.7,0.02,fx(POOL_FS));
  const SQ=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]];
  const healR=SQ.map(p=>gpz(2.3,p.x,p.z,0.03,fx(RIPPLE_FS)));
  const tRing=groundPlane(2.4,3.4,0.03,fx(RIPPLE_FS));
  L.decal.add(pool,tRing,...healR);

  const C=`const float TU=${f(TU)};const float TJ=${f(TJ)};const float TI=${f(TI)};const float TS=${f(TS)};const float TH=${f(TH)};
  const vec3 BASE=${v3(BASE)};const vec3 HP=${v3(HP)};
  vec3 bz(float u){vec3 A=vec3(-3.75,2.25,0.),B=vec3(-.3,3.5,.3);return mix(mix(A,B,u),mix(B,HP,u),u);}
  vec3 sq(float i){return i<.5?vec3(-3.7,0.,0.):(i<1.5?${v3(ALLY_POS[0])}:${v3(ALLY_POS[1])});}`;
  // despliegue: motas rosadas que brotan con los tentáculos
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*TU;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=BASE+vec3(-.15-.3*aSeed.z,.2+.9*aSeed.x,(aSeed.w-.5)*1.4)+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.03+.03*aSeed.y);}`);
  // gotas que suelta el chorro en vuelo
  a.count+=points(L.part,100,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.3+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=clamp((s-TJ)/(TI-TJ)*1.05,0.,1.);vec3 r=rnd();vec3 p=bz(u)+r*.08+vec3(r.x*.3*t,-2.5*t*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.05+.05*aSeed.w)*(1.-age*.4));}`,DROP_FS);
  // impacto: salpicadura, chispas urticantes y destellos de nematocisto
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.55+aSeed.y*.35;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.7,0.))*(1.5+2.8*aSeed.z);vec3 p=HP+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.05+.06*aSeed.w);}`,DROP_FS);
  a.count+=sparks(L.part,80,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.5,.4,0.",2.5,7,2.5);
  a.count+=points(L.part,14,C+`void main(){float s=TI+.03+aSeed.x*.25;float life=.18;float age=(uT-s)/life;vec3 p=HP+rnd()*vec3(.35,.5,.35);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.22*(1.-age*.5));}`,STAR4_FS);
  // succión: gotas del charco que suben en arco hasta las puntas de los tentáculos
  a.count+=points(L.part,170,C+`void main(){float s=TS+aSeed.x*(TH-TS-.12);float dur=.35+.12*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   float an=aSeed.z*6.2832;float rd=.5+.6*aSeed.w;vec3 st=vec3(-3.7+cos(an)*rd,.03,sin(an)*rd);
   vec3 en=BASE+vec3(-.15-.2*aSeed.w,.95+.2*aSeed.y,(aSeed.z-.5)*1.3);
   vec3 p=mix(st,en,k*k*(3.-2.*k))+vec3(0.,sin(k*3.14159)*.25,0.);
   vA=(uT>s&&k<1.)?smoothstep(0.,.15,k)*(1.-smoothstep(.85,1.,k)):0.;put(p,.04+.04*aSeed.y);}`,DROP_FS);
  // cura: cruces y espirales de agua sobre el lanzador y los dos aliados
  a.count+=points(L.part,54,C+`void main(){float i=floor(aSeed.x*2.999);float s=TH+aSeed.y*.45;float life=.7+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=sq(i)+vec3(r.x*.55,.3+aSeed.w*1.2+t*.9,r.z*.55);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.16+.08*aSeed.w);}`,CROSS_FS);
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*2.999);float s=TH+aSeed.y*.4;float life=.6+aSeed.z*.4;float age=(uT-s)/life;
   float an=aSeed.w*6.2832+age*5.;float rad=.6-.25*age;vec3 p=sq(i)+vec3(cos(an)*rad,.05+age*(1.6+aSeed.z*.6),sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.04*aSeed.z);}`);

  const gp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, out=1-ss(TR,TE,te);
    const lash=ss(TJ-0.04,TJ+0.08,te)*(1-ss(TJ+0.15,TI+0.1,te));
    const suck=ss(TS-0.05,TS+0.1,te)*(1-ss(TH+0.1,TH+0.35,te));
    caster.rotation.z=0.06*ss(0,TU,te)-0.12*lash+0.03*Math.sin(te*3)*suck;
    for(const [g,m] of tents){const u=g.userData,gr=1-Math.pow(1-cl((te-u.d)/TU),3);
      const wav=0.1*Math.sin(te*3.2+u.i*0.9)+0.05*Math.sin(te*7+u.i*2);
      g.rotation.set(0.12*Math.sin(te*2.4+u.i*1.3)*u.s,0,wav-0.75*lash*(1-0.4*Math.abs(u.s))+0.15*suck*Math.sin(te*9+u.i));
      m.visible=gr*out>0.002;
      m.material.uniforms.uP.value=Math.min(gr,1.01)*out;
      m.material.uniforms.uA.value=0.75+0.35*lash+0.4*hitK(ia,6)+0.3*suck;
      m.material.uniforms.uQ.value=suck>0.01?te-TS:0;}
    jet.visible=te>=TJ&&ia<0.3; set(jet,(te-TJ)/(TI-TJ)*1.02,ia>0?1-cl(ia/0.3):1);
    let p=cl(ia/0.35); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(tRing,p,ia>=0?(1-p)*0.8:0);
    set(pool,1-0.85*ss(TS,TH,te),ss(TS-0.25,TS,te)*(1-ss(TH,TH+0.3,te)));
    const he=te>=TH?Math.exp(-(te-TH)*2.2):0;
    healR.forEach((r,i)=>{const d=te-TH-0.05*i,q=cl(d/0.8);set(r,q,d>=0?(1-q)*0.9:0);});
    glowM(caster,0.18*suck+0.55*he); glowM(allies[0],0.55*he); glowM(allies[1],0.55*he);
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.22; target.rotation.z=-hit*0.25*Math.cos(ia*14);
    if(te<TJ){const k=ss(0,TU,te);o.g.set(-4.0,2.0,0);o.gs=0.9*k;o.ga=0.3*k;o.li=1.6*k;}
    else if(te<TI){JC.getPoint(cl((te-TJ)/(TI-TJ)),gp);o.g.copy(gp);o.gs=1.1;o.ga=0.5;o.li=3.5;}
    else if(te<TS){o.g.copy(TC);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*11)*0.65;o.li=7*Math.exp(-ia*6);}
    else if(te<TH){o.g.set(-4.0,1.9,0);o.gs=1.2;o.ga=0.2*suck;o.li=2.5*suck;}
    else{o.g.set(-3.0,1.0,-0.9);o.gs=2.4;o.ga=0.25*he;o.li=4*he+0.5;}
    if(te<TH){o.ia=ia;o.c.copy(TC);o.dist=0.7;o.flash=1;}
    else{o.ia=te-TH;o.c.set(-3.7,0.9,0);o.dist=0.25;o.flash=0;}
    o.shake=0;
  };
}};

// =====================================================================
// 2 · BLUE MOON — una luna azul se alza sobre el rival y desata una lluvia de rayos lunares cian; el rayo central
//     le cae encima. Después, el reflejo de la luna aparece en el agua a los pies del Axie (+1 PM) y lo ilumina
// =====================================================================
const blueMoon={key:"qeBlueMoon",name:"Blue Moon",pa:2,dur:2.3,ti:0.95,pal:"Rocío (Espalda)",
  phases:[["Luna",0],["Rayos",0.62],["Impacto",0.95],["Reflejo",1.2],["Ocaso",1.85]],
build(a){
  const L=a.L,TM=0.55,TR=0.62,TI=0.95,TF=1.2,TD=1.85,TE=2.25,MP=V3(3.4,4.9,-1.3),NR=9,RH=4.5,FD=0.16;
  // rayos: el 0 es el central (sobre la cabeza, impacto principal); el resto caen alrededor escalonados
  const RP=[],RT=[];
  for(let i=0;i<NR;i++){const an=i*2.39996,rd=i===0?0:0.35+0.55*((i*0.618)%1);
    RP.push(V3(3.4+Math.cos(an)*rd,i===0?1.9:0.03,Math.sin(an)*rd*0.85));RT.push(i===0?TI:TR+0.1+((i*0.37)%1)*0.5);}
  const RG=`vec4 ray(float i){`+RP.map((r,i)=>`if(i<${i}.5)return vec4(${f(r.x)},${f(r.y)},${f(r.z)},${f(RT[i])});`).join("")+`return vec4(0.);}`;
  // luna: disco con mares y cráteres por ruido, limbo oscurecido, halo y rayos suaves; uP = latido al disparar
  const moon=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float disk=smoothstep(.62,.6,r);
   float n=noise(vec3(p*3.,1.))*.6+noise(vec3(p*8.,4.))*.4;
   float cr=smoothstep(.55,.7,noise(vec3(p*5.,9.)))+band(noise(vec3(p*9.,2.)),.62,.03)*.6;
   float limb=pow(r/.6,3.);
   vec3 c=mix(uC1,uC2,cr*.55+limb*.45)*(1.05+.3*n);
   float halo=pow(max(0.,1.-r),2.5)*.6+band(r,.66,.04)*.4;
   float rays=pow(abs(cos(atan(p.y,p.x)*6.+uT*.4)),20.)*smoothstep(1.,.62,r)*step(.62,r)*.35;
   float glo=(halo+rays)*(1.-disk)*(1.+uP);
   gl_FragColor=vec4(c*disk*(1.+uP*.5)+mix(uC2,uC1,.5)*glo*1.3,(disk*.95+glo)*uA);}`,{depthTest:false}));
  // cono de luz de luna inclinado hacia el rival
  const cone=new THREE.Mesh(new THREE.CylinderGeometry(0.25,1.35,4.6,32,1,true),fx(`void main(){float h=vP.y/4.6+.5;float an=atan(vP.z,vP.x);
   float st=noise(vec3(an*4.,h*3.-uT*.8,1.))*.6+noise(vec3(an*9.,h*6.+uT*.5,3.))*.4;
   float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,h)*1.1,(smoothstep(.35,.8,st)*.4+.08)*fr*smoothstep(0.,.25,h)*uA);}`));
  cone.position.set(3.4,2.45,-0.65); cone.rotation.x=-Math.atan(1.3/4.9);
  L.mesh.add(moon,cone);
  // rayos: cilindros finos cuyo frente baja (uP = altura normalizada del frente)
  const RAY_FS=`void main(){float h=vP.y/${f(RH)}+.5;float d=h-uP;if(d<0.)discard;
   float core=pow(abs(dot(normalize(vN),normalize(vV))),1.3);
   float head=smoothstep(.06,0.,d);float tail=exp(-d*2.2);
   gl_FragColor=vec4(mix(uC2,uC1,.6+tail*.4)*1.5+vec3(1.)*head*.8,(tail*.7+head)*core*uA);}`;
  const rays=RP.map((r,i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(i?0.035:0.09,i?0.035:0.09,RH,8,1,true),fx(RAY_FS));
    m.position.set(r.x,RH/2+0.03,r.z);L.trail.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: sello lunar bajo el rival (media luna, anillos, estrellas) y reflejo de la luna en el agua bajo el Axie
  const sig=groundPlane(3.0,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.02)+band(r,.78,.012);
   float cr=smoothstep(.5,.47,r)*smoothstep(.38,.41,length(p*2.-vec2(.17,.09)));
   float k=fract(an/6.2832*12.+uT*.05)-.5;float dots=smoothstep(.05,0.,length(vec2(k*.52*r,r-.66)));
   m+=cr*.5+dots;m*=step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.5)*1.4,m*uA);}`));
  const refl=groundPlane(2.2,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   vec2 q=p*2.+vec2(sin(p.y*30.+uT*4.)*.03,0.);
   float disk=smoothstep(.36,.33,length(q));float bars=.6+.4*sin(q.y*40.-uT*3.);
   float rip=band(fract(r*3.-uT*.6),.5,.08)*smoothstep(1.,.4,r);
   gl_FragColor=vec4(mix(uC2,uC1,disk)*1.3+vec3(1.)*disk*.3,(disk*bars*.8+rip*.35+smoothstep(1.,.2,r)*.08)*uA);}`));
  const shock=groundPlane(3.2,3.4,0.03,fx(RIPPLE_FS));
  L.decal.add(sig,refl,shock);

  const C=`const float TI=${f(TI)};const float TF=${f(TF)};const vec3 MP=${v3(MP)};`+RG;
  // polvo de luna que cae por el cono
  a.count+=points(L.part,110,C+`void main(){float life=1.+aSeed.y*.6;float k=(uT-.3)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=mix(MP+vec3((r.x-.5)*.6,0.,(r.z-.5)*.6),vec3(3.4+(r.x-.5)*2.4,.1,(r.z-.5)*2.),age);
   vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.03+.03*r.y);}`);
  // salpicadura de luz líquida donde cae cada rayo (la del central, mayor y sobre la cabeza)
  a.count+=points(L.part,180,C+`void main(){float i=floor(aSeed.x*8.999);vec4 R=ray(i);float t=uT-R.w;float life=.4+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   float big=i<.5?1.7:1.;vec3 v=normalize(rnd()*vec3(1.,.2,1.)+vec3(0.,1.,0.))*(1.+1.4*aSeed.z)*big;
   vec3 p=R.xyz+vec3(0.,.05,0.)+v*c+vec3(0.,-6.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.04+.04*aSeed.w)*big);}`,DROP_FS);
  a.count+=sparks(L.part,110,TI,"3.4,1.9,0.","0.,.5,0.",2.5,7,2.5);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.5;float life=.25;float age=(uT-s)/life;vec3 p=vec3(3.4,1.,0.)+rnd()*vec3(.5,.9,.5);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.16*(1.-age*.5));}`,STAR4_FS);
  // reflejo: medias lunas que suben alrededor del Axie en espiral (celeridad lunar)
  a.count+=points(L.part,70,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TF)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rad=.55+.2*r.y;vec3 p=vec3(-3.7+cos(an)*rad,.05+age*(1.3+.6*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.12+.08*r.z);}`,CRESC_FS);

  a.pose=function(te,o){
    const ia=te-TI, rise=ss(0,TM,te), env=rise*(1-ss(TD,TE,te));
    let pulse=0,lj=-1; RT.forEach((t,i)=>{if(te>=t){pulse+=Math.exp(-(te-t)*9)*(i?0.4:1);lj=Math.max(lj,t);}});
    moon.position.set(MP.x,MP.y-0.6*(1-rise),MP.z); billboard(moon); moon.scale.setScalar(Math.max(0.5+0.5*rise,0.001)); set(moon,Math.min(pulse,1.2),env);
    cone.material.uniforms.uA.value=0.7*env*ss(TM-0.2,TR,te);
    rays.forEach((r,i)=>{const t0=RT[i]-FD,k=cl((te-t0)/FD),hl=i?0.03/RH:1.9/RH,ia2=te-RT[i];
      r.visible=te>=t0&&ia2<(i?0.25:0.45); set(r,1-k*(1-hl),ia2>0?1-cl(ia2/(i?0.25:0.45)):1);});
    let p=cl(ia/0.35); towardCam(hitRing.position,tmp.set(3.4,1.85,0),0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(shock,p,ia>=0?(1-p)*0.8:0);
    set(sig,ss(TR,TI+0.1,te),ss(TR-0.1,TR+0.1,te)*(1-ss(TD,TE,te)));
    const re=ss(TF-0.1,TF+0.2,te)*(1-ss(TD+0.1,TE,te));
    refl.material.uniforms.uA.value=re;
    U.uE.value=te<TF?env:re;
    glowM(caster,0.3*re+(te>=TF?0.5*Math.exp(-(te-TF)*5):0));
    // el rival se estremece con cada rayo y recibe el golpe del central
    const hit=hitK(ia,5), jit=(lj>0&&te<TI)?0.04*Math.exp(-(te-lj)*14):0;
    target.position.x=3.4+hit*0.16+jit; target.rotation.z=-hit*0.2*Math.cos(ia*14)+jit*0.6;
    target.scale.set(1,1-0.06*hit,1);
    if(te<TR){o.g.copy(MP);o.gs=2.4*rise;o.ga=0.3*rise;o.li=2*rise;}
    else if(te<TI){o.g.set(3.4,2.4,0);o.gs=2;o.ga=0.25+0.2*Math.min(pulse,1);o.li=3+3*Math.min(pulse,1);}
    else if(te<TF){o.g.set(3.4,1.6,0);o.gs=1.4+3*ia;o.ga=Math.exp(-ia*10)*0.7;o.li=8*Math.exp(-ia*5)+1.5;}
    else{o.g.set(-3.7,0.5,0);o.gs=1.6;o.ga=0.2*re;o.li=2.5*re+1.5*Math.exp(-(te-TF)*4);}
    if(te<TF){o.ia=ia;o.c.set(3.4,1.4,0);o.dist=0.7;o.flash=1;}
    else{o.ia=te-TF;o.c.set(-3.7,0.4,0);o.dist=0.2;o.flash=0;}
    o.shake=0;
  };
}};

// =====================================================================
// 3 · HERMIT — un remolino se alza sobre el aliado, forma un caparazón de ermitaño de roca marina con interior de
//     nácar que cae y lo encierra; latidos de nácar mientras protege; al final se deshace en motas perladas
// =====================================================================
const hermit={key:"qeHermit",name:"Hermit",pa:2,dur:2.4,ti:0.75,pal:"Plata",allies:1,
  phases:[["Remolino",0],["Caída",0.45],["Encierro",0.75],["Caparazón",0.95],["Muda",1.85]],
build(a){
  const L=a.L,TF=0.45,TI=0.75,TH=0.95,TD=1.85,TE=2.35,AP=ALLY_POS[0],AX=AP.x,AZ=AP.z,SY=3.3,SS=1.25;
  // roca marina: líneas de crecimiento en espiral, percebes; brillo de nácar en el fresnel; uB = disolución
  const SHELL_FS=`uniform float uB;
  void main(){vec3 q=vP;float an=atan(q.z,q.x);
   float n=noise(q*6.)*.6+noise(q*15.)*.4;
   float growth=pow(.5+.5*sin(an*12.+q.y*10.+n*2.),4.);
   vec3 rock=mix(vec3(.24,.22,.21),vec3(.6,.55,.5),n)*(1.-growth*.3);
   float bar=smoothstep(.64,.7,noise(q*10.+3.));
   rock=mix(rock,vec3(.85,.83,.78),bar*.7);
   float lit=.3+.7*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 nac=.5+.5*cos(6.2832*(fr*1.3+q.y*.8+uT*.25+vec3(0.,.33,.67)));nac=mix(uC1,nac,.45);
   float bn=noise(q*5.+11.);float th=uB*1.1-.05;if(bn<th)discard;
   float edge=smoothstep(.1,0.,bn-th)*step(.001,uB);
   gl_FragColor=vec4(rock*lit+nac*fr*(.5+uP)+uC1*edge*2.,1.);}`;
  const mat=fxU(SHELL_FS,{uB:{value:0}},Object.assign({},SOLID,{side:THREE.DoubleSide}));
  const shellG=new THREE.Group(); L.mesh.add(shellG);
  // espiras: toros apilados y desplazados (silueta en espiral), núcleo cónico y ápice
  [[0.56,0.24,0.24],[0.45,0.2,0.64],[0.34,0.16,0.98],[0.23,0.12,1.27]].forEach(([R,t,y],i)=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(R,t,14,40).rotateX(Math.PI/2),mat);m.position.set(0.04*i,y,0.03*i);shellG.add(m);});
  const core=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.6,1.5,32,1,false),mat); core.position.set(0.05,0.8,0.04);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.55,24),mat); spire.position.set(0.14,1.6,0.1);
  shellG.add(core,spire);
  // remolino de agua que sube hasta donde se forma el caparazón
  const vort=new THREE.Mesh(helixGeo(2.5,0.9,0.25,SY,0.16,140),fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   if(u>uP)discard;float n=noise(vec3(u*12.-uT*6.,v*2.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3+vec3(.5)*smoothstep(.7,.95,n),smoothstep(1.,.3,v)*(.35+.6*n)*smoothstep(0.,.1,u)*uA);}`));
  vort.position.set(AX,0,AZ); L.trail.add(vort);
  // suelo: espiral de concha (sello de marea) y onda del golpe, centrados bajo el aliado
  const tide=gpz(2.6,AX,AZ,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sp=fract(an/6.2832+r*1.6-uT*.25);float m=band(sp,.5,.05)*smoothstep(.95,.55,r)*step(.4,r)+band(r,.93,.02)+band(r,.48,.015);
   gl_FragColor=vec4(mix(uC2,uC1,r)*1.3,m*uA);}`));
  const land=gpz(3.2,AX,AZ,0.03,fx(RIPPLE_FS));
  L.decal.add(tide,land);

  const C=`const float TF=${f(TF)};const float TI=${f(TI)};const float TH=${f(TH)};const float TD=${f(TD)};const vec3 AP=${v3(AP)};`;
  a.count+=points(L.part,120,C+`void main(){float s=aSeed.x*(TF-.05);float life=.45+aSeed.y*.25;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*7.;float rad=mix(.9,.25,age);vec3 p=AP+vec3(cos(an)*rad,age*${f(SY)},sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.06+.07*aSeed.w);}`,BUBBLE_FS);
  // golpe: arena, gotas y chispas al encajar
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an),0.,sin(an))*(.6+.8*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.05+.25*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.22+.16*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.04;float t=uT-s;float life=.5+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+aSeed.w),2.+2.*aSeed.y,sin(an)*(1.+aSeed.w));
   vec3 p=AP+vec3(cos(an)*.7,.1,sin(an)*.7)+v*c+vec3(0.,-6.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,DROP_FS);
  a.count+=sparks(L.part,80,TI,`${f(AX)},.3,${f(AZ)}`,"0.,.8,0.",2,5,2);
  // caparazón puesto: destellos de nácar y burbujitas que suben de la base
  a.count+=points(L.part,40,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float y=.2+r.y*1.9;float rad=(.95-.4*y/2.)*${f(SS)}*.8;vec3 p=AP+vec3(cos(an)*rad,y,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.18*sin(age*3.14159));}`,STAR4_FS);
  a.count+=points(L.part,50,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AP+vec3(cos(an)*(.85+.2*r.y),.05+age*1.6,sin(an)*(.85+.2*r.y))+vec3(sin(age*9.+r.z*6.)*.06,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.06*r.z);}`,BUBBLE_FS);
  // muda: motas perladas que se desprenden al disolverse
  a.count+=points(L.part,120,C+`void main(){float s=TD+aSeed.x*.4;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float y=.1+aSeed.w*1.9;vec3 p=AP+vec3(cos(an)*(.8-.25*y),y,sin(an)*(.8-.25*y))+vec3(cos(an)*.4*t,t*(.6+aSeed.y),sin(an)*.4*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*25.+aSeed.x*30.)):0.;put(p,.04+.04*aSeed.y);}`);

  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TH,te)*(1-ss(TD,TE,te));
    let y,spin;
    if(te<TF){y=SY+0.06*Math.sin(te*9);spin=te*5;}
    else if(te<TI){const k=(te-TF)/(TI-TF);y=SY*(1-k*k);spin=TF*5+(te-TF)*9;}
    else{y=0;spin=TF*5+(TI-TF)*9+0.4*(1-Math.exp(-ia*8));}
    const form=ss(0.12,TF,te), sq=ia>=0?Math.exp(-ia*9)*Math.cos(ia*30):0;
    shellG.visible=form>0.001&&te<TE; shellG.position.set(AX,y,AZ); shellG.rotation.y=spin;
    shellG.scale.set(SS*form*(1+0.1*sq),SS*form*(1-0.14*sq),SS*form*(1+0.1*sq));
    const beat=te>=TH?Math.pow(0.5+0.5*Math.sin((te-TH)*18),4):0;
    mat.uniforms.uP.value=0.25+0.9*hitK(ia,5)+0.5*beat*env; mat.uniforms.uB.value=cl((te-TD)/(TE-TD-0.05));
    vort.visible=te<TF+0.3; set(vort,ss(0,TF-0.05,te)*1.02,(1-ss(TF,TF+0.25,te))*0.9);
    set(tide,0,env);
    let p=cl(ia/0.6); set(land,p,ia>=0?1-p:0);
    U.uE.value=env;
    glowM(allies[0],0.35*hitK(ia,4)+0.15*env*beat);
    allies[0].scale.set(1,1-0.05*hitK(ia,8),1);
    if(te<TF){o.g.set(AX,SY,AZ);o.gs=1.3*form;o.ga=0.3*form;o.li=2*form;}
    else if(te<TI){o.g.set(AX,y+0.8,AZ);o.gs=1.2;o.ga=0.3;o.li=2.5;}
    else{o.g.set(AX,1.0,AZ);o.gs=1.6+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.55+0.08*env*beat;o.li=6*Math.exp(-ia*5)+1.5*env*(0.5+beat);}
    o.ia=ia;o.c.set(AX,0.5,AZ);o.shake=0;o.dist=0.5;o.flash=0;
  };
}};

// =====================================================================
// 4 · PERCH — la presión del agua se concentra a la espalda y escupe un torpedo con forma de perca envuelto en una
//     campana de supercavitación; al chocar descarga cuatro ondas de presión hidrostática (4 impactos) que rompen
//     escudos y fracturan las baldosas. Nivel 3
// =====================================================================
const perch={key:"qePerch",name:"Perch",pa:3,dur:3.1,ti:1.0,pal:"Loto",
  phases:[["Presión",0],["Torpedo",0.55],["Impacto",1.0],["Pulsos",1.15],["Estallido",1.68],["Resaca",2.1]],
build(a){
  const L=a.L,TL=0.55,TI=1.0,HT=[1.0,1.22,1.44,1.68],X0=-3.55,XH=2.42,Y=1.22,HP=V3(2.95,1.22,0),GB=V3(-4.0,1.4,0),FSZ=7.5;
  const px=te=>te<TL?X0-0.25*ss(0.3,TL,te):te<TI?X0-0.25+(XH-X0+0.25)*Math.pow((te-TL)/(TI-TL),1.7):XH;
  // perca: cuerpo de agua densa con barras verticales oscuras, escamas, ojo dorado; uP = destello en cada pulso
  const fishG=new THREE.Group(); L.mesh.add(fishG);
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(`void main(){vec3 q=vP;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float back=smoothstep(-.2,.8,q.y);
   float bars=smoothstep(.2,.7,sin(q.x*20.+1.))*smoothstep(-.35,.3,q.y)*smoothstep(.85,.5,abs(q.x));
   float sc=pow(.5+.25*sin(q.x*90.+sin(q.y*70.)*1.6)+.25*sin(q.y*90.),5.);
   vec3 base=mix(mix(vec3(.85,.9,.75),uC1,.4),mix(uC2,vec3(.15,.3,.2),.4),back);
   base*=1.-bars*.55;base+=sc*.15;
   float eye=smoothstep(.13,.1,length(vec2(q.x-.74,q.y-.18)));float pup=smoothstep(.07,.05,length(vec2(q.x-.76,q.y-.18)));
   base=mix(base,vec3(1.,.85,.4),eye);base=mix(base,vec3(.02),pup);
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   gl_FragColor=vec4(base*lit+uC1*fr*1.4+vec3(1.)*uP*.5,(.9+.1*fr)*uA);}`,NB));
  body.scale.set(0.78,0.27,0.22);
  // aleta caudal ahorquillada y aleta dorsal espinosa (planos verticales, se leen de perfil)
  const tailFin=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.62).translate(-0.3,0,0),fx(`void main(){vec2 p=vec2(1.-vUv.x,vUv.y-.5);
   float w=.1+.38*p.x;float xl=1.-.32*(1.-abs(p.y)/w);
   float inside=smoothstep(w,w-.03,abs(p.y))*smoothstep(xl,xl-.04,p.x);
   float rays=.6+.4*sin(atan(p.y,p.x+.15)*40.);
   gl_FragColor=vec4(mix(uC2,uC1,p.x)*1.4*rays,inside*(.35+.45*p.x)*uA);}`));
  tailFin.position.x=-0.72;
  const dorsal=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.3).translate(0,0.15,0),fx(`void main(){vec2 p=vUv;
   float sp=1.-abs(fract(p.x*6.)-.5)*2.;float h=sp*.95*sin(3.14159*p.x);
   float inside=smoothstep(h,h-.06,p.y);float spine=smoothstep(.06,0.,abs(fract(p.x*6.)-.5))*step(p.y,h);
   gl_FragColor=vec4(mix(uC2,uC1,p.y+spine)*1.4,(inside*.45+spine*.6)*uA);}`));
  dorsal.position.set(-0.05,0.22,0);
  // campana de supercavitación alrededor del morro: anillos que corren hacia atrás
  const cav=new THREE.Mesh(new THREE.ConeGeometry(0.46,1.25,32,4,true).rotateZ(-Math.PI/2).translate(0.35,0,0),fx(`void main(){
   float u=(.975-vP.x)/1.25;float ring=pow(.5+.5*sin(u*24.+uT*45.),5.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float n=noise(vec3(vP.x*4.+uT*14.,vP.y*5.,vP.z*5.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.3,(fr*.45+ring*.25)*smoothstep(1.,.3,u)*smoothstep(0.,.1,u)*(.6+.4*n)*uA);}`));
  fishG.add(body,tailFin,dorsal,cav);
  // bola de presión a la espalda
  const gball=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(WBALL_FS)); gball.position.copy(GB); L.mesh.add(gball);
  // estela de agua: planos cruzados tras el torpedo
  const wakeM=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*6.-uT*12.,v*3.,uT))*.6+noise(vec3(u*15.-uT*20.,v*8.,2.))*.4;
   float sp=pow(.5+.5*sin(u*30.-uT*40.),4.)*.3;
   float al=smoothstep(u*(.5+.5*n)+.05,0.,v)*pow(u,1.5)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u*n+sp)*1.5+vec3(.9)*smoothstep(.6,.9,n)*u*.4,al);}`);
  const wg=new THREE.PlaneGeometry(1,0.75).translate(-0.5,0,0), wake=new THREE.Group(), w2=new THREE.Mesh(wg,wakeM); w2.rotation.x=Math.PI/2;
  wake.add(new THREE.Mesh(wg,wakeM),w2); L.trail.add(wake);
  // ondas de presión: una cáscara esférica y un anillo por impacto; estallido de agua en el último
  const PRESS_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);
   float n=noise(vP*4.+vec3(uT*3.));float rip=.5+.5*sin(length(vP.yz)*20.-uT*30.);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.4+vec3(1.)*fr*n*.4,(fr*(.6+.4*rip)+.04)*(1.-uP)*uA);}`;
  const shells=HT.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(PRESS_FS));m.position.copy(HP);L.mesh.add(m);return m;});
  const rings=HT.map((t,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(i===3?4.4:3.2,i===3?4.4:3.2),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.copy(HP); L.mesh.add(burst);
  // suelo: fractura de baldosas (nivel 3) que avanza con cada pulso, ondas por pulso, charco del estallido
  const frac=groundPlane(FSZ,3.4,0.025,fx(tileFractureFS(FSZ)));
  const ripples=HT.map(()=>groundPlane(6,3.4,0.03,fx(RIPPLE_FS)));
  const pool=groundPlane(3.6,3.4,0.018,fx(POOL_FS));
  const launch=groundPlane(2.4,-3.7,0.03,fx(RIPPLE_FS));
  L.decal.add(frac,pool,launch,...ripples);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 HP=${v3(HP)};const vec3 GB=${v3(GB)};
  float px(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return ${f(X0-0.25)}+${f(XH-X0+0.25)}*pow(k,1.7);}
  float ht(float i){return i<.5?${f(HT[0])}:(i<1.5?${f(HT[1])}:(i<2.5?${f(HT[2])}:${f(HT[3])}));}`;
  // presión: burbujas y motas que convergen en la bola de la espalda
  a.count+=points(L.part,90,C+`void main(){float s=aSeed.x*(TL-.2);float life=.32+aSeed.y*.12;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=GB+d*mix(1.5,.2,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.08+.07*aSeed.z);}`,BUBBLE_FS);
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TL-.15);float life=.22+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=GB+d*mix(1.1,.1,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.z);}`);
  // rastro: burbujas de cavitación y espuma
  a.count+=points(L.part,260,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.5+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(px(s)-.4,${f(Y)},0.)+r*vec3(.15,.3,.3)+vec3(-.3*t,.5*t*aSeed.z,r.z*.4*t)+vec3(0.,sin(t*8.+aSeed.w*6.)*.03,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.05+.09*aSeed.w)*(1.-age*.3));}`,BUBBLE_FS);
  a.count+=points(L.part,70,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(px(s)-.6,${f(Y)},0.)+r*vec3(.2,.2,.2)+vec3(-.4*t,.2*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.22+.18*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  // cada pulso: chispas; gotas despedidas por pulso
  HT.forEach((t,i)=>{a.count+=sparks(L.part,i===0?80:i===3?90:45,t,`${f(HP.x)},${f(HP.y)},0.`,"-.7,.35,0.",3,i===3?11:7,3);});
  a.count+=points(L.part,180,C+`void main(){float i=floor(aSeed.x*3.999);float s=ht(i);float t=uT-s;float life=.5+aSeed.y*.35;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.8,.5,0.))*(2.+3.5*aSeed.z);vec3 p=HP+v*c+vec3(0.,-6.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.05+.06*aSeed.w);}`,DROP_FS);
  // estallido final: corona de agua, bruma y esquirlas de baldosa
  a.count+=points(L.part,200,C+`void main(){float s=${f(HT[3])}+aSeed.x*.06;float t=uT-s;float life=.9+aSeed.y*.5;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+2.*aSeed.w),3.+4.*aSeed.y,sin(an)*(1.+2.*aSeed.w));
   vec3 p=vec3(3.3,.2,0.)+vec3(cos(an),0.,sin(an))*.5+v*c+vec3(0.,-7.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.06+.07*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,50,C+`void main(){float s=${f(HT[3])}+aSeed.x*.2;float life=1.1+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=HP+d*(.4+1.2*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.45:0.;put(p,(.5+.4*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.72,.84,.95)"),NB);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.7+aSeed.y*.4;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.5*aSeed.w),2.5+3.*aSeed.y,sin(an)*(1.+1.5*aSeed.w));
   vec3 p=vec3(3.4,.05,0.)+vec3(cos(an),0.,sin(an))*.8+v*c+vec3(0.,-9.*c*c,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.05*aSeed.w);}`,CHIP_FS);
  // el torpedo se deshace en motas tras el último pulso
  a.count+=points(L.part,80,C+`void main(){float s=${f(HT[3])}+aSeed.x*.1;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(${f(XH)}+r.x*.7,${f(Y)}+r.y*.2,r.z*.2)+vec3(-.6*t,.5*t,r.z*.5*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.04*aSeed.w)*(1.-age*.5));}`);

  a.pose=function(te,o){
    const ia=te-TI; let li=-1; HT.forEach((t,i)=>{if(te>=t)li=i;});
    const il=li>=0?te-HT[li]:-1, x=px(te);
    // retroceso del torpedo en cada pulso y vibración mientras taladra
    const kick=li>=0&&li<3?0.16*Math.exp(-il*18):0, drill=te>=TI&&te<HT[3]?0.025*Math.sin(te*95):0;
    const form=ss(0.32,TL,te);
    fishG.visible=form>0.001&&te<HT[3]+0.03; fishG.position.set(x-kick+drill,Y+drill*0.5,0);
    fishG.scale.setScalar(Math.max(form*1.15*(te>=HT[3]?1-cl((te-HT[3])/0.03):1),0.001));
    fishG.rotation.set(0,0,te<TL?0.08*Math.sin(te*6):0);
    tailFin.rotation.y=0.5*Math.sin(te*(te<TL?10:42));
    const fl=li>=0?Math.exp(-il*10):0;
    set(body,fl,1); set(tailFin,0,0.9); set(dorsal,0,0.8);
    set(cav,0,te>=TL?0.9*ss(TL,TL+0.08,te):0); cav.scale.set(1,1+0.15*fl,1+0.15*fl);
    // bola de presión: crece, tiembla y revienta al salir el torpedo
    const gs=0.45*ss(0,0.42,te)*(1+0.08*Math.sin(te*38)), gb=cl((te-TL)/0.12);
    gball.visible=te<TL+0.12; gball.scale.setScalar(Math.max(gs*(1+1.4*gb),0.001)); set(gball,0,ss(0,0.2,te)*(1-gb));
    caster.rotation.z=0.1*ss(0.1,TL,te)-0.25*ss(TL,TL+0.06,te)+0.15*ss(TL+0.1,TL+0.6,te);
    caster.position.x=-3.7-0.12*ss(TL,TL+0.06,te)*(1-ss(TL+0.1,TL+0.5,te));
    wake.visible=te>TL&&te<HT[3]+0.25; wake.position.set(x-0.6,Y,0);
    wake.scale.set(Math.max(x-0.6-(X0-0.25),0.001),1,1); wakeM.uniforms.uA.value=te<HT[3]?1:1-cl((te-HT[3])/0.25);
    shells.forEach((m,i)=>{const d=te-HT[i],p=cl(d/(i===3?0.55:0.4));m.visible=d>=0&&p<1;
      m.scale.setScalar(0.4+(1.6+0.3*i)*(1-Math.pow(1-p,2)));set(m,p,1);});
    rings.forEach((m,i)=>{const d=te-HT[i],p=cl(d/0.35);towardCam(m.position,HP,0.5);billboard(m);m.visible=d>=0&&p<1;set(m,p,1-p);});
    ripples.forEach((m,i)=>{const d=te-HT[i],p=cl(d/0.7);m.position.x=target.position.x;set(m,p,d>=0?(1-p)*(i===3?1:0.6):0);});
    let p=cl((te-HT[3])/0.6); burst.visible=te>=HT[3]&&p<1; burst.scale.setScalar(0.4+1.9*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    // fractura: cada pulso la hace avanzar un tramo
    const W=[0.42,0.18,0.18,0.3]; let fp=0; HT.forEach((t,i)=>{fp+=W[i]*(1-Math.pow(1-cl((te-t)/0.3),2));});
    frac.position.x=target.position.x; set(frac,Math.min(fp,1),ia>=0?1-ss(2.4,3.05,te):0);
    set(pool,0.4+0.6*ss(HT[3],HT[3]+0.4,te),te>=HT[3]?0.8*(1-ss(2.3,3.05,te)):0);
    p=cl((te-TL)/0.5); set(launch,p,te>=TL?(1-p)*0.6:0);
    // reacción: empujones acumulados y retroceso grande en el estallido
    let kb=0,rz=0; HT.forEach((t,i)=>{const d=te-t;if(d>=0){const w=i===3?0.55:i===0?0.25:0.1;kb+=w*Math.exp(-d*(i===3?3:6));rz+=w*Math.exp(-d*5)*Math.cos(d*14);}});
    target.position.x=3.4+kb; target.rotation.z=-rz*0.8;
    if(te<TL){const k=ss(0,0.42,te);o.g.copy(GB);o.gs=1.2*k;o.ga=0.35*k;o.li=3*k;}
    else if(te<TI){o.g.set(x+0.7,Y,0);o.gs=1.6;o.ga=0.55;o.li=5;}
    else{const big=li===0||li===3;o.g.copy(HP);o.gs=(big?2:1.4)+4*il;o.ga=Math.exp(-il*10)*(big?0.85:0.5);o.li=(big?13:6)*Math.exp(-il*5)+2;}
    o.ia=li>=0?il:ia; o.c.copy(HP); o.shake=li===3?2:li===0?1.6:0.8; o.dist=li===0||li===3?1.3:0.7; o.flash=li===0||li===3?1:0.6;
  };
}};

// =====================================================================
// 5 · SPONGE — una esponja marina aparece sobre el aliado y absorbe agua del entorno hasta empaparse; al saturarse
//     se exprime y su agua cae en tres chorros que levantan cúpulas de agua sobre todo el escuadrón
// =====================================================================
const sponge={key:"qeSponge",name:"Sponge",pa:2,dur:2.4,ti:1.1,pal:"Menta",allies:2,
  phases:[["Esponja",0],["Absorción",0.3],["Saturación",0.85],["Exprimir",1.1],["Escudos",1.35],["Disipación",2.0]],
build(a){
  const L=a.L,TA=0.3,TS=0.85,TI=1.1,TW=1.35,TD=2.0,TE=2.36,AP=ALLY_POS[0],SP=V3(AP.x,2.55,AP.z);
  const SQ=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]];
  // esponja: amarillo semántico con poros por ruido; al empaparse oscurece y toma brillo de agua (uQ)
  const spongeM=fxU(`uniform float uQ;
  void main(){vec3 q=vP*7.;
   float pores=min(smoothstep(.6,.7,noise(q))+smoothstep(.66,.74,noise(q*2.1+5.))*.7,1.);
   vec3 spg=mix(vec3(.98,.84,.32),vec3(.8,.58,.14),noise(vP*4.));
   float lit=.4+.6*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   vec3 c=spg*lit*(1.-pores*.7);
   c=mix(c,c*.6+uC2*.35,uQ);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float wet=smoothstep(.55,.8,noise(vP*9.+vec3(0.,-uT*1.5,0.)))*uQ;
   gl_FragColor=vec4(c+uC1*(fr*.6*uQ+wet*.5),1.);}`,{uQ:{value:0}},SOLID);
  const spongeMesh=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.48,0.46,1,1,1),spongeM); spongeMesh.position.copy(SP); L.mesh.add(spongeMesh);
  // chorros de la esponja a cada miembro del escuadrón
  const streams=SQ.map(p=>{const top=V3(p.x,2.25,p.z),mid=V3((SP.x+p.x)/2,Math.max(SP.y,2.2)+0.5,(SP.z+p.z)/2);
    const c=new THREE.QuadraticBezierCurve3(V3(SP.x,SP.y-0.2,SP.z),mid,top);
    const m=new THREE.Mesh(new THREE.TubeGeometry(c,50,0.06,8,false),fx(STREAM_FS));L.trail.add(m);return m;});
  // cúpulas de agua: se llenan de abajo arriba (uP), cáusticas y ondas que suben
  const DOME_FS=CAUS+`void main(){float h=vP.y;if(h>uP*1.05)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float c1=caus(vP*4.+vec3(0.,-uT*1.2,uT*.5));
   float rip=band(fract(h*4.+uT*.8),.5,.06);
   float front=smoothstep(.06,0.,uP*1.05-h)*step(uP,1.);
   gl_FragColor=vec4(mix(uC2,uC1,fr+c1*.4)*1.25+vec3(1.)*(front+c1*.25),(.05+fr*.6+c1*.22+rip*.12+front)*uA);}`;
  const domes=SQ.map(p=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),fx(DOME_FS));
    m.position.set(p.x,0,p.z);m.scale.set(0.95,2.05,0.95);L.mesh.add(m);return m;});
  const splash=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false})); L.mesh.add(splash);
  // suelo: goteo bajo la esponja (centrado en el aliado) y ondas bajo cada cúpula
  const puddle=gpz(2.0,AP.x,AP.z,0.018,fx(POOL_FS));
  const rip=SQ.map(p=>gpz(2.6,p.x,p.z,0.03,fx(RIPPLE_FS)));
  L.decal.add(puddle,...rip);

  const C=`const float TA=${f(TA)};const float TS=${f(TS)};const float TI=${f(TI)};const float TW=${f(TW)};const vec3 SP=${v3(SP)};
  vec3 sq(float i){return i<.5?vec3(-3.7,0.,0.):(i<1.5?${v3(ALLY_POS[0])}:${v3(ALLY_POS[1])});}`;
  // absorción: gotas que giran hacia la esponja desde todas partes
  a.count+=points(L.part,220,C+`void main(){float s=TA+aSeed.x*(TS-TA);float dur=.4+.15*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   vec3 d=normalize(rnd()+vec3(0.,-.2,0.));vec3 off=d*(1.4+.6*aSeed.z);float an=(1.-k)*3.;
   vec3 rot=vec3(off.x*cos(an)-off.z*sin(an),off.y,off.x*sin(an)+off.z*cos(an));
   vec3 p=SP+rot*(1.-k*k);
   vA=(uT>s&&k<1.)?smoothstep(0.,.2,k):0.;put(p,(.05+.05*aSeed.w)*(1.-k*.5));}`,DROP_FS);
  // goteo de la esponja empapada
  a.count+=points(L.part,40,C+`void main(){float s=TS-.25+aSeed.x*.55;float t=uT-s;vec3 r=rnd();
   vec3 p=SP+vec3(r.x*.3,-.24,r.z*.2)+vec3(0.,-4.9*t*t,0.);
   vA=(t>0.&&p.y>.03)?.9:0.;put(p,.05+.03*aSeed.w);}`,DROP_FS);
  // exprimido: estallido de gotas y espuma
  a.count+=points(L.part,130,C+`void main(){float s=TI+aSeed.x*.06;float t=uT-s;float life=.6+aSeed.y*.35;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.15,0.))*(1.5+2.5*aSeed.z);vec3 p=SP+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.05+.06*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+.1+aSeed.x*.2;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=SP+r*vec3(.35,.25,.25)+vec3(0.,-.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.16+.12*aSeed.y)*(.7+age));}`,FOAM_FS,NB);
  // escudos: burbujas que suben dentro de cada cúpula y destellos al cerrarse
  a.count+=points(L.part,120,C+`void main(){float i=floor(aSeed.x*2.999);float life=.8+aSeed.y*.5;float k=(uT-TW)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=sq(i)+vec3(cos(an)*.65*r.y,.1+age*1.7,sin(an)*.65*r.y);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.06*r.z);}`,BUBBLE_FS);
  a.count+=points(L.part,45,C+`void main(){float i=floor(aSeed.x*2.999);float s=TW-.05+aSeed.y*.2;float life=.3;float age=(uT-s)/life;
   vec3 d=normalize(rnd()*vec3(1.,.5,1.)+vec3(0.,.6,0.));vec3 p=sq(i)+vec3(d.x*.95,d.y*2.05,d.z*.95);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.2*(1.-age*.5));}`,STAR4_FS);

  a.pose=function(te,o){
    const ia=te-TI, sat=ss(TA,TS,te), env=ss(TW-0.1,TW+0.15,te)*(1-ss(TD,TE,te));
    const pop=ss(0,0.2,te)*(1+0.2*Math.sin(cl(te/0.3)*Math.PI)), swell=1+0.3*sat;
    const sq=ia>=0?ss(0,0.07,ia)*(1-ss(0.12,0.3,ia)):0, gone=ia>=0?1-ss(0.18,0.35,ia):1;
    const twist=ss(TS,TI,te)*(1-ss(TI,TI+0.15,te));
    spongeMesh.visible=te>0.01&&gone>0.001;
    const s0=Math.max(pop*swell*gone,0.001);
    spongeMesh.scale.set(s0*(1+0.35*sq),s0*(1-0.55*sq),s0*(1+0.3*sq));
    spongeMesh.rotation.set(0.3*twist*Math.sin(te*30),te*1.2+0.6*twist,0.1*Math.sin(te*2));
    spongeM.uniforms.uQ.value=sat*(1-0.6*sq);
    streams.forEach((m,k)=>{const d=te-TI-0.03*k;m.visible=d>=0&&d<0.5;set(m,d/0.22,d>0.25?1-cl((d-0.25)/0.25):1);});
    domes.forEach((m,k)=>{const d=te-(TI+0.2+0.04*k);m.visible=d>=0&&te<TE;
      set(m,ss(0,0.3,d),(d>=0?1:0)*(1-ss(TD,TE,te))*(0.75+0.35*Math.exp(-Math.max(d,0)*5)));
      m.scale.set(0.95*(1+0.02*Math.sin(te*5+k)),2.05,0.95*(1+0.02*Math.cos(te*5+k)));});
    let p=cl(ia/0.35); towardCam(splash.position,SP,0.3); billboard(splash); splash.visible=ia>=0&&p<1; set(splash,p,1-p);
    set(puddle,0.3+0.6*ss(TS,TI+0.2,te),ss(TS-0.2,TS,te)*(1-ss(TD,TE,te))*0.8);
    rip.forEach((m,k)=>{const d=te-(TI+0.2+0.04*k),q=cl(d/0.7);set(m,q,d>=0?1-q:0);});
    U.uE.value=env;
    glowM(caster,0.2*env+0.5*hitK(te-TW,5)*(te>=TW?1:0)); glowM(allies[0],0.2*env+0.15*sat+0.5*hitK(te-TW,5)*(te>=TW?1:0)); glowM(allies[1],0.2*env+0.5*hitK(te-TW,5)*(te>=TW?1:0));
    if(te<TI){o.g.copy(SP);o.gs=0.9+0.6*sat;o.ga=0.15+0.25*sat;o.li=1.2+2.5*sat;}
    else if(te<TW){o.g.copy(SP);o.gs=1.4+3*ia;o.ga=Math.exp(-ia*10)*0.6;o.li=6*Math.exp(-ia*5)+1;}
    else{o.g.set(-3.5,1.2,-1.0);o.gs=3;o.ga=0.1*env;o.li=1.5+2.5*env;}
    o.ia=ia;o.c.copy(SP);o.shake=0;o.dist=0.5;o.flash=0;
  };
}};

// =====================================================================
// 6 · GOLDFISH — un pez dorado de fuego acuático nace de la espalda, nada en espiral alrededor del Axie dejando una
//     estela de celeridad (+1 PM: anillo veloz a sus pies) y se lanza como un dardo contra el rival
// =====================================================================
const goldfish={key:"qeGoldfish",name:"Goldfish",pa:2,dur:2.2,ti:1.25,pal:"Dorado",
  phases:[["Nado",0],["Celeridad",0.95],["Dardo",1.0],["Impacto",1.25],["Estela",1.5]],
build(a){
  const L=a.L,T0=0.12,T1=0.95,TI=1.25,TE=2.15,CC=V3(-0.2,2.25,0.7),HP=V3(3.12,1.2,0.05);
  const loopP=(k,o)=>{const an=Math.PI+11*k,r=0.95*(0.75+0.25*Math.sin(k*Math.PI));return o.set(-3.7+Math.cos(an)*r,0.95+0.45*k+0.18*Math.sin(k*22),Math.sin(an)*r);};
  const P1=loopP(1,V3(0,0,0));
  const fp=(t,o)=>{if(t<T0)return loopP(0,o);if(t<T1)return loopP((t-T0)/(T1-T0),o);
    const k=Math.pow(cl((t-T1)/(TI-T1)),1.3),u=1-k;return o.set(u*u*P1.x+2*u*k*CC.x+k*k*HP.x,u*u*P1.y+2*u*k*CC.y+k*k*HP.y,u*u*P1.z+2*u*k*CC.z+k*k*HP.z);};
  // estela: tubo por la trayectoria muestreada; el tramo visible persigue al pez (uP = fracción de longitud)
  const NS=160, SPTS=[], CUM=[0];
  for(let i=0;i<=NS;i++){SPTS.push(fp(T0+(TI-T0)*i/NS,V3(0,0,0)));if(i)CUM.push(CUM[i-1]+SPTS[i].distanceTo(SPTS[i-1]));}
  const LEN=CUM[NS]||1, uAt=t=>{const x=cl((t-T0)/(TI-T0))*NS,i=Math.min(Math.floor(x),NS-1),k=x-i;return (CUM[i]+(CUM[i+1]-CUM[i])*k)/LEN;};
  const trail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(SPTS),320,0.035,6,false),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float n=noise(vec3(u*60.-uT*10.,vUv.y*6.,0.));float a=exp(-d*9.)*(.6+.4*n);
   float core=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*14.))*1.6+vec3(1.)*smoothstep(.02,0.,d)*.6,a*core*uA);}`));
  L.trail.add(trail);
  // pez: cuerpo de escamas doradas con lenguas de fuego, cola de velo flamígera
  const fishG=new THREE.Group(); L.mesh.add(fishG);
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(`void main(){vec3 q=vP;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float sc=pow(.5+.25*sin(q.x*55.+sin(q.y*50.)*1.5)+.25*sin(q.y*55.),4.);
   float n=noise(q*4.+vec3(-uT*3.,0.,0.));
   vec3 c=mix(uC2,uC1,.35+.4*smoothstep(-.3,.6,q.y)+sc*.3)*(1.1+.4*n);
   float eye=smoothstep(.15,.11,length(vec2(q.x-.68,q.y-.22)));c=mix(c,vec3(.05,.02,0.),eye);
   gl_FragColor=vec4(c+uC1*fr*.9+vec3(1.)*fr*fr*.4,.95*uA);}`,NB));
  body.scale.set(0.3,0.17,0.13);
  const FIRE_FIN=`void main(){vec2 p=vec2(1.-vUv.x,vUv.y-.5);
   float w=.08+.45*p.x;float n=noise(vec3(p*vec2(5.,8.)+vec2(-uT*6.,0.),uT));
   float fl=smoothstep(w*(.6+.6*n),0.,abs(p.y))*smoothstep(1.,.5,p.x+(n-.5)*.4);
   float rays=.75+.25*sin(atan(p.y,p.x+.1)*30.);
   gl_FragColor=vec4((mix(uC2,uC1,1.-p.x+n*.3)+vec3(1.)*smoothstep(.6,.9,n)*.3)*1.5*rays,fl*uA);}`;
  const tailFin=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5).translate(-0.25,0,0),fx(FIRE_FIN)); tailFin.position.x=-0.26;
  const tail2=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42).translate(-0.21,0,0),fx(FIRE_FIN)); tail2.position.x=-0.26; tail2.rotation.x=Math.PI/2;
  fishG.add(body,tailFin,tail2);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: anillo de celeridad a los pies (rayas que giran) y onda en el rival
  const haste=groundPlane(2.2,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float dash=step(.55,fract(an/6.2832*10.-uT*1.6));float m=band(r,.8,.05)*dash+band(r,.62,.015)+band(r,.95,.02)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,m*uA);}`));
  const buff=groundPlane(2.6,-3.7,0.03,fx(RIPPLE_FS)), tRing=groundPlane(2.6,3.4,0.03,fx(RIPPLE_FS));
  L.decal.add(haste,buff,tRing);

  const C=`const float T0=${f(T0)};const float T1=${f(T1)};const float TI=${f(TI)};const vec3 HP=${v3(HP)};const vec3 CC=${v3(CC)};const vec3 P1=${v3(P1)};
  vec3 lp(float k){float an=3.14159+11.*k;float r=.95*(.75+.25*sin(k*3.14159));return vec3(-3.7+cos(an)*r,.95+.45*k+.18*sin(k*22.),sin(an)*r);}
  vec3 fp(float t){if(t<T0)return lp(0.);if(t<T1)return lp((t-T0)/(T1-T0));float k=pow(clamp((t-T1)/(TI-T1),0.,1.),1.3);float u=1.-k;return u*u*P1+2.*u*k*CC+k*k*HP;}`;
  // llamitas y burbujas que suelta al nadar
  a.count+=points(L.part,180,C+`void main(){float s=T0+aSeed.x*(TI-T0);float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=fp(s)+r*.06+vec3(r.x*.2*t,.6*t,r.z*.2*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.08+.07*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
  a.count+=points(L.part,80,C+`void main(){float s=T0+aSeed.x*(TI-T0);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=fp(s)+r*.1+vec3(0.,.5*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.05+.05*aSeed.z);}`,BUBBLE_FS);
  // celeridad: rayas de velocidad y motas que rodean al Axie
  a.count+=points(L.part,110,C+`void main(){float life=.25+aSeed.y*.15;float k=(uT-T1+.2)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(-3.7+.6-age*1.6+(r.x-.5)*.4,.15+r.y*1.6,(r.z-.5)*1.2);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.3+.2*r.z);}`,STREAK_FS);
  a.count+=points(L.part,70,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-T1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*6.;float rad=.6+.15*r.y;vec3 p=vec3(-3.7+cos(an)*rad,.05+age*(1.+.8*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.035+.035*r.z);}`);
  // impacto: chispas, gotas doradas y lenguas de fuego
  a.count+=sparks(L.part,110,TI,`${f(HP.x)},${f(HP.y)},${f(HP.z)}`,"-.6,.4,0.",2.5,7,2.8);
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float life=.5+aSeed.y*.3;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.7,.6,0.))*(1.5+2.5*aSeed.z);vec3 p=HP+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,DROP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.15;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(3.4+r.x*.4,.4+aSeed.z*1.2,r.z*.4)+vec3(0.,.8*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.14+.1*aSeed.w)*(1.-age*.4));}`,FLAME_FS);

  const fpos=V3(0,0,0), fa=V3(0,0,0), fb=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(T1-0.1,T1+0.15,te)*(1-ss(1.8,TE,te));
    fp(te,fpos); fp(te+0.01,fa); fp(te-0.01,fb); fa.sub(fb);
    const yaw=Math.atan2(-fa.z,fa.x), pitch=Math.atan2(fa.y,Math.hypot(fa.x,fa.z));
    const pop=ss(0.02,T0+0.08,te);
    fishG.visible=pop>0.001&&te<TI+0.02; fishG.position.copy(fpos); fishG.rotation.set(0,yaw,pitch);
    fishG.scale.setScalar(Math.max(pop*(te>T1?1.15:1),0.001));
    const wf=te<T1?12:28; tailFin.rotation.y=0.5*Math.sin(te*wf); tail2.rotation.z=0.3*Math.sin(te*wf+1);
    set(body,0,1); set(tailFin,0,1); set(tail2,0,0.8);
    set(trail,uAt(te),te<TI?1:1-cl(ia/0.35)); trail.visible=te>T0&&ia<0.35;
    let p=cl(ia/0.35); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(tRing,p,ia>=0?(1-p)*0.8:0);
    const ib=te-T1; p=cl(ib/0.6); set(buff,p,ib>=0?1-p:0);
    haste.material.uniforms.uA.value=env;
    U.uE.value=env;
    glowM(caster,0.25*env+(ib>=0?0.5*Math.exp(-ib*5):0));
    caster.rotation.z=-0.05*env*Math.sin(te*6);
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.24; target.rotation.z=-hit*0.26*Math.cos(ia*14);
    if(te<TI){o.g.copy(fpos);o.gs=0.9;o.ga=0.4*pop;o.li=3*pop;}
    else{o.g.copy(TC);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*11)*0.7;o.li=8*Math.exp(-ia*5)+1.5*env;}
    if(te<TI&&ib>=0&&ib<0.3){o.ia=ib;o.c.set(-3.7,0.5,0);o.dist=0.25;o.flash=0;}
    else{o.ia=ia;o.c.copy(TC);o.dist=0.7;o.flash=1;}
    o.shake=0;
  };
}};

VFX.module("Acuático · Espalda",[anemone,blueMoon,hermit,perch,sponge,goldfish]);
})();

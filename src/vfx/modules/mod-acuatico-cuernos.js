// =====================================================================
// MÓDULO · CLASE ACUÁTICO (CUERNOS)
// Estética marina: agua translúcida con cáusticas, burbujas irisadas, nácar, escamas y espuma. No se dibujan cuernos:
// lo que "nace de la cabeza" arranca en la zona de las puntas (≈ x −3.55, y 2.05) sin malla anatómica.
// Niveles por PA: Anemone, Babylonia, Clamshell, Shoal Star y Teal Shell son 2 PA (nivel 2: sin fractura ni temblor);
// Oranda es 3 PA (nivel 3: escala gigante, temblor fuerte y fractura de baldosa bajo el rival).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,STAR4_FS,SLASH_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0);                                   // pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const WATER=`vec3(.72,.9,1.)`;                               // agua (color fijo semántico)
// parábola s→e con altura h; bezier cuadrática; orientar una malla (+x local) según una dirección
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const qbz=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const orient=(m,v)=>m.rotation.set(0,-Math.atan2(v.z,v.x),Math.atan2(v.y,Math.hypot(v.x,v.z)));
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
const allyGlow=(i,k,col)=>{const m=allies[i].userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};

// ---------- GLSL compartido ----------
// cáusticas: crestas del ruido
const CAUS=`float caus(vec3 p){float n=noise(p)*.6+noise(p*2.1+3.7)*.4;return pow(1.-abs(n*2.-1.),5.);}`;
// gota de agua: lágrima translúcida con borde claro y brillo
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;
 float rim=smoothstep(.16,.32,d);float hl=smoothstep(.08,0.,length(q-vec2(-.07,.02)));
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*(.4+.8*rim)+vec3(1.)*hl,a*(.4+.6*rim+hl));}`;
// espuma: copo blanco deshilachado (mezcla normal)
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*6.,vMix*40.));
 float a=smoothstep(.5,.12,d+(n-.5)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.88,.96,1.),uC1,.15)*(.8+.3*n),a*.8);}`;
// burbuja cian con reflejos irisados (color fijo: lo pide la estética de clase)
const CBUB_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float ring=smoothstep(.07,0.,abs(d-.38))*.9+smoothstep(.5,0.,d)*.12;
 float hl=smoothstep(.13,0.,length(q-vec2(-.14,-.14)));
 vec3 ir=.6+.4*cos(6.2832*(d*1.6+vMix+vec3(0.,.33,.67)));
 float a=(ring+hl*.8)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.45,.95,1.),ir,.35)*1.3+vec3(hl*.6),a);}`;
// escama que gira en el aire (vMix = fase de giro): media luna con filo brillante y destello al ponerse de cara
const SCALE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float fl=cos(vMix*6.2832);q.x/=max(abs(fl),.15);
 float d=length(q-vec2(0.,.08));float a=smoothstep(.36,.3,d)*smoothstep(-.3,-.16,q.y)*vA;if(a<.003)discard;
 float rim=smoothstep(.2,.34,d);float gl=pow(max(fl,0.),8.);
 gl_FragColor=vec4(mix(uC2,uC1,.4+.6*rim)*1.3+vec3(1.)*gl*.9,a);}`;
// onda en anillo con color cian fijo (curación)
const CRING_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=.11*(1.-uP)+.015;
 float a=band(r,uP*.95,w)*uA*(.65+.35*noise(vec3(atan(p.y,p.x)*6.,r*8.-uT*4.,0.)));
 gl_FragColor=vec4(mix(vec3(.45,.95,1.),vec3(1.),.25*a)*1.5,a);}`;
// mancha húmeda: salpicadura de agua en el suelo que se extiende (uP) y se seca (uA)
const WET_FS=CAUS+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float lobes=.55+.25*noise(vec3(an*2.5,1.,2.))+.12*pow(abs(sin(an*7.)),3.);
 float e=r/max(uP*lobes,.001);float body=smoothstep(1.,.75,e);
 float cs=caus(vec3(p*9.,uT*.5));float rim=band(e,.92,.1);
 gl_FragColor=vec4(mix(uC2,uC1,cs)*1.2+vec3(1.)*rim*.3,(body*(.12+.35*cs)+rim*.5)*uA);}`;

// =====================================================================
// 1 · ANEMONE — una colonia de anémona brota alrededor del Axie; los tentáculos frontales se cargan, latiguean y
//     disparan dardos venenosos al rival; después un halo de burbujas cian irisadas cura al Axie
// =====================================================================
const anemone={key:"qcAnemone",name:"Anemone",pa:2,dur:2.2,ti:0.9,pal:"Tropical",
  phases:[["Brote",0],["Carga",0.36],["Dardos",0.52],["Picadura",0.9],["Halo",1.05],["Retirada",1.75]],
build(a){
  const L=a.L,CX=-3.7,TG=0.36,TS=0.52,TI=0.9,TH=1.05,TR=1.75,TE=2.15,N=10,WHIP=-0.28;
  // tentáculo translúcido con anillos y punta luminosa; uQ = pulso de carga que sube hasta la punta
  const TENT_FS=`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float rings=.5+.5*sin(u*46.-uT*4.);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float tip=smoothstep(.72,1.,u);float pulse=exp(-pow((u-uQ)*8.,2.))*step(.001,uQ);
   vec3 c=mix(uC2*.7,uC1,smoothstep(.25,1.,u))*(.75+.35*rings)+vec3(1.)*fr*.25;
   c+=uC1*(tip*(.5+uA)+pulse*1.6)+vec3(1.)*pulse*.5;
   gl_FragColor=vec4(c,(.5+.4*fr+tip*.3)*(.8+.2*rings));}`;
  const tents=[], shots=[];
  for(let i=0;i<N;i++){
    const b=i/N*Math.PI*2, th=b+(Math.random()-0.5)*0.22, rb=0.46+Math.random()*0.14, dx=Math.cos(th), dz=Math.sin(th);
    const h=(0.85+Math.random()*0.3)*(1+0.18*Math.max(dx,0)), cu=0.12+Math.random()*0.1, shoot=Math.cos(b)>0.3;
    const pts=[V3(0,-0.05,0),V3(dx*0.07,h*0.3,dz*0.07),V3(dx*0.17,h*0.62,dz*0.17),V3(dx*(0.24+cu),h*0.88,dz*(0.24+cu)),V3(dx*(0.2+cu*1.6),h,dz*(0.2+cu*1.6))];
    const m=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),40,8,0.07,0.014),fxU(TENT_FS,{uQ:{value:0}},NB));
    m.position.set(CX+dx*rb,0,dz*rb);
    m.userData={d:0.02+Math.random()*0.12+(shoot?0:0.05),ph:Math.random()*6.28,k:shoot?shots.length:-1};
    // salida del dardo: la punta con el tentáculo ya latigueado hacia delante
    if(shoot){const tl=pts[4],c=Math.cos(WHIP),s=Math.sin(WHIP);shots.push({s:V3(m.position.x+tl.x*c-tl.y*s,tl.x*s+tl.y*c,m.position.z+tl.z)});}
    L.mesh.add(m); tents.push(m);
  }
  // dardos: aguja oscura con punta venenosa luminosa
  const dartG=new THREE.ConeGeometry(0.03,0.3,8).rotateZ(-Math.PI/2);
  const dartMat=fx(`void main(){float l=vP.x/.3+.5;
   vec3 c=mix(vec3(.18,.04,.16),uC1*1.6,smoothstep(.4,1.,l))+vec3(1.)*smoothstep(.9,1.,l);
   gl_FragColor=vec4(c,1.);}`,NB);
  const ends=[V3(3.08,1.42,0.12),V3(3.12,1.22,-0.16),V3(3.05,1.05,0.2),V3(3.14,1.32,-0.04),V3(3.1,0.98,-0.12)];
  shots.forEach((d,k)=>{d.e=ends[k%5];d.t0=TS+k*0.03;d.t1=TI+k*0.022;d.h=0.45+0.12*k;d.m=new THREE.Mesh(dartG,dartMat);L.mesh.add(d.m);});
  const NS=shots.length;
  // halo de burbujas: aro horizontal sobre la cabeza
  const halo=new THREE.Mesh(new THREE.RingGeometry(0.42,0.72,64).rotateX(-Math.PI/2),fx(`
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*1.2;
   float cell=smoothstep(.35,.1,length(vec2(fract(an*3.82)-.5,(r-.8)*4.)));
   float band0=smoothstep(.45,.0,abs(r-.82)*3.);
   gl_FragColor=vec4(vec3(.45,.95,1.)*1.3+vec3(1.)*cell*.4,(band0*.25+cell*.5)*uA);}`));
  halo.position.set(CX,2.08,0);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),fx(RING_FS,{depthTest:false}));
  L.mesh.add(halo,hitRing);

  const C=`const float TG=${f(TG)};const float TS=${f(TS)};const float TI=${f(TI)};const float TH=${f(TH)};const vec3 TC=${v3(TC)};
  vec3 dartP(float i,float k){`+shots.map((d,k)=>`${k<NS-1?`if(i<${f(k+0.5)})`:``}return mix(${v3(d.s)},${v3(d.e)},k)+vec3(0.,${f(4*d.h)}*k*(1.-k),0.);`).join("")+`}
  vec2 dartT(float i){`+shots.map((d,k)=>`${k<NS-1?`if(i<${f(k+0.5)})`:``}return vec2(${f(d.t0)},${f(d.t1)});`).join("")+`}`;
  // brote: burbujas y espuma que salen del suelo al crecer la colonia
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.35;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=.35+.45*aSeed.w;vec3 p=vec3(${f(CX)}+cos(an)*rd+sin(t*7.+an)*.04,.05+t*1.4,sin(an)*rd);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,.06+.06*aSeed.y);}`,BUBBLE_FS);
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.3;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=.45+.3*aSeed.w+.5*(1.-exp(-t*3.));vec3 p=vec3(${f(CX)}+cos(an)*rd,.06+.15*t,sin(an)*rd);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.16+.1*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  // carga: motas que convergen en las puntas que van a disparar
  a.count+=points(L.part,50,C+`void main(){float i=floor(aSeed.z*${f(NS-0.001)});float s=TG-.06+aSeed.x*(TS-TG);float life=.16;float age=(uT-s)/life;
   vec3 tp=dartP(i,0.);vec3 p=mix(tp+normalize(rnd()+.0001)*.55,tp,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.w);}`);
  // estela venenosa de cada dardo
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.z*${f(NS-0.001)});vec2 T=dartT(i);float s=T.x+aSeed.x*(T.y-T.x);
   float life=.18+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dartP(i,(s-T.x)/(T.y-T.x))+rnd()*.025+vec3(0.,-.4*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`);
  // picadura: chispas y gotas de veneno
  a.count+=sparks(L.part,80,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.6,.3,0.",2,6,2.5);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.12;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.7,.4,0.))*(1.2+1.8*aSeed.z);vec3 p=TC+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.07+.04*aSeed.w);}`,DROP_FS);
  // curación: aro de burbujas que gira sobre la cabeza, columna de burbujas y destellos
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*1.4;float rd=.56+.06*sin(uT*3.+aSeed.y*9.);
   vec3 p=vec3(${f(CX)}+cos(an)*rd,2.08+.07*sin(an*3.+uT*4.)+(aSeed.z-.5)*.08,sin(an)*rd);
   float tw=.6+.4*sin(uT*6.+aSeed.w*30.);vA=uE*tw;put(p,(.08+.06*aSeed.z)*uE);vMix=aSeed.w+uT*.2;}`,CBUB_FS);
  a.count+=points(L.part,80,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;float rd=.5+.25*r.y;vec3 p=vec3(${f(CX)}+cos(an)*rd,.05+age*2.1,sin(an)*rd);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.85,1.,age))*uE:0.;put(p,(.05+.07*r.z)*(.6+.6*age));vMix=r.z+age;}`,CBUB_FS);
  a.count+=points(L.part,25,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TH-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(CX)}+(r.x-.5)*.9,.3+r.y*1.5+age*.4,(r.z-.5)*.9);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);

  // suelo: disco oral de la anémona bajo el Axie, onda de curación (cian) y onda bajo el rival
  const disc=groundPlane(1.9,CX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float rad=pow(abs(cos(an*12.+noise(vec3(r*4.,an,1.))*.6)),3.)*smoothstep(.95,.3,r)*step(.18,r);
   float lip=band(r,.2,.05)+band(r,uP*.95,.04);float body=smoothstep(uP,uP*.6,r)*.18;
   gl_FragColor=vec4(mix(uC2,uC1,rad*.6+lip),(rad*.45+lip+body)*step(r,uP)*uA);}`));
  const healRing=groundPlane(3.0,CX,0.03,fx(CRING_FS)), shock=groundPlane(2.8,3.4,0.03,fx(RING_FS));
  L.decal.add(disc,healRing,shock);

  const dp=V3(0,0,0), dq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH, heal=ss(TH,TH+0.2,te)*(1-ss(TR,TR+0.3,te)), chg=ss(TG,TS,te);
    caster.rotation.z=0.1*chg-0.18*ss(TS,TS+0.07,te)+0.08*ss(TS+0.1,TS+0.45,te);
    // tentáculos: brotan, se mecen, los frontales se echan atrás, latiguean y vuelven; al final se retraen
    for(const m of tents){const u=m.userData,g=ss(u.d,u.d+0.3,te)*(1-ss(TR+u.d*0.5,TE-0.05,te));
      m.visible=g>0.003; m.material.uniforms.uP.value=g*1.01;
      let wz=0.07*Math.sin(te*2.3+u.ph); const wx=0.07*Math.sin(te*1.9+u.ph*1.7);
      if(u.k>=0){const t0=TS+u.k*0.03;
        wz+=0.32*ss(TG,TS-0.03,te)*(1-ss(t0-0.05,t0,te))+WHIP*ss(t0-0.05,t0,te)*(1-ss(t0+0.1,t0+0.5,te));
        m.material.uniforms.uQ.value=te>TG&&te<t0+0.04?cl((te-TG)/(t0-TG))*1.05:0;}
      m.rotation.set(wx,0,wz);
      m.material.uniforms.uA.value=0.25+(u.k>=0?0.6*chg*(1-ss(TS+0.1,TS+0.4,te)):0)+0.5*heal;}
    for(const d of shots){const k=(te-d.t0)/(d.t1-d.t0);d.m.visible=k>=0&&k<1;
      if(d.m.visible){arcPt(d.s,d.e,d.h,k,dp);arcPt(d.s,d.e,d.h,Math.min(k+0.02,1),dq);d.m.position.copy(dp);orient(d.m,dq.sub(dp));}}
    let p=cl(ia/0.3); towardCam(hitRing.position,TC,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.8);
    p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    set(disc,ss(0,0.35,te),0.8*ss(0,0.2,te)*(1-ss(TR,TE,te)));
    p=cl(ih/0.6); set(healRing,1-Math.pow(1-p,2),ih>=0?(1-p)*0.8:0);
    halo.material.uniforms.uA.value=heal; halo.scale.setScalar(0.85+0.15*heal);
    U.uE.value=heal;
    const cm=caster.userData.m; cm.emissive.setRGB(0.45,0.95,1); cm.emissiveIntensity=0.3*heal*(0.75+0.25*Math.sin(te*7))+0.45*hitK(ih,5);
    // reacción: un respingo por dardo y veneno que late en el rival
    let kick=0; for(const d of shots){const t=te-d.t1;if(t>=0)kick+=0.06*Math.exp(-t*7);}
    target.position.x=3.4+kick; target.rotation.z=-kick*0.8*Math.cos(Math.max(ia,0)*20);
    shock.position.x=target.position.x;
    o.em=0.32*hitK(ia,2.2)*(0.7+0.3*Math.sin(te*20)); o.emc.copy(U.uC1.value);
    const s2=shots[Math.min(2,NS-1)];
    if(te<TS){o.g.set(CX,0.9,0);o.gs=1.1*ss(0,0.3,te)+0.6*chg;o.ga=0.16+0.25*chg;o.li=1.4+2.2*chg;}
    else if(te<TI){arcPt(s2.s,s2.e,s2.h,cl((te-s2.t0)/(s2.t1-s2.t0)),o.g);o.gs=0.9;o.ga=0.35;o.li=2.8;}
    else if(te<TH){o.g.copy(TC);o.gs=1.1+3*ia;o.ga=0.6*Math.exp(-ia*10);o.li=6*Math.exp(-ia*5);}
    else{o.g.set(CX,1.5,0);o.gs=1.9;o.ga=0.14*heal+0.4*Math.exp(-ih*6);o.li=2*heal+4*Math.exp(-ih*5);}
    if(te<TH){o.ia=ia;o.c.copy(TC);o.dist=0.5;o.flash=1;}else{o.ia=ih;o.c.set(CX,1.2,0);o.dist=0.3;o.flash=0;}
    o.shake=0;
  };
}};

// =====================================================================
// 2 · BABYLONIA — una caracola de babilonia cae desde la cabeza, rueda veloz sobre una lámina de agua con estela
//     en V y cola de gallo, y se estrella contra el rival levantando una salpicadura cónica
// =====================================================================
const babylonia={key:"qcBabylonia",name:"Babylonia",pa:2,dur:2.1,ti:1.08,pal:"Loto",
  phases:[["Caracola",0],["Rodada",0.34],["Choque",1.08],["Salpicadura",1.2],["Calma",1.6]],
build(a){
  const L=a.L,TS=0.3,TR=0.34,TI=1.08,R=0.3,X0=-3.05,XH=2.68,S0=V3(-3.5,2.0,0),LAND=V3(X0,R,0),IP=V3(2.85,0.32,0),CA=0.8;
  const roll=te=>X0+(XH-X0)*Math.pow(cl((te-TR)/(TI-TR)),1.35);
  const shellPos=(te,o)=>{
    if(te<TS)return arcPt(S0,LAND,0.35,te/TS,o);
    if(te<TI)return o.set(roll(te),R+(te>TR?0.025*Math.abs(Math.sin(te*38)):0),0);
    const k=cl((te-TI)/0.55);return o.set(XH-0.8*k,R+2.2*k*(1-k),0.15*k);};
  // concha: crema con manchas pardas sobre la espiral, sutura oscura, brillo mojado; uQ la deshace en agua
  const SHELL_FS=`uniform float uQ;
  void main(){float an=atan(vP.y,vP.x);float wh=fract(an/6.2832+vP.z*5.5);
   float sut=smoothstep(.05,0.,abs(wh-.5));
   float n=noise(vec3(an*3.,vP.z*14.,1.))*.65+noise(vec3(an*8.,vP.z*30.,4.))*.35;float spot=smoothstep(.55,.68,n);
   vec3 c=mix(vec3(.93,.86,.72),vec3(.42,.22,.1),spot*.85)*(1.-sut*.45);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float dz=noise(vP*9.+2.)-uQ*1.1+.05;if(dz<0.)discard;
   c=c*${LIT}+vec3(1.)*${SPEC(30)}*.7+uC1*fr*.5+uC1*smoothstep(.1,0.,dz)*step(.001,uQ)*2.;
   gl_FragColor=vec4(c,1.);}`;
  const shellMat=fxU(SHELL_FS,{uQ:{value:0}},SOLID);
  const shellG=new THREE.Group(), rollG=new THREE.Group(); shellG.add(rollG); L.mesh.add(shellG);
  const body=new THREE.Mesh(new THREE.SphereGeometry(R,32,24),shellMat); body.scale.set(1,1,0.9);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(R*0.62,R*1.2,24,4).rotateX(Math.PI/2).translate(0,0,R*0.75),shellMat);
  rollG.add(body,spire);
  // salpicadura cónica: lámina de agua desde el punto de choque, se abre hacia arriba y adelante
  const CH=1.4, cone=new THREE.Mesh(new THREE.ConeGeometry(0.95,CH,40,8,true).rotateZ(Math.PI/2).translate(CH/2,0,0),fx(`
  void main(){float l=vP.x/${f(CH)};float an=atan(vP.z,vP.y);
   float st=noise(vec3(an*7.,l*3.-uT*4.,1.))*.6+noise(vec3(an*19.,l*6.,2.))*.4;
   float lim=uP+(st-.5)*.25;if(l>lim)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float rim=smoothstep(.15,0.,lim-l);
   vec3 c=mix(uC2,uC1,st)*.9+vec3(1.)*(rim*.8+smoothstep(.62,.9,st)*.4);
   gl_FragColor=vec4(c,(.15+.5*fr+rim*.7)*smoothstep(0.,.1,l)*(.5+.6*st)*uA);}`));
  cone.position.copy(IP); cone.rotation.z=CA; L.mesh.add(cone);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const LEN=XH-X0+0.6, LX0=X0-0.3;
  const C=CAUS+`const float TS=${f(TS)};const float TR=${f(TR)};const float TI=${f(TI)};const vec3 S0=${v3(S0)};const vec3 IP=${v3(IP)};
  float sx(float t){return ${f(X0)}+${f(XH-X0)}*pow(clamp((t-TR)/(TI-TR),0.,1.),1.35);}`;
  // formación: remolino de agua que se cierra sobre la cabeza
  a.count+=points(L.part,50,C+`void main(){float life=.22;float s=aSeed.x*(TS-.2);float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*5.;float rd=mix(.7,.05,k*k);vec3 p=S0+vec3(cos(an)*rd,(aSeed.w-.5)*.3*(1.-k),sin(an)*rd);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.04*aSeed.y);}`);
  // aterrizaje
  a.count+=points(L.part,30,C+`void main(){float s=TS+aSeed.x*.03;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.8+aSeed.w),2.+1.5*aSeed.y,sin(an)*(.8+aSeed.w));
   vec3 p=vec3(${f(X0)},.05,0.)+v*t+vec3(0.,-8.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.06+.04*aSeed.w);}`,DROP_FS);
  // cola de gallo: gotas lanzadas hacia atrás y arriba por la concha al rodar
  a.count+=points(L.part,200,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.42+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sp=.5+.5*clamp((s-TR)/(TI-TR),0.,1.);vec3 v=vec3(-1.-1.2*aSeed.z,(1.8+1.6*aSeed.w)*sp,(aSeed.y-.5)*1.8);
   vec3 p=vec3(sx(s)-.15,.12,(aSeed.y-.5)*.25)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.4));}`,DROP_FS);
  // espuma y burbujas en la estela
  a.count+=points(L.part,80,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sd=aSeed.z<.5?-1.:1.;vec3 p=vec3(sx(s)-.1,.04,sd*(.12+.6*(1.-exp(-t*2.5))*aSeed.w));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.12+.1*aSeed.y)*(.7+age));}`,FOAM_FS,NB);
  a.count+=points(L.part,50,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(sx(s)-.2+(aSeed.z-.5)*.3,.05+t*.6,(aSeed.w-.5)*.5);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,.05+.05*aSeed.y);}`,BUBBLE_FS);
  // choque: gotas en el cono de la salpicadura, espuma y chispas
  a.count+=points(L.part,160,C+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 ax=vec3(${f(Math.cos(CA))},${f(Math.sin(CA))},0.);vec3 v=normalize(ax+rnd()*.55)*(2.8+3.4*aSeed.z);
   vec3 p=IP+v*t+vec3(0.,-8.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.06+.05*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.1;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.4,.8,0.));vec3 p=IP+vec3(.2,.3,0.)+d*(.3+.8*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.7:0.;put(p,(.28+.22*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  a.count+=sparks(L.part,60,TI,`${f(IP.x+0.15)},.6,0.`,".5,.8,0.",2,6,3);
  // rival empapado: gotas que caen de su cuerpo
  a.count+=points(L.part,30,C+`void main(){float s=TI+.15+aSeed.x*.7;float t=uT-s;float an=aSeed.z*6.2832;
   vec3 p=vec3(3.4+cos(an)*.44,.4+aSeed.w*1.2-4.5*max(t,0.)*max(t,0.),sin(an)*.44);
   vA=(t>0.&&p.y>.03)?.8:0.;put(p,.05+.03*aSeed.y);}`,DROP_FS);

  // suelo: lámina de agua que se revela bajo la concha, mancha húmeda y onda bajo el rival
  const lane=groundPlane(LEN,LX0+LEN/2,0.016,fx(CAUS+`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;float d=(uP-u)*${f(LEN)};if(d<0.)discard;
   float w=.22+.7*smoothstep(0.,2.5,d);float body=smoothstep(w,w*.3,abs(v));
   float cs=caus(vec3(u*${f(LEN*2.2)}-uT*.8,vUv.y*2.6,uT*.7));
   float kel=band(abs(v),min(d*.55,1.),.06)*exp(-d*.45)*step(.05,d);
   float foam=exp(-d*3.)*smoothstep(.5,0.,abs(v));
   float sp=smoothstep(.72,.85,noise(vec3(u*${f(LEN*6)},vUv.y*10.,uT*2.)))*kel;
   vec3 c=mix(uC2,uC1,cs*.7)*1.1+vec3(1.)*(foam+kel*.5+sp);
   gl_FragColor=vec4(c,(body*(.18+.45*cs)+kel*.8+foam*.9)*smoothstep(0.,.03,u)*uA);}`),1.2);
  const wet=groundPlane(3.0,3.4,0.018,fx(WET_FS)), shock=groundPlane(3.2,3.4,0.03,fx(RING_FS)), land=groundPlane(1.6,X0,0.03,fx(RING_FS));
  L.decal.add(lane,wet,shock,land);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI; shellPos(te,sp);
    caster.rotation.z=0.12*ss(0,0.15,te)-0.2*ss(0.15,0.24,te)+0.08*ss(0.26,0.6,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.12,te)*(1-ss(0.2,0.45,te));
    // concha: aparece, cae girando, rueda (ángulo = recorrido / radio), rebota y se deshace en agua
    const form=ss(0.02,0.15,te), q=ss(TI+0.15,TI+0.55,te);
    shellG.visible=te>0.02&&q<0.999; shellG.position.copy(sp);
    const lsq=te>=TS&&te<TR+0.1?Math.exp(-(te-TS)*14)*Math.sin((te-TS)*40):0, isq=hitK(ia,12);
    shellG.scale.set(form*(1+0.15*lsq+0.2*isq),form*(1-0.15*lsq-0.25*isq),form);
    rollG.rotation.z=te<TS?-te*9:te<TI?-TS*9-(roll(te)-X0)/R:-TS*9-(XH-X0)/R+5*(te-TI);
    shellMat.uniforms.uQ.value=q; shellMat.uniforms.uA.value=0;
    const sx=te<TR?X0:Math.min(sp.x,XH);
    set(lane,te<TR?0:(sx-LX0)/LEN,ss(TR,TR+0.05,te)*(1-ss(1.45,2.05,te)));
    let p=cl((te-TS)/0.4); set(land,p,te>=TS?(1-p)*0.6:0);
    p=cl(ia/0.4); cone.visible=ia>=0&&ia<0.8; cone.scale.setScalar(0.4+0.75*(1-Math.pow(1-p,2))); set(cone,0.25+0.8*p,ia>=0?1-ss(0.2,0.8,ia):0);
    towardCam(hitRing.position,tmp.set(IP.x,0.7,0),0.4); billboard(hitRing); p=cl(ia/0.3); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.8);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    set(wet,ss(0,0.3,ia),ia>=0?1-ss(0.6,1.0,ia):0);
    const hit=hitK(ia,4.5); target.position.x=3.4+hit*0.32*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-hit*0.3*Math.cos(ia*13);
    target.scale.set(1,1-0.06*hitK(ia,8),1); wet.position.x=shock.position.x=target.position.x;
    if(te<TS){o.g.copy(sp);o.gs=0.7;o.ga=0.25*form;o.li=1.5;}
    else if(te<TI){o.g.set(sp.x,0.4,0);o.gs=1.0;o.ga=0.32;o.li=2.6;}
    else{o.g.set(IP.x+0.2,0.8,0);o.gs=1.2+3*ia;o.ga=0.62*Math.exp(-ia*10);o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(IP.x,0.7,0);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 3 · CLAMSHELL — dos valvas gigantes de almeja emergen del agua alrededor del Axie, se abren y se cierran sobre él
//     de golpe; el nácar se funde en un escudo perlado reflectante que lo envuelve
// =====================================================================
const clam={key:"qcClamshell",name:"Clamshell",pa:2,dur:2.2,ti:0.78,pal:"Pureza",
  phases:[["Valvas",0],["Apertura",0.32],["Cierre",0.66],["Perla",0.98],["Escudo",1.3],["Disolución",1.8]],
build(a){
  const L=a.L,CX=-3.7,CY=0.95,RV=0.9,TU=0.32,TC0=0.66,TI=0.78,TP=0.98,TX=1.8,TE=2.18,OPEN=1.1;
  // valva: costillas radiales y anillos de crecimiento por fuera, nácar irisado por dentro; uQ la disuelve desde el borde
  const VALVE_FS=`uniform float uQ;
  void main(){vec3 q=normalize(vP);float az=atan(q.z,q.x);float h=abs(q.y);
   float rib=pow(abs(sin(az*9.)),.5);float grow=.5+.5*sin(h*34.+noise(q*5.)*2.5);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   vec3 irid=.6+.4*cos(6.2832*(fr*1.3+h*.9+noise(q*4.+vec3(uT*.15))*.6+vec3(0.,.33,.67)));
   vec3 outer=mix(vec3(.62,.58,.68),vec3(.97,.95,.93),rib*.65+grow*.35)*${LIT}+uC2*fr*fr*.35+vec3(1.)*${SPEC(24)}*.5;
   vec3 inner=mix(vec3(.96,.95,1.),irid,.6)*(.7+.4*fr)+vec3(1.)*${SPEC(40)}*.6;
   float dz=h*1.15+noise(q*7.+3.)*.25-uQ*1.45;if(dz<0.)discard;
   vec3 c=(gl_FrontFacing?outer:inner)+uC1*uA*.35+mix(uC2,uC1,.5)*smoothstep(.1,0.,dz)*step(.001,uQ)*2.;
   gl_FragColor=vec4(c,1.);}`;
  const valveMat=fxU(VALVE_FS,{uQ:{value:0}},DS);
  const dome=new THREE.SphereGeometry(1,48,14,0,Math.PI*2,0,Math.PI/2);
  const hinge=s=>{const g=new THREE.Group(),m=new THREE.Mesh(s>0?dome:new THREE.SphereGeometry(1,48,14,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI),valveMat);
    m.position.set(RV,0,0); m.scale.set(RV,RV*1.1,RV); g.add(m); L.mesh.add(g); return g;};
  const hT=hinge(1), hB=hinge(-1);
  // escudo perlado: iridiscencia de borde, reflejo de horizonte falso, velos de brillo y anillo que corre de la junta a los polos
  const pearl=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(`
  void main(){vec3 n=normalize(vN);vec3 v=normalize(vV);float fr=pow(1.-abs(dot(n,v)),2.2);vec3 r=reflect(-v,n);
   float sky=smoothstep(-.2,.6,r.y);float hor=band(r.y,.05,.08);
   vec3 irid=.55+.45*cos(6.2832*(fr*1.3+r.y*.4+vec3(0.,.33,.67)));
   float sheen=band(fract(vP.y*.6+vP.x*.25-uT*.35),.5,.06);
   float seam=band(abs(normalize(vP).y),uP,.07)*step(uP,.99);
   vec3 c=mix(uC2,uC1,sky)*.35+irid*fr*.9+vec3(1.)*(hor*.35+sheen*.5+seam);
   gl_FragColor=vec4(c,(fr*.85+.06+sheen*.22+hor*.2+seam*.8)*uA);}`));
  pearl.position.set(CX,CY,0); pearl.scale.set(RV*1.04,RV*1.13,RV*1.04); L.mesh.add(pearl);
  const seamRing=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4).rotateX(-Math.PI/2),fx(RING_FS)); seamRing.position.set(CX,CY,0); L.mesh.add(seamRing);

  const C=`const float TU=${f(TU)};const float TI=${f(TI)};const float TP=${f(TP)};const float TX=${f(TX)};const vec3 CP=vec3(${f(CX)},${f(CY)},0.);`;
  // tromba de agua que sube en espiral al emerger
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*.3;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*7.;float rd=.95-.2*age;vec3 p=vec3(${f(CX)}+cos(an)*rd,.05+t*3.,sin(an)*rd);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.04*aSeed.w);}`);
  // gotas que caen de los bordes mientras están abiertas
  a.count+=points(L.part,80,C+`void main(){float s=.12+aSeed.x*(TI-.12);float t=uT-s;float an=(aSeed.z-.5)*4.2;
   vec3 p=vec3(${f(CX)}+cos(an)*${f(RV)},CP.y+.15+aSeed.w*.75-5.*max(t,0.)*max(t,0.),sin(an)*${f(RV)});
   vA=(t>0.&&p.y>.03&&t<.6)?.85:0.;put(p,.05+.03*aSeed.y);}`,DROP_FS);
  // golpe de cierre: abanico horizontal de gotas desde la junta, espuma y destellos de nácar
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),.25+.5*aSeed.y,sin(an));
   vec3 p=CP+vec3(cos(an),0.,sin(an))*${f(RV)}+d*(2.2+2.6*aSeed.w)*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.08;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=CP+vec3(cos(an),0.,sin(an))*(${f(RV)}+.6*(1.-exp(-t*3.))*aSeed.w)+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.8:0.;put(p,(.16+.1*aSeed.y)*(.7+age));}`,FOAM_FS,NB);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.1;float life=.35+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=CP+vec3(cos(an)*${f(RV*1.02)},(aSeed.w-.5)*.12,sin(an)*${f(RV*1.02)});
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.22*(1.-age*.5));}`,STAR4_FS);
  // escudo: destellos que recorren la perla y burbujas de nácar en su interior
  a.count+=points(L.part,45,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float el=(r.y-.5)*2.6;vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=CP+d*vec3(${f(RV*1.06)},${f(RV*1.15)},${f(RV*1.06)});
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.12*r.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=points(L.part,45,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=.25+.4*r.y;vec3 p=vec3(${f(CX)}+cos(an)*rd+sin(age*7.+r.z*6.)*.05,.15+age*1.55,sin(an)*rd);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.85,1.,age))*uE*.8:0.;put(p,(.05+.06*r.z)*(.7+.5*age));}`,BUBBLE_FS);
  // disolución: el escudo se deshace en motas perladas
  a.count+=points(L.part,110,C+`void main(){float s=TX+aSeed.x*.3;float life=.5+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+.0001);vec3 p=CP+d*vec3(${f(RV*1.05)},${f(RV*1.13)},${f(RV*1.05)})+d*.5*t+vec3(0.,.7*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.z*40.)):0.;put(p,(.035+.04*aSeed.w)*(1.-age*.5));}`);

  // suelo: disco de nácar centrado bajo el Axie y onda del cierre
  const disc=groundPlane(2.5,CX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   vec3 irid=.6+.4*cos(6.2832*(r*1.4+uT*.15+vec3(0.,.33,.67)));
   float rings=pow(.5+.5*cos(r*42.+noise(vec3(p*5.,1.))*2.),4.)*smoothstep(1.,.5,r);
   float m=rings*.35+band(r,.95,.025)+smoothstep(.95,.2,r)*.08;
   gl_FragColor=vec4(mix(uC1,irid,.6)*1.1,m*uA);}`));
  const shock=groundPlane(3.6,CX,0.03,fx(RING_FS));
  L.decal.add(disc,shock);

  a.pose=function(te,o){
    const ia=te-TI, rise=ss(0,TU,te), q=ss(TP,TP+0.35,te), env=ss(TI,TI+0.12,te)*(1-ss(TX,TE,te));
    // apertura: emergen casi cerradas, se abren en par y se cierran de golpe (rebote corto al morder)
    let ang;
    if(te<TC0)ang=0.18+(OPEN-0.18)*ss(TU-0.05,TC0-0.08,te);
    else if(te<TI){const k=cl((te-TC0)/(TI-TC0));ang=OPEN*(1-k*k);}
    else ang=0.07*Math.exp(-ia*12)*Math.abs(Math.sin(ia*38));
    const y=CY-1.25*(1-rise);
    for(const [g,s] of [[hT,1],[hB,-0.35]]){g.position.set(CX-RV,y,0);g.rotation.z=s*ang;g.visible=te<TP+0.4;g.scale.setScalar(Math.max(0.6+0.4*rise,0.001));}
    valveMat.uniforms.uQ.value=q; valveMat.uniforms.uA.value=hitK(ia,5)*(ia>=0?1:0)+0.15*ss(TU,TI,te);
    pearl.visible=env>0.001; set(pearl,cl(ia/0.35),env*(0.8+0.25*hitK(ia,4)));
    let p=cl(ia/0.35); set(seamRing,p,ia>=0?(1-p)*0.9:0);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    set(disc,0,ss(0,0.3,te)*(1-ss(TX,TE,te))*0.8);
    U.uE.value=env;
    caster.rotation.z=0.06*Math.sin(te*3)*(1-env)-0.05*hitK(ia,8);
    caster.scale.set(1,1-0.05*hitK(ia,9),1);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.55*hitK(ia,5)+0.12*env*(0.8+0.2*Math.sin(te*5));
    if(te<TI){o.g.set(CX+0.6,CY+0.3*rise,0);o.gs=1.2*rise;o.ga=0.2*rise;o.li=1.5+1.5*rise;}
    else{o.g.set(CX,CY+0.2,0);o.gs=1.8+2.4*Math.min(ia,0.5);o.ga=0.6*Math.exp(-ia*8)+0.1*env;o.li=6*Math.exp(-ia*5)+1.6*env;}
    o.ia=ia;o.c.set(CX,CY,0);o.shake=0;o.dist=0.45;o.flash=0;
  };
}};

// =====================================================================
// 4 · SHOAL STAR — una estrella de mar afilada se forma en la cabeza y sale girando como una sierra ninja, con un
//     chorro de agua a presión detrás y salpicaduras cortantes; dos tajos de agua al impactar
// =====================================================================
const star={key:"qcShoalStar",name:"Shoal Star",pa:2,dur:1.9,ti:0.82,pal:"Loto",
  phases:[["Forma",0],["Vuelo",0.3],["Corte",0.82],["Rebote",0.95],["Calma",1.35]],
build(a){
  const L=a.L,TF=0.3,TI=0.82,S=V3(-3.45,2.05,0.05),E=V3(3.12,1.25,0),H=0.35;
  const sPos=(k,o)=>{arcPt(S,E,H,k,o);o.z+=0.22*Math.sin(Math.PI*k);return o;};
  const fk=te=>Math.pow(cl((te-TF)/(TI-TF)),1.15);
  // estrella de cinco brazos: tubérculos en hileras, disco central, filo de agua brillante; uQ la deshace
  const starMat=fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float arm=pow(.5+.5*cos(an*5.),1.6);float rs=.3+.62*arm;float d=r-rs;
   float h=clamp(1.-r/rs,0.,1.);
   float aa=floor(an/1.2566+.5)*1.2566;vec2 lp=vec2(cos(-aa)*p.x-sin(-aa)*p.y,sin(-aa)*p.x+cos(-aa)*p.y);
   float kx=fract(lp.x*9.)-.5;
   float nub=smoothstep(.04,.02,length(vec2(kx/9.,lp.y)))+smoothstep(.034,.016,length(vec2(kx/9.,abs(lp.y)-.1*(1.-lp.x))));
   nub*=step(.14,lp.x)*step(lp.x,.85);
   float core=smoothstep(.17,.13,r);
   float dz=noise(vec3(p*5.,1.))-uQ*1.1+.05;if(dz<0.)discard;
   vec3 body=mix(vec3(.9,.42,.24),vec3(1.,.68,.42),h)*(.6+.5*h);
   vec3 c=mix(body,uC1,.18)+vec3(1.,.93,.8)*nub*.6+vec3(1.,.8,.6)*core*.4;
   float edge=smoothstep(.05,0.,abs(d));c+=mix(uC1,vec3(1.),.4)*edge*1.8+uC1*smoothstep(.1,0.,dz)*step(.001,uQ)*2.;
   gl_FragColor=vec4(c,smoothstep(.02,-.01,d)*uA);}`,{uQ:{value:0}},Object.assign({depthTest:false},NB));
  const starM=new THREE.Mesh(new THREE.PlaneGeometry(0.72,0.72),starMat);
  // disco de giro: borrón circular de la sierra
  const blur=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float st=noise(vec3(an*3.+uT*40.,r*6.,0.));float m=smoothstep(1.,.8,r)*smoothstep(.45,.7,r)*(.3+.7*st);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.4,m*uA);}`,{depthTest:false}));
  blur.renderOrder=2; starM.renderOrder=1; L.mesh.add(starM,blur);
  // chorro a presión: tubo a lo largo del arco que se ve solo detrás de la estrella
  const jet=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:41},(_,i)=>sPos(i/40,V3(0,0,0)))),120,0.075,8,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.5)discard;float k=d/.5;
   float st=noise(vec3(u*60.-uT*30.,vUv.y*8.,0.));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);float core=1.-fr;
   vec3 c=mix(uC2,uC1,core*(1.-k))*1.4+vec3(1.)*core*(1.-k)*.6;
   gl_FragColor=vec4(c,(core*.8+fr*.3)*(1.-k)*(1.-k)*(.6+.5*st)*uA);}`));
  L.trail.add(jet);
  // tajos de agua sobre el rival
  const cuts=[0.5,-0.45].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.0,1.0),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));L.trail.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const C=`const float TF=${f(TF)};const float TI=${f(TI)};const vec3 S=${v3(S)};const vec3 E=${v3(E)};
  vec3 sP(float k){return mix(S,E,k)+vec3(0.,${f(4*H)}*k*(1.-k),.22*sin(3.14159*k));}
  float fk(float t){return pow(clamp((t-TF)/(TI-TF),0.,1.),1.15);}`;
  // formación: agua que se enrosca en la zona de la cabeza
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TF-.15);float life=.18;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832-k*6.;vec3 p=S+vec3(cos(an),sin(an),0.)*mix(.65,.1,k*k)+vec3(0.,0.,(aSeed.w-.5)*.2);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.y);}`);
  // salpicaduras cortantes: gotas despedidas en tangente al filo que gira
  a.count+=points(L.part,220,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float ph=aSeed.z*6.2832;vec3 rim=vec3(cos(ph),sin(ph),0.)*.3;vec3 tg=vec3(sin(ph),-cos(ph),(aSeed.w-.5)*.8);
   vec3 p=sP(fk(s))+rim+tg*(2.+2.5*aSeed.w)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.04+.035*aSeed.y)*(1.-age*.4));}`,DROP_FS);
  // corte: chorro de gotas que atraviesa al rival, chispas y bruma
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.08;float life=.5+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.8,.35,0.))*(2.2+3.5*aSeed.z);vec3 p=E+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=sparks(L.part,90,TI,`${f(E.x)},${f(E.y)},0.`,"-.3,.35,0.",2.5,7,2.5);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.1;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.4,0.));vec3 p=E+d*(.2+.6*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.6:0.;put(p,(.22+.18*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  // rebote: la estrella suelta agua mientras se deshace
  a.count+=points(L.part,40,C+`void main(){float s=TI+.05+aSeed.x*.35;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TI)/.4,0.,1.);vec3 o=E+vec3(-.7*k,1.2*sin(k*1.5708),.3*k);
   vec3 p=o+rnd()*.2+vec3(0.,-5.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.03*aSeed.w);}`,DROP_FS);

  // suelo: onda y mancha húmeda bajo el rival
  const shock=groundPlane(3.0,3.4,0.03,fx(RING_FS)), wet=groundPlane(2.6,3.4,0.018,fx(WET_FS));
  L.decal.add(shock,wet);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.03,TF,te), k=fk(te);
    caster.rotation.z=0.1*ss(0,TF*0.8,te)-0.2*ss(TF-0.04,TF+0.05,te)+0.1*ss(TF+0.1,TF+0.5,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*form*(1-ss(TF,TF+0.25,te));
    // estrella: se forma girando lento, vuela como sierra y rebota hacia arriba deshaciéndose
    const rb=cl((te-TI)/0.4);
    if(te<TI)sPos(te<TF?0:k,sp); else sp.set(E.x-0.7*rb,E.y+1.2*Math.sin(rb*Math.PI/2),0.3*rb);
    const spin=te<TF?-te*te*30:-TF*TF*30-(te-TF)*28+(te>TI?(te-TI)*18:0);
    const sc=Math.max((0.35+0.65*form)*(1+0.15*hitK(ia,14)),0.001), q=ss(TI+0.08,TI+0.4,te);
    starM.visible=te>0.03&&q<0.999; towardCam(starM.position,sp,0.05); billboard(starM,spin); starM.scale.setScalar(sc);
    starMat.uniforms.uQ.value=q; starMat.uniforms.uA.value=1;
    blur.visible=te>TF&&ia<0.1; blur.position.copy(starM.position); billboard(blur,spin); blur.scale.setScalar(sc); blur.material.uniforms.uA.value=0.6*(1-cl(ia/0.1));
    jet.visible=te>TF&&ia<0.3; set(jet,k*1.0,ia>0?1-cl(ia/0.3):ss(TF,TF+0.05,te));
    cuts.forEach((m,i)=>{const t0=TI-0.02+i*0.08,s=(te-t0)/0.08;m.visible=s>=0&&te<TI+0.6;towardCam(m.position,E,0.55+i*0.02);billboard(m,i?-0.45:0.5);
      set(m,Math.min(s,1)*1.2,s>1?Math.exp(-(s-1)*1.5):1);m.material.uniforms.uQ.value=s>1?0.6*Math.exp(-(te-t0-0.08)*3):0;});
    let p=cl(ia/0.3); towardCam(hitRing.position,E,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.8);
    p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    set(wet,ss(0,0.35,ia),ia>=0?1-ss(0.5,1.0,ia):0);
    const h1=hitK(ia,6), h2=hitK(ia-0.08,6)*(ia>=0.08?1:0);
    target.position.x=3.4+h1*0.12+h2*0.16; target.rotation.z=-h1*0.18*Math.cos(ia*24)+h2*0.22*Math.cos((ia-0.08)*16); wet.position.x=shock.position.x=target.position.x;
    if(te<TF){o.g.copy(S);o.gs=0.8*form;o.ga=0.3*form;o.li=1.8*form;}
    else if(te<TI){o.g.copy(sp);o.gs=1.0;o.ga=0.38;o.li=3;}
    else{o.g.copy(E);o.gs=1.1+3*ia;o.ga=0.62*Math.exp(-ia*11);o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(E);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 5 · TEAL SHELL — un arco de agua sale de la cabeza hacia el aliado y se abre en un caparazón de tortuga cian
//     frente a él; ondas de marea recorren las placas y el caparazón se deshace en espuma
// =====================================================================
const teal={key:"qcTealShell",name:"Teal Shell",pa:2,dur:2.2,ti:0.55,pal:"Menta",allies:1,
  phases:[["Chorro",0],["Caparazón",0.45],["Escudo",0.55],["Mareas",0.95],["Disolución",1.8]],
build(a){
  const L=a.L,AP=ALLY_POS[0],TJ=0.06,TA=0.45,TI=0.55,TW=[0.95,1.3,1.65],TX=1.8,TE=2.18,SR=1.05,CY=1.0;
  const S=V3(-3.5,1.95,0.05), E=V3(AP.x+0.92,1.05,AP.z), CC=V3(-3.0,3.2,-1.0), SC=V3(AP.x,CY,AP.z);
  // chorro: tubo de agua a lo largo del arco; uP = frente, uQ = cola que se vacía en el caparazón
  const arcMat=fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;
   float st=noise(vec3(u*30.-uT*12.,vUv.y*6.,0.));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float head=smoothstep(.06,0.,uP-u)*step(uP,.999);
   vec3 c=mix(uC2,uC1,st*.6+fr*.4)*1.2+vec3(1.)*(head*.8+smoothstep(.7,.9,st)*.4);
   gl_FragColor=vec4(c,(.25+.6*fr+head)*(.6+.5*st)*uA);}`,{uQ:{value:0}});
  const arc=new THREE.Mesh(pathTube((t,o)=>qbz(S,CC,E,t,o),24,70,8,0.06,0.1),arcMat); L.trail.add(arc);
  // caparazón: casquete esférico mirando a +x; escudos hexagonales con anillos de crecimiento y juntas luminosas;
  // las placas aparecen del centro al borde (uP), las mareas son anillos que recorren la superficie
  const shellMat=fxU(`uniform float uQ;
  vec4 hexG(vec2 p){vec2 r=vec2(1.,1.732);vec2 h=r*.5;vec2 a=mod(p,r)-h;vec2 b=mod(p-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;return vec4(g,p-g);}
  float hexD(vec2 g){g=abs(g);return max(dot(g,vec2(.5,.866)),g.x);}
  void main(){float az=atan(vP.z,vP.x);float el=asin(clamp(vP.y/${f(SR)},-1.,1.));vec2 p=vec2(az,el)*2.6;
   vec4 h=hexG(p);float e=hexD(h.xy);vec2 id=h.zw;float rc=length(vec2(az,el));float hs=hash(vec3(id,1.));
   float on=smoothstep(rc*.55+hs*.12,rc*.55+hs*.12+.08,uP);float off=smoothstep(hs*.6,hs*.6+.2,uQ);
   float seam=smoothstep(.42,.5,e);float plate=1.-smoothstep(.3,.47,e);float growth=.5+.5*sin(e*40.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   float tide=0.;for(int i=0;i<3;i++){float tt=uT-(${f(TW[0])}+float(i)*${f(TW[1]-TW[0])});tide+=band(rc,tt*1.6,.09)*step(0.,tt)*exp(-tt*1.8);}
   float rim=smoothstep(.8,1.,max(abs(az),abs(el-.15)/1.));
   vec3 c=mix(uC2,uC1,plate*growth*.4+seam)*.9+vec3(1.)*(seam*.35+tide*.6);
   gl_FragColor=vec4(c,(plate*(.16+.1*growth)+seam*.9+fr*.3+tide*.8+rim*.3)*on*(1.-off)*uA);}`,{uQ:{value:0}});
  const shell=new THREE.Mesh(new THREE.SphereGeometry(SR,48,24,Math.PI-1.0,2.0,0.42,2.0),shellMat); shell.position.copy(SC);
  L.mesh.add(shell);

  const C=`const float TA=${f(TA)};const float TI=${f(TI)};const float TX=${f(TX)};const vec3 S=${v3(S)};const vec3 E=${v3(E)};const vec3 CC=${v3(CC)};const vec3 SC=${v3(SC)};
  vec3 bz(float t){float u=1.-t;return u*u*S+2.*u*t*CC+t*t*E;}`;
  // agua que se reúne en la cabeza
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.1;float life=.14;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(S+normalize(rnd()+.0001)*.5,S,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.w);}`);
  // gotas que se desprenden del arco y caen
  a.count+=points(L.part,120,C+`void main(){float s=.08+aSeed.x*(TA-.05);float hd=clamp((s-.06)/(TA-.06),0.,1.);float u=hd*(.4+.6*aSeed.z);
   float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz(u)+rnd()*.06+vec3((aSeed.w-.5)*.6*t,-.4*t-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.045+.03*aSeed.y);}`,DROP_FS);
  // llegada: espuma y salpicadura donde el chorro abre el caparazón
  a.count+=points(L.part,60,C+`void main(){float s=TA+aSeed.x*.2;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.6,.2,0.));vec3 p=E+d*(.2+.6*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.15*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.75:0.;put(p,(.14+.1*aSeed.y)*(.7+age));}`,FOAM_FS,NB);
  a.count+=points(L.part,50,C+`void main(){float s=TA+aSeed.x*.08;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.8,.6,0.))*(1.5+2.5*aSeed.z);vec3 p=E+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.035*aSeed.w);}`,DROP_FS);
  // mareas: en cada onda, gotas que saltan del borde del caparazón
  TW.forEach(tw=>{a.count+=points(L.part,40,C+`void main(){float s=${f(tw+0.55)}+aSeed.x*.05;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(aSeed.z-.5)*2.;float el=(aSeed.w<.5?-.7:1.)*(.6+.4*aSeed.y);vec3 n=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=SC+n*${f(SR)}+(n+vec3(.4,.3,0.))*(1.4+1.2*aSeed.y)*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.045+.03*aSeed.y);}`,DROP_FS);});
  // burbujas que suben entre el aliado y el caparazón; destellos en las placas
  a.count+=points(L.part,70,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=(r.x-.5)*1.8;float rd=.5+.4*r.y;vec3 p=SC+vec3(cos(an)*rd+sin(age*6.+r.z*7.)*.05,-.95+age*2.,sin(an)*rd);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.85,1.,age))*uE:0.;put(p,(.05+.06*r.z)*(.7+.5*age));}`,BUBBLE_FS);
  a.count+=points(L.part,30,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=(r.x-.5)*1.9;float el=(r.y-.4)*1.8;vec3 p=SC+vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el))*${f(SR*1.01)};
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // disolución en espuma
  a.count+=points(L.part,80,C+`void main(){float s=TX+aSeed.x*.3;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(aSeed.z-.5)*2.;float el=(aSeed.w-.4)*1.9;vec3 n=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=SC+n*${f(SR)}+n*.4*t+vec3(0.,-.8*t*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.1+.08*aSeed.y)*(.7+age));}`,FOAM_FS,NB);

  // suelo bajo el aliado (centrado): roseta hexagonal y una onda por marea
  const mark=groundPlane(2.6,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float hx=cos(3.14159/6.)/cos(mod(an+3.14159/6.,3.14159/3.)-3.14159/6.);
   float m=band(r,.88*hx,.025)+band(r,.55*hx,.02)*.7+pow(abs(cos(an*3.)),30.)*smoothstep(.88,.3,r)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*step(r,uP*1.1)*uA);}`)); mark.position.z=AP.z;
  const tides=[TI,...TW].map(()=>{const m=groundPlane(3.2,AP.x,0.03,fx(RING_FS));m.position.z=AP.z;L.decal.add(m);return m;});
  L.decal.add(mark);

  const hp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, hd=ss(TJ,TA,te), env=ss(TI,TI+0.2,te)*(1-ss(TX,TE,te));
    caster.rotation.z=0.12*ss(0,TJ+0.05,te)-0.2*ss(TJ+0.05,TJ+0.14,te)+0.08*ss(0.2,0.5,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.1,te)*(1-ss(0.2,0.5,te));
    arc.visible=te>TJ&&te<TI+0.25; set(arc,hd*1.01,0.9); arcMat.uniforms.uQ.value=ss(TA,TI+0.22,te);
    shell.visible=te>TA-0.05&&te<TE; set(shell,cl((te-TA+0.03)/0.4)*1.2,0.9*(1+0.6*hitK(ia,6)*(ia>=0?1:0)));
    shellMat.uniforms.uQ.value=ss(TX,TE,te);
    shell.scale.setScalar(1+0.03*Math.sin(te*3)*env);
    U.uE.value=env;
    set(mark,ss(TA,TI+0.3,te),0.85*ss(TA,TI,te)*(1-ss(TX,TE,te)));
    [TI,...TW].forEach((t,i)=>{const p=cl((te-t)/0.6);set(tides[i],1-Math.pow(1-p,2),te>=t?(1-p)*(i?0.45:0.75):0);});
    // aliado: se ilumina al cerrarse el caparazón y en cada marea
    let tk=0; for(const t of TW)if(te>=t+0.5)tk+=Math.exp(-(te-t-0.5)*6);
    allyGlow(0,0.2*env+0.5*hitK(ia,5)*(ia>=0?1:0)+0.25*tk);
    if(te<TA){qbz(S,CC,E,hd,hp);o.g.copy(hp);o.gs=0.9;o.ga=0.3*ss(TJ,TJ+0.1,te);o.li=2.2;}
    else{o.g.set(E.x,CY,AP.z);o.gs=1.6+0.6*env;o.ga=0.1*env+0.5*hitK(ia,8)*(ia>=0?1:0)+0.12*tk;o.li=1.5*env+5*hitK(ia,5)*(ia>=0?1:0)+tk;}
    o.ia=ia;o.c.set(E.x,CY,AP.z);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

// =====================================================================
// 6 · ORANDA — un pez dorado espiritual (capuchón de oranda, doble cola de velo) nace de un remolino en la cabeza,
//     cruza el campo, nada en círculos sobre un torbellino alrededor del rival, sube y se lanza en picado:
//     explosión de agua con corona de salpicadura, lluvia de escamas brillantes y fractura de baldosas (nivel 3)
// =====================================================================
const oranda={key:"qcOranda",name:"Oranda",pa:3,dur:3.2,ti:2.1,pal:"Dorado",
  phases:[["Invocación",0],["Travesía",0.3],["Danza",0.85],["Picado",1.8],["Explosión",2.1],["Escamas",2.35],["Calma",2.8]],
build(a){
  const L=a.L,TA0=0.3,TA1=0.85,TB1=1.8,TI=2.1,TX=3.4,YC=1.75,RC=1.75,FS=6.4;
  const A0=V3(-3.5,2.35,0), AC=V3(0.2,2.2,-2.0), A1=V3(TX,YC,-RC), D0=V3(TX,YC+0.9,-(RC-0.3)), DC=V3(4.9,4.4,-0.4), D1=V3(3.3,1.35,0);
  const fishP=(t,o)=>{
    if(t<TA0)return o.set(A0.x,A0.y+0.06*Math.sin(t*9),A0.z);
    if(t<TA1){const k=(t-TA0)/(TA1-TA0);return qbz(A0,AC,A1,k*(0.6+0.4*k),o);}
    if(t<TB1){const k=(t-TA1)/(TB1-TA1),th=1.5*Math.PI+2*Math.PI*k,R=RC-0.3*ss(0.6,1,k);
      return o.set(TX+R*Math.cos(th),YC+0.18*Math.sin(4*Math.PI*k)+0.9*ss(0.55,1,k),R*Math.sin(th));}
    return qbz(D0,DC,D1,Math.pow(cl((t-TB1)/(TI-TB1)),1.4),o);};
  // ---- pez: cuerpo de escamas espiritual, capuchón rugoso, doble cola y aletas de velo
  const fishG=new THREE.Group(); L.mesh.add(fishG);
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.4,40,28),fx(`
  void main(){vec3 q=normalize(vP);float an=atan(q.y,q.z);
   vec2 g=vec2(vP.x*11.,an*3.2);g.y+=floor(g.x)*.5;vec2 fq=fract(g)-.5;
   float sc=band(length(vec2(fq.x+.35,fq.y)),.5,.07);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);float belly=smoothstep(.2,-.6,q.y);
   float eye=smoothstep(.986,.994,dot(q,normalize(vec3(.82,.28,.5*sign(q.z)))));
   vec3 c=mix(uC2,uC1,.35+.5*fr+.3*belly)*(.6+.5*sc)+vec3(1.)*(pow(fr,3.)*.4+sc*.2+eye*1.5);
   gl_FragColor=vec4(c*1.2,(.35+.55*fr+sc*.2+eye)*uA);}`));
  body.scale.set(1.5,0.95,0.72);
  const wen=new THREE.Mesh(new THREE.SphereGeometry(0.2,24,16),fx(`
  void main(){float n=noise(vP*34.)*.6+noise(vP*70.)*.4;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2*1.3,uC1,n)*1.3+vec3(1.)*smoothstep(.7,.9,n)*.3,(.4+.5*fr)*(.6+.5*n)*uA);}`));
  wen.position.set(0.38,0.2,0); wen.scale.set(1.1,0.8,1.2);
  // aleta de velo: abanico con radios que ondea; raíz en x=0 y punta hacia −x
  const FIN_FS=`void main(){float u=1.-vUv.x;float v=vUv.y-.5;
   float w=.12+.38*u;float vv=v-sin(u*7.-uT*9.)*.06*u;
   float shape=smoothstep(w,w-.08,abs(vv))*smoothstep(1.,.75,u+abs(vv)*.3);
   float rays=.5+.5*cos(atan(vv,u+.05)*30.);float n=noise(vec3(u*4.-uT*2.,vv*6.,uP));
   vec3 c=mix(uC2,uC1,.3+.5*rays*(1.-u))*1.2+vec3(1.)*smoothstep(.75,.95,u)*.2;
   gl_FragColor=vec4(c,shape*(.25+.35*rays+.2*n)*(1.-u*.5)*uA);}`;
  const finMat=fx(FIN_FS), tailG=new THREE.Group(); tailG.position.set(-0.55,0,0);
  const tg=new THREE.PlaneGeometry(1.0,0.8).translate(-0.5,0,0);
  for(const s of [-1,1]){const m=new THREE.Mesh(tg,finMat);m.rotation.x=0.5*s;tailG.add(m);}
  const dorsal=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.45).translate(-0.3,0,0),finMat); dorsal.position.set(0.15,0.32,0); dorsal.rotation.z=-0.5;
  const pecs=[-1,1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.3).translate(-0.2,0,0),finMat);m.position.set(0.18,-0.18,0.24*s);m.rotation.set(1.1*s,0.4*s,0.5);return m;});
  fishG.add(body,wen,tailG,dorsal,...pecs);
  // estela dorada: tubo por toda la trayectoria; solo se ve una ventana detrás del pez (uP = avance por longitud)
  const NP=200, pts=[], cum=[0];
  for(let i=0;i<NP;i++){pts.push(fishP(TA0+(TI-TA0)*i/(NP-1),V3(0,0,0)));if(i)cum.push(cum[i-1]+pts[i].distanceTo(pts[i-1]));}
  const TOT=cum[NP-1];
  const uAt=te=>{const x=cl((te-TA0)/(TI-TA0))*(NP-1),i=Math.min(Math.floor(x),NP-2),fr=x-i;return (cum[i]+(cum[i+1]-cum[i])*fr)/TOT;};
  const trail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),400,0.12,8,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.16)discard;float k=d/.16;
   float st=noise(vec3(u*90.-uT*6.,vUv.y*6.,0.));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float gl=step(.93,hash(vec3(floor(u*400.),floor(vUv.y*8.),floor(uT*12.))));
   gl_FragColor=vec4(mix(uC1,uC2,k)*1.3+vec3(1.)*gl,((1.-fr)*.5+fr*.4)*(1.-k)*(1.-k)*(.6+.5*st)*uA+gl*(1.-k)*uA);}`));
  L.trail.add(trail);
  // explosión: esfera de agua que se deshace, corona de salpicadura en el suelo y destello
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(CAUS+`
  void main(){float n=noise(vP*2.6+vec3(uT*.8));float th=uP*1.15-.1;if(n<th)discard;
   float edge=smoothstep(.12,0.,n-th);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float cs=caus(vP*3.+vec3(0.,uT,0.));
   vec3 c=mix(${WATER},uC1,fr*.5+cs*.3)*(.6+.9*fr)+vec3(1.)*(edge*1.1+cs*.25);
   gl_FragColor=vec4(c,(.1+.55*fr+edge+cs*.15)*(1.-uP));}`)); burst.position.copy(D1);
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,64,8,true).translate(0,0.5,0),fx(`
  void main(){float an=atan(vP.z,vP.x);float y=vP.y;
   float jag=.62+.3*noise(vec3(an*6.,uT*.5,1.))+.12*pow(abs(sin(an*11.)),3.);
   float top=smoothstep(jag,jag-.12,y);float st=noise(vec3(an*14.,y*4.-uT*3.,2.));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);float rim=band(y,jag-.05,.06);
   vec3 c=mix(${WATER},uC1,.25+.3*st)*(.5+.7*fr)+vec3(1.)*(rim*.8+smoothstep(.7,.9,st)*.3);
   gl_FragColor=vec4(c,(top*(.15+.45*fr)*(.6+.5*st)+rim*.7*top)*uA);}`)); crown.position.set(TX,0,0);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,crown,hitRing);

  const C=`const float TA0=${f(TA0)};const float TA1=${f(TA1)};const float TB1=${f(TB1)};const float TI=${f(TI)};
  const vec3 A0=${v3(A0)};const vec3 AC=${v3(AC)};const vec3 A1=${v3(A1)};const vec3 D0=${v3(D0)};const vec3 DC=${v3(DC)};const vec3 D1=${v3(D1)};varying float vR;
  vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
  vec3 fishP(float t){if(t<TA0)return A0;
   if(t<TA1){float k=(t-TA0)/(TA1-TA0);return bz(A0,AC,A1,k*(.6+.4*k));}
   if(t<TB1){float k=(t-TA1)/(TB1-TA1);float th=4.7124+6.2832*k;float R=${f(RC)}-.3*smoothstep(.6,1.,k);
    return vec3(${f(TX)}+R*cos(th),${f(YC)}+.18*sin(12.566*k)+.9*smoothstep(.55,1.,k),R*sin(th));}
   return bz(D0,DC,D1,pow(clamp((t-TB1)/(TI-TB1),0.,1.),1.4));}`;
  // invocación: remolino de agua que se cierra en la zona de la cabeza
  a.count+=points(L.part,90,C+`void main(){float s=aSeed.x*(TA0-.12);float life=.24;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*7.;float rd=mix(1.,.08,k*k);vec3 p=A0+vec3(cos(an)*rd,(aSeed.w-.5)*.5*(1.-k)+sin(an*2.)*.1,sin(an)*rd);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;vR=0.;put(p,.04+.05*aSeed.y);}`);
  // estela: burbujas doradas y escamas sueltas a lo largo del nado
  a.count+=points(L.part,140,C+`void main(){float s=TA0+aSeed.x*(TI-TA0);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=fishP(s)+rnd()*.2+vec3(sin(t*6.+aSeed.z*9.)*.05,.35*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;vR=0.;put(p,(.05+.07*aSeed.w)*(.7+.5*age));}`,BUBBLE_FS);
  a.count+=points(L.part,70,C+`void main(){float s=TA0+aSeed.x*(TI-TA0);float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=fishP(s)+rnd()*.15+vec3(sin(t*4.+aSeed.z*9.)*.15,-.7*t,cos(t*3.+aSeed.w*9.)*.1);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;vR=0.;put(p,.09+.05*aSeed.w);vMix=aSeed.w+t*(1.5+2.*aSeed.y);}`,SCALE_FS);
  // danza: corriente que sube en espiral alrededor del rival
  a.count+=points(L.part,80,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TA1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rd=1.5-age*.6;vec3 p=vec3(${f(TX)}+cos(an)*rd,.05+age*2.4,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vR=0.;put(p,.035+.04*r.z);}`);
  // explosión: chispas doradas, gotas, escamas brillantes que caen revoloteando, espuma y burbujas
  a.count+=sparks(L.part,200,TI,`${f(D1.x)},${f(D1.y)},0.`,"0.,.5,0.",4,12,3.2);
  a.count+=points(L.part,300,C+`void main(){float s=TI+aSeed.x*.08;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.7,0.))*(3.+5.5*aSeed.z);vec3 p=D1+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;vR=0.;put(p,(.07+.06*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,240,C+`void main(){float s=TI+aSeed.x*.1;float life=1.2+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(2.5+4.*aSeed.z);
   vec3 p=D1+v*(1.-exp(-t*2.2))/2.2+vec3(sin(t*4.+aSeed.w*9.)*.25,-.55*t*t,cos(t*3.5+aSeed.y*9.)*.2);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.03,age)*(1.-age*age):0.;vR=0.;put(p,.12+.08*aSeed.w);vMix=aSeed.w+t*(2.+3.*aSeed.y);}`,SCALE_FS);
  a.count+=points(L.part,100,C+`void main(){float s=TI+aSeed.x*.15;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX)},.06,0.)+vec3(cos(an),0.,sin(an))*(.5+2.3*(1.-exp(-t*2.5))*(.5+.5*aSeed.w))+vec3(0.,.3*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.85:0.;vR=0.;put(p,(.3+.3*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  a.count+=points(L.part,70,C+`void main(){float s=TI+.1+aSeed.x*.5;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=.3+1.3*aSeed.w;vec3 p=vec3(${f(TX)}+cos(an)*rd,.1+t*1.1,sin(an)*rd);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;vR=0.;put(p,.06+.08*aSeed.y);}`,BUBBLE_FS);

  // suelo: torbellino bajo el rival durante la danza, fractura de baldosas, mancha húmeda y dos ondas (todo centrado en él)
  const whirl=groundPlane(4.2,TX,0.02,fx(CAUS+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sw=fract(an/6.2832*3.+r*2.4+uT*1.3);float arms=band(sw,.5,.18)*smoothstep(1.,.25,r);
   float cs=caus(vec3(p*8.,uT*.6));float eye=smoothstep(.25,0.,r);
   gl_FragColor=vec4(mix(uC2,uC1,cs)*1.2,(arms*.55+cs*.25*smoothstep(1.,.3,r)+band(r,.95,.03))*uA*(1.-eye*.6));}`));
  const frac=groundPlane(FS,TX,0.025,fx(tileFractureFS(FS))), wet=groundPlane(5.2,TX,0.018,fx(WET_FS));
  const shock=groundPlane(9,TX,0.03,fx(RING_FS)), shock2=groundPlane(6,TX,0.032,fx(RING_FS));
  L.decal.add(whirl,wet,frac,shock,shock2);

  const fp=V3(0,0,0), fa=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.06,TA0,te), dance=ss(TA1-0.1,TA1+0.2,te)*(1-ss(TI,TI+0.3,te));
    caster.rotation.z=0.12*ss(0,TA0,te)-0.12*ss(TA0,TA0+0.25,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.4*ss(0,0.15,te)*(1-ss(TA0,TA0+0.3,te));
    // pez: sigue la trayectoria mirando hacia donde nada; la cola ondea; al picar se estira y brilla
    fishP(te,fp); fishP(Math.min(te+0.01,TI),fa); fishP(Math.max(te-0.01,0),tmp2); fa.sub(tmp2);
    fishG.visible=te>0.05&&ia<0; fishG.position.copy(fp);
    if(te>TA0)orient(fishG,fa); else fishG.rotation.set(0,-0.4,0.15*Math.sin(te*6));
    const dive=ss(TB1,TI,te);
    fishG.scale.set(Math.max(form*(1+0.25*dive),0.001),Math.max(form*(1-0.1*dive),0.001),Math.max(form,0.001));
    tailG.rotation.y=0.38*Math.sin(te*(14+10*dive)); for(const [i,m] of pecs.entries())m.rotation.y=(i?0.4:-0.4)+0.25*Math.sin(te*11+i);
    const fA=0.85+0.6*dive; for(const m of [body,wen])m.material.uniforms.uA.value=fA; set(dorsal,0,fA*0.9); finMat.uniforms.uA.value=fA*0.9;
    trail.visible=te>TA0&&ia<0.25; set(trail,uAt(te),ia>0?1-cl(ia/0.25):ss(TA0,TA0+0.1,te));
    // explosión
    let p=cl(ia/0.6); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.4+2.4*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.9); crown.visible=ia>=0&&p<1; crown.scale.set(0.8+2.0*(1-Math.pow(1-p,2)),Math.max(2.4*Math.sin(Math.PI*Math.min(p*1.3,1)),0.001),0.8+2.0*(1-Math.pow(1-p,2)));
    crown.material.uniforms.uA.value=ia>=0?1-ss(0.5,0.9,ia):0;
    p=cl(ia/0.4); towardCam(hitRing.position,D1,0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(whirl,0,dance*0.9); whirl.rotation.y=0;
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(0.9,1.1,ia):0);
    set(wet,ss(0,0.4,ia),ia>=0?1-ss(0.7,1.1,ia):0);
    p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0); p=cl((ia-0.12)/0.6); set(shock2,1-Math.pow(1-p,2),ia>=0.12?(1-p)*0.7:0);
    U.uE.value=dance;
    // rival: se balancea hipnotizado durante la danza; golpe pesado con retroceso y aplastamiento
    const hit=hitK(ia,3.2);
    target.position.x=TX+hit*0.6*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=0.06*Math.sin(te*4)*dance-hit*0.45*Math.cos(ia*12);
    const sq=hitK(ia,7); target.scale.set(1+0.08*sq,1-0.16*sq,1+0.08*sq);
    for(const m of [whirl,wet,shock,shock2])m.position.x=target.position.x;
    if(te<TA0){o.g.copy(fp);o.gs=1.4*form;o.ga=0.35*form;o.li=2.5*form;}
    else if(te<TI){o.g.copy(fp);o.gs=1.6+0.8*dive;o.ga=0.4+0.25*dive;o.li=3.5+4*dive;}
    else{o.g.copy(D1);o.gs=2+6*Math.min(ia,0.6);o.ga=Math.exp(-ia*8)*0.95;o.li=15*Math.exp(-ia*4);}
    o.ia=ia;o.c.copy(D1);o.shake=1.6;o.dist=1.3;
  };
}};

VFX.module("Acuático · Cuernos",[anemone,babylonia,clam,star,teal,oranda]);
})();

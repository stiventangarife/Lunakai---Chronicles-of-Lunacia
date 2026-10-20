// =====================================================================
// MÓDULO 2 · CLASE BESTIA (BOCA)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Las piezas reutilizables vienen de vfx-lib.js (VFX.lib).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,SCORCH_FS,
  camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,fireFS,CHIP_FS,DUST_FS,FLAME_FS,CHEVRON_FS,billboard,towardCam,taperTube,
  SD_HEART,HEART_FS,STAR4_FS,SMOKE_FS,FANG_FS}=VFX.lib;

VFX.palette("Rosa",["#ff7aa8","#c0124a"]);

const MO=V3(-3.43,1.55,0);               // boca del lanzador (frente de la cabeza)
const TC=V3(3.15,1.2,0);                  // pecho del objetivo, cara visible
const TH=V3(3.25,1.62,0);                 // cabeza del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitFlat=(o,ia,k)=>ia>=0?Math.exp(-ia*k):0;
// quemadura suave (nivel 2): mancha difusa sin grietas, uA la apaga
const SOFT_BURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=noise(vec3(p*5.,1.))*.6+noise(vec3(p*11.,4.))*.4;float m=smoothstep(1.,.2,r+(n-.5)*.35);
 gl_FragColor=vec4(mix(uC2,uC1,m*.5+n*.2)*1.2,m*m*.35*uA);}`;

// =====================================================================
// 1 · AXIE KISS — beso volador en forma de corazón; estalla y deja una calavera espectral (Death Mark)
//     nivel 2: firme y estándar — vuelo más corto, estallido y marca contenidos
// =====================================================================
const kiss={key:"kiss",name:"Axie Kiss",dur:2.2,ti:0.7,pal:"Rosa",
  phases:[["Beso",0],["Vuelo",0.25],["Estallido",0.7],["Death Mark",0.85],["Fin",1.95]],
build(a){
  const L=a.L,TL=0.25,TI=0.7,TM=0.85,TE=1.95;
  const path=(te,out)=>{const k=cl((te-TL)/(TI-TL)),e=k*k*(3-2*k)*0.3+k*0.7;
    return out.set(MO.x+(TC.x-MO.x)*e,MO.y+(TC.y-MO.y)*e+0.45*Math.sin(Math.PI*e)+0.1*Math.sin(e*18),0.2*Math.sin(e*9));};
  // corazón volador: relleno + borde + brillo, late durante el vuelo
  const HEART_MESH_FS=SD_HEART+`void main(){vec2 p=(vUv-vec2(.5,.14))*1.5;float d=sdHeart(p);
   float fill=smoothstep(.03,-.03,d);float rim=band(d,-.02,.04);float halo=smoothstep(.35,0.,d)*.35;
   float n=noise(vec3(p*5.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,fill*.5+rim+n*.3)*1.5+vec3(1.)*(rim*.6+smoothstep(-.2,-.45,d)*.25),(fill*.55+rim+halo)*uA);}`;
  const heart=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(HEART_MESH_FS,{depthTest:false}));
  // onda en forma de corazón al estallar
  const heartRing=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(SD_HEART+`void main(){vec2 p=(vUv-vec2(.5,.14))*1.5;float d=sdHeart(p);
   float m=band(d,0.,.035+.05*(1.-uP));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.6,m*uA);}`,{depthTest:false}));
  // calavera espectral: SDF 2D (cráneo + mandíbula − cuencas − nariz − dientes) con ruido que la deforma
  const SKULL=`float sdSkull(vec2 p){
   float head=length((p-vec2(0.,.17))*vec2(1.,1.08))-.6;
   vec2 jb=abs(p-vec2(0.,-.42))-vec2(.33,.2);float jaw=length(max(jb,0.))+min(max(jb.x,jb.y),0.)-.04;
   float s=min(head,jaw);
   float eyes=length((vec2(abs(p.x)-.24,p.y-.05))*vec2(1.,1.15))-.17;
   float nose=max(abs(p.x)*1.6+(p.y+.12)*.9-.1,-(p.y+.27));
   float gap=step(abs(fract(p.x*7.+.5)-.5),.07)*step(abs(p.y+.47),.13)*step(abs(p.x),.3);
   s=max(s,-eyes);s=max(s,-nose);s+=gap*.06;return s;}`;
  const skull=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(SKULL+`void main(){vec2 p=(vUv-.5)*2.1;
   p+=vec2(noise(vec3(p*3.,uT*2.)),noise(vec3(p*3.+5.,uT*2.)))*.08-.04;
   float d=sdSkull(p);
   float fill=smoothstep(.02,-.02,d)*.28;float rim=band(d,0.,.035);
   vec2 e=vec2(abs(p.x)-.24,p.y-.05);float eye=smoothstep(.17,0.,length(e*vec2(1.,1.15)))*(.6+.4*sin(uT*9.));
   float halo=smoothstep(.3,0.,d)*.25;float flick=.8+.2*noise(vec3(uT*12.,0.,0.));
   vec3 spectral=mix(vec3(.75,.65,1.),uC1,.45);
   gl_FragColor=vec4(spectral*1.4*(fill+rim)+uC1*eye*2.,(fill+rim+eye*.9+halo)*flick*uA);}`,{depthTest:false}));
  L.mesh.add(heart,heartRing,skull);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TM=${f(TM)};const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};
  vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);float e=k*k*(3.-2.*k)*.3+k*.7;
   return vec3(mix(MO.x,TC.x,e),mix(MO.y,TC.y,e)+.45*sin(3.14159*e)+.1*sin(e*18.),.2*sin(e*9.));}`;
  // corazoncitos y destellos que suelta en el vuelo
  a.count+=points(L.part,50,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=path(s)+r*.12+vec3(-.25*t,.35*t,r.z*.2*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.11+.09*aSeed.z)*(1.-age*.4));}`,HEART_FS);
  a.count+=points(L.part,110,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=path(s)+r*.06+r*.25*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.w)*(1.-age));}`);
  // ráfaga de corazones al estallar
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.06;float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.3,.3,0.));vec3 p=TC+d*(.3+1.1*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,-.3*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.12+.09*aSeed.w)*(1.-age*.5));}`,HEART_FS);
  a.count+=sparks(L.part,130,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.4,.3,0.",2.5,6,2.5);
  // jirones espectrales que suben desde la marca
  a.count+=points(L.part,60,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TM)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=TC+vec3(-.1+(r.x-.5)*.4,(r.y-.5)*.4+age*.9,(r.z-.5)*.4)+vec3(sin(age*6.+r.z*9.)*.1,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*.6*uE:0.;put(p,.08+.06*r.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA*.6;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.75,.65,1.),uC1,.4),a);}`);
  // runas oscuras en el suelo bajo el marcado
  const mark=groundPlane(2.1,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.02)+band(r,.7,.012)+band(r,.8,.05)*step(.6,fract(an/6.2832*13.-uT*.3));
   gl_FragColor=vec4(mix(vec3(.75,.65,1.),uC1,.5)*1.2,m*uA*(.7+.3*sin(uT*5.)));}`));
  L.decal.add(mark);
  a.pose=function(te,o){
    const ia=te-TI, im=te-TM, env=ss(TM-0.1,TM+0.15,te)*(1-ss(TE-0.3,TE+0.25,te));
    caster.rotation.z=-0.12*ss(0,TL,te)+0.12*ss(TL,TL+0.3,te);
    // forma en la boca, sale volando y late
    const form=ss(0,TL,te), beat=1+0.12*Math.pow(0.5+0.5*Math.sin(te*20),4);
    heart.visible=te<TI; if(te<TL)heart.position.copy(MO).add(tmp.set(0.15,0.05,0)); else path(te,heart.position);
    towardCam(heart.position,heart.position,0.2); billboard(heart,0.25*Math.sin(te*7));
    heart.scale.setScalar(Math.max(0.5*form*beat,0.001)); heart.material.uniforms.uA.value=form;
    let p=cl(ia/0.35); towardCam(heartRing.position,TC,0.5); billboard(heartRing); heartRing.visible=ia>=0&&p<1;
    heartRing.scale.setScalar(0.4+1.8*(1-Math.pow(1-p,3))); set(heartRing,p,1-p);
    towardCam(skull.position,tmp.copy(TC).add(tmp2.set(0,0.08*Math.sin(te*2.5),0)),0.5); billboard(skull);
    skull.visible=env>0.001; skull.scale.setScalar(0.72+0.2*Math.pow(1-cl(im/0.25),2)*(im>=0?1:0)); skull.material.uniforms.uA.value=env;
    mark.material.uniforms.uA.value=env; U.uE.value=env;
    const hit=hitFlat(o,ia,7); target.position.x=3.4+hit*0.1; target.rotation.z=-hit*0.14*Math.cos(ia*15);
    if(te<TI){if(te<TL)o.g.copy(MO);else path(te,o.g);o.gs=0.75;o.ga=0.35*form;o.li=1.8*form;}
    else{o.g.copy(TC);o.gs=1.1+2.2*ia;o.ga=Math.exp(-ia*10)*0.5+0.08*env;o.li=5*Math.exp(-ia*6)+1*env;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.6;
    o.em=env*0.22; o.emc.setRGB(0.7,0.55,1);
  };
}};

// =====================================================================
// 2 · GODA — mordisco espiritual: los colmillos se aferran, sacuden al rival y rematan con un segundo
//     mordisco que los hace estallar en esquirlas y deja una marca de mordida brillante
//     nivel 2: firme y estándar — mandíbulas medianas, remate sin temblor de cámara
// =====================================================================
const goda={key:"goda",name:"Goda",dur:2.0,ti:0.82,pal:"Estelar",
  phases:[["Mordisco",0],["Cierre",0.3],["Agarre",0.42],["Desgarro",0.82],["Marca",1.02]],
build(a){
  const L=a.L,T0=0.12,T1=0.42,TG=0.62,TI=0.82,TE=1.85;
  const upper=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.7),fxU(FANG_FS(10),{uQ:{value:1}},{depthTest:false}));
  const lower=new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.62),fxU(FANG_FS(8),{uQ:{value:-1}},{depthTest:false}));
  // eco espectral: una segunda mandíbula más grande y tenue que se superpone en el remate
  const echoU=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.05),fxU(FANG_FS(10),{uQ:{value:1}},{depthTest:false}));
  const echoL=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.95),fxU(FANG_FS(8),{uQ:{value:-1}},{depthTest:false}));
  // marca de mordida: dos arcos de perforaciones que laten y se apagan
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fx(`void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<7;i++){float t=(float(i)/6.-.5)*1.5;
    vec2 a=vec2(t*.75,.34-.18*t*t);vec2 b=vec2(t*.65,-.36+.16*t*t);
    float big=1.+.6*step(.4,abs(t));
    m=max(m,smoothstep(.075*big,0.,length((p-a)*vec2(1.,.7))));m=max(m,smoothstep(.065*big,0.,length((p-b)*vec2(1.,.7))));}
   float bruise=smoothstep(.9,.2,length(p*vec2(.9,1.3)))*.12;
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.7+vec3(1.)*m*uP*.5,(m+bruise)*uA);}`,{depthTest:false}));
  L.mesh.add(upper,lower,echoU,echoL,mark);
  const C=`const float T1=${f(T1)};const float TI=${f(TI)};const vec3 TH=${v3(TH)};`;
  // esquirlas de los colmillos al estallar
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.2,.5));vec3 p=TH+d*(2.2+2.8*aSeed.z)*t*(1.-.5*min(t,1.))+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.045*aSeed.w);}`,CHIP_FS);
  // energía que gotea de los colmillos durante el agarre
  a.count+=points(L.part,80,C+`void main(){float s=T1+aSeed.x*(TI-T1);float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=TH+vec3(r.x*.5,-.05+r.y*.2,.35)+vec3(r.x*.3*t,-1.2*t*t+.3*t,r.z*.25*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.z)*(1.-age*.5));}`);
  a.count+=sparks(L.part,90,T1,`${f(TH.x)},${f(TH.y-0.15)},0.`,"-.2,.2,0.",1.5,4.5,2.5);
  a.count+=sparks(L.part,180,TI,`${f(TH.x)},${f(TH.y-0.1)},0.`,"-.1,.4,.3",3,8,3);
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),fx(RING_FS,{depthTest:false})); L.mesh.add(ring);
  a.pose=function(te,o){
    const i1=te-T1, ia=te-TI;
    caster.rotation.z=-0.2*ss(0,T1,te)+0.1*ss(T1,TG,te)-0.25*ss(TG,TI,te)+0.35*ss(TI,TI+0.3,te);
    // primer cierre, agarre con forcejeo, leve reapertura y segundo cierre más fuerte
    let gap;
    if(te<T1){const k=cl((te-T0)/(T1-T0));gap=0.62*(1-k*k*k);}
    else if(te<TG)gap=0.03*Math.abs(Math.sin(te*40));
    else if(te<TI){const k=cl((te-TG)/(TI-TG));gap=0.33*Math.sin(Math.PI*Math.min(k*1.6,1))*(k<0.62?1:0)+(k>=0.62?0.33*(1-Math.pow((k-0.62)/0.38,3)):0);}
    else gap=0;
    const on=ss(0,T0,te)*(1-ss(TI,TI+0.06,te));
    const shake=te>=T1&&te<TI?0.035*Math.sin(te*55):0;
    towardCam(tmp,TH,0.45); tmp.x+=shake;
    upper.position.copy(tmp).add(tmp2.set(0,0.23+gap,0)); lower.position.copy(tmp).add(tmp2.set(0,-0.23-gap*0.8,0));
    billboard(upper,0.06*Math.sin(te*30)*(gap/0.62)); billboard(lower);
    upper.visible=lower.visible=on>0.001; set(upper,0,on*(1+0.25*(te>=T1&&te<TI?1:0))); set(lower,0,on);
    // eco: aparece en la reapertura y cae junto al remate
    const ek=cl((te-TG)/(TI-TG)), eon=ss(TG,TG+0.1,te)*(1-ss(TI,TI+0.2,te)), egap=0.75*(1-ek*ek*ek);
    towardCam(tmp,TH,0.5);
    echoU.position.copy(tmp).add(tmp2.set(0,0.35+egap,0)); echoL.position.copy(tmp).add(tmp2.set(0,-0.35-egap*0.8,0));
    billboard(echoU); billboard(echoL); echoU.visible=echoL.visible=eon>0.001; set(echoU,0,eon*0.42); set(echoL,0,eon*0.42);
    // marca y anillo del remate
    const menv=ss(TI,TI+0.1,te)*(1-ss(TE-0.35,TE,te)), beat=Math.pow(0.5+0.5*Math.sin((te-TI)*9),3);
    towardCam(mark.position,TH,0.42); billboard(mark); mark.visible=menv>0.001; set(mark,beat,menv*(0.75+0.25*beat));
    let p=cl(ia/0.35); towardCam(ring.position,TH,0.5); billboard(ring); ring.visible=ia>=0&&p<1; set(ring,p,1-p);
    // el rival forcejea agarrado y sale despedido con el remate
    const h1=i1>=0?Math.exp(-i1*8):0, h2=ia>=0?Math.exp(-ia*5):0;
    target.position.x=3.4+h1*0.07+(te>=T1&&te<TI?0.03*Math.sin(te*55):0)+h2*0.22;
    target.rotation.z=-h1*0.1*Math.cos(i1*18)+(te>=T1&&te<TI?0.04*Math.sin(te*31):0)-h2*0.22*Math.cos(ia*14);
    o.em=menv*0.22*beat; o.emc.copy(U.uC1.value);
    const last=ia>=0?ia:i1;
    o.g.copy(TH); o.gs=1+2.2*Math.max(last,0); o.ga=te<T1?0.22*on:Math.exp(-Math.max(last,0)*11)*(ia>=0?0.6:0.4)+0.08*menv;
    o.li=te<T1?1.5*on:(ia>=0?7:3.5)*Math.exp(-Math.max(last,0)*6)+1*menv;
    o.ia=last; o.c.copy(TH); o.shake=0; o.dist=ia>=0?0.7:0.3; o.flash=ia>=0?0.85:0.5;
  };
}};

// =====================================================================
// 3 · NUT CRACKER — una nuez rúnica cae y una mandíbula espectral la tritura
//     nivel 2: crujido firme y fragmentos moderados; sin grieta en el suelo ni aplastamiento fuerte
// =====================================================================
const nut={key:"nut",name:"Nut Cracker",dur:2.1,ti:0.78,pal:"Dorado",
  phases:[["Invocación",0],["Caída",0.38],["Mordida",0.64],["Crujido",0.78],["Fragmentos",0.95]],
build(a){
  const L=a.L,TS=0.08,TF=0.38,TLd=0.6,TI=0.78,NP=V3(3.4,2.2,0);
  // nuez: cáscara opaca con surcos y runas doradas que se encienden
  const NUT_FS=`void main(){vec3 q=normalize(vP);
   float ridge=pow(abs(sin(atan(q.z,q.x)*7.+noise(vP*6.)*1.5)),.5);
   float n=noise(vP*9.)*.5+noise(vP*22.)*.5;
   vec3 shell=mix(vec3(.25,.14,.06),vec3(.55,.36,.16),ridge*.6+n*.4);
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float rune=band(q.y,.0,.04)+band(q.y,.35,.025)+band(q.y,-.35,.025);
   rune*=step(.5,fract(atan(q.z,q.x)*1.9+q.y*.5));
   gl_FragColor=vec4(shell*lit*(1.-ridge*.25)+uC1*rune*(1.2+1.5*uA),1.);}`;
  const nutM=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(NUT_FS,SOLID)); L.mesh.add(nutM);
  // fragmentos de cáscara: casquetes que salen despedidos
  const shards=[];
  for(let i=0;i<6;i++){const g=new THREE.SphereGeometry(0.3,10,8,Math.random()*6,0.9+Math.random()*0.6,Math.random()*2,0.7+Math.random()*0.5);
    const m=new THREE.Mesh(g,fx(NUT_FS,Object.assign({},SOLID,{side:THREE.DoubleSide})));
    const d=V3(Math.random()*2-1,0.4+Math.random(),Math.random()*2-1).normalize();
    m.userData={d,sp:1.8+Math.random()*2,spin:V3(Math.random()*10-5,Math.random()*10-5,Math.random()*10-5)}; shards.push(m); L.mesh.add(m);}
  // mandíbula espectral grande: muelas anchas
  const upper=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.2),fxU(FANG_FS(6),{uQ:{value:1}},{depthTest:false}));
  const lower=new THREE.Mesh(new THREE.PlaneGeometry(2.35,1.1),fxU(FANG_FS(6),{uQ:{value:-1}},{depthTest:false}));
  L.trail.add(upper,lower);
  // círculo rúnico donde aparece la nuez
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5).rotateX(-Math.PI/2),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.03)+band(r,.65,.02)+band(r,.78,.05)*step(.6,fract(an/6.2832*10.+uT*.5));
   gl_FragColor=vec4(mix(uC2,uC1,r)*1.4,m*uA);}`)); L.mesh.add(halo);
  const C=`const float TI=${f(TI)};const vec3 NP=${v3(NP)};`;
  a.count+=points(L.part,100,C+`void main(){float s=TI+aSeed.x*.08;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.5+2.8*aSeed.z);vec3 p=NP+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.05*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.15;float life=.75+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd());vec3 p=NP+d*(.3+.9*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,-.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.25+.3*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,180,TI,`${f(NP.x)},${f(NP.y)},0.`,"0.,.3,0.",3,8,3.5);
  a.count+=points(L.part,60,C+`void main(){float life=.14+aSeed.y*.08;float age=(uT-.08-aSeed.x*.25)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=NP+vec3(0.,1.1,0.)+d*mix(.95,.05,age*age);
   vA=(age>0.&&age<1.&&uT<.4)?smoothstep(0.,.3,age):0.;put(p,.035+.04*aSeed.z);}`);
  // onda suave en el suelo (sin grieta)
  const shock=groundPlane(4,3.4,0.03,fx(RING_FS));
  L.decal.add(shock);
  const jc=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, fall=cl((te-TF)/(TLd-TF));
    caster.rotation.z=0.08*ss(0,TF,te)-0.2*ss(TLd,TI,te)+0.12*ss(TI+0.08,TI+0.4,te);
    // la nuez aparece flotando, cae y rebota sobre la cabeza
    const hov=V3(3.4,3.3+0.05*Math.sin(te*6),0);
    const ny=te<TF?hov.y:(te<TLd?hov.y+(NP.y-hov.y)*fall*fall:NP.y+0.08*Math.abs(Math.sin((te-TLd)*14))*Math.exp(-(te-TLd)*8));
    nutM.position.set(3.4,ny,0); nutM.rotation.set(0.3,te*(te<TLd?2:0.5),0.2);
    const app=ss(TS,TS+0.25,te); nutM.visible=te<TI&&app>0.01;
    nutM.scale.set(0.3*app,0.37*app*(te>TI-0.07?1-0.3*cl((te-TI+0.07)/0.07):1),0.3*app);
    nutM.material.uniforms.uA.value=app;
    halo.position.set(3.4,2.9,0); halo.material.uniforms.uA.value=0.8*app*(1-ss(TF,TF+0.2,te));
    for(const s of shards){const u=s.userData,t=Math.max(ia,0);s.visible=ia>=0&&ia<1.0;
      s.position.copy(NP).addScaledVector(u.d,u.sp*t); s.position.y-=9*t*t; s.position.y=Math.max(s.position.y,0.05);
      s.rotation.set(u.spin.x*t,u.spin.y*t,u.spin.z*t); s.scale.setScalar(1-ss(0.65,1.0,ia));}
    // mandíbula: entra abierta, muerde con aceleración y tiembla
    const k=cl((te-TLd)/(TI-TLd)), close=k*k*k*k, on=ss(TLd-0.12,TLd,te)*(1-ss(TI+0.12,TI+0.45,te));
    const sh=ia>=0?0.035*Math.exp(-ia*12)*Math.sin(ia*70):0;
    towardCam(jc,NP,0.7); const gap=1.0*(1-close);
    upper.position.copy(jc).add(tmp.set(sh,0.4+gap,0)); lower.position.copy(jc).add(tmp.set(-sh,-0.4-gap*0.8,0));
    billboard(upper); billboard(lower); upper.visible=lower.visible=on>0.001; set(upper,0,on*0.85); set(lower,0,on*0.85);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    // crujido firme: el objetivo se encoge un poco
    const hit=hitFlat(o,ia,8); target.scale.set(1+0.07*hit,1-0.12*hit,1+0.07*hit); target.rotation.z=-hit*0.08*Math.cos(ia*20);
    if(te<TI){o.g.set(3.4,ny,0);o.gs=1.1*app;o.ga=0.22*app;o.li=2*app;}
    else{o.g.copy(NP);o.gs=1.3+3.5*ia;o.ga=Math.exp(-ia*12)*0.6;o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(NP);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 4 · PUFF — inhala inflándose y exhala vapor ardiente con humo gris
//     nivel 2: chorro más estrecho y corto, humo contenido, quemadura suave
// =====================================================================
const puff={key:"puff",name:"Puff",dur:2.2,ti:0.8,pal:"Fuego",
  phases:[["Inhalar",0],["Inflado",0.32],["Exhalar",0.5],["Impacto",0.8],["Humo",1.04]],
build(a){
  const L=a.L,TIN=0.32,TX=0.5,TI=0.8,TXE=1.08,len=TC.x-MO.x;
  // cono de vapor: abierto, eje +x desde la boca; el shader hace fluir fuego→vapor→humo a lo largo
  const cone=new THREE.Mesh(new THREE.CylinderGeometry(0.65,0.1,1,40,24,true).rotateZ(-Math.PI/2).translate(0.5,0,0),fx(`void main(){
   float u=vP.x;
   float n=noise(vec3(u*6.-uT*9.,vP.y*3.,vP.z*3.))*.6+noise(vec3(u*13.-uT*14.,vP.y*7.,vP.z*7.))*.4;
   float front=smoothstep(uP,uP-.12,u);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float hot=smoothstep(.7,0.,u);
   vec3 c=mix(mix(vec3(1.,.95,.9),uC1,hot),uC2,hot*hot*.6);
   float al=smoothstep(.35,.75,n)*(.25+.75*fr)*front*smoothstep(0.,.05,u)*uA*(.5+.5*hot);
   gl_FragColor=vec4(c*1.4,al);}`));
  cone.position.copy(MO); cone.scale.set(len,1,1); L.trail.add(cone);
  // anillo de aire que entra hacia la boca durante la inhalación
  const suck=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float a=band(r,1.-uP,.08)*smoothstep(0.,.3,uP);gl_FragColor=vec4(vec3(.9,.95,1.)*1.2,a*uA*.6);}`,{depthTest:false}));
  L.mesh.add(suck);
  const C=`const float TIN=${f(TIN)};const float TX=${f(TX)};const float TI=${f(TI)};const float TXE=${f(TXE)};const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};`;
  // aire aspirado
  a.count+=points(L.part,100,C+`void main(){float life=.22+aSeed.y*.12;float age=(uT-aSeed.x*(TIN-.08))/life;
   vec3 d=normalize(rnd()+vec3(1.2,0.,0.));vec3 p=MO+d*mix(1.5,.05,age*age);
   vA=(age>0.&&age<1.&&uT<TIN+.1)?smoothstep(0.,.4,age)*.7:0.;put(p,.025+.03*aSeed.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.85,.92,1.),a);}`);
  // vapor caliente (aditivo) y humo gris (normal) a lo largo del chorro
  a.count+=points(L.part,130,C+`void main(){float s=TX+aSeed.x*(TXE-TX);float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();float sp=5.+3.*aSeed.z;float dx=min(sp*t,${f(len)});
   vec3 p=MO+vec3(dx,r.y*.2*dx*.4+t*.4,r.z*.24*dx*.4);
   vA=(age>0.&&age<1.)?(1.-age)*.7:0.;put(p,(.1+.15*aSeed.w)*(.5+age*1.4));}`);
  a.count+=points(L.part,90,C+`void main(){float s=TX+.12+aSeed.x*(TXE-TX+.24);float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();float dx=min((4.+3.*aSeed.z)*t,${f(len+0.4)});
   vec3 p=MO+vec3(dx,(r.y*.24)*dx*.3+t*.55,(r.z*.28)*dx*.4);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.85:0.;put(p,(.3+.38*aSeed.w)*(.6+age*1.2));}`,SMOKE_FS("vec3(.42,.42,.45)"),NB);
  // humo residual alrededor del objetivo
  a.count+=points(L.part,60,C+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(3.4,0.,0.)+vec3((r.x-.5)*1.1,.3+age*(1.3+.7*r.y),(r.z-.5)*1.1);
   vA=(k>=1.)?sin(age*3.14159)*.6*uE:0.;put(p,(.32+.3*r.z)*(.7+age));}`,SMOKE_FS("vec3(.38,.37,.4)"),NB);
  a.count+=sparks(L.part,90,TI,"3.1,1.25,0.","-.3,.5,0.",1.5,5,2);
  const scorch=groundPlane(2,3.4,0.015,fx(SOFT_BURN_FS)); L.decal.add(scorch);
  a.pose=function(te,o){
    const ia=te-TI, inf=ss(0,TIN,te)*(1-ss(TX,TX+0.12,te)), blow=te>=TX&&te<TXE+0.32;
    caster.scale.set(1+0.2*inf,1+0.13*inf,1+0.2*inf); caster.rotation.z=0.11*inf-0.09*ss(TX,TX+0.1,te)*(1-ss(TXE,TXE+0.32,te));
    caster.position.x=-3.7-0.16*(te>=TX?Math.exp(-(te-TX)*4)*ss(TX,TX+0.05,te):0);
    towardCam(suck.position,MO,0.3); billboard(suck); suck.visible=te<TIN+0.1; set(suck,cl(te/TIN),1-ss(TIN,TIN+0.1,te));
    cone.visible=blow; set(cone,cl((te-TX)/(TI-TX))*1.05,0.8*ss(TX,TX+0.06,te)*(1-ss(TXE,TXE+0.32,te)));
    cone.position.copy(MO); cone.position.x=caster.position.x+0.27;
    scorch.material.uniforms.uA.value=ia>=0?ss(0,0.2,ia)*(1-cl(ia/1.3)):0;
    const env=ss(TI,TI+0.25,te)*(1-ss(1.75,2.2,te)); U.uE.value=env;
    const push=te>=TI&&te<TXE+0.2?1:0, hit=hitFlat(o,ia,4);
    target.position.x=3.4+0.16*ss(TI,TXE,te)*(1-ss(TXE,TXE+0.5,te)); target.rotation.z=-0.13*push*(1+0.3*Math.sin(te*40));
    o.em=0.4*ss(TI,TI+0.1,te)*(1-ss(TXE,TXE+0.6,te)); o.emc.copy(U.uC2.value);
    if(te<TX){o.g.copy(MO);o.gs=0.65*inf;o.ga=0.2*inf;o.li=1.1*inf;}
    else if(te<TI){o.g.set(MO.x+len*cl((te-TX)/(TI-TX)),1.4,0);o.gs=1.6;o.ga=0.25;o.li=4;}
    else{o.g.copy(TC);o.gs=1.6+1.5*Math.min(ia,0.5);o.ga=0.22*push+Math.exp(-ia*10)*0.35;o.li=4*push+3.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.8;
  };
}};

// =====================================================================
// 5 · FOXY — mordisco veloz con estela de fuego en espiral y fuegos fatuos de zorro
//     nivel 2: hélice más fina, fuegos fatuos más pequeños y cortos
// =====================================================================
const foxy={key:"foxy",name:"Foxy",dur:1.8,ti:0.42,pal:"Ámbar",
  phases:[["Acecho",0],["Salto",0.15],["Mordisco",0.42],["Fuegos de zorro",0.6]],
build(a){
  const L=a.L,TJ=0.15,TI=0.42,X0=-3.7,XB=2.05,Y=1.5;
  const cx=te=>te<TJ?X0-0.2*ss(0,TJ,te):(te<TI?X0-0.2+(XB-X0+0.2)*Math.pow(cl((te-TJ)/(TI-TJ-0.04)),1.4):XB-(XB-X0)*ss(0.8,1.3,te));
  // dos cintas en hélice a lo largo de la línea del salto, reveladas hasta la posición del lanzador
  const mkHelix=(ph)=>{const N=260,pos=[],uv=[],idx=[],x0=X0+0.2,x1=XB+0.3;
    for(let i=0;i<=N;i++){const t=i/N,x=x0+(x1-x0)*t,an=t*Math.PI*8+ph,r=0.34+0.06*Math.sin(t*20);
      const c=Math.cos(an),s=Math.sin(an);
      pos.push(x-0.05,Y+c*r,s*r,x+0.05,Y+c*r*1.18,s*r*1.18); uv.push(t,0,t,1);
      if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;};
  const helixMat=fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float n=noise(vec3(u*30.-uT*10.,vUv.y*3.,0.));
   float al=exp(-d*4.5)*(.5+.5*n)*smoothstep(1.,.3,abs(vUv.y-.5)*2.)*uA*.85;
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*5.)+n*.3)*1.6+vec3(1.)*exp(-d*25.)*.5,al);}`);
  L.trail.add(new THREE.Mesh(mkHelix(0),helixMat),new THREE.Mesh(mkHelix(Math.PI),helixMat));
  const upper=new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.55),fxU(FANG_FS(8),{uQ:{value:1}},{depthTest:false}));
  const lower=new THREE.Mesh(new THREE.PlaneGeometry(0.98,0.49),fxU(FANG_FS(6),{uQ:{value:-1}},{depthTest:false}));
  // silueta de zorro hecha de luz: cabeza triangular + orejas, un destello al morder
  const foxHead=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float head=max(abs(p.x)*1.25+p.y*.9-.55,-(p.y+.6));
   vec2 e=vec2(abs(p.x)-.4,p.y-.42);float ear=max(abs(e.x)*2.2+e.y-.35,-(e.y+.05));
   float s=min(head,ear);
   float rim=band(s,0.,.035);float eye=smoothstep(.07,0.,length(vec2(abs(p.x)-.22,p.y-.05)*vec2(1.,2.)));
   float n=noise(vec3(p*4.,uT*4.));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.7+vec3(1.)*eye,(rim*(.6+.6*n)+eye+smoothstep(.2,-.2,s)*.08)*uA);}`,{depthTest:false}));
  L.mesh.add(upper,lower,foxHead);
  const C=`const float TI=${f(TI)};const vec3 BP=vec3(${f(XB+0.5)},${f(Y)},0.);`;
  a.count+=points(L.part,140,`const float TJ=${f(TJ)};const float TI=${f(TI)};void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TJ)/(TI-TJ-.04),0.,1.);float x=${f(X0-0.2)}+${f(XB-X0+0.2)}*pow(k,1.4);
   vec3 r=rnd();vec3 p=vec3(x,${f(Y)},0.)+r*.28+vec3(-.45*t,.4*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.z*40.)):0.;put(p,(.025+.035*aSeed.w)*(1.-age*.5));}`);
  a.count+=sparks(L.part,150,TI,`${f(TH.x)},${f(TH.y-0.1)},0.`,"-.2,.4,.2",2.5,7,2.8);
  // fuegos fatuos: llamitas que orbitan al lanzador tras el mordisco y se apagan
  a.count+=points(L.part,9,C+`void main(){float an=aSeed.x*6.2832+uT*2.6;float t=max(uT-TI,0.);
   float rad=.6+.12*sin(uT*3.+aSeed.y*6.);vec3 o=vec3(${f(XB)}-${f(XB-X0)}*smoothstep(.8,1.3,uT),0.,0.);
   vec3 p=o+vec3(cos(an)*rad,1.2+.28*sin(uT*2.+aSeed.z*6.)+aSeed.w*.4,sin(an)*rad);
   vA=(uT>TI)?smoothstep(0.,.2,t)*(1.-smoothstep(.9,1.25,t)):0.;put(p,.24+.08*aSeed.y);}`,FLAME_FS);
  a.count+=points(L.part,80,C+`void main(){float an=aSeed.x*6.2832+uT*2.6;float t=max(uT-TI,0.);float life=.35;float k=(uT-TI)/life+aSeed.y;float c=floor(k);float age=fract(k);
   float rad=.6;vec3 o=vec3(${f(XB)}-${f(XB-X0)}*smoothstep(.8,1.3,uT),0.,0.);
   vec3 p=o+vec3(cos(an-age*.6)*rad,1.3+aSeed.w*.4+age*.25,sin(an-age*.6)*rad);
   vA=(k>=1.)?(1.-age)*.7*(1.-smoothstep(.9,1.25,t)):0.;put(p,.025+.025*aSeed.z);}`);
  const scorch=groundPlane(1.6,3.4,0.015,fx(SOFT_BURN_FS)); L.decal.add(scorch);
  a.pose=function(te,o){
    const ia=te-TI, x=cx(te);
    caster.position.x=x; caster.position.y=te>=TJ&&te<TI?0.35*Math.sin(Math.PI*cl((te-TJ)/(TI-TJ))):0;
    caster.rotation.z=0.15*ss(0,TJ,te)-0.4*ss(TJ,TJ+0.06,te)+0.25*ss(TI,TI+0.3,te);
    helixMat.uniforms.uP.value=cl((x-X0-0.2)/(XB+0.3-X0-0.2))+(te>TI?(te-TI)*0.4:0);
    helixMat.uniforms.uA.value=te>=TJ?1-cl((te-TI)/0.5)*(te>TI?1:0):0;
    const k=cl((te-TJ)/(TI-TJ)), close=k*k*k, on=ss(TJ,TJ+0.08,te)*(1-ss(TI+0.05,TI+0.3,te)), gap=0.38*(1-close);
    towardCam(tmp,TH,0.45);
    upper.position.copy(tmp).add(tmp2.set(0,0.17+gap,0)); lower.position.copy(tmp).add(tmp2.set(0,-0.17-gap*0.8,0));
    billboard(upper); billboard(lower); upper.visible=lower.visible=on>0.001; set(upper,0,on); set(lower,0,on);
    towardCam(foxHead.position,TH,0.55); billboard(foxHead); foxHead.visible=ia>=0&&ia<0.5;
    foxHead.scale.setScalar(0.75+0.45*cl(ia/0.5)); foxHead.material.uniforms.uA.value=ia>=0?0.8*Math.pow(1-cl(ia/0.5),1.5):0;
    scorch.material.uniforms.uA.value=ia>=0?ss(0,0.15,ia)*(1-cl(ia/1.1)):0;
    const hit=hitFlat(o,ia,7); target.position.x=3.4+hit*0.14; target.rotation.z=-hit*0.2*Math.cos(ia*16);
    if(te<TI){o.g.set(x+0.4,Y,0);o.gs=te>=TJ?1.05:0.5;o.ga=te>=TJ?0.38:0.15;o.li=te>=TJ?3:0.8;}
    else{o.g.copy(TH);o.gs=1.05+2.2*ia;o.ga=Math.exp(-ia*11)*0.55;o.li=5.5*Math.exp(-ia*6)+1*(1-ss(TI+0.7,TI+1.0,te));}
    o.ia=ia;o.c.copy(TH);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 6 · PLATYPUS — cúpula ámbar con radio de 2 casillas y runas flotantes que protegen a los aliados
//     nivel 2: cúpula algo más baja y tenue, menos runas, protección más breve
// =====================================================================
const platy={key:"platy",name:"Platypus",dur:2.4,ti:0.7,pal:"Ámbar",allies:2,
  phases:[["Pulso",0],["Expansión",0.28],["Sellado",0.7],["Protección",0.95],["Disipación",1.85]],
build(a){
  const L=a.L,TX=0.28,TI=0.7,TD=1.85,TE=2.3,CX=-3.7,R=2.7,TILE=1.4;
  // casillas: rejilla alrededor del lanzador; se encienden las que están a ≤2 casillas (distancia de Chebyshev)
  const tiles=groundPlane(TILE*5+0.4,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*${f(TILE*5+0.4)};vec2 c=floor(p/${f(TILE)}+.5);
   float ring=max(abs(c.x),abs(c.y));if(ring>2.)discard;
   vec2 q=abs(p-c*${f(TILE)})/${f(TILE*0.5)};float e=max(q.x,q.y);
   float on=step(ring,uP*2.6);float lit=smoothstep(.15,0.,abs(ring-uP*2.6+.3))*step(uP,.99);
   float border=smoothstep(.9,.97,e);float fill=.06+.04*noise(vec3(c*3.,uT));
   gl_FragColor=vec4(mix(uC2,uC1,border+lit)*1.2,(border*.6+fill+lit*.45)*on*uA);}`));
  L.decal.add(tiles);
  // cúpula de resina ámbar: cáusticas lentas, borde brillante, ondas al sellar
  const dome=new THREE.Mesh(new THREE.SphereGeometry(R,64,32,0,Math.PI*2,0,Math.PI/2),fxU(`uniform float uH;
  void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 q=normalize(vP);
   float c1=noise(q*6.+vec3(uT*.4,uT*.2,0.)),c2=noise(q*6.-vec3(0.,uT*.3,uT*.4));
   float caus=pow(1.-abs(c1-c2),12.);
   float h=q.y;float seal=band(fract(h*2.5-uH*1.5),.5,.1)*exp(-uH*1.5)*step(0.,uH);
   float top=smoothstep(uP,uP-.1,1.-h);
   gl_FragColor=vec4(mix(uC2,uC1,fr+caus*.5)*1.2+vec3(1.)*seal*.3,(fr*.45+caus*.2+.04+seal*.4)*top*uA);}`,{uH:{value:-1}}));
  dome.position.set(CX,0,0); L.mesh.add(dome);
  // runas flotantes: glifos procedurales (segmentos según semilla) que orbitan dentro de la cúpula
  const RUNE_FS=`void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<5;i++){float fi=float(i);vec2 a=vec2(hash(vec3(uP,fi,1.)),hash(vec3(fi,uP,2.)))*1.2-.6;
    vec2 b=vec2(hash(vec3(uP,fi,3.)),hash(vec3(fi,uP,4.)))*1.2-.6;
    vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);m=max(m,smoothstep(.07,.02,length(pa-ba*h)));}
   m=max(m,band(length(p),.8,.04));float halo=smoothstep(1.,0.,length(p))*.15;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.6,(m+halo)*uA);}`;
  const runes=[];
  for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34),fx(RUNE_FS));m.material.uniforms.uP.value=i*1.37+0.5;
    m.userData={an:i/8*Math.PI*2,rad:1.35+((i*7)%5)*0.21,y:0.5+((i*5)%4)*0.38,sp:0.25+((i*3)%4)*0.08};runes.push(m);L.mesh.add(m);}
  const C=`const float TI=${f(TI)};const vec3 DC=vec3(${f(CX)},0.,0.);`;
  a.count+=points(L.part,130,C+`void main(){float life=1.1+aSeed.y*.6;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=sqrt(r.y)*${f(R*0.9)};vec3 p=DC+vec3(cos(an)*rad,.05+age*1.9,sin(an)*rad);
   float inside=step(length(p-DC),${f(R)});vA=(k>=1.)?sin(age*3.14159)*.7*uE*inside:0.;put(p,.035+.04*r.z);}`);
  // destellos de sellado alrededor del borde
  a.count+=points(L.part,110,C+`void main(){float an=aSeed.x*6.2832;float s=TI+aSeed.y*.12;float life=.5+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=DC+vec3(cos(an)*${f(R)},.05+t*(.9+.7*aSeed.w),sin(an)*${f(R)});
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,.04+.04*aSeed.w);}`);
  const shock=groundPlane(R*2.2,CX,0.03,fx(RING_FS)); L.decal.add(shock);
  a.pose=function(te,o){
    const ia=te-TI, grow=1-Math.pow(1-cl((te-TX)/(TI-TX)),3), env=ss(TX,TX+0.1,te)*(1-ss(TD,TE,te));
    caster.rotation.z=0.12*ss(0,TX,te)-0.2*ss(TX,TX+0.1,te)+0.08*ss(TX+0.2,TI+0.3,te);
    set(tiles,te<TX?0:cl((te-TX)/(TI-TX)),0.8*ss(0,0.18,te)*(1-ss(TD,TE,te)));
    dome.visible=te>=TX&&te<TE; dome.scale.setScalar(Math.max(grow,0.001)*(1+0.03*(ia>=0?Math.exp(-ia*5):0)));
    set(dome,te<TD?1.1:1.1-1.15*cl((te-TD)/(TE-TD)),env); dome.material.uniforms.uH.value=ia>=0?ia:-1;
    const ron=ss(TI,TI+0.3,te)*(1-ss(TD,TE-0.1,te));
    for(const r of runes){const u=r.userData,an=u.an+te*u.sp;r.visible=ron>0.01;
      r.position.set(CX+Math.cos(an)*u.rad*grow,u.y+0.15*Math.sin(te*1.7+u.an*3),Math.sin(an)*u.rad*grow); billboard(r);
      r.material.uniforms.uA.value=ron*(0.6+0.2*Math.sin(te*3+u.an*5));}
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?0.75*(1-p):0);
    U.uE.value=env;
    const prot=env*0.28+(ia>=0?0.45*Math.exp(-ia*5):0);
    allies.forEach(d=>{d.userData.m.emissive.copy(U.uC1.value);d.userData.m.emissiveIntensity=prot;});
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=prot;
    o.g.set(CX,1.4,0);o.gs=1.6+3*grow;o.ga=te<TI?0.18*ss(0,TX,te):0.06*env+(ia>=0?0.4*Math.exp(-ia*7):0);o.li=2*env+(ia>=0?5*Math.exp(-ia*4):0)+1.4*ss(0,TX,te)*(te<TI?1:0);
    o.ia=ia;o.c.set(CX,1.2,0);o.shake=0;o.dist=0.7;o.flash=0;
  };
}};

// =====================================================================
// 7 · CONFIDENT — pulso dorado que desciende sobre el aliado y disipa el humo oscuro de los debuffs
//     nivel 1: rápido y preciso — haz fino, purificación temprana, sin marca de suelo
// =====================================================================
const conf={key:"conf",name:"Confident",dur:1.3,ti:0.4,pal:"Dorado",allies:1,
  phases:[["Debuffs",0],["Descenso",0.15],["Purificación",0.4],["Confianza",0.6],["Fin",1.1]],
build(a){
  const L=a.L,TDs=0.15,TI=0.4,TE=1.1,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.1,0));
  // columna estrecha de luz desde el cielo
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,8,32,1,true),fx(`void main(){float h=vP.y/8.+.5;
   float n=noise(vec3(vP.x*3.,h*6.+uT*4.,vP.z*3.));float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.4,fr*(.4+.6*n)*smoothstep(uP-.05,uP+.05,h)*uA);}`));
  beam.position.copy(AP).add(V3(0,4,0));
  // anillo que baja barriendo el cuerpo del aliado
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6).rotateX(-Math.PI/2),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(r,.62,.05)+band(r,.62,.22)*.3+band(r,.85,.015);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.5,m*uA);}`));
  // emblema solar de confianza sobre la cabeza
  const crest=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rays=pow(abs(cos(an*6.+uT)),12.)*smoothstep(1.,.45,r)*step(.42,r);
   float disk=band(r,.32,.04)+smoothstep(.2,0.,r);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.7,(rays+disk)*uA);}`,{depthTest:false}));
  L.mesh.add(beam,ring,crest);
  const C=`const float TDs=${f(TDs)};const float TI=${f(TI)};const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};`;
  // humo de debuff: remolino oscuro (normal) que envuelve al aliado y sale expulsado en la purificación
  a.count+=points(L.part,70,C+`void main(){float an=aSeed.x*6.2832+uT*(1.6+aSeed.y);float rad=.38+aSeed.z*.3;
   float y=.2+aSeed.w*1.6+sin(uT*2.+aSeed.x*9.)*.08;float t=max(uT-TI,0.);
   vec3 out_=normalize(vec3(cos(an),.25,sin(an)));
   vec3 p=AP+vec3(cos(an)*rad,y,sin(an)*rad)+out_*(1.8*t*(1.+aSeed.y));
   vA=(1.-smoothstep(0.,.32+aSeed.y*.2,t))*.8;put(p,(.26+.18*aSeed.y)*(1.+t*1.5));}`,SMOKE_FS("vec3(.12,.06,.16)"),NB);
  // chispas moradas de debuff antes de purificar
  a.count+=points(L.part,30,C+`void main(){float life=.3+aSeed.y*.2;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*.8,.2+r.y*1.6+age*.3,(r.z-.5)*.8);
   vA=(k>=1.&&uT<TI)?sin(age*3.14159)*.8:0.;put(p,.035+.03*r.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(.55,.25,.75,a);}`);
  // destellos de confianza
  a.count+=points(L.part,35,C+`void main(){float life=.35+aSeed.y*.25;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.2,.2+r.y*1.8,(r.z-.5)*1.2);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.12+.14*r.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=points(L.part,5,C+`void main(){float life=.6;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*.8,.4+age*1.3,(r.y-.5)*.8);vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.2);}`,CHEVRON_FS);
  a.count+=sparks(L.part,90,TI,`${f(AP.x)},.2,${f(AP.z)}`,"0.,.8,0.",2,5,2);
  // onda mínima bajo el aliado
  const shock=groundPlane(2.6,AP.x,0.03,fx(RING_FS)); shock.position.z=AP.z;
  L.decal.add(shock);
  a.pose=function(te,o){
    const ia=te-TI, d=cl((te-TDs)/(TI-TDs)), env=ss(TI,TI+0.15,te)*(1-ss(TE-0.2,TE+0.2,te));
    caster.rotation.z=0.07*ss(0,TDs,te)-0.14*ss(TDs,TDs+0.08,te)+0.07*ss(TDs+0.12,TI+0.2,te);
    beam.visible=te>=TDs-0.08&&ia<0.3; set(beam,1-d,0.8*ss(TDs-0.08,TDs+0.06,te)*(1-cl(ia/0.3)));
    ring.position.copy(AP).add(tmp.set(0,3.2*(1-d*d)+0.05,0)); ring.visible=te>=TDs&&ia<0.15;
    ring.scale.setScalar(1+0.4*(1-d)); ring.material.uniforms.uA.value=ia>0?1-cl(ia/0.15):ss(TDs,TDs+0.06,te);
    let p=cl(ia/0.35); set(shock,1-Math.pow(1-p,2),ia>=0?0.6*(1-p):0);
    towardCam(crest.position,tmp.copy(AP).add(tmp2.set(0,2.35+0.04*Math.sin(te*3),0)),0.2); billboard(crest);
    crest.visible=env>0.01; crest.scale.setScalar(0.55+0.3*Math.pow(1-cl(ia/0.25),2)); crest.material.uniforms.uA.value=env*0.85;
    U.uE.value=env;
    // antes: el aliado apagado y morado; después: dorado
    const al=allies[0].userData.m;
    if(ia<0){al.emissive.setRGB(0.4,0.15,0.55);al.emissiveIntensity=0.25+0.1*Math.sin(te*8);}
    else{al.emissive.copy(U.uC1.value);al.emissiveIntensity=0.3*env+0.7*Math.exp(-ia*7);}
    if(te<TDs){o.g.set(-3.6,1.4,0);o.gs=0.6;o.ga=0.18*ss(0,TDs,te);o.li=1;}
    else if(te<TI){o.g.copy(AP).add(tmp.set(0,3.2*(1-d*d)+0.3,0));o.gs=1.2;o.ga=0.28;o.li=3;}
    else{o.g.copy(AC);o.gs=1.2+1.8*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.5+0.06*env;o.li=5*Math.exp(-ia*6)+1*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.5;o.flash=0;
  };
}};

VFX.module("Bestia · Boca",[kiss,goda,nut,puff,foxy,platy,conf]);
})();

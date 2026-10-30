// =====================================================================
// ESTILIZADO · ACUÁTICO · OJOS (Hito 101) — las 5 cartas de ojos de Acuático hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_qjClear, sty_qjGero, sty_qjSleepless, sty_qjTelescope, sty_qjBaby). Mismos dur / ti /
// tiempos de fase que las originales. Semántica según PartCards.js:
//   Clear (sobre sí: +2 PA) · Gero (daño + Frágil; carta de Shinji) · Sleepless (daño + −1 PA el próximo turno)
//   Telescope (sobre sí: +2 de alcance) · Baby (sobre sí: Fortalecido)
// Motivo común: destello de mirada (dos brillos almendrados de agua, sin globo ocular) delante de la cara.
// Identidad de Acuático: agua turquesa saturada (nunca blanca), cáusticas, gotas, espuma; materia con contorno oscuro.
// Las cartas sobre sí mismo se dibujan alrededor del lanzador, así se leen igual en cualquier casilla.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CLEAR=pal("Sty Acuático · Claridad",["#7fe6f2","#0f7fa6"]);
const P_GERO=pal("Sty Acuático · Gero",["#5fd6ee","#0b5f86"]);
const P_SLEEP=pal("Sty Acuático · Desvelo",["#8fd0f2","#3b3f9e"]);
const P_TELE=pal("Sty Acuático · Sonar",["#7ff0d2","#0c7a78"]);
const P_BABY=pal("Sty Acuático · Alevín",["#ffb08a","#0f7f9a"]);

// color sRGB → vec3 lineal (los colores fijos de los shaders van en espacio lineal)
const L3=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const TEAL_D=L3("#0b4f6e"), TEAL=L3("#1592b8"), AQUA=L3("#5fd2e8"), FOAM=L3("#d8f6fb"), DEEP=L3("#08304a"),
  OUTL=L3("#06233a"), GOLD=L3("#ffc23a"), GOLD_D=L3("#9a5a06"), GREYGOLD=L3("#8c7a52"), VIOLET=L3("#4a3fae"),
  MINT=L3("#46d6b4"), CORAL=L3("#ff7a4a"), CREAM=L3("#ffe2c4"), RED=L3("#e8402a");

const CX=-3.7, TX=3.4;
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color(), RIGHT=V3(1,0,0), QI=new THREE.Quaternion();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;if(!m)return;m.emissive.copy(c);m.emissiveIntensity=k;};
function localW(l,out,d=caster){const r=d.rotation.z,c=Math.cos(r),s=Math.sin(r),x=l.x*d.scale.x,y=l.y*d.scale.y;
  return out.set(d.position.x+x*c-y*s,d.position.y+x*s+y*c,d.position.z+l.z*d.scale.z);}
const FACE=V3(0.26,1.6,0), BUBP=V3(0,1.0,0);

// ---------- shaders compartidos ----------
// agua sólida: rampa turquesa con cáusticas que corren, luz en 3 bandas, borde de espuma y contorno oscuro
const WATER=(dark,lite,{er=.06,ol=.5,rim=.5,flow=1.}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*vec2(1.6,.9)+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec2 cu=vUv*vec2(3.,2.)+vec2(uT*.35*${f(flow)},-uT*.5*${f(flow)});float ca=pow(1.-abs(styNoise(cu).r*2.-1.),6.);
 vec3 base=mix(${dark},${lite},.3+.45*l+.25*ca);
 vec3 c=styRampOf(base,clamp(.3+.5*l+.2*ca,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c=mix(c,${FOAM}*.9,${f(rim)}*smoothstep(.55,.75,fr)*step(.5,l));
 c*=mix(1.,${f(1-ol)},smoothstep(.78,.95,fr));c+=${lite}*uK;gl_FragColor=vec4(c,1.);}`;
// sólido de un tono (orbes de PA)
const ORB=(col,dark)=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vUv*vec2(2.,1.)+.6).r;float cr=smoothstep(.06,0.,abs(styNoise(vUv*vec2(1.3,.8)+.33).g-.5))*uK;
 if(styErode(nz,uQ,.05)<.5)discard;vec3 c=styRampOf(${col},clamp(.25+.6*l,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c*=mix(1.,.45,smoothstep(.75,.95,fr));c=mix(c,${dark},cr*.9);gl_FragColor=vec4(c,1.);}`;
// destello de mirada: dos brillos almendrados de agua con estela horizontal; uQ estrecha la almendra, uK aviva el núcleo
const GLINT=(col,extra='')=>`uniform float uQ;uniform float uK;
void main(){vec2 p=(vUv-.5)*2.;
 float w=.34*(1.-p.x*p.x)*(1.-uQ*.85);float alm=smoothstep(w+.05,w-.02,abs(p.y))*step(abs(p.x),1.);
 float core=smoothstep(w*.6,0.,abs(p.y))*smoothstep(.85,0.,abs(p.x+.1));
 float streak=exp(-abs(p.y)*28.)*smoothstep(1.,.15,abs(p.x))*(.55+.45*uK);
 float m=alm*.6+core*1.+streak*.9;${extra}
 if(m<.02)discard;vec3 c=styRampOf(${col},.4+.5*core)*(1.+.6*core*uK);
 gl_FragColor=vec4(c,min(m,1.)*uA);}`;
function mkEyes(L,fs,size=0.3){
  const ms=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size*1.9,size*0.95),S.mat(fs,{uQ:{value:0},uK:{value:0}},{mode:'energy',side:THREE.DoubleSide,depthTest:false}));
    m.renderOrder=3;L.mesh.add(m);return m;});
  return {ms,pose(a,lid,k,sc=1,tilt=0){
    localW(FACE,tmp3);towardCam(tmp3,tmp3,0.45);RIGHT.set(1,0,0).applyQuaternion(VFX.camera.quaternion);
    ms.forEach((m,i)=>{const sd=i?1:-1;m.position.copy(tmp3).addScaledVector(RIGHT,sd*0.17*sc);billboard(m,sd*tilt);
      m.scale.set(sd*Math.max(sc,0.001),Math.max(sc,0.001),1);m.visible=a>0.002;m.material.uniforms.uA.value=a;
      m.material.uniforms.uQ.value=lid;m.material.uniforms.uK.value=k;});
  }};
}
// charco en el suelo (materia): turquesa oscuro con borde claro y una onda; uP = erosión
const PUDDLE=(dark,lite,alpha=.75)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.4).r*.6+styNoise(vUv*.5+.2).g*.4;float m=smoothstep(.8,.68,r+(n-.5)*.4);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.12);float rim=smoothstep(.55,.75,r+(n-.5)*.4);
 vec3 c=mix(styRampOf(${dark},.3+.2*n),styRampOf(${lite},.75),rim*.7+smoothstep(.08,0.,abs(r-.32-.1*n))*.5);gl_FragColor=vec4(c,m*er*uA*${f(alpha)});}`;
// cáusticas en el suelo (energía suave turquesa, no blanca); uP = erosión, uR = radio relativo de la onda
const CAUSTIC=(col)=>`uniform float uR;void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 vec2 cu=vUv*3.2+vec2(uT*.25,-uT*.18);float ca=pow(1.-abs(styNoise(cu).r*2.-1.),7.)+pow(1.-abs(styNoise(cu*1.7+.5).g*2.-1.),9.)*.6;
 float disk=smoothstep(1.,.75,r)*smoothstep(uR+.08,uR-.12,r);float er=styErode(styNoise(vUv*.6).b,uP,.15);
 float m=ca*disk*er;if(m<.02)discard;gl_FragColor=vec4(styRampOf(${col},.45+.4*ca)*1.1,m*uA*.7);}`;
// chevrón (partícula): hacia arriba (up=1) o hacia abajo (up=0), materia con contorno
const CHEV=(col,dark,up)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=${up?'q.y':'-q.y'};float d=abs(y+.12-abs(q.x)*.9);
 float m=smoothstep(.11,.07,d)*step(abs(q.x),.38);if(m*vA<.02)discard;float edge=smoothstep(.05,.1,d);
 gl_FragColor=vec4(mix(styRampOf(${col},.7),${dark},edge),m*vA);}`;
const defs=[];

// =====================================================================
// 1 · CLEAR — la mirada se vuelve cristalina; un remolino de gotas sube del suelo con cáusticas, se condensa en dos
//     orbes de agua turquesa que entran en el pecho (+2 PA). Nivel 1, ti 0,32 s
// =====================================================================
defs.push({key:"sty_qjClear",name:"Clear (estilizado)",dur:1.2,ti:0.32,pal:P_CLEAR,tier:1,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Cristal",0],["Destello",0.32],["Energía",0.42],["Calma",0.6],["Fin",0.95]],
build(a){
  const L=a.L,TI=0.32,TE=1.2;
  const eyes=mkEyes(L,GLINT(L3("#46c8e6"),`vec2 q=(p-vec2(-.3,.28))*vec2(.6,1.);m+=max(exp(-abs(q.x)*26.)*smoothstep(.4,0.,abs(q.y)),exp(-abs(q.y)*26.)*smoothstep(.4,0.,abs(q.x)))*uK;`),0.3);
  const caus=groundPlane(3.4,CX,0.024,S.mat(CAUSTIC(TEAL),{uR:{value:0}},{mode:'energy'})); L.decal.add(caus);
  const ring=S.groundRing(L.decal,2.6), ring2=S.groundRing(L.decal,3.4), flash=S.hitSpark(L.mesh,0.9,{seed:0.31,toCam:0.8});
  const orbMat=S.mat(WATER(DEEP,TEAL,{rim:.35,ol:.6}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const orbs=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.14,20,14),orbMat);L.mesh.add(m);return m;});
  const K=`const float TI=${f(TI)};`;
  // remolino de gotas que sube alrededor del lanzador hasta los ojos
  S.pts(L.part,34,VV+K+`void main(){float s=aSeed.x*.12;float u=clamp((uT-s)/(TI-s+.02),0.,1.);
   float an=aSeed.z*6.2832+u*5.;float rad=.75*(1.-u)+.12;vec3 p=vec3(-3.7+cos(an)*rad,.1+u*1.5+aSeed.y*.2,sin(an)*rad*.8);
   vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.85,1.,u);vR=an+1.57;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:.05}));
  // gotas que salpican al condensarse
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.2,.6,0.))*(1.2+aSeed.z);vec3 p=vec3(-3.4,1.6,0.)+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.05)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.y-10.*t,length(v.xz))*-1.+1.57;put(p,.17);}`,S.MATTER_FS(C.drop,{relief:4,col:AQUA,bias:.05}));
  // chispitas turquesa en la estela de los orbes
  S.pts(L.part,24,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s0=TI+.04+i*.07;float s=s0+aSeed.y*.45;float u=clamp((s-s0)/.5,0.,1.);
   float life=.2;float age=(uT-s)/life;vec3 a0=vec3(-3.35,1.65,(i-.5)*.3),a1=vec3(-3.65,1.0,0.);float an=u*4.+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.6,1.1*sin(u*3.14159),sin(an)*.5)*sin(u*3.14159)+rnd()*.04;
   vA=(age>0.&&age<1.&&u<.97)?(1.-age):0.;vK=0.;vR=0.;put(p,.2);}`,S.ENERGY_FS(C.spark,{gain:1.0}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.05,te)*(1-ss(0.45,0.7,te)),0.15,0.5+0.5*Math.sin(te*24),1.1+0.12*hitE(ia,8),-0.1);
    flash.pose(ia,tmp.set(CX+0.4,1.65,0),0.7);
    ring.pose(te,CX,0,0.4,0.9); ring2.pose(ia-0.45,CX,0,0.45,1);
    caus.visible=te<TE; caus.material.uniforms.uR.value=0.2+0.85*e3(te/0.5); set(caus,-0.1+1.15*ss(0.7,1.05,te),ss(0,0.1,te));
    orbs.forEach((m,i)=>{const s0=TI+0.04+i*0.07,u=cl((te-s0)/0.5);m.visible=te>=s0&&u<0.97;
      tmp.set(-3.35,1.65,(i-0.5)*0.3).lerp(tmp2.set(-3.65,1.0,0),u*u*(3-2*u));const an=u*4+i*Math.PI,sn=Math.sin(u*Math.PI);
      m.position.set(tmp.x+Math.cos(an)*0.6*sn,tmp.y+1.1*sn,tmp.z+Math.sin(an)*0.5*sn);m.scale.setScalar(Math.max(2.3*(1-0.4*u*u),0.001));});
    orbMat.uniforms.uK.value=0.12;
    const pa=ss(TI+0.5,TI+0.58,te)*(1-ss(TI+0.62,TI+0.88,te)); glowOf(caster,COL.setRGB(0.3,0.85,0.95),0.7*pa);
    caster.scale.y=1-0.06*hitE(te-TI-0.55,10);
    o.g.set(CX+0.3,1.4,0);o.gs=0.8;o.ga=0.06*(1-ss(0.6,1,te));o.li=1.1+1.4*pa;
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 2 · GERO (Shinji) — las gotas se arremolinan sobre la cabeza y condensan una esfera de agua turquesa con cáusticas;
//     sale en parábola alta goteando y revienta sobre el rival: corona de agua, espuma, gotas, Frágil y charco.
//     Nivel 2, ti 0,95 s
// =====================================================================
defs.push({key:"sty_qjGero",name:"Gero (estilizado)",dur:2.1,ti:0.95,pal:P_GERO,tier:2,stylized:true,zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Condensar",0],["Lanzamiento",0.4],["Parábola",0.48],["Estallido",0.95],["Charco",1.15],["Fin",1.75]],
build(a){
  const L=a.L,TL=0.42,TI=0.95,TE=2.1,D0=V3(CX+0.3,2.15,0),HP=V3(TX-0.15,1.3,0),HA=1.9;
  const eyes=mkEyes(L,GLINT(L3("#3cc4ec")),0.3);
  const wMat=S.mat(WATER(DEEP,TEAL,{rim:.3,ol:.6}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.2,28,18),wMat); L.mesh.add(ball);
  const shadow=S.contactShadow(L.decal,1.5), spark=S.hitSpark(L.mesh,0.8,{seed:0.62}), ring=S.groundRing(L.decal,2.6), ring2=S.groundRing(L.decal,3.2);
  const puddle=groundPlane(2.9,TX,0.025,S.mat(PUDDLE(DEEP,TEAL,.9),{},{mode:'matter'})); L.decal.add(puddle);
  ring2.mesh.scale.setScalar(1);
  const fragile=S.status(a,'fragile',[target],TI+0.08,TE);
  const bpos=(te,o)=>{if(te<TL)return o.copy(D0).add(tmp2.set(0,0.05*Math.sin(te*14),0));const k=cl((te-TL)/(TI-TL));
    return o.set(D0.x+(HP.x-D0.x)*k,D0.y+(HP.y-D0.y)*k+4*HA*k*(1-k),D0.z+(HP.z-D0.z)*k);};
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 D0=${v3(D0)};const vec3 HP=${v3(HP)};const float HA=${f(HA)};
  vec3 bp(float t){if(t<TL)return D0;float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(D0,HP,k)+vec3(0.,4.*HA*k*(1.-k),0.);}`;
  // gotas que suben en espiral y se condensan en la esfera
  S.pts(L.part,36,VV+K+`void main(){float s=aSeed.x*.25;float u=clamp((uT-s)/(TL-s),0.,1.);
   float an=aSeed.z*6.2832+u*4.5;float rad=1.0*(1.-u)+.05;vec3 c0=vec3(-3.7+cos(an)*rad,.15+aSeed.y*.4,sin(an)*rad*.8);
   vec3 p=mix(c0,D0,u*u);vA=(uT>s&&u<.98)?1.:0.;vK=0.;vR=an;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:.05}));
  // estela de gotas que caen de la esfera en vuelo
  S.pts(L.part,40,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bp(s)+rnd()*.12+vec3(-.4*t,-4.5*t*t,0.);vA=(age>0.&&age<1.&&p.y>.05)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.2+.08*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:.05}));
  // corona de agua al reventar
  S.pts(L.part,56,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+aSeed.w),2.6+1.8*aSeed.y,sin(an)*(1.2+aSeed.w))*.95;vec3 p=HP+vec3(0.,-.15,0.)+v*t*1.25+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.y-18.*t,length(v.xz))*-1.+1.5708;put(p,.46+.18*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:-.04}));
  // corona alta: columnas de agua en anillo que suben ~1,8 y caen (el protagonista del impacto)
  S.pts(L.part,84,VV+K+`void main(){float i=floor(aSeed.x*14.);float an=i/14.*6.2832+aSeed.z*.25;float s=TI+.01*aSeed.y;float t=max(uT-s,0.);
   float h=(1.4+.9*aSeed.w)*sin(clamp(t/.55,0.,1.)*3.14159);float k=aSeed.y;float rad=.55+.5*clamp(t/.4,0.,1.)+.15*k;
   vec3 p=vec3(HP.x+cos(an)*rad,.05+h*k,sin(an)*rad*.85);float life=.6;float age=t/life;
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.7,1.,age);vR=-(an)*.0+(cos(an)*.25);put(p,(.42+.2*(1.-k))*(1.-.3*age));}`,S.MATTER_FS(C.drop,{relief:5,col:TEAL,bias:-.06}));
  // gotitas que salen disparadas hacia fuera desde la cresta
  S.pts(L.part,40,VV+K+`void main(){float s=TI+.12+aSeed.x*.2;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*2.2,1.2+aSeed.y,sin(an)*1.8);vec3 p=vec3(HP.x+cos(an)*.9,1.6+.5*aSeed.w,sin(an)*.8)+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=atan(v.y-18.*t,length(v.xz))*-1.+1.5708;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:.02}));
  // espuma
  S.pts(L.part,8,VV+K+`void main(){float s=TI+.02+aSeed.x*.1;float life=.55+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=HP+rnd()*vec3(.45,.5,.45)+vec3(0.,.25*age-.1,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.6+.25*aSeed.w)*(.6+.8*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:L3("#7fd2e6"),bias:.0}));
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.06,te)*(1-ss(0.5,0.75,te)),0.25*ss(0,TL,te),0.5+0.5*Math.sin(te*20),1+0.1*hitE(te-TL,10),0.1);
    // esfera: crece hasta TL, tiembla, vuela; se estira en el vuelo y desaparece al impacto
    ball.visible=te<TI+0.08; if(te<TI)bpos(te,ball.position);else ball.position.copy(HP).add(tmp.set(-0.05,0.25-0.2*cl((te-TI)/0.08),0));
    const grow=back(cl(te/TL)), r=2.6*grow*(1+0.06*Math.sin(te*26)*(te<TL?1:0.3));
    let sx=r,sy=r;if(te>=TL){const k=cl((te-TL)/(TI-TL));sy=r*(1+0.18*Math.abs(1-2*k));sx=r*(1-0.08*Math.abs(1-2*k));sy*=1-0.25*ss(TI-0.06,TI,te);sx*=1+0.2*ss(TI-0.06,TI,te);}
    if(te>=TI){const k=cl((te-TI)/0.08);sx=r*(1.3+0.5*k);sy=r*(0.6-0.4*k);}
    ball.scale.set(Math.max(sx,0.001),Math.max(sy,0.001),Math.max(sx,0.001)); ball.rotation.set(te*1.5,te*2.2,0);
    wMat.uniforms.uK.value=0.08+0.1*Math.sin(te*12); wMat.uniforms.uQ.value=te<TI?-1:-0.1+1.1*cl((te-TI)/0.08);
    shadow.pose(ball.position.x,0,0.6+0.5*cl(1-ball.position.y/4),te<TI?0.45:0);
    spark.pose(ia,HP,0.8); ring.pose(ia,TX,0,0.42,1); ring2.pose(ia-0.12,TX,0,0.5,1.1);
    puddle.visible=ia>=0; puddle.scale.setScalar(0.4+0.6*e3(ia/0.25)); set(puddle,-0.1+1.15*ss(0.65,1.1,ia),1);
    caster.rotation.z=-0.06*ss(0,TL,te)*(1-ss(TL,TL+0.15,te))+0.08*hitE(te-TL,10);
    const h=hitE(ia,8);
    target.position.x=TX+0.22*h*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.18*h*Math.cos(ia*14); target.scale.set(1+0.07*h,1-0.09*h,1+0.07*h);
    const fe=fragile.pose(te); S.statusGlow(o,[{kind:'fragile',env:fe}]);
    o.em=Math.max(o.em||0,0.35*h); if(h>0.05)o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(ball.position);o.gs=0.7;o.ga=0.06;o.li=1.2;o.ia=te-TL;o.c.copy(ball.position);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(HP);o.gs=1+1.4*ia;o.ga=Math.exp(-ia*8)*0.3;o.li=3*Math.exp(-ia*5);o.ia=ia;o.c.copy(HP);o.shake=0.5;o.dist=0.7;o.flash=0.15;}
  };
}});

// =====================================================================
// 3 · SLEEPLESS — una marea violácea sube alrededor del lanzador, la mirada (ojeras de desvelo) se abre de golpe y
//     lanza una ola en media luna por el suelo; revienta sobre el rival y le apaga un orbe de PA que se agrieta y se
//     vuelve gris, con chevrones hacia abajo (−1 PA el próximo turno). Nivel 2, ti 0,9 s
// =====================================================================
defs.push({key:"sty_qjSleepless",name:"Sleepless (estilizado)",dur:2.3,ti:0.9,pal:P_SLEEP,tier:2,stylized:true,zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Marea",0],["Pupilas",0.3],["Onda",0.6],["Impacto",0.9],["Cansancio",1.15],["Fin",1.95]],
build(a){
  const L=a.L,TP=0.3,TW=0.6,TI=0.9,TE=2.3,HP=V3(TX-0.2,1.15,0),OP=V3(TX,2.2,0);
  const eyes=mkEyes(L,GLINT(L3("#6aa8ff"),`m+=smoothstep(.12,0.,abs(p.y+.55+.15*p.x*p.x))*smoothstep(.9,.2,abs(p.x))*.6*(1.-uK);`),0.3);
  const spark=S.hitSpark(L.mesh,1.0,{seed:0.48}), ring=S.groundRing(L.decal,2.4);
  const puddle=groundPlane(1.9,TX,0.025,S.mat(PUDDLE(L3("#1d2f7a"),L3("#5aa0e8"),.6),{},{mode:'matter'})); L.decal.add(puddle);
  const orbMat=S.mat(ORB(GOLD,L3("#3a2a10")),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.14,20,14),orbMat); L.mesh.add(orb);
  const K=`const float TP=${f(TP)};const float TW=${f(TW)};const float TI=${f(TI)};const vec3 HP=${v3(HP)};const vec3 OP=${v3(OP)};`;
  // marea: gotas que suben en anillo alrededor del lanzador
  S.pts(L.part,30,VV+K+`void main(){float s=aSeed.x*.35;float life=.45+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.5;float rad=.62;vec3 p=vec3(-3.7+cos(an)*rad,.05+age*1.4,sin(an)*rad*.85);
   vA=(age>0.&&age<1.&&uT<TW+.05)?sin(age*3.14159):0.;vK=smoothstep(.6,1.,age);vR=an;put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:L3("#3f6fd6"),bias:.05}));
  // ola en media luna por el suelo, de lanzador a objetivo (cada partícula se deforma con el pasillo)
  S.pts(L.part,120,VV+K+`void main(){float u=clamp((uT-TW)/(TI-TW),0.,1.);float lat=(aSeed.x-.5)*2.;
   float x=mix(-3.2,HP.x,u)-.6*lat*lat-aSeed.z*.35;vec3 p=vec3(x,.1+1.*(1.-lat*lat)*aSeed.y*(1.-.5*aSeed.z)+.12*sin(uT*30.+aSeed.z*6.),lat*1.05);
   vA=(uT>TW&&u<1.)?1.:0.;vK=smoothstep(.6,1.,aSeed.y)*.6;vR=1.2+lat*.3;put(p,.46+.16*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:L3("#3a55c8"),bias:.1}));
  S.pts(L.part,40,VV+K+`void main(){float s=TW+aSeed.x*(TI-TW);float life=.3+aSeed.y*.2;float age=(uT-s)/life;float u=(s-TW)/(TI-TW);
   float lat=(aSeed.z-.5)*1.6;vec3 p=vec3(mix(-3.2,HP.x,u)-.45*lat*lat-.3,.08+age*.35,lat);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.15*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:L3("#5a7fd8"),bias:.0}));
  // salpicadura
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.9+aSeed.w)+.6,2.2+1.5*aSeed.y,sin(an)*(.9+aSeed.w))*.9;vec3 p=HP+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.y-18.*t,length(v.xz))*-1.+1.5708;put(p,.32+.12*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:L3("#3f6fd6"),bias:.08}));
  // chevrones grises hacia abajo alrededor del orbe apagado
  S.pts(L.part,8,VV+K+`void main(){float s=TI+.3+aSeed.x*.6;float life=.6;float age=(uT-s)/life;float an=aSeed.z*6.2832+uT*.8;
   vec3 p=OP+vec3(cos(an)*.55,-.2-age*1.,sin(an)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3);}`,CHEV(GREYGOLD,OUTL,0));
  a.pose=function(te,o){
    const ia=te-TI, op=ss(TP-0.04,TP+0.04,te);
    eyes.pose(ss(0,0.06,te)*(1-ss(TI,TI+0.25,te)),0.75*(1-op)+0.05,0.3+0.7*op,(0.9+0.3*back(cl((te-TP)/0.18))*op),0.12);
    spark.pose(ia,HP,0.85); ring.pose(ia,TX,0,0.42,1);
    puddle.visible=ia>=0; puddle.scale.setScalar(0.4+0.6*e3(ia/0.25)); set(puddle,-0.1+1.15*ss(0.7,1.2,ia),1);
    // orbe de PA: aparece dorado sobre el rival, se agrieta y se apaga a gris, cae un poco y se deshace
    const oa=te-(TI+0.12);orb.visible=oa>=0&&te<TE-0.1;
    orb.position.copy(OP).add(tmp.set(0,-0.25*e3((oa-0.5)/0.5)+0.05*Math.sin(te*6),0)); orb.scale.setScalar(Math.max(2.9*back(cl(oa/0.18)),0.001));
    orbMat.uniforms.uK.value=ss(0.25,0.4,oa); orbMat.uniforms.uQ.value=-0.1+1.15*ss(0.95,1.25,oa);
    orb.rotation.y=te*1.2;
    caster.position.y=0.04*Math.sin(te*8)*(1-ss(TW,TW+0.2,te)); caster.rotation.z=0.08*hitE(te-TW,9);
    const h=hitE(ia,8);
    target.position.x=TX+0.2*h*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.16*h*Math.cos(ia*14); target.scale.set(1+0.05*h,1-0.07*h-0.04*ss(0.4,0.8,ia)*(1-ss(1.1,1.4,ia)),1+0.05*h);
    o.em=0.35*h; o.emc.copy(U.uC2.value);
    if(ia<0){o.g.set(CX+0.4,1.4,0);o.gs=0.7;o.ga=0.06;o.li=1;o.ia=te-TW;o.c.set(CX+0.5,0.5,0);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(HP);o.gs=1+1.3*ia;o.ga=Math.exp(-ia*8)*0.3;o.li=2.8*Math.exp(-ia*5);o.ia=ia;o.c.copy(HP);o.shake=0.45;o.dist=0.6;o.flash=0.15;}
  };
}});

// =====================================================================
// 4 · TELESCOPE — la mirada enfoca como una lente; tres pulsos de sonar recorren el suelo desde el lanzador, un anillo
//     de alcance discontinuo se abre de 1 a 3 casillas y se fija (+2 de alcance); chevrones menta suben. Nivel 1, ti 0,38 s
// =====================================================================
defs.push({key:"sty_qjTelescope",name:"Telescope (estilizado)",dur:1.3,ti:0.38,pal:P_TELE,tier:1,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Foco",0],["Sonar",0.18],["Pulso",0.38],["Alcance",0.6],["Fin",1.05]],
build(a){
  const L=a.L,PT=[0.18,0.28,0.38],TI=0.38,TE=1.3,TILE=1.93;
  const eyes=mkEyes(L,GLINT(L3("#3ee0c0"),`m+=smoothstep(.06,0.,abs(length(p*vec2(.9,1.8))-.75))*.5*uK;`),0.3);
  const pulses=PT.map(()=>S.groundRing(L.decal,2.2));
  const R1=TILE*1.05,R3=TILE*3.05,SZ=R3*2.3;
  const range=groundPlane(SZ,CX,0.028,S.mat(`uniform float uR;uniform float uL;void main(){vec2 p=(vUv-.5)*${f(SZ)};float r=length(p);float an=atan(p.y,p.x);
    float band=smoothstep(.1,0.,abs(r-uR));float dash=step(.45,fract(an/6.2832*28.+uT*.4*(1.-uL)));float n=styNoise(vUv*2.+.3).b;
    float m=band*mix(dash,1.,uL*.35);if(m<.02)discard;float er=styErode(n,uP,.12);
    gl_FragColor=vec4(mix(styRampOf(${MINT},.7),${L3("#0a4a46")},smoothstep(.04,.1,abs(r-uR))),m*er*uA*.95);}`,{uR:{value:R1},uL:{value:0}},{mode:'matter'}));
  L.decal.add(range);
  const glow=groundPlane(2.6,CX,0.026,S.mat(CAUSTIC(L3("#1fb89a")),{uR:{value:1}},{mode:'energy'})); L.decal.add(glow);
  const flash=S.hitSpark(L.mesh,0.8,{seed:0.71,toCam:0.8});
  const K=`const float TI=${f(TI)};`;
  // anillos de sonar en el aire (partículas en abanico hacia delante)
  S.pts(L.part,48,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=.18+i*.1;float u=clamp((uT-s)/.45,0.,1.);float an=(aSeed.z-.5)*1.4;
   vec3 p=vec3(-3.35+cos(an)*u*3.2,1.62+sin(an)*u*1.2,sin(an)*u*1.5);vA=(uT>s&&u<1.)?(1.-u):0.;vK=0.;vR=an;put(p,.22*(1.-.4*u));}`,S.ENERGY_FS(C.spark,{gain:.9}),{mode:'energy'});
  // chevrones menta hacia arriba (+alcance)
  S.pts(L.part,10,VV+K+`void main(){float s=TI+.2+aSeed.x*.4;float life=.5;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(-3.7+cos(an)*.6,.2+age*1.6,sin(an)*.5);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3);}`,CHEV(MINT,L3("#0a4a46"),1));
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.05,te)*(1-ss(0.55,0.8,te)),0.55*ss(0,0.15,te)*(1-ss(TI,TI+0.1,te)),ss(0.1,0.18,te),1.05+0.1*hitE(ia,10),0);
    pulses.forEach((p,i)=>p.pose(te-PT[i],CX,0,0.45,0.9+0.9*i));
    flash.pose(ia,tmp.set(CX+0.4,1.65,0),0.6);
    const g=e3((ia)/0.25);range.visible=ia>=0&&te<TE; range.material.uniforms.uR.value=R1+(R3-R1)*g; range.material.uniforms.uL.value=ss(0.22,0.3,ia);
    range.scale.setScalar(1+0.03*hitE(ia-0.25,12)); set(range,-0.1+1.15*ss(0.75,TE-0.02,te),ss(0,0.05,ia));
    glow.visible=te<TE; set(glow,-0.1+1.15*ss(0.6,0.95,te),ss(0.1,0.2,te));
    caster.scale.y=1+0.04*hitE(ia,10);
    o.g.set(CX+0.3,1.5,0);o.gs=0.8;o.ga=0.05*(1-ss(0.6,1,te));o.li=1.1+1.2*hitE(ia,6);
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 5 · BABY — la mirada llama; un alevín de agua (silueta de pez turquesa con manchas coral, sin cara) sale del agua a
//     los pies, sube en espiral sobre el lanzador dejando burbujas y se zambulle en él: burbuja que revienta, corona de
//     agua y Fortalecido (chevrones rojos y aura). Nivel 2, ti 1,45 s
// =====================================================================
defs.push({key:"sty_qjBaby",name:"Baby (estilizado)",dur:3.3,ti:1.45,pal:P_BABY,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Llamada",0],["Espíritu",0.3],["Espiral",0.5],["Zambullida",1.2],["Burbuja",1.45],["Fuerza",1.9],["Fin",2.85]],
build(a){
  const L=a.L,TS=0.3,TD=1.2,TI=1.45,TX2=2.85,TE=3.3,HX=CX,RR=0.85,Y0=0.6,Y1=3.0,TURN=1.5;
  const spos=(te,o)=>{if(te<TD){const k=cl((te-TS)/(TD-TS)),th=-1.2+Math.PI*2*TURN*k,r=RR*(0.5+0.5*Math.min(k*3,1));
      return o.set(HX+Math.cos(th)*r,Y0+(Y1-Y0)*k,Math.sin(th)*r);}
    const k=cl((te-TD)/(TI-TD));tmp2.set(HX+Math.cos(-1.2+Math.PI*2*TURN)*RR,Y1,Math.sin(-1.2+Math.PI*2*TURN)*RR);
    return o.set(tmp2.x+(HX-tmp2.x)*k,Y1+(1.3-Y1)*k*k,tmp2.z*(1-k));};
  const eyes=mkEyes(L,GLINT(L3("#ff9a6a")),0.3);
  // pez: silueta SDF en billboard (cuerpo, cola y aletas), turquesa con manchas coral y contorno oscuro
  const fish=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.5),S.mat(`uniform float uQ;void main(){vec2 p=(vUv-.5)*vec2(2.,1.1);
    float tp=mix(.42,1.,smoothstep(-.55,.3,p.x));float body=length(vec2(p.x-.12,p.y/tp)*vec2(1.,2.1))-.58;vec2 q=p-vec2(-.36,0.);
    float tail=max(abs(q.y)-.05-.6*max(-q.x,0.),max(q.x-.1,-q.x-.4));float fin=length((p-vec2(.08,.26))*vec2(2.6,5.))-.55;float fin2=length((p-vec2(-.05,-.24))*vec2(3.,6.))-.5;
    float d=min(min(body,tail),min(fin*.25,fin2*.22));float m=smoothstep(.03,-.02,d);if(m<.02)discard;
    float n=styNoise(vUv*vec2(1.6,.9)+.3).r;if(styErode(n,uQ,.06)<.5)discard;
    float sp=(smoothstep(.7,.76,styNoise(vUv*vec2(2.4,1.4)+.71).g)*.6+smoothstep(.35,.0,abs(fract(p.x*7.)-.5))*.25*smoothstep(-.05,.2,p.y))*step(body,0.)*.6;
    float l=.35+.5*smoothstep(-.3,.25,p.y)+.15*(1.-smoothstep(0.,.3,abs(p.y-.12)));
    vec3 c=mix(styRampOf(${DEEP},.25+.5*l),styRampOf(${TEAL},.5+.4*l),smoothstep(-.1,.3,p.y));c=mix(c,styRampOf(${CORAL},.35+.4*l),sp);c=mix(c,styRampOf(${AQUA},.8),.35*smoothstep(.25,.6,-q.x)*step(tail,0.));
    float edge=smoothstep(-.09,-.01,d);c=mix(c,${OUTL},edge*.85);gl_FragColor=vec4(c,m*uA);}`,{uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide,depthTest:false}));
  fish.renderOrder=4; L.mesh.add(fish);
  const bubbleMat=S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.)discard;float rim=smoothstep(.72,.9,r)*smoothstep(1.,.93,r);
    float hl=smoothstep(.22,.1,length(p-vec2(-.35,.4)));float er=styErode(styNoise(vUv*.7+.2).r,uP,.1);
    vec3 c=mix(styRampOf(${TEAL},.55+.3*p.y),${FOAM},hl);gl_FragColor=vec4(c,(rim*.95+.14*(1.-r)+hl*.9)*er*uA);}`,{},{mode:'matter',depthTest:false});
  const bubble=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5),bubbleMat); bubble.renderOrder=3; L.mesh.add(bubble);
  const pool=groundPlane(2.4,CX,0.025,S.mat(PUDDLE(TEAL_D,AQUA,.7),{},{mode:'matter'})); L.decal.add(pool);
  const ring=S.groundRing(L.decal,2.6), ring2=S.groundRing(L.decal,3.4), flash=S.hitSpark(L.mesh,1.0,{seed:0.53,toCam:0.8});
  const K=`const float TS=${f(TS)};const float TD=${f(TD)};const float TI=${f(TI)};const float TX2=${f(TX2)};
  const float HX=${f(HX)};const float RR=${f(RR)};const float Y0=${f(Y0)};const float Y1=${f(Y1)};const float TURN=${f(TURN)};
  vec3 sp(float t){if(t<TD){float k=clamp((t-TS)/(TD-TS),0.,1.);float th=-1.2+6.2832*TURN*k;float r=RR*(.5+.5*min(k*3.,1.));return vec3(HX+cos(th)*r,Y0+(Y1-Y0)*k,sin(th)*r);}
   float k=clamp((t-TD)/(TI-TD),0.,1.);float th=-1.2+6.2832*TURN;vec3 a=vec3(HX+cos(th)*RR,Y1,sin(th)*RR);return vec3(a.x+(HX-a.x)*k,Y1+(1.3-Y1)*k*k,a.z*(1.-k));}`;
  // burbujas en la estela del pez
  S.pts(L.part,40,VV+K+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.5+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=sp(s)+rnd()*.12+vec3(0.,.4*age,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.75,1.,age);vR=0.;put(p,(.14+.1*aSeed.w)*(.7+.5*age));}`,
   S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;float rim=smoothstep(.32,.44,d)*smoothstep(.5,.45,d);float hl=step(length(q-vec2(-.13,-.14)),.07);
   float a=(rim*.9+.1+hl)*vA*(1.-vK);if(a<.01)discard;gl_FragColor=vec4(mix(styRampOf(${TEAL},.6),${FOAM},hl),a);}`);
  // estelas de movimiento detrás del pez (energía turquesa, finas)
  S.pts(L.part,36,VV+K+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.22;float age=(uT-s)/life;
   vec3 p=sp(s)+rnd()*.06;vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vec3 d=sp(s+.03)-sp(s);vR=atan(d.y,d.x)+1.5708;put(p,.3*(1.-.5*age));}`,S.ENERGY_FS(C.slash,{gain:.8}),{mode:'energy'});
  // corona de agua al zambullirse
  S.pts(L.part,40,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.4+aSeed.w),2.4+1.4*aSeed.y,sin(an)*(1.4+aSeed.w))*.9;vec3 p=vec3(-3.7,.15,0.)+vec3(cos(an)*.5,0.,sin(an)*.5)+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.y-18.*t,length(v.xz))*-1.+1.5708;put(p,.32+.12*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:.08}));
  // Fortalecido: chevrones rojos que suben y aura de agua coral
  S.pts(L.part,18,VV+K+`void main(){float s=TI+.3+aSeed.x*1.1;float life=.6;float age=(uT-s)/life;float an=aSeed.z*6.2832+uT*.6;
   vec3 p=vec3(-3.7+cos(an)*.62,.25+age*1.7,sin(an)*.5);vA=(age>0.&&age<1.&&uT<TX2)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.56);}`,CHEV(RED,L3("#4a0e06"),1));
  S.pts(L.part,30,VV+K+`void main(){float s=TI+.3+aSeed.x*1.2;float life=.6+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;vec3 p=vec3(-3.7+cos(an)*.7,.1+age*1.5,sin(an)*.6);
   vA=(age>0.&&age<1.&&uT<TX2)?sin(age*3.14159):0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.26+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:3,col:CORAL,bias:.02}));
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.06,te)*(1-ss(0.6,0.9,te)),0.1,0.5+0.5*Math.sin(te*16),1,0.12);
    // pez
    fish.visible=te>=TS&&te<TI+0.02; spos(te,fish.position); spos(te+0.03,tmp);
    const dx=tmp.x-fish.position.x, dy=tmp.y-fish.position.y; QI.copy(VFX.camera.quaternion).invert();tmp3.set(dx,dy,tmp.z-fish.position.z).applyQuaternion(QI);
    billboard(fish,Math.atan2(tmp3.y,tmp3.x)+0.12*Math.sin(te*18)); const bank=Math.sin(te*5.5);
    const fs=Math.max(3.2*back(cl((te-TS)/0.25))*(1-0.5*ss(TI-0.1,TI,te)),0.001); fish.scale.set(fs*(1+0.04*Math.sin(te*20)),fs*(0.62+0.38*Math.abs(Math.cos(bank*0.9))),1);
    fish.material.uniforms.uA.value=1; fish.material.uniforms.uQ.value=-1;
    // burbuja que revienta en el lanzador
    const ba=te-(TI-0.12);bubble.visible=ba>=0&&ba<0.32; localW(BUBP,tmp);towardCam(bubble.position,tmp,0.4);billboard(bubble,0);
    bubble.scale.setScalar(Math.max(4.2*e3(ba/0.12)*(1+0.25*ss(0.12,0.3,ba)),0.001)); set(bubble,-0.1+1.15*ss(0.14,0.3,ba),1);
    pool.visible=te<TE; pool.scale.setScalar(0.5+0.5*e3(te/0.3)+0.3*e3(ia/0.3)*(ia>0?1:0)); set(pool,-0.1+1.15*ss(2.6,3.2,te),ss(0,0.15,te));
    ring.pose(te,CX,0,0.45,0.9); ring2.pose(ia,CX,0,0.5,1.2); flash.pose(ia,tmp.set(CX+0.2,1.3,0),0.8);
    const h=hitE(ia,8);caster.scale.set(1+0.08*h,1-0.1*h,1+0.08*h);
    const em=ss(TI+0.3,TI+0.5,te)*(1-ss(TX2-0.3,TX2,te)); glowOf(caster,COL.setRGB(1,0.4,0.25),0.45*em*(0.8+0.2*Math.sin(te*8)));
    if(ia<0){o.g.copy(fish.position);o.gs=0.6;o.ga=0.05;o.li=1;o.ia=te-TS;o.c.copy(fish.position);o.shake=0;o.dist=0.2;o.flash=0;}
    else{o.g.set(CX,1.2,0);o.gs=1+ia;o.ga=Math.exp(-ia*6)*0.2;o.li=1.2+2*Math.exp(-ia*5);o.ia=ia;o.c.set(CX,1,0);o.shake=0.2;o.dist=0.3;o.flash=0;}
  };
}});

VFX.module("Estilizado · Acuático · Ojos",defs);
})();

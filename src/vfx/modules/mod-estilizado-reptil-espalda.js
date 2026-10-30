// =====================================================================
// ESTILIZADO · REPTIL · ESPALDA (Hito 101) — las 6 cartas de espalda de Reptil hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_reBoneSail, sty_reCroc…). Mismos dur / ti / fases que las originales (nivel 2, 2 PA).
// Identidad de clase: escamas violeta, hueso fósil marfil, caparazón. Los efectos nacen de la espalda del lanzador (≈ (-3.85,1.25)).
// Semántica según PartCards.js:
//   Bone Sail (aliado: escudo 60 + al recibir golpe +1 PA) · Croc (aliado: escudo 60 + Sangrado al atacante)
//   Green Thorns (área circle1: Veneno a los enemigos del área + cura 20 al lanzador; Shinji)
//   Indian Star (aliado: escudo 65 + refleja 25 %) · Red Ear (aliado: escudo 65) · Tri Spikes (3 golpes que perforan el 20 % del escudo)
// Cartas sobre aliado: el receptor es el muñeco objetivo (x = 3,4; allies 0) y receiver:'target' lo marca para el puente
// (si la carta se lanza sobre sí mismo, el puente lleva ese punto a la casilla del lanzador).
// Croc ya no arrastra al aliado (la carta no mueve unidades): las fauces se cierran y se hunden en su sitio.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_SAIL=pal("Sty Reptil · Vela",["#e9b8ff","#6b2d91"]);
const P_CROC=pal("Sty Reptil · Caimán",["#c5e86c","#2e5a24"]);
const P_THORN=pal("Sty Reptil · Espinas",["#b8f060","#7a2db4"]);
const P_STAR=pal("Sty Reptil · Estrella",["#ffd970","#6a3f18"]);
const P_EAR=pal("Sty Reptil · Oreja Roja",["#ff8f45","#a3172a"]);
const P_TRI=pal("Sty Reptil · Púas",["#e3a2ff","#5a2486"]);

const TX=3.4, CX=-3.7, TILE=1.93;
const CB=V3(-3.85,1.25,0);                          // espalda del lanzador
const TC=V3(3.12,1.2,0.05);                          // pecho del rival
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), YA=V3(0,1,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const qbd=(a,b,c,t,o)=>o.set(2*(1-t)*(b.x-a.x)+2*t*(c.x-b.x),2*(1-t)*(b.y-a.y)+2*t*(c.y-b.y),2*(1-t)*(b.z-a.z)+2*t*(c.z-b.z));
const cb=(a,b,c,d,t,o)=>{const u=1-t,A=u*u*u,B=3*u*u*t,Cc=3*u*t*t,D=t*t*t;return o.set(A*a.x+B*b.x+Cc*c.x+D*d.x,A*a.y+B*b.y+Cc*c.y+D*d.y,A*a.z+B*b.z+Cc*c.z+D*d.z);};
const cbd=(a,b,c,d,t,o)=>{const u=1-t,A=3*u*u,B=6*u*t,Cc=3*t*t;return o.set(A*(b.x-a.x)+B*(c.x-b.x)+Cc*(d.x-c.x),A*(b.y-a.y)+B*(c.y-b.y)+Cc*(d.y-c.y),A*(b.z-a.z)+B*(c.z-b.z)+Cc*(d.z-c.z));};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const CBZ=`vec3 cbz(vec3 a,vec3 b,vec3 c,vec3 d,float t){float u=1.-t;return u*u*u*a+3.*u*u*t*b+3.*u*t*t*c+t*t*t*d;}`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const ZONES={zoneCaster:0.6,zoneTarget:1.1};

// ---------- colores de materia (semánticos, fijos) ----------
const BONE="vec3(.9,.83,.68)", BONED="vec3(.6,.5,.36)", SCALEV="vec3(.36,.18,.48)", MUD="vec3(.17,.2,.1)",
  CROCD="vec3(.12,.24,.1)", CROCL="vec3(.22,.36,.12)", IVORY="vec3(.93,.88,.72)", BLOOD="vec3(.72,.05,.07)",
  THORNG="vec3(.22,.55,.16)", POISONV="vec3(.5,.18,.62)", SCUTE="vec3(.18,.1,.05)", STARY="vec3(1.,.82,.28)",
  BASALT="vec3(.16,.17,.12)", OLIVE="vec3(.28,.33,.14)", EARTH="vec3(.55,.42,.29)", ASH="vec3(.24,.21,.2)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb, sesgo; emi, brillo propio); uQ = erosión, uK = brillo
const SOLID=(body,{rim=.22,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;vec3 emi=vec3(0.);${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=emi+uC1*uK;gl_FragColor=vec4(c,1.);}`;
const smat=(body,o)=>S.mat(SOLID(body,o),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
const eu=(m,q,k)=>{m.uniforms.uQ.value=q;m.uniforms.uK.value=k;};
// cúpula o caparazón de energía: borde de fresnel, revela de abajo arriba (uP) y se erosiona (uD); `extra` suma bandas
const SHELL_FS=(extra='',gain=1)=>`uniform float uD;uniform float uF;uniform float uR;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 if(h>uP*1.15-.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);
 float bands=0.;${extra}
 float m=(pow(fr,1.8)*.9+.05+bands)*er*(1.-smoothstep(uP*1.15-.25,uP*1.15-.1,h)*.6);
 gl_FragColor=vec4(styRamp(.45+.45*fr)*(.9+.6*uF)*${f(gain)},min(m,1.)*uA);}`;
// sello de pincel en el suelo con un dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.8);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6,lo=.12)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},${f(lo)}+.3*n),m*er*uA*${f(alpha)});}`;
// energía con un color propio (no la rampa de la paleta)
const ENERGY_COL=(cell,col,gain=1.5)=>S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(${cell.toFixed(1)},uv);
 float m=sh.r;if(m<.01)discard;float er=styErode(m*.6+sh.b*.4,vK*1.05-.05,.12);float a=er*vA;if(a<.01)discard;
 vec3 c=styRampOf(${col},.5+.45*m)+vec3(1.,.95,.85)*sh.g*.35;gl_FragColor=vec4(c*${f(gain)},a);}`;
const P=(parent,n,vs,fs,o)=>S.pts(parent,n,VV+vs,fs,o);
const defs=[];

// =====================================================================
// 1 · BONE SAIL — vértebras que se erizan en la espalda; una corriente de polvo de hueso viaja al aliado; sobre él se
//     levanta una vela de reptil (varillas de hueso + membrana violeta con venas) que se pliega en una jaula de costillas
//     (escudo); en las costillas brotan púas y una brasa dorada queda dormida en la cima (+1 PA si le golpean). ti 0,78 s
// =====================================================================
const MEMB_FS=`uniform float uOpen;uniform float uQ;
void main(){vec2 p=vP.xy;float r=length(p);float an=atan(p.y,p.x);float da=abs(an-1.5708);if(da>uOpen)discard;
 float k=(an-.6)/${f(1.94/6)};float fk=fract(k);float dk=min(fk,1.-fk);
 float rmax=1.42-.24*sin(3.14159*fk);if(r>rmax||r<.38)discard;
 float nz=styNoise(p*.35+.3).r;if(styErode(nz*.7+(1.-r/rmax)*.3,uQ,.08)<.5)discard;
 float vein=smoothstep(.06,0.,abs(styNoise(vec2(an*2.2,r*.9)).b-.5)-.38);
 float edge=smoothstep(rmax-.09,rmax-.02,r);
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec3 c=styRamp(clamp(.1+.32*r/1.4+.22*l-.12*vein+.25*edge,0.,1.))*styTint(l);
 gl_FragColor=vec4(c,(.78+.2*edge)*uA);}`;
defs.push({key:"sty_reBoneSail",name:"Bone Sail (estilizado)",dur:2.2,ti:0.78,pal:P_SAIL,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Médula",0],["Corriente",0.2],["Vela",0.56],["Escudo",1.05],["Espinas",1.25],["Disolución",1.8]],
build(a){
  const L=a.L,TR=0.2,TV=0.56,TI=0.78,TS=1.05,TP=1.25,TXd=1.8,TE=2.15,NR=7,A0=0.6,AL=1.94;
  const O=V3(TX-0.1,0.95,0.05), DC=V3(TX,0,0), DR=0.92;
  const P0=V3(-3.85,1.55,0),P1=V3(-0.4,3.8,0.4),P2=V3(TX-0.1,2.35,0.05);
  // vértebras de la espalda
  const boneMat=smat(`float ring=smoothstep(.55,.9,sin(vP.y*38.));base=mix(${BONED},${BONE},.35+.65*smoothstep(-.1,.6,vP.y));lb=-.12*ring;
   emi=uC1*smoothstep(.75,1.,vUv.y)*.25;`);
  const crest=[...Array(5)].map((_,i)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.42,8).translate(0,0.21,0),boneMat);
    const an=1.15+i*0.2;m.userData={an,d:i*0.03};L.mesh.add(m);return m;});
  // vela: varillas de hueso + membrana
  const sail=new THREE.Group(); L.mesh.add(sail);
  const membMat=S.mat(MEMB_FS,{uOpen:{value:0},uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide});
  const memb=new THREE.Mesh(new THREE.RingGeometry(0.38,1.45,48,6,A0,AL),membMat); sail.add(memb);
  const ribGeo=new THREE.CylinderGeometry(0.025,0.06,1.32,8).translate(0,0.66,0);
  const ribs=[...Array(NR)].map((_,i)=>{const an=A0+AL*i/(NR-1),m=new THREE.Mesh(ribGeo,boneMat);
    m.position.set(Math.cos(an)*0.38,Math.sin(an)*0.38,0.02);m.rotation.z=an-Math.PI/2;m.userData={an,d:Math.abs(i-3)*0.035};sail.add(m);return m;});
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.16,14,10),boneMat); sail.add(knob);
  // jaula de costillas: 4 arcos (8 meridianos) + anillo de base
  const cage=new THREE.Group(); cage.position.copy(DC); L.mesh.add(cage);
  const arcs=[...Array(4)].map((_,i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(DR,0.055,8,36,Math.PI),boneMat);m.rotation.y=i*Math.PI/4;m.userData={d:i*0.04};cage.add(m);return m;});
  const baseRing=new THREE.Mesh(new THREE.TorusGeometry(DR,0.065,8,40),boneMat); baseRing.rotation.x=Math.PI/2; baseRing.position.y=0.05; cage.add(baseRing);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(DR,40,20,0,Math.PI*2,0,Math.PI/2),S.mat(SHELL_FS(
    `float an=atan(vP.z,vP.x);bands=smoothstep(.06,0.,.5-abs(fract(an/6.2832*8.)-.5))*.35;`,0.4),{uD:{value:0},uF:{value:0},uR:{value:DR}},{mode:'energy',side:THREE.DoubleSide}));
  cage.add(shell);
  const spikes=[...Array(12)].map((_,i)=>{const an=i*Math.PI/4+(i>=8?Math.PI/8:0),el=i<8?0.55:1.05;
    const d=V3(Math.cos(an)*Math.cos(el),Math.sin(el),Math.sin(an)*Math.cos(el)),m=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.32,8).translate(0,0.16,0),boneMat);
    m.quaternion.setFromUnitVectors(YA,d);m.position.copy(d).multiplyScalar(DR);m.userData={t:TP+0.02*(i%6)};cage.add(m);return m;});
  // brasa dorada (+1 PA latente) en la cima
  const ember=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),S.mat(`void main(){vec2 p=(vUv-.5)*2.;vec4 s=styShape(5.,vUv);
   gl_FragColor=vec4(styRampOf(vec3(1.,.78,.3),.6+.4*s.g)*1.8,s.r*uA);}`,{},{mode:'energy',depthTest:false})); L.mesh.add(ember);
  const sigil=groundPlane(2.9,TX,0.025,S.mat(GLYPH(`float vt=smoothstep(.07,0.,abs(r-.62))*step(.4,fract(an/6.2832*20.));float sp=smoothstep(.05,0.,abs(fract(an/6.2832*10.)-.5)*r)*step(.66,r)*step(r,.9);m=max(m*.5,max(vt,sp)*.85);`),{},{mode:'energy'})); L.decal.add(sigil);
  const ring=S.groundRing(L.decal,3.1), spark=S.hitSpark(L.mesh,1.5,{seed:0.31}), spark2=S.hitSpark(L.mesh,1.1,{seed:0.77});
  const K=`const float TR=${f(TR)};const float TV=${f(TV)};const float TI=${f(TI)};const float TS=${f(TS)};const float TP=${f(TP)};const float TXd=${f(TXd)};
  const vec3 CB=${v3(CB)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 DC=${v3(DC)};`+QB;
  // corriente de polvo de hueso (materia marfil) y chispas violeta en la cabeza
  P(L.part,26,K+`void main(){float k=aSeed.x;float s=TR+k*(TV-TR);float life=.42+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(P0,P1,P2,k)+rnd()*.12+vec3(0.,-.5*t,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t*5.;
   put(p,.16+.1*aSeed.z);}`,S.MATTER_FS(C.shard,{relief:3,col:BONE}));
  P(L.part,18,K+`void main(){float k=aSeed.x;float s=TR+k*(TV-TR);float life=.3+aSeed.y*.15;float age=(uT-s)/life;
   vec3 p=qb(P0,P1,P2,clamp(k+.03,0.,1.))+rnd()*.06;vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,.3+.15*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // médula: polvo violeta que se condensa en la espalda
  P(L.part,14,K+`void main(){float s=aSeed.x*.14;float life=.22;float age=(uT-s)/life;
   vec3 p=CB+vec3(0.,.35,0.)+normalize(rnd()+.001)*mix(.8,.05,clamp(age,0.,1.));vA=(age>0.&&age<1.)?age:0.;vK=0.;vR=aSeed.w*6.28;
   put(p,.2+.1*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // disolución: trozos de hueso que caen
  P(L.part,22,K+`void main(){float s=TXd+aSeed.x*.25;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float el=.2+aSeed.w*1.2;vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=DC+d*${f(DR)}+d*.5*t+vec3(0.,-3.5*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.y*6.28+t*6.;put(p,.2+.1*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:BONE}));
  const su=shell.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, open=e3((te-TV)/(TI-TV)), fold=ss(TS,TP,te), q=ss(TXd,TE,te);
    caster.rotation.z=0.08*ss(0,TR,te)-0.12*ss(TR,TR+0.15,te)+0.04*ss(TR+0.15,TV,te);
    glowOf(caster,U.uC1.value,0.4*ss(0,0.1,te)*(1-ss(TR,TV,te)));
    // cresta de vértebras en la espalda
    crest.forEach((m,i)=>{const g=back((te-m.userData.d)/0.2)*(1-ss(TV,TV+0.2,te));m.visible=g>0.01;
      const an=m.userData.an;tmp.set(Math.cos(an),Math.sin(an),0);m.position.set(CB.x-0.05+tmp.x*0.35,CB.y+0.05+tmp.y*0.35,(i-2)*0.06);
      m.quaternion.setFromUnitVectors(YA,tmp.set(-0.6+i*0.25,1,0).normalize());m.scale.setScalar(Math.max(g*1.3,0.001));});
    // vela: sube, se abre (varillas escalonadas) y se pliega hacia la jaula
    sail.visible=te>TV-0.02&&fold<0.999;
    towardCam(sail.position,tmp.set(O.x,O.y+0.15*open-0.7*fold,O.z),0.35); billboard(sail,0);
    sail.scale.setScalar(Math.max((0.7+0.4*open)*(1-0.6*fold)*1.45,0.001));
    membMat.uniforms.uOpen.value=0.97*open*(1-fold); membMat.uniforms.uA.value=1; membMat.uniforms.uQ.value=-0.1+1.1*fold;
    for(const r of ribs){const g=ss(TV+r.userData.d,TV+r.userData.d+0.18,te)*(1-fold);r.visible=g>0.01;r.scale.set(1,Math.max(g,0.001),1);
      r.rotation.z=(1.5708+(r.userData.an-1.5708)*Math.max(open,0.08))-Math.PI/2;
      const an=1.5708+(r.userData.an-1.5708)*Math.max(open,0.08);r.position.set(Math.cos(an)*0.38,Math.sin(an)*0.38,0.02);}
    knob.visible=sail.visible; knob.scale.setScalar(Math.max(open,0.2));
    eu(boneMat,q>0?-0.1+1.15*q:-1,0.35*hitE(ia,6)+0.5*hitE(te-TP,8)*(te>=TP?1:0));
    // jaula de costillas
    const cg=ss(TS-0.05,TP,te); cage.visible=cg>0.01&&q<0.999;
    arcs.forEach(m=>{const g=ss(TS-0.05+m.userData.d,TP+m.userData.d,te);m.visible=g>0.01;m.scale.set(1,Math.max(g,0.001),1);});
    baseRing.visible=cg>0.01; baseRing.scale.setScalar(Math.max(0.6+0.4*cg,0.001));
    cage.scale.set(1,1.2,1);
    su.uP.value=cg; su.uA.value=0.85*(1-q); su.uD.value=q*1.1; su.uF.value=hitE(te-TP,7)*(te>=TP?1:0);
    for(const s of spikes){const k=back((te-s.userData.t)/0.14)*(1-q);s.visible=k>0.01&&te>s.userData.t;s.scale.setScalar(Math.max(k*1.2,0.001));}
    const env=ss(TP,TP+0.15,te)*(1-ss(TXd,TE,te));
    ember.visible=env>0.01; towardCam(ember.position,tmp.set(DC.x,DR*1.2+0.32+0.04*Math.sin(te*6),DC.z),0.3); billboard(ember,te*0.8);
    ember.scale.setScalar(0.8+0.2*Math.sin(te*9)); ember.material.uniforms.uA.value=env;
    set(sigil,ia>=0?-0.1+1.1*ss(TXd,TE,te):0.6*(1-ss(TV,TI,te)),ss(TV,TI,te)*(1-ss(TE-0.15,TE,te)));
    ring.pose(ia,TX,0,0.45,1); ring.mesh.position.z=0;
    spark.pose(ia,tmp.set(O.x,O.y+1.0,O.z),1); spark2.pose(te-TP,tmp.set(DC.x,DR*1.2,DC.z),1);
    target.scale.set(1+0.04*hitE(ia,8),1-0.05*hitE(ia,8),1+0.04*hitE(ia,8));
    o.em=0.3*hitE(ia,5)+0.18*env; o.emc.copy(U.uC1.value);
    if(te<TR){o.g.copy(CB).y+=0.3;o.gs=0.7;o.ga=0.2*ss(0,0.1,te);o.li=1.4;}
    else if(te<TV){qb(P0,P1,P2,cl((te-TR)/(TV-TR)),o.g);o.gs=0.7;o.ga=0.15;o.li=1.6;}
    else{o.g.set(TX,1.1,0);o.gs=1.3+0.3*env;o.ga=0.25*hitE(ia,6)+0.06*env;o.li=3.5*hitE(ia,4)+0.8*env;}
    o.ia=ia; o.c.set(TX,1.1,0); o.shake=0; o.dist=0.4; o.flash=0;
  };
}});

// =====================================================================
// 2 · CROC — el suelo bajo el aliado se vuelve ciénaga; unas fauces de caimán (piel acorazada, dientes de marfil) emergen
//     y se cierran en torno a él con un chasquido; se hunden dejando una corona de dientes ensangrentados y un escudo
//     de escamas (Sangrado al atacante). ti 0,82 s
// =====================================================================
defs.push({key:"sty_reCroc",name:"Croc (estilizado)",dur:2.2,ti:0.82,pal:P_CROC,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Ciénaga",0],["Emersión",0.5],["Mordisco",0.82],["Cierre",0.92],["Hundimiento",1.35],["Corona",1.55]],
build(a){
  const L=a.L,TE=0.5,TI=0.82,TK=1.35,TKE=1.62,TF=1.95,END=2.2;
  // mandíbula: perfil de hocico con fila de dientes, extruido (la mitad; la otra es el espejo)
  const sh=new THREE.Shape(); sh.moveTo(0,0);
  [[-0.48,0.05],[-0.58,0.42],[-0.53,0.9],[-0.44,1.34],[-0.32,1.74],[-0.16,2.04],[-0.02,2.14]].forEach(p=>sh.lineTo(p[0],p[1]));
  for(let i=0;i<9;i++){const y=1.95-i*0.2;sh.lineTo(0,y+0.06);sh.lineTo(0.15-(i%2)*0.05,y-0.02);sh.lineTo(0,y-0.1);}
  sh.lineTo(0,0);
  const jawGeo=new THREE.ExtrudeGeometry(sh,{depth:0.3,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.04,bevelSegments:2,curveSegments:4}).translate(0,0,-0.15);
  const jawMat=smat(`float tooth=smoothstep(-.005,.03,vP.x);
   vec2 q=vP.xy*vec2(7.,5.);float r=floor(q.y);q.x+=.5*mod(r,2.);vec2 cc=fract(q)-.5;
   float bump=smoothstep(.5,.1,length(cc));float knob=smoothstep(.22,.05,length(cc))*step(.6,fract(sin(dot(floor(q),vec2(12.9,78.2)))*437.5));
   base=mix(mix(${CROCD},${CROCL},bump*.6),${IVORY},tooth);lb=knob*.14-.05*(1.-bump)+tooth*.08;
`,{rim:.3});
  const jaws=[1,-1].map(s=>{const g=new THREE.Group(),m=new THREE.Mesh(jawGeo,jawMat);m.scale.x=s;g.add(m);g.userData={s};L.mesh.add(g);return g;});
  // ojos del caimán (sobre el hocico): bolas amarillas con pupila
  const eyeMat=S.mat(`uniform float uOn;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float pu=smoothstep(.05,.03,abs(vP.x))*step(0.,vP.z);
   vec3 c=mix(styRampOf(vec3(1.,.78,.2),.4+.5*l),vec3(.05),pu);gl_FragColor=vec4(c+vec3(1.,.8,.3)*uOn*(1.-pu),1.);}`,{uOn:{value:0}},{mode:'solid'});
  const eyes=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.11,12,10),eyeMat);L.mesh.add(m);m.userData={s};return m;});
  // corona de dientes (escudo): marfil con punta ensangrentada
  const toothMat=smat(`float h=vP.y/.72;base=mix(${IVORY},${BLOOD},smoothstep(.6,.88,h));lb=.05;emi=${BLOOD}*smoothstep(.75,1.,h)*.25;`);
  const crown=new THREE.Group(); crown.position.set(TX,0,0); L.mesh.add(crown);
  const teeth=[...Array(10)].map((_,i)=>{const an=i/10*Math.PI*2,m=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.72,8).translate(0,0.36,0),toothMat);
    m.position.set(Math.cos(an)*0.85,0,Math.sin(an)*0.85);m.rotation.set(Math.sin(an)*0.36,0,-Math.cos(an)*0.36);m.userData={d:i*0.02};crown.add(m);return m;});
  const R=1.0;
  const shield=new THREE.Mesh(new THREE.SphereGeometry(R,40,20,0,Math.PI*2,0,Math.PI/2),S.mat(SHELL_FS(
    `vec2 q=vec2(atan(vP.z,vP.x)*3.2,h*6.);float rr=floor(q.y);q.x+=.5*mod(rr,2.);vec2 c=vec2(fract(q.x)-.5,fract(q.y));
     bands=smoothstep(.07,0.,abs(length(c*vec2(1.,1.3))-.5))*.4;`,0.32),{uD:{value:0},uF:{value:0},uR:{value:R}},{mode:'energy',side:THREE.DoubleSide}));
  shield.position.set(TX,0,0); L.mesh.add(shield);
  // ciénaga (materia oscura) + ondas (energía)
  const swamp=groundPlane(2.8,TX,0.016,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=styNoise(vUv*.9+uT*.02).r*.6+styNoise(vUv*1.7).g*.4;float m=smoothstep(1.,.85,r/max(uP,.01)+(n-.5)*.35);if(m<.01)discard;
   vec3 c=mix(styRampOf(${MUD},.15+.3*n),styRampOf(vec3(.36,.5,.2),.5),smoothstep(.66,.72,styNoise(vUv*2.3+.4).g)*.6);
   gl_FragColor=vec4(c,m*.85*uA);}`,{},{mode:'matter'})); L.decal.add(swamp);
  const ripple=groundPlane(2.8,TX,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float w=smoothstep(.06,0.,abs(fract(r*2.4-uT*1.2)-.5)-.4)*smoothstep(1.,.3,r)*step(r,uP);if(w<.02)discard;
   gl_FragColor=vec4(styRamp(.6),w*.5*uA);}`,{},{mode:'energy'})); L.decal.add(ripple);
  const ring=S.groundRing(L.decal,3.2), spark=S.hitSpark(L.mesh,1.2,{seed:0.53});
  const K=`const float TE=${f(TE)};const float TI=${f(TI)};const float TK=${f(TK)};const float TKE=${f(TKE)};const float TF=${f(TF)};const float TX=${f(TX)};`;
  // burbujas de la ciénaga
  P(L.part,16,K+`void main(){float life=.5+aSeed.y*.3;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rd=.15+.85*sqrt(r.y);vec3 p=vec3(TX+cos(an)*rd,.03+age*.2,sin(an)*rd);
   vA=(uT<TI+.1)?smoothstep(.05,.3,uT):0.;vK=smoothstep(.6,1.,age);vR=0.;put(p,.16+.1*r.z);}`,
   S.MATTER_FS(C.puff,{relief:4,col:'vec3(.3,.38,.16)'}));
  // salpicadura de agua turbia al emerger y al hundirse
  for(const [t0,n] of [[TE+0.04,22],[TK+0.05,14],[TI,12]])
    P(L.part,n,K+`void main(){float s=${f(t0)}+aSeed.x*.08;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.8+1.4*aSeed.w),2.6+2.*aSeed.y,sin(an)*(.8+1.4*aSeed.w));
     vec3 p=vec3(TX,0.,0.)+vec3(cos(an)*.55,.05,sin(an)*.55)+v*t+vec3(0.,-7.*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=3.14159;put(p,.18+.08*aSeed.w);}`,
     S.MATTER_FS(C.drop,{relief:4,col:'vec3(.32,.42,.2)'}));
  // gotas de sangre que resbalan por los dientes de la corona
  P(L.part,12,K+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TKE)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=floor(r.x*10.)/10.*6.2832;vec3 p=vec3(TX+cos(an)*1.,.62-.58*age*age,sin(an)*1.);
   vA=(k>=1.&&uT<TF+.15)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.13+.04*r.z);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  const swu=swamp.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.08*ss(0,0.25,te)-0.1*ss(TI-0.1,TI+0.05,te)+0.02*ss(TI+0.05,TK,te);
    glowOf(caster,U.uC1.value,0.3*ss(0,0.2,te)*(1-ss(0.3,0.6,te)));
    // fauces: suben abiertas, se cierran de golpe y se hunden
    const rise=ss(TE,TI-0.06,te), sink=ss(TK,TKE,te), close=ss(TI-0.07,TI,te);
    const ang=0.68*(1-close)+0.05*close+0.03*Math.sin(te*34)*(te>TI&&te<TK?1:0)*(1-sink);
    const y=-2.3+2.1*rise-2.4*sink;
    for(const g of jaws){const s=g.userData.s;g.visible=te>TE&&sink<0.999;g.position.set(TX-0.15*s,y,0.66);g.rotation.z=ang*s;g.scale.setScalar(1.25);}
    for(const e of eyes){const s=e.userData.s,th=ang*s,lx=-0.36*s,ly=1.5;e.visible=jaws[0].visible;
      e.position.set(TX-0.15*s+lx*Math.cos(th)-ly*Math.sin(th),y*1.05+lx*Math.sin(th)+ly*Math.cos(th),0.66+0.2);}
    eyeMat.uniforms.uOn.value=0.6*ss(TE,TI,te);
    eu(jawMat,-1,0.25*hitE(ia,5));
    // corona de dientes y escudo de escamas
    const cr=ss(TK,TKE,te)*(1-ss(TF,END,te));
    crown.visible=cr>0.01;
    for(const t of teeth){const k=back((te-TK-t.userData.d)/0.18)*(1-ss(TF,END,te));t.visible=k>0.01&&te>TK+t.userData.d;t.scale.set(1.1,Math.max(k*1.1,0.001),1.1);}
    eu(toothMat,te>TF?-0.1+1.15*ss(TF,END,te):-1,0);
    const su=shield.material.uniforms; shield.visible=te>TK; su.uP.value=ss(TK,TKE,te); su.uA.value=0.8; su.uD.value=ss(TF,END,te)*1.1; su.uF.value=hitE(te-TKE,8)*(te>TKE?1:0);
    shield.scale.set(1,1.2,1);
    swu.uP.value=ss(0,0.45,te); swu.uA.value=1-ss(TK+0.2,TF,te);
    set(ripple,ss(0.05,0.5,te),1-ss(TK,TF,te));
    ring.pose(ia,TX,0,0.45,1.1);
    spark.pose(ia,tmp.set(TX,1.75,0.7),1);
    const h=hitE(ia,8); target.scale.set(1-0.06*h,1+0.03*h,1-0.06*h);
    o.em=0.35*hitE(ia,5)+0.2*cr; o.emc.copy(U.uC1.value);
    if(te<TE){o.g.set(TX,0.3,0);o.gs=1.2*ss(0,0.4,te);o.ga=0.1;o.li=1.0;}
    else if(te<TK){o.g.set(TX,1.2,0.5);o.gs=1.4+1.2*hitE(ia,6);o.ga=0.25*hitE(ia,7)+0.05;o.li=1.5+4*hitE(ia,5);}
    else{o.g.set(TX,0.8,0);o.gs=1.6;o.ga=0.06*cr;o.li=1.2*cr;}
    o.ia=ia; o.c.set(TX,1.0,0); o.shake=0; o.dist=0.5; o.flash=0;
  };
}});

// =====================================================================
// 3 · GREEN THORNS (Shinji) — la espalda se eriza de seis espinas verdes con la punta violeta; salen en andanada, suben en
//     arco y llueven en vertical sobre la cruz del área (casilla objetivo y sus 4 vecinas); cada una se clava y revienta
//     en veneno; el área queda con charco tóxico y Veneno; el lanzador se cura (hojas y cruces verdes). ti 0,83 s
// =====================================================================
const CROSS_GLSL=`vec3 cl5(float i){return i<.5?vec3(0.):(i<1.5?vec3(${f(TILE)},0.,0.):(i<2.5?vec3(${f(-TILE)},0.,0.):(i<3.5?vec3(0.,0.,${f(TILE)}):vec3(0.,0.,${f(-TILE)}))));}`;
defs.push({key:"sty_reGreenThorns",name:"Green Thorns (estilizado)",dur:2.0,ti:0.83,pal:P_THORN,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:TILE*1.6,
  phases:[["Erizado",0],["Andanada",0.26],["Lluvia",0.83],["Veneno",1.2],["Fin",1.7]],
build(a){
  const L=a.L,N=6,TL0=0.26,FL=0.57,TI=0.83,TH=1.15,TEND=1.75;
  const LAND=[[0,0.25],[TILE,0],[-TILE,0],[0,TILE],[0,-TILE],[0.35,-0.3]].map(([dx,dz])=>V3(TX+dx,0,dz));
  const tl=i=>TL0+[0,0.05,0.1,0.15,0.2,0.24][i];
  const P0=[...Array(N)].map((_,i)=>V3(-3.95+0.06*i,1.55+0.08*(i%2),(i-2.5)*0.14));
  const P1=LAND.map((e,i)=>V3(e.x-2.1+0.25*i,5.6+0.3*(i%3),e.z*0.5));
  // espina: tronco verde estriado que vira a violeta en la punta, con brillo tóxico en la punta
  const thornMat=smat(`float h=clamp(vP.y/1.5,0.,1.);float an=atan(vP.z,vP.x);float st=.5+.5*abs(sin(an*4.));
   base=mix(${THORNG},${POISONV},smoothstep(.5,.88,h));lb=-.1*st+.05;emi=uC2*smoothstep(.82,1.,h)*.7;`,{rim:.3});
  const thornGeo=new THREE.ConeGeometry(0.15,1.5,10,3).translate(0,0.75,0);
  const thorns=[...Array(N)].map(()=>{const m=new THREE.Mesh(thornGeo,thornMat);L.mesh.add(m);return m;});
  const sparks=LAND.map((_,i)=>S.hitSpark(L.mesh,i===0?1.5:1.1,{seed:0.12+i*0.13}));
  const cracks=LAND.map(p=>{const m=groundPlane(1.1,p.x,0.028+0.001*p.z,S.mat(`void main(){vec2 q=vUv-.5;float r=length(q)*2.;float an=atan(q.y,q.x);
   float v=pow(1.-abs(fract(an/6.2832*5.+styNoise(vUv*.6).r*.4)*2.-1.),10.)*smoothstep(1.,.3,r);float c=smoothstep(.35,.0,r);float m=max(v,c*.8);
   if(m<.03)discard;float er=styErode(m,uP,.1);gl_FragColor=vec4(styRampOf(${POISONV},.2+.4*m),m*er*uA*.85);}`,{},{mode:'matter'}));m.position.z=p.z;L.decal.add(m);return m;});
  // charco tóxico en la cruz
  const stain=groundPlane(TILE*3.4,TX,0.022,S.mat(`uniform float uK;void main(){vec2 p=(vUv-.5)*${f(TILE*3.4)};
   float a1=max(abs(p.x)-${f(TILE*1.48)},abs(p.y)-${f(TILE*.48)});float b1=max(abs(p.x)-${f(TILE*.48)},abs(p.y)-${f(TILE*1.48)});
   float d=min(a1,b1);float n=styNoise(vUv*2.2+.3).r;float m=smoothstep(.15,-.25,d+(n-.5)*.5);
   m*=smoothstep(uK*${f(TILE*1.75)}+.2,uK*${f(TILE*1.75)}-.3,max(abs(p.x),abs(p.y)));
   if(m<.01)discard;float er=styErode(n*.7+m*.3,uP,.14);
   float bub=smoothstep(.07,0.,.5-abs(fract(styNoise(vUv*4.+uT*.15).g*3.)-.5));
   vec3 c=styRampOf(mix(${POISONV},vec3(.28,.62,.2),.25*n),.1+.28*n)+vec3(.45,.95,.3)*bub*.35;
   gl_FragColor=vec4(c,m*er*uA*.72);}`,{uK:{value:0}},{mode:'matter'})); L.decal.add(stain);
  const ring=S.groundRing(L.decal,TILE*3.2), healRing=S.groundRing(L.decal,2.4);
  const K=`const float TI=${f(TI)};const float FL=${f(FL)};const float TH=${f(TH)};const float TX=${f(TX)};const vec3 CB=${v3(CB)};${CROSS_GLSL}`+QB;
  // erizado: púas pequeñas que brotan de la espalda (materia)
  P(L.part,12,K+`void main(){float s=aSeed.x*.18;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=1.2+aSeed.z*1.9;vec3 d=vec3(cos(an)*.9,sin(an),(aSeed.w-.5)*1.2);vec3 p=CB+vec3(0.,.2,0.)+d*(.15+.4*(1.-exp(-t*9.)));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=-an+1.5708;put(p,.3+.12*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:THORNG}));
  // estela de cada espina (semillas verdes y violeta)
  P(L.part,60,K+`void main(){float i=floor(aSeed.x*5.999);float t0=${f(TL0)}+(i<.5?0.:i<1.5?.05:i<2.5?.1:i<3.5?.15:i<4.5?.2:.24);
   vec3 A=vec3(-3.95+.06*i,1.55+.08*mod(i,2.),(i-2.5)*.14);vec3 E=(i<5.?cl5(i):vec3(.35,0.,-.3))+vec3(TX,0.,0.);if(i<.5)E.z=.25;
   vec3 B=vec3(E.x-2.1+.25*i,5.6+.3*mod(i,3.),E.z*.5);float lag=aSeed.y*.16;float k=(uT-t0)/FL-lag;
   vec3 p=qb(A,B,E+vec3(0.,.4,0.),clamp(k,0.,1.))+rnd()*.05*(1.+lag*8.);
   vA=(k>0.&&k<1.)?1.:0.;vK=lag/.16*.8;vR=aSeed.z*6.28;put(p,(.16+.08*aSeed.z)*(1.-lag*3.));}`,
   ENERGY_COL(C.spark,'mix(vec3(.45,.95,.3),vec3(.75,.35,1.),step(.5,vMix))',1.2),{mode:'energy'});
  // impacto de cada espina: salpicadura de veneno (gotas violeta/verdes)
  P(L.part,60,K+`void main(){float i=floor(aSeed.x*5.999);float t0=${f(TL0)}+(i<.5?0.:i<1.5?.05:i<2.5?.1:i<3.5?.15:i<4.5?.2:.24);
   vec3 E=(i<5.?cl5(i):vec3(.35,0.,-.3))+vec3(TX,0.,0.);if(i<.5)E.z=.25;
   float s=t0+FL;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.7+1.*aSeed.w),1.6+1.3*aSeed.y,sin(an)*(.7+1.*aSeed.w));
   vec3 p=E+vec3(0.,.1,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.17+.08*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'mix(vec3(.55,.22,.7),vec3(.35,.75,.25),step(.6,vMix))'}));
  // nubecillas tóxicas sobre la cruz
  P(L.part,30,K+`void main(){float ci=floor(aSeed.x*5.);float s=TI+.05+aSeed.y*.2+ci*.03;float t=max(uT-s,0.);float life=.8+aSeed.z*.3;float age=t/life;
   float an=aSeed.w*6.2832;float rd=fract(aSeed.y*7.3)*.55;vec3 p=vec3(TX,0.,0.)+cl5(ci)+vec3(cos(an)*rd,.2+t*.45,sin(an)*rd);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28+t;put(p,(.42+.2*fract(aSeed.w*3.7))*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'mix(vec3(.46,.17,.6),vec3(.35,.66,.22),step(.7,vMix))',bias:-.15}));
  // cura del lanzador: hojas y cruces verdes que suben
  P(L.part,14,K+`void main(){float s=TI+.15+aSeed.x*.5;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.;vec3 p=vec3(-3.7+cos(an)*.55,.2+aSeed.w*.7+t*1.3,sin(an)*.55);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=sin(t*5.+aSeed.w*6.)*.8;put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.42,.8,.24)'}));
  P(L.part,10,K+`void main(){float s=TI+.2+aSeed.x*.45;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.45,.5+aSeed.w*.8+t*1.1,sin(an)*.45);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.34+.1*aSeed.w);}`,S.PV+`void main(){vec2 q=styPC()-.5;
   float c=max(step(abs(q.x),.09)*step(abs(q.y),.32),step(abs(q.y),.09)*step(abs(q.x),.32));if(c<.5||vA<.02)discard;
   gl_FragColor=vec4(styRampOf(vec3(.45,.95,.35),.75)*1.5,vA);}`,{mode:'energy'});
  const PZ=S.status(a,"poison",[target],TI+0.1,1.95),ST=[{kind:"poison",env:0}];
  const Pp=V3(0,0,0), D=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.12*ss(0,TL0,te)-0.2*ss(TL0,TL0+0.1,te)+0.08*ss(TL0+0.1,0.7,te);
    glowOf(caster,te>TI?tmp3.set(0.45,0.95,0.35):U.uC2.value,0.35*ss(0,0.15,te)*(1-ss(TL0,0.5,te))+0.4*ss(TI+0.15,TI+0.4,te)*(1-ss(TI+0.65,TEND,te)));
    let tgt=0;
    thorns.forEach((m,i)=>{const t0=tl(i),k=(te-t0)/FL,E=LAND[i];
      if(te<t0){const g=back((te-0.03-i*0.025)/0.2);m.visible=g>0.01;m.position.copy(P0[i]);m.scale.setScalar(Math.max(g*0.7,0.001));
        m.quaternion.setFromUnitVectors(YA,D.set(-0.5+0.18*i,1,(i-2.5)*0.15).normalize());}
      else if(k<1){m.visible=true;m.scale.setScalar(1.1);tmp.copy(E);tmp.y=0.4;qb(P0[i],P1[i],tmp,k,Pp);qbd(P0[i],P1[i],tmp,k,D);
        m.position.copy(Pp).addScaledVector(D.normalize(),-1.1);m.quaternion.setFromUnitVectors(YA,D);}
      else{const ih=te-t0-FL,sk=1-ss(TEND-0.35,TEND,te);m.visible=sk>0.01;m.scale.setScalar(1.1);
        tmp.copy(E);tmp.y=0.4;qbd(P0[i],P1[i],tmp,1,D);D.normalize();
        m.position.copy(E).addScaledVector(D,-1.0+0.1*Math.exp(-ih*20));m.position.y-=0.15*ss(TEND-0.35,TEND,te);
        m.quaternion.setFromUnitVectors(YA,D);m.rotateZ(0.06*Math.sin(ih*60)*Math.exp(-ih*8));}
      const ih=te-t0-FL; sparks[i].pose(ih,tmp.set(E.x,0.35,E.z),i===0?1.1:0.8);
      set(cracks[i],ih>=0?-0.1+1.15*ss(1.3,TEND+0.15,te):0,ih>=0?1:0);
      if(i===0||i===5)tgt+=hitE(ih,10);});
    eu(thornMat,te>TEND-0.4?-0.1+1.15*ss(TEND-0.4,TEND,te):-1,0.25*ss(0.05,0.25,te)*(1-ss(TL0,TL0+0.3,te)));
    target.rotation.z=-0.1*cl(tgt)*Math.sin(te*40); target.scale.set(1+0.04*cl(tgt),1-0.06*cl(tgt),1+0.04*cl(tgt));
    stain.visible=ia>=0; stain.material.uniforms.uK.value=e3(ia/0.35); set(stain,ia>=0?-0.15+1.2*ss(TEND-0.35,2.0,te):0,ss(0,0.15,ia));
    ring.pose(ia,TX,0,0.5,1); healRing.pose(te-TI-0.15,CX,0,0.5,0.8);
    ST[0].env=PZ.pose(te); S.statusGlow(o,ST);
    if(te<TL0){o.g.copy(CB).y+=0.3;o.gs=0.7;o.ga=0.15*ss(0,0.15,te);o.li=1.4;}
    else if(ia<0){o.g.set(0,4,0);o.gs=0.5;o.ga=0.05;o.li=0.8;}
    else{o.g.set(TX,0.8,0);o.gs=1.6+1.4*ia;o.ga=0.25*Math.exp(-ia*8);o.li=3*Math.exp(-ia*4)+0.6*ST[0].env;}
    o.ia=ia; o.c.set(TX,0.5,0.25); o.shake=0.4; o.dist=0.7; o.flash=0.5;
  };
}});

// =====================================================================
// 4 · INDIAN STAR — siete estrellas doradas se encienden sobre la espalda con el dibujo radial de la tortuga estrellada;
//     un río de estrellas fluye al aliado y cae como un caparazón de escudos (escamas oscuras con rayos amarillos);
//     un brillo barre el caparazón y esquirlas doradas rebotan hacia fuera (refleja el 25 %). ti 0,8 s
// =====================================================================
const SCUTE_FS=`uniform float uQ;uniform float uSh;uniform float uR;
void main(){vec3 n0=normalize(vP);float h=vP.y/uR;if(h<0.)discard;
 if(h>uP*1.2-.05)discard;
 float an=atan(n0.z,n0.x);float el=asin(clamp(n0.y,0.,1.));
 vec2 p=vec2(an/6.2832*10.,el/1.5708*3.6);vec2 rr=vec2(1.,1.732);vec2 hh=rr*.5;
 vec2 ga=mod(p,rr)-hh;vec2 gb=mod(p-hh,rr)-hh;vec2 g=dot(ga,ga)<dot(gb,gb)?ga:gb;
 float hx=max(abs(g.x)*.866+abs(g.y)*.5,abs(g.y))*1.15;float border=smoothstep(.43,.5,hx);
 float ra=atan(g.y,g.x);float rays=smoothstep(.75,.95,abs(cos(ra*3.)))*smoothstep(.5,.08,length(g));
 float boss=smoothstep(.13,.08,length(g));
 float nz=styNoise(vUv*vec2(3.,1.5)+.2).r;if(styErode(nz*.7+(1.-h)*.3,uQ,.08)<.5)discard;
 vec3 nn=normalize(vN);if(!gl_FrontFacing)nn=-nn;float l=styLight(nn,stySunV());
 vec3 c=styRampOf(${SCUTE},.25+.5*l);c=mix(c,styRampOf(${STARY},.45+.45*l),max(rays,boss));c=mix(c,styRampOf(vec3(.08,.05,.02),.4),border*.8);
 float fr=1.-abs(dot(nn,normalize(vV)));
 float sheen=smoothstep(.12,0.,abs(n0.x*.7+n0.y*.6-n0.z*.3-(uSh*3.4-1.7)));
 c+=uC1*(sheen*.9+smoothstep(.7,.9,fr)*.35);
 float a=mix(.42,1.,max(max(rays,boss),border));a=max(a,sheen*.9);
 gl_FragColor=vec4(c,a*uA);}`;
defs.push({key:"sty_reIndianStar",name:"Indian Star (estilizado)",dur:2.2,ti:0.8,pal:P_STAR,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Constelación",0],["Río de estrellas",0.32],["Cúpula",0.8],["Reflejo",1.0],["Dispersión",1.75]],
build(a){
  const L=a.L,TF=0.32,TI=0.8,TR=1.0,TXd=1.75,TE=2.15,R=1.02;
  const CS=V3(-3.85,2.15,0), Q1=V3(-0.4,4.0,0.3), Q2=V3(TX,2.5,0);
  // constelación: plano con la estrella radial de la tortuga
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),S.mat(`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
  void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<6;i++){float an=.5236+float(i)*1.0472;vec2 q=vec2(cos(an),sin(an))*.66;float k=clamp(uP*1.4-float(i)*.06,0.,1.);
    m+=smoothstep(.05,.02,sdSeg(p,vec2(0.),q*k))*step(.001,k)*.8;}
   float ring=smoothstep(.04,.0,abs(length(p)-.66))*.5*uP;vec4 s=styShape(7.,vUv);m=max(m,ring*s.r);
   if(m<.02)discard;gl_FragColor=vec4(styRampOf(${STARY},.7)*1.3,m*uA);}`,{},{mode:'energy',depthTest:false})); L.mesh.add(sky);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(R,56,24,0,Math.PI*2,0,Math.PI/2),S.mat(SCUTE_FS,{uQ:{value:-1},uSh:{value:-1},uR:{value:R}},{mode:'matter',side:THREE.DoubleSide}));
  dome.position.set(TX,0,0); L.mesh.add(dome);
  const rim=new THREE.Mesh(new THREE.SphereGeometry(R*1.03,40,20,0,Math.PI*2,0,Math.PI/2),S.mat(SHELL_FS('',0.8),{uD:{value:0},uF:{value:0},uR:{value:R*1.03}},{mode:'energy',side:THREE.FrontSide}));
  rim.position.set(TX,0,0); L.mesh.add(rim);
  const chart=groundPlane(3.1,TX,0.025,S.mat(GLYPH(`float st=smoothstep(.75,.95,abs(cos((an-uT*.15)*4.)))*smoothstep(.88,.25,r)*.7;m=max(m*.55,st);`),{},{mode:'energy'})); L.decal.add(chart);
  const ring=S.groundRing(L.decal,3.2), spark=S.hitSpark(L.mesh,1.5,{seed:0.6});
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float TR=${f(TR)};const float TXd=${f(TXd)};const float TX=${f(TX)};const float R=${f(R)};
  const vec3 CS=${v3(CS)};const vec3 Q1=${v3(Q1)};const vec3 Q2=${v3(Q2)};`+QB;
  // estrellas de la constelación (7) que titilan
  P(L.part,7,K+`void main(){float i=floor(aSeed.x*7.);float an=.5236+i*1.0472;vec3 p=CS+(i<.5?vec3(0.):vec3(cos(an)*.56,sin(an)*.56,.02));
   float on=smoothstep(.02+i*.03,.1+i*.03,uT)*(1.-smoothstep(TF+.2,TF+.4,uT));vA=on;vK=0.;vR=uT*2.+i;
   put(p,(.55+.15*sin(uT*14.+i*2.))*(i<.5?1.3:1.));}`,ENERGY_COL(C.spark,STARY,1.7),{mode:'energy',depthTest:false});
  // río de estrellas
  P(L.part,40,K+`void main(){float k=aSeed.x;float s=TF+k*(TI-TF)*.9;float life=.32+aSeed.y*.15;float age=(uT-s)/life;
   vec3 p=qb(CS,Q1,Q2,clamp(k+.04,0.,1.))+rnd()*.18;vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28+uT*3.;
   put(p,.3+.2*aSeed.z);}`,ENERGY_COL(C.spark,STARY,1.4),{mode:'energy'});
  // reflejo: esquirlas doradas que rebotan hacia fuera del caparazón
  P(L.part,22,K+`void main(){float s=TR+aSeed.x*.12;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float el=.25+aSeed.w*1.1;vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=vec3(TX,0.,0.)+d*vec3(R,R*1.15,R)+d*(2.2*t)+vec3(0.,-2.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.22+.1*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:STARY,bias:.1}));
  // dispersión: el caparazón se deshace en estrellas
  P(L.part,26,K+`void main(){float s=TXd+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float el=aSeed.w*1.4;vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=vec3(TX,0.,0.)+d*vec3(R,R*1.15,R)+vec3(0.,.9*t,0.)+d*.3*t;
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=uT*3.;put(p,.26+.12*aSeed.y);}`,ENERGY_COL(C.spark,STARY,1.4),{mode:'energy'});
  const du=dome.material.uniforms, ru=rim.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, q=ss(TXd,TE,te);
    caster.rotation.z=0.06*ss(0,TF,te)-0.1*ss(TF,TF+0.12,te);
    glowOf(caster,U.uC1.value,0.35*ss(0,0.15,te)*(1-ss(TF,TI,te)));
    sky.visible=te<TF+0.4; towardCam(sky.position,CS,0.2); billboard(sky,0); set(sky,ss(0,TF,te),1-ss(TF+0.15,TF+0.4,te));
    // caparazón: cae desde arriba (aparece de arriba a abajo) con un rebote
    dome.visible=te>TI-0.12&&q<0.999;
    const dp=ss(TI-0.12,TI+0.08,te); du.uP.value=dp*1.1; du.uA.value=1; du.uQ.value=q>0?-0.1+1.15*q:-1; du.uSh.value=ss(TR,TR+0.45,te);
    const bo=1+0.06*hitE(ia,9)*Math.cos(Math.max(ia,0)*30)+0.03*hitE(te-TR,10);
    dome.scale.set(bo,1.15*bo,bo); rim.scale.copy(dome.scale);
    rim.visible=dome.visible; ru.uP.value=dp; ru.uA.value=0.7; ru.uD.value=q*1.1; ru.uF.value=hitE(ia,8)+0.8*hitE(te-TR,7)*(te>=TR?1:0);
    set(chart,ia>=0?-0.1+1.1*q:0.6*(1-ss(TF,TI,te)),ss(TF,TI,te)*(1-ss(TE-0.1,TE,te)));
    ring.pose(ia,TX,0,0.45,1.05);
    spark.pose(ia,tmp.set(TX,R*1.15+0.2,0),1);
    const h=hitE(ia,9); target.scale.set(1+0.04*h,1-0.06*h,1+0.04*h);
    o.em=0.3*h+0.12*(1-q)*(ia>0?1:0); o.emc.copy(U.uC1.value);
    if(te<TF){o.g.copy(CS);o.gs=0.9;o.ga=0.25*ss(0,0.15,te);o.li=1.6;}
    else if(ia<0){qb(CS,Q1,Q2,cl((te-TF)/(TI-TF)),o.g);o.gs=0.8;o.ga=0.2;o.li=1.8;}
    else{o.g.set(TX,1.2,0);o.gs=1.6;o.ga=0.25*hitE(ia,6)+0.2*hitE(te-TR,6)*(te>=TR?1:0);o.li=3*hitE(ia,4)+2*hitE(te-TR,5)*(te>=TR?1:0);}
    o.ia=ia; o.c.set(TX,1.1,0); o.shake=0; o.dist=0.4; o.flash=0;
  };
}});

// =====================================================================
// 5 · RED EAR — dos latidos rojos en las orejas (la franja de la tortuga de orejas rojas); un chorro de magma cruza hasta
//     el aliado y se solidifica en un caparazón de placas oliva con juntas incandescentes que late con calor y lanza
//     lenguas de fuego; al final se enfría y se deshace en ceniza. ti 0,72 s
// =====================================================================
const VOR3=`vec2 vor3(vec3 p){vec3 i=floor(p),fp=fract(p);float d1=8.,d2=8.;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(float(x),float(y),float(z));
  vec3 o=vec3(hash(i+g),hash(i+g+17.3),hash(i+g+41.7));float d=length(g+o-fp);
  if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return vec2(d1,d2);}`;
defs.push({key:"sty_reRedEar",name:"Red Ear (estilizado)",dur:2.0,ti:0.72,pal:P_EAR,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Latido",0],["Magma",0.36],["Costra",0.72],["Calor",0.9],["Enfriado",1.55]],
build(a){
  const L=a.L,TM=0.36,TI=0.72,TP=0.9,TXd=1.55,TE=1.95,BEAT=[0.04,0.22],PER=0.62,R=0.95;
  const EARS=[V3(-3.62,1.78,0.3),V3(-3.62,1.78,-0.3)], EM=V3(-3.6,1.95,0);
  const M1=V3(-0.5,4.0,0.3), M2=V3(TX,2.3,0);
  const beat=te=>{let b=0;for(const t of BEAT)b=Math.max(b,te>=t?Math.exp(-(te-t)*9):0);return b;};
  const pulseAt=te=>te<TP?0:Math.pow(0.5+0.5*Math.cos((te-TP)/PER*6.2832),6);
  // franjas rojas en las orejas
  const ears=EARS.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.75),S.mat(`void main(){vec2 p=(vUv-.5)*2.;vec4 s=styShape(1.,vUv);
   float m=s.r;if(m<.02)discard;gl_FragColor=vec4(styRampOf(vec3(1.,.22,.12),.55+.45*s.g)*1.7,m*uA);}`,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  // chorro de magma (tubo con costra que flota sobre roca fundida)
  const flow=new THREE.Mesh(taperTube(new THREE.QuadraticBezierCurve3(EM,M1,M2),70,8,0.14,0.2),S.mat(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float d=uP-u;
   float n=styNoise(vec2(u*5.-uT*1.4,vUv.y*.8)).r*.6+styNoise(vec2(u*11.-uT*2.,vUv.y*1.6)).g*.4;
   float crust=smoothstep(.5,.62,n);float head=exp(-d*14.);
   vec3 hot=styRampOf(vec3(1.,.42,.1),.75+.25*head)*1.6;vec3 cr=styRampOf(${BASALT},.35);
   gl_FragColor=vec4(mix(hot,cr,crust*(1.-head)),smoothstep(uQ,uQ+.08,u));}`,{uQ:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  L.trail.add(flow);
  // caparazón: placas oliva (materia sólida) con juntas de magma (energía)
  const plateMat=S.mat(VOR3+`uniform float uQ;uniform float uCool;
  void main(){vec3 n0=normalize(vP);float edge=1.-uP*2.2+styNoise(n0.xz*.6+.5).r*.25;if(n0.y<edge)discard;
   vec2 v=vor3(n0*3.);float crack=v.y-v.x;if(crack<.06+.05*uCool)discard;
   float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;if(styErode(nz*.7+(1.-n0.y)*.3,uQ,.08)<.5)discard;
   vec3 nn=normalize(vN);float l=styLight(nn,stySunV());
   vec3 base=mix(${OLIVE},${BASALT},.35+.4*styNoise(n0.xz*1.3).g);
   float stripe=smoothstep(.06,.0,abs(n0.y-.35-.08*sin(atan(n0.z,n0.x)*3.)));
   base=mix(base,vec3(.6,.12,.08),stripe*.6);
   vec3 c=styRampOf(base,clamp(.22+.55*l+smoothstep(.25,.12,crack)*-.12,0.,1.))*styTint(l);
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1},uCool:{value:0}},{mode:'solid'});
  const magMat=S.mat(VOR3+`uniform float uCool;uniform float uHot;
  void main(){vec3 n0=normalize(vP);float edge=1.-uP*2.2+styNoise(n0.xz*.6+.5).r*.25;if(n0.y<edge)discard;
   vec2 v=vor3(n0*3.);float crack=v.y-v.x;float g=smoothstep(.13,0.,crack);float drip=smoothstep(.06,0.,abs(n0.y-edge));
   float hot=(1.-uCool*.85)*uHot;if(g*hot+drip<.02)discard;
   gl_FragColor=vec4(styRampOf(vec3(1.,.4,.1),.6+.4*g)*1.7*hot+vec3(1.,.5,.15)*drip,min(g*hot+drip,1.)*uA);}`,{uCool:{value:0},uHot:{value:1}},{mode:'energy',side:THREE.FrontSide});
  const plates=new THREE.Mesh(new THREE.SphereGeometry(R,48,28,0,Math.PI*2,0,Math.PI/2),plateMat);
  const mag=new THREE.Mesh(new THREE.SphereGeometry(R*0.99,48,28,0,Math.PI*2,0,Math.PI/2),magMat);
  plates.position.set(TX,0,0); mag.position.set(TX,0,0); L.mesh.add(mag,plates);
  const scorch=groundPlane(2.6,TX,0.018,S.mat(STAIN('vec3(.18,.1,.06)',.5,.08),{},{mode:'matter'})); L.decal.add(scorch);
  const glowG=groundPlane(2.6,TX,0.024,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styShape(7.,vUv);
   float m=smoothstep(1.,.4,r)*(.4+.6*s.g);if(m<.02)discard;gl_FragColor=vec4(styRampOf(vec3(1.,.4,.12),.7)*1.2,m*uA*.6);}`,{},{mode:'energy'})); L.decal.add(glowG);
  const ring=S.groundRing(L.decal,3.1), spark=S.hitSpark(L.mesh,1.5,{seed:0.42});
  const K=`const float TM=${f(TM)};const float TI=${f(TI)};const float TP=${f(TP)};const float TXd=${f(TXd)};const float PER=${f(PER)};const float TX=${f(TX)};const float R=${f(R)};
  const vec3 EM=${v3(EM)};const vec3 M1=${v3(M1)};const vec3 M2=${v3(M2)};`+QB;
  // gotas de magma que se desprenden del chorro
  P(L.part,26,K+`void main(){float k=aSeed.x;float s=TM+k*(TI-TM);float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(EM,M1,M2,k)+rnd()*.1+vec3(rnd().x*.5*t,.3*t-4.*t*t,rnd().z*.5*t);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.17+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(1.,.45,.12)',bias:.15}));
  // salpicadura de magma al caer
  P(L.part,18,K+`void main(){float s=TI;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.2*aSeed.w),2.+1.5*aSeed.y,sin(an)*(1.+1.2*aSeed.w));
   vec3 p=vec3(TX,R*1.15,0.)+v*t+vec3(0.,-8.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;
   put(p,.18+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(1.,.4,.1)',bias:.12}));
  // lenguas de fuego en cada latido de calor
  P(L.part,30,K+`void main(){float k=(uT-TP+.06)/PER;float c=floor(k);float age=fract(k)*PER/(.34+aSeed.y*.12);vec3 r=rr(c+aSeed.x*40.);
   float an=r.y*6.2832;float el=.2+.9*r.x;vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=vec3(TX,0.,0.)+d*vec3(R,R*1.15,R)+d*age*.4+vec3(0.,age*.35,0.);
   vA=(k>=0.&&age<1.&&uT<TXd+.1)?1.:0.;vK=smoothstep(.2,1.,age);vR=(r.z-.5)*.5;put(p,(.42+.2*r.z)*(1.-age*.3));}`,S.ENERGY_FS(C.flame,{gain:1.4}),{mode:'energy'});
  // ceniza al enfriarse
  P(L.part,20,K+`void main(){float s=TXd+aSeed.x*.3;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float el=aSeed.w*1.3;vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   vec3 p=vec3(TX,0.,0.)+d*vec3(R,R*1.15,R)+vec3(d.x*.3*t,.5*t,d.z*.3*t);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.y*6.28;put(p,(.36+.16*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:ASH}));
  const pu_=plateMat.uniforms, mu=magMat.uniforms, fu=flow.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, b=beat(te), pu=pulseAt(te), q=ss(TXd,TE,te);
    caster.rotation.z=0.05*b; glowOf(caster,tmp3.set(1,0.25,0.12),0.5*b);
    ears.forEach((m,i)=>{const on=b*(te<TM+0.1?1:0);m.visible=on>0.02;towardCam(m.position,EARS[i],0.2);billboard(m,0);m.scale.setScalar(0.7+0.5*(1-b));m.material.uniforms.uA.value=on;});
    flow.visible=te>TM&&te<TI+0.35; fu.uP.value=cl((te-TM)/(TI-TM))*1.02; fu.uQ.value=ss(TI-0.08,TI+0.3,te)*1.02; fu.uA.value=1;
    // caparazón: se vierte desde arriba, late y se enfría
    const dp=cl((te-TI+0.06)/0.32); plates.visible=mag.visible=te>TI-0.06&&q<0.999;
    const sc=1+0.035*pu; plates.scale.set(sc,sc*1.18,sc); mag.scale.copy(plates.scale);
    pu_.uP.value=dp; pu_.uQ.value=q>0?-0.1+1.15*q:-1; pu_.uCool.value=ss(TXd-0.25,TE,te);
    mu.uP.value=dp; mu.uA.value=1-q; mu.uCool.value=ss(TXd-0.25,TE,te); mu.uHot.value=0.55+0.45*pu+0.6*hitE(ia,5);
    set(scorch,ia>=0?-0.1+1.15*ss(TXd,TE+0.05,te):0,ss(TI,TI+0.2,te));
    set(glowG,1,ss(TI,TI+0.15,te)*(0.45+0.55*pu)*(1-ss(TXd,TE,te)));
    ring.pose(ia,TX,0,0.45,1.05);
    spark.pose(ia,tmp.set(TX,R*1.2+0.15,0),1);
    const h=hitE(ia,8); target.scale.set(1+0.04*h,1-0.06*h,1+0.04*h);
    o.em=0.3*h+0.2*pu*(1-q); o.emc.copy(U.uC1.value);
    if(te<TM){o.g.copy(EM);o.gs=0.5+0.6*b;o.ga=0.1+0.2*b;o.li=1+2*b;}
    else if(ia<0){qb(EM,M1,M2,cl((te-TM)/(TI-TM)),o.g);o.gs=0.8;o.ga=0.2;o.li=2;}
    else{o.g.set(TX,1.0,0);o.gs=1.6+0.4*pu;o.ga=(0.08+0.12*pu)*(1-q)+0.25*hitE(ia,7);o.li=(1+2*pu)*(1-q)+3*hitE(ia,5);}
    o.ia=ia; o.c.set(TX,1.1,0); o.shake=0; o.dist=0.45; o.flash=0;
  };
}});

// =====================================================================
// 6 · TRI SPIKES — tres púas de hueso se forman en tridente sobre la espalda (polvo violeta que se condensa), salen en
//     abanico, viran como si buscaran presa y se clavan una tras otra en el pecho del rival atravesándolo (esquirlas de
//     hueso hacia atrás, chispas y trozos de escudo por detrás: perfora el 20 % del escudo). ti 0,62 s · 0,69 · 0,76
// =====================================================================
defs.push(Object.assign({key:"sty_reTriSpikes",name:"Tri Spikes (estilizado)",dur:1.8,ti:0.62,pal:P_TRI,tier:2,stylized:true,
  phases:[["Tridente",0],["Disparo",0.2],["Viraje",0.4],["Impactos",0.62],["Fin",1.2]],
build(a){
  const L=a.L,TL=0.2,ARR=[0.69,0.62,0.76];
  const SP=[-1,0,1].map((i,k)=>{const ai=Math.abs(i);
    return {i,t1:ARR[k],P0:V3(-3.6+0.12*(1-ai),1.75+0.18*(1-ai),0.34*i),P1:V3(-1.6,2.9+0.15*ai,1.8*i),P2:V3(1.0,2.0+0.35*ai,1.9*i),P3:V3(TC.x,TC.y+0.16*i+0.06*(1-ai),0.12*i)};});
  // púa de hueso: marfil con anillos de crecimiento, punta violeta
  const spMat=smat(`float h=clamp(vP.y/1.0,0.,1.);float rings=smoothstep(.5,.9,sin(h*44.));
   base=mix(${BONE},${SCALEV}*1.3,smoothstep(.55,.92,h));lb=-.1*rings+.04;emi=uC1*smoothstep(.85,1.,h)*.5;`,{rim:.3});
  const spGeo=new THREE.ConeGeometry(0.1,1.0,10,3).translate(0,0.5,0);
  const sheath=S.mat(`void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/1.3+.3;
   vec4 s=styNoise(vec2(vUv.x*2.,vUv.y-uT*2.));float m=smoothstep(.45,.9,fr)*smoothstep(0.,.5,h)*(.6+.4*s.r);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.6+.3*fr)*1.3,m*uA);}`,{},{mode:'energy',side:THREE.FrontSide});
  const shGeo=new THREE.ConeGeometry(0.2,1.3,12,1,true).translate(0,0.45,0);
  SP.forEach(s=>{s.g=new THREE.Group();s.g.add(new THREE.Mesh(spGeo,spMat),new THREE.Mesh(shGeo,sheath));L.mesh.add(s.g);
    s.spark=S.hitSpark(L.mesh,1.05,{seed:0.2+0.3*(s.i+1)});
    s.exit=new THREE.Mesh(spGeo,spMat);L.mesh.add(s.exit);});
  const mark=groundPlane(2.6,TX,0.024,S.mat(GLYPH(`float tri=smoothstep(.7,.95,abs(cos(an*1.5)))*smoothstep(.9,.25,r)*step(.25,r);m=max(m*.5,tri*.85);`),{},{mode:'energy'})); L.decal.add(mark);
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TL=${f(TL)};const float TX=${f(TX)};`+CBZ+`void sp(float i,out vec3 a,out vec3 b,out vec3 c,out vec3 d,out float t1){`+
    SP.map((s,k)=>`${k<2?`if(i<${k}.5)`:``}{a=${v3(s.P0)};b=${v3(s.P1)};c=${v3(s.P2)};d=${v3(s.P3)};t1=${f(s.t1)};return;}`).join("")+`}`;
  // carga: polvo violeta que se condensa en cada púa
  P(L.part,24,K+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float s=aSeed.y*(TL-.08);float life=.16;float age=(uT-s)/life;vec3 p=A+normalize(rnd()+.001)*mix(.8,.05,clamp(age,0.,1.));
   vA=(age>0.&&age<1.)?age:0.;vK=0.;vR=aSeed.w*6.28;put(p,.2+.1*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // estela de cada púa (trazos de viento violeta)
  P(L.part,54,K+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float lag=aSeed.y*.2;float k=(uT-TL)/(t1-TL)-lag;vec3 p=cbz(A,B,Cc,D,clamp(k,0.,1.))+rnd()*.04*(1.+lag*8.);
   vA=(k>0.&&k<1.)?1.:0.;vK=lag/.2*.85;vR=aSeed.z*6.28;put(p,(.3+.1*aSeed.z)*(1.-lag*2.5));}`,S.ENERGY_FS(C.slash,{gain:1.1}),{mode:'energy'});
  // impactos: esquirlas de hueso que rebotan hacia atrás
  P(L.part,30,K+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float life=.42+aSeed.y*.25;float age=(uT-t1)/life;float t=max(uT-t1,0.);
   vec3 v=normalize(rnd()+vec3(-.9,.5,0.))*(1.8+2.*aSeed.z);vec3 p=D+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.28+t*10.;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BONE}));
  // perforación: trozos de escudo azules y chispas por detrás del rival
  P(L.part,24,K+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float life=.38+aSeed.y*.2;float age=(uT-t1)/life;float t=max(uT-t1,0.);
   vec3 v=normalize(rnd()*.6+vec3(1.,.25,0.))*(2.4+2.*aSeed.z);vec3 p=vec3(TX+.45,D.y,D.z)+v*t+vec3(0.,-4.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.55,.78,1.)',bias:.1}));
  P(L.part,24,K+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float life=.22+aSeed.y*.12;float age=(uT-t1)/life;float t=max(uT-t1,0.);
   vec3 v=normalize(rnd()*.5+vec3(1.,.15,0.))*(4.+3.*aSeed.z);vec3 p=vec3(TX+.4,D.y,D.z)+v*t;
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=atan(v.y,v.x)-1.5708;put(p,.3+.1*aSeed.w);}`,S.ENERGY_FS(C.slash,{gain:1.3}),{mode:'energy'});
  const Pp=V3(0,0,0), D=V3(0,0,0), X=V3(1,0.25,0).normalize();
  a.pose=function(te,o){
    const ia=te-0.62; let hit=0;
    caster.rotation.z=0.1*ss(0,TL,te)-0.16*ss(TL,TL+0.08,te)+0.06*ss(TL+0.08,0.6,te);
    glowOf(caster,U.uC1.value,0.4*ss(0,0.12,te)*(1-ss(TL,0.45,te)));
    SP.forEach(s=>{const k=(te-TL)/(s.t1-TL);
      if(te<TL){const g=back(te/(TL-0.02));s.g.visible=g>0.01;s.g.position.copy(s.P0);s.g.scale.setScalar(Math.max(g*1.45,0.001));s.g.quaternion.setFromUnitVectors(YA,tmp.set(0.3+0.3*s.i,1,0.3*s.i).normalize());}
      else if(k<1){s.g.visible=true;s.g.scale.setScalar(1.45);cb(s.P0,s.P1,s.P2,s.P3,k,Pp);cbd(s.P0,s.P1,s.P2,s.P3,k,D);
        s.g.position.copy(Pp).addScaledVector(D.normalize(),-1.25);s.g.quaternion.setFromUnitVectors(YA,D);}
      else s.g.visible=false;
      // la púa sale por detrás del rival y se consume
      const ih=te-s.t1; s.exit.visible=ih>=0&&ih<0.22;
      if(s.exit.visible){cbd(s.P0,s.P1,s.P2,s.P3,1,D);D.normalize();s.exit.position.set(TX+0.3+ih*5,s.P3.y+D.y*ih*2,s.P3.z);
        s.exit.quaternion.setFromUnitVectors(YA,tmp.set(1,D.y*0.5,0).normalize());s.exit.scale.setScalar(Math.max(1.3*(1-ih/0.22),0.001));}
      s.spark.pose(ih,s.P3,0.9);
      if(ih>=0)hit+=Math.exp(-ih*9);});
    eu(spMat,te>1.25?-0.1+1.1*ss(1.25,1.5,te):-1,0);
    sheath.uniforms.uA.value=0.7*ss(0,TL,te);
    target.position.x=TX+0.12*cl(hit); target.rotation.z=-0.12*cl(hit)*Math.cos((te-0.62)*22);
    set(mark,ia>=0?-0.1+1.1*ss(1.1,1.75,te):0,ia>=0?1:0);
    ring.pose(te-0.76,TX,0,0.42,0.95);
    if(te<TL){o.g.set(-3.5,1.8,0);o.gs=0.8*ss(0,TL,te);o.ga=0.2;o.li=1.6;}
    else if(ia<0){cb(SP[1].P0,SP[1].P1,SP[1].P2,SP[1].P3,cl((te-TL)/(0.62-TL)),o.g);o.gs=0.8;o.ga=0.2;o.li=1.8;}
    else{o.g.copy(TC);o.gs=1.3+1.2*cl(hit);o.ga=0.3*cl(hit);o.li=4*cl(hit);}
    o.ia=ia; o.c.copy(TC); o.shake=0.3; o.dist=0.7; o.flash=0.8;
  };
}},ZONES));

VFX.module("Estilizado · Reptil · Espalda",defs);
})();

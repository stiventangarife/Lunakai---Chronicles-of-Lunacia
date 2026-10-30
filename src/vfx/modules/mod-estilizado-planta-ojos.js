// =====================================================================
// ESTILIZADO · PLANTA · OJOS (Hito 101) — las 5 cartas de ojos de Planta hechas a mano con el kit vfx-stylized.js.
// Claves sty_<clave original> (pjRiskyTrunk, pjBlossom, pjConfusion, pjCucumberSlice, pjPapi): mismos dur, ti y fases.
// Motivo común: un destello estelar nace en los ojos del lanzador y desata el efecto. Materia con luz del sol en 3 tonos
// (madera, flores, pepino, esporas, corazones), energía solo en núcleos y destellos.
// Las cartas «sobre sí mismo» que curan a todo el equipo (Risky Trunk, Cucumber Slice) y Blossom (+2 PA) se centran en
// el lanzador: en el juego no hay aliados fijos alrededor, así que la onda de cura se abre desde él.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,helixGeo}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Savia",["#b9ec5c","#2c7a35"]);
VFX.palette("Sty Primavera",["#ff9cc8","#3f9a4c"]);
VFX.palette("Sty Psicodelia",["#ff7ade","#5432d2"]);
VFX.palette("Sty Rocío",["#8cefcc","#1d8a6a"]);
VFX.palette("Sty Cariño",["#ff96b4","#e0583a"]);
const TAU=Math.PI*2, UP=V3(0,1,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const jh=n=>{const s=Math.sin(n*12.9898+78.233)*43758.5453;return s-Math.floor(s);};
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.6,.48,.34)";
const DUST_FS=S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05});
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.25});
const LEAF_FS=S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.38,.7,.26)',bias:.05});
const CHIP_FS=S.MATTER_FS(C.shard,{relief:3,col:'vec3(.44,.28,.15)'});
// estallido desde O (dirección sesgada D) y polvo en anillo a ras de suelo (como en los módulos del Sapidae)
const burstVS=(O,D,v0,v1,g,life,sz,t0,spread=.06,spin=9)=>VV+`const vec3 O=${v3(O)};
void main(){float s=${f(t0)}+aSeed.x*${f(spread)};float life=${f(life)}+aSeed.y*${f(life*.4)};float age=(uT-s)/life;float t=max(uT-s,0.);
 vec3 v=normalize(rnd()+vec3(${D}))*(${f(v0)}+${f(v1-v0)}*aSeed.z);vec3 p=O+v*t+vec3(0.,-${f(g)}*t*t,0.);
 vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*${f(spin)}*(aSeed.w-.5);
 put(p,${sz});}`;
const dustRingVS=(O,r0,r1,t0,life,sz)=>VV+`const vec3 O=${v3(O)};
void main(){float s=${f(t0)}+aSeed.x*.06;float life=${f(life)}+aSeed.y*${f(life*.35)};float age=(uT-s)/life;float t=max(uT-s,0.);
 float an=aSeed.z*6.2832;vec3 p=O+vec3(cos(an),0.,sin(an))*(${f(r0)}+${f(r1-r0)}*(1.-exp(-t*4.)))+vec3(0.,.12+t*.35*aSeed.w,0.);
 vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;
 put(p,(${sz})*(.7+.5*age));}`;

// ---------- destello de los ojos ----------
function localW(l,out,d=caster){const r=d.rotation.z,c=Math.cos(r),s=Math.sin(r),x=l.x*d.scale.x,y=l.y*d.scale.y;
  return out.set(d.position.x+x*c-y*s,d.position.y+x*s+y*c,d.position.z+l.z*d.scale.z);}
const EYE_L=[V3(0.23,1.66,-0.1),V3(0.23,1.66,0.1)];
const GLINT_FS=`void main(){vec2 p=(vUv-.5)*2.;float c=cos(uP),s=sin(uP);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);vec2 q=abs(p);
 float st=smoothstep(.09,0.,q.x*q.y*5.+min(q.x,q.y)*.9)*smoothstep(1.,.1,max(q.x,q.y));
 float core=smoothstep(.3,.12,length(p));float m=max(st,core);if(m<.01)discard;
 gl_FragColor=vec4(styRamp(.55+.45*m)*1.4+vec3(1.,.95,.85)*core*.4,m*uA);}`;
function mkGlint(L,size=0.5){
  const ms=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),S.mat(GLINT_FS,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  return (al,ang)=>ms.forEach((m,i)=>{localW(EYE_L[i],tmp);towardCam(m.position,tmp,0.15);billboard(m);m.visible=al>0.002;set(m,ang+i*0.4,al);});
}
const glintEnv=(te,t0,w)=>Math.exp(-Math.pow((te-t0)/w,2));
// cura: anillo amplio que barre el suelo desde el lanzador (la cura llega a todo el equipo)
const WAVE_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g)*1.1,s.r*er*uA*.75);}`;
// mancha de musgo/pradera que crece en el suelo (materia); uP = radio, uA = alfa
const MOSS_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+.21).r*.6+styNoise(vUv*2.3).g*.4;
 float m=smoothstep(uP*(.82+.3*n),uP*(.82+.3*n)-.12,r);if(m<.01)discard;
 float tuft=smoothstep(.55,.75,styNoise(vUv*3.1+.4).g);
 vec3 c=styRampOf(vec3(.3,.58,.2),.3+.45*n+.25*tuft);
 gl_FragColor=vec4(c,m*(.55+.25*tuft)*uA);}`;
// mancha oscura (tierra removida / chamuscado) con borde orgánico; uP = erosión
const SCAR_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;
 float m=smoothstep(.8,.7,r+(n-.5)*.5);if(m<.01)discard;float er=styErode(n*.7+m*.3,uP,.14);
 gl_FragColor=vec4(styRampOf(vec3(.26,.17,.1),.1+.25*n),m*er*uA*.6);}`;
const defs=[];

// =====================================================================
// 1 · RISKY TRUNK (sobre sí mismo: cura 50 a todos los aliados) — un tronco nudoso en llamas cae del cielo frente
//     al Axie y se clava como un muro; el fuego vira a verde y se apaga, la madera exhala humo verde purificador y una
//     onda de cura barre el suelo. Al final la madera se consume en astillas. ti 0,95 s
// =====================================================================
const KN=[[0.08,0.3],[0.42,0.58],[0.7,0.22],[0.9,0.78],[0.25,0.86]];
const BARK_FS=`uniform float uQ;uniform float uFire;uniform float uEr;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float cap=step(2.296,vP.y);
 vec2 tc=vec2(atan(vP.z,vP.x)/6.2832*2.,vP.y*.22);
 float g=styNoise(tc).b;float groove=smoothstep(.12,.0,abs(fract(g*5.)-.5)-.2);
 vec3 bark=styRampOf(vec3(.45,.29,.16),.18+.55*l-groove*.18)*styTint(l);
 float rr=length(vP.xz);vec3 wood=styRampOf(vec3(.8,.6,.36),.35+.45*l+.12*sin(rr*70.))*styTint(l);
 vec3 c=mix(bark,wood,cap);
 float ch=styNoise(tc*1.7+.3).r;c=mix(c,c*.35,smoothstep(.45,.65,ch)*uFire);
 float cr=smoothstep(.16,.08,styNoise(tc*2.3+.6).g);c+=mix(vec3(1.,.42,.08),uC1,uQ)*cr*uFire*1.6;
 float e=styNoise(tc*1.3+.71).r;if(e<uEr)discard;
 c+=uC1*smoothstep(uEr+.07,uEr,e)*step(.001,uEr)*1.4;
 gl_FragColor=vec4(c,1.);}`;
// llama estilizada: forma del atlas; uQ vira del naranja real al verde de la paleta
const FLAME_FS=S.PV+`uniform float uQ;
void main(){vec2 uv=styPC();vec4 sh=styShape(1.,uv);float m=sh.r;if(m<.01)discard;
 float er=styErode(m*.6+sh.b*.4,vK*1.05-.05,.12);float a=er*vA;if(a<.01)discard;
 float x=clamp(.4+.45*m+sh.g*.2,0.,1.);
 vec3 fire=x<.6?mix(vec3(.78,.18,.03),vec3(1.,.48,.1),x/.6):mix(vec3(1.,.48,.1),vec3(1.,.82,.42),(x-.6)/.4);
 gl_FragColor=vec4(mix(fire,styRamp(x),uQ)*1.45,a);}`;
defs.push({key:"sty_pjRiskyTrunk",name:"Risky Trunk (estilizado)",dur:3.4,ti:0.95,pal:"Sty Savia",tier:3,stylized:true,
  phases:[["Mirada",0],["Caída",0.3],["Impacto",0.95],["Purificación",1.4],["Bloqueo",2.2],["Disipación",2.85]],
build(a){
  const L=a.L,TL=0.3,TI=0.95,TP=1.4,TS=2.85,TE=3.4,LP=V3(-1.55,0,0),H=2.3,Y0=7.5,YF=-0.15;
  const ty=te=>{if(te<TI){const k=cl((te-TL)/(TI-TL));return Y0+(YF-Y0)*k*k;}return YF-0.25*ss(TS,TE,te);};
  const tg=new THREE.CylinderGeometry(0.4,0.5,H,32,24).translate(0,H/2,0);
  const pa=tg.attributes.position;
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i);if(Math.hypot(x,z)<1e-4)continue;
    const u=(Math.atan2(x,z)/TAU+1)%1,v=y/H;
    let k=1+0.05*Math.sin(u*TAU*7+v*9)+0.035*Math.sin(u*TAU*13-v*21)+0.05*Math.sin(v*13+1);
    for(const [ku,kv] of KN){let du=u-ku;du-=Math.round(du);k+=0.2*Math.exp(-((du/0.06)**2+((v-kv)/0.06)**2));}
    pa.setXYZ(i,x*k,y,z*k);}
  tg.computeVertexNormals();
  const bark=S.mat(BARK_FS,{uQ:{value:0},uFire:{value:0},uEr:{value:-0.1}},{mode:'solid'}), bu=bark.uniforms;
  const trunk=new THREE.Group(); trunk.scale.setScalar(1.15); L.mesh.add(trunk); trunk.add(new THREE.Mesh(tg,bark));
  const sGeo=new THREE.CylinderGeometry(0.09,0.13,0.36,10).translate(0,0.18,0);
  for(const [su,sv] of [[0.3,0.45],[0.6,0.72],[0.97,0.52],[0.14,0.66]]){
    const th=su*TAU,r=(0.5-0.1*sv)*0.95,s=new THREE.Mesh(sGeo,bark);
    s.position.set(Math.sin(th)*r,sv*H,Math.cos(th)*r); s.quaternion.setFromUnitVectors(UP,V3(Math.sin(th),0.55,Math.cos(th)).normalize()); trunk.add(s);}
  const glint=mkGlint(L,0.55);
  const shadow=S.contactShadow(L.decal,2.4), spark=S.hitSpark(L.mesh,2.2,{seed:0.44,life:0.22}), ring=S.groundRing(L.decal,4.2);
  const scar=groundPlane(3.6,LP.x,0.022,S.mat(SCAR_FS,{},{mode:'matter'})); L.decal.add(scar);
  const moss=groundPlane(4.6,LP.x,0.018,S.mat(MOSS_FS,{},{mode:'matter'})); L.decal.add(moss);
  const wave=groundPlane(9,LP.x,0.03,S.mat(WAVE_FS,{},{mode:'energy'})); L.decal.add(wave);
  const QF={value:0};
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 LP=${v3(LP)};
  float ty(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return ${f(Y0)}+${f(YF-Y0)}*k*k;}`;
  // llamas del tronco: en la caída quedan atrás como estela; tras el impacto viran a verde y se apagan
  a.count+=S.pts(L.part,46,VV+K+`void main(){float life=.32+aSeed.y*.2;float k=(uT-TL)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float s=uT-age*life;float an=r.x*6.2832;
   vec3 p=vec3(LP.x+cos(an)*.55,max(ty(s),${f(YF)})+.1+r.y*${f(H*1.1)},sin(an)*.55)+vec3(0.,age*(.6+.5*r.z),0.);
   float on=(uT>TL&&uT<TP+.9)?1.-smoothstep(TP+.2,TP+.9,uT):0.;
   vA=on*smoothstep(0.,.12,age);vK=smoothstep(.25,1.,age);vR=(r.z-.5)*.5;put(p,(.55+.3*r.z)*(1.-age*.35));}`,FLAME_FS,{mode:'energy',uniforms:{uQ:QF}});
  // impacto: astillas de corteza, polvo en anillo, brasas
  a.count+=S.pts(L.part,16,burstVS(V3(LP.x,0.3,0),"0.,.7,0.",2.4,5.,9.,.7,'.14+.1*aSeed.w',TI),CHIP_FS);
  a.count+=S.pts(L.part,16,dustRingVS(V3(LP.x,0,0),0.5,2.2,TI,0.9,'.5+.25*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,14,burstVS(V3(LP.x,0.8,0),"0.,.5,0.",1.6,3.6,3.,.55,'.12+.06*aSeed.w',TI,0.05),FLAME_FS,{mode:'energy',uniforms:{uQ:QF}});
  // purificación: volutas de humo verde que suben girando y hojas frescas
  a.count+=S.pts(L.part,26,VV+K+`void main(){float life=1.3+aSeed.y*.6;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sw=age*(2.2+r.y*1.5)+r.x*6.2832;float rad=.55+.55*age+.15*r.y;
   vec3 p=vec3(LP.x,${f(YF)}+.4+r.z*1.9,0.)+vec3(cos(sw)*rad,age*(1.4+r.z*.7),sin(sw)*rad*.8);
   vA=(k>=1.)?uE*smoothstep(0.,.12,age):0.;vK=smoothstep(.35,1.,age);vR=r.y*6.28+age;put(p,(.4+.5*age)*(.7+.5*r.z));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'mix(vec3(.5,.82,.5),uC1,.35)',bias:.05}));
  a.count+=S.pts(L.part,14,VV+K+`void main(){float life=1.6+aSeed.y*.6;float k=(uT-TP-.2)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rad=.55+.5*age;
   vec3 p=vec3(LP.x+cos(an)*rad,${f(H-0.1)}+age*(1.1+r.z)-.8*r.y,sin(an)*rad);
   vA=(k>=1.)?uE:0.;vK=smoothstep(.7,1.,age);vR=an+age*4.;put(p,.26+.1*r.z);}`,LEAF_FS);
  a.count+=S.pts(L.part,14,VV+K+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;vec3 p=vec3(LP.x+cos(an)*.7,.1+age*(2.4+r.z),sin(an)*.7);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=r.y*6.28;put(p,.1+.06*r.z);}`,MOTE_FS,{mode:'energy'});
  // disipación: la madera se consume en astillas que suben
  a.count+=S.pts(L.part,18,VV+K+`void main(){float s=${f(TS)}+aSeed.x*.45;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(LP.x+(aSeed.z-.5)*.9,.2+aSeed.w*2.4+t*.9,(aSeed.y-.5)*.9);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.y*6.28+t*4.;put(p,.16+.08*aSeed.w);}`,CHIP_FS);
  a.pose=function(te,o){
    const ia=te-TI,k=cl((te-TL)/(TI-TL)),y=ty(te),pur=ss(TP-0.1,TP+0.6,te),env=ss(TP,TP+0.3,te)*(1-ss(TS-0.2,TE,te));
    trunk.visible=te>=TL; trunk.position.set(LP.x,y,0);
    const wob=ia>=0?0.06*Math.exp(-ia*4)*Math.sin(ia*22):0;
    trunk.rotation.set(te<TI?0.25*(1-k):0,te<TI?2.4*(1-k):0,te<TI?0.5*(1-k)*(1-k):wob);
    QF.value=pur; bu.uQ.value=pur; bu.uFire.value=te<TI?ss(TL,TI,te):1-ss(TP+0.2,TS,te)*0.7;
    bu.uEr.value=te<TS?-0.1:-0.1+1.15*ss(TS,TE-0.05,te);
    glint(glintEnv(te,0.16,0.09)*1.2,te*2);
    shadow.pose(LP.x,0,1.2+0.8*k,te>=TL&&te<TS?(ia<0?0.2+0.8*k:1):0);
    spark.pose(ia,tmp.set(LP.x,0.45,0),1.25); ring.pose(ia,LP.x,0,0.55,1.1);
    scar.visible=ia>=0; scar.scale.setScalar(0.6+0.4*(1-Math.pow(1-cl(ia/0.2),3))); set(scar,-0.1+1.15*ss(TP,TS,te),ia>=0?1:0);
    set(moss,ss(TP,TP+1.1,te),env);
    const wp=cl((te-TP)/0.8); wave.visible=wp>0&&wp<1; wave.scale.setScalar(0.2+0.9*(1-Math.pow(1-wp,2))); set(wave,0.05+0.9*wp,1-wp*wp);
    U.uE.value=env;
    caster.rotation.z=0.14*ss(0,0.25,te)*(1-ss(0.55,0.95,te))-(ia>=0?0.06*Math.exp(-ia*6):0);
    o.em=0.3*env; o.emc.copy(U.uC1.value);
    if(te<TL){localW(EYE_L[1],o.g);const g=glintEnv(te,0.16,0.09);o.gs=0.8;o.ga=0.3*g;o.li=1.5*g;}
    else if(te<TI){o.g.set(LP.x,y+H*0.7,0);o.gs=1.4;o.ga=0.3;o.li=3;}
    else{o.g.set(LP.x,0.5+1.4*pur,0);o.gs=1.6+2.4*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.45+0.1*env;o.li=6*Math.exp(-ia*3.5)+1.5*env;}
    o.ia=ia;o.c.set(LP.x,0.5,0);o.shake=1.8;o.dist=1.2;o.flash=0.12;
  };
}});

// =====================================================================
// 2 · BLOSSOM (sobre sí mismo: +2 PA) — destello en los ojos; un corro de flores primaverales brota en cascada
//     alrededor del Axie y abre los pétalos, sale una ráfaga de pétalos y dos chispas doradas (los PA) suben en espiral
//     hasta él. ti 0,36 s
// =====================================================================
const FLOWER_VS=`uniform float uP;uniform float uT;uniform float uK;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
void main(){vUv=uv;vec2 q=position.xy;float r=length(q);vec2 d=r>1e-4?q/r:vec2(1.,0.);
 float th=mix(.12,1.15,uP)+.25*r*uP+.05*sin(uT*2.+uK*6.)*uP;
 vec3 p=vec3(d.x*sin(th)*r,cos(th)*r*.9,d.y*sin(th)*r);
 vec3 n=normalize(vec3(-d.x*cos(th),sin(th),-d.y*cos(th)));
 vP=vec3(q,r);vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*n);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const FLOWER_FS=`uniform vec3 uCol;uniform float uK;uniform float uH;
void main(){vec2 q=vP.xy;float r=vP.z;float an=atan(q.y,q.x)+uK*6.2832;float N=5.+step(.5,fract(uK*7.3));
 float pe=abs(cos(an*N*.5));float R=.38+.62*pow(pe,.55);if(r>R)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float cen=smoothstep(.24,.17,r);
 vec3 c=styRampOf(uCol,.3+.5*l+.15*smoothstep(.2,.9,r))*styTint(l);
 c=mix(c,styRampOf(vec3(1.,.74,.2),.45+.45*l),cen);
 c=mix(c,c*.72,smoothstep(.6,1.,pe)*0.+smoothstep(.04,0.,abs(fract(an*N/6.2832+.5)-.5))*.35*smoothstep(.2,.8,r));
 c+=uC1*uH*.35*smoothstep(R-.18,R,r);
 gl_FragColor=vec4(c,1.);}`;
// pétalo pastel que gira: forma de hoja del atlas con color por partícula (vMix)
const PETAL_FS=S.PV+`vec3 pastel(float k){return k<.25?vec3(1.,.55,.76):k<.5?vec3(1.,.86,.9):k<.75?vec3(1.,.82,.36):vec3(.74,.58,.98);}
void main(){vec2 uv=styPC();vec4 sh=styShape(2.,uv);float m=sh.r;if(m<.02)discard;
 float er=styErode(m*.55+sh.b*.45,vK*1.05-.08,.1);float a=er*smoothstep(0.,.06,m)*vA;if(a<.01)discard;
 float l=styLight(styShapeN(2.,uv,3.),stySunV());
 gl_FragColor=vec4(styRampOf(pastel(fract(vMix*3.7)),.35+.5*l)*styTint(l),a);}`;
defs.push({key:"sty_pjBlossom",name:"Blossom (estilizado)",dur:1.5,ti:0.36,pal:"Sty Primavera",tier:1,stylized:true,
  phases:[["Mirada",0],["Raíces",0.08],["Floración",0.36],["Rocío curativo",0.55],["Disipación",1.2]],
build(a){
  const L=a.L,TR=0.08,TI=0.36,TD=1.2,TE=1.5,CP=V3(-3.7,0,0);
  const PAST=[[1,0.55,0.76],[1,0.88,0.92],[1,0.82,0.36],[0.74,0.58,0.98],[1,0.66,0.82]];
  const HU={value:0};
  const fGeo=new THREE.RingGeometry(0.02,1,36,5), stGeo=new THREE.CylinderGeometry(0.018,0.026,1,5).translate(0,0.5,0);
  const stemMat=S.mat(`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());gl_FragColor=vec4(styRampOf(vec3(.3,.62,.22),.3+.5*l)*styTint(l),1.);}`,{},{mode:'solid'});
  const flowers=[];
  for(let j=0;j<9;j++){const inner=j<4,s=j*7+3;
    const an=(inner?j/4:(j-4)/5)*TAU+(inner?0.4:0)+jh(s+1)*0.4, r=(inner?0.7:1.08)+jh(s+2)*0.14;
    const h=0.14+jh(s+3)*0.28, sz=(inner?0.32:0.29)+jh(s+4)*0.1, col=PAST[j%PAST.length];
    const g=new THREE.Group(); g.position.set(CP.x+Math.cos(an)*r,0,CP.z+Math.sin(an)*r);
    const stem=new THREE.Mesh(stGeo,stemMat); stem.scale.set(1,h,1);
    const bloom=new THREE.Mesh(fGeo,S.mat(FLOWER_FS,{uCol:{value:new THREE.Color().setRGB(col[0],col[1],col[2])},uK:{value:jh(s+5)},uH:HU},
      {mode:'solid',side:THREE.DoubleSide,vertexShader:FLOWER_VS}));
    bloom.position.y=h; bloom.scale.setScalar(sz); bloom.rotation.set((jh(s+6)-0.5)*0.4,0,(jh(s+7)-0.5)*0.4);
    g.add(stem,bloom); L.mesh.add(g); flowers.push({g,bloom,d:(inner?0:0.05)+jh(s+8)*0.05});}
  const glint=mkGlint(L,0.36);
  const meadow=groundPlane(2.8,CP.x,0.016,S.mat(MOSS_FS,{},{mode:'matter'})); L.decal.add(meadow);
  const ring=S.groundRing(L.decal,3.0);
  const K=`const vec3 CP=${v3(CP)};const float TI=${f(TI)};const float TR=${f(TR)};`;
  // raíces de luz: motas que corren en círculo por el suelo antes de brotar
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.22;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+(uT-TR)*6.;vec3 p=CP+vec3(cos(an)*.85,.06+age*.3,sin(an)*.85);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.12+.05*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // ráfaga de pétalos que planean
  a.count+=S.pts(L.part,40,VV+K+`void main(){float s=TI+aSeed.x*.12;float life=.65+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rad=.55+.45*aSeed.w;
   vec3 p=CP+vec3(cos(an)*rad,.12,sin(an)*rad)+vec3(cos(an)*.55,1.75,sin(an)*.55)*(1.-exp(-t*3.5))+vec3(sin(t*4.+aSeed.y*9.)*.12,-.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*(3.+aSeed.w*3.);put(p,.36+.12*aSeed.y);vMix=aSeed.z;}`,PETAL_FS);
  // los dos PA: chispas doradas que suben en espiral alrededor del Axie y entran en su pecho
  a.count+=S.pts(L.part,2,VV+K+`void main(){float s=TI+.08;float t=clamp((uT-s)/.55,0.,1.);float an=aSeed.x<.5?0.:3.14159;an+=t*7.;
   float rad=.75*(1.-t*t)+.05;vec3 p=CP+vec3(cos(an)*rad,.25+1.*t,sin(an)*rad);
   vA=(uT>s&&t<1.)?1.:0.;vK=0.;vR=uT*4.;put(p,.34-.12*t);}`,S.PV+`void main(){vec2 q=gl_PointCoord-.5;vec2 aq=abs(q)*2.;
   float st=smoothstep(.12,0.,aq.x*aq.y*5.+min(aq.x,aq.y)*.9)*smoothstep(1.,.1,max(aq.x,aq.y));float core=smoothstep(.28,.1,length(q)*2.);
   float m=max(st,core);if(m*vA<.01)discard;gl_FragColor=vec4(mix(vec3(1.,.72,.2),vec3(1.,.95,.7),core)*1.6,m*vA);}`,{mode:'energy'});
  a.count+=S.pts(L.part,16,VV+K+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;float rad=.3+.7*r.y;vec3 p=CP+vec3(cos(an)*rad,.15+age*(1.2+r.z*.6),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=r.z*6.28;put(p,.08+.05*r.z);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.1,te)*(1-ss(TD,TE,te));
    for(const fl of flowers){const x=(te-(TI-0.06+fl.d))/0.15;
      const sc=(x<=0?0:1-Math.exp(-7*x)*Math.cos(9*x))*(1-ss(TD+fl.d*0.5,TE-0.05,te));
      fl.g.visible=sc>0.002; fl.g.scale.setScalar(Math.max(sc,0.001));
      fl.bloom.material.uniforms.uP.value=ss(TI-0.02+fl.d,TI+0.15+fl.d,te)*(1-0.5*ss(TD,TE,te));}
    HU.value=0.2*env+(ia>=0?0.6*Math.exp(-ia*8):0);
    glint(glintEnv(te,0.05,0.035),te*4);
    set(meadow,ss(TI-0.04,TI+0.25,te),env*0.9);
    ring.pose(ia,CP.x,0,0.45,1);
    U.uE.value=env;
    caster.position.y=te<0.15?0.04*Math.sin(Math.PI*te/0.15):(ia>0.5&&ia<0.72?0.06*Math.sin(Math.PI*(ia-0.5)/0.22):0);
    o.em=0.25*env+(ia>0.5?0.4*Math.exp(-(ia-0.6)*(ia-0.6)*60):0); o.emc.setRGB(1,0.78,0.35);
    if(te<TR){localW(EYE_L[1],o.g);const g=glintEnv(te,0.05,0.035);o.gs=0.6;o.ga=0.25*g;o.li=1.2*g;}
    else{o.g.set(CP.x,0.8,0);o.gs=1.2+1.2*Math.min(Math.max(ia,0),0.4);o.ga=ia<0?0.1:Math.exp(-ia*9)*0.35+0.06*env;o.li=ia<0?1:3.5*Math.exp(-ia*6)+1.2*env;}
    o.ia=ia;o.c.set(CP.x,0.8,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 3 · CONFUSION (54–66 de daño, −1 de alcance 2 turnos) — un chorro de esporas en espiral sale de la mirada, revienta
//     en brazos espirales sobre la cabeza del rival y lo envuelve en un remolino; estrellas de mareo orbitan su
//     cabeza, una mira rota se desdobla sobre él (pierde alcance) y una espiral hipnótica gira en el suelo. ti 0,66 s
// =====================================================================
// espora: burbuja con membrana iluminada, anillo y núcleo; tono de la rampa de la paleta por partícula (vMix)
const SPORE_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;if(d>1.)discard;
 vec3 n=vec3(q*2.,sqrt(max(1.-d*d,0.)));float l=styLight(n,stySunV());
 float rim=smoothstep(.62,.8,d)*smoothstep(1.,.92,d);float nuc=smoothstep(.32,.22,length(q*2.-vec2(.15,-.1)));
 vec3 c=styRamp(.25+.55*l+.2*fract(vMix*3.1))*styTint(l);
 c=mix(c,vec3(1.,.86,.38)*1.2,nuc*step(.6,fract(vMix*7.7)));
 float a=(rim*.35+.65+nuc*.2)*vA;if(a<.01)discard;gl_FragColor=vec4(c,min(a,1.));}`;
const STAR_FS=S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(5.,uv);float m=sh.r;if(m*vA<.01)discard;
 gl_FragColor=vec4(mix(vec3(1.,.72,.2),vec3(1.,.95,.7),sh.g)*1.5,m*vA);}`;
defs.push({key:"sty_pjConfusion",name:"Confusion (estilizado)",dur:2.3,ti:0.66,pal:"Sty Psicodelia",tier:2,stylized:true,
  phases:[["Mirada",0],["Esporas",0.2],["Espiral",0.66],["Desorientación",1.0],["Disipación",1.9]],
build(a){
  const L=a.L,TS=0.2,TI=0.66,TD=1.9,TE=2.3,TV=0.34,EM=V3(-3.45,1.66,0),TP=V3(3.4,0,0),TH=V3(3.3,1.45,0);
  const glint=mkGlint(L,0.48);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.71}), ring=S.groundRing(L.decal,2.8);
  // mira rota (energía): dos copias desalineadas que tiemblan sobre el rival
  const RET_FS=`uniform float uJ;uniform float uSh;
  float ret(vec2 p){float r=length(p);float an=atan(p.y,p.x);float brk=step(.2,abs(fract(an/6.2832*4.)-.5));
   float m=band(r,.62,.05)*brk+band(r,.32,.035);vec2 a=abs(p);
   m+=smoothstep(.04,0.,a.x)*step(.4,a.y)*step(a.y,.86)+smoothstep(.04,0.,a.y)*step(.4,a.x)*step(a.x,.86);return min(m,1.);}
  void main(){vec2 p=(vUv-.5)*2.;float c=cos(uP),s=sin(uP);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);
   vec2 o=vec2(sin(uT*23.+uSh),cos(uT*19.+uSh))*.05*uJ;float m=ret(p+o);if(m<.01)discard;
   gl_FragColor=vec4(styRamp(.6+.4*m)*1.3,m*uA);}`;
  const rets=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),S.mat(RET_FS,{uJ:{value:0},uSh:{value:i*2.1}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  // espiral hipnótica en el suelo bajo el rival (energía de la paleta, se consume al final)
  const spiral=groundPlane(3.2,TP.x,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float s=fract(an/6.2832*3.+r*2.4-uT*.8);float arm=band(s,.5,.16)*smoothstep(1.,.7,r)*smoothstep(0.,.15,r);
   float er=styErode(styNoise(vUv*1.3).r*.7+.3,uP,.12);
   gl_FragColor=vec4(styRamp(.45+.4*s),arm*er*uA*.8);}`,{},{mode:'energy'})); L.decal.add(spiral);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 EM=${v3(EM)};const vec3 TH=${v3(TH)};const vec3 TP=${v3(TP)};
  vec3 path(float u,float ph){vec3 b=mix(EM,TH,u)+vec3(0.,sin(u*3.14159)*.7,0.);float rad=.26*sin(u*3.14159)+.04;float an=u*18.85+ph;
   return b+vec3(0.,cos(an),sin(an))*rad;}`;
  a.count+=S.pts(L.part,60,VV+K+`void main(){float s=TS+aSeed.x*(TI-TS-${f(TV-0.1)});float u=(uT-s)/${f(TV)};
   vec3 p=path(clamp(u,0.,1.),floor(aSeed.z*3.)*2.094)+rnd()*.05;
   vA=(u>0.&&u<1.)?smoothstep(0.,.1,u):0.;vK=0.;vR=0.;put(p,.15+.1*aSeed.w);vMix=aSeed.w+u*.3;}`,SPORE_FS);
  a.count+=S.pts(L.part,40,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float arm=floor(aSeed.z*5.);float rad=(.25+1.4*aSeed.y)*(1.-exp(-t*3.5));float an=arm*1.2566+rad*1.6+t*2.;
   vec3 p=TH+vec3(cos(an)*rad,(aSeed.w-.5)*.5*t+.2*t,sin(an)*rad);
   vA=(age>0.&&age<1.)?1.-age*age:0.;vK=0.;vR=0.;put(p,(.16+.1*aSeed.w)*(1.-.4*age));vMix=arm*.2;}`,SPORE_FS);
  a.count+=S.pts(L.part,60,VV+K+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float arm=floor(r.x*3.);float an=arm*2.094+age*6.+r.y*.6;float rad=mix(1.05,.45,age)+r.z*.14;
   vec3 p=TP+vec3(cos(an)*rad,.15+age*1.8+r.z*.2,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=0.;put(p,.12+.09*r.z);vMix=r.x+age*.3;}`,SPORE_FS);
  a.count+=S.pts(L.part,4,VV+K+`void main(){float an=aSeed.x*6.2832+uT*3.4;
   vec3 p=TH+vec3(0.,.48,0.)+vec3(cos(an)*.45,sin(an*2.+aSeed.y*6.)*.05,sin(an)*.34);
   vA=uE*step(${f(TI+0.12)},uT);vK=0.;vR=uT*3.+aSeed.y*6.;put(p,.34);}`,STAR_FS,{mode:'energy'});
  const sway=t=>0.17*Math.sin(t*4.2)+0.06*Math.sin(t*9.1);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.2,te)*(1-ss(TD,TE,te)), lean=ss(TI,TI+0.3,te)*(1-ss(TD,TE,te));
    glint(glintEnv(te,0.12,0.07)*1.1+(te>=TS&&te<TI?0.3:0),te*3);
    caster.rotation.z=0.05*Math.sin(te*7)*ss(0,0.25,te)*(1-ss(TI-0.2,TI+0.2,te));
    const hit=hitE(ia,7);
    target.rotation.z=sway(te)*lean-0.1*hit;
    target.position.x=3.4+0.1*Math.sin(te*2.6)*lean+0.12*hit; target.position.z=0.12*Math.sin(te*1.9)*lean;
    spark.pose(ia,TH,1); ring.pose(ia,TP.x,0,0.5,1);
    rets.forEach((m,i)=>{const s=i?1:-1,j=ss(TI,TI+0.25,te);
      tmp.set(target.position.x+s*0.24*j,TH.y+0.15+s*0.06*j,0); towardCam(m.position,tmp,0.6); billboard(m);
      m.visible=env>0.002; m.scale.setScalar(0.8+0.1*Math.sin(te*5+i));
      m.material.uniforms.uJ.value=j; set(m,te*0.6*(i?-1:1),env*(i?0.6:0.85));});
    set(spiral,ia>=0?-0.1+1.1*ss(TD-0.2,TE,te):0,ss(TI,TI+0.25,te));
    U.uE.value=env;
    o.em=0.25*env; o.emc.copy(U.uC1.value);
    if(te<TS){localW(EYE_L[1],o.g);const g=glintEnv(te,0.12,0.07);o.gs=0.6;o.ga=0.25*g;o.li=1.4*g;}
    else if(ia<0){o.g.lerpVectors(EM,TH,cl((te-TS)/(TI-TS)));o.gs=0.8;o.ga=0.15;o.li=2;}
    else{o.g.copy(TH);o.gs=1.4+1.4*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.4+0.08*env;o.li=5*Math.exp(-ia*5)+1.5*env;}
    o.ia=ia;o.c.copy(TH);o.shake=0;o.dist=1.1;o.flash=0.3;
  };
}});

// =====================================================================
// 4 · CUCUMBER SLICE (sobre sí mismo: cura 50 y +20 % de curación recibida a todos los aliados) — seis rodajas de
//     pepino brotan sobre el Axie, orbitan girando y caen en un golpe de frescor: vaho menta que se abre por el suelo,
//     salpicadura de gotas y una onda de cura amplia; luego siguen orbitando y gotean hasta consumirse. ti 1,05 s
// =====================================================================
const SLICE_FS=`uniform float uEr;uniform float uG;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float face=1.;
 float r=length(vP.xz)/.32;float an=atan(vP.z,vP.x);
 float rind=smoothstep(.86,.9,r);float flesh=1.-rind;
 float core=smoothstep(.5,.42,r);float seeds=smoothstep(.07,.03,length(vec2(fract(an/6.2832*9.)-.5,(r-.55)*3.)*vec2(.55,1.)))*step(.4,r)*step(r,.7);
 vec3 c=styRampOf(vec3(.56,.82,.36),.2+.45*l+.12*core)*styTint(l);
 c=mix(c,styRampOf(vec3(.92,.94,.66),.4+.4*l),seeds*.9);
 vec3 skin=styRampOf(vec3(.1,.36,.12),.25+.5*l+.15*step(.5,fract(an/6.2832*14.)))*styTint(l);
 c=mix(c,skin,max(rind,1.-face));
 float e=styNoise(vec2(an*.5,r)*.6+.33).r;if(e<uEr)discard;
 c+=uC1*(smoothstep(uEr+.08,uEr,e)*step(.001,uEr)+uG*.35);
 float sp=smoothstep(.95,.97,dot(reflect(-stySunV(),n),normalize(vV)))*face;c+=vec3(1.)*sp*.4;
 gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_pjCucumberSlice",name:"Cucumber Slice (estilizado)",dur:3.45,ti:1.05,pal:"Sty Rocío",tier:3,stylized:true,
  phases:[["Fatiga",0],["Rodajas",0.4],["Frescor",1.05],["Órbita",1.5],["Disipación",2.75]],
build(a){
  const L=a.L,TS=0.45,TI=1.05,TD=2.75,TE=3.35,CP=V3(-3.7,0,0),AC=V3(-3.7,1.05,0),TOP=V3(-3.7,2.35,0);
  const N=6,R=1.0,TILT=0.3,sT=Math.sin(TILT),cT=Math.cos(TILT);
  const orb=(an,rad,y,out)=>out.set(AC.x+Math.cos(an)*rad,y-Math.sin(an)*rad*sT,AC.z+Math.sin(an)*rad*cT);
  const mat=S.mat(SLICE_FS,{uEr:{value:-0.1},uG:{value:0}},{mode:'solid'});
  const geo=new THREE.CylinderGeometry(0.32,0.32,0.08,28,1);
  const slices=[];for(let i=0;i<N;i++){const m=new THREE.Mesh(geo,mat);L.mesh.add(m);slices.push(m);}
  const glint=mkGlint(L,0.5);
  const ring=S.groundRing(L.decal,3.4), spark=S.hitSpark(L.mesh,2,{seed:0.15,life:0.22});
  const wave=groundPlane(9,CP.x,0.03,S.mat(WAVE_FS,{},{mode:'energy'})); L.decal.add(wave);
  const dew=groundPlane(3.4,CP.x,0.018,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+.4).r*.6+styNoise(vUv*2.).g*.4;
   float m=smoothstep(uP*(.85+.3*n),uP*(.85+.3*n)-.15,r);if(m<.01)discard;
   float dr=smoothstep(.6,.75,styNoise(vUv*2.7+.1).g);
   gl_FragColor=vec4(styRampOf(uC1,.35+.4*n+.3*dr),m*(.35+.35*dr)*uA);}`,{},{mode:'matter'})); L.decal.add(dew);
  const K=`const float TI=${f(TI)};const float TS=${f(TS)};const vec3 CP=${v3(CP)};const vec3 AC=${v3(AC)};`;
  const MIST_FS=S.MATTER_FS(C.puff,{relief:4.5,col:'mix(uC1,vec3(.86,.98,.94),.35)',bias:.08});
  const DROP_FS=S.MATTER_FS(C.drop,{relief:4,col:'uC1',bias:.1});
  // golpe de frescor: vaho menta que se abre a ras de suelo y gotas que saltan
  a.count+=S.pts(L.part,22,dustRingVS(CP,0.4,2.4,TI,1.0,'.6+.3*aSeed.y'),MIST_FS);
  a.count+=S.pts(L.part,18,burstVS(V3(CP.x,0.4,0),"0.,.9,0.",2.,4.,8.,.6,'.2+.08*aSeed.w',TI,0.05),DROP_FS);
  // en órbita: gotas que caen de las rodajas
  a.count+=S.pts(L.part,20,VV+K+`void main(){float per=.5;float k=(uT-TI-.1)/per+aSeed.y;float c=floor(k);float tt=fract(k)*per;vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AC+vec3(cos(an)*.95,.15-4.*tt*tt,sin(an)*.95*${f(cT)});
   vA=(k>=0.&&uT<${f(TD)}&&p.y>.03)?1.:0.;vK=0.;vR=3.14159;put(p,.14+.05*r.y);}`,DROP_FS);
  // +curación recibida: hojas y motas menta que suben
  a.count+=S.pts(L.part,14,VV+K+`void main(){float life=1.+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rad=.4+.5*r.y;vec3 p=CP+vec3(cos(an)*rad,.2+age*(1.8+r.z*.5),sin(an)*rad);
   vA=(k>=1.)?uE:0.;vK=smoothstep(.65,1.,age);vR=an+1.57;put(p,.22+.08*r.z);}`,LEAF_FS);
  a.count+=S.pts(L.part,16,VV+K+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=CP+vec3(cos(an)*(.3+.6*r.y),.3+age*(1.4+r.z*.6),sin(an)*(.3+.6*r.y));
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=r.z*6.28;put(p,.1+.06*r.z);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.3,te)*(1-ss(TD,TE,te));
    const grow=ss(TS,TS+0.25,te), drop=ss(TI-0.22,TI,te), lift=ss(TI+0.15,TI+0.6,te);
    const rad=0.35+0.3*grow+(R-0.65)*ss(TI,TI+0.5,te);
    const y=TOP.y+(AC.y-0.55-TOP.y)*drop+(0.55+0.2)*lift*(ia>=0?1:0);
    slices.forEach((m,i)=>{const an=i/N*TAU+te*(ia<0?3.2:2.2);
      orb(an,rad,y+0.06*Math.sin(te*5+i),m.position); m.rotation.set(1.2+0.4*Math.sin(te*4+i),an,0.6*Math.sin(te*3+i*2));
      const pop=ss(TS+i*0.04,TS+0.12+i*0.04,te); m.scale.setScalar(Math.max(pop*(1+0.12*hitE(ia,8)),0.001)); m.visible=pop>0.002;});
    mat.uniforms.uEr.value=te<TD?-0.1:-0.1+1.15*ss(TD,TE-0.05,te); mat.uniforms.uG.value=hitE(ia,4)+0.2*env;
    glint(glintEnv(te,0.28,0.09)*1.2,te*2);
    spark.pose(ia,tmp.set(CP.x,0.5,0),1.1); ring.pose(ia,CP.x,0,0.55,1.1);
    const wp=cl(ia/0.8); wave.visible=ia>=0&&wp<1; wave.scale.setScalar(0.2+0.9*(1-Math.pow(1-wp,2))); set(wave,0.05+0.9*wp,1-wp*wp);
    set(dew,ss(TI,TI+0.7,te),env);
    U.uE.value=env;
    caster.position.y=ia>=0&&ia<0.4?0.12*Math.sin(Math.PI*ia/0.4):0;
    o.em=0.35*env+0.6*hitE(ia,4); o.emc.copy(U.uC1.value);
    if(te<TS){localW(EYE_L[1],o.g);const g=glintEnv(te,0.28,0.09);o.gs=0.7;o.ga=0.25*g;o.li=1.4*g;}
    else if(ia<0){o.g.copy(TOP);o.gs=1;o.ga=0.2;o.li=2;}
    else{o.g.copy(AC);o.gs=2+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*6)*0.5+0.1*env;o.li=7*Math.exp(-ia*3.5)+2*env;}
    o.ia=ia;o.c.copy(AC);o.shake=1.3;o.dist=1;o.flash=0;
  };
}});

// =====================================================================
// 5 · PAPI (aliado: cura 45) — de la mirada salen cinco ondas de cariño (anillos de pincel rosa) que viajan al aliado
//     y se cierran a su alrededor en un abrazo; un capullo cálido late como un corazón y suelta corazones con volumen
//     que suben. ti 0,8 s
// =====================================================================
const HEART_FS=S.PV+`float sdH(vec2 p){p.x=abs(p.x);if(p.y+p.x>1.)return sqrt(dot(p-vec2(.25,.75),p-vec2(.25,.75)))-.3536;
 return sqrt(min(dot(p-vec2(0.,1.),p-vec2(0.,1.)),dot(p-.5*max(p.x+p.y,0.),p-.5*max(p.x+p.y,0.))))*sign(p.x-p.y);}
void main(){vec2 q=gl_PointCoord;q.y=1.-q.y;vec2 p=(q-vec2(.5,.14))*1.45;float d=sdH(p);if(d>0.)discard;
 vec2 g=vec2(sdH(p+vec2(.02,0.))-sdH(p-vec2(.02,0.)),sdH(p+vec2(0.,.02))-sdH(p-vec2(0.,.02)));
 float h=clamp(-d*3.2,0.,1.);vec3 n=normalize(vec3(-g*12.*(1.-h),h+.15));float l=styLight(n,stySunV());
 vec3 c=styRampOf(mix(uC1,uC2,vMix*.6),.3+.55*l)*styTint(l);
 c+=vec3(1.)*step(length(q-vec2(.36,.66)),.06)*.6;
 gl_FragColor=vec4(c,vA*smoothstep(0.,-.03,d));}`;
defs.push({key:"sty_pjPapi",name:"Papi (estilizado)",dur:2.3,ti:0.8,pal:"Sty Cariño",tier:2,allies:1,stylized:true,
  phases:[["Mirada",0],["Ondas",0.18],["Abrazo",0.8],["Calidez",1.1],["Fin",1.9]],
build(a){
  const L=a.L,TI=0.8,TD=1.9,TE=2.3,NR=5,TV=0.34,EM=V3(-3.45,1.66,0),AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.0,0));
  const S0=i=>0.14+i*0.08;
  const mid=EM.clone().lerp(AC,0.5).add(V3(0,0.7,0));
  const pathPt=(u,out)=>{const s=1-u;return out.set(EM.x*s*s+2*mid.x*s*u+AC.x*u*u,EM.y*s*s+2*mid.y*s*u+AC.y*u*u,EM.z*s*s+2*mid.z*s*u+AC.z*u*u);};
  const RINGB_FS=`void main(){vec4 s=styShape(7.,vUv);if(s.r<.02)discard;
   float hrt=0.;gl_FragColor=vec4(styRamp(.55+.4*s.g)*1.2,s.r*uA);}`;
  const waves=[],hugs=[];
  for(let i=0;i<NR;i++){
    const w=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),S.mat(RINGB_FS,{},{mode:'energy'}));L.mesh.add(w);waves.push(w);
    const h=groundPlane(1.6,AP.x,0,S.mat(RINGB_FS,{},{mode:'energy'}));h.position.set(AP.x,0.25+i*0.33,AP.z);L.mesh.add(h);hugs.push(h);}
  const COCOON_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float n=styNoise(vUv*vec2(2.,1.)+vec2(0.,-uT*.2)).r;
   gl_FragColor=vec4(styRamp(.6+.3*n)*1.1,(fr*.8+.08)*uA*(.8+.4*uP));}`;
  const cocoon=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),S.mat(COCOON_FS,{},{mode:'energy'})); cocoon.position.set(AP.x,0.95,AP.z); L.mesh.add(cocoon);
  const glint=mkGlint(L,0.45);
  const ring=S.groundRing(L.decal,2.6); const glow=groundPlane(2.2,AP.x,0.018,S.mat(MOSS_FS.replace('vec3(.3,.58,.2)','uC1'),{},{mode:'matter'})); glow.position.z=AP.z; L.decal.add(glow);
  const K=`const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};const float TI=${f(TI)};`;
  // corazones que suben del abrazo
  a.count+=S.pts(L.part,26,VV+K+`void main(){float life=.85+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.35+.45*r.y;vec3 p=AP+vec3(cos(an)*rad,.3+age*(1.6+r.z*.5),sin(an)*rad)+vec3(sin(age*6.+r.y*9.)*.08,0.,0.);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.8,1.,age))*uE:0.;vK=0.;vR=0.;put(p,(.36+.12*r.z)*(.7+.5*sin(age*3.14159)));vMix=r.z;}`,HEART_FS);
  // estallido de corazones al cerrarse el abrazo
  a.count+=S.pts(L.part,10,burstVS(V3(AP.x,1.0,AP.z),"0.,.8,0.",1.,2.,2.,.6,'.4+.12*aSeed.w',TI,0.04,0),HEART_FS);
  a.count+=S.pts(L.part,16,VV+K+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;vec3 p=AP+vec3(cos(an)*(.25+.55*r.y),.2+age*(1.4+r.z*.5),sin(an)*(.25+.55*r.y));
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=r.z*6.28;put(p,.09+.05*r.z);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.2,te)*(1-ss(TD,TE,te)), bt=env*Math.pow(0.5+0.5*Math.sin(te*9),3);
    glint(glintEnv(te,0.1,0.06)*1.1,te*3);
    let lead=-1;
    waves.forEach((w,i)=>{const u=(te-S0(i))/TV;w.visible=u>0&&u<1.08;
      if(w.visible){pathPt(Math.min(u,1),w.position);billboard(w);w.scale.setScalar(0.5+1.4*Math.min(u,1));
        w.material.uniforms.uA.value=ss(0,0.12,u)*(1-ss(0.85,1.08,u));if(u<1)lead=Math.max(lead,u);}});
    hugs.forEach((h,i)=>{const tb=S0(i)+TV,x=cl((te-tb)/0.28);h.visible=te>=tb&&te<TE;
      h.scale.setScalar(Math.max(1.6-0.85*(1-Math.pow(1-x,2))+0.06*bt+0.5*ss(TD,TE,te),0.001));
      h.material.uniforms.uA.value=ss(tb,tb+0.06,te)*(1-ss(TD,TE-0.1,te))*(0.55+0.3*bt);});
    cocoon.visible=te>=TI-0.1&&te<TE; set(cocoon,bt,ss(TI-0.1,TI+0.2,te)*(1-ss(TD,TE,te))*0.3);
    cocoon.scale.set(0.62*(1+0.05*bt),1.0*(1+0.04*bt),0.62*(1+0.05*bt));
    ring.pose(ia,AP.x,AP.z,0.5,1); set(glow,ss(TI-0.05,TI+0.5,te),env*0.8);
    U.uE.value=env;
    const al=allies[0]; al.userData.m.emissive.copy(U.uC1.value);
    al.userData.m.emissiveIntensity=0.2*env+0.35*bt; al.scale.setScalar(1+0.03*bt); al.rotation.z=0.04*Math.sin(te*3)*env;
    if(te<0.18){localW(EYE_L[1],o.g);const g=glintEnv(te,0.1,0.06);o.gs=0.6;o.ga=0.25*g;o.li=1.4*g;}
    else if(ia<0&&lead>=0){pathPt(lead,o.g);o.gs=0.9;o.ga=0.2;o.li=2.4;}
    else if(ia<0){o.g.copy(AC);o.gs=1;o.ga=0.2;o.li=2;}
    else{o.g.copy(AC);o.gs=1.6+1.2*Math.min(ia,0.5)+0.3*bt;o.ga=Math.exp(-ia*7)*0.4+0.08*env+0.1*bt;o.li=4.5*Math.exp(-ia*5)+1.6*env+1.2*bt;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

VFX.module("Estilizado · Planta · Ojos",defs);
})();

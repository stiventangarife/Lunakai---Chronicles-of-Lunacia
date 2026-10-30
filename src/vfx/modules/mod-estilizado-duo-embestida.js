// =====================================================================
// ESTILIZADO · DÚO · EMBESTIDA DESTRUCTIVA (Hito 101) — Ultimate de dúo Sapidae + su Axie (allies[0]), kit vfx-stylized.js.
// Clave: sty_duo_embestida (el puente la usa con el estilo nuevo encendido). Mismos dur / ti / fases / variantes (piezas)
// y la misma coreografía que mod-duo-embestida.js: los dos cargan juntos en paralelo (z = 0 y z = −1), se paran una
// casilla delante del rival y este sale despedido (la carta empuja 3 casillas).
// Piezas: aura de llamas pintadas (materia) · estela carmesí de los ojos · cono de choque de pinceladas ·
// huellas de magma · detonación sísmica (flor de fuego en materia, humo carbón, rocas iluminadas, grietas) · onda de polvo.
// Sin velo ni destello blanco fuerte: la materia tapa el fondo y solo los núcleos son aditivos.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, CE=S.CELL;
const PAL="Sty Dúo · Embestida"; VFX.palette(PAL,["#ffb347","#c0392b"]);
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const SOOT=lin(0x2b2224), SOOTL=lin(0x5a4a44), MAGMA=lin(0xff5a1e), EMBER=lin(0xffa040), EARTH=lin(0x9a7a56), FIRED=lin(0x8a1f12);
const VV=`varying float vR;varying float vK;`;

// tiempos y carrera (idénticos al original)
const TR=0.6,TI=1.4,X0=-3.85,XE=2.6,XS=2.4,PW=1.8,LZ=-1.0,TP=V3(3.4,0,0);
const runX=t=>t<TR?-3.7-0.15*ss(0.15,TR,t):(t<TI?X0+(XE-X0)*Math.pow((t-TR)/(TI-TR),PW):XE-(XE-XS)*ss(TI,TI+0.35,t));
const bobY=t=>{const k=(t-TR)/(TI-TR);return k>0&&k<1?0.09*Math.abs(Math.sin((t-TR)*19)):0;};
const leanR=t=>0.12*ss(0,TR,t)-0.42*ss(TR,TR+0.15,t)+0.3*ss(TI,TI+0.3,t);
const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float X0=${f(X0)};const float XE=${f(XE)};const float XS=${f(XS)};
float runX(float t){if(t<TR)return -3.7-.15*smoothstep(.15,TR,t);
 if(t<TI)return X0+(XE-X0)*pow((t-TR)/(TI-TR),${f(PW)});return XE-(XE-XS)*smoothstep(TI,TI+.35,t);}
float bobY(float t){float k=(t-TR)/(TI-TR);return (k>0.&&k<1.)?.09*abs(sin((t-TR)*19.)):0.;}
float leanR(float t){return .12*smoothstep(0.,TR,t)-.42*smoothstep(TR,TR+.15,t)+.3*smoothstep(TI,TI+.3,t);}
float stepT(float x){return TR+(TI-TR)*pow(clamp((x-X0)/(XE-X0),0.,1.),${f(1/PW)});}`;

const IDS=["vfx_dest_fire_aura","vfx_dest_eye_trail","vfx_dest_sonic_cone","vfx_dest_magma_footprints","vfx_dest_seismic_explosion","vfx_dest_shockwave_ring"];
const [P_AURA,P_EYE,P_CONE,P_FOOT,P_EXPL,P_RING]=IDS;

// ---------- shaders compartidos ----------
// llama pintada (materia): forma de llama del atlas, rampa fuego (oscuro abajo → ámbar arriba), banda oscura de contorno
const FLAME_M=S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(1.,uv);float m=sh.r;if(m<.02)discard;
 float er=styErode(m*.55+sh.b*.45,vK*1.05-.08,.08);float a=er*smoothstep(0.,.08,m)*vA;if(a<.01)discard;
 float x=clamp(.18+.7*m+.25*sh.g-.25*vK,0.,1.);vec3 c=styRamp(x)*(1.-.35*smoothstep(.12,0.,m-.1));
 c=mix(${FIRED}*.6,c,smoothstep(.06,.22,m));gl_FragColor=vec4(c*1.05,a);}`;
// núcleo de llama (energía baja): solo el corazón de cada lengua
const FLAME_E=S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(1.,uv);float m=sh.r;if(m<.35)discard;
 float er=styErode(m*.6+sh.b*.4,vK*1.05,.1);float a=er*vA*smoothstep(.35,.7,m);if(a<.01)discard;
 gl_FragColor=vec4(styRamp(.75+.25*sh.g)*1.25,a*.7);}`;
// sólido iluminado en 3 bandas (rocas): base = color; uK = brillo de grietas
const ROCK_FS=`uniform float uK;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec4 s=styNoise(vUv*1.3+vP.xy*.2);vec3 c=styRampOf(${SOOTL},clamp(.2+.55*l+(s.r-.5)*.15,0.,1.))*styTint(l);
 float cr=smoothstep(.06,0.,abs(s.b-.5))*uK;c=mix(c,${MAGMA}*2.2,cr);gl_FragColor=vec4(c,1.);}`;
// grietas en el suelo (materia oscura con brillo de magma uK); uP = cuánto se abren
const CRACK_FS=`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*1.1+.37);vec4 s2=styNoise(vUv*2.3+.71);
 float cr=max(smoothstep(.05,.0,abs(s.b-.5)),smoothstep(.035,0.,abs(s2.b-.5))*.8)*smoothstep(1.,.3,r)*step(r+s.r*.2,uP*1.15);
 if(cr<.05)discard;vec3 c=mix(styRampOf(${SOOT},.15),${MAGMA}*1.8,uK*smoothstep(.55,1.,cr));
 gl_FragColor=vec4(c,cr*uA*.92);}`;
// mancha chamuscada (materia)
const SCORCH_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;
 float m=smoothstep(.85,.6,r+(n-.5)*.5);if(m<.01)discard;float er=styErode(n*.7+m*.3,uP,.14);
 gl_FragColor=vec4(styRampOf(${SOOT},.1+.25*n),m*er*uA*.75);}`;

const embestida={key:"sty_duo_embestida",name:"Embestida Destructiva (estilizado)",tier:3,dur:3.2,ti:TI,pal:PAL,allies:1,stylized:true,
  variants:[["full","Completo"],[P_AURA,"Aura ígnea"],[P_EYE,"Estela de ojos"],[P_CONE,"Cono Mach-1"],[P_FOOT,"Huellas de magma"],[P_EXPL,"Detonación"],[P_RING,"Onda expansiva"]],
  v:"full",vlabel:"Pieza",
  phases:[["Ignición",0],["Carrera",TR],["Impacto",TI],["Onda",TI+0.2],["Disipación",TI+0.7]],
build(a){
  const VG=variantGroups(a,IDS); for(const id of IDS)VG[id].n=0;
  const tmp=V3(0,0,0);

  // ---------------------------------------------------------------
  // 1 · AURA DE FURIA — lenguas de fuego pintadas que envuelven a cada corredor y se tumban hacia atrás al correr
  // ---------------------------------------------------------------
  const GA=VG[P_AURA], auraU={uK:{value:0},uRun:{value:0}};
  const followers=[]; const follow=(parent,z)=>{const g=new THREE.Group();parent.add(g);followers.push({g,z});return g;};
  const AV=VV+`uniform float uK;uniform float uRun;`;
  for(const z of [0,LZ]){
    const gp=follow(GA.part,z);
    // lenguas grandes alrededor del cuerpo (materia)
    GA.n+=S.pts(gp,26,AV+`void main(){float life=.42+aSeed.y*.22;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=aSeed.z*6.2832+c*.7;float rad=.36+.12*r.y;
     vec3 p=vec3(cos(an)*rad-age*uRun*1.1,.15+age*(1.05+.5*r.z),sin(an)*rad*.8);
     vA=(k>=1.)?uK:0.;vK=smoothstep(.35,1.,age);vR=uRun*1.2+(r.x-.5)*.5;put(p,(.62+.3*r.z)*(1.-age*.35));}`,FLAME_M,{uniforms:auraU});
    // corazones calientes (energía)
    GA.n+=S.pts(gp,14,AV+`void main(){float life=.35+aSeed.y*.2;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=aSeed.z*6.2832;vec3 p=vec3(cos(an)*.3-age*uRun*.8,.2+age*.9,sin(an)*.25);
     vA=(k>=1.)?uK:0.;vK=smoothstep(.3,1.,age);vR=uRun;put(p,.4+.15*r.z);}`,FLAME_E,{uniforms:auraU,mode:'energy'});
    // brasas
    GA.n+=S.pts(gp,22,AV+`void main(){float life=.4+aSeed.y*.35;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;float rad=.35+.3*r.y;vec3 p=vec3(cos(an)*rad-age*uRun*1.8,.25+r.z*1.3+age*(.9+.7*r.y),sin(an)*rad);
     vA=(k>=1.)?(1.-age)*uK:0.;vK=age;vR=0.;put(p,.09+.06*r.z);}`,S.ENERGY_FS(CE.spark,{gain:1.3}),{uniforms:auraU,mode:'energy'});
  }

  // ---------------------------------------------------------------
  // 2 · ESTELA CARMESÍ DE LOS OJOS — cinta de pincel reconstruida desde la carrera (sin estado)
  // ---------------------------------------------------------------
  const GE=VG[P_EYE];
  const RIB_VS=`uniform float uT;uniform vec3 uO;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
  ${C}
  void main(){vUv=uv;float u=uv.x;float s=uv.y*2.-1.;float t=max(uT-u*.32,0.);float r=leanR(t);
   vec3 p=vec3(runX(t)+.23*cos(r)-1.66*sin(r),.23*sin(r)+1.66*cos(r)+bobY(t),uO.x);p.y+=s*.08*(1.-u*.75);
   vP=vec3(u,s,0.);vN=vec3(0.,0.,1.);vV=vec3(0.,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
  const RIB_FS=`void main(){float u=vP.x;float s=abs(vP.y);vec4 n=styNoise(vec2(u*1.4-uT*2.2,vP.y*.3+.4));
   float body=smoothstep(1.,.25,s+(n.r-.5)*.6);float core=smoothstep(.35,0.,s);float er=styErode(n.r*.6+(1.-u)*.4,u*.9,.12);
   float al=(body*.8+core*.5)*er*pow(1.-u,1.2)*uA;if(al<.01)discard;
   gl_FragColor=vec4(mix(${FIRED}*1.4,styRamp(.6+.3*core),core*.7+.2)*1.25,al);}`;
  const ribbons=[];
  for(const z of [0.1,-0.1,LZ+0.1,LZ-0.1]){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1,12,1),S.mat(RIB_FS,{uO:{value:V3(z,0,0)}},{mode:'energy',vertexShader:RIB_VS}));
    m.frustumCulled=false; GE.trail.add(m); ribbons.push(m);
  }
  // destello carmesí de los ojos (dos almendras pequeñas, sin ojo de dibujo)
  const EYE_FS=`void main(){vec2 p=(vUv-.5)*2.;float e=smoothstep(.2,0.,length((abs(p)-vec2(.24,0.))*vec2(1.,3.)));
   float st=smoothstep(.06,0.,abs(p.y))*smoothstep(.9,.2,abs(p.x))*.35;if(e+st<.01)discard;
   gl_FragColor=vec4(mix(${FIRED}*1.6,styRamp(.85),e)*1.3,(e+st)*uA);}`;
  const eyeGlows=[0,LZ].map(z=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),S.mat(EYE_FS,{},{mode:'energy',depthTest:false}));m.userData.z=z;GE.mesh.add(m);return m;});

  // ---------------------------------------------------------------
  // 3 · CONO DE CHOQUE — cono abierto con vetas de pincel ámbar que corren hacia atrás + medias lunas de aire delante
  // ---------------------------------------------------------------
  const GC=VG[P_CONE], coneG=new THREE.Group(); GC.mesh.add(coneG);
  const CONE_FS=`void main(){float l=vP.x+.5;float an=atan(vP.z,vP.y);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
   vec4 s=styNoise(vec2(an*.32+.1,l*.55+uT*2.6));float st=smoothstep(.05,0.,abs(s.b-.5))*(.5+.5*s.r);
   float er=styErode(s.r*.6+l*.4,.25,.2);
   float al=(fr*.5+st*.9)*er*smoothstep(0.,.3,l)*smoothstep(1.05,.75,l)*uA;if(al<.01)discard;
   gl_FragColor=vec4(styRamp(.45+.45*st+.1*fr)*1.15,al*.85);}`;
  const coneGeo=new THREE.ConeGeometry(1,1,56,10,true).rotateZ(-Math.PI/2);
  const cone=new THREE.Mesh(coneGeo,S.mat(CONE_FS,{},{mode:'energy',side:THREE.DoubleSide})), coneIn=new THREE.Mesh(coneGeo,S.mat(CONE_FS,{},{mode:'energy',side:THREE.DoubleSide}));
  cone.scale.set(1.8,1.3,1.3); coneIn.scale.set(1.35,0.85,0.85); coneIn.position.x=0.25; coneG.add(cone,coneIn);
  // medias lunas de choque en la punta (corte del atlas, energía)
  const CRES_FS=`void main(){vec4 sh=styShape(6.,vec2(vUv.y,vUv.x));float m=sh.r;if(m<.03)discard;
   float er=styErode(m*.6+sh.b*.4,uP,.12);gl_FragColor=vec4(styRamp(.55+.4*sh.g)*1.3,m*er*uA);}`;
  const crescents=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,2.2),S.mat(CRES_FS,{},{mode:'energy'}));m.userData.i=i;coneG.add(m);return m;});
  // líneas de velocidad crema-ámbar
  const coneU={uK:{value:0}}, coneP=new THREE.Group(); GC.part.add(coneP);
  GC.n+=S.pts(coneP,60,VV+`uniform float uK;void main(){float k=fract(aSeed.x+uT*2.6);float an=aSeed.z*6.2832;
   float rad=k*1.25*(.75+.3*aSeed.w);vec3 p=vec3(.9-k*2.4,sin(an)*rad,cos(an)*rad);
   vA=sin(k*3.14159)*uK*.8;vK=k;vR=1.5708;put(p,.3+.15*aSeed.y);}`,S.ENERGY_FS(CE.slash,{gain:1.1}),{uniforms:coneU,mode:'energy'});

  // ---------------------------------------------------------------
  // 4 · HUELLAS DE MAGMA — una por casilla pisada (6 por carril): costra de hollín y rayos de magma que se enfrían
  // ---------------------------------------------------------------
  const GF=VG[P_FOOT], FW=6.6, FD=2.4, FCX=-0.45, FCZ=-0.5;
  const FOOT=`${C}
  float footAge(out vec2 q,out float seed){vec2 w=vec2(${f(FCX)}+vP.x,${f(FCZ)}+vP.z);
   float i=clamp(floor(w.x+3.2),0.,5.);float fx0=-2.7+i;float lz=w.y>-.5?0.:-1.;
   q=vec2(w.x-fx0,w.y-lz);seed=i*3.1+lz*7.3;return uT-stepT(fx0);}`;
  const footChar=groundPlane(FW,FCX,0.018,S.mat(FOOT+`void main(){vec2 q;float sd;float ag=footAge(q,sd);if(ag<0.)discard;
   vec4 n=styNoise(q*.5+sd*.13);float R=.46*(1.-.6*exp(-ag*16.));float r=length(q*vec2(.9,1.1))+(n.r-.5)*.16;
   float m=smoothstep(R,R*.75,r)*.9+smoothstep(R*1.5,R*.85,r)*.3;float life=1.-smoothstep(1.,1.5,ag);if(m*life<.01)discard;
   gl_FragColor=vec4(styRampOf(${SOOT},.15+.3*n.g),m*life*uA);}`),FD);
  footChar.position.z=FCZ;
  const footGlow=groundPlane(FW,FCX,0.024,S.mat(FOOT+`void main(){vec2 q;float sd;float ag=footAge(q,sd);if(ag<0.)discard;
   float an=atan(q.y,q.x);vec4 n=styNoise(q*.6+sd*.21);float j=n.r-.5;
   float R=.46*(1.-.6*exp(-ag*16.));float r=length(q*vec2(.9,1.1))+j*.06;
   float rays=pow(1.-abs(fract(an*1.11+j*.6+sd*.13)*2.-1.),16.)+pow(1.-abs(fract(an*1.75+j+.4)*2.-1.),22.);
   float cr=rays*smoothstep(R*1.25,R*.25,r);float pool=smoothstep(R*.4,0.,r);
   float heat=exp(-ag*1.6)*.85+.15;float life=1.-smoothstep(1.,1.5,ag);float al=(cr*1.1+pool*heat)*heat*life*uA;if(al<.01)discard;
   gl_FragColor=vec4(mix(${MAGMA},${EMBER},pool*exp(-ag*3.))*(1.1+1.2*heat),al);}`,{},{mode:'energy'}),FD);
  footGlow.position.z=FCZ;
  GF.decal.add(footChar,footGlow);
  // humo carbón (materia) de las huellas
  GF.n+=S.pts(GF.part,72,VV+C+`void main(){float id=float(gl_VertexID);float fp=floor(id/6.);float j=id-fp*6.;
   float lane=floor(fp/6.);float i=fp-lane*6.;float fx0=-2.7+i;float lz=-lane;
   float s=stepT(fx0)+.04+j*.04;float life=.9+aSeed.y*.4;float t=uT-s;float age=t/life;float c=max(t,0.);vec3 r=rnd();
   vec3 p=vec3(fx0+r.x*.25-c*.35,.08+c*(.5+.45*aSeed.z),lz+r.z*.25);
   vA=(age>0.&&age<1.)?.85:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28;put(p,(.32+.2*aSeed.w)*(.6+age*1.2));}`,S.MATTER_FS(CE.puff,{relief:4,col:SOOTL,bias:-.05}));

  // ---------------------------------------------------------------
  // 5 · DETONACIÓN SÍSMICA — flor de fuego pintada (materia), humo carbón, rocas iluminadas con grietas de magma,
  //     brasas, chispa de impacto grande, grietas y chamuscado bajo el rival
  // ---------------------------------------------------------------
  const GX=VG[P_EXPL];
  const XC=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};`;
  // lenguas de fuego que estallan hacia fuera y arriba
  GX.n+=S.pts(GX.part,28,VV+XC+`void main(){float s=TI+aSeed.x*.1;float life=.45+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=normalize(vec3(cos(an),.55+.9*aSeed.w,sin(an)*.8));
   vec3 p=TP+vec3(0.,.45,0.)+d*(2.2*(1.-exp(-t*5.)))*(.6+.6*aSeed.y)+vec3(0.,t*.8,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=atan(d.x,d.y)*(.4+.9*aSeed.y)+(aSeed.w-.5)*.6;put(p,(.6+1.4*aSeed.w*aSeed.w)*(.7+.6*smoothstep(0.,.25,age)));}`,FLAME_M);
  GX.n+=S.pts(GX.part,18,VV+XC+`void main(){float s=TI+aSeed.x*.06;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an)*.5*t*3.,.55+t*1.6,sin(an)*.4*t*3.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=0.;put(p,1.+.4*aSeed.w);}`,FLAME_E,{mode:'energy'});
  // humo carbón que sube y se abre
  GX.n+=S.pts(GX.part,16,VV+XC+`void main(){float s=TI+.08+aSeed.x*.2;float life=1.1+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an)*(.3+1.4*(1.-exp(-t*3.))),.7+t*(.9+.5*aSeed.w),sin(an)*(.25+1.1*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?.92:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t*.6;put(p,(1.+.5*aSeed.w)*(.7+age*.9));}`,S.MATTER_FS(CE.puff,{relief:5,col:SOOTL,bias:-.08}));
  // brasas con gravedad
  GX.n+=S.pts(GX.part,90,VV+XC+`void main(){float s=TI+aSeed.x*.12;float life=.7+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.9,0.));vec3 p=TP+vec3(0.,.6,0.)+d*(2.4+3.5*aSeed.z)*t+vec3(0.,-5.5*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=age;vR=0.;put(p,(.1+.08*aSeed.w)*(1.-age*.5));}`,S.ENERGY_FS(CE.spark,{gain:1.4}),{mode:'energy'});
  // rocas: hollín iluminado con grietas de magma que se enfrían
  const rockMat=S.mat(ROCK_FS,{uK:{value:1}},{mode:'solid'});
  const rockGeo=new THREE.DodecahedronGeometry(1,0), rocks=[], G=9.8;
  for(let i=0;i<11;i++){
    const an=(i/11+Math.random()*0.04)*Math.PI*2, h=1.0+2.6*Math.random(), s=0.2+0.16*Math.random(), y0=0.25+0.35*Math.random();
    const vy=3.2+5.0*Math.random(), tl=(vy+Math.sqrt(vy*vy+2*G*(y0-s)))/G;
    const m=new THREE.Mesh(rockGeo,rockMat);
    m.userData={p0:V3(TP.x+Math.cos(an)*0.35,y0,Math.sin(an)*0.35),v:V3(Math.cos(an)*h,vy,Math.sin(an)*h),s,tl,
      spin:V3(Math.random()*14-7,Math.random()*14-7,Math.random()*14-7)};
    rocks.push(m); GX.mesh.add(m);
  }
  const spark=S.hitSpark(GX.mesh,3.0,{seed:0.61,life:0.22});
  const cracks=groundPlane(7.2,TP.x,0.026,S.mat(CRACK_FS,{uK:{value:0}})); GX.decal.add(cracks);
  const scorch=groundPlane(4.2,TP.x,0.022,S.mat(SCORCH_FS)); GX.decal.add(scorch);

  // ---------------------------------------------------------------
  // 6 · ONDA EXPANSIVA — anillo de pincel que crece a 3,5 m y polvo de tierra (materia) en el frente
  // ---------------------------------------------------------------
  const GR=VG[P_RING];
  const ring=groundPlane(2,TP.x,0.05,S.mat(`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
   if(s.r*er<.02)discard;gl_FragColor=vec4(mix(${EARTH}*1.3,styRamp(.7+.3*s.g),.55)*1.1,s.r*er*uA*.9);}`,{},{mode:'energy'})); GR.decal.add(ring);
  const ring2=groundPlane(2,TP.x,0.045,S.mat(S.FS.RING,{},{mode:'energy'})); GR.decal.add(ring2);
  GR.n+=S.pts(GR.part,70,VV+XC+`void main(){float s=TI+aSeed.x*.4;float pr=(s-TI)/.45;float R=.3+3.2*(1.-(1.-pr)*(1.-pr));
   float an=aSeed.z*6.2832;float t=max(uT-s,0.);float life=.8+aSeed.y*.5;float age=(uT-s)/life;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=TP+d*(R+.6*(1.-exp(-t*2.5))*(.4+aSeed.w))+vec3(0.,.12+(.3+.6*aSeed.y)*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?.9:0.;vK=smoothstep(.25,1.,age);vR=an;put(p,(.55+.4*aSeed.w)*(.6+age*.9));}`,S.MATTER_FS(CE.puff,{relief:4,col:EARTH}));

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const id of IDS)for(const l of VFX.LK)VG[id][l].visible=v==="full"||v===id;
    a.count=IDS.reduce((s,id)=>s+((v==="full"||v===id)?VG[id].n:0),0);};

  const sparkP=V3(TP.x-0.25,1.0,0);
  a.pose=function(te,o){
    const v=a.v, full=v==="full", sh=id=>full||v===id;
    const ia=te-TI, x=runX(te), y=bobY(te), r=leanR(te), run=te>=TR&&te<TI?(te-TR)/(TI-TR):0;
    // el dúo: Sapidae en z=0 y su Axie en paralelo (z=-1)
    caster.position.set(x,y,0); caster.rotation.z=r;
    const ax=allies[0]; ax.position.set(x,y,LZ); ax.rotation.z=r;
    for(const fl of followers){fl.g.position.set(x,y,fl.z);fl.g.rotation.z=r;}
    // 1 aura
    const aEnv=ss(0.05,0.4,te)*(1-ss(TI+0.4,TI+1.1,te));
    auraU.uK.value=aEnv; auraU.uRun.value=te<TI?Math.pow(run,0.6):Math.max(0,1-(te-TI)/0.3);
    if(sh(P_AURA)){for(const m of [caster.userData.m,ax.userData.m]){m.emissive.copy(U.uC1.value);m.emissiveIntensity=0.3*aEnv;}}
    // 2 estela
    const eA=ss(TR-0.1,TR+0.12,te)*(1-ss(TI+0.15,TI+0.55,te));
    for(const m of ribbons)m.material.uniforms.uA.value=eA;
    const gA=ss(0.15,TR,te)*(1-ss(TI+0.5,TI+1.1,te));
    for(const m of eyeGlows){tmp.set(x+0.23*Math.cos(r)-1.66*Math.sin(r),0.23*Math.sin(r)+1.66*Math.cos(r)+y,m.userData.z);
      towardCam(m.position,tmp,0.3); billboard(m); m.visible=gA>0.001; m.material.uniforms.uA.value=gA;}
    // 3 cono
    const cA=ss(TR+0.08,TR+0.35,te)*(1-ss(TI-0.03,TI+0.07,te)), ck=0.6+0.5*run;
    coneG.visible=coneP.visible=cA>0.001; coneG.position.set(x+0.78,0.95+y,LZ/2); coneG.scale.set(ck,0.8+0.25*run,0.8+0.25*run);
    coneP.position.copy(coneG.position);
    cone.material.uniforms.uA.value=cA; coneIn.material.uniforms.uA.value=cA*0.6; coneU.uK.value=cA;
    for(const m of crescents){const i=m.userData.i, ph=(te*3.2+i/3)%1;
      m.position.set(1.05-ph*0.9,0,0); m.rotation.set(0,Math.PI/2*0.15,0); m.scale.set(0.7+0.5*ph,0.75+0.45*ph,1);
      m.material.uniforms.uA.value=cA*Math.sin(Math.PI*ph); m.material.uniforms.uP.value=ph*0.9;}
    // 4 huellas (el shader decide nacimiento y persistencia)
    footChar.material.uniforms.uA.value=1; footGlow.material.uniforms.uA.value=1;
    // 5 detonación
    for(const m of rocks){const u=m.userData,t=Math.max(ia,0),tt=Math.min(t,u.tl);
      m.visible=ia>=0&&ia<1.9; m.position.copy(u.p0).addScaledVector(u.v,tt); m.position.y-=0.5*G*tt*tt;
      m.rotation.set(u.spin.x*tt,u.spin.y*tt,u.spin.z*tt); m.scale.setScalar(Math.max(u.s*(1-ss(1.3,1.9,ia)),0.001));}
    rockMat.uniforms.uK.value=ia>=0?Math.exp(-ia*1.4):1;
    spark.pose(ia,sparkP,1);
    // el rival sale despedido de su casilla y vuelve
    const hit=ia>=0?Math.exp(-ia*2.6):0;
    target.position.x=TP.x+0.75*hit*(1-Math.exp(-Math.max(ia,0)*18)); target.position.y=ia>=0?0.35*Math.sin(Math.PI*cl(ia/0.45)):0;
    target.rotation.z=-0.5*hit*Math.cos(ia*10);
    const cp=1-Math.pow(1-cl(ia/0.4),2);
    cracks.position.x=TP.x; set(cracks,cp,ia>=0?1-ss(TI+1.1,3.15,te):0); cracks.material.uniforms.uK.value=ia>=0?Math.exp(-ia*1.6):0;
    set(scorch,ia>=0?ss(TI+0.9,3.15,te)*0.9:0,ia>=0?ss(0,0.15,ia):0);
    // 6 onda
    const p=cl(ia/0.6); const R=0.3+4.2*(1-Math.pow(1-p,2));
    ring.visible=ia>=0&&p<1; ring.scale.setScalar(R*1.25); set(ring,0.05+0.9*p,ia>=0?1:0);
    const p2=cl((ia-0.05)/0.6); ring2.visible=ia>=0.05&&p2<1; ring2.scale.setScalar((0.3+2.6*(1-Math.pow(1-p2,2)))*1.1); set(ring2,0.05+0.9*p2,1);
    // resplandor y luz
    o.ga=0; o.li=0; o.gs=2;
    if(te<TI){
      if(te<TR)o.g.set(x,1.0,LZ/2); else o.g.set(x+1.2,0.95+y,LZ/2);
      if(sh(P_AURA)){o.ga+=0.18*aEnv;o.li+=2.5*aEnv;o.gs=2.2;}
      if(sh(P_CONE)){o.ga+=0.18*cA;o.li+=2.5*cA;o.gs=2.2;}
      if(sh(P_EYE)&&!full){o.g.set(x+0.3,1.66+y,LZ/2);o.ga+=0.15*gA;o.li+=1.2*gA;o.gs=1.2;}
      if(sh(P_FOOT)&&!full&&te>=TR){o.g.set(x-0.3,0.15,LZ/2);o.ga+=0.12;o.li+=1.8;o.gs=1.4;}
    }else{
      o.g.set(TP.x,0.8,0);
      if(sh(P_EXPL)){o.gs=2.4+4*Math.min(ia,0.6);o.ga+=Math.exp(-ia*7)*0.55;o.li+=10*Math.exp(-ia*3.5);}
      if(sh(P_RING)){o.gs=Math.max(o.gs,2+3*cl(ia/0.45));o.ga+=0.15*Math.exp(-ia*8);o.li+=3*Math.exp(-ia*5);}
      if(sh(P_AURA)){o.ga+=0.1*aEnv;o.li+=1.5*aEnv;}
      if(sh(P_FOOT)&&!full){o.g.set(0,0.2,LZ/2);o.gs=3;o.ga+=0.06*(1-cl(ia/1.4));o.li+=1.5*(1-cl(ia/1.4));}
    }
    o.ld=full||sh(P_EXPL)?14:10;
    const heavy=sh(P_EXPL)||sh(P_RING);
    o.ia=ia; o.c.set(TP.x,0.7,0); o.shake=heavy?1.7:0; o.dist=heavy?1.1:0.3;
    o.white=(full||v===P_EXPL)&&ia>=0&&ia<0.15?0.28*Math.exp(-ia*24):0;
    o.dark=0;
    o.em=sh(P_EXPL)?0.35*hit:0; o.emc.copy(U.uC1.value);
  };
}};

VFX.module("Estilizado · Sapidae · Dúo · Embestida",[embestida]);
})();

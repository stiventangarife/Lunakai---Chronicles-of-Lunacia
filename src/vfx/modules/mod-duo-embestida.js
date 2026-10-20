// =====================================================================
// DÚO · EMBESTIDA DESTRUCTIVA (Física / Fuego) — Sapidae (caster) + su Axie (allies[0]) cargan juntos
// Nivel 3: aura ígnea → carrera con estela de ojos, cono Mach-1 y huellas de magma → detonación sísmica en la
// casilla del rival con rocas, onda expansiva de polvo y fractura de baldosa. Cada pieza (ID de la tabla) es
// una variante que muestra solo esa pieza con la misma línea de tiempo y el mismo movimiento de personajes.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,caster,target,allies}=VFX;
const {NB,SOLID,v3,fireFS,DUST_FS,FLAME_FS,SMOKE_FS,billboard,towardCam,variantGroups,tileFractureFS}=VFX.lib;
VFX.palette("Embestida",["#F39C12","#E74C3C"]);

// colores fijos de la tabla: negro carbón y grietas incandescentes
const CARBON="vec3(.118,.118,.118)", CRACK="vec3(1.,.341,.133)";
// tiempos: ignición → carrera → impacto; X0 = salida (tras el leve retroceso), XE = contacto, XS = parada (casilla delante del rival)
const TR=0.6,TI=1.4,X0=-3.85,XE=2.6,XS=2.4,PW=1.8,LZ=-1.0,TP=V3(3.4,0,0);
const runX=t=>t<TR?-3.7-0.15*ss(0.15,TR,t):(t<TI?X0+(XE-X0)*Math.pow((t-TR)/(TI-TR),PW):XE-(XE-XS)*ss(TI,TI+0.35,t));
const bobY=t=>{const k=(t-TR)/(TI-TR);return k>0&&k<1?0.09*Math.abs(Math.sin((t-TR)*19)):0;};
const leanR=t=>0.12*ss(0,TR,t)-0.42*ss(TR,TR+0.15,t)+0.3*ss(TI,TI+0.3,t);
// el mismo movimiento en GLSL (estelas y huellas lo leen sin estado)
const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float X0=${f(X0)};const float XE=${f(XE)};const float XS=${f(XS)};
float runX(float t){if(t<TR)return -3.7-.15*smoothstep(.15,TR,t);
 if(t<TI)return X0+(XE-X0)*pow((t-TR)/(TI-TR),${f(PW)});return XE-(XE-XS)*smoothstep(TI,TI+.35,t);}
float bobY(float t){float k=(t-TR)/(TI-TR);return (k>0.&&k<1.)?.09*abs(sin((t-TR)*19.)):0.;}
float leanR(float t){return .12*smoothstep(0.,TR,t)-.42*smoothstep(TR,TR+.15,t)+.3*smoothstep(TI,TI+.3,t);}
float stepT(float x){return TR+(TI-TR)*pow(clamp((x-X0)/(XE-X0),0.,1.),${f(1/PW)});}`;

const IDS=["vfx_dest_fire_aura","vfx_dest_eye_trail","vfx_dest_sonic_cone","vfx_dest_magma_footprints","vfx_dest_seismic_explosion","vfx_dest_shockwave_ring"];
const [P_AURA,P_EYE,P_CONE,P_FOOT,P_EXPL,P_RING]=IDS;

const embestida={key:"duo_embestida",name:"Embestida Destructiva",tier:3,dur:3.2,ti:TI,pal:"Embestida",allies:1,
  variants:[["full","Completo"],[P_AURA,"Aura ígnea"],[P_EYE,"Estela de ojos"],[P_CONE,"Cono Mach-1"],[P_FOOT,"Huellas de magma"],[P_EXPL,"Detonación"],[P_RING,"Onda expansiva"]],
  v:"full",vlabel:"Pieza",
  phases:[["Ignición",0],["Carrera",TR],["Impacto",TI],["Onda",TI+0.2],["Disipación",TI+0.7]],
build(a){
  const VG=variantGroups(a,IDS);
  for(const id of IDS)VG[id].n=0;
  const tmp=V3(0,0,0);

  // ---------------------------------------------------------------
  // 1.1 · AURA DE FURIA ÍGNEA — vaina de fuego + 35 llamas y brasas por personaje (siguen y se inclinan con ellos)
  // ---------------------------------------------------------------
  const GA=VG[P_AURA], auraU={uK:{value:0},uRun:{value:0}};
  const PU=()=>Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},auraU);
  const followers=[];   // grupos que siguen a un personaje: {g, z}
  const follow=(parent,z)=>{const g=new THREE.Group();parent.add(g);followers.push({g,z});return g;};
  const shells=[];
  for(const z of [0,LZ]){
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.58,2.0,40,10,true),fx(fireFS(2.0,4.2)));sh.position.y=1.0;
    follow(GA.mesh,z).add(sh); shells.push(sh);
    const gp=follow(GA.part,z);
    // llamas ascendentes en un cilindro emisor alrededor del cuerpo; al correr se tumban hacia atrás
    GA.n+=points(gp,35,`uniform float uK;uniform float uRun;void main(){float life=.5+aSeed.y*.3;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;float rad=.4+.14*r.y;
     vec3 p=vec3(cos(an)*rad-age*uRun*.9,.08+age*(1.45+.55*r.z),sin(an)*rad)+vec3(sin(age*7.+r.z*9.)*.05,0.,0.);
     vA=(k>=1.)?sin(age*3.14159)*uK:0.;put(p,(.24+.14*r.z)*(1.-age*.45));}`,FLAME_FS,{uniforms:PU()});
    // brasas naranjas que saltan y parpadean
    GA.n+=points(gp,30,`uniform float uK;uniform float uRun;void main(){float life=.4+aSeed.y*.35;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;float rad=.35+.3*r.y;
     vec3 p=vec3(cos(an)*rad-age*uRun*1.6,.2+r.z*1.4+age*(1.+.8*r.y),sin(an)*rad);
     vA=(k>=1.)?(1.-age)*(.55+.45*sin(age*40.+r.x*30.))*uK:0.;
     put(p,.035+.035*r.z);vMix=.15*r.z;}`,null,{uniforms:PU()});
  }

  // ---------------------------------------------------------------
  // 1.2 · ESTELA DE OJOS CARMESÍ — cinta continua de 10 vértices por ojo; el VS reconstruye la posición de la
  //       cabeza en el pasado (t − u·0.32 s), así que la cinta es pura función del tiempo
  // ---------------------------------------------------------------
  const GE=VG[P_EYE];
  const RIB_VS=`uniform float uT;uniform vec3 uO;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
  ${C}
  void main(){vUv=uv;float u=uv.x;float s=uv.y*2.-1.;
   float t=max(uT-u*.32,0.);float r=leanR(t);
   vec3 p=vec3(runX(t)+.23*cos(r)-1.66*sin(r),.23*sin(r)+1.66*cos(r)+bobY(t),uO.x);
   p.y+=s*.075*(1.-u*.8);
   vP=vec3(u,s,0.);vN=vec3(0.,0.,1.);vV=vec3(0.,0.,1.);
   gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
  const RIB_FS=`void main(){float u=vP.x;float s=abs(vP.y);
   float n=noise(vec3(u*9.-uT*14.,s*3.,uT*3.));
   float core=smoothstep(.45,0.,s);float body=smoothstep(1.,.2,s+(n-.5)*.4);
   float al=(body*.75+core)*pow(1.-u,1.4)*uA;
   gl_FragColor=vec4(uC2*1.9+vec3(1.,.8,.75)*core*(1.-u)*.9,al);}`;
  const ribbons=[];
  for(const z of [0.1,-0.1,LZ+0.1,LZ-0.1]){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1,9,1),fxU(RIB_FS,{uO:{value:V3(z,0,0)}},{vertexShader:RIB_VS}));
    m.frustumCulled=false; GE.trail.add(m); ribbons.push(m);
  }
  // brillo carmesí en los ojos de ambos
  const eyeGlows=[0,LZ].map(z=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.62),fx(`void main(){vec2 p=(vUv-.5)*2.;
    float e=smoothstep(.22,0.,length((abs(p)-vec2(.22,0.))*vec2(1.,2.4)));float h=pow(max(0.,1.-length(p)),2.5)*.5;
    gl_FragColor=vec4(uC2*1.8+vec3(1.,.85,.8)*e*.7,(e+h)*uA);}`,{depthTest:false}));m.userData.z=z;GE.mesh.add(m);return m;});

  // ---------------------------------------------------------------
  // 1.3 · CONO DE CHOQUE MACH-1 — cono abierto (sin base) con el vértice hacia +x, vetas de aire que fluyen hacia atrás
  // ---------------------------------------------------------------
  const GC=VG[P_CONE], coneG=new THREE.Group(); GC.mesh.add(coneG);
  const CONE_FS=`void main(){float l=vP.x+.5;float an=atan(vP.z,vP.y);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float st=noise(vec3(an*3.,l*5.+uT*20.,uT*2.))*.65+noise(vec3(an*7.,l*11.+uT*32.,1.))*.35;
   float rip=band(fract(l*3.5+uT*7.),.5,.07)*(.5+.5*noise(vec3(an*4.,uT*5.,2.)));
   vec3 c=mix(uC1*1.2,vec3(1.),smoothstep(.45,1.,l)*.85);
   float al=(fr*.45+smoothstep(.55,.85,st)*.45+rip*.3+.05)*smoothstep(0.,.35,l)*uA;
   gl_FragColor=vec4(c*1.4,al);}`;
  const coneGeo=new THREE.ConeGeometry(1,1,56,10,true).rotateZ(-Math.PI/2);
  const cone=new THREE.Mesh(coneGeo,fx(CONE_FS)), coneIn=new THREE.Mesh(coneGeo,fx(CONE_FS));
  cone.scale.set(1.8,1.3,1.3); coneIn.scale.set(1.35,0.85,0.85); coneIn.position.x=0.25; coneG.add(cone,coneIn);
  // líneas de velocidad: trazos blancos que pasan por la superficie del cono hacia atrás
  const coneU={uK:{value:0}}, coneP=new THREE.Group(); GC.part.add(coneP);
  GC.n+=points(coneP,90,`uniform float uK;void main(){float k=fract(aSeed.x+uT*2.6);float an=aSeed.z*6.2832;
   float l=1.-k;float rad=(1.-l)*1.25*(.75+.3*aSeed.w);
   vec3 p=vec3(.9-k*2.2,sin(an)*rad,cos(an)*rad);
   vA=sin(k*3.14159)*uK*.8;put(p,.16+.1*aSeed.y);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float a=smoothstep(.07,0.,abs(q.y))*smoothstep(.5,.05,abs(q.x))*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(1.),uC1,.25+.4*vMix)*1.5,a);}`,{uniforms:Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},coneU)});

  // ---------------------------------------------------------------
  // 1.4 · CRÁTERES DE HUELLAS DE MAGMA — una huella por casilla pisada (6 por carril), cada una nace cuando el
  //       personaje pasa por ella (stepT invierte la carrera) y persiste 1,5 s; 8 humos grises por huella
  // ---------------------------------------------------------------
  const GF=VG[P_FOOT], FW=6.6, FD=2.4, FCX=-0.45, FCZ=-0.5;
  const FOOT=`${C}
  float footAge(out vec2 q,out float seed){vec2 w=vec2(${f(FCX)}+vP.x,${f(FCZ)}+vP.z);
   float i=clamp(floor(w.x+3.2),0.,5.);float fx0=-2.7+i;float lz=w.y>-.5?0.:-1.;
   q=vec2(w.x-fx0,w.y-lz);seed=i*3.1+lz*7.3;return uT-stepT(fx0);}`;
  const footChar=groundPlane(FW,FCX,0.018,fx(FOOT+`void main(){vec2 q;float sd;float ag=footAge(q,sd);if(ag<0.)discard;
   float n=noise(vec3(q*6.,sd));float R=.44*(1.-.6*exp(-ag*16.));
   float r=length(q*vec2(.9,1.1))+(n-.5)*.14;
   float m=smoothstep(R,R*.7,r)*.88+smoothstep(R*1.5,R*.8,r)*.25;
   float life=1.-smoothstep(1.,1.5,ag);
   gl_FragColor=vec4(${CARBON}*(.75+.5*n),m*life*uA);}`,NB),FD);
  footChar.position.z=FCZ;
  const footGlow=groundPlane(FW,FCX,0.024,fx(FOOT+`void main(){vec2 q;float sd;float ag=footAge(q,sd);if(ag<0.)discard;
   float an=atan(q.y,q.x);float j=noise(vec3(q*5.,sd+2.))-.5;
   float R=.44*(1.-.6*exp(-ag*16.));float r=length(q*vec2(.9,1.1))+j*.06;
   float rays=pow(1.-abs(fract(an*1.11+j*.6+sd*.13)*2.-1.),16.)+pow(1.-abs(fract(an*1.75+j+.4)*2.-1.),22.);
   float cr=rays*smoothstep(R*1.25,R*.25,r);float rim=band(r,R*.82,.045);float pool=smoothstep(R*.4,0.,r);
   float heat=exp(-ag*1.5)*.85+.15;float life=1.-smoothstep(1.,1.5,ag);
   gl_FragColor=vec4(${CRACK}*(1.1+1.8*heat)+vec3(1.,.9,.6)*pool*exp(-ag*4.),(cr*1.2+rim*.7+pool*heat)*heat*life*uA);}`),FD);
  footGlow.position.z=FCZ;
  GF.decal.add(footChar,footGlow);
  // humo: 12 huellas × 8 partículas; gl_VertexID asigna cada grupo de 8 a su huella
  GF.n+=points(GF.part,96,C+`void main(){float id=float(gl_VertexID);float fp=floor(id/8.);float j=id-fp*8.;
   float lane=floor(fp/6.);float i=fp-lane*6.;float fx0=-2.7+i;float lz=-lane;
   float s=stepT(fx0)+.04+j*.03;float life=1.+aSeed.y*.4;float t=uT-s;float age=t/life;float c=max(t,0.);vec3 r=rnd();
   vec3 p=vec3(fx0+r.x*.25-c*.35+sin(c*3.+aSeed.w*6.)*.07,.06+c*(.55+.5*aSeed.z),lz+r.z*.25);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.7:0.;put(p,(.24+.18*aSeed.w)*(.6+age*1.3));}`,SMOKE_FS("vec3(.4,.39,.4)"),NB);

  // ---------------------------------------------------------------
  // 1.5 · DETONACIÓN SÍSMICA — esfera de fuego que escala rápido (600 ms), capa de humo carbón, 30 rocas dodecaedro
  //       con gravedad, brasas, chispas y fractura de baldosa (nivel 3) bajo el rival
  // ---------------------------------------------------------------
  const GX=VG[P_EXPL];
  const fireball=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(`void main(){vec3 q=normalize(vP);
   float n=noise(q*3.2+vec3(0.,-uT*2.5,0.))*.6+noise(q*7.+vec3(uT*3.))*.4;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float th=uP*1.1-.2;if(n<th)discard;float edge=smoothstep(.14,0.,n-th);
   float heat=1.-uP;
   vec3 c=mix(uC2,uC1,clamp(n*heat+(1.-fr)*.6*heat,0.,1.))+vec3(1.,.95,.8)*pow(1.-fr,2.)*heat*heat*1.4+${CRACK}*edge*1.3;
   gl_FragColor=vec4(c*1.5,(.3+.7*(1.-fr*.6))*(1.-uP*.6)*uA);}`));
  const smoke=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(`void main(){vec3 q=normalize(vP);
   float n=noise(q*3.8+vec3(0.,-uT*1.4,0.))*.6+noise(q*9.+vec3(uT))*.4;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float m=smoothstep(.36+uP*.4,.58+uP*.35,n);if(m<.01)discard;
   vec3 c=mix(${CARBON},${CRACK}*.8,smoothstep(.72,.92,n)*(1.-uP));
   gl_FragColor=vec4(c,m*.85*(1.-fr*.55)*uA);}`,NB));
  fireball.position.set(TP.x,0.6,0); GX.mesh.add(smoke,fireball);
  // rocas: carbón con grietas de magma que se enfrían (uA = calor compartido)
  const rockMat=fx(`void main(){float n=noise(vP*5.)*.6+noise(vP*12.)*.4;
   float lit=.35+.65*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float cr=pow(1.-abs(noise(vP*3.5+3.)*2.-1.),9.);
   vec3 c=${CARBON}*(.7+.7*n)*lit*1.6+${CRACK}*cr*(.25+2.4*uA)+uC1*smoothstep(.72,.95,n)*uA*.5;
   gl_FragColor=vec4(c,1.);}`,SOLID);
  const rockGeo=new THREE.DodecahedronGeometry(1,0), rocks=[], G=9.8;
  for(let i=0;i<30;i++){
    const an=Math.random()*Math.PI*2, h=1.0+3.0*Math.random(), s=0.08+0.13*Math.random(), y0=0.25+0.35*Math.random();
    const vy=3.2+5.0*Math.random(), tl=(vy+Math.sqrt(vy*vy+2*G*(y0-s)))/G;
    const m=new THREE.Mesh(rockGeo,rockMat);
    m.userData={p0:V3(TP.x+Math.cos(an)*0.35,y0,Math.sin(an)*0.35),v:V3(Math.cos(an)*h,vy,Math.sin(an)*h),s,tl,
      spin:V3(Math.random()*14-7,Math.random()*14-7,Math.random()*14-7)};
    rocks.push(m); GX.mesh.add(m);
  }
  const XC=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};`;
  // brasas despedidas con gravedad
  GX.n+=points(GX.part,170,XC+`void main(){float s=TI+aSeed.x*.12;float life=.7+aSeed.y*.7;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.9,0.));vec3 p=TP+vec3(0.,.6,0.)+d*(2.5+4.*aSeed.z)*t+vec3(0.,-5.5*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*35.+aSeed.w*40.)):0.;put(p,(.05+.07*aSeed.w)*(1.-age*.5));}`);
  GX.n+=sparks(GX.part,260,TI,`${f(TP.x)},.7,0.`,"0.,.65,0.",5,13,4);
  // fractura de baldosa gigante: sigue al rival en su retroceso
  const FS=7.0, frac=groundPlane(FS,TP.x,0.025,fx(tileFractureFS(FS))); GX.decal.add(frac);

  // ---------------------------------------------------------------
  // 1.6 · ANILLO DE ONDA EXPANSIVA — anillo plano a y=0.05 que crece de 0.2 a 3.5 m en 450 ms levantando polvo
  // ---------------------------------------------------------------
  const GR=VG[P_RING];
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.8,1.0,128,1).rotateX(-Math.PI/2),fx(`void main(){float r=(length(vP.xz)-.8)/.2;
   float an=atan(vP.z,vP.x);float n=noise(vec3(an*8.,r*3.,uT*6.));
   float edge=smoothstep(.75,1.,r)*smoothstep(1.,.93,r);float tail=pow(max(r,0.),2.5)*.5;
   vec3 c=mix(uC2,uC1,r)*1.5+vec3(1.,.95,.85)*edge*(1.-uP)*.8;
   gl_FragColor=vec4(c,(edge+tail)*(.6+.4*n)*uA);}`));
  ring.position.set(TP.x,0.05,0); GR.decal.add(ring);
  GR.n+=points(GR.part,160,XC+`void main(){float s=TI+aSeed.x*.42;float pr=(s-TI)/.45;float R=.2+3.3*(1.-(1.-pr)*(1.-pr));
   float an=aSeed.z*6.2832;float t=max(uT-s,0.);float life=.8+aSeed.y*.6;float age=(uT-s)/life;
   vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=TP+d*(R+.7*(1.-exp(-t*2.5))*(.4+aSeed.w))+vec3(0.,.08+(.3+.7*aSeed.y)*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.9:0.;put(p,(.35+.4*aSeed.w)*(.6+age*.9));}`,DUST_FS,NB);

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const id of IDS)for(const l of VFX.LK)VG[id][l].visible=v==="full"||v===id;
    a.count=IDS.reduce((s,id)=>s+((v==="full"||v===id)?VG[id].n:0),0);};

  const fb=V3(0,0,0);
  a.pose=function(te,o){
    const v=a.v, full=v==="full", sh=id=>full||v===id;
    const ia=te-TI, x=runX(te), y=bobY(te), r=leanR(te), run=te>=TR&&te<TI?(te-TR)/(TI-TR):0;
    // el dúo: Sapidae en z=0 y su Axie en paralelo (z=-1); los dos se mueven en todas las variantes
    caster.position.set(x,y,0); caster.rotation.z=r;
    const ax=allies[0]; ax.position.set(x,y,LZ); ax.rotation.z=r;
    for(const fl of followers){fl.g.position.set(x,y,fl.z);fl.g.rotation.z=r;}
    // 1.1 aura
    const aEnv=ss(0.05,0.4,te)*(1-ss(TI+0.5,TI+1.3,te)), pump=1+0.35*Math.exp(-Math.max(ia,0)*5)*(ia>=0?1:0);
    auraU.uK.value=aEnv; auraU.uRun.value=te<TI?Math.pow(run,0.6):Math.max(0,1-(te-TI)/0.3);
    for(const s of shells)set(s,0.3+0.6*Math.min(run*1.4,1),aEnv*0.75*pump);
    if(sh(P_AURA)){for(const m of [caster.userData.m,ax.userData.m]){m.emissive.copy(U.uC1.value);m.emissiveIntensity=0.45*aEnv*(1+0.25*Math.sin(te*17));}}
    // 1.2 estela de ojos
    const eA=ss(TR-0.1,TR+0.12,te)*(1-ss(TI+0.15,TI+0.55,te));
    for(const m of ribbons)m.material.uniforms.uA.value=eA;
    const gA=ss(0.15,TR,te)*(1-ss(TI+0.5,TI+1.1,te));
    for(const m of eyeGlows){tmp.set(x+0.23*Math.cos(r)-1.66*Math.sin(r),0.23*Math.sin(r)+1.66*Math.cos(r)+y,m.userData.z);
      towardCam(m.position,tmp,0.3); billboard(m); m.visible=gA>0.001; m.material.uniforms.uA.value=gA;}
    // 1.3 cono Mach-1
    const cA=ss(TR+0.08,TR+0.35,te)*(1-ss(TI-0.03,TI+0.07,te)), ck=0.6+0.5*run;
    coneG.visible=coneP.visible=cA>0.001; coneG.position.set(x+0.78,0.95+y,LZ/2); coneG.scale.set(ck,0.8+0.25*run,0.8+0.25*run);
    coneP.position.copy(coneG.position);
    cone.material.uniforms.uA.value=cA; coneIn.material.uniforms.uA.value=cA*0.7; coneU.uK.value=cA;
    // 1.4 huellas: el shader decide nacimiento y persistencia
    footChar.material.uniforms.uA.value=1; footGlow.material.uniforms.uA.value=1;
    // 1.5 detonación
    let p=cl(ia/0.6);
    fireball.visible=ia>=0&&p<1; fireball.scale.setScalar(0.35+2.1*(1-Math.pow(1-p,3))); set(fireball,p,ia>=0?1:0);
    const p2=cl((ia-0.08)/0.95);
    smoke.visible=ia>=0.08&&p2<1; smoke.position.set(TP.x,0.6+0.9*p2,0); smoke.scale.setScalar(0.7+2.3*(1-Math.pow(1-p2,2)));
    set(smoke,p2,ss(0,0.15,p2)*(1-ss(0.5,1,p2)));
    for(const m of rocks){const u=m.userData,t=Math.max(ia,0),tt=Math.min(t,u.tl);
      m.visible=ia>=0&&ia<1.9;
      m.position.copy(u.p0).addScaledVector(u.v,tt); m.position.y-=0.5*G*tt*tt;
      m.rotation.set(u.spin.x*tt,u.spin.y*tt,u.spin.z*tt); m.scale.setScalar(Math.max(u.s*(1-ss(1.3,1.9,ia)),0.001));}
    rockMat.uniforms.uA.value=ia>=0?Math.exp(-ia*1.1):1;
    // el rival sale despedido de su casilla y vuelve
    const hit=ia>=0?Math.exp(-ia*2.6):0;
    target.position.x=TP.x+0.75*hit*(1-Math.exp(-Math.max(ia,0)*18)); target.position.y=ia>=0?0.35*Math.sin(Math.PI*cl(ia/0.45)):0;
    target.rotation.z=-0.5*hit*Math.cos(ia*10);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,3.15,te):0);
    // 1.6 onda
    p=cl(ia/0.45); ring.visible=ia>=0&&p<1; ring.scale.setScalar(0.2+3.3*(1-Math.pow(1-p,2))); set(ring,p,ia>=0?Math.pow(1-p,0.7):0);
    // resplandor y luz: siguen al punto caliente de cada pieza visible
    o.ga=0; o.li=0; o.gs=2;
    if(te<TI){
      if(te<TR)o.g.set(x,1.0,LZ/2); else o.g.set(x+1.2,0.95+y,LZ/2);
      if(sh(P_AURA)){o.ga+=0.35*aEnv;o.li+=3.5*aEnv;o.gs=2.4;}
      if(sh(P_CONE)){o.ga+=0.4*cA;o.li+=5*cA;o.gs=2.4;}
      if(sh(P_EYE)&&!full){o.g.set(x+0.3,1.66+y,LZ/2);o.ga+=0.25*gA;o.li+=1.5*gA;o.gs=1.2;}
      if(sh(P_FOOT)&&!full&&te>=TR){o.g.set(x-0.3,0.15,LZ/2);o.ga+=0.2;o.li+=2.5;o.gs=1.4;}
    }else{
      fb.set(TP.x,0.8,0); o.g.copy(fb);
      if(sh(P_EXPL)){o.gs=2.6+6*Math.min(ia,0.6);o.ga+=Math.exp(-ia*7)*0.95;o.li+=17*Math.exp(-ia*3.5);}
      if(sh(P_RING)){o.gs=Math.max(o.gs,2+4*cl(ia/0.45));o.ga+=0.3*Math.exp(-ia*8);o.li+=5*Math.exp(-ia*5);}
      if(sh(P_AURA)){o.g.set(x,1.0,LZ/2);o.ga+=0.2*aEnv;o.li+=2*aEnv;}
      if(sh(P_FOOT)&&!full){o.g.set(0,0.2,LZ/2);o.gs=3;o.ga+=0.1*(1-cl(ia/1.4));o.li+=2*(1-cl(ia/1.4));}
    }
    o.ld=full||sh(P_EXPL)?16:12;
    const heavy=sh(P_EXPL)||sh(P_RING);
    o.ia=ia; o.c.set(TP.x,0.7,0); o.shake=heavy?1.7:0; o.dist=heavy?1.3:0.35;
    o.white=(full||v===P_EXPL)&&ia>=0&&ia<0.2?0.55*Math.exp(-ia*22):0;
    o.dark=full?0.3*ss(0,TR,te)*(1-ss(2.3,3.1,te)):0;
    o.em=sh(P_EXPL)?0.5*hit:0; o.emc.copy(U.uC1.value);
  };
}};

VFX.module("Sapidae · Dúo",[embestida]);
})();

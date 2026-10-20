// =====================================================================
// MÓDULO · CLASE PLANTA (OREJAS)
// Los Axies ya tienen orejas: aquí no se dibuja ninguna. Los efectos nacen de su posición (≈ (-3.72,1.82,±0.26))
// como destellos, savia, gotas o pétalos. Estética vegetal: verdes, maderas, flores, frutas, savia y rocío.
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,sparks,RING_FS,camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,DUST_FS,STAR4_FS,SMOKE_FS,SD_HEART,SLASH_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;
VFX.palette("Remolacha",["#ff5c9e","#8c0f4a"]);
VFX.palette("Loto",["#b8f4ff","#2f8fd0"]);
VFX.palette("Sakura",["#ffd6ea","#ff5fa2"]);
VFX.palette("Musgo",["#c8ff7e","#4f7d2a"]);

const TC=V3(3.15,1.2,0), PI=Math.PI;                    // pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0), UP=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const backOut=x=>{x=cl(x);const s=1.9;return 1+(s+1)*Math.pow(x-1,3)+s*Math.pow(x-1,2);};
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.42+.58*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
// orejas: posición relativa al lanzador; earW la lleva al mundo siguiendo su inclinación
const EO=[V3(-0.02,1.82,-0.26),V3(-0.02,1.82,0.26)], EAR=EO.map(e=>e.clone().add(V3(-3.7,0,0)));
const earW=(i,out)=>{const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),e=EO[i];
  return out.set(caster.position.x+e.x*c-e.y*s,caster.position.y+e.x*s+e.y*c,caster.position.z+e.z);};
const EARS=`const vec3 E0=${v3(EAR[0])};const vec3 E1=${v3(EAR[1])};vec3 ear(float s){return s<.5?E0:E1;}
vec3 bz(vec3 a,vec3 b,vec3 c,float k){return mix(mix(a,b,k),mix(b,c,k),k);}`;

// ---------- partículas propias: como points() del motor, con duplicados (estelas sin estado) y varyings de giro ----------
// aK = índice de muestra dentro de la estela (0 = cabeza), aI = índice de la partícula; vR = giro, vK = libre
const PTH=HEAD+`uniform float uPx;uniform float uE;attribute vec4 aSeed;attribute float aK;attribute float aI;
varying float vA;varying float vMix;varying float vR;varying float vK;
vec3 rnd(){return vec3(aSeed.y,aSeed.z,aSeed.w)*2.-1.;}
vec3 rr(float c){return vec3(hash(vec3(aSeed.x*37.1,aSeed.y*53.7,c*1.31)),hash(vec3(aSeed.z*41.3,c*1.71,aSeed.w*29.9)),hash(vec3(c*2.17,aSeed.w*61.3,aSeed.x*17.9)));}
void put(vec3 p,float size){vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(size,0.)*uPx/-mv.z;vMix=aSeed.w;vR=0.;vK=0.;}`;
function ptsK(parent,n,dup,vs,fs,opts){
  const N=n*dup,g=new THREE.BufferGeometry(),k=new Float32Array(N),id=new Float32Array(N);
  for(let i=0;i<N;i++){k[i]=i%dup;id[i]=Math.floor(i/dup);}
  g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(N*3),3));
  g.setAttribute("aSeed",new THREE.BufferAttribute(VFX.seeds(n,dup),4));
  g.setAttribute("aK",new THREE.BufferAttribute(k,1)); g.setAttribute("aI",new THREE.BufferAttribute(id,1));
  const m=new THREE.ShaderMaterial(Object.assign({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},vertexShader:PTH+vs,
    fragmentShader:fs||VFX.PT_FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending},opts||{}));
  const p=new THREE.Points(g,m); p.frustumCulled=false; parent.add(p); return N;
}
const pts=(parent,n,vs,fs,opts)=>ptsK(parent,n,1,vs,fs,opts);
const NBo={blending:THREE.NormalBlending};

// ---------- fragmentos de partícula del módulo ----------
const G2=`vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
const PF=HEAD+`varying float vA;varying float vMix;varying float vR;varying float vK;`+G2;
// hoja de otoño afilada (dentada, nervio central); vK>.5 = punto de estela verde
const LEAFA_FS=PF+`void main(){vec2 q=gl_PointCoord-.5;
 if(vK>.5){float d=length(q);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(vec3(.4,1.,.3),uC1,.4)*1.4,a);return;}
 q=rot2(q,vR);float y=q.y*2.3;float w=.2*(1.-y*y)*(1.+.3*abs(sin(q.y*38.)));
 float a=smoothstep(w,w-.05,abs(q.x))*step(abs(y),1.)*vA;if(a<.003)discard;
 float vein=smoothstep(.025,0.,abs(q.x));
 vec3 au=vMix<.4?vec3(1.,.45,.08):(vMix<.75?vec3(.86,.14,.05):vec3(1.,.78,.16));
 vec3 c=au*(1.15-abs(q.x)*2.)+vec3(1.,.85,.5)*vein*.35+vec3(.4,1.,.3)*smoothstep(w-.06,w,abs(q.x))*.45;
 gl_FragColor=vec4(c,a);}`;
// hoja verde que gira
const LEAFG_FS=PF+`void main(){vec2 q=rot2(gl_PointCoord-.5,vR);float y=q.y*2.2;float w=.24*(1.-y*y);
 float a=smoothstep(w,w-.05,abs(q.x))*step(abs(y),1.)*vA;if(a<.003)discard;
 float vein=smoothstep(.02,0.,abs(q.x));
 vec3 c=mix(vec3(.12,.42,.1),vec3(.45,.85,.25),vMix)*(1.1-abs(q.x)*1.8)+vec3(.7,1.,.5)*vein*.3;
 gl_FragColor=vec4(c,a);}`;
// pétalo con muesca; vK = escala horizontal (vuelco falso en 3D)
const PETAL_FS=(cIn,cOut)=>PF+`void main(){vec2 q=rot2(gl_PointCoord-.5,vR);q.x/=max(abs(vK),.2);
 float d=length(q*vec2(1.7,1.05)+vec2(0.,.04));float notch=smoothstep(.05,.1,length(q-vec2(0.,-.46)));
 float a=smoothstep(.42,.35,d)*notch*vA;if(a<.003)discard;
 vec3 c=mix(${cOut},${cIn},smoothstep(-.35,.4,q.y))*(1.05-d*.5)+uC1*.12;
 gl_FragColor=vec4(c*1.15,a);}`;
// gota cristalina: lágrima con borde refractado y brillo
const DROP_FS=PF+`void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;
 float w=.17*clamp(1.-(q.y+.06)/.42,0.,1.);float dc=q.y>-.06?abs(q.x)-w:1.;
 float d=min(length(q-vec2(0.,-.06))-.17,dc);
 float body=smoothstep(.02,-.02,d);float rim=smoothstep(.05,0.,abs(d+.025));float hl=smoothstep(.06,0.,length(q-vec2(-.06,-.02)));
 float a=(body*.3+rim*.8+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.4+.6*rim)*(.6+rim)+vec3(1.)*hl,a);}`;
// jugo de remolacha (mezcla normal): gota irregular con brillo húmedo
const JUICE_FS=PF+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q)+(noise(vec3(q*9.,vMix*30.))-.5)*.14;
 float a=smoothstep(.42,.32,d)*vA;if(a<.003)discard;float hl=smoothstep(.12,0.,length(q-vec2(-.1,-.1)));
 gl_FragColor=vec4(mix(vec3(.4,0.,.12),mix(vec3(.92,.06,.32),uC1,.25),smoothstep(.42,0.,d))+vec3(1.,.8,.9)*hl*.6,a);}`;
// terrón / astilla (mezcla normal); vK>.5 = astilla de madera alargada
const SOIL_FS=PF+`void main(){vec2 q=rot2(gl_PointCoord-.5,vR);
 float d=vK>.5?abs(q.x)*3.2+abs(q.y)*1.05:abs(q.x)*1.2+abs(q.y)*1.6;
 d+=(hash(vec3(floor(gl_PointCoord*4.),vMix*9.))-.5)*.1;
 float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
 vec3 c=vK>.5?mix(vec3(.3,.18,.09),vec3(.75,.58,.36),vMix):mix(vec3(.14,.09,.05),vec3(.38,.26,.15),vMix);
 gl_FragColor=vec4(c*(1.25-d),a);}`;
// "Z" del sueño (azul fijo: el estado Sueño tiene color propio)
const Z_FS=PF+`void main(){vec2 q=rot2((gl_PointCoord-.5)*vec2(1.,-1.),vR);
 float d=min(min(sdSeg(q,vec2(-.24,.26),vec2(.24,.26)),sdSeg(q,vec2(.24,.26),vec2(-.24,-.26))),sdSeg(q,vec2(-.24,-.26),vec2(.24,-.26)));
 float core=smoothstep(.07,.04,d);float gl=smoothstep(.24,0.,d)*.45;
 float a=(core+gl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.4,.58,1.),vec3(.95,.97,1.),core)*1.3,a);}`;
// trébol de cuatro hojas (cuatro corazones con la punta en el centro)
const SD_CLOVER=SD_HEART+`float sdClover(vec2 p){float d=1e5;for(int i=0;i<4;i++){vec2 q=rot2(p,float(i)*1.5708+.7854);d=min(d,sdHeart(q*1.25)/1.25);}return d;}`;
const CLOVER_FS=PF+SD_CLOVER+`void main(){vec2 p=rot2((gl_PointCoord-.5)*2.,vR);
 if(vK>.5){float d=length(p);float a=smoothstep(1.,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(uC1,vec3(1.),.2)*1.3,a);return;}
 float d=sdClover(p);float body=smoothstep(.03,-.03,d);float rim=smoothstep(.09,0.,abs(d));float gl=smoothstep(.45,0.,d)*.35;
 float a=(body*.75+rim*.6+gl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.35+.65*rim)*1.4+vec3(1.)*rim*.35,a);}`;
// burbuja morada de estado alterado
const PBUB_FS=PF+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float ring=smoothstep(.07,0.,abs(d-.38))*.9+smoothstep(.5,0.,d)*.12;float hl=smoothstep(.13,0.,length(q-vec2(-.14,-.14)));
 float a=(ring+hl*.8)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.75,.35,1.),vec3(.45,.1,.75),vMix)*1.2+vec3(hl*.5),a);}`;
// mota de savia verde (para paletas que no son verdes)
const SAP_FS=PF+`void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.45,1.,.35),vec3(1.),smoothstep(.2,0.,d)*.5)*1.3,a);}`;

// ---------- piezas de malla compartidas ----------
// destello en la oreja: estrella de cuatro puntas en billboard (luz, no anatomía)
const FLARE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 float star=pow(max(0.,1.-abs(p.x*p.y)*16.),3.)*smoothstep(1.,.05,r);float gl=pow(max(0.,1.-r),2.5);
 gl_FragColor=vec4(mix(uC1,vec3(1.),gl*.5)*1.5,(gl+star*.7)*uA);}`;
function mkFlares(L,s){const m=fx(FLARE_FS,{depthTest:false});
  return [0,1].map(()=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(s||0.7,s||0.7),m);L.mesh.add(p);return p;});}
function flares(F,a,spin){F.forEach((m,i)=>{towardCam(m.position,earW(i,tmp),0.3);billboard(m,spin||0);m.visible=a>0.002;});F[0].material.uniforms.uA.value=a;}
// casilla de 1,4 u. con borde brillante: marca de suelo
const gp=(s,x,z,mat,y)=>{const m=groundPlane(s,x,y||0.02,mat);m.position.z=z||0;return m;};

// =====================================================================
// 1 · BEETROOT — una remolacha gigante se materializa en el cielo sobre el rival, cae como un mazo,
//     lo aplasta, salpica jugo y tierra y luego revienta en jugo
// =====================================================================
const beet={key:"poBeetroot",name:"Beetroot",dur:2.2,ti:0.86,pal:"Remolacha",
  phases:[["Brote",0],["Materialización",0.22],["Caída",0.62],["Impacto",0.86],["Reventón",1.3],["Disipación",1.7]],
build(a){
  const L=a.L,TM=0.22,TF=0.62,TI=0.86,TD=1.3,BP=V3(3.4,4.0,0),YC=1.98,HP=V3(3.4,1.6,0),BS=0.8;
  const F=mkFlares(L,0.6);
  const bA={value:0}, bQ={value:0};                     // brillo y disolución compartidos por toda la remolacha
  const DISS=`uniform float uQ;float diss(vec3 p){return noise(p*5.)*.6+noise(p*13.)*.4-(1.-uQ*1.1);}`;
  // bulbo: torno con estrías horizontales, piel morada y brillo húmedo; al reventar se deshace con borde de jugo
  const prof=[[0,-0.95],[0.03,-0.8],[0.08,-0.62],[0.22,-0.45],[0.42,-0.3],[0.58,-0.1],[0.62,0.05],[0.57,0.22],[0.42,0.38],[0.22,0.48],[0.08,0.52],[0,0.53]];
  const bulb=new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x,y])=>new THREE.Vector2(x,y)),44),fxU(DISS+`
  void main(){float dq=diss(vP);if(uQ>0.&&dq>0.)discard;
   vec3 N=normalize(vN),V=normalize(vV);float n=noise(vP*6.)*.6+noise(vP*17.)*.4;
   float ring=pow(.5+.5*sin(vP.y*38.+n*3.),6.)*.35;
   vec3 base=mix(vec3(.24,.02,.1),vec3(.62,.06,.3),smoothstep(-.6,.45,vP.y)+n*.2);
   base=mix(base,vec3(.38,.24,.16),smoothstep(-.5,-.85,vP.y)*.7);      // raíz terrosa
   float spec=pow(max(dot(reflect(-V,N),normalize(vec3(.3,.8,.5))),0.),24.);
   float fr=pow(1.-abs(dot(N,V)),2.);
   vec3 c=base*${LIT}*(1.-ring)+vec3(1.,.6,.8)*spec*.55+uC1*fr*(.15+.9*uA)+uC1*smoothstep(-.08,0.,dq)*step(.001,uQ)*3.;
   gl_FragColor=vec4(c,1.);}`,{uA:bA,uQ:bQ},SOLID));
  // tallos rojizos y hojas con nervios rojos
  const stemMat=fxU(DISS+`void main(){if(uQ>0.&&diss(vP)>0.)discard;float u=vUv.x;
   vec3 c=mix(vec3(.55,.05,.22),vec3(.3,.55,.15),smoothstep(.3,1.,u))*${LIT}+uC1*uA*.2;gl_FragColor=vec4(c,1.);}`,{uA:bA,uQ:bQ},SOLID);
  const leafMat=fxU(DISS+`void main(){vec2 p=vUv-vec2(.5,0.);
   float w=.46*pow(sin(3.14159*min(vUv.y*.95+.03,1.)),.8)*(1.+.08*sin(vUv.y*40.));if(abs(p.x)>w)discard;
   if(uQ>0.&&diss(vP)>0.)discard;
   float mid=smoothstep(.03,0.,abs(p.x));float side=smoothstep(.07,0.,abs(fract(vUv.y*7.-abs(p.x)*4.)-.5))*.5*smoothstep(0.,.1,abs(p.x));
   float n=noise(vec3(vUv*vec2(10.,20.),3.));
   vec3 g=mix(vec3(.07,.28,.07),vec3(.25,.6,.17),n*.6+abs(p.x)/w*.25);
   vec3 c=mix(g,vec3(.62,.05,.22),max(mid,side*.6))*(.5+.5*abs(dot(normalize(vN),normalize(vec3(.3,.8,.5)))))+uC1*uA*.15;
   gl_FragColor=vec4(c,1.);}`,{uA:bA,uQ:bQ},DS);
  const beetG=new THREE.Group(); beetG.add(bulb); L.mesh.add(beetG);
  const leafGeo=new THREE.PlaneGeometry(0.5,1.0,4,8).translate(0,0.5,0).rotateY(PI/2);
  for(let k=0;k<5;k++){const az=k*PI*2/5+0.3,c=Math.cos(az),s=Math.sin(az),h=0.95+0.12*(k%2);
    beetG.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([V3(0,0.48,0),V3(c*0.1,0.8,s*0.1),V3(c*0.3,h,s*0.3)]),16,6,0.045,0.025),stemMat));
    const lf=new THREE.Mesh(leafGeo,leafMat); lf.position.set(c*0.3,h-0.03,s*0.3); lf.rotation.set(0,-az,-0.55-0.15*(k%2)); beetG.add(lf);}
  // estela de caída: cono abierto de rayas de velocidad sobre la remolacha
  const wake=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.45,2.6,32,1,true),fx(`
  void main(){float h=vP.y/2.6+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*6.,h*3.+uT*9.,0.));float st=smoothstep(.55,.8,noise(vec3(an*11.,h*1.5+uT*14.,2.)));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.5+vec3(.4,.9,.3)*n*.15,(st*.7+fr*.25)*smoothstep(1.,.2,h)*smoothstep(0.,.1,h)*uA);}`));
  wake.scale.setScalar(BS); L.trail.add(wake);
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.8),fx(RING_FS,{depthTest:false})); L.trail.add(ring);
  // suelo: marca de casilla que se cierra hasta el impacto, sombra creciente y onda (sin cráter: nivel 2)
  const mark=gp(1.6,3.4,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sq=max(abs(p.x),abs(p.y))*2.;
   float edge=band(sq,.74,.02)*step(.3,abs(fract(an/6.2832*4.+.125)-.5)*2.);
   float ring=band(r,.92,.015);float conv=band(r,1.-uP*.86,.03+.05*uP);
   float leaf=band(r,.5,.05)*smoothstep(.7,1.,cos(an*4.+uT*2.));
   float fill=smoothstep(.9,0.,r)*.18*uP;float blink=.7+.3*sin(uT*28.)*uP;
   gl_FragColor=vec4(mix(uC2,uC1,ring+conv)*1.4,(edge+ring+conv*1.2+leaf*.6+fill)*blink*uA);}`));
  const shadow=gp(2.0,3.4,0,fx(`void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(vec3(0.),smoothstep(1.,.2,r/max(uP,.05))*.6*uA);}`,NB),0.012);
  const shock=gp(4.5,3.4,0,fx(RING_FS),0.03);
  L.decal.add(mark,shadow,shock);
  const C=EARS+`const float TM=${f(TM)};const float TF=${f(TF)};const float TI=${f(TI)};const float TD=${f(TD)};
  const vec3 BP=${v3(BP)};const vec3 HP=${v3(HP)};const vec3 BC=vec3(3.4,2.25,0.);`;
  // savia magenta que sube de las orejas al punto del cielo
  a.count+=pts(L.part,100,C+`void main(){float s=.04+aSeed.x*.3;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=ear(aSeed.z);vec3 m=mix(e,BP,.5)+vec3(-.5,1.4,(aSeed.z-.5)*1.);vec3 r=rnd();
   vec3 p=bz(e,m,BP,k*k*(3.-2.*k))+r*.12*sin(k*3.14159);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-smoothstep(.85,1.,age)):0.;put(p,.05+.05*aSeed.w);}`);
  // remolino de hojitas que convergen y forman la remolacha
  a.count+=pts(L.part,80,C+`void main(){float s=TM-.08+aSeed.x*.22;float life=.35;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*7.;float rad=mix(1.25,.12,k*k);
   vec3 p=BP+vec3(cos(an)*rad,(aSeed.z-.5)*1.1*(1.-k),sin(an)*rad);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.1+.05*aSeed.w);vR=an*2.;vMix=aSeed.w;}`,LEAFG_FS,NBo);
  // jugo al estrellarse y al reventar (mezcla normal)
  for(const [t0,org,n,up] of [[TI,"HP",130,1.0],[TD,"BC",90,0.6]])
    a.count+=pts(L.part,n,C+`void main(){float s=${f(t0)}+aSeed.x*.06;float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(0.,${f(up)},0.));vec3 v=d*(1.5+3.2*aSeed.z);
     vec3 p=${org}+d*.28+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.02);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.055+.07*aSeed.w)*(p.y<.03?1.4:1.));}`,JUICE_FS,NBo);
  // esquirlas de tierra y polvo desde la casilla
  a.count+=pts(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 dir=vec3(cos(an),0.,sin(an));
   vec3 p=vec3(3.4,.05,0.)+dir*(.45+(1.+1.8*aSeed.w)*t)+vec3(0.,(1.4+2.4*aSeed.y)*t-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.045*aSeed.w);vR=t*(6.+9.*aSeed.y);}`,SOIL_FS,NBo);
  a.count+=pts(L.part,45,C+`void main(){float s=TI+aSeed.x*.15;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.15,0.)+vec3(cos(an),0.,sin(an))*(.5+1.3*(1.-exp(-t*2.5))*(.5+aSeed.w))+vec3(0.,(.2+.35*aSeed.y)*(1.-exp(-t*1.5)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.75:0.;put(p,(.28+.3*aSeed.y)*(.6+age*.8));}`,DUST_FS,NBo);
  a.count+=sparks(L.part,70,TI,"3.4,1.6,0.","0.,.5,0.",2.4,6.5,3);
  // hojas sueltas al reventar
  a.count+=pts(L.part,30,C+`void main(){float s=TD+aSeed.x*.1;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,1.,0.));vec3 p=BC+vec3(0.,.4,0.)+d*1.4*(1.-exp(-t*3.))+vec3(sin(t*5.+aSeed.z*9.)*.25,-1.2*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.13+.06*aSeed.w);vR=t*5.+aSeed.z*6.;}`,LEAFG_FS,NBo);
  a.pose=function(te,o){
    const ia=te-TI, mk=backOut((te-TM)/0.32), k=cl((te-TF)/(TI-TF)), q=ss(TD,TD+0.35,te);
    caster.rotation.z=0.05*ss(0,0.3,te)-0.1*ss(TF-0.1,TF+0.1,te)+0.05*ss(TI,TI+0.5,te);
    flares(F,ss(0,0.08,te)*(1-ss(0.32,0.5,te))+0.4*hitK(te-TF,6)*(te>=TF?1:0),te*2);
    // trayectoria del bulbo
    let y=BP.y+0.08*Math.sin(te*6), sy=1, sxz=1, rz=0.12*Math.sin(te*4);
    if(te>=TF&&te<TI){y=BP.y-(BP.y-YC)*k*k;rz=0.25*(1-k);sy=1+0.12*k;sxz=1-0.05*k;}
    else if(te>=TI){const h=hitK(ia,7);y=YC-0.24*hitK(ia,5)+0.24*ss(TI+0.1,TI+0.4,te);sy=1-0.26*h;sxz=1+0.2*h;rz=0.06*Math.sin(ia*14)*hitK(ia,3);}
    const sc=te<TM?0:BS*mk*(1+0.12*q);
    beetG.visible=sc>0.001&&q<0.999; beetG.position.set(3.4,y,0); beetG.scale.set(sc*sxz,sc*sy,sc*sxz);
    beetG.rotation.set(0,te*(te<TF?1.6:0.4),rz);
    bA.value=te<TF?0.75*(1-cl((te-TM)/0.38))+0.2:(te<TI?0.5:0.25+0.7*hitK(ia,4)); bQ.value=q;
    wake.visible=te>=TF&&ia<0.15; wake.position.set(3.4,y+1.36,0); set(wake,0,ia<0?k:1-ia/0.15);
    set(mark,cl((te-TM)/(TI-TM)),ss(TM,TM+0.2,te)*(1-ss(TI,TI+0.15,te)));
    set(shadow,0.3+0.7*cl((te-TM)/(TI-TM)),te>=TM&&te<TI+0.2?ss(TM,TI,te):0);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
    p=cl(ia/0.3); towardCam(ring.position,HP,0.5); billboard(ring); set(ring,p,ia>=0?1-p:0);
    // aplastamiento del rival
    const h=hitK(ia,4)*(ia>=0?1:0);
    target.scale.set(1+0.2*h,1-0.3*h,1+0.2*h); target.rotation.z=-0.09*h*Math.sin(ia*16);
    if(te<TM){earW(1,o.g);o.gs=0.75;o.ga=0.32*ss(0,0.08,te);o.li=1.6;}
    else if(te<TI){o.g.set(3.4,y,0);o.gs=1.3+0.6*k;o.ga=0.28+0.25*k;o.li=2.4+3*k;}
    else if(te<TD){o.g.copy(HP);o.gs=1.25+3.2*ia;o.ga=Math.exp(-ia*10)*0.72;o.li=7.5*Math.exp(-ia*5);}
    else{const id=te-TD;o.g.set(3.4,2.25,0);o.gs=1+2.4*id;o.ga=Math.exp(-id*8)*0.5;o.li=4*Math.exp(-id*5);}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.8;o.em=te>=TD?0.32*Math.exp(-(te-TD)*4):0;o.emc.copy(U.uC1.value);
  };
}};

// =====================================================================
// 2 · LEAFY — un remolino de hojas de otoño se forma ante el Axie, viaja al rival y lo envuelve con cortes
// =====================================================================
const leafy={key:"poLeafy",name:"Leafy",dur:1.3,ti:0.48,pal:"Savia",
  phases:[["Remolino",0],["Avance",0.15],["Cortes",0.38],["Ráfaga",0.78],["Calma",1.0]],
build(a){
  const L=a.L,TT=0.15,TA=0.38,TO=0.78,X0=-2.6,CUTS=[[0.4,0.75],[0.48,-0.85],[0.56,0.15],[0.64,-0.4]],TI=0.48,TS=0.6;   // TS = escala de nivel 1
  const cxJ=te=>X0+(3.4-X0)*ss(TT,TA,te);
  const F=mkFlares(L,0.4);
  // tornado: dos conos abiertos con vetas de viento que giran en sentidos opuestos
  const tornFS=(spd,k,tw)=>`void main(){float h=vP.y/2.8;float an=atan(vP.z,vP.x)/6.2832;
   float n=noise(vec3(an*8.,h*6.-uT*2.,uT*.7));
   float s=fract(an*${f(k)}+h*${f(tw)}-uT*${f(spd)}+n*.35);float st=smoothstep(0.,.08,s)*smoothstep(.4,.1,s);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
   float fade=smoothstep(0.,.12,h)*smoothstep(1.,.72,h);
   gl_FragColor=vec4(mix(uC2,uC1,st*n+.3)*1.5,(st*(.45+.6*n)+fr*.12)*fade*uA);}`;
  const tg=new THREE.CylinderGeometry(1.0,0.22,2.8,48,12,true).translate(0,1.4,0);
  const torn=new THREE.Group(), t1=new THREE.Mesh(tg,fx(tornFS(2.6,3,1.6))), t2=new THREE.Mesh(tg,fx(tornFS(-1.8,2,-1.1)));
  t2.scale.set(0.8,0.95,0.8); torn.add(t1,t2); L.trail.add(torn);
  // cortes
  const slashes=CUTS.map(([t,ang])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.8),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));
    m.userData={t,ang};L.trail.add(m);return m;});
  // suelo: espiral de viento mínima bajo el tornado (nivel 1: sin marcas bajo el rival)
  const swirl=gp(1.8,X0,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float s=fract(an/6.2832*3.+r*1.4-uT*1.6);float arm=smoothstep(.0,.1,s)*smoothstep(.35,.1,s)*smoothstep(1.,.3,r)*step(.08,r);
   gl_FragColor=vec4(mix(uC2,uC1,arm)*1.3,(arm*.7+band(r,.85,.03)*.5)*uA);}`));
  L.decal.add(swirl);
  const C=EARS+`const float TT=${f(TT)};const float TA=${f(TA)};const float TO=${f(TO)};
  float cx(float t){float k=clamp((t-TT)/(TA-TT),0.,1.);k=k*k*(3.-2.*k);return mix(${f(X0)},3.4,k);}`;
  // hojas: nacen en las orejas, entran en la espiral, viajan con el tornado y salen despedidas; 2 muestras de estela verde
  a.count+=ptsK(L.part,55,3,C+`void main(){float t=uT-aK*.02;
   float born=.02+aSeed.x*.12;float h=.07+aSeed.y*1.5;float rad=.13+.18*h+.07*aSeed.z;
   float an=aSeed.w*6.2832+t*(10.+4.*aSeed.z)*(1.2-h*.2);
   float o=max(t-TO-aSeed.x*.08,0.);
   rad+=o*(1.4+1.2*aSeed.z);float y=h+o*1.1-o*o*3.2;
   vec3 orb=vec3(cx(t)+cos(an)*rad,y,sin(an)*rad);
   float k=clamp((t-born)/.14,0.,1.);vec3 p=mix(ear(fract(aSeed.x*7.)),orb,k*k*(3.-2.*k));float gnd=step(p.y,.03);p.y=max(p.y,.03);
   float alive=step(born,t)*(1.-smoothstep(1.,1.28,uT));float tr=aK>.5?(1.-aK*.3)*.5*(1.-gnd):1.;
   vA=alive*tr;put(p,aK>.5?.04:.12+.05*aSeed.z);vR=an*1.3+aSeed.x*6.;vK=aK;vMix=fract(aSeed.y*13.);}`,LEAFA_FS,NBo);
  // polvo que arrastra la base del tornado
  a.count+=pts(L.part,35,C+`void main(){float life=.4+aSeed.y*.2;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float s=uT-age*life;float an=r.x*6.2832+age*4.;float rad=.25+age*(.45+.6*r.y);
   vec3 p=vec3(cx(s)+cos(an)*rad,.08+age*.3,sin(an)*rad);
   float env=smoothstep(.05,.15,s)*(1.-smoothstep(.7,.9,s));
   vA=(k>=1.)?sin(age*3.14159)*env*.7:0.;put(p,.2+.16*r.z);}`,DUST_FS,NBo);
  // micro-impactos: chispas verdes en cada corte
  CUTS.forEach(([t,ang],i)=>{a.count+=sparks(L.part,i===1?45:25,t,`3.15,${f(1.2+0.1*Math.sin(i*2))},.2`,ang>0?".3,-.5,.3":".3,.5,.3",1.4,i===1?5:3.8,2.5);});
  a.pose=function(te,o){
    const x=cxJ(te), env=ss(0.02,0.15,te)*(1-ss(TO,TO+0.25,te)), wr=TS*(0.6+0.4*env+0.5*ss(TO,TO+0.25,te));
    caster.rotation.z=0.03*ss(0,0.12,te)-0.05*ss(TT-0.06,TT+0.06,te)+0.02*ss(TA,TA+0.25,te);
    flares(F,ss(0,0.05,te)*(1-ss(0.15,0.28,te)),-te*6);
    torn.position.set(x,0,0); torn.scale.set(wr,TS*(0.3+0.7*ss(0.02,0.15,te)),wr);
    torn.visible=env>0.002; set(t1,0,env); set(t2,0,env*0.8);
    swirl.position.x=x; set(swirl,0,env*0.45);
    let last=-1, li=-1; CUTS.forEach(([t],i)=>{if(te>=t){last=t;li=i;}});
    slashes.forEach(m=>{const {t,ang}=m.userData,s=(te-(t-0.06))/0.06;
      m.visible=s>=0&&te<t+0.45; towardCam(m.position,TC,0.6); billboard(m,ang);
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.36,s>1?0.85*Math.exp(-(s-1)*1.2):0.85); m.material.uniforms.uQ.value=s>=1?0.35*Math.exp(-(te-t)*4):0;});
    // rival: alzado por el viento y sacudido por cada corte
    const inW=ss(TA-0.05,TA+0.05,te)*(1-ss(TO,TO+0.2,te)), ic=last>0?te-last:-1, hc=hitK(ic,9)*(li===1?1.4:1);
    target.position.y=0.07*inW*(0.6+0.4*Math.sin(te*13)); target.position.x=3.4+0.07*hitK(ic,6)*(li===1?1.8:1);
    target.rotation.z=(li%2?1:-1)*0.1*hc*Math.cos(ic*20)+0.03*inW*Math.sin(te*9);
    if(te<TT){o.g.set(x,0.8,0);o.gs=0.9;o.ga=0.25*env;o.li=1.6*env;}
    else if(te<TA){o.g.set(x,0.85,0);o.gs=1.1;o.ga=0.32;o.li=2.6;}
    else{o.g.copy(TC);o.gs=0.9+1.3*cl(ic);o.ga=0.18*inW+(ic>=0?Math.exp(-ic*10)*0.55:0);o.li=1.4*inW+(ic>=0?(li===1?5:3)*Math.exp(-ic*6):0);}
    o.ia=ic;o.c.copy(TC);o.shake=0;o.dist=li===1?0.5:0.25;
  };
}};

// =====================================================================
// 3 · LOTUS — gotas de las orejas forman un loto de agua sobre el aliado; al abrirse disipa los estados
//     alterados (humo y burbujas moradas) y deja caer una lluvia de gotas cristalinas
// =====================================================================
function petalGeo(len,wid,cup){const nu=10,nv=6,pos=[],uv=[],idx=[];
  for(let i=0;i<=nu;i++){const u=i/nu,w=wid*Math.pow(Math.sin(PI*Math.min(u*0.92+0.04,1)),0.7);
    for(let j=0;j<=nv;j++){const v=j/nv*2-1;pos.push(-cup*v*v*Math.sin(PI*u*0.9)+0.12*len*u*u*u,u*len,v*w);uv.push(j/nv,u);}}
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const p=i*(nv+1)+j,q=p+nv+1;idx.push(p,q,p+1,q,q+1,p+1);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();return g;}
const lotus={key:"poLotus",name:"Lotus",dur:2.3,ti:1.0,pal:"Loto",allies:1,
  phases:[["Aflicción",0],["Gotas",0.12],["Brote",0.45],["Floración",0.65],["Purificación",1.0],["Lluvia",1.15],["Calma",1.8]],
build(a){
  const L=a.L,TB=0.45,TI=1.0,TE=1.8,AP=ALLY_POS[0],LC=AP.clone().add(V3(0,2.2,0)),LS=0.8;
  const F=mkFlares(L,0.45);
  const pA={value:0};
  // pétalo de agua: fresnel, refracción falsa (la normal desplaza un patrón de cáusticas) y punta rosada
  const petalMat=fxU(`void main(){vec3 N=normalize(vN),V=normalize(vV);float fr=pow(1.-abs(dot(N,V)),2.2);
   vec2 rf=N.xy*.4+vUv*vec2(2.,3.);float cn=noise(vec3(rf*5.,uT*.6));float caus=pow(1.-abs(cn*2.-1.),6.);
   float vein=smoothstep(.04,0.,abs(vUv.x-.5))*.4+smoothstep(.04,0.,abs(fract(vUv.x*5.)-.5))*.15*vUv.y;
   float tip=smoothstep(.45,1.,vUv.y);float edge=smoothstep(.12,0.,min(vUv.x,1.-vUv.x));
   vec3 c=mix(mix(uC2,uC1,fr+caus*.5),vec3(1.,.62,.84),tip*.55)*(.6+fr*1.2)+vec3(1.)*caus*.35;
   gl_FragColor=vec4(c,(.1+fr*.6+caus*.25+vein*.3+tip*.2+edge*.3)*uA);}`,{uA:pA});
  const lot=new THREE.Group(); L.mesh.add(lot);
  const rings=[[8,0.78,0.27,0.12,0.22,1.25,0],[6,0.6,0.22,0.1,0.12,0.75,0.4]].map(([n,len,wid,cup,c0,c1,off])=>{
    const g=petalGeo(len,wid,cup),tilts=[];
    for(let k=0;k<n;k++){const az=new THREE.Group(),tl=new THREE.Group();az.rotation.y=k*PI*2/n+off;az.add(tl);tl.add(new THREE.Mesh(g,petalMat));lot.add(az);tilts.push(tl);}
    return {tilts,c0,c1};});
  // corazón dorado del loto
  const core=new THREE.Mesh(new THREE.SphereGeometry(0.14,20,14),fxU(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float n=noise(vP*40.+vec3(0.,uT,0.));gl_FragColor=vec4(mix(vec3(1.,.85,.45),uC1,fr)*1.6,(.5+.5*fr+n*.3)*uA);}`,{uA:pA}));
  core.position.y=0.1; lot.add(core);
  // hojas flotantes: discos con muesca, nervios radiales y brillo de agua
  const padMat=fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   if(r>1.||abs(an)<.28*smoothstep(.0,.3,r))discard;
   float vein=smoothstep(.06,0.,abs(fract(an/6.2832*14.)-.5))*smoothstep(.1,.9,r)*.4;
   float n=noise(vec3(p*9.,2.));float dew=smoothstep(.82,.9,noise(vec3(p*18.,7.)));
   vec3 c=mix(vec3(.08,.32,.12),vec3(.28,.62,.25),n*.7+r*.2)+vec3(.5,1.,.5)*vein*.3+uC1*(band(r,.96,.05)*.8+dew*1.3);
   gl_FragColor=vec4(c,uA*.92);}`,Object.assign({},NB,{side:THREE.DoubleSide}));
  const pads=[0,2.2,4.1].map((an,i)=>{const m=new THREE.Mesh(new THREE.CircleGeometry(0.36+0.05*i,40).rotateX(-PI/2),padMat);
    m.userData.an=an;lot.add(m);return m;});
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),fx(RING_FS,{depthTest:false})); L.trail.add(ring);
  // suelo: ondas de agua bajo el aliado
  const ripple=gp(2.6,AP.x,AP.z,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float m=0.;
   for(int i=0;i<4;i++){float r0=fract(uT*.7+float(i)*.25);m+=band(r,r0*.95,.025+.02*r0)*(1.-r0);}
   m+=band(r,.97,.012)*.6;float c=pow(1.-abs(noise(vec3(p*10.,uT*.5))*2.-1.),8.)*smoothstep(1.,.2,r)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.4,(m+c)*uA);}`));
  L.decal.add(ripple);
  const C=EARS+`const float TB=${f(TB)};const float TI=${f(TI)};const float TE=${f(TE)};const vec3 AP=${v3(AP)};const vec3 LC=${v3(LC)};`;
  // estados alterados: humo morado (mezcla normal) que la purificación empuja hacia fuera
  a.count+=pts(L.part,50,C+`void main(){float life=1.+aSeed.y*.4;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*.8,.2+age*1.4,(r.z-.5)*.8);float o=max(uT-TI,0.);
   p+=normalize(vec3(r.x-.5,.15,r.z-.5)+.001)*o*2.6;
   vA=sin(age*3.14159)*.7*(1.-smoothstep(TI,TI+.35,uT));put(p,(.32+.3*r.y)*(1.+o*2.));}`,SMOKE_FS("vec3(.3,.1,.42)"),NBo);
  a.count+=pts(L.part,35,C+`void main(){float life=.8+aSeed.y*.4;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*.8+sin(age*6.+r.y*9.)*.08,.3+age*1.6,(r.z-.5)*.8);float o=max(uT-TI,0.);
   vA=sin(age*3.14159)*(1.-clamp(o/.12,0.,1.));put(p,(.075+.06*r.y)*(1.+o*9.));}`,PBUB_FS);
  // gotas que salen de las orejas y forman el capullo
  a.count+=pts(L.part,90,C+`void main(){float s=.12+aSeed.x*.4;float life=.38+aSeed.y*.15;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=ear(aSeed.z);vec3 m=mix(e,LC,.5)+vec3(0.,1.1,0.);vec3 p=bz(e,m,LC,k*k*(3.-2.*k))+rnd()*.07*sin(k*3.14159);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;put(p,.06+.04*aSeed.w);}`,DROP_FS);
  // estallido de gotas al purificar y lluvia cristalina que cae de los pétalos
  a.count+=pts(L.part,65,C+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.2,0.));vec3 p=LC+d*(1.9*(1.-exp(-t*3.)))+vec3(0.,-1.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.065+.04*aSeed.w);}`,DROP_FS);
  a.count+=pts(L.part,130,C+`void main(){float life=.55+aSeed.y*.25;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float born=uT-age*life;float an=r.x*6.2832;float rad=.36+.32*r.y;
   vec3 p=LC+vec3(cos(an)*rad,-.05,sin(an)*rad)*(1.-age*.4)+vec3(0.,-age*age*life*life*9.-age*.4,0.);
   vA=(k>=1.&&born<TE&&p.y>.03)?1.:0.;put(p,.06+.04*r.z);}`,DROP_FS);
  a.count+=pts(L.part,50,C+`void main(){float s=TI+aSeed.x*.7;float life=.5+aSeed.y*.35;float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=AP+vec3(r.x*.6,.3+aSeed.z*1.4+age*.35,r.z*.6);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.07*aSeed.w);}`,STAR4_FS);
  a.pose=function(te,o){
    const ia=te-TI, op=ss(TB,TI,te), grow=ss(0.38,0.62,te), fade=1-ss(TE,TE+0.45,te);
    caster.rotation.z=0.04*ss(0,0.18,te)-0.04*ss(0.45,0.65,te);
    flares(F,ss(0.1,0.18,te)*(1-ss(0.55,0.7,te)),te*1.5);
    lot.position.set(LC.x,LC.y+0.05*Math.sin(te*2.2)+0.2*ss(TE,TE+0.45,te),LC.z); lot.rotation.y=te*0.45;
    lot.scale.setScalar(Math.max(0.001,LS*(0.4+0.6*grow)*(1+0.1*hitK(ia,5))));
    lot.visible=te>0.38&&fade>0;
    for(const r of rings){const ang=r.c0+(r.c1-r.c0)*op+0.04*Math.sin(te*2.5)+0.15*(1-fade);for(const tl of r.tilts)tl.rotation.z=-ang;}
    pA.value=grow*fade*(1+0.45*hitK(ia,4));
    pads.forEach((m,i)=>{const an=m.userData.an+te*0.3,rd=0.58*op;m.position.set(Math.cos(an)*rd,-0.22-0.04*i,Math.sin(an)*rd);m.rotation.y=-an*0.5;
      m.scale.setScalar(Math.max(0.001,op));});
    set(pads[0],0,op*fade);
    let p=cl(ia/0.4); towardCam(ring.position,tmp.copy(AP).add(V3(0,1.2,0)),0.6); billboard(ring); set(ring,p,ia>=0?0.8*(1-p):0);
    set(ripple,0,0.8*ss(TI-0.15,TI+0.08,te)*fade);
    // aliado: morado enfermizo antes, brillo de agua tras purificarse
    const al=allies[0].userData.m;
    if(ia<0){al.emissive.setRGB(0.55,0.15,0.85);al.emissiveIntensity=0.3*(0.6+0.4*Math.sin(te*5));}
    else{al.emissive.copy(U.uC1.value);al.emissiveIntensity=0.7*hitK(ia,3)+0.18*fade*(te<TE+0.45?1:0);}
    allies[0].rotation.z=ia<0?0.04*Math.sin(te*3.1):0.05*hitK(ia,4)*Math.sin(ia*12);
    if(te<TB){earW(1,o.g);o.gs=0.65;o.ga=0.25*ss(0.1,0.2,te);o.li=1.2;}
    else if(ia<0){o.g.copy(lot.position);o.gs=1+0.8*op;o.ga=0.25+0.25*op;o.li=1.6+2.4*op;}
    else{o.g.copy(lot.position);o.gs=1.3+2.4*cl(ia);o.ga=Math.exp(-ia*8)*0.62+0.2*fade;o.li=6*Math.exp(-ia*4)+1.6*fade;}
    o.ia=ia;o.c.copy(LC);o.shake=0;o.dist=0.45;o.flash=0;
  };
}};

// =====================================================================
// 4 · ROSA — pétalos de las orejas siembran el suelo del rival; brotan ramas espinosas con rosas que lo enredan
//     y lo dejan dormido (Zs, burbuja de sueño y ondas azuladas; el rival se mece)
// =====================================================================
const rosa={key:"poRosa",name:"Rosa",dur:1.5,ti:0.42,pal:"Rubí",
  phases:[["Siembra",0],["Brote",0.16],["Enredo",0.42],["Sueño",0.55],["Disipación",1.15]],
build(a){
  const L=a.L,TG=0.16,TI=0.42,TS=0.55,TE=1.15,HD=V3(3.28,1.75,0);
  const F=mkFlares(L,0.4);
  const VG=new THREE.Group(); L.mesh.add(VG);               // ramas: siguen la posición e inclinación del rival
  const vineFS=`void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*40.,vUv.y*6.,1.));float stripe=pow(.5+.5*sin(vUv.y*18.85+u*30.),4.)*.3;
   vec3 g=mix(vec3(.05,.18,.05),vec3(.22,.46,.12),n)*(1.-stripe);
   float tip=smoothstep(.06,0.,uP-u)*step(uP,.995);
   gl_FragColor=vec4(g*${LIT}+uC1*tip*1.4+vec3(.4,.9,.3)*tip*.3+uC1*uA*.12*n,1.);}`;
  const thornMat=new THREE.MeshStandardMaterial({color:0x3b2412,roughness:0.7,emissive:0xff3050,emissiveIntensity:0});
  const roseA={value:0};
  const rosePetal=off=>fxU(`void main(){float an=atan(vP.z,vP.x);float lim=.25-.2*(.5+.5*cos(an*5.+${f(off)}));if(vP.y>lim)discard;
   float n=noise(vP*8.);float edge=smoothstep(lim-.14,lim,vP.y);
   vec3 c=mix(vec3(.3,0.,.04),vec3(.9,.06,.15),smoothstep(-1.,.2,vP.y)+n*.15);c=mix(c,vec3(1.,.35,.42),edge*.35);
   c*=gl_FrontFacing?${LIT}:.5;gl_FragColor=vec4(c+uC1*uA*(.12+edge*.4),1.);}`,{uA:roseA},DS);
  const budMat=fxU(`void main(){vec2 q=vP.xz;float r=length(q);float an=atan(q.y,q.x);
   float sp=fract(an/6.2832+r*2.5-vP.y*.5);float g=smoothstep(0.,.15,sp)*smoothstep(1.,.8,sp);
   gl_FragColor=vec4(mix(vec3(.3,0.,.04),vec3(.95,.1,.2),g)*${LIT}+uC1*uA*.3,1.);}`,{uA:roseA},SOLID);
  const bowl=new THREE.SphereGeometry(1,22,12,0,PI*2,0.42*PI,0.58*PI), pOut=rosePetal(0), pIn=rosePetal(1.7), budG=new THREE.SphereGeometry(1,16,12);
  const mkRose=()=>{const g=new THREE.Group(),o=new THREE.Mesh(bowl,pOut),i=new THREE.Mesh(bowl,pIn),b=new THREE.Mesh(budG,budMat);
    o.scale.set(0.12,0.09,0.12); i.scale.set(0.08,0.085,0.08); i.rotation.y=0.6; i.position.y=0.015; b.scale.set(0.046,0.042,0.046); b.position.y=0.015;
    g.add(o,i,b); return g;};
  const vines=[], thorns=[], roses=[], tan=V3(0,0,0);
  for(let k=0;k<5;k++){
    const a0=k*PI*2/5+0.3, dir=k%2?1:-1, top=0.7+0.08*(k%3), pts=[];
    for(let i=0;i<=12;i++){const t=i/12,an=a0+dir*t*PI*1.5,r=0.47+0.45*Math.pow(1-t,4);pts.push(V3(Math.cos(an)*r,0.02+top*Math.pow(t,1.1),Math.sin(an)*r));}
    const cv=new THREE.CatmullRomCurve3(pts), m=new THREE.Mesh(taperTube(cv,90,7,0.04,0.016),fx(vineFS,SOLID));
    m.userData={d:k*0.025}; VG.add(m); vines.push(m);
    for(let j=0;j<4;j++){const u=0.2+0.17*j+Math.random()*0.03, th=new THREE.Mesh(new THREE.ConeGeometry(0.022,0.09,6),thornMat);
      cv.getPointAt(u,th.position); cv.getTangentAt(u,tan); tmp.set(th.position.x,0,th.position.z).normalize().addScaledVector(tan,0.35).normalize();
      th.quaternion.setFromUnitVectors(UP,tmp); th.userData={u,k}; VG.add(th); thorns.push(th);}
    for(const u of (k<2?[0.55,1]:[1])){const r=mkRose(); cv.getPointAt(u,r.position); tmp.set(r.position.x,0,r.position.z).normalize().multiplyScalar(0.7).add(UP).normalize();
      r.quaternion.setFromUnitVectors(UP,tmp); r.position.addScaledVector(tmp,0.04); r.userData={u,k,j:roses.length}; VG.add(r); roses.push(r);}
  }
  // sueño: burbuja de pensamiento con olas suaves y ondas concéntricas alrededor de la cabeza (azul fijo del estado)
  const dream=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float d=min(min(length(p-vec2(.15,.2))-.62,length(p-vec2(-.55,-.62))-.13),length(p-vec2(-.78,-.88))-.07);
   float body=smoothstep(.03,-.03,d);float rim=smoothstep(.06,0.,abs(d));
   float wav=.5+.5*sin((p.y+.12*sin(p.x*5.+uT*2.))*14.-uT*1.5);
   vec3 c=mix(vec3(.25,.35,.85),vec3(.75,.85,1.),wav*.6+rim);
   gl_FragColor=vec4(c*1.2,(body*(.18+.18*wav)+rim*.9)*uA);}`,{depthTest:false}));
  const waves=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){float r=length(vUv-.5)*2.;
   float w=pow(.5+.5*sin(r*18.-uT*3.),6.)*smoothstep(1.,.3,r)*smoothstep(.15,.35,r);
   gl_FragColor=vec4(vec3(.45,.6,1.)*1.2,w*.45*uA);}`,{depthTest:false}));
  L.trail.add(dream,waves);
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.trail.add(ring);
  // suelo: anillo de espinas mínimo bajo el rival (nivel 1: sin tierra abierta ni onda)
  const rune=gp(1.5,3.4,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.015)+band(r,.8,.01);float th=abs(fract(an/6.2832*24.)-.5)*2.;m+=step(r,.92)*step(.8,r)*smoothstep(.2,0.,th-(.92-r)*6.);
   m+=band(r,.6,.02)*smoothstep(.6,1.,cos(an*5.-uT*.8));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.4,m*uA);}`));
  L.decal.add(rune);
  const C=EARS+`const float TG=${f(TG)};const float TI=${f(TI)};const float TS=${f(TS)};const float TE=${f(TE)};const vec3 HD=${v3(HD)};const vec3 FT=vec3(3.4,.05,0.);`;
  // pétalos rojos de las orejas a los pies del rival
  a.count+=pts(L.part,80,C+`void main(){float s=.02+aSeed.x*.1;float life=.2+aSeed.y*.06;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=ear(aSeed.z);float an=aSeed.w*6.2832;vec3 dst=FT+vec3(cos(an),0.,sin(an))*(.3+.4*aSeed.y);
   vec3 m=mix(e,dst,.5)+vec3(0.,1.3,(aSeed.z-.5)*1.);vec3 p=bz(e,m,dst,k*k*(3.-2.*k))+rnd()*.08*sin(k*3.14159);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.9,1.,age)):0.;put(p,.09+.04*aSeed.w);vR=k*9.+aSeed.x*6.;vK=cos(k*12.+aSeed.y*6.);}`,
   PETAL_FS("vec3(1.,.35,.42)","vec3(.6,.02,.1)"),NBo);
  // pétalos que caen de las rosas mientras duerme
  a.count+=pts(L.part,30,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float born=uT-age*life;float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*(.48+.2*r.y),.3+r.z*.6-age*.7,sin(an)*(.48+.2*r.y))+vec3(sin(age*6.+r.y*9.)*.1,0.,cos(age*5.)*.07);
   vA=(k>=1.&&born<TE&&p.y>.03)?sin(age*3.14159):0.;put(p,.07+.035*r.z);vR=age*6.+r.x*6.;vK=cos(age*9.+r.z*6.);}`,PETAL_FS("vec3(1.,.35,.42)","vec3(.6,.02,.1)"),NBo);
  // Zs del sueño (uE = envolvente del sueño) y motas azules
  a.count+=pts(L.part,10,C+`void main(){float life=.7;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=HD+vec3(.12+age*.5+r.x*.1,.2+age*.7,(r.z-.5)*.3)+vec3(sin(age*5.+r.y*6.)*.08,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.09+.15*age)*(.7+.6*r.y));vR=sin(age*4.+r.x*6.)*.35;}`,Z_FS);
  a.count+=pts(L.part,20,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=HD+vec3((r.x-.5)*.8,-.4+age*.9,(r.z-.5)*.8);vA=(k>=1.)?sin(age*3.14159)*.55*uE:0.;put(p,.03+.03*r.y);}`,
   PF+`void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.55,.7,1.)*1.3,a);}`);
  a.count+=sparks(L.part,50,TI,"3.4,.7,0.","0.,.7,0.",1.4,4.5,3);
  a.pose=function(te,o){
    const ia=te-TI, sl=ss(TS,TS+0.15,te)*(1-ss(TE,TE+0.28,te)), fade=1-ss(TE,TE+0.3,te);
    caster.rotation.z=0.03*ss(0,0.1,te)-0.04*ss(0.1,0.2,te)+0.01*ss(0.2,0.4,te);
    flares(F,ss(0,0.05,te)*(1-ss(0.14,0.24,te)),te*3);
    // rival: apretado por el enredo y luego mecido por el sueño
    const sq=hitK(ia,8), sway=0.06*sl*Math.sin((te-TS)*4);
    target.rotation.z=sway-0.05*sq*Math.sin(ia*18); target.scale.set(1-0.05*ss(TI-0.06,TI,te)*(1-0.6*ss(TI,TI+0.25,te)),1+0.02*sl*Math.sin(te*5),1-0.05*ss(TI-0.06,TI,te)*(1-0.6*ss(TI,TI+0.25,te)));
    VG.position.copy(target.position); VG.rotation.z=target.rotation.z; VG.visible=te>=TG&&fade>0.001;
    const s=Math.max(0.001,fade);
    vines.forEach(m=>{const g=1-Math.pow(1-cl((te-TG-m.userData.d)/(TI-TG-0.04)),2);set(m,g,0.8*hitK(ia,4)+0.25*sl);m.scale.set(s,1,s);});
    thorns.forEach(th=>{const g=1-Math.pow(1-cl((te-TG-vines[th.userData.k].userData.d)/(TI-TG-0.04)),2),k=ss(th.userData.u-0.02,th.userData.u+0.06,g)*fade;
      th.visible=k>0.01; th.scale.setScalar(Math.max(k,0.001));});
    thornMat.emissiveIntensity=0.55*hitK(ia,5);
    roses.forEach(r=>{const k=backOut((te-TI+0.03-0.025*r.userData.j)/0.18)*fade;r.visible=k>0.01;r.scale.setScalar(Math.max(k,0.001)*(1+0.04*Math.sin(te*3+r.userData.j)));});
    roseA.value=0.15+0.7*hitK(ia,5)+0.15*sl;
    // sueño
    U.uE.value=sl;
    towardCam(dream.position,tmp.copy(HD).add(V3(0.38+sway,0.5,0)),0.3); billboard(dream); dream.scale.setScalar(0.85+0.15*ss(TS,TS+0.2,te)+0.03*Math.sin(te*3)); set(dream,0,0.85*sl);
    towardCam(waves.position,HD,0.1); billboard(waves); set(waves,0,0.8*sl);
    let p=cl(ia/0.3); towardCam(ring.position,tmp.set(3.4,0.7,0),0.4); billboard(ring); set(ring,p,ia>=0?0.75*(1-p):0);
    set(rune,0,0.6*ss(0.08,TG,te)*fade*(0.6+0.4*Math.sin(te*6)));
    if(te<TG){earW(1,o.g);o.gs=0.55;o.ga=0.22*ss(0,0.06,te);o.li=1;}
    else if(ia<0){o.g.set(3.4,0.5,0);o.gs=0.9;o.ga=0.25;o.li=2;}
    else if(te<TS){o.g.set(3.4,0.8,0);o.gs=0.9+2*ia;o.ga=Math.exp(-ia*8)*0.5;o.li=4.5*Math.exp(-ia*5);}
    else{o.g.copy(HD).add(V3(0.35,0.4,0));o.gs=0.9;o.ga=0.18*sl;o.li=1.3*sl;}
    o.ia=ia;o.c.set(3.4,0.8,0);o.shake=0;o.dist=0.3;
    o.em=0.28*sl;o.emc.setRGB(0.45,0.6,1);
  };
}};

// =====================================================================
// 5 · SAKURA — pétalos de las orejas forman un dosel de cerezo sobre las dos casillas aliadas; lluvia torrencial
//     de pétalos y regeneración continua (pulsos suaves en cada aliado). Nivel 3: al caer la lluvia, las baldosas
//     bajo cada aliado se fracturan con energía
// =====================================================================
const sakura={key:"poSakura",name:"Sakura",dur:3.4,ti:1.1,pal:"Sakura",allies:2,
  phases:[["Brote",0],["Dosel",0.35],["Lluvia",0.8],["Regeneración",1.1],["Calma",2.9]],
build(a){
  const L=a.L,TC0=0.35,TR=0.8,TI=1.1,TE=2.9,BEAT=0.55,CS=1.35,FS=4.2;
  const F=mkFlares(L,0.7);
  const CAN=ALLY_POS.map(p=>p.clone().add(V3(0,3.6,0)));
  // dosel: nubes de flor de cerezo
  const cloudMat=fx(`void main(){float fr=abs(dot(normalize(vN),normalize(vV)));
   float n=noise(vP*3.+vec3(uT*.3,0.,uT*.2))*.6+noise(vP*9.)*.4;float flo=smoothstep(.55,.75,noise(vP*14.+vec3(0.,uT*.4,0.)));
   vec3 c=mix(uC2,vec3(1.,.93,.97),.35+.4*n+flo*.4);
   gl_FragColor=vec4(c*1.1,pow(fr,1.4)*(.25+.45*smoothstep(.3,.7,n)+flo*.4)*uA*.55);}`);
  const canopies=CAN.map(c=>{const g=new THREE.Group();g.position.copy(c);
    for(const [x,y,z,r] of [[0,0,0,.75],[.55,-.05,.15,.55],[-.55,-.02,-.12,.6],[.1,.15,-.4,.5],[-.15,.08,.42,.5]]){
      const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,14),cloudMat);m.position.set(x,y,z);m.scale.y=0.55;g.add(m);}
    L.mesh.add(g);return g;});
  // columnas de regeneración: cilindro abierto que late con cada pulso
  const colMat=fx(`void main(){float h=vP.y/2.2+.5;float n=noise(vec3(atan(vP.z,vP.x)*3.,h*4.-uT*1.5,0.));
   float beat=band(h,uP,.12);
   gl_FragColor=vec4(mix(uC2,uC1,n+beat)*1.3,(smoothstep(1.,0.,h)*.25*(.5+n)+beat*.6)*uA);}`);
  const cols=ALLY_POS.map(p=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.62,2.2,32,1,true),colMat);m.position.set(p.x,1.1,p.z);m.scale.set(1.25,1,1.25);L.trail.add(m);return m;});
  // casillas de 1,4 u. bajo cada aliado: borde, flor de cinco pétalos que gira, pulso y pétalos acumulados
  const tileMat=fx(`void main(){vec2 p=vUv-.5;float sq=max(abs(p.x),abs(p.y))*2.;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*.3;
   float edge=band(sq,.93,.03)+band(sq,.82,.01)*.6;
   float fl=r-.42*(.55+.45*pow(abs(cos(an*2.5)),.6));float flower=band(fl,0.,.025)+smoothstep(.0,-.05,fl)*.12;
   float pulse=band(sq,uP*.95,.06)*(1.-uP);
   float pile=smoothstep(.72,.8,noise(vec3(p*22.,3.))+.25*smoothstep(1.2,3.,uT))*smoothstep(1.2,3.,uT)*step(sq,.95);
   gl_FragColor=vec4(mix(uC2,uC1,edge+pulse)*1.3,(edge+flower*.7+pulse*1.2+pile*.7)*uA);}`);
  const tiles=ALLY_POS.map(p=>gp(1.4,p.x,p.z,tileMat));
  const soft=ALLY_POS.map(p=>gp(3.4,p.x,p.z,fx(`void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(uC2,smoothstep(1.,0.,r)*.3*uA);}`),0.012));
  // fractura de baldosa energética bajo cada aliado (nivel 3)
  const frac=ALLY_POS.map(p=>gp(FS,p.x,p.z,fx(tileFractureFS(FS)),0.025));
  L.decal.add(...tiles,...soft,...frac);
  const C=EARS+`const float TC0=${f(TC0)};const float TR=${f(TR)};const float TI=${f(TI)};const float TE=${f(TE)};
  const vec3 A0=${v3(ALLY_POS[0])};const vec3 A1=${v3(ALLY_POS[1])};const vec3 K0=${v3(CAN[0])};const vec3 K1=${v3(CAN[1])};`;
  const PET=PETAL_FS("vec3(1.,.95,.98)","vec3(1.,.5,.72)");
  // pétalos que brotan de las orejas y suben a formar los dos doseles
  a.count+=pts(L.part,220,C+`void main(){float s=.05+aSeed.x*.45;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=ear(aSeed.z);vec3 dst=(aSeed.w<.5?K0:K1)+rnd()*vec3(.95,.25,.8);vec3 m=e+vec3(0.,1.8,0.)+(dst-e)*.2;
   vec3 p=bz(e,m,dst,1.-pow(1.-k,2.))+vec3(sin(k*9.+aSeed.y*6.)*.15,0.,cos(k*7.)*.15);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.85,1.,age)):0.;put(p,.14+.06*aSeed.w);vR=k*8.+aSeed.x*6.;vK=cos(k*14.+aSeed.z*6.);}`,PET,NBo);
  // lluvia torrencial: una columna ancha de pétalos por casilla, sin estado (bucle por ciclos)
  ALLY_POS.forEach((P,i)=>{
    a.count+=pts(L.part,520,C+`void main(){float life=.9+aSeed.y*.35;float k=(uT-TR)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float born=uT-age*life;vec3 c0=${v3(P)};
     vec3 p=c0+vec3((r.x-.5)*2.6,3.4-age*3.5,(r.z-.5)*2.6)+vec3(sin(age*7.+r.y*9.)*.22,0.,cos(age*6.+r.x*9.)*.18);
     float land=step(p.y,.03);p.y=max(p.y,.03);
     vA=(k>=1.&&born<TE)?smoothstep(0.,.08,age)*(1.-land*.6):0.;put(p,.12+.06*r.z);vR=age*(6.+6.*r.y)+r.x*6.;vK=cos(age*(10.+8.*r.z)+r.y*6.);vMix=r.y;}`,PET,NBo);
    // motas de vida que suben del aliado con cada pulso
    a.count+=pts(L.part,80,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float born=uT-age*life;vec3 p=${v3(P)}+vec3((r.x-.5)*1.2,.1+age*2.3,(r.z-.5)*1.2);
     vA=(k>=1.&&born<TE)?sin(age*3.14159):0.;put(p,.1+.08*r.y);}`,STAR4_FS);
  });
  a.pose=function(te,o){
    const can=ss(TC0,TR,te)*(1-ss(TE,TE+0.5,te)), reg=ss(TI-0.1,TI+0.2,te)*(1-ss(TE,TE+0.5,te));
    const ph=te>=TI?((te-TI)/BEAT)%1:0, beat=te>=TI?Math.exp(-ph*BEAT*5):0;
    caster.rotation.z=0.05*ss(0,0.3,te)-0.05*ss(0.6,1.0,te);
    flares(F,ss(0,0.08,te)*(1-ss(0.5,0.7,te)),te*1.5);
    canopies.forEach((g,i)=>{g.scale.set(CS*(0.5+0.5*can),CS*(0.5+0.5*can+0.03*Math.sin(te*2+i)),CS*(0.5+0.5*can));g.rotation.y=te*0.1*(i?1:-1);g.visible=can>0.002;});
    cloudMat.uniforms.uA.value=can;
    cols.forEach(m=>{m.visible=reg>0.002;});set(cols[0],ph,reg*(0.5+0.5*beat));
    tiles.forEach(t=>set(t,ph,ss(0.6,TI,te)*(1-ss(TE,TE+0.5,te))));
    soft.forEach(t=>set(t,0,reg*(0.4+0.6*beat)));
    const ia=te-TI, hit=hitK(ia,4);
    frac.forEach(t=>set(t,ia>=0?1-Math.pow(1-cl(ia/0.6),2):0,ia>=0?(0.55+0.75*hit)*(1-ss(TE-0.3,TE+0.4,te)):0));
    allies.forEach((d,i)=>{const m=d.userData.m;m.emissive.copy(U.uC1.value);m.emissiveIntensity=reg*(0.15+0.55*beat)+0.9*hit;d.scale.y=1+0.03*beat*reg+0.06*hit;});
    if(te<TC0){earW(1,o.g);o.gs=1;o.ga=0.4*ss(0,0.1,te);o.li=2.4;}
    else{o.g.set(-3.45,2.6,-1.6);o.gs=2.8+2*hit;o.ga=0.3*can+0.15*beat*reg+0.6*hit;o.li=3.5*can+2*beat*reg+9*hit;}
    o.ia=ia;o.c.set(-3.45,0.6,-1.6);o.shake=1.5;o.dist=1.1;o.flash=0;
  };
}};

// =====================================================================
// 6 · HOLLOW — el Axie emite pulsos huecos (anillos oscuros de distorsión con el centro vacío); se abre un hueco
//     en el cielo y cae un tronco hueco centenario que se clava en la casilla delante del rival y la bloquea
// =====================================================================
const hollow={key:"poHollow",name:"Hollow",dur:1.4,ti:0.42,pal:"Musgo",
  phases:[["Pulso hueco",0],["Portal",0.12],["Caída",0.25],["Impacto",0.42],["Asentamiento",0.55],["Bloqueo",0.75]],
build(a){
  const L=a.L,PUL=[0.02,0.1,0.18],TP=0.12,TF=0.25,TI=0.42,X=1.95,TK=0.55,YL=0.5,YS=4.2,HEADP=V3(-3.7,1.75,0);   // TK = escala del tronco (nivel 1)
  const F=mkFlares(L,0.4);
  // pulso hueco: anillo oscuro (mezcla normal) + borde de musgo aditivo; el centro queda vacío
  const pulseDark=PUL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){float r=length(vUv-.5)*2.;
   float n=noise(vec3((vUv-.5)*8.,uT*2.));float w=band(r,.78+n*.06,.16);
   gl_FragColor=vec4(vec3(.01,.015,.01),w*.85*uA);}`,Object.assign({depthTest:false},NB)));L.trail.add(m);return m;});
  const pulseRim=PUL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){float r=length(vUv-.5)*2.;
   float n=noise(vec3((vUv-.5)*10.,uT*3.));gl_FragColor=vec4(mix(uC2,uC1,n)*1.5,(band(r,.95,.03)+band(r,.62,.02)*.6)*uA);}`,{depthTest:false}));L.trail.add(m);return m;});
  // hueco en el cielo: vórtice oscuro con borde verde
  const portD=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sw=noise(vec3(an*3.+r*6.-uT*3.,r*4.,uT));float d=smoothstep(.9,.3,r+(sw-.5)*.25);
   gl_FragColor=vec4(vec3(.01,.02,.01),d*.9*uA);}`,Object.assign({depthTest:false},NB)));
  const portR=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sw=noise(vec3(an*4.-r*5.+uT*4.,r*3.,uT));float m=band(r,.82+(sw-.5)*.12,.08)+band(fract(an/6.2832*3.+r*1.5-uT*.6),.5,.05)*smoothstep(.85,.4,r)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,sw)*1.5,m*uA);}`,{depthTest:false}));
  L.trail.add(portD,portR);
  // tronco hueco: corteza con surcos y musgo, interior oscuro y caras con anillos de crecimiento
  const mossA={value:0};
  const bark=fxU(`void main(){float an=atan(vP.z,vP.x);
   float fur=noise(vec3(an*7.,vP.y*1.5,1.))*.6+noise(vec3(an*18.,vP.y*5.,3.))*.4;
   float groove=pow(1.-abs(fract(an*1.432+noise(vec3(vP.y*2.,an,0.))*.4)*2.-1.),3.);
   vec3 c=mix(vec3(.11,.07,.04),vec3(.36,.24,.15),fur)*(1.-groove*.55);
   float moss=smoothstep(.5,.68,noise(vP*3.5)*.7+smoothstep(.1,1.1,vP.y)*.45-smoothstep(.4,-.9,vP.y)*.2);
   vec3 mc=mix(vec3(.1,.28,.07),vec3(.36,.62,.18),noise(vP*14.));c=mix(c,mc,moss)*${LIT};
   c+=uC1*moss*uA*(.25+.75*noise(vP*6.+vec3(0.,uT*.8,0.)))*.9;
   gl_FragColor=vec4(c,1.);}`,{uA:mossA},SOLID);
  const inner=fx(`void main(){float h=vP.y/2.3+.5;float n=noise(vP*9.);
   vec3 c=mix(vec3(.01,.008,.005),vec3(.2,.12,.07),smoothstep(.25,1.,h)*(.6+.4*n))+vec3(.15,.3,.08)*smoothstep(.85,.6,n)*h*.5;
   gl_FragColor=vec4(c,1.);}`,Object.assign({},SOLID,{side:THREE.BackSide}));
  const rings=fx(`void main(){float r=length(vP.xz);float n=noise(vec3(vP.xz*6.,1.));
   float yr=pow(.5+.5*sin(r*140.+n*5.),3.);float crack=pow(1.-abs(fract(atan(vP.z,vP.x)/6.2832*7.+n*.3)*2.-1.),30.);
   vec3 c=mix(vec3(.55,.38,.22),vec3(.78,.6,.4),yr*.6+n*.2)*(1.-crack*.5);c=mix(c,vec3(.25,.15,.08),smoothstep(.57,.62,r));
   gl_FragColor=vec4(c*${LIT},1.);}`,DS);
  const trunk=new THREE.Group(); L.mesh.add(trunk);
  trunk.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.66,2.3,44,6,true),bark),new THREE.Mesh(new THREE.CylinderGeometry(0.48,0.5,2.3,36,4,true),inner));
  const rg=new THREE.RingGeometry(0.48,0.62,48,3).rotateX(-PI/2), top=new THREE.Mesh(rg,rings), bot=new THREE.Mesh(rg,rings);
  top.position.y=1.15; bot.position.y=-1.15; trunk.add(top,bot);
  for(const [y,az,len] of [[0.45,0.8,0.42],[-0.1,3.6,0.32]]){const st=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.11,len,10),bark);
    st.position.set(Math.cos(az)*0.68,y,Math.sin(az)*0.68); st.rotation.set(Math.sin(az)*1.1,0,-Math.cos(az)*1.1); trunk.add(st);}
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(2,2),fx(RING_FS,{depthTest:false})); L.trail.add(ring);
  // suelo: sombra creciente y casilla bloqueada (1,4 u., centrada bajo el tronco); nivel 1: sin grietas ni onda
  const shadow=gp(1.3,X,0,fx(`void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(vec3(0.),smoothstep(1.,.3,r/max(uP,.05))*.65*uA);}`,NB),0.012);
  const ward=gp(1.4,X,0,fx(`void main(){vec2 p=vUv-.5;float sq=max(abs(p.x),abs(p.y))*2.;float r=length(p)*2.;
   float edge=band(sq,.93,.03);float vine=band(sq,.8+.03*sin(atan(p.y,p.x)*12.+uT),.02);
   float ring=band(r,.42,.015)*.6;float n=noise(vec3(p*9.,uT*.3));
   gl_FragColor=vec4(mix(uC2,uC1,edge+n*.3)*1.3,(edge+vine*.6+ring)*uA);}`),0.025);
  L.decal.add(shadow,ward);
  const C=`const float TI=${f(TI)};const vec3 HP=${v3(HEADP)};const vec3 IP=vec3(${f(X)},.1,0.);const vec3 PP=vec3(${f(X)},${f(YS)},0.);`;
  // motas oscuras que el vacío del pulso atrae hacia la cabeza (mezcla normal)
  a.count+=pts(L.part,50,C+`void main(){float s=aSeed.x*.15;float life=.2+aSeed.y*.1;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 d=normalize(rnd()+.001);vec3 p=HP+d*mix(.9,.12,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.75:0.;put(p,.045+.035*aSeed.z);}`,
   PF+`void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.2,d)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.02,.03,.02),a);}`,NBo);
  // hojas y musgo que caen del hueco del cielo
  a.count+=pts(L.part,25,C+`void main(){float s=.15+aSeed.x*.4;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=PP+vec3(r.x*.5,-.1-t*3.5,r.z*.5)+vec3(sin(t*6.+r.y*9.)*.2,0.,cos(t*5.)*.14);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.09+.04*aSeed.w);vR=t*7.+aSeed.z*6.;}`,LEAFG_FS,NBo);
  // impacto: soplo de polvo ligero y chispas de musgo (nivel 1: sin polvo masivo ni escombros)
  a.count+=pts(L.part,35,C+`void main(){float s=TI+aSeed.x*.08;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=IP+vec3(cos(an),0.,sin(an))*(.35+.9*(1.-exp(-t*3.))*(.5+aSeed.w))+vec3(0.,(.15+.25*aSeed.y)*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.6:0.;put(p,(.18+.18*aSeed.y)*(.6+age));}`,DUST_FS,NBo);
  a.count+=sparks(L.part,50,TI,`${f(X)},.25,0.`,"0.,.4,0.",1.8,4.5,3);
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TF)/(TI-TF)), blk=ss(TI+0.08,TI+0.25,te)*(1-ss(1.15,1.4,te));
    caster.rotation.z=0.04*Math.sin(Math.min(te,0.24)*PI/0.08)*(1-ss(0.2,0.28,te));
    let lp=-1; PUL.forEach(t=>{if(te>=t)lp=t;});
    flares(F,ss(0,0.04,te)*(1-ss(0.2,0.3,te))*(0.6+0.4*hitK(te-lp,12)),te*2);
    // pulsos
    PUL.forEach((t,i)=>{const p=cl((te-t)/0.3),on=te>=t&&p<1,s=0.3+2.2*(1-Math.pow(1-p,2));
      for(const m of [pulseDark[i],pulseRim[i]]){m.visible=on;towardCam(m.position,HEADP,0.4);billboard(m);m.scale.setScalar(s);}
      set(pulseDark[i],p,on?0.8*(1-p):0); set(pulseRim[i],p,on?(1-p)*0.7:0);});
    // portal y caída
    const po=ss(TP,TP+0.1,te)*(1-ss(TI,TI+0.2,te));
    for(const m of [portD,portR]){towardCam(m.position,tmp.set(X,YS,0),0.2);billboard(m);m.scale.set(1,0.55,1);m.visible=po>0.002;}
    set(portD,0,po); set(portR,0,po);
    let y=YS, tz=0.25, sc=0;
    if(te>=TF-0.08&&te<TI){y=YS-(YS-YL)*k*k;sc=ss(TF-0.08,TF+0.04,te);tz=0.2*(1-k);}
    else if(te>=TI){y=YL-0.06*hitK(ia,10)*Math.cos(ia*24);sc=1;tz=0.04*hitK(ia,4)*Math.sin(ia*14);}
    trunk.visible=sc>0.001; trunk.position.set(X,y,0); trunk.scale.setScalar(Math.max(sc*TK,0.001)); trunk.rotation.set(0,0.4,tz);
    mossA.value=te<TI?0.2:0.25+0.6*hitK(ia,4)+0.3*blk*(0.7+0.3*Math.sin(te*4));
    let p=cl(ia/0.25); towardCam(ring.position,tmp.set(X,0.4,0),0.8); billboard(ring); set(ring,p,ia>=0?0.7*(1-p):0);
    set(shadow,0.3+0.7*k,te>=TF-0.06&&te<TI+0.1?0.8*ss(TF-0.06,TI,te):0);
    set(ward,0,blk*(0.6+0.25*Math.sin(te*6)));
    const h=hitK(ia,7); target.position.x=3.4+0.15*h*(ia>=0?1-Math.exp(-ia*20):0); target.rotation.z=-0.15*h*Math.cos(ia*16);
    if(te<TP+0.08){o.g.copy(HEADP);o.gs=0.7;o.ga=0.2;o.li=1;}
    else if(te<TI){o.g.set(X,te<TF?YS:y,0);o.gs=1;o.ga=0.22*po;o.li=2*po;}
    else{o.g.set(X,0.35,0);o.gs=0.9+3*ia;o.ga=Math.exp(-ia*12)*0.5+0.1*blk;o.li=5*Math.exp(-ia*6)+1*blk;}
    // antes del tronco, la distorsión nace de la cabeza con cada pulso (sin destello en el rival)
    if(te<TI&&lp>=0&&te-lp<0.3){o.ia=te-lp;o.c.copy(HEADP);o.shake=0;o.dist=0.5;o.flash=0;}
    else{o.ia=ia;o.c.set(X,0.4,0);o.shake=0;o.dist=0.6;o.flash=0.4;}
  };
}};

// =====================================================================
// 7 · CLOVER — tréboles de cuatro hojas brotan de las orejas, orbitan al Axie, salen disparados contra el rival
//     y, al impactar, un trébol protector se despliega sobre la cabeza del Axie
// =====================================================================
const clover={key:"poClover",name:"Clover",dur:2.3,ti:0.9,pal:"Esmeralda",
  phases:[["Brote",0],["Órbita",0.25],["Disparo",0.65],["Impacto",0.9],["Amuleto",1.05],["Disipación",1.85]],
build(a){
  const L=a.L,TO=0.25,TL=0.65,TI=0.9,TA=1.05,TE=1.85,CP=V3(-3.7,2.5,0);
  const F=mkFlares(L,0.48);
  // trébol protector: billboard con cuatro corazones, nervios y brillo dorado que lo recorre; uP = despliegue
  const big=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fx(G2+SD_CLOVER+`void main(){vec2 p=(vUv-.5)*2.4;float d=1e5;float vein=0.;
   for(int i=0;i<4;i++){float o=float(i)*1.5708+.7854;float k=clamp(uP*4.-float(i),0.,1.);vec2 q=rot2(p,o)/max(k,.001);
    float h=sdHeart(q*1.25)/1.25*max(k,.001);d=min(d,h);vein=max(vein,smoothstep(.03,0.,abs(q.x))*step(0.,q.y)*step(q.y,.75)*step(h,0.));}
   float body=smoothstep(.02,-.02,d);float rim=smoothstep(.06,0.,abs(d));float gl=smoothstep(.5,0.,d)*.35;
   float stem=smoothstep(.04,.0,abs(p.x+p.y*.15))*step(p.y,-.05)*step(-.95,p.y)*step(.6,uP);
   float sheen=band(fract((p.x+p.y)*.25-uT*.35),.5,.06)*body;
   vec3 c=mix(uC2,uC1,.3+.5*rim+vein*.3)*(1.+.25*vein)+vec3(1.,.85,.4)*sheen*1.2+vec3(1.)*rim*.25;
   gl_FragColor=vec4(c*1.3,(body*.85+rim*.5+gl+stem*.8)*uA);}`,{depthTest:false}));
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){float r=length(vUv-.5)*2.;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.2),(pow(max(0.,1.-r),2.5)*.6+band(r,.7+.05*sin(uT*3.),.03)*.4)*uA);}`,{depthTest:false}));
  L.mesh.add(halo,big);
  // velo protector: casquete con fresnel verde y vetas de hoja
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.05,40,20,0,PI*2,0,PI*0.55),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   float n=noise(vP*4.+vec3(0.,uT*.5,0.));float vein=band(fract(atan(vP.z,vP.x)/6.2832*8.+vP.y*.4),.5,.05);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3,(fr*.55+vein*.12*n)*uA);}`));
  dome.position.set(-3.7,0.4,0); dome.scale.set(0.85,1.3,0.85); L.mesh.add(dome);
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false})); L.trail.add(ring);
  // suelo: glifo de trébol bajo el Axie e impacto bajo el rival
  const glyph=gp(2.3,-3.7,0,fx(G2+SD_CLOVER+`void main(){vec2 p=rot2((vUv-.5)*2.,uT*.4);float r=length(p);
   float d=sdClover(p*1.6)/1.6;float m=band(d,0.,.012)+band(r,.95,.012)+band(r,.84,.008)*.6+band(r,.9,.03)*step(.6,fract(atan(p.y,p.x)/6.2832*16.));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.3,m*uA);}`));
  const scorch=gp(1.9,3.4,0,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*10.,2.));
   float m=band(r,uP,.06)+smoothstep(.65,.8,n)*smoothstep(.8,.2,r)*.6;gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,m*uA);}`));
  L.decal.add(glyph,scorch);
  const C=EARS+`const float TO=${f(TO)};const float TL=${f(TL)};const float TI=${f(TI)};const float TA=${f(TA)};const float TE=${f(TE)};
  const vec3 CC=vec3(-3.7,1.2,0.);const vec3 TC=${v3(TC)};const vec3 CP=${v3(CP)};
  vec3 orb(float t,float ph,float rad,float yo){float a=ph+5.5*t+5.*t*t;return CC+vec3(cos(a)*rad,yo+.22*sin(a*2.+ph),sin(a)*rad);}`;
  // 4 tréboles grandes + 12 pequeños; 5 muestras de estela por trébol
  a.count+=ptsK(L.part,16,6,C+`void main(){float big=step(aI,3.5);float ph=big>.5?aI*1.5708:aSeed.y*6.2832;
   float rad=big>.5?.8:.5+.5*aSeed.z;float yo=big>.5?.1:(aSeed.w-.5)*.75;
   float t=uT-aK*.02;float born=big>.5?.03+aI*.04:.08+aSeed.x*.14;
   vec3 e=ear(mod(aI,2.));vec3 p;
   if(t<TO+.05){float k=clamp((t-born)/(TO+.05-born),0.,1.);p=mix(e,orb(t,ph,rad,yo),k*k*(3.-2.*k));}
   else if(t<TL)p=orb(t,ph,rad,yo);
   else{vec3 s=orb(TL,ph,rad,yo);float k=clamp((t-TL)/(TI-TL),0.,1.);k=pow(k,1.5);
    vec3 m=s+vec3(1.4,1.15+yo,sin(ph)*1.5);vec3 dst=TC+vec3(-.15,(aSeed.y-.5)*.4,(aSeed.z-.5)*.4)*(1.-big*.6);p=bz(s,m,dst,k);}
   float on=step(born,t)*step(uT,TI+.01)*(1.-step(TI,t));float tr=aK>.5?(1.-aK/6.)*.5:1.;
   vA=on*tr;put(p,aK>.5?(big>.5?.1:.055)*(1.-aK/7.):(big>.5?.34:.16));vR=uT*(3.+aI*.4)+aSeed.x*6.;vK=aK;}`,CLOVER_FS);
  // estallido de hojitas, destellos y chispas al impactar
  a.count+=pts(L.part,70,C+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.3,0.));vec3 p=TC+d*(1.7*(1.-exp(-t*3.)))+vec3(0.,-1.2*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.1+.05*aSeed.w);vR=t*8.+aSeed.z*6.;}`,LEAFG_FS,NBo);
  a.count+=pts(L.part,40,C+`void main(){float s=TI+aSeed.x*.12;float life=.4+aSeed.y*.25;float age=(uT-s)/life;vec3 d=normalize(rnd()+.001);
   vec3 p=TC+d*(.25+.85*aSeed.z)*min(age*2.,1.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.12+.09*aSeed.w);}`,STAR4_FS);
  a.count+=sparks(L.part,80,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.2,.4,0.",2.4,6,2.5);
  // luz que sube de las orejas y despliega el trébol (corriente continua, sin orbe viajero)
  a.count+=pts(L.part,80,C+`void main(){float s=TI+aSeed.x*.35;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=ear(aSeed.z);float an=aSeed.w*6.2832+k*6.;vec3 p=mix(e,CP,k)+vec3(cos(an),0.,sin(an))*.18*(1.-k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.05+.04*aSeed.w);}`);
  // destellos y trebolitos que caen del amuleto
  a.count+=pts(L.part,45,C+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TA)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float born=uT-age*life;vec3 p=CP+vec3((r.x-.5)*.75,-age*1.3,(r.z-.5)*.75);
   vA=(k>=1.&&born<TE)?sin(age*3.14159):0.;put(p,.08+.06*r.y);}`,STAR4_FS);
  a.count+=pts(L.part,16,C+`void main(){float life=.9+aSeed.y*.3;float k=(uT-TA)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float born=uT-age*life;vec3 p=CP+vec3((r.x-.5)*1.+sin(age*5.+r.y*6.)*.12,-.2-age*1.6,(r.z-.5)*.85);
   vA=(k>=1.&&born<TE)?sin(age*3.14159)*.85:0.;put(p,.13);vR=age*5.+r.x*6.;vK=0.;}`,CLOVER_FS);
  a.pose=function(te,o){
    const ia=te-TI, unf=ss(TI+0.04,TA+0.2,te), am=ss(TI+0.04,TA,te)*(1-ss(TE,TE+0.4,te));
    caster.rotation.z=0.04*ss(0,0.15,te)-0.05*ss(TL-0.05,TL+0.08,te)+0.02*ss(TI,TI+0.3,te);
    flares(F,ss(0,0.05,te)*(1-ss(0.22,0.36,te))+0.55*(ia>=0?ss(TI,TI+0.06,te)*(1-ss(TI+0.3,TI+0.45,te)):0),te*3);
    // amuleto: gira en su plano y "voltea" (escala x) para fingir volumen
    const cp=tmp2.copy(CP); cp.x+=caster.position.x+3.7; cp.y+=0.06*Math.sin(te*2.4);
    towardCam(big.position,cp,0.2); billboard(big,te*1.2); big.scale.set(Math.max(0.001,0.78+0.22*Math.cos(te*3.2))*(0.6+0.4*unf),0.6+0.4*unf,1);
    set(big,unf,am); big.visible=am>0.002;
    towardCam(halo.position,cp,0.15); billboard(halo); set(halo,0,am*(0.7+0.3*Math.sin(te*4))); halo.visible=big.visible;
    set(dome,0,am*0.6*(0.8+0.2*Math.sin(te*3)));
    set(glyph,0,ss(0,0.22,te)*(1-ss(TL,TL+0.25,te))+0.6*am);
    set(scorch,1-Math.pow(1-cl(ia/0.4),2),ia>=0?0.75*(1-ss(TI+0.4,TI+1.0,te)):0);
    let p=cl(ia/0.35); towardCam(ring.position,TC,0.5); billboard(ring); set(ring,p,ia>=0?0.85*(1-p):0);
    const h=hitK(ia,5); target.position.x=3.4+0.16*h; target.rotation.z=-0.18*h*Math.cos(ia*15); scorch.position.x=target.position.x;
    caster.userData.m.emissive.copy(U.uC1.value); caster.userData.m.emissiveIntensity=0.2*am;
    if(te<TL){o.g.set(-3.7,1.3,0);o.gs=1.3;o.ga=0.25*ss(0,TO,te);o.li=2;}
    else if(ia<0){const k=cl((te-TL)/(TI-TL));o.g.set(-3.7+(TC.x+3.7)*k*k,1.3+1*Math.sin(PI*k),0);o.gs=1.1;o.ga=0.32;o.li=3.2;}
    else if(te<TA){o.g.copy(TC);o.gs=1.2+3.2*ia;o.ga=Math.exp(-ia*10)*0.65;o.li=7*Math.exp(-ia*5);}
    else{o.g.copy(cp);o.gs=1.25;o.ga=0.28*am;o.li=2.4*am;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.55;o.emc.copy(U.uC1.value);
  };
}};

VFX.module("Planta · Orejas",[leafy,lotus,rosa,sakura,hollow,clover]);
// Beetroot es una carta de boca: su efecto se registra en «Planta · Boca».
VFX.module("Planta · Boca",[beet]);
})();

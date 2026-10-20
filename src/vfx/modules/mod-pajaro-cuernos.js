// =====================================================================
// MÓDULO · CLASE PÁJARO (CUERNOS)
// Estética de cielo y vuelo: plumas sueltas, viento, ondas de aire y luz solar. No se dibujan cuernos, alas ni
// plumas del Axie: los efectos nacen en la zona de las puntas de los cuernos (≈ x −3.54, y 2.05, z ±0.27).
// Niveles por PA: todo es nivel 2 (firme y estándar, sin fractura de suelo) salvo Big Sister (1 PA, nivel 1).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,helixGeo,camera,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,SLASH_FS,billboard,towardCam,taperTube}=VFX.lib;

const TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0), HN=V3(-3.54,2.05,0);   // pecho y cabeza del rival; zona de los cuernos
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), YA=V3(0,1,0), XA=V3(1,0,0), ZA=V3(0,0,1);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
const orient=(m,d,ax)=>m.quaternion.setFromUnitVectors(ax||YA,tmp3.copy(d).normalize());
// ángulo en pantalla de una velocidad v en el punto p (para orientar billboards a lo largo del vuelo)
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const glowEm=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const SDSEG=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;

// ---------- piezas GLSL del módulo ----------
// pluma 2D: q.x 0..1 del cálamo a la punta, q.y transversal (±.5 = ancho máximo); x = vexilo con barbas, y = raquis
const FEATH=`vec2 feath(vec2 q,float sd){float x=q.x;float side=q.y>0.?1.:.72;float ay=abs(q.y)/side;
 float w=.5*smoothstep(.04,.3,x)*sqrt(max(0.,1.-pow(max(x-.5,0.)/.5,2.)));
 float notch=step(.66,noise(vec3(x*9.,sign(q.y)*3.,sd)))*step(.3,x);
 float vane=smoothstep(w,w-.06,ay+notch*.07)*step(x,1.);
 float down=mix(.4+.6*noise(vec3(x*30.,q.y*30.,sd)),1.,smoothstep(.12,.34,x));
 float barb=.84+.16*sin((x*1.2-ay*1.6)*60.+sd);
 float shaft=smoothstep(.035,0.,abs(q.y))*step(.0,x)*step(x,.97);
 return vec2(vane*barb*down,shaft*(1.-.5*x));}`;
// pluma en sprite: vMix = ángulo (vueltas); tono de la base a la punta con la paleta
const FEATHER_FS=HEAD+FEATH+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 vec2 fe=feath(vec2(q.x/.94+.5,q.y*3.),vMix*7.);float a=(fe.x*.85+fe.y)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.25+.75*(q.x+.5))*1.3+vec3(1.)*fe.y*.35,a);}`;
// trazo de viento: línea fina orientada (vMix = ángulo)
const STREAK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float a=smoothstep(.035,0.,abs(q.y))*smoothstep(.5,.05,abs(q.x))*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.4,a);}`;
// gota de agua con brillo (aditiva, cristalina)
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=(smoothstep(.34,.28,d)*.45+smoothstep(.05,0.,abs(d-.28))*.6)*vA;
 float hl=smoothstep(.09,0.,length(q-vec2(-.08,.0)));a+=hl*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.5+.5*vMix)*1.2+vec3(1.)*hl,a);}`;
// ángulo en pantalla de la velocidad v en p (vueltas), para sprites que miran hacia donde vuelan
const SANG=`float sang(vec3 p,vec3 v){vec4 a=projectionMatrix*modelViewMatrix*vec4(p,1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(p+v*.05,1.);
 vec2 d=(b.xy/b.w-a.xy/a.w)*vec2(projectionMatrix[1][1]/projectionMatrix[0][0],1.);return atan(-d.y,d.x)/6.2832;}`;
// pluma en malla (plano con u del cálamo a la punta); uA = energía del borde
const FEATHER_MESH_FS=FEATH+`void main(){vec2 fe=feath(vec2(vUv.x,vUv.y-.5),3.);
 float n=noise(vec3(vUv*vec2(9.,3.)-vec2(uT*3.,0.),uT));
 float a=fe.x*(.55+.45*n)+fe.y;if(a<.01)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.3+.7*vUv.x)*1.5+vec3(1.)*(fe.y*.5+uP*.4),a*uA);}`;

// =====================================================================
// 1 · CUCKOO — un reloj de luz se abre junto al cuerno y un cucú de madera sale disparado con un resorte;
//     dos "cu-cú" en anillos sonoros despiertan al aliado (se disipa su bruma de sueño) entre confeti de plumas
// =====================================================================
const cuckoo={key:"bcCuckoo",name:"Cuckoo",pa:2,dur:2.2,ti:0.95,pal:"Sakura",allies:1,
  phases:[["Tic-tac",0],["Resorte",0.35],["Cucú",0.55],["Despertar",0.95],["Confeti",1.15],["Recogida",1.6]],
build(a){
  const L=a.L,TS=0.35,CU=[0.55,0.75],TV=0.2,TI=0.95,TR=1.6,TE=2.0,SLEN=0.8;
  const AP=ALLY_POS[0], AH=V3(AP.x,1.62,AP.z), O=V3(-3.5,2.1,-0.18);
  const SD=V3(AH.x-O.x,AH.y-O.y+2.2,AH.z-O.z).normalize();          // el resorte sale hacia arriba y hacia el aliado
  const ext=te=>{if(te<TS)return 0;const t=te-TS;return Math.max(0,1-Math.exp(-t*8)*Math.cos(t*24))*(1-ss(TR,TE,te));};
  // esfera de reloj: aro, doce marcas y agujas que giran a toda velocidad; uP abre la portezuela central
  const dial=new THREE.Mesh(new THREE.PlaneGeometry(0.78,0.78),fx(SDSEG+`
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rim=band(r,.88,.05)+band(r,.76,.015);
   float k=fract(an/6.2832*12.);float tick=smoothstep(.07,0.,min(k,1.-k))*step(.6,r)*step(r,.72);
   float h1=-uT*11.,h2=-uT*1.3;
   float hands=smoothstep(.035,0.,sdSeg(p,vec2(0.),.55*vec2(cos(h1),sin(h1))))+smoothstep(.05,0.,sdSeg(p,vec2(0.),.36*vec2(cos(h2),sin(h2))));
   float door=smoothstep(.36,.3,r)*uP;float face=smoothstep(.9,.0,r)*.12;
   float n=noise(vec3(p*4.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.4+vec3(1.)*(door*.8+hands*.3),(rim+tick+hands*(1.-uP)+face+door)*uA);}`,{depthTest:false}));
  // resorte de acero: hélice en tubo a lo largo de +y (0..1)
  const springMat=fx(`void main(){float s=${SPEC(22)};float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(vec3(.55,.57,.62)*${LIT}+vec3(1.)*s*.8+uC1*fr*(.3+.7*uA),1.);}`,SOLID);
  const spring=new THREE.Mesh(pathTube((t,o)=>o.set(Math.cos(t*Math.PI*14)*0.075,t,Math.sin(t*Math.PI*14)*0.075),140,280,6,0.016,0.016),springMat);
  const jack=new THREE.Group(); jack.add(spring); orient(jack,SD); jack.position.copy(O);
  // cucú de juguete: madera tallada con escamas de plumaje pintadas; pico y ojos lacados
  const woodMat=fx(`void main(){vec3 q=vP*16.;float g=noise(vec3(q.x*.5,q.y*3.,q.z*3.))*.6+noise(q*2.)*.4;
   float scal=step(.5,fract((vP.x*9.-abs(vP.z)*5.)+.5*step(.5,fract(vP.y*12.))));
   float carve=smoothstep(.05,0.,abs(fract(vP.x*9.-abs(vP.z)*5.)-.5)-.45)*step(vP.y,.05);
   vec3 c=mix(vec3(.33,.18,.09),vec3(.6,.38,.2),g)*(1.-carve*.35);
   c=mix(c,mix(vec3(.9,.82,.7),uC1,.35),step(.0,-vP.y-.07)*.6);           // pecho claro pintado
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+vec3(1.,.9,.8)*${SPEC(10)}*.25+uC1*fr*uA*.8,1.);}`,SOLID);
  const paintMat=fx(`void main(){gl_FragColor=vec4(vec3(1.,.66,.18)*${LIT}+vec3(1.)*${SPEC(16)}*.5,1.);}`,SOLID);
  const eyeMat=fx(`void main(){gl_FragColor=vec4(vec3(.03)+vec3(1.)*${SPEC(40)},1.);}`,SOLID);
  const toyG=new THREE.Group(), toyB=new THREE.Group(); toyG.add(toyB);
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.13,22,16),woodMat); body.scale.set(1.35,1,1);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.088,18,14),woodMat); head.position.set(0.14,0.1,0);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(0.032,0.1,10).rotateZ(-Math.PI/2),paintMat); beak.position.set(0.25,0.1,0);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.025,0.09),woodMat); tail.position.set(-0.2,0.06,0); tail.rotation.z=0.5;
  const eyes=[-1,1].map(s=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.016,8,6),eyeMat);m.position.set(0.2,0.13,0.055*s);return m;});
  toyB.add(body,head,beak,tail,...eyes);
  L.mesh.add(dial,jack,toyG);
  // anillos sonoros: tres por "cu", viajan del cucú a la cabeza del aliado mirando en su dirección
  const CHIME_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.82,.07)*(.55+.45*step(.35,fract(an/6.2832*10.+uT)))+band(r,.6,.03)*.6;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,m*uA);}`;
  const chimes=[];for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(CHIME_FS));m.userData={t0:CU[i>>1]+(i%3)*0.05};chimes.push(m);L.trail.add(m);}

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 O=${v3(O)};const vec3 AH=${v3(AH)};`;
  // tic-tac: destellos que saltan del reloj en cada segundo marcado
  a.count+=points(L.part,36,C+`void main(){float s=floor(aSeed.x*6.)*.06;float life=.22;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.y*6.2832;vec3 p=O+vec3(cos(an),sin(an),0.)*(.32+t*1.6)+vec3(0.,0.,.1);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.z);}`);
  // "boing": trazos radiales al soltarse el resorte
  a.count+=points(L.part,30,C+`void main(){float s=TS+aSeed.x*.05;float life=.25+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),sin(an),0.);vec3 p=O+d*(.25+2.2*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.22+.1*aSeed.w);vMix=-an/6.2832;}`,STREAK_FS);
  // bruma de sueño (lavanda fija: estado Sueño) que ronda al aliado y el cucú barre hacia fuera
  a.count+=points(L.part,32,C+`void main(){float an=aSeed.x*6.2832+uT*.8;float rad=.3+.25*aSeed.y;float bl=max(uT-TI,0.);
   vec3 p=AH+vec3(cos(an)*rad,(aSeed.z-.4)*.5+.1*sin(uT*2.+aSeed.w*6.),sin(an)*rad);
   p+=normalize(p-AH+vec3(0.,.1,0.))*bl*2.6;
   vA=.5*smoothstep(0.,.3,uT)*(1.-smoothstep(TI,TI+.35,uT));put(p,(.4+.25*aSeed.w)*(1.+bl*1.5));}`,SMOKE_FS("vec3(.62,.55,.85)"),NB);
  // confeti de plumas: estalla sobre el aliado y baja revoloteando
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.12;float life=1.+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=vec3(r.x*1.6,1.6+1.6*aSeed.z,r.z*1.6);
   vec3 p=AH+vec3(0.,.25,0.)+v*(1.-exp(-t*3.))/3.+vec3(sin(t*4.+aSeed.w*9.)*.25,-.75*t,cos(t*3.+aSeed.y*7.)*.2);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.05,age)*(1.-smoothstep(.75,1.,age)):0.;put(p,.2+.1*aSeed.w);
   vMix=aSeed.w+sin(t*5.+aSeed.x*9.)*.12;}`,FEATHER_FS);
  // confeti de papel (colores fijos: es confeti) que gira y destella
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.1;float life=1.1+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=vec3(r.x*2.,1.8+2.*aSeed.z,r.z*2.);
   vec3 p=AH+vec3(0.,.25,0.)+v*(1.-exp(-t*3.2))/3.2+vec3(sin(t*6.+aSeed.w*9.)*.12,-.9*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;put(p,.07+.04*aSeed.w);vMix=aSeed.w*4.+t*3.;}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;float sq=abs(sin(vMix*3.));q.x/=max(sq,.15);float a=step(max(abs(q.x),abs(q.y)),.3)*vA;if(a<.003)discard;
    float k=fract(vMix*.37);vec3 c=k<.33?vec3(1.,.55,.78):(k<.66?vec3(.55,.85,1.):vec3(1.,.86,.42));
    gl_FragColor=vec4(c*(.8+.6*sq),a);}`);
  a.count+=sparks(L.part,70,TI,`${f(AH.x)},${f(AH.y)},${f(AH.z)}`,"0.,1.2,0.",2,5,2.4);

  const ring=groundPlane(2.4,AP.x,0.03,fx(RING_FS)); ring.position.z=AP.z;
  // marca del aliado despierto: sello claro bajo sus pies que late mientras dura el refuerzo
  const seal=groundPlane(1.6,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float k=fract(an/6.2832*12.-uT*.3);float m=band(r,.82,.04)+smoothstep(.05,0.,min(k,1.-k))*step(.62,r)*step(r,.76)+smoothstep(.8,0.,r)*.12;
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,m*uA);}`)); seal.position.z=AP.z;
  L.decal.add(ring,seal);

  const E=V3(0,0,0), Dh=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, open=ss(0,0.25,te)*(1-ss(TR+0.2,TE+0.15,te)), e=ext(te);
    let bump=0;for(const c of CU)if(te>=c)bump+=0.14*Math.exp(-(te-c)*12);
    const len=SLEN*e+bump;
    towardCam(dial.position,O,0.05); billboard(dial); dial.visible=open>0.001; dial.scale.setScalar(0.6+0.4*open);
    set(dial,ss(TS-0.06,TS,te)*(1-ss(TR,TE,te)),open);
    jack.visible=len>0.01; jack.scale.set(1,Math.max(len,0.001),1); springMat.uniforms.uA.value=bump*4;
    E.copy(O).addScaledVector(SD,len);
    toyG.visible=e>0.02; toyG.position.copy(E); Dh.set(AH.x-E.x,0,AH.z-E.z); orient(toyG,Dh,XA);
    toyG.scale.setScalar(Math.min(1,e*1.4)+0.25*bump);
    let bow=0;for(const c of CU)if(te>=c)bow+=0.55*Math.exp(-(te-c)*10)*Math.sin((te-c)*30);
    toyB.rotation.z=-bow; woodMat.uniforms.uA.value=bump*5+0.2*e;
    // anillos: cada uno va del cucú a la cabeza del aliado y se abre
    for(const m of chimes){const k=(te-m.userData.t0)/TV;m.visible=k>=0&&k<1;if(!m.visible)continue;
      m.position.copy(E).lerp(AH,k); tmp2.subVectors(AH,E); orient(m,tmp2,ZA); m.scale.setScalar(0.25+0.65*k); m.material.uniforms.uA.value=Math.sin(Math.PI*k)*0.9;}
    caster.rotation.z=-0.08*ss(TS,TS+0.08,te)*(1-ss(TS+0.1,TS+0.4,te));
    // aliado: cabecea dormido, da un respingo al oír el cucú y queda encendido
    const al=allies[0];
    if(te<TI){al.rotation.z=0.06*Math.sin(te*3.5);al.scale.set(1,0.97,1);}
    else{const j=hitK(ia,6);al.position.y=0.28*Math.sin(Math.PI*cl(ia/0.3));al.rotation.z=0.12*j*Math.sin(ia*25);al.scale.set(1-0.06*j,1+0.12*j,1-0.06*j);}
    glowEm(al,(ia>=0?0.9*Math.exp(-ia*5):0)+0.22*ss(TI,TI+0.3,te)*(1-ss(TR+0.2,TE+0.2,te)));
    let p=cl(ia/0.5); set(ring,1-Math.pow(1-p,2),ia>=0?(1-p)*0.85:0);
    set(seal,0,ss(TI,TI+0.25,te)*(1-ss(TR+0.2,TE+0.2,te))*0.8);
    if(te<TS){o.g.copy(O);o.gs=0.8*open;o.ga=0.3*open;o.li=1.6*open;}
    else if(te<TI){o.g.copy(E);o.gs=0.9+bump*3;o.ga=0.3+bump*1.5;o.li=2+bump*12;}
    else{o.g.copy(AH);o.gs=1.2+2.2*Math.min(ia,0.5);o.ga=0.6*Math.exp(-ia*7)+0.06;o.li=6*Math.exp(-ia*4)+0.8;}
    o.ia=ia;o.c.copy(AH);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 2 · FEATHER SPEAR — plumas sueltas convergen ante los cuernos y se compactan en una lanza; sale a velocidad
//     supersónica con cono de vapor, estela rosa y destellos dorados; se clava, vibra y revienta en plumas
// =====================================================================
const spear={key:"bcFeatherSpear",name:"Feather Spear",pa:2,dur:1.9,ti:0.62,pal:"Cariño",
  phases:[["Plumas",0],["Compactar",0.2],["Disparo",0.4],["Impacto",0.62],["Estallido",0.76],["Plumaje",0.95]],
build(a){
  const L=a.L,TF=0.4,TI=0.62,TB=0.76,N=8,SL=1.45,S0=V3(-2.95,2.2,0),EP=V3(3.3,1.32,0);
  const sp=(te,out)=>{if(te<TF)return out.set(S0.x-0.18*ss(0.2,TF,te),S0.y,0);
    const k=Math.pow(cl((te-TF)/(TI-TF)),1.35);return out.set(S0.x+(EP.x-S0.x)*k,S0.y+(EP.y-S0.y)*k+0.15*Math.sin(Math.PI*k),0);};
  const spG=new THREE.Group(); L.mesh.add(spG);
  // haz de plumas en estrella alrededor del eje +x (punta en x=0)
  const fMat=fx(FEATHER_MESH_FS,{depthTest:true}), feathers=[];
  for(let i=0;i<N;i++){const g=new THREE.Group(),m=new THREE.Mesh(new THREE.PlaneGeometry(SL*(0.8+0.2*((i*0.618)%1)),0.3).translate(-SL*0.45,0,0),fMat);
    g.add(m); g.userData={m,r:i*Math.PI/N,d:V3(Math.sin(i*2.4)*1.1,0.5+0.6*((i*0.37)%1),Math.cos(i*2.4)*1.1)}; feathers.push(g); spG.add(g);}
  const core=new THREE.Mesh(new THREE.ConeGeometry(0.065,SL*0.95,14).rotateZ(-Math.PI/2).translate(-SL*0.47,0,0),fx(`
  void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),1.2);gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.8,c*uA);}`));
  // cono de vapor supersónico: anillos de condensación que fluyen hacia atrás
  const mach=new THREE.Mesh(new THREE.ConeGeometry(0.42,1.3,36,1,true).rotateZ(-Math.PI/2).translate(-0.62,0,0),fx(`
  void main(){float u=vP.x/-1.3;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float n=noise(vec3(u*6.+uT*14.,atan(vP.z,vP.y)*2.,uT*3.));float rings=band(fract(u*5.+uT*9.),.5,.18);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.3,(fr*.5+rings*.35)*(.4+.6*n)*smoothstep(1.,.3,u)*smoothstep(0.,.08,u)*uA);}`));
  spG.add(core,mach);
  // estela rosa: planos cruzados con hebras que fluyen y chispazos dorados (uC2)
  const tg=new THREE.PlaneGeometry(1,0.38).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float fib=noise(vec3(u*14.-uT*20.,vUv.y*16.,0.));float st=smoothstep(.55,.85,fib);
   float gl=step(.93,hash(vec3(floor(vec2(u*90.,vUv.y*10.)),floor(uT*16.))))*u;
   float al=smoothstep(.15+.85*u,0.,v)*pow(u,1.6)*(.45+.8*st)*uA;
   gl_FragColor=vec4(mix(uC1*.8,uC1,st)*1.6+uC2*gl*2.,al+gl*uA*.8);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2; trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
  const boom=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})), hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(BURST_FS)); burst.position.copy(EP);
  L.mesh.add(boom,hitRing,burst);

  const C=`const float TF=${f(TF)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 S0=${v3(S0)};const vec3 EP=${v3(EP)};
  vec3 sp(float t){float k=pow(clamp((t-TF)/(TI-TF),0.,1.),1.35);return vec3(S0.x+(EP.x-S0.x)*k,S0.y+(EP.y-S0.y)*k+.15*sin(3.14159*k),0.);}`+SANG;
  // plumas sueltas que convergen en espiral hasta el haz
  a.count+=points(L.part,48,C+`void main(){float s=aSeed.x*.22;float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();vec3 dst=S0+vec3(-aSeed.y*1.2,0.,0.);vec3 src=S0+vec3(r.x*1.4-.4,.4+r.y*.8,r.z*1.2);
   float an=(1.-k)*2.5;vec3 off=(src-dst)*(1.-k*k);vec3 p=dst+vec3(off.x*cos(an)-off.z*sin(an),off.y,off.x*sin(an)+off.z*cos(an));
   vec3 q=dst+(src-dst)*(1.-(k+.02)*(k+.02));
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.26+.1*aSeed.w);vMix=sang(p,normalize(p-q+.0001));}`,FEATHER_FS);
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TF-.05);float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 dst=S0+vec3(-aSeed.y*${f(SL)},0.,0.);vec3 p=mix(dst+rnd()*.9,dst,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.04*aSeed.z);}`);
  // destellos dorados (uC2 aclarado) y trazos de viento en el recorrido
  a.count+=points(L.part,70,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.3+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=sp(s)+rnd()*vec3(.15,.2,.2)+vec3(-.4*t,.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*40.+aSeed.z*30.)):0.;put(p,(.16+.12*aSeed.w)*(1.-age*.5));}`,STAR4_FS.replace("mix(uC1,vec3(1.),.5+.5*c)","mix(mix(uC2,vec3(1.,.85,.4),.5),vec3(1.),.4+.5*c)"));
  a.count+=points(L.part,60,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.2+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=sp(s)+vec3(-.3-t*2.,r.y*.4,r.z*.4);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.5+.3*aSeed.w);vMix=0.;}`,STREAK_FS);
  // estallido: plumas que salen del objetivo y planean, chispas y destellos
  a.count+=points(L.part,85,C+`void main(){float s=TB+aSeed.x*.05;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=normalize(r+vec3(-.6,.5,0.))*(2.+3.5*aSeed.z);
   vec3 p=EP+v*(1.-exp(-t*3.5))/3.5+vec3(sin(t*4.+aSeed.w*9.)*.2,-.6*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.04,age)*(1.-smoothstep(.7,1.,age)):0.;put(p,.22+.12*aSeed.w);vMix=aSeed.w+t*(.3+.4*aSeed.y)*sign(r.x);}`,FEATHER_FS);
  a.count+=sparks(L.part,110,TI,`${f(EP.x)},${f(EP.y)},0.`,"-.6,.3,0.",3,8,3);
  a.count+=sparks(L.part,60,TB,`${f(EP.x)},${f(EP.y)},0.`,"0.,.4,0.",2,6,2.5);

  const dust=groundPlane(1.4,-3.7,0.02,fx(RING_FS)), shock=groundPlane(3.8,3.4,0.03,fx(RING_FS)), shock2=groundPlane(2.6,3.4,0.031,fx(RING_FS));
  L.decal.add(dust,shock,shock2);

  const pp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, form=ss(0.08,TF-0.04,te); sp(te,pp);
    const stuck=te>=TI&&te<TB, quiv=stuck?0.05*Math.sin(ia*90)*Math.exp(-ia*8):0;
    spG.visible=te<TB; spG.position.copy(pp); spG.rotation.z=te<TF?0.04*ss(0.2,TF,te):(te<TI?-0.05:-0.05+quiv);
    feathers.forEach((g,i)=>{const u=g.userData,k=1-form;g.position.copy(u.d).multiplyScalar(k*k);g.rotation.x=u.r+k*3;g.scale.set(1,1-0.45*form,1);});
    set(feathers[0].userData.m,te>=TF?1:0,0.35+0.65*form);
    core.material.uniforms.uA.value=ss(TF-0.15,TF,te)*(stuck?1-cl(ia/0.14):1);
    mach.visible=te>=TF&&te<TI; mach.material.uniforms.uA.value=ss(TF,TF+0.05,te);
    trail.visible=te>=TF&&ia<0.35; trail.position.copy(pp); trail.scale.set(Math.max(pp.x-SL*0.6-S0.x,0.001),1,1); tm.uniforms.uA.value=ia>0?1-cl(ia/0.35):1;
    let p=cl((te-TF)/0.3); towardCam(boom.position,tmp.set(S0.x+0.2,S0.y,0),0.3); billboard(boom); boom.visible=te>=TF&&p<1; set(boom,p,1-p);
    p=cl(ia/0.35); towardCam(hitRing.position,EP,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ib/0.45); burst.visible=ib>=0&&p<1; burst.scale.setScalar(0.25+0.75*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl((te-TF)/0.4); set(dust,p,te>=TF?(1-p)*0.6:0);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0); p=cl(ib/0.45); set(shock2,1-Math.pow(1-p,2),ib>=0?(1-p)*0.6:0);
    caster.rotation.z=0.06*ss(0.1,TF,te)-0.14*ss(TF,TF+0.05,te)*(1-ss(TF+0.1,TF+0.5,te));
    const kb=hitK(ia,5)*0.3+hitK(ib,6)*0.12;
    target.position.x=3.4+kb; target.rotation.z=-kb*0.8*Math.cos(Math.max(ia,0)*14);
    if(te<TF){o.g.copy(S0);o.gs=1.1*form;o.ga=0.35*form;o.li=2.5*form;}
    else if(te<TI){o.g.copy(pp);o.gs=1.5;o.ga=0.55;o.li=5;}
    else if(te<TB){o.g.copy(EP);o.gs=1.4+3*ia;o.ga=0.65*Math.exp(-ia*9)+0.2;o.li=7*Math.exp(-ia*5)+2;}
    else{o.g.copy(EP);o.gs=1.6+2.5*Math.min(ib,0.5);o.ga=0.5*Math.exp(-ib*8);o.li=5*Math.exp(-ib*5);}
    o.ia=te>=TB?ib:ia;o.c.copy(EP);o.shake=0;o.dist=0.6;o.flash=te>=TB?0.6:1;
  };
}};

// =====================================================================
// 3 · TRUMP — una caracola marina surge junto a los cuernos, toma aire y brama: ondas sónicas cian
//     (esferas que se expanden y oleaje en el suelo) barren todo el tablero y sacuden a cada rival al pasar
// =====================================================================
const trumpTB=0.5, trumpMP=V3(-3.12,2.25,0), trumpV=13;
const trumpE=[TC,V3(1.3,1.2,1.9),V3(6.3,1.2,-1.7)].map(p=>trumpTB+p.distanceTo(trumpMP)/trumpV);
const trump={key:"bcTrump",name:"Trump",pa:2,dur:2.3,ti:Math.round(trumpE[0]*1000)/1000,pal:"Loto",enemies:2,
  phases:[["Caracola",0],["Aliento",0.22],["Bramido",trumpTB],["Oleaje",0.86],["Resaca",1.45]],
build(a){
  const L=a.L,TA=0.22,TB=trumpTB,TE=1.45,TX=2.0,MP=trumpMP,SPD=trumpV,TH3=trumpE;
  const CP=V3(-3.38,2.22,0), CH=[V3(3.4,0,0),V3(1.3,0,1.9),V3(6.3,0,-1.7)];
  // caracola: espira (cono) + vuelta corporal + labio abierto; nácar rosado dentro (fijo: color de la concha)
  const SHELL=`vec3 shell(vec3 q){float an=atan(q.z,q.y)/6.2832;float s=fract(an*1.+q.x*5.5);
   float band1=smoothstep(.06,0.,abs(s-.5)-.32);float zig=step(.5,fract(q.x*22.+abs(fract(an*8.)-.5)*2.));
   vec3 c=mix(vec3(.93,.85,.72),vec3(.72,.5,.34),zig*.6+band1*.3);return c*(1.-band1*.25);}`;
  const shellMat=fx(SHELL+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(shell(vP)*${LIT}+vec3(1.)*${SPEC(14)}*.3+uC1*fr*uA,1.);}`,SOLID);
  const lipMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 c=gl_FrontFacing?mix(vec3(.95,.86,.74),vec3(.75,.55,.4),noise(vP*20.)):mix(vec3(1.,.72,.68),vec3(1.,.9,.85),noise(vP*14.));
   gl_FragColor=vec4(c*${LIT}+uC1*(fr*.5+(gl_FrontFacing?0.:1.)*.6)*uA,1.);}`,DS);
  const conch=new THREE.Group();
  const spire=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.52,28,6).rotateZ(Math.PI/2).translate(-0.32,0,0),shellMat);
  const whorl=new THREE.Mesh(new THREE.SphereGeometry(0.2,28,18),shellMat); whorl.scale.set(1.15,0.95,0.95);
  const lip=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.13,0.26,32,1,true).rotateZ(-Math.PI/2).translate(0.2,0,0),lipMat);
  const knobs=[0,1,2,3,4].map(i=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.1,8),shellMat);const an=i*1.25;m.position.set(-0.08+i*0.02,Math.cos(an)*0.19,Math.sin(an)*0.19);m.rotation.x=an;return m;});
  conch.add(spire,whorl,lip,...knobs); L.mesh.add(conch);
  // ondas sónicas: tres esferas que crecen desde la boca de la caracola
  const WAVE_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);vec3 q=normalize(vP);
   float n=noise(q*6.+vec3(uT*1.5));float rip=.5+.5*sin(q.y*40.+q.x*25.+uT*12.);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.4+vec3(1.)*fr*rip*.25,(fr*(.6+.4*rip)+.03)*(.6+.4*n)*uA);}`;
  const waves=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(WAVE_FS));m.position.copy(MP);m.userData.d=i*0.13;L.trail.add(m);return m;});
  // oleaje en el suelo: tres crestas concéntricas con espuma, bajo el lanzador
  const swell=groundPlane(30,-3.7,0.022,fx(`void main(){vec2 p=(vUv-.5)*30.;float r=length(p);float an=atan(p.y,p.x);
   float m=0.;for(int i=0;i<3;i++){float c=(uP-float(i)*.13)*${f(SPD)};if(c>0.){float w=.35+.1*float(i);
    float foam=noise(vec3(an*12.,r*2.,uT*2.+float(i)));m+=band(r,c,w)*(.55+.45*foam)*smoothstep(15.,4.,c)*(1.-float(i)*.25);}}
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.3,m*.75*uA);}`));
  L.decal.add(swell);
  const rings=CH.map(c=>{const r=groundPlane(2.2,c.x,0.03,fx(RING_FS));r.position.z=c.z;L.decal.add(r);return r;});

  const C=`const float TA=${f(TA)};const float TB=${f(TB)};const vec3 MP=${v3(MP)};const vec3 CP=${v3(CP)};`;
  // aliento: aire y gotas que entran por la espira
  a.count+=points(L.part,55,C+`void main(){float s=TA+aSeed.x*(TB-TA-.1);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 dst=CP+vec3(-.45,0.,0.);vec3 p=mix(dst+normalize(rnd()+vec3(-.6,0.,0.))*(.9+.5*aSeed.y),dst,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.04*aSeed.z);}`);
  // bramido: rocío marino que sale despedido en cono por la boca
  a.count+=points(L.part,95,C+`void main(){float s=TB+aSeed.x*.45;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=normalize(vec3(1.,r.y*.45+.1,r.z*.45))*(3.+4.*aSeed.z);vec3 p=MP+v*t+vec3(0.,-2.5*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.07+.07*aSeed.w)*(1.-age*.4));}`,DROP_FS);
  // en cada rival: rocío y espuma levantados por la onda (el tiempo de llegada depende de la distancia)
  CH.forEach((c,i)=>{
    a.count+=points(L.part,36,C+`void main(){float s=${f(TH3[i])}+aSeed.x*.08;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 v=normalize(r+vec3(.6,.7,0.))*(1.5+2.5*aSeed.z);vec3 p=${v3(c)}+vec3(0.,.4+aSeed.w*1.2,0.)+v*t+vec3(0.,-3.*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>.02)?(1.-age):0.;put(p,(.07+.07*aSeed.w));}`,DROP_FS);
    a.count+=sparks(L.part,40,TH3[i],`${f(c.x)},1.2,${f(c.z)}`,".7,.4,0.",2,5,2);
  });

  a.pose=function(te,o){
    const ib=te-TB, grow=ss(0,TA,te)*(1-ss(TE,TX,te));
    // caracola: aparece girando, se inclina al tomar aire y vibra al bramar
    const vib=te>=TB&&te<TE?0.02*Math.sin(te*95)*(1-ss(TB+0.5,TE,te)):0;
    conch.visible=grow>0.001; conch.position.set(CP.x+vib-0.1*ss(TA,TB,te)+0.12*ss(TB,TB+0.06,te)*(1-ss(TB+0.3,TE,te)),CP.y+vib*0.5,0);
    conch.rotation.set((1-grow)*2.5,0,0.12*ss(TA,TB,te)-0.05*ss(TB,TB+0.1,te)); conch.scale.setScalar(Math.max(grow,0.001)*(1+0.12*ss(TA,TB,te)*(1-ss(TB,TB+0.08,te))));
    shellMat.uniforms.uA.value=lipMat.uniforms.uA.value=0.3*grow+(ib>=0?0.9*Math.exp(-ib*3):0.4*ss(TA,TB,te));
    for(const w of waves){const k=te-TB-w.userData.d,r=k*SPD;w.visible=k>0&&r<13;if(!w.visible)continue;
      w.scale.setScalar(Math.max(r,0.01)); w.material.uniforms.uA.value=(1-ss(3,13,r))*(0.5-w.userData.d*1.4)*ss(0,0.4,r);}
    swell.material.uniforms.uP.value=Math.max(ib,0); swell.material.uniforms.uA.value=ib>=0?1-ss(0.7,1.3,ib):0;
    let last=-1,lt=-1;
    [target,enemies[0],enemies[1]].forEach((d,i)=>{const ih=te-TH3[i];if(ih>=0&&TH3[i]>lt){lt=TH3[i];last=i;}
      const j=hitK(ih,4);d.position.x=CH[i].x+0.12*j*Math.sin(ih*60)+0.15*j*(1-Math.exp(-Math.max(ih,0)*20));d.rotation.z=-0.12*j*Math.sin(ih*35);
      if(i>0)glowEm(d,0.8*hitK(ih,5));
      const p=cl(ih/0.5);set(rings[i],1-Math.pow(1-p,2),ih>=0?(1-p)*0.8:0);});
    caster.rotation.z=0.06*ss(TA,TB,te)-0.1*ss(TB,TB+0.06,te)*(1-ss(TB+0.3,TE,te));
    if(te<TB){o.g.copy(CP);o.gs=0.9*grow;o.ga=0.3*grow;o.li=1.8*grow;}
    else if(last<0){o.g.copy(MP);o.gs=1.6+3*ib;o.ga=0.6*Math.exp(-ib*5);o.li=6*Math.exp(-ib*3);}
    else{const il=te-lt;o.g.copy(CH[last]).y=1.2;o.gs=1.5+2*Math.min(il,0.5);o.ga=0.5*Math.exp(-il*8);o.li=5*Math.exp(-il*5);}
    o.ia=last<0?te-TH3[0]:te-lt; o.c.set(last<0?TC.x:CH[last].x,1.2,last<0?0:CH[last].z); o.shake=0; o.dist=0.55; o.flash=last===0||last<0?1:0.3;
  };
}};

// =====================================================================
// 4 · BIG SISTER (nivel 1) — una marea de agua cristalina recorre la fila del equipo de atrás hacia delante
//     y empuja al lanzador y a sus aliados con celeridad; rápido, pequeño y sin marca de suelo
// =====================================================================
const sister={key:"bcBigSister",name:"Big Sister",pa:1,dur:1.3,ti:0.36,pal:"Menta",allies:2,
  phases:[["Marea",0],["Empuje",0.36],["Reflujo",0.75]],
build(a){
  const L=a.L,T0=0.06,TI=0.36,TD=0.72,TE=0.95,X0=-6.6,V=9.6,ZC=-0.85,W=3.1,R=0.26;
  const wx=te=>X0+V*Math.max(te-T0,0);
  const PX=[-3.7,ALLY_POS[0].x,ALLY_POS[1].x], PZ=[0,ALLY_POS[0].z,ALLY_POS[1].z], PT=PX.map(x=>T0+(x-X0)/V);
  // cresta: medio tubo curvado a lo largo de z, agua cristalina con cáusticas y espuma en el labio
  const crest=new THREE.Mesh(new THREE.CylinderGeometry(R,R,W,28,1,true,1.7,4.45).rotateX(Math.PI/2),fx(`
  void main(){float an=atan(vP.y,vP.x);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float ca=noise(vec3(vP.z*5.-uT*3.,an*2.,uT*2.));float caus=pow(1.-abs(ca*2.-1.),6.);
   float lip=smoothstep(.75,.05,abs(an-.2));float foam=smoothstep(.55,.8,noise(vec3(vP.z*12.,an*6.,uT*5.)))*lip;
   float ends=smoothstep(${f(W/2)},${f(W/2-0.5)},abs(vP.z));
   gl_FragColor=vec4(mix(uC2,uC1,fr+caus*.5)*1.3+vec3(1.)*(foam+caus*.3),(fr*.6+caus*.35+foam*.8+.08)*ends*uA);}`));
  // lámina de agua que arrastra la ola, rasante sobre el suelo
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(1.6,W).rotateX(-Math.PI/2).translate(-0.8,0,0),fx(`
  void main(){float u=vUv.x;float n=noise(vec3(vUv*vec2(6.,10.)-vec2(uT*4.,0.),uT));
   float caus=pow(1.-abs(n*2.-1.),5.);float ends=smoothstep(0.,.18,vUv.y)*smoothstep(1.,.82,vUv.y);
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.2+vec3(1.)*caus*.3,(u*u*.4+caus*.3*u)*ends*uA);}`));
  L.mesh.add(crest,sheet);

  const C=`const float T0=${f(T0)};const float X0=${f(X0)};const float V=${f(V)};const float ZC=${f(ZC)};
  float wx(float t){return X0+V*max(t-T0,0.);}`;
  // espuma y gotas que salen de la cresta
  a.count+=points(L.part,110,C+`void main(){float s=T0+aSeed.x*.62;float life=.32+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(wx(s)+.1,.42,ZC+r.z*${f(W/2)})+vec3(1.2+r.x*.8,1.4+1.2*aSeed.w,r.y*.3)*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?(1.-age):0.;put(p,(.05+.05*aSeed.w));}`,DROP_FS);
  a.count+=points(L.part,26,C+`void main(){float s=T0+aSeed.x*.6;float life=.25;float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=vec3(wx(s)+.15,.3+aSeed.w*.3,ZC+r.z*${f(W/2)});
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.08*aSeed.y);}`,STAR4_FS);
  // estela de celeridad tras cada Axie empujado
  PX.forEach((x,i)=>{a.count+=points(L.part,28,C+`void main(){float s=${f(PT[i])}+aSeed.x*.25;float life=.25+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-${f(PT[i])})/.25,0.,1.);vec3 p=vec3(${f(x)}+.4*(1.-pow(1.-k,2.))-.25-t*1.2,.15+aSeed.z*1.2,${f(PZ[i])}+(aSeed.w-.5)*.5);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.4+.2*aSeed.w);vMix=0.;}`,STREAK_FS);});

  a.pose=function(te,o){
    const x=wx(te), env=ss(T0,T0+0.08,te)*(1-ss(TD,TE,te));
    crest.visible=sheet.visible=env>0.001;
    crest.position.set(x,R+0.05,ZC); crest.scale.set(1,1+0.15*Math.sin(te*20),1); set(crest,0,env);
    sheet.position.set(x,0.03,ZC); set(sheet,0,env*0.9);
    // empuje: cada Axie avanza rápido al pasar la ola y vuelve suave al final
    [caster,allies[0],allies[1]].forEach((d,i)=>{const k=ss(PT[i]-0.02,PT[i]+0.2,te)*(1-ss(0.95,1.28,te));
      d.position.x=PX[i]+0.42*k; d.rotation.z=-0.12*ss(PT[i]-0.02,PT[i]+0.06,te)*(1-ss(PT[i]+0.06,PT[i]+0.3,te));
      glowEm(d,0.55*hitK(te-PT[i],6));});
    o.g.set(x+0.1,0.45,ZC); o.gs=1.0*env; o.ga=0.35*env; o.li=2.5*env;
    o.ia=te-TI; o.c.set(-3.7,0.6,0); o.shake=0; o.dist=0.25; o.flash=0;
  };
}};

// =====================================================================
// 5 · EGGSHELL — un huevo gigante se forma sobre los cuernos y sale en parábola; se estrella, la cáscara salta
//     y la yema dorada cubre al rival; un aroma dorado parte del lanzador hacia todos los rivales (Taunt)
// =====================================================================
const egg={key:"bcEggshell",name:"Eggshell",pa:2,dur:2.3,ti:0.8,pal:"Dorado",enemies:2,
  phases:[["Huevo",0],["Lanzamiento",0.32],["Impacto",0.8],["Yema",0.92],["Aroma",1.1],["Fin",1.9]],
build(a){
  const L=a.L,TL=0.32,TI=0.8,TA=1.1,TE=1.95,DUR=2.3,E0=V3(-3.5,2.65,0),EP=V3(3.05,1.5,0),AH=1.6;
  const EN=[V3(3.4,0,0),V3(1.3,0,1.9),V3(6.3,0,-1.7)], SRC=V3(-3.7,1.4,0);
  // cáscara: crema moteada; uP abre grietas brillantes justo antes del golpe
  const eggMat=fx(`void main(){vec3 q=normalize(vP);float sp=smoothstep(.72,.8,noise(q*14.))*.5+smoothstep(.8,.86,noise(q*30.+3.))*.4;
   vec3 c=mix(vec3(.98,.93,.84),vec3(.62,.45,.3),sp);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float cr=pow(1.-abs(noise(q*5.+2.)*2.-1.),24.)*uP;
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(18)}*.4+uC1*(fr*.9*uA+cr*3.),1.);}`,SOLID);
  const eggM=new THREE.Mesh(new THREE.SphereGeometry(0.3,40,28),eggMat); const eggG=new THREE.Group(); eggG.add(eggM); L.mesh.add(eggG);
  // yema: casquete brillante que cubre al rival y gotea hacia abajo (uP = cobertura)
  const yolk=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
   float cov=uP*(1.25+.5*noise(vec3(an*2.5,0.,1.))+.35*pow(noise(vec3(an*7.,0.,4.)),3.));
   if(q.y<1.-cov)discard;float edge=smoothstep(.12,0.,q.y-(1.-cov));
   vec3 c=mix(vec3(1.,.62,.05),mix(uC1,vec3(1.,.85,.3),.5),.4+.4*noise(q*6.+uT*.4))*(1.-edge*.3);
   float s=${SPEC(30)};float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*s*.9+uC2*fr*.4,(.92-edge*.2)*uA);}`,NB));
  yolk.scale.set(0.5,0.62,0.5); L.mesh.add(yolk);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // estela dorada del huevo
  const trail=new THREE.Mesh(new THREE.PlaneGeometry(1,0.5).translate(-0.5,0,0),fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*8.-uT*10.,vUv.y*6.,0.));gl_FragColor=vec4(mix(uC2,uC1,u)*1.4,smoothstep(.2+.8*u,0.,v)*u*u*(.5+.5*n)*uA);}`,{depthTest:false}));
  L.trail.add(trail);
  // aroma: tres cintas onduladas del lanzador a la cabeza de cada rival (uP = avance)
  const ribbons=EN.map((e,i)=>{const h=V3(e.x-0.25,AH,e.z),c1=V3(SRC.x+(h.x-SRC.x)*0.35,2.6+0.3*i,SRC.z+(h.z-SRC.z)*0.35),c2=V3(SRC.x+(h.x-SRC.x)*0.7,2.2,h.z*0.9);
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(SRC.clone(),c1,c2,h),60,0.05,6,false),fx(`void main(){float u=vUv.x;if(u>uP)discard;
     float n=noise(vec3(u*14.-uT*5.,vUv.y*6.,${f(i)}));float head=smoothstep(.1,0.,uP-u);
     gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.4+vec3(1.)*head*.5,(.25+.45*n+head)*smoothstep(0.,.05,u)*uA);}`));
    L.trail.add(m);return m;});

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TA=${f(TA)};const vec3 E0=${v3(E0)};const vec3 EP=${v3(EP)};const vec3 SRC=${v3(SRC)};
  vec3 ep(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return vec3(E0.x+(EP.x-E0.x)*k,E0.y+(EP.y-E0.y)*k+6.4*k*(1.-k),0.);}`;
  // formación: luz dorada que se cierra en el huevo
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*(TL-.08);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(E0+normalize(rnd())*(.8+.4*aSeed.y),E0+normalize(rnd())*.28,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.04*aSeed.z);}`);
  a.count+=points(L.part,60,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=ep(s)+rnd()*.15+vec3(-.2*t,-.3*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.05+.05*aSeed.w)*(1.-age*.5));}`);
  // cáscara rota: esquirlas curvas (mezcla normal) que caen y quedan en el suelo
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.03;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.6,0.))*(2.+3.5*aSeed.z);vec3 p=EP+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-smoothstep(.7,1.,age):0.;put(p,.12+.1*aSeed.w);vMix=aSeed.w+t*(2.+3.*aSeed.y)*step(.04,p.y);}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
    float d=abs(length(q-vec2(0.,.35))-.4);float a=smoothstep(.08,.05,d)*step(abs(q.x),.3)*vA;if(a<.003)discard;
    gl_FragColor=vec4(mix(vec3(.97,.92,.82),vec3(.7,.55,.4),step(.0,length(q-vec2(0.,.35))-.4)*.5),a);}`,NB);
  // salpicadura de yema (mezcla normal) y destellos
  a.count+=points(L.part,85,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(1.5+3.*aSeed.z);vec3 p=EP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.09+.1*aSeed.w)*(1.-age*.3));}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=smoothstep(.34,.26,d)*vA;if(a<.003)discard;
    float hl=smoothstep(.1,0.,length(q-vec2(-.08,-.08)));gl_FragColor=vec4(mix(vec3(1.,.6,.05),uC1,.35)*(1.1-d)+vec3(1.)*hl*.7,a);}`,NB);
  a.count+=sparks(L.part,80,TI,`${f(EP.x)},${f(EP.y)},0.`,"-.4,.5,0.",2.5,6.5,3);
  // aroma: motas doradas que recorren las tres cintas y vapor dorado que sube del lanzador
  a.count+=points(L.part,60,C+`void main(){float s=TA+aSeed.x*.6;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.5;vec3 p=SRC+vec3(cos(an)*(.45+.2*aSeed.w),-1.1+t*1.8,sin(an)*(.45+.2*aSeed.w));
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.7:0.;put(p,(.3+.2*aSeed.w)*(.6+age*.6));}`,SMOKE_FS("vec3(1.,.82,.4)"));

  const shock=groundPlane(3.6,3.4,0.03,fx(RING_FS));
  // charco de yema bajo el rival (mezcla normal, brillante)
  const puddle=groundPlane(1.9,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,1.))*.6+noise(vec3(p*14.,3.))*.4;
   float m=smoothstep(uP,uP-.08,r+(n-.5)*.3);float hl=smoothstep(.12,0.,length(p-vec2(-.08,.06)))*.5;
   gl_FragColor=vec4(mix(vec3(1.,.6,.05),uC1,.3)*(.8+.3*n)+vec3(1.)*hl,m*.85*uA);}`,NB));
  // aroma bajo el lanzador: anillo dorado que late
  const lure=groundPlane(2.2,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.8+.04*sin(uT*6.),.05)+band(r,.55,.02)*.6+pow(abs(sin(an*6.+r*8.-uT*4.)),12.)*smoothstep(.85,.3,r)*.4;
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,m*uA);}`));
  L.decal.add(shock,puddle,lure);

  const ep=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TL-0.05,te), fly=cl((te-TL)/(TI-TL));
    arcPt(E0,EP,1.6,fly,ep); if(te<TL)ep.y+=0.04*Math.sin(te*18);
    eggG.visible=te<TI; eggG.position.copy(ep); eggG.rotation.z=te<TL?0.1*Math.sin(te*14):-(te-TL)*14;
    eggM.scale.set(0.85*form,1.12*form+0.001,0.85*form); set(eggM,ss(TI-0.08,TI,te),0.4+0.6*form);
    trail.visible=te>=TL&&te<TI; trail.position.copy(ep); trail.scale.set(Math.max(fly*2.2,0.01),1,1);
    tmp2.set(EP.x-E0.x,EP.y-E0.y+6.4*(1-2*fly),EP.z-E0.z); billboard(trail,scrAng(ep.clone(),tmp2.clone()));
    let p=cl(ia/0.35); towardCam(hitRing.position,EP,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    // rival: retrocede con el golpe; la yema lo cubre y le sigue
    const hit=hitK(ia,4.5); target.position.x=3.4+hit*0.32; target.rotation.z=-hit*0.3*Math.cos(Math.max(ia,0)*12);
    const sq=hitK(ia,8); target.scale.set(1+0.08*sq,1-0.12*sq,1+0.08*sq);
    yolk.visible=ia>=0; yolk.position.set(target.position.x,1.3,0); set(yolk,0.15+0.85*(1-Math.exp(-Math.max(ia,0)*2.5)),1-ss(TE,DUR,te));
    set(puddle,0.2+0.75*ss(TI+0.05,TI+0.8,te),ia>=0?1-ss(TE,DUR,te):0); puddle.position.x=target.position.x;
    // aroma: las cintas parten del lanzador; los rivales se inclinan hacia él
    const ar=ss(TA,TA+0.4,te), fade=1-ss(TE-0.1,DUR,te);
    ribbons.forEach((m,i)=>{set(m,ss(TA+i*0.06,TA+0.45+i*0.06,te)*1.02,fade*ss(TA,TA+0.1,te));m.visible=te>=TA;});
    set(lure,0,ar*fade);
    [target,enemies[0],enemies[1]].forEach((d,i)=>{d.rotation.z+=0.14*ss(TA+0.3+i*0.06,TA+0.6+i*0.06,te)*fade;if(i>0)glowEm(d,0.3*ar*fade);});
    glowEm(caster,0.45*ar*fade*(0.75+0.25*Math.sin(te*8)));
    caster.rotation.z=0.08*ss(0,TL,te)-0.15*ss(TL,TL+0.06,te)*(1-ss(TL+0.1,TL+0.45,te));
    if(te<TL){o.g.copy(ep);o.gs=1.2*form;o.ga=0.4*form;o.li=2.5*form;}
    else if(te<TI){o.g.copy(ep);o.gs=1.2;o.ga=0.4;o.li=3;}
    else if(te<TA){o.g.copy(EP);o.gs=1.6+3*Math.min(ia,0.4);o.ga=0.6*Math.exp(-ia*8);o.li=7*Math.exp(-ia*4);}
    else{o.g.copy(SRC);o.gs=2;o.ga=0.25*ar*fade;o.li=2.5*ar*fade;}
    o.ia=ia;o.c.copy(EP);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 6 · WING HORN — doce plumas de energía rosa se despliegan en abanico desde los cuernos y salen en salva:
//     vuelan en arco alto por encima del primer rival (que se agacha) y se clavan en el segundo, el objetivo
// =====================================================================
const wing={key:"bcWingHorn",name:"Wing Horn",pa:2,dur:2.1,ti:0.98,pal:"Rosa",enemies:1,
  phases:[["Despliegue",0],["Salva",0.45],["Arco",0.6],["Impactos",0.86],["Plumas",1.2]],
build(a){
  const L=a.L,N=12,TU=0.4,TL0=0.45,DT=0.024,FD=0.42,FL=0.72,E1=V3(0.35,0,0.15);
  // datos por pluma: lado (cuerno), ángulo final del abanico, punto de reposo, control alto del arco e impacto
  const F=[];for(let i=0;i<N;i++){const s=i%2?1:-1,j=i>>1,ang=s>0?(0.25+j*0.24):(Math.PI-0.25-j*0.24);
    const piv=V3(-3.54,2.05,0.27*s), rp=V3(piv.x+Math.cos(ang)*FL*0.5,piv.y+Math.sin(ang)*FL*0.5,piv.z);
    const ord=[5,3,1,0,2,4][j]*2+(s>0?1:0);
    F.push({s,ang,piv,rp,tl:TL0+ord*DT,ctl:V3(-0.4+0.3*(j-2.5),4.4+0.25*j,0.45*s),hp:V3(3.1+0.05*(j%3),1.0+0.11*j,0.18*s*((j%2)?1:-0.5))});}
  const hitT=F.map(d=>d.tl+FD), TF=Math.max(...hitT), TI=0.98;
  const bz=(d,k,o)=>{const u=1-k;return o.set(u*u*d.rp.x+2*u*k*d.ctl.x+k*k*d.hp.x,u*u*d.rp.y+2*u*k*d.ctl.y+k*k*d.hp.y,u*u*d.rp.z+2*u*k*d.ctl.z+k*k*d.hp.z);};
  const fm=F.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(FL,0.2),fx(FEATHER_MESH_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // abanico de luz rosa que se abre en los cuernos mientras las plumas se despliegan
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(`void main(){vec2 p=(vUv-vec2(.5,.38))*2.;float r=length(p);float an=atan(p.y,p.x);
   float spread=uP*1.45;float inF=smoothstep(.06,0.,abs(an-1.5708)-spread)*step(0.,p.y+.1);
   float rays=pow(abs(cos(an*6.)),18.)*smoothstep(1.,.2,r);float n=noise(vec3(an*4.,r*5.-uT*4.,1.));
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*n)*1.4,(rays*.8+smoothstep(1.,.1,r)*.25*n)*inF*smoothstep(.05,.2,r)*uA);}`,{depthTest:false}));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false}));
  L.mesh.add(fan,hitRing);

  const A=(arr,fn)=>arr.map(fn).join(",");
  const C=`const float FD=${f(FD)};const vec3 TCx=${v3(TC)};
  const vec3 RP[12]=vec3[12](${A(F,d=>v3(d.rp))});const vec3 CT[12]=vec3[12](${A(F,d=>v3(d.ctl))});const vec3 HP[12]=vec3[12](${A(F,d=>v3(d.hp))});
  const float TLs[12]=float[12](${A(F,d=>f(d.tl))});
  vec3 bz(int i,float k){float u=1.-k;return u*u*RP[i]+2.*u*k*CT[i]+k*k*HP[i];}`+SANG;
  // destellos en las puntas al desplegarse
  a.count+=points(L.part,60,C+`void main(){int i=int(floor(aSeed.x*11.999));float s=.08+aSeed.y*.3;float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=RP[i]+(RP[i]-vec3(-3.54,2.05,RP[i].z))*(.6+aSeed.z*.6)+rnd()*.06+vec3(0.,t*.6,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.035*aSeed.w);}`);
  // estela de cada pluma (motas y trazos rosas sobre su arco)
  a.count+=points(L.part,230,C+`void main(){int i=int(floor(aSeed.x*11.999));float s=TLs[i]+aSeed.y*FD;float life=.22+aSeed.z*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TLs[i])/FD,0.,1.);vec3 p=bz(i,k)+rnd()*.05+vec3(0.,-.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*50.+aSeed.w*20.)):0.;put(p,(.05+.05*aSeed.w)*(1.-age*.6));}`);
  // en cada impacto: estallido de motas y plumón que se desprende
  a.count+=points(L.part,120,C+`void main(){int i=int(floor(aSeed.x*11.999));float s=TLs[i]+FD;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.8,.3,0.))*(1.5+3.*aSeed.z);vec3 p=HP[i]+v*t+vec3(0.,-2.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.05*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,48,C+`void main(){int i=int(floor(aSeed.x*11.999));float s=TLs[i]+FD;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=HP[i]+vec3(-.6*r.y-.3,.5+.6*aSeed.z,r.z*.6)*(1.-exp(-t*3.))+vec3(sin(t*4.+aSeed.w*9.)*.2,-.55*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,.13+.07*aSeed.w);vMix=aSeed.w+t*.4*sign(r.x);}`,FEATHER_FS);
  a.count+=sparks(L.part,110,TF,`${f(TC.x)},${f(TC.y)},0.`,"-.5,.4,0.",3,7,3);

  const shock=groundPlane(3.6,3.4,0.03,fx(RING_FS)), duck=groundPlane(1.6,E1.x,0.02,fx(RING_FS)); duck.position.z=E1.z;
  L.decal.add(shock,duck);

  const fp=V3(0,0,0), fv=V3(0,0,0);
  a.pose=function(te,o){
    const un=ss(0.04,TU,te), iF=te-TF;
    let last=-1;
    F.forEach((d,i)=>{const m=fm[i],k=(te-d.tl)/FD;
      if(k<0){const ang=Math.PI/2+(d.ang-Math.PI/2)*un;fp.set(d.piv.x+Math.cos(ang)*FL*0.5*un,d.piv.y+Math.sin(ang)*FL*0.5*un,d.piv.z);
        m.position.copy(fp); billboard(m,ang); m.scale.setScalar(Math.max(un,0.01));
        set(m,0.2,un*(0.85+0.15*Math.sin(te*20+i)));m.visible=un>0.01;}
      else if(k<1){bz(d,k,fp);bz(d,Math.min(k+0.03,1),fv);fv.sub(fp);m.position.copy(fp);billboard(m,scrAng(fp,fv));m.scale.setScalar(1);set(m,1,1);m.visible=true;}
      else{const ih=te-hitT[i];bz(d,0.97,fv);fv.sub(d.hp).negate();m.position.copy(d.hp);billboard(m,scrAng(d.hp,fv)+0.04*Math.sin(ih*60)*Math.exp(-ih*10));
        m.scale.set(1-0.35*cl(ih/0.5),1,1);set(m,0,1-ss(0.15,0.55,ih));m.visible=ih<0.55;if(hitT[i]>(last<0?-1:hitT[last]))last=i;}});
    towardCam(fan.position,HN.clone().add(tmp.set(0,0.35,0)),0.1); billboard(fan); set(fan,un,un*(1-ss(TL0,TL0+N*DT+0.1,te))*0.9); fan.visible=te<TL0+N*DT+0.1;
    // primer rival: en línea, se agacha mientras la salva le pasa por encima
    const e=enemies[0]; e.position.set(E1.x,0,E1.z); const dk=ss(0.55,0.68,te)*(1-ss(0.9,1.1,te)); e.scale.set(1+0.06*dk,1-0.16*dk,1+0.06*dk);
    set(duck,1-Math.pow(1-cl((te-0.6)/0.5),2),te>=0.6?(1-cl((te-0.6)/0.5))*0.5:0);
    // objetivo: un tirón por pluma y retroceso final
    let kb=0;for(const t of hitT)kb+=0.05*hitK(te-t,9);kb+=0.2*hitK(iF,4);
    target.position.x=3.4+kb; target.rotation.z=-kb*0.6*Math.cos(Math.max(te-hitT[0],0)*20);
    let p=cl(iF/0.4); towardCam(hitRing.position,TC,0.4); billboard(hitRing); hitRing.visible=iF>=0&&p<1; set(hitRing,p,1-p);
    p=cl(iF/0.55); set(shock,1-Math.pow(1-p,2),iF>=0?(1-p)*0.8:0);
    caster.rotation.z=0.07*un*(1-ss(TL0,TL0+0.1,te))-0.1*ss(TL0,TL0+0.06,te)*(1-ss(TL0+0.2,TF,te));
    glowEm(caster,0.35*un*(1-ss(TL0,TF,te)));
    if(te<TL0){o.g.copy(HN).y+=0.35;o.gs=1.4*un;o.ga=0.35*un;o.li=2.5*un;}
    else if(last<0){const k=cl((te-TL0)/FD);bz(F[5],k,fp);o.g.copy(fp);o.gs=1.3;o.ga=0.35;o.li=3;}
    else{const il=te-hitT[last];o.g.copy(TC);o.gs=1.3+2*Math.min(il,0.5)+(iF>=0?1:0);o.ga=0.5*Math.exp(-il*9)+(iF>=0?0.3*Math.exp(-iF*6):0);o.li=4*Math.exp(-il*6)+(iF>=0?5*Math.exp(-iF*4):0);}
    o.ia=last<0?te-hitT[0]:(iF>=0?iF:te-hitT[last]); o.c.copy(TC); o.shake=0; o.dist=iF>=0?0.6:0.3; o.flash=iF>=0?1:0.6;
  };
}};

// =====================================================================
// 7 · KESTREL — un grito agudo sube de los cuernos al cielo; tres garras espectrales de cernícalo caen en picado
//     sobre el rival entre ráfagas, lo atenazan y lo rasgan con tres cortes de viento
// =====================================================================
const kestrel={key:"bcKestrel",name:"Kestrel",pa:2,dur:2.2,ti:0.88,pal:"Plata",
  phases:[["Grito",0],["Ascenso",0.12],["Picado",0.42],["Garras",0.88],["Ráfagas",0.98],["Calma",1.6]],
build(a){
  const L=a.L,TC0=0.12,TD=0.42,TI=0.88,CUT=[0.98,1.07,1.16],TE=1.6,DUR=2.2,S=V3(1.4,8.2,-0.3),G=V3(3.32,2.2,0);
  const dv=(te,out)=>{const k=Math.pow(cl((te-TD)/(TI-TD)),2.1);return out.set(S.x+(G.x-S.x)*(1-Math.pow(1-k,0.7)),S.y+(G.y-S.y)*k,S.z*(1-k));};
  // grito: haz fino que sube de los cuernos con la cabeza brillante (uP)
  const cry=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,9,12,1,true).translate(0,4.5,0),fx(`void main(){float h=vP.y/9.;if(h>uP)discard;
   float head=smoothstep(.08,0.,uP-h);float n=noise(vec3(h*30.-uT*20.,atan(vP.z,vP.x),0.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),head)*1.6,(.35+.4*n+head*1.5)*(1.-h*.5)*uA);}`));
  cry.position.copy(HN);
  // garras: tres ganchos curvos de viento plateado que cuelgan del punto de agarre
  const clawMat=fx(`void main(){float u=vUv.x;float n=noise(vec3(u*10.-uT*8.,vUv.y*6.,uT*2.));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float tip=smoothstep(.75,1.,u);
   gl_FragColor=vec4(mix(uC2,uC1,fr+tip)*1.6+vec3(1.)*tip*.5,(fr*.8+.25+n*.35+tip)*uA);}`);
  const clawG=pathTube((t,o)=>o.set(0.32*Math.sin(t*1.9),-0.62*Math.sin(t*1.45),0),18,40,8,0.075,0.012);
  const grip=new THREE.Group(), claws=[[0.0,0.0],[0.0,2.2],[0.0,-2.2]].map(([z,ry],i)=>{const piv=new THREE.Group(),m=new THREE.Mesh(clawG,clawMat);
    piv.rotation.y=i===0?Math.PI:ry*0.4; piv.add(m); grip.add(piv); return piv;});
  const knot=new THREE.Mesh(new THREE.SphereGeometry(0.16,20,14),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.5,(fr+.2)*uA);}`)); grip.add(knot);
  L.mesh.add(cry,grip);
  // vaina de viento del picado: planos cruzados con hebras que fluyen hacia atrás
  const tg=new THREE.PlaneGeometry(1,0.7).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float fib=noise(vec3(u*6.-uT*14.,vUv.y*18.,0.));
   float st=smoothstep(.5,.85,fib);gl_FragColor=vec4(mix(uC2,uC1,st)*1.5,smoothstep(.2+.8*u,0.,v)*pow(u,1.5)*(.35+.8*st)*uA);}`);
  const sheath=new THREE.Group(), s2=new THREE.Mesh(tg,tm); s2.rotation.x=Math.PI/2; sheath.add(new THREE.Mesh(tg,tm),s2); L.trail.add(sheath);
  // cortes de viento y torbellino tras el agarre
  const cuts=CUT.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.0,1.0),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));L.trail.add(m);return m;});
  const vortex=new THREE.Group(), vx=[];[0,1,2].forEach(i=>{const m=new THREE.Mesh(helixGeo(1.3,0.75,0.4,2.2,0.16,90),fx(`void main(){float u=vUv.x;
   float n=noise(vec3(u*12.-uT*6.,vUv.y*3.,${f(i)}));float e=smoothstep(0.,.5,vUv.y)*smoothstep(1.,.5,vUv.y);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,e*(.3+.6*n)*smoothstep(0.,.1,u)*smoothstep(1.,.75,u)*uA);}`));m.rotation.y=i*2.094;vortex.add(m);vx.push(m);});
  vortex.position.set(3.4,0.05,0); L.trail.add(vortex);

  const C=`const float TC0=${f(TC0)};const float TD=${f(TD)};const float TI=${f(TI)};const vec3 S=${v3(S)};const vec3 G=${v3(G)};const vec3 HN=${v3(HN)};
  vec3 dv(float t){float k=pow(clamp((t-TD)/(TI-TD),0.,1.),2.1);return vec3(S.x+(G.x-S.x)*(1.-pow(1.-k,.7)),S.y+(G.y-S.y)*k,S.z*(1.-k));}`+SANG;
  // grito: anillos de chispas en los cuernos y motas que suben
  a.count+=points(L.part,40,C+`void main(){float s=TC0+aSeed.x*.2;float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HN+vec3((aSeed.y-.5)*.2,t*14.*(.5+.5*aSeed.z),(aSeed.w-.5)*.2);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.3+.2*aSeed.w);vMix=.25;}`,STREAK_FS);
  // corrientes de aire en el picado: trazos alineados con la caída
  a.count+=points(L.part,110,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.18+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=dv(s+.01)-dv(s);vec3 p=dv(s)+r*.45-normalize(v+.0001)*t*2.;
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,.5+.3*aSeed.w);vMix=sang(p,normalize(v+.0001));}`,STREAK_FS);
  // plumas que suelta la rapaz al picar y tras el golpe
  a.count+=points(L.part,36,C+`void main(){float s=TD+.2+aSeed.x*.8;float life=1.1+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=dv(min(s,TI))+vec3(r.x*.4,r.y*.3,r.z*.4)+vec3(sin(t*3.5+aSeed.w*9.)*.3,-.7*t,cos(t*3.+aSeed.z*6.)*.2);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,.17+.08*aSeed.w);vMix=aSeed.w+sin(t*3.+aSeed.x*9.)*.15;}`,FEATHER_FS);
  // golpe: chispas, polvo de viento en anillo
  a.count+=sparks(L.part,110,TI,`${f(G.x)},${f(G.y-0.6)},0.`,"0.,.2,0.",2.5,7.5,2.5);
  CUT.forEach((t,i)=>{a.count+=sparks(L.part,35,t,`${f(TC.x)},${f(TC.y)},.3`,i===1?".4,.6,.3":".4,-.4,.3",2,5.5,2.5);});
  a.count+=points(L.part,55,C+`void main(){float s=TI+aSeed.x*.1;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.;vec3 p=vec3(3.4,.05,0.)+vec3(cos(an),0.,sin(an))*(.3+1.1*(1.-exp(-t*3.)))*(.6+.4*aSeed.w)+vec3(0.,.35*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.25+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);

  // sombra de la rapaz sobre el rival (se encoge y oscurece al acercarse) y onda del golpe
  const shadow=groundPlane(2.2,3.4,0.012,fx(`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.6));
   gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.2,d)*.55*uA);}`,NB));
  const shock=groundPlane(3.8,3.4,0.03,fx(RING_FS));
  L.decal.add(shadow,shock);

  const gp=V3(0,0,0), gv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI; dv(te,gp);
    set(cry,ss(TC0,TC0+0.25,te),ss(TC0,TC0+0.04,te)*(1-ss(TD-0.05,TD+0.1,te))); cry.visible=te>=TC0&&te<TD+0.1;
    // garras: abiertas al caer, se cierran al agarrar y se deshacen en viento
    const env=ss(TD-0.05,TD+0.08,te)*(1-ss(CUT[2],TE,te)), close=ss(TI-0.03,TI+0.06,te);
    grip.visible=env>0.001; grip.position.copy(te<TI?gp:G); grip.position.y-=te>=TI?0.08*ss(TI,TI+0.08,te):0;
    dv(te+0.01,gv); gv.sub(gp); grip.rotation.set(0,0,te<TI?Math.max(-0.6,Math.min(0.6,Math.atan2(gv.x,-gv.y)*0.6)):0);
    claws.forEach((c,i)=>{c.rotation.z=(1-close)*0.75-close*0.35;});
    grip.scale.setScalar(0.85+0.2*ss(TD,TI,te)); clawMat.uniforms.uA.value=env*(0.75+(ia>=0?0.6*Math.exp(-ia*6):0)); set(knot,0,env*0.7);
    sheath.visible=te>=TD&&ia<0.25; sheath.position.copy(te<TI?gp:G); tmp.subVectors(S,G).normalize(); sheath.quaternion.setFromUnitVectors(XA,tmp.negate());
    sheath.scale.set(Math.max(Math.min(gp.distanceTo(S),3.5),0.01),1,1); tm.uniforms.uA.value=ia>0?1-cl(ia/0.25):ss(TD,TD+0.1,te);
    cuts.forEach((m,i)=>{const s=(te-CUT[i]+0.06)/0.07,ang=[0.8,-0.7,0.1][i];m.visible=s>=0&&te<DUR;towardCam(m.position,TC,0.6+i*0.02);billboard(m,ang);
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.5,s>1?Math.exp(-(s-1)*1.4):1);m.material.uniforms.uQ.value=s>=1?Math.exp(-(te-CUT[i])*2.5)*0.7:0;});
    vortex.visible=te>=TI&&te<TE+0.4; vortex.rotation.y=te*7; vortex.scale.set(1,0.6+0.5*ss(TI,TI+0.3,te),1);
    vx.forEach(m=>m.material.uniforms.uA.value=ss(TI,TI+0.12,te)*(1-ss(TE-0.2,TE+0.4,te)));
    shadow.material.uniforms.uA.value=ss(TD,TD+0.15,te)*(1-ss(TI+0.05,TI+0.3,te))*(0.4+0.6*ss(TD,TI,te)); shadow.scale.setScalar(Math.max(1.6-0.9*ss(TD,TI,te),0.3));
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    // rival: aplastado por el agarre, sacudido por cada corte
    let last=-1;for(const c of CUT)if(te>=c)last=c;
    const sq=hitK(ia,5)*(1-ss(CUT[2],TE,te)), kb=last>0?0.12*Math.exp(-(te-last)*8):0;
    target.scale.set(1+0.07*sq,1-0.13*sq,1+0.07*sq); target.position.x=3.4+kb; target.rotation.z=-kb*1.5*Math.cos((te-last)*18);
    caster.rotation.z=-0.12*ss(0,TC0,te)*(1-ss(TC0+0.1,TD,te));
    if(te<TD){o.g.copy(HN).y+=te>=TC0?Math.min((te-TC0)/0.25,1)*3:0;o.gs=0.8;o.ga=0.3*ss(0,0.08,te);o.li=2;}
    else if(te<TI){o.g.copy(gp);o.gs=1.3;o.ga=0.45;o.li=4;}
    else{const il=te-(last>0?last:TI);o.g.copy(TC);o.gs=1.4+2.5*Math.min(il,0.5);o.ga=0.6*Math.exp(-il*9);o.li=7*Math.exp(-il*5);}
    o.ia=last>0?te-last:ia;o.c.copy(TC);o.shake=0;o.dist=last>0?0.35:0.6;o.flash=last>0?0.7:1;
  };
}};

VFX.module("Pájaro · Cuernos",[cuckoo,spear,trump,sister,egg,wing,kestrel]);
})();

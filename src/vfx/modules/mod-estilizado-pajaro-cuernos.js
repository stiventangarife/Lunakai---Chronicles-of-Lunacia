// =====================================================================
// ESTILIZADO · PÁJARO · CUERNOS (Hito 101) — las 7 cartas de cuernos de Pájaro hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_bcCuckoo, sty_bcTrump…). Mismos dur / ti / fases que las originales, así el daño
// llega igual. Los efectos nacen junto a los cuernos del lanzador (≈ (-3.54, 2.05, 0)).
// Semántica según PartCards.js (la del módulo antiguo era de una versión anterior en varias cartas):
//   Cuckoo (aliado: quita Sueño + Potenciado) · Feather Spear (daño, +daño a ≥3 casillas) · Trump (daño, Shinji)
//   Big Sister (sobre sí: +2 PA) · Eggshell (daño + Provocación al lanzador) · Wing Horn (daño) · Kestrel (daño + Débil)
// Identidad Pájaro: plumas iluminadas en 3 bandas (rosa de la clase, crema, oro), viento en trazos de pincel, cielo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,camera,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CUCKOO=pal("Sty Pájaro · Cucú",["#ffb0cf","#c8466f"]);
const P_SPEAR=pal("Sty Pájaro · Lanza",["#ff9ec4","#b8336f"]);
const P_TRUMP=pal("Sty Pájaro · Caracola",["#86eef6","#14809e"]);
const P_SISTER=pal("Sty Pájaro · Hermana",["#ffc2dc","#d0507f"]);
const P_EGG=pal("Sty Pájaro · Huevo",["#ffd36e","#c9771a"]);
const P_WING=pal("Sty Pájaro · Ala",["#ff9bc0","#a72d66"]);
const P_KESTREL=pal("Sty Pájaro · Cernícalo",["#ffc07a","#9a4a1c"]);

const TX=3.4, CX=-3.7, TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0), HN=V3(-3.54,2.05,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), XA=V3(1,0,0), YA=V3(0,1,0), ZA=V3(0,0,1);
const qz=new THREE.Quaternion();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const aim=(o,d)=>o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());
// ángulo en pantalla de una velocidad v en p (para planos que miran a cámara y apuntan a donde vuelan)
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const faceFly=(o,p,v)=>{billboard(o,scrAng(p,v));};
const bez2=(out,a,b,c,t)=>{const s=1-t;return out.set(s*s*a.x+2*s*t*b.x+t*t*c.x,s*s*a.y+2*s*t*b.y+t*t*c.y,s*s*a.z+2*s*t*b.z+t*t*c.z);};

// ---------- colores de materia (semánticos, fijos) ----------
const CREAM="vec3(.96,.9,.78)", WOOD="vec3(.5,.3,.15)", GOLD="vec3(1.,.74,.26)", EARTH="vec3(.55,.42,.29)",
  LAV="vec3(.46,.38,.78)", RUST="vec3(.62,.27,.09)", SKY="vec3(.55,.78,.95)", YOLK="vec3(1.,.55,.05)", SHELL="vec3(.95,.9,.8)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.2,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
const solidMat=(body,o,side)=>S.mat(SOLID(body,o),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:side||THREE.FrontSide});
// pluma: q.x 0..1 del cálamo a la punta, q.y transversal (±.5); x = vexilo, y = raquis, z = posición transversal (−1..1)
const FEATH=`vec3 feath(vec2 q){float x=q.x;float w=.44*smoothstep(0.,.22,x)*sqrt(max(0.,1.-pow(max(x-.42,0.)/.58,2.)));
 float ay=abs(q.y);float notch=step(.7,styNoise(vec2(x*1.7,sign(q.y)*.37+.2)).g)*step(.3,x)*.07;
 float m=step(ay+notch,w)*step(0.,x)*step(x,1.);float rach=smoothstep(.035,0.,ay)*step(x,.97);
 return vec3(m,rach,q.y/max(w,.001));}`;
// pluma en partícula, iluminada (la normal se curva desde el raquis); vR = giro, vK = erosión. a,b = base y punta
const FEATHER_P=(a,b)=>S.PV+FEATH+`void main(){vec2 q=styPC()-.5;vec3 fe=feath(vec2(q.x+.5,q.y*2.1));if(fe.x<.5)discard;
 float x=q.x+.5;float er=styErode(styNoise(q*.6+vMix).r*.6+x*.4,vK*1.05-.05,.08);if(er*vA<.02)discard;
 float c=cos(vR),s=sin(vR);vec2 nf=vec2(0.,-fe.z*.85);vec3 n=normalize(vec3(c*nf.x+s*nf.y,-s*nf.x+c*nf.y,1.));
 float l=styLight(n,stySunV());float barb=band(fract((x*1.3-abs(fe.z)*.3)*8.),.5,.1);
 vec3 col=mix(${a},${b},smoothstep(.1,.95,x));col=mix(col,${CREAM},fe.y*.65);
 gl_FragColor=vec4(styRampOf(col,clamp(.16+.56*l-.1*barb,0.,1.))*styTint(l),er*vA);}`;
// pluma en malla (plano: u del cálamo a la punta); uQ = erosión, uK = brillo
const FEATHER_M=(a,b,hot='uC1')=>`uniform float uQ;uniform float uK;`+FEATH+`
void main(){vec3 fe=feath(vec2(vUv.x,vUv.y-.5));if(fe.x<.5)discard;
 float nz=styNoise(vUv*vec2(1.6,.7)+.37).r;if(styErode(nz*.6+vUv.x*.4,uQ,.06)<.5)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float barb=band(fract((vUv.x*1.3-abs(fe.z)*.3)*8.),.5,.1);
 vec3 col=mix(${a},${b},smoothstep(.1,.95,vUv.x));col=mix(col,${CREAM},fe.y*.7);
 vec3 c=styRampOf(col,clamp(.2+.5*l-.12*barb-.12*abs(fe.z)+(nz-.5)*.1,0.,1.))*styTint(l);
 c+=${hot}*uK*(.4+.6*vUv.x);gl_FragColor=vec4(c,1.);}`;
const featherMat=(a,b)=>S.mat(FEATHER_M(a,b),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
// chevrón hacia arriba (Potenciado / +PA): energía cálida
const CHEV_UP=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.8+.2*step(0.,y+.12-abs(q.x)*.9))*1.25,a);}`;
// trazo de viento (energía): línea de pincel orientada por vR; se erosiona con vK
const WIND_FS=S.PV+`void main(){vec2 q=styPC()-.5;float w=.06*(1.-abs(q.x)*1.6);float m=smoothstep(w,w*.4,abs(q.y+.08*sin(q.x*6.)))*step(abs(q.x),.48);
 float er=styErode(styNoise(q*.5+vMix).r*.5+(q.x+.5)*.5,vK,.1);float a=m*er*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRamp(.6+.3*(q.x+.5))*1.1,a*.85);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.25+.35*n),m*er*uA*${f(alpha)});}`;
// sello de pincel en el suelo con un dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.7;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.8);}`;
// vértice de partícula que apunta a donde vuela: vR desde la velocidad en pantalla
const SANG=`float sang(vec3 p,vec3 v){vec4 a=projectionMatrix*modelViewMatrix*vec4(p,1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(p+v*.05,1.);
 vec2 d=(b.xy/b.w-a.xy/a.w)*vec2(projectionMatrix[1][1]/projectionMatrix[0][0],1.);return -atan(d.y,d.x);}`;
const defs=[];

// =====================================================================
// 1 · CUCKOO — un reloj de madera se abre junto al cuerno y el cucú sale con su resorte; dos «cu-cú» en anillos
//     de pincel viajan al aliado, barren su bruma de Sueño (lavanda) y lo dejan Potenciado (chevrones rojos).
//     Aliado: el receptor es el muñeco aliado (allies 1). ti 0,95 s
// =====================================================================
defs.push({key:"sty_bcCuckoo",name:"Cuckoo (estilizado)",dur:2.2,ti:0.95,pal:P_CUCKOO,tier:1,stylized:true,allies:1,
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Tic-tac",0],["Resorte",0.35],["Cucú",0.55],["Despertar",0.95],["Confeti",1.15],["Recogida",1.6]],
build(a){
  const L=a.L,TS=0.35,CU=[0.55,0.75],TV=0.22,TI=0.95,TR=1.6,TE=2.0,SLEN=0.95;
  const AP=ALLY_POS[0], AH=V3(AP.x,1.55,AP.z), O=V3(-3.4,2.65,-0.1);
  const SD=V3(AH.x-O.x,AH.y-O.y+2.4,AH.z-O.z).normalize();
  const ext=te=>{if(te<TS)return 0;const t=te-TS;return Math.max(0,1-Math.exp(-t*8)*Math.cos(t*24))*(1-ss(TR,TE,te));};
  // reloj: caja de madera (cilindro), esfera crema con marcas y agujas, portezuela que se abre
  const clock=new THREE.Group(); L.mesh.add(clock);
  const woodM=solidMat(`float g=styNoise(vec2(vUv.x*3.,vUv.y*.4)).g;base=mix(${WOOD},vec3(.66,.42,.22),g*.6);lb=-.05*g;`);
  const box=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.16,32).rotateX(Math.PI/2),woodM);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(0.5,0.32,4).rotateY(Math.PI/4),solidMat(`base=vec3(.78,.24,.3);`)); roof.position.set(0,0.52,0); roof.scale.set(1,1,0.4);
  const face=new THREE.Mesh(new THREE.CircleGeometry(0.34,40),S.mat(`uniform float uDoor;uniform float uHand;
   void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
    float k=fract(an/6.2832*12.);float tick=smoothstep(.08,0.,min(k,1.-k))*step(.72,r)*step(r,.88);
    float h1=-uHand*11.,h2=-uHand*1.3;vec2 d1=vec2(cos(h1),sin(h1)),d2=vec2(cos(h2),sin(h2));
    float hand=step(abs(dot(p,vec2(-d1.y,d1.x))),.04)*step(0.,dot(p,d1))*step(dot(p,d1),.62)+step(abs(dot(p,vec2(-d2.y,d2.x))),.06)*step(0.,dot(p,d2))*step(dot(p,d2),.42);
    float door=step(r,.34)*uDoor;
    vec3 c=styRampOf(${CREAM},.62);c=mix(c,vec3(.18,.1,.06),clamp(tick+hand,0.,1.)*(1.-door));c=mix(c,vec3(.12,.05,.04),door);
    gl_FragColor=vec4(c,1.);}`,{uDoor:{value:0},uHand:{value:0}},{mode:'solid'}));
  face.position.z=0.081; clock.add(box,roof,face);
  // resorte (hélice) y cucú tallado: cuerpo de madera con pecho rosa, cabeza, pico naranja y ala
  const springM=solidMat(`base=vec3(.62,.64,.7);`,{rim:.5});
  const pts=[];for(let i=0;i<=120;i++){const t=i/120;pts.push(V3(Math.cos(t*Math.PI*12)*0.08,t,Math.sin(t*Math.PI*12)*0.08));}
  const spring=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),240,6,0.02,0.02),springM);
  const jack=new THREE.Group(); jack.add(spring); jack.quaternion.setFromUnitVectors(YA,SD); jack.position.copy(O); L.mesh.add(jack);
  const birdM=solidMat(`float ch=smoothstep(-.02,-.1,vP.y)*smoothstep(-.05,.2,vP.x);float g=styNoise(vec2(vUv.x*4.,vUv.y*2.)).g;
   base=mix(mix(${WOOD},vec3(.62,.38,.2),g*.5),mix(uC1,${CREAM},.25),ch);lb=.04*ch;`,{rim:.3});
  const beakM=solidMat(`base=vec3(1.,.6,.14);`), eyeM=solidMat(`base=vec3(.05);lb=-.3;`,{rim:.8});
  const toy=new THREE.Group(), toyB=new THREE.Group(); toy.add(toyB); L.mesh.add(toy);
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.17,24,16),birdM); body.scale.set(1.35,1,1);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.115,20,14),birdM); head.position.set(0.18,0.13,0);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.14,10).rotateZ(-Math.PI/2),beakM); beak.position.set(0.33,0.12,0);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.035,0.12),birdM); tail.position.set(-0.27,0.08,0); tail.rotation.z=0.5;
  const wing=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.16),featherMat('uC2','uC1')); wing.position.set(-0.02,0.04,0.16); wing.rotation.set(0,0,-0.25);
  const wing2=wing.clone(); wing2.position.z=-0.16;
  const eyes=[-1,1].map(s=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.02,8,6),eyeM);m.position.set(0.26,0.17,0.07*s);return m;});
  toyB.add(body,head,beak,tail,wing,wing2,...eyes);
  // «cu-cú»: anillos de pincel (energía) que viajan del cucú a la cabeza del aliado
  const chimes=[];for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.5+s.b*.5,uP,.12);
    gl_FragColor=vec4(styRamp(.6+.4*s.g)*1.2,s.r*er*uA);}`,{},{mode:'energy',depthTest:false}));m.userData={t0:CU[i>>1]+(i%3)*0.06};chimes.push(m);L.trail.add(m);}
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.44}), ring=S.groundRing(L.decal,2.4);
  const seal=groundPlane(1.8,AP.x,0.022,S.mat(GLYPH(`float k=fract(an/6.2832*12.-uT*.3);m=m*.55+smoothstep(.06,0.,min(k,1.-k))*step(.6,r)*step(r,.78)*.8;`),{},{mode:'energy'})); seal.position.z=AP.z; L.decal.add(seal);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 O=${v3(O)};const vec3 AH=${v3(AH)};const vec3 AP=${v3(AP)};`;
  // bruma de sueño (lavanda, materia) que ronda al aliado y el cucú barre hacia fuera
  S.pts(L.part,14,VV+K+`void main(){float an=aSeed.x*6.2832+uT*.7;float rad=.32+.22*aSeed.y;float bl=max(uT-TI,0.);
   vec3 p=AH+vec3(cos(an)*rad,(aSeed.z-.35)*.5+.08*sin(uT*2.+aSeed.w*6.),sin(an)*rad);p+=normalize(p-AH+vec3(0.,.15,0.))*bl*2.4;
   vA=smoothstep(0.,.25,uT);vK=smoothstep(TI-.05,TI+.4,uT);vR=aSeed.w*6.28+uT*.5;put(p,(.42+.2*aSeed.w)*(1.+bl*.8));}`,S.MATTER_FS(C.puff,{relief:4,col:LAV,bias:.05}));
  // «Z» del sueño: pequeñas esquirlas lavanda que suben del aliado hasta que despierta
  S.pts(L.part,4,VV+K+`void main(){float k=uT/.6+aSeed.x;float age=fract(k);vec3 p=AH+vec3(.15+age*.35,.25+age*.7,(aSeed.y-.5)*.3);
   vA=uT<TI?sin(age*3.14159):0.;vK=0.;vR=.6;put(p,.2+.1*age);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy',uniforms:{}});
  // confeti de plumas rosas y crema sobre el aliado
  S.pts(L.part,26,VV+K+SANG+`void main(){float s=TI+aSeed.x*.12;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=vec3(r.x*1.5,1.7+1.5*aSeed.z,r.z*1.5);
   vec3 p=AH+vec3(0.,.3,0.)+v*(1.-exp(-t*3.))/3.+vec3(sin(t*4.+aSeed.w*9.)*.25,-.7*t,cos(t*3.+aSeed.y*7.)*.2);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.65,1.,age);vR=aSeed.w*6.28+sin(t*5.+aSeed.x*9.)*.8;put(p,.34+.12*aSeed.w);}`,FEATHER_P('uC2','uC1'));
  // Potenciado: chevrones rojos que suben del aliado
  S.pts(L.part,12,VV+K+`void main(){float k=(uT-TI-.15)/.55+aSeed.x;float age=fract(k);float an=aSeed.y*6.2832;
   vec3 p=AP+vec3(cos(an)*.45,.2+age*1.7,sin(an)*.45);vA=(uT>TI+.15&&uT<${f(TR+0.3)})?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.1*aSeed.z);}`,CHEV_UP('vec3(1.,.34,.22)'),{mode:'energy'});
  const E=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, open=ss(0,0.25,te)*(1-ss(TR+0.2,TE+0.1,te)), e=ext(te);
    let bump=0;for(const c of CU)if(te>=c)bump+=0.16*Math.exp(-(te-c)*12);
    clock.visible=open>0.001; clock.position.copy(O); billboard(clock); clock.scale.setScalar(Math.max(open,0.001)*1.45*(1+bump*0.4));
    face.material.uniforms.uDoor.value=ss(TS-0.06,TS,te)*(1-ss(TR,TE,te)); face.material.uniforms.uHand.value=te;
    const len=SLEN*e+bump; jack.visible=len>0.01; jack.scale.set(1,Math.max(len,0.001),1);
    E.copy(O).addScaledVector(SD,len);
    toy.visible=e>0.02; toy.position.copy(E); tmp.set(AH.x-E.x,0,AH.z-E.z); aim(toy,tmp);
    toy.scale.setScalar(Math.max(Math.min(1,e*1.4)+0.3*bump,0.001)*1.6);
    let bow=0;for(const c of CU)if(te>=c)bow+=0.55*Math.exp(-(te-c)*10)*Math.sin((te-c)*30);
    toyB.rotation.z=-bow; birdM.uniforms.uK.value=bump*2;
    for(const m of chimes){const k=(te-m.userData.t0)/TV;m.visible=k>=0&&k<1;if(!m.visible)continue;
      m.position.copy(E).lerp(AH,k); billboard(m); m.scale.setScalar(0.35+0.75*k); set(m,ss(0.5,1,k),Math.sin(Math.PI*Math.min(k*1.3,1)));}
    spark.pose(ia,AH,0.8); ring.pose(ia,AP.x,AP.z,0.5,1);
    set(seal,ia>=0?-0.1+1.1*ss(TR,TE+0.2,te):1,ss(TI,TI+0.25,te));
    caster.rotation.z=-0.08*ss(TS,TS+0.08,te)*(1-ss(TS+0.1,TS+0.4,te));
    const al=allies[0];
    if(te<TI){al.rotation.z=0.07*Math.sin(te*3.5);al.scale.set(1,0.96,1);}
    else{const j=hitE(ia,6);al.position.y=0.28*Math.sin(Math.PI*cl(ia/0.3));al.rotation.z=0.12*j*Math.sin(ia*25);al.scale.set(1-0.06*j,1+0.12*j,1-0.06*j);}
    glowOf(al,tmp.set(1,0.34,0.22),(ia>=0?0.6*Math.exp(-ia*5):0)+0.25*ss(TI,TI+0.3,te)*(1-ss(TR+0.2,TE+0.2,te)));
    if(te<TS){o.g.copy(O);o.gs=0.7*open;o.ga=0.15*open;o.li=1.2*open;}
    else if(te<TI){o.g.copy(E);o.gs=0.8+bump*2;o.ga=0.15+bump;o.li=1.5+bump*6;}
    else{o.g.copy(AH);o.gs=1+1.6*Math.min(ia,0.5);o.ga=0.35*Math.exp(-ia*7);o.li=4*Math.exp(-ia*4)+0.6;}
    o.ia=ia;o.c.copy(AH);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 2 · FEATHER SPEAR — plumas sueltas convergen ante los cuernos y se compactan en una lanza de plumas (asta crema,
//     punta dorada); sale en recta con trazos de viento, se clava, vibra y revienta en plumas. ti 0,62 s
// =====================================================================
defs.push({key:"sty_bcFeatherSpear",name:"Feather Spear (estilizado)",dur:1.9,ti:0.62,pal:P_SPEAR,tier:2,stylized:true,
  zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Plumas",0],["Compactar",0.2],["Disparo",0.4],["Impacto",0.62],["Estallido",0.76],["Plumaje",0.95]],
build(a){
  const L=a.L,TF=0.4,TI=0.62,TB=0.76,N=6,SL=1.25,S0=V3(-2.85,2.15,0),EP=V3(3.15,1.25,0);
  const sp=(te,out)=>{if(te<TF)return out.set(S0.x-0.2*ss(0.2,TF,te),S0.y,0);
    const k=Math.pow(cl((te-TF)/(TI-TF)),1.3);return out.set(S0.x+(EP.x-S0.x)*k,S0.y+(EP.y-S0.y)*k+0.18*Math.sin(Math.PI*k),0);};
  const spG=new THREE.Group(); L.mesh.add(spG);
  // haz de plumas en estrella alrededor del eje +x (la punta en x = 0)
  const fM=featherMat('uC2','uC1'), feathers=[];
  for(let i=0;i<N;i++){const g=new THREE.Group(),m=new THREE.Mesh(new THREE.PlaneGeometry(SL*(0.85+0.15*((i*0.618)%1)),0.34).rotateZ(Math.PI).translate(-SL*0.42,0,0),fM);
    g.add(m); g.userData={r:i*Math.PI/N,d:V3(Math.sin(i*2.4)*1.1,0.5+0.6*((i*0.37)%1),Math.cos(i*2.4)*1.1)}; feathers.push(g); spG.add(g);}
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.04,SL*1.05,10).rotateZ(Math.PI/2).translate(-SL*0.5,0,0),solidMat(`base=${CREAM};`));
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.32,12).rotateZ(-Math.PI/2).translate(0.08,0,0),solidMat(`base=${GOLD};`,{hot:'vec3(1.,.8,.4)',rim:.5}));
  spG.add(shaft,tip);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.31}), spark2=S.hitSpark(L.mesh,1.2,{seed:0.77}), ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.0);
  const shadow=S.contactShadow(L.decal,0.9);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 S0=${v3(S0)};const vec3 EP=${v3(EP)};
  vec3 sp(float t){float k=pow(clamp((t-TF)/(TI-TF),0.,1.),1.3);return vec3(S0.x+(EP.x-S0.x)*k,S0.y+(EP.y-S0.y)*k+.18*sin(3.14159*k),0.);}`+SANG;
  // plumas sueltas que convergen en espiral hasta el haz
  S.pts(L.part,14,VV+K+`void main(){float s=aSeed.x*.18;float life=.24;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();vec3 dst=S0+vec3(-aSeed.y*1.,0.,0.);vec3 src=S0+vec3(r.x*1.4-.4,.5+r.y*.8,r.z*1.2);
   float an=(1.-k)*2.5;vec3 off=(src-dst)*(1.-k*k);vec3 p=dst+vec3(off.x*cos(an)-off.z*sin(an),off.y,off.x*sin(an)+off.z*cos(an));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.75,1.,age);vR=sang(p,dst-p+vec3(.0001));put(p,.42+.12*aSeed.w);}`,FEATHER_P('uC2','uC1'));
  // trazos de viento en el recorrido (energía)
  S.pts(L.part,16,VV+K+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.22+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=sp(s)+vec3(-.35-t*1.6,r.y*.35,r.z*.35);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=sang(p,vec3(1.,0.,0.));put(p,.9+.4*aSeed.w);}`,WIND_FS,{mode:'energy'});
  // estallido: plumas que salen del objetivo y planean
  S.pts(L.part,24,VV+K+`void main(){float s=TB+aSeed.x*.05;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=normalize(r+vec3(-.6,.6,0.))*(2.+2.8*aSeed.z);
   vec3 p=EP+v*(1.-exp(-t*3.5))/3.5+vec3(sin(t*4.+aSeed.w*9.)*.2,-.55*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*(1.+aSeed.y)*sign(r.x);put(p,.36+.14*aSeed.w);}`,FEATHER_P('uC2','uC1'));
  // esquirlas doradas de la punta al clavarse
  S.pts(L.part,12,VV+K+`void main(){float s=TI;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.8,.4,0.))*(2.4+2.*aSeed.z);vec3 p=EP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:GOLD}));
  const pp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, form=ss(0.08,TF-0.04,te); sp(te,pp);
    const stuck=te>=TI&&te<TB, quiv=stuck?0.06*Math.sin(ia*90)*Math.exp(-ia*8):0;
    spG.visible=te<TB&&form>0.01; spG.position.copy(pp); spG.scale.setScalar(1.35); spG.rotation.z=te<TF?0.05*ss(0.2,TF,te):(te<TI?-0.04:-0.04+quiv);
    feathers.forEach((g,i)=>{const u=g.userData,k=1-form;g.position.copy(u.d).multiplyScalar(k*k);g.rotation.x=u.r+k*3;g.scale.set(1,1-0.4*form,1);});
    fM.uniforms.uK.value=te>=TF&&te<TI?0.25:0; fM.uniforms.uQ.value=stuck?-0.1+1.1*cl(ia/0.14):-1;
    tip.material.uniforms.uK.value=ss(TF-0.1,TF,te)*0.5;
    shadow.pose(pp.x,0,0.7,spG.visible?0.4*form:0);
    spark.pose(ia,EP,1); spark2.pose(ib,EP,0.9); ring.pose(ia,TX,0,0.5,1); ring2.pose(ib,TX,0,0.45,0.8);
    caster.rotation.z=0.06*ss(0.1,TF,te)-0.14*ss(TF,TF+0.05,te)*(1-ss(TF+0.1,TF+0.5,te));
    const kb=hitE(ia,5)*0.3+hitE(ib,6)*0.12;
    target.position.x=TX+kb; target.rotation.z=-kb*0.8*Math.cos(Math.max(ia,0)*14);
    o.em=0.35*hitE(ia,6); o.emc.copy(U.uC1.value);
    if(te<TF){o.g.copy(S0);o.gs=0.8*form;o.ga=0.15*form;o.li=1.5*form;}
    else if(te<TI){o.g.copy(pp);o.gs=1;o.ga=0.25;o.li=3;}
    else if(te<TB){o.g.copy(EP);o.gs=1.2+2.5*ia;o.ga=0.4*Math.exp(-ia*9);o.li=6*Math.exp(-ia*5)+1.5;}
    else{o.g.copy(EP);o.gs=1.4+2*Math.min(ib,0.5);o.ga=0.3*Math.exp(-ib*8);o.li=4*Math.exp(-ib*5);}
    o.ia=te>=TB?ib:ia;o.c.copy(EP);o.shake=0;o.dist=0.6;o.flash=te>=TB?0.5:0.9;
  };
}});

// =====================================================================
// 3 · TRUMP (Shinji) — una caracola de nácar surge junto a los cuernos, toma aire y brama: anillos sónicos de
//     pincel (turquesa) y rocío marino salen en cono hacia el objetivo, lo sacuden al llegar y rompen en espuma
//     y gotas; ola de pincel bajo sus pies. ti = llegada de la onda (≈0,99 s)
// =====================================================================
const trumpTB=0.5, trumpMP=V3(-3.12,2.25,0), trumpV=13, trumpTI=Math.round((trumpTB+TC.distanceTo(trumpMP)/trumpV)*1000)/1000;
defs.push({key:"sty_bcTrump",name:"Trump (estilizado)",dur:2.3,ti:trumpTI,pal:P_TRUMP,tier:2,stylized:true,
  zoneCaster:0.55,zoneTarget:1.2,
  phases:[["Caracola",0],["Aliento",0.22],["Bramido",trumpTB],["Oleaje",0.86],["Resaca",1.45]],
build(a){
  const L=a.L,TA=0.22,TB=trumpTB,TE=1.45,TXE=2.0,MP=trumpMP,TI=trumpTI,FL=TI-TB;
  const CP=V3(-3.4,2.24,0), HP=V3(3.05,1.35,0);
  // caracola: espira (cono) + vuelta corporal + labio abierto; crema con bandas en zigzag y nácar rosa dentro
  const shellM=solidMat(`vec3 q=vP;float an=atan(q.z,q.y)/6.2832;float s=fract(an+q.x*5.5);
   float b1=smoothstep(.06,0.,abs(s-.5)-.32);float zig=step(.5,fract(q.x*20.+abs(fract(an*8.)-.5)*2.));
   base=mix(vec3(.93,.78,.62),vec3(.66,.38,.24),zig*.6+b1*.35);lb=-.14*b1-.06;`,{hot:'vec3(.5,.95,1.)',rim:.35});
  const lipM=solidMat(`base=gl_FrontFacing?vec3(.95,.84,.7):vec3(1.,.62,.66);lb=gl_FrontFacing?0.:.12;`,{hot:'vec3(.5,.95,1.)',rim:.3},THREE.DoubleSide);
  const conch=new THREE.Group();
  const spire=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.62,28,6).rotateZ(Math.PI/2).translate(-0.38,0,0),shellM);
  const whorl=new THREE.Mesh(new THREE.SphereGeometry(0.25,28,18),shellM); whorl.scale.set(1.15,0.95,0.95);
  const lip=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.16,0.32,32,1,true).rotateZ(-Math.PI/2).translate(0.24,0,0),lipM);
  const knobs=[0,1,2,3,4].map(i=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.13,8),shellM);const an=i*1.25;m.position.set(-0.1+i*0.025,Math.cos(an)*0.24,Math.sin(an)*0.24);m.rotation.x=an;return m;});
  conch.add(spire,whorl,lip,...knobs); L.mesh.add(conch);
  // anillos sónicos: planos de pincel perpendiculares al viaje, que crecen y se consumen
  const RING_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.5+s.b*.5,uP,.12);
   float th=smoothstep(.05,.35,s.r);gl_FragColor=vec4(styRamp(.35+.5*s.g)*1.15,min(th*1.3,1.)*er*uA);}`;
  const NW=10, waves=[];
  for(let i=0;i<NW;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(RING_FS,{},{mode:'energy',side:THREE.DoubleSide}));
    m.rotation.y=Math.PI/2; const g=new THREE.Group(); g.add(m); g.userData={d:(i>>1)*0.07+(i&1)*0.025,dd:i&1,m}; L.trail.add(g); waves.push(g);}
  // ola en el suelo bajo el objetivo (energía) y mancha de agua (materia)
  const ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.4), spark=S.hitSpark(L.mesh,1.2,{seed:0.53});
  const shock=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(RING_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(shock);
  const wet=groundPlane(2.0,TX,0.024,S.mat(STAIN('vec3(.25,.55,.7)',.5),{},{mode:'matter'})); L.decal.add(wet);
  const K=`const float TA=${f(TA)};const float TB=${f(TB)};const float TI=${f(TI)};const vec3 MP=${v3(MP)};const vec3 CP=${v3(CP)};const vec3 HP=${v3(HP)};`;
  // aliento: motas de aire que entran por la espira
  S.pts(L.part,14,VV+K+`void main(){float s=TA+aSeed.x*(TB-TA-.08);float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 dst=CP+vec3(-.5,0.,0.);vec3 p=mix(dst+normalize(rnd()+vec3(-.6,0.,0.))*(.9+.4*aSeed.y),dst,k*k);
   vA=(age>0.&&age<1.)?1.:0.;vK=0.;vR=0.;put(p,.2+.1*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.0}),{mode:'energy'});
  // bramido: trazos de viento turquesa en el cono
  S.pts(L.part,22,VV+K+SANG+`void main(){float s=TB+aSeed.x*.5;float life=.28+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();float u=clamp((s-TB)/${f(FL)}+t*1.3,0.,1.2);vec3 p=mix(MP,HP,u)+vec3(0.,r.y*.25,r.z*.35)*(.4+u);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=sang(p,HP-MP);put(p,.8+.5*aSeed.w);}`,WIND_FS,{mode:'energy'});
  // rocío marino en cono (materia: gotas iluminadas)
  S.pts(L.part,22,VV+K+`void main(){float s=TB+aSeed.x*.45;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=normalize(vec3(1.,r.y*.4+.12,r.z*.4))*(3.+3.5*aSeed.z);vec3 p=MP+vec3(.3,0.,0.)+v*t+vec3(0.,-2.6*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159-atan(v.y-5.*t,v.x);put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.45,.82,.95)'}));
  // espuma y gotas que revientan en el objetivo
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=HP+vec3(cos(an)*.5,-.4+sin(an)*.6,sin(an)*.4)*(.4+.8*(1.-exp(-t*5.)))+vec3(.3*t,.3*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:'vec3(.85,.96,1.)',bias:.05}));
  S.pts(L.part,16,VV+K+`void main(){float s=TI;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.6,.9,0.))*(1.8+2.4*aSeed.z);vec3 p=HP+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159-atan(v.y-10.*t,v.x);put(p,.15+.07*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.45,.82,.95)'}));
  a.pose=function(te,o){
    const ib=te-TB, ia=te-TI, grow=ss(0,TA,te)*(1-ss(TE,TXE,te));
    const vib=te>=TB&&te<TE?0.025*Math.sin(te*95)*(1-ss(TB+0.5,TE,te)):0;
    conch.visible=grow>0.001; conch.position.set(CP.x+vib-0.12*ss(TA,TB,te)+0.14*ss(TB,TB+0.06,te)*(1-ss(TB+0.3,TE,te)),CP.y+vib*0.5,0);
    conch.rotation.set((1-grow)*2.5,0,0.12*ss(TA,TB,te)-0.06*ss(TB,TB+0.1,te)); conch.scale.setScalar(Math.max(grow,0.001)*(1.5+0.15*ss(TA,TB,te)*(1-ss(TB,TB+0.08,te))));
    shellM.uniforms.uK.value=lipM.uniforms.uK.value=(ib>=0?0.35*Math.exp(-ib*3):0.2*ss(TA,TB,te));
    for(const g of waves){const k=(te-TB-g.userData.d)/FL;g.visible=k>0&&k<1.25;if(!g.visible)continue;
      const kk=Math.min(k,1); g.position.copy(MP).lerp(HP,kk); if(k>1)g.position.x+=(k-1)*1.4;
      const sc=(0.75+1.75*kk+(k>1?(k-1)*3:0))*(1-0.06*g.userData.dd); g.scale.setScalar(sc);
      set(g.userData.m,ss(0.75,1.25,k),(1-ss(1.0,1.25,k))*ss(0,0.08,k)*(1-g.userData.d*0.9));}
    spark.pose(ia,HP,1); ring.pose(ia,TX,0,0.55,1); ring2.pose(ia-0.12,TX,0,0.5,0.8);
    {const ps=cl(ia/0.38);shock.visible=ia>=0&&ps<1;towardCam(shock.position,HP,0.5);billboard(shock);shock.scale.setScalar(1.2+2.6*e3(ps));set(shock,ss(0.3,1,ps),1);}
    wet.visible=ia>=0; wet.scale.setScalar(0.5+0.5*e3(ia/0.25)); set(wet,ia>=0?-0.1+1.15*ss(0.5,1.3,ia):0,1);
    const j=hitE(ia,3.5); target.position.x=TX+0.1*j*Math.sin(Math.max(ia,0)*60)+0.34*j*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.26*j*Math.cos(Math.max(ia,0)*16); target.scale.set(1+0.08*j,1-0.1*j,1+0.08*j);
    caster.rotation.z=0.06*ss(TA,TB,te)-0.1*ss(TB,TB+0.06,te)*(1-ss(TB+0.3,TE,te));
    o.em=0.35*hitE(ia,5); o.emc.copy(U.uC1.value);
    if(te<TB){o.g.copy(CP);o.gs=0.8*grow;o.ga=0.15*grow;o.li=1.5*grow;}
    else if(ia<0){o.g.copy(MP).lerp(HP,cl(ib/FL));o.gs=1.2;o.ga=0.3;o.li=3.5;}
    else{o.g.copy(HP);o.gs=1.3+2*Math.min(ia,0.5);o.ga=0.4*Math.exp(-ia*8);o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.55;o.flash=0.8;
  };
}});

// =====================================================================
// 4 · BIG SISTER (nivel 1) — dos plumas grandes brotan de los cuernos como una cresta protectora, se abren con un
//     latido y sueltan dos chispas doradas que bajan al lanzador (+2 PA); anillo de pincel a sus pies. ti 0,36 s
// =====================================================================
defs.push({key:"sty_bcBigSister",name:"Big Sister (estilizado)",dur:1.3,ti:0.36,pal:P_SISTER,tier:1,stylized:true,
  phases:[["Cresta",0],["Impulso",0.36],["Calma",0.75]],
build(a){
  const L=a.L,TI=0.36,TO=0.85,TE=1.2;
  const fM=featherMat('uC2','uC1'), crest=[];
  for(let i=0;i<4;i++){const s=i%2?1:-1,big=i<2;const g=new THREE.Group();
    const m=new THREE.Mesh(new THREE.PlaneGeometry(big?1.15:0.8,big?0.42:0.32).translate(big?0.575:0.4,0,0),fM);g.add(m);
    g.userData={s,ang:big?(Math.PI/2-s*0.42):(Math.PI/2-s*0.95),z:0.27*s};crest.push(g);L.mesh.add(g);}
  const ring=S.groundRing(L.decal,2.4), spark=S.hitSpark(L.mesh,1.0,{seed:0.12});
  const seal=groundPlane(1.9,CX,0.022,S.mat(GLYPH(`float k=fract(an/6.2832*8.);m=m*.6+smoothstep(.07,0.,min(k,1.-k))*step(.55,r)*step(r,.8)*.7;`),{},{mode:'energy'})); L.decal.add(seal);
  const K=`const float TI=${f(TI)};const vec3 HN=${v3(HN)};`;
  // dos chispas doradas (+2 PA) que bajan en espiral al lanzador
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TI-.05+i*.08;float u=clamp((uT-s)/.32,0.,1.);
   vec3 a0=HN+vec3(0.,1.05,(i-.5)*.5),a1=vec3(-3.7,1.,0.);float an=u*5.+i*3.14;
   vec3 p=mix(a0,a1,u*u)+vec3(cos(an)*.35*(1.-u),0.,sin(an)*.35*(1.-u));vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*7.;put(p,.5);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // plumitas que se sueltan al abrirse
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=HN+vec3(0.,.7,0.)+vec3(r.x*1.3,1.+.8*aSeed.z,r.z*1.)*(1.-exp(-t*3.))/3.+vec3(sin(t*5.+aSeed.w*9.)*.2,-.7*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+sin(t*5.)*.7;put(p,.28+.1*aSeed.w);}`,FEATHER_P('uC2','uC1'));
  a.pose=function(te,o){
    const ia=te-TI, open=back(te/TI)*(1-ss(TO,TE,te)), beat=hitE(ia,7);
    crest.forEach((g,i)=>{const u=g.userData;g.visible=open>0.01;g.position.set(HN.x+0.02,HN.y-0.05,u.z);
      g.rotation.set(0,0,u.ang*Math.min(open,1.1)+u.s*0.15*beat*Math.sin(Math.max(ia,0)*20));g.rotation.x=-u.s*0.35;
      g.scale.setScalar(Math.max(open*1.45*(1+0.12*beat),0.001));});
    fM.uniforms.uK.value=0.6*beat; fM.uniforms.uQ.value=-0.1+1.1*ss(TO,TE,te);
    spark.pose(ia,tmp.set(HN.x,HN.y+0.9,0),0.7); ring.pose(ia+0.05,CX,0,0.5,1);
    set(seal,-0.1+1.1*ss(TO,TE+0.05,te),ss(TI,TI+0.12,te));
    caster.scale.set(1+0.05*beat,1-0.06*beat,1+0.05*beat);
    glowOf(caster,U.uC1.value,0.5*hitE(ia-0.25,5)*(ia>0.25?1:0));
    o.em=0; o.g.set(HN.x,HN.y+0.6,0); o.gs=0.9*open; o.ga=0.2*open+0.3*beat; o.li=1.5*open+3*beat;
    o.ia=ia; o.c.set(CX,0.8,0); o.shake=0; o.dist=0.25; o.flash=0;
  };
}});

// =====================================================================
// 5 · EGGSHELL — un huevo moteado se forma sobre los cuernos y sale en parábola girando; se agrieta en vuelo, se
//     estrella en el objetivo: cáscara en esquirlas y la yema dorada lo cubre y gotea. Después, el lanzador queda
//     con Provocación (anillo rojo). ti 0,8 s
// =====================================================================
defs.push({key:"sty_bcEggshell",name:"Eggshell (estilizado)",dur:2.3,ti:0.8,pal:P_EGG,tier:2,stylized:true,
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Huevo",0],["Lanzamiento",0.32],["Impacto",0.8],["Yema",0.92],["Aroma",1.1],["Fin",1.9]],
build(a){
  const L=a.L,TL=0.32,TI=0.8,TY=0.92,TA=1.1,E0=V3(-3.45,2.75,0),EP=V3(3.15,1.75,0),PK=V3(-0.2,4.6,0);
  const eggM=S.mat(`uniform float uQ;uniform float uCr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
   vec3 q=normalize(vP);float sp=step(.72,styNoise(vec2(atan(q.z,q.x)*.6,q.y*.9)+.3).g)*.6+step(.8,styNoise(vec2(atan(q.z,q.x)*1.5,q.y*2.)+.7).r)*.4;
   vec3 base=mix(${SHELL},vec3(.66,.5,.34),sp);
   float cr=styNoise(vec2(atan(q.z,q.x)*.35,q.y*.45)+.1).g;float crack=smoothstep(.03,0.,abs(cr-.5))*uCr;
   vec3 c=styRampOf(base,clamp(.25+.55*l-.1*sp,0.,1.))*styTint(l);c=mix(c,vec3(1.,.72,.22)*1.6,crack);
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1},uCr:{value:0}},{mode:'solid'});
  const egg=new THREE.Mesh(new THREE.SphereGeometry(0.42,32,22),eggM); egg.scale.set(0.82,1,0.82); L.mesh.add(egg);
  // yema: esfera dorada que se aplasta sobre la cabeza y se consume
  const yolkM=S.mat(`uniform float uEr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec3 q=normalize(vP);
   float nz=styNoise(vec2(atan(q.z,q.x)*.3,q.y*.5+.5)).r;float fr=abs(dot(n,normalize(vV)));float er=styErode(nz*.7+fr*.3,uEr,.08);if(er<.01)discard;
   vec3 c=styRampOf(${YOLK},.32+.55*l)*styTint(l)+vec3(1.,.9,.6)*step(.92,l)*.25;gl_FragColor=vec4(c,er);}`,{uEr:{value:0}},{mode:'matter'});
  const yolk=new THREE.Mesh(new THREE.SphereGeometry(0.4,28,18),yolkM); L.mesh.add(yolk);
  const spark=S.hitSpark(L.mesh,0.9,{seed:0.66}), ring=S.groundRing(L.decal,3.0), shadow=S.contactShadow(L.decal,1.0);
  const halves=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.42,24,12,0,Math.PI*2,0,Math.PI*0.55),eggM);m.material=eggM;L.mesh.add(m);return m;});
  const stain=groundPlane(1.8,TX,0.025,S.mat(STAIN(YOLK,.65),{},{mode:'matter'})); L.decal.add(stain);
  const taunt=S.status(a,'taunt',[caster],TA,2.25);
  const K=`const float TI=${f(TI)};const float TY=${f(TY)};const float TA=${f(TA)};const vec3 EP=${v3(EP)};`;
  // cáscara en esquirlas (materia crema)
  S.pts(L.part,30,VV+K+`void main(){float s=TI;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.4,.8,0.))*(2.+2.6*aSeed.z);vec3 p=EP+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*(7.+5.*aSeed.y);put(p,.36+.16*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.9,.82,.68)',bias:-.08}));
  // gotas de yema que caen del objetivo
  S.pts(L.part,12,VV+K+`void main(){float k=(uT-TY)/.5+aSeed.x;float age=fract(k);float an=aSeed.y*6.2832;
   vec3 p=EP+vec3(cos(an)*.32,-.25-age*age*1.4,sin(an)*.3);vA=(uT>TY&&uT<1.9&&p.y>.03)?1.:0.;vK=smoothstep(.85,1.,age);vR=3.14159;put(p,.17+.06*aSeed.z);}`,S.MATTER_FS(C.drop,{relief:4,col:YOLK}));
  // aroma dorado que sale del lanzador (Provocación): motas en espiral
  S.pts(L.part,14,VV+K+`void main(){float k=(uT-TA)/.8+aSeed.x;float age=fract(k);float an=aSeed.y*6.2832+age*3.;
   vec3 p=vec3(-3.7,0.,0.)+vec3(cos(an)*(.4+age*.6),.3+age*1.5,sin(an)*(.4+age*.6));
   vA=(uT>TA&&uT<2.1)?sin(age*3.14159):0.;vK=smoothstep(.4,1.,age);vR=age*4.;put(p,.34+.14*aSeed.z);}`,S.MATTER_FS(C.puff,{relief:3,col:GOLD,bias:.1}));
  const ep=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, iy=te-TY, grow=back(te/TL);
    if(te<TL){ep.copy(E0);ep.y+=0.06*Math.sin(te*20)*grow;}
    else{const u=cl((te-TL)/(TI-TL));bez2(ep,E0,PK,EP,u);}
    egg.visible=ia<0&&grow>0.01; egg.position.copy(ep); egg.rotation.z=te<TL?0.1*Math.sin(te*12):-(te-TL)*9; egg.scale.set(1.15*grow,1.4*grow,1.15*grow);
    eggM.uniforms.uCr.value=ss(TI-0.25,TI,te);
    shadow.pose(ep.x,0,0.7,egg.visible?0.45*cl(1.4-ep.y*0.2):0);
    const py=cl(ia/0.12), yk=e3(py);
    yolk.visible=ia>=0&&ia<0.9; yolk.position.set(EP.x,EP.y-0.18*yk,0); yolk.scale.set(0.95+1.05*yk,0.8-0.3*yk,0.95+1.05*yk);
    yolkM.uniforms.uEr.value=-0.1+1.15*ss(0.45,0.9,ia);
    halves.forEach((m,i)=>{const s=i?1:-1,t=Math.max(ia,0);m.visible=ia>=0&&ia<0.55;m.position.set(EP.x-0.35*t+s*0.1,EP.y+0.15+2.2*t-5*t*t,s*(0.2+1.1*t));m.rotation.set(s*(0.6+5*t),0,s*(1.2+3*t));m.scale.set(1.1,1.2,1.1);});
    spark.pose(ia,EP,1); ring.pose(ia,TX,0,0.5,1);
    stain.visible=ia>=0; stain.scale.setScalar(0.5+0.5*e3(ia/0.3)); set(stain,ia>=0?-0.1+1.15*ss(0.7,1.45,ia):0,1);
    const tenv=taunt.pose(te);
    const h=hitE(ia,6); target.position.x=TX+0.25*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.2*h*Math.cos(Math.max(ia,0)*14); target.scale.set(1+0.07*h,1-0.1*h,1+0.07*h);
    caster.rotation.z=0.06*ss(0,TL,te)-0.12*ss(TL,TL+0.06,te)*(1-ss(TL+0.1,TL+0.45,te));
    glowOf(caster,tmp.set(1,0.3,0.16),0.35*tenv);
    o.em=0.3*h; o.emc.setRGB(1,0.7,0.2);
    if(te<TL){o.g.copy(E0);o.gs=0.7*grow;o.ga=0.12*grow;o.li=1.2*grow;}
    else if(ia<0){o.g.copy(ep);o.gs=0.9;o.ga=0.15;o.li=2;}
    else if(te<TA){o.g.copy(EP);o.gs=1.3+2.5*ia;o.ga=0.45*Math.exp(-ia*9);o.li=6*Math.exp(-ia*5);}
    else{o.g.set(CX,1,0);o.gs=1.2*tenv;o.ga=0.15*tenv;o.li=1.5*tenv;}
    o.ia=ia;o.c.copy(EP);o.shake=0;o.dist=0.6;o.flash=0.8;
  };
}});

// =====================================================================
// 6 · WING HORN — diez plumas grandes se despliegan en abanico desde los cuernos como dos alas y salen en salva:
//     vuelan en arco alto, se clavan en el objetivo una tras otra y revientan en plumón. ti 0,98 s (la última)
// =====================================================================
defs.push({key:"sty_bcWingHorn",name:"Wing Horn (estilizado)",dur:2.1,ti:0.98,pal:P_WING,tier:2,stylized:true,
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Despliegue",0],["Salva",0.45],["Arco",0.6],["Impactos",0.86],["Plumas",1.2]],
build(a){
  const L=a.L,N=10,TU=0.4,TL0=0.45,DT=0.03,TI=0.98,FL=0.86-TL0+0.02,FLEN=1.15;
  const fM=featherMat('uC2','uC1'), F=[];
  for(let i=0;i<N;i++){const s=i%2?1:-1,j=i>>1,ang=0.35+j*0.3;
    const piv=V3(-3.54,2.0,0.27*s), g=new THREE.Group(), m=new THREE.Mesh(new THREE.PlaneGeometry(FLEN,0.4).translate(FLEN*0.5,0,0),fM);
    g.add(m); L.mesh.add(g);
    const t0=TL0+(N-1-i)*DT*(1+0.2*((i*7)%3)), t1=TI-(N-1-i)*0.012;
    const rest=V3(piv.x-Math.cos(ang)*0.3,piv.y+Math.sin(ang)*0.7,piv.z+s*0.45*Math.sin(ang));
    const hit=V3(TX-0.32+0.05*((i*3)%4),0.85+0.12*((i*5)%7)/6*4,(j-2)*0.08*s);
    const ctl=V3(-0.4+0.5*((i*11)%5)/4,4.3+0.6*((i*13)%5)/4,s*(0.9+0.2*j));
    F.push({g,s,ang,piv,rest,hit,ctl,t0,t1});}
  const sparks=[0,1,2].map(i=>S.hitSpark(L.mesh,1.1+0.25*i,{seed:0.2+i*0.27})), ring=S.groundRing(L.decal,3.0);
  const K=`const float T1=${f(0.86)};const float TI=${f(TI)};const vec3 HP=${v3(TC)};`;
  // plumón que revienta de cada impacto
  S.pts(L.part,30,VV+K+`void main(){float s=T1+aSeed.x*(TI-T1)+.02;float life=.95+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=normalize(r+vec3(-.5,.7,0.))*(1.8+2.4*aSeed.z);
   vec3 p=HP+v*(1.-exp(-t*3.5))/3.5+vec3(sin(t*4.+aSeed.w*9.)*.22,-.55*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*(1.+aSeed.y)*sign(r.x);put(p,.32+.14*aSeed.w);}`,FEATHER_P('uC2','uC1'));
  // estela de viento rosa tras cada pluma (en el arco)
  S.pts(L.part,24,VV+K+SANG+`void main(){float s=${f(TL0)}+aSeed.x*(T1-${f(TL0)});float life=.2+aSeed.y*.1;float age=(uT-s)/life;
   vec3 r=rnd();float u=(s-${f(TL0)})/(T1-${f(TL0)});vec3 a0=vec3(-3.4,2.4,r.z*.6),c0=vec3(-.2,4.5,r.z*1.6),b0=HP;
   float sv=1.-u;vec3 p=sv*sv*a0+2.*sv*u*c0+u*u*b0;vec3 d=2.*sv*(c0-a0)+2.*u*(b0-c0);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=sang(p,d);put(p,.75+.3*aSeed.w);}`,WIND_FS,{mode:'energy'});
  const pp=V3(0,0,0), pq=V3(0,0,0), dv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, unf=ss(0,TU,te);
    let hits=0, lastHit=-9;
    for(const d of F){
      const u=(te-d.t0)/(d.t1-d.t0);
      if(te<d.t0){d.g.visible=unf>0.01;d.g.position.copy(d.piv).lerp(d.rest,unf*0.3);
        d.g.rotation.set(-d.s*0.45,0,0); d.g.rotateZ(Math.PI-d.ang*unf-0.1); d.g.scale.setScalar(Math.max(unf*1.3,0.001)); d.g.children[0].visible=true;}
      else if(u<1){d.g.visible=true;bez2(pp,d.rest,d.ctl,d.hit,u*u*(1.2-0.2*u));bez2(pq,d.rest,d.ctl,d.hit,Math.min(1,(u+0.02)*(u+0.02)*(1.2-0.2*(u+0.02))));
        dv.subVectors(pq,pp); if(dv.lengthSq()<1e-8)dv.set(1,-1,0);
        d.g.position.copy(pp).addScaledVector(dv.normalize(),-FLEN*0.9); faceFly(d.g,pp,dv); d.g.scale.setScalar(1.1);}
      else{const ih=te-d.t1;hits++;lastHit=Math.max(lastHit,d.t1);
        d.g.visible=ih<0.22; dv.subVectors(d.hit,d.ctl).normalize(); d.g.position.copy(d.hit).addScaledVector(dv,-FLEN*0.75+0.05*Math.sin(ih*80)*Math.exp(-ih*10)); faceFly(d.g,d.hit,dv);}
    }
    fM.uniforms.uK.value=0.2*ss(TL0-0.1,TL0,te);
    sparks[0].pose(te-0.86,TC,0.8); sparks[1].pose(te-0.92,tmp.set(TC.x,TC.y+0.25,0.1),0.9); sparks[2].pose(ia,TC,1);
    ring.pose(ia,TX,0,0.5,1);
    const j=hitE(te-0.86,8)*0.5+hitE(ia,5); target.position.x=TX+0.06*Math.sin(te*70)*hitE(te-0.86,6)+0.22*hitE(ia,5)*(1-Math.exp(-Math.max(ia,0)*20));
    target.rotation.z=-0.16*hitE(ia,5)*Math.cos(Math.max(ia,0)*14);
    caster.rotation.z=0.05*unf-0.1*ss(TL0,TL0+0.06,te)*(1-ss(TL0+0.1,TL0+0.5,te));
    o.em=0.3*Math.min(j,1); o.emc.copy(U.uC1.value);
    if(te<TL0){o.g.copy(HN);o.gs=0.9*unf;o.ga=0.15*unf;o.li=1.5*unf;}
    else if(te<0.86){o.g.set(-0.2,3.4,0);o.gs=1.2;o.ga=0.2;o.li=2.5;}
    else{const il=te-(hits?lastHit:0.86);o.g.copy(TC);o.gs=1.3+2*Math.min(il,0.5);o.ga=0.4*Math.exp(-il*8);o.li=5*Math.exp(-il*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.55;o.flash=0.8;
  };
}});

// =====================================================================
// 7 · KESTREL — un grito sube de los cuernos al cielo en un trazo de pincel; un cernícalo grande (óxido y crema,
//     iluminado) cae en picado sobre el objetivo entre ráfagas, lo atenaza y lo rasga con tres cortes; queda Débil
//     (chevrones violetas). ti 0,88 s
// =====================================================================
defs.push({key:"sty_bcKestrel",name:"Kestrel (estilizado)",dur:2.2,ti:0.88,pal:P_KESTREL,tier:2,stylized:true,
  zoneCaster:0.5,zoneTarget:1.3,
  phases:[["Grito",0],["Ascenso",0.12],["Picado",0.42],["Garras",0.88],["Ráfagas",0.98],["Calma",1.6]],
build(a){
  const L=a.L,TC0=0.12,TD=0.42,TI=0.88,CUT=[0.98,1.07,1.16],TE=1.6,SK=V3(1.2,7.6,-0.3),G=V3(3.25,2.05,0);
  const dv=(te,out)=>{const k=Math.pow(cl((te-TD)/(TI-TD)),1.9);return out.set(SK.x+(G.x-SK.x)*(1-Math.pow(1-k,0.7)),SK.y+(G.y-SK.y)*k,SK.z*(1-k));};
  // grito: trazo de pincel vertical (energía) que sube de los cuernos
  const cry=new THREE.Mesh(new THREE.PlaneGeometry(0.5,7,1,24).translate(0,3.5,0),S.mat(`uniform float uH;void main(){float h=vUv.y;if(h>uH)discard;
   float x=abs(vUv.x-.5)*2.;float w=.55-.35*h;float m=smoothstep(w,w*.3,x+.15*(styNoise(vec2(h*3.-uT*2.,.3)).r-.5));
   float er=styErode(styNoise(vec2(vUv.x*.5,h*1.5-uT)).r*.7+(1.-h)*.3,uP,.12);float head=smoothstep(.12,0.,uH-h);
   gl_FragColor=vec4(styRamp(.55+.4*head)*1.2,m*er*uA*(.55+.45*head));}`,{uH:{value:0}},{mode:'energy',side:THREE.DoubleSide}));
  cry.position.copy(HN); L.trail.add(cry);
  // cernícalo: silueta en plano (alas abiertas, cola en abanico) con luz en bandas y plumas marcadas; mira a cámara
  const bird=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),S.mat(`uniform float uFlap;uniform float uQ;uniform float uK;
   float wingD(vec2 p,float s){p.x*=s;vec2 a=vec2(.08,.05),b=vec2(.95,.22+uFlap*.18);vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
    float w=mix(.2,.05,h)*(1.-.35*step(.5,fract(h*6.))*step(p.y,a.y+ba.y*h));return length(pa-ba*h)-w;}
   void main(){vec2 p=(vUv-.5)*2.;
    float body=length(vec2(p.x*2.4,(p.y+.05)*1.15))-.42;float head=length(p-vec2(0.,.38))-.17;
    vec2 tq=p-vec2(0.,-.5);float tail=max(abs(tq.x)-(.1+.18*clamp(-tq.y*2.2,0.,1.)),abs(tq.y+.18)-.22);
    float d=min(min(body,head),min(min(wingD(p,1.),wingD(p,-1.)),tail));if(d>0.)discard;
    float nz=styNoise(vUv*1.4+.31).r;if(styErode(nz,uQ,.06)<.5)discard;
    float ax=abs(p.x);float bars=band(fract(ax*7.+p.y*1.5),.5,.12)*step(.2,ax);
    vec3 col=mix(${RUST},${CREAM},smoothstep(.1,-.25,p.y)*step(body,0.)*.6);col=mix(col,vec3(.45,.2,.08),step(0.,body)*step(0.,-p.y-.3)*.6);col=mix(col,vec3(.22,.13,.08),smoothstep(.65,.9,ax)+step(head,0.)*.0);
    col=mix(col,vec3(.3,.36,.5),step(head,0.)*.75);
    vec3 n=normalize(vec3(p.x*.5,-p.y*.25+.2,1.));float l=styLight(n,stySunV());
    vec3 c=styRampOf(col,clamp(.12+.5*l-.14*bars+smoothstep(-.06,0.,d)*.2,0.,1.))*styTint(l);
    float eye=smoothstep(.04,.02,length(p-vec2(.07,.42)));c=mix(c,vec3(.05),eye);
    float beak=step(length(p-vec2(0.,.24))-.05,0.);c=mix(c,vec3(1.,.72,.2),beak);
    c+=uC1*uK*.5;gl_FragColor=vec4(c,1.);}`,{uFlap:{value:0},uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  L.mesh.add(bird);
  // tres cortes de garra (forma de corte del atlas, energía) sobre el objetivo
  const cuts=CUT.map((t,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),S.mat(`void main(){vec4 s=styShape(6.,vUv);float er=styErode(s.r*.5+s.b*.5,uP,.1);
    gl_FragColor=vec4(styRamp(.55+.45*s.g)*1.3,s.r*er*uA);}`,{},{mode:'energy',depthTest:false}));m.userData={t:t,ang:-0.9+i*0.35};L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.88}), ring=S.groundRing(L.decal,3.2), shadow=S.contactShadow(L.decal,1.6);
  const weak=S.status(a,'weak',[target],TI+0.15,2.15);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const vec3 G=${v3(G)};const vec3 SK=${v3(SK)};`;
  // ráfagas de viento alrededor del picado y del objetivo
  S.pts(L.part,24,VV+K+SANG+`void main(){float s=TD+aSeed.x*(TI-TD+.3);float life=.25+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=pow(clamp((s-TD)/(TI-TD),0.,1.),1.9);vec3 c=vec3(SK.x+(G.x-SK.x)*(1.-pow(1.-k,.7)),SK.y+(G.y-SK.y)*k,SK.z*(1.-k));
   vec3 r=rnd();vec3 p=c+r*vec3(.9,.5,.7)+vec3(0.,1.4*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=sang(p,vec3(0.,1.,0.)+r*.2);put(p,.9+.4*aSeed.w);}`,WIND_FS,{mode:'energy'});
  // plumas de cernícalo que se sueltan en los cortes
  S.pts(L.part,22,VV+K+`void main(){float s=TI+.08+aSeed.x*.3;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=normalize(r+vec3(0.,.8,0.))*(1.6+2.*aSeed.z);vec3 p=G+vec3(0.,-.6,0.)+v*(1.-exp(-t*3.))/3.+vec3(sin(t*4.+aSeed.w*9.)*.25,-.6*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+sin(t*4.)*.8;put(p,.32+.12*aSeed.w);}`,FEATHER_P(RUST,CREAM));
  // polvo levantado al posarse
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(G.x,.25,0.)+vec3(cos(an),0.,sin(an)*.8)*(.4+.9*(1.-exp(-t*5.)))+vec3(0.,.1+t*.4,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  const bp=V3(0,0,0), bq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ic=te-TC0;
    cry.visible=ic>=0&&ic<0.7; cry.material.uniforms.uH.value=cl(ic/0.3); towardCam(cry.position,HN,0.05); cry.position.y=HN.y; billboard(cry); cry.rotation.set(0,cry.rotation.y,0);
    set(cry,-0.1+1.1*ss(0.25,0.65,ic),1);
    // picado: entra desde arriba (fuera de cámara), cae, se posa y agarra; luego levanta el vuelo y se desvanece
    let vis=te>=TD-0.05&&te<TE+0.3, sc=1.3;
    if(te<TI){dv(te,bp);dv(te+0.02,bq);bq.sub(bp);}
    else{const up=ss(1.2,TE+0.25,te);bp.copy(G).add(tmp.set(-0.05*Math.sin(ia*30)*hitE(ia,5),0.25*Math.sin(Math.min(ia,0.35)*9)*hitE(ia,3)+up*2.4,0));bq.set(0,1,0);sc=1.3*(1+0.1*hitE(ia,6));}
    bird.visible=vis; bird.position.copy(bp); billboard(bird, te<TI?Math.atan2(bq.y,Math.abs(bq.x)+0.3)*0.35+Math.PI*0:0);
    bird.scale.setScalar(sc); bird.material.uniforms.uFlap.value=te<TI?0.6+0.6*ss(TI-0.2,TI,te):Math.sin(te*26)*0.8;
    bird.material.uniforms.uQ.value=-0.1+1.1*ss(1.3,TE+0.3,te); bird.material.uniforms.uK.value=0.2*hitE(ia,8);
    shadow.pose(bp.x,0,0.5+0.12*Math.max(0,6-bp.y),vis?0.55*cl(1.6-bp.y*0.18):0);
    for(const m of cuts){const ik=te-m.userData.t;m.visible=ik>=0&&ik<0.32;if(!m.visible)continue;
      towardCam(m.position,TC,0.6); billboard(m,m.userData.ang); m.scale.setScalar(0.9+0.4*e3(ik/0.08)); set(m,-0.1+1.1*ss(0.08,0.32,ik),1);}
    spark.pose(ia,TC,1); ring.pose(ia,TX,0,0.5,1);
    const wenv=weak.pose(te);
    let j=hitE(ia,5);for(const t of CUT)j+=0.5*hitE(te-t,10);
    target.position.x=TX+0.12*Math.min(j,1.5)*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.12*Math.min(j,1.5)*Math.cos(te*30); target.scale.set(1,1-0.08*hitE(ia,6),1);
    caster.rotation.z=-0.1*ss(0,TC0,te)*(1-ss(TC0+0.1,TD,te));
    o.em=0.25*Math.min(j,1); o.emc.copy(U.uC1.value); S.statusGlow(o,[{kind:'weak',env:wenv*(ia>0.6?1:0)}]);
    if(te<TD){o.g.set(HN.x,HN.y+1.5*cl(ic/0.3),0);o.gs=0.8;o.ga=0.15;o.li=1.5;}
    else if(ia<0){o.g.copy(bp);o.gs=1.1;o.ga=0.2;o.li=2.5;}
    else{o.g.copy(TC);o.gs=1.3+2*Math.min(ia,0.5);o.ga=0.4*Math.exp(-ia*8);o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.55;o.flash=0.8;
  };
}});

VFX.module("Estilizado · Pájaro · Cuernos",defs);
})();

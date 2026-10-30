// =====================================================================
// ESTILIZADO · BICHO · COLA (Hito 101) — las 9 cartas de cola de Bicho hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_itAnt, sty_itCentipede, sty_itFishSnack, sty_itGravelAnt, sty_itLeafBug, sty_itPupae,
// sty_itShieldCrusher, sty_itThornyCaterpillar, sty_itTwinTail). Mismos dur / ti / fases que las originales.
// Los efectos nacen de la cola del lanzador (≈ (-4.15,0.75,0)); el Axie ya tiene su cola, aquí no se dibuja.
// Identidad de la clase: quitina carmesí con vetas oscuras y brillo de élitro; acentos propios de cada carta.
// Las criaturas son siluetas estilizadas (sin caras ni ojos de dibujo animado).
// Semántica según PartCards.js:
//   Ant (sobre sí: escudo 45 + provocar) · Fish Snack (aliado: escudo 60 + debilita al que le golpee)
//   Gravel Ant (aliado: escudo 60 + miedo al atacante cuerpo a cuerpo) · Pupae (aliado: escudo 60 + potenciado al ser golpeado)
//   Thorny Caterpillar (daño fuerte) · Twin Tail (2 golpes) · Centipede (daño + veneno)
//   Shield Crusher (rompe escudo + daño) · Leaf Bug (aliado: cura 45; carta de Bing y Pomodoro)
// Las cartas de aliado dibujan al receptor en el muñeco objetivo (receiver:'target').
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_ANT=pal("Sty Bicho · Hormiga",["#ff6a48","#8a1420"]);
const P_FISH=pal("Sty Bicho · Cebo",["#ff8a6a","#9c1e3a"]);
const P_GRAVEL=pal("Sty Bicho · Grava",["#ffb25a","#8e2a1c"]);
const P_PUPA=pal("Sty Bicho · Crisálida",["#ffc85a","#a83a1a"]);
const P_CATER=pal("Sty Bicho · Oruga",["#ff7a3c","#7a1018"]);
const P_TWIN=pal("Sty Bicho · Aguijón",["#ff5a6a","#6e0c2a"]);
const P_CENTI=pal("Sty Bicho · Ciempiés",["#ff8a2c","#9a1414"]);
const P_CRUSH=pal("Sty Bicho · Élitro",["#ff6a5a","#7a1426"]);
const P_LEAF=pal("Sty Bicho · Hoja",["#9fe06a","#2f7a2c"]);

// colores de materia en espacio lineal (THREE.Color convierte el hex sRGB)
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const CHITIN=lin(0xb0202c), CHITIND=lin(0x5a0c16), DARK=lin(0x1e0c10), EARTH=lin(0x9a7a56), EARTHD=lin(0x5e4630),
  STONE=lin(0x8a7a6c), IVORY=lin(0xe8d6b0), GOLD=lin(0xe8a838), SILK=lin(0xf0c060), ACID=lin(0x8ad83a), ACIDD=lin(0x3e7a1a),
  LEAF=lin(0x5aa83a), LEAFD=lin(0x2a5a22), HEALG=lin(0x6ee07a), ORANGE=lin(0xe8661c), FISHC=lin(0xf08a5a), BLUE=lin(0x6aa8ff),
  SOOT=lin(0x2a1a16), VIOLET=lin(0x8a5ae0), WATER=lin(0x4a9ad8);

const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7, TP=V3(-4.15,0.75,0), AC=V3(TX,0,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const win=(te,a,b,c,d)=>ss(a,b,te)*(1-ss(c,d,te));
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0);
const aim=(o,d)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());};
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const Z={zoneCaster:0.6,zoneTarget:1.2};

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.25,er=.06,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 float edge=smoothstep(uQ+.12,uQ,nz)*step(-.5,uQ);c+=uC1*edge*2.2;
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// quitina: bandas de segmento (en vP.x o vUv.y) y vetas oscuras
const CHIT=(col=CHITIN,bands='vUv.y*6.')=>`float bd=smoothstep(.08,0.,abs(fract(${bands})-.5)-.42);base=mix(${col},${DARK},bd*.8);lb=-.04*bd;`;
// mancha en el suelo: col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// corte (celda slash) en energía con rampa de la paleta; uEr = erosión
const CLAW_FS=`uniform float uEr;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.03)discard;
 float er=styErode(m*.5+s.b*.5,uEr,.1);gl_FragColor=vec4(styRamp(.3+.55*s.g)*1.25,m*er*uA);}`;
// cruz de curación (energía)
const PLUS_FS=S.PV+`void main(){vec2 q=styPC()-.5;float m=max(step(abs(q.x),.1)*step(abs(q.y),.33),step(abs(q.y),.1)*step(abs(q.x),.33));
 if(m<.5||vA<.01)discard;gl_FragColor=vec4(styRampOf(${HEALG},.75+.25*step(abs(q.x),.05))*1.15,vA);}`;
// chevrón hacia arriba (potenciado / escudo listo); col = color GLSL
const CHEVUP_FS=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.1+abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.7+.3*step(y-.1+abs(q.x)*.9,0.)),a);}`;
// chevrón hacia abajo (debilitar)
const CHEVDN_FS=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.75+.25*step(0.,y+.12-abs(q.x)*.9)),a);}`;
// hormiga de perfil (silueta de quitina, sin cara): abdomen, tórax, cabeza, patas que caminan, antenas; vR = rumbo
const ANT_FS=(col)=>S.PV+`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){vec2 q=styPC()-.5;if(vA<.01)discard;
 float b=min(min(length((q-vec2(-.17,.02))/vec2(.16,.11))-1.,length((q-vec2(.02,.0))/vec2(.075,.055))-1.),length((q-vec2(.16,.03))/vec2(.075,.07))-1.);
 float legs=1.;for(int i=0;i<3;i++){float fi=float(i)-1.;float ph=sin(uT*36.+fi*2.1)*.06;
  legs=min(legs,sdSeg(q,vec2(.02+fi*.03,-.02),vec2(fi*.09+ph,-.2)));}
 float ant=min(sdSeg(q,vec2(.2,.07),vec2(.3,.17)),sdSeg(q,vec2(.3,.17),vec2(.36,.12)));
 float body=smoothstep(.06,-.02,b);float lg=smoothstep(.022,.008,min(legs,ant));
 float a=max(body,lg)*vA;if(a<.02)discard;
 float top=smoothstep(-.1,.12,q.y);vec3 c=styRampOf(${col},.22+.5*top*body+.1*smoothstep(-.6,-.2,b));
 c+=uC1*smoothstep(-.35,-.05,b)*body*step(.0,q.y)*.35;gl_FragColor=vec4(c,a);}`;
// caparazón de élitros (segmento de esfera): crece desde el suelo (uH), juntas oscuras, borde con la paleta;
// uP = erosión al final, uK = destello al sellar
const SHELL_FS=(col,beetle=false)=>`uniform float uH;uniform float uK;
void main(){if(vP.y>uH)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*vec2(2.,3.)+.3).g;if(styErode(nz*.8+.2*styNoise(vUv*4.).r,uP,.08)<.5)discard;
 float seam=smoothstep(.09,.02,min(vUv.x,1.-vUv.x));float rib=smoothstep(.04,0.,abs(fract(vUv.y*${beetle?'2.':'4.'})-.5)-.45);
 vec3 c=styRampOf(${col},clamp(.18+.5*l+(nz-.5)*.1,0.,1.))*styTint(l);
 ${beetle?`vec2 b=(vUv-vec2(.5,.42))/vec2(.28,.2);float bd=length(b);float bt=smoothstep(1.,.85,bd);
  float split=smoothstep(.06,.0,abs(b.x))*step(-.2,b.y)*bt;float head=smoothstep(.4,.3,length((vUv-vec2(.5,.67))/vec2(.12,.08)));
  c=mix(c,styRampOf(${lin(0x2a0a10)},.3+.5*l),max(bt*.85,head*.9));c+=uSunCol*.18*smoothstep(.9,.6,bd)*smoothstep(.3,.6,b.y+.5)*bt;c=mix(c,${DARK},split);`:''}
 c=mix(c,${DARK},max(seam,rib*.6)*.9);
 vec3 h=normalize(L+normalize(vV));float sp=smoothstep(.86,.93,dot(n,h));c+=uSunCol*sp*.3;
 float fr=1.-abs(dot(n,normalize(vV)));c+=uC1*(.15*smoothstep(.6,.95,fr)+uK*.7);
 float edge=smoothstep(uH-.14,uH,vP.y)*step(vP.y,uH);c+=uC1*edge*1.4;
 gl_FragColor=vec4(c,(.84+.16*max(seam,fr))*uA);}`;
// anillo de sonido / pulso: borde de pincel en un plano; uP = vida
const PULSE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float w=.08+.03*styNoise(vec2(an*1.2,uP)).r;float m=smoothstep(w,0.,abs(r-.82));
 if(m<.02)discard;float er=styErode(m*.5+styNoise(vec2(an*2.,r)).g*.5,uP,.15);
 gl_FragColor=vec4(styRamp(.45+.4*m)*1.2,m*er*uA);}`;

// caparazón de n élitros alrededor de un punto del suelo: devuelve {g, plates, uH, uK} (uA y uP comunes)
function shell(parent,R,n,col,H=1.9,beetle=false){
  const g=new THREE.Group(); parent.add(g);
  const uH={value:-1}, uK={value:0}, uA={value:0}, uP={value:-0.1};
  const mat=S.mat(SHELL_FS(col,beetle),{uH,uK},{mode:'matter'}); mat.uniforms.uA=uA; mat.uniforms.uP=uP;
  const plates=[];
  for(let i=0;i<n;i++){
    const geo=new THREE.SphereGeometry(R,10,10,(i/n)*Math.PI*2+0.03,(Math.PI*2/n)-0.06,0,Math.PI*0.5);
    geo.scale(1,H/R,1);
    const m=new THREE.Mesh(geo,mat); g.add(m); plates.push(m);
  }
  return {g,plates,uH,uK,uA,uP,H};
}
const defs=[];

// =====================================================================
// 1 · ANT (sobre sí) — una colonia de hormigas obreras baja de la cola y desfila en anillo a los pies del lanzador;
//     levantan montículos de tierra y un caparazón de élitros carmesí crece desde el suelo y se sella (escudo 45).
//     Después, tres pulsos rojos y el anillo de provocación. ti 0,85 s
// =====================================================================
defs.push(Object.assign({key:"sty_itAnt",name:"Ant (estilizado)",dur:2.2,ti:0.85,pal:P_ANT,tier:2,stylized:true,
  phases:[["Colonia",0],["Desfile",0.12],["Barricada",0.45],["Escudo",0.85],["Provocación",1.2],["Fin",1.85]],
build(a){
  const L=a.L,TD=0.12,TB=0.45,TI=0.85,TT=1.2,TE=2.15;
  const K=`const float TD=${f(TD)};const float TB=${f(TB)};const float TI=${f(TI)};const vec3 TP=${v3(TP)};const vec3 CC=vec3(${f(CX)},0.,0.);`;
  // hormigas: bajan de la cola por una rampa y desfilan en anillo; al sellar, trepan al caparazón y desaparecen
  S.pts(L.part,26,VV+K+`void main(){float an0=aSeed.x*6.2832;float s=TD+aSeed.y*.25;float u=clamp((uT-s)/.3,0.,1.);
   float rad=.95+.12*aSeed.z;vec3 ring=CC+vec3(cos(an0+uT*1.6)*rad,.08,sin(an0+uT*1.6)*rad*.9);
   vec3 p=mix(TP+vec3(0.,-.1,0.),ring,u);p.y=mix(TP.y,.08,u)+.06*abs(sin(uT*30.+aSeed.w*9.));
   float climb=smoothstep(TI-.05,TI+.25,uT);p=mix(p,CC+vec3(cos(an0+uT*1.6)*.8,1.4,sin(an0+uT*1.6)*.7),climb*.6);
   vec3 v=vec3(-sin(an0+uT*1.6),0.,cos(an0+uT*1.6));vR=u<1.?-.6:atan(v.y-v.z*.32,v.x+1e-4);vK=0.;
   vA=(uT>s?1.:0.)*(1.-climb);put(p,.62+.1*aSeed.w);}`,ANT_FS(CHITIN));
  // montículos de tierra con guijarros alrededor del lanzador (8 cúpulas bajas)
  const Q={value:1},Kk={value:0};
  const moundM=S.mat(SOLID(`float g=styNoise(vUv*vec2(5.,3.)).g;base=mix(${lin(0xb08a5a)},${EARTHD},step(.66,g)*.7);lb=.02;`,{rim:.15}),{uQ:Q,uK:Kk},{mode:'solid'});
  const mounds=[];
  for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.38,12,8,0,Math.PI*2,0,Math.PI*0.5),moundM);
    const an=i/8*Math.PI*2+0.2;m.position.set(CX+Math.cos(an)*1.25,0,Math.sin(an)*1.1);L.mesh.add(m);mounds.push(m);}
  const sh=shell(L.mesh,0.85,6,lin(0x8a1420),1.95); sh.g.position.set(CX,0,0);
  const pulses=[0,1,2].map(()=>{const m=groundPlane(3.0,CX,0.04,S.mat(PULSE_FS,{},{mode:'energy'}));L.decal.add(m);return m;});
  const ring=S.groundRing(L.decal,3.0);
  const taunt=S.status(a,'taunt',[caster],TT,TE);
  // polvo cuando se levantan los montículos
  S.pts(L.part,16,VV+K+`void main(){float s=TB+aSeed.x*.12;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=CC+vec3(cos(an)*1.2,.15,sin(an)*1.05)+vec3(cos(an),0.,sin(an))*t*.6+vec3(0.,t*.7,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.18*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.04}));
  a.pose=function(te,o){
    const ia=te-TI;
    const mk=ss(TB,TB+0.25,te)*(1-ss(1.75,2.1,te));
    mounds.forEach((m,i)=>{const k=cl(mk*1.15-i*0.02);m.scale.set(1,Math.max(k,0.001),1);m.visible=k>0.01;});
    Q.value=te<1.75?-0.1:-0.1+1.1*ss(1.75,2.1,te);
    sh.uH.value=-0.05+(sh.H+0.1)*ss(TB+0.05,TI,te); sh.uA.value=te<TB?0:1; sh.uP.value=-0.1+1.1*ss(1.7,2.15,te);
    sh.uK.value=0.6*hitE(ia,6)+0.25*Math.max(0,Math.sin((te-TT)*Math.PI/0.22))*win(te,TT,TT+0.02,TT+0.62,TT+0.7);
    sh.g.rotation.y=0.15*Math.sin(te*2);
    pulses.forEach((m,i)=>{const u=cl((te-TT-i*0.22)/0.5);m.visible=te>=TT+i*0.22&&u<1;m.scale.setScalar(0.4+0.9*u);set(m,u,1-u*0.3);});
    ring.pose(ia,CX,0,0.5,1.0);
    const tv=taunt.pose(te);
    caster.scale.set(1+0.04*hitE(ia,7),1-0.05*hitE(ia,7),1+0.04*hitE(ia,7));
    glowOf(caster,U.uC1.value,0.35*hitE(ia,5)+0.25*tv*(0.5+0.5*Math.sin(te*14)));
    o.g.set(CX,1.1,0); o.gs=1.2+0.8*ss(TB,TI,te); o.ga=0.12+0.25*hitE(ia,5); o.li=1.5+3*hitE(ia,5);
    o.ia=ia; o.c.set(CX,1.0,0); o.shake=0; o.dist=0.4; o.flash=0.2; o.em=0;
  };
}},Z));

// =====================================================================
// 2 · FISH SNACK (aliado) — de la cola sale un cebo de pez glaseado que vuela en arco y cae a los pies del aliado con
//     un chapoteo; un enjambre de escarabajos carmesí acude al cebo, gira alrededor del aliado y forma un caparazón de
//     élitros (escudo 60). Chevrones violetas giran en el borde: quien le golpee quedará débil. ti 0,75 s
// =====================================================================
defs.push(Object.assign({key:"sty_itFishSnack",name:"Fish Snack (estilizado)",dur:2.2,ti:0.75,pal:P_FISH,tier:2,stylized:true,receiver:'target',
  phases:[["Cebo",0],["Lanzamiento",0.18],["Caída",0.75],["Enjambre",0.95],["Defensa",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TL=0.18,TI=0.75,TS=0.95,TDf=1.35,TE=2.15;
  const Q={value:1},Kk={value:0};
  const fishM=S.mat(SOLID(`float sc=smoothstep(.1,0.,abs(fract(vUv.x*7.+vUv.y*2.)-.5)-.38);base=mix(${FISHC},${lin(0xc04a3a)},sc*.6+smoothstep(.0,-.25,vP.y)*.3);
   base=mix(base,${lin(0xf4d8a0)},smoothstep(-.05,-.18,vP.y)*.5);`,{rim:.3}),{uQ:Q,uK:Kk},{mode:'solid'});
  const fish=new THREE.Group(); L.mesh.add(fish);
  const fb=new THREE.Mesh(new THREE.SphereGeometry(0.26,18,12),fishM); fb.scale.set(1.5,0.8,0.6); fish.add(fb);
  const ft=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.32,4),fishM); ft.rotation.z=Math.PI/2; ft.position.x=-0.48; ft.scale.set(1,1,0.25); fish.add(ft);
  const sh=shell(L.mesh,0.94,4,lin(0x6e1428),1.55,true); sh.g.position.set(TX,0,0);
  const splash=S.groundRing(L.decal,2.2), ring=S.groundRing(L.decal,2.8);
  const stain=groundPlane(1.8,TX,0.022,S.mat(STAIN(WATER,.45),{},{mode:'matter'})); L.decal.add(stain);
  const shadow=S.contactShadow(L.decal,0.9);
  const K=`const float TI=${f(TI)};const float TS=${f(TS)};const float TD=${f(TDf)};const vec3 AC=vec3(${f(TX)},0.,0.);`;
  // gotas del chapoteo
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,0.,1.)+vec3(0.,1.4,0.));vec3 p=AC+vec3(.35,.1,.25)+d*(1.8+aSeed.z)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:WATER}));
  // enjambre: escarabajos (gota oscura con élitro) que acuden y giran alrededor del aliado
  S.pts(L.part,22,VV+K+`void main(){float an0=aSeed.x*6.2832;float u=smoothstep(TS-.2,TS+.25,uT);
   float an=an0+uT*(3.+aSeed.y);float rad=mix(2.4+aSeed.z,.95+.1*aSeed.w,u);
   vec3 p=AC+vec3(cos(an)*rad,.35+1.2*aSeed.y+.1*sin(uT*9.+aSeed.w*6.),sin(an)*rad*.85);
   float off=smoothstep(TD+.1,TD+.4,uT);p=mix(p,AC+vec3(cos(an)*.85,.4+1.3*aSeed.y,sin(an)*.75),off);
   vR=an+1.5708;vK=smoothstep(1.8,2.1,uT);vA=smoothstep(TS-.25,TS-.05,uT)*(1.-off*.6);put(p,.3+.08*aSeed.z);}`,
   S.MATTER_FS(C.shard,{relief:4,col:CHITIN,bias:-.05}));
  // chevrones violetas (debilitar al atacante) en el borde del caparazón
  S.pts(L.part,6,VV+K+`void main(){float an=aSeed.x*6.2832+uT*1.4;float on=smoothstep(TD,TD+.15,uT)*(1.-smoothstep(1.85,2.1,uT));
   vec3 p=AC+vec3(cos(an)*1.15,1.0+.5*aSeed.y+.08*sin(uT*6.+aSeed.z*6.),sin(an)*1.0);vR=0.;vK=0.;vA=on;put(p,.32);}`,CHEVDN_FS(VIOLET),{mode:'energy'});
  const S0=V3(-4.0,1.0,0.1), S1=V3(TX+0.35,0.12,0.25);
  a.pose=function(te,o){
    const ia=te-TI;
    // cebo: aparece en la cola, vuela en arco girando y se hunde en el chapoteo
    const fu=cl((te-TL)/(TI-TL)); fish.visible=te>=0.02&&te<TI+0.35;
    if(te<TL){fish.position.copy(S0);fish.rotation.set(0,0,0.3*Math.sin(te*30));}
    else if(te<TI){arcPt(S0,S1,1.6,fu,fish.position);fish.rotation.set(0,0,-(fu-0.5)*2.2);}
    else{fish.position.copy(S1);fish.position.y=0.12-0.3*ss(TI,TI+0.35,te);fish.rotation.set(0,0,-1.1);}
    fish.scale.setScalar(1.25*ss(0,0.12,te));
    Q.value=te<TI+0.15?-0.1:-0.1+1.1*ss(TI+0.15,TI+0.35,te); Kk.value=0.05;
    shadow.pose(fish.position.x,fish.position.z,0.7,fish.visible?0.35*cl(1.3-fish.position.y*0.35):0);
    splash.pose(ia,TX+0.35,0.25,0.4,0.8); ring.pose(te-TDf,TX,0,0.5,1.0);
    set(stain,-0.1+1.1*ss(1.6,2.15,te),ss(TI,TI+0.1,te));
    sh.uH.value=-0.05+(sh.H+0.1)*ss(TS,TDf,te); sh.uA.value=te<TS?0:1; sh.uP.value=-0.1+1.1*ss(1.8,2.2,te);
    sh.uK.value=0.3*hitE(te-TDf,8);
    const sq=hitE(ia,8); target.scale.set(1+0.03*sq,1-0.03*sq,1+0.03*sq);
    o.em=0.2*win(te,TS,TDf,1.6,2.0); o.emc.copy(U.uC1.value);
    o.g.set(TX,1.0,0); o.gs=1.0+0.8*ss(TS,TDf,te); o.ga=0.06+0.1*hitE(te-TDf,5); o.li=1.5+3*hitE(te-TDf,5);
    o.ia=ia; o.c.set(TX,0.6,0); o.shake=0; o.dist=0.3; o.flash=0.2;
  };
}},Z));

// =====================================================================
// 3 · GRAVEL ANT (aliado) — una columna de hormigas de grava marcha por el suelo hasta el aliado, trepa y apila
//     piedras en una coraza (escudo 60). Al sellarse brotan púas de grava: el que le ataque cuerpo a cuerpo tendrá
//     miedo (destello ámbar y polvo). ti 0,85 s
// =====================================================================
defs.push(Object.assign({key:"sty_itGravelAnt",name:"Gravel Ant (estilizado)",dur:2.3,ti:0.85,pal:P_GRAVEL,tier:2,stylized:true,receiver:'target',
  phases:[["Arena",0],["Marcha",0.12],["Coraza",0.55],["Escudo",0.85],["Atasco",1.1],["Fin",1.9]],
build(a){
  const L=a.L,TM=0.12,TC2=0.55,TI=0.85,TA=1.1,TE=2.2;
  const K=`const float TM=${f(TM)};const float TC=${f(TC2)};const float TI=${f(TI)};const float TA=${f(TA)};const vec3 AC=vec3(${f(TX)},0.,0.);const vec3 CC=vec3(${f(CX)},0.,0.);`;
  // columna de hormigas: dos filas que marchan del lanzador al aliado y trepan en espiral
  S.pts(L.part,34,VV+K+`void main(){float row=step(.5,aSeed.y);float s=TM+aSeed.x*.3;float u=clamp((uT-s)/.42,0.,1.);
   float x=mix(CC.x+.4,AC.x-.6,u);vec3 p=vec3(x,.07+.05*abs(sin(uT*32.+aSeed.w*9.)),(row-.5)*.35+.06*sin(x*3.+aSeed.z*6.));
   float cu=clamp((uT-s-.42)/.3,0.,1.);float an=aSeed.z*6.2832+cu*4.;
   vec3 cl2=AC+vec3(cos(an)*.62,.15+cu*1.3*aSeed.w+.1,sin(an)*.55);p=mix(p,cl2,smoothstep(0.,1.,cu));
   vR=cu>0.?1.4:0.;vK=0.;vA=(uT>s?1.:0.)*(1.-smoothstep(TI,TI+.12,uT));put(p,.55+.08*aSeed.w);}`,ANT_FS(lin(0x6a2a1c)));
  // piedras de la coraza: se apilan desde abajo en espiral y quedan fijas como escudo
  S.pts(L.part,40,VV+K+`void main(){float k=aSeed.x;float s=TC+k*(TI-TC)*.9;float u=clamp((uT-s)/.14,0.,1.);
   float an=k*6.2832*3.+aSeed.y*.6;float h=.12+k*1.55;float rad=.72*(1.-.35*pow(k,2.));
   vec3 fin=AC+vec3(cos(an)*rad,h,sin(an)*rad*.9);vec3 st=fin+vec3(cos(an)*.6,-.6,sin(an)*.5);
   vec3 p=mix(st,fin,u*u*(3.-2.*u));float burst=smoothstep(TA,TA+.12,uT);p+=vec3(cos(an),0.,sin(an))*burst*.12*sin((uT-TA)*20.)*exp(-(uT-TA)*4.);
   float off=smoothstep(1.85,2.15,uT);p.y-=off*off*1.2*(1.+aSeed.z);p.y=max(p.y,.05);
   vR=aSeed.w*6.28;vK=smoothstep(.4,1.,off);vA=uT>s?1.:0.;put(p,.46+.16*aSeed.z);}`,S.MATTER_FS(C.shard,{relief:5,col:STONE,bias:.02}));
  // púas de grava que brotan (miedo al atacante cuerpo a cuerpo)
  S.pts(L.part,10,VV+K+`void main(){float an=aSeed.x*6.2832;float u=smoothstep(TA,TA+.1,uT)*(1.-smoothstep(1.8,2.05,uT));
   vec3 p=AC+vec3(cos(an)*(.8+.35*u),.3+1.2*aSeed.y,sin(an)*(.7+.3*u));vR=an+1.5708;vK=smoothstep(1.7,2.05,uT);
   vA=u>0.01?1.:0.;put(p,(.32+.1*aSeed.z)*u);}`,S.MATTER_FS(C.shard,{relief:5,col:lin(0x7a3a24),bias:-.05}));
  // polvo ámbar del atasco
  S.pts(L.part,14,VV+K+`void main(){float s=TA+aSeed.x*.06;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AC+vec3(cos(an),0.,sin(an)*.9)*(.7+1.0*(1.-exp(-t*5.)))+vec3(0.,.2+t*.6,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.44+.2*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:lin(0xc8904a),bias:-.04}));
  const ring=S.groundRing(L.decal,2.8), ring2=S.groundRing(L.decal,3.4);
  const trail=groundPlane(7.6,(CX+TX)/2,0.02,S.mat(`void main(){float x=vUv.x;float d=abs(vUv.y-.5);
   float m=smoothstep(.12,.03,d)*smoothstep(0.,.04,x)*smoothstep(1.,.92,x)*step(x,uP);if(m<.01)discard;
   float n=styNoise(vUv*vec2(12.,2.)).r;gl_FragColor=vec4(styRampOf(${EARTHD},.2+.3*n),m*uA*.5*(.6+.4*n));}`,{},{mode:'matter'}),0.9);
  L.decal.add(trail);
  a.pose=function(te,o){
    const ia=te-TI;
    set(trail,ss(TM,TM+0.6,te),1-ss(1.4,1.9,te));
    ring.pose(ia,TX,0,0.45,0.9); ring2.pose(te-TA,TX,0,0.5,1.0);
    const sq=hitE(ia,7)+0.6*hitE(te-TA,9); target.scale.set(1+0.03*sq,1-0.04*sq,1+0.03*sq);
    o.em=0.3*win(te,TC2,TI,1.5,1.9); o.emc.copy(U.uC1.value);
    o.g.set(TX,1.0,0); o.gs=1.0+0.8*ss(TC2,TI,te); o.ga=0.1+0.25*hitE(te-TA,5); o.li=1.5+3*hitE(te-TA,5);
    o.ia=ia; o.c.set(TX,0.8,0); o.shake=0; o.dist=0.3; o.flash=0.2;
  };
}},Z));

// =====================================================================
// 4 · PUPAE (aliado) — hilos de seda dorada salen de la cola, viajan en espiral y envuelven al aliado en una
//     crisálida de quitina ámbar con vetas carmesí que se endurece (escudo 60). Late dos veces y suben chevrones
//     rojos (se potenciará al recibir un golpe); al final la crisálida se abre en pétalos y se deshace. ti 1,0 s
// =====================================================================
defs.push(Object.assign({key:"sty_itPupae",name:"Pupae (estilizado)",dur:2.3,ti:1.0,pal:P_PUPA,tier:2,stylized:true,receiver:'target',
  phases:[["Hilado",0],["Envoltura",0.35],["Crisálida",1.0],["Latido",1.3],["Fin",1.95]],
build(a){
  const L=a.L,TW=0.35,TI=1.0,TB=1.3,TF=1.95,TE=2.3;
  const K=`const float TW=${f(TW)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 AC=vec3(${f(TX)},0.,0.);const vec3 TP=${v3(TP)};`;
  // hilos de seda: cintas en hélice alrededor del aliado (se revelan con uP), en materia dorada
  const silkFS=`void main(){float x=vUv.x;if(x>uP)discard;float w=abs(vUv.y-.5);float m=smoothstep(.5,.2,w);
   float n=styNoise(vec2(x*14.,vUv.y)).g;vec3 c=styRampOf(${SILK},.45+.4*(1.-w*2.)+(n-.5)*.15);
   c+=uC1*smoothstep(uP-.06,uP,x)*1.2;gl_FragColor=vec4(c,m*uA);}`;
  const helix=[0,1].map(i=>{const m=new THREE.Mesh(VFX.helixGeo(3.2,0.62,0.42,1.8,0.12,90),S.mat(silkFS,{},{mode:'matter'}));
    m.position.set(TX,0.1,0); m.rotation.y=i*Math.PI; L.mesh.add(m); return m;});
  const sh=shell(L.mesh,0.72,5,lin(0xb85a1a),2.0); sh.g.position.set(TX,0,0);
  const ring=S.groundRing(L.decal,2.6);
  // hebras que viajan de la cola al aliado (partículas en estela)
  S.pts(L.part,40,VV+K+`void main(){float k=aSeed.x;float s=.05+k*.28;float u=clamp((uT-s)/.4,0.,1.);
   vec3 m=mix(TP,AC+vec3(0.,1.2,0.),.5)+vec3(0.,1.4,(aSeed.y-.5)*.8);vec3 a0=mix(TP,m,u),a1=mix(m,AC+vec3(0.,1.,0.),u);vec3 p=mix(a0,a1,u);
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.16+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:.9}),{mode:'energy'});
  // chevrones rojos (potenciado) en cada latido
  S.pts(L.part,8,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TB+i*.3+aSeed.y*.08;float age=(uT-s)/.6;float an=aSeed.z*6.2832;
   vec3 p=AC+vec3(cos(an)*.75,.9+age*1.4,sin(an)*.65);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.36);}`,CHEVUP_FS(lin(0xe02a2a)),{mode:'energy'});
  // pétalos de la crisálida al abrirse
  S.pts(L.part,18,VV+K+`void main(){float s=${f(TF)}+aSeed.x*.1;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AC+vec3(cos(an)*.7,.6+1.3*aSeed.w,sin(an)*.6)+vec3(cos(an),.6,sin(an))*t*1.4+vec3(0.,-2.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*5.;put(p,.3+.1*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:4,col:lin(0xd0882a)}));
  a.pose=function(te,o){
    const ia=te-TI;
    helix.forEach((m,i)=>{set(m,ss(TW+i*0.06,TI,te),1-ss(TI+0.1,TI+0.35,te));m.visible=te>=TW&&te<TI+0.4;});
    sh.uH.value=-0.05+(sh.H+0.1)*ss(TW+0.2,TI,te); sh.uA.value=te<TW+0.2?0:1; sh.uP.value=-0.1+1.1*ss(TF,TE,te);
    const beat=Math.max(hitE(te-TB,9),hitE(te-TB-0.3,9));
    sh.uK.value=0.6*hitE(ia,6)+0.55*beat;
    const bs=1+0.05*beat; sh.g.scale.set(bs,1+0.03*beat,bs);
    // al final la crisálida se abre: los élitros se inclinan hacia fuera
    const op=ss(TF-0.05,TF+0.25,te); sh.plates.forEach((m,i)=>{const an=(i+0.5)/sh.plates.length*Math.PI*2;
      m.rotation.set(Math.sin(an)*0.5*op,0,-Math.cos(an)*0.5*op);});
    ring.pose(ia,TX,0,0.5,1.0);
    glowOf(target,U.uC1.value,0);
    o.em=0.25*ss(TW,TI,te)*(1-ss(TF,TE,te))+0.35*beat; o.emc.setRGB(1,0.55,0.2);
    o.g.set(TX,1.1,0); o.gs=1.0+0.7*ss(TW,TI,te); o.ga=0.1+0.2*hitE(ia,5)+0.15*beat; o.li=1.5+3*hitE(ia,5)+2*beat;
    o.ia=ia; o.c.set(TX,1.0,0); o.shake=0; o.dist=0.3; o.flash=0.2;
  };
}},Z));

// =====================================================================
// 5 · THORNY CATERPILLAR (3 PA) — una oruga espiritual de quitina carmesí con púas de marfil sale de la cola, se enrosca
//     en una bola espinosa y rueda por el suelo abriendo un surco; arrolla al rival (púas, grietas, temblor) y revienta
//     en baba ácida que deja una mancha. Pesado y devastador. ti 1,55 s
// =====================================================================
defs.push(Object.assign({key:"sty_itThornyCaterpillar",name:"Thorny Caterpillar (estilizado)",dur:3.1,ti:1.55,pal:P_CATER,tier:3,stylized:true,
  phases:[["Oruga",0],["Enroscado",0.35],["Rodada",0.6],["Impacto",1.55],["Veneno",1.85],["Rastro",2.4]],
build(a){
  const L=a.L,TCu=0.35,TR=0.6,TI=1.55,TV=1.85,TE=3.05;
  const Q={value:1},Kk={value:0};
  const segM=S.mat(SOLID(`float sp=smoothstep(.14,0.,length(vUv-vec2(.5,.7))-.05);base=mix(${CHITIN},${DARK},smoothstep(-.02,-.2,vP.y)*.6);
   base=mix(base,${lin(0xf0a030)},sp*.8);lb=-.02;`,{rim:.3,hot:'vec3(1.,.4,.15)'}),{uQ:Q,uK:Kk},{mode:'solid'});
  const thornM=S.mat(SOLID(`base=mix(${IVORY},${lin(0x6a1a14)},smoothstep(.55,.0,vUv.y));`,{rim:.2}),{uQ:Q,uK:Kk},{mode:'solid'});
  const N=7, segs=[], thorns=[];
  const G=new THREE.Group(); L.mesh.add(G);
  for(let i=0;i<N;i++){
    const s=new THREE.Group(); G.add(s);
    const r=0.26-0.012*Math.abs(i-2);
    const b=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),segM); s.add(b);
    for(let j=0;j<3;j++){const t=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.38,6),thornM);
      const an=(j-1)*0.65; t.position.set(Math.sin(an)*r*0.85,Math.cos(an)*r*0.85,0); t.rotation.z=-an; s.add(t); thorns.push(t);}
    segs.push({s,r});
  }
  // bola enroscada: núcleo de quitina y púas de marfil que salen en todas direcciones (aparecen al enroscarse)
  const ball=new THREE.Group(); G.add(ball);
  const core=new THREE.Mesh(new THREE.SphereGeometry(0.44,20,16),segM); ball.add(core);
  const BT=[], NT=16;
  for(let i=0;i<NT;i++){const y=1-2*(i+0.5)/NT, r=Math.sqrt(1-y*y), an=i*2.39996;
    const d=V3(Math.cos(an)*r,y,Math.sin(an)*r);const t=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.5,7),thornM);
    t.position.copy(d).multiplyScalar(0.52); t.quaternion.setFromUnitVectors(V3(0,1,0),d); ball.add(t); BT.push(t);}
  const crack=groundPlane(3.2,TX,0.026,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float br=smoothstep(.06,0.,abs(fract(an/6.2832*7.+styNoise(vec2(r*.6,an)).r*.35)-.5)*r*2.2)*step(r,uP)*(1.-r*.5);
   float n=styNoise(vUv*2.).r;float m=max(br,smoothstep(.35,.2,r)*.6);if(m<.02)discard;
   gl_FragColor=vec4(mix(${SOOT},uC1*1.6,br*smoothstep(.9,.2,r)*.8),m*uA);}`,{},{mode:'matter'})); L.decal.add(crack);
  const furrow=groundPlane(7.4,(CX+TX)/2+0.3,0.021,S.mat(`void main(){float x=vUv.x;float d=abs(vUv.y-.5);
   float m=smoothstep(.2,.06,d)*smoothstep(0.,.05,x)*step(x,uP);if(m<.01)discard;float n=styNoise(vUv*vec2(14.,2.)).r;
   gl_FragColor=vec4(styRampOf(${EARTHD},.12+.25*n),m*uA*.65);}`,{},{mode:'matter'}),1.0); L.decal.add(furrow);
  const stain=groundPlane(2.6,TX+0.2,0.024,S.mat(STAIN(ACIDD,.6),{},{mode:'matter'})); L.decal.add(stain);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.42}), ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.6);
  const shadow=S.contactShadow(L.decal,1.4);
  const K=`const float TR=${f(TR)};const float TI=${f(TI)};const float TV=${f(TV)};const vec3 HIT=${v3(TC)};`;
  // polvo de la rodada (sale detrás de la bola)
  S.pts(L.part,24,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=(s-TR)/(TI-TR);vec3 p=vec3(mix(-3.,${f(TX-0.6)},u*u),.15,(aSeed.z-.5)*.5)+vec3(-t*.6,t*.6,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*.9:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.2*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // púas que salen despedidas en el impacto
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.7,0.));vec3 p=HIT+d*(3.+2.*aSeed.z)*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=atan(d.y,d.x)+t*8.;put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:5,col:IVORY}));
  // baba ácida que revienta y gotea
  S.pts(L.part,22,VV+K+`void main(){float s=TV+aSeed.x*.08;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.3,1.)+vec3(0.,1.,0.));vec3 p=HIT+vec3(.1,-.3,0.)+d*(1.6+aSeed.z)*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=3.14159;put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:ACID}));
  // vapor ácido que sube después
  S.pts(L.part,10,VV+K+`void main(){float s=TV+.1+aSeed.x*.6;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HIT+vec3(rnd().x*.7,-.8+t*1.2,rnd().z*.5);vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*.8:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.5+.2*aSeed.z)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:3,col:lin(0x9ac850),bias:-.05}));
  const P0=V3(-4.0,0.55,0.15), ROLL0=V3(-2.9,0.8,0.2), ROLL1=V3(TX-0.75,0.8,0.15);
  a.pose=function(te,o){
    const ia=te-TI;
    // oruga: sale de la cola y repta (onda), se enrosca en bola, rueda y se deshace tras el golpe
    const cu=ss(TCu,TR,te);
    let ctr;
    if(te<TR){ctr=tmp.lerpVectors(P0,ROLL0,cu);}else if(te<TI){const u=(te-TR)/(TI-TR);ctr=tmp.lerpVectors(ROLL0,ROLL1,u*u);}
    else{ctr=tmp.copy(ROLL1).add(tmp2.set(-0.35*e3(ia/0.3),0.35*Math.sin(cl(ia/0.35)*Math.PI),0));}
    G.position.copy(ctr); G.visible=te<TI+0.55;
    const roll=te<TR?0:-(te-TR)*14;
    segs.forEach(({s,r},i)=>{
      const k=i/(N-1);
      // estirada: línea que ondula detrás de la cabeza; enroscada: anillo
      const lx=0.42-k*0.95*0.95, ly=0.08*Math.sin(te*12-k*6)+0.0;
      const an=k*Math.PI*2*0.86+roll, rx=Math.cos(an)*0.42, ry=Math.sin(an)*0.42;
      s.position.set(lx+(rx-lx)*cu, ly+(ry-ly)*cu, 0);
      s.rotation.set(0,0,an*cu+(1-cu)*(-1.5708));
      const g=1.0*ss(0,0.18,te-k*0.05)*(1-ss(TCu+0.1,TR,te)); s.scale.setScalar(Math.max(g,0.001)); s.visible=g>0.01;
    });
    const bk=ss(TCu+0.05,TR,te); ball.visible=bk>0.01; ball.scale.setScalar(Math.max(bk,0.001)); ball.rotation.set(0.3,0,roll);
    BT.forEach((t,i)=>t.scale.setScalar(Math.max(ss(TCu+0.1+i*0.006,TR+0.05,te)*(1+0.15*hitE(ia,8)),0.001)));
    G.scale.setScalar(1.75);
    Q.value=te<TI+0.3?-0.1:-0.1+1.1*ss(TI+0.3,TI+0.55,te); Kk.value=0.04+0.15*hitE(ia,8);
    shadow.pose(G.position.x,G.position.z,1.2,G.visible?0.42:0);
    set(furrow,ss(TR,TI,te)*0.95,1-ss(2.3,3.0,te));
    set(crack,ss(TI,TI+0.12,te),1-ss(2.4,3.0,te)); crack.visible=ia>=0;
    set(stain,-0.1+1.1*ss(2.4,3.05,te),ss(TV,TV+0.15,te)); stain.visible=te>=TV;
    spark.pose(ia,tmp2.copy(TC).add(tmp3.set(-0.2,-0.2,0.3)),1.3);
    ring.pose(ia,TX,0,0.55,1.1); ring2.pose(ia-0.12,TX,0,0.5,0.8);
    const h=hitE(ia,5);
    target.position.x=TX+0.32*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.28*h*Math.cos(ia*12);
    target.scale.set(1+0.1*h,1-0.14*h,1+0.1*h);
    o.em=0.4*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(G.position);o.gs=0.8;o.ga=0.08;o.li=1.5;o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.6;}
    else{o.g.copy(TC);o.gs=2+3*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=8*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1.2;o.dist=1;o.flash=0.8;}
  };
}},{zoneCaster:0.6,zoneTarget:1.3}));

// =====================================================================
// 6 · TWIN TAIL — dos aguijones espectrales de quitina carmesí con punta de toxina se alzan sobre el lanzador, se
//     tensan y se lanzan uno tras otro; cada uno se clava en el rival (chispa, salpicadura corrosiva) y se disuelve.
//     2 golpes. ti 0,7 s (segundo a 0,95 s)
// =====================================================================
defs.push(Object.assign({key:"sty_itTwinTail",name:"Twin Tail (estilizado)",dur:2.1,ti:0.7,pal:P_TWIN,tier:2,stylized:true,
  phases:[["Aguijones",0],["Tensión",0.4],["Primer golpe",0.7],["Segundo",0.95],["Corrosión",1.15],["Disipación",1.5]],
build(a){
  const L=a.L,TT=0.4,TI=0.7,T2=0.95,TCr=1.15,TF=1.5;
  const Q=[{value:1},{value:1}],Kk=[{value:0},{value:0}];
  const sting=[0,1].map(i=>{
    const M=S.mat(SOLID(`float t=vUv.y;base=mix(${CHITIND},${DARK},smoothstep(.1,0.,abs(fract(t*5.)-.5)-.4)*.8);base=mix(base,${CHITIN},smoothstep(.2,.6,t)*.6);
     base=mix(base,${lin(0xb0e040)},smoothstep(.72,.95,t));lb=.04*smoothstep(.75,1.,t);`,{rim:.2,hot:'vec3(.8,1.,.3)'}),{uQ:Q[i],uK:Kk[i]},{mode:'solid'});
    const m=new THREE.Mesh(new THREE.ConeGeometry(0.22,1.4,10,6).rotateZ(-Math.PI/2),M); L.mesh.add(m); return m;});
  const sparks=[S.hitSpark(L.mesh,1.4,{seed:0.21}),S.hitSpark(L.mesh,1.7,{seed:0.63})];
  const ring=S.groundRing(L.decal,2.6), ring2=S.groundRing(L.decal,2.2);
  const stain=groundPlane(2.0,TX+0.1,0.024,S.mat(STAIN(lin(0x5a7a1a),.55),{},{mode:'matter'})); L.decal.add(stain);
  const streaks=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(`void main(){float x=vUv.x;float d=abs(vUv.y-.5)*2.;
   float m=smoothstep(1.,.2,d)*smoothstep(0.,.6,x)*smoothstep(1.,.95,x);float n=styNoise(vec2(x*3.-uT*4.,vUv.y)).r;
   gl_FragColor=vec4(styRamp(.4+.5*x)*1.1,m*uA*(.5+.5*n));}`,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const K=`const float TI=${f(TI)};const float T2=${f(T2)};const float TC=${f(TCr)};const vec3 HIT=${v3(TC)};`;
  // salpicadura corrosiva en cada golpe
  S.pts(L.part,24,VV+K+`void main(){float k=step(.5,aSeed.x);float s=(k<.5?TI:T2)+aSeed.y*.03;float life=.5+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.5,.6,0.));vec3 p=HIT+vec3(0.,k*-.3+.15,.2)+d*(1.8+aSeed.w)*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=3.14159;put(p,.22+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:ACID}));
  // vapor corrosivo
  S.pts(L.part,12,VV+K+`void main(){float s=TC+aSeed.x*.4;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HIT+vec3(rnd().x*.5,-.3+t*1.1,rnd().z*.4+.1);vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*.8:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.42+.18*aSeed.z)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:3,col:lin(0x8ab040),bias:-.06}));
  // las puntas: posiciones de reposo sobre el lanzador y punto de impacto de cada aguijón
  const REST=[V3(-3.55,2.45,0.35),V3(-3.95,2.2,-0.3)], HITP=[V3(3.0,1.35,0.25),V3(3.05,0.95,0.3)];
  const T0=[TI-0.22,T2-0.22], TH=[TI,T2], STP=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, i2=te-T2;
    sting.forEach((m,i)=>{
      const tf=T0[i], th=TH[i];
      let rot=0;
      if(te<tf){const g=ss(0.02+i*0.06,0.32+i*0.06,te);const wob=ss(TT,tf,te);
        tmp.copy(TP).lerp(REST[i],e3(g));tmp.x-=0.25*wob;tmp.y+=0.05*Math.sin(te*40)*wob;m.position.copy(tmp);
        aim(m,tmp2.copy(HITP[i]).sub(m.position));m.scale.setScalar(Math.max(g*1.35,0.001));}
      else if(te<th){const u=(te-tf)/(th-tf);tmp.copy(REST[i]);tmp.x-=0.25;m.position.lerpVectors(tmp,HITP[i],u*u);
        aim(m,tmp2.copy(HITP[i]).sub(tmp));m.position.addScaledVector(tmp2.normalize(),-0.35);m.scale.setScalar(1.35);}
      else{const d=tmp2.copy(HITP[i]).sub(tmp.copy(REST[i]).setX(REST[i].x-0.25)).normalize();m.position.copy(HITP[i]).addScaledVector(d,-0.35+0.12*e3((te-th)/0.06));
        aim(m,d);m.scale.setScalar(1.35);}
      Q[i].value=te<th+0.35?-0.1:-0.1+1.1*ss(th+0.35,th+0.75,te); Kk[i].value=0.3*hitE(te-th,9)+0.1*ss(TT,tf,te)*(te<th?1:0);
      m.visible=te>0.01&&te<th+0.8;
      // estela durante el vuelo
      const sm=streaks[i]; const fl=te>=tf&&te<th+0.1; sm.visible=fl;
      if(fl){const u=cl((te-tf)/(th-tf));tmp.copy(REST[i]).setX(REST[i].x-0.25);const tip=tmp2.lerpVectors(tmp,HITP[i],u*u);
        const len=Math.max(tip.distanceTo(tmp)*0.8,0.01);STP.copy(tip).lerp(tmp,0.45);
        towardCam(sm.position,STP,0.2);sm.rotation.set(0,0,Math.atan2(HITP[i].y-tmp.y,HITP[i].x-tmp.x));
        sm.scale.set(len,0.35,1);sm.material.uniforms.uA.value=1-ss(th,th+0.1,te);}
    });
    sparks[0].pose(ia,tmp.copy(HITP[0]).add(tmp2.set(0.1,0,0.2)),1.0);
    sparks[1].pose(i2,tmp.copy(HITP[1]).add(tmp2.set(0.1,0,0.2)),1.15);
    ring.pose(ia,TX,0,0.42,0.8); ring2.pose(i2,TX,0,0.42,0.9);
    set(stain,-0.1+1.1*ss(1.6,2.1,te),ss(TCr-0.1,TCr+0.1,te)); stain.visible=te>=TCr-0.1;
    const h1=hitE(ia,9), h2=hitE(i2,7);
    target.position.x=TX+0.14*h1+0.22*h2; target.rotation.z=-0.12*h1*Math.cos(ia*28)-0.18*h2*Math.cos(i2*20);
    target.scale.set(1+0.05*h2,1-0.07*h2,1+0.05*h2);
    o.em=0.25*h1+0.35*h2+0.2*win(te,TCr,TCr+0.1,1.6,1.9); o.emc.copy(U.uC1.value);
    if(i2<0){o.g.copy(TC);o.gs=te>=TI?1.3:0.5;o.ga=te>=TI?0.35*h1:0.06;o.li=te>=TI?4*h1:0.8;o.ia=ia;o.c.copy(TC);o.shake=0.5;o.dist=0.6;o.flash=0.6;}
    else{o.g.copy(TC);o.gs=1.4+3*i2;o.ga=Math.exp(-i2*10)*0.45;o.li=6*Math.exp(-i2*5);o.ia=i2;o.c.copy(TC);o.shake=0.8;o.dist=1;o.flash=0.7;}
  };
}},{zoneCaster:0.6,zoneTarget:1.2}));

// =====================================================================
// 7 · CENTIPEDE (1 PA) — un ciempiés de fuego (quitina carmesí, patas naranja) sale de la cola y corre ondulando por el
//     suelo hasta el rival; le muerde con las pinzas (corte y chispa) y le deja veneno; el rastro chamuscado se apaga.
//     Rápido y preciso. ti 0,42 s
// =====================================================================
defs.push(Object.assign({key:"sty_itCentipede",name:"Centipede (estilizado)",dur:1.3,ti:0.42,pal:P_CENTI,tier:1,stylized:true,
  phases:[["Salida",0],["Carrera",0.06],["Mordisco",0.42],["Rastro",0.6],["Fin",1.0]],
build(a){
  const L=a.L,TR=0.06,TI=0.42,TE=1.3;
  const Q={value:1},Kk={value:0};
  const segM=S.mat(SOLID(CHIT(CHITIN,'vUv.x*2.'),{rim:.35,hot:'vec3(1.,.45,.1)'}),{uQ:Q,uK:Kk},{mode:'solid'});
  const legM=S.mat(SOLID(`base=${ORANGE};`,{rim:.2,hot:'vec3(1.,.5,.1)'}),{uQ:Q,uK:Kk},{mode:'solid'});
  const N=11, segs=[];
  for(let i=0;i<N;i++){
    const g=new THREE.Group(); L.mesh.add(g);
    const r=i===0?0.2:0.17-0.006*i;
    const b=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),segM); b.scale.set(1.15,0.7,0.95); g.add(b);
    if(i===0){for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.3,6),legM);p.rotation.z=-Math.PI/2+0.2;p.rotation.y=s*0.5;p.position.set(0.24,-0.04,s*0.09);g.add(p);}}
    else for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.CapsuleGeometry(0.025,0.22,2,4),legM);l.position.set(0,-0.08,s*0.17);l.rotation.x=s*0.9;g.add(l);}
    segs.push(g);
  }
  const bite=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.5),S.mat(CLAW_FS,{uEr:{value:0}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.55}), ring=S.groundRing(L.decal,2.2);
  const trail=groundPlane(7.6,(CX+TX)/2,0.021,S.mat(`void main(){float x=vUv.x;float d=abs(vUv.y-.5+.08*sin(x*22.));
   float m=smoothstep(.16,.05,d)*smoothstep(0.,.05,x)*step(x,uP);if(m<.01)discard;float n=styNoise(vUv*vec2(16.,2.)).r;
   float hot=smoothstep(uP-.25,uP,x);gl_FragColor=vec4(mix(styRampOf(${SOOT},.2+.2*n),uC1*1.4,hot*.6),m*uA*.7);}`,{},{mode:'matter'}),1.0);
  L.decal.add(trail);
  const poison=S.status(a,'poison',[target],TI+0.05,TE);
  const K=`const float TR=${f(TR)};const float TI=${f(TI)};`;
  // chispas de fuego que suelta al correr
  S.pts(L.part,18,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=(s-TR)/(TI-TR);vec3 p=vec3(mix(-3.3,${f(TX-0.4)},u),.15+t*.9,(aSeed.z-.5)*.4);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=(aSeed.w-.5)*.4;put(p,(.26+.1*aSeed.w)*(1.-.4*age));}`,S.ENERGY_FS(C.flame,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    // cabeza: de la cola al rival; el cuerpo sigue el camino con retraso y ondula
    const path=(t,out)=>{const u=cl((t-TR)/(TI-TR));const x=-4.0+(TX-0.55+4.0)*u;
      return out.set(x,0.18,0.15+0.22*Math.sin(x*2.6-t*8)*(1-ss(TI-0.1,TI,t)));};
    segs.forEach((g,i)=>{
      const lag=i*0.03, t=te-lag;
      path(t,g.position); path(t-0.01,tmp);
      const d=tmp2.copy(g.position).sub(tmp); if(d.lengthSq()>1e-6)g.rotation.set(0,-Math.atan2(d.z,d.x),0);
      if(i===0&&ia>=0){g.position.y+=0.25*Math.sin(cl(ia/0.12)*Math.PI);}
      g.visible=t>=0.0&&te<TI+0.45;
      g.scale.setScalar(2.0*ss(0,0.05,t));
      // patas que caminan
      g.children.forEach((c,k)=>{if(k>0&&i>0)c.rotation.z=0.5*Math.sin(te*40+i*1.3+k*3.1);});
    });
    Q.value=te<TI+0.2?-0.1:-0.1+1.1*ss(TI+0.2,TI+0.45,te); Kk.value=0.03+0.3*hitE(ia,8);
    set(trail,ss(TR,TI,te)*0.97,1-ss(0.75,1.2,te));
    bite.forEach((m,k)=>{const u=ia-k*0.03;m.visible=u>=0&&u<0.3;towardCam(m.position,tmp.copy(TC).add(tmp2.set(-0.1,(k?-0.18:0.18),0.3)),0.4);
      billboard(m,k?0.55:-0.55);m.scale.set(0.5+0.6*e3(u/0.05),1,1);m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*ss(0.06,0.28,u);});
    spark.pose(ia,tmp.copy(TC).add(tmp2.set(-0.1,-0.1,0.3)),0.9); ring.pose(ia,TX,0,0.4,0.8);
    const pe=poison.pose(te);
    const h=hitE(ia,9);
    target.position.x=TX+0.16*h; target.rotation.z=-0.14*h*Math.cos(ia*26);
    o.em=0.3*h; o.emc.copy(U.uC1.value); S.statusGlow(o,[{kind:'poison',env:pe*0.8}]);
    if(ia<0){o.g.copy(segs[0].position);o.gs=0.6;o.ga=0.12;o.li=1.5;o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0.5;}
    else{o.g.copy(TC);o.gs=1.2+2.5*ia;o.ga=Math.exp(-ia*12)*0.4;o.li=5*Math.exp(-ia*6);o.ia=ia;o.c.copy(TC);o.shake=0.5;o.dist=0.6;o.flash=0.7;}
  };
}},{zoneCaster:0.5,zoneTarget:1.2}));

// =====================================================================
// 8 · SHIELD CRUSHER — esquirlas de élitro se juntan sobre el rival y forjan un mazo de escarabajo (cabeza de quitina
//     carmesí con bandas oscuras y cuerno de marfil); se alza, baja de golpe y rompe el escudo (esquirlas azules),
//     agrieta el suelo y lanza al rival hacia atrás. ti 0,95 s
// =====================================================================
defs.push(Object.assign({key:"sty_itShieldCrusher",name:"Shield Crusher (estilizado)",dur:2.2,ti:0.95,pal:P_CRUSH,tier:2,stylized:true,
  phases:[["Forja",0],["Alzada",0.38],["Descenso",0.75],["Impacto",0.95],["Esquirlas",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TF=0.0,TA=0.38,TD=0.75,TI=0.95,TS=1.2,TE=2.2;
  const Q={value:1},Kk={value:0};
  const headM=S.mat(SOLID(CHIT(CHITIN,'vUv.y*3.'),{rim:.35,hot:'vec3(1.,.4,.25)'}),{uQ:Q,uK:Kk},{mode:'solid'});
  const hornM=S.mat(SOLID(`base=mix(${IVORY},${lin(0x7a3a24)},smoothstep(.0,.6,1.-vUv.y)*.5);`,{rim:.25}),{uQ:Q,uK:Kk},{mode:'solid'});
  const shaftM=S.mat(SOLID(`base=mix(${DARK},${CHITIND},.5);`,{rim:.3}),{uQ:Q,uK:Kk},{mode:'solid'});
  const H=new THREE.Group(); L.mesh.add(H);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.46,20,14),headM); head.scale.set(1.2,1.0,0.95); H.add(head);
  const ridge=new THREE.Mesh(new THREE.TorusGeometry(0.46,0.05,6,24,Math.PI),shaftM); ridge.rotation.y=Math.PI/2; ridge.scale.set(1,1.0,1); H.add(ridge);
  const horn=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.75,10),hornM); horn.position.set(0.5,-0.32,0); horn.rotation.z=-2.4; H.add(horn);
  const horn2=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.45,10),hornM); horn2.position.set(-0.45,-0.3,0); horn2.rotation.z=2.5; H.add(horn2);
  const crack=groundPlane(3.0,TX,0.026,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float br=smoothstep(.06,0.,abs(fract(an/6.2832*6.+styNoise(vec2(r*.6,an)).r*.35)-.5)*r*2.2)*step(r,uP)*(1.-r*.5);
   float m=max(br,smoothstep(.3,.15,r)*.5);if(m<.02)discard;
   gl_FragColor=vec4(mix(${SOOT},uC1*1.4,br*smoothstep(.9,.2,r)*.7),m*uA);}`,{},{mode:'matter'})); L.decal.add(crack);
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.37}), ring=S.groundRing(L.decal,3.2), ring2=S.groundRing(L.decal,2.4);
  const K=`const float TA=${f(TA)};const float TI=${f(TI)};const float TS=${f(TS)};const vec3 HIT=${v3(TC)};const vec3 FORGE=vec3(${f(TX)},3.,0.);`;
  // esquirlas de élitro que se juntan para forjar el mazo
  S.pts(L.part,20,VV+K+`void main(){float s=aSeed.x*.18;float u=clamp((uT-s)/.25,0.,1.);vec3 st=FORGE+normalize(rnd())*(1.6+.6*aSeed.y);
   vec3 p=mix(st,FORGE+normalize(rnd())*.2,u*u);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=aSeed.w*6.28+uT*6.;put(p,.3+.1*aSeed.z);}`,
   S.MATTER_FS(C.shard,{relief:5,col:CHITIN}));
  // esquirlas azules del escudo roto
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.6,1.)+vec3(.2,.8,0.));vec3 p=HIT+d*(2.4+1.6*aSeed.z)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.26+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:5,col:BLUE,bias:.05}));
  // terrones y polvo
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.02+aSeed.x*.06;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(HIT.x,.2,0.)+vec3(cos(an),0.,sin(an)*.8)*(.5+1.2*(1.-exp(-t*5.)))+vec3(0.,t*(.4+.4*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.46+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    // mazo: se forja arriba, se alza (gira hacia atrás) y baja en arco sobre la cabeza del rival
    const g=ss(0.05,TA,te);
    let y,rz;
    if(te<TA){y=3.0;rz=0;}else if(te<TD){const u=ss(TA,TD,te);y=3.0+0.6*u;rz=0.9*u;}
    else if(te<TI){const u=(te-TD)/(TI-TD);y=3.6-(3.6-1.75)*u*u;rz=0.9-1.3*u*u;}
    else{y=1.75-0.12*Math.sin(cl(ia/0.12)*Math.PI);rz=-0.4;}
    H.position.set(TX-0.1,y+0.25,0.25); H.rotation.set(0,0,rz*0.6); H.scale.setScalar(Math.max(1.5*g,0.001));
    H.visible=te>0.05&&te<TI+0.8;
    Q.value=te<TI+0.3?1-1.1*ss(0.08,TA,te):-0.1+1.1*ss(TI+0.3,TI+0.75,te); Kk.value=0.05+0.15*ss(TA,TD,te)+0.5*hitE(ia,8);
    set(crack,ss(TI,TI+0.12,te),1-ss(1.6,2.15,te)); crack.visible=ia>=0;
    spark.pose(ia,tmp.copy(TC).add(tmp2.set(0,0.35,0.35)),1.2);
    ring.pose(ia,TX,0,0.5,1.0); ring2.pose(te-TS,TX,0,0.45,0.8);
    const h=hitE(ia,6);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.2*h*Math.cos(ia*14);
    target.scale.set(1+0.12*h,1-0.18*h,1+0.12*h);
    o.em=0.35*h; o.emc.setRGB(0.5,0.7,1);
    if(ia<0){o.g.copy(H.position);o.gs=0.9;o.ga=0.1*g;o.li=1.5*g;o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.6;}
    else{o.g.copy(TC);o.gs=1.8+3*ia;o.ga=Math.exp(-ia*10)*0.5;o.li=7*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1;o.dist=1;o.flash=0.8;}
  };
}},{zoneCaster:0.5,zoneTarget:1.3}));

// =====================================================================
// 9 · LEAF BUG (aliado, cura 45; carta de Bing y Pomodoro) — un insecto hoja espiritual (silueta de hoja con nervios
//     carmesí, patas finas y antenas, sin cara) salta de la cola y cruza en dos brincos hasta el aliado, se posa sobre él
//     y se deshace en un remolino de hojas (camuflaje); suben cruces de curación y un anillo verde. ti 0,95 s
// =====================================================================
defs.push(Object.assign({key:"sty_itLeafBug",name:"Leaf Bug (estilizado)",dur:2.3,ti:0.95,pal:P_LEAF,tier:2,stylized:true,receiver:'target',
  phases:[["Salto",0],["Brinco",0.15],["Aterrizaje",0.95],["Camuflaje",1.1],["Cura",1.35],["Fin",1.95]],
build(a){
  const L=a.L,TJ=0.15,TI=0.95,TC3=1.1,TH=1.35,TE=2.3;
  const Q={value:1},Kk={value:0};
  const leafM=S.mat(SOLID(`vec2 q=vUv-.5;float vein=smoothstep(.03,0.,abs(q.y))+smoothstep(.025,0.,abs(fract(q.x*6.+abs(q.y)*3.)-.5)-.46)*smoothstep(.45,.1,abs(q.y));
   base=mix(${lin(0x3e8a2a)},${LEAFD},smoothstep(.05,.45,abs(q.y)));base=mix(base,${lin(0x9a2030)},vein*.45);lb=-.06;`,{rim:.15,hot:'vec3(.5,1.,.4)',nzs:'vec2(2.,1.)'}),{uQ:Q,uK:Kk},{mode:'solid'});
  const legM=S.mat(SOLID(`base=${LEAFD};`,{rim:.2}),{uQ:Q,uK:Kk},{mode:'solid'});
  const B=new THREE.Group(); L.mesh.add(B);
  // cuerpo: hoja aplanada (esfera estirada) + segunda hoja pequeña (tórax); patas y antenas finas
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.36,20,12),leafM); body.scale.set(1.55,0.32,0.95); B.add(body);
  const thor=new THREE.Mesh(new THREE.SphereGeometry(0.15,14,10),leafM); thor.scale.set(1.4,0.5,0.8); thor.position.set(0.55,0.04,0); B.add(thor);
  const legs=[];
  for(let i=0;i<3;i++)for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.CapsuleGeometry(0.018,0.34,2,4),legM);
    l.position.set(0.35-i*0.28,-0.1,s*0.28);l.rotation.set(s*0.9,0,(i-1)*0.4);B.add(l);legs.push(l);}
  for(const s of [-1,1]){const an=new THREE.Mesh(new THREE.CapsuleGeometry(0.012,0.4,2,4),legM);an.position.set(0.82,0.12,s*0.08);an.rotation.set(s*0.5,0,-1.0);B.add(an);}
  const ring=S.groundRing(L.decal,2.8), ring2=S.groundRing(L.decal,3.4);
  const shadow=S.contactShadow(L.decal,1.1);
  const glyph=groundPlane(2.6,TX,0.025,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float lf=smoothstep(.05,0.,abs(r-.78))+smoothstep(.1,0.,abs(fract(an/6.2832*6.)-.5)*r*2.)*smoothstep(.75,.3,r)*step(.2,r);
   if(lf<.02)discard;float er=styErode(lf*.5+styNoise(vUv).r*.5,uP,.12);gl_FragColor=vec4(styRampOf(${HEALG},.55+.4*lf)*1.1,lf*er*uA*.85);}`,{},{mode:'energy'}));
  L.decal.add(glyph);
  const K=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TC=${f(TC3)};const float TH=${f(TH)};const vec3 AC=vec3(${f(TX)},0.,0.);`;
  // hojas que suelta en cada brinco y remolino de camuflaje alrededor del aliado
  S.pts(L.part,16,VV+K+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=(s-TJ)/(TI-TJ);vec3 p=vec3(mix(-3.6,${f(TX)},u),.6+1.6*sin(u*3.14159*2.)*.5+.6,(aSeed.z-.5)*.4)+vec3(0.,-t*1.2,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.24+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:4,col:LEAF}));
  S.pts(L.part,30,VV+K+`void main(){float s=TC+aSeed.x*.12;float t=uT-s;float an=aSeed.y*6.2832+t*(3.5+aSeed.z);float rad=.5+.55*(1.-exp(-max(t,0.)*4.))+.15*aSeed.w;
   vec3 p=AC+vec3(cos(an)*rad,.2+1.5*aSeed.z+t*.35,sin(an)*rad*.85);vA=(t>0.?smoothstep(0.,.1,t):0.)*(1.-smoothstep(1.85,2.2,uT));
   vK=smoothstep(1.6,2.2,uT);vR=an+1.5708;put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:4,col:lin(0x6ab840),bias:-.02}));
  // cruces de curación
  S.pts(L.part,10,VV+K+`void main(){float s=TH+aSeed.x*.35;float age=(uT-s)/.6;float an=aSeed.y*6.2832;
   vec3 p=AC+vec3(cos(an)*.5,.5+age*1.6,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.34+.1*aSeed.z);}`,PLUS_FS,{mode:'energy'});
  const J0=V3(-4.0,0.9,0.15), JM=V3(-0.6,0.35,0.3), J1=V3(TX-0.05,1.62,0.1);
  a.pose=function(te,o){
    const ia=te-TI;
    // dos brincos: cola → mitad del camino (toca el suelo) → lomo del aliado
    let vis=te>0.02&&te<TC3+0.25;
    const TM=TJ+(TI-TJ)*0.5;
    if(te<TJ){B.position.copy(J0);B.rotation.set(0,0,0.25*Math.sin(te*30));}
    else if(te<TM){const u=(te-TJ)/(TM-TJ);arcPt(J0,JM,1.4,u,B.position);B.rotation.set(0,0,-(u-0.5)*0.9);}
    else if(te<TI){const u=(te-TM)/(TI-TM);arcPt(JM,J1,1.5,u,B.position);B.rotation.set(0,0,-(u-0.5)*0.9);}
    else{B.position.copy(J1);B.position.y+=-0.08*hitE(ia,10);B.rotation.set(0,0,0);}
    B.visible=vis; B.scale.setScalar(Math.max(1.45*ss(0,0.12,te),0.001));
    legs.forEach((l,i)=>{l.rotation.z=((i>>1)-1)*0.4+(te<TI?0.4*Math.sin(te*18+i):0);});
    Q.value=te<TC3?-0.1:-0.1+1.1*ss(TC3,TC3+0.22,te); Kk.value=0.02+0.15*hitE(ia,7);
    shadow.pose(B.position.x,B.position.z,0.9,vis&&te<TI?0.35*cl(1.4-B.position.y*0.4):0);
    ring.pose(ia,TX,0,0.45,0.85); ring2.pose(te-TH,TX,0,0.6,1.0);
    set(glyph,-0.1+1.1*ss(1.8,2.25,te),ss(TH-0.1,TH+0.1,te)); glyph.visible=te>=TH-0.1; glyph.rotation.y=te*0.6;
    const sq=hitE(ia,8); target.scale.set(1+0.04*sq,1-0.05*sq,1+0.04*sq);
    o.em=0.45*win(te,TH-0.05,TH+0.15,1.85,2.2); o.emc.setRGB(0.45,1,0.5);
    o.g.set(TX,1.2,0); o.gs=1.0+0.8*ss(TC3,TH,te); o.ga=0.1+0.2*win(te,TH-0.05,TH+0.15,1.8,2.2); o.li=1.5+3*win(te,TH-0.05,TH+0.15,1.8,2.2);
    o.ia=ia; o.c.set(TX,1.0,0); o.shake=0; o.dist=0.2; o.flash=0.2;
  };
}},Z));

VFX.module("Estilizado · Bicho · Cola",defs);
})();

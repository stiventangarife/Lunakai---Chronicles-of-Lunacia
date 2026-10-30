// =====================================================================
// ESTILIZADO · BICHO · OJOS (Hito 101) — las 6 cartas de ojos de Bicho hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_ijBookworm, sty_ijKotaro, sty_ijNeo, sty_ijNerdy, sty_ijLadybugGoggles, sty_ijPacu).
// Mismos dur / ti / tiempos de fase que las originales. Semántica según PartCards.js:
//   Bookworm (sobre sí: +2 PA) · Kotaro (daño + Frágil) · Neo (Gafe: sin críticos) · Nerdy (sobre sí: limpia 1 estado, +1 PM)
//   Ladybug Goggles (sobre sí: Energizado si el rival tiene escudo) · Pacu (daño, +50 % si sangra)
// Dirección de arte: nada de globos oculares ni caras: la mirada es un destello de ojo compuesto (almendra de energía con
// facetas hexagonales) delante de la cara. Identidad de Bicho: quitina carmesí con contorno oscuro, más el acento de cada carta.
// Los colores fijos de los shaders van en espacio lineal (L3). Las tiras largas se construyen a lo largo completo (no se
// estiran con scale) para que el puente las deforme por el pasillo y no las mueva enteras.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_BOOK=pal("Sty Bicho · Pergamino",["#ffcf6a","#b42a22"]);
const P_KOTARO=pal("Sty Bicho · Sombra",["#ff4a5e","#3a0c1e"]);
const P_NEO=pal("Sty Bicho · Circuito",["#b8f03a","#c41e34"]);
const P_NERDY=pal("Sty Bicho · Cálculo",["#7fe0ff","#c42a3a"]);
const P_LADY=pal("Sty Bicho · Mariquita",["#ff5a3c","#8a0e12"]);
const P_PACU=pal("Sty Bicho · Pacú",["#ffa08c","#b0222c"]);

const L3=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const CRIM=L3("#c8182a"), CRIM_D=L3("#5a0814"), OUTL=L3("#1c060a"), GOLD=L3("#ffc23a"), GOLD_D=L3("#a85a08"),
  PARCH=L3("#f0d9a8"), PARCH_D=L3("#a8763c"), INK=L3("#4a0e12"), SHADOW=L3("#2a0c1c"), PLUM=L3("#5c1838"),
  LIME=L3("#a8e83a"), CYAN=L3("#5fd4f4"), DEBUFF=L3("#3c1e4e"), RED=L3("#d8261c"), BLACK=L3("#160608"),
  IVORY=L3("#e6dcbc"), SILVER=L3("#c9cfd8"), GUM=L3("#b8384a"), ENAMEL=L3("#e8e2cc"), WATER=L3("#9adcf0");

const CX=-3.7, TX=3.4;
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), RIGHT=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const FACE=V3(CX+0.26,1.62,0);

// ---------- piezas compartidas ----------
// destello de ojo compuesto: almendra de energía con facetas hexagonales y estela horizontal (sin globo ocular)
const GLINT=col=>`uniform float uQ;uniform float uK;
void main(){vec2 p=(vUv-.5)*2.;
 float w=.34*(1.-p.x*p.x)*(1.-uQ*.85);float alm=smoothstep(w+.05,w-.02,abs(p.y))*step(abs(p.x),1.);
 vec2 s=vec2(1.,1.732);vec2 hp=p*vec2(4.,4.);vec2 a=mod(hp,s)-s*.5;vec2 b=mod(hp-s*.5,s)-s*.5;vec2 g=dot(a,a)<dot(b,b)?a:b;
 float hd=max(dot(abs(g),vec2(.5,.866)),abs(g).x);float fac=smoothstep(.36,.5,hd)*alm;
 float core=smoothstep(w*.6,0.,abs(p.y))*smoothstep(.85,0.,abs(p.x+.1));
 float streak=exp(-abs(p.y)*28.)*smoothstep(1.,.15,abs(p.x))*(.55+.45*uK);
 float m=alm*.5+core*.9+streak*.8-fac*.25;
 if(m<.02)discard;vec3 c=styRampOf(${col},.38+.5*core)*(1.+.6*core*uK);
 gl_FragColor=vec4(c,min(m,1.)*uA);}`;
function mkEyes(L,fs,size=0.28){
  const ms=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size*1.9,size*0.95),S.mat(fs,{uQ:{value:0},uK:{value:0}},{mode:'energy',side:THREE.DoubleSide,depthTest:false}));
    m.renderOrder=3;L.mesh.add(m);return m;});
  return {pose(a,lid,k,sc=1,tilt=0){
    towardCam(tmp3,FACE,0.45);RIGHT.set(1,0,0).applyQuaternion(VFX.camera.quaternion);
    ms.forEach((m,i)=>{const sd=i?1:-1;m.position.copy(tmp3).addScaledVector(RIGHT,sd*0.16*sc);billboard(m,sd*tilt);
      m.scale.set(sd*Math.max(sc,0.001),Math.max(sc,0.001),1);m.visible=a>0.002;m.material.uniforms.uA.value=a;
      m.material.uniforms.uQ.value=lid;m.material.uniforms.uK.value=k;});
  }};
}
// mancha en el suelo (materia)
const STAIN=(col,alpha=.6,lo=.12,hi=.3)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},${f(lo)}+${f(hi)}*n),m*er*uA*${f(alpha)});}`;
// ficha de PA (partícula): rombo de quitina dorada con contorno oscuro y runa
const TOKEN_P=(col,dark)=>S.PV+`void main(){vec2 q=(styPC()-.5)*2.25;float d=abs(q.x)+abs(q.y)*.78-.8;float m=smoothstep(.06,-.02,d);if(m*vA<.05)discard;
 float rim=smoothstep(-.2,-.05,d);float rune=max(smoothstep(.1,.04,abs(q.x))*step(abs(q.y),.5),smoothstep(.1,.04,abs(q.y+.08))*step(abs(q.x),.28));
 vec3 c=mix(${col}*1.15,${dark},rim);c=mix(c,${dark},rune*.85);c+=${col}*.45*(1.-smoothstep(0.,.6,length(q-vec2(-.2,.28))));gl_FragColor=vec4(c,m*vA);}`;
// chevrón hacia arriba (partícula): materia con contorno oscuro
const CHEV_P=(col,dark)=>S.PV+`void main(){vec2 q=(gl_PointCoord-.5)*2.;q.y=-q.y;float d=abs(abs(q.x)*.9-(q.y+.15)*-1.+.0);
 float v=abs(q.y-(.35-abs(q.x)*.9))-.17;float m=smoothstep(.05,-.02,v)*step(abs(q.x),.85);if(m*vA<.05)discard;
 float rim=smoothstep(-.12,-.02,v);gl_FragColor=vec4(mix(${col}*1.1,${dark},rim),m*vA);}`;
// motita de energía redonda (para rayos y circuitos de puntos)
const DOT_E=(gain=1.)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float m=smoothstep(.5,.12,d);float a=m*vA;if(a<.01)discard;
 vec3 c=mix(uC2*.7,uC1,smoothstep(.45,.1,d))*${f(gain)};gl_FragColor=vec4(c,a);}`;
// píxel de datos (cuadrado nítido) en materia
const PIXEL_P=(col,dark)=>S.PV+`void main(){vec2 q=abs(styPC()-.5);float d=max(q.x,q.y);float m=smoothstep(.4,.36,d);if(m*vA<.05)discard;
 float er=styErode(styNoise(q+vMix).r,vK*1.05-.05,.06);if(er<.5)discard;gl_FragColor=vec4(mix(${col},${dark},smoothstep(.26,.36,d)),vA);}`;
const defs=[];

// =====================================================================
// 1 · BOOKWORM — un destello de ojo compuesto lee un pergamino rúnico que se desenrolla ante la cara; la lectura enciende
//     las runas una a una, que despegan y se funden en dos fichas de quitina dorada que entran en el pecho (+2 PA).
//     Nivel 1, ti 0,45 s
// =====================================================================
defs.push({key:"sty_ijBookworm",name:"Bookworm (estilizado)",dur:1.4,ti:0.45,pal:P_BOOK,tier:1,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Pergamino",0],["Lectura",0.12],["Revelación",0.45],["Disipación",0.9]],
build(a){
  const L=a.L,TL=0.12,TI=0.45,TE=1.4, SCR=V3(CX+1.35,1.85,0);
  const eyes=mkEyes(L,GLINT(L3("#ffb43a")));
  const scroll=new THREE.Mesh(new THREE.PlaneGeometry(1.7,0.62),S.mat(`uniform float uU;uniform float uRd;uniform float uQ;
  void main(){vec2 p=vUv;float hf=uU*.5;float dx=abs(p.x-.5);if(dx>hf+.035)discard;
   float roll=smoothstep(hf-.045,hf+.0,dx);
   float nz=styNoise(p*vec2(3.,1.2)+.3).r;if(styErode(nz,uQ,.08)<.5)discard;
   float ey=min(p.y,1.-p.y);if(ey<.04&&roll<.5)discard;
   vec3 c=styRampOf(${PARCH},.5+.25*nz-.18*abs(p.y-.5));
   float cell=floor(p.x*8.);vec2 q=vec2(fract(p.x*8.)-.5,(p.y-.5)*2.4);float h=fract(sin(cell*12.9+3.)*437.5);
   float s1=smoothstep(.08,.03,abs(q.x-(h-.5)*.4))*step(abs(q.y),.55);
   float s2=smoothstep(.08,.03,abs(q.y-(fract(h*7.)-.5)*.6))*step(abs(q.x),.3);
   float s3=smoothstep(.08,.03,abs(q.x+q.y*(fract(h*3.)-.5)))*step(abs(q.y),.45)*step(.35,fract(h*11.));
   float ink=min(s1+s2+s3,1.)*step(.1,p.x)*step(p.x,.9)*(1.-roll);
   float rd=step(p.x,uRd);c=mix(c,mix(${INK},${GOLD}*1.5,rd),ink);
   c=mix(c,styRampOf(${PARCH_D},.25+.45*abs(sin((dx-hf)*60.))),roll);
   c*=.6+.4*smoothstep(.04,.1,ey);
   gl_FragColor=vec4(c,uA);}`,{uU:{value:0},uRd:{value:0},uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide}));
  L.mesh.add(scroll);
  const seal=groundPlane(2.6,CX,0.026,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=styNoise(vUv*.9+.5).r;float ring=smoothstep(.05,0.,abs(r-.82-.03*n));float ring2=smoothstep(.03,0.,abs(r-.62))*step(.5,fract(an/6.2832*16.));
   float dia=smoothstep(.05,0.,abs(abs(p.x*2.)+abs(p.y*2.)*.78-.42));float m=max(max(ring,ring2*.8),dia*.9);if(m<.02)discard;
   float er=styErode(n,uP,.12);vec3 c=mix(styRampOf(${GOLD},.6+.2*n),styRampOf(${GOLD_D},.2),ring2);
   gl_FragColor=vec4(c,m*er*uA*.9);}`,{},{mode:'matter'})); L.decal.add(seal);
  const ring=S.groundRing(L.decal,2.6), flash=S.hitSpark(L.mesh,0.9,{seed:0.31,toCam:0.8});
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 SCR=${v3(SCR)};`;
  // runas leídas que despegan del pergamino y convergen sobre la cabeza
  S.pts(L.part,12,VV+K+`void main(){float i=floor(aSeed.x*12.);float px=(i+.5)/12.;float s=TL+px*(TI-TL);float u=clamp((uT-s)/(TI+.05-s),0.,1.);
   vec3 a0=SCR+vec3((px-.5)*1.45,0.,.05),a1=vec3(-3.6,2.55,0.);vec3 p=mix(a0,a1,u*u)+vec3(0.,.4*sin(u*3.14159),0.);
   vA=(uT>s&&u<.98)?1.:0.;vK=0.;vR=uT*3.+i;put(p,.34*(1.-.4*u));}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // dos fichas de quitina dorada (+2 PA)
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TI+i*.07;float u=clamp((uT-s)/.5,0.,1.);
   vec3 a0=vec3(-3.6+(i-.5)*.8,2.55,(i-.5)*.3),a1=vec3(-3.65,1.1,0.);float an=u*4.+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.55,.5*sin(u*3.14159),sin(an)*.45)*sin(u*3.14159);
   vA=(uT>s&&u<.97)?1.:0.;vK=0.;vR=sin(uT*8.+i)*.3;put(p,1.25*(1.-.25*u*u));}`,TOKEN_P(GOLD,GOLD_D),{mode:'matter',depthTest:false});
  // motas doradas al entrar
  S.pts(L.part,22,VV+K+`void main(){float s=TI+.4+aSeed.x*.4;float life=.5+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;vec3 p=vec3(-3.7+cos(an)*.6,.2+age*1.6,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.2+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(0.95,1.3,te);
    eyes.pose(ss(0,0.05,te)*(1-ss(0.5,0.75,te)),0.25,0.5+0.5*Math.sin(te*26),1+0.12*hitE(ia,8),-0.06);
    const un=e3(ss(0,TL,te)/1); scroll.visible=te<1.05; towardCam(scroll.position,SCR,0.5); billboard(scroll,0.04*Math.sin(te*5));
    scroll.material.uniforms.uU.value=Math.max(un,0.02)*(1-0.85*ss(TI+0.15,TI+0.45,te));
    scroll.material.uniforms.uRd.value=0.08+0.9*ss(TL,TI,te); scroll.material.uniforms.uQ.value=-0.1+1.15*ss(TI+0.3,1.0,te);
    scroll.material.uniforms.uA.value=1; scroll.scale.setScalar(1.35+0.15*un);
    flash.pose(ia,tmp.set(CX+0.1,2.5,0),0.8);
    ring.pose(ia-0.45,CX,0,0.5,1);
    seal.visible=ia>=0.3; seal.scale.setScalar(0.6+0.4*e3((ia-0.3)/0.15)); set(seal,-0.1+1.15*ss(0.65,0.95,ia),1);
    caster.rotation.z=0.05*ss(TL,TI,te)*(1-ss(TI,TI+0.2,te))-0.04*hitE(ia-0.45,9);
    caster.scale.y=1-0.05*hitE(ia-0.45,10);
    const pa=ss(TI+0.42,TI+0.5,te)*(1-ss(TI+0.55,TI+0.9,te)); glowOf(caster,U.uC1.value,0.7*pa);
    o.g.copy(SCR);o.gs=0.6+0.4*un;o.ga=0.06*un*fade;o.li=1.2+1.6*pa;
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 2 · KOTARO — la sombra gotea de los ojos y forma un charco a los pies; se hunde y corre como una mancha bajo el suelo,
//     emerge a la espalda del rival como dos guadañas de quitina negra con filo carmesí que cortan en X. Frágil.
//     Nivel 2, ti 0,95 s
// =====================================================================
defs.push({key:"sty_ijKotaro",name:"Kotaro (estilizado)",dur:2.2,ti:0.95,pal:P_KOTARO,tier:2,stylized:true,zoneCaster:0.5,zoneTarget:1.2,
  phases:[["Sombra",0],["Ninja",0.12],["Inmersión",0.42],["Emboscada",0.7],["Corte",0.95],["Frágil",1.1],["Fin",1.85]],
build(a){
  const L=a.L,TN=0.12,TS=0.42,TA=0.7,TI=0.95,TE=2.2, HP=V3(TX-0.15,1.2,0.05), EM=V3(TX+0.75,0,0.1);
  const eyes=mkEyes(L,GLINT(L3("#ff3a4e")));
  const PUD=(alpha)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+.2).r*.6+styNoise(vUv*.4).g*.4;
   float m=smoothstep(.8,.6,r+(n-.5)*.45);if(m<.02)discard;float rim=smoothstep(.45,.75,r+(n-.5)*.45);
   vec3 c=mix(styRampOf(${SHADOW},.12+.1*n),styRampOf(${CRIM},.45),rim*.55);gl_FragColor=vec4(c,m*uA*${f(alpha)});}`;
  const pudC=groundPlane(1.9,CX,0.025,S.mat(PUD(.9),{},{mode:'matter'})); L.decal.add(pudC);
  const pudT=groundPlane(2.0,EM.x,0.026,S.mat(PUD(.9),{},{mode:'matter'})); pudT.position.z=EM.z; L.decal.add(pudT);
  // mancha que corre bajo el suelo: tira a lo largo completo (el puente la deforma por el pasillo)
  const LEN=EM.x-CX;
  const streak=groundPlane(LEN,(CX+EM.x)/2,0.028,S.mat(`uniform float uH;void main(){float x=vUv.x;float y=(vUv.y-.5)*2.;
   float n=styNoise(vec2(x*6.,vUv.y*1.5)+.4).r;float head=uH;float body=smoothstep(head,head-.03,x)*smoothstep(head-.62,head-.1,x);
   float w=.95*(.6+.4*n)*body;float m=smoothstep(w,w-.15,abs(y))*body;float rimE=smoothstep(w-.22,w-.08,abs(y));if(m<.03)discard;
   vec3 c=mix(styRampOf(${SHADOW},.15+.1*n),styRampOf(${CRIM},.5),max(smoothstep(.2,.0,head-x)*.7,rimE*.8));gl_FragColor=vec4(c,m*uA*.95);}`,{uH:{value:0}},{mode:'matter'}),1.3);
  L.decal.add(streak);
  // guadañas: media luna de quitina negra con filo carmesí (materia)
  const BLADE=`uniform float uQ;uniform float uK;void main(){vec2 p=(vUv-.5)*2.;float d1=length(p)-.9;float d2=length(p-vec2(.42,.22))-.84;if(p.y<-.35)discard;float d=max(d1,-d2);
   if(d>.02)discard;float nz=styNoise(p*.8+.3).r;if(styErode(nz,uQ,.08)<.5)discard;
   float edge=smoothstep(-.09,0.,d1)*step(-d2,.2);float inner=smoothstep(-.06,0.,-d2);
   vec3 c=styRampOf(${SHADOW},.18+.15*(p.y*.5+.5));c=mix(c,styRampOf(${CRIM},.6),edge*.9);c=mix(c,${OUTL},smoothstep(-.03,.02,d)*(1.-edge)+inner*.5);
   c+=uC1*uK;gl_FragColor=vec4(c,uA);}`;
  const blades=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),S.mat(BLADE,{uQ:{value:-1},uK:{value:0}},{mode:'matter',side:THREE.DoubleSide}));L.mesh.add(m);return m;});
  // tajo en X (energía carmesí con borde oscuro)
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),S.mat(`uniform float uQ;void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<2;i++){float sg=float(i)*2.-1.;float t=p.x*sg*.8+p.y;float along=p.x*.8-p.y*sg*.4;float w=.11*(1.-along*along);
    m=max(m,smoothstep(w,w*.3,abs(t))*step(abs(along),.95));}
   float nz=styNoise(p*1.2+.5).r;if(m<.03||styErode(nz*.6+m*.4,uQ,.1)<.5)discard;
   gl_FragColor=vec4(styRamp(.45+.5*m)*1.2,m*uA);}`,{uQ:{value:0}},{mode:'energy',side:THREE.DoubleSide,depthTest:false}));
  L.mesh.add(slash);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.62}), ring=S.groundRing(L.decal,2.4);
  const fragile=S.status(a,'fragile',[target],TI+0.12,TE);
  const K=`const float TN=${f(TN)};const float TS=${f(TS)};const float TA=${f(TA)};const float TI=${f(TI)};const vec3 HP=${v3(HP)};const vec3 EM=${v3(EM)};const vec3 E0=vec3(${f(CX+0.42)},1.58,0.);`;
  // sombra que gotea de los ojos al charco
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*(TS-.1);float life=.32;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=E0+vec3(-.05,-.05,(aSeed.z-.5)*.3)+vec3(.15*t,-6.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.05)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.26+.06*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:PLUM,bias:-.05}));
  // humo de sombra al hundirse y al emerger
  S.pts(L.part,24,VV+K+`void main(){float k=step(.5,aSeed.z);float s=(k<.5?TS-.05:TA-.05)+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;
   vec3 base=k<.5?vec3(-3.7,.1,0.):EM+vec3(0.,.1,0.);vec3 p=base+vec3((aSeed.w-.5)*.9,age*1.4,(aSeed.y-.5)*.7);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.5+.2*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:SHADOW,bias:.05}));
  // esquirlas de quitina y gotas carmesí al corte
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.9,.5,0.))*(2.+1.6*aSeed.z);vec3 p=HP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.22+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:CRIM,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.05,te)*(1-ss(TS-0.05,TS+0.1,te)),0.4,0.6+0.4*Math.sin(te*30),1+0.1*hitE(te-TN,8),0.08);
    const pc=ss(0.08,TS,te)*(1-ss(TA-0.05,TA+0.15,te)); pudC.visible=pc>0.01; pudC.scale.setScalar(Math.max(0.3+0.7*pc,0.001)); pudC.material.uniforms.uA.value=pc;
    const hd=ss(TS,TA,te); streak.visible=te>TS&&te<TA+0.2; streak.material.uniforms.uH.value=hd*1.05; streak.material.uniforms.uA.value=1-ss(TA,TA+0.2,te);
    const pt=ss(TA-0.08,TA+0.08,te)*(1-ss(1.5,1.9,te)); pudT.visible=pt>0.01; pudT.scale.setScalar(Math.max(0.3+0.7*pt,0.001)); pudT.material.uniforms.uA.value=pt;
    // el lanzador se hunde en su charco y vuelve
    const dip=ss(TS-0.12,TS+0.05,te)*(1-ss(TI+0.4,TI+0.7,te));
    caster.scale.set(1+0.15*dip,Math.max(1-0.85*dip,0.05),1+0.15*dip); caster.position.y=-0.25*dip;
    // guadañas: emergen tras el rival, se alzan y cortan en X
    blades.forEach((m,i)=>{const sd=i?1:-1;const rise=back(ss(TA,TI-0.08,te));const cut=ss(TI-0.08,TI+0.04,te);
      tmp.set(EM.x-0.25*cut-0.15,0.2+1.3*rise,EM.z+sd*0.12); towardCam(m.position,tmp,0.5); RIGHT.set(1,0,0).applyQuaternion(VFX.camera.quaternion); m.position.addScaledVector(RIGHT,sd*0.42*(1-cut));
      billboard(m,sd*(0.5-1.2*cut)); const k=Math.max(rise*(1+0.15*hitE(ia,8)),0.001); m.scale.set(sd*k,k,1);
      m.visible=te>TA&&te<1.7; m.material.uniforms.uQ.value=-0.1+1.15*ss(1.25,1.65,te); m.material.uniforms.uK.value=0.35*hitE(ia,10);
      m.material.uniforms.uA.value=1;});
    slash.visible=ia>=0&&ia<0.4; towardCam(slash.position,HP,0.9); billboard(slash,0.1); slash.scale.setScalar(Math.max(0.6+0.5*e3(ia/0.06),0.001));
    slash.material.uniforms.uA.value=1; slash.material.uniforms.uQ.value=-0.1+1.1*ss(0.05,0.38,ia);
    spark.pose(ia,HP,1); ring.pose(ia,TX,0,0.45,1);
    const h=hitE(ia,8); target.position.x=TX-0.16*h*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=0.14*h; target.scale.set(1+0.05*h,1-0.07*h,1+0.05*h);
    const fe=fragile.pose(te); S.statusGlow(o,[{kind:'fragile',env:fe}]);
    o.em=Math.max(o.em||0,0.45*h); if(h>0.05)o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(EM.x,0.3,EM.z);o.gs=0.5+0.6*ss(TA,TI,te);o.ga=0.06;o.li=1+1.5*ss(TA,TI,te);o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(HP);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*8)*0.35;o.li=4*Math.exp(-ia*5);o.ia=ia;o.c.copy(HP);o.shake=0.5;o.dist=0.6;o.flash=0.3;}
  };
}});

// =====================================================================
// 3 · NEO — circuitos bioeléctricos lima suben por el caparazón hasta los ojos y disparan dos rayos finos; el circuito se
//     extiende por el rival y sobre su cabeza aparece la estrella de crítico, que se agrieta, se parte en dos y se
//     deshace en píxeles (Gafe: sin críticos). Nivel 1, ti 0,38 s
// =====================================================================
defs.push({key:"sty_ijNeo",name:"Neo (estilizado)",dur:1.3,ti:0.38,pal:P_NEO,tier:1,stylized:true,zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Circuitos",0],["Láser",0.2],["Impacto",0.38],["Anulación",0.6]],
build(a){
  const L=a.L,TL=0.2,TI=0.38,TN=0.6,TE=1.3, HP=V3(TX-0.3,1.25,0.04), ST=V3(TX,2.45,0);
  const eyes=mkEyes(L,GLINT(L3("#c0f040")));
  const star=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),S.mat(`uniform float uS;uniform float uK;uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float jag=.05*sin(p.x*22.)+.03*sin(p.x*41.);float sd=p.y-.35*p.x-jag;float side=sign(sd);
   vec2 n=normalize(vec2(-.35,1.));vec2 q=p-side*n*uS*.6-vec2(side*uS*.15,-uS*uS*.9);
   vec2 aq=abs(q);float d=min(min(aq.x*3.2+aq.y,aq.x+aq.y*3.2)-.82,aq.x+aq.y-.4);
   float m=smoothstep(.04,-.02,d);vec2 ap=abs(p);float dp=min(min(ap.x*3.2+ap.y,ap.x+ap.y*3.2)-.82,ap.x+ap.y-.4);
   float seam=smoothstep(.07,0.,abs(sd))*step(dp,0.)*uK*(1.-step(.02,uS));
   if(m<.02&&seam<.02)discard;if(styErode(styNoise(p*.7+.3).r,uQ,.1)<.5)discard;
   float rim=smoothstep(-.17,-.04,d);vec3 c=mix(styRampOf(${GOLD},.8-.3*length(q)),${OUTL},rim);
   c=mix(c,${CRIM}*2.2,seam);gl_FragColor=vec4(c,max(m,seam)*uA);}`,{uS:{value:0},uK:{value:0},uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide,depthTest:false}));
  star.renderOrder=3; L.mesh.add(star);
  const spark=S.hitSpark(L.mesh,0.9,{seed:0.48}), ring=S.groundRing(L.decal,2.0);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TN=${f(TN)};const vec3 HP=${v3(HP)};const vec3 ST=${v3(ST)};
  vec3 manh(vec3 A,vec3 B,float u){return u<.55?vec3(A.x,mix(A.y,B.y,u/.55),A.z):vec3(mix(A.x,B.x,(u-.55)/.45),B.y,mix(A.z,B.z,(u-.55)/.45));}`;
  // circuitos del caparazón: 6 trazos de puntos en escuadra de los pies a los ojos
  S.pts(L.part,72,VV+K+`void main(){float i=floor(aSeed.x*6.);float j=fract(aSeed.x*6.);float an=i*1.047+.4;
   vec3 A=vec3(-3.7+cos(an)*.48,.2+.15*fract(i*.37),sin(an)*.42),B=vec3(${f(CX+0.3)},1.62,(i-2.5)*.03);
   float head=(uT-i*.015)/TL;float u=head-j*.35;vec3 p=manh(A,B,clamp(u,0.,1.));
   vA=(u>0.&&u<1.)?(1.-j):0.;vA*=1.-smoothstep(TI,TI+.15,uT);vK=0.;vR=0.;put(p,.13*(1.-.5*j)+.03);}`,DOT_E(1.1),{mode:'energy'});
  // dos rayos finos de puntos densos de los ojos al pecho del rival
  S.pts(L.part,96,VV+K+`void main(){float i=floor(aSeed.x*2.);float j=fract(aSeed.x*2.);vec3 A=vec3(${f(CX+0.4)},1.64,(i-.5)*.2),B=HP+vec3(0.,0.,(i-.5)*.08);
   float head=clamp((uT-TL)/(TI-TL),0.,1.);vec3 p=mix(A,B,j);float on=step(j,head)*step(TL,uT)*(1.-smoothstep(TI+.02,TI+.16,uT));
   vA=on;vK=0.;vR=0.;put(p,.16+.08*smoothstep(head-.08,head,j));}`,DOT_E(1.2),{mode:'energy'});
  // el circuito se extiende por el rival (de la herida hacia abajo)
  S.pts(L.part,60,VV+K+`void main(){float i=floor(aSeed.x*5.);float j=fract(aSeed.x*5.);float an=i*1.26+2.;
   vec3 A=HP,B=vec3(${f(TX)}+cos(an)*.5,.15+.2*fract(i*.53),sin(an)*.45);
   float head=(uT-TI)/.22;float u=head-j*.4;vec3 p=mix(A,vec3(A.x,B.y,A.z),clamp(u/.5,0.,1.));if(u>.5)p=mix(vec3(A.x,B.y,A.z),B,clamp((u-.5)/.5,0.,1.));
   vA=(u>0.&&u<1.)?(1.-j):0.;vA*=1.-smoothstep(TN,TN+.25,uT);vK=0.;vR=0.;put(p,.12*(1.-.5*j)+.03);}`,DOT_E(1.0),{mode:'energy'});
  // píxeles de la estrella al deshacerse
  S.pts(L.part,30,VV+K+`void main(){float s=TN+.12+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=ST+vec3((aSeed.z-.5)*.8,(aSeed.w-.5)*.6,0.)+vec3((aSeed.z-.5)*.8*t,-1.6*t*t+.3*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=0.;put(p,.16+.08*aSeed.y);}`,PIXEL_P(LIME,L3("#2f5a0a")),{mode:'matter',depthTest:false});
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.05,te)*(1-ss(0.5,0.7,te)),0.35,0.5+0.5*ss(0.12,TL,te),1+0.15*hitE(te-TL,9),0);
    spark.pose(ia,HP,0.8); ring.pose(ia,TX,0,0.4,0.8);
    const sa=ss(TI,TI+0.08,te)*(1-ss(1.0,1.15,te)); star.visible=sa>0.01; towardCam(star.position,ST,0.4); billboard(star,0.05*Math.sin(te*9));
    star.scale.setScalar(Math.max(0.7+0.3*back(ss(TI,TI+0.12,te)),0.001)); star.material.uniforms.uA.value=sa;
    star.material.uniforms.uK.value=ss(TI+0.1,TN,te); star.material.uniforms.uS.value=ss(TN,TN+0.35,te);
    star.material.uniforms.uQ.value=-0.1+1.15*ss(TN+0.15,1.1,te);
    const h=hitE(ia,10); target.position.x=TX+0.1*h*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-0.08*h;
    const buzz=ss(TI,TI+0.05,te)*(1-ss(TN,TN+0.3,te)); target.position.z=0.02*Math.sin(te*90)*buzz;
    glowOf(caster,U.uC1.value,0.35*ss(0.05,TL,te)*(1-ss(TI,TI+0.2,te)));
    o.em=0.35*h+0.25*buzz; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(CX+0.4,1.6,0);o.gs=0.5;o.ga=0.06;o.li=1.2;o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.2;o.flash=0;}
    else{o.g.copy(HP);o.gs=0.8+ia;o.ga=Math.exp(-ia*9)*0.25;o.li=2.5*Math.exp(-ia*5);o.ia=ia;o.c.copy(HP);o.shake=0.3;o.dist=0.4;o.flash=0.15;}
  };
}});

// =====================================================================
// 4 · NERDY — un destello en los ojos dibuja en el aire un diagrama (círculo, triángulo inscrito, ángulo y parábola) hasta dar
//     con la solución: la sombra del estado se despega del lanzador y se deshace (limpieza) y un arco de pasos carmesí
//     barre los pies (+1 PM). Nivel 1, ti 0,36 s
// =====================================================================
defs.push({key:"sty_ijNerdy",name:"Nerdy (estilizado)",dur:1.25,ti:0.36,pal:P_NERDY,tier:1,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Destello",0],["Cálculo",0.08],["Solución",0.36],["Disipación",0.7]],
build(a){
  const L=a.L,TC=0.08,TI=0.36,TE=1.25, DG=V3(CX+1.05,1.85,0);
  const eyes=mkEyes(L,GLINT(L3("#5fd4f4")));
  const diag=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.45),S.mat(`uniform float uD;uniform float uF;uniform float uQ;
  float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);float w=.035;
   float pc=clamp(uD/.35,0.,1.);float circ=smoothstep(w,0.,abs(r-.72))*step(mod(an-1.5708+6.2832,6.2832),pc*6.2832);
   vec2 A=vec2(0.,.72),B=vec2(-.62,-.36),Cc=vec2(.62,-.36);float t1=clamp((uD-.3)/.15,0.,1.),t2=clamp((uD-.45)/.15,0.,1.),t3=clamp((uD-.6)/.15,0.,1.);
   float tri=max(max(smoothstep(w,0.,sdSeg(p,A,mix(A,B,t1)))*step(.001,t1),smoothstep(w,0.,sdSeg(p,B,mix(B,Cc,t2)))*step(.001,t2)),smoothstep(w,0.,sdSeg(p,Cc,mix(Cc,A,t3)))*step(.001,t3));
   float t4=clamp((uD-.75)/.25,0.,1.);float px=-.9+1.8*t4;float par=0.;for(int i=0;i<12;i++){float x0=-.9+1.8*float(i)/12.;float x1=x0+.15;if(x0<px){vec2 a0=vec2(x0,.55-.9*x0*x0),a1=vec2(x1,.55-.9*x1*x1);par=max(par,smoothstep(w*.8,0.,sdSeg(p,a0,a1))*step(.5,fract(float(i)*.5+.25)));}}
   float nodes=0.;nodes=max(nodes,smoothstep(.09,.05,length(p-A))*step(.3,uD));nodes=max(nodes,smoothstep(.09,.05,length(p-B))*step(.45,uD));nodes=max(nodes,smoothstep(.09,.05,length(p-Cc))*step(.6,uD));
   float sol=smoothstep(.12,.07,length(p-vec2(.0,-.06)))*uF;
   float m=max(max(circ,tri),par*.8);float nz=styNoise(p*.8+.2).r;
   if(m+nodes+sol<.03||styErode(nz,uQ,.1)<.5)discard;
   vec3 c=styRampOf(${CYAN},.55+.35*m)*(1.+.8*uF);c=mix(c,${CRIM}*1.6,max(nodes,sol));
   gl_FragColor=vec4(c,min(m+nodes+sol,1.)*uA);}`,{uD:{value:0},uF:{value:0},uQ:{value:-1}},{mode:'energy',side:THREE.DoubleSide,depthTest:false}));
  diag.renderOrder=2; L.mesh.add(diag);
  // arco de pasos carmesí a los pies (+1 PM)
  const steps=groundPlane(2.5,CX,0.03,S.mat(`uniform float uRot;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uRot;
   an=mod(an+3.14159,6.2832)-3.14159;float arc=smoothstep(.1,0.,abs(r-.8))*smoothstep(-1.8,0.,an)*smoothstep(.12,0.,an);
   float k=fract((an+3.14159)*1.3);float chev=smoothstep(.12,0.,abs(abs(r-.8)*2.-k*.5))*step(an,0.)*step(-1.6,an);
   float nz=styNoise(vec2(an*.6,r*2.)+.3).r;float m=max(arc*(.6+.5*nz),chev*.0);if(m<.03)discard;
   gl_FragColor=vec4(mix(styRampOf(${CRIM},.5+.3*nz),styRampOf(${CYAN},.7),.25),m*uA);}`,{uRot:{value:0}},{mode:'matter'}));
  L.decal.add(steps);
  const ring=S.groundRing(L.decal,2.4), flash=S.hitSpark(L.mesh,0.8,{seed:0.21,toCam:0.8});
  const K=`const float TC=${f(TC)};const float TI=${f(TI)};`;
  // sombra del estado: humo violeta oscuro pegado al cuerpo que, al resolver, se despega y se deshace
  S.pts(L.part,22,VV+K+`void main(){float an=aSeed.z*6.2832+uT*2.;float ph=aSeed.y;vec3 b=vec3(-3.7+cos(an)*.5,.35+ph*1.1,sin(an)*.42);
   float t=max(uT-TI-aSeed.x*.08,0.);vec3 p=b+vec3(-.6*t,2.2*t,0.)*(1.+aSeed.w);float age=t/.45;
   vA=(uT<TI)?smoothstep(0.,.1,uT):(age<1.?1.:0.);vK=uT<TI?.05:smoothstep(.0,1.,age);vR=aSeed.w*6.28+t*3.;put(p,(.42+.15*aSeed.w)*(1.+.6*t));}`,
   S.MATTER_FS(C.puff,{relief:4,col:DEBUFF,bias:-.02}));
  // chevrones de paso que avanzan a ras de suelo (+1 PM)
  S.pts(L.part,3,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+.12+i*.07;float u=clamp((uT-s)/.45,0.,1.);
   vec3 p=vec3(-3.7+.4+u*1.1,.18,(i-1.)*.32);vA=(uT>s&&u<1.)?sin(u*3.14159):0.;vK=0.;vR=0.;put(p,.55);}`,CHEV_P(CRIM,CRIM_D),{mode:'matter'});
  // motas cian de la solución
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.1;float life=.45+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=vec3(${f(DG.x)},${f(DG.y)},0.)+normalize(rnd())*(.2+.9*age);vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.w*6.28;put(p,.2);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.04,te)*(1-ss(0.45,0.65,te)),0.3,0.5+0.5*hitE(te-TC,10),1+0.15*hitE(te,12),0);
    diag.visible=te<0.95; towardCam(diag.position,DG,0.5); billboard(diag,0);
    diag.material.uniforms.uD.value=ss(TC,TI,te); diag.material.uniforms.uF.value=hitE(ia,7);
    diag.material.uniforms.uQ.value=-0.1+1.15*ss(TI+0.2,0.9,te); diag.material.uniforms.uA.value=ss(TC-0.04,TC+0.04,te);
    diag.scale.setScalar(Math.max(0.85+0.15*ss(TC,TC+0.1,te)+0.08*hitE(ia,9),0.001));
    flash.pose(ia,tmp.set(CX+0.1,1.2,0),0.9); ring.pose(ia,CX,0,0.45,1);
    const sw=ss(TI+0.05,TI+0.5,te); steps.visible=sw>0&&sw<1; steps.material.uniforms.uRot.value=sw*6.2832*0.9+1.4; steps.material.uniforms.uA.value=Math.sin(sw*Math.PI);
    caster.rotation.z=-0.05*ss(0,TC,te)*(1-ss(TI,TI+0.15,te))+0.04*hitE(ia,10);
    caster.scale.y=1+0.05*hitE(ia,9);
    glowOf(caster,U.uC1.value,0.6*hitE(ia,6));
    o.g.copy(DG);o.gs=0.6+0.4*ss(TC,TI,te);o.ga=0.06+0.2*hitE(ia,8);o.li=1.2+2*hitE(ia,6);
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 5 · LADYBUG GOGGLES — ante los ojos se ensambla una lente de mariquita (facetas hexagonales que llegan volando, rojo con
//     motas negras); un cono de luz roja barre el frente y se fija; la energía refluye por el cono y se abren tras el
//     lanzador dos élitros de mariquita: queda Energizado (chevrones dorados, motas). Nivel 3, ti 1,3 s
// =====================================================================
defs.push({key:"sty_ijLadybugGoggles",name:"Ladybug Goggles (estilizado)",dur:3.0,ti:1.3,pal:P_LADY,tier:3,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Lente",0],["Barrido",0.6],["Fijación",1.15],["Revelación",1.3],["Reflujo",1.5],["Fin",2.5]],
build(a){
  const L=a.L,TB=0.6,TF=1.15,TI=1.3,TR=1.5,TX2=2.5,TE=3.0, LENS=V3(CX+0.62,1.68,0.05), BACKP=V3(CX-0.1,1.85,0);
  const eyes=mkEyes(L,GLINT(L3("#ff4a2a")));
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),S.mat(`uniform float uAsm;uniform float uK;uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.)discard;
   vec2 s=vec2(1.,1.732);vec2 hp=p*4.2;vec2 a=mod(hp,s)-s*.5;vec2 b=mod(hp-s*.5,s)-s*.5;vec2 g=dot(a,a)<dot(b,b)?a:b;vec2 id=hp-g;
   float hd=max(dot(abs(g),vec2(.5,.866)),abs(g).x);float h=fract(sin(dot(id,vec2(12.9,78.2)))*43758.5);
   if(h*.8+r*.2>uAsm)discard;if(styErode(styNoise(p*.6+.4).r,uQ,.08)<.5)discard;
   vec3 n=normalize(vec3(p*.9,sqrt(max(1.-r*r*.81,0.))));float l=styLight(n,stySunV());
   float sp=0.;for(int i=0;i<5;i++){float fi=float(i);vec2 c=vec2(cos(fi*1.2566+.3),sin(fi*1.2566+.3))*.55;sp=max(sp,smoothstep(.21,.17,length(p-c)));}
   sp=max(sp,smoothstep(.05,.03,abs(p.x))*step(-.15,p.y));
   vec3 c=styRampOf(mix(${RED},${BLACK},sp),clamp(.25+.6*l,0.,1.))*styTint(l);
   c*=.72+.28*smoothstep(.5,.36,hd);c+=vec3(1.,.9,.85)*smoothstep(.22,.0,length(p-vec2(-.36,.42)))*.7;
   c=mix(c,${OUTL},smoothstep(.86,.97,r));c+=uC1*uK*.7;gl_FragColor=vec4(c,uA);}`,{uAsm:{value:0},uK:{value:0},uQ:{value:-1}},{mode:'matter',depthTest:false}));
  lens.renderOrder=3; L.mesh.add(lens);
  // cono de barrido (suelo, frente del lanzador)
  const cone=groundPlane(10,CX,0.03,S.mat(`uniform float uAng;uniform float uW;uniform float uLen;uniform float uF;void main(){vec2 p=(vUv-.5)*10.;float r=length(p);float an=atan(p.y,p.x)-uAng;
   float w=uW;float m=smoothstep(w,w*.55,abs(an))*smoothstep(.45,1.1,r)*smoothstep(uLen,uLen-1.2,r)*step(p.x,9.);
   float edge=smoothstep(.06,0.,abs(abs(an)-w*.8))*smoothstep(.45,1.1,r)*smoothstep(uLen,uLen-1.2,r);
   float nz=styNoise(vec2(r*.35,an*3.)+.2).r;float sc=.5+.5*sin(r*5.-uT*14.);m=m*(.35+.3*nz+.2*sc)+edge*.6;if(m<.03)discard;
   gl_FragColor=vec4(styRampOf(${RED},.45+.35*nz+.3*uF),min(m,1.)*uA*.55);}`,{uAng:{value:0},uW:{value:0.4},uLen:{value:4.5},uF:{value:0}},{mode:'matter'}));
  L.decal.add(cone);
  // élitros: dos alas de mariquita (rojo con motas negras) que se abren tras el lanzador
  const ELY=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.0),S.mat(`uniform float uOpen;uniform float uQ;uniform float uK;
  vec2 wq(vec2 p,float sd,float ang){vec2 q=p-vec2(0.,.62);float c=cos(ang*sd),s=sin(ang*sd);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);return (q-vec2(sd*.36,-.6))/vec2(.4,.7);}
  float shell(vec2 q,float sd){float d=length(q)-1.;return max(d,-(q.x*sd)-.82);}
  void main(){vec2 p=(vUv-.5)*vec2(2.6,2.);vec2 ql=wq(p,-1.,uOpen),qr=wq(p,1.,uOpen);float dl=shell(ql,-1.),dr=shell(qr,1.);
   float sd=dl<dr?-1.:1.;vec2 q=dl<dr?ql:qr;float d=min(dl,dr);if(d>.03)discard;if(styErode(styNoise(p*.7+.2).r,uQ,.08)<.5)discard;
   vec3 n=normalize(vec3(q.x*.85+sd*.25,q.y*.7,sqrt(max(1.-dot(q,q)*.5,.05))));float l=styLight(n,stySunV());
   float sp=max(smoothstep(.24,.19,length(q-vec2(sd*.1,.25))),smoothstep(.2,.15,length(q-vec2(sd*.25,-.4))));
   vec3 c=styRampOf(mix(${RED},${BLACK},sp),clamp(.18+.65*l,0.,1.))*styTint(l);
   float sheen=smoothstep(.16,.0,abs(q.x*sd+.35-q.y*.25))*smoothstep(-.9,.2,q.y)*smoothstep(.9,.3,q.y);c+=vec3(1.,.92,.88)*sheen*.55;
   c=mix(c,${OUTL},smoothstep(-.1,-.01,d));c+=uC1*uK*.5;gl_FragColor=vec4(c,uA);}`,{uOpen:{value:0},uQ:{value:-1},uK:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  L.mesh.add(ELY);
  const spark=S.hitSpark(L.mesh,1.2,{seed:0.74,toCam:0.8}), ring=S.groundRing(L.decal,3.2), ring2=S.groundRing(L.decal,4.4);
  const K=`const float TB=${f(TB)};const float TF=${f(TF)};const float TI=${f(TI)};const float TR=${f(TR)};const vec3 LENS=${v3(LENS)};`;
  // facetas que llegan volando a ensamblar la lente
  S.pts(L.part,24,VV+K+`void main(){float s=aSeed.x*.35;float u=clamp((uT-s)/.3,0.,1.);float an=aSeed.z*6.2832;
   vec3 a0=LENS+vec3(cos(an)*1.4,sin(an)*1.1+.3,(aSeed.w-.5)*1.2);vec3 p=mix(a0,LENS,u*u);
   vA=(uT>s&&u<.98)?1.:0.;vK=0.;vR=an+u*4.;put(p,.3*(1.-.5*u));}`,S.MATTER_FS(C.shard,{relief:3,col:RED,bias:-.05}),{mode:'matter',depthTest:false});
  // reflujo: energía que vuelve por el cono a la lente
  S.pts(L.part,40,VV+K+`void main(){float s=TR+aSeed.x*.35;float u=clamp((uT-s)/.32,0.,1.);float an=(aSeed.z-.5)*.24;float rd=1.2+aSeed.w*3.;
   vec3 a0=vec3(-3.7+cos(an)*rd,.2,sin(an)*rd);vec3 p=mix(a0,LENS,u*u*(3.-2.*u));vA=(uT>s&&u<.98)?1.:0.;vK=0.;vR=0.;put(p,.22*(1.-.4*u));}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // Energizado: chevrones dorados que suben y motas rojas
  S.pts(L.part,8,VV+K+`void main(){float s=TR+.2+aSeed.x*.9;float life=.6;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(-3.7+cos(an)*.55,.4+age*1.5,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.5);}`,CHEV_P(GOLD,GOLD_D),{mode:'matter'});
  S.pts(L.part,26,VV+K+`void main(){float s=TR+aSeed.x*1.;float life=.6+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;vec3 p=vec3(-3.7+cos(an)*.7,.15+age*1.8,sin(an)*.6);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.2+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR;
    eyes.pose(ss(0,0.05,te)*(1-ss(0.3,0.5,te)),0.3,0.6,1,0);
    const lv=ss(0.05,0.45,te); lens.visible=te<TX2; towardCam(lens.position,LENS,0.55); billboard(lens,0.15*Math.sin(te*2));
    lens.scale.setScalar(Math.max(0.85+0.15*back(lv)+0.1*hitE(ia,8),0.001));
    lens.material.uniforms.uAsm.value=lv*1.05; lens.material.uniforms.uA.value=1;
    lens.material.uniforms.uK.value=0.5*ss(TB,TF,te)*(0.6+0.4*Math.sin(te*20))+0.8*hitE(ia,6)+0.6*ss(TR,TR+0.3,te)*(1-ss(TR+0.4,TX2,te));
    lens.material.uniforms.uQ.value=-0.1+1.15*ss(TX2-0.4,TX2,te);
    // barrido: ±0,6 rad dos veces y se fija al frente
    const sweep=ss(TB,TF,te); cone.visible=te>TB-0.05&&te<TR+0.5;
    cone.material.uniforms.uAng.value=0.6*Math.sin(sweep*Math.PI*2)*(1-ss(TF-0.1,TF,te));
    cone.material.uniforms.uW.value=0.38-0.22*ss(TF-0.1,TI,te);
    cone.material.uniforms.uLen.value=1.5+3.5*ss(TB,TB+0.25,te);
    cone.material.uniforms.uF.value=0.8*hitE(ia,6);
    cone.material.uniforms.uA.value=ss(TB-0.05,TB+0.1,te)*(1-ss(TR+0.2,TR+0.5,te));
    spark.pose(ia,LENS,1); ring.pose(ia,CX,0,0.5,1); ring2.pose(ir,CX,0,0.6,1);
    // élitros
    const op=back(ss(TR,TR+0.25,te))*(1-ss(TX2-0.3,TX2+0.1,te)); ELY.visible=op>0.01||(te>TR&&te<TX2+0.4);
    towardCam(ELY.position,BACKP,-0.35); billboard(ELY,0.18*cl(op)); ELY.scale.setScalar(Math.max((0.8+0.6*cl(op))*0.75,0.001));
    ELY.material.uniforms.uOpen.value=0.1+0.75*cl(op)+0.04*Math.sin(te*9)*cl(op);
    ELY.material.uniforms.uQ.value=-0.1+1.15*ss(TX2,TX2+0.4,te); ELY.material.uniforms.uK.value=0.4*hitE(ir,5); ELY.material.uniforms.uA.value=1;
    caster.rotation.z=-0.05*ss(TB,TF,te)*Math.sin(te*6)+0.06*hitE(ia,8);
    caster.scale.set(1+0.05*hitE(ir,6),1+0.06*hitE(ir,6),1+0.05*hitE(ir,6));
    const en=ss(TR,TR+0.2,te)*(1-ss(TX2,TE,te)); glowOf(caster,U.uC1.value,0.25*en+0.6*hitE(ir,5));
    o.g.copy(LENS);o.gs=0.7+0.5*ss(TB,TI,te);o.ga=0.06+0.12*ss(TB,TF,te)*(1-ss(TR,TR+0.4,te));o.li=1.5+2.5*ss(TB,TI,te)*(1-ss(TR+0.3,TX2,te));
    o.ia=ia;o.c.set(CX,1,0);o.shake=ia>=0?0.6:0;o.dist=0.6;o.flash=0;
  };
}});

// =====================================================================
// 6 · PACU — sobre la cabeza del rival se abren dos arcos de mandíbula de pez pacú (encía coral, dientes planos casi humanos,
//     contorno oscuro) que se cierran de golpe, rechinan de lado a lado y sueltan esquirlas de esmalte, burbujas y chispas
//     carmesí (más daño si sangra). Nivel 1, ti 0,36 s
// =====================================================================
defs.push({key:"sty_ijPacu",name:"Pacu (estilizado)",dur:1.15,ti:0.36,pal:P_PACU,tier:1,stylized:true,zoneCaster:0.5,zoneTarget:1.2,
  phases:[["Apertura",0],["Mordisco",0.26],["Impacto",0.36],["Rechinar",0.4],["Disipación",0.62]],
build(a){
  const L=a.L,TM=0.26,TI=0.36,TG=0.4,TD=0.62,TE=1.15, BITE=V3(TX-0.05,1.25,0.05);
  const eyes=mkEyes(L,GLINT(L3("#ff7a6a")));
  const JAW=`uniform float uQ;uniform float uK;void main(){vec2 p=(vUv-.5)*vec2(2.,1.);vec2 c=vec2(0.,-.95);float r=length(p-c);float an=atan(p.x,p.y+.95);
   float R=1.24,tooth=1.0,inner=.92;float tap=1.-abs(an)/.82;if(tap<0.)discard;
   float w=(R-tooth)*(.35+.65*smoothstep(0.,.5,tap));float mid=tooth+(R-tooth)*.5;
   float nz=styNoise(vec2(an*2.,r*3.)+.2).r;float band=smoothstep(w*.5+.02,w*.5-.03,abs(r-mid)+(nz-.5)*.05);
   float k=an/1.64*8.+.5;float fk=abs(fract(k)-.5);float th=(1.-smoothstep(.34,.42,fk))*step(inner+.02*(1.-tap),r)*step(r,tooth+.01)*step(.12,tap);
   float m=max(band,th);if(m<.03)discard;if(styErode(nz*.6+tap*.4,uQ,.08)<.5)discard;
   float u=clamp((r-(mid-w*.5))/max(w,.01),0.,1.);
   vec2 sp=vec2(an*11.,u*3.);vec2 g=fract(sp)-.5;float scl=smoothstep(.06,0.,abs(length(g-vec2(0.,-.5))-.5))*band;
   float fin=smoothstep(.04,0.,abs(fract(an*6.+u*.8)-.5)-.44)*smoothstep(.6,1.,u)*band;
   vec3 col=mix(styRampOf(${SILVER},.55+.3*u),styRampOf(${CRIM},.45+.2*nz),smoothstep(.25,.85,u));
   col=mix(col,styRampOf(${CRIM_D},.3),scl*.5+fin*.4);
   if(band<.5)col=styRampOf(${IVORY},.6+.3*(r-inner)/.1);
   float e=band>.5?smoothstep(w*.5,w*.5-.04,abs(r-mid)):1.;col=mix(${OUTL},col,e*(band>.5?1.:smoothstep(.42,.36,fk)));
   col+=uC1*uK;gl_FragColor=vec4(col,uA);}`;
  const jaws=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,0.85),S.mat(JAW,{uQ:{value:-1},uK:{value:0}},{mode:'matter',side:THREE.DoubleSide,depthTest:false}));m.renderOrder=3;L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.15}), ring=S.groundRing(L.decal,2.2);
  const K=`const float TI=${f(TI)};const float TG=${f(TG)};const vec3 BITE=${v3(BITE)};`;
  // esquirlas de esmalte
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.2;float life=.38+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.3,0.))*(1.6+1.2*aSeed.z);vec3 p=BITE+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*10.;put(p,.18+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:ENAMEL,bias:.0}));
  // burbujas que suben
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.3;float life=.55+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=BITE+vec3((aSeed.z-.5)*.8,age*1.1,(aSeed.w-.5)*.5)+vec3(.08*sin(age*12.+aSeed.w*6.),0.,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=0.;put(p,.16+.1*aSeed.w);}`,S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
   float rim=smoothstep(.36,.46,d)*(1.-smoothstep(.46,.5,d));float hi=smoothstep(.12,.0,length(q-vec2(-.15,-.15)));float a=(rim*.9+hi+.12)*vA;if(a<.02)discard;
   gl_FragColor=vec4(mix(${WATER},vec3(1.),hi),a);}`);
  // salpicadura de agua al cerrar
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.1+aSeed.w),1.6+1.2*aSeed.y,sin(an)*.8)*.9;vec3 p=BITE+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.y-16.*t,length(v.xz))*-1.+1.5708;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:WATER,bias:.05}));
  // chispas carmesí (golpe con sangre)
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.3+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=BITE+normalize(rnd())*(.2+2.*t);vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.w*6.28;put(p,.24);}`,S.MATTER_FS(C.drop,{relief:3,col:CRIM,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    eyes.pose(ss(0,0.04,te)*(1-ss(0.35,0.55,te)),0.35,0.6,1+0.1*hitE(te-TM,10),0.05);
    const app=back(ss(0,TM,te)), cls=ss(TM,TI,te), grind=ss(TG,TD,te)*(1-ss(TD,TD+0.15,te));
    const gap=0.85*(1-cls)+0.12*cls*(1-ss(TD,TE,te))-0.06*hitE(ia,25);
    const side=0.1*Math.sin(te*55)*grind;
    jaws.forEach((m,i)=>{const sd=i?-1:1;tmp.set(BITE.x+side*sd,BITE.y+sd*(0.12+gap*0.5),BITE.z); towardCam(m.position,tmp,0.75);
      billboard(m,sd*0.08); const k=Math.max(app*(1+0.06*hitE(ia,9)),0.001); m.scale.set(k*1.15,sd*k*1.15,1);
      m.visible=te<TE-0.05; m.material.uniforms.uQ.value=-0.1+1.15*ss(TD,TE-0.1,te); m.material.uniforms.uK.value=0.3*hitE(ia,12); m.material.uniforms.uA.value=1;});
    spark.pose(ia,BITE,0.75); ring.pose(ia,TX,0,0.4,0.9);
    const h=hitE(ia,9); target.scale.set(1+0.1*h,1-0.18*h,1+0.1*h); target.position.x=TX+0.03*Math.sin(te*60)*grind;
    caster.rotation.z=-0.05*ss(0,TM,te)*(1-ss(TI,TI+0.2,te));
    o.em=0.35*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(BITE);o.gs=0.9*app;o.ga=0.1*app;o.li=1.5*app;o.ia=ia;o.c.copy(BITE);o.shake=0;o.dist=0.2;o.flash=0;}
    else{o.g.copy(BITE);o.gs=1+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.35;o.li=3.5*Math.exp(-ia*6);o.ia=ia;o.c.copy(BITE);o.shake=0.3;o.dist=0.4;o.flash=0.2;}
  };
}});

VFX.module("Estilizado · Bicho · Ojos",defs);
})();

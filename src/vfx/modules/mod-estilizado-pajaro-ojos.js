// =====================================================================
// ESTILIZADO · PÁJARO · OJOS (Hito 101) — las 6 cartas de ojos de Pájaro hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_bjLittleOwl, sty_bjLucas…). Mismos dur / ti que las originales, así el daño llega igual.
// Identidad de clase: plumas pintadas con luz en 3 bandas, aves espíritu con silueta y contorno, viento y luz de cielo.
// Las miradas nacen de los ojos del lanzador (≈ (-3.47,1.66,0)). Semántica según PartCards.js:
//   Little Owl (daño a distancia) · Lucas (sobre sí: +PA) · Concentrate (sobre sí: +20 % de daño, 3 turnos)
//   Passion (sobre sí: escudo + 2 PM; Bing y Pomodoro) · Mavis (sobre sí: +2 PA) · Robin (enemigo: 2 golpes)
// Cambio de concepto: Robin era un escudo sobre un aliado en el módulo antiguo; la carta hoy da 2 golpes a un enemigo,
// así que son dos petirrojos que bajan en picado uno tras otro. Lucas (antes retícula sobre el rival) hoy da PA al lanzador.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_OWL=pal("Sty Pájaro · Búho",["#ffc75a","#3d3f96"]);
const P_HAWK=pal("Sty Pájaro · Halcón",["#ffd65a","#b4531a"]);
const P_SUN=pal("Sty Pájaro · Sol",["#ffe07a","#e0582a"]);
const P_PASSION=pal("Sty Pájaro · Pasión",["#ff8cc0","#c0155a"]);
const P_SPARROW=pal("Sty Pájaro · Gorrión",["#ffb8dc","#6c3fb8"]);
const P_ROBIN=pal("Sty Pájaro · Petirrojo",["#ff9a48","#8a321a"]);

const CX=-3.7, TX=3.4, EYE=V3(-3.45,1.68,0.12), HD=V3(3.2,1.55,0.12), TC=V3(3.15,1.15,0.1);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const bez=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};

// ---------- colores de materia (fijos) ----------
const INDIGO="vec3(.2,.2,.52)", LAVEN="vec3(.62,.58,.9)", AMBER="vec3(1.,.7,.2)", GOLD="vec3(1.,.76,.26)", CREAM="vec3(.96,.9,.74)",
  ROBINB="vec3(.42,.3,.24)", ROBINR="vec3(.98,.42,.14)", SPARB="vec3(.55,.36,.24)", PINK="vec3(1.,.45,.7)", ROSE="vec3(.85,.12,.4)",
  VIOLET="vec3(.42,.22,.78)", RED="vec3(.95,.25,.12)";

// ---------- pluma pintada (partícula): cálamo, raquis curvo y vexilo asimétrico; luz en bandas a lo ancho ----------
const FEATHER_GLSL=`float feather(vec2 q,out float rach){
 float u=(q.x+.47)/.94;rach=0.;if(u<0.||u>1.)return 0.;
 float y=q.y-.07*u*u+.02*u;float ay=abs(y);
 float t=clamp((u-.13)/.87,0.,1.);float prof=pow(sin(3.14159*pow(t,.7)),.75);
 float w=(y>0.?.2:.12)*prof;
 float vane=smoothstep(w,w-.022,ay)*step(.13,u);
 float k=ay/max(w,.001);
 float n=fract((u-ay*1.45)*2.6+.35);float split=mix(1.,smoothstep(0.,.05,n)*smoothstep(1.,.95,n),step(.5,k)*step(0.,y));
 rach=smoothstep(.02*(1.-.55*u)+.003,.003,ay)*step(.0,u)*step(u,.97);
 return max(vane*split,rach);}`;
const FEATH=(dark,light,{energy=false,gain=1.5}={})=>S.PV+FEATHER_GLSL+`
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 q.y/=max(abs(cos(vR*1.3+vMix*5.)),.58);float r;float m=feather(q,r);if(m<.02)discard;
 float u=(q.x+.47)/.94;
 float er=styErode(m*.45+styNoise(q*.5+vMix*3.).r*.55,vK*1.05-.05,.08);float a=er*smoothstep(.0,.12,m)*vA;if(a<.02)discard;
 ${energy?`vec3 col=mix(${dark},${light},.25+.75*u)*${f(gain)}+vec3(1.,.9,.8)*r*.35;`:
 `float y=q.y-.07*u*u;float l=styLight(normalize(vec3(0.,-y*5.,1.)),stySunV());vec3 base=mix(${dark},${light},.08+.45*u+.15*vMix);
 vec3 col=styRampOf(base,clamp(.2+.55*l,0.,1.))*styTint(l);col=mix(col,${light},r*.45);`}
 gl_FragColor=vec4(col,a);}`;

// ---------- ave espíritu (plano en billboard): silueta SDF con relieve, luz en bandas y contorno oscuro ----------
// bird(p, ala, apertura, cola, penachos, cabeza); paint fija base (color), hot (brillo propio)
const BIRD_GLSL=`float sdTap(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdEl(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
float bird(vec2 p,float fl,float sp,float tf,float tu,float hs){vec2 q=vec2(abs(p.x),p.y);
 float d=smin(sdEl(q-vec2(0.,-.06),vec2(.16,.25)),length(q-vec2(0.,.22))-hs,.07);
 d=min(d,sdTap(q,vec2(.07,.3),vec2(.14,.3+.16*tu),.045,.0)+(1.-step(.01,tu)));
 d=smin(d,sdTap(q,vec2(0.,-.22),vec2(.05+.09*tf,-.47-.03*tf),.06,.025),.04);
 vec2 R=vec2(.11,.07);
 for(int i=0;i<4;i++){float fi=float(i);float an=mix(-1.75-fi*.1,fl+.3-fi*.26,sp);float L=mix(.26,.56-fi*.05,sp);
  d=smin(d,sdTap(q,R,R+vec2(cos(an),sin(an))*L,.085-fi*.012,.016),.035);}
 return d;}`;
const BIRD_FS=(paint,{tu='0.',hs='.16',tf='.5'}={})=>BIRD_GLSL+`uniform float uQ;uniform float uR;uniform float uEr;uniform float uGlow;
float B(vec2 p){return bird(p,uQ,uR,${tf},${tu},${hs});}
void main(){vec2 p=(vUv-.5)*2.;float d=B(p);if(d>.04)discard;
 vec2 e=vec2(.016,0.);vec2 g=vec2(B(p+e.xy)-B(p-e.xy),B(p+e.yx)-B(p-e.yx))/.032;
 float inner=clamp(-d*6.,0.,1.);vec3 n=normalize(vec3(g*(1.-inner)*1.3,.3+inner));
 float l=styLight(n,stySunV());
 vec3 base=vec3(.5);vec3 hot=vec3(0.);float hk=0.;${paint}
 vec3 c=styRampOf(base,clamp(.22+.56*l,0.,1.))*styTint(l);
 float ol=smoothstep(-.04,-.012,d);c=mix(c,base*.2,ol*.9);
 c=mix(c,hot*1.6,hk*uGlow);
 float nz=styNoise(p*.35+.5).r;float er=styErode(nz*.7+inner*.3,uEr,.08);
 float a=smoothstep(.04,.022,d)*er*uA;if(a<.02)discard;
 gl_FragColor=vec4(c,a);}`;
const birdMesh=(parent,size,paint,o)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),
  S.mat(BIRD_FS(paint,o),{uQ:{value:0.4},uR:{value:1},uEr:{value:-0.1},uGlow:{value:1}},{mode:'matter',side:THREE.DoubleSide}));parent.add(m);return m;};
// pinturas de cada ave (p en −1..1, cabeza arriba)
const OWL_PAINT=`base=mix(${INDIGO},${LAVEN},smoothstep(-.4,.35,p.y)*.55);
 float belly=smoothstep(.02,-.03,sdEl(p-vec2(0.,-.06),vec2(.1,.17)));base=mix(base,${CREAM}*.85,belly*.75);
 float ey=smoothstep(.06,.035,min(length(p-vec2(.075,.235)),length(p-vec2(-.075,.235))));
 float pu=smoothstep(.025,.012,min(length(p-vec2(.075,.235)),length(p-vec2(-.075,.235))));
 base=mix(base,${AMBER},ey);base=mix(base,vec3(.05),pu);hot=${AMBER};hk=ey*(1.-pu);`;
const ROBIN_PAINT=`base=mix(${ROBINB},vec3(.6,.48,.4),smoothstep(-.3,.4,p.y)*.4);
 float br=smoothstep(.02,-.03,sdEl(p-vec2(0.,-.02),vec2(.12,.15)));base=mix(base,${ROBINR},br);
 float ey=smoothstep(.03,.015,min(length(p-vec2(.06,.25)),length(p-vec2(-.06,.25))));base=mix(base,vec3(.04),ey);
 hot=${ROBINR};hk=br*.35;`;
const SPARROW_PAINT=`base=mix(${SPARB},vec3(.78,.6,.42),smoothstep(-.3,.4,p.y)*.5);
 float bl=smoothstep(.02,-.03,sdEl(p-vec2(0.,-.07),vec2(.1,.15)));base=mix(base,${CREAM},bl*.85);
 float ck=smoothstep(.05,.02,min(length(p-vec2(.11,.19)),length(p-vec2(-.11,.19))));base=mix(base,${PINK},ck);
 float ey=smoothstep(.03,.015,min(length(p-vec2(.06,.25)),length(p-vec2(-.06,.25))));base=mix(base,vec3(.04),ey);
 hot=${PINK};hk=ck;`;

// ---------- piezas compartidas ----------
// sello de pincel en el suelo con un dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.85);}`;
// chevrón hacia arriba (potenciar daño), materia con borde oscuro
const CHEV_UP=(col)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.1+abs(q.x)*.9);
 float out_=smoothstep(.13,.09,d)*step(abs(q.x),.38);float in_=smoothstep(.08,.05,d)*step(abs(q.x),.34);
 float a=out_*vA;if(a<.02)discard;vec3 c=mix(${col}*.3,styRampOf(${col},.8+.2*step(y,.1-abs(q.x)*.9)),in_);
 gl_FragColor=vec4(c,a);}`;
// orbe de recurso (PA dorado): núcleo caliente con anillo
const ORB_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float r=length(q)*2.;if(r>1.)discard;
 float core=smoothstep(.55,.2,r);float ring=smoothstep(.12,0.,abs(r-.78));
 float a=(core+ring*.8+smoothstep(1.,.5,r)*.25)*vA;if(a<.02)discard;
 gl_FragColor=vec4(mix(vec3(1.,.62,.14),vec3(1.,.95,.7),core)*1.7,a);}`;
// mirada de búho/halcón en los ojos: dos iris con pupila, brillo y ceja de plumas; uO = apertura, uK = brillo
const EYES_FS=(iris,rim)=>`uniform float uO;uniform float uK;
void main(){vec2 p=(vUv-.5)*2.;vec2 q=vec2(abs(p.x)-.4,p.y);q.y/=max(uO,.04);
 float r=length(q);float disc=smoothstep(.33,.3,r);float rimL=smoothstep(.37,.34,r)-disc;
 vec2 bq=vec2(abs(p.x),p.y);float brow=smoothstep(.07,.04,abs(bq.y-(.38+.42*(bq.x-.05))))*step(.05,bq.x)*step(bq.x,.8)*step(.3,uO);
 float m=max(disc+rimL,brow);if(m<.02)discard;
 float pu=smoothstep(.15,.12,r);float hl=smoothstep(.07,.04,length(q-vec2(-.09,.1)));
 vec3 c=mix(${iris}*.75,${iris}*1.25,smoothstep(.3,0.,r))*(1.+uK);c=mix(c,vec3(.04),pu);c=mix(c,vec3(1.),hl);
 c=mix(c,${rim}*.6,max(rimL,brow));
 gl_FragColor=vec4(c,m*uA);}`;
const defs=[];

// =====================================================================
// 1 · LITTLE OWL (EYES) — los ojos ámbar de un búho se abren en la mirada; las plumas se juntan en un búho espíritu
//     índigo (penachos, ojos que brillan) que remonta por encima de la línea de visión y cae en picado sobre la cabeza
//     del rival: chispa ámbar, estallido de plumas y anillo. ti 0,92 s
// =====================================================================
defs.push({key:"sty_bjLittleOwl",name:"Little Owl · Eyes (estilizado)",dur:2.0,ti:0.92,pal:P_OWL,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Mirada",0],["Plumas",0.18],["Vuelo",0.4],["Picada",0.78],["Impacto",0.92],["Fin",1.45]],
build(a){
  const L=a.L,TO=0.18,TF=0.4,TP=0.78,TI=0.92;
  const P0=V3(-3.3,2.15,0.1),P1=V3(-0.4,3.9,0.6),P2=HD.clone();
  const eyes=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.72),S.mat(EYES_FS(AMBER,INDIGO),{uO:{value:0},uK:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(eyes);
  const owl=birdMesh(L.mesh,2.6,OWL_PAINT,{tu:'1.',hs:'.2',tf:'.6'});
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.41}), ring=S.groundRing(L.decal,3.0), shadow=S.contactShadow(L.decal,1.0);
  const K=`const float TO=${f(TO)};const float TF=${f(TF)};const float TP=${f(TP)};const float TI=${f(TI)};
  const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 EYE=${v3(EYE)};
  vec3 bz(float t){float u=1.-t;return u*u*P0+2.*u*t*P1+t*t*P2;}
  float fu(float t){float k=clamp((t-TF)/(TI-TF),0.,1.);return pow(k,1.5);}`;
  // plumas que se juntan en el búho (desde los ojos y el aire)
  S.pts(L.part,22,VV+K+`void main(){float s=TO+aSeed.x*.12;float k=clamp((uT-s)/.18,0.,1.);
   vec3 a0=EYE+normalize(rnd()+vec3(0.,.4,0.))*(.9+.4*aSeed.z);vec3 p=mix(a0,P0,k*k*(3.-2.*k));
   vA=(uT>s&&k<1.)?1.:0.;vK=smoothstep(.75,1.,k);vR=aSeed.y*6.28+k*4.;put(p,(.55+.15*aSeed.w)*(1.-.4*k));}`,FEATH(INDIGO,LAVEN));
  // estela de plumas que caen tras el búho
  S.pts(L.part,26,VV+K+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz(fu(s))+rnd()*vec3(.15,.12,.15)+vec3(sin(t*4.+aSeed.w*9.)*.15,-.7*t,0.);
   vA=(age>0.&&age<1.&&p.y>.05)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+sin(t*4.)*1.2;put(p,.5+.15*aSeed.w);}`,FEATH(INDIGO,LAVEN));
  // estallido de plumas y motas ámbar en el impacto
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.35,0.))*(2.2+2.6*aSeed.z);vec3 p=P2+v*(1.-exp(-t*4.))/4.+vec3(0.,-.55*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*(4.+4.*aSeed.y);put(p,.6+.18*aSeed.w);}`,FEATH(INDIGO,LAVEN));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P2+normalize(rnd()+vec3(.3,.2,0.))*(.3+2.2*t);vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=aSeed.y*6.28;put(p,.24*(1.-.5*age));}`,
   S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // polvo de plumón en el suelo
  S.pts(L.part,10,VV+K+`void main(){float s=TI+.03+aSeed.x*.08;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(P2.x,.15,0.)+vec3(cos(an),0.,sin(an)*.8)*(.3+.7*(1.-exp(-t*5.)))+vec3(0.,.1+t*.4,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.18*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:LAVEN,bias:-.05}));
  const ou=owl.material.uniforms, eu=eyes.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    // ojos del búho en la mirada del lanzador
    const eo=ss(0,TO,te)*(1-ss(TF+0.05,TF+0.25,te));
    towardCam(eyes.position,EYE,0.4); billboard(eyes); eyes.visible=eo>0.001; eyes.scale.setScalar(0.8+0.3*ss(0,TO,te));
    eu.uO.value=e3(te/TO)*(1-0.85*ss(TO+0.05,TO+0.1,te)*(1-ss(TO+0.1,TO+0.16,te))); eu.uK.value=0.4*ss(TO,TF,te); set(eyes,0,eo);
    // búho: se forma (TO..TF), vuela (TF..TI) y se deshace tras el golpe
    const form=ss(TO+0.05,TF,te), k=cl((te-TF)/(TI-TF)), u=Math.pow(k,1.5);
    if(te<TF){owl.position.copy(P0);}
    else if(ia<0){bez(P0,P1,P2,u,owl.position);}
    else{owl.position.copy(P2).add(tmp.set(0.35*e3(ia/0.25),0.25*e3(ia/0.25),0));}
    bez(P0,P1,P2,Math.min(u+0.03,1),tmp2); const dx=tmp2.x-owl.position.x, dy=tmp2.y-owl.position.y;
    const roll=te<TF?0:ia<0?-0.55*Math.atan2(dy,Math.abs(dx)+1e-4):0.3;
    billboard(owl,roll); owl.visible=form>0.001&&ia<0.3;
    owl.scale.setScalar(Math.max(form*(1+0.15*ss(TP,TI,te)),0.001));
    ou.uQ.value=te<TP?0.35+0.7*Math.sin(te*26):-0.2; ou.uR.value=te<TF?0.6+0.4*form:1-0.55*ss(TP,TI,te);
    ou.uEr.value=ia<0?-0.1+0.9*(1-form):-0.1+1.1*ss(0,0.28,ia); ou.uGlow.value=0.6+0.8*ss(TP,TI,te); owl.material.uniforms.uA.value=1;
    shadow.pose(owl.position.x,owl.position.z,0.5+0.3/(1+owl.position.y),ia<0.2&&te>TF?0.45*cl(1.4-owl.position.y*0.25):0);
    spark.pose(ia,tmp3.copy(HD).add(tmp.set(-0.1,-0.1,0)),1.1);
    ring.pose(ia,TX-0.1,0,0.45,1);
    const h=hitE(ia,6);
    target.position.x=TX+0.28*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.22*h*Math.cos(ia*13);
    target.scale.set(1+0.04*h,1-0.06*h,1+0.04*h);
    o.em=0.35*h; o.emc.copy(U.uC1.value);
    if(te<TF){o.g.copy(EYE);o.gs=0.5+0.4*eo;o.ga=0.15*eo;o.li=1.2*eo;}
    else if(ia<0){o.g.copy(owl.position);o.gs=0.7;o.ga=0.15+0.15*ss(TP,TI,te);o.li=1.5+2*ss(TP,TI,te);}
    else{o.g.copy(HD);o.gs=1.2+2.5*Math.min(ia,0.5);o.ga=0.45*Math.exp(-ia*9);o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HD);o.shake=0;o.dist=0.6;o.flash=0.7;
  };
}});

// =====================================================================
// 2 · LUCAS — mirada de halcón: los ojos dorados destellan, una corona de plumas de halcón se abre alrededor de la cabeza
//     y se clava de golpe en el lanzador; dos orbes de PA dorados suben y se funden con él (nivel 1, rápido). ti 0,36 s
// =====================================================================
defs.push({key:"sty_bjLucas",name:"Lucas (estilizado)",dur:1.2,ti:0.36,pal:P_HAWK,tier:1,stylized:true,
  phases:[["Destello",0],["Corona",0.08],["Plumas",0.2],["Carga",0.36],["Fin",0.85]],
build(a){
  const L=a.L,TG=0.08,TI=0.36,HEADC=V3(CX,1.45,0);
  const eyes=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.68),S.mat(EYES_FS(GOLD,"vec3(.45,.2,.06)"),{uO:{value:0},uK:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(eyes);
  const glyph=groundPlane(2.4,CX,0.025,S.mat(GLYPH(`float k=fract((an/6.2832+.5)*8.);m*=1.;m+=smoothstep(.05,.0,abs(k-.5)-.06)*step(.25,r)*step(r,.75)*.8;`),{},{mode:'energy'})); L.decal.add(glyph);
  const ring=S.groundRing(L.decal,2.4);
  const K=`const float TG=${f(TG)};const float TI=${f(TI)};const vec3 HC=${v3(HEADC)};const vec3 EYE=${v3(EYE)};`;
  // corona de 10 plumas de halcón: se abren alrededor de la cabeza y se clavan en el lanzador
  S.pts(L.part,10,VV+K+`void main(){float i=floor(aSeed.x*10.);float an=i/10.*6.2832+uT*1.5;
   float op=smoothstep(TG,TG+.12,uT);float dive=smoothstep(TI-.08,TI,uT);float R=mix(.3,1.25,op)*(1.-dive*.85);
   vec3 p=HC+vec3(cos(an)*R,.35+sin(an*2.)*.05+.25*op-.5*dive,sin(an)*R*.8);
   vA=(uT>TG&&uT<TI+.04)?1.:0.;vK=0.;vR=an+3.14159*(1.-dive)+1.5708;put(p,.85);}`,FEATH("vec3(.55,.28,.1)","vec3(1.,.8,.4)"));
  // chispas doradas de la mirada
  S.pts(L.part,8,VV+K+`void main(){float s=aSeed.x*.1;float life=.16;float age=(uT-s)/life;
   vec3 p=EYE+vec3(.05,0.,.1)+rnd()*vec3(.12,.1,.12);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=aSeed.y*3.;put(p,.3);}`,
   S.ENERGY_FS(C.spark,{gain:1.6}),{mode:'energy'});
  // dos orbes de PA que suben y bajan al lanzador
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TI+.02+i*.08;float u=clamp((uT-s)/.4,0.,1.);
   vec3 p=vec3(${f(CX)}+(i-.5)*.5*(1.-u),.9+sin(u*3.14159)*1.3-u*.3,.2);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.6*(1.-.4*u));}`,ORB_FS,{mode:'energy'});
  // esquirlas de luz en la carga
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=HC+vec3(cos(an),.4*(aSeed.w-.3),sin(an))*(.3+1.6*t);vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=an;put(p,.22*(1.-.5*age));}`,
   S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  const eu=eyes.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, eo=ss(0,0.06,te)*(1-ss(TI,TI+0.2,te));
    towardCam(eyes.position,EYE,0.4); billboard(eyes); eyes.visible=eo>0.001; eyes.scale.setScalar(0.75+0.25*hitE(ia,8));
    eu.uO.value=e3(te/0.07); eu.uK.value=0.5*Math.sin(Math.PI*cl(te/0.16))+0.6*hitE(ia,8); set(eyes,0,eo);
    glyph.visible=te>TG; set(glyph,-0.1+1.1*ss(0.6,1.1,te),ss(TG,TI,te));
    ring.pose(ia,CX,0,0.35,0.8);
    const k=hitE(ia,7); glowOf(caster,U.uC1.value,0.5*k+0.15*ss(TG,TI,te)*(ia<0?1:0));
    caster.rotation.z=-0.05*ss(0,TG,te)*(1-ss(TI,TI+0.3,te)); caster.scale.set(1+0.04*k,1-0.05*k,1+0.04*k);
    if(ia<0){o.g.copy(EYE);o.gs=0.5+0.3*eo;o.ga=0.2*eo;o.li=1.5;}
    else{o.g.set(CX,1.1,0);o.gs=1+1.2*k;o.ga=0.4*k;o.li=1.5+3*k;}
    o.ia=ia;o.c.set(CX,1.1,0);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

// =====================================================================
// 3 · CONCENTRATE — un haz de sol pintado baja del cielo y se estrecha hasta enfocarse en la mirada; destello de foco,
//     plumas doradas en espiral y chevrones rojos que suben (+20 % de daño). ti 0,8 s
// =====================================================================
defs.push({key:"sty_bjConcentrate",name:"Concentrate (estilizado)",dur:2.2,ti:0.8,pal:P_SUN,tier:2,stylized:true,
  phases:[["Claro",0],["Haz",0.2],["Foco",0.8],["Plumas",1.0],["Fin",1.8]],
build(a){
  const L=a.L,TB=0.2,TI=0.8,TE=1.95,SK=V3(-2.4,7.4,0.9),FP=EYE.clone();
  const dir=V3(0,0,0).subVectors(FP,SK), BL=dir.length(); dir.normalize();
  const beam=new THREE.Mesh(new THREE.ConeGeometry(2.0,BL,40,1,true),S.mat(`void main(){float h=.5+vP.y/${f(BL)};if(h>uP)discard;
   float an=atan(vP.z,vP.x);vec4 nz=styNoise(vec2(an*.5,h*1.4-uT*.5));float st=nz.b*.6+styNoise(vec2(an*1.3,h*3.-uT*1.2)).r*.4;
   float c=abs(dot(normalize(vN),normalize(vV)));float front=smoothstep(uP,uP-.06,h);
   float m=(smoothstep(.45,.7,st)*.55+c*.18)*(.3+.7*h)*front;if(m<.01)discard;
   gl_FragColor=vec4(styRamp(.3+.4*h+.15*st)*1.05,m*uA);}`,{},{mode:'energy',side:THREE.DoubleSide}));
  beam.position.copy(SK).addScaledVector(dir,BL/2); beam.quaternion.setFromUnitVectors(V3(0,1,0),dir); L.mesh.add(beam);
  const flare=S.hitSpark(L.mesh,1.5,{seed:0.77,life:0.45,grow:0.08});
  const glyph=groundPlane(2.8,CX,0.025,S.mat(GLYPH(`float k=fract((an/6.2832+.5)*12.+uT*.2);m+=smoothstep(.06,0.,abs(k-.5)-.05)*step(.3,r)*step(r,.8)*.7;`),{},{mode:'energy'})); L.decal.add(glyph);
  const ring=S.groundRing(L.decal,2.8);
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TE=${f(TE)};const float CX=${f(CX)};const vec3 SK=${v3(SK)};const vec3 FP=${v3(FP)};`;
  // motas de luz que bajan por el haz
  S.pts(L.part,24,VV+K+`void main(){float env=smoothstep(TB,TB+.2,uT)*(1.-smoothstep(TI,TI+.2,uT));float c=uT*1.1+aSeed.x;float k=fract(c);vec3 r=rr(floor(c));
   float foc=mix(1.,.3,smoothstep(TB,TI,uT));vec3 ax=mix(SK,FP,k);float an=r.x*6.2832;vec3 p=ax+vec3(cos(an),0.,sin(an))*(1.-k)*1.*foc*sqrt(r.y);
   vA=env*sin(k*3.14159);vK=0.;vR=r.z*6.;put(p,.2+.1*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // plumas doradas en espiral alrededor del lanzador
  S.pts(L.part,16,VV+K+`void main(){float s=TI-.05+aSeed.x*.3;float t=max(uT-s,0.);float life=TE-s;float age=(uT-s)/life;
   float an=aSeed.y*6.2832+t*(1.8+.8*aSeed.z);float R=.7+.25*aSeed.w;vec3 p=vec3(CX+cos(an)*R,.2+aSeed.z*.5+t*(.5+.3*aSeed.w),sin(an)*R);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.7,1.,age);vR=an+1.57+.4*sin(t*3.);put(p,.65+.15*aSeed.w);}`,FEATH("vec3(.7,.38,.08)",GOLD));
  // chevrones rojos de daño que suben
  S.pts(L.part,10,VV+K+`void main(){float life=.6+aSeed.y*.2;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float env=smoothstep(TI,TI+.15,uT)*(1.-smoothstep(TE-.3,TE,uT));float an=r.x*6.2832;
   vec3 p=vec3(CX+cos(an)*(.45+.2*r.y),.3+age*1.7,sin(an)*(.45+.2*r.y));vA=sin(age*3.14159)*env;vK=0.;vR=0.;put(p,.5+.12*r.z);}`,CHEV_UP(RED));
  a.pose=function(te,o){
    const ia=te-TI, bv=ss(TB-0.05,TB+0.1,te)*(1-ss(TI+0.02,TI+0.3,te)), foc=1-0.6*ss(TB+0.1,TI,te);
    beam.visible=bv>0.001; beam.scale.set(foc,1,foc); set(beam,ss(TB,TB+0.35,te)*1.02,bv);
    flare.pose(ia,FP,1.0);
    glyph.visible=te>TB; set(glyph,-0.1+1.1*ss(TE-0.5,TE,te),ss(TB,TI,te));
    ring.pose(ia,CX,0,0.5,1);
    const k=hitE(ia,4); glowOf(caster,U.uC1.value,0.2*ss(TB,TI,te)*(ia<0?1:0)+0.6*k+0.12*ss(TI,TI+0.2,te)*(1-ss(TE-0.4,TE,te)));
    caster.rotation.z=-0.05*ss(TB,TI,te)*(1-ss(TI+0.3,TE,te));
    if(ia<0){o.g.copy(FP);o.gs=0.6+0.6*ss(TB,TI,te);o.ga=0.1+0.2*ss(TB,TI,te);o.li=1.5+2*ss(TB,TI,te);}
    else{o.g.copy(FP);o.gs=1.2+1.2*k;o.ga=0.45*Math.exp(-ia*6);o.li=4.5*Math.exp(-ia*4)+1;}
    o.ia=ia;o.c.copy(FP);o.shake=0;o.dist=0.35;o.flash=0;
  };
}});

// =====================================================================
// 4 · PASSION (Bing y Pomodoro) — dos abanicos de plumas de fuego rosa brotan de la espalda, se abren y baten una vez:
//     la batida suelta plumas encendidas hacia delante y deja un velo de calor rosa (escudo +25). Dos estelas de viento
//     giran a los pies (+2 PM). Nivel 1: rápido. ti 0,34 s
// =====================================================================
defs.push({key:"sty_bjPassion",name:"Passion (estilizado)",dur:1.3,ti:0.34,pal:P_PASSION,tier:1,stylized:true,
  phases:[["Llama",0],["Batida",0.34],["Calor",0.45],["Escudo",0.6],["Fin",1.05]],
build(a){
  const L=a.L,TI=0.34,TE=1.25,BK=V3(-3.9,1.3,0);
  const K=`const float TI=${f(TI)};const float TE=${f(TE)};const vec3 BK=${v3(BK)};const float CX=${f(CX)};
  vec3 fan(float s,float j,float r,float t,out float ph){float op=smoothstep(.02,.22,t);float b=smoothstep(TI-.06,TI+.06,t);
   ph=mix(.9,.2+j*1.35,op)-b*1.1;vec3 d=normalize(vec3(-cos(ph)*(.85-1.5*b),sin(ph),s*(.45+.35*op)));
   return BK+vec3(0.,0.,s*.18)+d*(.3+1.1*r)*op;}`;
  const FIRE=FEATH(ROSE,"vec3(1.,.5,.75)",{energy:true,gain:1.15});
  // abanicos: plumas de materia rosa (silueta) con borde de llama aditivo
  S.pts(L.part,36,VV+K+`void main(){float s=aSeed.y>.5?1.:-1.;float j=floor(aSeed.x*6.)/5.;float ph;
   vec3 p=fan(s,j,aSeed.z,uT,ph);float fade=1.-smoothstep(TI+.03,TI+.12,uT);
   vA=smoothstep(.02,.1,uT)*fade;vK=0.;vR=ph+3.14159;put(p+rnd()*.02,.8+.2*aSeed.z);}`,FEATH(ROSE,PINK));
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.y>.5?1.:-1.;float j=floor(aSeed.x*6.)/5.;float ph;float c=uT*5.+aSeed.w;float k=fract(c);
   vec3 p=fan(s,j,.6+.4*aSeed.z,uT,ph)+vec3(0.,.2*k,0.);vA=smoothstep(.04,.12,uT)*(1.-smoothstep(TI,TI+.1,uT));vK=k;vR=(aSeed.z-.5)*.5;
   put(p,.6+.15*aSeed.w);}`,S.ENERGY_FS(C.flame,{gain:1.5}),{mode:'energy'});
  // la batida suelta plumas encendidas que se consumen
  S.pts(L.part,24,VV+K+`void main(){float s=aSeed.y>.5?1.:-1.;float j=floor(aSeed.x*6.)/5.;float ph;vec3 p0=fan(s,j,aSeed.z,TI+.02,ph);
   float st=TI+aSeed.w*.05;float t=max(uT-st,0.);float age=(uT-st)/(.5+.25*aSeed.z);
   vec3 v=vec3(2.4+1.6*aSeed.z,.3+.9*(aSeed.x-.5),s*(.5+.9*aSeed.w));vec3 p=p0+v*(1.-exp(-t*3.5))/3.5+vec3(0.,-.35*t*t+.2*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=ph+3.14159+t*(4.+4.*aSeed.x)*s;put(p,.7*(1.-.35*age));}`,FIRE,{mode:'energy'});
  // velo de calor: caparazón rosa con lenguas de llama que suben, se cierra de abajo arriba
  const veil=new THREE.Mesh(new THREE.SphereGeometry(1,40,26),S.mat(`uniform float uD;void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
   vec3 q=normalize(vP);float h=q.y*.5+.5;if(h>uP*1.1)discard;
   float nz=styNoise(vec2(atan(q.z,q.x)*.48,h*.9-uT*.6)).r;float lick=smoothstep(.5,.72,nz)*smoothstep(.2,.9,h);
   float er=styErode(nz*.7+(1.-h)*.3,uD,.1);float front=smoothstep(.08,0.,abs(h-uP*1.1))*step(uP,.99);
   float m=(pow(fr,1.7)*.85+.1+lick*.45+front*.8)*er;if(m<.01)discard;
   gl_FragColor=vec4(styRamp(.45+.4*fr+.3*lick)*1.1,min(m,1.)*uA);}`,{uD:{value:-0.1}},{mode:'energy'}));
  veil.position.set(CX,0.82,0); veil.scale.set(0.68,0.95,0.68); L.mesh.add(veil);
  // estelas de viento a los pies (+2 PM): dos arcos de pincel que giran
  const wind=groundPlane(2.2,CX,0.03,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*9.;
   float arc=fract(an/6.2832*2.);float seg=smoothstep(0.,.05,arc)*smoothstep(.55,.25,arc);vec4 s=styShape(7.,vUv);
   float m=s.r*seg;if(m<.02)discard;float er=styErode(s.r*.5+s.b*.5,uP,.12);
   gl_FragColor=vec4(mix(vec3(1.,.78,.9),vec3(1.),.3*s.g)*1.1,m*er*uA);}`,{},{mode:'energy'})); L.decal.add(wind);
  const ring=S.groundRing(L.decal,2.6);
  const vu=veil.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0.05,TI-0.05,te)-0.18*ss(TI-0.05,TI+0.04,te)*(1-ss(TI+0.1,TI+0.4,te));
    caster.scale.set(1,1-0.05*ss(0,TI-0.05,te)*(1-ss(TI-0.05,TI,te)),1);
    glowOf(caster,U.uC1.value,0.3*ss(0,TI,te)*(1-ss(TI,TI+0.4,te))+0.1*ss(TI,TI+0.2,te)*(1-ss(0.9,TE,te)));
    const sh=ss(TI+0.02,TI+0.18,te)*(1-ss(0.95,TE,te));
    veil.visible=sh>0.001; vu.uP.value=ss(TI,TI+0.25,te); vu.uD.value=-0.1+1.1*ss(0.85,TE,te); vu.uA.value=0.9*(ia>=0?1:0);
    const wv=ss(TI+0.05,TI+0.2,te)*(1-ss(1.0,TE,te)); wind.visible=wv>0.001; wind.rotation.y=0; set(wind,-0.1+1.1*ss(0.95,TE,te),wv);
    wind.scale.setScalar(0.85+0.15*ss(TI,TI+0.3,te));
    ring.pose(ia,CX,0,0.4,1);
    if(ia<0){o.g.set(-3.95,1.5,0);o.gs=0.6+0.6*ss(0,TI,te);o.ga=0.3*ss(0,TI,te);o.li=2.2*ss(0,TI,te);}
    else{o.g.set(-3.6,1.1,0);o.gs=1.0+0.8*hitE(ia,5);o.ga=0.45*Math.exp(-ia*7)+0.08*sh;o.li=4*Math.exp(-ia*5)+1*sh;}
    o.ia=ia;o.c.set(-3.5,1.1,0);o.shake=0;o.dist=0.8;o.flash=0;
  };
}});

// =====================================================================
// 5 · MAVIS — un sello de pincel bajo el lanzador invoca a un gorrión espíritu (marrón y crema, mejillas rosas) que
//     aparece en un soplo de plumas y revolotea sobre él; canta: notas violetas bajan en espiral por una cinta pautada y
//     se funden en el Axie; al final dos orbes de PA dorados entran en él (+2 PA). ti 0,85 s
// =====================================================================
const NOTE_FS=S.PV+`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){vec2 q=styPC()-.5;
 vec2 h=q-vec2(-.1,-.22);h=vec2(h.x*.85+h.y*.45,-h.x*.45+h.y*.85);float head=length(h*vec2(1.,1.5))-.13;
 float stem=sdSeg(q,vec2(.02,-.2),vec2(.02,.36))-.035;float flag=sdSeg(q,vec2(.02,.36),vec2(.21,.13))-.04;
 float d=min(head,min(stem,flag));float m=smoothstep(.055,.03,d);if(m*vA<.02)discard;
 float inner=smoothstep(.0,-.03,d);float er=styErode(styNoise(q*.6+vMix).r,vK*1.05-.05,.08);
 vec3 c=mix(${VIOLET}*.25,mix(${VIOLET},vec3(.85,.7,1.),.35+.4*(-q.y+.3)),inner);
 gl_FragColor=vec4(c,m*er*vA);}`;
defs.push({key:"sty_bjMavis",name:"Mavis (estilizado)",dur:2.4,ti:0.85,pal:P_SPARROW,tier:2,stylized:true,
  phases:[["Invocación",0],["Aparición",0.35],["Canto",0.85],["Melodía",1.25],["Fin",2.0]],
build(a){
  const L=a.L,TA=0.35,TI=0.85,TS=1.6,TE=2.3,HP=V3(-3.5,2.9,0.15),HH=2.2,R0=0.9,R1=0.55,TURN=1.5;
  const sp=birdMesh(L.mesh,1.75,SPARROW_PAINT,{hs:'.17',tf:'.55'});
  const circ=groundPlane(2.2,CX,0.025,S.mat('uniform float uK;'+GLYPH(`float k=fract((an/6.2832+.5)*6.);float w=.3*(1.-clamp((r-.25)/.5,0.,1.));
   m+=step(.25,r)*step(r,.72)*smoothstep(w,w-.06,abs(k-.5)*2.)*.7;m*=step(fract(an/6.2832+.5),uK);`),{uK:{value:0}},{mode:'energy'})); L.decal.add(circ);
  // cinta pautada (cinco líneas violetas) que baja en espiral
  const staff=new THREE.Mesh(VFX.helixGeo(TURN,R0,R1,HH,0.26,120),S.mat(`void main(){float u=vUv.x;if(u<1.-uP)discard;float y=vUv.y;
   float l=0.;for(int i=0;i<5;i++){l+=smoothstep(.04,.015,abs(y-.1-.2*float(i)));}
   float k=smoothstep(1.-uP,1.-uP+.08,u)*smoothstep(0.,.08,u);float m=(l*.85+.05)*k;if(m<.02)discard;
   gl_FragColor=vec4(mix(${VIOLET}*.6,vec3(.9,.75,1.),l*.5)*1.1,m*uA);}`,{},{mode:'matter',side:THREE.DoubleSide}));
  staff.position.set(CX,0.1,0); L.trail.add(staff);
  const ring=S.groundRing(L.decal,2.4);
  const K=`const float TA=${f(TA)};const float TI=${f(TI)};const float TS=${f(TS)};const float CX=${f(CX)};const vec3 HP=${v3(HP)};
  vec3 hel(float u){float an=u*${f(TURN)}*6.2832;float r=${f(R0)}+${f(R1-R0)}*u;return vec3(${f(CX)}+cos(an)*r,.1+u*${f(HH)},sin(an)*r);}`;
  // chispas que suben en espiral del sello al punto de aparición
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*(TA-.1);float k=clamp((uT-s)/.3,0.,1.);
   float an=aSeed.y*6.2832+k*5.;float r=mix(.9,.05,k);vec3 p=mix(vec3(CX,.05,0.),HP,k*k)+vec3(cos(an)*r,0.,sin(an)*r);
   vA=(uT>s&&k<1.)?1.:0.;vK=0.;vR=an;put(p,.2+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // soplo de plumas al aparecer
  S.pts(L.part,16,VV+K+`void main(){float s=TA+aSeed.x*.04;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd())*(1.4+1.8*aSeed.z);vec3 p=HP+v*(1.-exp(-t*4.))/4.+vec3(sin(t*4.+aSeed.w*9.)*.12,-.45*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.2832+t*4.;put(p,.55+.15*aSeed.w);}`,FEATH(SPARB,CREAM));
  // notas: nacen en el gorrión, bajan por la cinta y se funden en el Axie
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*(TS-TI);float life=.85;float age=(uT-s)/life;
   vec3 p=age<.12?mix(HP,hel(1.),age/.12):hel(1.-(age-.12)/.88)+vec3(0.,(aSeed.y-.5)*.18,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age):0.;vK=smoothstep(.82,1.,age);vR=.3*sin(uT*8.+aSeed.w*9.);put(p,.7+.15*aSeed.z);}`,NOTE_FS);
  // dos orbes de PA al final
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TS+.05+i*.12;float u=clamp((uT-s)/.45,0.,1.);
   vec3 p=mix(HP+vec3((i-.5)*.4,0.,0.),vec3(CX,1.,.15),u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*.4,0.);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.6*(1.-.3*u));}`,ORB_FS,{mode:'energy'});
  const su=sp.material.uniforms, cu=circ.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ap=ss(TA-0.03,TA+0.12,te)*(1-ss(TE-0.35,TE,te));
    const bob=0.07*Math.sin(te*6)+0.03*Math.sin(te*17);
    sp.visible=ap>0.001; sp.position.set(HP.x+0.08*Math.sin(te*2.3),HP.y+bob,HP.z); billboard(sp,0.12*Math.sin(te*3));
    sp.scale.setScalar(Math.max(ap*(1+0.12*hitE(ia,8)),0.001)); su.uQ.value=0.35+0.75*Math.sin(te*34); su.uR.value=1;
    su.uEr.value=-0.1+1.1*ss(TE-0.35,TE,te); su.uGlow.value=0.4+0.4*hitE(ia,6); sp.material.uniforms.uA.value=1;
    const sv=ss(TI-0.05,TI+0.1,te)*(1-ss(TS+0.4,TS+0.7,te));
    staff.visible=sv>0.001; set(staff,ss(TI-0.05,TI+0.35,te)*1.02,sv*0.8);
    cu.uK.value=ss(0,TA,te)*1.01; circ.visible=te<TS+0.6; set(circ,-0.1+1.1*ss(TS,TS+0.6,te),ss(0,0.08,te));
    ring.pose(te-(TS+0.5),CX,0,0.4,0.9);
    let gl=0; for(let i=0;i<5;i++){const t=te-(TI+0.85+i*0.15);gl+=t>=0?Math.exp(-t*9)*0.22:0;}
    const pa=hitE(te-(TS+0.5),6); glowOf(caster,U.uC1.value,0.15*ss(0,TA,te)*(1-ss(TA,TI,te))+gl+0.5*pa);
    caster.rotation.z=0.05*Math.sin(te*5)*sv;
    if(te<TA){o.g.set(CX,0.4+1.6*ss(0,TA,te),0);o.gs=0.7;o.ga=0.2*ss(0,TA,te);o.li=1.4;}
    else{o.g.copy(sp.position);o.gs=0.8+0.6*hitE(ia,5);o.ga=0.15*ap+0.25*hitE(ia,7);o.li=1.2*ap+2.5*hitE(ia,5);}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 6 · ROBIN — dos petirrojos espíritu (dorso pardo, pecho naranja) salen de junto a la mirada, trazan dos arcos y bajan
//     en picado uno tras otro sobre el rival: dos picotazos (2 golpes), cada uno con chispa, plumas pardas y naranjas
//     y retroceso. ti 1,0 s (primer golpe) · segundo a 1,18 s
// =====================================================================
defs.push({key:"sty_bjRobin",name:"Robin (estilizado)",dur:2.4,ti:1.0,pal:P_ROBIN,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Llamada",0],["Vuelo",0.15],["Picada",0.72],["Picotazo",1.0],["Segundo",1.18],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.15,TI=1.0,T2=1.18,DT=T2-TI;
  const S0=[V3(-3.4,2.05,0.35),V3(-3.4,2.0,-0.3)], CC=[V3(-0.4,3.7,1.3),V3(-0.2,4.3,-0.9)], HIT=[V3(3.05,1.45,0.22),V3(3.08,1.3,-0.05)];
  const birds=[0,1].map(()=>birdMesh(L.mesh,2.1,ROBIN_PAINT,{hs:'.17',tf:'.5'}));
  const sparks=[S.hitSpark(L.mesh,1.4,{seed:0.31}),S.hitSpark(L.mesh,1.5,{seed:0.68})], ring=S.groundRing(L.decal,2.8);
  const shadows=[S.contactShadow(L.decal,0.8),S.contactShadow(L.decal,0.8)];
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float DT=${f(DT)};const vec3 H0=${v3(HIT[0])};const vec3 H1=${v3(HIT[1])};
  const vec3 A0=${v3(S0[0])};const vec3 A1=${v3(S0[1])};const vec3 B0=${v3(CC[0])};const vec3 B1=${v3(CC[1])};
  vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
  // plumas pardas y naranjas en cada picotazo
  S.pts(L.part,28,VV+K+`void main(){float i=step(.5,aSeed.x);float s=TI+i*DT+aSeed.y*.03;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 H=mix(H0,H1,i);vec3 v=normalize(rnd()+vec3(.35,.4,0.))*(1.8+2.2*aSeed.w);vec3 p=H+v*(1.-exp(-t*4.))/4.+vec3(0.,-.6*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*(4.+5.*aSeed.y);put(p,.55+.15*aSeed.w);}`,FEATH(ROBINB,ROBINR));
  // estela de motas tras cada petirrojo
  S.pts(L.part,24,VV+K+`void main(){float i=step(.5,aSeed.x);float te=TI+i*DT;float s=TF+aSeed.y*(te-TF);float k=clamp((s-TF)/(te-TF),0.,1.);k=k*k;
   vec3 p=bz(mix(A0,A1,i),mix(B0,B1,i),mix(H0,H1,i),k);float life=.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   p+=rnd()*.06+vec3(0.,-.25*t,0.);vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=aSeed.z*6.28;put(p,.2*(1.-.5*age));}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  const bu=birds.map(b=>b.material.uniforms);
  a.pose=function(te,o){
    const ia=te-TI;
    for(let i=0;i<2;i++){
      const b=birds[i], u=bu[i], tH=TI+i*DT, form=ss(0.02+i*0.06,TF+i*0.06,te), ih=te-tH;
      const k=cl((te-TF)/(tH-TF)), kk=k*k;
      if(te<TF)b.position.copy(S0[i]).add(tmp.set(0,0.1*form,0));
      else if(ih<0)bez(S0[i],CC[i],HIT[i],kk,b.position);
      else{const r=e3(ih/0.35);b.position.copy(HIT[i]).add(tmp.set(0.3*r,1.3*r,(i?-0.6:0.6)*r));}
      bez(S0[i],CC[i],HIT[i],Math.min(kk+0.03,1),tmp2); const dx=tmp2.x-b.position.x, dy=tmp2.y-b.position.y;
      billboard(b,ih<0&&te>TF?-0.6*Math.atan2(dy,Math.abs(dx)+1e-4):-0.3);
      b.visible=form>0.001&&ih<0.4; b.scale.setScalar(Math.max(form*(1+0.12*ss(tH-0.2,tH,te)),0.001));
      u.uQ.value=ih>-0.15&&ih<0?-0.3:0.35+0.75*Math.sin(te*32+i*2); u.uR.value=ih>-0.15&&ih<0?0.45:1;
      u.uEr.value=-0.1+1.1*ss(0.1,0.4,ih); u.uGlow.value=1; b.material.uniforms.uA.value=1;
      shadows[i].pose(b.position.x,b.position.z,0.55,te>TF&&ih<0.3?0.4*cl(1.4-b.position.y*0.3):0);
      sparks[i].pose(ih,HIT[i],1);
    }
    ring.pose(te-T2,TX-0.1,0,0.42,0.9);
    const h1=hitE(ia,8), h2=hitE(te-T2,6);
    target.position.x=TX+0.15*h1*(1-Math.exp(-Math.max(ia,0)*20))+0.24*h2*(1-Math.exp(-Math.max(te-T2,0)*20));
    target.rotation.z=-0.14*h1*Math.cos(ia*14)-0.2*h2*Math.cos((te-T2)*13); target.scale.set(1+0.04*h2,1-0.06*Math.max(h1,h2),1+0.04*h2);
    o.em=0.3*Math.max(h1,h2); o.emc.copy(U.uC1.value);
    caster.rotation.z=0.06*Math.sin(Math.PI*cl(te/0.3));
    if(te<TF){o.g.copy(S0[0]);o.gs=0.5;o.ga=0.1;o.li=1;}
    else if(ia<0){o.g.copy(birds[0].position);o.gs=0.6;o.ga=0.12;o.li=1.4;}
    else{o.g.copy(HD);o.gs=1+1.5*Math.max(h1,h2);o.ga=0.35*Math.max(h1,h2);o.li=4*Math.max(h1,h2);}
    o.ia=ia;o.c.copy(HIT[0]);o.shake=0;o.dist=0.5;o.flash=0.6;
  };
}});

VFX.module("Estilizado · Pájaro · Ojos",defs);
})();

// =====================================================================
// ESTILIZADO · PÁJARO · ESPALDA (Hito 101) — las 9 cartas de espalda de Pájaro hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_beCupid, sty_beBalloon…). Mismos dur / ti / tiempos de fase que las originales, así el
// daño llega igual. Lo que «sale de la espalda» nace en ≈ (-3.85,1.3,0); las aves son criaturas invocadas en malla con
// luz en 3 bandas (cuerpo, cabeza, pico, alas con primarias festoneadas y cola), no partes del Axie.
// Semántica según PartCards.js (no la del módulo antiguo):
//   Balloon (daño + Miedo) · Cupid (daño + Sangrado; carta de Early Bird) · Kingfisher (aliado: Represalia 85)
//   Lil Bro (2 golpes + PA al lanzador) · Raven (daño + Gafe: sin críticos) · Tri Feather (daño en cruz)
//   Paper Wing (daño) · Rubber Duckling (aliado: cura + PA a todo el equipo) · Pigeon Post (daño + pasa tus perjuicios)
// Cartas sobre aliado: receptor = muñeco aliado del laboratorio (allies:1, ALLY_POS[0]); el puente lo lleva al aliado real
// (o al propio lanzador si la carta se lanza sobre sí misma).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_BALLOON=pal("Sty Pájaro · Globo",["#ffc2d6","#d63a6a"]);
const P_CUPID=pal("Sty Pájaro · Cupido",["#ff9dbb","#c8143f"]);
const P_KING=pal("Sty Pájaro · Martín",["#64e3ee","#136fa8"]);
const P_CHICK=pal("Sty Pájaro · Polluelo",["#ffe070","#e07a12"]);
const P_RAVEN=pal("Sty Pájaro · Cuervo",["#c27dff","#3d1463"]);
const P_TRI=pal("Sty Pájaro · Tres Plumas",["#ff8fd2","#4a5cff"]);
const P_PAPER=pal("Sty Pájaro · Papel",["#ffd9a0","#c4402e"]);
const P_DUCK=pal("Sty Pájaro · Patito",["#ffe766","#ee8a12"]);
const P_PIGEON=pal("Sty Pájaro · Paloma",["#c9b6ff","#5a3592"]);

const ZONES={zoneCaster:0.6,zoneTarget:1.0};   // a 1 casilla el efecto conserva su tamaño (Hito 99)
const TILE=1.93;                               // una casilla en unidades del laboratorio
const TX=3.4, CX=-3.7, AP=ALLY_POS[0];
const BK=V3(-3.85,1.3,0);                      // espalda del lanzador
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const qbz=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qbz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
// orienta un grupo que mira a +x hacia la dirección d (giro en y, cabeceo en z, alabeo en x)
function orient(g,d,roll=0){const h=Math.hypot(d.x,d.z);g.rotation.order='YZX';g.rotation.set(roll,Math.atan2(-d.z,d.x),Math.atan2(d.y,Math.max(h,1e-4)));}
function recoil(ia,k=0.26,dummy=target,x0=TX){const h=hitE(ia,6);dummy.position.x=x0+k*h*(1-Math.exp(-Math.max(ia,0)*20));
  dummy.rotation.z=-0.22*h*Math.cos(ia*14);dummy.scale.set(1+0.05*h,1-0.07*h,1+0.05*h);}

// ---------- colores de materia (semánticos, fijos) ----------
const GOLD="vec3(.93,.6,.16)", CREAM="vec3(.97,.92,.8)", INK="vec3(.72,.12,.14)", WOOD="vec3(.55,.34,.17)",
  BLOOD="vec3(.78,.06,.1)", SOOT="vec3(.16,.1,.2)", MIAS="vec3(.33,.13,.45)", WATER="vec3(.25,.7,.9)", DARKF="vec3(.1,.07,.16)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo caliente
const SOLID=(body,{hot='uC1',rim=.22,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.06,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
const SM=(body,o,side)=>S.mat(SOLID(body,o),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:side||THREE.FrontSide});
// ala: plano (u = cuerda, 0 = borde de salida; v = envergadura, 1 = punta) con primarias festoneadas y coberteras
const WING_FS=(cov,prim,dark)=>`uniform float uQ;uniform float uK;
void main(){float ch=vUv.x,sp=vUv.y;float w=.98-.6*pow(sp,1.3);
 float fe=fract(sp*5.5);float sc=.14*sqrt(max(0.,1.-pow(2.*fe-1.,2.)))*smoothstep(.05,.25,sp);
 if(ch<1.-w-sc+.12)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vUv*vec2(1.,2.)+.37).r;if(styErode(nz,uQ,.05)<.5)discard;
 float cv=smoothstep(.6,.66,ch);float sep=smoothstep(.4,.47,abs(fe-.5))*(1.-cv);
 vec3 base=mix(${prim},${cov},cv);base=mix(base,${dark},sep*.7);
 vec3 c=styRampOf(base,clamp(.24+.56*l-.08*sep,0.,1.))*styTint(l);c+=uC1*uK;gl_FragColor=vec4(c,1.);}`;
// cola en abanico (u 0 = punta, 1 = raíz; v = ancho) con plumas separadas
const TAIL_FS=(prim,dark)=>`uniform float uQ;uniform float uK;
void main(){float u=vUv.x,v=vUv.y-.5;float hw=.16+.34*(1.-u);float fe=fract((v/hw*.5+.5)*4.);
 float notch=.08*sqrt(max(0.,1.-pow(2.*fe-1.,2.)));if(abs(v)>hw||u<notch*(1.-u)*2.5)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vUv*vec2(2.,1.)+.61).r;if(styErode(nz,uQ,.05)<.5)discard;
 float sep=smoothstep(.4,.47,abs(fe-.5));vec3 base=mix(${prim},${dark},sep*.6);
 vec3 c=styRampOf(base,clamp(.24+.56*l,0.,1.))*styTint(l);c+=uC1*uK;gl_FragColor=vec4(c,1.);}`;
/** Ave invocada (mira a +x). o: top, belly, cov, prim, dark, beak, eye (GLSL), s escala, beakLen, chick (redonda). */
function makeBird(parent,o){
  const g=new THREE.Group(); parent.add(g); const mats=[];
  const add=(m)=>{mats.push(m);return m;};
  const ch=!!o.chick, bl=o.beakLen||0.2;
  const bodyM=add(SM(`float t=smoothstep(-.08,.1,vP.y+.05*vP.x);base=mix(${o.belly},${o.top},t);lb=.04*(1.-t);`));
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.3,26,18).scale(ch?1.05:1.32,ch?1.0:0.92,ch?1.0:0.92),bodyM); g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(ch?0.2:0.19,22,16),bodyM); head.position.set(ch?0.24:0.34,ch?0.22:0.2,0); g.add(head);
  const beakM=add(SM(`base=${o.beak};`,{rim:.1}));
  const beak=new THREE.Mesh(new THREE.ConeGeometry(ch?0.055:0.06,bl,10).rotateZ(-Math.PI/2),beakM);
  beak.position.set(head.position.x+(ch?0.18:0.17)+bl*0.45,head.position.y-0.03,0); g.add(beak);
  const eyeM=add(SM(`base=${o.eye||'vec3(.06,.05,.08)'};float gl=step(length(vUv-vec2(.62,.7)),.09);lb=.5*gl;`,{hot:o.eyeHot||'vec3(0.)',rim:0}));
  for(const s of [1,-1]){const e=new THREE.Mesh(new THREE.SphereGeometry(ch?0.045:0.04,12,8),eyeM);
    e.position.set(head.position.x+0.1,head.position.y+0.06,s*(ch?0.15:0.13)); g.add(e);}
  const wingM=add(S.mat(WING_FS(o.cov,o.prim,o.dark),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  const wl=new THREE.Group(), wr=new THREE.Group(); wl.position.set(ch?0.0:0.02,0.13,0.12); wr.position.set(ch?0.0:0.02,0.13,-0.12); g.add(wl,wr);
  const ws=ch?0.55:1;
  wl.add(new THREE.Mesh(new THREE.PlaneGeometry(0.5*ws,0.85*ws).rotateX(Math.PI/2).translate(0,0,0.425*ws),wingM));
  wr.add(new THREE.Mesh(new THREE.PlaneGeometry(0.5*ws,0.85*ws).rotateX(-Math.PI/2).translate(0,0,-0.425*ws),wingM));
  const tailM=add(S.mat(TAIL_FS(o.prim,o.dark),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  const tail=new THREE.Mesh(new THREE.PlaneGeometry((ch?0.22:0.44),0.3).rotateX(-Math.PI/2).translate(-(ch?0.11:0.22),0,0),tailM);
  tail.position.set(ch?-0.26:-0.34,0.06,0); tail.rotation.z=0.25; g.add(tail);
  g.scale.setScalar(o.s||1);
  return {g,wl,wr,tail,beak,
    flap(a){wl.rotation.x=-a;wr.rotation.x=a;},
    q(v){for(const m of mats)m.uniforms.uQ.value=v;},
    k(v){for(const m of mats)m.uniforms.uK.value=v;},
    scale(s){g.scale.setScalar(Math.max(s,0.001));}};
}
// pluma en sprite (u = ancho, v = cañón → punta), iluminada; colA → colB a lo largo
const FEATHER_P=(colA,colB)=>S.PV+`void main(){vec2 q=styPC()-.5;float y=q.y+.5;
 float hw=.21*pow(max(sin(3.1416*clamp(y,0.,1.)),0.),.65)*(1.-.2*y);float x=q.x;
 if(abs(x)>hw||y<.03||y>.985)discard;
 float rach=smoothstep(.03,.0,abs(x));float barb=.5+.5*sin(y*30.-abs(x)*34.);
 vec3 n=normalize(vec3(sign(x)*.55*(abs(x)/max(hw,.01)),0.,1.));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.8+vMix).r*.7+abs(x)/max(hw,.01)*.3,vK*1.05-.05,.08);if(er*vA<.02)discard;
 vec3 base=mix(${colA},${colB},smoothstep(.25,.95,y));
 vec3 c=styRampOf(base,clamp(.3+.52*l-.1*barb,0.,1.))*styTint(l);c=mix(c,vec3(.95,.92,.86),rach*.45);
 gl_FragColor=vec4(c,er*vA);}`;
// corazón (sprite) iluminado como un caramelo; col = color GLSL
const SDH=`float sdH(vec2 p){p.x=abs(p.x);if(p.y+p.x>1.)return sqrt(dot(p-vec2(.25,.75),p-vec2(.25,.75)))-.35355;
 return sqrt(min(dot(p-vec2(0.,1.),p-vec2(0.,1.)),dot(p-.5*max(p.x+p.y,0.),p-.5*max(p.x+p.y,0.))))*sign(p.x-p.y);}`;
const HEART_P=(col)=>S.PV+SDH+`void main(){vec2 q=styPC()-.5;vec2 p=vec2(q.x,q.y+.42)*1.32;float d=sdH(p);if(d>0.)discard;
 vec2 qq=q*2.;vec3 n=normalize(vec3(qq*.9,sqrt(max(.05,1.-dot(qq*.9,qq*.9)))));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.7+vMix).r*.7-d*1.5,vK*1.05-.05,.08);if(er*vA<.02)discard;
 float hl=step(length(q-vec2(-.13,.12)),.065);
 vec3 c=styRampOf(${col},clamp(.32+.52*l,0.,1.))*styTint(l);c=mix(c,vec3(1.,.95,.95),hl*.8);
 gl_FragColor=vec4(c,er*vA*smoothstep(0.,-.03,d));}`;
// confeti: rectángulo que voltea (se estrecha con vR), colores de feria
const CONFETTI_P=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float w=.12+.3*abs(cos(vR*1.7));
 if(abs(q.x)>w||abs(q.y)>.2)discard;if(vA<.02)discard;
 vec3 col=.55+.45*cos(6.2832*(vMix*3.+vec3(0.,.33,.67)));col=mix(col,uC1,.25);
 float l=.55+.45*step(0.,cos(vR*1.7));gl_FragColor=vec4(col*(.55+.5*l)*styTint(l),vA);}`;
// sello en el suelo con dibujo propio (energía suave); uP = erosión
const GLYPH=(draw,k=.8)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*${f(k)});}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión; heart = forma de corazón
const STAIN=(col,alpha=.6,heart=false)=>(heart?SDH:'')+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;
 float m=${heart?`smoothstep(.04,-.04,sdH(vec2(p.x,-p.y+.42)*1.35)+(n-.5)*.12)`:`smoothstep(.8,.66,r+(n-.5)*.5)`};if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// billboard de energía con un dibujo SDF (anillo de corazón, sello…); uP = progreso, uA = alfa
const SIGIL=(draw)=>`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);float m=0.;${draw}
 if(m<.02)discard;float nz=styNoise(vUv*1.3+uP*.2).r;gl_FragColor=vec4(styRamp(.5+.45*m)*(.9+.5*m),m*uA*(.75+.25*nz));}`;
// humo oscuro (materia) en mezcla normal
const SMOKE=(col,bias=-.05)=>S.MATTER_FS(C.puff,{relief:4,col,bias});
const defs=[];

// =====================================================================
// 1 · CUPID (Early Bird) — corazones se reúnen sobre la espalda y forman un arco dorado de Cupido; la cuerda se tensa,
//     la flecha con punta de corazón sale en arco dejando corazones y destellos, se clava en el rival (estallido en forma
//     de corazón, esquirlas) y le hace sangrar en dos pulsos (Sangrado 2 turnos). ti 0,78 s
// =====================================================================
defs.push({key:"sty_beCupid",name:"Cupid (estilizado)",dur:1.9,ti:0.78,pal:P_CUPID,tier:2,stylized:true,...ZONES,
  phases:[["Corazones",0],["Tensión",0.2],["Disparo",0.38],["Impacto",0.78],["Desangrado",0.95],["Fin",1.55]],
build(a){
  const L=a.L,TP=0.2,TL=0.38,TI=0.78,B1=0.95,B2=1.3,HA=0.75;
  const BC=V3(-3.45,2.45,0.15), R=0.62, TIP=[0.309,0.951];
  const E=V3(3.02,1.3,0.12);                            // punta clavada (pecho del rival)
  const bow=new THREE.Group(); bow.position.copy(BC); L.mesh.add(bow);
  const gold=SM(`float w=smoothstep(.45,.55,fract(vUv.x*14.));base=mix(vec3(.72,.38,.06),vec3(.86,.12,.32),w*step(.35,abs(vUv.x-.5)));lb=-.08+.05*w;`,{hot:'vec3(1.,.5,.6)'});
  const limb=new THREE.Mesh(new THREE.TorusGeometry(R,0.075,12,48,Math.PI*0.8).rotateZ(-Math.PI*0.4),gold); bow.add(limb);
  const grip=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,10).scale(1,1.6,1),SM(`base=vec3(.9,.2,.35);`)); grip.position.x=R; bow.add(grip);
  const wingL=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.32),S.mat(WING_FS('vec3(1.,.62,.74)','vec3(.88,.3,.5)','vec3(.6,.12,.3)'),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  wingL.position.set(R+0.05,0.18,0); wingL.rotation.z=1.2; bow.add(wingL);
  const wingR=wingL.clone(); wingR.position.y=-0.18; wingR.rotation.z=-1.2+Math.PI; bow.add(wingR);
  const strM=SM(`base=vec3(1.,.9,.95);`,{hot:'vec3(1.,.6,.7)',rim:0});
  const strA=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,1,5),strM), strB=strA.clone(); bow.add(strA,strB);
  const tipA=V3(R*TIP[0],R*TIP[1],0), tipB=V3(R*TIP[0],-R*TIP[1],0);
  const seg=(m,p,q)=>{m.position.copy(p).add(q).multiplyScalar(0.5);tmp.copy(q).sub(p);m.scale.set(1,Math.max(tmp.length(),0.001),1);
    m.quaternion.setFromUnitVectors(tmp3.set(0,1,0),tmp.normalize());};
  // flecha: astil dorado, punta de corazón extruida (apunta a +x) y plumas de cola rosas
  const arrow=new THREE.Group(); L.mesh.add(arrow);
  const shaftM=SM(`base=mix(${GOLD},vec3(.8,.5,.2),.3*smoothstep(.4,.6,fract(vUv.y*9.)));`,{hot:'vec3(1.,.55,.6)'});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,1.0,8).rotateZ(Math.PI/2).translate(-0.62,0,0),shaftM); arrow.add(shaft);
  const hs=new THREE.Shape(); hs.moveTo(0,-0.16); hs.bezierCurveTo(-0.05,-0.08,-0.2,0.0,-0.2,0.1); hs.bezierCurveTo(-0.2,0.2,-0.07,0.24,0,0.14);
  hs.bezierCurveTo(0.07,0.24,0.2,0.2,0.2,0.1); hs.bezierCurveTo(0.2,0.0,0.05,-0.08,0,-0.16);
  const heartGeo=new THREE.ExtrudeGeometry(hs,{depth:0.07,bevelEnabled:true,bevelThickness:0.03,bevelSize:0.025,bevelSegments:2,curveSegments:10}).translate(0,0,-0.035).rotateZ(Math.PI/2).translate(-0.12,0,0);
  const heartM=SM(`base=vec3(.92,.1,.28);lb=.04;`,{hot:'vec3(1.,.45,.6)',rim:.35});
  const head=new THREE.Mesh(heartGeo,heartM); arrow.add(head);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.16),S.mat(TAIL_FS('vec3(1.,.55,.72)','vec3(.75,.15,.35)'),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  for(const r of [0,Math.PI/2]){const m=fl.clone();m.rotation.x=r;m.position.x=-1.0;arrow.add(m);}
  const arrowMats=[shaftM,heartM];
  // trayectoria de la punta
  const A1=V3(BC.x+1.6*(R*TIP[0]+1.08),BC.y,BC.z);
  const tipAt=(k,o)=>o.set(A1.x+(E.x-A1.x)*k,A1.y+(E.y-A1.y)*k+4*HA*k*(1-k),A1.z+(E.z-A1.z)*k+0.35*Math.sin(Math.PI*k));
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 A1=${v3(A1)};const vec3 E=${v3(E)};const vec3 BC=${v3(BC)};
  vec3 tipAt(float k){return vec3(A1.x+(E.x-A1.x)*k,A1.y+(E.y-A1.y)*k+4.*${f(HA)}*k*(1.-k),A1.z+(E.z-A1.z)*k+.35*sin(3.14159*k));}`;
  // corazones que se reúnen en el arco (0 → TP)
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x*.08;float u=clamp((uT-s)/.3,0.,1.);float an=aSeed.y*6.2832;
   vec3 p0=BC+vec3(cos(an)*1.4,sin(an)*1.1,(aSeed.z-.5)*1.2);vec3 p=mix(p0,BC+vec3(.4,0.,0.),u*u)+vec3(0.,sin(u*3.14)*.3,0.);
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=sin(uT*6.+aSeed.w*6.)*.4;put(p,.5+.2*aSeed.w);}`,HEART_P('vec3(1.,.32,.5)'));
  // estela: corazoncitos que caen y destellos que titilan
  S.pts(L.part,22,VV+K+`void main(){float k=aSeed.x;float s=TL+k*(TI-TL);float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=tipAt(k)+rnd()*.12+vec3(0.,-.5*t*t+.15*t,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=sin(t*5.+aSeed.w*6.)*.5;
   put(p,(.34+.16*aSeed.w)*(1.-.3*age));}`,HEART_P('vec3(1.,.42,.6)'));
  S.pts(L.part,26,VV+K+`void main(){float k=aSeed.x;float s=TL+k*(TI-TL);float life=.3+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=tipAt(k)+rnd()*.18;vA=(age>0.&&age<1.)?(1.-age):0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.2+.12*aSeed.z);}`,
   S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // impacto: esquirlas de corazón despedidas
  S.pts(L.part,14,VV+K+`void main(){float s=TI;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.5,.2))*(2.2+2.*aSeed.z);vec3 p=E+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.36+.16*aSeed.w);}`,HEART_P('vec3(.95,.18,.38)'));
  // desangrado: dos pulsos de gotas
  S.pts(L.part,24,VV+K+`void main(){float pul=step(.5,aSeed.x);float s=mix(${f(B1)},${f(B2)},pul)+aSeed.y*.04;float life=.5+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.9,0.))*(1.4+1.2*aSeed.w);vec3 p=E+vec3(.1,0.,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159+atan(v.x,v.y);put(p,.16+.08*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  // estallido en forma de corazón (billboard) y anillo de pincel
  const burst=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),S.mat(SDH+`void main(){vec2 p=(vUv-.5)*2.;float d=sdH(vec2(p.x,p.y+.85)*.85/(.35+.75*uP));
   float rim=smoothstep(.11,0.,abs(d));float fill=smoothstep(0.,-.4,d)*.45;float m=(rim+fill)*(1.-uP*uP);if(m<.02)discard;
   vec3 c=mix(vec3(.62,.02,.18),vec3(1.,.3,.48),rim);gl_FragColor=vec4(c*(1.+.3*rim),min(m,1.)*uA);}`,{},{mode:'matter',depthTest:false}));
  L.mesh.add(burst);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.71}), ring=S.groundRing(L.decal,2.6), shadow=S.contactShadow(L.decal,0.8);
  const stain=groundPlane(1.5,TX,0.024,S.mat(STAIN(BLOOD,.55,true),{},{mode:'matter'})); L.decal.add(stain);
  const bleed=S.status(a,'bleed',[target],B1,1.88);
  a.pose=function(te,o){
    const ia=te-TI, form=e3(ss(0.0,TP,te)), gone=ss(TL+0.1,TL+0.4,te);
    // arco: aparece, se tensa y se desvanece tras el disparo
    bow.visible=gone<1; bow.scale.setScalar(Math.max(1.6*form*(1-0.3*gone),0.001));
    bow.rotation.z=0.12*Math.sin(te*3)-0.1*ss(TP,TL,te); bow.position.y=BC.y+0.06*Math.sin(te*4);
    for(const m of [gold,heartM,strM]) m.uniforms.uK.value=0.5*ss(TP,TL,te)*(1-ss(TL,TL+0.1,te));
    gold.uniforms.uQ.value=strM.uniforms.uQ.value=-0.1+1.1*gone;
    wingL.material.uniforms.uQ.value=-0.1+1.1*gone;
    wingL.rotation.z=1.2+0.25*Math.sin(te*18); wingR.rotation.z=-1.2+Math.PI-0.25*Math.sin(te*18);
    const pull=0.36*ss(TP,TL,te)*(1-ss(TL,TL+0.04,te))-0.06*Math.sin(cl((te-TL)/0.2)*Math.PI*3)*Math.exp(-Math.max(te-TL,0)*8)*(te>TL?1:0);
    const nock=tmp2.set(R*TIP[0]-pull,0,0);
    seg(strA,tipA,nock); seg(strB,nock,tipB);
    // flecha: encajada en la cuerda → vuelo en arco → clavada (vibra) → se consume
    if(te<TL){arrow.position.set(BC.x+1.6*(nock.x+1.08),bow.position.y,BC.z);orient(arrow,tmp.set(1,0.04,0));arrow.scale.setScalar(Math.max(1.6*form,0.001));}
    else if(te<TI){const k=(te-TL)/(TI-TL);tipAt(k,arrow.position);tipAt(Math.min(k+0.02,1),tmp);orient(arrow,tmp.sub(arrow.position),k*6);arrow.scale.setScalar(2.4);}
    else{const q=Math.exp(-ia*7)*Math.sin(ia*70)*0.06;arrow.position.copy(E);orient(arrow,tmp.set(1,-0.45+q,0.05));arrow.scale.setScalar(2.4);}
    arrow.visible=te>0.12;
    const aq=-0.1+1.1*ss(TI+0.45,TI+0.75,te); for(const m of arrowMats)m.uniforms.uQ.value=aq; fl.material.uniforms.uQ.value=aq;
    arrow.children.forEach(c=>{if(c.material&&c.material.uniforms&&c.material.uniforms.uQ)c.material.uniforms.uQ.value=aq;});
    heartM.uniforms.uK.value=Math.max(heartM.uniforms.uK.value,0.7*hitE(ia,5));
    shadow.pose(arrow.position.x,0,0.7,te>TL&&te<TI?0.4:0);
    spark.pose(ia,E,1.1); ring.pose(ia,TX,0,0.45,1);
    towardCam(burst.position,E,0.4); billboard(burst,0); const bp=cl(ia/0.4); burst.visible=ia>=0&&bp<1;
    burst.material.uniforms.uP.value=e3(bp); burst.material.uniforms.uA.value=1;
    stain.visible=te>B1; stain.scale.setScalar(0.5+0.5*e3((te-B1)/0.3)+0.15*e3((te-B2)/0.25)); set(stain,te>B1?-0.1+1.1*ss(1.55,1.9,te):0,1);
    recoil(ia,0.24); const p2=hitE(te-B2,10)*(te>B2?1:0); target.rotation.z-=0.06*p2;
    const env=bleed.pose(te); S.statusGlow(o,[bleed]);
    glowOf(target,COL.setRGB(0.9,0.15,0.25),0.35*hitE(te-B1,6)*(te>B1?1:0)+0.35*p2);
    if(te<TL){o.g.copy(bow.position);o.gs=0.8*form;o.ga=0.12+0.18*ss(TP,TL,te);o.li=1.5*form;}
    else if(ia<0){o.g.copy(arrow.position);o.gs=0.6;o.ga=0.15;o.li=1.4;}
    else{o.g.copy(E);o.gs=1.3+2*ia;o.ga=0.4*Math.exp(-ia*8);o.li=4.5*Math.exp(-ia*5);}
    if(ia<0){o.ia=ia;o.c.copy(arrow.position);o.shake=0;o.dist=0.3;o.flash=0.5;}
    else{o.ia=ia;o.c.copy(E);o.shake=0.8;o.dist=1;o.flash=0.7;}
    o.em=Math.max(o.em||0,0.25*env);
  };
}});

// =====================================================================
// 2 · BALLOON — un globo de feria de gajos rosa, crema y oro se infla en la espalda, sube en arco y se planta sobre el
//     rival; se hincha de más y revienta con confeti y jirones: la cesta cae y el rival queda encogido de Miedo
//     (jirones violeta en la cabeza, gotas de sudor, temblor). ti 1,15 s
// =====================================================================
defs.push({key:"sty_beBalloon",name:"Balloon (estilizado)",dur:2.2,ti:1.15,pal:P_BALLOON,tier:2,stylized:true,...ZONES,
  phases:[["Inflado",0],["Ascenso",0.35],["Sobre el rival",0.85],["Estallido",1.15],["Miedo",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.35,TA=0.85,TI=1.15,TM=1.35,BS=1.45;
  const S0=V3(-3.95,2.9,0.15), CP=V3(-0.4,5.0,0.7), P1=V3(TX-0.3,3.0,0.75);
  const bal=new THREE.Group(); L.mesh.add(bal); bal.scale.setScalar(1.7);
  const prof=[];for(let i=0;i<=22;i++){const th=-1.25+i/22*(1.25+Math.PI/2);prof.push(new THREE.Vector2(Math.max(0.55*Math.cos(th)*(th<0?1+th*0.3:1),0.001),0.55*Math.sin(th)*(th<0?1.25:1)));}
  const envM=SM(`float g=atan(vP.z,vP.x)/6.2832*12.+6.;float id=mod(floor(g),3.);float e=fract(g);
   base=id<.5?vec3(.93,.25,.45):(id<1.5?vec3(.98,.9,.74):vec3(1.,.66,.16));
   float seam=smoothstep(.07,.0,min(e,1.-e));float belt=band(vP.y,-.08,.045)+band(vP.y,.3,.03);
   base=mix(base,vec3(.5,.1,.26),max(seam*.55,min(belt,1.)*.85));lb=.04;`,{hot:'vec3(1.,.45,.55)',nzs:'vec2(3.,2.)'});
  const env=new THREE.Mesh(new THREE.LatheGeometry(prof,30),envM); bal.add(env);
  const basM=SM(`float w=step(.5,fract(vUv.x*8.+step(.5,fract(vUv.y*5.))*.5));base=mix(${WOOD},vec3(.72,.5,.28),w*.6);`,{rim:.1});
  const basket=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.13,0.22,10),basM); basket.position.y=-1.05; bal.add(basket);
  const ropeM=SM(`base=vec3(.45,.3,.18);`,{rim:0});
  for(let i=0;i<4;i++){const an=i*Math.PI/2+0.78,r=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.36,4),ropeM);
    r.position.set(Math.cos(an)*0.13,-0.8,Math.sin(an)*0.13);r.rotation.set(Math.sin(an)*0.12,0,-Math.cos(an)*0.12);bal.add(r);}
  const fall=new THREE.Group(); L.mesh.add(fall); fall.scale.setScalar(1.7); const basket2=basket.clone(); fall.add(basket2);
  const K=`const float TF=${f(TF)};const float TA=${f(TA)};const float TI=${f(TI)};const float TM=${f(TM)};const vec3 P1=${v3(P1)};const vec3 S0=${v3(S0)};`;
  // inflado: aire cálido que sube a la envoltura; quemador: llamita bajo la boca
  S.pts(L.part,10,VV+K+`void main(){float life=.3;float k=uT/life+aSeed.x;float age=fract(k);float on=step(uT,TI);
   vec3 b=uT<TF?S0:P1;vec3 p=b+vec3((aSeed.y-.5)*.12,-.92+age*.32,(aSeed.z-.5)*.12);
   vA=on*sin(age*3.14);vK=smoothstep(.3,1.,age);vR=(aSeed.w-.5)*.5;put(p,.2*(1.-.5*age));}`,S.ENERGY_FS(C.flame,{gain:1.3}),{mode:'energy'});
  // estallido: confeti que llueve, jirones de la envoltura y chispas
  S.pts(L.part,120,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=1.+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.45,0.))*(3.4+3.2*aSeed.z);vec3 p=P1+v*t*exp(-t*1.6)+vec3(sin(t*4.+aSeed.w*6.)*.2,-1.6*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-smoothstep(.8,1.,age):0.;vK=0.;vR=t*(6.+8.*aSeed.w)+aSeed.y*6.;put(p,.34+.16*aSeed.w);}`,CONFETTI_P);
  S.pts(L.part,24,VV+K+`void main(){float s=TI;float life=.65+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.3,0.))*(2.+2.*aSeed.z);vec3 p=P1+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.28+t*7.;put(p,.6+.3*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'(mix(vec3(.93,.25,.45),vec3(1.,.66,.16),step(.5,fract(vMix*7.))))'}));
  // miedo: jirones violeta oscuro en torno a la cabeza y gotas de sudor
  S.pts(L.part,16,VV+K+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TM)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float on=step(TM,uT)*(1.-smoothstep(2.0,2.2,uT));float an=r.x*6.2832+age*3.;
   vec3 p=vec3(${f(TX)},1.55,0.)+vec3(cos(an)*(.45+.15*r.y),age*.7,sin(an)*(.45+.15*r.y));
   vA=on*smoothstep(0.,.15,age);vK=smoothstep(.35,1.,age);vR=an;put(p,(.42+.2*r.z)*(.7+.5*age));}`,SMOKE(MIAS));
  S.pts(L.part,8,VV+K+`void main(){float life=.45;float k=(uT-TM)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float on=step(TM,uT)*(1.-smoothstep(1.95,2.15,uT));float sd=r.x<.5?-1.:1.;float t=age*life;
   vec3 p=vec3(${f(TX)}+sd*.32,1.85,.25)+vec3(sd*.9*t,1.6*t-5.*t*t,0.);vA=on*(p.y>0.?1.:0.);vK=smoothstep(.7,1.,age);vR=3.14159-sd*.6;put(p,.17);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'vec3(.55,.8,1.)'}));
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.33}), ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.0), shadow=S.contactShadow(L.decal,1.2);
  const fearPool=groundPlane(1.6,TX,0.022,S.mat(STAIN(MIAS,.45),{},{mode:'matter'})); L.decal.add(fearPool);
  a.pose=function(te,o){
    const ia=te-TI, inf=e3(te/TF);
    if(te<TF)bal.position.copy(S0).add(tmp.set(0,0.25*inf,0));
    else if(te<TA)qbz(S0,CP,P1,ss(TF,TA,te),bal.position);
    else bal.position.copy(P1).add(tmp.set(0.05*Math.sin(te*5),0.06*Math.sin(te*3.3),0));
    const over=ss(TA+0.05,TI,te), wob=0.04*Math.sin(te*38)*over;
    env.scale.set((0.25+0.75*inf)*(1+0.32*over+wob),(0.2+0.8*inf)*(1+0.25*over-wob),(0.25+0.75*inf)*(1+0.32*over+wob));
    bal.rotation.z=0.12*Math.sin(te*2.4)*(te>TF?1:0)-0.15*ss(TF,TF+0.2,te)*(1-ss(TA-0.2,TA,te));
    bal.visible=ia<0&&te>0.02; envM.uniforms.uK.value=0.35*over*(0.6+0.4*Math.sin(te*30));
    // la cesta cae al reventar, rebota en la cabeza y se consume en el suelo
    fall.visible=ia>=0&&ia<0.9;
    if(ia>=0){const t=ia;let y=Math.max(0.19,P1.y-1.8+1.2*t-7*t*t),x=P1.x-0.7*t;
      fall.position.set(x,y,P1.z);fall.rotation.z=-ia*4*(ia>0.12?1:0);basM.uniforms.uQ.value=-0.1+1.1*ss(0.6,0.9,ia);}
    else basM.uniforms.uQ.value=-1;
    shadow.pose(ia<0?bal.position.x:fall.position.x,0,0.9,ia<0?(te>TF?0.35:0.2):0.3*(1-ss(0.5,0.9,ia)));
    spark.pose(ia,tmp2.copy(P1),0.8); ring.pose(ia,TX,0,0.5,1); ring2.pose(ia-0.12,TX,0,0.4,0.8);
    // rival: golpe de la cesta y después miedo (se encoge y tiembla)
    const bonk=hitE(ia,9)*(ia>0?1:0);
    const fear=ss(TM,TM+0.15,te)*(1-ss(2.0,2.2,te));
    target.position.x=TX+0.03*Math.sin(te*70)*fear+0.1*bonk; target.rotation.z=-0.1*bonk;
    target.scale.set(1+0.08*bonk-0.06*fear,1-0.16*bonk-0.1*fear,1+0.08*bonk-0.06*fear);
    fearPool.visible=fear>0; fearPool.scale.setScalar(0.6+0.4*fear); set(fearPool,-0.1+1.1*ss(1.95,2.2,te),fear);
    glowOf(target,COL.setRGB(0.4,0.15,0.6),0.3*fear);
    if(ia<0){o.g.copy(bal.position);o.gs=1.0*inf;o.ga=0.1+0.2*over;o.li=1.2+2*over;o.ia=ia;o.c.copy(bal.position);o.shake=0;o.dist=0.3;o.flash=0.3;}
    else{o.g.copy(P1);o.gs=2+3*ia;o.ga=0.45*Math.exp(-ia*7);o.li=6*Math.exp(-ia*5);o.ia=ia;o.c.set(TX,1.25,0.1);o.shake=0.9;o.dist=1;o.flash=0.6;}
    o.em=Math.max(o.em||0,0.22*fear); if(fear>0.01)o.emc.setRGB(0.45,0.2,0.65);
  };
}});

// =====================================================================
// 3 · KINGFISHER (aliado) — un martín pescador de agua se forma en la espalda, rodea dos veces al aliado dejando una
//     cinta de agua, sube y se zambulle de cabeza a sus pies (corona de salpicadura); de la salpicadura nacen seis
//     plumas-cuchilla que giran alrededor del aliado: la Represalia (devuelve el próximo golpe). ti 1,5 s
// =====================================================================
const FEATHER_M=(colA,colB)=>`uniform float uQ;uniform float uK;
void main(){float y=vUv.y;float x=vUv.x-.5;float hw=.48*pow(max(sin(3.1416*clamp(y,0.,1.)),0.),.6)*(1.-.18*y);
 if(abs(x)>hw||y<.02)discard;
 float wr=abs(x)/max(hw,.01);float fe=fract(y*6.+wr*.9);if(smoothstep(.44,.49,abs(fe-.5))*smoothstep(.5,.85,wr)>.5)discard;
 float rach=smoothstep(.035,.0,abs(x));
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;n=normalize(n+vec3(sign(x)*.6*wr,.15,0.));float l=styLight(n,stySunV());
 float nz=styNoise(vUv*vec2(1.,3.)+.17).r;if(styErode(nz*.7+wr*.3,uQ,.05)<.5)discard;
 float barb=.5+.5*sin(y*60.-wr*20.);
 vec3 base=mix(${colA},${colB},smoothstep(.15,.95,y));base=mix(base,vec3(.96,.93,.88),rach*.6);
 vec3 c=styRampOf(base,clamp(.26+.54*l-.08*barb,0.,1.))*styTint(l);c+=uC1*uK;gl_FragColor=vec4(c,1.);}`;
const YA=V3(0,1,0), MB=new THREE.Matrix4(), BX=V3(0,0,0), BZ=V3(0,0,0);
// eje y del objeto hacia d y la cara del plano hacia la cámara (plumas en vuelo, nunca de canto)
function faceAlong(g,d){const y=tmp3.copy(d).normalize();BZ.copy(VFX.camera.position).sub(g.position).normalize();
  BX.crossVectors(y,BZ);if(BX.lengthSq()<1e-6)BX.set(1,0,0);BX.normalize();BZ.crossVectors(BX,y);MB.makeBasis(BX,y,BZ);g.quaternion.setFromRotationMatrix(MB);}
const aimY=(m,d)=>m.quaternion.setFromUnitVectors(YA,tmp3.copy(d).normalize());
defs.push({key:"sty_beKingfisher",name:"Kingfisher (estilizado)",dur:2.4,ti:1.5,pal:P_KING,tier:2,stylized:true,allies:1,...ZONES,
  phases:[["Forma",0],["Guardia",0.28],["Ascenso",0.95],["Zambullida",1.2],["Represalia",1.5],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.28,TG=0.95,TZ=1.2,TI=1.5,R=1.0,H=1.35;
  const B0=V3(-3.85,1.8,0.1), TOP=V3(AP.x,3.9,AP.z);
  const bird=makeBird(L.mesh,{top:'vec3(.03,.36,.6)',belly:'vec3(.92,.42,.08)',cov:'vec3(.04,.48,.72)',prim:'vec3(.03,.2,.45)',
    dark:'vec3(.02,.12,.26)',beak:'vec3(.13,.11,.13)',beakLen:0.36,s:1.35});
  // posición del ave en cada instante
  const C0=V3(AP.x-R,H,AP.z);
  const pos=(te,o)=>{
    if(te<TF)return o.copy(B0).add(tmp3.set(0,0.2*e3(te/TF),0));
    if(te<TF+0.18){const u=ss(TF,TF+0.18,te);return o.lerpVectors(tmp3.copy(B0).setY(B0.y+0.2),C0,u);}
    if(te<TG){const u=(te-TF-0.18)/(TG-TF-0.18),an=Math.PI+u*Math.PI*4;return o.set(AP.x+Math.cos(an)*R,H+0.25*Math.sin(u*Math.PI*2),AP.z-Math.sin(an)*R*0.8);}
    if(te<TZ){const u=ss(TG,TZ,te);return o.set(AP.x+(-R)*(1-u),H+(TOP.y-H)*u,AP.z);}
    if(te<TI){const u=(te-TZ)/(TI-TZ);return o.set(AP.x,TOP.y-(TOP.y-0.2)*u*u,AP.z);}
    return o.set(AP.x,0.2,AP.z);};
  const K=`const float TF=${f(TF)};const float TG=${f(TG)};const float TI=${f(TI)};const vec3 AP=${v3(AP)};const vec3 B0=${v3(B0)};const float R=${f(R)};const float H=${f(H)};
  vec3 orb(float u){float an=3.14159+u*12.566;return vec3(AP.x+cos(an)*R,H+.25*sin(u*6.283),AP.z-sin(an)*R*.8);}`;
  // forma: gotas de agua que se reúnen en el ave
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*.05;float u=clamp((uT-s)/(TF-.02),0.,1.);float an=aSeed.y*6.2832;
   vec3 p=mix(B0+vec3(cos(an)*1.3,.2+sin(an)*.9,(aSeed.z-.5)*1.4),B0+vec3(0.,.2,0.),u*u);
   vA=(u<1.&&uT>s)?1.:0.;vK=0.;vR=atan(p.x-B0.x,p.y-B0.y);put(p,.24);}`,S.MATTER_FS(C.drop,{relief:4,col:WATER}));
  // cinta de agua del vuelo en círculos (energía) y gotas que caen de ella
  S.pts(L.part,40,VV+K+`void main(){float u=aSeed.x;float s=TF+.18+u*(TG-TF-.18);float life=.45+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=orb(u)+rnd()*.06;vA=(age>0.&&age<1.)?1.-age:0.;vK=smoothstep(.4,1.,age);vR=u*12.;put(p,.34*(1.-.5*age));}`,
   S.ENERGY_FS(C.slash,{gain:1.1}),{mode:'energy'});
  S.pts(L.part,18,VV+K+`void main(){float u=aSeed.x;float s=TF+.18+u*(TG-TF-.18);float t=max(uT-s,0.);float life=.6;float age=t/life;
   vec3 p=orb(u)+vec3(0.,-3.5*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.15);}`,
   S.MATTER_FS(C.drop,{relief:4,col:WATER}));
  // zambullida: corona de salpicadura y gotas
  S.pts(L.part,30,VV+K+`void main(){float s=TI;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.2*aSeed.w),3.2+2.2*aSeed.x,sin(an)*(1.+1.2*aSeed.w));
   vec3 p=vec3(AP.x,.1,AP.z)+v*t+vec3(0.,-9.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159+atan(v.x,v.y);
   put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:WATER}));
  // seis plumas-cuchilla de la represalia
  const blades=[]; const bm=S.mat(FEATHER_M('vec3(.97,.52,.14)','vec3(.06,.45,.74)'),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.34,1.05).translate(0,0.525,0),bm);L.mesh.add(m);blades.push(m);}
  const crown=groundPlane(2.6,AP.x,0.03,S.mat(GLYPH(`float sp=band(r,.78,.06)+band(r,.56,.03);float k=fract(an/6.2832*6.+.0);
    float tri=smoothstep(.06,0.,abs(r-.67-.12*(1.-abs(2.*k-1.))))*0.;m=m*.55+sp*.9+smoothstep(.04,0.,abs(abs(2.*k-1.)*.18-(r-.6)))*step(.6,r)*step(r,.8);`),{},{mode:'energy'}));
  crown.position.z=AP.z; L.decal.add(crown);
  const ring=S.groundRing(L.decal,2.8), spark=S.hitSpark(L.mesh,1.4,{seed:0.52}), shadow=S.contactShadow(L.decal,0.9);
  const puddle=groundPlane(1.8,AP.x,0.024,S.mat(STAIN(WATER,.5),{},{mode:'matter'})); puddle.position.z=AP.z; L.decal.add(puddle);
  a.pose=function(te,o){
    const ia=te-TI;
    pos(te,bird.g.position); pos(te+0.012,tmp2); pos(Math.max(te-0.012,0),tmp); tmp2.sub(tmp);
    const fold=ss(TZ,TZ+0.08,te);
    if(te<TF)orient(bird.g,tmp2.set(1,0.1,0)); else orient(bird.g,tmp2.lengthSq()>1e-6?tmp2:tmp.set(1,0,0),te<TG&&te>TF+0.18?0.45:0);
    bird.flap(fold>0?-0.9*fold+0.15*(1-fold):0.25+0.85*Math.sin(te*34));
    bird.scale(1.35*e3(te/TF)); bird.g.visible=ia<0.02&&te>0.01; bird.q(-1); bird.k(0.25*fold);
    // represalia: plumas que suben de la salpicadura y giran, con las puntas hacia fuera
    const up=e3(ss(TI,TI+0.3,te)), out=ss(2.12,2.4,te);
    blades.forEach((m,i)=>{const an=i/6*Math.PI*2+te*1.3;const rr=0.8+0.12*up;
      m.position.set(AP.x+Math.cos(an)*rr,0.05+0.25*up,AP.z+Math.sin(an)*rr*0.9);
      aimY(m,tmp.set(Math.cos(an)*0.55,1,Math.sin(an)*0.55*0.9)); m.rotateY(Math.PI/2);
      m.scale.set(1,Math.max(up,0.001),1); m.visible=te>TI;});
    bm.uniforms.uQ.value=-0.1+1.1*out; bm.uniforms.uK.value=0.5*hitE(ia,4)+0.1;
    crown.visible=te>TI; set(crown,-0.1+1.1*out,ss(TI,TI+0.2,te)); crown.scale.setScalar(0.6+0.4*up); crown.rotation.y=te*0.8;
    puddle.visible=te>TI; puddle.scale.setScalar(0.5+0.5*e3(ia/0.25)); set(puddle,-0.1+1.1*ss(1.7,2.3,te),1);
    ring.pose(ia,AP.x,AP.z,0.5,1); spark.pose(ia,tmp.set(AP.x,0.6,AP.z),0.9);
    shadow.pose(bird.g.position.x,bird.g.position.z,0.8,ia<0&&te>TF?0.35:0);
    const al=allies[0].userData.m; al.emissive.setRGB(0.25,0.75,0.95); al.emissiveIntensity=0.5*hitE(ia,5)+0.18*up*(1-out);
    allies[0].scale.set(1+0.06*hitE(ia,8),1-0.08*hitE(ia,8),1+0.06*hitE(ia,8));
    if(ia<0){o.g.copy(bird.g.position);o.gs=0.7;o.ga=0.12;o.li=1.3;}
    else{o.g.set(AP.x,0.6,AP.z);o.gs=1.5+2*ia;o.ga=0.35*Math.exp(-ia*6);o.li=4*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(AP.x,ia<0?bird.g.position.y:0.6,AP.z);o.shake=0;o.dist=0;o.flash=0;
  };
}});

// =====================================================================
// 4 · LIL BRO — un huevo moteado aparece en la espalda, se agrieta y nace un polluelo amarillo que vuela hasta el rival
//     y le da dos picotazos (plumón en cada golpe); después vuelve y se deshace en dos chispas doradas que entran en el
//     lanzador (+PA). ti 0,95 s (segundo golpe 1,25 s)
// =====================================================================
defs.push({key:"sty_beLilBro",name:"Lil Bro (estilizado)",dur:2.3,ti:0.95,pal:P_CHICK,tier:2,stylized:true,...ZONES,
  phases:[["Huevo",0],["Eclosión",0.3],["Vuelo",0.32],["Carga",0.62],["Picotazo",0.95],["Segundo",1.25],["Fin",1.95]],
build(a){
  const L=a.L,TH=0.3,TO=0.62,TI=0.95,T2=1.25,TB=1.62,TE=1.9;
  const EG=V3(-3.9,2.15,0.1), HV=V3(TX-1.25,1.75,0.2), PK=V3(TX-0.42,1.45,0.15);
  const chick=makeBird(L.mesh,{chick:true,top:'vec3(1.,.8,.22)',belly:'vec3(1.,.93,.6)',cov:'vec3(1.,.82,.3)',prim:'vec3(.98,.62,.14)',
    dark:'vec3(.82,.42,.08)',beak:'vec3(.98,.45,.08)',beakLen:0.14,s:1.6});
  // huevo: crema con motas azules; uCr = grietas que crecen
  const eggM=S.mat(`uniform float uQ;uniform float uK;uniform float uCr;
   void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec2 uv=vUv*vec2(3.,2.);
    float sp=step(.72,styNoise(uv*1.3+.4).g);float cr=smoothstep(.03,.0,abs(fract(vUv.x*5.+sin(vUv.y*25.)*.06)-.5)-.0)*0.;
    float zig=abs(vP.y-.02-.05*abs(fract(atan(vP.z,vP.x)*1.6)*2.-1.));float crack=step(zig,.012)*step(.0,uCr-abs(atan(vP.z,vP.x))/3.1416);
    vec3 base=mix(vec3(.96,.92,.82),vec3(.42,.66,.86),sp*.8);
    vec3 c=styRampOf(base,clamp(.28+.55*l,0.,1.))*styTint(l);c=mix(c,vec3(.25,.15,.08),crack);c+=vec3(1.,.8,.4)*uK;gl_FragColor=vec4(c,1.);}`,
   {uQ:{value:-1},uK:{value:0},uCr:{value:0}},{mode:'solid'});
  const eggTop=new THREE.Mesh(new THREE.SphereGeometry(0.3,24,16,0,Math.PI*2,0,Math.PI*0.5).scale(1,1.3,1),eggM);
  const eggBot=new THREE.Mesh(new THREE.SphereGeometry(0.3,24,16,0,Math.PI*2,Math.PI*0.5,Math.PI*0.5).scale(1,1.3,1),eggM);
  eggBot.material=eggM; L.mesh.add(eggTop,eggBot);
  const K=`const float TI=${f(TI)};const float T2=${f(T2)};const float TH=${f(TH)};const float TB=${f(TB)};const vec3 PK=${v3(PK)};const vec3 EG=${v3(EG)};`;
  // plumón amarillo en cada picotazo
  S.pts(L.part,24,VV+K+`void main(){float s=step(.5,aSeed.x)>.5?T2:TI;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.6,0.))*(1.2+1.3*aSeed.z);vec3 p=PK+vec3(.25,0.,0.)+v*t*(1.-.5*min(t,1.))+vec3(sin(t*7.+aSeed.w*6.)*.12,-.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+sin(t*6.)*.8;put(p,.3+.14*aSeed.w);}`,
   FEATHER_P('vec3(1.,.92,.6)','vec3(1.,.72,.2)'));
  // eclosión: esquirlas de cáscara
  S.pts(L.part,10,VV+K+`void main(){float s=TH;float life=.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(1.4+1.*aSeed.z);vec3 p=EG+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.16+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'vec3(.95,.9,.8)'}));
  // +PA: dos chispas doradas que vuelven al lanzador
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TB+i*.06;float u=clamp((uT-s)/.3,0.,1.);
   vec3 a0=vec3(-1.6,2.3,.2),a1=vec3(-3.7,1.4,0.);vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*(.6+.3*i),(i-.5)*.6*sin(u*3.14159));
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*6.;put(p,.5);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  const s1=S.hitSpark(L.mesh,1.1,{seed:0.44}), s2=S.hitSpark(L.mesh,1.2,{seed:0.81}), poof=S.hitSpark(L.mesh,1.0,{seed:0.2});
  const ring=S.groundRing(L.decal,2.2), shadow=S.contactShadow(L.decal,0.7);
  const shell=[eggTop,eggBot];
  const cpos=(te,o)=>{
    if(te<TH)return o.copy(EG);
    if(te<TO){const u=ss(TH,TO,te);return qbz(EG,tmp3.set(-0.8,3.2,0.5),HV,u,o);}
    if(te<TI){const u=(te-TO)/(TI-TO);const wind=Math.sin(u*Math.PI)*0.35;return o.lerpVectors(HV,PK,Math.pow(u,3)).add(tmp3.set(-wind,0.25*wind,0));}
    if(te<T2){const u=(te-TI)/(T2-TI);const b=Math.sin(u*Math.PI);return o.copy(PK).add(tmp3.set(-0.7*b,0.3*b,0));}
    if(te<TB){const u=ss(T2,TB,te);return qbz(PK,tmp3.set(0.2,3.0,0.3),tmp2.set(-1.6,2.3,0.2),u,o);}
    return o.set(-1.6,2.3,0.2);};
  a.pose=function(te,o){
    const ia=te-TI, i2=te-T2, hatch=ss(TH-0.02,TH+0.02,te);
    // huevo: aparece, tiembla, se agrieta y sus mitades salen despedidas
    const ap=back(te/0.18);
    shell.forEach((m,i)=>{const t=Math.max(te-TH,0),dir=i?-1:1;
      m.position.set(EG.x+(i?-0.5:0.6)*t,EG.y+(i?-0.1:0.0)+dir*0.0+(t>0?(i?1.2:2.2)*t-6*t*t:0),EG.z+0.25*t);
      m.rotation.set(0,0,(i?-1:1)*(t*7)+0.12*Math.sin(te*40)*(1-hatch)*ss(0.12,TH,te));
      m.scale.setScalar(Math.max(1.5*ap,0.001)); m.visible=te<TH+0.55&&m.position.y>0.0;});
    eggM.uniforms.uCr.value=ss(0.12,TH,te); eggM.uniforms.uQ.value=-0.1+1.1*ss(TH+0.25,TH+0.55,te); eggM.uniforms.uK.value=0.4*ss(0.2,TH,te)*(1-hatch);
    // polluelo
    cpos(te,chick.g.position); cpos(te+0.012,tmp2); cpos(Math.max(te-0.012,0),tmp); tmp2.sub(tmp);
    const peck=te>TO&&te<TB; orient(chick.g,peck?tmp.set(1,-0.12,0):(tmp2.lengthSq()>1e-6?tmp2:tmp.set(1,0,0)));
    chick.flap(0.2+0.9*Math.sin(te*46)); chick.scale(1.6*back(cl((te-TH)/0.15))*(1-ss(TB-0.05,TB,te)));
    chick.g.visible=te>TH&&te<TB; chick.q(-1); chick.k(0.3*hitE(ia,8)*(ia>=0?1:0)+0.3*hitE(i2,8)*(i2>=0?1:0));
    poof.pose(te-TB,tmp.set(-1.6,2.3,0.2),0.8);
    s1.pose(ia,PK,0.95); s2.pose(i2,PK,1.05); ring.pose(ia,TX,0,0.4,0.8);
    shadow.pose(chick.g.position.x,chick.g.position.z,0.6,chick.g.visible?0.35:0);
    recoil(ia,0.18); const h2=hitE(i2,7)*(i2>=0?1:0); target.position.x+=0.16*h2; target.rotation.z-=0.15*h2;
    const pa=ss(TB+0.28,TB+0.34,te)*(1-ss(TB+0.4,TE+0.3,te)); glowOf(caster,COL.setRGB(1,0.78,0.25),0.5*pa);
    if(te<TO){o.g.copy(chick.g.position);o.gs=0.6;o.ga=0.1;o.li=1;}
    else if(ia<0){o.g.copy(chick.g.position);o.gs=0.6;o.ga=0.14;o.li=1.4;}
    else{o.g.copy(PK);o.gs=1.2+1.5*Math.min(ia,i2>0?i2:ia);o.ga=0.3*(Math.exp(-ia*8)+h2);o.li=3.5*(Math.exp(-ia*5)+h2);}
    o.ia=i2>=0?i2:ia;o.c.copy(PK);o.shake=ia<0?0:0.55;o.dist=ia<0?0.3:1;o.flash=0.6;
  };
}});

// =====================================================================
// 5 · RAVEN — plumas negras se arremolinan en la espalda y forman un cuervo de ojos rojos que grazna (ondas violeta),
//     remonta y cae en picado sobre el rival; estalla en plumas y deja sobre su cabeza el Gafe: una estrella de crítico
//     rota por una grieta violeta que gotea sombra. ti 1,2 s
// =====================================================================
defs.push({key:"sty_beRaven",name:"Raven (estilizado)",dur:2.2,ti:1.2,pal:P_RAVEN,tier:2,stylized:true,...ZONES,
  phases:[["Plumas",0],["Graznido",0.25],["Vuelo",0.45],["Picado",0.85],["Impacto",1.2],["Marca",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.25,TV=0.45,TP=0.85,TI=1.2,TM=1.35;
  const B0=V3(-3.8,2.25,0.1), UP=V3(TX-0.9,3.7,0.25), HIT=V3(TX-0.25,1.5,0.12), MK=V3(TX,2.55,0.1);
  const raven=makeBird(L.mesh,{top:'vec3(.12,.08,.2)',belly:'vec3(.2,.13,.3)',cov:'vec3(.16,.1,.27)',prim:'vec3(.07,.05,.13)',
    dark:'vec3(.36,.16,.52)',beak:'vec3(.22,.2,.25)',eye:'vec3(1.,.15,.12)',eyeHot:'vec3(1.,.08,.05)',beakLen:0.26,s:1.55});
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float TM=${f(TM)};const vec3 B0=${v3(B0)};const vec3 HIT=${v3(HIT)};const vec3 MK=${v3(MK)};`;
  // plumas negras que se arremolinan en el cuervo
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*.05;float u=clamp((uT-s)/(TF+.05),0.,1.);float an=aSeed.y*6.2832+u*5.;float rad=1.3*(1.-u*u);
   vec3 p=B0+vec3(cos(an)*rad,sin(an)*rad*.7,(aSeed.z-.5)*1.2*(1.-u));
   vA=(u<1.&&uT>s)?1.:0.;vK=smoothstep(.8,1.,u);vR=an+1.57;put(p,.42+.14*aSeed.w);}`,FEATHER_P('vec3(.1,.07,.16)','vec3(.32,.16,.46)'));
  // impacto: estallido de plumas negras
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.02;float life=.75+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(2.+2.4*aSeed.z);vec3 p=HIT+v*t*exp(-t*2.)+vec3(sin(t*5.+aSeed.w*6.)*.2,-.7*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.28+t*(3.+4.*aSeed.y);put(p,.42+.18*aSeed.w);}`,
   FEATHER_P('vec3(.1,.07,.16)','vec3(.34,.17,.5)'));
  // gafe: sombra que gotea de la marca
  S.pts(L.part,10,VV+K+`void main(){float life=.5;float k=(uT-TM)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float on=step(TM,uT)*(1.-smoothstep(1.95,2.2,uT));vec3 p=MK+vec3((r.x-.5)*.6,-.25-age*age*.9,(r.y-.5)*.2);
   vA=on;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.18+.06*r.z);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.3,.12,.42)'}));
  // graznido: tres arcos de sonido violeta
  const caws=[]; for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),S.mat(SIGIL(`float arc=smoothstep(.12,0.,abs(r-.25-.55*uP))*smoothstep(1.1,.5,abs(an));m=arc*(1.-uP);`),{},{mode:'energy',depthTest:false}));L.mesh.add(m);caws.push(m);}
  // marca del gafe: estrella de crítico (4 puntas) partida por una grieta, con aura oscura
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
    float star=abs(p.x)*abs(p.y);float st=1.-smoothstep(.0,.04,pow(abs(p.x),.6)+pow(abs(p.y),.6)-.82);
    float side=sign(p.x+p.y*.35+.05*sin(p.y*20.));vec2 q=p+vec2(side*.07*uP,-.03*uP*abs(side));
    float st2=1.-smoothstep(.0,.04,pow(abs(q.x),.6)+pow(abs(q.y),.6)-.82);
    float crack=smoothstep(.07,.0,abs(p.x+p.y*.35+.05*sin(p.y*20.)));
    float aura=smoothstep(1.,.3,r)*.35;
    vec3 gold=styRampOf(${GOLD},.55+.4*(1.-r));vec3 c=mix(gold,vec3(.18,.06,.26),.55*uP);
    float m=max(st2*(1.-crack*uP),0.);float a=m+aura*(1.-m);if(a<.02)discard;
    vec3 col=mix(vec3(.25,.08,.4),c,m);col=mix(col,vec3(.85,.4,1.),crack*uP*step(r,.9)*.8);
    gl_FragColor=vec4(col,a*uA);}`,{},{mode:'matter',depthTest:false}));
  L.mesh.add(mark);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.12}), ring=S.groundRing(L.decal,2.8), shadow=S.contactShadow(L.decal,1.0);
  const soot=groundPlane(1.7,TX,0.024,S.mat(STAIN(SOOT,.5),{},{mode:'matter'})); L.decal.add(soot);
  const rpos=(te,o)=>{
    if(te<TV)return o.copy(B0).add(tmp3.set(0,0.1*Math.sin(te*10),0));
    if(te<TP){const u=ss(TV,TP,te);return qbz(B0,tmp3.set(-0.5,4.6,0.4),UP,u,o);}
    const u=cl((te-TP)/(TI-TP));return o.lerpVectors(UP,HIT,u*u);};
  a.pose=function(te,o){
    const ia=te-TI, form=e3(te/TF);
    rpos(te,raven.g.position); rpos(te+0.012,tmp2); rpos(Math.max(te-0.012,0),tmp); tmp2.sub(tmp);
    if(te<TV)orient(raven.g,tmp.set(1,0.15+0.25*Math.sin(cl((te-TF)/0.2)*Math.PI)*(te>TF?1:0),0));
    else orient(raven.g,tmp2.lengthSq()>1e-6?tmp2:tmp.set(1,0,0));
    const dive=ss(TP,TP+0.1,te);
    raven.flap(dive>0?-0.7*dive+0.2*(1-dive):(te<TV?0.4+0.7*Math.sin(te*20):0.3+0.9*Math.sin(te*26)));
    raven.scale(1.55*form); raven.g.visible=ia<0.02; raven.q(-1); raven.k(0.25*dive);
    caws.forEach((m,i)=>{const t=te-TF-i*0.06,p=cl(t/0.35);m.visible=t>0&&p<1;
      towardCam(m.position,tmp.copy(raven.g.position).add(tmp3.set(0.55,0.15,0)),0.3);billboard(m,0);
      m.material.uniforms.uP.value=p;m.material.uniforms.uA.value=1;});
    const mk=ss(TM,TM+0.2,te)*(1-ss(1.95,2.2,te));
    towardCam(mark.position,tmp.copy(MK).add(tmp3.set(0,0.06*Math.sin(te*4),0)),0.3); billboard(mark,0.15*Math.sin(te*2));
    mark.visible=mk>0; mark.scale.setScalar(0.6+0.4*back(cl((te-TM)/0.25))); mark.material.uniforms.uA.value=mk; mark.material.uniforms.uP.value=ss(TM+0.15,TM+0.4,te);
    spark.pose(ia,HIT,1.15); ring.pose(ia,TX,0,0.45,1);
    soot.visible=ia>=0; soot.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(soot,-0.1+1.1*ss(1.7,2.2,te),1);
    shadow.pose(raven.g.position.x,raven.g.position.z,1.0,ia<0&&te>TV?0.3+0.2*dive:0);
    recoil(ia,0.28);
    glowOf(target,COL.setRGB(0.55,0.2,0.8),0.35*mk);
    if(ia<0){o.g.copy(raven.g.position);o.gs=0.8;o.ga=0.12+0.1*dive;o.li=1.2;o.ia=ia;o.c.copy(raven.g.position);o.shake=0;o.dist=0.3;o.flash=0.4;}
    else{o.g.copy(HIT);o.gs=1.6+2*ia;o.ga=0.4*Math.exp(-ia*7);o.li=4.5*Math.exp(-ia*5);o.ia=ia;o.c.copy(HIT);o.shake=0.9;o.dist=1;o.flash=0.6;}
    o.em=Math.max(o.em||0,0.25*mk); if(mk>0.01)o.emc.setRGB(0.55,0.2,0.8);
  };
}});

// =====================================================================
// 6 · TRI FEATHER (cruz) — tres plumas gigantes (rosa, violeta, azul) se abren en abanico tras la espalda, salen juntas
//     con estela de viento y se clavan en la cruz: una en el centro y dos en los brazos laterales; una ráfaga barre los
//     cuatro brazos y queda un sello en cruz. ti 1,0 s
// =====================================================================
defs.push({key:"sty_beTriFeather",name:"Tri Feather (estilizado)",dur:2.0,ti:1.0,pal:P_TRI,tier:2,stylized:true,zoneCaster:0.35,zoneTarget:TILE*1.6,
  phases:[["Despliegue",0],["Disparo",0.45],["Vuelo",0.5],["Bombardeo",1.0],["Cruz",1.1],["Fin",1.55]],
build(a){
  const L=a.L,TD=0.45,TL=0.5,TI=1.0,TC=1.1;
  const COLS=[['vec3(.98,.45,.7)','vec3(.72,.06,.38)'],['vec3(.7,.45,.98)','vec3(.34,.1,.7)'],['vec3(.42,.62,1.)','vec3(.08,.18,.72)']];
  const LAND=[V3(TX,0,0),V3(TX,0,TILE),V3(TX,0,-TILE)];
  const fe=[]; const mats=[];
  for(let i=0;i<3;i++){const m=S.mat(FEATHER_M(COLS[i][0],COLS[i][1]),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});mats.push(m);
    const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.PlaneGeometry(1.25,3.7).translate(0,1.85,0),m));L.mesh.add(g);fe.push(g);}  // punta en el origen, hacia −y
  const FAN=[-0.75,0,0.75].map(an=>V3(-3.85+0.95*Math.sin(an)*0.3-0.3,1.1+0.5*Math.cos(an),Math.sin(an)*0.6));
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TC=${f(TC)};const float TX=${f(TX)};const float TILE=${f(TILE)};`;
  // ráfaga a lo largo de los cuatro brazos (materia rosa pálido)
  S.pts(L.part,40,VV+K+`void main(){float arm=floor(aSeed.x*4.);vec2 d=arm<1.?vec2(1.,0.):(arm<2.?vec2(-1.,0.):(arm<3.?vec2(0.,1.):vec2(0.,-1.)));
   float s=TC+aSeed.y*.05;float life=.5+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float dd=(.2+2.1*(1.-exp(-t*5.)))*(.6+.5*aSeed.w);vec3 p=vec3(TX+d.x*dd,.15+.25*aSeed.w+.4*t,d.y*dd)+vec3(d.y,0.,d.x)*(aSeed.w-.5)*.5;
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=atan(d.y,d.x)+aSeed.w;put(p,(.45+.2*aSeed.w)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:'vec3(1.,.85,.95)',bias:.05}));
  // estela de viento rosa y azul durante el vuelo
  S.pts(L.part,36,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TL+aSeed.y*(TI-TL);float life=.3;float age=(uT-s)/life;
   float u=(s-TL)/(TI-TL);vec3 a0=vec3(-2.5,2.6,(i-1.)*1.),a1=vec3(TX-.4,1.2,(i<.5?0.:(i<1.5?TILE:-TILE)));
   vec3 p=mix(a0,a1,u)+vec3(0.,sin(u*3.14)*1.6,0.)+rnd()*.1;vA=(age>0.&&age<1.)?1.-age:0.;vK=smoothstep(.3,1.,age);vR=0.6;
   put(p,.32*(1.-.4*age));}`,S.ENERGY_FS(C.slash,{gain:1.1}),{mode:'energy'});
  // pelusa en cada clavada
  S.pts(L.part,30,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TI+i*.025;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(TX,.2,i<.5?0.:(i<1.5?TILE:-TILE));vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(1.+1.2*aSeed.z);
   vec3 p=b+v*t*(1.-.5*min(t,1.))+vec3(0.,-.3*t*t,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*3.;put(p,.3+.12*aSeed.w);}`,
   FEATHER_P('vec3(1.,.8,.92)','vec3(.6,.45,1.)'));
  const cross=groundPlane(TILE*3.2,TX,0.03,S.mat(GLYPH(`vec2 a2=abs(p)*3.2;float cr=step(min(a2.x,a2.y),.5)*step(max(a2.x,a2.y),1.55);
    m=cr*(s.r*.6+.4)*smoothstep(1.6,1.2,max(a2.x,a2.y));`,.32),{},{mode:'energy'})); L.decal.add(cross);
  const rings=LAND.map(()=>S.groundRing(L.decal,2.2)), sparks=LAND.map((p,i)=>S.hitSpark(L.mesh,1.3,{seed:0.3+i*0.2}));
  const P0=V3(0,0,0),P1=V3(0,0,0),P2=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, op=e3(ss(0,TD,te)), er=ss(1.6,1.95,te);
    fe.forEach((g,i)=>{const ti=TI+i*0.025, land=LAND[i];
      if(te<TL){g.position.lerpVectors(tmp.set(-3.85,1.4,0),FAN[i],op);
        faceAlong(g,tmp.copy(FAN[i]).sub(tmp2.set(-3.85,0.6,0)));g.scale.setScalar(Math.max(op,0.001));}
      else if(te<ti){const u=(te-TL)/(ti-TL),ue=u*u*(0.5+0.5*u);P0.copy(FAN[i]);P1.set(-0.2,4.4,FAN[i].z*0.8);P2.set(land.x-0.3,0.05,land.z);
        qbz(P0,P1,P2,ue,g.position);qbz(P0,P1,P2,Math.min(ue+0.03,1),tmp);faceAlong(g,tmp2.copy(g.position).sub(tmp));g.scale.setScalar(1);}
      else{const q=Math.exp(-(te-ti)*8)*Math.sin((te-ti)*60)*0.08;g.position.set(land.x-0.3,0.05,land.z);faceAlong(g,tmp.set(-0.65+q,1,0.4));g.scale.setScalar(1);}
      mats[i].uniforms.uQ.value=-0.1+1.1*er; mats[i].uniforms.uK.value=0.4*hitE(te-ti,6)*(te>ti?1:0)+0.15*ss(TD-0.1,TL,te)*(1-ss(TL,TL+0.2,te));
      rings[i].pose(te-ti,land.x,land.z,0.45,0.9); sparks[i].pose(te-ti,tmp.set(land.x-0.2,0.5,land.z),0.9);});
    cross.visible=te>TC; set(cross,-0.1+1.1*ss(1.55,1.95,te),ss(TC,TC+0.12,te)); cross.scale.setScalar(0.7+0.3*e3((te-TC)/0.25));
    recoil(ia,0.18);
    if(ia<0){o.g.copy(fe[0].position);o.gs=0.8;o.ga=0.14;o.li=1.5;o.ia=ia;o.c.copy(fe[0].position);o.shake=0;o.dist=0.3;o.flash=0.4;}
    else{o.g.set(TX,0.6,0);o.gs=2.4+2*ia;o.ga=0.35*Math.exp(-ia*6);o.li=5*Math.exp(-ia*4);o.ia=ia;o.c.set(TX,0.4,0);o.shake=0.9;o.dist=1;o.flash=0.6;}
  };
}});

// =====================================================================
// 7 · PAPER WING — una hoja de papel con borde de tinta roja sube de la espalda y se pliega en una grulla de origami;
//     despliega las alas, vuela dejando triángulos de papel y figuras de tinta, atraviesa al rival con un tajo de papel y
//     se deshace en triángulos que caen planeando. ti 1,25 s
// =====================================================================
const triGeo=tris=>{const pos=[],uv=[];for(const t of tris){for(const v of t)pos.push(v[0],v[1],v[2]);uv.push(0,0,1,0,0,1);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;};
const craneBody=()=>{const F=[0.16,0.02,0],B=[-0.16,0.02,0],D=[0,-0.13,0],SL=[0,0.05,0.07],SR=[0,0.05,-0.07],N=[0.5,0.34,0],H=[0.58,0.26,0],T=[-0.48,0.36,0];
  return triGeo([[F,SL,D],[F,D,SR],[B,D,SL],[B,SR,D],[F,B,SL],[F,SR,B],
    [[0.06,0.04,0.03],[0.15,0.0,0],N],[[0.06,0.04,-0.03],N,[0.15,0.0,0]],[N,H,[0.5,0.3,0.015]],[N,[0.5,0.3,-0.015],H],
    [[-0.06,0.04,0.03],T,[-0.15,0.0,0]],[[-0.06,0.04,-0.03],[-0.15,0.0,0],T]]);};
const craneWing=s=>{const A=[-0.13,0.04,0.02*s],B=[0.13,0.04,0.02*s],M=[0.02,0.12,0.3*s],P=[-0.06,0.04,0.62*s];return triGeo([[A,M,B],[A,P,M],[M,P,B]]);};
// papel: caras planas en 3 tonos, fibra, pliegues marcados en tinta y borde rojo (uv del triángulo: e = distancia al borde)
const PAPER_FS=`uniform float uQ;uniform float uK;
void main(){vec2 b=vUv;float e=min(min(b.x,b.y),1.-b.x-b.y);vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vUv*.6+vP.xy*.8).r;if(styErode(nz,uQ,.05)<.5)discard;
 vec3 c=styRampOf(${CREAM},clamp(.3+.55*l+(nz-.5)*.08,0.,1.))*styTint(l);float crease=smoothstep(.05,.0,e);
 c=mix(c,styRampOf(${INK},.55+.3*l),crease*.85);c+=vec3(1.,.5,.35)*uK;gl_FragColor=vec4(c,1.);}`;
// triángulo de papel (sprite) con borde de tinta
const PAPER_P=S.PV+`void main(){vec2 q=styPC();float e=min(min(q.y-.1,(.9-q.y)-abs(q.x-.5)*1.6),.5);if(e<0.)discard;
 float l=.55+.45*step(.0,cos(vR*2.));if(vA<.02)discard;float er=styErode(styNoise(q*.5+vMix).r,vK,.05);if(er<.5)discard;
 vec3 c=styRampOf(${CREAM},.35+.5*l)*styTint(l);c=mix(c,styRampOf(${INK},.6),smoothstep(.05,.0,e));gl_FragColor=vec4(c,vA);}`;
defs.push({key:"sty_bePaperWing",name:"Paper Wing (estilizado)",dur:2.3,ti:1.25,pal:P_PAPER,tier:2,stylized:true,...ZONES,
  phases:[["Hoja",0],["Pliegue",0.22],["Despliegue",0.38],["Vuelo",0.75],["Corte",1.25],["Figuras",1.4],["Fin",1.85]],
build(a){
  const L=a.L,TP=0.22,TD=0.38,TV=0.75,TI=1.25,TF=1.4;
  const H0=V3(-3.8,2.4,0.15), HIT=V3(TX,1.3,0.1), OUT=V3(TX+1.6,1.9,0.2);
  const pm=S.mat(PAPER_FS,{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const sheet=new THREE.Mesh(triGeo([[[-0.5,0,-0.5],[0.5,0,-0.5],[0.5,0,0.5]],[[-0.5,0,-0.5],[0.5,0,0.5],[-0.5,0,0.5]]]),pm); L.mesh.add(sheet);
  const crane=new THREE.Group(); L.mesh.add(crane); crane.add(new THREE.Mesh(craneBody(),pm));
  const wl=new THREE.Group(), wr=new THREE.Group(); wl.add(new THREE.Mesh(craneWing(1),pm)); wr.add(new THREE.Mesh(craneWing(-1),pm)); crane.add(wl,wr);
  const K=`const float TV=${f(TV)};const float TI=${f(TI)};const float TF=${f(TF)};const vec3 H0=${v3(H0)};const vec3 HIT=${v3(HIT)};const vec3 OUT=${v3(OUT)};
  vec3 path(float u){return mix(H0,HIT,u)+vec3(0.,sin(u*3.14159)*1.1,sin(u*3.14159)*.5);}`;
  // triángulos de papel en la estela y al deshacerse la grulla
  S.pts(L.part,16,VV+K+`void main(){float u=aSeed.x;float s=TV+u*(TI-TV);float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=path(u)+rnd()*.15+vec3(sin(t*3.+aSeed.w*6.)*.25,-.9*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age)*1.05-.05;
   vR=t*(4.+4.*aSeed.w)+aSeed.z*6.;put(p,.26+.12*aSeed.w);}`,PAPER_P);
  S.pts(L.part,30,VV+K+`void main(){float s=TF+aSeed.x*.05;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.2,.5,0.))*(1.4+1.6*aSeed.z);vec3 p=OUT+v*t*exp(-t*2.)+vec3(sin(t*3.+aSeed.w*6.)*.3,-.8*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.65,1.,age)*1.05-.05;vR=t*(3.+5.*aSeed.w)+aSeed.y*6.;put(p,.3+.14*aSeed.w);}`,PAPER_P);
  // tajo de papel y figuras de tinta (triángulo, rombo, cuadrado) que se abren en el rival
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
    float arc=smoothstep(.1,0.,abs(r-.62))*smoothstep(1.6,.2,abs(an-.6));float fr=smoothstep(-.2,1.,an-.6+1.6-uP*3.2);
    float m=arc*(1.-fr)*step(an,.6+1.6)*step(.6-1.6,an);if(m<.02)discard;float edge=smoothstep(.05,.0,abs(abs(r-.62)-.06));
    vec3 c=mix(styRampOf(${CREAM},.8),styRampOf(${INK},.6),edge);gl_FragColor=vec4(c,m*uA);}`,{},{mode:'matter',depthTest:false}));
  L.mesh.add(slash);
  const figs=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),S.mat(SIGIL(`float n=${f([3,4,4][i])};float rot=${f([0,0.785,0][i])};
    float aa=mod(an+rot,6.2832/n)-3.1416/n;float d=r*cos(aa)-(.3+.6*uP)*cos(3.1416/n);m=smoothstep(.07,0.,abs(d))*(1.-uP);`),{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.9}), ring=S.groundRing(L.decal,2.4), shadow=S.contactShadow(L.decal,0.8);
  const cpos=(te,o)=>{if(te<TV)return o.copy(H0).add(tmp3.set(0,0.12*Math.sin(te*6),0));
    if(te<TI){const u=cl((te-TV)/(TI-TV));return o.lerpVectors(H0,HIT,u).add(tmp3.set(0,Math.sin(u*Math.PI)*1.1,Math.sin(u*Math.PI)*0.5));}
    const u=ss(TI,TF,te);return o.lerpVectors(HIT,OUT,u);};
  a.pose=function(te,o){
    const ia=te-TI, up=e3(te/TP), fold=ss(TP,TD,te), open=ss(TD,TV,te);
    sheet.visible=fold<1; sheet.position.copy(H0).add(tmp.set(0,-0.4*(1-up),0)); sheet.rotation.set(0.9-0.6*up+fold*1.2,te*2,0.3*fold);
    sheet.scale.setScalar(Math.max(1.2*(0.3+0.7*up)*(1-0.85*fold),0.001));
    cpos(te,crane.position); cpos(te+0.012,tmp2); cpos(Math.max(te-0.012,0),tmp); tmp2.sub(tmp);
    orient(crane,te<TV?tmp.set(1,0.05,0):(tmp2.lengthSq()>1e-6?tmp2:tmp.set(1,0,0)),te>TV?0.2*Math.sin(te*6):0);
    crane.visible=fold>0&&te<TF; crane.scale.setScalar(Math.max(2.3*fold,0.001));
    const fl=te<TV?-1.2+1.4*open:0.25+0.5*Math.sin(te*18); wl.rotation.x=-fl; wr.rotation.x=fl;
    pm.uniforms.uK.value=0.35*ss(TV,TI,te)*(1-ss(TI,TI+0.1,te)); pm.uniforms.uQ.value=-0.1+1.1*ss(TF-0.05,TF+0.1,te);
    towardCam(slash.position,HIT,0.5); billboard(slash,0); const sp=cl(ia/0.3); slash.visible=ia>=0&&sp<1;
    slash.material.uniforms.uP.value=sp; slash.material.uniforms.uA.value=1;
    figs.forEach((m,i)=>{const t=te-TF-i*0.08,p=cl(t/0.45);towardCam(m.position,HIT,0.3);billboard(m,te*0.8*(i%2?1:-1));
      m.visible=t>0&&p<1;m.material.uniforms.uP.value=e3(p);m.material.uniforms.uA.value=1;});
    spark.pose(ia,HIT,1.05); ring.pose(ia,TX,0,0.45,0.9);
    shadow.pose(crane.position.x,crane.position.z,0.7,crane.visible&&te>TV?0.3:0);
    recoil(ia,0.22);
    if(ia<0){o.g.copy(crane.position);o.gs=0.6;o.ga=0.1;o.li=1.1;o.ia=ia;o.c.copy(crane.position);o.shake=0;o.dist=0.3;o.flash=0.4;}
    else{o.g.copy(HIT);o.gs=1.4+2*ia;o.ga=0.35*Math.exp(-ia*7);o.li=4*Math.exp(-ia*5);o.ia=ia;o.c.copy(HIT);o.shake=0.7;o.dist=1;o.flash=0.6;}
  };
}});

// =====================================================================
// 8 · RUBBER DUCKLING (aliado) — un patito de goma cae sobre la cabeza del aliado, se aplasta con un «¡cuac!» (ondas
//     amarillas), rebota cómico y se deshace en pompas de jabón; el aliado se cura (destellos verdes) y el cuac reparte
//     chispas doradas a todo el equipo (+1 PA). ti 0,42 s
// =====================================================================
defs.push({key:"sty_beRubberDuckling",name:"Rubber Duckling (estilizado)",dur:1.3,ti:0.42,pal:P_DUCK,tier:2,stylized:true,allies:1,...ZONES,
  phases:[["Caída",0],["¡Cuac!",0.42],["Rebote",0.5],["Alivio",0.6],["Fin",1.05]],
build(a){
  const L=a.L,TI=0.42,TB=0.8,TB2=1.0,TO=1.08,Y0=3.6,YH=2.05;
  const duck=new THREE.Group(); L.mesh.add(duck); const dm=[];
  const M=(b,o)=>{const m=SM(b,o);dm.push(m);return m;};
  const yel=M(`float t=smoothstep(-.1,.2,vP.y);base=mix(vec3(.95,.6,.04),vec3(1.,.78,.12),t);`,{hot:'vec3(1.,.8,.3)',rim:.3});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.34,24,16).scale(1.3,0.85,1.05),yel); duck.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.22,22,16),yel); head.position.set(0.28,0.34,0); duck.add(head);
  const tailP=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.2,10).rotateZ(Math.PI*0.65),yel); tailP.position.set(-0.45,0.16,0); duck.add(tailP);
  const bill=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,8).scale(1.3,0.4,1.1),M(`base=vec3(1.,.42,.06);`,{rim:.15})); bill.position.set(0.49,0.3,0); duck.add(bill);
  const eyeM=M(`base=vec3(.06,.05,.08);float gl=step(length(vUv-vec2(.62,.7)),.1);lb=.5*gl;`,{hot:'vec3(0.)',rim:0});
  for(const s of [1,-1]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.04,10,8),eyeM);e.position.set(0.4,0.42,s*0.14);duck.add(e);}
  const K=`const float TI=${f(TI)};const float TO=${f(TO)};const vec3 AP=${v3(AP)};`;
  // ¡cuac!: tres arcos de sonido y un anillo amarillo
  const quacks=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(SIGIL(`float arc=smoothstep(.1,0.,abs(r-.3-.6*uP))*smoothstep(.9,.4,abs(an-${f([0.5,1.57,2.6][i])}));m=arc*(1.-uP);`),{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  // pompas de jabón
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.5;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(AP.x+cos(an)*(.4+.5*aSeed.w),1.+t*(1.+aSeed.w),AP.z+sin(an)*(.4+.5*aSeed.w));
   vA=(age>0.&&age<1.)?1.:0.;vK=0.;vR=0.;put(p,.22+.14*aSeed.w);}`,S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
   float rim=smoothstep(.34,.45,d)*smoothstep(.5,.46,d);float hl=step(length(q-vec2(-.13,-.14)),.07);
   float a=(rim*.8+.1+hl)*vA;if(a<.01)discard;vec3 c=mix(vec3(.6,.85,1.),vec3(1.,.75,.95),.5+.5*sin(vMix*20.+d*12.));
   gl_FragColor=vec4(mix(c,vec3(1.),hl),a);}`);
  // cura: destellos verdes que suben por el aliado
  S.pts(L.part,16,VV+K+`void main(){float s=.6+aSeed.x*.35;float life=.45;float age=(uT-s)/life;float an=aSeed.y*6.2832;
   vec3 p=vec3(AP.x+cos(an)*.5,.3+age*1.4,AP.z+sin(an)*.5);vA=(age>0.&&age<1.)?sin(age*3.14):0.;vK=0.;vR=an;put(p,.32);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy',uniforms:{}});
  // +1 PA a todo el equipo: chispas doradas al aliado y al lanzador
  S.pts(L.part,4,VV+K+`void main(){float i=floor(aSeed.x*4.);float s=TI+.12+i*.05;float u=clamp((uT-s)/.4,0.,1.);
   vec3 a0=vec3(AP.x,2.1,AP.z);vec3 a1=i<1.5?vec3(-3.7,1.5,0.):vec3(AP.x+(i-2.5)*.3,1.2,AP.z);
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*.9,0.);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*6.;put(p,.42);}`,
   S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  const ring=S.groundRing(L.decal,2.6), heal=groundPlane(2.0,AP.x,0.03,S.mat(GLYPH(`float pl=step(min(abs(p.x),abs(p.y)),.07)*step(max(abs(p.x),abs(p.y)),.26);m=m*.6+pl*.9;`),{},{mode:'energy'}));
  heal.position.z=AP.z; L.decal.add(heal);
  const shadow=S.contactShadow(L.decal,0.9), poof=S.hitSpark(L.mesh,1.1,{seed:0.6});
  a.pose=function(te,o){
    const ia=te-TI;
    let x=AP.x,y,z=AP.z+0.05,sq=0,rot=0;
    if(te<TI){const u=te/TI;y=Y0-(Y0-YH)*u*u;rot=-0.4+u*0.4;}
    else if(te<TB){const u=(te-TI)/(TB-TI);y=YH+0.9*Math.sin(u*Math.PI);x=AP.x+0.9*u;rot=-u*2.2;sq=hitE(ia,14);}
    else if(te<TB2){const u=(te-TB)/(TB2-TB);y=0.3+0.4*Math.sin(u*Math.PI);x=AP.x+0.9+0.35*u;rot=-2.2-u*1.5;}
    else{y=0.3;x=AP.x+1.25;rot=-3.7;}
    duck.position.set(x,y,z); duck.rotation.set(0,-0.3,rot*0.3);
    duck.scale.set(1.5*(1+0.35*sq),1.5*(1-0.45*sq),1.5*(1+0.35*sq));
    duck.visible=te<TO+0.1; for(const m of dm)m.uniforms.uQ.value=-0.1+1.1*ss(TO-0.06,TO+0.08,te); yel.uniforms.uK.value=0.12*hitE(ia,10)*(ia>=0?1:0);
    poof.pose(te-TO,tmp.set(AP.x+1.25,0.5,AP.z),0.8);
    quacks.forEach((m,i)=>{const t=ia-i*0.05,p=cl(t/0.35);m.visible=t>0&&p<1;towardCam(m.position,tmp.set(AP.x,YH+0.2,AP.z),0.4);billboard(m,0);
      m.material.uniforms.uP.value=p;m.material.uniforms.uA.value=1;});
    ring.pose(ia,AP.x,AP.z,0.45,1);
    heal.visible=te>0.55; set(heal,-0.1+1.1*ss(1.0,1.3,te),ss(0.55,0.7,te)); heal.scale.setScalar(0.7+0.3*e3((te-0.55)/0.25));
    shadow.pose(x,AP.z,0.8,0.25+0.2*cl(1-y/3.5));
    const k=hitE(ia,10)*(ia>=0?1:0);
    allies[0].scale.set(1+0.08*k,1-0.12*k,1+0.08*k);
    const al=allies[0].userData.m; al.emissive.setRGB(0.55,1,0.45); al.emissiveIntensity=0.4*ss(0.6,0.7,te)*(1-ss(1.0,1.3,te))+0.3*k;
    const pa=ss(TI+0.5,TI+0.55,te)*(1-ss(TI+0.6,1.3,te)); glowOf(caster,COL.setRGB(1,0.8,0.3),0.45*pa);
    o.g.set(AP.x,ia<0?y:1.2,AP.z);o.gs=1+1.5*Math.max(ia,0);o.ga=ia<0?0.05:0.14*Math.exp(-ia*5);o.li=ia<0?0.6:2*Math.exp(-ia*4);
    o.ia=ia;o.c.set(AP.x,ia<0?y:1.2,AP.z);o.shake=0;o.dist=0;o.flash=0;
  };
}});

// =====================================================================
// 9 · PIGEON POST — los perjuicios del lanzador salen como hilos de miasma y se sellan en un sobre con lacre violeta;
//     una paloma mensajera lo lleva hasta el rival y lo suelta: el lacre revienta y la miasma envuelve al rival
//     (traspaso de perjuicios: chevrones de debilidad). ti 1,35 s
// =====================================================================
defs.push({key:"sty_bePigeonPost",name:"Pigeon Post (estilizado)",dur:2.4,ti:1.35,pal:P_PIGEON,tier:2,stylized:true,...ZONES,
  phases:[["Sello",0],["Despegue",0.4],["Correo",0.55],["Entrega",1.15],["Estallido",1.35],["Traspaso",1.5],["Fin",2.0]],
build(a){
  const L=a.L,TD=0.4,TC=0.55,TE=1.15,TI=1.35,TT=1.5;
  const EV=V3(-3.55,2.55,0.2), DROP=V3(TX-0.15,2.7,0.15), HIT=V3(TX-0.05,1.72,0.12), AWAY=V3(TX+1.9,4.3,-0.4);
  const pig=makeBird(L.mesh,{top:'vec3(.36,.38,.54)',belly:'vec3(.52,.5,.66)',cov:'vec3(.42,.44,.6)',prim:'vec3(.2,.2,.33)',
    dark:'vec3(.18,.16,.28)',beak:'vec3(.85,.6,.5)',eye:'vec3(.9,.35,.1)',beakLen:0.14,s:1.45});
  // sobre: papel crema con solapa y lacre violeta
  const env=new THREE.Group(); L.mesh.add(env);
  const envM=SM(`float fl=step(abs(vUv.x-.5)*1.1,vUv.y-.35);base=mix(${CREAM},vec3(.86,.8,.68),fl*.6);
   float edge=step(min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)),.04);base=mix(base,vec3(.55,.35,.6),edge*.7);`,{hot:'vec3(.7,.3,1.)'});
  const card=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.42,0.06),envM); env.add(card);
  const sealM=SM(`base=vec3(.45,.12,.62);lb=.05;`,{hot:'vec3(.85,.4,1.)',rim:.4});
  const seal=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.04,16).rotateX(Math.PI/2),sealM); seal.position.z=0.05; env.add(seal);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const float TT=${f(TT)};const vec3 EV=${v3(EV)};const vec3 HIT=${v3(HIT)};`;
  // hilos de miasma que salen del lanzador hacia el sobre
  S.pts(L.part,20,VV+K+`void main(){float s=aSeed.x*.25;float u=clamp((uT-s)/.3,0.,1.);float an=aSeed.y*6.2832;
   vec3 a0=vec3(-3.7+cos(an)*.4,.4+aSeed.z*1.1,sin(an)*.4);vec3 p=mix(a0,EV,u*u)+vec3(sin(u*6.+aSeed.w*6.)*.15*(1.-u),0.,0.);
   vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.75,1.,u);vR=an;put(p,.36+.14*aSeed.w);}`,SMOKE(MIAS,-.08));
  // estallido del lacre: miasma que envuelve al rival y trozos de papel
  S.pts(L.part,26,VV+K+`void main(){float life=.7+aSeed.y*.35;float k=(uT-TI)/life+aSeed.x*.6;float age=k<1.?k:fract(k);vec3 r=rr(floor(k));
   float on=step(TI,uT)*(1.-smoothstep(2.05,2.35,uT));float an=r.x*6.2832+age*3.5;float rad=(.35+.35*r.y)*(k<1.?(.4+.8*age):1.);
   vec3 p=vec3(${f(TX)},.3+age*1.5,0.)+vec3(cos(an)*rad,0.,sin(an)*rad);
   vA=on*smoothstep(0.,.12,age);vK=smoothstep(.4,1.,age);vR=an;put(p,(.5+.2*r.z)*(.7+.5*age));}`,SMOKE(MIAS,-.05));
  S.pts(L.part,14,VV+K+`void main(){float s=TI;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.8+1.6*aSeed.z);vec3 p=HIT+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age)*1.05-.05;vR=t*8.+aSeed.w*6.;put(p,.24+.1*aSeed.w);}`,PAPER_P);
  const weak=S.status(a,'weak',[target],TT,2.38);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.27}), ring=S.groundRing(L.decal,2.8), shadow=S.contactShadow(L.decal,0.9);
  const pool=groundPlane(1.9,TX,0.024,S.mat(STAIN(MIAS,.5),{},{mode:'matter'})); L.decal.add(pool);
  const ppos=(te,o)=>{
    if(te<TC)return o.copy(EV).add(tmp3.set(-0.2,0.45+0.08*Math.sin(te*12),0.05));
    if(te<TE){const u=ss(TC,TE,te);return qbz(tmp3.copy(EV).add(tmp2.set(-0.2,0.45,0.05)),tmp2.set(0,4.6,0.5),DROP.clone().add(tmp2.set(0,0.4,0)),u,o);}
    const u=ss(TE,TE+0.7,te);return o.lerpVectors(tmp3.copy(DROP).add(tmp2.set(0,0.4,0)),AWAY,u);};
  a.pose=function(te,o){
    const ia=te-TI, form=e3(te/0.3), pig0=back(cl((te-TD+0.15)/0.2));
    ppos(te,pig.g.position); ppos(te+0.012,tmp2); ppos(Math.max(te-0.012,0),tmp); tmp2.sub(tmp);
    orient(pig.g,te<TC?tmp.set(1,0.1,0):(tmp2.lengthSq()>1e-6?tmp2:tmp.set(1,0,0)));
    pig.flap(0.25+0.9*Math.sin(te*30)); pig.scale(1.45*pig0); pig.g.visible=te>TD-0.15&&te<TE+0.75;
    pig.q(-0.1+1.1*ss(TE+0.5,TE+0.72,te)); pig.k(0);
    // sobre: se forma con la miasma → colgado de la paloma → cae sobre el rival → revienta
    if(te<TC){env.position.copy(EV);env.rotation.set(0,0,0.1*Math.sin(te*5));}
    else if(te<TE){env.position.copy(pig.g.position).add(tmp.set(0,-0.42,0));env.rotation.set(0,0,0.2*Math.sin(te*9));}
    else{const u=cl((te-TE)/(TI-TE));env.position.lerpVectors(DROP,HIT,u*u);env.rotation.set(0,0,(te-TE)*7);}
    env.visible=ia<0; env.scale.setScalar(Math.max(1.5*form,0.001));
    sealM.uniforms.uK.value=0.6*ss(0.15,TD,te)*(0.6+0.4*Math.sin(te*20))+0.6*ss(TE,TI,te);
    spark.pose(ia,HIT,1.15); ring.pose(ia,TX,0,0.45,1);
    pool.visible=ia>=0; pool.scale.setScalar(0.5+0.5*e3(ia/0.3)); set(pool,-0.1+1.1*ss(1.95,2.38,te),1);
    shadow.pose(env.visible?env.position.x:pig.g.position.x,0,0.8,te>TC?0.3:0);
    recoil(ia,0.22);
    const env2=weak.pose(te); S.statusGlow(o,[weak]);
    glowOf(caster,COL.setRGB(0.9,0.85,1),0.3*ss(0.25,0.4,te)*(1-ss(0.45,0.7,te)));
    if(ia<0){o.g.copy(env.position);o.gs=0.7;o.ga=0.12;o.li=1.2;o.ia=ia;o.c.copy(env.position);o.shake=0;o.dist=0.3;o.flash=0.4;}
    else{o.g.copy(HIT);o.gs=1.6+2*ia;o.ga=0.4*Math.exp(-ia*7);o.li=4.5*Math.exp(-ia*5);o.ia=ia;o.c.copy(HIT);o.shake=0.8;o.dist=1;o.flash=0.6;}
    o.em=Math.max(o.em||0,0.25*env2);
  };
}});

VFX.module("Estilizado · Pájaro · Espalda",defs);
})();

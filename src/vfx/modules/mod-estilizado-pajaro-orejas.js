// =====================================================================
// ESTILIZADO · PÁJARO · OREJAS (Hito 101) — las 6 cartas de oreja de Pájaro rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_boCurly, sty_boEarlyBird…); el puente las usa con el estilo nuevo encendido.
// Mismos dur / ti / fases que mod-pajaro-orejas.js, así que el daño llega igual. El concepto sigue la carta (PartCards.js).
// Identidad de clase: plumas rosas y celestes pintadas (materia con luz en bandas y contorno oscuro para leerse sobre la
// hierba), aves espirituales como siluetas sólidas iluminadas (no fantasmas aditivos), viento en pinceladas.
// Los efectos nacen de las orejas (≈ −3,72, 1,84, ±0,26). Cartas a distancia: zonas pequeñas para no encogerse a 1 casilla.
// Módulo autónomo: no necesita mod-pajaro-orejas.js.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas propias (nombres únicos)
VFX.palette("Sty Pájaro · Rizo",["#8fd3ff","#e0489c"]);
VFX.palette("Sty Pájaro · Búho",["#ffc25a","#5b3f9e"]);
VFX.palette("Sty Pájaro · Paloma",["#ffe08a","#7d86c9"]);
VFX.palette("Sty Pájaro · Rubor",["#ffb0c8","#e2457a"]);
VFX.palette("Sty Pájaro · Carmesí",["#ff6a5a","#9c1230"]);
VFX.palette("Sty Pájaro · Alba",["#ffc46b","#e2557a"]);

const EAR=[V3(-3.62,1.84,0.26),V3(-3.62,1.84,-0.26)];
const CX=-3.7, TC=V3(3.15,1.2,0), HD=V3(3.25,1.66,0);
const ZONES={zoneCaster:0.6,zoneTarget:1.1};
const tmp=V3(0,0,0), tA=V3(0,0,0), tB=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const bez=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const angOf=(fn,t)=>{fn(t+0.01,tA);fn(t-0.01,tB);return Math.atan2(tA.y-tB.y,tA.x-tB.x);};
const VV=`varying float vR;varying float vK;`;
const BZ=`vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
// tubo cuyo uv.x es exactamente el parámetro de fn (la cabeza de la estela queda sincronizada con el vuelo)
function paramTube(fn,n,rs,r0,r1){
  const pos=[],nor=[],uv=[],idx=[],c=V3(0,0,0),c2=V3(0,0,0),T=V3(0,0,0),N=V3(0,0,0),B=V3(0,0,0),Z=V3(0,0,1);
  for(let i=0;i<=n;i++){const t=i/n;fn(t,c);
    if(i<n){fn(t+1/n,c2);T.subVectors(c2,c);}else{fn(t-1/n,c2);T.subVectors(c,c2);}T.normalize();
    N.crossVectors(T,Z);if(N.lengthSq()<1e-6)N.set(0,1,0);N.normalize();B.crossVectors(T,N).normalize();const r=r0+(r1-r0)*t;
    for(let j=0;j<=rs;j++){const an=j/rs*Math.PI*2,cs=Math.cos(an),sn=Math.sin(an),nx=N.x*cs+B.x*sn,ny=N.y*cs+B.y*sn,nz=N.z*cs+B.z*sn;
      pos.push(c.x+nx*r,c.y+ny*r,c.z+nz*r);nor.push(nx,ny,nz);uv.push(t,j/rs);}}
  for(let i=0;i<n;i++)for(let j=0;j<rs;j++){const p=i*(rs+1)+j,q=p+rs+1;idx.push(p,q,p+1,q,q+1,p+1);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}

// =====================================================================
// MATERIALES DEL MÓDULO
// =====================================================================
// pluma (sprite): raquis, vexilo asimétrico con barbas; el lado de arriba recibe luz, el de abajo va en sombra,
// raquis y borde oscuros (contorno) y erosión desde el borde con la edad (vK). col = color GLSL (puede usar vMix, u)
const FEATHER_GLSL=`float feather(vec2 q,out float rach){
 float u=(q.x+.47)/.94;rach=0.;if(u<0.||u>1.)return 0.;
 float y=q.y-.07*u*u+.02*u;float ay=abs(y);
 float t=clamp((u-.1)/.9,0.,1.);float prof=pow(sin(3.14159*pow(t,.7)),.7);
 float w=(y>0.?.22:.14)*prof;
 float vane=smoothstep(w,w-.03,ay)*step(.1,u);
 float n=fract((u-ay*1.45)*2.6+.35);float k=ay/max(w,.001);
 float split=mix(1.,smoothstep(0.,.06,n)*smoothstep(1.,.94,n),step(.55,k)*step(0.,y));
 rach=smoothstep(.022*(1.-.5*u)+.003,.003,ay)*step(u,.97);
 return max(vane*split,rach);}`;
const FEATHER_FS=col=>S.PV+FEATHER_GLSL+`void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float fold=max(abs(cos(vR*1.3+vMix*5.)),.55);q.y/=fold;float r;float m=feather(q,r);if(m<.02)discard;
 float u=(q.x+.47)/.94;float y=q.y-.07*u*u+.02*u;
 float er=styErode(styNoise(q*.5+vMix).r*.65+.35*(1.-abs(y)*3.),vK*1.05-.05,.1);
 float a=smoothstep(.02,.3,m)*er*vA;if(a<.01)discard;
 float l=(y>0.?1.:.4)*(.55+.45*fold);
 vec3 base=${col};
 vec3 cc=styRampOf(base,.22+.6*l)*styTint(l);
 float barb=.5+.5*sin((u*1.1-abs(y)*1.6)*60.);cc*=1.-.1*barb*step(.02,abs(y));
 cc=mix(cc,base*.3,r*.85);
 cc=mix(base*.32,cc,smoothstep(.05,.45,m));
 gl_FragColor=vec4(cc,a);}`;
// corazón (sprite) con luz en bandas y contorno
const HEART_FS=S.PV+`float dot2(vec2 v){return dot(v,v);}
float sdHeart(vec2 p){p.x=abs(p.x);if(p.y+p.x>1.)return sqrt(dot2(p-vec2(.25,.75)))-.35355;
 return sqrt(min(dot2(p-vec2(0.,1.)),dot2(p-.5*max(p.x+p.y,0.))))*sign(p.x-p.y);}
void main(){vec2 q=styPC();q=(q-.5)*1.45+vec2(0.,.5);float sd=sdHeart(q);if(sd>.0)discard;
 vec2 c=q-vec2(0.,.55);float l=smoothstep(-.1,.1,-c.x*.7+c.y*.7)*.45+.55;
 vec3 col=styRampOf(uC1,.3+.6*l)*styTint(l);
 col=mix(col,uC2*.45,smoothstep(-.07,-.02,sd));
 float hl=step(length(q-vec2(-.28,.78)),.09);col=mix(col,vec3(1.,.95,.95),hl*.85);
 float a=vA*smoothstep(0.,-.01,sd);if(a<.01)discard;gl_FragColor=vec4(col,a);}`;
// ave espiritual (billboard): silueta de frente; fl = ala, sp = apertura, tf = cola, tu = penachos, hs = cabeza.
// Materia sólida: normal sacada del campo de distancia → luz en 3 bandas, vetas de pluma, contorno oscuro,
// ojos (uEye 1 = ojos de búho encendidos), pico; uEr erosiona (aparece/se deshace), uGl brillo propio
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
const BIRD_FS=BIRD_GLSL+`uniform float uFl;uniform float uSp;uniform float uTf;uniform float uTu;uniform float uHs;
uniform vec3 uCa;uniform vec3 uCb;uniform vec3 uEyeC;uniform float uEye;uniform float uEr;uniform float uGl;
float B(vec2 p){return bird(p,uFl,uSp,uTf,uTu,uHs);}
void main(){vec2 p=(vUv-.5)*2.;float d=B(p);if(d>.006)discard;
 float e=.012;vec2 g=vec2(B(p+vec2(e,0.))-B(p-vec2(e,0.)),B(p+vec2(0.,e))-B(p-vec2(0.,e)))/(2.*e);
 float dep=clamp(-d*8.,0.,1.);vec3 n=normalize(vec3(g*(1.-dep)*1.4,.3+dep));
 float l=styLight(n,stySunV());
 vec4 ns=styNoise(p*.7+.31);
 if(uEr>0.&&ns.r*.7+.3*ns.a<uEr)discard;
 vec2 q=vec2(abs(p.x),p.y);
 float wing=smoothstep(.13,.24,q.x);
 vec3 col=mix(uCb,uCa,.25+.75*smoothstep(-.45,.3,p.y));
 col=mix(col,uCb,wing*smoothstep(.0,.6,q.x)*.55);
 float belly=smoothstep(.12,-.2,p.y)*smoothstep(.14,.02,q.x);col=mix(col,mix(uCa,vec3(1.,.95,.88),.3),belly*.55);
 float str=.5+.5*sin(q.x*26.-p.y*10.);col*=1.-.14*wing*smoothstep(.55,1.,str);
 vec3 c=styRampOf(col,.26+.58*l)*styTint(l);
 float ol=smoothstep(-.034,-.01,d);c=mix(c,uCb*.22,ol);
 float er_=mix(.018,.052,uEye);vec2 ep=vec2(mix(.05,.074,uEye),mix(.25,.24,uEye));float ed=length(q-ep);
 float eye=smoothstep(er_,er_-.007,ed);float pup=smoothstep(er_*.42,er_*.42-.006,ed)*uEye;
 vec3 ec=mix(vec3(.05,.03,.07),uEyeC*(1.1+1.6*uGl),uEye);
 c=mix(c,ec,eye);c=mix(c,vec3(.04,.02,.05),pup);
 float bk=sdTap(p,vec2(0.,.2),vec2(0.,.12),.032,.004);c=mix(c,vec3(.95,.62,.22)*.9,smoothstep(.004,-.004,bk));
 float rim=smoothstep(.35,.0,dep)*(1.-ol)*step(.5,l);c+=uCa*rim*.25+uCa*uGl*.35*(1.-ol);
 gl_FragColor=vec4(c,uA*smoothstep(.006,-.006,d));}`;
const birdMat=(ca,cb,{fl=0.4,sp=1,tf=0.6,tu=0,hs=0.15,eye=0,eyeC=0xffb020}={})=>S.mat(BIRD_FS,{
  uFl:{value:fl},uSp:{value:sp},uTf:{value:tf},uTu:{value:tu},uHs:{value:hs},uCa:{value:new THREE.Color(ca)},uCb:{value:new THREE.Color(cb)},
  uEyeC:{value:new THREE.Color(eyeC)},uEye:{value:eye},uEr:{value:0},uGl:{value:0}},{mode:'matter'});
// cinta de viento pintada (materia): pinceladas que corren a lo largo; visible entre uQ (cola) y uP (cabeza)
const WIND_FS=`uniform float uQ;uniform vec3 uWa;uniform vec3 uWb;
void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float k=(u-uQ)/max(uP-uQ,.001);
 vec4 nz=styNoise(vec2(u*2.4-uT*.9,vUv.y*.5));float st=smoothstep(.38,.62,nz.b*.7+nz.r*.3);
 float c=abs(dot(normalize(vN),normalize(vV)));
 float m=smoothstep(.05,.3,c)*smoothstep(0.,.18,k)*smoothstep(1.,.9,k);
 float a=m*(.35+.65*st)*uA;if(a<.02)discard;
 vec3 col=mix(uWb,uWa,st*.7+.3*c);gl_FragColor=vec4(styRampOf(col,.45+.4*st)*1.05,a);}`;
const windMat=(wa,wb)=>S.mat(WIND_FS,{uQ:{value:0},uWa:{value:new THREE.Color(wa)},uWb:{value:new THREE.Color(wb)}},{mode:'matter'});
// estela de energía (cabeza caliente): degradado uC2 → uC1 en la cabeza; visible entre uQ y uP
const TRAIL_FS=`uniform float uQ;uniform float uG;
void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float k=(u-uQ)/max(uP-uQ,.001);
 float c=abs(dot(normalize(vN),normalize(vV)));vec4 nz=styNoise(vec2(u*3.-uT*2.,vUv.y*.5));
 float m=smoothstep(.15,.6,c)*k*(.55+.45*smoothstep(.3,.7,nz.r));if(m<.02)discard;
 gl_FragColor=vec4(styRamp(.35+.6*k)*uG,m*uA);}`;
const trailMat=(g=1.2)=>S.mat(TRAIL_FS,{uQ:{value:0},uG:{value:g}},{mode:'energy'});
// estrella de cuatro puntas (energía) y chevrón hacia arriba (PA / PM)
const STAR_FS=S.PV+`void main(){vec2 q=(styPC()-.5)*2.;vec2 a=abs(q);
 float s=pow(max(0.,1.-a.x*a.y*16.-min(a.x,a.y)*1.6),3.)*smoothstep(1.,.2,max(a.x,a.y));float c=pow(max(0.,1.-length(q)*1.3),2.);
 float m=max(s,c);float a2=m*vA;if(a2<.01)discard;gl_FragColor=vec4(styRampOf(uC1,.6+.4*m)*1.6,a2);}`;
const CHEVUP_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.16+abs(q.x)*.95);
 float m=smoothstep(.1,.055,d)*step(abs(q.x),.4);float a=m*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(mix(uC2,uC1,.4),.55+.45*smoothstep(.1,0.,d))*1.5,a);}`;
// remolino pintado en el suelo (materia): brazos en espiral; uP crece, uEr erosiona
const SWIRL_FS=`uniform float uEr;uniform vec3 uSc;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float arm=fract((an/6.2832)*3.+r*1.4-uT*.6);float m=smoothstep(.18,.0,abs(arm-.5)-.12)*smoothstep(1.,.55,r)*step(r,uP*1.1+.05)*smoothstep(.08,.25,r);
 if(m<.02)discard;float n=styNoise(vUv*.8+.2).g;float er=styErode(n*.6+m*.4,uEr,.12);
 gl_FragColor=vec4(styRampOf(uSc,.4+.4*n)*styTint(.5),m*er*uA*.7);}`;
// sello rúnico (energía suave en el suelo / billboard): anillos, plumas radiales y rombo
const SIGIL_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uP*2.;
 float rings=smoothstep(.035,.0,abs(r-.86))+smoothstep(.025,.0,abs(r-.6))*.8;float k=fract(an/6.2832*8.);
 float w=.42*(1.-clamp((r-.6)/.26,0.,1.));float tick=step(.6,r)*step(r,.86)*smoothstep(w,w-.08,abs(k-.5)*2.);
 float dm=abs(p.x)+abs(p.y)*1.4;float core=smoothstep(.24,.2,dm)-smoothstep(.13,.09,dm)*.6;
 float m=rings+tick*.6+core;if(m<.02)discard;
 gl_FragColor=vec4(styRamp(.55+.4*core)*1.25,m*uA);}`;
// halo dorado sólido (toro) con luz en bandas
const HALO_FS=`uniform float uGl;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec3 c=styRampOf(vec3(1.,.74,.25),.3+.6*l)*styTint(l)+vec3(1.,.8,.4)*uGl;gl_FragColor=vec4(c,1.);}`;
// rubor: óvalo rosa con tres trazos (estilo anime), materia
const BLUSH_FS=`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.7));float m=smoothstep(1.,.7,d);
 float hatch=step(.55,fract((p.x+p.y*.6)*2.2+.2))*smoothstep(.8,.4,d)*step(abs(p.y),.32);
 float a=m*uA*.85;if(a<.02)discard;vec3 c=mix(uC1,uC2,.35+.3*hatch);gl_FragColor=vec4(c*1.05,a);}`;
// sol del alba pintado: disco en bandas cálidas que asoma tras un horizonte, rayos en pincelada
const DAWN_FS=`void main(){vec2 p=(vUv-.5)*2.;float hy=-.25;vec2 c=vec2(0.,mix(-.7,-.05,uP));float r=length(p-c);
 float above=smoothstep(hy-.02,hy+.03,p.y);float disc=smoothstep(.42,.39,r)*above;
 float bands=floor(clamp((p.y-c.y+.42)/.84,0.,.999)*3.)/2.;
 vec2 o=p-c;float an=atan(o.y,o.x);float ray=step(.55,fract(an/6.2832*12.+uT*.08))*smoothstep(.46,.52,r)*smoothstep(.95,.6,r)*above*uP;
 float hor=smoothstep(.03,.0,abs(p.y-hy))*smoothstep(.9,.3,abs(p.x));
 float edge=smoothstep(1.,.8,length(p*vec2(.85,1.)));
 vec3 dc=mix(vec3(.96,.36,.36),vec3(1.,.82,.4),bands);
 vec3 col=disc>.5?dc:mix(uC2,uC1,.6);
 float a=(disc+ray*.75+hor*.8)*edge*uA;if(a<.02)discard;
 gl_FragColor=vec4(col*(disc>.5?1.15:1.35),a);}`;
// línea de primera luz en el suelo (pincelada dorada que corre de uP)
const LINE_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;vec4 nz=styNoise(vec2(u*3.,vUv.y*.4));
 float front=smoothstep(.12,.0,abs(u-(1.-uP)))*step(.001,uP);float veil=smoothstep(1.-uP,1.-uP+.2,u)*.35*(1.-uP*.5);
 float m=(front+veil)*smoothstep(.9,.2,v+(nz.b-.5)*.4)*smoothstep(0.,.05,u)*smoothstep(1.,.95,u);if(m<.02)discard;
 gl_FragColor=vec4(styRampOf(uC1,.6+.4*front)*1.3,m*uA);}`;

const defs=[];
// ---------- piezas comunes ----------
// pluma que gira en point sprite: tamaño estándar legible desde la cámara del combate
const FS_ROSA="vec3(.93,.33,.62)", FS_CIELO="vec3(.38,.72,.98)";
const FPAIR=`mix(${FS_CIELO},${FS_ROSA},step(.5,vMix))*(.85+.25*u)`;   // celeste o rosa según la oreja
const baseHit=(o,ia,p)=>{o.ia=ia;o.c.copy(p);};

// =====================================================================
// 1 · CURLY — de cada oreja sale un chorro de plumas rizadas (rosas por un lado, celestes por el otro) que viaja en
//     sacacorchos; al llegar forman un torbellino de viento alrededor del rival que se cierra y golpea. Las plumas
//     salen despedidas en tangente y el golpe rompe en esquirlas azules (más daño contra escudos). Nivel 2.
// =====================================================================
defs.push({key:"sty_boCurly",name:"Curly (estilizado)",dur:2.2,ti:0.88,tier:2,pal:"Sty Pájaro · Rizo",stylized:true,...ZONES,
  phases:[["Rizo",0],["Vuelo",0.28],["Torbellino",0.6],["Impacto",0.88],["Dispersión",1.15],["Calma",1.7]],
build(a){
  const L=a.L,TI=0.88,TW=0.55,TE=2.1;
  const K=`const float TI=${f(TI)};`;
  // plumas: viajan en hélice (cada oreja con su fase), orbitan al rival y salen en tangente
  a.count+=S.pts(L.part,44,VV+K+`void main(){float sd=aSeed.w<.5?1.:-1.;float s=.04+aSeed.x*.36;float tr=.42;
   vec3 E=vec3(-3.62,1.84,.26*sd);float hy=.45+1.25*aSeed.y;vec3 T=vec3(3.4,hy,0.);
   float k=clamp((uT-s)/tr,0.,1.);float an0=sd*1.57+aSeed.z*6.2832;float an=an0+k*13.;float rad=.1+.32*sin(3.14159*k);
   vec3 p=mix(E,T,k*k*(3.-2.*k))+vec3(0.,cos(an),sin(an))*rad;
   float tArr=s+tr;float aEnd=an0+13.;
   if(uT>tArr){float to=min(uT,TI)-tArr;float R=mix(.85,.38,smoothstep(.6,TI,min(uT,TI)));float ao=aEnd+to*9.*sd;
     p=vec3(3.4+cos(ao)*R,hy+.15*sin(to*6.),sin(ao)*R);
     if(uT>TI){float tf=uT-TI;vec3 rd=vec3(cos(ao),0.,sin(ao));vec3 tg=vec3(-sin(ao),0.,cos(ao))*sd;
       p+=(tg*2.+rd*1.4+vec3(0.,.6,0.))*(1.-exp(-tf*3.2))*.75+vec3(0.,-.55*tf*tf,0.);}}
   vA=uT>s?smoothstep(s,s+.05,uT):0.;p.y=max(p.y,.04);
   vK=smoothstep(TI+.35+aSeed.z*.4,TI+1.05+aSeed.z*.3,uT);vR=aSeed.z*6.2832+uT*(5.+3.*aSeed.y)*sd;
   put(p,.68+.22*aSeed.z);}`,FEATHER_FS(FPAIR));
  // cintas de viento: dos espirales alrededor del rival que se cierran hasta el golpe
  const spiral=(ph)=>(t,o)=>{const an=ph+t*Math.PI*2*2.2,r=0.95-0.35*t;return o.set(Math.cos(an)*r,0.15+1.55*t,Math.sin(an)*r);};
  const winds=[0,Math.PI].map(ph=>{const m=new THREE.Mesh(paramTube(spiral(ph),90,6,0.06,0.03),windMat(0xd8f0ff,0x4c8fd6));m.position.x=3.4;L.trail.add(m);return m;});
  // esquirlas azules del escudo roto
  a.count+=S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=t/(.55+.2*aSeed.y);
   vec3 d=normalize(rnd()+vec3(-.2,.5,0.));vec3 p=vec3(3.2,1.25,0.)+d*(2.4+1.6*aSeed.z)*t+vec3(0.,-5.*t*t,0.);
   vA=(uT>s&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.28+t*12.;put(p,.34+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:4,col:'vec3(.45,.78,1.)'}));
  const swirl=groundPlane(2.6,3.4,0.025,S.mat(SWIRL_FS,{uEr:{value:0},uSc:{value:new THREE.Color(0x3d7fc4)}},{mode:'matter'})); L.decal.add(swirl);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.31,toCam:0.55}), spark2=S.hitSpark(L.mesh,1.2,{seed:0.77,toCam:0.4});
  const ring=S.groundRing(L.decal,2.8);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.08*ss(0,0.25,te)*(1-ss(0.3,0.6,te));
    winds.forEach((m,i)=>{const on=ss(TW,TW+0.15,te),grow=ss(TW,TI,te),out=ss(TI,TI+0.35,te);
      m.visible=on>0.001&&out<0.999; m.rotation.y=te*(7+i)+i*0.4;
      const sc=Math.max(1.05-0.3*grow+0.9*out,0.001); m.scale.set(sc,1,sc);
      m.material.uniforms.uP.value=0.15+0.85*grow; m.material.uniforms.uQ.value=out*0.9; m.material.uniforms.uA.value=on*(1-out);});
    swirl.visible=te>TW; swirl.material.uniforms.uP.value=ss(TW,TI,te); swirl.material.uniforms.uEr.value=-0.1+1.1*ss(1.5,TE,te); swirl.material.uniforms.uA.value=1;
    spark.pose(ia,TC,1.05); spark2.pose(ia-0.05,tmp.set(3.4,1.6,0.25),0.8); ring.pose(ia,3.4,0,0.45);
    const h=hitE(ia,6); target.position.x=3.4+0.24*h*(ia>=0?1:0); target.rotation.z=-0.22*h*Math.cos(ia*14);
    if(te<TW){o.g.set(-0.2,1.6,0);o.gs=1.0;o.ga=0.08;o.li=1.0;}
    else if(te<TI){o.g.set(3.4,1.1,0);o.gs=1.4;o.ga=0.12*ss(TW,TI,te);o.li=1.5;}
    else{o.g.copy(TC);o.gs=1.4+1.5*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*9);o.li=3.5*Math.exp(-ia*6);}
    baseHit(o,ia,TC); o.shake=0.4; o.dist=0.5; o.flash=0.8;
  };
}});

// =====================================================================
// 2 · LITTLE OWL (EAR) — un búho espiritual violeta se condensa de plumas sobre las orejas, asciende aleteando y cae
//     en picado con las alas plegadas y los ojos ámbar encendidos; golpea la cabeza del rival, se deshace en plumas
//     y deja un sello rúnico que gira sobre él. Nivel 2.
// =====================================================================
defs.push({key:"sty_boLittleOwl",name:"Little Owl (Ear) (estilizado)",dur:2.2,ti:0.95,tier:2,pal:"Sty Pájaro · Búho",stylized:true,...ZONES,
  phases:[["Llamada",0],["Ascenso",0.22],["Picado",0.62],["Marca",0.95],["Disolución",1.3],["Fin",1.85]],
build(a){
  const L=a.L,TA=0.22,TD=0.62,TI=0.95,TF=1.3,TE=1.85;
  const SP=V3(-3.55,2.4,0), C1=V3(-3.0,3.6,0.3), A=V3(-1.0,3.75,0.25), C2=V3(1.7,3.9,0.1), H=V3(3.25,1.85,0);
  const opos=(t,o)=>{if(t<TA)return o.set(SP.x,SP.y+0.12*ss(0,TA,t),SP.z);
    if(t<TD){const k=(t-TA)/(TD-TA);bez(SP,C1,A,k*(2-k),o);return o;}
    if(t<TI){const k=(t-TD)/(TI-TD);bez(A,C2,H,k*k,o);return o;} return o.copy(H);};
  const owl=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),birdMat(0xb79be8,0x3a2a72,{fl:0.4,sp:1,tf:0.55,tu:1,hs:0.19,eye:1,eyeC:0xffb22e}));
  L.mesh.add(owl);
  const diveT=new THREE.Mesh(paramTube((k,o)=>opos(TD+k*(TI-TD),o),70,7,0.03,0.12),trailMat(1.1)); L.trail.add(diveT);
  const sigil=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),S.mat(SIGIL_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(sigil);
  const decal=groundPlane(2.3,3.4,0.026,S.mat(SIGIL_FS,{},{mode:'energy'})); L.decal.add(decal);
  const K=`const float TA=${f(TA)};const float TD=${f(TD)};const float TI=${f(TI)};const float TF=${f(TF)};
  const vec3 SP=${v3(SP)};const vec3 C1=${v3(C1)};const vec3 A=${v3(A)};const vec3 C2=${v3(C2)};const vec3 H=${v3(H)};${BZ}
  vec3 opos(float t){if(t<TA)return SP;if(t<TD){float k=(t-TA)/(TD-TA);return bz(SP,C1,A,k*(2.-k));}
   if(t<TI){float k=(t-TD)/(TI-TD);return bz(A,C2,H,k*k);}return H;}`;
  const OWLF="mix(vec3(.42,.3,.75),vec3(.72,.6,.95),vMix)*(.8+.3*u)";
  // llamada: plumas de las orejas que se juntan en el búho
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*(TA-.1);float age=(uT-s)/.2;float k=clamp(age,0.,1.);
   float sd=aSeed.y>.5?1.:-1.;vec3 st=vec3(-3.62,1.84,.26*sd)+rnd()*.2;vec3 p=mix(st,SP+rnd()*.15,k*k)+vec3(0.,sin(k*3.14)*.25,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.z*6.28+uT*6.;vMix=aSeed.w;put(p,.52);}`,FEATHER_FS(OWLF));
  // plumas sueltas del aleteo y del picado
  a.count+=S.pts(L.part,18,VV+K+`void main(){float s=TA+aSeed.x*(TI-TA);float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=opos(s)+rnd()*.25+vec3(sin(t*3.+aSeed.z*9.)*.25,-.75*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.z*6.2832+t*3.;vMix=aSeed.w;put(p,.55+.16*aSeed.w);}`,FEATHER_FS(OWLF));
  // el búho se deshace en plumas al golpear
  a.count+=S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.75+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.35,.35,0.))*(2.+3.*aSeed.z);vec3 p=H+v*(1.-exp(-t*3.5))/3.5+vec3(sin(t*3.+aSeed.w*9.)*.15,-.55*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.2832+t*(4.+5.*aSeed.y);vMix=aSeed.y;put(p,.6+.2*aSeed.w);}`,FEATHER_FS(OWLF));
  // motas ámbar que giran con el sello
  a.count+=S.pts(L.part,16,VV+K+`void main(){float env=smoothstep(TI,TI+.1,uT)*(1.-smoothstep(TF,TF+.45,uT));
   float an=aSeed.x*6.2832+uT*(3.+2.*aSeed.y);float r=.55+.15*aSeed.z;vR=uT*2.;vK=0.;
   vec3 p=H+vec3(cos(an)*r,sin(an)*r*.3+.1,sin(an)*r);vA=env;put(p,.22+.08*aSeed.w);}`,STAR_FS,{mode:'energy'});
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.53,toCam:0.55}); const ring=S.groundRing(L.decal,2.6);
  const ou=owl.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,TA,te);
    opos(te,tmp);
    const flap=0.35+0.75*Math.sin(te*24), sp=te<TD?0.4+0.6*form:(te<TI?1-0.5*ss(TD,TD+0.1,te):1);
    const dir=angOf(opos,Math.min(Math.max(te,TA+0.02),TI-0.011)), ang=te<TA?0:(te<TD?0.3*(dir-Math.PI/2):(dir-Math.PI/2)*ss(TD,TD+0.12,te));
    const dis=ss(TI,TI+0.14,te);
    owl.visible=te>0.03&&dis<0.999; owl.position.copy(tmp); billboard(owl,ang);
    owl.scale.setScalar(Math.max(2.3*(0.5+0.5*form)*(te<TD?1:1+0.15*ss(TD,TI,te)),0.001));
    ou.uFl.value=te<TD?flap:0.6; ou.uSp.value=sp; ou.uEr.value=te<TA?1-form:dis; ou.uGl.value=0.4*ss(TD,TI,te); ou.uA.value=1;
    diveT.visible=te>TD&&ia<0.3; diveT.material.uniforms.uP.value=cl((te-TD)/(TI-TD)); diveT.material.uniforms.uQ.value=cl((te-TD-0.18)/(TI-TD))+(ia>0?cl(ia/0.3):0);
    diveT.material.uniforms.uA.value=1;
    const sm=te>=TI?ss(0,0.06,ia)*(1-ss(TF+0.2,TE,te)):0;
    sigil.visible=sm>0.001; towardCam(sigil.position,tmp.set(H.x,H.y+0.45,0),0.45); billboard(sigil); sigil.scale.setScalar(Math.max(0.75+0.5*Math.exp(-Math.max(ia,0)*9),0.001)); set(sigil,ia*1.5,sm*0.9);
    decal.visible=sm>0.001; decal.rotation.y=-te*1.2; set(decal,-ia,sm*0.75);
    spark.pose(ia,H,1.05); ring.pose(ia,3.4,0,0.45);
    caster.rotation.z=0.07*Math.sin(Math.PI*cl(te/TA));
    const h=hitE(ia,5); target.position.x=3.4+0.22*h*(ia>=0?1:0); target.rotation.z=-0.2*h*Math.cos(ia*13);
    o.em=sm*0.3; o.emc.setRGB(1,0.7,0.2);
    if(te<TI){o.g.copy(owl.position);o.gs=0.9;o.ga=0.06+0.1*ss(TD,TI,te);o.li=1.2+1.5*ss(TD,TI,te);}
    else{o.g.copy(H);o.gs=1.3+2*Math.min(ia,0.5);o.ga=0.3*Math.exp(-ia*9)+0.06*sm;o.li=4*Math.exp(-ia*5)+0.8*sm;}
    baseHit(o,ia,H); o.shake=0.3; o.dist=0.5; o.flash=0.8;
  };
}});

// =====================================================================
// 3 · PEACE MAKER — una paloma de luz crema brota de las orejas, planea sobre el rival y revolotea en círculo; deja
//     caer un halo dorado que se posa sobre su cabeza y lo aplasta: anillos que bajan por su cuerpo y chevrones
//     violetas (Débil, ataque reducido). Nivel 2.
// =====================================================================
defs.push({key:"sty_boPeaceMaker",name:"Peace Maker (Ear) (estilizado)",dur:2.3,ti:0.95,tier:2,pal:"Sty Pájaro · Paloma",stylized:true,...ZONES,
  phases:[["Paloma",0],["Vuelo",0.15],["Revoloteo",0.72],["Halo",0.95],["Debilidad",1.25],["Fin",1.9]],
build(a){
  const L=a.L,TV=0.15,TR=0.72,TI=0.95,TW=1.25,TE=2.25,TH0=0.74;
  const P0=V3(-3.5,2.15,0.1), PC=V3(-0.2,3.7,0.6), P1=V3(3.0,3.05,0.3), HY=2.05;
  const dpos=(t,o)=>{if(t<TV)return o.copy(P0).setY(P0.y+0.2*ss(0,TV,t));
    if(t<TR){const k=(t-TV)/(TR-TV);return bez(tmp.copy(P0).setY(P0.y+0.2),PC,P1,k*(2-k)*0.5+k*0.5,o);}
    const tt=t-TR, an=tt*7.5+Math.PI; if(t<TW)return o.set(3.4+Math.cos(an)*0.6,3.05+0.08*Math.sin(tt*10),Math.sin(an)*0.6);
    const k=t-TW;return o.set(3.4+Math.cos(an)*(0.6+k*1.2),3.05+k*1.6,Math.sin(an)*(0.6+k*1.2));};
  const dove=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),birdMat(0xfff3dc,0x8a8fd0,{fl:0.4,sp:1,tf:1,tu:0,hs:0.14,eye:0})); L.mesh.add(dove);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(0.46,0.075,10,40).rotateX(Math.PI/2),S.mat(HALO_FS,{uGl:{value:0}},{mode:'solid'})); L.mesh.add(halo);
  const rings=[0,1,2].map(()=>{const m=groundPlane(1.4,3.4,0,S.mat(S.FS.RING,{},{mode:'energy'}));L.mesh.add(m);return m;});
  const weak=S.status(a,'weak',[target],TI+0.05,TE);
  const K=`const float TV=${f(TV)};const float TR=${f(TR)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 PC=${v3(PC)};const vec3 P1=${v3(P1)};${BZ}`;
  const DOVEF="mix(vec3(.94,.9,.82),vec3(.62,.66,.9),vMix*.6)*(.85+.25*u)";
  // plumas que suelta en el vuelo y en el revoloteo
  a.count+=S.pts(L.part,20,VV+K+`void main(){float s=TV+aSeed.x*(TI-TV);float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TV)/(TR-TV),0.,1.);vec3 b=s<TR?bz(P0+vec3(0.,.2,0.),PC,P1,k*(2.-k)*.5+k*.5):vec3(3.4+cos((s-TR)*7.5+3.14)*.6,3.05,sin((s-TR)*7.5+3.14)*.6);
   vec3 p=b+vec3(sin(t*2.5+aSeed.z*9.)*.3,-.85*t,(aSeed.w-.5)*.4*t);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.z*6.2832+t*2.5;vMix=aSeed.w;put(p,.58+.16*aSeed.w);}`,FEATHER_FS(DOVEF));
  // motas doradas que caen del halo al posarse
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.1;float t=max(uT-s,0.);float age=t/(.5+.3*aSeed.y);float an=aSeed.z*6.2832;
   vec3 p=vec3(3.4+cos(an)*.5,2.05-t*1.6,sin(an)*.5);vA=(uT>s&&age<1.&&p.y>.05)?1.:0.;vR=t*4.;vK=0.;put(p,.24+.1*aSeed.w);}`,STAR_FS,{mode:'energy'});
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.21,toCam:0.5});
  const du=dove.material.uniforms, hu=halo.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, born=ss(0,TV,te), gone=ss(TW+0.25,TE-0.2,te);
    dpos(te,tmp); dove.visible=born>0.001&&gone<0.999; dove.position.copy(tmp);
    const dir=te<TR?angOf(dpos,Math.max(te,TV+0.02)):0; billboard(dove,te<TR?0.25*(dir-Math.PI/2)*ss(TV,TV+0.1,te):0.15*Math.sin(te*6));
    dove.scale.setScalar(Math.max(2.1*(0.55+0.45*born),0.001));
    du.uFl.value=0.35+0.8*Math.sin(te*(te<TR?20:26)); du.uSp.value=1; du.uEr.value=te<TV?1-born:gone; du.uGl.value=0.15; du.uA.value=1;
    // halo: se suelta en el revoloteo, cae sobre la cabeza y baja aplastando
    const hk=cl((te-TH0)/(TI-TH0)), press=ss(TI,TW,te), hgone=ss(TW+0.1,TW+0.5,te);
    halo.visible=te>TH0-0.05&&hgone<0.999;
    const hy=te<TI?3.0-(3.0-HY)*hk*hk:HY-0.55*press;
    halo.position.set(3.4,hy,0); const sq=te<TI?1:1+0.25*hitE(ia,9)*Math.sin(ia*40);
    halo.scale.set(sq*(1-0.15*press)*(1-hgone),Math.max(1-hgone,0.001)*(1/sq),sq*(1-0.15*press)*(1-hgone)+0.001);
    hu.uGl.value=0.25+0.6*hitE(ia,6);
    rings.forEach((m,i)=>{const t=ia-0.08*i, k=cl(t/0.55);m.visible=t>=0&&k<1;m.position.y=HY-0.2-k*1.8;m.scale.setScalar(0.7+0.35*k);set(m,0.1+0.6*k,(1-k)*0.9);});
    spark.pose(ia,tmp.set(3.3,HY,0),0.9);
    weak.pose(te);
    const h=hitE(ia,7); target.scale.y=1-0.14*h*(ia>=0?1:0)-0.05*press*(1-ss(TW,TE,te)); target.position.x=3.4+0.08*h*(ia>=0?1:0);
    o.em=0.25*press*(1-ss(TW,TE,te)); o.emc.setRGB(0.58,0.36,0.92);
    if(te<TI){o.g.copy(dove.position);o.gs=1.0;o.ga=0.08;o.li=1.2;}
    else{o.g.set(3.4,HY,0);o.gs=1.4;o.ga=0.25*Math.exp(-ia*8);o.li=3*Math.exp(-ia*5);}
    baseHit(o,ia,HD); o.shake=0.25; o.dist=0.4; o.flash=0.7;
  };
}});

// =====================================================================
// 4 · PINK CHEEK — rubor rosa en las mejillas; brotan corazones que revolotean y se funden en el Axie (+2 PA: dos
//     estrellas doradas que suben) y una brisa en espiral lo eleva un palmo (+1 PM). Sobre sí mismo. Nivel 1.
// =====================================================================
defs.push({key:"sty_boPinkCheek",name:"Pink Cheek (estilizado)",dur:1.2,ti:0.3,tier:1,pal:"Sty Pájaro · Rubor",stylized:true,
  phases:[["Rubor",0],["Esporas",0.3],["Afecto",0.6],["Fin",0.95]],
build(a){
  const L=a.L,TI=0.3,TF=0.6,TE=1.15;
  const blush=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.42),S.mat(BLUSH_FS,{},{mode:'matter',depthTest:false}));m.userData.s=s;L.mesh.add(m);return m;});
  const breeze=[0,Math.PI].map(ph=>{const m=new THREE.Mesh(paramTube((t,o)=>{const an=ph+t*Math.PI*2*1.6,r=0.75-0.15*t;return o.set(Math.cos(an)*r,0.05+0.9*t,Math.sin(an)*r);},70,6,0.05,0.025),windMat(0xffe1ec,0xd65a8c));m.position.x=CX;L.trail.add(m);return m;});
  const K=`const float TI=${f(TI)};const float TF=${f(TF)};const float CX=${f(CX)};`;
  // corazones: salen de las mejillas, revolotean y se funden en el Axie
  a.count+=S.pts(L.part,12,VV+K+`void main(){float sd=aSeed.w<.5?1.:-1.;float s=TI*.6+aSeed.x*.15;float t=max(uT-s,0.);
   vec3 c0=vec3(CX+.15,1.5,.32*sd);float an=aSeed.z*6.2832;vec3 ofs=c0+vec3(.25+.5*aSeed.y,.35+.5*aSeed.z,sd*(.35+.4*aSeed.y))*(1.-exp(-t*5.));
   float back=smoothstep(TF-.1,TF+.25+.1*aSeed.y,uT);vec3 p=mix(ofs,vec3(CX,1.0,0.),back)+vec3(0.,.08*sin(uT*12.+an),0.);
   vA=uT>s?1.:0.;vK=smoothstep(.75,1.,back);vR=.3*sin(uT*9.+an);put(p,(.58+.16*aSeed.y)*(1.-.5*back));}`,HEART_FS);
  // +2 PA: estrellas doradas que suben
  a.count+=S.pts(L.part,2,VV+K+`void main(){float s=TF+.02+aSeed.x*.08;float age=(uT-s)/.5;float i=step(.5,aSeed.w)*2.-1.;
   vec3 p=vec3(CX+.35*i,1.2+age*1.1,.2*i);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vR=uT*4.;vK=0.;put(p,.55);}`,STAR_FS.replace('uC1','vec3(1.,.8,.3)'),{mode:'energy'});
  a.count+=S.pts(L.part,3,VV+K+`void main(){float s=TF+.05+aSeed.x*.12;float age=(uT-s)/.55;
   vec3 p=vec3(CX+(aSeed.z-.5)*.6,.3+age*1.2,(aSeed.w-.5)*.5);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vR=0.;vK=0.;put(p,.36);}`,CHEVUP_FS,{mode:'energy'});
  const ring=S.groundRing(L.decal,2.2);
  a.pose=function(te,o){
    const on=ss(0,0.18,te)*(1-ss(TF+0.1,TE-0.25,te));
    blush.forEach(m=>{towardCam(m.position,tmp.set(CX+0.15,1.48,0.3*m.userData.s),0.35);billboard(m,0);m.visible=on>0.001;m.scale.setScalar(Math.max(0.7+0.3*on+0.12*Math.sin(te*20)*on,0.001));m.material.uniforms.uA.value=on;});
    const lift=ss(TI,TF,te)*(1-ss(TE-0.35,TE,te));
    caster.position.y=0.14*lift; caster.rotation.z=0.06*Math.sin(te*9)*on;
    breeze.forEach((m,i)=>{const k=ss(TI,TF+0.1,te),out=ss(TE-0.4,TE,te);m.visible=k>0.001&&out<0.999;m.rotation.y=-te*(6+i);
      m.material.uniforms.uP.value=0.2+0.8*k;m.material.uniforms.uQ.value=out;m.material.uniforms.uA.value=1-out;});
    ring.pose(te-TI,CX,0,0.45,0.9);
    const cm=caster.userData.m; cm.emissive.setRGB(1,0.45,0.65); cm.emissiveIntensity=0.25*on+0.3*ss(TF,TF+0.1,te)*(1-ss(TF+0.15,TE,te));
    o.g.set(CX,1.3,0.2);o.gs=1.0;o.ga=0.1*on;o.li=1.5*on;
    o.ia=te-TI;o.c.set(CX,1.0,0);o.shake=0;o.dist=0;o.flash=0;
  };
}});

// =====================================================================
// 5 · RISKY BIRD — un capullo de plumas carmesí envuelve al Axie, que salta; de él sale un halcón carmesí que cae en
//     picado suicida contra el rival dejando una estela roja (golpe fuerte). Al Axie le caen plumas mustias
//     y queda Débil. Nivel 2.
// =====================================================================
defs.push({key:"sty_boRiskyBird",name:"Risky Bird (estilizado)",dur:2.4,ti:1.0,tier:2,pal:"Sty Pájaro · Carmesí",stylized:true,...ZONES,
  phases:[["Plumaje",0],["Salto",0.3],["Picado",0.68],["Impacto",1.0],["Rebote",1.15],["Debilidad",1.65]],
build(a){
  const L=a.L,TS=0.3,TL=0.48,TD=0.68,TI=1.0,TB=1.15,TE=2.35;
  const H0=V3(-3.6,1.9,0), AP=V3(-1.6,3.4,0.35), C2=V3(1.4,3.1,0.15), HT=V3(3.1,1.3,0);
  const hpos=(t,o)=>{if(t<TD){const k=ss(TL,TD,t);return bez(H0,tA.set(-3.0,3.2,0.3),AP,k,o);} if(t<TI){const k=(t-TD)/(TI-TD);return bez(AP,C2,HT,k*k,o);} return o.copy(HT);};
  const hawk=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),birdMat(0xff6650,0x6e0a1e,{fl:0.2,sp:1,tf:0.4,tu:0,hs:0.12,eye:0})); L.mesh.add(hawk);
  const diveT=new THREE.Mesh(paramTube((k,o)=>hpos(TD+k*(TI-TD),o),70,7,0.04,0.16),S.mat(TRAIL_FS.replace('styRamp(.35+.6*k)','styRampOf(vec3(.86,.12,.2),.35+.6*k)'),{uQ:{value:0},uG:{value:1}},{mode:'matter'})); L.trail.add(diveT);
  const weak=S.status(a,'weak',[caster],TB,TE);
  const K=`const float TS=${f(TS)};const float TL=${f(TL)};const float TI=${f(TI)};const float TB=${f(TB)};const float CX=${f(CX)};const vec3 HT=${v3(HT)};`;
  const RED="mix(vec3(.82,.1,.18),vec3(1.,.45,.32),vMix)*(.8+.3*u)";
  // capullo: plumas que orbitan y se cierran sobre el Axie, luego estallan al salir el halcón
  a.count+=S.pts(L.part,26,VV+K+`void main(){float an=aSeed.x*6.2832+uT*(5.+2.*aSeed.y);float cl_=smoothstep(0.,TS,uT);
   float r=mix(1.25,.5,cl_);float y=.3+1.4*aSeed.z;vec3 p=vec3(CX+cos(an)*r,y+.3*sin(uT*4.+aSeed.w*6.),sin(an)*r);
   float br=max(uT-TL,0.);if(uT>TL){vec3 d=normalize(vec3(cos(an),.4,sin(an)));p+=d*3.*(1.-exp(-br*4.))+vec3(0.,-1.2*br*br,0.);}
   p.y=max(p.y,.04);vA=smoothstep(0.,.12,uT);vK=smoothstep(TL+.25+aSeed.y*.2,TL+.75,uT);vR=an+1.57;vMix=aSeed.w;put(p,.64+.16*aSeed.w);}`,FEATHER_FS(RED));
  // estallido de plumas en el impacto
  a.count+=S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=t/(.8+.4*aSeed.y);
   vec3 v=normalize(rnd()+vec3(.55,.35,0.))*(2.5+3.*aSeed.z);vec3 p=HT+v*(1.-exp(-t*3.6))/3.6+vec3(sin(t*3.+aSeed.w*9.)*.15,-.6*t*t,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.2832+t*(5.+5.*aSeed.y);vMix=aSeed.y;put(p,.66+.2*aSeed.w);}`,FEATHER_FS(RED));
  // plumas mustias que caen sobre el Axie (Débil)
  a.count+=S.pts(L.part,12,VV+K+`void main(){float s=TB+aSeed.x*.6;float t=max(uT-s,0.);float age=t/1.;
   vec3 p=vec3(CX+(aSeed.z-.5)*.9,1.9-t*1.5,(aSeed.w-.5)*.8)+vec3(sin(t*4.+aSeed.y*8.)*.18,0.,0.);
   vA=(uT>s&&age<1.&&p.y>.04)?1.:0.;vK=smoothstep(.6,1.,age);vR=1.2+sin(t*3.+aSeed.y*6.)*.6;vMix=aSeed.y;put(p,.54);}`,FEATHER_FS("mix(vec3(.42,.28,.3),vec3(.6,.42,.42),vMix)*(.8+.3*u)"));
  // polvo del salto
  a.count+=S.pts(L.part,10,VV+K+`void main(){float s=TS+aSeed.x*.05;float t=max(uT-s,0.);float age=t/(.45+.2*aSeed.y);float an=aSeed.z*6.2832;
   vec3 p=vec3(CX+cos(an)*.5*(1.-exp(-t*5.)),.08+t*.3,sin(an)*.5*(1.-exp(-t*5.)));vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=an;
   put(p,(.3+.1*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:'vec3(.6,.48,.34)'}));
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.62,toCam:0.55}), spark2=S.hitSpark(L.mesh,1.4,{seed:0.12,toCam:0.35});
  const ring=S.groundRing(L.decal,3.0), shadow=S.contactShadow(L.decal,1.4);
  const hu=hawk.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB;
    // salto del Axie
    const jump=te>TS&&te<TD+0.1?Math.sin(Math.PI*cl((te-TS)/(TD+0.1-TS))):0;
    caster.position.y=0.55*jump; caster.rotation.z=-0.15*jump+(ib>0?0.12*ss(TB,TB+0.3,te)*(1-ss(TE-0.4,TE,te)):0);
    shadow.pose(CX,0,0.9-0.3*jump,0.4*jump);
    const cm=caster.userData.m; cm.emissive.setRGB(1,0.25,0.25); cm.emissiveIntensity=0.35*ss(0,TS,te)*(1-ss(TL,TL+0.3,te));
    // halcón
    hpos(te,tmp); const born=ss(TL-0.05,TL+0.08,te);
    hawk.visible=born>0.001&&te<TI+0.05; hawk.position.copy(tmp);
    const dir=angOf(hpos,Math.min(Math.max(te,TL+0.02),TI-0.011)); billboard(hawk,(dir-Math.PI/2)*(te<TD?0.4:1));
    hawk.scale.setScalar(Math.max(2.4*(0.6+0.4*born+0.15*ss(TD,TI,te)),0.001));
    hu.uFl.value=te<TD?0.3+0.7*Math.sin(te*26):0.55; hu.uSp.value=te<TD?1:1-0.45*ss(TD,TD+0.1,te); hu.uEr.value=1-born; hu.uGl.value=0.25+0.35*ss(TD,TI,te); hu.uA.value=1;
    diveT.visible=te>TD&&ia<0.35; diveT.material.uniforms.uP.value=cl((te-TD)/(TI-TD)); diveT.material.uniforms.uQ.value=cl((te-TD-0.2)/(TI-TD))+(ia>0?cl(ia/0.35):0); diveT.material.uniforms.uA.value=1;
    spark.pose(ia,TC,1.15); spark2.pose(ia-0.04,tmp2.set(3.5,1.7,0.3),0.9); ring.pose(ia,3.4,0,0.5,1.1);
    weak.pose(te);
    const h=hitE(ia,5); target.position.x=3.4+0.3*h*(ia>=0?1:0); target.rotation.z=-0.28*h*Math.cos(ia*13);
    o.em=0;
    if(te<TL){o.g.set(CX,1.2,0);o.gs=1.0;o.ga=0.1*ss(0,TS,te);o.li=1.5;}
    else if(te<TI){o.g.copy(hawk.position);o.gs=1.0;o.ga=0.1;o.li=2;}
    else{o.g.copy(TC);o.gs=1.5+2*Math.min(ia,0.4);o.ga=0.3*Math.exp(-ia*9);o.li=4.5*Math.exp(-ia*5);}
    baseHit(o,ia,TC); o.shake=0.7; o.dist=0.7; o.flash=1;
  };
}});
const tmp2=V3(0,0,0);

// =====================================================================
// 6 · EARLY BIRD — «el primer vuelo del alba»: trinos en las orejas encienden el lucero sobre la cabeza; el lucero se
//     vuelve un vencejo azul de pecho rosado que cae en picado rasante con una estela de cielo al amanecer; al
//     golpear, un sol pintado asoma sobre el rival y una pincelada de primera luz recorre el suelo hasta el Axie,
//     que se perfila en dorado (+1 PA). Nivel 2. (Carta de Early Bird, Axie jugable.)
// =====================================================================
defs.push({key:"sty_boEarlyBird",name:"Early Bird (estilizado)",dur:2.1,ti:0.75,tier:2,pal:"Sty Pájaro · Alba",stylized:true,...ZONES,
  phases:[["Canto",0],["Vuelo",0.35],["Amanecer",0.75],["Primera luz",1.0],["Fin",1.7]],
build(a){
  const L=a.L,TL=0.35,TI=0.75,TR=1.0,TA=1.3,TE=2.05;
  const S0=V3(-3.55,2.35,0.05), SC=V3(-0.4,0.6,0.8), S1=V3(3.15,1.25,0);
  const path=(t,o)=>bez(S0,SC,S1,t,o);
  // trinos: tres arcos por oreja, en pincelada
  const CHIRP_FS=`void main(){vec2 p=(vUv-vec2(.15,.5))*2.;float r=length(p);float an=atan(p.y,p.x);
   float m=0.;for(int i=0;i<3;i++){float fi=float(i);float k=clamp(uP*1.4-fi*.2,0.,1.);
    m+=smoothstep(.06,.02,abs(r-(.35+.55*k)))*smoothstep(.75,.35,abs(an))*step(.01,k)*(1.-k*.7);}
   if(m<.02)discard;gl_FragColor=vec4(styRampOf(uC1,.75)*1.2,m*uA);}`;
  const chirps=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),S.mat(CHIRP_FS,{},{mode:'matter',depthTest:false}));m.userData.s=s;L.mesh.add(m);return m;});
  const star=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),S.mat(`void main(){vec2 q=(vUv-.5)*2.;vec2 a=abs(q);
   float s=pow(max(0.,1.-a.x*a.y*18.-min(a.x,a.y)*1.5),3.)*smoothstep(1.,.15,max(a.x,a.y));float c=pow(max(0.,1.-length(q)*1.4),2.);
   float m=s+c;if(m<.02)discard;gl_FragColor=vec4(styRampOf(uC1,.6+.4*c)*1.7,m*uA);}`,{},{mode:'energy',depthTest:false})); L.mesh.add(star);
  const swift=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),birdMat(0xff9fb4,0x26407e,{fl:0.2,sp:1,tf:1,tu:0,hs:0.12,eye:0})); L.mesh.add(swift);
  // estela de cielo al amanecer (celeste → rosa → oro en la cabeza), energía suave
  const trail=new THREE.Mesh(paramTube(path,80,8,0.05,0.17),S.mat(`uniform float uQ;
   void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float k=(u-uQ)/max(uP-uQ,.001);
    float c=abs(dot(normalize(vN),normalize(vV)));vec4 nz=styNoise(vec2(u*3.-uT*2.,vUv.y*.5));
    vec3 sky=k<.5?mix(vec3(.35,.62,.98),vec3(.95,.42,.6),k*2.):mix(vec3(.95,.42,.6),vec3(1.,.78,.36),(k-.5)*2.);
    float m=smoothstep(.15,.6,c)*k*(.55+.45*smoothstep(.3,.7,nz.r));if(m<.02)discard;
    gl_FragColor=vec4(sky*1.25,m*uA);}`,{uQ:{value:0}},{mode:'energy'})); L.trail.add(trail);
  const dawn=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),S.mat(DAWN_FS,{},{mode:'matter',depthTest:false})); L.mesh.add(dawn);
  const LEN=S1.x-CX+0.4;
  const line=groundPlane(1,(S1.x+CX)/2,0.025,S.mat(LINE_FS,{},{mode:'energy'}),0.6); line.scale.x=LEN; L.decal.add(line);
  const glyph=groundPlane(2.0,CX,0.022,S.mat(SIGIL_FS,{},{mode:'energy'})); L.decal.add(glyph);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TA=${f(TA)};const vec3 S0=${v3(S0)};const vec3 SC=${v3(SC)};const vec3 S1=${v3(S1)};const float CX=${f(CX)};${BZ}`;
  const SWF="mix(vec3(.26,.42,.82),vec3(1.,.6,.7),vMix)*(.8+.3*u)";
  // plumas que suelta el vencejo
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-TL)/(TI-TL);vec3 p=bz(S0,SC,S1,k*k)+vec3(sin(t*3.+aSeed.z*9.)*.15,-.6*t,(aSeed.w-.5)*.3*t);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.z*6.2832+t*3.;vMix=aSeed.w;put(p,.52+.14*aSeed.w);}`,FEATHER_FS(SWF));
  // impacto: abanico de plumas detrás del rival
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.75+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.8,.3,0.));vec3 p=S1+d*(.4+1.2*aSeed.z)*(1.-exp(-t*4.))+vec3(sin(t*3.+aSeed.w*9.)*.1,-.45*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.2832+t*(4.+4.*aSeed.y);vMix=aSeed.y;put(p,.6+.16*aSeed.w);}`,FEATHER_FS(SWF));
  // primera luz en el Axie: destellos dorados y flecha de iniciativa (+1 PA)
  a.count+=S.pts(L.part,10,VV+K+`void main(){float s=TA+aSeed.x*.15;float life=.45+aSeed.y*.25;float age=(uT-s)/life;
   vec3 p=vec3(CX,0.,0.)+vec3((aSeed.z-.5)*1.,.3+aSeed.w*1.6,(aSeed.y-.5)*.8);vR=uT*3.;vK=0.;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.24+.2*aSeed.z)*sin(age*3.14159));}`,STAR_FS,{mode:'energy'});
  a.count+=S.pts(L.part,1,VV+K+`void main(){float s=TA+.05;float age=(uT-s)/.7;vec3 p=vec3(CX+.35,.6+age*1.4,.25);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vR=uT*4.;vK=0.;put(p,.6);}`,STAR_FS.replace('uC1','vec3(1.,.8,.3)'),{mode:'energy'});
  a.count+=S.pts(L.part,3,VV+K+`void main(){float s=TA+.05+aSeed.x*.2;float age=(uT-s)/.7;
   vec3 p=vec3(CX+(aSeed.z-.5)*.8,.4+age*1.3,(aSeed.w-.5)*.6);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vR=0.;vK=0.;put(p,.36);}`,CHEVUP_FS,{mode:'energy'});
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.44,toCam:0.55}); const ring=S.groundRing(L.decal,2.6);
  const sp=V3(0,0,0), ear=V3(0,0,0), su=swift.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TA;
    caster.rotation.z=-0.1*ss(0,TL,te)+0.18*ss(TL,TL+0.08,te)-0.08*ss(TL+0.1,TL+0.5,te);
    for(const m of chirps){const k=cl((te-0.04)/0.4);towardCam(m.position,ear.set(CX+0.1,1.86,0.28*m.userData.s),0.25);
      billboard(m,m.userData.s>0?0.35:-0.35);m.visible=k>0&&k<1;set(m,k,1-ss(0.28,0.45,te));}
    const sg=ss(0.08,TL,te), go=ss(TL-0.03,TL+0.05,te);
    towardCam(star.position,S0,0.3); billboard(star,te*2); star.visible=sg>0.01&&go<0.99;
    star.scale.setScalar(Math.max(0.35+0.45*sg+0.25*go,0.001)); star.material.uniforms.uA.value=sg*(1-go);
    const k=cl((te-TL)/(TI-TL)), e=k*k;
    path(e,sp); swift.visible=te>=TL-0.03&&te<TI+0.03;
    towardCam(swift.position,sp,0.2); billboard(swift,angOf(path,Math.min(Math.max(e,0.02),0.98))-Math.PI/2);
    swift.scale.setScalar(2.1*(0.65+0.3*e)); su.uFl.value=0.2+0.5*Math.sin(te*34)*(1-e); su.uSp.value=1-0.55*e; su.uEr.value=1-go; su.uGl.value=0.2*e; su.uA.value=1;
    trail.visible=te>=TL; trail.material.uniforms.uP.value=e; trail.material.uniforms.uQ.value=Math.max(0,e-0.55)+(te>TI?cl((te-TI)/0.3):0);
    trail.material.uniforms.uA.value=1-ss(TI+0.15,TI+0.35,te);
    const dr=ss(TI,TI+0.25,te), df=1-ss(TI+0.4,TR+0.4,te);
    towardCam(dawn.position,tmp.set(target.position.x,2.5+0.05*Math.sin(te*3),target.position.z),0.3); billboard(dawn);
    dawn.scale.setScalar(1.6*(0.8+0.25*dr)); dawn.visible=ia>=0&&df>0.001; set(dawn,dr,dr*df);
    spark.pose(ia,S1,1); ring.pose(ia,3.4,0,0.45);
    set(line,cl((te-TR+0.1)/(TA-TR+0.1)),te>=TR-0.1?1-ss(TA+0.3,TE,te):0);
    glyph.rotation.y=te*0.8; set(glyph,te,ir>=0?ss(TA,TA+0.15,te)*(1-ss(TE-0.4,TE,te))*0.7:0);
    const h=hitE(ia,6); target.position.x=3.4+h*0.22*(ia>=0?1:0); target.rotation.z=-h*0.25*Math.cos(ia*15);
    const cm=caster.userData.m; cm.emissive.setRGB(1,0.78,0.35);
    cm.emissiveIntensity=0.2*sg*(1-go)+(ir>=0?0.7*Math.exp(-ir*4)+0.12*(1-ss(TE-0.4,TE,te)):0);
    caster.position.y=ir>=0?0.08*Math.sin(Math.PI*cl(ir/0.3)):0;
    if(te<TL){o.g.copy(S0);o.gs=0.9*sg;o.ga=0.2*sg;o.li=1.8*sg;}
    else if(te<TI){o.g.copy(sp);o.gs=1.0;o.ga=0.12;o.li=2.2;}
    else if(te<TA){o.g.set(S1.x,0.8,0);o.gs=1.2+1.2*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*9);o.li=3.5*Math.exp(-ia*5)+1.5*dr*df;}
    else{o.g.set(CX,1.0,0.3);o.gs=1.3;o.ga=0.2*Math.exp(-ir*5);o.li=2.5*Math.exp(-ir*4);}
    baseHit(o,ia,S1); o.shake=0; o.dist=0.5; o.flash=0.9;
  };
}});

VFX.module("Estilizado · Pájaro · Orejas",defs);
})();

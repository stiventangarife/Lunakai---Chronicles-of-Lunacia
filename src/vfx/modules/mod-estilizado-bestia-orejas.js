// =====================================================================
// ESTILIZADO · BESTIA · OREJAS (Hito 101) — las 7 cartas de orejas de Bestia hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_belieber, sty_lamb, sty_nutEars, sty_nyan, sty_foxyEars, sty_puppyEar, sty_zen).
// Mismos dur / ti / fases que las originales. Semántica según PartCards.js:
//   Belieber (3 golpes) · Innocent Lamb (sobre sí: +2 PA) · Nut Cracker (daño) · Nyan (daño, +30 % si sangra; variante «sangra»)
//   Foxy (daño a distancia) · Puppy (sobre sí: cura 30 y quita Lento a todo el equipo) · Zen (sobre sí: cura 65, +2 PA el turno siguiente)
// Identidad de Bestia: pelaje ámbar y naranja cálido; cada carta suma su acento. Los efectos nacen de las orejas del
// lanzador (≈ (-3.72, 1.86, ±0.26)). Los colores fijos se escriben en espacio lineal (lin()).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_BEL=pal("Sty Bestia · Belieber",["#ffc24a","#d2401a"]);
const P_LAMB=pal("Sty Bestia · Cordero",["#ffd98a","#c98226"]);
const P_NUT=pal("Sty Bestia · Nuez",["#f2b25a","#9a4a16"]);
const P_NYAN=pal("Sty Bestia · Nyan",["#ff9cbc","#d6336a"]);
const P_FOX=pal("Sty Bestia · Zorro",["#ffb446","#d9500c"]);
const P_PUP=pal("Sty Bestia · Cachorro",["#ffcc55","#d9790e"]);
const P_ZEN=pal("Sty Bestia · Zen",["#b8ec7e","#1f8f5a"]);

// color sRGB → expresión GLSL en espacio lineal (la salida sRGB lo vuelve a aclarar)
const lin=(hex)=>{const c=new THREE.Color(hex);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};   // THREE.Color.set ya convierte sRGB → lineal

const CX=-3.7, TX=3.4, TC=V3(3.15,1.2,0);
const ZONES={zoneCaster:0.6,zoneTarget:1.1};
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0), qb=new THREE.Quaternion();
const aim=(o,d,spin)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());if(spin)o.quaternion.multiply(qb.setFromAxisAngle(XA,spin));};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
// orejas del lanzador (coordenadas del muñeco) → mundo
const EAR_L=[V3(-0.02,1.86,0.26),V3(-0.02,1.86,-0.26)];
const earW=(i,out)=>{const e=EAR_L[i],c=Math.cos(caster.rotation.z),s=Math.sin(caster.rotation.z);
  return out.set(caster.position.x+e.x*c*caster.scale.x-e.y*s*caster.scale.y,caster.position.y+e.x*s*caster.scale.x+e.y*c*caster.scale.y,caster.position.z+e.z);};
const follow=g=>{g.position.copy(caster.position);g.rotation.z=caster.rotation.z;g.scale.copy(caster.scale);};

// ---------- colores de materia (semánticos, fijos, lineales) ----------
const EARTH=lin("#9c7a55"), CREAM=lin("#fff1d2"), GOLD=lin("#f0b13c"), GOLDD=lin("#a8670f"), IRON=lin("#5d6470"),
  BLOOD=lin("#c3141f"), WALNUT=lin("#8a4d22"), WALNUTL=lin("#c98b4c"), KERNEL=lin("#f2d6a0"), FOXO=lin("#f07a1e"),
  INK=lin("#1f4a36"), WOOL=lin("#f0cf98"), PINK=lin("#f28fb2"), JADE=lin("#3fae6e"), LEAF=lin("#5fa83a"), HEALG=lin("#58e07a"), SLOWB=lin("#6b8ff0");

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.2,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
const solidMat=(body,o,side)=>S.mat(SOLID(body,o),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:side||THREE.FrontSide});
// sello de pincel en el suelo con un dibujo propio; uP = erosión
const GLYPH=(draw,gain='1.')=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.6;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g)*${gain},m*er*uA*.85);}`;
// mancha en el suelo (materia)
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// cinta vertical a lo largo de una curva (geometría fija; u = recorrido, v = ancho)
function ribbonGeo(fn,seg,w){
  const pos=[],uv=[],idx=[],p=V3(0,0,0);
  for(let i=0;i<=seg;i++){const u=i/seg;fn(u,p);pos.push(p.x,p.y-w/2,p.z,p.x,p.y+w/2,p.z);uv.push(u,0,u,1);
    if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(pos.map((_,i)=>i%3===2?1:0),3));
  g.setIndex(idx);return g;
}
// haz de longitud 1 sobre +x (uv.y recorre la longitud); aimBeam lo tiende entre a y b
const beamGeo=(r,seg=10)=>new THREE.CylinderGeometry(r,r,1,seg,1,true).translate(0,0.5,0).rotateZ(-Math.PI/2);
const aimBeam=(m,a,b,rk)=>{m.position.copy(a);tmp2.copy(b).sub(a);const L=tmp2.length();aim(m,tmp2,0);m.scale.set(Math.max(L,0.001),rk,rk);};
// partícula: cruz de curación (energía de color fijo)
const CROSS_P=(col,gain=1.4)=>S.PV+`void main(){vec2 q=styPC()-.5;float d=min(max(abs(q.x)-.09,abs(q.y)-.3),max(abs(q.x)-.3,abs(q.y)-.09));
 float a=smoothstep(.03,-.01,d)*vA;float rim=smoothstep(.0,-.05,d);if(a<.01)discard;
 gl_FragColor=vec4(mix(${col}*.55,${col}*${f(gain)}+vec3(.25),rim),a);}`;
// partícula: confeti (rectángulo que gira y se voltea) con color por semilla
const CONFETTI_P=S.PV+`void main(){vec2 q=styPC()-.5;float fl=abs(cos(vR*1.7+vMix*6.));if(abs(q.x)>.32*fl+.04||abs(q.y)>.18)discard;
 float k=fract(vMix*7.31);vec3 c=k<.25?${lin("#ff5a8a")}:(k<.5?${lin("#ffc63a")}:(k<.75?${lin("#ff8a2a")}:${lin("#7fd0ff")}));
 c*=.75+.45*fl;if(vA<.02)discard;gl_FragColor=vec4(c,vA);}`;
const defs=[];

// =====================================================================
// 1 · BELIEBER — las orejas afinan; un pentagrama pintado se despliega hasta el rival y tres ráfagas de notas
//     de tinta y fuego viajan por él (3 golpes a 0,60 · 0,82 · 1,04 s). En el último estalla confeti y llamas.
// =====================================================================
defs.push(Object.assign({key:"sty_belieber",name:"Belieber (estilizado)",dur:2.1,ti:1.04,pal:P_BEL,tier:2,stylized:true,
  phases:[["Afinación",0],["Ráfaga I",0.28],["Ráfaga II",0.5],["Ráfaga III",0.72],["Final",1.04],["Brasas",1.3]],
build(a){
  const L=a.L,TL=[0.28,0.5,0.72],FL=0.32,TH=TL.map(t=>t+FL),TI=1.04;
  const EM=V3(-3.55,1.95,0), TCn=V3(3.0,1.3,0), ARC=0.75;
  const staffAt=(u,o)=>o.set(EM.x+(TCn.x-EM.x)*u,EM.y+(TCn.y-EM.y)*u+ARC*Math.sin(Math.PI*u)+0.06*Math.sin(u*9),0.18*Math.sin(Math.PI*u));
  // pentagrama: cinco líneas de tinta vino con brillo ámbar en el frente
  const staff=new THREE.Mesh(ribbonGeo(staffAt,90,0.85),S.mat(`uniform float uQ;void main(){float u=vUv.x,v=vUv.y;if(u>uP)discard;
   float l=0.;for(int i=0;i<5;i++)l=max(l,band(v,.12+float(i)*.19,.05));
   float nz=styNoise(vec2(u*7.,v*.8)+.3).r;float er=styErode(nz*.6+.4*(1.-u),uQ,.08);
   float front=exp(-(uP-u)*7.);float a=l*er*smoothstep(0.,.03,u)*uA;if(a<.02)discard;
   vec3 c=mix(styRampOf(uC2,.22),styRamp(.75),front);gl_FragColor=vec4(c,a);}`,{uQ:{value:-1}},{mode:'matter'}));
  L.mesh.add(staff);
  // ondas de sonido en las orejas (arcos de pincel)
  const earRings=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(S.FS.RING,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const sparks=TH.map((t,i)=>S.hitSpark(L.mesh,1.25,{seed:0.2+i*0.23}));
  const bigSpark=S.hitSpark(L.mesh,1.9,{seed:0.71});
  const ring=S.groundRing(L.decal,3.2);
  const scorch=groundPlane(2.2,TX-0.1,0.026,S.mat(STAIN(lin("#3a1a10"),.5),{},{mode:'matter'})); L.decal.add(scorch);
  const K=`const vec3 EM=${v3(EM)};const vec3 TCn=${v3(TCn)};const float FL=${f(FL)};const float TI=${f(TI)};
  vec3 staffAt(float u){return vec3(EM.x+(TCn.x-EM.x)*u,EM.y+(TCn.y-EM.y)*u+${f(ARC)}*sin(3.14159*u)+.06*sin(u*9.),.18*sin(3.14159*u));}
  float tl(float k){return k<.5?.28:(k<1.5?.5:.72);}`;
  // notas de tinta con relleno cálido: corchea / semicorchea (SDF), borde oscuro
  const NOTE_FS=S.PV+`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
  void main(){vec2 q=styPC()-.5;vec2 h=q-vec2(-.1,-.22);h=mat2(.85,.53,-.53,.85)*h;float d=length(h*vec2(1.,1.5))-.12;
   d=min(d,sdSeg(q,vec2(0.,-.2),vec2(0.,.32))-.035);d=min(d,sdSeg(q,vec2(0.,.32),vec2(.17,.12))-.045);
   if(vMix>.5)d=min(d,sdSeg(q,vec2(0.,.18),vec2(.17,-.02))-.045);
   float a=smoothstep(.02,-.005,d)*vA;if(a<.02)discard;float edge=smoothstep(-.05,-.015,d);
   float l=.55+.45*step(0.,-h.x-h.y);vec3 c=mix(styRamp(.55+.35*l),styRampOf(uC2,.15),edge);gl_FragColor=vec4(c,a);}`;
  S.pts(L.part,18,VV+K+`void main(){float k=floor(aSeed.x*3.);float j=fract(aSeed.x*3.);float s=tl(k)+j*.06;float u=(uT-s)/FL;
   float lane=floor(aSeed.y*5.);vec3 p=staffAt(clamp(u,0.,1.))+vec3(0.,(lane-2.)*.16,0.)+vec3(0.,.05*sin(uT*14.+aSeed.z*6.),0.);
   vA=(u>0.&&u<1.)?smoothstep(0.,.1,u):0.;vK=0.;vR=.25*sin(uT*9.+aSeed.w*6.);put(p,(1.15+.25*aSeed.z)*(.6+.4*smoothstep(0.,.3,u)));}`,NOTE_FS);
  // lenguas de fuego que dejan las notas
  S.pts(L.part,30,VV+K+`void main(){float k=floor(aSeed.x*3.);float s=tl(k)+aSeed.y*FL*.9;float u=(s-tl(k))/FL;
   float life=.22+aSeed.z*.15;float age=(uT-s)/life;vec3 p=staffAt(u)+rnd()*.1+vec3(0.,max(uT-s,0.)*.9,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=(aSeed.w-.5)*.5;put(p,(.32+.14*aSeed.w)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.3}),{mode:'energy'});
  // final: confeti cálido y llamas que suben
  S.pts(L.part,60,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.9,0.))*(2.+2.2*aSeed.z);vec3 p=TCn+v*t*(1.-.55*min(t,1.))+vec3(sin(t*5.+aSeed.w*6.)*.2,-1.4*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-smoothstep(.75,1.,age):0.;vK=0.;vR=t*(6.+8.*aSeed.w);put(p,.34+.12*aSeed.w);}`,CONFETTI_P);
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(TCn.x+.1,.2,0.)+vec3(cos(an)*.45,t*(1.6+.8*aSeed.w),sin(an)*.4);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.25,1.,age);vR=(aSeed.w-.5)*.4;put(p,(.55+.25*aSeed.w)*(1.-age*.3));}`,S.ENERGY_FS(C.flame,{gain:1.4}),{mode:'energy'});
  const su=staff.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.05*Math.sin(te*18)*ss(0.1,0.28,te)*(1-ss(TI,TI+0.2,te));
    staff.visible=te>0.15; set(staff,e3((te-0.15)/0.5),1); su.uQ.value=-1+1.9*ss(TI+0.1,TI+0.75,te);
    earRings.forEach((m,i)=>{const q=((te*2.2)+i*0.5)%1, on=ss(0,0.15,te)*(1-ss(0.75,0.95,te));earW(i,tmp);
      towardCam(m.position,tmp,0.2);billboard(m,0);m.visible=on>0.001;m.scale.setScalar(0.4+1.1*q);set(m,0.1+0.85*q,on*(1-q));});
    let rec=0,last=-1;
    TH.forEach((t,i)=>{const h=te-t;sparks[i].pose(h,TC,0.9+0.15*i);if(h>=0){rec+=hitE(h,8)*(0.5+0.25*i);last=i;}});
    bigSpark.pose(ia,TC,1.1);
    ring.pose(ia,TX,0,0.5,1.1);
    scorch.visible=ia>=0; scorch.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(scorch,ia>=0?-0.1+1.15*ss(0.5,1.0,ia):0,1);
    target.position.x=TX+0.22*rec; target.rotation.z=-0.2*rec; target.scale.set(1+0.05*rec,1-0.06*rec,1+0.05*rec);
    o.em=0.35*rec; o.emc.copy(U.uC1.value);
    glowOf(caster,U.uC1.value,0.25*ss(0.05,0.28,te)*(1-ss(0.8,1.1,te)));
    if(last<0){earW(0,tmp);o.g.copy(tmp);o.gs=0.6;o.ga=0.12*ss(0,0.2,te);o.li=1.2*ss(0,0.2,te);o.ia=te-TH[0];o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0;}
    else{const h=te-TH[last];o.g.copy(TC);o.gs=1+1.5*hitE(h,4);o.ga=0.3*hitE(h,6);o.li=4*hitE(h,5);
      o.ia=h;o.c.copy(TC);o.shake=last===2?1:0.4;o.dist=last===2?1:0.5;o.flash=last===2?0.8:0.4;}
  };
}},ZONES));

// =====================================================================
// 2 · INNOCENT LAMB — un vellón de nubes cálidas rodea al lanzador como un cordero; sobre su cabeza aparece una
//     campana dorada que repica tres veces (0,75 · 0,97 · 1,19 s). Dos gemas de oro (+2 PA) bajan girando al pecho.
// =====================================================================
defs.push({key:"sty_lamb",name:"Innocent Lamb (estilizado)",dur:2.3,ti:0.75,pal:P_LAMB,tier:2,stylized:true,
  phases:[["Plegaria",0],["Cordero",0.25],["Campana",0.75],["Renacer",1.03],["Disipación",1.85]],
build(a){
  const L=a.L,TM=0.25,TI=0.75,TR=[0.75,0.97,1.19],AMP=[0.55,0.38,0.24],TH0=0.85,TH1=1.03,TD=1.85,TE=2.25;
  const BELL=V3(CX,3.05,0);
  // campana: perfil de torno, oro con bandas y boca oscura
  const prof=[];for(let i=0;i<=14;i++){const t=i/14;prof.push(new THREE.Vector2(0.06+0.34*Math.pow(t,1.6)+0.05*Math.sin(t*Math.PI)*(1-t)+(t>0.9?0.04:0),0.42-0.5*t));}
  const bellG=new THREE.Group(); L.mesh.add(bellG);
  const bell=new THREE.Mesh(new THREE.LatheGeometry(prof,28),solidMat(`float b=band(vUv.y,.82,.04)+band(vUv.y,.68,.025);base=mix(${GOLD},${GOLDD},b*.8);lb=.06-.1*b;`,{hot:'vec3(1.,.8,.4)',rim:.3},THREE.DoubleSide));
  bell.position.y=-0.25; bellG.add(bell);
  const knob=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.025,8,16),bell.material); knob.position.y=0.22; bellG.add(knob);
  const clap=new THREE.Mesh(new THREE.SphereGeometry(0.075,12,10),solidMat(`base=${GOLDD};`)); clap.position.y=-0.62; bellG.add(clap);
  const tolls=TR.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(S.FS.RING,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const gRings=TR.map(()=>S.groundRing(L.decal,3.4));
  const seal=groundPlane(2.6,CX,0.03,S.mat(GLYPH(`float st=0.;for(int i=0;i<6;i++){float aa=float(i)*1.0472;vec2 d=vec2(cos(aa),sin(aa));st=max(st,smoothstep(.05,0.,abs(dot(p,vec2(-d.y,d.x))))*step(abs(dot(p,d)),.42)*step(.1,abs(dot(p,d))));}
    float rr=smoothstep(.04,0.,abs(r-.86));m=max(m*.4,max(rr,st*.7));`,'1.1'),{},{mode:'energy'})); L.decal.add(seal);
  const gems=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.15,0),solidMat(`base=${GOLD};lb=.1;`,{hot:'vec3(1.,.85,.4)',rim:.4}));m.scale.set(1,1.5,1);L.mesh.add(m);return m;});
  const flash=S.hitSpark(L.mesh,1.4,{seed:0.44});
  const K=`const float TM=${f(TM)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const float CX=${f(CX)};`;
  // vellón: nubes de lana cálida que se juntan alrededor del lanzador y se deshacen
  S.pts(L.part,30,VV+K+`void main(){float s=TM*aSeed.x;float g=smoothstep(s,s+.35,uT);float an=aSeed.y*6.2832+uT*.6;
   float rad=mix(1.5,.62+.12*aSeed.z,g);float y=.25+aSeed.w*1.25;y+=sin(uT*2.+aSeed.x*6.)*.05;
   vec3 p=vec3(CX+cos(an)*rad,y+(1.-g)*.4,sin(an)*rad*.85);
   vA=uT>s?smoothstep(0.,.2,uT-s):0.;vK=smoothstep(TD,TE,uT)*(.6+.4*aSeed.z);vR=aSeed.w*6.28+uT*.3;put(p,(.62+.25*aSeed.z)*(.6+.4*g));}`,
   S.MATTER_FS(C.puff,{relief:5,col:WOOL,bias:-.06}));
  // motas doradas que caen de la campana
  S.pts(L.part,22,VV+K+`void main(){float life=.8;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float on=(uT>TI&&uT<TD)?1.:0.;
   vec3 p=vec3(CX+(r.x-.5)*1.4,2.7-age*2.4,(r.y-.5)*1.1);vA=sin(age*3.14159)*on;vK=0.;vR=uT*3.+r.z*6.;put(p,.16+.08*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, g=e3((te-TM)/0.35), out=1-ss(TD,TE,te);
    bellG.visible=te>TM&&out>0.001; bellG.position.copy(BELL); bellG.position.y+=0.12*Math.sin(te*2);
    let sw=0; TR.forEach((t,i)=>{const h=te-t;if(h>=0)sw+=AMP[i]*Math.sin(h*16)*Math.exp(-h*4);});
    bellG.rotation.z=sw; bellG.scale.setScalar(Math.max(g*out*1.7,0.001));
    bell.material.uniforms.uK.value=0.5*TR.reduce((s,t)=>s+hitE(te-t,7),0); bell.material.uniforms.uQ.value=-1+1.6*ss(TD,TE,te);
    tolls.forEach((m,i)=>{const h=te-TR[i],q=cl(h/0.5);towardCam(m.position,BELL,0.3);billboard(m,0);m.visible=h>=0&&q<1;m.scale.setScalar(0.5+2.2*q);set(m,0.1+0.85*q,1-q);});
    gRings.forEach((r,i)=>r.pose(te-TR[i],CX,0,0.55,1+0.2*i));
    seal.visible=te>TI*0.9; seal.rotation.y=te*0.4; set(seal,-0.1+1.15*ss(TD-0.2,TE,te),ss(TI*0.9,TI+0.15,te));
    gems.forEach((m,i)=>{const u=cl((te-TH0+0.25)/(TH1-TH0+0.25)),an=i*Math.PI+u*Math.PI*3,rad=0.7*(1-u);
      m.position.set(CX+Math.cos(an)*rad,2.45-1.45*e3(u),Math.sin(an)*rad*0.8);m.rotation.y=te*6;
      m.visible=te>TH0-0.25&&te<TH1+0.02;m.scale.set(1,1.5,1);});
    flash.pose(te-TH1,tmp.set(CX,1.05,0),0.9);
    const fl=hitE(te-TH1,5);
    caster.position.y=0.05*Math.sin(Math.PI*ss(TM,TD,te));
    glowOf(caster,U.uC1.value,0.2*g*out+0.6*fl);
    o.g.copy(te<TH1?BELL:tmp.set(CX,1.1,0));o.gs=1+0.8*fl;o.ga=0.12*g*out+0.4*fl;o.li=1.5*g*out+4*fl;
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 3 · NUT CRACKER — dos nueces de nogal orbitan cada oreja cada vez más rápido (estela ámbar) y salen disparadas a
//     la vez; revientan contra el rival en cáscara, trozos de fruto y polvo. ti 0,9 s
// =====================================================================
defs.push(Object.assign({key:"sty_nutEars",name:"Nut Cracker (estilizado)",dur:2.0,ti:0.9,pal:P_NUT,tier:2,stylized:true,
  phases:[["Invocación",0],["Órbita",0.2],["Disparo",0.68],["Impacto",0.9],["Fragmentos",1.08]],
build(a){
  const L=a.L,TO=0.2,TS=0.68,TI=0.9,RO=0.34;
  const NUT_BODY=`vec3 q=normalize(vP);float rid=abs(sin(atan(q.z,q.x)*5.+styNoise(vec2(q.y*2.,q.x)).r*2.5));float seam=smoothstep(.12,0.,abs(q.z));
   base=mix(${WALNUT},${WALNUTL},smoothstep(.2,.9,rid));lb=-.15*seam-.06*(1.-rid);`;
  const nutMat=solidMat(NUT_BODY,{hot:'vec3(1.,.6,.25)',rim:.25});
  const nuts=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.3,20,14),nutMat);m.scale.set(1.12,0.95,0.95);L.mesh.add(m);return m;});
  const HIT=[V3(3.02,1.38,0.16),V3(3.02,1.1,-0.16)];
  const sparks=[0,1].map(i=>S.hitSpark(L.mesh,1.4,{seed:0.3+0.4*i}));
  const ring=S.groundRing(L.decal,3.0);
  const shadows=[0,1].map(()=>S.contactShadow(L.decal,0.7));
  const K=`const float TO=${f(TO)};const float TS=${f(TS)};const float TI=${f(TI)};const float RO=${f(RO)};const vec3 H0=${v3(HIT[0])};const vec3 H1=${v3(HIT[1])};
  float ph(float t){t=max(t-TO,0.);return 6.2832*(1.6*t+3.2*t*t);}
  vec3 orbitP(float i,float t){vec3 e=vec3(-3.72,1.92,i<.5?.3:-.3);float a=ph(t)+i*3.14159;return e+vec3(cos(a)*RO,sin(a)*RO*.55+.08,sin(a)*RO*.4*(i<.5?1.:-1.));}`;
  // estela de la órbita: chispas ámbar a lo largo de la circunferencia, con retraso
  S.pts(L.part,36,VV+K+`void main(){float i=step(.5,aSeed.x);float lag=aSeed.y*.12;float t=uT-lag;
   vec3 p=orbitP(i,t);vA=(uT>TO+.05&&uT<TS)?(1.-aSeed.y*7.)*smoothstep(TO,TO+.2,uT):0.;vA=max(vA,0.);vK=0.;vR=0.;
   put(p,(.2+.05*aSeed.z)*(1.-aSeed.y*5.));}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // estela del vuelo
  S.pts(L.part,24,VV+K+`void main(){float i=step(.5,aSeed.x);float s=TS+aSeed.y*(TI-TS);float u=(s-TS)/(TI-TS);float life=.18+aSeed.z*.1;float age=(uT-s)/life;
   vec3 o0=orbitP(i,TS);vec3 h=i<.5?H0:H1;vec3 p=mix(o0,h,u)+vec3(0.,sin(u*3.14159)*.45,0.)+rnd()*.04;
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=0.;put(p,.3*(1.-age*.5));}`,S.ENERGY_FS(C.puff,{gain:1.1}),{mode:'energy'});
  // cáscara, fruto y polvo
  S.pts(L.part,40,VV+K+`void main(){float i=step(.5,aSeed.x);float s=TI+aSeed.y*.02;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=i<.5?H0:H1;vec3 v=normalize(rnd()+vec3(-.6,.55,0.))*(2.2+2.4*aSeed.z);vec3 p=b+v*t+vec3(0.,-8.5*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*(9.+5.*aSeed.w);put(p,.36+.14*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:WALNUT}));
  S.pts(L.part,12,VV+K+`void main(){float i=step(.5,aSeed.x);float s=TI+.01;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=i<.5?H0:H1;vec3 v=normalize(rnd()+vec3(-.4,.8,0.))*(1.5+1.5*aSeed.z);vec3 p=b+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:2,col:KERNEL,bias:.08}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.03+aSeed.x*.1;float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.2,.25,0.)+vec3(cos(an),0.,sin(an)*.8)*(.3+.8*(1.-exp(-t*5.)))+vec3(0.,.15+t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.42+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  const nu=nutMat.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, grow=e3((te-0.05)/0.2), spin=2*Math.PI*(1.6*Math.max(te-TO,0)+3.2*Math.pow(Math.max(te-TO,0),2));
    nuts.forEach((m,i)=>{
      if(te<TS){const an=spin+i*Math.PI,e=V3(-3.72,1.92,i?-0.3:0.3);
        m.position.set(e.x+Math.cos(an)*RO,e.y+Math.sin(an)*RO*0.55+0.08,e.z+Math.sin(an)*RO*0.4*(i?-1:1));m.scale.set(1.12*grow,0.95*grow,0.95*grow);}
      else{const u=cl((te-TS)/(TI-TS)),an=2*Math.PI*(1.6*(TS-TO)+3.2*Math.pow(TS-TO,2))+i*Math.PI,e=V3(-3.72,1.92,i?-0.3:0.3);
        tmp.set(e.x+Math.cos(an)*RO,e.y+Math.sin(an)*RO*0.55+0.08,e.z+Math.sin(an)*RO*0.4*(i?-1:1));
        m.position.lerpVectors(tmp,HIT[i],u);m.position.y+=Math.sin(u*Math.PI)*0.45;m.scale.set(1.3,1.1,1.1);}
      m.rotation.set(te*7+i,te*11,te*5);m.visible=te>0.05&&ia<0;
      shadows[i].pose(m.position.x,m.position.z,0.6,te>TS&&ia<0?0.35:0);});
    nu.uK.value=0.5*ss(TS-0.2,TS,te)*(ia<0?1:0);
    sparks.forEach((s,i)=>s.pose(ia-0.01*i,HIT[i],1.0));
    ring.pose(ia,TX,0,0.45,1);
    const h=hitE(ia,6);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.25*h*Math.cos(ia*14); target.scale.set(1+0.08*h,1-0.1*h,1+0.08*h);
    o.em=0.4*h; o.emc.copy(U.uC1.value);
    glowOf(caster,U.uC1.value,0.3*ss(TO,TS,te)*(1-ss(TS,TS+0.15,te)));
    if(ia<0){tmp.copy(nuts[0].position).lerp(nuts[1].position,0.5);o.g.copy(tmp);o.gs=0.7;o.ga=0.12*grow;o.li=1.4*grow;o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(TC);o.gs=1.3+2*ia;o.ga=0.4*Math.exp(-ia*8);o.li=5*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1;o.dist=1;o.flash=0.8;}
  };
}},ZONES));

// =====================================================================
// 4 · NYAN — el lanzador se agazapa y embiste bajo: un trazo de pincel rosa → ámbar con vetas de garra (y una chispa
//     con forma de pata al saltar) cruza hasta el rival y lanza un zarpazo de cuatro uñas. Variante «sangra»: las marcas brillan carmesí y gotean.
// =====================================================================
defs.push(Object.assign({key:"sty_nyan",name:"Nyan (estilizado)",dur:2.0,ti:0.5,pal:P_NYAN,tier:2,stylized:true,vlabel:"Rival",
  variants:[["normal","Sin sangrado"],["sangra","Sangrando"]],v:"normal",
  phases:[["Acecho",0],["Salto",0.18],["Zarpazo",0.5],["Marcas",0.7],["Regreso",1.05]],
build(a){
  const L=a.L,TJ=0.18,TL=0.44,TI=0.5,TB=1.05,TBE=1.45,VG=variantGroups(a,["normal","sangra"]);
  const A0=V3(-3.3,0.75,0), A1=V3(2.7,1.15,0.08), AH=0.55;
  const arcAt=(u,o)=>o.set(A0.x+(A1.x-A0.x)*u,A0.y+(A1.y-A0.y)*u+AH*Math.sin(Math.PI*u),A0.z+(A1.z-A0.z)*u+0.12*Math.sin(Math.PI*u));
  // embestida: trazo de pincel rosa → ámbar, bajo y rápido, con vetas de garra; la cola se seca y se erosiona
  const trail=new THREE.Mesh(ribbonGeo(arcAt,80,0.7),S.mat(`uniform float uQ;void main(){float u=vUv.x,v=vUv.y;if(u>uP)discard;
   float d=uP-u;float nz=styNoise(vec2(u*3.-uT*.5,v*.9)+.2).r;float streak=styNoise(vec2(u*.6,v*3.2)+.5).b;
   float w=(.5-abs(v-.5))*2.;float body=smoothstep(.0,.35,w-(1.-exp(-d*2.5))*.55+(nz-.5)*.3);
   float er=styErode(nz*.55+streak*.25+.2*u,uQ,.08);float a=body*er*uA*smoothstep(0.,.05,u);if(a<.02)discard;
   vec3 c=mix(${lin("#e8356e")},${lin("#f08a1c")},smoothstep(.1,.85,u))*(.75+.4*smoothstep(.55,.9,streak));
   c+=${lin("#ffc070")}*exp(-d*14.)*.5;gl_FragColor=vec4(c,a);}`,{uQ:{value:-1}},{mode:'energy'}));
  L.mesh.add(trail);
  // chispa con forma de pata al saltar (energía, muy breve)
  const pawSpark=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(`void main(){vec2 p=(vUv-.5)*2.;float d=length((p-vec2(0.,-.18))*vec2(1.,1.25))-.36;
   for(int k=0;k<4;k++){float aa=-.9+.6*float(k);d=min(d,length(p-vec2(sin(aa)*.56,.3+cos(aa)*.24-.1*abs(float(k)-1.5)))-.15);}
   float m=smoothstep(.04,-.04,d);float er=styErode(styNoise(vUv*1.3).r*.6+m*.4,uP,.1);float a=m*er*uA;if(a<.02)discard;
   gl_FragColor=vec4(styRamp(.6+.25*m)*1.4,a);}`,{},{mode:'energy',depthTest:false}));
  L.mesh.add(pawSpark);
  // zarpazo: cuatro uñas de energía que barren al rival en diagonal
  const SLASH=`uniform float uS;void main(){vec4 s=styShape(6.,vUv);if(vUv.x>uS)discard;float er=styErode(s.r*.6+s.b*.4,uP,.1);
   float a=s.r*er*uA;if(a<.02)discard;gl_FragColor=vec4(mix(${lin("#e8356e")},${lin("#ffb070")},s.g)*1.5,a);}`;
  const claws=[0,1,2,3].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.42),S.mat(SLASH,{uS:{value:0}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  // marcas: cuatro cortes de tinta sobre el rival (más brillantes y rojos si sangra)
  const SCAR=(hot)=>`void main(){vec2 p=vUv-.5;float w=.5*(1.-pow(abs(p.x)*2.,2.));float d=abs(p.y)-w*.32;
   float nz=styNoise(vUv*vec2(3.,1.)+.4).r;float er=styErode(nz,uP,.1);float a=smoothstep(.02,-.02,d)*er*uA;if(a<.02)discard;
   vec3 c=${hot?`mix(${BLOOD},vec3(1.,.35,.35),smoothstep(-.1,-.02,-abs(p.y)))*1.6`:`mix(styRampOf(uC2,.1),styRamp(.9),smoothstep(.05,0.,abs(p.y)))`};gl_FragColor=vec4(c,a);}`;
  const scars=[0,1,2,3].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.2),S.mat(SCAR(false),{},{mode:'matter',depthTest:false}));VG.normal.mesh.add(m);return m;});
  const scarsH=[0,1,2,3].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.22),S.mat(SCAR(true),{},{mode:'energy',depthTest:false}));VG.sangra.mesh.add(m);return m;});
  const bleed=S.status(a,'bleed',[target],TI+0.05,TBE);
  for(const k of ['part','decal','mesh'])VG.sangra[k].add(bleed.groups[k]);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.58});
  const ring=S.groundRing(L.decal,2.8);
  const K=`const vec3 A0=${v3(A0)};const vec3 A1=${v3(A1)};const float TJ=${f(TJ)};const float TL=${f(TL)};const float TI=${f(TI)};
  vec3 arcAt(float u){return vec3(A0.x+(A1.x-A0.x)*u,A0.y+(A1.y-A0.y)*u+${f(AH)}*sin(3.14159*u),A0.z+(A1.z-A0.z)*u+.12*sin(3.14159*u));}`;
  // motas y polvo que levanta la embestida
  S.pts(L.part,26,VV+K+`void main(){float s=TJ+aSeed.x*(TL-TJ);float u=(s-TJ)/(TL-TJ);float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=arcAt(u)+rnd()*.2+vec3(0.,-.5*max(uT-s,0.),0.);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=uT*4.;put(p,.18+.08*aSeed.z);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float s=TJ+aSeed.x*(TL-TJ);float u=(s-TJ)/(TL-TJ);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=arcAt(u);vec3 p=vec3(b.x,.15+t*.5,(aSeed.z-.5)*.6);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.4+.2*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // gotas de sangre de las marcas (solo si sangra)
  S.pts(VG.sangra.part,18,VV+K+`void main(){float s=TI+.08+aSeed.x*.5;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(3.0+(aSeed.z-.5)*.5,1.35-aSeed.w*.5-4.*t*t,.35);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.16);}`,
   S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  a.setVariant=v=>{if(v!=="sangra")v="normal";a.v=v;for(const k of VFX.LK){VG.normal[k].visible=v==="normal";VG.sangra[k].visible=v==="sangra";}};
  a.setVariant(a.v);
  a.pose=function(te,o){
    const ia=te-TI, ret=ss(TB,TBE,te);
    // el lanzador se agazapa, salta un poco y vuelve
    const crouch=ss(0,TJ,te)*(1-ss(TJ,TJ+0.08,te)), hop=Math.sin(Math.PI*cl((te-TJ)/(TB-TJ)));
    caster.scale.set(1+0.12*crouch,1-0.18*crouch,1+0.12*crouch); caster.position.y=0.35*hop*(te>TJ?1:0); caster.rotation.z=-0.15*hop;
    caster.position.x=CX+0.5*hop;
    const u=e3((te-TJ)/(TL-TJ));
    trail.visible=te>TJ; set(trail,u,1); trail.material.uniforms.uQ.value=-1+1.9*ss(TI+0.05,TI+0.55,te);
    const pq=cl((te-TJ)/0.22); towardCam(pawSpark.position,tmp.set(A0.x+0.3,A0.y+0.2,0),0.3); billboard(pawSpark,-0.25);
    pawSpark.visible=te>TJ&&pq<1; pawSpark.scale.setScalar(0.7+0.6*e3(pq)); set(pawSpark,-0.05+1.05*ss(0.35,1,pq),1);
    claws.forEach((m,i)=>{const tk=TL+i*0.018,h=te-tk;towardCam(m.position,tmp.set(3.05+0.04*i,1.25+(1.5-i)*0.2,0),0.55);billboard(m,-0.75);
      m.visible=h>=0&&h<0.35;m.scale.setScalar(1.6);m.material.uniforms.uS.value=e3(h/0.08);set(m,-0.1+1.1*ss(0.08,0.32,h),1);});
    const sc=(arr,k)=>arr.forEach((m,i)=>{towardCam(m.position,tmp.set(3.1,1.22+(1.5-i)*0.19,0),0.45+0.01*i);billboard(m,-0.75);
      m.visible=ia>=0.04&&te<TBE;m.scale.setScalar(k);set(m,ia>=0?-0.1+1.15*ss(TB,TBE,te):1,ss(TI+0.03,TI+0.1,te));});
    sc(scars,1.4); sc(scarsH,1.5);
    if(a.v==="sangra")bleed.pose(te);
    spark.pose(ia,TC,1.15);
    ring.pose(ia,TX,0,0.45,1);
    const h=hitE(ia,7);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.3*h*Math.cos(ia*12); target.scale.set(1+0.06*h,1-0.08*h,1+0.06*h);
    const hot=a.v==="sangra"?ss(TI,TI+0.1,te)*(1-ret):0;
    o.em=0.35*h+0.35*hot; if(hot>0.01)o.emc.setRGB(0.9,0.1,0.12); else o.emc.copy(U.uC1.value);
    if(ia<0){arcAt(u,tmp);o.g.copy(tmp);o.gs=0.8;o.ga=0.15*(te>TJ?1:0);o.li=1.6*(te>TJ?1:0);o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(TC);o.gs=1.4+2*ia;o.ga=0.4*Math.exp(-ia*8);o.li=5*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1;o.dist=1;o.flash=0.8;}
  };
}},{zoneCaster:0.5,zoneTarget:1.2}));

// =====================================================================
// 5 · FOXY — crecen orejas de zorro naranja; una línea de mira tiembla hasta fijar la retícula sobre el rival (0,42 s)
//     y sale un disparo de francotirador ámbar con fuego de zorro que lo atraviesa y estalla por detrás. ti 0,8 s
// =====================================================================
defs.push(Object.assign({key:"sty_foxyEars",name:"Foxy (estilizado)",dur:2.0,ti:0.8,pal:P_FOX,tier:2,stylized:true,
  phases:[["Puntería",0],["Fijación",0.42],["Disparo",0.75],["Perforación",0.8],["Disipación",1.2]],
build(a){
  const L=a.L,TK=0.42,TS=0.75,TI=0.8,TF=1.2,TE=1.6;
  const EAR_FS=`base=mix(${FOXO},${lin("#2a1408")},smoothstep(.72,.9,vUv.y));base=mix(base,${CREAM},smoothstep(.25,.05,abs(vUv.x-.5))*step(vUv.y,.65)*.0);`;
  const earMat=solidMat(EAR_FS,{hot:'vec3(1.,.55,.15)',rim:.3});
  const earG=new THREE.Group(); L.mesh.add(earG);
  const ears=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.72,14),earMat);m.position.set(-0.02,2.08,0.25*s);m.rotation.set(0.32*s,0,0.08);m.scale.set(1,1,0.55);earG.add(m);return m;});
  const EM=V3(-3.62,1.95,0), HP=V3(3.05,1.25,0), XP=V3(TX+3.2,1.35,0);
  const aimLine=new THREE.Mesh(beamGeo(1),S.mat(`void main(){float u=vUv.y;float d=step(.5,fract(u*22.-uT*6.));gl_FragColor=vec4(styRamp(.8)*1.6,(.35+.5*d)*uA);}`,{},{mode:'energy'}));
  L.mesh.add(aimLine);
  const reticle=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float ring=smoothstep(.06,0.,abs(r-.72));float tick=step(abs(p.x),.05)*step(.42,abs(p.y))*step(abs(p.y),.98)+step(abs(p.y),.05)*step(.42,abs(p.x))*step(abs(p.x),.98);
   float dot0=step(r,.08);float gap=step(.18,abs(fract(atan(p.y,p.x)/6.2832*4.+.125)-.5));float m=max(ring*gap,max(tick,dot0));if(m<.05)discard;
   vec3 c=mix(styRamp(.85),${lin("#ff3a1a")}*1.4,uP);gl_FragColor=vec4(c*1.3,m*uA);}`,{},{mode:'energy',depthTest:false}));
  L.mesh.add(reticle);
  const shot=new THREE.Mesh(beamGeo(1,14),S.mat(`void main(){float u=vUv.y;vec3 n=normalize(vN);float fr=abs(dot(n,normalize(vV)));
   float nz=styNoise(vec2(u*4.-uT*3.,vUv.x)).r;float core=smoothstep(.35,.9,fr);float a=(core*.9+.25+.3*nz)*uA*smoothstep(0.,.03,u);
   vec3 c=mix(styRampOf(uC2,.55),styRamp(.72),core)*1.5;gl_FragColor=vec4(c,a);}`,{},{mode:'energy'}));
  L.mesh.add(shot);
  const sparkIn=S.hitSpark(L.mesh,1.6,{seed:0.13}), sparkOut=S.hitSpark(L.mesh,1.4,{seed:0.81});
  const ring=S.groundRing(L.decal,2.6);
  const scorch=groundPlane(1.8,TX+1.2,0.026,S.mat(STAIN(lin("#3a1a0c"),.45),{},{mode:'matter'})); scorch.scale.set(1.6,1,0.6); L.decal.add(scorch);
  const K=`const vec3 EM=${v3(EM)};const vec3 HP=${v3(HP)};const vec3 XP=${v3(XP)};const float TS=${f(TS)};const float TI=${f(TI)};const float TF=${f(TF)};`;
  // fuego de zorro a lo largo del disparo
  S.pts(L.part,34,VV+K+`void main(){float s=TS+aSeed.x*.35;float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=mix(EM,XP,aSeed.z)+vec3(0.,.1+t*(.9+.5*aSeed.w),(aSeed.y-.5)*.2);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;
   vK=smoothstep(.25,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.42+.2*aSeed.w)*(1.-age*.3));}`,S.ENERGY_FS(C.flame,{gain:1.35}),{mode:'energy'});
  // esquirlas de luz por detrás del rival
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(vec3(1.,0.,0.)+rnd()*.55)*(4.+4.*aSeed.z);vec3 p=HP+vec3(.4,0.,0.)+v*t+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=atan(v.y,v.x);put(p,.24*(1.-age*.4));}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  // estallido de fuego de zorro detrás
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.02+aSeed.x*.06;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(HP.x+1.,.9,0.)+vec3(cos(an)*.5,sin(an)*.4+t*1.2,sin(an)*.3)*(.5+t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=(aSeed.w-.5)*.5;put(p,(.6+.3*aSeed.w)*(1.-age*.3));}`,S.ENERGY_FS(C.flame,{gain:1.4}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, eg=e3(te/0.25), lock=ss(TK-0.05,TK+0.05,te);
    follow(earG); earG.visible=te<TE; earMat.uniforms.uQ.value=-1+1.7*ss(TF,TE,te); earMat.uniforms.uK.value=0.6*ss(TS-0.2,TS,te)*(1-ss(TI,TI+0.2,te));
    ears.forEach((m,i)=>{m.scale.set(eg,eg,0.55*eg);m.rotation.x=(i?-1:1)*(0.32+0.12*Math.sin(te*26)*(1-lock));});
    caster.rotation.z=-0.08*ss(TS,TS+0.04,te)*(1-ss(TI,TI+0.3,te));
    // mira: tiembla hasta fijarse
    const jit=(1-lock)*0.35; tmp.set(HP.x+jit*Math.sin(te*31),HP.y+jit*Math.cos(te*23),HP.z+jit*0.6*Math.sin(te*17));
    aimLine.visible=te>0.18&&te<TS; aimBeam(aimLine,EM,tmp,0.025); aimLine.material.uniforms.uA.value=0.8*ss(0.18,0.3,te);
    towardCam(reticle.position,tmp,0.4); billboard(reticle,te*(1-lock)*2); reticle.visible=te>0.15&&te<TI+0.05;
    reticle.scale.setScalar(1.6-0.7*lock+0.06*Math.sin(te*40)*lock); set(reticle,lock,ss(0.15,0.3,te)*(1-ss(TI,TI+0.05,te)));
    // disparo
    const sh=ss(TS,TI,te)*(1-ss(TI+0.1,TF,te)); shot.visible=sh>0.001;
    tmp.lerpVectors(EM,XP,e3((te-TS)/(TI-TS+0.05))); aimBeam(shot,EM,tmp,0.06*(0.5+0.8*sh)*(1+1.2*hitE(ia,10))); shot.material.uniforms.uA.value=sh;
    sparkIn.pose(ia,HP,1.1); sparkOut.pose(ia-0.03,tmp2.set(HP.x+0.9,HP.y,0),1);
    ring.pose(ia,TX,0,0.45,1);
    scorch.visible=ia>=0; set(scorch,ia>=0?-0.1+1.15*ss(0.5,1.1,ia):0,1);
    const h=hitE(ia,6);
    target.position.x=TX+0.32*h*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.28*h*Math.cos(ia*14); target.scale.set(1+0.05*h,1-0.07*h,1+0.05*h);
    o.em=0.25*lock*(ia<0?1:0)+0.4*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(EM);o.gs=0.6+0.6*ss(TS-0.2,TS,te);o.ga=0.1+0.2*ss(TS-0.2,TS,te);o.li=1+2.5*ss(TS-0.2,TS,te);o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(HP);o.gs=1.4+2*ia;o.ga=0.4*Math.exp(-ia*8);o.li=5.5*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1;o.dist=1;o.flash=0.8;}
  };
}},ZONES));

// =====================================================================
// 6 · PUPPY — grilletes de hierro y gotas de Lento atan los pies del lanzador; inspira y suelta un ladrido dorado:
//     arcos de sonido y una onda que recorre el campo rompen las ataduras (0,72 s) y dejan cruces de curación para
//     todo el equipo y rayas de celeridad. Las cartas α de Bing y Pomodoro usan este efecto.
// =====================================================================
defs.push({key:"sty_puppyEar",name:"Puppy (estilizado)",dur:2.2,ti:0.72,pal:P_PUP,tier:2,stylized:true,
  phases:[["Ataduras",0],["Inspiración",0.4],["Ladrido",0.65],["Liberación",0.72],["Celeridad",1.1],["Fin",1.85]],
build(a){
  const L=a.L,TIN=0.4,TB=0.65,TI=0.72,TC2=1.1,TEND=1.85,TE=2.2,MO=V3(-3.35,1.5,0),RW=6.5;
  const ironMat=solidMat(`float lk=step(.5,fract(vUv.x*14.));base=mix(${IRON},${lin("#8a93a0")},lk*.5);lb=-.05*lk;`,{hot:'vec3(.6,.75,1.)',rim:.35});
  const shackles=[0.14,0.36].map(y=>{const m=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.085,8,28),ironMat);m.rotation.x=Math.PI/2;m.position.set(CX,y,0);L.mesh.add(m);return m;});
  const slow=S.status(a,'slow',[caster],0,TI+0.08);
  // arcos del ladrido (media luna de pincel) hacia delante
  const ARC_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);float m=smoothstep(.12,0.,abs(r-.75))*smoothstep(1.1,.55,abs(an));
   vec4 s=styShape(7.,vUv);float er=styErode(s.b*.5+m*.5,uP,.12);float a=m*er*uA;if(a<.02)discard;gl_FragColor=vec4(styRamp(.65+.35*m)*1.4,a);}`;
  const barks=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),S.mat(ARC_FS,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  // onda dorada que recorre el campo (anillo ancho de pincel)
  const wave=groundPlane(2,CX,0.035,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styShape(7.,vUv);
   float w=smoothstep(.1,0.,abs(r-.9))*(.6+.4*styNoise(vec2(atan(p.y,p.x)*1.5,r*2.)).r);float er=styErode(s.b*.4+w*.6,uP,.1);
   float a=w*er*uA;if(a<.02)discard;gl_FragColor=vec4(styRamp(.5+.25*w)*1.3,a);}`,{},{mode:'energy'})); L.decal.add(wave);
  const paw=groundPlane(2.2,CX,0.03,S.mat(GLYPH(`float d=length((p-vec2(0.,-.08))*vec2(1.,1.25))-.17;for(int k=0;k<4;k++){float aa=-.9+.6*float(k);d=min(d,length(p-vec2(sin(aa)*.27,.15+cos(aa)*.12-.05*abs(float(k)-1.5)))-.075);}
    float pw=smoothstep(.02,-.02,d);float rr=smoothstep(.04,0.,abs(r-.88));m=max(m*.35,max(pw,rr)*.9);`,'1.15'),{},{mode:'energy'})); L.decal.add(paw);
  const flash=S.hitSpark(L.mesh,1.3,{seed:0.52});
  const K=`const float TIN=${f(TIN)};const float TB=${f(TB)};const float TI=${f(TI)};const float TC2=${f(TC2)};const float TEND=${f(TEND)};const float CX=${f(CX)};const float RW=${f(RW)};const vec3 MO=${v3(MO)};`;
  // aire que entra en la inspiración
  S.pts(L.part,14,VV+K+`void main(){float s=TIN+aSeed.x*(TB-TIN)*.7;float u=clamp((uT-s)/.2,0.,1.);vec3 st=MO+normalize(rnd()+vec3(.6,0.,0.))*1.1;
   vec3 p=mix(st,MO,u*u);vA=(uT>s&&u<1.)?u:0.;vK=0.;vR=0.;put(p,.16);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // esquirlas de hierro al romperse los grilletes y gotas azules que saltan
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),.6+.8*aSeed.w,sin(an))*(1.8+1.6*aSeed.y);vec3 p=vec3(CX,.14+.22*step(.5,aSeed.w),0.)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*10.;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:IRON,bias:.1}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.02;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),1.2+.6*aSeed.w,sin(an))*(1.4+1.2*aSeed.y);vec3 p=vec3(CX,.4,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.17);}`,S.MATTER_FS(C.drop,{relief:4,col:SLOWB}));
  // cruces de curación: en el lanzador y a lo largo del frente de la onda (todo el equipo)
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.05+aSeed.x*.5;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX+cos(an)*(.3+.4*aSeed.w),.3+age*1.5,sin(an)*(.3+.4*aSeed.w));vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.1*aSeed.w);}`,CROSS_P(HEALG));
  S.pts(L.part,24,VV+K+`void main(){float s=TB+aSeed.x*.55;float rad=RW*clamp((s-TB)/.8,0.,1.)*.5+.6;float life=.6;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX+cos(an)*rad,.2+age*.9,sin(an)*rad*.8);vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;vK=0.;vR=0.;put(p,.26);}`,CROSS_P(HEALG,1.2));
  // rayas de celeridad que suben alrededor del lanzador
  S.pts(L.part,14,VV+K+`void main(){float life=.4;float k=(uT-TC2)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float on=(uT>TC2&&uT<TEND)?1.:0.;
   float an=r.x*6.2832;vec3 p=vec3(CX+cos(an)*.55,.1+age*1.6,sin(an)*.5);vA=sin(age*3.14159)*on;vK=0.;vR=1.5708;put(p,.5);}`,
   S.PV+`void main(){vec2 q=styPC()-.5;float m=smoothstep(.08,0.,abs(q.y))*smoothstep(.5,.1,abs(q.x));if(m*vA<.02)discard;gl_FragColor=vec4(styRamp(.85)*1.3,m*vA);}`,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, inh=ss(TIN,TB,te), bark=hitE(te-TB,6);
    caster.scale.set(1+0.08*inh*(te<TB?1:0)+0.06*bark,1+0.1*inh*(te<TB?1:0)-0.05*bark,1+0.08*inh*(te<TB?1:0));
    caster.rotation.z=-0.12*bark; caster.position.y=0.08*Math.sin(Math.PI*cl((te-TI)/0.3));
    shackles.forEach((m,i)=>{m.visible=ia<0;const sh=0.03*Math.sin(te*40+i)*ss(0,0.3,te);m.position.set(CX+sh,m.position.y,0);
      m.scale.setScalar(Math.max(e3(te/0.2)*(1+0.06*ss(TB,TI,te)),0.001));});
    ironMat.uniforms.uK.value=0.6*ss(TB,TI,te);
    slow.pose(te);
    barks.forEach((m,i)=>{const h=te-TB-i*0.07,q=cl(h/0.45);towardCam(m.position,tmp.set(MO.x+0.3+q*2.6,MO.y+0.05,0),0.3);billboard(m,0);
      m.visible=h>=0&&q<1;m.scale.setScalar(0.5+1.4*q);set(m,0.1+0.85*q,1-q*0.6);});
    const wq=cl((te-TB)/0.8); wave.visible=te>TB&&wq<1; wave.scale.setScalar(Math.max(0.6+RW*e3(wq),0.001)); set(wave,0.1+0.85*wq,1);
    paw.visible=ia>=0&&te<TE; paw.rotation.y=0.3; set(paw,-0.1+1.15*ss(TEND-0.2,TE,te),ss(TI,TI+0.15,te));
    flash.pose(ia,tmp.set(CX,0.45,0),1);
    glowOf(caster,U.uC1.value,0.2*inh*(te<TB?1:0)+0.5*bark+0.15*ss(TC2,TC2+0.2,te)*(1-ss(TEND-0.2,TEND,te)));
    o.g.copy(MO);o.gs=0.8+1.4*bark;o.ga=0.1*inh+0.4*bark;o.li=1.2*inh+5*bark;
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=bark>0.05?0.5:0;o.dist=0.5;o.flash=0;
  };
}});

// =====================================================================
// 7 · ZEN — el lanzador levita en meditación: ensō de pincel jade tras la cabeza, loto que se abre en el suelo con un
//     mandala, anillos de respiración y hojas de bambú que caen. Al iluminarse (0,75 s) se cura; dos orbes de oro
//     quedan girando despacio (+2 PA el turno siguiente).
// =====================================================================
defs.push({key:"sty_zen",name:"Zen (estilizado)",dur:2.4,ti:0.75,pal:P_ZEN,tier:2,stylized:true,
  phases:[["Respiración",0],["Levitación",0.22],["Iluminación",0.75],["Meditación",0.98],["Descenso",1.9]],
build(a){
  const L=a.L,TLv=0.22,TI=0.75,TD=1.9,TE=2.35,LH=0.4;
  const lift=te=>LH*e3((te-TLv)/0.45)*(1-ss(TD,TE,te))+0.04*Math.sin(te*3)*ss(TLv,TI,te)*(1-ss(TD,TE,te));
  // ensō: trazo de pincel de tinta jade, con presión variable y hueco; brilla oro al iluminarse
  const enso=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),S.mat(`uniform float uQ;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float an=atan(p.y,p.x);float t=fract((an+1.9)/6.2832);if(t>uP*.9)discard;float w=.05+.06*sin(t*3.14159)+.03*(1.-t);
   float nz=styNoise(vec2(t*6.,r*3.)).r;float dry=smoothstep(.25,.55,nz+.25*t);float m=smoothstep(w,w-.02,abs(r-.78))*dry;if(m<.05)discard;
   vec3 c=mix(${INK},${lin("#e8c25a")}*1.3,uQ*(.5+.5*nz));gl_FragColor=vec4(c,m*uA);}`,{uQ:{value:0}},{mode:'matter',depthTest:false}));
  L.mesh.add(enso);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(`void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),2.)*uA;gl_FragColor=vec4(styRamp(.8)*1.2,a);}`,{},{mode:'energy',depthTest:false}));
  L.mesh.add(halo);
  // loto: dos coronas de pétalos sólidos (rosa con base jade) que se abren en el suelo
  const PETAL=solidMat(`float v=vUv.y,u=vUv.x-.5;float w=.5*pow(sin(3.1416*pow(clamp(v,0.,1.),.8)),.9);if(abs(u)>w)discard;
   base=mix(${JADE},${PINK},smoothstep(.1,.55,v));base=mix(base,${lin("#fff0f4")},smoothstep(.75,1.,v)*.5);lb=-.08*smoothstep(.03,0.,abs(u));`,{hot:'vec3(1.,.8,.9)',rim:.25},THREE.DoubleSide);
  const lotus=new THREE.Group(); lotus.position.set(CX,0.04,0); L.mesh.add(lotus);
  const petals=[];
  for(let ring=0;ring<2;ring++)for(let i=0;i<8;i++){const pv=new THREE.Group();pv.rotation.y=(i+ring*0.5)/8*Math.PI*2;lotus.add(pv);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.42-0.1*ring,0.8-0.22*ring).translate(0,(0.8-0.22*ring)/2,0),PETAL);m.position.x=0.3-0.18*ring;pv.add(m);petals.push({m,ring});}
  const mandala=groundPlane(3.2,CX,0.028,S.mat(GLYPH(`float pe=0.;for(int i=0;i<12;i++){float aa=float(i)*.5236;vec2 d=vec2(cos(aa),sin(aa));vec2 q=p-d*.33;pe=max(pe,smoothstep(.02,0.,abs(length(q*vec2(1.,1.))-.14)));}
    float rr=smoothstep(.03,0.,abs(r-.9))+smoothstep(.03,0.,abs(r-.62))*.7;m=max(m*.3,max(rr,pe*.8));`,'1.1'),{},{mode:'energy'})); L.decal.add(mandala);
  const breath=[0,1,2].map(()=>S.groundRing(L.decal,2.8));
  const flash=S.hitSpark(L.mesh,1.5,{seed:0.33});
  const K=`const float TLv=${f(TLv)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const float CX=${f(CX)};`;
  // hojas de bambú que caen girando
  S.pts(L.part,16,VV+K+`void main(){float life=1.3;float k=(uT-TLv)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float on=(uT>TLv&&uT<TE)?1.-smoothstep(TD,TE,uT):0.;
   vec3 p=vec3(CX+(r.x-.5)*2.6+sin(age*6.+r.z*6.)*.25,3.-age*2.9,(r.y-.5)*1.8);vA=smoothstep(0.,.1,age)*(1.-smoothstep(.85,1.,age))*on;
   vK=0.;vR=age*5.+r.z*6.;put(p,.34+.1*r.z);}`,S.MATTER_FS(C.leaf,{relief:3,col:LEAF,bias:.05}));
  // curación: motas verdes y cruces que suben al iluminarse
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.6;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float an=aSeed.z*6.2832+age*2.;float rad=.45+.35*aSeed.w;
   vec3 p=vec3(CX+cos(an)*rad,.3+age*2.,sin(an)*rad*.8);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*2.;put(p,.2+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  S.pts(L.part,8,VV+K+`void main(){float s=TI+.05+aSeed.x*.4;float life=.8;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX+cos(an)*.6,.6+age*1.4,sin(an)*.5);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.32);}`,CROSS_P(HEALG));
  // +2 PA el turno siguiente: dos orbes de oro que giran despacio
  S.pts(L.part,2,VV+K+`void main(){float i=step(.5,aSeed.x);float an=i*3.14159+uT*1.6;float on=smoothstep(TI+.15,TI+.4,uT)*(1.-smoothstep(TD+.1,TE,uT));
   vec3 p=vec3(CX+cos(an)*.75,1.3+.12*sin(uT*2.+i*3.),sin(an)*.6);vA=on*(.7+.3*sin(uT*5.+i*2.));vK=0.;vR=uT;put(p,.42);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, lf=lift(te), ill=hitE(ia,3.5), out=1-ss(TD,TE,te);
    caster.position.y=lf; caster.rotation.z=0.03*Math.sin(te*1.3)*ss(TLv,TI,te);
    const hy=1.6+lf;
    towardCam(enso.position,tmp.set(CX-0.05,hy,0),-0.45); billboard(enso,0.15);
    enso.visible=te>0.05&&out>0.001; enso.scale.setScalar(1+0.08*ill); set(enso,e3((te-0.05)/(TI-0.05)),out); enso.material.uniforms.uQ.value=ss(TI-0.1,TI,te)*(0.4+0.6*ill);
    towardCam(halo.position,tmp,-0.4); billboard(halo,0); halo.visible=ill>0.01||te>TI; halo.scale.setScalar(1+0.4*ill); halo.material.uniforms.uA.value=(0.05+0.35*ill)*out*(te>TI-0.05?1:0);
    const op=e3((te-TLv)/(TI-TLv));
    lotus.visible=te>TLv&&out>0.001; lotus.rotation.y=te*0.35; lotus.scale.setScalar(Math.max(0.5+1.3*op,0.001)*(1+0.06*ill));
    petals.forEach(({m,ring})=>{m.parent.rotation.z=0;m.rotation.z=-(1.45-(0.95+0.25*ring)*op);});
    PETAL.uniforms.uQ.value=-1+1.7*ss(TD,TE,te); PETAL.uniforms.uK.value=0.3*ill;
    mandala.visible=te>TLv; mandala.rotation.y=-te*0.25; set(mandala,-0.1+1.15*ss(TD-0.1,TE,te),ss(TLv,TI,te));
    breath.forEach((r,i)=>{const q=((te-TLv)/1.1+i/3)%1;r.pose(te>TLv&&te<TD?q*0.5:-1,CX,0,0.5,0.7+0.3*i);});
    flash.pose(ia,tmp.set(CX,hy,0),1);
    glowOf(caster,U.uC1.value,0.15*ss(TLv,TI,te)*out+0.6*ill);
    o.g.set(CX,hy,0);o.gs=1.2+1.2*ill;o.ga=0.1*ss(TLv,TI,te)*out+0.45*ill;o.li=1.6*out+5*ill;
    o.ia=ia;o.c.set(CX,hy-0.4,0);o.shake=0;o.dist=0.4;o.flash=0;
  };
}});

VFX.module("Estilizado · Bestia · Orejas",defs);
})();

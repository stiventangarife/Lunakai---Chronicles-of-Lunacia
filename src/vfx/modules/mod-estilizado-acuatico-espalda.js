// =====================================================================
// ESTILIZADO · ACUÁTICO · ESPALDA (Hito 101) — las 6 cartas de espalda de Acuático hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_qeAnemone, sty_qeBlueMoon, sty_qeHermit, sty_qePerch, sty_qeSponge, sty_qeGoldfish).
// Mismos dur / ti / fases que las originales (ya a la escala de su nivel), así el daño llega igual. Los efectos nacen de la
// espalda del lanzador (≈ (-3.85,1.25,0)); el Axie ya tiene su parte, así que aquí no se dibuja.
// Identidad de la clase: agua turquesa saturada (no espuma blanca), nácar y roca marina; acentos propios de cada carta.
// Semántica según PartCards.js:
//   Anemone (daño + cura 20 a todos los aliados) · Blue Moon (daño + 1 PM propio) · Hermit (aliado: barrera 2 turnos)
//   Perch (4 golpes) · Sponge (aliado: escudo 60 + guarda «potenciado») · Goldfish (daño + 1 PA y 1 PM propios)
// Las criaturas (perca, pez dorado) son siluetas iluminadas sin cara; las conchas y la esponja son materia opaca.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_ANEM=pal("Sty Acuático · Anémona",["#6fe3dc","#16778f"]);
const P_MOON=pal("Sty Acuático · Luna",["#7ccfff","#1b3d96"]);
const P_HERM=pal("Sty Acuático · Nácar",["#a8ecea","#2a7a94"]);
const P_PERCH=pal("Sty Acuático · Perca",["#5fdcc4","#136a64"]);
const P_SPON=pal("Sty Acuático · Esponja",["#74dfe8","#126c88"]);
const P_GOLD=pal("Sty Acuático · Dorado",["#ffc45a","#c9501a"]);

// colores de materia en espacio lineal (THREE.Color convierte el hex sRGB)
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const TEAL=lin(0x1aa2b4), TEALD=lin(0x0b5876), AQUA=lin(0x46c9cf), DEEP=lin(0x0e3f66),
  CORAL=lin(0xf0708e), CORALD=lin(0x7a2a78), MOONB=lin(0x2a54b8), MOONL=lin(0x9fe0ff),
  SAND=lin(0xc9a77a), ROCK=lin(0x6f6a72), ROCKD=lin(0x3a3540), NACRE=lin(0xf2dbe6), NACRE2=lin(0xbfe9ef),
  OLIVE=lin(0x6c8a3c), OLIVED=lin(0x2e4420), PALE=lin(0xe6dfae), FINR=lin(0xdd5a26),
  OCHRE=lin(0xe0ae3a), OCHRED=lin(0x8f5e18), GOLD=lin(0xf29a1c), GOLDD=lin(0xb8420e), CREAM=lin(0xfde3a8),
  SILVER=lin(0x9fc6cc), HEALG=lin(0x6fe08a), EMP=lin(0xff5a34), SHIELDB=lin(0x6aa8ff), DARK=lin(0x1a2430);

const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7, BK=V3(-3.85,1.25,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0);
const aim=(o,d)=>{if(d.lengthSq()>1e-8)o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const BZ=`vec3 bz(vec3 a,vec3 b,vec3 c,float t){float s=1.-t;return s*s*a+2.*s*t*b+t*t*c;}`;

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb, y `back` para la cara interior); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.06,nzs='vec2(1.7,.9)',back=''}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);bool ff=gl_FrontFacing;if(!ff)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}${back?`if(!ff){${back}}`:''}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 float edge=smoothstep(uQ+.12,uQ,nz)*step(-.5,uQ);c+=uC1*edge*1.6;
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// aleta (plano con la base en x=0 y la punta hacia −x): ahorquillada si fork, radios; matter, uQ = erosión
const FIN=(col,{fork=1,alpha=.92}={})=>`uniform float uQ;void main(){vec2 p=vec2(1.-vUv.x,vUv.y-.5);
 float w=.08+.42*p.x;float xl=1.-${fork?'.38*(1.-abs(p.y)/max(w,.001))':'0.'};
 float inside=smoothstep(w,w-.04,abs(p.y))*smoothstep(xl,xl-.06,p.x)*step(.02,p.x);if(inside<.03)discard;
 float rays=.72+.28*sin(atan(p.y,p.x+.25)*34.);float nz=styNoise(vUv*1.3+.4).r;if(styErode(nz,uQ,.06)<.5)discard;
 vec3 c=styRampOf(${col},.3+.5*p.x*rays)*styTint(.62);c*=1.-.35*smoothstep(w-.07,w-.02,abs(p.y));
 gl_FragColor=vec4(c,inside*${f(alpha)}*uA);}`;
// mancha / charco en el suelo: col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6,lo=.12)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},${f(lo)}+.3*n),m*er*uA*${f(alpha)});}`;
// charco de agua: ondas concéntricas y brillos (matter, turquesa saturado)
const PUDDLE=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.82,.68,r+(n-.5)*.45);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);float rip=smoothstep(.06,0.,abs(fract(r*3.2-uT*1.4)-.5)-.4)*m;
 vec3 c=styRampOf(${TEAL},.3+.3*n+.25*rip);c=mix(c,${AQUA}*1.1,smoothstep(.62,.7,styNoise(vUv*1.4+uT*.05).g)*.6);
 gl_FragColor=vec4(c,m*er*uA*.78);}`;
// anillo de pincel vertical (onda de presión, ondas de sonido): plano frente a la cámara; uP = vida
const RINGV=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float w=.09+.04*styNoise(vec2(an*1.3,uP*2.)).r;float m=smoothstep(w,0.,abs(r-.8));
 if(m<.02)discard;float er=styErode(m*.5+styNoise(vec2(an*2.,r)).g*.5,uP,.15);
 vec3 c=styRampOf(${TEAL},.45+.45*m);c=mix(c,${AQUA},.35*smoothstep(.5,1.,m));
 gl_FragColor=vec4(c,m*er*uA);}`;
// cruz de curación (energía)
const PLUS_FS=S.PV+`void main(){vec2 q=styPC()-.5;float m=max(step(abs(q.x),.1)*step(abs(q.y),.33),step(abs(q.y),.1)*step(abs(q.x),.33));
 if(m<.5||vA<.01)discard;gl_FragColor=vec4(styRampOf(${HEALG},.75+.25*step(abs(q.x),.05))*1.15,vA);}`;
// chevrón hacia arriba (energía de un color)
const CHEVUP=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;gl_FragColor=vec4(styRampOf(${col},.8)*1.2,a);}`;
// raya (velocidad, rayo lunar) en el sprite: vertical si vert
const STREAK=(col,vert,gain=1.)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;${vert?'q=q.yx;':''}
 float a=smoothstep(.08,0.,abs(q.y))*smoothstep(.5,.08,abs(q.x))*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.5+.45*smoothstep(.04,0.,abs(q.y)))*${f(gain)},a);}`;
// gota de agua (materia turquesa) y salpicadura
const DROP_W=S.MATTER_FS(C.drop,{relief:4,col:TEAL,bias:.02});
const PUFF_W=S.MATTER_FS(C.puff,{relief:4.5,col:AQUA,bias:-.06});
const SPARK_E=S.ENERGY_FS(C.spark,{gain:1.15});

// ---------- piezas de agua comunes ----------
/** corona de salpicadura: n gotas que saltan desde P en el instante T (vertex shader) */
const splashVS=(P,T,{n=18,up=.8,speed=2.6,grav=8.,life=.55,size=.22,spread=0.})=>`void main(){float s=${f(T)}+aSeed.x*.04;float life=${f(life)}+aSeed.y*.25;
 float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
 vec3 v=normalize(vec3(cos(an)*(.6+${f(spread)}),${f(up)}+.5*aSeed.w,sin(an)*(.6+${f(spread)})))*(${f(speed)}*(.6+.6*aSeed.w));
 vec3 p=${v3(P)}+v*t+vec3(0.,-${f(grav)}*t*t,0.);vec2 vel=vec2(v.x,v.y-2.*${f(grav)}*t);
 vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(vel.x,vel.y);put(p,${f(size)}+.1*aSeed.y);}`;

const defs=[];

// =====================================================================
// 1 · ANEMONE — cinco tentáculos de anémona (coral con bandas violeta) brotan de la espalda y se mecen; se tensan y
//     lanzan un látigo de agua urticante que cruza el tablero y estalla en el rival con chispas rosadas. Después sorben
//     agua de un charco a los pies (los tentáculos laten) y una ola turquesa recorre el campo curando a todos. ti 0,8 s
// =====================================================================
defs.push({key:"sty_qeAnemone",name:"Anemone (estilizado)",dur:2.3,ti:0.8,pal:P_ANEM,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Despliegue",0],["Latigazo",0.48],["Impacto",0.8],["Succión",1.0],["Cura",1.45],["Repliegue",1.95]],
build(a){
  const L=a.L,TL=0.48,TI=0.8,TS=1.0,TH=1.45,TR=1.95;
  const Q={value:-1},K={value:0};
  const tmat=S.mat(SOLID(`float band=smoothstep(.35,.65,sin(vP.y*34.+vUv.x*6.2832*.0)*.5+.5);
   base=mix(${CORAL},${CORALD},band*.4+smoothstep(.0,.3,-vP.y+.15)*.3);lb=-.03*band;float tip=smoothstep(.12,.3,vP.y);`,{hot:`${lin(0xff9ad0)}*tip*1.4`,rim:.35}),{uQ:Q,uK:K},{mode:'solid'});
  const tipM=S.mat(SOLID(`base=${lin(0xf58ab0)};`,{hot:`${AQUA}*1.6`,rim:.4}),{uQ:Q,uK:K},{mode:'solid'});
  const SEGH=0.3, tents=[];
  const base0=[[-0.05,0.1,0.18],[0.12,0.05,-0.12],[-0.22,0.02,-0.22],[0.08,0.12,0.32],[-0.18,0.06,0.05]];
  const root=new THREE.Group(); root.position.copy(BK); root.scale.setScalar(1.9); L.mesh.add(root);
  base0.forEach(([x,y,z],i)=>{
    const g=new THREE.Group(); g.position.set(x,y,z); root.add(g);
    let par=g; const segs=[];
    for(let j=0;j<3;j++){
      const r0=0.085-0.024*j, r1=r0-0.024;
      const m=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(r1,0.02),r0,SEGH,10,3).translate(0,SEGH/2,0),tmat);
      const s=new THREE.Group(); s.position.y=j?SEGH:0; s.add(m); par.add(s); segs.push(s); par=s;
    }
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,8),tipM); tip.position.y=SEGH; par.add(tip);
    tents.push({g,segs,ph:i*1.37,lean:(i-2)*0.22});
  });
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.62});
  const ringT=S.groundRing(L.decal,2.6), wave=S.groundRing(L.decal,3.0);
  const pudT=groundPlane(2.2,TX,0.026,S.mat(PUDDLE,{},{mode:'matter'})); L.decal.add(pudT);
  const pudC=groundPlane(2.4,CX,0.027,S.mat(PUDDLE,{},{mode:'matter'})); L.decal.add(pudC);
  const A0=V3(-3.75,2.05,0), A1=V3(-0.4,3.4,0.2), A2=TC;
  const K2=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TH=${f(TH)};
   const vec3 A0=${v3(A0)};const vec3 A1=${v3(A1)};const vec3 A2=${v3(A2)};${BZ}`;
  // látigo de agua: tramo que viaja del lomo al rival (cabeza = h, cola = h−0,4)
  S.pts(L.part,46,VV+K2+`void main(){float s=aSeed.x;float h=clamp((uT-TL)/(TI-TL),0.,1.);h=h*h*(3.-2.*h);
   float tail=h-.42-.5*clamp((uT-TI)/.2,0.,1.);float on=step(s,h)*step(tail,s)*step(TL,uT);
   vec3 p=bz(A0,A1,A2,s)+(rnd()*.09)*(1.+2.*clamp((uT-TI)/.2,0.,1.));
   vA=on;vK=smoothstep(TI,TI+.25,uT);vR=aSeed.w*6.28+uT*3.;put(p,.36+.14*aSeed.y);}`,PUFF_W);
  S.pts(L.part,16,VV+K2+`void main(){float s=aSeed.x;float h=clamp((uT-TL)/(TI-TL),0.,1.);h=h*h*(3.-2.*h);
   float on=step(s,h)*step(h-.25,s)*step(TL,uT)*step(uT,TI+.05);vec3 p=bz(A0,A1,A2,s)+rnd()*.16;
   vA=on;vK=0.;vR=uT*7.+aSeed.y*6.;put(p,.16+.08*aSeed.z);}`,S.MATTER_FS(C.spark,{relief:2,col:lin(0xff7fb8),bias:.1}));
  // impacto: corona de agua y nematocistos rosados
  S.pts(L.part,20,VV+splashVS(TC,TI,{n:20,up:.9,speed:2.8,size:.2}),DROP_W);
  S.pts(L.part,12,VV+`void main(){float s=${f(TI)}+aSeed.x*.05;float age=(uT-s)/.4;float t=max(uT-s,0.);
   vec3 p=${v3(TC)}+normalize(rnd())*(.2+1.3*(1.-exp(-t*7.)));vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=aSeed.y*6.;put(p,.2+.08*aSeed.z);}`,
   S.MATTER_FS(C.spark,{relief:2,col:lin(0xff6fae),bias:.1}));
  // succión: gotas que suben del charco a los tentáculos
  S.pts(L.part,18,VV+K2+`void main(){float k=(uT-TS)/.32+aSeed.x;float c=floor(k);float u=fract(k);vec3 r=rr(c);
   vec3 p0=vec3(${f(CX)}+(r.x-.5)*1.6,.05,(r.z-.5)*1.4),p1=${v3(BK)}+vec3((r.y-.5)*.4,.8+.2*r.z,(r.x-.5)*.5);
   vec3 p=mix(p0,p1,u*u)+vec3(0.,sin(u*3.14159)*.25,0.);
   vA=(k>=0.&&uT<TH+.1)?smoothstep(0.,.15,u):0.;vK=smoothstep(.75,1.,u);vR=3.14159;put(p,.16+.06*r.y);}`,DROP_W);
  // cura: cruces que suben sobre el lanzador y a lo largo del frente de la ola
  S.pts(L.part,10,VV+K2+`void main(){float s=TH+aSeed.x*.3;float age=(uT-s)/.6;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(CX)}+cos(an)*.5,.5+age*1.6,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.1*aSeed.z);}`,PLUS_FS,{mode:'energy'});
  S.pts(L.part,24,VV+K2+`void main(){float t=uT-TH;float rad=.6+6.2*(1.-exp(-t*2.2));float an=aSeed.x*6.2832;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.2+t*.9+aSeed.y*.3,sin(an)*rad*.85);vA=(t>0.&&t<.75)?(1.-t/.75):0.;vK=0.;vR=0.;put(p,.22+.08*aSeed.z);}`,PLUS_FS,{mode:'energy'});
  S.pts(L.part,40,VV+K2+`void main(){float t=uT-TH;float rad=.5+6.*(1.-exp(-t*2.2));float an=aSeed.x*6.2832+aSeed.y*.1;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.12+.1*aSeed.y,sin(an)*rad*.85);vA=(t>0.&&t<.8)?1.:0.;vK=smoothstep(.2,.8,t);vR=an;put(p,.34+.14*aSeed.z);}`,PUFF_W);
  a.pose=function(te,o){
    const ia=te-TI, grow=e3(te/0.4)*(1-ss(TR,a.dur,te));
    Q.value=-1+1.8*ss(TR+0.1,a.dur,te);
    const wind=ss(0.3,TL,te)*(1-ss(TL,TL+0.07,te)), lash=ss(TL,TL+0.08,te)*(1-ss(TI,TI+0.35,te));
    const suck=ss(TS,TS+0.15,te)*(1-ss(TH,TH+0.3,te));
    K.value=0.2*suck*(0.5+0.5*Math.sin(te*22))+0.6*hitE(te-TH,5)*(te>=TH?1:0);
    for(const t of tents){
      t.g.scale.setScalar(Math.max(grow,0.001));
      t.g.rotation.z=t.lean*0.5+0.55*wind-0.9*lash; t.g.rotation.x=t.lean*0.8;
      t.segs.forEach((s,j)=>{s.rotation.z=0.18*Math.sin(te*3.2+t.ph+j*0.9)*(1-0.6*lash)+(j?0.25*wind-0.35*lash:0);s.rotation.x=0.1*Math.sin(te*2.4+t.ph*1.7+j);});
    }
    spark.pose(ia,TC,1);
    ringT.pose(ia,TX,0,0.45,1);
    set(pudT,ia>=0?-0.1+1.15*ss(0.5,1.4,ia):0,ia>=0?ss(0,0.12,ia):0); pudT.visible=ia>=0;
    pudC.visible=te>=TS-0.1; set(pudC,-0.1+1.15*ss(TH+0.2,a.dur,te),ss(TS-0.1,TS+0.1,te));
    wave.pose(te-TH,CX,0,0.75,3.4);
    const hit=hitE(ia,6); target.position.x=TX+0.2*hit; target.rotation.z=-hit*0.22*Math.cos(ia*14);
    caster.rotation.z=0.06*wind-0.08*lash;
    glowOf(caster,U.uC1.value,0.5*hitE(te-TH,4)*(te>=TH?1:0)+0.15*suck);
    if(ia<0){o.g.copy(BK).y+=0.6;o.gs=0.6*grow;o.ga=0.15*grow;o.li=1.2*grow;}
    else if(te<TH){o.g.copy(TC);o.gs=1.1+3*ia;o.ga=Math.exp(-ia*11)*0.5;o.li=6*Math.exp(-ia*6);}
    else{o.g.set(CX,0.6,0);o.gs=2.5;o.ga=0.25*hitE(te-TH,3);o.li=3*hitE(te-TH,3);}
    o.ia=ia;o.c.copy(TC);o.shake=0.8;o.dist=0.8;o.flash=0.6;
    o.em=0.3*hitE(ia,4)*(ia>=0?1:0);o.emc.copy(U.uC1.value);
  };
}});

// =====================================================================
// 2 · BLUE MOON — una luna creciente azul (materia iluminada, borde cian) se alza sobre el rival; desata rayos lunares
//     que caen en lluvia a su alrededor y el rayo central lo golpea con una corona de agua. Después la luna se refleja en
//     un charco a los pies del lanzador: remolino de rayas veloces y chevrones azules (+1 PM). ti 0,95 s
// =====================================================================
const MOON_FS=`void main(){vec2 p=(vUv-.5)*2.;float d0=length(p);float d1=length(p-vec2(.38,.22));
 float disk=smoothstep(.82,.78,d0);float cut=smoothstep(.62,.66,d1);float m=disk*cut;if(m<.02)discard;
 float nz=styNoise(vUv*1.2+.3).r;if(styErode(nz*.7+m*.3,uP,.1)<.5)discard;
 float cr=smoothstep(.55,.75,styNoise(vUv*2.3).g);float sh=clamp(.35+.6*(-p.x*.6+p.y*.4),0.,1.);
 float band=smoothstep(.42,.48,sh)*.5+smoothstep(.72,.78,sh)*.5;vec3 c=styRampOf(${MOONB},.22+.55*band-.08*cr);float rim=smoothstep(.62,.8,d0)*disk+smoothstep(.72,.64,d1)*cut*disk*.9;
 c+=${MOONL}*rim*.9;gl_FragColor=vec4(c,m*uA);}`;
const HALO_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=smoothstep(1.,.35,r)*smoothstep(.2,.55,r);
 gl_FragColor=vec4(styRampOf(${MOONB},.6)*.5,a*uA*.5);}`;
const BEAM_FS=`void main(){float x=abs(vUv.x-.5)*2.;float core=smoothstep(.35,.05,x);float body=smoothstep(1.,.45,x);
 float fl=styNoise(vec2(vUv.x*.5,vUv.y*1.5-uT*2.)).g;float m=body*(.7+.3*fl)*smoothstep(0.,.08,vUv.y);if(m<.02)discard;
 vec3 c=mix(styRampOf(${MOONB},.55),${MOONL},core*.8);gl_FragColor=vec4(c*1.25,m*uA);}`;
const REFL_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.82,.68,r+(n-.5)*.4);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);vec2 w=p+vec2(sin(p.y*9.+uT*5.)*.03,0.);
 float moon=smoothstep(.42,.38,length(w))*smoothstep(.3,.34,length(w-vec2(.2,.12)));
 vec3 c=styRampOf(${DEEP},.35+.25*n);c=mix(c,${MOONL}*1.1,moon*.85);
 gl_FragColor=vec4(c,m*er*uA*.85);}`;
defs.push({key:"sty_qeBlueMoon",name:"Blue Moon (estilizado)",dur:2.3,ti:0.95,pal:P_MOON,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Luna",0],["Rayos",0.62],["Impacto",0.95],["Reflejo",1.2],["Ocaso",1.85]],
build(a){
  const L=a.L,TR=0.62,TI=0.95,TF=1.2,TO=1.85,MP=V3(TX,3.55,0);
  const moon=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),S.mat(MOON_FS,{},{mode:'matter'})); L.mesh.add(moon);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),S.mat(HALO_FS,{},{mode:'energy'})); L.mesh.add(halo);
  const beam=new THREE.Mesh(new THREE.PlaneGeometry(0.62,1).translate(0,0.5,0),S.mat(BEAM_FS,{},{mode:'energy'})); L.mesh.add(beam);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.21});
  const ringT=S.groundRing(L.decal,2.8), ringC=S.groundRing(L.decal,2.2);
  const pudT=groundPlane(2.2,TX,0.026,S.mat(PUDDLE,{},{mode:'matter'})); L.decal.add(pudT);
  const refl=groundPlane(2.3,CX,0.027,S.mat(REFL_FS,{},{mode:'matter'})); L.decal.add(refl);
  const K=`const float TR=${f(TR)};const float TI=${f(TI)};const float TF=${f(TF)};const vec3 MP=${v3(MP)};`;
  // lluvia de rayos lunares alrededor del rival
  S.pts(L.part,14,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR-.05);float t=uT-s;float an=aSeed.y*6.2832;float rad=.5+1.1*aSeed.z;
   vec3 g=vec3(${f(TX)}+cos(an)*rad,0.,sin(an)*rad*.8);vec3 p=mix(MP,g,clamp(t/.14,0.,1.));
   vA=(t>0.&&t<.22)?1.-smoothstep(.14,.22,t):0.;vK=0.;vR=0.;put(p,1.1);}`,STREAK(MOONL,true,1.2),{mode:'energy'});
  // ondas donde caen los rayos (gotas pequeñas)
  S.pts(L.part,28,VV+K+`void main(){float i=floor(aSeed.x*14.);float s=TR+((i+.5)/14.)*(TI-TR-.05)+.14;float t=max(uT-s,0.);float age=t/.4;
   vec3 r=rr(i);float an=r.y*6.2832;float rad=.5+1.1*r.z;vec3 g=vec3(${f(TX)}+cos(an)*rad,.05,sin(an)*rad*.8);
   float a2=aSeed.z*6.2832;vec3 v=vec3(cos(a2),1.4+aSeed.w,sin(a2))*1.2;vec3 p=g+v*t+vec3(0.,-6.*t*t,0.);
   vA=(uT>s&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=atan(v.x,v.y-12.*t);put(p,.13+.05*aSeed.y);}`,DROP_W);
  S.pts(L.part,22,VV+splashVS(V3(TX,0.9,0),TI,{up:1.1,speed:3.,size:.24}),DROP_W);
  // reflejo: rayas veloces que giran a los pies y chevrones (+1 PM)
  S.pts(L.part,14,VV+K+`void main(){float t=uT-TF;float an=aSeed.x*6.2832+t*7.;float rad=.75+.12*aSeed.y;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.12+.25*aSeed.z,sin(an)*rad*.8);vA=(t>0.&&t<.7)?sin(clamp(t/.7,0.,1.)*3.14159):0.;vK=0.;vR=0.;put(p,.6);}`,
   STREAK(MOONL,false,1.1),{mode:'energy'});
  S.pts(L.part,4,VV+K+`void main(){float s=TF+.1+aSeed.x*.25;float age=(uT-s)/.6;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(CX)}+cos(an)*.45,.3+age*1.3,sin(an)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.4);}`,CHEVUP(lin(0x5fb0ff)),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, rise=e3(te/0.55), fade=ss(TO-0.25,TO+0.2,te);
    moon.position.set(MP.x,MP.y-0.8*(1-rise),MP.z); billboard(moon); moon.scale.setScalar(Math.max(0.6+0.4*rise,0.001));
    moon.visible=fade<1; set(moon,-0.1+1.1*fade,rise*(1-fade));
    halo.position.copy(moon.position); billboard(halo); set(halo,0,rise*(1-fade)*(0.7+0.3*ss(TR,TI,te)));
    const bk=ss(TI-0.07,TI,te)*(1-ss(TI+0.08,TI+0.3,te));
    beam.visible=bk>0.001; beam.position.set(TX,0.2,0); beam.scale.set(0.6+0.6*bk,MP.y-0.3,1);
    tmp.copy(VFX.camera.position).sub(beam.position); beam.rotation.set(0,Math.atan2(tmp.x,tmp.z),0); set(beam,0,bk);
    spark.pose(ia,tmp2.set(TX,1.0,0),0.9);
    ringT.pose(ia,TX,0,0.5,1.2);
    pudT.visible=ia>=0; set(pudT,ia>=0?-0.1+1.15*ss(0.6,1.3,ia):0,ia>=0?ss(0,0.12,ia):0);
    const ir=te-TF; refl.visible=ir>=0; set(refl,ir>=0?-0.1+1.15*ss(0.55,a.dur-TF,ir):0,ir>=0?ss(0,0.2,ir):0);
    ringC.pose(ir,CX,0,0.5,1);
    glowOf(caster,U.uC1.value,0.5*hitE(ir,4)*(ir>=0?1:0));
    const hit=hitE(ia,6); target.position.x=TX+0.18*hit; target.scale.set(1+0.06*hit,1-0.1*hit,1+0.06*hit);
    if(ia<0){o.g.copy(moon.position);o.gs=1.2*rise;o.ga=0.15*rise;o.li=1.5*rise+2*ss(TR,TI,te);}
    else{o.g.set(TX,1,0);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*11)*0.5;o.li=6*Math.exp(-ia*6)+1.2*(1-fade);}
    o.ia=ia;o.c.set(TX,1,0);o.shake=0.9;o.dist=0.8;o.flash=0.5;
    o.em=0.3*hitE(ia,4)*(ia>=0?1:0);o.emc.copy(U.uC1.value);
  };
}});

// =====================================================================
// 3 · HERMIT — un remolino turquesa sube alrededor del aliado; sobre él se forma una concha de ermitaño de roca marina
//     (espiral, costuras, percebes) que cae y lo encierra con su abertura hacia la cámara: dentro brilla el nácar. La concha
//     late (barrera de 2 turnos) y al final se desmorona en motas de nácar. ti 0,75 s. Se dibuja en el objetivo.
// =====================================================================
defs.push({key:"sty_qeHermit",name:"Hermit (estilizado)",dur:2.4,ti:0.75,pal:P_HERM,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Remolino",0],["Caída",0.45],["Encierro",0.75],["Caparazón",0.95],["Muda",1.85]],
build(a){
  const L=a.L,TF=0.45,TI=0.75,TB=0.95,TM=1.85;
  const Q={value:-1},K={value:0};
  const shellG=new THREE.Group(); L.mesh.add(shellG);
  // cúpula con abertura frontal (vP.z > ...) y cara interior de nácar
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.92,40,24,0,Math.PI*2,0,Math.PI*0.75),S.mat(SOLID(`vec3 q=normalize(vP);float an=atan(q.z,q.x);
   if(q.z>.7&&q.y<.35&&q.y>-.55)discard;
   float rid=smoothstep(.1,.0,abs(fract(an/6.2832*2.+q.y*2.4)-.5)-.3);float bar=smoothstep(.86,.9,styNoise(vUv*vec2(4.,2.)).g);
   base=mix(${SAND},${ROCK},smoothstep(.2,.8,q.y)*.6+styNoise(vUv*vec2(3.,2.)).r*.3);base=mix(base,${ROCKD},rid*.7);base=mix(base,${lin(0xe9e4d4)},bar*.8);
   lb=-.12*rid+.05*bar;`,{hot:`${NACRE}*.35`,rim:.25,back:`float ir=sin(vP.y*9.+atan(vP.z,vP.x)*3.)*.5+.5;base=mix(${lin(0xd8a8c4)},${lin(0x7fc4d0)},ir);lb=-.05;`}),{uQ:Q,uK:K},{mode:'solid',side:THREE.DoubleSide}));
  dome.scale.set(1,1.18,1); dome.position.y=0.9; shellG.add(dome);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(0.42,1.05,28,6),S.mat(SOLID(`float sp=smoothstep(.1,.0,abs(fract(atan(vP.z,vP.x)/6.2832+vP.y*2.2)-.5)-.38);
   base=mix(${SAND},${ROCKD},sp*.75);lb=-.1*sp;`,{hot:`${NACRE}*.3`,rim:.3}),{uQ:Q,uK:K},{mode:'solid'}));
  spire.position.set(-0.12,2.2,-0.05); spire.rotation.z=0.35; shellG.add(spire);
  // labio de nácar en la abertura
  const lip=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.07,10,28),S.mat(SOLID(`base=${NACRE};lb=.12;`,{hot:`${NACRE2}*.6`,rim:.4}),{uQ:Q,uK:K},{mode:'solid'}));
  lip.position.set(0,0.82,0.72); lip.scale.set(0.75,1.0,1); shellG.add(lip);
  const shadow=S.contactShadow(L.decal,2.2);
  const ringL=S.groundRing(L.decal,3.0), ringB=S.groundRing(L.decal,2.6);
  const swirl=groundPlane(2.8,TX,0.026,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=smoothstep(.12,0.,abs(fract(an/6.2832*3.+r*1.4-uT*1.6)-.5)-.3)*smoothstep(1.,.3,r);if(sp<.03)discard;
   float er=styErode(sp*.5+styNoise(vUv).r*.5,uP,.15);gl_FragColor=vec4(styRampOf(${TEAL},.4+.4*sp),sp*er*uA*.8);}`,{},{mode:'matter'})); L.decal.add(swirl);
  const K2=`const float TF=${f(TF)};const float TI=${f(TI)};const float TM=${f(TM)};`;
  // remolino: agua que sube en espiral alrededor del aliado
  S.pts(L.part,42,VV+K2+`void main(){float k=uT/.6+aSeed.x;float u=fract(k);float an=aSeed.y*6.2832+u*7.;float rad=1.15-.35*u;
   vec3 p=vec3(${f(TX)}+cos(an)*rad,.1+u*2.6,sin(an)*rad*.9);
   vA=(uT<TI+.05)?smoothstep(0.,.1,u)*(1.-smoothstep(.85,1.,u)):0.;vK=smoothstep(.7,1.,u);vR=an;put(p,.3+.12*aSeed.z);}`,PUFF_W);
  S.pts(L.part,20,VV+K2+`void main(){float k=uT/.45+aSeed.x;float u=fract(k);float an=aSeed.y*6.2832+u*8.;float rad=1.1-.3*u;
   vec3 p=vec3(${f(TX)}+cos(an)*rad,.15+u*2.4,sin(an)*rad*.9);vA=(uT<TI)?1.:0.;vK=0.;vR=an+1.57;put(p,.15);}`,DROP_W);
  S.pts(L.part,22,VV+splashVS(V3(TX,0.1,0),TI,{up:.6,speed:2.4,size:.24,spread:.6}),DROP_W);
  // muda: motas de nácar
  S.pts(L.part,30,VV+K2+`void main(){float s=TM+aSeed.x*.3;float t=max(uT-s,0.);float life=.7+.3*aSeed.y;float age=t/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX)}+cos(an)*.85,.2+1.5*aSeed.w,sin(an)*.8)+vec3(cos(an),.6,sin(an))*t*.8;
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.y*6.28+t*3.;put(p,.2+.1*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:NACRE,bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.2,TF,te), fall=cl((te-TF)/(TI-TF));
    Q.value=te<TF?1-2*form:-1+1.9*ss(TM,TM+0.4,te);
    const y=te<TF?2.6:te<TI?2.6*(1-fall*fall):0;
    const sq=hitE(ia,9)*(ia>=0?1:0);
    shellG.visible=te>0.18&&te<TM+0.45; shellG.position.set(TX,y,0);
    shellG.scale.set(1+0.12*sq,1-0.16*sq,1+0.12*sq); shellG.rotation.y=te<TI?(1-fall)*1.4:0.04*Math.sin(te*3);
    const beats=[TB,TB+0.3,TB+0.6].reduce((s,t)=>s+hitE(te-t,6)*(te>=t?1:0),0);
    K.value=0.35*beats+0.15*ss(TB,TB+0.2,te)*(1-ss(TM,TM+0.2,te));
    shadow.pose(TX,0,0.6+0.5*(te<TI?fall:1),te<TI?0.6*fall:0.6*(1-ss(TM,TM+0.4,te)));
    ringL.pose(ia,TX,0,0.45,1.2);
    ringB.pose(te-TB,TX,0,0.4,1);
    swirl.visible=te<TI+0.3; set(swirl,-0.1+1.15*ss(TI,TI+0.3,te),ss(0,0.2,te));
    target.scale.set(1+0.04*sq,1-0.06*sq,1+0.04*sq);
    if(ia<0){o.g.set(TX,1.3,0);o.gs=1.2;o.ga=0.12*form;o.li=1.5+1.5*form;}
    else{o.g.set(TX,1,0);o.gs=1.6;o.ga=0.25*Math.exp(-ia*8)+0.08*beats;o.li=4*Math.exp(-ia*6)+1.5*beats;}
    o.ia=ia;o.c.set(TX,0.8,0);o.shake=0.7;o.dist=0;o.flash=0.3;
    o.em=0.25*beats+0.1*ss(TI,TB,te)*(1-ss(TM,TM+0.3,te));o.emc.copy(U.uC1.value);
  };
}});

// ---------- peces: siluetas sin cara (cuerpo elipsoide + aletas) ----------
function fish(parent,{len=0.78,h=0.27,w=0.21,body,fin,Q,K,fork=1}){
  const g=new THREE.Group(); parent.add(g);
  const bodyM=new THREE.Mesh(new THREE.SphereGeometry(1,36,22),S.mat(SOLID(body,{rim:.35}),{uQ:Q,uK:K},{mode:'solid'}));
  bodyM.scale.set(len,h,w); g.add(bodyM);
  const AF={value:1};
  const finM=S.mat(FIN(fin,{fork}),{uQ:Q,uA:AF},{mode:'matter',side:THREE.DoubleSide});
  const tail=new THREE.Group(); tail.position.x=-len*0.92; g.add(tail);
  const tm=new THREE.Mesh(new THREE.PlaneGeometry(len*0.75,h*2.6).translate(-len*0.37,0,0),finM); tail.add(tm);
  const dorsal=new THREE.Mesh(new THREE.PlaneGeometry(len*0.9,h*1.1).translate(0,h*0.5,0),S.mat(FIN(fin,{fork:0,alpha:.85}),{uQ:Q,uA:AF},{mode:'matter',side:THREE.DoubleSide}));
  dorsal.position.set(-len*0.05,h*0.78,0); dorsal.rotation.z=-0.08; g.add(dorsal);
  const pect=new THREE.Mesh(new THREE.PlaneGeometry(len*0.4,h*0.9).translate(-len*0.2,0,0),finM);
  pect.position.set(len*0.25,-h*0.35,w*0.9); pect.rotation.set(0.9,0,-0.4); g.add(pect);
  return {g,tail,AF};
}

// =====================================================================
// 4 · PERCH — la presión del agua se concentra a la espalda (motas que convergen, anillo que se comprime) y escupe una
//     perca torpedo (silueta oliva con barras oscuras, aletas anaranjadas, sin cara) envuelta en una campana de agua. Al
//     chocar descarga 4 ondas de presión (1,0 · 1,22 · 1,44 · 1,68 s) que agrietan el suelo; en la última la perca
//     revienta en agua y escamas, y queda un charco que se retira. ti 1,0 s. Nivel 3
// =====================================================================
const BELL_FS=`void main(){float x=vUv.y;float st=styNoise(vec2(vUv.x*3.,vUv.y*2.-uT*6.)).b;
 float m=smoothstep(0.,.25,x)*smoothstep(1.,.6,x)*(.55+.45*smoothstep(.35,.65,st));if(m<.04)discard;
 vec3 c=styRampOf(${TEAL},.35+.5*st);c=mix(c,${AQUA},.3*st);gl_FragColor=vec4(c,m*uA*.8);}`;
const CRACK_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float ray=smoothstep(.06,0.,abs(fract(an/6.2832*9.+styNoise(vec2(r*.7,an)).r*.35)-.5)*r*2.)*step(.12,r)*smoothstep(1.,.5,r);
 float ringc=smoothstep(.04,0.,abs(r-.45-.08*styNoise(vec2(an,1.)).g))*.8;float m=max(ray,ringc)*step(r,uP*1.05);if(m<.04)discard;
 gl_FragColor=vec4(styRampOf(${DARK},.15),m*uA*.7);}`;
defs.push({key:"sty_qePerch",name:"Perch (estilizado)",dur:3.1,ti:1.0,pal:P_PERCH,tier:3,stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Presión",0],["Torpedo",0.55],["Impacto",1.0],["Pulsos",1.15],["Estallido",1.68],["Resaca",2.1]],
build(a){
  const L=a.L,TL=0.55,TI=1.0,HT=[1.0,1.22,1.44,1.68],X0=-3.2,XH=2.05,Y=1.22,HP=V3(2.95,1.22,0),GB=V3(-4.0,1.45,0);
  const Q={value:-1},K={value:0};
  const F=fish(L.mesh,{len:1.0,h:0.34,w:0.26,Q,K,fin:FINR,
    body:`vec3 q=vP;float back=smoothstep(-.25,.75,q.y);float bars=smoothstep(.15,.6,sin(q.x*15.+1.2))*smoothstep(-.4,.3,q.y)*smoothstep(.9,.45,abs(q.x));
     float sc=smoothstep(.55,.75,styNoise(vUv*vec2(14.,6.)).g);base=mix(${PALE},mix(${OLIVE},${OLIVED},.35),back);base=mix(base,${OLIVED},bars*.75);
     lb=-.1*bars+.06*sc;`});
  const bell=new THREE.Mesh(new THREE.ConeGeometry(0.42,0.9,28,1,true).rotateZ(-Math.PI/2).translate(0.55,0,0),S.mat(BELL_FS,{},{mode:'matter'}));
  F.g.add(bell);
  const press=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(RINGV,{},{mode:'matter'})); L.mesh.add(press);
  const waves=HT.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),S.mat(RINGV,{},{mode:'matter',depthTest:false}));L.mesh.add(m);return m;});
  const sparks=HT.map((t,i)=>S.hitSpark(L.mesh,1.1,{seed:0.17+0.21*i}));
  const crack=groundPlane(3.2,TX,0.024,S.mat(CRACK_FS,{},{mode:'matter'})); L.decal.add(crack);
  const pud=groundPlane(2.8,TX,0.026,S.mat(PUDDLE,{},{mode:'matter'})); L.decal.add(pud);
  const rings=HT.map(()=>S.groundRing(L.decal,2.4));
  const K2=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 GB=${v3(GB)};const vec3 HP=${v3(HP)};
   float px(float t){return t<TL?${f(X0)}:(t<TI?${f(X0)}+${f(XH-X0)}*pow((t-TL)/(TI-TL),1.7):${f(XH)});}`;
  // presión: motas de agua que convergen al lomo
  S.pts(L.part,30,VV+K2+`void main(){float k=uT/.35+aSeed.x;float u=fract(k);vec3 r=rr(floor(k));
   vec3 p0=GB+normalize(r-.5)*(1.6+.4*r.y);vec3 p=mix(p0,GB,u*u);vA=(uT<TL)?smoothstep(0.,.2,u):0.;vK=smoothstep(.85,1.,u);
   vR=aSeed.y*6.28;put(p,.2+.1*r.z);}`,PUFF_W);
  // estela de burbujas y agua detrás de la perca
  S.pts(L.part,36,VV+K2+`void main(){float s=TL+aSeed.x*(TI-TL);float t=max(uT-s,0.);float age=t/(.45+.2*aSeed.y);
   vec3 p=vec3(px(s)-.7,${f(Y)},0.)+rnd()*.14+vec3(-t*.8,t*.35,0.);vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28;
   put(p,(.2+.12*aSeed.z)*(.7+.8*age));}`,PUFF_W);
  S.pts(L.part,18,VV+K2+`void main(){float s=TL+aSeed.x*(TI-TL);float t=max(uT-s,0.);float age=t/.3;
   vec3 p=vec3(px(s)-.4,${f(Y)}+(aSeed.y-.5)*.35,(aSeed.z-.5)*.3);vA=(uT>s&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.7);}`,STREAK(AQUA,false,1.),{mode:'energy'});
  // escudo roto (esquirlas azules) en el primer golpe y escamas/agua en el estallido
  S.pts(L.part,12,VV+`void main(){float s=${f(TI)}+aSeed.x*.03;float age=(uT-s)/.5;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.5,0.))*(2.+1.5*aSeed.z);vec3 p=${v3(HP)}+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:SHIELDB,bias:.1}));
  S.pts(L.part,26,VV+splashVS(HP,HT[3],{up:.9,speed:3.4,size:.28,life:.65}),DROP_W);
  S.pts(L.part,16,VV+`void main(){float s=${f(HT[3])}+aSeed.x*.03;float age=(uT-s)/.7;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.6,0.))*(2.2+1.8*aSeed.z);vec3 p=${v3(HP)}+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*11.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:SILVER,bias:.08}));
  a.pose=function(te,o){
    const ia=te-TI, grow=e3((te-0.25)/0.3);
    const x=te<TL?X0-0.25*ss(0.3,TL,te):te<TI?X0-0.25+(XH-X0+0.25)*Math.pow((te-TL)/(TI-TL),1.7):XH;
    const pulses=HT.reduce((s,t)=>s+hitE(te-t,10)*(te>=t?1:0),0);
    const burst=ss(HT[3],HT[3]+0.12,te);
    Q.value=-1+2*burst;
    F.g.visible=te>0.25&&burst<1; F.g.position.set(x+0.04*Math.sin(te*90)*pulses,Y+0.03*Math.sin(te*70)*pulses,0);
    F.g.rotation.set(0.15*Math.sin(te*5)*(te<TL?1:0),0,0); F.g.scale.setScalar(Math.max(grow*(1+0.08*pulses),0.001));
    F.g.scale.x*=te>=TL&&te<TI?1.15:1;
    F.tail.rotation.y=0.45*Math.sin(te*(te<TI?26:14)); F.AF.value=1-burst;
    K.value=0.5*pulses;
    bell.visible=te>=TL&&te<TI+0.05; set(bell,0,ss(TL,TL+0.1,te)*(1-ss(TI-0.02,TI+0.05,te)));
    const pr=ss(0,TL,te); press.visible=te<TL+0.05; towardCam(press.position,GB,0.3); billboard(press); press.scale.setScalar(Math.max(1.4-0.9*pr,0.001));
    set(press,0.1+0.3*pr,te<TL?0.85*ss(0,0.15,te):0);
    HT.forEach((t,i)=>{const it=te-t,w=waves[i],p=cl(it/0.38);w.visible=it>=0&&p<1;towardCam(w.position,HP,0.4);billboard(w);
      w.scale.setScalar(0.35+(i===3?1.6:1.1)*e3(p));set(w,0.05+0.9*p,it>=0?1:0);sparks[i].pose(it,HP,i===3?1.2:0.8);rings[i].pose(it,TX,0,0.45,i===3?1.4:1);});
    crack.visible=ia>=0; crack.material.uniforms.uA.value=ia>=0?1-ss(2.3,a.dur,te):0; crack.material.uniforms.uP.value=0.35+0.65*ss(0,HT[3]-TI,ia);
    pud.visible=te>=HT[3]; set(pud,te>=HT[3]?-0.1+1.15*ss(2.1,a.dur,te):0,ss(HT[3],HT[3]+0.12,te));
    const hit=pulses; target.position.x=TX+0.12*Math.min(hit,1.5); target.rotation.z=-0.12*Math.min(hit,1.5)*Math.cos(te*30);
    caster.rotation.z=-0.1*ss(0.2,TL,te)*(1-ss(TL,TL+0.15,te));
    if(ia<0){o.g.set(x,Y,0);o.gs=0.9;o.ga=0.12;o.li=1.5+1.5*ss(TL,TI,te);}
    else{o.g.copy(HP);o.gs=1.4+0.5*pulses;o.ga=0.2*Math.min(pulses,1.5);o.li=2+3*pulses;}
    const lastHit=HT.filter(t=>te>=t).pop();
    o.ia=lastHit!=null?te-lastHit:ia;o.c.copy(HP);o.shake=lastHit===HT[3]?1.2:0.6;o.dist=0.7;o.flash=lastHit===HT[3]?0.7:0.25;
    o.em=0.2*Math.min(pulses,1.5);o.emc.copy(U.uC1.value);
  };
}});

// =====================================================================
// 5 · SPONGE — una esponja marina (materia ocre con poros oscuros) aparece sobre el aliado y absorbe el agua del entorno
//     hasta empaparse (se oscurece y se hincha); se exprime y su agua cae en tres chorros que levantan alrededor del aliado
//     un escudo de cintas de agua en espiral. Chevrones rojos (guarda «potenciado») orbitan. Todo se disipa. ti 1,1 s
// =====================================================================
defs.push({key:"sty_qeSponge",name:"Sponge (estilizado)",dur:2.4,ti:1.1,pal:P_SPON,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Esponja",0],["Absorción",0.3],["Saturación",0.85],["Exprimir",1.1],["Escudos",1.35],["Disipación",2.0]],
build(a){
  const L=a.L,TA=0.3,TSA=0.85,TI=1.1,TSH=1.35,TD=2.0,SP=V3(TX,2.55,0);
  const Q={value:-1},K={value:0},W={value:0};
  const spM=S.mat(SOLID(`vec3 q=normalize(vP);
   float cell=styNoise(vec2(atan(q.z,q.x)*1.1,q.y*1.8)+.37).g;float pore=smoothstep(.68,.73,cell);
   float pore2=smoothstep(.72,.77,styNoise(vec2(atan(q.z,q.x)*2.2,q.y*3.6)).g);
   base=mix(${OCHRE},${OCHRED},.15+.45*uW);base=mix(base,${lin(0x4a2c0e)},max(pore,pore2)*.9);base=mix(base,${TEALD},uW*.22);
   lb=-.3*max(pore,pore2)-.06*uW;`,{hot:`${AQUA}*.5*uW`,rim:.3,er:.08}),{uQ:Q,uK:K,uW:W},{mode:'solid'});
  spM.fragmentShader=spM.fragmentShader.replace('uniform float uQ;','uniform float uQ;uniform float uW;');
  // esponja orgánica: 4 lóbulos redondeados de tamaños distintos (no un disco)
  const sponge=new THREE.Group(); L.mesh.add(sponge);
  [[0,0,0,0.42],[0.3,0.2,0.08,0.3],[-0.26,0.16,-0.1,0.32],[0.04,0.34,-0.2,0.26],[-0.08,-0.2,0.18,0.27]].forEach(([x,y,z,r],i)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,28,20),spM); m.position.set(x,y,z); m.scale.set(1,1.1+0.1*(i%2),1); sponge.add(m);});
  const shadow=S.contactShadow(L.decal,1.4);
  const ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.4);
  const pud=groundPlane(2.6,TX,0.026,S.mat(PUDDLE,{},{mode:'matter'})); L.decal.add(pud);
  const K2=`const float TA=${f(TA)};const float TSA=${f(TSA)};const float TI=${f(TI)};const float TSH=${f(TSH)};const float TD=${f(TD)};const vec3 SP=${v3(SP)};`;
  // absorción: gotas que vuelan desde el entorno a la esponja
  S.pts(L.part,40,VV+K2+`void main(){float k=(uT-TA)/.38+aSeed.x;float u=fract(k);vec3 r=rr(floor(k));float an=r.x*6.2832;
   vec3 p0=vec3(${f(TX)}+cos(an)*(2.+.8*r.y),.2+.9*r.z,sin(an)*(1.7+.6*r.y));vec3 m=mix(p0,SP,.5)+vec3(0.,.9,0.);
   vec3 p=mix(mix(p0,m,u),mix(m,SP,u),u);vA=(k>=0.&&uT<TSA+.05)?smoothstep(0.,.15,u):0.;vK=smoothstep(.85,1.,u);vR=aSeed.y*6.28;
   put(p,.18+.07*r.y);}`,DROP_W);
  // exprimir: tres chorros que caen sobre el aliado
  S.pts(L.part,48,VV+K2+`void main(){float i=floor(aSeed.x*3.);float an=i*2.094+.4;float k=(uT-TI)/.28+aSeed.y;float u=fract(k);
   vec3 p0=SP+vec3(cos(an)*.22,-.3,sin(an)*.2);vec3 p1=vec3(${f(TX)}+cos(an)*.55,.05,sin(an)*.5);
   vec3 p=mix(p0,p1,u)+vec3(0.,0.,0.)+rnd()*.05;vA=(k>=0.&&uT<TI+.55)?1.:0.;vK=smoothstep(.85,1.,u);vR=3.14159;put(p,.2+.06*aSeed.z);}`,DROP_W);
  // escudo: tres cintas de agua en espiral alrededor del aliado
  S.pts(L.part,90,VV+K2+`void main(){float i=floor(aSeed.x*3.);float s=fract(aSeed.x*3.);float t=uT-TSH;
   float an=i*2.094+s*7.+t*3.2;float rad=.78+.06*sin(s*12.);float y=.1+s*1.75;
   float grow=clamp(t/.25,0.,1.);float on=step(s,grow)*(1.-smoothstep(TD,TD+.35,uT));
   vec3 p=vec3(${f(TX)}+cos(an)*rad,y,sin(an)*rad*.9);vA=t>0.?on:0.;vK=smoothstep(TD,TD+.35,uT);vR=an;put(p,.26+.08*aSeed.y);}`,PUFF_W);
  S.pts(L.part,20,VV+splashVS(V3(TX,0.05,0),TI+0.18,{up:.5,speed:2.2,size:.2,spread:.5}),DROP_W);
  // guarda «potenciado»: chevrones rojos que orbitan
  S.pts(L.part,4,VV+K2+`void main(){float t=uT-TSH;float an=aSeed.x*6.2832+t*2.2;
   vec3 p=vec3(${f(TX)}+cos(an)*.95,1.+.25*sin(t*4.+aSeed.x*6.),sin(an)*.85);vA=t>0.?smoothstep(0.,.2,t)*(1.-smoothstep(TD,TD+.3,uT)):0.;vK=0.;vR=0.;put(p,.36);}`,
   CHEVUP(EMP),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, app=ss(0,TA,te), sat=ss(TA,TSA,te), sq=ss(TI-0.04,TI+0.12,te), gone=ss(TI+0.35,TI+0.75,te);
    Q.value=te<TA?1-2*app:-1+2*gone; W.value=sat*(1-0.6*sq);
    sponge.visible=te<TI+0.8; sponge.position.copy(SP).y+=0.12*Math.sin(te*3)-0.2*gone;
    const sw=1+0.22*sat;
    sponge.scale.set(sw*(1+0.4*sq),sw*(1-0.5*sq),sw*(1+0.35*sq)); sponge.rotation.y=te*0.8+1.6*sq;
    K.value=0.25*hitE(te-TSA,6)*(te>=TSA?1:0);
    shadow.pose(TX,0,1,0.35*app*(1-gone));
    ring.pose(te-TSH,TX,0,0.5,1.2); ring2.pose(ia,TX,0,0.4,1);
    pud.visible=te>=TI+0.1; set(pud,-0.1+1.15*ss(TD,a.dur,te),ss(TI+0.1,TI+0.3,te));
    const shieldOn=ss(TSH,TSH+0.25,te)*(1-ss(TD,TD+0.35,te));
    const sqT=hitE(te-(TI+0.15),7)*(te>=TI+0.15?1:0); target.scale.set(1+0.04*sqT,1-0.06*sqT,1+0.04*sqT);
    o.em=0.35*shieldOn+0.2*sqT; o.emc.copy(U.uC1.value);
    o.g.set(TX,te<TI?SP.y:1,0); o.gs=te<TI?0.9+0.5*sat:1.8; o.ga=0.1+0.15*sat*(1-sq)+0.12*shieldOn; o.li=1+2*sat+2*shieldOn;
    o.ia=ia; o.c.set(TX,0.9,0); o.shake=0; o.dist=0; o.flash=0.2;
  };
}});

// =====================================================================
// 6 · GOLDFISH — un pez dorado (silueta ámbar con velos anaranjados, sin cara) nace del lomo y nada en espiral alrededor
//     del lanzador dejando una estela de agua; a los pies se abre un anillo veloz con rayas (+1 PM) y una chispa dorada
//     entra en el pecho (+1 PA). Luego se lanza como un dardo contra el rival: corona de agua, escamas doradas. ti 1,25 s
// =====================================================================
defs.push({key:"sty_qeGoldfish",name:"Goldfish (estilizado)",dur:2.2,ti:1.25,pal:P_GOLD,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Nado",0],["Celeridad",0.95],["Dardo",1.0],["Impacto",1.25],["Estela",1.5]],
build(a){
  const L=a.L,TC1=0.95,TD=1.0,TI=1.25;
  const Q={value:-1},K={value:0};
  const F=fish(L.mesh,{len:0.72,h:0.36,w:0.26,Q,K,fin:lin(0xf26a1e),fork:1,
    body:`vec3 q=vP;float back=smoothstep(-.3,.8,q.y);float sc=smoothstep(.55,.75,styNoise(vUv*vec2(12.,6.)).g);
     base=mix(${CREAM},mix(${GOLD},${GOLDD},.45),back);base=mix(base,${GOLDD},smoothstep(.5,.9,q.y)*.5);lb=.05*sc;`});
  F.tail.scale.set(1.5,1.5,1);
  // espiral alrededor del lanzador (igual en JS y en GLSL)
  const SPIN=`vec3 spir(float t){float u=clamp(t/${f(TC1)},0.,1.);float an=-1.2+u*7.85;float rad=.55+.6*u;
   return vec3(${f(CX)}+cos(an)*rad,1.25+.35*sin(u*6.2832)+.1*u,sin(an)*rad*.9);}`;
  const spir=(t,out)=>{const u=cl(t/TC1),an=-1.2+u*7.85,rad=0.55+0.6*u;return out.set(CX+Math.cos(an)*rad,1.25+0.35*Math.sin(u*Math.PI*2)+0.1*u,Math.sin(an)*rad*0.9);};
  const E=spir(TC1,V3(0,0,0)), HP=V3(3.0,1.2,0);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.53});
  const ringC=S.groundRing(L.decal,2.4), ringT=S.groundRing(L.decal,2.6);
  const pud=groundPlane(2.2,TX,0.026,S.mat(PUDDLE,{},{mode:'matter'})); L.decal.add(pud);
  const K2=`const float TC1=${f(TC1)};const float TD=${f(TD)};const float TI=${f(TI)};const vec3 E=${v3(E)};const vec3 HP=${v3(HP)};${SPIN}
   vec3 fp(float t){return t<TD?spir(t):mix(E,HP,pow(clamp((t-TD)/(TI-TD),0.,1.),1.4));}`;
  // estela de agua y burbujas por donde pasó el pez
  S.pts(L.part,48,VV+K2+`void main(){float s=.08+aSeed.x*(TI-.08);float t=max(uT-s,0.);float age=t/(.55+.25*aSeed.y);
   vec3 p=fp(s)+rnd()*.1+vec3(0.,t*.3,0.);vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.18+.1*aSeed.z)*(.7+.9*age));}`,PUFF_W);
  S.pts(L.part,14,VV+K2+`void main(){float s=TD+aSeed.x*(TI-TD);float t=max(uT-s,0.);float age=t/.25;
   vec3 p=fp(s)+vec3(0.,(aSeed.y-.5)*.3,(aSeed.z-.5)*.25);vA=(uT>s&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.8);}`,STREAK(lin(0xffc070),false,1.1),{mode:'energy'});
  // celeridad: rayas que giran a los pies y chispa dorada al pecho
  S.pts(L.part,12,VV+K2+`void main(){float t=uT-TC1;float an=aSeed.x*6.2832+t*8.;float rad=.7+.1*aSeed.y;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.12+.2*aSeed.z,sin(an)*rad*.8);vA=(t>0.&&t<.6)?sin(t/.6*3.14159):0.;vK=0.;vR=0.;put(p,.55);}`,
   STREAK(AQUA,false,1.05),{mode:'energy'});
  S.pts(L.part,1,VV+K2+`void main(){float u=clamp((uT-TC1)/.3,0.,1.);vec3 p=mix(E,vec3(${f(CX)},1.15,0.),u*u)+vec3(0.,sin(u*3.14159)*.3,0.);
   vA=(uT>TC1&&u<1.)?1.:0.;vK=0.;vR=uT*6.;put(p,.42);}`,SPARK_E,{mode:'energy'});
  // impacto: corona de agua y escamas doradas
  S.pts(L.part,20,VV+splashVS(HP,TI,{up:.9,speed:2.8,size:.22}),DROP_W);
  S.pts(L.part,16,VV+`void main(){float s=${f(TI)}+aSeed.x*.03;float age=(uT-s)/.65;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.6,0.))*(2.+1.6*aSeed.z);vec3 p=${v3(HP)}+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*11.;put(p,.15+.07*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:GOLD,bias:.1}));
  const vel=V3(0,0,0), pA=V3(0,0,0), pB=V3(0,0,0);
  const fpJ=(t,out)=>t<TD?spir(t,out):out.copy(E).lerp(HP,Math.pow(cl((t-TD)/(TI-TD)),1.4));
  a.pose=function(te,o){
    const ia=te-TI, grow=e3(te/0.22);
    fpJ(Math.min(te,TI),pA); fpJ(Math.min(te,TI)+0.02,pB); vel.copy(pB).sub(pA);
    if(te<0.22)pA.lerp(BK,1-grow);
    F.g.visible=ia<0.02; F.g.position.copy(pA); if(te<TI)aim(F.g,vel);
    const dart=te>=TD&&te<TI; F.g.scale.set(Math.max(grow*(dart?1.35:1),0.001),Math.max(grow*(dart?0.85:1),0.001),Math.max(grow,0.001));
    F.tail.rotation.y=0.5*Math.sin(te*(dart?30:16));
    K.value=0.35*hitE(te-TC1,5)*(te>=TC1?1:0);
    ringC.pose(te-TC1,CX,0,0.5,1); ringT.pose(ia,TX,0,0.45,1.1);
    spark.pose(ia,HP,1);
    pud.visible=ia>=0; set(pud,ia>=0?-0.1+1.15*ss(0.4,0.95,ia):0,ia>=0?ss(0,0.12,ia):0);
    glowOf(caster,U.uC1.value,0.5*hitE(te-TC1-0.3,5)*(te>=TC1+0.3?1:0));
    const hit=hitE(ia,6); target.position.x=TX+0.22*hit; target.rotation.z=-hit*0.24*Math.cos(ia*14);
    if(ia<0){o.g.copy(pA);o.gs=0.8;o.ga=0.15*grow;o.li=1.5*grow+1.5*(dart?1:0);}
    else{o.g.copy(HP);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*11)*0.5;o.li=6*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(HP);o.shake=0.8;o.dist=0.8;o.flash=0.5;
    o.em=0.25*hitE(ia,4)*(ia>=0?1:0);o.emc.copy(U.uC1.value);
  };
}});

VFX.module("Estilizado · Acuático · Espalda",defs);
})();

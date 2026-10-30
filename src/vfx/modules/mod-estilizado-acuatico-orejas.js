// =====================================================================
// ESTILIZADO · ACUÁTICO · OREJAS (Hito 101) — las 7 cartas de oreja de Acuático rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_qoBubblemaker, sty_qoGill…); el puente las usa con el estilo nuevo encendido.
// Mismos dur / ti / fases que mod-acuatico-orejas.js (el daño llega igual). El concepto sigue la carta (PartCards.js):
//   Gill solo hace daño (sin columnas de agua en los aliados) · Inkling: daño + Gafe (sin críticos) · Nimo: +1 PA y cura
//   Tiny Fan: +1 PM y Potenciado sobre sí (ya no empuja al rival) · Seaslug: daño cuerpo a cuerpo, limpia 2 y es inmune.
// Identidad: agua turquesa saturada (nunca espuma blanca por todas partes), siluetas sin caras.
// Las orejas no se dibujan: los efectos nacen en su posición (≈ −3,72, 1,84, ±0,26).
// Colores fijos en espacio lineal (sRGB^2,2), si no la salida los aclara.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Acuático · Pompa",["#7ff2ee","#1475a6"]);
VFX.palette("Sty Acuático · Branquia",["#68e4ec","#0e5f8c"]);
VFX.palette("Sty Acuático · Tinta",["#9d8cff","#241a5e"]);
VFX.palette("Sty Acuático · Nimo",["#ffb25c","#e0521c"]);
VFX.palette("Sty Acuático · Hélice",["#78ecd8","#0f7a88"]);
VFX.palette("Sty Acuático · Cangrejo",["#5fd8e8","#15508e"]);
VFX.palette("Sty Acuático · Babosa",["#c49cff","#2b6fd2"]);

const lin=h=>{const c=new THREE.Color(h);return `vec3(${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)})`;};
const WATER=lin("#1f9cc4"), WATERL=lin("#57d4e0"), FOAM=lin("#a5e9ee"), DEEP=lin("#0b3d5c");
const INK=lin("#141030"), INKV=lin("#3a2a86"), GOLD=lin("#ffc94a"), HEAL=lin("#5be37a"), RED=lin("#ff4a3a");
const ORANGE=lin("#ff6a10");
const NAVY=lin("#3b3aa6"), CORAL=lin("#ff7448"), NACRE=lin("#d9c8ff");
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), XA=V3(1,0,0), qInv=new THREE.Quaternion();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const out3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const EARP=V3(-3.72,1.84,0.26), EARN=V3(-3.72,1.84,-0.26);
const CX=-3.7, TC=V3(3.15,1.2,0), AP=ALLY_POS[0];
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const defs=[];

// ---------- materiales del módulo ----------
// burbuja de partícula: borde turquesa iluminado, centro casi transparente, brillo duro
const BUB_FS=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
 float rim=smoothstep(.3,.42,d)*smoothstep(.5,.44,d);float hl=step(length(q-vec2(-.13,-.14)),.075);
 float a=(rim*.95+.14*smoothstep(.45,0.,d)+hl)*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${col},.5+.45*(.5-q.y)),vec3(.9,1.,1.),hl*.8),a);}`;
// pompa / escudo de agua (malla): película turquesa con fresnel, bandas de cáustica que corren, brillo; uEr la revienta
const SHELL_FS=`uniform float uEr;uniform vec3 uCol;uniform float uGl;
void main(){vec3 n=normalize(vN),v=normalize(vV);float fr=1.-abs(dot(n,v));vec3 q=normalize(vP);
 vec4 ns=styNoise(vec2(atan(q.z,q.x)*.3183+uT*.05,q.y*.5+.5+uT*.08));
 if(uEr>0.&&ns.r*.75+.25*ns.a<uEr)discard;
 float edge=uEr>0.?smoothstep(.1,0.,ns.r*.75+.25*ns.a-uEr):0.;
 float cau=smoothstep(.62,.7,styNoise(q.xy*.7+vec2(uT*.07,-uT*.05)).g)*.5;
 float l=styLight(n,stySunV());
 vec3 c=styRampOf(uCol,.35+.45*fr+.2*l)*styTint(l);
 float hl=smoothstep(.92,.95,dot(reflect(-stySunV(),n),v));
 c+=uCol*cau*.8+vec3(.85,1.,1.)*hl*.7+uCol*uGl+uCol*edge*1.5;
 gl_FragColor=vec4(c,(pow(fr,1.8)*.75+.1+cau*.35+hl+edge)*uA);}`;
const shellMat=(col,o)=>S.mat(SHELL_FS,{uEr:{value:0},uCol:{value:new THREE.Color(col)},uGl:{value:0}},Object.assign({mode:'matter',side:THREE.FrontSide},o||{}));
// ondas concéntricas en el suelo (agua turquesa); uP abre las crestas
const RIPPLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=0.;
 for(int i=0;i<3;i++){float c=uP*1.1-float(i)*.2;w+=band(r,c,.03+.035*max(c,0.))*step(0.,c)*(1.-clamp(c,0.,1.));}
 float n=styNoise(p*.8+.3).r;if(w*(.6+.4*n)<.02)discard;
 gl_FragColor=vec4(styRamp(.55+.35*n)*1.15,w*(.6+.4*n)*uA*smoothstep(1.,.85,r));}`;
// charco / mancha mojada en el suelo (materia) con borde orgánico; uP = erosión, uCol = color
const POOL_FS=`uniform vec3 uCol;uniform float uRim;void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5+uT*.03).g*.4;float m=smoothstep(.82,.7,r+(n-.5)*.45);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);float rim=smoothstep(.55,.72,r+(n-.5)*.45)*m*uRim;
 vec3 c=styRampOf(uCol,.22+.3*n)+${FOAM}*rim*.55;
 gl_FragColor=vec4(c,m*er*uA*(.62+.3*rim));}`;
const poolMat=(col,rim=0)=>S.mat(POOL_FS,{uCol:{value:new THREE.Color(col)},uRim:{value:rim}},{mode:'matter'});
const pool=(L,size,x,z,col,rim,y=0.02)=>{const m=groundPlane(size,x,y,poolMat(col,rim));m.position.z=z;L.decal.add(m);return m;};
// flecha hacia arriba (energía) y cruz de cura
const CHEVUP_FS=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.16+abs(q.x)*.95);
 float m=smoothstep(.1,.055,d)*step(abs(q.x),.4);float a=m*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.55+.45*smoothstep(.1,0.,d))*1.35,a);}`;
const CROSS_FS=col=>S.PV+`void main(){vec2 q=abs(gl_PointCoord-.5);float d=min(max(q.x-.09,q.y-.3),max(q.y-.09,q.x-.3));
 float a=smoothstep(.02,-.02,d)*vA;if(a<.01)discard;float e=smoothstep(-.06,-.01,d);
 gl_FragColor=vec4(styRampOf(${col},.85-.45*e)*1.2,a);}`;
// rombo dorado (PA) con borde oscuro
const GEM_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=abs(q.x)+abs(q.y)*.8;if(d>.42)discard;
 float e=smoothstep(.33,.4,d);float hl=step(q.x-q.y*.3,-.05);float a=vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${GOLD},.55+.35*hl),${GOLD}*.18,e)*1.25,a);}`;
// estela fina de energía a lo largo de +x (uv.x = 1 en la cabeza)
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.25+.75*u;float m=smoothstep(w,w*.4,v)*u*u;
 float n=styNoise(vec2(u*.7-uT*2.,vUv.y*.5)).b;float er=styErode(n*.5+.5*u,.2,.15);
 if(m*er<.01)discard;gl_FragColor=vec4(styRamp(.5+.4*u)*1.1,m*er*uA);}`;
const streakMesh=(parent,w)=>{const mat=S.mat(STREAK_FS,{},{mode:'energy'});const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0);
  const grp=new THREE.Group();const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat);b.rotation.x=Math.PI/2;grp.add(a,b);parent.add(grp);return grp;};
const poseStreak=(s,p0,p1,vis)=>{tmp2.copy(p1).sub(p0);const ln=tmp2.length();s.visible=vis&&ln>0.01;if(!s.visible)return;
  s.position.copy(p1);s.quaternion.setFromUnitVectors(XA,tmp2.normalize());s.scale.set(ln,1,1);
  for(const m of s.children)m.material.uniforms.uA.value=1;};
// corona de salpicadura: gotas lanzadas desde un punto (n, centro, tiempo, fuerza, vertical)
const splash=(L,n,c,T,{up=2.6,out=1.6,life=.55,size=.2,col=WATERL}={})=>S.pts(L.part,n,VV+`void main(){float s=${f(T)}+aSeed.x*.05;float lf=${f(life)}+aSeed.y*.25;float age=(uT-s)/lf;float t=max(uT-s,0.);
 float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*${f(out)}*(.5+aSeed.w),${f(up)}*(.6+.6*aSeed.y),sin(an)*${f(out)}*(.5+aSeed.w));
 vec3 p=${v3(c)}+v*t+vec3(0.,-7.5*t*t,0.);vR=3.14159+atan(v.x,v.y)*0.;vK=smoothstep(.55,1.,age);
 vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;put(p,${f(size)}*(.7+.5*aSeed.w));}`,S.MATTER_FS(C.drop,{relief:4,col}));

// =====================================================================
// 1 · BUBBLEMAKER (2 PA, aliado: +50 de escudo) — en las orejas se inflan tres pompas turquesa que flotan hasta el
//     aliado; la grande lo envuelve y las dos pequeñas se funden en ella al sellar el escudo de agua (cáusticas que corren)
// =====================================================================
defs.push({key:"sty_qoBubblemaker",name:"Bubblemaker (estilizado)",dur:2.2,ti:1.15,tier:2,pal:"Sty Acuático · Pompa",stylized:true,
  allies:1,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Inflar",0],["Soplo",0.36],["Deriva",0.6],["Escudo",1.15],["Brillo",1.45],["Fin",1.9]],
build(a){
  const L=a.L,TS=0.36,TD=0.6,TI=1.15,TB=1.45,TX=1.9,TE=2.2;
  const AC=V3(AP.x,0.9,AP.z);
  const sg=new THREE.SphereGeometry(0.5,32,22);
  const big=new THREE.Mesh(sg,shellMat("#2fb6d6")); L.mesh.add(big);
  const sm=[0,1].map(()=>{const m=new THREE.Mesh(sg,shellMat("#3fc4dc"));L.mesh.add(m);return m;});
  const inner=new THREE.Mesh(sg,shellMat("#1d8fc0",{side:THREE.BackSide})); L.mesh.add(inner);
  const ripple=groundPlane(3.0,AC.x,0.03,S.mat(RIPPLE_FS,{},{mode:'energy'})); ripple.position.z=AC.z; L.decal.add(ripple);
  const ring=S.groundRing(L.decal,3.0), cs=S.contactShadow(L.decal,1.6);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.52,toCam:0.9});
  const K=`const float TS=${f(TS)};const float TD=${f(TD)};const float TI=${f(TI)};const float TX=${f(TX)};const vec3 AC=${v3(AC)};${QB}`;
  // burbujitas que brotan de las orejas al inflar
  S.pts(L.part,22,VV+K+`void main(){float s=aSeed.x*.5;float lf=.4+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 e=aSeed.w<.5?${v3(EARP)}:${v3(EARN)};vec3 p=e+vec3(.15+t*.7,t*.9+sin(t*9.+aSeed.z*6.)*.06,(aSeed.z-.5)*.5*t);
   vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,(.1+.08*aSeed.z)*(.6+.5*age));}`,BUB_FS(WATERL));
  // estela de burbujas detrás de las pompas en la deriva
  S.pts(L.part,26,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float lf=.45+aSeed.y*.3;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float k=(s-TD)/(TI-TD);vec3 p=qb(vec3(-3.,2.05,.05),vec3(-2.3,2.9,-.9),AC+vec3(0.,.35,0.),k)+rnd()*.22+vec3(0.,t*.5,0.);
   vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.09+.08*aSeed.z);}`,BUB_FS(WATERL));
  // al sellar: gotas que salpican del escudo y burbujas que suben dentro
  splash(L,18,V3(AC.x,0.4,AC.z),TI,{up:2.2,out:1.8,life:.5,size:.19});
  S.pts(L.part,20,VV+K+`void main(){float lf=.7+aSeed.y*.3;float k=(uT-TI)/lf+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rad=.15+.4*r.y;vec3 p=AC+vec3(cos(an)*rad,-.75+age*1.5,sin(an)*rad);
   float on=step(TI,uT)*(1.-smoothstep(TX,TX+.2,uT));vR=0.;vK=0.;vA=on*sin(age*3.14);put(p,.08+.07*r.z);}`,BUB_FS(WATERL));
  // gotas cuando se deshace
  S.pts(L.part,18,VV+K+`void main(){float s=TX+aSeed.x*.15;float lf=.4+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=AC+d*1.05+d*t*1.2+vec3(0.,-4.5*t*t,0.);
   vR=3.14159;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;put(p,.16+.07*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:WATERL}));
  const P0=[V3(-3.45,2.1,0.42),V3(-3.5,2.05,-0.5),V3(-3.3,2.3,0.0)], PC=V3(-2.3,2.9,-0.9);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.06*ss(0,TS,te)-0.1*ss(TS,TS+0.1,te);
    // pompas: inflar en las orejas, soplo, deriva en arco al aliado
    const grow=out3(te/TS);
    const all=[big,...sm];
    all.forEach((m,i)=>{
      const p0=P0[i], drift=cl((te-TD-i*0.04)/(TI-TD-0.08));
      let r=(i===0?0.42:0.24)*grow;
      if(te<TD){m.position.copy(p0);m.position.x+=0.25*ss(TS,TD,te);m.position.y+=0.04*Math.sin(te*14+i);}
      else{const k=drift*drift*(3-2*drift);qb(p0,PC,tmp.set(AC.x+(i?(i===1?0.55:-0.55):0),AC.y+(i?0.5:0),AC.z),k,m.position);}
      if(i===0&&te>=TD)r=0.42+0.68*ss(TD,TI,te);
      const absorbed=i>0?ss(TI-0.08,TI+0.05,te):0;
      const wob=te>TI?hitE(ia,4)*Math.sin(ia*22):0;
      m.scale.set(r*2*(1+0.1*wob),r*2*(1-0.1*wob),r*2*(1+0.1*wob));
      if(i>0){m.scale.multiplyScalar(Math.max(1-absorbed,0.001));if(te>TI-0.08)m.position.lerp(AC,absorbed);}
      m.visible=te>0.02&&(i===0?te<TE:absorbed<0.999);
      const er=i===0?-0.1+1.1*ss(TX,TE-0.05,te):0;
      m.material.uniforms.uEr.value=er; m.material.uniforms.uA.value=1;
      m.material.uniforms.uGl.value=i===0?0.5*hitE(ia,5)*(ia>=0?1:0)+0.12*ss(TB,TB+0.2,te)*(0.5+0.5*Math.sin(te*9)):0;
    });
    inner.position.copy(big.position); inner.scale.copy(big.scale).multiplyScalar(0.97); inner.visible=te>TI&&te<TE;
    inner.material.uniforms.uA.value=0.5; inner.material.uniforms.uEr.value=big.material.uniforms.uEr.value;
    set(ripple,cl(ia/0.8),ia>=0?1-ss(TI+0.5,TI+0.9,te):0); ripple.visible=ia>=0;
    ring.pose(ia,AC.x,AC.z,0.45,1);
    spark.pose(ia,tmp.set(AC.x,1.4,AC.z),0.8);
    cs.pose(AC.x,AC.z,1.1,0.25*ss(TI-0.3,TI,te)*(1-ss(TX,TE,te)));
    const al=allies[0]; if(al){const hk=hitE(ia,6);al.scale.set(1+0.06*hk,1-0.06*hk,1+0.06*hk);}
    if(te<TD){o.g.set(-3.4,2.1,0);o.gs=0.8*grow;o.ga=0.25*grow;o.li=1.2*grow;}
    else if(te<TI){o.g.copy(big.position);o.gs=1.2;o.ga=0.3;o.li=2;}
    else{o.g.copy(AC);o.gs=1.6+2*Math.min(ia,0.4);o.ga=0.35*hitE(ia,6)+0.1;o.li=4*hitE(ia,4)+0.6;}
    o.ia=ia; o.c.copy(AC); o.shake=0.3; o.dist=0.3; o.flash=0.4;
  };
}});

// =====================================================================
// 2 · GILL (2 PA, daño) — las branquias de las orejas se encienden, expulsan vapor marino que se comprime en tres
//     anillos de vórtice de agua; golpean en el pecho del rival con salpicadura, espuma turquesa y ondas en el suelo
// =====================================================================
// anillo de vórtice: agua iluminada en bandas, vetas que giran a lo largo del tubo; uEr lo deshace
const TORUS_FS=`uniform float uEr;uniform float uGl;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec4 ns=styNoise(vec2(vUv.x*2.-uT*1.6,vUv.y*.5));float st=smoothstep(.55,.7,ns.b);
 if(uEr>0.&&ns.r*.7+.3*ns.a<uEr)discard;
 vec3 c=styRampOf(mix(uC2,uC1,.35+.35*st),.25+.55*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uC1*.35*smoothstep(.55,.75,fr);
 c+=uC1*uGl;gl_FragColor=vec4(c,(.78+.2*st)*uA);}`;
const GILL_FS=`void main(){vec2 p=vUv-.5;float w=0.;for(int i=0;i<3;i++){float y=-.22+float(i)*.22;
 float cur=y+.1*cos(p.x*5.);w=max(w,smoothstep(.045,.015,abs(p.y-cur))*smoothstep(.4,.2,abs(p.x)));}
 if(w<.02)discard;gl_FragColor=vec4(styRamp(.6+.4*w)*1.3,w*uA);}`;
defs.push({key:"sty_qoGill",name:"Gill (estilizado)",dur:2.25,ti:0.85,tier:2,pal:"Sty Acuático · Branquia",stylized:true,
  zoneCaster:0.5,zoneTarget:1.15,
  phases:[["Branquias",0],["Vapor",0.25],["Vórtices",0.45],["Impacto",0.85],["Salpicadura",1.15],["Disipación",1.7],["Fin",2.0]],
build(a){
  const L=a.L,TV=0.25,TR=0.45,TI=0.85,TQ=1.15,TX=1.7,TE=2.25;
  const gills=[EARP,EARN].map(e=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.5),S.mat(GILL_FS,{},{mode:'energy'}));L.mesh.add(m);m.userData.e=e;return m;});
  const tg=new THREE.TorusGeometry(0.4,0.11,14,40);
  const torMat=S.mat(TORUS_FS,{uEr:{value:0},uGl:{value:0}},{mode:'matter',side:THREE.DoubleSide});
  const rings=[0,1,2].map(i=>{const m=new THREE.Mesh(tg,torMat);L.mesh.add(m);return m;});
  const P0=V3(-3.0,1.75,0), HIT=V3(3.1,1.2,0);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.33,toCam:0.6});
  const ripple=groundPlane(3.2,3.4,0.03,S.mat(RIPPLE_FS,{},{mode:'energy'})); L.decal.add(ripple);
  const ring=S.groundRing(L.decal,3.0);
  const stain=pool(L,2.2,3.4,0,"#0f4f74",0.6);
  const K=`const float TV=${f(TV)};const float TR=${f(TR)};const float TI=${f(TI)};const float TQ=${f(TQ)};const vec3 P0=${v3(P0)};const vec3 HIT=${v3(HIT)};`;
  // vapor marino que sale de las orejas y se comprime hacia delante
  S.pts(L.part,24,VV+K+`void main(){float s=TV+aSeed.x*(TR-TV+.1);float lf=.4+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 e=aSeed.w<.5?${v3(EARP)}:${v3(EARN)};vec3 p=mix(e+vec3(.1,0.,(aSeed.w-.5)*.6),P0+rnd()*.15,smoothstep(0.,1.,age))+vec3(0.,t*.2,0.);
   vR=aSeed.z*6.28+t*2.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.32+.15*aSeed.z)*(1.-age*.5));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:FOAM}));
  // espiral de gotas que siguen a cada anillo
  S.pts(L.part,48,VV+K+`void main(){float id=floor(aSeed.x*2.999);float t0=TR+id*.05;float s=t0+aSeed.y*(TI-TR);float k=clamp((s-t0)/(TI-TR),0.,1.);
   float lf=.3+aSeed.z*.15;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832+s*18.;float rad=(.34+.3*k)*(1.+t*1.5);
   vec3 c=mix(P0,HIT,k*k*(1.5-.5*k));vec3 p=c+vec3(-t*.6,cos(an)*rad,sin(an)*rad);
   vR=3.14159;vK=smoothstep(.4,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.06*aSeed.z);}`,S.MATTER_FS(C.drop,{relief:4,col:WATERL}));
  // impacto: corona de salpicadura, espuma turquesa
  splash(L,34,V3(3.1,1.15,0),TI,{up:3.2,out:2.6,life:.65,size:.27});
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.08;float lf=.6+aSeed.y*.3;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=HIT+vec3(cos(an)*.4*(1.+t*2.5)+.2,sin(an)*.45*(1.+t*1.5)+t*.25,(aSeed.w-.5)*1.2*(.3+t));
   vR=an+t*2.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.38+.18*aSeed.w)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:-.05,col:WATERL}));
  S.pts(L.part,14,VV+K+`void main(){float s=TQ+aSeed.x*.4;float lf=.35+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 p=vec3(3.4+(aSeed.z-.5)*1.4,.05+t*1.8-5.*t*t,(aSeed.w-.5)*1.4);
   vR=3.14159;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;put(p,.13+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:WATERL}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,TV,te)-0.18*ss(TR,TR+0.08,te)+0.08*ss(TR+0.1,TI,te);
    const gA=ss(0,0.15,te)*(1-ss(TR+0.1,TR+0.35,te));
    for(const g of gills){g.position.copy(g.userData.e);g.position.x+=0.05;towardCam(g.position,g.position,0.2);billboard(g,0);
      g.material.uniforms.uA.value=gA*(0.7+0.3*Math.sin(te*30));g.visible=gA>0.001;}
    rings.forEach((m,i)=>{
      const t0=TR+i*0.05, t1=TI+i*0.05, k=cl((te-t0)/(t1-t0)), kk=k*k*(1.5-0.5*k);
      const after=te-t1;
      m.visible=te>=t0&&after<0.4;
      m.position.lerpVectors(P0,HIT,kk); if(after>0)m.position.x+=after*0.6;
      m.rotation.set(te*3+i,Math.PI/2,0);
      const sc=(1.2+1.1*kk)*(1+(after>0?after*2.2:0));m.scale.set(sc,sc,sc*(1+0.25*Math.sin(te*20+i)));
    });
    torMat.uniforms.uA.value=1; torMat.uniforms.uEr.value=-0.1+1.1*ss(TI,TI+0.45,te); torMat.uniforms.uGl.value=0.3*hitE(ia,8)*(ia>=0?1:0);
    spark.pose(ia,HIT,0.85);
    set(ripple,cl(ia/0.9),ia>=0?1-ss(TQ,TX,te):0); ripple.visible=ia>=0;
    ring.pose(ia,3.4,0,0.45,1);
    stain.scale.setScalar(Math.max(0.4+0.6*ss(TI,TI+0.3,te),0.001)); set(stain,-0.1+1.1*ss(TX,TE,te),ia>=0?1:0); stain.visible=ia>=0;
    const hit=hitE(ia,4.5); target.position.x=3.4+0.3*hit*(ia>=0?1:0)*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.3*hit*Math.cos(ia*14);
    if(te<TR){o.g.copy(EARP);o.gs=0.7;o.ga=0.25*gA;o.li=1.2*gA;}
    else if(te<TI){o.g.copy(rings[0].position);o.gs=1.1;o.ga=0.3;o.li=2.5;}
    else{o.g.copy(HIT);o.gs=1.5+3*Math.min(ia,0.4);o.ga=0.4*hitE(ia,9);o.li=6*hitE(ia,5);}
    o.ia=ia; o.c.copy(HIT); o.shake=0.9; o.dist=0.8; o.flash=0.6;
  };
}});

// =====================================================================
// 3 · INKLING (2 PA, daño + Gafe) — la tinta se acumula en la oreja, sale a chorro en arco y revienta en una nube negra
//     sobre la cabeza del rival; una estrella de crítico dorada queda manchada de tinta y se agrieta (sin críticos)
// =====================================================================
const STAR_FS=`uniform float uInk;uniform float uCr;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float rad=.22+.66*pow(abs(cos(an*2.)),7.);float d=r-rad;if(d>.04)discard;
 float out_=smoothstep(-.1,-.02,d);vec4 ns=styNoise(vUv*.9+.31);
 float ink=step(1.-uInk,ns.r*.8+.2*(1.-r));
 float crack=smoothstep(.06,.0,abs(p.y-p.x*.35-.08*sin(p.x*9.)))*uCr;
 vec3 g=styRampOf(${GOLD},.85-.5*r)*1.25;vec3 c=mix(g,${INK}*1.2+${INKV}*.4*ns.g,ink);
 c=mix(c,${GOLD}*.12,out_);c=mix(c,vec3(.02),crack);
 gl_FragColor=vec4(c,uA*(1.-smoothstep(0.,.04,d)));}`;
defs.push({key:"sty_qoInkling",name:"Inkling (estilizado)",dur:2.2,ti:0.7,tier:2,pal:"Sty Acuático · Tinta",stylized:true,
  zoneCaster:0.5,zoneTarget:1.2,
  phases:[["Tinta",0],["Chorro",0.4],["Estallido",0.7],["Gafe",0.95],["Disipación",1.7]],
build(a){
  const L=a.L,TJ=0.4,TI=0.7,TG=0.95,TX=1.7,TE=2.2;
  const HD=V3(3.35,1.75,0), P0=V3(-3.55,1.95,0.32), PC=V3(-0.2,2.85,0.2);
  const star=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),S.mat(STAR_FS,{uInk:{value:0},uCr:{value:0}},{mode:'matter'})); L.mesh.add(star);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.81,toCam:0.7});
  const stain=pool(L,2.4,3.5,0.1,"#120c2c",0.0,0.022);
  const streak=streakMesh(L.mesh,0.5);
  const K=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TG=${f(TG)};const float TX=${f(TX)};const vec3 HD=${v3(HD)};const vec3 P0=${v3(P0)};const vec3 PC=${v3(PC)};${QB}`;
  const INKP=S.MATTER_FS(C.drop,{relief:4,col:INK,bias:.05});
  // tinta que se acumula y gira en la oreja
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*.25;float age=clamp((uT-s)/(TJ-s),0.,1.);float an=aSeed.y*6.2832+uT*7.;float rad=mix(.55,.1,age);
   vec3 p=P0+vec3(cos(an)*rad,sin(an)*rad*.6,sin(an)*rad*.5);vR=an;vK=0.;vA=(uT>s&&uT<TJ+.05)?1.:0.;put(p,.16+.08*aSeed.z);}`,INKP);
  // chorro: gotas de tinta en arco hasta la cabeza
  S.pts(L.part,46,VV+K+`void main(){float s=TJ+aSeed.x*(TI-TJ)*.95;float lf=.18;float age=(uT-s)/lf;float k=clamp((uT-s)/(TI-TJ)*1.6,0.,1.);
   vec3 p=qb(P0,PC,HD,k)+rnd()*.08*(1.-k);vR=0.;vK=smoothstep(.7,1.,k);
   vA=(uT>s&&k<1.)?1.:0.;put(p,(.34+.12*aSeed.z)*(1.-.35*k));}`,INKP);
  // estallido: nube de tinta sobre la cabeza
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.1;float lf=.9+aSeed.y*.4;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.25,0.));vec3 p=HD+d*(.25+.75*(1.-exp(-t*5.)))+vec3(0.,t*.15,0.);
   vR=aSeed.z*6.28+t;vK=smoothstep(.35,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.5+.22*aSeed.w)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:5,bias:.02,col:INKV}));
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.05;float lf=.55+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+aSeed.w),1.4+1.6*aSeed.y,sin(an)*(1.2+aSeed.w));
   vec3 p=HD+v*t+vec3(0.,-7.*t*t,0.);vR=3.14159;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;put(p,.17+.08*aSeed.w);}`,INKP);
  // velo de tinta que gira alrededor de la cabeza (Gafe)
  S.pts(L.part,20,VV+K+`void main(){float on=smoothstep(TG-.1,TG+.1,uT)*(1.-smoothstep(TX,TX+.4,uT));float an=aSeed.x*6.2832+uT*(2.2+aSeed.y);
   vec3 p=HD+vec3(cos(an)*(.62+.1*aSeed.z),-.35+.35*sin(an*2.+aSeed.w*6.),sin(an)*(.62+.1*aSeed.z));
   vR=an;vK=1.-on;vA=on;put(p,.28+.1*aSeed.w);}`,S.MATTER_FS(C.puff,{relief:4,col:INKV}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.08*ss(0,TJ,te)-0.15*ss(TJ,TJ+0.06,te);
    // estela del chorro
    if(te>=TJ&&te<TI+0.05){const k=cl((te-TJ)/(TI-TJ)), kb=cl(k-0.35);
      poseStreak(streak,qb(P0,PC,HD,kb,tmp),qb(P0,PC,HD,k,tmp3),true);}
    else streak.visible=false;
    spark.pose(ia,HD,0.8);
    // estrella de crítico: aparece, la tinta la cubre, se agrieta y cae
    const sOn=ss(TG-0.15,TG,te)*(1-ss(TX,TE,te));
    star.visible=sOn>0.001; star.position.set(3.4,2.75-0.45*ss(TX-0.2,TE,te),0); towardCam(star.position,star.position,0.4);
    billboard(star,0.15*Math.sin(te*3)-0.4*ss(TX-0.2,TE,te));
    star.scale.setScalar(Math.max(0.6+0.4*out3((te-TG+0.15)/0.2),0.001));
    star.material.uniforms.uA.value=sOn; star.material.uniforms.uInk.value=0.15+0.6*ss(TG,TG+0.5,te);
    star.material.uniforms.uCr.value=ss(TG+0.45,TG+0.6,te);
    stain.scale.setScalar(Math.max(0.4+0.6*ss(TI,TI+0.35,te),0.001)); set(stain,-0.1+1.1*ss(TX,TE,te),ia>=0?1:0); stain.visible=ia>=0;
    const hit=hitE(ia,5); target.position.x=3.4+0.2*hit*(ia>=0?1:0); target.rotation.z=-0.25*hit*Math.cos(ia*13);
    o.em=0.25*ss(TG,TG+0.2,te)*(1-ss(TX,TE,te)); o.emc.setRGB(0.25,0.15,0.6);
    if(te<TJ){o.g.copy(P0);o.gs=0.5;o.ga=0.1;o.li=0.6;}
    else if(te<TI){o.g.copy(PC);o.gs=0.8;o.ga=0.1;o.li=1.2;}
    else{o.g.copy(HD);o.gs=1.2+2*Math.min(ia,0.4);o.ga=0.22*hitE(ia,9);o.li=3*hitE(ia,5);}
    o.ia=ia; o.c.copy(HD); o.shake=0.8; o.dist=0.7; o.flash=0.5;
  };
}});

// =====================================================================
// 4 · NIMO (1 PA, sobre sí: +1 PA y cura 25) — un pez espíritu de agua (silueta turquesa afilada con aletas de brillo coral) salta de un aro de
//     agua junto a la oreja, cruza sobre la cabeza y suelta burbujas de oxígeno que caen sobre el Axie; un rombo
//     dorado entra en el pecho (+PA) y suben cruces verdes (cura)
// =====================================================================
const FISH_FS=`uniform float uW;
void main(){vec2 p=(vUv-.5)*vec2(2.,1.);
 vec2 b=p-vec2(.18,0.);float tap=mix(.34,.12,smoothstep(.55,-.45,b.x));vec2 e=vec2(b.x/.62,b.y/tap);float body=length(e)-1.;
 float tx=-p.x-.3;float ty=p.y-sin(uW)*.16*max(tx,0.);
 float tail=max(max(-tx,tx-.42),abs(ty)-(.05+tx*.62));
 float fin=length((p-vec2(.0,.26+.03*sin(uW*.7)))/vec2(.26,.09))-1.;
 float pec=length((p-vec2(.2,-.2))/vec2(.14,.06))-1.;
 float d=min(min(body*.3,tail),min(fin*.08,pec*.06));if(d>.012)discard;
 float rr=clamp(dot(e,e),0.,1.);vec3 n=normalize(vec3(e.x*.8,e.y*.9,sqrt(1.-rr*.85)));
 float l=styLight(n,stySunV());
 float finM=clamp(step(.0,body*.3-.001)*(1.-step(.012,min(min(tail,fin*.08),pec*.06))),0.,1.);
 vec3 bodyC=styRampOf(mix(${WATER},${WATERL},smoothstep(-.3,.3,p.y)),.3+.55*l)*styTint(l);
 float tipG=finM*(.5+.5*smoothstep(.0,.5,tx));
 vec3 finC=mix(bodyC,${CORAL}*1.15,.25+.6*tipG);
 vec3 c=mix(bodyC,finC,finM);
 float sc=smoothstep(.62,.7,styNoise(vec2(b.x*1.4,b.y*2.)+.2).g)*(1.-finM);c+=${WATERL}*sc*.35;
 float outline=smoothstep(-.03,-.004,d);c=mix(c,${DEEP}*.6,outline*.8);
 gl_FragColor=vec4(c,uA*(1.-finM*(.45-.35*tipG)));}`;
const HOOP_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRampOf(${WATERL},.55+.4*s.g)*1.1,s.r*er*uA);}`;
defs.push({key:"sty_qoNimo",name:"Nimo (estilizado)",dur:1.3,ti:0.42,tier:1,pal:"Sty Acuático · Nimo",stylized:true,
  phases:[["Salto",0],["Cima",0.3],["Oxígeno",0.42],["Recarga",0.68],["Fin",1.05]],
build(a){
  const L=a.L,TT=0.3,TI=0.42,TR=0.68,TF=1.05,TE=1.3;
  const fish=new THREE.Mesh(new THREE.PlaneGeometry(1.7,0.85),S.mat(FISH_FS,{uW:{value:0}},{mode:'matter'})); L.mesh.add(fish);
  const hoopA=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(HOOP_FS,{},{mode:'matter'})); L.mesh.add(hoopA);
  const hoopB=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),S.mat(HOOP_FS,{},{mode:'matter'})); L.mesh.add(hoopB);
  const ring=S.groundRing(L.decal,2.4);
  const PA0=V3(-3.25,1.7,0.55), PTOP=V3(-3.7,3.0,0.15), PB=V3(-4.2,1.55,-0.4), PCTL=V3(-3.55,3.6,0.2);
  const K=`const float TT=${f(TT)};const float TI=${f(TI)};const float TR=${f(TR)};const float TF=${f(TF)};const vec3 PA0=${v3(PA0)};const vec3 PTOP=${v3(PTOP)};const vec3 PB=${v3(PB)};${QB}`;
  splash(L,12,PA0,0.02,{up:1.6,out:1.1,life:.4,size:.14});
  S.pts(L.part,30,VV+K+`void main(){float s=aSeed.x*TR;float lf=.22+aSeed.y*.1;float age=(uT-s)/lf;
   float k=clamp(s/TR,0.,1.);vec3 p=qb(PA0,vec3(-3.55,3.6,.2),PB,k)+rnd()*.06;vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.18+.08*aSeed.z)*(1.-.5*age));}`,S.ENERGY_FS(C.slash,{gain:1.1}),{mode:'energy'});
  splash(L,10,PB,TR+0.12,{up:1.4,out:1.,life:.35,size:.13});
  // burbujas de oxígeno que caen desde la cima sobre el Axie
  S.pts(L.part,18,VV+K+`void main(){float s=TT+aSeed.x*.25;float lf=.45+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 p=PTOP+vec3((aSeed.z-.5)*.7,-t*2.6+.1,(aSeed.w-.5)*.6)*vec3(1.-age*.6,1.,1.-age*.6);
   vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,(.14+.08*aSeed.z)*(1.-.3*age));}`,BUB_FS(WATERL));
  // cura: cruces verdes que suben
  S.pts(L.part,8,VV+K+`void main(){float s=TI+.05+aSeed.x*.35;float lf=.55;float age=(uT-s)/lf;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(CX)}+cos(an)*.55,.5+age*1.4,sin(an)*.55);vR=0.;vK=0.;vA=(age>0.&&age<1.)?sin(age*3.14):0.;put(p,.26+.08*aSeed.z);}`,CROSS_FS(HEAL),{mode:'energy'});
  // +1 PA: rombo dorado que cae al pecho
  S.pts(L.part,1,VV+K+`void main(){float k=clamp((uT-TI)/(TR-TI),0.,1.);vec3 p=mix(vec3(${f(CX)}+.1,2.6,.1),vec3(${f(CX)},1.05,.1),k*k);
   vR=0.;vK=0.;vA=(uT>TI&&uT<TR+.06)?1.:0.;put(p,.95*(1.-.3*k));}`,GEM_FS,{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float s=TR+aSeed.x*.05;float lf=.4;float age=(uT-s)/lf;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(CX)},1.05,.1)+vec3(cos(an),.4*aSeed.z,sin(an))*(.2+.7*age);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    // pez: salta del aro A, cruza sobre la cabeza y se zambulle en el aro B
    const k=cl(te/TR), kk=k;
    const fishOn=te<TR+0.1;
    qb(PA0,PCTL,PB,kk,fish.position); fish.visible=fishOn&&te>0.02;
    const k2=cl(kk+0.02); qb(PA0,PCTL,PB,k2,tmp);
    billboard(fish,0); // orienta el eje x del pez a lo largo de la tangente en pantalla
    tmp2.copy(tmp).sub(fish.position).applyQuaternion(qInv.copy(fish.quaternion).invert());
    const flip=tmp2.x<0, fa=Math.atan2(tmp2.y,Math.abs(tmp2.x))*0.6;
    billboard(fish,flip?-fa:fa);
    fish.scale.setScalar(Math.max(0.6+0.55*ss(0,0.1,te)-0.5*ss(TR-0.05,TR+0.1,te),0.001)); if(flip)fish.scale.x*=-1;
    fish.material.uniforms.uA.value=1-ss(TR+0.02,TR+0.1,te); fish.material.uniforms.uW.value=te*26;
    for(const [h,p,t0] of [[hoopA,PA0,0],[hoopB,PB,TR-0.1]]){const q=cl((te-t0)/0.45);h.visible=te>=t0&&q<1;
      h.position.copy(p);billboard(h,0);h.scale.setScalar(Math.max(0.6+0.6*out3(q),0.001));set(h,0.05+0.9*q,1);}
    ring.pose(ia,CX,0,0.5,0.9);
    const glow=ss(TI,TI+0.12,te)*(1-ss(TF,TE,te));
    caster.scale.set(1+0.05*hitE(ia,7)*(ia>=0?1:0),1-0.05*hitE(ia,7)*(ia>=0?1:0),1);
    o.em=0.35*glow; o.emc.setRGB(1,0.62,0.3);
    if(te<TI){o.g.copy(fish.position);o.gs=0.7;o.ga=0.15;o.li=1;}
    else{o.g.set(CX,1.1,0);o.gs=1.2;o.ga=0.25*hitE(ia,5)+0.05;o.li=2.5*hitE(ia,4)+0.4*glow;}
    o.ia=ia; o.c.set(CX,1.1,0); o.shake=0.15; o.dist=0.2; o.flash=0.3;
  };
}});

// =====================================================================
// 5 · TINY FAN (1 PA, sobre sí: +1 PM y Potenciado) — junto a la oreja aparece una hélice submarina de tres aspas que
//     arranca a girar y dispara una corriente de agua en espiral que baja alrededor del cuerpo; remolino en los pies (+PM)
//     y flechas rojas que suben (Potenciado)
// =====================================================================
const BLADE_FS=`uniform float uGl;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec3 col=mix(uC2,uC1,smoothstep(-.1,.9,vUv.y));vec3 c=styRampOf(col,.28+.55*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c=mix(c,uC2*.25,smoothstep(.72,.9,fr));c+=uC1*uGl;gl_FragColor=vec4(c,1.);}`;
const SWIRL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float arm=fract(an/6.2832*3.-r*1.1+uT*1.6);float m=smoothstep(.22,.0,abs(arm-.5)-.12)*smoothstep(1.,.55,r)*smoothstep(.12,.3,r);
 float n=styNoise(vUv*.7+uT*.1).b;float er=styErode(n*.5+m*.5,uP,.15);if(m*er<.02)discard;
 gl_FragColor=vec4(styRamp(.5+.4*m)*1.15,m*er*uA*.9);}`;
defs.push({key:"sty_qoTinyFan",name:"Tiny Fan (estilizado)",dur:1.25,ti:0.4,tier:1,pal:"Sty Acuático · Hélice",stylized:true,
  phases:[["Hélice",0],["Corriente",0.2],["Impulso",0.4],["Brisa",0.7],["Fin",1.0]],
build(a){
  const L=a.L,TC_=0.2,TI=0.4,TB=0.7,TF=1.0,TE=1.25;
  const fan=new THREE.Group(); L.mesh.add(fan);
  const bMat=S.mat(BLADE_FS,{uGl:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const bg=new THREE.SphereGeometry(0.2,16,10); bg.scale(1,0.32,0.07); bg.translate(0.2,0,0);
  for(let i=0;i<3;i++){const m=new THREE.Mesh(bg,bMat);m.rotation.z=i*Math.PI*2/3;m.rotation.x=0.35;fan.add(m);}
  fan.add(new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8),bMat));
  const swirl=groundPlane(3.0,CX,0.03,S.mat(SWIRL_FS,{},{mode:'energy'})); L.decal.add(swirl);
  const ring=S.groundRing(L.decal,2.4);
  const FP=V3(-3.35,2.15,0.55), FDIR=V3(0.3,-1,0);
  const K=`const float TC_=${f(TC_)};const float TI=${f(TI)};const float TB=${f(TB)};const float TF=${f(TF)};const vec3 FP=${v3(FP)};`;
  // corriente: gotas en hélice que bajan desde la hélice alrededor del cuerpo hasta los pies
  S.pts(L.part,54,VV+K+`void main(){float s=TC_+aSeed.x*(TB-TC_);float lf=.32+aSeed.y*.1;float age=(uT-s)/lf;
   float an=age*7.+aSeed.z*.8;float rad=mix(.25,.62,age);float y=mix(FP.y,.12,age);
   vec3 c=mix(FP,vec3(${f(CX)},0.,0.),smoothstep(0.,.35,age));vec3 p=vec3(c.x+cos(an)*rad,y,sin(an)*rad+c.z*(1.-age));
   vR=3.14159;vK=smoothstep(.75,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:WATER}));
  // burbujas de la brisa
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.4;float lf=.5;float age=(uT-s)/lf;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(CX)}+cos(an)*.6,.2+age*1.3,sin(an)*.6);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.1+.07*aSeed.z);}`,BUB_FS(WATERL));
  // Potenciado: flechas rojas que suben
  S.pts(L.part,8,VV+K+`void main(){float s=TI+aSeed.x*.4;float lf=.45;float age=(uT-s)/lf;float an=aSeed.y*6.2832+1.;
   vec3 p=vec3(${f(CX)}+cos(an)*.5,.4+age*1.3,sin(an)*.5);vR=0.;vK=0.;vA=(age>0.&&age<1.)?sin(age*3.14):0.;put(p,.3+.08*aSeed.z);}`,CHEVUP_FS(RED),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    const app=out3(te/0.15), go=1-ss(TF-0.1,TE,te);
    fan.visible=te>0.01&&go>0.001; fan.position.copy(FP); fan.position.y+=0.03*Math.sin(te*12);
    fan.lookAt(tmp.copy(FP).add(FDIR)); fan.rotateZ(te*te*60+te*6);
    fan.scale.setScalar(Math.max(app*go*2.3,0.001));
    bMat.uniforms.uGl.value=0.25*ss(0.1,TI,te);
    set(swirl,-0.1+1.1*ss(TB,TE,te),ss(TI-0.1,TI+0.05,te)); swirl.visible=te>TI-0.1; swirl.rotation.y=-te*2;
    swirl.scale.setScalar(Math.max(0.6+0.4*ss(TI-0.1,TI+0.2,te),0.001));
    ring.pose(ia,CX,0,0.45,1);
    o.em=0.25*ss(TI,TI+0.1,te)*(1-ss(TB,TE,te)); o.emc.setRGB(1,0.4,0.3);
    if(te<TI){o.g.copy(FP);o.gs=0.6;o.ga=0.15*app;o.li=1;}
    else{o.g.set(CX,0.4,0);o.gs=1.4;o.ga=0.25*hitE(ia,5);o.li=2.5*hitE(ia,4)+0.3;}
    o.ia=ia; o.c.set(CX,0.6,0); o.shake=0.1; o.dist=0.2; o.flash=0.3;
  };
}});

// =====================================================================
// 6 · LITTLE CRAB (2 PA, daño) — bajo el rival se abre un charco turquesa; dos pinzas de cangrejo (quitina azul marino
//     violeta con puntas coral, dedos curvos y redondeados, brillo y contorno oscuro) emergen, se abren y se cierran en
//     tijera sobre el pecho; esquirlas de quitina, burbujas afiladas y las pinzas se hunden en el charco
// =====================================================================
const CLAW_FS=`uniform float uEr;uniform float uGl;uniform float uTip;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float u=vUv.x;vec4 ns=styNoise(vec2(u*3.,vUv.y*.5)+.2);
 if(uEr>0.&&ns.r*.7+.3*ns.a<uEr)discard;
 float seg=smoothstep(.04,0.,abs(fract(u*2.5+.15)-.5)-.46)*uTip;
 vec3 col=mix(${NAVY},${CORAL},smoothstep(.62,.92,u)*uTip);col=mix(col,col*.35,seg*.8);
 vec3 c=styRampOf(col,.28+.58*l+ns.g*.08)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c=mix(c,col*.08,smoothstep(.8,.93,fr));
 float sh=smoothstep(.9,.95,dot(reflect(-stySunV(),n),normalize(vV)));c+=vec3(.75,.8,1.)*sh*.55;
 c+=${CORAL}*uGl*smoothstep(.5,1.,u)*uTip;gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_qoLittleCrab",name:"Little Crab (estilizado)",dur:2.2,ti:0.95,tier:2,pal:"Sty Acuático · Cangrejo",stylized:true,
  zoneCaster:0.5,zoneTarget:1.3,
  phases:[["Charco",0],["Pinzas",0.4],["Apertura",0.7],["Tijera",0.95],["Burbujas",1.1],["Hundimiento",1.55]],
build(a){
  const L=a.L,TP=0.4,TO=0.7,TI=0.95,TBU=1.1,TS=1.55,TE=2.2,X=3.4;
  const clawMat=S.mat(CLAW_FS,{uEr:{value:0},uGl:{value:0},uTip:{value:1}},{mode:'solid',side:THREE.DoubleSide});
  const shellM=S.mat(CLAW_FS,{uEr:clawMat.uniforms.uEr,uGl:clawMat.uniforms.uGl,uTip:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const finger=(len,bend,r0,r1,teeth)=>{const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(V3(len*t,bend*Math.sin(Math.PI*t*0.9)*t,0));}
    const g=taperTube(new THREE.CatmullRomCurve3(pts),24,10,r0,r1);return g;};
  const fixedG=finger(0.74,0.3,0.17,0.035), moveG=finger(0.66,-0.28,0.14,0.03);
  const toothG=new THREE.ConeGeometry(0.035,0.09,6).rotateZ(Math.PI);
  const mkClaw=(side)=>{const root=new THREE.Group();L.mesh.add(root);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.17,0.9,14,4).translate(0,-0.5,0),shellM);root.add(arm);
    const palm=new THREE.Mesh(new THREE.SphereGeometry(0.22,20,14),shellM);palm.scale.set(1.45,1.2,1.1);palm.position.x=0.02;root.add(palm);
    const fx_=new THREE.Mesh(fixedG,clawMat);fx_.position.set(0.12,0.04,0);root.add(fx_);
    const hinge=new THREE.Group();hinge.position.set(0.14,0.1,0);root.add(hinge);
    const mv=new THREE.Mesh(moveG,clawMat);hinge.add(mv);
    for(let i=1;i<=3;i++){const t=new THREE.Mesh(toothG,clawMat);t.position.set(0.12+0.18*i,0.06+0.05*Math.sin(i),0);t.scale.setScalar(1);fx_.add(t);}
    root.userData={side,hinge};return root;};
  const claws=[mkClaw(1),mkClaw(-1)];
  const pl=pool(L,2.6,X,0,"#0f5f86",1.0,0.021);
  const ripple=groundPlane(3.0,X,0.03,S.mat(RIPPLE_FS,{},{mode:'energy'})); L.decal.add(ripple);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.44,toCam:0.7});
  const ring=S.groundRing(L.decal,2.8);
  const HIT=V3(3.25,1.15,0.2);
  const K=`const float TP=${f(TP)};const float TI=${f(TI)};const float TBU=${f(TBU)};const float TS=${f(TS)};const vec3 HIT=${v3(HIT)};`;
  // al emerger: agua que cae de las pinzas
  splash(L,14,V3(X,0.1,0.75),TP,{up:1.8,out:.9,life:.45,size:.15});
  splash(L,14,V3(X,0.1,-0.75),TP+0.04,{up:1.8,out:.9,life:.45,size:.15});
  // tijera: esquirlas de quitina y burbujas afiladas
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.04;float lf=.55+aSeed.y*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.5,0.))*(2.+2.*aSeed.z);vec3 p=HIT+v*t+vec3(0.,-7.*t*t,0.);
   vR=aSeed.w*6.28+t*9.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:NAVY,bias:.1}));
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.1;float lf=.5+aSeed.y*.3;float age=(uT-s)/lf;float t=max(uT-s,0.);
   vec3 v=normalize(rnd())*(1.4+1.4*aSeed.z);vec3 p=HIT+v*(1.-exp(-t*4.))*.7+vec3(0.,t*.8,0.);
   vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.-age*.6:0.;put(p,.1+.08*aSeed.w);}`,BUB_FS(WATERL));
  // burbujas que suben del charco
  S.pts(L.part,18,VV+K+`void main(){float s=TBU+aSeed.x*.5;float lf=.6;float age=(uT-s)/lf;float an=aSeed.y*6.2832;float rad=.2+.7*aSeed.z;
   vec3 p=vec3(${f(X)}+cos(an)*rad,.05+age*1.,sin(an)*rad);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.09+.07*aSeed.w);}`,BUB_FS(WATERL));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.06*ss(0,TP,te)-0.1*ss(TO,TI,te);
    // charco
    pl.scale.setScalar(Math.max(0.25+0.75*out3(te/TP)-0.5*ss(TS+0.2,TE,te),0.001));
    set(pl,-0.1+1.1*ss(TS+0.3,TE,te),ss(0,0.1,te)); pl.visible=true;
    set(ripple,cl(te/0.9),1-ss(0.7,0.95,te)); ripple.visible=te<0.95;
    // pinzas: emergen (TP→TO), se abren (TO→TI), se cierran en tijera (TI), tiemblan, se hunden (TS→)
    const rise=out3((te-TP)/(TO-TP))-ss(TS,TE-0.15,te);
    const open=ss(TO,TI-0.05,te)*(1-ss(TI-0.05,TI,te));
    claws.forEach((c,i)=>{const s=c.userData.side;
      c.visible=rise>0.001;
      c.position.set(X+0.05,-1.2+(1.2+1.05)*rise,0.85*s);
      c.rotation.set(-0.35*s,1.05*s*(1-0.3*ss(TO,TI,te)),0.35+0.15*open-0.1*ss(TI,TI+0.05,te));
      const shake=te>TI&&te<TS?0.03*Math.sin(te*60+i):0;c.position.y+=shake;
      c.userData.hinge.rotation.z=-0.15-0.95*open;
      c.scale.setScalar(1.45);
    });
    clawMat.uniforms.uEr.value=-0.1+1.1*ss(TS+0.15,TE-0.1,te); clawMat.uniforms.uGl.value=0.35*hitE(ia,7)*(ia>=0?1:0);
    spark.pose(ia,HIT,0.9);
    ring.pose(ia,X,0,0.45,1);
    const hit=hitE(ia,5); target.position.x=3.4+0.15*hit*(ia>=0?1:0); target.scale.set(1+0.08*hit*(ia>=0?1:0),1-0.1*hit*(ia>=0?1:0),1);
    if(te<TP){o.g.set(X,0.2,0);o.gs=0.8;o.ga=0.12;o.li=0.8;}
    else if(te<TI){o.g.set(X,1.0,0);o.gs=1;o.ga=0.15;o.li=1.4;}
    else{o.g.copy(HIT);o.gs=1.4+2.5*Math.min(ia,0.4);o.ga=0.3*hitE(ia,9);o.li=5*hitE(ia,5);}
    o.ia=ia; o.c.copy(HIT); o.shake=1; o.dist=0.9; o.flash=0.6;
  };
}});

// =====================================================================
// 7 · SEASLUG (3 PA, cuerpo a cuerpo: daño, limpia 2 males e inmune) — un nudibranquio (cuerpo violeta-azul con
//     ceratas naranjas, sin cara) trepa en espiral por el Axie y se funde en una capa nacarada; dos humos oscuros se
//     desprenden (limpieza); oleada de mucosa por el suelo hasta el rival, estallido de baba, fractura de baldosas;
//     la capa queda reluciendo (inmunidad)
// =====================================================================
const SLUG_FS=`uniform float uRev;uniform float uEr;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float u=vUv.x;if(u>uRev)discard;
 vec4 ns=styNoise(vec2(u*4.,vUv.y)+.4);if(uEr>0.&&ns.r*.7+.3*ns.a<uEr)discard;
 float l=styLight(n,stySunV());
 float stripe=smoothstep(.04,.0,abs(fract(vUv.y*2.)-.5)-.4);
 vec3 col=mix(uC2,uC1,.25+.35*ns.g);col=mix(col,uC1*1.1,stripe*.5);
 vec3 c=styRampOf(col,.25+.55*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uC1*.3*smoothstep(.6,.8,fr);
 c*=1.+.6*smoothstep(uRev-.06,uRev,u);gl_FragColor=vec4(c,1.);}`;
const TRAIL_FS=`uniform float uRev;void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uRev)discard;
 float n=styNoise(vec2(u*3.,vUv.y*.6)).r;float m=smoothstep(.75+.2*n,.3,v);float er=styErode(n*.6+.4*m,uP,.15);if(m*er<.02)discard;
 float sp=smoothstep(.72,.8,styNoise(vec2(u*6.,vUv.y*1.5)+uT*.05).g);
 gl_FragColor=vec4(styRampOf(mix(${NACRE},uC1,.5),.45+.3*n)+vec3(.7,.8,1.)*sp*.5,m*er*uA*.75);}`;
const CRACK_FS=`uniform float uEr;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float k=fract(an/6.2832*8.+styNoise(vUv*.6).r*.7);float line=smoothstep(.1,.0,abs(k-.5)*(1.+2.5*r))*step(r,.95*uP+.05)*smoothstep(1.,.25,r);
 float n=styNoise(vUv*.9+.2).g;float pit=smoothstep(.34,.14,r+(n-.5)*.2)*uP;
 float m=max(line,pit*.85);if(m<.02)discard;float er=styErode(n*.6+m*.4,uEr,.12);
 gl_FragColor=vec4(mix(vec3(.01,.008,.012),${DEEP}*.5,pit*n),m*er*uA*.9);}`;
defs.push({key:"sty_qoSeaslug",name:"Seaslug (estilizado)",dur:3.3,ti:1.35,tier:3,pal:"Sty Acuático · Babosa",stylized:true,
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Babosa",0],["Adhesión",0.55],["Limpieza",0.75],["Embestida",1.05],["Impacto",1.35],["Regreso",1.6],["Mucosa",2.0],["Fin",2.85]],
build(a){
  const L=a.L,TA=0.55,TCL=0.75,TD=1.05,TI=1.35,TRE=1.6,TM=2.0,TX=2.85,TE=3.3,X=3.4;
  // cuerpo: tubo que se afina, en espiral alrededor del Axie, con ceratas (conos) a lo largo
  const hel=[];for(let i=0;i<=40;i++){const t=i/40,an=t*Math.PI*2*1.6;hel.push(V3(Math.cos(an)*0.62,0.1+t*1.5,Math.sin(an)*0.62));}
  const curve=new THREE.CatmullRomCurve3(hel);
  const slugMat=S.mat(SLUG_FS,{uRev:{value:0},uEr:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const slug=new THREE.Group(); L.mesh.add(slug); slug.position.set(CX,0,0);
  slug.add(new THREE.Mesh(taperTube(curve,80,12,0.06,0.16),slugMat));
  const ceraG=new THREE.ConeGeometry(0.07,0.3,8).translate(0,0.15,0);
  const ceraMat=S.mat(`uniform float uEr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
   vec3 col=mix(uC2,${CORAL},smoothstep(-.2,.9,vP.y/.2));gl_FragColor=vec4(styRampOf(col,.3+.55*l)*styTint(l),1.);}`,{uEr:{value:0}},{mode:'solid'});
  const ceras=[];for(let i=0;i<14;i++){const t=0.25+0.7*i/14;const c=new THREE.Mesh(ceraG,ceraMat);curve.getPointAt(t,c.position);
    c.position.y+=0.1;c.lookAt(c.position.clone().add(V3(c.position.x,2,c.position.z)));c.rotateX(Math.PI/2);c.userData.t=t;slug.add(c);ceras.push(c);}
  // capa de mucosa nacarada sobre el Axie
  const coat=new THREE.Mesh(new THREE.SphereGeometry(0.5,28,20),shellMat("#6a3cf0")); L.mesh.add(coat);
  // oleada de mucosa por el suelo (franja a toda longitud, revelada con uRev)
  const LEN=X-(CX+0.4);
  const trailM=new THREE.Mesh(new THREE.PlaneGeometry(LEN,1.1).rotateX(-Math.PI/2),S.mat(TRAIL_FS,{uRev:{value:0}},{mode:'matter'}));
  trailM.position.set(CX+0.4+LEN/2,0.022,0); L.decal.add(trailM);
  const crack=groundPlane(4.2,X,0.026,S.mat(CRACK_FS,{uEr:{value:0}},{mode:'matter'})); L.decal.add(crack);
  const ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.4);
  const spark=S.hitSpark(L.mesh,1.25,{seed:0.29,toCam:0.6});
  const HIT=V3(3.12,1.1,0);
  const K=`const float TA=${f(TA)};const float TCL=${f(TCL)};const float TD=${f(TD)};const float TI=${f(TI)};const float TM=${f(TM)};const float TX=${f(TX)};const vec3 HIT=${v3(HIT)};`;
  // limpieza: dos humos oscuros que se desprenden y se van
  S.pts(L.part,20,VV+K+`void main(){float id=floor(aSeed.x*1.999);float s=TCL+id*.08+aSeed.y*.06;float lf=.6+aSeed.z*.2;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float an=id*3.14+.6;vec3 p=vec3(${f(CX)},1.1,0.)+vec3(cos(an),.6,sin(an))*(.4+t*1.4)+rnd()*.18*(.5+age);
   vR=aSeed.w*6.28+t*2.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.36+.14*aSeed.w)*(.8+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:lin("#2a1f3a")}));
  // embestida: gotas de mucosa en la cresta de la oleada
  S.pts(L.part,30,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float lf=.35+aSeed.y*.15;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float k=(s-TD)/(TI-TD);vec3 c=vec3(mix(${f(CX+0.4)},${f(X-0.3)},k),.15,(aSeed.z-.5)*.8);
   vec3 p=c+vec3(.4*t,1.4*t-4.*t*t+.2,(aSeed.z-.5)*.5*t);vR=3.14159;vK=smoothstep(.5,1.,age);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;put(p,.15+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:NACRE}));
  // impacto: estallido de baba nacarada
  splash(L,30,HIT,TI,{up:3,out:2.4,life:.65,size:.24,col:NACRE});
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.06;float lf=.7+aSeed.y*.3;float age=(uT-s)/lf;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=HIT+vec3(cos(an)*.5*(1.+t*2.)+.2,sin(an)*.5*(1.+t)+t*.2,(aSeed.w-.5)*1.3*(.3+t));
   vR=an;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.42+.2*aSeed.w)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:-.05}));
  // mucosa: destellos nacarados sobre la capa (inmunidad)
  S.pts(L.part,16,VV+K+`void main(){float on=smoothstep(TM-.1,TM+.1,uT)*(1.-smoothstep(TX,TX+.4,uT));float lf=.5;float k=(uT-TM)/lf+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 d=normalize(r*2.-1.+vec3(0.,.3,0.));vec3 p=vec3(${f(CX)},.95,0.)+d*vec3(.7,.95,.7);vR=0.;vK=age;
   vA=on*sin(age*3.14);put(p,.16+.08*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    // la babosa trepa (revela el tubo), se aplana y se funde en la capa
    const rev=ss(0,TA,te), melt=ss(TA,TCL+0.1,te);
    slug.visible=te<TCL+0.15; slugMat.uniforms.uRev.value=rev; slugMat.uniforms.uEr.value=-0.1+1.1*melt;
    slug.rotation.y=-te*1.2; slug.scale.set(1+0.1*melt,1,1+0.1*melt);
    for(const c of ceras){const vis=rev>c.userData.t&&melt<0.7;c.visible=vis;c.scale.setScalar(vis?1-melt:0.001);}
    // embestida: el Axie se lanza medio camino (el puente lo limita a media casilla) y vuelve
    const dash=ss(TD,TI,te)*(1-ss(TRE,TM,te));
    caster.position.x=CX+0.7*dash; caster.rotation.z=0.12*ss(TA,TD,te)-0.3*ss(TD,TD+0.1,te)+0.2*ss(TI,TI+0.25,te)*(1-ss(TRE,TM,te));
    const sq=hitE(ia,8)*(ia>=0?1:0); caster.scale.set(1+0.12*sq,1-0.12*sq,1+0.12*sq);
    // capa nacarada (sigue al Axie)
    const cA=ss(TA,TCL+0.15,te)*(1-ss(TX,TE,te));
    coat.visible=cA>0.001; coat.position.set(caster.position.x,0.95,0); coat.scale.set(1.75,2.05,1.75);
    coat.material.uniforms.uA.value=cA*(0.55+0.2*Math.sin(te*5)); coat.material.uniforms.uEr.value=-0.1+1.1*ss(TX,TE,te);
    coat.material.uniforms.uGl.value=0.25*hitE(te-TCL,5)*(te>=TCL?1:0)+0.15*ss(TM,TM+0.2,te);
    // oleada por el suelo
    trailM.material.uniforms.uRev.value=ss(TD,TI,te); set(trailM,-0.1+1.1*ss(TRE+0.2,TX,te),te>=TD?1:0); trailM.visible=te>=TD;
    // impacto pesado
    spark.pose(ia,HIT,1.05);
    crack.material.uniforms.uP.value=1-Math.pow(1-cl(ia/0.5),2); crack.material.uniforms.uEr.value=-0.1+1.15*ss(TI+1.1,TI+1.9,te);
    crack.material.uniforms.uA.value=ia>=0?1:0; crack.visible=ia>=0;
    ring.pose(ia,X,0,0.5,1); ring2.pose(ia-0.12,X,0,0.45,0.75);
    const hit=hitE(ia,3.2); target.position.x=3.4+hit*0.55*(ia>=0?1:0)*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.4*Math.cos(ia*12);
    o.em=0.3*cA; o.emc.copy(U.uC1.value);
    if(te<TA){o.g.set(CX,0.4+1.3*rev,0);o.gs=1;o.ga=0.15;o.li=1.4;}
    else if(te<TI){o.g.set(caster.position.x,1.0,0);o.gs=1.5;o.ga=0.25;o.li=2.5;}
    else if(te<TRE){o.g.copy(HIT);o.gs=2+5*Math.min(ia,0.4);o.ga=0.45*hitE(ia,8);o.li=8*hitE(ia,4.5);}
    else{o.g.set(CX,1.1,0);o.gs=2;o.ga=0.15*cA;o.li=2*cA;}
    o.ia=ia; o.c.copy(HIT); o.shake=1.7; o.dist=1.3; o.flash=0.8;
  };
}});

VFX.module("Estilizado · Acuático · Orejas",defs);
})();

// =====================================================================
// ESTILIZADO · ACUÁTICO · CUERNOS (Hito 101) — las 6 cartas de cuerno Acuático rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_qcAnemone, sty_qcBabylonia…); el puente las usa con el estilo nuevo encendido.
// Mismos dur / ti / fases que mod-acuatico-cuernos.js. El concepto sigue la carta (PartCards.js):
//   Anemone daño + cura al lanzador · Babylonia daño + Débil · Clamshell daño + potenciado al lanzador ·
//   Shoal Star daño (ejecuta) · Teal Shell escudo a un aliado · Oranda daño pesado + quita 2 mejoras.
// Identidad: agua turquesa saturada (no espuma blanca), criaturas en silueta sin caras, mordiscos en arco.
// Colores fijos de los shaders en espacio lineal (L3). Módulo autónomo: no necesita mod-acuatico-cuernos.js.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas propias (nombres únicos)
VFX.palette("Sty Acuático · Anémona",["#ff9ab4","#12838a"]);
VFX.palette("Sty Acuático · Babylonia",["#f0d29a","#16799a"]);
VFX.palette("Sty Acuático · Almeja",["#7fd6e4","#1d5c9c"]);
VFX.palette("Sty Acuático · Estrella",["#ffb15a","#157e8e"]);
VFX.palette("Sty Acuático · Caparazón",["#56dcc4","#0d6a72"]);
VFX.palette("Sty Acuático · Oranda",["#ffb444","#cf4318"]);

const L3=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const WATER=L3('#19a3b6'), DEEP=L3('#0a4a66'), AQUA=L3('#43d0d6'), CORAL=L3('#ff6f86'), CREAM=L3('#efd6a6'),
  BROWN=L3('#6e361a'), GOLD=L3('#ffb030'), ORANGE=L3('#ff7418'), RED=L3('#ff3a2c'), HEALC=L3('#4fe89a'), PEARL=L3('#d9e4f2');
const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const out3=k=>1-Math.pow(1-cl(k),3);
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const HEADP=V3(-3.5,2.1,0);             // puntas de los cuernos
const TC=V3(3.2,1.2,0);                 // pecho del objetivo
const AP=ALLY_POS[0];                   // aliado del laboratorio
const ZONES={zoneCaster:0.6,zoneTarget:1.15};
const arcJ=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const ARC=`vec3 arc(vec3 s,vec3 e,float h,float k){return mix(s,e,k)+vec3(0.,4.*h*k*(1.-k),0.);}`;

// ---------- piezas de agua compartidas ----------
// burbuja: borde turquesa iluminado, centro casi transparente, brillo duro
const BUBBLE_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
 float rim=smoothstep(.33,.44,d)*smoothstep(.5,.45,d);float hl=step(length(q-vec2(-.13,-.14)),.07);
 float a=(rim*.95+.18*smoothstep(.45,0.,d)+hl)*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${AQUA},.5+.45*(-q.y+.5)*.7),vec3(.9,1.,1.),hl*.8),a);}`;
const DROP_FS=S.MATTER_FS(C.drop,{relief:4,col:WATER});
const FOAM_FS=S.MATTER_FS(C.puff,{relief:4,bias:.12,col:AQUA});
// estela de agua a lo largo de +x (uv.x = 1 en la cabeza)
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.25+.75*u;float m=smoothstep(w,w*.4,v)*u*u;
 float n=styNoise(vec2(u*.7-uT*2.,vUv.y*.5)).b;float er=styErode(n*.5+.5*u,.2,.15);
 if(m*er<.01)discard;gl_FragColor=vec4(styRampOf(${WATER},.45+.5*u)*1.15,m*er*uA);}`;
const streakMesh=(parent,w)=>{const mat=S.mat(STREAK_FS,{},{mode:'energy',side:THREE.DoubleSide});
  const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0);const grp=new THREE.Group();
  const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat);b.rotation.x=Math.PI/2;grp.add(a,b);parent.add(grp);grp.userData.mat=mat;return grp;};
const poseStreak=(s,p0,p1,vis,al=1)=>{tmp2.copy(p1).sub(p0);const ln=tmp2.length();s.visible=vis&&ln>0.01;if(!s.visible)return;
  s.position.copy(p1);s.quaternion.setFromUnitVectors(XA,tmp2.normalize());s.scale.set(ln,1,1);s.userData.mat.uniforms.uA.value=al;};
// charco de agua en el suelo (materia); uP = erosión
const WET_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.7+.21).r*.6+styNoise(vUv*.45+.6).g*.4;float m=smoothstep(.75,.64,r+(n-.5)*.55);
 float drops=smoothstep(.75,.81,styNoise(vUv*1.2+.37).g)*smoothstep(1.,.62,r);float mm=max(m,drops);if(mm<.01)discard;
 float er=styErode(n*.7+mm*.3,uP,.12);float rim=smoothstep(.5,.66,r+(n-.5)*.55)*m;
 gl_FragColor=vec4(styRampOf(${WATER},.28+.3*n+.3*rim),mm*er*uA*.7);}`;
const wetDecal=(parent,size,x,z=0)=>{const m=groundPlane(size,x,0.024,S.mat(WET_FS,{},{mode:'matter'}));m.position.z=z;parent.add(m);return m;};
// corona de salpicadura: gotas que saltan en anillo desde p (gl): P = vec3, T = instante
const splashVS=(P,T,sp0=1,up0=.7)=>{const sp=f(sp0),up=f(up0);return `void main(){float s=${T}+aSeed.x*.05;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
 vec3 v=normalize(rnd()*vec3(1.,.4,1.)+vec3(0.,${up},0.))*(${sp}*(1.6+1.8*aSeed.z));vec3 p=${P}+v*t+vec3(0.,-7.5*t*t,0.);
 vA=(age>0.&&age<1.&&p.y>0.02)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.x,v.y-15.*t);vR=atan(vel.x,vel.y);put(p,.2+.13*aSeed.w);}`;};
// cruces de cura (energía verde)
const CROSS_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float b=max(step(abs(q.x),.09)*step(abs(q.y),.32),step(abs(q.y),.09)*step(abs(q.x),.32));
 float a=b*vA;if(a<.01)discard;gl_FragColor=vec4(styRampOf(${HEALC},.75)*1.3,a);}`;
// chevrón hacia arriba (potenciado, rojo)
const CHEVUP_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.16+abs(q.x)*.95);
 float m=smoothstep(.1,.055,d)*step(abs(q.x),.4);float a=m*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${RED},.6+.4*smoothstep(.1,0.,d))*1.35,a);}`;
const defs=[];

// =====================================================================
// 1 · ANEMONE (daño + cura 20 al lanzador) — una corona de tentáculos de anémona brota de los cuernos, se contrae y
//     dispara tres dardos urticantes en arco; picadura turquesa en el pecho del rival; hilos de vida vuelven al lanzador
// =====================================================================
const TENT_FS=`uniform float uEr;uniform float uGl;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());float y=vUv.y;
 vec4 ns=styNoise(vec2(vUv.x*2.,y*.8+.1));if(uEr>0.&&ns.r*.7+.3*(1.-y)<uEr)discard;
 float band=smoothstep(.45,.55,fract(y*5.+ns.g*.3));
 vec3 col=mix(${DEEP},${CORAL},smoothstep(.2,.85,y));col=mix(col,col*.78,band*.6);
 vec3 c=styRampOf(col,.28+.55*l)*styTint(l);c+=${CORAL}*uGl*smoothstep(.75,1.,y)*1.4;
 gl_FragColor=vec4(c,1.);}`;
const DART_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float y=vUv.y;
 vec3 col=mix(${DEEP},${CORAL},smoothstep(.45,.9,y));gl_FragColor=vec4(styRampOf(col,.3+.6*l)*styTint(l)+${CORAL}*smoothstep(.85,1.,y)*.6,1.);}`;
defs.push({key:"sty_qcAnemone",name:"Anemone (estilizado)",dur:2.2,ti:0.9,tier:2,pal:"Sty Acuático · Anémona",stylized:true,...ZONES,
  phases:[["Brote",0],["Carga",0.36],["Dardos",0.52],["Picadura",0.9],["Halo",1.05],["Retirada",1.75]],
build(a){
  const L=a.L,TB=0.36,TL=0.52,TI=0.9,TH=1.05,TR=1.75;
  const crown=new THREE.Group(); crown.position.copy(HEADP); L.mesh.add(crown);
  const tm=S.mat(TENT_FS,{uEr:{value:0},uGl:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const tg=new THREE.CylinderGeometry(0.04,0.11,0.95,8,6).translate(0,0.475,0);
  const tents=[];
  for(let i=0;i<9;i++){const p=new THREE.Group();const an=i/9*Math.PI*2;p.position.set(Math.cos(an)*0.24,0,Math.sin(an)*0.24);
    const m=new THREE.Mesh(tg,tm);p.add(m);crown.add(p);tents.push({p,an,ph:i*0.7});}
  const base=new THREE.Mesh(new THREE.SphereGeometry(0.3,16,10,0,Math.PI*2,0,Math.PI/2),tm); base.scale.set(1,0.45,1); crown.add(base);
  const dm=S.mat(DART_FS,{},{mode:'solid'});
  const dg=new THREE.ConeGeometry(0.11,0.75,8).rotateZ(-Math.PI/2);
  const darts=[0,1,2].map(i=>{const m=new THREE.Mesh(dg,dm);L.mesh.add(m);const z=(i-1)*0.75,h=0.5+0.35*(i%2),end=V3(TC.x-0.1,TC.y+0.05,z*0.15);return {m,st:streakMesh(L.mesh,0.28),z,dl:i*0.06,h,end,mid:V3((HEADP.x+end.x)/2,HEADP.y+1.2*h,z),p0:V3(0,0,0)};});
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.21,toCam:0.5});
  const ring=S.groundRing(L.decal,2.8), ringC=S.groundRing(L.decal,2.4);
  const wet=wetDecal(L.decal,2.2,3.4);
  const K=`const float TB=${f(TB)};const float TL=${f(TL)};const float TI=${f(TI)};const float TH=${f(TH)};const float TR=${f(TR)};
   const vec3 HP=${v3(HEADP)};const vec3 BP=${v3(TC)};const vec3 CP=vec3(-3.7,1.,0.);${ARC}`;
  // motas que entran a la corona en la carga
  S.pts(L.part,14,VV+K+`void main(){float s=TB-.1+aSeed.x*.2;float age=(uT-s)/.18;vec3 d=normalize(rnd());
   vec3 p=HP+vec3(0.,.3,0.)+d*mix(.8,.1,age*age);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.1+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // picadura: gotas turquesa y esquirlas de coral
  S.pts(L.part,20,VV+K+splashVS('BP','TI',.9,.4),DROP_FS);
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.4,0.))*(1.6+1.4*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:CORAL}));
  // hilos de vida: motas verde-agua en arco del rival al lanzador
  S.pts(L.part,26,VV+K+`void main(){float s=TH+aSeed.x*.35;float k=(uT-s)/.45;vec3 r=rnd();
   vec3 p=arc(BP+r*.25,CP+r*.15+vec3(0.,.3,0.),1.1+.4*aSeed.y,clamp(k,0.,1.))+vec3(0.,0.,r.z*.5*sin(k*3.14159));
   vR=0.;vK=0.;vA=(k>0.&&k<1.)?1.:0.;put(p,.12+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // cura: cruces que suben en el lanzador
  S.pts(L.part,10,VV+K+`void main(){float per=.55;float k=(uT-TH-.4)/per+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(-3.7+cos(an)*(.5+.15*r.y),.3+age*1.6,sin(an)*(.5+.15*r.y));
   float on=step(TH+.4,uT)*(1.-smoothstep(TR+.1,TR+.35,uT));vA=sin(age*3.14159)*on*step(0.,k);vK=0.;vR=0.;put(p,.32+.1*r.z);}`,CROSS_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0,TB,te), ret=ss(TR,TR+0.35,te);
    crown.visible=te<TR+0.35;
    crown.scale.setScalar(Math.max(back(grow)*(1-ret),0.001));
    const charge=ss(TB,TL,te)*(1-ss(TL,TL+0.06,te));
    for(const t of tents){const sway=0.25*Math.sin(te*6+t.ph)*(1-charge);
      const open=0.32*(1-charge)+0.08+0.35*ss(TL,TL+0.08,te)*(1-ss(TL+0.08,TL+0.4,te));
      t.p.rotation.set(0,-t.an,0);t.p.rotateZ(-(open+sway)*0.9);t.p.scale.set(1,1-0.3*charge,1);}
    tm.uniforms.uGl.value=0.8*charge+0.3*ss(TL,TL+0.05,te)*(1-ss(TL+0.05,TL+0.3,te));
    tm.uniforms.uEr.value=ret>0?-0.1+1.1*ret:0;
    caster.rotation.z=0.06*grow-0.18*ss(TL-0.02,TL+0.06,te)+0.12*ss(TL+0.1,TI,te);
    for(const d of darts){const k=cl((te-TL-d.dl)/(TI-TL-0.04));const vis=te>TL+d.dl&&k<1;
      d.m.visible=vis;
      qb(HEADP,d.mid,d.end,k,d.m.position);
      qb(HEADP,d.mid,d.end,cl(k+0.03),tmp);tmp.sub(d.m.position);
      if(tmp.lengthSq()>1e-8)d.m.quaternion.setFromUnitVectors(XA,tmp.normalize());
      qb(HEADP,d.mid,d.end,cl(k-0.22),d.p0);
      poseStreak(d.st,d.p0,d.m.position,vis&&k>0.05,0.9);}
    spark.pose(ia,TC,1);
    ring.pose(ia,3.4,0,0.45); ringC.pose(te-TH-0.4,-3.7,0,0.55,0.8);
    wet.visible=ia>=0; wet.scale.setScalar(0.5+0.5*out3(ia/0.25)); set(wet,ia>=0?-0.1+1.15*ss(0.5,1.25,ia):0,ia>=0?1:0);
    const hit=hitE(ia,7)*(ia>=0?1:0);
    target.position.x=3.4+0.2*hit; target.rotation.z=-hit*0.2*Math.cos(ia*16);
    const cm=caster.userData.m; if(cm){cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=0.35*ss(TH+0.35,TH+0.55,te)*(1-ss(TR-0.1,TR+0.3,te));}
    if(ia<0){o.g.copy(HEADP);o.gs=0.7*grow;o.ga=0.1+0.15*charge;o.li=1+1.5*charge;}
    else{o.g.copy(TC);o.gs=1+1.3*Math.min(ia,0.4);o.ga=0.22*Math.exp(-ia*10);o.li=3*Math.exp(-ia*6);}
    o.ia=ia; o.c.copy(TC); o.shake=0.7; o.dist=0.6; o.flash=0.4;
  };
}});

// =====================================================================
// 2 · BABYLONIA (daño + Débil) — una caracola en espiral (crema con motas castañas) se forma en los cuernos, cae y
//     avanza girando como un taladro por un surco de agua; salta y choca contra el pecho del rival: salpicadura,
//     esquirlas de concha, charco, y el rival queda Débil
// =====================================================================
const WHELK_FS=`uniform float uEr;uniform float uGl;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float y=vUv.y;float an=vUv.x;float sp=fract(an*1.+y*4.);float band=smoothstep(.42,.5,sp)*smoothstep(.62,.54,sp);
 vec4 ns=styNoise(vec2(an*2.,y*1.5));if(uEr>0.&&ns.r*.6+.4*ns.a<uEr)discard;
 float spots=smoothstep(.62,.7,ns.g);
 vec3 col=mix(${CREAM},${BROWN},max(spots*.85,band*.55));
 vec3 c=styRampOf(col,.25+.6*l-band*.12)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.18*smoothstep(.6,.72,fr)*step(.5,l);c+=${GOLD}*uGl;
 gl_FragColor=vec4(c,1.);}`;
// surco de agua a lo largo del suelo (franja de largo completo, se descubre con uP = frente 0..1)
const FURROW_FS=`uniform float uEr;void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*3.,vUv.y*.6+uT*.3)).r;float w=.55+.3*n;float m=smoothstep(w,w-.2,v)*step(u,uP)*smoothstep(0.,.05,u);
 float er=styErode(n*.6+.4*(1.-u),uEr,.12);if(m*er<.01)discard;
 float crest=smoothstep(.06,0.,abs(u-uP))*1.;
 gl_FragColor=vec4(styRampOf(${WATER},.3+.35*n+.3*crest+.2*smoothstep(.3,0.,v)),m*er*uA*.8);}`;
defs.push({key:"sty_qcBabylonia",name:"Babylonia (estilizado)",dur:2.1,ti:1.08,tier:2,pal:"Sty Acuático · Babylonia",stylized:true,...ZONES,
  phases:[["Caracola",0],["Rodada",0.34],["Choque",1.08],["Salpicadura",1.2],["Calma",1.6]],
build(a){
  const L=a.L,TF=0.34,TJ=0.86,TI=1.08,TE=2.05;
  const S0=V3(-3.2,2.2,0.3), G0=V3(-2.6,0.58,0.3), G1=V3(2.0,0.58,0.15), BP=V3(3.15,1.15,0);
  const shell=new THREE.Group(); L.mesh.add(shell);
  const wm=S.mat(WHELK_FS,{uEr:{value:0},uGl:{value:0}},{mode:'solid'});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.45,20,8).rotateZ(-Math.PI/2),wm); shell.add(cone);   // punta hacia +x
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(0.55,16,12),wm); mouth.scale.set(0.55,1,1); mouth.position.x=-0.66; shell.add(mouth);
  const fur=groundPlane(1,0,0.022,S.mat(FURROW_FS,{uEr:{value:0}},{mode:'matter'})); L.decal.add(fur);
  fur.geometry.dispose(); fur.geometry=new THREE.PlaneGeometry(G1.x-G0.x+0.6,0.75).rotateX(-Math.PI/2).translate((G0.x+G1.x)/2,0,0.22);
  fur.position.set(0,0.022,0);
  const shadow=S.contactShadow(L.decal,0.9);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.57,toCam:0.5});
  const ring=S.groundRing(L.decal,3.0);
  const wet=wetDecal(L.decal,2.6,3.3);
  const weak=S.status(a,'weak',[target],TI+0.05,TE);
  const K=`const float TF=${f(TF)};const float TJ=${f(TJ)};const float TI=${f(TI)};const vec3 G0=${v3(G0)};const vec3 G1=${v3(G1)};const vec3 BP=${v3(BP)};const vec3 S0=${v3(S0)};`;
  // remolino de agua que forma la caracola
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*(TF-.08);float age=(uT-s)/.2;float an=aSeed.y*6.28+age*5.;
   vec3 p=S0+vec3(cos(an),sin(an)*.6,sin(an))*mix(.7,.12,age);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.16+.06*aSeed.z);}`,BUBBLE_FS);
  // estela de rociado al taladrar por el suelo
  S.pts(L.part,30,VV+K+`void main(){float s=TF+.12+aSeed.x*(TJ-TF-.12);float k=(s-TF-.12)/(TJ-TF-.12);float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=mix(G0,G1,k);vec3 v=vec3(-.6-.6*aSeed.z,1.4+1.2*aSeed.w,(aSeed.y-.5)*2.2);vec3 p=b+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.02)?1.:0.;vK=smoothstep(.5,1.,age);vec2 vel=vec2(v.x,v.y-12.*t);vR=atan(vel.x,vel.y);put(p,.16+.1*aSeed.w);}`,DROP_FS);
  // choque: corona de salpicadura, espuma turquesa y esquirlas de concha
  S.pts(L.part,30,VV+K+splashVS('BP','TI',1.2,.6),DROP_FS);
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=BP+d*(.25+.6*(1.-exp(-t*6.)))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?.9:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.z)*(.6+.6*age));}`,FOAM_FS);
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.6,0.))*(1.7+1.6*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*(8.+6.*aSeed.w);put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:CREAM}));
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.02,TF-0.04,te);
    caster.rotation.z=0.07*form-0.15*ss(TF,TF+0.08,te)+0.08*ss(TF+0.15,TJ,te);
    shell.visible=ia<0.02;
    wm.uniforms.uGl.value=0.25*ss(TF-0.1,TF,te)*(1-ss(TF,TF+0.2,te));
    let spin=0;
    if(te<TF){shell.position.copy(S0);shell.scale.setScalar(Math.max(back(form),0.001));shell.rotation.set(te*4,0,0.3*Math.sin(te*9));}
    else if(te<TF+0.12){const k=(te-TF)/0.12;shell.position.lerpVectors(S0,G0,k*k);shell.scale.setScalar(1);shell.rotation.set(te*8,0,0);}
    else if(te<TJ){const k=(te-TF-0.12)/(TJ-TF-0.12);shell.position.lerpVectors(G0,G1,k);shell.position.y+=0.04*Math.abs(Math.sin(k*30));spin=te*24;shell.rotation.set(spin,0,0);shell.scale.setScalar(1);}
    else{const k=(te-TJ)/(TI-TJ);arcJ(G1,BP,0.35,k,shell.position);shell.rotation.set(te*24,0,0.4*k);shell.scale.setScalar(1);}
    const fk=te<TF+0.12?0:cl((te-TF-0.12)/(TJ-TF-0.12));
    fur.material.uniforms.uP.value=fk*0.92+0.04; fur.material.uniforms.uA.value=te>TF+0.1?1:0;
    fur.material.uniforms.uEr.value=-0.1+1.1*ss(TI+0.1,TI+0.75,te); fur.visible=te>TF+0.1&&te<TI+0.8;
    shadow.pose(shell.position.x,shell.position.z,0.8,te>TF&&ia<0?0.5:0);
    spark.pose(ia,BP,1);
    ring.pose(ia,3.4,0,0.45);
    wet.visible=ia>=0; wet.scale.setScalar(0.5+0.5*out3(ia/0.25)); set(wet,ia>=0?-0.1+1.15*ss(0.5,0.95,ia):0,ia>=0?1:0);
    const hit=hitE(ia,6)*(ia>=0?1:0);
    target.position.x=3.4+0.24*hit; target.rotation.z=-hit*0.24*Math.cos(ia*14);
    const sq=hitE(ia,9)*(ia>=0?1:0); target.scale.set(1+0.07*sq,1-0.12*sq,1+0.07*sq);
    const w=weak.pose(te); S.statusGlow(o,[weak]);
    if(ia<0){o.g.copy(shell.position);o.gs=0.5;o.ga=0.06;o.li=0.8;}
    else{o.g.copy(BP);o.gs=1+1.4*Math.min(ia,0.4);o.ga=0.22*Math.exp(-ia*10)+0.03*w;o.li=3.2*Math.exp(-ia*6);}
    o.ia=ia; o.c.copy(BP); o.shake=1; o.dist=0.8; o.flash=0.4;
  };
}});

// =====================================================================
// 3 · CLAMSHELL (daño + potenciado al lanzador) — dos valvas de almeja estriadas aparecen alrededor del rival, se abren
//     y se cierran de golpe como un mordisco; el agua sale a presión por los lados; una perla brota de la concha
//     cerrada, vuela al lanzador y lo potencia (chevrones rojos)
// =====================================================================
const VALVE_FS=`uniform float uEr;uniform float uGl;
void main(){vec2 q=vP.xy;float an=atan(q.y,-q.x);float r=length(q)/1.3;
 float rib=.5+.5*cos(an*7.*6.2832/1.7);float edge=.93+.06*cos(an*7.*6.2832/1.7)-.12*smoothstep(.55,.85,abs(an));if(r>edge)discard;
 float l=clamp(.42+.5*rib-.25*r*r,0.,1.);
 vec4 ns=styNoise(vec2(an*2.,r*1.2));if(uEr>0.&&ns.r*.6+.4*ns.a<uEr)discard;
 vec3 col=mix(${L3('#2d6f9e')},${L3('#9fd0e0')},smoothstep(.1,.95,r)*.85+ns.g*.12);
 col=mix(col,${L3('#1d4f7c')},(1.-rib)*.4);
 float growth=smoothstep(.04,.0,.5-abs(fract(r*5.)-.5))*.2;
 vec3 c=styRampOf(col,.25+.55*l-growth)*styTint(l);
 c=mix(c,styRampOf(${PEARL},.55+.3*l),smoothstep(edge-.06,edge-.01,r)*.8);
 c+=${AQUA}*uGl*.5*(1.-rib);
 if(!gl_FrontFacing)c=styRampOf(mix(${PEARL},${L3('#f0c4dc')},.35*ns.g),.4+.4*l);
 gl_FragColor=vec4(c,1.);}`;
const PEARL_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float fr=1.-abs(dot(n,normalize(vV)));
 vec3 irid=mix(${L3('#f6d7ea')},${L3('#bfe6f2')},.5+.5*sin(fr*6.+uT*3.));
 vec3 c=styRampOf(mix(${PEARL},irid,.5),.35+.55*l)*styTint(l);float sp=smoothstep(.95,.98,dot(reflect(-stySunV(),n),normalize(vV)));
 gl_FragColor=vec4(c+vec3(1.)*sp*.5,1.);}`;
defs.push({key:"sty_qcClamshell",name:"Clamshell (estilizado)",dur:2.2,ti:0.78,tier:2,pal:"Sty Acuático · Almeja",stylized:true,zoneCaster:0.5,zoneTarget:1.2,
  phases:[["Valvas",0],["Apertura",0.32],["Cierre",0.66],["Perla",0.98],["Escudo",1.3],["Disolución",1.8]],
build(a){
  const L=a.L,TO=0.32,TC0=0.66,TI=0.78,TP=0.98,TA=1.3,TE=2.15;
  const HING=V3(4.45,1.2,0), BP=V3(3.25,1.15,0), CP=V3(-3.7,1.2,0), PS=V3(3.35,1.25,0.45), PP0=V3(0,0,0), SPK=V3(2.95,1.15,0.3);
  const vm=S.mat(VALVE_FS,{uEr:{value:0},uGl:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  // valva de vieira: abanico estriado (sector de círculo hacia −x, abombado), visto de frente; bisagra detrás del rival
  const vg=new THREE.RingGeometry(0.02,1.3,48,10,Math.PI-0.85,1.7);
  {const pa=vg.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);pa.setZ(i,0.55*(x*x+y*y)/1.69);}vg.computeVertexNormals();}
  const mkValve=(z)=>{const piv=new THREE.Group();piv.position.set(HING.x,HING.y,z);const m=new THREE.Mesh(vg,vm);piv.add(m);L.mesh.add(piv);return piv;};
  const top=mkValve(0.62), bot=mkValve(0.5);
  const pearl=new THREE.Mesh(new THREE.SphereGeometry(0.17,20,14),S.mat(PEARL_FS,{},{mode:'solid'})); L.mesh.add(pearl);
  const pst=streakMesh(L.mesh,0.22);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.12,toCam:0.5});
  const ring=S.groundRing(L.decal,3.0), ringC=S.groundRing(L.decal,2.6);
  const wet=wetDecal(L.decal,2.6,3.4);
  const K=`const float TI=${f(TI)};const float TA=${f(TA)};const float TE=${f(TE)};const vec3 BP=${v3(BP)};const vec3 CP=${v3(CP)};`;
  // agua a presión por los lados al cerrarse
  S.pts(L.part,28,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float side=aSeed.w<.5?-1.:1.;vec3 v=vec3((aSeed.z-.5)*1.6,.4+.8*aSeed.y,side*(2.2+1.6*aSeed.z));vec3 p=BP+v*t+vec3(0.,-6.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.02)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.z,v.y-13.*t);vR=atan(vel.x,vel.y);put(p,.2+.12*aSeed.w);}`,DROP_FS);
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float side=aSeed.w<.5?-1.:1.;vec3 p=BP+vec3((aSeed.z-.5)*.6,-.2+.3*t,side*(.6+1.2*(1.-exp(-t*5.))));
   vA=(age>0.&&age<1.)?.85:0.;vK=smoothstep(.25,1.,age);vR=aSeed.y*6.28;put(p,(.4+.2*aSeed.z)*(.6+.6*age));}`,FOAM_FS);
  // potenciado: chevrones rojos que suben en el lanzador
  S.pts(L.part,12,VV+K+`void main(){float per=.5;float k=(uT-TA)/per+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=CP+vec3(cos(an)*(.55+.15*r.y),-.9+age*1.8,sin(an)*(.55+.15*r.y));
   float on=step(TA,uT)*(1.-smoothstep(TE-.25,TE,uT));vA=sin(age*3.14159)*on*step(0.,k);vK=0.;vR=0.;put(p,.48+.12*r.z);}`,CHEVUP_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, appear=ss(0,TO,te);
    // apertura y cierre en arco (mordisco): ángulo de la valva superior
    let ang;
    if(te<TO)ang=0.25+0.15*appear;
    else if(te<TC0)ang=0.4+0.55*out3((te-TO)/(TC0-TO));
    else if(te<TI)ang=0.95*(1-Math.pow((te-TC0)/(TI-TC0),2));
    else ang=-0.04*hitE(ia,10)*Math.cos(ia*30);
    const tremble=te>TI&&te<TP+0.2?0.015*Math.sin(te*70):0;
    top.rotation.set(0,0,-0.1-ang-tremble); bot.rotation.set(0,0,0.1+ang+tremble);
    const vis=te<TE; top.visible=bot.visible=vis;
    const sc=Math.max(back(appear),0.001); top.scale.setScalar(sc); bot.scale.setScalar(sc);
    vm.uniforms.uGl.value=0.6*ss(TC0,TI,te)*(1-ss(TI,TI+0.25,te));
    vm.uniforms.uEr.value=te>TP+0.25?-0.1+1.1*ss(TP+0.25,TE-0.2,te):0;
    // perla: brota entre las valvas y vuela al lanzador
    const pk=cl((te-TP)/(TA-TP)); pearl.visible=te>TP-0.12&&te<TA;
    if(te<TP){pearl.position.copy(PS);pearl.scale.setScalar(Math.max(ss(TP-0.12,TP,te),0.001));}
    else{arcJ(PS,CP,1.3,pk,pearl.position);pearl.scale.setScalar(1-0.4*ss(0.85,1,pk));}
    arcJ(PS,CP,1.3,cl(pk-0.2),PP0);poseStreak(pst,PP0,pearl.position,te>TP&&te<TA,0.8);
    spark.pose(ia,SPK,1);
    ring.pose(ia,3.4,0,0.45); ringC.pose(te-TA,-3.7,0,0.5,0.9);
    wet.visible=ia>=0; wet.scale.setScalar(0.5+0.5*out3(ia/0.25)); set(wet,ia>=0?-0.1+1.15*ss(0.6,1.3,ia):0,ia>=0?1:0);
    const hit=hitE(ia,7)*(ia>=0?1:0);
    target.position.x=3.4+0.1*hit; target.scale.set(1-0.1*hit,1+0.04*hit,1-0.1*hit);
    const cm=caster.userData.m,env=ss(TA,TA+0.15,te)*(1-ss(TE-0.25,TE,te));
    if(cm){cm.emissive.setRGB(1,0.25,0.15);cm.emissiveIntensity=0.35*env+0.5*hitE(te-TA,8)*(te>=TA?1:0);}
    if(ia<0){o.g.copy(BP);o.gs=0.7*appear;o.ga=0.06;o.li=0.8*appear;}
    else if(te<TA){o.g.copy(te<TP?BP:pearl.position);o.gs=1+0.8*Math.min(ia,0.4);o.ga=0.2*Math.exp(-ia*10)+0.05;o.li=2.8*Math.exp(-ia*6)+0.5;}
    else{o.g.copy(CP);o.gs=1.2;o.ga=0.08*env;o.li=1.2*env;}
    o.ia=ia; o.c.copy(BP); o.shake=0.9; o.dist=0.7; o.flash=0.3;
  };
}});

// =====================================================================
// 4 · SHOAL STAR (daño; ejecuta con ≤ 100 HP y sin escudo) — una estrella de mar (coral con relieve de tubérculos)
//     se forma en un remolino, sale girando como un shuriken con estela de agua, corta al rival en cruz, rebota hacia
//     arriba y se deshace en gotas; una marca carmesí fugaz (la ejecución) queda en el rival
// =====================================================================
const STAR_FS=`uniform float uGl;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec2 p=vP.xy;float r=length(p);vec4 ns=styNoise(p*1.3+.5);float bump=smoothstep(.64,.72,ns.g);
 vec3 col=mix(${L3('#ff9a4a')},${L3('#c8381e')},smoothstep(.1,.5,r));col=mix(col,${L3('#ffd9a0')},bump*.7);
 vec3 c=styRampOf(col,.3+.55*l+bump*.08)*styTint(l);c+=${GOLD}*uGl*smoothstep(.3,0.,r);
 gl_FragColor=vec4(c,1.);}`;
const SLASH_FS=`uniform float uEr;void main(){vec2 p=(vUv-.5)*2.;float d=abs(p.y-p.x*p.x*.15);float w=.14*(1.-abs(p.x));
 float m=smoothstep(w,w*.3,d)*step(abs(p.x),1.);float n=styNoise(vUv*vec2(1.5,.4)).b;float er=styErode(n*.5+m*.5,uEr,.12);
 if(m*er<.01)discard;gl_FragColor=vec4(mix(styRampOf(${L3('#ff6a3a')},.8),styRampOf(${WATER},.7),smoothstep(.0,.8,d/w))*1.3,m*er*uA);}`;
const MARK_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float ring=smoothstep(.12,.0,abs(r-.72))*(.6+.4*step(.5,fract(an/6.2832*6.)));float x=max(smoothstep(.12,.0,abs(p.x-p.y)),smoothstep(.12,.0,abs(p.x+p.y)))*step(r,.55);
 float m=max(ring,x);if(m<.02)discard;gl_FragColor=vec4(styRampOf(${L3('#b0142a')},.7)*1.2,m*uA);}`;
defs.push({key:"sty_qcShoalStar",name:"Shoal Star (estilizado)",dur:1.9,ti:0.82,tier:2,pal:"Sty Acuático · Estrella",stylized:true,...ZONES,
  phases:[["Forma",0],["Vuelo",0.3],["Corte",0.82],["Rebote",0.95],["Calma",1.35]],
build(a){
  const L=a.L,TF=0.3,TI=0.82,TB=0.95,TE=1.35;
  const S0=V3(-3.1,2.2,0.2), E0=V3(3.05,1.3,0), R1=V3(1.4,3.4,0.8), BP=V3(3.2,1.25,0), SP0=V3(0,0,0);
  const sh=new THREE.Shape();for(let i=0;i<10;i++){const an=i/10*Math.PI*2+Math.PI/2,r=i%2?0.22:0.6;const x=Math.cos(an)*r,y=Math.sin(an)*r;i?sh.lineTo(x,y):sh.moveTo(x,y);}
  const sg=new THREE.ExtrudeGeometry(sh,{depth:0.07,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.05,bevelSegments:2});sg.translate(0,0,-0.035);
  const sm=S.mat(STAR_FS,{uGl:{value:0}},{mode:'solid'});
  const star=new THREE.Group();const sMesh=new THREE.Mesh(sg,sm);star.add(sMesh);L.mesh.add(star);
  const st=streakMesh(L.mesh,0.34);
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.1),S.mat(SLASH_FS,{uEr:{value:0}},{mode:'energy',side:THREE.DoubleSide}));L.mesh.add(slash);
  const slash2=new THREE.Mesh(slash.geometry,slash.material);L.mesh.add(slash2);
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),S.mat(MARK_FS,{},{mode:'energy',side:THREE.DoubleSide}));L.mesh.add(mark);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.66,toCam:0.5});
  const ring=S.groundRing(L.decal,2.8);
  const shadow=S.contactShadow(L.decal,0.8);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float TB=${f(TB)};const float TE=${f(TE)};const vec3 S0=${v3(S0)};const vec3 BP=${v3(BP)};const vec3 R1=${v3(R1)};${ARC}`;
  // remolino de agua al formarse
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*(TF-.06);float age=(uT-s)/.18;float an=aSeed.y*6.28+age*6.;
   vec3 p=S0+vec3(cos(an),sin(an),sin(an)*.4)*mix(.75,.1,age);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.15+.06*aSeed.z);}`,BUBBLE_FS);
  // gotas que suelta en el vuelo
  S.pts(L.part,22,VV+K+`void main(){float s=TF+aSeed.x*(TI-TF);float k=(s-TF)/(TI-TF);float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=arc(S0,BP,.5,k);vec3 v=normalize(rnd())*1.2;vec3 p=b+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,v.y-12.*t);put(p,.14+.08*aSeed.w);}`,DROP_FS);
  // corte: gotas y esquirlas de coral
  S.pts(L.part,22,VV+K+splashVS('BP','TI',1.,.35),DROP_FS);
  // se deshace en gotas al rebotar
  S.pts(L.part,18,VV+K+`void main(){float s=TE-.08+aSeed.x*.06;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p0=arc(BP,R1,.4,1.);vec3 v=normalize(rnd()+vec3(0.,.2,0.))*(1.+1.2*aSeed.z);vec3 p=p0+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vec2 vel=vec2(v.x,v.y-14.*t);vR=atan(vel.x,vel.y);put(p,.18+.1*aSeed.w);}`,DROP_FS);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.02,TF-0.03,te);
    caster.rotation.z=0.06*form-0.2*ss(TF-0.02,TF+0.06,te)+0.14*ss(TF+0.15,TI,te);
    star.visible=te<TE;
    if(te<TF){star.position.copy(S0);star.scale.setScalar(Math.max(back(form),0.001));}
    else if(te<TI){arcJ(S0,E0,0.5,(te-TF)/(TI-TF),star.position);star.scale.setScalar(1);}
    else if(te<TE){const k=(te-TI)/(TE-TI);arcJ(E0,R1,0.4,out3(k),star.position);star.scale.setScalar(Math.max(1-0.35*k,0.001));}
    // gira sobre su normal, inclinada hacia la cámara (shuriken)
    star.rotation.set(-0.9,0.35,0); sMesh.rotation.set(0,0,-te*(te<TI?26:14));
    sm.uniforms.uGl.value=0.4*ss(TF-0.08,TF,te)*(1-ss(TF,TF+0.2,te))+0.5*hitE(ia,10)*(ia>=0?1:0);
    const pk=te<TI?cl((te-TF)/(TI-TF)):0;arcJ(S0,E0,0.5,cl(pk-0.25),SP0);
    poseStreak(st,SP0,star.position,te>TF+0.04&&te<TI,0.95);
    // corte en cruz sobre el rival
    for(const [s,rz,dl] of [[slash,0.55,0],[slash2,-0.75,0.05]]){const k=ia-dl;s.visible=k>=0&&k<0.42;
      s.position.set(BP.x-0.2,BP.y+0.1,0.65);s.rotation.set(0,0,rz);s.lookAt(VFX.camera.position);s.rotateZ(rz);
      s.scale.set(0.5+0.6*out3(k/0.08),1,1);s.material.uniforms.uA.value=1;s.material.uniforms.uEr.value=-0.1+1.1*ss(0.1,0.42,k);}
    // marca fugaz de ejecución
    const mk=ia-0.12; mark.visible=mk>=0&&mk<0.7; mark.position.set(BP.x,BP.y+0.75,0.2); mark.lookAt(VFX.camera.position);
    mark.scale.setScalar(0.7+0.3*out3(mk/0.15)); mark.material.uniforms.uA.value=mk>=0?(1-ss(0.4,0.7,mk))*0.85:0;
    spark.pose(ia,BP,0.9);
    ring.pose(ia,3.4,0,0.4);
    shadow.pose(star.position.x,star.position.z,0.6,te>TF&&te<TE?0.35:0);
    const hit=hitE(ia,7)*(ia>=0?1:0);
    target.position.x=3.4+0.16*hit; target.rotation.z=-hit*0.25*Math.cos(ia*18);
    if(ia<0){o.g.copy(star.position);o.gs=0.5;o.ga=0.08;o.li=1;}
    else{o.g.copy(BP);o.gs=1+1.2*Math.min(ia,0.4);o.ga=0.2*Math.exp(-ia*11);o.li=3*Math.exp(-ia*7);}
    o.ia=ia; o.c.copy(BP); o.shake=0.6; o.dist=0.6; o.flash=0.35;
  };
}});

// =====================================================================
// 5 · TEAL SHELL (aliado: +60 de escudo) — un chorro de agua en arco va de los cuernos al aliado; placas hexagonales
//     de caparazón turquesa vuelan y se ensamblan en una cúpula de tortuga (de abajo arriba) que se sella con un
//     destello; anillos de marea a sus pies; al final la cúpula se disuelve en gotas
// =====================================================================
const DOME_FS=`uniform float uEr;uniform float uGl;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec3 q=normalize(vP);
 float h=q.y;if(h>uP*1.05-.05)discard;
 vec2 g=vec2(atan(q.z,q.x)*1.6,h*3.2);vec2 hx=vec2(g.x+.5*floor(g.y),g.y);vec2 fc=fract(hx)-.5;float e=max(abs(fc.x),abs(fc.y))*2.;
 float seam=smoothstep(.78,.92,e);vec4 ns=styNoise(g*.3+.2);if(uEr>0.&&ns.r*.6+.4*ns.a<uEr)discard;
 vec3 col=mix(${L3('#2fb7a6')},${L3('#1b7f88')},ns.g*.6);col=mix(col,${DEEP},seam*.85);
 vec3 c=styRampOf(col,.28+.55*l)*styTint(l);float fr=1.-abs(dot(n,normalize(vV)));
 c+=${AQUA}*(.25*smoothstep(.55,.8,fr)+uGl*(1.-seam)*.8)+${AQUA}*smoothstep(.06,0.,abs(h-uP))*1.4;
 gl_FragColor=vec4(c,mix(.55,.92,seam)*uA);}`;
const TIDE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=fract(r*2.4-uT*1.1);float m=smoothstep(.12,.0,abs(w-.5)-.3)*smoothstep(1.,.35,r);
 float n=styNoise(vUv*.8+uT*.05).r;if(m<.02)discard;gl_FragColor=vec4(styRampOf(${WATER},.45+.35*n),m*uA*.55);}`;
const HEXP_FS=S.PV+`void main(){vec2 q=styPC()-.5;float e=max(abs(q.x)*1.15+abs(q.y)*.58,abs(q.y)*1.15);if(e>.48)discard;
 float rim=smoothstep(.36,.46,e);float a=vA;gl_FragColor=vec4(mix(styRampOf(${L3('#2fb7a6')},.75),styRampOf(${DEEP},.4),rim),a);}`;
defs.push({key:"sty_qcTealShell",name:"Teal Shell (estilizado)",dur:2.2,ti:0.55,tier:2,pal:"Sty Acuático · Caparazón",stylized:true,allies:1,...ZONES,
  phases:[["Chorro",0],["Caparazón",0.45],["Escudo",0.55],["Mareas",0.95],["Disolución",1.8]],
build(a){
  const L=a.L,TS=0.45,TI=0.55,TM=0.95,TD=1.8;
  const S0=V3(-3.45,2.15,0), E0=V3(AP.x,1.3,AP.z), BP=V3(AP.x,1.0,AP.z), p0=V3(0,0,0), p1=V3(0,0,0);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.05,40,20,0,Math.PI*2,0,Math.PI*0.52),S.mat(DOME_FS,{uEr:{value:0},uGl:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  dome.position.set(AP.x,0,AP.z); dome.scale.set(1,1.05,1); L.mesh.add(dome);
  const tide=groundPlane(3.2,AP.x,0.026,S.mat(TIDE_FS,{},{mode:'matter'})); tide.position.z=AP.z; L.decal.add(tide);
  const jet=streakMesh(L.mesh,0.3);
  const ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.4);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const float TM=${f(TM)};const float TD=${f(TD)};const vec3 S0=${v3(S0)};const vec3 E0=${v3(E0)};const vec3 AP=${v3(AP)};${ARC}`;
  // chorro: gotas en arco de los cuernos al aliado
  S.pts(L.part,34,VV+K+`void main(){float s=aSeed.x*(TS-.05);float k=(uT-s)/.32;vec3 r=rnd();
   vec3 p=arc(S0,E0,1.,clamp(k,0.,1.))+r*.08;vA=(k>0.&&k<1.)?1.:0.;vK=0.;vR=0.;put(p,.18+.08*aSeed.z);}`,DROP_FS);
  // placas hexagonales que vuelan y se pegan a la cúpula
  S.pts(L.part,24,VV+K+`void main(){float s=TS-.22+aSeed.x*.2;float k=clamp((uT-s)/.22,0.,1.);float an=aSeed.y*6.2832;float h=.12+.8*aSeed.z;
   vec3 dst=AP+vec3(cos(an)*1.05*sqrt(1.-h*h),h*1.1,sin(an)*1.05*sqrt(1.-h*h));vec3 src=dst+normalize(vec3(cos(an),.4,sin(an)))*2.2;
   vec3 p=mix(src,dst,k*k*(3.-2.*k));vA=(uT>s&&uT<TI+.06)?1.:0.;vK=0.;vR=an+uT*4.*(1.-k);put(p,.32+.1*aSeed.w);}`,HEXP_FS);
  // disolución en gotas
  S.pts(L.part,24,VV+K+`void main(){float s=TD-.15+aSeed.x*.3;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float h=.2+.7*aSeed.w;vec3 p=AP+vec3(cos(an)*1.05,h*1.1,sin(an)*1.05)+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.17+.07*aSeed.w);}`,DROP_FS);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.06*ss(0,0.12,te)-0.12*ss(0.12,0.2,te)+0.06*ss(0.25,TS,te);
    const jk=cl(te/TS); arcJ(S0,E0,1,cl(jk-0.35),p0);arcJ(S0,E0,1,jk,p1);
    poseStreak(jet,p0,p1,te>0.04&&te<TS+0.05,0.9*(1-ss(TS-0.05,TS+0.05,te)));
    const up=ss(TS-0.02,TI+0.05,te), dis=ss(TD-0.15,TD+0.3,te);
    dome.visible=te>TS-0.03&&te<TD+0.32;
    const dm=dome.material.uniforms; dm.uP.value=up; dm.uA.value=1-0.0*dis; dm.uEr.value=dis>0?-0.1+1.1*dis:0;
    dm.uGl.value=0.9*hitE(ia,7)*(ia>=0?1:0)+0.12*Math.sin(te*5)*ss(TM,TM+0.2,te);
    dome.scale.set(1+0.05*hitE(ia,9)*(ia>=0?1:0),1.05,1+0.05*hitE(ia,9)*(ia>=0?1:0));
    tide.visible=te>TM-0.1; set(tide,0,ss(TM-0.1,TM+0.2,te)*(1-ss(TD-0.2,TD+0.2,te)));
    ring.pose(ia,AP.x,AP.z,0.45); ring2.pose(ia-0.35,AP.x,AP.z,0.5,0.8);
    const al=allies[0].userData.m; if(al){al.emissive.copy(U.uC1.value); al.emissiveIntensity=0.45*hitE(ia,7)*(ia>=0?1:0)+0.12*ss(TI,TI+0.2,te)*(1-dis);}
    if(ia<0){o.g.copy(p1);o.gs=0.6;o.ga=0.08;o.li=1;}
    else{o.g.copy(BP);o.gs=1.2+0.8*Math.min(ia,0.4);o.ga=0.2*Math.exp(-ia*9)+0.04*(1-dis);o.li=2.6*Math.exp(-ia*5)+0.6*(1-dis);}
    o.ia=ia; o.c.copy(BP); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// 6 · ORANDA (daño pesado + quita 2 mejoras) — un remolino de agua invoca un espíritu de pez oranda (silueta dorada con
//     gorro rojo y aletas de velo, sin cara); nada por el aire con estela de burbujas, danza en espiral sobre el rival
//     (que se balancea), se lanza en picado: explosión de agua y escamas doradas; dos orbes de mejora son arrancados
//     del rival y se rompen; lluvia de escamas
// =====================================================================
const FISH_FS=`uniform float uGl;uniform float uEr;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec3 q=vP;
 vec2 g=vec2(q.x*9.,q.y*9.+.5*floor(q.x*9.));float sc=smoothstep(.3,.5,length(fract(g)-vec2(.5,.2)));
 vec4 ns=styNoise(q.xy*.9+q.z*.3+.3);if(uEr>0.&&ns.r*.6+.4*ns.a<uEr)discard;
 float back=smoothstep(-.05,.35,q.y+(ns.g-.5)*.25), belly=smoothstep(.0,-.4,q.y);
 vec3 col=mix(${L3('#ffa21c')},${L3('#e2280e')},back);col=mix(col,${L3('#ffc860')},belly*.6);
 float pat=smoothstep(.62,.7,ns.b)*(1.-belly);col=mix(col,${L3('#ff5a14')},pat*.4);
 vec3 c=styRampOf(col,.2+.58*l-.06*sc)*styTint(l);float fr=1.-abs(dot(n,normalize(vV)));
 c+=${GOLD}*(.45*smoothstep(.55,.75,fr)+uGl)+vec3(1.,.9,.6)*.25*step(.93,l)*(1.-sc);gl_FragColor=vec4(c,1.);}`;
const WEN_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec4 ns=styNoise(vP.xy*5.+vP.z*3.);
 float b=smoothstep(.45,.75,ns.g);float fr=1.-abs(dot(n,normalize(vV)));
 vec3 c=styRampOf(mix(${L3('#c8180e')},${L3('#ff6a2a')},b),.22+.62*l)*styTint(l)+${L3('#ff9a40')}*.3*smoothstep(.6,.8,fr);gl_FragColor=vec4(c,1.);}`;
const FIN_FS=`uniform float uEr;void main(){vec2 p=vUv;float rays=smoothstep(.35,.5,abs(fract(p.y*9.)-.5)*2.);
 vec4 ns=styNoise(p*vec2(.6,1.2)+uT*.1);float w=.12+.36*pow(p.x,.7);float dy=abs(p.y-.5);
 float edge=smoothstep(w,w-.06,dy);float tip=.78+.18*sin(p.y*18.+uT*6.)*.5+ns.r*.15;
 float m=edge*smoothstep(tip,tip-.12,p.x);if(m<.02)discard;float er=styErode(ns.b*.6+.4*(1.-p.x),uEr,.1);if(er<.01)discard;
 vec3 col=mix(${L3('#ffc24a')},${L3('#f0401a')},p.x*.8+rays*.2);gl_FragColor=vec4(styRampOf(col,.55+.3*rays)*1.05,m*er*uA*(.5+.3*rays));}`;
// cola de velo: plano subdividido que se ensancha y se dobla en ola con el nado (vértices), translúcido con radios
const VEIL_VS=`uniform float uWag;uniform float uBend;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
void main(){vUv=uv;vec3 p=position;float k=clamp(uv.x,0.,1.);p.y*=1.+.7*k;
 p.z+=uBend*k*k+.26*sin(uWag-k*4.2)*k;p.y+=.07*sin(uWag*.8-k*5.+uv.y*3.)*k;
 vP=position;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*vec3(0.,0.,1.));vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const VEIL_FS=`uniform float uEr;void main(){vec2 p=vUv;float dy=abs(p.y-.5)*2.;vec4 ns=styNoise(p*vec2(.5,1.1)+uT*.05);
 float w=.42+.58*pow(p.x,.55);float tip=.83+.1*sin(p.y*15.+uT*4.)+.07*ns.r;
 float m=smoothstep(w,w-.1,dy)*smoothstep(tip,tip-.14,p.x);if(m<.02)discard;
 float er=styErode(ns.b*.55+.45*(1.-p.x),uEr,.1);if(er<.01)discard;
 float ry=abs(fract(p.y*10.+(p.y-.5)*p.x*4.)-.5)*2.;float rays=smoothstep(.55,.85,ry);
 float rim=smoothstep(tip-.12,tip-.02,p.x);
 vec3 col=mix(${L3('#ffb83a')},${L3('#ee3412')},smoothstep(.1,.9,p.x)*.85+.15*ns.g);
 vec3 c=styRampOf(col,.5+.3*rays+.15*rim)*1.08+${GOLD}*.25*rim;
 gl_FragColor=vec4(c,m*er*uA*(.38+.32*rays+.25*rim+.25*(1.-p.x)));}`;
// corona de agua del picado (cilindro abierto que sube y se erosiona)
const CROWN_FS=`uniform float uK;void main(){float v=vUv.y;vec4 ns=styNoise(vec2(vUv.x*3.,v*.6-uK*.4));
 float top=.5+.5*ns.r;float m=smoothstep(top,top-.15,v);float er=styErode(ns.g*.6+.4*v,uK*1.1-.12,.12);
 if(m*er<.02)discard;vec3 c=styRampOf(${WATER},.32+.55*v+.18*ns.b)+${GOLD}*.3*smoothstep(.45,1.,v)*(1.-uK);
 gl_FragColor=vec4(c,m*er*uA*.85);}`;
const ORB_FS=`uniform float uCr;void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));vec4 ns=styNoise(vP.xy*2.+.4);
 float crack=smoothstep(.06,0.,abs(ns.b-.5))*uCr;vec3 c=styRampOf(${L3('#7fd8ff')},.5+.4*fr)+${GOLD}*.4*fr+vec3(1.,.95,.8)*crack*1.5;
 gl_FragColor=vec4(c,(.55+.4*fr)*uA);}`;
defs.push({key:"sty_qcOranda",name:"Oranda (estilizado)",dur:3.2,ti:2.1,tier:3,pal:"Sty Acuático · Oranda",stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Invocación",0],["Travesía",0.3],["Danza",0.85],["Picado",1.8],["Explosión",2.1],["Escamas",2.35],["Calma",2.8]],
build(a){
  const L=a.L,TA=0.3,TD=0.85,TP=1.8,TI=2.1,TS=2.35,TC=2.8;
  const V0=V3(-2.7,1.3,0.4), DC=V3(3.4,2.9,0), BP=V3(3.25,1.25,0), DA=V3(2.5,2.9,0.6), dir=V3(1,0,0), pD=V3(0,0,0);
  const fish=new THREE.Group(); L.mesh.add(fish);
  const fm=S.mat(FISH_FS,{uGl:{value:0},uEr:{value:0}},{mode:'solid'});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.5,28,20),fm); body.scale.set(1.28,1.12,0.92); fish.add(body);
  // gorro (wen): racimo de bultos rojos sobre la cabeza
  const wenM=S.mat(WEN_FS,{},{mode:'solid'}), wenG=new THREE.IcosahedronGeometry(0.13,2);
  [[0.42,0.38,0,1.25],[0.55,0.28,0.17,1],[0.55,0.28,-0.17,1],[0.28,0.47,0.13,0.95],[0.28,0.47,-0.13,0.95],[0.62,0.12,0.22,0.8],[0.62,0.12,-0.22,0.8],[0.15,0.52,0,0.85],[0.67,0.3,0,0.9]]
    .forEach(([x,y,z,k])=>{const w=new THREE.Mesh(wenG,wenM);w.position.set(x,y,z);w.scale.setScalar(k);fish.add(w);});
  const finM=S.mat(FIN_FS,{uEr:{value:0}},{mode:'matter',side:THREE.DoubleSide});
  const veilM=S.mat(VEIL_FS,{uEr:{value:0},uWag:{value:0},uBend:{value:0}},{mode:'matter',side:THREE.DoubleSide,vertexShader:VEIL_VS});
  const veilG=new THREE.PlaneGeometry(1.75,1.0,16,8).translate(0.875,0,0);
  const tailP=new THREE.Group(); tailP.position.set(-0.5,0,0); fish.add(tailP);
  const tails=[0.55,-0.55,0].map((rx,i)=>{const m=new THREE.Mesh(veilG,veilM);m.rotation.x=rx;if(i==2)m.scale.set(0.85,0.8,1);m.renderOrder=2;tailP.add(m);return m;});
  const dorsal=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.55).translate(0.42,0,0),finM); dorsal.position.set(0.15,0.5,0); fish.add(dorsal);
  const pecA=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.26).translate(0.2,0,0),finM); pecA.position.set(0.18,-0.25,0.24); fish.add(pecA);
  const pecB=new THREE.Mesh(pecA.geometry,finM); pecB.position.set(0.18,-0.25,-0.24); fish.add(pecB);
  const analA=new THREE.Mesh(pecA.geometry,finM); analA.position.set(-0.35,-0.42,0.08); fish.add(analA);
  const crownM=S.mat(CROWN_FS,{uK:{value:0}},{mode:'matter',side:THREE.DoubleSide});
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(1,0.7,1,40,1,true).translate(0,0.5,0),crownM); crown.position.set(BP.x,0.02,BP.z); L.mesh.add(crown);
  const orbM=S.mat(ORB_FS,{uCr:{value:0}},{mode:'energy'});
  const orbs=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.17,16,12),orbM);L.mesh.add(m);return m;});
  const vortex=groundPlane(2.2,V0.x,0.03,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sw=fract(an/6.2832*3.+r*1.6-uT*1.8);float m=smoothstep(.2,.0,abs(sw-.5)-.18)*smoothstep(1.,.3,r)*smoothstep(0.,.2,r);
   if(m<.02)discard;gl_FragColor=vec4(styRampOf(${WATER},.4+.4*(1.-r)),m*uA*.85);}`,{},{mode:'matter'})); vortex.position.z=V0.z; L.decal.add(vortex);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.31,toCam:0.5});
  const ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.8);
  const wet=wetDecal(L.decal,3.2,3.4);
  const shadow=S.contactShadow(L.decal,1.2);
  const K=`const float TA=${f(TA)};const float TD=${f(TD)};const float TP=${f(TP)};const float TI=${f(TI)};const float TS=${f(TS)};const float TC=${f(TC)};
   const vec3 V0=${v3(V0)};const vec3 BP=${v3(BP)};const vec3 DC=${v3(DC)};`;
  // columna de agua de la invocación
  S.pts(L.part,24,VV+K+`void main(){float s=aSeed.x*(TA+.1);float age=(uT-s)/.35;float an=aSeed.y*6.28+age*7.;
   vec3 p=vec3(V0.x,0.,V0.z)+vec3(cos(an)*(.55-.3*age),age*1.5,sin(an)*(.55-.3*age));vR=an;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.22+.08*aSeed.z);}`,DROP_FS);
  // estela de burbujas detrás del pez (posición pasada desde la pose)
  const trail=[]; for(let i=0;i<8;i++)trail.push(V3(0,0,0));
  S.pts(L.part,40,VV+K+`uniform vec3 uTr[8];void main(){float k=aSeed.x*7.;int i=int(k);float fk=fract(k);
   vec3 p=mix(uTr[i],uTr[min(i+1,7)],fk)+rnd()*.18+vec3(0.,.25*k/7.,0.);float on=step(TA,uT)*(1.-step(TI,uT));
   vA=on*(1.-k/7.);vK=0.;vR=0.;put(p,(.1+.08*aSeed.z)*(1.-.4*k/7.));}`,BUBBLE_FS,{uniforms:{uTr:{value:trail}}});
  // explosión: corona de agua alta, espuma y escamas doradas
  S.pts(L.part,44,VV+K+splashVS('BP','TI',1.5,.8),DROP_FS);
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.35,0.));vec3 p=BP+d*(.35+1.3*(1.-exp(-t*5.)))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?.9:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.85+.3*aSeed.z)*(.6+.6*age));}`,FOAM_FS);
  S.pts(L.part,30,VV+K+`void main(){float s=TS-.2+aSeed.x*.55;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.2,0.))*(1.4+1.2*aSeed.z);vec3 p=BP+vec3(v.x,0.,v.z)*t+vec3(0.,v.y*t-2.6*t*t,0.)+vec3(sin(t*7.+aSeed.w*9.)*.15,0.,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.75,1.,age);vR=t*6.+aSeed.w*6.28;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:GOLD}));
  a.pose=function(te,o){
    const ia=te-TI, summ=ss(0,TA,te);
    caster.rotation.z=0.08*summ-0.12*ss(TA,TA+0.1,te);
    vortex.visible=te<TA+0.5; set(vortex,0,ss(0,0.1,te)*(1-ss(TA+0.1,TA+0.5,te))); vortex.scale.setScalar(Math.max(0.5+0.5*summ,0.001));
    fish.visible=te>0.15&&ia<0.04;
    fm.uniforms.uGl.value=0.35*(1-ss(0.15,TA+0.1,te))+0.25*ss(TP,TI,te);
    // trayectoria: emerge del remolino → arco al rival → danza en espiral → picado
    if(te<TA){fish.position.set(V0.x,0.3+1.0*summ,V0.z);fish.scale.setScalar(Math.max(back(ss(0.15,TA,te)),0.001));dir.set(0.3,1,0);}
    else if(te<TD){const k=(te-TA)/(TD-TA);arcJ(V0,DA,1.2,k,fish.position);fish.scale.setScalar(1);
      arcJ(V0,DA,1.2,cl(k+0.02),dir);dir.sub(fish.position);}
    else if(te<TP){const k=(te-TD)/(TP-TD);const an=Math.PI+k*Math.PI*2*1.25;const rad=0.95-0.25*k;
      fish.position.set(DC.x+Math.cos(an)*rad,DC.y+0.15*Math.sin(k*12),Math.sin(an)*rad*0.8);fish.scale.setScalar(1);
      dir.set(-Math.sin(an),0.05*Math.cos(k*12),Math.cos(an)*0.8);}
    else{const k=(te-TP)/(TI-TP);const an=Math.PI+Math.PI*2*1.25;pD.set(DC.x+Math.cos(an)*0.7,DC.y+0.4*ss(0,0.35,k),Math.sin(an)*0.56);
      fish.position.lerpVectors(pD,BP,k*k);fish.scale.setScalar(1);dir.copy(BP).sub(pD);}
    if(dir.lengthSq()>1e-6){dir.normalize();fish.quaternion.setFromUnitVectors(XA,dir);}
    const sw=Math.sin(te*9);tailP.rotation.set(0,Math.PI+0.22*sw,0);fish.scale.multiplyScalar(1.15);
    veilM.uniforms.uWag.value=te*9-0.9;veilM.uniforms.uBend.value=-0.35*Math.sin(te*9-1.2);veilM.uniforms.uA.value=1;
    analA.rotation.set(0,Math.PI*0.85,-0.5+0.15*sw);
    crown.visible=ia>=0&&ia<0.85;{const k=out3(ia/0.4);crown.scale.set(0.5+1.1*k,Math.max(2.2*k*(1-0.35*ss(0.4,0.85,ia)),0.001),0.5+1.1*k);
      crownM.uniforms.uK.value=ss(0.15,0.85,ia);crownM.uniforms.uA.value=1;}
    pecA.rotation.set(0.6,0.5+0.3*sw,0);pecB.rotation.set(-0.6,0.5-0.3*sw,0);dorsal.rotation.set(0,0,0.1*Math.sin(te*9));
    finM.uniforms.uA.value=1;
    // estela de burbujas (historial aproximado de la trayectoria)
    for(let i=0;i<8;i++){trail[i].copy(fish.position).addScaledVector(dir,-0.55-0.22*i);trail[i].y-=0.04*i;}
    // orbes de mejora arrancados del rival
    orbs.forEach((m,i)=>{const k=ia-0.05-i*0.08;m.visible=k>=0&&k<0.55;const sgn=i?1:-1;
      m.position.set(BP.x+sgn*0.25+sgn*0.7*out3(k/0.35),BP.y+0.5+1.1*out3(k/0.35),0.3*sgn);
      m.scale.setScalar(Math.max(1-ss(0.38,0.55,k),0.001));orbM.uniforms.uA.value=0.95;orbM.uniforms.uCr.value=ss(0.2,0.38,k);});
    spark.pose(ia,BP,1.1);
    ring.pose(ia,3.4,0,0.5); ring2.pose(ia-0.18,3.4,0,0.55,0.9);
    wet.visible=ia>=0; wet.scale.setScalar(0.5+0.5*out3(ia/0.3)); set(wet,ia>=0?-0.1+1.15*ss(0.6,1.1,ia):0,ia>=0?1:0);
    shadow.pose(fish.position.x,fish.position.z,1,te>TA&&ia<0?0.35*ss(TP,TI,te)+0.15:0);
    // rival: balanceo hipnótico durante la danza; golpe pesado con aplastamiento
    const dance=ss(TD,TD+0.2,te)*(1-ss(TP,TP+0.1,te)), hit=hitE(ia,4)*(ia>=0?1:0), sq=hitE(ia,8)*(ia>=0?1:0);
    target.position.x=3.4+0.3*hit; target.rotation.z=0.07*Math.sin(te*4)*dance-hit*0.3*Math.cos(ia*12);
    target.scale.set(1+0.09*sq,1-0.17*sq,1+0.09*sq);
    if(te<TA){o.g.copy(V0);o.gs=0.9*summ;o.ga=0.1*summ;o.li=1.5*summ;}
    else if(ia<0){o.g.copy(fish.position);o.gs=0.9+0.6*ss(TP,TI,te);o.ga=0.08+0.12*ss(TP,TI,te);o.li=1.4+2*ss(TP,TI,te);}
    else{o.g.copy(BP);o.gs=1.6+2.5*Math.min(ia,0.5);o.ga=0.3*Math.exp(-ia*8);o.li=5*Math.exp(-ia*4);}
    o.ia=ia; o.c.copy(BP); o.shake=1.5; o.dist=1.2; o.flash=0.5;
  };
}});

VFX.module("Estilizado · Acuático · Cuernos",defs);
})();

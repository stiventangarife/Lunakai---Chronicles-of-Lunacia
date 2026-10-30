// =====================================================================
// ESTILIZADO · STARTER · BING (Hito 101) — las 3 cartas α propias de Bing, hechas a mano con el kit vfx-stylized.js.
// Claves: sty_starter_bing_mouth (Puppy) · sty_starter_bing_horn (Toy Ball) · sty_starter_bing_back (Cone Shell) ·
//   Hito 102: sty_starter_bing_eyes (Puppy α ojos, aliado) · sty_starter_bing_ears (Puppy α orejas, enemigo).
// Mismos dur / ti / fases que mod-starter-bing.js, así el daño llega igual. Nivel 2 (2 PA), duraciones cortas de carta.
// Identidad: Bing es un cachorro Bestia de la Sabana (pelaje ámbar y naranja, crema, acento dorado). Sin caras ni ojos.
// Semántica (docs/VFX_PENDIENTES_BING_POMODORO_ENEMIGOS.md):
//   Puppy: 50–61 de daño cuerpo a cuerpo y +20 % de daño a todos los aliados (2 turnos) → dos mordiscos en media luna y
//          una onda dorada que sale de Bing por todo el campo (se lee igual en cualquier casilla, sin muñecos fijos).
//   Toy Ball: 45–55 de daño a 1–3 casillas y Provocación sobre Bing → pelota de goma que bota, golpea y vuelve; aro rojo.
//   Cone Shell: cura 60 a un aliado (alcance 0–3) → caracola que gira sobre el aliado y baja en espiral de agua y luz.
//          Se dibuja sobre el objetivo (receiver:'target'); lanzada sobre sí misma, el puente la lleva al lanzador.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_PUPPY=pal("Sty Bing · Cachorro",["#ffc35a","#d4531a"]);
const P_BALL=pal("Sty Bing · Pelota",["#ffb347","#c8321c"]);
const P_SHELL=pal("Sty Bing · Caracola",["#9ff0d0","#1f9a8a"]);

// colores de materia en espacio lineal (THREE.Color convierte el hex sRGB)
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const AMBER=lin(0xd9822b), AMBERD=lin(0x8a3a12), IVORY=lin(0xf3e6c8), DARK=lin(0x2a1a14), EARTH=lin(0xa88860),
  RUBBER=lin(0xe0562a), RUBBERD=lin(0x8f2414), CREAM=lin(0xf4dfb0), GOLD=lin(0xf0b43c), REDT=lin(0xe0442a),
  NACRE=lin(0xd2482e), NACRED=lin(0x5a1426), WATER=lin(0x2fb7b0), HEALG=lin(0x6fd86f);

const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7;
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const COLMIX=new THREE.Color(), GOLDC=new THREE.Color(1,0.72,0.25), HEALC=new THREE.Color(0.42,1,0.55), TAUNTC=new THREE.Color(1,0.3,0.16);

// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.06,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// media luna de mordisco (plano): banda de pelaje con contorno oscuro y colmillos de marfil en el borde interior; uEr = erosión
const BITE_FS=`uniform float uEr;void main(){vec2 p=(vUv-.5)*2.;
 float ro=length(p);vec2 c=vec2(0.,-.62);float ri=length(p-c);
 float band=smoothstep(.97,.92,ro)*smoothstep(1.06,1.12,ri)*step(-.25,p.y);
 float an=atan(p.y-c.y,p.x-c.x);float tf=fract(an/3.1416*7.+.5);float tl=.2*(1.-abs(tf-.5)*2.);
 float tooth=step(ri,1.09)*step(1.09-tl*1.4,ri)*step(-.2,p.y)*step(abs(p.x),.8);
 float m=max(band,tooth);if(m<.05)discard;float nz=styNoise(vec2(an*2.,ro*3.)).g;
 if(styErode(nz*.6+m*.4,uEr,.08)<.5)discard;
 float edge=smoothstep(.9,.95,ro)+smoothstep(1.16,1.1,ri)*band;
 vec3 fur=styRampOf(${AMBER},.3+.4*nz+.25*smoothstep(.0,.6,p.y));fur=mix(fur,${DARK},clamp(edge,0.,1.)*.8);
 vec3 col=band<.5?styRampOf(${IVORY},.55+.35*(ri-.8)*4.):fur;
 gl_FragColor=vec4(col*styTint(.6),1.);}`;
// chevrón hacia arriba (potenciado), materia con contorno
const UPCHEV=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=q.y;float d=abs(y+.1-abs(q.x)*.9);
 float a=smoothstep(.11,.07,d)*step(abs(q.x),.38)*vA;if(a<.01)discard;float ou=smoothstep(.07,.1,d);
 gl_FragColor=vec4(mix(styRampOf(${col},.8),${DARK},ou*.8),a);}`;
// cruz de curación (energía)
const PLUS_FS=S.PV+`void main(){vec2 q=styPC()-.5;float m=max(step(abs(q.x),.1)*step(abs(q.y),.33),step(abs(q.y),.1)*step(abs(q.x),.33));
 if(m<.5||vA<.01)discard;gl_FragColor=vec4(styRampOf(${HEALG},.75+.25*step(abs(q.x),.05))*1.15,vA);}`;
// onda de pincel ancha en el suelo (borde con trazo); uP = vida, color fijo
const WAVE_FS=col=>`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float w=.05+.025*styNoise(vec2(an*2.,uP*3.)).r;float m=smoothstep(w,0.,abs(r-.9))+smoothstep(.2,0.,abs(r-.9))*.25;
 if(m<.03)discard;float er=styErode(m*.5+styNoise(vec2(an*3.,r)).g*.5,uP,.15);
 gl_FragColor=vec4(styRampOf(${col},.55+.4*m)*1.25,m*er*uA);}`;
// mancha de tierra / agua en el suelo
const STAIN=(col,alpha=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.15+.3*n),m*er*uA*${f(alpha)});}`;
const defs=[];

// =====================================================================
// 1 · PUPPY — Bing se agacha y salta; dos medias lunas de mordisco (pelaje ámbar, colmillos de marfil) se cierran sobre
//     el rival, «ñam» a 0,2 s y el fuerte a 0,35 s, con mechones y esquirlas. Al volver, una onda dorada sale de Bing y
//     cruza el campo (+20 % de daño a los aliados) con chevrones rojo-dorados subiendo sobre él. ti 0,35 s
// =====================================================================
defs.push({key:"sty_starter_bing_mouth",name:"Puppy (estilizado)",dur:0.8,ti:0.35,pal:P_PUPPY,tier:2,stylized:true,
  zoneCaster:0.5,zoneTarget:1.3,
  phases:[["Salto",0],["Ñam",0.2],["Regreso",0.4],["Potenciado",0.5]],
build(a){
  const L=a.L,T1=0.2,TI=0.35,TP=0.45;
  const geo=new THREE.PlaneGeometry(1.6,1.6);
  const mk=()=>{const m=new THREE.Mesh(geo,S.mat(BITE_FS,{uEr:{value:-1}},{mode:'matter',side:THREE.DoubleSide}));L.mesh.add(m);return m;};
  const up=mk(), lo=mk();
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.31}), spark2=S.hitSpark(L.mesh,1.0,{seed:0.67});
  const ring=S.groundRing(L.decal,2.4);
  const wave=groundPlane(1,CX,0.035,S.mat(WAVE_FS(GOLD),{},{mode:'energy'})); L.decal.add(wave);
  const wave2=groundPlane(1,CX,0.036,S.mat(WAVE_FS(REDT),{},{mode:'energy'})); L.decal.add(wave2);
  const K=`const float T1=${f(T1)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 HC=${v3(TC)};`;
  // mechones de pelaje y esquirlas de marfil en cada mordisco
  S.pts(L.part,20,VV+K+`void main(){float s=aSeed.x<.4?T1:TI;float t=uT-s;vec3 r=rnd();
   vec3 dir=normalize(vec3(r.x*.6-.3,abs(r.y)*.9+.25,r.z));vec3 p=HC+dir*(t*(2.2+1.4*aSeed.z))+vec3(0.,-t*t*5.,0.);
   vA=(t>0.&&t<.42)?1.:0.;vK=smoothstep(.12,.42,t);vR=aSeed.w*6.28+t*8.;put(p,(.22+.14*aSeed.z)*(s==TI?1.25:.9));}`,
   S.MATTER_FS(C.puff,{relief:4,col:AMBER,bias:-.05}));
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x<.4?T1:TI;float t=uT-s;vec3 r=rnd();
   vec3 dir=normalize(vec3(r.x*.4-.5,r.y*.8+.4,r.z));vec3 p=HC+dir*t*(3.4+1.5*aSeed.z)+vec3(0.,-t*t*6.,0.);
   vA=(t>0.&&t<.3)?1.:0.;vK=smoothstep(.1,.3,t);vR=aSeed.w*6.28;put(p,.16+.08*aSeed.z);}`,
   S.MATTER_FS(C.shard,{relief:5,col:IVORY,bias:.05}));
  // chevrones de potenciado sobre Bing
  S.pts(L.part,6,VV+K+`void main(){float i=mod(float(gl_VertexID),6.);float s=TP+.04*i;float age=(uT-s)/.32;
   float an=i*1.047+.3;vec3 p=vec3(${f(CX)}+cos(an)*.55,.55+age*1.5,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.42);}`,UPCHEV(lin(0xf06a2a)));
  // motas doradas que salen con la onda
  S.pts(L.part,26,VV+K+`void main(){float t=uT-TP;float an=aSeed.x*6.2832;float rad=.4+t*9.*(.85+.3*aSeed.y);
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.15+.5*aSeed.z+t*.8,sin(an)*rad);vA=(t>0.&&t<.32)?1.-t/.32:0.;vK=0.;vR=0.;put(p,.2+.1*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    // salto: agacharse, lanzarse medio paso, volver
    const lunge=ss(0.05,0.18,te)*(1-ss(TI+0.05,0.55,te));
    caster.position.x=CX+0.55*lunge; caster.position.y=0.18*Math.sin(Math.PI*cl((te-0.05)/0.3))*(te>0.05?1:0);
    const crouch=ss(0,0.05,te)*(1-ss(0.05,0.12,te)); caster.scale.set(1+0.08*crouch,1-0.1*crouch,1+0.08*crouch);
    // mordiscos: abrir → cerrar en T1, reabrir, cerrar fuerte en TI
    const open=te<T1?1-ss(0.08,T1,te):te<TI?Math.sin(Math.PI*cl((te-T1)/(TI-T1)))*0.8:0;
    const vis=ss(0.04,0.1,te)>0&&te<0.62;
    const er=-0.1+1.1*ss(TI+0.1,0.6,te);
    const k=0.9+0.25*ss(T1,TI,te);
    for(const [m,s] of [[up,1],[lo,-1]]){
      m.visible=vis; towardCam(m.position,tmp.copy(TC),0.7); billboard(m,0);
      m.position.y+=s*(0.02+0.55*open); m.rotateZ(s>0?0:Math.PI); m.rotateZ(0.14*s);
      m.scale.set(1.45*k,0.75*k,1); m.material.uniforms.uEr.value=er;
    }
    spark.pose(te-T1,tmp2.copy(TC),0.7); spark2.pose(ia,tmp2.copy(TC),1.1);
    ring.pose(ia,TX,0,0.42,1);
    // onda dorada (equipo) y roja interior
    const wp=cl((te-TP)/0.34), wp2=cl((te-TP-0.05)/0.3);
    wave.visible=te>TP&&wp<1; wave.scale.setScalar(Math.max(0.8+13*(1-Math.pow(1-wp,2)),0.001)); set(wave,0.05+0.9*wp,1);
    wave2.visible=te>TP+0.05&&wp2<1; wave2.scale.setScalar(Math.max(0.6+4*(1-Math.pow(1-wp2,2)),0.001)); set(wave2,0.05+0.9*wp2,1);
    const hit=hitE(ia,14), hit1=hitE(te-T1,16);
    target.position.x=TX+0.14*hit+0.07*hit1; target.scale.set(1+0.06*hit,1-0.08*hit,1+0.06*hit);
    glowOf(caster,GOLDC,0.5*ss(TP,TP+0.06,te)*(1-ss(TP+0.12,0.75,te)));
    o.em=0.5*hit+0.3*hit1; o.emc.setRGB(1,0.55,0.25);
    o.g.copy(TC); o.gs=0.9; o.ga=0.14*Math.max(hit,hit1); o.li=1.5+3*Math.max(hit,hit1);
    o.ia=ia; o.c.copy(TC); o.shake=0.18*hit; o.dist=0; o.flash=0.25;
  };
}});

// =====================================================================
// 2 · TOY BALL — una pelota de goma (naranja con banda crema y costura oscura) sale del cuerno, bota una vez a medio
//     camino con polvo y aplastamiento, y golpea al rival; rebota de vuelta hacia Bing y se deshace en su mano, y queda
//     el aro rojo de Provocación sobre Bing. ti 0,4 s
// =====================================================================
defs.push({key:"sty_starter_bing_horn",name:"Toy Ball (estilizado)",dur:0.8,ti:0.4,pal:P_BALL,tier:2,stylized:true,
  zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Saque",0],["Botes",0.12],["Golpe",0.4],["Rebote",0.44],["Provocación",0.62]],
build(a){
  const L=a.L,TS=0.12,TI=0.4,TB=0.44,TT=0.62;
  const H0=V3(-3.35,1.75,0.1), BP=V3(-0.2,0.3,0.15), HIT=V3(3.05,1.25,0.05);
  const BOUNCE_T=TS+(TI-TS)*0.48;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.4,28,20),S.mat(SOLID(`vec3 q=normalize(vP);
   float band=smoothstep(.2,.16,abs(q.y));float seam=smoothstep(.035,0.,abs(abs(q.y)-.2));
   float pole=smoothstep(.85,.9,abs(q.x));
   base=mix(${RUBBER},${CREAM},band);base=mix(base,${RUBBERD},seam*.9+pole*.6);lb=-.12*seam;`,{hot:'vec3(1.,.45,.15)',rim:.35}),
   {uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(ball); const bU=ball.material.uniforms;
  const shadow=S.contactShadow(L.decal,0.9);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.52});
  const ring=S.groundRing(L.decal,2.6), bring=S.groundRing(L.decal,1.6);
  const dust=groundPlane(1.4,BP.x,0.025,S.mat(STAIN(EARTH,.45),{},{mode:'matter'})); L.decal.add(dust);
  const taunt=S.status(a,'taunt',[caster],TT,0.8);
  const K=`const float TI=${f(TI)};const float BT=${f(BOUNCE_T)};const vec3 HP=${v3(HIT)};const vec3 BP=${v3(BP)};`;
  // polvo del bote y del golpe
  S.pts(L.part,22,VV+K+`void main(){bool b=aSeed.x<.45;float t=uT-(b?BT:TI);vec3 r=rnd();vec3 o=b?BP:vec3(${f(TX)},.2,0.);
   float an=aSeed.y*6.2832;vec3 p=o+vec3(cos(an)*(.25+t*2.2),.1+t*(.8+.6*aSeed.z),sin(an)*(.2+t*1.8));
   vA=(t>0.&&t<.38)?1.:0.;vK=smoothstep(.1,.38,t);vR=aSeed.w*6.28+t*2.;put(p,(.36+.2*aSeed.z)*(.6+t*2.));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.05}));
  // trocitos de goma y chispas naranjas en el golpe
  S.pts(L.part,12,VV+K+`void main(){float t=uT-TI;vec3 r=rnd();vec3 dir=normalize(vec3(-abs(r.x)*.8-.2,r.y*.8+.5,r.z));
   vec3 p=HP+dir*t*(3.6+1.4*aSeed.z)+vec3(0.,-t*t*7.,0.);vA=(t>0.&&t<.32)?1.:0.;vK=smoothstep(.12,.32,t);
   vR=aSeed.w*6.28+t*10.;put(p,.17+.09*aSeed.z);}`,S.MATTER_FS(C.shard,{relief:5,col:RUBBER,bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI;
    let p=tmp, sq=0, vis=te>0.02&&te<TT+0.04, sz=1;
    if(te<TS){const u=te/TS; p.copy(H0).add(tmp2.set(0.15*u,0.25*Math.sin(u*Math.PI*0.5),0)); sz=0.35+0.65*ss(0,1,u);}
    else if(te<TI){const u=(te-TS)/(TI-TS);
      if(u<0.48){const s=u/0.48; p.lerpVectors(H0,BP,s); p.y=H0.y+(BP.y-H0.y)*s+1.1*Math.sin(Math.PI*s)*(1-s*0.4);}
      else{const s=(u-0.48)/0.52; p.lerpVectors(BP,HIT,s); p.y=BP.y+(HIT.y-BP.y)*s+1.5*Math.sin(Math.PI*s);}
    }else if(te<TT){const s=(te-TI)/(TT-TI); p.lerpVectors(HIT,H0,s); p.y=HIT.y+(H0.y-HIT.y)*s+1.9*Math.sin(Math.PI*s); sz=1-0.5*ss(0.75,1,s);}
    else p.copy(H0);
    // aplastamiento en el bote y en el golpe
    sq=Math.max(hitE(te-BOUNCE_T,18)*(te>=BOUNCE_T?1:0),hitE(ia,20)*(ia>=0?1:0));
    ball.visible=vis; ball.position.copy(p); ball.rotation.z=-te*18; ball.rotation.x=te*5;
    ball.scale.set(sz*(1+0.35*sq),sz*(1-0.38*sq),sz*(1+0.35*sq));
    bU.uQ.value=te>TT-0.08?-0.1+1.1*ss(TT-0.08,TT+0.04,te):-1; bU.uK.value=0.5*hitE(ia,10);
    shadow.pose(p.x,p.z,0.5+0.5*sz,vis?0.55*(1-cl((p.y-0.3)/2.4)):0);
    spark.pose(ia,tmp2.copy(HIT),1); ring.pose(ia,TX,0,0.42,1); bring.pose(te-BOUNCE_T,BP.x,BP.z,0.3,0.8);
    dust.visible=te>BOUNCE_T; set(dust,ss(BOUNCE_T,0.7,te)*0.9+0.05,te>BOUNCE_T?1:0);
    const hit=hitE(ia,14);
    target.position.x=TX+0.16*hit; target.scale.set(1+0.07*hit,1-0.09*hit,1+0.07*hit);
    caster.rotation.z=0.06*Math.sin(te*30)*ss(TT-0.05,TT,te)*(1-ss(TT,0.8,te));
    const env=taunt.pose(te);
    o.em=0.55*hit; o.emc.setRGB(1,0.5,0.2);
    if(env>0.01){glowOf(caster,TAUNTC,0.35*env);}else glowOf(caster,GOLDC,0);
    o.g.copy(HIT); o.gs=0.9; o.ga=0.14*hit; o.li=1.4+3*hit;
    o.ia=ia; o.c.copy(HIT); o.shake=0.16*hit; o.dist=0; o.flash=0.25;
  };
}});

// =====================================================================
// 3 · CONE SHELL (aliado) — una caracola cónica de nácar (crema y coral con espiral oscura) aparece girando sobre el
//     aliado, con la punta hacia abajo; de la punta baja una espiral de agua turquesa y luz que lo envuelve hasta los
//     pies; al llegar (0,55 s) cura: cruces verdes que suben, anillo en el suelo y brillo verde. Después la caracola se
//     deshace en espuma. ti 0,55 s
// =====================================================================
defs.push({key:"sty_starter_bing_back",name:"Cone Shell (estilizado)",dur:0.9,ti:0.55,pal:P_SHELL,tier:2,stylized:true,receiver:'target',
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Caracola",0],["Espiral",0.18],["Curación",0.55],["Disipación",0.72]],
build(a){
  const L=a.L,TA=0.18,TI=0.55,TD=0.72;
  const SH=V3(TX,2.75,0);
  const shell=new THREE.Mesh(new THREE.ConeGeometry(0.42,1.15,28,8),S.mat(SOLID(`vec3 q=vP;float h=q.y/1.15+.5;
   float an=atan(q.z,q.x)/6.2832;float sp=fract(an*2.+h*4.);float line=smoothstep(.09,0.,.5-abs(sp-.5));
   float rib=.5+.5*sin(an*6.2832*11.);
   base=mix(${NACRE},${NACRED},.25+.5*(1.-h));base=mix(base,${DARK},line*.75);lb=.06*rib-.1*line;`,{hot:"vec3(.25,.6,.5)",rim:.15}),
   {uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  shell.rotation.x=Math.PI; L.mesh.add(shell); const sU=shell.material.uniforms;
  const ring=S.groundRing(L.decal,2.6);
  const pool=groundPlane(1.8,TX,0.024,S.mat(STAIN(WATER,.4),{},{mode:'matter'})); L.decal.add(pool);
  const K=`const float TA=${f(TA)};const float TI=${f(TI)};const vec3 SH=${v3(SH)};const vec3 AC=vec3(${f(TX)},0.,0.);`;
  // espiral de agua (materia turquesa) y de luz (energía), de la punta a los pies
  S.pts(L.part,34,VV+K+`void main(){float lag=aSeed.x*.22;float u=clamp((uT-TA-lag)/(TI-TA-.05),0.,1.);
   float an=aSeed.y*.6+u*9.5;float rad=mix(.12,.72,smoothstep(0.,.35,u));vec3 p=AC+vec3(cos(an)*rad,mix(SH.y-.45,.15,u),sin(an)*rad*.9);
   vA=(uT>TA+lag&&u<1.)?1.:0.;vK=smoothstep(.8,1.,u);vR=an;put(p,.34+.14*aSeed.z);}`,
   S.MATTER_FS(C.drop,{relief:4,col:WATER,bias:.08}));
  S.pts(L.part,22,VV+K+`void main(){float lag=aSeed.x*.2+.03;float u=clamp((uT-TA-lag)/(TI-TA-.05),0.,1.);
   float an=aSeed.y*.6+u*9.5+3.1416;float rad=mix(.1,.58,smoothstep(0.,.35,u));vec3 p=AC+vec3(cos(an)*rad,mix(SH.y-.45,.2,u),sin(an)*rad*.9);
   vA=(uT>TA+lag&&u<1.)?.9:0.;vK=0.;vR=0.;put(p,.18+.08*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.}),{mode:'energy'});
  // cruces de curación y espuma al deshacerse la caracola
  S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.14;float age=(uT-s)/.32;float an=aSeed.y*6.2832;
   vec3 p=AC+vec3(cos(an)*.48,.4+age*1.6,sin(an)*.42);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.1*aSeed.z);}`,PLUS_FS,{mode:'energy'});
  S.pts(L.part,14,VV+K+`void main(){float t=uT-${f(TD)};vec3 r=rnd();vec3 p=SH+r*.35+vec3(0.,t*.8,0.);
   vA=(t>0.&&t<.18)?1.:0.;vK=smoothstep(.05,.18,t);vR=aSeed.w*6.28;put(p,.24+.1*aSeed.z);}`,
   S.MATTER_FS(C.puff,{relief:3,col:lin(0xbfeee4),bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI;
    const app=ss(0.0,0.16,te);
    shell.visible=te<0.9; shell.position.set(SH.x,SH.y+0.25*(1-app)+0.05*Math.sin(te*12),SH.z);
    shell.rotation.set(Math.PI,te*14,0.12*Math.sin(te*9)); shell.scale.setScalar(Math.max(0.3+0.7*app,0.001));
    sU.uQ.value=te<0.16?1-1.6*ss(0,0.16,te):-0.1+1.1*ss(TD,0.9,te); sU.uK.value=0.35*ss(TA,TI,te)*(1-ss(TI,TD,te));
    ring.pose(ia,TX,0,0.4,1);
    pool.visible=te>0.35; set(pool,0.05+0.9*ss(TI+0.1,0.9,te),ss(0.35,TI,te));
    const h=ss(TI-0.04,TI+0.04,te)*(1-ss(TI+0.12,0.88,te));
    glowOf(target,HEALC,0.55*h);
    o.em=0; o.emc.setRGB(0.4,1,0.6);
    o.g.set(TX,1.2,0); o.gs=0.9; o.ga=0.1+0.12*h; o.li=1.2+2*h;
    o.ia=ia; o.c.set(TX,1.1,0); o.shake=0; o.dist=0; o.flash=0.2;
  };
}});


// =====================================================================
// Hito 102 · cartas α que antes usaban el efecto de su carta base (con otro objetivo) y caían en el lanzador
// =====================================================================
const GOLDD=lin(0x9a5a14), EMP=lin(0xf0542a);
// destello de mirada (dos almendras de energía; nada de globos oculares)
const GLINT_FS=col=>`uniform float uQ;uniform float uK;void main(){vec2 p=(vUv-.5)*2.;
 float w=.34*(1.-p.x*p.x)*(1.-uQ*.85);float alm=smoothstep(w+.05,w-.02,abs(p.y))*step(abs(p.x),1.);
 float core=smoothstep(w*.6,0.,abs(p.y))*smoothstep(.85,0.,abs(p.x+.1));
 float streak=exp(-abs(p.y)*28.)*smoothstep(1.,.15,abs(p.x))*(.55+.45*uK);
 vec2 q=(p-vec2(-.35,.3))*vec2(.6,1.);float st=max(exp(-abs(q.x)*26.)*smoothstep(.4,0.,abs(q.y)),exp(-abs(q.y)*26.)*smoothstep(.4,0.,abs(q.x)))*uK;
 float m=alm*.6+core+streak*.9+st;if(m<.02)discard;vec3 c=styRampOf(${col},.4+.55*core)*(1.+.7*core*uK);
 gl_FragColor=vec4(c,min(m,1.)*uA);}`;
function mkGlints(L,col){
  const ms=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.57,0.28),S.mat(GLINT_FS(col),{uQ:{value:0},uK:{value:0}},{mode:'energy',side:THREE.DoubleSide,depthTest:false}));
    m.renderOrder=3;L.mesh.add(m);return m;});
  const R=V3(1,0,0), P=V3(0,0,0);
  return {pose(a,lid,k,sc){P.set(caster.position.x+0.3,caster.position.y+1.62,caster.position.z);towardCam(P,P,0.45);
    R.set(1,0,0).applyQuaternion(VFX.camera.quaternion);
    ms.forEach((m,i)=>{const sd=i?1:-1;m.position.copy(P).addScaledVector(R,sd*0.17*sc);billboard(m,sd*-0.12);
      m.scale.set(sd*Math.max(sc,0.001),Math.max(sc,0.001),1);m.visible=a>0.002;const u=m.material.uniforms;u.uA.value=a;u.uQ.value=lid;u.uK.value=k;});}};
}
// huella de pata (partícula): almohadilla + 4 dedos, materia con borde oscuro
const PAW_P=S.PV+`void main(){vec2 q=(styPC()-.5)*2.3;
 float pad=length((q-vec2(0.,-.2))*vec2(1.,1.22))-.44;
 float d=min(pad,min(min(length(q-vec2(-.46,.2))-.17,length(q-vec2(-.16,.45))-.18),min(length(q-vec2(.16,.45))-.18,length(q-vec2(.46,.2))-.17)));
 float m=smoothstep(.05,-.02,d);if(m*vA<.05)discard;float rim=smoothstep(-.16,-.03,d);
 vec3 c=mix(${GOLD}*1.15,${GOLDD},rim);c+=${GOLD}*.5*(1.-smoothstep(0.,.5,length(q-vec2(-.1,-.05))));
 gl_FragColor=vec4(c,m*vA);}`;
// sello de pata en el suelo (materia color miel, contorno oscuro)
const PAWSEAL_FS=`void main(){vec2 q=(vUv-.5)*2.6;q=vec2(q.y,-q.x);
 float pad=length((q-vec2(0.,-.2))*vec2(1.,1.2))-.44;
 float d=min(pad,min(min(length(q-vec2(-.46,.2))-.17,length(q-vec2(-.16,.45))-.18),min(length(q-vec2(.16,.45))-.18,length(q-vec2(.46,.2))-.17)));
 float n=styNoise(vUv*.9+.5).r;float ring=smoothstep(.05,0.,abs(length(q)-1.05-.04*n))*.9;
 float m=max(smoothstep(.05,-.02,d),ring);if(m<.02)discard;float edge=max(smoothstep(-.14,-.02,d)*step(d,.02),ring*.6);
 float er=styErode(n,uP,.12);vec3 c=mix(styRampOf(${GOLD},.62+.2*n),styRampOf(${GOLDD},.18),edge);
 gl_FragColor=vec4(c,m*er*uA*.95);}`;
// media luna de sonido (ladrido): banda dorada con contorno oscuro; uQ = erosión
const ARC_FS=`uniform float uQ;void main(){vec2 p=(vUv-.5)*2.;float r=length(p-vec2(-.6,0.));
 float band=smoothstep(.24,.1,abs(r-1.))*smoothstep(.95,.3,abs(p.y));if(band<.03)discard;
 float nz=styNoise(p*.7+vec2(uQ*2.,0.)).r;if(styErode(band*.5+nz*.5,uQ,.12)<.5)discard;
 float edge=smoothstep(.12,.2,abs(r-1.));vec3 c=mix(styRampOf(${GOLD},.72+.2*nz),${GOLDD},edge*.9);
 gl_FragColor=vec4(c,band*uA);}`;

// =====================================================================
// 4 · PUPPY α (OJOS, aliado 0–3) — cura 5 y +20 % de daño al aliado: dos destellos de mirada en Bing; sus brillos se
//     vuelven dos huellas doradas que saltan en arco hasta el ALIADO y se le meten en el pecho (0,55 s). Allí: sello de
//     pata de miel en el suelo, cruces verdes (cura) y chevrones rojo-naranja subiendo (potenciado). ti 0,55 s
// =====================================================================
defs.push({key:"sty_starter_bing_eyes",name:"Puppy α · ojos (estilizado)",dur:1.2,ti:0.55,pal:P_PUPPY,tier:1,stylized:true,receiver:'target',
  zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Mirada",0],["Huellas",0.18],["Curación",0.55],["Potenciado",0.62],["Fin",1.0]],
build(a){
  const L=a.L,TB=0.18,TI=0.55,TP=0.62;
  const eyes=mkGlints(L,lin(0xffb85a));
  const seal=groundPlane(2.6,TX,0.026,S.mat(PAWSEAL_FS,{},{mode:'matter'})); L.decal.add(seal);
  const ring=S.groundRing(L.decal,2.6), flash=S.hitSpark(L.mesh,1.0,{seed:0.37});
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 FC=vec3(${f(CX+0.3)},1.62,0.);const vec3 AC=vec3(${f(TX)},1.05,0.);`;
  // dos huellas doradas: de los ojos de Bing al pecho del aliado
  S.pts(L.part,2,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s=TB+i*.06;float u=clamp((uT-s)/(TI-TB-.06),0.,1.);
   vec3 a0=FC+vec3(.1,.05,(i-.5)*.35),a1=AC+vec3(0.,.1,(i-.5)*.3);vec3 p=mix(a0,a1,u*u*(3.-2.*u));
   p.y+=1.5*sin(u*3.14159);p.z+=(i-.5)*.6*sin(u*3.14159);
   vA=(uT>s&&u<.98)?1.:0.;vK=0.;vR=sin(uT*9.+i)*.4;put(p,1.55*(1.-.25*u));}`,PAW_P,{mode:'matter',depthTest:false});
  // estela de chispas doradas detrás de cada huella
  S.pts(L.part,26,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s0=TB+i*.06;float s=s0+aSeed.y*(TI-TB-.1);
   float u=clamp((s-s0)/(TI-TB-.06),0.,1.);float age=(uT-s)/.2;vec3 a0=FC+vec3(.1,.05,(i-.5)*.35),a1=AC+vec3(0.,.1,(i-.5)*.3);
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+rnd()*.06;p.y+=1.5*sin(u*3.14159);p.z+=(i-.5)*.6*sin(u*3.14159);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vR=0.;put(p,.2);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // cruces de curación en el aliado
  S.pts(L.part,8,VV+K+`void main(){float s=TI+aSeed.x*.16;float age=(uT-s)/.4;float an=aSeed.y*6.2832;
   vec3 p=vec3(${f(TX)}+cos(an)*.5,.45+age*1.5,sin(an)*.42);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.32+.1*aSeed.z);}`,PLUS_FS,{mode:'energy'});
  // chevrones de potenciado subiendo alrededor del aliado
  S.pts(L.part,6,VV+K+`void main(){float i=mod(float(gl_VertexID),6.);float s=TP+.05*i;float age=(uT-s)/.36;
   float an=i*1.047+.3;vec3 p=vec3(${f(TX)}+cos(an)*.6,.5+age*1.5,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.44);}`,UPCHEV(EMP));
  // motas de miel que suben
  S.pts(L.part,18,VV+K+`void main(){float s=TI+.05+aSeed.x*.4;float age=(uT-s)/(.5+aSeed.y*.25);float an=aSeed.z*6.2832+age*2.;
   vec3 p=vec3(${f(TX)}+cos(an)*.6,.15+age*1.4,sin(an)*.5);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.5,1.,age);
   vR=aSeed.w*6.28;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:3,col:GOLD,bias:-.02}));
  a.pose=function(te,o){
    const ia=te-TI, op=ss(0,TB,te);
    const blink=Math.exp(-Math.pow((te-0.12)/0.03,2));
    eyes.pose(ss(0,0.05,te)*(1-ss(0.3,0.5,te)),blink*0.9,0.6+0.4*Math.sin(te*22),1.05*op);
    flash.pose(ia,tmp.set(TX,1.1,0),0.7); ring.pose(ia,TX,0,0.45,1);
    seal.visible=ia>=0; seal.scale.setScalar(0.6+0.4*ss(0,0.12,ia)); set(seal,-0.1+1.15*ss(0.35,0.62,ia),1);
    caster.rotation.z=-0.05*ss(0,TB,te)*(1-ss(TI-0.1,TI+0.1,te));
    const h=ss(TI-0.03,TI+0.05,te)*(1-ss(TI+0.3,1.1,te));
    glowOf(target,COLMIX.copy(HEALC).lerp(TAUNTC,ss(TP,TP+0.15,te)),0.55*h);
    target.scale.y=1+0.05*hitE(ia,9);
    o.em=0; o.emc.setRGB(1,0.7,0.35);
    o.g.set(TX,1.1,0); o.gs=0.9; o.ga=0.1*h; o.li=1.2+2*h;
    o.ia=ia; o.c.set(TX,1.05,0); o.shake=0; o.dist=0; o.flash=0.15;
  };
}});

// =====================================================================
// 5 · PUPPY α (OREJAS, enemigo 1–2) — 45–55 de daño y cura 12 a todos los aliados: Bing toma aire y ladra; tres medias
//     lunas doradas de sonido cruzan hasta el rival y lo golpean (0,42 s) con chispa, polvo y retroceso. Después una onda
//     dorada y verde sale de Bing por todo el campo (cura al equipo) con cruces subiendo sobre él. ti 0,42 s
// =====================================================================
defs.push({key:"sty_starter_bing_ears",name:"Puppy α · orejas (estilizado)",dur:1.2,ti:0.42,pal:P_PUPPY,tier:2,stylized:true,
  zoneCaster:0.5,zoneTarget:1.2,
  phases:[["Aire",0],["Ladrido",0.18],["Golpe",0.42],["Cura",0.58],["Fin",1.0]],
build(a){
  const L=a.L,TB=0.18,TI=0.42,TH=0.58;
  const MOUTH=V3(CX+0.45,1.25,0.1);
  const arcs=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(ARC_FS,{uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide}));L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.58}), ring=S.groundRing(L.decal,2.6);
  const wave=groundPlane(1,CX,0.035,S.mat(WAVE_FS(GOLD),{},{mode:'energy'})); L.decal.add(wave);
  const wave2=groundPlane(1,CX,0.036,S.mat(WAVE_FS(HEALG),{},{mode:'energy'})); L.decal.add(wave2);
  const dust=groundPlane(1.6,TX,0.024,S.mat(STAIN(EARTH,.45),{},{mode:'matter'})); L.decal.add(dust);
  const K=`const float TI=${f(TI)};const float TH=${f(TH)};const vec3 HC=${v3(TC)};`;
  // esquirlas doradas y polvo en el golpe
  S.pts(L.part,16,VV+K+`void main(){float t=uT-TI;vec3 r=rnd();vec3 dir=normalize(vec3(abs(r.x)*.7+.2,r.y*.8+.45,r.z));
   vec3 p=HC+dir*t*(3.+1.4*aSeed.z)+vec3(0.,-t*t*6.,0.);vA=(t>0.&&t<.32)?1.:0.;vK=smoothstep(.1,.32,t);vR=aSeed.w*6.28;put(p,.17+.08*aSeed.z);}`,
   S.MATTER_FS(C.shard,{relief:5,col:GOLD,bias:.05}));
  S.pts(L.part,14,VV+K+`void main(){float t=uT-TI;float an=aSeed.y*6.2832;vec3 p=vec3(${f(TX)}+cos(an)*(.3+t*2.),.12+t*(.7+.5*aSeed.z),sin(an)*(.25+t*1.6));
   vA=(t>0.&&t<.4)?1.:0.;vK=smoothstep(.1,.4,t);vR=aSeed.w*6.28;put(p,(.34+.2*aSeed.z)*(.6+t*2.));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.05}));
  // cruces de cura sobre Bing y en el frente de la onda
  S.pts(L.part,12,VV+K+`void main(){float s=TH+aSeed.x*.2;float age=(uT-s)/.42;bool front=aSeed.z>.5;float an=aSeed.y*6.2832;
   float rad=front?(1.2+(uT-TH)*9.):.5;vec3 p=vec3(${f(CX)}+cos(an)*rad,.4+age*1.3,sin(an)*rad*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.1*aSeed.w);}`,PLUS_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    // tomar aire (se hincha) y ladrar (empujón hacia delante)
    const inh=ss(0,TB,te)*(1-ss(TB,TB+0.06,te)), bark=hitE(te-TB,12)*(te>=TB?1:0);
    caster.scale.set(1+0.06*inh,1+0.06*inh,1+0.06*inh); caster.position.x=CX+0.12*bark;
    arcs.forEach((m,i)=>{const s0=TB+i*0.05, s1=TI+i*0.05, u=cl((te-s0)/(s1-s0));
      m.visible=te>s0&&te<s1+0.12; tmp.lerpVectors(MOUTH,TC,u); tmp.y+=0.25*Math.sin(Math.PI*u);
      m.position.copy(tmp); billboard(m,0); const k=0.9+1.1*u; m.scale.set(k*0.8,k*1.4,1);
      m.material.uniforms.uQ.value=te>s1?-0.1+1.2*ss(s1,s1+0.12,te):-1; m.material.uniforms.uA.value=1;});
    spark.pose(ia,tmp2.copy(TC),1); ring.pose(ia,TX,0,0.42,1);
    dust.visible=ia>0; set(dust,0.05+0.9*ss(0.1,0.7,ia),ia>0?1:0);
    const wp=cl((te-TH)/0.4), wp2=cl((te-TH-0.06)/0.36);
    wave.visible=te>TH&&wp<1; wave.scale.setScalar(Math.max(0.8+13*(1-Math.pow(1-wp,2)),0.001)); set(wave,0.05+0.9*wp,1);
    wave2.visible=te>TH+0.06&&wp2<1; wave2.scale.setScalar(Math.max(0.6+10*(1-Math.pow(1-wp2,2)),0.001)); set(wave2,0.05+0.9*wp2,1);
    const hit=hitE(ia,14);
    target.position.x=TX+0.18*hit; target.scale.set(1+0.06*hit,1-0.08*hit,1+0.06*hit);
    glowOf(caster,HEALC,0.45*ss(TH,TH+0.08,te)*(1-ss(TH+0.2,1.0,te)));
    o.em=0.5*hit; o.emc.setRGB(1,0.65,0.25);
    o.g.copy(TC); o.gs=0.9; o.ga=0.13*hit; o.li=1.4+3*hit;
    o.ia=ia; o.c.copy(TC); o.shake=0.16*hit; o.dist=0; o.flash=0.2;
  };
}});

VFX.module("Estilizado · Starter · Bing",defs);
})();

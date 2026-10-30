// =====================================================================
// ESTILIZADO · SAPIDAE · GUARDIÁN DE CAMPANAS (Hito 95) — las 6 habilidades de la clase con efecto propio y el
// pulso y la rotura de su gólem (Gólem Campanario). Kit vfx-stylized.js; mismo estilo que el piloto (Hito 99).
// Claves: sty_<id de la habilidad> (el puente las usa con el estilo nuevo encendido) · golem_pulse_bell · golem_break_bell.
// Identidad: jade #3FB89A: Wind Bells de bronce, ondas de sonido, avisos y curación; la Luna de Sangre (rojo fijo).
// Lanzador = Sapidae: mano ≈ (-3.35,1.15,0.25), cabeza ≈ (-3.7,1.6,0). Los efectos de gólem se lanzan sobre el propio gólem
// (en reposo donde está el lanzador del laboratorio, -3.7).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Guardián",["#6fdcb8","#13705a"]);
const PAL="Guardián";
const HAND=V3(-3.35,1.15,0.25);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const TILE=1.93;                         // una casilla en unidades del laboratorio
const VV=`varying float vR;varying float vK;`;
const defs=[];

// ---------- colores semánticos fijos ----------
const BRONZE="vec3(.56,.33,.11)";          // bronce de las Wind Bells
const RED="vec3(.86,.1,.14)";             // Luna de Sangre
const GOLD="vec3(1.,.78,.3)";             // efectos positivos arrancados (Purificar)
const JADE="mix(uC2,uC1,.45)";            // hojas y motas de curación

// ---------- piezas compartidas ----------
// bronce sólido con luz en 3 bandas, brillo duro, borde jade que se enciende al tañer (uRing) y erosión que lo deshace
const BRONZE_FS=`uniform float uEr;uniform float uRing;
void main(){vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 vec3 c=styRampOf(${BRONZE},.22+.5*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=mix(uC2,uC1,.5)*smoothstep(.55,.9,fr)*(.12+.9*uRing);
 c+=vec3(1.,.9,.7)*smoothstep(.93,.965,dot(reflect(-L,n),normalize(vV)))*.45;
 float nz=styNoise(vUv*vec2(1.3,.9)+.17).r;float er=nz*.85+.15;
 if(er<uEr)discard;
 c=mix(c,uC1*1.2,smoothstep(uEr+.08,uEr,er)*step(0.,uEr));
 gl_FragColor=vec4(c,1.);}`;
// anillo de sonido vertical (plano perpendicular al viaje): trazo de pincel jade; uP = erosión
const VRING_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRampOf(mix(uC2,uC1,.4),.55+.4*s.g)*1.15,s.r*er*uA*.95);}`;
// anillo de pincel en el suelo con un color fijo (rojo de la luna)
const RING_COL=col=>`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRampOf(${col},.6+.4*s.g)*1.15,s.r*er*uA*.85);}`;
// partícula de energía de color fijo (oro, rojo) con la forma de chispa del atlas
const ENERGY_COL=(cell,col,gain=1.3)=>S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(${cell.toFixed(1)},uv);float m=sh.r;if(m<.01)discard;
 float er=styErode(m*.6+sh.b*.4,vK*1.05-.05,.12);float a=er*vA;if(a<.01)discard;
 gl_FragColor=vec4((styRampOf(${col},.55+.4*m)+vec3(1.,.95,.85)*sh.g*.4)*${gain.toFixed(2)},a);}`;

// campana de bronce (perfil torneado): la boca abajo, el pivote arriba (y = 0) para que se meza
const BELL_PROFILE=[[0,0],[0.1,-0.02],[0.17,-0.08],[0.21,-0.2],[0.23,-0.34],[0.27,-0.46],[0.34,-0.56],[0.4,-0.6],[0.39,-0.63]].map(([x,y])=>new THREE.Vector2(x,y));
function makeBell(parent,scale=1){
  const mat=S.mat(BRONZE_FS,{uEr:{value:-1},uRing:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.LatheGeometry(BELL_PROFILE,28),mat);
  const crown=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.025,8,16),mat); crown.position.y=0.03;
  const clap=new THREE.Mesh(new THREE.SphereGeometry(0.075,12,8),mat); clap.position.y=-0.5;
  g.add(body,crown,clap); g.scale.setScalar(scale); parent.add(g);
  const u=mat.uniforms;
  return {g,clap,u,
    pose(on,swing,ring,er){g.visible=on>0.001&&er<1.05;u.uRing.value=ring;u.uEr.value=er;
      g.rotation.z=swing;clap.position.x=-Math.sin(swing*1.6)*0.06;}};
}
// anillos de sonido que viajan de A a B (n anillos escalonados)
function soundRings(parent,n,size){
  const ms=[];
  for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size).rotateY(Math.PI/2),S.mat(VRING_FS,{},{mode:'energy',depthTest:true}));parent.add(m);ms.push(m);}
  return {ms,pose(te,T0,T1,A,B,lag=0.07){
    ms.forEach((m,i)=>{const k=cl((te-T0-i*lag)/(T1-T0));const on=te>=T0+i*lag&&k<1;m.visible=on;
      m.position.lerpVectors(A,B,k);m.scale.setScalar(0.45+0.9*k);set(m,0.05+0.75*k*k,on?1-0.3*k:0);});
  }};
}
// anillo de pincel jade en el suelo, misma interfaz que S.groundRing
const JRING_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRampOf(mix(uC2,uC1,.4),.55+.45*s.g)*1.15,s.r*er*uA*.9);}`;
function jadeRing(parent,size){
  const m=groundPlane(size,0,0.03,S.mat(JRING_FS,{},{mode:'energy'})); parent.add(m);
  return {mesh:m,pose(ia,x,z=0,dur=0.42,k=1){const p=cl(ia/dur);m.position.x=x;m.position.z=z;m.visible=ia>=0&&p<1;
    m.scale.setScalar(Math.max(k*(0.55+0.6*(1-Math.pow(1-p,2))),0.001));set(m,0.05+0.9*p,ia>=0?1:0);}};
}
// mismo bucle sin estado para partículas que nacen dentro de una ventana
const C0=(T0,W)=>`float s=${f(T0)}+aSeed.x*${f(W)};`;

// =====================================================================
// 1 · TAÑIDO DE ALARMA — una Wind Bell aparece sobre el lanzador y tañe; tres anillos de sonido viajan hasta el
//     objetivo; golpe y grietas de Frágil. ti 0,45 s
// =====================================================================
defs.push({key:"sty_lunalogist_alarm_toll",name:"Tañido de Alarma",dur:1.05,ti:0.45,pal:PAL,tier:2,stylized:true,
  phases:[["Campana",0],["Tañido",0.16],["Onda",0.2],["Impacto",0.45],["Frágil",0.55]],
build(a){
  const L=a.L,TR=0.16,TI=0.45,BELL=V3(-3.7,2.85,0),A=V3(-3.0,1.55,0),B=V3(3.15,1.15,0),BP=V3(3.15,1.15,0);
  const bell=makeBell(L.mesh,1.35);
  const rings=soundRings(L.trail,3,2.1);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.71});
  const gr=jadeRing(L.decal,2.4);
  const frag=S.status(a,"fragile",[target],TI,1.05);
  const K=`const vec3 BL=${v3(BELL)};const float TR=${f(TR)};`;
  // motas jade que salen de la boca de la campana al tañer
  S.pts(L.part,18,VV+K+`void main(){${C0(TR,0.12)}float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.4,1.)+vec3(0.,-.6,0.));vec3 p=BL+vec3(0.,-.5,0.)+d*(.2+1.1*(1.-exp(-t*5.)));
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.z*6.28;put(p,.08+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, inn=ss(0,0.12,te), sw=te<TR?0.25*ss(0,TR,te):0.25*Math.cos((te-TR)*26)*Math.exp(-(te-TR)*5);
    bell.g.position.copy(BELL).add(tmp.set(0,0.1*(1-inn),0));
    bell.pose(inn,sw,ss(TR,TR+0.04,te)*Math.exp(-Math.max(0,te-TR)*4),-0.2+1.25*ss(0.62,0.95,te));
    caster.rotation.z=0.08*ss(0,TR,te)-0.12*ss(TR,TR+0.08,te)+0.04*ss(TR+0.1,TI,te);
    rings.pose(te,0.2,TI,A,B,0.06);
    spark.pose(ia,BP,0.9); gr.pose(ia,3.4,0,0.45,0.9);
    const env=frag.pose(te);
    const hit=hitE(ia,7); target.position.x=3.4+0.14*hit; target.rotation.z=-hit*0.18*Math.cos(ia*15);
    S.statusGlow(o,[{kind:"fragile",env}]);
    if(ia<0){o.g.copy(te<0.2?BELL:B);o.gs=0.6*inn;o.ga=0.12*inn;o.li=1.2*inn;}
    else{o.g.copy(BP);o.gs=0.9+1.4*ia;o.ga=Math.exp(-ia*12)*0.3;o.li=3.5*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(BP);o.shake=0;o.dist=0.7;
  };
}});

// =====================================================================
// 2 · GÓLEM CAMPANARIO — una campana baja del cielo sobre la casilla, tañe y suelta dos anillos jade por el suelo;
//     se deshace hacia arriba para dejar ver al gólem que sale de la tierra. ti 0,5 s
// =====================================================================
defs.push({key:"sty_lunalogist_bell_golem",name:"Gólem Campanario",dur:1.3,ti:0.5,pal:PAL,tier:2,stylized:true,zoneTarget:2.2,
  phases:[["Descenso",0],["Tañido",0.4],["Anillos",0.5],["Gólem",0.8]],
build(a){
  const L=a.L,TD=0.4,TI=0.5,CX=3.4,TOP=2.6;
  const bell=makeBell(L.mesh,2.0);
  const sh=S.contactShadow(L.decal,2.0);
  const r1=jadeRing(L.decal,6.0), r2=jadeRing(L.decal,6.0);
  const glyph=groundPlane(2.2,CX,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.03)+band(r,.62,.02)+band(r,.76,.05)*step(.55,fract(an/6.2832*12.+uT*.2));
   float er=styErode(styNoise(vUv*1.2).r*.7+.3,uP,.1);gl_FragColor=vec4(styRamp(.6+.3*r),m*er*uA*.8);}`,{},{mode:'energy'}));
  L.decal.add(glyph);
  const K=`const float TI=${f(TI)};const vec3 CB=${v3(V3(CX,0.12,0))};`;
  // polvo de tierra al tocar el suelo la onda (el gólem sale de ahí)
  S.pts(L.part,10,VV+K+`void main(){${C0(TI,0.06)}float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=CB+vec3(cos(an),0.,sin(an)*.8)*(.45+.7*(1.-exp(-t*4.)))+vec3(0.,t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.34+.16*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.0,col:"vec3(.6,.48,.34)"}));
  // motas jade que suben alrededor de la casilla
  S.pts(L.part,22,VV+K+`void main(){${C0(TI,0.35)}float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.;vec3 p=CB+vec3(cos(an)*(.55+.3*aSeed.w),.1+t*1.3,sin(an)*(.55+.3*aSeed.w));
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=age*.6;vR=aSeed.y*6.28;put(p,.08+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, d=1-Math.pow(1-cl(te/TD),3), y=TOP+3.2*(1-d);
    const sw=te<TD?0.08*Math.sin(te*9):0.22*Math.cos((te-TD)*24)*Math.exp(-(te-TD)*4);
    bell.g.position.set(CX,y,0);
    bell.pose(ss(0,0.1,te),sw,ss(TD,TD+0.05,te)*Math.exp(-Math.max(0,te-TD)*3),-0.2+1.25*ss(0.62,1.0,te));
    sh.pose(CX,0,0.5+0.6*d,0.8*ss(0,0.2,te)*(1-ss(0.7,1.0,te)));
    caster.rotation.z=0.1*ss(0,0.2,te)-0.14*ss(0.2,0.3,te)+0.04*ss(0.3,TI,te);
    r1.pose(ia,CX,0,0.55,1); r2.pose(ia-0.14,CX,0,0.6,1);
    set(glyph,-0.1+1.15*ss(0.75,1.25,te),ss(0.3,0.5,te));
    if(ia<0){o.g.set(CX,y-0.4,0);o.gs=0.6*d;o.ga=0.1*d;o.li=1.4*d;}
    else{o.g.set(CX,0.8,0);o.gs=1.2+1.5*ia;o.ga=Math.exp(-ia*10)*0.25;o.li=3*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(CX,0.6,0);o.shake=0;o.dist=0.6;
  };
}});

// =====================================================================
// 3 · TONO DE DUELO — una campanilla tañe suave sobre el lanzador; sobre el aliado caen hojas y motas jade y el humo
//     oscuro de veneno, sangrado o quemadura se le arranca hacia arriba y se deshace. ti 0,4 s
// =====================================================================
defs.push({key:"sty_lunalogist_mourning_tone",name:"Tono de Duelo",dur:1.25,ti:0.4,pal:PAL,tier:2,stylized:true,
  phases:[["Tañido",0],["Tono",0.2],["Cura",0.4],["Limpieza",0.55]],
build(a){
  const L=a.L,TI=0.4,BELL=V3(-3.55,2.7,0.1),AX=3.4;
  const bell=makeBell(L.mesh,0.95);
  const rings=soundRings(L.trail,2,1.2);
  const gr=jadeRing(L.decal,2.6);
  const K=`const float TI=${f(TI)};const vec3 AP=${v3(V3(AX,0,0))};`;
  // hojas jade que caen en espiral sobre el aliado
  S.pts(L.part,16,VV+K+`void main(){${C0(0.18,0.5)}float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.5;float rad=.4+.35*aSeed.w;
   vec3 p=AP+vec3(cos(an)*rad,2.3-t*1.9,sin(an)*rad);p.y=max(p.y,.05);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;vK=smoothstep(.6,1.,age);vR=an*1.3+t*4.;
   put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:.1,col:JADE}));
  // motas de cura que suben del suelo
  S.pts(L.part,24,VV+K+`void main(){${C0(TI,0.5)}float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.5*aSeed.w,.1+t*1.6,sin(an)*.5*aSeed.w);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=age*.5;vR=aSeed.y*6.28;put(p,.09+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.15}),{mode:'energy'});
  // humo oscuro arrancado (lo que se limpia): sale del cuerpo, sube y se erosiona
  S.pts(L.part,12,VV+K+`void main(){${C0(TI+0.05,0.25)}float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.3,.5+aSeed.w*.8,sin(an)*.3)+vec3(cos(an)*.6,1.6,sin(an)*.6)*(1.-exp(-t*3.));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28+t;
   put(p,(.26+.14*aSeed.y)*(.8+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:"vec3(.2,.16,.22)"}));
  a.pose=function(te,o){
    const ia=te-TI, inn=ss(0,0.1,te), sw=0.18*Math.cos(te*20)*Math.exp(-te*3)*ss(0,0.1,te);
    bell.g.position.copy(BELL); bell.pose(inn,sw,0.6*Math.exp(-te*3)*inn,-0.2+1.25*ss(0.45,0.75,te));
    caster.rotation.z=0.06*ss(0,0.2,te)-0.06*ss(0.3,0.6,te);
    rings.pose(te,0.12,TI,tmp.set(-3.2,1.6,0),tmp2.set(3.0,1.3,0),0.09);
    gr.pose(ia,AX,0,0.6,1);
    const h=ia>=0?Math.exp(-ia*3)*ss(0,0.08,ia):0;
    o.em=0.45*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(BELL);o.gs=0.4*inn;o.ga=0.1*inn;o.li=0.8*inn;}
    else{o.g.set(AX,1.0,0);o.gs=1+1.5*ia;o.ga=0.2*h;o.li=2.5*h;}
    o.ia=ia;o.c.set(AX,1,0);o.shake=0;o.dist=0.3;o.flash=0.5;
  };
}});

// =====================================================================
// 4 · SUSURRO DE ADVERTENCIA — cuatro carillones de bronce giran alrededor del aliado, se cierran y forman un escudo
//     de tres anillos jade que gira y se consume. ti 0,45 s
// =====================================================================
defs.push({key:"sty_lunalogist_warning_whisper",name:"Susurro de Advertencia",dur:1.25,ti:0.45,pal:PAL,tier:2,stylized:true,
  phases:[["Carillones",0],["Cierre",0.3],["Escudo",0.45],["Guarda",0.7]],
build(a){
  const L=a.L,TI=0.45,AX=3.4;
  const mat=S.mat(BRONZE_FS,{uEr:{value:-1},uRing:{value:0}},{mode:'solid'});
  const chimes=[];
  for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.42+0.08*i,10,1),mat);L.mesh.add(m);chimes.push(m);}
  const RS_FS=`void main(){float u=vUv.x;float n=styNoise(vec2(u*3.+uT*.3,vUv.y)).r;float er=styErode(n*.7+.3,uP,.12);
   float v=abs(vUv.y-.5)*2.;float m=smoothstep(1.,.35,v)*(.55+.45*step(.35,fract(u*9.-uT*.8)));
   gl_FragColor=vec4(styRamp(.55+.35*(1.-v)),m*er*uA*.85);}`;
  const rings=[0.35,0.85,1.35].map((y,i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.62-0.05*i,0.62-0.05*i,0.12,40,1,true),S.mat(RS_FS,{},{mode:'energy'}));m.position.set(AX,y,0);L.mesh.add(m);return m;});
  const gr=jadeRing(L.decal,2.2);
  const K=`const float TI=${f(TI)};const vec3 AP=${v3(V3(AX,0,0))};`;
  // cinta de viento: motas que siguen a los carillones
  S.pts(L.part,30,VV+K+`void main(){float s=aSeed.x*TI;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float rad=.95-.35*clamp(s/TI,0.,1.);float an=floor(aSeed.w*3.999)*1.5708+s*9.-t*2.;
   vec3 p=AP+vec3(cos(an)*rad,1.0+.25*sin(an*2.),sin(an)*rad);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=an;put(p,.07+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, cl1=cl(te/TI), rad=0.95-0.35*cl1, on=ss(0,0.1,te);
    chimes.forEach((m,i)=>{const an=i*1.5708+te*9;m.position.set(AX+Math.cos(an)*rad,1.0+0.25*Math.sin(an*2),Math.sin(an)*rad);
      m.rotation.z=0.25*Math.sin(te*14+i);m.visible=on>0.01;});
    mat.uniforms.uRing.value=ss(0.3,TI,te)*(1-ss(TI,TI+0.3,te)); mat.uniforms.uEr.value=-0.2+1.25*ss(TI,TI+0.25,te);
    rings.forEach((m,i)=>{const k=ss(0,0.12,ia-i*0.05);m.visible=ia>=0;m.rotation.y=te*(i%2?-2:2);m.scale.set(1+0.25*(1-k),1,1+0.25*(1-k));
      set(m,-0.1+1.15*ss(0.42,0.8,ia),k);});
    gr.pose(ia,AX,0,0.5,0.9);
    const sh=ia>=0?ss(0,0.1,ia)*(1-ss(0.45,0.8,ia)):0;
    o.em=0.3*sh; o.emc.copy(U.uC1.value);
    o.g.set(AX,1.0,0);o.gs=0.8+0.6*sh;o.ga=0.12*on+0.15*sh;o.li=1+2*sh;
    o.ia=ia;o.c.set(AX,1,0);o.shake=0;o.dist=0.3;o.flash=0.4;
  };
}});

// =====================================================================
// 5 · PURIFICAR — una campana cae sobre el objetivo y lo golpea: chispa, anillos que estallan y motas doradas (sus
//     efectos positivos) arrancadas que suben y se disipan. ti 0,35 s
// =====================================================================
defs.push({key:"sty_lunalogist_purify",name:"Purificar",dur:1.1,ti:0.35,pal:PAL,tier:2,stylized:true,
  phases:[["Caída",0],["Golpe",0.35],["Disipación",0.5]],
build(a){
  const L=a.L,TI=0.35,TX=3.4,TOP=2.75,BP=V3(3.25,1.3,0);
  const bell=makeBell(L.mesh,1.45);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.23});
  const gr=jadeRing(L.decal,2.8);
  const HR_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);gl_FragColor=vec4(styRamp(.6+.35*s.g)*1.1,s.r*er*uA*.9);}`;
  const hr=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4).rotateX(-Math.PI/2),S.mat(HR_FS,{},{mode:'energy'}));L.mesh.add(m);return m;});
  const K=`const float TI=${f(TI)};const vec3 TP=${v3(V3(TX,0,0))};`;
  // motas doradas arrancadas del objetivo
  S.pts(L.part,26,VV+K+`void main(){${C0(TI,0.08)}float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=TP+vec3(0.,.5+aSeed.w*1.,0.)+d*(.25+1.1*(1.-exp(-t*4.)))+vec3(0.,t*t*1.6,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.y*6.28+t*5.;put(p,.12+.06*aSeed.w);}`,ENERGY_COL(C.spark,GOLD,1.2),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, d=Math.pow(cl(te/TI),2), y=TOP+1.6*(1-d);
    const sw=ia<0?0.05*Math.sin(te*12):0.3*Math.cos(ia*28)*Math.exp(-ia*5);
    bell.g.position.set(TX,y+0.04*hitE(ia,20),0);
    bell.pose(ss(0,0.08,te),sw,ia>=0?Math.exp(-ia*4):0,-0.2+1.25*ss(0.25,0.55,ia));
    caster.rotation.z=0.1*ss(0,0.15,te)-0.18*ss(0.15,0.25,te)+0.08*ss(0.25,0.6,te);
    spark.pose(ia,BP,1); gr.pose(ia,TX,0,0.5,1);
    hr.forEach((m,i)=>{const k=cl((ia-i*0.06)/0.35);m.visible=ia>=i*0.06&&k<1;m.position.set(TX,1.05+0.35*i,0);m.scale.setScalar(0.4+0.9*k);set(m,0.05+0.9*k,1-0.3*k);});
    const hit=hitE(ia,7); target.position.x=3.4+0.12*hit; target.scale.set(1,1-0.08*hit,1);
    if(ia<0){o.g.set(TX,y-0.4,0);o.gs=0.5;o.ga=0.08;o.li=1;}
    else{o.g.copy(BP);o.gs=1+1.4*ia;o.ga=Math.exp(-ia*12)*0.3;o.li=4*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(BP);o.shake=0;o.dist=0.8;
  };
}});

// =====================================================================
// 6 · RESONANCIA DE LA LUNA DE SANGRE — una luna roja sube sobre el campo y lo baña en haces de luz; una onda roja
//     ancha (radio ≈ 3 casillas) recorre el suelo y suben motas de regeneración. Rojo fijo. Sobre sí mismo. ti 0,6 s
// =====================================================================
const MOON_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec3 q=normalize(vP);
 float cr=styNoise(vec2(atan(q.z,q.x)*.25,q.y*.45+.5)).g;float pits=smoothstep(.62,.72,cr);
 vec3 c=styRampOf(${RED},.32+.45*l-.18*pits);
 float fr=1.-abs(dot(n,normalize(vV)));c+=${RED}*smoothstep(.45,.9,fr)*.9;
 gl_FragColor=vec4(c,1.);}`;
const HALO_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float m=smoothstep(1.,.45,r)*smoothstep(.3,.5,r);
 float rays=pow(abs(cos(atan(p.y,p.x)*6.+uT*.3)),12.)*smoothstep(1.,.5,r)*.5;
 gl_FragColor=vec4(styRampOf(${RED},.7)*1.1,(m*.45+rays)*uA);}`;
const BEAM_FS=`void main(){float h=vP.y/6.+.5;float fr=abs(dot(normalize(vN),normalize(vV)));
 float n=styNoise(vec2(atan(vP.z,vP.x)*.3,h*1.5-uT*.4)).b;
 gl_FragColor=vec4(styRampOf(${RED},.65+.25*n),fr*(.4+.6*n)*smoothstep(1.,.3,h)*smoothstep(0.,.15,h)*uA*.5);}`;
defs.push({key:"sty_lunalogist_blood_moon",name:"Resonancia de la Luna de Sangre",dur:1.8,ti:0.6,pal:PAL,tier:3,stylized:true,
  phases:[["Ascenso",0],["Luna",0.45],["Resonancia",0.6],["Regeneración",0.9],["Ocaso",1.4]],
build(a){
  const L=a.L,TI=0.6,MX=-2.4,MY=4.6,R0=3*TILE;
  const moon=new THREE.Mesh(new THREE.SphereGeometry(0.75,36,24),S.mat(MOON_FS,{},{mode:'solid'})); L.mesh.add(moon);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(4.4,4.4),S.mat(HALO_FS,{},{mode:'energy'})); L.mesh.add(halo);
  const beams=[];
  for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.5,6,16,1,true),S.mat(BEAM_FS,{},{mode:'energy'}));L.trail.add(m);beams.push(m);}
  const BTGT=[[-3.7,0],[-3.7+TILE*1.5,-TILE*.8],[-3.7-TILE,TILE*.9],[-3.7+TILE*.6,TILE*1.3],[-3.7-TILE*.4,-TILE*1.4]];
  const wave=groundPlane(R0*2/0.78,-3.7,0.03,S.mat(RING_COL(RED),{},{mode:'energy'})); L.decal.add(wave);
  const wave2=groundPlane(R0*2/0.78,-3.7,0.031,S.mat(RING_COL(RED),{},{mode:'energy'})); L.decal.add(wave2);
  const K=`const float TI=${f(TI)};const vec3 CC=${v3(V3(-3.7,0,0))};const float R0=${f(R0)};`;
  // motas de regeneración: suben en todo el radio de la onda
  S.pts(L.part,46,VV+K+`void main(){${C0(TI+0.05,0.7)}float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=sqrt(aSeed.w)*R0*.85;vec3 p=CC+vec3(cos(an)*rd,.1+t*1.5,sin(an)*rd);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=age*.5;vR=aSeed.y*6.28;put(p,.1+.06*aSeed.y);}`,ENERGY_COL(C.spark,RED,1.15),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, rise=1-Math.pow(1-cl(te/0.55),3), out=ss(1.4,1.8,te);
    moon.visible=te>0.02&&out<0.999; moon.position.set(MX,MY-1.8*(1-rise),0); moon.scale.setScalar(Math.max(0.6+0.4*rise,0.001)*(1-0.5*out));
    moon.rotation.y=te*0.4;
    halo.position.copy(moon.position); billboard(halo); halo.scale.setScalar(0.8+0.25*rise); set(halo,0,rise*(1-out)*(0.85+0.15*Math.sin(te*6)));
    beams.forEach((m,i)=>{const [bx,bz]=BTGT[i];const top=moon.position;const bot=tmp.set(bx,0,bz);
      m.position.copy(top).add(bot).multiplyScalar(0.5);const dir=tmp2.copy(top).sub(bot);const len=dir.length();
      m.scale.set(1,len/6,1);m.quaternion.setFromUnitVectors(V3(0,1,0),dir.normalize());
      m.visible=ia>-0.1; set(m,0,ss(-0.1,0.15,ia-i*0.04)*(1-ss(1.0,1.5,te)));});
    const p1=cl(ia/0.65), p2=cl((ia-0.15)/0.7);
    wave.visible=ia>=0&&p1<1; wave.scale.setScalar(Math.max(0.15+0.85*(1-Math.pow(1-p1,2)),0.001)); set(wave,0.05+0.9*p1,ia>=0?1:0);
    wave2.visible=ia>=0.15&&p2<1; wave2.scale.setScalar(Math.max(0.15+0.85*(1-Math.pow(1-p2,2)),0.001)); set(wave2,0.05+0.9*p2,ia>=0.15?0.8:0);
    caster.rotation.z=0.06*ss(0,0.3,te)-0.1*ss(0.5,0.65,te)+0.04*ss(0.7,1.2,te);
    o.dark=0.28*ss(0.05,0.4,te)*(1-ss(1.2,1.7,te));
    o.em=0.35*(ia>=0?ss(0,0.1,ia)*(1-ss(0.6,1.1,ia)):0); o.emc.setRGB(0.86,0.12,0.15);
    o.g.copy(moon.position);o.gs=2.5*rise;o.ga=0.12*rise*(1-out);o.li=2.5*rise*(1-out);o.ld=18;
    o.ia=ia;o.c.set(-3.7,0.8,0);o.shake=0;o.dist=0.5;o.flash=0.3;
  };
  a.pal=()=>PAL;
}});

// =====================================================================
// 7 · PULSO DEL GÓLEM CAMPANARIO — la campana del gólem tañe (anillo de sonido a su altura) y dos anillos jade de
//     radio 2 casillas recorren el suelo. Sobre el propio gólem. ti 0,3 s
// =====================================================================
defs.push({key:"golem_pulse_bell",name:"Pulso · Gólem Campanario",dur:1.0,ti:0.3,pal:PAL,tier:1,stylized:true,
  phases:[["Tañido",0],["Pulso",0.3],["Disipación",0.6]],
build(a){
  const L=a.L,TI=0.3,GX=-3.7,R2=2*TILE+0.4;
  const vr=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8).rotateX(-Math.PI/2),S.mat(VRING_FS,{},{mode:'energy'})); vr.position.set(GX,1.75,0); L.mesh.add(vr);
  const r1=jadeRing(L.decal,R2*2/0.78), r2=jadeRing(L.decal,R2*2/0.78);
  const K=`const float TI=${f(TI)};const vec3 GP=${v3(V3(GX,0,0))};const float R2=${f(R2)};`;
  S.pts(L.part,20,VV+K+`void main(){${C0(TI,0.2)}float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=R2*(.25+.7*aSeed.w)*(1.-exp(-t*4.));vec3 p=GP+vec3(cos(an)*rd,.1+t*.9,sin(an)*rd);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=age*.5;vR=aSeed.y*6.28;put(p,.08+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, k=cl(te/0.35);
    vr.visible=k<1; vr.scale.setScalar(0.4+1.0*k); set(vr,0.05+0.9*k,ss(0,0.05,te)*(1-0.3*k));
    r1.pose(ia,GX,0,0.6,1); r2.pose(ia-0.18,GX,0,0.6,1);
    caster.position.y=0.06*Math.sin(Math.PI*cl(te/0.3));
    o.g.set(GX,1.5,0);o.gs=0.8;o.ga=0.15*(1-cl(te/0.6));o.li=2*(1-cl(te/0.7));
    o.ia=ia;o.c.set(GX,1,0);o.shake=0;o.dist=0.2;o.flash=0.2;
  };
}});

// =====================================================================
// 8 · ROTURA DEL GÓLEM CAMPANARIO — la campana cae al suelo y se quiebra con un último tañido: esquirlas de bronce,
//     polvo y un anillo de cura de radio 2 casillas. ti 0,35 s
// =====================================================================
defs.push({key:"golem_break_bell",name:"Rotura · Gólem Campanario",dur:1.2,ti:0.35,pal:PAL,tier:2,stylized:true,
  phases:[["Caída",0],["Quiebra",0.35],["Cura",0.5]],
build(a){
  const L=a.L,TI=0.35,GX=-3.7,R2=2*TILE+0.4,BY=2.3;
  const bell=makeBell(L.mesh,1.6);
  const sh=S.contactShadow(L.decal,1.8);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.55});
  const r1=jadeRing(L.decal,R2*2/0.78);
  const K=`const float TI=${f(TI)};const vec3 GP=${v3(V3(GX,0.35,0))};`;
  // esquirlas de bronce
  S.pts(L.part,12,VV+K+`void main(){${C0(TI,0.03)}float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.9,0.))*(1.8+1.4*aSeed.z);vec3 p=GP+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.18+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BRONZE}));
  // polvo
  S.pts(L.part,10,VV+K+`void main(){${C0(TI,0.06)}float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(GX)},.1,0.)+vec3(cos(an),0.,sin(an)*.8)*(.35+.8*(1.-exp(-t*4.)))+vec3(0.,t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.32+.16*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:"vec3(.6,.48,.34)"}));
  // motas de cura
  S.pts(L.part,20,VV+K+`void main(){${C0(TI+0.1,0.4)}float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=${f(R2)}*sqrt(aSeed.w)*.85;vec3 p=vec3(${f(GX)},.1+t*1.3,0.)+vec3(cos(an)*rd,0.,sin(an)*rd);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=age*.5;vR=aSeed.y*6.28;put(p,.09+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, k=Math.pow(cl(te/TI),2), y=BY-(BY-1.0)*k;
    bell.g.position.set(GX,y,0);
    bell.pose(ss(0,0.05,te),ia<0?0.5*k:0.5+0.1*Math.sin(ia*30)*Math.exp(-ia*8),ia>=0?Math.exp(-ia*5):0,ia<0?-0.2:-0.05+1.1*ss(0,0.35,ia));
    sh.pose(GX,0,0.7+0.3*k,0.7*(ia<0?1:1-ss(0,0.3,ia)));
    spark.pose(ia,tmp.set(GX,0.6,0),0.9); r1.pose(ia-0.05,GX,0,0.7,1);
    o.g.set(GX,0.6,0);
    if(ia<0){o.gs=0.3;o.ga=0.05;o.li=0.6;}else{o.gs=1+1.5*ia;o.ga=Math.exp(-ia*10)*0.3;o.li=3.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(GX,0.6,0);o.shake=0.6;o.dist=0.6;
  };
}});

VFX.module("Estilizado · Sapidae · Guardián de Campanas",defs);
})();

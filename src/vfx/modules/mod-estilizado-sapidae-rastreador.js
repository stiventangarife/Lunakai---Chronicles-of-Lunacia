// =====================================================================
// ESTILIZADO · SAPIDAE · RASTREADOR GOGO (Hito 95) — las 6 habilidades de la clase con efecto propio y el
// pulso y la rotura de su gólem (Gólem Caparazón). Kit vfx-stylized.js; mismo estilo que el piloto (Hito 99).
// Claves: sty_<id de la habilidad> (el puente las usa con el estilo nuevo encendido) · golem_pulse_shell · golem_break_shell.
// Identidad: musgo #8F9E3A: caracoles Gogo, caparazones en espiral, petrasentido (ondas por la piedra), tierra estable con musgo, grietas corruptas.
// Lanzador = Sapidae: mano ≈ (-3.35,1.15,0.25), cabeza ≈ (-3.7,1.6,0). Los efectos de gólem se lanzan sobre el propio gólem
// (en reposo donde está el lanzador del laboratorio, -3.7).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Rastreador",["#dfe58a","#5b6720"]);
const PAL="Rastreador";
const HAND=V3(-3.35,1.15,0.25);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const TILE=1.93;                         // una casilla en unidades del laboratorio
const VV=`varying float vR;varying float vK;`;
const defs=[];

const {taperTube}=VFX.lib;
// colores de materia (semánticos, fijos): tierra, musgo, piedra, alba dorada, corrupción y caparazón
const EARTH="vec3(.55,.42,.29)", MOSS="vec3(.3,.52,.1)", STONE="vec3(.5,.44,.33)", GOLD="vec3(1.,.6,.14)",
  ROT="vec3(.4,.18,.48)", TOX="vec3(.48,.8,.22)", SHELL="vec3(.86,.7,.46)";
const e3=k=>1-Math.pow(1-cl(k),3);

// ---------- ejes del tablero en el espacio del laboratorio ----------
// Las áreas 2×2 y 3×3 están alineadas con las casillas del MUNDO (+x/+z del tablero), no con el eje lanzador → objetivo.
// En la pose se leen los ejes del mundo desde el grupo raíz del puente (en el laboratorio, la identidad).
const _m=new THREE.Matrix4(), EX=V3(1,0,0), EZ=V3(0,0,1);
function worldAxes(a){
  EX.set(1,0,0); EZ.set(0,0,1);
  const R=a.root.parent;
  if(R&&R.matrixWorld){_m.copy(R.matrixWorld).invert(); EX.transformDirection(_m); EZ.transformDirection(_m);}
  EX.y=0; EZ.y=0; EX.normalize(); EZ.normalize(); return [EX,EZ];
}
const alignPlane=(m,ex)=>{m.rotation.y=Math.atan2(-ex.z,ex.x);};

// ---------- shaders compartidos del Rastreador ----------
// grietas en el suelo (materia): celdas de voronoi; el cuerpo es tierra oscura y el filo brilla (valor > 1 → bloom).
// uP = radio de crecimiento (0..1), uQ = erosión al final; cG = color del brillo
const CRACK_FS=(cG,gain=1.4)=>`uniform float uQ;void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float g=styNoise(vUv*1.25+.37).g,n=styNoise(vUv*.9).r;
 float cr=smoothstep(.3,.14,g+(n-.5)*.1);float core=smoothstep(.17,.07,g);
 float grow=smoothstep(uP+.02,uP-.12,r+(n-.5)*.25);float fade=smoothstep(1.,.75,r);
 float m=cr*grow*fade;if(m<.02)discard;
 float er=styErode(n*.6+g*.4,uQ,.12);
 vec3 c=mix(styRampOf(${EARTH},.12+.18*n),${cG}*${gain.toFixed(2)},core*(1.-uQ*.6));
 gl_FragColor=vec4(c,m*er*uA);}`;
// tierra estable: losas de piedra con musgo que crece desde el centro (materia con luz del sol en 3 bandas)
// uH = semilado del área en unidades de UV (0..0.5), uP = crecimiento, uQ = erosión
const MOSS_FS=`uniform float uH;uniform float uQ;void main(){vec2 p=vUv-.5;vec2 a=abs(p);
 float box=max(a.x,a.y)/max(uH,.001);float n=styNoise(vUv*1.4+.11).r,g=styNoise(vUv*2.1).g;
 float inside=smoothstep(1.02,.94,box+(n-.5)*.08);float grow=smoothstep(uP+.03,uP-.15,length(p)/max(uH,.001)*.72+(n-.5)*.3);
 float m=inside*grow;if(m<.02)discard;
 float seam=smoothstep(.16,.08,g);float moss=smoothstep(.12,.32,n+(.5-g)*.35);
 vec3 L=stySunV();float l=styLight(normalize(vec3((n-.5)*.6,(g-.5)*.6,1.)),L);
 vec3 stone=styRampOf(${STONE},.25+.35*l)*(1.-seam*.55);vec3 ms=styRampOf(${MOSS},.2+.45*l);
 vec3 c=mix(stone,ms,moss)*styTint(l);
 float er=styErode(n*.6+g*.4,uQ,.12);
 gl_FragColor=vec4(c,m*er*uA*.85);}`;
// sólido iluminado con rayas (caparazón, losas, terrones)
const SHELL_FS=`uniform float uQ;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float band=smoothstep(.35,.65,fract(vUv.x*14.));float rim=smoothstep(.62,.7,1.-abs(dot(n,normalize(vV))));
 vec3 base=mix(styRampOf(${SHELL},.25+.5*l),styRampOf(vec3(.5,.32,.18),.2+.45*l),band*.75);
 vec3 c=base*styTint(l)+uSunCol*.2*rim*step(.5,l);
 float er=styErode(styNoise(vUv*vec2(3.,.6)).r*.7+.3*(1.-vUv.x),uQ,.08);if(er<.02)discard;
 gl_FragColor=vec4(c,er*uA);}`;
const SLAB_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float top=smoothstep(.6,.85,n.y*.5+.5);float nz=styNoise(vP.xz*1.7+.2).r;
 vec3 c=mix(styRampOf(${STONE},.25+.5*l),styRampOf(${MOSS},.3+.45*l),top*smoothstep(.35,.6,nz))*styTint(l);
 gl_FragColor=vec4(c,uA);}`;
// caracol Gogo (partícula): concha en espiral sobre un cuerpo pequeño, con luz en bandas
const SNAIL_FS=S.PV+`void main(){vec2 q=styPC()-.5;
 vec2 s=q-vec2(.04,.08);float r=length(s);float an=atan(s.y,s.x);
 float shell=step(r,.27);float sp=smoothstep(.06,.0,abs(fract(an/6.2832+r*4.2)-.5)-.38);
 float body=step(length((q-vec2(-.02,-.16))*vec2(1.,2.6)),.3)*(1.-shell);
 float m=max(shell,body);if(m<.5)discard;
 float l=step(0.,s.y+s.x*.4);
 vec3 c=shell>.5?mix(styRampOf(${SHELL},.35+.4*l),vec3(.32,.2,.12),sp):styRampOf(vec3(.55,.62,.45),.45);
 gl_FragColor=vec4(c,vA);}`;

// =====================================================================
// 1 · SUELO QUE CEDE — el suelo bajo el rival se agrieta (vetas de musgo que brillan), se hunde en un
//     pozo de barro y escupe terrones; el rival queda con barro a los pies (−1 PM). ti 0,4 s
// =====================================================================
defs.push({key:"sty_stargazer_yielding_ground",name:"Suelo que Cede (estilizado)",dur:1.1,ti:0.4,pal:PAL,tier:2,stylized:true,
  phases:[["Pisada",0],["Grietas",0.15],["Hundimiento",0.4],["Barro",0.6]],
build(a){
  const L=a.L,TI=0.4,TP=V3(3.4,0,0);
  const crack=groundPlane(3.2,TP.x,0.024,S.mat(CRACK_FS(MOSS+"*1.6",1.3),{uQ:{value:0}},{mode:'matter'})); L.decal.add(crack);
  const pit=groundPlane(2.0,TP.x,0.03,S.mat(`uniform float uQ;void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=styNoise(vUv*1.6+.2).r;float R=uP*(.9+.2*n);
   float hole=smoothstep(R,R-.12,r);float rim=smoothstep(.16,.0,abs(r-R))*step(.01,uP);
   float m=max(hole,rim*.9);if(m<.02)discard;float er=styErode(n*.7+.3*(1.-r),uQ,.12);
   vec3 c=mix(styRampOf(${EARTH},.55+.25*n),styRampOf(${EARTH},.03+.08*n),hole*smoothstep(R*.85,0.,r)+hole*.3);
   gl_FragColor=vec4(c,m*er*uA);}`,{uQ:{value:0}},{mode:'matter'})); L.decal.add(pit);
  const K=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};`;
  // terrones de tierra (esquirlas iluminadas que caen)
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.8+aSeed.w),3.2+1.6*aSeed.y,sin(an)*(.8+aSeed.w));
   vec3 p=TP+vec3(cos(an),0.,sin(an))*.45+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.22+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // barro que salpica (bocanadas de tierra)
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an),0.,sin(an)*.8)*(.35+.7*(1.-exp(-t*5.)))+vec3(0.,.12+t*.35,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.36+.18*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  const slow=S.status(a,'slow',[target],TI+0.05,1.05);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,0.2,te)-0.22*ss(0.2,0.3,te)+0.12*ss(0.35,0.8,te);
    set(crack,0.2+0.85*ss(0.12,TI+0.05,te),1); crack.material.uniforms.uQ.value=-0.1+1.15*ss(0.65,1.08,te);
    pit.visible=ia>=0; set(pit,0.75*e3(ia/0.18),1); pit.material.uniforms.uQ.value=-0.1+1.15*ss(0.6,1.05,te);
    const hit=hitE(ia,6);
    target.position.x=3.4; target.scale.set(1+0.05*hit,1-0.12*hit,1+0.05*hit); target.rotation.z=-hit*0.12*Math.cos(ia*14);
    S.statusGlow(o,[{kind:'slow',env:slow.pose(te)}]);
    if(ia<0){o.g.set(TP.x,0.3,0);o.gs=0.001;o.ga=0;o.li=0.6*ss(0.15,TI,te);}
    else{o.g.set(TP.x,0.4,0);o.gs=0.8+ia;o.ga=Math.exp(-ia*12)*0.2;o.li=2.5*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(TP.x,0.5,0);o.shake=0.6;o.dist=0.8;
  };
}});

// =====================================================================
// 2 · GÓLEM CAPARAZÓN — espiral de musgo en la casilla, un caparazón en espiral sale de la tierra girando con
//     caracoles Gogo y, en ti, se abre en musgo y polvo: el gólem sale justo después (~0,4 s) sin que nada lo tape.
// =====================================================================
const SPIRAL_GLYPH=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float sp=fract(an/6.2832*2.+r*1.6-uT*.4);float arm=smoothstep(.12,.0,abs(sp-.5)-.32)*smoothstep(1.,.85,r)*smoothstep(.05,.2,r);
 float rim=smoothstep(.04,.0,abs(r-.92));float m=max(arm*.8,rim*.6)*step(r,uP*1.05);if(m<.02)discard;
 gl_FragColor=vec4(styRampOf(${MOSS},.65)*.9,m*uA);}`;
defs.push({key:"sty_stargazer_shell_golem",name:"Gólem Caparazón (estilizado)",dur:1.3,ti:0.45,pal:PAL,tier:3,stylized:true,
  phases:[["Llamada",0],["Caparazón",0.15],["Apertura",0.45],["Musgo",0.6]],
build(a){
  const L=a.L,TI=0.45,TP=V3(3.4,0,0);
  const glyph=groundPlane(2.4,TP.x,0.026,S.mat(SPIRAL_GLYPH,{},{mode:'energy'})); L.decal.add(glyph);
  const moss=groundPlane(TILE*1.05,TP.x,0.022,S.mat(MOSS_FS,{uH:{value:0.48},uQ:{value:0}},{mode:'matter'})); L.decal.add(moss);
  // caparazón: tubo afinado que sube en espiral cónica (sólido iluminado, rayas de crecimiento)
  const pts=[]; for(let i=0;i<=60;i++){const t=i/60,an=t*Math.PI*2*3.2,r=0.46*(1-t)+0.05;pts.push(V3(Math.cos(an)*r,t*0.85,Math.sin(an)*r));}
  const geo=taperTube(new THREE.CatmullRomCurve3(pts),140,10,0.2,0.035);
  const shell=new THREE.Mesh(geo,S.mat(SHELL_FS,{uQ:{value:0}},{mode:'matter',side:THREE.FrontSide,depthWrite:true}));
  const sg=new THREE.Group(); sg.position.copy(TP); sg.add(shell); L.mesh.add(sg);
  const shadow=S.contactShadow(L.decal,1.5);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.6});
  const K=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};`;
  // caracoles Gogo que trepan por la espiral y saltan al abrirse
  S.pts(L.part,6,VV+K+`void main(){float an=aSeed.x*6.2832+uT*1.8;float k=clamp(uT/TI,0.,1.);
   float h=(.12+aSeed.y*.55)*k;float rad=(.5-.4*aSeed.y)*(1.-.2*k);
   vec3 p=TP+vec3(cos(an)*rad,h+.12,sin(an)*rad);
   float t=max(uT-TI,0.);p+=vec3(cos(an),0.,sin(an))*t*1.4+vec3(0.,2.2*t-5.*t*t,0.);p.y=max(p.y,.08);
   vA=(uT>.08&&uT<TI+.55)?1.:0.;vK=smoothstep(TI+.3,TI+.55,uT);vR=0.;put(p,.26);}`,SNAIL_FS);
  // hojas de musgo que brotan alrededor
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.12;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an),0.,sin(an))*(.55+.5*aSeed.w)*(1.-exp(-t*6.))+vec3(0.,.1+t*.9-1.2*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=an+t*3.;put(p,.2+.08*aSeed.y);}`,S.MATTER_FS(C.leaf,{relief:3,col:MOSS}));
  // polvo de la apertura
  S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an),0.,sin(an)*.8)*(.45+.6*(1.-exp(-t*5.)))+vec3(0.,.12+t*.3,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.36+.16*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.02}));
  a.pose=function(te,o){
    const ia=te-TI, rise=e3((te-0.12)/(TI-0.12));
    caster.rotation.z=0.1*ss(0,0.15,te)-0.2*ss(0.15,0.3,te)+0.1*ss(0.35,0.9,te);
    set(glyph,ss(0,0.3,te),ss(0,0.15,te)*(1-ss(TI+0.1,TI+0.5,te)));
    // el caparazón sube girando, se abre en ti y se consume (el gólem sale de la tierra a partir de ti)
    sg.visible=te>0.12&&ia<0.35; sg.scale.setScalar(Math.max(0.15+0.85*rise+0.1*Math.sin(Math.PI*cl(ia/0.12))*(ia>0?1:0),0.001));
    sg.position.y=-0.6*(1-rise); sg.rotation.y=-te*2.6;
    shell.material.uniforms.uA.value=1; shell.material.uniforms.uQ.value=ia<0?-0.1:-0.1+1.15*ss(0.02,0.3,ia);
    shadow.pose(TP.x,0,1.1*rise,ia<0?0.6*rise:0.6*(1-ss(0,0.3,ia)));
    spark.pose(ia,tmp.set(TP.x,0.8,0),0.85);
    moss.visible=ia>=0; set(moss,1.1*e3(ia/0.4),1); moss.material.uniforms.uQ.value=-0.1+1.15*ss(0.5,0.85,ia);
    if(ia<0){o.g.set(TP.x,0.6,0);o.gs=0.5*rise;o.ga=0.08*rise;o.li=1.2*rise;}
    else{o.g.set(TP.x,0.7,0);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*12)*0.25;o.li=3*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(TP.x,0.6,0);o.shake=0.5;o.dist=0.8;
  };
}});

// =====================================================================
// 3 · PETRASENTIDO — el Sapidae apoya la palma: ondas recorren la piedra del suelo hasta el rival (sin necesitar
//     línea de visión), encienden las vetas a su paso y le marcan grietas que brillan (Frágil, −1 alcance). ti 0,55 s
// =====================================================================
const WAVE_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float g=styNoise(vec2(u*5.,vUv.y*.9)+.3).g;float n=styNoise(vec2(u*2.,vUv.y*.6)).r;
 float d=uP-u;float front=smoothstep(.0,.04,d)*smoothstep(.22,.0,d);
 float rip=.5+.5*sin(d*70.);float vein=smoothstep(.2,.08,g)*smoothstep(.45,.0,d)*step(0.,d);
 float m=(front*rip*.75+vein)*smoothstep(1.,.45,v+(n-.5)*.3);if(m<.02)discard;
 gl_FragColor=vec4(styRampOf(${MOSS},.65+.3*front)*1.4,m*uA);}`;
defs.push({key:"sty_stargazer_petrasense",name:"Petrasentido (estilizado)",dur:1.15,ti:0.55,pal:PAL,tier:2,stylized:true,
  phases:[["Palma",0],["Ondas",0.12],["Marca",0.55],["Eco",0.75]],
build(a){
  const L=a.L,TI=0.55,TP=V3(3.4,0,0),X0=-3.2;
  // franja del suelo del lanzador al rival (subdividida: el pasillo del puente la deforma vértice a vértice)
  const wave=new THREE.Mesh(new THREE.PlaneGeometry(TP.x-X0,1.3,48,1).rotateX(-Math.PI/2).translate((TP.x+X0)/2,0,0),S.mat(WAVE_FS,{},{mode:'energy'}));
  wave.position.y=0.025; L.decal.add(wave);
  const crack=groundPlane(2.4,TP.x,0.027,S.mat(CRACK_FS(MOSS+"*1.7",1.5),{uQ:{value:0}},{mode:'matter'})); L.decal.add(crack);
  const ring=S.groundRing(L.decal,2.4), ringC=S.groundRing(L.decal,1.8);
  const fragile=S.status(a,'fragile',[target],TI+0.05,1.1);
  const K=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};`;
  // motas de piedra que saltan con la onda a lo largo del camino
  S.pts(L.part,18,VV+K+`void main(){float s=.12+aSeed.x*(TI-.12);float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-.12)/(TI-.12);vec3 p=vec3(mix(${f(X0)},TP.x,k),.05+2.4*t-6.*t*t,(aSeed.z-.5)*.9);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.12+.06*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:STONE}));
  a.pose=function(te,o){
    const ia=te-TI;
    // el lanzador se agacha y apoya la palma
    caster.rotation.z=-0.18*ss(0,0.12,te)+0.18*ss(0.6,1.0,te); caster.scale.set(1,1-0.06*ss(0,0.12,te)*(1-ss(0.6,1,te)),1);
    set(wave,-0.05+1.1*ss(0.1,TI,te),1-ss(TI+0.15,TI+0.5,te));
    ringC.pose(te-0.08,-3.7,0,0.45,0.8);
    crack.visible=ia>=0; set(crack,1.0*e3(ia/0.2),1); crack.material.uniforms.uQ.value=-0.1+1.15*ss(0.25,0.58,ia);
    ring.pose(ia,TP.x,0,0.45,0.9);
    const hit=hitE(ia,8); target.rotation.z=-hit*0.08*Math.cos(ia*20);
    S.statusGlow(o,[{kind:'fragile',env:fragile.pose(te)}]);
    if(ia<0){o.g.set(-3.5,0.2,0);o.gs=0.001;o.ga=0;o.li=0.8*ss(0.05,0.2,te);}
    else{o.g.set(TP.x,0.5,0);o.gs=0.9+ia;o.ga=Math.exp(-ia*12)*0.2;o.li=2.5*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(TP.x,0.6,0);o.shake=0;o.dist=0.6;
  };
}});

// =====================================================================
// 4 · MARCHA DEL CAPARAZÓN — en la casilla de destino brotan losas de piedra con musgo (tierra estable) entre polvo;
//     no depende de la posición del gólem (el sistema lo mueve). ti 0,35 s
// =====================================================================
defs.push({key:"sty_stargazer_shell_march",name:"Marcha del Caparazón (estilizado)",dur:1.0,ti:0.35,pal:PAL,tier:1,stylized:true,
  phases:[["Señal",0],["Losas",0.12],["Asiento",0.35],["Tierra estable",0.5]],
build(a){
  const L=a.L,TI=0.35,TP=V3(3.4,0,0);
  const moss=groundPlane(TILE*1.05,TP.x,0.022,S.mat(MOSS_FS,{uH:{value:0.48},uQ:{value:0}},{mode:'matter'})); L.decal.add(moss);
  const slabG=new THREE.CylinderGeometry(0.34,0.4,0.16,7), slabM=S.mat(SLAB_FS,{},{mode:'solid'});
  const SLABS=[[0,0,0.0],[0.48,0.28,0.06],[-0.42,0.32,0.1],[0.1,-0.5,0.14]], slabs=[];
  for(const [x,z,dl] of SLABS){const m=new THREE.Mesh(slabG,slabM);m.position.set(TP.x+x,0,z);m.rotation.y=x*5+z*3;m.userData.dl=dl;L.mesh.add(m);slabs.push(m);}
  const ring=S.groundRing(L.decal,2.2);
  const K=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};`;
  S.pts(L.part,10,VV+K+`void main(){float s=.12+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an),0.,sin(an)*.8)*(.4+.55*(1.-exp(-t*5.)))+vec3(0.,.1+t*.3,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.14*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.02}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.08*ss(0,0.12,te)-0.08*ss(0.3,0.7,te);
    for(const m of slabs){const k=e3((te-0.12-m.userData.dl)/0.2),sink=ss(0.78,0.98,te);
      m.visible=k>0.001&&sink<1; m.position.y=-0.12+0.16*k-0.18*sink+0.04*Math.sin(Math.PI*cl((te-0.12-m.userData.dl)/0.2)); m.scale.setScalar(Math.max(0.5+0.5*k,0.001));}
    set(moss,1.1*e3((te-0.15)/0.35),ss(0.1,0.2,te)); moss.material.uniforms.uQ.value=-0.1+1.15*ss(0.72,0.98,te);
    ring.pose(ia,TP.x,0,0.45,0.85);
    if(ia<0){o.g.set(TP.x,0.3,0);o.gs=0.001;o.ga=0;o.li=0.5;}
    else{o.g.set(TP.x,0.3,0);o.gs=0.8;o.ga=Math.exp(-ia*12)*0.15;o.li=1.5*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(TP.x,0.3,0);o.shake=0;o.dist=0.5;
  };
}});

// =====================================================================
// 5 · GRIETA CORRUPTA — 2×2 (la casilla objetivo y sus vecinas +x, +z y +x+z del tablero): la tierra se
//     oscurece, se abren grietas violeta-verdosas y sube humo corrupto. ti 0,45 s
// =====================================================================
const RIFT_FS=`uniform float uQ;void main(){vec2 p=vUv-.5;vec2 a=abs(p);float box=max(a.x,a.y)*2.;
 float n=styNoise(vUv*1.1+.5).r,g=styNoise(vUv*1.7+.2).g;
 float inside=smoothstep(1.02,.9,box+(n-.5)*.14);float grow=smoothstep(uP+.02,uP-.18,length(p)*1.6+(n-.5)*.3);
 float m=inside*grow;if(m<.02)discard;
 float cr=smoothstep(.2,.08,g);float core=smoothstep(.1,.04,g);
 vec3 dirt=mix(styRampOf(${ROT},.12+.15*n),styRampOf(${EARTH},.1),.45);
 vec3 c=mix(dirt,mix(${ROT}*1.6,${TOX}*1.5,core),cr);
 float er=styErode(n*.6+g*.4,uQ,.12);
 gl_FragColor=vec4(c,m*er*uA*(.55+.45*cr));}`;
defs.push({key:"sty_stargazer_corrupt_rift",name:"Grieta Corrupta (estilizado)",dur:1.3,ti:0.45,pal:PAL,tier:2,stylized:true,zoneTarget:TILE*1.6,
  phases:[["Señal",0],["Grieta",0.15],["Apertura",0.45],["Humo",0.6]],
build(a){
  const L=a.L,TI=0.45,TP=V3(3.4,0,0);
  const rift=groundPlane(TILE*2.05,TP.x,0.026,S.mat(RIFT_FS,{uQ:{value:0}},{mode:'matter'}),TILE*2.05); L.decal.add(rift);
  const hub=new THREE.Group(); L.part.add(hub);      // las partículas siguen el centro del 2×2
  const K=`const float TI=${f(TI)};const float T=${f(TILE)};`;
  // humo corrupto que sube de las grietas (materia violeta, luz en bandas)
  S.pts(hub,16,VV+K+`void main(){float s=TI+aSeed.x*.35;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3((aSeed.z-.5)*T*1.7,.15+t*(.9+.4*aSeed.w),(aSeed.w-.5)*T*1.7)+vec3(sin(t*3.+aSeed.x*6.)*.15,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age):0.;vK=smoothstep(.3,1.,age);vR=aSeed.y*6.28+t*.6;put(p,(.32+.18*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:ROT,bias:.05}));
  // chispas tóxicas en las grietas
  S.pts(hub,18,VV+K+`void main(){float s=TI-.1+aSeed.x*.6;float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3((aSeed.z-.5)*T*1.8,.05+t*1.1,(aSeed.w-.5)*T*1.8);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=aSeed.y*6.28;put(p,.1+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  const ring=S.groundRing(L.decal,2.6);
  a.pose=function(te,o){
    const ia=te-TI, [ex,ez]=worldAxes(a);
    // centro del 2×2: medio casilla hacia +x y +z del tablero desde la casilla objetivo
    const cx=TP.x+(ex.x+ez.x)*TILE*0.5, cz=(ex.z+ez.z)*TILE*0.5;
    rift.position.set(cx,0.026,cz); alignPlane(rift,ex); hub.position.set(cx,0,cz); hub.rotation.y=rift.rotation.y;
    caster.rotation.z=0.1*ss(0,0.15,te)-0.22*ss(0.15,0.28,te)+0.12*ss(0.35,0.9,te);
    set(rift,-0.05+1.25*ss(0.12,TI+0.15,te),1); rift.material.uniforms.uQ.value=-0.1+1.15*ss(0.95,1.28,te);
    ring.pose(ia,cx,cz,0.5,1.25);
    if(ia<0){o.g.set(cx,0.3,cz);o.gs=0.001;o.ga=0;o.li=0.6*ss(0.15,TI,te);}
    else{o.g.set(cx,0.4,cz);o.gs=1+ia;o.ga=Math.exp(-ia*12)*0.18;o.li=2.2*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(cx,0.5,cz);o.shake=0;o.dist=0.8;
  };
}});

// =====================================================================
// 6 · ESPIRAL DEL ALBA — 3×3 alrededor de la casilla objetivo: una espiral de luz del alba barre el área desde el
//     centro, se alzan rayos dorados y cae una lluvia de pétalos de luz. Selectiva: daña rivales y cura aliados. ti 0,55 s
// =====================================================================
const DAWN_FS=`uniform float uQ;void main(){vec2 p=vUv-.5;vec2 a=abs(p);float box=max(a.x,a.y)*2.;float r=length(p)*2.;float an=atan(p.y,p.x);
 float n=styNoise(vUv*1.3).r;
 float sp=fract(an/6.2832*3.+r*1.1-uT*.35);float arm=smoothstep(.16,.0,abs(sp-.5)-.3);
 float sweep=smoothstep(uP+.02,uP-.2,r*.8+(n-.5)*.2);float inside=smoothstep(1.02,.94,box+(n-.5)*.06);
 float edge=smoothstep(.05,.0,abs(box-.97))*inside;
 float m=(arm*.75+edge*.5)*sweep*inside;if(m<.02)discard;
 float er=styErode(n*.7+(1.-r)*.3,uQ,.12);
 gl_FragColor=vec4(styRampOf(${GOLD},.45+.4*arm),m*er*uA*.8);}`;
defs.push({key:"sty_stargazer_dawn_spiral",name:"Espiral del Alba (estilizado)",dur:1.4,ti:0.55,pal:PAL,tier:3,stylized:true,zoneTarget:TILE*1.6,
  phases:[["Primera luz",0],["Espiral",0.15],["Alba",0.55],["Pétalos",0.75]],
build(a){
  const L=a.L,TI=0.55,TP=V3(3.4,0,0);
  const dawn=groundPlane(TILE*3.05,TP.x,0.026,S.mat(DAWN_FS,{uQ:{value:0}},{mode:'matter'})); // pintura dorada en el suelo: con mezcla aditiva se lavaba sobre la arena L.decal.add(dawn);
  const hub=new THREE.Group(); hub.position.copy(TP); L.mesh.add(hub);
  // rayos del alba: cilindros abiertos que suben con vetas (energía dorada, borde suave)
  const RAY_FS=`void main(){float h=vP.y/2.6+.5;float an=atan(vP.z,vP.x);
   float n=styNoise(vec2(an*.6,h*1.5-uT*1.2)).r;float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
   float m=fr*smoothstep(.0,.12,h)*smoothstep(1.,.35,h)*(.5+.5*smoothstep(.35,.7,n));
   gl_FragColor=vec4(styRampOf(${GOLD},.6+.3*n)*.6,m*uA*.7);}`;
  const rayM=S.mat(RAY_FS,{},{mode:'energy'}), rayG=new THREE.CylinderGeometry(0.26,0.34,2.6,20,1,true);
  const RAYS=[[0,0,0],[1,0,0.05],[-1,0,0.1],[0,1,0.08],[0,-1,0.13],[1,1,0.16],[-1,-1,0.19],[1,-1,0.22],[-1,1,0.25]], rays=[];
  for(const [i,j,dl] of RAYS){const m=new THREE.Mesh(rayG,rayM);m.userData={i,j,dl};hub.add(m);rays.push(m);}
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.2});
  const K=`const float TI=${f(TI)};const vec3 TP=${v3(TP)};const float T=${f(TILE)};`;
  // pétalos de luz que caen sobre el área (materia dorada con luz en bandas)
  S.pts(hub,26,VV+K+`void main(){float s=TI+aSeed.x*.4;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3((aSeed.z-.5)*T*2.6,2.2-t*1.6,(aSeed.w-.5)*T*2.6)+vec3(sin(t*4.+aSeed.x*9.)*.2,0.,cos(t*3.+aSeed.y*7.)*.2);
   vA=(age>0.&&age<1.&&p.y>.05)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*3.;put(p,.2+.08*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:GOLD,bias:.1}));
  // motas que suben en espiral desde el centro
  S.pts(hub,24,VV+K+`void main(){float s=.1+aSeed.x*(TI-.05);float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-.1)/(TI-.05);float an=k*12.+aSeed.z*.6;float rad=k*T*1.35;
   vec3 p=vec3(cos(an)*rad,.08+t*1.4,sin(an)*rad);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.11+.05*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, [ex]=worldAxes(a);
    alignPlane(dawn,ex); hub.rotation.y=dawn.rotation.y;
    caster.rotation.z=0.12*ss(0,0.2,te)-0.25*ss(0.2,0.32,te)+0.13*ss(0.4,1.0,te);
    set(dawn,-0.05+1.3*ss(0.12,TI+0.05,te),1); dawn.material.uniforms.uQ.value=-0.1+1.15*ss(1.0,1.38,te);
    for(const m of rays){const u=m.userData,k=ss(TI-0.05+u.dl,TI+0.1+u.dl,te),out=ss(TI+0.35+u.dl,TI+0.7+u.dl,te);
      m.visible=k>0.001&&out<1; m.position.set(u.i*TILE,1.3*k,u.j*TILE); m.scale.set(0.8+0.4*k,Math.max(k,0.001),0.8+0.4*k);}
    rayM.uniforms.uA.value=1;
    spark.pose(ia,tmp.set(TP.x,0.9,0),1);
    const hit=hitE(ia,6); target.rotation.z=-hit*0.14*Math.cos(ia*13);
    if(ia<0){o.g.set(TP.x,0.4,0);o.gs=0.5*ss(0.1,TI,te);o.ga=0.06;o.li=1.5*ss(0.1,TI,te);}
    else{o.g.set(TP.x,0.9,0);o.gs=1.4+1.5*ia;o.ga=Math.exp(-ia*10)*0.28;o.li=4*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(TP.x,0.7,0);o.shake=0.6;o.dist=1;
  };
}});

// =====================================================================
// 7 · ROTURA DEL GÓLEM CAPARAZÓN — el caparazón se parte en pedazos (con algún caracol que huye) y el musgo de
//     tierra estable se extiende por el 3×3 alrededor (2 rondas). Se lanza sobre el propio gólem. ti 0,25 s
// =====================================================================
defs.push({key:"golem_break_shell",name:"Rotura · Gólem Caparazón (estilizado)",dur:1.3,ti:0.25,pal:PAL,tier:2,stylized:true,
  phases:[["Grieta",0],["Rotura",0.25],["Musgo",0.45]],
build(a){
  const L=a.L,TI=0.25,GP=V3(-3.7,0,0);
  const moss=groundPlane(TILE*3.05,GP.x,0.022,S.mat(MOSS_FS,{uH:{value:0.49},uQ:{value:0}},{mode:'matter'})); L.decal.add(moss);
  const crack=groundPlane(2.2,GP.x,0.026,S.mat(CRACK_FS(SHELL+"*1.4",1.2),{uQ:{value:0}},{mode:'matter'})); L.decal.add(crack);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.8});
  const K=`const float TI=${f(TI)};const vec3 GP=${v3(GP)};`;
  // pedazos del caparazón (esquirlas color concha) que saltan y ruedan
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+1.2*aSeed.w),2.6+1.4*aSeed.y,sin(an)*(1.2+1.2*aSeed.w));
   vec3 p=GP+vec3(0.,.7,0.)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.06);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*10.;put(p,.24+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:SHELL}));
  // caracoles que huyen
  S.pts(L.part,4,VV+K+`void main(){float t=max(uT-TI,0.);float an=aSeed.x*6.2832;
   vec3 p=GP+vec3(cos(an),0.,sin(an))*(.3+t*1.1)+vec3(0.,.14+.6*t-1.2*t*t,0.);p.y=max(p.y,.1);
   vA=(uT>TI&&uT<1.1)?1.:0.;vK=smoothstep(.85,1.1,uT);vR=0.;put(p,.26);}`,SNAIL_FS);
  // hojas de musgo que brotan por el área
  S.pts(L.part,18,VV+K+`void main(){float s=TI+.1+aSeed.x*.4;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=GP+vec3((aSeed.z-.5)*${f(TILE*2.6)},.08+t*.5,(aSeed.w-.5)*${f(TILE*2.6)});
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28;put(p,.16+.06*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:MOSS}));
  a.pose=function(te,o){
    const ia=te-TI, [ex]=worldAxes(a);
    alignPlane(moss,ex);
    caster.scale.set(1+0.05*Math.sin(te*60)*(1-ss(0,TI,te)),1,1);
    set(crack,0.1+0.9*ss(0,TI,te),1); crack.material.uniforms.uQ.value=-0.1+1.15*ss(TI+0.1,TI+0.45,te);
    spark.pose(ia,tmp.set(GP.x,0.8,0),0.9);
    moss.visible=ia>=0; set(moss,1.15*e3(ia/0.5),1); moss.material.uniforms.uQ.value=-0.1+1.15*ss(0.85,1.28,te);
    if(ia<0){o.g.set(GP.x,0.6,0);o.gs=0.4;o.ga=0.06;o.li=0.8;}
    else{o.g.set(GP.x,0.7,0);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*12)*0.22;o.li=3*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(GP.x,0.6,0);o.shake=0.8;o.dist=0.8;
  };
}});

VFX.module("Estilizado · Sapidae · Rastreador Gogo",defs);
})();

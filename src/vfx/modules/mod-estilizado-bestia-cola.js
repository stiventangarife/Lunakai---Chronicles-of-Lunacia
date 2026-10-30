// =====================================================================
// ESTILIZADO · BESTIA · COLA (Hito 101) — las 6 cartas de cola de Bestia hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_cotton, sty_nutTail, sty_shiba, sty_buba, sty_gerbil, sty_hare). Mismos dur / ti / fases
// que las originales (ya con su nivel aplicado), así el daño llega igual. Los efectos nacen de la cola del lanzador
// (≈ (-4.15,0.75,0)); el Axie ya tiene su propia cola, así que aquí no se dibuja ninguna.
// Identidad de la clase: pelaje ámbar y naranja cálido, crema en vientres y hocicos; acentos propios de cada carta.
// Semántica según PartCards.js (no la del módulo antiguo):
//   Cottontail (aliado: cura 25 y +1 PA al equipo) · Nut Cracker (daño cuerpo a cuerpo) · Shiba (daño fuerte, 1–2 casillas)
//   Buba Brush (daño) · Gerbil (daño) · Hare (daño y +1 PA al equipo)
// Los animales espirituales (Shiba, jerbo, liebre) se arman con piezas pequeñas para que el puente las mueva enteras.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_COTTON=pal("Sty Bestia · Algodón",["#ffe08a","#d98a24"]);
const P_NUT=pal("Sty Bestia · Nuez",["#ffae4c","#b9441a"]);
const P_SHIBA=pal("Sty Bestia · Shiba",["#ffb13d","#d24a12"]);
const P_BRUSH=pal("Sty Bestia · Pincel",["#ffa340","#c0281a"]);
const P_GERBIL=pal("Sty Bestia · Jerbo",["#ffbf6e","#a8341f"]);
const P_HARE=pal("Sty Bestia · Liebre",["#ffd25e","#cc6f12"]);

// colores de materia en espacio lineal (THREE.Color convierte el hex sRGB)
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const AMBER=lin(0xd9822b), AMBERD=lin(0x9c4a18), CREAM=lin(0xf6e6c6), DARK=lin(0x2a1a14), EARTH=lin(0xa88860),
  SOOT=lin(0x2e221c), WALNUT=lin(0x8a5a32), WALNUTD=lin(0x4a2a16), WOOD=lin(0x9a6a3e), GOLD=lin(0xf0b43c), INK=lin(0x1c1410),
  LACQ=lin(0x8a2418), SAND=lin(0xbf8545), SANDD=lin(0x9a6438), HAREB=lin(0xd08a1e), FLAMEC=lin(0xe0501a), HEALG=lin(0x7ce07a), PINK=lin(0xf0a0a0);

const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7, TP=V3(-4.15,0.75,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0);
const aim=(o,d)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());};
const bez2=(out,a,b,c,t)=>{const s=1-t;return out.set(s*s*a.x+2*s*t*b.x+t*t*c.x,s*s*a.y+2*s*t*b.y+t*t*c.y,s*s*a.z+2*s*t*b.z+t*t*c.z);};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const Z={zoneCaster:0.6,zoneTarget:1.2};

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb); uQ = erosión (materializar / deshacer), uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.06,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 float edge=smoothstep(uQ+.12,uQ,nz)*step(-.5,uQ);c+=uC1*edge*2.2;
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// pelaje: color con mechones, y vientre crema si belly > 0 (según la altura dentro de la pieza)
const FUR=(col,belly=0)=>`float fz=styNoise(vUv*vec2(7.,3.)+.3).g;base=${col}*(.88+.24*fz);
 ${belly?`base=mix(${CREAM},base,smoothstep(-.34,-.12,vP.y));`:''}lb=-.06+.05*(fz-.5);`;
// mancha en el suelo: col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// huella de pata (almohadilla + 4 dedos), energía cálida; uP = erosión
const PAW=`void main(){vec2 p=(vUv-.5)*2.;float m=smoothstep(.36,.3,length((p-vec2(0.,-.18))*vec2(1.,1.25)));
 for(int i=0;i<4;i++){float a=-.95+float(i)*.63;vec2 c=vec2(sin(a)*.5,.28+cos(a)*.22);m=max(m,smoothstep(.17,.12,length(p-c)));}
 if(m<.02)discard;float er=styErode(m*.4+styNoise(vUv*.6).r*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.6+.3*m)*1.15,m*er*uA);}`;
// marca de zarpazo (celda del corte), energía con rampa de la paleta; uEr = erosión
const CLAW_FS=`uniform float uEr;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.03)discard;
 float er=styErode(m*.5+s.b*.5,uEr,.1);gl_FragColor=vec4(styRamp(.35+.6*s.g)*1.35,m*er*uA);}`;
// cruz de curación (energía)
const PLUS_FS=S.PV+`void main(){vec2 q=styPC()-.5;float m=max(step(abs(q.x),.1)*step(abs(q.y),.33),step(abs(q.y),.1)*step(abs(q.x),.33));
 if(m<.5||vA<.01)discard;gl_FragColor=vec4(styRampOf(${HEALG},.75+.25*step(abs(q.x),.05))*1.15,vA);}`;
// anillo de sonido (aullido, golpe de cola): borde de pincel en un plano; uP = vida
const ARC_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float w=.08+.03*styNoise(vec2(an*1.2,uP)).r;float m=smoothstep(w,0.,abs(r-.82))*smoothstep(1.5,.9,abs(an));
 if(m<.02)discard;float er=styErode(m*.5+styNoise(vec2(an*2.,r)).g*.5,uP,.15);
 gl_FragColor=vec4(styRamp(.6+.35*m)*1.2,m*er*uA);}`;

// ---------- animales espirituales: grupo de piezas pequeñas con uniformes compartidos ----------
// parts: [geometría, material, x, y, z, rx, ry, rz, sx, sy, sz]; devuelve {g, Q, K, parts}
function creature(parent,mats,parts){
  const g=new THREE.Group(); parent.add(g); const meshes=[];
  for(const [geo,mk,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1] of parts){
    const m=new THREE.Mesh(geo,mats[mk]); m.position.set(x,y,z); m.rotation.set(rx,ry,rz); m.scale.set(sx,sy,sz); g.add(m); meshes.push(m);
  }
  return {g,meshes};
}
function furMats(Q,K,top,hot){
  const u=()=>({uQ:Q,uK:K});
  return {
    fur:S.mat(SOLID(FUR(top,1),{hot}),u(),{mode:'solid'}),
    top:S.mat(SOLID(FUR(top)),u(),{mode:'solid'}),
    cream:S.mat(SOLID(FUR(CREAM)),u(),{mode:'solid'}),
    dark:S.mat(SOLID(`base=${DARK};lb=-.1;`,{rim:.5}),u(),{mode:'solid'}),
    pink:S.mat(SOLID(`base=${PINK};`),u(),{mode:'solid'}),
  };
}
const defs=[];

// =====================================================================
// 1 · COTTONTAIL — la cola se sacude y suelta copos de algodón dorado que vuelan hasta el aliado, forman una nube sobre
//     su cabeza y bajan en espiral envolviéndolo; al cerrarse, la nube se abre en pelusa, suben cruces de curación y dos
//     chispas doradas (+1 PA al equipo). Después queda un aura esponjosa que late y se deshace. ti 0,52 s
// =====================================================================
defs.push(Object.assign({key:"sty_cotton",name:"Cottontail (estilizado)",dur:1.4,ti:0.52,pal:P_COTTON,tier:1,stylized:true,receiver:'target',
  phases:[["Sacudida",0],["Nube",0.14],["Espiral",0.32],["Aura",0.52],["Calma",1.0]],
build(a){
  const L=a.L,TA=0.14,TB=0.32,TI=0.52;
  const K=`const float TA=${f(TA)};const float TB=${f(TB)};const float TI=${f(TI)};const vec3 TP=${v3(TP)};const vec3 AC=vec3(${f(TX)},0.,0.);`;
  // copos: estallan en la cola, vuelan en arco a la nube, bajan en espiral y se abren en pelusa
  S.pts(L.part,30,VV+K+`void main(){vec3 r=rnd();float an0=aSeed.x*6.2832;
   vec3 slot=AC+vec3(cos(an0)*(.35+.4*aSeed.y),2.35+.3*r.y,sin(an0)*(.3+.35*aSeed.y));
   vec3 b0=TP+normalize(r+vec3(-.4,.9,0.))*.45;vec3 p;float sz=.42+.18*aSeed.z;float k=0.;
   if(uT<TA){float u=uT/TA;p=mix(TP,b0,1.-pow(1.-u,3.));sz*=.4+.6*u;}
   else if(uT<TB){float u=(uT-TA)/(TB-TA);u=u*u*(3.-2.*u);vec3 m=mix(b0,slot,.5)+vec3(0.,1.6+.5*aSeed.w,r.z*.4);
    p=mix(mix(b0,m,u),mix(m,slot,u),u);}
   else if(uT<TI){float u=(uT-TB)/(TI-TB);float an=an0+u*6.2;float rad=mix(length(slot.xz-AC.xz),.72,u);
    p=AC+vec3(cos(an)*rad,mix(slot.y,.45+1.1*aSeed.y,u*u),sin(an)*rad);}
   else{float t=uT-TI;float an=an0+6.2+t*1.5;float rad=.72+1.3*(1.-exp(-t*5.));
    p=AC+vec3(cos(an)*rad,.45+1.1*aSeed.y+t*.6,sin(an)*rad);k=smoothstep(.05,.45,t);sz*=1.+.4*t;}
   vA=uT<.02?0.:1.;vK=k;vR=aSeed.w*6.28+uT*1.5;put(p,sz);}`,S.MATTER_FS(C.puff,{relief:5,col:lin(0xe8a843),bias:-.08}));
  // halo dorado de la nube (aditivo, debajo de los copos)
  S.pts(L.part,10,VV+K+`void main(){float an=aSeed.x*6.2832+uT*2.;float on=smoothstep(TA+.05,TB,uT)*(1.-smoothstep(TI,TI+.25,uT));
   vec3 p=AC+vec3(cos(an)*.55,2.3-1.2*smoothstep(TB,TI,uT)+.2*aSeed.y,sin(an)*.5);vA=on*.8;vK=0.;vR=aSeed.y*6.;put(p,.7+.3*aSeed.z);}`,
   S.ENERGY_FS(C.puff,{gain:.25}),{mode:'energy'});
  // aura esponjosa que late alrededor del aliado
  S.pts(L.part,16,VV+K+`void main(){float t=uT-TI;float an=aSeed.x*6.2832+t*1.2;float pu=1.+.12*sin(t*14.+aSeed.y*6.);
   vec3 p=AC+vec3(cos(an)*.62*pu,.25+.95*aSeed.y,sin(an)*.55*pu);vA=t>0.?smoothstep(0.,.12,t):0.;vK=smoothstep(.45,.85,t);
   vR=aSeed.z*6.28;put(p,.3+.14*aSeed.z);}`,S.MATTER_FS(C.puff,{relief:4,col:lin(0xf4cf7a),bias:-.02}));
  // cruces de curación y chispas de +1 PA (al aliado y al lanzador)
  S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.25;float age=(uT-s)/.55;float an=aSeed.y*6.2832;
   vec3 p=AC+vec3(cos(an)*.45,.5+age*1.5,sin(an)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3+.1*aSeed.z);}`,PLUS_FS,{mode:'energy'});
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);float s=TI+.12+i*.08;float u=clamp((uT-s)/.4,0.,1.);
   vec3 a0=AC+vec3(0.,1.9,0.),a1=i<.5?AC+vec3(0.,1.15,0.):vec3(-3.7,1.2,0.);
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*(i<.5?.4:1.6),0.);
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*6.;put(p,.34);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  const ring=S.groundRing(L.decal,2.6);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.06*Math.sin(te*40)*(1-ss(0.05,TA,te));
    ring.pose(ia,TX,0,0.5,1);
    const sq=hitE(ia,7); target.scale.set(1+0.05*sq,1-0.05*sq,1+0.05*sq);
    o.em=0.45*ss(TB,TI,te)*(1-ss(TI+0.5,1.25,te)); o.emc.copy(U.uC1.value);
    const pa=ss(TI+0.45,TI+0.52,te)*(1-ss(TI+0.55,TI+0.8,te)); glowOf(caster,U.uC1.value,0.4*pa);
    o.g.set(TX,1.6-0.6*ss(TB,TI,te),0); o.gs=0.8+0.6*ss(TA,TI,te); o.ga=0.12+0.18*ss(TA,TI,te)*(1-ss(TI,1.2,te)); o.li=1.5+2*ss(TA,TI,te)*(1-ss(TI,1.2,te));
    o.ia=ia; o.c.set(TX,1.1,0); o.shake=0; o.dist=0; o.flash=0.3;
  };
}},Z));

// =====================================================================
// 2 · NUT CRACKER (TAIL) — un latigazo de pelaje ámbar azota el suelo detrás del lanzador (polvo y anillo) y catapulta una
//     nuez gigante que vuela girando en arco alto; sus grietas brillan cada vez más rápido hasta reventar en la cabeza del
//     rival: fuego, metralla de madera, trozos de cáscara, humo y una mancha chamuscada. Después caen brasas. ti 0,95 s
// =====================================================================
defs.push(Object.assign({key:"sty_nutTail",name:"Nut Cracker · cola (estilizado)",dur:2.1,ti:0.95,pal:P_NUT,tier:2,stylized:true,
  phases:[["Carga",0],["Coletazo",0.3],["Vuelo",0.4],["Explosión",0.95],["Brasas",1.18]],
build(a){
  const L=a.L,TS=0.3,TV=0.4,TI=0.95,NS=1.85;
  const HP=V3(3.12,1.55,0.1), P0=V3(-4.3,0.55,0), PM=V3(-0.3,5.2,0.2);
  // latigazo: arco de pelaje (plano curvo) detrás del lanzador
  const swish=new THREE.Mesh(new THREE.RingGeometry(0.55,1.05,40,1,0,Math.PI*0.95),S.mat(`void main(){vec2 p=vUv-.5;float an=atan(p.y,p.x)/3.1416;
   float r=length(p)*2.;float w=smoothstep(.55,.62,r)*smoothstep(1.,.92,r);float rev=smoothstep(uP-.06,uP,an+1.);
   float nz=styNoise(vec2(an*3.,r*2.)).g;if(w*rev<.05)discard;
   gl_FragColor=vec4(styRampOf(${AMBER},.35+.5*nz)*(.9+.3*rev),w*rev*uA*(.75+.25*nz));}`,{},{mode:'matter',side:THREE.DoubleSide}));
  swish.position.set(-4.35,0.55,0.05); L.mesh.add(swish);
  // la nuez: cáscara arrugada con costura y grietas que brillan (uK)
  const nut=new THREE.Mesh(new THREE.SphereGeometry(0.3,28,20),S.mat(SOLID(`vec3 q=normalize(vP);
   float gr=styNoise(vec2(atan(q.z,q.x)*.6,q.y*.9)+.2).b;float gr2=styNoise(vec2(atan(q.z,q.x)*1.3,q.y*1.8)).r;
   float groove=smoothstep(.42,.5,gr)*smoothstep(.62,.5,gr);float seam=smoothstep(.05,0.,abs(q.z));
   base=mix(${WALNUT},${WALNUTD},max(groove,seam*.8));lb=-.18*groove+.08*gr2;
   float crack=smoothstep(.06,0.,abs(gr2-.5)-.02)*(1.-seam);`,{hot:'vec3(1.,.42,.08)*crack*2.'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  nut.scale.set(1,0.86,0.86); L.mesh.add(nut);
  const nutU=nut.material.uniforms;
  const shadow=S.contactShadow(L.decal,0.9);
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.44});
  const ring=S.groundRing(L.decal,3.2), dustRing=S.groundRing(L.decal,2.0);
  const scorch=groundPlane(2.3,TX-0.1,0.026,S.mat(STAIN(SOOT,.6),{},{mode:'matter'})); L.decal.add(scorch);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 HP=${v3(HP)};`;
  // polvo del coletazo detrás del lanzador
  S.pts(L.part,12,VV+K+`void main(){float s=TS+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-4.4,.15,0.)+vec3(cos(an),0.,sin(an)*.7)*(.2+.9*(1.-exp(-t*6.)))+vec3(0.,t*(.5+.4*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.38+.18*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // fuego de la explosión (aditivo) y humo oscuro
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.35,0.));vec3 p=HP+d*(.25+1.3*(1.-exp(-t*7.)))+vec3(0.,t*.8,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.62+.3*aSeed.z)*(1.-.35*age));}`,
   S.ENERGY_FS(C.flame,{gain:1.1}),{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.05+aSeed.x*.1;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.8,0.));vec3 p=HP+d*(.3+.9*(1.-exp(-t*4.)))+vec3(0.,t*.9,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;put(p,(.6+.3*aSeed.z)*(.8+.7*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:lin(0x5a4a42),bias:-.05}));
  // metralla de madera y trozos de cáscara
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.15,.6,0.))*(2.6+2.6*aSeed.z);vec3 p=HP+v*t+vec3(0.,-8.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*(9.+6.*aSeed.w);put(p,.24+.14*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:WALNUT}));
  // brasas que caen después
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.15+aSeed.x*.6;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HP+vec3(rnd().x*.9,.4+.6*aSeed.z-t*1.6,rnd().z*.6);vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;vK=0.;vR=0.;put(p,.14+.06*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, is=te-TS;
    // latigazo: se dibuja hacia arriba y baja de golpe al suelo
    swish.visible=te<TS+0.3; swish.rotation.z=0.9-1.25*ss(TS-0.06,TS+0.02,te);
    set(swish,ss(0.02,TS-0.05,te)*2-(te>TS+0.05?2*ss(TS+0.05,TS+0.3,te):0),1);
    // nuez: aparece en la cola, vuela en arco y revienta
    if(te<TV){tailW(tmp);nut.position.copy(tmp).add(tmp2.set(0,0.15+0.25*ss(0,TS,te),0));nut.scale.setScalar(Math.max(NS*(0.2+0.8*e3(te/TS)),0.001));}
    else{const u=cl((te-TV)/(TI-TV));bez2(nut.position,P0,PM,HP,u);nut.scale.setScalar(NS);}
    nut.scale.y*=0.86; nut.scale.z*=0.86;
    nut.rotation.set(0.3,0,-te*12*ss(TS,TV,te));
    nut.visible=ia<0;
    const fl=ss(TV,TI,te); nutU.uK.value=fl*(0.55+0.45*Math.sin(te*(18+60*fl)));
    shadow.pose(nut.position.x,0,0.7,ia<0?0.45*cl(1.4-nut.position.y*0.25)*ss(0,0.2,te):0);
    dustRing.pose(is,-4.4,0,0.4,0.9);
    spark.pose(ia,tmp.copy(HP).add(tmp2.set(-0.1,0,0.3)),1.2);
    ring.pose(ia,TX,0,0.5,1);
    scorch.visible=ia>=0; scorch.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(scorch,ia>=0?-0.1+1.15*ss(0.6,1.1,ia):0,1);
    const h=hitE(ia,6);
    caster.rotation.z=0.1*ss(0,TS,te)-0.18*ss(TS-0.04,TS+0.04,te)+0.08*ss(TS+0.1,TI,te);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*22)); target.rotation.z=-0.28*h*Math.cos(ia*13);
    target.scale.set(1+0.08*h,1-0.12*h,1+0.08*h);
    o.em=0.35*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(nut.position);o.gs=0.5+0.5*fl;o.ga=0.1+0.15*fl;o.li=1+2.5*fl;o.ia=is;o.c.copy(nut.position);o.shake=0;o.dist=0.2;o.flash=0.2;}
    else{o.g.copy(HP);o.gs=1.6+3*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=7*Math.exp(-ia*5);o.ia=ia;o.c.copy(HP);o.shake=1;o.dist=1;o.flash=0.85;}
  };
}},{zoneCaster:0.8,zoneTarget:1.2}));
function tailW(out){const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),x=-0.45,y=0.75;
  return out.set(caster.position.x+x*c-y*s,caster.position.y+x*s+y*c,caster.position.z);}

// =====================================================================
// 3 · SHIBA — llamas ámbar suben en espiral desde la cola y forman el espíritu de un Shiba Inu sobre el lanzador; aúlla
//     (ondas de pincel), salta en arco con estela de fuego y cae mordiendo al rival: estallido de llamas, tres colmillos de
//     fuego, brasas, anillos y una huella de pata chamuscada. El espíritu se deshace en llamas sobre el objetivo. ti 1,0 s
// =====================================================================
defs.push(Object.assign({key:"sty_shiba",name:"Shiba (estilizado)",dur:3.4,ti:1.0,pal:P_SHIBA,tier:3,stylized:true,
  phases:[["Llamas",0],["Espíritu",0.2],["Aullido",0.55],["Salto",0.8],["Mordisco",1.0],["Fin",2.85]],
build(a){
  const L=a.L,TE=0.2,TH=0.55,TJ=0.8,TI=1.0,DS=1.18;
  const Q={value:1}, Kk={value:0}, DOG=V3(-3.75,2.05,-0.15), LAND=V3(2.6,1.2,0.5), JM=V3(-0.4,4.4,0.3);
  const M=furMats(Q,Kk,AMBER,'vec3(1.,.5,.12)');
  const sph=(r)=>new THREE.SphereGeometry(r,22,16), cap=(r,l)=>new THREE.CapsuleGeometry(r,l,4,10), cone=(r,h)=>new THREE.ConeGeometry(r,h,14);
  const dog=creature(L.mesh,M,[
    [sph(0.5),'fur',0,0,0,0,0,0,1.25,0.72,0.68],
    [sph(0.3),'cream',0.42,-0.06,0,0,0,0,1,1.1,1.05],
    [sph(0.32),'fur',0.74,0.4,0],
    [sph(0.17),'cream',1.0,0.31,0,0,0,0,1.35,0.85,0.95],
    [sph(0.055),'dark',1.21,0.36,0],
    [sph(0.04),'dark',0.95,0.48,0.15],[sph(0.04),'dark',0.95,0.48,-0.15],
    [cone(0.11,0.26),'top',0.68,0.72,0.15,0.25,0,-0.15],[cone(0.11,0.26),'top',0.68,0.72,-0.15,-0.25,0,-0.15],
    [cone(0.06,0.14),'pink',0.7,0.69,0.17,0.25,0,-0.15],[cone(0.06,0.14),'pink',0.7,0.69,-0.17,-0.25,0,-0.15],
    [cap(0.085,0.3),'fur',0.4,-0.42,0.2],[cap(0.085,0.3),'fur',0.4,-0.42,-0.2],
    [cap(0.09,0.3),'fur',-0.38,-0.42,0.2],[cap(0.09,0.3),'fur',-0.38,-0.42,-0.2],
    [new THREE.TorusGeometry(0.17,0.075,10,24,Math.PI*1.6),'fur',-0.64,0.36,0,0,0,0.4],
    [sph(0.1),'cream',-0.5,0.55,0],
  ]);
  const head=[2,3,4,5,6,7,8,9,10].map(i=>dog.meshes[i]), head0=head.map(m=>m.position.clone());
  const HPIV=V3(0.55,0.32,0);
  const spark=S.hitSpark(L.mesh,1.2,{seed:0.31}), spark2=S.hitSpark(L.mesh,1.0,{seed:0.77});
  const ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.4), glyph=S.groundRing(L.decal,2.4);
  const paw=groundPlane(1.5,TX+0.15,0.028,S.mat(PAW,{},{mode:'energy'})); L.decal.add(paw);
  const scorch=groundPlane(2.6,TX,0.024,S.mat(STAIN(SOOT,.55),{},{mode:'matter'})); L.decal.add(scorch);
  const shadow=S.contactShadow(L.decal,1.5);
  // aullido: tres ondas de pincel que salen de la boca
  const arcs=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),S.mat(ARC_FS,{},{mode:'energy',side:THREE.DoubleSide}));L.mesh.add(m);return m;});
  // colmillos de fuego: tres cortes que cruzan al objetivo
  const fangs=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.8),S.mat(CLAW_FS,{uEr:{value:0}},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const UD={value:V3(0,0,0)};
  const K=`uniform vec3 uDog;const float TE=${f(TE)};const float TJ=${f(TJ)};const float TI=${f(TI)};const vec3 HIT=${v3(TC)};const vec3 TP=${v3(TP)};`;
  // llamas: espiral desde la cola y los pies, luego corona del espíritu, estela del salto y estallido
  S.pts(L.part,26,VV+K+`void main(){float life=.32+aSeed.y*.2;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p;float on;float an=r.x*6.2832;
   if(uT<TE+.15){float h=age*1.9;p=vec3(-3.7+cos(an+uT*9.)*(.55-.15*age),h,sin(an+uT*9.)*.5);on=1.-smoothstep(TE,TE+.15,uT);}
   else{p=uDog+vec3((r.x-.5)*1.6,-.55+r.y*.2,(r.z-.5)*.7)+vec3(0.,age*.6,0.);on=smoothstep(TE,TE+.1,uT)*(1.-smoothstep(TI-.05,TI+.08,uT));}
   vA=on*smoothstep(0.,.12,age);vK=smoothstep(.3,1.,age);vR=(r.y-.5)*.5;put(p,(.3+.16*r.z)*(1.-age*.45));}`,
   S.ENERGY_FS(C.flame,{gain:1.1}),{mode:'energy',uniforms:{uDog:UD}});
  // estallido del mordisco: llamas de materia naranja-roja con bandas oscuras, detrás del espíritu
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.42+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.45,0.));vec3 p=HIT+vec3(.25,0.,-.25)+d*(.2+1.0*(1.-exp(-t*6.)))+vec3(0.,t*.9,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.45+.22*aSeed.z)*(1.-.3*age));}`,
   S.MATTER_FS(C.flame,{relief:4,col:FLAMEC,bias:-.06}));
  // brasas que suben del espíritu al deshacerse y caen en el suelo
  S.pts(L.part,26,VV+K+`void main(){float s=TI+.25+aSeed.x*1.1;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HIT+vec3(rnd().x*1.1,-.4+t*(1.2+.8*aSeed.z),rnd().z*.7)+vec3(sin(t*5.+aSeed.w*6.)*.15,0.,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vR=0.;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // polvo del aterrizaje
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.02+aSeed.x*.08;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(HIT.x,.2,0.)+vec3(cos(an),0.,sin(an)*.8)*(.5+1.1*(1.-exp(-t*5.)))+vec3(0.,t*(.4+.4*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.48+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  const FANG=[[V3(3.0,1.55,0.45),-0.75,0],[V3(3.08,1.2,0.5),-0.55,0.04],[V3(3.16,0.85,0.45),-0.35,0.08]];
  a.pose=function(te,o){
    const ia=te-TI;
    // espíritu: se materializa (uQ 1 → −0,1), aúlla, salta y se deshace sobre el objetivo
    Q.value=te<TH?1-1.1*ss(TE,TH-0.05,te):-0.1+1.1*ss(TI+0.27,TI+0.7,te);
    Kk.value=0.08+0.15*ss(TJ,TI,te)*(1-ss(TI,TI+0.1,te));
    const g=dog.g;
    if(te<TJ){g.position.copy(DOG).add(tmp.set(0,0.08*Math.sin(te*6),0));g.rotation.set(0,0,0.06*ss(TH,TH+0.1,te)-0.18*ss(TJ-0.12,TJ,te));}
    else if(ia<0){const u=cl((te-TJ)/(TI-TJ));bez2(g.position,DOG,JM,LAND,u);g.rotation.set(0,0,0.25-0.75*u);}
    else{g.position.copy(LAND).add(tmp.set(-0.06*hitE(ia,8),-0.08*hitE(ia,8),0));g.rotation.set(0,0,-0.5+0.2*ss(0,0.3,ia));}
    g.scale.setScalar(DS*(te<TE?0.6:0.6+0.4*e3((te-TE)/0.3)));
    g.visible=te>TE-0.02&&ia<0.8;
    // cabeza: mira al cielo al aullar y abre la boca al morder
    const howl=ss(TH,TH+0.08,te)*(1-ss(TJ-0.08,TJ,te)), bite=ss(-0.1,0,ia)*(1-ss(0.15,0.4,ia));
    const hr=0.75*howl-0.35*bite;
    head.forEach((m,i)=>{tmp.copy(head0[i]).sub(HPIV);tmp.set(tmp.x*Math.cos(hr)-tmp.y*Math.sin(hr),tmp.x*Math.sin(hr)+tmp.y*Math.cos(hr),tmp.z).add(HPIV);m.position.copy(tmp);m.rotation.z=hr+(i>=5&&i<=8?-0.15:0);});
    UD.value.copy(g.position);
    // aullido
    arcs.forEach((m,i)=>{const t0=TH+0.05+i*0.07,u=cl((te-t0)/0.35);m.visible=te>t0&&u<1;
      tmp.set(0.95,0.85,0).applyAxisAngle(tmp2.set(0,0,1),hr).multiplyScalar(DS).add(g.position);
      m.position.copy(tmp).add(tmp2.set(0.25+0.9*u,0.5+0.9*u,0));towardCam(m.position,m.position,0.2);billboard(m,0.55);m.scale.setScalar(0.5+1.4*u);set(m,0.1+0.9*u,1);});
    glyph.pose(te-0.02,CX,0,0.55,1.1);
    // mordisco
    spark.pose(ia,tmp.copy(TC).add(tmp2.set(-0.15,0.1,0.35)),1.3);
    spark2.pose(ia-0.08,tmp.copy(TC).add(tmp2.set(0.2,-0.3,0.3)),1.0);
    fangs.forEach((m,i)=>{const [p,rot,d]=FANG[i],u=ia-d;m.visible=u>=0&&u<0.5;m.position.copy(p);towardCam(m.position,p,0.4);billboard(m,rot);
      m.scale.set(0.6+0.55*e3(u/0.07),1,1);m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*ss(0.1,0.48,u);});
    ring.pose(ia,TX,0,0.55,1.1); ring2.pose(ia-0.12,TX,0,0.5,0.8);
    paw.visible=ia>=0; paw.scale.setScalar(0.6+0.4*e3(ia/0.15)); paw.rotation.z=-0.2; set(paw,ia>=0?-0.1+1.15*ss(1.0,1.8,ia):0,1);
    scorch.visible=ia>=0; scorch.scale.setScalar(0.5+0.5*e3(ia/0.2)); set(scorch,ia>=0?-0.1+1.15*ss(1.2,1.85,ia):0,1);
    shadow.pose(g.position.x,0,1.0,g.visible?0.45*cl(1.6-g.position.y*0.3):0);
    const h=hitE(ia,5);
    caster.rotation.z=0.05*Math.sin(te*30)*ss(TH,TH+0.05,te)*(1-ss(TJ-0.05,TJ,te));
    target.position.x=TX+0.34*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.3*h*Math.cos(ia*12);
    target.scale.set(1+0.1*h,1-0.16*h,1+0.1*h);
    glowOf(caster,U.uC1.value,0.35*ss(0,TE,te)*(1-ss(TJ,TI,te)));
    o.em=0.5*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(g.position);o.gs=1.0+0.6*ss(TE,TJ,te);o.ga=0.12+0.2*ss(TE,TI,te);o.li=2+3*ss(TE,TI,te);o.ia=te-TH;o.c.copy(g.position);o.shake=0;o.dist=0.3;o.flash=0.3;}
    else{o.g.copy(TC);o.gs=1.2+2*ia;o.ga=Math.exp(-ia*10)*0.25;o.li=5*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1.4;o.dist=1.2;o.flash=0.6;}
  };
}},{zoneCaster:0.6,zoneTarget:1.4}));

// =====================================================================
// 4 · BUBA BRUSH — de la cola sale un pincel caligráfico gigante que pinta en el aire, delante del lanzador, el kanji 火
//     con tinta negra de bordes encendidos; los trazos se prenden, el kanji vuela al rival y estalla: salpicadura de tinta,
//     fuego, el kanji grabado en el objetivo unos instantes y una mancha de tinta con brasas. ti 1,4 s
// =====================================================================
// trazos de 火 en unidades del plano (1 = 1 m): [inicio, control, fin, ancho inicial, ancho final, cola afilada]
const SK=[[-0.58,0.5,-0.5,0.3,-0.36,0.13,0.075,0.115,1],[0.6,0.55,0.5,0.33,0.34,0.17,0.075,0.115,1],
  [0.0,0.9,0.05,0.05,-0.78,-0.82,0.115,0.03,1],[0.02,0.08,0.28,-0.5,0.84,-0.78,0.06,0.135,0]];
const ST=[[0.3,0.137],[0.485,0.137],[0.67,0.241],[0.959,0.241]];   // inicio y duración de cada trazo (tiempo real)
const SKG=`void sk(int i,out vec2 A,out vec2 B,out vec2 E,out vec3 W){A=vec2(0.);B=A;E=A;W=vec3(.1,.1,1.);`+
  SK.map((s,i)=>`${i?"else ":""}if(i==${i}){A=vec2(${f(s[0])},${f(s[1])});B=vec2(${f(s[2])},${f(s[3])});E=vec2(${f(s[4])},${f(s[5])});W=vec3(${f(s[6])},${f(s[7])},${f(s[8])});}`).join("")+`}
vec2 bzk(vec2 a,vec2 b,vec2 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
float wid(vec3 W,float t){float w=mix(W.x,W.y,t)*(.55+.45*smoothstep(0.,.15,t));
 w*=mix(1.,smoothstep(1.02,.7,t),W.z);if(W.z<.5)w*=1.-.85*smoothstep(.88,1.,t);return max(w,.002);}
vec3 dStroke(vec2 p,vec2 A,vec2 B,vec2 E){float best=1e5,bt=0.,bs=0.;vec2 q0=A;
 for(int j=1;j<=14;j++){float t1=float(j)/14.;vec2 q1=bzk(A,B,E,t1);
  vec2 pa=p-q0,ba=q1-q0;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);float d=length(pa-ba*h);
  if(d<best){best=d;bt=(float(j-1)+h)/14.;bs=(ba.x*pa.y-ba.y*pa.x)>0.?d:-d;}
  q0=q1;}
 return vec3(best,bt,bs);}`;
// kanji estilizado: tinta (materia casi negra con fibras de pincel y borde cálido) + fuego (energía de la rampa en el
// borde y la punta del trazo). uP: trazos revelados (0..4), uQ: ignición (0..1)
const KANJI_FS=SKG+`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.4;float body=0.,core=0.,head=0.,edge=0.;
 for(int i=0;i<4;i++){float rv=clamp(uP-float(i),0.,1.);if(rv<=0.)continue;
  vec2 A,B,E;vec3 W;sk(i,A,B,E,W);vec3 s=dStroke(p,A,B,E);
  float w=wid(W,s.y)*2.8;float ac=s.z/w;
  float e=s.x/w+(styNoise(vec2(s.y*3.,ac*.4+float(i)*.3)).r-.5)*.5;
  float drawn=smoothstep(rv+.006,rv-.006,s.y);
  float br=styNoise(vec2(ac*.9,s.y*.35+float(i)*.17)).b;
  float gap=smoothstep(.58,.74,br)*smoothstep(.3,1.,s.y)*.9;
  float b=smoothstep(1.,.82,e)*drawn*(1.-gap);
  body=max(body,b);core=max(core,smoothstep(.55,0.,e)*drawn*(1.-gap));edge=max(edge,smoothstep(.62,.95,e)*b);
  head=max(head,smoothstep(.12,0.,rv-s.y)*step(rv,.995)*b);}
 if(body<.02)discard;
 float n=styNoise(p*.35-vec2(0.,uT*.6)).r;
 vec3 ink=mix(${INK},uC2*.55,edge*.7+.15*n);
 float heat=edge*(.45+.55*uQ)+head*.9+uQ*core*.55*n;
 vec3 c=mix(ink,styRamp(.55+.45*heat)*1.6,clamp(heat,0.,1.));
 gl_FragColor=vec4(c,body*uA);}`;
defs.push(Object.assign({key:"sty_buba",name:"Buba Brush (estilizado)",dur:2.3,ti:1.4,pal:P_BRUSH,tier:2,stylized:true,
  phases:[["Coletazo",0],["Trazo",0.3],["Ignición",1.2],["Impacto",1.4],["Brasas",1.599]],
build(a){
  const L=a.L,TS=0.3,TG=1.2,TI=1.4,KS=1.3,BS=1.15;
  const KC=V3(-2.3,2.7,0.45), KE=V3(3.08,1.3,0.3);
  // pincel: cerdas oscuras con punta encendida, virola dorada, mango lacado con nudos de bambú
  const brush=new THREE.Group(); L.mesh.add(brush);
  const Qb={value:-1}, Kb={value:0};
  const bristle=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.52,18,4).rotateX(Math.PI).translate(0,0.26,0),S.mat(SOLID(`float y=vP.y;
   float fib=styNoise(vec2(atan(vP.z,vP.x)*1.4,y*.8)).g;base=mix(${INK},${CREAM},smoothstep(.2,.46,y))*(.85+.3*fib);lb=.06*(fib-.5);`,
   {hot:'uC1*smoothstep(.22,0.,vP.y)*2.'}),{uQ:Qb,uK:Kb},{mode:'solid'}));
  brush.add(bristle);
  brush.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.14,18).translate(0,0.58,0),S.mat(SOLID(`base=${GOLD};lb=.06;`,{rim:.6}),{uQ:Qb,uK:{value:0}},{mode:'solid'})));
  brush.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.068,1.3,14).translate(0,1.3,0),S.mat(SOLID(`float node=smoothstep(.04,0.,abs(fract(vP.y*1.6)-.5)-.44);
   base=mix(${LACQ},${GOLD},node*.8);lb=.1*node;`,{rim:.5}),{uQ:Qb,uK:{value:0}},{mode:'solid'})));
  brush.scale.setScalar(BS);
  // kanji en el aire y copia grabada en el objetivo
  const kanji=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),S.mat(KANJI_FS,{uQ:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  L.mesh.add(kanji);
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),S.mat(KANJI_FS,{uQ:{value:1}},{mode:'matter',depthTest:false}));
  L.mesh.add(brand);
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.52});
  const ring=S.groundRing(L.decal,3.2);
  const stain=groundPlane(2.4,TX-0.05,0.026,S.mat(STAIN(INK,.7),{},{mode:'matter'})); L.decal.add(stain);
  const K=`const float TS=${f(TS)};const float TG=${f(TG)};const float TI=${f(TI)};const vec3 KE=${v3(KE)};const vec3 KC=${v3(KC)};`;
  // salpicadura de tinta (materia negra) y fuego del impacto
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(2.+2.4*aSeed.z);vec3 p=KE+v*t+vec3(0.,-7.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.y-15.*t,v.x)+1.57;put(p,.22+.12*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:3,col:INK,bias:.05}));
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.38+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=KE+d*(.25+1.4*(1.-exp(-t*7.)))+vec3(0.,t*.9,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.62+.3*aSeed.z)*(1.-.35*age));}`,
   S.ENERGY_FS(C.flame,{gain:1.1}),{mode:'energy'});
  // chispas de tinta encendida que caen del kanji al prenderse y brasas después
  S.pts(L.part,22,VV+K+`void main(){float s=TG+aSeed.x*(TI-TG+.9);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 o=s<TI?KC+vec3(rnd().x*.9,rnd().y*.9,0.):KE+vec3(rnd().x*.8,rnd().y*.6,rnd().z*.4);
   vec3 p=o+vec3(0.,-t*1.4+t*t*.5,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;vK=0.;vR=0.;put(p,.15+.07*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // remolino de humo que barre el coletazo
  S.pts(L.part,10,VV+K+`void main(){float life=.5+aSeed.y*.2;float age=uT/life-aSeed.x*.4;float an=aSeed.z*6.2832;
   vec3 p=vec3(-4.3,.6,0.)+vec3(cos(an)*.5,age*1.2,sin(an)*.4);vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.;put(p,.4+.2*aSeed.w);}`,
   S.MATTER_FS(C.puff,{relief:4,col:lin(0x7a6a62)}));
  const pq=new THREE.Quaternion(), tipP=new THREE.Vector2(), BQ=new THREE.Quaternion(), BE=new THREE.Euler();
  const bzj=(s,t)=>{const u=1-t;tipP.set(u*u*s[0]+2*u*t*s[2]+t*t*s[4],u*u*s[1]+2*u*t*s[3]+t*t*s[5]);return tipP;};
  a.pose=function(te,o){
    const ia=te-TI, ig=te-TG;
    // revelado de trazos y posición de la punta del pincel
    let rev=0, bi=0, bt=0, lift=1;
    for(let i=0;i<4;i++){const [s0,d]=ST[i];rev+=cl((te-s0)/d);}
    for(let i=0;i<4;i++){const [s0,d]=ST[i];
      if(te<s0){bi=i;bt=0;lift=i===0?1:1-ss(s0-0.07,s0,te);if(i>0){const [p0,d0]=ST[i-1];if(te<p0+d0+0.03){bi=i-1;bt=1;lift=ss(p0+d0,p0+d0+0.03,te);}}break;}
      if(te<=s0+d){bi=i;bt=(te-s0)/d;lift=0;break;}
      bi=i;bt=1;lift=ss(s0+d,s0+d+0.05,te);}
    // vuelo del kanji
    const fly=ss(TG+0.06,TI,te);
    kanji.visible=te>=ST[0][0]&&ia<0;
    kanji.position.lerpVectors(KC,KE,fly).add(tmp.set(0,Math.sin(fly*3.1416)*0.8,0));
    billboard(kanji,0); kanji.scale.setScalar(KS*(1-0.25*fly));
    set(kanji,rev,1); kanji.material.uniforms.uQ.value=ss(TG-0.05,TG+0.1,te);
    // pincel
    pq.copy(kanji.quaternion);
    if(te<TS){tailW(brush.position);brush.position.add(tmp.set(0,0.2*ss(0,TS,te),0));brush.rotation.set(0,0,0.9);
      const gs=e3(te/TS);brush.scale.setScalar(Math.max(BS*(0.2+0.8*gs),0.001));brush.position.lerp(tmp2.copy(KC).add(tmp.set(-0.55,-0.3,0.05)),ss(0.12,TS,te));}
    else{const s=SK[bi];bzj(s,bt);tmp.set(tipP.x*KS,tipP.y*KS,0.06+0.25*lift).applyQuaternion(pq).add(KC);
      brush.position.copy(tmp);BE.set(0.35,0,-0.45+0.12*Math.sin(te*10));brush.quaternion.copy(pq).multiply(BQ.setFromEuler(BE));
      brush.scale.setScalar(BS);}
    brush.visible=te<TG+0.12;
    Qb.value=te<TG?-1:-0.1+1.2*ss(TG,TG+0.12,te); Kb.value=0.6+0.4*Math.sin(te*16);
    // impacto
    spark.pose(ia,tmp.copy(KE).add(tmp2.set(-0.1,0,0.2)),1.15);
    ring.pose(ia,TX,0,0.5,1);
    brand.visible=ia>=0&&ia<0.75; brand.position.copy(TC).add(tmp.set(-0.25,0.15,0.4)); billboard(brand,0); brand.scale.setScalar(0.42*(1+0.25*hitE(ia,10)));
    set(brand,4,ia>=0?1-ss(0.35,0.75,ia):0);
    stain.visible=ia>=0; stain.scale.setScalar(0.5+0.5*e3(ia/0.18)); set(stain,ia>=0?-0.1+1.15*ss(0.55,0.9,ia):0,1);
    const h=hitE(ia,6);
    caster.rotation.z=0.07*Math.sin(te*9)*ss(TS,TS+0.1,te)*(1-ss(TG,TI,te));
    target.position.x=TX+0.28*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.24*h*Math.cos(ia*13);
    target.scale.set(1+0.07*h,1-0.1*h,1+0.07*h);
    o.em=0.35*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(kanji.position);o.gs=0.7+1.0*ss(TG-0.1,TI,te);o.ga=0.06+0.25*ss(TG-0.1,TI,te);o.li=1+3*ss(TG-0.1,TI,te);o.ia=ig;o.c.copy(kanji.position);o.shake=0;o.dist=0.2;o.flash=0.2;}
    else{o.g.copy(KE);o.gs=1.6+3*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=7*Math.exp(-ia*5);o.ia=ia;o.c.copy(KE);o.shake=1;o.dist=1;o.flash=0.85;}
  };
}},{zoneCaster:1.8,zoneTarget:1.2}));

// =====================================================================
// 5 · GERBIL — el lanzador amaga y estalla en una nube de arena; un jerbo espiritual corre pegado al suelo dentro de una
//     estela de humo, reaparece a la espalda del rival con otro estallido y le da dos zarpazos en X (garras ámbar y
//     carmesí, mechones de pelo); luego vuelve corriendo por la estela y se deshace junto al lanzador. ti 0,76 s
// =====================================================================
defs.push(Object.assign({key:"sty_gerbil",name:"Gerbil (estilizado)",dur:2.0,ti:0.76,pal:P_GERBIL,tier:2,stylized:true,
  phases:[["Amago",0],["Humo",0.212],["Reaparición",0.486],["Zarpazo I",0.548],["Zarpazo II",0.689],["Regreso",1.235]],
build(a){
  const L=a.L,TH=0.212,TR=0.486,T1=0.58,TI=0.76,TB=1.235,GS=1.9;
  const Q={value:1}, Kk={value:0.3};
  const M=furMats(Q,Kk,SAND,'uC1');
  const sph=r=>new THREE.SphereGeometry(r,18,14);
  const ger=creature(L.mesh,M,[
    [sph(0.3),'fur',0,0,0,0,0,0,1.35,0.85,0.85],
    [sph(0.2),'fur',0.36,0.12,0],
    [sph(0.1),'cream',0.52,0.07,0,0,0,0,1.2,0.85,1],
    [sph(0.03),'dark',0.62,0.09,0],
    [sph(0.032),'dark',0.47,0.2,0.12],[sph(0.032),'dark',0.47,0.2,-0.12],
    [sph(0.13),'pink',0.3,0.34,0.13,0,0,0,0.5,1,0.9],[sph(0.13),'pink',0.3,0.34,-0.13,0,0,0,0.5,1,0.9],
    [new THREE.CapsuleGeometry(0.03,0.62,3,6),'top',-0.62,0.12,0,0,0,1.25],
    [sph(0.08),'dark',-0.92,0.24,0,0,0,0,1.4,0.9,0.9],
    [sph(0.12),'fur',-0.16,-0.18,0.14,0,0,0,1.4,0.7,0.7],[sph(0.12),'fur',-0.16,-0.18,-0.14,0,0,0,1.4,0.7,0.7],
  ]);
  const BEHIND=V3(4.3,0.56,-0.15), START=V3(-3.1,0.55,0.25);
  const poof1=S.groundRing(L.decal,2.2), poof2=S.groundRing(L.decal,2.2), ring=S.groundRing(L.decal,2.8);
  const s1=S.hitSpark(L.mesh,1.5,{seed:0.23}), s2=S.hitSpark(L.mesh,2.0,{seed:0.68});
  const claws=[];
  for(let k=0;k<2;k++)for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.55),S.mat(CLAW_FS,{uEr:{value:0}},{mode:'energy',depthTest:false}));L.mesh.add(m);claws.push({m,k,i});}
  const shadow=S.contactShadow(L.decal,0.8);
  const K=`const float TH=${f(TH)};const float TR=${f(TR)};const float TI=${f(TI)};const float TB=${f(TB)};const float T1=${f(T1)};`;
  // nubes de arena: en el lanzador (amago), detrás del rival (reaparición) y al volver
  S.pts(L.part,36,VV+K+`void main(){float g=floor(aSeed.x*3.);float s=g<.5?.1:(g<1.5?TR-.04:TB+.5);vec3 c=g<.5?vec3(-3.7,.5,0.):(g<1.5?vec3(4.25,.5,-.15):vec3(-3.4,.45,.1));
   float life=.55+aSeed.y*.3;float age=(uT-s-aSeed.z*.06)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.5,0.));vec3 p=c+d*(.3+.85*(1.-exp(-t*6.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.5+.22*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:SAND,bias:.0}));
  // estela de humo pegada al suelo (ida y vuelta)
  S.pts(L.part,40,VV+K+`void main(){float back=step(.5,aSeed.x);float u=fract(aSeed.x*2.);
   float t0=back<.5?mix(TH,TR,u):mix(TB,TB+.45,u);float x=back<.5?mix(-3.1,4.25,u):mix(4.,-3.3,u);
   float life=.5+aSeed.y*.25;float age=(uT-t0)/life;float t=max(uT-t0,0.);
   vec3 p=vec3(x,.2+t*.5,(back<.5?.25:.1)+rnd().z*.25)+vec3(rnd().x*.15,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*.9:0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.36+.16*aSeed.z)*(.8+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:lin(0xc8a888),bias:.05}));
  // mechones de pelo arrancados en cada zarpazo
  S.pts(L.part,18,VV+K+`void main(){float k=step(.5,aSeed.x);float s=(k<.5?T1:TI)+aSeed.y*.03;float life=.5+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.5,0.))*(1.6+1.4*aSeed.w);vec3 p=vec3(3.2,1.2,.2)+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*6.;put(p,.2+.1*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:lin(0xd04030),bias:.05}));
  const CL=[[V3(3.05,1.35,0.4),-0.7],[V3(3.25,1.15,0.4),0.7]];
  a.pose=function(te,o){
    const g=ger.g, i1=te-T1, ia=te-TI;
    // recorrido del jerbo: sale del humo del lanzador, corre por el suelo, salta detrás del rival, ataca y vuelve
    let vis=false, flip=1;
    if(te>=TH&&te<TR){const u=(te-TH)/(TR-TH);g.position.lerpVectors(START,BEHIND,u).add(tmp.set(0,0.05*Math.abs(Math.sin(u*20)),0));g.rotation.set(0,0,0);vis=true;}
    else if(te>=TR&&te<TB){const u=cl((te-TR)/(T1-TR));g.position.copy(BEHIND).add(tmp.set(-0.75*e3(u)-0.1*ss(T1,TI,te),1.0*Math.sin(u*2.6)+0.3*ss(T1,TI,te)*(1-ss(TI,TI+0.2,te)),0.25*u));
      g.position.y=Math.max(g.position.y-0.9*ss(TI+0.05,TI+0.3,te),0.56);flip=-1;g.rotation.set(0,0,0.5*Math.sin(u*3)-0.4*ss(T1,TI,te));vis=true;}
    else if(te>=TB&&te<TB+0.5){const u=(te-TB)/0.5;g.position.lerpVectors(tmp.set(4.0,0.56,0.1),tmp2.set(-3.3,0.56,0.1),u).add(tmp3.set(0,0.05*Math.abs(Math.sin(u*20)),0));g.rotation.set(0,0,0);flip=-1;vis=true;}
    g.visible=vis; g.scale.set(GS*flip,GS,GS*flip);
    Q.value=te<TH+0.05?1-1.1*ss(TH-0.02,TH+0.05,te):(te<TB+0.4?-0.1:-0.1+1.1*ss(TB+0.4,TB+0.5,te));
    Kk.value=0.04+0.35*ss(T1-0.05,T1,te)*(1-ss(TI+0.1,TI+0.3,te));
    shadow.pose(g.position.x,g.position.z,0.8,vis?0.4*cl(1.4-g.position.y*0.4):0);
    // zarpazos en X
    claws.forEach(({m,k,i})=>{const u=(k?ia:i1)-i*0.02, [p,rot]=CL[k];m.visible=u>=0&&u<0.42;
      tmp.copy(p).add(tmp2.set(-Math.sin(rot)*0.0,0,0));towardCam(m.position,tmp,0.45);billboard(m,rot);
      m.position.add(tmp2.set(Math.cos(rot+1.5708)*(i-1)*0.24,Math.sin(rot+1.5708)*(i-1)*0.24,0));
      m.scale.set((k?1.15:0.95)*(0.5+0.6*e3(u/0.06)),k?1.15:1,1);m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*ss(0.08,0.4,u);});
    s1.pose(i1,tmp.copy(TC).add(tmp2.set(0,0.15,0.3)),0.9);
    s2.pose(ia,tmp.copy(TC).add(tmp2.set(0.1,0,0.3)),1.2);
    poof1.pose(te-0.1,CX,0,0.4,0.8); poof2.pose(te-TR+0.04,4.25,-0.15,0.4,0.8); ring.pose(ia,TX,0,0.45,0.9);
    caster.position.y=0.18*Math.sin(cl(te/0.2)*3.1416); caster.rotation.z=0.12*Math.sin(cl(te/0.2)*3.1416);
    const h1=hitE(i1,9), h=hitE(ia,6);
    target.position.x=TX+0.08*h1+0.26*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=0.12*h1*Math.cos(i1*30)-0.24*h*Math.cos(ia*13);
    target.scale.set(1+0.06*h,1-0.09*h,1+0.06*h);
    o.em=0.25*h1+0.35*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(TC);o.gs=te>=T1?1.2:0.4;o.ga=te>=T1?0.3*h1:0.05;o.li=te>=T1?4*h1:0.5;o.ia=i1;o.c.copy(TC);o.shake=te>=T1?0.5:0;o.dist=0.5;o.flash=0.5;}
    else{o.g.copy(TC);o.gs=1.5+3*ia;o.ga=Math.exp(-ia*10)*0.45;o.li=6*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1;o.dist=1;o.flash=0.8;}
  };
}},{zoneCaster:0.6,zoneTarget:1.5}));

// =====================================================================
// 6 · HARE — una liebre espiritual dorada salta del lanzador y cruza el tablero en tres brincos que dejan huellas de pata
//     brillantes y polvo, con una estela color zanahoria; al llegar da una doble patada voladora al rival (chispa, onda
//     dorada, polvo), rebota frenando y tres chispas doradas suben al equipo (+1 PA). Vuelve dando saltos y se deshace en motas. ti 0,7 s
// =====================================================================
defs.push(Object.assign({key:"sty_hare",name:"Hare (estilizado)",dur:2.1,ti:0.7,pal:P_HARE,tier:2,stylized:true,
  phases:[["Arranque",0],["Carrera",0.108],["Golpe",0.7],["Frenazo",0.769],["Regreso",1.322]],
build(a){
  const L=a.L,TA=0.108,TI=0.7,TF=0.769,TB=1.322,HS=1.5;
  const Q={value:1}, Kk={value:0.25};
  const M=furMats(Q,Kk,HAREB,'uC1');
  const sph=r=>new THREE.SphereGeometry(r,18,14);
  const hare=creature(L.mesh,M,[
    [sph(0.32),'fur',0,0,0,0,0,0,1.2,0.95,0.85],
    [sph(0.2),'fur',0.34,0.26,0],
    [sph(0.09),'cream',0.5,0.2,0,0,0,0,1.1,0.85,1],
    [sph(0.028),'dark',0.58,0.23,0],
    [sph(0.032),'dark',0.44,0.33,0.11],[sph(0.032),'dark',0.44,0.33,-0.11],
    [new THREE.CapsuleGeometry(0.06,0.38,3,8),'top',0.22,0.64,0.08,0.15,0,0.35],[new THREE.CapsuleGeometry(0.06,0.38,3,8),'top',0.22,0.64,-0.08,-0.15,0,0.35],
    [new THREE.CapsuleGeometry(0.035,0.3,3,8),'pink',0.235,0.64,0.1,0.15,0,0.35],[new THREE.CapsuleGeometry(0.035,0.3,3,8),'pink',0.235,0.64,-0.1,-0.15,0,0.35],
    [sph(0.11),'cream',-0.42,0.08,0],
    [sph(0.13),'fur',-0.1,-0.2,0.17,0,0,0,1.6,0.75,0.7],[sph(0.13),'fur',-0.1,-0.2,-0.17,0,0,0,1.6,0.75,0.7],
    [new THREE.CapsuleGeometry(0.05,0.16,3,6),'fur',0.24,-0.22,0.1],[new THREE.CapsuleGeometry(0.05,0.16,3,6),'fur',0.24,-0.22,-0.1],
  ]);
  // brincos: puntos de apoyo (x) y altura de cada salto
  const HOPS=[[-3.05,0],[-1.0,1.25],[1.05,1.25]], HITP=V3(2.55,1.05,0.15);
  const prints=[0,1,2].map(i=>{const m=groundPlane(0.75,0,0.03,S.mat(PAW,{},{mode:'energy'}));L.decal.add(m);return m;});
  const spark=S.hitSpark(L.mesh,2.1,{seed:0.58}), ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.0);
  const shock=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(ARC_FS,{},{mode:'energy',side:THREE.DoubleSide})); L.mesh.add(shock);
  const shadow=S.contactShadow(L.decal,0.9);
  const UH={value:V3(0,0,0)};
  const K=`uniform vec3 uHare;const float TA=${f(TA)};const float TI=${f(TI)};const float TF=${f(TF)};const float TB=${f(TB)};const vec3 HITP=${v3(HITP)};`;
  // estela color zanahoria detrás de la liebre
  S.pts(L.part,30,VV+K+`void main(){float life=.28+aSeed.y*.14;float k=uT/life+aSeed.x;float age=fract(k);float bt=(floor(k)-aSeed.x)*life;
   vec3 r=rr(floor(k));float on=step(TA,uT)*(1.-step(TI+.05,uT))+step(TB,uT)*(1.-step(TB+.6,uT));
   vec3 p=uHare+vec3(-.25-age*.5,.1+r.y*.35-age*.2,(r.z-.5)*.35);vA=on*(1.-age);vK=smoothstep(.4,1.,age);vR=0.;put(p,(.24+.1*r.x)*(1.-.5*age));}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy',uniforms:{uHare:UH}});
  // polvo en cada apoyo y en el frenazo
  S.pts(L.part,30,VV+K+`void main(){float g=floor(aSeed.x*5.);float s=g<.5?.02:(g<1.5?.31:(g<2.5?.52:(g<3.5?TF:TB+.3)));
   float x=g<.5?-3.05:(g<1.5?-1.:(g<2.5?1.05:(g<3.5?2.3:-1.5)));
   float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(x,.15,.1)+vec3(cos(an)*(g>2.5&&g<3.5?.4:1.),0.,sin(an)*.6)*(.15+.6*(1.-exp(-t*6.)))+vec3(0.,t*(.4+.3*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.36+.15*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.02}));
  // +1 PA: chispas doradas que suben del golpe y bajan al lanzador y al equipo
  S.pts(L.part,3,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TF+.1+i*.07;float u=clamp((uT-s)/.5,0.,1.);
   vec3 a0=HITP+vec3(0.,.4,0.),a1=i<.5?vec3(-3.7,1.2,0.):(i<1.5?vec3(-3.7,1.2,-1.4):vec3(-3.7,1.2,1.4));
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(0.,sin(u*3.14159)*(1.5+.3*i),0.);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=uT*6.;put(p,.32);}`,
   S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  // motas doradas al deshacerse
  S.pts(L.part,16,VV+K+`void main(){float s=TB+.5+aSeed.x*.1;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-2.2,.6,.1)+rnd()*.45+vec3(0.,t*1.2,0.);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.16+.06*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  const hopAt=(te,out)=>{
    // ida: 3 brincos hasta el golpe; patada; rebote; vuelta en 2 brincos
    if(te<TA){out.set(-3.2+0.15*te/TA,0.4+0.2*ss(0,TA,te),0.15);return 0.3;}
    if(te<TI){const T=[TA,0.31,0.52,TI],P=[-3.05,-1.0,1.05,HITP.x];let i=0;while(i<2&&te>T[i+1])i++;const u=(te-T[i])/(T[i+1]-T[i]);
      const x=P[i]+(P[i+1]-P[i])*u, y=(i<2?0.4:0.4+0.65*u)+Math.sin(u*Math.PI)*(i<2?1.15:0.6);out.set(x,y,0.15);return (i<2?-0.4+0.8*u:-0.6);}
    if(te<TF+0.25){const u=cl((te-TI)/(TF+0.25-TI));out.set(HITP.x-0.9*e3(u),1.05-0.65*u+Math.sin(u*Math.PI)*0.5,0.15);return 0.4-0.4*u;}
    if(te<TB){out.set(HITP.x-0.9,0.4,0.15);return 0;}
    const u=cl((te-TB)/0.6);out.set(HITP.x-0.9-(HITP.x-0.9+2.2)*u,0.4+Math.abs(Math.sin(u*Math.PI*2))*0.9,0.15);return 0;
  };
  a.pose=function(te,o){
    const ia=te-TI, g=hare.g;
    const rot=hopAt(te,g.position); g.rotation.set(0,0,rot);
    const back=te>=TB, kick=ss(TI-0.12,TI,te)*(1-ss(TI+0.05,TF,te));
    g.scale.set(HS*(back?-1:1)*(1+0.12*kick),HS*(1-0.1*kick),HS*(back?-1:1));
    g.visible=te>0.01&&te<TB+0.6;
    Q.value=te<TA?1-1.1*ss(0,TA,te):(te<TB+0.45?-0.1:-0.1+1.1*ss(TB+0.45,TB+0.6,te));
    Kk.value=0.04+0.4*kick;
    UH.value.copy(g.position);
    shadow.pose(g.position.x,0.15,0.8,g.visible?0.42*cl(1.5-g.position.y*0.45):0);
    // huellas
    const PT=[0.31,0.52,TF+0.25], PX=[-1.0,1.05,HITP.x-0.9];
    prints.forEach((m,i)=>{const u=te-PT[i];m.visible=u>=0;m.position.set(PX[i],0.03,0.15);m.rotation.z=-1.57;m.scale.setScalar(0.6+0.4*e3(u/0.1));set(m,u>=0?-0.1+1.15*ss(0.6,1.2,u):0,1);});
    spark.pose(ia,tmp.copy(TC).add(tmp2.set(-0.2,-0.05,0.35)),1.2);
    ring.pose(ia,TX,0,0.5,1); ring2.pose(ia-0.1,TX,0,0.45,0.75);
    shock.visible=ia>=0&&ia<0.35; shock.position.copy(TC).add(tmp.set(-0.35,0,0.3)); billboard(shock,0); shock.rotation.y+=0; shock.scale.setScalar(0.6+1.6*e3(ia/0.3)); set(shock,0.1+0.9*cl(ia/0.35),1);
    caster.rotation.z=-0.08*ss(0,TA,te)*(1-ss(TA,TA+0.15,te));
    const h=hitE(ia,6);
    target.position.x=TX+0.3*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.26*h*Math.cos(ia*13);
    target.scale.set(1+0.08*h,1-0.11*h,1+0.08*h);
    const pa=ss(TF+0.55,TF+0.62,te)*(1-ss(TF+0.65,TF+0.95,te)); glowOf(caster,U.uC1.value,0.45*pa);
    o.em=0.35*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(g.position);o.gs=0.6;o.ga=0.1;o.li=1.2;o.ia=ia;o.c.copy(g.position);o.shake=0;o.dist=0.2;o.flash=0.2;}
    else{o.g.copy(TC);o.gs=1.6+3*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=7*Math.exp(-ia*5);o.ia=ia;o.c.copy(TC);o.shake=1;o.dist=1;o.flash=0.85;}
  };
}},{zoneCaster:0.6,zoneTarget:1.2}));

VFX.module("Estilizado · Bestia · Cola",defs);
})();

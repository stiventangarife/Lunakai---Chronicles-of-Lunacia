// =====================================================================
// ESTILIZADO · REPTIL · OREJAS (Hito 101) — las 8 cartas de orejas de Reptil hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_roCurvedSpine…). Mismos dur / ti / fases que las originales (el daño llega igual).
// Identidad de clase: escamas violeta, púas de hueso, veneno lima y púrpura, escarcha de sangre fría. Los efectos nacen
// de la nuca / orejas del lanzador (≈ (-3.8,1.85,0)) o del mentón (≈ (-3.3,1.2,0.25)).
// Semántica según PartCards.js:
//   Curved Spine (aliado: escudo 60 + Sangrado a quien le pegue cuerpo a cuerpo) · Friezard (sobre sí: cura 25 y Potenciado
//   a todos los aliados) · Hidden Ears (sobre sí: escudo 35, doble en la ronda 1) · Pogona (daño + Frágil)
//   Sidebarb (daño + Veneno + Sangrado) · Small Frill (sobre sí: cura 30 y Veneno a todos los rivales)
//   Swirl (daño + −1 alcance) · Venom Nail (duplica el Veneno del objetivo; nivel 3)
// Cartas sobre aliado: el receptor es el aliado del laboratorio (allies:1, ALLY_POS[0]); lanzadas sobre sí mismas, el
// puente lleva ese punto al lanzador.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CURVED=pal("Sty Reptil · Púa curva",["#f3b9d4","#6a2c94"]);
const P_FRIEZ=pal("Sty Reptil · Escarcha",["#8fc8ff","#4a35b8"]);
const P_HIDDEN=pal("Sty Reptil · Camaleón",["#7fe8c8","#6630a8"]);
const P_POGONA=pal("Sty Reptil · Pogona",["#ffa53a","#4a1f5e"]);
const P_SIDE=pal("Sty Reptil · Púa lateral",["#b8f04a","#6a1fa0"]);
const P_FRILL=pal("Sty Reptil · Gorguera",["#ff86e0","#4a2cc0"]);
const P_SWIRL=pal("Sty Reptil · Remolino",["#d3a2ff","#3c2590"]);
const P_VENOM=pal("Sty Reptil · Miasma",["#b06cff","#2a1048"]);

const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7;
const NAPE=V3(-3.82,1.85,0), CHIN=V3(-3.28,1.18,0.25);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const YA=V3(0,1,0), XA=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const aimY=(o,d)=>{tmp3.copy(d);if(tmp3.lengthSq()<1e-8)tmp3.set(0,1,0);o.quaternion.setFromUnitVectors(YA,tmp3.normalize());};
const qbz=(out,a,b,c,t)=>{const u=1-t;return out.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const groundStrip=(len,w,mat,seg=40)=>new THREE.Mesh(new THREE.PlaneGeometry(len,w,seg,1).rotateX(-Math.PI/2),mat);

// ---------- colores de materia (semánticos, fijos) ----------
const BONE="vec3(.82,.66,.5)", CRIMSON="vec3(.7,.06,.14)", SCALEV="vec3(.4,.2,.62)", DARKV="vec3(.15,.07,.21)",
  LIME="vec3(.52,.88,.16)", ICE="vec3(.1,.24,.78)", ICEV="vec3(.32,.14,.78)", ORANGE="vec3(1.,.46,.08)",
  EARTH="vec3(.55,.42,.29)", TEAL="vec3(.22,.78,.62)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// caparazón de energía: fresnel, revela de abajo arriba (uP), se erosiona (uD), destello (uF); extra suma a `bands`
const SHELL_FS=(extra='',colExpr='styRamp(.5+.45*fr)')=>`uniform float uD;uniform float uF;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=clamp(vP.y,0.,1.);
 if(h>uP*1.15-.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);
 float bands=0.;vec3 tint=vec3(1.);${extra}
 float m=(pow(fr,1.8)*.85+.14+bands)*er*(1.-smoothstep(uP*1.15-.25,uP*1.15-.1,h)*.6);
 gl_FragColor=vec4(${colExpr}*tint*(.9+.6*uF),min(m,1.)*uA);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// grietas radiales en el suelo con brillo de color (energía): uP = erosión
const CRACK_FS=(col)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float n=styNoise(vec2(an*.7,r*.6)+.3).r;float k=an/6.2832*9.+n*.9;float fk=abs(fract(k)-.5);
 float m=smoothstep(.07,.02,fk-.012/(r+.15))*smoothstep(1.,.55,r)*step(.1,r);
 m=max(m,band(r,.32+.04*n,.035));if(m<.02)discard;
 float er=styErode(styNoise(vUv*.9).r*.6+r*.4,uP,.12);gl_FragColor=vec4(styRampOf(${col},.65+.3*(1.-r))*1.15,m*er*uA);}`;
// anillo de pincel en el suelo con color propio (energía): uP = erosión
const RING_COL=(col,gain=1.1)=>`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRampOf(${col},.6+.4*s.g)*${f(gain)},s.r*er*uA*.9);}`;
// chevrón hacia arriba (Potenciado)
const UPCHEV=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.12+abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;gl_FragColor=vec4(styRampOf(${col},.55+.45*step(y,.12-abs(q.x)*.9)),a);}`;
// copo de nieve de seis brazos (materia)
const FLAKE_P=col=>S.PV+`void main(){vec2 q=(styPC()-.5)*2.;float r=length(q);if(r>1.)discard;float an=atan(q.y,q.x);
 float arm=abs(sin(an*3.));float w=.1+.06*smoothstep(.22,.0,abs(r-.62));float m=max(step(arm*r,w)*step(r,.95),step(r,.24));
 if(m<.5)discard;float er=styErode(styNoise(q*.3+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 gl_FragColor=vec4(styRampOf(${col},.3+.42*(1.-r)),er*vA);}`;
// partícula redonda iluminada (gota, burbuja sólida)
const BALL_P=(colExpr)=>S.PV+`void main(){vec2 q=styPC()-.5;if(length(q)>.46)discard;
 vec3 n=normalize(vec3(q*2.1,sqrt(max(0.,1.-dot(q*2.1,q*2.1)))));float l=styLight(n,stySunV());
 float er=styErode(styNoise(q*.7+vMix).r,vK*1.05-.05,.08);if(er*vA<.02)discard;
 vec3 c=${colExpr};float hl=step(length(q-vec2(-.13,.14)),.07);gl_FragColor=vec4(mix(c*styTint(l),vec3(1.),hl*.7),er*vA);}`;
// púa curva: cono con la punta en +Y doblado hacia +X (se hace una vez al construir)
function spineGeo(len,rad,bend,seg=10){const g=new THREE.ConeGeometry(rad,len,seg,8);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i)/len+0.5;p.setX(i,p.getX(i)+bend*y*y*len);} g.computeVertexNormals(); return g;}
const defs=[];

// =====================================================================
// 1 · CURVED SPINE — un abanico de púas de hueso curvas se eriza tras la nuca; salen en arco y se clavan en corona
//     alrededor del aliado; entre ellas sube un caparazón de escamas violeta (escudo 60). Represalia: las púas se
//     arrancan y salen disparadas hacia fuera goteando sangre (Sangrado al atacante cuerpo a cuerpo). ti 0,8 s
// =====================================================================
const SPINE_BODY=`float t=clamp(vP.y/.75+.5,0.,1.);base=mix(${BONE},${CRIMSON},smoothstep(.62,.95,t));
 base=mix(vec3(.55,.32,.5),base,smoothstep(.0,.2,t));lb=-.12*smoothstep(.08,.0,abs(fract(t*4.)-.5)-.38);`;
defs.push({key:"sty_roCurvedSpine",name:"Curved Spine (estilizado)",dur:2.2,ti:0.8,pal:P_CURVED,tier:2,allies:1,stylized:true,
  phases:[["Erizado",0],["Púas",0.34],["Escudo",0.8],["Represalia",1.32],["Fin",1.85]],
build(a){
  const L=a.L,TL=0.34,FL=0.27,TI=0.8,TR=1.32,TE=1.85,N=8,RR=0.92,A=ALLY_POS[0],AC=V3(A.x,1.0,A.z);
  const mat=S.mat(SOLID(SPINE_BODY,{hot:'vec3(1.,.35,.45)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const geo=spineGeo(1.2,0.15,0.32);
  const sp=[];
  for(let k=0;k<N;k++){
    const m=new THREE.Mesh(geo,mat); L.mesh.add(m);
    const fa=(k-(N-1)/2)*0.34;
    const fdir=V3(-0.45,Math.cos(fa),Math.sin(fa)*1.1).normalize();
    const fan=V3(NAPE.x-0.1,NAPE.y-0.15,0).addScaledVector(fdir,0.7);
    const th=k/N*Math.PI*2+0.3, out=V3(Math.cos(th),0,Math.sin(th));
    const B=V3(A.x+out.x*RR,0,A.z+out.z*RR);
    const ctrl=V3((fan.x+B.x)/2,3.4,(fan.z+B.z)/2);
    const plant=V3(-out.x*0.35,-1,-out.z*0.35).normalize();      // clavada: punta hacia el suelo, inclinada hacia dentro
    sp.push({m,fan,fdir,B,out,ctrl,plant,t0:TL+k*0.022});
  }
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),S.mat(SHELL_FS(
    `vec2 g=vec2(atan(vP.z,vP.x)*2.6+floor(vP.y*7.)*.5,vP.y*7.);vec2 c=fract(g)-.5;
     float sc=smoothstep(.36,.48,max(abs(c.x)*1.1,abs(c.y)));bands=sc*.5;`,`mix(vec3(.42,.16,.7),vec3(.95,.45,.8),sc*.7+pow(fr,3.)*.4)`),
    {uD:{value:0},uF:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  shell.position.set(A.x,0,A.z); shell.scale.set(1.15,1.6,1.15); L.mesh.add(shell);
  const ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,3.6);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.44});
  const K=`const float TR=${f(TR)};const vec3 AP=${v3(V3(A.x,0,A.z))};const float RR=${f(RR)};`;
  // gotas de sangre que saltan de las púas al arrancarse (represalia)
  S.pts(L.part,24,VV+K+`void main(){float i=floor(aSeed.x*8.);float th=i/8.*6.2832+.3;vec3 o=vec3(cos(th),0.,sin(th));
   float s=TR+.03+aSeed.y*.08;float life=.55+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(o*1.6+vec3(0.,1.1,0.)+rnd()*.45)*(2.2+1.4*aSeed.w);vec3 p=AP+o*(RR+.2)+vec3(0.,.35,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=3.14159;put(p,.14+.06*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:CRIMSON}));
  // polvo de hueso al clavarse
  S.pts(L.part,18,VV+K+`void main(){float i=floor(aSeed.x*8.);float th=i/8.*6.2832+.3;vec3 o=vec3(cos(th),0.,sin(th));
   float s=${f(TL+FL)}+i*.022;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=AP+o*RR+vec3(rnd().x*.25,.08+t*(.6+.4*aSeed.z),rnd().z*.25);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.15*aSeed.w)*(.6+.7*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR, grow=ss(0.02,TL,te);
    caster.rotation.z=0.06*ss(0,TL,te)-0.12*ss(TL,TL+0.1,te)+0.06*ss(TL+0.2,TI,te);
    sp.forEach((s,k)=>{const m=s.m;
      if(te<s.t0){m.position.copy(s.fan);m.position.addScaledVector(s.fdir,0.12*Math.sin(te*22+k)*grow);aimY(m,s.fdir);m.scale.setScalar(Math.max(back(grow+0.0),0.001));}
      else if(te<s.t0+FL){const u=(te-s.t0)/FL;qbz(m.position,s.fan,s.ctrl,s.B,u);qbz(tmp,s.fan,s.ctrl,s.B,Math.min(u+0.04,1));
        tmp.sub(m.position);aimY(m,u>0.96?s.plant:tmp);m.scale.setScalar(1.05);}
      else if(te<TR){const q=hitE(te-s.t0-FL,14)*0.12*Math.sin((te-s.t0)*70);
        tmp.copy(s.plant).addScaledVector(s.out,q);aimY(m,tmp);m.position.copy(s.B).addScaledVector(s.plant,-0.45).add(tmp2.set(0,0.05,0));m.scale.setScalar(1.05);}
      else{const u=e3((te-TR)/0.32);tmp.copy(s.out).add(tmp2.set(0,0.28,0));aimY(m,tmp);
        m.position.copy(s.B).addScaledVector(s.out,0.25+2.4*u);m.position.y=0.4+0.25*u;m.scale.setScalar(1.05);}
      m.visible=grow>0.001;
    });
    mat.uniforms.uQ.value=-1+2.1*ss(TR+0.2,TE+0.2,te);
    mat.uniforms.uK.value=0.55*hitE(ir,7)+0.3*hitE(ia,7)+0.2*ss(0.1,TL,te)*(te<TL+0.1?1:0);
    const su=shell.material.uniforms;
    shell.visible=ia>=0&&te<2.2; su.uP.value=e3((te-TI)/0.28); su.uD.value=-0.1+1.2*ss(TE,2.2,te);
    su.uF.value=1.1*hitE(ia,6)+0.9*hitE(ir,9); su.uA.value=0.85;
    const pul=1+0.06*hitE(ir,8); shell.scale.set(1.15*pul,1.6*pul,1.15*pul);
    ring.pose(ia,A.x,A.z,0.5,1); ring2.pose(ir,A.x,A.z,0.45,1.1);
    spark.pose(ia,AC,0.9);
    const h=hitE(ia,7); allies[0].scale.set(1+0.05*h,1-0.06*h,1+0.05*h);
    glowOf(allies[0],COL.setRGB(0.85,0.55,1),0.45*h+0.18*(ia>=0&&te<TE?1:0)+0.35*hitE(ir,8));
    if(ia<0){o.g.copy(NAPE);o.gs=0.7*grow;o.ga=0.12*grow;o.li=1.2*grow;}
    else{o.g.copy(AC);o.gs=1.4;o.ga=0.25*h+0.1;o.li=2.5*h+1;}
    o.ia=ia;o.c.copy(AC);o.shake=0.25;o.dist=0.4;o.flash=0.35;
  };
}});

// =====================================================================
// 2 · FRIEZARD — una corona de seis cristales de hielo violeta se forma sobre el lanzador y gira; el aliento helado
//     sube en espiral; en el impacto los cristales estallan, se abre un sello de escarcha y una onda de cura recorre
//     a todo el escuadrón. Después caen copos sanadores y suben chevrones rojos (Potenciado +10 %). ti 1,0 s
// =====================================================================
const ICE_BODY=`float t=clamp(vP.y*.9+.5,0.,1.);base=mix(${ICE},${ICEV},t);lb=.05;`;
defs.push({key:"sty_roFriezard",name:"Friezard (estilizado)",dur:2.3,ti:1.0,pal:P_FRIEZ,tier:2,stylized:true,
  phases:[["Espíritu",0],["Aliento",0.5],["Congelación",1.0],["Bendición",1.35],["Fin",1.95]],
build(a){
  const L=a.L,TA=0.5,TI=1.0,TB=1.35,N=6,CR=V3(CX,2.85,0);
  const mat=S.mat(SOLID(ICE_BODY,{hot:'vec3(.15,.3,.95)',rim:.15}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const geo=new THREE.OctahedronGeometry(0.36,0); geo.scale(0.75,2.2,0.75);
  const cr=[];for(let i=0;i<N;i++){const m=new THREE.Mesh(geo,mat);L.mesh.add(m);cr.push(m);}
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(0.2,0),mat); L.mesh.add(core);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.31});
  const seal=groundPlane(3.2,CX,0.028,S.mat(CRACK_FS(ICE),{},{mode:'energy'})); L.decal.add(seal);
  const frost=groundPlane(2.6,CX,0.024,S.mat(STAIN('vec3(.7,.78,1.)',.5),{},{mode:'matter'})); L.decal.add(frost);
  const wave=groundPlane(4,CX,0.034,S.mat(RING_COL('vec3(.45,.95,.55)',1.2),{},{mode:'energy'})); L.decal.add(wave);
  const wave2=groundPlane(4,CX,0.036,S.mat(RING_COL(ICE,1.1),{},{mode:'energy'})); L.decal.add(wave2);
  const K=`const float TA=${f(TA)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 CR=${v3(CR)};const float CX=${f(CX)};`;
  // aliento helado: nubes de escarcha que suben en espiral alrededor del lanzador
  S.pts(L.part,26,VV+K+`void main(){float s=TA*.6+aSeed.x*(TI-TA*.6);float life=.55+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*4.;float rad=.75-.35*age;vec3 p=vec3(CX+cos(an)*rad,.25+age*2.1,sin(an)*rad*.9);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28+age;put(p,(.42+.2*aSeed.w)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'vec3(.3,.34,.85)',bias:-.06}));
  // esquirlas de los cristales al estallar
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.45,0.))*(2.+2.2*aSeed.z);vec3 p=CR+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.2+.1*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:ICEV}));
  // copos sanadores que caen sobre el escuadrón (radio amplio)
  S.pts(L.part,34,VV+K+`void main(){float s=TB-.15+aSeed.x*.55;float life=.75+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;float rad=.4+2.5*sqrt(aSeed.w);vec3 p=vec3(CX+cos(an)*rad,2.6-age*2.3,sin(an)*rad*.8)+vec3(sin(age*5.+aSeed.y*6.)*.15,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.7,1.,age);vR=age*3.+aSeed.y*6.;put(p,.36+.14*aSeed.y);}`,
   FLAKE_P('vec3(.26,.34,.95)'));
  // chevrones rojos (Potenciado) que suben del lanzador
  S.pts(L.part,8,VV+K+`void main(){float i=floor(aSeed.x*8.);float s=TB+i*.06;float life=.55;float age=(uT-s)/life;
   float an=i*2.4;vec3 p=vec3(CX+cos(an)*.5,.5+age*1.6,sin(an)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.34);}`,
   UPCHEV('vec3(1.,.22,.18)'),{mode:'energy'});
  // motas de cura verdes
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.12+aSeed.x*.7;float life=.6+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*.55,.2+age*1.7,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*3.;put(p,.22);}`,
   S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, form=ss(0.02,TA,te), spin=te*2.2+ss(TA,TI,te)*4;
    const rad=0.95*(1-0.35*ss(TA,TI,te)), h=CR.y-0.25*ss(TA,TI,te);
    cr.forEach((m,i)=>{const an=i/N*Math.PI*2+spin;m.position.set(CX+Math.cos(an)*rad,h+0.08*Math.sin(te*6+i),Math.sin(an)*rad*0.9);
      m.rotation.set(0.25*Math.sin(an),an,0.35*Math.cos(an));m.scale.setScalar(Math.max(back(cl(form*1.2-i*0.04)),0.001));m.visible=ia<0&&form>0.001;});
    core.position.set(CX,h,0); core.rotation.set(te*2,te*3,0); core.scale.setScalar(Math.max(ss(TA,TI,te)*1.4,0.001)); core.visible=ia<0&&te>TA;
    mat.uniforms.uK.value=0.45*ss(TA,TI,te)+0.2*Math.sin(te*14)*ss(TA,TI,te);
    spark.pose(ia,tmp.set(CX,h,0),1.1);
    seal.visible=ia>=0; seal.scale.setScalar(Math.max(0.5+0.6*e3(ia/0.25),0.001)); set(seal,ia>=0?-0.1+1.15*ss(TB+0.3,2.25,te):0,1);
    frost.visible=ia>=0; frost.scale.setScalar(Math.max(0.4+0.6*e3(ia/0.3),0.001)); set(frost,ia>=0?-0.1+1.15*ss(1.7,2.3,te):0,1);
    const w=cl(ia/0.7); wave.visible=ia>=0&&w<1; wave.scale.setScalar(Math.max(0.3+2.6*e3(w),0.001)); set(wave,0.05+0.9*w,1);
    const w2=cl((ia-0.1)/0.6); wave2.visible=ia>=0.1&&w2<1; wave2.scale.setScalar(Math.max(0.3+2.0*e3(w2),0.001)); set(wave2,0.05+0.9*w2,1);
    const env=ss(TB,TB+0.15,te)*(1-ss(2.0,2.3,te));
    glowOf(caster,COL.setRGB(1,0.35,0.3),0.3*env+0.3*hitE(ia,6));
    caster.scale.set(1,1+0.04*hitE(ia,6),1);
    if(ia<0){o.g.set(CX,h,0);o.gs=0.9*form;o.ga=0.15*form;o.li=1.6*form+2*ss(TA,TI,te);}
    else{o.g.set(CX,1.0,0);o.gs=1.6+2*ia;o.ga=Math.exp(-ia*8)*0.35;o.li=4*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0.2;o.dist=0.4;o.flash=0.35;
  };
}});

// =====================================================================
// 3 · HIDDEN EARS — dos cintas de escamas iridiscentes bajan en espiral desde las orejas; en el impacto un caparazón de
//     escamas camaleónicas (verde agua ↔ violeta) envuelve al lanzador (escudo 35); a 0,7 s el Axie hace un amago de
//     esquiva y suelta su «muda» de escamas, que cae y se deshace. ti 0,38 s
// =====================================================================
defs.push({key:"sty_roHiddenEars",name:"Hidden Ears (estilizado)",dur:1.3,ti:0.38,pal:P_HIDDEN,tier:1,stylized:true,
  phases:[["Repliegue",0],["Camuflaje",0.38],["Evasión",0.7],["Fin",1.05]],
build(a){
  const L=a.L,TI=0.38,TV=0.7;
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,40,22,0,Math.PI*2,0,Math.PI*0.62),S.mat(SHELL_FS(
    `vec2 g=vec2(atan(vP.z,vP.x)*3.+floor(vP.y*8.)*.5,vP.y*8.);vec2 c=fract(g)-.5;float d=length(c*vec2(1.,1.25));
     float sc=smoothstep(.34,.46,d);bands=sc*.5+.12*smoothstep(.3,.0,d);`,
    `mix(vec3(.04,.42,.34),vec3(.34,.1,.62),fract(fr*1.3+vP.y*.8+uT*.35+floor(g.x)*.13))*(1.+.8*sc)`),
    {uD:{value:0},uF:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  shell.position.set(CX,0,0); shell.scale.set(1.0,1.75,1.0); L.mesh.add(shell);
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TI=${f(TI)};const float TV=${f(TV)};const float CX=${f(CX)};`;
  const IRI=`mix(${TEAL},vec3(.58,.3,.92),vMix)`;
  // cintas de escamas que bajan en espiral desde las dos orejas
  S.pts(L.part,40,VV+K+`void main(){float side=aSeed.x<.5?-1.:1.;float s=aSeed.y*.18;float u=clamp((uT-s)/(TI+.05-s),0.,1.);
   float an=side*1.2+u*5.5*side+aSeed.z*.4;float rad=.25+.5*u;vec3 p=vec3(CX-.1+cos(an)*rad,1.95-1.7*u,.18*side+sin(an)*rad*.9);
   vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.85,1.,u);vR=an+aSeed.w*3.;put(p,.2+.1*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:IRI,bias:.05}));
  // muda: escamas que se desprenden del caparazón y caen (evasión)
  S.pts(L.part,30,VV+K+`void main(){float s=TV+aSeed.x*.12;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float h=.3+aSeed.w*1.4;vec3 p=vec3(CX+cos(an)*.95,h,sin(an)*.9)+vec3(cos(an),0.,sin(an))*t*.8+vec3(0.,-2.6*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.22+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:IRI,bias:.05}));
  // destello de camuflaje: motas que parpadean sobre el cuerpo
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.5;float life=.22;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX+cos(an)*.6,.4+aSeed.w*1.3,sin(an)*.55);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*4.;put(p,.26);}`,
   S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, iv=te-TV;
    caster.scale.set(1+0.05*ss(0,TI,te)*(1-ss(TI,TI+0.15,te)),1-0.07*ss(0,TI,te)*(1-ss(TI,TI+0.15,te)),1);
    // amago de esquiva: se aparta y vuelve
    const dv=iv>=0?Math.sin(cl(iv/0.3)*Math.PI):0; caster.position.z=0.32*dv; caster.rotation.z=0.12*dv;
    const su=shell.material.uniforms;
    shell.visible=ia>=0&&te<1.3; su.uP.value=e3((te-TI)/0.2); su.uD.value=-0.1+1.2*ss(1.0,1.3,te);
    su.uF.value=0.9*hitE(ia,8)+0.7*hitE(iv,10); su.uA.value=1.0*(1-0.5*dv);
    shell.position.z=0.32*dv*0.6;
    ring.pose(ia,CX,0,0.45,1);
    glowOf(caster,COL.setRGB(0.4,0.9,0.75),0.35*hitE(ia,6)+0.12*(ia>=0?1:0)*(1-ss(1.0,1.3,te)));
    if(ia<0){o.g.copy(NAPE);o.gs=0.6;o.ga=0.1;o.li=1.2*ss(0,TI,te);}
    else{o.g.set(CX,1.0,0);o.gs=1.2+ia;o.ga=Math.exp(-ia*8)*0.3;o.li=2.5*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.3;o.flash=0.25;
  };
}});

// =====================================================================
// 4 · POGONA — bajo el mentón se infla una barba de púas negras con puntas naranjas; ruge: tres anillos de púas
//     viajan al rival creciendo; el rival se encoge intimidado, las púas estallan en esquirlas y bajo él se abren
//     grietas naranjas (Frágil). ti 0,9 s
// =====================================================================
const BEARD_BODY=`float t=clamp(vP.y/.5+.5,0.,1.);base=mix(vec3(.16,.08,.18),${ORANGE},smoothstep(.55,.95,t));lb=-.04;`;
defs.push({key:"sty_roPogona",name:"Pogona (estilizado)",dur:2.1,ti:0.9,pal:P_POGONA,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Inflado",0],["Intimidación",0.55],["Impacto",0.9],["Frágil",1.2],["Fin",1.75]],
build(a){
  const L=a.L,TR=0.55,TI=0.9,NB=13,NR=3,NS=10;
  const mat=S.mat(SOLID(BEARD_BODY,{hot:'vec3(1.,.5,.12)',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const bgeo=spineGeo(0.85,0.12,0.12,8);
  const beard=new THREE.Group(); L.mesh.add(beard);
  for(let i=0;i<NB;i++){const m=new THREE.Mesh(bgeo,mat);const an=(i/(NB-1)-0.5)*Math.PI*1.25-Math.PI/2;   // abanico hacia abajo-delante
    const d=V3(Math.cos(an)*0.55+0.45,Math.sin(an),0.55*Math.cos(an*1.3)*((i%2)?1:-1)*0.6).normalize();
    m.position.copy(d).multiplyScalar(0.42); aimY(m,d); beard.add(m);}
  const rgeo=spineGeo(0.6,0.1,0,8);
  const rings=[];for(let r=0;r<NR;r++){const g=new THREE.Group();L.mesh.add(g);
    for(let i=0;i<NS;i++){const m=new THREE.Mesh(rgeo,mat);const an=i/NS*Math.PI*2;const d=V3(0,Math.cos(an),Math.sin(an));
      m.position.copy(d).multiplyScalar(0.55);aimY(m,d);g.add(m);}
    rings.push({g,t0:TR+r*0.07});}
  const roar=new THREE.Mesh(new THREE.PlaneGeometry(2,2),S.mat(RING_COL(ORANGE,1.1),{},{mode:'energy',depthTest:false})); L.mesh.add(roar);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.52});
  const ring=S.groundRing(L.decal,3.0);
  const crack=groundPlane(3.4,TX,0.03,S.mat(CRACK_FS(ORANGE),{},{mode:'energy'})); L.decal.add(crack);
  const frag=S.status(a,'fragile',[target],1.0,2.1);
  const K=`const float TI=${f(TI)};const vec3 TC=${v3(TC)};`;
  // esquirlas negras y naranjas del estallido
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.35,.5,0.))*(2.2+2.*aSeed.z);vec3 p=TC+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.2+.1*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'mix(vec3(.18,.09,.2),'+ORANGE+',step(.6,vMix))'}));
  // polvo del rugido a los pies del lanzador
  S.pts(L.part,12,VV+K+`void main(){float s=${f(TR)}+aSeed.x*.1;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*3.14159-1.57;vec3 p=vec3(-3.2+cos(an)*(.3+1.1*t),.12+t*.5,sin(an)*(.4+1.*t));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.36+.16*aSeed.w)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  a.pose=function(te,o){
    const ia=te-TI, inf=ss(0.02,TR,te), pf=1+0.12*Math.sin(te*26)*inf*(te<TR?1:0);
    caster.rotation.z=-0.05*inf+0.18*ss(TR,TR+0.06,te)*(1-ss(TR+0.2,TI+0.2,te));
    beard.position.copy(CHIN); beard.scale.setScalar(Math.max(back(inf)*pf*(1-0.35*ss(TI+0.3,1.6,te)),0.001)); beard.visible=te<1.65;
    mat.uniforms.uQ.value=-1+2.1*ss(1.35,1.7,te); mat.uniforms.uK.value=0.7*ss(TR-0.1,TR,te)*(1-ss(TR,TR+0.25,te))+0.3*hitE(ia,8);
    rings.forEach((r,i)=>{const u=cl((te-r.t0)/(TI-r.t0));r.g.visible=te>=r.t0&&te<TI+0.02;
      r.g.position.lerpVectors(tmp.set(CHIN.x+0.3,CHIN.y+0.05,CHIN.z*0.5),TC,u*u*(0.4+0.6*u));
      r.g.rotation.set(te*5+i,-0.75,0); r.g.scale.setScalar(Math.max(0.7+1.0*u,0.001));});
    const ro=cl((te-TR)/0.35); roar.visible=te>=TR&&ro<1; towardCam(roar.position,tmp.set(CHIN.x+0.35,CHIN.y,CHIN.z),0.3); billboard(roar,0);
    roar.scale.setScalar(Math.max(0.4+1.2*e3(ro),0.001)); set(roar,0.05+0.9*ro,1);
    spark.pose(ia,TC,1.0);
    ring.pose(ia,TX,0,0.45,1);
    crack.visible=ia>=0; crack.scale.setScalar(Math.max(0.5+0.5*e3(ia/0.25),0.001)); set(crack,ia>=0?-0.1+1.15*ss(1.6,2.1,te):0,1);
    const h=hitE(ia,7), sh=ss(TR+0.1,TI,te)*(1-ss(TI+0.4,1.6,te));
    target.position.x=TX+0.24*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.18*h*Math.cos(ia*16);
    target.scale.set(1-0.08*sh+0.05*h,1-0.12*sh-0.05*h,1-0.08*sh+0.05*h);
    const fe=frag.pose(te); S.statusGlow(o,[{kind:'fragile',env:fe}]); o.em=Math.max(o.em,0.4*h); if(h>0.3)o.emc.setRGB(1,0.5,0.1);
    if(te<TR){o.g.copy(CHIN);o.gs=0.6*inf;o.ga=0.1*inf;o.li=1.2*inf;}
    else if(ia<0){o.g.copy(rings[0].g.position);o.gs=0.9;o.ga=0.15;o.li=2;}
    else{o.g.copy(TC);o.gs=1.4+3*ia;o.ga=Math.exp(-ia*10)*0.4;o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0.8;o.dist=0.8;o.flash=0.5;
  };
}});

// =====================================================================
// 5 · SIDEBARB — el veneno lima se concentra en los flancos y brotan seis púas con lengüeta; salen como dardos en
//     dos abanicos curvos que se cierran sobre el rival, quedan clavadas y tiemblan, gotean veneno y sangre
//     (Veneno + Sangrado) y se deshacen. ti 0,87 s
// =====================================================================
const BARB_BODY=`float t=clamp(vP.y/.6+.5,0.,1.);base=mix(${SCALEV},${LIME},smoothstep(.55,.92,t));lb=-.1*smoothstep(.05,0.,abs(t-.5)-.12);`;
defs.push({key:"sty_roSidebarb",name:"Sidebarb (estilizado)",dur:2.2,ti:0.87,pal:P_SIDE,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Carga",0],["Andanada",0.45],["Impacto",0.87],["Veneno",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TL=0.45,TI=0.87,N=6,DT=0.025;
  const mat=S.mat(SOLID(BARB_BODY,{hot:'vec3(.6,1.,.2)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const geo=spineGeo(1.05,0.13,0.1,8);
  const bs=[];
  for(let i=0;i<N;i++){const side=i<3?1:-1,k=i%3,m=new THREE.Mesh(geo,mat);L.mesh.add(m);
    const flank=V3(CX+0.1-k*0.22,0.85+k*0.18,0.42*side);
    const odir=V3(0.35+0.2*k,0.35-0.2*k,side).normalize();
    const hit=V3(TX-0.28,0.75+0.22*k,0.12*side);
    const ctrl=V3(-0.3,1.9+0.3*k,2.6*side);
    bs.push({m,flank,odir,hit,ctrl,side,t0:TL+i%3*DT+(side<0?0.012:0),tf:TI-0.03*(2-k)});}
  const sparks=[S.hitSpark(L.mesh,1.1,{seed:0.2}),S.hitSpark(L.mesh,1.4,{seed:0.71})];
  const ring=S.groundRing(L.decal,2.6);
  const stain=groundPlane(1.8,TX,0.026,S.mat(STAIN('vec3(.32,.6,.12)',.55),{},{mode:'matter'})); L.decal.add(stain);
  const poison=S.status(a,'poison',[target],1.05,2.2), bleed=S.status(a,'bleed',[target],1.15,2.2);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float CX=${f(CX)};const float TX=${f(TX)};`;
  // carga: veneno que se condensa en los flancos
  S.pts(L.part,20,VV+K+`void main(){float side=aSeed.x<.5?-1.:1.;float s=aSeed.y*(TL-.1);float life=.28;float age=(uT-s)/life;
   vec3 c=vec3(CX-.1,1.,.45*side);vec3 p=c+rnd()*vec3(.5,.45,.25)*(1.-age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;vK=0.;vR=uT*3.;put(p,.22+.1*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.15}),{mode:'energy'});
  // estela lima de los dardos
  S.pts(L.part,36,VV+K+`void main(){float i=floor(aSeed.x*6.);float side=i<3.?1.:-1.;float k=mod(i,3.);
   float s=TL+k*.025;float e=TI-.03*(2.-k);float u=clamp((uT-s-aSeed.y*.08)/(e-s),0.,1.);
   vec3 a0=vec3(CX+.1-k*.22,.85+k*.18,.42*side),c=vec3(-.3,1.9+.3*k,2.6*side),b=vec3(TX-.28,.75+.22*k,.12*side);
   float w=1.-u;vec3 p=w*w*a0+2.*w*u*c+u*u*b+rnd()*.06;float age=(uT-s-aSeed.y*.08)/(e-s);
   vA=(age>0.&&age<1.)?(1.-aSeed.y):0.;vK=smoothstep(.5,1.,aSeed.y*1.6);vR=0.;put(p,.16+.08*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:.9}),{mode:'energy'});
  // goteo de veneno y sangre desde las púas clavadas
  S.pts(L.part,24,VV+K+`void main(){float i=floor(aSeed.x*6.);float side=i<3.?1.:-1.;float k=mod(i,3.);
   float life=.42+aSeed.y*.2;float k2=(uT-TI-.05)/life+aSeed.z;float age=fract(k2);float on=(uT>TI+.05&&uT<1.75)?1.:0.;
   vec3 p=vec3(TX-.38,.75+.22*k,.14*side)+vec3(0.,-age*age*1.,0.);vA=(p.y>.03?1.:0.)*on;vK=smoothstep(.8,1.,age);vR=3.14159;
   put(p,.15+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'mix('+LIME+','+CRIMSON+',step(.55,vMix))'}));
  // esquirlas en el impacto
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.4,0.))*(2.+1.6*aSeed.z);vec3 p=vec3(TX-.3,1.,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.14+.06*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:LIME}));
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0.05,TL,te);
    caster.rotation.z=0.06*grow-0.14*ss(TL,TL+0.06,te)+0.08*ss(TL+0.15,TI,te);
    caster.scale.set(1+0.06*grow*(te<TL?1:0),1-0.04*grow*(te<TL?1:0),1+0.08*grow*(te<TL?1:0));
    bs.forEach((b,i)=>{const m=b.m;
      if(te<b.t0){m.position.copy(b.flank).addScaledVector(b.odir,0.22*grow);aimY(m,b.odir);m.scale.setScalar(Math.max(back(grow)*1.1,0.001));}
      else if(te<b.tf){const u=(te-b.t0)/(b.tf-b.t0),uu=u*(0.6+0.4*u);qbz(m.position,b.flank,b.ctrl,b.hit,uu);
        qbz(tmp,b.flank,b.ctrl,b.hit,Math.min(uu+0.04,1));aimY(m,tmp.sub(m.position));m.scale.setScalar(1.1);}
      else{const q=hitE(te-b.tf,10)*0.15*Math.sin((te-b.tf)*60);tmp.set(1,-0.15+q,-0.25*b.side).normalize();aimY(m,tmp);
        m.position.copy(b.hit).addScaledVector(tmp,-0.45);m.position.x+=0.24*hitE(ia,7)*(ia>0?1:0);m.scale.setScalar(1.1);}
      m.visible=grow>0.001;
    });
    mat.uniforms.uQ.value=-1+2.1*ss(1.45,1.85,te); mat.uniforms.uK.value=0.6*ss(0.1,TL,te)*(te<TL+0.1?1:0)+0.35*hitE(ia,7);
    sparks[0].pose(ia+0.03,tmp.set(TX-0.32,1.15,0.15),0.8); sparks[1].pose(ia,tmp.set(TX-0.3,0.9,-0.1),1.0);
    ring.pose(ia,TX,0,0.45,1);
    stain.visible=ia>=0; stain.scale.setScalar(Math.max(0.4+0.6*e3((ia-0.2)/0.5),0.001)); set(stain,ia>=0?-0.1+1.15*ss(1.75,2.2,te):0,ss(TI+0.2,TI+0.5,te));
    const h=hitE(ia,7);
    target.position.x=TX+0.24*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.16*h*Math.cos(ia*16);
    target.scale.set(1+0.05*h,1-0.06*h,1+0.05*h);
    const pe=poison.pose(te), be=bleed.pose(te); S.statusGlow(o,[{kind:'poison',env:pe},{kind:'bleed',env:be*0.8}]);
    o.em=Math.max(o.em,0.35*h);
    if(te<TL){o.g.set(CX,1,0);o.gs=0.8*grow;o.ga=0.12*grow;o.li=1.5*grow;}
    else if(ia<0){o.g.copy(bs[1].m.position);o.gs=0.7;o.ga=0.1;o.li=1.6;}
    else{o.g.set(TX-0.3,1,0);o.gs=1.3+2*ia;o.ga=Math.exp(-ia*10)*0.35;o.li=4*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(TX-0.3,1.0,0);o.shake=0.6;o.dist=0.7;o.flash=0.4;
  };
}});

// =====================================================================
// 6 · SMALL FRILL — una gorguera de escamas se despliega en abanico tras la cabeza con bandas hipnóticas que fluyen;
//     destella y suelta una onda de veneno que barre el campo en todas direcciones (Veneno a todos los rivales),
//     con nubes tóxicas sobre la onda; el lanzador se cura (motas y gotas que suben). ti 0,95 s
// =====================================================================
const FRILL_FS=`uniform float uOpen;uniform float uSpd;uniform float uF;uniform float uQ;
void main(){vec2 p=vec2((vUv.x-.5)*2.,vUv.y);float r=length(p);float an=atan(p.x,p.y);
 float hf=1.25*uOpen;if(abs(an)>hf||r>1.||r<.18)discard;
 
 float rib=smoothstep(.06,.0,abs(fract(an*4.2/3.1416)-.5)-.4);
 float scal=.88+.12*sin(an*21.);if(r>scal)discard;
 float nz=styNoise(vUv*1.3+.2).r;if(styErode(nz*.6+r*.4,uQ,.08)<.5)discard;
 float bands=fract(r*3.2-uSpd);float hue=fract(r*1.4-uSpd*.5+an*.15);
 vec3 c=mix(mix(vec3(1.,.42,.86),vec3(.42,.26,.95),smoothstep(.0,.5,hue)),vec3(.2,.82,.72),smoothstep(.5,1.,hue));
 c=mix(c*.55,c,smoothstep(.35,.55,bands));c=mix(c,${DARKV},rib*.75+smoothstep(scal-.07,scal,r)*.85);
 float l=.6+.4*nz;gl_FragColor=vec4(c*l*(1.+.8*uF),1.);}`;
defs.push({key:"sty_roSmallFrill",name:"Small Frill (estilizado)",dur:2.3,ti:0.95,pal:P_FRILL,tier:2,stylized:true,
  phases:[["Despliegue",0],["Hipnosis",0.5],["Deslumbre",0.95],["Cura y veneno",1.25],["Fin",1.9]],
build(a){
  const L=a.L,TH=0.5,TI=0.95,TC2=1.25;
  const frill=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3,1,1).translate(0,0.65,0),S.mat(FRILL_FS,
    {uOpen:{value:0},uSpd:{value:0},uF:{value:0},uQ:{value:-1}},{mode:'solid',side:THREE.DoubleSide}));
  L.mesh.add(frill);
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.83});
  const wave=groundPlane(4,CX,0.034,S.mat(RING_COL(LIME,1.15),{},{mode:'energy'})); L.decal.add(wave);
  const wave2=groundPlane(4,CX,0.036,S.mat(RING_COL('vec3(.62,.3,.95)',1.1),{},{mode:'energy'})); L.decal.add(wave2);
  const healRing=S.groundRing(L.decal,2.4);
  const K=`const float TI=${f(TI)};const float TC2=${f(TC2)};const float CX=${f(CX)};`;
  // nubes tóxicas que viajan sobre la onda
  S.pts(L.part,40,VV+K+`void main(){float s=TI+.03+aSeed.x*.1;float w=clamp((uT-s)/.75,0.,1.);float we=1.-pow(1.-w,3.);
   float an=aSeed.z*6.2832;float rad=.6+5.2*we;vec3 p=vec3(CX+cos(an)*rad,.25+.35*aSeed.y+w*.5,sin(an)*rad*.85);
   vA=(uT>s&&w<1.)?smoothstep(0.,.1,w):0.;vK=smoothstep(.45,1.,w);vR=aSeed.w*6.28+w*2.;put(p,(.5+.3*aSeed.w)*(.8+.6*w));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'mix(vec3(.45,.75,.18),vec3(.5,.28,.75),vMix)',bias:.02}));
  // cura: gotas y motas rosas que suben por el lanzador
  S.pts(L.part,18,VV+K+`void main(){float s=TC2-.1+aSeed.x*.55;float life=.6+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;vec3 p=vec3(CX+cos(an)*.5,.2+age*1.8,sin(an)*.45);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=uT*3.;put(p,.24+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float s=TC2+aSeed.x*.4;float life=.7;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(CX+cos(an)*.42,.3+age*1.5,sin(an)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.7,1.,age);vR=0.;put(p,.2);}`,
   BALL_P('styRampOf(vec3(.45,.9,.4),.7)'));
  a.pose=function(te,o){
    const ia=te-TI, open=back(ss(0.02,TH,te)), ic=te-TC2;
    caster.rotation.z=-0.04*open+0.1*ss(TI-0.05,TI+0.05,te)*(1-ss(TI+0.2,TI+0.6,te));
    towardCam(frill.position,tmp.set(NAPE.x-0.15,NAPE.y-0.75,NAPE.z),-0.35); billboard(frill,0);
    const sc=0.9+0.7*open; frill.scale.set(sc,sc,sc); frill.visible=open>0.01&&te<2.0;
    const fu=frill.material.uniforms; fu.uOpen.value=cl(open); fu.uSpd.value=te*0.8+ss(TH,TI,te)*2.2+ss(TI,1.9,te)*0.8;
    fu.uF.value=1.1*hitE(ia,6)+0.25*ss(TH,TI,te); fu.uQ.value=-1+2.1*ss(1.55,1.95,te);
    spark.pose(ia,tmp.set(NAPE.x+0.1,NAPE.y,0.2),1.1);
    const w=cl(ia/0.75); wave.visible=ia>=0&&w<1; wave.scale.setScalar(Math.max(0.3+2.8*e3(w),0.001)); set(wave,0.05+0.9*w,1);
    const w2=cl((ia-0.08)/0.7); wave2.visible=ia>=0.08&&w2<1; wave2.scale.setScalar(Math.max(0.3+2.4*e3(w2),0.001)); set(wave2,0.05+0.9*w2,1);
    healRing.pose(ic,CX,0,0.55,1);
    const env=ss(TC2,TC2+0.15,te)*(1-ss(1.95,2.3,te));
    glowOf(caster,COL.setRGB(0.4,0.95,0.45),0.35*env+0.3*hitE(ia,6));
    if(ia<0){o.g.copy(NAPE);o.gs=1.0*open;o.ga=0.12*open;o.li=1.6*open;}
    else{o.g.copy(NAPE);o.gs=1.6+2*ia;o.ga=Math.exp(-ia*8)*0.35;o.li=4*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0.3;o.dist=0.5;o.flash=0.5;
  };
}});

// =====================================================================
// 7 · SWIRL — hilos de energía de las orejas dibujan delante del lanzador un remolino hipnótico de dos brazos (violeta
//     oscuro con filo lila); gira cada vez más rápido, avanza y se estrella contra el rival; los brazos salen
//     despedidos, un remolino pequeño le da vueltas sobre la cabeza y un anillo de alcance se encoge a sus pies (−1 AL). ti 0,95 s
// =====================================================================
const SPIRAL_FS=`uniform float uDraw;uniform float uQ;uniform float uF;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.)discard;float an=atan(p.y,p.x);
 float u=fract(an/6.2832*2.-log(r+.02)*.9);float arm=smoothstep(.2,.05,abs(u-.5)-.06);
 float drawn=step(1.-uDraw,1.-r);float core=smoothstep(.22,.1,r);
 float m=max(arm*drawn*smoothstep(1.,.85,r),core*uDraw);if(m<.02)discard;
 float nz=styNoise(p*.5+.4).r;if(styErode(nz*.6+r*.4,uQ,.08)<.5)discard;
 float edge=smoothstep(.12,.0,abs(abs(u-.5)-.2));
 vec3 c=mix(${DARKV}*1.4,vec3(.48,.28,.86),smoothstep(.0,.25,abs(u-.5)));c=mix(c,vec3(.86,.66,1.),edge*.75+core*.6);
 gl_FragColor=vec4(c*(1.+.9*uF),m*uA);}`;
defs.push({key:"sty_roSwirl",name:"Swirl (estilizado)",dur:2.0,ti:0.95,pal:P_SWIRL,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Trazo",0],["Remolino",0.45],["Impacto",0.95],["Desorientación",1.2],["Fin",1.65]],
build(a){
  const L=a.L,TD=0.45,TI=0.95,TO=1.2,P0=V3(-2.65,1.55,0.15);
  const swirl=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(SPIRAL_FS,{uDraw:{value:0},uQ:{value:-1},uF:{value:0}},{mode:'matter',depthTest:false}));
  L.mesh.add(swirl);
  const mini=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),S.mat(SPIRAL_FS,{uDraw:{value:1},uQ:{value:-1},uF:{value:0}},{mode:'matter'}));
  L.mesh.add(mini);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.12});
  const ring=S.groundRing(L.decal,2.8);
  const reticle=groundPlane(2.6,TX,0.032,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
    float dash=step(.35,fract(an/6.2832*14.));float m=band(r,.88,.06)*dash+band(r,.7,.025);if(m<.02)discard;
    gl_FragColor=vec4(styRampOf(vec3(.6,.36,.98),.75)*1.2,m*uA);}`,{},{mode:'energy'})); L.decal.add(reticle);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 TC=${v3(TC)};`;
  // hilos que salen de las orejas y dibujan el remolino
  S.pts(L.part,30,VV+K+`void main(){float side=aSeed.x<.5?-1.:1.;float s=aSeed.y*.25;float u=clamp((uT-s)/.22,0.,1.);
   vec3 a0=vec3(-3.8,1.9,.18*side);vec3 c=vec3(-3.2,2.4,.35*side);vec3 p=mix(mix(a0,c,u),mix(c,P0,u),u)+rnd()*.05;
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.16+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.}),{mode:'energy'});
  // brazos despedidos en el impacto (trozos violeta)
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 tg=vec3(-sin(an),cos(an),0.);vec3 v=(vec3(cos(an),sin(an),.3*(aSeed.w-.5))*.9+tg*.8)*(2.+1.5*aSeed.w);
   vec3 p=TC+v*t+vec3(0.,-3.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=an+t*6.;put(p,.26+.1*aSeed.w);}`,
   S.MATTER_FS(C.slash,{relief:2,col:'vec3(.5,.3,.88)',bias:.05}));
  a.pose=function(te,o){
    const ia=te-TI, io=te-TO, draw=ss(0.05,TD,te), spin=te*3+ss(TD,TI,te)*9;
    caster.rotation.z=0.05*draw-0.1*ss(TD,TD+0.08,te)+0.05*ss(TD+0.2,TI,te);
    const u=cl((te-TD)/(TI-TD)), uu=u*u*(0.5+0.5*u);
    tmp.lerpVectors(P0,TC,uu); tmp.y+=Math.sin(u*Math.PI)*0.35;
    swirl.position.copy(tmp); billboard(swirl,-spin*1.5); swirl.scale.setScalar(Math.max(1.3+0.9*uu,0.001)*(0.4+0.6*draw));
    swirl.visible=draw>0.001&&ia<0.06;
    const su=swirl.material.uniforms; su.uDraw.value=draw; su.uA.value=1; su.uF.value=0.5*ss(TD,TI,te); su.uQ.value=ia>0?-1+2*cl(ia/0.06):-1;
    spark.pose(ia,TC,1.0);
    ring.pose(ia,TX,0,0.45,1);
    const ov=ss(TO-0.1,TO+0.05,te)*(1-ss(1.75,2.0,te));
    mini.visible=ov>0.01; mini.position.set(TX+Math.cos(te*7)*0.35,2.05+0.05*Math.sin(te*9),Math.sin(te*7)*0.3);
    billboard(mini,-te*10); mini.scale.setScalar(Math.max(1.4*ov,0.001)); mini.material.uniforms.uA.value=ov;
    reticle.visible=io>-0.1&&te<2.0; const rs=1.25-0.5*ss(TO,TO+0.6,te); reticle.scale.setScalar(Math.max(rs,0.001));
    reticle.rotation.y=te*0.8; set(reticle,0,ss(TO-0.1,TO+0.1,te)*(1-ss(1.75,2.0,te)));
    const h=hitE(ia,7);
    target.position.x=TX+0.22*h*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.2*h*Math.cos(ia*16)+0.06*ov*Math.sin(te*7);
    o.em=0.35*h+0.15*ov; o.emc.setRGB(0.6,0.4,1);
    if(ia<0){o.g.copy(swirl.position);o.gs=0.8*draw;o.ga=0.12*draw;o.li=1.4*draw+1.5*u;}
    else{o.g.copy(TC);o.gs=1.4+2.5*ia;o.ga=Math.exp(-ia*10)*0.4;o.li=4.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0.6;o.dist=0.7;o.flash=0.4;
  };
}});

// =====================================================================
// 8 · VENOM NAIL (nivel 3) — llamas de veneno negro se acumulan en las garras; tres cuchillas en media luna barren el
//     suelo hasta el rival dejando surcos violeta; un zarpazo gigante lo rasga (grietas en la baldosa); seis gotas de
//     veneno orbitan y cada una se parte en dos (Duplicar); se hunden en el rival y estalla un pulso corrosivo. ti 1,35 s
// =====================================================================
const CRESC_FS=`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;float d1=length(p)-.92;float d2=length(p-vec2(.52,0.))-.8;float d=max(d1,-d2);
 float m=smoothstep(.04,-.04,d)*step(-.2,p.x*0.+1.);if(m<.02)discard;
 float nz=styNoise(vUv*.9+.3).r;if(styErode(nz*.6+(1.-abs(p.y))*.4,uQ,.08)<.5)discard;
 vec3 c=mix(${LIME}*1.1,mix(vec3(.42,.16,.62),${DARKV}*1.2,smoothstep(.06,.2,-d)),smoothstep(.0,.05,-d));
 gl_FragColor=vec4(c,m*uA);}`;
const CLAW_FS=`uniform float uQ;
void main(){vec2 p=vUv-.5;float w=.07*sin(3.1416*clamp(vUv.x,0.,1.));float d=abs(p.y-.08*sin(vUv.x*3.1416))-w;
 float m=smoothstep(.01,-.01,d);if(m<.02)discard;float nz=styNoise(vUv*vec2(1.5,.4)).r;if(styErode(nz*.5+vUv.x*.5,uQ,.06)<.5)discard;
 float core=smoothstep(-.02,-.05,d);vec3 c=mix(${LIME}*1.4,${DARKV}*1.5,core);gl_FragColor=vec4(c,m*uA);}`;
defs.push({key:"sty_roVenomNail",name:"Venom Nail (estilizado)",dur:3.1,ti:1.35,pal:P_VENOM,tier:3,stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Veneno",0],["Garras",0.75],["Desgarro",1.35],["Duplicar",1.5],["Corrosión",1.8],["Fin",2.6]],
build(a){
  const L=a.L,TG=0.75,TI=1.35,TDp=1.5,TCo=1.8,NBL=3;
  const bmat=S.mat(CRESC_FS,{uQ:{value:-1}},{mode:'matter',side:THREE.DoubleSide});
  const blades=[];for(let i=0;i<NBL;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),bmat);L.mesh.add(m);blades.push({m,z:(i-1)*0.42,t0:TG+i*0.07});}
  const fmat=S.mat(`void main(){float u=vUv.x;float n=styNoise(vec2(vUv.x*3.,vUv.y*.5)+.2).r;float w=smoothstep(.5,.25,abs(vUv.y-.5)+(n-.5)*.15);
    if(w<.02)discard;float er=styErode(n*.6+(1.-u)*.4,uP,.1);vec3 c=mix(vec3(.16,.05,.24),${LIME},smoothstep(.12,.0,abs(vUv.y-.5))*.8);
    gl_FragColor=vec4(c,w*er*uA*.85);}`,{},{mode:'matter'});
  const furrows=blades.map((b)=>{const m=groundStrip(1,0.34,fmat);m.position.y=0.027;L.decal.add(m);return m;});
  const cmat=S.mat(CLAW_FS,{uQ:{value:-1}},{mode:'matter',depthTest:false,side:THREE.DoubleSide});
  const claws=[];for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.9),cmat);L.mesh.add(m);claws.push(m);}
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.66}), spark2=S.hitSpark(L.mesh,1.6,{seed:0.29});
  const ring=S.groundRing(L.decal,3.2);
  const crack=groundPlane(3.0,TX,0.031,S.mat(CRACK_FS(LIME),{},{mode:'energy'})); L.decal.add(crack);
  const stain=groundPlane(2.4,TX,0.026,S.mat(STAIN('vec3(.3,.12,.42)',.6),{},{mode:'matter'})); L.decal.add(stain);
  const poison=S.status(a,'poison',[target],TDp,3.1);
  const K=`const float TG=${f(TG)};const float TI=${f(TI)};const float TDp=${f(TDp)};const float TCo=${f(TCo)};const vec3 TC=${v3(TC)};const float CX=${f(CX)};`;
  // llamas de veneno negro en las garras (materia oscura, mezcla normal)
  S.pts(L.part,30,VV+K+`void main(){float side=aSeed.x<.5?-1.:1.;float life=.3+aSeed.y*.15;float k=uT/life+aSeed.z;float age=fract(k);
   vec3 r=rr(floor(k));float on=1.-smoothstep(TG,TG+.15,uT);
   vec3 p=vec3(-3.15+r.x*.25,.2+age*(.7+.3*r.y),.32*side+(r.z-.5)*.25);vR=(r.y-.5)*.4;vK=smoothstep(.25,1.,age);
   vA=smoothstep(0.,.1,age)*on*smoothstep(0.,.25,uT);put(p,(.34+.16*r.z)*(1.-age*.45));}`,
   S.MATTER_FS(C.flame,{relief:3,col:'mix(vec3(.16,.06,.22),vec3(.42,.18,.62),vMix*.6)',bias:.1}));
  S.pts(L.part,14,VV+K+`void main(){float life=.4;float k=uT/life+aSeed.z;float age=fract(k);vec3 r=rr(floor(k));float on=1.-smoothstep(TG,TG+.1,uT);
   vec3 p=vec3(-3.15+r.x*.4,.3+age*1.1,(r.z-.5)*.9);vA=sin(age*3.14159)*on*smoothstep(0.,.3,uT);vK=0.;vR=0.;put(p,.16);}`,
   S.ENERGY_FS(C.spark,{gain:1.}),{mode:'energy'});
  // gotas de veneno que orbitan y se parten en dos (Duplicar), luego se hunden en el rival
  S.pts(L.part,12,VV+K+`void main(){float i=floor(aSeed.x*6.);float j=aSeed.y<.5?-1.:1.;
   float on=smoothstep(TI+.05,TI+.15,uT)*(1.-step(TCo+.12,uT));float sep=.32*smoothstep(TDp,TDp+.12,uT);
   float an=i/6.*6.2832+uT*3.2+j*sep;float sink=smoothstep(TCo-.12,TCo+.1,uT);float rad=(.85+.08*sin(uT*6.+i))*(1.-sink);
   vec3 p=vec3(TC.x+cos(an)*rad,1.15+.15*sin(an*2.+uT*4.)-.2*sink,sin(an)*rad*.8);
   float sz=mix(.34,.24,smoothstep(TDp,TDp+.12,uT));vA=on*(j>0.||uT>TDp?1.:0.);vK=0.;vR=0.;put(p,sz);}`,
   BALL_P('styRampOf(mix(vec3(.5,.22,.82),'+LIME+',.25),.75)'));
  // pulso corrosivo: nubes tóxicas y gotas
  S.pts(L.part,26,VV+K+`void main(){float s=TCo+aSeed.x*.08;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(TC.x,.4,0.)+vec3(cos(an),0.,sin(an)*.8)*(.3+1.3*(1.-exp(-t*4.)))+vec3(0.,.2+t*(.6+.5*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28+t;put(p,(.5+.25*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'mix(vec3(.4,.68,.14),vec3(.42,.18,.62),vMix)',bias:.02}));
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.45,.5,0.))*(2.2+1.8*aSeed.z);vec3 p=TC+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.16+.06*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'vec3(.45,.2,.7)'}));
  a.pose=function(te,o){
    const ia=te-TI, ic=te-TCo, ch=ss(0.05,TG,te);
    caster.rotation.z=-0.1*ch+0.22*ss(TG,TG+0.08,te)*(1-ss(TG+0.3,TI+0.3,te)); caster.scale.set(1+0.05*ch*(te<TG?1:0),1-0.08*ch*(te<TG?1:0),1);
    glowOf(caster,COL.setRGB(0.5,0.22,0.8),0.3*ch*(te<TG+0.1?1:0));
    blades.forEach((b,i)=>{const u=cl((te-b.t0)/(TI-0.04-b.t0)), uu=u*(0.55+0.45*u);const x=-3.0+(TX-0.6+3.0)*uu;
      b.m.position.set(x,0.7,b.z); b.m.rotation.set(0,-0.3,0); b.m.scale.setScalar(Math.max(1.3+0.4*uu,0.001));
      b.m.visible=te>=b.t0&&te<TI+0.05;
      const fu=furrows[i]; const x0=-3.1, len=Math.max(x-x0,0.01); fu.position.x=x0+len/2; fu.position.z=b.z; fu.scale.x=len;
      fu.visible=te>=b.t0; set(fu,-0.1+1.15*ss(TI+0.4,2.4,te),1);});
    bmat.uniforms.uA.value=1; bmat.uniforms.uQ.value=-1;
    claws.forEach((m,i)=>{const s0=TI-0.04+i*0.03,u=cl((te-s0)/0.12);towardCam(m.position,tmp.set(TC.x+0.05,TC.y+0.05,(i-1)*0.12),0.45);
      billboard(m,-0.85+(i-1)*0.06); m.position.x+=(i-1)*0.32; m.position.y+=(i-1)*0.06;
      m.scale.set(Math.max(0.2+0.9*e3(u),0.001),1,1); m.visible=te>=s0&&te<TI+0.45;});
    cmat.uniforms.uA.value=1; cmat.uniforms.uQ.value=-1+2.1*ss(TI+0.12,TI+0.42,te);
    spark.pose(ia,TC,1.1); spark2.pose(ic,tmp.set(TC.x,1.0,0),1.0);
    ring.pose(ia,TX,0,0.5,1.1);
    crack.visible=ia>=0; crack.scale.setScalar(Math.max(0.5+0.6*e3(ia/0.2),0.001)); set(crack,ia>=0?-0.1+1.15*ss(2.4,3.05,te):0,1);
    stain.visible=ic>=0; stain.scale.setScalar(Math.max(0.4+0.6*e3(ic/0.4),0.001)); set(stain,ic>=0?-0.1+1.15*ss(2.5,3.1,te):0,1);
    const h=hitE(ia,6), hc=hitE(ic,7);
    target.position.x=TX+0.28*h*(1-Math.exp(-Math.max(ia,0)*20))+0.05*hc; target.rotation.z=-0.22*h*Math.cos(ia*14)-0.06*hc*Math.cos(ic*20);
    target.scale.set(1+0.06*(h+hc),1-0.07*(h+hc),1+0.06*(h+hc));
    const pe=poison.pose(te); S.statusGlow(o,[{kind:'poison',env:pe}]);
    if(ic>0){o.em=Math.max(o.em,0.45*hc+0.2*pe);o.emc.setRGB(0.55,0.25,0.85);}
    else o.em=Math.max(o.em,0.4*h);
    if(te<TG){o.g.set(-3.15,0.5,0);o.gs=0.8*ch;o.ga=0.06*ch;o.li=1.2*ch;}
    else if(ia<0){o.g.set(blades[1].m.position.x,0.5,0);o.gs=0.8;o.ga=0.08;o.li=1.6;}
    else if(ic<0){o.g.copy(TC);o.gs=1.4+2*ia;o.ga=Math.exp(-ia*10)*0.35;o.li=4.5*Math.exp(-ia*4)+1;}
    else{o.g.set(TC.x,0.9,0);o.gs=1.5+2*ic;o.ga=Math.exp(-ic*8)*0.3;o.li=3.5*Math.exp(-ic*4);}
    if(ic<0){o.ia=ia;o.shake=1.1;o.dist=1;o.flash=0.55;}else{o.ia=ic;o.shake=0.4;o.dist=0.5;o.flash=0.3;}
    o.c.copy(TC);
  };
}});

VFX.module("Estilizado · Reptil · Orejas",defs);
})();

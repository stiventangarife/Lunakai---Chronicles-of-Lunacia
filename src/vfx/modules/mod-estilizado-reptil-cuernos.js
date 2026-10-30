// =====================================================================
// ESTILIZADO · REPTIL · CUERNOS (Hito 101) — las 7 cartas de cuernos de Reptil hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_rcBumpy, sty_rcScalySpoon…). Mismos dur / ti / fases que las originales (nivel 2,
// 2 PA), así el daño llega igual. Lo que "nace de los cuernos" arranca sobre la cabeza del lanzador (≈ (-3.6,2.1,0)).
// Identidad: escamas violeta en rejilla, hueso marfil, veneno esmeralda; cada carta con su acento.
// Semántica según PartCards.js:
//   Bumpy (sobre sí: +45 escudo) · Cerastes (aliado: devuelve 85 al próximo atacante) · Incisor (daño + Sangrado)
//   Poison Tube (daño + Veneno) · Scaly Spear (daño) · Scaly Spoon (aliado: +60 escudo, refleja 35 %) · Unko (daño)
// Cartas sobre aliado: el receptor es el muñeco objetivo (x = 3,4; allies 0) y receiver:'target' lo marca para el puente
// (lanzada sobre sí misma, el puente lleva ese punto al lanzador).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_BUMPY=pal("Sty Reptil · Bumpy",["#d6b0ff","#5a2a8e"]);
const P_CERA=pal("Sty Reptil · Cerastes",["#9df5a8","#1d7d52"]);
const P_INCI=pal("Sty Reptil · Incisor",["#ff9aae","#8e1232"]);
const P_TUBE=pal("Sty Reptil · Poison Tube",["#d4a2ff","#4a1f8c"]);
const P_SPEAR=pal("Sty Reptil · Scaly Spear",["#c0b0ff","#4a2a9e"]);
const P_SPOON=pal("Sty Reptil · Scaly Spoon",["#a4f3e6","#6a36b6"]);
const P_UNKO=pal("Sty Reptil · Unko",["#c8dc5c","#5c3c1c"]);

const TX=3.4, TC=V3(3.15,1.2,0), CX=-3.7, HN=V3(-3.6,2.1,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const XA=V3(1,0,0), YA=V3(0,1,0), qb=new THREE.Quaternion();
const aim=(o,d,spin)=>{o.quaternion.setFromUnitVectors(XA,tmp3.copy(d).normalize());if(spin)o.quaternion.multiply(qb.setFromAxisAngle(XA,spin));};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const ZONES={zoneCaster:0.6,zoneTarget:1.1};

// ---------- colores de materia (semánticos, fijos) ----------
// (colores en espacio lineal: el sRGB de salida los aclara)
const BONE="vec3(.66,.46,.2)", BONED="vec3(.24,.13,.05)", SCALE="vec3(.11,.022,.3)", SCALEL="vec3(.3,.1,.66)",
  VENOM="vec3(.03,.45,.07)", BLOOD="vec3(.45,.006,.012)", EARTH="vec3(.27,.15,.065)", POO="vec3(.13,.05,.014)",
  SLIME="vec3(.25,.4,.02)", GOLD="vec3(.88,.4,.035)";

// ---------- shaders compartidos ----------
// rejilla de escamas desplazada: devuelve la distancia al centro de la escama (borde ≈ .5)
const SCALEGRID=`float scl(vec2 g){g.x+=step(1.,mod(floor(g.y),2.))*.5;vec2 c=fract(g)-vec2(.5,.05);return length(c*vec2(1.,1.25));}`;
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.05,nzs='vec2(1.7,.9)'}={})=>SCALEGRID+`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// cuerpo de escamas (violeta por defecto): g = escala de la rejilla
const SCALE_BODY=(dark=SCALE,light=SCALEL,g='vec2(10.,6.)')=>`float e=scl(vUv*${g});float edge=smoothstep(.36,.5,e);
 base=mix(${dark},${light},.35+.4*(1.-e));lb=-.2*edge+.06*(1.-edge);`;
// cúpula de escamas (energía): revela de abajo arriba (uP), se erosiona (uD), banda que sube (uB), destello (uF)
const SCALE_SHELL_FS=SCALEGRID+`uniform float uD;uniform float uF;uniform float uR;uniform float uB;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 float rev=uP*1.25-.15;if(h>rev)discard;
 float e=scl(vec2(atan(vP.z,vP.x)*2.6,h*7.));float edge=smoothstep(.34,.5,e);
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);
 float wave=smoothstep(.12,0.,abs(h-uB));
 float m=(pow(fr,1.7)*.8+.12+edge*.55+wave*.6)*er*(1.-smoothstep(rev-.2,rev,h)*.5);
 gl_FragColor=vec4(styRamp(.3+.3*edge+.25*fr+.2*wave)*(.62+.6*uF),min(m*.8,1.)*uA);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6,tone=.3)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+${f(tone)}*n),m*er*uA*${f(alpha)});}`;
// sello de pincel en el suelo con un dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.8);}`;
const solidMat=(body,o={},side)=>S.mat(SOLID(body,o),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:side||THREE.FrontSide});
const shellMesh=(r,parent)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,40,24,0,Math.PI*2,0,Math.PI*0.62),
  S.mat(SCALE_SHELL_FS,{uD:{value:0},uF:{value:0},uR:{value:r},uB:{value:-1}},{mode:'energy',side:THREE.FrontSide}));parent.add(m);return m;};
const defs=[];

// =====================================================================
// 1 · BUMPY — (sobre sí) nueve losas de hueso rugoso brotan alrededor del lomo, se erizan hacia fuera y vibran; en ti
//     se cierran de golpe sobre el lanzador (esquirlas que rebotan por el suelo) y una coraza de escamas violeta se
//     enciende de abajo arriba; tres bandas suben por ella (el escudo que se acumula). ti 0,7 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcBumpy",name:"Bumpy (estilizado)",dur:2.2,ti:0.7,pal:P_BUMPY,tier:2,stylized:true},ZONES,{
  phases:[["Tensión",0],["Erizado",0.28],["Rebote",0.7],["Coraza",0.95],["Acumulación",1.2],["Fin",1.85]],
build(a){
  const L=a.L,TE=0.28,TI=0.7,TC2=0.95,TA=1.2,TF=1.85,DUR=2.2,N=9;
  const boneMat=solidMat(`float b=styNoise(vUv*vec2(2.,1.4)+.3).g;float h=clamp(vP.y*1.6+.5,0.,1.);
   base=mix(${SCALE},${BONE},smoothstep(.35,.8,h)*.8);base=mix(base,${BONED},smoothstep(.55,.8,b)*.6);lb=-.14*smoothstep(.5,.85,b)+.05*h;`,{hot:'uC1',rim:.3});
  const geo=new THREE.IcosahedronGeometry(0.34,1);
  {const pa=geo.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i);
    const k=1+0.16*Math.sin(x*13+y*7)*Math.cos(z*11-y*5);pa.setXYZ(i,x*k*0.75,y*k*1.35,z*k*0.42);}geo.computeVertexNormals();}
  const plates=[];
  for(let i=0;i<N;i++){
    const an=Math.PI*0.5+(i/(N-1)-0.5)*Math.PI*1.55;        // abanico por detrás y los lados (lejos del rival)
    const row=i%3, h=0.55+0.45*row+0.25*Math.sin(i*1.7);
    const m=new THREE.Mesh(geo,boneMat); L.mesh.add(m);
    plates.push({m,an,h,d:i*0.025,rot:(i*0.37)%1});
  }
  const shell=shellMesh(1.12,L.mesh); shell.position.set(CX,0.02,0);
  const ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,3.4);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.44});
  const dust=groundPlane(2.2,CX,0.024,S.mat(STAIN(EARTH,.45),{},{mode:'matter'})); L.decal.add(dust);
  const K=`const float TI=${f(TI)};const float TE=${f(TE)};const float CX=${f(CX)};`;
  // esquirlas de hueso que rebotan por el suelo
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec2 dir=vec2(cos(an),sin(an)*.8);float sp=1.4+1.4*aSeed.w;
   float b=abs(sin(t*(7.+3.*aSeed.y)))*exp(-t*3.)*(.9+.6*aSeed.w);
   vec3 p=vec3(CX+dir.x*(.6+sp*t*(1.-.35*t)),.08+b,dir.y*(.6+sp*t*(1.-.35*t)));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.16+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:BONE}));
  // polvo al cerrarse
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.01+aSeed.x*.08;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(CX,.18,0.)+vec3(cos(an),0.,sin(an)*.8)*(.5+.9*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.2*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05}));
  // escamas que suben por la coraza en cada banda
  S.pts(L.part,24,VV+`const float TA=${f(TA)};const float CX=${f(CX)};void main(){float i=floor(aSeed.x*3.);float s=TA+i*.2+aSeed.y*.08;float life=.5;
   float age=(uT-s)/life;float an=aSeed.z*6.2832+age*1.5;vec3 p=vec3(CX+cos(an)*1.1,.1+age*1.4,sin(an)*1.0);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=an;put(p,.2+.06*aSeed.w);}`,S.ENERGY_FS(C.shard,{gain:1.2}),{mode:'energy'});
  const su=shell.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ic=te-TC2;
    const vib=ss(TE,TI,te)*(ia<0?1:0);
    caster.scale.set(1+0.04*vib,1-0.05*vib+0.05*hitE(ia,8),1+0.04*vib);
    caster.position.x=CX+0.015*vib*Math.sin(te*70);
    plates.forEach((p,i)=>{
      const grow=back(ss(0.02+p.d,TE+p.d,te)), out=ss(TE,TI-0.05,te), slam=e3(cl((te-TI+0.04)/0.08)), fade=ss(TC2+0.1,TC2+0.5,te);
      const rad=0.55+0.35*out-0.25*slam*(1-fade*0.0);
      p.m.position.set(CX+Math.cos(p.an)*rad,p.h*(0.4+0.6*grow)+0.08*out,Math.sin(p.an)*rad*0.9);
      p.m.position.x+=0.02*vib*Math.sin(te*60+i*2);
      p.m.rotation.set(0,-p.an+Math.PI/2,0); p.m.rotateX(-0.55*out+0.35*slam+0.1*Math.sin(te*30+i)*vib); p.m.rotateZ((p.rot-0.5)*0.6);
      const sc=Math.max(grow*(1-0.85*fade),0.001); p.m.scale.setScalar(sc);
      p.m.visible=te>0.02+p.d&&fade<1;
    });
    boneMat.uniforms.uQ.value=-0.1+1.15*ss(TC2,TC2+0.5,te); boneMat.uniforms.uK.value=0.35*hitE(ia,7)+0.15*vib;
    spark.pose(ia,tmp.set(CX,1.2,0),1.0);
    ring.pose(ia,CX,0,0.45,1); ring2.pose(te-(TA+0.4),CX,0,0.5,0.95);
    set(dust,ia>=0?-0.1+1.15*ss(0.3,1.1,ia):0,ia>=0?1:0); dust.scale.setScalar(0.6+0.4*e3(ia/0.2));
    // coraza: se revela, tres bandas de escudo suben, se erosiona al final
    const rev=ss(TI,TC2+0.1,te); shell.visible=te>TI;
    su.uP.value=rev; su.uA.value=0.95; su.uD.value=-0.1+1.15*ss(TF,DUR-0.02,te);
    const bi=te-TA, bk=bi>=0?(bi%0.2)/0.2:-1; su.uB.value=bi>=0&&bi<0.6?bk*1.1:-1;
    su.uF.value=hitE(ic,6)+0.5*(bi>=0&&bi<0.6?Math.exp(-(bi%0.2)*14):0);
    const env=ss(TI,TC2,te)*(1-ss(TF,DUR,te));
    glowOf(caster,U.uC1.value,0.25*env+0.4*hitE(ia,8));
    o.em=0; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(CX,1.2,0);o.gs=0.7;o.ga=0.06*vib;o.li=1.2*ss(0,TI,te);}
    else{o.g.set(CX,1.0,0);o.gs=1.6;o.ga=0.2*Math.exp(-ia*7)+0.05*env;o.li=3*Math.exp(-ia*4)+0.8*env;}
    o.ia=ia;o.c.set(CX,1,0);o.shake=0.3;o.dist=0.35;o.flash=0.2;
  };
}}));

// =====================================================================
// 2 · CERASTES — (aliado) dos cuernos de víbora de hueso surgen sobre la cabeza, vuelan en arco y se clavan a los
//     lados del aliado; bombean veneno esmeralda por el suelo hasta él y le brota una corona de púas de escama que
//     late (devolverá el daño al próximo agresor), con un velo verde. Al final las púas se retraen. ti 0,85 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcCerastes",name:"Cerastes (estilizado)",dur:2.3,ti:0.85,pal:P_CERA,tier:2,stylized:true,receiver:'target'},ZONES,{
  phases:[["Conjuro",0],["Vuelo",0.25],["Clavado",0.85],["Inyección",1.0],["Calaveras",1.3],["Fin",1.95]],
build(a){
  const L=a.L,TV=0.25,TI=0.85,TJ=1.0,TK=1.3,TF=1.95,DUR=2.3;
  // cuerno curvo: tubo que se estrecha, base violeta con anillos, punta marfil (eje local: base en el origen, punta hacia +y)
  const hornCurve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.08,0.4,0),V3(0.28,0.78,0),V3(0.55,1.02,0)]);
  const hornGeo=taperTube(hornCurve,24,12,0.16,0.012);
  const hornMat=solidMat(`float u=vUv.x;float rg=smoothstep(.6,.9,sin(u*48.));base=mix(${SCALE},${BONE},smoothstep(.2,.55,u));base=mix(base,${BONED},rg*.5*(1.-u));lb=-.14*rg*(1.-u*.6);`,{hot:'uC1',rim:.3},THREE.DoubleSide);
  const horns=[-1,1].map(s=>{const g=new THREE.Group();L.mesh.add(g);const m=new THREE.Mesh(hornGeo,hornMat);m.position.set(-0.2,-0.5,0);g.add(m);
    return {g,s,land:V3(TX-0.2,0,s*0.85),start:V3(HN.x+0.05,HN.y+0.3,s*0.35)};});
  const sparks=horns.map((h,i)=>S.hitSpark(L.mesh,1.0,{seed:0.3+i*0.31}));
  const ring=S.groundRing(L.decal,3.0);
  const pools=horns.map(h=>{const m=groundPlane(1.0,TX-0.15,0.026,S.mat(STAIN(VENOM,.6,.45),{},{mode:'matter'}));m.position.z=h.land.z;L.decal.add(m);return m;});
  // corona de púas de escama alrededor del aliado (represalia)
  const spikeMat=solidMat(SCALE_BODY(SCALE,SCALEL,'vec2(3.,5.)')+`base=mix(base,${VENOM},smoothstep(.75,1.,vUv.y)*.6);`,{hot:'uC1',rim:.35});
  const spikeGeo=new THREE.ConeGeometry(0.15,0.85,8,3).translate(0,0.42,0);
  const spikes=[];for(let i=0;i<12;i++){const an=i/12*Math.PI*2+0.13;const m=new THREE.Mesh(spikeGeo,spikeMat);L.mesh.add(m);spikes.push({m,an,d:(i%4)*0.03});}
  const veil=shellMesh(0.95,L.mesh); veil.position.set(TX,0.02,0);
  const K=`const float TJ=${f(TJ)};const float TK=${f(TK)};const float TX=${f(TX)};`;
  // veneno que corre por el suelo desde los cuernos hasta los pies del aliado
  S.pts(L.part,26,VV+K+`void main(){float sd=aSeed.x<.5?-1.:1.;float s=TJ-.12+fract(aSeed.x*2.)*.32;float u=clamp((uT-s)/.3,0.,1.);
   vec3 p=vec3(TX-.15,.06,sd*.78*(1.-u))+vec3(0.,.05*sin(u*9.+aSeed.y*6.),0.);vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.7,1.,u);vR=0.;
   put(p,.18+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:VENOM,bias:.05}));
  // motas esmeralda que laten alrededor (veneno cargado)
  S.pts(L.part,20,VV+K+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TK)/life+aSeed.x;float age=fract(k);float an=aSeed.z*6.2832+age*1.2;
   vec3 p=vec3(TX+cos(an)*(.75-.2*age),.2+age*1.6,sin(an)*(.7-.2*age));float on=uT>TK&&uT<${f(TF)}?1.:0.;
   vA=on*sin(age*3.1416);vK=0.;vR=an;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  const vu=veil.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ij=te-TJ, ik=te-TK;
    caster.rotation.z=0.06*ss(0,TV,te)-0.12*ss(TV,TV+0.08,te)+0.06*ss(TV+0.15,TI,te);
    horns.forEach((h,i)=>{
      const g=h.g, grow=back(ss(0.02,TV,te)), u=cl((te-TV)/(TI-TV)), sink=ss(TF,DUR-0.05,te);
      if(te<TV){g.position.copy(h.start);g.position.y+=0.1*Math.sin(te*14+i);g.rotation.set(0,0,h.s*0.25);g.rotation.x=-h.s*0.2;g.scale.setScalar(Math.max(1.3*grow,0.001));}
      else if(ia<0){const uu=u*u*(0.4+0.6*u);g.position.lerpVectors(h.start,h.land,uu);g.position.y+=Math.sin(u*Math.PI)*1.1;
        g.rotation.set(-h.s*0.2*(1-u),0,Math.PI*(0.2+1.0*u)*(i?1:1));g.scale.setScalar(1.3);}
      else{g.position.copy(h.land);g.position.y=0.75-0.5*sink+0.03*Math.sin(ia*40)*Math.exp(-ia*8);g.rotation.set(0,0,Math.PI*1.2);g.scale.setScalar(1.3);}
      g.visible=te>0.02&&sink<1;
      sparks[i].pose(ia,tmp.set(h.land.x,0.25,h.land.z),0.7);
      set(pools[i],ij>=0?-0.1+1.15*ss(TF-0.2,DUR,te):0,ij>=0?1:0); pools[i].scale.setScalar(0.4+0.6*e3(ij/0.25));
    });
    hornMat.uniforms.uQ.value=-0.1+1.15*ss(TF,DUR-0.05,te); hornMat.uniforms.uK.value=0.25*(ij>=0?Math.max(0,Math.sin(ij*14)):0)*(1-ss(TK,TK+0.3,te));
    ring.pose(ia,TX,0,0.45,0.9);
    // púas: brotan en la inyección, laten en la represalia, se retraen al final
    spikes.forEach(s=>{const g=back(ss(TJ+0.05+s.d,TJ+0.3+s.d,te)), r=1-ss(TF,DUR-0.05,te), beat=ik>=0?0.12*Math.pow(Math.max(0,Math.sin(ik*9)),4):0;
      s.m.position.set(TX+Math.cos(s.an)*0.72,0,Math.sin(s.an)*0.62); s.m.rotation.set(0,0,0);
      s.m.lookAt(tmp.set(TX+Math.cos(s.an)*3,1.6,Math.sin(s.an)*3)); s.m.rotateX(Math.PI/2);
      const k=Math.max(g*r*(1+beat),0.001); s.m.scale.set(k,k*(0.9+0.25*Math.sin(s.an*3)),k); s.m.visible=g*r>0.002;});
    spikeMat.uniforms.uK.value=ik>=0?0.3*Math.pow(Math.max(0,Math.sin(ik*9)),4):0;
    veil.visible=te>TJ; vu.uP.value=ss(TJ,TK,te); vu.uA.value=0.6; vu.uD.value=-0.1+1.15*ss(TF,DUR-0.02,te);
    vu.uB.value=ik>=0?(ik*0.9)%1.1:-1; vu.uF.value=ik>=0?0.4*Math.pow(Math.max(0,Math.sin(ik*9)),4):0;
    const env=ss(TJ,TK,te)*(1-ss(TF,DUR,te));
    o.em=0.25*env+0.3*hitE(ia,7); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(horns[0].g.position);o.gs=0.5;o.ga=0.05;o.li=1.0;}
    else{o.g.set(TX,0.8,0);o.gs=1.4;o.ga=0.12*Math.exp(-ia*6)+0.05*env;o.li=2.5*Math.exp(-ia*4)+0.9*env;}
    o.ia=ia;o.c.set(TX,0.6,0);o.shake=0.15;o.dist=0.3;o.flash=0;
  };
}}));

// =====================================================================
// 3 · INCISOR — dos raíles de escama se alzan a los lados del rival con un sello rojo en el suelo; entre ellos sube
//     un colmillo prehistórico de marfil que brilla en la punta y cae como una guillotina: tajo carmesí, sangre,
//     grieta. El colmillo queda clavado un instante y se desmorona; Sangrado. ti 0,78 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcIncisor",name:"Incisor (estilizado)",dur:2.2,ti:0.78,pal:P_INCI,tier:2,stylized:true},ZONES,{
  phases:[["Presagio",0],["Alzado",0.22],["Guillotina",0.62],["Tajo",0.78],["Sangrado",0.95],["Fin",1.8]],
build(a){
  const L=a.L,TA=0.22,TG=0.62,TI=0.78,TS=0.95,TF=1.8,DUR=2.2;
  // colmillo: cono curvado (punta hacia abajo), marfil con raíz violeta y estrías
  const fangGeo=new THREE.ConeGeometry(0.36,1.75,24,10).rotateX(Math.PI);
  {const pa=fangGeo.attributes.position;for(let i=0;i<pa.count;i++){const y=pa.getY(i);const k=(0.875-y)/1.75;pa.setX(i,pa.getX(i)+0.28*Math.pow(1-k,2)-0.1);pa.setZ(i,pa.getZ(i)*0.72);}fangGeo.computeVertexNormals();}
  const fangMat=solidMat(`float h=clamp(vP.y/1.75+.5,0.,1.);float st=smoothstep(.75,.95,sin(atan(vP.z,vP.x)*7.))*.5;
   base=mix(${BONE},${SCALE},smoothstep(.78,.98,h));base=mix(base,${BONED},st*(1.-h)*.6);lb=-.1*st+.06*(1.-h);`,{hot:'uC1',rim:.4});
  const fang=new THREE.Mesh(fangGeo,fangMat); L.mesh.add(fang);
  const railMat=solidMat(SCALE_BODY(SCALE,SCALEL,'vec2(2.,12.)'),{hot:'uC1'});
  const rails=[-1,1].map(s=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.16,1.8,0.16).translate(0,0.9,0),railMat);m.position.set(TX,0,s*0.82);L.mesh.add(m);return m;});
  const capMat=solidMat(`base=${BONE};lb=.05;`,{hot:'uC1'});
  const caps=rails.map(r=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.17,0),capMat);L.mesh.add(m);return m;});
  const seal=groundPlane(2.4,TX,0.03,S.mat(GLYPH(`m*=step(.55,r)*(1.-step(.95,r))+smoothstep(.04,0.,abs(p.x))*step(r,.8)+smoothstep(.04,0.,abs(p.y))*step(r,.8)*.6;`),{},{mode:'energy'})); L.decal.add(seal);
  const crack=groundPlane(2.0,TX,0.027,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float br=smoothstep(.06,0.,abs(fract(an*6./6.2832+styNoise(vec2(r*.6,an)).r*.3)-.5)*r*2.)*step(r,.95)*(1.-r*.6);
   float m=max(br,smoothstep(.25,.1,r)*.6);if(m<.05)discard;float er=styErode(1.-r+styNoise(vUv).g*.3,uP,.1);
   gl_FragColor=vec4(styRampOf(vec3(.035,.012,.008),.2),m*er*uA*.8);}`,{},{mode:'matter'})); L.decal.add(crack);
  const stain=groundPlane(1.4,TX+0.15,0.025,S.mat(STAIN(BLOOD,.55,.35),{},{mode:'matter'})); L.decal.add(stain);
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),S.mat(`uniform float uEr;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.02)discard;
   float er=styErode(m*.55+s.b*.45,uEr,.1);gl_FragColor=vec4(styRamp(.5+.5*s.g)*1.25,m*er*uA);}`,{uEr:{value:0}},{mode:'energy',depthTest:false}));
  L.mesh.add(slash);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.71}), glint=S.hitSpark(L.mesh,0.7,{seed:0.12});
  const ring=S.groundRing(L.decal,2.8);
  const bleed=S.status(a,'bleed',[target],TS,DUR-0.05);
  const K=`const float TI=${f(TI)};const float TX=${f(TX)};`;
  // sangre que salta del tajo
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(.6+cos(an)*1.4,1.6+1.8*aSeed.w,sin(an)*1.4);vec3 p=vec3(TX-.15,1.1,0.)+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,v.y-18.*t);put(p,.15+.07*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD,bias:.08}));
  // esquirlas de marfil al desmoronarse
  S.pts(L.part,16,VV+`const float T0=${f(TI+0.45)};const float TX=${f(TX)};void main(){float s=T0+aSeed.x*.2;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(TX-.05+(aSeed.z-.5)*.5,.4+aSeed.w*1.2-2.5*t*t,(aSeed.y-.5)*.4)+vec3((aSeed.z-.5)*t,0.,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.16+.08*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:BONE}));
  const su=slash.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ig=te-TG;
    // raíles y sello
    const rg=back(ss(0.02,TA+0.1,te)), rq=ss(TI+0.35,TI+0.8,te);
    rails.forEach((r,i)=>{r.scale.set(1,Math.max(rg*1.9,0.001),1);r.visible=rg>0.001;caps[i].position.set(TX,1.8*1.9*rg+0.12,r.position.z);caps[i].rotation.y=te*3;caps[i].visible=rg>0.001;});
    railMat.uniforms.uQ.value=-0.1+1.15*rq; capMat.uniforms.uQ.value=railMat.uniforms.uQ.value;
    set(seal,-0.1+1.15*ss(TI+0.2,TI+0.7,te),ss(0,0.15,te)); seal.rotation.z=te*0.6;
    // colmillo: sube (presagio), tiembla arriba, cae en guillotina, queda clavado y se desmorona
    let fy;
    if(te<TA)fy=5.2; else if(ig<0)fy=3.3+0.1*Math.sin(te*20)*ss(TA+0.2,TG,te)+1.9*(1-e3((te-TA)/(TG-TA)));
    else if(ia<0){const u=(te-TG)/(TI-TG);fy=3.3-(3.3-1.35)*u*u;}
    else fy=1.35-0.55*e3(ia/0.1);
    fang.position.set(TX+0.02,fy,0); fang.rotation.set(0,0.3,0.06*(ia<0?1:0)*Math.sin(te*30));
    const sq=ia>=0?1-0.12*hitE(ia,12):1+0.12*ss(TG,TI,te); fang.scale.set(1.25/Math.sqrt(sq),1.25*sq,1.25/Math.sqrt(sq));
    fang.visible=te>=TA-0.02&&te<TI+0.75;
    fangMat.uniforms.uQ.value=-0.1+1.15*ss(TI+0.4,TI+0.75,te);
    fangMat.uniforms.uK.value=0.4*ss(TA+0.15,TG,te)*(ia<0?1:0)+0.5*hitE(ia,10);
    glint.pose(te-(TA+0.32),tmp.set(TX+0.05,fy-0.95,0.2),0.9);
    // tajo
    towardCam(slash.position,tmp.set(TX-0.1,1.1,0),0.5); billboard(slash,-0.9);
    slash.visible=ia>=0&&ia<0.3; su.uA.value=1; su.uEr.value=-0.1+1.1*ss(0.04,0.28,ia);
    slash.scale.setScalar(0.6+0.5*e3(ia/0.06));
    spark.pose(ia,tmp.set(TX-0.1,1.25,0),1.0);
    ring.pose(ia,TX,0,0.42,1);
    set(crack,ia>=0?-0.1+1.15*ss(0.7,1.3,ia):0,ia>=0?1:0); crack.scale.setScalar(0.5+0.5*e3(ia/0.12));
    set(stain,ia>=0?-0.1+1.15*ss(0.8,1.35,ia):0,ia>=0?1:0); stain.scale.setScalar(0.4+0.6*e3((ia-0.05)/0.3));
    const h=hitE(ia,7);
    target.position.x=TX+0.18*h; target.scale.set(1+0.1*h,1-0.16*h,1+0.1*h); target.rotation.z=-0.12*h*Math.cos(ia*18);
    const bl=bleed.pose(te);
    o.em=0.45*h+0.2*bl; o.emc.setRGB(0.9,0.12,0.18);
    if(ia<0){o.g.set(TX,fy-0.8,0);o.gs=0.6;o.ga=0.05*ss(TA,TG,te);o.li=1.4*ss(TA,TI,te);}
    else{o.g.set(TX-0.1,1.1,0);o.gs=1.6+2*ia;o.ga=Math.exp(-ia*9)*0.35;o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(TX-0.1,1.1,0);o.shake=0.8;o.dist=0.8;o.flash=0.4;
  };
}}));

// =====================================================================
// 4 · POISON TUBE — un tubo de hueso con anillos violeta brota de la frente, aspira motas (se hincha) y escupe un
//     dardo de cerbatana con plumas verdes que se clava en el pecho del rival: nube de veneno y tres pulsos de
//     neurotoxina que suben por él (Veneno). ti 0,72 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcPoisonTube",name:"Poison Tube (estilizado)",dur:2.2,ti:0.72,pal:P_TUBE,tier:2,stylized:true},ZONES,{
  phases:[["Tubo",0],["Inspiración",0.18],["Soplo",0.5],["Impacto",0.72],["Neurotoxina",0.9],["Fin",1.8]],
build(a){
  const L=a.L,TT=0.18,TB=0.5,TI=0.72,TN=0.9,TF=1.8,DUR=2.2;
  const MZ=V3(-2.55,2.05,0.05), HIT=V3(TX-0.38,1.18,0.05), DIR=HIT.clone().sub(MZ).normalize();
  // tubo: eje x local, boca en +x
  const tube=new THREE.Group(); L.mesh.add(tube);
  const tubeMat=solidMat(`float u=vUv.y;float rg=smoothstep(.45,.8,sin(u*30.));base=mix(${BONE},${SCALE},rg);lb=-.12*rg;`,{hot:'uC1',rim:.3});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.1,1.0,16,8,true).rotateZ(-Math.PI/2),tubeMat); body.position.x=-0.5; tube.add(body);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(0.13,0.045,8,16).rotateY(Math.PI/2),tubeMat); tube.add(lip);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),tubeMat); bulb.position.x=-1.0; tube.add(bulb);
  // dardo: espina violeta + tres plumas verdes; punta en el origen, eje x
  const dart=new THREE.Group(); L.mesh.add(dart);
  const dartMat=solidMat(`float h=vUv.y;base=mix(${SCALE},${SCALEL},h*.6);lb=.05*h;`,{hot:'uC1',rim:.35});
  const thorn=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.55,10).rotateZ(-Math.PI/2),dartMat); thorn.position.x=-0.27; dart.add(thorn);
  const fl=solidMat(`float v=vUv.y,u=vUv.x-.5;float w=.5*sin(3.1416*v)*(.6+.4*v);if(abs(u)>w)discard;float rib=smoothstep(.05,0.,abs(u));
   base=mix(vec3(.013,.22,.035),${VENOM},.3+.5*v);base=mix(base,${BONE},rib*.5);lb=.05*rib;`,{hot:'vec3(.4,1.,.5)'},THREE.DoubleSide);
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.32).rotateZ(Math.PI/2),fl);m.position.x=-0.62;m.rotation.x=i*Math.PI/3;dart.add(m);}
  const spark=S.hitSpark(L.mesh,1.2,{seed:0.53}), puffSpark=S.hitSpark(L.mesh,0.8,{seed:0.2});
  const ring=S.groundRing(L.decal,2.6);
  const stain=groundPlane(1.6,TX,0.025,S.mat(STAIN(VENOM,.5,.4),{},{mode:'matter'})); L.decal.add(stain);
  const poison=S.status(a,'poison',[target],TN,DUR-0.05);
  const K=`const float TT=${f(TT)};const float TB=${f(TB)};const float TI=${f(TI)};const float TN=${f(TN)};const vec3 MZ=${v3(MZ)};const vec3 HIT=${v3(HIT)};`;
  // inspiración: motas violeta que entran por la parte trasera del tubo
  S.pts(L.part,16,VV+K+`void main(){float s=TT+aSeed.x*(TB-TT-.1);float u=clamp((uT-s)/.18,0.,1.);
   vec3 tail=MZ+vec3(-1.05,0.,0.);vec3 a0=tail+normalize(rnd()+vec3(-.6,.3,0.))*(.9+.4*aSeed.y);
   vec3 p=mix(a0,tail,u*u);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // soplo: humo violeta en la boca
  S.pts(L.part,10,VV+K+`void main(){float s=TB+aSeed.x*.05;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()*.6+vec3(.8,.25,0.))*(1.2+aSeed.z);vec3 p=MZ+v*t*(1.-.6*t);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.26+.12*aSeed.w)*(.6+.8*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'vec3(.3,.13,.6)',bias:.05}));
  // estela de motas tras el dardo
  S.pts(L.part,14,VV+K+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.25;float age=(uT-s)/life;float u=(s-TB)/(TI-TB);
   vec3 p=mix(MZ,HIT,u)+vec3(0.,sin(u*3.1416)*.25,0.)+rnd()*.05+vec3(0.,.1*age,0.);vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.w*6.;put(p,.18*(1.-.5*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:'vec3(.35,.15,.72)',bias:.1}));
  // nube de veneno en el impacto y tres pulsos de neurotoxina
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.4,0.))*(1.+aSeed.z*.9);vec3 p=HIT+v*t*(1.-.55*min(t,1.))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t;put(p,(.36+.18*aSeed.w)*(.6+.7*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:VENOM,bias:.02}));
  S.pts(L.part,30,VV+K+`void main(){float i=floor(aSeed.x*3.);float s=TN+i*.2;float life=.45;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*3.;vec3 p=vec3(HIT.x+.25+cos(an)*.55,.15+age*1.7,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.1416):0.;vK=0.;vR=an;put(p,.16+.06*aSeed.w);}`,S.ENERGY_FS(C.drop,{gain:1.15}),{mode:'energy'});
  const XAX=V3(1,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB;
    caster.rotation.z=0.12*ss(TT,TB,te)-0.22*ss(TB,TB+0.06,te)+0.1*ss(TB+0.1,TI+0.2,te);
    // tubo
    const g=back(ss(0.02,TT+0.05,te)), q=ss(TI+0.2,TI+0.55,te);
    tube.position.copy(MZ); aim(tube,DIR,0); tube.scale.setScalar(Math.max(1.5*g*(1-q),0.001)); tube.visible=g>0.001&&q<1;
    const inh=ss(TT,TB,te)*(ib<0?1:0), blow=hitE(ib,12);
    bulb.scale.setScalar(1+0.6*inh-0.3*blow); body.scale.set(1,1+0.15*inh,1+0.15*inh); lip.scale.setScalar(1+0.4*blow);
    tubeMat.uniforms.uK.value=0.25*inh+0.4*blow;
    // dardo
    if(ib<0){dart.visible=false;}
    else if(ia<0){const u=ib/(TI-TB);dart.visible=true;dart.position.lerpVectors(MZ,HIT,u);dart.position.y+=Math.sin(u*Math.PI)*0.25;
      tmp.lerpVectors(MZ,HIT,Math.min(u+0.03,1));tmp.y+=Math.sin(Math.min(u+0.03,1)*Math.PI)*0.25;aim(dart,tmp.sub(dart.position),u*20);dart.scale.setScalar(2.2);}
    else{dart.visible=ia<0.9;dart.position.copy(HIT);dart.position.x+=0.03*Math.sin(ia*50)*Math.exp(-ia*8);aim(dart,DIR,0);dart.scale.setScalar(2.2);}
    dartMat.uniforms.uQ.value=-0.1+1.15*ss(TI+0.5,TI+0.9,te); fl.uniforms.uQ.value=dartMat.uniforms.uQ.value;
    puffSpark.pose(ib,tmp.copy(MZ).addScaledVector(DIR,0.2),0.6);
    spark.pose(ia,HIT,0.9);
    ring.pose(ia,TX,0,0.45,0.9);
    set(stain,ia>=0?-0.1+1.15*ss(0.6,1.4,ia):0,ia>=0?1:0); stain.scale.setScalar(0.4+0.6*e3(ia/0.3));
    const h=hitE(ia,9);
    target.position.x=TX+0.12*h; target.rotation.z=-0.1*h*Math.cos(ia*25);
    const pz=poison.pose(te), pulse=te>TN?Math.pow(Math.max(0,Math.sin((te-TN)/0.2*Math.PI)),2)*(te<TN+0.6?1:0):0;
    o.em=0.35*h+0.15*pz+0.3*pulse; o.emc.setRGB(0.32,0.85,0.3);
    if(ia<0){o.g.copy(ib<0?MZ:dart.position);o.gs=0.5;o.ga=0.05+0.1*blow;o.li=1+1.5*blow;}
    else{o.g.copy(HIT);o.gs=1.2+ia;o.ga=Math.exp(-ia*8)*0.22;o.li=3*Math.exp(-ia*4);}
    o.ia=ia;o.c.copy(HIT);o.shake=0.4;o.dist=0.5;o.flash=0.25;
  };
}}));

// =====================================================================
// 5 · SCALY SPEAR — escamas violeta giran y se juntan sobre la cabeza en una jabalina de escamas que retrocede y sale
//     disparada con estela de pincel; atraviesa al rival (chispa de entrada y de salida, escamas que saltan por detrás)
//     y su casilla queda marcada con un recuadro de escamas. ti 0,68 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcScalySpear",name:"Scaly Spear (estilizado)",dur:1.9,ti:0.68,pal:P_SPEAR,tier:2,stylized:true},ZONES,{
  phases:[["Escamas",0],["Forja",0.12],["Tiro",0.42],["Perforación",0.68],["Estela",0.85],["Fin",1.4]],
build(a){
  const L=a.L,TFJ=0.12,TS=0.42,TI=0.68,TE=0.85,TF=1.4,DUR=1.9;
  const P0=V3(-3.35,2.55,0.05), HIT=V3(TX-0.3,1.25,0.05), OUT=V3(TX+1.9,1.0,0.05), DIR=OUT.clone().sub(P0).normalize();
  // jabalina en dos mallas compactas (el puente las mueve enteras): asta de escamas y punta de hueso
  const spear=new THREE.Group(); L.mesh.add(spear);
  const shaftMat=solidMat(SCALE_BODY(SCALE,SCALEL,'vec2(4.,14.)'),{hot:'uC1',rim:.3});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.07,1.2,10,10).rotateZ(-Math.PI/2),shaftMat); shaft.position.x=-0.95; spear.add(shaft);
  const tipMat=solidMat(`float h=vUv.y;base=mix(${BONE},${SCALEL},smoothstep(.0,.4,1.-h)*.5);lb=.08*h;`,{hot:'uC1',rim:.45});
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.5,4,2).rotateZ(-Math.PI/2),tipMat); tip.position.x=-0.22; spear.add(tip);
  const fins=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.34,3).rotateZ(-Math.PI/2),tipMat);m.position.set(-1.5,0.08*s,0);m.rotation.x=s*0.5;spear.add(m);return m;});
  // estela de pincel: tira a lo largo del recorrido, se revela detrás de la punta (uP) y se consume (uQ)
  const LEN=OUT.x-P0.x+0.4;
  const trail=new THREE.Mesh(new THREE.PlaneGeometry(LEN,0.6,64,1),S.mat(`uniform float uQ;void main(){float u=vUv.x;float y=vUv.y-.5;
   float n=styNoise(vec2(u*4.,vUv.y*.4)+.2).r;float w=.3+.18*u;float m=smoothstep(w,w*.2,abs(y+(n-.5)*.15))*step(u,uP)*smoothstep(uP-.75,uP,u);
   float er=styErode(n*.6+.4*(1.-u),uQ,.1);if(m*er<.02)discard;gl_FragColor=vec4(styRamp(.35+.45*smoothstep(uP-.4,uP,u))*1.1,m*er*uA);}`,
   {uQ:{value:0}},{mode:'energy'}));
  L.trail.add(trail);
  const mark=groundPlane(1.9,TX,0.028,S.mat(SCALEGRID+`void main(){vec2 p=abs(vUv-.5)*2.;float sq=max(p.x,p.y);float e=scl(vUv*vec2(6.,6.));
   float m=(smoothstep(.06,0.,abs(sq-.86))+smoothstep(.42,.5,e)*step(sq,.8)*.45)*step(sq,.95);if(m<.03)discard;
   float er=styErode(styNoise(vUv).r*.6+(1.-sq)*.4,uP,.1);gl_FragColor=vec4(styRamp(.5+.3*m),m*er*uA*.8);}`,{},{mode:'energy'})); L.decal.add(mark);
  const sIn=S.hitSpark(L.mesh,1.4,{seed:0.61}), sOut=S.hitSpark(L.mesh,1.2,{seed:0.17});
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TFJ=${f(TFJ)};const float TS=${f(TS)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 HIT=${v3(HIT)};`;
  // escamas que giran y se juntan en la jabalina
  S.pts(L.part,26,VV+K+`void main(){float s=aSeed.x*.12;float u=clamp((uT-s)/(TS-.04-s),0.,1.);float an=aSeed.z*6.2832+u*5.;
   float rad=(1.3+.5*aSeed.y)*(1.-u*u);vec3 c=P0+vec3(-.85+1.1*aSeed.w,0.,0.);vec3 p=c+vec3(cos(an)*rad*.7,sin(an)*rad*.55,sin(an+1.)*rad*.4);
   vA=(uT>s&&u<.98)?1.:0.;vK=smoothstep(.8,1.,u);vR=an;put(p,.2+.08*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.28,.1,.65)',bias:.04}));
  // escamas que saltan por detrás del rival
  S.pts(L.part,18,VV+K+`void main(){float s=TI+.03+aSeed.x*.05;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()*.7+vec3(1.,.35,0.))*(2.2+1.6*aSeed.z);vec3 p=HIT+vec3(.6,0.,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*10.;put(p,.17+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'vec3(.22,.07,.58)'}));
  const tu=trail.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, is=te-TS;
    caster.rotation.z=0.06*ss(TFJ,TS,te)-0.14*ss(TS,TS+0.06,te)+0.08*ss(TS+0.1,TI+0.2,te);
    const form=ss(TFJ,TS-0.05,te);
    if(is<0){spear.position.copy(P0).addScaledVector(DIR,-0.25*ss(TS-0.15,TS,te));spear.position.y+=0.05*Math.sin(te*18);aim(spear,DIR,te*3);
      spear.scale.setScalar(Math.max(1.6*(0.4+0.6*form),0.001));}
    else if(ia<0){const u=is/(TI-TS),uu=u*(0.7+0.3*u);spear.position.lerpVectors(P0,HIT,uu);spear.position.x+=0.55;aim(spear,DIR,is*14);spear.scale.setScalar(1.6);}
    else{const u=e3(cl(ia/0.22));spear.position.lerpVectors(HIT,OUT,u);spear.position.x+=0.55*(1-u)+0.3*u;aim(spear,DIR,is*14);spear.scale.setScalar(1.6);}
    spear.visible=form>0.01&&te<TI+0.5;
    const er=-0.1+1.15*ss(TI+0.12,TI+0.45,te);
    shaftMat.uniforms.uQ.value=is<0?1.05-1.15*form:er; tipMat.uniforms.uQ.value=shaftMat.uniforms.uQ.value;
    shaftMat.uniforms.uK.value=0.3*ss(TS-0.12,TS,te)*(is<0?1:0)+0.3*hitE(ia,8);
    // estela
    trail.position.set(P0.x+LEN/2-0.2,0,0); trail.position.y=(P0.y+OUT.y)/2; trail.rotation.z=Math.atan2(OUT.y-P0.y,OUT.x-P0.x);
    const sp=(spear.position.x-P0.x)/LEN+0.06; tu.uP.value=is>=0?sp:0; tu.uA.value=is>=0?1:0; tu.uQ.value=-0.1+1.15*ss(TI,TI+0.55,te);
    trail.visible=is>=0&&tu.uQ.value<1;
    sIn.pose(ia,HIT,1.0); sOut.pose(ia-0.05,tmp.copy(HIT).add(tmp2.set(0.75,-0.05,0)),0.8);
    ring.pose(ia,TX,0,0.42,0.9);
    set(mark,te>TE?-0.1+1.15*ss(TF-0.1,DUR-0.05,te):0,ss(TI+0.02,TE,te)); mark.rotation.z=0;
    const h=hitE(ia,9);
    target.position.x=TX+0.2*h; target.scale.set(1-0.06*h,1+0.05*h,1-0.06*h); target.rotation.z=-0.14*h*Math.cos(ia*20);
    o.em=0.4*h; o.emc.copy(U.uC1.value);
    if(is<0){o.g.copy(P0);o.gs=0.7*form;o.ga=0.1*form;o.li=1.4*form;}
    else if(ia<0){o.g.copy(spear.position);o.gs=0.6;o.ga=0.1;o.li=1.6;}
    else{o.g.copy(HIT);o.gs=1.3+1.5*ia;o.ga=Math.exp(-ia*9)*0.3;o.li=4*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HIT);o.shake=0.5;o.dist=0.6;o.flash=0.3;
  };
}}));

// =====================================================================
// 6 · SCALY SPOON — (aliado; Early Bird) un río de escamas iridiscentes sale de la cabeza y forma ante el aliado una
//     cuchara mística de escamas y oro; en ti se cierra a su alrededor una cúpula de escamas (escudo). La cuchara gira,
//     su cuenco recoge la luz y la devuelve en un destello con rayos (refleja el 35 % del daño); un brillo de espejo
//     recorre la cúpula. Al final la cuchara se deshace en escamas que caen. ti 0,85 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcScalySpoon",name:"Scaly Spoon (estilizado)",dur:2.3,ti:0.85,pal:P_SPOON,tier:2,stylized:true,receiver:'target'},ZONES,{
  phases:[["Escamas",0],["Cuchara",0.35],["Escudo",0.85],["Giro",1.12],["Reflejo",1.3],["Fin",1.9]],
build(a){
  const L=a.L,TC2=0.35,TI=0.85,TG=1.12,TR=1.3,TF=1.9,DUR=2.3;
  const SP=V3(TX-0.95,0,0.65);                       // la cuchara, delante del aliado (hacia la cámara y el lanzador)
  const spoon=new THREE.Group(); spoon.position.copy(SP); L.mesh.add(spoon);
  const pivot=new THREE.Group(); spoon.add(pivot);
  const handleMat=solidMat(SCALE_BODY("vec3(.1,.03,.32)","vec3(.32,.15,.72)",'vec2(3.,16.)')+`base=mix(base,${GOLD},smoothstep(.86,.95,vUv.y)*.8);`,{hot:'uC1',rim:.4});
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.085,1.25,10,12),handleMat); handle.position.y=0.72; pivot.add(handle);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.11,12,10),solidMat(`base=${GOLD};lb=.05;`,{hot:'uC1',rim:.5})); knob.position.y=0.08; pivot.add(knob);
  // cuenco: elipsoide aplanado (una cara cóncava falsa: el interior se aclara hacia el centro)
  const bowlMat=solidMat(`float e=scl(vUv*vec2(12.,7.));float edge=smoothstep(.36,.5,e);
   base=mix(vec3(.42,.14,.015),${GOLD},.35+.65*(1.-edge));base=mix(base,vec3(.03,.35,.33),smoothstep(.0,.25,e)*(1.-smoothstep(.25,.4,e))*.0);lb=-.16*edge;`,{hot:'uC1',rim:.4});
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(0.4,28,20),bowlMat); bowl.scale.set(0.78,1.0,0.3); bowl.position.y=1.68; pivot.add(bowl);
  const shell=shellMesh(1.0,L.mesh); shell.position.set(TX,0.02,0);
  const flash=S.hitSpark(L.mesh,1.2,{seed:0.83}), seal=S.hitSpark(L.mesh,1.2,{seed:0.4});
  const ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.4);
  // rayos de reflejo: cinco cortes de luz que salen del cuenco
  const rayMat=S.mat(`uniform float uEr;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.02)discard;float er=styErode(m*.5+s.b*.5,uEr,.1);
   gl_FragColor=vec4(styRamp(.55+.45*s.g)*1.2,m*er*uA);}`,{uEr:{value:0}},{mode:'energy',depthTest:false});
  const rays=[];for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),rayMat);L.mesh.add(m);rays.push({m,an:-1.2+i*0.6});}
  const H0=V3(-3.55,2.2,0), K=`const float TC2=${f(TC2)};const float TI=${f(TI)};const float TF=${f(TF)};const vec3 H0=${v3(H0)};const vec3 BW=${v3(V3(SP.x,1.68*1.6,SP.z))};`;
  // río de escamas iridiscentes: de la cabeza al cuenco, por un arco
  S.pts(L.part,40,VV+K+`void main(){float s=aSeed.x*(TC2+.25);float u=clamp((uT-s)/.42,0.,1.);float uu=u*u*(3.-2.*u);
   vec3 p=mix(H0,BW,uu)+vec3(0.,sin(u*3.1416)*(1.6+.4*aSeed.y),sin(u*6.2832+aSeed.z*6.)*.35)+rnd()*.12*(1.-u);
   vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.85,1.,u);vR=aSeed.w*6.28+u*6.;put(p,.22+.08*aSeed.y);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'mix(vec3(.12,.6,.5),vec3(.28,.09,.72),step(.5,vMix))',bias:.06}));
  // escamas que caen al deshacerse la cuchara
  S.pts(L.part,20,VV+K+`void main(){float s=TF-.05+aSeed.x*.2;float life=.45+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(BW.x+(aSeed.z-.5)*.5,.4+aSeed.w*1.8-3.*t*t,BW.z+(aSeed.y-.5)*.3);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*8.;
   put(p,.17+.06*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.22,.1,.6)'}));
  // la luz que entra al cuenco durante el giro
  S.pts(L.part,16,VV+`const float TG=${f(TG)};const float TR=${f(TR)};const vec3 BW=${v3(V3(SP.x,1.68*1.6,SP.z))};void main(){float s=TG-.08+aSeed.x*(TR-TG);float u=clamp((uT-s)/.16,0.,1.);
   vec3 a0=BW+normalize(rnd())*(1.1+.4*aSeed.y);vec3 p=mix(a0,BW,u*u);vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.16+.06*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  const su=shell.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, ig=te-TG, ir=te-TR;
    caster.rotation.z=0.07*ss(0,0.2,te)-0.1*ss(0.2,0.3,te)+0.03*ss(0.3,0.6,te);
    const form=ss(TC2-0.05,TI-0.1,te), fade=ss(TF-0.05,TF+0.25,te);
    spoon.visible=form>0.01&&fade<1;
    spoon.scale.setScalar(Math.max(1.6*back(form)*(1-0.3*fade),0.001));
    spoon.rotation.set(0,-0.55,0.08);
    const spin=ig>=0?e3(cl(ig/(TR-TG+0.05)))*Math.PI*2:0;
    pivot.rotation.y=spin; pivot.position.y=0.06*Math.sin(te*5);
    const q=fade>0?-0.1+1.15*fade:1.05-1.15*form;
    handleMat.uniforms.uQ.value=q; bowlMat.uniforms.uQ.value=q; knob.material.uniforms.uQ.value=q;
    const glow=ss(TG,TR,te)*(ir<0?1:0)+hitE(ir,6);
    bowlMat.uniforms.uK.value=0.6*glow+0.3*hitE(ia,7); handleMat.uniforms.uK.value=0.2*glow;
    // cúpula de escudo
    shell.visible=te>TI-0.05; su.uP.value=ss(TI-0.05,TI+0.2,te); su.uA.value=0.85;
    su.uD.value=-0.1+1.15*ss(TF+0.05,DUR-0.02,te);
    su.uB.value=ir>=0&&ir<0.45?ir/0.4*1.1:-1; su.uF.value=0.6*hitE(ia,6)+0.5*hitE(ir,5);
    seal.pose(ia,tmp.set(TX,1.0,0),0.9); ring.pose(ia,TX,0,0.45,1); ring2.pose(ir,TX,0,0.4,0.85);
    // destello del cuenco y rayos de reflejo
    bowl.getWorldPosition(tmp2); L.mesh.worldToLocal(tmp2);
    flash.pose(ir,tmp2,1.0);
    rays.forEach((r,i)=>{const k=cl(ir/0.3);r.m.visible=ir>=0&&ir<0.32;
      tmp.copy(tmp2).add(tmp3.set(Math.cos(r.an)*(0.3+0.9*k),Math.sin(r.an)*(0.3+0.9*k)*0.9+0.1,0.25));
      towardCam(r.m.position,tmp,0.3); billboard(r.m,r.an+Math.PI*0.5);r.m.scale.setScalar(0.7+0.4*k);});
    rayMat.uniforms.uA.value=1; rayMat.uniforms.uEr.value=-0.1+1.1*ss(0.05,0.3,ir);
    const env=ss(TI,TI+0.2,te)*(1-ss(TF,DUR,te));
    o.em=0.25*env+0.3*hitE(ia,6)+0.25*hitE(ir,6); o.emc.copy(U.uC1.value);
    if(te<TC2+0.25){o.g.set(-1,3,0);o.gs=0.4;o.ga=0.03;o.li=0.6;}
    else if(ir<0){o.g.copy(tmp2);o.gs=0.9;o.ga=0.06+0.1*glow;o.li=1.2+1.5*glow;}
    else{o.g.copy(tmp2);o.gs=1.4;o.ga=0.22*Math.exp(-ir*6)+0.04*env;o.li=3*Math.exp(-ir*4)+0.7*env;}
    o.ia=ia;o.c.set(TX,0.8,0);o.shake=0;o.dist=0.3;o.flash=0.1;
  };
}}));

// =====================================================================
// 7 · UNKO — una sombra crece sobre el rival y del cielo cae una pila tóxica en espiral (marrón con brillo verde) que se
//     estira al caer; revienta sobre su cabeza con salpicadura de baba, se derrite en un charco y sube un hedor verde con
//     moscas que dan vueltas. ti 0,72 s
// =====================================================================
defs.push(Object.assign({key:"sty_rcUnko",name:"Unko (estilizado)",dur:2.2,ti:0.72,pal:P_UNKO,tier:2,stylized:true},ZONES,{
  phases:[["Sombra",0],["Caída",0.3],["Plaf",0.72],["Baba",0.9],["Hedor",1.15],["Fin",1.85]],
build(a){
  const L=a.L,TCd=0.3,TI=0.72,TB=0.9,TH=1.15,TF=1.85,DUR=2.2;
  const pile=new THREE.Group(); L.mesh.add(pile);
  const pooMat=solidMat(`float sw=smoothstep(.55,.9,sin(vUv.x*6.2832*3.+vUv.y*8.));base=mix(${POO},vec3(.27,.12,.03),.3+.3*sw);
   base=mix(base,${SLIME},smoothstep(.72,.95,styNoise(vUv*vec2(3.,2.)+.5).g)*.7);lb=-.1*sw;`,{hot:'vec3(.6,.9,.2)',rim:.25});
  [[0.42,0.17,0.0],[0.32,0.14,0.24],[0.21,0.11,0.44]].forEach(([r,t,y])=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,12,24).rotateX(Math.PI/2),pooMat);m.position.y=y;pile.add(m);});
  const tipM=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.32,14).translate(0,0.16,0),pooMat); tipM.position.y=0.52; tipM.rotation.z=0.35; pile.add(tipM);
  const shadow=S.contactShadow(L.decal,1.5);
  const puddle=groundPlane(2.2,TX,0.026,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+.3).r*.6+styNoise(vUv*.4+.7).g*.4;
   float m=smoothstep(.82,.66,r+(n-.5)*.55);if(m<.01)discard;float hl=smoothstep(.7,.85,styNoise(vUv*2.+.1).b)*step(r,.6);
   float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(mix(styRampOf(mix(${POO},${SLIME},.35),.15+.35*n),styRampOf(${SLIME},.9),hl*.6),m*er*uA);}`,{},{mode:'matter'})); L.decal.add(puddle);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.29});
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TI=${f(TI)};const float TB=${f(TB)};const float TH=${f(TH)};const float TF=${f(TF)};const float TX=${f(TX)};`;
  // salpicadura de baba y trozos
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+1.4*aSeed.w),1.4+1.6*aSeed.y,sin(an)*(1.+1.2*aSeed.w));vec3 p=vec3(TX,1.45,0.)+v*t+vec3(0.,-8.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.x,v.y-17.*t);put(p,.2+.1*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'mix(vec3(.13,.05,.014),vec3(.25,.4,.02),step(.6,vMix))',bias:.04}));
  // gotas que resbalan por el rival
  S.pts(L.part,10,VV+K+`void main(){float s=TB+aSeed.x*.5;float life=.5;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(TX+cos(an)*.42,1.25-age*1.15,sin(an)*.4);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.1416;put(p,.14+.05*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'vec3(.27,.35,.03)'}));
  // hedor verde que sube ondulando
  S.pts(L.part,16,VV+K+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TH)/life+aSeed.x;float age=fract(k);float on=uT>TH&&uT<TF+.2?1.:0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(TX+cos(an)*.5+sin(age*6.+aSeed.w*6.)*.18,.3+age*1.9,sin(an)*.45);
   vA=on*smoothstep(0.,.15,age)*(1.-smoothstep(.75,1.,age));vK=smoothstep(.4,1.,age);vR=sin(age*5.)*.6;put(p,(.5+.2*aSeed.w)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:'vec3(.18,.37,.013)',bias:.0}));
  // moscas: puntos oscuros en ocho alrededor de la cabeza
  S.pts(L.part,6,VV+K+`void main(){float i=floor(aSeed.x*6.);float t=uT*(5.+aSeed.y*2.)+i*1.7;float on=smoothstep(TH,TH+.15,uT)*(1.-smoothstep(TF,TF+.3,uT));
   vec3 p=vec3(TX+sin(t)*.6,1.75+.25*sin(t*2.)+.1*i*.3,sin(t*2.)*.35+cos(t)*.2);vA=on;vK=0.;vR=t;put(p,.16);}`,
   S.PV+`void main(){vec2 q=styPC()-.5;float b=step(length(q*vec2(1.,1.4)),.22);float w=step(length((q-vec2(0.,.17))*vec2(1.6,1.)),.16)*.6;
    float m=max(b,w);if(m<.5||vA<.01)discard;gl_FragColor=vec4(mix(vec3(.08,.07,.06),vec3(.75,.82,.85),w*(1.-b)),vA);}`);
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB;
    // caída
    let py, sy=1, sxz=1;
    if(te<TCd){py=6.5;}
    else if(ia<0){const u=(te-TCd)/(TI-TCd);py=6.5-(6.5-1.45)*u*u;sy=1+0.25*u;sxz=1-0.1*u;}
    else{const sq=e3(cl(ia/0.08)), melt=ss(0.12,0.45,ia);py=1.45-0.25*sq-0.9*melt;sy=1-0.45*sq-0.4*melt;sxz=1+0.35*sq+0.3*melt;}
    pile.position.set(TX,py,0); pile.rotation.y=te*1.5; pile.scale.set(1.2*sxz,1.2*sy,1.2*sxz);
    pile.visible=te>TCd&&ia<0.5;
    pooMat.uniforms.uQ.value=ia>=0?-0.1+1.15*ss(0.15,0.48,ia):-1; pooMat.uniforms.uK.value=0.15*ss(TCd,TI,te)*(ia<0?1:0);
    const sh=ss(0,TI,te); shadow.pose(TX,0,0.4+0.9*sh,ia<0?0.6*sh:0.6*(1-ss(0,0.2,ia)));
    spark.pose(ia,tmp.set(TX,1.5,0),0.9);
    ring.pose(ia,TX,0,0.45,0.9);
    set(puddle,ia>=0?-0.1+1.15*ss(TF-0.75,DUR-0.05,te)+0:0,ia>=0?1:0); puddle.scale.setScalar(0.35+0.65*e3(ia/0.35));
    const h=hitE(ia,8);
    target.scale.set(1+0.16*h,1-0.22*h,1+0.16*h); target.position.x=TX+0.04*h;
    target.rotation.z=0.05*ss(TH,TH+0.3,te)*Math.sin(te*6)*(1-ss(TF,DUR,te));
    o.em=0.3*h+0.12*ss(TB,TH,te)*(1-ss(TF,DUR,te)); o.emc.setRGB(0.55,0.7,0.2);
    if(ia<0){o.g.set(TX,py,0);o.gs=0.4;o.ga=0.03;o.li=0.6*ss(TCd,TI,te);}
    else{o.g.set(TX,1.2,0);o.gs=1.2+ia;o.ga=Math.exp(-ia*9)*0.15;o.li=2.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(TX,1.3,0);o.shake=0.6;o.dist=0.6;o.flash=0.15;
  };
}}));

VFX.module("Estilizado · Reptil · Cuernos",defs);
})();

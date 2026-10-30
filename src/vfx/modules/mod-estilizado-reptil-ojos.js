// =====================================================================
// ESTILIZADO · REPTIL · OJOS (Hito 101) — las 5 cartas de ojos de Reptil hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_rjPunky, sty_rjScar, sty_rjTopaz, sty_rjGecko, sty_rjTricky). Mismos dur / ti /
// fases que las originales, así el daño llega igual. Identidad de clase: escamas violetas, veneno, piedra y gema.
// Semántica según PartCards.js:
//   Punky (sobre sí, 3 PA): Veneno a todos los enemigos · Scar (sobre sí, 1 PA): +2 PA ahora
//   Topaz (enemigo, 2 PA): daño · Gecko (sobre sí, 1 PA): pierde 40 HP, cura y limpia a todos los aliados
//   Tricky (aliado, 2 PA): escudo + quita 2 estados
// Las cartas «a todos» (Punky, Gecko) no dependen de dónde caen los muñecos del laboratorio: son ondas que salen del
// lanzador y se leen igual en cualquier casilla del tablero.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_PUNKY=pal("Sty Reptil · Punky",["#d89cff","#5e1f9c"]);
const P_SCAR=pal("Sty Reptil · Cicatriz",["#ff7a8e","#8c1430"]);
const P_TOPAZ=pal("Sty Reptil · Topacio",["#ffc85a","#a9560a"]);
const P_GECKO=pal("Sty Reptil · Gecko",["#86f0b8","#137a55"]);
const P_TRICKY=pal("Sty Reptil · Arlequín",["#e4a0ff","#1f9c90"]);

const CX=-3.7, TX=3.4, HEADP=V3(-3.7,1.62,0), EYE=V3(-3.45,1.68,0.12), CHEST=V3(-3.7,1.05,0);
const tmp=V3(0,0,0), RED=new THREE.Color(0.85,0.12,0.18);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const qbz=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};

// ---------- colores de materia (semánticos, fijos) ----------
const POISON="vec3(.42,.86,.22)", POISOND="vec3(.16,.42,.1)", STONE="vec3(.3,.24,.3)", EARTH="vec3(.52,.42,.32)",
  BLOOD="vec3(.78,.08,.14)", GOLD="vec3(1.,.76,.24)", SMOKEV="vec3(.36,.22,.48)", DARK="vec3(.13,.08,.16)";

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// sello de pincel en el suelo con dibujo propio (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.75;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.8);}`;
// mancha en el suelo (materia); uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// burbuja de veneno (borde de color con luz, brillo duro)
const BUBBLE=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
 float rim=smoothstep(.32,.44,d)*smoothstep(.5,.45,d);float hl=step(length(q-vec2(-.13,-.14)),.08);
 float a=(rim*.95+.22*smoothstep(.45,0.,d)+hl)*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${col},.5+.45*(.5-q.y)),vec3(1.,1.,.92),hl),a);}`;
// gema facetada (normales planas): rampa de la paleta por cara, filo claro y brillo interior uK
const GEM_FS=`uniform float uK;uniform float uQ;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float fr=1.-abs(dot(n,normalize(vV)));
 float nz=styNoise(vUv*1.3+.4).r;if(styErode(nz,uQ,.06)<.5)discard;
 vec3 c=styRamp(clamp(.3+.5*l+.25*fr,0.,1.))*styTint(l);c+=vec3(1.,.95,.8)*smoothstep(.8,.95,fr)*.35;
 c+=uC1*uK;gl_FragColor=vec4(c,1.);}`;

// gota de color plano (veneno, sangre): forma del atlas, dos tonos y brillo duro, sin lavarse a blanco
const DROP_FS=col=>S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(4.,uv);if(sh.r<.3)discard;
 float hl=smoothstep(.85,.95,sh.r)*step(uv.x,.5);vec3 c=styRampOf(${col},sh.r>.55?.62:.38);c=mix(c,vec3(1.,1.,.9),hl*.6);
 gl_FragColor=vec4(c,vA);}`;
const defs=[];

// =====================================================================
// 1 · PUNKY (3 PA) — sobre la cabeza brota una cresta mohicana de púas de fuego violeta; ruge (anillo de pincel) y un
//     muro de fuego tóxico en anillo barre el campo desde el lanzador. Por donde pasa llueven gotas de veneno verde que
//     burbujean en el suelo: todos los rivales quedan envenenados. ti 1,3 s (llega el muro al rival principal)
// =====================================================================
const CREST_FS=`uniform float uK;uniform float uH;
void main(){float h=vP.y;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vec2(vUv.x*.9+uH,h*.45-uT*.8)).r;float top=.72+.28*nz;if(h>top)discard;
 float k=h/top+(nz-.5)*.25;
 vec3 c=k<.34?styRamp(.3):(k<.72?styRamp(.62):mix(styRamp(.8),${POISON},.5));
 c*=mix(.85,1.08,l);c+=uC1*uK;gl_FragColor=vec4(c,1.);}`;
const WALL_FS=`uniform float uQ;
void main(){float h=vP.y;float nz=styNoise(vec2(vUv.x*9.,h*.35-uT*1.4)).r*.65+styNoise(vec2(vUv.x*23.,h*.7-uT*2.2)).g*.35;
 float top=.3+.7*nz;if(h>top)discard;if(styErode(nz*.8+h*.2,uQ,.08)<.5)discard;
 float k=h/top;
 vec3 c=k<.4?styRamp(.3):(k<.78?styRamp(.64):mix(styRamp(.86),${POISON}*1.25,.55));
 gl_FragColor=vec4(c*1.1,uA);}`;
defs.push({key:"sty_rjPunky",name:"Punky (estilizado)",dur:3.2,ti:1.3,pal:P_PUNKY,tier:3,stylized:true,
  phases:[["Ignición",0],["Cresta",0.55],["Rugido",1.05],["Veneno",1.3],["Ascuas",2.0],["Fin",2.7]],
build(a){
  const L=a.L,TC0=0.12,TR=1.05,TI=1.3,TA=2.0,TE=2.7,TF=3.2,SPD=9.5,RMAX=8.5;
  // cresta: siete púas de fuego sólido sobre la cabeza
  const crestMat=S.mat(CREST_FS,{uK:{value:0},uH:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const spG=new THREE.ConeGeometry(0.2,1,14,6,true).translate(0,0.5,0);
  const crest=[];for(let i=0;i<7;i++){const x=-3.46-i*0.08,dx=x-CX,m=new THREE.Mesh(spG,crestMat);
    const y=1.62+Math.sqrt(Math.max(0.09-dx*dx,0))-0.08;m.position.set(x,y,0);m.rotation.z=0.15+0.35*i/6;
    m.userData={h:0.9+0.8*Math.sin(Math.PI*(i+0.5)/7),t:TC0+i*0.055,i,lx:dx,ly:y,rz:m.rotation.z};L.mesh.add(m);crest.push(m);}
  // muro de fuego tóxico que barre el campo
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,96,6,true).translate(0,0.5,0),S.mat(WALL_FS,{uQ:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  wall.position.set(CX,0,0); L.mesh.add(wall);
  const roarRing=S.groundRing(L.decal,3.2), roarSpark=S.hitSpark(L.mesh,1.5,{seed:0.44});
  const sigil=groundPlane(2.6,CX,0.026,S.mat(GLYPH(`m=max(m,smoothstep(.1,0.,abs(r-.62))*.9);float sp=smoothstep(.12,0.,abs(fract(an/6.2832*7.)-.5)-.38)*step(r,.95)*step(.5,r);m=max(m,sp);`),{},{mode:'energy'}));
  const scorch=groundPlane(2.4,CX,0.022,S.mat(STAIN(DARK,.55),{},{mode:'matter'}));
  L.decal.add(sigil,scorch);
  const K=`const float TC0=${f(TC0)};const float TR=${f(TR)};const float TI=${f(TI)};const float TA=${f(TA)};const float CX=${f(CX)};const float SPD=${f(SPD)};const float RMAX=${f(RMAX)};`;
  // lenguas de fuego violeta que se desprenden de la cresta
  S.pts(L.part,40,VV+K+`void main(){float s=TC0+.15+aSeed.x*(TA-TC0);float life=.32+aSeed.y*.22;float age=(uT-s)/life;float t=max(uT-s,0.);
   float boost=1.+.9*step(TR,s)*exp(-(s-TR)*3.);vec3 p=vec3(-3.5-aSeed.z*.5,2.0+.25*aSeed.w,(aSeed.w-.5)*.18)+vec3(-.3*t,(1.3+1.2*aSeed.y)*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=(aSeed.y-.5)*.5;put(p,(.32+.18*aSeed.w)*(1.-age*.35)*boost);}`,
   S.ENERGY_FS(C.flame,{gain:1.25}),{mode:'energy'});
  // ascuas que suben de la cabeza al encenderse
  S.pts(L.part,24,VV+K+`void main(){float s=TC0+aSeed.x*(TR-TC0);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-3.5-aSeed.z*.45,1.95,(aSeed.w-.5)*.3)+vec3(sin(t*6.+aSeed.w*9.)*.15,t*(1.6+aSeed.y),0.);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=t*4.;put(p,.12+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // llamas a lo largo del frente del muro (violetas con punta verde)
  S.pts(L.part,90,VV+K+`void main(){float R=1.2+aSeed.x*(RMAX-1.2);float s=TR+R/SPD;float life=.3+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*R,.15+t*1.5,sin(an)*R*.85);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.25,1.,age);vR=(aSeed.w-.5)*.6;put(p,(.55+.3*aSeed.w)*(1.-age*.3));}`,
   S.MATTER_FS(C.flame,{relief:3,col:'vec3(.56,.24,.86)',bias:.06}));
  S.pts(L.part,50,VV+K+`void main(){float R=1.2+aSeed.x*(RMAX-1.2);float s=TR+R/SPD+.06;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*R,.55+t*1.6,sin(an)*R*.85);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=(aSeed.w-.5)*.5;put(p,(.34+.16*aSeed.w)*(1.-age*.3));}`,
   S.MATTER_FS(C.flame,{relief:3,col:POISON,bias:.08}));
  // gotas de veneno que caen tras el muro y burbujas que suben del suelo
  S.pts(L.part,60,VV+K+`void main(){float R=1.6+aSeed.x*(RMAX-1.8);float s=TR+R/SPD+.08+aSeed.y*.25;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   float y=2.4+aSeed.w*.8-7.*t*t;vec3 p=vec3(CX+cos(an)*R,y,sin(an)*R*.85);
   vA=(uT>s&&y>.05)?1.:0.;vK=0.;vR=3.14159;put(p,.2+.08*aSeed.w);}`,DROP_FS(POISON));
  S.pts(L.part,70,VV+K+`void main(){float R=1.6+aSeed.x*(RMAX-1.8);float s=TR+R/SPD+.35+aSeed.y*.6;float life=.7+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+aSeed.w*.3;vec3 p=vec3(CX+cos(an)*R+(aSeed.w-.5)*.3,.1+age*(.9+.5*aSeed.w),sin(an)*R*.85);
   vA=(age>0.&&age<1.&&uT<${f(TE+0.3)})?smoothstep(0.,.15,age)*(1.-smoothstep(.85,1.,age)):0.;vK=0.;vR=0.;put(p,(.2+.14*aSeed.w)*(.6+.6*age));}`,BUBBLE(POISON));
  // humo violeta en la cabeza al rugir
  S.pts(L.part,16,VV+K+`void main(){float s=TR+aSeed.x*.25;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-3.55,1.9,0.)+normalize(rnd()+vec3(.3,.6,0.))*(.2+.7*(1.-exp(-t*4.)))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t;put(p,(.6+.3*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:SMOKEV}));
  a.pose=function(te,o){
    const ir=te-TR, ia=te-TI, ign=ss(TC0,0.55,te), fade=1-ss(TA,TE,te), roar=hitE(ir,2.5);
    caster.rotation.z=0.08*ss(0.2,TR-0.1,te)-0.3*ss(TR-0.08,TR,te)*(1-ss(TR+0.25,TR+0.8,te));
    caster.scale.set(1+0.05*roar,1-0.04*roar,1+0.05*roar);
    glowOf(caster,U.uC1.value,0.18*ign*fade+0.35*roar);
    const th=caster.rotation.z,c=Math.cos(th),s=Math.sin(th);
    crest.forEach(m=>{const u=m.userData,g=back(ss(u.t,u.t+0.22,te))*fade;m.visible=g>0.001;
      const fl=1+0.1*Math.sin(te*14+u.i*2.1);
      m.scale.set(Math.max(g*(1+0.3*roar),0.001),Math.max(u.h*g*fl*(1+0.55*roar),0.001),Math.max(g*(1+0.3*roar),0.001));
      m.position.set(CX+u.lx*c-u.ly*s,u.lx*s+u.ly*c,0);m.rotation.z=u.rz+th;});
    crestMat.uniforms.uK.value=0.25*roar; crestMat.uniforms.uH.value=te*0.15;
    const R=ir>=0?1.0+ir*SPD:0, wl=ir>=0&&R<RMAX;
    wall.visible=wl; const wa=1-R/RMAX;
    wall.scale.set(Math.max(R,0.001),0.9+1.1*wa,Math.max(R*0.85,0.001));
    wall.material.uniforms.uA.value=ss(0,0.05,ir); wall.material.uniforms.uQ.value=-0.1+0.95*(1-wa);
    roarRing.pose(ir,CX,0,0.5,1.2); roarSpark.pose(ir,tmp.set(-3.4,2.1,0),1.0);
    set(sigil,-0.1+1.1*ss(TA,TE,te),ign);
    scorch.visible=ir>=0; scorch.scale.setScalar(0.6+0.5*e3(ir/0.3)); set(scorch,ir>=0?-0.1+1.15*ss(TA,TF,te):0,1);
    if(te<TR){o.g.set(-3.65,2.3,0);o.gs=1.2*ign;o.ga=0.12*ign;o.li=1.5*ign;}
    else{o.g.set(-3.6,1.6,0);o.gs=1.8;o.ga=0.25*roar+0.04*fade;o.li=4*roar+0.5*fade;}
    o.ia=ir;o.c.copy(HEADP);o.shake=1.2;o.dist=1.0;o.flash=0;
  };
}});

// =====================================================================
// 2 · SCAR (1 PA) — una cicatriz rubí se traza en zigzag sobre el ojo (filo oscuro y núcleo luminoso) y estalla en
//     esquirlas rojas; dos gemas doradas (+2 PA) brotan de la herida, giran alrededor del lanzador y se hunden en su
//     pecho. Sello dorado a los pies. ti 0,3 s
// =====================================================================
const SCAR_D=`float scarD(vec2 uv,out float w){float u=uv.x;float y=(uv.y-.5)*2.;w=.24*sin(3.14159*u)+.03;
 return abs(y-(.32*(abs(fract(u*3.)*2.-1.)*2.-1.))*sin(3.14159*u));}`;
defs.push({key:"sty_rjScar",name:"Scar (estilizado)",dur:1.2,ti:0.3,pal:P_SCAR,tier:1,stylized:true,
  phases:[["Cicatriz",0],["Despertar",0.3],["Reactivación",0.52],["Fin",0.9]],
build(a){
  const L=a.L,TD=0.04,TI=0.3,TV=0.52,TE=0.9,TF=1.2,SE=V3(-3.42,1.74,0.14);
  const scarDark=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.7),S.mat(SCAR_D+`void main(){float w;float d=scarD(vUv,w);
   float m=smoothstep(w*1.7,w*1.1,d)*step(vUv.x,uP);if(m<.02)discard;gl_FragColor=vec4(styRampOf(${BLOOD},.12),m*uA);}`,{},{mode:'matter',depthTest:false}));
  const scarGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.7),S.mat(SCAR_D+`uniform float uQ;void main(){float w;float d=scarD(vUv,w);float u=vUv.x;
   float rev=step(u,uP);float core=smoothstep(w*.7,w*.15,d)*rev;float head=smoothstep(.08,0.,abs(u-uP))*step(uP,.99)*smoothstep(w*2.4,0.,d);
   float m=max(core,head);if(m<.02)discard;vec3 c=styRamp(.55+.4*core)*(1.2+.8*uQ)+vec3(1.,.9,.8)*head*.5;gl_FragColor=vec4(c,m*uA);}`,{uQ:{value:0}},{mode:'energy',depthTest:false}));
  scarDark.renderOrder=1; scarGlow.renderOrder=2; L.mesh.add(scarDark,scarGlow);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.71});
  // gemas doradas (+2 PA): octaedros sólidos facetados
  const gemG=new THREE.OctahedronGeometry(0.22,0); gemG.computeVertexNormals();
  const gemMat=S.mat(`uniform float uK;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float fr=1.-abs(dot(n,normalize(vV)));
   vec3 c=styRampOf(${GOLD},clamp(.3+.5*l+.2*fr,0.,1.))*styTint(l);c+=vec3(1.,.8,.4)*uK;gl_FragColor=vec4(c,1.);}`,{uK:{value:0}},{mode:'solid'});
  const gems=[0,1].map(()=>{const m=new THREE.Mesh(gemG,gemMat);m.scale.set(1,1.5,1);L.mesh.add(m);return m;});
  const seal=groundPlane(2.2,CX,0.026,S.mat(GLYPH(`m=max(m,smoothstep(.09,0.,abs(abs(p.x)+abs(p.y)-.3))*.9);`),{},{mode:'energy'}));
  L.decal.add(seal);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const float TV=${f(TV)};const vec3 SE=${v3(SE)};`;
  // esquirlas rubí del estallido
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.5,.3,.4))*(1.6+1.4*aSeed.z);vec3 p=SE+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BLOOD,bias:.1}));
  S.pts(L.part,12,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.22;float age=(uT-s)/life;float t=max(uT-s,0.);float k=(s-TD)/(TI-TD);
   vec3 p=SE+vec3((k-.5)*.6,.1+.3*t,.05);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=t*5.;put(p,.12+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // humo carmesí oscuro que sale del lanzador
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.3;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(-3.7+cos(an)*.45,.3+aSeed.w*1.3+.5*t,sin(an)*.45);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.y*6.;
   put(p,(.4+.2*aSeed.w)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:'vec3(.42,.1,.16)'}));
  a.pose=function(te,o){
    const ia=te-TI, iv=te-TV, draw=ss(TD,TI,te), life=ss(TD,TD+0.04,te)*(1-ss(TE-0.15,TE+0.1,te));
    for(const m of [scarDark,scarGlow]){towardCam(m.position,SE,0.34);billboard(m,-0.55);m.visible=life>0.001;set(m,draw*1.01,life);}
    scarGlow.material.uniforms.uQ.value=hitE(ia,6)+0.5*hitE(iv,8);
    spark.pose(ia,SE,0.85);
    caster.rotation.z=0.1*hitE(ia,8)*Math.cos(Math.max(ia,0)*20)-0.05*hitE(iv,7);
    glowOf(caster,U.uC1.value,0.35*hitE(ia,5)+0.25*hitE(iv,6));
    // gemas: brotan de la cicatriz, rodean al lanzador y se hunden en el pecho
    gems.forEach((m,i)=>{const u=cl((te-TI-0.02-i*0.04)/(TV+0.2-TI)),sink=ss(0.75,1,u);
      const an=u*Math.PI*2.2+i*Math.PI, rad=0.7*Math.sin(Math.PI*Math.min(u*1.15,1));
      m.position.set(CX+Math.cos(an)*rad,SE.y-0.6*u+0.35*Math.sin(Math.PI*u),Math.sin(an)*rad);
      if(u<0.08)m.position.lerp(SE,1-u/0.08);
      m.visible=te>TI&&u<1; m.scale.set(1,1.5,1).multiplyScalar(Math.max(e3(u/0.15)*(1-sink*0.85),0.001)); m.rotation.y=te*7+i;});
    gemMat.uniforms.uK.value=0.35+0.3*Math.sin(te*30);
    set(seal,-0.1+1.1*ss(TE-0.1,TF,te),ss(TI,TI+0.08,te));
    if(te<TV){o.g.copy(SE);o.gs=0.5+0.6*draw;o.ga=0.12*draw+0.2*hitE(ia,10);o.li=1+2*hitE(ia,6);}
    else{o.g.copy(CHEST);o.gs=1.1;o.ga=0.15*hitE(iv,7);o.li=2*hitE(iv,5);}
    o.ia=ia;o.c.copy(SE);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 3 · TOPAZ (2 PA) — dos gemas de topacio facetadas crecen frente a los ojos y disparan una ráfaga de esquirlas
//     cristalinas; donde golpean, una coraza de piedra con vetas de topacio cubre al rival desde el impacto, lo deja
//     quieto y se quiebra en esquirlas y polvo. ti 0,7 s
// =====================================================================
const CRUST_FS=(hl,off)=>`uniform float uQ;uniform float uGrow;uniform float uK;
void main(){float dist=length(vP-${hl})+${off};if(dist>uGrow)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float nz=styNoise(vUv*vec2(2.,1.)+.3).r;float dz=nz-uQ*1.15+.08;if(dz<0.)discard;
 float vein=smoothstep(.8,.9,styNoise(vUv*vec2(3.,1.6)+.7).b);
 vec3 c=styRampOf(${STONE},clamp(.1+.5*l+(nz-.5)*.3,0.,1.))*styTint(l);
 float front=smoothstep(.16,0.,uGrow-dist)*step(uGrow,2.3);
 c=mix(c,styRamp(.72),vein*.85);c+=styRamp(.72)*(vein*.5*uK+front*.9+smoothstep(.12,0.,dz)*step(.001,uQ)*1.1);
 gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_rjTopaz",name:"Topaz (estilizado)",dur:2.2,ti:0.7,pal:P_TOPAZ,tier:2,stylized:true,zoneCaster:0.45,zoneTarget:1.1,
  phases:[["Gema",0],["Rayos",0.4],["Petrificación",0.7],["Piedra",1.25],["Quiebre",1.6],["Fin",1.95]],
build(a){
  const L=a.L,TB=0.4,TI=0.7,TP=1.25,TK=1.6,TE=1.95,TF=2.2,HP=V3(3.0,1.2,0);
  const EY=[V3(-3.2,1.75,0.28),V3(-3.2,1.75,-0.28)];
  const gemG=new THREE.OctahedronGeometry(0.3,0); gemG.computeVertexNormals();
  const gemMat=S.mat(GEM_FS,{uK:{value:0},uQ:{value:-1}},{mode:'solid'});
  const gems=EY.map(()=>{const m=new THREE.Mesh(gemG,gemMat);L.mesh.add(m);return m;});
  const crustUni=()=>({uQ:{value:0},uGrow:{value:0},uK:{value:0}});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.6,32,20),S.mat(CRUST_FS("vec3(-.38,.7,0.)",".2"),crustUni(),{mode:'solid'}));body.scale.set(1.1,0.88,1.02);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.47,28,18),S.mat(CRUST_FS("vec3(-.38,.15,0.)","0."),crustUni(),{mode:'solid'}));
  L.mesh.add(body,head);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.27}), breakSpark=S.hitSpark(L.mesh,1.3,{seed:0.83});
  const ring=S.groundRing(L.decal,2.8), ring2=S.groundRing(L.decal,3.2);
  const stain=groundPlane(2.2,TX,0.022,S.mat(STAIN(STONE,.5),{},{mode:'matter'})); L.decal.add(stain);
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TP=${f(TP)};const float TK=${f(TK)};const vec3 HP=${v3(HP)};
  const vec3 E0=${v3(EY[0])};const vec3 E1=${v3(EY[1])};const float TX=${f(TX)};`;
  // luz que se condensa en las gemas
  S.pts(L.part,14,VV+K+`void main(){vec3 E=aSeed.y<.5?E0:E1;float s=aSeed.x*(TB-.12);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(E+normalize(rnd()+.001)*.6,E,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;vK=0.;vR=0.;put(p,.12+.06*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // ráfaga de esquirlas de topacio (materia) con núcleo de luz (energía)
  S.pts(L.part,40,VV+K+`void main(){vec3 E=aSeed.y<.5?E0:E1;float s=TB+aSeed.x*(TI-TB-.08);float u=(uT-s)/.28;
   vec3 p=mix(E,HP,clamp(u,0.,1.))+rnd()*vec3(.05,.12,.12)*sin(clamp(u,0.,1.)*3.14159);
   vA=(u>0.&&u<1.)?1.:0.;vK=0.;vR=aSeed.w*6.28+uT*12.;put(p,.22+.1*aSeed.z);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC1',bias:.06}));
  S.pts(L.part,30,VV+K+`void main(){vec3 E=aSeed.y<.5?E0:E1;float s=TB+aSeed.x*(TI-TB-.05);float u=(uT-s)/.26;
   vec3 p=mix(E,HP,clamp(u,0.,1.));vA=(u>0.&&u<1.)?.9:0.;vK=0.;vR=uT*8.;put(p,.2+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // quiebre: esquirlas de piedra, polvo y destellos de topacio
  S.pts(L.part,30,VV+K+`void main(){float s=TK+aSeed.x*.12;float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 o=vec3(cos(an)*.5,.15+aSeed.w*1.8,sin(an)*.5);vec3 v=normalize(vec3(o.x,.5,o.z))*(1.2+1.8*aSeed.y);
   vec3 p=vec3(TX,0.,0.)+o+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*(6.+5.*aSeed.y);put(p,.28+.14*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:STONE}));
  S.pts(L.part,14,VV+K+`void main(){float s=TK+aSeed.x*.15;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(TX+cos(an)*(.4+.8*(1.-exp(-t*3.))),.15+aSeed.w*.8+.3*t,sin(an)*(.4+.8*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.55+.25*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.05}));
  S.pts(L.part,10,VV+K+`void main(){float s=TI+.1+aSeed.x*(TK-TI);float life=.25;float age=(uT-s)/life;float an=aSeed.y*6.2832;
   vec3 p=vec3(TX+cos(an)*.55,.2+aSeed.z*1.8,sin(an)*.55);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.28+.1*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, ik=te-TK, gm=ss(0.02,TB,te)*(1-ss(TI-0.05,TI+0.12,te));
    gems.forEach((m,i)=>{m.position.copy(EY[i]);m.position.y+=0.04*Math.sin(te*9+i);m.visible=gm>0.001;
      m.scale.set(1,1.55,1).multiplyScalar(Math.max(back(gm)*(1+0.15*hitE(te-TB,8)),0.001));m.rotation.y=te*(i?-5:5);m.rotation.z=0.3*(i?-1:1);});
    gemMat.uniforms.uK.value=0.1+0.3*ss(TB-0.15,TB,te)*(0.7+0.3*Math.sin(te*40));
    spark.pose(ia,HP,1);
    ring.pose(ia,target.position.x,0,0.45,1);
    // coraza: avanza desde el impacto, brilla y se quiebra
    const pk=ss(TI,TP,te)*2.4, br=ss(TK,TE,te), on=te>=TI&&te<TE+0.05;
    for(const m of [body,head]){m.visible=on;const u=m.material.uniforms;u.uGrow.value=pk;u.uQ.value=br;u.uK.value=0.5*hitE(ia,3)+0.8*hitE(ik,6);}
    body.position.set(target.position.x,0.5,0); head.position.set(target.position.x+0.02,1.12,0.06);
    breakSpark.pose(ik,tmp.set(TX,1.1,0),1.1); ring2.pose(ik,TX,0,0.5,1.1);
    set(stain,ia>=0?-0.1+1.15*ss(TE,TF,te):0,ss(TI,TP,te));
    const fz=te>=TI?Math.min(cl(ia/0.12),1):0;
    target.position.x=TX+0.12*fz+0.03*Math.sin(te*70)*hitE(ik,8);
    o.em=0.25*hitE(ia,5); o.emc.copy(U.uC1.value); o.flash=te<TK?0.6:0.4;
    if(te<TB){o.g.set(-3.2,1.75,0);o.gs=0.8*gm;o.ga=0.15*gm;o.li=1.5*gm;}
    else if(te<TI){const k=cl((te-TB)/(TI-TB));o.g.set(-3.2+(HP.x+3.2)*k,1.75+(HP.y-1.75)*k,0);o.gs=0.9;o.ga=0.15;o.li=2;}
    else if(te<TK){o.g.copy(HP);o.gs=1.2;o.ga=0.25*hitE(ia,8);o.li=3*hitE(ia,5);}
    else{o.g.set(TX,1.0,0);o.gs=1.4;o.ga=0.2*hitE(ik,8);o.li=3*hitE(ik,5);}
    if(ik<0){o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.6;}else{o.ia=ik;o.c.set(TX,1.0,0);o.shake=0.6;o.dist=0.7;}
  };
}});

// =====================================================================
// 4 · GECKO (1 PA) — un glifo de pupila de gecko (iris ámbar, rendija que se cierra) se abre frente al ojo; el lanzador
//     cede vida: gotas rojas salen de su cuerpo (pierde 40 HP) y una onda de jade se abre por todo el campo con motas de
//     vida en arco hacia todas partes; tras la onda suben cruces de cura y jirones oscuros que se deshacen (limpieza a
//     todos los aliados). ti 0,42 s
// =====================================================================
defs.push({key:"sty_rjGecko",name:"Gecko (estilizado)",dur:1.4,ti:0.42,pal:P_GECKO,tier:1,stylized:true,
  phases:[["Mirada",0],["Rastreo",0.12],["Revelación",0.42],["Cura",0.68],["Fin",1.1]],
build(a){
  const L=a.L,TS=0.12,TI=0.42,TH=0.68,TE=1.1,TF=1.4,EP=V3(-3.3,1.72,0.15),RW=4.2;
  const pupil=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(`void main(){vec2 p=(vUv-.5)*2.;
   float alm=max(length(p-vec2(0.,-.42))-.98,length(p-vec2(0.,.42))-.98);if(alm>0.)discard;
   float slit=length(vec2(p.x*(2.6+7.*uP),p.y*1.02))-.74;
   vec3 iris=mix(vec3(.98,.6,.12),vec3(.62,.22,.03),smoothstep(.05,.85,length(p)));
   float rim=smoothstep(-.14,-.02,alm);vec3 c=mix(iris,styRampOf(uC2,.35),rim);
   float vein=smoothstep(.55,.75,styNoise(p*.3+.5).b)*(1.-rim);c=mix(c,vec3(.6,.3,.06),vein*.35);
   c=slit<0.?vec3(.05,.03,.04):c;float hl=step(length(p-vec2(-.3,.32)),.12);c=mix(c,vec3(1.,.98,.9),hl*.85);
   gl_FragColor=vec4(c,uA);}`,{},{mode:'matter',depthTest:false}));
  pupil.renderOrder=2; L.mesh.add(pupil);
  const wave=S.groundRing(L.decal,2.4), wave2=S.groundRing(L.decal,2.4);
  const sigil=groundPlane(2.6,CX,0.026,S.mat(GLYPH(`float sl=smoothstep(.1,0.,abs(p.x)*2.6)*step(abs(p.y),.32);m=max(m,sl);m=max(m,smoothstep(.07,0.,abs(r-.7))*.8);`),{},{mode:'energy'}));
  const blood=groundPlane(1.4,CX,0.022,S.mat(STAIN(BLOOD,.45),{},{mode:'matter'}));
  L.decal.add(sigil,blood);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const float TH=${f(TH)};const float CX=${f(CX)};const float RW=${f(RW)};const vec3 EP=${v3(EP)};`;
  // destellos de la mirada
  S.pts(L.part,6,VV+K+`void main(){float s=.03+aSeed.x*.12;float life=.2;float age=(uT-s)/life;
   vec3 p=EP+vec3(.1,0.,.12)+normalize(rnd()+.001)*(.25+.12*aSeed.z);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.22+.08*aSeed.w);}`,
   S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // vida cedida: gotas rojas que salen del cuerpo
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.12;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(.8+.6*aSeed.w),2.2+aSeed.y,sin(an)*(.8+.6*aSeed.w));vec3 p=vec3(CX,.9,0.)+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.x,v.y-16.*t);put(p,.17+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  // motas de vida de jade que salen en arco hacia todas partes
  S.pts(L.part,36,VV+K+`void main(){float s=TI+.04+aSeed.x*.14;float u=(uT-s)/.45;float an=aSeed.z*6.2832;float R=RW*(.55+.45*aSeed.w);
   float k=clamp(u,0.,1.);vec3 p=vec3(CX+cos(an)*R*k,1.1+sin(k*3.14159)*(1.+.6*aSeed.y)-1.*k,sin(an)*R*k*.85);
   vA=(u>0.&&u<1.)?1.:0.;vK=smoothstep(.8,1.,u);vR=uT*5.;put(p,.24+.1*aSeed.y);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // cura: hojas de jade que suben en la onda y jirones oscuros que se deshacen (limpieza)
  S.pts(L.part,30,VV+K+`void main(){float s=TH-.1+aSeed.x*.35;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float an=aSeed.z*6.2832;float R=RW*(.4+.6*aSeed.w);
   vec3 p=vec3(CX+cos(an)*R,.15+age*(1.2+.5*aSeed.y),sin(an)*R*.85);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=an+age*3.;
   put(p,.26+.1*aSeed.y);}`,S.MATTER_FS(C.leaf,{relief:3,col:'uC1',bias:.05}));
  S.pts(L.part,14,VV+K+`void main(){float s=TH+aSeed.x*.25;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;float R=RW*(.45+.55*aSeed.w);
   vec3 p=vec3(CX+cos(an)*R+sin(t*8.)*.15,.6+t*1.6,sin(an)*R*.85);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=t*3.;
   put(p,(.45+.2*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:DARK,bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH, gz=ss(0,0.06,te)*(1-ss(TI-0.06,TI+0.06,te));
    towardCam(pupil.position,EP,0.3); billboard(pupil); pupil.visible=gz>0.001;
    pupil.scale.setScalar(Math.max(0.6+0.4*back(gz),0.001)); set(pupil,ss(0.02,TI,te),gz);
    const give=ss(TI-0.03,TI+0.05,te)*(1-ss(TH,TH+0.25,te));
    caster.scale.set(1+0.03*give,1-0.07*give,1+0.03*give); caster.rotation.z=0.06*gz;
    glowOf(caster,RED,0.5*give);
    wave.pose(ia,CX,0,0.55,3.2); wave2.pose(ih,CX,0,0.5,2.6);
    set(sigil,-0.1+1.1*ss(TE-0.1,TF,te),ss(TI,TI+0.08,te));
    blood.visible=ia>=0; blood.scale.setScalar(0.5+0.5*e3(ia/0.25)); set(blood,ia>=0?-0.1+1.15*ss(TE-0.2,TF,te):0,1);
    if(te<TI){o.g.copy(EP);o.gs=0.6*gz;o.ga=0.12*gz;o.li=1.2*gz;}
    else{o.g.set(CX,0.9,0);o.gs=1.6;o.ga=0.18*hitE(ia,5);o.li=2.5*hitE(ia,4);}
    o.ia=ia;o.c.set(CX,0.9,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 5 · TRICKY (2 PA) — guiño pícaro (destello en el ojo); humo violeta envuelve al lanzador y al aliado y dos sellos de
//     rombo intercambian su sitio en arcos que se cruzan; del aliado se arrancan dos jirones oscuros (quita 2 estados)
//     y queda dentro de un escudo de rombos de arlequín violeta y turquesa que sube del suelo y tiembla. ti 0,95 s
// =====================================================================
const HARLEQ_FS=`uniform float uD;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));vec3 q=normalize(vP);float h=q.y;
 if(h>uP*2.1-1.05)discard;
 float an=atan(q.z,q.x)/6.2832;vec2 g=vec2(an*10.,h*3.2);vec2 r=vec2(g.x+g.y,g.x-g.y);float chk=mod(floor(r.x)+floor(r.y),2.);
 vec2 fp=fract(r);float ln=smoothstep(.09,0.,min(min(fp.x,1.-fp.x),min(fp.y,1.-fp.y)));
 float nz=styNoise(vUv*vec2(3.,1.5)+.2).r;if(styErode(nz,uD,.1)<.5)discard;
 float l=styLight(n,stySunV());vec3 c=styRampOf(mix(uC1,uC2,chk),clamp(.35+.35*l+.3*fr,0.,1.))*styTint(l);
 float front=smoothstep(.08,0.,abs(h-(uP*2.1-1.05)))*step(uP,.99);
 c=mix(c,vec3(1.,.95,.85),ln*.45+front*.6);
 gl_FragColor=vec4(c,(.3+.5*pow(fr,1.5)+ln*.45+front)*uA);}`;
defs.push({key:"sty_rjTricky",name:"Tricky (estilizado)",dur:2.2,ti:0.95,pal:P_TRICKY,tier:2,stylized:true,allies:1,zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Guiño",0],["Humo",0.3],["Intercambio",0.5],["Purificar",0.95],["Escudo",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TS=0.3,TX=0.5,TI=0.95,TP=1.0,TSH=1.2,TE=1.8,TF=2.2,A=ALLY_POS[0],AC=V3(A.x,0.95,A.z);
  const CP=V3(-3.7,2.25,0),AP=V3(A.x,2.25,A.z);
  const K1=V3((CP.x+AP.x)/2,3.3,(CP.z+AP.z)/2+0.7),K2=V3((CP.x+AP.x)/2,1.7,(CP.z+AP.z)/2-0.7);
  const wink=S.hitSpark(L.mesh,0.9,{seed:0.12,grow:0.05,life:0.22});
  const sigMat=()=>S.mat(`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float dia=q.x+q.y;
   float m=smoothstep(.1,.03,abs(dia-.78))+smoothstep(.06,.02,abs(dia-.52))*.7;
   float ch=smoothstep(.09,.02,abs(p.y-.12+abs(p.x)*.9))*step(abs(p.x),.36);float fill=smoothstep(.8,.7,dia)*.3;
   float a=max(max(m,ch),fill);if(a<.02)discard;gl_FragColor=vec4(styRamp(.3+.4*max(m,ch))*1.15,a*uA);}`,{},{mode:'energy'});
  const sigs=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),sigMat());L.mesh.add(m);return m;});
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1.05,40,28),S.mat(HARLEQ_FS,{uD:{value:0}},{mode:'matter',side:THREE.FrontSide}));
  shield.position.copy(AC); L.mesh.add(shield);
  const sRing=S.groundRing(L.decal,2.8), pop=S.hitSpark(L.mesh,1.0,{seed:0.58});
  const sealA=groundPlane(2.4,A.x,0.026,S.mat(GLYPH(`m=max(m,smoothstep(.09,0.,abs(abs(p.x)+abs(p.y)-.34))*.9);`),{},{mode:'energy'})); sealA.position.z=A.z;
  L.decal.add(sealA);
  const K=`const float TS=${f(TS)};const float TX=${f(TX)};const float TI=${f(TI)};const float TP=${f(TP)};const float TSH=${f(TSH)};
  const vec3 CP=${v3(CP)};const vec3 AP=${v3(AP)};const vec3 K1=${v3(K1)};const vec3 K2=${v3(K2)};const vec3 AC=${v3(AC)};
  vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}float kx(float t){return smoothstep(TX,TI,t);}`;
  // humo violeta en ambos
  S.pts(L.part,24,VV+K+`void main(){bool c0=aSeed.y<.5;vec3 P=c0?vec3(-3.7,1.,0.):vec3(AC.x,1.,AC.z);float s=TS+aSeed.x*.1;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P+normalize(rnd()+vec3(0.,.3,0.))*(.25+.7*aSeed.w)*(1.-exp(-t*5.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.6+.3*aSeed.w)*(.6+age*.6));}`,
   S.MATTER_FS(C.puff,{relief:4,col:SMOKEV,bias:.1}));
  // estela de cada sello
  S.pts(L.part,30,VV+K+`void main(){bool c0=aSeed.y<.5;float s=TX+aSeed.x*(TI-TX);float life=.3+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=(c0?qb(CP,K1,AP,kx(s)):qb(AP,K2,CP,kx(s)))+rnd()*.06+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=t*6.;put(p,(.16+.08*aSeed.w)*(1.-age*.4));}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // purificación: dos jirones oscuros suben en espiral y se deshacen
  S.pts(L.part,20,VV+K+`void main(){float k=aSeed.y<.5?0.:3.1416;float s=TP+aSeed.x*.25;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=k+t*7.;vec3 p=AC+vec3(cos(an)*(.5-.2*t),.2+t*2.3,sin(an)*(.5-.2*t))+rnd()*.06;
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.3,1.,age);vR=an;put(p,(.42+.15*aSeed.w)*(.7+age*.4));}`,
   S.MATTER_FS(C.puff,{relief:4,col:DARK,bias:.08}));
  a.pose=function(te,o){
    const ia=te-TI, ish=te-TSH, k=ss(TX,TI,te), env=ss(TSH,TSH+0.15,te)*(1-ss(TE,TF,te));
    wink.pose(te-0.05,EYE,0.8); caster.rotation.z=-0.1*ss(0.02,0.1,te)*(1-ss(0.2,0.32,te));
    sigs.forEach((m,i)=>{const s0=i?AP:CP,s1=i?CP:AP,kk=i?K2:K1;qbz(s0,kk,s1,k,tmp);
      const sink=ss(TI,TI+0.14,te);tmp.y-=0.45*sink;towardCam(m.position,tmp,0.15);billboard(m,(i?Math.PI:0)+Math.sin(te*6+i)*0.3);
      const al=ss(TS-0.05,TX,te)*(1-sink);m.visible=al>0.001;m.scale.setScalar(Math.max(0.7+0.4*Math.sin(Math.PI*k)-0.3*sink,0.001));m.material.uniforms.uA.value=al;});
    pop.pose(te-TP-0.35,tmp.set(AC.x,2.4,AC.z),0.8);
    shield.visible=env>0.001;
    const w=Math.sin(te*9)*hitE(ish,2)+0.3*Math.sin(te*5);
    shield.scale.set(1+0.04*w,1.1-0.04*w,1+0.04*w);
    set(shield,ss(TSH,TSH+0.3,te),env); shield.material.uniforms.uD.value=-0.1+1.1*ss(TE,TF,te);
    sRing.pose(ish,A.x,A.z,0.5,1);
    set(sealA,-0.1+1.1*ss(TE,TF,te),ss(TSH,TSH+0.1,te));
    glowOf(allies[0],U.uC1.value,0.4*hitE(ia,5)+0.15*env);
    glowOf(caster,U.uC1.value,0.3*hitE(ia,5));
    if(te<TS){o.g.copy(EYE);o.gs=0.5;o.ga=0.08;o.li=1;}
    else if(te<TI){qbz(CP,K1,AP,k,o.g);o.gs=1.0;o.ga=0.12;o.li=1.5;}
    else{o.g.copy(AC);o.g.y=1.3;o.gs=1.6;o.ga=0.2*hitE(ish,6)+0.05*env;o.li=2.5*hitE(ish,5)+0.8*env;}
    o.ia=ish>=0?ish:ia;o.c.copy(AC);o.shake=0;o.dist=0.35;o.flash=0;
  };
}});

VFX.module("Estilizado · Reptil · Ojos",defs);
})();

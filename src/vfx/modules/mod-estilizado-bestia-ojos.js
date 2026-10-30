// =====================================================================
// ESTILIZADO · BESTIA · OJOS (Hito 101) — las 6 cartas de ojos de Bestia hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_chubby, sty_peas, sty_puppyEye, sty_sobby, sty_sparky, sty_zeal). Mismos dur / ti /
// tiempos de fase que las originales. Semántica según PartCards.js (el módulo antiguo era de la versión anterior):
//   Chubby (sobre sí: daño a todos los enemigos) · Little Peas (daño + Frágil) · Puppy (sobre sí: +2 PA)
//   Sobby (daño) · Sparky (sobre sí: +2 PA) · Zeal (sobre sí: +2 PA y +1 PM)
// Motivo común: un destello de mirada (dos brillos almendrados de energía del color de la carta, sin globo ocular)
// delante de la cara, breve: fogonazo y estela. Identidad de Bestia: pelaje ámbar/naranja cálido, más el acento de cada carta.
// Las cartas sobre sí mismo se dibujan alrededor del lanzador (ondas radiales), así se leen igual en cualquier casilla.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CHUBBY=pal("Sty Bestia · Chubby",["#ffc46b","#b8501c"]);
const P_PEAS=pal("Sty Bestia · Guisantes",["#ffe08a","#c77a12"]);
const P_PUPPY=pal("Sty Bestia · Cachorro",["#ffd9a0","#e0703a"]);
const P_SOBBY=pal("Sty Bestia · Llanto",["#9fe8ff","#2a6fd0"]);
const P_SPARKY=pal("Sty Bestia · Estática",["#ffe9a8","#ff6a10"]);
const P_ZEAL=pal("Sty Bestia · Fervor",["#ffcf5a","#e0360f"]);

// color sRGB → vec3 lineal (los colores fijos de los shaders van en espacio lineal)
const L3=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const FUR_D=L3("#9a4a16"), FUR_L=L3("#f2a24a"), PAD=L3("#f3b9a6"), CLAW=L3("#f4ead2"), EARTH=L3("#8a6a48"), SOOT=L3("#3a2a1e"),
  GOLD=L3("#ffc23a"), GOLD_D=L3("#b46a08"), PEA_D=L3("#1d520a"), PEA_L=L3("#b9e64a"), TEAR_D=L3("#1d4fa8"), TEAR_L=L3("#8fe2ff"),
  OUTL=L3("#2a1608"), ARC=L3("#e8560a"), TEAR_M=L3("#2f86e8"), SCL=L3("#fbf4e8"), FIRE=L3("#e8480c"), EMBER=L3("#ffb43a");

const CX=-3.7, TX=3.4;
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), COL=new THREE.Color(), RIGHT=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
// punto local del lanzador → mundo (posición, giro en z y escala)
function localW(l,out,d=caster){const r=d.rotation.z,c=Math.cos(r),s=Math.sin(r),x=l.x*d.scale.x,y=l.y*d.scale.y;
  return out.set(d.position.x+x*c-y*s,d.position.y+x*s+y*c,d.position.z+l.z*d.scale.z);}
const FACE=V3(0.26,1.6,0);

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas y contorno oscuro de fresnel (se lee sobre la hierba)
const SOLID=(body,{hot='uC1',rim=.18,er=.05,ol=.45,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c*=mix(1.,${f(1-ol)},smoothstep(.72,.92,fr));
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// destello de mirada (Hito 101, dirección de arte: nada de globos oculares): dos brillos almendrados de energía, del color
// de la carta, con una estela horizontal; uQ estrecha la almendra (rendija), uK aviva el núcleo; extra añade rasgos
const GLINT=(col,extra='')=>`uniform float uQ;uniform float uK;
void main(){vec2 p=(vUv-.5)*2.;
 float w=.34*(1.-p.x*p.x)*(1.-uQ*.85);float alm=smoothstep(w+.05,w-.02,abs(p.y))*step(abs(p.x),1.);
 float core=smoothstep(w*.6,0.,abs(p.y))*smoothstep(.85,0.,abs(p.x+.1));
 float streak=exp(-abs(p.y)*28.)*smoothstep(1.,.15,abs(p.x))*(.55+.45*uK);
 float m=alm*.6+core*1.+streak*.9;${extra}
 if(m<.02)discard;vec3 c=styRampOf(${col},.4+.55*core)*(1.+.7*core*uK);
 gl_FragColor=vec4(c,min(m,1.)*uA);}`;
// dos destellos lado a lado en pantalla delante de la cara del lanzador
function mkEyes(L,fs,size=0.3){
  const ms=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size*1.9,size*0.95),S.mat(fs,{uQ:{value:0},uK:{value:0}},{mode:'energy',side:THREE.DoubleSide,depthTest:false}));
    m.renderOrder=3;L.mesh.add(m);return m;});
  return {ms,pose(a,lid,k,sc=1,sp=0.18,tilt=0){
    localW(FACE,tmp3);towardCam(tmp3,tmp3,0.45);RIGHT.set(1,0,0).applyQuaternion(VFX.camera.quaternion);
    ms.forEach((m,i)=>{const sd=i?1:-1;m.position.copy(tmp3).addScaledVector(RIGHT,sd*0.17*sc);billboard(m,sd*tilt);
      m.scale.set(sd*Math.max(sc,0.001),Math.max(sc,0.001),1);m.visible=a>0.002;m.material.uniforms.uA.value=a;
      m.material.uniforms.uQ.value=lid;m.material.uniforms.uK.value=k;});
  }};
}
// sello de pincel en el suelo (energía suave); uP = erosión
const GLYPH=(draw)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.6;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g),m*er*uA*.85);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6,lo=.12,hi=.3)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},${f(lo)}+${f(hi)}*n),m*er*uA*${f(alpha)});}`;
// huella de pata (partícula): almohadilla + 4 dedos, materia con borde oscuro y brillo en el centro
const PAW_P=(col,dark)=>S.PV+`void main(){vec2 q=(styPC()-.5)*2.3;
 float pad=length((q-vec2(0.,-.2))*vec2(1.,1.22))-.44;
 float d=min(pad,min(min(length(q-vec2(-.46,.2))-.17,length(q-vec2(-.16,.45))-.18),min(length(q-vec2(.16,.45))-.18,length(q-vec2(.46,.2))-.17)));
 float m=smoothstep(.05,-.02,d);if(m*vA<.05)discard;float rim=smoothstep(-.16,-.03,d);
 float er=styErode(styNoise(q*.4+vMix).r,vK*1.05-.05,.08);if(er<.5)discard;
 vec3 c=mix(${col}*1.15,${dark},rim);c+=${col}*.5*(1.-smoothstep(0.,.5,length(q-vec2(-.1,-.05))));
 gl_FragColor=vec4(c,m*vA);}`;
const defs=[];

// =====================================================================
// 1 · PUPPY (OJOS) — dos ojazos de cachorro, enormes y brillantes, piden con un parpadeo; sus destellos se vuelven dos
//     huellas doradas (+2 PA) que saltan sobre la cabeza y entran en el pecho. Anillo de miel y huella en el suelo.
//     Nivel 1, ti 0,42 s
// =====================================================================
defs.push({key:"sty_puppyEye",name:"Puppy (Ojos) (estilizado)",dur:1.4,ti:0.42,pal:P_PUPPY,tier:1,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Mirada",0],["Brillo",0.14],["Energía",0.42],["Calidez",0.55],["Fin",1.1]],
build(a){
  const L=a.L,TB=0.14,TI=0.42,TE=1.4;
  const eyes=mkEyes(L,GLINT(L3("#ffb85a"),`vec2 q=(p-vec2(-.35,.3))*vec2(.6,1.);float st=max(exp(-abs(q.x)*26.)*smoothstep(.4,0.,abs(q.y)),exp(-abs(q.y)*26.)*smoothstep(.4,0.,abs(q.x)))*uK;m+=st;`),0.3);
  // sello de pata en el suelo: materia color miel con contorno oscuro (no energía, para que no se lave)
  const feet=groundPlane(3.2,CX,0.026,S.mat(`void main(){vec2 q=(vUv-.5)*2.6;q=vec2(q.y,-q.x);
    float pad=length((q-vec2(0.,-.2))*vec2(1.,1.2))-.44;
    float d=min(pad,min(min(length(q-vec2(-.46,.2))-.17,length(q-vec2(-.16,.45))-.18),min(length(q-vec2(.16,.45))-.18,length(q-vec2(.46,.2))-.17)));
    float n=styNoise(vUv*.9+.5).r;float ring=smoothstep(.05,0.,abs(length(q)-1.05-.04*n))*.9;
    float m=max(smoothstep(.05,-.02,d),ring);if(m<.02)discard;float edge=max(smoothstep(-.14,-.02,d)*step(d,.02),ring*.6);
    float er=styErode(n,uP,.12);vec3 c=mix(styRampOf(${GOLD},.62+.2*n),styRampOf(${GOLD_D},.18),edge);
    gl_FragColor=vec4(c,m*er*uA*.95);}`,{},{mode:'matter'})); L.decal.add(feet);
  // aura de miel: anillo de volutas que sube alrededor del lanzador al llegar las huellas
  const auraK=`const float TA2=${f(TI+0.5)};`;
  S.pts(L.part,28,VV+auraK+`void main(){float s=TA2+aSeed.x*.25;float life=.55+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*1.5;float rad=.55+.35*age;vec3 p=vec3(-3.7+cos(an)*rad,.15+age*1.9,sin(an)*rad*.85);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28;put(p,(.42+.18*aSeed.w)*(1.-.4*age));}`,S.MATTER_FS(C.puff,{relief:4,col:GOLD,bias:-.02}));
  const ring=S.groundRing(L.decal,2.8), flash=S.hitSpark(L.mesh,1.0,{seed:0.44,toCam:0.8});
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const vec3 FC=vec3(${f(CX+0.3)},1.62,0.);`;
  // estrellitas de ternura alrededor de los ojos
  S.pts(L.part,14,VV+K+`void main(){float s=TB+aSeed.x*.45;float life=.32+aSeed.y*.15;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=FC+vec3(.2,0.,0.)+vec3(cos(an)*.55,sin(an)*.4+.1,sin(an)*.3)*(.8+.5*age);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=aSeed.w*6.28+age*2.;put(p,.22+.1*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // dos huellas doradas (+2 PA): saltan desde los ojos, giran sobre la cabeza y entran en el pecho
  S.pts(L.part,2,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s=TI+i*.07;float u=clamp((uT-s)/.55,0.,1.);
   vec3 a0=FC+vec3(.25+(i-.5)*.9,.1,(i-.5)*.3),a1=vec3(-3.65,1.05,0.);float an=u*4.2+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.7,1.5*sin(u*3.14159),sin(an)*.6)*sin(u*3.14159);
   vA=(uT>s&&u<.97)?1.:0.;vK=0.;vR=sin(uT*9.+i)*.4;put(p,1.9*(1.-.3*u*u));}`,PAW_P(GOLD,GOLD_D),{mode:'matter',depthTest:false});
  S.pts(L.part,20,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s0=TI+i*.07;float s=s0+aSeed.y*.5;float u=clamp((s-s0)/.55,0.,1.);
   float life=.22;float age=(uT-s)/life;vec3 a0=FC+vec3(.25,0.,(i-.5)*.3),a1=vec3(-3.65,1.05,0.);float an=u*4.2+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.55,1.1*sin(u*3.14159),sin(an)*.5)*sin(u*3.14159)+rnd()*.05;
   vA=(age>0.&&age<1.&&u<.97)?(1.-age):0.;vK=0.;vR=0.;put(p,.22);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // motas de miel que suben alrededor (calidez)
  S.pts(L.part,26,VV+K+`void main(){float s=TI+.12+aSeed.x*.7;float life=.6+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;vec3 p=vec3(-3.7+cos(an)*.65,.15+age*1.5,sin(an)*.55);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28;put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:3,col:GOLD,bias:-.02}));
  a.pose=function(te,o){
    const ia=te-TI, op=back(cl(te/TB)), fade=1-ss(0.75,1.05,te);
    const blink=Math.exp(-Math.pow((te-0.3)/0.035,2));
    eyes.pose(ss(0,0.05,te)*(1-ss(0.45,0.75,te)),blink*0.9,0.6+0.4*Math.sin(te*22),1.15*op*(1+0.05*Math.sin(te*14))+0.12*hitE(ia,8),0.2,-0.12);
    flash.pose(ia,tmp.set(CX+0.35,1.7,0),0.7);
    ring.pose(ia-0.5,CX,0,0.5,1);
    feet.visible=ia>=0.3; feet.scale.setScalar(0.6+0.4*e3((ia-0.3)/0.15)+0.06*Math.exp(-Math.max(ia-0.55,0)*8)*(ia>0.55?1:0)); set(feet,-0.1+1.15*ss(0.75,0.98,ia),1);
    caster.scale.y=1+0.05*Math.sin(Math.min(te,TI)*30)*ss(0,0.1,te)*(1-ss(TI-0.05,TI,te))-0.06*hitE(ia-0.5,10);
    caster.rotation.z=-0.05*ss(0,TB,te)*(1-ss(TI,TI+0.2,te));
    const pa=ss(TI+0.45,TI+0.55,te)*(1-ss(TI+0.6,TI+0.95,te)); glowOf(caster,COL.setRGB(1,0.72,0.3),0.7*pa);
    o.g.set(CX+0.35,1.6,0);o.gs=0.7+0.4*op;o.ga=0.08*op*fade;o.li=1.2+1.5*pa;
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.2;o.flash=0;
  };
}});

// =====================================================================
// 2 · ZEAL — los ojos se encienden con fervor (mirada afilada, llamas que salen hacia atrás), una espiral de fuego sube
//     alrededor del lanzador; dos orbes de brasa entran en el pecho (+2 PA) y un arco de brasas barre los pies (+1 PM).
//     Nivel 1, ti 0,42 s
// =====================================================================
defs.push({key:"sty_zeal",name:"Zeal (estilizado)",dur:1.3,ti:0.42,pal:P_ZEAL,tier:1,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Ojos en llamas",0],["Avivar",0.08],["Ímpetu",0.16],["Llamarada",0.36],["Brasas",0.55]],
build(a){
  const L=a.L,TA=0.08,TS=0.16,TI=0.42,TE=1.3;
  const eyes=mkEyes(L,GLINT(L3("#ff6a14"),``),0.3);
  const ring=S.groundRing(L.decal,2.6);
  const scorch=groundPlane(1.9,CX,0.024,S.mat(STAIN(SOOT,.5,.1,.22),{},{mode:'matter'})); L.decal.add(scorch);
  // arco de brasas a los pies (+1 PM): media luna de pincel que gira
  const swoosh=groundPlane(2.3,CX,0.03,S.mat(`uniform float uRot;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uRot;
    an=mod(an+3.14159,6.2832)-3.14159;float arc=smoothstep(.12,0.,abs(r-.8))*smoothstep(-1.9,0.,an)*smoothstep(.15,0.,an);
    float nz=styNoise(vec2(an*.6,r*2.)+.3).r;float m=arc*(.6+.6*nz);if(m<.03)discard;
    gl_FragColor=vec4(styRamp(.6+.4*nz),m*uA);}`,{uRot:{value:0}},{mode:'energy'})); L.decal.add(swoosh);
  const K=`const float TA=${f(TA)};const float TS=${f(TS)};const float TI=${f(TI)};const vec3 FC=vec3(${f(CX+0.3)},1.62,0.);`;
  // llamas que salen de los ojos hacia atrás
  S.pts(L.part,22,VV+K+`void main(){float s=TA+aSeed.x*.7;float life=.26+aSeed.y*.12;float age=(uT-s)/life;
   vec3 p=FC+vec3(.12,0.,(aSeed.z-.5)*.35)+vec3(-1.2*age,.45*age+.15*sin(age*9.+aSeed.w*6.),0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=1.3+aSeed.w*.4;put(p,(.6+.2*aSeed.w)*(1.-.45*age));}`,S.MATTER_FS(C.flame,{relief:3,col:FIRE,bias:-.16}));
  // espiral de fuego que sube alrededor del lanzador
  S.pts(L.part,40,VV+K+`void main(){float s=TS+aSeed.x*.38;float life=.42+aSeed.y*.15;float age=(uT-s)/life;
   float an=aSeed.x*18.+age*5.;float rad=.95-.4*age;vec3 p=vec3(-3.7+cos(an)*rad,.1+age*2.3,sin(an)*rad*.85);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=-.2+.4*aSeed.w;put(p,(.78+.25*aSeed.w)*(1.-.5*age));}`,S.MATTER_FS(C.flame,{relief:3,col:'mix('+FIRE+','+EMBER+',step(.6,vMix))',bias:-.14}));
  S.pts(L.part,14,VV+K+`void main(){float s=TS+.05+aSeed.x*.5;float life=.6+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.5,.4+age*2.,sin(an)*.4)+vec3(0.,0.,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28;put(p,(.55+.2*aSeed.w)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:SOOT,bias:.08}));
  // dos orbes de brasa (+2 PA)
  S.pts(L.part,2,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s=TI+i*.06;float u=clamp((uT-s)/.4,0.,1.);
   vec3 a0=vec3(-3.7+(i-.5)*1.1,2.5,.2),a1=vec3(-3.65,1.1,0.);float an=u*4.+i*3.14159;
   vec3 p=mix(a0,a1,u*u*(3.-2.*u))+vec3(cos(an)*.4,0.,sin(an)*.4)*sin(u*3.14159);
   vA=(uT>s&&u<.97)?1.:0.;vK=0.;vR=uT*6.;put(p,.6);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // brasas que saltan del arco de los pies (+1 PM)
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.12+aSeed.x*.4;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(s-TI-.12)/.4*6.2832*.9+1.2;vec3 p=vec3(-3.7+cos(an)*.92,.06,sin(an)*.92*.85)+vec3(0.,2.2*t-4.*t*t,0.)+rnd()*.08;
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=0.;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(0.7,0.95,te);
    eyes.pose(ss(0,0.05,te)*(1-ss(0.4,0.65,te)),0.45*ss(0,TA,te),0.7+0.3*Math.sin(te*40),1.0+0.18*hitE(te-TS,7),0.19,0.0);
    ring.pose(te-TS,CX,0,0.45,1);
    scorch.visible=te>TS; scorch.scale.setScalar(0.5+0.5*e3((te-TS)/0.2)); set(scorch,-0.1+1.15*ss(0.85,TE,te),1);
    const sw=ss(TI+0.1,TI+0.55,te); swoosh.visible=sw>0&&sw<1; swoosh.material.uniforms.uRot.value=sw*6.2832*0.95+1.2;
    swoosh.material.uniforms.uA.value=Math.sin(sw*Math.PI);
    caster.rotation.z=-0.1*ss(0,TS,te)+0.12*ss(TS,TS+0.08,te)-0.02*ss(TI,TI+0.3,te);
    caster.scale.y=1+0.06*hitE(te-TS,8)-0.05*hitE(ia,10);
    const pa=ss(TI+0.32,TI+0.42,te)*(1-ss(TI+0.45,TI+0.75,te)); glowOf(caster,U.uC2.value,0.35*ss(TA,TS,te)*(1-ss(TI,0.9,te))+0.55*pa);
    o.g.set(CX,1.2,0);o.gs=1+0.6*ss(TS,TI,te);o.ga=0.14*ss(TA,TS,te)*fade;o.li=2+2.5*ss(TS,TI,te)*fade;
    o.ia=ia;o.c.set(CX,1,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 3 · SPARKY — ojos eléctricos; arcos de estática naranja chisporrotean entre las orejas, se cargan en una bola sobre
//     la cabeza y caen como un rayo sobre el propio lanzador: el pelo se eriza en púas y dos chispas doradas lo rodean
//     y entran (+2 PA). Nivel 2, ti 0,74 s
// =====================================================================
defs.push({key:"sty_sparky",name:"Sparky (estilizado)",dur:2.2,ti:0.74,pal:P_SPARKY,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Estática",0],["Arcos",0.22],["Carga",0.62],["Descarga",0.74],["Fin",1.9]],
build(a){
  const L=a.L,TA=0.22,TC=0.62,TI=0.74,TE=2.2,BALL=V3(CX+0.05,3.05,0);
  const eyes=mkEyes(L,GLINT(L3("#ff8a1a"),`float zz=smoothstep(.06,0.,abs(p.y-.12*sign(sin(p.x*11.+uK*3.))))*step(abs(p.x),.9)*.5;m+=zz*uK;`),0.3);
  // bola de carga: disco de energía con arcos radiales
  const ball=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),S.mat(`uniform float uFr;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
    float core=smoothstep(.42,.2,r);float hs=floor(uFr);float arcs=0.;
    for(int i=0;i<5;i++){float fi=float(i);float a0=fract(sin((fi+hs)*12.9)*437.5)*6.2832;float d=abs(mod(an-a0+3.14159,6.2832)-3.14159);
     float wig=.05*sin(r*30.+fi*3.+hs*7.);arcs+=smoothstep(.07,0.,d-wig)*smoothstep(.95,.4,r);}
    float m=core+arcs*.8;if(m<.03)discard;vec3 c=mix(${L3('#b83a06')},${L3('#ffb02a')},smoothstep(.0,.9,core)*.8+arcs*.3);c=mix(c,${L3('#ffe08a')},smoothstep(.22,.05,r));gl_FragColor=vec4(c,min(m,1.)*uA);}`,{uFr:{value:0}},{mode:'matter',depthTest:false}));
  L.mesh.add(ball);
  const strike=S.hitSpark(L.mesh,1.8,{seed:0.71,toCam:0.7}), ring=S.groundRing(L.decal,3.0);
  const burn=groundPlane(2.0,CX,0.024,S.mat(GLYPH(`float zz=0.;for(int i=0;i<6;i++){float a0=float(i)*1.047+.3;float d=abs(mod(an-a0+3.14159,6.2832)-3.14159);
    zz=max(zz,smoothstep(.09,0.,d-.06*abs(sin(r*14.+float(i))))*smoothstep(.95,.2,r));}m=max(m*.35,zz);`),{},{mode:'energy'})); L.decal.add(burn);
  const K=`const float TA=${f(TA)};const float TC=${f(TC)};const float TI=${f(TI)};const vec3 BALL=${v3(BALL)};
  vec3 jag(vec3 A,vec3 B,float t,float seed,float amp){float fr=floor(uT*24.);vec3 d=B-A;vec3 n1=normalize(cross(d,vec3(0.,0.,1.))+vec3(0.,0.,.001));vec3 n2=vec3(0.,0.,1.);
    float k=floor(t*7.);float w=fract(t*7.);float h0=fract(sin((k+seed*13.+fr*7.1)*12.98)*4375.5)-.5,h1=fract(sin((k+1.+seed*13.+fr*7.1)*12.98)*4375.5)-.5;
    float g0=fract(sin((k+seed*7.+fr*3.3)*78.2)*4375.5)-.5,g1=fract(sin((k+1.+seed*7.+fr*3.3)*78.2)*4375.5)-.5;
    float env=sin(t*3.14159);return mix(A,B,t)+(n1*mix(h0,h1,w)+n2*mix(g0,g1,w)*.6)*amp*env;}`;
  // arcos entre las orejas y alrededor de la cabeza (24 puntos por arco, 4 arcos)
  S.pts(L.part,96,VV+K+`void main(){float bi=mod(float(gl_VertexID),4.);float t=fract(aSeed.x*4.);
   float fr=floor(uT*12.);float ph=fract(sin((bi+fr)*31.7)*91.3);
   vec3 A=vec3(-3.7+(bi-1.5)*.55,1.7+.4*sin(bi*2.1),-.6+1.2*fract(bi*.37)),B=vec3(-3.7-(bi-1.5)*.45,2.3+.3*cos(bi*1.7),.6-1.2*fract(bi*.53));
   if(uT>TC){A=mix(A,BALL,smoothstep(TC-.08,TC+.06,uT));}
   vec3 p=jag(A,B,t,bi,.8);float on=step(TA-.15,uT)*step(uT,TI+.02)*step(.25,ph);
   vA=on;vK=0.;vR=0.;put(p,.26+.08*sin(t*3.14159));}`,S.MATTER_FS(C.spark,{relief:2,col:ARC,bias:-.1}));
  // el rayo que cae de la bola al lanzador
  S.pts(L.part,48,VV+K+`void main(){float t=aSeed.x;vec3 A=BALL,B=vec3(-3.7,.15,0.);vec3 p=jag(A,B,t,3.,.7);
   float ia=uT-TI;vA=(ia>-.02&&ia<.22)?(1.-ia/.22):0.;vK=0.;vR=0.;put(p,.48*(1.-.4*t)+.1);}`,S.MATTER_FS(C.spark,{relief:2,col:ARC,bias:-.05}));
  // púas de pelo erizado: esquirlas naranjas que saltan del cuerpo
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 dir=normalize(vec3(cos(an),.4+aSeed.w*1.1,sin(an)*.8));vec3 p=vec3(-3.7,.95,0.)+dir*(.4+2.4*t*(1.-.9*t));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=atan(dir.y,dir.x)-1.5708;put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2',bias:.1}));
  // dos chispas doradas (+2 PA) que rodean y entran
  S.pts(L.part,2,VV+K+`void main(){float i=mod(float(gl_VertexID),2.);float s=TI+.22+i*.08;float u=clamp((uT-s)/.6,0.,1.);
   float an=u*9.+i*3.14159;float rad=.85*(1.-u*u);vec3 p=vec3(-3.7+cos(an)*rad,1.9-.8*u,sin(an)*rad*.8);
   vA=(uT>s&&u<.97)?1.:0.;vK=0.;vR=uT*8.;put(p,.5);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(1.2,1.6,te);
    const fl=0.5+0.5*Math.sin(te*70)*Math.sin(te*23);
    eyes.pose(ss(0,0.08,te)*(1-ss(0.85,1.15,te)),0.3,fl,1.0+0.12*hitE(ia,9),0.19,0.05);
    const bg=ss(TC-0.12,TI,te); ball.visible=bg>0&&ia<0.05; towardCam(ball.position,BALL,0.3); billboard(ball,te*3);
    ball.scale.setScalar(Math.max(0.2+0.8*bg+0.08*Math.sin(te*60),0.001)); ball.material.uniforms.uA.value=1; ball.material.uniforms.uFr.value=Math.floor(te*20);
    strike.pose(ia,tmp.set(CX,1.0,0),1.2);
    ring.pose(ia,CX,0,0.5,1);
    burn.visible=ia>=0; burn.scale.setScalar(0.6+0.4*e3(ia/0.12)); set(burn,-0.1+1.15*ss(0.6,1.35,ia),1);
    const jit=(ss(TA,TA+0.1,te)*(1-ss(TI,TI+0.05,te)))*0.025;
    caster.position.x=CX+jit*Math.sin(te*97); caster.position.z=jit*Math.cos(te*83);
    caster.scale.set(1+0.08*hitE(ia,7),1-0.1*hitE(ia,9)+0.05*hitE(ia-0.12,6),1+0.08*hitE(ia,7));
    const pa=ss(TI+0.7,TI+0.8,te)*(1-ss(TI+0.85,TI+1.15,te));
    glowOf(caster,U.uC2.value,0.25*ss(TA,TC,te)*(ia<0?fl:0)+0.9*hitE(ia,6)+0.5*pa);
    if(ia<0){o.g.copy(BALL);o.gs=0.6+0.9*bg;o.ga=0.1+0.2*bg;o.li=1.5+3*bg*fl;}
    else{o.g.set(CX,1,0);o.gs=1.4+2*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=6*Math.exp(-ia*6)+0.3;}
    o.ia=ia;o.c.set(CX,1,0);o.shake=ia>=0?0.5:0;o.dist=0.4;o.flash=ia>=0?0.4:0;
  };
}});

// =====================================================================
// 4 · CHUBBY — los ojos redondos y mofletudos fulminan; una pata espectral gigante (pelaje ámbar, almohadillas rosas,
//     garras de marfil) sube sobre el lanzador y cae de un pisotón delante de él: la onda de choque de tierra recorre
//     todo el campo (daño a todos los enemigos), con polvo y terrones en el frente de onda. Nivel 3, ti 0,98 s
// =====================================================================
const FUR_BODY=`float fz=styNoise(vUv*vec2(7.,4.)+.4).g;base=mix(${FUR_D},${FUR_L},.35+.5*fz);lb=-.06+.1*fz;`;
defs.push({key:"sty_chubby",name:"Chubby (estilizado)",dur:3.0,ti:0.98,pal:P_CHUBBY,tier:3,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Mirada",0],["Anticipación",0.45],["Zarpazo",0.82],["Impacto",0.98],["Onda",1.15],["Regreso",2.2]],
build(a){
  const L=a.L,TA=0.45,TZ=0.82,TI=0.98,TW=1.15,TR=2.2,TE=3.0,SL=V3(CX+1.55,0,0.15);
  const eyes=mkEyes(L,GLINT(L3("#ff9a2a"),``),0.3);
  // la pata: almohadilla, 4 dedos con garra
  const paw=new THREE.Group(); L.mesh.add(paw);
  const furMat=S.mat(SOLID(FUR_BODY,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const padMat=S.mat(SOLID(`base=${PAD};lb=.04;`,{hot:'uC1'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const clawMat=S.mat(SOLID(`base=${CLAW};lb=.1;`,{hot:'vec3(1.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const palm=new THREE.Mesh(new THREE.SphereGeometry(0.55,24,16),furMat); palm.scale.set(1,0.62,0.95); paw.add(palm);
  const wrist=new THREE.Mesh(new THREE.CapsuleGeometry(0.34,0.12,6,16),furMat); wrist.position.set(-0.12,0.42,-0.05); wrist.rotation.z=0.35; paw.add(wrist);
  const pad=new THREE.Mesh(new THREE.SphereGeometry(0.3,18,12),padMat); pad.scale.set(1,0.35,0.9); pad.position.set(0,-0.26,0); paw.add(pad);
  for(let i=0;i<4;i++){const ang=(i-1.5)*0.5;const g=new THREE.Group();g.position.set(0.5*Math.sin(ang)+0.12,-0.1,0.5*Math.cos(ang)-0.05);g.rotation.y=ang;paw.add(g);
    const toe=new THREE.Mesh(new THREE.SphereGeometry(0.24,14,10),furMat); toe.scale.set(0.95,0.85,1.05); g.add(toe);
    const tp=new THREE.Mesh(new THREE.SphereGeometry(0.13,12,8),padMat); tp.scale.set(1,0.4,1); tp.position.y=-0.17; g.add(tp);
    const cl_=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.42,10),clawMat); cl_.position.set(0,-0.12,0.24); cl_.rotation.x=Math.PI*0.62; g.add(cl_);}
  const spark=S.hitSpark(L.mesh,2.2,{seed:0.33,toCam:0.6}), ring=S.groundRing(L.decal,4.2), ring2=S.groundRing(L.decal,6.5);
  const shadow=S.contactShadow(L.decal,2.4);
  const print=groundPlane(2.6,SL.x,0.027,S.mat(`void main(){vec2 q=(vUv-.5)*2.6;q=vec2(q.y,-q.x);
    float pad=length((q-vec2(0.,-.2))*vec2(1.,1.2))-.44;
    float d=min(pad,min(min(length(q-vec2(-.46,.2))-.17,length(q-vec2(-.16,.45))-.18),min(length(q-vec2(.16,.45))-.18,length(q-vec2(.46,.2))-.17)));
    float n=styNoise(vUv*.9+.3).r;float m=smoothstep(.08,-.04,d+(n-.5)*.08);float crack=smoothstep(.03,0.,abs(fract(atan(q.y,q.x)*1.6+n*1.2)-.5)-.44)*smoothstep(1.3,.5,length(q))*step(0.,d);
    m=max(m*.85,crack*.6);if(m<.02)discard;float er=styErode(n,uP,.12);gl_FragColor=vec4(styRampOf(${SOOT},.15+.2*n),m*er*uA);}`,{},{mode:'matter'}));
  print.position.z=SL.z; L.decal.add(print);
  // onda de choque de tierra: anillo de materia que recorre el campo, con grietas
  const wave=groundPlane(16,SL.x,0.03,S.mat(`uniform float uR;void main(){vec2 p=vUv-.5;float r=length(p)*16.;float an=atan(p.y,p.x);
    float n=styNoise(vec2(an*2.,r*.25)+.1).r;float w=.35+.25*n;float d=abs(r-uR);float m=smoothstep(w,w*.3,d)*smoothstep(.3,1.2,uR);
    float lip=smoothstep(w*.3,w,d)*step(r,uR);if(m<.02)discard;
    vec3 c=mix(styRampOf(${EARTH},.55+.3*n),styRampOf(${EARTH},.15+.15*n),step(r,uR)*.0+lip);gl_FragColor=vec4(c,m*uA*.9);}`,{uR:{value:0}},{mode:'matter'}));
  wave.position.z=SL.z; L.decal.add(wave);
  const K=`const float TA=${f(TA)};const float TI=${f(TI)};const vec3 SL=${v3(SL)};const float SPD=9.;`;
  // terrones y polvo en el frente de onda
  S.pts(L.part,36,VV+K+`void main(){float an=aSeed.z*6.2832;float rd=.6+aSeed.x*7.;float s=TI+rd/SPD;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=SL+vec3(cos(an)*rd,0.,sin(an)*rd*.75)+vec3(cos(an)*.6*t,(2.+1.5*aSeed.w)*t-7.*t*t,sin(an)*.4*t);
   vA=(age>0.&&age<1.&&p.y>-.05)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.22+.14*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH,bias:-.05}));
  S.pts(L.part,30,VV+K+`void main(){float an=aSeed.z*6.2832;float rd=.4+aSeed.x*6.5;float s=TI+rd/SPD;float life=.7+aSeed.y*.35;float age=(uT-s)/life;
   vec3 p=SL+vec3(cos(an)*rd,.2+age*(.7+.5*aSeed.w),sin(an)*rd*.75);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+age;put(p,(.6+.35*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.02}));
  // polvo al subir la pata y motas de pelo
  S.pts(L.part,14,VV+K+`void main(){float s=TA+aSeed.x*.35;float life=.5+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=vec3(${f(CX+0.9)},1.2+2.*age,0.)+rnd()*vec3(.6,.3,.5);vA=(age>0.&&age<1.&&uT<TI)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28;put(p,.18);}`,S.MATTER_FS(C.leaf,{relief:2,col:'uC1',bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TI+0.1,TI+0.4,te);
    eyes.pose(ss(0,0.1,te)*fade,0.12*ss(TA,TZ,te),0.4,1.05+0.1*ss(0,TA,te)*Math.sin(te*12)*0.3,0.22,-0.1);
    // pata: aparece sobre el lanzador, sube y se tensa, cae de golpe, se queda y se hunde
    let y, sx=1, sy=1, rz=0;
    const app=back(ss(0.1,TA,te));
    if(te<TZ){const up=ss(TA,TZ,te);y=1.9+0.9*app+0.7*up;rz=-0.35*up;sy=1+0.1*up;sx=1-0.06*up;}
    else if(ia<0){const u=cl((te-TZ)/(TI-TZ));y=3.5-3.15*u*u;rz=-0.35*(1-u);sy=1+0.25*u;sx=1-0.1*u;}
    else{const sq=hitE(ia,7);y=0.35-0.12*sq-1.1*ss(TR-0.5,TR+0.3,te);sy=1-0.32*sq;sx=1+0.22*sq;}
    paw.position.set(ia<0?CX+0.9+(SL.x-CX-0.9)*ss(TZ,TI,te):SL.x,y,SL.z); paw.rotation.set(0.35*(1-ss(TZ,TI,te)),0,rz-0.15);
    const k=Math.max(1.25*app,0.001); paw.scale.set(k*sx,k*sy,k*sx);
    paw.visible=te>0.1&&te<TR+0.4;
    const q=-0.1+1.15*ss(TR-0.2,TR+0.4,te); furMat.uniforms.uQ.value=q; padMat.uniforms.uQ.value=q; clawMat.uniforms.uQ.value=q;
    furMat.uniforms.uK.value=0.25*ss(TZ,TI,te)*(1-ss(TI,TI+0.2,te)); clawMat.uniforms.uK.value=0.4*ss(TA,TZ,te)*(1-ss(TI,TI+0.1,te));
    shadow.pose(SL.x,SL.z,0.7+0.4*cl(1-(y-0.3)/3.5),te>0.1?0.55*cl(1.3-(y-0.3)/3.2)*(1-ss(TR,TR+0.4,te)):0);
    spark.pose(ia,tmp.set(SL.x+0.2,0.5,SL.z),1.1);
    ring.pose(ia,SL.x,SL.z,0.5,1); ring2.pose(ia-0.12,SL.x,SL.z,0.8,1);
    print.visible=ia>=0; print.scale.setScalar(0.7+0.3*e3(ia/0.1)); set(print,-0.1+1.15*ss(1.1,TE-0.9,ia),1);
    const wr=Math.max(ia,0)*9; wave.visible=ia>=0&&wr<8.5; wave.material.uniforms.uR.value=wr; wave.material.uniforms.uA.value=1-ss(5.5,8.5,wr);
    caster.rotation.z=0.12*ss(TA,TZ,te)-0.2*ss(TZ,TI,te)+0.08*ss(TI+0.2,TR,te);
    caster.scale.set(1+0.07*ss(0,TA,te)*(1-ss(TI,TI+0.3,te)),1-0.04*ss(0,TA,te)*(1-ss(TI,TI+0.3,te)),1);
    caster.position.y=0.05*hitE(ia,12);
    if(ia<0){o.g.copy(paw.position);o.gs=1+0.6*ss(TA,TI,te);o.ga=0.08+0.14*ss(TZ,TI,te);o.li=1.5+3*ss(TZ,TI,te);}
    else{o.g.set(SL.x,0.4,SL.z);o.gs=2+4*ia;o.ga=Math.exp(-ia*7)*0.5;o.li=7*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(SL.x,0.3,SL.z);o.shake=ia>=0?1.4:0;o.dist=1;o.flash=ia>=0?0.6:0;
  };
}});

// =====================================================================
// 5 · LITTLE PEAS — ojos que apuntan (pupilas diminutas con mira); tres guisantes macizos salen de los ojos con
//     fogonazo de pólvora, golpean al rival uno tras otro y rebotan al suelo. Frágil en el rival. Nivel 2, ti 0,58 s
// =====================================================================
const PEA_BODY=`float fz=styNoise(vUv*vec2(3.,2.)+.7).r;base=mix(${PEA_D},${PEA_L},.55+.3*fz);lb=.02;`;
defs.push({key:"sty_peas",name:"Little Peas (estilizado)",dur:2.1,ti:0.58,pal:P_PEAS,tier:2,stylized:true,zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Puntería",0],["Disparos",0.22],["Impactos",0.58],["Rebotes",0.8],["Fin",1.7]],
build(a){
  const L=a.L,TS=0.22,DT=0.07,TI=0.58,TE=2.1;
  const eyes=mkEyes(L,GLINT(L3("#d6f04a"),`m+=smoothstep(.05,0.,abs(length(p)-.62))*.35*uK;`),0.3);
  const peas=[], sparks=[];
  const peaMat=S.mat(SOLID(PEA_BODY,{hot:'vec3(.95,.62,.2)',ol:.78,rim:.55}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.15,20,14),peaMat);L.mesh.add(m);
    const s0=TS+i*DT, hit=V3(TX-0.32,1.15-0.18*i,(i-1)*0.14), land1=V3(TX-1.2-0.3*i,0.15,0.5-0.45*i), land2=V3(TX-1.9-0.45*i,0.15,0.75-0.7*i);
    peas.push({m,s0,ti:TI+i*DT,hit,land1,land2,muz:V3(CX+0.55,1.62,(i-1)*0.12)});
    sparks.push(S.hitSpark(L.mesh,0.95,{seed:0.2+i*0.23}));}
  const stain=groundPlane(1.4,TX,0.024,S.mat(STAIN(PEA_D,.4),{},{mode:'matter'})); L.decal.add(stain);
  const fragile=S.status(a,'fragile',[target],TI+0.08,TE);
  const K=`const float TS=${f(TS)};const float DT=${f(DT)};const float TI=${f(TI)};`;
  // fogonazos de pólvora en los ojos
  S.pts(L.part,18,VV+K+`void main(){float i=mod(float(gl_VertexID),3.);float s=TS+i*DT;float life=.16+aSeed.y*.08;float age=(uT-s)/life;
   vec3 p=vec3(${f(CX+0.6)},1.62,(i-1.)*.12)+normalize(rnd()+vec3(1.2,0.,0.))*(.12+.45*age);
   vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=aSeed.w*6.28;put(p,.3*(1.-.5*age));}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  S.pts(L.part,9,VV+K+`void main(){float i=mod(float(gl_VertexID),3.);float s=TS+i*DT+.02;float life=.45+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=vec3(${f(CX+0.65)},1.62,(i-1.)*.12)+vec3(.3*age,.35*age,0.)+rnd()*.12;
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.1*aSeed.w)*(.7+.7*age));}`,S.MATTER_FS(C.puff,{relief:4,col:L3("#c9b48a"),bias:.1}));
  // estela dorada de cada guisante
  S.pts(L.part,30,VV+K+`void main(){float i=mod(float(gl_VertexID),3.);float s0=TS+i*DT;float s=s0+fract(aSeed.x*3.)*(TI-TS);float life=.12;float age=(uT-s)/life;
   float u=(s-s0)/(TI-TS);vec3 A=vec3(${f(CX+0.55)},1.62,(i-1.)*.12),B=vec3(${f(TX-0.32)},1.15-.18*i,(i-1.)*.14);vec3 p=mix(A,B,u)+vec3(0.,.5*sin(u*3.14159),0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vR=0.;put(p,.2*(1.-age));}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // esquirlas verdes en cada golpe
  S.pts(L.part,24,VV+K+`void main(){float i=mod(float(gl_VertexID),3.);float s=TI+i*DT;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 h=vec3(${f(TX-0.32)},1.15-.18*i,(i-1.)*.14);vec3 v=normalize(rnd()+vec3(-.8,.4,0.))*(1.6+1.4*aSeed.z);vec3 p=h+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:PEA_L}));
  a.pose=function(te,o){
    const fade=1-ss(0.75,1.0,te), ia=te-TI;
    eyes.pose(ss(0,0.06,te)*(1-ss(0.5,0.75,te)),0.35*ss(0,TS,te)*(1-ss(TS+0.2,TS+0.3,te)),Math.sin(te*30)*0.5+0.5,1+0.08*hitE(te-TS,10)+0.08*hitE(te-TS-DT,10)+0.08*hitE(te-TS-2*DT,10),0.18,0);
    let rec=0;
    peas.forEach((p,i)=>{const m=p.m;const ib=te-p.ti;let vis=te>=p.s0;
      if(te<p.ti){const u=cl((te-p.s0)/(TI-TS));m.position.lerpVectors(p.muz,p.hit,u);m.position.y+=0.5*Math.sin(u*Math.PI);m.scale.setScalar(2.1);m.rotation.set(te*12,te*7,0);}
      else if(ib<0.32){const u=ib/0.32;m.position.lerpVectors(p.hit,p.land1,u);m.position.y=p.hit.y*(1-u)+0.15*u+1.0*Math.sin(u*Math.PI);
        const sq=hitE(ib,25);m.scale.set(2.1*(1+0.4*sq),2.1*(1-0.35*sq),2.1*(1+0.4*sq));m.rotation.set(te*10,0,-te*8);}
      else if(ib<0.62){const u=(ib-0.32)/0.3;m.position.lerpVectors(p.land1,p.land2,u);m.position.y=0.2+0.45*Math.sin(u*Math.PI);m.scale.setScalar(2.1);m.rotation.set(te*8,0,-te*6);}
      else{const u=cl((ib-0.62)/0.5);m.position.copy(p.land2);m.position.x-=0.3*e3(u);m.position.y=0.15;m.rotation.z=-(te*6);}
      m.visible=vis;sparks[i].pose(ib,p.hit,1);
      rec+=hitE(ib,9)*(1-Math.exp(-Math.max(ib,0)*30));});
    peaMat.uniforms.uQ.value=-0.1+1.15*ss(1.5,TE-0.1,te); peaMat.uniforms.uK.value=0.1;
    stain.visible=ia>=0; stain.scale.setScalar(0.5+0.5*e3(ia/0.3)); set(stain,-0.1+1.15*ss(1.0,1.5,ia),1);
    target.position.x=TX+0.12*rec; target.rotation.z=-0.12*rec; target.scale.set(1+0.04*rec,1-0.05*rec,1+0.04*rec);
    caster.rotation.z=0.04*hitE(te-TS,12)+0.04*hitE(te-TS-DT,12)+0.04*hitE(te-TS-2*DT,12);
    const fe=fragile.pose(te); S.statusGlow(o,[{kind:'fragile',env:fe}]);
    o.em=Math.max(o.em||0,0.4*rec); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(peas[0].m.position);o.gs=0.5;o.ga=0.08;o.li=1.2;o.ia=te-TS;o.c.set(CX+0.6,1.6,0);o.shake=0;o.dist=0.3;o.flash=0;}
    else{o.g.copy(peas[0].hit);o.gs=0.9+ia;o.ga=Math.exp(-ia*8)*0.3;o.li=3*Math.exp(-ia*5);o.ia=ia;o.c.copy(peas[0].hit);o.shake=0.5;o.dist=0.7;o.flash=0.2;}
  };
}});

// =====================================================================
// 6 · SOBBY — ojos llorosos que tiemblan; las lágrimas se desbordan y salen disparadas en dos chorros en arco hasta el
//     rival: corona de agua, salpicadura y charco azul. Nivel 1, ti 0,4 s
// =====================================================================
defs.push({key:"sty_sobby",name:"Sobby (estilizado)",dur:1.5,ti:0.4,pal:P_SOBBY,tier:1,stylized:true,zoneCaster:0.5,zoneTarget:1.1,
  phases:[["Llanto",0],["Chorro",0.18],["Impacto",0.4],["Fin",1.25]],
build(a){
  const L=a.L,TS=0.18,TI=0.4,TE=1.5,HP=V3(TX-0.3,1.25,0.05);
  const eyes=mkEyes(L,GLINT(L3("#5ab8ff"),`vec2 q=(p-vec2(.25,-.38))*vec2(.8,1.);float dr=smoothstep(.16,.08,length(q*vec2(1.,.7)));m+=dr*.7;`),0.3);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.57}), ring=S.groundRing(L.decal,2.2);
  const puddle=groundPlane(1.9,TX,0.025,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
    float n=styNoise(vUv*.8+.4).r*.6+styNoise(vUv*.5+.2).g*.4;float m=smoothstep(.8,.68,r+(n-.5)*.4);if(m<.01)discard;
    float er=styErode(n*.7+m*.3,uP,.12);float rim=smoothstep(.55,.75,r+(n-.5)*.4);
    vec3 c=mix(styRampOf(${TEAR_D},.35+.2*n),styRampOf(${TEAR_L},.75),rim*.7+smoothstep(.1,0.,abs(r-.3-.1*n))*.4);gl_FragColor=vec4(c,m*er*uA*.75);}`,{},{mode:'matter'}));
  L.decal.add(puddle);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 HP=${v3(HP)};const vec3 E0=vec3(${f(CX+0.5)},1.5,0.);`;
  // lágrimas que caen por las mejillas al empezar
  S.pts(L.part,8,VV+K+`void main(){float s=aSeed.x*.2;float life=.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=E0+vec3(-.05,-.05,(aSeed.z-.5)*.35)+vec3(.15*t,-3.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.1)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.2);}`,
   S.MATTER_FS(C.drop,{relief:4,col:TEAR_L,bias:.05}));
  // dos chorros de lágrimas en arco hasta el rival
  S.pts(L.part,28,VV+K+`void main(){float sd=step(.5,aSeed.z)*2.-1.;float s=TS+aSeed.x*(TI-TS)*1.1;float u=clamp((uT-s)/(TI-TS)*1.25,0.,1.);
   vec3 A=E0+vec3(.05,.08,sd*.12);vec3 p=mix(A,HP+vec3(0.,0.,sd*.08),u)+vec3(0.,1.1*sin(u*3.14159),sd*.55*sin(u*3.14159))+rnd()*.05;
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;
   vec3 d=vec3((HP.x-A.x),1.1*3.14159*cos(u*3.14159),0.);vR=atan(d.y,d.x)+1.5708;put(p,.42+.12*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAR_M,bias:.08}));
  // corona de agua y gotas al impacto
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+aSeed.w),2.4+1.6*aSeed.y,sin(an)*(1.+aSeed.w))*.9;vec3 p=HP+vec3(-.1,-.1,0.)+v*t+vec3(0.,-9.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.y-18.*t,length(v.xz))*-1.+1.5708;put(p,.32+.12*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:TEAR_M,bias:.1}));
  S.pts(L.part,10,VV+K+`void main(){float s=TI+.02+aSeed.x*.08;float life=.45+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=HP+rnd()*vec3(.25,.3,.25)+vec3(0.,.3*age,0.);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28;put(p,(.45+.2*aSeed.w)*(.6+.8*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:L3("#cfefff"),bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(0.6,0.85,te);
    eyes.pose(ss(0,0.06,te)*(1-ss(0.5,0.75,te)),0.1+0.08*Math.sin(te*40),0.6,1.05+0.04*Math.sin(te*50)*(1-ss(TS,TI,te)),0.2,0.1);
    spark.pose(ia,HP,0.9); ring.pose(ia,TX,0,0.42,0.9);
    puddle.visible=ia>=0; puddle.scale.setScalar(0.4+0.6*e3(ia/0.25)); set(puddle,-0.1+1.15*ss(0.6,1.05,ia),1);
    caster.rotation.z=0.03*Math.sin(te*38)*(1-ss(TS,TI,te))+0.06*ss(TS,TS+0.1,te)*(1-ss(TI,TI+0.3,te));
    caster.position.y=0.03*Math.abs(Math.sin(te*19))*(1-ss(TS,TI,te));
    const h=hitE(ia,9);
    target.position.x=TX+0.18*h*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.16*h*Math.cos(ia*16); target.scale.set(1+0.05*h,1-0.06*h,1+0.05*h);
    o.em=0.35*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(CX+0.4,1.6,0);o.gs=0.6;o.ga=0.06;o.li=1;o.ia=te-TS;o.c.set(CX+0.5,1.5,0);o.shake=0;o.dist=0.2;o.flash=0;}
    else{o.g.copy(HP);o.gs=0.9+1.5*ia;o.ga=Math.exp(-ia*8)*0.3;o.li=3*Math.exp(-ia*5);o.ia=ia;o.c.copy(HP);o.shake=0.4;o.dist=0.6;o.flash=0.2;}
  };
}});

VFX.module("Estilizado · Bestia · Ojos",defs);
})();

// =====================================================================
// ESTILIZADO · SAPIDAE · COMANDANTE DE SOMBRERO (Hito 95) — las 6 habilidades de la clase con efecto propio y el
// pulso y la rotura de su gólem (Gólem Sombrero). Kit vfx-stylized.js; mismo estilo que el piloto (Hito 99).
// Claves: sty_<id de la habilidad> (el puente las usa con el estilo nuevo encendido) · golem_pulse_hat · golem_break_hat.
// Identidad: vino #A83A44: sombreros de ala ancha, órdenes que se repiten, banderines y cintas de viento; «guiaban el combate sin darle órdenes».
// Lanzador = Sapidae: mano ≈ (-3.35,1.15,0.25), cabeza ≈ (-3.7,1.6,0). Los efectos de gólem se lanzan sobre el propio gólem
// (en reposo donde está el lanzador del laboratorio, -3.7).
// Piezas propias: sombrero sólido de fieltro con cinta dorada (makeHat, se disuelve con uEr), cinta de viento en hélice
// (RIBBON_FS), orbe de PA azul (ORB_FS, color semántico fijo), chevrones de celeridad y cúpula de escudo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,enemies,ENEMY_POS,helixGeo}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Comandante",["#f29a92","#7e2433"]);
const PAL="Comandante";
const HAND=V3(-3.35,1.15,0.25);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const TILE=1.93;                         // una casilla en unidades del laboratorio
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.6,.48,.34)";
const GOLD="vec3(.95,.72,.3)";
const FELT="mix(uC2,uC1,.1)";
const defs=[];

// ---------- piezas propias ----------
// fieltro/cinta del sombrero: sólido con luz en 3 bandas; se disuelve desde el ruido (uEr) con borde caliente
const HAT_FS=col=>`uniform float uEr;void main(){
 float nz=styNoise(vP.xz*.9+vec2(vP.y*.7,.13)).r;if(nz<uEr)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec3 c=styRampOf(${col},.15+.52*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.16*smoothstep(.62,.7,fr)*step(.5,l);
 c=mix(styRamp(.9)*1.25,c,smoothstep(uEr,uEr+.06,nz));
 gl_FragColor=vec4(c,1.);}`;
function makeHat(parent){
  const uEr={value:-0.1};
  const g=new THREE.Group();
  const felt=S.mat(HAT_FS(FELT),{uEr},{mode:'solid',side:THREE.DoubleSide});
  const band=S.mat(HAT_FS(GOLD),{uEr},{mode:'solid',side:THREE.DoubleSide});
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.78,0.82,0.05,40),felt);
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(0.29,0.37,0.46,32),felt); crown.position.y=0.26;
  const b=new THREE.Mesh(new THREE.CylinderGeometry(0.378,0.385,0.1,32,1,true),band); b.position.y=0.09;
  g.add(brim,crown,b); parent.add(g);
  return {g,uEr,setEr(v){uEr.value=v;}};
}
// cinta de viento en hélice: tramo visible [cabeza − largo, cabeza] (uDir = 1) o [cabeza, cabeza + largo] (uDir = −1)
const RIBBON_FS=`uniform float uHead;uniform float uLen;uniform float uDir;void main(){float u=vUv.x;float v=vUv.y;
 float d=(uHead-u)*uDir;if(d<0.||d>uLen)discard;float k=d/uLen;
 float w=1.-abs(v-.5)*2.;
 float er=styErode(w*.55+styNoise(vec2(u*3.,v*.5)+vec2(uT*.3,0.)).r*.45,k*.85,.12);if(er<.01)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float stripe=step(.5,fract(u*7.));
 vec3 c=styRampOf(mix(uC2,uC1,.3+.35*stripe),.35+.5*l)*styTint(l);
 gl_FragColor=vec4(c,er*uA);}`;
function ribbon(parent,geo){
  const u={uHead:{value:0},uLen:{value:0.35},uDir:{value:1}};
  const m=new THREE.Mesh(geo,S.mat(RIBBON_FS,u,{mode:'matter',side:THREE.DoubleSide})); parent.add(m);
  return {m,u,pose(head,len,a,dir=1){u.uHead.value=head;u.uLen.value=len;u.uDir.value=dir;m.material.uniforms.uA.value=a;m.visible=a>0.001;}};
}
// orbe de PA: azul fijo (semántico), fresnel con núcleo claro, energía
const ORB_FS=`void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));
 float sw=styNoise(vec2(atan(vP.z,vP.x)*.3+uT*.4,vP.y*.8+.5)).r;
 vec3 c=mix(vec3(.2,.45,1.),vec3(.62,.84,1.),smoothstep(.55,.1,fr))*1.15;
 gl_FragColor=vec4(c,(.3+.7*smoothstep(.2,.9,fr)+.2*sw)*uA);}`;
const makeOrb=(parent,r=0.22)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),S.mat(ORB_FS,{},{mode:'energy'}));parent.add(m);return m;};
// chispas azules de PA
const BLUE_PT_FS=S.PV+`void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float core=smoothstep(.22,.05,d);float rim=smoothstep(.5,.3,d);
 vec3 c=mix(vec3(.22,.48,1.),vec3(.7,.88,1.),core);gl_FragColor=vec4(c*1.15,(rim*.45+core)*vA);}`;
// chevrón hacia arriba (celeridad, PM) en dorado
const CHEVUP_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=abs(q.y-.08+abs(q.x)*.9);
 float a=smoothstep(.1,.055,d)*step(abs(q.x),.38)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${GOLD},.8),a);}`;
// chevrones que corren por el suelo hacia delante (+x)
const CHEVGROUND_FS=`void main(){float u=vUv.x;float av=abs(vUv.y-.5);
 float ch=fract(u*3.2+av*2.2-uT*2.6);
 float m=smoothstep(.2,.1,abs(ch-.5))*step(av,.36)*smoothstep(0.,.18,u)*smoothstep(1.,.7,u);if(m<.01)discard;
 float er=styErode(m*.5+styNoise(vUv*1.3).r*.5,uP,.12);
 gl_FragColor=vec4(styRampOf(${GOLD},.72+.28*m),m*er*uA*.9);}`;
// cúpula de escudo: fresnel con paralelos pintados; se disuelve con uEr
const DOME_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);float fr=pow(1.-abs(dot(n,normalize(vV))),2.);
 vec3 q=normalize(vP);float lines=smoothstep(.07,0.,abs(fract(q.y*4.5)-.5)-.4);
 float nz=styNoise(vec2(atan(q.z,q.x)*.5,q.y*.8)).r;float er=styErode(nz,uEr,.08);if(er<.01)discard;
 vec3 c=mix(styRamp(.55+.3*fr),styRampOf(${GOLD},.8),lines*.5)*.95;
 gl_FragColor=vec4(c,(fr*.9+lines*.4+.08)*er*uA);}`;
const makeDome=(parent,r=0.9)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,36,18,0,Math.PI*2,0,Math.PI/2),S.mat(DOME_FS,{uEr:{value:-0.1}},{mode:'energy',side:THREE.DoubleSide}));parent.add(m);return m;};
// polvo de tierra
const DUST=S.MATTER_FS(C.puff,{relief:4,bias:-.05,col:EARTH});
// jirones de fieltro y de cinta
const SHRED=S.MATTER_FS(C.leaf,{relief:3,bias:0,col:FELT});
const SHRED_GOLD=S.MATTER_FS(C.leaf,{relief:3,bias:-.05,col:GOLD});
const tierOf=(pa)=>pa<=1?1:pa===2?2:3;

// =====================================================================
// 1 · CABEZAZO DEL SOMBRERO (enemigo, línea 1–2; daño y −1 PA) — el sombrero sale girando de la cabeza del Sapidae,
//     vuela en arco dejando jirones, cabecea al rival con la copa y rebota; un orbe azul de PA se le escapa.
// =====================================================================
defs.push({key:"sty_shepard_hat_headbutt",name:"Cabezazo del Sombrero (estilizado)",dur:1.0,ti:0.42,pal:PAL,tier:3,stylized:true,
  phases:[["Saludo",0],["Vuelo",0.12],["Cabezazo",0.42],["Rebote",0.5]],
build(a){
  const L=a.L,T1=0.12,TI=0.42,S0=V3(-3.55,1.95,0.1),E0=V3(2.72,1.45,0),HIT=V3(3.05,1.35,0);
  const hat=makeHat(L.mesh), shadow=S.contactShadow(L.decal,1.5), spark=S.hitSpark(L.mesh,1.6), ring=S.groundRing(L.decal,2.4);
  const orb=makeOrb(L.mesh,0.2);
  const path=(t,out)=>{const k=ss(T1,TI,t);return out.lerpVectors(S0,E0,k).add(tmp2.set(0,0.9*4*k*(1-k),0));};
  const K=`const float T1=${f(T1)};const float TI=${f(TI)};const vec3 S0=${v3(S0)};const vec3 E0=${v3(E0)};const vec3 HIT=${v3(HIT)};
  vec3 path(float t){float k=smoothstep(T1,TI,t);return mix(S0,E0,k)+vec3(0.,.9*4.*k*(1.-k),0.);}`;
  // jirones de fieltro que se quedan atrás en el vuelo
  S.pts(L.part,22,VV+K+`void main(){float s=T1+aSeed.x*(TI-T1);float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=path(s)+(vec3(aSeed.z,aSeed.w,aSeed.y)-.5)*.35+vec3(-.25*t,-.5*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.y*6.28+t*6.;put(p,.12+.08*aSeed.w);}`,SHRED);
  // chispas azules de PA que salen con el orbe
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.05+aSeed.x*.08;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(3.35,1.75,0.)+normalize(vec3(aSeed.z-.3,.8,aSeed.w-.5))*(.2+1.2*t);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.09+.05*aSeed.w);}`,BLUE_PT_FS,{mode:'energy'});
  // polvo a los pies del rival
  S.pts(L.part,8,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.12,0.)+vec3(cos(an),0.,sin(an)*.6)*(.3+.6*(1.-exp(-t*5.)))+vec3(0.,t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.15*aSeed.y)*(.7+.5*age));}`,DUST);
  a.pose=function(te,o){
    const ia=te-TI, pop=ss(0.03,T1,te);
    caster.rotation.z=0.1*ss(0,T1,te)-0.2*ss(T1,T1+0.08,te)+0.1*ss(T1+0.15,TI,te);
    const g=hat.g;
    if(ia<0){path(te,g.position);g.rotation.set(0,te*18,-Math.PI*0.42*ss(T1,TI,te));}
    else{const b=ss(0,0.3,ia);g.position.copy(E0).add(tmp.set(-0.9*b,0.9*b-0.4*b*b,0.15*b));g.rotation.set(0,TI*18+ia*6,-Math.PI*0.42*(1-b)+0.4*b);}
    g.scale.setScalar(Math.max(0.6*pop*(1+0.15*Math.sin(Math.PI*cl(te/T1))),0.001));
    hat.setEr(ia<0.22?-0.1:-0.1+1.15*ss(0.22,0.52,ia)); g.visible=pop>0.001&&ia<0.55;
    shadow.pose(g.position.x,0,0.7+0.3*cl(1-g.position.y/3),g.visible?0.8*pop*(1-ss(0.3,0.55,ia)):0);
    spark.pose(ia,HIT,1);
    ring.pose(ia,3.4,0,0.45);
    // orbe de PA: se escapa de la cabeza del rival hacia atrás y arriba
    const ok=cl((ia-0.04)/0.55); orb.visible=ia>0.04&&ok<1;
    orb.position.set(3.35+0.6*ok,1.75+0.9*ok-0.3*ok*ok,0); orb.scale.setScalar(Math.max((0.6+0.6*ss(0,0.12,ok*0.55))*(1-ok*0.6),0.001));
    orb.material.uniforms.uA.value=1-ss(0.6,1,ok);
    const hit=hitE(ia,7); target.position.x=3.4+0.18*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-hit*0.25*Math.cos(ia*15);
    if(ia<0){o.g.copy(g.position);o.gs=0.6*pop;o.ga=0.1*pop;o.li=0.8*pop;}
    else{o.g.copy(HIT);o.gs=0.9+1.5*ia;o.ga=Math.exp(-ia*14)*0.3;o.li=3.5*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(HIT);o.shake=1;o.dist=0.8;
  };
}});

// =====================================================================
// 2 · GÓLEM SOMBRERO (casilla vacía) — un gran sombrero cae girando del cielo entre dos cintas de viento; aterriza con
//     polvo y anillo, y se hunde y disuelve en la tierra mientras sale el gólem (~0,4 s después del impacto).
// =====================================================================
defs.push({key:"sty_shepard_hat_golem",name:"Gólem Sombrero (estilizado)",dur:1.35,ti:0.55,pal:PAL,tier:3,stylized:true,
  phases:[["Ráfaga",0],["Caída",0.05],["Aterrizaje",0.55],["Gólem",0.7]],
build(a){
  const L=a.L,TI=0.55,X=3.4,Y0=6.5;
  const hat=makeHat(L.mesh), shadow=S.contactShadow(L.decal,2.4), ring=S.groundRing(L.decal,3.6), spark=S.hitSpark(L.mesh,1.4,{seed:0.8});
  const hg=new THREE.Group(); hg.position.set(X,0.15,0); L.trail.add(hg);
  const geo=helixGeo(2.2,1.15,0.55,5.2,0.22,140);
  const rb=[0,1].map(i=>{const r=ribbon(hg,geo);r.m.rotation.y=i*Math.PI;return r;});
  const K=`const float TI=${f(TI)};const vec3 P=${v3(V3(X,0,0))};`;
  // anillo de polvo al aterrizar
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=P+vec3(cos(an),0.,sin(an))*(.6+1.2*(1.-exp(-t*4.)))+vec3(0.,.12+t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.2*aSeed.y)*(.7+.5*age));}`,DUST);
  // jirones de cinta que salen despedidos al aterrizar
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=P+vec3(cos(an),0.,sin(an))*(.5+1.6*t)+vec3(0.,.5+1.4*t-2.2*t*t,0.);p.y=max(p.y,.05);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=an+t*5.;put(p,.16+.08*aSeed.w);}`,SHRED_GOLD);
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-0.05)/(TI-0.05)), g=hat.g;
    caster.rotation.z=0.12*ss(0,0.15,te)-0.22*ss(0.15,0.25,te)+0.1*ss(0.3,TI,te);
    const sink=ia<0?0:0.55*ss(0.05,0.45,ia);
    g.position.set(X,ia<0?0.05+(Y0-0.05)*(1-k*k):0.05-sink,0);
    g.rotation.set(0.12*Math.sin(te*9)*(1-k),10*k-4*k*k,0.1*Math.cos(te*7)*(1-k));
    const land=ia>=0?1+0.18*Math.sin(Math.min(ia,0.2)/0.2*Math.PI)*(1-cl(ia/0.2)):1;
    g.scale.set(1.5*land,1.5*(ia>=0?1-0.12*Math.sin(Math.min(ia,0.15)/0.15*Math.PI):1),1.5*land);
    g.visible=te>0.04&&ia<0.6; hat.setEr(ia<0.12?-0.1:-0.1+1.15*ss(0.12,0.5,ia));
    shadow.pose(X,0,0.4+0.7*k,g.visible?0.9*k*(1-ss(0.2,0.5,ia)):0);
    // cintas: bajan con el sombrero (la cabeza sigue su altura)
    const head=ia<0?cl(1-k*k):0, fade=ia<0?ss(0,0.12,te):1-ss(0,0.25,ia);
    for(const r of rb)r.pose(head,0.32,fade,-1);
    hg.rotation.y=te*1.5;
    ring.pose(ia,X,0,0.55,1);
    spark.pose(ia,tmp.set(X,0.5,0),0.9);
    if(ia<0){o.g.set(X,g.position.y,0);o.gs=0.001;o.ga=0;o.li=0.6*k;}
    else{o.g.set(X,0.6,0);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*12)*0.25;o.li=3*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(X,0.5,0);o.shake=1;o.dist=1;
  };
}});

// =====================================================================
// 3 · TRADUCIR EL AVISO (aliado: +2 PM) — un hilo de jirones va de la mano al aliado; dos cintas de viento le rodean
//     los pies y unos chevrones dorados corren por el suelo hacia delante.
// =====================================================================
defs.push({key:"sty_shepard_translate_warning",name:"Traducir el Aviso (estilizado)",dur:1.05,ti:0.38,pal:PAL,tier:2,stylized:true,
  phases:[["Aviso",0],["Hilo",0.05],["Celeridad",0.38]],
build(a){
  const L=a.L,T0=0.05,TI=0.38,X=3.4;
  const fg=new THREE.Group(); fg.position.set(X,0.05,0); L.trail.add(fg);
  const geo=helixGeo(1.6,0.55,0.62,0.5,0.13,90);
  const rb=[0,1].map(i=>{const r=ribbon(fg,geo);r.m.rotation.y=i*Math.PI;return r;});
  const chev=groundPlane(2.6,X+1.45,0.03,S.mat(CHEVGROUND_FS,{},{mode:'energy'}),1.0); L.decal.add(chev);
  const ring=S.groundRing(L.decal,2.2);
  const K=`const float T0=${f(T0)};const float TI=${f(TI)};const vec3 HA=${v3(HAND)};const vec3 P=${v3(V3(X,0.35,0))};
  vec3 bez(float k){vec3 m=mix(HA,P,.5)+vec3(0.,1.4,0.);return mix(mix(HA,m,k),mix(m,P,k),k);}`;
  S.pts(L.part,24,VV+K+`void main(){float s=T0+aSeed.x*(TI-T0-.05);float life=.22+aSeed.y*.1;float t=uT-s;float k=clamp(t/life,0.,1.);
   vec3 p=bez(clamp((s-T0)/(TI-T0)+k*.35,0.,1.))+(vec3(aSeed.z,aSeed.w,aSeed.y)-.5)*.18;
   vA=(t>0.&&t<life*1.6)?1.:0.;vK=smoothstep(.6,1.6,t/life);vR=aSeed.y*6.28+t*8.;put(p,.12+.06*aSeed.w);}`,SHRED);
  // chevrones que suben por el cuerpo
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.35;float life=.4;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(X)},0.,0.)+vec3(cos(an)*.5,.2+age*1.3,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.24+.08*aSeed.w);}`,CHEVUP_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,T0+0.05,te)-0.18*ss(T0+0.05,T0+0.15,te)+0.08*ss(T0+0.2,TI,te);
    const hd=ss(-0.05,0.45,ia);
    for(const r of rb)r.pose(hd*1.25,0.45,ia>-0.05?1-ss(0.45,0.65,ia):0,1);
    fg.rotation.y=te*4;
    chev.visible=ia>=0; set(chev,ia>=0?-0.1+1.1*ss(0.35,0.65,ia):0,ss(0,0.1,ia));
    ring.pose(ia,X,0,0.45,0.9);
    o.em=0.25*ss(0,0.1,ia)*(1-ss(0.3,0.6,ia)); o.emc.setRGB(1,0.78,0.35);
    if(ia<0){o.g.copy(HAND);o.gs=0.4;o.ga=0.08;o.li=0.6;}
    else{o.g.set(X,0.5,0);o.gs=1;o.ga=Math.exp(-ia*10)*0.2;o.li=2.2*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(X,0.6,0);o.shake=0;o.dist=0.4;o.flash=0.3;
  };
}});

// =====================================================================
// 4 · ORDEN COMPARTIDA (Axie aliado: +1 PA y +15 % de daño) — tres ondas de orden viajan del Sapidae al aliado
//     (la orden «se repite»); sobre él aparece un orbe de PA que baja a su cabeza, y unas llamitas de ánimo suben.
// =====================================================================
const WAVE_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);if(er<.01)discard;
 gl_FragColor=vec4(mix(styRamp(.55+.35*s.g),styRampOf(${GOLD},.8),.45)*1.05,s.r*er*uA);}`;
defs.push({key:"sty_shepard_shared_order",name:"Orden Compartida (estilizado)",dur:1.15,ti:0.45,pal:PAL,tier:2,stylized:true,
  phases:[["Orden",0],["Ondas",0.05],["PA",0.45],["Ánimo",0.6]],
build(a){
  const L=a.L,TI=0.45,X=3.4,Y=1.3,ST=[0.05,0.14,0.23],FLY=0.24;
  const waves=ST.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5).rotateY(Math.PI/2),S.mat(WAVE_FS,{},{mode:'energy'}));L.mesh.add(m);return m;});
  const orb=makeOrb(L.mesh,0.22), ring=S.groundRing(L.decal,2.2);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9).rotateX(-Math.PI/2),S.mat(WAVE_FS,{},{mode:'energy'})); L.mesh.add(halo);
  const K=`const float TI=${f(TI)};const vec3 P=${v3(V3(X,0,0))};`;
  // ánimo: llamitas cálidas que suben por el aliado (+15 % de daño)
  S.pts(L.part,14,VV+K+`void main(){float s=TI+.12+aSeed.x*.4;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=P+vec3(cos(an)*.45,.15+age*1.1,sin(an)*.45);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;vK=smoothstep(.3,1.,age);vR=0.;put(p,(.26+.1*aSeed.w)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.05}),{mode:'energy'});
  S.pts(L.part,10,VV+K+`void main(){float s=TI+.02+aSeed.x*.05;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P+vec3(0.,2.3,0.)+normalize(vec3(aSeed.z-.5,aSeed.w-.3,aSeed.y-.5))*(.15+.9*t);
   vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.08+.05*aSeed.w);}`,BLUE_PT_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.14*ss(0,0.06,te)-0.2*ss(0.06,0.14,te)+0.08*ss(0.2,TI,te);
    waves.forEach((m,i)=>{const k=cl((te-ST[i])/FLY);m.visible=te>ST[i]&&k<1;m.position.set(-3.1+(X-0.6+3.1)*k,Y,0);
      m.scale.setScalar(0.55+0.45*k);set(m,0.05+0.6*ss(0.6,1,k),1-ss(0.75,1,k));});
    // orbe: aparece sobre la cabeza, flota y baja a ella
    const pop=ss(0,0.12,ia), dn=ss(0.32,0.6,ia); orb.visible=ia>=0&&dn<1;
    orb.position.set(X,2.3-0.75*dn+0.05*Math.sin(te*9),0); orb.scale.setScalar(Math.max(pop*(1+0.2*Math.sin(Math.PI*cl(ia/0.12)))*(1-0.5*dn),0.001));
    orb.material.uniforms.uA.value=1-ss(0.75,1,dn);
    halo.visible=ia>=0&&ia<0.4; halo.position.set(X,2.3,0); halo.scale.setScalar(0.6+0.8*ss(0,0.35,ia)); set(halo,0.1+0.8*ss(0.1,0.4,ia),1);
    ring.pose(ia,X,0,0.5,0.9);
    o.em=0.3*ss(0.3,0.6,ia)*(1-ss(0.6,0.7,ia+0.1)); o.emc.setRGB(1,0.6,0.4);
    if(ia<0){const k=cl((te-ST[0])/FLY);o.g.set(-3.1+6*k,Y,0);o.gs=0.5;o.ga=0.08;o.li=0.8;}
    else{o.g.set(X,2.2,0);o.gs=0.8;o.ga=Math.exp(-ia*9)*0.25;o.li=2.5*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(X,1.2,0);o.shake=0;o.dist=0.4;o.flash=0.3;
  };
}});

// =====================================================================
// 5 · RETIRADA GUIADA (aliado: +30 de escudo y se aleja 2 casillas) — un ala de sombrero baja sobre el aliado como
//     paraguas, una cúpula de escudo se cierra bajo ella y el polvo de la retirada sale de sus pies.
// =====================================================================
defs.push({key:"sty_shepard_guided_retreat",name:"Retirada Guiada (estilizado)",dur:1.15,ti:0.4,pal:PAL,tier:2,stylized:true,
  phases:[["Ala",0],["Escudo",0.4],["Retirada",0.5]],
build(a){
  const L=a.L,TI=0.4,X=3.4;
  const hat=makeHat(L.mesh), dome=makeDome(L.mesh,0.95), ring=S.groundRing(L.decal,2.4), shadow=S.contactShadow(L.decal,1.8);
  dome.position.set(X,0,0);
  const K=`const float TI=${f(TI)};const vec3 P=${v3(V3(X,0,0))};`;
  S.pts(L.part,16,VV+K+`void main(){float s=TI+.05+aSeed.x*.4;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P+vec3(-.2-.6*aSeed.z,.1,(aSeed.w-.5)*.8)+vec3(-.6*t,t*.35,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.26+.14*aSeed.y)*(.6+.7*age));}`,DUST);
  a.pose=function(te,o){
    const ia=te-TI, k=ss(0.03,TI,te), g=hat.g;
    caster.rotation.z=0.1*ss(0,0.1,te)-0.18*ss(0.1,0.2,te)+0.08*ss(0.25,TI,te);
    g.position.set(X-0.05,3.3-1.15*k,0); g.rotation.set(0.08*Math.sin(te*6),te*3,-0.28*k);
    g.scale.setScalar(Math.max(1.35*ss(0,0.12,te),0.001));
    g.visible=te>0.01&&ia<0.75; hat.setEr(ia<0.4?-0.1:-0.1+1.15*ss(0.4,0.72,ia));
    shadow.pose(X,0,1,g.visible?0.55*k*(1-ss(0.4,0.7,ia)):0);
    dome.visible=ia>=0&&ia<0.75; dome.scale.setScalar(0.6+0.4*ss(0,0.15,ia));
    dome.material.uniforms.uA.value=1; dome.material.uniforms.uEr.value=ia<0.35?-0.1:-0.1+1.1*ss(0.35,0.72,ia);
    ring.pose(ia,X,0,0.5,1);
    o.em=0.2*ss(0,0.1,ia)*(1-ss(0.3,0.6,ia)); o.emc.setRGB(1,0.7,0.6);
    if(ia<0){o.g.copy(g.position);o.gs=0.001;o.ga=0;o.li=0.5*k;}
    else{o.g.set(X,1,0);o.gs=1.2;o.ga=Math.exp(-ia*10)*0.2;o.li=2*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(X,1,0);o.shake=0;o.dist=0.4;o.flash=0.2;
  };
}});

// =====================================================================
// 6 · RELEVO (aliado o gólem: intercambio y +25 de escudo a los dos) — dos sombreros saltan de las cabezas, se cruzan
//     en arco por el aire y caen en la del otro; anillos y cúpulas de escudo en los dos extremos.
// =====================================================================
defs.push({key:"sty_shepard_relief",name:"Relevo (estilizado)",dur:1.2,ti:0.62,pal:PAL,tier:2,stylized:true,
  phases:[["Saludo",0],["Cruce",0.08],["Relevo",0.62],["Escudo",0.7]],
build(a){
  const L=a.L,T1=0.08,TI=0.62,A0=V3(-3.7,1.95,0),B0=V3(3.4,1.85,0);
  const hA=makeHat(L.mesh), hB=makeHat(L.mesh);
  const dA=makeDome(L.mesh,0.9), dB=makeDome(L.mesh,0.9); dA.position.set(A0.x,0,0); dB.position.set(B0.x,0,0);
  const rA=S.groundRing(L.decal,2.2), rB=S.groundRing(L.decal,2.2), sA=S.contactShadow(L.decal,1.2), sB=S.contactShadow(L.decal,1.2);
  const arc=(from,to,zs,t,out)=>{const k=ss(T1,TI,t);return out.lerpVectors(from,to,k).add(tmp2.set(0,1.4*4*k*(1-k),zs*Math.sin(Math.PI*k)));};
  const K=`const float T1=${f(T1)};const float TI=${f(TI)};const vec3 A0=${v3(A0)};const vec3 B0=${v3(B0)};
  vec3 arc(vec3 a,vec3 b,float zs,float t){float k=smoothstep(T1,TI,t);return mix(a,b,k)+vec3(0.,1.4*4.*k*(1.-k),zs*sin(3.14159*k));}`;
  S.pts(L.part,30,VV+K+`void main(){float wh=step(.5,aSeed.w);float s=T1+aSeed.x*(TI-T1);float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=(wh>.5?arc(A0,B0,.8,s):arc(B0,A0,-.8,s))+(vec3(aSeed.z,aSeed.y,aSeed.x)-.5)*.3+vec3(0.,-.4*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.y*6.28+t*6.;put(p,.11+.06*aSeed.z);}`,SHRED);
  a.pose=function(te,o){
    const ia=te-TI, pop=ss(0.02,T1,te);
    caster.rotation.z=0.1*ss(0,T1,te)-0.16*ss(T1,T1+0.1,te)+0.06*ss(T1+0.15,TI,te);
    const fall=ia<0?0:ss(0,0.18,ia);
    for(const [h,from,to,zs,sh] of [[hA,A0,B0,0.8,sA],[hB,B0,A0,-0.8,sB]]){
      const g=h.g; if(ia<0)arc(from,to,zs,te,g.position); else g.position.copy(to).add(tmp.set(0,0.12*(1-fall),0));
      g.rotation.set(0,te*14*(zs>0?1:-1),0.3*Math.sin(Math.PI*ss(T1,TI,te))*(zs>0?-1:1));
      g.scale.setScalar(Math.max(0.6*pop,0.001)); g.visible=pop>0.001&&ia<0.45;
      h.setEr(ia<0.15?-0.1:-0.1+1.15*ss(0.15,0.42,ia));
      sh.pose(g.position.x,g.position.z,0.8,g.visible?0.7*pop*(1-ss(0.15,0.42,ia)):0);
    }
    for(const [d,r,x] of [[dA,rA,A0.x],[dB,rB,B0.x]]){
      d.visible=ia>=0&&ia<0.58; d.scale.setScalar(0.55+0.45*ss(0,0.14,ia)); d.material.uniforms.uA.value=1;
      d.material.uniforms.uEr.value=ia<0.25?-0.1:-0.1+1.1*ss(0.25,0.56,ia); r.pose(ia,x,0,0.5,0.9);
    }
    o.em=0.2*ss(0,0.1,ia)*(1-ss(0.3,0.55,ia)); o.emc.setRGB(1,0.7,0.6);
    if(ia<0){arc(A0,B0,0.8,te,o.g);o.gs=0.001;o.ga=0;o.li=0.5;}
    else{o.g.set(B0.x,1,0);o.gs=1;o.ga=Math.exp(-ia*10)*0.2;o.li=2*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(B0.x,1,0);o.shake=0;o.dist=0.5;o.flash=0.25;
  };
}});

// =====================================================================
// 7 · PULSO DEL GÓLEM SOMBRERO (al final del turno: +1 PM a los aliados de al lado) — tres cintas bajan en espiral
//     desde el ala hasta el borde de la casilla vecina; chevrones dorados suben en las 4 casillas de al lado.
// =====================================================================
defs.push({key:"golem_pulse_hat",name:"Pulso · Gólem Sombrero (estilizado)",dur:0.95,ti:0.3,pal:PAL,tier:1,stylized:true,
  phases:[["Ala",0],["Remolino",0.1],["Celeridad",0.3]],
build(a){
  const L=a.L,TI=0.3,X=-3.7;
  const sg=new THREE.Group(); sg.position.set(X,1.65,0); sg.rotation.x=Math.PI; L.trail.add(sg);
  const geo=helixGeo(1.1,0.5,TILE*1.02,1.5,0.2,110);
  const rb=[0,1,2].map(i=>{const r=ribbon(sg,geo);r.m.rotation.y=i*2.094;return r;});
  const ring=S.groundRing(L.decal,TILE*2.4);
  const K=`const float TI=${f(TI)};const vec3 P=${v3(V3(X,0,0))};const float T=${f(TILE)};
  vec3 nb(float i){return i<.5?vec3(T,0.,0.):(i<1.5?vec3(-T,0.,0.):(i<2.5?vec3(0.,0.,T):vec3(0.,0.,-T)));}`;
  S.pts(L.part,16,VV+K+`void main(){float i=floor(aSeed.x*4.);float s=TI+aSeed.y*.25;float life=.42;float age=(uT-s)/life;
   vec3 p=P+nb(i)+vec3((aSeed.z-.5)*.6,.15+age*1.1,(aSeed.w-.5)*.6);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.26+.08*aSeed.w);}`,CHEVUP_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, hd=ss(0,0.55,te);
    for(const r of rb)r.pose(hd*1.3,0.4,1-ss(0.55,0.8,te),1);
    sg.rotation.y=-te*3;
    ring.pose(ia+0.05,X,0,0.55,1);
    if(ia<0){o.g.set(X,1.6,0);o.gs=0.4;o.ga=0.06;o.li=0.6;}
    else{o.g.set(X,0.5,0);o.gs=1.2;o.ga=Math.exp(-ia*10)*0.15;o.li=1.8*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(X,0.6,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}});

// =====================================================================
// 8 · ROTURA DEL GÓLEM SOMBRERO (+1 PA a los aliados de al lado) — el sombrero tiembla y se desgarra en jirones de
//     fieltro y cinta que caen planeando; destellos azules de PA en las 4 casillas vecinas.
// =====================================================================
defs.push({key:"golem_break_hat",name:"Rotura · Gólem Sombrero (estilizado)",dur:1.25,ti:0.22,pal:PAL,tier:2,stylized:true,
  phases:[["Grieta",0],["Desgarro",0.22],["Jirones",0.4]],
build(a){
  const L=a.L,TI=0.22,X=-3.7,HY=1.65;
  const hat=makeHat(L.mesh), spark=S.hitSpark(L.mesh,1.4,{seed:0.6});
  const orbs=[[TILE,0],[-TILE,0],[0,TILE],[0,-TILE]].map(([dx,dz])=>{const m=makeOrb(L.mesh,0.2);m.userData={dx,dz};return m;});
  const K=`const float TI=${f(TI)};const vec3 H=${v3(V3(X,HY,0))};const vec3 P=${v3(V3(X,0,0))};`;
  const SHVS=`void main(){float s=TI+aSeed.x*.05;float life=.85+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),.5+aSeed.w*.8,sin(an));
   vec3 p=H+d*1.8*(1.-exp(-t*3.))+vec3(sin(t*6.+aSeed.y*9.)*.25,-1.1*t*t,cos(t*5.+aSeed.x*7.)*.2);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=an+t*(4.+3.*aSeed.y);put(p,.2+.1*aSeed.w);}`;
  S.pts(L.part,18,VV+K+SHVS,SHRED);
  S.pts(L.part,8,VV+K+SHVS,SHRED_GOLD);
  S.pts(L.part,8,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=P+vec3(cos(an),0.,sin(an))*(.4+.8*(1.-exp(-t*4.)))+vec3(0.,.12+t*.4,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.36+.16*aSeed.y)*(.7+.5*age));}`,DUST);
  a.pose=function(te,o){
    const ia=te-TI, g=hat.g, sh=ia<0?ss(0,TI,te):0;
    g.position.set(X+0.04*Math.sin(te*70)*sh,HY,0.03*Math.cos(te*63)*sh); g.rotation.set(0.1*sh*Math.sin(te*40),te*2,0);
    g.scale.setScalar(Math.max(1.05*ss(0,0.06,te),0.001)); g.visible=ia<0.08; hat.setEr(ia<0?-0.1+0.25*sh:0.15+0.9*ss(0,0.07,ia));
    spark.pose(ia,tmp.set(X,HY,0),0.9);
    for(const m of orbs){const k=cl((ia-0.08)/0.5);m.visible=ia>0.08&&k<1;m.position.set(X+m.userData.dx,0.5+0.9*k,m.userData.dz);
      m.scale.setScalar(Math.max(ss(0,0.2,k)*(1-0.4*k),0.001));m.material.uniforms.uA.value=1-ss(0.6,1,k);}
    if(ia<0){o.g.set(X,HY,0);o.gs=0.5*sh;o.ga=0.1*sh;o.li=0.8*sh;}
    else{o.g.set(X,HY,0);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*12)*0.25;o.li=3*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(X,1,0);o.shake=0;o.dist=0.8;o.flash=0;
  };
}});

VFX.module("Estilizado · Sapidae · Comandante de Sombrero",defs);
})();

// =====================================================================
// ESTILIZADO · BESTIA · CUERNOS (Hito 101) — las 8 cartas de cuerno de Bestia rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_arco, sty_dual…); el puente las usa con el estilo nuevo encendido.
// Mismos dur / ti / fases (y variantes) que mod-bestia-cuernos.js, así que el daño llega igual. El concepto sigue la carta
// (PartCards.js): Dual Blade deja Frágil (antes sangrado), Pocky provoca desde el lanzador, Lump da PM y crítico.
// Identidad Bestia: pelaje ámbar / naranja cálido, cuernos de marfil dorado, polvo de tierra; cada carta con su acento.
// Los efectos «de cabeza» salen de las puntas de los cuernos (≈ −3,55, 2,0). Los cuerpos que viajan (cuerna de Arco,
// bumerán, Pocky) son mallas pequeñas escaladas en la pose: el puente las mueve enteras sin deformarlas.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam,taperTube,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas propias (nombres únicos)
VFX.palette("Sty Bestia · Arco",["#ffc955","#c8560f"]);
VFX.palette("Sty Bestia · Rubí",["#ff4458","#7a0a22"]);
VFX.palette("Sty Bestia · Imp",["#ff7a3a","#9c1420"]);
VFX.palette("Sty Bestia · Rama",["#ffb347","#c2410c"]);
VFX.palette("Sty Bestia · Carnero",["#ffd877","#c77a1a"]);
VFX.palette("Sty Bestia · Pocky",["#ff9a52","#b5381a"]);
VFX.palette("Sty Bestia · Bumerán",["#ffc25e","#b8611c"]);
VFX.palette("Sty Bestia · Vigor",["#ffb04a","#d2491a"]);

// colores fijos en espacio lineal (sRGB^2.2)
const EARTH="vec3(.6,.48,.34)";                 // polvo claro (como el piloto)
const WOOD="vec3(.2,.085,.03)";                 // madera
const DARKWOOD="vec3(.06,.025,.01)";
const IVORY="vec3(.86,.72,.48)";                // marfil cálido de los cuernos
const WOOL="vec3(.8,.62,.36)";                 // lana
const CHOCO="vec3(.075,.03,.012)";              // chocolate
const BISCUIT="vec3(.78,.5,.2)";                // galleta
const TAUNT="vec3(1.,.3,.16)";
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), XA=V3(1,0,0), UP=V3(0,1,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const out3=k=>1-Math.pow(1-cl(k),3);
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const HEADP=V3(-3.55,2.0,0);            // puntas de los cuernos
const TC=V3(3.15,1.15,0);               // pecho del objetivo
const ZONES={zoneCaster:0.6,zoneTarget:1.1};

// ---------- materiales del módulo ----------
// cuerno: marfil → oro a lo largo del tubo (uv.x), estrías anulares, luz en 3 bandas, brillo propio (uGl), erosión (uEr)
const HORN_FS=`uniform float uGl;uniform float uEr;uniform vec3 uCa;uniform vec3 uCb;uniform float uRid;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float u=vUv.x;if(u>uP)discard;
 float ridge=smoothstep(.3,.5,abs(fract(u*uRid)-.5));
 vec4 ns=styNoise(vec2(u*1.7,vUv.y*.6));
 if(uEr>0.&&ns.r*.65+.35*(1.-u)<uEr)discard;
 vec3 col=mix(uCb,uCa,smoothstep(0.,1.,u))*(1.-.28*ridge);
 vec3 c=styRampOf(col,.24+.56*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.22*smoothstep(.6,.7,fr)*step(.5,l);
 c+=uC1*uGl*(.5+.8*ridge);
 float head=smoothstep(.04,0.,abs(uP-u))*step(uP,.99);c+=uC1*head*1.2;
 gl_FragColor=vec4(c,1.);}`;
const hornMatOf=(ca,cb,rid=16)=>S.mat(HORN_FS,{uGl:{value:0},uEr:{value:0},uCa:{value:new THREE.Color(ca)},uCb:{value:new THREE.Color(cb)},uRid:{value:rid}},{mode:'solid',side:THREE.DoubleSide});
// madera iluminada con vetas a lo largo de x local, runas o grietas que brillan (uGl); erosión
const WOODX_FS=`uniform float uGl;uniform float uEr;uniform float uRune;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec4 ns=styNoise(vec2(vP.x*.9+.3,(vP.y+vP.z)*3.));float grain=smoothstep(.55,.7,ns.b);
 if(uEr>0.&&ns.r*.8+.2*ns.a<uEr)discard;
 vec3 col=mix(${WOOD},${DARKWOOD},grain*.7);
 vec3 c=styRampOf(col,.3+.55*l)*styTint(l);
 float rune=uRune*step(.8,fract(vP.x*9.+floor(vP.z*30.)*.37))*step(abs(vP.z),.035)*step(.02,vP.y);
 c+=uC1*(rune*2.2+uGl*(.3+grain));
 gl_FragColor=vec4(c,1.);}`;
// grieta radial en el suelo (materia); uP = crecimiento, uEr = erosión
const CRACK_FS=`uniform float uEr;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float k=fract(an/6.2832*7.+styNoise(vUv*.6).r*.7);float line=smoothstep(.1,.0,abs(k-.5)*(1.+2.5*r))*step(r,.95*uP+.05)*smoothstep(1.,.25,r);
 float n=styNoise(vUv*.9+.2).g;float pit=smoothstep(.36,.16,r+(n-.5)*.2)*uP;
 float m=max(line,pit*.85);if(m<.02)discard;
 float er=styErode(n*.6+m*.4,uEr,.12);
 gl_FragColor=vec4(mix(vec3(.01,.006,.003),vec3(.095,.051,.022),pit*n)*mix(vec3(1.),uShadeCol,.15),m*er*uA*.9);}`;
const crackDecal=(parent,size,x,z=0)=>{const m=groundPlane(size,x,0.026,S.mat(CRACK_FS,{uEr:{value:0}},{mode:'matter'}));m.position.z=z;parent.add(m);return m;};
const setCrack=(m,grow,er,a)=>{m.material.uniforms.uP.value=grow;m.material.uniforms.uEr.value=er;m.material.uniforms.uA.value=a;m.visible=a>0.001;};
// flecha hacia arriba (energía): mejora
const CHEVUP_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.16+abs(q.x)*.95);
 float m=smoothstep(.1,.055,d)*step(abs(q.x),.4);float a=m*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(mix(uC2,uC1,.3),.55+.45*smoothstep(.1,0.,d))*1.45,a);}`;
// estrella de 4 puntas (energía): crítico
const STAR4_FS=S.PV+`void main(){vec2 q=(styPC()-.5)*2.;float d=pow(abs(q.x),.5)+pow(abs(q.y),.5);
 float m=smoothstep(1.,.75,d);float core=smoothstep(.5,.2,d);float a=m*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRamp(.6+.4*m)*1.5+vec3(1.,.9,.7)*core*.6,a);}`;
// estela de energía a lo largo de +x (uv.x = 1 en la cabeza)
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.25+.75*u;float m=smoothstep(w,w*.4,v)*u*u;
 float n=styNoise(vec2(u*.7-uT*2.,vUv.y*.5)).b;float er=styErode(n*.5+.5*u,.2,.15);
 if(m*er<.01)discard;gl_FragColor=vec4(styRamp(.3+.45*u)*1.05,m*er*uA*.85);}`;
const streakMesh=(parent,w,mat)=>{const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0);const grp=new THREE.Group();
  const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat);b.rotation.x=Math.PI/2;grp.add(a,b);parent.add(grp);return grp;};
const poseStreak=(s,p0,p1,vis)=>{tmp2.copy(p1).sub(p0);const ln=tmp2.length();s.visible=vis&&ln>0.01;if(!s.visible)return;
  s.position.copy(p1);s.quaternion.setFromUnitVectors(XA,tmp2.normalize());s.scale.set(ln,1,1);};
// brillo radial suave (energía) para núcleos de carga
const GLOW_FS=`void main(){float d=length(vUv-.5)*2.;float m=pow(max(0.,1.-d),2.2);if(m<.01)discard;
 gl_FragColor=vec4(styRamp(.55+.45*m)*1.2,m*uA);}`;
// garra/corte en billboard: N surcos curvos que barren la diagonal (uP = barrido), con borde oscuro (uDk) o brasa
const CLAW_FS=(N,thick,dark)=>`uniform float uEr;
void main(){vec2 p=vUv;float u=p.x;float m=0.,core=0.;
 for(int i=0;i<${N};i++){float off=(float(i)-${f((N-1)/2)})*${f(0.17*thick)};
  float y=(p.y-.5-off)-.16*(1.-pow(2.*u-1.,2.));float w=(.016+.05*sin(3.14159*u))*${f(thick)};
  m=max(m,smoothstep(w*${dark?'1.7':'1.'},w*${dark?'1.1':'.4'},abs(y)));core=max(core,smoothstep(w*.5,0.,abs(y)));}
 float d=uP-u;float sweep=step(0.,d)*smoothstep(0.,.05,u)*smoothstep(1.,.9,u);
 float n=styNoise(vec2(u*1.3-uT*.6,p.y*.9)).r;
 float er=styErode(n*.5+m*.5,uEr+d*.35,.12);
 float a=m*sweep*er;if(a<.01)discard;
 ${dark?`gl_FragColor=vec4(vec3(.02,.004,.006),a*uA*.95);`:`gl_FragColor=vec4(styRamp(.45+.55*core)*(1.1+.7*core),a*uA);`}}`;
const defs=[];

// =====================================================================
// 1 · ARCO — el pelaje se eriza en llamas ámbar; una cuerna de carnero dorada se forma sobre los cuernos, baja al
//     suelo y carga en línea recta levantando polvo; embiste al rival con chispa, abanico de tierra y onda (nivel 2)
// =====================================================================
defs.push({key:"sty_arco",name:"Arco (estilizado)",dur:2.0,ti:0.62,tier:2,pal:"Sty Bestia · Arco",stylized:true,...ZONES,
  phases:[["Carga",0],["Embestida",0.35],["Impacto",0.62],["Onda",0.8],["Regreso",1.05]],
build(a){
  const L=a.L,TD=0.35,TI=0.62,P0=V3(-3.0,1.0,0),P1=V3(2.75,0.95,0),HIT=V3(3.0,1.0,0);
  const hm=hornMatOf("#f2a23a","#e0b77c",14);
  // cuerna: dos espirales de carnero (±z) en una malla pequeña (se mueve entera)
  const spirit=new THREE.Group(); L.mesh.add(spirit);
  for(const s of [-1,1]){const pts=[];for(let i=0;i<=30;i++){const t=i/30,th=Math.PI*0.5+t*Math.PI*1.6,r=0.34*(1-0.6*t);
      pts.push(V3(0.05-r*Math.cos(th)*0.9,0.12+r*Math.sin(th),s*(0.16+0.16*t)));}
    spirit.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),60,10,0.085,0.02),hm));}
  const brow=new THREE.Mesh(new THREE.SphereGeometry(0.16,14,10),hm); brow.scale.set(1.1,0.7,1.5); brow.position.set(0.1,0.12,0); spirit.add(brow);
  // proa de fuerza delante de la cuerna (energía), también pequeña
  const bow=new THREE.Mesh(new THREE.SphereGeometry(0.42,24,12,0,Math.PI),S.mat(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   float n=styNoise(vec2(vP.y*.8+uT*.2,vP.z*.8-uT*1.5)).b;float st=smoothstep(.45,.7,n);float m=fr*.7+st*.35;if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.45+.5*fr)*1.3,m*uA);}`,{},{mode:'energy',side:THREE.DoubleSide}));
  bow.rotation.y=-Math.PI/2; bow.position.set(0.22,0.1,0); bow.scale.set(0.5,0.9,0.85); spirit.add(bow);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),S.mat(GLOW_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(glow);
  const streak=streakMesh(L.trail,0.55,S.mat(STREAK_FS,{},{mode:'energy',side:THREE.DoubleSide}));
  const spark=S.hitSpark(L.mesh,2.2,{seed:0.41,toCam:0.5}), spark2=S.hitSpark(L.mesh,1.5,{seed:0.83,toCam:0.4});
  const ring=S.groundRing(L.decal,3.4), ring2=S.groundRing(L.decal,2.4), shadow=S.contactShadow(L.decal,1.2);
  const crack=crackDecal(L.decal,2.4,3.25);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
  vec3 rp(float t){float k=clamp((t-TD)/(TI-TD),0.,1.);return mix(P0,P1,k*k);}`;
  // carga: pelaje en llamas que sube alrededor del lanzador
  S.pts(L.part,26,VV+K+`void main(){float life=.32+aSeed.y*.18;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rad=.32+.18*r.y;vec3 p=vec3(-3.7+cos(an)*rad,.15+age*(1.3+.5*r.z),sin(an)*rad);
   vR=(r.y-.5)*.5;vK=smoothstep(.3,1.,age);vA=(uT<TI+.15?1.:0.)*smoothstep(0.,.15,uT);put(p,(.34+.16*r.z)*(1.-age*.4));}`,
   S.ENERGY_FS(C.flame,{gain:1.3}),{mode:'energy'});
  // polvo de rodada bajo la cuerna
  S.pts(L.part,24,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(rp(s).x,.1,(aSeed.z-.5)*.5)+vec3(-.6*t,.4*t+aSeed.w*.2*t,(aSeed.z-.5)*.6*t);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.14*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  // chispas doradas de la estela
  S.pts(L.part,20,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.22+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=rp(s)+vec3(-.2,0.,0.)+rnd()*.25+vec3(-.8*t,.3*t,0.);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  // impacto: abanico de tierra, esquirlas de marfil y polvo
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.12;float life=.65+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(aSeed.z*2.-1.)*.8;vec3 dir=vec3(cos(an),0.,sin(an));
   vec3 p=vec3(3.1,.1,0.)+dir*(1.+1.6*aSeed.w)*(1.-exp(-t*2.8))*.8+vec3(0.,(.25+.45*aSeed.y)*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=an+t;put(p,(.42+.22*aSeed.y)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.8,0.))*(2.+2.2*aSeed.z);vec3 p=${v3(HIT)}+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:IVORY}));
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(2.5+2.5*aSeed.z);vec3 p=${v3(HIT)}+v*t*(1.-.5*age);vR=atan(v.y,v.x);vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.16+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,TD,te);
    caster.position.x=-3.7-0.18*ss(0,TD,te)+0.5*ss(TD,TI,te)-0.32*ss(TI+0.2,1.3,te);
    caster.rotation.z=0.15*ss(0,TD,te)-0.45*ss(TD,TD+0.08,te)+0.3*ss(TI,TI+0.3,te);
    // cuerna: nace sobre los cuernos, baja y carga; al golpear estalla
    let pos;
    if(te<TD){pos=tmp.copy(HEADP).lerp(P0,ss(TD-0.12,TD,te));pos.y+=0.04*Math.sin(te*30);}
    else if(te<TI){const k=(te-TD)/(TI-TD);pos=tmp.copy(P0).lerp(P1,k*k);}
    else pos=tmp.copy(P1).addScaledVector(XA,0.25*out3(ia/0.1));
    spirit.position.copy(pos); spirit.visible=te>0.04&&ia<0.12;
    const sc=te<TD?back(form)*1.9:(ia<0?2.4:2.4*(1+1.2*cl(ia/0.12)));
    spirit.scale.setScalar(Math.max(sc,0.001)); spirit.rotation.set(0,0,te<TD?-0.15:-0.05);
    hm.uniforms.uP.value=te<TD?Math.min(form*1.3,1):1; hm.uniforms.uGl.value=0.1+0.3*ss(TD,TI,te)+(ia>=0?0.8:0);
    hm.uniforms.uEr.value=ia>=0?-0.1+1.2*cl(ia/0.12):0;
    bow.visible=te>=TD; bow.material.uniforms.uA.value=0.6*ss(TD,TD+0.1,te);
    towardCam(glow.position,pos,0.3); billboard(glow); glow.material.uniforms.uA.value=(te<TI?0.3*form:0);
    glow.scale.setScalar(0.8+0.6*ss(TD,TI,te));
    poseStreak(streak,tmp3.copy(P0).setY(0.95).lerp(pos,te<TI?Math.max(0,1-2.8/Math.max(pos.x-P0.x+0.01,0.01)):0),pos,te>TD&&ia<0.2);
    streak.children[0].material.uniforms.uA.value=ia>0?1-cl(ia/0.2):1;
    shadow.pose(pos.x,0,0.9+0.4*ss(TD,TI,te),te>=TD-0.1&&ia<0.1?0.8*ss(TD-0.1,TD+0.05,te):0);
    spark.pose(ia,HIT,1); spark2.pose(ia-0.05,tmp2.set(3.2,0.55,0.3),0.8);
    ring.pose(ia,3.2,0,0.5); ring2.pose(ia-0.12,3.2,0,0.45,0.8);
    setCrack(crack,out3(ia/0.15),-0.1+1.15*ss(TI+0.6,1.8,te),ia>=0?1:0);
    const hit=hitE(ia,4.5);
    target.position.x=3.4+hit*0.45*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.32*Math.cos(ia*13);
    if(te<TD){o.g.copy(HEADP);o.gs=0.9*form;o.ga=0.18*form;o.li=1.6*form;}
    else if(ia<0){o.g.copy(pos);o.gs=1.0;o.ga=0.12;o.li=1.8;}
    else{o.g.copy(HIT);o.gs=1.2+2*Math.min(ia,0.5);o.ga=0.3*Math.exp(-ia*10);o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HIT);o.shake=0.8;o.dist=0.8;o.flash=0.6;
  };
}});

// =====================================================================
// 2 · DUAL BLADE — dos tajos rubí en X (cada uno con borde oscuro y núcleo de brasa); destello que cierra la X;
//     jirones de aire y esquirlas carmesí; el rival queda Frágil (esquirlas que caen) (nivel 2)
// =====================================================================
defs.push({key:"sty_dual",name:"Dual Blade (estilizado)",dur:1.9,ti:0.46,tier:2,pal:"Sty Bestia · Rubí",stylized:true,zoneCaster:0.5,zoneTarget:1.2,
  phases:[["Acometida",0],["Corte I",0.22],["Corte II",0.38],["Fragilidad",0.62]],
build(a){
  const L=a.L,TA=0.2,T1=0.3,T2=0.46,CH=V3(3.25,1.15,0),SW=0.12;
  // cada tajo: capa oscura (materia) + capa de brasa (energía) de un solo surco ancho
  const SL=[0.8,-0.8].map((ang,i)=>{
    const dk=new THREE.Mesh(new THREE.PlaneGeometry(3.0,1.5),S.mat(CLAW_FS(1,2.2,true),{uEr:{value:0}},{mode:'matter',depthTest:false}));
    const en=new THREE.Mesh(new THREE.PlaneGeometry(3.0,1.5),S.mat(CLAW_FS(1,2.2,false),{uEr:{value:0}},{mode:'energy',depthTest:false}));
    L.trail.add(dk,en);return {dk,en,ang,ti:i?T2:T1};});
  const xflash=S.hitSpark(L.mesh,2.4,{seed:0.19,toCam:0.7,spin:0.78});
  const spark1=S.hitSpark(L.mesh,1.4,{seed:0.55,toCam:0.6});
  const ring=S.groundRing(L.decal,2.8);
  const frag=S.status(a,'fragile',[target],T2+0.08,1.85);
  const K=`const float T1=${f(T1)};const float T2=${f(T2)};const vec3 CH=${v3(CH)};`;
  // jirones del aire a lo largo de cada tajo (energía) y esquirlas rubí (materia)
  for(const [ti,ang] of [[T1,0.8],[T2,-0.8]]){
    S.pts(L.part,16,VV+K+`void main(){float s=${f(ti-SW)}+aSeed.x*${f(SW)};float life=.22+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     float l=(aSeed.x-.5)*2.;vec3 dl=vec3(cos(${f(ang)}),sin(${f(ang)}),0.);vec3 nl=vec3(-dl.y,dl.x,0.);
     vec3 p=CH+vec3(0.,0.,.5)+dl*l+(nl*(aSeed.w-.5)*1.8+dl*.5)*t*1.3;vR=atan(dl.y,dl.x);vK=age;
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.16+.08*aSeed.z)*(1.-age*.5));}`,S.ENERGY_FS(C.slash,{gain:1.3}),{mode:'energy'});
    S.pts(L.part,12,VV+K+`void main(){float s=${f(ti)}+aSeed.x*.04;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(.4,${ang>0?'-.3':'.5'},.3))*(1.6+1.8*aSeed.z);vec3 p=CH+v*t+vec3(0.,-6.*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,bias:-.05}));
  }
  a.pose=function(te,o){
    const ia=te-T2, i1=te-T1, last=te>=T2?T2:T1;
    caster.position.x=-3.7+0.45*ss(0,TA,te)-0.45*ss(0.9,1.5,te);
    caster.rotation.z=-0.3*ss(0,TA,te)+0.6*ss(T1-SW,T1,te)-0.6*ss(T2-SW,T2,te)+0.3*ss(T2+0.1,T2+0.5,te);
    for(const s of SL){const k=(te-(s.ti-SW))/SW, vis=k>=0&&te<s.ti+0.75;
      for(const m of [s.dk,s.en]){m.visible=vis;towardCam(m.position,CH,m===s.en?0.62:0.6);billboard(m,s.ang);
        m.scale.setScalar(1.05+0.1*cl(k-1));set(m,Math.min(k,1)*1.15,1);
        m.material.uniforms.uEr.value=-0.15+1.1*ss(s.ti+0.08,s.ti+0.7,te);}
      s.dk.material.uniforms.uA.value=0.85;}
    xflash.pose(ia,CH,1.1); spark1.pose(i1,CH,0.8); ring.pose(ia,3.35,0,0.45);
    const fe=frag.pose(te);
    const h1=hitE(i1,9)*(i1>=0?1:0), h2=hitE(ia,6)*(ia>=0?1:0);
    target.position.x=3.4+h1*0.1+h2*0.22; target.rotation.z=h1*0.14*Math.cos(i1*20)-h2*0.24*Math.cos(ia*14);
    S.statusGlow(o,[{kind:'fragile',env:fe}]);
    o.g.copy(CH);o.gs=1+1.2*cl(te-last);o.ga=te>=T1-0.03?0.3*Math.exp(-(te-last)*10):0;o.li=te>=T1?4*Math.exp(-(te-last)*5):0;
    o.ia=te-last;o.c.copy(CH);o.shake=last===T2?0.6:0.3;o.dist=last===T2?0.7:0.4;o.flash=0.5;
  };
}});

// =====================================================================
// 3 · IMP — salto y zarpazo de brasa carmesí con tres surcos (borde oscuro + núcleo ardiente) y surcos en el suelo;
//     Fury Form: garra demoníaca de cuatro surcos enorme, fuego negro en el lanzador con ojos rojos y en el rival
// =====================================================================
defs.push({key:"sty_imp",name:"Imp (estilizado)",dur:2.0,ti:0.55,tier:2,pal:"Sty Bestia · Imp",stylized:true,zoneCaster:0.5,zoneTarget:1.2,vlabel:"Forma",
  variants:[["normal","Normal"],["furia","Fury Form"]],v:"normal",
  phases:[["Salto",0],["Zarpazo",0.4],["Impacto",0.55],["Brasas",0.8]],
build(a){
  const L=a.L,TJ=0.4,TI=0.55,CH=V3(3.25,1.2,0),VG=variantGroups(a,["normal","furia"]);
  const mk=(g,N,th,w,h)=>{const dk=new THREE.Mesh(new THREE.PlaneGeometry(w,h),S.mat(CLAW_FS(N,th,true),{uEr:{value:0}},{mode:'matter',depthTest:false}));
    const en=new THREE.Mesh(new THREE.PlaneGeometry(w,h),S.mat(CLAW_FS(N,th,false),{uEr:{value:0}},{mode:'energy',depthTest:false}));g.add(dk,en);return [dk,en];};
  const clawN=mk(VG.normal.trail,3,1.15,2.6,1.8), clawF=mk(VG.furia.trail,4,1.45,4.0,2.9);
  const sparkN=S.hitSpark(VG.normal.mesh,1.9,{seed:0.33,toCam:0.6}), sparkF=S.hitSpark(VG.furia.mesh,2.6,{seed:0.67,toCam:0.7});
  const ringN=S.groundRing(VG.normal.decal,2.8), ringF=S.groundRing(VG.furia.decal,3.8);
  // surcos en el suelo
  const GASH=(N,thick)=>`uniform float uEr;void main(){vec2 p=vUv;float m=0.,c=0.;
   for(int i=0;i<${N};i++){float off=(float(i)-${f((N-1)/2)})*${f(0.13*thick)};float y=p.y-.5-off+(styNoise(vec2(p.x*.6,float(i)*.3)).r-.5)*.05;
    float w=.03*${f(thick)}*(1.-p.x*.6);m=max(m,smoothstep(w,w*.5,abs(y))*step(p.x,uP));c=max(c,smoothstep(w*.45,0.,abs(y))*step(p.x,uP));}
   if(m<.01)discard;float er=styErode(styNoise(p*.8).g*.6+m*.4,uEr,.1);
   gl_FragColor=vec4(mix(vec3(.02,.006,.004),styRamp(.7+.3*c)*1.3,c),m*er*uA);}`;
  const gN=groundPlane(2.8,3.7,0.022,S.mat(GASH(3,0.9),{uEr:{value:0}},{mode:'matter'}),1.3); gN.rotation.y=-0.35; VG.normal.decal.add(gN);
  const gF=groundPlane(3.8,3.8,0.022,S.mat(GASH(4,1.2),{uEr:{value:0}},{mode:'matter'}),1.8); gF.rotation.y=-0.35; VG.furia.decal.add(gF);
  // ojos rojos del demonio sobre el lanzador (furia)
  const eyes=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.2),S.mat(`void main(){vec2 p=vUv-.5;
   float e=smoothstep(.09,.04,length((abs(p)-vec2(.17,0.))*vec2(1.,2.)));if(e<.01)discard;
   gl_FragColor=vec4(styRamp(.75+.25*e)*2.,e*uA);}`,{},{mode:'energy',depthTest:false})); VG.furia.mesh.add(eyes);
  const K=`const float TJ=${f(TJ)};const float TI=${f(TI)};const vec3 CH=${v3(CH)};
  float cxj(float t){return t<TJ?-3.7+1.1*smoothstep(0.,1.,t/TJ):-2.6-1.1*smoothstep(.95,1.6,t);}`;
  // brasas del zarpazo (energía) y chispas
  S.pts(VG.normal.part,22,VV+K+`void main(){float s=TI+aSeed.x*.15;float life=.5+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.4,.5,0.));vec3 p=CH+d*(.25+1.*aSeed.z)*(1.-exp(-t*3.))+vec3(sin(t*5.+aSeed.w*6.)*.08,t*.7,0.);
   vR=(aSeed.w-.5)*.6;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.26+.12*aSeed.w)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.35}),{mode:'energy'});
  // furia: fuego negro (materia oscura) + lenguas carmesí (energía) en el lanzador y luego en el rival
  const fire=(g,cx,T0,T1,n,rad,h)=>{
    S.pts(g,n,VV+K+`void main(){float life=.4+aSeed.y*.25;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
     float an=r.x*6.2832;float rr2=${f(rad)}*(.7+.4*r.y);vec3 b=vec3(${cx},0.,0.);
     vec3 p=b+vec3(cos(an)*rr2,.1+age*(${f(h)}+.5*r.z),sin(an)*rr2);vR=(r.y-.5)*.5;vK=smoothstep(.25,1.,age);
     float on=smoothstep(${f(T0)},${f(T0+0.15)},uT)*(1.-smoothstep(${f(T1-0.3)},${f(T1)},uT));
     vA=on;put(p,(.62+.28*r.z)*(1.-age*.45));}`,S.MATTER_FS(C.flame,{relief:3,col:'vec3(.025,.008,.012)'}));
    S.pts(g,Math.round(n*0.7),VV+K+`void main(){float life=.32+aSeed.y*.2;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k)+7.);
     float an=r.x*6.2832;float rr2=${f(rad)}*(.85+.3*r.y);vec3 b=vec3(${cx},0.,0.);
     vec3 p=b+vec3(cos(an)*rr2,.15+age*(${f(h*0.8)}+.4*r.z),sin(an)*rr2);vR=(r.y-.5)*.5;vK=smoothstep(.3,1.,age);
     float on=smoothstep(${f(T0)},${f(T0+0.15)},uT)*(1.-smoothstep(${f(T1-0.3)},${f(T1)},uT));
     vA=on;put(p,(.44+.2*r.z)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.4}),{mode:'energy'});};
  fire(VG.furia.part,'cxj(uT)',0.0,1.9,34,0.5,1.9);
  fire(VG.furia.part,'3.4',TI,1.95,22,0.45,1.3);
  S.pts(VG.furia.part,26,VV+K+`void main(){float s=TI+aSeed.x*.25;float life=.6+aSeed.y*.55;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.6,0.));vec3 p=CH+d*(.4+1.4*aSeed.z)*(1.-exp(-t*2.5))+vec3(sin(t*4.+aSeed.w*6.)*.12,t*.9,0.);
   vR=0.;vK=age;vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.07*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  a.setVariant=v=>{if(!VG[v])v="normal";a.v=v;for(const k in VG)for(const l of VFX.LK)VG[k][l].visible=k===v;};
  const tp=V3(0,0,0), eyeP=V3(0,0,0);
  a.pose=function(te,o){
    const fury=a.v==="furia", ia=te-TI, jk=cl(te/TJ);
    const cx=te<TJ?-3.7+1.1*ss(0,1,jk):-2.6-1.1*ss(0.95,1.6,te);
    caster.position.set(cx,te<TJ?0.7*Math.sin(Math.PI*jk):0,0);
    caster.rotation.z=-0.25*ss(0,TJ,te)+0.55*ss(TJ,TI,te)-0.3*ss(TI+0.1,TI+0.5,te);
    const sw=cl((te-TJ)/(TI-TJ+0.06));
    const claw=fury?clawF:clawN, fin=ss(TJ-0.15,TJ+0.05,te);
    towardCam(tp,CH,0.7); if(fury)tp.addScaledVector(tmp2.set(-1,1.2,0).normalize(),(1-fin)*1.5);
    for(const m of claw){m.position.copy(tp);if(m===claw[1])m.position.addScaledVector(tmp2.copy(VFX.camera.position).sub(tp).normalize(),0.02);
      billboard(m,-0.55);m.visible=te>=TJ-0.1&&te<TI+0.8;set(m,sw*1.2,fin);m.material.uniforms.uEr.value=-0.15+1.1*ss(TI+0.12,TI+0.8,te);}
    claw[0].material.uniforms.uA.value=fin*0.9;
    (fury?sparkF:sparkN).pose(ia,CH,1);
    (fury?ringF:ringN).pose(ia,3.4,0,0.5);
    const g=fury?gF:gN; g.material.uniforms.uP.value=ss(TI,TI+0.2,te); g.material.uniforms.uA.value=ia>=0?1:0;
    g.material.uniforms.uEr.value=-0.1+1.15*ss(TI+0.6,1.95,te);
    const fe=ss(0,0.3,te)*(1-ss(1.45,1.9,te));
    towardCam(eyeP.set(cx+0.2,caster.position.y+1.62,0),eyeP,0.35); eyes.position.copy(eyeP); billboard(eyes); eyes.material.uniforms.uA.value=fe;
    const hit=hitE(ia,fury?4:5), kb=fury?0.4:0.24;
    target.position.x=3.4+hit*kb*(ia>=0?1:0); target.rotation.z=-hit*(fury?0.36:0.24)*Math.cos(ia*14)*(ia>=0?1:0);
    if(ia<0){o.g.set(cx+0.6,caster.position.y+1.1,0);o.gs=fury?1.1:0.7;o.ga=fury?0.2:0.12;o.li=fury?2.4:1.5;}
    else{o.g.copy(CH);o.gs=1.2+(fury?3:2)*Math.min(ia,0.5);o.ga=Math.exp(-ia*12)*(fury?0.45:0.32);o.li=(fury?7:5)*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(CH);o.shake=fury?1.0:0.5;o.dist=fury?1.0:0.6;o.flash=0.6;
  };
}});

// =====================================================================
// 4 · LITTLE BRANCH — de los cuernos brota una rama espinosa que crece en arco con lenguas de fuego, se clava en el
//     rival (impacto pesado: chispa, grieta, terrones, temblor) y arde desde la base en brasas; un hilo de chispas
//     por cada aliado vivo alimenta la punta (nivel 3)
// =====================================================================
const BRANCH={key:"sty_branch",name:"Little Branch (estilizado)",dur:3.0,ti:0.95,tier:3,pal:"Sty Bestia · Rama",stylized:true,...ZONES,vlabel:"Aliados vivos",
  variants:[["0","Ninguno"],["1","1 aliado"],["2","2 aliados"]],v:"2",allies:()=>+BRANCH.v,
  phases:[["Brote",0],["Crecimiento",0.3],["Impacto",0.95],["Fractura",1.15],["Combustión",1.5]],
build(a){
  const L=a.L,TG=0.3,TI=0.95,TB=1.5,TBE=2.6,G0=V3(-3.45,1.95,0),E=V3(3.0,1.15,0),K1=V3(-2.2,3.6,0.3),K2=V3(1.0,3.5,-0.3);
  const curve=new THREE.CubicBezierCurve3(G0,K1,K2,E);
  const grow=te=>{const k=cl((te-TG)/(TI-TG));return 1-Math.pow(1-k,1.7);};
  // corteza iluminada con grietas de brasa; uQ = frente de combustión (base → punta)
  const wood=new THREE.Mesh(taperTube(curve,140,12,0.34,0.11),S.mat(`uniform float uQ;uniform float uGl;
  void main(){float u=vUv.x;if(u>uP)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   vec4 ns=styNoise(vec2(u*6.,vUv.y*.8));float groove=smoothstep(.58,.72,ns.b);
   float ch=uQ-u+(ns.r-.5)*.12;if(ch>.1)discard;
   vec3 c=styRampOf(mix(vec3(.42,.2,.08),${WOOD},groove),.32+.58*l)*styTint(l);
   float crack=smoothstep(.62,.8,ns.g);float ember=smoothstep(-.1,.08,ch);
   c=mix(c,vec3(.03,.01,.005),ember*.7);
   c+=styRamp(.8)*(crack*(.25+1.*uGl)+ember*1.6+smoothstep(.04,.1,ch)*2.);
   float head=smoothstep(.03,0.,abs(uP-u))*step(uP,.99);c+=styRamp(.9)*head*1.5;
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:0},uGl:{value:0}},{mode:'solid'}));
  const tipM=S.mat(`uniform float uGl;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
   vec3 c=styRampOf(${WOOD},.3+.55*l)*styTint(l)+styRamp(.85)*uGl*(1.-vUv.y);gl_FragColor=vec4(c,1.);}`,{uGl:{value:0}},{mode:'solid'});
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.8,10),tipM);
  L.mesh.add(wood,tip);
  // espinas por la curva
  const thorns=[], tan=V3(0,0,0);
  for(let i=0;i<14;i++){const u=0.12+0.8*i/13, th=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.42,6),tipM);
    curve.getPointAt(u,th.position); curve.getTangentAt(u,tan);
    const ang=i*2.4, side=V3(Math.cos(ang),Math.sin(ang),Math.cos(ang*1.7)).cross(tan).normalize();
    th.quaternion.setFromUnitVectors(UP,side.clone().addScaledVector(tan,0.5).normalize());
    th.position.addScaledVector(side,0.14*(1-u*0.5)); th.userData={u,base:th.position.clone()}; thorns.push(th); L.mesh.add(th);}
  const spark=S.hitSpark(L.mesh,2.3,{seed:0.29,toCam:0.5}), spark2=S.hitSpark(L.mesh,1.8,{seed:0.77,toCam:0.4});
  const ring=S.groundRing(L.decal,3.8), ring2=S.groundRing(L.decal,3.0);
  const crack=crackDecal(L.decal,4.2,3.4);
  const K=`const float TG=${f(TG)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 E=${v3(E)};const vec3 G0=${v3(G0)};
  const vec3 C1=${v3(K1)};const vec3 C2=${v3(K2)};
  vec3 bz(float u){float v=1.-u;return v*v*v*G0+3.*v*v*u*C1+3.*v*u*u*C2+u*u*u*E;}`;
  // lenguas de fuego a lo largo de la rama mientras crece (energía) + humo (materia)
  S.pts(L.part,40,VV+K+`void main(){float life=.35+aSeed.y*.2;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float g=1.-pow(1.-clamp((uT-TG)/(TI-TG),0.,1.),1.7);float q=clamp((uT-TB)/${f(TBE-TB)},0.,1.)*1.12;
   float burning=step(.001,q);float u=burning>.5?q+r.x*.12:max(g-r.x*.18,0.);vec3 p=bz(min(u,1.))+(r-.5)*.18+vec3(0.,age*(.45+.3*r.z),0.);
   vR=(r.y-.5)*.5;vK=smoothstep(.3,1.,age);vA=(uT>TG&&q<1.&&u<=1.)?1.:0.;put(p,(.36+.16*r.z)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.35}),{mode:'energy'});
  S.pts(L.part,14,VV+K+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TB)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=bz(r.x)+vec3(sin(age*4.+r.y*9.)*.2,.2+age*1.3,cos(age*3.+r.z*9.)*.2);
   vR=r.z*6.28;vK=smoothstep(.2,1.,age);vA=(k>=1.)?.8:0.;put(p,(.4+.2*r.z)*(.6+.7*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:-.15,grey:.6,col:'vec3(.12,.1,.09)'}));
  // brote: terrones en la base al nacer
  S.pts(L.part,10,VV+K+`void main(){float s=TG+aSeed.x*.08;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.,0.))*(1.4+aSeed.z);vec3 p=G0+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:WOOD}));
  // impacto: astillas, terrones, polvo y brasas
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.85,0.))*(2.4+2.4*aSeed.z);vec3 p=E+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.24+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:WOOD}));
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.y*.08;float life=.7+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vec3(3.4,.12,0.)+vec3(cos(an),0.,sin(an)*.8)*(.5+1.2*(1.-exp(-t*5.)))+vec3(0.,t*.55,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=an+t;put(p,(.46+.22*aSeed.z)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  S.pts(L.part,40,VV+K+`void main(){float s=aSeed.x<.4?TI+aSeed.y*.1:TB+aSeed.y*${f(TBE-TB)};float life=.5+aSeed.z*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=aSeed.x<.4?E:bz(aSeed.y*1.05);vec3 d=aSeed.x<.4?normalize(rnd()+vec3(0.,.7,0.))*(1.5+aSeed.w):vec3(0.);
   vec3 p=b+d*t*(1.-.4*age)+vec3(sin(t*5.+aSeed.w*9.)*.15,t*(1.+aSeed.w),cos(t*4.+aSeed.z*9.)*.15);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.07*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // hilos de chispas de cada aliado a la punta (variantes)
  const AG=[0,1].map(i=>{const g=new THREE.Group();L.part.add(g);const PA=ALLY_POS[i].clone().add(V3(0,1.1,0));
    S.pts(g,22,VV+K+`const vec3 PA=${v3(PA)};void main(){float s=.35+aSeed.x*.5;float life=.35+aSeed.y*.15;float age=(uT-s)/life;
      float k=clamp(age,0.,1.);float g=1.-pow(1.-clamp((s+life-TG)/(TI-TG),0.,1.),1.7);vec3 e=bz(min(g,1.));
      vec3 m=mix(PA,e,.5)+vec3(0.,1.1,0.);vec3 p=mix(mix(PA,m,k),mix(m,e,k),k)+rnd()*.08*(1.-k);vR=0.;vK=k*.6;
      vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;put(p,.16+.08*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
    S.pts(g,14,VV+K+`void main(){float s=TI+${f(0.12*(i+1))}+aSeed.x*.04;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
      vec3 v=normalize(rnd()+vec3(-.2,.7,0.))*(2.+2.*aSeed.z);vec3 p=E+v*t*(1.-.4*age);vR=atan(v.y,v.x);vK=age;
      vA=(age>0.&&age<1.)?1.:0.;put(p,.18+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.6}),{mode:'energy'});
    return g;});
  a.setVariant=v=>{a.v=v;AG.forEach((g,i)=>g.visible=i<+v);};
  a.pose=function(te,o){
    const ia=te-TI, g=grow(te), q=cl((te-TB)/(TBE-TB))*1.12, n=+a.v;
    caster.rotation.z=0.15*ss(0,TG,te)-0.3*ss(TG,TG+0.1,te)+0.15*ss(TG+0.2,TI,te);
    const glow=1-cl(Math.max(ia,0)/0.8);
    wood.visible=te>=TG&&q<1.1; set(wood,g,1); wood.material.uniforms.uQ.value=q; wood.material.uniforms.uGl.value=glow*(ia>=0?1:0.4);
    curve.getPointAt(Math.min(g,1),tip.position); curve.getTangentAt(Math.min(g,1),tan);
    tip.quaternion.setFromUnitVectors(UP,tan); tip.visible=te>=TG&&q<0.98; tipM.uniforms.uGl.value=0.6+0.8*glow;
    for(const th of thorns){const u=th.userData.u,sc=ss(u-0.02,u+0.05,g)*(1-ss(u-0.02,u+0.04,q));
      th.visible=sc>0.01; th.scale.setScalar(Math.max(sc,0.001));
      th.position.copy(th.userData.base); if(q>u)th.position.y-=3*(q-u)*(q-u);}
    spark.pose(ia,E,1); spark2.pose(ia-0.06,tmp2.set(3.3,0.6,0.3),0.9);
    ring.pose(ia,3.4,0,0.55); ring2.pose(ia-0.14,3.4,0,0.5,0.85);
    setCrack(crack,out3(ia/0.2),-0.1+1.15*ss(TI+1.1,2.9,te),ia>=0?1:0);
    allies.forEach((d,i)=>{if(i<n){d.userData.m.emissive.copy(U.uC1.value);d.userData.m.emissiveIntensity=0.5*ss(0.3,0.45,te)*(1-ss(0.85,1.2,te));}});
    const hit=hitE(ia,3.5);
    target.position.x=3.4+hit*0.5*(1-Math.exp(-Math.max(ia,0)*20))*(ia>=0?1:0); target.rotation.z=-hit*0.42*Math.cos(ia*13)*(ia>=0?1:0);
    if(te<TI){curve.getPointAt(Math.min(g,1),o.g);o.gs=0.9+0.15*n;o.ga=te>=TG?0.2:0;o.li=te>=TG?2.5+0.5*n:0;}
    else{o.g.copy(E);o.gs=1.4+2*Math.min(ia,0.6)+0.3*n;o.ga=0.25*Math.exp(-ia*8)+(q>0&&q<1?0.1:0);o.li=(7+1.5*n)*Math.exp(-ia*4.5)+(q>0&&q<1?2:0);}
    o.ia=ia;o.c.copy(E);o.shake=1.5+0.15*n;o.dist=1.1+0.15*n;o.flash=0.7;
  };
}};
defs.push(BRANCH);

// =====================================================================
// 5 · MERRY — un hilo dorado va al aliado; brota a su alrededor una cúpula de lana (mechones iluminados que suben
//     de abajo arriba) con dos cuernos de carnero dorados que se enroscan a los lados; resuena con anillos y suelta
//     copos de lana; al final la lana se deshace (escudo de 65)
// =====================================================================
defs.push({key:"sty_merry",name:"Merry (estilizado)",dur:2.4,ti:0.75,tier:2,pal:"Sty Bestia · Carnero",stylized:true,allies:1,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Invocación",0],["Materialización",0.35],["Resonancia",0.75],["Lana",1.0],["Disipación",1.75]],
build(a){
  const L=a.L,TM=0.35,TI=0.75,TD=1.75,TE=2.3,AP=ALLY_POS[0],SC=AP.clone().add(V3(0,0.85,0)),R=1.0;
  const W=`const float TM=${f(TM)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const vec3 SC=${v3(SC)};const vec3 P0=vec3(-3.5,1.6,0.);`;
  // cúpula de lana: mechones fijos sobre la semiesfera que aparecen de abajo arriba y se deshacen al final
  S.pts(L.part,90,VV+W+`void main(){float an=aSeed.x*6.2832;float h=aSeed.y;float el=asin(h*.95);
   vec3 d=vec3(cos(an)*cos(el),sin(el)*1.05-.15,sin(an)*cos(el));
   float on=smoothstep(TM+h*.35,TM+h*.35+.12,uT);float off=smoothstep(TD+aSeed.z*.35,TD+aSeed.z*.35+.25,uT);
   vec3 p=SC+d*${f(R)}*(1.+.03*sin(uT*5.+aSeed.w*9.))+vec3(0.,-off*.6*aSeed.w,0.)+d*off*.5;
   vR=aSeed.w*6.28;vK=off*.95+(1.-on)*.6;vA=on*(1.-step(.99,off));put(p,(.52+.2*aSeed.z)*(.4+.6*on));}`,
   S.MATTER_FS(C.puff,{relief:6,bias:-.02,col:WOOL}));
  // brillo dorado de la cúpula (energía, solo borde)
  const dome=new THREE.Mesh(new THREE.SphereGeometry(R*1.08,48,28,0,Math.PI*2,0,Math.PI*0.62),S.mat(`uniform float uH;
   void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.4);float h=(vP.y+.2)/1.3;
   float wave=smoothstep(.1,0.,.5-abs(fract(h*2.5-uH*2.)-.5))*exp(-uH*1.8)*step(0.,uH);
   float m=fr*.5+wave*.5;if(m<.02)discard;gl_FragColor=vec4(styRamp(.55+.45*fr)*1.2,m*uA);}`,{uH:{value:-1}},{mode:'energy',side:THREE.DoubleSide}));
  dome.position.copy(SC).add(V3(0,-0.15,0)); L.mesh.add(dome);
  // cuernos de carnero dorados a los lados (espirales afinadas que crecen desde la base)
  const hm=hornMatOf("#ffe39a","#c98a2e",22);
  const horns=[-1,1].map(s=>{const pts=[];for(let i=0;i<=40;i++){const t=i/40,th=Math.PI*0.45+t*Math.PI*1.7,r=0.72*(1-0.6*t);
      pts.push(V3(0.35-r*Math.cos(th)*0.8,0.5+r*Math.sin(th)*0.95,s*(R*0.75+0.3*t)));}
    const m=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),100,12,0.22,0.045),hm); m.position.copy(SC); L.mesh.add(m); return m;});
  const rings=[0,0.1,0.2].map(()=>S.groundRing(L.decal,3.4));
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.47,toCam:0.9});
  // hilo dorado del lanzador al aliado
  S.pts(L.part,24,VV+W+`void main(){float s=.05+aSeed.x*.25;float life=.25+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 m=mix(P0,SC,.5)+vec3(0.,1.,0.);vec3 p=mix(mix(P0,m,k),mix(m,SC,k),k)+rnd()*.1*(1.-k);vR=0.;vK=k*.5;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.16+.08*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // copos de lana que caen girando y ráfagas al resonar y al deshacerse
  S.pts(L.part,22,VV+W+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*2.;float rad=${f(R)}*(.5+.8*r.y);vec3 p=SC+vec3(cos(an)*rad,1.1-age*1.8+r.z*.3,sin(an)*rad);
   vR=age*4.+r.z*6.;vK=smoothstep(.75,1.,age);vA=(k>=1.&&p.y>.05&&uT<TE)?1.:0.;put(p,.22+.1*r.z);}`,S.MATTER_FS(C.puff,{relief:4,bias:.12,col:WOOL}));
  for(const [ti,n] of [[TI,20],[TD,22]])S.pts(L.part,n,VV+W+`void main(){float s=${f(ti)}+aSeed.x*.08;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=SC+d*(${f(R)}+(.6+.9*aSeed.z)*(1.-exp(-t*3.)))+vec3(0.,-.4*t*t,0.);
   vR=aSeed.w*6.28+t*3.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.28+.12*aSeed.w));}`,S.MATTER_FS(C.puff,{relief:4,bias:.12,col:WOOL}));
  S.pts(L.part,16,VV+W+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(2.+1.5*aSeed.z);vec3 p=SC+vec3(0.,.6,0.)+v*t*(1.-.4*age);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.07*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // glifo de cuernos en el suelo
  const glyph=groundPlane(2.9,AP.x,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=smoothstep(.03,0.,abs(r-.92))+smoothstep(.015,0.,abs(r-.8));
   for(int i=0;i<2;i++){float o=float(i)*3.14159;float s=fract((an+o)/6.2832+r*1.3-uT*.12);m+=smoothstep(.06,0.,abs(s-.5))*smoothstep(.75,.2,r)*step(.12,r);}
   m=min(m,1.);if(m<.02)discard;vec4 sh=styShape(7.,vUv);float er=styErode(sh.b*.5+m*.5,uP,.12);
   gl_FragColor=vec4(styRamp(.6+.4*(1.-r))*1.15,m*er*uA*.85);}`,{},{mode:'energy'})); glyph.position.z=AP.z; L.decal.add(glyph);
  a.pose=function(te,o){
    const ia=te-TI, mk=cl((te-TM)/(TI-TM)), env=ss(TM,TM+0.2,te)*(1-ss(TD,TE,te));
    caster.rotation.z=0.12*ss(0,0.2,te)-0.2*ss(0.2,0.32,te)+0.08*ss(0.35,0.85,te);
    dome.visible=te>=TM&&te<TE; dome.scale.setScalar(1+0.06*hitE(ia,6)*(ia>=0?1:0)+0.01*Math.sin(te*4));
    set(dome,0,env*0.8); dome.material.uniforms.uH.value=ia>=0?ia:-1;
    for(const h of horns){h.visible=te>=TM&&te<TE;}
    hm.uniforms.uP.value=te<TD?ss(0,1,mk):1; hm.uniforms.uEr.value=-0.1+1.15*ss(TD,TE,te); hm.uniforms.uGl.value=0.2+0.9*hitE(ia,5)*(ia>=0?1:0);
    rings.forEach((r,i)=>r.pose(ia-i*0.1,AP.x,AP.z,0.5,1-0.15*i));
    spark.pose(ia,tmp2.copy(SC).add(V3(0,0.7,0)),1);
    set(glyph,-0.1+1.1*ss(TD,TE,te),ss(0.05,0.35,te));
    const d=allies[0].userData.m; d.emissive.copy(U.uC1.value); d.emissiveIntensity=0.2*env+0.5*hitE(ia,6)*(ia>=0?1:0);
    if(te<TM){o.g.set(-3.5,1.6,0);o.gs=0.7;o.ga=0.15*ss(0,0.2,te);o.li=1.4;}
    else{o.g.copy(SC);o.gs=1.6+1.2*Math.min(Math.max(ia,0),0.5);o.ga=0.05*env+0.3*hitE(ia,8)*(ia>=0?1:0);o.li=1.5*env+4*hitE(ia,5)*(ia>=0?1:0);}
    o.ia=ia;o.c.copy(SC);o.shake=0;o.dist=0.8;o.flash=0;
  };
}});

// =====================================================================
// 6 · POCKY — un palito de galleta bañado en chocolate gira en vuelo con estela naranja, se clava en el rival y vibra;
//     migas y astillas; el lanzador se provoca: aro rojo en sus pies, diana roja sobre la cabeza que late y la cadena
//     de provocación que va del rival al lanzador (nivel 2)
// =====================================================================
defs.push({key:"sty_pocky",name:"Pocky (estilizado)",dur:2.2,ti:0.6,tier:2,pal:"Sty Bestia · Pocky",stylized:true,...ZONES,
  phases:[["Preparación",0],["Vuelo",0.34],["Impacto",0.6],["Provocación",0.78],["Fin",1.85]],
build(a){
  const L=a.L,TL=0.34,TI=0.6,TT=0.78,TF=1.85,P0=V3(-3.2,1.75,0),HP=V3(2.98,1.25,0);
  const fly=(te,out)=>{const k=cl((te-TL)/(TI-TL));return out.set(P0.x+(HP.x-P0.x)*k,P0.y+(HP.y-P0.y)*k+0.55*Math.sin(Math.PI*k),0);};
  // palito: galleta (cola) y chocolate (2/3 delanteros) con brillo duro; geometría pequeña a lo largo de +x
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.8,12,1).rotateZ(-Math.PI/2),S.mat(`
  void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float x=vP.x/.8+.5;
   float choc=smoothstep(.32,.36,x+(styNoise(vec2(atan(vP.y,vP.z)*.3,.2)).r-.5)*.08);
   vec3 col=mix(${BISCUIT},${CHOCO},choc);vec3 c=styRampOf(col,.28+.55*l)*styTint(l);
   float sp=smoothstep(.93,.97,dot(reflect(-stySunV(),n),normalize(vV)));c+=vec3(1.)*sp*(.2+.5*choc);
   c+=uC1*smoothstep(.9,1.,x)*.6;gl_FragColor=vec4(c,1.);}`,{},{mode:'solid'}));
  const sp=new THREE.Group(); sp.add(stick); L.mesh.add(sp);
  const streak=streakMesh(L.trail,0.32,S.mat(STREAK_FS,{},{mode:'energy',side:THREE.DoubleSide}));
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.53,toCam:0.5});
  const ringH=S.groundRing(L.decal,2.4);
  const taunt=S.status(a,'taunt',[caster],TT,TF+0.3);
  // diana roja de provocación sobre el lanzador (indicador de juego, color fijo)
  const reticle=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float m=smoothstep(.05,.0,abs(r-.86))+smoothstep(.045,0.,abs(r-.55))+smoothstep(.15,.1,r);
   m+=step(abs(p.x),.05)*step(.6,abs(p.y))*step(abs(p.y),.98)+step(abs(p.y),.05)*step(.6,abs(p.x))*step(abs(p.x),.98);
   m+=smoothstep(.035,0.,abs(r-.72))*step(.5,fract(an/6.2832*3.-uT*.8));m=min(m,1.);if(m<.02)discard;
   gl_FragColor=vec4(styRampOf(${TAUNT},.65+.35*m)*1.35,m*uA);}`,{},{mode:'matter',depthTest:false})); L.mesh.add(reticle);
  // cadena de provocación: trazos rojos que fluyen del rival hacia el lanzador
  const tether=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,1,6,1,true).rotateZ(Math.PI/2),S.mat(`void main(){float u=vUv.y;float dash=step(.45,fract(u*22.+uT*3.));
   float m=dash*smoothstep(0.,.05,u)*smoothstep(1.,.95,u);if(m<.02)discard;gl_FragColor=vec4(styRampOf(${TAUNT},.8)*1.3,m*.85*uA);}`,{},{mode:'energy',side:THREE.DoubleSide}));
  L.trail.add(tether);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 HP=${v3(HP)};
  vec3 fly(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,HP,k)+vec3(0.,.55*sin(3.14159*k),0.);}`;
  // chispas naranjas de la estela, migas de galleta y chocolate al clavarse
  S.pts(L.part,18,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=fly(s)+vec3(-.45*t,.15*t,0.)+rnd()*.06;vR=0.;vK=age;vA=(age>0.&&age<1.)?1.:0.;put(p,(.12+.06*aSeed.w));}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-1.2,.8,0.))*(1.5+2.*aSeed.z);vec3 p=HP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.13+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BISCUIT}));
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-1.,1.,0.))*(1.2+1.5*aSeed.z);vec3 p=HP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14;put(p,.13+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:CHOCO}));
  const dir=V3(0,0,0), rp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, tt=te-TT;
    caster.rotation.z=0.18*ss(0,TL,te)-0.4*ss(TL,TL+0.06,te)+0.22*ss(TL+0.1,TL+0.5,te);
    const hit=hitE(ia,6)*(ia>=0?1:0);
    target.position.x=3.4+hit*0.16; target.rotation.z=-hit*0.22*Math.cos(ia*15);
    if(te<TI){fly(Math.max(te,TL),tmp);fly(Math.max(te,TL)+0.01,dir);dir.sub(tmp).normalize();sp.position.copy(tmp);sp.quaternion.setFromUnitVectors(XA,dir);sp.rotateX(te*30);}
    else{sp.position.set(HP.x+0.12+hit*0.16,HP.y,0.1);sp.quaternion.setFromUnitVectors(XA,dir.set(1,-0.25+0.15*Math.sin(ia*60)*Math.exp(-ia*6)+target.rotation.z,0.15).normalize());}
    sp.visible=te>=TL-0.15&&te<TF+0.3;
    sp.scale.setScalar(Math.max(2.7*(1-ss(TF,TF+0.3,te))*(te<TL?ss(TL-0.15,TL,te):1),0.001));
    if(te<TL)sp.position.copy(P0);
    poseStreak(streak,tmp3.copy(P0).lerp(sp.position,te<TI?Math.max(0,1-2.2/Math.max(sp.position.distanceTo(P0),0.01)):0),sp.position,te>TL&&ia<0.15);
    streak.children[0].material.uniforms.uA.value=ia>0?1-cl(ia/0.15):1;
    spark.pose(ia,HP,1); ringH.pose(ia,3.4,0,0.4);
    const on=ss(TT-0.05,TT+0.05,te)*(1-ss(TF,TF+0.3,te)), slam=1+1.5*Math.pow(1-cl(tt/0.16),2), beat=1+0.12*Math.pow(0.5+0.5*Math.sin(tt*14),6);
    towardCam(rp.set(caster.position.x,2.55,caster.position.z),rp,0.3); reticle.position.copy(rp); billboard(reticle);
    reticle.scale.setScalar(Math.max(0.75*slam*beat*on,0.001)); reticle.visible=on>0.001; reticle.material.uniforms.uA.value=on*(tt<0.16?cl(tt/0.16):1);
    tether.visible=on>0.001; tmp.set(caster.position.x,1.6,0); tmp2.set(target.position.x,1.3,0);
    tether.position.copy(tmp).lerp(tmp2,0.5); tether.scale.set(Math.max(tmp2.x-tmp.x,0.01),1,1); tether.rotation.z=Math.atan2(tmp2.y-tmp.y,tmp2.x-tmp.x);
    tether.material.uniforms.uA.value=on*0.85;
    const ten=taunt.pose(te);
    o.em=ten*0.3*beat; o.emc.setRGB(1,0.15,0.1);
    if(te<TI){o.g.copy(sp.position);o.gs=te>=TL?0.6:0.3;o.ga=te>=TL?0.15:0.08;o.li=1.8;}
    else{o.g.copy(HP);o.gs=1+1.6*Math.min(ia,0.5);o.ga=0.25*Math.exp(-ia*11);o.li=4*Math.exp(-ia*6)+0.8*on;}
    o.ia=ia;o.c.copy(HP);o.shake=0.3;o.dist=0.5;o.flash=0.5;
  };
}});

// =====================================================================
// 7 · BOOMERANG — bumerán de madera con runas que brillan; vuela en elipse con cinta de viento, hojas y remolinos,
//     golpea en la ida y vuelve a los cuernos; al atraparlo, chispa dorada (+1 PA si hay más enemigos) (nivel 1)
// =====================================================================
defs.push({key:"sty_boom",name:"Boomerang (estilizado)",dur:1.3,ti:0.43,tier:1,pal:"Sty Bestia · Bumerán",stylized:true,...ZONES,
  phases:[["Lanzamiento",0],["Ida",0.1],["Impacto",0.43],["Regreso",0.5],["Atrapada",0.76]],
build(a){
  const L=a.L,TL=0.1,TC=0.76,TI=0.43,CE=V3(0,1.25,0),AX=3.38,BZ=1.5;
  const at=(s,out)=>{const th=Math.PI+2*Math.PI*s;return out.set(CE.x+AX*Math.cos(th),CE.y+0.15*Math.sin(2*Math.PI*s),BZ*Math.sin(th));};
  const wm=S.mat(WOODX_FS,{uGl:{value:0},uEr:{value:0},uRune:{value:1}},{mode:'solid'});
  const bm=new THREE.Group();
  for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.06,0.14),wm);arm.position.set(0.24*Math.cos(s*0.95),0,0.24*Math.sin(s*0.95));arm.rotation.y=-s*0.95;bm.add(arm);}
  const spin=new THREE.Group(); spin.add(bm); L.mesh.add(spin);
  // disco de giro (energía)
  const blur=new THREE.Mesh(new THREE.RingGeometry(0.12,0.56,40).rotateX(-Math.PI/2),S.mat(`void main(){float r=length(vP.xz);float an=atan(vP.z,vP.x);
   float m=smoothstep(.56,.4,r)*smoothstep(.12,.22,r)*(.5+.5*sin(an*2.-uT*60.));if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.5+.4*m)*1.2,m*.4*uA);}`,{},{mode:'energy',side:THREE.DoubleSide})); spin.add(blur);
  // cinta de viento a lo largo de la órbita (uP = posición actual 0..1)
  const N=180, pos=[], uvs=[], idx=[], pos2=[], pt=V3(0,0,0), nx=V3(0,0,0);
  for(let i=0;i<=N;i++){const s=i/N;at(s,pt);at(Math.min(s+0.001,1),nx);nx.sub(pt).normalize();
    const side=V3(-nx.z,0,nx.x).multiplyScalar(0.16);
    pos.push(pt.x-side.x,pt.y,pt.z-side.z,pt.x+side.x,pt.y,pt.z+side.z); pos2.push(pt.x,pt.y-0.12,pt.z,pt.x,pt.y+0.12,pt.z);
    uvs.push(s,0,s,1); if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const mkG=p=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();return g;};
  const ribbon=S.mat(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float d=uP-u;if(d<0.||d>.2)discard;
   float n=styNoise(vec2(u*4.-uT*1.5,vUv.y*.5)).b;float m=exp(-d*12.)*smoothstep(1.,.2,v+(n-.5)*.5);
   float er=styErode(n*.6+.4*(1.-d*5.),.15,.15);if(m*er<.02)discard;
   gl_FragColor=vec4(styRamp(.45+.55*exp(-d*8.))*1.2,m*er*uA);}`,{},{mode:'energy',side:THREE.DoubleSide});
  L.trail.add(new THREE.Mesh(mkG(pos),ribbon),new THREE.Mesh(mkG(pos2),ribbon));
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.62,toCam:0.5}), sparkC=S.hitSpark(L.mesh,1.0,{seed:0.15,toCam:0.4});
  const ring=S.groundRing(L.decal,2.4);
  const K=`const float TL=${f(TL)};const float TC=${f(TC)};const float TI=${f(TI)};
  vec3 at(float s){float th=3.14159+6.28318*s;return vec3(${f(CE.x)}+${f(AX)}*cos(th),${f(CE.y)}+.15*sin(6.28318*s),${f(BZ)}*sin(th));}`;
  // hojas que se sueltan en la trayectoria (materia) y remolinos (energía)
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x;float ts=TL+s*(TC-TL);float life=.45+aSeed.y*.3;float age=(uT-ts)/life;float t=max(uT-ts,0.);
   vec3 r=rnd();vec3 p=at(s)+vec3(r.x*.3*t+sin(t*8.+r.z*9.)*.12,-.6*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.22+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.62,.32,.06)'}));
  S.pts(L.part,20,VV+K+`void main(){float s=aSeed.x;float ts=TL+s*(TC-TL);float life=.22+aSeed.y*.15;float age=(uT-ts)/life;float t=max(uT-ts,0.);
   float an=aSeed.z*6.2832+t*14.;vec3 p=at(s)+vec3(cos(an),sin(an)*.7,sin(an))*.12*(.4+t*2.5);vR=an;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,(.14+.06*aSeed.w));}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,.6))*(1.5+1.8*aSeed.z);vec3 p=vec3(3.25,1.25,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.16+.07*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:WOOD}));
  const HT=V3(3.2,1.25,0), CP=V3(-3.3,1.6,0.1);
  a.pose=function(te,o){
    const ia=te-TI, ic=te-TC, s=cl((te-TL)/(TC-TL)), flying=te>=TL&&te<TC;
    caster.rotation.z=0.15*ss(0,TL,te)-0.3*ss(TL,TL+0.05,te)+0.15*ss(TL+0.05,TL+0.3,te)+(ic>=0?0.1*Math.exp(-ic*8)*Math.sin(ic*24):0);
    if(flying)at(s,spin.position); else spin.position.copy(CP);
    spin.position.y+=te<TL?0.06*Math.sin(te*30):0;
    spin.scale.setScalar(1.85); spin.rotation.set(0.3,0,0.15); bm.rotation.y=flying?te*40:0.4;
    spin.visible=te<TC+0.15; wm.uniforms.uGl.value=flying?0.5:0.2;
    blur.material.uniforms.uA.value=flying?1:0;
    ribbon.uniforms.uP.value=flying?s:(te>=TC?1+(te-TC)*0.5:0); ribbon.uniforms.uA.value=flying?0.9:Math.max(0,0.9-cl(ic/0.15));
    spark.pose(ia,HT,1); sparkC.pose(ic,CP,0.8); ring.pose(ia,3.4,0,0.35);
    const hit=hitE(ia,7)*(ia>=0?1:0);
    target.position.x=3.4+hit*0.14; target.rotation.z=-hit*0.2*Math.cos(ia*18);
    if(flying){o.g.copy(spin.position);o.gs=0.6;o.ga=0.1;o.li=1.4;}
    else{o.g.copy(CP);o.gs=0.6;o.ga=ic>=0?0.2*Math.exp(-ic*10):0.05;o.li=ic>=0?2*Math.exp(-ic*8):0.4;}
    if(ia>=0&&ia<0.3){o.ga+=Math.exp(-ia*14)*0.25;o.li+=3.5*Math.exp(-ia*8);}
    o.ia=ic>=0?ic:ia; o.c.copy(ic>=0?CP:HT); o.shake=0; o.dist=ic>=0?0.2:0.5; o.flash=ic>=0?0:0.6;
  };
}});

// =====================================================================
// 8 · LUMP — los cuernos se cargan y lanzan pulsos de vigor (anillos de pincel) al aliado; el aliado arde en pelaje
//     de llamas ámbar, con chevrones (+1 PM), estrellas de crítico que orbitan (+20 % de crítico) y un glifo (nivel 1)
// =====================================================================
defs.push({key:"sty_lump",name:"Lump (estilizado)",dur:2.1,ti:0.68,tier:1,pal:"Sty Bestia · Vigor",stylized:true,allies:1,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Carga",0],["Onda",0.3],["Vigor",0.68],["Furia",0.95],["Fin",1.8]],
build(a){
  const L=a.L,TW=0.3,TI=0.68,TF=1.8,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.1,0)),HC=V3(-3.5,2.0,0);
  const dir=AC.clone().sub(HC).normalize(), len=AC.distanceTo(HC);
  // pulsos: anillos de pincel perpendiculares a la trayectoria (pequeños: se mueven enteros)
  const RING_M=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);if(s.r*er<.02)discard;
   gl_FragColor=vec4(styRamp(.55+.45*s.g)*1.35,s.r*er*uA);}`;
  const rings=[0,0.08,0.16,0.24].map(d=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(RING_M,{},{mode:'energy',side:THREE.DoubleSide}));
    m.quaternion.setFromUnitVectors(V3(0,0,1),dir); m.userData.d=d; L.trail.add(m); return m;});
  const hornGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),S.mat(GLOW_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(hornGlow);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.71,toCam:0.8});
  const ring=S.groundRing(L.decal,3.0), pm1=S.groundRing(L.decal,1.7), pm2=S.groundRing(L.decal,1.7);
  const K=`const float TW=${f(TW)};const float TI=${f(TI)};const float TF=${f(TF)};const vec3 HC=${v3(HC)};const vec3 AC=${v3(AC)};const vec3 AP=${v3(AP)};`;
  // carga: chispas que convergen en los cuernos
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*.2;float life=.2+aSeed.y*.08;float age=(uT-s)/life;vec3 d=normalize(rnd()+.001);
   vec3 p=HC+d*mix(1.,.1,age*age);vR=0.;vK=age*.5;vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  // chispas que viajan con la onda
  S.pts(L.part,22,VV+K+`void main(){float s=TW+aSeed.x*.22;float life=.38;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(HC,AC,k)+rnd()*.18*sin(k*3.14159)+vec3(0.,.2*sin(k*3.14159),0.);vR=0.;vK=k*.4;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.13+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  // pelaje de llamas ámbar en el aliado (energía) y mechones que suben (materia)
  S.pts(L.part,36,VV+K+`void main(){float life=.45+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rad=.5+r.y*.22;vec3 p=AP+vec3(cos(an)*rad,.1+age*(1.7+r.z*.6),sin(an)*rad);
   vR=(r.y-.5)*.5;vK=smoothstep(.3,1.,age);vA=(k>=1.)?uE:0.;put(p,(.75+.25*r.z)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.35}),{mode:'energy'});
  S.pts(L.part,22,VV+K+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k)+3.);
   float an=r.x*6.2832;float rad=.55+r.y*.2;vec3 p=AP+vec3(cos(an)*rad,.05+age*(1.5+r.z*.6),sin(an)*rad);
   vR=(r.y-.5)*.5;vK=smoothstep(.2,1.,age);vA=(k>=1.)?uE:0.;put(p,(.9+.3*r.z)*(1.-age*.5));}`,S.MATTER_FS(C.flame,{relief:3,bias:.05,col:'vec3(.95,.38,.06)'}));
  S.pts(L.part,12,VV+K+`void main(){float life=.9;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=AP+vec3((r.x-.5)*1.,.4+age*1.5,(r.y-.5)*1.);vR=0.;vK=0.;vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.34);}`,CHEVUP_FS,{mode:'energy'});
  // estrellas de crítico que orbitan la cabeza del aliado
  S.pts(L.part,4,VV+K+`void main(){float an=aSeed.x*6.2832+uT*3.;vec3 p=AP+vec3(cos(an)*.55,1.85+sin(uT*4.+aSeed.x*6.)*.08,sin(an)*.55);
   vR=uT*2.+aSeed.x*6.;vK=0.;vA=step(TI,uT)*uE;put(p,.34+.06*sin(uT*9.+aSeed.x*6.));}`,STAR4_FS,{mode:'energy'});
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.7,0.))*(2.+1.5*aSeed.z);vec3 p=AC+v*t*(1.-.4*age);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.07*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  const glyph=groundPlane(2.1,AP.x,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=smoothstep(.03,0.,abs(r-.9))+smoothstep(.015,0.,abs(r-.65))+smoothstep(.1,0.,abs(fract(an/6.2832*6.+uT*.4)-.5))*smoothstep(.06,0.,abs(r-.78));
   m=min(m,1.);if(m<.02)discard;gl_FragColor=vec4(styRamp(.6+.4*(1.-r))*1.2,m*uA*.85);}`,{},{mode:'energy'})); glyph.position.z=AP.z; L.decal.add(glyph);
  a.pose=function(te,o){
    const ia=te-TI, ch=ss(0,TW,te), env=ss(TI,TI+0.2,te)*(1-ss(TF-0.3,TF+0.2,te));
    caster.rotation.z=0.2*ch-0.32*ss(TW,TW+0.08,te)+0.12*ss(TW+0.1,TW+0.5,te);
    towardCam(hornGlow.position,HC,0.2); billboard(hornGlow); hornGlow.material.uniforms.uA.value=0.5*ch*(1-ss(TW,TW+0.28,te));
    for(const r of rings){const k=cl((te-TW-r.userData.d)/0.38);r.visible=k>0&&k<1;
      r.position.copy(HC).addScaledVector(dir,len*k); r.scale.setScalar(1.1+1.2*k); set(r,0.05+0.6*k,Math.sin(Math.PI*k));}
    spark.pose(ia,AC,1); ring.pose(ia,AP.x,AP.z,0.45);
    pm1.pose(ia-0.15,AP.x,AP.z,0.6,0.9); pm2.pose(ia-0.45,AP.x,AP.z,0.6,0.9);
    for(const p of [pm1,pm2])p.mesh.rotation.y=te*3;
    glyph.material.uniforms.uA.value=env*0.85;
    U.uE.value=env;
    const d=allies[0]; d.userData.m.emissive.copy(U.uC1.value); d.userData.m.emissiveIntensity=0.25*env+0.5*hitE(ia,7)*(ia>=0?1:0);
    d.scale.set(1,1+0.04*env*(0.5+0.5*Math.sin(te*9)),1);
    if(te<TI){o.g.copy(te<TW?HC:tmp.copy(HC).addScaledVector(dir,len*cl((te-TW)/0.38)));o.gs=0.8;o.ga=0.18*ch;o.li=2*ch;}
    else{o.g.copy(AC);o.gs=1.4+1.2*Math.min(ia,0.6);o.ga=0.3*Math.exp(-ia*9)+0.05*env;o.li=4*Math.exp(-ia*6)+1.2*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.4;o.flash=0;
  };
}});

VFX.module("Estilizado · Bestia · Cuernos",defs);
})();

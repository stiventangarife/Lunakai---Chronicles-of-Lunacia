// =====================================================================
// ESTILIZADO · CUERPO A CUERPO — versiones con el kit vfx-stylized.js de las fábricas de mod-basicos-cuerpo.js.
// VFX.sty.basic.TIPO(cfg) recibe el mismo cfg que VFX.basic.TIPO ({key,name,pal,...opciones}) y devuelve una habilidad
// nueva con los MISMOS tiempos de impacto (ti), nivel (tier), anclas de diseño (anchors: {caster, target}) y movimiento
// de los muñecos que la original. Con cfg.demo las opciones salen como variantes (laboratorio); sin demo quedan fijas.
// Las instancias de enemigos se registran en mod-estilizado-enemigos.js con la clave sty__<id del hechizo>.
// Tipos: MORDISCO · ZARPAZO · GOLPE · EMBESTIDA · ESTOCADA · GOLPE_SISMICO · GIRO_EMPUJE
// Lenguaje: materia (mezcla normal, luz del sol en 3 bandas: polvo, roca, hojas, colmillos, el borde oscuro de los
// tajos) + núcleos de energía pequeños (aditivos); todo se consume por erosión; sin contornos.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,enemies,helixGeo}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL, B=S.basic;
const EARTH="vec3(.6,.48,.34)";         // polvo de tierra (color del camino del tablero)
const ROCK="vec3(.46,.41,.36)";         // roca
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const HITSPARK_FS=S.FS.HITSPARK, RING_STY=S.FS.RING;
const PT=0.9, SL=0.24;                  // desplazamiento por casilla empujada y duración del deslizamiento (como el original)

// cfg → def (igual que mk() de mod-basicos-cuerpo.js, con stylized:true)
function mk(cfg,base,demoVars,pick){
  cfg=cfg||{};
  const def=Object.assign(base,{key:cfg.key||base.key,name:cfg.name||base.name,pal:cfg.pal||base.pal,stylized:true});
  if(demoVars){
    if(cfg.demo){def.variants=demoVars;def.v=demoVars[0][0];def.vlabel="Opción";}
    else def.v=pick(cfg);
  }
  return def;
}

// ---------- piezas locales ----------
// polvo de tierra (materia iluminada) — fragmento compartido por varias partículas de este archivo
const DUST=S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH});
// trazo de tajo en dos capas sobre el mismo plano: uL=0 cuerpo de materia (color claro de la paleta, en sombra hacia
// la cola; tapa el suelo claro sin velo) · uL=1 núcleo de energía. La función stroke() da (máscara del cuerpo, máscara del núcleo).
const STROKE_HEAD=`uniform float uL;
float strokeOut(float body,float core,float er){return uL<.5?body*er:core*er;}
vec3 strokeCol(float core,float t){return uL<.5?styRampOf(uC1,.3+.45*(1.-t))*styTint(1.-t):styRamp(.72+.28*core)*(1.1+.3*core);}`;

// ---------- kit de empuje estilizado: chevrones en el suelo + polvo de arrastre bajo los pies ----------
const PUSH_STY=`void main(){float u=vUv.x;float av=abs(vUv.y-.5);
 float head=step(uP-.3,u)*step(av,(uP-u)*1.25)*step(u,uP);
 float ch=fract(u*5.+av*4.-uT*4.);float rows=smoothstep(.32,.18,abs(ch-.5))*step(av,.26)*step(u,uP-.3);
 float m=(head*.8+rows*.5)*smoothstep(0.,.12,u);if(m<.01)discard;
 float er=styErode(m*.5+styNoise(vUv*vec2(1.5,.6)).r*.5,.15,.12);
 gl_FragColor=vec4(styRamp(.6+.4*head),m*er*uA*.85);}`;
function pushKit(G,O,DR,T0,uD,dur){
  const arrow=new THREE.Mesh(new THREE.PlaneGeometry(1,0.8).translate(0.5,0,0).rotateX(-Math.PI/2),S.mat(PUSH_STY,{},{mode:'energy'}));
  arrow.rotation.y=-Math.atan2(DR.z,DR.x); G.decal.add(arrow);
  const uni={uD};
  const n=S.pts(G.part,14,VV+`uniform float uD;const float T0=${f(T0)};const vec3 O=${v3(O)};const vec3 DR=${v3(DR)};
  float dsp(float t){float k=clamp((t-T0)/${f(SL)},0.,1.);return uD*(1.-pow(1.-k,3.));}
  void main(){float s=T0+aSeed.x*${f(SL)};float life=.38+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 side=vec3(-DR.z,0.,DR.x);
   vec3 p=O+DR*(dsp(s)-.25)+side*(aSeed.z-.5)*.6+vec3(0.,.08+t*(.35+.3*aSeed.w),0.)-DR*t*.3;
   vA=(age>0.&&age<1.&&uD>.01)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.26+.16*aSeed.w)*(.6+.7*age));}`,DUST,{uniforms:uni});
  return {n,disp:te=>uD.value*e3((te-T0)/SL),upd(te){const D=uD.value;
    arrow.position.set(O.x-DR.x*0.35,0.035,O.z-DR.z*0.35); arrow.scale.set(D+0.85,1,1);
    arrow.visible=D>0.01; set(arrow,e3((te-T0)/SL),D>0.01?ss(T0,T0+0.05,te)*(1-ss(dur-0.18,dur,te)):0);}};
}

// =====================================================================
// MORDISCO (0,7 s · ti 0,3) — mandíbulas de materia (marfil con sombra en bandas), chispa de púas, esquirlas
// iluminadas y polvo a los pies del objetivo. Opción bleed: sangrado (gotas, charco y brillo rojo).
// =====================================================================
const JAW_STY=`uniform float uQ;uniform float uEr;
void main(){vec2 p=(vUv-.5)*2.;p.y*=uQ;
 float ax=abs(p.x);float g=.4*(1.-p.x*p.x)-.08;
 float th=.085*sqrt(max(1.-p.x*p.x,0.))+.01;
 float arcD=(p.y-g)/th;float arc=smoothstep(1.,.75,abs(arcD))*smoothstep(.98,.86,ax);
 float fang=0.,fk=0.,fx=0.;
 for(int i=0;i<2;i++){float xc=i==0?.5:.2;float L=i==0?.62:.32;float bw=i==0?.13:.08;
  float y0=.4*(1.-xc*xc)-.08;float dy=y0-p.y;float k=clamp(dy/L,0.,1.);
  float xx=ax-xc+.07*k*k;float w=bw*(1.-k)+.006;
  float inF=step(-.02,dy)*step(dy,L)*smoothstep(w,w*.7,abs(xx));
  if(inF>fang){fang=inF;fk=k;fx=xx/w;}}
 float m=max(arc,fang);if(m<.02)discard;
 vec3 L=stySunV();
 // colmillo: normal de cilindro a lo ancho; encía: normal de tubo a lo alto
 vec3 nF=normalize(vec3(fx*.9*sign(p.x),.25,1.));vec3 nA=normalize(vec3(0.,-arcD*.8*uQ,1.));
 float lF=styLight(nF,L),lA=styLight(nA,L);
 vec3 ivory=mix(vec3(1.,.95,.84),uC1,.18);
 vec3 cF=mix(mix(ivory,uC2,.45)*.6,ivory,lF)*styTint(lF)+vec3(1.)*smoothstep(.75,1.,fk)*.15;
 vec3 cA=styMatter(lA,-.12);
 vec3 c=fang>arc?cF:cA;
 float er=styErode(m*.45+styNoise(vUv*1.2+vec2(uQ*.3,0.)).r*.55,uEr,.09);
 gl_FragColor=vec4(c,m*er*uA);}`;

B.MORDISCO=function(cfg){
  cfg=cfg||{};
  const HC=-0.6,HT=1.2,T0=0.08,TS=0.2,TI=0.3,DUR=0.7,BP=V3(HT-0.2,1.3,0),G0=0.5,CO=0.09;
  return mk(cfg,{key:"sty_mordisco",name:"Mordisco (estilizado)",pal:"Salvaje",dur:DUR,ti:TI,tier:2,
    anchors:{caster:HC,target:HT},
    phases:[["Acecho",0],["Mordida",TS],["Impacto",TI],["Disipación",0.42]],
  build(a){
    const L=a.L;
    const jawU=()=>({uQ:{value:1},uEr:{value:-0.2}});
    const upper=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.8),S.mat(JAW_STY,jawU(),{depthTest:false}));
    const lower=new THREE.Mesh(new THREE.PlaneGeometry(1.05,0.7),S.mat(JAW_STY,jawU(),{depthTest:false}));
    lower.material.uniforms.uQ.value=-1;
    L.mesh.add(upper,lower);
    const spark=S.hitSpark(L.mesh,1.7,{seed:0.37,toCam:0.65,spin:0.35});
    const K=`const float TI=${f(TI)};const vec3 BP=${v3(BP)};const vec3 FT=${v3(V3(HT,0.12,0))};`;
    // esquirlas: materia iluminada que gira y cae
    S.pts(L.part,7,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.42+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(-.15,.75,.45))*(2.+1.4*aSeed.z);vec3 p=BP+v*t+vec3(0.,-6.5*t*t,0.);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.y*6.28+t*(8.+6.*aSeed.w);
     put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3.5,bias:.04}));
    // polvo a los pies del objetivo: nubes con 3 tonos de luz que se erosionan
    S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an)*.6);
     vec3 p=FT+d*(.25+.75*(1.-exp(-t*5.)))+vec3(0.,.1+t*.45,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t*.8;
     put(p,(.34+.2*aSeed.y)*(.7+.6*age));}`,DUST);
    // motas calientes (pocas, pequeñas): el brillo queda en el punto del golpe
    S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.22+aSeed.y*.16;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=BP+normalize(rnd()+vec3(0.,.3,.4))*(.3+2.2*aSeed.z)*(1.-exp(-t*6.));
     vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.y*6.28;put(p,.1+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
    const ring=S.groundRing(L.decal,2.6);
    const bleed=S.status(a,'bleed',[target],TI,DUR);
    a.setVariant=v=>{if(v!=="sangrado")v="normal";a.v=v;bleed.setVisible(v==="sangrado");};
    a.pose=function(te,o){
      const ia=te-TI;
      caster.position.x=HC+0.45*ss(TS-0.05,TI,te)-0.45*ss(TI+0.08,DUR-0.04,te);
      caster.rotation.z=0.15*ss(0,TS,te)-0.4*ss(TS,TI,te)+0.25*ss(TI+0.05,DUR-0.04,te);
      const hit=hitE(ia,7);
      target.position.x=HT+0.16*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-hit*0.22*Math.cos(ia*16); target.scale.set(1,1-0.06*hit,1);
      const tx=target.position.x-HT;
      // mandíbulas: entran abiertas, se cierran de golpe con estiramiento (smear) y se consumen desde el borde
      let off,smear=1;
      if(te<TS)off=CO+G0*(0.85+0.15*ss(T0,TS,te));
      else if(te<TI){const k=(te-TS)/(TI-TS);off=CO+G0*(1-k*k*k);smear=1+0.45*k*k;}
      else off=CO-0.015*Math.sin(ia*70)*Math.exp(-ia*14)+0.12*ss(TI+0.06,TI+0.3,te);
      const on=ss(T0-0.05,T0+0.04,te), er=ia<0?-0.2:-0.2+1.25*ss(0.04,0.3,ia);
      towardCam(tmp,tmp2.set(BP.x+tx,BP.y,0),0.5);
      upper.position.copy(tmp).add(tmp2.set(0,off,0)); lower.position.copy(tmp).add(tmp2.set(0,-off*0.85,0));
      billboard(upper,0.1*(off-CO)); billboard(lower,-0.08*(off-CO));
      upper.scale.set(1,smear,1); lower.scale.set(1,smear,1);
      upper.visible=lower.visible=on>0.001&&er<1.05;
      for(const j of [upper,lower]){j.material.uniforms.uA.value=on;j.material.uniforms.uEr.value=er;}
      spark.pose(ia,tmp2.set(BP.x+tx,BP.y,0));
      ring.pose(ia,target.position.x,0,0.42);
      const env=a.v==="sangrado"?bleed.pose(te):0;
      o.em=0; S.statusGlow(o,[{kind:'bleed',env}]);
      if(ia<0){o.g.copy(BP);o.gs=0.5*on;o.ga=0.1*on;o.li=1.2*on;}
      else{o.g.set(BP.x+tx,BP.y,0);o.gs=0.9+1.5*ia;o.ga=Math.exp(-ia*14)*0.35;o.li=4*Math.exp(-ia*7);}
      o.ia=ia;o.c.copy(BP);o.shake=0;o.dist=0.6;
    };
  }},[["normal","Normal"],["sangrado","Sangrado"]],c=>c.bleed?"sangrado":"normal");
};
S.MORDISCO=B.MORDISCO; // nombre del piloto (Hito 99)

// =====================================================================
// ZARPAZO (0,6 s · ti 0,22) — tres tajos paralelos en diagonal: borde de materia oscura + filo de energía que se
// deshilacha desde la cola; tres cicatrices que destellan en TF con una chispa; jirones y esquirlas.
// Opción bleed: sangrado.
// =====================================================================
const CLAW_STY=STROKE_HEAD+`
void main(){vec2 p=vUv;float u=p.x;float body=0.,core=0.,tt=1.;
 for(int i=0;i<3;i++){float fi=float(i);
  float y=p.y-.5-(fi-1.)*.2-(u-.5)*.04*(fi-1.);
  float w=(.016+.05*sin(3.14159*clamp(u,0.,1.)))*(1.-.15*abs(fi-1.));
  float d=uP-fi*.07-u;if(d<0.)continue;
  float er=styErode(styNoise(vec2(u*1.6+fi*.21,y*2.+fi*.37)).r*.7+.3*(1.-abs(y)/w),d*1.15-.08,.06);
  float bo=smoothstep(w,w*.75,abs(y))*er;float co=smoothstep(w*.42,w*.2,abs(y))*er;
  if(bo>body){body=bo;tt=clamp(d*2.,0.,1.);}core=max(core,co);}
 float edges=smoothstep(0.,.05,u)*smoothstep(1.,.92,u);
 float a=strokeOut(body,core,1.)*edges;if(a<.01)discard;
 gl_FragColor=vec4(strokeCol(core,tt),a*uA);}`;
const SCAR_STY=`void main(){vec2 p=vUv;float u=p.x;float m=0.;
 for(int i=0;i<3;i++){float fi=float(i);float y=p.y-.5-(fi-1.)*.2-(u-.5)*.04*(fi-1.);
  m=max(m,smoothstep(.018,.006,abs(y))*smoothstep(0.,.12,u-.3)*smoothstep(0.,.12,.72-u));}
 if(m<.01)discard;float er=styErode(m*.4+styNoise(vUv*2.).a*.6,uP,.1);
 gl_FragColor=vec4(styRamp(.75+.25*m)*1.25,m*er*uA);}`;
B.ZARPAZO=function(cfg){
  const HC=-0.6,HT=1.2,T0=0.1,TS=0.13,SW=0.17,TI=0.22,TF=0.32,DUR=0.6,CH=V3(HT-0.12,1.15,0),ANG=-0.8;
  return mk(cfg,{key:"sty_basic_zarpazo",name:"Zarpazo (estilizado)",pal:"Hielo",dur:DUR,ti:TI,tier:2,
    anchors:{caster:HC,target:HT},
    phases:[["Preparación",0],["Garras",TS],["Impacto",TI],["Destello",TF]],
  build(a){
    const L=a.L, g=new THREE.PlaneGeometry(2.6,1.3);
    const clawM=new THREE.Mesh(g,S.mat(CLAW_STY,{uL:{value:0}},{mode:'matter',depthTest:false}));
    const clawE=new THREE.Mesh(g,S.mat(CLAW_STY,{uL:{value:1}},{mode:'energy',depthTest:false}));
    clawE.renderOrder=1; L.trail.add(clawM,clawE);
    const scar=new THREE.Mesh(g,S.mat(SCAR_STY,{},{mode:'energy',depthTest:false})); L.mesh.add(scar);
    const spark=S.hitSpark(L.mesh,1.6,{seed:0.81,toCam:0.7,spin:ANG+0.78});
    const K=`const float TS=${f(TS)};const float SW=${f(SW)};const vec3 CH=${v3(CH)};const vec2 DL=vec2(${f(Math.cos(ANG))},${f(Math.sin(ANG))});`;
    // jirones de energía al paso de cada garra (pocos) y esquirlas de materia que salen despedidas
    S.pts(L.part,30,VV+K+`void main(){float fi=floor(aSeed.w*2.999);float s=TS+aSeed.x*SW;float u=(s-TS)/SW*1.35-fi*.07;
     float life=.18+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 dl=vec3(DL,0.);vec3 nl=vec3(-DL.y,DL.x,0.);
     vec3 p=CH+vec3(0.,0.,.55)+dl*(u-.5)*2.4+nl*(fi-1.)*.26+(nl*(aSeed.z-.5)*1.2+dl*.9)*t;
     vA=(age>0.&&age<1.&&u>.03&&u<.97)?1.-age:0.;vK=age;vR=atan(DL.y,DL.x);put(p,(.08+.06*aSeed.y)*(1.-age*.5));}`,
     S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
    S.pts(L.part,8,VV+K+`const float TF=${f(TF)};void main(){float s=TF+aSeed.x*.03;float life=.4+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(.4,.5,.6))*(1.8+1.4*aSeed.z);vec3 p=CH+vec3(0.,0.,.4)+v*t+vec3(0.,-6.5*t*t,0.);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.16+.07*aSeed.w);}`,
     S.MATTER_FS(C.shard,{relief:3.5,col:'uC2',bias:.1}));
    const ring=S.groundRing(L.decal,2.2);
    const bleed=S.status(a,'bleed',[target],TI,DUR);
    a.setVariant=v=>{if(v!=="sangrado")v="normal";a.v=v;bleed.setVisible(v==="sangrado");};
    a.pose=function(te,o){
      const ia=te-TI, iff=te-TF;
      caster.position.x=HC+0.4*ss(T0-0.05,TI,te)-0.4*ss(TF,DUR-0.03,te);
      caster.rotation.z=0.25*ss(0,T0,te)-0.45*ss(T0,TI,te)+0.2*ss(TF,DUR-0.03,te);
      const h1=hitE(ia,8), h2=hitE(iff,9);
      target.position.x=HT+0.14*h1+0.08*h2; target.rotation.z=-h1*0.2*Math.cos(ia*16)-h2*0.1*Math.cos(iff*20);
      const tx=target.position.x-HT;
      const sweep=(te-TS)/SW*1.35, cv=te>=TS&&te<TS+SW+0.2;
      for(const [m,k] of [[clawM,0.6],[clawE,0.61]]){towardCam(m.position,tmp.set(CH.x+tx,CH.y,0),k); billboard(m,ANG); m.visible=cv; set(m,sweep,1);}
      const env=ss(TI-0.02,TI+0.03,te), bright=ss(TF-0.05,TF,te)*(1-ss(TF,TF+0.12,te));
      towardCam(scar.position,tmp.set(CH.x+tx,CH.y,0),0.62); billboard(scar,ANG); scar.visible=env>0.001&&te<DUR-0.05;
      set(scar,-0.1+1.1*ss(TF+0.02,TF+0.24,te),env*(1+1.2*bright));
      spark.pose(iff,tmp.set(CH.x+tx,CH.y,0),0.9);
      ring.pose(ia,target.position.x,0,0.35,0.85);
      const bl=a.v==="sangrado"?bleed.pose(te):0;
      o.em=0; S.statusGlow(o,[{kind:'bleed',env:bl}]);
      if(te<TS){o.g.set(caster.position.x+0.5,1.4,0.3);o.gs=0.5*ss(0,T0,te);o.ga=0.1*ss(0,T0,te);o.li=1*ss(0,T0,te);}
      else if(iff<0){o.g.set(CH.x+tx,CH.y,0.3);o.gs=0.9;o.ga=0.2*(ia>=0?1:0.6);o.li=ia>=0?4*Math.exp(-ia*6)+1:2;}
      else{o.g.set(CH.x+tx,CH.y,0.3);o.gs=0.9+2*iff;o.ga=Math.exp(-iff*12)*0.35;o.li=5*Math.exp(-iff*6);}
      o.ia=iff>=0?iff:ia;o.c.copy(CH);o.shake=0;o.dist=iff>=0?0.6:0.4;o.flash=iff>=0?1:0.7;
    };
  }},[["normal","Normal"],["sangrado","Sangrado"]],c=>c.bleed?"sangrado":"normal");
};

// =====================================================================
// GOLPE (0,5 s · ti 0,19 · nivel 3) — barrido grueso en media luna (borde de materia + filo de energía) que cae
// sobre el objetivo; chispa grande, anillo de polvo de tierra a los pies, cascotes de roca y anillo de pincel.
// =====================================================================
const SWING_STY=STROKE_HEAD+`
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float d=an-uP;if(d<0.||d>1.5)discard;float t=d/1.5;
 float w=.24*(1.-t*.6);float rr=abs(r-.84);
 float er=styErode(styNoise(vec2(an*.5,r*.9)).r*.6+.4*(1.-rr/w),t*1.05-.05,.07);
 float body=smoothstep(w,w*.8,rr)*er;float core=smoothstep(w*.4,w*.15,rr)*smoothstep(.45,0.,t)*er;
 float a=strokeOut(body,core,1.);if(a<.01)discard;
 gl_FragColor=vec4(strokeCol(core,t),a*uA);}`;
B.GOLPE=function(cfg){
  const HC=-0.6,HT=1.2,TW=0.12,TI=0.19,DUR=0.5,IP=V3(HT-0.32,1.0,0),PV=V3(HC+0.35,1.2,0);
  const A0=1.9, A1=Math.atan2(IP.y-PV.y,IP.x-PV.x);
  return mk(cfg,{key:"sty_basic_golpe",name:"Golpe (estilizado)",pal:"Madera",dur:DUR,ti:TI,tier:3,
    anchors:{caster:HC,target:HT},
    phases:[["Carga",0],["Golpe",TW],["Impacto",TI],["Disipación",0.3]],
  build(a){
    const L=a.L, g=new THREE.PlaneGeometry(2.6,2.6);
    const swM=new THREE.Mesh(g,S.mat(SWING_STY,{uL:{value:0}},{mode:'matter',depthTest:false}));
    const swE=new THREE.Mesh(g,S.mat(SWING_STY,{uL:{value:1}},{mode:'energy',depthTest:false})); swE.renderOrder=1;
    L.trail.add(swM,swE);
    const spark=S.hitSpark(L.mesh,1.9,{seed:0.53,toCam:0.5,spin:0.2});
    const K=`const float TI=${f(TI)};const vec3 IP=${v3(IP)};const float FX=${f(HT-0.1)};`;
    // cascotes de roca hacia delante (materia con facetas)
    S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()*vec3(.6,1.,1.)+vec3(1.1,.7,0.))*(2.4+1.8*aSeed.z);vec3 p=IP+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.05);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*10.;put(p,.16+.08*aSeed.w);}`,
     S.MATTER_FS(C.shard,{relief:3,col:ROCK,bias:.1}));
    // anillo de polvo a los pies que se abre
    S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.36+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;float rad=.35+(1.-exp(-t*7.))*(.85+.35*aSeed.w);
     vec3 p=vec3(FX+cos(an)*rad,.1+t*.45*aSeed.y,sin(an)*rad*.8);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;
     put(p,(.32+.2*aSeed.y)*(.6+.8*age));}`,DUST);
    // motas del golpe
    S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.2+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=IP+normalize(rnd()+vec3(.8,.3,0.))*(.3+2.*aSeed.z)*(1.-exp(-t*6.));
     vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=aSeed.y*6.28;put(p,.1+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
    const ring=S.groundRing(L.decal,3.0);
    a.pose=function(te,o){
      const ia=te-TI;
      caster.position.x=HC-0.12*ss(0,TW,te)+0.42*ss(TW,TI,te)-0.3*ss(TI+0.05,DUR-0.02,te);
      caster.rotation.z=0.28*ss(0,TW,te)-0.55*ss(TW,TI,te)+0.27*ss(TI+0.05,DUR-0.02,te);
      caster.scale.set(1,1-0.08*ss(0,TW,te)*(1-ss(TW,TI,te)),1);
      const hit=hitE(ia,6), sq=hitE(ia,11);
      target.position.x=HT+0.22*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-hit*0.25*Math.cos(ia*15);
      target.scale.set(1+0.1*sq,1-0.16*sq,1+0.1*sq);
      // barrido: la cabeza va del ángulo de arriba (A0) al punto de impacto; la cola se consume tras el golpe
      const head=A0+(A1-A0)*e3((te-TW+0.03)/(TI-TW+0.03)), sv=te>=TW-0.03&&te<TI+0.11, fade=ia>0?1-cl(ia/0.1):1;
      for(const [m,k] of [[swM,0.3],[swE,0.31]]){towardCam(m.position,tmp.set(PV.x+caster.position.x-HC,PV.y,0),k); billboard(m); m.visible=sv; set(m,head,fade);}
      spark.pose(ia,IP,1.05);
      ring.pose(ia,target.position.x-0.1,0,0.32,1);
      if(ia<0){const w=ss(0,TW,te);o.g.set(caster.position.x+0.6,1.2,0.2);o.gs=0.5*w;o.ga=0.1*w;o.li=1.2*w+1.5*ss(TW,TI,te);}
      else{o.g.copy(IP);o.gs=1.1+2.5*ia;o.ga=Math.exp(-ia*12)*0.35;o.li=6*Math.exp(-ia*7);}
      o.ia=ia;o.c.copy(IP);o.shake=0.35;o.dist=0.9;
    };
  }});
};

// =====================================================================
// EMBESTIDA (0,8 s · ti 0,34) — carga con estela de vetas (materia + energía) y polvo de carrera; ola de choque en
// media luna delante; impacto con nube de tierra, salpicadura de la paleta y chispa. Opción push 1|2: empuje.
// =====================================================================
const CHARGE_STY=STROKE_HEAD+`
void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*.8-uT*2.2,vUv.y*.7)).b;
 float w=.25+.75*pow(u,.7);
 float er=styErode(n*.65+.35*(1.-v/w),(1.-u)*.75,.08);
 float body=smoothstep(w,w*.8,v)*er*smoothstep(0.,.25,u);float core=smoothstep(w*.4,w*.15,v)*er*smoothstep(.4,1.,u);
 float a=strokeOut(body,core,1.);if(a<.01)discard;
 gl_FragColor=vec4(strokeCol(core,1.-u),a*uA);}`;
const BOW_STY=`void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.02)discard;
 float er=styErode(m*.5+s.b*.5,uP,.1);
 gl_FragColor=vec4(styRamp(.62+.38*s.g)*1.2,m*er*uA);}`;
B.EMBESTIDA=function(cfg){
  const HC=-2.6,HT=1.6,XC=HT-0.85,TC=0.12,TI=0.34,DUR=0.8,IP=V3(XC+0.45,0.85,0),PUSH={normal:0,empuje:1,empuje2:2};
  const cx=te=>{
    if(te<TC)return HC-0.18*ss(0,TC,te);
    if(te<TI){const k=(te-TC)/(TI-TC);return HC-0.18+(XC-HC+0.18)*Math.pow(k,1.7);}
    return XC-0.3*ss(TI,TI+0.1,te)-(XC-0.3-HC)*ss(TI+0.12,DUR-0.04,te);
  };
  return mk(cfg,{key:"sty_basic_embestida",name:"Embestida (estilizado)",pal:"Baba",dur:DUR,ti:TI,tier:2,
    anchors:{caster:HC,target:HT},
    phases:[["Arranque",0],["Carga",TC],["Impacto",TI],["Regreso",0.46]],
  build(a){
    const L=a.L,VG=variantGroups(a,["empuje"]),uD={value:0};
    const tg=new THREE.PlaneGeometry(1,1.1).translate(-0.5,0,0);
    const tM=S.mat(CHARGE_STY,{uL:{value:0}},{mode:'matter'}), tE=S.mat(CHARGE_STY,{uL:{value:1}},{mode:'energy'});
    const trail=new THREE.Group();
    for(const m of [tM,tE]){const a1=new THREE.Mesh(tg,m),a2=new THREE.Mesh(tg,m);a2.rotation.x=Math.PI/2;if(m===tE){a1.renderOrder=a2.renderOrder=1;}trail.add(a1,a2);}
    L.trail.add(trail);
    const bow=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(BOW_STY,{},{mode:'energy',depthTest:false})); L.mesh.add(bow);
    const spark=S.hitSpark(L.mesh,2.0,{seed:0.19,toCam:0.5,spin:0.15});
    const K=`const float TC=${f(TC)};const float TI=${f(TI)};const vec3 IP=${v3(IP)};
    float cxs(float t){float k=clamp((t-TC)/(TI-TC),0.,1.);return ${f(HC-0.18)}+${f(XC-HC+0.18)}*pow(k,1.7);}`;
    // polvo de la carrera
    S.pts(L.part,14,VV+K+`void main(){float s=TC+aSeed.x*(TI-TC);float life=.38+aSeed.y*.22;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=vec3(cxs(s)-.3,.1,(aSeed.z-.5)*.6)+vec3(-.5*t,t*(.4+.35*aSeed.w),(aSeed.z-.5)*.5*t);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;
     put(p,(.24+.16*aSeed.w)*(.6+.8*age));}`,DUST);
    // nube de tierra del impacto
    S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.42+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()*vec3(.7,.5,1.)+vec3(.6,.45,0.));vec3 p=IP+vec3(0.,-.45,0.)+d*(.3+1.1*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,t*.35,0.);p.y=max(p.y,.12);
     vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;
     put(p,(.36+.26*aSeed.w)*(.6+.8*age));}`,DUST);
    // salpicadura del color de la paleta (gotas de materia)
    S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.36+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(vec3(.5+aSeed.w,1.2+aSeed.y,(aSeed.z-.5)*2.4))*(2.4+1.8*aSeed.x);vec3 p=IP+v*t+vec3(0.,-8.5*t*t,0.);
     vec2 vel=vec2(v.x,v.y-17.*t);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(vel.x,vel.y);
     put(p,.18+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1'}));
    const kit=pushKit(VG.empuje,V3(HT,0,0),V3(1,0,0),TI,uD,DUR);
    const ring=S.groundRing(L.decal,3.4);
    a.setVariant=v=>{if(!(v in PUSH))v="normal";a.v=v;uD.value=PUSH[v]*PT;const on=PUSH[v]>0;
      for(const k of VFX.LK)VG.empuje[k].visible=on;};
    a.pose=function(te,o){
      const ia=te-TI, x=cx(te), dash=te>=TC&&te<TI?(te-TC)/(TI-TC):0;
      caster.position.x=x;
      caster.rotation.z=0.2*ss(0,TC,te)-0.45*ss(TC,TC+0.06,te)+0.45*ss(TI,TI+0.12,te)-0.2*ss(TI+0.12,DUR-0.04,te);
      caster.scale.set(1+0.12*dash,1-0.1*ss(0,TC,te)*(1-ss(TC,TC+0.05,te)),1);
      const tl=te<TI?x:XC;
      trail.visible=te>TC&&ia<0.28; trail.position.set(tl+0.25,0.75,0); trail.scale.set(Math.max(tl-(HC-0.18),0.001),1,1);
      const ta=ia>0?1-cl(ia/0.28):ss(TC,TC+0.05,te); tM.uniforms.uA.value=ta; tE.uniforms.uA.value=ta;
      // ola de choque delante: media luna abierta hacia atrás
      towardCam(bow.position,tmp.set(x+0.6,0.85,0),0.3); billboard(bow,-Math.PI/2); bow.visible=dash>0||(ia>=0&&ia<0.12);
      bow.scale.setScalar(0.7+0.5*dash+0.6*cl(ia/0.12)); set(bow,ia>0?cl(ia/0.12):-0.2,Math.min(1,ss(0,0.2,dash)+(ia>=0?1:0)));
      spark.pose(ia,IP,1);
      ring.pose(ia,IP.x,0,0.45,1);
      const D=uD.value, hit=hitE(ia,6);
      target.position.x=HT+(D>0?kit.disp(te)+0.08*hit:0.3*hit*(1-Math.exp(-Math.max(ia,0)*25)));
      target.rotation.z=-hit*0.3*Math.cos(ia*14);
      if(D>0)kit.upd(te);
      if(te<TC){o.g.set(HC+0.4,0.9,0);o.gs=0.5*ss(0,TC,te);o.ga=0.1*ss(0,TC,te);o.li=1.2*ss(0,TC,te);}
      else if(te<TI){o.g.set(x+0.55,0.9,0);o.gs=1;o.ga=0.2;o.li=2.5;}
      else{o.g.copy(IP);o.gs=1.2+2.5*ia;o.ga=Math.exp(-ia*11)*0.35;o.li=6*Math.exp(-ia*5);}
      o.ia=ia;o.c.copy(IP);o.shake=0;o.dist=0.9;
    };
  }},[["normal","Normal"],["empuje","Empuje 1"],["empuje2","Empuje 2"]],c=>(c.push|0)>=2?"empuje2":(c.push|0)>=1?"empuje":"normal");
};

// =====================================================================
// ESTOCADA (0,5 s · ti 0,17) — hoja recta: vaina de materia del color oscuro + filo de energía que se afina hacia la
// punta; destello de cuatro puntas que viaja con la punta; onda de aire al clavarse y chispas que salen por detrás.
// =====================================================================
const BLADE_STY=STROKE_HEAD+`
void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float w=.95*(1.-u*.75);float er=styErode(styNoise(vec2(u*1.2-uT*3.,vUv.y)).b*.6+.4*(1.-v/w),uP,.08);
 float body=smoothstep(w,w*.8,v)*er;float core=smoothstep(w*.45,w*.2,v)*er;
 float a=strokeOut(body,core,1.)*smoothstep(0.,.08,u);if(a<.01)discard;
 gl_FragColor=vec4(strokeCol(core,1.-u),a*uA);}`;
const GLINT_STY=`void main(){vec4 s=styShape(5.,vUv);float m=s.r;if(m<.02)discard;
 gl_FragColor=vec4(styRamp(.7+.3*s.g)*1.3+vec3(1.,.95,.85)*s.g*.6,m*uA);}`;
const AIRRING_STY=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.5+s.b*.5,uP,.1);
 gl_FragColor=vec4(styRamp(.7+.3*s.g),s.r*er*uA*.8);}`;
B.ESTOCADA=function(cfg){
  const HC=-0.6,HT=1.2,TL=0.1,TI=0.17,DUR=0.5,Y=1.18,E=HT-0.36;
  return mk(cfg,{key:"sty_basic_estocada",name:"Estocada (estilizado)",pal:"Naturaleza",dur:DUR,ti:TI,tier:2,
    anchors:{caster:HC,target:HT},
    phases:[["Guardia",0],["Estocada",TL],["Impacto",TI],["Retirada",0.27]],
  build(a){
    const L=a.L;
    const bg=new THREE.PlaneGeometry(1,0.2).translate(0.5,0,0);
    const bM=S.mat(BLADE_STY,{uL:{value:0}},{mode:'matter'}), bE=S.mat(BLADE_STY,{uL:{value:1}},{mode:'energy'});
    const blade=new THREE.Group();
    for(const m of [bM,bE]){const a1=new THREE.Mesh(bg,m),a2=new THREE.Mesh(bg,m);a2.rotation.x=Math.PI/2;if(m===bE){a1.renderOrder=a2.renderOrder=1;}blade.add(a1,a2);}
    L.trail.add(blade);
    const glint=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(GLINT_STY,{},{mode:'energy',depthTest:false}));
    const air=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3).rotateY(Math.PI/2),S.mat(AIRRING_STY,{},{mode:'energy'}));
    L.mesh.add(glint,air);
    const spark=S.hitSpark(L.mesh,1.2,{seed:0.66,toCam:0.45,spin:0.78});
    const K=`const float TI=${f(TI)};const vec3 EP=${v3(V3(E,Y,0))};const vec3 BK=${v3(V3(HT+0.3,Y,0))};`;
    // chispas que salen por detrás del objetivo (perforación) y astillas de materia en la entrada
    S.pts(L.part,16,VV+K+`void main(){float s=TI+.01+aSeed.x*.04;float life=.22+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(vec3(1.4,.1,0.)+(rnd()*vec3(.3,.6,.6)));vec3 p=BK+d*(.3+2.2*aSeed.z)*(1.-exp(-t*6.));
     vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=atan(d.y,d.x);put(p,.11+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
    S.pts(L.part,6,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.35+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(-.6,.5,.4))*(1.6+1.2*aSeed.z);vec3 p=EP+v*t+vec3(0.,-6.5*t*t,0.);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.13+.06*aSeed.w);}`,
     S.MATTER_FS(C.shard,{relief:3,col:'uC2',bias:.1}));
    const ring=S.groundRing(L.decal,1.6);
    a.pose=function(te,o){
      const ia=te-TI;
      caster.position.x=HC-0.1*ss(0,TL,te)+0.4*ss(TL,TI,te)-0.3*ss(TI+0.08,DUR-0.04,te);
      caster.rotation.z=0.15*ss(0,TL,te)-0.35*ss(TL,TI,te)+0.2*ss(TI+0.08,DUR-0.04,te);
      const hit=hitE(ia,9);
      target.position.x=HT+0.1*hit; target.rotation.z=-hit*0.12*Math.cos(ia*20);
      const S0=caster.position.x+0.38;
      const tip=te<TL?S0:(te<TI?S0+(E-S0)*Math.pow((te-TL)/(TI-TL),0.8):E+0.2*ss(TI,TI+0.04,te));
      const bs=S0+(tip-S0)*ss(TI+0.05,TI+0.2,te), on=ss(TL-0.01,TL+0.02,te);
      blade.visible=te>=TL-0.01&&te<TI+0.22; blade.position.set(bs,Y,0); blade.scale.set(Math.max(tip-bs,0.001),1,1);
      const er=-0.2+1.2*ss(TI+0.04,TI+0.21,te);
      for(const m of [bM,bE]){m.uniforms.uA.value=on;m.uniforms.uP.value=er;}
      // destello de la punta: se carga en guardia, viaja con la punta y brilla al clavarse
      const gsz=te<TL?0.25+0.25*ss(0,TL,te):(ia<0?0.5:0.5+0.4*Math.exp(-ia*20)-0.5*ss(TI+0.05,TI+0.2,te));
      towardCam(glint.position,tmp.set(tip,Y,0),0.3); billboard(glint,te*6); glint.visible=te<TI+0.2;
      glint.scale.setScalar(Math.max(gsz,0.001)); glint.material.uniforms.uA.value=ss(0,0.05,te)*(1-ss(TI+0.1,TI+0.2,te));
      // onda de aire en el punto de entrada (anillo perpendicular a la hoja)
      const ap=cl(ia/0.2); air.position.set(E,Y,0); air.visible=ia>=0&&ap<1; air.scale.setScalar(0.5+0.8*ap); set(air,0.1+0.9*ap,1);
      spark.pose(ia,tmp.set(E,Y,0),0.9);
      ring.pose(ia,target.position.x,0,0.25,0.8);
      if(ia<0){o.g.set(tip,Y,0.2);o.gs=te<TL?0.4:0.6;o.ga=te<TL?0.1*ss(0,TL,te):0.2;o.li=te<TL?1*ss(0,TL,te):2.5;}
      else{o.g.set(E,Y,0.2);o.gs=0.7+1.5*ia;o.ga=Math.exp(-ia*14)*0.3;o.li=4*Math.exp(-ia*8);}
      o.ia=ia;o.c.set(E,Y,0);o.shake=0;o.dist=0.35;
    };
  }});
};

// =====================================================================
// GOLPE_SISMICO (1,0 s · ti 0,42 · nivel 3) — salto con sombra de contacto, pisotón con columna de presión, grietas
// oscuras con vetas incandescentes, rocas sólidas con luz en bandas, anillo de polvo hasta el radio y cascotes.
// Opción radius (casillas, 1 por defecto).
// =====================================================================
const STOMP_STY=`void main(){float h=vP.y/2.4+.5;float an=atan(vP.z,vP.x);
 float n=styNoise(vec2(an*.48,h*.8+uT*2.2)).b;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
 float er=styErode(n*.7+fr*.3,.25+.5*uP,.1);float bot=pow(1.-h,1.4);
 gl_FragColor=vec4(styRamp(.42+.35*bot),er*(.2+bot)*smoothstep(1.,.75,h)*uA*.55);}`;
// grietas: capa oscura (materia) y capa de vetas incandescentes (energía) con la misma máscara
const CRACK_STY=(R,glow)=>`void main(){vec2 p=(vUv-.5)*${f(R*2)};float r=length(p);float an=atan(p.y,p.x);
 float j=styNoise(vec2(r*.35,an*.25)).r-.5;
 float ray=1.-abs(fract(an*${f(7/6.2832)}+j*.35)*2.-1.);
 float ray2=(1.-abs(fract(an*${f(13/6.2832)}+j*.6+.31)*2.-1.))*smoothstep(${f(R*0.3)},${f(R*0.65)},r);
 float reach=smoothstep(uP*${f(R)}+.05,uP*${f(R)}-.25,r)*smoothstep(${f(R)},${f(R*0.8)},r)*smoothstep(.05,.25,r);
 float wid=(.11+.16*uP)*(1.-r/${f(R*1.1)});
 float cr=max(smoothstep(1.-wid,1.,ray),smoothstep(1.-wid*.6,1.,ray2)*.8)*reach;
 ${glow?`float gw=max(smoothstep(1.-wid*.45,1.,ray),smoothstep(1.-wid*.3,1.,ray2)*.7)*reach;if(gw<.01)discard;
 gl_FragColor=vec4(styRamp(.75+.25*gw)*1.3,gw*uA);}`
 :`if(cr<.01)discard;gl_FragColor=vec4(mix(vec3(.05,.035,.025),uShadeCol*.08,.3),cr*.9*uA);}`}`;
const ROCK_STY=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float s=styNoise(vP.xy*.5+vP.z*.3).r;
 vec3 c=styRampOf(mix(${ROCK},uC2,.25),.22+.55*l+.15*s)*styTint(l);
 float seam=smoothstep(.82,.9,styNoise(vP.xz*.7+.3).g);c+=styRamp(.85)*seam*uP*1.2;
 gl_FragColor=vec4(c,1.);}`;
B.GOLPE_SISMICO=function(cfg){
  cfg=cfg||{};
  const HC=-1.1,HT=1.1,TR=0.26,TI=0.42,DUR=1.0,R=0.5+(cfg.radius||1),RF=R+0.2;
  return mk(cfg,{key:"sty_basic_golpe_sismico",name:"Golpe sísmico (estilizado)",pal:"Tierra",dur:DUR,ti:TI,tier:3,
    anchors:{caster:HC,target:HT},
    phases:[["Salto",0],["Pisotón",TR],["Impacto",TI],["Grietas",0.55],["Polvo",0.75]],
  build(a){
    const L=a.L;
    const stomp=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.95,2.4,32,1,true),S.mat(STOMP_STY,{},{mode:'energy'})); L.trail.add(stomp);
    const shadow=S.contactShadow(L.decal,1.3);
    // rocas: parámetros fijos por instancia (sin azar en la pose)
    const rockMat=S.mat(ROCK_STY,{},{mode:'solid'}), rocks=[], rnd=(i,k)=>{const x=Math.sin(i*12.9898+k*78.233)*43758.5453;return x-Math.floor(x);};
    for(let i=0;i<8;i++){const an=i/8*Math.PI*2+rnd(i,1)*0.5, r0=0.35+rnd(i,2)*R*0.45, sp=0.5+rnd(i,3);
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),rockMat);
      m.userData={x:Math.cos(an)*r0,z:Math.sin(an)*r0,vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:2.6+rnd(i,4)*1.6,s:0.17+rnd(i,5)*0.14,
        rx:rnd(i,6)*12-6,ry:rnd(i,7)*12-6,rz:rnd(i,8)*12-6,d:r0/R*0.12};
      rocks.push(m); L.mesh.add(m);}
    const K=`const float TI=${f(TI)};const float HT=${f(HT)};const float R=${f(R)};`;
    // anillo de polvo que se abre hasta el radio del área
    S.pts(L.part,34,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;float rad=mix(.3,R*(.85+.2*aSeed.w),1.-exp(-t*5.));
     vec3 p=vec3(HT+cos(an)*rad,.12+.3*aSeed.y*(1.-exp(-t*3.))+t*.18,sin(an)*rad);
     vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t;
     put(p,(.6+.35*aSeed.y)*(.6+.8*age));}`,DUST);
    // cascotes que brotan al paso del frente de grietas
    S.pts(L.part,20,VV+K+`void main(){float an=aSeed.z*6.2832;float r0=sqrt(aSeed.w)*R*.8;
     float s=TI+r0/R*.22+aSeed.x*.05;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=vec3(cos(an)*(.4+.8*aSeed.x),2.5+2.5*aSeed.y,sin(an)*(.4+.8*aSeed.x));
     vec3 p=vec3(HT+cos(an)*r0,.05,sin(an)*r0)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.04);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.18+.1*aSeed.x);}`,
     S.MATTER_FS(C.shard,{relief:3,col:ROCK,bias:.08}));
    const crackD=groundPlane(RF*2,HT,0.02,S.mat(CRACK_STY(RF,false),{},{mode:'matter'}));
    const crackG=groundPlane(RF*2,HT,0.024,S.mat(CRACK_STY(RF,true),{},{mode:'energy'})); crackG.renderOrder=2;
    L.decal.add(crackD,crackG);
    const ring=S.groundRing(L.decal,R*2.3);
    const spark=S.hitSpark(L.mesh,1.8,{seed:0.29,toCam:0.3,spin:0});
    a.pose=function(te,o){
      const ia=te-TI, rk=cl((te-TR)/(TI-TR));
      caster.position.x=HC+0.35*ss(0.1,TI,te)-0.35*ss(TI+0.15,DUR-0.05,te);
      caster.position.y=te<TR?0.45*ss(0,TR,te):(te<TI?0.45*(1-rk*rk):0);
      caster.rotation.z=0.25*ss(0,TR,te)-0.5*ss(TR,TI,te)+0.25*ss(TI+0.1,DUR-0.08,te);
      const sq=hitE(ia,10), st=te<TI?0.08*ss(0,TR,te)*(1-rk):0;
      caster.scale.set(1+0.12*sq,1+st-0.18*sq,1+0.12*sq);
      const hy=caster.position.y; shadow.pose(caster.position.x,0,0.9-0.5*hy,hy>0.01?0.9:0);
      const ys=ia<0?1:1-0.85*cl(ia/0.12);
      stomp.visible=te>=TR&&ia<0.16; stomp.position.set(HT,(ia<0?1.2+3.0*(1-rk*rk):1.2*ys),0); stomp.scale.set(1+0.25*(1-ys),ys,1+0.25*(1-ys));
      set(stomp,ia<0?0:cl(ia/0.16),ss(TR,TR+0.06,te));
      const fp=e3(ia/0.25);
      crackD.visible=crackG.visible=ia>=0;
      set(crackD,fp,ia>=0?1-ss(0.75,DUR,te):0);
      set(crackG,fp,ia>=0?Math.exp(-ia*3.5)*(1-ss(0.8,DUR,te)):0);
      ring.pose(ia,HT,0,0.5,1);
      spark.pose(ia,tmp.set(HT,0.45,0),1.05);
      rockMat.uniforms.uP.value=ia>=0?Math.exp(-ia*3):0;
      for(const m of rocks){const u=m.userData,t=Math.max(ia-u.d,0),tl=u.vy/4.5,tt=Math.min(t,tl);
        m.visible=ia>=u.d&&te<0.97;
        m.position.set(HT+u.x+u.vx*tt,0.05+u.vy*tt-4.5*tt*tt,u.z+u.vz*tt); m.rotation.set(u.rx*tt,u.ry*tt,u.rz*tt);
        m.scale.setScalar(Math.max(u.s*ss(0,0.04,t)*(1-ss(0.68,0.97,te)),0.001));}
      const air=ia>0?Math.sin(Math.PI*cl(ia/0.35)):0, hit=hitE(ia,6);
      target.position.set(HT,0.35*air,0); target.rotation.z=-hit*0.3*Math.cos(ia*13);
      if(te<TR){o.g.set(caster.position.x+0.3,1.4,0);o.gs=0.5*ss(0,TR,te);o.ga=0.1*ss(0,TR,te);o.li=1.2*ss(0,TR,te);}
      else if(ia<0){o.g.set(HT,stomp.position.y-0.8,0);o.gs=1.2;o.ga=0.2;o.li=3;}
      else{o.g.set(HT,0.5,0);o.gs=1.6+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.35;o.li=8*Math.exp(-ia*4.5);}
      o.ia=ia;o.c.set(HT,0.4,0);o.shake=0.9;o.dist=1.1;
    };
  }});
};

// =====================================================================
// GIRO_EMPUJE (0,9 s · ti 0,44) — remolino de viento (cintas de vetas) con hojas iluminadas que orbitan; al soltarse,
// ráfaga en cruz en el suelo, las hojas salen despedidas y los vecinos son empujados hacia fuera (push 1|2).
// Opción vecinos: dos rivales más (izquierda y detrás).
// =====================================================================
const RIB_STY=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*1.4-uT*1.8+uP,vUv.y*.5)).b;
 float er=styErode(n*.7+.3*(1.-v),.35,.12);
 float m=er*smoothstep(1.,.5,v)*smoothstep(0.,.12,u)*smoothstep(1.,.7,u);if(m<.01)discard;
 gl_FragColor=vec4(styRamp(.6+.3*n),m*uA*.75);}`;
B.GIRO_EMPUJE=function(cfg){
  cfg=cfg||{};
  const C0=-0.6,DN=1.6,TB=0.38,TI=0.44,DUR=0.9,GS=2*(DN+0.6);
  const NB0=V3(C0+DN,0,0),NB1=V3(C0-DN,0,0),NB2=V3(C0,0,-DN);
  const GUST_STY=`void main(){vec2 p=(vUv-.5)*${f(GS)};float r=length(p);float an=atan(p.y,p.x);
   float lobe=pow(abs(cos(an*2.)),5.);float fr=uP*${f(DN+0.2)};
   float wave=smoothstep(.55,0.,fr-r)*step(r,fr+.05)*smoothstep(.25,.5,r)*lobe;
   float er=styErode(styNoise(vUv*1.6+vec2(uT*.4,0.)).b*.7+wave*.3,.25,.12);
   float m=wave*er;if(m<.01)discard;
   gl_FragColor=vec4(styRamp(.55+.45*wave),m*uA*.85);}`;
  const def=mk(cfg,{key:"sty_basic_giro_empuje",name:"Giro de empuje (estilizado)",pal:"Naturaleza",dur:DUR,ti:TI,tier:2,
    anchors:{caster:C0,target:NB0.x},
    phases:[["Remolino",0],["Ráfaga",TB],["Impacto",TI],["Empuje",0.6]],
  build(a){
    const L=a.L,VG=variantGroups(a,["vecinos"]),uD={value:(cfg.push==null?1:cfg.push)*PT};
    // vórtice: tres cintas de viento en hélice, colgadas de un grupo que gira
    const vortex=new THREE.Group(); vortex.position.set(C0,0,0); L.mesh.add(vortex); const rib=[];
    for(let i=0;i<3;i++){const m=S.mat(RIB_STY,{},{mode:'energy'}); m.uniforms.uP.value=i*0.37; rib.push(m);
      const r=new THREE.Mesh(helixGeo(1.3,0.85,0.55,1.9,0.26,80),m); r.position.y=0.1; r.rotation.y=i*2.094; vortex.add(r);}
    // hojas de materia iluminada: orbitan y se cierran durante el giro; al soltarse salen despedidas
    S.pts(L.part,46,VV+`const float TB=${f(TB)};
     void main(){float tb=max(uT-TB,0.);float a2=aSeed.x*6.2832+min(uT,TB)*(7.+3.*aSeed.y)+tb*2.;
      float rad=.75+.25*aSeed.z-.2*smoothstep(0.,TB,uT)+(1.-exp(-tb*4.))*(1.6+1.2*aSeed.w);
      float y=.15+aSeed.w*1.6+sin(uT*5.+aSeed.x*9.)*.08+.25*smoothstep(0.,TB,uT)-tb*.4;
      vec3 p=vec3(${f(C0)}+cos(a2)*rad,y,sin(a2)*rad);
      vA=smoothstep(0.,.12,uT-aSeed.y*.1);vK=smoothstep(.62,.88,uT);vR=a2*1.3+aSeed.z*6.+uT*8.;
      put(p,.22+.1*aSeed.y);}`,S.MATTER_FS(C.leaf,{relief:3,bias:.08}));
    const sparks=[S.hitSpark(L.mesh,1.3,{seed:0.71,toCam:0.45}),S.hitSpark(VG.vecinos.mesh,1.3,{seed:0.44,toCam:0.45}),S.hitSpark(VG.vecinos.mesh,1.3,{seed:0.12,toCam:0.45})];
    const k0=pushKit(L,NB0,V3(1,0,0),TI,uD,DUR), k1=pushKit(VG.vecinos,NB1,V3(-1,0,0),TI,uD,DUR), k2=pushKit(VG.vecinos,NB2,V3(0,0,-1),TI,uD,DUR);
    const gust=groundPlane(GS,C0,0.028,S.mat(GUST_STY,{},{mode:'energy'})); L.decal.add(gust);
    const ring=S.groundRing(L.decal,2.6);
    a.setVariant=v=>{if(v!=="vecinos")v="uno";a.v=v;const on=v==="vecinos";
      for(const k of VFX.LK)VG.vecinos[k].visible=on;};
    a.pose=function(te,o){
      const ia=te-TI, spin=ss(0,0.12,te)*(1-ss(TB,TB+0.06,te)), bk=cl((te-TB)/0.22), nb=a.v==="vecinos";
      caster.position.set(C0,0.12*Math.sin(Math.PI*cl(te/TI)),0);
      caster.rotation.z=0.1*Math.sin(te*34)*spin;
      caster.scale.set(1,1-0.06*ss(TB-0.1,TB,te)*(1-ss(TB,TB+0.1,te)),1);
      const va=ss(0,0.1,te)*(1-ss(TB+0.04,TB+0.24,te)), vs=1+1.4*(te>=TB?e3(bk):0);
      vortex.rotation.y=te*(10+8*ss(0,TB,te)); vortex.scale.set(vs,1-0.3*(te>=TB?e3(bk):0),vs);
      for(const m of rib)m.uniforms.uA.value=va;
      vortex.visible=va>0.001;
      set(gust,e3(bk),te>=TB?1-ss(TI+0.1,TI+0.35,te):0); gust.visible=te>=TB&&te<TI+0.35;
      ring.pose(te-TB,C0,0,0.4,1.4);
      const hit=hitE(ia,7), d0=k0.disp(te), d1=k1.disp(te), d2=k2.disp(te);
      target.position.x=NB0.x+d0+0.08*hit; target.rotation.z=-hit*0.25*Math.cos(ia*14);
      k0.upd(te);
      if(nb){enemies[0].position.set(NB1.x-d1-0.08*hit,0,0); enemies[0].rotation.z=hit*0.25*Math.cos(ia*14);
        enemies[1].position.set(C0,0,NB2.z-d2-0.08*hit); enemies[1].rotation.z=hit*0.12*Math.sin(ia*14); k1.upd(te); k2.upd(te);}
      const rp=[[target.position.x,0],[NB1.x-d1,0],[C0,NB2.z-d2]];
      sparks.forEach((s,i)=>s.pose(i===0||nb?ia:-1,tmp.set(rp[i][0],1.05,rp[i][1]),0.75));
      if(te<TB){o.g.set(C0,1.0,0);o.gs=1*spin+0.3;o.ga=0.12*spin;o.li=2*spin;}
      else if(ia<0){o.g.set(C0+DN*0.6*e3(bk),1.0,0);o.gs=1.2;o.ga=0.2;o.li=3;}
      else{o.g.set(target.position.x-0.2,1.1,0);o.gs=1+2*ia;o.ga=Math.exp(-ia*11)*0.3;o.li=5*Math.exp(-ia*6);}
      o.ia=ia;o.c.set(target.position.x-0.2,1.1,0);o.shake=0;o.dist=0.7;
    };
  }},[["uno","1 rival"],["vecinos","Vecinos"]],c=>c.vecinos?"vecinos":"uno");
  def.enemies=()=>def.v==="vecinos"?2:0;
  return def;
};

// demostraciones del laboratorio (una por tipo, con sus opciones como variantes; las instancias de enemigos van en
// mod-estilizado-enemigos.js)
const DEMO=[["MORDISCO","Salvaje"],["ZARPAZO","Hielo"],["GOLPE","Madera"],["EMBESTIDA","Baba"],["ESTOCADA","Naturaleza"],["GOLPE_SISMICO","Tierra"],["GIRO_EMPUJE","Naturaleza"]];
VFX.module("Estilizado · Cuerpo a cuerpo",DEMO.filter(([k])=>B[k]).map(([k,pal])=>B[k]({key:"sty_basic_"+k.toLowerCase(),name:k+" (estilizado)",pal,demo:true})));
})();

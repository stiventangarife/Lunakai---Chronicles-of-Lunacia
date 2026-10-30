// =====================================================================
// ESTILIZADO · PLANTA · BOCA (Hito 101) — las 4 cartas de boca de Planta hechas a mano con el kit vfx-stylized.js.
// Claves sty_<clave original> (pbSerious, pbSilence, pbZigzag, pbHerbivore): mismos dur, ti y fases.
// Estética vegetal: trampa carnívora, lianas, raíces y rocío como materia con luz en 3 tonos; la savia y la vida que
// vuelven al Axie son los únicos núcleos de energía.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,helixGeo}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Savia",["#b9ec5c","#2c7a35"]);
VFX.palette("Sty Rocío",["#8cefcc","#1d8a6a"]);
VFX.palette("Sty Clorofila",["#a8f04e","#15703f"]);
const TAU=Math.PI*2, UP=V3(0,1,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const jh=n=>{const s=Math.sin(n*12.9898+78.233)*43758.5453;return s-Math.floor(s);};
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.55,.42,.29)";
const MO=V3(-3.43,1.55,0);               // boca del lanzador
const CX=-3.7;
const TC=V3(3.15,1.2,0);                  // pecho del objetivo, cara visible
const DUST_FS=S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:-.05});
const CLOD_FS=S.MATTER_FS(C.shard,{relief:3,col:'vec3(.34,.24,.15)'});
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.3});
const LEAF_FS=S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.38,.7,.26)',bias:.05});
const SAP_FS=S.MATTER_FS(C.drop,{relief:4,col:'mix(uC1,vec3(.95,.85,.3),.35)',bias:.1});
const burstVS=(O,D,v0,v1,g,life,sz,t0,spread=.06,spin=9)=>VV+`const vec3 O=${v3(O)};
void main(){float s=${f(t0)}+aSeed.x*${f(spread)};float life=${f(life)}+aSeed.y*${f(life*.4)};float age=(uT-s)/life;float t=max(uT-s,0.);
 vec3 v=normalize(rnd()+vec3(${D}))*(${f(v0)}+${f(v1-v0)}*aSeed.z);vec3 p=O+v*t+vec3(0.,-${f(g)}*t*t,0.);
 vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*${f(spin)}*(aSeed.w-.5);
 put(p,${sz});}`;
const dustRingVS=(O,r0,r1,t0,life,sz)=>VV+`const vec3 O=${v3(O)};
void main(){float s=${f(t0)}+aSeed.x*.06;float life=${f(life)}+aSeed.y*${f(life*.35)};float age=(uT-s)/life;float t=max(uT-s,0.);
 float an=aSeed.z*6.2832;vec3 p=O+vec3(cos(an),0.,sin(an))*(${f(r0)}+${f(r1-r0)}*(1.-exp(-t*4.)))+vec3(0.,.12+t*.35*aSeed.w,0.);
 vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t;
 put(p,(${sz})*(.7+.5*age));}`;
// materia vegetal sólida (trampa, lianas, raíces): luz en 3 bandas, vetas, interior rojizo opcional (uIn), erosión (uEr)
const PLANT_FS=`uniform float uEr;uniform float uIn;uniform float uGl;uniform vec3 uBase;
void main(){vec3 n=normalize(vN);float side=gl_FrontFacing?1.:-1.;n*=side;float l=styLight(n,stySunV());
 vec2 tc=vec2(vUv.x*2.,vUv.y)*.8+vP.xy*.15;float g=styNoise(tc).b;float vein=smoothstep(.06,0.,abs(fract(g*4.)-.5)-.38);
 vec3 c=styRampOf(uBase,.1+.5*l+vein*.1)*styTint(l);c*=.85;
 vec3 inn=styRampOf(vec3(.86,.12,.16),.35+.5*l)*styTint(l);c=mix(c,inn,uIn*step(side,0.));
 float e=styNoise(tc*1.4+.37).r;if(e<uEr)discard;
 c+=uC1*(smoothstep(uEr+.08,uEr,e)*step(.001,uEr)*1.2+uGl*.4);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.15*smoothstep(.62,.72,fr)*step(.5,l);
 gl_FragColor=vec4(c,1.);}`;
const plantMat=(base,o={})=>S.mat(PLANT_FS,{uEr:{value:-0.1},uIn:{value:o.inner||0},uGl:{value:0},uBase:{value:new THREE.Color().setRGB(base[0],base[1],base[2])}},
  Object.assign({mode:'solid'},o.double?{side:THREE.DoubleSide}:{}));
const defs=[];

// =====================================================================
// 1 · SERIOUS (81–99 de daño; −1 PM al lanzador) — una trampa carnívora espinosa brota tras el rival, se abre sobre
//     su cabeza y muerde; le exprime la savia en gotas doradas y una semilla de savia vuelve por el aire hasta la boca
//     del Axie, que se envuelve en una espiral verde. ti 0,62 s
// =====================================================================
defs.push({key:"sty_pbSerious",zoneCaster:0.35,zoneTarget:1.3,name:"Serious (estilizado)",dur:2.4,ti:0.62,pal:"Sty Savia",tier:2,stylized:true,
  phases:[["Brote",0],["Acecho",0.22],["Cierre",0.5],["Drenaje",0.62],["Savia",1.05],["Vigor",1.55],["Fin",2.05]],
build(a){
  const L=a.L,TO=0.22,TC0=0.5,TI=0.62,TG=0.72,TS=1.05,TA=1.55,TE=2.05,JC=V3(3.0,1.75,0.55),HX=0.5,TS_=1.6;
  const mat=plantMat([0.14,0.36,0.08],{double:true,inner:1});
  // dos lóbulos (media esfera aplanada) con bisagra detrás de la cabeza; dientes en el borde
  const trap=new THREE.Group(); trap.position.copy(JC); L.mesh.add(trap);
  const lobes=[1,-1].map(sg=>{const piv=new THREE.Group();piv.position.set(HX,0,0);trap.add(piv);
    const shell=new THREE.Mesh(new THREE.SphereGeometry(0.62,26,14,0,TAU,0,Math.PI/2),mat);
    shell.scale.set(1,0.7*sg,0.9);shell.position.set(-HX,0,0);piv.add(shell);
    const tg=new THREE.ConeGeometry(0.035,0.2,6).translate(0,0.1,0);
    for(let i=0;i<9;i++){const an=Math.PI*0.55+i/8*Math.PI*0.9;const t=new THREE.Mesh(tg,mat);
      t.position.set(-HX+Math.cos(an)*0.6,0,Math.sin(an)*0.55);t.scale.multiplyScalar(1.3);t.rotation.z=sg>0?Math.PI:0;t.scale.y=sg>0?-1:1;piv.add(t);}
    return piv;});
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.12,1,8).translate(0,0.5,0),plantMat([0.2,0.44,0.12]));
  stem.position.set(JC.x+0.62*TS_,0,JC.z); L.mesh.add(stem);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.52}), ring=S.groundRing(L.decal,2.4), ringC=S.groundRing(L.decal,2.4);
  const seed=new THREE.Mesh(new THREE.SphereGeometry(0.15,18,12),S.mat(`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
   gl_FragColor=vec4(styRampOf(mix(uC1,vec3(1.,.85,.3),.45),.45+.45*l)*1.3+vec3(1.,.9,.6)*.25,1.);}`,{},{mode:'solid'})); L.mesh.add(seed);
  const helix=new THREE.Mesh(helixGeo(2.2,0.6,0.42,1.8,0.12,140),S.mat(`void main(){float u=vUv.x;if(u>uP)discard;float v=abs(vUv.y-.5)*2.;
   float head=smoothstep(.08,0.,uP-u)*step(uP,.99);gl_FragColor=vec4(styRamp(.5+.4*u)*1.2+vec3(1.,.95,.7)*head*.5,(smoothstep(1.,.3,v)*(.4+.6*u)+head)*uA);}`,{},{mode:'energy'}));
  helix.position.set(CX,0.05,0); L.trail.add(helix);
  const B0=JC.clone(), B1=V3(1.2,3.0,0), B2=MO.clone();
  const qb=(u,out)=>{const s=1-u;return out.set(B0.x*s*s+2*B1.x*s*u+B2.x*u*u,B0.y*s*s+2*B1.y*s*u+B2.y*u*u,0);};
  a.count+=S.pts(L.part,10,dustRingVS(V3(JC.x+0.55,0,0),0.15,0.7,0.02,0.45,'.26+.12*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,16,burstVS(JC.clone().add(V3(-0.3,0,0)),"-.2,.3,0.",1.2,2.6,6.,.55,'.18+.08*aSeed.w',TI,0.12),SAP_FS);
  // estela de savia de la semilla
  a.count+=S.pts(L.part,24,VV+`const vec3 B0=${v3(B0)};const vec3 B1=${v3(B1)};const vec3 B2=${v3(B2)};
   vec3 qb(float u){float s=1.-u;return B0*s*s+2.*B1*s*u+B2*u*u;}
   void main(){float s=${f(TG)}+aSeed.x*${f(TS-TG)};float u=(s-${f(TG)})/${f(TS-TG)};float life=.35;float age=(uT-s)/life;
   vec3 p=qb(u)+rnd()*.06+vec3(0.,-.4*max(uT-s,0.),0.);vA=(age>0.&&age<1.)?1.-age:0.;vK=0.;vR=0.;put(p,.12+.06*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  a.count+=S.pts(L.part,18,VV+`void main(){float s=${f(TS)}+aSeed.x*.5;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.;vec3 p=vec3(${f(CX)},0.,0.)+vec3(cos(an)*.55,.2+t*1.6,sin(an)*.55);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=smoothstep(.6,1.,age);vR=an;put(p,.22+.08*aSeed.w);}`,LEAF_FS);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0,TO,te), open=ss(TO,TC0,te), close=ss(TC0,TI,te), out=ss(TS,TA,te);
    trap.visible=stem.visible=grow>0.001&&out<0.99;
    const sc=Math.max(TS_*grow*(1+0.06*hitE(ia,10)),0.001); trap.scale.setScalar(sc);
    trap.position.set(JC.x+0.08*Math.sin(te*16)*(1-close)*open,JC.y+0.05*Math.sin(te*9)*(1-close),JC.z);
    const ang=(0.08+0.85*open)*(1-close)+0.05*hitE(ia,14);
    lobes[0].rotation.z=-ang; lobes[1].rotation.z=ang;
    stem.scale.set(1,Math.max(JC.y*grow,0.001),1);
    const er=-0.1+1.15*out; mat.uniforms.uEr.value=er; stem.material.uniforms.uEr.value=er; mat.uniforms.uGl.value=hitE(ia,6)*0.6;
    spark.pose(ia,tmp.set(JC.x-0.6,JC.y,JC.z),1.2); ring.pose(ia,3.4,0,0.45,0.9);
    const su=cl((te-TG)/(TS-TG)); seed.visible=te>=TG&&te<TS; qb(su,seed.position); seed.scale.setScalar(0.6+0.5*Math.sin(Math.PI*su));
    const hk=ss(TS,TA,te); helix.visible=te>=TS&&te<TE; set(helix,hk,1-ss(TA+0.2,TE,te)); helix.rotation.y=te*3;
    ringC.pose(te-TS,CX,0,0.5,0.8);
    const hit=hitE(ia,6); target.position.x=3.4+0.14*hit; target.rotation.z=-hit*0.2*Math.cos(ia*14); target.scale.y=1-0.1*hit;
    caster.rotation.z=-0.08*ss(TS,TS+0.1,te)*(1-ss(TA,TE,te));
    o.em=0.35*ss(TS,TS+0.15,te)*(1-ss(TA,TE,te)); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(JC);o.gs=0.5*grow;o.ga=0.08*grow;o.li=1.2*grow;}
    else if(te<TS){qb(su,o.g);o.gs=0.8;o.ga=0.2;o.li=2.5+3*hit;}
    else{o.g.set(CX,1,0);o.gs=1.2;o.ga=0.15*(1-out);o.li=2.5*(1-ss(TA,TE,te));}
    o.ia=ia;o.c.set(3.25,1.6,0);o.shake=0;o.dist=0.55;
  };
}});

// =====================================================================
// 2 · SILENCE WHISPER (aliado: cura 65) — un susurro suelta tres ondas apagadas de color menta que viajan al aliado;
//     una burbuja de silencio lo envuelve (tapa el ruido del tablero) y dentro le cae un rocío revitalizante: vaho,
//     gotas y motas de cura que suben. ti 0,65 s
// =====================================================================
defs.push({key:"sty_pbSilence",name:"Silence Whisper (estilizado)",dur:2.4,ti:0.65,pal:"Sty Rocío",tier:2,allies:1,stylized:true,
  phases:[["Susurro",0],["Ondas",0.22],["Bruma",0.65],["Rocío",1.05],["Fin",2.0]],
build(a){
  const L=a.L,TW=[0.12,0.26,0.4],TV=0.32,TI=0.65,TE=2.0,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.0,0));
  const WAVE_FS=`void main(){vec4 s=styShape(7.,vUv);if(s.r<.02)discard;float er=styErode(s.r*.55+s.b*.45,uP,.12);
   gl_FragColor=vec4(styRampOf(uC1,.45+.35*s.g),s.r*er*uA*.85);}`;
  const waves=TW.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),S.mat(WAVE_FS,{},{mode:'matter',depthTest:false}));L.mesh.add(m);return m;});
  const BUB_FS=`void main(){vec3 n=normalize(vN);float fr=pow(1.-abs(dot(n,normalize(vV))),1.8);float l=styLight(n,stySunV());
   float sw=styNoise(vUv*vec2(3.,1.5)+vec2(uT*.08,0.)).r;float er=styErode(sw*.7+.3,uP,.1);if(er<.01)discard;
   vec3 c=styRampOf(uC2,.2+.4*l+.35*fr)*styTint(l);float hl=smoothstep(.92,.97,dot(reflect(-stySunV(),n),normalize(vV)));
   gl_FragColor=vec4(c+vec3(1.)*hl*.5,(.18+.6*fr+hl*.5)*er*uA);}`;
  const bub=new THREE.Mesh(new THREE.SphereGeometry(1.0,32,20),S.mat(BUB_FS,{},{mode:'matter'})); bub.position.set(AP.x,0.95,AP.z); L.mesh.add(bub);
  const ring=S.groundRing(L.decal,2.6);
  const pool=groundPlane(2.2,AP.x,0.018,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+.4).r*.6+styNoise(vUv*2.).g*.4;
   float m=smoothstep(uP*(.85+.3*n),uP*(.85+.3*n)-.15,r);if(m<.01)discard;
   gl_FragColor=vec4(styRampOf(uC1,.35+.45*n),m*.5*uA);}`,{},{mode:'matter'})); pool.position.z=AP.z; L.decal.add(pool);
  const K=`const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};const vec3 MO=${v3(MO)};const float TI=${f(TI)};`;
  // susurro: vaho que sale de la boca
  a.count+=S.pts(L.part,10,VV+K+`void main(){float s=aSeed.x*.4;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=MO+vec3(.15+t*.8,(aSeed.y-.5)*.15+t*.2,(aSeed.z-.5)*.2);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*.8:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.2+.1*aSeed.w)*(.6+age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'mix(uC1,vec3(.9,1.,.96),.4)',bias:.05}));
  // bruma de rocío dentro de la burbuja y gotas que caen
  a.count+=S.pts(L.part,24,VV+K+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.5;float rad=.3+.45*r.y;vec3 p=AP+vec3(cos(an)*rad,.25+r.z*1.3+age*.3,sin(an)*rad);
   vA=(k>=1.)?uE*smoothstep(0.,.15,age):0.;vK=smoothstep(.35,1.,age);vR=r.y*6.28+age;put(p,(.42+.3*r.z)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4.5,col:'mix(uC1,vec3(.9,1.,.96),.35)',bias:.08}));
  a.count+=S.pts(L.part,16,VV+K+`void main(){float per=.55;float k=(uT-TI-.25)/per+aSeed.y;float c=floor(k);float tt=fract(k)*per;vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.,1.7-4.*tt*tt,(r.z-.5)*1.);
   vA=(k>=0.&&uT<${f(TE-0.2)}&&p.y>.03)?1.:0.;vK=0.;vR=3.14159;put(p,.14+.05*r.y);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1',bias:.12}));
  a.count+=S.pts(L.part,16,VV+K+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AP+vec3(cos(an)*(.2+.5*r.y),.2+age*(1.5+r.z*.5),sin(an)*(.2+.5*r.y));
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;vK=0.;vR=r.z*6.28;put(p,.1+.06*r.z);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.2,te)*(1-ss(TE-0.4,TE,te));
    let lead=-1;
    waves.forEach((w,i)=>{const u=(te-TW[i])/TV;w.visible=u>0&&u<1.05;
      if(w.visible){w.position.lerpVectors(MO,AC,Math.min(u,1));w.position.y+=0.35*Math.sin(Math.PI*Math.min(u,1));billboard(w);
        w.scale.setScalar(0.5+1.3*Math.min(u,1));set(w,-0.1+0.9*ss(0.75,1.05,u),ss(0,0.1,u));lead=Math.max(lead,u);}});
    bub.visible=te>TI-0.12&&te<TE; const bk=ss(TI-0.12,TI+0.08,te);
    bub.scale.set(0.95*bk*(1+0.04*Math.sin(te*6)),1.05*bk,0.95*bk); set(bub,-0.1+1.1*ss(TE-0.55,TE,te),bk);
    ring.pose(ia,AP.x,AP.z,0.5,1); set(pool,ss(TI,TI+0.6,te),env);
    U.uE.value=env;
    const al=allies[0]; al.userData.m.emissive.copy(U.uC1.value); al.userData.m.emissiveIntensity=0.25*env+0.5*hitE(ia,5);
    caster.rotation.z=0.06*ss(0,0.12,te)*(1-ss(0.4,0.65,te));
    if(ia<0&&lead>=0){o.g.lerpVectors(MO,AC,Math.min(lead,1));o.gs=0.7;o.ga=0.12;o.li=1.5;}
    else if(ia<0){o.g.copy(MO);o.gs=0.5;o.ga=0.08;o.li=1;}
    else{o.g.copy(AC);o.gs=1.4+ia;o.ga=Math.exp(-ia*6)*0.3+0.06*env;o.li=3.5*Math.exp(-ia*4)+1.4*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.4;o.flash=0;
  };
}});

// =====================================================================
// 3 · ZIGZAG (54–66 de daño; drena el 50 %) — un rayo de raíces corre bajo tierra en zigzag (surco de tierra con savia
//     luminosa, brotes en cada quiebro), revienta en raíces espinosas bajo el rival y vuelve por el mismo camino como un
//     pulso de vida que sube por el Axie. ti 0,72 s
// =====================================================================
defs.push({key:"sty_pbZigzag",zoneCaster:0.35,zoneTarget:1.3,name:"Zigzag (estilizado)",dur:2.4,ti:0.72,pal:"Sty Clorofila",tier:2,stylized:true,
  phases:[["Pisada",0],["Rayo",0.32],["Erupción",0.72],["Retorno",0.95],["Vida",1.4],["Fin",2.05]],
build(a){
  const L=a.L,T0=0.32,TI=0.72,TR=0.95,TB=1.4,TE=2.05,X0=-3.1,X1=3.4,LEN=X1-X0,ZK=6,AMP=0.55;
  const zz=u=>{const k=u*ZK;const fr=k-Math.floor(k);return AMP*(Math.floor(k)%2===0?(fr*2-1):(1-fr*2));};
  // surco: tierra removida oscura (materia) con la raíz de savia brillando dentro; uP = cabeza; uQ = pulso de retorno
  const TRAIL_FS=`uniform float uQ;uniform float uEr;
  float zz(float u){float k=u*${f(ZK)};float fr=fract(k);return ${f(AMP)}*(mod(floor(k),2.)<.5?(fr*2.-1.):(1.-fr*2.));}
  void main(){float u=vUv.x;if(u>uP)discard;float z=(vUv.y-.5)*1.8;float d=abs(z-zz(u));
   float n=styNoise(vUv*vec2(6.,1.)).r;float soil=smoothstep(.22+.08*n,.1,d);float core=smoothstep(.06,.02,d);
   float er=styErode(n*.6+.4*(1.-d*3.),uEr,.1);float m=max(soil,core)*er;if(m<.01)discard;
   float head=smoothstep(.06,0.,uP-u)*step(uP,.995);float pulse=smoothstep(.07,0.,abs(u-uQ))*step(.001,uQ);
   vec3 c=styRampOf(vec3(.3,.2,.12),.15+.3*n);vec3 sap=styRamp(.65+.3*n)*1.25+vec3(1.,.95,.7)*(head+pulse)*.6;
   c=mix(c,sap,core*(.55+.45*max(head,pulse)));
   gl_FragColor=vec4(c,m*uA*(.75+.25*core));}`;
  const trail=groundPlane(LEN,(X0+X1)/2,0.024,S.mat(TRAIL_FS,{uQ:{value:0},uEr:{value:-0.1}},{mode:'matter'}),1.8); L.decal.add(trail);
  // raíces espinosas que revientan bajo el rival
  const rmat=plantMat([0.36,0.26,0.13]), roots=[];
  const rg=new THREE.ConeGeometry(0.27,1,7,3).translate(0,0.5,0);
  for(let i=0;i<9;i++){const an=i/9*TAU+jh(i)*0.5, r=0.6+0.4*jh(i+9), m=new THREE.Mesh(rg,rmat);
    m.position.set(X1+Math.cos(an)*r,0,Math.sin(an)*r); m.rotation.set(Math.sin(an)*0.55,0,-Math.cos(an)*0.55); L.mesh.add(m);
    roots.push({m,h:1.7+1.2*jh(i+3),d:jh(i+5)*0.06});}
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.33}), ring=S.groundRing(L.decal,2.8), ringC=S.groundRing(L.decal,2.2);
  const K=`const float X0=${f(X0)};const float LEN=${f(LEN)};const float T0=${f(T0)};const float TI=${f(TI)};const float TR=${f(TR)};
  float zz(float u){float k=u*${f(ZK)};float fr=fract(k);return ${f(AMP)}*(mod(floor(k),2.)<.5?(fr*2.-1.):(1.-fr*2.));}`;
  // brotes en cada quiebro: hojas que asoman cuando pasa la cabeza
  a.count+=S.pts(L.part,7,VV+K+`void main(){float i=floor(aSeed.x*7.);float u=(i+.5)/7.;float s=T0+u*(TI-T0);float t=max(uT-s,0.);float age=t/1.2;
   vec3 p=vec3(X0+u*LEN,.12+.18*(1.-exp(-t*8.)),-zz(u)*.9);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=(aSeed.y-.5)*1.2;put(p,.32*(1.-exp(-t*10.)));}`,LEAF_FS);
  // tierra que salta al paso del rayo
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=T0+aSeed.x*(TI-T0);float u=(s-T0)/(TI-T0);float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(X0+u*LEN,.05,-zz(u)*.9)+vec3((aSeed.z-.5)*.6,t*(1.4+aSeed.w)-5.*t*t,(aSeed.w-.5)*.4);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.1+.06*aSeed.w);}`,CLOD_FS);
  a.count+=S.pts(L.part,18,burstVS(V3(X1,0.2,0),"0.,1.,0.",2.,4.2,9.,.6,'.15+.08*aSeed.w',TI),CLOD_FS);
  a.count+=S.pts(L.part,12,dustRingVS(V3(X1,0,0),0.3,1.5,TI,0.7,'.34+.16*aSeed.y'),DUST_FS);
  // vida que sube por el Axie (drenaje)
  a.count+=S.pts(L.part,22,VV+K+`void main(){float s=${f(TB)}+aSeed.x*.4;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*4.;vec3 p=vec3(${f(CX)},0.,0.)+vec3(cos(an)*.5,.1+t*2.2,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=an;put(p,.12+.07*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, head=cl((te-T0)/(TI-T0)), back=cl((te-TR)/(TB-TR));
    trail.visible=te>=T0; set(trail,head,1); trail.material.uniforms.uQ.value=te>=TR&&te<TB?1-back:0;
    trail.material.uniforms.uEr.value=-0.1+1.15*ss(TB+0.1,TE,te);
    roots.forEach((r,i)=>{const g=ss(TI-0.02+r.d,TI+0.12+r.d,te),out=ss(TB,TE-0.1,te);
      r.m.scale.set(1,Math.max(r.h*g*(1-0.6*out),0.001),1); r.m.visible=g>0.005&&out<0.99;});
    rmat.uniforms.uEr.value=-0.1+1.15*ss(TB,TE-0.1,te); rmat.uniforms.uGl.value=hitE(ia,6)*0.6;
    spark.pose(ia,tmp.set(X1-0.3,0.7,0),1.05); ring.pose(ia,X1,0,0.5,1); ringC.pose(te-TB,CX,0,0.5,0.8);
    const hit=hitE(ia,6); target.position.y=0.25*Math.max(0,Math.sin(Math.PI*cl(ia/0.3)))*(ia>=0?1:0); target.rotation.z=-hit*0.2*Math.cos(ia*13);
    caster.position.y=te<T0?0.05*Math.sin(Math.PI*te/T0):0;
    o.em=0.35*ss(TB,TB+0.15,te)*(1-ss(TB+0.5,TE,te)); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(X0+head*LEN,0.2,-zz(head)*0.9);o.gs=0.6*ss(T0,T0+0.1,te);o.ga=0.1;o.li=2*ss(T0,T0+0.1,te);}
    else if(te<TB){o.g.set(X1-(X1-X0)*back*(te>=TR?1:0),0.5,0);o.gs=1+ia;o.ga=Math.exp(-ia*10)*0.35+0.05;o.li=4*Math.exp(-ia*6)+1.2;}
    else{o.g.set(CX,1,0);o.gs=1.2;o.ga=0.1*(1-ss(TB+0.3,TE,te));o.li=2*(1-ss(TB+0.3,TE,te));}
    o.ia=ia;o.c.set(X1,0.6,0);o.shake=0;o.dist=0.7;
  };
}});

// =====================================================================
// 4 · HERBIVORE (58–72 de daño; cura 25 al lanzador) — el Axie mastica hojas mágicas que se arremolinan hacia su boca;
//     a la vez seis lianas brotan del suelo, se enroscan en el rival y lo muerden con espinas; su vida sube por las
//     lianas y vuelve en motas al Axie, que suelta hojas de cura. ti 0,84 s
// =====================================================================
defs.push({key:"sty_pbHerbivore",zoneCaster:0.35,zoneTarget:1.3,name:"Herbivore (estilizado)",dur:2.4,ti:0.84,pal:"Sty Savia",tier:2,stylized:true,
  phases:[["Hojas",0],["Masticar",0.32],["Lianas",0.42],["Mordida",0.84],["Drenaje",0.95],["Fin",1.85]],
build(a){
  const L=a.L,TV=0.42,TW=0.66,TI=0.84,TD=1.85,TE=2.2,NL=6,TX=3.4;
  const vmat=plantMat([0.2,0.48,0.14],{double:true});
  const vines=[];
  for(let i=0;i<NL;i++){const m=new THREE.Mesh(helixGeo(1.3+0.25*jh(i),0.88-0.05*(i%2),0.64,1.7+0.3*jh(i+4),0.26,90),vmat);
    m.position.set(TX,0.02,0); m.rotation.y=i/NL*TAU; L.mesh.add(m); vines.push(m);}
  // revelado de las lianas: descarta más allá de uP a lo largo de la hélice (uv.x)
  const reveal={value:0}; vmat.uniforms.uRv=reveal;
  vmat.fragmentShader=vmat.fragmentShader.replace('void main(){','uniform float uRv;void main(){if(vUv.x>uRv)discard;');
  const tg=new THREE.ConeGeometry(0.05,0.24,6).translate(0,0.12,0), thorns=[];
  const tmat=plantMat([0.85,0.78,0.55]);
  for(let i=0;i<10;i++){const an=i/10*TAU, y=0.45+0.9*jh(i+20), m=new THREE.Mesh(tg,tmat);
    m.position.set(TX+Math.cos(an)*0.76,y,Math.sin(an)*0.76); m.quaternion.setFromUnitVectors(UP,V3(-Math.cos(an),0.2,-Math.sin(an)).normalize()); L.mesh.add(m); thorns.push(m);}
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.62}), ring=S.groundRing(L.decal,2.6), ringC=S.groundRing(L.decal,2.4);
  const K=`const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};const float TI=${f(TI)};const float TD=${f(TD)};`;
  // hojas que se arremolinan hacia la boca
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=aSeed.x*.3;float u=clamp((uT-s)/.3,0.,1.);float an=aSeed.z*6.2832+u*5.;float rad=.9*(1.-u)+.05;
   vec3 p=MO+vec3(cos(an)*rad,sin(an)*rad*.6,sin(an)*rad*.8);vA=(uT>s&&u<1.)?1.:0.;vK=smoothstep(.85,1.,u);vR=an+u*6.;put(p,.38+.1*aSeed.w);}`,LEAF_FS);
  // trozos masticados
  a.count+=S.pts(L.part,10,burstVS(MO,".6,.2,0.",.6,1.4,5.,.4,'.1+.05*aSeed.w',0.36,0.2),LEAF_FS);
  a.count+=S.pts(L.part,10,dustRingVS(V3(TX,0,0),0.4,1.0,TV,0.5,'.26+.12*aSeed.y'),DUST_FS);
  a.count+=S.pts(L.part,12,burstVS(TC,"-.3,.4,0.",1.2,2.4,6.,.5,'.16+.07*aSeed.w',TI,0.05),SAP_FS);
  // la vida vuelve en motas del rival al Axie
  a.count+=S.pts(L.part,28,VV+K+`void main(){float s=TI+.1+aSeed.x*(TD-TI-.5);float u=clamp((uT-s)/.45,0.,1.);
   vec3 m=mix(TC,MO,.5)+vec3(0.,1.4,0.);vec3 p=mix(mix(TC,m,u),mix(m,MO,u),u)+rnd()*.12*(1.-u);
   vA=(uT>s&&u<1.)?1.:0.;vK=0.;vR=0.;put(p,.12+.06*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // hojas de cura que suben del Axie
  a.count+=S.pts(L.part,14,VV+K+`void main(){float s=TI+.5+aSeed.x*.8;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.;vec3 p=vec3(${f(CX)},0.,0.)+vec3(cos(an)*.6,.2+t*1.5,sin(an)*.6);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=an;put(p,.22+.08*aSeed.w);}`,LEAF_FS);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(TV,TW+0.1,te), out=ss(TD-0.2,TE,te);
    reveal.value=grow; vines.forEach((m,i)=>{m.visible=grow>0.01&&out<0.99;m.rotation.y=i/NL*TAU+0.6*grow+0.2*hitE(ia,8);
      const sq=1-0.15*ss(TW,TI,te); m.scale.set(sq,1,sq);});
    vmat.uniforms.uEr.value=-0.1+1.15*out; vmat.uniforms.uGl.value=hitE(ia,4)*0.5+0.25*ss(TI,TI+0.2,te)*(1-out);
    const tk=ss(TI-0.06,TI,te); thorns.forEach(m=>{m.scale.setScalar(Math.max(tk,0.001));m.visible=tk>0.01&&out<0.99;});
    tmat.uniforms.uEr.value=-0.1+1.15*out;
    spark.pose(ia,TC,1); ring.pose(te-TV,TX,0,0.5,0.9); ringC.pose(te-TI-0.5,CX,0,0.5,0.9);
    const hit=hitE(ia,6); target.position.x=3.4+0.1*hit; target.rotation.z=-hit*0.22*Math.cos(ia*14);
    target.scale.set(1-0.05*grow*(1-out),1,1-0.05*grow*(1-out));
    caster.scale.y=te>0.3&&te<0.62?1-0.04*Math.abs(Math.sin((te-0.3)*30)):1;
    o.em=0.3*ss(TI+0.3,TI+0.6,te)*(1-ss(TD-0.3,TE,te)); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(te<TV?MO:TC);o.gs=0.6;o.ga=0.08;o.li=1.2;}
    else{o.g.copy(TC);o.gs=1.1+ia;o.ga=Math.exp(-ia*10)*0.35;o.li=4*Math.exp(-ia*5)+0.8*(1-out);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;
  };
}});

VFX.module("Estilizado · Planta · Boca",defs);
})();

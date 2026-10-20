// =====================================================================
// MÓDULO 1 · CLASE BESTIA (CUERNOS)
// Cada habilidad sigue el contrato del motor: ability {key,name,dur,ti,phases} + build(a) que crea piezas
// en las capas a.L.mesh / part / trail / decal y define a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,SCORCH_FS,
  camera,caster,target,allies,ALLY_POS,hornMat,HORN_TIPS}=VFX;
const {NB,SOLID,v3,fireFS,darkFireFS,CHIP_FS,DUST_FS,FLAME_FS,FLUFF_FS,CHEVRON_FS,SLASH_FS,billboard,towardCam,taperTube,variantGroups,tileFractureFS}=VFX.lib;
VFX.palette("Dorado",["#ffe08a","#ff9a1c"]);
VFX.palette("Rubí",["#ff4f73","#a10f35"]);
VFX.palette("Carmesí",["#ff5a30","#b3101e"]);
VFX.palette("Ámbar",["#ffbe5c","#ff6412"]);

const hornWorld=(i,out)=>out.copy(HORN_TIPS[i]).add(caster.position);

// =====================================================================
// 1 · ARCO — embestida dorada; el impacto levanta una onda y un abanico moderado de polvo (nivel 2: sin fractura)
// =====================================================================
const arco={key:"arco",name:"Arco",dur:2.0,ti:0.62,pal:"Dorado",horns:true,
  phases:[["Carga",0],["Embestida",0.35],["Impacto",0.62],["Onda",0.8],["Regreso",1.05]],
build(a){
  const L=a.L,TD=0.35,TI=0.62,XH=2.62,X0=-3.95,IP=V3(3.0,0.05,0);
  const cx=te=>{
    if(te<TD)return -3.7-0.25*ss(0,TD,te);
    if(te<TI){const k=(te-TD)/(TI-TD);return X0+(XH-X0)*k*k;}
    return XH-0.3*ss(TI,TI+0.22,te)-(XH-0.3+3.7)*ss(1.05,1.75,te);
  };
  // aura llameante que sigue al lanzador
  const aura=new THREE.Group(); L.mesh.add(aura);
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.48,0.54,2.0,40,12,true),fx(fireFS(2.0,4.)));shell.position.y=1.0;
  const head=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.43,0.85,32,6,true),fx(fireFS(0.85,4.5)));head.position.y=1.62;
  // proa: media esfera de fuerza delante del cuerpo durante la carrera, con vetas que fluyen hacia atrás
  const bow=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI),fx(`
  void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float n=noise(vec3(vP.y*4.,vP.z*4.,vP.x*3.+uT*14.));
   float st=smoothstep(.5,.8,n);
   gl_FragColor=vec4(mix(uC2,uC1,fr+st*.5)*1.4+vec3(1.)*st*.3,(fr*.75+st*.35)*uA);}`));
  bow.rotation.y=-Math.PI/2; bow.position.set(0.32,0.9,0); bow.scale.set(0.45,0.95,0.75);
  aura.add(shell,head,bow);
  // estela de carrera: dos planos cruzados que van del punto de partida al lanzador
  const tg=new THREE.PlaneGeometry(1,1.3).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*6.-uT*10.,v*3.,uT));
   float al=smoothstep(u*(.5+.5*n),0.,v)*pow(u,1.6)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.25,0.,v)*u*.4,al);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS)); hitRing.position.set(3.0,1.0,0); L.mesh.add(hitRing);

  // partículas
  const C=`const float TD=${f(TD)};const float TI=${f(TI)};
  float cx(float t){float k=clamp((t-TD)/(TI-TD),0.,1.);return ${f(X0)}+${f(XH-X0)}*k*k;}`;
  a.count+=points(L.part,90,C+`void main(){float life=.16+aSeed.y*.1;float age=(uT-aSeed.x*(TD-.1))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=vec3(-3.85,.95,0.)+d*mix(1.2,.1,age*age)*vec3(1.,1.2,1.);
   vA=(age>0.&&age<1.&&uT<TD+.05)?smoothstep(0.,.3,age):0.;put(p,.035+.04*aSeed.z);}`);
  a.count+=points(L.part,200,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.3+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s),.2+aSeed.z*1.5,r.z*.38)+vec3(-1.3*t,1.*t+r.y*.25*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.w*40.)):0.;put(p,(.035+.05*aSeed.w)*(1.-age*.5));}`);
  // abanico de polvo moderado (mezcla normal): bajo, corto y poco denso
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.18;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(aSeed.z*2.-1.)*.6;float sp=1.+1.8*aSeed.w;
   vec3 dir=vec3(cos(an),0.,sin(an));
   vec3 p=${v3(IP)}+dir*sp*(1.-exp(-t*2.6))*.7+vec3(0.,.1+(.3+.4*aSeed.y)*(1.-exp(-t*1.8)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.3+.35*aSeed.y)*(.6+age*.7));}`,DUST_FS,{blending:THREE.NormalBlending});
  a.count+=sparks(L.part,180,TI,"3.,1.,0.","1.,.35,0.",3,8,3.2);
  // onda de choque y quemadura suave en el suelo (sin grietas)
  const shock=groundPlane(5,3.0,0.03,fx(RING_FS));
  const scorch=groundPlane(2.0,3.0,0.015,fx(SCORCH_FS));
  L.decal.add(shock,scorch);

  a.pose=function(te,o){
    const ia=te-TI, x=cx(te), dash=te>=TD&&te<TI?(te-TD)/(TI-TD):0;
    caster.position.x=x;
    caster.rotation.z=0.15*ss(0,TD,te)-0.5*ss(TD,TD+0.08,te)+0.35*ss(TI,TI+0.3,te);
    const env=ss(0,0.3,te)*(1-ss(TI+0.1,TI+0.6,te));
    aura.position.x=x; aura.rotation.z=caster.rotation.z*0.6+0.35*dash;
    set(shell,dash*0.8,env); set(head,dash,env*0.85);
    shell.scale.set(1+0.8*dash,1,1); bow.visible=dash>0; bow.material.uniforms.uA.value=ss(0,0.3,dash);
    trail.visible=te>TD&&ia<0.3; trail.position.set(x,0.95,0);
    trail.scale.set(Math.max(x-X0,0.001),1,1); tm.uniforms.uA.value=ia>0?1-cl(ia/0.3):1;
    let p=cl(ia/0.28); billboard(hitRing); set(hitRing,p,ia>=0?(1-p)*0.85:0);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    scorch.material.uniforms.uA.value=ia>=0?0.7*(1-cl(ia/1.1)):0;
    const hit=ia>=0?Math.exp(-ia*4.5):0;
    target.position.x=3.4+hit*0.45*(1-Math.exp(-ia*20)); target.rotation.z=-hit*0.3*Math.cos(ia*13);
    hornMat.emissiveIntensity=env*1.2;
    if(te<TD){o.g.set(-3.6,1.2,0);o.gs=1.5*ss(0,TD,te);o.ga=0.5*ss(0,TD,te);o.li=3*ss(0,TD,te);}
    else if(te<TI){o.g.set(x+0.55,0.95,0);o.gs=1.6;o.ga=0.55;o.li=4.5;}
    else{o.g.set(3.0,0.6,0);o.gs=1.2+3.5*ia;o.ga=Math.exp(-ia*12)*0.7;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(3.0,0.6,0);o.shake=0;o.dist=0.8;
  };
}};

// =====================================================================
// 2 · DUAL BLADE — dos cortes en X color rubí; quedan rasgaduras en el aire y marcas de sangrado
// =====================================================================
const dual={key:"dual",name:"Dual Blade",dur:1.9,ti:0.46,pal:"Rubí",horns:true,
  phases:[["Acometida",0],["Corte I",0.22],["Corte II",0.38],["Sangrado",0.62]],
build(a){
  const L=a.L,TA=0.2,T1=0.3,T2=0.46,CH=V3(3.3,1.15,0),SW=0.12;
  const slashes=[0.85,-0.85].map(ang=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.3),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));
    m.userData.ang=ang; L.trail.add(m); return m;});
  // núcleo de la X: destello que une ambos cortes justo al cerrarse
  const xflash=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),fx(`
  void main(){vec2 p=(vUv-.5)*2.;float d1=abs(p.x-p.y),d2=abs(p.x+p.y);
   float x=smoothstep(.07,0.,min(d1,d2))*smoothstep(1.,.2,length(p));
   float c=pow(max(0.,1.-length(p)),3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.8,(x+c)*uA);}`,{depthTest:false}));
  // marcas de sangrado sobre el cuerpo: dos tajos que laten con cada tic
  const bleed=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),fx(`
  void main(){vec2 p=(vUv-.5)*2.;
   float g1=smoothstep(.06,0.,abs(p.x-p.y+noise(vec3(p*6.,1.))*.08))*smoothstep(.8,.5,length(p));
   float g2=smoothstep(.06,0.,abs(p.x+p.y+noise(vec3(p*6.,2.))*.08))*smoothstep(.8,.5,length(p));
   float m=max(g1,g2);
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.6+vec3(1.)*m*uP*.4,m*uA);}`,{depthTest:false}));
  L.mesh.add(xflash,bleed);
  const C=`const float T1=${f(T1)};const float T2=${f(T2)};const vec3 CH=${v3(CH)};`;
  // jirones de aire arrancados a lo largo de cada corte
  for(const [ti,ang] of [[T1,0.85],[T2,-0.85]]){
    a.count+=points(L.part,110,C+`void main(){float s=${f(ti-SW)}+aSeed.x*${f(SW)};float life=.22+aSeed.y*.22;float age=(uT-s)/life;float t=max(uT-s,0.);
     float l=(aSeed.x-.5)*2.1;vec3 dl=vec3(cos(${f(ang)}),sin(${f(ang)}),0.);vec3 nl=vec3(-dl.y,dl.x,0.);
     vec3 p=CH+vec3(0.,0.,.5)+dl*l+nl*(aSeed.z-.5)*.15+(nl*(aSeed.w-.5)*2.+dl*.6)*t*1.4;
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.032*aSeed.w)*(1.-age));}`);
    a.count+=sparks(L.part,110,ti,`${f(CH.x)},${f(CH.y)},.3`,ang>0?".4,-.6,.3":".4,.6,.3",2.5,7,3);
  }
  // gotas luminosas que caen de las marcas mientras dura el sangrado
  a.count+=points(L.part,70,C+`void main(){float life=.45+aSeed.y*.25;float per=life+.35;float k=(uT-T2)/per+aSeed.x;float c=floor(k);
   float t=fract(k)*per;vec3 r=rr(c);
   vec3 p=CH+vec3(-.35+r.z*.1,(r.x-.5)*.6,(r.y-.5)*.5)+vec3(0.,-3.8*t*t,0.);
   vA=(k>=1.&&t<life&&p.y>.02)?uE:0.;put(p,.03+.03*r.z);}`);
  // charco de gotas luminosas bajo el objetivo
  const pool=groundPlane(2.0,3.3,0.02,fx(`
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*11.,2.));float sp=smoothstep(.62,.7,n+(1.-r)*.25-(1.-uP)*.6);
   float glow=.6+.4*sin(uT*6.+n*10.);
   gl_FragColor=vec4(mix(uC2,uC1,sp)*1.4,sp*glow*smoothstep(1.,.5,r)*uA);}`));
  L.decal.add(pool);
  const tmp=V3(0,0,0);
  a.pose=function(te,o){
    const last=te>=T2?T2:T1, ia=te-T2, i1=te-T1;
    const cx=te<TA?-3.7+(1.95+3.7)*ss(0,TA,te):1.95-(1.95+3.7)*ss(0.9,1.5,te);
    caster.position.x=cx;
    caster.rotation.z=-0.3*ss(0,TA,te)+0.6*ss(T1-SW,T1,te)-0.6*ss(T2-SW,T2,te)+0.3*ss(T2+0.1,T2+0.5,te);
    slashes.forEach((m,i)=>{const ti=i?T2:T1,s=(te-(ti-SW))/SW;
      m.visible=s>=0&&te<1.8; towardCam(m.position,CH,0.6); billboard(m,m.userData.ang);
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.6,s>1?Math.exp(-(s-1)*1.4):1);
      m.material.uniforms.uQ.value=s>=1?0.8*Math.exp(-(te-ti)*2):0;});
    towardCam(xflash.position,CH,0.65); billboard(xflash); xflash.material.uniforms.uA.value=ia>=0?Math.exp(-ia*9):0;
    const env=ss(T2,T2+0.2,te)*(1-ss(1.45,1.85,te)), tick=Math.pow(0.5+0.5*Math.sin((te-T2)*18),4);
    towardCam(bleed.position,CH,0.42); billboard(bleed); set(bleed,tick,env*(0.7+0.5*tick));
    U.uE.value=env; set(pool,ss(T2,T2+1.2,te),env);
    const h1=i1>=0?Math.exp(-i1*9):0, h2=ia>=0?Math.exp(-ia*6):0;
    target.position.x=3.4+h1*0.1+h2*0.2; target.rotation.z=h1*0.14*Math.cos(i1*20)-h2*0.22*Math.cos(ia*14);
    o.g.copy(CH);o.gs=1+1.6*cl(te-last);o.ga=Math.exp(-(te-last)*10)*0.65*(te>=T1-0.05?1:0);o.li=5.5*Math.exp(-(te-last)*5)*(te>=T1?1:0)+1.5*env*tick;
    o.ia=te-last;o.c.copy(CH);o.shake=0;o.dist=last===T2?0.7:0.4;
    o.em=env*0.4*tick;o.emc.copy(U.uC1.value);
  };
}};

// =====================================================================
// 3 · IMP — zarpazo ígneo carmesí; en Fury Form, garra demoníaca gigante de fuego negro
// =====================================================================
const imp={key:"imp",name:"Imp",dur:2.0,ti:0.55,pal:"Carmesí",horns:true,vlabel:"Forma",
  variants:[["normal","Normal"],["furia","Fury Form"]],v:"normal",
  phases:[["Salto",0],["Zarpazo",0.4],["Impacto",0.55],["Brasas",0.8]],
build(a){
  const L=a.L,TJ=0.4,TI=0.55,CH=V3(3.3,1.2,0),VG=variantGroups(a,["normal","furia"]);
  // garra en billboard: N surcos curvos que barren la diagonal, bordes comidos por fuego
  const clawFS=(N,thick)=>`void main(){vec2 p=vUv;float u=p.x;float m=0.;
   for(int i=0;i<${N};i++){float off=(float(i)-${f((N-1)/2)})*${f(0.17*thick)};
    float y=(p.y-.5-off)-.16*(1.-pow(2.*u-1.,2.));float w=(.012+.045*sin(3.14159*u))*${f(thick)};
    m=max(m,smoothstep(w,0.,abs(y)));}
   float n=noise(vec3(u*9.-uT*7.,p.y*14.,uT*2.));
   float d=uP-u;float sweep=step(0.,d)*exp(-d*1.8)*smoothstep(0.,.06,u)*smoothstep(1.,.9,u);
   float fl=m*(.55+.6*n);
   gl_FragColor=vec4(mix(uC2,uC1,fl)*1.7+vec3(1.)*smoothstep(.75,1.,fl)*.5,fl*sweep*uA);}`;
  const clawN=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.7),fx(clawFS(3,1),{depthTest:false})); VG.normal.trail.add(clawN);
  // Fury: capa oscura (normal) + capa de brasa (aditiva) de cuatro garras enormes, más una "palma" de fuego negro
  const furyDark=new THREE.Mesh(new THREE.PlaneGeometry(4.0,2.9),fx(`
  void main(){vec2 p=vUv;float u=p.x;float m=0.;
   for(int i=0;i<4;i++){float off=(float(i)-1.5)*.14;float y=(p.y-.5-off)-.18*(1.-pow(2.*u-1.,2.));
    float w=.02+.06*sin(3.14159*u);m=max(m,smoothstep(w*1.6,0.,abs(y)));}
   float palm=smoothstep(.32,.0,length((p-vec2(.08,.72))*vec2(1.,1.4)));
   float n=noise(vec3(p*vec2(7.,10.)-vec2(uT*4.,0.),uT));
   float d=uP-u;float sweep=max(step(0.,d)*exp(-d*1.2),palm*step(.01,uP));
   float al=max(m,palm*.9)*(.6+.5*n)*sweep*uA;
   gl_FragColor=vec4(vec3(.03,0.,.015),min(al,1.)*.92);}`,Object.assign({depthTest:false},NB)));
  const furyRim=new THREE.Mesh(new THREE.PlaneGeometry(4.0,2.9),fx(`
  void main(){vec2 p=vUv;float u=p.x;float m=0.;
   for(int i=0;i<4;i++){float off=(float(i)-1.5)*.14;float y=(p.y-.5-off)-.18*(1.-pow(2.*u-1.,2.));
    float w=.02+.06*sin(3.14159*u);float e=abs(y);m=max(m,smoothstep(w*.5,0.,abs(e-w*1.2))+smoothstep(w*.25,0.,e)*.8);}
   float n=noise(vec3(p*vec2(9.,12.)-vec2(uT*6.,0.),uT));
   float d=uP-u;float sweep=step(0.,d)*exp(-d*1.4);
   gl_FragColor=vec4(mix(uC2,uC1,n)*2.,m*(.5+.7*n)*sweep*uA);}`,{depthTest:false}));
  VG.furia.trail.add(furyDark,furyRim);
  // fuego negro sobre el lanzador (forma de furia) y sobre el objetivo tras el golpe
  const casterDark=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.56,2.1,40,10,true),fx(darkFireFS(2.1),NB)); casterDark.position.y=1.05;
  const casterRim=new THREE.Mesh(new THREE.CylinderGeometry(0.54,0.6,2.1,40,10,true),fx(fireFS(2.1,3.)));casterRim.position.y=1.05;
  const eyes=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.18),fx(`void main(){vec2 p=vUv-.5;
   float e=smoothstep(.07,0.,length((abs(p)-vec2(.17,0.))*vec2(1.,2.2)));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*2.,e*uA);}`,{depthTest:false}));
  const casterAura=new THREE.Group(); casterAura.add(casterDark,casterRim,eyes); VG.furia.mesh.add(casterAura);
  const tDark=new THREE.Mesh(new THREE.CylinderGeometry(0.48,0.55,1.9,40,10,true),fx(darkFireFS(1.9),NB)); tDark.position.set(3.4,0.95,0);
  const tRim=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.59,1.9,40,10,true),fx(fireFS(1.9,3.4))); tRim.position.set(3.4,0.95,0);
  VG.furia.mesh.add(tDark,tRim);
  // partículas
  const C=`const float TI=${f(TI)};const vec3 CH=${v3(CH)};`;
  a.count=0;
  VG.normal.n=sparks(VG.normal.part,170,TI,"3.2,1.2,0.",".6,-.4,.2",2.5,7,3)
   +points(VG.normal.part,110,C+`void main(){float s=TI+aSeed.x*.18;float life=.5+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(.4,.5,0.));vec3 p=CH+d*(.25+1.1*aSeed.z)*(1.-exp(-t*3.))+vec3(sin(t*5.+aSeed.w*6.)*.08,t*.7,0.);
     vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.x*50.)):0.;put(p,.03+.04*aSeed.w);}`);
  VG.furia.n=sparks(VG.furia.part,250,TI,"3.2,1.1,0.",".6,-.5,.2",3.5,9,3.3)
   +points(VG.furia.part,150,C+`void main(){float s=TI+aSeed.x*.3;float life=.6+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(.3,.6,0.));vec3 p=CH+d*(.4+1.5*aSeed.z)*(1.-exp(-t*2.5))+vec3(sin(t*4.+aSeed.w*6.)*.12,t*.9,0.);
     vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*26.+aSeed.x*50.)):0.;put(p,.035+.05*aSeed.w);}`)
   // ceniza oscura que flota (mezcla normal)
   +points(VG.furia.part,80,C+`void main(){float life=1.+aSeed.y*.8;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     vec3 p=vec3(3.4+(r.x-.5)*1.1,.1+age*(1.3+r.y*.8),(r.z-.5)*1.1)+vec3(sin(age*6.+r.y*9.)*.16,0.,0.);
     vA=(k>=1.)?sin(age*3.14159)*.75*uE:0.;put(p,.05+.05*r.z);}`,HEAD+`varying float vA;varying float vMix;
   void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.2,d)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.04,.01,.02),a);}`,NB);
  // surcos en el suelo: tres (normal) o cuatro anchos con charco de fuego negro (furia)
  const gashFS=(N,thick)=>`void main(){vec2 p=vUv;float m=0.;
   for(int i=0;i<${N};i++){float off=(float(i)-${f((N-1)/2)})*${f(0.13*thick)};float y=p.y-.5-off+(noise(vec3(p.x*6.,float(i),2.))-.5)*.05;
    m=max(m,smoothstep(.022*${f(thick)}*(1.-p.x*.6),0.,abs(y))*step(p.x,uP));}
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.7,m*(1.-p.x*.5)*uA);}`;
  const gN=groundPlane(2.8,3.8,0.02,fx(gashFS(3,0.8)),1.25); gN.rotation.y=-0.35; VG.normal.decal.add(gN);
  const gF=groundPlane(3.8,3.9,0.02,fx(gashFS(4,1.15)),1.8); gF.rotation.y=-0.35;
  const pool=groundPlane(2.5,3.4,0.025,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*6.,uT*.8))*.6+noise(vec3(p*14.,uT*1.4))*.4;float e=r+(n-.5)*.5;
   float m=smoothstep(.9,.7,e/max(uP,.001));
   gl_FragColor=vec4(mix(vec3(.03,0.,.01),uC2*1.4,smoothstep(.6,.85,e/max(uP,.001))),m*.85*uA);}`,NB));
  VG.furia.decal.add(gF,pool);
  a.setVariant=v=>{if(!VG[v])v="normal";a.v=v;for(const k in VG)for(const l of VFX.LK)VG[k][l].visible=k===v;a.count=VG[v].n;};
  const tp=V3(0,0,0), eyeP=V3(0,0,0);
  a.pose=function(te,o){
    const fury=a.v==="furia", ia=te-TI, jk=cl(te/TJ);
    // salto en arco hacia el objetivo, golpe y retirada
    const cx=te<TJ?-3.7+(1.7+3.7)*ss(0,1,jk):1.7-(1.7+3.7)*ss(0.95,1.6,te);
    caster.position.set(cx,te<TJ?0.9*Math.sin(Math.PI*jk):0,0);
    caster.rotation.z=-0.25*ss(0,TJ,te)+0.55*ss(TJ,TI,te)-0.3*ss(TI+0.1,TI+0.5,te);
    const sw=cl((te-TJ)/(TI-TJ+0.08));
    // normal
    towardCam(clawN.position,CH,0.7); billboard(clawN,-0.55);
    clawN.visible=!fury&&te>=TJ&&te<TI+0.5; set(clawN,sw*1.25,1-cl((te-TI)/0.5));
    set(gN,ss(TI,TI+0.2,te),ia>=0?0.75*(1-cl(ia/1.0)):0);
    // furia: la garra entra desde arriba-izquierda y barre
    const fe=ss(0,0.3,te)*(1-ss(1.45,1.9,te));
    casterAura.position.set(cx,caster.position.y,0);
    set(casterDark,0.3,fe); set(casterRim,0.2,fe*0.7);
    towardCam(eyeP.set(cx+0.2,caster.position.y+1.66,0),eyeP,0.32); eyes.position.copy(eyeP).sub(casterAura.position); billboard(eyes); eyes.material.uniforms.uA.value=fe;
    const fin=ss(TJ-0.15,TJ+0.05,te);
    towardCam(tp,CH,1.0); tp.addScaledVector(V3(-1,1.2,0).normalize(),(1-fin)*1.7);
    for(const m of [furyDark,furyRim]){m.position.copy(tp);billboard(m,-0.55);m.visible=fury&&te>=TJ-0.15&&te<TI+0.75;}
    set(furyDark,sw*1.3,fin*(1-cl((te-TI)/0.75))); set(furyRim,sw*1.3,fin*(1-cl((te-TI)/0.6)));
    const tb=ia>=0?ss(TI,TI+0.15,te)*(1-ss(1.45,1.9,te)):0;
    set(tDark,0.35,tb*0.85); set(tRim,0.25,tb*0.7);
    set(gF,ss(TI,TI+0.25,te),ia>=0?0.85*(1-cl(ia/1.2)):0); set(pool,ss(TI,TI+0.5,te),tb*0.85);
    U.uE.value=tb;
    const hit=ia>=0?Math.exp(-ia*(fury?4:5)):0, kb=fury?0.4:0.24;
    target.position.x=3.4+hit*kb; target.rotation.z=-hit*(fury?0.36:0.24)*Math.cos(ia*14);
    hornMat.emissiveIntensity=fury?1.1*fe:0.5*ss(0,TJ,te)*(1-ss(TI,TI+0.5,te));
    if(ia<0){o.g.set(cx+0.6,caster.position.y+1.1,0);o.gs=fury?1.3:0.9;o.ga=fury?0.4:0.32;o.li=fury?3.2:2.2;}
    else{o.g.copy(CH);o.gs=1.2+(fury?4.2:3)*ia;o.ga=Math.exp(-ia*12)*(fury?0.8:0.62);o.li=(fury?10:7)*Math.exp(-ia*5)+(fury?2*tb:0);}
    o.ia=ia;o.c.copy(CH);o.shake=0;o.dist=fury?1.0:0.6;
  };
}};

// =====================================================================
// 4 · LITTLE BRANCH — brota una rama espinosa en llamas y se clava; chispas por cada aliado vivo
//     (nivel 3: rama más gruesa y alta, impacto pesado y fractura de baldosas bajo el rival)
// =====================================================================
const branch={key:"branch",name:"Little Branch",dur:3.0,ti:0.95,pal:"Ámbar",horns:true,vlabel:"Aliados vivos",
  variants:[["0","Ninguno"],["1","1 aliado"],["2","2 aliados"]],v:"2",allies:()=>+branch.v,
  phases:[["Brote",0],["Crecimiento",0.3],["Impacto",0.95],["Fractura",1.15],["Combustión",1.5]],
build(a){
  const L=a.L,TG=0.3,TI=0.95,TB=1.5,TBE=2.6,G0=V3(-2.7,0,0),E=V3(3.0,1.15,0),K1=V3(-1.9,2.5,0.4),K2=V3(1.0,3.2,-0.3);
  const curve=new THREE.CubicBezierCurve3(G0,K1,K2,E);
  const grow=te=>{const k=cl((te-TG)/(TI-TG));return 1-Math.pow(1-k,1.7);};
  // madera: corteza opaca con grietas que brillan; uQ es el frente de combustión (base → punta)
  const wood=new THREE.Mesh(taperTube(curve,140,10,0.23,0.07),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*60.,vUv.y*6.,0.))*.6+noise(vec3(u*150.,vUv.y*14.,2.))*.4;
   vec3 bark=mix(vec3(.13,.07,.04),vec3(.34,.2,.1),n);
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float crack=pow(1.-abs(noise(vec3(u*45.,vUv.y*7.,5.))*2.-1.),10.);
   float ch=uQ-u+noise(vec3(u*25.,vUv.y*5.,uT*.6))*.12;
   if(ch>.1)discard;
   float ember=smoothstep(-.1,.1,ch);
   vec3 c=bark*lit*(1.-ember*.6)+uC1*crack*(.9+1.2*uA)+uC2*ember*2.4+uC1*smoothstep(.06,.1,ch)*2.;
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:0}},SOLID));
  // vaina de fuego aditiva alrededor de la rama
  const flame=new THREE.Mesh(taperTube(curve,140,12,0.44,0.18),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ-.05)discard;
   float n=noise(vec3(u*30.-uT*4.,vUv.y*6.2832,uT*2.))*.6+noise(vec3(u*70.-uT*7.,vUv.y*12.,1.))*.4;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float al=smoothstep(.45,.8,n)*(.3+.7*fr)*smoothstep(uP,uP-.08,u)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.6,al);}`,{uQ:{value:0}}));
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.75,10),new THREE.MeshStandardMaterial({color:0x2a170c,roughness:0.7,emissive:0xff6a10,emissiveIntensity:0.6}));
  L.mesh.add(wood,flame,tip);
  // espinas repartidas por la curva; aparecen al paso del crecimiento y caen con la combustión
  const thornMat=new THREE.MeshStandardMaterial({color:0x3a2414,roughness:0.8,emissive:0xff6a10,emissiveIntensity:0.35});
  const thorns=[], up=V3(0,1,0), tmp=V3(0,0,0), tan=V3(0,0,0);
  for(let i=0;i<16;i++){const u=0.1+0.82*i/15+Math.random()*0.02, th=new THREE.Mesh(new THREE.ConeGeometry(0.065,0.36,6),thornMat);
    curve.getPointAt(u,th.position); curve.getTangentAt(u,tan);
    const side=V3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).cross(tan).normalize();
    th.quaternion.setFromUnitVectors(up,side.addScaledVector(tan,0.5).normalize());
    th.position.addScaledVector(side,0.09*(1-u*0.6)); th.userData={u,base:th.position.clone()}; thorns.push(th); L.mesh.add(th);}
  // partículas
  const P=(i)=>ALLY_POS[i].clone().add(V3(0,1.15,0));
  const C=`const float TG=${f(TG)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 E=${v3(E)};const vec3 G0=${v3(G0)};
  const vec3 C1=${v3(K1)};const vec3 C2=${v3(K2)};
  vec3 bz(float u){float v=1.-u;return v*v*v*G0+3.*v*v*u*C1+3.*v*u*u*C2+u*u*u*E;}`;
  let base=0;
  base+=points(L.part,210,C+`void main(){float s=TG+aSeed.x*(TI-TG);float life=.35+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TG)/(TI-TG),0.,1.);vec3 r=rnd();
   vec3 p=bz(1.-pow(1.-k,1.7))+r*.12+vec3(r.x*.25,1.+r.y*.35,r.z*.25)*t;
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.w*30.)):0.;put(p,(.04+.06*aSeed.z)*(1.-age*.5));}`);
  base+=points(L.part,110,C+`void main(){float s=TG+aSeed.x*.1;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,1.2,0.));vec3 p=G0+d*(3.*t)+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.06*aSeed.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.5;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.3,.2,.12),uC2,.3),a);}`,NB);
  // combustión: brasas que se desprenden del frente
  base+=points(L.part,320,C+`void main(){float s=TB+aSeed.x*${f(TBE-TB)};float life=.5+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bz(aSeed.x*1.05)+r*.09+vec3(sin(t*5.+r.x*9.)*.15,t*(1.1+aSeed.y),cos(t*4.+r.z*9.)*.15);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.z*40.)):0.;put(p,(.04+.06*aSeed.w)*(1.-age*.5));}`);
  base+=sparks(L.part,340,TI,`${f(E.x)},${f(E.y)},0.`,"-.3,.4,0.",4,12,3.2);
  // chispas por aliado: un hilo de chispas del aliado a la punta durante el crecimiento y una ráfaga extra en el impacto
  const AG=[0,1].map(i=>{const g=new THREE.Group();L.part.add(g);
    const pi=P(i);
    g.n=points(g,110,C+`const vec3 PA=${v3(pi)};void main(){float s=.35+aSeed.x*.5;float life=.35+aSeed.y*.15;float age=(uT-s)/life;
      vec3 r=rnd();vec3 m=mix(PA,E,.5)+vec3(0.,1.2,0.);float k=clamp(age,0.,1.);
      vec3 p=mix(mix(PA,m,k),mix(m,E,k),k)+r*.07*(1.-k);
      vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;put(p,.04+.05*aSeed.z);}`)
     +sparks(g,130,TI+0.12*(i+1),`${f(E.x)},${f(E.y)},0.`,"-.2,.6,0.",3.5,11,3);
    return g;});
  const sprout=groundPlane(3.8,G0.x,0.03,fx(RING_FS)), dirt=groundPlane(2.6,G0.x,0.015,fx(SCORCH_FS));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),fx(RING_FS)); hitRing.position.copy(E); L.mesh.add(hitRing);
  // fractura de baldosas bajo el rival (nivel 3): sigue al objetivo en su retroceso
  const FS=6.5, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  L.decal.add(sprout,dirt,frac);
  a.setVariant=v=>{a.v=v;AG.forEach((g,i)=>g.visible=i<+v);a.count=base+AG.slice(0,+v).reduce((s,g)=>s+g.n,0);};
  a.pose=function(te,o){
    const ia=te-TI, g=grow(te), q=cl((te-TB)/(TBE-TB))*1.12, n=+a.v;
    caster.rotation.z=0.15*ss(0,TG,te)-0.3*ss(TG,TG+0.1,te)+0.15*ss(TG+0.2,TI,te);
    hornMat.emissiveIntensity=0.9*ss(0,TG,te)*(1-ss(TI,TI+0.5,te));
    const glow=1-cl(Math.max(ia,0)/0.8);
    wood.visible=flame.visible=te>=TG&&q<1.1;
    set(wood,g,glow); wood.material.uniforms.uQ.value=q;
    set(flame,g,0.6+0.4*glow+0.6*(q>0?1:0)); flame.material.uniforms.uQ.value=q;
    curve.getPointAt(Math.min(g,1),tip.position); curve.getTangentAt(Math.min(g,1),tan);
    tip.quaternion.setFromUnitVectors(up,tan); tip.visible=te>=TG&&q<0.98;
    for(const th of thorns){const u=th.userData.u,sc=ss(u-0.02,u+0.05,g)*(1-ss(u-0.02,u+0.04,q));
      th.visible=sc>0.01; th.scale.setScalar(Math.max(sc,0.001));
      th.position.copy(th.userData.base); if(q>u)th.position.y-=3*(q-u)*(q-u);}
    thornMat.emissiveIntensity=0.35+0.8*(q>0?1:0);
    let p=cl((te-TG)/0.4); set(sprout,p,te>=TG?1-p:0); dirt.material.uniforms.uA.value=te>=TG?1-ss(2.2,2.9,te):0;
    p=cl(ia/0.4); billboard(hitRing); set(hitRing,p,ia>=0?1-p:0);
    allies.forEach((d,i)=>{if(i<n){d.userData.m.emissive.copy(U.uC1.value);d.userData.m.emissiveIntensity=0.6*ss(0.3,0.45,te)*(1-ss(0.85,1.2,te));}});
    const hit=ia>=0?Math.exp(-ia*3.5):0;
    target.position.x=3.4+hit*0.5*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.42*Math.cos(ia*13);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.2,2.95,te):0);
    if(te<TI){curve.getPointAt(Math.min(g,1),o.g);o.gs=1.1+0.2*n;o.ga=te>=TG?0.55:0;o.li=te>=TG?4+n:0;}
    else{o.g.copy(E);o.gs=1.8+4.5*Math.min(ia,0.6)+0.4*n;o.ga=Math.exp(-ia*8)*(0.85+0.1*n)+(q>0?0.18:0);o.li=(13+3*n)*Math.exp(-ia*4.5)+(q>0&&q<1?3.5:0);}
    o.ia=ia;o.c.copy(E);o.shake=1.5+0.15*n;o.dist=1.1+0.15*n;
  };
}};

// =====================================================================
// 5 · MERRY — escudo con forma de carnero dorado sobre el aliado; destello resonante y copos de lana
// =====================================================================
const merry={key:"merry",name:"Merry",dur:2.4,ti:0.75,pal:"Dorado",horns:true,allies:1,
  phases:[["Invocación",0],["Materialización",0.35],["Resonancia",0.75],["Lana",1.0],["Disipación",1.75]],
build(a){
  const L=a.L,TM=0.35,TI=0.75,TD=1.75,TE=2.3,AP=ALLY_POS[0],SC=AP.clone().add(V3(0,0.85,0)),R=1.1;
  // cúpula: brillo de borde + mechones de lana (bultos de ruido) que se llenan de abajo arriba
  const dome=new THREE.Mesh(new THREE.SphereGeometry(R,64,36,0,Math.PI*2,0,Math.PI*0.74),fxU(`uniform float uH;
  void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float h=(vP.y+.8)/1.9;
   float n=noise(normalize(vP)*5.+vec3(0.,uT*.3,0.))*.6+noise(normalize(vP)*11.)*.4;
   float puff=smoothstep(.48,.72,n);float rim=band(n,.6,.04);
   float fill=smoothstep(uP,uP-.12,h);float front=band(h,uP,.05)*step(uP,.99);
   float wave=band(fract(h*3.-uH*2.5),.5,.12)*exp(-uH*1.6)*step(0.,uH);
   float al=(fr*.55+puff*.16+rim*.35+.04+wave*.6)*fill+front*.9;
   gl_FragColor=vec4(mix(uC2,uC1,fr+rim)*1.35+vec3(1.)*(front+wave)*.5,al*uA);}`,{uH:{value:-1}}));
  dome.position.copy(SC);
  // cuernos de carnero: espirales afinadas a cada lado, con estrías que brillan; crecen desde la base
  const hornFS=`void main(){float u=vUv.x;if(u>uP)discard;
   float ridge=pow(.5+.5*sin(u*90.),3.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float head=smoothstep(.05,0.,abs(uP-u))*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,ridge*.7+fr*.5)*1.5+vec3(1.)*head,(.35+ridge*.4+fr*.5+head)*uA);}`;
  const hornsM=[-1,1].map(s=>{
    const pts=[];for(let i=0;i<=40;i++){const t=i/40,th=Math.PI*0.45+t*Math.PI*1.7,r=0.78*(1-0.62*t);
      pts.push(V3(-0.15+r*Math.cos(th)*-1,0.55+r*Math.sin(th)*0.95,s*(R*0.8+0.25*t)));}
    const m=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),120,12,0.17,0.035),fx(hornFS));
    m.position.copy(SC); m.scale.setScalar(0.85); return m;});
  L.mesh.add(dome,...hornsM);
  // anillos resonantes
  const rings=[0,0.1,0.2].map(d=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),fx(RING_FS,{depthTest:false}));m.userData.d=d;L.trail.add(m);return m;});
  // hilo dorado del lanzador al aliado durante la invocación
  const C=`const float TM=${f(TM)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 SC=${v3(SC)};const vec3 P0=vec3(-3.6,1.4,0.);`;
  a.count+=points(L.part,100,C+`void main(){float s=.05+aSeed.x*.25;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 m=mix(P0,SC,.5)+vec3(0.,1.,0.);vec3 r=rnd();
   vec3 p=mix(mix(P0,m,k),mix(m,SC,k),k)+r*.1*(1.-k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.035+.04*aSeed.z);}`);
  // copos de lana que caen girando alrededor de la cúpula
  a.count+=points(L.part,110,C+`void main(){float life=1.2+aSeed.y*.6;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;float rad=${f(R)}*(.4+.75*r.y);
   vec3 p=SC+vec3(cos(an)*rad,1.2-age*1.95+r.z*.35,sin(an)*rad);
   vA=(k>=1.&&p.y>.05)?sin(age*3.14159)*uE:0.;put(p,.1+.08*r.z);}`,FLUFF_FS);
  // ráfaga de lana al resonar y al deshacerse
  for(const [ti,amt] of [[TI,90],[TD,100]])a.count+=points(L.part,amt,C+`void main(){float s=${f(ti)}+aSeed.x*.08;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=SC+d*(${f(R)}+(.8+1.*aSeed.z)*(1.-exp(-t*3.)))+vec3(0.,-.4*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.08+.08*aSeed.w)*(1.-age*.4));}`,FLUFF_FS);
  a.count+=sparks(L.part,110,TI,`${f(SC.x)},${f(SC.y+0.5)},${f(SC.z)}`,"0.,.6,0.",2.5,6,2);
  // glifo en el suelo: anillos y dos espirales de cuerno
  const glyph=groundPlane(3.0,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.93,.018)+band(r,.8,.01);
   for(int i=0;i<2;i++){float o=float(i)*3.14159;float s=fract((an+o)/6.2832+r*1.4-uT*.15);m+=band(s,.5,.04)*smoothstep(.75,.2,r)*step(.12,r);}
   m+=band(r,.68,.04)*step(.55,fract(an/6.2832*20.+uT*.2));
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*uA);}`));
  glyph.position.z=AP.z;
  const shock=groundPlane(4.6,AP.x,0.03,fx(RING_FS)); shock.position.z=AP.z;
  L.decal.add(glyph,shock);
  a.pose=function(te,o){
    const ia=te-TI, mk=cl((te-TM)/(TI-TM)), env=ss(TM,TM+0.2,te)*(1-ss(TD,TE,te));
    caster.rotation.z=0.12*ss(0,0.2,te)-0.2*ss(0.2,0.32,te)+0.08*ss(0.35,0.85,te);
    hornMat.emissiveIntensity=0.8*ss(0,0.2,te)*(1-ss(0.45,0.8,te));
    dome.visible=te>=TM&&te<TE; dome.scale.setScalar(1+0.05*Math.exp(-Math.max(ia,0)*6)*(ia>=0?1:0)+0.01*Math.sin(te*4));
    set(dome,te<TD?Math.min(mk*1.1,1.2):1.2-1.25*cl((te-TD)/(TE-TD)),env); dome.material.uniforms.uH.value=ia>=0?ia:-1;
    for(const h of hornsM){h.visible=te>=TM&&te<TE;set(h,te<TD?ss(0,1,mk):1-cl((te-TD)/(TE-TD)),env*(1+0.8*(ia>=0?Math.exp(-ia*5):0)));}
    for(const r of rings){const k=cl((ia-r.userData.d)/0.5);r.visible=ia>=r.userData.d&&k<1;r.position.copy(SC);billboard(r);set(r,k,1-k);}
    let p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    glyph.material.uniforms.uA.value=ss(0.05,0.35,te)*(1-ss(TD,TE,te));
    U.uE.value=ia>=0?env:0;
    const d=allies[0].userData.m; d.emissive.copy(U.uC1.value); d.emissiveIntensity=0.3*env+(ia>=0?0.7*Math.exp(-ia*6):0);
    if(te<TM){o.g.set(-3.6,1.4,0);o.gs=0.9;o.ga=0.35*ss(0,0.2,te);o.li=2;}
    else{o.g.copy(SC);o.gs=2.1+(ia>=0?2.2*Math.min(ia,0.5):0);o.ga=0.1*env+(ia>=0?0.62*Math.exp(-ia*8):0);o.li=2.5*env+(ia>=0?7*Math.exp(-ia*5):0);}
    o.ia=ia;o.c.copy(SC);o.shake=0;o.dist=0.8;o.flash=0;
  };
}};

// =====================================================================
// 6 · POCKY — púa de madera con estela naranja; diana roja de provocación sobre el rival
// =====================================================================
const pocky={key:"pocky",name:"Pocky",dur:2.2,ti:0.6,pal:"Ámbar",horns:true,
  phases:[["Preparación",0],["Vuelo",0.34],["Impacto",0.6],["Provocación",0.78],["Fin",1.85]],
build(a){
  const L=a.L,TL=0.34,TI=0.6,TT=0.78,TF=1.85,P0=V3(-3.25,1.35,0),HP=V3(3.02,1.25,0),HEAD_Y=2.4;
  const fly=(te,out)=>{const k=cl((te-TL)/(TI-TL));return out.set(P0.x+(HP.x-P0.x)*k,P0.y+(HP.y-P0.y)*k+0.3*Math.sin(Math.PI*k),0);};
  const spike=new THREE.Mesh(new THREE.ConeGeometry(0.062,0.66,10).rotateZ(-Math.PI/2),fx(`
  void main(){float l=vP.x/.66+.5;
   float grain=noise(vec3(vP.x*30.,atan(vP.y,vP.z)*2.,0.));
   vec3 wood=mix(vec3(.2,.11,.05),vec3(.45,.27,.13),grain);
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   gl_FragColor=vec4(wood*lit+uC1*pow(l,4.)*1.8+uC2*smoothstep(.6,.9,grain)*.4,1.);}`,SOLID));
  L.mesh.add(spike);
  // estela: planos cruzados con jirones de viento naranja
  const tg=new THREE.PlaneGeometry(1,0.36).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*7.-uT*12.,v*4.,uT));
   float al=smoothstep(u*(.45+.55*n),0.,v)*u*u*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.2,0.,v)*u*.4,al);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2; trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
  // diana de provocación (rojo fijo: es un indicador de juego, no depende de la paleta)
  const RED="vec3(1.,.13,.08)";
  const reticle=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float m=band(r,.86,.05)+band(r,.55,.045)+smoothstep(.13,.08,r);
   float ticks=step(abs(p.x),.04)*step(.6,abs(p.y))*step(abs(p.y),.98)+step(abs(p.y),.04)*step(.6,abs(p.x))*step(abs(p.x),.98);
   float arc=band(r,.72,.03)*step(.5,fract(an/6.2832*3.-uT*.8));
   m+=ticks+arc;float glow=smoothstep(1.,.0,r)*.12;
   gl_FragColor=vec4(${RED}*1.7+vec3(1.)*smoothstep(.1,0.,r)*.6,(min(m,1.)+glow)*uA);}`,{depthTest:false}));
  L.mesh.add(reticle);
  // cadena de provocación: trazos rojos que fluyen del rival hacia el lanzador
  const tether=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1,6,1,true).rotateZ(Math.PI/2),fx(`
  void main(){float u=vUv.y;float dash=step(.45,fract(u*24.-uT*3.));
   gl_FragColor=vec4(${RED}*1.6,dash*.8*uA*smoothstep(0.,.05,u)*smoothstep(1.,.95,u));}`));
  L.trail.add(tether);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 HP=${v3(HP)};
  vec3 fly(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,HP,k)+vec3(0.,.3*sin(3.14159*k),0.);}`;
  a.count+=points(L.part,150,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();float an=aSeed.z*6.2832+t*9.;vec3 p=fly(s)+vec3(-.45*t,.18*t+cos(an)*.1*t*3.,sin(an)*.1*t*3.)+r*.035;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.04*aSeed.w)*(1.-age*.5));}`);
  // astillas de la púa al clavarse (pequeñas)
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-1.2,.8,0.))*(1.6+2.2*aSeed.z);vec3 p=HP+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,150,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.7,.4,0.",2.5,7,3);
  // aro rojo de provocación en el suelo, con flechas que apuntan hacia dentro
  const tauntRing=groundPlane(2.6,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.03)+band(r,.75,.015);
   float ch=fract(an/6.2832*8.+uT*.2);float arrow=smoothstep(.06,0.,abs(abs(ch-.5)*.9-(r-.55)))*step(.5,r)*step(r,.72);
   m+=arrow;float pulse=.6+.4*sin(uT*14.);
   gl_FragColor=vec4(${RED}*1.5,m*pulse*uA);}`));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS)); hitRing.position.copy(HP); L.mesh.add(hitRing);
  L.decal.add(tauntRing);
  const sp=V3(0,0,0), dir=V3(0,0,0), rp=V3(0,0,0), xz=V3(1,0,0);
  a.pose=function(te,o){
    const ia=te-TI, tt=te-TT;
    caster.rotation.z=0.18*ss(0,TL,te)-0.4*ss(TL,TL+0.06,te)+0.22*ss(TL+0.1,TL+0.5,te);
    hornMat.emissiveIntensity=0.6*ss(0,TL,te)*(1-ss(TL,TL+0.35,te));
    const hit=ia>=0?Math.exp(-ia*6):0;
    target.position.x=3.4+hit*0.14; target.rotation.z=-hit*0.2*Math.cos(ia*15);
    // en vuelo gira sobre su eje; tras el impacto queda clavada, vibra y se desvanece
    if(te<TI){fly(te,sp);fly(te+0.01,dir);dir.sub(sp).normalize();spike.position.copy(sp);spike.quaternion.setFromUnitVectors(xz,dir);spike.rotateX(te*30);}
    else{spike.position.set(HP.x+0.1+hit*0.14,HP.y,0);spike.quaternion.setFromUnitVectors(xz,dir.set(1,-0.18+0.12*Math.sin(ia*60)*Math.exp(-ia*6)+target.rotation.z,0).normalize());}
    spike.visible=te>=TL-0.15&&te<TF+0.3; spike.scale.setScalar(Math.max(1-ss(TF,TF+0.3,te),0.001)*(te<TL?ss(TL-0.15,TL,te):1));
    trail.visible=te>TL&&ia<0.2; fly(te,trail.position); trail.scale.set(Math.max(trail.position.x-P0.x,0.001),1,1);
    trail.rotation.z=Math.atan2(dir.y,dir.x); tm.uniforms.uA.value=ia>0?1-cl(ia/0.2):1;
    let p=cl(ia/0.3); billboard(hitRing); set(hitRing,p,ia>=0?(1-p)*0.85:0);
    // la diana cae grande y se ajusta de golpe; luego late
    const on=ss(TT-0.05,TT+0.05,te)*(1-ss(TF,TF+0.3,te)), slam=1+1.5*Math.pow(1-cl(tt/0.16),2);
    const beat=1+0.12*Math.pow(0.5+0.5*Math.sin(tt*14),6);
    towardCam(rp.set(target.position.x,HEAD_Y,0),rp,0.3); reticle.position.copy(rp); billboard(reticle);
    reticle.scale.setScalar(Math.max(0.75*slam*beat*on,0.001)); reticle.visible=on>0.001; reticle.material.uniforms.uA.value=on*(tt<0.16?cl(tt/0.16):1);
    tether.visible=on>0.001; tether.position.set((target.position.x+caster.position.x)/2,1.75,0); tether.scale.set(1,target.position.x-caster.position.x,1);
    tether.material.uniforms.uA.value=on*0.8;
    tauntRing.material.uniforms.uA.value=on;
    o.em=on*0.3*beat; o.emc.setRGB(1,0.15,0.1);
    if(te<TI){fly(Math.max(te,TL),o.g);o.gs=te>=TL?0.85:0.45;o.ga=te>=TL?0.42:0.18;o.li=2.4;}
    else{o.g.copy(HP);o.gs=1.1+2.4*ia;o.ga=Math.exp(-ia*11)*0.6;o.li=6*Math.exp(-ia*6)+1.2*on;}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.5;
  };
}};

// =====================================================================
// 7 · BOOMERANG — vuelo elíptico con estela de viento; golpea en la ida y vuelve a las manos
// =====================================================================
const boom={key:"boom",name:"Boomerang",dur:1.3,ti:0.43,pal:"Ámbar",horns:true,
  phases:[["Lanzamiento",0],["Ida",0.1],["Impacto",0.43],["Regreso",0.5],["Atrapada",0.76]],
build(a){
  const L=a.L,TL=0.1,TC=0.76,TI=0.43,CE=V3(0,1.25,0),AX=3.38,BZ=1.5;
  const at=(s,out)=>{const th=Math.PI+2*Math.PI*s;return out.set(CE.x+AX*Math.cos(th),CE.y+0.3*Math.sin(2*Math.PI*s)*0.5,BZ*Math.sin(th));};
  // bumerán: dos brazos de madera unidos en el codo, con runas que brillan
  const runeMat=fx(`void main(){float g=noise(vec3(vP.x*22.,vP.z*22.,0.));
   vec3 wood=mix(vec3(.22,.12,.06),vec3(.48,.29,.14),g);
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float rune=step(.82,fract(vP.x*9.+floor(vP.z*30.)*.37))*step(abs(vP.z),.035);
   gl_FragColor=vec4(wood*lit+uC1*rune*2.2,1.);}`,SOLID);
  const bm=new THREE.Group();
  for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.045,0.13),runeMat);arm.position.set(0.24*Math.cos(s*0.95),0,0.24*Math.sin(s*0.95));arm.rotation.y=-s*0.95;bm.add(arm);}
  const spin=new THREE.Group(); spin.add(bm); spin.scale.setScalar(0.62); L.mesh.add(spin);
  // disco de giro: anillo borroso aditivo que vende la velocidad de rotación
  const blur=new THREE.Mesh(new THREE.RingGeometry(0.1,0.58,48).rotateX(-Math.PI/2),fx(`void main(){float r=length(vP.xz);float an=atan(vP.z,vP.x);
   float m=smoothstep(.58,.4,r)*smoothstep(.1,.2,r)*(.5+.5*sin(an*2.-uT*60.));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.3,m*.35*uA);}`));
  spin.add(blur);
  // estela elíptica: cinta plana + vertical a lo largo de toda la órbita; uP es la posición actual (0..1)
  const N=220, pos=[], uvs=[], idx=[], pos2=[];
  const pt=V3(0,0,0), nx=V3(0,0,0);
  for(let i=0;i<=N;i++){const s=i/N;at(s,pt);at(Math.min(s+0.001,1),nx);nx.sub(pt).normalize();
    const side=V3(-nx.z,0,nx.x).multiplyScalar(0.11);
    pos.push(pt.x-side.x,pt.y,pt.z-side.z,pt.x+side.x,pt.y,pt.z+side.z); pos2.push(pt.x,pt.y-0.08,pt.z,pt.x,pt.y+0.08,pt.z);
    uvs.push(s,0,s,1); if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const mk=p=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();return g;};
  const ribbonMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float d=uP-u;
   if(d<0.||d>.18)discard;
   float n=noise(vec3(u*40.-uT*8.,v*3.,0.));
   float al=exp(-d*16.)*smoothstep(1.,.15,v+(n-.5)*.4)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*8.))*1.5+vec3(1.)*exp(-d*30.)*.4,al);}`);
  L.trail.add(new THREE.Mesh(mk(pos),ribbonMat),new THREE.Mesh(mk(pos2),ribbonMat));
  const C=`const float TL=${f(TL)};const float TC=${f(TC)};const float TI=${f(TI)};
  vec3 at(float s){float th=3.14159+6.28318*s;return vec3(${f(CE.x)}+${f(AX)}*cos(th),${f(CE.y)}+.15*sin(6.28318*s),${f(BZ)}*sin(th));}`;
  // remolinos de viento y hojas que se sueltan en la trayectoria
  a.count+=points(L.part,150,C+`void main(){float s=aSeed.x;float ts=TL+s*(TC-TL);float life=.2+aSeed.y*.2;float age=(uT-ts)/life;float t=max(uT-ts,0.);
   vec3 r=rnd();float an=aSeed.z*6.2832+t*14.;vec3 p=at(s)+vec3(cos(an),sin(an)*.7,sin(an))*.1*(.4+t*2.5)+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.02+.025*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x;float ts=TL+s*(TC-TL);float life=.4+aSeed.y*.3;float age=(uT-ts)/life;float t=max(uT-ts,0.);
   vec3 r=rnd();vec3 p=at(s)+vec3(r.x*.3*t+sin(t*8.+r.z*9.)*.1,-.5*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.055+.03*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,110,TI,"3.2,1.25,0.","0.,.4,.8",2,6,3);
  a.count+=sparks(L.part,40,TC,"-3.3,1.25,0.","0.,.6,0.",1.5,3.5,2);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(RING_FS)); hitRing.position.set(3.2,1.25,0);
  const catchRing=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fx(RING_FS)); catchRing.position.set(-3.35,1.25,0);
  L.mesh.add(hitRing,catchRing);
  // trazo tenue de la órbita en el suelo mientras vuela
  const orbit=groundPlane(8,0,0.02,fx(`void main(){vec2 p=(vUv-.5)*8.;
   float e=length(vec2(p.x/${f(AX)},p.y/${f(BZ)}));float m=band(e,1.,.007)*(.4+.6*step(.5,fract(atan(p.y,p.x)*6.-uT*4.)));
   gl_FragColor=vec4(uC1*1.1,m*.25*uA);}`));
  L.decal.add(orbit);
  a.pose=function(te,o){
    const ia=te-TI, ic=te-TC, s=cl((te-TL)/(TC-TL)), flying=te>=TL&&te<TC;
    caster.rotation.z=0.15*ss(0,TL,te)-0.3*ss(TL,TL+0.05,te)+0.15*ss(TL+0.05,TL+0.3,te)+(ic>=0?0.1*Math.exp(-ic*8)*Math.sin(ic*24):0);
    hornMat.emissiveIntensity=0.4*ss(0,TL,te)*(1-ss(TL,TL+0.2,te))+(ic>=0?0.6*Math.exp(-ic*7):0);
    if(flying)at(s,spin.position); else spin.position.set(-3.3,1.25,0.15);
    spin.position.y+=te<TL?0.06*Math.sin(te*30):0;
    spin.rotation.set(0.3,0,0.15); bm.rotation.y=flying?te*40:0.4;
    blur.material.uniforms.uA.value=flying?1:0;
    ribbonMat.uniforms.uP.value=flying?s:(te>=TC?1+(te-TC)*0.5:0); ribbonMat.uniforms.uA.value=flying?0.85:Math.max(0,0.85-cl(ic/0.15));
    let p=cl(ia/0.22); billboard(hitRing); set(hitRing,p,ia>=0?(1-p)*0.8:0);
    p=cl(ic/0.2); billboard(catchRing); set(catchRing,p,ic>=0?(1-p)*0.7:0);
    orbit.material.uniforms.uA.value=flying?ss(0,0.1,s)*(1-ss(0.9,1,s)):0;
    const hit=ia>=0?Math.exp(-ia*7):0;
    target.position.x=3.4+hit*0.12; target.rotation.z=-hit*0.18*Math.cos(ia*18);
    if(flying){o.g.copy(spin.position);o.gs=0.7;o.ga=0.3;o.li=2.2;}
    else{o.g.set(-3.3,1.25,0);o.gs=0.7;o.ga=ic>=0?0.4*Math.exp(-ic*10):0.1*ss(0,TL,te);o.li=ic>=0?3*Math.exp(-ic*8):0.6;}
    if(ia>=0&&ia<0.3){o.ga+=Math.exp(-ia*14)*0.45;o.li+=5*Math.exp(-ia*8);}
    o.ia=ic>=0?ic:ia; o.c.copy(ic>=0?catchRing.position:hitRing.position); o.shake=0; o.dist=ic>=0?0.2:0.5; o.flash=ic>=0?0:1;
  };
}};

// =====================================================================
// 8 · LUMP — onda de vigor desde los cuernos hacia el aliado; llamas de furia ascendentes
// =====================================================================
const lump={key:"lump",name:"Lump",dur:2.1,ti:0.68,pal:"Ámbar",horns:true,allies:1,
  phases:[["Carga",0],["Onda",0.3],["Vigor",0.68],["Furia",0.95],["Fin",1.8]],
build(a){
  const L=a.L,TW=0.3,TI=0.68,TF=1.8,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.1,0)),HC=V3(-3.55,1.98,0);
  const dir=AC.clone().sub(HC).normalize(), len=AC.distanceTo(HC);
  // pulsos: anillos perpendiculares a la trayectoria, con forma de chevrón por ruido
  const rings=[0,0.08,0.16,0.24].map(d=>{
    const m=new THREE.Mesh(new THREE.RingGeometry(0.28,0.42,48),fx(`void main(){float r=(length(vP.xy)-.28)/.14;float an=atan(vP.y,vP.x);
     float n=noise(vec3(an*3.,uT*6.,0.));
     float m=smoothstep(1.,.4,abs(r*2.-1.)+n*.3);
     gl_FragColor=vec4(mix(uC2,uC1,m)*1.6,m*uA);}`));
    m.quaternion.setFromUnitVectors(V3(0,0,1),dir); m.userData.d=d; L.trail.add(m); return m;});
  // halo en los cuernos durante la carga
  const hornGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(`void main(){float d=length(vUv-.5)*2.;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.3,pow(max(0.,1.-d),2.5)*uA);}`,{depthTest:false}));
  L.mesh.add(hornGlow);
  // aura de vigor en el aliado
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.47,0.54,1.85,36,10,true),fx(fireFS(1.85,2.6)));
  shell.position.copy(AP).add(V3(0,0.95,0)); L.mesh.add(shell);
  const C=`const float TW=${f(TW)};const float TI=${f(TI)};const float TF=${f(TF)};const vec3 HC=${v3(HC)};const vec3 AC=${v3(AC)};const vec3 AP=${v3(AP)};`;
  // chispas que viajan con la onda
  a.count+=points(L.part,120,C+`void main(){float s=TW+aSeed.x*.22;float life=.38;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();vec3 p=mix(HC,AC,k)+r*.16*sin(k*3.14159)+vec3(0.,.2*sin(k*3.14159),0.);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.035+.04*aSeed.z);}`);
  // llamitas de furia que suben alrededor del aliado
  a.count+=points(L.part,85,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.4+r.y*.3;
   vec3 p=AP+vec3(cos(an)*rad+sin(age*7.+r.z*9.)*.05,.1+age*(1.3+r.z*.6),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.13+.1*r.z)*(1.-age*.4));}`,FLAME_FS);
  // chevrones de mejora
  a.count+=points(L.part,14,C+`void main(){float life=.9;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.,.4+age*1.5,(r.y-.5)*1.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.25);}`,CHEVRON_FS);
  a.count+=sparks(L.part,100,TI,`${f(AC.x)},${f(AC.y)},${f(AC.z)}`,"0.,.8,0.",2.5,6,2.2);
  const burst=groundPlane(3.2,AP.x,0.03,fx(RING_FS)); burst.position.z=AP.z;
  const glyph=groundPlane(2.1,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.03)+band(r,.65,.015)+band(fract(an/6.2832*6.+uT*.4),.5,.1)*band(r,.78,.06);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*uA);}`)); glyph.position.z=AP.z;
  L.decal.add(burst,glyph);
  const hp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ch=ss(0,TW,te), env=ss(TI,TI+0.2,te)*(1-ss(TF-0.3,TF+0.2,te));
    caster.rotation.z=0.2*ch-0.32*ss(TW,TW+0.08,te)+0.12*ss(TW+0.1,TW+0.5,te);
    hornMat.emissiveIntensity=1.2*ch*(1-ss(TW+0.1,TW+0.5,te))+0.25;
    hp.copy(HC); hornGlow.position.copy(hp); billboard(hornGlow); hornGlow.material.uniforms.uA.value=0.65*ch*(1-ss(TW,TW+0.28,te));
    for(const r of rings){const k=cl((te-TW-r.userData.d)/0.38);r.visible=k>0&&k<1;
      r.position.copy(HC).addScaledVector(dir,len*k); r.scale.setScalar(0.5+0.7*k); set(r,k,0.85*Math.sin(Math.PI*k));}
    set(shell,0.3+0.5*Math.pow(0.5+0.5*Math.sin(te*9),3),env*0.85);
    let p=cl(ia/0.45); set(burst,p,ia>=0?(1-p)*0.8:0); glyph.material.uniforms.uA.value=env*0.85;
    U.uE.value=env;
    const d=allies[0]; d.userData.m.emissive.copy(U.uC1.value); d.userData.m.emissiveIntensity=0.38*env+(ia>=0?0.65*Math.exp(-ia*7):0);
    d.scale.set(1,1+0.04*env*(0.5+0.5*Math.sin(te*9)),1);
    if(te<TI){o.g.copy(te<TW?HC:hp.copy(HC).addScaledVector(dir,len*cl((te-TW)/0.38)));o.gs=1;o.ga=0.42*ch;o.li=3.2*ch;}
    else{o.g.copy(AC);o.gs=1.7+1.6*Math.min(ia,0.6);o.ga=Math.exp(-ia*9)*0.58+0.08*env;o.li=6*Math.exp(-ia*6)+2*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

VFX.module("Bestia · Cuernos",[arco,dual,imp,branch,merry,pocky,boom,lump]);
})();

// =====================================================================
// MÓDULO · CLASE REPTIL (CUERNOS)
// Estética reptil: escamas, hueso, veneno esmeralda y púrpura, arena y sangre fría. Todas cuestan 2 PA (nivel 2:
// firmes y estándar, sin fractura de suelo ni temblor). No se dibujan cuernos del Axie: lo que "nace de los cuernos"
// arranca en la zona alta de la cabeza (≈ x −3.6, y 2.1) como proyección de energía u objeto (tubo, lanza, cuchara).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,DUST_FS,STAR4_FS,SMOKE_FS,SD_HEART,billboard,towardCam,taperTube}=VFX.lib;
VFX.palette("Arenisca",["#f2c48d","#7b4a26"]);

const TC=V3(3.15,1.2,0);                                    // pecho del objetivo
const HN=V3(-3.6,2.1,0);                                    // zona de los cuernos del lanzador (sin malla)
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const FR=`(1.-abs(dot(normalize(vN),normalize(vV))))`;
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
const setM=(m,p,a)=>{m.uniforms.uP.value=p;m.uniforms.uA.value=a;};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};

// ---------- fragmentos compartidos del módulo ----------
// mancha suave de suelo (nivel 2: sin grietas)
const SOFT_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;
// escamas en rejilla desplazada (escama de pez/reptil): g = coordenadas de celda; devuelve el borde de la escama
const SCALEGRID=`float scl(vec2 g){g.x+=step(1.,mod(floor(g.y),2.))*.5;vec2 c=fract(g)-vec2(.5,0.);return length(c*vec2(1.,1.2));}`;
// escama suelta que gira (vR)
const SCALE_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=length(vec2(q.x*1.15,(q.y+.06)*(1.+max(-q.y,0.)*1.6)));
 float a=smoothstep(.36,.3,d)*vA;if(a<.003)discard;
 float rim=smoothstep(.2,.33,d);float rid=smoothstep(.035,0.,abs(q.x))*step(q.y,.15);
 gl_FragColor=vec4(mix(uC1,uC2,rim*.8)*1.35+vec3(1.)*(rid*.35+smoothstep(.12,0.,length(q-vec2(-.06,.05)))*.4),a);}`;
// esquirla de hueso que gira (vR)
const SHARD_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=abs(vec2(c*q.x-s*q.y,s*q.x+c*q.y));
 float d=q.x*1.7+q.y;float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
 vec3 bone=mix(vec3(.55,.46,.36),vec3(1.,.94,.8),vMix);
 gl_FragColor=vec4(mix(bone,uC1,.35)*1.25+vec3(1.)*smoothstep(.18,0.,d)*.4,a);}`;
// calavera espectral (SDF): cráneo, mandíbula con dientes, cuencas y nariz
const SD_SKULL=`float sdBx(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
float sdSkull(vec2 p){float d=length(p-vec2(0.,.08))-.27;
 d=min(d,sdBx(p-vec2(0.,-.16),vec2(.13,.09))-.03);
 d=max(d,-(min(length(p-vec2(-.1,.05))-.075,length(p-vec2(.1,.05))-.075)));
 d=max(d,-(length((p-vec2(0.,-.07))*vec2(1.7,1.))-.035));
 float gx=abs(fract(p.x*14.+.5)-.5)/14.-.005;d=max(d,-max(gx,abs(p.y+.2)-.05));return d;}`;
const SKULL_FS=HEAD+SD_SKULL+`varying float vA;varying float vMix;
void main(){vec2 p=vec2(gl_PointCoord.x-.5,.5-gl_PointCoord.y)*1.15;float d=sdSkull(p);
 float body=smoothstep(.015,-.015,d);float rim=smoothstep(.035,0.,abs(d));float halo=smoothstep(.2,0.,d)*.25;
 float a=(body*.5+rim+halo)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,rim*.45+vMix*.2)*1.5+vec3(.35)*rim,a);}`;

// =====================================================================
// 1 · BUMPY — (innata) losas de hueso rugoso flotan y se erizan sobre el lomo; vibran y escupen esquirlas que
//     rebotan por el suelo; después una coraza de escamas se enciende por bandas: cada banda = +escudo acumulado
// =====================================================================
const bumpy={key:"rcBumpy",name:"Bumpy",pa:2,dur:2.2,ti:0.7,pal:"Arenisca",
  phases:[["Tensión",0],["Erizado",0.28],["Rebote",0.7],["Coraza",0.95],["Acumulación",1.2],["Fin",1.85]],
build(a){
  const L=a.L,TE=0.28,TI=0.7,TD=0.95,PK=[1.2,1.42,1.64],TF=1.85,CX=-3.7,BK=V3(-3.95,1.15,0);
  // losas: hexágonos gruesos de hueso poroso; uQ = calor de vibración en las picaduras y el borde
  const plateMat=fxU(`uniform float uQ;
  void main(){vec3 q=vP*16.;float n=noise(q)*.55+noise(q*2.6+3.)*.3+noise(q*6.)*.15;
   float pit=smoothstep(.58,.74,noise(vP*34.+7.));
   vec3 bone=mix(vec3(.36,.28,.2),vec3(.9,.82,.66),n)*(1.-pit*.45);
   float fr=pow(${FR},2.);
   gl_FragColor=vec4(bone*${LIT}+uC1*fr*(.25+uQ*.9)+uC2*pit*uQ*1.6,1.);}`,{uQ:{value:0}},SOLID);
  const plateG=new THREE.CylinderGeometry(0.15,0.18,0.05,6).rotateZ(-Math.PI/2);   // eje del hexágono → +x local
  const plates=[];
  [[0.5,5,0.47],[0.92,6,0.5],[1.32,5,0.48],[1.8,3,0.34]].forEach(([y,n,r],ri)=>{
    for(let i=0;i<n;i++){const phi=Math.PI*(0.62+0.76*(i/(n-1)))+ri*0.07;
      const g=new THREE.Group(),m=new THREE.Mesh(plateG,plateMat); g.position.set(CX,y,0); g.rotation.y=-phi; g.add(m); L.mesh.add(g);
      plates.push({g,m,r,t0:TE+(plates.length%7)*0.045+ri*0.02,ph:plates.length*1.7});}});
  // coraza de escamas: se revela de abajo arriba (uP) y enciende tres bandas (uQ 0..3); uB = destello del pulso
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.82,40,24),fxU(SCALEGRID+`uniform float uQ;uniform float uB;
  void main(){float an=atan(vP.z,vP.x);float h=vP.y/1.64+.5;
   float sc=band(scl(vec2(an*4.775,h*10.)),.55,.08);
   float on=clamp(uQ-floor(h*3.),0.,1.);
   float fr=pow(${FR},1.6);float n=noise(vec3(an*3.,h*8.,uT));
   float edge=band(h,uP,.03)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,.35+.65*on)*1.4+vec3(1.)*uB*on*.35,((sc*(.12+.6*on)*(.7+.3*n)+fr*(.2+.25*on))*step(h,uP)+edge)*uA);}`,{uQ:{value:0},uB:{value:0}}));
  dome.position.set(CX,0.95,0); dome.scale.set(1,1.2,1); L.mesh.add(dome);

  const C=`const float TE=${f(TE)};const float TI=${f(TI)};const vec3 BK=${v3(BK)};varying float vR;`;
  // tensión: arena que converge en el lomo
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TE+.12);float life=.3+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(-.6,.2,0.));vec3 p=BK+d*mix(1.3,.1,age*age);vR=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // esquirlas que salen de las losas, caen y rebotan (segundo bote amortiguado)
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.06;float t=uT-s;float c=max(t,0.);
   float phi=3.14159*(.55+.9*aSeed.z);vec3 dir=vec3(cos(phi),0.,sin(phi));
   float y0=.45+aSeed.w*1.4;float vy=1.+2.*aSeed.y;float g=7.;
   float tl=(vy+sqrt(vy*vy+4.*g*y0))/(2.*g);float y;float hz;
   if(c<tl){y=y0+vy*c-g*c*c;hz=c;}else{float u=c-tl;float v2=(2.*g*tl-vy)*.38;y=max(v2*u-g*u*u,0.)+.02;hz=tl+u*.45;}
   vec3 p=vec3(${f(CX)},0.,0.)+dir*(.45+(1.4+2.2*aSeed.x)*hz)+vec3(0.,y,0.);
   vR=aSeed.y*6.2832+min(c,tl+.3)*(8.+10.*aSeed.z);
   float life=1.+aSeed.y*.3;vA=(t>0.&&t<life)?1.-smoothstep(life*.6,life,t):0.;put(p,.08+.07*aSeed.w);}`,SHARD_FS);
  a.count+=sparks(L.part,70,TI,`${f(BK.x)},${f(BK.y)},0.`,"-.8,.5,0.",2,6,2.5);
  a.count+=points(L.part,40,C+`void main(){float s=TI+.1+aSeed.x*.2;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=3.14159*(.5+aSeed.z);vec3 p=vec3(${f(CX)},.05,0.)+vec3(cos(an),0.,sin(an))*(.5+1.1*aSeed.w)*(1.-exp(-t*3.))+vec3(0.,.22*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.2+.16*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // acumulación: escamas que vuelan a la coraza y se encajan en su banda en cada pulso
  PK.forEach((tk,i)=>{const hn=((i+0.5)/3-0.5)*2,by=0.95+hn*0.984,r=0.82*Math.sqrt(1-hn*hn)+0.02;
    a.count+=points(L.part,30,C+`void main(){float s=${f(tk-0.2)}+aSeed.x*.05;float k=clamp((uT-s)/.2,0.,1.);float fl=uT-s-.2;
     float an=aSeed.z*6.2832;vec3 e=vec3(${f(CX)}+cos(an)*${f(r)},${f(by)}+(aSeed.y-.5)*.22,sin(an)*${f(r)});
     vec3 p=mix(e+vec3(cos(an)*1.2,.5*(aSeed.w-.3),sin(an)*1.2),e,k*k);vR=an+k*4.;
     vA=(uT>s&&fl<.15)?(fl<0.?smoothstep(0.,.25,k):1.-fl/.15):0.;put(p,(.1+.04*aSeed.w)*(fl>0.?1.+fl*4.:1.));}`,SCALE_FS);});
  // destellos que recorren la coraza
  a.count+=points(L.part,36,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-${f(TD)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vR=0.;
   float an=r.x*6.2832;float hh=r.y*1.6-.8;float rad=.84*sqrt(max(1.-hh*hh/.64*.6,0.));
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.95+hh*1.1,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.08*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // suelo: sello de escamas concéntricas bajo el lanzador y onda del rebote
  const sig=groundPlane(2.4,CX,0.02,fx(SCALEGRID+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sc=band(scl(vec2(an*3.82,r*6.)),.55,.06)*step(.25,r)*step(r,.88);
   float m=(sc*.5+band(r,.95,.015)+band(r,.2,.012))*step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,.55)*1.3,m*uA);}`)), shock=groundPlane(3.4,CX,0.03,fx(RING_FS));
  L.decal.add(sig,shock);

  a.pose=function(te,o){
    const ia=te-TI, env=ss(TD,TD+0.2,te)*(1-ss(TF,a.dur,te)), vib=ss(TI-0.14,TI,te)*(1-ss(TI,TI+0.08,te));
    let pb=0,band=0; for(const t of PK){if(te>=t)pb=Math.max(pb,Math.exp(-(te-t)*7));band+=ss(t,t+0.1,te);}
    const crouch=ss(0,TE,te)*(1-ss(TE,TE+0.15,te));
    caster.rotation.z=-0.08*crouch+0.035*vib*Math.sin(te*90)+(ia>=0?0.07*Math.exp(-ia*8)*Math.sin(ia*30):0);
    caster.scale.set(1+0.05*crouch,1-0.07*crouch,1+0.05*crouch);
    glowOf(caster,U.uC1.value,0.15*ss(0,TE,te)*(1-ss(TI,TD,te))+(ia>=0?0.5*Math.exp(-ia*6):0)+0.25*pb);
    const out=1-ss(TF-0.1,a.dur-0.05,te), kick=ia>=0?0.16*Math.exp(-ia*9):0;
    for(const P of plates){const e=ss(P.t0,P.t0+0.18,te),s=e*out;
      P.g.visible=s>0.001;
      P.m.position.x=0.25+(P.r+0.08-0.25)*e+kick+0.014*vib*Math.sin(te*95+P.ph);
      P.m.rotation.z=0.6*e+0.14*vib*Math.sin(te*70+P.ph)-0.25*kick;
      P.m.scale.setScalar(Math.max(s,0.001));}
    plateMat.uniforms.uQ.value=vib+(ia>=0?Math.exp(-ia*5):0)+0.4*pb;
    set(dome,ss(TD,TD+0.3,te),env*0.9); dome.material.uniforms.uQ.value=band; dome.material.uniforms.uB.value=pb;
    U.uE.value=env;
    set(sig,ss(0,TE+0.2,te),ss(0,0.2,te)*(1-ss(TF,a.dur,te))*0.8);
    const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    o.g.copy(BK);
    if(te<TI){o.gs=0.6+0.5*ss(TE,TI,te);o.ga=0.12+0.2*vib;o.li=1+2*vib;}
    else{o.gs=1.2+1.8*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.6+0.1*env+0.2*pb;o.li=6*Math.exp(-ia*5)+1.2*env+2.5*pb;}
    o.ia=ia;o.c.copy(BK);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 2 · CERASTES — (aliado) dos cuernos de víbora espectrales surgen sobre la cabeza, vuelan en arco y se clavan junto
//     al aliado; bombean veneno esmeralda por el suelo hasta un velo que lo envuelve y late con calaveras púrpuras
//     (veneno "cargado" que devolverá el daño al próximo agresor)
// =====================================================================
const cerastes={key:"rcCerastes",name:"Cerastes",pa:2,dur:2.3,ti:0.85,pal:"Toxina",allies:1,
  phases:[["Conjuro",0],["Vuelo",0.25],["Clavado",0.85],["Inyección",1.0],["Calaveras",1.3],["Fin",1.95]],
build(a){
  const L=a.L,TL=0.25,TI=0.85,TJ=1.0,TF=1.95,AP=ALLY_POS[0],AC=V3(AP.x,1.0,AP.z),BT=[1.3,1.62];
  const HS=[V3(-3.62,2.32,-0.2),V3(-3.62,2.32,0.2)],HE=[V3(AP.x-0.6,-0.08,AP.z+0.22),V3(AP.x+0.6,-0.08,AP.z+0.22)];
  // cuerno de víbora: tubo curvo afinado con anillos; el origen es la punta (pivote) y el cuerpo queda en −y
  const hornG=taperTube(new THREE.CatmullRomCurve3([V3(-0.3,-0.95,0),V3(-0.14,-0.62,0),V3(-0.05,-0.3,0),V3(0,0,0)]),28,10,0.1,0.008);
  const hornMat=fxU(`uniform float uQ;
  void main(){float u=vUv.x;float rid=pow(abs(sin(u*44.)),.7);float fr=pow(${FR},1.4);
   float fl=pow(.5+.5*sin(u*18.-uT*16.),5.)*uQ;float n=noise(vec3(u*12.,vUv.y*6.,uT*2.));
   vec3 c=mix(uC1*.55,uC1,rid)*(.55+fr)+uC2*fl*1.8+vec3(1.)*smoothstep(.85,1.,u)*.5;
   gl_FragColor=vec4(c*1.3,(.3+.6*fr+.25*rid*n+fl)*uA);}`,{uQ:{value:0}});
  const horns=HS.map(()=>{const g=new THREE.Group();g.add(new THREE.Mesh(hornG,hornMat));L.mesh.add(g);return g;});
  // velo de veneno alrededor del aliado: membrana con escamas, regueros que caen y latido (uQ)
  const ward=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.7,2.0,40,8,true),fxU(SCALEGRID+`uniform float uQ;
  void main(){float an=atan(vP.z,vP.x);float h=vP.y/2.+.5;
   float drip=noise(vec3(an*6.,h*2.5+uT*1.2,1.));float st=pow(smoothstep(.55,.9,noise(vec3(an*9.,h*1.2+uT*.8,4.))),2.);
   float sc=band(scl(vec2(an*4.14,h*8.)),.55,.07);float fr=pow(${FR},1.5);float top=smoothstep(1.,.6,h);
   float al=(fr*.55+sc*.2+st*.5)*top*step(h,uP)+band(h,uP,.04)*step(uP,.99);
   gl_FragColor=vec4(mix(uC1,uC2,drip*.7+uQ*.3)*1.4+vec3(1.)*uQ*fr*.3,al*uA*(.75+.5*uQ));}`,{uQ:{value:0}}));
  ward.position.copy(AC); L.mesh.add(ward);
  // suelo: venas de veneno desde los dos cuernos hacia el aliado y charco que se carga (centrado bajo el aliado)
  const veins=groundPlane(2.8,AP.x,0.02,fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.8;float d=min(length(p-vec2(-.6,-.22)),length(p-vec2(.6,-.22)));float r=length(p);
   float n=noise(vec3(p*3.,1.))*.6+noise(vec3(p*7.,2.))*.4;float vein=pow(1.-abs(n*2.-1.),12.);
   float m=smoothstep(uP*1.5,uP*1.5-.3,d)*smoothstep(1.4,1.,r);
   float pool=smoothstep(.85,.2,r+(n-.5)*.3)*uQ;float flow=.6+.4*sin(d*14.-uT*9.);
   gl_FragColor=vec4(mix(uC1,uC2,pool*.6)*1.4,(vein*m*flow*1.2+pool*.35+band(r,.95,.03)*uQ)*uA);}`,{uQ:{value:0}}));
  veins.position.z=AP.z;
  const ring=groundPlane(3,AP.x,0.03,fx(RING_FS)); ring.position.z=AP.z;
  L.decal.add(veins,ring);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TJ=${f(TJ)};const vec3 AP=${v3(AP)};
  vec3 hp(float k,float i){vec3 s=i<.5?${v3(HS[0])}:${v3(HS[1])};vec3 e=i<.5?${v3(HE[0])}:${v3(HE[1])};return mix(s,e,k)+vec3(0.,5.2*k*(1.-k),0.);}`;
  // conjuro: motas esmeralda que convergen sobre la cabeza
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*(TL-.05);float life=.25+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=${v3(HN)}+vec3(0.,.22,0.)+d*mix(.9,.05,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.035*aSeed.z);}`);
  // gotas de veneno que caen de los cuernos en vuelo
  a.count+=points(L.part,70,C+`void main(){float s=TL+aSeed.x*(TI-TL);float k=pow(clamp((s-TL)/(TI-TL),0.,1.),1.3);float t=uT-s;float c=max(t,0.);
   vec3 p=hp(k,step(.5,aSeed.z))+vec3((aSeed.w-.5)*.1,-.15-3.5*c*c,(aSeed.y-.5)*.1);p.y=max(p.y,.02);
   vA=(t>0.&&t<.5)?(1.-t*2.):0.;put(p,.05+.04*aSeed.w);}`,BUBBLE_FS);
  a.count+=sparks(L.part,35,TI,`${f(HE[0].x)},.05,${f(HE[0].z)}`,"0.,1.,0.",1.5,4.5,2.5);
  a.count+=sparks(L.part,35,TI,`${f(HE[1].x)},.05,${f(HE[1].z)}`,"0.,1.,0.",1.5,4.5,2.5);
  // burbujas que suben por el velo
  a.count+=points(L.part,70,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TJ)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.5+.18*r.y;vec3 p=AP+vec3(cos(an)*rad,.1+age*(1.4+.5*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.06+.06*r.z);}`,BUBBLE_FS);
  // calaveras púrpuras que suben y laten con cada pulso del veneno
  a.count+=points(L.part,18,C+`void main(){float s=TJ+.1+aSeed.x*.6;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*(.55+.2*aSeed.w),.6+aSeed.y*.8+t*.6,sin(an)*(.55+.2*aSeed.w));
   float pb=step(1.3,uT)*exp(-max(uT-1.3,0.)*6.)+step(1.62,uT)*exp(-max(uT-1.62,0.)*6.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*(.7+.5*pb)*uE:0.;put(p,(.24+.1*aSeed.w)*(1.+.35*pb));}`,SKULL_FS);
  a.count+=points(L.part,30,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TJ)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AP+vec3(cos(an)*.7,.1+r.y*1.7,sin(an)*.7);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.08+.06*r.z)*sin(age*3.14159));}`,STAR4_FS);

  const hp=V3(0,0,0),hq=V3(0,0,0),mid=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI,gr=ss(0.02,TL,te),out=1-ss(TF,a.dur-0.05,te),inj=ss(TJ,TJ+0.15,te)*out;
    let beat=0; for(const t of BT)if(te>=t)beat=Math.max(beat,Math.exp(-(te-t)*7));
    caster.rotation.z=0.1*ss(0,TL,te)-0.18*ss(TL,TL+0.1,te)+0.08*ss(TL+0.1,TL+0.4,te);
    glowOf(caster,U.uC1.value,0.3*gr*(1-ss(TL,TL+0.3,te)));
    mid.set(0,0,0);
    horns.forEach((g,i)=>{
      if(te<TL){g.position.copy(HS[i]);g.position.y+=0.04*Math.sin(te*14+i*2);g.rotation.z=(i?-0.18:0.18);}
      else{const k=Math.pow(cl((te-TL)/(TI-TL)),1.3),k1=Math.max(k,0.02);arcPt(HS[i],HE[i],1.3,k,g.position);
        arcPt(HS[i],HE[i],1.3,k1,hp);arcPt(HS[i],HE[i],1.3,k1-0.02,hq);hp.sub(hq);
        const bl=ss(TL,TL+0.1,te);
        g.rotation.z=Math.atan2(-hp.x,hp.y)*bl+(i?-0.18:0.18)*(1-bl)+(ia>=0?0.14*Math.exp(-ia*9)*Math.sin(ia*42):0);
        g.position.y-=0.35*(1-out);}
      g.scale.setScalar(Math.max(gr*out,0.001)); g.visible=gr*out>0.001; mid.add(g.position);});
    mid.multiplyScalar(0.5);
    setM(hornMat,inj,0.9*(1+0.6*beat));
    set(ward,ss(TJ,TJ+0.35,te),0.85*out*ss(TJ,TJ+0.1,te)); ward.material.uniforms.uQ.value=beat;
    set(veins,ss(TI,TJ+0.35,te),ss(TI,TI+0.05,te)*out); veins.material.uniforms.uQ.value=inj*(0.6+0.4*beat);
    const p=cl(ia/0.55); set(ring,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    U.uE.value=inj;
    glowOf(allies[0],U.uC1.value,0.15*inj+0.35*beat+(ia>=0?0.4*Math.exp(-ia*6):0));
    if(te<TL){o.g.copy(HN).y+=0.22;o.gs=0.7*gr;o.ga=0.3*gr;o.li=1.5*gr;}
    else if(te<TI){o.g.copy(mid);o.gs=1;o.ga=0.4;o.li=3;}
    else{o.g.copy(AC);o.gs=1.6+1.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.55+0.1*inj+0.25*beat;o.li=5.5*Math.exp(-ia*5)+1.5*inj+3*beat;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

// =====================================================================
// 3 · INCISOR — un colmillo prehistórico de energía se alza entre dos raíles de luz sobre el rival y cae como
//     guillotina; deja un tajo que sangra y un reloj en el suelo que se frena: el rival se mueve a cámara lenta
//     con imágenes residuales y la sangre queda suspendida
// =====================================================================
const incisor={key:"rcIncisor",name:"Incisor",pa:2,dur:2.2,ti:0.78,pal:"Rubí",
  phases:[["Presagio",0],["Alzado",0.22],["Guillotina",0.62],["Tajo",0.78],["Lentitud",0.95],["Fin",1.8]],
build(a){
  const L=a.L,TU=0.22,TG=0.62,TI=0.78,TS=0.95,TF=1.8,FX=3.4,FZ=0.5,Y0=4.3,Y1=1.5,FH=1.45,CH=V3(3.3,1.1,0.42);
  // colmillo: marfil con grietas de sangre, raíz de energía, punta incandescente; uQ = disolución
  const fang=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.05,-0.45,0),V3(0.03,-0.95,0),V3(-0.1,-FH,0)]),36,14,0.28,0.006),fxU(`uniform float uQ;
  void main(){float u=vUv.x;float n=noise(vP*9.)*.7+noise(vP*23.)*.3;if(n<uQ*1.1-.05)discard;
   float lit=${LIT};float fr=${FR};
   vec3 ivory=mix(vec3(.6,.53,.42),vec3(.98,.94,.84),smoothstep(.3,.95,lit));
   float crack=pow(1.-abs(noise(vec3(u*14.,vUv.y*8.,2.))*2.-1.),14.);
   vec3 c=ivory*lit*(1.-crack*.5)+uC2*crack*uA*1.4+uC1*pow(fr,2.)*(.35+uA*.6)+uC1*smoothstep(.75,1.,u)*uA*1.3
    +uC1*smoothstep(.15,0.,u)*1.2+uC1*smoothstep(.12,0.,n-uQ*1.1+.05)*step(.01,uQ)*2.5;
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:1}},SOLID));
  L.mesh.add(fang);
  // raíles de la guillotina y travesaño: líneas de luz que bajan desde arriba (uP)
  const railMat=fx(`void main(){float v=abs(vUv.x-.5)*2.;if(vUv.y<1.-uP)discard;
   float core=exp(-v*9.);float fl=.75+.25*noise(vec3(vUv.y*30.,uT*20.,0.));float head=smoothstep(.04,0.,vUv.y-(1.-uP))*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.6+vec3(1.)*head,(core*fl+head)*uA);}`,{depthTest:false});
  const rails=[-0.62,0.62].map(dx=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.09,4.6),railMat);m.position.set(FX+dx,2.3,FZ-0.02);L.trail.add(m);return m;});
  const bar=new THREE.Mesh(new THREE.PlaneGeometry(1.42,0.1),railMat); bar.position.set(FX,4.6,FZ-0.02); L.trail.add(bar);
  // estela de la caída
  const streak=new THREE.Mesh(new THREE.PlaneGeometry(0.6,1).translate(0,0.5,0),fx(`void main(){float v=abs(vUv.x-.5)*2.;
   float n=noise(vec3(vUv.x*8.,vUv.y*3.-uT*20.,0.));gl_FragColor=vec4(mix(uC2,uC1,1.-vUv.y)*1.5,smoothstep(1.,.1,v)*(1.-vUv.y)*(.4+.6*n)*uA);}`,{depthTest:false}));
  L.trail.add(streak);
  // tajo vertical que queda en el rival
  const cut=new THREE.Mesh(new THREE.PlaneGeometry(0.5,1.5),fx(`void main(){vec2 p=vUv-.5;float th=1.-pow(abs(p.y)*2.,2.);
   float x=p.x+.03*sin(p.y*20.);float core=exp(-abs(x)*90.)*th;float halo=exp(-abs(x)*14.)*th*.35;
   float dr=step(.85,noise(vec3(p.x*30.,p.y*6.+uT*.6,1.)))*exp(-abs(x)*30.);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.6+vec3(1.)*core*.4,(core+halo+dr*.5)*uA);}`,{depthTest:false}));
  L.mesh.add(cut);
  // imágenes residuales del rival: silueta que llega tarde a cada balanceo (cámara lenta)
  const ghosts=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,2.1).translate(0,1.05,0),fx(`void main(){
   vec2 p=(vUv-.5)*vec2(1.2,2.1)+vec2(0.,1.05);vec2 b=abs(p-vec2(0.,.62))-vec2(.38,.62);
   float d=min(length(max(b,0.))+min(max(b.x,b.y),0.),length(p-vec2(0.,1.6))-.28);
   float st=noise(vec3(p.x*2.,p.y*20.-uT*2.,${f(i)}));
   gl_FragColor=vec4(mix(uC2,uC1,st*.5)*1.3,(band(d,0.,.035)+smoothstep(.02,-.02,d)*.18)*(.5+.6*st)*uA);}`,{depthTest:false}));L.trail.add(m);return m;});

  const C=`const float TU=${f(TU)};const float TI=${f(TI)};const float TS=${f(TS)};const vec3 CH=${v3(CH)};
  float slow(float c){return min(c,.1)+max(c-.1,0.)*.22;}`;
  // presagio: motas carmesí que suben del rival hacia el colmillo
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*(TI-.1);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(${f(FX)}+r.x*.6,.1+t*2.6*(.6+aSeed.z),r.z*.4+.2);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.8:0.;put(p,.03+.03*aSeed.w);}`);
  // chispas desprendidas del filo durante la caída
  a.count+=points(L.part,50,C+`void main(){float s=${f(TG)}+aSeed.x*${f(TI-TG)};float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-${f(TG)})/${f(TI-TG)},0.,1.);float y=${f(Y0+0.12)}-${f(Y0+0.12-Y1)}*k*k-aSeed.z*${f(FH)};
   vec3 p=vec3(${f(FX)}+(aSeed.w-.5)*.4+(aSeed.w-.5)*t*2.,y+t*.6,${f(FZ)});
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  a.count+=sparks(L.part,110,TI,`${f(CH.x)},${f(CH.y)},${f(CH.z)}`,"0.,.25,.9",2.5,7,3);
  // sangre: salpicadura que pasa a cámara lenta tras el tajo
  a.count+=points(L.part,70,C+`void main(){float t=uT-TI-aSeed.x*.04;float c=slow(max(t,0.));
   vec3 v=normalize(rnd()+vec3(0.,.4,.8))*(1.5+2.*aSeed.y);vec3 p=CH+v*c+vec3(0.,-3.*c*c,0.);p.y=max(p.y,.02);
   vA=(t>0.&&t<1.15)?1.-smoothstep(.75,1.15,t):0.;put(p,.07+.06*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.3,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.35,0.,.03),uC2*.9,.4+.4*vMix)+vec3(1.,.6,.6)*smoothstep(.15,0.,length(gl_PointCoord-vec2(.38)))*.5,a);}`,NB);
  // gotas que caen despacio de la herida
  a.count+=points(L.part,30,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=CH+vec3((r.x-.5)*.08,-.3*r.y-age*.9,.02);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-age)*uE:0.;put(p,.05+.03*r.z);}`);
  // polvo suspendido: motas que casi no se mueven alrededor del rival
  a.count+=points(L.part,80,C+`void main(){float t=uT-TS;vec3 r=rnd();
   vec3 p=vec3(${f(FX)}+r.x*.95,.15+aSeed.z*2.,r.z*.75)+vec3(sin(t*.7+aSeed.w*9.)*.05,t*.06,0.);
   vA=(t>0.)?smoothstep(0.,.3,t)*(.4+.6*pow(.5+.5*sin(uT*1.6+aSeed.y*20.),4.))*uE:0.;put(p,.025+.03*aSeed.w);}`);
  // suelo: reloj que se frena (agujas y marcas) y charco de sangre, centrados bajo el rival
  const clock=groundPlane(2.7,FX,0.025,fxU(`uniform float uQ;
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float tk=smoothstep(.07,.02,abs(fract((an-uQ)/6.2832*12.)-.5))*band(r,.84,.06);
   float mn=smoothstep(.12,.04,abs(fract((an-uQ)/6.2832*60.)-.5))*band(r,.88,.025)*.5;
   vec2 hd=vec2(cos(uQ*2.),sin(uQ*2.));float hand=smoothstep(.02,0.,abs(p.x*hd.y-p.y*hd.x))*step(0.,dot(p,hd))*step(r,.7);
   float m=(tk+mn+band(r,.96,.012)+hand*.8+band(r,.1,.02))*step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,tk+hand)*1.4,m*uA);}`,{uQ:{value:0}}));
  const pool=groundPlane(1.7,FX,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,2.))*.6+noise(vec3(p*14.,1.))*.4;
   float m=smoothstep(uP,uP-.15,r+(n-.5)*.3);gl_FragColor=vec4(vec3(.2,0.,.02)+uC2*.15,m*.75*uA);}`,NB));
  const shock=groundPlane(3.2,FX,0.03,fx(RING_FS));
  L.decal.add(clock,pool,shock);

  const lean=t=>{const i=t-TI;return i<0?0:-0.24*Math.exp(-i*6)+0.12*Math.sin(i*2.4)*ss(0.08,0.3,i)*(1-ss(0.95,1.35,i));};
  a.pose=function(te,o){
    const ia=te-TI, ap=ss(TU,TU+0.2,te), fall=cl((te-TG)/(TI-TG)), dis=ss(1.2,1.55,te), env=ss(TS-0.1,TS+0.15,te)*(1-ss(TF,a.dur,te));
    const y=te<TG?Y0+0.12*ss(TU,TG,te)+0.015*Math.sin(te*40)*ap:Y0+0.12-(Y0+0.12-Y1)*fall*fall;
    fang.position.set(FX,y,FZ); fang.visible=te>=TU&&dis<0.999;
    fang.material.uniforms.uQ.value=te<TU+0.3?1-ss(TU,TU+0.3,te):dis;
    fang.material.uniforms.uA.value=0.3+0.5*ss(TG,TI,te)+(ia>=0?Math.exp(-ia*4):0);
    const ra=ap*(1-ss(TI+0.1,TI+0.5,te));
    setM(railMat,ss(TU,TU+0.3,te),ra+(ia>=0?0.8*Math.exp(-ia*10):0)); for(const m of rails)m.visible=ra>0.001; bar.visible=ra>0.001;
    streak.visible=te>=TG&&te<TI+0.12; streak.position.set(FX,y,FZ-0.01); streak.scale.set(1,Math.max(Math.min(Y0+0.12-y,2.6),0.01),1);
    streak.material.uniforms.uA.value=(te<TI?ss(TG,TG+0.05,te):1-cl(ia/0.12))*0.9;
    towardCam(cut.position,tmp.set(FX-0.05,1.0,0.3),0.15); billboard(cut,0.05); cut.visible=ia>=0&&te<TF+0.2;
    cut.scale.set(1,Math.max(ss(0,0.06,ia),0.001),1); cut.material.uniforms.uA.value=ia>=0?(0.9*Math.exp(-ia*3)+0.35)*(1-ss(TF-0.2,TF+0.2,te)):0;
    // rival: retroceso del tajo y vaivén lento
    const hit=hitK(ia,10); target.rotation.z=lean(te); target.scale.set(1+0.06*hit,1-0.1*hit,1+0.06*hit); target.position.x=3.4+0.1*hit;
    ghosts.forEach((m,i)=>{towardCam(m.position,tmp.set(3.4,0,0),0.05+i*0.02);billboard(m,lean(te-0.14*(i+1)));m.visible=env>0.001;
      m.material.uniforms.uA.value=env*0.42/(i+1);});
    U.uE.value=env;
    set(clock,ss(TS-0.1,TS+0.3,te),env*0.85); clock.material.uniforms.uQ.value=ia>=0?2.6*(1-Math.exp(-ia*1.6)):0;
    set(pool,0.15+0.85*ss(TI,TF,te),ia>=0?ss(0,0.2,ia)*(1-ss(TF,a.dur,te)):0);
    const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    o.em=0.25*env*(0.6+0.4*Math.sin(te*3)); o.emc.copy(U.uC2.value);
    if(te<TG){o.g.set(FX,Y0-0.6,FZ);o.gs=1.1*ap;o.ga=0.25*ap;o.li=2*ap;}
    else if(te<TI){o.g.set(FX,y-0.8,FZ);o.gs=1.3;o.ga=0.45;o.li=4;}
    else{o.g.copy(CH);o.gs=1.3+2.4*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7+0.06*env;o.li=7.5*Math.exp(-ia*5)+env;}
    o.ia=ia;o.c.copy(CH);o.shake=0;o.dist=0.7;o.flash=1;
  };
}};

// =====================================================================
// 4 · POISON TUBE — un tubo de hueso aparece en la frente, aspira y escupe un dardo de cerbatana púrpura que se clava
//     en el rival; inyecta tres cargas de neurotoxina (venas que se extienden por su cuerpo) con nubes de calaveras
// =====================================================================
const tube={key:"rcPoisonTube",name:"Poison Tube",pa:2,dur:2.2,ti:0.72,pal:"Miasma",
  phases:[["Tubo",0],["Inspiración",0.18],["Soplo",0.5],["Impacto",0.72],["Neurotoxina",0.9],["Fin",1.8]],
build(a){
  const L=a.L,TA=0.18,TL=0.5,TI=0.72,IJ=[0.92,1.17,1.42],TF=1.8;
  const B0=V3(-3.62,2.05,0.1), HP=V3(3.06,1.28,0.16), dir=V3(HP.x-B0.x,HP.y-B0.y,HP.z-B0.z).normalize(), ang=Math.atan2(dir.y,dir.x);
  const M=V3(B0.x+dir.x*0.82,B0.y+dir.y*0.82,B0.z+dir.z*0.82);
  // tubo de hueso: nudillos, poros que brillan y pulsos que corren hacia la boquilla al soplar (uQ)
  const tb=new THREE.Mesh(new THREE.CylinderGeometry(0.062,0.08,0.82,16,6,true).rotateZ(-Math.PI/2),fxU(`uniform float uQ;
  void main(){float v=vUv.y;float knuck=smoothstep(.7,.95,abs(sin(v*3.14159*4.)));
   float n=noise(vP*25.)*.6+noise(vP*60.)*.4;vec3 bone=mix(vec3(.5,.43,.34),vec3(.93,.87,.74),n)*(1.-knuck*.3);
   float flow=pow(.5+.5*sin(v*14.-uT*24.),6.)*uQ;
   float pore=smoothstep(.07,.03,length(vec2(fract(vUv.x*4.)-.5,(fract(v*4.)-.5)*.6)))*step(.2,v)*step(v,.85);
   vec3 c=bone*${LIT}*(gl_FrontFacing?1.:.3)+uC1*(flow*1.6+pore*(.25+uQ*1.4)+smoothstep(.93,1.,v)*uA)+uC2*pow(${FR},2.)*.5;
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:0}},DS));
  tb.position.set(B0.x+dir.x*0.41,B0.y+dir.y*0.41,B0.z+dir.z*0.41); tb.rotation.z=ang; L.mesh.add(tb);
  // dardo: aguja, astil y penacho cruzado (aditivo, púrpura con núcleo blanco)
  const dartMat=fx(`void main(){float fr=${FR};float n=noise(vec3(vUv*8.,uT*6.));
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*n)*1.6+vec3(1.)*uP,(.55+.45*fr)*uA);}`);
  const dart=new THREE.Group();
  dart.add(new THREE.Mesh(new THREE.ConeGeometry(0.024,0.22,8).rotateZ(-Math.PI/2).translate(0.11,0,0),dartMat),
    new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.24,6).rotateZ(-Math.PI/2).translate(-0.12,0,0),dartMat));
  const tuftG=new THREE.PlaneGeometry(0.17,0.1).translate(-0.27,0,0);
  for(const r of [0,Math.PI/2]){const t=new THREE.Mesh(tuftG,dartMat);t.rotation.x=r;dart.add(t);}
  L.mesh.add(dart);
  // estela: hilo tóxico ondulado entre la boquilla y el dardo
  const trailMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float w=abs(vUv.y-.5-.18*sin(u*40.-uT*30.)*u)*2.;float core=exp(-w*9.);float halo=exp(-v*3.)*.25;
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.5,(core+halo)*pow(u,1.5)*uA);}`);
  const trail=new THREE.Group(); for(const r of [0,Math.PI/2]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,0.22).translate(0.5,0,0),trailMat);m.rotation.x=r;trail.add(m);}
  trail.position.copy(M); trail.rotation.z=ang; L.trail.add(trail);
  // venas de neurotoxina sobre el cuerpo del rival (cilindro + cabeza), crecen desde el dardo (uH = punto, en local)
  const VEIN=`uniform vec3 uH;uniform float uQ;
  void main(){float d=length(vP-uH);float n=noise(vP*7.)*.6+noise(vP*17.)*.4;float vein=pow(1.-abs(n*2.-1.),10.);
   float m=smoothstep(uP*1.7,uP*1.7-.25,d+(n-.5)*.3);float fr=pow(${FR},1.5);
   gl_FragColor=vec4(mix(uC2,uC1,vein)*1.6,(vein*m*(.55+.9*uQ)+fr*m*.22)*uA);}`;
  const vBody=new THREE.Mesh(new THREE.CylinderGeometry(0.355,0.435,1.27,28,6,true),fxU(VEIN,{uH:{value:V3(HP.x-3.4,HP.y-0.625,HP.z)},uQ:{value:0}}));
  const vHead=new THREE.Mesh(new THREE.SphereGeometry(0.283,24,16),fxU(VEIN,{uH:{value:V3(HP.x-3.4,HP.y-1.6,HP.z)},uQ:{value:0}}));
  vBody.position.set(3.4,0.625,0); vHead.position.set(3.4,1.6,0); L.mesh.add(vBody,vHead);

  const C=`const float TA=${f(TA)};const float TL=${f(TL)};const float TI=${f(TI)};const vec3 B0=${v3(B0)};const vec3 M=${v3(M)};const vec3 HP=${v3(HP)};`;
  // inspiración: vapor púrpura aspirado hacia la culata del tubo
  a.count+=points(L.part,40,C+`void main(){float s=TA+aSeed.x*(TL-TA-.12);float life=.22+aSeed.y*.08;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(-.6,.3,0.));vec3 p=B0+d*mix(1.,.04,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // soplo: bocanada en la boquilla
  a.count+=points(L.part,20,C+`void main(){float s=TL+aSeed.x*.05;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(1.2,.2,0.));vec3 p=M+d*(.1+.4*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.16+.12*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.24,.1,.32)"),NB);
  a.count+=sparks(L.part,30,TL,`${f(M.x)},${f(M.y)},${f(M.z)}`,"1.2,0.,0.",1.5,4,1.5);
  // motas en espiral alrededor de la trayectoria del dardo
  a.count+=points(L.part,60,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-TL)/(TI-TL);vec3 c=mix(M,HP,k);float an=aSeed.z*6.2832+k*20.;
   vec3 p=c+vec3(0.,cos(an),sin(an))*(.05+.1*t)+vec3(0.,-.2*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.025+.03*aSeed.w);}`);
  a.count+=sparks(L.part,40,TI,`${f(HP.x)},${f(HP.y)},${f(HP.z)}`,"-.6,.4,.6",1.5,4.5,2);
  // tres cargas: calaveras y vapor tóxico por cada inyección
  IJ.forEach(t=>{
    a.count+=points(L.part,10,C+`void main(){float s=${f(t)}+aSeed.x*.08;float life=.75+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.4,1.,.6));vec3 p=HP+d*(.15+.5*aSeed.z)*(1.-exp(-c*4.))+vec3(sin(c*5.+aSeed.w*6.)*.08,c*.55,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.18+.12*aSeed.w)*(.7+.5*age));}`,SKULL_FS);
    a.count+=points(L.part,16,C+`void main(){float s=${f(t)}+aSeed.x*.1;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.3,.8,.5));vec3 p=HP+d*(.2+.45*aSeed.z)*(1.-exp(-c*3.))+vec3(0.,.4*c,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.3+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.3,.12,.4)"),NB);});
  // burbujas que gotean del rival envenenado
  a.count+=points(L.part,45,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-${f(IJ[0])})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.42,.3+r.y*1.3-age*.5,sin(an)*.42);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.05*r.z);}`,BUBBLE_FS);
  // suelo: mancha tóxica bajo el rival y onda del impacto
  const stain=groundPlane(1.9,3.4,0.015,fx(SOFT_FS)), shock=groundPlane(3,3.4,0.03,fx(RING_FS));
  L.decal.add(stain,shock);

  const dp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ap=ss(0,TA,te), gone=ss(TF-0.1,a.dur,te), inh=ss(TA,TL-0.05,te)*(1-ss(TL,TL+0.08,te));
    let pk=0,np=0; for(const t of IJ)if(te>=t){pk=Math.max(pk,Math.exp(-(te-t)*8));np++;}
    const env=ss(IJ[0]-0.05,IJ[0]+0.1,te)*(1-ss(TF,a.dur,te));
    tb.visible=ap*(1-gone)>0.001; tb.scale.set(Math.max(ap*(1-gone),0.001),1+0.12*inh,1+0.12*inh);
    set(tb,ss(TL,TL+0.05,te)*(1-ss(TL+0.1,TL+0.4,te)),inh*0.6); tb.material.uniforms.uQ.value=inh+ss(TL-0.05,TL,te)*(1-ss(TL,TL+0.15,te));
    caster.scale.set(1+0.05*inh,1+0.04*inh,1+0.05*inh); caster.rotation.z=0.1*inh-0.12*ss(TL,TL+0.06,te)*(1-ss(TL+0.1,TL+0.4,te));
    // dardo: vuelo recto con leve arco; clavado, tiembla y late en cada carga
    const k=cl((te-TL)/(TI-TL)), stuck=te>=TI;
    if(!stuck){dp.set(M.x+(HP.x-M.x)*k,M.y+(HP.y-M.y)*k+0.25*Math.sin(Math.PI*k),M.z+(HP.z-M.z)*k);dart.rotation.z=ang+0.25*Math.PI/(HP.x-M.x)*Math.cos(Math.PI*k)*0.9;}
    else{dp.copy(HP).addScaledVector(dir,-0.06);dart.rotation.z=ang+0.16*Math.exp(-ia*8)*Math.sin(ia*45);}
    dart.position.copy(dp); dart.visible=te>=TL&&te<TF+0.2;
    setM(dartMat,0.6*pk,(stuck?1-ss(TF-0.1,TF+0.2,te):1)*(0.85+0.5*pk));
    trail.visible=te>=TL&&ia<0.35; trail.scale.set(Math.max(dp.x-M.x,0.01),1,1); trailMat.uniforms.uA.value=stuck?1-cl(ia/0.35):1;
    // venas
    for(const m of [vBody,vHead]){set(m,np/3*0.9+0.1*ss(TI,IJ[0],te),env*(1-ss(TF,a.dur,te)));m.material.uniforms.uQ.value=pk;m.visible=env>0.001;}
    U.uE.value=env;
    stain.material.uniforms.uA.value=ia>=0?0.9*ss(0,0.3,ia)*(1-ss(TF,a.dur,te)):0;
    const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    const hit=hitK(ia,8); target.position.x=3.4+0.08*hit; target.rotation.z=-0.12*hit*Math.cos(ia*20)-0.03*pk;
    target.scale.set(1,1-0.04*pk,1);
    o.em=0.2*env+0.4*pk; o.emc.copy(U.uC1.value);
    if(te<TL){o.g.copy(M);o.gs=0.5+0.4*inh;o.ga=0.15+0.25*inh;o.li=1+2*inh;}
    else if(!stuck){o.g.copy(dp);o.gs=0.7;o.ga=0.4;o.li=3;}
    else{o.g.copy(HP);o.gs=1+2*Math.min(ia,0.4)+0.5*pk;o.ga=Math.exp(-ia*10)*0.6+0.25*pk;o.li=5*Math.exp(-ia*6)+3*pk;}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.5;o.flash=1;
  };
}};

// =====================================================================
// 5 · SCALY SPEAR — escamas endurecidas se juntan sobre la cabeza en una jabalina; sale disparada con estela púrpura,
//     atraviesa al rival (sale por detrás) y la casilla enemiga queda marcada con un recuadro de escamas
// =====================================================================
const spear={key:"rcScalySpear",name:"Scaly Spear",pa:2,dur:1.9,ti:0.68,pal:"Estelar",
  phases:[["Escamas",0],["Forja",0.12],["Tiro",0.42],["Perforación",0.68],["Estela",0.85],["Fin",1.4]],
build(a){
  const L=a.L,TF0=0.12,TL=0.42,TI=0.68,TE=0.86,SX=-3.15,SY=2.38,PX=3.4,PY=1.25,EX=7.6,slope=(PY-SY)/(PX-SX);
  // trayectoria: recta con leve arco hasta el rival; detrás sigue recta
  const xAt=te=>te<TL?SX-0.28*ss(0.25,TL,te):SX+(EX-SX)*cl((te-TL)/(TE-TL))*1;
  const pathX=(x,o)=>{const k=cl((x-SX)/(PX-SX));return o.set(x,SY+(x-SX)*slope+0.35*Math.sin(Math.PI*k),0);};
  // jabalina: astil de escamas superpuestas que se forma de la punta a la cola (uP), punta de escama dura
  const shaftMat=fxU(SCALEGRID+`uniform float uQ;
  void main(){if(vUv.y<1.-uP)discard;float d=scl(vec2(vUv.x*8.,vUv.y*26.));
   float rim=band(d,.55,.09);float body=smoothstep(.6,.2,d);
   gl_FragColor=vec4(mix(uC1*.5,uC1,body)*${LIT}+uC2*rim*1.2+uC2*pow(${FR},2.)*.9+vec3(1.)*uQ*.35,1.);}`,{uQ:{value:0}},SOLID);
  const headMat=fx(`void main(){float fr=pow(${FR},1.5);float n=noise(vP*30.);
   gl_FragColor=vec4(mix(vec3(.55,.5,.4),uC1,.5)*${LIT}*(.8+.3*n)+uC2*fr*1.4+vec3(1.)*uP*.5,1.);}`,SOLID);
  const sp=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.036,0.042,1.5,10,12).rotateZ(-Math.PI/2),shaftMat);
  const head=new THREE.Mesh(new THREE.ConeGeometry(0.085,0.38,6).rotateZ(-Math.PI/2).translate(0.94,0,0),headMat);
  sp.add(shaft,head);
  const fins=[0,1,2,3].map(i=>{const m=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.16,4).rotateZ(Math.PI/2).translate(-0.6,0,0),headMat);m.rotation.x=i*Math.PI/2+0.4;sp.add(m);return m;});
  L.mesh.add(sp);
  // estela púrpura: tubo a lo largo de la trayectoria, se revela con la cabeza (uP) y se apaga detrás
  const trail=new THREE.Mesh(pathTube((u,o)=>pathX(SX+(EX-SX)*u,o),40,80,8,0.09,0.05),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float tw=pow(.5+.5*sin(u*90.-vUv.y*12.566+uT*30.),3.);float fr=pow(${FR},.8);
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*25.))*1.5,exp(-d*3.)*(.35+.65*tw)*(1.-fr*.5)*uA);}`));
  L.trail.add(trail);
  // anillo de entrada sobre el pecho
  const entry=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS,{depthTest:false})); L.mesh.add(entry);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TE=${f(TE)};varying float vR;
  const float SX=${f(SX)};const float SY=${f(SY)};
  vec3 sp(float t){float x=SX+${f(EX-SX)}*clamp((t-TL)/(TE-TL),0.,1.);float k=clamp((x-SX)/${f(PX-SX)},0.,1.);
   return vec3(x,SY+(x-SX)*(${f(slope)})+.35*sin(3.14159*k),0.);}`;
  // forja: escamas que vuelan desde todas partes hasta su sitio en el astil
  a.count+=points(L.part,90,C+`void main(){float s=.02+aSeed.x*(TL-.14);float k=clamp((uT-s)/.2,0.,1.);
   vec3 e=vec3(SX-.75+aSeed.y*1.6,SY,0.);vec3 st=e+normalize(rnd()+vec3(0.,.3,0.))*1.1;
   vec3 p=mix(st,e,k*k);vR=aSeed.z*6.2832+k*5.;
   vA=(uT>s&&k<1.)?smoothstep(0.,.3,k):0.;put(p,.09+.04*aSeed.w);}`,SCALE_FS);
  // escamas que se desprenden de la estela y caen girando
  a.count+=points(L.part,110,C+`void main(){float s=TL+aSeed.x*(TE-TL);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=sp(s)+r*.06+vec3(-.3*t,-.9*t*t+.25*t,r.z*.6*t);vR=aSeed.w*6.2832+t*(6.+8.*aSeed.z);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.07+.04*aSeed.w);}`,SCALE_FS);
  a.count+=points(L.part,60,C+`void main(){float s=TL+aSeed.x*(TE-TL);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=sp(s)+vec3(0.,cos(an),sin(an))*(.06+.25*t);vR=0.;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  // perforación: chispas que salen por detrás del rival y esquirlas de escama
  a.count+=sparks(L.part,130,TI,`${f(PX+0.2)},${f(PY)},0.`,"1.4,.25,0.",2.5,8,2.5);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(1.3,.4,0.))*(2.+2.5*aSeed.z);vec3 p=vec3(${f(PX+0.25)},${f(PY)},0.)+v*t+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.03);
   vR=aSeed.w*6.2832+t*14.;vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.07+.05*aSeed.w);}`,SCALE_FS);
  // casilla enemiga atravesada: recuadro con incrustación de escamas, centrado bajo el rival
  const tile=groundPlane(1.9,PX,0.02,fx(SCALEGRID+`void main(){vec2 p=(vUv-.5)*2.;vec2 b=abs(p)-vec2(.82);
   float box=length(max(b,0.))+min(max(b.x,b.y),0.);float edge=band(box,0.,.035)+band(box,-.1,.012)*.6;
   float inl=band(scl(vec2(p.x*3.,p.y*3.)),.55,.06)*smoothstep(0.,-.05,box);
   float sw=band(max(abs(p.x),abs(p.y)),uP*1.2,.08);
   gl_FragColor=vec4(mix(uC2,uC1,edge+sw)*1.4,(edge+inl*.35+sw*.8)*uA);}`)), shock=groundPlane(3,PX,0.03,fx(RING_FS));
  L.decal.add(tile,shock);

  const sp0=V3(0,0,0),sp1=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,TL-0.06,te), fly=te>=TL;
    const x=xAt(te); pathX(x,sp0);
    if(!fly){sp0.y=SY+0.04*Math.sin(te*10);sp.rotation.z=0.14*ss(0.25,TL,te);}
    else{pathX(x+0.05,sp1);sp.rotation.z=Math.atan2(sp1.y-sp0.y,0.05);}
    sp.position.copy(sp0); const fade=1-ss(6.4,7.4,x);
    sp.visible=te>0.04&&fade>0.001&&te<TE+0.05; sp.scale.set(fly?1.1:1,Math.max(fade,0.001),Math.max(fade,0.001));
    set(shaft,form,0); shaftMat.uniforms.uQ.value=ss(TL-0.08,TL,te)*(1-ss(TL,TL+0.2,te));
    head.visible=fins[0].visible=fins[1].visible=fins[2].visible=fins[3].visible=form>0.85;
    headMat.uniforms.uP.value=ss(TL-0.1,TL,te);
    caster.rotation.z=0.12*ss(0.2,TL,te)-0.25*ss(TL,TL+0.06,te)*(1-ss(TL+0.1,TL+0.45,te));
    set(trail,cl((x-SX)/(EX-SX)),fly?1-ss(TI+0.15,TI+0.7,te):0); trail.visible=fly&&te<TI+0.7;
    let p=cl(ia/0.3); towardCam(entry.position,tmp.set(PX-0.25,PY,0),0.5); billboard(entry); entry.visible=ia>=0&&p<1; set(entry,p,1-p);
    set(tile,cl(ia/0.4),ia>=0?ss(0,0.05,ia)*(1-ss(0.5,0.75,ia/1.1)):0);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    const hit=hitK(ia,6); target.position.x=3.4+0.22*hit*(1-Math.exp(-ia*25)); target.rotation.z=-0.2*hit*Math.cos(ia*14);
    if(!fly){o.g.set(SX,SY,0);o.gs=0.8*form;o.ga=0.3*form;o.li=2*form;}
    else if(te<TI){o.g.copy(sp0);o.gs=1;o.ga=0.45;o.li=3.5;}
    else{o.g.set(PX,PY,0);o.gs=1.2+2.6*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7;o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(PX,PY,0);o.shake=0;o.dist=0.65;o.flash=1;
  };
}};

// =====================================================================
// 6 · SCALY SPOON — (aliado) un río de escamas forma ante el aliado una cuchara mística; una cúpula de escamas lo
//     protege, la cuchara gira, concentra la luz en su cuenco y la devuelve al rival en un haz violeta
// =====================================================================
const spoon={key:"rcScalySpoon",name:"Scaly Spoon",pa:2,dur:2.3,ti:0.85,pal:"Nabo",allies:1,
  phases:[["Escamas",0],["Cuchara",0.35],["Escudo",0.85],["Giro",1.12],["Haz",1.3],["Fin",1.9]],
build(a){
  const L=a.L,TS=0.35,TI=0.85,TR=1.12,TB=1.3,TH=1.42,TF=1.9,AP=ALLY_POS[0],AC=V3(AP.x,0.95,AP.z);
  const SP=V3(AP.x+0.78,1.35,AP.z+0.3), BD=V3(TC.x-SP.x,TC.y-SP.y,TC.z-SP.z), BL=BD.length(), th=-Math.atan2(BD.z,BD.x);
  // cuchara: cuenco de escamas iridiscentes (abre hacia +x) y mango; uQ = barrido de brillo
  const spMat=fxU(SCALEGRID+`uniform float uQ;
  void main(){float d=scl(vec2(vUv.x*14.,vUv.y*7.));float rim=band(d,.55,.08);float n=noise(vec3(vUv*8.,uT));
   float fr=pow(${FR},1.3);float sheen=smoothstep(.12,0.,abs(vUv.x*.6+vUv.y-uQ*2.+.3));
   vec3 c=mix(uC2,uC1,.3+.7*n)*(gl_FrontFacing?1.:1.3);
   gl_FragColor=vec4(c*1.4+vec3(1.)*sheen*.8,(rim*.7+.16+fr*.5+sheen)*uA);}`,{uQ:{value:0}});
  const spG=new THREE.Group(), spIn=new THREE.Group(); spG.add(spIn);
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(0.4,32,16,0,Math.PI*2,0,1.0).rotateZ(Math.PI/2),spMat); bowl.scale.set(1,1.4,1);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.055,0.95,10,4),spMat); handle.position.set(-0.3,-0.95,0);
  spIn.add(bowl,handle); spG.position.copy(SP); spG.rotation.y=th; L.mesh.add(spG);
  // cúpula de escamas alrededor del aliado
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.85,40,24),fx(SCALEGRID+`void main(){float an=atan(vP.z,vP.x);float h=vP.y/1.7+.5;
   float sc=band(scl(vec2(an*4.46,h*9.)),.55,.08);float fr=pow(${FR},1.6);float n=noise(vec3(an*3.,h*6.,uT));
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*n)*1.35,((sc*.4*(.6+.4*n)+fr*.45)*step(h,uP)+band(h,uP,.035)*step(uP,.99))*uA);}`));
  dome.position.copy(AC); dome.scale.set(1,1.25,1); L.mesh.add(dome);
  // destello del cuenco y haz reflejado (dos planos cruzados a lo largo de la dirección)
  const flare=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uP;
   float rays=pow(abs(cos(an*3.)),30.)*smoothstep(1.,.1,r);gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.6,(rays+smoothstep(.3,0.,r))*uA);}`,{depthTest:false}));
  L.mesh.add(flare);
  const beamMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP)discard;
   float core=exp(-v*12.);float halo=exp(-v*3.)*.35;float rings=pow(.5+.5*sin(u*60.-uT*50.),8.)*exp(-v*4.);
   float head=smoothstep(.06,0.,uP-u)*step(uP,.995);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.6+vec3(1.)*(core*.4+head),(core+halo+rings*.6+head)*uA);}`);
  const beam=new THREE.Group(); for(const r of [0,Math.PI/2]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,0.26).translate(0.5,0,0),beamMat);m.rotation.x=r;beam.add(m);}
  beam.position.copy(SP); beam.rotation.y=th; beam.rotation.z=Math.atan2(BD.y,Math.hypot(BD.x,BD.z)); beam.scale.set(BL,1,1); L.trail.add(beam);

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TB=${f(TB)};const float TH=${f(TH)};const vec3 SP=${v3(SP)};const vec3 AP=${v3(AP)};varying float vR;`;
  // río de escamas desde la cabeza hasta la cuchara (flujo continuo en arco)
  a.count+=points(L.part,120,C+`void main(){float s=.03+aSeed.x*(TI-.3);float k=clamp((uT-s)/.4,0.,1.);
   vec3 a0=${v3(HN)}+vec3(0.,.15,0.);vec3 b=mix(a0,SP,.5)+vec3(0.,1.3,.3);vec3 e=SP+(rnd())*vec3(.08,.35,.2);
   vec3 p=mix(mix(a0,b,k),mix(b,e,k),k)+vec3(0.,0.,sin(k*9.+aSeed.y*6.)*.08);vR=aSeed.z*6.2832+k*8.;
   vA=(uT>s&&k<1.)?smoothstep(0.,.15,k)*(1.-smoothstep(.85,1.,k)):0.;put(p,.08+.04*aSeed.w);}`,SCALE_FS);
  a.count+=sparks(L.part,60,TI,`${f(AP.x)},.9,${f(AP.z)}`,"0.,.8,0.",1.6,4.5,1.8);
  // el haz arrastra destellos que salen hacia el rival
  a.count+=points(L.part,80,C+`void main(){float s=TB+aSeed.x*(TH-TB+.15);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp(aSeed.z*(s-TB)/(TH-TB)*1.1,0.,1.);vec3 p=mix(SP,${v3(TC)},k)+rnd()*(.06+.2*t);vR=0.;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.04*aSeed.w);}`);
  a.count+=sparks(L.part,40,TH,`${f(TC.x)},${f(TC.y)},.2`,"1.,.3,.3",1.5,4,1.5);
  // destellos que recorren la cúpula
  a.count+=points(L.part,40,C+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vR=0.;
   float an=r.x*6.2832;float hh=r.y*1.4-.6;vec3 p=AP+vec3(cos(an)*.86*sqrt(max(1.-hh*hh*.5,0.)),.95+hh*1.05,sin(an)*.86*sqrt(max(1.-hh*hh*.5,0.)));
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.08*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // suelo: sello violeta bajo el aliado y onda del escudo
  const sig=groundPlane(2.4,AP.x,0.02,fx(SCALEGRID+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*.3;
   float sc=band(scl(vec2(an*3.5,r*5.)),.55,.07)*step(.3,r)*step(r,.85);
   float m=(sc*.45+band(r,.93,.015)+band(r,.3,.012))*step(r,uP*1.05);gl_FragColor=vec4(mix(uC2,uC1,.5)*1.3,m*uA);}`));
  sig.position.z=AP.z; const ring=groundPlane(3,AP.x,0.03,fx(RING_FS)); ring.position.z=AP.z;
  L.decal.add(sig,ring);

  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH, form=ss(TS,TI,te), out=1-ss(TF,a.dur-0.05,te), env=ss(TI,TI+0.2,te)*out;
    caster.rotation.z=0.1*ss(0,0.15,te)-0.14*ss(0.15,0.3,te)+0.04*ss(0.3,0.6,te);
    glowOf(caster,U.uC1.value,0.25*ss(0,0.15,te)*(1-ss(0.3,0.7,te)));
    // cuchara: aparece, se mece, gira una vuelta y apunta al rival
    spG.visible=form*out>0.001; spG.scale.setScalar(Math.max((0.4+0.6*form)*out,0.001));
    spG.position.set(SP.x,SP.y+0.05*Math.sin(te*3),SP.z);
    spIn.rotation.y=Math.PI*2*ss(TR,TB,te); spIn.rotation.z=0.12*Math.sin(te*2.2)*(1-ss(TR,TB,te));
    setM(spMat,0,form*(0.75+0.5*ss(TR,TB,te)*(1-ss(TH,TH+0.3,te)))); spMat.uniforms.uQ.value=ss(TS,TI,te)+ss(TR,TB,te);
    set(dome,ss(TI-0.05,TI+0.3,te),env*0.85);
    // destello del cuenco y haz
    const fl=ss(TR+0.08,TB,te)*(1-ss(TB+0.15,TB+0.4,te));
    towardCam(flare.position,SP,0.3); billboard(flare); flare.visible=fl>0.001; set(flare,te*2,fl*0.9);
    beam.visible=te>=TB&&te<TF; setM(beamMat,cl((te-TB)/(TH-TB)),(1-ss(TH+0.15,TH+0.55,te))*0.95);
    U.uE.value=env;
    set(sig,ss(TS,TI,te),ss(TS,TS+0.2,te)*out*0.85);
    const p=cl(ia/0.55); set(ring,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    glowOf(allies[0],U.uC1.value,0.2*env+(ia>=0?0.55*Math.exp(-ia*7):0));
    const hh=hitK(ih,9); target.position.x=3.4+0.1*hh; target.rotation.z=-0.12*hh*Math.cos(ih*18);
    if(te<TS){o.g.copy(HN).y+=0.2;o.gs=0.6;o.ga=0.2*ss(0,0.1,te);o.li=1.2;}
    else if(te<TB){o.g.copy(te<TI?SP:AC);o.gs=1.2+0.6*fl;o.ga=0.2+0.3*fl+(ia>=0?0.4*Math.exp(-ia*8):0);o.li=2+3*fl+(ia>=0?4*Math.exp(-ia*5):0);}
    else{o.g.lerpVectors(SP,TC,cl((te-TB)/(TH-TB)));o.gs=1.3;o.ga=0.4*(1-ss(TH,TH+0.4,te))+(ih>=0?0.4*Math.exp(-ih*10):0);o.li=3+(ih>=0?4*Math.exp(-ih*6):0);}
    if(te<TH){o.ia=ia;o.c.copy(AC);o.dist=0.35;o.flash=0;}else{o.ia=ih;o.c.copy(TC);o.dist=0.4;o.flash=0.6;}
    o.shake=0;
  };
}};

// =====================================================================
// 7 · UNKO — una pila de heces tóxicas cae del cielo (su sombra crece) y revienta sobre el rival con salpicadura
//     fétida; se derrite en una casilla de baba en el suelo, sube el hedor con moscas y los corazones que intentan
//     curarlo se marchitan y se rompen (curación impedida)
// =====================================================================
const unko={key:"rcUnko",name:"Unko",pa:2,dur:2.2,ti:0.72,pal:"Musgo",
  phases:[["Sombra",0],["Caída",0.3],["Plaf",0.72],["Baba",0.9],["Hedor",1.15],["Fin",1.85]],
build(a){
  const L=a.L,TD=0.3,TI=0.72,TM=0.9,TH=1.15,TF=1.85,UX=3.4,UZ=0.08,YT=1.86,Y0=5.2;
  // pila: tres roscas y punta, marrón brillante con vetas tóxicas; uQ = derretido (se hunde y se disuelve)
  const poopMat=fxU(`uniform float uQ;
  void main(){float n=noise(vP*12.)*.6+noise(vP*30.)*.4;if(noise(vP*9.+4.)<uQ*1.1-.08)discard;
   vec3 c=mix(vec3(.16,.09,.04),vec3(.42,.26,.12),n)*${LIT};
   float spec=pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),18.);
   float tox=smoothstep(.7,.85,noise(vP*8.+vec3(0.,-uT*2.,0.)));
   gl_FragColor=vec4(c+vec3(.9,.85,.7)*spec*.35+uC1*tox*.45+uC1*uQ*.3,1.);}`,{uQ:{value:0}},SOLID);
  const poop=new THREE.Group();
  [[0.26,0.12,0.1],[0.19,0.1,0.3],[0.12,0.08,0.46]].forEach(([R,r,y])=>{const t=new THREE.Mesh(new THREE.TorusGeometry(R,r,10,24).rotateX(Math.PI/2),poopMat);t.position.y=y;poop.add(t);});
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.22,12),poopMat); tip.position.y=0.62; poop.add(tip);
  L.mesh.add(poop);
  // gotas de baba que resbalan por el cuerpo del rival
  const C=`const float TD=${f(TD)};const float TI=${f(TI)};const float TM=${f(TM)};const float TH=${f(TH)};const vec3 HT=vec3(${f(UX)},${f(YT)},${f(UZ)});varying float vR;`;
  // caída: motas tóxicas que deja la pila
  a.count+=points(L.part,24,C+`void main(){float s=TD+aSeed.x*(TI-TD);float k=clamp((s-TD)/(TI-TD),0.,1.);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(UX)},${f(Y0)}-${f(Y0-YT)}*k*k+.3,${f(UZ)})+rnd()*.18+vec3(0.,.6*t,0.);vR=0.;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.03*aSeed.w);}`);
  // plaf: salpicadura marrón (mezcla normal) que vuela y cae, y estallido verde tóxico
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.04;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.5,0.))*(1.4+1.8*aSeed.y);vec3 p=HT+vec3(0.,.15,0.)+v*c+vec3(0.,-5.5*c*c,0.);p.y=max(p.y,.02);vR=0.;
   vA=(t>0.&&t<1.1)?1.-smoothstep(.7,1.1,t):0.;put(p,.08+.08*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q)+(noise(vec3(q*8.,vMix*9.))-.5)*.15;float a=smoothstep(.45,.3,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.2,.11,.05),vec3(.45,.3,.14),vMix)+uC1*.12+vec3(.6)*smoothstep(.12,0.,length(q-vec2(-.1,-.1)))*.6,a);}`,NB);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=HT+d*(.2+.8*aSeed.z)*(1.-exp(-t*5.));vR=0.;
   vA=(age>0.&&age<1.)?(1.-age)*(1.-age):0.;put(p,(.14+.16*aSeed.w)*(.6+age));}`);
  // regueros de baba que bajan por el cuerpo del rival
  a.count+=points(L.part,40,C+`void main(){float s=TI+.05+aSeed.x*.5;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=1.2+aSeed.z*3.8;float rd=.42+.02*aSeed.w;vec3 p=vec3(${f(UX)}+cos(an)*rd,${f(YT)}-.2-t*(1.6+.5*aSeed.y),sin(an)*rd);p.y=max(p.y,.03);vR=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,.07+.04*aSeed.w);}`,BUBBLE_FS);
  // hedor: líneas onduladas que suben, nubecillas verdes y moscas
  a.count+=points(L.part,30,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TM)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(UX)}+(r.x-.5)*1.,.6+r.y*.9+age*1.,${f(UZ)}+(r.z-.5)*.6);vR=r.z*6.2832+uT*5.;
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.4+.15*r.z);}`,HEAD+`varying float vA;varying float vMix;varying float vR;
  void main(){vec2 q=gl_PointCoord-.5;float x=q.x-.13*sin(q.y*13.+vR);float l=smoothstep(.05,.015,abs(x))*smoothstep(.5,.25,abs(q.y));
   float a=l*vA*.8;if(a<.003)discard;gl_FragColor=vec4(mix(uC1,vec3(.85,1.,.5),.3)*1.3,a);}`);
  a.count+=points(L.part,36,C+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TM)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(UX)}+(r.x-.5)*1.2,.2+age*1.5,${f(UZ)}+(r.z-.5)*.8);vR=0.;
   vA=(k>=1.)?sin(age*3.14159)*.45*uE:0.;put(p,(.3+.2*r.y)*(.7+age));}`,SMOKE_FS("vec3(.32,.38,.12)"),NB);
  a.count+=points(L.part,14,C+`void main(){float t=uT-TM;float sp=4.+3.*aSeed.y;
   vec3 p=vec3(${f(UX)}+sin(t*sp+aSeed.x*30.)*(.5+.2*sin(t*13.+aSeed.z*9.)),1.2+.6*aSeed.z+.25*sin(t*sp*1.7+aSeed.w*20.),${f(UZ)}+cos(t*sp*.9+aSeed.y*30.)*.5);vR=0.;
   vA=(t>0.)?smoothstep(0.,.2,t)*uE:0.;put(p,.06);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float b=smoothstep(.16,.1,length(q*vec2(1.,1.4)));
   float w=smoothstep(.2,.12,length((vec2(abs(q.x),q.y)-vec2(.16,-.12))*vec2(1.,1.6)));float a=max(b,w*.35)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.04,.04,.03),vec3(.7,.75,.8),(1.-b)*.6),a);}`,NB);
  // curación impedida: corazones que suben, se marchitan (gris verdoso) y se agrietan
  a.count+=points(L.part,10,C+`void main(){float s=TH+aSeed.x*.5;float life=.7+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(UX)}+(aSeed.z-.5)*.9,.6+aSeed.w*.7+t*.5-max(age-.6,0.)*1.2,${f(UZ)}+.35);vR=smoothstep(.2,.55,age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.75,1.,age)):0.;put(p,.26+.06*aSeed.y);}`,HEAD+SD_HEART+`varying float vA;varying float vMix;varying float vR;
  void main(){vec2 p=(vec2(gl_PointCoord.x,1.-gl_PointCoord.y)-vec2(.5,.12))*1.45;float d=sdHeart(p);
   float cr=smoothstep(.05,0.,abs(p.x-.1*sin(p.y*10.)))*step(.5,vR);
   float a=smoothstep(.04,-.02,d)*(1.-cr)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(1.,.35,.5),vec3(.38,.42,.28),vR)*(1.1-.35*smoothstep(0.,-.3,d)),a);}`,NB);
  // suelo: sombra que crece mientras cae y casilla de baba (cuadrada, burbujeante) centrada bajo el rival
  const shadow=groundPlane(1.4,UX,0.012,fx(`void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.2,d)*.6*uA);}`,NB));
  const SL=`vec2 p=(vUv-.5)*2.;vec2 b=abs(p)-vec2(.62);float box=length(max(b,0.))+min(max(b.x,b.y),0.)-.2;
   float n=noise(vec3(p*4.,uT*.4))*.6+noise(vec3(p*11.,2.))*.4;float e=box+(n-.5)*.18+(1.-uP)*.9;
   vec2 g=p*5.;vec2 id=floor(g);vec2 fp=fract(g)-.5;float h=hash(vec3(id,3.));
   float bub=band(length(fp),.18+.1*h,.05)*step(.8,h)*(.5+.5*sin(uT*4.+h*30.));`;
  const slime=groundPlane(2.2,UX,0.016,fx(`void main(){${SL}
   gl_FragColor=vec4(mix(vec3(.16,.2,.05),vec3(.33,.36,.1),n),smoothstep(.04,-.04,e)*.82*uA);}`,NB));
  const slimeG=groundPlane(2.2,UX,0.02,fx(`void main(){${SL}
   gl_FragColor=vec4(uC1*1.2,(band(e,0.,.05)*.8+bub*smoothstep(0.,-.1,e)+smoothstep(.3,.6,n)*smoothstep(0.,-.1,e)*.12)*uA);}`));
  const shock=groundPlane(2.8,UX,0.03,fx(RING_FS));
  for(const m of [shadow,slime,slimeG])m.position.z=UZ;
  L.decal.add(shadow,slime,slimeG,shock);

  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TD)/(TI-TD)), melt=ss(TM,TM+0.4,te), env=ss(TM,TH,te)*(1-ss(TF,a.dur,te));
    caster.rotation.z=0.08*ss(0,0.15,te)-0.12*ss(0.15,0.28,te)+0.04*ss(0.28,0.5,te);
    // pila: cae en aceleración, se aplasta sobre la cabeza y se derrite
    const sq=ia>=0?Math.exp(-ia*9):0;
    poop.visible=te>=TD&&melt<0.999;
    poop.position.set(UX,ia>=0?YT-0.35*melt:Y0-(Y0-YT)*k*k,UZ);
    poop.rotation.y=te*2*(ia<0?1:0); poop.rotation.z=ia<0?0.3*(1-k):0;
    poop.scale.set((1+0.45*sq)*(1+0.3*melt),Math.max((1-0.5*sq)*(1-0.85*melt),0.001),(1+0.45*sq)*(1+0.3*melt));
    poopMat.uniforms.uQ.value=melt;
    shadow.scale.setScalar(0.3+0.9*k); shadow.material.uniforms.uA.value=te>=TD&&ia<0?ss(TD,TI,te):(ia>=0?1-cl(ia/0.2):0);
    const sp=ss(TI,TM+0.4,te), sa=ia>=0?ss(0,0.15,ia)*(1-ss(TF,a.dur,te)):0;
    set(slime,sp,sa); set(slimeG,sp,sa*0.9);
    const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    U.uE.value=env;
    // rival: aplastado por el golpe, luego encogido y mareado por el hedor
    const hit=hitK(ia,7); target.scale.set(1+0.12*hit,1-0.2*hit-0.03*env,1+0.12*hit);
    target.rotation.z=0.04*env*Math.sin(te*5)-0.08*hit*Math.cos(ia*20);
    o.em=0.3*env*(0.7+0.3*Math.sin(te*4)); o.emc.copy(U.uC2.value);
    if(te<TI){o.g.set(UX,te<TD?Y0:Y0-(Y0-YT)*k*k,UZ);o.gs=0.6*ss(0,TD,te)+0.3*k;o.ga=0.12+0.12*k;o.li=1+1.5*k;}
    else{o.g.set(UX,1.3,UZ);o.gs=1.2+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.5+0.06*env;o.li=5*Math.exp(-ia*5)+0.8*env;}
    o.ia=ia;o.c.set(UX,1.5,0);o.shake=0;o.dist=0.5;o.flash=0.8;
  };
}};

VFX.module("Reptil · Cuernos",[bumpy,cerastes,incisor,tube,spear,spoon,unko]);
})();

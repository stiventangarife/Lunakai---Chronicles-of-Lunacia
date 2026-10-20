// =====================================================================
// SAPIDAE · LUNALOGISTA — botánica lunar: rocío, savia fluorescente, loto y luz de luna
// Contrato del motor: {key,name,tier,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// El lanzador es el Sapidae (domador): la mano ≈ (-3.35,1.15,0.25).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,
  caster,target,allies,ALLY_POS,enemies}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube,variantGroups,tileFractureFS}=VFX.lib;

const PAL="Rocío Lunar";
VFX.palette(PAL,["#b8ffd8","#5BB6C9"]);          // clorofila esmeralda + rocío lunar

const HAND=V3(-3.35,1.15,0.25);                   // mano del Sapidae
const CHEST=V3(-3.62,1.15,0);                     // pecho del lanzador
const AP=ALLY_POS[0], AC=AP.clone().add(V3(0,1.1,0));
const tmp=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const LIT="max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))))";
const RED="vec3(1.,.16,.2)";                      // vitalidad robada (color semántico)

// ---------- geometrías propias ----------
// pétalo/hoja: eje +y = largo, x = ancho; los bordes se curvan hacia -z (dentro) y la punta se abre hacia +z
function petalGeo(len,W,cup,curl){
  const NU=8,NV=16,pos=[],uv=[],idx=[];
  for(let j=0;j<=NV;j++){const v=j/NV,w=W*(0.16*(1-v)+0.84*Math.sin(Math.PI*Math.pow(v,0.75)));
    for(let i=0;i<=NU;i++){const u=-1+2*i/NU;
      pos.push(u*w*0.5,v*len,-cup*u*u*w*0.5+curl*v*v*len*0.18); uv.push(i/NU,v);
      if(i<NU&&j<NV){const k=j*(NU+1)+i;idx.push(k,k+NU+1,k+1,k+1,k+NU+1,k+NU+2);}}}
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3)); g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// corona de n pétalos alrededor de un eje vertical; devuelve los pivotes (rotation.x = inclinación: + abre, − cierra)
function lotusRing(parent,n,geo,mat,r0,ph){
  const arr=[];
  for(let i=0;i<n;i++){const o=new THREE.Group(),p=new THREE.Group();o.rotation.y=ph+i/n*Math.PI*2;p.position.set(0,0,r0);
    p.add(new THREE.Mesh(geo,mat));o.add(p);parent.add(o);arr.push(p);}
  return arr;
}
// zarcillo en hélice que trepa alrededor de un cuerpo
const helixCurve=(r,h,turns,ph,dir)=>{const pts=[];
  for(let i=0;i<=40;i++){const t=i/40,an=ph+dir*t*turns*Math.PI*2,q=r*(1-0.12*t)+0.04*Math.sin(t*17+ph);pts.push(V3(Math.cos(an)*q,0.02+t*h,Math.sin(an)*q));}
  return new THREE.CatmullRomCurve3(pts);};

// ---------- sprites de partícula ----------
// gota de rocío: cuerpo redondo con punta arriba, borde refractivo y brillo
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;
 float d=length(vec2(q.x,q.y+.08));float body=smoothstep(.27,.23,d);
 float tw=.2*(1.-smoothstep(-.12,.44,q.y));float tip=smoothstep(tw,tw-.05,abs(q.x))*step(-.1,q.y)*step(q.y,.44);
 float m=max(body,tip);float rim=m*smoothstep(.1,.25,d);float hl=smoothstep(.08,0.,length(q-vec2(-.07,-.12)));
 float a=(m*.22+rim*.55+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,uC2,vMix*.5)*1.3+vec3(hl*.8),a);}`;
// flor etérea de cinco pétalos
const FLOWER_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=(gl_PointCoord-.5)*2.;float r=length(q);float an=atan(q.y,q.x)+vMix*6.2832;
 float pet=.5+.45*pow(abs(cos(an*2.5)),.7);float m=smoothstep(pet,pet-.18,r);float core=smoothstep(.28,.08,r);
 float a=(m*.55+core*.7)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.4+core*.6)*1.4+vec3(core*.5),a);}`;
// hoja (mezcla normal): óvalo apuntado con nervio central
const LEAF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float an=vMix*6.2832;q=mat2(cos(an),-sin(an),sin(an),cos(an))*q;
 float w=.2*(1.-pow(abs(q.y)*2.1,2.));float m=smoothstep(w,w-.05,abs(q.x))*step(abs(q.y),.47);
 float vein=smoothstep(.025,0.,abs(q.x))*m;
 float a=(m*.85+vein*.15)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2*.45,uC1*.8,.35+q.y)+uC1*vein*.6,a);}`;
// terrón (mezcla normal)
const DIRT_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.4;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.1,.09,.07),vec3(.24,.21,.16),vMix),a);}`;
// brillo puntual de color fijo (luciérnagas, vitalidad, ácido)
const GLOW_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=(smoothstep(.5,0.,d)*.55+smoothstep(.12,0.,d))*vA;if(a<.003)discard;
 gl_FragColor=vec4(${col}*1.5+vec3(1.)*smoothstep(.12,0.,d)*.6,a);}`;
// bocanada volumétrica aditiva: bola grande y ruidosa, se acumula en capas
const PUFF_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*4.5,vMix*23.+uT*.5));
 float a=smoothstep(.5,.05,d+(n-.5)*.22)*(.45+.55*n)*vA;if(a<.003)discard;
 gl_FragColor=vec4(${col}*(.8+.5*n),a);}`;

// ---------- shaders de malla compartidos ----------
// hoja de loto (mezcla normal): base profunda, punta clara, nervios que se encienden con uP; uQ la deshace con borde de luz
const PETAL_FS=`uniform float uQ;
void main(){float u=vUv.x*2.-1.,v=vUv.y;
 float n=noise(vec3(u*3.,v*8.,4.))*.6+noise(vec3(u*9.,v*20.,1.))*.4;
 float dis=n*.8+v*.25+.15-uQ*1.25;if(dis<0.)discard;
 float vein=pow(1.-abs(sin(u*(7.-v*3.))),16.)*.6;
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
 float burn=smoothstep(.12,0.,dis)*step(.001,uQ);
 vec3 c=mix(uC2*.42,uC1*.85,smoothstep(0.,1.,v)*.75+n*.15)+uC1*vein*(.25+.9*uP)+vec3(1.)*fr*.18;
 gl_FragColor=vec4(c+uC1*burn*1.5,min((.62+.3*fr+vein*.2)*uA+burn,1.));}`;
// pétalo de loto lunar (aditivo, etéreo)
const LOTUS_FS=`void main(){float u=vUv.x*2.-1.,v=vUv.y;
 float n=noise(vec3(u*3.,v*7.-uT*.3,2.));
 float vein=pow(1.-abs(sin(u*(8.-v*4.))),14.);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
 float rim=smoothstep(.75,1.,abs(u))+smoothstep(.85,1.,v);
 vec3 c=mix(uC2,mix(uC1,vec3(1.),.35),pow(v,.8))*(.55+.5*n)+uC1*vein*.6+vec3(1.)*rim*.25;
 gl_FragColor=vec4(c*1.2,(.26+.35*fr+vein*.25+rim*.3)*uA*smoothstep(0.,.08,v));}`;

// =====================================================================
// 1 · ZARZA — semilla en parábola que revienta en raíces espinosas gigantes alrededor de los pies del rival;
//     la savia fluorescente sube por sus vetas. Nivel 2: sin fractura, solo onda y musgo luminoso.
// =====================================================================
const bramble={key:"lunalogist_bramble",name:"Zarza",tier:2,dur:2.2,ti:0.68,pal:PAL,
  phases:[["Siembra",0],["Vuelo",0.2],["Estallido",0.68],["Atadura",0.92],["Marchitez",1.72]],
build(a){
  const L=a.L,TL=0.2,TI=0.68,TW=1.72,TE=2.15,P0=HAND,P1=V3(3.2,0.1,0.3),ARC=2.2,TX=3.4;
  const lob=(te,out)=>{const k=cl((te-TL)/(TI-TL));return out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+4*k*(1-k)*ARC,P0.z+(P1.z-P0.z)*k);};
  // semilla: cáscara opaca con costillas de savia que laten
  const seed=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),fx(`void main(){vec3 q=normalize(vP);float n=noise(vP*6.);
   float rib=pow(abs(sin(atan(q.z,q.x)*3.+n*1.2)),20.);
   vec3 husk=mix(vec3(.06,.1,.07),vec3(.2,.28,.18),n);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(husk*(.4+.6*${LIT})+uC1*rib*(.8+1.6*uA)+uC2*fr*.5,1.);}`,SOLID));
  L.mesh.add(seed);
  // raíces: corteza opaca; vetas en espiral por las que sube la savia; uP = crecimiento, uQ = marchitez
  const ROOT_FS=`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*38.,vUv.y*6.,1.))*.6+noise(vec3(u*95.,vUv.y*12.,3.))*.4;
   if(n<uQ*1.15-(1.-u)*.15)discard;
   vec3 bark=mix(vec3(.04,.07,.06),vec3(.15,.22,.16),n);
   float vein=pow(1.-abs(sin(vUv.y*12.566+u*9.+n*2.)),14.);
   float flow=pow(.5+.5*sin(u*26.-uT*10.),5.);
   float head=smoothstep(.07,0.,uP-u)*step(uP,.995);
   gl_FragColor=vec4(bark*(.35+.65*${LIT})+uC1*vein*(.25+1.6*flow)*uA+uC2*vein*.25+uC1*head*1.4,1.);}`;
  const rg=new THREE.Group(); rg.position.set(TX,0,0); L.mesh.add(rg);
  const thornGeo=new THREE.ConeGeometry(0.045,0.26,6);
  const thornMat=fx(`void main(){float l=vP.y/.26+.5;gl_FragColor=vec4(mix(vec3(.05,.08,.06),uC1*1.6,pow(l,3.)*uA),1.);}`,SOLID);
  const roots=[],thorns=[],up=V3(0,1,0),tan=V3(0,0,0);
  for(let i=0;i<6;i++){
    const ph=i/6*Math.PI*2+0.4*Math.sin(i*2.3), dir=i%2?1:-1, hi=0.75+0.18*(i%3), pts=[];
    for(let j=0;j<=14;j++){const t=j/14, an=ph+dir*t*Math.PI*1.6, r=0.5+0.85*Math.pow(1-Math.min(t/0.5,1),1.4);
      pts.push(V3(Math.cos(an)*r,-0.08+hi*Math.pow(t,1.15)+0.35*Math.sin(Math.PI*Math.min(t/0.45,1)),Math.sin(an)*r));}
    const curve=new THREE.CatmullRomCurve3(pts);
    const m=new THREE.Mesh(taperTube(curve,90,8,0.12+0.03*(i%2),0.022),fxU(ROOT_FS,{uQ:{value:0}},SOLID));
    m.userData.d=0.035*i; rg.add(m); roots.push(m);
    // espinas repartidas por la raíz: brotan al paso del crecimiento
    for(let k=0;k<5;k++){const u=0.18+0.16*k+0.03*Math.random(), th=new THREE.Mesh(thornGeo,thornMat);
      curve.getPointAt(u,th.position); curve.getTangentAt(u,tan);
      const side=V3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).cross(tan).normalize();
      th.quaternion.setFromUnitVectors(up,side.clone().addScaledVector(tan,0.4).normalize());
      th.position.addScaledVector(side,0.08*(1-u*0.6)); th.userData={u,d:m.userData.d}; rg.add(th); thorns.push(th);}
  }
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),fx(BURST_FS)); burst.position.set(P1.x,0,P1.z); L.mesh.add(burst);
  // partículas
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 TX=vec3(${f(TX)},0.,0.);
  vec3 lob(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,P1,k)+vec3(0.,4.*k*(1.-k)*${f(ARC)},0.);}`;
  // rocío que se condensa en la mano
  a.count+=points(L.part,50,C+`void main(){float life=.16+aSeed.y*.08;float age=(uT-aSeed.x*(TL-.06))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=P0+d*mix(.7,.04,age*age);
   vA=(age>0.&&age<1.&&uT<TL+.04)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // gotas de savia que caen de la semilla en vuelo
  a.count+=points(L.part,90,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=lob(s)+r*.05+vec3(r.x*.2*t,-.2*t-2.6*t*t,r.z*.2*t);
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;put(p,(.06+.05*aSeed.z)*(1.-age*.4));}`,DROP_FS);
  // terrones que salta el brote
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.3,0.))*(1.4+2.2*aSeed.z);vec3 p=P1+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.06*aSeed.w);}`,DIRT_FS,NB);
  // esporas de savia que suben enroscadas mientras las raíces atan
  a.count+=points(L.part,170,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.5;float rad=.5+.55*r.y*(1.-age*.4);
   vec3 p=TX+vec3(cos(an)*rad,.05+age*(.9+.6*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*(.6+.4*sin(uT*20.+r.z*30.))*uE:0.;put(p,.03+.035*r.z);}`);
  a.count+=sparks(L.part,120,TI,`${f(P1.x)},.2,${f(P1.z)}`,"0.,.9,0.",2.5,7,3);
  // onda y musgo luminoso con nervios radiales bajo el rival
  const shock=groundPlane(4.2,TX,0.03,fx(RING_FS));
  const moss=groundPlane(3.0,TX,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*7.,2.))*.6+noise(vec3(p*16.,5.))*.4;
   float m=smoothstep(.95,.3,r+(n-.5)*.4)*smoothstep(uP*1.1,uP*1.1-.25,r);
   float rays=pow(1.-abs(sin(an*5.+n*3.+r*4.)),20.)*smoothstep(1.,.3,r)*step(r,uP*1.1);
   gl_FragColor=vec4(mix(uC2,uC1,rays+n*.3)*1.3,(m*.3+rays*.8)*uA);}`));
  L.decal.add(shock,moss);
  const grow=(ia,d)=>{const k=cl((ia-d)/0.3);return ia>=d?1-Math.pow(1-k,2.2):0;};
  a.pose=function(te,o){
    const ia=te-TI, wq=cl((te-TW)/(TE-TW)), env=ss(TI,TI+0.2,te)*(1-ss(TW,TE,te));
    caster.rotation.z=0.12*ss(0,TL,te)-0.26*ss(TL,TL+0.08,te)+0.14*ss(TL+0.1,TL+0.5,te);
    // semilla: aparece en la mano, gira en el vuelo
    const sk=ss(0,0.14,te); seed.visible=te<TI;
    if(te<TL)seed.position.copy(P0); else lob(te,seed.position);
    seed.scale.set(Math.max(0.13*sk,0.001),Math.max(0.17*sk,0.001),Math.max(0.13*sk,0.001)); seed.rotation.set(te*7,te*3,te*5);
    seed.material.uniforms.uA.value=0.5+0.5*Math.sin(te*25);
    // raíces escalonadas y sus espinas
    for(const m of roots){const g=grow(ia,m.userData.d);m.visible=g>0.001&&wq<1;
      set(m,g,0.6+0.4*Math.pow(0.5+0.5*Math.sin(te*6),2)); m.material.uniforms.uQ.value=wq;}
    for(const th of thorns){const u=th.userData.u,sc=ss(u-0.02,u+0.08,grow(ia,th.userData.d))*(1-ss(0,0.5,wq));
      th.visible=sc>0.01; th.scale.setScalar(Math.max(sc,0.001));}
    thornMat.uniforms.uA.value=env;
    let p=cl(ia/0.4); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.25+1.1*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
    set(moss,ss(TI,TI+0.4,te),env*0.9);
    U.uE.value=env;
    // el rival queda atado: retroceso corto y forcejeo
    const hit=hitK(ia,6);
    target.rotation.z=-hit*0.16*Math.cos(ia*15)+0.025*env*Math.sin(te*41); target.scale.set(1,1-0.03*env,1);
    o.em=env*(0.16+0.12*Math.pow(0.5+0.5*Math.sin(te*6),2)); o.emc.copy(U.uC1.value);
    if(te<TL){o.g.copy(P0);o.gs=0.6*sk;o.ga=0.3*sk;o.li=1.5*sk;}
    else if(te<TI){lob(te,o.g);o.gs=0.8;o.ga=0.35;o.li=2.5;}
    else{o.g.set(TX,0.6,0);o.gs=1.4+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.6+0.1*env;o.li=7*Math.exp(-ia*5)+1.5*env;}
    o.ia=ia;o.c.set(TX,0.5,0);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 2 · ESPORAS — un bulbo cae en la casilla central, germina y revienta llenando una cruz (centro + 4 adyacentes)
//     de partículas volumétricas. Daño: niebla violeta cáustica sobre rivales. Curación: luciérnagas verdes sobre aliados.
//     Para que el área toque a dos unidades, la segunda se coloca en la casilla adyacente +x durante la habilidad.
// =====================================================================
const spores={key:"lunalogist_spores",name:"Esporas",tier:2,dur:2.3,ti:0.62,pal:PAL,vlabel:"Efecto",
  variants:[["dano","Daño"],["cura","Curación"]],v:"dano",
  enemies:()=>spores.v==="dano"?1:0, allies:()=>spores.v==="cura"?2:0,
  phases:[["Lanzamiento",0],["Vuelo",0.12],["Germinación",0.42],["Estallido",0.62],["Nube",0.85],["Disipación",1.8]],
build(a){
  const L=a.L,TL=0.12,TG=0.42,TI=0.62,TD=1.8,TE=2.25,VG=variantGroups(a,["dano","cura"]);
  const CEN={dano:V3(3.4,0,0),cura:AP.clone()}, SIDE={dano:V3(4.4,0,0),cura:V3(-0.5,0,-1.9)};
  const COL={dano:["vec3(.82,.4,1.)","vec3(.34,.06,.55)"],cura:["vec3(.6,1.,.38)","vec3(.14,.5,.24)"]};
  // bulbo botánico: piel con costillas oscuras y luz interior que crece al germinar (uP)
  const bMat=fx(`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
   float rib=pow(1.-abs(sin(an*3.+q.y*.6)),8.);float n=noise(vP*7.);
   vec3 skin=mix(vec3(.1,.16,.12),vec3(.3,.42,.3),q.y*.5+.5)*(.4+.6*${LIT});
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float glow=(.3+1.6*uP)*(.6+.4*n);
   gl_FragColor=vec4(skin*rib+uC1*glow*(1.-rib*.6)*.9+uC2*fr*.6,1.);}`,SOLID);
  const bulb=new THREE.Group(); bulb.add(new THREE.Mesh(new THREE.SphereGeometry(1,28,18),bMat));
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.35,0.8,12),bMat); tip.position.y=1.05; bulb.add(tip); L.mesh.add(bulb);
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(BURST_FS)); L.mesh.add(burst);
  const shock=groundPlane(4.6,0,0.03,fx(RING_FS)); L.decal.add(shock);
  const colGeo=new THREE.CylinderGeometry(0.48,0.5,1.8,24,4,true);
  for(const v of ["dano","cura"]){
    const G=VG[v],c=CEN[v],sd=SIDE[v],[K1,K2]=COL[v];
    const C=`const float TI=${f(TI)};const vec3 CE=${v3(c)};const vec3 SD=${v3(sd)};
    vec2 tile(float s){float i=floor(s*4.999);return i<.5?vec2(0.):i<1.5?vec2(1.,0.):i<2.5?vec2(-1.,0.):i<3.5?vec2(0.,1.):vec2(0.,-1.);}`;
    // casillas en cruz: borde y cáusticas del color del efecto; se encienden del centro hacia fuera
    G.cross=groundPlane(3.3,c.x,0.018,fx(`void main(){vec2 p=(vUv-.5)*3.3;vec2 cc=floor(p+.5);float man=abs(cc.x)+abs(cc.y);
     if(man>1.||max(abs(p.x),abs(p.y))>1.5)discard;
     vec2 q=abs(p-cc)*2.;float e=max(q.x,q.y);float on=step(man,uP*1.7);
     float border=smoothstep(.84,.95,e)*smoothstep(1.,.96,e);
     float c1=noise(vec3(p*3.5,uT*.6)),c2=noise(vec3(p*3.5+4.,-uT*.5));float caus=pow(1.-abs(c1-c2),9.);
     gl_FragColor=vec4(${K1}*(1.+caus*.8),(border*.75+.08+caus*.3)*on*uA);}`));
    G.cross.position.z=c.z; G.decal.add(G.cross);
    // columna de niebla sobre cada casilla: vetas de ruido que suben, más densa abajo
    G.colMat=fx(`void main(){float h=vP.y/1.8+.5;
     float n=noise(vec3(vP.x*3.,vP.y*2.2-uT*.9,vP.z*3.))*.6+noise(vec3(vP.x*7.,vP.y*5.-uT*1.7,vP.z*7.+3.))*.4;
     float fr=1.-abs(dot(normalize(vN),normalize(vV)));
     gl_FragColor=vec4(${K1}*(.7+.6*n),smoothstep(.35,.8,n)*(.3+.5*fr)*pow(1.-h,1.5)*smoothstep(0.,.08,h)*uA*.55);}`);
    G.cols=[[0,0],[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>{const m=new THREE.Mesh(colGeo,G.colMat);m.position.set(c.x+dx,0.9,c.z+dz);G.mesh.add(m);return m;});
    let n=0;
    // pellejos del bulbo y chispas del estallido
    n+=points(G.part,50,C+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(0.,.9,0.))*(1.5+2.5*aSeed.z);vec3 p=CE+vec3(0.,.35,0.)+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);
    n+=sparks(G.part,100,TI,`${f(c.x)},.4,${f(c.z)}`,"0.,.7,0.",2.5,6.5,2.5);
    // nube volumétrica: bocanadas que salen del bulbo y se reparten por las 5 casillas
    n+=points(G.part,v==="dano"?190:150,C+`void main(){vec2 tl=tile(aSeed.x);float s=TI+aSeed.y*.12;float t=max(uT-s,0.);
     vec3 r2=vec3(hash(aSeed.xyz*17.3),hash(aSeed.yzw*29.1),hash(aSeed.zwx*41.7));
     vec3 tp=CE+vec3(tl.x+(r2.x-.5)*.85,.15+r2.y*1.3,tl.y+(r2.z-.5)*.85);
     float e=1.-exp(-t*4.5);vec3 p=mix(CE+vec3(0.,.4,0.),tp,e)+vec3(sin(t*.9+r2.x*9.)*.12,t*.18,cos(t*.8+r2.z*9.)*.12);
     vA=(uT>s)?smoothstep(0.,.12,t)*${v==="dano"?".2":".13"}*uE:0.;put(p,(.55+.45*aSeed.w)*(.45+.55*e));}`,PUFF_FS(v==="dano"?K2:K1));
    if(v==="dano"){
      // motas cáusticas que chisporrotean dentro de la niebla
      n+=points(G.part,180,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-TI-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
       vec2 tl=tile(r.x);vec3 p=CE+vec3(tl.x+(r.y-.5)*.9,.1+age*(.9+r.z*.9),tl.y+(r.z-.5)*.9)+vec3(sin(age*9.+r.y*20.)*.06,0.,0.);
       vA=(k>=1.)?sin(age*3.14159)*(.5+.5*step(.5,fract(uT*12.+r.z*7.)))*uE:0.;put(p,.035+.03*r.y);}`,GLOW_FS(K1));
      // humo violeta oscuro (mezcla normal) que da cuerpo a la nube
      n+=points(G.part,70,C+`void main(){vec2 tl=tile(aSeed.x);float s=TI+.08+aSeed.y*.2;float t=max(uT-s,0.);
       vec3 p=CE+vec3(tl.x+(aSeed.z-.5)*.8,.2+aSeed.w*.9+t*.2,tl.y+(aSeed.y-.5)*.8)+vec3(sin(t+aSeed.z*9.)*.1,0.,0.);
       vA=(uT>s)?smoothstep(0.,.3,t)*.45*uE:0.;put(p,.6+.4*aSeed.w);}`,SMOKE_FS("vec3(.16,.04,.22)"),NB);
    }else{
      // luciérnagas que se reparten por la cruz y parpadean
      n+=points(G.part,260,C+`void main(){vec2 tl=tile(aSeed.x);vec3 r=aSeed.yzw;float t=max(uT-TI,0.);
       vec3 base=CE+vec3(tl.x+(r.x-.5)*.85,.25+r.y*1.5,tl.y+(r.z-.5)*.85);
       vec3 p=mix(CE+vec3(0.,.4,0.),base,1.-exp(-t*3.5))+vec3(sin(uT*1.7+r.x*20.)*.18,sin(uT*2.3+r.y*17.)*.12,cos(uT*1.9+r.z*15.)*.18);
       float blink=.25+.75*pow(.5+.5*sin(uT*(3.+4.*r.y)+r.z*40.),3.);
       vA=(uT>TI)?smoothstep(0.,.15,t)*blink*uE:0.;put(p,.045+.04*r.x);}`,GLOW_FS(K1));
      // vida que sube por el cuerpo de los dos aliados
      n+=points(G.part,50,C+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
       vec3 U0=r.x<.5?CE:SD;float an=r.y*6.2832+age*2.;
       vec3 p=U0+vec3(cos(an)*.48,.1+age*1.7,sin(an)*.48);
       vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.04+.03*r.z);}`,GLOW_FS(K1));
    }
    G.n=n;
  }
  a.setVariant=v=>{if(!VG[v])v="dano";a.v=v;for(const k in VG)for(const l of VFX.LK)VG[k][l].visible=k===v;a.count=VG[v].n;};
  a.pose=function(te,o){
    const v=a.v,c=CEN[v],sd=SIDE[v],G=VG[v],ia=te-TI,env=ss(TI,TI+0.25,te)*(1-ss(TD,TE,te));
    caster.rotation.z=0.12*ss(0,TL,te)-0.22*ss(TL,TL+0.07,te)+0.1*ss(TL+0.1,TL+0.45,te);
    // vuelo en arco, aterrizaje y germinación (se hincha y tiembla)
    const k=cl((te-TL)/(TG-TL)), sw=ss(TG,TI,te), app=ss(0,0.1,te);
    if(te<TL)bulb.position.copy(HAND);
    else bulb.position.set(HAND.x+(c.x-HAND.x)*k,HAND.y+(0.3-HAND.y)*k+4*k*(1-k)*1.6,HAND.z+(c.z-HAND.z)*k);
    if(te>=TG)bulb.position.x+=0.025*Math.sin(te*70)*sw;
    bulb.visible=te<TI;
    bulb.scale.set(Math.max(0.15*app*(1+0.45*sw),0.001),Math.max(0.19*app*(1+0.3*sw),0.001),Math.max(0.15*app*(1+0.45*sw),0.001));
    bulb.rotation.set(0,te<TG?te*6:TG*6,te<TG?0.5*Math.sin(te*10):0);
    bMat.uniforms.uP.value=sw;
    let p=cl(ia/0.45); burst.position.set(c.x,0.35,c.z); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.3*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.5); shock.position.set(c.x,0.03,c.z); set(shock,1-Math.pow(1-p,2),ia>=0?0.75*(1-p):0);
    set(G.cross,ss(TI,TI+0.35,te),env);
    const cs=Math.max(ss(TI,TI+0.4,te),0.001); for(const m of G.cols){m.scale.set(1,cs,1);m.position.y=0.9*cs;} G.colMat.uniforms.uA.value=env;
    U.uE.value=env;
    const tick=Math.pow(0.5+0.5*Math.sin((te-TI)*9),4);
    if(v==="dano"){
      // rival en la casilla +x; ambos se tiñen de violeta con tics cáusticos
      enemies[0].position.copy(sd);
      const e=enemies[0].userData.m; e.emissive.setRGB(0.75,0.3,1); e.emissiveIntensity=(ia>=0?0.9*Math.exp(-ia*8):0)+env*0.35*tick;
      const hit=hitK(ia,6); target.rotation.z=-hit*0.15*Math.cos(ia*14)+0.02*env*tick; enemies[0].rotation.z=hit*0.15*Math.cos(ia*13);
      o.em=env*0.35*tick; o.emc.setRGB(0.75,0.3,1); o.flash=1; o.dist=0.6;
    }else{
      // segundo aliado en la casilla +x; ambos respiran luz verde
      allies[1].position.copy(sd);
      allies.forEach(d=>{const m=d.userData.m;m.emissive.setRGB(0.55,1,0.4);m.emissiveIntensity=env*(0.25+0.2*tick)+(ia>=0?0.5*Math.exp(-ia*6):0);d.scale.set(1,1+0.03*env,1);});
      o.flash=0; o.dist=0.3;
    }
    if(te<TI){o.g.copy(bulb.position);o.gs=0.5+0.6*sw;o.ga=0.2+0.3*sw;o.li=1.5+3*sw;}
    else{o.g.set(c.x,0.7,c.z);o.gs=2.2+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.55+0.08*env;o.li=7*Math.exp(-ia*5)+2*env;}
    o.ia=ia;o.c.set(c.x,0.6,c.z);o.shake=0;
  };
}};

// =====================================================================
// 3 · BAYA — fruta translúcida con estela de gotas que estalla en una corola de flores etéreas alrededor del aliado
//     nivel 1: rápida, pequeña, sin marca de suelo salvo un rizo de agua mínimo
// =====================================================================
const berry={key:"lunalogist_berry",name:"Baya",tier:1,dur:1.25,ti:0.4,pal:PAL,allies:1,
  phases:[["Fruto",0],["Vuelo",0.1],["Corola",0.4],["Fin",0.9]],
build(a){
  const L=a.L,TL=0.1,TI=0.4,TE=1.15,P0=HAND,P1=AC.clone().add(V3(0,0.12,0)),ARC=0.55;
  const path=(te,out)=>{const k=cl((te-TL)/(TI-TL));return out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+4*k*(1-k)*ARC,P0.z+(P1.z-P0.z)*k);};
  // fruta: piel de fresnel, pulpa granulada que se mueve dentro y brillo especular
  const fruit=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);vec3 q=normalize(vP);
   float pulp=smoothstep(.55,.9,noise(q*6.+vec3(uT*.8)));
   float spec=pow(max(0.,dot(normalize(vN),normalize(vec3(-.4,.6,.7)))),28.);
   vec3 c=mix(uC2,uC1,fr*.7+pulp*.4)*(.55+fr)+vec3(1.)*spec*1.3;
   gl_FragColor=vec4(c,(.2+.65*fr+pulp*.2+spec)*uA);}`));
  // corola: siete flores de cinco pétalos en círculo alrededor del aliado; uP las abre
  const corolla=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),fx(`void main(){vec2 p=(vUv-.5)*2.;float m=0.,core=0.;
   for(int i=0;i<7;i++){float a0=float(i)*.8976;vec2 d=p-vec2(cos(a0),sin(a0))*.68;float ra=length(d);
    float aa=atan(d.y,d.x)+float(i)*1.3;float pet=.21*uP*(.5+.5*pow(abs(cos(aa*2.5)),.6));
    m=max(m,smoothstep(pet,pet-.05,ra)*.55+band(ra,pet*.92,.02));core=max(core,smoothstep(.06*uP,0.,ra));}
   float halo=band(length(p),.68,.08)*.25;
   gl_FragColor=vec4(mix(uC2,uC1,.5+m*.5)*1.4+vec3(1.)*core,(m+core+halo)*uA);}`,{depthTest:false}));
  L.mesh.add(fruit,corolla);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 AP=${v3(AP)};
  vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,P1,k)+vec3(0.,4.*k*(1.-k)*${f(ARC)},0.);}`;
  a.count+=points(L.part,30,C+`void main(){float life=.1+aSeed.y*.05;float age=(uT-aSeed.x*(TL-.04))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=P0+d*mix(.45,.03,age*age);
   vA=(age>0.&&age<1.&&uT<TL+.03)?smoothstep(0.,.3,age):0.;put(p,.025+.02*aSeed.z);}`);
  // estela de gotas de agua
  a.count+=points(L.part,100,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=path(s)+r*.04+vec3(r.x*.12*t,-1.8*t*t,r.z*.12*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.045+.035*aSeed.z)*(1.-age*.4));}`,DROP_FS);
  // salpicadura al estallar
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.03;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.3,0.))*(1.2+1.6*aSeed.z);vec3 p=P1+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.035*aSeed.w);}`,DROP_FS);
  // flores etéreas que giran en espiral alrededor del aliado
  a.count+=points(L.part,36,C+`void main(){float s=TI+aSeed.x*.12;float t=max(uT-s,0.);
   float an=aSeed.y*6.2832+t*2.4;float rad=.5+.28*(1.-exp(-t*6.));
   vec3 p=AP+vec3(cos(an)*rad,.35+aSeed.z*1.25+t*.35,sin(an)*rad);
   vA=(uT>s)?smoothstep(0.,.08,t)*uE:0.;put(p,(.13+.07*aSeed.w)*(1.-exp(-t*9.)));}`,FLOWER_FS);
  a.count+=points(L.part,30,C+`void main(){float life=.25+aSeed.y*.15;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.,.3+r.y*1.5,(r.z-.5)*1.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.08+.08*r.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=sparks(L.part,50,TI,`${f(P1.x)},${f(P1.y)},${f(P1.z)}`,"0.,.5,0.",1.5,4,2);
  const ripple=groundPlane(1.8,AP.x,0.03,fx(RING_FS)); ripple.position.z=AP.z; L.decal.add(ripple);
  a.pose=function(te,o){
    const ia=te-TI, app=ss(0,TL,te), env=ss(TI,TI+0.1,te)*(1-ss(TE-0.3,TE,te));
    caster.rotation.z=0.1*ss(0,TL,te)-0.2*ss(TL,TL+0.06,te)+0.1*ss(TL+0.08,TL+0.35,te);
    fruit.visible=te<TI; if(te<TL)fruit.position.copy(P0); else path(te,fruit.position);
    const wob=1+0.06*Math.sin(te*38);
    fruit.scale.set(Math.max(0.12*app*wob,0.001),Math.max(0.13*app/wob,0.001),Math.max(0.12*app*wob,0.001)); fruit.material.uniforms.uA.value=app;
    const ok=ia>=0?1-Math.pow(1-cl(ia/0.3),3):0;
    towardCam(corolla.position,AC,0.55); billboard(corolla,te*0.7); corolla.visible=ia>=0&&te<TE;
    corolla.scale.setScalar(0.75+0.35*ok); set(corolla,ok,env);
    let p=cl(ia/0.35); set(ripple,p,ia>=0?0.6*(1-p):0);
    U.uE.value=env;
    const d=allies[0], m=d.userData.m; m.emissive.copy(U.uC1.value); m.emissiveIntensity=0.25*env+(ia>=0?0.7*Math.exp(-ia*8):0);
    const bump=ia>=0?Math.exp(-ia*9)*Math.sin(ia*20)*0.05:0; d.scale.set(1+bump,1-bump*0.5,1+bump);
    if(te<TI){if(te<TL)o.g.copy(P0);else path(te,o.g);o.gs=0.55;o.ga=0.3*app;o.li=1.6*app;}
    else{o.g.copy(AC);o.gs=1+1.6*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.45+0.06*env;o.li=4*Math.exp(-ia*6)+0.8*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 4 · SEMILLA — semilla con púas que se clava en el rival y tiende una enredadera curva hasta la mano;
//     tres pulsos rojos de vitalidad recorren la liana y encienden al lanzador (sin orbe ni anillo de absorción)
// =====================================================================
const seedA={key:"lunalogist_seed",name:"Semilla",tier:2,dur:2.35,ti:0.48,pal:PAL,
  phases:[["Disparo",0],["Vuelo",0.16],["Clavado",0.48],["Enredadera",0.6],["Drenaje",0.98],["Marchitez",1.95]],
build(a){
  const L=a.L,TL=0.16,TI=0.48,TV=0.6,TVG=0.98,TW=1.95,TE=2.3,P0=HAND,SP=V3(3.06,1.22,0.12),PD=0.38,TP=[1.0,1.25,1.5];
  const B1=SP.clone().add(V3(-1.3,1.9,0.7)),B2=HAND.clone().add(V3(1.4,1.9,0.5));
  const curve=new THREE.CubicBezierCurve3(SP,B1,B2,HAND);
  const fly=(te,out)=>{const k=cl((te-TL)/(TI-TL));return out.set(P0.x+(SP.x-P0.x)*k,P0.y+(SP.y-P0.y)*k+0.35*Math.sin(Math.PI*k),P0.z+(SP.z-P0.z)*k);};
  const grow=te=>{const k=cl((te-TV)/(TVG-TV));return 1-Math.pow(1-k,2);};
  // semilla: núcleo de cáscara + diez púas repartidas en espiral de Fibonacci
  const seedG=new THREE.Group(); L.mesh.add(seedG);
  const huskMat=fx(`void main(){vec3 q=normalize(vP);float n=noise(vP*9.);
   float rib=pow(abs(sin(atan(q.z,q.x)*4.+q.y*3.)),14.);
   vec3 husk=mix(vec3(.07,.09,.06),vec3(.24,.3,.18),n)*(.4+.6*${LIT});
   gl_FragColor=vec4(husk+uC1*rib*(.6+1.4*uA),1.);}`,SOLID);
  const core=new THREE.Mesh(new THREE.SphereGeometry(0.12,20,14),huskMat); core.scale.set(1.35,1,1); seedG.add(core);
  const spikeGeo=new THREE.ConeGeometry(0.025,0.16,6), spikeMat=fx(`void main(){float l=vP.y/.16+.5;gl_FragColor=vec4(mix(vec3(.12,.14,.1),uC1*1.5,pow(l,2.5)),1.);}`,SOLID), up=V3(0,1,0);
  for(let i=0;i<10;i++){const th=Math.acos(1-2*(i+0.5)/10),ph=i*2.39996,d=V3(Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph));
    const s=new THREE.Mesh(spikeGeo,spikeMat); s.position.copy(d).multiplyScalar(0.15); s.position.x*=1.3; s.quaternion.setFromUnitVectors(up,d); seedG.add(s);}
  // liana: corteza verde con vetas de savia; uK = posición (0..1, del rival a la mano) de los tres pulsos rojos
  const uK={value:V3(-1,-1,-1)}, uQ={value:0};
  const vine=new THREE.Mesh(taperTube(curve,120,8,0.065,0.035),fxU(`uniform vec3 uK;uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*50.,vUv.y*6.,2.))*.6+noise(vec3(u*120.,vUv.y*12.,5.))*.4;
   if(n<uQ*1.2-u*.2)discard;
   vec3 bark=mix(vec3(.05,.12,.08),vec3(.16,.32,.2),n)*(.4+.6*${LIT});
   float vein=pow(1.-abs(sin(vUv.y*12.566+u*14.)),12.);
   float pulse=0.;for(int i=0;i<3;i++){float c=uK[i];pulse+=smoothstep(.07,0.,abs(u-c))*step(0.,c);}
   float head=smoothstep(.06,0.,uP-u)*step(uP,.995);
   gl_FragColor=vec4(bark+uC1*vein*.45+${RED}*(pulse*2.2+pulse*vein*1.5)+uC1*head*1.4,1.);}`,{uK,uQ},SOLID));
  // vaina aditiva: halo rojo donde pasa cada pulso y un hilo de savia tenue
  const sheath=new THREE.Mesh(taperTube(curve,120,8,0.15,0.09),fxU(`uniform vec3 uK;
  void main(){float u=vUv.x;if(u>uP)discard;
   float pulse=0.;for(int i=0;i<3;i++){float c=uK[i];pulse+=smoothstep(.1,0.,abs(u-c))*step(0.,c);}
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float sap=.1*(.6+.4*sin(u*30.-uT*6.));
   gl_FragColor=vec4(${RED}*pulse*1.8+uC1*sap,(pulse*.8+sap)*(.3+.7*fr)*uA);}`,{uK}));
  L.trail.add(vine,sheath);
  const PC=`const float TL=${f(TL)};const float TI=${f(TI)};const float TV=${f(TV)};const float TVG=${f(TVG)};const float TW=${f(TW)};const float PD=${f(PD)};
  const vec3 P0=${v3(P0)};const vec3 SP=${v3(SP)};const vec3 B1=${v3(B1)};const vec3 B2=${v3(B2)};const vec3 B3=${v3(HAND)};
  vec3 bz(float u){float v=1.-u;return v*v*v*SP+3.*v*v*u*B1+3.*v*u*u*B2+u*u*u*B3;}
  vec3 fly(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,SP,k)+vec3(0.,.35*sin(3.14159*k),0.);}
  float tp(float i){return ${f(TP[0])}+i*${f(TP[1]-TP[0])};}`;
  a.count+=points(L.part,80,PC+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.2+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=fly(s)+r*.04+vec3(-.4*t,.2*t,r.z*.2*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,40,PC+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-1.,.7,0.))*(1.4+2.*aSeed.z);vec3 p=SP+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,40,PC+`void main(){float s=TI+aSeed.x*.1;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=SP+r*.08+vec3(-.3*t+r.x*.3*t,-2.5*t*t,r.z*.3*t);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.05+.04*aSeed.w);}`,DROP_FS);
  a.count+=sparks(L.part,110,TI,`${f(SP.x)},${f(SP.y)},${f(SP.z)}`,"-.6,.3,0.",2.5,7,3);
  // hojas que brotan a lo largo de la liana y caen al marchitarse (mezcla normal)
  a.count+=points(L.part,40,PC+`void main(){float u=.06+aSeed.x*.88;float k=clamp((uT-TV)/(TVG-TV),0.,1.);float g=1.-(1.-k)*(1.-k);
   float on=smoothstep(u,u+.06,g);float t=max(uT-TW-aSeed.y*.2,0.);
   vec3 r=rnd();vec3 p=bz(u)+r*.09+vec3(r.x*.3*t,-2.2*t*t,r.z*.3*t);
   vA=on*(1.-smoothstep(.2,.6,t))*step(.03,p.y);put(p,(.13+.07*aSeed.z)*on);}`,LEAF_FS,NB);
  // savia roja que fluye con cada pulso por la liana (estela continua, no un orbe)
  a.count+=points(L.part,150,PC+`void main(){float i=floor(aSeed.x*2.999);float k=(uT-tp(i))/PD-aSeed.y*.3;
   vec3 r=rnd();vec3 p=bz(clamp(k,0.,1.))+r*.07*(.4+aSeed.y);
   vA=(k>0.&&k<1.)?(1.-aSeed.y)*(.7+.3*sin(uT*40.+aSeed.z*30.)):0.;put(p,(.04+.05*aSeed.z)*(1.-aSeed.y*.5));}`,GLOW_FS(RED));
  // chispas de vida que suben por el cuerpo del lanzador al llegar cada pulso
  a.count+=points(L.part,150,PC+`void main(){float i=floor(aSeed.x*2.999);float s=tp(i)+PD+aSeed.y*.12;float life=.45+aSeed.z*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832+t*3.;float rad=.42+.12*sin(t*5.+aSeed.z*9.);
   vec3 p=vec3(-3.7,0.,0.)+vec3(cos(an)*rad,.2+aSeed.y*1.4+t*1.3,sin(an)*rad);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.z*20.)):0.;put(p,.035+.04*aSeed.z);}`,GLOW_FS(RED));
  const shock=groundPlane(3.0,3.4,0.03,fx(RING_FS));
  const cring=groundPlane(2.4,-3.7,0.03,fx(RING_FS.replace("mix(uC1",`mix(${RED}`)));
  L.decal.add(shock,cring);
  const lp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, g=grow(te), wq=cl((te-TW)/(TE-TW));
    caster.rotation.z=0.14*ss(0,TL,te)-0.3*ss(TL,TL+0.06,te)+0.16*ss(TL+0.1,TL+0.45,te);
    const hit=hitK(ia,6); target.position.x=3.4+hit*0.1*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.16*Math.cos(ia*15);
    // la semilla vuela girando y queda clavada en el pecho del rival
    if(te<TI){fly(te,seedG.position);seedG.rotation.set(te*14,te*9,0);}
    else{seedG.position.set(SP.x+target.position.x-3.4,SP.y,SP.z);seedG.rotation.set(TI*14,TI*9,0.3*target.rotation.z);}
    const app=ss(0,0.1,te); seedG.visible=te<TE; seedG.scale.setScalar(Math.max(app*(1-ss(TW,TE,te)),0.001));
    // pulsos: posición de cada uno en la liana (−1 = inactivo)
    const pk=TP.map(t0=>{const k=(te-t0)/PD;return k>=0&&k<=1?k:-1;});
    uK.value.set(pk[0],pk[1],pk[2]); uQ.value=wq;
    huskMat.uniforms.uA.value=0.4+0.6*Math.max(0,...TP.map(t0=>te>=t0?Math.exp(-(te-t0)*8):0));
    vine.visible=sheath.visible=te>=TV&&wq<1; set(vine,g,1); set(sheath,g,(1-wq)*ss(TV,TV+0.1,te));
    let p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    // llegada de cada pulso: el lanzador se enciende de rojo; el rival destella al perder cada uno
    let ig=0,last=-1,dep=0;
    TP.forEach(t0=>{const s=te-(t0+PD);if(s>=0){ig+=Math.exp(-s*5);last=s;} const d=te-t0;if(d>=0)dep+=Math.exp(-d*7);});
    const cm=caster.userData.m; cm.emissive.setRGB(1,0.16,0.2); cm.emissiveIntensity=0.9*Math.min(ig,1.2)+(last>=0?0.18*(1-ss(TW,TE,te)):0);
    const sw=Math.min(ig,1); caster.scale.set(1+0.035*sw,1+0.025*sw,1+0.035*sw);
    p=last>=0?cl(last/0.4):1; set(cring,p,last>=0?0.85*(1-p):0);
    o.em=0.45*Math.min(dep,1); o.emc.setRGB(1,0.16,0.2);
    const lead=pk.reduce((m,k)=>k>m?k:m,-1);
    if(te<TI){fly(Math.max(te,TL),o.g);o.gs=0.6;o.ga=0.3*app;o.li=1.8*app;}
    else if(lead>=0){curve.getPointAt(lead,lp);o.g.copy(lp);o.gs=0.9;o.ga=0.35;o.li=3.5;o.g.y+=0;}
    else if(te<TP[0]){o.g.copy(SP);o.gs=1.1+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.5+0.06;o.li=5*Math.exp(-ia*6)+0.8;}
    else{o.g.copy(CHEST);o.gs=1.2;o.ga=0.1+0.35*Math.min(ig,1);o.li=1+3*Math.min(ig,1);}
    if(last>=0){o.ia=last;o.c.copy(CHEST);o.flash=0;o.dist=0.35;}
    else{o.ia=ia;o.c.copy(SP);o.flash=1;o.dist=0.6;}
    o.shake=0;
  };
}};

// =====================================================================
// 5 · MANTO DE LOTO — hojas de loto gigantes brotan alrededor del lanzador, se pliegan en un capullo cónico
//     y al abrirse dejan una película prismática deflectora (pompa de jabón con fresnel iridiscente)
// =====================================================================
const cloak={key:"lunalogist_cloak",name:"Manto de loto",tier:2,dur:2.3,ti:0.85,pal:PAL,
  phases:[["Brote",0],["Plegado",0.28],["Capullo",0.85],["Película",1.05],["Disipación",1.85]],
build(a){
  const L=a.L,TR=0.28,TI=0.85,TO=1.05,TD=1.85,TE=2.25,CX=-3.7,N=7,R0=0.78,LEN=2.75,OPEN=1.42,SHUT=-0.25,FC=V3(CX,1.2,0);
  const lg=new THREE.Group(); lg.position.set(CX,0,0); L.mesh.add(lg);
  const uQ={value:0}, petMat=fxU(PETAL_FS,{uQ},NB);
  const petals=lotusRing(lg,N,petalGeo(LEN,1.15,0.34,0.35),petMat,R0,0.2);
  // inclinación de cada hoja: abierta → capullo (escalonado) → se reabre al disolverse
  const tilt=(te,i)=>{const d=0.03*i;
    if(te<TO)return OPEN+(SHUT-OPEN)*ss(TR+d,TI-0.04,te);
    return SHUT+(0.75-SHUT)*ss(TO,TO+0.5,te);};
  // película fina: tono según espesor (fresnel + remolinos), brillo que barre y ondas al formarse
  const film=new THREE.Mesh(new THREE.SphereGeometry(1,56,36),fxU(`uniform float uH;
  void main(){float fr=1.-abs(dot(normalize(vN),normalize(vV)));float h=vP.y*.5+.5;
   if(h>uP*1.15)discard;
   float sw=noise(vP*2.2+vec3(0.,uT*.6,uT*.25))*.7+noise(vP*5.-vec3(uT*.4))*.3;
   float th=fr*1.6+sw*1.8+h*.6-uT*.25;
   vec3 iri=.5+.5*cos(6.2832*(th+vec3(0.,.33,.67)));
   float sheen=band(fract(h*1.5-uT*.35),.5,.05);
   float rip=band(fract(h*4.-uH*3.),.5,.1)*exp(-uH*2.5)*step(0.,uH);
   float front=band(h,uP*1.15,.04)*step(uP,.99);
   float al=(pow(fr,2.4)*.8+.04+sheen*.12+rip*.4+front)*uA;
   gl_FragColor=vec4(mix(iri*1.25,uC1,.2)+vec3(1.)*(pow(fr,7.)*.5+front*.6+rip*.3),al);}`,{uH:{value:-1}}));
  film.position.copy(FC); film.scale.set(0.92,1.38,0.92); L.mesh.add(film);
  const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float TO=${f(TO)};const vec3 CC=vec3(${f(CX)},0.,0.);const vec3 FC=${v3(FC)};`;
  // polen y rocío que flotan dentro del capullo
  a.count+=points(L.part,150,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TR)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;float rad=.15+.5*sqrt(r.y);
   vec3 p=CC+vec3(cos(an)*rad,.1+age*2.3,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*(.6+.4*sin(uT*16.+r.z*30.))*uE:0.;put(p,.03+.03*r.z);}`);
  // gotas que resbalan de las hojas mientras se pliegan
  a.count+=points(L.part,80,C+`void main(){float s=TR+.2+aSeed.x*.55;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float y0=1.2+aSeed.w*1.2;float rad=${f(R0)}-y0*.24+.12;
   vec3 p=CC+vec3(cos(an)*(rad+.15*t),y0-3.5*t*t,sin(an)*(rad+.15*t));
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;put(p,.05+.04*aSeed.y);}`,DROP_FS);
  // jirones de hoja que se desprenden al disolverse (mezcla normal)
  a.count+=points(L.part,90,C+`void main(){float s=TO+.1+aSeed.x*.55;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float y0=.2+aSeed.w*2.2;float rad=${f(R0)}-y0*.12+.1;
   vec3 dir=vec3(cos(an),0.,sin(an));vec3 p=CC+dir*(rad+.8*t)+vec3(0.,y0+.4*t-.6*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.16+.08*aSeed.y)*(1.-age*.4));}`,LEAF_FS,NB);
  // destellos sobre la superficie de la película
  a.count+=points(L.part,70,C+`void main(){float life=.35+aSeed.y*.25;float k=(uT-TO)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 d=normalize(r*2.-1.+vec3(0.,.25,0.));vec3 p=FC+d*vec3(.93,1.39,.93);
   vA=(k>=1.&&p.y>.1)?sin(age*3.14159)*uE:0.;put(p,(.09+.08*r.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=sparks(L.part,90,TI,`${f(CX)},2.55,0.`,"0.,1.,0.",2,5.5,2.2);
  // nenúfar bajo el lanzador: disco con nervios radiales y onda del sellado
  const pad=groundPlane(3.6,CX,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*8.,3.));
   float disc=smoothstep(.92,.88,r);float rim=band(r,.9,.02);
   float vein=pow(1.-abs(sin(an*9.+n*.6)),20.)*smoothstep(.9,.12,r);
   float wave=band(r,uP,.05)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,vein+rim)*1.25,(disc*(.1+.06*n)+vein*.5+rim*.7+wave*.6)*uA);}`));
  const shock=groundPlane(4.6,CX,0.03,fx(RING_FS));
  L.decal.add(pad,shock);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.1,te)*(1-ss(TD,TE,te)), rise=ss(0,TR,te), dis=ss(TO+0.1,1.7,te);
    caster.rotation.z=0.06*ss(0,TR,te)-0.1*ss(TR,TI,te)+0.04*ss(TI,TI+0.4,te);
    lg.visible=dis<0.999;
    petals.forEach((p,i)=>{p.rotation.x=tilt(te,i)+(te>=TI-0.04&&te<TO?0.015*Math.sin(te*9+i):0);p.scale.setScalar(Math.max(rise,0.001));});
    petMat.uniforms.uA.value=1; petMat.uniforms.uP.value=ss(TR,TI,te)*(1-ss(TO,TO+0.4,te))+0.5*hitK(ia,5); uQ.value=dis;
    // película: se forma de abajo arriba dentro del capullo y queda latiendo
    film.visible=te>=TI&&te<TE; film.scale.set(0.92*(1+0.012*Math.sin(te*5)),1.38,0.92*(1+0.012*Math.sin(te*5)));
    set(film,ss(TI,TO+0.05,te),env); film.material.uniforms.uH.value=ia>=0?ia:-1;
    set(pad,cl(ia/0.5),ss(0,0.2,te)*(1-ss(TD,TE,te))*0.9);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.75*(1-p):0);
    U.uE.value=te<TO?ss(TR,TR+0.2,te):env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.18*env+0.3*ss(TR,TI,te)*(1-ss(TO,TO+0.3,te))+(ia>=0?0.5*Math.exp(-ia*6):0);
    o.g.copy(FC); o.g.y=te<TI?0.6+1.4*ss(TR,TI,te):1.3;
    if(te<TI){o.gs=0.8+0.8*ss(TR,TI,te);o.ga=0.25*ss(0,TI,te);o.li=1+3*ss(TR,TI,te);}
    else{o.gs=1.8+2.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.55+0.08*env;o.li=6*Math.exp(-ia*5)+1.8*env;}
    o.ia=ia;o.c.set(CX,1.3,0);o.shake=0;o.dist=0.45;o.flash=0;
  };
}};

// =====================================================================
// 6 · FLORACIÓN LUNAR — las 9 casillas 3×3 alrededor del rival se oscurecen bajo un haz de luna; brota un loto lunar
//     de ~3 m, eclosiona con una columna de polen y zarcillos atan y tiñen a los tres rivales del área.
//     Nivel 3: escala gigante, temblor fuerte, fractura de baldosa en el centro. Los dos rivales extra se colocan
//     en casillas diagonales del área durante la habilidad.
// =====================================================================
const bloomA={key:"lunalogist_bloom",name:"Floración lunar",tier:3,dur:3.2,ti:1.25,pal:PAL,enemies:2,
  phases:[["Eclipse",0],["Brote",0.6],["Eclosión",1.25],["Columna",1.45],["Atadura",1.75],["Ocaso",2.7]],
build(a){
  const L=a.L,TB=0.6,TI=1.25,TA=1.75,TF=2.7,TE=3.15,CX=3.4,EP=[V3(2.4,0,1.0),V3(4.4,0,-1.0)];
  const UNITS=[V3(CX,0,0),EP[0],EP[1]];
  // suelo: casillas que se oscurecen de dentro afuera (mezcla normal) y sus bordes con luz de luna
  const TILE=`vec2 p=(vUv-.5)*3.2;vec2 c=floor(p+.5);float ring=max(abs(c.x),abs(c.y));
   if(ring>1.||max(abs(p.x),abs(p.y))>1.5)discard;
   vec2 q=abs(p-c)*2.;float e=max(q.x,q.y);float on=smoothstep(ring*.45,ring*.45+.3,uP);`;
  const dark=groundPlane(3.2,CX,0.012,fx(`void main(){${TILE}
   float n=noise(vec3(p*5.,1.));
   gl_FragColor=vec4(vec3(.005,.012,.02),(.82+.12*n)*smoothstep(1.,.93,e)*on*uA);}`,NB));
  const lines=groundPlane(3.2,CX,0.02,fx(`void main(){${TILE}
   float border=smoothstep(.86,.95,e)*smoothstep(1.,.97,e);
   float glyph=band(length(p-c),.55,.02)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,border)*1.3,(border*.8+glyph)*on*uA);}`));
  const FS=6, frac=groundPlane(FS,CX,0.025,fx(tileFractureFS(FS)));
  const shock=groundPlane(10,CX,0.03,fx(RING_FS));
  L.decal.add(dark,lines,frac,shock);
  // haz de luna que baja sobre el área durante la anticipación
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.9,14,40,1,true),fx(`void main(){float h=vP.y/14.+.5;
   float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.4);
   float n=noise(vec3(vP.x*1.5,vP.y*.6-uT*.8,vP.z*1.5));
   gl_FragColor=vec4(mix(uC1,vec3(.85,.95,1.),.5)*1.1,fr*(.3+.4*n)*(1.-h*.6)*uA);}`));
  beam.position.set(CX,7,0);
  // columna de polen: vetas que suben rápido, más densa abajo
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.0,9,40,1,true),fx(`void main(){float h=vP.y/9.+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*3.,h*5.-uT*2.4,uT*.3))*.6+noise(vec3(an*8.,h*14.-uT*4.,2.))*.4;
   float st=smoothstep(.4,.8,n);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.2+vec3(1.)*st*.15,(st*.55+pow(fr,2.)*.3+.05)*pow(1.-h,1.2+uP*2.)*uA);}`));
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,44,20,0,Math.PI*2,0,Math.PI/2),fx(BURST_FS)); dome.position.set(CX,0,0);
  L.mesh.add(beam,col,dome);
  // loto lunar: tres coronas de pétalos que suben del suelo como capullo y eclosionan (~3,2 m de diámetro)
  const flower=new THREE.Group(); flower.position.set(CX,0,0); L.mesh.add(flower);
  const lotMat=fx(LOTUS_FS);
  const layers=[{n:10,L:1.25,W:0.78,r:0.52,open:1.05,ph:0},{n:8,L:1.0,W:0.64,r:0.48,open:0.7,ph:0.3},{n:6,L:0.75,W:0.5,r:0.45,open:0.35,ph:0.1}];
  for(const s of layers)s.arr=lotusRing(flower,s.n,petalGeo(s.L,s.W,0.3,0.35),lotMat,s.r,s.ph);
  // zarcillos en hélice que trepan por cada rival del área
  const TEND_FS=`void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*30.-uT*2.,vUv.y*6.,1.));
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float pol=pow(.5+.5*sin(u*40.-uT*8.),6.);
   float head=smoothstep(.08,0.,uP-u)*step(uP,.995);
   gl_FragColor=vec4(mix(uC2,uC1,.4+n*.6)*1.3+vec3(1.)*(pol*.3+head),(.45+.4*fr+pol*.4+head)*uA);}`;
  const binds=UNITS.map((u,j)=>{const g=new THREE.Group();g.position.copy(u);L.trail.add(g);const m=fx(TEND_FS);
    for(let i=0;i<3;i++)g.add(new THREE.Mesh(taperTube(helixCurve(0.5,1.5,1.6,i*2.094+j,i%2?1:-1),80,6,0.05,0.018),m));
    g.userData={m,d:0.12*j};return g;});
  // partículas
  const uB={value:0};
  const C=`const float TI=${f(TI)};const float TA=${f(TA)};const vec3 CE=vec3(${f(CX)},0.,0.);const vec3 E0=${v3(EP[0])};const vec3 E1=${v3(EP[1])};
  vec3 unit(float s){float i=floor(s*2.999);return i<.5?CE:(i<1.5?E0:E1);}`;
  // luz de luna que desciende y se concentra en el centro
  a.count+=points(L.part,160,C+`void main(){float life=.45+aSeed.y*.3;float k=(uT-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.3+1.4*r.y*(1.-age);
   vec3 p=CE+vec3(cos(an)*rad,4.5*(1.-age)+.2,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.8*(1.-smoothstep(TI-.12,TI,uT)):0.;put(p,.03+.035*r.z);}`);
  // polen que sube por la columna
  a.count+=points(L.part,380,C+`void main(){float life=.9+aSeed.y*.6;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rad=.15+.75*sqrt(r.y);
   vec3 p=CE+vec3(cos(an)*rad,.3+age*(5.+3.*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*(.6+.4*sin(uT*18.+r.z*40.))*uE:0.;put(p,.04+.05*r.z);}`);
  // polen que cae desde lo alto sobre las casillas
  a.count+=points(L.part,240,C+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-TI-.25)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.4+2.*r.y;
   vec3 p=CE+vec3(cos(an)*rad*age,5.5+r.z*1.5-age*(5.5+r.z*1.4),sin(an)*rad*age)+vec3(sin(age*8.+r.z*9.)*.15,0.,0.);
   vA=(k>=1.&&p.y>.05)?sin(age*3.14159)*uE*.85:0.;put(p,.045+.045*r.z);}`);
  // polen que se enrosca alrededor de cada rival atado (uB = envolvente de la atadura)
  a.count+=points(L.part,180,`uniform float uB;`+C+`void main(){vec3 U0=unit(aSeed.x);float life=.7+aSeed.y*.3;float k=(uT-TA)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*5.;float rad=.55+.12*sin(age*6.);
   vec3 p=U0+vec3(cos(an)*rad,.1+age*1.5,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uB*.9:0.;put(p,.035+.03*r.y);}`,null,{uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uB}});
  // flores sueltas que salen despedidas en la eclosión
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.08;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.4,1.)+vec3(0.,.7,0.));vec3 p=CE+vec3(0.,.4,0.)+d*(1.2+2.4*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,-.5*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.16+.12*aSeed.w)*(1.-age*.3));}`,FLOWER_FS);
  // polvo de la fractura (mezcla normal)
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.15;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=CE+vec3(cos(an),0.,sin(an))*(.6+2.2*aSeed.w)*(1.-exp(-t*2.5))+vec3(0.,.15+.5*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.35+.35*aSeed.y)*(.6+age*.7));}`,DUST_FS,NB);
  a.count+=sparks(L.part,220,TI,`${f(CX)},.6,0.`,"0.,.8,0.",4,11,3.5);
  const bk=(te,j)=>{const k=cl((te-TA-binds[j].userData.d)/0.45);return te>=TA?1-Math.pow(1-k,2):0;};
  a.pose=function(te,o){
    const ia=te-TI, fade=ss(TF,TE,te), benv=ss(TA,TA+0.4,te)*(1-fade), cenv=ss(TI,TI+0.12,te)*(1-ss(TF-0.2,TF+0.3,te));
    // el Sapidae alza la mano hacia la luna y descarga
    caster.rotation.z=0.16*ss(0,TB,te)-0.3*ss(TI-0.12,TI,te)+0.14*ss(TI+0.1,TI+0.7,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.4*ss(0.1,TI,te)*(1-ss(TI,TI+0.6,te));
    // casillas y luz de luna
    const dk=cl((te-0.1)/0.6);
    set(dark,dk,1-ss(TF+0.1,TE,te)); set(lines,dk,(0.55+0.7*hitK(ia,3))*(1-fade));
    beam.visible=te>=0.1&&te<TI+0.4; set(beam,0,0.75*ss(0.15,0.7,te)*(1-ss(TI,TI+0.35,te)));
    // loto: el capullo emerge del suelo y eclosiona en el impacto
    const rise=ss(TB,TI-0.08,te), open=ia>=0?1-Math.pow(1-cl(ia/0.35),3):0;
    flower.visible=te>=TB&&te<TE; flower.position.y=-1.6*(1-rise);
    for(const s of layers){const t=-0.06+(s.open+0.06)*open+0.03*Math.sin(te*2)*open;for(const p of s.arr)p.rotation.x=t;}
    lotMat.uniforms.uA.value=(0.55+0.45*rise+0.6*hitK(ia,4))*(1-fade);
    // columna de polen, cúpula y suelo roto
    col.visible=ia>=0&&te<TF+0.3; const cy=Math.max(ss(TI,TI+0.25,te),0.001);
    col.scale.set(1+0.15*hitK(ia,5),cy,1+0.15*hitK(ia,5)); col.position.y=4.5*cy; set(col,cl(ia/1.4),cenv);
    let p=cl(ia/0.5); dome.visible=ia>=0&&p<1; dome.scale.setScalar(2.2*(0.3+0.85*(1-Math.pow(1-p,3)))); dome.material.uniforms.uP.value=p;
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,TE,te):0);
    p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    // zarcillos que atan
    binds.forEach((g,j)=>{const k=bk(te,j);g.visible=k>0.001&&fade<1;const u=g.userData.m.uniforms;u.uP.value=k;u.uA.value=1-fade;});
    U.uE.value=cenv; uB.value=benv;
    // rivales: sacudida en la eclosión, luego quietos, tensos y teñidos
    const hit=hitK(ia,5), tr=0.012*benv*Math.sin(te*47);
    enemies.forEach((e,i)=>{e.position.copy(EP[i]);const m=e.userData.m;m.emissive.copy(U.uC1.value);
      m.emissiveIntensity=(ia>=0?0.8*Math.exp(-ia*6):0)+0.5*benv*(0.75+0.25*Math.sin(te*6+i));
      e.rotation.z=(i?-1:1)*hit*0.2*Math.cos(ia*13)+tr; e.scale.set(1-0.04*benv,1,1-0.04*benv);});
    target.rotation.z=-hit*0.2*Math.cos(ia*12)+tr; target.position.y=0.18*Math.sin(Math.PI*cl(ia/0.4))*(ia>=0?1:0); target.scale.set(1-0.04*benv,1,1-0.04*benv);
    o.em=0.5*benv*(0.75+0.25*Math.sin(te*6)); o.emc.copy(U.uC1.value);
    o.dark=0.55*ss(0,0.6,te)*(1-ss(TF,TE,te)); o.white=ia>=0?0.22*Math.exp(-ia*28):0; o.ld=8;
    if(te<TI){o.g.set(CX,0.6+0.8*rise,0);o.gs=1+1.6*ss(0.2,TI,te);o.ga=0.45*ss(0.2,TI,te);o.li=1+4*ss(0.2,TI,te);}
    else{o.g.set(CX,1.0,0);o.gs=2.6+5*Math.min(ia,0.6);o.ga=Math.exp(-ia*7)*0.85+0.12*cenv;o.li=15*Math.exp(-ia*3.5)+3*cenv;}
    o.ia=ia;o.c.set(CX,0.8,0);o.shake=1.6;o.dist=1.3;
  };
}};

VFX.module("Sapidae · Lunalogista",[bramble,spores,berry,seedA,cloak,bloomA]);
})();

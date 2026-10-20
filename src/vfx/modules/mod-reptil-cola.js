// =====================================================================
// MÓDULO · CLASE REPTIL (COLA)
// Estética de clase: veneno púrpura, escamas, hierba esmeralda, sombras de cobra y fuerza tectónica del desierto.
// No se dibujan colas: todo nace de la posición de la cola del lanzador (≈ −4.15, 0.7, 0) como energía, criaturas
// invocadas (serpientes, cobra) u objetos (el jarrón).
// Gila es de 3 PA (nivel 3: temblor, fractura de baldosas); el resto, de 2 PA (nivel 2: sin fractura ni temblor).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,BUBBLE_FS,camera,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TAIL=V3(-4.15,0.7,0);                                // cola del lanzador
const TC=V3(3.15,1.2,0);                                   // pecho del rival
const AP=ALLY_POS[0];
const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const NBD=Object.assign({},NB,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const allyGlow=(i,k,col)=>{const m=allies[i].userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}`;
const VOR3=`vec2 vor3(vec3 p){vec3 i=floor(p),fp=fract(p);float d1=8.,d2=8.;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(float(x),float(y),float(z));
  vec3 o=vec3(hash(i+g),hash(i+g+17.3),hash(i+g+41.7));float d=length(g+o-fp);
  if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return vec2(d1,d2);}`;
// gota (mezcla normal); col = color GLSL
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.34,.28,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,.0)));
 gl_FragColor=vec4(${col}*(.7+.45*vMix)*(1.15-d*1.2)+vec3(1.)*hl*.6,a);}`;
// brizna de hierba que gira (mezcla normal); vMix = ángulo
const BLADE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=.07*(1.-smoothstep(-.45,.47,q.x))+.003;float a=smoothstep(w,w*.3,abs(q.y))*step(abs(q.x),.47)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.08,.4,.14),vec3(.5,.85,.3),.5+q.x)+uC1*.15,a);}`;
// chevrón hacia abajo (debilidad), apagado
const DOWN_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=abs(q.y-.12+abs(q.x)*.9);
 float a=smoothstep(.09,.04,d)*step(abs(q.x),.38)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,vec3(.55,.6,.55),.45)*1.2,a);}`;
// escamas imbricadas (devuelve borde de escama) en coordenadas de celda
const SCALE=`float scaleEdge(vec2 q){float r=floor(q.y);q.x+=.5*mod(r,2.);vec2 c=vec2(fract(q.x)-.5,fract(q.y));return length(c*vec2(1.,1.3));}`;

// =====================================================================
// 1 · GILA (3 PA) — un saco de veneno abalorado se hincha en la cola, azota el suelo detrás del lanzador y desata
//     una onda en cruz que corre por las líneas de la cuadrícula; al alcanzar a cada rival envenenado estalla en
//     un géiser tóxico con su propia cruz (el principal agrieta las baldosas)
// =====================================================================
const gila={key:"rtGila",name:"Gila",pa:3,dur:3.2,ti:1.667,pal:"Miasma",enemies:2,
  phases:[["Hinchazón",0],["Azote",0.72],["Onda en cruz",0.98],["Erupción",1.48],["Veneno",2.15],["Disipación",2.7]],
build(a){
  const L=a.L,TW=0.72,TS=0.98,V=12,SP=V3(-4.85,0,0),END=3.2,R=11.6;
  const EP=[V3(3.4,0,0),ENEMY_POS[0].clone(),ENEMY_POS[1].clone()];
  const tx=x=>TS+(x-SP.x)/V, TE=EP.map(e=>tx(e.x)+Math.abs(e.z)/V), TI=TE[0];
  const whipPts=[TAIL.clone(),V3(-4.5,1.55,0.1),V3(-5.0,1.85,0.12),V3(-5.3,1.05,0.06),V3(SP.x,0.08,0)];
  const whip=new THREE.CatmullRomCurve3(whipPts);
  // saco de veneno: cuentas de escama (Voronoi) que laten; uP = hinchazón
  const sac=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(VOR3+`
  void main(){vec3 n=normalize(vP);vec2 v=vor3(n*5.5);float bead=smoothstep(.55,.15,v.x);float gap=smoothstep(.06,0.,v.y-v.x);
   float h=hash(floor(n*5.5+.5));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float boil=noise(n*4.+vec3(0.,uT*3.,0.));
   vec3 c=mix(uC2,uC1,bead*(.5+.5*h))*(.5+.9*bead)+vec3(1.,.6,.9)*bead*bead*.25*uP;
   gl_FragColor=vec4(c*1.3+uC2*fr,(bead*.75+fr*.6+boil*.15)*(1.-gap*.6)*uA);}`));
  L.mesh.add(sac);
  // trazo del azote: ventana luminosa que recorre la curva
  const lash=new THREE.Mesh(new THREE.TubeGeometry(whip,70,0.11,8,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.55)discard;float n=noise(vec3(u*20.-uT*12.,vUv.y*6.,0.));
   float al=exp(-d*5.)*(.4+.6*n);gl_FragColor=vec4(mix(uC2,uC1,exp(-d*9.))*1.6+vec3(1.)*exp(-d*25.)*.5,al*uA);}`));
  L.trail.add(lash);
  // onda en cruz principal (centrada en el azote): brazo +x largo hacia los rivales, los demás cortos
  const CROSS=(LX,LS)=>`void main(){vec2 p=vP.xz;float ax=abs(p.y),az=abs(p.x);float fr=uP*${f(LX)};
   float lx=p.x>0.?fr:min(fr,${f(LS)});float lz=min(fr,${f(LS)});
   float wx=.5-.18*clamp(abs(p.x)/${f(LX)},0.,1.);
   float mX=smoothstep(wx,wx*.25,ax)*step(abs(p.x),lx)*(p.x>0.?1.:smoothstep(${f(LS)},${f(LS*0.6)},abs(p.x)));
   float mZ=smoothstep(.45,.12,az)*step(ax,lz)*smoothstep(${f(LS)},${f(LS*0.6)},ax);
   float fX=exp(-max(lx-abs(p.x),0.)*2.2);float fZ=exp(-max(lz-ax,0.)*2.2);
   float n=noise(vec3(p*2.2,uT*2.));float bub=smoothstep(.72,.86,noise(vec3(p*6.,uT*3.)));
   float m=max(mX*(.3+.7*fX),mZ*(.3+.7*fZ))*(.55+.45*n+bub*.8);
   float core=max(mX*smoothstep(wx*.35,0.,ax),mZ*smoothstep(.15,0.,az));
   gl_FragColor=vec4(mix(uC2,uC1,core+bub*.5+max(fX*mX,fZ*mZ)*.5)*1.6,(m+core*.5)*uA);}`;
  const main=new THREE.Mesh(new THREE.PlaneGeometry(2*R+1,2*R+1).rotateX(-Math.PI/2),fx(CROSS(R,3.0)));
  main.position.set(SP.x,0.022,0); L.decal.add(main);
  // ramales desde el brazo principal hasta cada rival fuera del eje, y cruces propias bajo cada rival
  const branches=EP.slice(1).map(e=>{const len=Math.abs(e.z),sg=Math.sign(e.z);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,len).rotateX(-Math.PI/2),fx(`void main(){float s=(${f(sg)}*vP.z+${f(len/2)})/${f(len)};
     float v=abs(vP.x);float d=uP-s;if(d<0.)discard;float n=noise(vec3(vP.xz*2.5,uT*2.));
     float m=smoothstep(.4,.1,v)*(.3+.7*exp(-d*4.))*(.6+.4*n);gl_FragColor=vec4(mix(uC2,uC1,exp(-d*6.))*1.6,m*uA);}`));
    m.position.set(e.x,0.023,e.z/2); L.decal.add(m); return m;});
  const crosses=EP.map((e,i)=>{const s=i===0?7.5:4.8,m=new THREE.Mesh(new THREE.PlaneGeometry(s,s).rotateX(-Math.PI/2),fx(CROSS(s/2-0.3,s/2-0.3)));
    m.position.set(e.x,0.024,e.z); L.decal.add(m); return m;});
  // géiseres tóxicos: lenguas de veneno con burbujas que suben
  const GEY_FS=H=>`void main(){float h=vP.y/${f(H)};vec3 q=vec3(vP.x*2.4,vP.y*1.3-uT*5.,vP.z*2.4);
   float n=noise(q)*.55+noise(q*2.2+vec3(0.,-uT*3.,0.))*.3+noise(q*4.6)*.15;float fl=n-h*1.1+.45+.25*uP;
   float bub=band(noise(q*3.+7.),.5,.04);float al=smoothstep(0.,.22,fl);float hot=smoothstep(.25,.6,fl);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,hot)*1.5+vec3(1.)*bub*hot*.5,al*(.35+.65*fr)*uA);}`;
  const geysers=EP.map((e,i)=>{const H=i===0?3.6:2.6,r=i===0?0.75:0.5;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r*0.6,r,H,28,1,true).translate(0,H/2,0),fx(GEY_FS(H)));m.position.copy(e);L.mesh.add(m);return m;});
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(BURST_FS)); burst.position.set(SP.x,0.3,0); L.mesh.add(burst);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // fractura de baldosas bajo el rival principal (nivel 3) y anillo del azote
  const FS=6.5, frac=groundPlane(FS,3.4,0.026,fx(tileFractureFS(FS))), slamRing=groundPlane(4,SP.x,0.03,fx(RING_FS));
  L.decal.add(frac,slamRing);

  const C=`const float TW=${f(TW)};const float TS=${f(TS)};const vec3 TAIL=${v3(TAIL)};const vec3 SP=${v3(SP)};
   const float T0=${f(TE[0])};const float T1=${f(TE[1])};const float T2=${f(TE[2])};const float END=${f(END)};
   vec3 ep(float i){return i<.5?${v3(EP[0])}:(i<1.5?${v3(EP[1])}:${v3(EP[2])});}
   float et(float i){return i<.5?T0:(i<1.5?T1:T2);}`;
  // rivales envenenados: burbujas púrpuras que gotean de cada uno durante todo el efecto
  a.count+=points(L.part,72,C+`void main(){float i=floor(aSeed.x*2.999);float life=.8+aSeed.y*.4;float k=uT/life+fract(aSeed.x*3.);float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=ep(i)+vec3(cos(an)*.42,.35+r.y*1.3-age*.5,sin(an)*.42);
   vA=sin(age*3.14159)*(.6+.4*step(et(i),uT))*(1.-smoothstep(END-.4,END,uT));put(p,.07+.06*r.z);}`,BUBBLE_FS);
  // hinchazón: gotas que caen del saco y vapor que sube
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*TW;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sw=.15+.3*clamp(s/TW,0.,1.);vec3 p=TAIL+rnd()*sw*.6+vec3(0.,-sw*.8-3.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*.5:0.;put(p,.06+.04*aSeed.w);}`,DROP_FS("mix(uC2,uC1,.35)"),NB);
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*TW;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=TAIL+rnd()*.3+vec3(0.,.4*t+.1,0.);vA=(age>0.&&age<1.)?sin(age*3.14159)*.8:0.;put(p,.06+.06*aSeed.w);}`,BUBBLE_FS);
  // azote: salpicadura de veneno, chispas y polvo
  a.count+=points(L.part,90,C+`void main(){float s=TS+aSeed.x*.06;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+2.2*aSeed.w),2.8+2.6*aSeed.y,sin(an)*(1.2+2.2*aSeed.w));
   vec3 p=SP+vec3(0.,.1,0.)+v*t+vec3(0.,-8.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.-age*.6:0.;put(p,.1+.06*aSeed.w);}`,DROP_FS("mix(uC2,uC1,.4)"),NB);
  a.count+=sparks(L.part,80,TS,`${f(SP.x)},.2,0.`,"0.,1.,0.",3,8,3);
  a.count+=points(L.part,45,C+`void main(){float s=TS+aSeed.x*.1;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=SP+vec3(cos(an),0.,sin(an))*(.3+1.4*(1.-exp(-t*3.)))*(.5+aSeed.w)+vec3(0.,.1+.5*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.35+.3*aSeed.y)*(.6+age*.8));}`,DUST_FS,NB);
  // burbujas que hierven a lo largo del brazo de la onda
  a.count+=points(L.part,110,C+`void main(){float x=SP.x+aSeed.x*${f(R)};float s=TS+(x-SP.x)/${f(V)};float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(x+rnd().x*.2,.05+t*.6,rnd().z*.35);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.06+.07*aSeed.w);}`,BUBBLE_FS);
  // erupciones: gotas de veneno que llueven, burbujas y chispas (más densas en el rival principal)
  a.count+=points(L.part,240,C+`void main(){float i=aSeed.x<.55?0.:(aSeed.x<.78?1.:2.);float big=i<.5?1.:.65;float s=et(i)+aSeed.y*.08;
   float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.6+1.6*aSeed.w),(3.+3.5*aSeed.y)*big,sin(an)*(.6+1.6*aSeed.w))*big;
   vec3 p=ep(i)+vec3(cos(an)*.3,.3,sin(an)*.3)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*.5:0.;put(p,(.1+.07*aSeed.w)*big);}`,DROP_FS("mix(uC2,uC1,.4)"),NB);
  a.count+=points(L.part,90,C+`void main(){float i=aSeed.x<.5?0.:(aSeed.x<.75?1.:2.);float s=et(i)+aSeed.y*.25;
   float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=ep(i)+vec3(rnd().x*.6,.2+t*(1.4+aSeed.z),rnd().z*.6);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.1*aSeed.w);}`,BUBBLE_FS);
  a.count+=sparks(L.part,110,TE[0],`3.4,.5,0.`,"0.,1.5,0.",3,9,3);
  a.count+=sparks(L.part,45,TE[1],`${f(EP[1].x)},.4,${f(EP[1].z)}`,"0.,1.4,0.",2,6,2.5);
  a.count+=sparks(L.part,45,TE[2],`${f(EP[2].x)},.4,${f(EP[2].z)}`,"0.,1.4,0.",2,6,2.5);
  // esquirlas de baldosa en el impacto principal
  a.count+=points(L.part,50,C+`void main(){float s=T0;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+2.5*aSeed.w),2.5+2.5*aSeed.y,sin(an)*(1.+2.5*aSeed.w));
   vec3 p=vec3(3.4,.05,0.)+vec3(cos(an),0.,sin(an))*.6+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.11+.08*aSeed.w);}`,CHIP_FS);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, sw=ss(0,TW,te), wk=cl((te-TW)/(TS-TW)), is=te-TS;
    // el lanzador se agazapa mientras se hincha el saco y latiguea con el azote
    caster.rotation.z=-0.12*sw+0.32*ss(TW,TW+0.1,te)-0.24*ss(TS-0.05,TS+0.15,te)+0.04*ss(TS+0.15,TS+0.6,te);
    caster.scale.set(1+0.04*sw*(1-ss(TW,TS,te)),1-0.06*sw*(1-ss(TW,TS,te)),1);
    const throb=0.06*Math.sin(te*(9+22*te))*sw;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*sw*(1-ss(TS,TS+0.3,te))+0.25*Math.max(throb,0)*4;
    // saco: se hincha en la cola, recorre la curva del azote y revienta contra el suelo
    if(te<TW){sac.position.copy(TAIL);}else{whip.getPointAt(Math.min(wk*wk,1),sp);sac.position.copy(sp);}
    const sz=(0.12+0.3*sw+throb)*(te<TS?1:0); sac.visible=te<TS;
    sac.scale.set(sz*(1+0.25*wk),sz*(1-0.15*wk),sz); set(sac,sw,ss(0,0.15,te));
    lash.visible=te>TW&&te<TS+0.3; set(lash,wk*wk*1.25,1-ss(TS,TS+0.3,te));
    let p=cl(is/0.4); burst.visible=is>=0&&p<1; burst.scale.setScalar(0.4+1.4*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(is/0.5); set(slamRing,1-Math.pow(1-p,2),is>=0?1-p:0);
    // onda en cruz y ramales
    const fade=1-ss(END-0.7,END,te);
    set(main,cl(is*V/R),is>=0?fade*(0.8+0.2*Math.sin(te*12)):0);
    branches.forEach((b,i)=>{const e=EP[i+1],t0=tx(e.x);set(b,cl((te-t0)*V/Math.abs(e.z)),te>=t0?fade:0);});
    crosses.forEach((c,i)=>{const ie=te-TE[i];set(c,cl(ie/0.35),ie>=0?fade:0);});
    geysers.forEach((g,i)=>{const ie=te-TE[i],k=ie<0?0:Math.sin(Math.PI*cl(ie/(i===0?0.9:0.7)));g.visible=k>0.01;
      g.scale.set(0.8+0.3*k,Math.max(k,0.001),0.8+0.3*k);set(g,k,k);});
    // reacción de cada rival envenenado
    const hit=hitK(ia,4);
    target.position.x=3.4+0.25*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.position.y=0.25*Math.sin(Math.PI*cl(ia/0.35))*(ia>=0?1:0);
    target.rotation.z=-hit*0.3*Math.cos(ia*14); target.scale.set(1+0.08*hit,1-0.1*hit,1+0.08*hit);
    for(let i=0;i<2;i++){const e=enemies[i],ie=te-TE[i+1],h=hitK(ie,5);e.position.y=0.18*Math.sin(Math.PI*cl(ie/0.3))*(ie>=0?1:0);
      e.rotation.z=0.2*h*Math.cos(ie*15)*(i?1:-1);const m=e.userData.m;m.emissive.copy(U.uC1.value);m.emissiveIntensity=0.15+0.9*h;}
    o.em=0.15+0.25*ss(TI,TI+0.3,te)*fade; o.emc.copy(U.uC1.value);
    p=cl(ia/0.35); towardCam(hitRing.position,TC,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+0.9,TI+1.5,te):0);
    if(te<TW){o.g.copy(TAIL);o.gs=0.6+1.2*sw;o.ga=0.2+0.3*sw;o.li=1+3*sw;}
    else if(te<TS){o.g.copy(sac.position);o.gs=1.6;o.ga=0.5;o.li=4;}
    else if(ia<0){o.g.set(Math.min(SP.x+is*V,3.4),0.4,0);o.gs=1.6+2*hitK(is,6);o.ga=0.35+0.45*hitK(is,8);o.li=3+8*hitK(is,5);}
    else{o.g.set(3.4,1.2,0);o.gs=2+5*Math.min(ia,0.6);o.ga=Math.exp(-ia*7)*0.9+0.1*fade;o.li=12*Math.exp(-ia*4)+1.5*fade;}
    o.ia=ia; o.c.set(3.4,0.9,0); o.shake=1.6; o.dist=1.3;
  };
}};

// =====================================================================
// 2 · GRASS SNAKE — una serpiente de hierba esmeralda con rombos púrpuras sale de la cola, serpentea por la
//     cuadrícula a toda velocidad y se enrosca en el rival; al apretar aparece el glifo del ojo maldito (Hex)
// =====================================================================
const snake={key:"rtGrassSnake",name:"Grass Snake",pa:2,dur:2.2,ti:1.08,pal:"Toxina",
  phases:[["Salida",0],["Serpenteo",0.15],["Enroscar",0.78],["Hex",1.08],["Disolución",1.65]],
build(a){
  const L=a.L,T0=0.12,TI=1.08,TQ=1.65,TE=2.05,X0=-4.3,X1=2.65,RAD=0.09,HR=0.56,TURN=1.55;
  const zf=x=>0.8*Math.sin((x-X0)/(X1-X0)*3*Math.PI);
  const pts=[TAIL.clone(),V3(-4.35,0.28,0.06)];
  for(let i=1;i<=24;i++){const x=X0+(X1-X0)*i/24;pts.push(V3(x,RAD,zf(x)));}
  const NG=pts.length;
  for(let i=1;i<=24;i++){const t=i/24,an=Math.PI+t*TURN*2*Math.PI;pts.push(V3(3.4+Math.cos(an)*HR,0.14+t*1.15,-Math.sin(an)*HR));}
  let len=0;const cum=[0];for(let i=1;i<pts.length;i++){len+=pts[i].distanceTo(pts[i-1]);cum.push(len);}
  const UG0=cum[2]/len, UG1=cum[NG-1]/len, LB=Math.min(4.1,len*0.32)/len;
  const curve=new THREE.CatmullRomCurve3(pts);
  const uHead=te=>{const k=cl((te-T0)/(TI-T0));return 1-Math.pow(1-k,1.5);};
  // cuerpo: tubo a lo largo de todo el recorrido; solo se ve la ventana [uP-uL, uP] y se afina en la cola
  const VS=`uniform float uP;uniform float uL;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;varying vec3 vON;
  void main(){vUv=uv;vON=normal;float s=clamp((uv.x-(uP-uL))/uL,0.,1.);
   float th=max(smoothstep(0.,.8,s)*(1.-.3*smoothstep(.92,1.,s)),.12);
   vec3 pos=position-normal*${f(RAD)}*(1.-th);vP=pos;vec4 mv=modelViewMatrix*vec4(pos,1.);
   vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  const SKIN=SCALE+`varying vec3 vON;uniform float uL;uniform float uQ;
  vec3 skin(vec2 q,float dorsal,float k){float e=scaleEdge(q);float sc=smoothstep(.62,.2,e);
   float dia=step(.5,fract(q.y*.09+abs(fract(q.x*.25)-.5)*.6))*dorsal;
   vec3 c=mix(vec3(.04,.3,.12),vec3(.18,.62,.24),sc*.7+.3*k);c=mix(c,uC2*.85,dia*.8);
   c=mix(c,vec3(.6,.75,.35),(1.-dorsal)*.45);return c*(.75+.25*sc);}`;
  const bodyMat=fxU(SKIN+`
  void main(){float s=(vUv.x-(uP-uL))/uL;if(s<0.||s>1.)discard;
   float dz=noise(vec3(vP*4.))-uQ*1.15+.05;if(dz<0.)discard;
   float dorsal=smoothstep(-.2,.5,vON.y);vec2 q=vec2(vUv.y*14.,vUv.x*${f(len*9)});
   vec3 c=skin(q,dorsal,noise(vP*3.));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+vec3(.8,1.,.7)*${SPEC(20)}*.3+uC1*(fr*.35+uA*.4*fr)+uC1*smoothstep(.08,0.,dz)*step(.001,uQ)*2.,1.);}`,
   {uL:{value:LB},uQ:{value:0}},Object.assign({},SOLID,{vertexShader:VS}));
  const body=new THREE.Mesh(new THREE.TubeGeometry(curve,320,RAD,10,false),bodyMat); L.mesh.add(body);
  // cabeza: elipsoide escamado con ojos violetas brillantes
  const headMat=fxU(SCALE+`uniform float uQ;
  void main(){vec3 n=normalize(vP);float dz=noise(vec3(vP*30.))-uQ*1.15+.05;if(dz<0.)discard;
   float e=scaleEdge(vec2(atan(n.z,n.y)*3.,n.x*6.));float sc=smoothstep(.62,.2,e);float dorsal=smoothstep(-.2,.4,n.y);
   vec3 c=mix(vec3(.04,.3,.12),vec3(.18,.62,.24),sc*.7);c=mix(c,vec3(.6,.75,.35),(1.-dorsal)*.45);
   float eye=smoothstep(.3,.18,length(vec2(n.x-.45,n.y-.35)*vec2(1.,1.3)))*step(.5,abs(n.z));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+uC1*fr*.3+uC2*eye*2.2+vec3(1.)*eye*.5,1.);}`,{uQ:{value:0}},SOLID);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.13,24,16),headMat); L.mesh.add(head);
  // glifo Hex: ojo maldito con anillo de runas, sobre el rival
  const hex=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float lens=max(length(p-vec2(0.,-.5))-.82,length(p-vec2(0.,.5))-.82);float eye=band(lens,0.,.035);
   float iris=band(r,.2,.03)*step(lens,0.);float pupil=smoothstep(.03,0.,abs(p.x)-.05*(1.-abs(p.y)/.22))*step(abs(p.y),.22);
   float an=atan(p.y,p.x)+uT*.7;float cell=floor(an/6.2832*18.);
   float runes=band(r,.82,.045)*step(.35,hash(vec3(cell,2.,3.)))*step(.25,fract(an/6.2832*18.));
   float ring=band(r,.93,.015)+band(r,.7,.012);float rev=step(fract(atan(p.x,-p.y)/6.2832+1.),uP);
   float m=(eye+iris+pupil)*smoothstep(.2,.6,uP)+(ring+runes)*rev;
   gl_FragColor=vec4(mix(uC2,uC1,pupil+iris*.5)*1.5+vec3(1.)*pupil*.4,m*uA);}`,{depthTest:false}));
  L.mesh.add(hex);
  // rastro de hierba aplastada que sigue el serpenteo y círculo de runas bajo el rival
  const trail=groundPlane(X1-X0,(X0+X1)/2,0.018,fx(`void main(){float u=vUv.x;float x=${f(X0)}+u*${f(X1-X0)};
   float z=-(vUv.y-.5)*2.;float zc=.8*sin(u*${f(3*Math.PI)});float d=abs(z-zc);
   float n=noise(vec3(u*40.,vUv.y*20.,1.));float m=smoothstep(.22,.05,d)*(.5+.5*n)*step(u,uP);
   float head=exp(-max(uP-u,0.)*8.);
   gl_FragColor=vec4(mix(vec3(.1,.45,.15),uC1,head*.6)*1.2,m*(.25+.6*head)*uA);}`),2.0);
  const rune=groundPlane(2.6,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*.4;
   float m=band(r,.9,.015)+band(r,.75,.01)+band(r,.82,.03)*step(.5,fract(an/6.2832*20.))*step(.3,hash(vec3(floor(an/6.2832*20.),5.,1.)));
   float sp=band(r,.45+.08*sin(an*3.),.02);m=(m+sp)*step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,.4+.4*r)*1.3,m*uA);}`));
  const squeeze=groundPlane(2.8,3.4,0.03,fx(RING_FS));
  L.decal.add(trail,rune,squeeze);

  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const float TQ=${f(TQ)};const float UG0=${f(UG0)};const float UG1=${f(UG1)};
  float zf(float x){return .8*sin((x-(${f(X0)}))/${f(X1-X0)}*${f(3*Math.PI)});}
  float tAt(float u){float k=1.-pow(1.-clamp(u,0.,1.),1./1.5);return T0+k*(TI-T0);}`;
  // briznas de hierba que saltan al paso de la serpiente
  a.count+=points(L.part,130,C+`void main(){float x=${f(X0)}+aSeed.x*${f(X1-X0)};float s=tAt(mix(UG0,UG1,aSeed.x));
   float life=.5+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(x,.05,zf(x))+vec3(r.x*.8,1.6+r.y,r.z*.8)*(1.-exp(-t*4.))/4.*1.4+vec3(0.,-1.2*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.16+.07*aSeed.w);vMix=aSeed.w+t*(1.+aSeed.z)*sign(r.y);}`,BLADE_FS,NB);
  // motas venenosas que deja el cuerpo
  a.count+=points(L.part,90,C+`void main(){float x=${f(X0)}+aSeed.x*${f(X1-X0)};float s=tAt(mix(UG0,UG1,aSeed.x))+.05;
   float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(x,.1,zf(x))+rnd()*.12+vec3(0.,.5*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.w);}`);
  // al apretar: chispas y destellos alrededor del rival; Hex: motas que giran hacia el glifo
  a.count+=sparks(L.part,70,TI,`3.4,.9,0.`,"0.,.4,.3",2,5,1.6);
  a.count+=points(L.part,60,C+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TI-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rad=(.75-.5*age);vec3 p=vec3(3.4+cos(an)*rad,.4+age*1.9+r.y*.2,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.035+.03*r.z);}`);
  // disolución en briznas
  a.count+=points(L.part,70,C+`void main(){float s=TQ+aSeed.x*.3;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float y=.14+aSeed.z*1.15;float an=3.14159+(aSeed.z)*${f(TURN*6.2832)};vec3 p=vec3(3.4+cos(an)*${f(HR)},y,-sin(an)*${f(HR)})+rnd()*.1+vec3(rnd().x*.6*t,.3*t-.8*t*t,rnd().z*.6*t);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.14+.06*aSeed.w);vMix=aSeed.w+t*2.;}`,BLADE_FS,NB);

  const hp=V3(0,0,0), hd=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, uH=uHead(te), q=ss(TQ,TE,te);
    caster.rotation.z=-0.08*ss(0,T0,te)+0.08*ss(T0,0.4,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.1,te)*(1-ss(0.2,0.5,te));
    body.visible=te>=T0&&q<0.999; bodyMat.uniforms.uP.value=uH; bodyMat.uniforms.uA.value=hitK(ia,4)*(ia>=0?1:0)+0.15; bodyMat.uniforms.uQ.value=q;
    curve.getPointAt(cl(uH,0.0005,1),hp); curve.getTangentAt(cl(uH,0.0005,1),hd);
    head.visible=te>=T0&&q<0.999&&uH>0.003; head.position.copy(hp).addScaledVector(hd,0.08); head.quaternion.setFromUnitVectors(XA,hd);
    head.scale.set(1.55,0.8,1.0); headMat.uniforms.uQ.value=q;
    // el rival: tiembla al recibir el abrazo y queda comprimido
    const sq=ss(TI-0.08,TI+0.1,te)*(1-ss(TQ,TE,te)), hit=hitK(ia,6);
    target.scale.set(1-0.07*sq,1+0.03*sq,1-0.07*sq); target.rotation.z=0.06*hit*Math.sin(ia*40);
    o.em=0.3*sq; o.emc.copy(U.uC2.value);
    const hx=ss(TI+0.02,TI+0.4,te), hfade=1-ss(TQ+0.15,2.15,te);
    hex.visible=te>TI&&hfade>0.001; towardCam(hex.position,tmp.set(3.4,2.35+0.05*Math.sin(te*4),0),0.3); billboard(hex);
    hex.scale.setScalar(0.8+0.25*hx+0.15*hitK(te-TI-0.05,6)*(te>TI+0.05?1:0)); set(hex,hx,hfade*(0.8+0.2*Math.sin(te*10)));
    U.uE.value=sq;
    set(trail,cl((uH-UG0)/(UG1-UG0)),0.85*ss(T0,T0+0.1,te)*(1-ss(1.3,1.9,te)));
    set(rune,ss(TI-0.1,TI+0.35,te),0.8*ss(TI-0.2,TI,te)*hfade);
    const p=cl(ia/0.45); set(squeeze,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    if(te<TI){o.g.copy(hp).y+=0.15;o.gs=0.7;o.ga=0.3*ss(T0,T0+0.1,te);o.li=1.8;}
    else{o.g.set(3.4,1.6,0);o.gs=1.5+1.5*Math.min(ia,0.4);o.ga=0.45*hitK(ia,7)+0.15*hfade;o.li=5*hitK(ia,5)+1.5*hfade;}
    o.ia=ia; o.c.set(3.35,1.0,0); o.shake=0; o.dist=0.6; o.flash=0.8;
  };
}};

// =====================================================================
// 3 · IGUANA — la energía se enrosca en la cola y sale como una media luna escamada que barre el suelo a la altura
//     de las piernas; se cierra en un anillo que las derriba y deja al rival debilitado (chevrones que caen, Weak)
// =====================================================================
const iguana={key:"rtIguana",name:"Iguana",pa:2,dur:1.9,ti:0.68,pal:"Jade",
  phases:[["Torsión",0],["Coletazo",0.32],["Barrido",0.68],["Debilidad",0.85],["Fin",1.6]],
build(a){
  const L=a.L,TW=0.32,TI=0.68,TK=0.85,TF=1.6,Y=0.27,X0=-4.25,X1=2.95;
  const cxAt=te=>te<TW?X0:X0+(X1-X0)*Math.pow(cl((te-TW)/(TI-TW)),1.7);
  // media luna escamada: borde de ataque brillante, escamas imbricadas, puntas que se deshilachan
  const cres=new THREE.Mesh(new THREE.RingGeometry(0.48,0.86,48,3,-1.15,2.3).rotateX(-Math.PI/2),fx(SCALE+`
  void main(){vec2 p=vec2(vP.x,-vP.z);float r=length(p);float an=atan(p.y,p.x);
   float e=scaleEdge(vec2(an*7.,(r-.48)*9.));float sc=band(e,.5,.08);
   float lead=smoothstep(.72,.86,r);float tip=smoothstep(1.15,.6,abs(an));
   float n=noise(vec3(an*6.,r*8.,uT*4.));
   gl_FragColor=vec4(mix(uC2,uC1,lead+sc*.4)*1.5+vec3(1.)*smoothstep(.8,.86,r)*.6,(lead*.9+sc*.5+.15+n*.2)*tip*uA);}`));
  const cresG=new THREE.Group(); cresG.add(cres); L.mesh.add(cresG);
  // anillo que se cierra sobre las piernas
  const shackle=new THREE.Mesh(new THREE.CylinderGeometry(1,1,0.22,48,1,true),fx(SCALE+`
  void main(){float an=atan(vP.z,vP.x);float e=scaleEdge(vec2(an*6.,vP.y*20.+.5));float sc=band(e,.5,.09);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float edge=band(abs(vP.y),.1,.02);
   gl_FragColor=vec4(mix(uC2,uC1,sc+edge)*1.5,(.25+sc*.6+edge+fr*.3)*uA);}`));
  shackle.position.set(3.4,Y,0); L.mesh.add(shackle);
  // anillo de debilidad que desciende por el rival
  const sink=new THREE.Mesh(new THREE.RingGeometry(0.5,0.62,48).rotateX(-Math.PI/2),fx(`void main(){float an=atan(vP.z,vP.x);
   float dash=step(.35,fract(an/6.2832*14.-uT*.5));gl_FragColor=vec4(mix(uC2,vec3(.55,.6,.55),.4)*1.2,dash*uA);}`));
  sink.position.set(3.4,1.4,0); L.mesh.add(sink);
  // surco del barrido y marca de debilidad bajo el rival
  const scuff=groundPlane(X1-X0+0.6,(X0+X1)/2+0.3,0.018,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*30.,vUv.y*8.,2.));float m=smoothstep(.6+.3*n,.1,v)*step(u,uP)*smoothstep(0.,.08,u);
   float head=exp(-max(uP-u,0.)*6.);gl_FragColor=vec4(mix(uC2,uC1,head)*1.3,m*(.18+.5*head)*uA);}`),0.9);
  const weakMark=groundPlane(2.4,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float chev=band(fract(r*3.-uT*.9),.5,.08)*smoothstep(1.,.3,r);float m=band(r,.9*uP,.03)+chev*.5;
   gl_FragColor=vec4(mix(uC2,vec3(.5,.55,.5),.4)*1.2,m*uA);}`));
  const hitR=groundPlane(3.0,3.4,0.03,fx(RING_FS));
  L.decal.add(scuff,weakMark,hitR);

  const C=`const float TW=${f(TW)};const float TI=${f(TI)};const float TK=${f(TK)};const float TF=${f(TF)};const vec3 TAIL=${v3(TAIL)};
  float cx(float t){return ${f(X0)}+${f(X1-X0)}*pow(clamp((t-TW)/(TI-TW),0.,1.),1.7);}`;
  // torsión: destellos escamados que se enroscan sobre la cola
  a.count+=points(L.part,45,C+`void main(){float s=aSeed.x*(TW-.08);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*5.;float rd=mix(.7,.12,k*k);vec3 p=TAIL+vec3(cos(an)*rd,(aSeed.w-.5)*.4*(1.-k),sin(an)*rd);
   vA=(age>0.&&age<1.)?k:0.;put(p,.04+.03*aSeed.y);}`);
  // estela del barrido: polvo y chispas bajas
  a.count+=points(L.part,60,C+`void main(){float s=TW+aSeed.x*(TI-TW);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(cx(s)+.4,.06+.3*(1.-exp(-t*3.)),rnd().z*.5);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.16+.14*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,80,C+`void main(){float s=TW+aSeed.x*(TI-TW);float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=-1.1+aSeed.z*2.2;vec3 p=vec3(cx(s)+cos(an)*.86,${f(Y)},-sin(an)*.86)+vec3(-1.2*t,.4*t,rnd().z*.3*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.w);}`);
  // impacto en las piernas: polvo bajo y chispas en abanico horizontal
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.06,0.)+vec3(cos(an),0.,sin(an))*(.4+1.*(1.-exp(-t*4.)))+vec3(0.,.25*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.2+.18*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,80,TI,`3.1,${f(Y)},0.`,"0.,.15,0.",2.5,6.5,1.2);
  // debilidad: chevrones apagados que caen alrededor del rival
  a.count+=points(L.part,40,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TK)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.62,1.9-age*1.5,sin(an)*.62);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.22+.1*r.z);}`,DOWN_FS);
  a.count+=points(L.part,40,C+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TK)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(3.4+(r.x-.5)*.9,1.5-age*1.3,(r.z-.5)*.9);vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.03+.03*r.y);}`);

  a.pose=function(te,o){
    const ia=te-TI, x=cxAt(te), k=cl((te-TW)/(TI-TW));
    // torsión del lanzador: se carga hacia atrás y suelta el latigazo
    caster.rotation.z=0.2*ss(0,TW,te)-0.32*ss(TW,TW+0.12,te)+0.12*ss(TW+0.12,0.9,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,TW,te)*(1-ss(TW,TI,te));
    // media luna: gira desde detrás (π) hasta mirar al frente y barre el suelo hacia el rival
    cresG.visible=te>0.04&&te<TI+0.02; cresG.position.set(x,Y,0);
    cresG.rotation.y=te<TW?Math.PI*(1-ss(0.04,TW,te)):0.35*Math.sin(k*Math.PI*2)*(1-k);
    cresG.scale.setScalar(Math.max(0.45+0.25*ss(0,TW,te)+0.35*k,0.001)); set(cres,k,ss(0.04,0.15,te));
    // anillo: se cierra sobre las piernas y se desvanece
    const sh=ss(TI,TI+0.12,te); shackle.visible=te>=TI&&te<TK+0.35;
    shackle.scale.set(0.9-0.42*sh,1,0.9-0.42*sh); set(shackle,0,(1-ss(TK,TK+0.35,te))*(0.8+0.6*hitK(ia,8)));
    const sd=ss(TK-0.05,TK+0.5,te); sink.visible=te>TK-0.05&&te<TF+0.2; sink.position.y=1.5-1.45*sd; set(sink,0,0.8*(1-ss(TF-0.2,TF+0.2,te)));
    // rival: las piernas ceden, se tambalea y queda encorvado (debilidad)
    const hit=hitK(ia,5), weak=ss(TK,TK+0.3,te)*(1-ss(TF,1.9,te));
    target.rotation.z=ia>=0?0.32*hit*Math.sin(ia*12+0.4):0; target.position.y=-0.06*hit*(ia>=0?1:0);
    target.scale.set(1+0.03*weak,1-0.08*weak-0.06*hit,1+0.03*weak);
    o.em=0.22*weak; o.emc.setRGB(0.35,0.42,0.38);
    U.uE.value=weak;
    set(scuff,cl((x-X0)/(X1-X0+0.6)),ss(TW,TW+0.05,te)*(1-ss(1.0,1.5,te)));
    set(weakMark,ss(TK-0.1,TK+0.3,te),0.75*weak);
    const p=cl(ia/0.4); set(hitR,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    if(te<TW){o.g.copy(TAIL);o.gs=0.6+0.6*ss(0,TW,te);o.ga=0.3;o.li=1.6;}
    else if(ia<0){o.g.set(x+0.6,Y+0.1,0);o.gs=1.0;o.ga=0.4;o.li=3;}
    else{o.g.set(3.3,0.35,0);o.gs=1.4+1.4*Math.min(ia,0.4);o.ga=0.6*hitK(ia,8)+0.06*weak;o.li=6*hitK(ia,5)+0.6*weak;}
    o.ia=ia; o.c.set(3.35,0.4,0); o.shake=0; o.dist=0.7; o.flash=0.9;
  };
}};

// =====================================================================
// 4 · SNAKE JAR — un jarrón de serpiente aparece junto a la cola, vuela hasta el aliado y se agrieta; al romperse
//     libera una cobra de sombras que se alza, abre la capucha sobre el aliado y se funde en un velo que absorberá
//     el próximo golpe; queda una serpiente enroscada de luz a sus pies
// =====================================================================
const jar={key:"rtSnakeJar",name:"Snake Jar",pa:2,dur:2.3,ti:0.92,pal:"Psicodelia",allies:1,
  phases:[["Jarrón",0],["Lanzamiento",0.28],["Grietas",0.7],["Rotura",0.92],["Cobra",1.0],["Velo",1.5],["Guardia",1.9]],
build(a){
  const L=a.L,TL=0.28,TLD=0.7,TI=0.92,TC=1.0,TG=1.45,TV=1.5,TW=1.9,END=2.3;
  const J0=V3(-4.45,0.55,0.25), JL=V3(AP.x+0.6,0,AP.z+0.5), CP=V3(AP.x+0.42,0,AP.z+0.32), CG=V3(AP.x-0.05,0,AP.z-0.3);
  // jarrón: ocho fragmentos de torno que forman la pieza entera y vuelan al romperse
  const prof=[[0.001,0],[0.15,0.01],[0.24,0.08],[0.29,0.2],[0.28,0.33],[0.21,0.45],[0.12,0.52],[0.1,0.6],[0.15,0.64],[0.14,0.68],[0.1,0.68]].map(p=>new THREE.Vector2(p[0],p[1]));
  const jarMat=fxU(`uniform float uQ;
  void main(){float y=vP.y;float an=atan(vP.x,vP.z);
   vec3 glaze=mix(vec3(.06,.03,.12),vec3(.2,.11,.34),smoothstep(0.,.6,y))*(gl_FrontFacing?1.:.4);
   float serp=band(y-.3-.06*sin(an*3.+y*4.),0.,.022);float bands=band(y,.12,.012)+band(y,.48,.012);
   float cr=pow(1.-abs(noise(vP*11.)*2.-1.),16.)*uQ;
   vec3 c=glaze*${LIT}+vec3(.9,.8,1.)*${SPEC(24)}*.5+uC1*(serp*.9+bands*.6)*(.4+uA)+uC1*cr*3.;
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:0}},DS);
  const jarG=new THREE.Group(); L.mesh.add(jarG);
  const shards=[...Array(8)].map((_,k)=>{const m=new THREE.Mesh(new THREE.LatheGeometry(prof,6,k*Math.PI/4,Math.PI/4),jarMat);
    const mid=k*Math.PI/4+Math.PI/8;m.userData={d:V3(Math.sin(mid),0,Math.cos(mid)),s:(k%2?1:-1)*(2+k*0.4),v:2+0.4*(k%3)};jarG.add(m);return m;});
  // círculo de runas donde se invoca el jarrón
  const sumRing=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uT*2.;
   float m=band(r,.85,.03)+band(r,.7,.02)*step(.5,fract(an/6.2832*12.))+band(r,.55*uP,.05);
   gl_FragColor=vec4(mix(uC2,uC1,.5)*1.5,m*uA);}`,{depthTest:false})); L.mesh.add(sumRing);
  // cobra de sombras (SDF): cuerpo en S, capucha con anteojos, ojos; capa oscura (normal) + borde luminoso (aditivo)
  const COBRA=SDF2+`float sdCobra(vec2 p,float t,float fl,out vec2 hc){
   float d=abs(length((p-vec2(0.,.1))/vec2(.55,.13))-1.)*.12-.045;vec2 q0=vec2(0.,.12);
   for(int i=0;i<7;i++){float y1=.12+float(i+1)*.19;float am=.15*(1.-y1*.4);vec2 q1=vec2(am*sin(y1*4.+t*2.4),y1);
    d=min(d,sdSeg(p,q0,q1)-(.12-.009*float(i)));q0=q1;}
   hc=vec2(q0.x*.7,1.62);vec2 hp=(p-hc)/vec2(.12+.32*fl,.46);d=smin(d,(length(hp)-1.)*.35,.07);
   vec2 hd=(p-vec2(hc.x,2.06))/vec2(.16,.12);d=smin(d,(length(hd)-1.)*.12,.05);return d;}`;
  const cg=new THREE.PlaneGeometry(1.8,2.5).translate(0,1.2,0);
  const cobraDark=new THREE.Mesh(cg,fxU(COBRA+`uniform float uF;
  void main(){vec2 p=(vUv-vec2(.5,0.))*vec2(1.8,2.5)-vec2(0.,.05);vec2 hc;float d=sdCobra(p,uT,uF,hc);
   if(p.y>uP*2.4)discard;float n=noise(vec3(p*5.,uT*2.));
   gl_FragColor=vec4(vec3(.03,.01,.06)+uC2*.08*n,smoothstep(.03,-.03,d+(n-.5)*.03)*.85*uA);}`,{uF:{value:0}},NB));
  const cobraGlow=new THREE.Mesh(cg,fxU(COBRA+`uniform float uF;
  void main(){vec2 p=(vUv-vec2(.5,0.))*vec2(1.8,2.5)-vec2(0.,.05);vec2 hc;float d=sdCobra(p,uT,uF,hc);
   float cut=smoothstep(uP*2.4,uP*2.4-.08,p.y);float rim=band(d,0.,.022);
   vec2 h=p-hc;float spec=(band(length(h-vec2(.13,.05)),.07,.018)+band(length(h-vec2(-.13,.05)),.07,.018))*step(d,0.)*uF;
   float scl=band(fract(p.y*14.+abs(p.x)*4.),.5,.1)*smoothstep(0.,-.05,d)*.18;
   float eye=smoothstep(.035,0.,length((p-vec2(hc.x+.06,2.08))*vec2(1.,1.6)))+smoothstep(.035,0.,length((p-vec2(hc.x-.06,2.08))*vec2(1.,1.6)));
   float wisp=smoothstep(.15,0.,d)*step(0.,d)*noise(vec3(p*7.,uT*3.))*.6;
   gl_FragColor=vec4(mix(uC2,uC1,rim*.5+eye+spec)*1.6+vec3(1.)*eye*.6,(rim+spec+scl+eye*2.+wisp)*cut*uA);}`,{uF:{value:0}}));
  cobraGlow.renderOrder=2; cobraDark.renderOrder=1; L.mesh.add(cobraDark,cobraGlow);
  // velo de sombra alrededor del aliado (listo para tragarse el próximo golpe)
  const veil=new THREE.Mesh(new THREE.SphereGeometry(0.95,40,26),fx(`void main(){vec3 n=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   float w=noise(vec3(atan(n.z,n.x)*3.,n.y*4.-uT*1.5,uT*.5));float s=smoothstep(.45,.8,w);
   float scl=band(fract(atan(n.z,n.x)/6.2832*16.+n.y*2.),.5,.06)*.3;
   gl_FragColor=vec4(mix(uC2,uC1,fr*.6+s*.3)*1.3,(fr*.7+s*.35+scl*fr)*uA);}`));
  veil.position.set(AP.x,0.75,AP.z); L.mesh.add(veil);
  // serpiente enroscada de luz bajo el aliado y anillo de rotura
  const coil=groundPlane(2.6,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float u=fract(an/6.2832+1.);float sr=.42+.4*u;float body=band(r,sr,.035*(.3+.7*u))*step(u,uP);
   float sr2=sr+.4;float body2=band(r,sr2,.03)*step(u+1.,uP*2.)*step(sr2,.95);
   float head=smoothstep(.07,0.,length(p*2.-vec2(cos(uP*6.2832),sin(uP*6.2832))*.82));
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*u)*1.4,(body+body2+head*step(.99,uP))*uA);}`)); coil.position.z=AP.z;
  const breakRing=groundPlane(2.6,JL.x,0.03,fx(RING_FS)); breakRing.position.z=JL.z;
  L.decal.add(coil,breakRing);

  const C=`const float TL=${f(TL)};const float TLD=${f(TLD)};const float TI=${f(TI)};const float TC=${f(TC)};const float TV=${f(TV)};const float TW=${f(TW)};
  const vec3 J0=${v3(J0)};const vec3 JL=${v3(JL)};const vec3 AP=${v3(AP)};
  vec3 arc(float k){return mix(J0,JL+vec3(0.,.02,0.),k)+vec3(0.,4.*1.4*k*(1.-k),0.);}`;
  // invocación: humo violeta en espiral alrededor del jarrón
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*TL;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*5.;vec3 p=J0+vec3(cos(an)*mix(.55,.15,k),.35+(aSeed.w-.5)*.5,sin(an)*mix(.55,.15,k));
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.04+.03*aSeed.y);}`);
  // estela del vuelo
  a.count+=points(L.part,60,C+`void main(){float k=aSeed.x;float s=TL+k*(TLD-TL);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=arc(k)+vec3(0.,.35,0.)+rnd()*.1+vec3(0.,.2*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.035*aSeed.w);}`);
  // rotura: humo de sombra que revienta, polvo de cerámica y chispas
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.1;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.8,0.));vec3 p=JL+vec3(0.,.35,0.)+d*(.2+.8*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.6*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.35+.3*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.09,.04,.15)"),NB);
  a.count+=points(L.part,45,C+`void main(){float s=TI;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.5+2.*aSeed.z);vec3 p=JL+vec3(0.,.35,0.)+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.05*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,60,TI,`${f(JL.x)},.4,${f(JL.z)}`,"0.,1.,0.",2,5.5,2);
  // la cobra se funde en el velo: jirones que vuelan de la cobra al aliado
  a.count+=points(L.part,70,C+`void main(){float s=TV-.05+aSeed.x*.35;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p0=${v3(CG)}+vec3(rnd().x*.4,1.+aSeed.z*1.1,.05);vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p1=AP+vec3(0.,.75,0.)+d*vec3(.95,1.1,.95);
   vec3 p=mix(p0,p1,k*k*(3.-2.*k));vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.05+.04*aSeed.w);}`);
  // guardia: motas que orbitan el velo
  a.count+=points(L.part,40,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TW)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;vec3 p=AP+vec3(cos(an)*1.,.15+age*1.6,sin(an)*1.);vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.035+.03*r.z);}`);

  const jp=V3(0,0,0), cp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, fl=cl((te-TL)/(TLD-TL)), brk=te>=TI;
    caster.rotation.z=-0.1*ss(0,TL,te)+0.14*ss(TL,TL+0.12,te)-0.04*ss(TL+0.12,0.6,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.1,te)*(1-ss(TL,0.5,te));
    // jarrón: aparece, vuela en parábola girando, aterriza con bote y tiembla
    if(te<TL)jp.copy(J0); else{arcPt(J0,JL,1.4,fl,jp);}
    const land=te>=TLD?Math.exp(-(te-TLD)*10)*Math.abs(Math.sin((te-TLD)*22))*0.12:0;
    jarG.position.set(jp.x+(te>TLD+0.1&&!brk?0.012*Math.sin(te*90):0),jp.y+land,jp.z);
    jarG.rotation.z=te<TL?0:(te<TLD?-fl*Math.PI*2:0); const app=ss(0.02,0.22,te); jarG.scale.setScalar(Math.max(1.15*app,0.001));
    jarG.visible=te>0.02&&te<TI+0.6;
    jarMat.uniforms.uQ.value=ss(TLD,TI,te)*(brk?1-ss(TI,TI+0.4,te):1); jarMat.uniforms.uA.value=0.4+0.6*ss(TLD,TI,te);
    shards.forEach(s=>{const u=s.userData,t=brk?te-TI:0,k=1-ss(TI+0.35,TI+0.6,te);
      s.position.set(u.d.x*u.v*t,(2.2+u.v*0.4)*t-5*t*t,u.d.z*u.v*t); if(s.position.y+jp.y<0.02)s.position.y=0.02-jp.y;
      s.rotation.set(u.s*t*2,u.s*t,u.s*t*3); s.scale.setScalar(Math.max(brk?k:1,0.001));});
    const sr=ss(0,0.1,te)*(1-ss(TL-0.05,TL+0.1,te)); sumRing.visible=sr>0.01; towardCam(sumRing.position,tmp.set(J0.x,J0.y+0.35,J0.z),0.3); billboard(sumRing); set(sumRing,ss(0,TL,te),sr);
    // cobra: brota del humo, abre la capucha y se desliza tras el aliado; luego se funde en el velo
    const rise=ss(TC,TC+0.35,te), glide=ss(TG-0.1,TV+0.1,te), fade=1-ss(TV,TV+0.4,te);
    cp.lerpVectors(CP,CG,glide);
    for(const m of [cobraDark,cobraGlow]){m.visible=te>TC&&fade>0.001;m.position.copy(cp);billboard(m,0.06*Math.sin(te*3));
      m.scale.setScalar(0.85+0.2*glide);set(m,rise*1.05,fade);m.material.uniforms.uF.value=ss(TC+0.25,TC+0.5,te);}
    const vl=ss(TV,TV+0.3,te)*(1-ss(TW+0.2,END,te)); veil.visible=vl>0.01; veil.scale.set(1,1.2,1); set(veil,0,vl*(0.75+0.25*Math.sin(te*6)));
    U.uE.value=ss(TW-0.1,TW+0.1,te)*(1-ss(END-0.2,END,te));
    set(coil,ss(TV,TW+0.1,te),0.85*ss(TV,TV+0.2,te)*(1-ss(END-0.25,END,te)));
    const p=cl(ia/0.45); set(breakRing,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    allyGlow(0,0.3*vl+0.35*hitK(te-TV,5)*(te>=TV?1:0));
    if(te<TL){o.g.copy(J0).y+=0.35;o.gs=0.8*ss(0,0.15,te);o.ga=0.3;o.li=1.6;}
    else if(te<TI){o.g.copy(jp).y+=0.35;o.gs=0.8;o.ga=0.3+0.2*ss(TLD,TI,te);o.li=2+2*ss(TLD,TI,te);}
    else if(te<TV){o.g.set(cp.x,1.6,cp.z);o.gs=1.3+1.2*hitK(ia,5);o.ga=0.2+0.5*hitK(ia,7);o.li=1.6+5*hitK(ia,5);}
    else{o.g.set(AP.x,1.0,AP.z);o.gs=2;o.ga=0.12+0.15*vl;o.li=1.4+2*vl;}
    o.ia=ia; o.c.set(JL.x,0.6,JL.z); o.shake=0; o.dist=0.5; o.flash=0;
  };
}};

// =====================================================================
// 5 · TINY DINO — cuatro cargas retenidas se acumulan en la cola como púas de energía orbitando; se funden en una
//     media luna con púas (thagomizer) que sale en arco y cae en vertical sobre el rival con un golpe tectónico:
//     el suelo ondula en anillos y se levantan columnas de polvo (nivel 2: sin losas ni grietas)
// =====================================================================
const dino={key:"rtTinyDino",name:"Tiny Dino",pa:2,dur:2.2,ti:1.02,pal:"Ámbar",
  phases:[["Retener",0],["Alzada",0.55],["Golpe",0.75],["Impacto",1.02],["Asentamiento",1.35]],
build(a){
  const L=a.L,CT=[0.06,0.17,0.28,0.39],TA=0.55,TS=0.75,TI=1.02,END=2.2;
  const P0=V3(TAIL.x-0.1,TAIL.y+0.25,0), P1=V3(-0.2,5.0,0), P2=V3(3.4,2.25,0);
  // púa de energía (sprite en malla para poder girarla)
  const SPIKE_FS=`void main(){vec2 p=(vUv-.5)*2.;float w=.42*(1.-(p.y+1.)*.5);float m=smoothstep(.04,0.,abs(p.x)-w)*step(-1.,p.y)*step(p.y,.95);
   float edge=band(abs(p.x),w,.06)*m;float n=noise(vec3(p*4.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,edge+.3*n)*1.6+vec3(1.)*edge*.4,(m*.55+edge)*uA);}`;
  const studs=CT.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34),fx(SPIKE_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // media luna con cuatro púas: placas de piedra-escama (mezcla normal) y filo incandescente
  const club=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(SDF2+`
  float sdClub(vec2 p){float r=length(p);float an=atan(p.y,p.x);
   float d=max(abs(r-.58)-.13,(abs(an)-1.3)*r);
   for(int k=0;k<4;k++){float ak=-.9+float(k)*.6;vec2 dir=vec2(cos(ak),sin(ak));vec2 tg=vec2(-dir.y,dir.x);
    vec2 q=p-dir*.66;float u=dot(q,dir),v=dot(q,tg);float s=max(abs(v)-.12*(1.-u/.38),max(-u,u-.38));d=smin(d,s,.04);}
   return d;}
  void main(){vec2 p=(vUv-.5)*2.2;float d=sdClub(p);if(d>.08)discard;
   float r=length(p);float n=noise(vec3(p*6.,1.));vec2 q=p*9.;float row=floor(q.y);q.x+=.5*mod(row,2.);
   float plate=smoothstep(.5,.2,length(fract(q)-.5));
   vec3 stone=mix(vec3(.22,.12,.05),vec3(.55,.35,.16),plate*.6+n*.4)*(1.1-smoothstep(.4,.95,r)*.3);
   float edge=smoothstep(.06,0.,abs(d+.02));float heat=smoothstep(.75,1.,r)*step(d,0.);
   vec3 c=stone+uC1*(edge*2.2+heat*.9)*uP+uC2*edge*.8;
   float al=(smoothstep(.015,-.015,d)+edge*.6*smoothstep(.08,0.,d))*uA;
   gl_FragColor=vec4(c,al);}`,Object.assign({depthTest:false},NB)));
  club.renderOrder=2; L.mesh.add(club);
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),fx(RING_FS,{depthTest:false})); L.mesh.add(flash);
  // suelo: ondas tectónicas concéntricas (aditivo) con valles en sombra (normal), sin grietas
  const heave=groundPlane(6.4,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.*3.2;float f=uP*3.;
   float w=sin((r-f)*7.)*exp(-abs(r-f)*1.2)*step(r,f+.5);float n=noise(vec3(p*8.,2.));
   gl_FragColor=vec4(vec3(.05,.03,.02),max(-w,0.)*.55*smoothstep(3.2,1.5,r)*uA*(.7+.3*n));}`,NB));
  const crest=groundPlane(6.4,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.*3.2;float f=uP*3.;
   float w=sin((r-f)*7.)*exp(-abs(r-f)*1.2)*step(r,f+.5);float n=noise(vec3(p*8.,uT));
   gl_FragColor=vec4(mix(uC2,uC1,max(w,0.))*1.3,max(w,0.)*(.6+.4*n)*smoothstep(3.2,1.5,r)*uA);}`));
  const charge=groundPlane(1.6,TAIL.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=0.;for(int i=0;i<4;i++){float k=step(float(i)+.5,uP*4.);m+=band(r,.35+.15*float(i),.02)*k;}
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,m*uA);}`));
  const shock=groundPlane(4.2,3.4,0.03,fx(RING_FS));
  L.decal.add(heave,crest,charge,shock);

  const C=`const float TA=${f(TA)};const float TS=${f(TS)};const float TI=${f(TI)};const vec3 TAIL=${v3(TAIL)};
  const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};`+QB+`
  float ct(float i){return i<.5?${f(CT[0])}:(i<1.5?${f(CT[1])}:(i<2.5?${f(CT[2])}:${f(CT[3])}));}`;
  // cada carga retenida: un anillo de motas que se contrae sobre la cola
  a.count+=points(L.part,120,C+`void main(){float i=floor(aSeed.x*3.999);float s=ct(i);float life=.16;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832;vec3 p=TAIL+vec3(cos(an),(aSeed.z-.5)*.4,sin(an))*mix(.85,.12,k*k);
   vA=(age>0.&&age<1.)?k:0.;put(p,.035+.03*aSeed.w);}`);
  // golpe: estela de polvo dorado y chispas a lo largo del arco
  a.count+=points(L.part,80,C+`void main(){float k=aSeed.x;float s=TS+pow(k,1./1.6)*(TI-TS);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(P0,P1,P2,k)+rnd()*.25+vec3(0.,-.3*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`);
  // impacto tectónico: muro de polvo en anillo, columnas de polvo en los cuatro puntos cardinales, chispas
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.08;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,0.,0.)+vec3(cos(an),0.,sin(an))*(.6+2.2*(1.-exp(-t*2.5)))+vec3(0.,.12+(.4+.5*aSeed.w)*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age):0.;put(p,(.4+.35*aSeed.y)*(.6+age*.8));}`,DUST_FS,NB);
  a.count+=points(L.part,80,C+`void main(){float i=floor(aSeed.x*3.999);float an=i*1.5708+.785;vec3 b=vec3(3.4+cos(an)*1.25,0.,sin(an)*1.25);
   float s=TI+.05+aSeed.y*.15;float life=.8+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=b+rnd()*vec3(.18,0.,.18)+vec3(0.,(1.4+aSeed.w)*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.28+.2*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,100,TI,`3.4,1.8,0.`,"0.,.4,0.",3,7.5,3);

  const cp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, nc=CT.filter(t=>te>=t).length, k=cl((te-TS)/(TI-TS)), ke=Math.pow(k,1.6);
    // el lanzador acumula y se encabrita
    caster.rotation.z=0.03*nc*(1-ss(TA,TA+0.1,te))+0.26*ss(TA,TS,te)-0.4*ss(TS,TS+0.15,te)+0.14*ss(TS+0.15,1.5,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    let pk=0; for(const t of CT)if(te>=t)pk=Math.max(pk,Math.exp(-(te-t)*10));
    cm.emissiveIntensity=(0.08*nc+0.4*pk)*(1-ss(TS,TS+0.2,te));
    // púas orbitando: una por carga; en la alzada convergen en la media luna
    studs.forEach((s,i)=>{const on=te>=CT[i],m=ss(TA,TS,te),an=te*5+i*Math.PI/2,rd=0.55*(1-m);
      s.visible=on&&te<TS+0.02; tmp.set(TAIL.x+Math.cos(an)*rd,TAIL.y+0.25+0.25*m+Math.sin(an)*rd*0.45,Math.sin(an)*rd*0.6);
      s.position.copy(tmp); billboard(s,an); s.scale.setScalar(1+0.5*Math.exp(-(te-CT[i])*12)*(on?1:0)); set(s,0,1);});
    // media luna: se forma en la cola, sube en arco girando y cae con las púas hacia abajo
    if(te<TS)cp.copy(P0).y+=0.25*ss(TA,TS,te); else qb(P0,P1,P2,ke,cp);
    club.visible=te>TA-0.05&&ia<0.1; club.position.copy(cp);
    billboard(club,te<TS?Math.PI*0.5+2*ss(TA,TS,te):-Math.PI/2-(1-ke)*Math.PI*2.5);
    club.scale.setScalar(Math.max(0.5*ss(TA-0.05,TS,te)+0.9*ke,0.001)); set(club,0.5+0.5*k,1-ss(TI,TI+0.1,te));
    let p=cl(ia/0.35); towardCam(flash.position,tmp.set(3.4,1.4,0),0.4); billboard(flash); flash.visible=ia>=0&&p<1; set(flash,p,1-p);
    p=cl(ia/1.0); set(heave,p,ia>=0?1-ss(0.5,1.15,ia):0); set(crest,p,ia>=0?1-ss(0.5,1.15,ia):0);
    set(charge,nc/4,0.7*(1-ss(TA,TS,te))*ss(0.02,0.08,te));
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p):0);
    // el rival: aplastado y rebote
    const hit=hitK(ia,5); target.scale.set(1+0.16*hit,1-0.24*hit*Math.cos(ia*12),1+0.16*hit); target.rotation.z=-0.1*hit*Math.sin(ia*16);
    if(te<TA){o.g.copy(TAIL);o.gs=0.5+0.2*nc;o.ga=0.15+0.08*nc+0.25*pk;o.li=1+0.5*nc+2*pk;}
    else if(ia<0){o.g.copy(cp);o.gs=1.4;o.ga=0.45;o.li=3.5;}
    else{o.g.set(3.4,0.8,0);o.gs=2+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.8;o.li=8*Math.exp(-ia*4.5);}
    o.ia=ia; o.c.set(3.4,0.6,0); o.shake=0; o.dist=0.9; o.flash=1;
  };
}};

// =====================================================================
// 6 · WALL GECKO — el Axie sacrifica vida (gotas rojas que se hunden en el suelo) para sellar cuatro huellas de geco
//     alrededor de sus patas; filamentos adhesivos lo amarran a la baldosa, que se bloquea, y una funda de
//     tubérculos de geco lo envuelve reduciendo el daño
// =====================================================================
const gecko={key:"rtWallGecko",name:"Wall Gecko",pa:2,dur:2.0,ti:0.68,pal:"Menta",
  phases:[["Sacrificio",0],["Adhesión",0.32],["Anclaje",0.68],["Guardia",0.85],["Suelta",1.6]],
build(a){
  const L=a.L,TA=0.32,TI=0.68,TG=0.85,TR=1.6,END=2.0,CX=-3.7;
  const FEET=[[0.5,0.42],[0.5,-0.42],[-0.5,0.42],[-0.5,-0.42]];
  // huellas de geco: palma y cinco dedos con almohadillas laminadas; uP = revelado, uA = intensidad
  const pads=groundPlane(2.2,CX,0.02,fx(SDF2+`
  float foot(vec2 p,vec2 c,out float lam){vec2 dir=normalize(c);vec2 tg=vec2(-dir.y,dir.x);
   float d=length(p-c)-.09;lam=0.;
   for(int i=0;i<5;i++){float a=(float(i)-2.)*.42;vec2 td=dir*cos(a)+tg*sin(a);vec2 tip=c+td*.24;
    d=min(d,sdSeg(p,c+td*.05,tip)-.018);float pd=length(p-tip)-.048;d=min(d,pd);
    lam=max(lam,step(pd,0.)*band(fract(dot(p-tip,td)*45.),.5,.2));}
   return d;}
  void main(){vec2 p=(vUv-.5)*2.2;float m=0.,l=0.;
   ${FEET.map(([x,z])=>`{float lm;float d=foot(p,vec2(${f(x)},${f(-z)}),lm);m+=smoothstep(.015,-.01,d);l+=band(d,0.,.012)+lm*.6;}`).join("")}
   float rev=step(length(p),uP*1.6);
   gl_FragColor=vec4(mix(uC2,uC1,l+.3)*1.4+vec3(1.)*l*.3,(m*.55+l*.8)*rev*uA);}`));
  // baldosa bloqueada: contorno cuadrado con esquinas en escuadra, centrado en el lanzador
  const tile=groundPlane(1.9,CX,0.022,fx(`void main(){vec2 p=abs(vUv-.5)*2.;float e=max(p.x,p.y);
   float ol=band(e,.86,.02);float corner=step(.62,min(p.x,p.y))*band(e,.86,.05);float inner=band(e,.74,.008)*.5;
   float sweep=band(e,uP*.86,.05)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,corner+sweep)*1.4,(ol+corner+inner+sweep)*uA);}`));
  const lockRing=groundPlane(3.0,CX,0.03,fx(RING_FS));
  const bloodPool=groundPlane(1.4,CX,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*8.,1.));
   float m=smoothstep(1.,.4,r/max(uP,.01)+(n-.5)*.4);gl_FragColor=vec4(vec3(.35,.01,.03)*(.7+.5*n),m*.6*uA);}`,NB));
  L.decal.add(bloodPool,pads,tile,lockRing);
  // filamentos adhesivos: del cuerpo a cada huella, con pulsos que bajan
  const filMat=fx(`void main(){float h=vUv.y;float pulse=band(fract(h*3.+uT*4.),.5,.12);
   gl_FragColor=vec4(mix(uC2,uC1,pulse)*1.6,(.35+.65*pulse)*step(1.-uP*1.02,h)*uA);}`);
  const fils=FEET.map(([x,z])=>{const s=V3(CX+x*0.6,0.3,z*0.6),e=V3(CX+x,0.01,z),d=V3(e.x-s.x,e.y-s.y,e.z-s.z),l=d.length();
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.02,1,6,1,true).translate(0,0.5,0),filMat);
    m.position.copy(e); m.quaternion.setFromUnitVectors(YA,d.normalize().multiplyScalar(-1)); m.scale.set(1,l,1); L.trail.add(m); return m;});
  // funda de tubérculos de geco (proyección de energía alrededor del Axie)
  const sheath=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.56,1.95,48,1,true).translate(0,0.975,0),fxU(`uniform float uQ;
  void main(){float an=atan(vP.z,vP.x);vec2 p=vec2(an/6.2832*28.,vP.y*9.);vec2 rr=vec2(1.,1.732);vec2 h=rr*.5;
   vec2 ga=mod(p,rr)-h;vec2 gb=mod(p-h,rr)-h;vec2 g=dot(ga,ga)<dot(gb,gb)?ga:gb;vec2 id=p-g;
   float big=step(.82,hash(vec3(id,3.)));float tub=smoothstep(.36+.12*big,.2,length(g));float rim=band(length(g),.36+.12*big,.05);
   float dz=noise(vec3(vP*5.))-uQ*1.1+.05;if(dz<0.)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);float sweep=band(vP.y,1.95-uP*2.3,.12);
   float top=smoothstep(1.95,1.6,vP.y)*smoothstep(0.,.15,vP.y);
   gl_FragColor=vec4(mix(uC2,uC1,rim+big*tub*.5+sweep)*1.35+vec3(1.)*sweep*.3,(tub*.18+rim*.5+fr*.45+sweep*.9+smoothstep(.07,0.,dz)*step(.001,uQ))*top*uA);}`,{uQ:{value:0}}));
  sheath.position.set(CX,0,0); L.mesh.add(sheath);

  const C=`const float TA=${f(TA)};const float TI=${f(TI)};const float TG=${f(TG)};const float TR=${f(TR)};const float CX=${f(CX)};
  vec2 foot(float i){return i<.5?vec2(.5,.42):(i<1.5?vec2(.5,-.42):(i<2.5?vec2(-.5,.42):vec2(-.5,-.42)));}`;
  // sacrificio: gotas de vida (rojo fijo) que resbalan y se hunden a los pies
  a.count+=points(L.part,45,C+`void main(){float s=aSeed.x*(TA-.05);float life=.3+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832;float y0=.5+aSeed.w*1.1;vec3 p=vec3(CX+cos(an)*.43,mix(y0,.02,k*k),sin(an)*.43);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.07+.03*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
    float a=smoothstep(.34,.28,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,.0)));
    gl_FragColor=vec4(vec3(.62,.02,.06)*(1.15-d*1.2)+vec3(1.,.7,.7)*hl*.5,a);}`,NB);
  // microsetas: chispitas que bajan por los filamentos hasta las huellas
  a.count+=points(L.part,100,C+`void main(){float i=floor(aSeed.x*3.999);vec2 ft=foot(i);vec3 s=vec3(CX+ft.x*.6,.3,ft.y*.6);vec3 e=vec3(CX+ft.x,.01,ft.y);
   float life=.35+aSeed.y*.15;float k=(uT-TA)/life+aSeed.z;float c=floor(k);float age=fract(k);
   vec3 p=mix(s,e,age)+rnd()*.025;vA=(k>=1.&&uT<TR+.1)?sin(age*3.14159):0.;put(p,.03+.025*aSeed.w);}`);
  // anclaje: destellos en las huellas y chispas a ras de suelo
  a.count+=points(L.part,24,C+`void main(){float i=floor(aSeed.x*3.999);vec2 ft=foot(i);float s=TI+aSeed.y*.06;float life=.45+aSeed.z*.2;float age=(uT-s)/life;
   vec3 p=vec3(CX+ft.x,.08,ft.y)+rnd()*vec3(.12,.04,.12);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.16+.12*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=sparks(L.part,70,TI,`${f(CX)},.05,0.`,"0.,.08,0.",2,5.5,.5);
  // guardia: motas que se adhieren a la funda
  a.count+=points(L.part,60,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TG)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=mix(.95,.58,age*age);vec3 p=vec3(CX+cos(an)*rd,.15+r.y*1.7,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.035+.03*r.z);}`);

  a.pose=function(te,o){
    const ia=te-TI, sac=ss(0,0.08,te)*(1-ss(TA,TA+0.15,te)), adh=ss(TA,TI,te), lock=ss(TI,TI+0.1,te), rel=ss(TR,END,te);
    // el Axie se agarra a la baldosa: se aplasta y queda bajo y firme
    const sq=lock*(1-rel), bump=hitK(ia,10)*(ia>=0?1:0);
    caster.scale.set(1+0.06*sq+0.05*bump,1-0.09*sq-0.06*bump,1+0.06*sq+0.05*bump);
    caster.rotation.z=0.03*Math.sin(te*50)*sac;
    const cm=caster.userData.m;
    if(te<TA+0.15){cm.emissive.setRGB(0.9,0.05,0.08);cm.emissiveIntensity=0.55*sac;}
    else{cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=0.5*bump+0.12*sq;}
    set(bloodPool,ss(0.05,TA,te),0.9*(1-ss(TI,TI+0.4,te)));
    set(pads,adh,(0.7+0.6*bump)*(1-rel));
    set(tile,cl(ia/0.25),ia>=0?(0.75+0.5*bump)*(1-rel):0);
    const p=cl(ia/0.45); set(lockRing,1-Math.pow(1-p,2),ia>=0?(1-p)*0.85:0);
    for(const m of fils){m.visible=te>TA&&rel<0.999;set(m,adh,(0.8+0.6*bump)*(1-rel));}
    const sh=ss(TI,TG+0.15,te); sheath.visible=sh>0.001&&rel<0.999; sheath.scale.set(1+0.06*sq,1-0.09*sq,1+0.06*sq);
    set(sheath,cl((te-TI)/0.5),sh*(0.6+0.2*Math.sin(te*6))*(1-rel*0.5)); sheath.material.uniforms.uQ.value=rel;
    U.uE.value=ss(TG,TG+0.2,te)*(1-rel);
    if(te<TA){o.g.set(CX,0.6,0);o.gs=0.8*sac;o.ga=0.25*sac;o.li=1.2*sac;}
    else if(ia<0){o.g.set(CX,0.15,0);o.gs=1.2;o.ga=0.25+0.2*adh;o.li=1.5+2*adh;}
    else{o.g.set(CX,0.5,0);o.gs=1.8+1.5*Math.min(ia,0.3);o.ga=0.15*(1-rel)+0.45*hitK(ia,8);o.li=(1.5+1.5*sq)+5*hitK(ia,5);}
    o.ia=ia; o.c.set(CX,0.3,0); o.shake=0; o.dist=0.4; o.flash=0;
  };
}};

VFX.module("Reptil · Cola",[gila,snake,iguana,jar,dino,gecko]);
})();

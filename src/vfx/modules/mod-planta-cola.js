// =====================================================================
// MÓDULO · CLASE PLANTA (COLA)
// Los Axies ya tienen su propia cola: aquí no se dibuja ninguna. Los efectos nacen del punto de la cola
// (≈ (-4.15,0.7,0) en el mundo, calculado con la pose del lanzador) y todo lo demás es vegetal: zanahorias,
// espadañas, chiles, semillas, hojas, hongos, hierba, tótems de madera y tubérculos.
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points:points0,sparks:sparks0,RING_FS,BURST_FS,SCORCH_FS,CROSS_FS,
  camera,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,fireFS,CHIP_FS,DUST_FS,FLAME_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube,variantGroups}=VFX.lib;

// ---------- niveles por costo de PA ----------
// PK: densidad (n) y tamaño (s) de las partículas de la habilidad que se está construyendo
const PK={n:1,s:1};
const points=(p,n,vs,fs,op)=>points0(p,Math.max(1,Math.round(n*PK.n)),PK.s===1?vs:`void putK(vec3 p,float s){put(p,s*${f(PK.s)});}\n`+vs.replace(/\bput\(/g,"putK("),fs,op);
const sparks=(p,n,ti,org,bias,lo,hi,g)=>sparks0(p,Math.max(1,Math.round(n*PK.n)),ti,org,bias,lo*PK.s,hi*PK.s,g);
// mapa de tiempo por tramos K=[[real,original],...]: la pose y los shaders (uT) siguen viendo el tiempo original,
// así el ritmo se acorta sin reescribir cada constante; dur/ti/phases pasan a tiempo real
const lerpK=(K,t)=>{let i=1;while(i<K.length-1&&t>K[i][0])i++;const [a0,b0]=K[i-1],[a1,b1]=K[i];return b0+(b1-b0)*(t-a0)/(a1-a0);};
function tier(def,o){
  const K=o.K, KI=K.map(([x,y])=>[y,x]), w=t=>lerpK(K,t), iv=t=>lerpK(KI,t), g=o.g||1, gs=o.gs||1, rec=o.rec==null?1:o.rec;
  def.dur=K[K.length-1][0]; def.ti=+iv(def.ti).toFixed(3); def.phases=def.phases.map(([n,t])=>[n,+iv(t).toFixed(3)]);
  const build=def.build;
  def.build=function(a){PK.n=o.n||1;PK.s=o.s||1;build.call(this,a);PK.n=PK.s=1;const pose=a.pose;
    a.pose=function(te,O){const t=w(te);U.uT.value=t;pose(t,O);
      O.ia=te-iv(t-O.ia);                                   // destello/distorsión del motor en tiempo real
      O.shake=0;O.ga*=g;O.li*=g;O.gs*=gs;
      target.position.x=3.4+(target.position.x-3.4)*rec;target.rotation.z*=rec;};};
  return def;
}
// quemadura suave (niveles 1–2): mancha cálida con ruido, sin grietas
const BURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=noise(vec3(p*7.,1.))*.6+noise(vec3(p*15.,4.))*.4;float m=smoothstep(1.,.15,r+(n-.5)*.35);
 gl_FragColor=vec4(mix(uC2,uC1,n*.6)*1.2,m*(.2+.25*n)*uA);}`;


VFX.palette("Espadaña",["#d9ff8a","#6f9a24"]);
VFX.palette("Tropical",["#ff5c7a","#12a58a"]);
VFX.palette("Miasma",["#d58cff","#5b1a9e"]);

const TL0=V3(-0.45,0.7,0);                 // cola, en coordenadas del lanzador (sin malla: solo el punto)
const TAIL=V3(-4.15,0.7,0);                // cola en el mundo con el lanzador en reposo
const TC=V3(3.15,1.2,0);                   // pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), tmp4=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const PU=(extra,more)=>Object.assign({uniforms:Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},extra||{})},more||{});
// punto de la cola en el mundo: sigue posición, inclinación y escala del lanzador
function tailW(out){const r=caster.rotation.z,c=Math.cos(r),s=Math.sin(r),x=TL0.x*caster.scale.x,y=TL0.y*caster.scale.y;
  return out.set(caster.position.x+x*c-y*s,caster.position.y+x*s+y*c,caster.position.z);}
const curve3=(a,b,c,d)=>new THREE.CubicBezierCurve3(a,b,c,d);
const BZ=`vec3 bz(vec3 a,vec3 b,vec3 c,vec3 d,float t){float s=1.-t;return s*s*s*a+3.*s*s*t*b+3.*s*t*t*c+t*t*t*d;}`;
// orienta el eje +x local de un objeto según d, con giro opcional sobre su propio eje
const XA=V3(1,0,0), qs=new THREE.Quaternion();
const aim=(o,d,spin)=>{o.quaternion.setFromUnitVectors(XA,tmp4.copy(d).normalize());if(spin)o.quaternion.multiply(qs.setFromAxisAngle(XA,spin));};

// ---------- fragmentos de partícula del módulo ----------
// hoja que gira (vR = giro), opaca con nervio central
const LEAF_PT_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float w=.2*sqrt(max(0.,1.-pow(q.y*2.2,2.)));float m=smoothstep(w,w-.04,abs(q.x))*step(abs(q.y),.46);
 float rib=smoothstep(.02,0.,abs(q.x));
 float a=m*vA;if(a<.003)discard;
 vec3 g=mix(vec3(.16,.45,.1),vec3(.45,.85,.25),vMix);
 gl_FragColor=vec4(g*(1.-rib*.35)+uC1*.12,a);}`;
// pétalo (tonos de la paleta)
const PETAL_PT_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=length(q*vec2(1.7,1.05)+vec2(0.,.06*q.x*q.x*20.));float a=smoothstep(.45,.38,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.4+.6*(1.-d*2.))*1.15+vec3(.2)*vMix,a);}`;
// semilla con vilano (pelusa radial)
const SEED_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float sd=smoothstep(.07,.03,length((q-vec2(0.,-.32))*vec2(1.6,.8)));
 float stalk=smoothstep(.014,0.,abs(q.x))*step(-.3,q.y)*step(q.y,.04);
 vec2 h=q-vec2(0.,.04);float r=length(h);float an=atan(h.x,h.y);
 float rays=pow(abs(cos(an*7.)),6.)*smoothstep(.44,.1,r)*step(abs(an),1.9);
 float fuzz=smoothstep(.44,.3,r)*step(abs(an),1.9)*.25;
 float a=(sd+stalk*.8+rays*.85+fuzz)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.95,1.,.85),uC1,.45)*(1.+rays*.4)+uC2*sd,a);}`;
// nota musical (corchea)
const NOTE_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y)+.5;
 vec2 h=q-vec2(.36,.24);h=vec2(h.x*.94+h.y*.34,-h.x*.34+h.y*.94);
 float hd=smoothstep(1.,.75,length(h/vec2(.15,.1)));
 float stem=smoothstep(.03,.015,abs(q.x-.49))*step(.25,q.y)*step(q.y,.86);
 float fx=q.x-.49;float fy=.86-fx*1.1-fx*fx*2.;
 float flag=smoothstep(.06,.02,abs(q.y-fy))*step(0.,fx)*step(fx,.24);
 float m=max(max(hd,stem),flag);
 float glow=smoothstep(.5,0.,length(q-vec2(.45,.5)))*.25;
 float a=(m+glow)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35*m)*1.5,a);}`;
// rodaja de chile: pared roja, hueco y semillas
const CHILI_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);q.x*=1.15;
 float r=length(q);float wall=smoothstep(.47,.43,r)*smoothstep(.29,.33,r);float inner=smoothstep(.33,.29,r);
 float sd=0.;for(int i=0;i<5;i++){float an=float(i)*1.2566+.3;sd+=smoothstep(.06,.035,length(q-vec2(cos(an),sin(an))*.19));}
 float core=smoothstep(.09,.05,r);
 float a=max(max(wall,inner*.6),min(sd+core,1.))*vA;if(a<.003)discard;
 vec3 col=mix(vec3(.45,.04,.03),vec3(.95,.12,.06)*1.4,wall);col=mix(col,vec3(1.,.88,.55),min(sd+core,1.));
 gl_FragColor=vec4(col,a);}`;
// semilla de chile: óvalo crema
const CSEED_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=length(q*vec2(1.,1.5));float a=smoothstep(.4,.32,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.95,.8,.45),vec3(1.,.95,.75),1.-d*2.),a);}`;
// energía enemiga (rojo fijo, semántico)
const RED_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.22,.1),vec3(1.,.8,.5),smoothstep(.25,0.,d))*1.4,a);}`;
// raya de velocidad horizontal
const STREAK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float a=smoothstep(.05,0.,abs(q.y))*smoothstep(.5,.15,abs(q.x))*smoothstep(-.5,.3,q.x)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35+.3*vMix)*1.5,a);}`;
// burbuja venenosa verde-morada
const PBUB_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float ring=smoothstep(.07,0.,abs(d-.38))*.9+smoothstep(.5,0.,d)*.15;float hl=smoothstep(.13,0.,length(q-vec2(-.14,-.14)));
 float a=(ring+hl*.8)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.55,1.,.3),uC1,vMix)*1.3+vec3(hl*.6),a);}`;

// ---------- fragmentos de malla del módulo ----------
// hoja en un plano: eje de la hoja en vUv.y (base 0 → punta 1); uA la deshace con ruido, uK la ilumina
const LEAFP_FS=(dark,light,serr)=>`uniform float uK;
void main(){float v=vUv.y,u=vUv.x-.5;
 float w=.5*pow(sin(3.1416*pow(v,.7)),.85)*(1.+${f(serr)}*sin(v*42.));
 if(abs(u)>w)discard;
 if(noise(vec3(vUv*9.,3.))<1.-uA*1.15)discard;
 float rib=smoothstep(.03,0.,abs(u));float vein=band(fract(v*7.-abs(u)*2.),.5,.08)*smoothstep(w,w*.3,abs(u));
 vec3 c=mix(${dark},${light},v*.6+noise(vec3(vUv*12.,1.))*.4)*(1.+rib*.5+vein*.25);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 gl_FragColor=vec4(c*(.55+.45*abs(dot(normalize(vN),vec3(0.,0.,1.))))+uC1*(fr*.2+uK),1.);}`;
// proyectil enemigo en billboard: cabeza en u=.78 y estela hacia u=0; uP = potencia (1 → apagado)
const COMET_FS=`void main(){vec2 p=vUv-vec2(.78,.5);
 float head=exp(-dot(p,p)*90.);
 float w=max(.17*(1.+p.x*1.15),.005);
 float tl=p.x<0.?exp(p.x*3.2)*smoothstep(w,0.,abs(p.y)):0.;
 float n=noise(vec3(vUv*vec2(16.,5.)-vec2(uT*22.,0.),uT*3.));
 vec3 hot=mix(vec3(1.,.22,.1),vec3(1.,.9,.7),head);
 vec3 c=mix(vec3(.4,.3,.32),hot,uP)*(.5+1.3*uP);
 gl_FragColor=vec4(c,min((head*1.3+tl*(.45+.55*n))*uA*(.3+.7*uP),1.));}`;
const mkComet=(parent,w,h)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),fx(COMET_FS));parent.add(m);return m;};
// halo suave en billboard
const HALO_FS=`void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),2.2)*uA;gl_FragColor=vec4(mix(uC1,vec3(1.),a*.5)*1.3,a);}`;
// tallo verde que crece de la base (uP = longitud revelada)
const STEM_FS=`void main(){float u=vUv.x;if(u>uP)discard;float n=noise(vec3(u*30.,vUv.y*12.,0.));
 vec3 c=mix(vec3(.12,.36,.1),vec3(.38,.7,.22),n)*${LIT};gl_FragColor=vec4(c+uC1*smoothstep(uP-.08,uP,u)*.6,1.);}`;

// =====================================================================
// 1 · CARROT — una zanahoria-flecha brota de la cola, vuela en arco con su estela, se clava en el rival,
//     se calienta un instante y EXPLOTA en un estallido naranja de fragmentos, hojas, chispas y humo
// =====================================================================
const CARROT_FS=`uniform float uK;
void main(){float ang=atan(vP.z,vP.y);
 float n=noise(vP*vec3(30.,60.,60.));
 float groove=smoothstep(.6,1.,sin(vP.x*70.+noise(vec3(ang*2.,vP.x*8.,0.))*4.))*step(.3,noise(vec3(ang*3.,vP.x*14.,1.)));
 vec3 c=mix(vec3(.9,.36,.05),vec3(1.,.58,.16),n*.6-vP.x*.5)*(1.-groove*.45);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 float hot=pow(noise(vP*25.+vec3(uT*3.)),2.)*uK;
 float crack=pow(1.-abs(noise(vP*vec3(14.,40.,40.))*2.-1.),10.)*uK;
 gl_FragColor=vec4(c*${LIT}*(1.-uK*.35)+uC1*fr*.35+mix(uC2,vec3(1.,.9,.5),hot)*hot*3.+mix(uC2,uC1,crack)*crack*3.+uC1*uK*.4,1.);}`;
const carrot={key:"ptCarrot",name:"Carrot",dur:2.7,ti:1.12,pal:"Ámbar",
  phases:[["Brote",0],["Disparo",0.42],["Clavada",0.8],["Explosión",1.12],["Humo",1.4]],
build(a){
  const L=a.L,TS=0.42,TI=0.8,TX=1.12;
  const HP=V3(3.0,1.28,0.12);
  const P0=V3(-4.3,0.95,0),P1=V3(-5.1,2.9,0.35),P2=V3(-1.0,3.9,0.4),curve=curve3(P0,P1,P2,HP);
  const ease=k=>k*(0.55+0.45*k), DEND=V3(0,0,0); curve.getTangentAt(1,DEND); DEND.normalize();
  const EP=HP.clone().addScaledVector(DEND,-0.22);             // centro del cuerpo clavado: origen de la explosión
  // zanahoria: grupo con origen en la punta; cuerpo cónico opaco y tres hojas como plumas
  const car=new THREE.Group(); L.mesh.add(car);
  const body=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.62,22,8).rotateZ(-Math.PI/2).translate(-0.31,0,0),fxU(CARROT_FS,{uK:{value:0}},SOLID));
  car.add(body);
  const leafMat=fxU(LEAFP_FS("vec3(.12,.38,.08)","vec3(.42,.8,.22)",0.12),{uK:{value:0}},DS);
  for(let i=0;i<3;i++)car.add(new THREE.Mesh(new THREE.PlaneGeometry(0.17,0.44,1,4).translate(0,0.22,0).rotateZ(Math.PI/2).translate(-0.58,0,0).rotateX(i*Math.PI/3),leafMat));
  // estela de jugo naranja con borde verde
  const trail=new THREE.Mesh(taperTube(curve,120,8,0.06,0.035),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.5)discard;
   float n=noise(vec3(u*40.-uT*12.,vUv.y*6.,0.));
   gl_FragColor=vec4(mix(vec3(.35,.85,.25),uC1,exp(-d*10.))*1.5,exp(-d*6.)*(.45+.55*n)*uA);}`));
  L.trail.add(trail);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(RING_FS,{depthTest:false}));
  // explosión: núcleo blanco, bola de fuego aditiva, hollín (mezcla normal) y una sola onda (nivel 2)
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(HALO_FS,{depthTest:false}));
  const boom=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){
   float n=noise(vP*2.8+vec3(0.,-uT*3.,uT))*.6+noise(vP*6.5-vec3(uT))*.4;
   float heat=n-(uP*1.05-.2);if(heat<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));
   vec3 c=mix(uC2,uC1,smoothstep(0.,.3,heat))+vec3(1.)*smoothstep(.3,.55,heat)*(1.-uP);
   gl_FragColor=vec4(c*1.6,smoothstep(0.,.08,heat)*(.25+.75*fr)*uA);}`));
  const soot=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(`void main(){
   float n=noise(vP*2.2+vec3(0.,-uT*1.5,0.))*.65+noise(vP*5.)*.35;float d=n-(uP*1.1-.1);if(d<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(vec3(.1,.07,.05)+uC2*.25*smoothstep(.2,0.,d),smoothstep(0.,.15,d)*fr*.75*uA);}`,NB));
  boom.position.copy(EP); soot.position.copy(EP); soot.renderOrder=-1;
  const ring1=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false}));
  L.mesh.add(hitRing,flash,boom,soot,ring1);
  // trozos de zanahoria: rodajas opacas que salen despedidas girando
  const chunkM=fxU(CARROT_FS,{uK:{value:0.6}},DS), chunks=[];
  for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.055+Math.random()*0.03,0.06+Math.random()*0.03,0.05+Math.random()*0.05,12).rotateZ(Math.PI/2),chunkM);
    const an=Math.random()*Math.PI*2,el=0.2+Math.random()*1.0,d=V3(Math.cos(an)*Math.cos(el)-0.4,Math.sin(el),Math.sin(an)*Math.cos(el)).normalize(),sp=2+Math.random()*2.2;
    const vy=d.y*sp,tl=(vy+Math.sqrt(vy*vy+20*(EP.y-0.05)))/10;
    m.userData={d,sp,tl,spin:V3(Math.random()*16-8,Math.random()*16-8,Math.random()*16-8)};chunks.push(m);L.mesh.add(m);}
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TX=${f(TX)};
  const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 HP=${v3(HP)};const vec3 EP=${v3(EP)};
  ${BZ}vec3 cp(float t){float k=clamp((t-TS)/(TI-TS),0.,1.);return bz(P0,P1,P2,HP,k*(.55+.45*k));}`;
  // savia que converge en la cola mientras brota la zanahoria
  a.count+=points(L.part,70,C+`void main(){float life=.32;float age=(uT-aSeed.x*(TS-.3))/life;
   vec3 d=normalize(rnd()+vec3(0.,.001,0.));vec3 p=P0+d*mix(1.1,.05,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.04*aSeed.z);}`);
  a.count+=points(L.part,150,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.35+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=cp(s)+rnd()*.07+rnd()*.3*t+vec3(0.,-.4*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.05*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,32,C+`varying float vR;void main(){float s=TS+aSeed.x*(TI-TS);float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=cp(s)+r*.08+vec3(-.25*t+r.x*.3*t,.25*t-1.2*t*t,r.z*.4*t);vR=aSeed.z*6.28+t*(4.+aSeed.w*8.);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.13+.08*aSeed.w);}`,LEAF_PT_FS,NB);
  // al clavarse: astillas y chispas; luego chisporrotea mientras se calienta
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-1.,.4,0.))*(1.5+2.5*aSeed.z);vec3 p=HP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,110,TI,`${f(HP.x)},${f(HP.y)},${f(HP.z)}`,"-.6,.3,0.",2,6,2.5);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*(TX-TI);float life=.18+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=EP+rnd()*.12+normalize(rnd()+vec3(0.,.6,0.))*(1.+2.*aSeed.z)*t;
   vA=(age>0.&&age<1.)?(1.-age)*smoothstep(TI,TX,s):0.;put(p,.03+.03*aSeed.w);}`);
  // explosión: llamaradas, pulpa naranja, hojas, chispas y humo
  a.count+=points(L.part,130,C+`void main(){float s=TX+aSeed.x*.07;float life=.35+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.3,0.));vec3 p=EP+d*(.25+1.15*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.6*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,(.25+.3*aSeed.w)*(1.-age*.4));}`);
  a.count+=points(L.part,120,C+`void main(){float s=TX+aSeed.x*.04;float life=.6+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.5,0.))*(2.4+3.4*aSeed.z);float dr=exp(-t*1.5);vec3 p=EP+v*(1.-dr)/1.5+vec3(0.,-4.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.07*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,45,C+`varying float vR;void main(){float s=TX+aSeed.x*.05;float life=1.1+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.9,0.))*(1.8+2.4*aSeed.z);vec3 p=EP+v*t*exp(-t*1.4)+vec3(sin(t*5.+aSeed.w*6.)*.25,-.5*t*t,0.);
   vR=aSeed.z*6.28+t*7.;vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.17+.08*aSeed.w);}`,LEAF_PT_FS,NB);
  a.count+=points(L.part,90,C+`void main(){float s=TX+.06+aSeed.x*.3;float life=1.2+aSeed.y*.8;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=EP+vec3(r.x*.5+sin(t*2.+r.z*6.)*.2-.2*t,t*(.9+aSeed.z)+r.y*.3,r.z*.5);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.75:0.;put(p,(.35+.35*aSeed.w)*(.6+age*1.3));}`,SMOKE_FS("vec3(.16,.11,.08)"),NB);
  a.count+=points(L.part,40,C+`void main(){float life=.45+aSeed.y*.3;float k=(uT-TX)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=aSeed.z*6.2832;float rad=.3+aSeed.w*.7;vec3 p=vec3(3.3+cos(an)*rad,.02+age*.35,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.13+.1*r.z)*(1.-age*.4));}`,FLAME_FS);
  a.count+=sparks(L.part,280,TX,`${f(EP.x)},${f(EP.y)},${f(EP.z)}`,"-.3,.35,0.",3,8,3.2);
  const scorch=groundPlane(2.2,3.3,0.015,fx(BURN_FS));   // quemadura suave: sin grietas ni cráter
  L.decal.add(scorch);
  a.pose=function(te,o){
    const ia=te-TI, ix=te-TX, k=cl((te-TS)/(TI-TS)), e=ease(k), grow=ss(0.04,0.36,te);
    caster.rotation.z=0.08*ss(0,TS,te)-0.16*ss(TS,TS+0.08,te)+0.08*ss(TS+0.15,TI+0.3,te);
    // zanahoria: brota de la cola apuntando atrás-arriba, vuela girando, se clava y tiembla al calentarse
    if(te<TS){tailW(car.position).add(tmp.set(-0.08*grow,0.24*grow,0));curve.getTangentAt(0,tmp2);tmp2.x+=0.15*Math.sin(te*30)*grow;aim(car,tmp2,te*4);car.scale.setScalar(Math.max(grow,0.001));}
    else if(te<TI){curve.getPointAt(e,car.position);curve.getTangentAt(e,tmp2);aim(car,tmp2,te*18);car.scale.setScalar(1);}
    else{car.position.copy(HP);const q=Math.exp(-ia*5)*Math.sin(ia*55)*0.12+0.03*Math.sin(te*90)*ss(TI,TX,te);tmp2.copy(DEND);tmp2.y+=q;tmp2.z+=q*0.5;aim(car,tmp2,0);
      car.scale.setScalar(1+0.18*ss(TX-0.15,TX,te));}
    car.visible=te<TX&&grow>0.01;
    const heat=ss(TI+0.05,TX,te)*(0.75+0.25*Math.sin(te*60));
    body.material.uniforms.uK.value=heat; leafMat.uniforms.uA.value=1; leafMat.uniforms.uK.value=heat*0.5;
    trail.visible=te>=TS&&te<TI+0.35; set(trail,e,1-cl((te-TI)/0.35));
    let p=cl(ia/0.3); towardCam(hitRing.position,HP,0.3); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // explosión
    p=cl(ix/0.18); towardCam(flash.position,EP,0.6); billboard(flash); flash.visible=ix>=0&&p<1; flash.scale.setScalar(1+2.4*p); set(flash,0,1-p);
    p=cl(ix/0.6); boom.visible=ix>=0&&p<1; boom.scale.setScalar(0.25+1.1*(1-Math.pow(1-p,3))); set(boom,p,1);
    p=cl((ix-0.05)/1.0); soot.visible=ix>=0.05&&p<1; soot.scale.setScalar(0.45+1.1*(1-Math.pow(1-p,2))); set(soot,p,1);
    p=cl(ix/0.35); towardCam(ring1.position,EP,0.5); billboard(ring1); ring1.visible=ix>=0&&p<1; set(ring1,p,1-p);
    chunkM.uniforms.uK.value=ix>=0?Math.exp(-ix*2):0;
    for(const m of chunks){const u=m.userData,t=Math.max(ix,0),tt=Math.min(t,u.tl);
      m.visible=ix>=0&&te<2.6; m.position.copy(EP).addScaledVector(u.d,u.sp*tt); m.position.y-=5*tt*tt; m.position.y=Math.max(m.position.y,0.04);
      m.rotation.set(u.spin.x*tt,u.spin.y*tt,u.spin.z*tt); m.scale.setScalar(Math.max(1-ss(2.2,2.6,te),0.001));}
    scorch.material.uniforms.uA.value=ix>=0?1-ss(1.9,2.6,te):0;
    const env=ss(TX,TX+0.2,te)*(1-ss(2.2,2.7,te)); U.uE.value=env;
    // reacción del rival: respingo al clavarse, sacudida fuerte con la explosión
    const h1=hitK(ia,8)*(te<TX?1:0), h2=hitK(ix,4.5);
    target.position.x=3.4+0.04*h1+0.26*h2*(1-Math.exp(-Math.max(ix,0)*20)); target.rotation.z=-0.06*h1*Math.cos(ia*30)-0.24*h2*Math.cos(ix*14);
    target.scale.set(1+0.05*h2,1-0.07*h2,1+0.05*h2);
    scorch.position.x=target.position.x-0.1;
    o.em=0.25*heat+0.45*env*(ix>=0?Math.exp(-ix*1.5):0); o.emc.copy(U.uC2.value);
    if(te<TS){o.g.copy(car.position);o.gs=0.8*grow;o.ga=0.35*grow;o.li=2*grow;}
    else if(te<TI){o.g.copy(car.position);o.gs=1;o.ga=0.45;o.li=3.5;}
    else if(te<TX){o.g.copy(EP);o.gs=1.1+0.8*heat;o.ga=Math.exp(-ia*9)*0.6+0.35*heat;o.li=5*Math.exp(-ia*5)+4*heat;}
    else{o.g.copy(EP);o.gs=1.6+4*ix;o.ga=Math.exp(-ix*9)*0.8+0.1*env;o.li=10*Math.exp(-ix*4)+2*env;}
    if(te<TX){o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.35;o.flash=0.6;}
    else{o.ia=ix;o.c.copy(EP);o.shake=0;o.dist=1.1;o.flash=1;}
  };
}};

// =====================================================================
// 2 · CATTAIL — cinco espigas de espadaña se abren en abanico desde la cola y azotan al rival una tras otra.
//     Contra bestia/bicho, las espigas se deshacen en semillas con vilano que vuelven en estela y forman dos
//     naipes vegetales de luz que se funden con el Axie (robar cartas, sin interfaz)
// =====================================================================
const VELVET_FS=`void main(){vec3 N=normalize(vN);float fr=pow(1.-abs(dot(N,normalize(vV))),1.6);
 float n=noise(vP*90.)*.5+noise(vP*31.)*.5;
 vec3 c=mix(vec3(.24,.13,.06),vec3(.5,.31,.15),n)*${LIT}+vec3(.75,.55,.35)*fr*.55;
 gl_FragColor=vec4(c,1.);}`;
const STALK_FS=`void main(){float n=noise(vP*vec3(4.,40.,40.));vec3 c=mix(vec3(.3,.42,.12),vec3(.62,.7,.3),n)*${LIT};gl_FragColor=vec4(c,1.);}`;
// naipe vegetal: marco redondeado de enredadera con una hoja en el centro; uP lo ensambla con ruido
const CARD_FS=`void main(){vec2 p=(vUv-.5)*vec2(1.,1.42);
 vec2 b=abs(p)-vec2(.4,.62);float rr=length(max(b,0.))+min(max(b.x,b.y),0.)-.06;
 float border=band(rr,0.,.035)*(.75+.25*sin(atan(p.y,p.x)*20.+uT*3.));float fill=smoothstep(.02,-.02,rr);
 float v=clamp((p.y+.45)/.9,0.,1.);float w=.24*pow(sin(3.1416*v),.8);
 float lf=smoothstep(w,w-.03,abs(p.x))*step(abs(p.y),.45);
 float rib=smoothstep(.015,0.,abs(p.x))*lf;float vein=band(fract(v*6.-abs(p.x)*2.5),.5,.1)*lf;
 float rv=step(noise(vec3(p*7.,2.)),uP*1.25-.1);
 float al=(border+fill*.18+lf*.55+rib*.4+vein*.3)*rv*uA;
 gl_FragColor=vec4(mix(uC2,uC1,.5+border*.5+rib)*1.5+vec3(1.)*border*.3,al);}`;
const cattail={key:"ptCattail",name:"Cattail",dur:3.0,ti:0.82,pal:"Espadaña",vlabel:"Rival",
  variants:[["otro","Otro"],["bestia","Bestia/Bicho"]],v:"bestia",
  phases:[["Abanico",0],["Latigazo",0.4],["Golpes",0.82],["Semillas",1.15],["Fin",2.5]],
build(a){
  const L=a.L,N=5,TS=0.4,FL=0.42,DT=0.06,TC1=1.8,TC2=2.25,TCE=2.7,VG=variantGroups(a,["otro","bestia"]);
  const hitT=i=>TS+i*DT+FL;
  const CA=V3(-3.0,2.35,0.45),CB=V3(-2.5,2.15,0.7);           // naipes de luz junto al Axie
  // espigas: erguidas en abanico sobre la cola antes de salir; cada una con su curva hasta el rival
  const DIR=[],P0s=[],HPs=[],CV=[];
  for(let i=0;i<N;i++){const k=(i-2)/2,fan=k*0.62,h=1-0.5*k*k;
    const d=V3(Math.sin(fan)*0.6-0.3,Math.cos(fan),k*0.3).normalize();DIR.push(d);
    const p0=TAIL.clone().addScaledVector(d,1.9);P0s.push(p0);
    const H=V3(2.98,1.12+0.2*k,0.22*k);HPs.push(H);
    CV.push(curve3(p0,V3(-2.6,p0.y+1.2*h,1.6*k),V3(0.4,2.3+1.1*h-0.25*k,1.4*k),H));}
  const velvet=fx(VELVET_FS,SOLID), stalkM=fx(STALK_FS,SOLID);
  const tipG=new THREE.ConeGeometry(0.014,0.2,6).rotateZ(-Math.PI/2).translate(-0.1,0,0);
  const headG=new THREE.CapsuleGeometry(0.075,0.42,4,14).rotateZ(-Math.PI/2).translate(-0.48,0,0);
  const stemG=new THREE.CylinderGeometry(0.016,0.022,1.2,6).rotateZ(-Math.PI/2).translate(-1.3,0,0);
  const cats=[], trailMats=[];
  for(let i=0;i<N;i++){const g=new THREE.Group();g.add(new THREE.Mesh(tipG,stalkM),new THREE.Mesh(headG,velvet),new THREE.Mesh(stemG,stalkM));L.mesh.add(g);cats.push(g);
    const m=fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.4)discard;
     float n=noise(vec3(u*30.-uT*10.,vUv.y*6.,${f(i)}));
     gl_FragColor=vec4(mix(uC2,uC1,exp(-d*10.))*1.4,exp(-d*7.)*(.4+.6*n)*uA);}`);
    trailMats.push(m); L.trail.add(new THREE.Mesh(taperTube(CV[i],90,6,0.035,0.02),m));}
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // bestia: estela de vuelta y dos naipes vegetales
  const back=curve3(V3(2.9,1.2,0),V3(1.4,3.4,1.0),V3(-1.2,3.6,0.9),V3(-2.75,2.3,0.55));
  const ret=new THREE.Mesh(taperTube(back,100,6,0.03,0.05),fx(`void main(){float u=vUv.x;if(u>uP)discard;
   float dash=band(fract(u*14.-uT*3.),.5,.25);float n=noise(vec3(u*25.-uT*6.,vUv.y*6.,1.));
   gl_FragColor=vec4(mix(uC2,uC1,dash)*1.4,(.25+.6*dash)*(.5+.5*n)*smoothstep(uP,uP-.1,u)*uA);}`));
  const cards=[CA,CB].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(0.46,0.66),fx(CARD_FS)));
  VG.bestia.trail.add(ret); VG.bestia.mesh.add(cards[0],cards[1]);
  const C=`const float TS=${f(TS)};const float FL=${f(FL)};const float DT=${f(DT)};const float TC1=${f(TC1)};const float TC2=${f(TC2)};
  const vec3 CA=${v3(CA)};const vec3 CB=${v3(CB)};const vec3 TP=${v3(TAIL)};${BZ}
  vec3 hitP(float j){float k=(j-2.)/2.;return vec3(2.98,1.12+.2*k,.22*k);}
  float hitT(float j){return TS+j*DT+FL;}`;
  // motas verdes que suben por las espigas mientras se abren
  a.count+=points(L.part,70,C+`void main(){float life=.4+aSeed.y*.2;float age=(uT-aSeed.x*(TS-.3))/life;
   vec3 r=rnd();vec3 p=TP+vec3(r.x*.3-.1,age*2.1,r.z*.6);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.8:0.;put(p,.03+.04*aSeed.z);}`);
  // pelusa parda que salta en cada golpe
  a.count+=points(L.part,100,C+`void main(){float j=floor(aSeed.x*5.);float s=hitT(j);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.8,.4,0.))*(1.5+2.5*aSeed.z);vec3 p=hitP(j)+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.05*aSeed.w);}`,CHIP_FS);
  for(let i=0;i<N;i++)a.count+=sparks(L.part,40,hitT(i),`${f(HPs[i].x)},${f(HPs[i].y)},${f(HPs[i].z)}`,"-.6,.3,0.",2,7,2.5);
  const shock=groundPlane(2.6,3.4,0.03,fx(RING_FS)); L.decal.add(shock);
  const base=a.count;
  // otro: las espigas revientan en una nube de pelusa que flota y cae
  VG.otro.n=points(VG.otro.part,240,C+`void main(){float j=floor(aSeed.x*5.);float s=hitT(j)+.1+aSeed.y*.08;float life=1.3+aSeed.z*.9;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 d=normalize(r+vec3(-.3,.2,0.));
     vec3 p=hitP(j)+d*(.25+.9*aSeed.w)*(1.-exp(-t*3.))+vec3(sin(t*2.+r.x*6.)*.25-.2*t,.15*t-.18*t*t,cos(t*1.7+r.z*6.)*.2);
     vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.8:0.;put(p,(.12+.16*aSeed.w)*(.7+age));}`,SMOKE_FS("vec3(.72,.62,.46)"),NB)
   +points(VG.otro.part,90,C+`varying float vR;void main(){float j=floor(aSeed.x*5.);float s=hitT(j)+.1+aSeed.y*.1;float life=1.6+aSeed.z*.8;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=hitP(j)+normalize(r+vec3(-.2,.4,0.))*(.3+1.2*aSeed.w)*(1.-exp(-t*2.5))+vec3(sin(t*3.+r.y*6.)*.2,-.25*t,0.);
     vR=sin(t*3.+r.z*6.)*.8;vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.16+.08*aSeed.w);}`,SEED_FS);
  // bestia: semillas con vilano que vuelan de vuelta en estela y ensamblan los naipes
  VG.bestia.n=points(VG.bestia.part,280,C+`varying float vR;void main(){float j=floor(aSeed.x*5.);float s=hitT(j)+.1+aSeed.y*.3;float dur=.8+.25*aSeed.z;
     float k=clamp((uT-s)/dur,0.,1.);float e=k*k*(3.-2.*k);
     vec3 r=rnd();vec3 dst=(fract(aSeed.w*7.)<.5?CA:CB)+vec3(r.x*.14,r.y*.22,r.z*.04);
     vec3 H=hitP(j);
     vec3 p=bz(H,H+vec3(-.8,1.6+r.y*.6,1.+r.z*.6),vec3(-1.2,3.4+r.x*.4,.9+r.z*.5),dst,e);
     p+=sin(k*3.14159)*vec3(0.,sin(k*14.+aSeed.w*20.)*.18,cos(k*11.+aSeed.z*20.)*.18);
     float after=uT-s-dur;vR=sin(uT*6.+aSeed.z*20.)*.6;
     vA=(uT>s)?(after<0.?smoothstep(0.,.08,k):1.-clamp(after/.25,0.,1.)):0.;
     put(p,.16+.1*aSeed.w);}`,SEED_FS)
   // los naipes se deshacen en motas que entran en el cuerpo del Axie
   +points(VG.bestia.part,90,C+`void main(){float s=TC2+aSeed.x*.25;float life=.35+aSeed.y*.2;float k=clamp((uT-s)/life,0.,1.);
     vec3 r=rnd();vec3 st=(aSeed.z<.5?CA:CB)+vec3(r.x*.18,r.y*.28,0.);vec3 en=vec3(-3.7+r.x*.2,.9+r.y*.4,r.z*.2);
     vec3 p=mix(st,en,k*k)+vec3(0.,sin(k*3.14159)*.2,0.);
     vA=(uT>s&&k<1.)?1.-k*.6:0.;put(p,(.05+.05*aSeed.w)*(1.-k*.5));}`);
  const glowRing=groundPlane(2.6,-3.7,0.025,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*9.,uT*.7));float m=smoothstep(.95,.1,r)*(.25+.2*n)+pow(abs(sin(atan(p.y,p.x)*6.+r*4.)),20.)*smoothstep(.9,.3,r)*.25;
   gl_FragColor=vec4(uC1*1.3,m*uA);}`));
  VG.bestia.decal.add(glowRing);
  a.setVariant=v=>{if(!VG[v])v="bestia";a.v=v;for(const k in VG)for(const l of VFX.LK)VG[k][l].visible=k===v;a.count=base+VG[v].n;};
  a.pose=function(te,o){
    const grow=ss(0.05,0.35,te);let last=-1;
    caster.rotation.z=te<TS?0:-0.18*ss(TS,TS+0.1,te)+0.18*ss(TS+0.3,1.3,te);
    for(let i=0;i<N;i++){const g=cats[i],s=TS+i*DT,ht=s+FL,k=cl((te-s)/FL),e=k*(0.4+0.6*k);
      if(te>=ht)last=i;
      if(te<s){// abanico sobre la cola: la base de cada tallo nace del punto de la cola
        const sw=0.06*Math.sin(te*5+i*1.3);tmp2.copy(DIR[i]);tmp2.x+=sw;tmp2.normalize();
        tailW(g.position).addScaledVector(tmp2,1.9*grow);aim(g,tmp2,0);g.scale.setScalar(Math.max(grow,0.001));g.visible=grow>0.01;}
      else if(te<ht){CV[i].getPointAt(e,g.position);CV[i].getTangentAt(e,tmp2);aim(g,tmp2,te*10);g.scale.setScalar(1);g.visible=true;}
      else{const q=te-ht;g.position.copy(HPs[i]);CV[i].getTangentAt(1,tmp2);tmp2.y+=0.15*Math.exp(-q*12)*Math.sin(q*60);aim(g,tmp2,0);
        g.scale.setScalar(Math.max(1-ss(0.08,0.14,q),0.001));g.visible=q<0.14;}
      trailMats[i].uniforms.uP.value=e; trailMats[i].uniforms.uA.value=te>=s?1-cl((te-ht)/0.3):0;}
    const best=a.v==="bestia", lt=last>=0?hitT(last):hitT(0), ia=te-lt, i0=te-hitT(0);
    let p=cl(ia/0.3); towardCam(hitRing.position,HPs[Math.max(last,0)],0.3); billboard(hitRing); hitRing.visible=last>=0&&p<1; set(hitRing,p,last>=0?1-p:0);
    p=cl(i0/0.9); set(shock,p,i0>=0?(1-p)*0.7:0);
    // estela de vuelta y naipes
    set(ret,ss(1.0,1.75,te),ss(1.0,1.2,te)*(1-ss(TC2-0.2,TC2+0.2,te)));
    cards.forEach((c,j)=>{const ctr=j?CB:CA,rv=ss(TC1-0.3+j*0.1,TC1+0.25+j*0.1,te),out=1-ss(TC2,TC2+0.35,te);
      towardCam(c.position,tmp.copy(ctr).add(tmp2.set(0,0.04*Math.sin(te*3+j*2),0)),0.1); billboard(c,(j?-0.18:0.14)+0.04*Math.sin(te*2+j));
      c.scale.setScalar(0.9+0.15*Math.sin(Math.PI*rv)+0.2*(1-out)); c.visible=rv*out>0.001; set(c,rv,rv*out);});
    set(glowRing,cl((te-TC2)/0.6),te>=TC2?1-ss(TC2+0.4,TCE,te):0);
    if(best&&te>=TC2){const cm=caster.userData.m;cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=0.8*ss(TC2,TC2+0.25,te)*(1-ss(TC2+0.35,TCE+0.2,te));}
    // el rival recibe cinco latigazos encadenados
    let kn=0;for(let i=0;i<N;i++)kn+=hitK(te-hitT(i),9);
    target.position.x=3.4+0.07*kn; target.rotation.z=-0.08*kn*Math.cos(te*40); shock.position.x=target.position.x;
    if(te<TS){tailW(o.g);o.g.y+=1.3*grow;o.gs=1.2*grow;o.ga=0.3*grow;o.li=2*grow;}
    else if(last<0){cats[2].getWorldPosition(o.g);o.gs=1.2;o.ga=0.35;o.li=3;}
    else if(!best||te<1.3){o.g.copy(HPs[last]);o.gs=1.2+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.7+0.1;o.li=6*Math.exp(-ia*6)+1;}
    else if(te<TC2){o.g.lerpVectors(CA,CB,0.5);o.gs=1.6;o.ga=0.35*ss(1.3,TC1,te);o.li=3*ss(1.3,TC1,te);}
    else{const q=te-TC2;o.g.set(-3.7,1.2,0);o.gs=2;o.ga=0.4*Math.exp(-q*3);o.li=4*Math.exp(-q*3);}
    o.ia=ia; o.c.copy(HPs[Math.max(last,0)]); o.shake=0; o.dist=0.5; o.flash=1;
  };
}};

// =====================================================================
// 3 · HATSUNE — la zona de la cola vibra y emite ondas sónicas celestes y notas; dos proyectiles enemigos
//     cruzan las ondas, se frenan, encogen y pierden brillo hasta llegar inofensivos
// =====================================================================
const hatsune={key:"ptHatsune",name:"Hatsune",dur:3.0,ti:1.0,pal:"Loto",
  phases:[["Vibración",0],["Ondas",0.3],["Proyectiles",0.55],["Amortiguación",1.0],["Calma",2.3]],
build(a){
  const L=a.L,TW=0.3,TE=2.3,TF=2.9,BV=8,BK=2.2,XS=3.0,X0=-0.65,BL=[0.55,1.0];
  const TEN=BL.map(l=>l+(XS-X0)/BV), WA=-Math.log(1-(X0+3.3)*BK/BV)/BK, TAR=TEN.map(t=>t+WA);
  // trayectoria del proyectil: recto hasta las ondas y después frenado exponencial; devuelve la potencia
  const boltAt=(t,j,out)=>{const l=BL[j],u=t-l;let x,p;
    if(t<TEN[j]){x=XS-BV*u;p=1;}else{const w=t-TEN[j];x=X0-(BV/BK)*(1-Math.exp(-BK*w));p=0.3+0.7*Math.exp(-2.2*w);}
    const k=cl((XS-x)/(XS+3.35));out.set(x,1.35-0.25*k+0.05*Math.sin(u*12),0.15*Math.sin(u*5+l*7));return p;};
  // capas esféricas de sonido que se expanden desde la cola
  const SHELL_FS=`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.4);
   float rip=.5+.5*sin(q.y*16.+atan(q.z,q.x)*3.-uT*9.+noise(q*4.+vec3(uT))*3.);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3+vec3(1.)*fr*rip*.25,(fr*.75+fr*rip*.5)*uA);}`;
  const shells=[];for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(SHELL_FS));L.mesh.add(m);shells.push(m);}
  // vibración: arcos ")))" a ambos lados del punto de la cola
  const vib=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float arcs=band(fract(r*3.2-uT*6.),.5,.13)*smoothstep(1.,.45,r)*smoothstep(.12,.3,r);
   float side=smoothstep(.75,.35,abs(p.y)/(r+.001));float core=smoothstep(.25,0.,r);
   gl_FragColor=vec4(mix(uC1,vec3(1.),core*.5)*1.5,(arcs*side+core*.7)*uA);}`,{depthTest:false}));
  const comets=BL.map(()=>mkComet(L.mesh,0.95,0.38));
  const entry=BL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const puffs=BL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(HALO_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // tres líneas de onda que viajan desde la cola hacia delante, tras el lanzador
  const wave=new THREE.Mesh(new THREE.PlaneGeometry(3.7,2.0),fx(`void main(){float u=vUv.x;float m=0.;
   for(int i=0;i<3;i++){float fi=float(i)-1.;
    float y=.5+fi*.12*(.4+u)+.07*(.3+u)*sin(u*26.-uT*16.+fi*2.1);
    m+=smoothstep(.012+.012*u,0.,abs(vUv.y-y));}
   float fade=smoothstep(0.,.08,u)*smoothstep(1.,.7,u)*step(u,uP);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.5,m*fade*uA);}`));
  wave.position.set(-2.3,1.0,-0.45); L.trail.add(wave);
  const ground=groundPlane(5,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(fract(r*4.-uT*1.6),.5,.1)*smoothstep(1.,.3,r)+band(r,.95,.015);
   gl_FragColor=vec4(uC1*1.2,m*uA*.6);}`)); L.decal.add(ground);
  const C=`const float TW=${f(TW)};const vec3 TP=${v3(TAIL)};const float BV=${f(BV)};const float BK=${f(BK)};const float XS=${f(XS)};const float X0=${f(X0)};
  const float L0=${f(BL[0])};const float L1=${f(BL[1])};const float A0=${f(TAR[0])};const float A1=${f(TAR[1])};
  vec4 bolt(float t,float L){float tE=L+(XS-X0)/BV;float u=t-L;float x,p;
   if(t<tE){x=XS-BV*u;p=1.;}else{float w=t-tE;x=X0-(BV/BK)*(1.-exp(-BK*w));p=.3+.7*exp(-2.2*w);}
   float k=clamp((XS-x)/(XS+3.35),0.,1.);return vec4(x,1.35-.25*k+.05*sin(u*12.),.15*sin(u*5.+L*7.),p);}`;
  // notas musicales que brotan de la cola
  a.count+=points(L.part,60,C+`varying float vR;void main(){float life=1.3+aSeed.y*.5;float k=(uT-TW)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 dir=normalize(vec3(r.x*2.-1.,.5+r.y,r.z*2.-1.));
   vec3 p=TP+dir*age*(1.2+1.4*r.z)+vec3(sin(age*9.+r.x*6.)*.12,age*.4,0.);
   vR=sin(age*7.+r.y*6.)*.4;
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.24+.12*r.z)*(.6+.4*sin(age*3.14159)));}`,NOTE_FS);
  // polvo celeste que titila dentro del campo sónico
  a.count+=points(L.part,120,C+`void main(){float life=.6+aSeed.y*.5;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 d=normalize(r*2.-1.+vec3(.4,.3,0.));vec3 p=TP+d*(.4+2.8*r.z);p.y=max(p.y,.05);
   vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.03+.04*r.x);}`);
  // brasas rojas de los proyectiles, que se apagan con la potencia
  a.count+=points(L.part,160,C+`void main(){float L=aSeed.x<.5?L0:L1;float A=aSeed.x<.5?A0:A1;float s=L+fract(aSeed.x*2.)*(A-L);
   float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);vec4 b=bolt(s,L);
   vec3 p=b.xyz+rnd()*.06*b.w+vec3(.6*t,.3*t,0.)*b.w+rnd()*.2*t;
   vA=(age>0.&&age<1.)?(1.-age)*pow(b.w,1.5):0.;put(p,(.04+.05*aSeed.w)*(.3+.7*b.w));}`,RED_FS);
  // al llegar casi apagados, un chisporroteo mínimo contra el lanzador
  a.count+=points(L.part,50,C+`void main(){float A=aSeed.x<.5?A0:A1;float life=.3+aSeed.y*.2;float age=(uT-A)/life;float t=max(uT-A,0.);
   vec3 p=vec3(-3.35,1.15,0.)+normalize(rnd()+vec3(.8,.2,0.))*(.6+aSeed.z)*t;
   vA=(age>0.&&age<1.)?(1.-age)*.6:0.;put(p,.03+.02*aSeed.w);}`,RED_FS);
  TEN.forEach(t=>{a.count+=sparks(L.part,60,t,`${f(X0)},1.3,0.`,".5,.2,0.",2,6,1.5);});
  a.pose=function(te,o){
    const env=ss(0.05,TW,te)*(1-ss(TE,TF,te));U.uE.value=env;
    caster.rotation.z=0.012*Math.sin(te*45)*env;
    tailW(tmp3);
    let boost=0;TEN.forEach(t=>boost+=0.7*hitK(te-t,5));
    shells.forEach((m,i)=>{const c=(te-TW)/0.9-i/4,ph=c-Math.floor(c);m.position.copy(tmp3);
      m.visible=c>=0&&env>0.001;m.scale.setScalar(0.2+2.5*ph);set(m,ph,env*Math.pow(1-ph,1.3)*ss(0,0.1,ph)*(0.8+boost));});
    towardCam(vib.position,tmp3,0.4); billboard(vib); vib.visible=env>0.001; set(vib,0,env*(0.8+0.2*Math.sin(te*40)));
    set(wave,ss(TW,TW+0.5,te)*1.1,env*0.9);
    set(ground,0,env);
    let cmE=0.18*env;
    BL.forEach((l,j)=>{const m=comets[j],pw=boltAt(te,j,tmp);boltAt(te-0.02,j,tmp2);
      m.visible=te>=l&&te<TAR[j]; towardCam(m.position,tmp,0.1); billboard(m,Math.atan2(tmp.y-tmp2.y,tmp.x-tmp2.x));
      m.scale.setScalar(0.35+0.65*pw); set(m,pw,ss(l,l+0.05,te));
      const ie=te-TEN[j];boltAt(TEN[j],j,tmp2);let p=cl(ie/0.45);
      towardCam(entry[j].position,tmp2,0.2); billboard(entry[j]); entry[j].visible=ie>=0&&p<1; entry[j].scale.setScalar(0.6+1.2*p); set(entry[j],p,1-p);
      const iar=te-TAR[j];p=cl(iar/0.3); towardCam(puffs[j].position,tmp2.set(-3.35,1.15,0),0.3); billboard(puffs[j]);
      puffs[j].visible=iar>=0&&p<1; puffs[j].scale.setScalar(0.5+0.8*p); set(puffs[j],0,(1-p)*0.6);
      cmE+=0.35*hitK(iar,8);});
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=cmE;
    caster.position.x=-3.7-0.03*(hitK(te-TAR[0],10)+hitK(te-TAR[1],10)); ground.position.x=caster.position.x;
    // el rival dispara: retroceso y destello rojo al lanzar
    const rk=hitK(te-BL[0],8)+hitK(te-BL[1],8);
    target.rotation.z=0.12*rk; o.em=0.5*rk; o.emc.setRGB(1,0.25,0.1);
    const j=te>=TEN[1]?1:0, ie=te-TEN[j]; boltAt(TEN[j],j,tmp2);
    if(te<TEN[0]){o.g.copy(tmp3);o.gs=1.6*env;o.ga=0.3*env;o.li=3*env;}
    else{o.g.copy(tmp2);o.gs=1.4+2*Math.min(ie,0.5);o.ga=Math.exp(-ie*7)*0.6+0.12*env;o.li=6*Math.exp(-ie*5)+2*env;}
    o.ia=ie; o.c.copy(tmp2); o.shake=0; o.dist=0.7; o.flash=0;
  };
}};

// =====================================================================
// 4 · HOT BUTT — llamarada de chile que sale de la cola, cruza por encima del Axie con chiles y semillas
//     girando, prende al rival y le sella la boca con un bozal de fuego (cartas de boca inhabilitadas)
// =====================================================================
const JET_FS=`uniform float uQ;
void main(){float u=vUv.x;if(u>uP||u<uQ)discard;
 float an=vUv.y*6.2832;
 float n=noise(vec3(u*26.-uT*16.,sin(an)*1.5,cos(an)*1.5+uT*2.))*.6+noise(vec3(u*60.-uT*24.,sin(an)*3.,cos(an)*3.))*.4;
 float fr=abs(dot(normalize(vN),normalize(vV)));float core=pow(fr,3.);
 float hd=smoothstep(uP,uP-.06,u)*smoothstep(uQ,uQ+.08,u);
 vec3 c=mix(uC2,uC1,core*.8+n*.3)+vec3(1.,.95,.7)*smoothstep(.7,1.,core)*.8;
 float al=smoothstep(.3,.7,n+core*.4)*(.35+.65*fr)*hd*uA;
 gl_FragColor=vec4(c*1.6,al);}`;
const CHILIM_FS=`void main(){vec3 N=normalize(vN);vec3 V=normalize(vV);
 float spec=pow(max(dot(reflect(-V,N),normalize(vec3(.3,.8,.5))),0.),24.);
 float n=noise(vP*30.);
 vec3 c=mix(vec3(.55,.02,.02),vec3(.95,.1,.05),n*.5+.5)*${LIT}+vec3(1.,.9,.8)*spec*.9+uC1*.15;
 gl_FragColor=vec4(c,1.);}`;
const hotButt={key:"ptHotButt",name:"Hot Butt",dur:3.0,ti:1.0,pal:"Fuego",
  phases:[["Picor",0],["Llamarada",0.42],["Quemadura",1.0],["Bozal de fuego",1.3],["Ascuas",2.45]],
build(a){
  const L=a.L,TS=0.42,TI=1.0,TQ=1.5,TQE=1.85,TM=1.3,TE=2.5,TF=2.95;
  const P0=V3(-4.3,0.82,0),P1=V3(-5.2,2.9,0.25),P2=V3(-0.6,4.0,0.3),P3=V3(3.0,1.42,0.05),curve=curve3(P0,P1,P2,P3);
  const jet=new THREE.Mesh(taperTube(curve,160,16,0.075,0.27),fxU(JET_FS,{uQ:{value:0}})); L.trail.add(jet);
  // chiles enteros que viajan dentro del chorro, girando
  const chM=fx(CHILIM_FS,SOLID), stM=fx(STALK_FS,SOLID), chilis=[];
  const chG=new THREE.ConeGeometry(0.065,0.34,12,4).rotateZ(-Math.PI/2), chS=new THREE.CylinderGeometry(0.018,0.03,0.1,8).rotateZ(-Math.PI/2).translate(-0.2,0,0);
  for(let i=0;i<5;i++){const g=new THREE.Group();g.add(new THREE.Mesh(chG,chM),new THREE.Mesh(chS,stM));L.mesh.add(g);chilis.push(g);}
  // fuego sobre el rival, bozal de fuego alrededor del hocico y sello en cruz sobre la boca
  const fire=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.58,2.2,36,10,true),fx(fireFS(2.2,3.4)));
  const muzzle=new THREE.Mesh(new THREE.TorusGeometry(0.31,0.04,10,48).rotateX(Math.PI/2),fx(`void main(){
   float n=noise(vec3(vUv.x*40.-uT*6.,vUv.y*4.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.8+vec3(1.,.9,.6)*smoothstep(.7,1.,n)*.6,(.5+.6*n)*uA);}`));
  const seal=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float n=noise(vec3(p*4.,uT*3.));
   float ring=band(r,.78+(n-.5)*.08,.07);
   vec2 q=vec2(p.x+p.y,p.x-p.y)*.7071;
   float x=max(smoothstep(.1,.05,abs(q.x))*step(abs(q.y),.6),smoothstep(.1,.05,abs(q.y))*step(abs(q.x),.6));
   float fl=noise(vec3(p*7.-vec2(0.,uT*5.),uT));
   float lick=smoothstep(.25,0.,abs(r-.85))*step(0.,p.y)*smoothstep(.55,.8,noise(vec3(p.x*6.,p.y*3.-uT*6.,0.)));
   float m=max(ring,x)*(.7+.5*fl)+lick*.8;
   vec3 c=mix(uC2,uC1,fl*.7+x*.3)*1.8+vec3(1.,.9,.6)*smoothstep(.8,1.2,m)*.5;
   gl_FragColor=vec4(c,(m+smoothstep(1.,.2,r)*.15)*uA);}`,{depthTest:false}));
  const heat=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float n=noise(vec3(p*5.-vec2(0.,uT*4.),uT));float a=smoothstep(1.,0.,r+(n-.5)*.4);
   gl_FragColor=vec4(mix(uC2,uC1,a)*1.5,a*a*uA);}`,{depthTest:false}));
  L.mesh.add(fire,muzzle,seal,heat);
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TQ=${f(TQ)};const float TQE=${f(TQE)};const float TM=${f(TM)};
  const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 P3=${v3(P3)};const vec3 TP=${v3(TAIL)};${BZ}
  vec3 jp(float u){return bz(P0,P1,P2,P3,clamp(u,0.,1.));}`;
  // picor: llamitas y chispas que salen de la cola antes de la llamarada
  a.count+=points(L.part,50,C+`void main(){float life=.3+aSeed.y*.2;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=TP+vec3((r.x-.5)*.25-age*.2,age*.5,(r.z-.5)*.25);
   vA=(k>=1.&&uT<TQE)?sin(age*3.14159)*smoothstep(0.,TS,uT):0.;put(p,.12+.1*r.y);}`,FLAME_FS);
  // lenguas de fuego a lo largo del chorro
  a.count+=points(L.part,260,C+`void main(){float s=TS+aSeed.x*(TQE-TS);float t=max(uT-s,0.);float u=t*1.9;float age=t/.5;
   vec3 r=rnd();vec3 p=jp(u)+r*(.05+.24*min(u,1.));
   vA=(uT>s&&age<1.)?(1.-age)*.9:0.;put(p,(.12+.22*aSeed.w)*(.5+min(u,1.)));}`);
  // humo rojizo
  a.count+=points(L.part,80,C+`void main(){float s=TS+aSeed.x*(TQE-TS);float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=min(t*1.6,1.);vec3 p=jp(u*.95)+rnd()*.3*u+vec3(0.,.5*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.55:0.;put(p,(.25+.3*aSeed.w)*(.6+age*1.4));}`,SMOKE_FS("vec3(.22,.12,.1)"),NB);
  // rodajas de chile que giran dentro del chorro y rebotan al chocar
  a.count+=points(L.part,60,C+`varying float vR;void main(){float s=TS+.05+aSeed.x*(TQ-TS);float sp=1.5+.4*aSeed.y;float t=max(uT-s,0.);float u=t*sp;
   vec3 r=rnd();vec3 p=jp(u)+r*(.1+.3*min(u,1.));
   if(u>1.){float w=t-1./sp;p+=vec3(-1.2*w+r.x*1.2*w,1.5*w-6.*w*w,r.z*1.2*w);}
   vR=aSeed.z*6.28+t*(8.+aSeed.w*10.);
   vA=(uT>s&&u<1.5&&p.y>0.)?1.-smoothstep(1.2,1.5,u):0.;put(p,.2+.1*aSeed.w);}`,CHILI_FS,NB);
  a.count+=points(L.part,90,C+`varying float vR;void main(){float s=TS+aSeed.x*(TQ-TS);float sp=1.7+.5*aSeed.y;float t=max(uT-s,0.);float u=t*sp;
   vec3 r=rnd();vec3 p=jp(u)+r*(.12+.35*min(u,1.));
   if(u>1.){float w=t-1./sp;p+=vec3(-1.5*w+r.x*1.6*w,1.2*w-7.*w*w,r.z*1.6*w);}
   vR=aSeed.z*6.28+t*12.;vA=(uT>s&&u<1.6&&p.y>0.)?1.-smoothstep(1.3,1.6,u):0.;put(p,.06+.03*aSeed.w);}`,CSEED_FS,NB);
  // el rival arde: llamitas y brasas en bucle
  a.count+=points(L.part,60,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.45,.1+r.y*1.7+age*.4,sin(an)*.45);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.18+.14*r.z)*(1.-age*.4));}`,FLAME_FS);
  // ascuas en torno al sello de la boca
  a.count+=points(L.part,40,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TM)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(3.05+(r.x-.5)*.5,1.35+r.y*.35+age*.45,.3+(r.z-.5)*.4);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.03+.03*r.z);}`);
  a.count+=sparks(L.part,220,TI,`${f(P3.x)},${f(P3.y)},${f(P3.z)}`,"-.4,.4,0.",2.5,7,2.5);
  a.count+=sparks(L.part,80,TM,"3.05,1.52,.3","-.5,.3,.5",2,6,2);
  const scorch=groundPlane(2,3.4,0.015,fx(BURN_FS)), heatRing=groundPlane(2,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*8.,uT*2.));float m=smoothstep(1.,.3,r)*(.3+.7*n)*.5+band(r,.85,.03);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,m*uA);}`));
  L.decal.add(scorch,heatRing);
  a.pose=function(te,o){
    const ia=te-TI, im=te-TM, burn=ss(TI,TI+0.2,te)*(1-ss(TE,TF,te)), hot=ss(0,TS,te)*(1-ss(TQ,TQE+0.2,te));
    caster.rotation.z=-0.08*ss(0,TS,te)+0.16*ss(TS,TS+0.1,te)*(1-ss(TQ,TQE+0.3,te))+0.02*Math.sin(te*50)*hot;
    const hk=cl((te-TS)/(TI-TS)), head=1-Math.pow(1-hk,1.6);
    jet.visible=te>=TS&&te<TQE+0.05; jet.material.uniforms.uQ.value=ss(TQ,TQE,te); set(jet,head*1.02,1);
    chilis.forEach((g,i)=>{const s=TS+0.05+i*0.2,u=(te-s)/0.55;g.visible=u>0&&u<1;
      if(g.visible){curve.getPointAt(u,g.position);g.position.add(tmp.set(0,0.18*Math.sin(u*9+i),0.18*Math.cos(u*7+i*2)));
        aim(g,tmp2.set(Math.cos(te*9+i*2),Math.sin(te*11+i),0.4*Math.sin(te*7+i)),te*6);g.scale.setScalar(1+0.3*Math.sin(u*Math.PI));}});
    towardCam(heat.position,tailW(tmp3),0.3); billboard(heat); heat.visible=hot>0.001; heat.scale.setScalar(0.8+0.3*Math.sin(te*23)); set(heat,0,hot);
    fire.position.set(target.position.x,0.95,0); fire.scale.setScalar(0.85); fire.visible=burn>0.001; set(fire,0.3+0.4*burn,burn);
    const mOn=ss(TM,TM+0.1,te)*(1-ss(TE,TF,te)), slam=im>=0?Math.pow(1-cl(im/0.18),2):0;
    muzzle.position.set(target.position.x,1.5,0); muzzle.rotation.y=te*1.5; muzzle.visible=mOn>0.001;
    muzzle.scale.setScalar(1+0.7*slam); set(muzzle,0,mOn);
    towardCam(seal.position,tmp.set(target.position.x-0.28,1.52,0),0.45); billboard(seal,0.05*Math.sin(te*9));
    seal.visible=mOn>0.001; seal.scale.setScalar(0.62*(1+0.8*slam)); set(seal,0,mOn*(0.85+0.15*Math.sin(te*30)));
    scorch.material.uniforms.uA.value=ia>=0?0.8*(1-ss(TE,TF,te)):0; set(heatRing,0,hot*0.8);
    U.uE.value=burn;
    const h=hitK(ia,5);
    target.position.x=3.4+0.12*h+0.02*Math.sin(te*37)*burn; scorch.position.x=target.position.x; target.rotation.z=-0.22*h*Math.cos(ia*14)+0.04*Math.sin(te*29)*burn-0.1*hitK(im,8);
    o.em=0.45*burn*(0.8+0.2*Math.sin(te*20)); o.emc.copy(U.uC2.value);
    if(te<TS){o.g.copy(tmp3);o.gs=0.9*hot;o.ga=0.35*hot;o.li=2.5*hot;}
    else if(te<TI){curve.getPointAt(head,o.g);o.gs=1.6;o.ga=0.5;o.li=6;}
    else{o.g.copy(P3);o.gs=1.7+1.6*Math.min(ia,0.4);o.ga=Math.exp(-ia*8)*0.7+0.2*burn;o.li=8*Math.exp(-ia*5)+3*burn;}
    if(te<TM){o.ia=ia;o.c.copy(P3);o.shake=0;o.dist=0.8;o.flash=1;}
    else{o.ia=im;o.c.copy(seal.position);o.shake=0;o.dist=0.5;o.flash=0.6;}
  };
}};

// =====================================================================
// 5 · MYSTERY SEED — una semilla mágica sale de la cola y se entierra en una casilla; al terminar la ronda
//     brota una flor y, cuando un aliado la pisa, se deshace en pétalos que lo curan
// =====================================================================
const seedA={key:"ptSeed",name:"Mystery Seed",dur:4.3,ti:0.95,pal:"Sakura",allies:1,
  phases:[["Semilla",0],["Vuelo",0.35],["Siembra",0.95],["Fin de ronda",1.65],["Floración",1.95],["Pisada",2.6],["Curación",3.15]],
build(a){
  const L=a.L,TL=0.35,TI=0.95,TBu=1.3,TR=1.65,TBl=1.95,TO=2.5,TW=2.6,TH=3.15,TE=4.0,TF=4.3;
  const S=V3(-0.3,0,-0.55),A0=ALLY_POS[0],P0=V3(-4.25,0.9,0),SH=2.3;
  const sp=(t,out)=>{const k=cl((t-TL)/(TI-TL));return out.set(P0.x+(S.x-P0.x)*k,P0.y+(0.12-P0.y)*k+4*SH*k*(1-k),P0.z+(S.z-P0.z)*k);};
  // semilla: cáscara opaca con espiral mágica que se enciende
  const seed=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),fx(`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
   float n=noise(vP*14.);vec3 husk=mix(vec3(.25,.15,.08),vec3(.5,.32,.16),n);
   float sw=band(fract(an/6.2832*3.+q.y*1.2+uT*.3),.5,.08);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(husk*${LIT}+uC1*(sw*(.8+1.5*uA)+fr*.6*uA),1.);}`,SOLID));
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(HALO_FS,{depthTest:false}));
  L.mesh.add(seed,halo);
  // flor: tallo que crece, dos hojas, seis pétalos que se abren y un corazón de polen
  const F=new THREE.Group(); F.position.copy(S); L.mesh.add(F);
  const stem=new THREE.Mesh(taperTube(curve3(V3(0,0,0),V3(0.06,0.18,0),V3(-0.06,0.38,0),V3(0,0.55,0)),40,8,0.035,0.022),fx(STEM_FS,SOLID)); F.add(stem);
  const leafM=fxU(LEAFP_FS("vec3(.1,.34,.08)","vec3(.4,.78,.22)",0.05),{uK:{value:0}},DS), leaves=[];
  for(const s of [-1,1]){const pv=new THREE.Group();pv.position.set(0,0.12,0);pv.rotation.set(0,s>0?0.4:Math.PI+0.4,-0.9);
    pv.add(new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.3).translate(0,0.15,0),leafM));F.add(pv);leaves.push(pv);}
  const head=new THREE.Group(); head.position.set(0,0.55,0); F.add(head);
  const petalM=fx(`void main(){float v=vUv.y,u=vUv.x-.5;float w=.5*pow(sin(3.1416*pow(v,.6)),.7);if(abs(u)>w)discard;
   if(noise(vec3(vUv*8.,7.))<1.-uA*1.15)discard;
   float vein=band(u/max(w,.01),0.,.15)*.3;
   vec3 c=mix(uC2*.9,uC1,v)*(1.+vein)+vec3(1.)*smoothstep(.7,1.,v)*.2;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*(.7+.3*fr)+uC1*uP*.6,1.);}`,DS), petals=[];
  for(let i=0;i<6;i++){const pv=new THREE.Group();pv.rotation.y=i*Math.PI/3;const m=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.36,1,3).translate(0,0.18,0),petalM);
    pv.add(m);head.add(pv);petals.push(m);}
  const pistil=new THREE.Mesh(new THREE.SphereGeometry(0.075,16,12),fx(`void main(){float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float n=noise(vP*60.);gl_FragColor=vec4(mix(vec3(1.,.85,.3),uC1,fr)*(1.2+n*.6)*(.6+.8*uP),uA);}`)); head.add(pistil);
  // columna de curación sobre el aliado
  const column=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.5,2.0,32,6,true),fx(`void main(){float h=vP.y/2.+.5;
   float n=noise(vec3(atan(vP.z,vP.x)*3.,h*6.-uT*3.,uT));float bands=band(fract(h*3.-uT*1.5),.5,.12);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.3,(bands*.5+fr*.4)*(.5+.5*n)*smoothstep(1.,.3,h)*uA);}`)); L.mesh.add(column);
  // casilla marcada, barrido del fin de ronda y aro bajo el aliado (lo sigue)
  const tile=groundPlane(1.4,S.x,0.02,fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float e=max(q.x,q.y);
   float border=band(e,.92,.025)+band(e,.8,.01)*.5;float corner=step(.7,q.x)*step(.7,q.y)*band(e,.92,.06);
   float r=length(p);float an=atan(p.y,p.x);
   float sig=band(r,.45,.02)+band(r,.32,.015)*step(.5,fract(an/6.2832*8.+uT*.2))+smoothstep(.15,0.,r)*uP;
   float pulse=.75+.25*sin(uT*4.);
   vec3 c=mix(uC2,uC1,min(sig+uQ*.5,1.))*1.4;
   gl_FragColor=vec4(c,(border*.7+corner+sig*pulse*(.5+uP))*uA+uQ*smoothstep(1.,0.,e)*.4*uA);}`,{uQ:{value:0}}));
  tile.position.z=S.z;
  const sweep=groundPlane(16,0,0.022,fx(`void main(){float x=vUv.x;float d=uP-x;
   float m=band(d,0.,.012)*1.2+step(0.,d)*exp(-d*6.)*.35;
   float n=noise(vec3(vUv*vec2(30.,15.),uT));
   gl_FragColor=vec4(mix(uC1,vec3(1.,.95,.8),.5)*1.2,m*(.7+.3*n)*uA);}`),9);
  const allyRing=groundPlane(1.8,0,0.025,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.82,.03)+pow(abs(cos(an*3.+uT)),16.)*smoothstep(.85,.4,r)*step(.35,r)*.6+smoothstep(.8,0.,r)*.15;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.25)*1.3,m*uA);}`));
  const landRing=groundPlane(1.9,S.x,0.03,fx(RING_FS)); landRing.position.z=S.z;
  L.decal.add(tile,sweep,allyRing,landRing);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TBu=${f(TBu)};const float TBl=${f(TBl)};const float TO=${f(TO)};const float TH=${f(TH)};
  const vec3 P0=${v3(P0)};const vec3 S=${v3(S)};
  vec3 sp(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return vec3(mix(P0.x,S.x,k),mix(P0.y,.12,k)+4.*${f(SH)}*k*(1.-k),mix(P0.z,S.z,k));}`;
  // luz que se condensa en la cola formando la semilla
  a.count+=points(L.part,60,C+`void main(){float life=.3;float age=(uT-aSeed.x*(TL-.25))/life;
   vec3 d=normalize(rnd()+vec3(0.,.001,0.));vec3 p=P0+d*mix(.9,.04,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.04*aSeed.z);}`);
  // estela de destellos durante el vuelo
  a.count+=points(L.part,120,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=sp(s)+rnd()*.06+rnd()*.25*t+vec3(0.,-.3*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.05*aSeed.w)*(1.-age*.5));}`);
  // tierra que salta al enterrarse
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=S+vec3(cos(an),0.,sin(an))*(.1+.6*(1.-exp(-t*4.)))*(.5+aSeed.w)+vec3(0.,.05+.4*(1.-exp(-t*3.))*aSeed.y,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.2+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.2;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=S+vec3((aSeed.z-.5)*.8,.1+t*.9,(aSeed.w-.5)*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.18+.12*aSeed.w);}`,STAR4_FS);
  a.count+=sparks(L.part,110,TI,`${f(S.x)},.12,${f(S.z)}`,"0.,.9,0.",2,6,2);
  // la casilla respira mientras la semilla duerme; motas mágicas alrededor de la flor
  a.count+=points(L.part,60,C+`void main(){float life=.8+aSeed.y*.5;float k=(uT-TBu)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=S+vec3((r.x-.5)*1.1,.03+age*(.5+r.y*.6),(r.z-.5)*1.1);
   vA=(k>=1.&&uT<TH)?sin(age*3.14159)*.8:0.;put(p,.03+.04*r.z);}`);
  a.count+=points(L.part,40,C+`void main(){float s=TO-.15+aSeed.x*.1;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=S+vec3(0.,.55,0.)+normalize(rnd()+vec3(0.,.4,0.))*(.15+.45*aSeed.z)*(1.-exp(-t*4.));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.12+.1*aSeed.w);}`,STAR4_FS);
  // curación: pétalos en espiral, polen y cruces que suben por el aliado
  a.count+=points(L.part,60,C+`varying float vR;void main(){float s=TH+aSeed.x*.25;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*(4.+aSeed.w*2.);float rad=.45+.35*age;
   vec3 p=S+vec3(cos(an)*rad,.1+age*(1.9+aSeed.w*.6),sin(an)*rad);vR=an*2.;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.2+.08*aSeed.w);}`,PETAL_PT_FS,NB);
  a.count+=points(L.part,140,C+`void main(){float s=TH+aSeed.x*.5;float life=.7+aSeed.y*.5;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*6.;float rad=.3+.4*aSeed.w;
   vec3 p=S+vec3(cos(an)*rad,.05+age*2.3,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;put(p,.03+.04*aSeed.w);}`);
  a.count+=points(L.part,26,C+`void main(){float life=.9;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=S+vec3((r.x-.5)*1.1,.3+age*1.8,(r.z-.5)*1.1);
   vA=(k>=1.&&uT<${f(TE)})?sin(age*3.14159):0.;put(p,.26*sin(age*3.14159)+.04);}`,CROSS_FS);
  a.count+=sparks(L.part,100,TH,`${f(S.x)},.3,${f(S.z)}`,"0.,1.,0.",2,7,1.5);
  a.pose=function(te,o){
    const ii=te-TI, ih=te-TH, form=ss(0.03,TL,te);
    caster.rotation.z=0.1*ss(0,TL,te)-0.18*ss(TL,TL+0.08,te)+0.08*ss(TL+0.2,TI,te);
    // semilla
    let sy=0.12;
    if(te<TL){tailW(seed.position).add(tmp.set(-0.05,0.2*form,0));}
    else if(te<TI)sp(te,seed.position);
    else{sy=0.12-0.34*ss(TI,TBu,te)+0.03*Math.sin(ii*30)*Math.exp(-ii*5);seed.position.set(S.x,sy,S.z);}
    seed.visible=te<TBu+0.05&&form>0.01; seed.scale.set(0.11*form,0.16*form,0.11*form); seed.rotation.set(0.4,te*7,te*3);
    seed.material.uniforms.uA.value=form;
    const bur=te>=TI&&te<TBl+0.3, rf=Math.exp(-Math.abs(te-TR)*6)*(te>TR-0.3?1:0);
    towardCam(halo.position,te<TI?seed.position:tmp.set(S.x,0.15,S.z),0.2); billboard(halo);
    halo.visible=te<TBl+0.3; halo.scale.setScalar(te<TI?0.6:0.9+0.4*Math.sin(te*5)); set(halo,0,te<TI?0.7*form:(bur?(0.3+0.6*Math.exp(-ii*4)+0.6*rf):0));
    let p=cl(ii/0.6); set(landRing,p,ii>=0?(1-p)*0.8:0);
    tile.material.uniforms.uQ.value=rf; set(tile,ss(TR,TBl,te),ss(TI,TI+0.3,te)*(1-ss(TH,TH+0.6,te)));
    set(sweep,cl((te-TR+0.35)/0.75),ss(TR-0.35,TR-0.2,te)*(1-ss(TR+0.25,TR+0.45,te)));
    // flor
    const g1=ss(TBl,TBl+0.35,te), g2=ss(TBl+0.15,TBl+0.4,te), g3=ss(TBl+0.25,TBl+0.45,te), op=cl((te-TBl-0.35)/(TO-TBl-0.35));
    const sq=1-ss(TH-0.06,TH+0.1,te);
    F.visible=te>=TBl&&te<TH+0.15; F.scale.set(1+0.4*(1-sq),Math.max(sq,0.001),1+0.4*(1-sq)); F.rotation.z=0.05*Math.sin(te*2);
    stem.material.uniforms.uP.value=g1;
    leaves.forEach(l=>l.scale.setScalar(Math.max(g2,0.001))); leafM.uniforms.uA.value=1;
    head.scale.setScalar(Math.max(g3,0.001));
    const ang=0.12+1.05*(1-Math.pow(1-op,3))+0.12*Math.sin(Math.PI*op);
    petals.forEach(m=>m.rotation.x=ang+0.04*Math.sin(te*2.5));
    const fade=1-ss(TH-0.02,TH+0.15,te); set({material:petalM},0.4*Math.exp(-Math.max(te-TO,0)*2)+0.2*ss(TW,TH,te),fade);
    set(pistil,op,fade);
    // el aliado camina a saltitos hasta la casilla y la pisa
    const al=allies[0], wk=cl((te-TW)/(TH-TW)), we=ss(0,1,wk);
    al.position.set(A0.x+(S.x-A0.x)*we,te>=TW&&te<TH?0.22*Math.abs(Math.sin(wk*Math.PI*2)):0,A0.z+(S.z-A0.z)*we);
    al.rotation.z=te>=TW&&te<TH?-0.12*Math.sin(wk*Math.PI*2):0;
    allyRing.position.set(al.position.x,0.025,al.position.z);
    const he=ss(TH,TH+0.2,te)*(1-ss(TE,TF,te));
    set(allyRing,0,0.35+0.65*he);
    column.position.set(al.position.x,1.0,al.position.z); column.visible=he>0.001; set(column,0,he*0.9);
    U.uE.value=he;
    const am=al.userData.m; am.emissive.copy(U.uC1.value); am.emissiveIntensity=ih>=0?0.9*Math.exp(-ih*3)+0.35*he:0;
    if(te<TL){o.g.copy(seed.position);o.gs=0.8*form;o.ga=0.4*form;o.li=2.5*form;}
    else if(te<TI){sp(te,o.g);o.gs=1;o.ga=0.5;o.li=3.5;}
    else if(te<TBl){o.g.set(S.x,0.25,S.z);o.gs=1.4;o.ga=Math.exp(-ii*6)*0.7+0.15+0.3*rf;o.li=6*Math.exp(-ii*4)+1.5+3*rf;}
    else if(te<TH){o.g.set(S.x,0.6,S.z);o.gs=1.6*g3;o.ga=0.3*g3;o.li=3*g3;}
    else{o.g.set(al.position.x,1.0,al.position.z);o.gs=1.8;o.ga=0.6*Math.exp(-ih*4)+0.15*he;o.li=6*Math.exp(-ih*3)+2*he;}
    if(te<TH){o.ia=ii;o.c.set(S.x,0.2,S.z);o.shake=0;o.dist=0.55;}
    else{o.ia=ih;o.c.set(al.position.x,1.1,al.position.z);o.shake=0;o.dist=0.8;}
    o.flash=0;
  };
}};

// =====================================================================
// 6 · POTATO LEAF — raíces desde la cola y hojas de patata que brotan alrededor del Axie formando un escudo
//     camuflado; dos ataques enemigos chocan contra las hojas y se desvían hasta estrellarse en el suelo
// =====================================================================
const CAMO_FS=`uniform float uK;uniform float uS;
void main(){float v=vUv.y,u=vUv.x-.5;
 float w=.48*pow(sin(3.1416*pow(v,.72)),.85)*(1.+.04*sin(v*36.));
 if(abs(u)>w)discard;
 if(noise(vec3(vUv*7.,5.))<1.-uA*1.15)discard;
 float rib=smoothstep(.025,0.,abs(u))*smoothstep(.98,.6,v);
 float vein=band(fract(v*6.-abs(u)*2.2),.5,.07)*smoothstep(w,w*.25,abs(u));
 float m1=noise(vec3(vUv*vec2(5.,7.),2.)),m2=noise(vec3(vUv*vec2(11.,15.),9.));
 vec3 c=vec3(.2,.42,.14);
 c=mix(c,vec3(.1,.24,.08),smoothstep(.5,.6,m1));
 c=mix(c,vec3(.32,.3,.2),smoothstep(.62,.7,m2));
 c=mix(c,vec3(.11,.12,.18),smoothstep(.55,.65,m2*m1*1.8)*uS);
 c*=1.+rib*.5+vein*.3;
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 float scan=band(v+u*.4,uP*1.6-.3,.06);
 float sh=fr*uS*(.5+.5*sin(uT*4.+v*12.));
 vec3 col=c*(.6+.4*abs(dot(normalize(vN),vec3(0.,0.,1.))))+uC1*(scan*.9+sh*.25+uK*1.2);
 gl_FragColor=vec4(col,1.-.22*uS);}`;
const PTA=V3(3.0,1.3,0), PCP=[V3(-2.92,1.18,0.2),V3(-2.9,0.8,-0.3)], PGP=[V3(-2.15,0,0.8),V3(-2.2,0,-0.95)], PBL=[0.74,1.24], PSP=12, PDF=0.2;
const PTC=PBL.map((l,j)=>l+PTA.distanceTo(PCP[j])/PSP);
const PDC=PCP.map((c,j)=>V3(c.x+0.5,c.y+0.05,c.z+(PGP[j].z-c.z)*0.25));
const potato={key:"ptPotato",name:"Potato Leaf",dur:3.0,ti:PTC[0],pal:"Savia",
  phases:[["Raíces",0],["Brote",0.25],["Camuflaje",0.75],["Desvío",PTC[0]],["Disipación",2.35]],
build(a){
  const L=a.L,R=0.95,NL=7,TCm=0.75,TD=2.35,TF=2.95,CX=-3.7;
  const pBolt=(t,j,out)=>{const Cp=PCP[j];if(t<PTC[j])return out.lerpVectors(PTA,Cp,cl((t-PBL[j])/(PTC[j]-PBL[j])));
    const k=cl((t-PTC[j])/PDF),s=1-k,D=PDC[j],G=PGP[j];
    return out.set(s*s*Cp.x+2*s*k*D.x+k*k*G.x,s*s*Cp.y+2*s*k*D.y+k*k*G.y,s*s*Cp.z+2*s*k*D.z+k*k*G.z);};
  // hojas: pivote en el suelo, plano tangente al anillo e inclinado hacia dentro
  const leaves=[], TH_=[];
  for(let i=0;i<NL;i++){const th=-1.95+i*3.9/(NL-1);TH_.push(th);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.85,1,6).translate(0,0.925,0),fxU(CAMO_FS,{uK:{value:0},uS:{value:0}},
      {blending:THREE.NormalBlending,transparent:true,depthWrite:true,side:THREE.DoubleSide}));
    const pv=new THREE.Group();pv.position.set(CX+Math.cos(th)*R,0,Math.sin(th)*R);pv.rotation.order="YXZ";pv.rotation.y=Math.PI/2-th;
    pv.add(m);L.mesh.add(pv);leaves.push({pv,m,th,g:0.25+(1.95-Math.abs(th))/1.95*0.3});}
  // qué hoja recibe cada impacto
  const hitLeaf=PCP.map(c=>{const an=Math.atan2(c.z,c.x-CX);let b=0;TH_.forEach((t,i)=>{if(Math.abs(t-an)<Math.abs(TH_[b]-an))b=i;});return b;});
  const comets=PBL.map(()=>mkComet(L.mesh,0.9,0.36));
  const glints=PBL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // raíces que se extienden bajo el lanzador
  const roots=groundPlane(2.4,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float br=pow(abs(sin(an*3.5+noise(vec3(p*3.,1.))*2.5)),40.)*smoothstep(1.,.2,r);
   float br2=pow(abs(sin(an*7.+noise(vec3(p*6.,4.))*3.)),60.)*smoothstep(.8,.1,r)*.6;
   float reach=step(r,uP);float ring=band(r,.68,.04)*.7;
   gl_FragColor=vec4(mix(uC2,uC1,br)*1.3,((br+br2)*reach+ring*reach+smoothstep(.7,0.,r)*.1)*uA);}`));
    const rings=PGP.map(g=>{const m=groundPlane(1.6,g.x,0.03,fx(RING_FS));m.position.z=g.z;return m;});   // nivel 2: solo onda, sin cráter
  L.decal.add(roots,...rings);
  const C=`const vec3 A=${v3(PTA)};const vec3 C0=${v3(PCP[0])};const vec3 C1=${v3(PCP[1])};const vec3 D0=${v3(PDC[0])};const vec3 D1=${v3(PDC[1])};
  const vec3 G0=${v3(PGP[0])};const vec3 G1=${v3(PGP[1])};const float L0=${f(PBL[0])};const float L1=${f(PBL[1])};const float T0=${f(PTC[0])};const float T1=${f(PTC[1])};
  const float PDF=${f(PDF)};const vec3 TP=${v3(TAIL)};const float CX=${f(CX)};
  vec3 pb(float t,float j){vec3 Cp=j<.5?C0:C1;float L=j<.5?L0:L1;float Tc=j<.5?T0:T1;
   if(t<Tc)return mix(A,Cp,clamp((t-L)/(Tc-L),0.,1.));
   float k=clamp((t-Tc)/PDF,0.,1.),s=1.-k;vec3 D=j<.5?D0:D1;vec3 G=j<.5?G0:G1;return s*s*Cp+2.*s*k*D+k*k*G;}`;
  // savia que baja de la cola al suelo
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.22;float life=.25;float age=(uT-s)/life;
   vec3 p=TP+vec3((aSeed.y-.5)*.2,-age*.7,(aSeed.z-.5)*.2);
   vA=(age>0.&&age<1.)?1.-age*.5:0.;put(p,.04+.03*aSeed.w);}`);
  // tierra que levantan las hojas al brotar
  a.count+=points(L.part,70,C+`void main(){float an=-1.95+aSeed.x*3.9;float s=.25+(1.95-abs(an))/1.95*.3+aSeed.y*.06;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(CX+cos(an)*${f(R)},0.,sin(an)*${f(R)})+vec3(cos(an),0.,sin(an))*.4*(1.-exp(-t*4.))+vec3(0.,.3*(1.-exp(-t*3.))*aSeed.w,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.18+.18*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // clorofila que sube de las hojas mientras dura el escudo
  a.count+=points(L.part,70,C+`void main(){float life=1.+aSeed.y*.6;float k=(uT-.75)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=-1.95+r.x*3.9;vec3 p=vec3(CX+cos(an)*${f(R*0.95)},.1+age*1.9,sin(an)*${f(R*0.95)});
   vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.03+.04*r.z);}`);
  // brasas de los proyectiles enemigos
  a.count+=points(L.part,110,C+`void main(){float j=aSeed.x<.5?0.:1.;float L=j<.5?L0:L1;float E=(j<.5?T0:T1)+PDF;float s=L+fract(aSeed.x*2.)*(E-L);
   float life=.22+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=pb(s,j)+rnd()*.05+rnd()*.25*t;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.05*aSeed.w);}`,RED_FS);
  // trocitos de hoja y destellos verdes en el roce
  a.count+=points(L.part,36,C+`varying float vR;void main(){float j=aSeed.x<.5?0.:1.;vec3 Cp=j<.5?C0:C1;float s=(j<.5?T0:T1)+aSeed.y*.03;float life=.6+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.6,.3,0.))*(1.+1.5*aSeed.w);vec3 p=Cp+v*t+vec3(0.,-2.5*t*t,0.);vR=aSeed.z*6.28+t*9.;
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.12+.06*aSeed.w);}`,LEAF_PT_FS,NB);
  a.count+=points(L.part,20,C+`void main(){float j=aSeed.x<.5?0.:1.;vec3 Cp=j<.5?C0:C1;float s=j<.5?T0:T1;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=Cp+normalize(rnd())*(.1+.5*aSeed.z)*(1.-exp(-t*6.));vA=(age>0.&&age<1.)?1.-age:0.;put(p,.16+.1*aSeed.w);}`,STAR4_FS);
  // el proyectil desviado se estrella: polvo y chispas rojas
  a.count+=points(L.part,70,C+`void main(){float j=aSeed.x<.5?0.:1.;vec3 G=j<.5?G0:G1;float s=(j<.5?T0:T1)+PDF;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=G+vec3(cos(an),0.,sin(an))*(.1+.6*(1.-exp(-t*4.)))+vec3(0.,.05+.5*(1.-exp(-t*2.5))*aSeed.w,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age):0.;put(p,(.22+.22*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,80,C+`void main(){float j=aSeed.x<.5?0.:1.;vec3 G=j<.5?G0:G1;float s=(j<.5?T0:T1)+PDF;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.3,1.,0.))*(1.5+2.2*aSeed.z);vec3 p=G+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.02);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.04*aSeed.w);}`,RED_FS);
  a.pose=function(te,o){
    const env=ss(TCm,TCm+0.3,te)*(1-ss(TD,TF,te)), diss=1-ss(TD,TF,te);U.uE.value=env;
    caster.rotation.z=0.06*ss(0,0.25,te)-0.1*ss(0.25,0.35,te)+0.04*ss(0.4,0.8,te);
    leaves.forEach((l,i)=>{const gr=ss(l.g,l.g+0.35,te);let flex=0,hk=0;
      PTC.forEach((t,j)=>{if(hitLeaf[j]===i){const h=hitK(te-t,7);hk+=h;flex+=0.22*h*Math.sin((te-t)*25);}else if(Math.abs(hitLeaf[j]-i)===1)flex+=0.06*hitK(te-t,7)*Math.sin((te-t)*25);});
      const s=Math.max(gr,0.001)*(1+0.1*Math.sin(Math.PI*gr))*0.88;l.pv.scale.setScalar(s);l.pv.visible=gr>0.001;
      l.pv.rotation.x=-(-0.7*(1-gr)+0.18*gr)+flex; l.pv.rotation.z=0.05*Math.sin(te*1.3+i);
      const u=l.m.material.uniforms;u.uA.value=diss;u.uS.value=ss(TCm,TCm+0.35,te);u.uP.value=cl((te-TCm)/0.55);u.uK.value=0.9*hk;});
    set(roots,ss(0,0.45,te),ss(0,0.1,te)*diss);
    PBL.forEach((l,j)=>{const m=comets[j],end=PTC[j]+PDF;pBolt(te,j,tmp);pBolt(te-0.015,j,tmp2);
      m.visible=te>=l&&te<end; m.position.copy(tmp); billboard(m,Math.atan2(tmp.y-tmp2.y,tmp.x-tmp2.x));
      const after=te>PTC[j]; m.scale.setScalar(after?0.85:1); set(m,after?0.75:1,ss(l,l+0.05,te));
      const ic=te-PTC[j];let p=cl(ic/0.35); towardCam(glints[j].position,PCP[j],0.25); billboard(glints[j]); glints[j].visible=ic>=0&&p<1; set(glints[j],p,1-p);
      const ig=te-end; p=cl(ig/0.5); set(rings[j],p,ig>=0?(1-p)*0.6:0);});
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*env;
    const rk=hitK(te-PBL[0],8)+hitK(te-PBL[1],8); target.rotation.z=0.12*rk; o.em=0.5*rk; o.emc.setRGB(1,0.25,0.1);
    const j=te>=PTC[1]?1:0, ic=te-PTC[j];
    if(te<PTC[0]){o.g.set(CX+0.6,0.9,0);o.gs=2*ss(0.25,0.8,te);o.ga=0.25*ss(0.25,0.8,te);o.li=2.5*ss(0.25,0.8,te);}
    else{o.g.copy(PCP[j]);o.gs=1.4+2*Math.min(ic,0.4);o.ga=Math.exp(-ic*8)*0.7+0.1*env;o.li=7*Math.exp(-ic*5)+1.5*env;}
    o.ia=ic; o.c.copy(PCP[j]); o.shake=0; o.dist=0.55; o.flash=0;
  };
}};

// =====================================================================
// 7 · SHIELD SHROOM — esporas doradas caen de la cola y del suelo brota un hongo de sombrero ancho que se
//     abre sobre el Axie como una sombrilla blindada, con esporas doradas que caen bajo él
// =====================================================================
const CAP_FS=`uniform float uH;
void main(){vec2 xz=vP.xz/1.13;float r=length(xz);float an=atan(xz.y,xz.x);
 float sec=fract(an/6.2832*8.);float seam=smoothstep(.04,0.,min(sec,1.-sec)*r*6.)*step(.18,r)+band(r,.55,.02)+band(r,.18,.02)+band(r,.97,.03);
 float da=(fract(an/6.2832*16.)-.5)*.3927*r;float rv=smoothstep(.04,.018,length(vec2(da,r-.76)));
 float db=(fract(an/6.2832*8.+.5)-.5)*.785*r;rv+=smoothstep(.035,.015,length(vec2(db,r-.37)));
 float n=noise(vP*6.)*.6+noise(vP*17.)*.4;
 vec3 c=mix(vec3(.5,.2,.08),vec3(.82,.5,.22),n);
 c=mix(c,vec3(.95,.88,.7),smoothstep(.62,.68,noise(vec3(xz*5.,2.)))*step(.2,r));
 vec3 N=normalize(vN);vec3 V=normalize(vV);
 float spec=pow(max(dot(reflect(-V,N),normalize(vec3(.3,.8,.5))),0.),18.);
 float rip=uH>=0.?band(r,uH*2.5,.1)*exp(-uH*3.):0.;
 c=c*${LIT}*(1.-seam*.6)+vec3(1.,.9,.7)*spec*.45+uC1*(rv*(1.+spec*2.)+rip*1.5+seam*uA*.6);
 gl_FragColor=vec4(c,1.);}`;
const shroom={key:"ptShroom",name:"Shield Shroom",dur:3.4,ti:0.95,pal:"Dorado",
  phases:[["Esporas",0],["Crecimiento",0.3],["Apertura",0.72],["Blindaje",0.95],["Lluvia de esporas",1.5],["Cierre",2.85]],
build(a){
  const L=a.L,TG=0.3,TGE=0.75,TO=0.72,TI=0.95,TC_=2.85,TF=3.3;
  const B=V3(-4.55,0,-0.4),TOPP=V3(-3.72,2.62,0),curve=curve3(B,V3(-4.85,1.1,-0.45),V3(-4.5,2.45,-0.2),TOPP);
  const stem=new THREE.Mesh(taperTube(curve,80,12,0.13,0.075),fx(`void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*30.,vUv.y*20.,0.));
   vec3 c=mix(vec3(.7,.62,.5),vec3(.92,.86,.72),n)*${LIT};gl_FragColor=vec4(c+uC1*smoothstep(uP-.06,uP,u)*.8,1.);}`,SOLID));
  L.mesh.add(stem);
  // sombrero: casquete achatado con placas, remaches y láminas inferiores que brillan
  const capG=new THREE.Group(); L.mesh.add(capG);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,56,16,0,Math.PI*2,0,1.05).scale(1.3,0.55,1.3).translate(0,-0.274,0),fxU(CAP_FS,{uH:{value:-1}},DS));
  const gills=new THREE.Mesh(new THREE.CircleGeometry(1.12,64).rotateX(Math.PI/2).translate(0,-0.005,0),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float g=pow(abs(cos(an*48.)),6.)*smoothstep(.15,.3,r);
   vec3 c=vec3(.42,.33,.22)*(.5+.5*g)+uC1*g*(.4+1.2*uA)*smoothstep(.2,1.,r);
   gl_FragColor=vec4(c,1.);}`,DS));
  capG.add(dome,gills);
  // onda dorada que baja del borde del sombrero al abrirse
  const openRing=new THREE.Mesh(new THREE.PlaneGeometry(3,3).rotateX(-Math.PI/2),fx(RING_FS)); L.mesh.add(openRing);
  const C=`const float TG=${f(TG)};const float TI=${f(TI)};const vec3 B=${v3(B)};const vec3 TP=${v3(TAIL)};const float CX=-3.72;`;
  // esporas que caen de la cola al punto donde nacerá el hongo
  a.count+=points(L.part,45,C+`void main(){float s=aSeed.x*.25;float life=.35;float k=clamp((uT-s)/life,0.,1.);
   vec3 p=mix(TP,B,k)+vec3(0.,sin(k*3.14159)*.35,0.)+rnd()*.12;
   vA=(uT>s&&k<1.)?.9:0.;put(p,.04+.03*aSeed.w);}`);
  // tierra que levanta el hongo al brotar (nivel 2: sin astillas ni grieta)
  a.count+=points(L.part,50,C+`void main(){float s=TG+aSeed.x*.08;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=B+vec3(cos(an),0.,sin(an))*(.1+.7*(1.-exp(-t*4.)))*(.5+aSeed.w)+vec3(0.,.05+.5*(1.-exp(-t*3.))*aSeed.y,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.22+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // nube de esporas al abrirse y cortina dorada que cae bajo el sombrero
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),-.15,sin(an));vec3 p=vec3(CX,2.58,0.)+d*(.95+.8*(1.-exp(-t*3.)))+vec3(0.,-.5*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.05+.05*aSeed.w);}`);
  a.count+=points(L.part,230,C+`void main(){float life=2.2+aSeed.y*.8;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=sqrt(r.y)*.92;
   vec3 p=vec3(CX+cos(an)*rad,2.55-age*2.55,sin(an)*rad)+vec3(sin(age*7.+r.z*9.)*.12,0.,cos(age*5.+r.x*9.)*.12);
   vA=(uT>TI)?smoothstep(0.,.3,uT-TI)*smoothstep(0.,.06,age)*(1.-smoothstep(.85,1.,age))*uE:0.;put(p,.035+.035*r.z);}`);
  a.count+=points(L.part,40,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=sqrt(r.y)*1.;vec3 p=vec3(CX+cos(an)*rad,.2+r.z*2.2,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.12+.1*r.z);}`,STAR4_FS);
  const disc=groundPlane(2.6,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=smoothstep(.9,.8,r)*.18+band(r,.86,.025)*.8+band(r,uP,.05)*(1.-uP);
   float sp=step(.985,hash(vec3(floor(p*40.),floor(uT*6.))))*smoothstep(.9,.3,r);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.2)*1.3,(m+sp)*uA);}`));
  L.decal.add(disc);
  a.pose=function(te,o){
    const ia=te-TI, gk=cl((te-TG)/(TGE-TG)), grow=1-Math.pow(1-gk,2), shut=ss(TC_,TF,te);
    const env=ss(TI,TI+0.2,te)*(1-ss(TC_,TF,te)); U.uE.value=env;
    caster.rotation.z=0.05*ss(0,TG,te)-0.08*ss(TI,TI+0.08,te)+0.03*ss(TI+0.1,TI+0.5,te);
    stem.visible=te>=TG; set(stem,grow*(1-shut),1);
    // capullo en la punta del tallo; se abre con rebote y se cierra al final
    const ok=cl((te-TO)/(TI-TO)), op=ok<1?1-Math.pow(1-ok,3)+0.25*Math.sin(Math.PI*ok):1+0.06*Math.exp(-ia*5)*Math.sin(ia*25);
    curve.getPointAt(Math.max(grow*(1-shut),0.001),capG.position);
    const sc=te<TO?0:op*(1-shut);
    capG.scale.set(Math.max(0.32+0.68*sc,0.001)*(1-shut*0.7),Math.max((1.5-0.5*cl(sc))*(1-shut),0.001),Math.max(0.32+0.68*sc,0.001)*(1-shut*0.7));
    capG.scale.multiplyScalar(0.88); capG.rotation.z=-0.5*(1-cl(sc))*(1-shut); capG.visible=te>=TG&&te<TF;
    dome.material.uniforms.uH.value=ia>=0&&ia<1?ia*1.5:-1; dome.material.uniforms.uA.value=env;
    gills.material.uniforms.uA.value=env*(0.7+0.3*Math.sin(te*3));
    let p=cl(ia/0.6); openRing.position.set(-3.72,2.45-2.3*p,0); openRing.visible=ia>=0&&p<1; openRing.scale.setScalar(0.75+0.35*p); set(openRing,p,(1-p)*0.8);
    set(disc,cl(ia/0.6),env);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*env+0.4*hitK(ia,5)*(ia>=0?1:0);
    if(te<TG){tailW(o.g);o.gs=0.8;o.ga=0.25*ss(0,0.1,te);o.li=1.5;}
    else if(te<TI){o.g.copy(capG.position);o.gs=1.2;o.ga=0.3;o.li=3;}
    else{o.g.set(-3.72,2.3,0);o.gs=2;o.ga=Math.exp(-ia*6)*0.5+0.12*env;o.li=5.5*Math.exp(-ia*4)+2*env;}
    o.ia=ia; o.c.set(-3.72,2.5,0); o.shake=0; o.dist=0.6;
    o.flash=0;
  };
}};

// =====================================================================
// 8 · SPROUT — una gota de savia de la cola despierta una onda de crecimiento: brota hierba luminosa bajo
//     los pies de todo el escuadrón y cada uno recibe un impulso de movimiento (estelas, saltito y huellas)
// =====================================================================
const GRASS_VS=`uniform float uT;uniform float uP;attribute vec3 aB;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
void main(){vUv=uv;float id=uv.x,h=uv.y;
 float g=clamp((uP-id*.3)/.35,0.,1.);float gg=1.-pow(1.-g,3.)+.2*sin(3.1416*g);
 vec3 p=aB+(position-aB)*gg;
 p.x+=sin(uT*3.+id*40.)*.05*h*h*g;p.z+=cos(uT*2.4+id*31.)*.05*h*h*g;
 vP=p;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const GRASS_FS=`void main(){float h=vUv.y;float id=vUv.x;
 vec3 c=mix(vec3(.05,.2,.06),mix(vec3(.3,.8,.25),uC1,.6),h);
 float pulse=band(h,fract(uT*.8+id)*1.2,.1)*.6;
 gl_FragColor=vec4(c*(1.+h*h*1.4*uA)+uC1*pulse*uA,1.);}`;
function grassGeo(n,r0,r1,h0,h1){const pos=[],uv=[],base=[];
  for(let i=0;i<n;i++){const an=Math.random()*Math.PI*2,r=r0+(r1-r0)*Math.sqrt(Math.random()),x=Math.cos(an)*r,z=Math.sin(an)*r;
    const h=h0+(h1-h0)*Math.random(),w=0.022+0.018*Math.random(),ba=Math.random()*Math.PI,lx=Math.cos(an)*0.15*h,lz=Math.sin(an)*0.15*h;
    const bx=Math.cos(ba)*w,bz=Math.sin(ba)*w,id=Math.random();
    pos.push(x-bx,0,z-bz,x+bx,0,z+bz,x+lx,h,z+lz); uv.push(id,0,id,0,id,1);
    for(let k=0;k<3;k++)base.push(x,0,z);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute("aB",new THREE.Float32BufferAttribute(base,3));g.computeVertexNormals();return g;}
const sprout={key:"ptSprout",name:"Sprout",dur:2.8,ti:0.42,pal:"Savia",allies:2,
  phases:[["Savia",0],["Brote",0.42],["Pradera",0.8],["Impulso",1.2],["Fin",2.3]],
build(a){
  const L=a.L,TI=0.42,WS=4.5,TM=1.2,TE=2.3,TF=2.75;
  const MP=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]], TG=MP.map(p=>TI+Math.hypot(p.x+3.7,p.z)/WS), TJ=TG.map((t,i)=>Math.max(t+0.35,TM)+i*0.08);
  const who=[caster,allies[0],allies[1]];
  const tufts=[], discs=[], prints=[];
  MP.forEach((m,i)=>{
    const t=new THREE.Mesh(grassGeo(80,0.16,0.7,0.14,0.36),fx(GRASS_FS,Object.assign({vertexShader:GRASS_VS},DS)));t.position.copy(m);L.mesh.add(t);tufts.push(t);
    const d=groundPlane(1.7,m.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
     float rays=pow(abs(cos(an*5.+r*3.)),12.)*smoothstep(1.,.3,r)*.5;
     float m=smoothstep(1.,.1,r)*.35+band(r,.88,.03)+rays;
     gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*uA);}`));d.position.z=m.z;L.decal.add(d);discs.push(d);
    // huellas luminosas por delante: el impulso de movimiento
    const pr=groundPlane(2.4,m.x+1.2,0.024,fx(`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(2.4,.9);float m=0.;
     for(int i=0;i<4;i++){float fi=float(i);vec2 c=vec2(.55+fi*.5,(mod(fi,2.)-.5)*.3);
      float on=smoothstep(fi*.2,fi*.2+.1,uP)*(1.-smoothstep(fi*.2+.45,fi*.2+.8,uP));
      vec2 q=p-c;float pad=smoothstep(.09,.06,length(q*vec2(1.,1.5)));
      float toes=0.;for(int t=0;t<3;t++){float ft=float(t)-1.;toes+=smoothstep(.04,.025,length(q-vec2(.11,ft*.065)));}
      m+=(pad+toes)*on;}
     gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.4,min(m,1.)*uA);}`),0.9);pr.position.z=m.z;L.decal.add(pr);prints.push(pr);});
  // onda de crecimiento por el tablero desde el lanzador
  const wave=groundPlane(7.4,-3.7,0.03,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float jag=noise(vec3(an*8.,0.,1.))*.04;float front=band(r+jag,uP,.03+.03*(1.-uP));
   float behind=step(r,uP)*smoothstep(uP-.35,uP,r)*.25*(.5+.5*noise(vec3(p*14.,uT)));
   gl_FragColor=vec4(mix(uC2,uC1,front)*1.5,(front+behind)*uA);}`)); L.decal.add(wave);
  const C=`const float TI=${f(TI)};const float TM=${f(TM)};const vec3 TP=${v3(TAIL)};
  const vec3 M0=${v3(MP[0])};const vec3 M1=${v3(MP[1])};const vec3 M2=${v3(MP[2])};
  const float G0=${f(TG[0])};const float G1=${f(TG[1])};const float G2=${f(TG[2])};
  const float J0=${f(TJ[0])};const float J1=${f(TJ[1])};const float J2=${f(TJ[2])};
  vec3 mp(float j){return j<.5?M0:(j<1.5?M1:M2);}float tg(float j){return j<.5?G0:(j<1.5?G1:G2);}float tj(float j){return j<.5?J0:(j<1.5?J1:J2);}`;
  // gota de savia que cae de la cola al suelo
  a.count+=points(L.part,40,C+`void main(){float s=.05+aSeed.x*.25;float life=.18;float k=clamp((uT-s)/life,0.,1.);
   vec3 p=mix(TP,vec3(-3.95,.02,0.),k*k)+rnd()*.05;vA=(uT>s&&k<1.)?.9:0.;put(p,.05+.03*aSeed.w);}`);
  // destellos y hojitas al brotar bajo cada uno
  a.count+=points(L.part,90,C+`void main(){float j=floor(aSeed.x*3.);float s=tg(j)+aSeed.y*.1;float life=.5+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=mp(j)+vec3(cos(an)*(.2+.6*fract(aSeed.w*7.)),.05+t*(.8+aSeed.z),sin(an)*(.2+.6*fract(aSeed.w*7.)));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.z);}`);
  a.count+=points(L.part,45,C+`varying float vR;void main(){float j=floor(aSeed.x*3.);float s=tg(j)+aSeed.y*.08;float life=.7+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.5,0.))*(1.2+1.5*aSeed.w);vec3 p=mp(j)+v*t+vec3(0.,-3.*t*t,0.);vR=aSeed.z*6.28+t*8.;
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.12+.06*aSeed.w);}`,LEAF_PT_FS,NB);
  // estelas de velocidad a la altura de los pies: el +1 de movimiento
  a.count+=points(L.part,120,C+`void main(){float j=floor(aSeed.x*3.);float life=.28+aSeed.y*.15;float k=(uT-tj(j))/life+fract(aSeed.x*3.);float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=mp(j)+vec3(.3-age*1.6,.06+r.y*.55,(r.z-.5)*.9);
   vA=(k>=1.&&uT<tj(j)+1.)?sin(age*3.14159)*(1.-smoothstep(tj(j)+.6,tj(j)+1.,uT)):0.;put(p,.5+.3*r.x);}`,STREAK_FS);
  // espiral de hojas en los pies durante el impulso
  a.count+=points(L.part,60,C+`varying float vR;void main(){float j=floor(aSeed.x*3.);float t=uT-tj(j);float an=aSeed.y*6.2832+t*7.;float rad=.55+.1*sin(t*5.+aSeed.z*6.);
   vec3 p=mp(j)+vec3(cos(an)*rad,.08+aSeed.z*.5+t*.3,sin(an)*rad);vR=an;
   vA=(t>0.&&t<.9)?sin(t/.9*3.14159):0.;put(p,.12+.06*aSeed.w);}`,LEAF_PT_FS,NB);
  a.pose=function(te,o){
    const env=1-ss(TE,TF,te);
    caster.rotation.z=0.08*ss(0,0.3,te)-0.12*ss(0.3,0.42,te)+0.04*ss(0.42,0.8,te);
    set(wave,cl((te-TI)*WS/3.7),te>=TI-0.02?1-ss(1.0,1.4,te):0);
    let last=0;
    MP.forEach((m,i)=>{const ig=te-TG[i],ij=te-TJ[i],hop=ij>=0&&ij<0.3?Math.sin(Math.PI*ij/0.3):0;if(ig>=0)last=i;
      tufts[i].visible=ig>=0; set(tufts[i],cl(ig/0.45),(0.6+0.8*hitK(ig,3)+0.6*hitK(ij,4))*env);
      set(discs[i],0,ss(TG[i],TG[i]+0.2,te)*env);
      set(prints[i],cl(ij/0.9),ij>=0?env:0);
      const w=who[i];w.position.y+=0.2*hop;w.rotation.z+=-0.14*hop;
      const em=w.userData.m;em.emissive.copy(U.uC1.value);em.emissiveIntensity=(0.6*hitK(ig,4)+0.5*hop+0.12*ss(TG[i],TG[i]+0.3,te))*env;});
    U.uE.value=env;
    const il=te-TG[last];
    if(te<TI){tailW(o.g);o.gs=0.8;o.ga=0.3*ss(0,0.2,te);o.li=2;}
    else{o.g.set(MP[last].x,0.4,MP[last].z);o.gs=1.6+2*Math.min(il,0.4);o.ga=Math.exp(-il*6)*0.6+0.1*env;o.li=6*Math.exp(-il*4)+1.5*env;}
    o.ia=te<TI?te-TI:il; o.c.set(MP[last].x,0.3,MP[last].z); o.shake=0; o.dist=0.4; o.flash=0;
  };
}};

// =====================================================================
// 9 · TROPICAL GUARDIAN — una raíz corre desde la cola y del tablero emerge un tótem de cabezas talladas;
//     sus ojos de rubí se encienden y escupe tres ráfagas de dardos de bambú contra el rival
// =====================================================================
const FACE_FS=`uniform float uI;uniform float uE;uniform float uF;
void main(){float an=atan(vP.z,vP.x);vec2 fp=vec2(an*.31,vP.y);
 float n=noise(vec3(an*2.,vP.y*26.,uI*7.))*.6+noise(vec3(an*9.,vP.y*60.,uI))*.4;
 vec3 wood=mix(vec3(.3,.16,.07),vec3(.56,.33,.15),n);
 vec3 p1=uI<.5?vec3(.05,.62,.58):(uI<1.5?vec3(.95,.45,.08):vec3(.95,.78,.15));
 vec3 p2=uI<.5?vec3(.95,.78,.15):(uI<1.5?vec3(.05,.62,.58):vec3(.9,.2,.25));
 float bt=step(.2,abs(vP.y));float zig=step(.155,abs(vP.y))*(1.-bt)*step(.5,fract(an*3.+abs(vP.y)*18.));
 vec3 c=mix(wood,p1,bt*.85);c=mix(c,p2,zig*.85);
 float face=smoothstep(.3,.6,cos(an));
 float e=length(vec2(abs(fp.x)-.1,fp.y-.04)/vec2(.055,.04));float ruby=smoothstep(1.,.7,e);float sock=smoothstep(1.5,1.,e)-ruby;
 float brow=smoothstep(.02,0.,abs(fp.y-(.1+.35*max(abs(fp.x)-.05,0.))))*step(abs(fp.x),.2);
 float nose=step(abs(fp.x),.025)*step(-.07,fp.y)*step(fp.y,.05);
 float mo=step(abs(fp.x),.13)*step(-.165,fp.y)*step(fp.y,-.09);
 float teeth=mo*step(-.12,fp.y)*step(.5,fract(fp.x*28.));
 c=mix(c,c*.35,(sock+brow+nose*.5)*face);
 c=mix(c,vec3(.05,.02,.02),mo*face);c=mix(c,vec3(.9,.85,.7),teeth*face);
 c*=${LIT};
 vec3 rub=mix(vec3(.4,0.,.06),vec3(1.,.12,.3)*2.6,uE)+vec3(1.)*smoothstep(.5,.2,length(vec2(abs(fp.x)-.115,fp.y-.055)/vec2(.02,.015)))*.6;
 c=mix(c,rub,ruby*face);
 c+=uC1*mo*(1.-teeth)*face*uF*2.;
 gl_FragColor=vec4(c,1.);}`;
const WOOD_FS=`void main(){float n=noise(vec3(vP.x*3.,vP.y*30.,vP.z*3.))*.6+noise(vP*40.)*.4;
 vec3 c=mix(vec3(.3,.16,.07),vec3(.56,.33,.15),n);
 float st=step(.5,fract((vP.x+vP.z)*6.));c=mix(c,mix(vec3(.05,.62,.58),vec3(.95,.45,.08),st),.55*step(.3,fract(vP.y*8.)));
 gl_FragColor=vec4(c*${LIT},1.);}`;
const BAMBOO_FS=`void main(){float x=vP.x;float node=band(fract(x*4.6+.3),.5,.06);
 float n=noise(vec3(x*40.,vP.y*80.,vP.z*80.));
 vec3 c=mix(vec3(.55,.62,.18),vec3(.85,.85,.4),n*.6)*(1.-node*.45)*${LIT};
 gl_FragColor=vec4(c+uC1*.05,1.);}`;
const totem={key:"ptTotem",name:"Tropical Guardian",dur:3.6,ti:1.53,pal:"Tropical",
  phases:[["Raíz",0],["Emerger",0.2],["Ojos de rubí",0.85],["Dardos",1.2],["Retirada",2.95]],
build(a){
  const L=a.L,TP=V3(-2.25,0,1.2),TRY=-0.45,TU0=0.2,TU1=0.8,TEY=0.85,TRET=2.95,TF=3.5,FL=0.33,VOL=[1.2,1.6,2.0],ND=6;
  const cs=Math.cos(TRY),sn=Math.sin(TRY);
  const loc=(lx,ly,lz,out)=>out.set(TP.x+lx*cs+lz*sn,ly,TP.z-lx*sn+lz*cs);
  const MZ=[loc(0.32,0.81,0,V3(0,0,0)),loc(0.32,1.33,0,V3(0,0,0))];      // bocas: cabeza media y cabeza alta
  const dS=j=>VOL[j>>1]+(j&1)*0.07, dM=j=>(j&1)?MZ[0]:MZ[1], dH=j=>V3(3.02,1.0+0.16*(j%3),-0.2+0.08*j);
  // tótem: pedestal, tres cabezas talladas, alas pintadas y penacho de hojas
  const tot=new THREE.Group(); tot.position.copy(TP); tot.rotation.y=TRY; L.mesh.add(tot);
  const woodM=fx(WOOD_FS,SOLID);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.16,0.8),woodM); plinth.position.y=0.08; tot.add(plinth);
  const faces=[];
  for(let h=0;h<3;h++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.33,0.5,28,1),fxU(FACE_FS,{uI:{value:h},uE:{value:0},uF:{value:0}},SOLID));
    m.position.y=0.41+h*0.52;tot.add(m);faces.push(m);}
  for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.24,0.46),woodM);w.position.set(-0.02,0.95,s*0.5);w.rotation.x=s*0.35;tot.add(w);}
  const crestA=fxU(LEAFP_FS("vec3(.02,.35,.3)","vec3(.15,.75,.6)",0.1),{uK:{value:0}},DS), crestB=fxU(LEAFP_FS("vec3(.6,.2,.04)","vec3(1.,.6,.15)",0.1),{uK:{value:0}},DS);
  for(let i=0;i<5;i++){const pv=new THREE.Group();pv.position.set(0,1.68,0);pv.rotation.z=(i-2)*0.42;
    pv.add(new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.7).translate(0,0.35,0),i%2?crestB:crestA));tot.add(pv);}
  // dardos de bambú: origen en la punta
  const shaftG=new THREE.CylinderGeometry(0.022,0.022,0.46,8).rotateZ(-Math.PI/2).translate(-0.29,0,0);
  const tipG=new THREE.ConeGeometry(0.03,0.07,8).rotateZ(-Math.PI/2).translate(-0.035,0,0);
  const fletG=new THREE.PlaneGeometry(0.1,0.16).translate(0,0.08,0).rotateZ(Math.PI/2).translate(-0.48,0,0);
  const bambooM=fx(BAMBOO_FS,SOLID), tipM=fx(`void main(){gl_FragColor=vec4(vec3(.18,.12,.1)*${LIT}+uC1*.15,1.);}`,SOLID);
  const darts=[];
  for(let j=0;j<ND;j++){const g=new THREE.Group();g.add(new THREE.Mesh(shaftG,bambooM),new THREE.Mesh(tipG,tipM),new THREE.Mesh(fletG,crestB),new THREE.Mesh(fletG.clone().rotateX(Math.PI/2),crestB));
    L.mesh.add(g);darts.push(g);}
  // destellos de los ojos y fogonazos en las bocas
  const glints=faces.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.24),fx(`void main(){vec2 p=vUv-.5;
   float e=smoothstep(.09,0.,length((abs(p)-vec2(.13,0.))*vec2(1.,2.2)));float st=smoothstep(.02,0.,abs(p.y))*smoothstep(.5,0.,abs(p.x))*.6;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*2.,(e+st)*uA);}`,{depthTest:false}));L.mesh.add(m);return m;});
  const flashes=MZ.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),fx(HALO_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // raíz que corre por el suelo desde la cola hasta el tótem y onda al emerger
  const R0=V3(-4.15,0,0), rd=V3(TP.x-R0.x,0,TP.z-R0.z), rl=rd.length();
  const root=groundPlane(rl,(R0.x+TP.x)/2,0.022,fx(`void main(){float u=vUv.x;float y=vUv.y-.5-.12*sin(u*14.+1.)*(1.-u*.3);
   float line=smoothstep(.07,0.,abs(y))*step(u,uP);float head=smoothstep(.12,0.,abs(u-uP))*step(u,uP+.01);
   float pulse=band(fract(u*3.-uT*2.),.5,.15)*line;
   gl_FragColor=vec4(mix(uC2,uC1,pulse+head)*1.5,(line*.6+pulse*.5+head)*uA);}`),0.5);
  root.position.z=(R0.z+TP.z)/2; root.rotation.y=Math.atan2(-rd.z,rd.x);
  const shock=groundPlane(2.6,TP.x,0.03,fx(RING_FS)), tshock=groundPlane(1.9,3.4,0.03,fx(RING_FS));
  shock.position.z=TP.z; L.decal.add(root,shock,tshock);
  const C=`const float TU0=${f(TU0)};const float TU1=${f(TU1)};const float TEY=${f(TEY)};const float FL=${f(FL)};
  const float V0=${f(VOL[0])};const float V1=${f(VOL[1])};const float V2=${f(VOL[2])};
  const vec3 TP=${v3(TP)};const vec3 R0=${v3(R0)};const vec3 MZ0=${v3(MZ[0])};const vec3 MZ1=${v3(MZ[1])};
  float dS(float j){float v=floor(j/2.);return (v<.5?V0:(v<1.5?V1:V2))+mod(j,2.)*.07;}
  vec3 dH(float j){return vec3(3.02,1.+.16*mod(j,3.),-.2+.08*j);}
  vec3 dP(float t,float j){float k=clamp((t-dS(j))/FL,0.,1.);vec3 M=mod(j,2.)>.5?MZ0:MZ1;return mix(M,dH(j),k)+vec3(0.,.3*sin(3.14159*k),0.);}`;
  // savia que recorre la raíz
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*(TU0+.1);float life=.25;float k=clamp((uT-s)/life,0.,1.);
   vec3 p=mix(R0,TP,k)+vec3((aSeed.y-.5)*.15,.05+aSeed.z*.15,(aSeed.w-.5)*.15);
   vA=(uT>s&&k<1.)?.9:0.;put(p,.04+.03*aSeed.w);}`);
  // tierra y chispas al emerger (nivel 2: sin astillas ni grieta)
  a.count+=points(L.part,80,C+`void main(){float s=TU0+aSeed.x*(TU1-TU0);float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an),0.,sin(an))*(.3+.55*(1.-exp(-t*3.)))+vec3(0.,.05+.4*(1.-exp(-t*3.))*aSeed.w,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.25+.25*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,110,TU1,`${f(TP.x)},.2,${f(TP.z)}`,"0.,.8,0.",2,7,2.5);
  // chispas de rubí al encenderse los ojos
  a.count+=points(L.part,30,C+`void main(){float s=TEY+aSeed.x*.1;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float h=floor(aSeed.z*3.);vec3 p=TP+vec3(.3,.45+h*.52,.15)+normalize(rnd())*(.1+.4*aSeed.w)*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.12+.08*aSeed.w);}`,STAR4_FS);
  // estela de cada dardo y astillas de bambú al clavarse
  a.count+=points(L.part,150,C+`void main(){float j=floor(aSeed.x*6.);float s=dS(j)+aSeed.y*FL;float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dP(s,j)+rnd()*.03+rnd()*.15*t;vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.03+.03*aSeed.w);}`);
  a.count+=points(L.part,108,C+`void main(){float j=floor(aSeed.x*6.);float s=dS(j)+FL;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.9,.4,0.))*(1.5+2.5*aSeed.z);vec3 p=dH(j)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,48,C+`void main(){float j=floor(aSeed.x*6.);float s=dS(j);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 M=mod(j,2.)>.5?MZ0:MZ1;vec3 p=M+vec3(.25*t+(aSeed.z-.5)*.2,.3*t,(aSeed.w-.5)*.2);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.12+.1*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.5,.45,.4)"),NB);
  VOL.forEach(v=>{a.count+=sparks(L.part,70,v+FL,"3.02,1.16,0.","-.6,.3,0.",2,7,2.5);});
  // hojas que revolotean alrededor del tótem
  a.count+=points(L.part,30,C+`varying float vR;void main(){float life=1.2+aSeed.y*.6;float k=(uT-TU1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;vec3 p=TP+vec3(cos(an)*(.6+r.y*.3),.2+age*2.,sin(an)*(.6+r.y*.3));vR=an*2.;
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.14+.06*r.z);}`,LEAF_PT_FS,NB);
  a.pose=function(te,o){
    const uk=cl((te-TU0)/(TU1-TU0)), back=1+1.7*Math.pow(uk-1,3)+0.7*Math.pow(uk-1,2), sink=ss(TRET,TF,te);
    const env=ss(TU1,TU1+0.2,te)*(1-sink); U.uE.value=env;
    caster.rotation.z=0.06*ss(0,TU0,te)-0.1*ss(TU0,TU0+0.1,te)+0.04*ss(TU0+0.2,TU1,te);
    tot.position.set(TP.x+(te<TU1?0.03*Math.sin(te*70)*(te>TU0?1:0):0),-1.9*(1-(te<TU0?0:back))-1.9*sink,TP.z); tot.visible=te>=TU0-0.01&&sink<1;
    const eye=ss(TEY,TEY+0.25,te)*(1-sink);
    let fire=0;VOL.forEach(v=>fire+=hitK(te-v,9)*(te>=v?1:0));
    faces.forEach(m=>{const u=m.material.uniforms;u.uE.value=eye*(0.8+0.2*Math.sin(te*6))+0.6*fire;u.uF.value=fire;});
    crestA.uniforms.uA.value=crestB.uniforms.uA.value=1;
    glints.forEach((g,h)=>{loc(0.36,0.45+h*0.52,0,tmp);tmp.y+=tot.position.y;towardCam(g.position,tmp,0.2);billboard(g);
      const fl=hitK(te-TEY-h*0.05,4)*(te>=TEY+h*0.05?1:0)+0.5*fire;g.visible=fl>0.01;g.scale.set(1+1.5*fl,1,1);set(g,0,Math.min(fl,1));});
    flashes.forEach((m,i)=>{towardCam(m.position,MZ[i],0.2);billboard(m);m.visible=fire>0.01;m.scale.setScalar(0.6+0.6*fire);set(m,0,fire);});
    // dardos
    let lastV=-1;
    darts.forEach((g,j)=>{const s=dS(j),ht=s+FL,M=dM(j),H=dH(j);
      if(te>=ht&&(j>>1)>lastV)lastV=j>>1;
      if(te<s||te>ht+0.4){g.visible=false;return;}
      g.visible=true;
      if(te<ht){const k=(te-s)/FL;g.position.lerpVectors(M,H,k);g.position.y+=0.3*Math.sin(Math.PI*k);
        tmp2.subVectors(H,M);tmp2.y+=0.3*Math.PI*Math.cos(Math.PI*k);aim(g,tmp2,te*20);g.scale.setScalar(1);}
      else{const q=te-ht;g.position.copy(H);tmp2.subVectors(H,M);tmp2.y+=-0.94+0.12*Math.exp(-q*10)*Math.sin(q*70);aim(g,tmp2,0);
        g.scale.setScalar(Math.max(1-ss(0.3,0.4,q),0.001));}});
    set(root,ss(0,TU0+0.15,te),ss(0,0.05,te)*(1-ss(TU1+0.4,TU1+1,te)));
    let p=cl((te-TU1)/0.6); set(shock,p,te>=TU1?(1-p)*0.8:0);
    const lt=lastV>=0?VOL[lastV]+FL:0, ih=te-lt;
    p=cl(ih/0.4); towardCam(hitRing.position,TC,0.4); billboard(hitRing); hitRing.visible=lastV>=0&&p<1; set(hitRing,p,lastV>=0?1-p:0);
    p=cl(ih/0.6); set(tshock,p,lastV>=0?(1-p)*0.6:0);
    let kn=0;darts.forEach((g,j)=>kn+=hitK(te-dS(j)-FL,9));
    target.position.x=3.4+0.08*kn; target.rotation.z=-0.1*kn*Math.cos(te*30); tshock.position.x=target.position.x;
    o.em=0.25*kn; o.emc.copy(U.uC1.value);
    const iu=te-TU1;
    if(te<TU0){o.g.set(-3.2,0.3,0.6);o.gs=1;o.ga=0.25;o.li=2;}
    else if(lastV<0){o.g.set(TP.x+0.3,1.2,TP.z);o.gs=1.6+eye;o.ga=0.25+0.4*eye*hitK(te-TEY,3);o.li=3+4*eye*hitK(te-TEY,3)+3*fire;}
    else{o.g.copy(TC);o.gs=1.2+2*Math.min(ih,0.4);o.ga=Math.exp(-ih*10)*0.7+0.1;o.li=6*Math.exp(-ih*6)+2*env;}
    if(lastV<0){o.ia=iu;o.c.set(TP.x,0.4,TP.z);o.shake=0;o.dist=0.5;o.flash=0;}
    else{o.ia=ih;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=1;}
  };
}};

// =====================================================================
// 10 · YAM — un ñame silvestre crece en la cola, sale lanzado en parábola y estalla sobre el rival en gas
//      púrpura que se extiende por el carril de los rivales y envenena a todos los que alcanza
// =====================================================================
const yam={key:"ptYam",name:"Yam",dur:3.4,ti:1.0,pal:"Miasma",enemies:2,
  phases:[["Tubérculo",0],["Lanzamiento",0.35],["Estallido",1.0],["Nube",1.15],["Veneno",1.45],["Fin",2.85]],
build(a){
  const L=a.L,TL=0.35,TI=1.0,TE=2.85,TF=3.35,GS=6;
  const E0=ENEMY_POS[0],E1=ENEMY_POS[1],UD=E1.clone().sub(E0),LEN=UD.length(),EXT=0.75; UD.normalize();
  const LA=E0.clone().addScaledVector(UD,-EXT),LLn=LEN+2*EXT,PERP=V3(-UD.z,0,UD.x),MID=LA.clone().addScaledVector(UD,LLn/2);
  const proj=p=>((p.x-LA.x)*UD.x+(p.z-LA.z)*UD.z)/LLn;
  const RP=[V3(3.4,0,0),E0,E1], ST=proj(RP[0]), SRs=RP.map(proj), TPz=SRs.map(s=>TI+0.05+Math.abs(s-ST)*LLn/GS);
  const B=V3(3.15,1.15,0.05),P0=V3(-4.3,0.95,0),YH=1.7;
  const yp=(t,out)=>{const k=cl((t-TL)/(TI-TL));return out.set(P0.x+(B.x-P0.x)*k,P0.y+(B.y-P0.y)*k+4*YH*k*(1-k),P0.z+(B.z-P0.z)*k);};
  // ñame: esfera deformada (si la geometría lo permite) con piel parda, ojos y grietas que brillan
  const yg=new THREE.SphereGeometry(1,32,24), ya=yg.attributes&&yg.attributes.position;
  if(ya){for(let i=0;i<ya.count;i++){const x=ya.getX(i),y=ya.getY(i),z=ya.getZ(i);
    const k=1+0.12*Math.sin(x*3.1+y*2.3)+0.08*Math.sin(z*5.3+x*1.7)+0.06*Math.sin(y*7.1+z*2.9);ya.setXYZ(i,x*k,y*k*1.45,z*k*0.95);}
    ya.needsUpdate=true;yg.computeVertexNormals();}
  const yamM=new THREE.Mesh(yg,fx(`void main(){vec3 q=normalize(vP);
   float n=noise(vP*9.)*.6+noise(vP*23.)*.4;vec3 skin=mix(vec3(.28,.17,.12),vec3(.5,.34,.24),n);
   float eyes=smoothstep(.72,.78,noise(vP*5.+3.));float hair=smoothstep(.04,0.,abs(fract(q.y*9.+noise(vP*3.)*2.)-.5))*.25;
   float cr=pow(1.-abs(noise(vP*6.+vec3(uT*.5))*2.-1.),10.)*uA;
   gl_FragColor=vec4(skin*${LIT}*(1.-eyes*.6-hair)+mix(uC2,uC1,cr)*cr*2.5,1.);}`,SOLID));
  L.mesh.add(yamM);
  // estallido: bola aditiva y bocanada de gas oscuro (mezcla normal)
  const pop=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); pop.position.copy(B);
  const puff=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(`void main(){
   float n=noise(vP*2.4+vec3(0.,-uT*1.2,0.))*.65+noise(vP*5.)*.35;float d=n-(uP*1.1-.1);if(d<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(vec3(.22,.08,.3),vec3(.35,.6,.2),smoothstep(.3,.0,d)*.4)+uC1*.15,smoothstep(0.,.15,d)*fr*.8*uA);}`,NB));
  puff.position.copy(B); puff.renderOrder=-1;
  L.mesh.add(pop,puff);
  // carril de los rivales marcado en el suelo (el gas lo recorre desde el estallido)
  const lane=groundPlane(LLn,MID.x,0.02,fxU(`uniform float uS;
  void main(){float x=vUv.x,y=abs(vUv.y-.5)*2.;
   float reach=step(abs(x-uS),uP);float front=band(abs(x-uS),uP,.015)*step(uP,.99);
   float edge=band(y,.9,.05);float hatch=band(fract((x*${f(LLn)}+y*.5)*2.-uT*.6),.5,.12)*step(y,.85)*.35;
   float n=noise(vec3(x*20.,y*4.,uT*.5));
   vec3 c=mix(vec3(.5,1.,.3),uC1,.4+.4*n);
   gl_FragColor=vec4(c*1.2,((edge+hatch)*reach+front)*uA*(.7+.3*n));}`,{uS:{value:ST}}),0.9);
  lane.position.z=MID.z; lane.rotation.y=Math.atan2(-UD.z,UD.x);
  // charco venenoso bajo cada rival
  const pools=RP.map(r=>{const m=groundPlane(1.2,r.x,0.024,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,uT*.8))*.6+noise(vec3(p*16.,uT*1.3))*.4;float e=r+(n-.5)*.35;
   float m=smoothstep(.85,.7,e);float rim=band(e,.78,.05);float bub=step(.93,hash(vec3(floor(p*22.),floor(uT*5.))))*m;
   gl_FragColor=vec4(mix(vec3(.25,.5,.15),uC1,.5+.5*n)*(1.+rim)+vec3(.8,1.,.6)*bub,(m*.45+rim*.6+bub)*uA);}`));m.position.z=r.z;return m;});
  L.decal.add(lane,...pools);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 B=${v3(B)};
  const vec3 LA=${v3(LA)};const vec3 UD=${v3(UD)};const vec3 PERP=${v3(PERP)};const float LLn=${f(LLn)};const float ST=${f(ST)};const float GS=${f(GS)};
  const vec3 R0=${v3(RP[0])};const vec3 R1=${v3(RP[1])};const vec3 R2=${v3(RP[2])};const float T0=${f(TPz[0])};const float T1=${f(TPz[1])};const float T2=${f(TPz[2])};
  vec3 yp(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,B,k)+vec3(0.,4.*${f(YH)}*k*(1.-k),0.);}`;
  // raicillas de luz mientras el tubérculo crece en la cola
  a.count+=points(L.part,40,C+`void main(){float life=.3;float age=(uT-aSeed.x*(TL-.25))/life;
   vec3 d=normalize(rnd()+vec3(0.,.001,0.));vec3 p=P0+d*mix(.8,.05,age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.03*aSeed.z);}`);
  // jirones púrpuras en el vuelo
  a.count+=points(L.part,100,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=yp(s)+rnd()*.08+rnd()*.25*t+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,(.05+.08*aSeed.w)*(1.+age));}`);
  // trozos de tubérculo y chispas del estallido
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(1.5+2.2*aSeed.z);vec3 p=B+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.06*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.4;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.4,.26,.18),uC1*.9,smoothstep(.25,0.,d)*.6),a);}`,NB);
  a.count+=sparks(L.part,200,TI,`${f(B.x)},${f(B.y)},${f(B.z)}`,"-.2,.5,0.",2,6,2.5);
  // gas a lo largo del carril: nace donde llega el frente y se renueva en bucle
  a.count+=points(L.part,260,C+`void main(){float s=aSeed.x;float tb=TI+abs(s-ST)*LLn/GS;float life=1.1+aSeed.y*.7;float k=(uT-tb)/life;float c=floor(k);float age=fract(k);vec3 r=rr(c+1.);
   vec3 p=LA+UD*s*LLn+PERP*(r.x-.5)*.6+UD*(r.z-.5)*.3+vec3(0.,.1+age*(.4+r.y*.5),0.);
   vA=(k>=0.)?sin(age*3.14159)*.7*uE:0.;put(p,(.26+.24*r.z)*(.6+age*.9));}`,SMOKE_FS("vec3(.36,.14,.48)"),NB);
  a.count+=points(L.part,120,C+`void main(){float s=aSeed.x;float tb=TI+abs(s-ST)*LLn/GS;float life=.6+aSeed.y*.5;float k=(uT-tb)/life;float c=floor(k);float age=fract(k);vec3 r=rr(c+3.);
   vec3 p=LA+UD*s*LLn+PERP*(r.x-.5)*.55+vec3(0.,.1+age*(.35+.5*r.y),0.);
   vA=(k>=0.)?sin(age*3.14159)*.55*uE:0.;put(p,(.08+.12*r.z));}`);
  // burbujas y gotas de veneno en cada rival
  a.count+=points(L.part,120,C+`void main(){float j=floor(aSeed.x*3.);vec3 RP=j<.5?R0:(j<1.5?R1:R2);float tp=j<.5?T0:(j<1.5?T1:T2);
   float life=.7+aSeed.y*.5;float k=(uT-tp)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=RP+vec3((r.x-.5)*.55,.2+r.y*1.+age*.5,(r.z-.5)*.55);
   vA=(uT>tp&&k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.12*r.z)*(.6+.4*age));}`,PBUB_FS);
  a.count+=points(L.part,60,C+`void main(){float j=floor(aSeed.x*3.);vec3 RP=j<.5?R0:(j<1.5?R1:R2);float tp=j<.5?T0:(j<1.5?T1:T2);
   float life=.5+aSeed.y*.3;float k=(uT-tp)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=RP+vec3(cos(an)*.28,.4+r.y*.8-age*age*.8,sin(an)*.28);
   vA=(uT>tp&&k>=1.&&p.y>0.)?(1.-age)*uE:0.;put(p,.05+.03*r.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q*vec2(1.4,1.))+q.y*.2;float a=smoothstep(.4,.3,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.2,.45,.1),vec3(.4,.12,.5),vMix),a);}`,NB);
  const C3=[new THREE.Color(0.55,1,0.3),new THREE.Color(0.75,0.3,1)];
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.03,TL,te), env=ss(TI,TI+0.2,te)*(1-ss(TE,TF,te)); U.uE.value=env;
    caster.rotation.z=0.1*ss(0,TL,te)-0.22*ss(TL,TL+0.08,te)+0.12*ss(TL+0.2,TI,te);
    if(te<TL){tailW(yamM.position).add(tmp.set(-0.1*form,0.25*form,0));}else yp(te,yamM.position);
    yamM.visible=te<TI&&form>0.01; yamM.scale.setScalar(0.14*Math.max(form,0.001)*(1+0.08*Math.sin(te*25)*ss(0.6,TI,te)));
    yamM.rotation.set(te*(te<TL?0.5:7),te*2,0.4); yamM.material.uniforms.uA.value=ss(0.1,TI,te);
    let p=cl(ia/0.55); pop.visible=ia>=0&&p<1; pop.scale.setScalar(0.2+0.8*(1-Math.pow(1-p,3))); set(pop,p,1);
    p=cl((ia-0.05)/1.1); puff.visible=ia>=0.05&&p<1; puff.scale.setScalar(0.3+0.9*(1-Math.pow(1-p,2))); set(puff,p,1);
    const spread=Math.max(ia,0)*GS/LLn;
    lane.material.uniforms.uS.value=ST; set(lane,Math.min(spread,1),ss(TI,TI+0.1,te)*(1-ss(TE,TF,te)));
    // cada rival se envenena cuando el frente de gas lo alcanza
    const tint=(i)=>ss(TPz[i],TPz[i]+0.15,te)*(1-ss(TE,TF,te));
    pools.forEach((m,i)=>set(m,0,tint(i)));
    const mixc=0.5+0.5*Math.sin(te*5);
    [enemies[0],enemies[1]].forEach((d,k)=>{const i=k+1,tn=tint(i),em=d.userData.m;
      em.emissive.setRGB(C3[0].r+(C3[1].r-C3[0].r)*mixc,C3[0].g+(C3[1].g-C3[0].g)*mixc,C3[0].b+(C3[1].b-C3[0].b)*mixc);
      em.emissiveIntensity=tn*(0.35+0.15*Math.sin(te*9+k))+0.8*hitK(te-TPz[i],6);
      d.rotation.z=-0.06*hitK(te-TPz[i],6)*Math.cos((te-TPz[i])*16)+0.02*Math.sin(te*7+k)*tn;});
    const h=hitK(ia,5); target.position.x=3.4+0.12*h; pools[0].position.x=target.position.x; target.rotation.z=-0.15*h*Math.cos(ia*14)+0.02*Math.sin(te*6)*tint(0);
    o.em=tint(0)*(0.35+0.15*Math.sin(te*9)); o.emc.setRGB(C3[0].r+(C3[1].r-C3[0].r)*mixc,C3[0].g+(C3[1].g-C3[0].g)*mixc,C3[0].b+(C3[1].b-C3[0].b)*mixc);
    if(te<TL){o.g.copy(yamM.position);o.gs=0.8*form;o.ga=0.3*form;o.li=2*form;}
    else if(te<TI){yp(te,o.g);o.gs=1;o.ga=0.4;o.li=3;}
    else{o.g.copy(B);o.gs=1.4+2.4*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.7+0.1*env;o.li=7*Math.exp(-ia*4)+2*env;}
    o.ia=ia; o.c.copy(B); o.shake=0; o.dist=0.7; o.flash=0.7;
  };
}};

// niveles: K = mapa de tiempo [real, original], n/s = densidad/tamaño de partículas, g/gs = luz y resplandor, rec = retroceso
VFX.module("Planta · Cola",[
  tier(carrot,{K:[[0,0],[0.35,0.42],[0.7,0.8],[0.95,1.12],[2.2,2.7]],n:0.6,s:0.8,g:0.85,gs:0.85}),                       // nivel 2
  tier(cattail,{K:[[0,0],[0.32,0.4],[0.72,0.82],[2.3,3.0]],n:0.65,s:0.85,g:0.85,gs:0.85,rec:0.7}),                      // nivel 2
  tier(hatsune,{K:[[0,0],[0.8,1.0],[2.3,3.0]],n:0.7,s:0.85,g:0.85,gs:0.85,rec:0.7}),                                     // nivel 2
  tier(hotButt,{K:[[0,0],[0.35,0.42],[0.8,1.0],[2.3,3.0]],n:0.6,s:0.85,g:0.85,gs:0.85,rec:0.7}),                        // nivel 2
  tier(seedA,{K:[[0,0],[0.3,0.35],[0.7,0.95],[1.0,1.65],[1.3,1.95],[1.65,2.6],[1.9,3.15],[2.4,4.3]],n:0.7,s:0.85,g:0.85,gs:0.85}), // nivel 2
  tier(potato,{K:[[0,0],[0.6,0.75],[1.0,PTC[0]],[1.95,2.35],[2.3,3.0]],n:0.7,s:0.85,g:0.85,gs:0.85,rec:0.7}),          // nivel 2
  tier(shroom,{K:[[0,0],[0.25,0.3],[0.8,0.95],[1.95,2.85],[2.4,3.4]],n:0.65,s:0.85,g:0.85,gs:0.85}),                    // nivel 2
  tier(sprout,{K:[[0,0],[0.36,0.42],[2.2,2.8]],n:0.7,s:0.85,g:0.85,gs:0.85}),                                            // nivel 2
  tier(totem,{K:[[0,0],[0.15,0.2],[0.6,0.8],[1.1,1.53],[1.95,2.95],[2.4,3.5]],n:0.7,s:0.85,g:0.85,gs:0.85,rec:0.7}),    // nivel 2
  tier(yam,{K:[[0,0],[0.12,0.35],[0.42,1.0],[0.6,1.45],[1.1,2.85],[1.4,3.35]],n:0.33,s:0.75,g:0.7,gs:0.7})]);           // nivel 1
})();

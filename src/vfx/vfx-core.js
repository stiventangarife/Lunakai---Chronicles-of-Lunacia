// vfx-core.js — Núcleo del motor de VFX de Lunakai (compartido por el juego y el laboratorio tools/vfx-lab/).
//
// Extraído del laboratorio original (vfx/index.html). No depende del DOM ni del renderizador: recibe THREE
// (el three.module.js r160 del proyecto) y la escena/cámara donde viven los efectos.
//
//   const core = createVfxCore(THREE, { scene, camera, showDummies });
//   window.VFX = core;            // los módulos mod-*.js y vfx-lib.js leen window.VFX
//   …cargar vfx-lib.js y los módulos (vfx-modules.js)…
//   core.ensureBuilt(ab); core.setPalette('Arcano'); const tier = core.evaluate(ab, te);
//
// Contrato de una habilidad (igual que en el laboratorio): {key, name, dur, ti, phases, pal} + build(a) que crea
// piezas en a.L.mesh/part/trail/decal + pose(te, o) sin estado. Los módulos NO se modifican para el juego.

export function createVfxCore(THREE, env = {}) {
const scene = env.scene;
const camera = env.camera;
const showDummies = env.showDummies !== false;
if (!scene || !camera) throw new Error('[vfx-core] Hacen falta scene y camera');
const PALETTES={Arcano:["#6fd8ff","#8a5bff"],Fuego:["#ffb648","#ff3d1f"],Veneno:["#b9ff5e","#1fbf8f"],Estelar:["#fff08a","#7a6cff"],Sagrado:["#ffe9a8","#2fd6a0"]};
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ss=(a,b,x)=>{x=cl((x-a)/(b-a));return x*x*(3-2*x)};
const f=x=>x.toFixed(3);
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

// ---------- muñecos: lanzador, objetivo, aliados y rivales extra (en el laboratorio se ven; en el juego son invisibles) ----------
function dummy(color){
  const g=new THREE.Group(), m=new THREE.MeshStandardMaterial({color,roughness:0.6,emissive:0xffffff,emissiveIntensity:0});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.42,1.25,20),m); body.position.y=0.625;
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.27,20,14),m); head.position.y=1.6;
  g.add(body,head); g.userData.m=m; g.visible=showDummies; scene.add(g); return g;
}
const caster=dummy(0x454867), target=dummy(0x5a4a5c);
// cuernos del lanzador (clase bestia) y dos aliados: solo visibles si la habilidad activa los pide
const hornMat=new THREE.MeshStandardMaterial({color:0xd9cbb0,roughness:0.5,emissive:0xff8a2a,emissiveIntensity:0});
const horns=new THREE.Group(); caster.add(horns); horns.visible=false;
for(const s of [-1,1]){const h=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.42,12),hornMat);h.position.set(0.06,1.86,0.15*s);h.rotation.set(0.55*s,0,-0.45);horns.add(h);}
const HORN_TIPS=[V3(0.16,2.05,-0.27),V3(0.16,2.05,0.27)];   // puntas, en coordenadas del lanzador
const ALLY_POS=[V3(-1.5,0,-1.9),V3(-5.4,0,-1.3)];
const allies=ALLY_POS.map(()=>{const d=dummy(0x3f5f6e);d.visible=false;return d;});
// rivales extra (p. ej. "rival más lejano"): solo visibles si la habilidad activa pide enemies:n
const ENEMY_POS=[V3(1.3,0,1.9),V3(6.3,0,-1.7)];
const enemies=ENEMY_POS.map(()=>{const d=dummy(0x5a4a5c);d.visible=false;return d;});


// ---------- piezas compartidas por todas las habilidades ----------
// uE: envolvente que la habilidad activa da a sus partículas en bucle (auras); vale 1 por defecto en cada fotograma
const U={uT:{value:0},uC1:{value:new THREE.Color()},uC2:{value:new THREE.Color()},uPx:{value:1},uE:{value:1}};
const HEAD=`
uniform float uT; uniform vec3 uC1; uniform vec3 uC2;
float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float band(float r,float c,float w){return smoothstep(w,0.,abs(r-c));}
`;
const MESH_VS=`varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
void main(){vUv=uv;vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const MESH_FS_HEAD=HEAD+`uniform float uA;uniform float uP;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;`;
function fx(fs,opts={}){
  return new THREE.ShaderMaterial(Object.assign({
    uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uA:{value:0},uP:{value:0}},
    vertexShader:MESH_VS, fragmentShader:MESH_FS_HEAD+fs,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide
  },opts));
}
// fx con uniforms extra (escudo: dirección y tiempo del golpe)
function fxU(fs,extra,opts){const m=fx(fs,opts);Object.assign(m.uniforms,extra);return m;}
const set=(mesh,p,a)=>{mesh.material.uniforms.uP.value=p;mesh.material.uniforms.uA.value=a;};
const groundPlane=(s,x,y,mat,w)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(s,w||s).rotateX(-Math.PI/2),mat);m.position.set(x,y,0);return m;};

const RING_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=.11*(1.-uP)+.015;
 float a=band(r,uP*.95,w)*uA;
 a*=.65+.35*noise(vec3(atan(p.y,p.x)*6.,r*8.-uT*4.,0.));
 gl_FragColor=vec4(mix(uC1,vec3(1.),.25*a)*1.5,a);}`;
const BURST_FS=`void main(){float n=noise(vP*3.2+vec3(uT*.6));
 float th=uP*1.15-.12; if(n<th) discard;
 float edge=smoothstep(.14,0.,n-th);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
 vec3 c=mix(uC2,uC1,fr)*(.7+1.1*fr)+vec3(1.)*edge*1.1;
 gl_FragColor=vec4(c,(.12+.6*fr+edge)*(1.-uP));}`;
const SCORCH_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=noise(vec3(p*9.,1.))*.6+noise(vec3(p*22.,4.))*.4;
 float cr=pow(1.-abs(n*2.-1.),9.);
 float m=smoothstep(1.,.15,r)*smoothstep(1.-uA,1.-uA+.5,1.-r*.6);
 gl_FragColor=vec4(mix(uC2,uC1,cr)*1.7,(cr*1.4+.08)*m*uA);}`;

// partículas GPU sin estado: posición = f(semilla, tiempo)
const PT_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,uC2,vMix)*1.4+vec3(1.)*smoothstep(.2,0.,d)*.5,a);}`;
const PT_HEAD=HEAD+`uniform float uPx;uniform float uE;attribute vec4 aSeed;varying float vA;varying float vMix;
vec3 rnd(){return vec3(aSeed.y,aSeed.z,aSeed.w)*2.-1.;}
// semilla nueva por ciclo: las partículas en bucle no repiten trayectoria
vec3 rr(float c){return vec3(hash(vec3(aSeed.x*37.1,aSeed.y*53.7,c*1.31)),hash(vec3(aSeed.z*41.3,c*1.71,aSeed.w*29.9)),hash(vec3(c*2.17,aSeed.w*61.3,aSeed.x*17.9)));}
void put(vec3 p,float size){vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(size,0.)*uPx/-mv.z;vMix=aSeed.w;}`;
function seeds(n,dup){const a=new Float32Array(n*4*dup);for(let i=0;i<n;i++){const s=[Math.random(),Math.random(),Math.random(),Math.random()];for(let d=0;d<dup;d++)a.set(s,(i*dup+d)*4);}return a;}
function points(parent,n,vs,fs,opts){
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*3),3));
  g.setAttribute("aSeed",new THREE.BufferAttribute(seeds(n,1),4));
  const m=new THREE.ShaderMaterial(Object.assign({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},vertexShader:PT_HEAD+vs,fragmentShader:fs||PT_FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending},opts||{}));
  const p=new THREE.Points(g,m); p.frustumCulled=false; parent.add(p); return n;
}
// chispas como segmentos: cada chispa son dos vértices, cabeza y cola unos ms atrás
function sparks(parent,n,ti,org,bias,lo,hi,grav){
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*6),3));
  g.setAttribute("aSeed",new THREE.BufferAttribute(seeds(n,2),4));
  g.setAttribute("aEnd",new THREE.BufferAttribute(Float32Array.from({length:n*2},(_,i)=>i%2),1));
  const l=new THREE.LineSegments(g,new THREE.ShaderMaterial({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:HEAD+`attribute vec4 aSeed;attribute float aEnd;varying float vA;
    void main(){float life=.22+aSeed.y*.5;float tt=max(uT-${f(ti)}-aEnd*.04,0.);
     vec3 d=normalize(vec3(aSeed.y,aSeed.z,aSeed.w)*2.-1.+vec3(${bias}));
     vec3 p=vec3(${org})+d*(${f(lo)}+${f(hi)}*aSeed.x)*(1.-exp(-tt*4.5))*.36+vec3(0.,-${f(grav)}*tt*tt,0.);
     float ah=(uT-${f(ti)})/life;vA=(ah>0.&&ah<1.)?(1.-ah)*(1.-aEnd*.9):0.;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:HEAD+`varying float vA;void main(){gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.9,vA);}`}));
  l.frustumCulled=false; parent.add(l); return n;
}
const LK=["mesh","part","trail","decal"];
function ability(def){
  def.root=new THREE.Group(); def.L={}; def.count=0;
  for(const k of LK){def.L[k]=new THREE.Group();def.root.add(def.L[k]);}
  scene.add(def.root); return def;
}
// resplandor y luz: un solo billboard y una sola luz que siguen al punto caliente de la habilidad activa
const glow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`
void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),2.6)*uA;
 gl_FragColor=vec4(mix(uC1,vec3(1.),a*.55)*1.1,a);}`,{depthTest:false}));
scene.add(glow);
const light=new THREE.PointLight(0xffffff,0,14,2); scene.add(light);
// em/emc: brillo propio del objetivo (aura, curación); flash: cuánto destella con el golpe (un escudo lo atenúa)
// bw/bwAng: pantalla partida en blanco y negro a lo largo de una recta por o.c (0..1, ángulo en rad)
// pa: barra de PA en pantalla {have,max,fill,flash} o null
// dark: oscurece la escena (0..0.95, lo aplica el anfitrión); white: destello blanco a pantalla completa (0..1); ld: radio de la luz
const O={g:V3(0,0,0),gs:0,ga:0,li:0,ia:-1,c:V3(0,0,0),shake:1,dist:1,em:0,emc:new THREE.Color(1,1,1),flash:1,bw:0,bwAng:0,pa:null,dark:0,white:0,ld:14};
// fragmentos de partícula especiales: burbuja (anillo + brillo) y cruz de curación
const BUBBLE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float ring=smoothstep(.07,0.,abs(d-.38))*.9+smoothstep(.5,0.,d)*.1;
 float hl=smoothstep(.13,0.,length(q-vec2(-.14,-.14)));
 float a=(ring+hl*.8)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,uC2,vMix*.6)*1.3+vec3(hl*.6),a);}`;
const CROSS_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);
 float cr=max(smoothstep(.12,.07,q.x)*smoothstep(.42,.35,q.y),smoothstep(.12,.07,q.y)*smoothstep(.42,.35,q.x));
 float gl=smoothstep(.5,0.,length(gl_PointCoord-.5))*.22;
 float a=(cr+gl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),cr*.45)*1.4,a);}`;
// cinta en hélice alrededor de un cuerpo: uv.x recorre la longitud, uv.y el ancho
function helixGeo(turns,r0,r1,h,w,seg){
  const pos=[],uv=[],idx=[];
  for(let i=0;i<=seg;i++){
    const t=i/seg,an=t*turns*Math.PI*2,r=r0+(r1-r0)*t,y=t*h,c=Math.cos(an),s=Math.sin(an);
    pos.push(c*r,y-w/2,s*r,c*r,y+w/2,s*r); uv.push(t,0,t,1);
    if(i<seg){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3)); g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const tmp=V3(0,0,0), shakeOff=V3(0,0,0);

// =====================================================================
// 1 · LANZA ARCANA — proyectil
// =====================================================================
const lanza=ability({key:"lanza",name:"Lanza Arcana",dur:2.7,ti:1.17,phases:[["Anticipación",0],["Lanzamiento",0.75],["Impacto",1.17],["Disipación",1.5]]});
(function(){
  const TL=0.75,FLY=0.42,TI=1.17,A=V3(-3,1.1,0),B=V3(3,1.1,0),a=lanza,L=a.L;
  const C=`const float TL=${f(TL)};const float FLY=${f(FLY)};const float TI=${f(TI)};const vec3 PA=vec3(-3.,1.1,0.);const vec3 PB=vec3(3.,1.1,0.);
  vec3 proj(float t){float p=clamp((t-TL)/FLY,0.,1.);return mix(PA,PB,p*p);}`;
  const orb=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(`
  void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float n=noise(vP*4.+vec3(0.,uT*3.,uT));
   vec3 c=mix(uC2,uC1,fr)*(.8+1.2*fr)+vec3(1.)*smoothstep(.55,.9,n)*.35;
   gl_FragColor=vec4(c,.35+.65*fr);}`)); orb.position.copy(A);
  const rune=groundPlane(3.2,-3.7,0.02,fx(`
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x)/6.2832;
   float m=band(r,.92,.02)+band(r,.62,.012);
   m+=band(r,.77,.07)*step(.55,fract(a*14.+uT*.35));
   m+=band(r,.45,.05)*step(.7,fract(a*6.-uT*.6));
   float tri=abs(fract(a*3.+uT*.1)-.5)*2.; m+=band(r,.22+.2*tri,.012)*step(r,.6);
   gl_FragColor=vec4(mix(uC2,uC1,r)*1.3,m*uA);}`));
  const spear=new THREE.Mesh(new THREE.ConeGeometry(0.17,1.7,14,10,true).rotateZ(-Math.PI/2),fx(`
  void main(){float l=vP.x/1.7+.5;
   float n=noise(vec3(l*7.-uT*22.,atan(vP.y,vP.z)*2.,0.));
   vec3 c=mix(uC2,uC1,l)*1.4+vec3(1.)*pow(l,3.)*.9;
   gl_FragColor=vec4(c,smoothstep(0.,.35,l)*(.55+.45*n));}`));
  const muzzle=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4).rotateY(Math.PI/2),fx(RING_FS)); muzzle.position.set(-2.8,1.1,0);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6).rotateY(Math.PI/2),fx(RING_FS)); hitRing.position.set(2.95,1.1,0);
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.copy(B);
  L.mesh.add(orb,rune,spear,muzzle,hitRing,burst);

  a.count+=points(L.part,360,C+`void main(){float life=.3+aSeed.y*.15;float age=(uT-aSeed.x*.58)/life;float k=age*age;
   vec3 d=normalize(rnd()+.0001);vec3 tg=normalize(cross(d,vec3(.13,1.,.07)));
   vec3 p=PA+(d*cos(k*2.2)+tg*sin(k*2.2))*mix(1.9,.04,k);
   vA=(age>0.&&age<1.&&uT<TL)?smoothstep(0.,.25,age):0.;
   put(p,(.05+.07*aSeed.z)*(1.-k*.6));}`);
  a.count+=points(L.part,520,C+`void main(){float s=TL+aSeed.x*FLY;float life=.3+aSeed.y*.55;float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=proj(s)+r*.11+(r*.55+vec3(-.7,.35,0.))*age*life*1.3;
   vA=(age>0.&&age<1.)?(1.-age):0.;
   put(p,(.05+.09*aSeed.z)*(1.-age));}`);
  a.count+=points(L.part,200,C+`void main(){float life=.8+aSeed.y*.65;float tt=uT-TI-aSeed.x*.22;float age=tt/life;
   vec3 d=normalize(rnd()+vec3(-.2,.4,0.));float c=max(tt,0.);
   vec3 p=PB+d*(.4+1.9*aSeed.z)*(1.-exp(-c*3.))+vec3(sin(c*4.+aSeed.w*6.)*.12,c*.75,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(c*34.+aSeed.x*50.)):0.;
   put(p,.04+.06*aSeed.w);}`);
  a.count+=sparks(L.part,420,TI,"3.,1.1,0.","-.55,.3,0.",4,10,3.2);

  const trailGeo=new THREE.PlaneGeometry(1,1).translate(-0.5,0,0);
  const trailMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*5.-uT*9.,v*3.,uT));
   float a=smoothstep(u*(.55+.45*n),0.,v)*u*u*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.25,0.,v)*u*.5,a);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(trailGeo,trailMat); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(trailGeo,trailMat),t2); L.trail.add(trail);

  const scorch=groundPlane(4.4,3.1,0.015,fx(SCORCH_FS)), shock=groundPlane(9,3,0.03,fx(RING_FS));
  L.decal.add(scorch,shock);

  a.pose=function(te,o){
    const ch=cl(te/TL), fly=cl((te-TL)/FLY), px=-3+6*fly*fly, ia=te-TI, flying=te>=TL&&te<TI;
    const os=0.42*ss(0,1,ch)*(1+0.07*Math.sin(te*40))*(1-cl((te-TL)/0.06));
    orb.visible=os>0.002; orb.scale.setScalar(Math.max(os,0.001));
    rune.material.uniforms.uA.value=ss(0,0.3,ch)*(1-ss(TL,TL+0.5,te));
    caster.rotation.z=-0.12*ss(0,TL,te)+0.2*ss(TL,TL+0.08,te)-0.08*ss(TL+0.1,TL+0.6,te);
    let p=cl((te-TL)/0.3); set(muzzle,p,te>=TL?1-p:0);
    spear.visible=flying; spear.position.set(px,1.1,0);
    const k=ia>0?1-cl(ia/0.25):1;
    trail.visible=te>TL&&ia<0.25; trail.position.set(px,1.1,0); trail.scale.set(Math.max(Math.min(px+3,3.4),0.001),0.75*k,0.75*k); trailMat.uniforms.uA.value=k;
    p=cl(ia/0.35); set(hitRing,p,ia>=0?1-p:0);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.6*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.5):0;
    const hit=ia>=0?Math.exp(-ia*5):0;
    target.rotation.z=-hit*0.28*Math.cos(ia*16); target.position.x=3.4+hit*0.22;
    if(te<TL){o.g.copy(A);o.gs=1.9*ch;o.ga=0.75*ch;o.li=2.2*ch;}
    else if(flying){o.g.set(px,1.1,0);o.gs=1.6;o.ga=0.8;o.li=4;}
    else{o.g.copy(B);o.gs=1.5+5*ia;o.ga=Math.exp(-ia*13)*0.85;o.li=11*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(B);o.shake=1;o.dist=1;
  };
})();

// =====================================================================
// 2 · TAJO CRECIENTE — cuerpo a cuerpo
// =====================================================================
const tajo=ability({key:"tajo",name:"Tajo Creciente",dur:1.5,ti:0.282,phases:[["Anticipación",0],["Tajo",0.22],["Impacto",0.282],["Disipación",0.55]]});
(function(){
  const T0=0.22,SW=0.13,TI=0.282,TG=V3(1.1,1.15,0),a=tajo,L=a.L;
  // todo lo que vive en el plano del corte cuelga de un grupo inclinado con centro en el atacante
  const tilt=k=>{const g=new THREE.Group();g.position.set(-1.1,1.15,0);g.rotation.set(0.38,0,0.1);L[k].add(g);return g;};
  const tMesh=tilt("mesh"), tPart=tilt("part"), tTrail=tilt("trail");
  const arcGeo=new THREE.RingGeometry(0.9,2.3,96,1,-2.4,4.8).rotateX(-Math.PI/2);
  const ARC=`float ang=atan(-vP.z,vP.x);float rr=(length(vP.xz)-.9)/1.4;float d=ang-uP;`;
  // estela de la hoja: una banda que barre el anillo; la cabeza es uP (ángulo), la cola se afina
  const ribbon=new THREE.Mesh(arcGeo,fx(`
  void main(){${ARC}float t=d/1.9;if(d<0.||t>1.)discard;
   float prof=pow(rr,.8+3.*t)*smoothstep(1.,.95,rr);
   float st=.55+.45*noise(vec3(ang*3.-uT*2.,rr*16.,0.));
   float al=min(prof*pow(1.-t,1.1)*st*1.7,1.)*uA*smoothstep(0.,.04,d);
   gl_FragColor=vec4(mix(uC2,uC1,rr)*1.5+vec3(1.)*pow(rr,7.)*(1.-t)*.7,al);}`));
  tTrail.add(ribbon);
  const edge=new THREE.Mesh(arcGeo,fx(`
  void main(){${ARC}float t=d/.75;if(d<0.||t>1.)discard;
   float al=smoothstep(.88,.96,rr)*smoothstep(1.,.985,rr)*(1.-t)*uA;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.75)*1.7,al);}`));
  // media luna que sale despedida tras el golpe
  const wave=new THREE.Mesh(new THREE.RingGeometry(1.75,2.3,48,1,-0.95,1.9).rotateX(-Math.PI/2),fx(`
  void main(){float ang=atan(-vP.z,vP.x);float rr=(length(vP.xz)-1.75)/.55;
   float tp=1.-abs(ang)/.95;
   float al=smoothstep(1.-tp*.9,1.,rr)*smoothstep(1.,.93,rr)*smoothstep(0.,.25,tp);
   al*=.6+.4*noise(vec3(ang*5.,rr*6.-uT*10.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,rr)*1.5+vec3(1.)*pow(rr,5.)*.7,al*uA);}`));
  tMesh.add(edge,wave);
  // marca del corte sobre el objetivo: una línea fina que se estira y adelgaza
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`
  void main(){vec2 p=vUv-.5;float al=exp(-abs(p.y)*26.)*(1.-pow(abs(p.x)*2.,2.))*uA;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.7)*1.7,al);}`,{depthTest:false}));
  mark.position.copy(TG); L.mesh.add(mark);
  const qz=new THREE.Quaternion().setFromAxisAngle(V3(0,0,1),-0.5);

  a.count+=points(tPart,320,`void main(){float s=aSeed.x;float life=.25+aSeed.y*.35;float age=(uT-${f(T0)}-s*${f(SW)})/life;
   float th=2.1-4.4*s;float r=1.9+.4*aSeed.z;
   vec3 p=vec3(cos(th),0.,-sin(th))*(r+age*life*1.8)+vec3(0.,(aSeed.w-.5)*.25-age*age*.3,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;
   put(p,(.04+.06*aSeed.z)*(1.-age));}`);
  a.count+=points(L.part,110,`void main(){float life=.6+aSeed.y*.6;float tt=uT-${f(TI)}-aSeed.x*.15;float age=tt/life;float c=max(tt,0.);
   vec3 d=normalize(rnd()+vec3(.5,.3,.4));
   vec3 p=vec3(1.1,1.15,0.)+d*(.3+1.4*aSeed.z)*(1.-exp(-c*3.))+vec3(0.,c*.6,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(c*34.+aSeed.x*50.)):0.;
   put(p,.035+.05*aSeed.w);}`);
  a.count+=sparks(L.part,360,TI,"1.1,1.15,0.",".7,.2,.9",4,11,3.5);

  // cicatriz en el suelo que se revela al paso de la media luna
  const scar=groundPlane(5.5,3.6,0.015,fx(`
  void main(){float u=vUv.x;float v=vUv.y-.5+(noise(vec3(u*7.,0.,3.))-.5)*.22;
   float rev=step(u,uP);
   float al=smoothstep(.07*(1.-u*.7),0.,abs(v))*(1.-u*.6);
   float halo=smoothstep(.45,0.,abs(v))*.18*(1.-u);
   gl_FragColor=vec4(mix(uC2,uC1,al)*1.7,(al+halo)*rev*uA);}`),1);
  const shock=groundPlane(4.5,1.1,0.03,fx(RING_FS));
  L.decal.add(scar,shock);
  a.root.updateMatrixWorld(true);

  a.pose=function(te,o){
    const s=cl((te-T0)/SW), head=2.1-4.4*s, ia=te-TI, after=te-T0-SW;
    const wind=ss(0,T0,te), lunge=ss(T0,T0+0.06,te), rest=ss(T0+SW,T0+0.6,te);
    caster.position.x=-1.1-0.18*wind+0.4*lunge-0.22*rest;
    caster.rotation.z=0.2*wind-0.42*lunge+0.22*rest;
    const ra=te<T0?0:(after>0?1-cl(after/0.2):1);
    set(ribbon,head,ra); set(edge,head,te<T0||after>0.05?0:1);
    const q=cl(ia/0.4), qe=1-Math.pow(1-q,2.2);
    wave.position.x=4.2*qe; wave.scale.setScalar(1+0.25*q); wave.material.uniforms.uA.value=ia>=0?Math.pow(1-q,1.5):0;
    mark.quaternion.copy(camera.quaternion).multiply(qz);
    mark.scale.set(Math.max(3.8*ss(0,0.05,ia),0.001),0.42*(1-cl(ia/0.22))+0.06,1); mark.material.uniforms.uA.value=ia>=0?1-cl(ia/0.26):0;
    set(scar,qe,ia>=0?1-cl(ia/1.1):0);
    const p=cl(ia/0.4); set(shock,p,ia>=0?1-p:0);
    const hit=ia>=0?Math.exp(-ia*5):0;
    target.position.x=1.1+hit*0.34; target.rotation.z=-hit*0.34*Math.cos(ia*15);
    if(ia>=0){o.g.copy(TG);o.gs=1.1+4*ia;o.ga=Math.exp(-ia*14)*0.55;o.li=9*Math.exp(-ia*7);}
    else if(te>=T0){o.g.set(Math.cos(head)*2.2,0,-Math.sin(head)*2.2);tMesh.localToWorld(o.g);o.gs=1.1;o.ga=0.6;o.li=3;}
    else{o.g.set(-0.75,1.35,0.55);o.gs=0.7*wind;o.ga=0.6*wind;o.li=1.2*wind;}
    o.ia=ia;o.c.copy(TG);o.shake=1.15;o.dist=0.6;
  };
})();

// =====================================================================
// 3 · JUICIO RÚNICO — área en el suelo
// =====================================================================
const area=ability({key:"area",name:"Juicio Rúnico",dur:3.2,ti:1.12,phases:[["Aviso",0],["Descarga",1.0],["Impacto",1.12],["Disipación",1.6]]});
(function(){
  const TT=1.0,TI=1.12,CX=1.5,R=2.3,a=area,L=a.L;
  // aviso: el círculo se rellena del centro al borde; cuando llega al borde, cae el golpe
  const tele=groundPlane(R*2.3,CX,0.02,fx(`
  void main(){vec2 p=vUv-.5;float r=length(p)*2.3;float an=atan(p.y,p.x)/6.2832;
   float m=band(r,1.,.022)*1.2;
   m+=step(r,uP)*.15*(.7+.3*noise(vec3(p*14.,uT)));
   m+=band(r,uP,.035)*step(uP,.999);
   m+=band(r,.82,.05)*step(.5,fract(an*18.-uT*.25))*.8;
   m+=band(r,.56,.012)+band(r,.3,.045)*step(.6,fract(an*8.+uT*.5));
   m*=step(r,1.04);
   gl_FragColor=vec4(mix(uC2,uC1,uP*r)*1.3,m*uA);}`));
  const scorch=groundPlane(R*2.9,CX,0.015,fx(SCORCH_FS)), shock=groundPlane(R*5.4,CX,0.03,fx(RING_FS));
  L.decal.add(tele,scorch,shock);
  // haz que baja del cielo
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,14,14,1,true),fx(`
  void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),1.6);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.6,c*uA);}`));
  L.trail.add(beam);
  // columna: vetas de ruido que suben, más densa abajo
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(R*0.92,R*0.92,7,56,1,true),fx(`
  void main(){float h=vP.y/7.+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*4.,h*3.-uT*5.,uT*.5))*.6+noise(vec3(an*11.,h*8.-uT*9.,2.))*.4;
   float st=smoothstep(.38,.8,n);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float al=(st*.5+pow(fr,2.)*.35+.04)*pow(1.-h,1.3+uP*3.)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.05+vec3(1.)*st*(1.-h)*.2,al);}`));
  pillar.position.set(CX,3.5,0);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,44,20,0,Math.PI*2,0,Math.PI/2),fx(BURST_FS)); dome.position.set(CX,0,0);
  L.mesh.add(pillar,dome);

  const DISC=`float an=aSeed.z*6.2832;float rd=sqrt(aSeed.w)*${f(R*0.93)};`;
  a.count+=points(L.part,260,`void main(){${DISC}float life=.5+aSeed.y*.4;float tt=uT-aSeed.x*.95;float age=tt/life;
   vec3 p=vec3(${f(CX)}+cos(an)*rd,age*life*(1.+uT*1.6)+.03,sin(an)*rd);
   vA=(age>0.&&age<1.&&uT<${f(TI)})?sin(age*3.14159)*.8:0.;
   put(p,.035+.04*aSeed.y);}`);
  a.count+=points(L.part,440,`void main(){${DISC}float life=.5+aSeed.y*.6;float tt=uT-${f(TI)}-aSeed.x*.1;float age=tt/life;float c=max(tt,0.);
   float sp=1.+c*.35;
   vec3 p=vec3(${f(CX)}+cos(an)*rd*sp,(3.2+7.*aSeed.y)*c-6.*c*c+.05,sin(an)*rd*sp);
   vA=(age>0.&&age<1.)?(1.-age):0.;
   put(p,(.05+.08*aSeed.x)*(1.-age*.5));}`);
  a.count+=points(L.part,240,`void main(){${DISC}float life=1.+aSeed.y*.8;float tt=uT-${f(TI)}-.15-aSeed.x*.5;float age=tt/life;float c=max(tt,0.);
   vec3 p=vec3(${f(CX)}+cos(an)*rd+sin(c*3.+aSeed.w*6.)*.12,.05+c*(.5+.9*aSeed.z),sin(an)*rd);
   vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(c*30.+aSeed.x*50.)):0.;
   put(p,.035+.05*aSeed.z);}`);
  a.count+=sparks(L.part,460,TI,`${f(CX)},.35,0.`,"0.,.45,0.",5,12,4);

  a.pose=function(te,o){
    const ia=te-TI, fill=cl(te/TT), fall=cl((te-TT)/(TI-TT));
    caster.rotation.z=0.14*ss(0,TT,te)-0.3*ss(TT,TT+0.1,te)+0.16*ss(TT+0.2,TT+0.8,te);
    set(tele,fill,ss(0,0.15,te)*(ia>0?1-cl(ia/0.45):1)*(ia>0?1.6:1));
    beam.visible=te>=TT&&ia<0.5; beam.position.set(CX,7+(1-fall)*14,0);
    const bw=ia>0?1+2.5*Math.exp(-ia*9):1; beam.scale.set(bw,1,bw); beam.material.uniforms.uA.value=ia>0?0.6*(1-cl(ia/0.5)):1;
    let p=cl(ia/0.75); pillar.visible=ia>=0&&p<1; pillar.scale.set(1+0.08*p,1,1+0.08*p); set(pillar,p,ia>=0?Math.pow(1-p,1.2)*ss(0,0.04,ia):0);
    p=cl(ia/0.45); dome.visible=ia>=0&&p<1; dome.scale.setScalar(R*(0.3+0.85*(1-Math.pow(1-p,3)))); dome.material.uniforms.uP.value=p;
    p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.9):0;
    const air=ia>0?Math.sin(Math.PI*cl(ia/0.75)):0;
    target.position.set(CX,1.25*air,0); target.rotation.z=-0.55*air;
    if(ia>=0){o.g.set(CX,0.9,0);o.gs=2+5*ia;o.ga=Math.exp(-ia*10)*0.55;o.li=12*Math.exp(-ia*4);}
    else if(te>=TT){o.g.set(CX,(1-fall)*14,0);o.gs=2;o.ga=0.9;o.li=6;}
    else{o.g.set(CX,0.6,0);o.gs=0.001;o.ga=0;o.li=1.8*fill;}
    o.ia=ia;o.c.set(CX,0.6,0);o.shake=1.7;o.dist=1.3;
  };
})();

// =====================================================================
// 4 · AURAS DE ESTADO — un orbe aplica el estado; el aura persiste con tics de daño y se desvanece
//     Variantes: veneno, aturdimiento, quemadura. Cada una tiene sus propias piezas en las cuatro capas.
// =====================================================================
const aura=ability({key:"aura",name:"Auras de estado",dur:4.2,ti:0.62,
  phases:[["Lanzamiento",0],["Aplicación",0.62],["Efecto activo",1.0],["Desvanecimiento",3.4]],
  variants:[["veneno","Veneno","Veneno"],["aturdir","Aturdimiento","Estelar"],["quemadura","Quemadura","Fuego"]],v:"veneno"});
(function(){
  const TL=0.22,TI=0.62,T1=1.0,TF=3.4,TE=4.0,TK=[1.45,2.25,3.05],a=aura,L=a.L;
  const P0=V3(-3.3,1.35,0),P1=V3(3.4,1.15,0),ARC=1.5;
  const lob=(k,out)=>out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+4*k*(1-k)*ARC,0);
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=vec3(-3.3,1.35,0.);const vec3 P1=vec3(3.4,1.15,0.);
  vec3 lob(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,P1,k)+vec3(0.,4.*k*(1.-k)*${f(ARC)},0.);}`;
  // todo lo que vive sobre el objetivo cuelga de grupos que siguen su posición (retroceso incluido)
  const follow=[], fg=k=>{const g=new THREE.Group();L[k].add(g);follow.push(g);return g;};
  const F={}; for(const k of LK)F[k]=fg(k);

  // ---- piezas comunes: orbe lanzado en parábola, salpicadura, anillo de tic ----
  const glob=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),fx(`
  void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   float n=noise(vP*5.+vec3(uT*4.));
   gl_FragColor=vec4(mix(uC2,uC1,fr+n*.3)*(1.+fr)+vec3(1.)*smoothstep(.6,.9,n)*.35,.45+.55*fr);}`));
  L.mesh.add(glob);
  const applyRing=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2).rotateY(Math.PI/2),fx(RING_FS)); applyRing.position.set(-0.15,1.15,0);
  const tickRing=new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.8).rotateX(-Math.PI/2),fx(RING_FS)); tickRing.position.set(0,1.0,0);
  F.mesh.add(applyRing,tickRing);
  const shock=groundPlane(5,0,0.03,fx(RING_FS)); F.decal.add(shock);
  a.count+=points(L.part,90,C+`void main(){float life=.1+aSeed.y*.08;float age=(uT-aSeed.x*.12)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=P0+d*mix(1.1,.05,age*age);
   vA=(age>0.&&age<1.&&uT<TL)?smoothstep(0.,.3,age):0.;put(p,.04+.05*aSeed.z);}`);
  a.count+=points(L.part,240,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=lob(s)+r*.08+r*.28*t+vec3(0.,-2.4*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.07*aSeed.z)*(1.-age*.6));}`);
  a.count+=sparks(F.part,200,TI,"0.,1.15,0.","-.6,.4,0.",3,8,3);
  const base=a.count;

  // ---- grupos por variante ----
  const VG={}, VC={}, PV={};
  const vgroup=v=>{VG[v]={};for(const k of LK)VG[v][k]=fg(k);a.count=0;return VG[v];};

  // ------------------------------------------------------------ VENENO
  (function(){
    const G=vgroup("veneno");
    // piel tóxica: manchas que trepan + hilos que gotean
    const shellMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
     vec3 q=vP*3.;
     float n=noise(q+vec3(0.,-uT*1.6,0.))*.6+noise(q*2.3+vec3(0.,-uT*2.6,1.))*.4;
     float blot=smoothstep(.55,.75,n);
     float drip=pow(noise(vec3(vP.x*4.,vP.y*1.5+uT*1.2,vP.z*4.)),4.)*1.6;
     gl_FragColor=vec4(mix(uC2,uC1,blot+fr*.5)*1.3,(fr*.8+blot*.55+drip*.35)*uA);}`);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.56,1.5,32,8,true),shellMat); body.position.y=0.75;
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.4,28,16),shellMat); head.position.y=1.6;
    // miasma: vetas de gas que suben desde los pies
    const miasma=new THREE.Mesh(new THREE.CylinderGeometry(1.0,0.7,1.2,40,1,true),fx(`
    void main(){float h=vP.y/1.2+.5;
     float n=noise(vec3(vP.x*2.2,h*2.5-uT*.9,vP.z*2.2))*.65+noise(vec3(vP.x*5.,h*5.-uT*1.7,vP.z*5.+uT*.3))*.35;
     float w=smoothstep(.45,.85,n);
     gl_FragColor=vec4(mix(uC2,uC1,w*.7)*1.1,w*pow(1.-h,1.6)*.75*uA);}`)); miasma.position.y=0.6;
    G.mesh.add(body,head,miasma);
    // burbujas que nacen en la piel, suben, crecen y revientan (bucle sin estado: ciclo = floor(k))
    a.count+=points(G.part,150,`const float TI=${f(TI)};
    void main(){float life=.8+aSeed.y*.6;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);
     vec3 r=rr(c);float an=r.x*6.2832;float y0=.15+r.y*1.6;float rad=y0>1.3?.36:.5;
     vec3 p=vec3(cos(an)*rad+sin(age*9.+r.z*6.)*.06,y0+age*(.5+.5*r.z),sin(an)*rad+cos(age*7.+r.x*6.)*.06);
     vA=(k>=1.)?smoothstep(0.,.15,age)*(1.-smoothstep(.88,1.,age))*uE:0.;
     put(p,(.06+.1*r.z)*(.5+.7*age+smoothstep(.85,1.,age)*.8));}`,BUBBLE_FS);
    // gotas que caen del cuerpo
    a.count+=points(G.part,90,`const float TI=${f(TI)};
    void main(){float life=.55+aSeed.y*.35;float per=life+.5;float k=(uT-TI)/per+aSeed.x;float c=floor(k);
     float t=fract(k)*per;vec3 r=rr(c);float an=r.x*6.2832;float y0=.4+r.y*1.1;
     vec3 p=vec3(cos(an)*.48,y0-4.5*t*t,sin(an)*.48);
     vA=(k>=1.&&t<life&&p.y>.02)?.9*uE:0.;put(p,.035+.03*r.z);}`);
    for(const tk of TK)a.count+=sparks(G.part,50,tk,"0.,1.,0.","0.,.5,0.",2,5,2);
    // estelas: tres jirones de gas en hélice
    const wisp=new THREE.Group(); G.trail.add(wisp); const wm=[];
    for(let i=0;i<3;i++){
      const m=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
       float n=noise(vec3(u*6.-uT*1.4,v*2.,uP));float s=smoothstep(.35,.75,n);
       gl_FragColor=vec4(mix(uC2,uC1,s)*1.3,s*smoothstep(1.,.2,v)*smoothstep(0.,.15,u)*smoothstep(1.,.6,u)*uA*.8);}`);
      m.uniforms.uP.value=i*3.1; wm.push(m);
      const r=new THREE.Mesh(helixGeo(1.6,0.62,0.45,2.2,0.2,90),m); r.rotation.y=i*2.094; wisp.add(r);
    }
    // charco que crece y burbujea
    const puddle=groundPlane(2.8,0,0.02,fx(`
    void main(){vec2 p=vUv-.5;float r=length(p)*2.;
     float n=noise(vec3(p*5.,uT*.3))*.6+noise(vec3(p*13.,uT*.5+3.))*.4;
     float e=(r+(n-.5)*.45)/max(uP,.001);
     float body=smoothstep(.85,.6,e);float rim=band(e,.75,.08);
     float bub=smoothstep(.62,.7,noise(vec3(p*18.,uT*1.5)))*body;
     gl_FragColor=vec4(mix(uC2,uC1,rim+bub)*1.4,(body*.28+rim*.9+bub*.6)*uA);}`));
    G.decal.add(puddle);
    VC.veneno=a.count;
    PV.veneno=(te,env,pu)=>{
      shellMat.uniforms.uA.value=env*(.8+.9*pu);
      miasma.material.uniforms.uA.value=env; miasma.scale.set(1+.05*Math.sin(te*2),1,1+.05*Math.cos(te*2));
      wisp.rotation.y=te*.7; for(const m of wm)m.uniforms.uA.value=env;
      set(puddle,ss(TI,TI+.7,te),env);
    };
  })();

  // ------------------------------------------------------------ ATURDIMIENTO
  (function(){
    const G=vgroup("aturdir"), HY=2.12, OR=0.52;
    // cinco estrellas en órbita, en billboard; la órbita se tambalea
    const stars=[];
    for(let i=0;i<5;i++){
      const s=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34),fx(`
      void main(){vec2 p=(vUv-.5)*2.;float an=atan(p.y,p.x)+uT*4.+uP;float r=length(p);
       float k=.45+.18*cos(an*5.);
       float s=smoothstep(k,k-.12,r);float core=smoothstep(.35,0.,r);float halo=pow(max(0.,1.-r),3.)*.5;
       gl_FragColor=vec4(mix(uC1,vec3(1.),core*.7)*1.6,(s+halo)*uA);}`));
      s.material.uniforms.uP.value=i*1.7; stars.push(s); G.mesh.add(s);
    }
    // casco de conmoción: ondas que bajan por la cabeza
    const headShell=new THREE.Mesh(new THREE.SphereGeometry(0.38,28,16),fx(`
    void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
     float w=.5+.5*sin(vP.y*18.-uT*9.);
     gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3,fr*(.4+.6*w)*uA*.8);}`)); headShell.position.y=1.6;
    G.mesh.add(headShell);
    a.count+=points(G.part,80,`void main(){float an=aSeed.x*6.2832+uT*(1.5+aSeed.y*1.5);float rad=.35+aSeed.z*.45;
     vec3 p=vec3(cos(an)*rad,${f(HY-0.07)}+(aSeed.w-.5)*.5+sin(uT*3.+aSeed.x*9.)*.06,sin(an)*rad);
     float tw=pow(.5+.5*sin(uT*(7.+aSeed.y*9.)+aSeed.z*40.),6.);
     vA=tw*uE;put(p,(.05+.07*aSeed.w)*tw);}`);
    a.count+=sparks(G.part,160,TI,"0.,1.85,0.","-.3,.8,0.",3,8,3);
    for(const tk of TK)a.count+=sparks(G.part,40,tk,`0.,${f(HY)},0.`,"0.,.3,0.",2,5,1.5);
    // estela de órbita: colas de cometa detrás de cada estrella, calculadas en el shader con el mismo ángulo
    const orbit=new THREE.Group(); orbit.position.y=HY; G.trail.add(orbit);
    const ring=new THREE.Mesh(new THREE.RingGeometry(OR-0.08,OR+0.04,96,1).rotateX(-Math.PI/2),fx(`
    void main(){float ang=atan(-vP.z,vP.x);float rr=(length(vP.xz)-${f(OR-0.08)})/.12;
     float ph=fract((uP-ang)/1.2566);
     float tail=exp(-ph*5.)*(1.-abs(rr*2.-1.));
     gl_FragColor=vec4(mix(uC2,uC1,tail)*1.5,tail*uA);}`));
    orbit.add(ring);
    // espiral de mareo en el suelo
    const spiral=groundPlane(2.6,0,0.02,fx(`
    void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
     float sp=fract(an/6.2832*3.+r*2.2-uT*.9);
     float m=band(sp,.5,.14)*smoothstep(1.,.7,r)*smoothstep(.1,.25,r)+band(r,.95,.03);
     gl_FragColor=vec4(mix(uC2,uC1,r)*1.3,m*uA*.7);}`));
    G.decal.add(spiral);
    VC.aturdir=a.count;
    const q=new THREE.Quaternion(), eu=new THREE.Euler();
    PV.aturdir=(te,env,pu)=>{
      const w=te*2.6, pop=ss(TI,TI+.18,te)*(1-ss(TF,TE,te));
      q.setFromEuler(eu.set(Math.sin(te*2.1)*.28,0,Math.cos(te*1.7)*.22));
      stars.forEach((s,i)=>{const th=w+i*1.2566;
        s.position.set(Math.cos(th)*OR,0,-Math.sin(th)*OR).applyQuaternion(q); s.position.y+=HY;
        s.quaternion.copy(camera.quaternion); s.scale.setScalar(Math.max(pop*(1+.35*pu),.001)); s.material.uniforms.uA.value=pop;});
      orbit.quaternion.copy(q); set(ring,w,pop*.9);
      headShell.material.uniforms.uA.value=env*(.6+.8*pu);
      spiral.material.uniforms.uA.value=env;
      target.rotation.z+=Math.sin(te*2.6)*.07*env;   // tambaleo
    };
  })();

  // ------------------------------------------------------------ QUEMADURA
  (function(){
    const G=vgroup("quemadura");
    // llamas: ruido que sube menos la altura = lenguas; uP aviva el fuego en cada tic
    const fireMat=H=>fx(`void main(){float h=vP.y/${f(H)}+.5;
     vec3 q=vec3(vP.x*2.6,vP.y*1.6-uT*3.2,vP.z*2.6);
     float n=noise(q)*.55+noise(q*2.1+vec3(0.,-uT*2.,0.))*.3+noise(q*4.3)*.15;
     float fl=n-h*1.05+.35+.3*uP;
     float al=smoothstep(.0,.25,fl);float hot=smoothstep(.25,.6,fl);
     vec3 c=mix(uC2,uC1,hot)+vec3(1.)*smoothstep(.55,.8,fl)*.6;
     float fr=1.-abs(dot(normalize(vN),normalize(vV)));
     gl_FragColor=vec4(c*1.5,al*(.35+.65*fr)*uA);}`);
    const outer=new THREE.Mesh(new THREE.CylinderGeometry(0.48,0.56,2.5,40,12,true),fireMat(2.5)); outer.position.y=1.25;
    const inner=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.44,1.9,32,10,true),fireMat(1.9)); inner.position.y=0.95;
    G.mesh.add(outer,inner);
    // brasas turbulentas en bucle
    a.count+=points(G.part,220,`const float TI=${f(TI)};
    void main(){float life=.7+aSeed.y*.8;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;float rad=.3+r.y*.3;float t=age*life;
     vec3 p=vec3(cos(an)*rad,.2+r.z*1.4,sin(an)*rad)+vec3(sin(t*5.+r.x*9.)*.15*t,t*(1.4+r.y),cos(t*4.+r.z*9.)*.15*t);
     vA=(k>=1.)?(1.-age)*(.55+.45*sin(t*30.+r.z*40.))*uE:0.;
     put(p,(.03+.05*r.z)*(1.-age*.5));}`);
    // volumen de fuego: pocas partículas grandes y tenues
    a.count+=points(G.part,50,`const float TI=${f(TI)};
    void main(){float life=.45+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;vec3 p=vec3(cos(an)*.3,.3+r.y*1.3+age*.9,sin(an)*.3);
     vA=(k>=1.)?sin(age*3.14159)*.22*uE:0.;put(p,.45+.35*r.z);}`);
    for(const tk of TK)a.count+=sparks(G.part,70,tk,"0.,1.,0.","0.,.6,0.",3,7,2.5);
    // lenguas de fuego en hélice
    const tongues=new THREE.Group(); G.trail.add(tongues); const tm=[];
    for(let i=0;i<4;i++){
      const m=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
       float n=noise(vec3(u*4.-uT*3.5,v*1.5,uP));
       float al=smoothstep(0.,.15,(1.-u)*(.4+.7*n)-v)*smoothstep(0.,.08,u);
       gl_FragColor=vec4(mix(uC2,uC1,(1.-u)*n+.2)*1.5,al*uA);}`);
      m.uniforms.uP.value=i*2.3; tm.push(m);
      const r=new THREE.Mesh(helixGeo(0.7,0.58,0.25,2.6,0.35,60),m); r.rotation.y=i*1.571; tongues.add(r);
    }
    // suelo chamuscado con brasas que parpadean
    const burn=groundPlane(2.8,0,0.02,fx(`
    void main(){vec2 p=vUv-.5;float r=length(p)*2.;
     float n=noise(vec3(p*8.,1.))*.6+noise(vec3(p*20.,4.))*.4;
     float cr=pow(1.-abs(n*2.-1.),8.);float fl=.6+.4*noise(vec3(p*6.,uT*2.));
     float m=smoothstep(1.,.3,r);
     gl_FragColor=vec4(mix(uC2,uC1,cr*fl)*1.6,(cr*1.2*fl+.1+uP*.3*(1.-r))*m*uA);}`));
    G.decal.add(burn);
    VC.quemadura=a.count;
    PV.quemadura=(te,env,pu)=>{
      set(outer,pu,env); set(inner,pu,env*.9);
      tongues.rotation.y=te*1.3; for(const m of tm)m.uniforms.uA.value=env*(1+.5*pu);
      set(burn,pu,env);
    };
  })();

  a.setVariant=v=>{if(!VG[v])v="veneno";a.v=v;for(const k in VG)for(const l of LK)VG[k][l].visible=k===v;a.count=base+VC[v];};
  a.pal=()=>a.variants.find(x=>x[0]===a.v)[2];
  a.setVariant(a.v);

  const gp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,T1,te)*(1-ss(TF,TE,te));
    let pu=0,lt=-1; for(const k of TK)if(te>=k){pu+=Math.exp(-(te-k)*6);lt=k;}
    U.uE.value=env;
    // lanzamiento: el orbe se forma en la mano y vuela en parábola
    const ch=cl(te/TL), k=cl((te-TL)/(TI-TL));
    glob.visible=te<TI; if(te<TL)glob.position.copy(P0); else lob(k,glob.position);
    const gsz=Math.max(.2*(te<TL?ss(0,1,ch):1),.001), wob=Math.sin(te*31);
    glob.scale.set(gsz*(1+.15*wob),gsz*(1-.12*wob),gsz);
    caster.rotation.z=.14*ss(0,TL,te)-.32*ss(TL,TL+.08,te)+.18*ss(TL+.1,TL+.6,te);
    // aplicación
    const hit=ia>=0?Math.exp(-ia*6):0;
    target.position.x=3.4+hit*.16; target.rotation.z=-hit*.22*Math.cos(ia*15);
    for(const g of follow)g.position.x=target.position.x;
    let p=cl(ia/.35); set(applyRing,p,ia>=0?1-p:0);
    p=cl(ia/.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    if(lt>0){p=cl((te-lt)/.5);set(tickRing,p,(1-p)*env);}else set(tickRing,0,0);
    PV[a.v](te,env,pu);
    const tx=target.position.x, bur=ia>=0?Math.exp(-ia*8):0;
    const fl=a.v==="quemadura"?1+.35*Math.sin(te*23)*Math.sin(te*7.3):1;
    if(te<TL){o.g.copy(P0);o.gs=1.2*ch;o.ga=.6*ch;o.li=1.6*ch;}
    else if(te<TI){o.g.copy(glob.position);o.gs=1.1;o.ga=.65;o.li=3;}
    else{o.g.set(tx,1.1,0);o.gs=1.8+1.5*pu;o.ga=.75*bur+.1*env*fl+.25*pu;o.li=8*bur+2.4*env*fl+4*pu;}
    // cada tic es un mini impacto: flash, temblor y distorsión menores que la aplicación
    o.ia=lt>0?te-lt:ia; o.shake=lt>0?.25:.8; o.dist=lt>0?.35:.7; o.flash=lt>0?.6:1;
    o.c.set(tx,1.1,0); o.em=env*(.22+.5*pu); o.emc.copy(U.uC1.value);
  };
})();

// =====================================================================
// 5 · CURACIÓN Y ESCUDO — canalización, sanación sobre el aliado, escudo hexagonal que absorbe un golpe
// =====================================================================
const heal=ability({key:"heal",name:"Curación y escudo",dur:4.4,ti:2.45,
  phases:[["Canalización",0],["Sanación",0.85],["Escudo",1.55],["Absorción",2.45],["Disipación",3.3]]});
(function(){
  const TS=0.45,TH=0.85,TSH=1.55,TSF=2.05,TB=2.15,TI=2.45,TD=3.3,TE=4.0,a=heal,L=a.L;
  const Q0=V3(-3.3,1.4,0),QC=V3(0,3.6,0),Q1=V3(3.4,1.2,0),SC=V3(3.4,0.85,0),SR=1.45;
  const HD=V3(1,0.35,0.25).normalize(), HP=SC.clone().addScaledVector(HD,SR), B0=V3(9.5,1.45,0.6);
  const v3=v=>`vec3(${f(v.x)},${f(v.y)},${f(v.z)})`;
  const C=`const float TS=${f(TS)};const float TH=${f(TH)};const float TB=${f(TB)};const float TI=${f(TI)};const float TD=${f(TD)};
  const vec3 Q0=${v3(Q0)};const vec3 QC=${v3(QC)};const vec3 Q1=${v3(Q1)};const vec3 SC=${v3(SC)};const float SR=${f(SR)};
  const vec3 HP=${v3(HP)};const vec3 B0=${v3(B0)};
  vec3 bez(float u){return mix(mix(Q0,QC,u),mix(QC,Q1,u),u);}`;
  const curve=new THREE.QuadraticBezierCurve3(Q0,QC,Q1);

  // glifo sagrado: roseta de seis pétalos que gira
  const GLYPH_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.94,.018)+band(r,.84,.01);
   float pet=abs(cos(an*3.+uT*.6));
   m+=band(r,.62*pet,.02)*step(r,.8);
   m+=band(r,.72,.04)*step(.6,fract(an/6.2832*24.-uT*.3));
   m+=smoothstep(.25,0.,r)*.25;
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*uA);}`;
  const castGlyph=groundPlane(2.8,-3.7,0.02,fx(GLYPH_FS)), allyGlyph=groundPlane(3.4,3.4,0.022,fx(GLYPH_FS));
  const landRing=groundPlane(6,3.4,0.03,fx(RING_FS));
  // huella del escudo en el suelo
  const SF=Math.sqrt(SR*SR-SC.y*SC.y)/1.5;
  const shieldFoot=groundPlane(3,3.4,0.025,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(r,${f(SF)},.03)+band(r,${f(SF)},.18)*.3+uP*smoothstep(${f(SF)},0.,r)*.25;
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.3,m*uA);}`));
  L.decal.add(castGlyph,allyGlyph,landRing,shieldFoot);

  // haz de curación: tubo sobre la curva; un pulso recorre uv.x y deja una cola que se drena
  const stream=new THREE.Mesh(new THREE.TubeGeometry(curve,90,0.11,10,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;
   float core=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
   float tail=step(0.,d)*exp(-d*3.5)*(.6+.4*noise(vec3(u*20.-uT*12.,vUv.y*6.,0.)));
   float head=smoothstep(.06,0.,abs(d));
   gl_FragColor=vec4(mix(uC2,uC1,exp(-max(d,0.)*3.))*1.5+vec3(1.)*head,(tail+head)*core*uA);}`));
  L.trail.add(stream);

  // columna de luz y anillo que escanea al aliado de abajo arriba
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,4.5,40,1,true),fx(`
  void main(){float h=vP.y/4.5+.5;
   float n=noise(vec3(vP.x*3.,h*4.-uT*2.2,vP.z*3.))*.6+noise(vec3(vP.x*7.,h*9.-uT*3.5,vP.z*7.))*.4;
   float st=smoothstep(.5,.85,n);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,st+fr*.3)*1.2+vec3(1.)*st*(1.-h)*.25,(st*.6+fr*.35)*pow(1.-h,1.4)*uA);}`));
  pillar.position.set(3.4,2.25,0);
  const scan=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2).rotateX(-Math.PI/2),fx(`
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float m=band(r,.68,.06)+band(r,.68,.25)*.3;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.4,m*uA);}`));

  // escudo: rejilla hexagonal sobre la esfera; se arma de abajo arriba, se rompe de arriba abajo,
  // y el golpe genera una onda que viaja por la superficie desde el punto de impacto
  const shield=new THREE.Mesh(new THREE.SphereGeometry(SR,72,44,0,Math.PI*2,0,Math.PI*0.72),fxU(`
  uniform float uH;uniform vec3 uD;
  float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
  void main(){vec3 n=normalize(vP);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   vec2 uv=vec2(vUv.x*24.,vUv.y*12.);
   vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(uv,r)-h,b=mod(uv-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
   float e=.5-hexD(g);float cid=hash(vec3(uv-g,3.));
   float hN=(vP.y+.92)/2.37;
   float on=hN*.75+cid*.25;
   float vis=step(on,uP)*step(uP-1.,(1.-hN)*.75+cid*.25);
   float flash=smoothstep(.18,0.,uP-on)*step(uP,1.);
   float line=smoothstep(.06,0.,e)*smoothstep(.985,.93,vUv.y);
   float ang=acos(clamp(dot(n,uD),-1.,1.));float hit=step(0.,uH);
   float ring=band(ang,uH*2.4,.22)*exp(-uH*2.)*hit;
   float spot=exp(-ang*4.)*exp(-uH*5.)*hit;
   float shim=.75+.25*sin(uT*3.+cid*30.);
   float al=line*(.25+fr*.9)*shim+fr*.22+.035+(ring+spot)*(.5+line*1.5)+flash*(.4+line);
   vec3 c=mix(uC2,uC1,clamp(fr+line*.6,0.,1.))*1.3+vec3(1.)*(ring+spot+flash*.5)*.6;
   gl_FragColor=vec4(c,al*vis*uA);}`,{uH:{value:-1},uD:{value:HD.clone()}}));
  shield.position.copy(SC);

  // proyectil enemigo (rojo fijo, a propósito: debe leerse como ajeno a la paleta del sanador)
  const bolt=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.9,10,1,true).rotateZ(Math.PI/2),fx(`
  void main(){float l=-vP.x/.9+.5;
   gl_FragColor=vec4(vec3(1.,.32,.22)*1.6+vec3(1.)*pow(l,3.)*.8,smoothstep(0.,.4,l));}`));
  bolt.quaternion.setFromUnitVectors(V3(-1,0,0),HP.clone().sub(B0).normalize());
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(RING_FS));
  hitRing.position.copy(HP); hitRing.quaternion.setFromUnitVectors(V3(0,0,1),HD);
  L.mesh.add(pillar,scan,shield,bolt,hitRing);

  // partículas
  a.count+=points(L.part,160,C+`void main(){float life=.6+aSeed.y*.5;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);
   vec3 r=rr(c);float an=r.x*6.2832+age*2.;float rad=(.9-.5*age)*(.6+.4*r.y);
   vec3 p=vec3(-3.7+cos(an)*rad,.05+age*(1.6+r.z*.8),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*(1.-smoothstep(TH-.2,TH+.1,uT)):0.;put(p,.04+.05*r.z);}`);
  a.count+=points(L.part,200,C+`void main(){float s=TS+aSeed.x*(TH-TS);float life=.25+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bez((s-TS)/(TH-TS))+r*.08+r*.3*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.07*aSeed.z)*(1.-age*.5));}`);
  a.count+=points(L.part,220,C+`void main(){float s=TH+aSeed.x*.7;float life=.7+aSeed.y*.5;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*5.;float rad=.75-.3*age;
   vec3 p=vec3(3.4+cos(an)*rad,.1+age*(2.+aSeed.w),sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.05*aSeed.w);}`);
  a.count+=points(L.part,60,C+`void main(){float s=TH+aSeed.x;float life=1.+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(3.4+r.x*.8,.3+t*1.1+aSeed.w*.8,r.z*.8);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.16+.1*aSeed.y);}`,CROSS_FS);
  a.count+=points(L.part,120,C+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.2+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=mix(B0,HP,(s-TB)/(TI-TB))+r*.06+r*.2*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.06*aSeed.z)*(1.-age*.5));}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(vec3(1.,.35,.22)*1.5+vec3(1.)*smoothstep(.2,0.,d)*.4,a);}`);
  a.count+=points(L.part,260,C+`void main(){vec3 d=normalize(rnd()+vec3(0.,.35,0.));float hN=d.y*.5+.5;
   float s=TD+(1.-hN)*.55+aSeed.x*.1;float life=.6+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=SC+d*SR*(1.+t*.35)+vec3(0.,t*.6,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?(1.-age)*(.6+.4*sin(t*25.+aSeed.z*30.)):0.;put(p,.05+.05*aSeed.z);}`);
  a.count+=sparks(L.part,280,TI,`${f(HP.x)},${f(HP.y)},${f(HP.z)}`,".9,.5,.3",4,10,3);

  const su=shield.material.uniforms, bp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH;
    caster.rotation.z=.1*ss(0,TS,te)-.25*ss(TS,TS+.1,te)+.15*ss(TS+.2,TH+.4,te);
    castGlyph.material.uniforms.uA.value=ss(0,.25,te)*(1-ss(TH-.1,TH+.4,te));
    stream.visible=te>=TS&&te<TH+.35; set(stream,(te-TS)/(TH-TS),1-ss(TH,TH+.3,te));
    // sanación
    let p=cl(ih/.5); set(landRing,p,ih>=0?1-p:0);
    allyGlyph.material.uniforms.uA.value=ss(TH-.05,TH+.25,te)*(1-ss(TSH+.6,TSH+1.4,te));
    p=ss(TH,TH+.08,te)*(1-ss(TH+.25,TH+1.2,te)); pillar.visible=p>0.001; pillar.material.uniforms.uA.value=p;
    pillar.scale.set(1+.2*cl(ih),1,1+.2*cl(ih));
    const sc=ss(TH,TH+.8,te); scan.visible=ih>=0&&te<TH+.9; scan.position.set(3.4,.05+2.2*sc,0); scan.scale.setScalar(1-.25*sc);
    scan.material.uniforms.uA.value=1-ss(TH+.55,TH+.85,te);
    // escudo
    const sa=ss(TSH,TSH+.15,te)*(1-ss(TE-.2,TE,te));
    shield.visible=te>=TSH&&te<TE; shield.scale.setScalar(1+.012*Math.sin(te*5));
    su.uA.value=sa; su.uP.value=te<TD?cl((te-TSH)/(TSF-TSH)):1+cl((te-TD)/(TE-TD)); su.uH.value=ia>=0?ia:-1;
    set(shieldFoot,ia>=0?Math.exp(-ia*5):0,sa*(te<TD?1:1-cl((te-TD)/(TE-TD))));
    // golpe absorbido
    const kb=cl((te-TB)/(TI-TB)); bolt.visible=te>=TB&&te<TI; bolt.position.lerpVectors(B0,HP,kb);
    p=cl(ia/.35); set(hitRing,p,ia>=0?1-p:0);
    target.position.x=3.4+(ia>=0?Math.exp(-ia*6)*.05:0);
    if(te<TS){const ch=cl(te/TS);o.g.copy(Q0);o.gs=.9*ch;o.ga=.6*ch;o.li=2*ch;}
    else if(te<TH){curve.getPoint(cl((te-TS)/(TH-TS)),bp);o.g.copy(bp);o.gs=1.2;o.ga=.7;o.li=4;}
    else if(te<TSH){const e=Math.exp(-ih*4);o.g.set(3.4,1.1,0);o.gs=1.6+2*ih;o.ga=.6*e+.15;o.li=6*e+2;}
    else if(te<TI){o.g.copy(SC);o.gs=2.5;o.ga=.12*sa;o.li=2.5*sa;}
    else{const e=Math.exp(-ia*12);o.g.copy(HP);o.gs=1+4*ia;o.ga=e*.8;o.li=10*Math.exp(-ia*6)+2*sa;}
    // antes del golpe, o.ia cuenta desde la sanación: el aliado destella suave, sin temblor
    if(ia<0){o.ia=ih;o.c.set(3.4,1.1,0);o.shake=0;o.dist=.35;o.flash=.7;}
    else{o.ia=ia;o.c.copy(HP);o.shake=.9;o.dist=1;o.flash=.1;}
    o.em=.45*ss(TH,TH+.2,te)*(1-ss(TH+.6,TSH+.8,te))+.15*sa; o.emc.copy(U.uC1.value);
  };
  a.pal=()=>"Sagrado";
})();

// ---------- registro por módulos: cada habilidad se construye la primera vez que se abre ----------
aura.vlabel="Estado";
const ABS={}, MODS=[];
// ---------- niveles de habilidad según su costo de PA (documento "VFX - Clases") ----------
// 1: 0–1 PA rápido y preciso · 2: 2 PA firme y estándar · 3: ≥3 PA pesado y devastador
const TIER_OF=(()=>{const t={};
  for(const k of "boom conf zeal puppyEye sobby cotton poLeafy poRosa poHollow pjBlossom peSucculent ptYam".split(" "))t[k]=1;
  for(const k of "branch chubby shiba pcBeech pcShortcake poSakura pjRiskyTrunk pjCucumberSlice peForestHero".split(" "))t[k]=3;
  return t;})();
// el motor aplica la parte "de cámara" del nivel; tamaño, duración y partículas las ajusta cada habilidad
const TIER={0:{shake:1,dist:1,hs:1,glow:1,bloom:1},
  1:{shake:0,dist:0.25,hs:0.35,glow:0.6,bloom:0.75},
  2:{shake:0,dist:0.55,hs:0.7,glow:0.8,bloom:0.9},
  3:{shake:1.15,dist:1.15,hs:1.3,glow:1.1,bloom:1.12}};
const tierOf=ab=>ab.tier||(ab.mod==="Base"?0:(TIER_OF[ab.key]||(ab.pa!=null?(ab.pa<=1?1:ab.pa===2?2:3):2)));
function register(mod,def){
  let m=MODS.find(x=>x.name===mod); if(!m){m={name:mod,list:[]};MODS.push(m);}
  if(!def.root)ability(def); def.mod=mod; def.built=!def.build; ABS[def.key]=def; m.list.push(def); return def;
}
for(const ab of [lanza,tajo,area,aura,heal])register("Base",ab);
function ensureBuilt(ab){
  if(ab.built)return; ab.count=0; ab.build(ab); ab.built=true;
  if(ab.setVariant)ab.setVariant(ab.v); ab.root.updateMatrixWorld(true);
}
const palOf=ab=>typeof ab.pal==="function"?ab.pal():ab.pal;

// ---------- evaluar un fotograma de una habilidad (lo que antes hacía draw() antes de renderizar) ----------
function resetPose() {
  caster.position.set(-3.7,0,0); caster.rotation.z=0; target.position.set(3.4,0,0); target.rotation.z=0;
  caster.scale.set(1,1,1); target.scale.set(1,1,1); caster.userData.m.emissiveIntensity=0; caster.userData.m.emissive.setRGB(1,1,1); horns.scale.set(1,1,1); horns.position.set(0,0,0); hornMat.emissive.setRGB(1,0.54,0.16); hornMat.emissiveIntensity=0;
  allies.forEach((d,i)=>{d.position.copy(ALLY_POS[i]);d.rotation.z=0;d.scale.set(1,1,1);d.userData.m.emissive.setRGB(1,1,1);d.userData.m.emissiveIntensity=0;});
  enemies.forEach((d,i)=>{d.position.copy(ENEMY_POS[i]);d.rotation.z=0;d.scale.set(1,1,1);d.userData.m.emissive.setRGB(1,1,1);d.userData.m.emissiveIntensity=0;});
  target.userData.m.emissive.setRGB(1,1,1);
  O.em=0; O.flash=1; O.emc.setRGB(1,1,1); U.uE.value=1; O.bw=0; O.bwAng=0; O.pa=null; O.dark=0; O.white=0; O.ld=14;
}
/** Pose de la habilidad en el instante te + resplandor, luz y brillo del objetivo. Devuelve el nivel (TIER) aplicado. */
function evaluate(ab, te) {
  resetPose();
  U.uT.value=te; ab.pose(te,O);
  const ia=O.ia, tm=target.userData.m;
  tm.emissive.copy(O.emc); tm.emissiveIntensity=Math.max(ia>=0?Math.exp(-ia*11)*1.4*O.flash:0,O.em);
  const TT=TIER[tierOf(ab)];
  glow.position.copy(O.g); glow.scale.setScalar(Math.max(O.gs,0.001)); glow.material.uniforms.uA.value=O.ga*TT.glow; glow.quaternion.copy(camera.quaternion);
  light.position.copy(O.g); light.intensity=O.li*TT.glow; light.distance=O.ld;
  return TT;
}
function setPalette(name) {
  const p=PALETTES[name]; if(!p) return false;
  U.uC1.value.set(p[0]); U.uC2.value.set(p[1]); light.color.set(p[0]); return true;
}

return {
  THREE,V3,cl,ss,f,U,HEAD,PT_FS,fx,fxU,set,groundPlane,points,sparks,helixGeo,seeds,
  RING_FS,BURST_FS,SCORCH_FS,BUBBLE_FS,CROSS_FS,LK,scene,camera,caster,target,allies,ALLY_POS,horns,hornMat,HORN_TIPS,
  enemies,ENEMY_POS,
  palette(name,c){PALETTES[name]=c;},
  // punto del mundo bajo una coordenada de pantalla NDC (-1..1), a "dist" unidades de la cámara
  screenToWorld(nx,ny,dist,out){out.set(nx,ny,0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(dist).add(camera.position);return out;},
  // centro (NDC) de la esfera i de la barra de PA: el anfitrión (laboratorio o juego) lo sustituye
  hudOrbNDC(i,out){return out.set(-0.8,-0.85);},
  tierOf:k=>tierOf(ABS[k]),
  list(){return Object.values(ABS).map(a=>[a.key,a.variants?a.variants.map(v=>v[0]):[null]]);},
  module(name,defs){for(const d of defs)register(name,d);},
  // ---- para el anfitrión ----
  PALETTES, ABS, MODS, TIER, O, glow, light, base:{lanza,tajo,area,aura,heal},
  register, ensureBuilt, palOf, tierOfAbility:tierOf, resetPose, evaluate, setPalette,
};
}

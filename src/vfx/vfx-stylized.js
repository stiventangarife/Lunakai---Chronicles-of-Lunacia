// =====================================================================
// KIT ESTILIZADO DE VFX (29-oct) — materiales al estilo del arte del juego (Genshin: pintado, cel-shading suave).
// Se carga junto a vfx-lib.js y no cambia nada de lo que ya existe: los módulos viejos siguen igual y los
// nuevos piden estos materiales. Las cuatro técnicas:
//   1. Erosión del alfa: las piezas se consumen desde el borde (styErode) en vez de volverse transparentes.
//   2. Rampa de color de 4 tonos (styRamp): sombra fría → color oscuro → color claro → brillo caliente,
//      sacada de la paleta del efecto (uC1/uC2) y del color de sombra del tablero.
//   3. Mezcla por capas: la materia (humo, jugo, roca, colmillos) usa mezcla normal y tapa el fondo; solo los
//      núcleos de energía son aditivos y pasan de 1 para que los recoja el bloom. Así se lee sin velo oscuro.
//   4. Sombreado en bandas con la luz del sol del tablero (styLight): 3 tonos, lado del sol cálido, sombra fría.
// Texturas (src/vfx/textures/, horneadas con tools/vfx-lab/bake/bake_sty_textures.py):
//   sty-noise.webp  R fbm · G celdas · B vetas en U · A ruido fino      (tileable, lineal)
//   sty-shapes.webp atlas 4×2: humo, llama, hoja, esquirla, gota, chispa, corte, anillo (R altura, G detalle)
// API: VFX.sty = { U, GLSL, CELL, mat(fs, extra, opts), pts(parent, n, vs, fs, opts), setLight(...), ready }
//   mat(): material de malla (mismo vertex shader y uniformes uA/uP que fx(), así que set() funciona).
//   pts(): partículas (core.points) con los uniformes del kit; el vs usa put(p,size) como siempre.
//   opts.mode: 'matter' (mezcla normal, por defecto) · 'energy' (aditiva) · 'solid' (opaca, escribe profundidad)
// =====================================================================
(function(){
if(!window.VFX||VFX.sty)return;
const {THREE,U,HEAD,fxU,points}=VFX;

// ---------- texturas compartidas (una carga por sesión) ----------
const here=(document.currentScript&&document.currentScript.src)||location.href;
const base=new URL('./textures/',here).href;
const loader=new THREE.TextureLoader();
function tex(name,repeat){
  return new Promise(res=>{
    const t=loader.load(base+name,()=>res(t),undefined,()=>{console.warn('[vfx-sty] no se pudo cargar',name);res(t);});
    t.colorSpace=THREE.NoColorSpace;              // datos, no color
    t.wrapS=t.wrapT=repeat?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
    t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter;
    t.anisotropy=4;
    t.userData.vfxSty=true;
    S.U[repeat?'uNoiseTex':'uShapeTex'].value=t;
  });
}

const S={};
S.U={
  uNoiseTex:{value:null}, uShapeTex:{value:null},
  uSunW:{value:new THREE.Vector3(0.6,0.55,0.5).normalize()},   // dirección hacia el sol, en el mundo
  uSunCol:{value:new THREE.Color(0xffd7a0)},                    // tinte del lado iluminado
  uShadeCol:{value:new THREE.Color(0xb9d6f2)},                  // tinte de la sombra (cielo)
};
S.ready=Promise.all([tex('sty-noise.webp',true),tex('sty-shapes.webp',false)]);
S.CELL={puff:0,flame:1,leaf:2,shard:3,drop:4,spark:5,slash:6,ring:7};

/** Luz del tablero: dirección al sol (mundo), color del sol y de la sombra. Lo llama el anfitrión al reproducir. */
S.setLight=function(dir,sunCol,shadeCol){
  if(dir&&dir.lengthSq()>1e-8)S.U.uSunW.value.copy(dir).normalize();
  if(sunCol)S.U.uSunCol.value.copy(sunCol);
  if(shadeCol)S.U.uShadeCol.value.copy(shadeCol);
};

// ---------- GLSL del kit (va después de HEAD: usa uC1, uC2, uT, noise) ----------
S.GLSL=`
uniform sampler2D uNoiseTex;uniform sampler2D uShapeTex;uniform vec3 uSunW;uniform vec3 uSunCol;uniform vec3 uShadeCol;
vec4 styNoise(vec2 uv){return texture2D(uNoiseTex,uv);}
// celda del atlas (0..7); uv 0..1 dentro de la celda con y hacia arriba
vec4 styShape(float cell,vec2 uv){uv=clamp(uv,.004,.996);vec2 o=vec2(mod(cell,4.),floor(cell/4.+.01));
 vec4 s=texture2D(uShapeTex,vec2((o.x+uv.x)*.25,1.-(o.y+1.-uv.y)*.5));s.r=max(s.r-.025,0.)/.975;return s;}
// relieve de la forma → normal en el plano de la pantalla (x derecha, y arriba, z hacia la cámara)
vec3 styShapeN(float cell,vec2 uv,float k){float e=2.5/256.;k*=.45;
 float hx=styShape(cell,uv+vec2(e,0.)).r-styShape(cell,uv-vec2(e,0.)).r;
 float hy=styShape(cell,uv+vec2(0.,e)).r-styShape(cell,uv-vec2(0.,e)).r;
 return normalize(vec3(-hx*k,-hy*k,1.));}
// dirección al sol en el espacio de la vista (la normal de un billboard ya está en ese espacio)
vec3 stySunV(){return normalize((viewMatrix*vec4(uSunW,0.)).xyz);}
// 3 tonos duros: 0 sombra · .55 media · 1 luz (bordes estrechos, sin degradado)
float styLight(vec3 n,vec3 L){float d=dot(n,L);return smoothstep(-.12,-.02,d)*.55+smoothstep(.42,.5,d)*.45;}
// rampa de 4 tonos de la paleta: 0 sombra fría · .35 oscuro · .7 claro · 1 brillo caliente
vec3 styRamp(float x){x=clamp(x,0.,1.);
 vec3 deep=mix(uC2*.42,uShadeCol*.3,.35),mid=uC2,lit=uC1,hot=mix(uC1,vec3(1.,.97,.9),.38);
 return x<.35?mix(deep,mid,x/.35):(x<.7?mix(mid,lit,(x-.35)/.35):mix(lit,hot,(x-.7)/.3));}
// rampa de un solo color (para materia de un tono: pulpa, cáscara, tierra): sombra fría → color → brillo
vec3 styRampOf(vec3 col,float x){x=clamp(x,0.,1.);
 vec3 deep=mix(col*.32,uShadeCol*.25,.3),hot=mix(col,vec3(1.,.97,.9),.25);
 return x<.45?mix(deep,col*.8,x/.45):(x<.8?mix(col*.8,col,(x-.45)/.35):mix(col,hot,(x-.8)/.2));}
// tinte del sol (lado iluminado) y del cielo (sombra), normalizados para no oscurecer
vec3 styTint(float l){vec3 a=uShadeCol/max(max(uShadeCol.r,uShadeCol.g),max(uShadeCol.b,.001));
 vec3 b=uSunCol/max(max(uSunCol.r,uSunCol.g),max(uSunCol.b,.001));return mix(mix(a,vec3(1.),.45),mix(b,vec3(1.),.55),l);}
// erosión: m = valor de la máscara (0..1), t = umbral que sube con la vida, s = suavidad del borde
float styErode(float m,float t,float s){return smoothstep(t,t+s,m);}
// materia iluminada: color de la rampa según la luz, con el tinte cálido/frío del tablero
vec3 styMatter(float l,float bias){return styRamp(clamp(.22+.5*l+bias,0.,1.))*styTint(l);}
`;

const MODE={
  matter:{blending:THREE.NormalBlending,transparent:true,depthWrite:false},
  energy:{blending:THREE.AdditiveBlending,transparent:true,depthWrite:false},
  solid:{blending:THREE.NormalBlending,transparent:false,depthWrite:true,side:THREE.FrontSide},
};
const kitUniforms=()=>({uNoiseTex:S.U.uNoiseTex,uShapeTex:S.U.uShapeTex,uSunW:S.U.uSunW,uSunCol:S.U.uSunCol,uShadeCol:S.U.uShadeCol});

/** Material de malla estilizado. fs = cuerpo con void main(){…}; extra = uniformes propios. */
S.mat=function(fs,extra,opts){
  opts=Object.assign({},opts||{});
  const mode=MODE[opts.mode||'matter']; delete opts.mode;
  return fxU(S.GLSL+fs,Object.assign(kitUniforms(),extra||{}),Object.assign({},mode,opts));
};

/** Partículas estilizadas: como core.points pero con los uniformes del kit (y los propios en opts.uniforms). */
S.pts=function(parent,n,vs,fs,opts){
  opts=Object.assign({},opts||{});
  const mode=MODE[opts.mode||'matter']; delete opts.mode;
  const uniforms=Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},kitUniforms(),opts.uniforms||{});
  delete opts.uniforms;
  return points(parent,n,vs,HEAD+S.GLSL+fs,Object.assign({},mode,{uniforms},opts));
};

// ---------- fragmentos de partícula listos para usar ----------
// Todos leen: vA (alfa de vida), vMix (semilla), vR (giro), vK (edad 0..1 → erosión). El vs debe escribir vR y vK.
const PV=`varying float vA;varying float vMix;varying float vR;varying float vK;
vec2 styPC(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vR),s=sin(vR);return vec2(c*q.x-s*q.y,s*q.x+c*q.y)+.5;}`;
S.PV=PV;
/**
 * Materia iluminada con una forma del atlas: humo, esquirla, gota, hoja… bias aclara u oscurece la rampa.
 * col (expresión GLSL, p. ej. 'uC1' o 'vec3(.8,.68,.52)') = materia de un solo tono (styRampOf) en vez de la rampa de la paleta.
 */
S.MATTER_FS=(cell,{relief=5,bias=0,erodeSoft=.1,grey=0,col=null}={})=>PV+`
void main(){vec2 uv=styPC();vec4 sh=styShape(${cell.toFixed(1)},uv);
 float m=sh.r;if(m<.01)discard;
 float er=styErode(m*.55+sh.b*.45,vK*1.05-.08,${erodeSoft.toFixed(3)});
 float a=er*smoothstep(.0,.06,m)*vA;if(a<.01)discard;
 float l=styLight(styShapeN(${cell.toFixed(1)},uv,${relief.toFixed(2)}),stySunV());
 vec3 c=${col?`styRampOf(${col},clamp(.25+.55*l+${bias.toFixed(3)}+sh.g*.15,0.,1.))*styTint(l)`:`styMatter(l,${bias.toFixed(3)}+sh.g*.18)`};
 c=mix(c,vec3(dot(c,vec3(.3,.59,.11))),${grey.toFixed(3)});
 gl_FragColor=vec4(c,a);}`;
/** Energía: forma del atlas como luz aditiva; el detalle (G) es el núcleo caliente que pasa de 1 (bloom). */
S.ENERGY_FS=(cell,{gain=1.6,erodeSoft=.12}={})=>PV+`
void main(){vec2 uv=styPC();vec4 sh=styShape(${cell.toFixed(1)},uv);
 float m=sh.r;if(m<.01)discard;
 float er=styErode(m*.6+sh.b*.4,vK*1.05-.05,${erodeSoft.toFixed(3)});
 float a=er*vA;if(a<.01)discard;
 vec3 c=styRamp(.45+.42*m)+vec3(1.,.95,.85)*sh.g*.55;
 gl_FragColor=vec4(c*${gain.toFixed(2)},a);}`;

// =====================================================================
// PIEZAS COMPARTIDAS por los módulos estilizados
// =====================================================================
const {V3,cl,ss,f,set,groundPlane,camera}=VFX;
const {billboard,towardCam,v3}=VFX.lib||{};
S.FS={};
// chispa de impacto: 7 púas de largo irregular + núcleo pequeño; uP = semilla de las púas, uEr = erosión
S.FS.HITSPARK=`uniform float uEr;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float k=an/6.2832*7.+.5;float id=floor(k);float fk=fract(k)-.5;
 float len=.5+.5*fract(sin(id*12.9898+uP*7.1)*43758.5453);
 float hw=.5*(1.-r/len);float spike=smoothstep(hw+.03,hw-.03,abs(fk))*step(r,len);
 float core=smoothstep(.24,.18,r);
 float m=max(spike,core);if(m<.01)discard;
 float er=styErode(m*.45+styNoise(p*.45+.5).a*.55,uEr,.1);
 float rr=r/max(len,.01);
 vec3 c=styRamp(.82-.5*rr)*(1.15-.35*rr)+vec3(1.,.95,.86)*core*.7;
 gl_FragColor=vec4(c,m*er*uA);}`;
// anillo de pincel en el suelo (energía suave); uP = erosión
S.FS.RING=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.62+.38*s.g)*1.15,s.r*er*uA*.85);}`;
// sombra de contacto (materia): une al suelo lo que flota, salta o rueda
S.FS.CONTACT=`void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(uShadeCol*.1,smoothstep(1.,.25,r)*.42*uA);}`;

/** Chispa de impacto en billboard. pose(ia, punto, seed): crece 0,06 s y se erosiona hasta 0,17 s después del golpe. */
S.hitSpark=function(parent,size=1.6,{seed=0.37,grow=0.06,life=0.17,toCam=0.6,spin=0.3}={}){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),S.mat(S.FS.HITSPARK,{uEr:{value:0}},{mode:'energy',depthTest:false}));
  parent.add(m);
  const tmp=V3(0,0,0);
  return {mesh:m,pose(ia,p,k=1){
    const sp=cl(ia/grow), se=ss(grow*0.5,life,ia);
    towardCam(m.position,tmp.copy(p),toCam); billboard(m,spin);
    m.visible=ia>=0&&se<1; m.scale.setScalar(Math.max(k*(0.55+0.6*(1-Math.pow(1-sp,3))),0.001));
    m.material.uniforms.uA.value=1; m.material.uniforms.uP.value=seed; m.material.uniforms.uEr.value=-0.1+1.1*se;
  }};
};
/** Anillo de pincel en el suelo. pose(ia, x, z, dur): se abre y se consume en dur segundos. */
S.groundRing=function(parent,size=2.6){
  const m=groundPlane(size,0,0.03,S.mat(S.FS.RING,{},{mode:'energy'})); parent.add(m);
  return {mesh:m,pose(ia,x,z=0,dur=0.42,k=1){
    const p=cl(ia/dur); m.position.x=x; m.position.z=z; m.visible=ia>=0&&p<1;
    m.scale.setScalar(Math.max(k*(0.55+0.6*(1-Math.pow(1-p,2))),0.001)); set(m,0.05+0.9*p,ia>=0?1:0);
  }};
};
/** Sombra de contacto. pose(x, z, k, alfa). */
S.contactShadow=function(parent,size=1.4){
  const m=groundPlane(size,0,0.02,S.mat(S.FS.CONTACT,{},{mode:'matter'})); parent.add(m);
  return {mesh:m,pose(x,z,k,a){m.position.x=x;m.position.z=z;m.scale.setScalar(Math.max(k,0.001));m.material.uniforms.uA.value=a;m.visible=a>0.001;}};
};

// =====================================================================
// ESTADOS ESTILIZADOS en las unidades — colores semánticos fijos (se leen con cualquier paleta)
//   S.status(a, kind, who, T0, TE, { layer }) → { kind, groups, setVisible(b), pose(te) → env }
//   kind: poison · slow · weak · fragile · burn · bleed · stun · taunt
//   who = muñecos afectados (target, enemies[0]…); ventana T0..TE; la envolvente entra en 0,12 s y sale en 0,15 s
// =====================================================================
S.ST_COL={poison:'vec3(.32,.85,.28)',slow:'vec3(.42,.58,.95)',weak:'vec3(.58,.36,.92)',fragile:'vec3(.98,.78,.86)',
  burn:'vec3(1.,.48,.12)',bleed:'vec3(.82,.07,.1)',stun:'vec3(1.,.84,.3)',taunt:'vec3(1.,.3,.16)'};
S.ST_RGB={poison:[0.32,0.85,0.28],slow:[0.42,0.58,0.95],weak:[0.58,0.36,0.92],fragile:[0.98,0.78,0.86],
  burn:[1,0.48,0.12],bleed:[0.82,0.07,0.1],stun:[1,0.84,0.3],taunt:[1,0.3,0.16]};
// burbuja: borde de color con luz, centro casi transparente y brillo duro
const BUBBLE_STY=col=>PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;
 float rim=smoothstep(.34,.44,d)*smoothstep(.5,.45,d);float hl=step(length(q-vec2(-.13,-.14)),.07);
 float a=(rim*.9+.12*smoothstep(.45,0.,d)+hl)*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(styRampOf(${col},.55+.4*(-q.y+.5)*.6),vec3(1.),hl),a);}`;
// chevrón hacia abajo (debilitar)
const CHEV_STY=col=>PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(${col},.75+.25*step(0.,y+.12-abs(q.x)*.9)),a);}`;
// mancha en el suelo (charco, chamuscado, sangre) con borde orgánico; uP = erosión
const POOL_STY=(col,dark)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.7,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);
 gl_FragColor=vec4(styRampOf(${col},${dark?'.08+.2*n':'.35+.35*n'}),m*er*uA*${dark?'.55':'.6'});}`;

S.status=function(a,kind,who,T0,TE,opts){
  opts=opts||{};
  const N=who.length,W=who.map(()=>V3(0,0,0)),K={value:0},col=S.ST_COL[kind]||'uC1';
  const groups={part:new THREE.Group(),decal:new THREE.Group(),mesh:new THREE.Group()};
  a.L.part.add(groups.part); a.L.decal.add(groups.decal); a.L.mesh.add(groups.mesh);
  const uni={uW:{value:W},uK:K};
  const C=`uniform vec3 uW[${N}];uniform float uK;const float T0=${f(T0)};varying float vR;varying float vK;
  vec3 wp(){return uW[int(min(aSeed.w*${f(N)},${f(N-1)}))];}`;
  const LOOP=life=>`float life=${life};float k=(uT-T0)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float on=uT>T0?uK:0.;`;
  const P=(n,vs,fs,o)=>{a.count=(a.count||0)+S.pts(groups.part,n*N,C+vs,fs,Object.assign({uniforms:uni},o||{}));};
  const decals=[];
  const decal=(fs,size=1.5)=>{for(let i=0;i<N;i++){const m=groundPlane(size,0,0.018+0.002*i,S.mat(fs,{},{mode:'matter'}));groups.decal.add(m);decals.push(m);}};
  const orbit=[];
  if(kind==='poison'){
    P(22,`void main(){${LOOP('.5+aSeed.y*.3')}float an=r.x*6.2832+age*2.;float rad=.3+.22*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,.15+age*(1.2+.5*r.z),sin(an)*rad);vR=0.;vK=0.;
     vA=smoothstep(0.,.15,age)*(1.-smoothstep(.85,1.,age))*on;put(p,(.16+.12*r.z)*(.6+.6*age));}`,BUBBLE_STY(col));
    decal(POOL_STY(col,false),1.4);
  }else if(kind==='slow'){
    P(14,`void main(){${LOOP('.7+aSeed.y*.3')}float an=r.x*6.2832;float rad=.42;
     vec3 p=wp()+vec3(cos(an)*rad,1.2-age*age*1.1-r.y*.15,sin(an)*rad);vR=3.14159;vK=smoothstep(.8,1.,age);
     vA=smoothstep(0.,.12,age)*on;put(p,.19+.07*r.z);}`,S.MATTER_FS(S.CELL.drop,{relief:4,col}));
    decal(POOL_STY(col,false),1.6);
  }else if(kind==='weak'){
    P(12,`void main(){${LOOP('.6+aSeed.y*.25')}float an=r.x*6.2832+uT*.6;float rad=.55+.12*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,1.8-age*1.4,sin(an)*rad);vR=0.;vK=0.;
     vA=sin(age*3.14159)*on;put(p,.2+.08*r.z);}`,CHEV_STY(col),{mode:'energy'});
  }else if(kind==='fragile'){
    P(10,`void main(){${LOOP('.5+aSeed.y*.2')}float an=r.x*6.2832;vec3 p=wp()+vec3(cos(an)*.5,.4+r.y*1.3-age*age*1.2,sin(an)*.5);
     p.y=max(p.y,.03);vR=r.z*6.28+age*6.;vK=smoothstep(.6,1.,age);vA=on;put(p,.19+.07*r.z);}`,S.MATTER_FS(S.CELL.shard,{relief:3,col}));
  }else if(kind==='burn'){
    P(18,`void main(){${LOOP('.36+aSeed.y*.2')}float an=r.x*6.2832;float rad=.22+.25*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,.12+age*(.45+.3*r.z),sin(an)*rad);vR=(r.y-.5)*.4;vK=smoothstep(.3,1.,age);
     vA=smoothstep(0.,.12,age)*on;put(p,(.32+.16*r.z)*(1.-age*.4));}`,S.ENERGY_FS(S.CELL.flame,{gain:1.35}),{mode:'energy'});
    decal(POOL_STY('vec3(.16,.09,.05)',true),1.5);
  }else if(kind==='bleed'){
    P(12,`void main(){${LOOP('.55+aSeed.y*.25')}float an=r.x*6.2832;float rad=.3+.12*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,1.-age*age*1.,sin(an)*rad);vR=3.14159;vK=smoothstep(.85,1.,age);
     vA=(p.y>.03?1.:0.)*on;put(p,.17+.07*r.z);}`,S.MATTER_FS(S.CELL.drop,{relief:4,col}));
    decal(POOL_STY(col,false),1.1);
  }else if(kind==='stun'){
    P(5,`void main(){float on=uT>T0?uK:0.;float an=aSeed.x*6.2832+uT*4.;
     vec3 p=wp()+vec3(cos(an)*.42,1.75+sin(uT*3.+aSeed.x*6.)*.06,sin(an)*.42);vR=uT*3.;vK=0.;
     vA=on;put(p,.26);}`,S.ENERGY_FS(S.CELL.spark,{gain:1.3}),{mode:'energy'});
  }else if(kind==='taunt'){
    for(let i=0;i<N;i++){const m=groundPlane(2.0,0,0.03,S.mat(`void main(){vec4 s=styShape(7.,vUv);
      gl_FragColor=vec4(styRampOf(${col},.7+.3*s.g),s.r*uA*.9);}`,{},{mode:'energy'}));groups.decal.add(m);orbit.push(m);}
  }
  const all=[groups.part,groups.decal,groups.mesh];
  return {kind,groups,
    setVisible(b){for(const g of all)g.visible=b;},
    pose(te){
      const env=ss(T0,T0+0.12,te)*(1-ss(TE-0.15,TE,te)); K.value=env;
      for(let i=0;i<N;i++)W[i].copy(who[i].position);
      decals.forEach((m,i)=>{const w=who[i].position;m.position.x=w.x;m.position.z=w.z;
        m.scale.setScalar(Math.max(0.4+0.6*ss(T0,T0+0.3,te),0.001));set(m,-0.1+1.1*ss(TE-0.45,TE,te),env);});
      orbit.forEach((m,i)=>{const w=who[i].position;m.position.x=w.x;m.position.z=w.z;
        const pu=0.85+0.15*Math.sin(te*14);m.scale.setScalar(pu);m.material.uniforms.uA.value=env;});
      return env;
    }};
};
/** Brillo del objetivo según el estado más fuerte de la lista [{kind, env}]. */
S.statusGlow=function(o,list){let best=0,c=null;for(const s of list)if(s&&s.env>best){best=s.env;c=S.ST_RGB[s.kind];}
  if(c){o.em=Math.max(o.em||0,0.3*best);o.emc.setRGB(c[0],c[1],c[2]);}};

/** Hito 104: alinea un objeto de área (cruz, cuadrado, línea de casillas) con la cuadrícula del tablero: lo gira
 *  VFX.gridSnap alrededor del punto (px, pz) del laboratorio (el objetivo). Llamar en pose(); en línea recta no hace nada. */
S.gridAlign=function(o,px,pz){const a=-(VFX.gridSnap||0),c=Math.cos(a),s=Math.sin(a);
  const b=o.userData._gbase||(o.userData._gbase=o.position.clone());   // posición propia (sin girar), la primera vez
  const dx=b.x-px,dz=b.z-pz;
  o.rotation.y=a;o.position.set(px+c*dx+s*dz,b.y,pz-s*dx+c*dz);};

/** Fábricas estilizadas de los efectos básicos (mod-estilizado-cuerpo/distancia/apoyo.js). */
S.basic=S.basic||{};

VFX.sty=S;
})();

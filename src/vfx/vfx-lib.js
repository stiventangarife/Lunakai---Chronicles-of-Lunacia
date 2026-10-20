// =====================================================================
// LIBRERÍA COMPARTIDA DE VFX — piezas reutilizables por todos los módulos (mod-*.js)
// =====================================================================
(function(){
if(!window.VFX)return;
const {THREE,V3,f,HEAD,camera}=VFX;
// paletas compartidas por varios módulos (una sola definición; ningún color repetido entre paletas)
VFX.palette("Dorado",["#ffe08a","#ff9a1c"]);
VFX.palette("Rubí",["#ff4f73","#a10f35"]);
VFX.palette("Ámbar",["#ffbe5c","#ff6412"]);
VFX.palette("Rosa",["#ff7aa8","#c0124a"]);
VFX.palette("Savia",["#d8ff72","#2a9b3e"]);
VFX.palette("Sakura",["#ffd6ea","#ff5fa2"]);
VFX.palette("Rocío (Boca)",["#c8fff0","#35b98f"]);
VFX.palette("Esmeralda",["#e6ffb4","#12a35c"]);
VFX.palette("Loto",["#b8f4ff","#2f8fd0"]);
const NB={blending:THREE.NormalBlending};                         // materiales que oscurecen (fuego negro, polvo)
const SOLID={blending:THREE.NormalBlending,transparent:false,depthWrite:true,side:THREE.FrontSide};
const v3=v=>`vec3(${f(v.x)},${f(v.y)},${f(v.z)})`;


// fuego vertical sobre un cilindro abierto; uP aviva las lenguas
const fireFS=(H,speed=3.2)=>`void main(){float h=vP.y/${f(H)}+.5;
 vec3 q=vec3(vP.x*2.6,vP.y*1.6-uT*${f(speed)},vP.z*2.6);
 float n=noise(q)*.55+noise(q*2.1+vec3(0.,-uT*2.,0.))*.3+noise(q*4.3)*.15;
 float fl=n-h*1.05+.35+.3*uP;
 float al=smoothstep(0.,.25,fl);float hot=smoothstep(.25,.6,fl);
 vec3 c=mix(uC2,uC1,hot)+vec3(1.)*smoothstep(.55,.8,fl)*.6;
 float fr=1.-abs(dot(normalize(vN),normalize(vV)));
 gl_FragColor=vec4(c*1.5,al*(.35+.65*fr)*uA);}`;
// fuego negro: mezcla normal, núcleo casi negro y borde carmesí (el aditivo no puede oscurecer)
const darkFireFS=H=>`void main(){float h=vP.y/${f(H)}+.5;
 vec3 q=vec3(vP.x*2.2,vP.y*1.4-uT*2.6,vP.z*2.2);
 float n=noise(q)*.55+noise(q*2.3+vec3(0.,-uT*1.7,3.))*.3+noise(q*4.7)*.15;
 float fl=n-h*1.1+.4+.3*uP;
 float al=smoothstep(0.,.18,fl);
 vec3 c=mix(uC2*1.6,vec3(.03,0.,.015),smoothstep(.08,.32,fl));
 gl_FragColor=vec4(c,al*.9*uA);}`;
// fragmento "esquirla": rombo duro con brillo en el filo
const CHIP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.6;
 float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,vMix)*1.2+vec3(1.)*smoothstep(.2,.0,d)*.4,a);}`;
// polvo: bola suave con mezcla normal, tono tierra teñido por la paleta
const DUST_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.05,d)*vA*.55;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.42,.34,.26),uC1*.7,.25+.2*vMix),a);}`;
// llama pequeña: gota apuntando arriba
const FLAME_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float w=.32*(1.-smoothstep(-.35,.45,q.y));
 float body=smoothstep(w,w-.12,abs(q.x))*smoothstep(-.48,-.3,q.y)*smoothstep(.48,.2,q.y);
 float core=smoothstep(w*.5,0.,abs(q.x))*smoothstep(.1,-.25,q.y);
 float a=(body+core*.5)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,core+.3)*1.4+vec3(core*.4),a);}`;
// lana: copo esponjoso de tres lóbulos
const FLUFF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;
 float l=smoothstep(.26,.1,length(q-vec2(-.1,.05)))+smoothstep(.24,.08,length(q-vec2(.11,.06)))+smoothstep(.22,.06,length(q-vec2(0.,-.1)));
 float a=min(l,1.)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.96,.86),uC1,.35)*1.25,a);}`;
// chevrón de mejora: flecha hacia arriba
const CHEVRON_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=abs(q.y-.15+abs(q.x)*.9);
 float a=smoothstep(.09,.04,d)*step(abs(q.x),.38)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,a);}`;
// trazo de corte en billboard: media luna que barre en u; uQ deja una rasgadura que persiste
const SLASH_FS=`uniform float uQ;
void main(){float u=vUv.x;float y=(vUv.y-.5)-.14*(1.-pow(2.*u-1.,2.));
 float w=.012+.05*sin(3.14159*u);
 float d=uP-u;float sweep=step(0.,d)*exp(-d*2.6)*smoothstep(0.,.05,u)*smoothstep(1.,.93,u);
 float core=smoothstep(w*.35,0.,abs(y));float body=smoothstep(w*2.4,0.,abs(y));
 float tear=smoothstep(w*.3,0.,abs(y))*step(u,uP)*sin(3.14159*u);
 float al=(body*.7+core)*sweep*uA+tear*uQ;
 gl_FragColor=vec4(mix(uC2,uC1,core)*1.6+vec3(1.)*core*(sweep*uA+uQ)*.7,al);}`;
// billboard orientado a cámara con giro en su plano
const qz=new THREE.Quaternion(), ZA=V3(0,0,1);
const billboard=(m,ang)=>{m.quaternion.copy(camera.quaternion);if(ang)m.quaternion.multiply(qz.setFromAxisAngle(ZA,ang));};
const camDir=V3(0,0,0);
const towardCam=(out,p,d)=>{camDir.copy(camera.position).sub(p).normalize();return out.copy(p).addScaledVector(camDir,d);};
// tubo afinado: TubeGeometry recorre la curva con getPointAt(i/seg), así que se puede escalar cada anillo hacia su eje
function taperTube(curve,seg,rad,r0,r1){
  const g=new THREE.TubeGeometry(curve,seg,r0,rad,false), pa=g.attributes&&g.attributes.position, uv=g.attributes&&g.attributes.uv;
  if(!pa)return g; const c=V3(0,0,0);
  for(let i=0;i<pa.count;i++){const u=uv.getX(i);curve.getPointAt(Math.min(u,1),c);const k=(r0+(r1-r0)*u)/r0;
    pa.setXYZ(i,c.x+(pa.getX(i)-c.x)*k,c.y+(pa.getY(i)-c.y)*k,c.z+(pa.getZ(i)-c.z)*k);}
  pa.needsUpdate=true; g.computeVertexNormals(); return g;
}
// grupo de variantes: un subgrupo por variante en cada capa
function variantGroups(a,keys){
  const VG={};for(const v of keys){VG[v]={};for(const k of VFX.LK){const g=new THREE.Group();a.L[k].add(g);VG[v][k]=g;}}
  return VG;
}

// ---------- añadidas con el módulo 2 ----------
// corazón (IQ): punta abajo en (0,0), lóbulos hasta y≈1.1
const SD_HEART=`float sdHeart(vec2 p){p.x=abs(p.x);
 if(p.y+p.x>1.)return sqrt(dot(p-vec2(.25,.75),p-vec2(.25,.75)))-.35355;
 vec2 q=p-.5*max(p.x+p.y,0.);return sqrt(min(dot(p-vec2(0.,1.),p-vec2(0.,1.)),dot(q,q)))*sign(p.x-p.y);}`;
const HEART_FS=HEAD+SD_HEART+`varying float vA;varying float vMix;
void main(){vec2 p=(vec2(gl_PointCoord.x,1.-gl_PointCoord.y)-vec2(.5,.12))*1.45;float d=sdHeart(p);
 float a=(smoothstep(.04,-.02,d)+smoothstep(.25,0.,d)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),smoothstep(0.,-.25,d)*.4)*1.4,a);}`;
// destello de cuatro puntas
const STAR4_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5)*2.;
 float s=smoothstep(.12,0.,q.x*q.y*6.+min(q.x,q.y))*smoothstep(1.,.2,max(q.x,q.y));
 float c=smoothstep(.35,0.,length(q));
 float a=(s+c)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.5+.5*c)*1.6,a);}`;
// humo: bola suave con mezcla normal; color base gris, vMix aclara/oscurece
const SMOKE_FS=(col)=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float n=noise(vec3(q*5.,vMix*20.));
 float a=smoothstep(.5,.1,d+(n-.5)*.18)*vA;if(a<.003)discard;
 gl_FragColor=vec4(${col}*(.75+.5*vMix),a);}`;
// colmillos en billboard: fila de dientes triangulares; uQ=1 arriba (apuntan abajo), -1 abajo
const FANG_FS=(N)=>`uniform float uQ;
void main(){vec2 p=vUv;float y=uQ>0.?1.-p.y:p.y;
 float arc=.18+.12*pow(2.*p.x-1.,2.);
 float cell=fract(p.x*${f(N)});float tooth=(1.-abs(cell-.5)*2.);
 float big=step(abs(p.x-.5),.38)*(1.+.9*step(.62,abs(fract(p.x*${f(N/2)})-.5)*2.));
 float len=arc+tooth*.32*big*smoothstep(.0,.15,p.x)*smoothstep(1.,.85,p.x);
 float m=smoothstep(len,len-.04,y);
 float gum=band(y,arc,.025)*smoothstep(0.,.1,p.x)*smoothstep(1.,.9,p.x);
 float edge=band(y,len,.03)*m;
 gl_FragColor=vec4(mix(uC2,uC1,edge+gum)*1.6+vec3(1.)*edge*.5,(m*.35+edge*1.2+gum)*uA);}`;

// ---------- fractura de baldosa (nivel 3): úsala con groundPlane(size,x,y,fx(tileFractureFS(size))) ----------
// baldosas de 1,4 u.; la central y sus vecinas se agrietan desde el centro (uP 0..1 = avance), los bordes de las losas
// rotas brillan con la paleta y las grietas quedan como brasas que se apagan (uA)
const tileFractureFS=size=>`void main(){vec2 p=(vUv-.5)*${f(size)};float r=length(p);
 vec2 c=floor(p/1.4+.5);vec2 q=(p-c*1.4)/.7;float edge=max(abs(q.x),abs(q.y));
 float ring=max(abs(c.x),abs(c.y));float on=step(ring,1.)*step(r*.55,uP*1.6);
 float an=atan(p.y,p.x);float j=noise(vec3(r*2.5,an*2.,3.))-.5;
 float rays=pow(1.-abs(fract(an*1.43+j*.5)*2.-1.),18.)+pow(1.-abs(fract(an*2.7+j+.37)*2.-1.),26.)*smoothstep(.5,1.6,r);
 float cr=rays*smoothstep(uP*${f(size*0.5)},uP*${f(size*0.5)}-.3,r);
 float seam=smoothstep(.9,.98,edge)*on*smoothstep(.0,.3,uP);
 float hot=band(r,uP*${f(size*0.5)},.18)*step(uP,.99);
 float fade=smoothstep(${f(size*0.5)},${f(size*0.32)},r);
 gl_FragColor=vec4(mix(uC2,uC1,cr+hot)*1.7,(cr*1.3+seam*.9+hot*.7)*fade*uA);}`;

VFX.lib={tileFractureFS,NB,SOLID,v3,fireFS,darkFireFS,CHIP_FS,DUST_FS,FLAME_FS,FLUFF_FS,CHEVRON_FS,SLASH_FS,billboard,towardCam,taperTube,variantGroups,
  SD_HEART,HEART_FS,STAR4_FS,SMOKE_FS,FANG_FS};
})();

// ---- paletas de los efectos básicos y enemigos
if(window.VFX){
VFX.palette("Salvaje",["#ff9f6b","#a8321e"]);
VFX.palette("Tierra",["#e0b070","#6a4a2a"]);
VFX.palette("Hielo",["#d6f6ff","#4aa8f0"]);
VFX.palette("Baba",["#b8ff9a","#3fa868"]);
VFX.palette("Agua",["#7fdcff","#1660c8"]);
VFX.palette("Naturaleza",["#a8f060","#1f7a32"]);
VFX.palette("Polen",["#ffe45c","#c27a10"]);
VFX.palette("Esporas",["#d8b8ff","#7d4fc0"]);
VFX.palette("Madera",["#d89a5a","#5a3218"]);
VFX.palette("Roca",["#bfb8ae","#4a4540"]);
}

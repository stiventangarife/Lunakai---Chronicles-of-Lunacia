// =====================================================================
// MÓDULO · CLASE PLANTA (OJOS)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Motivo común: un destello (no unos ojos) nace en la posición de los ojos del lanzador y desata el efecto;
// estética vegetal: madera, flores, esporas, pepino, savia y rocío.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,helixGeo,RING_FS,CROSS_FS,caster,target,allies,ALLY_POS}=VFX;
const {tileFractureFS,NB,SOLID,v3,DUST_FS,HEART_FS,STAR4_FS,SMOKE_FS,SD_HEART,billboard,towardCam}=VFX.lib;

VFX.palette("Primavera",["#ffd6ea","#5fcf7a"]);
VFX.palette("Psicodelia",["#ff8af2","#5b3cff"]);
VFX.palette("Cariño",["#ffb3cf","#ff7a3a"]);

const TAU=Math.PI*2, UP=V3(0,1,0), ZA=V3(0,0,1);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const jh=n=>{const s=Math.sin(n*12.9898+78.233)*43758.5453;return s-Math.floor(s);};   // hash JS determinista
const PU=(extra,more)=>Object.assign({uniforms:Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},extra)},more||{});
const NBP={blending:THREE.NormalBlending};
// tono arcoíris (GLSL y JS)
const HUE=`vec3 hue(float h){return clamp(abs(fract(h+vec3(1.,2./3.,1./3.))*6.-3.)-1.,0.,1.);}`;
const hueSet=(h,c)=>{const x=(((h%1)+1)%1)*6;return c.setRGB(cl(Math.abs(x-3)-1),cl(2-Math.abs(x-2)),cl(2-Math.abs(x-4)));};

// punto local de un muñeco → mundo, con su posición, giro en z y escala (sin matrices)
function localW(l,out,d=caster){const r=d.rotation.z,c=Math.cos(r),s=Math.sin(r),x=l.x*d.scale.x,y=l.y*d.scale.y;
  return out.set(d.position.x+x*c-y*s,d.position.y+x*s+y*c,d.position.z+l.z*d.scale.z);}
const EYE_L=[V3(0.23,1.66,-0.1),V3(0.23,1.66,0.1)];

// ---------- destello en la posición de los ojos (no dibuja ojos: solo una chispa estelar) ----------
// uP = giro del destello; uQ = 1 → arcoíris
const GLINT_FS=HUE+`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;float c=cos(uP),s=sin(uP);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);float r=length(p);vec2 q=abs(p);
 float r4=smoothstep(.08,0.,q.x*q.y*6.+min(q.x,q.y)*.8)*smoothstep(1.,.05,max(q.x,q.y));
 vec2 d=abs(vec2(p.x+p.y,p.x-p.y))*.7071;float r8=smoothstep(.05,0.,d.x*d.y*9.+min(d.x,d.y)*1.2)*smoothstep(.6,.05,max(d.x,d.y))*.6;
 float core=smoothstep(.28,0.,r);float halo=pow(max(0.,1.-r),3.)*.45;
 vec3 col=mix(uC1,hue(uT*.9+r*.8)*1.2,uQ);
 gl_FragColor=vec4(mix(col,vec3(1.),core*.6+r4*.3)*1.7,(r4+r8+core+halo)*uA);}`;
function mkGlint(L,size=0.5,rainbow=0){
  const ms=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),fxU(GLINT_FS,{uQ:{value:rainbow}},{depthTest:false}));L.mesh.add(m);return m;});
  return (al,ang)=>ms.forEach((m,i)=>{localW(EYE_L[i],tmp);towardCam(m.position,tmp,0.15);billboard(m);m.visible=al>0.002;set(m,ang+i*0.4,al);});
}
const glintEnv=(te,t0,w)=>Math.exp(-Math.pow((te-t0)/w,2));

// ---------- fragmentos de partícula propios ----------
// brasa de fuego real (naranja); vMix = cuánto se ha purificado hacia el verde de la paleta
const EMBER_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 vec3 fire=mix(vec3(1.,.35,.06),vec3(1.,.85,.45),smoothstep(.3,0.,d));
 gl_FragColor=vec4(mix(fire,mix(uC1,vec3(1.),smoothstep(.25,0.,d)*.5),vMix)*1.6,a);}`;
// hoja que gira
const LEAF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float an=vMix*6.2832+uT*(1.5+vMix*2.);float c=cos(an),s=sin(an);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float w=.2*(1.-pow(abs(q.y)/.45,2.));float m=smoothstep(.02,-.02,abs(q.x)-w)*step(abs(q.y),.45);
 float vein=smoothstep(.025,0.,abs(q.x))*step(abs(q.y),.4);
 float a=m*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.4+q.y*.8)*1.2+vec3(.5)*vein*.4,a);}`;
// astilla de corteza (mezcla normal)
const BARKCHIP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.7+q.y;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.22,.13,.07),vec3(.5,.34,.18),vMix),a);}`;
// pétalo pastel (rosa, blanco, amarillo, lila) que gira
const PASTEL=`vec3 pastel(float k){return k<.25?vec3(1.,.62,.8):k<.5?vec3(1.,.96,.92):k<.75?vec3(1.,.88,.42):vec3(.78,.64,1.);}`;
const PETAL_FS=HEAD+PASTEL+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float an=vMix*6.2832+uT*(1.2+vMix);float c=cos(an),s=sin(an);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float e=length(vec2(q.x*2.3,q.y+q.x*q.x*1.5));
 float petal=smoothstep(.44,.36,e);float vein=smoothstep(.03,0.,abs(q.x))*smoothstep(.38,0.,abs(q.y))*.3;
 float a=petal*vA;if(a<.003)discard;
 gl_FragColor=vec4(pastel(fract(vMix*3.7))*(.85+.3*q.y)+vec3(1.)*vein,a);}`;
// espora psicodélica: membrana, anillo y núcleo; el tono cicla con el tiempo
const SPORE_FS=HEAD+HUE+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float body=smoothstep(.5,.3,d);float ring=band(d,.3,.06);float nuc=smoothstep(.14,.05,length(q-vec2(.06,-.05)));
 float a=(body*.35+ring*.8+nuc)*vA;if(a<.003)discard;
 gl_FragColor=vec4(hue(vMix+uT*.6)*1.5+vec3(1.)*nuc*.5,a);}`;
const HAZE_FS=HEAD+HUE+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*14.)*vA*.35;if(a<.003)discard;
 gl_FragColor=vec4(hue(vMix-uT*.3)*1.2,a);}`;
const STARH_FS=HEAD+HUE+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5)*2.;
 float s=smoothstep(.12,0.,q.x*q.y*6.+min(q.x,q.y))*smoothstep(1.,.2,max(q.x,q.y));float c=smoothstep(.35,0.,length(q));
 float a=(s+c)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(hue(vMix+uT*.5),vec3(1.),.4*c)*1.7,a);}`;
// gota de agua con brillo
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float y=q.y+.1;
 float w=y<0.?sqrt(max(.04-y*y,0.)):.2*(1.-y/.42);
 float m=smoothstep(.02,-.02,abs(q.x)-w)*step(-.3,y)*step(y,.42);
 float hl=smoothstep(.07,0.,length(q-vec2(-.06,-.08)));
 float a=(m*.75+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.6+.4*q.y)*1.3+vec3(1.)*hl*.8,a);}`;
// corazón en tonos de la paleta (rosa ↔ naranja según vMix)
const HEART2_FS=HEAD+SD_HEART+`varying float vA;varying float vMix;
void main(){vec2 p=(vec2(gl_PointCoord.x,1.-gl_PointCoord.y)-vec2(.5,.12))*1.45;float d=sdHeart(p);
 float a=(smoothstep(.04,-.02,d)+smoothstep(.25,0.,d)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(mix(uC1,uC2,vMix*.8),vec3(1.),smoothstep(0.,-.25,d)*.35)*1.4,a);}`;
const MOTE_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,uC2,vMix*.6)*1.4+vec3(1.)*smoothstep(.18,0.,d)*.6,a);}`;

// =====================================================================
// 1 · RISKY TRUNK — un tronco nudoso en llamas cae del cielo frente al Axie y queda plantado como muro;
//     el fuego vira a verde, se apaga y la madera exhala volutas de humo verde purificador
//     (nivel 3: el suelo se parte en baldosas donde se clava el tronco)
// =====================================================================
const trunkAb={key:"pjRiskyTrunk",name:"Risky Trunk",dur:3.4,ti:0.95,pal:"Savia",
  phases:[["Mirada",0],["Caída",0.3],["Impacto",0.95],["Purificación",1.4],["Bloqueo",2.2],["Disipación",2.85]],
build(a){
  const L=a.L,TL=0.3,TI=0.95,TP=1.4,TS=2.85,TE=3.4,LP=V3(-1.55,0,0),H=2.3,Y0=7.5,YF=-0.15;
  const ty=te=>{if(te<TI){const k=cl((te-TL)/(TI-TL));return Y0+(YF-Y0)*k*k;}return YF-0.35*ss(TS,TE,te);};
  // ---- tronco: cilindro deformado (nudos abultados, corteza irregular) con tapa de anillos
  const KN=[[0.08,0.3],[0.42,0.58],[0.7,0.22],[0.9,0.78],[0.25,0.86]];
  const tg=new THREE.CylinderGeometry(0.4,0.5,H,36,30).translate(0,H/2,0);
  const pa=tg.attributes&&tg.attributes.position;
  if(pa){for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i);if(Math.hypot(x,z)<1e-4)continue;
      const u=(Math.atan2(x,z)/TAU+1)%1,v=y/H;
      let k=1+0.05*Math.sin(u*TAU*7+v*9)+0.035*Math.sin(u*TAU*13-v*21)+0.05*Math.sin(v*13+1);
      for(const [ku,kv] of KN){let du=u-ku;du-=Math.round(du);k+=0.2*Math.exp(-((du/0.06)**2+((v-kv)/0.06)**2));}
      pa.setXYZ(i,x*k,y,z*k);}
    tg.computeVertexNormals();}
  // carbonizado (uP), brasas que pasan de naranja a verde (uA, uQ) y disolución final en motas (uD)
  const CHAR=`float lit=.35+.65*max(0.,dot(normalize(vN),normalize(vec3(.35,.75,.55))));c*=lit;
   float n=noise(vP*6.);float ch=smoothstep(uP-.15,uP+.15,1.-n);c=mix(c,c*.22,ch);
   float cr=pow(1.-abs(noise(vP*vec3(9.,3.,9.))*2.-1.),8.)*ch;
   c+=mix(vec3(1.,.42,.08),uC1,uQ)*cr*uA*1.8;
   float dn=noise(vP*5.+3.);if(dn<uD-.05)discard;
   c+=uC1*smoothstep(uD+.08,uD-.05,dn)*step(.001,uD)*2.;
   gl_FragColor=vec4(c,1.);}`;
  const barkMat=fxU(`uniform float uQ;uniform float uD;
  const vec2 KN[5]=vec2[5](${KN.map(k=>`vec2(${f(k[0])},${f(k[1])})`).join(",")});
  void main(){float cap=step(${f(H-0.004)},vP.y);
   float knot=0.,ring=0.,bend=0.;
   for(int i=0;i<5;i++){vec2 d=vec2(fract(vUv.x-KN[i].x+.5)-.5,vUv.y-KN[i].y)*vec2(2.8,${f(H)});float l=length(d);
    knot=max(knot,smoothstep(.13,.06,l));ring+=smoothstep(.2,.05,l)*(.5+.5*sin(l*120.));bend+=d.x/(l+.03)*exp(-l*7.)*.03;}
   float fur=noise(vec3((vUv.x+bend)*60.,vUv.y*5.,1.))*.65+noise(vec3((vUv.x+bend)*140.,vUv.y*12.,3.))*.35;
   float groove=smoothstep(.12,0.,abs(fur-.5));
   vec3 bark=mix(vec3(.30,.19,.10),vec3(.46,.31,.17),fur)*(1.-groove*.55);
   bark=mix(bark,vec3(.16,.09,.05)+vec3(.12,.07,.03)*ring,knot);
   float rr=length(vP.xz);float tr=.5+.5*sin(rr*95.+noise(vP*7.)*3.);
   vec3 wood=mix(vec3(.55,.38,.2),vec3(.72,.54,.32),tr)*(1.-.5*smoothstep(.28,.42,rr));
   vec3 c=mix(bark,wood,cap);
   ${CHAR}`,{uQ:{value:0},uD:{value:0}},SOLID);
  const bu=barkMat.uniforms;
  const trunk=new THREE.Group(); trunk.scale.setScalar(1.15); L.mesh.add(trunk);
  trunk.add(new THREE.Mesh(tg,barkMat));
  // ramas cortadas: muñones con la cara del corte en anillos (comparten uniforms con la corteza)
  const stubMat=fxU(`uniform float uQ;uniform float uD;
  void main(){float cap=step(.356,vP.y);float rr=length(vP.xz);
   float fur=noise(vec3(vP.x*30.,vP.y*14.,vP.z*30.));
   vec3 bark=mix(vec3(.28,.18,.09),vec3(.44,.29,.15),fur);
   vec3 wood=mix(vec3(.58,.4,.22),vec3(.75,.56,.33),.5+.5*sin(rr*160.))*(1.-.5*smoothstep(.07,.11,rr));
   vec3 c=mix(bark,wood,cap);
   ${CHAR}`,{uQ:bu.uQ,uD:bu.uD},SOLID);
  stubMat.uniforms.uA=bu.uA; stubMat.uniforms.uP=bu.uP;
  const sGeo=new THREE.CylinderGeometry(0.09,0.13,0.36,12).translate(0,0.18,0);
  for(const [su,sv] of [[0.3,0.45],[0.6,0.72],[0.97,0.52],[0.14,0.66]]){
    const th=su*TAU,r=(0.5-0.1*sv)*0.95,s=new THREE.Mesh(sGeo,stubMat);
    s.position.set(Math.sin(th)*r,sv*H,Math.cos(th)*r);
    s.quaternion.setFromUnitVectors(UP,V3(Math.sin(th),0.55,Math.cos(th)).normalize()); trunk.add(s);}
  // vaina de llamas y penacho superior; uQ vira el fuego al verde de la paleta, uP lo aviva
  const FIRE=(y0,hh)=>`uniform float uQ;
  void main(){float h=(vP.y-${f(y0)})/${f(hh)};
   vec3 q=vec3(vP.x*2.4,vP.y*1.5-uT*3.6,vP.z*2.4);
   float n=noise(q)*.55+noise(q*2.1+vec3(0.,-uT*2.5,0.))*.3+noise(q*4.3)*.15;
   float fl=n-.3+.35*uP-h*.4;
   float al=smoothstep(0.,.22,fl)*smoothstep(1.,.75,h);float hot=smoothstep(.2,.55,fl);
   vec3 fire=mix(vec3(1.,.28,.04),vec3(1.,.78,.32),hot);
   vec3 c=mix(fire,mix(uC2,uC1,hot),uQ)+vec3(1.)*smoothstep(.5,.75,fl)*.5;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(c*1.5,al*(.3+.7*fr)*uA);}`;
  const sheath=new THREE.Mesh(new THREE.CylinderGeometry(0.66,0.76,H+0.3,36,8,true).translate(0,(H+0.3)/2,0),fxU(FIRE(0,H+0.3),{uQ:{value:0}}));
  const plume=new THREE.Mesh(new THREE.ConeGeometry(0.62,1.5,28,6,true).translate(0,H+0.75,0),fxU(FIRE(H,1.5),{uQ:{value:0}}));
  const fires=[sheath,plume]; trunk.add(sheath,plume);
  // estela de caída: llamarada vertical sobre el tronco
  const streak=new THREE.Mesh(new THREE.PlaneGeometry(1.7,5.5),fx(`void main(){vec2 p=vUv;float x=abs(p.x-.5)*2.;
   float n=noise(vec3(p.x*6.,p.y*5.+uT*12.,1.));
   float w=mix(.6,.1,p.y)*(.7+.5*n);float m=smoothstep(w,w*.3,x)*smoothstep(1.,.1,p.y)*smoothstep(0.,.04,p.y);
   vec3 c=mix(vec3(1.,.3,.05),vec3(1.,.85,.4),smoothstep(.35,0.,x)*(1.-p.y));
   gl_FragColor=vec4(c*1.6,m*(.45+.55*n)*uA);}`));
  L.trail.add(streak);
  const glint=mkGlint(L,0.55);
  // ---- partículas
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 LP=${v3(LP)};
  float ty(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return ${f(Y0)}+${f(YF-Y0)}*k*k;}`;
  // brasas del tronco ardiendo: en la caída quedan atrás (estela); al purificarse salen verdes
  a.count+=points(L.part,240,C+`void main(){float s=TL+aSeed.x*(TP+.5-TL);float life=.45+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(LP.x+r.x*.62,ty(s)+aSeed.z*${f(H*1.15)},r.y*.62)+vec3(sin(t*6.+r.z*9.)*.15,t*(1.2+aSeed.w),cos(t*5.+r.x*7.)*.15);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*35.+aSeed.w*40.)):0.;put(p,(.05+.06*aSeed.w)*(1.-age*.5));vMix=smoothstep(TP-.15,TP+.35,s);}`,EMBER_FS);
  // impacto: abanico de brasas, polvo en anillo y astillas de corteza
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.55;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.5,1.)+vec3(0.,.55,0.));vec3 p=LP+vec3(0.,.25+aSeed.z*1.6,0.)+d*(1.8+3.6*aSeed.w)*t+vec3(0.,-4.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.045+.055*aSeed.z);vMix=0.;}`,EMBER_FS);
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.1;float life=1.1+aSeed.y*.7;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 dir=vec3(cos(an),0.,sin(an));
   vec3 p=LP+dir*(.5+(1.8+2.6*aSeed.w)*(1.-exp(-t*2.6)))+vec3(0.,.12+(.35+.55*aSeed.y)*(1.-exp(-t*1.8)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.5+.55*aSeed.y)*(.6+age));}`,DUST_FS,NBP);
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.05;float life=.85+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.8+2.8*aSeed.w),2.8+3.4*aSeed.y,sin(an)*(1.8+2.8*aSeed.w));
   vec3 p=LP+vec3(0.,.2,0.)+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.07+.07*aSeed.z);}`,BARKCHIP_FS,NBP);
  // volutas de humo verde que suben girando alrededor del tronco
  a.count+=points(L.part,180,C+`void main(){float life=1.6+aSeed.y*.9;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sw=age*(2.5+r.y*2.)+r.x*6.2832;float rad=.5+.6*age+.15*r.y;
   vec3 p=vec3(LP.x,${f(YF)}+.3+r.z*2.,0.)+vec3(cos(sw)*rad,age*(1.6+r.z*.8),sin(sw)*rad*.8);
   vA=(k>=1.)?sin(age*3.14159)*.55*uE:0.;put(p,(.35+.6*age)*(.7+.5*r.z));vMix=r.y;}`,SMOKE_FS("mix(vec3(.3,.72,.42),uC2,.3)"),NBP);
  // motas purificadoras en espiral y hojas frescas
  a.count+=points(L.part,120,C+`void main(){float life=1.1+aSeed.y*.7;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rad=.6+.25*r.y;
   vec3 p=vec3(LP.x+cos(an)*rad,.1+age*(2.6+r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.04+.05*r.z);}`,MOTE_FS);
  a.count+=points(L.part,60,C+`void main(){float life=1.8+aSeed.y*.8;float k=(uT-TP-.2)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rad=.55+.5*age;
   vec3 p=vec3(LP.x+cos(an)*rad,${f(H-0.1)}+age*(1.2+r.z)-.8*r.y,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.16+.08*r.z);vMix=r.z;}`,LEAF_FS,NBP);
  // ---- suelo: sombra y aviso de caída, fractura de baldosas en el impacto, onda y círculo de musgo purificador
  const shadow=groundPlane(2.4,LP.x,0.012,fx(`void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(vec3(0.),smoothstep(1.,.2,r)*uA);}`,NB));
  const warn=groundPlane(2.6,LP.x,0.02,fx(RING_FS));
  const crack=groundPlane(6.5,LP.x,0.025,fx(tileFractureFS(6.5)));
  const shock=groundPlane(8,LP.x,0.03,fx(RING_FS));
  const moss=groundPlane(4.8,LP.x,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float edge=r-uP;
   float m=smoothstep(.02,-.06,edge+(noise(vec3(p*12.,1.))-.5)*.2)*(.25+.75*noise(vec3(p*30.,2.)));
   float rg=band(r,.78*uP+.12,.02)+band(r,.6*uP+.1,.012);
   float a12=fract(an/6.2832*12.+uT*.04);vec2 lp=vec2((a12-.5)*1.6,(r-(.69*uP+.11))*9.);
   float lv=smoothstep(.3,.2,length(lp*vec2(1.,1.8)))*step(.3,uP);
   gl_FragColor=vec4(mix(uC2,uC1,rg+lv)*1.3,(m*.35+rg+lv*.8)*uA*smoothstep(1.,.85,r));}`));
  L.decal.add(shadow,warn,crack,shock,moss);
  a.pose=function(te,o){
    const ia=te-TI,k=cl((te-TL)/(TI-TL)),y=ty(te),pur=ss(TP-0.1,TP+0.6,te),env=ss(TP,TP+0.3,te)*(1-ss(TS-0.2,TE,te));
    // caída girando, aterrizaje con temblor amortiguado
    trunk.visible=te>=TL; trunk.position.set(LP.x,y,0);
    const wob=ia>=0?0.06*Math.exp(-ia*4)*Math.sin(ia*22):0;
    trunk.rotation.set(te<TI?0.25*(1-k):0,te<TI?2.4*(1-k):0,te<TI?0.5*(1-k)*(1-k):wob);
    const fireA=te<TI?ss(TL,TL+0.12,te):1-ss(TP+0.3,TP+1.0,te);
    for(const m of fires){m.visible=fireA>0.002;set(m,te<TI?1:0.6*Math.exp(-ia*3)+0.1,fireA);m.material.uniforms.uQ.value=pur;}
    bu.uP.value=0.25+0.45*ss(TL,TI+0.6,te); bu.uA.value=ss(TL,TI,te)*(1-ss(TP+0.8,TS,te))+0.25*env; bu.uQ.value=pur;
    bu.uD.value=ss(TS,TE-0.05,te)*1.05;
    streak.visible=te>=TL&&ia<0.15; streak.position.set(LP.x,y+H*1.15+2.5,0); billboard(streak);
    streak.material.uniforms.uA.value=te<TI?ss(TL,TL+0.1,te):1-cl(ia/0.15);
    glint(glintEnv(te,0.16,0.09)*1.2,te*2);
    shadow.material.uniforms.uA.value=te>=TL&&te<TI?0.15+0.55*k:(ia>=0?0.7*(1-cl(ia/0.5)):0);
    set(warn,1-0.6*k,te>=TL&&te<TI?0.7:0);
    set(crack,1-Math.pow(1-cl(ia/0.45),2),ia>=0?1-ss(TP+0.6,TS,te):0);
    let p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(moss,ss(TP,TP+1.2,te),env);
    U.uE.value=env;
    // el lanzador mira al cielo; el rival retrocede ante el muro
    caster.rotation.z=0.14*ss(0,0.25,te)*(1-ss(0.55,0.95,te))-(ia>=0?0.06*Math.exp(-ia*6):0);
    const hit=ia>=0?Math.exp(-ia*3):0; target.rotation.z=-0.13*hit*Math.cos(ia*9); target.position.x=3.4+0.16*hit;
    if(te<TL){localW(EYE_L[1],o.g);const g=glintEnv(te,0.16,0.09);o.gs=0.8;o.ga=0.4*g;o.li=2*g;}
    else if(te<TI){o.g.set(LP.x,y+H*0.7,0);o.gs=1.8;o.ga=0.55;o.li=6;}
    else{o.g.set(LP.x,0.5+1.6*pur,0);o.gs=1.8+3.6*Math.min(ia,0.5)+0.5*env;o.ga=Math.exp(-ia*7)*0.9+0.25*env;o.li=13*Math.exp(-ia*3.5)+3*env;}
    o.ia=ia;o.c.set(LP.x,0.5,0);o.shake=1.8;o.dist=1.2;o.flash=0.15;
  };
}};

// =====================================================================
// 2 · BLOSSOM — dos raíces de luz corren por el suelo y bajo cada aliado brota en cascada un macizo de flores
//     primaverales (mallas que crecen y abren los pétalos); pétalos, polen y destellos curativos suben
// =====================================================================
// flor: anillo plano que el vértice dobla en copa; uP = apertura (0 capullo → 1 abierta)
const FLOWER_VS=`uniform float uP;uniform float uT;uniform float uK;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
void main(){vUv=uv;vec2 q=position.xy;float r=length(q);vec2 d=r>1e-4?q/r:vec2(1.,0.);
 float th=mix(.12,1.15,uP)+.25*r*uP+.05*sin(uT*2.+uK*6.)*uP;
 vec3 p=vec3(d.x*sin(th)*r,cos(th)*r*.9,d.y*sin(th)*r);
 vec3 n=normalize(vec3(-d.x*cos(th),sin(th),-d.y*cos(th)));
 vP=vec3(q,r);vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*n);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const FLOWER_FS=`uniform vec3 uCol;uniform float uK;uniform float uH;
void main(){vec2 q=vP.xy;float r=vP.z;float an=atan(q.y,q.x)+uK*6.2832;float N=5.+step(.5,fract(uK*7.3));
 float pe=abs(cos(an*N*.5));float R=.35+.65*pow(pe,.55);
 if(r>R)discard;
 float cen=smoothstep(.22,.15,r);
 float vein=pow(pe,30.)*smoothstep(.15,.9,r)*.3;
 float lit=.55+.45*abs(dot(normalize(vN),normalize(vec3(.3,.9,.4))));
 vec3 base=mix(uCol*.72,uCol,smoothstep(.1,.8,r));
 base=mix(base,vec3(1.,.8,.28),cen);
 float pol=step(.7,hash(vec3(floor(q*40.),uK*9.)))*cen;
 vec3 c=base*lit+vec3(1.)*vein+vec3(1.,.95,.6)*pol*.6;
 float edge=smoothstep(R-.14,R,r);
 c+=uC1*(uH*(.35+.65*edge)+.12*edge);
 gl_FragColor=vec4(c,1.);}`;
const blossom={key:"pjBlossom",name:"Blossom",dur:1.5,ti:0.36,pal:"Primavera",allies:2,
  phases:[["Mirada",0],["Raíces",0.08],["Floración",0.36],["Rocío curativo",0.55],["Disipación",1.2]],
build(a){
  const L=a.L,TR=0.08,TI=0.36,TD=1.2,TE=1.5,CP=V3(-3.7,0,0);
  const PAST=[[1,0.62,0.8],[1,0.96,0.92],[1,0.88,0.42],[0.78,0.64,1],[1,0.74,0.86]];
  const HU={value:0};
  const fGeo=new THREE.RingGeometry(0.02,1,40,6), stGeo=new THREE.CylinderGeometry(0.016,0.024,1,5).translate(0,0.5,0);
  const stemMat=fx(`void main(){float lit=.5+.5*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   gl_FragColor=vec4(mix(vec3(.12,.38,.12),vec3(.35,.7,.25),vUv.y)*lit,1.);}`,SOLID);
  const flowers=[];
  ALLY_POS.forEach((AP,ai)=>{
    for(let j=0;j<7;j++){const inner=j<3,s=j*7+ai*31;
      const an=(inner?j/3:(j-3)/4)*TAU+(inner?0.3:0)+jh(s+1)*0.5, r=(inner?0.48:0.72)+jh(s+2)*0.14;
      const h=0.04+jh(s+3)*0.12, sz=(inner?0.13:0.11)+jh(s+4)*0.06, col=PAST[(j+ai*2)%PAST.length];
      const g=new THREE.Group(); g.position.set(AP.x+Math.cos(an)*r,0,AP.z+Math.sin(an)*r);
      const stem=new THREE.Mesh(stGeo,stemMat); stem.scale.set(1,h,1);
      const bloom=new THREE.Mesh(fGeo,fxU(FLOWER_FS,{uCol:{value:new THREE.Color().setRGB(col[0],col[1],col[2])},uK:{value:jh(s+5)},uH:HU},
        Object.assign({},SOLID,{side:THREE.DoubleSide,vertexShader:FLOWER_VS})));
      bloom.position.y=h; bloom.scale.setScalar(sz); bloom.rotation.set((jh(s+6)-0.5)*0.4,0,(jh(s+7)-0.5)*0.4);
      g.add(stem,bloom); L.mesh.add(g);
      flowers.push({g,bloom,d:(inner?0:0.05)+jh(s+8)*0.04});}
  });
  const glint=mkGlint(L,0.34);
  // raíces de luz: enredadera que avanza por el suelo del lanzador a cada aliado, con hojitas alternas
  const vines=ALLY_POS.map(AP=>{const dx=AP.x-CP.x,dz=AP.z-CP.z,len=Math.hypot(dx,dz);
    const m=groundPlane(len,(AP.x+CP.x)/2,0.026,fx(`void main(){float u=vUv.x;float v=vUv.y-.5;if(u>uP)discard;
     float y=.13*sin(u*20.)*sin(u*3.14159);float d=abs(v-y);float line=smoothstep(.05,0.,d);
     float side=sign(sin(floor(u*10.)*1.7+.5));vec2 lp=vec2(fract(u*10.)-.5,(v-y)*3.-side*.35);
     float lf=smoothstep(.35,.25,length(lp*vec2(1.,1.6)))*smoothstep(.0,.15,u);
     float head=smoothstep(.08,0.,uP-u)*step(uP,.995);
     gl_FragColor=vec4(mix(uC2,uC1,head+lf*.3)*1.4+vec3(1.)*head*.6,(line*.9+lf*.5+head*line*2.)*uA);}`),0.42);
    m.position.z=(AP.z+CP.z)/2; m.rotation.y=Math.atan2(-dz,dx); L.trail.add(m); return m;});
  // suelo por aliado (centrado bajo él): pradera que se extiende, glifo floral y onda de floración
  const decals=ALLY_POS.map(AP=>{
    const meadow=groundPlane(1.9,AP.x,0.014,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
     float n=noise(vec3(p*9.,2.))*.6+noise(vec3(p*25.,5.))*.4;
     float m=smoothstep(uP*(.8+.35*n),uP*(.8+.35*n)-.15,r);
     gl_FragColor=vec4(mix(vec3(.08,.25,.08),vec3(.3,.6,.22),n),m*(.4+.2*n)*uA);}`,NB));
    const glyph=groundPlane(1.8,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*.25;
     float pet=.55+.35*abs(cos(an*2.5));
     float m=band(r,pet*uP,.02)+band(r,.95*uP,.015)+band(r,.3*uP,.02);
     m+=band(r,.85*uP,.03)*step(.6,fract(an/6.2832*24.));
     gl_FragColor=vec4(mix(uC2,uC1,.6+.4*sin(uT*3.))*1.3,m*uA);}`));
    const wave=groundPlane(2.5,AP.x,0.03,fx(RING_FS));
    for(const m of [meadow,glyph,wave]){m.position.z=AP.z;L.decal.add(m);}
    return {meadow,glyph,wave};});
  // partículas por aliado
  ALLY_POS.forEach(AP=>{
    const C=`const vec3 AP=${v3(AP)};const vec3 CP=${v3(CP)};const float TI=${f(TI)};const float TR=${f(TR)};`;
    a.count+=points(L.part,20,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.2+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=mix(CP,AP,(s-TR)/(TI-TR))+vec3(r.x*.08,.04+t*(.35+.6*aSeed.z),r.z*.08);
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.025+.03*aSeed.w);}`,MOTE_FS);
    // estallido de pétalos al brotar, que luego planean
    a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.1;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;float rad=.25+.55*aSeed.w;
     vec3 p=AP+vec3(cos(an)*rad,.08,sin(an)*rad)+vec3(cos(an)*.35,1.1,sin(an)*.35)*(1.-exp(-t*3.5))+vec3(sin(t*4.+aSeed.y*9.)*.12,-.3*t,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,.1+.05*aSeed.y);vMix=aSeed.z;}`,PETAL_FS,NBP);
    // destellos y cruces curativas que suben, polen
    a.count+=points(L.part,20,C+`void main(){float life=.45+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;float rad=.25+.5*r.y;
     vec3 p=AP+vec3(cos(an)*rad,.15+age*(.9+r.z*.6),sin(an)*rad);
     vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.09+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);
    a.count+=points(L.part,14,C+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TI-.06)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     vec3 p=AP+vec3((r.x-.5)*.75,.3+age*(1.1+r.y*.4),(r.z-.5)*.75);
     vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.1+.05*r.z);}`,CROSS_FS);
    a.count+=points(L.part,30,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832+age*2.;float rad=.2+.7*r.y;
     vec3 p=AP+vec3(cos(an)*rad,.12+age*(1.3+r.z*.6),sin(an)*rad);
     vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.02+.03*r.z);vMix=.2;}`,MOTE_FS);
  });
  const AC0=ALLY_POS[0].clone().add(V3(0,1.0,0));
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.1,te)*(1-ss(TD,TE,te));
    // cascada de flores: crecen con rebote elástico, se abren y al final se cierran y encogen
    for(const fl of flowers){const x=(te-(TI-0.05+fl.d))/0.15;
      const sc=(x<=0?0:1-Math.exp(-7*x)*Math.cos(9*x))*(1-ss(TD+fl.d*0.5,TE-0.05,te));
      fl.g.visible=sc>0.002; fl.g.scale.setScalar(Math.max(sc,0.001));
      fl.bloom.material.uniforms.uP.value=ss(TI-0.02+fl.d,TI+0.15+fl.d,te)*(1-0.5*ss(TD,TE,te));}
    HU.value=0.2*env+(ia>=0?0.6*Math.exp(-ia*8):0);
    glint(glintEnv(te,0.05,0.035),te*4);
    const vp=cl((te-TR)/(TI-TR));
    vines.forEach(m=>{m.visible=te>=TR&&te<TI+0.3;set(m,vp,0.8*(1-cl((te-TI)/0.3)));});
    decals.forEach(d=>{set(d.meadow,ss(TI-0.02,TI+0.2,te),env*0.8);set(d.glyph,ss(TI,TI+0.2,te),env*0.7);
      const p=cl(ia/0.35);set(d.wave,1-Math.pow(1-p,2),ia>=0?1-p:0);});
    U.uE.value=env;
    // aliados: brillo rosado y un saltito al brotar
    allies.forEach((al,i)=>{const ii=ia-0.06*i;al.userData.m.emissive.copy(U.uC1.value);
      al.userData.m.emissiveIntensity=0.2*env+(ii>=0?0.6*Math.exp(-ii*8):0);
      al.position.y=ii>=0&&ii<0.22?0.06*Math.sin(Math.PI*ii/0.22):0;});
    caster.position.y=te<0.15?0.04*Math.sin(Math.PI*te/0.15):0;
    if(te<TR){localW(EYE_L[1],o.g);const g=glintEnv(te,0.05,0.035);o.gs=0.6;o.ga=0.3*g;o.li=1.4*g;}
    else if(ia<0){o.g.lerpVectors(CP,ALLY_POS[0],vp).y=0.25;o.gs=0.7;o.ga=0.3;o.li=2;}
    else{o.g.copy(AC0);o.gs=1.4+1.4*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.45+0.08*env;o.li=4.5*Math.exp(-ia*6)+1.8*env;}
    o.ia=ia;o.c.copy(AC0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 3 · CONFUSION — un chorro de esporas arcoíris sale en espiral de la mirada y estalla en un remolino alrededor
//     del rival; la mira sobre él tiembla y se desdobla, y su silueta se duplica en fantasmas desfasados
// =====================================================================
const confusion={key:"pjConfusion",name:"Confusion",dur:2.3,ti:0.66,pal:"Psicodelia",
  phases:[["Mirada",0],["Esporas",0.2],["Espiral",0.66],["Desorientación",1.0],["Disipación",1.9]],
build(a){
  const L=a.L,TS=0.2,TI=0.66,TD=1.9,TE=2.3,TV=0.34,EM=V3(-3.45,1.66,0),TP=V3(3.4,0,0),TH=V3(3.3,1.45,0);
  const glint=mkGlint(L,0.48,1);
  // fantasmas del rival: dos siluetas aditivas de tono desfasado
  const GHOST_FS=HUE+`uniform float uQ;
  void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float scan=.6+.4*sin(vP.y*40.-uT*8.);
   gl_FragColor=vec4(hue(uQ+uT*.25)*1.3*(.4+fr),(fr*.8+.1)*scan*uA);}`;
  const ghosts=[0,1].map(i=>{const g=new THREE.Group(),m=fxU(GHOST_FS,{uQ:{value:i*0.5}});
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.43,1.26,24),m); b.position.y=0.625;
    const h=new THREE.Mesh(new THREE.SphereGeometry(0.28,22,14),m); h.position.y=1.6;
    g.add(b,h); L.mesh.add(g); g.userData.m=m; return g;});
  // mira desalineada: tres copias (rojo/verde/azul) que tiemblan cada una a su ritmo
  const reticle=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fx(`
  float ret(vec2 p,float rot){float c=cos(rot),s=sin(rot);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);float r=length(p);float an=atan(p.y,p.x);
   float brk=step(.18,abs(fract(an/6.2832*4.)-.5));
   float m=band(r,.6,.025)*brk+band(r,.3,.02);
   vec2 a=abs(p);m+=smoothstep(.022,0.,a.x)*step(.38,a.y)*step(a.y,.85)+smoothstep(.022,0.,a.y)*step(.38,a.x)*step(a.x,.85);
   m+=smoothstep(.06,.03,r);return min(m,1.);}
  void main(){vec2 p=(vUv-.5)*2.;float j=uP;
   vec2 o1=vec2(sin(uT*23.),cos(uT*19.))*.04*j,o2=vec2(.26,.07)*j+vec2(sin(uT*31.+1.),cos(uT*17.))*.05*j,o3=vec2(-.2,-.12)*j+vec2(cos(uT*27.),sin(uT*21.+2.))*.05*j;
   float r1=ret(p+o1,uT*.6),r2=ret(p+o2,uT*.6+.3*j),r3=ret(p+o3,uT*.6-.3*j);
   vec3 col=vec3(1.,.3,.35)*r1+vec3(.3,1.,.5)*r2+vec3(.4,.5,1.)*r3;
   gl_FragColor=vec4(col*1.5,max(r1,max(r2,r3))*uA);}`,{depthTest:false}));
  L.mesh.add(reticle);
  // cintas en espiral arcoíris que suben alrededor del rival
  const HELIX_FS=HUE+`void main(){float u=vUv.x;if(u>uP)discard;float v=abs(vUv.y-.5)*2.;
   float head=smoothstep(.06,0.,uP-u)*step(uP,.99);
   gl_FragColor=vec4(hue(u*2.-uT*.7)*1.4+vec3(1.)*head,(smoothstep(1.,.2,v)*(.35+.65*u)+head)*uA);}`;
  const hx=[0,1].map(i=>{const m=new THREE.Mesh(helixGeo(2.2,0.82,0.36,2.0,0.075,160),fx(HELIX_FS));m.position.copy(TP);m.userData.o=i*Math.PI;L.trail.add(m);return m;});
  // ---- partículas
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 EM=${v3(EM)};const vec3 TH=${v3(TH)};const vec3 TP=${v3(TP)};
  vec3 path(float u,float ph){vec3 b=mix(EM,TH,u)+vec3(0.,sin(u*3.14159)*.75,0.);float rad=.27*sin(u*3.14159)+.04;float an=u*18.85+ph;
   return b+vec3(0.,cos(an),sin(an))*rad;}`;
  // chorro en espiral desde la mirada
  a.count+=points(L.part,180,C+`void main(){float s=TS+aSeed.x*(TI-TS-${f(TV-0.1)});float u=(uT-s)/${f(TV)};
   vec3 p=path(clamp(u,0.,1.),floor(aSeed.z*3.)*2.094)+rnd()*.06;
   vA=(u>0.&&u<1.)?smoothstep(0.,.1,u)*(.7+.3*sin(uT*30.+aSeed.y*20.)):0.;put(p,.06+.05*aSeed.w);vMix=aSeed.w+u*.5;}`,SPORE_FS);
  // estallido en brazos espirales al llegar
  a.count+=points(L.part,130,C+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float arm=floor(aSeed.z*5.);float rad=(.25+1.6*aSeed.y)*(1.-exp(-t*3.5));float an=arm*1.2566+rad*1.6+t*2.+aSeed.w*.3;
   vec3 p=TH+vec3(cos(an)*rad,(aSeed.w-.5)*.6*t+.25*t,sin(an)*rad);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.06+.05*aSeed.w);vMix=arm*.2+aSeed.y*.3;}`,SPORE_FS);
  // remolino de esporas que sube cerrándose alrededor del rival
  a.count+=points(L.part,260,C+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float arm=floor(r.x*3.);float an=arm*2.094+age*6.+r.y*.6;float rad=mix(1.1,.4,age)+r.z*.16;
   vec3 p=TP+vec3(cos(an)*rad,.15+age*1.9+r.z*.2,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.06*r.z);vMix=r.x+age*.3;}`,SPORE_FS);
  // bruma alucinógena y estrellitas que orbitan la cabeza
  a.count+=points(L.part,70,C+`void main(){float life=1.1+aSeed.y*.6;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=TH+vec3((r.x-.5)*1.3,(r.y-.4)*1.,(r.z-.5)*1.)+vec3(sin(age*4.+r.y*9.)*.16,age*.4,0.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.55+.5*r.z);vMix=r.x;}`,HAZE_FS);
  a.count+=points(L.part,10,C+`void main(){float an=aSeed.x*6.2832+uT*3.2;
   vec3 p=TH+vec3(0.,.42,0.)+vec3(cos(an)*.42,sin(an*2.+aSeed.y*6.)*.05,sin(an)*.32);
   vA=uE*step(${f(TI+0.15)},uT);put(p,.15+.05*aSeed.z);vMix=aSeed.x;}`,STARH_FS);
  // suelo: espiral hipnótica centrada bajo el rival
  const spiral=groundPlane(3.4,TP.x,0.02,fx(HUE+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float s=fract(an/6.2832*3.+r*2.5-uT*.8);float arm=band(s,.5,.12);
   float m=arm*smoothstep(1.,.7,r)*smoothstep(0.,.15,r)*smoothstep(uP+.05,uP-.1,r);
   gl_FragColor=vec4(hue(r*.8-uT*.4+s*.2)*1.3,(m*.75+band(r,.97*uP,.015))*uA);}`));
  const pulse=groundPlane(4,TP.x,0.03,fx(RING_FS));
  L.decal.add(spiral,pulse);
  const sway=t=>0.17*Math.sin(t*4.2)+0.06*Math.sin(t*9.1);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.2,te)*(1-ss(TD,TE,te)), lean=ss(TI,TI+0.3,te)*(1-ss(TD,TE,te));
    glint(glintEnv(te,0.12,0.07)*1.1+(te>=TS&&te<TI?0.3:0),te*3);
    caster.rotation.z=0.05*Math.sin(te*7)*ss(0,0.25,te)*(1-ss(TI-0.2,TI+0.2,te));
    // el rival se tambalea (mareo) y retrocede un poco con el estallido
    const hit=ia>=0?Math.exp(-ia*7):0;
    target.rotation.z=sway(te)*lean-0.1*hit;
    target.position.x=3.4+0.1*Math.sin(te*2.6)*lean+0.11*hit; target.position.z=0.12*Math.sin(te*1.9)*lean;
    ghosts.forEach((g,i)=>{const s=i?1:-1,lag=0.14*(i+1);
      g.visible=env>0.002; g.position.set(target.position.x+s*(0.3+0.12*Math.sin(te*5+i*2))*env,0,target.position.z-s*0.15*Math.sin(te*3.3+i));
      g.rotation.z=sway(te-lag)*lean*1.3; g.scale.setScalar(1.02);
      g.userData.m.uniforms.uA.value=env*(0.38+0.15*Math.sin(te*7+i*3));});
    // la mira busca al rival y nunca lo encuentra
    const ra=env;
    tmp.set(TH.x+0.35*Math.sin(te*3.1)+0.15*Math.sin(te*7.7),TH.y-0.1+0.25*Math.cos(te*2.3),0);
    towardCam(reticle.position,tmp,0.9); billboard(reticle); reticle.visible=ra>0.002; set(reticle,0.4+0.6*lean,ra*0.9);
    hx.forEach(m=>{m.visible=ia>=0;m.rotation.y=-te*2.8+m.userData.o;set(m,ss(TI,TI+0.5,te),0.85*(1-ss(TD-0.2,TE-0.1,te)));});
    set(spiral,ss(TI,TI+0.45,te),0.85*env); let p=cl(ia/0.5); set(pulse,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    o.em=0.28*env; hueSet(te*0.4,o.emc);
    if(te<TS){localW(EYE_L[1],o.g);const g=glintEnv(te,0.12,0.07);o.gs=0.75;o.ga=0.35*g;o.li=2*g;}
    else if(ia<0){const u=cl((te-TS)/(TI-TS));o.g.lerpVectors(EM,TH,u);o.g.y+=Math.sin(u*Math.PI)*0.75;o.gs=1;o.ga=0.35;o.li=3.2;}
    else{o.g.copy(TH);o.gs=1.5+2.4*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.6+0.12*env;o.li=6.5*Math.exp(-ia*5)+2.4*env;}
    o.ia=ia;o.c.copy(TH);o.shake=0;o.dist=1.1;o.flash=0.4;
  };
}};

// =====================================================================
// 4 · CUCUMBER SLICE — el aliado arde y está fatigado; rodajas de pepino brotan sobre él, orbitan girando,
//     gotean frescor y apagan las brasas: vaho frío, gotas y destellos menta
//     (nivel 3: el golpe de frescor parte el suelo bajo el aliado en baldosas de energía)
// =====================================================================
const cucumber={key:"pjCucumberSlice",name:"Cucumber Slice",dur:3.45,ti:1.05,pal:"Rocío (Boca)",allies:1,
  phases:[["Fatiga",0],["Rodajas",0.4],["Frescor",1.05],["Órbita",1.5],["Disipación",2.75]],
build(a){
  const L=a.L,TS=0.45,TI=1.05,TD=2.75,TE=3.35,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.0,0)),TOP=AC.clone().add(V3(0,0.85,0));
  const N=6,R=0.98,TILT=0.3,W=1.7,SR=0.23,SH=0.055,sT=Math.sin(TILT),cT=Math.cos(TILT);
  const orb=(an,rad,out)=>out.set(AC.x+Math.cos(an)*rad,AC.y-Math.sin(an)*rad*sT,AC.z+Math.sin(an)*rad*cT);
  // rodaja: caras con pulpa, semillas en anillo y piel; canto de piel rayada; brillo húmedo
  const sliceMat=fx(`void main(){float h=${f(SH/2)};float cap=step(h-.003,abs(vP.y));
   vec2 q=vP.xz/${f(SR)};float r=length(q);
   vec3 flesh=mix(vec3(.84,.96,.7),vec3(.56,.83,.42),smoothstep(.15,.85,r));
   flesh=mix(flesh,vec3(.92,.98,.8),smoothstep(.4,.18,r)*.6);
   float seeds=0.;for(int i=0;i<9;i++){float a=float(i)*.6981+.35;vec2 dir=vec2(cos(a),sin(a));vec2 d=q-dir*.44;
    vec2 rd=vec2(dot(d,dir),dot(d,vec2(-dir.y,dir.x)));seeds=max(seeds,smoothstep(.1,.065,length(rd*vec2(1.,2.2))));}
   vec3 capc=mix(flesh,vec3(.95,.97,.82),seeds*.85);
   capc=mix(capc,vec3(.62,.86,.42),band(r,.84,.025)*.6);
   capc=mix(capc,vec3(.08,.32,.12),smoothstep(.87,.92,r));
   vec3 side=mix(vec3(.05,.24,.08),vec3(.17,.42,.16),smoothstep(.3,.7,noise(vec3(atan(vP.z,vP.x)*3.,vP.y*20.,1.))));
   vec3 c=mix(side,capc,cap);
   vec3 ld=normalize(vec3(.3,.8,.5));vec3 nn=normalize(vN);
   float lit=.5+.5*max(0.,dot(nn,ld));float fr=pow(1.-abs(dot(nn,normalize(vV))),3.);
   float spec=pow(max(0.,dot(reflect(-normalize(vV),nn),ld)),24.)*cap;
   c=c*lit+vec3(1.)*spec*.6+uC1*(fr*.35+uP*.3);
   gl_FragColor=vec4(c,1.);}`,SOLID);
  const sGeo=new THREE.CylinderGeometry(SR,SR,SH,40,1);
  const slices=[];for(let i=0;i<N;i++){const m=new THREE.Mesh(sGeo,sliceMat);L.mesh.add(m);slices.push(m);}
  // estela de agua en la órbita: un tubo cerrado con un rastro que sigue a cada rodaja
  const pts=[];for(let i=0;i<64;i++)pts.push(orb(i/64*TAU,R,V3(0,0,0)));
  const ring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),180,0.035,6,true),fx(`void main(){float u=vUv.x;
   float d=fract((uT*${f(W/TAU)}-u)*${f(N)});float n=noise(vec3(u*40.-uT*3.,vUv.y*4.,1.));
   float tr=exp(-d*5.);
   gl_FragColor=vec4(mix(uC2,uC1,tr)*1.4+vec3(1.)*exp(-d*20.)*.5,(tr*.9+.06)*(.6+.4*n)*uA);}`));
  L.trail.add(ring);
  // vaho: halo frío alrededor del aliado
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(3.3,3.3),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float n=noise(vec3(p*3.,uT*.5));float m=pow(max(0.,1.-r),2.)*(.5+.5*n);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.2,m*uA);}`,{depthTest:false}));
  L.mesh.add(halo);
  const glint=mkGlint(L,0.5);
  // ---- partículas
  const C=`const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};const float TI=${f(TI)};const float TD=${f(TD)};
  vec3 orb(float i,float t){float an=i*${f(TAU/N)}+t*${f(W)};return AC+vec3(cos(an)*${f(R)},-sin(an)*${f(R*sT)},sin(an)*${f(R*cT)});}`;
  // quemadura y fatiga (ya presentes al empezar): brasas y humo gris que se apagan con el frescor
  a.count+=points(L.part,110,C+`void main(){float life=.6+aSeed.y*.5;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);float s=uT-age*life;
   vec3 p=AP+vec3((r.x-.5)*.9,.2+age*(1.4+r.y)+r.z*.8,(r.z-.5)*.9)+vec3(sin(age*7.+r.x*9.)*.1,0.,0.);
   vA=(1.-age)*(1.-smoothstep(TI-.15,TI+.1,s))*(.6+.4*sin(age*40.+r.y*30.));put(p,.04+.04*r.z);vMix=0.;}`,EMBER_FS);
  a.count+=points(L.part,80,C+`void main(){float life=1.2+aSeed.y*.6;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);float s=uT-age*life;
   vec3 p=AP+vec3((r.x-.5)*.8,.6+age*(1.6+r.y)+r.z*.6,(r.z-.5)*.8)+vec3(sin(age*3.+r.y*6.)*.25,0.,0.);
   vA=sin(age*3.14159)*.5*(1.-smoothstep(TI-.2,TI+.2,s));put(p,(.3+.5*age)*(.7+.5*r.z));vMix=r.y;}`,SMOKE_FS("vec3(.3,.28,.29)"),NBP);
  // rocío del lanzador al aliado
  a.count+=points(L.part,70,C+`const vec3 E=${v3(V3(-3.47,1.66,0))};void main(){float s=.25+aSeed.x*.4;float u=(uT-s)/.42;
   vec3 p=mix(E,AC+vec3(0.,.8,0.),u)+vec3(0.,sin(u*3.14159)*.8,0.)+rnd()*.07;
   vA=(u>0.&&u<1.)?smoothstep(0.,.15,u):0.;put(p,.08+.05*aSeed.w);}`,DROP_FS);
  // golpe de frescor: vaho frío que se expande y cae, salpicadura de gotas
  a.count+=points(L.part,170,C+`void main(){float s=TI+aSeed.x*.1;float life=1.3+aSeed.y*.8;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),(aSeed.w-.5)*.6,sin(an));
   vec3 p=AC+d*(.3+(1.1+1.5*aSeed.y)*(1.-exp(-t*2.5)))+vec3(0.,-.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.5:0.;put(p,(.45+.55*aSeed.w)*(.6+age));vMix=aSeed.y;}`,SMOKE_FS("mix(vec3(.85,1.,.95),uC1,.3)"),NBP);
  a.count+=points(L.part,170,C+`void main(){float s=TI+aSeed.x*.05;float life=.75+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(1.8+3.*aSeed.z);vec3 p=AC+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.09+.06*aSeed.w);}`,DROP_FS);
  // gotas que caen de las rodajas mientras orbitan
  a.count+=points(L.part,140,C+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);float s=uT-age*life;float t=age*life;
   vec3 p=orb(floor(r.x*6.),s)+vec3((r.y-.5)*.1,-4.*t*t,(r.z-.5)*.1);
   vA=(k>=1.&&s<TD&&p.y>.03)?1.-age*.5:0.;put(p,.06+.04*r.z);}`,DROP_FS);
  // destellos menta y salpicadura final al deshacerse las rodajas
  a.count+=points(L.part,90,C+`void main(){float life=.7+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*2.1,.2+r.y*2.3,(r.z-.5)*2.1);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.14+.18*r.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=points(L.part,90,C+`void main(){float i=floor(aSeed.z*6.);float s=TD+i*.06+.25;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 o=orb(i,s);vec3 v=normalize(o-AC+rnd()*.8+vec3(0.,.6,0.))*(1.2+2.*aSeed.w);
   vec3 p=o+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.06+.05*aSeed.x);}`,DROP_FS);
  // suelo bajo el aliado: quemadura con brasas que se apaga; anillo de rocío que la sustituye y fractura energética
  const burnD=groundPlane(2.6,AP.x,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,1.))*.6+noise(vec3(p*19.,3.))*.4;float m=smoothstep(.95,.4,r+(n-.5)*.4);
   float cr=pow(1.-abs(noise(vec3(p*14.,5.))*2.-1.),10.)*(.6+.4*sin(uT*7.+n*12.));
   gl_FragColor=vec4(mix(vec3(.05,.035,.03),vec3(1.,.4,.1)*1.6,cr*uP),(m*.7+cr*uP*.5*m)*uA);}`,NB));
  const dew=groundPlane(3.8,AP.x,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float ring=band(r,.8*uP+.1,.02)+band(r,.55*uP+.08,.012);
   vec2 g=p*14.;vec2 id=floor(g);vec2 fr=fract(g)-.5;float h=hash(vec3(id,3.));
   float dots=smoothstep(.18,.08,length(fr+vec2(h-.5,fract(h*7.)-.5)*.4))*step(.72,h)*smoothstep(.95*uP+.05,.3*uP,r);
   float frost=noise(vec3(p*20.,1.))*smoothstep(uP,0.,r)*.25;
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*dots)*1.4,(ring+dots*.9+frost)*uA);}`));
  const wave=groundPlane(5.6,AP.x,0.03,fx(RING_FS));
  const frac=groundPlane(6,AP.x,0.025,fx(tileFractureFS(6)));
  for(const m of [burnD,dew,frac,wave]){m.position.z=AP.z;L.decal.add(m);}
  const c1=U.uC1.value;
  a.pose=function(te,o){
    const ia=te-TI, burn=1-ss(TI-0.1,TI+0.5,te), env=ss(TI,TI+0.3,te)*(1-ss(TD,TE,te));
    // rodajas: brotan sobre la cabeza, se abren a la órbita, giran sobre sí mismas y al final revientan en gotas
    slices.forEach((m,i)=>{const t0=TS+i*0.07,x=cl((te-t0)/0.45),an=i*TAU/N+te*W,ex=TD+i*0.06;
      const pop=x<=0?0:1-Math.exp(-7*x)*Math.cos(9*x), sc=pop*(1-ss(ex,ex+0.3,te));
      orb(an,R*(1-Math.pow(1-x,3))*(1+0.3*ss(ex,ex+0.3,te)),tmp); tmp.y+=0.05*Math.sin(te*3+i*1.3);
      m.position.lerpVectors(TOP,tmp,ss(0,0.6,x));
      m.rotation.set(1.15+0.35*Math.sin(te*2+i),-an,te*2.5+i);
      m.visible=sc>0.002; m.scale.setScalar(Math.max(sc,0.001));});
    sliceMat.uniforms.uP.value=ia>=0?Math.exp(-ia*3)+0.3*env:0;
    ring.visible=te>=TI-0.1&&te<TD+0.4; ring.material.uniforms.uA.value=ss(TI-0.1,TI+0.3,te)*(1-ss(TD,TD+0.4,te));
    towardCam(halo.position,AC,0.5); billboard(halo); halo.visible=env>0.002; halo.material.uniforms.uA.value=env*0.5;
    glint(glintEnv(te,0.28,0.09)*1.2,te*2);
    set(burnD,burn,1-ss(TI,TI+1.0,te)); set(dew,ss(TI,TI+0.8,te),env);
    let p=cl(ia/0.7); set(wave,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(1.1,TD-TI+0.2,ia):0);
    U.uE.value=env;
    // aliado: encorvado y con brasas → se yergue con un saltito y brilla menta
    const al=allies[0], w=1-burn, fl=0.2+0.08*Math.sin(te*13)+0.05*Math.sin(te*31);
    al.scale.set(1,1-0.06*burn,1); al.rotation.z=0.05*Math.sin(te*2.2)*burn;
    al.position.y=ia>=0&&ia<0.5?0.15*Math.sin(Math.PI*ia/0.5):0;
    al.userData.m.emissive.setRGB(burn+w*c1.r,0.35*burn+w*c1.g,0.1*burn+w*c1.b);
    al.userData.m.emissiveIntensity=burn*fl+w*(0.35*env+(ia>=0?1.1*Math.exp(-ia*4):0));
    if(te<TS){o.g.copy(AC);o.gs=1;o.ga=0.12;o.li=1.2;}
    else if(ia<0){o.g.copy(TOP);o.gs=1.1;o.ga=0.35;o.li=3;}
    else{o.g.copy(AC);o.gs=2.4+2.6*Math.min(ia,0.5);o.ga=Math.exp(-ia*5)*0.8+0.14*env;o.li=11*Math.exp(-ia*3.5)+3*env;}
    o.ia=ia;o.c.copy(AC);o.shake=1.3;o.dist=1;o.flash=0;
  };
}};

// =====================================================================
// 5 · PAPI — de la mirada salen ondas de cariño (anillos rosa/naranja con corazoncitos) que viajan al aliado
//     y se cierran a su alrededor en un abrazo; late como un corazón y suelta corazones curativos
// =====================================================================
const papi={key:"pjPapi",name:"Papi",dur:2.3,ti:0.8,pal:"Cariño",allies:1,
  phases:[["Mirada",0],["Ondas",0.18],["Abrazo",0.8],["Calidez",1.1],["Fin",1.9]],
build(a){
  const L=a.L,TI=0.8,TD=1.9,TE=2.3,NR=5,TV=0.34,EM=V3(-3.45,1.66,0),AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.0,0));
  const S0=i=>0.18+i*0.07;
  const dir=AC.clone().sub(EM).normalize(), N1=V3(0,1,0).addScaledVector(dir,-dir.y).normalize(), N2=dir.clone().cross(N1);
  const pathPt=(u,out)=>out.lerpVectors(EM,AC,u).addScaledVector(UP,0.35*Math.sin(Math.PI*u));
  // anillo de cariño: banda suave con una corona de corazoncitos hacia fuera; uQ alterna rosa/naranja
  const WAVE_FS=SD_HEART+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ring=band(r,.74,.06)+band(r,.74,.2)*.35;float inner=smoothstep(.75,0.,r)*.1;
   float cell=fract(an/6.2832*10.+uT*.12);float hd=sdHeart(vec2((cell-.5)*5.,(r-.83)*9.));
   float hearts=smoothstep(.06,-.02,hd);
   vec3 col=mix(uC1,uC2,uQ);
   gl_FragColor=vec4(col*1.5+vec3(1.)*band(r,.74,.022)*.6,(ring+hearts*.8+inner)*uA);}`;
  const waves=[],hugs=[];
  for(let i=0;i<NR;i++){
    const w=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fxU(WAVE_FS,{uQ:{value:i%2}}));
    w.quaternion.setFromUnitVectors(ZA,dir); L.trail.add(w); waves.push(w);
    const h=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),fxU(WAVE_FS,{uQ:{value:i%2}}));
    h.position.set(AP.x,0.2+i*0.3,AP.z); L.trail.add(h); hugs.push(h);}
  // capullo cálido que late
  const cocoon=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   float h=vP.y*.5+.5;float wv=band(fract(h*4.-uT*.8),.5,.1)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,h)*(1.2+uP),(fr*(.55+uP*.6)+wv*fr+.03)*uA);}`));
  cocoon.position.set(AP.x,0.9,AP.z); cocoon.scale.set(0.62,1.0,0.62); L.mesh.add(cocoon);
  const glint=mkGlint(L,0.42);
  // ---- partículas
  const C=`const vec3 EM=${v3(EM)};const vec3 AC=${v3(AC)};const vec3 AP=${v3(AP)};const float TI=${f(TI)};
  const vec3 N1=${v3(N1)};const vec3 N2=${v3(N2)};
  vec3 path(float u){return mix(EM,AC,u)+vec3(0.,.35*sin(u*3.14159),0.);}`;
  a.count+=points(L.part,22,C+`void main(){float s=.03+aSeed.x*.25;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=EM+vec3(.1,0.,0.)+normalize(rnd()+vec3(.4,.9,0.))*(.15+.5*t)+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.05*aSeed.z);}`,HEART_FS);
  // corazoncitos que acompañan a las ondas por el camino
  a.count+=points(L.part,70,C+`void main(){float s=.18+aSeed.x*.5;float u=(uT-s)/${f(TV)};
   float an=aSeed.z*6.2832+u*3.;float rad=(.12+.4*aSeed.y)*(.4+.8*u);
   vec3 p=path(clamp(u,0.,1.))+(N1*cos(an)+N2*sin(an))*rad;
   vA=(u>0.&&u<1.)?sin(u*3.14159):0.;put(p,.085+.055*aSeed.w);vMix=aSeed.w;}`,HEART2_FS);
  // estallido de corazones en el abrazo y corazones que suben en espiral
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=AC+d*(.35+(.8+1.1*aSeed.z)*(1.-exp(-t*3.5)))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.13+.08*aSeed.w)*(1.-age*.3));}`,HEART_FS);
  a.count+=points(L.part,80,C+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rad=.48+.25*r.y-.12*age;
   vec3 p=AP+vec3(cos(an)*rad,.1+age*(1.7+r.z*.5),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.11+.065*r.z);vMix=r.z;}`,HEART2_FS);
  a.count+=points(L.part,70,C+`void main(){float life=.7+aSeed.y*.45;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.25,.1+age*(1.3+r.y*.8),(r.z-.5)*1.25)+vec3(sin(age*5.+r.z*9.)*.08,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.035+.035*r.z);vMix=r.y;}`,MOTE_FS);
  a.count+=points(L.part,30,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.25,.2+r.y*1.7,(r.z-.5)*1.25);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.13+.15*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // suelo: ondas concéntricas rosa/naranja y un corazón bajo el aliado; pulsos bajo el lanzador al emitir
  const ripple=groundPlane(3.0,AP.x,0.02,fx(SD_HEART+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float k=r*4.-uT*1.3;float id=floor(k);
   float rg=band(fract(k),.5,.12)*smoothstep(1.,.4,r)*smoothstep(uP+.05,uP-.1,r);
   float hd=sdHeart(p*4.+vec2(0.,.55));float heart=band(hd,0.,.04)+smoothstep(0.,-.1,hd)*.15;
   gl_FragColor=vec4(mix(uC1,uC2,mod(id,2.))*1.3,(rg*.8+heart*uP)*uA);}`));
  ripple.position.z=AP.z;
  const castRing=groundPlane(2.1,-3.7,0.025,fx(RING_FS));
  const wave=groundPlane(3.8,AP.x,0.03,fx(RING_FS)); wave.position.z=AP.z;
  L.decal.add(ripple,castRing,wave);
  const beat=te=>{let b=0;for(let k=0;k<3;k++){const t=TI+k*0.45;if(te>=t)b+=Math.exp(-(te-t)*7);}return b;};
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.3,te)*(1-ss(TD,TE,te)), bt=beat(te)*(1-ss(TD,TE,te));
    glint(glintEnv(te,0.1,0.06),te*1.5);
    // lanzador: se inclina con cariño hacia el aliado mientras emite
    caster.rotation.z=(-0.07+0.03*Math.sin(te*7))*ss(0.1,0.25,te)*(1-ss(TI-0.1,TI+0.3,te));
    let lead=-1;
    waves.forEach((w,i)=>{const u=(te-S0(i))/TV;w.visible=u>0&&u<1.08;
      if(w.visible){pathPt(Math.min(u,1),w.position);w.scale.setScalar(0.5+1.6*Math.min(u,1));
        w.material.uniforms.uA.value=ss(0,0.12,u)*(1-ss(0.85,1.08,u));if(u<1)lead=Math.max(lead,u);}});
    // anillos que llegan se tumban alrededor del aliado y se cierran en un abrazo
    hugs.forEach((h,i)=>{const tb=S0(i)+TV,x=cl((te-tb)/0.28);h.visible=te>=tb&&te<TE;
      h.scale.setScalar(2.0-0.95*(1-Math.pow(1-x,2))+0.07*bt+0.6*ss(TD,TE,te));
      h.material.uniforms.uA.value=ss(tb,tb+0.06,te)*(1-ss(TD,TE-0.1,te))*(0.6+0.3*bt);});
    cocoon.visible=te>=TI-0.1&&te<TE; set(cocoon,bt,ss(TI-0.1,TI+0.2,te)*(1-ss(TD,TE,te))*0.7);
    cocoon.scale.set(0.62*(1+0.05*bt),1.0*(1+0.04*bt),0.62*(1+0.05*bt));
    set(ripple,ss(TI-0.15,TI+0.55,te),env*0.85);
    let li=-1;for(let i=0;i<NR;i++)if(te>=S0(i))li=i;
    const ci=li>=0?te-S0(li):-1; set(castRing,cl(ci/0.28),li>=0&&te<S0(NR-1)+0.28?0.8*(1-cl(ci/0.28)):0);
    let p=cl(ia/0.5); set(wave,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    // aliado: brillo cálido que late como un corazón
    const al=allies[0]; al.userData.m.emissive.copy(U.uC1.value);
    al.userData.m.emissiveIntensity=0.2*env+0.4*bt+(lead>0.8?0.15:0);
    al.scale.set(1+0.03*bt,1+0.03*bt,1+0.03*bt); al.rotation.z=0.04*Math.sin(te*3)*env;
    if(te<0.18){localW(EYE_L[1],o.g);const g=glintEnv(te,0.1,0.06);o.gs=0.7;o.ga=0.32*g;o.li=1.6*g;}
    else if(ia<0&&lead>=0){pathPt(lead,o.g);o.gs=1;o.ga=0.3;o.li=3.2;}
    else if(ia<0){o.g.copy(AC);o.gs=1;o.ga=0.25;o.li=2.5;}
    else{o.g.copy(AC);o.gs=1.7+1.2*Math.min(ia,0.5)+0.3*bt;o.ga=Math.exp(-ia*7)*0.5+0.1*env+0.12*bt;o.li=5.5*Math.exp(-ia*5)+2*env+1.6*bt;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

VFX.module("Planta · Ojos",[trunkAb,blossom,confusion,cucumber,papi]);
})();

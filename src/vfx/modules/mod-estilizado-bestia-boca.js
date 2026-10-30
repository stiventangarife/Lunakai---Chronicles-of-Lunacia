// =====================================================================
// ESTILIZADO · BESTIA · BOCA (Hito 101) — las 7 cartas de boca de Bestia rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_kiss, sty_goda, sty_nut, sty_puff, sty_foxy, sty_platy, sty_conf).
// Mismos dur / ti / fases que mod-bestia-boca.js, así que el daño llega igual. El concepto sigue la carta (PartCards.js):
//  · Axie Kiss: un corazón sólido sale de un beso, vuela en arco y estalla en esquirlas de corazón; marca de carmín y
//    Frágil (la carta lo aplica con poca vida; se enseña siempre).
//  · Goda: mandíbulas espirituales de pelaje ámbar muerden, sacuden y desgarran; el rival suelta un orbe de PA que se rompe
//    (−1 PA en su próximo turno).
//  · Nut Cracker: una nuez enorme cae sobre la cabeza del rival y unas mandíbulas de madera la cascan: cáscara y pepita.
//  · Puff: el lanzador inhala, se hincha y exhala un chorro de vapor ardiente; la vida robada vuelve en motas (drenaje 50 %).
//  · Foxy: el espíritu de un zorro de fuego salta y muerde (cuerpo a cuerpo); fuegos fatuos rodean al rival y revientan.
//  · Platypus (Bing / Pomodoro): golpe de pico en el suelo; una onda de agua y una cúpula de panal ámbar cubren el área de
//    2 casillas alrededor del lanzador (escudo a los aliados del área). Sin piezas en los muñecos aliados: en el juego el
//    área se orienta hacia el enemigo más cercano y los aliados reales están en cualquier casilla.
//  · Confident (aliado): humo violeta de los estados sobre el aliado; una columna dorada lo purifica; emblema solar y
//    estrellas de crítico (+15 %).
// Bestia = pelaje ámbar y naranja cálido; cada carta con su acento. Los colores fijos de los shaders están en lineal.
// Módulo autónomo (no necesita mod-bestia-boca.js).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,camera,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Bestia · Beso",["#ff6f9c","#a8123f"]);
VFX.palette("Sty Bestia · Goda",["#ffb257","#8a3b12"]);
VFX.palette("Sty Bestia · Nuez",["#f2b25a","#6b3a17"]);
VFX.palette("Sty Bestia · Vapor",["#ffab52","#c2361b"]);
VFX.palette("Sty Bestia · Zorro",["#ffa43a","#b8420f"]);
VFX.palette("Sty Bestia · Panal",["#ffc04a","#a8560c"]);
VFX.palette("Sty Bestia · Confianza",["#ffd25a","#c2620c"]);

const EARTH="vec3(.42,.27,.15)";
const MO=V3(-3.43,1.55,0), TC=V3(3.15,1.2,0), THd=V3(3.25,1.62,0);   // boca del lanzador; pecho y cabeza del rival
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), XA=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const ZONES={zoneCaster:0.5,zoneTarget:1.2};
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const emit=(d,k,r,g,b)=>{const m=d.userData.m;if(r===undefined)m.emissive.copy(U.uC1.value);else m.emissive.setRGB(r,g,b);m.emissiveIntensity=k;};
const resetDummy=d=>{d.rotation.set(0,0,0);d.scale.set(1,1,1);};
const SDSEG=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
const SDFLIT=`float sdfH(vec2 p){return sqrt(clamp(-sdf(p)/.12,0.,1.));}
vec3 sdfN(vec2 p){float e=.014;float hx=sdfH(p+vec2(e,0.))-sdfH(p-vec2(e,0.));float hy=sdfH(p+vec2(0.,e))-sdfH(p-vec2(0.,e));
 return normalize(vec3(-hx*.8,-hy*.8,1.));}`;
const HEART=`float sdHeart(vec2 p){p.x=abs(p.x);if(p.y+p.x>1.)return sqrt(dot(p-vec2(.25,.75),p-vec2(.25,.75)))-.3536;
 return sqrt(min(dot(p-vec2(0.,1.),p-vec2(0.,1.)),dot(p-.5*max(p.x+p.y,0.),p-.5*max(p.x+p.y,0.))))*sign(p.x-p.y);}`;
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.35});
const FLAME_FS=S.ENERGY_FS(C.flame,{gain:1.5});
// mancha en el suelo; col = GLSL; uP = erosión
const POOL_FS=(col,al=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5+uT*.02).g*.4;float m=smoothstep(.85,.7,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.3+.35*n),m*er*uA*${f(al)});}`;
// estela de energía a lo largo de +x
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.25+.75*u;float m=smoothstep(w,w*.4,v)*u*u;
 float n=styNoise(vec2(u*.7-uT*2.,vUv.y*.5)).b;float er=styErode(n*.5+.5*u,.2,.15);
 if(m*er<.01)discard;gl_FragColor=vec4(styRamp(.5+.45*u)*1.25,m*er*uA);}`;
const streakMesh=(parent,w,mat)=>{const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0);const grp=new THREE.Group();
  const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat);b.rotation.x=Math.PI/2;grp.add(a,b);parent.add(grp);return grp;};
const poseStreak=(s,p0,p1,vis)=>{tmp3.copy(p1).sub(p0);const ln=tmp3.length();s.visible=vis&&ln>0.01;if(!s.visible)return;
  s.position.copy(p1);s.quaternion.setFromUnitVectors(XA,tmp3.normalize());s.scale.set(ln,1,1);};
// anillo de pincel en billboard; uP = erosión
const RINGB_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.6+.4*s.g)*1.15,s.r*er*uA);}`;
const ringBill=(parent,size)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),S.mat(RINGB_FS,{},{mode:'energy',depthTest:false}));parent.add(m);return m;};
// chevrón hacia arriba (energía); col GLSL
const CHEVUP_FS=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;gl_FragColor=vec4(styRampOf(${col},.8)*1.3,a);}`;
// chevrón hacia abajo (−PA)
const CHEVDN_FS=col=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.1,.06,d)*step(abs(q.x),.36)*vA;if(a<.01)discard;gl_FragColor=vec4(styRampOf(${col},.8)*1.2,a);}`;

// ---------- arco de mordisco (Goda y Nut Cracker) ----------
// media luna de pincel (energía pintada, mezcla normal) con colmillos de marfil/ámbar en el borde interior y banda de
// contorno oscura; uUp = 1 arco de arriba (colmillos hacia abajo); uEr erosión; uFur = color del trazo; uTooth = diente
const JAW_FS=`uniform float uUp;uniform float uEr;uniform vec3 uFur;uniform vec3 uTooth;
float inY(float x){return -.78+sqrt(max(.81-x*x,0.));}
float fangs(vec2 p){float t=1e3;for(int i=0;i<5;i++){float fi=float(i);float x=-.5+fi*.25;float y0=inY(x)+.03;
  float h=.24-.07*abs(fi-2.);vec2 q=p-vec2(x,y0);float w=.07*(1.+q.y/h);t=min(t,max(abs(q.x)-w,max(q.y,-q.y-h)));}return t;}
float band(vec2 p){float o=length(p-vec2(0.,-.56))-.95;float i=length(p-vec2(0.,-.78))-.9;float d=max(o,-i);
  return max(d,abs(p.x)-.88+.25*smoothstep(.5,.9,abs(p.x)));}
void main(){vec2 p=(vUv-.5)*vec2(2.,1.25);if(uUp<.5)p.y=-p.y;
 float n=styNoise(vec2(p.x*.6+uUp*.37,p.y*.3)+.1).b;float nb=styNoise(vUv*1.3+uUp).r;
 float db=band(p)+(nb-.5)*.05;float df=fangs(p);float d=min(db,df);
 float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float er=styErode(n*.55+.45*clamp(-d*6.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float isT=step(df,db);
 float depth=clamp(-db*9.,0.,1.);
 vec3 stroke=mix(uFur*.35,uFur*1.15,clamp(smoothstep(.0,.8,depth)+.2*(n-.5),0.,1.));
 stroke*=.9+.1*sin(p.x*40.+n*8.);
 vec3 L3=normalize(vec3(sign(p.x)*.3,uUp>.5?-.4:.4,1.));float l=styLight(normalize(vec3(-(p.x-.0)*.6,(uUp>.5?-1.:1.)*.5,1.)),stySunV());
 vec3 tooth=styRampOf(uTooth,clamp(.35+.5*l+.2*clamp(-df*10.,0.,1.),0.,1.))*styTint(l);
 vec3 c=mix(stroke,tooth,isT);
 float rim=smoothstep(-.06,-.015,d);c=mix(c,vec3(.03,.008,.002),rim*.92);
 gl_FragColor=vec4(c,a);}`;
const makeJaws=(parent,w,fur,tooth)=>{
  const mk=up=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.78),S.mat(JAW_FS,{uUp:{value:up},uEr:{value:0},
    uFur:{value:new THREE.Color().setRGB(...fur)},uTooth:{value:new THREE.Color().setRGB(...tooth)}},{mode:'matter',depthTest:false}));parent.add(m);return m;};
  const top=mk(1),bot=mk(0);
  return {top,bot,pose(c,open,k,alpha,er,rot=0){   // open 0 = cerrada, 1 = abierta; c = centro de la boca
    for(const [m,s] of [[top,1],[bot,-1]]){m.visible=alpha>0.01&&k>0.01;if(!m.visible)continue;
      towardCam(m.position,tmp.copy(c).add(tmp2.set(0,s*(0.02+0.4*open)*k*w,0)),0.25);billboard(m,rot+s*0.18*open);
      m.scale.set(Math.max(k*w/1.25,0.001),Math.max(k*w/1.25*(0.78+0.12*open),0.001),1);m.material.uniforms.uA.value=alpha;m.material.uniforms.uEr.value=er;}
  }};
};
const defs=[];

// =====================================================================
// 1 · AXIE KISS — un beso de carmín; un corazón sólido brillante vuela en arco con corazoncitos, se aplasta en el rival y
//     estalla en esquirlas de corazón; queda una marca de carmín en su cara y Frágil (esquirlas rosas).
// =====================================================================
// corazón sólido iluminado en 3 bandas con brillo duro; uEr erosión, uQ = aplastamiento (solo para el brillo)
const HEART_FS=HEART+`uniform float uEr;
float sdf(vec2 p){return sdHeart(p*1.7+vec2(0.,.5))/1.7;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.25;float d=sdf(p);float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float n=styNoise(vUv*.8+.2).r;float er=styErode(n*.55+.45*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());vec3 c=styRampOf(uC1,clamp(.2+.6*l,0.,1.))*styTint(l);
 c=mix(c,styRampOf(uC2,.4),smoothstep(-.06,-.01,d)*.7);
 float hl=smoothstep(.06,.04,length((p-vec2(-.15,.15))*vec2(1.,1.5)));c=mix(c,vec3(1.15,1.05,1.05),hl*.9);
 gl_FragColor=vec4(c,a);}`;
// labios: dos lóbulos fruncidos (materia carmín) con brillo
const LIPS_FS=`uniform float uEr;uniform float uQ;
float sdf(vec2 p){p.x/=mix(1.,.62,uQ);float up=length((p-vec2(-.17,.07))*vec2(1.,1.7))-.22;up=min(up,length((p-vec2(.17,.07))*vec2(1.,1.7))-.22);
 float lo=length((p-vec2(0.,-.08))*vec2(.75,1.5))-.3;float d=min(max(up,-p.y+.02),max(lo,p.y-.02));return min(d,length(p*vec2(.62,1.3))-.24);}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.4;float d=sdf(p);float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float er=styErode(styNoise(vUv).r*.5+.5*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());vec3 c=styRampOf(uC2,clamp(.25+.55*l,0.,1.))*styTint(l);
 c=mix(c,c*.35,smoothstep(.025,0.,abs(p.y-.0))*.9);
 c=mix(c,vec3(1.1),smoothstep(.05,.03,length((p-vec2(-.1,.14))*vec2(1.,2.)))*.8);
 gl_FragColor=vec4(c,a);}`;
// partícula corazón (materia) iluminada; col = GLSL
const HEARTP_FS=col=>S.PV+HEART+`
void main(){vec2 p=(styPC()-.5)*1.35;float d=sdHeart(p*1.6+vec2(0.,.55))/1.6;float m=smoothstep(.03,-.02,d);if(m<.01)discard;
 float er=styErode(styNoise(p*.6+vMix*3.).r*.6+.4*clamp(-d*4.,0.,1.),vK*1.05-.08,.1);float a=m*er*vA;if(a<.01)discard;
 float l=styLight(normalize(vec3(-p.x*1.2,-(p.y-.05)*1.2,1.)),stySunV());
 vec3 c=styRampOf(${col},clamp(.25+.55*l,0.,1.))*styTint(l);c=mix(c,vec3(1.1),smoothstep(.08,.05,length(p-vec2(-.16,.12)))*.7);
 gl_FragColor=vec4(c,a);}`;
// marca de carmín (energía suave) en la cara del rival
const PRINT_FS=`uniform float uEr;
void main(){vec2 p=(vUv-.5)*1.5;float up=min(length((p-vec2(-.15,.06))*vec2(1.,1.8))-.2,length((p-vec2(.15,.06))*vec2(1.,1.8))-.2);
 float lo=length((p-vec2(0.,-.07))*vec2(.8,1.6))-.26;float d=min(max(up,-p.y),max(lo,p.y));
 float n=styNoise(vUv*1.3).a;float m=smoothstep(.02,-.02,d+n*.04)*(.75+.25*sin(p.x*60.));if(m<.01)discard;
 float er=styErode(styNoise(vUv*.7).r*.6+.4*m,uEr,.12);gl_FragColor=vec4(styRampOf(uC2,.7)*1.15,m*er*uA);}`;
defs.push({key:"sty_kiss",name:"Axie Kiss (estilizado)",dur:2.2,ti:0.7,tier:2,pal:"Sty Bestia · Beso",stylized:true,...ZONES,
  phases:[["Beso",0],["Vuelo",0.25],["Estallido",0.7],["Frágil",0.85],["Fin",1.95]],
build(a){
  const L=a.L,TI=0.7,TF=0.25,TM=0.85,TE=1.95;
  const heart=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(HEART_FS,{uEr:{value:0}},{mode:'matter'})); L.mesh.add(heart);
  const lips=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),S.mat(LIPS_FS,{uEr:{value:0},uQ:{value:0}},{mode:'matter'})); L.mesh.add(lips);
  const print=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.62),S.mat(PRINT_FS,{uEr:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(print);
  const trail=streakMesh(L.mesh,0.32,S.mat(STREAK_FS,{},{mode:'energy',side:THREE.DoubleSide}));
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.53}), ring=S.groundRing(L.decal,2.8), shadow=S.contactShadow(L.decal,1.0);
  const echo=ringBill(L.mesh,2.0);
  const frag=S.status(a,'fragile',[target],TM,TE);
  const P0=V3(MO.x+0.3,MO.y+0.05,0), P1=V3(TC.x-0.12,TC.y+0.25,0.05);
  const K=`const float TI=${f(TI)};const float TF=${f(TF)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
  vec3 path(float k){return mix(P0,P1,k)+vec3(0.,sin(k*3.14159)*1.05,0.);}`;
  // corazoncitos que suelta el beso y que siguen al corazón grande
  S.pts(L.part,26,VV+K+`void main(){float s=aSeed.x*(TI-.05);float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float kk=clamp((s-TF)/(TI-TF),0.,1.);vec3 o=s<TF?P0:path(kk);
   vec3 p=o+rnd()*vec3(.15,.12,.15)+vec3(0.,.35*t,0.);vR=(aSeed.z-.5)*.6;vK=smoothstep(.45,1.,age);
   vA=(age>0.&&age<1.)?1.:0.;put(p,(.2+.1*aSeed.w)*(1.-.3*age));}`,HEARTP_FS('mix(uC1,vec3(1.,.55,.7),step(.5,vMix))'));
  // estallido de esquirlas de corazón
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.75+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.3,.5,0.));vec3 p=P1+d*(1.5+.7*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,-1.2*t*t,0.);
   vR=aSeed.w*6.28+t*(aSeed.z-.5)*8.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.34+.16*aSeed.w);}`,
   HEARTP_FS('mix(uC1,uC2,step(.55,vMix))'));
  // brillos rosas
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.1;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P1+normalize(rnd())*(.4+1.1*(1.-exp(-t*5.)));vR=aSeed.z*6.;vK=0.;vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.2+.12*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  const hp=V3(0,0,0), hp2=V3(0,0,0);
  const path=(k,out)=>out.lerpVectors(P0,P1,k).add(tmp3.set(0,Math.sin(k*Math.PI)*1.05,0));
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TE-0.3,TE,te);
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    // beso: los labios fruncidos delante de la boca
    const lk=ss(0,0.08,te)*(1-ss(TF,TF+0.1,te));
    lips.visible=lk>0.01; towardCam(lips.position,tmp.copy(MO).add(tmp2.set(0.2,0,0)),0.3); billboard(lips,0);
    lips.scale.setScalar(Math.max(0.8+0.3*back(cl(te/0.18)),0.001)); lips.material.uniforms.uA.value=lk;
    lips.material.uniforms.uQ.value=ss(0.05,0.2,te); lips.material.uniforms.uEr.value=-0.1;
    caster.scale.set(1+0.04*lk,1-0.03*lk,1+0.04*lk);
    // corazón en vuelo
    const k=cl((te-TF)/(TI-TF)), fly=te>=TF-0.06&&ia<0.08;
    heart.visible=fly; path(k,hp);
    if(fly){towardCam(heart.position,hp,0.2);billboard(heart,0.25*Math.sin(te*14)-0.15);
      const sq=ia>=0?cl(ia/0.08):0; heart.scale.set(1.55*(1+0.45*sq),1.55*(1-0.35*sq),1);
      heart.scale.multiplyScalar(te<TF?ss(TF-0.06,TF,te):1);
      heart.material.uniforms.uA.value=1; heart.material.uniforms.uEr.value=-0.1+1.1*sq;}
    poseStreak(trail,path(Math.max(k-0.3,0),hp2),hp,te>TF+0.04&&ia<0);
    if(trail.visible)trail.children.forEach(m=>{m.material.uniforms.uA.value=0.75;});
    spark.pose(ia,P1,1.1);
    ring.pose(ia,3.4,0,0.5,1);
    {const p=cl(ia/0.38);towardCam(echo.position,P1,0.3);billboard(echo);echo.visible=ia>=0&&p<1;echo.scale.setScalar(0.4+1.4*p);set(echo,-0.1+1.1*p,1);}
    // marca de carmín en la cara
    const pk=ss(TI+0.05,TI+0.18,te)*fade;
    print.visible=pk>0.01; towardCam(print.position,tmp.copy(THd).add(tmp2.set(-0.05,-0.12,0)),0.55); billboard(print,0.25);
    print.scale.setScalar(0.9+0.25*hitE(ia-0.05,6)); print.material.uniforms.uA.value=pk; print.material.uniforms.uEr.value=-0.1+1.1*ss(TE-0.5,TE,te);
    shadow.pose(hp.x,0,0.6+0.3*k,fly?0.4:0);
    frag.pose(te);
    // el rival recibe el beso: se aplasta, retrocede y se sonroja
    target.position.x=3.4+0.2*hitE(ia,6); target.scale.set(1+0.1*hitE(ia,9),1-0.12*hitE(ia,9),1+0.1*hitE(ia,9));
    target.rotation.z=-0.12*hitE(ia,6);
    emit(target,0.7*hitE(ia,5)+0.12*pk,1,0.35,0.55); emit(caster,0.15*lk,1,0.35,0.55);
    if(te<TF){o.g.copy(MO);o.gs=0.5;o.ga=0.08*lk;o.li=0.6;}
    else if(te<TI){o.g.copy(hp);o.gs=0.8;o.ga=0.1;o.li=1.2;}
    else{o.g.copy(P1);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.14*Math.exp(-ia*8);o.li=1+2.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(P1);o.shake=0.25;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 2 · GODA — mandíbulas espirituales de pelaje ámbar se abren ante el rival, muerden, lo sacuden y rematan con un
//     segundo mordisco que las rompe en mechones; el rival suelta un orbe de PA que se resquebraja (−1 PA).
// =====================================================================
// orbe de PA (materia dorada facetada con grieta); uCr = grieta 0..1, uEr erosión
const ORB_FS=SDSEG+`uniform float uCr;uniform float uEr;
float sdf(vec2 p){return length(p)-.42;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.1;float d=sdf(p);float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float an=atan(p.y,p.x);float facet=floor((an+3.14159)/1.0472);
 vec3 N=normalize(vec3(cos(facet*1.0472+.52)*.45*length(p)/.42,sin(facet*1.0472+.52)*.45*length(p)/.42,1.));
 float l=styLight(N,stySunV());vec3 c=styRampOf(vec3(.95,.62,.12),clamp(.3+.55*l,0.,1.))*styTint(l);
 float cr=min(sdSeg(p,vec2(-.05,.42),vec2(.06,.1)),min(sdSeg(p,vec2(.06,.1),vec2(-.08,-.12)),sdSeg(p,vec2(-.08,-.12),vec2(.04,-.42))));
 float crack=smoothstep(.03,.0,cr)*step(-.42+.84*(1.-uCr),-p.y*1.);c=mix(c,vec3(.12,.05,.02),crack);
 c=mix(c,vec3(1.2,1.1,.9),smoothstep(.08,.05,length(p-vec2(-.15,.17)))*.8);
 c+=vec3(.9,.55,.1)*(1.-smoothstep(.0,.3,length(p)))*.25;
 float er=styErode(styNoise(vUv).r*.6+.4*clamp(-d*4.,0.,1.),uEr,.1);gl_FragColor=vec4(c,m*er*uA);}`;
// mechón de pelaje (materia): hoja alargada del atlas en ámbar
const FUR_FS=S.MATTER_FS(C.leaf,{relief:3,col:'mix(vec3(.85,.42,.1),vec3(.42,.17,.05),step(.5,vMix))'});
defs.push({key:"sty_goda",name:"Goda (estilizado)",dur:2.0,ti:0.82,tier:2,pal:"Sty Bestia · Goda",stylized:true,zoneCaster:0.5,zoneTarget:1.3,
  phases:[["Mordisco",0],["Cierre",0.3],["Agarre",0.42],["Desgarro",0.82],["Marca",1.02]],
build(a){
  const L=a.L,TC1=0.3,TG=0.42,TI=0.82,TM=1.02,TE=1.85;
  const jaws=makeJaws(L.mesh,2.5,[0.66,0.17,0.012],[0.86,0.74,0.5]);
  const orb=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),S.mat(ORB_FS,{uCr:{value:0},uEr:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(orb);
  const spark1=S.hitSpark(L.mesh,1.5,{seed:0.31}), spark2=S.hitSpark(L.mesh,2.1,{seed:0.77}), ring=S.groundRing(L.decal,3.0);
  const bite=groundPlane(1.8,3.4,0.026,S.mat(POOL_FS('vec3(.5,.12,.06)',.5),{},{mode:'matter'})); L.decal.add(bite);
  const BC=V3(3.25,1.3,0.1);
  const K=`const float TI=${f(TI)};const float TG=${f(TG)};const vec3 BC=${v3(BC)};const float TM=${f(TM)};`;
  // mechones que salen al desgarrar
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.45,0.));vec3 p=BC+d*(1.3+.6*aSeed.z)*(1.-exp(-t*4.5))+vec3(0.,-1.*t*t,0.);
   vR=aSeed.w*6.28+t*(aSeed.z-.5)*7.;vK=smoothstep(.45,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.3+.14*aSeed.w);}`,FUR_FS);
  // esquirlas de colmillo
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.1,.5,0.));vec3 p=BC+d*(1.6+.5*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,-1.4*t*t,0.);
   vR=aSeed.w*6.28+t*9.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.2+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'vec3(.92,.85,.68)'}));
  // esquirlas doradas del orbe de PA y chevrones hacia abajo
  S.pts(L.part,14,VV+K+`void main(){float s=TM+.3+aSeed.x*.03;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(3.35,2.55,0.)+normalize(rnd())*(.9*(1.-exp(-t*5.)))+vec3(0.,-.9*t*t,0.);
   vR=aSeed.w*6.28+t*8.;vK=smoothstep(.4,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.18+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'vec3(.95,.6,.1)'}));
  S.pts(L.part,4,VV+K+`void main(){float s=TM+.35+aSeed.x*.25;float life=.55;float age=(uT-s)/life;
   vec3 p=vec3(3.35+(aSeed.y-.5)*.5,2.5-age*.9,(aSeed.z-.5)*.4);vR=0.;vK=0.;vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.34);}`,
   CHEVDN_FS('vec3(.85,.35,.08)'),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TE-0.25,TE,te);
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7;
    // mandíbulas: aparecen abiertas, se cierran (0,3–0,42), sacuden, se abren un poco y rematan (0,82)
    const app=ss(0,0.18,te), open=te<TC1?1:te<TG?1-ss(TC1,TG,te):te<TI-0.14?0.08*Math.abs(Math.sin(te*30)):te<TI?0.55*ss(TI-0.14,TI-0.04,te):0;
    const shake=te>=TG&&te<TI?Math.sin(te*38)*0.12:0;
    const jer=ia>=0.12?-0.1+1.1*cl((ia-0.12)/0.2):-0.1;
    jaws.pose(tmp3.set(3.15+shake*0.6,1.3,0.2),open,1.15*back(cl(te/0.22)),app*(ia<0.32?1:0),jer,shake*0.6);
    spark1.pose(te-TG,tmp.set(3.2,1.35,0.2),0.8);
    spark2.pose(ia,BC,1.15);
    ring.pose(ia,3.4,0,0.5,1);
    set(bite,-0.1+1.1*ss(TE-0.5,TE,te),ss(TI,TI+0.1,te)*fade);
    // orbe de PA: sale de la cabeza del rival, se agrieta y estalla
    const ok=ss(TM,TM+0.12,te)*(1-ss(TM+0.3,TM+0.34,te));
    orb.visible=ok>0.01; towardCam(orb.position,tmp.set(3.35,2.2+0.35*ss(TM,TM+0.25,te),0),0.4); billboard(orb,0);
    orb.scale.setScalar(Math.max(0.7+0.3*back(cl((te-TM)/0.15)),0.001)); orb.material.uniforms.uA.value=ok;
    orb.material.uniforms.uCr.value=ss(TM+0.12,TM+0.28,te); orb.material.uniforms.uEr.value=-0.1+1.1*ss(TM+0.26,TM+0.34,te);
    // rival: agarrado y sacudido, luego desgarrado hacia atrás
    target.position.x=3.4+shake*0.5+0.28*hitE(ia,5)+(te>=TG&&te<TI?-0.06:0);
    target.rotation.z=shake*0.8-0.18*hitE(ia,6);
    target.scale.set(1+0.08*hitE(ia,9),1-0.1*hitE(ia,9),1+0.08*hitE(ia,9));
    emit(target,0.6*hitE(ia,5)+(te>=TG&&te<TI?0.2:0)+0.25*ok,1,0.55,0.15);
    caster.rotation.z=-0.08*ss(0,0.12,te)*(1-ss(TI,TI+0.2,te));
    if(te<TI){o.g.set(3.2,1.35,0.15);o.gs=0.6+0.3*app;o.ga=0.06*app;o.li=0.8+0.6*(te>=TG?1:0);}
    else{o.g.copy(BC);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.16*Math.exp(-ia*8);o.li=1+3*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(BC);o.shake=0.35;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 3 · NUT CRACKER — sobre el rival aparece una nuez enorme (cáscara rugosa iluminada) que cae sobre su cabeza; unas
//     mandíbulas de madera la atrapan y la cascan: las dos mitades saltan, esquirlas de cáscara, trozos de pepita y polvo.
// =====================================================================
// nuez: dos lóbulos con la costura central, surcos sinuosos; uSp = separación de las mitades (0 entera), uSide ±1 mitad
const NUT_FS=`uniform float uEr;uniform float uSp;uniform float uSide;
float sdf(vec2 p){float d=length(p*vec2(1.,.86))-.42;return d;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.1;float d=sdf(p);
 float half_=uSide==0.?1.:step(0.,p.x*uSide);float m=smoothstep(.015,-.015,d)*half_;if(m<.01)discard;
 float n=styNoise(p*.9+.4).r;float er=styErode(n*.6+.4*clamp(-d*4.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float gro=abs(sin(p.y*16.+sin(p.x*9.)*1.6+n*3.));float ridge=smoothstep(.0,.35,gro);
 vec3 N=sdfN(p);N.xy+=vec2(cos(p.y*16.),sin(p.x*11.))*.25*(1.-ridge);N=normalize(N);
 float l=styLight(N,stySunV());vec3 c=styRampOf(vec3(.4,.19,.06),clamp(.18+.62*l,0.,1.))*styTint(l);
 c*=.5+.5*ridge;float seam=smoothstep(.03,.0,abs(p.x))*(1.-step(.0,abs(uSide)-.5));c=mix(c,vec3(.12,.06,.02),seam);
 // cara interior al partirse: pepita clara
 float inner=uSide==0.?0.:smoothstep(.08,.0,abs(p.x)-.0)*smoothstep(-.1,-.25,d);c=mix(c,styRampOf(vec3(.92,.78,.5),.6),inner*uSp);
 gl_FragColor=vec4(c,a);}`;
// runa de invocación (energía) sobre el rival
const RUNE_FS=SDSEG+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float m=smoothstep(.05,0.,abs(r-.8))+smoothstep(.04,0.,abs(r-.62))*step(.5,fract(an/6.2832*12.));
 float st=1e3;for(int i=0;i<3;i++){float a1=float(i)*2.094+uT*.6;st=min(st,sdSeg(p,vec2(cos(a1),sin(a1))*.6,vec2(cos(a1+2.094),sin(a1+2.094))*.6));}
 m=max(m,smoothstep(.04,0.,st));if(m<.01)discard;float er=styErode(styShape(7.,vUv).b*.5+.5*m,uP,.12);
 gl_FragColor=vec4(styRamp(.7+.3*m)*1.2,m*er*uA);}`;
defs.push({key:"sty_nut",name:"Nut Cracker (estilizado)",dur:2.1,ti:0.78,tier:2,pal:"Sty Bestia · Nuez",stylized:true,zoneCaster:0.5,zoneTarget:1.3,
  phases:[["Invocación",0],["Caída",0.38],["Mordida",0.64],["Crujido",0.78],["Fragmentos",0.95]],
build(a){
  const L=a.L,TF=0.38,TB=0.64,TI=0.78,TE=1.9;
  const mkNut=side=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(NUT_FS,{uEr:{value:0},uSp:{value:0},uSide:{value:side}},{mode:'matter'}));L.mesh.add(m);return m;};
  const nut=mkNut(0), hL=mkNut(-1), hR=mkNut(1);
  const rune=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(RUNE_FS,{},{mode:'energy',depthTest:false})); L.mesh.add(rune);
  const jaws=makeJaws(L.mesh,2.3,[0.4,0.12,0.02],[0.78,0.52,0.16]);
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.61}), ring=S.groundRing(L.decal,3.0), shadow=S.contactShadow(L.decal,1.3);
  const crumbs=groundPlane(2.0,3.4,0.026,S.mat(POOL_FS('vec3(.42,.24,.1)',.5),{},{mode:'matter'})); L.decal.add(crumbs);
  const NC=V3(3.3,2.2,0.1);
  const K=`const float TI=${f(TI)};const vec3 NC=${v3(NC)};`;
  S.pts(L.part,32,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.75+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.55,0.));vec3 p=NC+d*(1.6+.7*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,-1.6*t*t,0.);p.y=max(p.y,.05);
   vR=aSeed.w*6.28+t*10.*(aSeed.z-.5);vK=smoothstep(.55,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.22+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:4,col:'mix(vec3(.5,.27,.1),vec3(.3,.15,.05),step(.5,vMix))'}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.7,0.));vec3 p=NC+d*(1.1+.5*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,-1.5*t*t,0.);p.y=max(p.y,.06);
   vR=aSeed.w*6.28;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.26+.1*aSeed.w);}`,
   S.MATTER_FS(C.puff,{relief:5,col:'vec3(.9,.72,.42)'}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.1,0.)+vec3(cos(an),0.,sin(an))*(.4+.8*(1.-exp(-t*4.)))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=an;put(p,(.3+.12*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH}));
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TE-0.3,TE,te);
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7;
    // runa y nuez que se materializa sobre el rival
    const rk=ss(0,0.15,te)*(1-ss(TF,TF+0.15,te));
    rune.visible=rk>0.01; towardCam(rune.position,tmp.set(3.35,3.5,0),0.2); billboard(rune,te*0.8); rune.scale.setScalar(1+0.1*Math.sin(te*9));
    set(rune,-0.1+1.1*ss(TF,TF+0.15,te),rk);
    const fall=ss(TF,TB,te), y=te<TF?3.5+0.06*Math.sin(te*12):3.5+(NC.y-3.5)*fall*fall;
    const whole=te<TI;
    nut.visible=whole&&te>0.05; towardCam(nut.position,tmp.set(3.32,y,0.05),0.25);billboard(nut,0.2*Math.sin(te*5)+(te<TF?te*2:TF*2+fall*1.2));
    const squeeze=te>=TB?ss(TB,TI,te):0;
    nut.scale.set(1.75*back(cl((te-0.05)/0.25))*(1+0.06*squeeze),1.75*back(cl((te-0.05)/0.25))*(1-0.12*squeeze),1);
    nut.material.uniforms.uA.value=1; nut.material.uniforms.uEr.value=-0.1;
    // mitades que saltan al cascarse
    for(const [h,s] of [[hL,-1],[hR,1]]){h.visible=te>=TI&&te<TE;if(!h.visible)continue;const t=te-TI;
      towardCam(h.position,tmp.set(NC.x+s*(0.15+1.4*t),NC.y+1.9*t-3.2*t*t,0.1),0.25);billboard(h,s*(0.3+5*t));
      h.scale.setScalar(1.75);h.material.uniforms.uA.value=1;h.material.uniforms.uSp.value=1;
      h.material.uniforms.uEr.value=-0.1+1.1*ss(0.55,0.9,t);}
    // mandíbulas de madera: muerden la nuez
    const jk=ss(TB-0.12,TB,te)*(1-ss(TI+0.12,TI+0.3,te)), open=te<TB?1:1-ss(TB,TI,te)*0.85;
    jaws.pose(tmp3.set(NC.x-0.02,NC.y-0.05,0.18),open*(1+0.15*hitE(ia,12)),1,jk,ia>0.12?-0.1+1.1*cl((ia-0.12)/0.18):-0.1,0);
    spark.pose(ia,NC,1.1);
    ring.pose(ia,3.4,0,0.5,1);
    shadow.pose(3.4,0,0.6+0.6*fall,whole?0.45*ss(0.05,TF,te):0);
    set(crumbs,-0.1+1.1*ss(TE-0.5,TE,te),ss(TI+0.15,TI+0.4,te)*fade);
    // el rival: cabeza aplastada al caer la nuez y al cascarse
    const hitF=te>=TB?hitE(te-TB,10):0;
    target.position.x=3.4+0.12*hitE(ia,6);
    target.scale.set(1+0.1*hitF+0.12*hitE(ia,8),1-0.12*hitF-0.15*hitE(ia,8),1+0.1*hitF+0.12*hitE(ia,8));
    emit(target,0.6*hitE(ia,5),1,0.7,0.3);
    if(te<TB){o.g.set(3.32,y,0);o.gs=0.7;o.ga=0.06;o.li=0.9;}
    else{o.g.copy(NC);o.gs=1+1.2*Math.min(Math.max(ia,0),0.5);o.ga=ia>=0?0.15*Math.exp(-ia*8):0.04;o.li=ia>=0?1+3*Math.exp(-ia*5):1;}
    o.ia=ia;o.c.copy(NC);o.shake=0.4;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 4 · PUFF — el lanzador inhala (motas que entran en la boca), se hincha y exhala un chorro de vapor ardiente: nubes
//     melocotón con lenguas de fuego que golpean al rival; humo gris que se queda. La vida robada vuelve en motas
//     rojas al lanzador (drenaje 50 %) con un anillo cálido a sus pies.
// =====================================================================
defs.push({key:"sty_puff",name:"Puff (estilizado)",dur:2.2,ti:0.8,tier:2,pal:"Sty Bestia · Vapor",stylized:true,zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Inhalar",0],["Inflado",0.32],["Exhalar",0.5],["Impacto",0.8],["Humo",1.04],["Drenaje",1.2]],
build(a){
  const L=a.L,TIN=0.32,TX=0.5,TI=0.8,TS=1.04,TD=1.2,TE=2.1;
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.44}), ring=S.groundRing(L.decal,3.0), heal=S.groundRing(L.decal,2.4);
  const scorch=groundPlane(2.0,3.4,0.026,S.mat(POOL_FS('vec3(.18,.08,.04)',.5),{},{mode:'matter'})); L.decal.add(scorch);
  const E0=V3(MO.x+0.25,MO.y-0.02,0), E1=V3(TC.x,TC.y+0.1,0);
  const K=`const float TX=${f(TX)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 E0=${v3(E0)};const vec3 E1=${v3(E1)};const vec3 CB=vec3(-3.7,1.,0.);`;
  // inhalar: motas de aire que entran en la boca
  S.pts(L.part,24,VV+K+`void main(){float life=.22+aSeed.y*.08;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 st=E0+normalize(vec3(.8+r.x,(r.y-.5)*1.4,(r.z-.5)*1.4))*1.5;vec3 p=mix(st,E0,age*age);
   vR=0.;vK=0.;vA=(k>=1.&&uT<.34)?sin(age*3.14159)*.9:0.;put(p,.12+.06*r.z);}`,MOTE_FS,{mode:'energy'});
  // chorro de vapor: nubes melocotón iluminadas que avanzan y se abren
  S.pts(L.part,64,VV+K+`void main(){float s=TX+aSeed.x*(TI-TX+.08);float life=.42+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float kk=clamp(t/.32,0.,1.);vec3 ax=E1-E0;vec3 side=normalize(rnd()*vec3(0.,1.,1.)+vec3(0.,.001,0.));
   vec3 p=E0+ax*(1.-pow(1.-kk,1.6))+side*(.08+.5*kk*aSeed.z)+vec3(0.,.25*t,0.);
   vR=aSeed.w*6.28+t*2.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.5+.26*aSeed.w)*(.55+.9*kk));}`,
   S.MATTER_FS(C.puff,{relief:5,bias:.0,col:'mix(vec3(.95,.42,.18),vec3(.95,.66,.42),step(.55,vMix))'}));
  // lenguas de fuego dentro del chorro
  S.pts(L.part,30,VV+K+`void main(){float s=TX+aSeed.x*(TI-TX);float life=.3+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   float kk=clamp(t/.3,0.,1.);vec3 p=E0+(E1-E0)*kk+rnd()*vec3(.05,.18,.18)*(.4+kk);
   vR=1.5708+(aSeed.z-.5)*.6;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.3+.14*aSeed.w)*(1.-.4*age));}`,FLAME_FS,{mode:'energy'});
  // estallido de vapor en el rival
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.5,.35,0.));vec3 p=E1+d*(.4+1.2*(1.-exp(-t*4.)))+vec3(0.,.4*t,0.);
   vR=aSeed.w*6.28;vK=smoothstep(.35,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.45+.22*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:5,col:'vec3(.95,.62,.4)'}));
  // humo gris que se queda y sube
  S.pts(L.part,14,VV+K+`void main(){float s=TI+.2+aSeed.x*.4;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(3.4,.4,0.)+vec3((aSeed.z-.5)*1.,t*.9+aSeed.w*.6,(aSeed.y-.5)*.8);
   vR=aSeed.w*6.28+t;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.4+.2*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'vec3(.34,.3,.3)'}));
  // drenaje: motas rojas que vuelven al lanzador en arco
  S.pts(L.part,20,VV+K+`void main(){float s=TD+aSeed.x*.25;float life=.42+aSeed.y*.12;float age=clamp((uT-s)/life,0.,1.);
   vec3 a0=E1+rnd()*.3;vec3 p=mix(a0,CB,age*age*(3.-2.*age))+vec3(0.,sin(age*3.14159)*(1.+aSeed.z*.6),(aSeed.w-.5)*1.2*sin(age*3.14159));
   vR=0.;vK=0.;vA=(uT>s&&uT<s+life)?1.:0.;put(p,.2+.08*aSeed.w);}`,
   S.PV+`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;float core=smoothstep(.5,.1,d);
    gl_FragColor=vec4(mix(vec3(1.,.25,.2),vec3(1.4,1.,.8),smoothstep(.25,0.,d))*1.3,core*vA);}`,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TE-0.3,TE,te);
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7;
    // inhalar e hincharse; al exhalar se deshincha
    const inf=ss(0.05,TIN,te)*0.6+ss(TIN,TX,te)*0.4-ss(TX,TI,te)*0.9;
    caster.scale.set(1+0.16*inf,1+0.08*inf,1+0.16*inf); caster.rotation.z=0.08*ss(0,TIN,te)-0.14*ss(TX,TX+0.1,te)*(1-ss(TI,TI+0.2,te));
    spark.pose(ia,E1,1.1);
    ring.pose(ia,3.4,0,0.5,1);
    heal.pose(te-TD-0.4,-3.7,0,0.55,0.9);
    set(scorch,-0.1+1.1*ss(TE-0.5,TE,te),ss(TI,TI+0.15,te)*fade);
    target.position.x=3.4+0.22*hitE(ia,5); target.rotation.z=-0.14*hitE(ia,6);
    emit(target,0.7*hitE(ia,5)+0.15*ss(TI,TS,te)*fade,1,0.45,0.15);
    emit(caster,0.5*hitE(te-TD-0.4,4)+0.15*inf,1,0.3,0.2);
    if(te<TX){o.g.copy(E0);o.gs=0.5+0.3*inf;o.ga=0.05;o.li=0.6;}
    else if(te<TI){o.g.lerpVectors(E0,E1,cl((te-TX)/(TI-TX)));o.gs=1;o.ga=0.12;o.li=1.8;}
    else{o.g.copy(E1);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.15*Math.exp(-ia*7);o.li=1+3*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(E1);o.shake=0.3;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 5 · FOXY — el espíritu de un zorro de fuego (cabeza ámbar con hocico crema, orejas de punta oscura) salta del
//     lanzador dejando una espiral de llamas y muerde al rival; luego fuegos fatuos azules lo rodean y revientan.
// =====================================================================
const FOX_FS=SDSEG+`uniform float uEr;uniform float uQ;
float sdf(vec2 p){float fl=styNoise(vec2(p.x*.7,p.y*.6-uT*1.8)).r-.5;
 float head=length((p-vec2(-.02,0.))*vec2(.95,1.25))-.3;
 float snout=sdSeg(p,vec2(.05,-.03),vec2(.44,-.1))-.1+.06*clamp((p.x-.05)/.39,0.,1.);
 vec2 e1=p-vec2(-.18,.2);float ear1=max(abs(e1.x+e1.y*.2)*1.7+e1.y*.5-.15,-e1.y);ear1=max(ear1,e1.y-.38);
 vec2 e2=p-vec2(.07,.22);float ear2=max(abs(e2.x-e2.y*.1)*1.7+e2.y*.5-.15,-e2.y);ear2=max(ear2,e2.y-.38);
 float tx=clamp((-.25-p.x)/.6,0.,1.);float tongue=abs(p.y-.05-sin(p.x*7.+uT*11.)*.09*tx-tx*.18)-.2*(1.-tx)-.02;tongue=max(tongue,max(p.x-(-.15),-p.x-.85));
 float d=min(min(head,snout),min(min(ear1,ear2),tongue));
 return d+fl*.09*(1.+tx);}
void main(){vec2 p=(vUv-.5)*vec2(1.25,1.25);float d=sdf(p);float m=smoothstep(.02,-.02,d);if(m<.01)discard;
 float n=styNoise(vUv*.9-vec2(0.,uT*.6)).r;float er=styErode(n*.55+.45*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float depth=clamp(-d*7.,0.,1.);
 vec3 blue=vec3(.01,.08,.9), amber=vec3(.95,.16,.01)*1.1, hot=vec3(1.25,.42,.04);
 vec3 c=mix(blue,amber,smoothstep(.1,.4,depth));c=mix(c,hot,smoothstep(.75,1.,depth)*.5);
 float lick=smoothstep(.55,.0,abs(fract(p.y*5.-uT*4.+n*2.)-.5))*(1.-depth)*.25;c+=blue*lick;
 float eye=smoothstep(.03,.012,length((p-vec2(.12,.06))*vec2(.7,2.2)))*uQ;c=mix(c,vec3(1.6,1.5,1.2),eye);
 gl_FragColor=vec4(c,a);}`;
// colmillo en media luna (materia marfil con filo)
const FANG_FS=`uniform float uEr;
float sdf(vec2 p){return max(length(p)-.9,-(length(p-vec2(.0,.38))-.82));}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*2.;float d=sdf(p);float tip=smoothstep(.95,.5,abs(p.x));float m=smoothstep(.02,-.02,d)*tip;if(m<.01)discard;
 float er=styErode(styNoise(vUv*.8+uP).r*.5+.5*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());vec3 c=styRampOf(vec3(.95,.9,.78),clamp(.3+.55*l,0.,1.))*styTint(l);
 c=mix(c,styRamp(.85)*1.3,smoothstep(.75,.9,length(p))*.6);gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_foxy",name:"Foxy (estilizado)",dur:1.8,ti:0.42,tier:2,pal:"Sty Bestia · Zorro",stylized:true,zoneCaster:0.4,zoneTarget:1.3,
  phases:[["Acecho",0],["Salto",0.15],["Mordisco",0.42],["Fuegos de zorro",0.6]],
build(a){
  const L=a.L,TJ=0.15,TI=0.42,TW=0.6,TE=1.7;
  const fox=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),S.mat(FOX_FS,{uEr:{value:0},uQ:{value:0}},{mode:'matter'})); L.mesh.add(fox);
  const fangs=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(FANG_FS,{uEr:{value:0}},{mode:'matter',depthTest:false}));m.material.uniforms.uP.value=i*0.5;L.mesh.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.29}), ring=S.groundRing(L.decal,2.8), shadow=S.contactShadow(L.decal,1.2);
  const scorch=groundPlane(1.8,3.4,0.026,S.mat(POOL_FS('vec3(.2,.08,.03)',.45),{},{mode:'matter'})); L.decal.add(scorch);
  const F0=V3(-3.2,1.45,0), F1=V3(2.85,1.4,0.1), BC=V3(3.15,1.35,0.12);
  const K=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TW=${f(TW)};const vec3 F0=${v3(F0)};const vec3 F1=${v3(F1)};const vec3 TP=vec3(3.4,0.,0.);
  vec3 fpath(float k){return mix(F0,F1,k)+vec3(0.,sin(k*3.14159)*.7,0.);}`;
  // espiral de llamas que deja el salto
  S.pts(L.part,40,VV+K+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.28+aSeed.y*.14;float age=(uT-s)/life;
   float k=clamp((s-TJ)/(TI-TJ),0.,1.);float an=k*14.+aSeed.z*.6;vec3 p=fpath(k)+vec3(0.,cos(an),sin(an))*.32+vec3(0.,.15*age,0.);
   vR=1.5708+(aSeed.w-.5)*.5;vK=smoothstep(.2,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.34+.12*aSeed.w)*(1.-.5*age));}`,FLAME_FS,{mode:'energy'});
  // fuegos fatuos: llamas azules que orbitan al rival y revientan hacia fuera
  S.pts(L.part,5,VV+K+`void main(){float ph=aSeed.x*6.2832;float t=max(uT-TW,0.);float an=ph+t*3.2;float rad=.75-.15*sin(t*4.+ph);
   float out_=smoothstep(.75,1.,t);vec3 p=TP+vec3(cos(an)*(rad+out_*1.2),.9+.35*sin(t*5.+ph*2.)+out_*.6,sin(an)*(rad+out_*1.2));
   vR=1.5708;vK=smoothstep(.85,1.05,t);vA=(uT>TW&&t<1.05)?smoothstep(0.,.12,t):0.;put(p,.95+.15*sin(t*12.+ph));}`,
   S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(1.,uv);float m=sh.r;if(m<.01)discard;float er=styErode(m*.6+sh.b*.4,vK*1.05-.05,.12);
    float a=er*vA;if(a<.01)discard;vec3 c=mix(vec3(.02,.12,.9),vec3(.15,.6,1.),m)+vec3(.4,.7,1.)*sh.g*.35;gl_FragColor=vec4(c*1.15,a);}`,{mode:'energy'});
  // chispas azules al reventar los fuegos
  S.pts(L.part,24,VV+K+`void main(){float s=TW+.78+aSeed.x*.1;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=TP+vec3(0.,1.,0.)+normalize(rnd())*(.6+1.4*(1.-exp(-t*5.)));vR=aSeed.z*6.;vK=0.;vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.16+.08*aSeed.w);}`,
   S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(5.,uv);float m=sh.r;if(m<.01)discard;gl_FragColor=vec4(vec3(.35,.8,1.3)*(.6+m),m*vA);}`,{mode:'energy'});
  const fp=V3(0,0,0), fp2=V3(0,0,0);
  const fpath=(k,out)=>out.lerpVectors(F0,F1,k).add(tmp3.set(0,Math.sin(k*Math.PI)*0.7,0));
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(TE-0.3,TE,te);
    resetDummy(caster); resetDummy(target);
    // acecho: el lanzador se agacha; salto: avanza un poco y vuelve
    const crouch=ss(0,TJ,te)*(1-ss(TJ,TJ+0.06,te));
    caster.scale.set(1+0.08*crouch,1-0.12*crouch,1+0.08*crouch);
    caster.position.x=-3.7+0.45*ss(TJ,TI,te)*(1-ss(TI+0.1,TI+0.5,te)); caster.rotation.z=-0.15*ss(TJ,TJ+0.1,te)*(1-ss(TI,TI+0.3,te));
    // cabeza del zorro: brota del lanzador, salta en arco y muerde
    const k=cl((te-TJ)/(TI-TJ)), fk=ss(TJ-0.06,TJ+0.04,te)*(1-ss(TI+0.12,TI+0.3,te));
    fox.visible=fk>0.01; fpath(k,fp); fpath(Math.min(k+0.04,1),fp2);
    towardCam(fox.position,fp,0.15); billboard(fox,te<TI?0.35*Math.sin(k*Math.PI)*-1+0.15:-0.1);
    fox.scale.setScalar(Math.max(1.7+0.45*k+0.2*hitE(ia,10),0.001));
    fox.material.uniforms.uA.value=fk; fox.material.uniforms.uQ.value=te<TI-0.08?ss(TJ,TJ+0.15,te):1-ss(TI-0.08,TI,te);
    fox.material.uniforms.uEr.value=-0.1+1.1*ss(TI+0.12,TI+0.3,te);
    // colmillos: dos medias lunas que se cierran sobre el rival
    for(const [m,s] of [[fangs[0],1],[fangs[1],-1]]){const c=cl((ia+0.06)/0.08);m.visible=ia>=-0.06&&ia<0.3;if(!m.visible)continue;
      towardCam(m.position,tmp.copy(BC).add(tmp2.set(0,s*0.45*(1-c),0)),0.3);billboard(m,s>0?Math.PI:0);
      m.scale.setScalar(1.15);m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*cl((ia-0.08)/0.2);}
    spark.pose(ia,BC,1.1);
    ring.pose(ia,3.4,0,0.5,1);
    shadow.pose(fp.x,0,0.7,fox.visible&&te<TI?0.35:0);
    set(scorch,-0.1+1.1*ss(TE-0.4,TE,te),ss(TI,TI+0.12,te)*fade);
    target.position.x=3.4+0.25*hitE(ia,6); target.rotation.z=-0.16*hitE(ia,6)+0.04*Math.sin(te*20)*ss(TW,TW+0.2,te)*fade;
    target.scale.set(1+0.08*hitE(ia,9),1-0.1*hitE(ia,9),1+0.08*hitE(ia,9));
    emit(target,0.7*hitE(ia,6)+0.22*ss(TW,TW+0.2,te)*fade,0.3,0.6,1);
    if(te<TJ){o.g.copy(F0);o.gs=0.5;o.ga=0.05;o.li=0.6;}
    else if(te<TI){o.g.copy(fp);o.gs=0.9;o.ga=0.1;o.li=1.6;}
    else{o.g.copy(BC);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.15*Math.exp(-ia*8);o.li=1+3*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(BC);o.shake=0.35;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 6 · PLATYPUS (Bing / Pomodoro) — el lanzador golpea el suelo con el pico: salpicadura de agua y una onda que recorre el
//     área (2 casillas); de la onda crece una cúpula baja de panal ámbar (celdas de miel translúcidas, juntas sólidas,
//     luz en bandas) que se sella con un destello y protege; placas hexagonales suben dentro y la cúpula se desmorona.
// =====================================================================
const R_PLATY=1.75;                      // radio de la cúpula: ~1,1 casillas (no tapa al enemigo; el área real la marca el anillo)
// cúpula de panal: uH = altura del corte (crece de 0 a 1), uS = barrido del sellado, uEr erosión
const DOME_FS=`uniform float uH;uniform float uS;uniform float uEr;
vec4 hexCell(vec2 p){const vec2 sc=vec2(1.,1.7320508);vec4 hC=floor(vec4(p,p-vec2(.5,1.))/sc.xyxy)+.5;
 vec4 h=vec4(p-hC.xy*sc,p-(hC.zw+.5)*sc);return dot(h.xy,h.xy)<dot(h.zw,h.zw)?vec4(h.xy,hC.xy):vec4(h.zw,hC.zw+.5);}
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.8660254)),p.x);}
void main(){vec3 q=normalize(vP);float h=q.y;if(h>uH+.001)discard;
 vec2 uvh=vec2(atan(q.z,q.x)*12./6.2832,h*3.6);vec4 hc=hexCell(uvh);float id=fract(sin(dot(hc.zw,vec2(12.9898,78.233)))*43758.5453);
 float seam=smoothstep(.4,.47,hexD(hc.xy));
 vec3 N=normalize(vN);float l=styLight(N,stySunV());float fr=pow(1.-abs(dot(N,normalize(vV))),2.);
 vec3 honey=styRampOf(mix(uC1,uC2,.25+.3*id),clamp(.35+.5*l,0.,1.))*styTint(l);
 vec3 joint=styRampOf(uC2*.75,clamp(.2+.5*l,0.,1.))*styTint(l);
 float edgeTop=smoothstep(uH-.06,uH,h);
 float seal=smoothstep(.12,0.,abs(h-uS))*step(0.,uS);
 vec3 c=mix(honey,joint,seam)+styRamp(.8)*seal*.45+styRamp(.75)*edgeTop*.3;
 float al=mix(.2+.12*fr+.08*id,.9,seam)+seal*.25+edgeTop*.3;
 float er=styErode(styNoise(uvh*.25).r*.6+.4*id,uEr,.1);
 gl_FragColor=vec4(c,clamp(al,0.,1.)*er*uA);}`;
// onda de agua en el suelo: anillo de pincel azul verdoso con espuma; uP = radio relativo de la cresta
const WAVE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=styNoise(vUv*1.5+uT*.1).r;
 float crest=smoothstep(.07,0.,abs(r-uP+(n-.5)*.05));float wake=smoothstep(uP,uP-.25,r)*step(r,uP)*.35;
 float m=crest+wake*n;if(m<.01)discard;vec3 c=mix(vec3(.06,.3,.38),vec3(.3,.62,.66),crest);
 gl_FragColor=vec4(c,m*uA*(1.-smoothstep(.9,1.,r)));}`;
// glifo del suelo: anillo de panal bajo la cúpula (energía suave); uP erosión
const HEXG=`vec4 hexCell(vec2 p){const vec2 sc=vec2(1.,1.7320508);vec4 hC=floor(vec4(p,p-vec2(.5,1.))/sc.xyxy)+.5;
 vec4 h=vec4(p-hC.xy*sc,p-(hC.zw+.5)*sc);return dot(h.xy,h.xy)<dot(h.zw,h.zw)?vec4(h.xy,hC.xy):vec4(h.zw,hC.zw+.5);}
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.8660254)),p.x);}
`;
const FLOOR_FS=HEXG+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float rim=smoothstep(.04,0.,abs(r-.96))+smoothstep(.03,0.,abs(r-.88))*step(.5,fract(an/6.2832*36.));
 vec4 hc=hexCell(p*5.);float cell=smoothstep(.4,.47,hexD(hc.xy))*step(r,.85)*.35;
 float m=max(rim,cell);if(m<.01)discard;float er=styErode(styNoise(vUv).r*.6+.4*m,uP,.12);
 gl_FragColor=vec4(styRamp(.7+.3*rim)*1.1,m*er*uA);}`;
defs.push({key:"sty_platy",name:"Platypus (estilizado)",dur:2.4,ti:0.7,tier:2,pal:"Sty Bestia · Panal",stylized:true,
  phases:[["Pulso",0],["Expansión",0.28],["Sellado",0.7],["Protección",0.95],["Disipación",1.85]],
build(a){
  const L=a.L,TX=0.28,TI=0.7,TP=0.95,TD=1.85,TE=2.3,CX=-3.7;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,64,24,0,Math.PI*2,0,Math.PI/2),
    S.mat(DOME_FS,{uH:{value:0},uS:{value:-1},uEr:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  dome.position.set(CX,0,0); L.mesh.add(dome);
  const wave=groundPlane(R_PLATY*2.2,CX,0.03,S.mat(WAVE_FS,{},{mode:'matter'})); L.decal.add(wave);
  const floor=groundPlane(R_PLATY*2.05,CX,0.025,S.mat(FLOOR_FS,{},{mode:'energy'})); L.decal.add(floor);
  const slap=S.groundRing(L.decal,2.6), seal=S.groundRing(L.decal,R_PLATY*2.3);
  const K=`const float TX=${f(TX)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 DC=vec3(${f(CX)},0.,0.);const float R=${f(R_PLATY)};`;
  // salpicadura del pico: gotas que saltan alrededor del lanzador
  S.pts(L.part,28,VV+K+`void main(){float s=TX-.04+aSeed.x*.05;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=DC+vec3(cos(an)*(.5+1.6*t),.1+2.2*t-5.*t*t,sin(an)*(.5+1.6*t));
   vR=3.14159+an*.1;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;put(p,.2+.08*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'vec3(.3,.72,.8)'}));
  // placas hexagonales de miel que suben dentro de la cúpula
  S.pts(L.part,36,VV+K+`void main(){float life=1.+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rad=sqrt(r.y)*R*.85;float hmax=sqrt(max(1.-rad*rad/(R*R),0.))*R*.62;
   vec3 p=DC+vec3(cos(an)*rad,.1+age*hmax,sin(an)*rad);vR=r.z*6.28+age*2.;vK=smoothstep(.7,1.,age);
   vA=(k>=1.&&uT<TD+.2)?smoothstep(0.,.15,age):0.;put(p,.24+.12*r.z);}`,
   S.PV+`void main(){vec2 q=(styPC()-.5)*2.;vec2 a=abs(q);float hx=max(a.x*.866+a.y*.5,a.y);float m=smoothstep(.82,.76,hx);if(m<.01)discard;
    float er=styErode(styNoise(q*.4+vMix*4.).r*.6+.4*(1.-hx),vK*1.05-.05,.1);float al=m*er*vA;if(al<.01)discard;
    float l=styLight(normalize(vec3(-q*.5,1.)),stySunV());vec3 c=styRampOf(uC1,clamp(.35+.5*l,0.,1.))*styTint(l);
    c=mix(c,styRampOf(uC2,.3),smoothstep(.62,.78,hx));gl_FragColor=vec4(c*1.1,al);}`);
  // destellos de sellado por el borde
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.12;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=DC+vec3(cos(an)*R,.1+t*1.2,sin(an)*R);vR=aSeed.w*6.;vK=0.;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.24+.1*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TX,TX+0.1,te)*(1-ss(TD,TE,te));
    resetDummy(caster); resetDummy(target); caster.position.x=CX;
    // golpe de pico: el lanzador se echa atrás y golpea el suelo
    const rear=ss(0,TX*0.8,te)*(1-ss(TX*0.8,TX,te));
    caster.rotation.z=0.22*rear-0.25*ss(TX*0.85,TX,te)*(1-ss(TX+0.05,TX+0.3,te));
    caster.scale.set(1+0.06*hitE(te-TX,10),1-0.1*hitE(te-TX,10),1+0.06*hitE(te-TX,10));
    slap.pose(te-TX,CX,0,0.4,1);
    // onda de agua que barre el área
    const wk=cl((te-TX)/(TI-TX+0.1)); wave.visible=te>=TX&&wk<1; wave.material.uniforms.uP.value=0.08+0.88*(1-Math.pow(1-wk,2));
    wave.material.uniforms.uA.value=0.85*(1-ss(0.75,1,wk));
    // cúpula: crece desde el suelo siguiendo la onda, se sella con un barrido de luz, se erosiona al final
    const grow=1-Math.pow(1-cl((te-TX)/(TI-TX)),2.2);
    dome.visible=te>=TX&&te<TE; dome.scale.set(R_PLATY*(0.35+0.65*grow),R_PLATY*0.62*(0.35+0.65*grow),R_PLATY*(0.35+0.65*grow));
    const du=dome.material.uniforms; du.uH.value=te<TI?0.05+0.95*grow:1.01; du.uS.value=ia>=0&&ia<0.5?ia*2.4:-1;
    du.uA.value=env*(1+0.15*hitE(ia,6)); du.uEr.value=-0.1+1.1*ss(TD,TE,te);
    set(floor,-0.1+1.1*ss(TD,TE,te),ss(TX+0.15,TI,te)*0.75*env);
    seal.pose(ia,CX,0,0.6,0.95);
    // el lanzador (y los aliados del área) brillan ámbar mientras dura la protección
    const prot=0.22*env+0.45*hitE(ia,5);
    emit(caster,prot);
    o.g.set(CX,1.3,0);o.gs=1.4+2.6*grow;o.ga=te<TI?0.12*ss(0,TX,te):0.05*env+0.3*hitE(ia,7);o.li=1.6*env+4*hitE(ia,4);
    o.ia=ia;o.c.set(CX,1.1,0);o.shake=te>=TX&&te<TX+0.2?0.15:0;o.dist=0.7;o.flash=0;
  };
}});

// =====================================================================
// 7 · CONFIDENT (aliado) — humo violeta de los estados negativos envuelve al aliado; una columna de luz dorada baja de
//     pincel, el humo sale despedido y se erosiona; un emblema solar dorado sobre su cabeza, estrellas de crítico y
//     chevrones rojos (+15 % de crítico).
// =====================================================================
const BEAM_FS=`void main(){float h=vUv.y;float x=abs(vUv.x-.5)*2.;float n=styNoise(vec2(vUv.x*.6,h*.8-uT*1.5)).b;
 float m=smoothstep(.9,.4,x+(n-.5)*.4)*smoothstep(uP-.06,uP+.06,h);if(m<.01)discard;
 gl_FragColor=vec4(styRamp(.35+.45*(1.-x))*.85,m*uA*.8);}`;
// emblema solar: disco dorado iluminado con rayos en bandas
const SUN_FS=`uniform float uEr;
float sdf(vec2 p){float r=length(p);float an=atan(p.y,p.x);float rays=r-(.36+.1*smoothstep(.2,1.,abs(cos(an*6.))));return rays;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.1;float d=sdf(p);float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float er=styErode(styNoise(vUv).r*.5+.5*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float r=length(p);vec3 N=r<.3?normalize(vec3(-p*1.6,1.)):sdfN(p);float l=styLight(N,stySunV());
 vec3 c=styRampOf(vec3(1.,.66,.12),clamp(.3+.55*l,0.,1.))*styTint(l);
 c=mix(c,styRampOf(vec3(.7,.3,.05),.35),smoothstep(.02,0.,abs(r-.3))*.9);
 c+=vec3(1.,.7,.2)*smoothstep(.25,.0,r)*.35;gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_conf",name:"Confident (estilizado)",dur:1.3,ti:0.4,tier:1,pal:"Sty Bestia · Confianza",stylized:true,allies:1,...ZONES,
  phases:[["Debuffs",0],["Descenso",0.15],["Purificación",0.4],["Confianza",0.6],["Fin",1.1]],
build(a){
  const L=a.L,TDs=0.15,TI=0.4,TC2=0.6,TE=1.2,AP=ALLY_POS[0],AH=AP.clone().add(V3(0,1.6,0)),AC=AP.clone().add(V3(0,1.1,0));
  const beam=new THREE.Mesh(new THREE.PlaneGeometry(0.75,7),S.mat(BEAM_FS,{},{mode:'energy',side:THREE.DoubleSide})); L.mesh.add(beam);
  const sun=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),S.mat(SUN_FS,{uEr:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(sun);
  const ring=S.groundRing(L.decal,2.6), roar=ringBill(L.mesh,1.4), flash=S.hitSpark(L.mesh,1.6,{seed:0.83});
  const K=`const float TI=${f(TI)};const float TC2=${f(TC2)};const vec3 AP=${v3(AP)};`;
  // humo violeta oscuro de los estados: remolino que sale despedido al purificar
  S.pts(L.part,26,VV+K+`void main(){float an=aSeed.x*6.2832+uT*(2.+aSeed.y);float rad=.42+aSeed.z*.25;float y=.25+aSeed.w*1.5;
   float t=max(uT-TI,0.);vec3 out_=normalize(vec3(cos(an),.35,sin(an)));vec3 p=AP+vec3(cos(an)*rad,y,sin(an)*rad)+out_*2.2*t;
   vR=aSeed.w*6.28+uT;vK=smoothstep(.0,.38,t);vA=smoothstep(0.,.08,uT)*(t<.4?1.:0.);put(p,(.36+.16*aSeed.y)*(1.+t));}`,
   S.MATTER_FS(C.puff,{relief:4,col:'mix(vec3(.2,.07,.28),vec3(.36,.14,.48),step(.5,vMix))'}));
  // estrellas de crítico doradas
  S.pts(L.part,10,VV+K+`void main(){float s=TI+.05+aSeed.x*.35;float life=.5+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.6,.5+age*1.5,sin(an)*.6);vR=age*4.;vK=smoothstep(.7,1.,age);
   vA=(age>0.&&age<1.)?1.:0.;put(p,(.42+.14*aSeed.w)*sin(min(age*4.,1.)*1.5708));}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  S.pts(L.part,4,VV+K+`void main(){float s=TC2+aSeed.x*.25;float life=.5;float age=(uT-s)/life;
   vec3 p=AP+vec3((aSeed.y-.5)*.5,.6+age*1.1,(aSeed.z-.5)*.5);vR=0.;vK=0.;vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.34);}`,
   CHEVUP_FS('vec3(1.,.35,.12)'),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.12,te)*(1-ss(TE-0.25,TE,te));
    resetDummy(caster); caster.position.x=-3.7;
    caster.rotation.z=0.07*ss(0,TDs,te)-0.14*ss(TDs,TDs+0.08,te)*(1-ss(TI,TI+0.2,te));
    {const p=cl(te/0.25);towardCam(roar.position,tmp.copy(MO).add(tmp2.set(0.25,0,0)),0.2);billboard(roar);roar.visible=p<1;roar.scale.setScalar(0.4+0.8*p);set(roar,-0.1+1.1*p,1);}
    // columna dorada que baja sobre el aliado
    const d=cl((te-TDs+0.05)/(TI-TDs+0.05));
    beam.visible=te>=TDs-0.05&&ia<0.3; beam.position.set(AP.x,3.5,AP.z); beam.rotation.set(0,Math.atan2(camera.position.x-AP.x,camera.position.z-AP.z),0);
    beam.material.uniforms.uP.value=1-d; beam.material.uniforms.uA.value=0.9*(1-cl(ia/0.3));
    flash.pose(ia,AC,1);
    ring.pose(ia,AP.x,AP.z,0.45,1);
    // emblema solar sobre la cabeza
    const sk=ss(TI,TI+0.1,te)*(1-ss(TE-0.25,TE,te));
    sun.visible=sk>0.01; towardCam(sun.position,tmp.copy(AH).add(tmp2.set(0,0.75+0.05*Math.sin(te*4),0)),0.25); billboard(sun,te*0.6);
    sun.scale.setScalar(Math.max(1.5*back(cl(ia/0.2)),0.001)); sun.material.uniforms.uA.value=sk; sun.material.uniforms.uEr.value=-0.1+1.1*ss(TE-0.3,TE,te);
    // aliado: apagado y violeta antes; dorado después
    const al=allies[0];
    if(al){if(ia<0)emit(al,0.25+0.08*Math.sin(te*9),0.4,0.15,0.55);else emit(al,0.3*env+0.7*hitE(ia,7));}
    if(te<TDs){o.g.copy(MO);o.gs=0.5;o.ga=0.06;o.li=0.6;}
    else if(te<TI){o.g.copy(AP).add(tmp.set(0,3.5*(1-d)+0.5,0));o.gs=1;o.ga=0.12;o.li=2;}
    else{o.g.copy(AC);o.gs=1+1.4*Math.min(ia,0.4);o.ga=0.3*Math.exp(-ia*9)+0.05*env;o.li=4*Math.exp(-ia*6)+env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.5;o.flash=0;
  };
}});

VFX.module("Estilizado · Bestia · Boca",defs);
})();

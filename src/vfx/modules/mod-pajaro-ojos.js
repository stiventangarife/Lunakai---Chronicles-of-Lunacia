// =====================================================================
// MÓDULO · CLASE PÁJARO (OJOS)
// Estética de clase: plumas, viento, luz de cielo y vuelo. No se dibujan ojos ni alas del Axie: las miradas
// nacen de la zona de los ojos (≈ x −3.47, y 1.66) como haces, lentes y retículas de luz; las aves invocadas
// (gorrión, petirrojo) son espíritus en billboard SDF, no anatomía.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,v3,STAR4_FS,FLAME_FS,billboard,towardCam}=VFX.lib;

const TC=V3(3.15,1.2,0), HD=V3(3.25,1.66,0), EYE=V3(-3.47,1.66,0);
const tmp=V3(0,0,0), tA=V3(0,0,0), tB=V3(0,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const bez=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
// tubo cuyo uv.x es exactamente el parámetro de fn: la cabeza de la estela queda sincronizada con el tiempo
function paramTube(fn,n,rs,r0,r1){
  const pos=[],nor=[],uv=[],idx=[],c=V3(0,0,0),c2=V3(0,0,0),T=V3(0,0,0),N=V3(0,0,0),B=V3(0,0,0),Z=V3(0,0,1);
  for(let i=0;i<=n;i++){const t=i/n;fn(t,c);
    if(i<n){fn(t+1/n,c2);T.subVectors(c2,c);}else{fn(t-1/n,c2);T.subVectors(c,c2);}T.normalize();
    N.crossVectors(T,Z);if(N.lengthSq()<1e-6)N.set(0,1,0);N.normalize();B.crossVectors(T,N).normalize();const r=r0+(r1-r0)*t;
    for(let j=0;j<=rs;j++){const an=j/rs*Math.PI*2,cs=Math.cos(an),sn=Math.sin(an),nx=N.x*cs+B.x*sn,ny=N.y*cs+B.y*sn,nz=N.z*cs+B.z*sn;
      pos.push(c.x+nx*r,c.y+ny*r,c.z+nz*r);nor.push(nx,ny,nz);uv.push(t,j/rs);}}
  for(let i=0;i<n;i++)for(let j=0;j<rs;j++){const p=i*(rs+1)+j,q=p+rs+1;idx.push(p,q,p+1,q,q+1,p+1);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
}

// ---------- fragmentos del módulo ----------
// pluma: cálamo desnudo en la base, plumón, raquis curvo y vexilo asimétrico (estrecho/ancho) con barbas oblicuas
// hacia la punta y algunas separaciones; base a la izquierda (x−), punta a la derecha (x+), q en −.5..+.5
const FEATHER_GLSL=`float feather(vec2 q,out float rach){
 float u=(q.x+.47)/.94;rach=0.;if(u<0.||u>1.)return 0.;
 float y=q.y-.07*u*u+.02*u;float ay=abs(y);
 float t=clamp((u-.13)/.87,0.,1.);float prof=pow(sin(3.14159*pow(t,.7)),.75);
 float w=(y>0.?.2:.12)*prof;
 float vane=smoothstep(w,w-.022,ay)*step(.13,u);
 float k=ay/max(w,.001);
 float ph=(u*1.15-ay*1.7)*58.;float barb=1.-.17*(.5+.5*sin(ph))*clamp(1.-fwidth(ph)*.45,0.,1.);
 float n=fract((u-ay*1.45)*2.6+.35);float split=mix(1.,smoothstep(0.,.05,n)*smoothstep(1.,.95,n),step(.5,k)*step(0.,y));
 float shade=.7+.3*(1.-k*k)-.12*smoothstep(.75,1.,u);
 float fl=noise(vec3(q*34.,2.));float fluff=smoothstep(.15+.07*fl,.0,ay)*smoothstep(.04,.12,u)*smoothstep(.3,.15,u)*(.45+.4*fl);
 rach=smoothstep(.017*(1.-.55*u)+.002,.002,ay)*step(.0,u)*step(u,.97);
 return max(max(vane*barb*split*shade,fluff),rach);}`;
const FEATHER_FS=(col,mul,nb)=>HEAD+FEATHER_GLSL+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 q.y/=max(abs(cos(vR*1.3+vMix*5.)),.58);float r;float m=feather(q,r);
 float a=m*vA*.92;if(a<.003)discard;float u=(q.x+.47)/.94;
 gl_FragColor=vec4((${col})*${f(mul)}+vec3(1.)*r*${nb?".12":".4"},a);}`;
const FCOL="mix(uC2,uC1,.15+.45*vMix+.45*u)";
// haz de mirada: visible entre uQ y uP, rayado que corre y pulso brillante en uR
const GAZE_FS=`uniform float uQ;uniform float uR;
void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float c=abs(dot(normalize(vN),normalize(vV)));
 float dash=.55+.45*step(.45,fract(u*36.-uT*5.));float pulse=exp(-abs(u-uR)*28.);
 float head=smoothstep(.06,0.,uP-u)*step(uP,.995);
 gl_FragColor=vec4(mix(uC2,uC1,.4+.6*max(pulse,head))*1.5+vec3(1.)*(pulse+head)*.7,(c*c*.7*dash+(pulse+head)*c*1.4)*uA);}`;
const WIND_FS=`uniform float uQ;
void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP||u<uQ)discard;
 float st=noise(vec3(u*14.-uT*8.,vUv.y*5.,0.))*.6+noise(vec3(u*31.-uT*13.,vUv.y*11.,3.))*.4;
 float k=smoothstep(uQ,uQ+.12,u)*smoothstep(uP,uP-.06,u);
 float al=smoothstep(1.,.15,v)*(.18+.9*smoothstep(.45,.8,st))*k*uA;
 gl_FragColor=vec4(mix(uC2,uC1,st)*1.5,al);}`;
// lente: dos anillos con marcas de graduación que giran (uP = giro)
const LENS_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float ring=band(r,.9,.035)+band(r,.7,.02)*.7;
 float tick=step(.72,r)*step(r,.87)*step(fract(an/6.2832*24.+uP),.12)+step(.72,r)*step(r,.95)*step(fract(an/6.2832*4.+uP*.5),.02)*1.5;
 float inner=smoothstep(.72,0.,r)*.12;
 gl_FragColor=vec4(mix(uC2,uC1,.5+.5*ring)*1.5,(ring+tick*.6+inner)*uA);}`;
// silueta de ave vista de frente (igual que en Orejas): fl ala, sp apertura, tf cola, tu penachos, hs cabeza
const BIRD_GLSL=`float sdTap(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdEl(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
float bird(vec2 p,float fl,float sp,float tf,float tu,float hs){vec2 q=vec2(abs(p.x),p.y);
 float d=smin(sdEl(q-vec2(0.,-.06),vec2(.16,.25)),length(q-vec2(0.,.22))-hs,.07);
 d=min(d,sdTap(q,vec2(.07,.3),vec2(.14,.3+.16*tu),.045,.0)+(1.-step(.01,tu)));
 d=smin(d,sdTap(q,vec2(0.,-.22),vec2(.05+.09*tf,-.47-.03*tf),.06,.025),.04);
 vec2 R=vec2(.11,.07);
 for(int i=0;i<4;i++){float fi=float(i);float an=mix(-1.75-fi*.1,fl+.3-fi*.26,sp);float L=mix(.26,.56-fi*.05,sp);
  d=smin(d,sdTap(q,R,R+vec2(cos(an),sin(an))*L,.085-fi*.012,.016),.035);}
 return d;}`;

// =====================================================================
// 1 · LITTLE OWL (EYES) — halo azul en la mirada; lentes telescópicas se despliegan y el haz se curva POR ENCIMA
//     (fuera de la línea de visión) hasta la cabeza del rival; la lente de destino enfoca y un pulso de luz recorre
//     el haz y golpea (nivel 2)
// =====================================================================
const owlEye={key:"bjLittleOwl",name:"Little Owl (Eyes)",pa:2,dur:2.0,ti:0.92,pal:"Loto",
  phases:[["Halo",0],["Telescopio",0.18],["Enfoque",0.55],["Disparo",0.78],["Impacto",0.92],["Fin",1.45]],
build(a){
  const L=a.L,TT=0.18,TG=0.25,TGE=0.55,TP=0.78,TI=0.92,TE=1.45,AH=2.5,E0=V3(-3.35,1.68,0);
  const gp=(k,o)=>o.set(E0.x+(HD.x-E0.x)*k,E0.y+(HD.y-E0.y)*k+AH*4*k*(1-k),0.25*Math.sin(Math.PI*k));
  const beam=new THREE.Mesh(paramTube(gp,120,8,0.035,0.035),fxU(GAZE_FS,{uQ:{value:0},uR:{value:-1}})); L.trail.add(beam);
  const eyeLens=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),fx(LENS_FS)), tgtLens=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(LENS_FS));
  // segmentos del telescopio a lo largo del arranque del haz
  const KS=[0.035,0.07,0.105,0.14], tele=KS.map(()=>new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(LENS_FS)));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS)); L.mesh.add(eyeLens,tgtLens,hitRing,...tele);
  const gl=groundPlane(2.4,3.4,0.02,fx(LENS_FS)), shock=groundPlane(3,3.4,0.03,fx(RING_FS)); L.decal.add(gl,shock);

  const C=`varying float vR;const float TT=${f(TT)};const float TG=${f(TG)};const float TGE=${f(TGE)};const float TP=${f(TP)};const float TI=${f(TI)};
  const vec3 E0=${v3(E0)};const vec3 H=${v3(HD)};
  vec3 gp(float k){return vec3(E0.x+(H.x-E0.x)*k,E0.y+(H.y-E0.y)*k+${f(AH)}*4.*k*(1.-k),.25*sin(3.14159*k));}`;
  // motas azules que convergen en el halo de la mirada
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*.18;float life=.18;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(E0+normalize(rnd())*.6,E0+rnd()*.05,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.w);}`);
  // polvo luminoso que queda a lo largo del haz cuando la cabeza pasa
  a.count+=points(L.part,150,C+`void main(){float k=aSeed.x;float s=TG+k*(TGE-TG);float life=.5+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=gp(k)+rnd()*.08+vec3(0.,-.15*t,0.)+rnd()*.15*t;vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.025+.03*aSeed.w);}`);
  // chispas que viajan con el pulso
  a.count+=points(L.part,100,C+`void main(){float s=TP+aSeed.x*(TI-TP);float k=(s-TP)/(TI-TP);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=gp(k)+rnd()*(.05+.4*t);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.04*aSeed.w)*(1.-age*.5));}`);
  // impacto: plumas de luz azul y destellos
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.45,.15,0.))*(2.+3.5*aSeed.z);vec3 p=H+v*(1.-exp(-t*3.5))/3.5+vec3(0.,-.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.15+.07*aSeed.w)*2.1);vR=aSeed.w*6.2832+t*(4.+5.*aSeed.y);vMix=aSeed.y;}`,FEATHER_FS(FCOL,1.4));
  a.count+=points(L.part,50,C+`void main(){float env=smoothstep(TGE-.05,TI,uT)*(1.-smoothstep(TI+.1,TI+.45,uT));
   float an=aSeed.x*6.2832+uT*(4.+2.*aSeed.y);float r=mix(.75,.38,smoothstep(TGE,TP,uT))*(.9+.2*aSeed.z);
   vec3 p=H+vec3(cos(an)*r,sin(an)*r,.2);vA=env;put(p,.03+.025*aSeed.w);}`,STAR4_FS);
  a.count+=sparks(L.part,90,TI,`${f(HD.x)},${f(HD.y)},0.`,"0.4,.1,0.",3,8,2.2);

  a.pose=function(te,o){
    const ia=te-TI, hl=ss(0,TT,te)*(1-ss(TGE+0.1,TP+0.1,te));
    towardCam(eyeLens.position,E0,0.25); billboard(eyeLens); eyeLens.visible=hl>0.001; eyeLens.scale.setScalar(0.6+0.4*ss(0,TT,te)); set(eyeLens,te*1.5,hl);
    tele.forEach((m,i)=>{const t0=TT+i*0.04,on=ss(t0,t0+0.08,te)*(1-ss(TGE+0.05,TP,te));gp(KS[i],tmp);m.position.copy(tmp);billboard(m);
      m.visible=on>0.001;m.scale.setScalar(Math.max((0.55-0.06*i)*(0.5+0.5*ss(t0,t0+0.08,te)),0.001));set(m,-te*(1+i*0.4),on*0.85);});
    const bu=beam.material.uniforms; beam.visible=te>TG&&ia<0.5;
    bu.uP.value=ss(TG,TGE,te)*1.01; bu.uQ.value=ia>0?cl(ia/0.4):0; bu.uR.value=te>=TP?cl((te-TP)/(TI-TP))*1.02:-1; bu.uA.value=0.85*(ia>0?1-cl(ia/0.5):1);
    // lente de destino: aparece grande y se enfoca (se cierra) hasta el disparo
    const lt=ss(TGE-0.08,TGE+0.05,te)*(1-ss(TI+0.15,TE,te));
    towardCam(tgtLens.position,HD,0.45); billboard(tgtLens); tgtLens.visible=lt>0.001;
    tgtLens.scale.setScalar(Math.max(1.6-0.85*ss(TGE,TP,te)+0.3*hitK(ia,8),0.001)); set(tgtLens,te*2,lt*(1+hitK(ia,6)));
    let p=cl(ia/0.35); towardCam(hitRing.position,HD,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(gl,-te,lt*0.6); p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    caster.rotation.z=-0.06*ss(0,TT,te)*(1-ss(TI,TI+0.3,te));
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.2*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.22*Math.cos(ia*12);
    if(te<TG){o.g.copy(E0);o.gs=0.6;o.ga=0.3*hl;o.li=1.6*hl;}
    else if(te<TP){gp(ss(TG,TGE,te),o.g);o.gs=0.8;o.ga=0.3;o.li=2.2;}
    else if(te<TI){gp((te-TP)/(TI-TP),o.g);o.gs=1.1;o.ga=0.5;o.li=4;}
    else{o.g.copy(HD);o.gs=1.2+2.5*Math.min(ia,0.5);o.ga=0.7*Math.exp(-ia*9);o.li=6.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HD);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 2 · LUCAS — mirada de halcón: destello en la mirada, dos hilos dorados rectos atraviesan todo hasta el rival y
//     una retícula dorada se cierra y se fija sobre él (nivel 1: rápido, pequeño, sin marca de suelo)
// =====================================================================
const lucas={key:"bjLucas",name:"Lucas",pa:1,dur:1.2,ti:0.36,pal:"Dorado",
  phases:[["Destello",0],["Mirada",0.08],["Retícula",0.2],["Fijado",0.36],["Fin",0.85]],
build(a){
  const L=a.L,TG=0.08,TGE=0.24,TI=0.36,TE=0.95;
  const E=[V3(-3.36,1.67,0.1),V3(-3.36,1.67,-0.1)];
  const lines=E.map(e=>{const m=new THREE.Mesh(paramTube((k,o)=>o.lerpVectors(e,TC,k),40,6,0.012,0.012),fxU(GAZE_FS,{uQ:{value:0},uR:{value:-1}}));L.trail.add(m);return m;});
  // destello de la mirada: estrella de cuatro puntas alargada en horizontal
  const glint=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float h=exp(-abs(p.y)*30.)*exp(-abs(p.x)*2.5);float v=exp(-abs(p.x)*30.)*exp(-abs(p.y)*4.);float c=smoothstep(.25,0.,length(p));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.8,(h+v*.6+c)*uA);}`,{depthTest:false}));
  // retícula: corchetes de esquina que se cierran (uQ) y giran (uP), círculo, cruz y punto
  const ret=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float c=cos(uP),s=sin(uP);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);vec2 q=abs(p);float o=mix(.95,.62,uQ);
   float br=smoothstep(.035,.015,abs(q.x-o))*step(o-.28,q.y)*step(q.y,o+.03)+smoothstep(.035,.015,abs(q.y-o))*step(o-.28,q.x)*step(q.x,o+.03);
   float circ=band(length(p),.42,.02);
   float cr=smoothstep(.02,.0,q.x)*step(.12,q.y)*step(q.y,.34)+smoothstep(.02,.0,q.y)*step(.12,q.x)*step(q.x,.34);
   float dt=smoothstep(.06,.03,length(p));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.6,(min(br,1.)+circ*.8+cr+dt)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  L.mesh.add(glint,ret);

  const C=`const float TG=${f(TG)};const float TGE=${f(TGE)};const float TI=${f(TI)};const vec3 E0=${v3(E[0])};const vec3 T=${v3(TC)};`;
  // motas doradas que corren por los hilos
  a.count+=points(L.part,70,C+`void main(){float k=aSeed.x;float s=TG+k*(TGE-TG);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=mix(E0+vec3(0.,0.,-.2*step(.5,aSeed.z)),T,k)+rnd()*(.02+.15*t);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.025+.025*aSeed.w);}`);
  // polvo que gira en la retícula y se fija
  a.count+=points(L.part,50,C+`void main(){float env=smoothstep(TGE-.05,TI,uT)*(1.-smoothstep(.7,.95,uT));
   float an=aSeed.x*6.2832+uT*(5.-3.*smoothstep(TI-.05,TI+.05,uT));float r=mix(.6,.32,smoothstep(TGE,TI,uT))*(.9+.2*aSeed.z);
   vec3 p=T+vec3(cos(an)*r,sin(an)*r,.3);vA=env;put(p,.025+.02*aSeed.w);}`);
  a.count+=points(L.part,20,C+`void main(){float s=aSeed.x*.1;float life=.12;float age=(uT-s)/life;
   vec3 p=E0+vec3(.05,0.,-.1)+rnd()*vec3(.08,.08,.12);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.05+.04*aSeed.w);}`,STAR4_FS);
  a.count+=sparks(L.part,60,TI,`${f(TC.x)},${f(TC.y)},.3`,"0.,0.,0.",1.5,4.5,0.8);

  a.pose=function(te,o){
    const ia=te-TI, gk=ss(TG,TGE,te), la=te>TG?1-ss(TI+0.05,TI+0.3,te):0;
    for(const m of lines){m.visible=la>0.001;const u=m.material.uniforms;u.uP.value=gk*1.01;u.uQ.value=ss(TI,TI+0.25,te);u.uR.value=-1;u.uA.value=la;}
    const gg=Math.sin(Math.PI*cl(te/0.16));
    towardCam(glint.position,tmp.set(-3.4,1.67,0),0.3); billboard(glint); glint.visible=gg>0.001; glint.scale.setScalar(0.6+0.6*gg); set(glint,0,gg);
    const ro=ss(TG+0.06,TGE,te)*(1-ss(0.75,TE,te));
    towardCam(ret.position,TC,0.5); billboard(ret); ret.visible=ro>0.001;
    ret.scale.setScalar(Math.max(1+0.15*hitK(ia,14),0.001)); ret.material.uniforms.uQ.value=ss(TGE-0.04,TI,te);
    set(ret,0.785*(1-ss(TG,TI,te)),ro*(0.85+0.6*hitK(ia,8)));
    caster.rotation.z=-0.05*ss(0,TG,te)*(1-ss(TI,TI+0.3,te));
    target.rotation.z=-hitK(ia,10)*0.05*Math.cos(ia*30);
    o.em=0.25*ro; o.emc.copy(U.uC1.value);
    if(te<TGE){o.g.set(-3.4,1.67,0.1);o.gs=0.5;o.ga=0.3*gg+0.1;o.li=1.5;}
    else{o.g.copy(TC);o.gs=0.8+1.2*hitK(ia,6);o.ga=0.2+0.4*hitK(ia,8);o.li=1.5+3*hitK(ia,6);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.3;o.flash=0.4;
  };
}};

// =====================================================================
// 3 · CONCENTRATE — un haz de sol baja del cielo y se estrecha hasta enfocarse en la mirada del pájaro; destello
//     de foco y plumas doradas que flotan a su alrededor con chispas de crítico (nivel 2, apoyo propio)
// =====================================================================
const conc={key:"bjConcentrate",name:"Concentrate",pa:2,dur:2.2,ti:0.8,pal:"Celestial",
  phases:[["Claro",0],["Haz",0.2],["Foco",0.8],["Plumas",1.0],["Fin",1.8]],
build(a){
  const L=a.L,TB=0.2,TI=0.8,TE=1.95,CX=-3.7,SK=V3(-2.2,7.6,1.0),FP=V3(-3.42,1.68,0.05);
  const dir=V3(0,0,0).subVectors(FP,SK), BL=dir.length(); dir.normalize();
  // haz: cono abierto con el vértice en la mirada; se revela desde el cielo (uP) y se estrecha (escala radial)
  const beam=new THREE.Mesh(new THREE.ConeGeometry(1.25,BL,40,1,true),fx(`void main(){float h=.5+vP.y/${f(BL)};if(h>uP)discard;
   float an=atan(vP.z,vP.x);float st=noise(vec3(an*5.,h*7.-uT*3.,0.))*.6+noise(vec3(an*11.,h*15.-uT*5.,4.))*.4;
   float c=abs(dot(normalize(vN),normalize(vV)));float front=smoothstep(uP,uP-.08,h);
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*h)*1.3+vec3(1.)*pow(h,6.)*.6,(c*.18+smoothstep(.5,.85,st)*.22)*(.35+.65*h)*front*uA);}`));
  beam.position.copy(SK).addScaledVector(dir,BL/2); beam.quaternion.setFromUnitVectors(YA,dir);   // vértice (+y) en la mirada L.mesh.add(beam);
  // destello del foco: seis rayos y anillo
  const flare=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uP;
   float rays=pow(abs(cos(an*3.)),40.)*smoothstep(1.,.05,r);float core=smoothstep(.22,0.,r);float ring=band(r,.55,.03)*.6;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.7,(rays+core+ring)*uA);}`,{depthTest:false})); L.mesh.add(flare);
  // espiral de luz que sube tras el foco
  const spMat=fxU(WIND_FS,{uQ:{value:0}}), spiral=new THREE.Mesh(helixGeo(2.2,0.72,0.42,2.0,0.1,100),spMat); spiral.position.set(CX,0.02,0); L.trail.add(spiral);
  const spot=groundPlane(2.6,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float ca=pow(abs(sin(noise(vec3(p*4.,uT*.8))*9.)),8.);float m=smoothstep(1.,.3,r);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*ca)*1.2,(m*.3+ca*m*.35)*uA);}`)); L.decal.add(spot);

  const C=`varying float vR;const float TB=${f(TB)};const float TI=${f(TI)};const float TE=${f(TE)};const float CX=${f(CX)};
  const vec3 SK=${v3(SK)};const vec3 FP=${v3(FP)};`;
  // polvo de luz que desciende dentro del haz
  a.count+=points(L.part,120,C+`void main(){float env=smoothstep(TB,TB+.2,uT)*(1.-smoothstep(TI+.1,TI+.4,uT));
   float c=uT*.9+aSeed.x;float k=fract(c);vec3 r=rr(floor(c));float foc=mix(1.,.3,smoothstep(TB,TI,uT));
   vec3 ax=mix(SK,FP,k);float an=r.x*6.2832;vec3 p=ax+vec3(cos(an),0.,sin(an))*(1.-k)*1.1*foc*sqrt(r.y);
   vA=env*sin(k*3.14159)*.8;put(p,.03+.03*r.z);}`);
  a.count+=sparks(L.part,60,TI,`${f(FP.x)},${f(FP.y)},.1`,"0.,0.,0.",1.5,5,1);
  // plumas doradas que flotan en espiral alrededor del Axie
  a.count+=points(L.part,90,C+`void main(){float s=TI-.05+aSeed.x*.35;float t=max(uT-s,0.);float env=step(s,uT)*smoothstep(0.,.15,t)*(1.-smoothstep(TE-.4,TE,uT));
   float an=aSeed.y*6.2832+t*(1.6+.8*aSeed.z);float R=.62+.25*aSeed.w;vec3 p=vec3(CX+cos(an)*R,.15+aSeed.z*.6+t*(.45+.3*aSeed.w),sin(an)*R);
   vA=env*(.75+.25*sin(t*8.+aSeed.x*20.));put(p,(.17+.06*aSeed.w)*2.1);vR=an+1.57+.4*sin(t*3.);vMix=aSeed.z;}`,FEATHER_FS(FCOL,1.5));
  // chispas de crítico que titilan alrededor
  a.count+=points(L.part,60,C+`void main(){float env=smoothstep(TI,TI+.2,uT)*(1.-smoothstep(TE-.4,TE,uT));
   float c=uT*1.7+aSeed.x;float k=fract(c);vec3 r=rr(floor(c));float an=r.x*6.2832;
   vec3 p=vec3(CX+cos(an)*(.5+.5*r.y),.3+r.z*1.8,sin(an)*(.5+.5*r.y));vA=env*sin(k*3.14159);put(p,.06+.06*r.y);}`,STAR4_FS);

  a.pose=function(te,o){
    const ia=te-TI, bv=ss(TB-0.05,TB+0.1,te)*(1-ss(TI+0.05,TI+0.4,te)), foc=1-0.7*ss(TB+0.1,TI,te);
    beam.visible=bv>0.001; beam.scale.set(foc,1,foc); set(beam,ss(TB,TB+0.35,te)*1.02,bv*(0.7+0.5*ss(TB,TI,te)));
    const fl=te>=TI-0.08?ss(TI-0.08,TI,te)*(1-ss(TI+0.15,TI+0.6,te)):0;
    towardCam(flare.position,FP,0.3); billboard(flare); flare.visible=fl>0.001; flare.scale.setScalar(0.5+0.8*fl+0.3*hitK(ia,5)); set(flare,te*0.8,fl);
    const sv=ss(TI,TI+0.2,te)*(1-ss(TE-0.35,TE,te));
    spiral.visible=sv>0.001; spiral.rotation.y=-te*2.5; spMat.uniforms.uP.value=ss(TI,TI+0.4,te)*1.02; spMat.uniforms.uQ.value=ss(1.3,TE,te); spMat.uniforms.uA.value=sv*0.8;
    spot.material.uniforms.uA.value=ss(TB,TI,te)*(1-ss(TE-0.4,TE+0.2,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*ss(TB,TI,te)+0.7*hitK(ia,5)*(ia>=0?1:0)+0.12*sv;
    caster.rotation.z=-0.05*ss(TB,TI,te)*(1-ss(TI+0.3,TE,te)); caster.position.y=0.04*sv*Math.sin(te*3);
    if(te<TI){o.g.copy(FP);o.gs=0.6+0.6*ss(TB,TI,te);o.ga=0.15+0.25*ss(TB,TI,te);o.li=1.5+2.5*ss(TB,TI,te);}
    else{o.g.copy(FP);o.gs=1.2+1.2*hitK(ia,4);o.ga=0.55*Math.exp(-ia*6)+0.12*sv;o.li=5*Math.exp(-ia*4)+1.6*sv;}
    o.ia=ia;o.c.copy(FP);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 4 · PASSION — dos abanicos de plumas en llamas rosas brotan de la espalda, se abren y baten una vez: la batida
//     lanza una ola de calor y plumas encendidas hacia delante y deja un velo de calor rosa como escudo
//     (nivel 1: rápido y pequeño)
// =====================================================================
const passion={key:"bjPassion",name:"Passion",pa:1,dur:1.3,ti:0.34,pal:"Rosa",
  phases:[["Llama",0],["Batida",0.34],["Calor",0.45],["Escudo",0.6],["Fin",1.05]],
build(a){
  const L=a.L,TI=0.34,TE=1.2,CX=-3.7,BK=V3(-3.85,1.3,0);
  const C=`varying float vR;const float TI=${f(TI)};const vec3 BK=${v3(BK)};
  // posición en el abanico: lado s, rayo j (0..1), fila r (0..1); se abre (op) y bate hacia delante (b)
  vec3 fan(float s,float j,float r,float t,out float ph){float op=smoothstep(.02,.24,t);float b=smoothstep(TI-.06,TI+.06,t);
   ph=mix(.9,.2+j*1.35,op)-b*1.1;vec3 d=normalize(vec3(-cos(ph)*(.85-1.5*b),sin(ph),s*(.45+.35*op)));
   return BK+vec3(0.,0.,s*.18)+d*(.18+.5*r)*op;}`;
  const FIRE=FEATHER_FS("mix(uC2,mix(uC1,vec3(1.,.9,.85),.3),.35+.4*vMix+.35*u)",1.5);
  // abanicos de plumas ardientes
  a.count+=points(L.part,100,C+`void main(){float s=aSeed.y>.5?1.:-1.;float j=floor(aSeed.x*7.)/6.;float ph;
   vec3 p=fan(s,j,aSeed.z,uT,ph);float fade=1.-smoothstep(TI+.04,TI+.16,uT);
   vA=smoothstep(.02,.12,uT)*fade;put(p+rnd()*.02,(.12+.04*aSeed.z)*2.1);vR=ph+3.14159;vMix=aSeed.z;}`,FIRE);
  // lenguas de fuego que lamen los abanicos
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.y>.5?1.:-1.;float j=floor(aSeed.x*7.)/6.;float ph;float c=uT*4.+aSeed.w;float k=fract(c);
   vec3 p=fan(s,j,aSeed.z,uT,ph)+vec3(0.,.15*k,0.);vA=smoothstep(.05,.15,uT)*(1.-smoothstep(TI,TI+.12,uT))*sin(k*3.14159);put(p,.1+.05*aSeed.w);}`,FLAME_FS);
  // la batida suelta las plumas encendidas hacia delante; se consumen en el aire
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.y>.5?1.:-1.;float j=floor(aSeed.x*7.)/6.;float ph;vec3 p0=fan(s,j,aSeed.z,TI+.02,ph);
   float st=TI+aSeed.w*.05;float t=max(uT-st,0.);float age=(uT-st)/(.5+.25*aSeed.z);
   vec3 v=vec3(2.6+1.5*aSeed.z,.3+.8*(aSeed.x-.5),s*(.4+.8*aSeed.w));vec3 p=p0+v*(1.-exp(-t*3.5))/3.5+vec3(0.,-.4*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,((.12+.04*aSeed.z)*(1.-.5*age))*2.1);vR=ph+3.14159+t*(4.+4.*aSeed.x)*s;vMix=aSeed.z;}`,FIRE);
  a.count+=points(L.part,60,C+`void main(){float st=TI+aSeed.x*.1;float life=.3+aSeed.y*.25;float age=(uT-st)/life;float t=max(uT-st,0.);
   vec3 v=normalize(rnd()+vec3(1.2,.3,0.))*(1.5+2.5*aSeed.z);vec3 p=BK+vec3(.2,-.2,0.)+v*t+vec3(0.,.6*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.03+.03*aSeed.w);}`);
  // ola de calor: anillo en el suelo y en vertical; velo de calor que envuelve al Axie
  const wave=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS)), ring=groundPlane(2.6,CX,0.03,fx(RING_FS));
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(`void main(){vec3 q=normalize(vP);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float n=noise(vec3(q.x*4.,q.y*3.-uT*3.,q.z*4.))*.6+noise(vec3(q*9.-vec3(0.,uT*5.,0.)))*.4;
   float lick=smoothstep(.45,.8,n)*smoothstep(-.6,.6,q.y);float sweep=band(q.y,1.-uP*2.2,.15)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,lick+fr*.4)*1.5,(fr*.55+lick*.3+sweep*.6)*uA);}`));
  shield.position.set(CX,0.82,0); shield.scale.set(0.62,0.9,0.62);
  L.mesh.add(wave,shield); L.decal.add(ring);

  a.pose=function(te,o){
    const ia=te-TI;
    // postura: se encoge al abrir y se estira en la batida
    caster.rotation.z=0.1*ss(0.05,TI-0.05,te)-0.18*ss(TI-0.05,TI+0.04,te)*(1-ss(TI+0.1,TI+0.4,te));
    caster.scale.set(1,1-0.05*ss(0,TI-0.05,te)*(1-ss(TI-0.05,TI,te)),1);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,TI,te)*(1-ss(TI,TI+0.5,te))+0.15*ss(TI,TI+0.2,te)*(1-ss(0.9,TE,te));
    let p=cl(ia/0.3); towardCam(wave.position,tmp.set(-3.2,1.0,0),0.3); billboard(wave); wave.visible=ia>=0&&p<1; set(wave,p,(1-p)*0.8);
    p=cl(ia/0.4); set(ring,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    const sh=ss(TI+0.05,TI+0.2,te)*(1-ss(0.85,TE,te));
    shield.visible=sh>0.001; set(shield,cl((te-TI-0.05)/0.3),sh*0.85);
    if(te<TI){o.g.set(-3.95,1.5,0);o.gs=0.6+0.6*ss(0,TI,te);o.ga=0.35*ss(0,TI,te);o.li=2.5*ss(0,TI,te);}
    else{o.g.set(-3.6,1.1,0);o.gs=1.0+0.8*hitK(ia,5);o.ga=0.55*Math.exp(-ia*7)+0.1*sh;o.li=5*Math.exp(-ia*5)+1.2*sh;}
    o.ia=ia;o.c.set(-3.4,1.1,0);o.shake=0;o.dist=1;o.flash=0;
  };
}};

// =====================================================================
// 5 · MAVIS — un círculo rúnico bajo el Axie invoca a un gorrión mágico que aparece en un soplo de plumas y
//     revolotea sobre él; su canto es una cinta pautada que baja en espiral: las notas se funden en el Axie
//     (abarata las cartas de pájaro) (nivel 2)
// =====================================================================
const NOTE_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 vec2 h=q-vec2(-.1,-.24);h=vec2(h.x*.85+h.y*.45,-h.x*.45+h.y*.85);float head=length(h*vec2(1.,1.5))-.12;
 float stem=sdSeg(q,vec2(.01,-.22),vec2(.01,.36))-.025;float flag=sdSeg(q,vec2(.01,.36),vec2(.2,.14))-.03;
 float d=min(head,min(stem,flag));float a=(smoothstep(.02,-.01,d)+exp(-max(d,0.)*18.)*.35)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,a);}`;
const SPARROW_FS=BIRD_GLSL+`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;float d=bird(p,uQ,1.,.55,0.,.15);
 float fill=smoothstep(.02,-.03,d);float edge=smoothstep(.04,0.,abs(d));float halo=exp(-max(d,0.)*10.)*.3;
 float sh=noise(vec3(p*7.,uT*2.));float tw=pow(hash(vec3(floor(p*14.),floor(uT*12.))),20.)*fill;
 vec3 c=mix(uC2,uC1,.35+.5*sh)*fill+mix(uC1,vec3(1.),.4)*(edge+halo)+vec3(1.)*tw*2.;
 gl_FragColor=vec4(c*1.35,(fill*.75+edge*.7+halo+tw)*uA);}`;
const mavis={key:"bjMavis",name:"Mavis",pa:2,dur:2.4,ti:0.85,pal:"Estelar",
  phases:[["Invocación",0],["Aparición",0.35],["Canto",0.85],["Melodía",1.25],["Fin",2.0]],
build(a){
  const L=a.L,TA=0.35,TI=0.85,TS=1.6,TE=2.3,CX=-3.7,HP=V3(-3.55,2.55,0.1),HH=2.2,R0=0.85,R1=0.55,TURN=1.6;
  const sp=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.75),fxU(SPARROW_FS,{uQ:{value:0.4}})); L.mesh.add(sp);
  const rings=[0,1,2].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS))); L.mesh.add(...rings);
  // cinta pautada: cinco líneas que bajan en espiral alrededor del Axie (visible de arriba hacia abajo)
  const staff=new THREE.Mesh(helixGeo(TURN,R0,R1,HH,0.24,120),fx(`void main(){float u=vUv.x;if(u<1.-uP)discard;float y=vUv.y;
   float l=0.;for(int i=0;i<5;i++){l+=band(y,.1+.2*float(i),.025);}
   float st=.7+.3*noise(vec3(u*20.+uT*3.,y*3.,0.));float k=smoothstep(1.-uP,1.-uP+.08,u)*smoothstep(0.,.08,u);
   gl_FragColor=vec4(mix(uC2,uC1,l)*1.5,(l*.8+.06)*st*k*uA);}`)); staff.position.set(CX,0.1,0); L.trail.add(staff);
  // círculo de invocación: anillos, seis pétalos-pluma y estrella; se traza en barrido angular (uP)
  const circ=groundPlane(2.0,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);float a01=an/6.2832+.5;
   float rings=band(r,.92,.03)+band(r,.78,.02);float k=fract(a01*6.);float w=.35*(1.-clamp((r-.25)/.5,0.,1.));
   float pet=step(.25,r)*step(r,.74)*smoothstep(w,w-.06,abs(k-.5)*2.)*smoothstep(.2,.3,r);
   float m=(rings+pet*.5)*step(a01,uP)+smoothstep(.2,.0,r)*.4*uP;
   gl_FragColor=vec4(mix(uC2,uC1,rings)*1.4,m*uA);}`)); L.decal.add(circ);

  const C=`varying float vR;const float TA=${f(TA)};const float TI=${f(TI)};const float TS=${f(TS)};const float CX=${f(CX)};const vec3 HP=${v3(HP)};
  vec3 hel(float u){float an=u*${f(TURN)}*6.2832;float r=${f(R0)}+${f(R1-R0)}*u;return vec3(${f(CX)}+cos(an)*r,.1+u*${f(HH)},sin(an)*r);}`;
  // chispas que suben en espiral desde el círculo hasta el punto de aparición
  a.count+=points(L.part,100,C+`void main(){float s=aSeed.x*(TA-.12);float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*5.;float r=mix(.9,.05,k);vec3 p=mix(vec3(CX,.05,0.),HP,k*k)+vec3(cos(an)*r,0.,sin(an)*r);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.035+.03*aSeed.w);}`);
  // soplo de plumas al aparecer
  a.count+=points(L.part,50,C+`void main(){float s=TA+aSeed.x*.04;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd())*(1.5+2.*aSeed.z);vec3 p=HP+v*(1.-exp(-t*4.))/4.+vec3(sin(t*4.+aSeed.w*9.)*.12,-.4*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.05*aSeed.w)*2.1);vR=aSeed.w*6.2832+t*4.;vMix=aSeed.y;}`,FEATHER_FS(FCOL,1.4));
  // notas: nacen en el gorrión, bajan por la cinta y se funden en el Axie
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*(TS-TI);float life=.85;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=age<.12?mix(HP,hel(1.),age/.12):hel(1.-(age-.12)/.88)+vec3(0.,(aSeed.y-.5)*.18,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-smoothstep(.85,1.,age)):0.;put(p,.16+.05*aSeed.z);vR=.3*sin(uT*8.+aSeed.w*9.);}`,NOTE_FS);
  // destellos en la estela de las notas y al fundirse
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*(TS-TI+.5);float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   float u=clamp(1.-(s-TI-aSeed.z*.2)/.9,0.,1.);vec3 p=hel(fract(u+aSeed.w*.3))+rnd()*.08;
   if(aSeed.z>.7)p=vec3(CX,0.,0.)+vec3(cos(aSeed.w*6.28)*.38,.3+aSeed.y*1.,sin(aSeed.w*6.28)*.38);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.05+.04*aSeed.w);}`,STAR4_FS);
  a.count+=points(L.part,40,C+`void main(){float env=smoothstep(TA,TA+.1,uT)*(1.-smoothstep(TS+.3,TS+.6,uT));
   float an=aSeed.x*6.2832+uT*3.;vec3 p=HP+vec3(cos(an)*.35,sin(uT*4.+aSeed.y*9.)*.1-.05,sin(an)*.35);vA=env*.8;put(p,.025+.02*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, ap=ss(TA-0.03,TA+0.12,te)*(1-ss(TE-0.35,TE,te));
    const bob=0.07*Math.sin(te*6)+0.03*Math.sin(te*17);
    sp.visible=ap>0.001; sp.position.set(HP.x+0.08*Math.sin(te*2.3),HP.y+bob,HP.z); billboard(sp,0.12*Math.sin(te*3));
    sp.scale.setScalar(Math.max(ap*(1+0.12*hitK(ia,8)),0.001)); sp.material.uniforms.uQ.value=0.35+0.75*Math.sin(te*38); set(sp,0,ap);
    rings.forEach((m,i)=>{const t=(te-TI-i*0.3)/0.45;m.visible=t>0&&t<1;towardCam(m.position,sp.position,0.1);billboard(m);set(m,cl(t),t>0&&t<1?(1-t)*0.7:0);});
    const sv=ss(TI-0.05,TI+0.1,te)*(1-ss(TS+0.4,TS+0.75,te));
    staff.visible=sv>0.001; set(staff,ss(TI-0.05,TI+0.35,te)*1.02,sv*0.85);
    circ.material.uniforms.uP.value=ss(0,TA,te)*1.01; circ.material.uniforms.uA.value=ss(0,0.08,te)*(1-ss(TA+0.3,TI+0.2,te))+0.3*sv;
    // cada nota que llega enciende un poco al Axie
    let gl=0; for(let i=0;i<5;i++){const t=te-(TI+0.85+i*0.15);gl+=t>=0?Math.exp(-t*9)*0.25:0;}
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*ss(0,TA,te)*(1-ss(TA,TI,te))+gl+0.1*sv;
    caster.rotation.z=0.05*Math.sin(te*5)*sv;
    if(te<TA){o.g.set(CX,0.4+1.6*ss(0,TA,te),0);o.gs=0.8;o.ga=0.25*ss(0,TA,te);o.li=1.6;}
    else{o.g.copy(sp.position);o.gs=0.9+0.8*hitK(ia,5);o.ga=0.25*ap+0.3*hitK(ia,7);o.li=1.5*ap+3*hitK(ia,5);}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 6 · ROBIN — un pequeño petirrojo espectral sale de junto a la mirada, vuela al aliado y se posa en su cabeza;
//     se esponja y de él cae una espiral de plumas verdes que se traban en un escudo de plumaje (nivel 2)
// =====================================================================
const ROBIN_FS=BIRD_GLSL+`uniform float uQ;uniform float uR;
void main(){vec2 p=(vUv-.5)*2.;float d=bird(p,uQ,uR,.5,0.,.16);
 float fill=smoothstep(.02,-.03,d);float edge=smoothstep(.04,0.,abs(d));float halo=exp(-max(d,0.)*10.)*.28;
 float breast=smoothstep(.02,-.04,sdEl(p-vec2(0.,-.03),vec2(.11,.14)))*fill;
 float sc=.75+.25*sin(p.y*28.+abs(p.x)*9.+uT*2.);
 vec3 c=mix(uC2,uC1,.35*sc)*fill*(1.-breast*.7)+vec3(1.,.42,.16)*breast*1.2+mix(uC1,vec3(1.),.35)*(edge+halo);
 gl_FragColor=vec4(c*1.3,(fill*.7+edge*.7+halo)*uA);}`;
const robin={key:"bjRobin",name:"Robin",pa:2,dur:2.4,ti:1.0,pal:"Esmeralda",allies:1,
  phases:[["Llamada",0],["Vuelo",0.15],["Posado",0.72],["Plumas",0.85],["Escudo",1.0],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.15,TP=0.72,TS=0.85,TI=1.0,TX=1.9,TE=2.3,AP=ALLY_POS[0],HT=V3(AP.x,2.02,AP.z),S=V3(-3.55,2.0,0.05),CC=V3(-2.7,3.3,-0.8);
  const rpos=(t,o)=>{if(t<TF)return o.set(S.x,S.y+0.1*ss(0,TF,t),S.z);if(t<TP){bez(S,CC,HT,ss(TF,TP,t),o);return o;}
    const h=t-TP;return o.set(HT.x,HT.y+0.1*Math.max(Math.sin(Math.min(h,0.22)/0.22*Math.PI),0)+0.06*hitK(t-TS,6)*(t>=TS?1:0),HT.z);};
  const bird=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.62),fxU(ROBIN_FS,{uQ:{value:0.4},uR:{value:1}})); L.mesh.add(bird);
  const trail=new THREE.Mesh(paramTube((k,o)=>rpos(TF+k*(TP-TF),o),70,6,0.015,0.03),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float k=(u-uQ)/max(uP-uQ,.001);float c=abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,k)*1.5,c*c*k*uA);}`,{uQ:{value:0}})); L.trail.add(trail);
  // escudo de plumaje: hileras de plumas superpuestas que se cierran de abajo arriba (uP)
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,44,30),fx(`void main(){vec3 q=normalize(vP);float h=q.y*.5+.5;if(h>uP*1.08)discard;
   float row=q.y*6.;float an=atan(q.z,q.x)/6.2832*11.+floor(row)*.5;float u=fract(an)-.5;float v=fract(row);
   float tip=smoothstep(.05,0.,abs(abs(u)*2.-(1.-v)*.95));float rach=smoothstep(.04,0.,abs(u))*v;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float front=band(h,uP*1.08,.05);
   gl_FragColor=vec4(mix(uC2,uC1,tip+fr*.4+front)*1.4,(fr*.45+tip*.45+rach*.15+.06+front*.8)*uA);}`));
  shield.position.set(AP.x,0.85,AP.z); shield.scale.set(0.88,1.2,0.88); L.mesh.add(shield);
  const rose=groundPlane(2.0,AP.x,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float k=fract(an/6.2832*10.);float w=.3*(1.-clamp((r-.45)/.45,0.,1.));
   float pet=step(.45,r)*step(r,.9)*smoothstep(w,w-.06,abs(k-.5)*2.);float m=pet*.6+band(r,.42,.03)+smoothstep(1.,.2,r)*.15;
   gl_FragColor=vec4(mix(uC2,uC1,pet)*1.3,m*uA);}`)); rose.position.z=AP.z; L.decal.add(rose);

  const C=`varying float vR;const float TF=${f(TF)};const float TP=${f(TP)};const float TS=${f(TS)};const float TI=${f(TI)};const float TX=${f(TX)};
  const vec3 S=${v3(S)};const vec3 CC=${v3(CC)};const vec3 HT=${v3(HT)};const vec3 AC=${v3(V3(AP.x,0.85,AP.z))};
  vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
  vec3 rpos(float t){float k=clamp((t-TF)/(TP-TF),0.,1.);return bz(S,CC,HT,k*k*(3.-2.*k));}
  vec3 shell(float an,float h){float y=mix(-1.,1.,h);float r=sqrt(max(1.-y*y,0.));return AC+vec3(cos(an)*r*.88,y*1.2,sin(an)*r*.88);}`;
  // motas de la llamada junto a la mirada
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*(TF-.05);float life=.15;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(S+normalize(rnd())*.45,S,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.025*aSeed.w);}`);
  // estela de motas en el vuelo
  a.count+=points(L.part,100,C+`void main(){float s=TF+aSeed.x*(TP-TF);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=rpos(s)+rnd()*.08+vec3(0.,-.3*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.03*aSeed.w)*(1.-age*.4));}`);
  // espiral de plumas verdes que cae desde el petirrojo y se traba en el escudo
  a.count+=points(L.part,160,C+`void main(){float s=TS+aSeed.x*.1;float t=max(uT-s,0.);float k=clamp(t/.32,0.,1.);float e=1.-pow(1.-k,2.);
   float h=.08+aSeed.z*.84;float an=aSeed.y*6.2832+(1.-e)*5.;vec3 dst=shell(an,h);
   vec3 p=mix(HT+vec3(0.,.05,0.),dst,e)+vec3(0.,sin(k*3.14159)*.25,0.);
   vA=uT>s?1.-smoothstep(TI+.05,TI+.3,uT):0.;put(p,(.17+.06*aSeed.w)*2.1);vR=an*.3+1.57+(1.-e)*6.;vMix=aSeed.z;}`,FEATHER_FS(FCOL,1.4));
  // plumas que rondan el escudo mientras dura
  a.count+=points(L.part,60,C+`void main(){float env=smoothstep(TI,TI+.15,uT)*(1.-smoothstep(TX-.1,TX+.15,uT));
   float an=aSeed.x*6.2832+uT*(1.5+aSeed.y);float h=.15+aSeed.z*.75+.04*sin(uT*3.+aSeed.w*9.);vec3 p=AC+(shell(an,h)-AC)*1.12;
   vA=env*.85;put(p,(.13+.05*aSeed.w)*2.1);vR=an+1.57;vMix=aSeed.z;}`,FEATHER_FS(FCOL,1.3));
  // destellos del sellado
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.12;float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=shell(aSeed.z*6.2832,.1+aSeed.w*.85);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.06+.05*aSeed.y);}`,STAR4_FS);
  // al deshacerse, las plumas caen meciéndose
  a.count+=points(L.part,50,C+`void main(){float s=TX+aSeed.x*.25;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=shell(aSeed.z*6.2832,.3+aSeed.w*.6)+vec3(sin(t*3.5+aSeed.x*9.)*.18,-.9*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;put(p,(.14+.05*aSeed.w)*2.1);vR=sin(t*3.5+aSeed.x*9.)*1.2;vMix=aSeed.z;}`,FEATHER_FS(FCOL,1.2));

  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.02,TF,te), fade=1-ss(TX+0.1,TE,te);
    rpos(te,tmp); const fly=te<TP, sp=fly?1:1-0.85*ss(TP,TP+0.1,te)+0.6*hitK(te-TS,7)*(te>=TS?1:0);
    bird.visible=form*fade>0.001; bird.position.copy(tmp); billboard(bird,fly?-0.12:0.04*Math.sin(te*6));
    bird.scale.setScalar(Math.max(form*(1+0.18*hitK(te-TS,7)*(te>=TS?1:0)),0.001));
    bird.material.uniforms.uQ.value=fly?0.35+0.7*Math.sin(te*32):0.5; bird.material.uniforms.uR.value=cl(sp); set(bird,0,form*fade);
    trail.visible=te>TF&&te<TP+0.3; set(trail,cl((te-TF)/(TP-TF)),0.7*(1-ss(TP,TP+0.3,te))); trail.material.uniforms.uQ.value=cl((te-TF-0.2)/(TP-TF));
    const sv=ss(TS+0.05,TI,te)*(1-ss(TX,TX+0.3,te));
    shield.visible=sv>0.001; set(shield,ss(TS+0.05,TI,te),sv*(0.8+0.6*hitK(ia,6)));
    rose.material.uniforms.uA.value=ss(TS,TI,te)*(1-ss(TX,TE,te))*0.8;
    const am=allies[0].userData.m; am.emissive.copy(U.uC1.value); am.emissiveIntensity=0.15*sv+0.6*hitK(ia,5)*(ia>=0?1:0);
    allies[0].scale.set(1,1+0.04*hitK(te-TP-0.05,8)*(te>TP+0.05?1:0),1);
    caster.rotation.z=0.06*Math.sin(Math.PI*cl(te/0.3));
    if(te<TP){o.g.copy(tmp);o.gs=0.7*form;o.ga=0.25*form;o.li=1.6*form;}
    else if(te<TI){o.g.copy(tmp);o.gs=0.8+0.6*ss(TS,TI,te);o.ga=0.2+0.2*ss(TS,TI,te);o.li=1.6+2*ss(TS,TI,te);}
    else{o.g.set(AP.x,1.0,AP.z);o.gs=1.4+1.5*hitK(ia,4);o.ga=0.5*Math.exp(-ia*7)+0.12*sv;o.li=5*Math.exp(-ia*5)+1.5*sv;}
    o.ia=ia;o.c.set(AP.x,1.0,AP.z);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

VFX.module("Pájaro · Ojos",[owlEye,lucas,conc,passion,mavis,robin]);
})();

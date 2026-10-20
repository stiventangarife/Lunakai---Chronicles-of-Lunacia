// =====================================================================
// MÓDULO · CLASE PÁJARO (OREJAS)
// Estética de clase: plumas rosas y celestes, ráfagas de viento translúcidas, cielo y vuelo.
// No se dibuja anatomía del Axie: los efectos nacen de la zona de las orejas (≈ x −3.72, y 1.84, z ±0.26).
// Las aves (búho, paloma) son espíritus invocados: siluetas SDF en billboard, no partes del cuerpo.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,caster,target,camera}=VFX;
const {NB,v3,STAR4_FS,HEART_FS,CHEVRON_FS,DUST_FS,billboard,towardCam}=VFX.lib;
VFX.palette("Plumaje",["#9fd8ff","#e85fd0"]);   // celeste de cielo + orquídea: las plumas de la clase

const TC=V3(3.15,1.2,0), HD=V3(3.25,1.66,0);          // pecho y cabeza del objetivo
const tmp=V3(0,0,0), tA=V3(0,0,0), tB=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const bez=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const angOf=(fn,t)=>{fn(t+0.01,tA);fn(t-0.01,tB);return Math.atan2(tA.y-tB.y,tA.x-tB.x);};
// tubo cuyo uv.x es EXACTAMENTE el parámetro de fn (no la longitud de arco): la cabeza de la estela queda sincronizada
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
// sprite de pluma que gira (vR); col = color GLSL (puede usar u, vMix), nb = mezcla normal (plumas "físicas")
const FEATHER_FS=(col,mul,nb)=>HEAD+FEATHER_GLSL+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 q.y/=max(abs(cos(vR*1.3+vMix*5.)),.58);float r;float m=feather(q,r);
 float a=m*vA*.92;if(a<.003)discard;float u=(q.x+.47)/.94;
 gl_FragColor=vec4((${col})*${f(mul)}+vec3(1.)*r*${nb?".12":".4"},a);}`;
const FCOL="mix(uC2,uC1,.15+.45*vMix+.45*u)";
const FPLUM="mix(uC2,uC1,step(.5,vMix))*(.75+.4*u)";   // rosa o celeste según la oreja de la que sale
// estela que viaja: visible entre uQ (cola) y uP (cabeza)
const TRAVEL_FS=`uniform float uQ;
void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float k=(u-uQ)/max(uP-uQ,.001);
 float c=abs(dot(normalize(vN),normalize(vV)));float st=.6+.4*noise(vec3(u*40.-uT*12.,vUv.y*6.,1.));
 gl_FragColor=vec4(mix(uC2,uC1,k)*1.5+vec3(1.)*smoothstep(.85,1.,k)*.6,c*c*k*st*uA);}`;
// cinta de viento translúcida (helixGeo): vetas que corren a lo largo; visible entre uQ y uP
const WIND_FS=`uniform float uQ;
void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP||u<uQ)discard;
 float st=noise(vec3(u*14.-uT*8.,vUv.y*5.,0.))*.6+noise(vec3(u*31.-uT*13.,vUv.y*11.,3.))*.4;
 float k=smoothstep(uQ,uQ+.12,u)*smoothstep(uP,uP-.06,u);
 float al=smoothstep(1.,.15,v)*(.18+.9*smoothstep(.45,.8,st))*k*uA;
 gl_FragColor=vec4(mix(uC2,uC1,st)*1.5,al);}`;
// silueta de ave vista de frente: fl = ángulo del ala, sp = apertura (0 plegada), tf = cola, tu = penachos, hs = cabeza
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
// 1 · CURLY — de cada oreja sale un chorro de plumas rizadas (rosas por un lado, celestes por el otro) que viaja
//     en sacacorchos; al llegar forman un torbellino alrededor del rival que se cierra, golpea y despide las plumas
//     en tangente, como si desviara todo lo que entra (nivel 2)
// =====================================================================
const curly={key:"boCurly",name:"Curly",pa:2,dur:2.2,ti:0.88,pal:"Plumaje",
  phases:[["Rizo",0],["Vuelo",0.28],["Torbellino",0.6],["Impacto",0.88],["Dispersión",1.15],["Calma",1.7]],
build(a){
  const L=a.L,TL=0.28,FT=0.32,TW=0.6,TI=0.88,TE=1.7,X=3.4,HW=2.3,E=V3(3.4,2.2,0),SA=V3(-3.72,1.84,0.26),SB=V3(-3.72,1.84,-0.26);
  const cpath=(s,k,o)=>{const S0=s>0?SA:SB,b=4*k*(1-k),r=0.34*Math.sin(Math.PI*k),an=k*Math.PI*6+(s>0?0:Math.PI);
    return o.set(S0.x+(E.x-S0.x)*k,S0.y+(E.y-S0.y)*k+1.2*b+Math.cos(an)*r,S0.z+(E.z-S0.z)*k+Math.sin(an)*r);};
  // estelas en sacacorchos (una por oreja)
  const trails=[1,-1].map(s=>{const m=new THREE.Mesh(paramTube((k,o)=>cpath(s,k,o),110,6,0.028,0.05),fxU(TRAVEL_FS,{uQ:{value:0}}));L.trail.add(m);return m;});
  // torbellino: tres cintas de viento en hélice que se abren hacia arriba + velo de remolino
  const funnel=new THREE.Group(); L.mesh.add(funnel);
  const windMat=fxU(WIND_FS,{uQ:{value:0}});
  for(let i=0;i<3;i++){const r=new THREE.Mesh(helixGeo(1.5,0.78,1.08,HW,0.3,90),windMat);r.rotation.y=i*2.094;funnel.add(r);}
  const veil=new THREE.Mesh(new THREE.CylinderGeometry(0.98,0.62,HW,40,1,true).translate(0,HW/2,0),fx(`
  void main(){float an=atan(vP.z,vP.x);float h=vP.y/${f(HW)};
   float sw=noise(vec3(an*2.+h*7.-uT*9.,h*3.,0.))*.65+noise(vec3(an*5.+h*13.-uT*14.,h*6.,2.))*.35;float st=smoothstep(.5,.85,sw);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3,(fr*.3+st*.28)*smoothstep(0.,.12,h)*smoothstep(1.,.75,h)*uA);}`));
  funnel.add(veil);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS)); L.mesh.add(hitRing);

  const C=`varying float vR;const float TL=${f(TL)};const float FT=${f(FT)};const float TW=${f(TW)};const float TI=${f(TI)};const float X=${f(X)};
  const vec3 E=${v3(E)};const vec3 SA=${v3(SA)};const vec3 SB=${v3(SB)};
  vec3 cpath(float s,float k){vec3 S0=s>0.?SA:SB;float b=4.*k*(1.-k);float r=.34*sin(3.14159*k);float an=k*18.8496+(s>0.?0.:3.14159);
   return S0+(E-S0)*k+vec3(0.,1.2*b+cos(an)*r,sin(an)*r);}
  float wr(float t){return mix(1.,.55,smoothstep(TI-.25,TI,t));}`;
  // rizo inicial: plumas que se enroscan junto a cada oreja
  a.count+=points(L.part,50,C+`void main(){float sd=aSeed.y>.5?1.:-1.;vec3 S0=sd>0.?SA:SB;float k=clamp(uT/TL,0.,1.);
   float an=aSeed.x*6.2832+uT*12.;float r=.32*(1.-k*.7)*(.6+.4*aSeed.z);
   vec3 p=S0+vec3(cos(an)*r,sin(an)*r*.8+.08,sd*.08+sin(an)*r*.3);
   vA=smoothstep(0.,.08,uT)*(1.-smoothstep(TL,TL+.06,uT));put(p,(.12+.05*aSeed.w)*2.1);vR=an+1.57;vMix=aSeed.y;}`,FEATHER_FS(FPLUM,1.4));
  // plumas que viajan en sacacorchos y luego orbitan en el torbellino (más anchas arriba)
  a.count+=points(L.part,200,C+`void main(){float sd=aSeed.y>.5?1.:-1.;float s0=TL+aSeed.x*.2;float k=clamp((uT-s0)/FT,0.,1.);float arr=s0+FT;
   float h0=.15+aSeed.z*2.;float a0=aSeed.w*6.2832;float t=max(uT-arr,0.);
   float an=a0+t*(5.+3.*aSeed.z);float R=wr(uT)*(.7+.18*h0)*(.85+.3*aSeed.w);
   vec3 orb=vec3(X+cos(an)*R,h0+.12*sin(t*4.+a0),sin(an)*R);
   vec3 p=uT<arr?cpath(sd,k)+rnd()*.06:mix(E,orb,smoothstep(0.,.18,t));
   vA=(uT>s0&&uT<TI+.06)?1.:0.;put(p,(.2+.08*aSeed.z)*2.1);vR=aSeed.x*6.2832+uT*(4.+4.*aSeed.z)+an*step(arr,uT);vMix=aSeed.y;}`,FEATHER_FS(FPLUM,1.4));
  // motas de viento dentro del embudo
  a.count+=points(L.part,110,C+`void main(){float env=smoothstep(TW-.1,TW+.05,uT)*(1.-smoothstep(TI,TI+.1,uT));
   float an=aSeed.x*6.2832+uT*(8.+3.*aSeed.y);float h=fract(aSeed.z+uT*.6)*2.3;float R=wr(uT)*(.6+.2*h)*(.8+.4*aSeed.w);
   vec3 p=vec3(X+cos(an)*R,h,sin(an)*R);vA=env*smoothstep(0.,.2,h)*smoothstep(2.3,1.9,h);put(p,.035+.03*aSeed.w);}`);
  // al cerrarse: las plumas salen despedidas en tangente (el torbellino "desvía") y caen planeando
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=(uT-s)/(.8+.5*aSeed.y);
   float an=aSeed.w*6.2832;float h0=.2+aSeed.z*2.;float R=.55*(.7+.18*h0);
   vec3 p0=vec3(X+cos(an)*R,h0,sin(an)*R);vec3 tg=vec3(-sin(an),0.,cos(an));vec3 rd=vec3(cos(an),0.,sin(an));
   vec3 p=p0+(tg*(3.5+2.*aSeed.y)+rd*(1.2+2.*aSeed.x)+vec3(0.,1.2*aSeed.z,0.))*(1.-exp(-t*3.))/3.+vec3(sin(t*3.+an)*.15,-.35*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.2+.08*aSeed.y)*2.1);vR=an+t*(6.+5.*aSeed.z);vMix=aSeed.y;}`,FEATHER_FS(FPLUM,1.4));
  // polvo levantado por el remolino al pie del rival
  a.count+=points(L.part,40,C+`void main(){float s=TW+aSeed.x*(TI-TW+.2);float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*6.;float R=(.5+.6*aSeed.w)*(1.+t*.8);vec3 p=vec3(X+cos(an)*R,.05+.3*t,sin(an)*R);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.22+.18*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,90,TI,`${f(TC.x)},${f(TC.y)},0.`,"0.,.25,0.",3,8,2);

  // suelo: espiral de viento bajo el rival y onda del golpe
  const swirl=groundPlane(3.2,X,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=sin(an*3.+r*9.+uT*10.);float arm=smoothstep(.55,1.,sp)*smoothstep(1.,.3,r)*smoothstep(.05,.25,r);
   gl_FragColor=vec4(mix(uC2,uC1,arm)*1.3,arm*.55*uA);}`));
  const shock=groundPlane(3.6,X,0.03,fx(RING_FS)); L.decal.add(swirl,shock);

  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.08*Math.sin(Math.PI*cl(te/TL))-0.1*ss(TL,TL+0.08,te)*(1-ss(TL+0.1,TL+0.4,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,TL,te)*(1-ss(TL,TL+0.35,te));
    const hk=cl((te-TL)/FT), tk=cl((te-TL-0.14)/FT), tr=te>TL?1-ss(TW+0.05,TW+0.3,te):0;
    for(const m of trails){m.visible=tr>0.001;m.material.uniforms.uP.value=hk;m.material.uniforms.uQ.value=tk;m.material.uniforms.uA.value=tr;}
    // embudo: se forma de abajo arriba, gira, se cierra antes del golpe y se abre al dispersarse
    const fr=te<TI?1-0.45*ss(TI-0.25,TI,te):0.55+1.1*ss(TI,TI+0.45,te), fa=ss(TW-0.12,TW+0.1,te)*(1-ss(TI+0.05,TI+0.45,te));
    funnel.visible=fa>0.001; funnel.position.set(X,0,0); funnel.rotation.y=-te*7; funnel.scale.set(fr,1+0.12*ss(TI,TI+0.4,te),fr);
    windMat.uniforms.uP.value=ss(TW-0.15,TW+0.12,te)*1.02; windMat.uniforms.uQ.value=0.6*ss(TI,TI+0.4,te); windMat.uniforms.uA.value=fa;
    set(veil,0,fa*0.9);
    let p=cl(ia/0.35); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    swirl.material.uniforms.uA.value=ss(TW-0.1,TW+0.1,te)*(1-ss(TI+0.2,TE,te));
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    // rival: el remolino lo eleva y lo hace girar; el golpe lo empuja hacia atrás
    const lift=ss(TW,TI,te)*(1-ss(TI,TI+0.35,te)), hit=hitK(ia,4.5);
    target.position.set(3.4+hit*0.32*(1-Math.exp(-Math.max(ia,0)*20)),0.12*lift,0);
    target.rotation.z=0.06*Math.sin(te*28)*lift-hit*0.22*Math.cos(ia*13);
    if(te<TL){o.g.set(-3.72,1.9,0);o.gs=0.6;o.ga=0.25*ss(0,TL,te);o.li=1.4;}
    else if(te<TW){cpath(1,hk,o.g);o.gs=0.9;o.ga=0.35;o.li=2.4;}
    else if(te<TI){o.g.set(X,1.2,0);o.gs=1.6;o.ga=0.25+0.2*ss(TW,TI,te);o.li=2.5+2*ss(TW,TI,te);}
    else{o.g.copy(TC);o.gs=1.4+3*Math.min(ia,0.5);o.ga=0.7*Math.exp(-ia*9);o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 2 · LITTLE OWL (EAR) — un búho espiritual se condensa sobre las orejas, asciende aleteando y cae en picado con
//     las alas plegadas y los ojos encendidos; golpea la cabeza del rival y deja una marca rúnica que gira (nivel 2)
// =====================================================================
const OWL_FS=BIRD_GLSL+`uniform float uQ;uniform float uR;
void main(){vec2 p=(vUv-.5)*2.;float d=bird(p,uQ,uR,.55,1.,.19);
 float n=noise(vec3(p*5.,uT*1.3));if(n<uP)discard;
 float fill=smoothstep(.02,-.04,d);float edge=smoothstep(.05,0.,abs(d));float halo=exp(-max(d,0.)*14.)*.25;
 vec2 q=vec2(abs(p.x),p.y);float e=length(q-vec2(.075,.24));
 float disc=band(e,.09,.018)*fill;float eye=smoothstep(.045,.0,e);
 float flare=exp(-abs(p.y-.24)*45.)*exp(-abs(p.x)*2.5)*.8;
 float sc=.55+.45*sin(p.y*30.+abs(p.x)*8.+uT*2.);
 float burn=smoothstep(.08,0.,n-uP)*step(.001,uP);
 vec3 c=mix(uC2,uC1,fill*.35*sc+edge+disc)*1.5+vec3(1.)*(eye*2.+flare)+uC1*burn*2.;
 gl_FragColor=vec4(c,(fill*(.28+.22*sc)+edge*1.1+disc+halo+burn+(eye*1.5+flare))*uA);}`;
const owlE={key:"boLittleOwl",name:"Little Owl (Ear)",pa:2,dur:2.2,ti:0.95,pal:"Arcano",
  phases:[["Llamada",0],["Ascenso",0.22],["Picado",0.62],["Marca",0.95],["Disolución",1.3],["Fin",1.85]],
build(a){
  const L=a.L,TA=0.22,TD=0.62,TI=0.95,TF=1.3,TE=1.85;
  const S=V3(-3.62,2.35,0), C1=V3(-3.1,3.7,0.3), A=V3(-1.2,3.9,0.2), C2=V3(1.6,4.1,0.1), H=V3(3.25,1.74,0);
  const opos=(t,o)=>{if(t<TA)return o.set(S.x,S.y+0.12*ss(0,TA,t),S.z);
    if(t<TD){const k=(t-TA)/(TD-TA);bez(S,C1,A,k*(2-k),o);return o;}
    if(t<TI){const k=(t-TD)/(TI-TD);bez(A,C2,H,k*k,o);return o;} return o.copy(H);};
  const mk=()=>new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fxU(OWL_FS,{uQ:{value:0.4},uR:{value:1}}));
  const owl=mk(), echoes=[0,1,2].map(()=>mk()); L.mesh.add(owl,...echoes);
  // marca rúnica sobre la cabeza: anillos, plumas radiales y rombo central que gira
  const sigil=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uP*2.;
   float rings=band(r,.86,.025)+band(r,.6,.018)*.8;float k=fract(an/6.2832*8.);
   float w=.42*(1.-clamp((r-.6)/.26,0.,1.));float tick=step(.6,r)*step(r,.86)*smoothstep(w,w-.08,abs(k-.5)*2.);
   float dm=abs(p.x)+abs(p.y)*1.4;float core=smoothstep(.24,.2,dm)-smoothstep(.13,.09,dm)*.6;
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*core)*1.5,(rings+tick*.55+core)*uA*(.8+.2*sin(uT*14.)));}`,{depthTest:false}));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS)); L.mesh.add(sigil,hitRing);
  // estelas: ascenso tenue y picado intenso, con el parámetro sincronizado al vuelo
  const ascT=new THREE.Mesh(paramTube((k,o)=>opos(TA+k*(TD-TA),o),70,6,0.02,0.04),fxU(TRAVEL_FS,{uQ:{value:0}}));
  const diveT=new THREE.Mesh(paramTube((k,o)=>opos(TD+k*(TI-TD),o),80,8,0.03,0.09),fxU(TRAVEL_FS,{uQ:{value:0}}));
  L.trail.add(ascT,diveT);

  const C=`varying float vR;const float TA=${f(TA)};const float TD=${f(TD)};const float TI=${f(TI)};const float TF=${f(TF)};
  const vec3 S=${v3(S)};const vec3 C1=${v3(C1)};const vec3 A=${v3(A)};const vec3 C2=${v3(C2)};const vec3 H=${v3(H)};
  vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
  vec3 opos(float t){if(t<TA)return S+vec3(0.,.12*smoothstep(0.,TA,t),0.);if(t<TD){float k=(t-TA)/(TD-TA);return bz(S,C1,A,k*(2.-k));}
   if(t<TI){float k=(t-TD)/(TI-TD);return bz(A,C2,H,k*k);}return H;}`;
  // invocación: motas que suben de las orejas y se condensan en el búho
  a.count+=points(L.part,80,C+`void main(){float s=aSeed.x*(TA-.08);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float sd=aSeed.y>.5?1.:-1.;vec3 st=vec3(-3.72,1.84,.26*sd)+rnd()*vec3(.15,.1,.1);
   vec3 p=mix(st,S+rnd()*.25,k*k)+vec3(0.,sin(k*3.14)*.2,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.z);}`);
  // jirones espectrales que deja el vuelo
  a.count+=points(L.part,160,C+`void main(){float s=TA+aSeed.x*(TI-TA);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=opos(s)+rnd()*.14+vec3(0.,.25*t,0.)+rnd()*.3*t;
   vA=(age>0.&&age<1.)?(1.-age)*(s>TD?1.:.55):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.4));}`);
  // plumas sueltas del aleteo (solo en el ascenso)
  a.count+=points(L.part,50,C+`void main(){float s=TA+aSeed.x*(TD-TA);float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=opos(s)+rnd()*.25+vec3(sin(t*3.+aSeed.z*9.)*.25,-.7*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.15+.06*aSeed.w)*2.1);vR=aSeed.z*6.2832+t*3.;vMix=aSeed.w;}`,FEATHER_FS(FCOL,1.3));
  // impacto: estallido de plumas espirituales sobre la cabeza y motas que giran con la marca
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.3,0.))*(2.+3.5*aSeed.z);vec3 p=H+v*(1.-exp(-t*3.5))/3.5+vec3(sin(t*3.+aSeed.w*9.)*.15,-.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.17+.07*aSeed.w)*2.1);vR=aSeed.w*6.2832+t*(4.+5.*aSeed.y);vMix=aSeed.y;}`,FEATHER_FS(FCOL,1.4));
  a.count+=points(L.part,60,C+`void main(){float env=smoothstep(TI,TI+.1,uT)*(1.-smoothstep(TF,TF+.45,uT));
   float an=aSeed.x*6.2832+uT*(3.+2.*aSeed.y);float r=.4+.15*aSeed.z;
   vec3 p=H+vec3(cos(an)*r,sin(an)*r*.35+.05,sin(an)*r);vA=env*(.6+.4*sin(uT*20.+aSeed.w*30.));put(p,.03+.03*aSeed.w);}`);
  a.count+=sparks(L.part,90,TI,`${f(H.x)},${f(H.y)},0.`,"0.4,.3,0.",3,8,2.5);
  const shock=groundPlane(2.8,3.4,0.03,fx(RING_FS)); L.decal.add(shock);

  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.04,TA,te);
    opos(te,tmp);
    // aleteo: ascenso con batidas, picado con alas plegadas, impacto con alas abiertas
    const flap=0.35+0.7*Math.sin(te*24), sp=te<TD?0.35+0.65*form:(te<TI?1-0.85*ss(TD,TD+0.1,te):1), fl=te<TD?flap:(te<TI?0.6:0.95);
    const dir=angOf(opos,Math.min(te,TI-0.011)), ang=te<TA?0:(te<TD?0.35*(dir-Math.PI/2):(dir-Math.PI/2)*ss(TD,TD+0.12,te));
    const dis=ss(TI+0.05,TF,te);
    owl.visible=te>0.02&&dis<0.999; owl.position.copy(tmp); billboard(owl,ang); owl.scale.setScalar(Math.max(form*(te<TI?1:1+0.25*ss(TI,TF,te)),0.001));
    const ou=owl.material.uniforms; ou.uQ.value=fl; ou.uR.value=sp; set(owl,dis,form);
    echoes.forEach((m,i)=>{const t=te-0.045*(i+1);m.visible=te>TD&&te<TI+0.03;opos(t,m.position);billboard(m,ang);
      const u=m.material.uniforms;u.uQ.value=0.6;u.uR.value=sp;set(m,0.15+0.12*i,0.38/(i+1));});
    ascT.visible=te>TA&&te<TD+0.25; set(ascT,cl((te-TA)/(TD-TA)),0.45*(1-ss(TD,TD+0.25,te))); ascT.material.uniforms.uQ.value=cl((te-TA-0.2)/(TD-TA));
    diveT.visible=te>TD&&ia<0.35; set(diveT,cl((te-TD)/(TI-TD)),ia>0?1-cl(ia/0.35):1); diveT.material.uniforms.uQ.value=cl((te-TD-0.16)/(TI-TD));
    // marca: se estampa grande, se reduce y gira, luego se apaga
    const sm=te>=TI?ss(0,0.06,ia)*(1-ss(TF+0.2,TE,te)):0;
    sigil.visible=sm>0.001; towardCam(sigil.position,H,0.45); billboard(sigil); sigil.scale.setScalar(Math.max(0.75+0.6*Math.exp(-Math.max(ia,0)*9),0.001)); set(sigil,ia,sm);
    let p=cl(ia/0.35); towardCam(hitRing.position,H,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    caster.rotation.z=0.07*Math.sin(Math.PI*cl(te/TA));
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.22*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.2*Math.cos(ia*13);
    o.em=sm*0.35; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(tmp);o.gs=0.8+0.5*form;o.ga=0.3*form+0.15*ss(TD,TI,te);o.li=1.5+2.5*ss(TD,TI,te);}
    else{o.g.copy(H);o.gs=1.3+2.5*Math.min(ia,0.5);o.ga=0.7*Math.exp(-ia*9)+0.1*sm;o.li=6.5*Math.exp(-ia*5)+1.2*sm;}
    o.ia=ia;o.c.copy(H);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 3 · PEACE MAKER — una paloma blanca de luz brota de las orejas, planea sobre el rival y, revoloteando en
//     círculo, deja caer un halo que se posa sobre su cabeza: una columna de luz y anillos que bajan por su
//     cuerpo lo "aplastan" (Weak, ataque reducido) (nivel 2)
// =====================================================================
const DOVE_FS=BIRD_GLSL+`uniform float uQ;uniform float uR;
void main(){vec2 p=(vUv-.5)*2.;float d=bird(p,uQ,uR,1.,0.,.12);
 float fill=smoothstep(.02,-.03,d);float edge=smoothstep(.04,0.,abs(d));float halo=exp(-max(d,0.)*10.)*.3;
 float sc=.75+.25*sin(p.y*26.+abs(p.x)*10.);float sh=.8+.2*smoothstep(-.4,.4,p.y);
 vec3 c=mix(uC1,vec3(1.),.6)*fill*sc*sh+mix(uC2,uC1,.4)*(edge+halo)*1.4;
 gl_FragColor=vec4(c*1.25,(fill*.85+edge*.6+halo)*uA);}`;
const peace={key:"boPeaceMaker",name:"Peace Maker (Ear)",pa:2,dur:2.3,ti:0.95,pal:"Plata",
  phases:[["Paloma",0],["Vuelo",0.15],["Revoloteo",0.72],["Halo",0.95],["Debilidad",1.25],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.15,TH=0.72,TDR=0.78,TI=0.95,TX=1.1,TO=1.7,TE=2.2,X=3.4;
  const S=V3(-3.62,2.25,0.2), C1=V3(-0.5,4.1,0.4), P=V3(3.4,3.15,0), XO=V3(6.2,4.8,-1.2), XC=V3(4.6,3.4,-0.6), HX=V3(0,0,0);
  const dpos=(t,o)=>{if(t<TF)return o.set(S.x,S.y+0.15*ss(0,TF,t),S.z);
    if(t<TH){bez(S,C1,P,ss(TF,TH,t),o);return o;}
    if(t<TX){const an=(t-TH)*9;return o.set(P.x+Math.sin(an)*0.4,P.y+0.06*Math.sin(t*20),Math.cos(an)*0.4-0.4);}
    const k=cl((t-TX)/(TO-TX)),an=(TX-TH)*9;HX.set(P.x+Math.sin(an)*0.4,P.y,Math.cos(an)*0.4-0.4);bez(HX,XC,XO,k*k,o);return o;};
  const dove=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fxU(DOVE_FS,{uQ:{value:0.4},uR:{value:1}})); L.mesh.add(dove);
  // halo: aro de luz con destellos que recorren su contorno
  const halo=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.035,10,56),fx(`void main(){float an=atan(vP.y,vP.x);
   float gl=pow(.5+.5*sin(an*6.-uT*8.),6.);float fr=abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.45+.4*gl)*1.6,(.45+.45*fr+gl*.5)*uA);}`)); halo.rotation.x=Math.PI/2; L.mesh.add(halo);
  // columna de luz que presiona hacia abajo y dos anillos que descienden por el cuerpo
  const colH=2.3;
  const column=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.62,colH,36,1,true).translate(0,colH/2,0),fx(`
  void main(){float h=vP.y/${f(colH)};float an=atan(vP.z,vP.x);
   float st=noise(vec3(an*4.,h*5.+uT*5.,0.))*.6+noise(vec3(an*9.,h*11.+uT*8.,3.))*.4;
   float c=abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.4,(c*.25+smoothstep(.55,.85,st)*.35)*smoothstep(1.,.6,h)*smoothstep(0.,.1,h)*uA);}`)); column.position.set(X,0,0);
  const RFS=`void main(){float fr=abs(dot(normalize(vN),normalize(vV)));gl_FragColor=vec4(mix(uC2,uC1,.6)*1.5,(.35+.5*fr)*uA);}`;
  const drops=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.022,8,48),fx(RFS));m.rotation.x=Math.PI/2;return m;});
  L.mesh.add(column,...drops);
  const trail=new THREE.Mesh(paramTube((k,o)=>dpos(TF+k*(TH-TF),o),80,6,0.02,0.035),fxU(TRAVEL_FS,{uQ:{value:0}})); L.trail.add(trail);
  // suelo: disco de luz bajo el rival con el contorno del halo
  const disc=groundPlane(2.2,X,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float m=smoothstep(1.,.2,r)*.35+band(r,.72,.04)*.8+band(r,.55,.02)*.4*(.5+.5*sin(atan(p.y,p.x)*12.+uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,.5)*1.3,m*uA);}`));
  const shock=groundPlane(3.2,X,0.03,fx(RING_FS)); L.decal.add(disc,shock);

  const C=`varying float vR;const float TF=${f(TF)};const float TH=${f(TH)};const float TDR=${f(TDR)};const float TI=${f(TI)};const float TX=${f(TX)};
  const vec3 S=${v3(S)};const vec3 C1=${v3(C1)};const vec3 P=${v3(P)};const float X=${f(X)};
  vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
  vec3 dpos(float t){if(t<TH){float k=clamp((t-TF)/(TH-TF),0.,1.);return bz(S,C1,P,k*k*(3.-2.*k));}
   float an=(min(t,TX)-TH)*9.;return P+vec3(sin(an)*.4,0.,cos(an)*.4-.4);}
  float hy(float t){float k=clamp((t-TDR)/(TI-TDR),0.,1.);return mix(P.y-.15,2.02,k*k);}`;
  // destellos que deja la paloma al volar
  a.count+=points(L.part,100,C+`void main(){float s=TF+aSeed.x*(TX-TF);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dpos(s)+rnd()*.15+vec3(0.,-.35*t,0.);vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.035*aSeed.w)*(1.-age*.4));}`,STAR4_FS);
  // plumas blancas que caen meciéndose (mezcla normal)
  a.count+=points(L.part,70,C+`void main(){float s=TF+aSeed.x*(TX-TF);float life=1.1+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dpos(s)+rnd()*.2+vec3(sin(t*3.5+aSeed.z*9.)*.22,-.75*t,cos(t*2.7+aSeed.w*7.)*.12);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.08,age)*(1.-smoothstep(.7,1.,age)):0.;put(p,(.15+.06*aSeed.w)*2.1);vR=1.2*sin(t*3.5+aSeed.z*9.)+aSeed.x*.8;vMix=aSeed.w;}`,
   FEATHER_FS("mix(vec3(.8,.84,.92),vec3(1.),.5+.4*vMix)",1.,true),NB);
  // purpurina que acompaña al halo en su caída y lo rodea
  a.count+=points(L.part,70,C+`void main(){float s=TDR+aSeed.x*.4;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(X+cos(an)*.4,hy(s),sin(an)*.4)+vec3(0.,-.4*t,0.)+rnd()*.05;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  // motas que bajan dentro de la columna: el peso de la debilidad
  a.count+=points(L.part,110,C+`void main(){float env=smoothstep(TI,TI+.1,uT)*(1.-smoothstep(1.6,1.95,uT));
   float c=uT*1.4+aSeed.x;float k=fract(c);float an=aSeed.y*6.2832;float r=.15+.38*aSeed.z;
   vec3 p=vec3(X+cos(an)*r,2.1*(1.-k),sin(an)*r);vA=env*sin(k*3.14159)*.9;put(p,.035+.03*aSeed.w);}`);
  a.count+=sparks(L.part,60,TI,`${f(X)},2.0,0.`,"0.,-.2,0.",2.5,6,2);

  a.pose=function(te,o){
    const ia=te-TI;
    dpos(te,tmp); const hov=te>=TH&&te<TX, fade=1-ss(TO-0.35,TO,te), form=ss(0.02,TF,te);
    const fl=hov?0.4+0.7*Math.sin(te*34):0.35+0.55*Math.sin(te*15);
    dove.visible=form*fade>0.001; dove.position.copy(tmp); billboard(dove,te<TH?-0.15*Math.sin(Math.PI*cl((te-TF)/(TH-TF))):0.08*Math.sin(te*9));
    dove.scale.setScalar(Math.max(form*(0.8+0.2*fade),0.001)); dove.material.uniforms.uQ.value=fl; dove.material.uniforms.uR.value=1; set(dove,0,form*fade);
    trail.visible=te>TF&&te<TH+0.3; set(trail,cl((te-TF)/(TH-TF)),0.6*(1-ss(TH,TH+0.3,te))); trail.material.uniforms.uQ.value=cl((te-TF-0.2)/(TH-TF));
    // halo: se suelta de la paloma, cae y se asienta sobre la cabeza
    const k=cl((te-TDR)/(TI-TDR)), hy=te<TDR?P.y-0.15:(te<TI?(P.y-0.15)+(2.02-(P.y-0.15))*k*k:2.02+0.03*Math.sin(te*5)), ho=ss(TDR-0.08,TDR,te)*(1-ss(1.85,TE,te));
    halo.visible=ho>0.001; halo.position.set(te<TDR?tmp.x:X,hy,te<TDR?tmp.z:0); halo.scale.setScalar(Math.max(1+0.35*hitK(ia,8)-0.15*ss(TI,TI+0.6,te),0.001));
    halo.material.uniforms.uA.value=ho*(0.8+0.6*hitK(ia,6));
    const ce=te>=TI?ss(0,0.06,ia)*(1-ss(1.55,1.95,te)):0;
    column.visible=ce>0.001; column.material.uniforms.uA.value=ce*(0.6+0.5*hitK(ia,5));
    drops.forEach((m,i)=>{const t=(te-TI-0.08-i*0.28)/0.6;m.visible=t>0&&t<1;m.position.set(X,1.95-1.85*t*(2-t),0);m.material.uniforms.uA.value=t>0&&t<1?Math.sin(Math.PI*t)*0.9:0;});
    disc.material.uniforms.uA.value=ss(TDR,TI,te)*(1-ss(1.7,TE,te));
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    // el rival se encoge bajo el peso del halo; brillo apagado plateado
    const w=ss(TI,TI+0.2,te)*(1-ss(1.6,2.0,te)), hit=hitK(ia,6);
    target.scale.set(1+0.03*w,1-0.07*w-0.05*hit,1+0.03*w); target.rotation.z=-hit*0.12*Math.cos(ia*12);
    o.em=0.25*w; o.emc.copy(U.uC2.value);
    caster.rotation.z=0.06*Math.sin(Math.PI*cl(te/0.3));
    if(te<TI){o.g.copy(tmp);o.gs=0.9*form;o.ga=0.3*form*fade;o.li=2*form;}
    else{o.g.set(X,2.0,0);o.gs=1.4+1.5*Math.min(ia,0.5);o.ga=0.55*Math.exp(-ia*8)+0.12*ce;o.li=5*Math.exp(-ia*5)+1.5*ce;}
    o.ia=ia;o.c.set(X,1.6,0);o.shake=0;o.dist=0.45;o.flash=0.7;
  };
}};

// =====================================================================
// 4 · PINK CHEEK — rubor rosa encendido en las mejillas; brotan esporas de afecto que revolotean y se funden en
//     el Axie (abarata la siguiente carta), y una brisa lo eleva un palmo (+PM de vuelo) (nivel 1: rápido y pequeño)
// =====================================================================
const pink={key:"boPinkCheek",name:"Pink Cheek",pa:1,dur:1.2,ti:0.3,pal:"Sakura",
  phases:[["Rubor",0],["Esporas",0.3],["Afecto",0.6],["Fin",0.95]],
build(a){
  const L=a.L,TI=0.3,TS=0.62,CX=-3.7;
  const CK=[V3(-3.47,1.53,0.19),V3(-3.47,1.53,-0.19)];
  // rubor: elipse suave con trazos diagonales
  const blushes=CK.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.3),fx(`void main(){vec2 p=(vUv-.5)*2.;float e=length(p*vec2(1.,1.5));
   float soft=smoothstep(1.,.15,e);float hatch=smoothstep(.12,.04,abs(fract((p.x-p.y*.55)*2.2)-.5))*smoothstep(.8,.35,e);
   gl_FragColor=vec4(mix(uC2,uC1,.4+.4*hatch)*1.5,(soft*.55+hatch*.6)*uA);}`));L.mesh.add(m);return m;});
  const pulse=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fx(RING_FS)); L.mesh.add(pulse);
  // brisa de vuelo: cinta fina que sube en espiral alrededor del Axie
  const breezeMat=fxU(WIND_FS,{uQ:{value:0}}), breeze=new THREE.Mesh(helixGeo(1.3,0.5,0.36,1.6,0.1,60),breezeMat); L.trail.add(breeze);
  const swirl=groundPlane(1.1,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float arm=smoothstep(.6,1.,sin(an*2.+r*8.-uT*9.))*smoothstep(1.,.4,r)*smoothstep(.15,.35,r);
   gl_FragColor=vec4(mix(uC2,uC1,arm)*1.3,arm*.5*uA);}`)); L.decal.add(swirl);

  const C=`varying float vR;const float TI=${f(TI)};const float TS=${f(TS)};const float CX=${f(CX)};`;
  // esporas de afecto: salen de las mejillas, revolotean y se hunden en espiral en el cuerpo
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.06;float t=max(uT-s,0.);float life=.62+.12*aSeed.y;float age=(uT-s)/life;
   float sd=aSeed.y>.5?1.:-1.;vec3 c0=vec3(-3.47,1.53,.19*sd);float sink=smoothstep(.3,.95,age);
   float an=aSeed.z*6.2832+t*(5.+2.*aSeed.w)*sd;float R=(.28+.3*aSeed.w)*(1.-exp(-t*8.))*(1.-.8*sink);
   vec3 orb=vec3(CX+cos(an)*R,1.53+(.25+.3*aSeed.x)*(1.-exp(-t*5.))-.75*sink,sin(an)*R);
   vec3 p=mix(c0,orb,smoothstep(0.,.1,t));
   vA=(age>0.&&age<1.)?smoothstep(0.,.05,age)*(1.-smoothstep(.8,1.,age)):0.;put(p,(.07+.04*aSeed.w)*(1.-.4*sink));}`,HEART_FS);
  // chispitas donde cada espora se funde en el Axie
  a.count+=points(L.part,60,C+`void main(){float s=TS+aSeed.x*.3;float life=.18+aSeed.y*.12;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*.38,.55+aSeed.w*.9,sin(an)*.38);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.05+.04*aSeed.y);}`,STAR4_FS);
  // soplo de viento bajo las patas al elevarse
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.25;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*7.;float R=.25+.6*(1.-exp(-t*5.));vec3 p=vec3(CX+cos(an)*R,.05+.15*t,sin(an)*R);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.03+.02*aSeed.w);}`);
  a.count+=points(L.part,20,C+`void main(){float s=TI+aSeed.x*.2;float life=.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*5.;float R=.35+.4*t;vec3 p=vec3(CX+cos(an)*R,.1+.9*t*(1.-.5*t),sin(an)*R);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.11+.04*aSeed.w)*2.1);vR=an+t*4.;vMix=aSeed.w;}`,FEATHER_FS(FCOL,1.3));

  a.pose=function(te,o){
    const ia=te-TI, bl=ss(0,TI,te)*(1-ss(0.8,1.15,te)), hop=Math.sin(Math.PI*cl((te-TI)/0.6));
    caster.position.y=0.13*hop; caster.scale.set(1+0.05*ss(0.1,TI,te)*(1-ss(TI,TI+0.08,te)),1-0.07*ss(0.1,TI,te)*(1-ss(TI,TI+0.08,te)),1);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.18*bl+0.4*hitK(te-TS-0.2,5)*(te>TS+0.2?1:0)*(1-ss(0.9,1.15,te));
    blushes.forEach((m,i)=>{towardCam(m.position,tmp.set(CK[i].x,CK[i].y+caster.position.y,CK[i].z),0.06);billboard(m);
      m.scale.setScalar(1+0.35*hitK(ia,10));set(m,0,bl*(1+0.8*hitK(ia,7)));});
    let p=cl(ia/0.3); towardCam(pulse.position,tmp.set(-3.6,1.55+caster.position.y,0),0.3); billboard(pulse); pulse.visible=ia>=0&&p<1; set(pulse,p,(1-p)*0.8);
    breeze.position.set(CX,0.02,0); breeze.rotation.y=-te*6; breezeMat.uniforms.uP.value=ss(TI,TI+0.3,te)*1.02; breezeMat.uniforms.uQ.value=ss(0.65,1.0,te); breezeMat.uniforms.uA.value=te>TI?0.8:0;
    swirl.material.uniforms.uA.value=ss(TI,TI+0.1,te)*(1-ss(0.75,1.1,te));
    o.g.set(-3.5,1.55+caster.position.y,0); o.gs=0.55+0.6*hitK(ia,6); o.ga=0.25*bl+0.3*hitK(ia,8); o.li=1.2+2*hitK(ia,6);
    o.ia=ia;o.c.set(-3.55,1.5,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 5 · RISKY BIRD — envuelto en un capullo de plumas carmesí, el Axie salta, se lanza en picado suicida contra el
//     rival dejando una estela roja, rebota y queda debilitado soltando plumas mustias (nivel 2: sin fractura)
// =====================================================================
const risky={key:"boRiskyBird",name:"Risky Bird",pa:2,dur:2.4,ti:1.0,pal:"Carmesí",
  phases:[["Plumaje",0],["Salto",0.3],["Picado",0.68],["Impacto",1.0],["Rebote",1.15],["Debilidad",1.65]],
build(a){
  const L=a.L,TJ=0.3,TA=0.68,TI=1.0,TB=1.15,TR=1.65,X=3.4;
  const P0=V3(-3.7,0,0),P1=V3(-3.2,2.6,0),P2=V3(-1.0,2.7,0),P3=V3(1.0,2.9,0),P4=V3(2.45,0.35,0),P5=V3(2.2,0.5,0),P6=V3(-0.8,2.4,0);
  const cp=(t,o)=>{if(t<TJ)return o.copy(P0);if(t<TA){const k=(t-TJ)/(TA-TJ);return bez(P0,P1,P2,k*(2-k),o);}
    if(t<TI){const k=(t-TA)/(TI-TA);return bez(P2,P3,P4,k*k,o);}
    if(t<TB)return o.lerpVectors(P4,P5,ss(TI,TB,t));
    if(t<TR)return bez(P5,P6,P0,ss(TB,TR,t),o); return o.copy(P0);};
  const vel=V3(0,0,0);
  const tilt=t=>{cp(t+0.01,tA);cp(t-0.01,tB);vel.subVectors(tA,tB);const sp=vel.length();if(sp<1e-4)return 0;
    return cl(Math.atan2(-vel.x,vel.y),-1.7,0.8)*cl(sp*8);};
  // centro del cuerpo con la inclinación aplicada (para la estela)
  const body=(t,o)=>{cp(t,o);const th=tilt(t);return o.set(o.x-Math.sin(th)*0.7,o.y+Math.cos(th)*0.7,o.z);};
  // capullo de plumas: escamas que fluyen hacia atrás, más densas en la cola del movimiento
  const cocoon=new THREE.Group(); L.mesh.add(cocoon);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);float row=q.y*7.+uT*6.;
   float an=atan(q.z,q.x)/6.2832*9.+floor(row)*.5;float u=fract(an)-.5;float v=fract(row);
   float sc=smoothstep(0.,.3,v)*(1.-smoothstep(.3,.5,abs(u)+v*.2));float edge=smoothstep(.07,0.,abs(abs(u)*2.-(1.-v)*.9));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float back=smoothstep(.6,-.8,q.y);
   gl_FragColor=vec4(mix(uC2,uC1,edge*.7+fr*.5)*1.5,(fr*.6+edge*.5+sc*.15)*(.35+.65*back)*uA);}`));
  shell.position.set(0,0.72,0); shell.scale.set(0.62,1.0,0.62); cocoon.add(shell);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),fx(RING_FS)); L.mesh.add(hitRing);
  const trail=new THREE.Mesh(paramTube((k,o)=>body(TJ+k*(TI-TJ),o),120,10,0.06,0.3),fxU(TRAVEL_FS,{uQ:{value:0}})); L.trail.add(trail);

  const C=`varying float vR;const float TJ=${f(TJ)};const float TA=${f(TA)};const float TI=${f(TI)};const float TR=${f(TR)};
  const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 P3=${v3(P3)};const vec3 P4=${v3(P4)};const vec3 HP=${v3(TC)};
  vec3 bz(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}
  vec3 cp(float t){if(t<TJ)return P0;if(t<TA){float k=(t-TJ)/(TA-TJ);return bz(P0,P1,P2,k*(2.-k));}
   if(t<TI){float k=(t-TA)/(TI-TA);return bz(P2,P3,P4,k*k);}return P4;}`;
  const CRIM=FEATHER_FS("mix(uC2*.75,uC1,.2+.5*vMix+.3*u)",1.1,true);
  // plumaje: plumas carmesí que convergen y se pegan al cuerpo
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TJ-.1);float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 d=normalize(rnd()+vec3(0.,.2,0.));vec3 p=P0+vec3(0.,.72,0.)+d*mix(1.2,.35,k*k);
   vA=(age>0.&&age<1.2)?smoothstep(0.,.3,age)*(1.-smoothstep(1.,1.2,age)):0.;put(p,(.16+.05*aSeed.w)*2.1);vR=atan(d.y,d.x)+1.57;vMix=aSeed.w;}`,CRIM,NB);
  // plumas que se desprenden en el salto y el picado
  a.count+=points(L.part,140,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=cp(s)+vec3(0.,.7,0.)+rnd()*.3+vec3(sin(t*4.+aSeed.z*9.)*.25,-.8*t+.3*(1.-exp(-t*4.)),rnd().z*.4*t);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,(.15+.07*aSeed.w)*2.1);vR=aSeed.z*6.2832+t*(3.+4.*aSeed.y);vMix=aSeed.w;}`,CRIM,NB);
  // brasas rojas en la estela
  a.count+=points(L.part,100,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.3+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=cp(s)+vec3(0.,.7,0.)+rnd()*.25+vec3(0.,.4*t,0.);vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.w*20.)):0.;put(p,.035+.04*aSeed.w);}`);
  // impacto: estallido de plumas, chispas y polvo
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.05;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.5,.45,0.))*(2.5+4.5*aSeed.z);vec3 p=HP+v*(1.-exp(-t*3.))/3.+vec3(sin(t*3.+aSeed.w*9.)*.2,-.9*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,(.19+.08*aSeed.w)*2.1);vR=aSeed.w*6.2832+t*(5.+5.*aSeed.y);vMix=aSeed.y;}`,CRIM,NB);
  a.count+=sparks(L.part,140,TI,`${f(TC.x)},${f(TC.y)},0.`,"0.5,.35,0.",3.5,10,3);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(X)}+cos(an)*(.3+1.*(1.-exp(-t*4.))),.06+.3*aSeed.y*(1.-exp(-t*3.)),sin(an)*(.3+1.*(1.-exp(-t*4.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.24+.2*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // debilidad: plumas mustias, casi grises, que se le caen al Axie de vuelta
  a.count+=points(L.part,30,C+`void main(){float s=TR+aSeed.x*.6;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P0+vec3(0.,.8+.5*aSeed.z,0.)+rnd()*vec3(.3,.1,.3)+vec3(sin(t*3.+aSeed.w*9.)*.15,-.9*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.13+.04*aSeed.w)*2.1);vR=aSeed.z*6.2832+t*2.;vMix=aSeed.w;}`,
   FEATHER_FS("mix(vec3(.35,.3,.32),uC2*.6,.35)",1.,true),NB);
  // suelo: quemadura suave y onda (sin grietas)
  const burn=groundPlane(2.4,X,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,2.))*.7+noise(vec3(p*15.,5.))*.3;
   float m=smoothstep(1.,.25,r+(n-.5)*.35);float fe=pow(1.-abs(fract(atan(p.y,p.x)*2.+n)*2.-1.),8.)*smoothstep(.95,.3,r);
   gl_FragColor=vec4(mix(uC2,uC1,n*.5+fe*.5)*1.2,(m*(.25+.15*n)+fe*.4)*uA);}`));
  const shock=groundPlane(4.2,X,0.03,fx(RING_FS)); L.decal.add(burn,shock);

  a.pose=function(te,o){
    const ia=te-TI, th=tilt(te), crouch=ss(0,TJ,te)*(1-ss(TJ,TJ+0.06,te));
    cp(te,caster.position); caster.rotation.z=th;
    const weak=ss(TR,TR+0.2,te);
    caster.scale.set(1+0.08*crouch,1-0.15*crouch-0.05*weak,1+0.08*crouch);
    if(te>=TR)caster.rotation.z=0.07*weak;
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.35*ss(0.05,TJ,te)*(1-ss(TI,TB,te));
    const cv=ss(0.05,TJ,te)*(1-ss(TI+0.02,TI+0.2,te));
    cocoon.visible=cv>0.001; cocoon.position.copy(caster.position); cocoon.rotation.z=caster.rotation.z;
    const st=te>TA&&te<TI?ss(TA,TI,te):0; shell.scale.set(0.62-0.08*st,1.0+0.35*st,0.62-0.08*st); set(shell,0,cv*(0.6+0.5*ss(TA,TI,te)));
    trail.visible=te>TJ&&ia<0.4; set(trail,cl((te-TJ)/(TI-TJ)),ia>0?1-cl(ia/0.4):0.9); trail.material.uniforms.uQ.value=cl((te-TJ-0.28)/(TI-TJ));
    let p=cl(ia/0.35); towardCam(hitRing.position,TC,0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    burn.material.uniforms.uA.value=ia>=0?1-ss(TI+0.4,2.3,te):0;
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.9:0);
    const hit=hitK(ia,3.5); target.position.x=3.4+hit*0.55*(1-Math.exp(-Math.max(ia,0)*18)); target.rotation.z=-hit*0.4*Math.cos(ia*11);
    if(te<TJ){o.g.set(-3.7,0.8,0);o.gs=1.1*crouch+0.3;o.ga=0.3*ss(0,TJ,te);o.li=2*ss(0,TJ,te);}
    else if(te<TI){body(te,o.g);o.gs=1.4;o.ga=0.4+0.25*st;o.li=3+3*st;}
    else{o.g.copy(TC);o.gs=1.6+3.5*Math.min(ia,0.5);o.ga=0.8*Math.exp(-ia*8);o.li=9*Math.exp(-ia*4.5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=1;
  };
}};

// =====================================================================
// 6 · EARLY BIRD — "el primer vuelo del alba": trinos en las orejas encienden el lucero sobre la cabeza; el lucero se
//     vuelve un vencejo de luz que cae en picado rasante sobre el rival con una estela color cielo de amanecer; al
//     atravesarlo amanece tras él (medio sol + destello horizontal) y una línea de primera luz recorre el suelo hasta
//     el Axie, que se perfila en dorado (Initial: +1 PA, sin interfaz). Nivel 2: sin temblor ni fractura.
// =====================================================================
const early={key:"boEarlyBird",name:"Early Bird",pa:2,dur:2.1,ti:0.75,pal:"Cariño",
  phases:[["Canto",0],["Vuelo",0.35],["Amanecer",0.75],["Primera luz",1.0],["Fin",1.7]],
build(a){
  const L=a.L,TC0=0.05,TL=0.35,TI=0.75,TR=1.0,TA=1.3,TE=2.05,CX=-3.7;
  const S0=V3(-3.55,2.3,0.05), SC=V3(-0.4,0.55,0.75), S1=V3(3.15,1.2,0);
  const path=(t,o)=>bez(S0,SC,S1,t,o);
  // trinos: arcos ")" que salen de cada oreja, tres por lado
  const CHIRP_FS=`void main(){vec2 p=(vUv-vec2(.15,.5))*2.;float r=length(p);float an=atan(p.y,p.x);
   float m=0.;for(int i=0;i<3;i++){float fi=float(i);float k=clamp(uP*1.4-fi*.2,0.,1.);
    m+=band(r,.35+.55*k,.045)*smoothstep(.75,.35,abs(an))*step(.01,k)*(1.-k);}
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,m*uA);}`;
  const chirps=[-1,1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(CHIRP_FS,{depthTest:false}));m.userData.s=s;L.mesh.add(m);return m;});
  // lucero del alba (cuatro puntas) que luego se vuelve vencejo
  const star=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 q=(vUv-.5)*2.;vec2 a=abs(q);
   float s=pow(max(0.,1.-a.x*a.y*18.-min(a.x,a.y)*1.5),3.)*smoothstep(1.,.15,max(a.x,a.y));
   float c=pow(max(0.,1.-length(q)),3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.,.97,.9),.6)*1.7,(s+c)*uA);}`,{depthTest:false}));
  // vencejo de luz: silueta de ave con alas barridas hacia atrás; la cabeza apunta a +x tras girar el billboard
  // vencejo de luz: alas largas en hoz barridas hacia atrás y cola en horquilla (cabeza hacia +y antes de girar)
  const swift=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(`float sdTap(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}
   float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
   void main(){vec2 p=(vUv-.5)*1.3;vec2 q=vec2(abs(p.x),p.y);float fl=sin(uT*38.);
    float d=sdTap(q,vec2(0.,.17),vec2(0.,-.13),.078,.035);
    d=smin(d,length(q-vec2(0.,.2))-.058,.05);
    // ala en hoz: perfil ancho en el hombro que se afila curvándose hacia atrás
    vec2 sh=vec2(.04,.07),m1=vec2(.2,.09+.05*fl),m2=vec2(.38,.02+.1*fl),tip=vec2(.55,-.15+.14*fl);
    d=smin(d,sdTap(q,sh,m1,.075,.06),.04);
    d=smin(d,sdTap(q,m1,m2,.06,.034),.03);
    d=smin(d,sdTap(q,m2,tip,.034,.003),.02);
    d=smin(d,sdTap(q,vec2(.01,-.1),vec2(.07,-.33),.03,.004),.015);
    float body=smoothstep(.012,-.012,d);float rim=band(d,0.,.025);float glow=exp(-max(d,0.)*18.)*.45;
    vec3 c=mix(uC2,mix(uC1,vec3(1.,.93,.8),.3),.35+.9*p.y)*1.15;
    gl_FragColor=vec4(c+vec3(1.)*rim*.35,(body*.8+rim*.9+glow)*uA);}`,{depthTest:false}));
  L.mesh.add(star,swift);
  // estela de vuelo: degradado de cielo al amanecer (celeste en la cola → rosa → oro en la cabeza)
  const trail=new THREE.Mesh(paramTube(path,80,8,0.05,0.15),fxU(`uniform float uQ;
   void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float k=(u-uQ)/max(uP-uQ,.001);
    float c=abs(dot(normalize(vN),normalize(vV)));float st=.65+.35*noise(vec3(u*30.-uT*14.,vUv.y*6.,1.));
    vec3 sky=k<.5?mix(vec3(.55,.8,1.),uC2,k*2.):mix(uC2,mix(uC1,vec3(1.,.92,.7),.5),(k-.5)*2.);
    gl_FragColor=vec4(sky*1.5+vec3(1.)*smoothstep(.88,1.,k)*.6,c*c*k*st*uA);}`,{uQ:{value:0}}));
  L.trail.add(trail);
  // amanecer tras el rival: medio sol que asoma del suelo + destello horizontal largo
  // amanecer sobre la cabeza del rival: un sol que asoma tras su propia línea de horizonte, con halo y rayos lentos;
  // el horizonte recorta el sol con suavidad y todo se apaga antes de los bordes del plano (uP = cuánto ha salido)
  const dawn=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float hy=-.22;vec2 c=vec2(0.,mix(-.62,-.02,uP));float r=length(p-c);
   float above=smoothstep(hy-.03,hy+.05,p.y);
   float disc=smoothstep(.36,.32,r)*above;
   float cor=exp(-max(r-.34,0.)*4.)*.55*above;
   vec2 o=p-c;float rays=pow(.5+.5*sin(atan(o.y,o.x)*12.+uT*1.2),8.)*smoothstep(.36,.52,r)*exp(-max(r-.5,0.)*2.2)*above*uP;
   float hor=exp(-abs(p.y-hy)*30.)*exp(-p.x*p.x*2.2)*(.4+.6*uP);
   float edge=smoothstep(1.,.78,length(p*vec2(.85,1.)));
   vec3 col=mix(uC2,mix(uC1,vec3(1.,.93,.78),.35),.35+.65*smoothstep(.36,0.,r));
   gl_FragColor=vec4(col*1.25,(disc*.85+cor+rays*.5+hor*.9)*edge*uA);}`,{depthTest:false}));
  L.mesh.add(dawn);
  // línea de primera luz: frente cálido que cruza el suelo del rival al Axie y deja un velo tenue
  const LEN=S1.x-CX+0.4;
  const line=groundPlane(1,(S1.x+CX)/2,0.025,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float front=exp(-abs(u-(1.-uP))*26.)*step(.001,uP);float veil=smoothstep(1.-uP,1.-uP+.25,u)*.18*(1.-uP*.6);
   gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.,.95,.85),.5),front)*1.5,(front+veil)*smoothstep(1.,.2,v)*smoothstep(0.,.05,u)*smoothstep(1.,.95,u)*uA);}`),0.55);
  line.scale.x=LEN; L.decal.add(line);
  const glyph=groundPlane(1.9,CX,0.022,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float m=band(r,.8,.03)+band(r,.55,.015)*.6;float sun=pow(.5+.5*sin(atan(p.y,p.x)*8.+uT*.8),10.)*smoothstep(.5,.62,r)*smoothstep(.95,.8,r);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,(m+sun*.6)*uA);}`)); L.decal.add(glyph);
  const C=`varying float vR;const float TL=${f(TL)};const float TI=${f(TI)};const float TA=${f(TA)};const vec3 S0=${v3(S0)};const vec3 SC=${v3(SC)};const vec3 S1=${v3(S1)};const float CX=${f(CX)};
  vec3 bz(float t){float u=1.-t;return u*u*S0+2.*u*t*SC+t*t*S1;}`;
  // plumas que suelta el vencejo en el vuelo
  a.count+=points(L.part,40,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz((s-TL)/(TI-TL))+vec3(sin(t*3.+aSeed.z*9.)*.15,-.55*t,(aSeed.w-.5)*.3*t);
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;put(p,(.1+.04*aSeed.w)*2.1);vR=aSeed.z*6.2832+t*3.;vMix=aSeed.w;}`,FEATHER_FS("mix(uC2,uC1,.15+.7*u)*(.85+.3*vMix)",1.,true),NB);
  // motas cálidas de la estela
  a.count+=points(L.part,120,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz((s-TL)/(TI-TL))+rnd()*.07+rnd()*.25*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.035*aSeed.w)*(1.-age*.5));}`);
  // impacto: ráfaga de plumas que se abre detrás del rival y planea
  a.count+=points(L.part,36,C+`void main(){float s=TI+aSeed.x*.05;float life=.75+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.8,.3,0.));vec3 p=S1+d*(.3+1.1*aSeed.z)*(1.-exp(-t*4.))+vec3(sin(t*3.+aSeed.w*9.)*.1,-.45*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,(.12+.05*aSeed.w)*2.1);vR=aSeed.w*6.2832+t*(4.+4.*aSeed.y);vMix=aSeed.y;}`,FEATHER_FS("mix(uC2,uC1,.15+.7*u)*(.85+.3*vMix)",1.,true),NB);
  a.count+=sparks(L.part,140,TI,`${f(S1.x)},${f(S1.y)},0.`,".8,.2,0.",3,8,2.2);
  // primera luz en el Axie: destellos y flechas de iniciativa
  a.count+=points(L.part,26,C+`void main(){float s=TA+aSeed.x*.15;float life=.45+aSeed.y*.25;float age=(uT-s)/life;
   vec3 p=vec3(CX,0.,0.)+vec3((aSeed.z-.5)*1.,.3+aSeed.w*1.6,(aSeed.y-.5)*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.12+.12*aSeed.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=points(L.part,6,C+`void main(){float s=TA+.05+aSeed.x*.2;float life=.7;float age=(uT-s)/life;
   vec3 p=vec3(CX+(aSeed.z-.5)*.8,.4+age*1.3,(aSeed.w-.5)*.6);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.26);}`,CHEVRON_FS);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  const sp=V3(0,0,0), ear=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TA;
    caster.rotation.z=-0.1*ss(0,TL,te)+0.18*ss(TL,TL+0.08,te)-0.08*ss(TL+0.1,TL+0.5,te);
    // trinos
    for(const m of chirps){const k=cl((te-TC0)/0.4);towardCam(m.position,ear.set(CX-0.02,1.84,0.26*m.userData.s),0.25);
      billboard(m,m.userData.s>0?0.35:-0.35);m.position.x+=0.12;m.visible=k>0&&k<1;set(m,k,1-ss(0.25,0.45,te));}
    // lucero: crece sobre la cabeza y se transforma en el vencejo al lanzarse
    const sg=ss(0.08,TL,te), go=ss(TL-0.03,TL+0.04,te);
    towardCam(star.position,S0,0.3); billboard(star,te*2); star.visible=sg>0.01&&go<0.99;
    star.scale.setScalar(Math.max(0.35+0.45*sg+0.25*go,0.001)); star.material.uniforms.uA.value=sg*(1-go);
    const k=cl((te-TL)/(TI-TL)), e=k*k;           // acelera en el picado
    path(e,sp); swift.visible=te>=TL-0.03&&te<TI+0.02;
    towardCam(swift.position,sp,0.25); billboard(swift,angOf(path,Math.min(Math.max(e,0.02),0.98))-Math.PI/2);
    swift.scale.setScalar(0.55+0.25*e); swift.material.uniforms.uA.value=go*(1-ss(TI-0.02,TI+0.02,te));
    trail.visible=te>=TL; trail.material.uniforms.uP.value=e; trail.material.uniforms.uQ.value=Math.max(0,e-0.55)+(te>TI?cl((te-TI)/0.3):0);
    trail.material.uniforms.uA.value=1-ss(TI+0.15,TI+0.35,te);
    // amanecer tras el rival
    const dr=ss(TI,TI+0.25,te), df=1-ss(TI+0.35,TR+0.35,te);
    // el sol flota sobre la cabeza del rival y lo sigue en el retroceso
    towardCam(dawn.position,tmp.set(target.position.x,2.42+0.05*Math.sin(te*3),target.position.z),0.3); billboard(dawn);
    dawn.scale.setScalar(0.75+0.25*dr);
    dawn.visible=ia>=0&&df>0.001; set(dawn,dr,dr*df);
    let p=cl(ia/0.35); towardCam(hitRing.position,S1,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // primera luz: cruza el suelo hasta el Axie y lo enciende
    set(line,cl((te-TR+0.1)/(TA-TR+0.1)),te>=TR-0.1?1-ss(TA+0.3,TE,te):0);
    glyph.material.uniforms.uA.value=ir>=0?ss(TA,TA+0.15,te)*(1-ss(TE-0.4,TE,te))*0.8:0;
    const hit=hitK(ia,6); target.position.x=3.4+hit*0.22; target.rotation.z=-hit*0.25*Math.cos(ia*15);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    cm.emissiveIntensity=0.25*sg*(1-go)+(ir>=0?0.9*Math.exp(-ir*4)+0.15*(1-ss(TE-0.4,TE,te)):0);
    caster.position.y=ir>=0?0.08*Math.sin(Math.PI*cl(ir/0.3)):0;
    if(te<TL){o.g.copy(S0);o.gs=0.9*sg;o.ga=0.4*sg;o.li=2.5*sg;}
    else if(te<TI){o.g.copy(sp);o.gs=1.1;o.ga=0.5;o.li=4;}
    else if(te<TA){o.g.set(S1.x,0.6,0);o.gs=1.1+1.2*Math.min(ia,0.4);o.ga=0.3*Math.exp(-ia*9);o.li=5*Math.exp(-ia*5)+2.5*dr*df;}
    else{o.g.set(CX,1.0,0.3);o.gs=1.4;o.ga=0.45*Math.exp(-ir*5);o.li=4*Math.exp(-ir*4);}
    o.ia=ia;o.c.copy(S1);o.shake=0;o.dist=0.6;o.flash=1;
  };
}};

VFX.module("Pájaro · Orejas",[curly,owlE,peace,pink,risky,early]);
})();

// =====================================================================
// MÓDULO 3 · CLASE BESTIA (OREJAS)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Las orejas son el origen de casi todo: pabellones luminosos que siguen al lanzador (mkEars) y emisores
// colocados en su posición. Piezas reutilizables de vfx-lib.js (VFX.lib).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,SCORCH_FS,
  caster,target,allies,ALLY_POS,enemies,ENEMY_POS,horns,hornMat,HORN_TIPS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,FLUFF_FS,STAR4_FS,billboard,towardCam,variantGroups}=VFX.lib;

// paletas (se registran también aquí con los mismos valores por si el módulo se carga solo)
VFX.palette("Dorado",["#ffe08a","#ff9a1c"]);
VFX.palette("Ámbar",["#ffbe5c","#ff6412"]);
VFX.palette("Rosa",["#ff7aa8","#c0124a"]);
VFX.palette("Celestial",["#fff7e0","#ffc23d"]);
VFX.palette("Jade",["#f4f1a0","#2bb673"]);

const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;

// cuernos: el motor no reinicia su escala ni su posición → todas las poses de este módulo los dejan en reposo;
// solo Innocent Lamb los escala, sobre un pivote en su base para que no se desplacen
const HPV=V3(0.06,1.86,0);
const hornScale=s=>{s=Math.max(s,0.001);horns.scale.setScalar(s);horns.position.copy(HPV).multiplyScalar(1-s);};

// ---------- orejas: pabellones luminosos que siguen al lanzador ----------
const EAR_L=[V3(-0.02,1.84,0.26),V3(-0.02,1.84,-0.26)];      // en coordenadas del lanzador
const earW=(i,out)=>{const e=EAR_L[i],c=Math.cos(caster.rotation.z),s=Math.sin(caster.rotation.z);
  return out.set(caster.position.x+e.x*c-e.y*s,caster.position.y+e.x*s+e.y*c,caster.position.z+e.z);};
// borde de Fresnel + anillos que suben por el pabellón (uP = pulso)
const EAR_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
 float rg=band(fract(vUv.y*3.-uT*2.5),.5,.16)*uP;
 gl_FragColor=vec4(mix(uC2,uC1,fr*.7+rg)*1.5+vec3(1.)*rg*.35,(fr*.75+.1+rg*.8)*uA);}`;
function mkEars(parent,tall){
  const t=tall||1, g=new THREE.Group(), mat=fx(EAR_FS), ears=[];
  for(const s of [1,-1]){const m=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.34*t,18,1,true),mat);
    m.position.set(-0.03,1.88+0.17*(t-1),0.21*s); m.rotation.set(0.42*s,0,0.1); m.scale.set(1,1,0.5); g.add(m); ears.push(m);}
  parent.add(g); g.userData={mat,ears}; return g;
}
const follow=g=>{g.position.copy(caster.position);g.rotation.z=caster.rotation.z;g.scale.copy(caster.scale);};
const earPose=(g,p,al,flap)=>{const u=g.userData.mat.uniforms;u.uP.value=p;u.uA.value=al;follow(g);
  g.userData.ears.forEach((m,i)=>m.rotation.x=(i?-1:1)*(0.42+(flap||0)));};

// cinta vertical a lo largo de una curva fn(t,out); uv.x recorre la curva
function ribbonGeo(fn,N,w){
  const pos=[],uv=[],idx=[],c=V3(0,0,0);
  for(let i=0;i<=N;i++){const t=i/N;fn(t,c);pos.push(c.x,c.y-w/2,c.z,c.x,c.y+w/2,c.z);uv.push(t,0,t,1);
    if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// haz cilíndrico de longitud 1 sobre +x (uv.y recorre la longitud); aimBeam lo tiende entre dos puntos
const beamGeo=(r,seg)=>new THREE.CylinderGeometry(r,r,1,seg||12,1,true).rotateZ(-Math.PI/2).translate(0.5,0,0);
const bd=V3(0,0,0);
const aimBeam=(m,from,to,th)=>{bd.copy(to).sub(from);const l=bd.length();m.position.copy(from);
  if(l>1e-4)m.quaternion.setFromUnitVectors(XA,bd.multiplyScalar(1/l));m.scale.set(Math.max(l,0.001),Math.max(th,0.001),Math.max(th,0.001));};

// punto suave de un color fijo
const DOT_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(${col},a);}`;

// =====================================================================
// 1 · BELIEBER — tres ráfagas de notas musicales en llamas que viajan sobre un pentagrama de fuego;
//     cada ráfaga revienta en confeti cálido y llamas
// =====================================================================
const belieber={key:"belieber",name:"Belieber",dur:2.1,ti:1.04,pal:"Fuego",
  phases:[["Afinación",0],["Ráfaga I",0.28],["Ráfaga II",0.5],["Ráfaga III",0.72],["Final",1.04],["Brasas",1.3]],
build(a){
  const L=a.L,TL=[0.28,0.5,0.72],FL=0.32,TI=TL.map(t=>t+FL),ARC=[0.6,0.9,0.36];
  const E0=V3(-3.72,1.95,0.26),E1=V3(-3.72,1.95,-0.26),EM=V3(-3.6,1.95,0),TC=V3(3.15,1.3,0);
  const staffAt=(k,t,out)=>out.set(EM.x+(TC.x-EM.x)*t,EM.y+(TC.y-EM.y)*t+ARC[k]*Math.sin(Math.PI*t)+0.08*Math.sin(t*11+k),0.25*(k-1)*Math.sin(Math.PI*t));
  const ears=mkEars(L.mesh);
  // pentagrama: cinco líneas que se despliegan desde las orejas; la cola se quema con ruido
  const STAFF_FS=`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.55)discard;
   float v=vUv.y;float l=0.;for(int i=0;i<5;i++)l=max(l,band(v,.14+float(i)*.18,.028));
   float n=noise(vec3(u*18.-uT*6.,v*4.,uT));
   float fire=smoothstep(.45,.8,n)*smoothstep(.55,0.,abs(v-.5))*.7;
   float al=(l*.9+fire*.5)*exp(-d*5.5)*smoothstep(0.,.04,u)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,l*.7+n*.3)*1.5+vec3(1.)*l*exp(-d*22.)*.7,al);}`;
  const staffs=TL.map((t0,k)=>{const m=new THREE.Mesh(ribbonGeo((t,o)=>staffAt(k,t,o),120,0.4),fx(STAFF_FS));L.trail.add(m);return m;});
  const rings=TL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // nota musical (corchea / semicorchea) con SDF y lenguas de fuego que suben
  const NOTE_FS=HEAD+`varying float vA;varying float vMix;varying float vRot;varying float vKind;
  float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
  void main(){vec2 q=vec2(gl_PointCoord.x,1.-gl_PointCoord.y)-.5;
   float c=cos(vRot),s=sin(vRot);q=mat2(c,s,-s,c)*q;
   vec2 h=q-vec2(-.1,-.24);h=mat2(.85,.53,-.53,.85)*h;float d=length(h*vec2(1.,1.55))-.11;
   d=min(d,sdSeg(q,vec2(0.,-.22),vec2(0.,.3))-.022);
   d=min(d,sdSeg(q,vec2(0.,.3),vec2(.15,.12))-.03);
   if(vKind>.5)d=min(d,sdSeg(q,vec2(0.,.18),vec2(.15,0.))-.03);
   float fill=smoothstep(.015,-.01,d);float halo=smoothstep(.17,0.,d);
   float fl=noise(vec3(q*9.+vec2(0.,-uT*7.),vMix*9.));
   float flame=halo*smoothstep(.3,.8,fl+q.y*.7)*(1.-fill);
   float a=(fill+flame*.9+halo*.12)*vA;if(a<.003)discard;
   vec3 col=mix(uC2,uC1,flame+.2)*1.6;col=mix(col,vec3(1.,.96,.88)*1.7,fill*.7);
   gl_FragColor=vec4(col,a);}`;
  // confeti: cuadradito que gira y se voltea (mezcla normal, colores cálidos fijos: es confeti, no paleta)
  const CONF_FS=HEAD+`varying float vA;varying float vMix;varying float vRot;varying float vFlip;
  void main(){vec2 q=gl_PointCoord-.5;float c=cos(vRot),s=sin(vRot);q=mat2(c,s,-s,c)*q;
   float fl=max(abs(vFlip),.12);q.y/=fl;
   float m=step(abs(q.x),.3)*step(abs(q.y),.2);float a=m*vA;if(a<.003)discard;
   float h=floor(vMix*5.);
   vec3 col=h<1.?vec3(1.,.22,.2):h<2.?vec3(1.,.55,.12):h<3.?vec3(1.,.84,.22):h<4.?vec3(1.,.42,.66):vec3(1.,.95,.75);
   gl_FragColor=vec4(col*(.55+.6*fl),a);}`;
  TL.forEach((tl,k)=>{
    const C=`const float TL=${f(tl)};const float TI=${f(TI[k])};const float ARC=${f(ARC[k])};const float K=${f(k)};
    const vec3 E0=${v3(E0)};const vec3 E1=${v3(E1)};const vec3 EM=${v3(EM)};const vec3 TC=${v3(TC)};
    vec3 staff(float t){return vec3(mix(EM.x,TC.x,t),mix(EM.y,TC.y,t)+ARC*sin(3.14159*t)+.08*sin(t*11.+K),.25*(K-1.)*sin(3.14159*t));}`;
    // notas: salen de una oreja, se posan en una línea del pentagrama y llegan todas a la vez
    a.count+=points(L.part,8,C+`varying float vRot;varying float vKind;
    void main(){float s=TL+aSeed.x*.14;float k=(uT-s)/(TI-s);float kc=clamp(k,0.,1.);
     vec3 e=aSeed.y<.5?E0:E1;float lane=(floor(aSeed.z*5.)-2.)*.09;
     vec3 p=mix(e,staff(kc)+vec3(0.,lane+.1,0.),smoothstep(0.,.3,kc));
     vRot=.35*sin(uT*10.+aSeed.w*6.);vKind=step(.55,aSeed.w);
     vA=(k>0.&&k<1.)?smoothstep(0.,.1,k):0.;
     put(p,(.32+.1*aSeed.y)*(.55+.45*smoothstep(0.,.3,kc)));}`,NOTE_FS);
    // estela de fuego y brasas a lo largo del pentagrama
    a.count+=points(L.part,60,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=staff((s-TL)/(TI-TL))+vec3(0.,r.y*.22,r.z*.15)+vec3(-.3*t,.9*t,0.);
     vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.1+.09*aSeed.z)*(1.-age*.5));}`,FLAME_FS);
    a.count+=points(L.part,35,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=staff((s-TL)/(TI-TL))+r*.2+vec3(-.4*t+sin(t*9.+aSeed.w*6.)*.08,.6*t,r.z*.3*t);
     vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.z*40.)):0.;put(p,.03+.04*aSeed.w);}`);
    // impacto: confeti que revolotea, llamas que suben y chispas
    a.count+=points(L.part,45,C+`varying float vRot;varying float vFlip;
    void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.4;float t=max(uT-s,0.);float age=(uT-s)/life;
     vec3 d=normalize(rnd()+vec3(-.5,.9,0.));float sp=2.+2.6*aSeed.z;
     vec3 p=TC+d*sp*(1.-exp(-t*3.))/3.+vec3(sin(t*6.+aSeed.w*30.)*.15*min(t,1.),-.45*t*t,0.);
     float gr=step(.03,p.y);p.y=max(p.y,.03);
     vRot=aSeed.w*6.28+t*(8.+6.*aSeed.y);vFlip=cos(t*(10.+aSeed.x*8.)+aSeed.z*6.)*gr+(1.-gr);
     vA=(age>0.&&age<1.)?1.-smoothstep(.7,1.,age):0.;put(p,.075+.04*aSeed.y);}`,CONF_FS,NB);
    a.count+=points(L.part,25,C+`void main(){float s=TI+aSeed.x*.1;float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()*vec3(1.,.4,1.)+vec3(-.3,.6,0.));vec3 p=TC+d*(.16+.45*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,t*.9,0.);
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.17+.13*aSeed.w)*(1.-age*.4));}`,FLAME_FS);
    a.count+=sparks(L.part,60,TI[k],`${f(TC.x)},${f(TC.y)},0.`,"-.5,.5,0.",2.4,6.5,2.6);
  });
  // ecualizador circular bajo el lanzador: barras que saltan con el ritmo
  const eq=groundPlane(2.3,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832+.5;
   float id=floor(an*36.);float h=.15+.85*noise(vec3(id*.7,uT*7.,0.))*uP;
   float bar=step(.42,r)*step(r,.42+.45*h)*step(.18,fract(an*36.))*step(fract(an*36.),.82);
   float m=bar*(.45+.55*(r-.42)/.45)+band(r,.4,.012);
   gl_FragColor=vec4(mix(uC2,uC1,(r-.4)*2.)*1.4,m*uA);}`));
  const scorch=groundPlane(2.0,3.2,0.015,fx(SCORCH_FS)), shock=groundPlane(3.8,3.2,0.03,fx(RING_FS));
  L.decal.add(eq,scorch,shock);
  a.pose=function(te,o){
    hornScale(1);
    let last=-1;for(let k=0;k<3;k++)if(te>=TI[k])last=k;
    const ia=last>=0?te-TI[last]:te-TI[0];
    const pulse=TL.reduce((s,t)=>s+(te>=t?Math.exp(-(te-t)*7):0),0);
    const play=ss(0,0.22,te)*(1-ss(TI[2],TI[2]+0.5,te));
    caster.rotation.z=0.06*ss(0,0.22,te)-0.1*Math.min(pulse,1.3)*(1-ss(TI[2],TI[2]+0.5,te));
    earPose(ears,0.4+Math.min(pulse,1.2),play,0.25*Math.min(pulse,1));
    staffs.forEach((m,k)=>{const after=te-TI[k];m.visible=te>=TL[k]&&after<0.45;
      set(m,cl((te-TL[k])/FL)+Math.max(after,0)*1.4,after>0?1-cl(after/0.45):ss(TL[k],TL[k]+0.05,te));});
    rings.forEach((m,k)=>{const d=te-TI[k],p=cl(d/0.35);m.visible=d>=0&&p<1;towardCam(m.position,TC,0.4);billboard(m);set(m,p,1-p);});
    set(eq,play,ss(0,0.2,te)*(1-ss(TI[2]+0.15,TI[2]+0.6,te)));
    scorch.material.uniforms.uA.value=last>=0?0.25*(last+1)*(1-ss(1.6,2.1,te)):0;
    const p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),last>=0?(1-p)*(last===2?0.8:0.4):0);
    let kb=0,rz=0; TI.forEach((t,k)=>{const h=hitK(te-t,6),w=[0.05,0.07,0.17][k];kb+=h*w;rz-=h*w*Math.cos((te-t)*15);});
    target.position.x=3.4+kb; target.rotation.z=rz;
    let fly=-1;for(let k=0;k<3;k++)if(te>=TL[k]&&te<TI[k])fly=k;
    if(last>=0&&ia<0.18){o.g.copy(TC);o.gs=1.1+3.2*ia;o.ga=Math.exp(-ia*12)*(last===2?0.7:0.5);o.li=(last===2?8:4.5)*Math.exp(-ia*6);}
    else if(fly>=0){staffAt(fly,cl((te-TL[fly])/FL),o.g);o.gs=1;o.ga=0.38;o.li=3;}
    else if(last<0){o.g.copy(EM);o.gs=0.75*ss(0,0.22,te);o.ga=0.25;o.li=1.6*ss(0,0.22,te);}
    else{o.g.copy(TC);o.gs=1.2+2.4*ia;o.ga=Math.exp(-ia*12)*0.65;o.li=7*Math.exp(-ia*5)+1.2*(1-ss(1.3,1.9,te));}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=last===2?0.7:0.3;o.flash=last===2?0.85:0.5;
    o.em=0.25*ss(TI[0],TI[0]+0.1,te)*(1-ss(1.4,2.0,te)); o.emc.copy(U.uC2.value);
  };
}};

// =====================================================================
// 2 · INNOCENT LAMB — un cordero celestial de nubes envuelve al lanzador; la campana sagrada repica
//     tres veces (resonancia) y los cuernos se disuelven en luz y vuelven a crecer
// =====================================================================
const lamb={key:"lamb",name:"Innocent Lamb",dur:2.3,ti:0.75,pal:"Celestial",horns:true,
  phases:[["Plegaria",0],["Cordero",0.25],["Campana",0.75],["Renacer",1.03],["Disipación",1.85]],
build(a){
  const L=a.L,TM=0.25,TI=0.75,TR=[0.75,0.97,1.19],AMP=[0.8,0.5,0.3],TD=1.85,TE=2.25,TH0=0.85,TH1=1.03,TG0=1.2,TG1=1.55,LS=0.82;
  const LC=V3(-3.7,1.05,0),BELL=V3(-3.62,3.1,0),BM=V3(-3.62,2.62,0),CP=V3(-3.7,0,0);
  const HT=HORN_TIPS.map(h=>h.clone().add(CP)), HM=V3(-3.62,1.98,0);
  // cordero: cuerpo de nubes (bultos con unión suave) + cabeza con hocico y oreja caída + patas + aureola
  const SD_LAMB=`float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
  float sdLamb(vec2 p){
   float d=(length((p-vec2(-.1,.08))/vec2(.95,.62))-1.)*.62;
   for(int i=0;i<10;i++){float an=float(i)*.6283+.2;vec2 c=vec2(-.1,.08)+vec2(cos(an)*.82,sin(an)*.56);
    d=smin(d,length(p-c)-(.24+.05*sin(float(i)*2.7)),.14);}
   float h=length((p-vec2(1.2,.72))*vec2(1.,1.12))-.26;
   h=smin(h,length((p-vec2(1.42,.6))*vec2(1.,1.35))-.13,.08);
   vec2 e=p-vec2(1.04,.66);e=mat2(.6,.8,-.8,.6)*e;h=smin(h,length(e*vec2(2.8,1.))-.2,.03);
   d=smin(d,h,.08);
   for(int i=0;i<4;i++){vec2 q=p-vec2(-.68+float(i)*.4+(i>1?.08:0.),-.78);vec2 b=abs(q)-vec2(.07,.24);
    d=smin(d,length(max(b,0.))+min(max(b.x,b.y),0.)-.04,.06);}
   return d;}`;
  // uQ: 0 capa trasera (relleno), 1 capa delantera (solo borde): entre ambas queda el lanzador "envuelto"
  const LAMB_FS=`uniform float uQ;`+SD_LAMB+`
  void main(){vec2 p=(vUv-.5)*vec2(3.4,2.8);
   vec2 w=vec2(noise(vec3(p*2.5,uT*.6)),noise(vec3(p*2.5+7.,uT*.6)))-.5;
   float d=sdLamb(p+w*.08);
   float n=noise(vec3(p*4.,uT*.3))*.6+noise(vec3(p*9.,1.))*.4;
   float rev=length(p*vec2(.7,.9))+n*.35;float lim=uP*2.;
   float show=smoothstep(lim,lim-.15,rev);float edge=band(rev,lim,.08)*step(uP,.99)*step(d,.05);
   float fill=smoothstep(.02,-.04,d);float rim=band(d,0.,.035);
   float puffs=smoothstep(.55,.8,n)*fill;
   float halo=band(length((p-vec2(1.22,1.16))*vec2(1.,3.2)),.3,.035);
   float glow=smoothstep(.3,0.,d)*(1.-fill)*.25;
   float af=uQ<.5?(fill*.16+puffs*.22+rim*.8+glow):(rim*.5+puffs*.08+glow*.4);
   vec3 c=mix(vec3(1.,.98,.93),uC1,.3)*1.2*(fill+puffs)+mix(uC2,uC1,.5)*1.6*(rim+glow+halo)+vec3(1.)*edge;
   gl_FragColor=vec4(c,(af+halo*.9*(1.-uQ)+edge*.6)*show*uA);}`;
  const lambBack=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.8),fxU(LAMB_FS,{uQ:{value:0}}));
  const lambFront=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.8),fxU(LAMB_FS,{uQ:{value:1}}));
  L.mesh.add(lambBack,lambFront);
  // campana sagrada: torno con perfil de campana, oro opaco con brillo especular; badajo aparte
  const prof=[[0.02,0],[0.07,0],[0.1,-0.04],[0.12,-0.14],[0.135,-0.27],[0.17,-0.38],[0.24,-0.46],[0.27,-0.5],[0.25,-0.51]].map(([x,y])=>new THREE.Vector2(x,y));
  const BELL_FS=`void main(){vec3 n=normalize(vN);float lit=.35+.65*max(0.,dot(n,normalize(vec3(.3,.8,.6))));
   float spec=pow(max(0.,dot(reflect(-normalize(vV),n),normalize(vec3(.2,.9,.5)))),18.);
   float fr=pow(1.-abs(dot(n,normalize(vV))),2.);
   float bands=band(vUv.y,.3,.02)+band(vUv.y,.75,.015);
   vec3 gold=mix(vec3(.55,.36,.08),vec3(1.,.82,.4),lit);
   gl_FragColor=vec4(gold*lit+vec3(1.,.95,.8)*spec*.9+uC1*(fr*.6+bands*.8)*(.4+uA*1.6),1.);}`;
  const bellMat=fx(BELL_FS,Object.assign({},SOLID,{side:THREE.DoubleSide}));
  const bell=new THREE.Group(), clap=new THREE.Group(); bell.position.copy(BELL); clap.position.copy(BELL);
  bell.add(new THREE.Mesh(new THREE.LatheGeometry(prof,40),bellMat));
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.055,14,10),bellMat); ball.position.set(0,-0.44,0); clap.add(ball);
  const bellGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rays=pow(abs(cos(an*6.+uT*.5)),16.)*smoothstep(1.,.3,r)*.5;float g=pow(max(0.,1.-r),2.5);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.4,(g+rays)*uA);}`));
  L.mesh.add(bell,clap,bellGlow);
  // ondas de sonido: tres frentes concéntricos con vibración angular
  const SOUND_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float m=0.;
   for(int i=0;i<3;i++){float c=uP*.95-float(i)*.12;m+=band(r,c,.025+.02*(1.-uP))*step(0.,c)*(1.-float(i)*.3);}
   m*=.75+.25*sin(atan(p.y,p.x)*12.+uT*3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.5,m*uA);}`;
  const waves=TR.map((t,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(4.6-0.8*k,4.6-0.8*k),fx(SOUND_FS,{depthTest:false}));L.trail.add(m);return m;});
  // destello de los cuernos nuevos
  const hornFlash=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);
   float s=smoothstep(.1,0.,q.x*q.y*5.+min(q.x,q.y))*smoothstep(1.,.2,max(q.x,q.y));float g=pow(max(0.,1.-length(p)),3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.7,(s+g)*uA);}`,{depthTest:false}));
  L.mesh.add(hornFlash);
  const C=`const float TM=${f(TM)};const float TI=${f(TI)};const float TH0=${f(TH0)};const float TH1=${f(TH1)};const float TG0=${f(TG0)};
  const vec3 LC=${v3(LC)};const vec3 BM=${v3(BM)};const vec3 H0=${v3(HT[0])};const vec3 H1=${v3(HT[1])};const vec3 HM=${v3(HM)};`;
  // plegaria: destellos que convergen en el lanzador
  a.count+=points(L.part,45,C+`void main(){float life=.25+aSeed.y*.12;float age=(uT-aSeed.x*(TM-.05))/life;
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=LC+vec3(0.,.4,0.)+d*mix(1.6,.1,age*age);
   vA=(age>0.&&age<1.&&uT<TM+.1)?smoothstep(0.,.3,age):0.;put(p,(.1+.08*aSeed.z)*(1.-age*.5));}`,STAR4_FS);
  // lana celestial que se desprende del contorno del cordero
  a.count+=points(L.part,70,C+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-TM)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=LC+vec3(-.1+cos(an)*(.78+r.y*.25),.08+sin(an)*(.5+r.y*.2)+age*.4,(r.z-.5)*.6);
   vA=(k>=1.)?sin(age*3.14159)*.75*uE:0.;put(p,.11+.08*r.z);}`,FLUFF_FS);
  // repique: destellos que salen de la boca de la campana
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,-.2,0.));vec3 p=BM+d*(.25+1.6*aSeed.z)*(1.-exp(-t*3.));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.11+.09*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=sparks(L.part,80,TI,`${f(BM.x)},${f(BM.y)},0.`,"0.,-.3,0.",2.4,6,2);
  // los cuernos se deshacen en motas de luz que suben
  a.count+=points(L.part,60,C+`void main(){float s=TH0+aSeed.x*(TH1-TH0);float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 h=mix(HM,aSeed.y<.5?H0:H1,aSeed.z);vec3 r=rnd();
   vec3 p=h+r*.05+vec3(sin(t*5.+aSeed.w*9.)*.15,t*(.8+aSeed.w),r.z*.2*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.4));}`);
  // y renacen: luz que converge en las puntas
  a.count+=points(L.part,45,C+`void main(){float s=TG0-.25+aSeed.x*.25;float life=.25;float age=(uT-s)/life;
   vec3 h=aSeed.y<.5?H0:H1;vec3 d=normalize(rnd()+.001);vec3 p=h+d*mix(.95,.02,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.08+.06*aSeed.z);}`,STAR4_FS);
  a.count+=sparks(L.part,50,TG1-0.1,`${f(HM.x)},${f(HM.y+0.1)},0.`,"0.,.7,0.",1.6,4.5,1.8);
  // glifo sagrado bajo el lanzador y onda de repique
  const glyph=groundPlane(2.8,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.015)+band(r,.78,.01)+band(r,.85,.04)*step(.55,fract(an/6.2832*24.-uT*.1));
   m+=pow(abs(cos(an*4.)),60.)*smoothstep(.78,.2,r)*step(.12,r);
   m+=band(r,.3,.02)+smoothstep(.12,0.,r)*.4;
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.6)*1.3,m*uA);}`));
  const shock=groundPlane(4.8,-3.7,0.03,fx(RING_FS));
  L.decal.add(glyph,shock);
  const per=0.44;
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TM-0.05,TM+0.4,te)*(1-ss(TD,TE,te));
    let last=-1;for(let k=0;k<3;k++)if(te>=TR[k])last=k;
    const ik=last>=0?te-TR[last]:-1, ring=last>=0?Math.exp(-ik*8)*AMP[last]:0;
    caster.rotation.z=0.08*ss(0,TM,te)*(1-ss(TI,TI+0.4,te));
    // cordero: se revela del centro hacia fuera, respira y vibra con cada repique
    for(const [m,d] of [[lambBack,-0.45],[lambFront,0.55]]){towardCam(m.position,LC,d);billboard(m);m.visible=env>0.001;
      m.scale.setScalar(LS*(1+0.02*Math.sin(te*2.2)+0.05*ring));set(m,cl((te-TM)/0.45),env*(1+0.5*ring));}
    // campana: el vaivén crece hasta el primer repique; badajo con retraso
    const app=ss(TM,TM+0.22,te)*(1-ss(TD,TE,te)), A=0.36*ss(TM,TI,te)*(1-ss(1.45,1.85,te));
    const ph=2*Math.PI*(te-TI)/per;
    bell.visible=clap.visible=app>0.01; bell.scale.setScalar(Math.max(app*LS,0.001)); clap.scale.setScalar(Math.max(app*LS,0.001));
    bell.rotation.z=A*Math.cos(ph)+(ring*0.03*Math.sin(te*90)); clap.rotation.z=A*0.75*Math.cos(ph-0.7);
    bellMat.uniforms.uA.value=0.2*app+ring*1.2;
    towardCam(bellGlow.position,tmp.copy(BELL).add(tmp2.set(0,-0.25,0)),0.3); billboard(bellGlow); bellGlow.scale.setScalar(LS); bellGlow.material.uniforms.uA.value=app*0.2+ring*0.7;
    waves.forEach((m,k)=>{const d=te-TR[k],p=cl(d/0.7);m.visible=d>=0&&p<1;towardCam(m.position,BM,0.2);billboard(m);set(m,p,(1-p)*AMP[k]);});
    // cuernos: destello, se disuelven, vacío, vuelven a crecer con un rebote
    let s=1;
    if(te>=TH0&&te<TG0)s=1-ss(TH0,TH1,te);
    else if(te>=TG0&&te<TG1){const k=(te-TG0)/(TG1-TG0);s=(1-Math.pow(1-k,3))*(1+0.25*Math.sin(Math.PI*k));}
    hornScale(s);
    hornMat.emissiveIntensity=1.6*ss(TI,TH0,te)*(1-ss(TH0,TH1,te))+2*ss(TG0,TG0+0.1,te)*(1-ss(TG1,TG1+0.5,te));
    const hf=ss(TG0-0.05,TG0+0.05,te)*(1-ss(TG0+0.1,TG1+0.3,te));
    towardCam(hornFlash.position,HM,0.4); billboard(hornFlash,te*0.8); hornFlash.visible=hf>0.001;
    hornFlash.scale.setScalar(0.5+0.45*hf); hornFlash.material.uniforms.uA.value=hf;
    glyph.material.uniforms.uA.value=ss(0,0.3,te)*(1-ss(TD,TE,te));
    const p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*env+0.45*ring+0.4*hf;
    if(te<TM){o.g.copy(LC);o.gs=1*ss(0,TM,te);o.ga=0.25;o.li=2*ss(0,TM,te);}
    else if(te>=TG0-0.1&&te<TG1+0.3){o.g.copy(HM);o.gs=1.15;o.ga=0.4*hf+0.08;o.li=1.6+3.8*hf;}
    else{o.g.copy(BM);o.gs=1.3+1.6*ring;o.ga=0.12*app+0.55*ring;o.li=1.6*app+7*ring;}
    o.ia=last>=0?ik:ia;o.c.copy(BM);o.shake=0;o.dist=last<=0?0.6:0.3;o.flash=0;
  };
}};

// =====================================================================
// 3 · NUT CRACKER (EARS) — dos nueces de energía orbitan cada oreja cada vez más rápido (estelas circulares)
//     y salen disparadas a la vez como proyectiles gemelos contundentes
// =====================================================================
const nutEars={key:"nutEars",name:"Nut Cracker (Ears)",dur:2.0,ti:0.9,pal:"Dorado",
  phases:[["Invocación",0],["Órbita",0.2],["Disparo",0.68],["Impacto",0.9],["Fragmentos",1.08]],
build(a){
  const L=a.L,TO=0.2,TS=0.68,TI=0.9,RO=0.3,W1=1.3,W2=5.6;
  const EC=[V3(-3.74,1.92,0.32),V3(-3.74,1.92,-0.32)], HT=[V3(3.1,1.38,0.16),V3(3.1,1.12,-0.16)], CC=V3(3.1,1.25,0);
  const th=(i,t)=>{const u=Math.max(t-TO,0);return i*Math.PI+2*Math.PI*(W1*u+W2*u*u);};
  const orb=(i,t,out)=>{const an=th(i,t);return out.set(EC[i].x+Math.cos(an)*RO,EC[i].y+Math.sin(an)*RO*0.9,EC[i].z+Math.sin(an)*RO*0.3*(i?-1:1));};
  const P0=[orb(0,TS,V3(0,0,0)),orb(1,TS,V3(0,0,0))];
  const pos=(i,t,out)=>{if(t<TS)return orb(i,t,out);const k=cl((t-TS)/(TI-TS)),e=Math.pow(k,1.2);
    return out.copy(P0[i]).lerp(HT[i],e).add(tmp2.set(0,0.22*Math.sin(Math.PI*k),0));};
  const ears=mkEars(L.mesh);
  // nuez de energía: cáscara opaca arrugada; las arrugas y la costura brillan con la velocidad (uA)
  const NUT_FS=`void main(){vec3 q=normalize(vP);
   float w=abs(noise(vP*7.)*2.-1.);float wr=pow(1.-w,6.);
   vec3 shell=mix(vec3(.3,.17,.07),vec3(.62,.42,.2),.4+.6*noise(vP*14.));
   float lit=.4+.6*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float seam=band(q.z,0.,.07);
   gl_FragColor=vec4(shell*lit*(1.-wr*.45)+uC1*wr*.7*uA+mix(uC1,vec3(1.),.4)*seam*(.6+2.*uA),1.);}`;
  const nuts=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,22),fx(NUT_FS,SOLID));L.mesh.add(m);return m;});
  const GLOW_FS=`void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.3,pow(max(0.,1.-d),2.4)*uA);}`;
  const halos=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.75),fx(GLOW_FS));L.mesh.add(m);return m;});
  // estela circular: arco que persigue a la nuez; uQ acorta la cola (más velocidad → arco más largo)
  const ORBIT_FS=`uniform float uQ;
  void main(){float an=atan(vP.y,vP.x);float d=mod(uP-an,6.2832);float rr=(length(vP.xy)-${f(RO)})/.045;
   float tail=exp(-d*uQ);float prof=smoothstep(1.,0.,abs(rr));
   float n=noise(vec3(an*4.-uT*20.,rr*2.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,tail)*1.6+vec3(1.)*pow(tail,6.)*.6,prof*tail*(.6+.4*n)*uA);}`;
  const orbits=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.RingGeometry(RO-0.045,RO+0.045,72,1),fxU(ORBIT_FS,{uQ:{value:3}}));
    m.position.copy(EC[i]); m.rotation.x=(i?-1:1)*0.32; L.trail.add(m); return m;});
  // estela de vuelo: planos cruzados detrás de cada nuez
  const tg=new THREE.PlaneGeometry(1,0.32).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*6.-uT*14.,v*3.,uT));
   float al=smoothstep(u*(.5+.5*n),0.,v)*pow(u,1.4)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.6+vec3(1.)*smoothstep(.25,0.,v)*u*.5,al);}`);
  const trails=[0,1].map(()=>{const g=new THREE.Group(),t2=new THREE.Mesh(tg,tm);t2.rotation.x=Math.PI/2;g.add(new THREE.Mesh(tg,tm),t2);L.trail.add(g);return g;});
  const hitRings=HT.map(h=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // partículas
  const C=`const float TO=${f(TO)};const float TS=${f(TS)};const float TI=${f(TI)};const float RO=${f(RO)};
  const vec3 EC0=${v3(EC[0])};const vec3 EC1=${v3(EC[1])};const vec3 HT0=${v3(HT[0])};const vec3 HT1=${v3(HT[1])};
  float th(float i,float t){float u=max(t-TO,0.);return i*3.14159+6.28318*(${f(W1)}*u+${f(W2)}*u*u);}
  vec3 orb(float i,float t){float an=th(i,t);vec3 ec=i<.5?EC0:EC1;return ec+vec3(cos(an)*RO,sin(an)*RO*.9,sin(an)*RO*.3*(i<.5?1.:-1.));}
  vec3 npos(float i,float t){if(t<TS)return orb(i,t);vec3 p0=orb(i,TS);float k=clamp((t-TS)/(TI-TS),0.,1.);
   vec3 ht=i<.5?HT0:HT1;return mix(p0,ht,pow(k,1.2))+vec3(0.,.22*sin(3.14159*k),0.);}`;
  for(const i of [0,1]){
    // energía que se enrosca hacia la oreja
    a.count+=points(L.part,30,C+`void main(){float life=.2+aSeed.y*.1;float age=(uT-aSeed.x*TO)/life;
     vec3 d=normalize(rnd()+.001);vec3 tg=normalize(cross(d,vec3(0.,0.,1.))+.001);float k=age*age;
     vec3 p=(${f(i)}<.5?EC0:EC1)+(d*cos(k*3.)+tg*sin(k*3.))*mix(1.,.05,k);
     vA=(age>0.&&age<1.&&uT<TO+.12)?smoothstep(0.,.3,age):0.;put(p,.04+.05*aSeed.z);}`);
    // chispas despedidas en tangente durante la órbita
    a.count+=points(L.part,70,C+`void main(){float s=TO+aSeed.x*(TS-TO);float life=.2+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p0=orb(${f(i)},s);vec3 tg=normalize(orb(${f(i)},s+.004)-p0+.00001);vec3 r=rnd();
     vec3 p=p0+tg*t*(1.+1.2*aSeed.z)+r*.04+vec3(0.,-1.5*t*t,0.);
     vA=(age>0.&&age<1.)?(1.-age)*smoothstep(TO,TS,s+.15):0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`);
    // brasas de vuelo
    a.count+=points(L.part,40,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=npos(${f(i)},s)+r*.06+vec3(-.8*t,.3*t,r.z*.3*t);
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.04*aSeed.z)*(1.-age*.5));}`);
    a.count+=sparks(L.part,70,TI,`${f(HT[i].x)},${f(HT[i].y)},${f(HT[i].z)}`,"-.4,.4,"+(i?"-.3":".3"),3,7.5,3.2);
  }
  // cáscara rota: lascas marrones (mezcla normal) con filo dorado, y esquirlas de energía
  const SHELL_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.3+q.y;float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.3,.17,.07),vec3(.6,.4,.18),vMix)+uC1*smoothstep(.38,.5,d)*.6,a);}`;
  const CI=`const vec3 CC=${v3(CC)};const float TI=${f(TI)};`;
  a.count+=points(L.part,80,CI+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.5,0.))*(1.6+3.2*aSeed.z);vec3 p=CC+vec3(0.,0.,(aSeed.w-.5)*.35)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.055*aSeed.w);}`,SHELL_FS,NB);
  a.count+=points(L.part,45,CI+`void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.3,0.))*(2.4+3.*aSeed.z);vec3 p=CC+v*t*(1.-.4*min(t,1.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,25,CI+`void main(){float s=TI+aSeed.x*.15;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.4,.3,0.));vec3 p=CC+d*(.3+.8*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,-.2*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.24+.25*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  const shock=groundPlane(4,3.3,0.03,fx(RING_FS));
  L.decal.add(shock);
  const np=V3(0,0,0), dir=V3(0,0,0), mid=V3(0,0,0);
  a.pose=function(te,o){
    hornScale(1);
    const ia=te-TI, app=ss(TO-0.15,TO+0.1,te), u=Math.max(te-TO,0), spd=cl((W1+2*W2*Math.min(u,TS-TO))/(W1+2*W2*(TS-TO)));
    caster.rotation.z=te<TS?0:0.14*ss(TS,TS+0.05,te)*(1-ss(TS+0.1,TS+0.6,te));
    earPose(ears,te<TS?spd*1.4:0,ss(0,TO,te)*(1-ss(TS,TS+0.4,te)),0.15*spd*(te<TS?1:0));
    mid.set(0,0,0);
    for(const i of [0,1]){
      const n=nuts[i], h=halos[i]; pos(i,te,np); mid.addScaledVector(np,0.5);
      n.visible=app>0.01&&te<TI; n.position.copy(np); n.rotation.set(te*9,te*(14+20*spd),0.3);
      n.scale.set(0.125*app,0.16*app,0.125*app); n.material.uniforms.uA.value=te<TS?spd:1;
      towardCam(h.position,np,0.2); billboard(h); h.visible=n.visible; h.scale.setScalar(0.6+0.5*spd); h.material.uniforms.uA.value=app*(0.25+0.4*spd);
      const ob=orbits[i], th0=th(i,te); ob.visible=te>=TO-0.05&&te<TS+0.25;
      set(ob,((th0%(2*Math.PI))+2*Math.PI)%(2*Math.PI),app*(te<TS?0.5+0.5*spd:1-cl((te-TS)/0.25)));
      ob.material.uniforms.uQ.value=3.2-2.6*spd;
      const tr=trails[i]; tr.visible=te>=TS&&ia<0.15; tr.position.copy(np);
      dir.copy(HT[i]).sub(P0[i]).normalize(); tr.quaternion.setFromUnitVectors(XA,dir);
      tr.scale.set(Math.max(Math.min(np.distanceTo(P0[i]),2),0.001),0.8,0.8); tm.uniforms.uA.value=ia>0?1-cl(ia/0.15):1;
      const p=cl(ia/0.35), hr=hitRings[i]; towardCam(hr.position,HT[i],0.3); billboard(hr); hr.visible=ia>=0&&p<1; set(hr,p,1-p);
    }
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
    // golpe gemelo: aplasta y empuja
    const hit=hitK(ia,6); target.scale.set(1+0.09*hit,1-0.14*hit,1+0.09*hit);
    target.position.x=3.4+0.2*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.2*Math.cos(ia*14);
    if(te<TO){o.g.set(-3.74,1.92,0);o.gs=0.8*app+0.35;o.ga=0.25*ss(0,TO,te);o.li=1.6*ss(0,TO,te);}
    else if(te<TS){o.g.set(-3.74,1.92,0);o.gs=0.85+0.6*spd;o.ga=0.2+0.28*spd;o.li=1.6+3*spd;}
    else if(te<TI){o.g.copy(mid);o.gs=1.15;o.ga=0.45;o.li=4;}
    else{o.g.copy(CC);o.gs=1.3+3.6*ia;o.ga=Math.exp(-ia*12)*0.75;o.li=9*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(CC);o.shake=0;o.dist=0.8;
  };
}};

// =====================================================================
// 4 · NYAN — salto felino con estela de arcoíris cálido escalonada y huellas; zarpazo de cuatro uñas
//     y marcas de corte que, si el rival sangra, brillan muchísimo y gotean
// =====================================================================
const nyan={key:"nyan",name:"Nyan",dur:2.0,ti:0.5,pal:"Rosa",vlabel:"Rival",
  variants:[["normal","Sin sangrado"],["sangra","Sangrando"]],v:"normal",
  phases:[["Acecho",0],["Salto",0.18],["Zarpazo",0.5],["Marcas",0.7],["Regreso",1.05]],
build(a){
  const L=a.L,TJ=0.18,TL=0.44,TI=0.5,TB=1.0,TBE=1.45,X0=-3.85,XB=2.05,JH=0.7,Y0=0.85,TC=V3(3.15,1.2,0);
  const VG=variantGroups(a,["normal","sangra"]);
  const jmp=te=>{const k=cl((te-TJ)/(TL-TJ));return k*k*(3-2*k)*0.4+k*0.6;};
  const pathAt=(t,out)=>out.set(X0+(XB-X0)*t,Y0+JH*Math.sin(Math.PI*t),0.02);
  // arcoíris cálido con escalones "de píxel" que ondulan
  const rainbow=new THREE.Mesh(ribbonGeo(pathAt,180,0.5),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float st=step(.5,fract(u*26.-uT*2.5));float v=vUv.y+(st-.5)*.07;
   if(v<.02||v>.98)discard;
   float b=floor(v*6.);
   vec3 c=b<1.?vec3(1.,.3,.55):b<2.?vec3(1.,.48,.72):b<3.?vec3(1.,.86,.25):b<4.?vec3(1.,.66,.15):b<5.?vec3(1.,.42,.1):vec3(1.,.18,.16);
   float edge=smoothstep(.02,.06,v)*smoothstep(.98,.94,v);
   float sh=.8+.2*noise(vec3(u*30.,v*6.,uT*2.));
   gl_FragColor=vec4(mix(c,uC1,.12)*1.25*sh,edge*exp(-d*2.2)*smoothstep(0.,.04,u)*uA*.9);}`));
  L.trail.add(rainbow);
  // zarpazo: cuatro uñas finas con gradiente cálido por uña
  const claw=new THREE.Mesh(new THREE.PlaneGeometry(1.95,1.6),fx(`void main(){vec2 p=vUv;float u=p.x;float m=0.;float id=0.;
   for(int i=0;i<4;i++){float off=(float(i)-1.5)*.11;float y=(p.y-.5-off)-.13*(1.-pow(2.*u-1.,2.));
    float w=.008+.03*sin(3.14159*u);float k=smoothstep(w,0.,abs(y));if(k>m){m=k;id=float(i);}}
   float d=uP-u;float sweep=step(0.,d)*exp(-d*2.2)*smoothstep(0.,.05,u)*smoothstep(1.,.92,u);
   vec3 warm=id<1.?vec3(1.,.25,.3):id<2.?vec3(1.,.55,.15):id<3.?vec3(1.,.85,.25):vec3(1.,.45,.7);
   gl_FragColor=vec4(mix(warm,vec3(1.),smoothstep(.6,1.,m)*.7)*1.7,m*sweep*uA);}`,{depthTest:false}));
  // marcas de corte: tres tajos paralelos; uQ=1 si sangra (brillo intenso, latido y goteo con longitud uD)
  const marks=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),fxU(`uniform float uQ;uniform float uD;
  void main(){vec2 p=(vUv-.5)*2.;float m=0.;float core=0.;float drip=0.;
   for(int i=0;i<3;i++){float off=(float(i)-1.)*.32;
    vec2 q=vec2(p.x*.8+p.y*.6,-p.x*.6+p.y*.8);
    float len=smoothstep(.75,.55,abs(q.x));float w=.035*(1.-q.x*q.x*1.4)+.012;
    float y=q.y-off+(noise(vec3(q.x*8.,float(i),1.))-.5)*.05;
    m=max(m,smoothstep(w*(1.+uQ*.8),0.,abs(y))*len);core=max(core,smoothstep(w*.35,0.,abs(y))*len);
    float xs=-.3+float(i)*.32;float y0=(off+.6*xs)/.8;float yb=y0-uD*(.8+.3*float(i));
    float th=smoothstep(.022,0.,abs(p.x-xs))*step(yb,p.y)*step(p.y,y0);
    float bead=smoothstep(.06,.02,length(p-vec2(xs,yb)));drip=max(drip,max(th,bead));}
   float n=noise(vec3(p*5.,uT*2.));
   vec3 cn=mix(uC2,uC1,core)*1.4;
   vec3 cb=mix(vec3(1.,.12,.2),vec3(1.,.85,.8),core)*(2.+1.2*uP);
   vec3 c=mix(cn,cb,uQ)+vec3(1.)*core*(.3+uQ*.7);
   float a=(m*(.55+uQ*(.9+.5*uP))+drip*uQ*.9)*(.85+.15*n);
   gl_FragColor=vec4(mix(c,vec3(1.,.15,.25)*2.,drip*(1.-m)*uQ),a*uA);}`,{uQ:{value:0},uD:{value:0}},{depthTest:false}));
  L.mesh.add(claw,marks);
  // huellas de zarpa en el despegue y el aterrizaje (uP / uQ: aparición de cada par)
  const SX=7,SW=1.2,SC=-0.8;
  const paws=groundPlane(SX,SC,0.02,fxU(`uniform float uQ;
  float paw(vec2 q){float d=length(q*vec2(1.,1.25))-.1;
   d=min(d,length(q-vec2(-.1,.12))-.04);d=min(d,length(q-vec2(-.035,.165))-.04);
   d=min(d,length(q-vec2(.035,.165))-.04);d=min(d,length(q-vec2(.1,.12))-.04);return d;}
  void main(){vec2 w=vec2(${f(SC-SX/2)}+vUv.x*${f(SX)},(.5-vUv.y)*${f(SW)});float m=0.;
   for(int i=0;i<2;i++){float zc=(float(i)-.5)*.36;
    float d0=paw(vec2(w.y-zc,w.x+3.5)*1.4);float d1=paw(vec2(w.y-zc,w.x-1.78)*1.4);
    m+=smoothstep(.02,-.01,d0)*uP+band(d0,.03,.03)*uP*.6+smoothstep(.02,-.01,d1)*uQ+band(d1,.03,.03)*uQ*.6;}
   gl_FragColor=vec4(mix(uC1,vec3(1.,.8,.5),.3)*1.3,m*uA);}`,{uQ:{value:0}}),SW);
  // surcos en el suelo bajo el rival
  const gash=groundPlane(1.9,3.4,0.02,fx(`void main(){vec2 p=vUv;float m=0.;
   for(int i=0;i<4;i++){float off=(float(i)-1.5)*.12;float y=p.y-.5-off-(p.x-.5)*.5;
    m=max(m,smoothstep(.02*(1.-abs(p.x-.5)),0.,abs(y))*step(p.x,uP)*smoothstep(.95,.7,abs(p.x-.5)*2.));}
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.6,m*uA);}`));
  L.decal.add(paws,gash);
  const C=`const float TJ=${f(TJ)};const float TL=${f(TL)};const float TI=${f(TI)};const vec3 TC=${v3(TC)};
  float jmp(float te){float k=clamp((te-TJ)/(TL-TJ),0.,1.);return k*k*(3.-2.*k)*.4+k*.6;}
  vec3 path(float t){return vec3(${f(X0)}+${f(XB-X0)}*t,${f(Y0)}+${f(JH)}*sin(3.14159*t),.02);}`;
  let base=0;
  // destellos de estrella que suelta el arcoíris
  base+=points(L.part,45,C+`void main(){float s=TJ+aSeed.x*(TL-TJ);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=path(jmp(s))+vec3(-.2-aSeed.z*.6,(aSeed.w-.5)*1.,(aSeed.y-.5)*.6)+vec3(-.4*t,0.,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*(.6+.4*sin(t*30.+aSeed.x*40.)):0.;put(p,.1+.1*aSeed.z);}`,STAR4_FS);
  // polvo al despegar y al aterrizar
  for(const [t0,x] of [[TJ,-3.7],[TL,XB]])base+=points(L.part,20,C+`void main(){float s=${f(t0)}+aSeed.x*.05;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(vec3(rnd().x,.0,rnd().z)+.001);vec3 p=vec3(${f(x)},.08,0.)+d*(.25+.65*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.18+.18*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // estrellitas en las puntas de las uñas y chispas del corte
  base+=points(L.part,20,C+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=TC+vec3((aSeed.z-.5)*1.1,(aSeed.w-.5)*.9,.5)+normalize(rnd()+.001)*t*.9;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.12+.09*aSeed.y);}`,STAR4_FS);
  base+=sparks(L.part,110,TI,`${f(TC.x)},${f(TC.y)},.3`,".5,-.3,.3",2.4,7,3);
  // sangrado: gotas luminosas que caen de las marcas y salpicadura en el golpe
  const DROP_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;q.x*=1.8;q.y*=q.y<0.?.55:1.;float d=length(q);
   float a=smoothstep(.22,.1,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(vec3(1.,.14,.22)*1.7+vec3(1.,.8,.8)*smoothstep(.1,0.,length(q-vec2(-.04,.04)))*.8,a);}`;
  VG.sangra.n=points(VG.sangra.part,70,C+`void main(){float life=.55+aSeed.y*.3;float per=life+.25;float k=(uT-TI-.1)/per+aSeed.x;float c=floor(k);
   float t=fract(k)*per;vec3 r=rr(c);
   vec3 p=TC+vec3(-.3+r.x*.6,(r.y-.5)*.5,.4)+vec3(0.,-3.6*t*t,0.);
   float env=smoothstep(TI,TI+.1,uT)*(1.-smoothstep(1.6,2.,uT));
   vA=(k>=1.&&t<life&&p.y>.02)?env:0.;put(p,.06+.04*r.z);}`,DROP_FS)
   +points(VG.sangra.part,55,C+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.5,.6))*(1.6+2.3*aSeed.z);vec3 p=TC+vec3(0.,0.,.3)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.06+.05*aSeed.w);}`,DROP_FS)
   +sparks(VG.sangra.part,60,TI+0.02,`${f(TC.x)},${f(TC.y)},.3`,".3,.4,.5",2.4,6.5,3);
  VG.normal.n=0;
  a.setVariant=v=>{if(!VG[v])v="normal";a.v=v;for(const k in VG)for(const l of VFX.LK)VG[k][l].visible=k===v;a.count=base+VG[v].n;};
  a.pose=function(te,o){
    hornScale(1);
    const bleed=a.v==="sangra"?1:0, ia=te-TI, t=jmp(te);
    let cx,cy;
    if(te<TB){cx=te<TJ?-3.7-0.15*ss(0,TJ,te):X0+(XB-X0)*t;cy=te>=TJ&&te<TL?JH*Math.sin(Math.PI*t):0;}
    else{const k=cl((te-TB)/(TBE-TB)),e=k*k*(3-2*k);cx=XB+(-3.7-XB)*e;cy=0.7*Math.sin(Math.PI*k);}
    caster.position.set(cx,cy,0);
    const crouch=ss(0,TJ,te)*(1-ss(TJ,TJ+0.05,te)), land=te>=TL?Math.exp(-(te-TL)*14)*ss(TL,TL+0.02,te):0;
    caster.scale.set(1+0.1*(crouch+land),1-0.16*(crouch+land),1+0.1*(crouch+land));
    caster.rotation.z=-0.35*(te>=TJ&&te<TL?Math.sin(Math.PI*cl((te-TJ)/(TL-TJ))):0)-0.45*ss(TL,TI,te)+0.45*ss(TI+0.05,TI+0.35,te)
      +(te>=TB?0.3*Math.sin(Math.PI*cl((te-TB)/(TBE-TB))):0);
    set(rainbow,te<TJ?0:(te<TL?t:1),ss(TJ,TJ+0.05,te)*(1-ss(TI+0.15,TB+0.25,te)));
    rainbow.visible=te>=TJ&&te<TB+0.25;
    const sw=cl((te-TL+0.02)/(TI-TL+0.1));
    towardCam(claw.position,TC,0.7); billboard(claw,-0.65); claw.visible=te>=TL-0.04&&ia<0.5; set(claw,sw*1.3,1-cl(ia/0.5));
    const menv=ia>=0?ss(TI,TI+0.06,te)*(bleed?1-ss(1.6,2.0,te):1-ss(TI+0.4,1.2,te)):0;
    const beat=Math.pow(0.5+0.5*Math.sin((te-TI)*11),3);
    towardCam(marks.position,TC,0.45); billboard(marks); marks.visible=menv>0.001;
    set(marks,beat,menv); marks.material.uniforms.uQ.value=bleed; marks.material.uniforms.uD.value=bleed?0.05+0.45*cl((te-TI-0.1)/1.1):0;
    set(paws,ss(TJ,TJ+0.05,te),0.75*(1-ss(1.45,1.95,te))); paws.material.uniforms.uQ.value=ss(TL,TL+0.05,te);
    set(gash,ss(TI,TI+0.15,te),ia>=0?(1-cl(ia/1.1))*(0.4+0.3*bleed):0);
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.2; target.rotation.z=-hit*0.22*Math.cos(ia*15);
    if(bleed){o.em=menv*(0.2+0.35*beat);o.emc.setRGB(1,0.12,0.2);}
    if(te<TJ){o.g.set(-3.5,1.0,0);o.gs=0.5;o.ga=0.16*crouch;o.li=0.8;}
    else if(te<TI){o.g.set(cx+0.3,cy+0.9,0);o.gs=1;o.ga=0.38;o.li=3;}
    else{o.g.copy(TC);o.gs=1.1+2.4*ia;o.ga=Math.exp(-ia*11)*0.65+0.12*menv*bleed*beat;o.li=7*Math.exp(-ia*6)+2.4*menv*bleed*beat;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;
  };
}};

// =====================================================================
// 5 · FOXY (EARS) — orejas de zorro afinan una mira láser que tiembla y se estabiliza sobre el rival más
//     lejano; disparo de francotirador ámbar con núcleo blanco que lo atraviesa y sale por detrás
// =====================================================================
const foxyEars={key:"foxyEars",name:"Foxy (Ears)",dur:2.0,ti:0.8,pal:"Ámbar",enemies:2,
  phases:[["Puntería",0],["Fijación",0.42],["Disparo",0.75],["Perforación",0.8],["Disipación",1.2]],
build(a){
  const L=a.L,TK=0.42,TS=0.75,TI=0.8,TF=1.2,TE=1.6;
  const M=V3(-3.42,2.0,0), EP=ENEMY_POS[1].clone().add(V3(0,1.2,0));
  const DIR=EP.clone().sub(M).normalize(), DE=EP.distanceTo(M)-0.36, LT=DE+3.6, SPD=DE/(TI-TS);
  const NP=EP.clone().addScaledVector(DIR,-0.36), XP=EP.clone().addScaledVector(DIR,0.36);
  const hd=te=>te<TS?0:Math.min((te-TS)*SPD,LT);
  const ears=mkEars(L.mesh,1.5);
  // mira: línea fina discontinua; uP = estabilidad (0 temblando, 1 fijada)
  const sight=new THREE.Mesh(beamGeo(0.012,6),fx(`void main(){float u=vUv.y;float dash=.55+.45*step(.5,fract(u*60.-uT*8.));
   gl_FragColor=vec4(mix(uC2,uC1,uP)*1.8+vec3(1.)*uP*.4,dash*uA*(.4+.6*uP)*smoothstep(0.,.02,u));}`));
  const reticle=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float s=mix(.95,.45,uP);
   float br=step(abs(q.x-s),.03)*step(q.y,s+.03)*step(s-.22,q.y)+step(abs(q.y-s),.03)*step(q.x,s+.03)*step(s-.22,q.x);
   float dt=smoothstep(.08,.04,length(p));float rg=band(length(p),.3,.02)*uP*step(.5,fract(atan(p.y,p.x)/6.2832*4.+uT*.6));
   gl_FragColor=vec4(mix(uC1,vec3(1.),uP*.5)*1.7,(min(br,1.)+dt*uP+rg)*uA);}`,{depthTest:false}));
  // haz: núcleo blanco + halo ámbar con vetas que corren hacia delante
  const core=new THREE.Mesh(beamGeo(0.035,10),fx(`void main(){
   gl_FragColor=vec4(vec3(1.,.97,.9)*1.8+uC1*.4,(.85+.15*sin(vUv.y*80.-uT*60.))*uA);}`));
  const halo=new THREE.Mesh(beamGeo(0.15,20),fx(`void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),1.4);
   float n=noise(vec3(vUv.y*60.-uT*30.,vUv.x*6.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,c)*1.5,c*(.45+.55*n)*uA);}`));
  L.trail.add(sight,core,halo); L.mesh.add(reticle);
  const muzzle=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),fx(RING_FS,{depthTest:false}));
  const entry=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(RING_FS,{depthTest:false}));
  // salida: destello alargado en la dirección del haz
  const exitF=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.95),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float a=exp(-abs(p.y)*9.)*smoothstep(1.,0.,abs(p.x))+pow(max(0.,1.-length(p*vec2(1.,2.))),3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.7,a*uA);}`,{depthTest:false}));
  L.mesh.add(muzzle,entry,exitF);
  // surco quemado en el suelo bajo la línea de tiro
  const hl=Math.hypot(DIR.x,DIR.z);
  const burn=new THREE.Mesh(new THREE.PlaneGeometry(1,0.5).translate(0.5,0,0).rotateX(-Math.PI/2),fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*40.,v*3.,1.));float core=smoothstep(.3+.2*n,0.,v);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.5,(core*.8+smoothstep(1.,0.,v)*.12)*step(u,uP)*uA);}`));
  burn.position.set(M.x,0.02,M.z); burn.rotation.y=Math.atan2(-DIR.z,DIR.x); burn.scale.set(LT*hl,1,1); L.decal.add(burn);
  const scorch=groundPlane(1.4,EP.x,0.015,fx(SCORCH_FS)); scorch.position.z=EP.z; L.decal.add(scorch);
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TK=${f(TK)};const vec3 M=${v3(M)};const vec3 DIR=${v3(DIR)};
  const float LT=${f(LT)};const float SPD=${f(SPD)};const vec3 EP=${v3(EP)};const vec3 XP=${v3(XP)};`;
  // carga: motas que convergen en el punto de tiro entre las orejas
  a.count+=points(L.part,80,C+`void main(){float life=.28+aSeed.y*.12;float age=(uT-aSeed.x*(TS-.2))/life;float k=age*age;
   vec3 d=normalize(rnd()+.001);vec3 tg=normalize(cross(d,vec3(.13,1.,.07)));vec3 p=M+(d*cos(k*2.)+tg*sin(k*2.))*mix(1.1,.03,k);
   vA=(age>0.&&age<1.&&uT<TS)?smoothstep(0.,.25,age)*(.5+.5*smoothstep(0.,TK,uT)):0.;put(p,(.04+.05*aSeed.z)*(1.-k*.5));}`);
  // destellos a lo largo de la mira ya fijada
  a.count+=points(L.part,35,C+`void main(){float L_=distance(M,EP);float u=aSeed.x;vec3 p=M+normalize(EP-M)*u*L_;
   float tw=pow(.5+.5*sin(uT*14.+aSeed.y*40.),6.);
   vA=(uT>TK&&uT<TS)?tw*smoothstep(TK,TK+.12,uT):0.;put(p,.065);}`,STAR4_FS);
  // calor que sube a lo largo del haz
  a.count+=points(L.part,120,C+`void main(){float s=TS+aSeed.x*.4;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float d=aSeed.z*LT;float h=min((s-TS)*SPD,LT);vec3 r=rnd();
   vec3 p=M+DIR*d+r*.06+vec3(sin(t*7.+aSeed.w*9.)*.05,t*(.4+.45*aSeed.w),0.);
   vA=(age>0.&&age<1.&&d<=h)?(1.-age)*.7:0.;put(p,(.025+.04*aSeed.w)*(1.-age*.4));}`);
  // salida por detrás: chorro en cono a lo largo del haz y esquirlas
  a.count+=points(L.part,100,C+`void main(){float s=TI+aSeed.x*.08;float life=.4+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(DIR*2.2+rnd()*.9)*(2.4+3.6*aSeed.z);vec3 p=XP+v*t*(1.-.35*min(t,1.))+vec3(0.,-2.*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.06*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,35,C+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(DIR*1.5+rnd()+vec3(0.,.6,0.))*(2.+2.4*aSeed.z);vec3 p=XP+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.045*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,90,TI,`${f(NP.x)},${f(NP.y)},${f(NP.z)}`,`${f(-DIR.x*0.4)},.5,${f(-DIR.z*0.4)}`,2.4,6,2.5);
  a.count+=sparks(L.part,110,TI+0.01,`${f(XP.x)},${f(XP.y)},${f(XP.z)}`,`${f(DIR.x*1.3)},.2,${f(DIR.z*1.3)}`,3,8.5,2.2);
  const aim=V3(0,0,0), hp=V3(0,0,0), kb=V3(DIR.x,0,DIR.z).normalize();
  a.pose=function(te,o){
    hornScale(1);
    const ia=te-TI, lock=ss(0.1,TK,te), j=1-lock, h=hd(te), fire=te>=TS;
    caster.rotation.z=0.03*Math.sin(te*5)*j+(fire?0.14*ss(TS,TS+0.04,te)*(1-ss(TS+0.1,TS+0.6,te)):0);
    earPose(ears,0.3+lock+(fire?Math.exp(-(te-TS)*6):0),ss(0,0.2,te)*(1-ss(TF,TE,te)),-0.15*lock);
    // mira temblorosa que se estabiliza
    aim.set(EP.x+Math.sin(te*15)*0.55*j,EP.y+Math.sin(te*19+1)*0.4*j,EP.z+Math.sin(te*13+2)*0.55*j);
    sight.visible=!fire||te<TS+0.03; aimBeam(sight,M,aim,1+0.6*lock);
    set(sight,lock,ss(0,0.15,te)*(fire?0:1));
    towardCam(reticle.position,aim,0.6); billboard(reticle,te*(1-lock)*2); reticle.visible=te<TS+0.12;
    reticle.scale.setScalar(0.75+0.3*j); set(reticle,lock,ss(0,0.15,te)*(fire?1-cl((te-TS)/0.12):1));
    // disparo
    const th=(1+0.6*Math.exp(-Math.max(te-TS,0)*10))*(1-ss(TF,TE,te));
    core.visible=halo.visible=fire&&te<TE; hp.copy(M).addScaledVector(DIR,Math.max(h,0.001));
    aimBeam(core,M,hp,th); aimBeam(halo,M,hp,th*(0.8+0.2*Math.sin(te*50)));
    core.material.uniforms.uA.value=0.9; halo.material.uniforms.uA.value=0.75;
    let p=cl((te-TS)/0.3); towardCam(muzzle.position,M,0.25); billboard(muzzle); muzzle.visible=fire&&p<1; set(muzzle,p,1-p);
    p=cl(ia/0.4); towardCam(entry.position,NP,0.3); billboard(entry); entry.visible=ia>=0&&p<1; set(entry,p,1-p);
    towardCam(exitF.position,tmp.copy(XP).addScaledVector(DIR,0.5),0.2); billboard(exitF,Math.atan2(DIR.y,DIR.x));
    exitF.visible=ia>=0&&ia<0.45; exitF.scale.set(1+1.5*cl(ia/0.3),1,1); exitF.material.uniforms.uA.value=ia>=0?0.85*Math.exp(-ia*7):0;
    set(burn,h/LT,fire?0.7*(1-ss(TF,1.9,te)):0);
    scorch.material.uniforms.uA.value=ia>=0?0.7*(1-cl(ia/1.1)):0;
    // rival lejano: retroceso en la dirección del disparo y brillo de perforación
    const hit=hitK(ia,5), e1=enemies[1], burnE=ia>=0?1-ss(TF,TE,te):0;
    e1.position.addScaledVector(kb,0.3*hit*(1-Math.exp(-Math.max(ia,0)*20))); e1.rotation.z=-hit*0.28*Math.cos(ia*14);
    e1.userData.m.emissive.copy(U.uC1.value); e1.userData.m.emissiveIntensity=1.2*hitK(ia,7)+0.28*burnE;
    // los demás solo acusan el paso del haz
    const wake=fire?ss(TS,TS+0.04,te)*Math.exp(-(te-TS)*4):0;
    target.rotation.z=0.1*wake*Math.sin((te-TS)*30); enemies[0].rotation.z=-0.06*wake*Math.sin((te-TS)*26);
    if(!fire){o.g.copy(M);o.gs=0.5+0.7*lock;o.ga=0.2+0.28*lock;o.li=1.2+2*lock;}
    else if(ia<0){o.g.copy(hp);o.gs=1.45;o.ga=0.72;o.li=6;}
    else{o.g.copy(EP);o.gs=1.3+3.6*ia;o.ga=Math.exp(-ia*10)*0.72+0.08*burnE;o.li=9*Math.exp(-ia*5)+1.5*burnE;}
    o.ia=ia;o.c.copy(EP);o.shake=0;o.dist=0.7;o.flash=0;
  };
}};

// =====================================================================
// 6 · PUPPY (EAR) — grilletes y raíces oscuras atan los pies del escuadrón; un ladrido dorado se expande
//     en anillos sónicos que rompen cada atadura al pasar y dejan rayas de celeridad
// =====================================================================
const puppy={key:"puppyEar",name:"Puppy (Ear)",dur:2.2,ti:0.72,pal:"Dorado",allies:2,
  phases:[["Ataduras",0],["Inspiración",0.4],["Ladrido",0.65],["Liberación",0.72],["Celeridad",1.1],["Fin",1.85]],
build(a){
  const L=a.L,TIN=0.4,TB=0.65,TI=0.72,TE=1.95,RM=3.6,RD=0.6,MO=V3(-3.43,1.55,0),SH=1.3;
  const UN=[V3(-3.7,0,0),ALLY_POS[0].clone(),ALLY_POS[1].clone()], DUM=[caster,allies[0],allies[1]];
  const delay=d=>RD*(1-Math.sqrt(Math.max(0,1-d/RM)));
  const TBk=UN.map(u=>TI+delay(Math.hypot(u.x-UN[0].x,u.z-UN[0].z)));
  const ears=mkEars(L.mesh);
  // grillete: hierro opaco (mezcla normal) con runas violetas; uQ disuelve con borde dorado
  const SHACKLE_FS=`uniform float uQ;
  void main(){float n=noise(vP*9.+vec3(3.));float th=uQ*1.2-.1;if(n<th)discard;
   float edge=smoothstep(.12,0.,n-th)*step(.001,uQ);
   float link=step(.5,fract(vUv.x*22.));
   float lit=.35+.65*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   vec3 iron=mix(vec3(.12,.1,.14),vec3(.32,.3,.36),link)*lit;
   float rune=band(fract(vUv.x*11.+uT*.5),.5,.06)*(1.-uQ);
   gl_FragColor=vec4(iron+vec3(.55,.2,.85)*rune*1.4+mix(uC1,vec3(1.),.4)*edge*2.5,uA);}`;
  // raíces de maldición en el suelo (mezcla normal), se queman con el paso del anillo
  const ROOT_FS=`uniform float uQ;
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float j=noise(vec3(r*4.,an*2.,1.))-.5;
   float rays=pow(1.-abs(fract(an*1.4+j*.5+r*.3)*2.-1.),10.);
   float m=rays*smoothstep(1.,.35,r)*step(.3,r);
   float burn=band(r,mix(.3,1.,uQ),.1)*step(.001,uQ)*step(uQ,.99);
   gl_FragColor=vec4(mix(vec3(.05,.03,.07),vec3(.5,.18,.7),rays*.5)+uC1*burn*2.,(m*.85*(1.-uQ)+burn*m)*uA);}`;
  const binds=UN.map(u=>{
    const g=new THREE.Group(); g.position.copy(u); L.mesh.add(g);
    const mat=fxU(SHACKLE_FS,{uQ:{value:0}},NB);
    for(const [y,r] of [[0.16,0.45],[0.34,0.43]]){const t=new THREE.Mesh(new THREE.TorusGeometry(r,0.04,8,40).rotateX(-Math.PI/2),mat);t.position.y=y;g.add(t);}
    const root=groundPlane(1.8,u.x,0.016,fxU(ROOT_FS,{uQ:{value:0}},NB)); root.position.z=u.z; L.decal.add(root);
    return {g,mat,root};});
  // anillos sónicos: paredes cilíndricas doradas (tres ecos) + frente en el suelo
  const SHELL_FS=`void main(){float h=vP.y/${f(SH)}+.5;
   float rip=band(fract(h*5.-uT*3.),.5,.2);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,fr+rip*.5)*1.5,(fr*.6+rip*.25+.05)*pow(1.-h,1.6)*uA);}`;
  const ECHO=[[0,0.8],[0.1,0.48],[0.2,0.28]];
  const shells=ECHO.map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,SH,64,1,true),fx(SHELL_FS));m.position.set(UN[0].x,SH/2,0);L.trail.add(m);return m;});
  const SG=2*RM/0.95;
  const ground=groundPlane(SG,UN[0].x,0.03,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float m=0.;
   for(int i=0;i<3;i++){float c=uP*.95-float(i)*.07;m+=band(r,c,.018+.02*(1.-uP))*step(0.,c)*(1.-float(i)*.3);}
   m*=.7+.3*sin(atan(p.y,p.x)*16.-uT*6.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.6,m*uA);}`));
  L.decal.add(ground);
  // ladrido visible: arcos ")))" que salen de la boca
  const bark=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){vec2 p=(vUv-vec2(.15,.5))*2.;float r=length(p);float an=atan(p.y,p.x);
   float cone=smoothstep(.75,.5,abs(an));float m=0.;
   for(int i=0;i<3;i++){float c=uP*1.6-float(i)*.28;m+=band(r,c,.05)*step(0.,c)*step(c,1.6);}
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.7,m*cone*uA*smoothstep(1.7,1.,r));}`,{depthTest:false}));
  L.mesh.add(bark);
  // partículas
  const CURSE_FS=DOT_FS("vec3(.6,.25,.9)*1.3");
  const SHARD_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.6;float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(.14,.12,.17),vec3(.4,.38,.44),vMix)+uC1*smoothstep(.35,.5,d)*.5,a);}`;
  const STREAK_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float a=smoothstep(.06,0.,abs(q.y))*smoothstep(.5,0.,abs(q.x))*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4+.4*smoothstep(.1,0.,abs(q.y)))*1.5,a);}`;
  UN.forEach((u,i)=>{
    const tb=TBk[i], C=`const float TB=${f(tb)};const vec3 UP=${v3(u)};const float TE=${f(TE)};`;
    a.count+=points(L.part,25,C+`void main(){float life=.7+aSeed.y*.4;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float an=r.x*6.2832;vec3 p=UP+vec3(cos(an)*(.45+r.y*.2),.05+age*.7,sin(an)*(.45+r.y*.2));
     vA=(k>=1.&&uT<TB)?sin(age*3.14159)*.8:0.;put(p,.05+.04*r.z);}`,CURSE_FS);
    a.count+=points(L.part,25,C+`void main(){float s=TB+aSeed.x*.04;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vec3 r=rnd();
     vec3 v=normalize(vec3(r.x,0.,r.z)+.001)*(1.2+1.8*aSeed.z)+vec3(0.,1.2+1.5*aSeed.y,0.);
     vec3 p=UP+vec3(0.,.25,0.)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.045+.045*aSeed.w);}`,SHARD_FS,NB);
    a.count+=points(L.part,30,C+`void main(){float k=(uT-TB)/.32+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     float env=smoothstep(TB,TB+.1,uT)*(1.-smoothstep(TE-.5,TE,uT));
     vec3 p=UP+vec3(.5-age*1.5,.15+r.y*1.05,(r.z-.5)*.85);
     vA=(k>=1.)?sin(age*3.14159)*env*.85:0.;put(p,.27+.22*r.x);}`,STREAK_FS);
    a.count+=sparks(L.part,50,tb,`${f(u.x)},.3,${f(u.z)}`,"0.,.7,0.",2.2,6,2.4);
  });
  const C=`const float TIN=${f(TIN)};const float TB=${f(TB)};const float TI=${f(TI)};const vec3 MO=${v3(MO)};const vec3 C0=${v3(UN[0])};`;
  // inspiración: aire que entra hacia la boca
  a.count+=points(L.part,50,C+`void main(){float life=.22+aSeed.y*.1;float age=(uT-TIN+.08-aSeed.x*(TB-TIN))/life;
   vec3 d=normalize(rnd()+vec3(1.,.2,0.));vec3 p=MO+d*mix(1.25,.05,age*age);
   vA=(age>0.&&age<1.&&uT<TB+.05)?smoothstep(0.,.4,age)*.8:0.;put(p,.03+.03*aSeed.z);}`);
  // motas doradas que cabalgan el frente del anillo
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.45;float q=clamp((s-TI)/${f(RD)},0.,1.);float R=${f(RM)}*(1.-(1.-q)*(1.-q));
   float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=C0+vec3(cos(an)*R,.06+t*(.7+.8*aSeed.w),sin(an)*R);
   vA=(age>0.&&age<1.)?(1.-age)*(1.-q*.6):0.;put(p,.035+.04*aSeed.w);}`);
  a.pose=function(te,o){
    hornScale(1);
    const ia=te-TI, inh=ss(TIN,TB,te)*(1-ss(TB,TB+0.05,te)), bk=te>=TB?Math.exp(-(te-TB)*6):0;
    caster.rotation.z=0.14*inh-0.2*bk*ss(TB,TB+0.04,te);
    earPose(ears,0.4+1*bk,ss(TIN-0.15,TIN,te)*(1-ss(TI+0.45,TI+0.9,te)),-0.3*inh+0.45*bk);
    // ataduras: aparecen con un golpe seco al inicio y se rompen al paso del anillo
    const snap=ss(0,0.12,te);
    binds.forEach((b,i)=>{const q=cl((te-TBk[i])/0.3);b.g.position.copy(UN[i]);
      b.g.visible=q<1; b.g.scale.setScalar(1+0.25*(1-snap)+0.06*(te>=TBk[i]?Math.sin(q*Math.PI):0));
      b.mat.uniforms.uQ.value=q; b.mat.uniforms.uA.value=snap;
      b.root.material.uniforms.uQ.value=q; b.root.material.uniforms.uA.value=snap*(1-ss(TBk[i]+0.3,TBk[i]+0.8,te));
      // liberado: saltito y brillo dorado; atado: tenue violeta
      const d=DUM[i], m=d.userData.m, ft=te-TBk[i];
      if(ft<0){m.emissive.setRGB(0.45,0.18,0.65);m.emissiveIntensity=(0.22+0.08*Math.sin(te*8+i))*snap;}
      else{m.emissive.copy(U.uC1.value);m.emissiveIntensity=0.85*Math.exp(-ft*4)+0.2*(1-ss(TE-0.4,TE,te));
        d.position.y=0.2*Math.sin(Math.PI*cl(ft/0.3));}
    });
    shells.forEach((m,k)=>{const q=cl((ia-ECHO[k][0])/RD),r=RM*(1-(1-q)*(1-q));m.visible=q>0&&q<1;
      m.scale.set(Math.max(r,0.01),1,Math.max(r,0.01)); m.material.uniforms.uA.value=(1-q)*ECHO[k][1];});
    let p=cl(ia/RD); set(ground,1-Math.pow(1-p,2),ia>=0?1-p:0);
    p=cl((te-TB)/0.38); towardCam(bark.position,tmp.set(MO.x+0.63,MO.y+0.05,0),0.3); billboard(bark);
    bark.visible=te>=TB&&p<1; set(bark,p,1-p*p);
    o.g.copy(MO); o.gs=te<TB?0.65*inh+0.25:1.15+1.6*Math.min(Math.max(ia,0),0.5);
    o.ga=te<TB?0.2*inh:0.65*bk+0.08; o.li=te<TB?1.6*inh:7*bk+1.2*(1-ss(TE-0.4,TE,te));
    o.ia=ia;o.c.copy(MO);o.shake=0;o.dist=0.8;o.flash=0;
  };
}};

// =====================================================================
// 7 · ZEN — levita en meditación con un ensō de pincel verde/dorado tras la cabeza, loto-mandala en el suelo,
//     anillos de respiración y hojas de bambú que caen girando
// =====================================================================
const zen={key:"zen",name:"Zen",dur:2.4,ti:0.75,pal:"Jade",
  phases:[["Respiración",0],["Levitación",0.22],["Iluminación",0.75],["Meditación",0.98],["Descenso",1.9]],
build(a){
  const L=a.L,TLv=0.22,TI=0.75,TD=1.9,TE=2.35,CX=-3.7,LH=0.4;
  const env=te=>ss(TLv,TI,te)*(1-ss(TD,TE,te));
  const lift=te=>{const e=env(te);return e*(LH+0.04*Math.sin(te*2.4));};
  // ensō: trazo de pincel que se dibuja en sentido horario, con cerdas secas al final; uQ = destello
  const enso=new THREE.Mesh(new THREE.PlaneGeometry(1.65,1.65),fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float s=fract((1.9-an)/6.2832);
   float w=.045+.06*sin(3.14159*min(s/.92,1.))*(1.-.4*s);
   float rr=.74+.03*sin(s*9.)+(noise(vec3(s*6.,0.,1.))-.5)*.04;
   float dry=smoothstep(.25,.6,noise(vec3(s*30.,(r-rr)/w*2.,3.)))*smoothstep(.55,.95,s);
   float stroke=smoothstep(w,w*.6,abs(r-rr))*step(s,uP*.93)*(1.-dry*.9);
   float tip=smoothstep(.05,0.,abs(s-uP*.93))*step(uP,.99)*smoothstep(w*1.5,0.,abs(r-rr));
   float disk=smoothstep(.75,0.,r)*.12*uP;
   float rays=pow(abs(cos(an*8.+uT*.4)),20.)*smoothstep(.95,.7,r)*smoothstep(.2,.5,r)*.25*uP;
   vec3 col=mix(uC2,uC1,smoothstep(rr+w,rr-w,r))*1.5;
   float a=stroke*(1.+uQ)+tip+disk+rays*(1.+uQ*2.);
   gl_FragColor=vec4(col+vec3(1.)*(tip+uQ*stroke*.5),a*uA);}`,{uQ:{value:0}}));
  // aura serena: hebras de luz que suben despacio alrededor del cuerpo
  const aura=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.62,2.05,40,1,true),fx(`void main(){float h=vP.y/2.05+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*3.,h*4.-uT*1.2,uT*.2));float st=smoothstep(.55,.8,n);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3,(st*.4+fr*fr*.25)*smoothstep(1.,.3,h)*smoothstep(0.,.15,h)*uA);}`));
  L.mesh.add(enso,aura);
  // anillos de respiración que suben desde el loto
  const breath=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.RingGeometry(0.92,1,64,1).rotateX(-Math.PI/2),fx(`void main(){
   float an=atan(vP.z,vP.x);gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.3,uA*(.55+.45*sin(an*6.+uT*2.)));}`));L.trail.add(m);return m;});
  // loto-mandala: dos coronas de pétalos que se abren (uP), nervios y anillos
  const lotus=groundPlane(2.9,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float po=pow(abs(cos(an*4.)),.7);float pi_=pow(abs(cos(an*4.+.785)),.7);
   float R1=(.42+.5*po)*uP;float R2=(.28+.32*pi_)*uP;
   float pet=band(r,R1,.02)*step(.2,r)+band(r,R2,.018);
   float fill=smoothstep(R1,R1-.05,r)*.08+smoothstep(R2,R2-.05,r)*.08;
   float veins=pow(abs(cos(an*8.)),40.)*step(r,R1)*.4;
   float rg=band(r,.18*uP,.012)+band(r,.97,.01)*uP+band(r,.9,.03)*step(.6,fract(an/6.2832*32.+uT*.05))*uP;
   gl_FragColor=vec4(mix(uC2,uC1,smoothstep(.2,.9,r))*1.4,(pet+fill+veins*.5+rg)*uA);}`));
  const ripple=groundPlane(4.2,CX,0.03,fx(RING_FS));
  L.decal.add(lotus,ripple);
  const C=`const float TLv=${f(TLv)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const float CX=${f(CX)};
  float envz(float t){return smoothstep(TLv,TI,t)*(1.-smoothstep(TD,TE,t));}
  float liftz(float t){return envz(t)*(${f(LH)}+.04*sin(t*2.4));}`;
  // hoja de bambú: alargada y puntiaguda, gira y se voltea al caer (mezcla normal)
  const LEAF_FS=HEAD+`varying float vA;varying float vMix;varying float vRot;varying float vFlip;
  void main(){vec2 q=gl_PointCoord-.5;float c=cos(vRot),s=sin(vRot);q=mat2(c,s,-s,c)*q;
   q.x/=max(abs(vFlip),.2);
   float w=.11*(1.-pow(abs(q.y)/.46,1.6));
   float leaf=smoothstep(w,w-.025,abs(q.x))*step(abs(q.y),.46)*step(0.,w);
   float rib=smoothstep(.012,0.,abs(q.x))*leaf;
   float a=leaf*vA;if(a<.003)discard;
   vec3 g=mix(vec3(.22,.48,.2),vec3(.5,.75,.3),vMix);
   vec3 col=mix(g,uC2,.35)+uC1*(rib*.6+smoothstep(w-.03,w,abs(q.x))*.5)*leaf;
   gl_FragColor=vec4(col*(.7+.5*abs(vFlip)),a);}`;
  a.count+=points(L.part,45,C+`varying float vRot;varying float vFlip;
  void main(){float life=1.7+aSeed.y*.8;float k=(uT-TLv)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.45+1.1*r.y;
   vec3 p=vec3(CX+cos(an)*rad+sin(age*5.+r.z*9.)*.28,3.1+r.z*.5-age*3.1,sin(an)*rad*.8+cos(age*4.+r.x*7.)*.2);
   vRot=r.z*6.28+age*(3.+4.*r.y)*(r.x<.5?1.:-1.);vFlip=cos(age*(6.+5.*r.z)+r.y*6.);
   vA=(k>=1.&&p.y>.03)?smoothstep(0.,.08,age)*(1.-smoothstep(.9,1.,age))*uE:0.;put(p,.27+.11*r.z);}`,LEAF_FS,NB);
  // luciérnagas verdes y doradas que ascienden
  a.count+=points(L.part,90,C+`void main(){float life=1.3+aSeed.y*.7;float k=(uT-TLv)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.5;float rad=.5+.95*r.y;
   vec3 p=vec3(CX+cos(an)*rad,.1+age*(1.8+.8*r.z),sin(an)*rad*.8);
   vA=(k>=1.)?sin(age*3.14159)*(.5+.5*sin(uT*6.+aSeed.z*30.))*uE:0.;put(p,.035+.04*r.z);}`);
  // respiración: motas que entran hacia el pecho
  a.count+=points(L.part,40,C+`void main(){float life=.32+aSeed.y*.15;float age=(uT-aSeed.x*(TLv+.15))/life;
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=vec3(CX,1.1+liftz(uT),0.)+d*mix(1.45,.1,age*age);
   vA=(age>0.&&age<1.&&uT<TLv+.3)?smoothstep(0.,.3,age)*.8:0.;put(p,.04+.04*aSeed.z);}`);
  // iluminación: estallido de destellos desde la cabeza y brillo en las orejas
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+.001);vec3 p=vec3(CX+.05,1.65+liftz(s),0.)+d*(.3+1.2*aSeed.z)*(1.-exp(-t*3.));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.1+.09*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,2,C+`void main(){vec3 e=vec3(CX-.02,1.86+liftz(uT),aSeed.x<.5?.26:-.26);
   float fl=exp(-max(uT-TI,0.)*5.)*step(TI,uT);float tw=pow(.5+.5*sin(uT*4.+aSeed.x*3.),8.)*envz(uT);
   vA=max(fl,tw*.7);put(e,.36+.26*fl);}`,STAR4_FS);
  a.pose=function(te,o){
    hornScale(1);
    const e=env(te), lf=lift(te), ia=te-TI, fl=hitK(ia,5);
    caster.position.y=lf; caster.rotation.z=0.03*Math.sin(te*1.3)*e;
    const hy=1.65+lf;
    towardCam(enso.position,tmp.set(CX-0.05,hy,0),-0.5); billboard(enso,0.08*Math.sin(te*0.7));
    enso.visible=e>0.001; enso.scale.setScalar(1+0.1*fl);
    set(enso,cl((te-TLv)/(TI-TLv)),e); enso.material.uniforms.uQ.value=fl;
    aura.position.set(CX,1.2+lf,0); set(aura,0,e*0.9);
    breath.forEach((m,k)=>{const q=((te-TLv)/1.2+k/3)%1, on=te>=TLv?e:0;m.visible=on>0.001;
      m.position.set(CX,0.1+q*2.0+lf*0.5,0); m.scale.setScalar(0.45+0.6*q); m.material.uniforms.uA.value=on*Math.sin(Math.PI*q)*0.45;});
    set(lotus,ss(0,TI,te),ss(0,0.22,te)*(1-ss(TD,TE,te)));
    const p=cl(ia/0.7); set(ripple,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    U.uE.value=e;
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.12*e+0.45*fl;
    o.g.set(CX,hy,0);o.gs=1.5+1.2*fl;o.ga=0.1*e+0.55*fl;o.li=2*e+5.5*fl;
    o.ia=ia;o.c.set(CX,hy,0);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

VFX.module("Bestia · Orejas",[belieber,lamb,nutEars,nyan,foxyEars,puppy,zen]);
})();

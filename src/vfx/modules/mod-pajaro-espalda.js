// =====================================================================
// MÓDULO · CLASE PÁJARO (ESPALDA)
// Estética de cielo y plumaje: globo de feria, flecha de Cupido, aves de luz invocadas, plumas gigantes, grulla de
// origami, patito de goma y paloma mensajera. No se dibujan alas ni partes del Axie: lo que "sale de la espalda" nace
// en ≈(-3.85,1.25,0) sin malla anatómica; las aves son criaturas invocadas (siluetas SDF en billboard o papel plegado).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,CROSS_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLUFF_FS,STAR4_FS,HEART_FS,SD_HEART,SMOKE_FS,billboard,towardCam}=VFX.lib;

const TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0), CB=V3(-3.85,1.25,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
// anillo de suelo que se expande y apaga
const wave=(m,ia,dur,amax)=>{const p=cl(ia/dur);set(m,1-Math.pow(1-p,2),ia>=0?(amax==null?1:amax)*(1-p):0);};
const allyGlow=(i,k,col)=>{const m=allies[i].userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
// orienta un billboard hacia donde vuela (velocidad d); si va hacia −x se refleja sin quedar boca abajo
const faceFly=(m,d,s)=>{const sx=d.x>=0?1:-1,A=Math.atan2(d.y,Math.abs(d.x)+0.4*Math.abs(d.z)+1e-4);billboard(m,sx*A);m.scale.set(sx*s,s,1);};
// velocidad numérica de una trayectoria pos(te,out)
const velOf=(pos,te,out)=>{pos(te+0.01,out);pos(te-0.01,tmp3);return out.sub(tmp3);};

// ---------- siluetas de ave (SDF 2D, de perfil mirando a +x) ----------
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdTap(vec2 p,vec2 a,vec2 b,float r0,float r1){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(r0,r1,h);}
float sdEl(vec2 p,vec2 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-4);}
float sdTri(vec2 p,vec2 p0,vec2 p1,vec2 p2){vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2;vec2 v0=p-p0,v1=p-p1,v2=p-p2;
 vec2 q0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);vec2 q1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);vec2 q2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
 float s=sign(e0.x*e2.y-e0.y*e2.x);
 vec2 d=min(min(vec2(dot(q0,q0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(q1,q1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(q2,q2),s*(v2.x*e2.y-v2.y*e2.x)));
 return -sqrt(d.x)*sign(d.y);}`;
const BD={bl:.4,bt:.16,hx:.44,hy:.15,hr:.13,bk:.14,bkw:.035,tl:.36,ts:.06,tw:.07,tf:.6,fork:0,wx:.04,wy:.08,wl:.78,ww:.2,amp:1};
// sdBird(p, aleteo −1..1, plegado 0..1, pico abierto 0..1): cuerpo en elipse con el pecho alzado, ala triangular con
// primarias en dedos y cola en abanico (o en horquilla); el plano mide 2.4×2 unidades SDF
const BIRD=o=>{const B=Object.assign({},BD,o);return {eye:`vec2(${f(B.hx+B.hr*.4)},${f(B.hy+B.hr*.28)})`,
 sd:SDF2+`float sdBird(vec2 p,float fl,float fo,float bo){
 vec2 q=vec2(p.x,p.y-p.x*.18);float d=sdEl(q-vec2(-.03,0.),vec2(${f(B.bl)},${f(B.bt)}));
 vec2 H=vec2(${f(B.hx)},${f(B.hy)});d=smin(d,length(p-H)-${f(B.hr)},.1);
 vec2 K0=H+vec2(${f(B.hr*.6)},0.);
 d=min(d,sdTap(p,K0,K0+vec2(${f(B.hr*.4+B.bk)},${f(-B.bk*.2)}+bo*.06),${f(B.bkw)},.004));
 d=min(d,sdTap(p,K0-vec2(0.,${f(B.bkw*.6)}),K0+vec2(${f(B.hr*.4+B.bk*.85)},${f(-B.bk*.2)}-bo*.13),${f(B.bkw*.7)},.004));
 vec2 T=vec2(${f(-B.bl*.8)},${f(-B.bl*.8*.18)});
 d=smin(d,sdTap(p,T,T+vec2(${f(-B.tl)},${f(B.ts)}),${f(B.tw)},${f(B.tw*B.tf)}),.05);
 d=smin(d,sdTap(p,T,T+vec2(${f(-B.tl*(1+B.fork))},${f(-B.ts-B.fork*.14)}),${f(B.tw)},${f(B.tw*B.tf)}),.05);
 float a=fl*${f(B.amp)}*(1.-fo);vec2 S=vec2(${f(B.wx)},${f(B.wy)});
 vec2 dir=normalize(vec2(-.5-.7*fo,sin(a)*1.3+.04));float wl=${f(B.wl)}*(1.-.25*fo);vec2 W=S+dir*wl;
 vec2 nr=vec2(-dir.y,dir.x);nr*=nr.x>0.?-1.:1.;
 float wg=sdTri(p,S+vec2(${f(B.ww*.7)},.02),W,S+vec2(${f(-B.ww*1.1)},-.02))-.025;
 for(int i=0;i<3;i++){float fi=float(i);wg=min(wg,sdTap(p,W-dir*.2+nr*fi*.05,W+dir*(.06-fi*.04)+nr*fi*.1,.035,.008));}
 return smin(d,wg,.05);}`};};
const birdGeo=new THREE.PlaneGeometry(2.4,2);
const birdMat=(fs,opts)=>fxU(fs,{uQ:{value:0},uF:{value:0},uO:{value:0}},opts);
const BU=`uniform float uQ;uniform float uF;uniform float uO;`;

// ---------- fragmentos de partícula ----------
// pluma en sprite: raquis, vexilo con barbas y una muesca; vR = giro; col = color GLSL (puede usar vMix)
const featherFS=col=>HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float u=q.x+.5;float w=.16*pow(max(sin(3.14159*clamp((u-.06)/.9,0.,1.)),0.),.7)*(1.-.35*u);
 float vane=smoothstep(w,w-.03,abs(q.y))*step(.06,u)*step(u,.97);
 float barb=.75+.25*sin(u*70.-abs(q.y)*120.);
 float notch=1.-smoothstep(.025,0.,abs(u-.62-q.y*.6))*step(0.,q.y)*.9;
 float rach=smoothstep(.016,.004,abs(q.y))*step(u,.97);
 float a=max(vane*barb*notch,rach)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${col},vec3(1.),rach*.5+smoothstep(w*.6,w,abs(q.y))*.2),a);}`;
const FEATHER_FS=featherFS(`mix(uC2,uC1,vMix)*1.35`);
// confeti: rectángulo que voltea (se estrecha) con color de feria fijo
const CONFETTI_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float fl=abs(cos(vR*2.3))*.8+.2;float a=step(abs(q.x),.3)*step(abs(q.y),.15*fl)*vA;if(a<.003)discard;
 vec3 col=.55+.45*cos(6.2832*(vMix*1.7+vec3(0.,.33,.67)));
 gl_FragColor=vec4(mix(col,uC1,.15)*(.85+.3*fl),a);}`;
// gota (sangrado): rojo semántico, mezcla normal
const BLOOD_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.32,.26,d)*vA;if(a<.003)discard;float hl=smoothstep(.08,0.,length(q-vec2(-.07,0.)));
 gl_FragColor=vec4(mix(vec3(.55,.02,.08),vec3(.95,.12,.25),vMix)*(1.1-d)+vec3(1.)*hl*.6,a);}`;
// figuras geométricas en contorno (triángulo, rombo, cuadrado)
const GEO_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=(gl_PointCoord-.5)*2.;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float k=floor(vMix*2.999);float d;
 if(k<.5)d=max(abs(q.x)*.866+q.y*.5,-q.y)-.42;else if(k<1.5)d=abs(q.x)+abs(q.y)*1.3-.7;else d=max(abs(q.x),abs(q.y))-.5;
 float a=(smoothstep(.1,.03,abs(d))+smoothstep(0.,-.3,d)*.2)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.45)*1.5,a);}`;
// estrella de aturdimiento de cinco puntas
const STUN_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float an=atan(q.y,q.x)+vR;float r=length(q);
 float st=.24+.12*cos(an*5.);float a=smoothstep(st+.03,st-.02,r)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),smoothstep(.16,0.,r))*1.6,a);}`;
// hollín/miasma oscuro con tinte de paleta (mezcla normal)
const DARK_FS=SMOKE_FS("mix(vec3(.05,.03,.07),uC2*.3,.35)");
const MIASMA_FS=SMOKE_FS("mix(vec3(.2,.07,.3),uC2*.75,.45)");

// ---------- pluma en malla: plano con u = cañón→punta; uQ disolución; uH intercambia los tonos ----------
const FEATHERM_FS=`uniform float uQ;uniform float uH;
void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float ay=abs(y);float k=clamp((u-.08)/.92,0.,1.);
 float w=smoothstep(0.,.22,k)*sqrt(max(1.-k*k*k,0.))*(y>0.?.95:.72);float wr=ay/max(w,.01);
 float vane=smoothstep(w,w-.07,ay)*step(.08,u);
 float barb=.78+.22*sin(u*150.-ay*26.);
 float slit=smoothstep(.43,.48,abs(fract(u*3.3+ay*1.1+noise(vec3(u*3.,y,1.))*.5)-.5))*smoothstep(.4,.75,wr);
 float rach=smoothstep(.06,.015,ay)*step(u,.97);
 float dz=noise(vec3(u*9.,y*4.,3.))-uQ*1.1+.04;if(dz<0.)discard;
 float edge=smoothstep(.08,0.,dz)*step(.001,uQ);
 vec3 ca=mix(uC1,uC2,uH),cb=mix(uC2,uC1,uH);
 vec3 c=mix(cb,ca,clamp(wr*.7+u*.4,0.,1.))*1.3+vec3(1.)*(rach*.8+smoothstep(.8,1.,wr)*vane*.25)+ca*edge*2.;
 gl_FragColor=vec4(c,(max(vane*barb*(1.-slit*.85),rach)*.9+edge)*uA);}`;

// =====================================================================
// 1 · BALLOON — un globo aerostático de feria se infla en la espalda, cruza el cielo y se planta sobre el rival;
//     se hincha hasta reventar en confeti y el rival queda encogido de Miedo (nivel 2)
// =====================================================================
const balloon={key:"beBalloon",name:"Balloon",pa:2,dur:2.2,ti:1.15,pal:"Sakura",
  phases:[["Inflado",0],["Ascenso",0.35],["Sobre el rival",0.85],["Estallido",1.15],["Miedo",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TF=0.35,TA=0.85,TI=1.15,K=0.82,S0=V3(-3.95,1.7,0),S1=V3(-3.95,1.9,0),CP=V3(-0.4,4.0,0.7),P1=V3(3.35,2.85,0);
  const EC=V3(P1.x,P1.y+(0.37+0.51*1.12)*K,0);                       // centro de la envoltura al reventar
  const bpos=(te,o)=>{if(te<TF)return o.set(S0.x,S0.y+0.2*ss(0,TF,te),0);
    if(te<TA)return qb(S1,CP,P1,ss(TF,TA,te),o);
    return o.set(P1.x+0.04*Math.sin(te*5),P1.y+0.05*Math.sin(te*3.3),0);};
  // envoltura: perfil de lágrima en torno; gajos de feria alternos con cinta y brillo; uP = sobrepresión
  const prof=[];for(let i=0;i<=18;i++){const th=-1.2+i/18*(1.2+Math.PI/2);prof.push(new THREE.Vector2(Math.max(0.5*Math.cos(th)*(th<0?1+th*0.35:1),0.001),0.51*Math.sin(th)));}
  const envMat=fx(`void main(){float g=vUv.x*12.;float id=floor(g);float e=fract(g);
   vec3 col=.55+.45*cos(6.2832*(id/12.*2.+vec3(0.,.33,.67)));col=mix(col,uC1,.3);
   if(mod(id,2.)<.5)col=mix(col,vec3(1.,.96,.95),.6);
   float seam=smoothstep(.07,0.,min(e,1.-e));float rib=band(vUv.y,.62,.025)+band(vUv.y,.34,.02);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 c=col*${LIT}*(1.-seam*.35)+vec3(1.)*${SPEC(24)}*.55+uC2*rib*.7+uC1*fr*.45+uC1*uP*1.2;
   gl_FragColor=vec4(c,1.);}`,SOLID);
  const craft=new THREE.Group(), env=new THREE.Mesh(new THREE.LatheGeometry(prof,36),envMat);
  const basket=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.14,0.2),fx(`void main(){vec2 q=vUv*vec2(8.,5.);
   float w=step(.5,fract(q.x+floor(q.y)*.5));float n=noise(vec3(q*3.,1.));
   gl_FragColor=vec4(mix(vec3(.33,.19,.08),vec3(.64,.43,.2),w*.6+n*.4)*${LIT},1.);}`,SOLID));
  const ropeM=fx(`void main(){gl_FragColor=vec4(vec3(.32,.24,.16)*${LIT},1.);}`,SOLID);
  craft.add(env,basket);
  for(const [x,z] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const r=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.33,4),ropeM);r.position.set(x*0.075,0.235,z*0.075);craft.add(r);}
  L.mesh.add(craft);
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(BURST_FS)); burst.position.copy(EC);
  const popRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false}));
  // miedo: remolino de jirones oscuros en torno a la cabeza del rival (violeta oscuro semántico)
  const fear=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=sin(an*3.+r*9.-uT*6.);float n=noise(vec3(p*3.,uT*1.5));
   float m=smoothstep(.2,.9,sp*.5+.5+n*.45-.4)*smoothstep(1.,.45,r)*smoothstep(.12,.4,r);
   gl_FragColor=vec4(mix(vec3(.2,.07,.3),uC2*.5,.35),m*.7*uA);}`,NB));
  L.mesh.add(burst,popRing,fear);

  const uB={value:V3(0,0,0)};
  const C=`const float TF=${f(TF)};const float TA=${f(TA)};const float TI=${f(TI)};const vec3 S0=${v3(S0)};const vec3 S1=${v3(S1)};
  const vec3 CP=${v3(CP)};const vec3 P1=${v3(P1)};const vec3 EC=${v3(EC)};uniform vec3 uB;varying float vR;`+QB+`
  vec3 bp(float t){float k=clamp((t-TF)/(TA-TF),0.,1.);k=k*k*(3.-2.*k);return t<TA?qb(S1,CP,P1,k):P1;}`;
  const UB={uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uB}};
  // inflado: aire que entra en la envoltura
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*(TF-.12);float life=.18+aSeed.y*.08;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 c=S0+vec3(0.,.55*${f(K)},0.);vec3 p=c+d*mix(.9,.15,age*age);vR=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.03*aSeed.z);}`,null,UB);
  // quemador: llamita bajo la envoltura que sigue al globo
  a.count+=points(L.part,22,C+`void main(){float life=.25+aSeed.y*.15;float k=(uT)/life+aSeed.x;float age=fract(k);vR=0.;
   vec3 p=uB+vec3((aSeed.z-.5)*.05,.22*${f(K)}+age*.14,(aSeed.w-.5)*.05);
   vA=(uT>.15&&uT<TI)?sin(age*3.14159)*.9:0.;put(p,(.05+.03*aSeed.z)*(1.-age*.5));}`,VFX.lib.FLAME_FS,UB);
  // ascenso: destellos y confeti suelto que cae del globo
  a.count+=points(L.part,60,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bp(s)+rnd()*.12+vec3(-.15*t,-.35*t,0.);vR=0.;
   vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*25.+aSeed.z*30.)):0.;put(p,(.1+.08*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.9;float t=uT-s;float c=max(t,0.);
   vec3 p=bp(s)+vec3(rnd().x*.15,-.05,rnd().z*.15)+vec3(sin(c*5.+aSeed.z*9.)*.12,-.9*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-smoothstep(.7,1.,t/life):0.;vR=aSeed.z*6.2832+c*(5.+5.*aSeed.y);put(p,.08);}`,CONFETTI_FS,Object.assign({},UB,NB));
  // estallido: confeti que llueve sobre el rival, jirones de la envoltura y chispas
  a.count+=points(L.part,280,C+`void main(){float s=TI+aSeed.x*.04;float life=.8+aSeed.y*.35;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.3,0.))*(1.5+2.6*aSeed.z);
   vec3 p=EC+v*(1.-exp(-c*3.6))/3.6+vec3(sin(c*6.+aSeed.w*20.)*.12,-1.7*c,cos(c*5.+aSeed.y*20.)*.1);
   vA=(t>0.&&t<life&&p.y>.03)?1.-smoothstep(.75,1.,t/life):0.;vR=aSeed.z*6.2832+c*(4.+7.*aSeed.y);
   put(p,.09+.04*aSeed.y);vMix=aSeed.w;}`,CONFETTI_FS,Object.assign({},UB,NB));
  a.count+=points(L.part,40,C+`void main(){float s=TI;float life=.7+aSeed.y*.3;float t=uT-s;float c=max(t,0.);vR=0.;
   vec3 v=normalize(rnd()+vec3(0.,.2,0.))*(2.+2.*aSeed.z);vec3 p=EC+v*c+vec3(0.,-4.*c*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS,UB);
  a.count+=sparks(L.part,100,TI,`${f(EC.x)},${f(EC.y)},0.`,"0.,.2,0.",2.5,6.5,2.2);
  // miedo: humo violeta oscuro que sube del rival encogido
  a.count+=points(L.part,60,C+`void main(){float s=TI+.15+aSeed.x*.7;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.;vec3 p=vec3(3.4+cos(an)*(.35+.15*t),.4+aSeed.w*1.3+t*.7,sin(an)*(.35+.15*t));vR=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.65:0.;put(p,(.22+.16*aSeed.y)*(.7+age));}`,MIASMA_FS,Object.assign({},UB,NB));

  // suelo: sombra del globo, anillo de confeti y charco de miedo bajo el rival
  const shadow=groundPlane(1.2,0,0.012,fx(`void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.2,d)*.5*uA);}`,NB));
  const shock=groundPlane(3.4,3.4,0.03,fx(RING_FS));
  const pool=groundPlane(2.0,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,uT*.8));
   float m=smoothstep(1.,.3,r+(n-.5)*.3);gl_FragColor=vec4(mix(vec3(.06,.02,.1),uC2*.25,.3),m*.55*uA);}`,NB));
  L.decal.add(shadow,shock,pool);

  const bp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI; bpos(te,bp); uB.value.copy(bp);
    const inf=ss(0.02,TF,te), swell=ss(TA,TI,te), jit=swell*swell*0.035*Math.sin(te*55);
    craft.visible=te<TI; craft.position.copy(bp); craft.scale.setScalar(K);
    craft.rotation.z=0.1*Math.sin(te*2.6)-(te>TF&&te<TA?0.18*Math.sin(Math.PI*ss(TF,TA,te)):0);
    const sx=Math.max(0.2+0.8*inf+0.12*swell+jit,0.001), sy=Math.max((0.2+0.8*inf)*(1+0.08*swell)-jit,0.001);
    env.scale.set(sx,sy,sx); env.position.y=0.37+0.51*sy;
    envMat.uniforms.uP.value=swell*swell*(0.6+0.4*Math.sin(te*40));
    basket.visible=inf>0.4; basket.scale.setScalar(Math.max(ss(0.4,1,inf),0.001));
    let p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.2*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.35); towardCam(popRing.position,EC,0.4); billboard(popRing); popRing.visible=ia>=0&&p<1; set(popRing,p,1-p);
    // miedo: el rival se encoge y tiembla; el remolino oscuro ronda su cabeza
    const fe=ia>=0?ss(0.1,0.3,ia)*(1-ss(0.85,1.05,ia)):0;
    towardCam(fear.position,tmp.set(3.4,1.6,0),0.2); billboard(fear); fear.visible=fe>0.001; set(fear,0,fe);
    shadow.position.x=bp.x; shadow.scale.setScalar(Math.max(1.1-bp.y*0.12,0.4)); shadow.material.uniforms.uA.value=te<TI?ss(0.1,TF,te)*(1-0.4*ss(TF,TA,te)):0;
    wave(shock,ia,0.55,0.8); pool.material.uniforms.uA.value=fe;
    const hit=hitK(ia,7); target.position.x=3.4+0.08*hit+0.012*fe*Math.sin(te*70);
    target.rotation.z=-0.12*hit*Math.cos(ia*16)+0.035*fe*Math.sin(te*63);
    target.scale.set(1+0.05*fe,1-0.1*fe+0.06*hit,1+0.05*fe);
    o.em=0.3*fe; o.emc.setRGB(0.45,0.2,0.75);
    if(te<TF){o.g.set(S0.x,S0.y+0.5,0);o.gs=0.8*inf;o.ga=0.25*inf;o.li=1.5*inf;}
    else if(te<TI){o.g.set(bp.x,bp.y+0.75,0);o.gs=1.2+0.6*swell;o.ga=0.25+0.3*swell;o.li=2+3*swell;}
    else{o.g.copy(EC);o.gs=1.4+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.75;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(EC);o.shake=0;o.dist=0.6;o.flash=0.8;
  };
}};

// =====================================================================
// 2 · CUPID — corazones se reúnen en la espalda y forman una flecha de Cupido con punta de corazón; vuela en arco
//     con una estela de brillos y corazoncitos; se clava en el rival y le hace sangrar en dos pulsos (Desangrado)
// =====================================================================
const cupid={key:"beCupid",name:"Cupid",pa:2,dur:1.9,ti:0.78,pal:"Rosa",
  phases:[["Corazones",0],["Tensión",0.2],["Disparo",0.38],["Impacto",0.78],["Desangrado",0.95],["Fin",1.55]],
build(a){
  const L=a.L,TP=0.2,TL=0.38,TI=0.78,TX=1.08,A0=V3(-3.55,1.62,0),A1=V3(-3.85,1.66,0),E=V3(3.0,1.28,0),HA=0.55,B1=0.95,B2=1.3;
  const apos=(te,o)=>{if(te<TP)return o.copy(A0);if(te<TL)return o.lerpVectors(A0,A1,ss(TP,TL,te));
    if(te<TI){const k=(te-TL)/(TI-TL);return o.set(A1.x+(E.x-A1.x)*k,A1.y+(E.y-A1.y)*k+4*HA*k*(1-k),0);}return o.copy(E);};
  const aang=te=>{if(te<TL)return 0.04;const k=cl((te-TL)/(TI-TL));return Math.atan2(E.y-A1.y+4*HA*(1-2*k),E.x-A1.x);};
  // flecha: astil dorado, punta de corazón (apunta a +x) y plumas de cola
  const arrow=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.9,8).rotateZ(Math.PI/2).translate(-0.45,0,0),fx(`
  void main(){float n=noise(vec3(vP.x*30.,0.,1.));vec3 c=mix(vec3(.85,.62,.3),vec3(1.,.88,.62),n)*${LIT}+uC1*uA*.6;gl_FragColor=vec4(c,1.);}`,SOLID));
  const heart=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.36),fx(SD_HEART+`void main(){vec2 p=(vUv-.5)*2.;
   vec2 h=vec2(p.y,-p.x)*1.3+vec2(0.,.55);float d=sdHeart(h);
   float fill=smoothstep(.03,-.03,d);float rim=band(d,0.,.05);float core=smoothstep(0.,-.35,d);float halo=smoothstep(.3,0.,d)*step(0.,d);
   gl_FragColor=vec4(mix(uC2,uC1,.4+core*.6)*1.5+vec3(1.)*(core*.5+rim*.4),(fill*.9+rim+halo*.4)*uA);}`));
  heart.position.x=0.1;
  const fletch=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.1),fxU(FEATHERM_FS,{uQ:{value:0},uH:{value:0.6}}));
    m.position.set(-0.8,s*0.045,0);m.rotation.z=s*0.35;return m;});
  arrow.add(shaft,heart,...fletch); L.mesh.add(arrow);
  // estela de brillos: planos cruzados detrás de la flecha (u 0 = cola, 1 = punta)
  const trM=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*8.-uT*10.,vUv.y*6.,uT));float core=exp(-v*9.)*pow(u,1.5);float body=smoothstep(.9,0.,v+(1.-u)*.6)*u*u*.5;
   vec2 g=vUv*vec2(46.,5.);vec2 fq=fract(g)-.5;float gl=step(.78,hash(vec3(floor(g),floor(uT*12.))))*smoothstep(.32,0.,length(fq))*smoothstep(1.,.3,v)*u;
   gl_FragColor=vec4(mix(uC2,uC1,core+n*.3)*1.5+vec3(1.)*(gl+core*.4),(core+body*n+gl)*uA);}`);
  const trG=new THREE.PlaneGeometry(1,0.24).translate(-0.5,0,0), trail=new THREE.Group(), t2=new THREE.Mesh(trG,trM); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(trG,trM),t2); L.trail.add(trail);
  // impacto: contorno de corazón que se expande
  const hring=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(SD_HEART+`void main(){vec2 p=(vUv-.5)*2.;vec2 h=p*1.25+vec2(0.,.62);
   float d=sdHeart(h/(.25+uP))*(.25+uP);float r=band(d,0.,.05+.06*(1.-uP));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.6,r*uA);}`,{depthTest:false}));
  L.mesh.add(hring);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 A0=${v3(A0)};const vec3 A1=${v3(A1)};const vec3 E=${v3(E)};
  vec3 ap(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(A1,E,k)+vec3(0.,${f(4*HA)}*k*(1.-k),0.);}`;
  // corazones que se reúnen
  a.count+=points(L.part,24,C+`void main(){float s=aSeed.x*.2;float life=.22;float age=(uT-s)/life;vec3 d=normalize(rnd()+.0001);
   vec3 p=A0+vec3(-.3,0.,0.)+d*mix(.8,.05,age*age);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.1+.06*aSeed.z);}`,HEART_FS);
  // estela: brillos que se quedan titilando y corazoncitos que suben
  a.count+=points(L.part,170,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.45+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=ap(s)+rnd()*.07+vec3(-.2*t,-.2*t,rnd().z*.2*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*30.+aSeed.z*40.)):0.;put(p,(.08+.08*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,36,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=ap(s)+vec3(sin(t*6.+aSeed.z*9.)*.08,.45*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.06*aSeed.w);}`,HEART_FS);
  // impacto: chispas y corazones despedidos
  a.count+=sparks(L.part,90,TI,`${f(E.x+0.1)},${f(E.y)},0.`,"-.4,.4,0.",2,6,2.2);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.3,.4,0.));vec3 p=E+d*(.2+.9*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.08*aSeed.w)*(1.-age*.4));}`,HEART_FS);
  // desangrado: gotas en dos pulsos
  a.count+=points(L.part,70,C+`void main(){float s=(aSeed.x<.5?${f(B1)}:${f(B2)})+fract(aSeed.x*2.)*.12;float t=uT-s;float c=max(t,0.);float life=.55+aSeed.y*.2;
   vec3 v=vec3(-.4-.8*aSeed.z,.6+.9*aSeed.y,rnd().z*.6);vec3 p=E+vec3(.1,0.,.15)+rnd()*.08+v*c+vec3(0.,-5.*c*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.:0.;put(p,.06+.04*aSeed.w);}`,BLOOD_FS,NB);
  // suelo: corazón suave bajo el rival que late con el sangrado
  const mark=groundPlane(1.6,3.4,0.016,fx(SD_HEART+`void main(){vec2 p=(vUv-.5)*2.;float d=sdHeart(vec2(p.x,-p.y)*1.3+vec2(0.,.62));
   float n=noise(vec3(p*5.,1.));gl_FragColor=vec4(mix(uC2,uC1,n*.5),(smoothstep(.05,-.1,d)*(.25+.2*n)+band(d,0.,.04)*.6)*uA);}`));
  const shock=groundPlane(3,3.4,0.03,fx(RING_FS));
  L.decal.add(mark,shock);

  const ap=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,TP,te), fly=te>=TL&&te<TI;
    apos(te,ap); const ang=aang(te);
    arrow.visible=te<TX; arrow.position.copy(ap); arrow.rotation.z=ang+(ia>=0?0.06*Math.sin(ia*45)*Math.exp(-ia*8):0);
    arrow.scale.setScalar(Math.max(form,0.001)*(ia>=0?1-ss(TX-0.12,TX,te):1));
    set(heart,0,form*(1+0.6*ss(TP,TL,te)*(te<TL?1:0))); shaft.material.uniforms.uA.value=ss(TP,TL,te)*(te<TI?1:0);
    for(const m of fletch)set(m,0,form*0.8);
    const len=fly?Math.min(ap.x-A1.x,2.6):0;
    trail.visible=fly||(ia>=0&&ia<0.25); trail.position.copy(ap); trail.rotation.z=ang; trail.scale.set(Math.max(fly?len:2.6*(1-cl(ia/0.25)),0.001),1,1);
    trM.uniforms.uA.value=fly?1:1-cl(ia/0.25);
    let p=cl(ia/0.45); towardCam(hring.position,E,0.5); billboard(hring); hring.visible=ia>=0&&p<1; set(hring,p,1-p);
    wave(shock,ia,0.5,0.7);
    const b1=hitK(te-B1,5)*(te>=B1?1:0), b2=hitK(te-B2,5)*(te>=B2?1:0);
    mark.material.uniforms.uA.value=ia>=0?(0.35+0.65*Math.max(b1,b2))*(1-ss(1.6,1.9,te)):0;
    const hit=hitK(ia,6); target.position.x=3.4+0.14*hit+0.03*(b1+b2); target.rotation.z=-0.16*hit*Math.cos(ia*15)-0.05*(b1+b2);
    o.em=0.5*Math.max(b1,b2); o.emc.setRGB(1,0.15,0.25);
    if(te<TL){o.g.copy(ap);o.gs=0.7+0.4*ss(TP,TL,te);o.ga=0.3*form;o.li=1.5+1.5*ss(TP,TL,te);}
    else if(te<TI){o.g.copy(ap);o.gs=1.2;o.ga=0.45;o.li=3.5;}
    else{o.g.copy(E);o.gs=1.2+2.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7+0.15*Math.max(b1,b2);o.li=7*Math.exp(-ia*5)+2*Math.max(b1,b2);}
    o.ia=ia;o.c.copy(E);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 3 · KINGFISHER — un martín pescador de luz sale de la espalda, rodea al aliado y le deja una guardia de represalia;
//     sube, se "zambulle" en el cielo atravesando una superficie de ondas y cae como un arpón sobre el rival
// =====================================================================
const KF=BIRD({bl:.34,bt:.16,hx:.38,hy:.16,hr:.17,bk:.42,bkw:.05,tl:.18,ts:.02,tw:.06,wl:.62,ww:.2});
const kingfisher={key:"beKingfisher",name:"Kingfisher",pa:2,dur:2.4,ti:1.5,pal:"Loto",allies:1,
  phases:[["Forma",0],["Guardia",0.28],["Ascenso",0.95],["Zambullida",1.2],["Arpón",1.5],["Fin",1.9]],
build(a){
  const L=a.L,AP=ALLY_POS[0],TF=0.28,T0=0.45,TG=0.95,TZ=1.2,TI=1.5,R=0.75,B0=V3(-3.85,1.75,0),AX=V3(0.9,3.5,-0.4),HIT=V3(3.2,1.55,0);
  const LC=V3(AP.x,1.5,AP.z), L0=V3(AP.x-R,1.5,AP.z), RC=V3(-0.6,3.3,-1.6);
  const kpos=(te,o)=>{
    if(te<TF)return o.set(B0.x,B0.y+0.15*ss(0,TF,te),0);
    if(te<T0)return qb(tmp2.set(B0.x,B0.y+0.15,0),V3(-2.9,2.3,-0.4),L0,ss(TF,T0,te),o);
    if(te<TG){const k=(te-T0)/(TG-T0),th=Math.PI+k*Math.PI*2;return o.set(LC.x+Math.cos(th)*R,1.5+0.35*k,LC.z+Math.sin(th)*R);}
    if(te<TZ)return qb(tmp2.set(L0.x,1.85,L0.z),RC,AX,ss(TG,TZ,te),o);
    const k=Math.pow(cl((te-TZ)/(TI-TZ)),1.6);return o.lerpVectors(AX,HIT,k);};
  const bird=new THREE.Mesh(birdGeo,birdMat(KF.sd+BU+`void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float d=sdBird(p,uQ,uF,0.);
   float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.035);float halo=smoothstep(.3,0.,d)*step(0.,d);
   float n=noise(vec3(p*vec2(6.,9.)-vec2(uT*3.,0.),uT));float bars=pow(.5+.5*sin((p.x-p.y*.6)*28.),6.)*fill;
   float belly=smoothstep(.02,-.1,p.y)*smoothstep(-.45,-.2,p.x)*fill;float eye=smoothstep(.04,.015,length(p-${KF.eye}));
   vec3 c=mix(uC2,uC1,.35+.45*n+bars*.3)*1.5+vec3(1.,.55,.2)*belly*.7+vec3(1.)*(rim*.6+eye);
   gl_FragColor=vec4(c,(fill*(.5+.35*n)+rim+halo*.35+eye)*uA);}`));
  L.mesh.add(bird);
  // superficie de ondas en el cielo donde se "zambulle"
  const ripple=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6).rotateX(-Math.PI/2),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=0.;for(int i=0;i<3;i++){float fi=float(i);m+=band(r,uP*.95-fi*.18,.035)*step(fi*.18,uP);}
   float disc=smoothstep(1.,.2,r)*.12*(1.-uP);float n=noise(vec3(p*8.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,(m*(.6+.4*n)+disc)*uA);}`));
  ripple.position.copy(AX); L.mesh.add(ripple);
  // arpón: haz recto desde la superficie hasta el ave
  const spM=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float core=exp(-v*14.);float halo=exp(-v*4.)*.3;
   float fl=.75+.25*noise(vec3(u*30.-uT*40.,0.,0.));gl_FragColor=vec4(mix(uC1,vec3(1.),core*.6)*1.6,(core+halo)*fl*pow(u,.7)*uA);}`);
  const spG=new THREE.PlaneGeometry(1,0.2).translate(-0.5,0,0), spear=new THREE.Group(), s2=new THREE.Mesh(spG,spM); s2.rotation.x=Math.PI/2;
  spear.add(new THREE.Mesh(spG,spM),s2); L.trail.add(spear);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const C=`const float T0=${f(T0)};const float TG=${f(TG)};const float TZ=${f(TZ)};const float TI=${f(TI)};
  const vec3 LC=${v3(LC)};const vec3 AX=${v3(AX)};const vec3 HIT=${v3(HIT)};const vec3 B0=${v3(B0)};const vec3 AP=${v3(AP)};
  vec3 loop(float t){float k=clamp((t-T0)/(TG-T0),0.,1.);float th=3.14159+k*6.2832;return vec3(LC.x+cos(th)*${f(R)},1.5+.35*k,LC.z+sin(th)*${f(R)});}`;
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.22;float life=.2;float age=(uT-s)/life;vec3 d=normalize(rnd()+.0001);
   vec3 p=B0+vec3(0.,.1,0.)+d*mix(.7,.05,age*age);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.z);}`);
  // espiral de luz que deja al rodear al aliado
  a.count+=points(L.part,120,C+`void main(){float s=T0+aSeed.x*(TG-T0);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=loop(s)+rnd()*.06+vec3(0.,-.25*t,0.);vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.z*30.)):0.;put(p,(.04+.04*aSeed.w)*(1.-age*.5));}`);
  // guardia: motas que orbitan al aliado hasta el final
  a.count+=points(L.part,50,C+`void main(){float an=aSeed.x*6.2832+uT*(1.2+.5*aSeed.y);float rad=.55+.12*aSeed.z;
   vec3 p=vec3(AP.x+cos(an)*rad,.25+aSeed.w*1.5+sin(uT*2.+aSeed.x*9.)*.08,AP.z+sin(an)*rad);
   vA=uE*(.5+.5*sin(uT*6.+aSeed.y*20.));put(p,(.035+.03*aSeed.y)*uE);}`);
  // zambullida: gotas de luz que saltan hacia arriba de la superficie
  a.count+=points(L.part,40,C+`void main(){float s=TZ+aSeed.x*.04;float t=uT-s;float c=max(t,0.);float life=.5+aSeed.y*.2;
   vec3 v=normalize(rnd()*vec3(1.,.2,1.)+vec3(0.,1.,0.))*(1.5+1.5*aSeed.z);vec3 p=AX+v*c+vec3(0.,-5.*c*c,0.);
   vA=(t>0.&&t<life)?1.-t/life:0.;put(p,.05+.04*aSeed.w);}`);
  // arpón: estela recta
  a.count+=points(L.part,60,C+`void main(){float s=TZ+aSeed.x*(TI-TZ);float k=pow(clamp((s-TZ)/(TI-TZ),0.,1.),1.6);float life=.3+aSeed.y*.2;
   float age=(uT-s)/life;float t=max(uT-s,0.);vec3 p=mix(AX,HIT,k)+rnd()*.05+rnd()*.3*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.04*aSeed.w)*(1.-age*.5));}`);
  // impacto: corona de salpicadura de luz y gotas que caen
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float c=max(t,0.);float life=.6+aSeed.y*.3;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.8+.8*aSeed.w),1.6+1.4*aSeed.y,sin(an)*(.8+.8*aSeed.w));
   vec3 p=HIT+v*c+vec3(0.,-6.*c*c,0.);vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;put(p,.05+.05*aSeed.w);}`);
  a.count+=sparks(L.part,80,TI,`${f(HIT.x)},${f(HIT.y)},0.`,".6,-.4,0.",2.5,7,2.5);

  // suelo: sello de guardia bajo el aliado (anillo con plumas en estrella) y onda del arpón
  const guard=groundPlane(1.9,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*.6;
   float k=fract(an/6.2832*6.);float fe=smoothstep(.05,0.,abs(k-.5)*2.*r-(.06*(1.-abs(r-.62)*4.)))*step(.4,r)*step(r,.86);
   float m=band(r,.92,.02)+band(r,.36,.02)+fe*.8;m*=step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,fe+.3)*1.4,m*uA);}`)); guard.position.z=AP.z;
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(guard,shock);

  const kp=V3(0,0,0), kv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, iz=te-TZ, form=ss(0.02,TF,te), dive=te>=TZ&&te<TI;
    kpos(te,kp); velOf(kpos,te,kv);
    bird.visible=te<TI+0.02; towardCam(bird.position,kp,0.05);
    faceFly(bird,te<TF?tmp.set(1,0.2,0):kv,0.42*Math.max(form,0.001)*(dive?1.12:1));
    bird.material.uniforms.uQ.value=dive?0:Math.sin(te*(te<TG?30:22));
    bird.material.uniforms.uF.value=te<TZ-0.05?0.15*ss(TG,TZ,te):1;
    bird.material.uniforms.uA.value=form;
    const rp=cl(iz/0.45); ripple.visible=iz>=0&&rp<1; set(ripple,rp,iz>=0?1-rp:0);
    spear.visible=dive||(ia>=0&&ia<0.2); spear.position.copy(dive?kp:HIT);
    tmp.copy(dive?kp:HIT).sub(AX); spear.rotation.z=Math.atan2(tmp.y,tmp.x); spear.scale.set(Math.max(tmp.length(),0.001),1,1);
    spM.uniforms.uA.value=dive?ss(TZ,TZ+0.06,te):1-cl(ia/0.2);
    let p=cl(ia/0.35); towardCam(hitRing.position,HIT,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    const gEnv=ss(0.6,TG,te)*(1-ss(2.15,2.4,te));
    set(guard,ss(0.55,TG+0.1,te),gEnv); U.uE.value=gEnv;
    allyGlow(0,0.12*gEnv+0.55*hitK(te-TG,5)*(te>=TG?1:0));
    wave(shock,ia,0.5,0.8);
    const hit=hitK(ia,5); target.position.x=3.4+0.3*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.24*hit*Math.cos(ia*13);
    if(te<TF){o.g.copy(kp);o.gs=0.8*form;o.ga=0.3*form;o.li=2*form;}
    else if(te<TI){o.g.copy(kp);o.gs=dive?1.4:1;o.ga=dive?0.5:0.32;o.li=dive?4:2.5;}
    else{o.g.copy(HIT);o.gs=1.3+2.8*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.75;o.li=8*Math.exp(-ia*5);}
    if(te<TI&&te>=TG-0.05){o.ia=te-TG;o.c.set(AP.x,1,AP.z);o.dist=0.25;o.flash=0;}
    else{o.ia=ia;o.c.copy(HIT);o.dist=0.6;o.flash=1;}
    o.shake=0;
  };
}};

// =====================================================================
// 4 · LIL BRO — un huevo de luz se agrieta en la espalda y nace un polluelo espectral; vuela en círculos sobre el
//     compañero dejando caer plumón, que se cierra en un escudo ligero y esponjoso alrededor del aliado
// =====================================================================
const CH=BIRD({bl:.27,bt:.25,hx:.26,hy:.3,hr:.23,bk:.09,bkw:.045,tl:.1,ts:.06,tw:.07,tf:.5,wx:-.04,wy:.08,wl:.34,ww:.16,amp:1.2});
const lilbro={key:"beLilBro",name:"Lil Bro",pa:2,dur:2.3,ti:0.95,pal:"Celestial",allies:1,
  phases:[["Huevo",0],["Eclosión",0.3],["Vuelo",0.32],["Círculos",0.62],["Plumón",0.95],["Escudo",1.25],["Fin",1.95]],
build(a){
  const L=a.L,AP=ALLY_POS[0],TH0=0.3,TO=0.62,TI=0.95,TV=1.95,TE=2.3,EG=V3(-3.9,1.8,0),OC=V3(AP.x,2.35,AP.z),R=0.55,SC=V3(AP.x,0.95,AP.z);
  const cpos=(te,o)=>{if(te<TH0)return o.copy(EG);
    if(te<TO)return qb(EG,V3(-2.6,2.9,-0.6),tmp2.set(OC.x-R,OC.y,OC.z),ss(TH0,TO,te),o);
    const th=Math.PI+(te-TO)*4.6;return o.set(OC.x+Math.cos(th)*R,OC.y+0.1*Math.sin(te*7),OC.z+Math.sin(th)*R);};
  // huevo de luz que se agrieta (uP)
  const egg=new THREE.Mesh(new THREE.SphereGeometry(0.16,28,20),fx(`void main(){vec3 q=normalize(vP);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float n=noise(q*4.);
   float cr=pow(1.-abs(noise(q*5.+3.)*2.-1.),14.)*smoothstep(.0,.3,uP);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.3+vec3(1.)*cr*1.5,(.25+.55*fr+cr*1.5)*uA);}`));
  egg.position.copy(EG); egg.scale.set(0.82,1,0.82);
  // polluelo espectral: relleno de plumón translúcido, borde brillante, cola de humo de luz
  const chick=new THREE.Mesh(birdGeo,birdMat(CH.sd+BU+`void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float d=sdBird(p,uQ,0.,0.);
   float n=noise(vec3(p*7.,uT*2.))*.6+noise(vec3(p*17.,uT))*.4;
   float fill=smoothstep(.05+.04*n,-.04,d);float rim=band(d,0.,.04);float halo=smoothstep(.35,0.,d)*step(0.,d);
   float ghost=smoothstep(-.55,-.1,p.y+noise(vec3(p.x*4.,uT*3.,0.))*.2);
   float eye=smoothstep(.05,.03,length(p-${CH.eye}));float beak=smoothstep(.0,-.03,d)*step(.48,p.x)*step(p.y,.36);
   vec3 c=mix(uC1,vec3(1.,.97,.85),n*.5)*1.4+uC2*beak*1.2+vec3(1.)*rim*.5;
   gl_FragColor=vec4(c,((fill*(.45+.3*n)+rim*.9)*(1.-eye*.9)+halo*.3)*ghost*uA);}`));
  // escudo de plumón: borde esponjoso (pelusa por ruido) y celdillas tenues
  const shield=new THREE.Mesh(new THREE.SphereGeometry(0.85,40,28),fx(`void main(){vec3 q=normalize(vP);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float fz=noise(q*22.+uT*.4)*.6+noise(q*48.)*.4;
   float fluff=smoothstep(.55,.95,fr+fz*.35);float n=noise(q*5.+uT*.3);
   float wave=band(fract(q.y*1.2-uP),.5,.08)*step(.001,uP)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.,.96,.88),.5),fz)*1.2,(fluff*.75+fr*.12+n*.05+wave*.5)*uA);}`));
  shield.position.copy(SC); shield.scale.set(1,1.22,1);
  L.mesh.add(egg,chick,shield);

  const C=`const float TO=${f(TO)};const float TI=${f(TI)};const vec3 EG=${v3(EG)};const vec3 OC=${v3(OC)};const vec3 SC=${v3(SC)};varying float vR;
  vec3 orb(float t){float th=3.14159+(t-TO)*4.6;return vec3(OC.x+cos(th)*${f(R)},OC.y+.1*sin(t*7.),OC.z+sin(th)*${f(R)});}`;
  a.count+=points(L.part,25,C+`void main(){float s=aSeed.x*.25;float life=.2;float age=(uT-s)/life;vec3 d=normalize(rnd()+.0001);vR=0.;
   vec3 p=EG+d*mix(.6,.1,age*age);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // eclosión: cáscaras de luz y destellos
  a.count+=points(L.part,18,C+`void main(){float s=${f(TH0)};float t=uT-s;float c=max(t,0.);vR=0.;
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.2+1.2*aSeed.z);vec3 p=EG+v*c+vec3(0.,-4.*c*c,0.);
   vA=(t>0.&&t<.6&&p.y>.03)?1.-t/.6:0.;put(p,.06+.04*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=${f(TH0)}+aSeed.x*.05;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=EG+normalize(rnd()+.0001)*(.1+.6*aSeed.z)*(1.-exp(-t*6.));vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.08+.08*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  // estela del polluelo en sus vueltas
  a.count+=points(L.part,80,C+`void main(){float s=TO+aSeed.x*(${f(TV)}-TO);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=orb(s)+rnd()*.06+vec3(0.,-.2*t,0.);vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*25.+aSeed.z*30.)):0.;put(p,(.035+.035*aSeed.w)*(1.-age*.5));}`);
  // plumón que cae del polluelo y se posa sobre el escudo
  a.count+=points(L.part,160,C+`void main(){float s=TO+aSeed.x*1.;float fall=.55+.2*aSeed.y;float t=uT-s;float k=clamp(t/fall,0.,1.);
   vec3 st=orb(s)+rnd()*.05;float an=aSeed.z*6.2832;float el=.2+aSeed.w*1.1;
   vec3 en=SC+vec3(cos(an)*cos(el)*.82,sin(el)*1.0,sin(an)*cos(el)*.82);
   vec3 p=mix(st,en,k*k*(3.-2.*k))+vec3(sin(t*7.+aSeed.x*20.)*.06*(1.-k),0.,0.);
   float hold=t-fall;vA=(t>0.&&hold<.5)?smoothstep(0.,.1,t)*(1.-smoothstep(.2,.5,hold)):0.;vR=0.;
   put(p,(.07+.05*aSeed.w)*(1.-.3*k));}`,FLUFF_FS);
  // escudo puesto: plumón que lo ronda y destellos al sellarse
  a.count+=points(L.part,70,C+`void main(){float an=aSeed.x*6.2832+uT*(.6+.4*aSeed.y);float el=(aSeed.z-.3)*1.3;vR=0.;
   vec3 p=SC+vec3(cos(an)*cos(el)*.9,sin(el)*1.1+sin(uT*2.+aSeed.w*9.)*.05,sin(an)*cos(el)*.9);
   vA=uE*.75;put(p,(.06+.05*aSeed.w)*uE);}`,FLUFF_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.06;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=SC+d*vec3(.85,1.05,.85)+d*.5*(1.-exp(-t*4.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.1*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,40,C+`void main(){float s=${f(TV)}+aSeed.x*.2;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=orb(${f(TV)})+rnd()*.15+vec3(0.,.6*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.06+.06*aSeed.w)*(1.-age*.5));}`,STAR4_FS);

  // suelo: mancha cálida bajo el aliado y onda al sellar
  const warm=groundPlane(2.0,AP.x,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,uT*.5));
   gl_FragColor=vec4(mix(uC2,uC1,n),(smoothstep(1.,.3,r)*(.2+.15*n)+band(r,.86,.03)*.6)*uA);}`)); warm.position.z=AP.z;
  const seal=groundPlane(3,AP.x,0.03,fx(RING_FS)); seal.position.z=AP.z;
  L.decal.add(warm,seal);

  const cp=V3(0,0,0), cv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, hatch=te-TH0, sh=ss(TI-0.1,TI+0.15,te)*(1-ss(TV+0.1,TE,te));
    caster.rotation.z=0.08*ss(0,0.2,te)-0.08*ss(0.25,0.4,te);
    egg.visible=te<TH0+0.02; set(egg,ss(0.08,TH0,te),ss(0,0.1,te)); egg.rotation.z=0.25*Math.sin(te*38)*ss(0.12,TH0,te);
    egg.scale.set(0.82*(1+0.15*ss(0.2,TH0,te)),1+0.1*ss(0.2,TH0,te),0.82);
    cpos(te,cp); velOf(cpos,te,cv);
    const cA=hatch>=0?ss(0,0.1,hatch)*(1-ss(TV,TV+0.25,te)):0;
    chick.visible=cA>0.001; towardCam(chick.position,cp,0.05); faceFly(chick,te<TO-0.02?cv:tmp.set(cv.x,cv.y*0.3,cv.z),0.3*(0.5+0.5*ss(0,0.12,hatch))+0.03*Math.sin(te*9));
    chick.material.uniforms.uQ.value=Math.sin(te*42); chick.material.uniforms.uA.value=cA;
    shield.visible=sh>0.001; set(shield,cl(ia/0.6),sh*(0.8+0.25*hitK(ia,5)));
    shield.scale.set(1+0.08*hitK(ia,6)*Math.sin(ia*30),1.22,1+0.08*hitK(ia,6)*Math.sin(ia*30));
    U.uE.value=sh;
    allyGlow(0,0.15*sh+0.5*hitK(ia,5)*(ia>=0?1:0));
    warm.material.uniforms.uA.value=ss(TO,TI,te)*(1-ss(TV,TE,te)); wave(seal,ia,0.5,0.7);
    if(te<TH0){o.g.copy(EG);o.gs=0.6+0.4*ss(0,TH0,te);o.ga=0.25+0.2*ss(0.15,TH0,te);o.li=1.5+1.5*ss(0,TH0,te);}
    else if(te<TI){o.g.copy(cp);o.gs=0.9;o.ga=0.3;o.li=2;}
    else{o.g.set(SC.x,1.2,SC.z);o.gs=1.6+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*8)*0.55+0.1*sh;o.li=5*Math.exp(-ia*5)+1.5*sh;}
    o.ia=te<TI?hatch:ia;o.c.copy(te<TI?EG:SC);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 5 · RAVEN — plumas negras se arremolinan en un cuervo de ojos rojos que grazna (ondas oscuras), remonta y cae en
//     picado sobre el rival; estalla en plumas y deja la Marca de la Muerte sobre su cabeza (Jinx)
// =====================================================================
const RV=BIRD({bl:.44,bt:.14,hx:.5,hy:.17,hr:.13,bk:.24,bkw:.06,tl:.42,ts:.04,tw:.09,tf:1.3,wl:.95,ww:.24});
const raven={key:"beRaven",name:"Raven",pa:2,dur:2.2,ti:1.2,pal:"Rubí",
  phases:[["Plumas",0],["Graznido",0.25],["Vuelo",0.45],["Picado",0.85],["Impacto",1.2],["Marca",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TK=0.25,TV=0.45,TD=0.85,TI=1.2,TM=1.35,P0=V3(-3.6,2.35,0.1),AX=V3(1.0,3.45,0.2),HIT=V3(3.22,1.7,0),MK=V3(3.4,2.55,0);
  const rpos=(te,o)=>{if(te<TV)return o.set(P0.x,P0.y+0.06*Math.sin(te*9),P0.z);
    if(te<TD)return qb(P0,V3(-1.6,3.9,0.2),AX,ss(TV,TD,te),o);
    return o.lerpVectors(AX,HIT,Math.pow(cl((te-TD)/(TI-TD)),1.7));};
  // cuervo: cuerpo casi negro (mezcla normal) con brillo azulado en las plumas, borde rojizo y ojo rojo
  const bird=new THREE.Mesh(birdGeo,birdMat(RV.sd+BU+`void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float d=sdBird(p,uQ,uF,uO);
   float n=noise(vec3(p*vec2(10.,14.),uT));float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.03);
   float sheen=pow(.5+.5*sin((p.x*.7+p.y)*22.+n*3.),8.)*fill;float eye=smoothstep(.05,.02,length(p-${RV.eye}));
   vec3 c=vec3(.03,.025,.05)+vec3(.15,.18,.3)*sheen*.5+uC2*rim*.8+vec3(1.,.1,.1)*eye*2.2;
   gl_FragColor=vec4(c,max(fill*.95,max(rim*.7,eye))*uA);}`,NB));
  L.mesh.add(bird);
  // graznido: arcos oscuros con filo rojo que salen del pico
  const croak=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float cone=smoothstep(.75,.35,abs(an));float m=0.;for(int i=0;i<3;i++){float fi=float(i);m+=band(r,fract(uP*1.6-fi*.3)*.9,.05)*step(fi*.3,uP*1.6);}
   gl_FragColor=vec4(mix(uC2,uC1,.3)*1.3,m*cone*uA*smoothstep(1.,.6,r));}`,{depthTest:false}));
  // Marca de la Muerte: anillo con espinas, tres garras hacia abajo y un ojo central
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(SDF2+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ring=band(r,.78,.04)+band(r,.66,.015);float thorn=smoothstep(.04,0.,abs(fract(an/6.2832*12.+uT*.1)-.5)*r*1.3-(.9-r)*.15)*step(.78,r)*step(r,.95);
   float cl3=min(min(sdSeg(p,vec2(0.,.35),vec2(0.,-.45)),sdSeg(p,vec2(-.32,.3),vec2(-.12,-.38))),sdSeg(p,vec2(.32,.3),vec2(.12,-.38)));
   float claw=smoothstep(.06,.02,cl3)*step(.22,r);
   float eye=smoothstep(.2,.17,length(p*vec2(1.,1.7)))*(1.-smoothstep(.08,.05,length(p)));float pupil=smoothstep(.07,.04,length(p*vec2(1.6,.8)));
   float m=ring+thorn+claw+eye+pupil;
   gl_FragColor=vec4(mix(uC2,uC1,ring+pupil)*1.6+vec3(1.)*uP*.6,min(m,1.)*uA);}`,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(BURST_FS)); burst.position.copy(HIT);
  L.mesh.add(croak,mark,burst);

  const C=`const float TV=${f(TV)};const float TD=${f(TD)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 AX=${v3(AX)};const vec3 HIT=${v3(HIT)};
  const vec3 MK=${v3(MK)};varying float vR;`+QB+`
  vec3 rp(float t){if(t<TD){float k=clamp((t-TV)/(TD-TV),0.,1.);k=k*k*(3.-2.*k);return qb(P0,vec3(-1.6,3.9,.2),AX,k);}
   return mix(AX,HIT,pow(clamp((t-TD)/(TI-TD),0.,1.),1.7));}`;
  const BLK=featherFS(`vec3(.04,.035,.06)+uC2*.25*vMix`);
  // plumas negras que se arremolinan para formar el cuervo
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*.25;float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*5.;float rad=mix(1.,.05,k*k);vec3 p=P0+vec3(cos(an)*rad,(aSeed.y-.5)*.6*(1.-k),sin(an)*rad);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;vR=an*2.;put(p,.2+.08*aSeed.w);}`,BLK,NB);
  // graznido: motas oscuras en el aliento
  a.count+=points(L.part,30,C+`void main(){float s=${f(TK)}+aSeed.x*.15;float life=.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=P0+vec3(.3,.12,0.)+normalize(vec3(1.,rnd().y*.6,rnd().z*.5))*t*2.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.12+.1*aSeed.w)*(.6+age));}`,DARK_FS,NB);
  // vuelo y picado: plumas sueltas y humo negro
  a.count+=points(L.part,90,C+`void main(){float s=TV+aSeed.x*(TI-TV);float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=rp(s)+rnd()*.1+vec3(sin(t*4.+aSeed.z*9.)*.2,-.7*t,cos(t*3.+aSeed.w*9.)*.15);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;vR=aSeed.z*6.2832+t*(2.+3.*aSeed.y);put(p,.14+.06*aSeed.w);}`,BLK,NB);
  a.count+=points(L.part,60,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=rp(s)+rnd()*.12+rnd()*.25*t;vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.2+.14*aSeed.w)*(.6+age));}`,DARK_FS,NB);
  // impacto: estallido de plumas, chispas rojas, humo
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.04;float life=.9+aSeed.y*.4;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,0.))*(2.+3.*aSeed.z);vec3 p=HIT+v*(1.-exp(-c*3.5))/3.5+vec3(sin(c*4.+aSeed.w*9.)*.15,-.8*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*(3.+4.*aSeed.y);put(p,.17+.07*aSeed.w);}`,BLK,NB);
  a.count+=sparks(L.part,100,TI,`${f(HIT.x)},${f(HIT.y)},0.`,".3,-.2,0.",2.5,7,2.5);
  // Jinx: brasas rojas que suben de la marca
  a.count+=points(L.part,60,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-${f(TM)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vR=0.;
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.5,.1+r.y*2.3+age*.5,sin(an)*.5);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.03+.03*r.z));}`);

  // suelo: círculo de espinas oscuras bajo el rival
  const curse=groundPlane(2.2,3.4,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float th=pow(1.-abs(fract(an/6.2832*14.+noise(vec3(r*4.,an,1.))*.2)*2.-1.),14.)*smoothstep(.95,.5,r)*step(.35,r);
   float m=band(r,.9,.03)+th;gl_FragColor=vec4(mix(vec3(.05,.01,.02),uC2*.8,band(r,.9,.02)+th*.5),min(m,1.)*.85*uA);}`,NB));
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(curse,shock);

  const rp=V3(0,0,0), rv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, im=te-TM, form=ss(0.05,TK,te), dive=te>=TD;
    rpos(te,rp); velOf(rpos,te,rv);
    bird.visible=te<TI+0.02; towardCam(bird.position,rp,0.05);
    faceFly(bird,te<TV?tmp.set(1,0.15,0):rv,0.55*Math.max(form,0.001)*(dive?1.1:1));
    bird.material.uniforms.uQ.value=te<TV?0.55+0.15*Math.sin(te*12):(dive?0:Math.sin(te*20));
    bird.material.uniforms.uF.value=dive?1:0; bird.material.uniforms.uO.value=te>=TK&&te<TV?Math.sin(Math.PI*cl((te-TK)/0.2)):0;
    bird.material.uniforms.uA.value=form;
    const ck=cl((te-TK)/0.4); croak.visible=te>=TK&&ck<1; towardCam(croak.position,tmp.set(P0.x+0.62,P0.y+0.12,0),0.1); billboard(croak,0.1);
    set(croak,ck,te>=TK?1-ck*ck:0);
    let p=cl(ia/0.45); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.25+0.85*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    // marca: cae grande, se estampa y late dos veces (Jinx)
    const menv=im>=0?ss(0,0.06,im)*(1-ss(0.6,0.85,te-1.2)):0, slam=im>=0?1+0.9*Math.pow(1-cl(im/0.1),2):1;
    const pulse=im>=0?Math.max(Math.exp(-Math.abs(im-0.25)*10),Math.exp(-Math.abs(im-0.5)*10)):0;
    towardCam(mark.position,MK,0.3); billboard(mark); mark.visible=menv>0.001; mark.scale.setScalar(slam*(0.75+0.08*pulse));
    set(mark,pulse,menv);
    curse.material.uniforms.uA.value=menv; U.uE.value=menv; wave(shock,ia,0.5,0.75);
    const hit=hitK(ia,5); target.position.x=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.22*hit*Math.cos(ia*13);
    target.scale.set(1,1-0.12*hit,1);
    o.em=0.35*menv*(0.5+0.5*pulse); o.emc.setRGB(0.9,0.08,0.12);
    if(te<TV){o.g.copy(rp);o.gs=0.7;o.ga=0.15*form;o.li=1+(te>=TK?1.5*Math.exp(-(te-TK)*5):0);}
    else if(te<TI){o.g.copy(rp);o.gs=dive?1.1:0.8;o.ga=dive?0.3:0.15;o.li=dive?3:1.5;}
    else{o.g.copy(HIT);o.gs=1.3+2.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7+0.12*menv*pulse;o.li=7*Math.exp(-ia*5)+2*pulse;}
    o.ia=ia;o.c.copy(HIT);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 6 · TRI FEATHER — tres plumas gigantes se despliegan en triángulo tras la espalda, vuelan juntas con estelas de
//     viento rosa y azul y bombardean en cruz: una sobre el rival y dos en los brazos laterales de la cruz
// =====================================================================
const triFeather={key:"beTriFeather",name:"Tri Feather",pa:2,dur:2.0,ti:1.0,pal:"Psicodelia",
  phases:[["Despliegue",0],["Disparo",0.45],["Vuelo",0.5],["Bombardeo",1.0],["Cruz",1.1],["Fin",1.55]],
build(a){
  const L=a.L,TA=0.45,TL=0.5,TI=1.0,TQ=1.2,FL=1.5;
  const OFF=[V3(0.1,0.42,0),V3(-0.3,-0.22,0.45),V3(-0.3,-0.22,-0.45)], C0=V3(-4.0,2.15,0), CB0=V3(-4.3,2.25,0);
  const END=[V3(3.3,1.0,0.05),V3(3.4,0.25,1.4),V3(3.4,0.25,-1.4)];
  const CTR=OFF.map(o=>V3(-0.2+o.x,3.8+o.y,o.z*0.7));
  const fpos=(i,te,o)=>{const of=OFF[i];if(te<TA)return o.set(C0.x+of.x,C0.y+of.y,of.z);
    if(te<TL)return o.set(C0.x+of.x+(CB0.x-C0.x)*ss(TA,TL,te),C0.y+of.y+(CB0.y-C0.y)*ss(TA,TL,te),of.z);
    return qb(tmp2.set(CB0.x+of.x,CB0.y+of.y,of.z),CTR[i],END[i],Math.pow(cl((te-TL)/(TI-TL)),1.3),o);};
  const fm=[],trs=[];
  const trM=i=>fxU(`uniform float uH;void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*5.-uT*9.,vUv.y*4.,uT*2.));float sw=pow(.5+.5*sin(u*18.-uT*25.+vUv.y*6.),4.);
   float al=smoothstep(.25+.75*u,0.,v)*pow(u,1.4)*(.4+.6*n+sw*.4);
   gl_FragColor=vec4(mix(mix(uC1,uC2,uH),vec3(1.),pow(u,4.)*.5)*1.4,al*uA);}`,{uH:{value:i?1:0}});
  const trG=new THREE.PlaneGeometry(1,0.5).translate(-0.5,0,0);
  for(let i=0;i<3;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.38).translate(-0.6,0,0),fxU(FEATHERM_FS,{uQ:{value:0},uH:{value:i?0.75:0}}));
    L.mesh.add(m); fm.push(m);
    const mt=trM(i), g=new THREE.Group(), t2=new THREE.Mesh(trG,mt); t2.rotation.x=Math.PI/2; g.add(new THREE.Mesh(trG,mt),t2); g.userData.m=mt; L.trail.add(g); trs.push(g);}
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};varying float vR;`+QB+`
  vec3 fp(float i,float t){float k=pow(clamp((t-TL)/(TI-TL),0.,1.),1.3);
   if(i<.5)return qb(${v3(V3(CB0.x+OFF[0].x,CB0.y+OFF[0].y,0))},${v3(CTR[0])},${v3(END[0])},k);
   if(i<1.5)return qb(${v3(V3(CB0.x+OFF[1].x,CB0.y+OFF[1].y,OFF[1].z))},${v3(CTR[1])},${v3(END[1])},k);
   return qb(${v3(V3(CB0.x+OFF[2].x,CB0.y+OFF[2].y,OFF[2].z))},${v3(CTR[2])},${v3(END[2])},k);}
  vec3 ep(float i){return i<.5?${v3(END[0])}:(i<1.5?${v3(END[1])}:${v3(END[2])});}`;
  // despliegue: chispas que forman las tres plumas
  a.count+=points(L.part,60,C+`void main(){float i=floor(aSeed.x*2.999);float s=fract(aSeed.x*3.)*(${f(TA)}-.15);float life=.2;float age=(uT-s)/life;
   vec3 c=${v3(C0)}+(i<.5?${v3(OFF[0])}:(i<1.5?${v3(OFF[1])}:${v3(OFF[2])}));vec3 p=c+normalize(rnd()+.0001)*mix(.7,.05,age*age);vR=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.z);vMix=i<.5?1.:0.;}`);
  // estelas de viento: rachas rosas (pluma superior) y azules (laterales)
  a.count+=points(L.part,240,C+`void main(){float i=floor(aSeed.x*2.999);float s=TL+fract(aSeed.x*3.)*(TI-TL);float life=.35+aSeed.y*.3;
   float age=(uT-s)/life;float t=max(uT-s,0.);vec3 p=fp(i,s)+rnd()*.12+vec3(-.6*t,.1*t,0.)+rnd()*.25*t;vR=0.;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.4));vMix=i<.5?1.:.1;}`);
  // bombardeo: chispas en cada punto de caída, ráfaga radial de viento y plumitas
  END.forEach((e,i)=>{a.count+=sparks(L.part,i?50:70,TI,`${f(e.x)},${f(e.y)},${f(e.z)}`,i?"0.,1.,0.":"-.3,.6,0.",2,i?5:6.5,2.5);});
  a.count+=points(L.part,90,C+`void main(){float i=floor(aSeed.x*2.999);float s=TI+fract(aSeed.x*3.)*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 e=ep(i);vec3 p=vec3(e.x,.08+.15*aSeed.w*t,e.z)+vec3(cos(an),0.,sin(an))*(.15+1.3*(1.-exp(-t*4.)));vR=0.;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.05+.04*aSeed.y)*(1.-age*.5));vMix=fract(aSeed.w*7.);}`);
  a.count+=points(L.part,80,C+`void main(){float i=floor(aSeed.x*2.999);float s=TI+fract(aSeed.x*3.)*.05;float life=.9+aSeed.y*.4;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(1.2+2.*aSeed.z);vec3 p=ep(i)+v*(1.-exp(-c*3.))/3.+vec3(sin(c*4.+aSeed.w*9.)*.15,-.6*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*3.;put(p,.16+.06*aSeed.w);}`,FEATHER_FS);
  // las plumas clavadas se deshacen en destellos
  a.count+=points(L.part,60,C+`void main(){float i=floor(aSeed.x*2.999);float s=${f(TQ)}+fract(aSeed.x*3.)*.3;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 e=ep(i);vec3 p=e+vec3(-.45,.5,0.)*aSeed.z+rnd()*.08+vec3(0.,.5*t,0.);vR=0.;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.06+.06*aSeed.w)*(1.-age*.5));}`,STAR4_FS);

  // suelo: cruz de cinco casillas centrada en el rival con remolino de viento, y ondas en cada caída
  const cross=groundPlane(4.4,3.4,0.02,fx(`void main(){vec2 p=(vUv-.5)*4.4;vec2 c=floor(p/1.4+.5);vec2 q=(p-c*1.4)/.7;
   float on=step(abs(c.x)+abs(c.y),1.);float edge=max(abs(q.x),abs(q.y));
   float r=length(p);float an=atan(p.y,p.x);float sw=pow(.5+.5*sin(an*3.-r*4.+uT*6.),6.)*smoothstep(2.2,.4,r);
   float m=(band(edge,.92,.05)*1.2+smoothstep(1.,.2,edge)*.18+sw*.35)*on*smoothstep(0.,1.2,uP*2.2-length(c));
   gl_FragColor=vec4(mix(uC2,uC1,sw+band(edge,.92,.04))*1.4,m*uA);}`));
  const rings=END.map(e=>{const m=groundPlane(2.2,e.x,0.03,fx(RING_FS));m.position.z=e.z;L.decal.add(m);return m;});
  L.decal.add(cross);

  const fp=V3(0,0,0), fv=V3(0,0,0), angs=[0,0,0];
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,TA,te), fly=te>=TL&&te<TI;
    caster.rotation.z=0.08*ss(0,TA,te)-0.2*ss(TA,TL+0.05,te)+0.12*ss(TL+0.05,0.8,te);
    for(let i=0;i<3;i++){
      const m=fm[i]; fpos(i,te,fp);
      if(te<TL){tmp.set(1,te<TA?0.05*Math.sin(te*6+i):0.1,0);}else velOf((t,o2)=>fpos(i,Math.min(t,TI-0.0001),o2),Math.min(te,TI-0.011),tmp);
      angs[i]=Math.atan2(tmp.y,tmp.x);
      const stuck=te>=TI, q=ss(TQ,FL,te);
      m.visible=te<FL&&(i===0?te<TI+0.05:true);
      towardCam(m.position,fp,0.02); billboard(m,angs[i]+(stuck?0.04*Math.sin(ia*50)*Math.exp(-ia*7):0));
      m.scale.setScalar(Math.max(form,0.001)*(0.8+0.1*i%2)); m.material.uniforms.uQ.value=i===0?ss(TI-0.02,TI+0.05,te):q;
      m.material.uniforms.uA.value=form*(fly?1.2:1)+(ia>=0?0.6*Math.exp(-ia*6):0);
      const tr=trs[i]; tr.visible=fly||(ia>=0&&ia<0.2); tr.position.copy(fp); tr.rotation.z=angs[i];
      tr.scale.set(Math.max(fly?Math.min((te-TL)*7,1.8):1.8*(1-cl(ia/0.2)),0.001),1,1);
      tr.userData.m.uniforms.uA.value=fly?ss(TL,TL+0.08,te):1-cl(ia/0.2);
      wave(rings[i],ia-(i?0.02:0),0.5,0.75);}
    let p=cl(ia/0.35); towardCam(hitRing.position,END[0],0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(cross,cl(ia/0.4),ia>=0?1-ss(1.55,2.0,te):0);
    const hit=hitK(ia,5); target.position.x=3.4+0.12*hit; target.rotation.z=-0.1*hit*Math.cos(ia*14); target.scale.set(1+0.05*hit,1-0.12*hit,1+0.05*hit);
    if(te<TL){o.g.set(C0.x,C0.y,0);o.gs=1.2*form;o.ga=0.3*form;o.li=2.5*form;}
    else if(te<TI){fpos(0,te,fp);o.g.copy(fp);o.gs=1.6;o.ga=0.4;o.li=3.5;}
    else{o.g.set(3.4,0.8,0);o.gs=1.8+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.75;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(3.35,0.8,0);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 7 · PAPER WING — una hoja de papel mágico se pliega en la espalda en una grulla de origami; despliega las alas,
//     corta el aire con figuras geométricas y estelas, atraviesa al rival con un tajo de papel y se deshace en triángulos
// =====================================================================
// grulla de origami: triángulos sueltos (normales planas); uv por triángulo (0,0),(1,0),(0,1) para iluminar los pliegues
const triGeo=tris=>{const pos=[],uv=[];for(const t of tris){for(const v of t)pos.push(v[0],v[1],v[2]);uv.push(0,0,1,0,0,1);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;};
const craneBody=()=>{const F=[0.16,0.02,0],B=[-0.16,0.02,0],D=[0,-0.13,0],SL=[0,0.05,0.07],SR=[0,0.05,-0.07],N=[0.5,0.34,0],H=[0.58,0.26,0],T=[-0.48,0.36,0];
  return triGeo([[F,SL,D],[F,D,SR],[B,D,SL],[B,SR,D],[F,B,SL],[F,SR,B],
    [[0.06,0.04,0.03],[0.15,0.0,0],N],[[0.06,0.04,-0.03],N,[0.15,0.0,0]],[N,H,[0.5,0.3,0.015]],[N,[0.5,0.3,-0.015],H],
    [[-0.06,0.04,0.03],T,[-0.15,0.0,0]],[[-0.06,0.04,-0.03],[-0.15,0.0,0],T]]);};
const craneWing=s=>{const A=[-0.13,0.04,0.02*s],B=[0.13,0.04,0.02*s],M=[0.02,0.12,0.3*s],P=[-0.06,0.04,0.62*s];return triGeo([[A,M,B],[A,P,M],[M,P,B]]);};
const PAPER_FS=`void main(){vec2 b=vUv;float e=min(min(b.x,b.y),1.-b.x-b.y);
 float lit=.5+.5*abs(dot(normalize(vN),normalize(vec3(.3,.8,.5))));float fib=noise(vP*40.)*.06;
 vec3 paper=mix(vec3(.93,.94,.97),uC1,.18)*(lit-fib);float crease=smoothstep(.045,0.,e);
 gl_FragColor=vec4(paper*(1.-crease*.25)+uC1*crease*(.5+1.5*uA)+uC2*uP*.6,1.);}`;
const paperWing={key:"bePaperWing",name:"Paper Wing",pa:2,dur:2.3,ti:1.25,pal:"Plata",
  phases:[["Hoja",0],["Pliegue",0.22],["Despliegue",0.38],["Vuelo",0.75],["Corte",1.25],["Figuras",1.4],["Fin",1.85]],
build(a){
  const L=a.L,TP=0.22,TU=0.38,TS=0.6,TF=0.75,TI=1.25,TX=1.62,SH=V3(-3.9,1.9,0),HV=V3(-3.35,2.3,0),CT=V3(0.2,2.7,0.3),EN=V3(4.9,1.05,0),HP=V3(3.2,1.25,0);
  const cpos=(te,o)=>{if(te<TU)return o.copy(SH);if(te<TF)return o.lerpVectors(SH,HV,ss(TU,TF,te));
    const k=cl((te-TF)/(TX-TF));return qb(HV,CT,EN,k,o);};
  const paperM=fx(PAPER_FS,DS);
  const crane=new THREE.Group(), roll=new THREE.Group(), body=new THREE.Mesh(craneBody(),paperM), wl=new THREE.Mesh(craneWing(1),paperM), wr=new THREE.Mesh(craneWing(-1),paperM);
  roll.rotation.x=-0.75; roll.add(body,wl,wr); crane.add(roll); L.mesh.add(crane);
  // hoja con la retícula de pliegues que se ilumina
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(`void main(){vec2 p=vUv-.5;
   float cr=smoothstep(.012,0.,min(min(abs(p.x-p.y),abs(p.x+p.y)),min(abs(p.x),abs(p.y))));float bd=max(abs(p.x),abs(p.y));
   float edge=smoothstep(.49,.46,bd);float rim=band(bd,.47,.02);float n=noise(vec3(p*30.,1.));
   gl_FragColor=vec4(mix(vec3(.9,.92,.96),uC1,.25)*(.8+.1*n)*.5+uC1*(cr*uP*1.6+rim),(edge*.5+cr*uP+rim)*uA);}`));
  sheet.position.copy(SH);
  // tajo de papel sobre el rival: filo recto con borde dentado de recorte
  const cut=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=vUv-.5;float x=abs(p.x)*2.;float th=1.-x*x;
   float saw=abs(fract(p.x*24.)-.5)*.02;float core=exp(-abs(p.y+saw)*(70.+uP*90.))*th;float halo=exp(-abs(p.y)*10.)*th*.3;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5+core*.5)*1.8,(core+halo)*uA);}`,{depthTest:false}));
  // estela: cinta de triángulos (dientes de sierra) que fluye tras la grulla
  const trM=fx(`void main(){float u=vUv.x;float v=vUv.y-.5;float tri=abs(fract(u*9.-uT*3.)-.5);
   float m=smoothstep(.02,0.,abs(abs(v)-tri*.5*u))*step(.05,u);float core=exp(-abs(v)*14.)*u*.5;
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.4,(m*.8+core)*pow(u,1.2)*uA);}`);
  const trG=new THREE.PlaneGeometry(1,0.32).translate(-0.5,0,0), trail=new THREE.Group(); trail.add(new THREE.Mesh(trG,trM)); L.trail.add(trail);
  L.mesh.add(sheet,cut);

  const C=`const float TU=${f(TU)};const float TF=${f(TF)};const float TI=${f(TI)};const float TX=${f(TX)};const vec3 SH=${v3(SH)};const vec3 HV=${v3(HV)};
  const vec3 HP=${v3(HP)};varying float vR;`+QB+`
  vec3 cp(float t){if(t<TF)return mix(SH,HV,smoothstep(TU,TF,t));return qb(HV,${v3(CT)},${v3(EN)},clamp((t-TF)/(TX-TF),0.,1.));}`;
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.25;float life=.3;float age=(uT-s)/life;
   vec3 p=SH+vec3(rnd().x*.45,rnd().y*.45,0.)+vec3(0.,.2*age,0.);vR=aSeed.z*6.;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.06+.04*aSeed.w);}`,STAR4_FS);
  // despliegue: figuras geométricas que giran alrededor de la grulla
  a.count+=points(L.part,50,C+`void main(){float s=${f(TS)}+aSeed.x*.08;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+.0001);vec3 p=cp(s)+d*(.2+.9*(1.-exp(-t*4.)))*(.5+.5*aSeed.z);vR=aSeed.w*6.2832+t*5.;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.14+.1*aSeed.w)*(1.-age*.4));}`,GEO_FS);
  // vuelo: figuras desprendidas y rachas de viento finas desde las puntas de las alas
  a.count+=points(L.part,140,C+`void main(){float s=TF+aSeed.x*(TX-TF);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=cp(s)+vec3(-.1,(aSeed.z-.5)*.6,(aSeed.w-.5)*.6)+vec3(-.4*t,-.25*t,0.);vR=aSeed.y*6.2832+t*(4.+4.*aSeed.z);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.08+.08*aSeed.w)*(1.-age*.5));}`,GEO_FS);
  a.count+=points(L.part,120,C+`void main(){float s=TF+aSeed.x*(TX-TF);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float side=aSeed.z<.5?1.:-1.;vec3 p=cp(s)+vec3(-.05,.18*side,.35*side)+vec3(-1.5*t,0.,0.);vR=0.;
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.025+.02*aSeed.w);}`);
  // corte: estallido de triángulos y chispas; la grulla se deshace en papelitos al final
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.4,.3,0.))*(1.5+3.*aSeed.z);vec3 p=HP+v*(1.-exp(-c*4.))/4.*1.5+vec3(0.,-.8*c*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*(6.+6.*aSeed.y);put(p,(.12+.1*aSeed.w)*(1.-.4*t/life));}`,GEO_FS);
  a.count+=sparks(L.part,80,TI,`${f(HP.x)},${f(HP.y)},0.`,".8,-.15,0.",2.5,7,2);
  a.count+=points(L.part,60,C+`void main(){float s=TX-.05+aSeed.x*.05;float life=.8+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.3,.4,0.))*(.8+1.5*aSeed.z);vec3 p=${v3(EN)}+v*(1.-exp(-c*3.))/3.+vec3(sin(c*5.+aSeed.w*9.)*.1,-.7*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*7.;put(p,.1+.06*aSeed.w);}`,GEO_FS);

  // suelo: sombra de la grulla y teselado triangular bajo el rival
  const shadow=groundPlane(1,0,0.012,fx(`void main(){vec2 p=(vUv-.5)*2.;gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.2,length(p*vec2(1.,1.6)))*.45*uA);}`,NB));
  const tess=groundPlane(2.4,3.4,0.02,fx(`void main(){vec2 p=(vUv-.5)*6.;vec2 s=vec2(p.x+p.y*.577,p.y*1.155);vec2 g=fract(s);
   float e=min(min(g.x,g.y),abs(1.-g.x-g.y));float r=length(vUv-.5)*2.;
   float m=smoothstep(.06,0.,e)*smoothstep(1.,.3,r)*step(r,uP*1.1);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,(m+band(r,.95,.02))*uA);}`));
  const shock=groundPlane(3,3.4,0.03,fx(RING_FS));
  L.decal.add(shadow,tess,shock);

  const cp=V3(0,0,0), cv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, unf=ss(TU,TS,te), fly=te>=TF&&te<TX;
    caster.rotation.z=0.07*ss(0,TP,te)-0.07*ss(TU,TS,te);
    // hoja → grulla
    sheet.visible=te<TU+0.02; towardCam(sheet.position,SH,0.05); billboard(sheet,0.785*ss(TP,TU,te));
    sheet.scale.set(Math.max(1-ss(TP,TU,te),0.001),Math.max(1-0.5*ss(TP,TU,te),0.001),1); set(sheet,ss(0.05,TP,te),ss(0,0.08,te));
    cpos(te,cp); velOf(cpos,te,cv);
    crane.visible=te>=TP&&te<TX; crane.position.copy(cp);
    crane.rotation.z=te<TF?0.1*Math.sin(te*5):Math.max(-0.6,Math.min(0.5,Math.atan2(cv.y,cv.x)));
    crane.scale.setScalar(0.85*Math.max(ss(TP,TU,te),0.001)*(te>TX-0.12?1-ss(TX-0.12,TX,te):1));
    // alas: plegadas arriba → desplegadas con un chasquido → aletazos secos en vuelo
    const lift=te<TU?1.45:te<TS?1.45-1.3*Math.pow(unf,0.6)+0.15*Math.sin(Math.PI*unf):0.15+(fly?0.55*Math.sin(te*24):0.08*Math.sin(te*8));
    wl.rotation.x=-lift; wr.rotation.x=lift;
    paperM.uniforms.uA.value=0.3+0.7*Math.exp(-Math.abs(te-TS)*10)+(fly?0.3:0); paperM.uniforms.uP.value=ia>=0?Math.exp(-ia*6):0;
    trail.visible=fly; trail.position.copy(cp); trail.rotation.z=crane.rotation.z; trail.scale.set(Math.max(Math.min((te-TF)*5,1.6),0.001),1,1);
    trM.uniforms.uA.value=fly?ss(TF,TF+0.08,te)*(1-ss(TX-0.1,TX,te)):0;
    towardCam(cut.position,HP,0.6); billboard(cut,-0.22); cut.visible=ia>=0&&ia<0.5;
    cut.scale.set(Math.max(4.2*ss(0,0.06,ia),0.001),0.4,1); set(cut,cl(ia/0.4),ia>=0?0.9*(1-ss(0.1,0.45,ia)):0);
    shadow.position.x=cp.x; shadow.scale.setScalar(Math.max(1.0-cp.y*0.15,0.3)); shadow.material.uniforms.uA.value=te>=TP&&te<TX?1:0;
    set(tess,cl(ia/0.35),ia>=0?1-ss(1.6,2.1,te):0); wave(shock,ia,0.5,0.7);
    const hit=hitK(ia,6); target.position.x=3.4+0.14*hit; target.rotation.z=0.18*hit*Math.cos(ia*15);
    if(te<TU){o.g.copy(SH);o.gs=0.8*ss(0,TP,te);o.ga=0.25*ss(0,TP,te);o.li=1.5;}
    else if(te<TI){o.g.copy(cp);o.gs=1+0.4*Math.exp(-Math.abs(te-TS)*8);o.ga=0.3+0.3*Math.exp(-Math.abs(te-TS)*8);o.li=2.5+2*Math.exp(-Math.abs(te-TS)*8);}
    else{o.g.copy(HP);o.gs=1.3+2.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*11)*0.75;o.li=7*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 8 · RUBBER DUCKLING — un patito de goma cae sobre la cabeza del rival, se aplasta con un chillido, rebota cómico
//     y deja estrellitas de aturdimiento; el chillido llega al aliado como un brillo cálido (cura + PA). Nivel 1
// =====================================================================
const duckling={key:"beRubberDuckling",name:"Rubber Duckling",pa:1,dur:1.3,ti:0.42,pal:"Dorado",allies:1,
  phases:[["Caída",0],["¡Cuac!",0.42],["Rebote",0.5],["Alivio",0.6],["Fin",1.05]],
build(a){
  const L=a.L,TI=0.42,TB=0.8,TB2=1.0,TO=1.1,Y0=3.05,YH=1.92,X0=3.35,XB=4.45,XB2=4.9,AP=ALLY_POS[0];
  const dpos=(te,o)=>{if(te<TI){const k=cl((te-0.03)/(TI-0.03));return o.set(X0,Y0-(Y0-YH)*k*k,0);}
    if(te<TB){const k=(te-TI)/(TB-TI);return o.set(X0+(XB-X0)*k,YH+(0.12-YH)*k+1.4*4*k*(1-k)*0.5,0.15*k);}
    const k=cl((te-TB)/(TB2-TB));return o.set(XB+(XB2-XB)*k,0.12+0.35*4*k*(1-k),0.15);};
  const rub=(col)=>fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(${col}*${LIT}+vec3(1.)*${SPEC(30)}*.7+uC1*fr*.25+vec3(1.)*uP*.35,1.);}`,SOLID);
  const yel=rub(`vec3(1.,.82,.1)`), org=rub(`vec3(1.,.42,.06)`), blk=rub(`vec3(.02)`);
  const duck=new THREE.Group(), inner=new THREE.Group(); duck.add(inner);
  const bodyM=new THREE.Mesh(new THREE.SphereGeometry(0.2,24,16),yel); bodyM.scale.set(1.25,0.85,1);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.14,12),yel); tail.position.set(-0.24,0.08,0); tail.rotation.z=0.9;
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.125,20,14),yel); head.position.set(0.13,0.2,0);
  const beak=new THREE.Mesh(new THREE.SphereGeometry(0.065,14,10),org); beak.position.set(0.25,0.18,0); beak.scale.set(1.5,0.5,1);
  const eyes=[1,-1].map(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.022,8,6),blk);e.position.set(0.21,0.25,s*0.065);return e;});
  inner.add(bodyM,tail,head,beak,...eyes); inner.position.y=0.17; L.mesh.add(duck);
  // chillido: dos ondas finas que salen del patito
  const sq=[0,0.07].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(RING_FS,{depthTest:false}));L.mesh.add(m);return m;});

  const C=`const float TI=${f(TI)};const vec3 HD=${v3(V3(X0,YH,0))};const vec3 AP=${v3(AP)};varying float vR;`;
  a.count+=points(L.part,20,C+`void main(){float s=.02;float life=.25+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=vec3(${f(X0)},${f(Y0)}+.1,0.)+normalize(rnd()+.0001)*(.05+.3*aSeed.z)*(1.-exp(-t*8.));vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.06+.05*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,20,C+`void main(){float s=.05+aSeed.x*(TI-.08);float life=.15;float age=(uT-s)/life;float k=clamp((s-.03)/(TI-.03),0.,1.);vR=0.;
   vec3 p=vec3(${f(X0)}+rnd().x*.08,${f(Y0)}-${f(Y0-YH)}*k*k+.25+.3*age,rnd().z*.08);vA=(age>0.&&age<1.)?(1.-age)*.6:0.;put(p,.025);}`);
  a.count+=sparks(L.part,45,TI,`${f(X0)},${f(YH)},0.`,"0.,1.,0.",1.5,4,2);
  // estrellitas de aturdimiento que giran sobre la cabeza
  a.count+=points(L.part,6,C+`void main(){float an=aSeed.x*0.+floor(aSeed.y*5.999)*1.047+uT*5.;float on=smoothstep(TI,TI+.08,uT)*(1.-smoothstep(1.05,1.25,uT));
   vec3 p=HD+vec3(cos(an)*.32,.12+.04*sin(uT*9.+an),sin(an)*.32);vR=uT*4.+an;vA=on;put(p,.11*on);}`,STUN_FS);
  // polvillo en los rebotes
  a.count+=points(L.part,30,C+`void main(){float i=step(.5,aSeed.x);float s=i<.5?${f(TB)}:${f(TB2)};float bx=i<.5?${f(XB)}:${f(XB2)};
   float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;vR=0.;
   vec3 p=vec3(bx,.05,.15)+vec3(cos(an),0.,sin(an))*(.1+.35*(1.-exp(-t*5.)))+vec3(0.,.12*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.1+.08*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // alivio en el aliado: motas doradas y crucecitas que suben
  a.count+=points(L.part,35,C+`void main(){float s=.55+aSeed.x*.25;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.45,.1+aSeed.w*.6+t*1.3,sin(an)*.45);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.03+.03*aSeed.w);}`);
  a.count+=points(L.part,8,C+`void main(){float s=.6+aSeed.x*.2;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=AP+vec3((aSeed.z-.5)*.7,.7+aSeed.w*.6+t*.8,(aSeed.y-.5)*.5);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.14);}`,CROSS_FS);
  a.count+=points(L.part,25,C+`void main(){float s=${f(TO)};float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=vec3(${f(XB2)},.3,.15)+normalize(rnd()+.0001)*(.05+.35*aSeed.z)*(1.-exp(-t*8.));vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.07+.05*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  const allyRing=groundPlane(1.4,AP.x,0.03,fx(RING_FS)); allyRing.position.z=AP.z;
  L.decal.add(allyRing);

  const dp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, ib2=te-TB2;
    dpos(te,dp); duck.visible=te<TO&&te>0.02; duck.position.copy(dp);
    const pop=ss(0.02,0.1,te)*(1-ss(TO-0.08,TO,te));
    // aplastamiento en el golpe y en los botes (pivota en la base del patito)
    let sqz=0; for(const t of [TI,TB,TB2])sqz=Math.max(sqz,Math.exp(-Math.abs(te-t)*28)*(t===TI?1:0.6));
    duck.scale.set(0.6*pop*(1+0.35*sqz),Math.max(0.6*pop*(1-0.45*sqz),0.001),0.6*pop*(1+0.35*sqz));
    duck.rotation.z=te<TI?0.3*Math.sin(te*8):te<TB?-(te-TI)*9:-(TB-TI)*9-(te-TB)*5;
    duck.rotation.y=-0.5;
    yel.uniforms.uP.value=org.uniforms.uP.value=hitK(ia,10)*(ia>=0?1:0);
    sq.forEach((m,i)=>{const p=cl((ia-i*0.07)/0.3);towardCam(m.position,tmp.set(X0+0.1,YH+0.15,0),0.3);billboard(m);m.visible=ia-i*0.07>=0&&p<1;set(m,p,0.8*(1-p));});
    const rel=ss(0.55,0.62,te)*(1-ss(0.95,1.2,te));
    allyGlow(0,0.55*rel,U.uC1.value); wave(allyRing,te-0.58,0.4,0.6);
    const hit=hitK(ia,9); target.scale.set(1+0.07*hit,1-0.14*hit,1+0.07*hit); target.rotation.z=0.06*Math.sin(te*14)*ss(TI,TI+0.1,te)*(1-ss(1.0,1.25,te));
    if(te<TI){o.g.copy(dp);o.gs=0.5;o.ga=0.18;o.li=1;}
    else{o.g.set(X0,YH+0.1,0);o.gs=0.8+1.6*Math.min(ia,0.3);o.ga=Math.exp(-ia*14)*0.6;o.li=4*Math.exp(-ia*6)+0.8*rel;}
    o.ia=ia;o.c.set(X0,YH,0);o.shake=0;o.dist=0.3;o.flash=0.7;
  };
}};

// =====================================================================
// 9 · PIGEON POST — los perjuicios del Axie salen como hilos de miasma y se sellan en una carta; una paloma mensajera
//     la lleva hasta el rival, la suelta y el sello estalla envolviéndolo en esa misma miasma (traspaso de debuffs)
// =====================================================================
const PG=BIRD({bl:.38,bt:.19,hx:.42,hy:.22,hr:.12,bk:.08,bkw:.03,tl:.34,ts:.06,tw:.1,tf:1.2,wl:.82,ww:.24});
const pigeon={key:"bePigeonPost",name:"Pigeon Post",pa:2,dur:2.4,ti:1.35,pal:"Nabo",
  phases:[["Sello",0],["Despegue",0.4],["Correo",0.55],["Entrega",1.15],["Estallido",1.35],["Traspaso",1.5],["Fin",2.0]],
build(a){
  const L=a.L,TS=0.36,TD=0.4,TF=0.55,TR=1.15,TI=1.35,TE=2.4,EP=V3(-3.95,1.85,0.1),D0=V3(-3.9,2.15,0),DC=V3(-0.2,3.55,0.4),D1=V3(3.0,2.55,0),D2=V3(5.4,3.7,-0.5),LP=V3(3.15,1.4,0.1);
  const dpos=(te,o)=>{if(te<TF)return o.set(D0.x,D0.y+0.15*ss(TD,TF,te),0);
    if(te<TR)return qb(tmp2.set(D0.x,D0.y+0.15,0),DC,D1,ss(TF,TR,te),o);return o.lerpVectors(D1,D2,ss(TR,TR+0.6,te));};
  const lpos=(te,o)=>{if(te<TF)return o.copy(EP);if(te<TR){dpos(te,o);return o.set(o.x,o.y-0.3,o.z);}
    const k=cl((te-TR)/(TI-TR));return o.set(D1.x+(LP.x-D1.x)*k,D1.y-0.3+(LP.y-D1.y+0.3)*k*k,LP.z*k);};
  const dove=new THREE.Mesh(birdGeo,birdMat(PG.sd+BU+`void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float d=sdBird(p,uQ,0.,0.);
   float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.03);float n=noise(vec3(p*vec2(12.,16.),2.));
   float lines=pow(.5+.5*sin((p.x*1.3+p.y)*30.),10.)*fill;float shade=smoothstep(.3,-.3,p.y);
   float eye=smoothstep(.04,.015,length(p-${PG.eye}));
   vec3 c=mix(vec3(.97,.97,1.),vec3(.72,.74,.82),shade*.5+lines*.25+n*.1)*(1.-eye*.95)+uC1*rim*.6;
   gl_FragColor=vec4(c,max(fill,rim*.6)*uA);}`,NB));
  // carta sellada: papel crema, solapa en V y sello de lacre (uQ = brillo del sello)
  const letter=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.28),fxU(`uniform float uQ;void main(){vec2 p=vUv-.5;
   float bd=max(abs(p.x)/.5,abs(p.y)/.5);float fill=step(bd,.98);
   float fy=abs(p.x)*1.2-.1;float flap=smoothstep(.012,0.,abs(p.y-fy))*step(abs(p.x),.47)+band(bd,.97,.02);float lid=step(fy,p.y);
   float sd=length((p-vec2(0.,-.1))*vec2(1.,1.5))-.13;float seal=smoothstep(.01,-.01,sd);float sr=band(sd,-.035,.012);
   vec3 paper=vec3(.96,.92,.84)*(.92+.08*noise(vec3(p*40.,1.)))*(1.-flap*.4-lid*.08);
   vec3 c=mix(paper,uC2*.9+uC1*sr*.5,seal)+uC1*uQ*(seal+flap)*1.5;
   gl_FragColor=vec4(c,fill*uA);}`,{uQ:{value:0}},NB));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(BURST_FS)); burst.position.copy(LP);
  L.mesh.add(dove,letter,burst);

  const C=`const float TS=${f(TS)};const float TF=${f(TF)};const float TR=${f(TR)};const float TI=${f(TI)};const vec3 EP=${v3(EP)};const vec3 LP=${v3(LP)};varying float vR;`+QB+`
  vec3 dp(float t){return qb(${v3(V3(D0.x,D0.y+0.15,0))},${v3(DC)},${v3(D1)},smoothstep(TF,TR,t));}`;
  // drenaje: hilos de miasma que salen de todo el cuerpo y se meten en la carta
  a.count+=points(L.part,150,C+`void main(){float s=aSeed.x*(TS-.05);float dur=.22+.1*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   float an=aSeed.z*6.2832;vec3 st=vec3(-3.7+cos(an)*.42,.15+aSeed.w*1.7,sin(an)*.42);
   vec3 mid=st+vec3(cos(an)*.4,.35,sin(an)*.4);vec3 p=qb(st,mid,EP,k*k);vR=0.;
   vA=(uT>s&&k<1.)?smoothstep(0.,.15,k)*.85:0.;put(p,(.1+.08*aSeed.y)*(1.-.5*k));}`,MIASMA_FS,NB);
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*(TS-.05);float dur=.22+.1*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   float an=aSeed.z*6.2832;vec3 st=vec3(-3.7+cos(an)*.42,.15+aSeed.w*1.7,sin(an)*.42);vec3 p=qb(st,st+vec3(cos(an)*.4,.35,sin(an)*.4),EP,k*k);vR=0.;
   vA=(uT>s&&k<1.)?k:0.;put(p,.035);}`);
  // despegue: plumas blancas
  const WHT=featherFS(`vec3(.95,.95,1.)*(.8+.2*vMix)`);
  a.count+=points(L.part,40,C+`void main(){float s=${f(TD)}+aSeed.x*.05;float life=.8+aSeed.y*.4;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.4,0.))*(1.+1.5*aSeed.z);vec3 p=${v3(D0)}+v*(1.-exp(-c*4.))/4.+vec3(sin(c*4.+aSeed.w*9.)*.12,-.5*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*3.;put(p,.13+.05*aSeed.w);}`,WHT,NB);
  // vuelo: alguna pluma suelta y jirones violetas que se escapan de la carta
  a.count+=points(L.part,40,C+`void main(){float s=TF+aSeed.x*(TR-TF);float life=.9+aSeed.y*.4;float t=uT-s;float c=max(t,0.);
   vec3 p=dp(s)+rnd()*.1+vec3(sin(c*4.+aSeed.w*9.)*.15,-.6*c,0.);vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.z*6.2832+c*2.5;put(p,.11+.04*aSeed.w);}`,WHT,NB);
  a.count+=points(L.part,60,C+`void main(){float s=TF+aSeed.x*(TR-TF);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=dp(s)+vec3(0.,-.3,0.)+rnd()*.06+vec3(-.25*t,-.15*t,0.);vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.1+.08*aSeed.w)*(.6+age));}`,MIASMA_FS,NB);
  // estallido del sello: papelitos, chispas violetas y miasma que se cierra en espiral sobre el rival
  a.count+=points(L.part,50,C+`void main(){float s=TI;float life=.8+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.4,0.))*(1.5+2.*aSeed.z);vec3 p=LP+v*(1.-exp(-c*4.))/4.+vec3(sin(c*5.+aSeed.w*9.)*.08,-.9*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*(5.+5.*aSeed.y);put(p,.08+.04*aSeed.w);vMix=.05;}`,HEAD+`varying float vA;varying float vMix;varying float vR;
  void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);float fl=abs(cos(vR*1.7))*.7+.3;
   float a=step(abs(q.x),.3)*step(abs(q.y),.22*fl)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.96,.92,.84)*(.8+.2*fl),a);}`,NB);
  a.count+=sparks(L.part,80,TI,`${f(LP.x)},${f(LP.y)},.1`,"0.,.3,0.",2,6,2);
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.08;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=LP+d*(.2+1.1*aSeed.z)*(1.-exp(-t*4.));
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.75:0.;put(p,(.24+.2*aSeed.w)*(.6+age*.8));}`,MIASMA_FS,NB);
  a.count+=points(L.part,120,C+`void main(){float s=TI+.12+aSeed.x*.5;float dur=.45+.2*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   float an=aSeed.z*6.2832+k*7.;float rad=mix(1.3,.3,k);vec3 p=vec3(3.4+cos(an)*rad,.2+aSeed.w*1.5+(1.-k)*.4,sin(an)*rad);vR=0.;
   vA=(uT>s&&k<1.)?sin(k*3.14159):0.;put(p,(.04+.04*aSeed.y));}`);
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*(1.5+aSeed.y);float rad=.45+.15*aSeed.z;vR=0.;
   vec3 p=vec3(3.4+cos(an)*rad,.2+aSeed.w*1.6+sin(uT*3.+aSeed.x*9.)*.1,sin(an)*rad);vA=uE*.6;put(p,(.16+.1*aSeed.y)*uE);}`,MIASMA_FS,NB);

  const stain=groundPlane(2.2,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,uT*.7));
   float m=smoothstep(1.,.3,r+(n-.5)*.35);gl_FragColor=vec4(mix(vec3(.08,.03,.12),uC2*.5,.4+.3*n),(m*.55+band(r,.85,.03)*.5)*uA);}`,NB));
  const shock=groundPlane(3,3.4,0.03,fx(RING_FS)), seal0=groundPlane(1.4,-3.7,0.03,fx(RING_FS));
  L.decal.add(stain,shock,seal0);

  const dp=V3(0,0,0), dv=V3(0,0,0), lp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, dA=ss(TD,TF,te)*(1-ss(TR+0.3,TR+0.6,te));
    dpos(te,dp); velOf(dpos,te,dv);
    dove.visible=dA>0.001; towardCam(dove.position,dp,0.05); faceFly(dove,te<TF?tmp.set(1,0.3,0):dv,0.48);
    dove.material.uniforms.uQ.value=Math.sin(te*(te<TR?24:30)); dove.material.uniforms.uA.value=dA;
    lpos(te,lp); letter.visible=te>0.04&&te<TI; towardCam(letter.position,lp,0.12);
    billboard(letter,te<TF?0:te<TR?0.25*Math.sin(te*9):(te-TR)*12); letter.scale.setScalar(Math.max(ss(0.04,0.3,te),0.001));
    letter.material.uniforms.uQ.value=hitK(te-TS,8)*(te>=TS?1:0)+0.6*ss(TI-0.15,TI,te); letter.material.uniforms.uA.value=1;
    let p=cl(ia/0.45); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.2+0.9*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    const tr=ia>=0?ss(0.15,0.6,ia)*(1-ss(TE-0.35,TE,te)):0;
    stain.material.uniforms.uA.value=tr; U.uE.value=tr; wave(shock,ia,0.5,0.7); wave(seal0,te-0.05,0.35,0.5);
    // el Axie suelta sus perjuicios: brillo que se apaga; el rival los recibe en violeta
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.35*ss(0,0.1,te)*(1-ss(0.2,TS+0.05,te));
    const hit=hitK(ia,6); target.position.x=3.4+0.14*hit; target.rotation.z=-0.15*hit*Math.cos(ia*14);
    o.em=0.4*tr; o.emc.copy(U.uC2.value);
    if(te<TF){o.g.copy(EP);o.gs=0.8;o.ga=0.25+0.3*hitK(te-TS,8)*(te>=TS?1:0);o.li=1.5+2*hitK(te-TS,8)*(te>=TS?1:0);}
    else if(te<TI){o.g.copy(lp);o.gs=0.7;o.ga=0.2;o.li=1.5;}
    else{o.g.copy(LP);o.gs=1.3+2.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7+0.08*tr;o.li=7*Math.exp(-ia*5)+1.2*tr;}
    o.ia=ia;o.c.copy(LP);o.shake=0;o.dist=0.55;
  };
}};

VFX.module("Pájaro · Espalda",[balloon,cupid,kingfisher,lilbro,raven,triFeather,paperWing,duckling,pigeon]);
})();

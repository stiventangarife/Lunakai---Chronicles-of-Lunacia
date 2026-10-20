// =====================================================================
// MÓDULO · CLASE BICHO (OJOS)
// Estética de insecto: ojos compuestos, facetas hexagonales, circuitos bioeléctricos, sombras ninja.
// No se dibujan ojos ni gafas sobre el Axie: los efectos nacen de la posición de los ojos (≈ x −3.47, y 1.66,
// z ±0.1) como proyecciones de luz temporales. Las gafas de Bookworm pertenecen al gusano, no al Axie.
// Niveles por PA: Bookworm, Neo, Nerdy y Pacu (1) rápidos y pequeños; Kotaro (2) sin fractura;
// Ladybug Goggles (3) pesado, con temblor y fractura de baldosa bajo el rival principal.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,camera,caster,target,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,SLASH_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0);                                    // pecho del objetivo
const EYE=[V3(-3.47,1.66,0.1),V3(-3.47,1.66,-0.1)], EYM=V3(-3.47,1.66,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), CR=V3(0,0,0), CU=V3(0,0,0), NY=V3(0,-1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const camAxes=()=>{CR.set(1,0,0).applyQuaternion(camera.quaternion);CU.set(0,1,0).applyQuaternion(camera.quaternion);};
const glowOf=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}`;
const HEX=`vec3 hexCell(vec2 p){vec2 s=vec2(1.,1.732);vec2 a=mod(p,s)-s*.5;vec2 b=mod(p-s*.5,s)-s*.5;vec2 g=dot(a,a)<dot(b,b)?a:b;
 vec2 q=abs(g);return vec3(max(dot(q,vec2(.5,.866)),q.x),p-g);}`;
// runa: trazos elegidos por vMix
const GLYPH_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float h=vMix;
 float s1=smoothstep(.06,.02,abs(q.x-(h-.5)*.3))*step(abs(q.y),.35);
 float s2=smoothstep(.06,.02,abs(q.y-(fract(h*7.)-.5)*.4))*step(abs(q.x),.3);
 float s3=smoothstep(.06,.02,abs(q.x+q.y*(fract(h*3.)-.5)*2.))*step(abs(q.y),.3)*step(.4,fract(h*11.));
 float ring=smoothstep(.06,.02,abs(length(q)-.3))*step(.7,fract(h*5.));
 float g=min(s1+s2+s3+ring,1.);float gl=smoothstep(.5,0.,length(q))*.25;
 float a=(g+gl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),g*.4)*1.5,a);}`;
// píxel de datos (cuadrado nítido con halo)
const PIXEL_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=max(q.x,q.y);float a=(smoothstep(.36,.3,d)+smoothstep(.5,.2,d)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),step(.8,vMix)*.6)*1.5,a);}`;

// =====================================================================
// 1 · BOOKWORM — ante los ojos se desenrolla un papiro rúnico; un gusanito con gafas mágicas lo recorre leyendo
//     y las runas leídas vuelan a formar un anillo sobre la cabeza del rival (sus costes revelados) (nivel 1)
// =====================================================================
const bookworm={key:"ijBookworm",name:"Bookworm",pa:1,dur:1.4,ti:0.45,pal:"Estelar",
  phases:[["Pergamino",0],["Lectura",0.12],["Revelación",0.45],["Disipación",0.9]],
build(a){
  const L=a.L,TO=0.12,TI=0.45,TR=0.72,TF=0.95,TE=1.35,SC=V3(-2.8,1.85,0.25),SW=1.05,SH=0.55,HD=V3(3.4,2.15,0);
  // papiro: se desenrolla desde el centro (uP); uQ = cabezal de lectura que enciende las runas
  const scroll=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),fxU(`uniform float uQ;
  void main(){vec2 p=vUv-.5;float hw=uP*.5;if(abs(p.x)>hw+.02)discard;
   float roll=smoothstep(-.03,.015,abs(p.x)-hw);
   float n=noise(vec3(vUv*vec2(30.,14.),1.))*.5+noise(vec3(vUv*vec2(90.,40.),2.))*.5;
   vec3 paper=mix(vec3(.6,.48,.3),vec3(.93,.83,.6),n)*(1.-smoothstep(.36,.5,abs(p.y))*.45);
   vec2 g=vec2(p.x*18.,p.y*8.+.5);vec2 c=floor(g);vec2 fq=fract(g)-.5;float h=hash(vec3(c,4.));
   float st=smoothstep(.07,.02,abs(fq.x-(h-.5)*.4))*step(abs(fq.y),.32)+smoothstep(.07,.02,abs(fq.y-(fract(h*7.)-.5)*.5))*step(abs(fq.x),.3)*step(.4,fract(h*13.));
   float dg=smoothstep(.07,.02,abs(fq.x-fq.y*(fract(h*3.)>.5?1.:-1.)))*step(abs(fq.y),.3)*step(.6,fract(h*5.));
   float glyph=min(st+dg,1.)*step(abs(p.y),.34)*step(abs(p.x),.44)*step(.15,hash(vec3(c,9.)));
   float lit=step(vUv.x,uQ);float headg=smoothstep(.05,0.,abs(vUv.x-uQ))*step(.01,uQ)*step(uQ,.99);
   vec3 col=paper*(1.-roll*.5);col=mix(col,vec3(.16,.08,.05),glyph*(1.-lit));col=mix(col,uC1*1.9,glyph*lit);col+=uC1*headg*.5;
   gl_FragColor=vec4(col+uC2*roll*.5,uA);}`,{uQ:{value:0}},Object.assign({},NB,{depthTest:false})));
  L.mesh.add(scroll);
  // gusano de biblioteca: segmentos que avanzan a saltitos sobre el borde superior; gafas mágicas en la cabeza
  const wormMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(vec3(.92,.66,.55)*${LIT}+uC1*fr*.6,1.);}`,SOLID);
  const segs=[0,1,2,3,4,5].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.048-i*0.004,14,10),wormMat);L.mesh.add(m);return m;});
  const glassMat=fx(`void main(){float fr=1.-abs(dot(normalize(vN),normalize(vV)));gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.8,(.6+.4*fr)*uA);}`);
  const glasses=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(0.022,0.006,6,18),glassMat);L.mesh.add(m);return m;});
  // anillo de runas sobre la cabeza del rival
  const crown=groundPlane(1.4,HD.x,HD.y,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a0=atan(p.y,p.x)/6.2832+.5;float an=a0+uT*.15;
   float cell=floor(an*20.);vec2 g=vec2(fract(an*20.),(r-.63)/.24);float h=hash(vec3(cell,3.,1.));
   float gl=(smoothstep(.14,.05,abs(g.x-.5-(h-.5)*.3))+smoothstep(.14,.05,abs(g.y-.5))*step(.5,h))*step(abs(g.y-.5),.4);
   float m=(band(r,.6,.012)+band(r,.9,.012)+gl*step(abs(r-.75),.12))*step(a0,uP);
   gl_FragColor=vec4(mix(uC2,uC1,gl)*1.6,m*uA);}`));
  L.mesh.add(crown);

  const C=`const float TO=${f(TO)};const float TI=${f(TI)};const float TR=${f(TR)};const float TF=${f(TF)};const vec3 SC=${v3(SC)};const vec3 HD=${v3(HD)};`;
  // polvo dorado que suelta el papiro al desenrollarse
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.2;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=SC+vec3((aSeed.z-.5)*${f(SW)}*min(uT/.15,1.),(aSeed.w-.5)*.5,0.)+vec3(0.,.4*t,.1*t);
   vA=(age>0.&&age<1.)?(1.-age)*.7:0.;put(p,.025+.025*aSeed.y);}`);
  // runas leídas que se despegan y vuelan hasta el anillo, donde orbitan
  a.count+=points(L.part,50,C+`void main(){float s=TI-.05+aSeed.x*.15;float k=clamp((uT-s)/(TR-s),0.,1.);
   vec3 st=SC+vec3((aSeed.y-.5)*${f(SW*0.85)},(aSeed.z-.5)*${f(SH*0.6)},.02);
   float an=aSeed.w*6.2832+max(uT-TR,0.)*.9;vec3 en=HD+vec3(cos(an)*.52,.02,-sin(an)*.52);
   vec3 c=mix(st,en,.5)+vec3(0.,1.1+.4*aSeed.y,0.);vec3 p=mix(mix(st,c,k),mix(c,en,k),k);
   vA=(uT>s)?(1.-smoothstep(TF,TF+.3,uT)):0.;put(p,.11+.04*aSeed.y);vMix=aSeed.z;}`,GLYPH_FS);
  // destellos de revelación sobre el rival
  a.count+=points(L.part,30,C+`void main(){float s=TR+aSeed.x*.15;float life=.4+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=HD+vec3((aSeed.z-.5)*1.1,(aSeed.w-.5)*.5,(aSeed.y-.5)*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.04*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, op=ss(0,TO,te), rd=cl((te-TO)/(TI-TO)), fade=1-ss(TI+0.15,TI+0.4,te);
    camAxes();
    scroll.position.copy(SC); billboard(scroll); scroll.visible=fade>0.002;
    set(scroll,op,fade); scroll.material.uniforms.uQ.value=rd;
    // el gusano avanza con el cabezal de lectura
    const xh=-SW*0.45+SW*0.9*rd, wv=op*fade;
    segs.forEach((m,i)=>{const x=Math.max(xh-i*0.055,-SW*0.48)*op, bump=0.035*Math.max(0,Math.sin(te*26-i*0.9));
      m.position.copy(SC).addScaledVector(CR,x).addScaledVector(CU,SH/2+0.04+bump); m.visible=wv>0.05; m.scale.setScalar(Math.max(wv,0.001));});
    const hp=segs[0].position;
    glasses.forEach((g,i)=>{towardCam(g.position,hp,0.05);g.position.addScaledVector(CR,(i-0.5)*0.05).addScaledVector(CU,0.012);billboard(g);g.visible=wv>0.05;g.scale.setScalar(Math.max(wv,0.001));});
    glassMat.uniforms.uA.value=0.6+0.4*Math.sin(te*20);
    crown.position.x=target.position.x; set(crown,ss(TR-0.1,TR+0.2,te),ss(TR-0.15,TR,te)*(1-ss(TF,TE,te)));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.5*hitK(ia,6);
    target.rotation.z=0.05*Math.sin((te-TR)*12)*hitK(te-TR,4);
    if(te<TI){o.g.copy(SC);o.gs=1.2*op;o.ga=0.25*op;o.li=2*op;}
    else if(te<TR){const k=cl((te-TI)/(TR-TI));o.g.set(SC.x+(HD.x-SC.x)*k,SC.y+1.0*Math.sin(Math.PI*k)+(HD.y-SC.y)*k,0);o.gs=1;o.ga=0.3;o.li=2.2;}
    else{const k=hitK(te-TR,5);o.g.copy(HD);o.gs=1.4;o.ga=0.15+0.3*k;o.li=1.5+3*k;}
    o.ia=te-TR;o.c.copy(HD);o.shake=0;o.dist=0.2;o.flash=0.4;
  };
}};

// =====================================================================
// 2 · KOTARO — la sombra gotea de los ojos y forma un charco del que surge un ninja insectoide; se hunde,
//     corre como una mancha bajo el suelo, emerge a la espalda del rival y lo corta; queda la Marca de Muerte (nivel 2)
// =====================================================================
const kotaro={key:"ijKotaro",name:"Kotaro",pa:2,dur:2.2,ti:0.95,pal:"Miasma",
  phases:[["Sombra",0],["Ninja",0.12],["Inmersión",0.42],["Emboscada",0.7],["Corte",0.95],["Marca",1.1],["Fin",1.85]],
build(a){
  const L=a.L,TN=0.12,TD=0.42,TM=0.7,TI=0.95,TV=1.15,TF=1.85,TE=2.15,NX0=-2.95,NX1=4.35,NZ1=-0.15,MK=V3(3.4,2.3,0);
  // silueta de ninja insectoide (SDF de perfil, mira a +x): cabeza con ojos compuestos, tórax, abdomen,
  // brazo-guadaña, patas articuladas, antenas y bufanda al viento
  const NINJA=SDF2+`float sdNinja(vec2 p,float t){
   float d=length((p-vec2(.08,.55))*vec2(1.,1.15))-.16;
   d=smin(d,length((p-vec2(-.02,.2))*vec2(1.3,.85))-.16,.06);
   d=smin(d,length((p-vec2(-.18,-.1))*vec2(1.25,.75))-.19,.06);
   d=min(d,sdSeg(p,vec2(.12,.68),vec2(.34,.9+.03*sin(t*9.)))-.012);d=min(d,sdSeg(p,vec2(.04,.7),vec2(.14,.97))-.012);
   d=min(d,sdSeg(p,vec2(.05,.27),vec2(.36,.12))-.034);d=min(d,sdSeg(p,vec2(.36,.12),vec2(.66,.44))-.02);
   d=min(d,sdSeg(p,vec2(-.05,.24),vec2(-.3,.36))-.03);
   d=min(d,sdSeg(p,vec2(-.1,-.2),vec2(.06,-.55))-.03);d=min(d,sdSeg(p,vec2(.06,-.55),vec2(.2,-.92))-.02);
   d=min(d,sdSeg(p,vec2(-.26,-.24),vec2(-.36,-.6))-.03);d=min(d,sdSeg(p,vec2(-.36,-.6),vec2(-.3,-.93))-.02);
   vec2 s1=vec2(-.55,.47+.06*sin(t*10.)),s2=vec2(-.88,.38+.08*sin(t*10.+1.4));
   d=min(d,sdSeg(p,vec2(-.02,.4),s1)-.03);d=min(d,sdSeg(p,s1,s2)-.02);
   return d;}`;
  const nFill=fx(NINJA+`void main(){vec2 p=(vUv-.5)*2.;if(p.y<-1.+2.*(1.-uP))discard;
   float d=sdNinja(p,uT);gl_FragColor=vec4(vec3(.03,.01,.05),smoothstep(.02,-.02,d)*.92*uA);}`,Object.assign({depthTest:false},NB));
  const nGlow=fx(NINJA+`void main(){vec2 p=(vUv-.5)*2.;float gnd=-1.+2.*(1.-uP);if(p.y<gnd)discard;
   float d=sdNinja(p,uT);float rim=band(d,0.,.022);float halo=smoothstep(.12,0.,d)*step(0.,d)*.35;
   float eye=smoothstep(.04,0.,length((p-vec2(.17,.57))*vec2(1.,1.6)))+smoothstep(.035,0.,length((p-vec2(.07,.6))*vec2(1.,1.6)))*.7;
   float blade=smoothstep(.03,0.,sdSeg(p,vec2(.36,.12),vec2(.66,.44)))*step(-.02,d);
   float seam=band(p.y,gnd,.03);
   gl_FragColor=vec4(mix(uC2,uC1,rim+eye)*1.6+vec3(1.)*(eye+blade)*.6,(rim+halo+eye+blade*.8+seam*smoothstep(.1,0.,d))*uA);}`,{depthTest:false});
  const ninja=[nFill,nGlow].map((m,i)=>{const n=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),m);n.renderOrder=i;L.mesh.add(n);return n;});
  // corte desde la espalda y Marca de Muerte sobre la cabeza
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.1),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false})); L.trail.add(slash);
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ring=band(r,.62,.05)+band(r,.8,.02)*step(.5,fract(an/6.2832*16.+uT*.3));
   float hooks=0.;for(int i=0;i<4;i++){float a0=float(i)*1.5708+.785+uT*.4;vec2 d=vec2(cos(a0),sin(a0));vec2 n=vec2(-d.y,d.x);
    vec2 q=vec2(dot(p,d),dot(p,n));float cur=q.y-.7*(q.x-.6)*(q.x-.6);hooks+=smoothstep(.05,.015,abs(cur))*step(.22,q.x)*step(q.x,.62);}
   vec2 ab=abs(p);float dia=smoothstep(.03,0.,abs(ab.x+ab.y-.22));float core=smoothstep(.12,0.,ab.x+ab.y)*(.7+.3*sin(uT*8.));
   float m=(ring+hooks+dia+core)*step(r,uP*1.1);
   gl_FragColor=vec4(mix(uC2,uC1,core+dia*.5)*1.6,m*uA);}`,{depthTest:false}));
  L.mesh.add(mark);
  // suelo: charcos de sombra (bajo el Axie y bajo el ninja) y la mancha que corre entre ambos
  const POOL_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=noise(vec3(p*3.,uT*.6))*.6+noise(vec3(p*8.,2.))*.4;
   float e=r+(n-.5)*.4;float m=smoothstep(uP,uP-.25,e);float rim=band(e,uP-.05,.06);
   gl_FragColor=vec4(mix(vec3(.02,0.,.03),uC1*1.4,rim),(m*.85+rim*.6)*uA);}`;
  const pool0=groundPlane(1.6,-3.7,0.015,fx(POOL_FS,NB)), pool1=groundPlane(1.6,NX1,0.016,fx(POOL_FS,NB)); pool1.position.z=NZ1;
  const SL=NX1-(-3.4);
  const streak=groundPlane(SL,(NX1-3.4)/2,0.018,fxU(`uniform float uQ;
  void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*20.-uT*8.,vUv.y*4.,1.));
   float w=.35+.25*n;float m=smoothstep(w,w*.3,v)*step(u,uP)*step(uQ,u);float head=smoothstep(.06,0.,uP-u)*step(u,uP);
   gl_FragColor=vec4(mix(vec3(.02,0.,.04),uC1*1.5,head+smoothstep(.15,.4,v)*.4),m*uA);}`,{uQ:{value:0}},NB),0.6);
  streak.position.z=NZ1/2;
  L.decal.add(pool0,pool1,streak);

  const C=`const float TN=${f(TN)};const float TD=${f(TD)};const float TM=${f(TM)};const float TI=${f(TI)};const float TV=${f(TV)};const float TF=${f(TF)};`;
  // sombra que gotea de los ojos al suelo
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*.28;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=vec3(-3.42,1.66,aSeed.z<.5?.1:-.1);vec3 p=mix(e,vec3(-3.3+(aSeed.w-.5)*.5,.05,(aSeed.y-.5)*.5),k*k)+vec3(.05*sin(k*9.+aSeed.w*6.),0.,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.8:0.;put(p,(.1+.1*aSeed.w)*(1.-k*.4));}`,SMOKE_FS("vec3(.06,.02,.09)"),NB);
  // humo al surgir, al sumergirse y al emerger tras el rival
  a.count+=points(L.part,90,C+`void main(){float i=floor(aSeed.x*2.999);float s=(i<.5?TN:(i<1.5?TD:TM-.03))+aSeed.y*.12;
   vec3 o=i<1.5?vec3(${f(NX0)},0.,0.):vec3(${f(NX1)},0.,${f(NZ1)});float life=.5+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=o+vec3(cos(an)*(.25+.5*t),.1+aSeed.z*.9+.5*t,sin(an)*(.25+.5*t));
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.7:0.;put(p,(.2+.18*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.07,.03,.1)"),NB);
  // jirones que salen de la mancha mientras corre bajo el suelo
  a.count+=points(L.part,50,C+`void main(){float s=TD+.03+aSeed.x*(TM-TD-.03);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-TD-.03)/(TM-TD-.03);vec3 p=vec3(-3.+${f(NX1+3)}*k,.05+t*.9,${f(NZ1)}*k+(aSeed.z-.5)*.3);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,(.04+.04*aSeed.w)*(1.-age*.5));}`);
  // corte: chispas hacia delante (sale de la espalda del rival)
  a.count+=sparks(L.part,110,TI,`3.45,1.3,0.`,"-.9,.25,.2",3,8,3);
  // motas violetas que orbitan la marca
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*(1.5+aSeed.y);float rad=.5+.15*aSeed.z;
   vec3 p=${v3(MK)}+vec3(cos(an)*rad,sin(an)*rad*.6+(aSeed.w-.5)*.2,sin(an)*.2);
   float env=smoothstep(TI+.1,TI+.35,uT)*(1.-smoothstep(TF,TF+.3,uT));vA=env*(.5+.5*sin(uT*9.+aSeed.w*30.));put(p,.035+.03*aSeed.w);}`);
  // desvanecimiento del ninja
  a.count+=points(L.part,50,C+`void main(){float s=TV+aSeed.x*.12;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(4.05+(aSeed.z-.5)*.5,.2+aSeed.w*1.3+.6*t,${f(NZ1)}+(aSeed.y-.5)*.4)+vec3(sin(t*4.+aSeed.x*9.)*.15,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.22+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.08,.03,.11)"),NB);

  const np=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.05*ss(0,TN,te)*(1-ss(TD,TD+0.2,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*ss(0,0.1,te)*(1-ss(TN,TD,te));
    // posición, emersión (uP) y orientación del ninja según la fase
    let nx=NX0, nz=0, rise=0, face=1, al=0;
    if(te<TD){rise=ss(TN,TN+0.18,te);al=1;}
    else if(te<TD+0.1){rise=1-ss(TD,TD+0.1,te);al=1;}
    else if(te>=TM){nx=NX1-0.4*ss(TI-0.07,TI,te)+0.1*ss(TI+0.05,TV,te);nz=NZ1;face=-1;rise=ss(TM,TM+0.12,te);al=1-ss(TV,TV+0.15,te);}
    np.set(nx,0.75-1.5*(1-rise),nz);
    ninja.forEach(m=>{towardCam(m.position,np,0.1);billboard(m,face<0?0.12*ss(TI-0.07,TI,te):-0.1*ss(TN,TD,te));
      m.scale.set(face,1,1);m.visible=al>0.002&&rise>0.002;set(m,rise,al);});
    // mancha que corre bajo el suelo
    const run=cl((te-TD-0.03)/(TM-TD-0.03));
    set(streak,run,te>TD?1-ss(TM,TM+0.35,te):0); streak.material.uniforms.uQ.value=Math.max(0,run-0.35)*1.4*(te<TM?1:0)+ss(TM,TM+0.3,te);
    set(pool0,ss(0,0.25,te)*0.9,ss(0,0.1,te)*(1-ss(TD+0.1,TM,te)));
    set(pool1,ss(TM-0.08,TM+0.1,te)*0.85,ss(TM-0.08,TM,te)*(1-ss(TV+0.1,TV+0.5,te)));
    // corte en diagonal sobre la espalda/torso
    const sp=cl((te-TI+0.04)/0.12);
    towardCam(slash.position,TC,0.6); slash.position.x+=0.25; billboard(slash,2.45); slash.visible=te>TI-0.04&&te<TI+0.7;
    set(slash,sp*1.15,te<TI+0.15?1:1-cl((te-TI-0.15)/0.2)); slash.material.uniforms.uQ.value=ia>=0?0.9*Math.exp(-ia*3.5):0;
    // marca
    const mk=ss(TI+0.1,TI+0.3,te)*(1-ss(TF,TE,te));
    towardCam(mark.position,tmp.set(target.position.x,MK.y+0.04*Math.sin(te*3),0),0.3); billboard(mark,te*0.3);
    mark.visible=mk>0.002; mark.scale.setScalar(0.85+0.3*hitK(te-TI-0.1,6)); set(mark,ss(TI+0.1,TI+0.35,te),mk);
    // el rival recibe el corte por la espalda: se va hacia delante (−x) y se encorva
    const hit=hitK(ia,5);
    target.position.x=3.4-0.26*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=hit*0.32*Math.cos(ia*12);
    o.em=0.22*mk*(0.6+0.4*Math.sin(te*6)); o.emc.copy(U.uC2.value);
    if(te<TD){o.g.set(NX0,0.9,0);o.gs=1.2*rise+0.3;o.ga=0.25;o.li=1.6;}
    else if(te<TM){o.g.set(-3+(NX1+3)*run,0.3,NZ1*run);o.gs=1;o.ga=0.25;o.li=2;}
    else if(te<TI){o.g.set(NX1,1.0,NZ1);o.gs=1.1;o.ga=0.3;o.li=2.2;}
    else{o.g.copy(TC);o.gs=1.2+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.65+0.12*mk;o.li=7*Math.exp(-ia*5)+1.2*mk;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 3 · NEO — circuitos bioeléctricos lima recorren el caparazón desde los ojos, convergen y disparan dos láseres
//     finos; el circuito se propaga por el rival y su retícula de crítico parpadea y se desintegra en píxeles (nivel 1)
// =====================================================================
const neo={key:"ijNeo",name:"Neo",pa:1,dur:1.3,ti:0.38,pal:"Ácido",
  phases:[["Circuitos",0],["Láser",0.2],["Impacto",0.38],["Anulación",0.6]],
build(a){
  const L=a.L,TB=0.2,TI=0.38,TX=0.62,TF=0.95,TE=1.28,BT=V3(3.15,1.42,0);
  // trazas en Manhattan sobre una cáscara ceñida al cuerpo; uP = frente que se propaga desde uO
  const CIRC=`uniform vec3 uO;
  void main(){vec2 g=vec2(atan(vP.z,vP.x)*2.6,vP.y*4.)*3.;vec2 c=floor(g),fq=fract(g);float h=hash(vec3(c,2.));
   float lh=smoothstep(.09,.03,abs(fq.y-.5))*step(.45,h);float lv=smoothstep(.09,.03,abs(fq.x-.5))*step(h,.3);
   float node=smoothstep(.2,.12,length(fq-.5))*step(.82,h);float tr=max(max(lh,lv),node);
   float d=length(vP-uO);float w=uP-d;float on=step(0.,w);float head=exp(-max(w,0.)*6.)*on;
   float pulse=.5+.5*sin(d*20.-uT*30.);
   gl_FragColor=vec4(mix(uC2,uC1,head+pulse*.3)*1.6+vec3(1.)*head*.4,tr*on*(.3+.7*head+.2*pulse)*uA);}`;
  const shellGeos=[new THREE.CylinderGeometry(0.36,0.44,1.27,36,1,true).translate(0,0.625,0),new THREE.SphereGeometry(0.29,28,18).translate(0,1.6,0)];
  const cMat=fxU(CIRC,{uO:{value:V3(0.23,1.66,0)}}), tMat=fxU(CIRC,{uO:{value:V3(-0.25,1.42,0)}});
  const cShell=new THREE.Group(), tShell=new THREE.Group();
  shellGeos.forEach(g=>{cShell.add(new THREE.Mesh(g,cMat));tShell.add(new THREE.Mesh(g,tMat));});
  cShell.position.set(-3.7,0,0); L.mesh.add(cShell,tShell);
  // láseres: hilo nítido + funda de brillo, con guiones que corren hacia el rival
  const BEAM=`void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),2.);float dash=.6+.4*step(.5,fract(vP.x*14.-uT*20.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),c*.6)*1.6,c*dash*uA);}`;
  const bG=new THREE.CylinderGeometry(1,1,1,10,1,true).rotateZ(-Math.PI/2).translate(0.5,0,0);
  const bMat=fx(BEAM), sMat=fx(BEAM);
  const beams=EYE.map(e=>{const g=new THREE.Group();g.position.copy(e);g.rotation.z=Math.atan2(BT.y-e.y,BT.x-e.x);
    const core=new THREE.Mesh(bG,bMat), sh=new THREE.Mesh(bG,sMat);core.userData.r=0.012;sh.userData.r=0.045;g.add(core,sh);g.userData.parts=[core,sh];L.trail.add(g);return g;});
  const LEN=EYE[0].distanceTo(BT);
  // retícula de crítico del rival: parpadea con cortes horizontales y se rompe en celdas (uQ)
  const ret=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),fxU(`uniform float uQ;
  void main(){vec2 uv=vUv;float sl=floor(uv.y*18.);uv.x+=(hash(vec3(sl,floor(uT*40.),1.))-.5)*.15*uP;
   vec2 p=(uv-.5)*2.;float r=length(p);vec2 ab=abs(p);
   float m=band(r,.62,.035)+band(r,.3,.02)+smoothstep(.035,0.,min(ab.x,ab.y))*step(.4,max(ab.x,ab.y))*step(max(ab.x,ab.y),.9)+smoothstep(.07,0.,r);
   vec2 cell=floor(vUv*14.);if(hash(vec3(cell,7.))<uQ)discard;
   float px=step(.88,hash(vec3(cell,floor(uT*25.))))*uP*.5;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.6,(m+px*m)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  L.mesh.add(ret);

  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const float TX=${f(TX)};const vec3 BT=${v3(BT)};`;
  // bits de datos que brotan del caparazón
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*TB;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.45,.2+aSeed.w*1.6+t*.9,sin(an)*.45);
   vA=(age>0.&&age<1.)?(1.-age)*step(.3,fract(uT*12.+aSeed.w)):0.;put(p,.04+.03*aSeed.y);}`,PIXEL_FS);
  // motas en los láseres
  a.count+=points(L.part,50,C+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.2;float age=(uT-s)/life;float k=clamp((s-TB)/(TI-TB),0.,1.);
   vec3 e=vec3(-3.47,1.66,aSeed.y<.5?.1:-.1);vec3 p=mix(e,BT,k*aSeed.z+(1.-aSeed.z)*k*k)+rnd()*.03;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.02*aSeed.w);}`);
  // la retícula se desintegra en píxeles
  a.count+=points(L.part,100,C+`void main(){float s=TX+aSeed.x*.2;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec2 q=(vec2(aSeed.z,aSeed.w)-.5)*.9;vec3 p=BT+vec3(-.45+q.x*.3,q.y,q.x)+vec3(.4*q.x,.5*t-1.4*t*t,.3)*t*2.;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.045+.03*aSeed.y);}`,PIXEL_FS);
  a.count+=sparks(L.part,50,TI,`${f(BT.x)},${f(BT.y)},0.`,"-.4,.3,0.",2,6,3);
  const ring=groundPlane(1.8,3.4,0.03,fx(RING_FS)); L.decal.add(ring);

  a.pose=function(te,o){
    const ia=te-TI, cp=ss(0,TB,te), fire=cl((te-TB)/(TI-TB));
    cShell.visible=te<TF+0.2; cMat.uniforms.uP.value=cp*2.4; cMat.uniforms.uA.value=ss(0,0.05,te)*(1-ss(TI,TF,te));
    tShell.position.copy(target.position); tShell.visible=ia>=0&&te<TE;
    tMat.uniforms.uP.value=cl(ia/0.3)*2.4; tMat.uniforms.uA.value=ia>=0?1-ss(TX+0.1,TE-0.05,te):0;
    const bA=te>=TB?1-ss(TI+0.03,TI+0.15,te):0;
    beams.forEach(g=>{g.visible=bA>0.002;g.userData.parts.forEach(m=>{const r=m.userData.r*(1+1.5*hitK(ia,12));m.scale.set(Math.max(LEN*fire,0.001),r,r);});});
    bMat.uniforms.uA.value=bA; sMat.uniforms.uA.value=bA*0.5;
    towardCam(ret.position,BT,0.6); billboard(ret,te*0.8); ret.visible=ia>=0&&te<TX+0.3;
    ret.scale.setScalar(0.6+0.4*ss(TI,TI+0.08,te)); set(ret,cl(ia/0.2),ia>=0?1:0); ret.material.uniforms.uQ.value=ss(TX,TX+0.25,te);
    let p=cl(ia/0.4); ring.position.x=target.position.x; set(ring,p,ia>=0?(1-p)*0.6:0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*cp*(1-ss(TI,TI+0.2,te));
    const hit=hitK(ia,6); target.position.x=3.4+0.1*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.1*hit*Math.cos(ia*20);
    const gx=hitK(te-TX,8)*(te>=TX?1:0); o.em=0.3*gx; o.emc.copy(U.uC1.value);
    if(te<TB){o.g.copy(EYM);o.gs=0.8*cp;o.ga=0.25*cp;o.li=1.6*cp;}
    else if(te<TI){o.g.set(EYM.x+(BT.x-EYM.x)*fire,EYM.y+(BT.y-EYM.y)*fire,0);o.gs=0.9;o.ga=0.35;o.li=2.5;}
    else{o.g.copy(BT);o.gs=1+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.55+0.2*gx;o.li=5*Math.exp(-ia*6)+2*gx;}
    o.ia=ia;o.c.copy(BT);o.shake=0;o.dist=0.4;
  };
}};

// =====================================================================
// 4 · NERDY — un destello en los ojos proyecta un haz que dibuja en el aire un diagrama geométrico (círculo,
//     triángulo inscrito, ángulo, parábola de tiro) hasta dar con la solución; el Axie se afila (crítico),
//     una sombra de debuff se le despega y un anillo de pasos marca el PM extra (nivel 1)
// =====================================================================
const nerdy={key:"ijNerdy",name:"Nerdy",pa:1,dur:1.25,ti:0.36,pal:"Rocío (Espalda)",
  phases:[["Destello",0],["Cálculo",0.08],["Solución",0.36],["Disipación",0.7]],
build(a){
  const L=a.L,TG=0.08,TI=0.36,TC1=0.7,TF=0.9,TE=1.22,H=V3(-2.3,2.0,0.3),CX=-3.7;
  // haz de proyección: pirámide de luz desde los ojos hasta el panel
  const fr=new THREE.Mesh(new THREE.ConeGeometry(1,1,4,1,true).translate(0,-0.5,0),fx(`void main(){float l=-vP.y;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float sc=band(fract(l*4.-uT*3.),.5,.08);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*sc)*1.4,(pow(fr,2.)*.35+sc*.2)*smoothstep(0.,.15,l)*uA);}`));
  L.trail.add(fr);
  const dir=V3(0,0,0).subVectors(H,EYM), FLEN=dir.length(); dir.normalize();
  fr.position.copy(EYM); fr.quaternion.setFromUnitVectors(NY,dir);
  // panel holográfico: los elementos se trazan en orden con uP; uQ enciende la solución
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.15),fxU(SDF2+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float sc=.85+.15*sin(p.y*90.-uT*30.);
   vec2 gq=abs(fract(p*4.)-.5);float grid=smoothstep(.46,.5,max(gq.x,gq.y))*.12*smoothstep(1.,.6,length(p));
   float a01=atan(p.y,p.x)/6.2832+.5;float circ=band(length(p),.55,.012)*step(a01,uP*2.2);
   float tk=band(length(p),.61,.03)*step(.85,fract(a01*24.))*step(.45,uP);
   vec2 A=vec2(0.,.55),B=vec2(-.476,-.275),D=vec2(.476,-.275);
   float t1=clamp((uP-.3)/.12,0.,1.),t2=clamp((uP-.42)/.12,0.,1.),t3=clamp((uP-.54)/.12,0.,1.),t4=clamp((uP-.62)/.3,0.,1.);
   float tri=smoothstep(.012,0.,sdSeg(p,A,mix(A,B,t1)))*step(.001,t1)+smoothstep(.012,0.,sdSeg(p,B,mix(B,D,t2)))*step(.001,t2)+smoothstep(.012,0.,sdSeg(p,D,mix(D,A,t3)))*step(.001,t3);
   float ab=atan(p.y-B.y,p.x-B.x);float arc=band(length(p-B),.16,.01)*step(.7,uP)*step(0.,ab)*step(ab,1.05);
   float py=.62-1.3*(p.x+.15)*(p.x+.15);float par=smoothstep(.016,0.,abs(p.y-py))*step(.45,fract(p.x*9.-uT*2.))*step(p.x,-.9+1.8*t4)*step(-.9,p.x);
   vec2 S=vec2(.33,.31);float sol=(smoothstep(.07,0.,length(p-S))+band(length(p-S),.06+.14*uQ,.012))*uQ;
   float frame=smoothstep(.015,0.,abs(max(abs(p.x),abs(p.y))-.95))*.5;
   float m=(grid+circ+tk+tri+arc+par+frame)*sc;
   gl_FragColor=vec4(mix(uC1,vec3(1.),sol*.6+tri*.2)*1.5,(m+sol*1.3)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  L.mesh.add(panel);

  const C=`const float TG=${f(TG)};const float TI=${f(TI)};const float TC1=${f(TC1)};const vec3 H=${v3(H)};const vec3 E=${v3(EYM)};`;
  // destello de las lentes (luz temporal en los ojos)
  a.count+=points(L.part,2,C+`void main(){vec3 p=vec3(-3.4,1.67,aSeed.x<.5?.12:-.12)+vec3(0.,0.,.05);float age=uT/TG;
   vA=(age>0.&&age<1.4)?sin(min(age,1.)*3.14159):0.;put(p,.3*sin(clamp(age,0.,1.)*3.14159));}`,STAR4_FS);
  // motas que viajan por el haz y chispas en el panel
  a.count+=points(L.part,70,C+`void main(){float s=TG+aSeed.x*(TI-TG+.15);float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(E,H+vec3((aSeed.y-.5)*.9,(aSeed.z-.5)*.9,0.),k);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.025+.025*aSeed.w);}`);
  a.count+=points(L.part,24,C+`void main(){float s=TI+aSeed.x*.1;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=H+vec3((aSeed.z-.5)*1.,(aSeed.w-.5)*1.,.05)+vec3(0.,.3*t,0.);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.03*aSeed.w);}`);
  // filo de crítico: destellos agudos sobre el Axie
  a.count+=points(L.part,12,C+`void main(){float s=TI+.02+aSeed.x*.15;float life=.25+aSeed.y*.15;float age=(uT-s)/life;
   vec3 p=vec3(-3.7+(aSeed.z-.5)*.8,.4+aSeed.w*1.4,.35);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.12+.12*aSeed.y)*sin(clamp(age,0.,1.)*3.14159));}`,STAR4_FS);
  // limpieza: sombra de debuff (violeta grisácea fija) que se despega del cuerpo y se evapora
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.25;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*(.42+.3*t),.3+aSeed.w*1.4+1.1*t,sin(an)*(.42+.3*t));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.14+.12*aSeed.w)*(.7+age));}`,SMOKE_FS("vec3(.2,.13,.24)"),NB);
  // +1 PM: anillo de pasos bajo el Axie que gira hacia delante
  const steps=groundPlane(1.9,CX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
   float k=fract(an*10.-uT*1.5);float chev=smoothstep(.08,.0,abs(k-.5-(r-.75)*.8))*band(r,.75,.1);
   float m=band(r,.95*uP,.02)+chev*step(r,uP+.05);
   gl_FragColor=vec4(mix(uC2,uC1,chev)*1.4,m*uA);}`));
  L.decal.add(steps);

  a.pose=function(te,o){
    const ia=te-TI, draw=cl((te-TG)/(TI-TG)), env=ss(TG,TG+0.05,te)*(1-ss(TC1,TF,te)), col=ss(TC1,TF,te);
    fr.visible=env>0.002; fr.scale.set(0.42*(1-col),FLEN,0.35*(1-col)+0.001); fr.material.uniforms.uA.value=env*(0.7+0.5*hitK(ia,10));
    panel.position.copy(H); billboard(panel,0.05); panel.visible=env>0.002;
    panel.scale.set(1,Math.max(1-col,0.02)*(0.9+0.1*ss(TG,TI,te)),1); set(panel,draw,env); panel.material.uniforms.uQ.value=ss(TI-0.02,TI+0.08,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.55*hitK(ia,7);
    caster.rotation.z=-0.04*ss(0,TG,te)*(1-ss(TI,TI+0.2,te));
    set(steps,ss(TI,TI+0.25,te),ss(TI,TI+0.1,te)*(1-ss(TF,TE,te)));
    if(te<TG){o.g.copy(EYM);o.gs=0.8;o.ga=0.4*ss(0,0.04,te);o.li=1.5;}
    else if(te<TI){o.g.copy(H);o.gs=1.2;o.ga=0.25;o.li=2*draw;}
    else{o.g.set(-3.0,1.6,0.2);o.gs=1.4;o.ga=0.4*Math.exp(-ia*7)+0.1*env;o.li=4*Math.exp(-ia*5)+env;}
    o.ia=ia;o.c.copy(H);o.shake=0;o.dist=0.2;o.flash=0;
  };
}};

// =====================================================================
// 5 · LADYBUG GOGGLES — ante los ojos se ensambla una lente multifacetada de mariquita (proyección de luz);
//     tres conos de luz roja barren el campo y fijan a cada rival, revelan su punto débil con un sello y,
//     al golpe, la baldosa bajo el rival principal se fractura; la energía refluye por los conos y enciende
//     al Axie (PA extra) (nivel 3)
// =====================================================================
const ladybug={key:"ijLadybugGoggles",name:"Ladybug Goggles",pa:3,dur:3.0,ti:1.3,pal:"Rubí",enemies:2,
  phases:[["Lente",0],["Barrido",0.6],["Fijación",1.15],["Revelación",1.3],["Reflujo",1.5],["Fin",2.5]],
build(a){
  const L=a.L,TS=0.6,TK=1.15,TI=1.3,TR=1.5,TRE=2.4,TF=2.5,TE=2.95,LP=V3(-2.95,1.72,0.1);
  const R=[V3(3.15,1.2,0),V3(ENEMY_POS[0].x,1.2,ENEMY_POS[0].z),V3(ENEMY_POS[1].x,1.2,ENEMY_POS[1].z)];
  const OFF=[V3(0,1.8,1.6),V3(-1.2,1.4,-1.2),V3(-0.8,2.0,1.8)];
  const aimAt=(i,te,out)=>{const k=ss(TS,TK,te);return out.copy(R[i]).addScaledVector(OFF[i],1-k);};
  // lente compuesta: facetas hexagonales que se encienden una a una, siete manchas de mariquita y brillo
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fxU(HEX+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.)discard;
   vec3 h=hexCell(p*6.);float id=hash(vec3(h.yz,2.));float on=step(id,uP*1.1)*step(length(h.yz/6.),.95);
   float edge=smoothstep(.38,.5,h.x);
   float sp=1.;for(int i=0;i<7;i++){float fi=float(i);vec2 c=fi<.5?vec2(0.):vec2(cos(fi*1.047+.5),sin(fi*1.047+.5))*.58;sp=min(sp,length(p-c)-(fi<.5?.2:.13));}
   float spot=smoothstep(.02,-.02,sp);
   float sheen=pow(max(0.,1.-length(p-vec2(-.35,.4))*1.2),3.);float rim=band(r,.97,.03);
   vec3 c=mix(uC1*1.3,vec3(.05,.01,.02),spot*.85)*(.75+.25*hash(vec3(h.yz,5.)))+(vec3(1.)*.25+uC1*.6)*edge+vec3(1.)*sheen*.5;
   gl_FragColor=vec4(c+uC1*rim*2.+vec3(1.)*uQ*on*.6,(on*.88+rim)*uA);}`,{uQ:{value:0}},Object.assign({depthTest:false},NB)));
  L.mesh.add(lens);
  // conos de luz roja: anillos que corren hacia el rival (y hacia la lente en el reflujo, uQ)
  const CONE_FS=`uniform float uQ;
  void main(){float l=-vP.y;float fr=abs(dot(normalize(vN),normalize(vV)));
   float scan=band(fract(l*5.-uT*3.),.5,.06)*(1.-uQ)+band(fract(l*5.+uT*5.),.5,.08)*uQ;
   float body=pow(fr,1.5)*.35*smoothstep(0.,.1,l)*smoothstep(1.,.85,l);
   gl_FragColor=vec4(mix(uC2,uC1,scan+fr*.5)*1.5,(body+scan*.6*fr*smoothstep(1.,.9,l))*uA);}`;
  const coneG=new THREE.ConeGeometry(1,1,32,1,true).translate(0,-0.5,0);
  const cones=R.map(()=>{const m=new THREE.Mesh(coneG,fxU(CONE_FS,{uQ:{value:0}}));L.trail.add(m);return m;});
  // sellos de punto débil sobre cada rival
  const SIG_FS=HEX+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ring=band(r,.8*uP,.03)+band(r,.62,.02)*step(.5,fract(an/6.2832*12.+uT*.5));
   vec3 h=hexCell(p*5.);float hx=smoothstep(.42,.5,h.x)*step(r,.55)*step(.3,r)*.6;
   float core=smoothstep(.22,0.,r)*(.6+.4*sin(uT*14.));
   float spots=0.;for(int i=0;i<6;i++){float a0=float(i)*1.047+uT*.8;spots+=smoothstep(.07,.04,length(p-vec2(cos(a0),sin(a0))*.45));}
   gl_FragColor=vec4(mix(uC2,uC1,core+ring)*1.6+vec3(1.)*core*.5,(ring+hx+core+spots*.8)*uA);}`;
  const sigils=R.map((r,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(i?1.1:1.4,i?1.1:1.4),fx(SIG_FS,{depthTest:false}));L.mesh.add(m);return m;});
  // suelo: fractura de baldosa bajo el rival principal; ondas rojas bajo los otros dos y bajo el Axie
  const FS=6.4, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  const eRings=[0,1].map(i=>{const g=groundPlane(2.6,ENEMY_POS[i].x,0.03,fx(RING_FS));g.position.z=ENEMY_POS[i].z;return g;});
  const shock=groundPlane(7,3.4,0.03,fx(RING_FS)), cRing=groundPlane(2.4,-3.7,0.03,fx(RING_FS));
  L.decal.add(frac,shock,cRing,...eRings);

  const C=`const float TS=${f(TS)};const float TK=${f(TK)};const float TI=${f(TI)};const float TR=${f(TR)};const float TRE=${f(TRE)};const vec3 LP=${v3(LP)};
  vec3 rv(float i){return i<.5?${v3(R[0])}:(i<1.5?${v3(R[1])}:${v3(R[2])});}
  vec3 off(float i){return i<.5?${v3(OFF[0])}:(i<1.5?${v3(OFF[1])}:${v3(OFF[2])});}
  vec3 aim(float i,float t){return rv(i)+off(i)*(1.-smoothstep(TS,TK,t));}`;
  // la lente se ensambla con motas que convergen
  a.count+=points(L.part,120,C+`void main(){float s=aSeed.x*.5;float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(LP+normalize(rnd()+.001)*(1.+.8*aSeed.y),LP+vec3((aSeed.z-.5)*1.2,(aSeed.w-.5)*1.2,0.),k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.w);}`);
  // polvo iluminado dentro de los conos durante el barrido
  a.count+=points(L.part,270,C+`void main(){float i=floor(aSeed.x*2.999);float s=TS+aSeed.y*(TI-TS+.15);float life=.35;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 tg=aim(i,uT);vec3 d=tg-LP;vec3 sd=normalize(cross(d,vec3(0.,1.,0.)));vec3 up=normalize(cross(sd,d));float an=aSeed.z*6.2832;
   vec3 p=LP+d*k+(sd*cos(an)+up*sin(an))*.45*k*aSeed.w;
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.03+.035*aSeed.w);}`);
  // reflujo: la energía vuelve por los conos hasta la lente
  a.count+=points(L.part,180,C+`void main(){float i=floor(aSeed.x*2.999);float s=TR+aSeed.y*(TRE-TR-.3);float life=.32;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 d=rv(i)-LP;vec3 sd=normalize(cross(d,vec3(0.,1.,0.)));vec3 up=normalize(cross(sd,d));float an=aSeed.z*6.2832+k*6.;
   vec3 p=rv(i)-d*k+(sd*cos(an)+up*sin(an))*.4*(1.-k)*aSeed.w;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.04*aSeed.w);}`);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.1;float life=.4+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=LP+vec3((aSeed.z-.5)*1.3,(aSeed.w-.5)*1.3,.1);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.18+.15*aSeed.y)*sin(clamp(age,0.,1.)*3.14159));}`,STAR4_FS);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.1;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,0.,0.)+vec3(cos(an),0.,sin(an))*(.4+1.6*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.4*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.3+.3*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  R.forEach((r,i)=>{a.count+=sparks(L.part,70,TI,`${f(r.x)},${f(r.y)},${f(r.z)}`,"0.,.5,0.",3,i?8:12,3.2);});

  const ap=V3(0,0,0), dv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, lf=ss(0,TS,te), env=1-ss(TF,TE,te), ret=ss(TR,TR+0.15,te)*(1-ss(TRE,TRE+0.2,te));
    towardCam(lens.position,LP,0.2); billboard(lens,-0.1+0.05*Math.sin(te*2)); lens.visible=env>0.002&&te>0.02;
    lens.scale.setScalar((0.55+0.45*ss(0,0.35,te))*(1+0.12*hitK(ia,6)+0.06*ret*Math.sin(te*14)));
    set(lens,lf,ss(0,0.1,te)*env); lens.material.uniforms.uQ.value=hitK(ia,5)+0.4*ret;
    cones.forEach((m,i)=>{aimAt(i,te,ap); dv.subVectors(ap,LP); const len=dv.length(); dv.normalize();
      m.position.copy(LP); m.quaternion.setFromUnitVectors(NY,dv); const w=(0.42+0.15*hitK(ia,5))*(i?0.85:1);
      m.scale.set(w,Math.max(len*ss(TS-0.05,TS+0.15,te),0.001),w); m.visible=te>TS-0.05&&env>0.002;
      set(m,0,ss(TS-0.05,TS+0.1,te)*(0.7+0.6*hitK(ia,5))*(1-ss(TRE,TF+0.2,te))); m.material.uniforms.uQ.value=ss(TR-0.1,TR+0.1,te);});
    sigils.forEach((m,i)=>{const d=i?enemies[i-1].position:target.position;towardCam(m.position,tmp.set(d.x,1.2,d.z),0.6);billboard(m,te*0.4);
      const sa=ss(TK,TI,te)*(1-ss(TRE-0.2,TF,te));m.visible=sa>0.002;m.scale.setScalar(1+0.25*hitK(ia,6));set(m,ss(TK,TI+0.1,te),sa);});
    const hit=hitK(ia,3.5);
    target.position.x=3.4+0.4*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.35*Math.cos(ia*13);
    enemies.forEach((d,i)=>{d.rotation.z=-hitK(ia,5)*0.15*Math.cos(ia*14+i);glowOf(d,hitK(ia,5)*1.2+0.18*ss(TK,TI,te)*(1-ss(TRE,TF,te)));});
    o.em=0.18*ss(TK,TI,te)*(1-ss(TRE,TF,te)); o.emc.copy(U.uC1.value);
    frac.position.x=shock.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+0.9,TE,te):0);
    let p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    eRings.forEach(g=>set(g,p,ia>=0?(1-p)*0.8:0));
    p=cl((te-TR-0.4)/0.6); set(cRing,p,te>TR+0.4?(1-p)*0.7:0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*lf*(1-ss(TS,TS+0.3,te))+ret*(0.45+0.25*Math.sin(te*12))+0.6*hitK(te-TRE,4)*(te>=TRE?1:0);
    caster.rotation.z=0.06*ss(0,TS,te)*(1-ss(TI,TI+0.3,te))-0.08*hitK(ia,6);
    if(te<TS){o.g.copy(LP);o.gs=1.6*lf;o.ga=0.35*lf;o.li=3*lf;}
    else if(te<TI){aimAt(0,te,ap);o.g.lerpVectors(LP,ap,0.6);o.gs=1.6;o.ga=0.35;o.li=4;}
    else if(te<TR){o.g.copy(TC);o.gs=2+5*ia;o.ga=Math.exp(-ia*9)*0.9;o.li=14*Math.exp(-ia*4.5);}
    else{o.g.copy(LP);o.gs=1.8;o.ga=(0.25+0.15*Math.sin(te*12))*ret+0.05;o.li=4*ret+1;}
    o.ia=ia;o.c.copy(TC);o.shake=1.5;o.dist=1.2;
  };
}};

// =====================================================================
// 6 · PACU — unas mandíbulas espectrales de pez pacú con dientes planos casi humanos se abren sobre la casilla
//     del rival y se cierran de golpe: lo aplastan, rechinan y sueltan esquirlas de esmalte y burbujas (nivel 1)
// =====================================================================
const pacu={key:"ijPacu",name:"Pacu",pa:1,dur:1.15,ti:0.36,pal:"Rosa",
  phases:[["Apertura",0],["Mordisco",0.26],["Impacto",0.36],["Rechinar",0.4],["Disipación",0.62]],
build(a){
  const L=a.L,TO=0.08,TS=0.26,TI=0.36,TG=0.6,TF=0.85,TE=1.12,BITE=V3(3.15,1.25,0),JW=1.25,JH=0.62;
  // mandíbula: y=0 en la línea de mordida; labio grueso escamado, encía e incisivos/molares planos
  const JAW_FS=`uniform float uQ;
  void main(){vec2 p=vUv;float y=uQ>0.?p.y:1.-p.y;float x=p.x*2.-1.;
   float lipC=.62-.3*x*x;float sil=smoothstep(lipC+.02,lipC-.02,y)*smoothstep(1.,.92,abs(x));
   float gum=.2+.06*x*x;
   float u=sign(x)*pow(abs(x),.85)*6.5;float cf=fract(u)-.5;float ci=floor(u);
   float tl=.17-.05*min(abs(ci+.5),3.)/3.;float tip=gum-tl+.05*pow(abs(cf)*2.2,3.);
   float tooth=smoothstep(.46,.4,abs(cf))*smoothstep(tip,tip+.02,y)*step(y,gum)*step(abs(x),.88);
   float body=sil*step(gum,y);float gl=band(y,gum,.025)*step(abs(x),.92);
   float sc=noise(vec3(x*14.,y*20.,1.));
   vec3 c=mix(uC2*.45,uC2*.9,sc)*(.7+.5*smoothstep(lipC,gum,y));
   c=mix(c,mix(uC1,vec3(1.,.75,.8),.3),gl);
   c=mix(c,vec3(.98,.95,.86)*(.85+.15*cos(cf*3.)),tooth*(1.-body));
   float rim=band(y,lipC,.03)*smoothstep(1.,.85,abs(x));
   float al=max(max(body,gl),tooth)*uA;if(al<.01&&rim*uA<.01)discard;
   gl_FragColor=vec4(c+vec3(1.)*uP*tooth*.6+uC1*rim,max(al,rim*uA*.8));}`;
  const jaws=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(JW,JH),fxU(JAW_FS,{uQ:{value:s}},Object.assign({depthTest:false},NB)));m.userData.s=s;L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const C=`const float TI=${f(TI)};const vec3 BT=${v3(BITE)};`;
  // esquirlas de esmalte/barricada, burbujas y chispas del mordisco
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.2,0.))*vec3(2.6,1.6,2.)*(.5+aSeed.z);vec3 p=BT+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.045+.04*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.2;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=BT+vec3((aSeed.z-.5)*.8,(aSeed.w-.5)*.3+.8*t,(aSeed.y-.5)*.5)+vec3(sin(t*10.+aSeed.x*9.)*.05,0.,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.05+.06*aSeed.w);}`,BUBBLE_FS);
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*.25;float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(BT+normalize(rnd()+.001)*1.1,BT,k);vA=(age>0.&&age<1.)?k*.8:0.;put(p,.03+.03*aSeed.w);}`);
  a.count+=sparks(L.part,60,TI,`${f(BITE.x)},${f(BITE.y)},0.`,"0.,.2,0.",2,6,3);
  const ring=groundPlane(1.8,3.4,0.03,fx(RING_FS)); L.decal.add(ring);

  a.pose=function(te,o){
    const ia=te-TI; camAxes();
    const app=ss(0,TO,te), fade=1-ss(TG,TF,te);
    // apertura → mordida (las filas se solapan) → rechinar lateral → se separan
    const gap=te<TS?0.75+0.3*ss(TO,TS,te):te<TI?1.05-1.11*Math.pow((te-TS)/(TI-TS),2):-0.06+0.6*ss(TG,TF,te);
    const grind=te>=TI?0.05*Math.sin((te-TI)*40)*(1-ss(TI+0.1,TG,te)):0;
    towardCam(tmp,BITE,0.6);
    jaws.forEach(m=>{const s=m.userData.s;m.position.copy(tmp).addScaledVector(CU,s*(gap/2+JH/2)).addScaledVector(CR,s*grind);
      billboard(m,0); m.visible=app*fade>0.002; m.scale.set(0.85+0.15*app,0.85+0.15*app,1); set(m,hitK(ia,6),app*fade);});
    let p=cl(ia/0.3); towardCam(hitRing.position,BITE,0.7); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.4); ring.position.x=target.position.x; set(ring,p,ia>=0?(1-p)*0.6:0);
    // aplastamiento del rival
    const sq=hitK(ia,7);
    target.scale.set(1+0.1*sq,1-0.18*sq,1+0.1*sq); target.position.x=3.4+0.03*Math.sin(te*60)*(ia>=0?1-ss(TI+0.1,TG,te):0);
    caster.rotation.z=-0.06*ss(0,TS,te)*(1-ss(TI,TI+0.2,te));
    if(te<TI){o.g.copy(BITE);o.gs=1.1*app;o.ga=0.25*app;o.li=2*app;}
    else{o.g.copy(BITE);o.gs=1.1+2.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.6;o.li=6*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(BITE);o.shake=0;o.dist=0.5;
  };
}};

VFX.module("Bicho · Ojos",[bookworm,kotaro,neo,nerdy,ladybug,pacu]);
})();

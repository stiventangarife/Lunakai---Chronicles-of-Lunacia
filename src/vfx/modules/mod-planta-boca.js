// =====================================================================
// MÓDULO · CLASE PLANTA (BOCA)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Las piezas reutilizables vienen de vfx-lib.js (VFX.lib). Estética vegetal: savia, clorofila, raíces, rocío.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,SCORCH_FS,
  camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube}=VFX.lib;

VFX.palette("Rocío (Boca)",["#c8fff0","#35b98f"]);
VFX.palette("Clorofila",["#a6ff52","#138a50"]);

const MO=V3(-3.43,1.55,0);               // boca del lanzador
const CX=-3.7;                            // centro del lanzador en x (marcas de suelo)
const TC=V3(3.15,1.2,0);                  // pecho del objetivo, cara visible
const tmp=V3(0,0,0), tmp2=V3(0,0,0), camR=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const hash1=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const cub=(A,B,C,D,t,out)=>{const s=1-t,a=s*s*s,b=3*s*s*t,c=3*s*t*t,d=t*t*t;
  return out.set(A.x*a+B.x*b+C.x*c+D.x*d,A.y*a+B.y*b+C.y*c+D.y*d,A.z*a+B.z*b+C.z*c+D.z*d);};
const greenCaster=(k)=>{const cm=caster.userData.m;cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=k;};

// ---------- sprites vegetales ----------
// hoja girada (vR): vesica con nervio central y nervaduras
const LEAF_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=max(length(q-vec2(.26,0.)),length(q+vec2(.26,0.)))-.46;
 float a=smoothstep(.02,-.02,d)*vA;if(a<.003)discard;
 float vein=band(q.x,0.,.018)*step(abs(q.y),.34)+band(fract((q.y+abs(q.x)*.9)*7.),.5,.09)*.45*smoothstep(-.01,-.06,d);
 float rim=band(d,-.025,.025);
 gl_FragColor=vec4(mix(uC2,uC1,.35+.4*vMix+vein*.6)*1.25+vec3(1.)*(vein*.25+rim*.3),a);}`;
// gota de rocío / savia: cuerpo redondo con punta, borde y brillo especular
const DEW_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;
 float body=length(q-vec2(0.,-.1))-.2;float tip=max(abs(q.x)-(.4-q.y)*.4,-(q.y+.1));
 float d=min(body,tip);float fill=smoothstep(.025,-.01,d);
 float rim=band(d,-.03,.03);float hl=smoothstep(.07,0.,length(q-vec2(-.07,-.14)));
 float a=(fill*.35+rim*.8+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.45+.4*hl)*1.4,a);}`;
// terrón: esquirla oscura de tierra (mezcla normal)
const CLOD_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.2+q.y+.15*sin(vMix*20.);
 float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.2,.13,.07),vec3(.38,.27,.15),vMix),a);}`;

// ---------- marcas de suelo ----------
// roseta de hojas: ocho hojas con nervio y dos anillos; uP aviva
const ROSETTE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float k=fract(an/6.2832*8.+uT*.03)-.5;
 float t=clamp((r-.15)/.75,0.,1.);float w=.42*sin(3.14159*t);
 float petal=smoothstep(w,w-.08,abs(k)*2.)*step(.15,r)*step(r,.9);
 float vein=band(k,0.,.03)*petal;
 float ring=band(r,.95,.02)+band(r,.12,.03);
 gl_FragColor=vec4(mix(uC2,uC1,vein+ring+petal*.3)*1.3+vec3(1.)*vein*uP*.4,(petal*(.3+.3*uP)+vein*.8+ring)*uA);}`;
// anillo de espinas: corona de púas que se dispara con uP
const THORN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
 float sp=pow(1.-abs(fract(an*12.)-.5)*2.,4.);float R1=.42+.5*sp*uP;
 float th=smoothstep(R1,R1-.05,r)*smoothstep(.36,.44,r);
 float vine=band(r+(noise(vec3(an*40.,0.,1.))-.5)*.06,.4,.045);
 float glow=smoothstep(.45,0.,r)*.15;
 gl_FragColor=vec4(mix(uC2,uC1,th*.6+vine)*1.4,(th*.8+vine+glow)*uA);}`;
// corteza con vetas de savia (opaca); uP enciende las vetas
const ROOT_FS=`void main(){float n=noise(vec3(vP.x*9.,vP.y*20.,vP.z*9.));float n2=noise(vP*30.);
 vec3 bark=mix(vec3(.15,.09,.045),vec3(.38,.26,.13),n*.7+n2*.3);
 float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
 float vein=smoothstep(.6,.72,noise(vec3(vP.x*5.,vP.y*12.-uT*3.,vP.z*5.)));
 float fr=1.-abs(dot(normalize(vN),normalize(vV)));
 gl_FragColor=vec4(bark*lit+uC1*vein*(.35+1.6*uP)+uC2*fr*fr*.9*uP,1.);}`;

// =====================================================================
// 1 · SERIOUS — una trampa carnívora espinosa muerde la cabeza del rival y le exprime la savia; una semilla
//     de savia luminosa viaja por un rastro de clorofila hasta la boca del Axie y le sube en espiral verde
//     nivel 2: firme y estándar — trampa mediana, drenaje y vigor más breves
// =====================================================================
const serious={key:"pbSerious",name:"Serious",dur:2.4,ti:0.62,pal:"Savia",
  phases:[["Brote",0],["Acecho",0.22],["Cierre",0.5],["Drenaje",0.62],["Savia",1.05],["Vigor",1.55],["Fin",2.05]],
build(a){
  const L=a.L,TO=0.22,TC0=0.5,TI=0.62,TG=0.72,TS=1.05,TA=1.55,TE=2.05;
  const JC=V3(3.25,1.6,0);                                   // centro de la trampa: cabeza del rival
  const B0=V3(2.5,1.6,0.05),B1=V3(-0.3,3.35,0.75),B2=V3(MO.x+0.1,MO.y,0);
  const bez=(t,out)=>{const s=1-t;return out.set(s*s*B0.x+2*s*t*B1.x+t*t*B2.x,s*s*B0.y+2*s*t*B1.y+t*t*B2.y,s*s*B0.z+2*s*t*B1.z+t*t*B2.z);};
  const bezD=(t,out)=>out.set(2*(1-t)*(B1.x-B0.x)+2*t*(B2.x-B1.x),2*(1-t)*(B1.y-B0.y)+2*t*(B2.y-B1.y),2*(1-t)*(B1.z-B0.z)+2*t*(B2.z-B1.z));
  // valva de la trampa (coordenadas locales: bisagra en el origen, la valva se extiende hacia −x)
  // cuerpo con nervaduras y rubor interior, borde brillante y cilios espinosos que cuelgan del labio;
  // uS desplaza media celda los cilios de la valva inferior para que se entrelacen; uW la marchita
  const VALVE_FS=`uniform float uS;uniform float uW;
  void main(){float x=vP.x,y=vP.y;float u=-x/1.6;float cu=clamp(u,0.,1.);
   float inU=step(0.,u)*step(u,1.);
   float yt=.6*pow(max(sin(3.14159*cu),0.),.7);float yl=-.04*sin(3.14159*cu);
   float body=smoothstep(yl-.005,yl+.02,y)*smoothstep(yt+.005,yt-.025,y)*inU;
   float rim=band(y,yt-.02,.03)*inU*step(.02,u);
   float N=11.;float cc=u*N+uS*.5;float cell=fract(cc)-.5;float id=floor(cc);
   float ls=.3*(.75+.25*hash(vec3(id,uS,3.)))*smoothstep(.02,.12,u)*smoothstep(1.,.9,u);
   float t=(yl-y)/max(ls,.001);float cx=cell+t*t*.3;
   float spine=step(0.,t)*step(t,1.)*smoothstep(.2*(1.-t)+.03,.2*(1.-t)-.03,abs(cx));
   float ang=atan(y,-x);float vein=band(fract(ang*7.+noise(vec3(x*3.,y*3.,1.))*.6),.5,.08)*body*smoothstep(0.,.25,u);
   float cel=noise(vec3(x*14.,y*14.,2.));
   float blush=smoothstep(yt*.6,0.,y-yl)*body;
   vec3 skin=mix(uC2*.45,uC2*1.1,cel*.6+.4*smoothstep(0.,yt+.001,y));
   skin=mix(skin,vec3(.78,.24,.18),blush*.45);
   vec3 c=skin+uC1*(vein*(.5+1.4*uP)+rim*.9)+mix(uC1,vec3(1.),.4)*spine*1.2;
   float th=uW*1.15-.08;float n=noise(vec3(x*6.,y*6.,5.));if(n<th)discard;
   float burn=smoothstep(.12,0.,n-th)*step(.001,uW);
   c+=uC1*burn*1.5;
   gl_FragColor=vec4(c,min(max(body*.94,spine)+rim*.3+burn,1.)*uA);}`;
  const vg=new THREE.PlaneGeometry(1.8,1.1).translate(-0.8,0.2,0);
  const upper=new THREE.Mesh(vg,fxU(VALVE_FS,{uS:{value:0},uW:{value:0}},Object.assign({depthTest:false},NB)));
  const lower=new THREE.Mesh(vg,fxU(VALVE_FS,{uS:{value:1},uW:{value:0}},Object.assign({depthTest:false},NB)));
  upper.renderOrder=lower.renderOrder=2;
  const snapRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  // semilla de savia: lágrima alargada (cabeza hacia +x) con remolino interior y halo
  const seed=new THREE.Mesh(new THREE.PlaneGeometry(0.66,0.37),fx(`void main(){vec2 p=(vUv-.5)*vec2(2.,1.125)*1.1;
   float body=length(p-vec2(.38,0.))-.3;float tail=max(max(abs(p.y)-(p.x+.85)*.25,-(p.x+.85)),p.x-.38);
   float d=min(body,tail);float n=noise(vec3(p*6.-vec2(uT*6.,0.),uT));
   float fill=smoothstep(.02,-.03,d);float core=smoothstep(.0,-.2,body);float halo=smoothstep(.35,0.,d)*.45;
   gl_FragColor=vec4(mix(uC1,vec3(1.),core*.7+n*.2)*1.6,(fill*(.6+.4*n)+core+halo)*uA);}`,{depthTest:false}));
  L.mesh.add(upper,lower,snapRing,seed);
  // rastro de clorofila: cinta principal + zarcillo enroscado; uP revela desde la trampa, uQ = posición de la semilla
  const RIB_FS=`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float st=noise(vec3(u*28.-uT*7.,vUv.y*6.,0.));
   float sd=exp(-pow((u-uQ)*14.,2.))*step(0.,uQ);float wake=smoothstep(uQ,uQ-.25,u)*step(0.,uQ)*step(u,uQ)*.5;
   float head=exp(-(uP-u)*30.)*step(uP,.995);
   vec3 c=mix(uC2,uC1,.35+.65*st)*1.3+vec3(1.)*(sd*.9+head*.5);
   gl_FragColor=vec4(c,(.22+.5*fr+.35*st*fr+sd+wake*fr+head*.6)*uA);}`;
  const ribMat=fxU(RIB_FS,{uQ:{value:-1}});
  const pts=[],tpts=[],Y=V3(0,1,0),n1=V3(0,0,0),n2=V3(0,0,0);
  for(let i=0;i<=40;i++)pts.push(bez(i/40,V3(0,0,0)));
  for(let i=0;i<=120;i++){const t=i/120,p=bez(t,V3(0,0,0));bezD(t,tmp).normalize();
    n1.copy(tmp).cross(Y).normalize(); n2.copy(n1).cross(tmp).normalize();
    const an=t*Math.PI*16,amp=0.1*Math.sin(Math.PI*t);
    p.addScaledVector(n1,Math.cos(an)*amp).addScaledVector(n2,Math.sin(an)*amp); tpts.push(p);}
  L.trail.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),140,0.055,8,false),ribMat),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tpts),200,0.018,5,false),ribMat));
  // espiral de vigor que sube por el cuerpo del Axie cuando la savia llega
  const helix=new THREE.Mesh(helixGeo(2.5,0.5,0.34,1.95,0.12,180),fx(`void main(){float u=vUv.x;if(u>uP)discard;float v=abs(vUv.y-.5)*2.;
   float head=exp(-(uP-u)*18.);float n=noise(vec3(u*20.-uT*4.,v,0.));
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.4+vec3(1.)*head*.6,(1.-v*v)*(.35+.4*n+head)*uA);}`));
  helix.position.set(CX,0.05,0); L.trail.add(helix);
  // suelo: corona de espinas bajo el rival, roseta de hojas bajo el Axie
  const thorns=groundPlane(2.1,3.4,0.02,fx(THORN_FS)), rosette=groundPlane(2,CX,0.021,fx(ROSETTE_FS)), shock=groundPlane(3.8,3.4,0.03,fx(RING_FS));
  L.decal.add(thorns,rosette,shock);

  const C=`const float TO=${f(TO)};const float TI=${f(TI)};const float TG=${f(TG)};const float TS=${f(TS)};const float TA=${f(TA)};
  const vec3 JC=${v3(JC)};const vec3 B0=${v3(B0)};const vec3 B1=${v3(B1)};const vec3 B2=${v3(B2)};
  vec3 bez(float t){float s=1.-t;return s*s*B0+2.*s*t*B1+t*t*B2;}
  float sd(float t){float q=clamp((t-TS)/(TA-TS),0.,1.);return q*q*(3.-2.*q);}`;
  // brote: hojas y esporas que giran hacia la cabeza del rival y forman la trampa
  a.count+=points(L.part,30,`varying float vR;`+C+`void main(){float life=.28+aSeed.y*.15;float age=(uT-aSeed.x*(TO+.08))/life;
   vec3 d=normalize(rnd()+.0001);float k=age*age;float an=k*3.;
   vec3 o=d*mix(1.25,.1,k);vec3 p=JC+vec3(o.x*cos(an)-o.y*sin(an),o.x*sin(an)+o.y*cos(an),o.z);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*(1.-k*.5):0.;vR=aSeed.z*6.28+uT*6.;put(p,(.13+.08*aSeed.w)*(1.-k*.5));}`,LEAF_FS);
  a.count+=points(L.part,50,C+`void main(){float life=.2+aSeed.y*.12;float age=(uT-aSeed.x*(TO+.15))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=JC+d*mix(1.05,.08,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.03*aSeed.z);}`);
  // cierre: esquirlas de espina y chispas
  a.count+=sparks(L.part,90,TI,`${f(JC.x-0.25)},${f(JC.y)},.2`,"-.4,.25,.3",2.5,6,2.5);
  a.count+=points(L.part,35,C+`void main(){float s=TI+aSeed.x*.05;float life=.38+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.4,.2,.4));vec3 p=JC+vec3(-.3,0.,.15)+d*(1.8+2.2*aSeed.z)*t*(1.-.5*min(t,1.))+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  // exprimido: la savia sale del cuerpo del rival hacia la trampa y gotea por los labios
  a.count+=points(L.part,55,C+`void main(){float s=TI+.05+aSeed.x*(TS-TI);float life=.32+aSeed.y*.15;float age=(uT-s)/life;
   vec3 r=rnd();vec3 st=vec3(3.4+r.x*.35,.5+aSeed.z*.8,r.z*.35);vec3 en=JC+vec3(-.4,0.,.1);
   float k=age*age;vec3 p=mix(st,en,k)+vec3(sin(age*9.+r.y*6.)*.06,0.,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.035*aSeed.w);}`);
  a.count+=points(L.part,40,C+`void main(){float s=TI+.05+aSeed.x*(TS+.2-TI);float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(JC.x-.75+aSeed.z*1.2,JC.y-.06,.3*(aSeed.w-.5))+vec3(0.,-.15*t-2.2*t*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age*age):0.;put(p,.07+.045*aSeed.y);}`,DEW_FS);
  // motas de clorofila que fluyen por el rastro hacia el Axie
  a.count+=points(L.part,130,C+`void main(){float life=.55+aSeed.y*.25;float k=(uT-TG)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float grow=clamp((uT-TG)/(TS-TG),0.,1.);float u=age;
   vec3 p=bez(u)+(r-.5)*.14*sin(3.14159*u)+vec3(0.,sin(age*20.+r.x*6.)*.025,0.);
   float on=step(u,grow)*(1.-smoothstep(TA,TA+.3,uT));
   vA=(k>=1.)?sin(age*3.14159)*on*.75:0.;put(p,.025+.03*r.z);}`);
  // estela de la semilla
  a.count+=points(L.part,100,C+`void main(){float s=TS+aSeed.x*(TA-TS);float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bez(sd(s))+r*.04+r*.2*t+vec3(0.,-.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,(.025+.035*aSeed.w)*(1.-age*.5));}`);
  // vigor: hojas y motas que suben en espiral por el Axie
  a.count+=points(L.part,25,`varying float vR;`+C+`void main(){float s=TA+aSeed.x*.22;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.;vec3 p=vec3(${f(CX)},.3+aSeed.y*1.4,0.)+vec3(cos(an),0.,sin(an))*(.45+.55*t)+vec3(0.,.7*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;vR=aSeed.w*6.28+t*5.;put(p,.16+.08*aSeed.w);}`,LEAF_FS);
  a.count+=points(L.part,80,C+`void main(){float life=.55+aSeed.y*.2;float k=(uT-TA)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*6.;float rad=.55-.15*age;vec3 p=vec3(${f(CX)}+cos(an)*rad,age*1.9,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.85*uE:0.;put(p,.03+.03*r.z);}`);

  const sp=V3(0,0,0), sd=V3(0,0,0);
  const thOpen=te=>0.1+0.6*ss(TO,TO+0.14,te)+0.04*Math.sin(te*9)*ss(TO,TO+0.14,te);
  const sdE=te=>{const q=cl((te-TS)/(TA-TS));return q*q*(3-2*q);};
  a.pose=function(te,o){
    const ia=te-TI, em=ss(0,TO,te), drain=te>=TI&&te<TS+0.2;
    // apertura de las valvas: brote cerrado → abre y acecha → chasquido acelerado → aprieta con temblor
    let th;
    if(te<TO)th=0.1*em; else if(te<TC0)th=thOpen(te);
    else if(te<TI){const k=cl((te-TC0)/(TI-TC0));th=thOpen(TC0)*(1-k*k*k);}
    else th=0.03*Math.abs(Math.sin(te*31))*(te<TS?1:0.4);
    const wither=cl((te-1.25)/0.45), vis=te<1.72;
    const sh=drain?0.02*Math.sin(te*47):0, sq=te>=TI?1-0.06*Math.exp(-ia*8)-0.03*Math.abs(Math.sin(te*12))*(drain?1:0):1;
    const s=Math.max(0.82*em*(1+0.08*Math.exp(-Math.max(ia,0)*10)*(ia>=0?1:0)),0.001);
    camR.set(1,0,0).applyQuaternion(camera.quaternion);
    towardCam(tmp,JC,0.55); tmp.addScaledVector(camR,0.66+sh);
    upper.position.copy(tmp); billboard(upper,-th); upper.scale.set(s,s*sq,s);
    lower.position.copy(tmp); billboard(lower,th); lower.scale.set(s,-s*sq,s);
    const vp=drain?Math.pow(0.5+0.5*Math.sin(te*14),3):0;
    for(const m of [upper,lower]){m.visible=vis&&em>0.001;set(m,vp,em);m.material.uniforms.uW.value=wither;}
    let p=cl(ia/0.3); towardCam(snapRing.position,JC,0.6); billboard(snapRing); snapRing.visible=ia>=0&&p<1; set(snapRing,p,0.8*(1-p));
    // rastro: crece de la trampa a la boca, la semilla lo recorre, luego se apaga
    const grow=cl((te-TG)/(TS-TG)), su=sdE(te), seedOn=te>=TS-0.05&&te<TA+0.05;
    ribMat.uniforms.uP.value=1-Math.pow(1-grow,2); ribMat.uniforms.uA.value=0.85*ss(TG,TG+0.08,te)*(1-ss(TA,TA+0.4,te));
    ribMat.uniforms.uQ.value=te>=TS&&te<TA+0.05?su:-1;
    bez(su,sp); bezD(Math.min(su,0.99),sd);
    towardCam(seed.position,sp,0.15); billboard(seed,Math.atan2(sd.y,sd.x)); seed.visible=seedOn;
    seed.scale.setScalar((0.6+0.4*ss(TS-0.05,TS+0.08,te))*(1-0.6*ss(TA-0.12,TA+0.05,te))*(1+0.1*Math.sin(te*30)));
    seed.material.uniforms.uA.value=ss(TS-0.05,TS+0.08,te);
    // vigor en el Axie
    const ra=te-TA, env=ss(TA,TA+0.1,te)*(1-ss(TE-0.2,TE+0.3,te));
    set(helix,cl(ra/0.35),ra>=0?0.85*(1-ss(TA+0.38,TA+0.68,te)):0);
    set(rosette,ra>=0?Math.exp(-ra*3.5):0,env*0.75);
    set(thorns,ss(TI,TI+0.12,te),0.8*ss(TI,TI+0.05,te)*(1-ss(1.5,1.85,te)));
    p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.55:0);
    U.uE.value=env;
    greenCaster(ra>=0?0.8*Math.exp(-ra*3.5)+0.22*env:0.12*ss(TS,TA,te));
    caster.rotation.z=-0.05*ss(0,TO,te)-0.08*ss(TG,TS,te)+0.12*ss(TA-0.08,TA+0.08,te)*(1-ss(TA+0.25,TE,te));
    const pulse=ra>=0?Math.exp(-ra*6):0; caster.scale.set(1+0.04*pulse,1+0.07*pulse,1+0.04*pulse);
    // el rival: sacudida al cerrarse, tirones mientras lo exprimen
    const hit=hitK(ia,6);
    target.position.x=3.4+hit*0.08+(drain?0.02*Math.sin(te*53):0); target.rotation.z=-hit*0.15*Math.cos(ia*15)+(drain?0.035*Math.sin(te*29):0);
    target.scale.set(1,1-(drain?0.03*Math.abs(Math.sin(te*14)):0),1);
    o.em=drain?0.18*vp:0; o.emc.copy(U.uC2.value);
    if(te<TI){o.g.copy(JC);o.gs=0.9*em;o.ga=0.22*em;o.li=1.8*em;}
    else if(te<TS){o.g.copy(JC);o.gs=1.1+2.2*ia;o.ga=Math.exp(-ia*10)*0.5+0.08;o.li=6*Math.exp(-ia*6)+1.4;}
    else if(te<TA){o.g.copy(sp);o.gs=0.9;o.ga=0.32;o.li=3;}
    else{o.g.set(CX,1.2,0);o.gs=1.3+1.5*Math.min(ra,0.5);o.ga=0.4*Math.exp(-ra*4)+0.08*env;o.li=4.5*Math.exp(-ra*3)+1*env;}
    o.ia=ia;o.c.copy(JC);o.shake=0;o.dist=0.55;
  };
}};

// =====================================================================
// 2 · SILENCE WHISPER — un susurro emite ondas sónicas verdes y apagadas; una burbuja de silencio oscurece el
//     entorno y el aliado queda envuelto en una bruma de rocío revitalizante
//     nivel 2: firme y estándar — ondas más cortas, burbuja menor, bruma más breve
// =====================================================================
const silence={key:"pbSilence",name:"Silence Whisper",dur:2.4,ti:0.65,pal:"Rocío (Boca)",allies:1,
  phases:[["Susurro",0],["Ondas",0.22],["Bruma",0.65],["Rocío",1.05],["Fin",2.0]],
build(a){
  const L=a.L,TW=[0.22,0.4,0.58],SPD=6.5,RM=5.2,TI=0.65,TE=2.0,TX=2.4,RD=3.6;
  const AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.0,0));
  // ondas: cascarones esféricos con borde difuso y rizos; intensidad baja (sonido apagado)
  const SHELL_FS=`void main(){float fr=1.-abs(dot(normalize(vN),normalize(vV)));vec3 q=normalize(vP);
   float rip=.5+.5*sin(fr*26.-uT*6.+noise(q*4.)*3.);float n=noise(q*5.+vec3(uT*.6));
   float a=pow(fr,2.6)*(.35+.4*rip)*(.6+.4*n);
   gl_FragColor=vec4(mix(uC2,uC1,fr*.7)*.85,a*uA);}`;
  const RIPPLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(r,uP,.05)*.8+band(r,uP-.07,.035)*.45+band(r,uP-.13,.03)*.2;
   m*=(.7+.3*noise(vec3(atan(p.y,p.x)*5.,r*6.,uT)))*step(r,1.);
   gl_FragColor=vec4(mix(uC2,uC1,.5),m*uA);}`;
  const shells=TW.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,48,24),fx(SHELL_FS));m.position.copy(MO);L.mesh.add(m);return m;});
  const ripples=TW.map((t,i)=>{const m=groundPlane(RM*2,CX,0.02+i*0.001,fx(RIPPLE_FS));L.decal.add(m);return m;});
  // burbuja de silencio: hemisferio con mezcla normal que apaga lo que queda dentro
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),fx(`void main(){
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float n=noise(vP*2.5+vec3(0.,uT*.3,0.));
   gl_FragColor=vec4(vec3(.03,.06,.05)+uC2*pow(fr,3.)*.35,(.2+.3*pow(fr,2.)+.06*n)*uA);}`,Object.assign({},NB,{side:THREE.FrontSide})));
  dome.position.set(CX,0,0); dome.renderOrder=-1; L.mesh.add(dome);
  // velo de bruma en espiral alrededor del aliado
  const veil=new THREE.Mesh(helixGeo(2.2,0.55,0.43,1.8,0.34,160),fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*14.-uT*1.5,v*2.,uT*.3))*.6+noise(vec3(u*30.-uT*2.,v*4.,1.))*.4;
   float a=smoothstep(1.,.2,v)*smoothstep(.3,.75,n)*smoothstep(0.,.08,u)*smoothstep(1.,.85,u)*step(u,uP);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.1,a*.5*uA);}`));
  veil.position.set(AP.x,0.05,AP.z); L.trail.add(veil);
  // charco de rocío bajo el aliado
  const pool=groundPlane(2,AP.x,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float pl=smoothstep(1.,.2,r+(noise(vec3(p*5.,uT*.3))-.5)*.3)*.25;
   float drops=smoothstep(.72,.92,noise(vec3(p*18.,1.)))*smoothstep(.95,.3,r)*(.6+.4*sin(uT*5.+p.x*30.));
   float ring=band(r,.85,.03);
   gl_FragColor=vec4(mix(uC2,uC1,drops+ring)*1.2,(pl+drops+ring*.6)*uA);}`)); pool.position.z=AP.z;
  const flashRing=groundPlane(3.2,AP.x,0.03,fx(RING_FS)); flashRing.position.z=AP.z;
  L.decal.add(pool,flashRing);

  const C=`const float W0=${f(TW[0])};const float W1=${f(TW[1])};const float W2=${f(TW[2])};const float SPD=${f(SPD)};const float TI=${f(TI)};
  const vec3 MO=${v3(MO)};const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};
  float passed(float d){return smoothstep(0.,.6,SPD*(uT-W0)-d)+smoothstep(0.,.6,SPD*(uT-W1)-d)+smoothstep(0.,.6,SPD*(uT-W2)-d);}`;
  // aliento del susurro: motas que salen de la boca en cada onda
  a.count+=points(L.part,40,C+`void main(){float i=floor(aSeed.x*2.999);float s=(i<.5?W0:(i<1.5?W1:W2))+aSeed.y*.06;float life=.4+aSeed.z*.2;
   float age=(uT-s)/life;float t=max(uT-s,0.);vec3 d=normalize(rnd()+vec3(1.,.1,0.));vec3 p=MO+d*(.1+1.*t)+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.7:0.;put(p,.04+.04*aSeed.w);}`);
  // polen suspendido: cada onda lo empuja hacia fuera y lo apaga
  a.count+=points(L.part,110,C+`void main(){float an=aSeed.x*6.2832;float rd=.5+2.8*sqrt(aSeed.y);
   vec3 b=vec3(${f(CX)}+cos(an)*rd,.15+aSeed.z*2.2,sin(an)*rd*.8);b+=vec3(sin(uT*.7+aSeed.w*9.),cos(uT*.5+aSeed.x*7.),0.)*.08;
   float d=length(b-MO);float ps=passed(d);vec3 p=b+normalize(b-MO)*ps*.12;
   float on=smoothstep(.08,.3,uT)*(1.-smoothstep(1.9,2.35,uT));
   vA=on*(.55-.15*min(ps,3.))*(.6+.4*sin(uT*3.+aSeed.w*20.));put(p,.025+.03*aSeed.w);}`);
  // la onda alcanza al aliado: la bruma se condensa a su alrededor
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.35;float life=.4+aSeed.y*.2;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=AC+d*mix(1.35,.4,age*age)+vec3(0.,(aSeed.z-.5)*.6,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.8:0.;put(p,.04+.04*aSeed.w);}`);
  // bruma: humo claro (normal) y halo aditivo que orbitan al aliado
  a.count+=points(L.part,80,C+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+uT*(.6+.4*r.y);float rad=.42+.34*r.z;vec3 p=AP+vec3(cos(an)*rad,.15+r.y*1.6+age*.25,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.32*uE:0.;put(p,(.42+.27*r.z)*(.8+age*.5));}`,SMOKE_FS("mix(vec3(.8,1.,.92),uC1,.3)"),NB);
  a.count+=points(L.part,55,C+`void main(){float life=.85+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832-uT*.7;float rad=.34+.3*r.z;vec3 p=AP+vec3(cos(an)*rad,.2+r.y*1.5,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.14*uE:0.;put(p,.3+.22*r.z);}`);
  // gotas de rocío que se forman sobre la bruma y resbalan destellando
  a.count+=points(L.part,55,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.44+.18*r.z;vec3 p=AP+vec3(cos(an)*rad,.4+r.y*1.35-age*age*.5,sin(an)*rad);
   float gl=pow(max(sin(age*12.+r.z*20.),0.),8.);
   vA=(k>=1.)?sin(age*3.14159)*uE*(.65+.4*gl):0.;put(p,.085+.045*r.y);}`,DEW_FS);
  a.count+=points(L.part,25,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TI-.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.15,.2+r.y*1.7,(r.z-.5)*1.15);
   vA=(k>=1.)?sin(age*3.14159)*.85*uE:0.;put(p,(.12+.15*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // savia revitalizante: motas que suben despacio
  a.count+=points(L.part,65,C+`void main(){float life=.75+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;float rad=.28+.26*r.z;vec3 p=AP+vec3(cos(an)*rad,.05+age*1.8,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.025+.03*r.y);}`);

  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.3,te)*(1-ss(TE-0.2,TX,te)), fade=1-ss(TE-0.3,TX,te);
    // cada onda: cascarón que crece desde la boca y anillo en el suelo bajo el Axie
    TW.forEach((tw,i)=>{const r=SPD*(te-tw),on=te>=tw&&r<RM;
      shells[i].visible=on; shells[i].scale.setScalar(Math.max(r,0.001));
      shells[i].material.uniforms.uA.value=on?ss(0,0.4,r)*Math.pow(1-r/RM,1.4)*0.6:0;
      const rg=Math.sqrt(Math.max(r*r-MO.y*MO.y,0));
      set(ripples[i],rg/RM,on?Math.pow(1-r/RM,1.2)*0.65:0);});
    // burbuja de silencio: crece con la primera onda y se disuelve al final
    const rd=Math.min(Math.max(SPD*(te-TW[0]),0),RD); dome.visible=te>=TW[0]&&te<TX;
    dome.scale.setScalar(Math.max(rd,0.001)); dome.material.uniforms.uA.value=0.85*ss(0,1.,rd)*fade;
    set(veil,cl((te-TI)/0.45),env*0.85);
    veil.rotation.y=te*0.9;
    set(pool,0,env);
    let p=cl(ia/0.45); set(flashRing,p,ia>=0?(1-p)*0.6:0);
    U.uE.value=env;
    // susurro: el Axie se inclina un poco con cada onda
    let nod=0; for(const tw of TW)nod+=te>=tw?Math.exp(-(te-tw)*12)*ss(tw-0.04,tw,te):0;
    caster.rotation.z=0.04*ss(0,TW[0],te)-0.06*nod;
    greenCaster(0.2*nod);
    // aliado: destello al llegar la onda y respiración verde sostenida
    const al=allies[0].userData.m; al.emissive.copy(U.uC1.value);
    al.emissiveIntensity=(ia>=0?0.65*Math.exp(-ia*5):0)+env*(0.28+0.1*Math.sin(te*5));
    allies[0].scale.set(1,1+0.025*env*Math.sin(te*5),1);
    if(te<TI){o.g.copy(MO);o.gs=0.65+0.45*nod;o.ga=0.12+0.22*nod;o.li=0.9+2.2*nod;}
    else{o.g.copy(AC);o.gs=1.3+1.1*Math.min(ia,0.5);o.ga=0.35*Math.exp(-ia*6)+0.08*env;o.li=3.5*Math.exp(-ia*5)+1.4*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

// =====================================================================
// 3 · ZIGZAG — un rayo de raíces corre bajo tierra en zigzag (surco luminoso de raíz, brotes en cada quiebro),
//     estalla en raíces bajo el rival y regresa por el mismo camino con destellos de vida que suben por el Axie
//     nivel 2: tamaño medio; el suelo no se fractura: solo brilla la raíz que viaja por debajo
// =====================================================================
const zig={key:"pbZigzag",name:"Zigzag",dur:2.4,ti:0.72,pal:"Clorofila",
  phases:[["Pisada",0],["Rayo",0.32],["Erupción",0.72],["Retorno",0.95],["Vida",1.4],["Fin",2.05]],
build(a){
  const L=a.L,T0=0.32,TI=0.72,TR=0.95,TB=1.4,TE=2.05;
  const ZP=[[-3.3,0],[-2.3,0.75],[-1.1,-0.75],[0.1,0.75],[1.3,-0.75],[2.4,0.6],[3.4,0]];
  const SEGL=[],CUM=[0]; let tot=0;
  for(let i=0;i<ZP.length-1;i++){const l=Math.hypot(ZP[i+1][0]-ZP[i][0],ZP[i+1][1]-ZP[i][1]);SEGL.push(l);tot+=l;CUM.push(tot);}
  const zz=(s,out)=>{const d=cl(s)*tot;let i=0;while(i<SEGL.length-1&&d>CUM[i+1])i++;const k=cl((d-CUM[i])/SEGL[i]);
    return out.set(ZP[i][0]+(ZP[i+1][0]-ZP[i][0])*k,0,ZP[i][1]+(ZP[i+1][1]-ZP[i][1])*k);};
  const ZZ=`vec3 zz(float s){float d=clamp(s,0.,1.)*${f(tot)};`+SEGL.map((l,i)=>`${i<SEGL.length-1?`if(d<${f(CUM[i+1])})`:``}return mix(vec3(${f(ZP[i][0])},0.,${f(ZP[i][1])}),vec3(${f(ZP[i+1][0])},0.,${f(ZP[i+1][1])}),clamp((d-${f(CUM[i])})/${f(l)},0.,1.));`).join("")+`}`;
  const hs=te=>cl((te-T0)/(TI-T0));
  const rs=te=>{const q=cl((te-TR)/(TB-TR));return 1-q*q*(3-2*q);};
  // surco: tira plana sobre el suelo a lo largo del zigzag (uv.x = recorrido)
  const W=0.45,N=420,pos=[],uv=[],nor=[],idx=[],p=V3(0,0,0),pa=V3(0,0,0),pb=V3(0,0,0);
  for(let i=0;i<=N;i++){const s=i/N;zz(s,p);zz(Math.min(s+0.004,1),pb);zz(Math.max(s-0.004,0),pa);
    let tx=pb.x-pa.x,tz=pb.z-pa.z;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
    pos.push(p.x+tz*W/2,0.013,p.z-tx*W/2,p.x-tz*W/2,0.013,p.z+tx*W/2); uv.push(s,0,s,1); nor.push(0,1,0,0,1,0);
    if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const sg=new THREE.BufferGeometry();
  sg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3)); sg.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  sg.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3)); sg.setIndex(idx);
  // uP = cabeza del rayo; uQ = pulso de retorno; brillo de raíz bajo tierra: línea suave que ondula, con savia que corre
  const crack=new THREE.Mesh(sg,fxU(`uniform float uQ;
  void main(){float s=vUv.x;float v=vUv.y-.5;float L=${f(tot)};
   float wig=(noise(vec3(s*L*2.,0.,1.))-.5)*.3;
   float d=abs(v-wig*.5);
   float rev=step(s,uP);float head=exp(-max(uP-s,0.)*L*1.3)*step(uP,.999);
   float core=smoothstep(.07,0.,d);float halo=smoothstep(.4,0.,d)*.2;
   float sap=.75+.25*sin(s*L*5.-uT*9.);
   float ret=exp(-pow((s-uQ)*L*1.1,2.))*step(0.,uQ);float lit=smoothstep(uQ,uQ+.08,s)*step(0.,uQ)*.3;
   vec3 c=mix(uC2,uC1,core)*1.3+vec3(1.)*core*(head+ret)*.6;
   gl_FragColor=vec4(c,((core*.85+halo)*sap*(1.+head*1.2+lit)+(core*1.5+halo*1.5)*ret)*rev*uA);}`,{uQ:{value:-1}}));
  L.decal.add(crack);
  // brotes de raíz que asoman en cada quiebro: tubos afinados de corteza con vetas de savia
  const corners=[];
  for(let c=1;c<ZP.length-1;c++){
    const g=new THREE.Group(), mat=fx(ROOT_FS,SOLID); g.position.set(ZP[c][0],0,ZP[c][1]);
    for(let j=0;j<3;j++){const an=hash1(c*7+j)*Math.PI*2,dx=Math.cos(an),dz=Math.sin(an),h=0.25+0.22*hash1(c*13+j*5),b=0.18+0.14*hash1(c+j*3);
      const cv=new THREE.CatmullRomCurve3([V3(dx*0.08,-0.1,dz*0.08),V3(dx*0.15,h*0.35,dz*0.15),V3(dx*(0.25+b*0.5),h*0.7,dz*(0.25+b*0.5)),V3(dx*(0.3+b),h,dz*(0.3+b))]);
      g.add(new THREE.Mesh(taperTube(cv,18,6,0.04+0.015*hash1(c*3+j),0.004),mat));}
    L.mesh.add(g); corners.push({g,mat,s:CUM[c]/tot});
  }
  // erupción bajo el rival: raíces gruesas que brotan en corona y se curvan hacia dentro abrazándolo
  const erupt=new THREE.Group(), emat=fx(ROOT_FS,SOLID); erupt.position.set(3.4,0,0);
  for(let j=0;j<7;j++){const an=j/7*Math.PI*2+0.3,c=Math.cos(an),s=Math.sin(an),R=0.6+0.08*hash1(j*9),h=0.95+0.35*hash1(j*4+1);
    const cv=new THREE.CatmullRomCurve3([V3(c*R,-0.15,s*R),V3(c*R*1.1,h*0.4,s*R*1.1),V3(c*R*0.85,h*0.78,s*R*0.85),V3(c*R*0.45,h,s*R*0.45),V3(c*R*0.15,h*0.95,s*R*0.15)]);
    erupt.add(new THREE.Mesh(taperTube(cv,26,7,0.08,0.006),emat));}
  L.mesh.add(erupt);
  const shock=groundPlane(4.5,3.4,0.03,fx(RING_FS)), rosette=groundPlane(1.9,CX,0.02,fx(ROSETTE_FS));
  L.decal.add(shock,rosette);

  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const float TR=${f(TR)};const float TB=${f(TB)};`+ZZ+`
  float hs(float t){return clamp((t-T0)/(TI-T0),0.,1.);}
  float rs(float t){float q=clamp((t-TR)/(TB-TR),0.,1.);return 1.-q*q*(3.-2.*q);}`;
  // paso del rayo: polvo fino y chispas de clorofila que brotan del surco
  a.count+=points(L.part,45,C+`void main(){float s=T0+aSeed.x*(TI-T0);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=zz(hs(s))+vec3(cos(an),0.,sin(an))*(.08+.3*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.3*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.55:0.;put(p,(.14+.14*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,130,C+`void main(){float s=T0+aSeed.x*(TI-T0);float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=zz(hs(s))+vec3(r.x*.14,.03+t*(1.+.7*aSeed.z)-2.5*t*t,r.z*.14);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*40.+aSeed.w*30.)):0.;put(p,.025+.03*aSeed.w);}`);
  // erupción: chispas, esquirlas verdes y polvo
  a.count+=sparks(L.part,130,TI,"3.4,.3,0.","0.,1.,0.",3,7,3);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.,0.))*(1.8+2.*aSeed.z);vec3 p=vec3(3.4,.2,0.)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.15;float life=.75+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=vec3(3.4,.15,0.)+d*(.3+.7*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.25+.25*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // retorno: destellos de vida que viajan con el pulso hacia el Axie
  a.count+=points(L.part,120,C+`void main(){float s=TR+aSeed.x*(TB-TR);float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=zz(rs(s))+vec3(r.x*.2,.05+t*(.5+.7*aSeed.z),r.z*.2);
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,(.03+.035*aSeed.w)*(1.-age*.4));}`);
  a.count+=points(L.part,25,C+`void main(){float s=TR+aSeed.x*(TB-TR);float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=zz(rs(s))+vec3(r.x*.2,.15+aSeed.z*.3,r.z*.2);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.85:0.;put(p,(.14+.14*aSeed.w)*sin(age*3.14159));}`,STAR4_FS);
  // vida: chispas en espiral que suben por el Axie y hojas que brotan
  a.count+=points(L.part,130,C+`void main(){float life=.5+aSeed.y*.25;float k=(uT-TB)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*7.;float rad=.5-.12*age;vec3 p=vec3(${f(CX)}+cos(an)*rad,age*1.8,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.85*uE:0.;put(p,.03+.03*r.z);}`);
  a.count+=points(L.part,20,`varying float vR;`+C+`void main(){float s=TB+aSeed.x*.15;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(CX)},.1,0.)+vec3(cos(an),0.,sin(an))*(.45+.5*t)+vec3(0.,.3+1.2*t-.6*t*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;vR=aSeed.w*6.28+t*6.;put(p,.17+.08*aSeed.w);}`,LEAF_FS);

  const grow=dt=>dt<0?0:ss(0,0.1,dt)*(1+0.15*Math.exp(-dt*10)*Math.sin(dt*28));
  const hp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, h=hs(te), r=rs(te), back=te>=TR&&te<TB+0.1, rb=te-TB;
    // pisada: saltito y golpe al suelo que despierta la raíz
    caster.position.y=te<T0?0.15*Math.sin(Math.PI*cl(te/T0)):0;
    caster.rotation.z=0.09*ss(0,T0*0.6,te)-0.15*ss(T0*0.6,T0,te)+0.06*ss(T0,T0+0.3,te);
    const sq=te>=T0?Math.exp(-(te-T0)*12):0; caster.scale.set(1+0.05*sq,1-0.07*sq,1+0.05*sq);
    crack.material.uniforms.uP.value=h; crack.material.uniforms.uA.value=0.85*ss(T0-0.04,T0,te)*(1-ss(1.8,2.25,te));
    crack.material.uniforms.uQ.value=back?r:-1;
    // raíces de los quiebros: brotan al paso del rayo, se encienden con el retorno y se hunden al final
    for(const c of corners){const tc=T0+c.s*(TI-T0),tr=TR+(1-c.s)*(TB-TR);
      const g=grow(te-tc)*(1-ss(1.75,2.15,te)); c.g.visible=g>0.002; c.g.scale.set(1,Math.max(g,0.001),1);
      c.mat.uniforms.uP.value=Math.exp(-Math.max(te-tc,0)*6)*(te>=tc?0.8:0)+Math.exp(-Math.abs(te-tr)*12)*1.1;}
    const ge=grow(ia)*(1-ss(1.7,2.1,te)); erupt.visible=ge>0.002; erupt.scale.set(1,Math.max(ge,0.001),1);
    emat.uniforms.uP.value=ia>=0?Math.exp(-ia*3.5)*0.6+0.3*(r>0.05&&back?1:0)*Math.exp(-(te-TR)*5)+0.12:0;
    let p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    set(rosette,(te<T0?ss(0,T0,te):0)+(rb>=0?Math.exp(-rb*3):0),ss(0,0.15,te)*(1-ss(T0,T0+0.3,te))*0.65+(rb>=0?0.8*ss(0,0.1,rb)*(1-ss(TE-0.2,TE+0.3,te)):0));
    const env=rb>=0?ss(0,0.1,rb)*(1-ss(TE-0.25,TE+0.3,te)):0; U.uE.value=env;
    greenCaster((te<T0?0.22*ss(0,T0,te):0)+(rb>=0?0.8*Math.exp(-rb*3.5)+0.22*env:0));
    // el rival: lanzado hacia arriba por la erupción y retenido por las raíces
    const hit=hitK(ia,6), lift=ia>=0?Math.sin(Math.PI*cl(ia/0.4)):0;
    target.position.y=0.2*lift; target.rotation.z=-hit*0.2*Math.cos(ia*14)+(ia>=0.4&&te<1.7?0.02*Math.sin(te*37):0);
    if(te<T0){o.g.set(CX,0.3,0);o.gs=0.9*ss(0,T0,te);o.ga=0.22*ss(0,T0,te);o.li=1.8*ss(0,T0,te);}
    else if(te<TI){zz(h,hp);o.g.set(hp.x,0.25,hp.z);o.gs=1;o.ga=0.4;o.li=3.5;}
    else if(te<TR){o.g.set(3.4,0.7,0);o.gs=1.6+3*ia;o.ga=Math.exp(-ia*10)*0.55;o.li=7*Math.exp(-ia*5);}
    else if(te<TB){zz(r,hp);o.g.set(hp.x,0.3,hp.z);o.gs=1;o.ga=0.35;o.li=3;}
    else{o.g.set(CX,1.0,0);o.gs=1.4;o.ga=0.38*Math.exp(-rb*4)+0.07*env;o.li=4*Math.exp(-rb*3)+1*env;}
    o.ia=ia;o.c.set(3.4,0.6,0);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 4 · HERBIVORE — el Axie mastica hojas mágicas y se envuelve en un halo verde de sanación; a la vez, lianas
//     brotan del suelo, se enroscan en el rival, lo muerden con espinas y bombean su vida hacia el Axie
//     nivel 2: firme y estándar — lianas más finas y bajas, halo y drenaje más breves
// =====================================================================
const herb={key:"pbHerbivore",name:"Herbivore",dur:2.4,ti:0.84,pal:"Savia",
  phases:[["Hojas",0],["Masticar",0.32],["Lianas",0.42],["Mordida",0.84],["Drenaje",0.95],["Fin",1.85]],
build(a){
  const L=a.L,TV=0.42,TW=0.66,TI=0.84,TD=1.85,TE=2.2,NL=6,LD=0.36;
  const LT=[...Array(NL)].map((_,i)=>0.02+i*0.055), TAR=LT.map(t=>t+LD);   // salida y llegada de cada hoja a la boca
  // hojas mágicas: vesica con nervaduras y tallo; uP las deshace en ceniza verde al llegar a la boca
  const LEAFM_FS=`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;
   float d=max(length(p-vec2(.52,0.)),length(p+vec2(.52,0.)))-.92;
   float mid=band(p.x,0.,.03)*step(p.y,.72)*step(-.98,p.y);
   float veins=band(fract((p.y+abs(p.x)*.8)*4.5),.5,.07)*smoothstep(-.02,-.12,d);
   float rim=band(d,-.03,.035);float fill=smoothstep(.02,-.02,d);
   float n=noise(vec3(p*4.,uQ));float th=uP*1.2-.1;if(n<th)discard;
   float burn=smoothstep(.15,0.,n-th)*step(.001,uP);
   vec3 c=mix(uC2,uC1,.3+.5*(mid+veins))*1.3+vec3(1.)*(rim*.4+burn*.8)+uC1*burn;
   gl_FragColor=vec4(c,min(fill*.55+mid*.6+veins*.4+rim+burn,1.)*uA);}`;
  const leaves=LT.map((t,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.45,0.45),fxU(LEAFM_FS,{uQ:{value:i*3.7}},{depthTest:false}));
    m.userData={an:i/NL*Math.PI*2+0.4,y:0.2+(i%3)*0.25,R:1.05+0.2*(i%2)};L.mesh.add(m);return m;});
  // halo de sanación: aura cilíndrica con vetas que suben + dos anillos que recorren el cuerpo
  const aura=new THREE.Mesh(new THREE.CylinderGeometry(0.66,0.76,2.2,40,1,true),fx(`void main(){float h=vP.y/2.2+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*3.,h*4.-uT*2.5,0.))*.6+noise(vec3(an*7.,h*9.-uT*4.,2.))*.4;
   float st=smoothstep(.45,.85,n);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float al=(st*.4+pow(fr,2.)*.35)*pow(1.-h,1.2)*smoothstep(0.,.08,h)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.2+vec3(1.)*uP*st*.25,al*(1.+uP*.4));}`));
  aura.position.set(CX,1.1,0);
  const HALO_FS=`void main(){float r=length(vP.xz);float an=atan(vP.z,vP.x);float t=(r-.62)/.33;
   float m=band(t,.5,.12)+band(t,.5,.4)*.3;
   float lv=pow(abs(sin(an*6.+uT*2.)),8.)*band(t,.5,.3);
   float n=noise(vec3(an*4.,t*3.,uT*1.5));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.5+vec3(1.)*m*uP*.4,(m*(.6+.4*n)+lv*.6)*uA);}`;
  const halos=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.RingGeometry(0.62,0.95,64).rotateX(-Math.PI/2),fx(HALO_FS));L.mesh.add(m);return m;});
  L.mesh.add(aura);
  // lianas: brotan del suelo delante del Axie y se arquean hasta el rival; terminan en espirales que lo atan
  const VS=[0,1,2].map(i=>{const z=(i-1)*0.35,ri=0.47-0.03*i,y=0.45+0.4*i;
    return {S:V3(-3.25,-0.05,z*0.8),B:V3(-2.1,1.2+0.28*i,z*2),Cc:V3(1.2,1.9-0.2*i,-z*1.3),E:V3(3.4-ri,y,0),ri,y};});
  const VINE_FS=`uniform float uQ;void main(){float u=vUv.x;if(u>uP)discard;
   float tw=fract(vUv.y*3.+u*22.);float rib=smoothstep(0.,.5,abs(tw-.5)*2.);
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float pulse=pow(.5+.5*sin(u*26.+uT*14.),6.)*uQ;float head=exp(-(uP-u)*40.)*step(uP,.999);
   gl_FragColor=vec4(mix(uC2*.3,uC2*.85,rib)*lit+uC1*(pulse+head)*.9,uA);}`;
  const GLOW_FS=`uniform float uQ;void main(){float u=vUv.x;if(u>uP)discard;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float pulse=pow(.5+.5*sin(u*26.+uT*14.),6.)*uQ;float head=exp(-(uP-u)*40.)*step(uP,.999);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.4,(pulse*(.5+.5*fr)+head*.8+fr*.12)*uA);}`;
  const vineM=fxU(VINE_FS,{uQ:{value:0}},NB), vineG=fxU(GLOW_FS,{uQ:{value:0}});
  const coilM=fxU(VINE_FS,{uQ:{value:0}},NB), coilG=fxU(GLOW_FS,{uQ:{value:0}});
  const coils=new THREE.Group(); coils.position.set(3.4,0,0);
  for(const v of VS){
    const g=taperTube(new THREE.CubicBezierCurve3(v.S,v.B,v.Cc,v.E),100,7,0.06,0.036);
    L.trail.add(new THREE.Mesh(g,vineM),new THREE.Mesh(g,vineG));
    const cp=[];for(let k=0;k<=40;k++){const an=Math.PI+k/40*Math.PI*2*1.3;cp.push(V3(Math.cos(an)*v.ri,v.y+0.18*k/40,Math.sin(an)*v.ri));}
    const cg=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp),80,0.034,6,false);
    coils.add(new THREE.Mesh(cg,coilM),new THREE.Mesh(cg,coilG));
  }
  L.trail.add(coils);
  // mordida de espinas: corona de púas que se dispara sobre el rival
  const bite=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=pow(1.-abs(fract(an/6.2832*14.)-.5)*2.,5.);float rad=.3+.65*sp*uP;
   float th=smoothstep(rad,rad-.05,r)*smoothstep(.22,.32,r);float ring=band(r,.3,.03);
   gl_FragColor=vec4(mix(uC1,vec3(1.),th*.4)*1.6,(th+ring)*uA);}`,{depthTest:false}));
  L.mesh.add(bite);
  const rosette=groundPlane(2.2,CX,0.02,fx(ROSETTE_FS)), thorns=groundPlane(2.1,3.4,0.021,fx(THORN_FS)), shock=groundPlane(3.4,3.4,0.03,fx(RING_FS));
  L.decal.add(rosette,thorns,shock);

  const vbz=`vec3 vb(float i,float t){vec3 a=${v3(VS[2].S)},b=${v3(VS[2].B)},c=${v3(VS[2].Cc)},d=${v3(VS[2].E)};
   if(i<.5){a=${v3(VS[0].S)};b=${v3(VS[0].B)};c=${v3(VS[0].Cc)};d=${v3(VS[0].E)};}
   else if(i<1.5){a=${v3(VS[1].S)};b=${v3(VS[1].B)};c=${v3(VS[1].Cc)};d=${v3(VS[1].E)};}
   float s=1.-t;return s*s*s*a+3.*s*s*t*b+3.*s*t*t*c+t*t*t*d;}`;
  const C=`const float TV=${f(TV)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 MO=${v3(MO)};`+vbz+`
  float tar(float i){return ${f(TAR[0])}+i*${f(TAR[1]-TAR[0])};}`;
  // masticar: cada hoja se deshace en migas y chispas en la boca
  a.count+=points(L.part,90,C+`void main(){float i=floor(aSeed.x*${f(NL-0.001)});float s=tar(i)-.1+aSeed.y*.12;float life=.3+aSeed.z*.2;
   float age=(uT-s)/life;float t=max(uT-s,0.);vec3 d=normalize(rnd()+vec3(.6,.3,0.));
   vec3 p=MO+vec3(.12,0.,0.)+d*(.05+.6*t)+vec3(0.,-.6*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,25,`varying float vR;`+C+`void main(){float i=floor(aSeed.x*${f(NL-0.001)});float s=tar(i)-.05+aSeed.y*.1;float life=.4+aSeed.z*.2;
   float age=(uT-s)/life;float t=max(uT-s,0.);vec3 d=normalize(rnd()+vec3(.8,.2,0.));
   vec3 p=MO+vec3(.15,0.,0.)+d*(.1+.5*t)+vec3(0.,-1.6*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;vR=aSeed.w*6.28+t*12.;put(p,.075+.04*aSeed.w);}`,LEAF_FS);
  // halo: hojitas que orbitan y motas que suben
  a.count+=points(L.part,16,`varying float vR;`+C+`void main(){float an=aSeed.x*6.2832+uT*(1.6+.4*aSeed.y);float rad=.75+.12*aSeed.z;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.3+aSeed.w*1.5+.08*sin(uT*3.+aSeed.x*9.),sin(an)*rad);
   vA=uE*.8;vR=an+1.57;put(p,.16+.06*aSeed.y);}`,LEAF_FS);
  a.count+=points(L.part,90,C+`void main(){float life=.7+aSeed.y*.35;float k=(uT-.35)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.5;float rad=.4+.26*r.z;vec3 p=vec3(${f(CX)}+cos(an)*rad,.05+age*1.9,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.85*uE:0.;put(p,.025+.03*r.y);}`);
  a.count+=points(L.part,25,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(CX)},0.,0.)+vec3((r.x-.5)*1.1,.2+r.y*1.7,(r.z-.5)*1.1);
   vA=(k>=1.&&uT<TD+.25)?sin(age*3.14159)*.85*uE:0.;put(p,(.12+.15*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // brote de las lianas: tierra que salta en su base
  a.count+=points(L.part,30,C+`void main(){float i=floor(aSeed.x*2.999);float s=TV+aSeed.y*.06;float life=.45+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vb(i,0.)+vec3(cos(an),0.,sin(an))*.22*(1.-exp(-t*4.))+vec3(0.,.25*(1.-exp(-t*3.)),0.);p.y=max(p.y,.05);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.15+.14*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // mordida: chispas y esquirlas de espina
  a.count+=sparks(L.part,110,TI,`${f(TC.x)},${f(TC.y)},.2`,"-.3,.3,.4",2.5,6,2.5);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.05;float life=.38+aSeed.y*.22;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.3,.3,.3));vec3 p=vec3(3.4,1.,0.)+d*(.4+1.8*t)+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CHIP_FS);
  // drenaje: motas de vida que bajan por las lianas hacia el Axie
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.z*2.999);float life=.6+aSeed.y*.25;float k=(uT-TI-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vb(i,1.-age)+(r-.5)*.11;
   vA=(k>=1.&&uT<TD)?sin(age*3.14159)*.85*(1.-smoothstep(TD-.25,TD,uT)):0.;put(p,.03+.03*r.z);}`);

  const tip=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    // hojas: espiral hacia la boca, giran y se deshacen
    leaves.forEach((m,i)=>{const u=m.userData,e=cl((te-LT[i])/LD),ee=e*e*(3-2*e),R=u.R*(1-ee),an=u.an+ee*2.4;
      m.position.set(MO.x+0.12+Math.cos(an)*R,MO.y+(u.y+0.3*Math.sin(te*3+i))*(1-ee),Math.sin(an)*R*0.8);
      towardCam(m.position,m.position,0.1); billboard(m,u.an+te*5); m.visible=te>=LT[i]&&e<1;
      m.scale.setScalar(Math.max(1-0.45*ee,0.001)); set(m,ss(0.7,1,e),0.9*ss(0,0.15,e));});
    // masticar: el cuerpo se comprime al ritmo de los bocados
    const chew=ss(TAR[0]-0.08,TAR[0],te)*(1-ss(TAR[NL-1]+0.08,TAR[NL-1]+0.22,te)), ch=chew*Math.abs(Math.sin((te-TAR[0])*20));
    caster.scale.set(1+0.025*ch,1-0.04*ch,1+0.025*ch);
    caster.rotation.z=0.04*chew*Math.sin(te*20)-0.06*ss(TV,TV+0.12,te)*(1-ss(TW,TI+0.25,te));
    // halo: crece con los bocados y se aviva con cada pulso de vida que llega
    const env=ss(0.32,0.56,te)*(1-ss(TD,TE+0.15,te)), feed=te>=TI+0.22&&te<TD?Math.pow(0.5+0.5*Math.sin(te*16-2),4):0;
    set(aura,feed,env*0.75);
    halos.forEach((m,i)=>{const ph=te*1.8+i*Math.PI;m.position.set(CX,1.0+0.75*Math.sin(ph),0);
      const s=1+0.06*Math.cos(ph);m.scale.set(s,1,s);set(m,feed,env*(0.5+0.3*Math.cos(ph)));});
    set(rosette,feed,env*0.8);
    U.uE.value=env;
    greenCaster(0.2*env+0.25*feed+0.3*ch);
    // lianas: brotan, se arquean, se enroscan; muerden; bombean; se retiran
    const kv=cl((te-TV)/(TW-TV)), kc=cl((te-TW)/(TI-0.05-TW)), drain=te>=TI+0.1&&te<TD?1:0;
    const vp=te<TD?1-Math.pow(1-kv,2):1-ss(TD,TE,te);
    for(const m of [vineM,vineG]){m.uniforms.uP.value=vp;m.uniforms.uA.value=te>=TV?1:0;m.uniforms.uQ.value=drain*ss(TI+0.1,TI+0.3,te);}
    for(const m of [coilM,coilG]){m.uniforms.uP.value=1-Math.pow(1-kc,2);m.uniforms.uA.value=te>=TW?1-ss(TD,TD+0.25,te):0;m.uniforms.uQ.value=drain;}
    const tight=te<TI?1.15-0.15*kc:0.94+0.03*Math.exp(-ia*6)+0.02*feed;
    coils.scale.set(tight,1,tight); coils.visible=te>=TW&&te<TD+0.3;
    let p=cl(ia/0.32); towardCam(bite.position,TC,0.6); billboard(bite,te); bite.visible=ia>=0&&p<1; set(bite,1-Math.pow(1-p,3),0.85*(1-p));
    set(thorns,ss(TI,TI+0.12,te),0.8*ss(TI,TI+0.05,te)*(1-ss(TD,TE,te)));
    p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.55:0);
    // el rival: apretado por las espirales, tirones con cada pulso
    const hit=hitK(ia,6), held=te>=TI&&te<TD;
    target.scale.set(1-0.045*(held?1:0)-0.04*hit,1+0.02*hit,1-0.045*(held?1:0)-0.04*hit);
    target.rotation.z=-hit*0.14*Math.cos(ia*15)+(held?0.03*Math.sin(te*23):0);
    o.em=held?0.22*feed:0; o.emc.copy(U.uC2.value);
    if(te<TV){o.g.copy(MO);o.gs=0.75+0.3*ch;o.ga=0.18+0.14*ch;o.li=1.5+1.4*ch;}
    else if(te<TI){const V=VS[1];cub(V.S,V.B,V.Cc,V.E,Math.min(vp,1),tip);o.g.copy(tip);o.gs=0.85;o.ga=0.3;o.li=2.5;}
    else if(te<TI+0.25){o.g.copy(TC);o.gs=1.1+2.2*ia;o.ga=Math.exp(-ia*10)*0.5;o.li=6*Math.exp(-ia*6)+0.8;}
    else{o.g.set(CX,1.1,0);o.gs=1.3;o.ga=0.1*env+0.18*feed;o.li=1.4*env+2.2*feed;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;
  };
}};

VFX.module("Planta · Boca",[serious,silence,zig,herb]);
})();

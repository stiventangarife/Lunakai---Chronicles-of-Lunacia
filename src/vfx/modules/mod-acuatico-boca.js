// =====================================================================
// MÓDULO · CLASE ACUÁTICO (BOCA)
// Estética marina: agua a presión, burbujas, espuma, electricidad de pez gato, mordiscos de agua. No se dibuja
// la boca del Axie: los efectos nacen de su posición (≈ x lanzador + 0.25, y 1.52) sin malla anatómica.
// Las cuatro habilidades cuestan 2 PA (nivel 2): duración media, sin fractura de suelo ni temblor de cámara.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,caster,target,helixGeo}=VFX;
const {NB,v3,STAR4_FS,FANG_FS,SMOKE_FS,billboard,towardCam,variantGroups}=VFX.lib;

const MX=0.25, MY=1.52;                                    // boca relativa a los pies del lanzador
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const WATER=`vec3(.72,.9,1.)`;
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const qbz=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};

// ---------- GLSL compartido ----------
const CAUS=`float caus(vec3 p){float n=noise(p)*.6+noise(p*2.1+3.7)*.4;return pow(1.-abs(n*2.-1.),5.);}`;
// gota de agua translúcida (col = tono GLSL del cuerpo de la gota)
const DROPC_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;
 float rim=smoothstep(.16,.32,d);float hl=smoothstep(.08,0.,length(q-vec2(-.07,.02)));
 gl_FragColor=vec4(${col}*(.4+.8*rim)+vec3(1.)*hl,a*(.4+.6*rim+hl));}`;
const DROP_FS=DROPC_FS(`mix(uC1,vec3(1.),.3)`);
const CRIM_FS=DROPC_FS(`mix(uC2,uC1,.55)*1.2`);              // agua carmesí (sangrado)
// espuma: copo blanco deshilachado (mezcla normal)
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*6.,vMix*40.));
 float a=smoothstep(.5,.12,d+(n-.5)*.3)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.88,.96,1.),uC1,.15)*(.8+.3*n),a*.8);}`;
// mancha húmeda que se extiende y se seca
const WET_FS=CAUS+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float lobes=.55+.25*noise(vec3(an*2.5,1.,2.))+.12*pow(abs(sin(an*7.)),3.);
 float e=r/max(uP*lobes,.001);float body=smoothstep(1.,.75,e);
 float cs=caus(vec3(p*9.,uT*.5));float rim=band(e,.92,.1);
 gl_FragColor=vec4(mix(uC2,uC1,cs)*1.2+vec3(1.)*rim*.3,(body*(.12+.35*cs)+rim*.5)*uA);}`;
// estela de nado en el suelo: lámina de agua con espuma en V hasta la cabeza (uP)
const WAKE_FS=len=>CAUS+`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;float d=(uP-u)*${f(len)};if(d<0.)discard;
 float w=.25+.6*smoothstep(0.,2.,d);float body=smoothstep(w,w*.3,abs(v));
 float cs=caus(vec3(u*${f(len*2.2)}-uT*.8,vUv.y*2.6,uT*.7));
 float kel=band(abs(v),min(d*.5,1.),.07)*exp(-d*.5)*step(.05,d);float foam=exp(-d*3.)*smoothstep(.5,0.,abs(v));
 gl_FragColor=vec4(mix(uC2,uC1,cs*.7)*1.1+vec3(1.)*(foam+kel*.5),(body*(.15+.4*cs)+kel*.7+foam*.8)*smoothstep(0.,.03,u)*uA);}`;

// =====================================================================
// 1 · CATFISH — el Axie se desliza nadando hasta el rival; dos bigotes de electricidad marina salen de la boca,
//     se clavan en él y por ellos fluye su vida en cuentas de luz hasta encender al Axie
// =====================================================================
const catfish={key:"qbCatfish",name:"Catfish",pa:2,dur:2.2,ti:0.55,pal:"Arcano",
  phases:[["Nado",0],["Bigotes",0.42],["Descarga",0.55],["Drenaje",0.65],["Suelta",1.5],["Regreso",1.62]],
build(a){
  const L=a.L,TD0=0.06,TD1=0.36,TL=0.42,TI=0.55,TDR=0.65,TDE=1.5,TR0=1.62,TR1=2.05,X0=-3.7,XN=1.45,B=V3(3.15,1.27,0);
  const cx=te=>te<TR0?X0+(XN-X0)*ss(TD0,TD1,te):XN+(X0-XN)*ss(TR0,TR1,te);
  const cy=te=>te>=TR0?0.35*Math.sin(Math.PI*cl((te-TR0)/(TR1-TR0))):0;
  // bigote eléctrico en billboard: curva con zigzag que cambia 30 veces/s; uQ = drenaje (cuentas hacia la boca)
  const ELEC_FS=`uniform float uQ;uniform float uS;
  void main(){float u=vUv.x;float y=vUv.y-.5;if(u>uP)discard;
   float env=sin(3.14159*u);float fl=floor(uT*30.);
   float j=(noise(vec3(u*9.,fl*.37,uS*3.))-.5)*.16*env+(noise(vec3(u*27.,fl*.53,uS*5.))-.5)*.06*env;
   float d=abs(y-uS*.3*env-j);
   float core=smoothstep(.012,0.,d);float glow=exp(-d*28.)*.6;
   float beads=pow(.5+.5*sin(u*28.+uT*40.),10.)*uQ;
   float head=smoothstep(.05,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(uC2,uC1,core+beads)*1.6+vec3(1.)*(core*.8+head),(core+glow+beads*glow*1.5+head*.8)*uA);}`;
  const whisk=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fxU(ELEC_FS,{uQ:{value:0},uS:{value:s}},{depthTest:false}));L.trail.add(m);return m;});
  const latch=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS,{depthTest:false})); L.mesh.add(latch);

  const C=`const float TD0=${f(TD0)};const float TD1=${f(TD1)};const float TI=${f(TI)};const float TDR=${f(TDR)};const float TDE=${f(TDE)};
  const vec3 M=vec3(${f(XN+MX)},${f(MY)},0.);const vec3 B=${v3(B)};
  float cx(float t){return t<${f(TR0)}?${f(X0)}+${f(XN-X0)}*smoothstep(TD0,TD1,t):${f(XN)}+${f(X0-XN)}*smoothstep(${f(TR0)},${f(TR1)},t);}`;
  // nado: burbujas y espuma tras el Axie
  a.count+=points(L.part,80,C+`void main(){float s=TD0+aSeed.x*(TD1-TD0+.05);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(cx(s)-.35+(aSeed.z-.5)*.3,.25+aSeed.w*1.3+t*.5,(aSeed.y-.5)*.6);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.05+.06*aSeed.z)*(.7+.5*age));}`,BUBBLE_FS);
  a.count+=points(L.part,50,C+`void main(){float s=TD0+aSeed.x*(TD1-TD0);float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sd=aSeed.z<.5?-1.:1.;vec3 p=vec3(cx(s)-.2,.04,sd*(.15+.5*(1.-exp(-t*3.))*aSeed.w));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.12+.08*aSeed.y)*(.7+age));}`,FOAM_FS,NB);
  // enganche y descargas periódicas sobre el rival
  a.count+=sparks(L.part,70,TI,`${f(B.x)},${f(B.y)},0.`,"-.3,.3,0.",2,6,2);
  for(const t of [0.85,1.1,1.35])a.count+=sparks(L.part,25,t,`${f(B.x+0.05)},${f(B.y-0.1)},0.`,"0.,.3,0.",1.5,4,1.5);
  // drenaje: cuentas de vida que viajan del rival a la boca por cada bigote
  a.count+=points(L.part,160,C+`void main(){float life=.42+aSeed.y*.12;float k=(uT-TDR)/life+aSeed.x;float age=fract(k);
   float sd=aSeed.z<.5?1.:-1.;float u=1.-age;
   vec3 p=mix(M,B,u)+vec3(0.,sd*.3*sin(3.14159*u),0.)+vec3(0.,(aSeed.w-.5)*.04,(aSeed.w-.5)*.08);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-smoothstep(.9,1.,age))*uE:0.;put(p,.035+.04*aSeed.w);}`);
  // absorción: motas que rodean al Axie y se funden con su cuerpo
  a.count+=points(L.part,80,C+`void main(){float life=.55+aSeed.y*.3;float k=(uT-TDR-.2)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rd=mix(.85,.12,age*age);vec3 p=vec3(${f(XN)}+cos(an)*rd,.25+r.y*1.5,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.04+.04*r.z);}`);
  // tras el drenaje: chispas de vida que suben del Axie mientras vuelve
  a.count+=points(L.part,50,C+`void main(){float s=TDE+aSeed.x*.5;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(cx(s)+cos(an)*.45,.3+aSeed.w*1.2+t*1.,sin(an)*.45);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.035*aSeed.w);}`);
  // chisporroteo sobre el cuerpo del rival mientras está enganchado
  a.count+=points(L.part,40,C+`void main(){float an=aSeed.x*6.2832;vec3 p=vec3(3.4+cos(an)*.44,.2+aSeed.y*1.6,sin(an)*.44);
   float tw=pow(.5+.5*sin(uT*(40.+aSeed.z*30.)+aSeed.w*50.),12.);vA=tw*uE;put(p,(.05+.08*aSeed.z)*tw);}`);

  // suelo: estela de nado, ondas eléctricas bajo el Axie (lo siguen) y onda bajo el rival
  const LEN=XN-X0+0.6, wake=groundPlane(LEN,X0-0.3+LEN/2,0.016,fx(WAKE_FS(LEN)),1.0);
  const ripple=groundPlane(2.4,X0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float w=band(fract(r*2.5-uT*1.8),.5,.09)*smoothstep(1.,.3,r);
   float bolt=pow(1.-abs(fract(an*1.27+noise(vec3(r*6.,floor(uT*20.),1.))*.3)*2.-1.),24.)*smoothstep(1.,.4,r);
   gl_FragColor=vec4(mix(uC2,uC1,w+bolt)*1.4,(w*.6+bolt*.9)*uA);}`));
  const shock=groundPlane(2.6,3.4,0.03,fx(RING_FS));
  L.decal.add(wake,ripple,shock);

  const M=V3(0,0,0), mid=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, x=cx(te), drain=ss(TDR,TDR+0.15,te)*(1-ss(TDE,TDE+0.1,te)), dk=cl((te-TDR)/(TDE-TDR));
    caster.position.set(x,cy(te),0);
    caster.rotation.z=-0.28*ss(TD0,TD0+0.08,te)*(1-ss(TD1-0.05,TD1+0.08,te))+0.03*drain*Math.sin(te*47)+0.2*ss(TR0,TR0+0.1,te)*(1-ss(TR1-0.15,TR1,te));
    // bigotes: salen de la boca, se clavan, laten durante el drenaje y se recogen hacia la boca
    M.set(x+MX,MY+cy(te),0); mid.copy(M).add(B).multiplyScalar(0.5);
    const len=M.distanceTo(B), ang=Math.atan2(B.y-M.y,B.x-M.x), out=cl((te-TL)/(TI-TL))*(1-cl((te-TDE)/0.12));
    whisk.forEach(m=>{m.visible=te>=TL&&te<TDE+0.12;m.position.copy(mid);billboard(m,ang);m.scale.set(Math.max(len,0.001),1,1);
      set(m,out,0.85+0.3*hitK(ia,8)*(ia>=0?1:0));m.material.uniforms.uQ.value=drain;});
    let p=cl(ia/0.3); towardCam(latch.position,B,0.4); billboard(latch); latch.visible=ia>=0&&p<1; set(latch,p,(1-p)*0.8);
    const LX=X0-0.3; set(wake,(Math.min(x,XN)-LX)/LEN,te<TR0?ss(TD0,TD0+0.05,te)*(1-ss(TDE,TR0+0.3,te)):0);
    ripple.position.x=x; ripple.material.uniforms.uA.value=0.8*drain;
    p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    U.uE.value=drain;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    cm.emissiveIntensity=drain*(0.12+0.35*dk)*(0.8+0.2*Math.sin(te*31))+0.45*ss(TDE-0.05,TDE+0.05,te)*(1-ss(TDE+0.1,TR1,te));
    // rival: tiembla mientras le sacan la vida y se encoge un poco
    target.position.x=3.4+0.02*drain*Math.sin(te*73)+0.08*hitK(ia,8);
    target.rotation.z=0.035*drain*Math.sin(te*59)-0.12*hitK(ia,8)*Math.cos(Math.max(ia,0)*20);
    target.scale.set(1,1-0.04*drain*dk,1); shock.position.x=target.position.x;
    o.em=drain*(0.2+0.3*Math.pow(0.5+0.5*Math.sin(te*37),4)); o.emc.copy(U.uC2.value);
    if(te<TL){o.g.set(x+0.2,0.9,0);o.gs=1;o.ga=0.2*ss(TD0,TD0+0.1,te);o.li=1.5;}
    else if(te<TDE){o.g.copy(mid);o.gs=1.5+0.4*drain;o.ga=0.25+0.3*hitK(ia,10)*(ia>=0?1:0)+0.1*drain;o.li=2.5+5*hitK(ia,6)*(ia>=0?1:0)+2*drain;}
    else{o.g.set(x,1.1,0);o.gs=1.6;o.ga=0.3*(1-ss(TDE,TR1,te));o.li=3*(1-ss(TDE,TR1,te));}
    o.ia=ia;o.c.copy(B);o.shake=0;o.dist=0.45;o.flash=0.8;
  };
}};

// =====================================================================
// 2 · LAM — embestida y mordisco con dientes afilados. Variante "Vida alta": mordisco limpio de agua con arcos y
//     destellos en los colmillos. "Vida baja": la mandíbula va envuelta en un torrente de agua hirviendo
//     (hélices, vapor y burbujeo sobre el rival) y el golpe es mayor
// =====================================================================
const lam={key:"qbLam",name:"Lam",pa:2,dur:1.8,ti:0.55,pal:"Loto",vlabel:"Vida",
  variants:[["alta","Vida alta"],["baja","Vida baja"]],v:"alta",
  phases:[["Acecho",0],["Embestida",0.15],["Mordisco",0.55],["Retirada",0.8],["Calma",1.35]],
build(a){
  const L=a.L,TL0=0.15,TL1=0.45,TI=0.55,TB0=0.8,TB1=1.3,X0=-3.7,XB=2.15,BP=V3(3.0,1.35,0),VG=variantGroups(a,["alta","baja"]);
  const cx=te=>te<TB0?X0-0.15*ss(0,TL0,te)+(XB-X0+0.15)*Math.pow(ss(TL0,TL1,te),1.3):XB+(X0-XB)*ss(TB0,TB1,te);
  // ---- común: colmillos en billboard (arriba y abajo) que se cierran sobre el rival
  const fangs=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.6),fxU(FANG_FS(8),{uQ:{value:s}},{depthTest:false}));m.userData.s=s;L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  const C=`const float TL0=${f(TL0)};const float TL1=${f(TL1)};const float TI=${f(TI)};const vec3 BP=${v3(BP)};
  float cx(float t){return ${f(X0)}-.15*smoothstep(0.,TL0,t)+${f(XB-X0+0.15)}*pow(smoothstep(TL0,TL1,t),1.3);}`;
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.06;float life=.5+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.5,.35,0.))*(2.+3.*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.1;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.4,0.));vec3 p=BP+d*(.15+.5*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.6:0.;put(p,(.2+.15*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  a.count+=sparks(L.part,60,TI,`${f(BP.x)},${f(BP.y)},0.`,".3,.2,0.",2,6,2.5);
  const shock=groundPlane(2.8,3.4,0.03,fx(RING_FS)), wet=groundPlane(2.4,3.4,0.018,fx(WET_FS));
  L.decal.add(shock,wet);
  const base=a.count;

  // ---- VIDA ALTA: arcos de agua que siguen el cierre de las mandíbulas y destellos en los colmillos
  const crescent=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.1),fx(`void main(){vec2 p=(vUv-.5)*vec2(1.7,1.1);float m=0.;
   for(int i=0;i<2;i++){float s=float(i)*2.-1.;float y=s*(.08+.4*(1.-uP))-s*.22*pow(p.x/.75,2.);
    float w=.025*(1.-pow(p.x/.8,2.));m+=smoothstep(w,0.,abs(p.y-y))*step(abs(p.x),.8);}
   float n=noise(vec3(p*8.-vec2(uT*6.,0.),uT));
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.5+vec3(1.)*m*.4,m*(.6+.5*n)*uA);}`,{depthTest:false}));
  VG.alta.trail.add(crescent);
  VG.alta.n=points(VG.alta.part,14,C+`void main(){float s=TI-.02+aSeed.x*.05;float life=.3;float age=(uT-s)/life;
   float sd=aSeed.y<.5?1.:-1.;vec3 p=BP+vec3((aSeed.z-.5)*.9,sd*.1,.3);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.26*(1.-age*.5));}`,STAR4_FS)
   +points(VG.alta.part,40,C+`void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sd=aSeed.z<.5?1.:-1.;vec3 v=vec3((aSeed.w-.5)*2.,sd*(1.5+aSeed.y),(aSeed.x-.5)*1.2);vec3 p=BP+vec3((aSeed.w-.5)*.8,sd*.1,0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.045+.03*aSeed.y);}`,DROP_FS);

  // ---- VIDA BAJA: torrente de agua hirviendo en hélice alrededor de la embestida, vapor y burbujeo
  const torrent=new THREE.Group(), spin=new THREE.Group(); torrent.add(spin); torrent.rotation.z=-Math.PI/2; VG.baja.trail.add(torrent);
  const hotMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP)discard;
   float st=noise(vec3(u*14.-uT*10.,vUv.y*4.,uT*2.));float cells=smoothstep(.62,.78,noise(vec3(u*40.,vUv.y*6.,uT*5.)));
   float edge=smoothstep(1.,.35,v);
   vec3 c=mix(uC2,uC1,st)*1.3+vec3(1.)*(cells*.9+smoothstep(.7,.9,st)*.5);
   gl_FragColor=vec4(c,edge*(.35+.5*st+cells*.6)*smoothstep(0.,.08,u)*uA);}`);
  for(let i=0;i<3;i++){const m=new THREE.Mesh(helixGeo(2.2,0.44,0.26,1.45,0.16,120),hotMat);m.rotation.y=i*2.094;spin.add(m);}
  const STEAM=SMOKE_FS("vec3(.82,.88,.94)");
  VG.baja.n=points(VG.baja.part,60,C+`void main(){float s=TL0+aSeed.x*(TL1-TL0+.1);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s)+.6+r.x*.5,${f(MY)}+r.y*.35,r.z*.35)+vec3(-.4*t,.7*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.55:0.;put(p,(.22+.18*aSeed.w)*(.6+age));}`,STEAM,NB)
   +points(VG.baja.part,60,C+`void main(){float s=TI+aSeed.x*.25;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.8,0.));vec3 p=BP+d*(.25+.7*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,.6*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.34+.3*aSeed.w)*(.6+age));}`,STEAM,NB)
   +points(VG.baja.part,70,C+`void main(){float life=.35+aSeed.y*.25;float k=(uT-TI)/life+aSeed.x*3.;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.46,.25+r.y*1.5+age*.12,sin(an)*.46);
   vA=(uT>TI&&uT<TI+.9)?sin(age*3.14159)*(1.-smoothstep(TI+.5,TI+.9,uT)):0.;put(p,(.05+.08*r.z)*(.5+age));}`,BUBBLE_FS)
   +points(VG.baja.part,120,C+`void main(){float s=TI+aSeed.x*.08;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.2,.6,0.))*(2.5+3.5*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.06+.05*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  const scald=groundPlane(2.6,3.4,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float b=smoothstep(.6,.75,noise(vec3(p*10.,uT*3.)))*smoothstep(1.,.3,r);float body=smoothstep(1.,.4,r)*.15;
   gl_FragColor=vec4(mix(uC2,uC1,b)*1.3+vec3(1.)*b*.5,(b*.8+body)*uA);}`));
  VG.baja.decal.add(scald);
  a.setVariant=v=>{if(!VG[v])v="alta";a.v=v;for(const k in VG)for(const l of VFX.LK)VG[k][l].visible=k===v;a.count=base+VG[v].n;};

  a.pose=function(te,o){
    const low=a.v==="baja", ia=te-TI, x=cx(te), lunge=ss(TL0,TL1,te)*(1-ss(TB0,TB0+0.15,te));
    caster.position.x=x;
    caster.rotation.z=0.15*ss(0,TL0,te)-0.4*ss(TL0,TL0+0.1,te)+0.25*ss(TI,TI+0.15,te);
    caster.scale.set(1,1-0.08*ss(0,TL0,te)*(1-ss(TL0,TL0+0.08,te)),1);
    const cm=caster.userData.m;
    if(low){cm.emissive.setRGB(1,0.2,0.2);cm.emissiveIntensity=0.12+0.1*Math.pow(0.5+0.5*Math.sin(te*9),6);}   // vida baja: latido rojo
    else{cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=0.25*lunge;}
    // colmillos: abiertos al acercarse, se cierran de golpe en el impacto
    const close=ss(TL1-0.12,TI,te), fa=ss(TL0,TL0+0.15,te)*(1-ss(TI+0.2,TI+0.4,te));
    fangs.forEach(m=>{const s=m.userData.s,off=0.18+0.4*(1-close)-0.04*hitK(ia,10)*(ia>=0?1:0);
      towardCam(m.position,tmp.set(Math.min(x+1.0,BP.x),BP.y+s*off,0),0.5);billboard(m);m.visible=fa>0.001;
      const k=low?1.15:1;m.scale.set(k,k,1);m.material.uniforms.uA.value=fa*(0.8+0.6*hitK(ia,8)*(ia>=0?1:0));});
    let p=cl(ia/0.3); towardCam(hitRing.position,BP,0.45); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.8);
    hitRing.scale.setScalar(low?1.3:1);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    set(wet,ss(0,0.3,ia),ia>=0?1-ss(0.5,0.9,ia):0);
    if(low){
      torrent.position.set(x+MX-0.1,MY-0.05,0); spin.rotation.y=te*14;
      torrent.visible=te>TL0&&ia<0.35; torrent.scale.setScalar(1+0.6*cl(ia/0.3)*(ia>=0?1:0));
      hotMat.uniforms.uP.value=ss(TL0,TL0+0.2,te)*1.02; hotMat.uniforms.uA.value=0.9*(ia>0?1-cl(ia/0.35):1);
      scald.material.uniforms.uA.value=ia>=0?0.9*(1-ss(0.5,1.0,ia)):0;
    }else{
      towardCam(crescent.position,BP,0.5); billboard(crescent); crescent.visible=te>TL1-0.15&&ia<0.25;
      set(crescent,close,(ia>0?1-cl(ia/0.25):1)*ss(TL1-0.15,TL1-0.05,te));
    }
    const hit=hitK(ia,5), kb=low?0.42:0.26;
    target.position.x=3.4+hit*kb*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-hit*(low?0.35:0.24)*Math.cos(ia*14);
    target.scale.set(1,1-0.06*hitK(ia,10),1); for(const m of [shock,wet,scald])m.position.x=target.position.x;
    o.em=low?0.35*hitK(ia,2)*(0.7+0.3*Math.sin(te*25)):0; o.emc.setRGB(1,0.95,0.9);
    if(te<TL0){o.g.set(x+MX,MY,0);o.gs=0.6;o.ga=0.15;o.li=1.2;}
    else if(te<TI){o.g.set(x+0.9,MY,0);o.gs=1.1;o.ga=low?0.4:0.3;o.li=low?3.5:2.5;}
    else{o.g.copy(BP);o.gs=(low?1.6:1.2)+3*ia;o.ga=(low?0.75:0.6)*Math.exp(-ia*10);o.li=(low?9:6.5)*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(BP);o.shake=0;o.dist=low?0.85:0.55;
  };
}};

// =====================================================================
// 3 · PIRANHA — una piraña gigante de agua (silueta de perfil con mandíbula prominente y dientes triangulares)
//     sale de la boca del Axie, nada hasta el rival, abre las fauces y muerde; se rompe en gotas carmesí
//     y el rival sangra a pulsos sobre un charco de agua roja
// =====================================================================
const piranha={key:"qbPiranha",name:"Piranha",pa:2,dur:1.9,ti:0.62,pal:"Rubí",
  phases:[["Acecho",0],["Nado",0.15],["Fauces",0.48],["Mordisco",0.62],["Desgarro",0.72],["Sangrado",0.95]],
build(a){
  const L=a.L,TS0=0.15,TO=0.48,TI=0.62,TD=0.78,BL=[0.62,1.07,1.52],M0=V3(-3.45,1.52,0),PB=V3(2.62,1.3,0);
  const ppos=(te,o)=>{const k=ss(TS0-0.1,TO,te);return o.set(M0.x+(PB.x-M0.x)*k,M0.y+(PB.y-M0.y)*k+0.12*Math.sin(te*20)*(1-ss(TO-0.1,TO,te)),0.15*Math.sin(Math.PI*k));};
  const PIR=`uniform float uQ;uniform float uD;
  vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
  float sdE(vec2 p,vec2 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-4);}
  float pir(vec2 p,out float teeth,out float eye){vec2 H=vec2(-.3,-.02);
   vec2 pu=rot2(p-H,-uQ)+H;vec2 pl=rot2(p-H,uQ)+H;
   float up=max(sdE(pu-vec2(-.05,.1),vec2(.8,.44)),-pu.y);
   float lo=max(sdE(pl-vec2(0.,-.04),vec2(.86,.3)),pl.y);
   float tu=fract(pu.x*12.)-.5;float hu=.075*(1.-abs(tu)*2.);
   float tl=fract(pl.x*10.+.5)-.5;float hl=.1*(1.-abs(tl)*2.);
   teeth=max(step(-.25,pu.x)*step(pu.x,.7)*step(-hu,pu.y)*step(pu.y,0.),step(-.2,pl.x)*step(pl.x,.8)*step(pl.y,hl)*step(0.,pl.y));
   eye=smoothstep(.07,.04,length(pu-vec2(.3,.22)));
   return min(up,lo);}
  void main(){vec2 p=(vUv-.5)*vec2(2.,1.24);float teeth,eye;float d=pir(p,teeth,eye);
   float fade=smoothstep(-1.,-.55,p.x);float n=noise(vec3(p*7.,1.));if(n<uD*1.1-.05)discard;`;
  // capa oscura (mezcla normal) y capa luminosa: borde de agua, escamas insinuadas, dientes y ojo
  const dark=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.05),fxU(PIR+`
   gl_FragColor=vec4(vec3(.1,0.,.02),smoothstep(.02,-.02,d)*.75*fade*uA);}`,{uQ:{value:0},uD:{value:0}},Object.assign({depthTest:false},NB)));
  const glowM=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.05),fxU(PIR+`
   float in0=smoothstep(.02,-.02,d);float rim=band(d,0.,.025);
   float sc=band(fract(p.x*9.+abs(p.y)*4.),.5,.08)*in0*smoothstep(.0,-.1,d)*.35;
   float st=smoothstep(.62,.8,noise(vec3(p*6.-vec2(uT*3.,0.),uT)))*in0;
   vec3 c=mix(uC2,uC1,.5+.5*st)*1.6*(rim+sc+st*.4)+vec3(1.,.92,.9)*teeth*1.4+mix(uC1,vec3(1.),.6)*eye*2.;
   gl_FragColor=vec4(c,(rim+sc+st*.3+teeth+eye)*fade*uA);}`,{uQ:{value:0},uD:{value:0}},{depthTest:false}));
  glowM.renderOrder=1; L.mesh.add(dark,glowM);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const C=`const float TS0=${f(TS0)};const float TO=${f(TO)};const float TI=${f(TI)};const vec3 M0=${v3(M0)};const vec3 PB=${v3(PB)};const vec3 TC=vec3(3.15,1.25,0.);
  vec3 pp(float t){float k=smoothstep(TS0-.1,TO,t);return mix(M0,PB,k)+vec3(0.,.12*sin(t*20.)*(1.-smoothstep(TO-.1,TO,t)),.15*sin(3.14159*k));}`;
  // acecho: onda de agua en la boca; nado: burbujas en la estela
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.12;float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=M0+vec3(.05,cos(an),sin(an))*(.1+.6*t)*1.2;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.w);}`);
  a.count+=points(L.part,70,C+`void main(){float s=TS0+aSeed.x*(TO-TS0);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=pp(s)+vec3(-.5+(aSeed.z-.5)*.3,(aSeed.w-.5)*.4+.3*t,(aSeed.y-.5)*.3);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.05+.06*aSeed.z)*(.7+.5*age));}`,BUBBLE_FS);
  // mordisco: chispas y salpicadura carmesí; la piraña se rompe en gotas
  a.count+=sparks(L.part,70,TI,"3.05,1.28,0.","-.2,.2,0.",2,6,2.5);
  a.count+=points(L.part,100,C+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.3,.4,0.))*(1.8+2.8*aSeed.z);vec3 p=TC+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.3));}`,CRIM_FS);
  a.count+=points(L.part,80,C+`void main(){float s=${f(TD)}+aSeed.x*.12;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=PB+vec3((aSeed.z-.5)*1.5,(aSeed.w-.5)*.8,(aSeed.y-.5)*.3)+vec3(0.,-.3*t-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.04*aSeed.w);}`,CRIM_FS);
  // sangrado: tres pulsos de gotas que brotan del rival + goteo continuo por su cuerpo
  BL.forEach((t,i)=>{a.count+=points(L.part,60,C+`void main(){float s=${f(t)}+aSeed.x*.1;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float tt=max(uT-s,0.);
   float an=(aSeed.z-.5)*2.4;vec3 v=vec3(-cos(an)*(.8+aSeed.w),1.2+1.4*aSeed.y,sin(an)*(.8+aSeed.w))*${f(1-i*0.2)};
   vec3 p=TC+vec3(0.,(aSeed.w-.5)*.3,0.)+v*tt+vec3(0.,-6.*tt*tt,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.3));}`,CRIM_FS);});
  a.count+=points(L.part,80,C+`void main(){float per=.7+aSeed.y*.4;float k=(uT-TI-.1)/per+aSeed.x;float c=floor(k);vec3 r=rr(c);float t=fract(k)*per;
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.45,.35+r.y*1.1-2.2*t*t,sin(an)*.45);
   vA=(k>=1.&&p.y>.03)?uE*.9:0.;put(p,.04+.03*r.z);}`,CRIM_FS);

  // suelo: charco carmesí centrado bajo el rival con anillos donde caen las gotas, y onda del mordisco
  const pool=groundPlane(2.6,3.4,0.02,fx(CAUS+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*5.,1.))*.6+noise(vec3(p*12.,2.))*.4;float e=(r+(n-.5)*.35)/max(uP,.001);
   float body=smoothstep(1.,.8,e);float cs=caus(vec3(p*7.,uT*.4));
   vec2 g=floor(p*6.);float ph=hash(vec3(g,3.));vec2 fq=fract(p*6.)-.5;float rip=band(length(fq),fract(uT*1.3+ph)*.5,.04)*(1.-fract(uT*1.3+ph))*step(.6,ph);
   gl_FragColor=vec4(mix(uC2,uC1,cs*.6+rip)*1.1,(body*(.22+.3*cs)+band(e,.9,.08)*.5+rip*body*.8)*uA);}`));
  const shock=groundPlane(2.8,3.4,0.03,fx(RING_FS));
  L.decal.add(pool,shock);

  const pp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.06,TS0+0.12,te), q=ss(TD,TD+0.15,te);
    caster.rotation.z=0.1*ss(0,0.08,te)-0.22*ss(0.08,0.16,te)+0.12*ss(0.2,0.5,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.1,te)*(1-ss(0.15,0.4,te));
    // piraña: nada con la boca entreabierta que chasquea, abre las fauces, cierra de golpe y sacude
    ppos(te,pp); if(te>=TI)pp.x+=0.08*hitK(ia,12);
    let jaw=0.12+0.08*Math.sin(te*25);
    if(te>=TO-0.08&&te<TI)jaw=0.12+0.4*ss(TO-0.08,TI-0.06,te)*(1-ss(TI-0.04,TI,te));
    if(te>=TI)jaw=0.0;
    const shake=te>=TI?0.16*Math.sin((te-TI)*40)*hitK(ia,4):0;
    for(const m of [dark,glowM]){m.visible=te>0.05&&q<0.999;towardCam(m.position,pp,0.08);billboard(m,shake+(te<TI?0.06*Math.sin(te*20):0));
      m.scale.setScalar(Math.max(0.3+0.7*form+0.12*ss(TO-0.1,TI,te),0.001));m.material.uniforms.uQ.value=jaw;m.material.uniforms.uD.value=q;
      m.material.uniforms.uA.value=form*(1+0.6*hitK(ia,8)*(ia>=0?1:0));}
    let p=cl(ia/0.3); towardCam(hitRing.position,tmp.set(3.05,1.28,0),0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.8);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    const bleed=ss(TI,TI+0.2,te)*(1-ss(1.6,1.9,te));
    set(pool,ss(TI,1.4,te)*0.95+0.05,bleed); U.uE.value=bleed;
    // rival: mordisco (aplastado y sacudido) y un respingo con cada pulso de sangrado
    let pk=0; BL.forEach((t,i)=>{if(te>=t)pk+=(i?0.6:1)*Math.exp(-(te-t)*7);});
    target.position.x=3.4+0.18*hitK(ia,6)+0.03*pk; target.rotation.z=-0.2*hitK(ia,5)*Math.cos(Math.max(ia,0)*18)+0.04*pk;
    target.scale.set(1+0.05*hitK(ia,10),1-0.08*hitK(ia,10),1); pool.position.x=shock.position.x=target.position.x;
    o.em=0.45*pk; o.emc.copy(U.uC1.value);
    if(te<TS0){o.g.copy(M0);o.gs=0.7;o.ga=0.2*form;o.li=1.2;}
    else if(te<TI){o.g.copy(pp);o.gs=1.3;o.ga=0.3;o.li=2.5;}
    else{o.g.set(3.05,1.28,0);o.gs=1.2+3*ia;o.ga=0.6*Math.exp(-ia*10)+0.1*pk;o.li=6.5*Math.exp(-ia*5)+2*pk;}
    o.ia=ia;o.c.set(3.05,1.28,0);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 4 · RISKY FISH — el Axie salta en un arco acrobático (voltereta con una cinta de agua detrás), cae en picado
//     envuelto en un torpedo de agua con ondas de choque y estalla contra el rival; rebota a su casilla
//     y queda debilitado (goteo apagado)
// =====================================================================
const risky={key:"qbRiskyFish",name:"Risky Fish",pa:2,dur:2.3,ti:1.2,pal:"Menta",
  phases:[["Impulso",0],["Salto",0.2],["Picado",0.8],["Impacto",1.2],["Rebote",1.3],["Debilidad",1.75]],
build(a){
  const L=a.L,TJ0=0.2,TJ1=0.8,TI=1.2,TL=1.75,P0=V3(-3.7,0.9,0),JC=V3(-2.9,4.4,0),P1=V3(-0.4,3.6,0),IP=V3(2.6,1.15,0);
  const DA=Math.atan2(IP.y-P1.y,IP.x-P1.x), RZD=Math.atan2(-(IP.x-P1.x),IP.y-P1.y)-2*Math.PI;
  const cen=(te,o)=>{
    if(te<TJ0)return o.copy(P0);
    if(te<TJ1)return qbz(P0,JC,P1,(te-TJ0)/(TJ1-TJ0),o);
    if(te<TI)return o.lerpVectors(P1,IP,Math.pow((te-TJ1)/(TI-TJ1),1.6));
    return arcPt(IP,P0,1.4,ss(TI,TL,te),o);};
  const rz=te=>te<TJ0?0.15*ss(0,TJ0,te):te<TJ1?0.15+(RZD-0.15)*ss(TJ0,TJ1,te):te<TI?RZD:RZD+(-2*Math.PI-RZD)*ss(TI,TL,te);
  // cinta de agua del salto: tubo a lo largo del arco; se ve una ventana detrás del Axie
  const ribbon=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:31},(_,i)=>qbz(P0,JC,P1,i/30,V3(0,0,0)))),90,0.11,8,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.4)discard;float k=d/.4;
   float st=noise(vec3(u*40.-uT*10.,vUv.y*6.,0.));float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
   vec3 c=mix(uC2,uC1,st*.6+(1.-k)*.4)*1.3+vec3(1.)*smoothstep(.7,.9,st)*.4;
   gl_FragColor=vec4(c,((1.-fr)*.45+fr*.4)*(1.-k)*(.6+.5*st)*uA);}`));
  L.trail.add(ribbon);
  // torpedo: cono abierto de agua en espiral alrededor del Axie durante el picado
  const torp=new THREE.Group(); L.trail.add(torp);
  const sheath=new THREE.Mesh(new THREE.ConeGeometry(0.55,2.0,32,6,true).translate(0,0.15,0),fx(`
  void main(){float l=(vP.y+.85)/2.;float an=atan(vP.z,vP.x);
   float sw=noise(vec3(an*2.+l*9.-uT*22.,l*5.,uT*3.))*.6+noise(vec3(an*5.+l*20.-uT*30.,0.,1.))*.4;float st=smoothstep(.45,.85,sw);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3+vec3(1.)*st*l*.4,(st*.6+fr*.35)*smoothstep(0.,.5,l)*smoothstep(1.,.85,l)*uA);}`));
  torp.add(sheath);
  // ondas de choque a lo largo del picado (planos perpendiculares a la trayectoria)
  const booms=[0.35,0.7].map(k=>{const g=new THREE.Group(),m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7).rotateY(Math.PI/2),fx(RING_FS));
    g.add(m);g.rotation.z=DA;g.position.lerpVectors(P1,IP,Math.pow(k,1.6));g.userData={t:TJ1+(TI-TJ1)*k,m};L.mesh.add(g);return g;});
  // impacto: domo de agua que se deshace
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(CAUS+`
  void main(){float n=noise(vP*2.8+vec3(uT*.8));float th=uP*1.15-.1;if(n<th)discard;
   float edge=smoothstep(.12,0.,n-th);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float cs=caus(vP*3.+vec3(0.,uT,0.));
   vec3 c=mix(${WATER},uC1,fr*.5+cs*.3)*(.6+.9*fr)+vec3(1.)*(edge+cs*.25);
   gl_FragColor=vec4(c,(.1+.5*fr+edge+cs*.15)*(1.-uP));}`)); burst.position.set(IP.x+0.35,1.1,0);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing);

  const C=`const float TJ0=${f(TJ0)};const float TJ1=${f(TJ1)};const float TI=${f(TI)};const float TL=${f(TL)};
  const vec3 P0=${v3(P0)};const vec3 JC=${v3(JC)};const vec3 P1=${v3(P1)};const vec3 IP=${v3(IP)};
  vec3 jC(float t){float k=clamp((t-TJ0)/(TJ1-TJ0),0.,1.);float u=1.-k;return u*u*P0+2.*u*k*JC+k*k*P1;}
  vec3 dC(float t){return mix(P1,IP,pow(clamp((t-TJ1)/(TI-TJ1),0.,1.),1.6));}`;
  // impulso: salpicadura a los pies al despegar
  a.count+=points(L.part,60,C+`void main(){float s=TJ0+aSeed.x*.04;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.8+aSeed.w),2.2+2.*aSeed.y,sin(an)*(.8+aSeed.w));
   vec3 p=vec3(-3.7+cos(an)*.35,.05,sin(an)*.35)+v*t+vec3(0.,-8.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.04*aSeed.w);}`,DROP_FS);
  // salto: gotas que se desprenden del cuerpo en el arco
  a.count+=points(L.part,150,C+`void main(){float s=TJ0+aSeed.x*(TJ1-TJ0);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=jC(s)+rnd()*.3+vec3((aSeed.z-.5)*1.*t,-.5*t-6.*t*t,(aSeed.w-.5)*1.*t);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,(.045+.035*aSeed.y)*(1.-age*.3));}`,DROP_FS);
  // picado: estela de burbujas del torpedo
  a.count+=points(L.part,120,C+`void main(){float s=TJ1+aSeed.x*(TI-TJ1);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dC(s)+rnd()*.28+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.05+.07*aSeed.z)*(.7+.5*age));}`,BUBBLE_FS);
  // impacto: gotas en todas direcciones, espuma y chispas
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,.6,0.))*(2.5+4.*aSeed.z);vec3 p=IP+vec3(.35,0.,0.)+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,(.06+.05*aSeed.w)*(1.-age*.3));}`,DROP_FS);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.12;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.06,0.)+vec3(cos(an),0.,sin(an))*(.4+1.4*(1.-exp(-t*3.))*(.5+.5*aSeed.w))+vec3(0.,.25*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.8:0.;put(p,(.24+.2*aSeed.y)*(.6+age));}`,FOAM_FS,NB);
  a.count+=sparks(L.part,80,TI,`${f(IP.x+0.35)},1.1,0.`,".3,.5,0.",3,8,3);
  // debilidad: goteo apagado que cae del Axie tras aterrizar (mezcla normal, gris azulado)
  a.count+=points(L.part,50,C+`void main(){float per=.6+aSeed.y*.4;float k=(uT-TL)/per+aSeed.x;float c=floor(k);vec3 r=rr(c);float t=fract(k)*per;
   float an=r.x*6.2832;vec3 p=vec3(-3.7+cos(an)*.44,.4+r.y*1.3-2.5*t*t,sin(an)*.44);
   vA=(k>=1.&&p.y>.03)?uE*.85:0.;put(p,.05+.03*r.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(vec3(.3,.38,.45)*(1.1-d),a);}`,NB);

  // suelo: anillo del despegue y del aterrizaje (bajo el Axie), sombra que sigue al salto, onda y mancha bajo el rival
  const takeoff=groundPlane(2.4,-3.7,0.03,fx(RING_FS)), landR=groundPlane(2.2,-3.7,0.032,fx(RING_FS));
  const shadow=groundPlane(1.6,-3.7,0.012,fx(`void main(){vec2 p=(vUv-.5)*2.;gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.2,length(p))*.55*uA);}`,NB));
  const shock=groundPlane(3.4,3.4,0.03,fx(RING_FS)), wet=groundPlane(3.0,3.4,0.018,fx(WET_FS));
  L.decal.add(takeoff,landR,shadow,shock,wet);

  const cp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, il=te-TL, r=rz(te), dive=te>=TJ1&&te<TI;
    cen(te,cp);
    caster.position.set(cp.x+0.9*Math.sin(r),cp.y-0.9*Math.cos(r),0); caster.rotation.z=r;
    const crouch=ss(0,TJ0,te)*(1-ss(TJ0,TJ0+0.06,te)), land=hitK(il,9)*(il>=0?1:0), weak=il>=0?ss(0,0.2,il):0;
    caster.scale.set(1+0.1*crouch+0.08*land,1-0.18*crouch-0.15*land-0.04*weak,1+0.1*crouch+0.08*land);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(TJ1-0.1,TJ1,te)*(1-ss(TI,TI+0.2,te));
    set(ribbon,ss(TJ0,TJ1,te)*1.02,te>TJ0&&te<TJ1+0.35?1-ss(TJ1,TJ1+0.35,te):0); ribbon.visible=te>TJ0&&te<TJ1+0.35;
    torp.visible=dive||(ia>=0&&ia<0.08); torp.position.copy(cp); torp.rotation.z=RZD;
    const dk=cl((te-TJ1)/(TI-TJ1)); torp.scale.set(0.8+0.3*dk,0.8+0.4*dk,0.8+0.3*dk); sheath.material.uniforms.uA.value=(dive?ss(TJ1,TJ1+0.08,te):1-cl(ia/0.08))*0.9;
    for(const g of booms){const t=te-g.userData.t,p=cl(t/0.35);set(g.userData.m,p,t>=0?(1-p)*0.7:0);g.visible=t>=0&&p<1;}
    let p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.4*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.32); towardCam(hitRing.position,burst.position,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl((te-TJ0)/0.4); set(takeoff,p,te>=TJ0?(1-p)*0.7:0);
    p=cl(il/0.4); set(landR,p,il>=0?(1-p)*0.6:0);
    shadow.position.x=cp.x; shadow.scale.setScalar(Math.max(1.1-cp.y*0.18,0.3)); shadow.material.uniforms.uA.value=te>=TJ0&&te<TL?Math.max(0.9-cp.y*0.15,0.2):0;
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    set(wet,ss(0,0.35,ia),ia>=0?1-ss(0.6,1.0,ia):0);
    U.uE.value=weak;
    const hit=hitK(ia,4);
    target.position.x=3.4+hit*0.45*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.38*Math.cos(ia*12);
    target.scale.set(1+0.06*hitK(ia,9),1-0.1*hitK(ia,9),1); wet.position.x=shock.position.x=target.position.x;
    if(te<TJ0){o.g.set(-3.7,0.4,0);o.gs=0.7*crouch+0.3;o.ga=0.15;o.li=1;}
    else if(te<TI){o.g.copy(cp);o.gs=dive?1.4:1;o.ga=dive?0.4:0.22;o.li=dive?3.5:1.8;}
    else{o.g.set(IP.x+0.35,1.1,0);o.gs=1.4+3.5*ia;o.ga=0.7*Math.exp(-ia*10);o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(IP.x+0.35,1.1,0);o.shake=0;o.dist=0.7;
  };
}};

VFX.module("Acuático · Boca",[catfish,lam,piranha,risky]);
})();

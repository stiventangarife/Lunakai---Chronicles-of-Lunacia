// =====================================================================
// SAPIDAE · SUSURRADOR — el domador que susurra a los Axies: constelaciones, polvo estelar,
// ondas de resonancia y espíritus. Paleta "Rosa Cósmico" (rosa cósmico + resonancia astral).
// Contrato: {key,name,dur,ti,tier,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,
  caster,target,allies,ALLY_POS}=VFX;
const {v3,STAR4_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;

VFX.palette("Rosa Cósmico",["#ffc6ea","#E86AB0"]);
const PAL="Rosa Cósmico";
const HAND=V3(-3.35,1.15,0.25);           // dedo/mano del Sapidae
const AP=ALLY_POS[0];                     // Axie aliado receptor
const GREEN="vec3(.42,1.,.58)";           // verde semántico de sanación / hebra de vida
const PINK="mix(uC2,uC1,.45)";
const tmp=V3(0,0,0), YA=V3(0,1,0), XA=V3(1,0,0);
const ptFS=body=>HEAD+`varying float vA;varying float vMix;void main(){${body}}`;

// ---------- piezas propias ----------
// segmento 2D: (distancia, avance 0..1 sobre el segmento)
const SEG=`vec2 sgd(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return vec2(length(pa-ba*h),h);}`;
const g2=q=>`vec2(${f(q[0])},${f(q[1])})`;
// constelación: estrellas S=[x,y,tamaño] unidas por aristas E; uP las revela en orden (líneas que se trazan, estrellas que se encienden)
// acumula en ln (líneas), st (estrellas) y dm (distancia mínima a las aristas)
function constellation(S,E,lw){
  let c=""; const nE=E.length, nS=S.length;
  E.forEach(([i,j],k)=>{c+=`{vec2 s=sgd(p,${g2(S[i])},${g2(S[j])});float rv=clamp(uP*${f(nE*1.2)}-${f(k)},0.,1.);dm=min(dm,s.x);
   ln=max(ln,smoothstep(${f(lw)},0.,s.x)*step(s.y,rv)*step(.001,rv));}\n`;});
  S.forEach((q,k)=>{const z=q[2]||1;c+=`{vec2 dd=abs(p-${g2(q)});float d=length(dd);float on=smoothstep(${f(k/nS*0.85)},${f(k/nS*0.85+0.04)},uP);
   float tw=.65+.35*sin(uT*${f(4+(k%4)*2.3)}+${f(k*1.7)});
   st+=on*tw*(smoothstep(${f(0.05*z)},0.,d)+.3*smoothstep(${f(0.17*z)},0.,d)+.6*smoothstep(${f(0.012*z)},0.,min(dd.x,dd.y))*smoothstep(${f(0.22*z)},0.,max(dd.x,dd.y)));}\n`;});
  return c;
}
// dentro/fuera de un polígono (par-impar), desenrollado
function inside(P){
  let c="float ins=0.;";
  P.forEach((a,i)=>{const b=P[(i+1)%P.length];if(Math.abs(b[1]-a[1])<1e-6)return;
    c+=`if(((${f(a[1])}>p.y)!=(${f(b[1])}>p.y))&&(p.x<${f((b[0]-a[0])/(b[1]-a[1]))}*(p.y-(${f(a[1])}))+(${f(a[0])})))ins=1.-ins;`;});
  return c;
}
// en un VS: elige la arista ei del contorno cerrado P → ea, eb
function pickEdge(P){
  let c="vec2 ea=vec2(0.),eb=vec2(0.);";
  P.forEach((a,i)=>{c+=`${i?"else ":""}if(ei==${i}){ea=${g2(a)};eb=${g2(P[(i+1)%P.length])};}`;});
  return c;
}
// gota de luz: trazo vertical con la cabeza (abajo) más brillante
const DROP_FS=ptFS(`vec2 q=gl_PointCoord-.5;float w=.05+.07*(q.y+.5);
 float a=smoothstep(w,w*.25,abs(q.x))*smoothstep(.5,.25,abs(q.y))*(.25+.75*(q.y+.5))*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.55)*1.5,a);`);
// copo de nube rosada (aditivo, muy tenue)
const PUFF_FS=ptFS(`vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*4.,vMix*30.+uT*.3));
 float a=smoothstep(.5,.05,d+(n-.5)*.25)*vA*.3;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.45+.4*n)*.9,a);`);
// cruz verde de sanación
const GCROSS_FS=ptFS(`vec2 q=abs(gl_PointCoord-.5);
 float cr=max(smoothstep(.12,.07,q.x)*smoothstep(.42,.35,q.y),smoothstep(.12,.07,q.y)*smoothstep(.42,.35,q.x));
 float gl=smoothstep(.5,0.,length(gl_PointCoord-.5))*.25;float a=(cr+gl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${GREEN},vec3(1.),cr*.35)*1.4,a);`);
const GDOT_FS=ptFS(`float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${GREEN},vec3(1.),smoothstep(.2,0.,d)*.5)*1.4,a);`);
const GOLD="vec3(1.,.78,.32)";
const GCHIP_FS=ptFS(`vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.6;float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(${GOLD}*(1.1+.5*vMix)+vec3(1.)*smoothstep(.2,0.,d)*.4,a);`);
const GDUST_FS=ptFS(`vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*5.,vMix*20.));
 float a=smoothstep(.5,.1,d+(n-.5)*.2)*vA*.5;if(a<.003)discard;gl_FragColor=vec4(${GOLD}*1.2,a);`);

// =====================================================================
// 1 · GOLPE ASTRAL — constelación sobre la cabeza del Sapidae, rayo cilíndrico de fase hacia el rival
//     y micro supernova de 30 estrellas en el impacto (nivel 2: sin fractura, onda suave)
// =====================================================================
const astral={key:"shepard_astral_strike",name:"Golpe astral",dur:2.0,ti:0.85,tier:2,pal:PAL,
  phases:[["Constelación",0],["Resonancia",0.42],["Rayo",0.62],["Supernova",0.85],["Polvo estelar",1.15]],
build(a){
  const L=a.L,TR=0.42,TB=0.62,TI=0.85,CC=V3(-3.7,2.4,0),HP=V3(3.15,1.25,0);
  const S=[[-.78,-.22,.8],[-.45,.28,1],[-.06,.06,1.3],[.3,.5,.9],[.72,.22,1.1],[.52,-.36,.8],[.04,-.52,1]];
  const E=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]];
  // constelación en billboard con nebulosa tenue; uQ = resonancia (halo que late)
  const cons=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fxU(SEG+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float ln=0.,st=0.,dm=9.;
  ${constellation(S,E,.022)}
   float r=length(p);float neb=noise(vec3(p*2.2,uT*.4))*smoothstep(1.,.2,r);
   float halo=smoothstep(.9,0.,r)*uQ*.45+band(r,.85,.03)*uQ*.4;
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*ln)*1.5*ln+mix(uC1,vec3(1.),.6)*st*1.5+uC2*neb*.3+uC1*halo,
    (ln*.85+min(st,1.5)+neb*.12+halo)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  const resRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS,{depthTest:false}));
  L.mesh.add(cons,resRing);
  // rayo: dos cilindros con bandas de fase que viajan en sentidos opuestos e interfieren
  const dir=HP.clone().sub(CC).normalize(), len=CC.distanceTo(HP);
  const beamFS=pw=>`void main(){float u=vUv.y;if(u>uP)discard;float an=vUv.x*6.2832;
   float w1=sin(u*${f(len*9)}-uT*38.);float w2=sin(u*${f(len*6.3)}+uT*24.+an*2.);
   float bands=smoothstep(.45,1.,abs(w1+w2)*.5);
   float node=band(fract(u*${f(len*1.2)}-uT*6.),.5,.08);
   float core=pow(abs(dot(normalize(vN),normalize(vV))),${pw});
   float head=smoothstep(.06,0.,uP-u)*step(uP,.995);
   float al=(core*(.3+.7*bands)+node*.45*core+head)*smoothstep(0.,.03,u)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,bands*.7+core*.3)*1.6+vec3(1.)*(bands*core*.5+head),al);}`;
  const beamG=new THREE.Group(); beamG.position.copy(CC).addScaledVector(dir,len/2); beamG.quaternion.setFromUnitVectors(YA,dir);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,len,16,1,true),fx(beamFS("1.2")));
  const outer=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,len,24,1,true),fx(beamFS("3.")));
  beamG.add(inner,outer); L.trail.add(beamG);
  // micro supernova: núcleo, cáscara que se expande y rayos
  const nova=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float core=pow(max(0.,1.-r/(.25+.4*uP)),3.)*(1.-uP);
   float shell=band(r,uP*.9,.04+.1*(1.-uP))*(1.-uP)*(.6+.4*noise(vec3(an*5.,r*6.,uT)));
   float rays=pow(abs(cos(an*4.+.3)),40.)*smoothstep(1.,0.,r)*(1.-uP)*1.2;
   gl_FragColor=vec4(mix(uC1,vec3(1.),core)*1.7+uC2*shell,(core+shell+rays)*uA);}`,{depthTest:false}));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(nova,hitRing);
  const C=`const float TR=${f(TR)};const float TB=${f(TB)};const float TI=${f(TI)};const vec3 CC=${v3(CC)};const vec3 HP=${v3(HP)};
  const vec3 BD=${v3(dir)};const float BL=${f(len)};`;
  // polvo estelar que acude a formar la constelación
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*(TR-.1);float life=.3+aSeed.y*.15;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=CC+d*mix(1.1,.05,age*age)*vec3(1.,.8,.4);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // polvo estelar que se desprende del rayo en espiral
  a.count+=points(L.part,200,C+`void main(){float u=aSeed.x;float s=TB+u*(TI-TB)+aSeed.y*.3;float life=.35+aSeed.z*.35;
   float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 side=normalize(cross(BD,vec3(0.,1.,0.)));vec3 up=cross(side,BD);float an=aSeed.w*6.2832+t*6.;
   vec3 p=CC+BD*BL*u+(side*cos(an)+up*sin(an))*(.08+.5*t)+vec3(0.,.15*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*25.+aSeed.x*40.)):0.;put(p,(.025+.035*aSeed.y)*(1.-age*.5));}`);
  // supernova: exactamente 30 estrellas que se dispersan y titilan
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.25,.15,0.)+.0001);vec3 p=HP+d*(.7+1.4*aSeed.z)*(1.-exp(-t*4.5))+vec3(0.,.12*t,0.);
   float tw=.6+.4*sin(t*18.+aSeed.w*30.);
   vA=(age>0.&&age<1.)?(1.-age*age)*tw:0.;put(p,(.16+.16*aSeed.w)*(1.-age*.4));}`,STAR4_FS);
  a.count+=sparks(L.part,140,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.3,.3,0.",2.5,7,2.5);
  // polvo residual alrededor del rival
  a.count+=points(L.part,70,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=HP+vec3((r.x-.5)*1.4,(r.y-.5)*1.4+age*.5,(r.z-.5)*1.);
   vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.03+.03*r.z);}`);
  const gring=groundPlane(3.4,3.4,0.03,fx(RING_FS)); L.decal.add(gring);
  a.pose=function(te,o){
    const ia=te-TI, rv=cl(te/TR), cenv=ss(0,0.12,te)*(1-ss(TI,TI+0.45,te));
    caster.rotation.z=0.1*ss(0,TR,te)-0.2*ss(TB-0.06,TB+0.04,te)+0.1*ss(TI,TI+0.5,te);
    const res=te>=TR&&te<TI?Math.pow(0.5+0.5*Math.sin((te-TR)*32),2):0;
    towardCam(cons.position,CC,0.05); billboard(cons,0.12*Math.sin(te*1.5));
    cons.scale.setScalar(Math.max((0.7+0.3*ss(0,TR,te))*(1+0.07*res)*(1-0.4*ss(TB,TI+0.4,te)),0.001));
    cons.material.uniforms.uQ.value=0.6*res+0.4*ss(TR,TB,te)*(1-ss(TB,TI,te));
    set(cons,rv,cenv);
    let p=cl((te-TR)/0.3); resRing.position.copy(CC); billboard(resRing); resRing.visible=te>=TR&&p<1; set(resRing,p,(1-p)*0.8);
    const bp=cl((te-TB)/(TI-TB)), bon=te>=TB?1-ss(TI+0.08,TI+0.45,te):0;
    beamG.visible=bon>0.001; set(inner,bp,bon); set(outer,bp,bon*0.5);
    const thick=Math.max(1+0.8*(ia>=0?Math.exp(-ia*7):0)-0.7*ss(TI+0.08,TI+0.45,te),0.001); beamG.scale.set(thick,1,thick);
    p=cl(ia/0.6); towardCam(nova.position,HP,0.5); billboard(nova); nova.visible=ia>=0&&p<1; set(nova,p,1); nova.scale.setScalar(0.7+0.6*p);
    p=cl(ia/0.35); towardCam(hitRing.position,HP,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(gring,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    U.uE.value=ia>=0?1-ss(TI+0.6,1.95,te):0;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*cenv*(0.6+0.4*res);
    const hit=ia>=0?Math.exp(-ia*5):0; target.position.x=3.4+hit*0.22; target.rotation.z=-hit*0.22*Math.cos(ia*14);
    o.em=ia>=0?0.25*(1-ss(TI+0.3,1.6,te)):0; o.emc.copy(U.uC1.value);
    if(te<TB){o.g.copy(CC);o.gs=0.8+0.6*rv+0.3*res;o.ga=0.3*cenv+0.15*res;o.li=1.5+2.5*rv+2*res;}
    else if(te<TI){o.g.copy(CC).addScaledVector(dir,len*bp);o.gs=1.3;o.ga=0.45;o.li=5;}
    else{o.g.copy(HP);o.gs=1.4+3*Math.min(ia,0.6);o.ga=Math.exp(-ia*9)*0.75+0.05*U.uE.value;o.li=9*Math.exp(-ia*5)+0.8*U.uE.value;}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.8;
  };
}};

// =====================================================================
// 2 · BÁLSAMO — nube rosada traslúcida sobre el aliado, cascada de gotas de luz y espiral de cruces verdes
//     nivel 2: lluvia definida, ondas suaves en el suelo
// =====================================================================
const balsam={key:"shepard_balsam",name:"Bálsamo",dur:2.2,ti:0.7,tier:2,pal:PAL,allies:1,
  phases:[["Invocación",0],["Nube",0.28],["Lluvia",0.62],["Sanación",0.85],["Disipación",1.75]],
build(a){
  const L=a.L,TN=0.28,TR=0.62,TI=0.7,TRE=1.65,TE=2.15,CL=AP.clone().add(V3(0,2.55,0)),AC=AP.clone().add(V3(0,1.0,0));
  // nube: volumen de ruido con la base más densa (de donde cae la lluvia); uP = densidad
  const cloud=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(`void main(){vec3 q=normalize(vP);
   float fr=abs(dot(normalize(vN),normalize(vV)));
   float n=noise(vP*2.6+vec3(uT*.35,0.,uT*.2))*.6+noise(vP*5.5-vec3(0.,uT*.5,0.))*.4;
   float body=smoothstep(.3,.75,n)*pow(fr,.8);float under=smoothstep(.2,-.7,q.y);
   float rim=pow(1.-fr,3.)*.22;
   gl_FragColor=vec4(mix(uC2,uC1,n+under*.3)*1.1+vec3(1.)*under*body*.25,(body*.42+rim+under*body*.25)*uP*uA);}`));
  cloud.position.copy(CL); L.mesh.add(cloud);
  const uCl={value:0};
  const C=`const float TN=${f(TN)};const float TR=${f(TR)};const float TI=${f(TI)};const float TRE=${f(TRE)};
  const vec3 CL=${v3(CL)};const vec3 AP=${v3(AP)};const vec3 HA=${v3(HAND)};`;
  // hebra de polvo del dedo del Sapidae a la nube
  a.count+=points(L.part,90,C+`void main(){float s=.04+aSeed.x*.3;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 m=mix(HA,CL,.5)+vec3(0.,.9,0.);vec3 r=rnd();vec3 p=mix(mix(HA,m,k),mix(m,CL,k),k)+r*.12*sin(k*3.14159);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age)*(1.-smoothstep(.85,1.,age)):0.;put(p,.03+.035*aSeed.z);}`);
  // copos que giran despacio dentro de la nube (uE ligado a la envolvente de la nube)
  a.count+=points(L.part,40,C+`void main(){float an=aSeed.x*6.2832+uT*(.3+.3*aSeed.y);float rad=sqrt(aSeed.z)*.8;
   vec3 p=CL+vec3(cos(an)*rad,(aSeed.w-.5)*.32+.04*sin(uT*2.+aSeed.x*9.),sin(an)*rad*.9);
   vA=uE*.6;put(p,(.45+.35*aSeed.y)*(.4+.6*uE));}`,PUFF_FS,{uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:uCl}});
  // lluvia en cascada de gotas de luz suave
  a.count+=points(L.part,320,C+`void main(){float life=.42+aSeed.y*.18;float k=(uT-TR)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float s0=TR+(c-aSeed.x)*life;float an=r.x*6.2832;float rad=sqrt(r.y)*.75;
   vec3 st=CL+vec3(cos(an)*rad,-.18,sin(an)*rad*.9);float y=st.y-(st.y-.04)*age*(.35+.65*age);
   vA=(k>=1.&&s0<TRE)?smoothstep(0.,.08,age)*(.55+.45*r.z):0.;put(vec3(st.x,y,st.z),.09+.05*r.z);}`,DROP_FS);
  // salpicaduras al tocar el suelo
  a.count+=points(L.part,60,C+`void main(){float life=.25+aSeed.y*.1;float k=(uT-TR-.3)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float s0=TR+.3+(c-aSeed.x)*life;float an=r.x*6.2832;float rad=sqrt(r.y)*.75;
   vec3 p=AP+vec3(cos(an)*rad+(r.z-.5)*age*.2,.03+sin(age*3.14159)*.12,sin(an)*rad*.9);
   vA=(k>=1.&&s0<TRE+.35)?(1.-age):0.;put(p,.025+.02*r.z);}`);
  // espiral ascendente de cruces verdes (dos brazos)
  a.count+=points(L.part,48,C+`void main(){float s=TI+.1+aSeed.x*.9;float life=.9+aSeed.y*.3;float age=(uT-s)/life;float t=clamp(age,0.,1.);
   float an=s*9.+step(.5,aSeed.z)*3.14159+t*4.;float rad=.62*(1.-.45*t);
   vec3 p=AP+vec3(cos(an)*rad,.15+t*1.9,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(t*3.14159):0.;put(p,(.13+.06*aSeed.w)*(.6+.4*sin(t*3.14159)));}`,GCROSS_FS);
  a.count+=points(L.part,50,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AP+vec3(cos(an)*(.3+.3*r.y),.1+age*1.7,sin(an)*(.3+.3*r.y));
   vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.025+.025*r.z);}`,GDOT_FS);
  // suelo: ondas de gotas bajo el aliado y halo de sanación
  const ripple=groundPlane(2.4,AP.x,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.4;float m=0.;
   for(int i=0;i<7;i++){float fi=float(i);float per=.45+fi*.06;float k=uT/per+fi*.37;float c=floor(k);float age=fract(k);
    vec2 cen=vec2(hash(vec3(c,fi,1.)),hash(vec3(fi,c,2.)))*1.4-.7;m+=band(length(p-cen),age*.35,.025)*(1.-age);}
   float r0=length(p);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.3,m*smoothstep(1.1,.6,r0)*uA);}`));
  const healGlow=groundPlane(2.0,AP.x,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=smoothstep(1.,.1,r)*.25+band(r,.85,.03)*.6;
   gl_FragColor=vec4(mix(${GREEN},uC1,r*.6)*1.2,m*uA);}`));
  ripple.position.z=healGlow.position.z=AP.z;
  L.decal.add(ripple,healGlow);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(TN-0.1,TR,te), env=form*(1-ss(TRE,TE,te)), heal=ss(TI,TI+0.25,te)*(1-ss(1.8,TE,te));
    caster.rotation.z=0.1*ss(0,TN,te)-0.12*ss(TN,TN+0.15,te);
    const g=0.6+0.4*form;
    cloud.visible=env>0.001; cloud.scale.set(1.0*g,0.36*g*(1+0.05*Math.sin(te*3)),0.9*g); set(cloud,form,env);
    uCl.value=env;
    ripple.material.uniforms.uA.value=ss(TR+0.3,TR+0.5,te)*(1-ss(TRE,TRE+0.4,te));
    healGlow.material.uniforms.uA.value=heal*(0.8+0.2*Math.sin(te*6));
    U.uE.value=heal;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.1,te)*(1-ss(TN,TR,te));
    const d=allies[0].userData.m; d.emissive.setRGB(0.42,1,0.58); d.emissiveIntensity=0.45*heal*(0.75+0.25*Math.sin(te*7));
    if(te<TN){o.g.copy(HAND);o.gs=0.6;o.ga=0.25*ss(0,0.1,te);o.li=1.5;}
    else if(te<TI){o.g.copy(CL);o.gs=1.4+0.8*form;o.ga=0.25*form;o.li=3*form;}
    else{o.g.copy(CL).y-=0.9*heal;o.gs=2.0;o.ga=0.22*env+0.15*Math.exp(-ia*6);o.li=2.5*env+2*heal;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 3 · SINTONÍA — hilo de energía en curva de Bézier del dedo del Sapidae a la frente del aliado;
//     un orbe de luz sube desde su pecho y se funde en un destello sobre la cabeza (nivel 1: rápido y fino)
// =====================================================================
const attune={key:"shepard_attunement",name:"Sintonía",dur:1.3,ti:0.4,tier:1,pal:PAL,allies:1,
  phases:[["Hilo",0],["Conexión",0.32],["Orbe",0.4],["Destello",0.78],["Fin",1.02]],
build(a){
  const L=a.L,T0=0.04,TC=0.32,TI=0.4,TF=0.78,FH=AP.clone().add(V3(0.24,1.66,0)),CH=AP.clone().add(V3(0.12,1.0,0)),TOP=AP.clone().add(V3(0,2.12,0));
  const K1=HAND.clone().add(V3(0.5,1.05,-0.15)),K2=FH.clone().add(V3(-0.65,0.85,0.25));
  const curve=new THREE.CubicBezierCurve3(HAND,K1,K2,FH);
  // hilo: núcleo fino + halo; pulsos que fluyen hacia el aliado y cabeza brillante al avanzar
  const threadFS=pw=>`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));float flow=band(fract(u*7.-uT*4.5),.5,.12);
   float head=exp(-d*30.)*step(uP,.995);
   float al=(pow(fr,${pw})*(.55+.6*flow)+head*1.2)*smoothstep(0.,.03,u)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*flow)*1.6+vec3(1.)*head*.8,al);}`;
  const thread=new THREE.Mesh(taperTube(curve,90,8,0.022,0.013),fx(threadFS("1.")));
  const halo=new THREE.Mesh(taperTube(curve,90,10,0.07,0.04),fx(threadFS("3.")));
  L.trail.add(thread,halo);
  // orbe de luz y destello final (efectos del mundo, no interfaz)
  const orb=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float core=smoothstep(.28,0.,r);float hl=pow(max(0.,1.-r),2.5)*.6;
   float glint=pow(abs(cos(an*2.+uT*3.)),24.)*smoothstep(1.,.2,r)*.5;float ring=band(r,.45+.05*sin(uT*12.),.03)*.6;
   gl_FragColor=vec4(mix(uC1,vec3(1.),core*.7)*1.6,(core+hl+glint+ring)*uA);}`,{depthTest:false}));
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float r=length(p);
   float star=smoothstep(.05,0.,min(q.x,q.y)*(1.+3.*max(q.x,q.y)))*smoothstep(1.,.1,max(q.x,q.y)/(.3+.7*uP));
   float core=pow(max(0.,1.-r/(.2+.3*uP)),2.);float ring=band(r,uP*.85,.04)*(1.-uP);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.7,(star*(1.-uP*.7)+core*(1.-uP)+ring)*uA);}`,{depthTest:false}));
  L.mesh.add(orb,flash);
  const orbAt=(te,out)=>{const k=cl((te-TI)/(TF-TI)),e=k*k*(3-2*k);return out.lerpVectors(CH,TOP,e).add(tmp.set(0.04*Math.sin(k*9),0,0));};
  const C=`const float T0=${f(T0)};const float TC=${f(TC)};const float TI=${f(TI)};const float TF=${f(TF)};
  const vec3 HA=${v3(HAND)};const vec3 K1=${v3(K1)};const vec3 K2=${v3(K2)};const vec3 FH=${v3(FH)};const vec3 CH=${v3(CH)};const vec3 TOP=${v3(TOP)};
  vec3 bz(float u){float v=1.-u;return v*v*v*HA+3.*v*v*u*K1+3.*v*u*u*K2+u*u*u*FH;}
  vec3 orbAt(float t){float k=clamp((t-TI)/(TF-TI),0.,1.);float e=k*k*(3.-2.*k);return mix(CH,TOP,e)+vec3(.04*sin(k*9.),0.,0.);}`;
  // motas que suelta el hilo al pasar su cabeza
  a.count+=points(L.part,70,C+`void main(){float u=aSeed.x;float s=T0+u*(TC-T0)+aSeed.y*.15;float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bz(u)+r*.04+r*.25*t+vec3(0.,.1*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.02+.02*aSeed.w)*(1.-age*.5));}`);
  // chispa estelar al tocar la frente
  a.count+=points(L.part,18,C+`void main(){float s=TC+aSeed.x*.05;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+.0001);vec3 p=FH+d*.3*(1.-exp(-t*6.));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.07+.07*aSeed.z);}`,STAR4_FS);
  // estela del orbe al subir
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*(TF-TI);float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=orbAt(s)+r*.06+vec3(r.x*.15*t,-.25*t,r.z*.15*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.02+.015*aSeed.z)*(1.-age*.5));}`);
  a.count+=sparks(L.part,60,TF,`${f(TOP.x)},${f(TOP.y)},${f(TOP.z)}`,"0.,.4,0.",1.2,3.5,1.5);
  // el destello se funde: brillos que caen suaves sobre el Axie
  a.count+=points(L.part,40,C+`void main(){float s=TF+aSeed.x*.2;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rad=sqrt(aSeed.w)*.45;vec3 p=TOP+vec3(cos(an)*rad,-t*1.1,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.02+.02*aSeed.y);}`);
  const op=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, tf=te-TF, g=1-Math.pow(1-cl((te-T0)/(TC-T0)),2), ton=te>=T0?1-ss(0.55,0.85,te):0;
    caster.rotation.z=-0.08*ss(0,0.15,te)+0.08*ss(0.4,0.7,te);
    thread.visible=halo.visible=ton>0.001; set(thread,g,ton); set(halo,g,ton*0.45);
    orbAt(te,op); towardCam(orb.position,op,0.3); billboard(orb);
    const ob=ss(TI,TI+0.08,te)*(1-ss(TF-0.04,TF+0.04,te));
    orb.visible=ob>0.001; orb.scale.setScalar(Math.max(ob*(0.85+0.15*Math.sin(te*20)),0.001)); orb.material.uniforms.uA.value=ob;
    let p=cl(tf/0.32); towardCam(flash.position,TOP,0.3); billboard(flash,0.4); flash.visible=tf>=0&&p<1; set(flash,p,1);
    const d=allies[0].userData.m; d.emissive.copy(U.uC1.value);
    d.emissiveIntensity=(te>=TC?0.45*Math.exp(-(te-TC)*8):0)+0.25*ob+(tf>=0?0.6*Math.exp(-tf*6):0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*ton*(1-ss(TC,TI+0.2,te));
    if(te<TC){curve.getPointAt(Math.min(g,1),o.g);o.gs=0.55;o.ga=0.3*ton;o.li=1.6;}
    else if(te<TF){o.g.copy(op);o.gs=0.7;o.ga=0.35*Math.max(ob,0.4);o.li=2.4;}
    else{o.g.copy(TOP);o.gs=0.8+1.5*Math.min(tf,0.4);o.ga=Math.exp(-tf*8)*0.55;o.li=4*Math.exp(-tf*6);}
    o.ia=te>=TF?tf:ia;o.c.copy(te>=TF?TOP:FH);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 4 · AULLIDO DE MANADA — lobo astral espectral (relleno SDF de polígono + contorno de constelación) aullando
//     junto al lanzador y tres anillos sónicos concéntricos hasta 2 casillas (nivel 2)
// =====================================================================
const howl={key:"shepard_pack_howl",name:"Aullido de manada",dur:2.2,ti:0.8,tier:2,pal:PAL,
  phases:[["Invocación",0],["Silueta",0.3],["Aullido",0.6],["Ondas",0.8],["Eco",1.4],["Disipación",1.8]],
build(a){
  const L=a.L,TH=0.6,TI=0.8,TD=1.8,TE=2.15,WC=V3(-5.15,1.2,0.55),HS=1.2,CX=-3.7;
  // lobo sentado, hocico al cielo y boca abierta (unidades del plano −1..1)
  const WP=[[.66,.98],[.40,.80],[.26,.99],[.14,.72],[-.06,.50],[-.36,.16],[-.56,-.34],[-.96,-.66],[-.70,-.84],[-.44,-.96],
    [.06,-.96],[.36,-.96],[.30,-.55],[.34,-.06],[.42,.42],[.70,.80],[.52,.84]];
  const big={0:1.2,2:1.1,7:1.1,10:0.9,11:0.9,4:0.9};
  const WS=WP.map((q,i)=>[q[0],q[1],big[i]||0.65]).concat([[.33,.66,1.4]]);   // + ojo
  const WE=WP.map((q,i)=>[i,(i+1)%WP.length]).concat([[4,13],[6,12]]);
  const wolfG=new THREE.Group(); L.mesh.add(wolfG);
  // uQ = cuerpo espectral (nebulosa dentro del contorno), uH = intensidad del aullido
  const wolf=new THREE.Mesh(new THREE.PlaneGeometry(HS*2,HS*2),fxU(SEG+`uniform float uQ;uniform float uH;
  void main(){vec2 p=(vUv-.5)*2.;float ln=0.,st=0.,dm=9.;
  ${constellation(WS,WE,.016)}
  ${inside(WP)}
   float neb=noise(vec3(p*3.,uT*.5))*.6+noise(vec3(p*7.,1.)-vec3(0.,uT*.8,0.))*.4;
   float edge=smoothstep(.14,0.,dm)*ins;
   float fill=ins*uQ*(.1+.3*neb+.45*edge);
   float hw=uH*ins*smoothstep(0.,.6,p.y)*.35;
   vec3 col=mix(uC2,uC1,neb*.6+edge*.4)*1.3*fill+mix(uC2,uC1,.6+.4*ln)*1.6*ln+mix(uC1,vec3(1.),.6)*1.6*st+uC1*hw;
   gl_FragColor=vec4(col,(fill+ln*.9+min(st,1.5)+hw)*uA);}`,{uQ:{value:0},uH:{value:0}},{depthTest:false}));
  wolfG.add(wolf);
  // arcos sónicos que salen de la boca (hijo del lobo, en su plano)
  const MO=V3(0.62*HS,0.88*HS,0.02), ANG=0.85, ARC=1.4;
  const arcs=new THREE.Mesh(new THREE.PlaneGeometry(ARC,ARC),fxU(`uniform float uH;
  void main(){vec2 p=(vUv-.5)*2.;p.x+=.9;float r=length(p);float an=atan(p.y,p.x);
   float wedge=smoothstep(.75,.3,abs(an));float m=0.;
   for(int i=0;i<3;i++){float k=fract(uH*1.8+float(i)/3.);m+=band(r,.12+k*1.6,.05)*(1.-k)*smoothstep(0.,.1,k);}
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,m*wedge*uA);}`,{uH:{value:0}},{depthTest:false}));
  arcs.position.set(MO.x+0.9*ARC/2*Math.cos(ANG),MO.y+0.9*ARC/2*Math.sin(ANG),0.03); arcs.rotation.z=ANG;
  wolfG.add(arcs);
  const C=`const float TH=${f(TH)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const vec2 MO=vec2(${f(MO.x)},${f(MO.y)});`;
  // polvo estelar que acude al contorno del lobo (coordenadas locales del plano)
  a.count+=points(wolfG,220,C+`void main(){int ei=int(min(aSeed.x*${f(WP.length)},${f(WP.length-0.01)}));${pickEdge(WP)}
   vec3 home=vec3(mix(ea,eb,aSeed.y)*${f(HS)},.03);vec3 r=rnd();
   float s=.05+aSeed.z*.35;float k=clamp((uT-s)/.35,0.,1.);k=1.-pow(1.-k,3.);
   vec3 p=mix(home+r*vec3(1.6,1.6,.4),home,k);float dis=max(uT-TD,0.);p+=vec3(r.x*.4,.5+r.y*.3,r.z*.2)*dis;
   float hw=uT>TH?exp(-(uT-TH)*3.):0.;
   vA=step(s,uT)*k*(.55+.45*sin(uT*9.+aSeed.w*40.))*(1.-smoothstep(TD,TE,uT))*(1.+hw);put(p,(.03+.035*aSeed.w)*(1.+.5*hw));}`);
  // motas del aullido que salen de la boca
  a.count+=points(wolfG,60,C+`void main(){float s=TH+aSeed.x*(TD-TH-.2);float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec2 d=vec2(cos(${f(ANG)}),sin(${f(ANG)}));vec2 n=vec2(-d.y,d.x);
   vec2 q=MO+d*t*1.6+n*(aSeed.z-.5)*t*1.1;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(vec3(q,.04),(.03+.04*aSeed.w)*(1.-age*.4));}`,STAR4_FS);
  // polvo levantado por cada anillo en el suelo
  a.count+=points(L.part,100,C+`void main(){float fi=floor(aSeed.x*3.);float s=TI+fi*.14+aSeed.y*.45;float t=s-TI-fi*.14;
   float k=1.-pow(1.-clamp(t/.55,0.,1.),3.);float R=k*${f(2/3)}*(fi+1.);float an=aSeed.z*6.2832;float age=(uT-s)/.4;
   vec3 p=vec3(${f(CX)}+cos(an)*R,.03+max(uT-s,0.)*.5,sin(an)*R);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.03+.03*aSeed.w);}`);
  // tres anillos sónicos concéntricos (radios finales 2/3, 4/3 y 2 casillas) con ecos internos y ondulación
  const RS=4.6;
  const rings=groundPlane(RS,CX,0.03,fxU(`uniform float uH;
  void main(){vec2 p=(vUv-.5)*${f(RS)};float r=length(p);float an=atan(p.y,p.x);float m=0.;
   for(int i=0;i<3;i++){float fi=float(i);float t=uH-fi*.14;float k=1.-pow(1.-clamp(t/.55,0.,1.),3.);float R=k*${f(2/3)}*(fi+1.);
    float d=r-R+.03*sin(an*10.-uT*14.+fi*1.7)*k;
    m+=(band(d,0.,.05)+.5*band(d,-.09,.025)+.3*band(d,-.16,.02))*step(0.,t)*(.7+.3*sin(uT*20.-fi));}
   float edge=band(r,2.,.02)*.35*smoothstep(0.,.3,uH);float fill=smoothstep(2.,0.,r)*.05*step(0.,uH);
   gl_FragColor=vec4(mix(uC2,uC1,min(m,1.))*1.4+vec3(1.)*m*.2,(m+edge+fill)*smoothstep(2.25,2.05,r)*uA);}`,{uH:{value:-1}}));
  L.decal.add(rings);
  const mw=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, rev=cl(te/0.55), env=ss(0,0.15,te)*(1-ss(TD,TE,te));
    const hw=te>=TH?ss(TH,TH+0.12,te)*(1-ss(1.45,1.8,te)):0;
    wolfG.position.copy(WC); wolfG.position.y+=0.03*Math.sin(te*2.2); billboard(wolfG);
    wolfG.scale.set(1+0.02*hw*Math.sin(te*45),1+0.04*hw,1);
    const wu=wolf.material.uniforms; wu.uP.value=rev; wu.uA.value=env; wu.uQ.value=ss(0.3,0.6,te)*(1-ss(TD,TE,te)); wu.uH.value=hw;
    arcs.visible=hw>0.001; arcs.material.uniforms.uH.value=te-TH; arcs.material.uniforms.uA.value=hw;
    const ru=rings.material.uniforms; ru.uH.value=ia>=0?ia:-1; ru.uA.value=ia>=0?1-ss(1.6,2.1,te):0;
    caster.rotation.z=-0.06*ss(0,0.5,te)+0.06*ss(TH,TI,te);
    const pulse=ia>=0?Math.exp(-ia*4)*(0.6+0.4*Math.sin(ia*30)):0;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*env+0.45*pulse;
    mw.set(WC.x+0.62*HS,WC.y+0.88*HS,WC.z);
    if(te<TH){o.g.copy(WC);o.gs=1.6*rev;o.ga=0.25*env;o.li=2.5*rev;}
    else{o.g.copy(mw);o.gs=1.2+0.6*hw;o.ga=0.3*hw+0.1*env;o.li=2+3*hw;}
    if(ia>=0){o.li+=4*Math.exp(-ia*4);o.ga+=0.2*Math.exp(-ia*8);}
    o.ia=ia;o.c.set(CX,0.3,0);o.shake=0;o.dist=0.6;o.flash=0;
  };
}};

// =====================================================================
// 5 · VÍNCULO ESPIRITUAL — doble hélice tipo ADN (hebra rosa y hebra verde con peldaños) a 0,5 m del suelo
//     entre el lanzador y el aliado; late de forma rítmica (nivel 1: fina y rápida)
// =====================================================================
const bond={key:"shepard_spirit_bond",name:"Vínculo espiritual",dur:1.4,ti:0.4,tier:1,pal:PAL,allies:1,
  phases:[["Lazo",0],["Unión",0.4],["Pulso",0.55],["Fin",1.1]],
build(a){
  const L=a.L,T0=0.05,TI=0.4,TE=1.4,R=0.2,TURNS=3.2,N=14;
  const A0=V3(-3.7,0.5,0),A1=V3(AP.x,0.5,AP.z),dir=A1.clone().sub(A0).normalize();
  const P0=A0.clone().addScaledVector(dir,0.48),P1=A1.clone().addScaledVector(dir,-0.45),len=P0.distanceTo(P1);
  const frame=new THREE.Group(); frame.position.copy(P0); frame.quaternion.setFromUnitVectors(XA,dir); L.mesh.add(frame);
  const spin=new THREE.Group(); frame.add(spin);
  const uB={value:0}, uRv={value:0}, uFd={value:0};
  const strand=ph=>{const pts=[];for(let i=0;i<=120;i++){const t=i/120,th=t*TURNS*Math.PI*2+ph;pts.push(V3(t*len,R*Math.cos(th),R*Math.sin(th)));}
    return new THREE.CatmullRomCurve3(pts);};
  const strandFS=col=>`uniform float uQ;void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));float pulse=band(fract(u*2.5-uT*1.8),.5,.1);float head=exp(-d*25.)*step(uP,.995);
   vec3 c=${col};
   gl_FragColor=vec4(c*(1.2+.9*pulse+uQ*.8)+vec3(1.)*head*.6,(pow(fr,1.2)*(.6+.5*pulse+.5*uQ)+head)*smoothstep(0.,.03,u)*smoothstep(1.,.97,u)*uA);}`;
  const sPink=new THREE.Mesh(new THREE.TubeGeometry(strand(0),200,0.026,8,false),fxU(strandFS(PINK),{uQ:uB}));
  const sGreen=new THREE.Mesh(new THREE.TubeGeometry(strand(Math.PI),200,0.026,8,false),fxU(strandFS(GREEN),{uQ:uB}));
  spin.add(sPink,sGreen);
  // peldaños: degradado rosa → verde (abajo en la hebra rosa, arriba en la verde)
  const rungMat=fxU(`uniform float uQ;void main(){float v=vUv.y;vec3 c=mix(${PINK},${GREEN},v);
   float fr=abs(dot(normalize(vN),normalize(vV)));gl_FragColor=vec4(c*(1.1+uQ),(.35+.5*fr)*(.7+.5*uQ)*uA);}`,{uQ:uB});
  const rungG=new THREE.CylinderGeometry(0.011,0.011,2*R,6,1,true);
  const rungs=[];
  for(let i=0;i<N;i++){const u=(i+0.5)/N,th=u*TURNS*Math.PI*2,m=new THREE.Mesh(rungG,rungMat);
    m.position.set(u*len,0,0); m.quaternion.setFromUnitVectors(YA,V3(0,-Math.cos(th),-Math.sin(th))); m.userData.u=u; rungs.push(m); spin.add(m);}
  // motas que brotan de ambas hebras (color según la hebra)
  a.count+=points(spin,130,`uniform float uRv;uniform float uB;uniform float uFd;void main(){float u=aSeed.x;
   float th=u*${f(TURNS*2*Math.PI)}+step(.5,aSeed.w)*3.14159;vec3 base=vec3(u*${f(len)},${f(R)}*cos(th),${f(R)}*sin(th));
   float life=.35+aSeed.y*.25;float k=(uT-.05)/life+aSeed.z;float c=floor(k);float age=fract(k);vec3 r=rnd();
   vec3 p=base+normalize(vec3(0.,base.y,base.z)+.0001)*age*.18+r*.03;
   vA=(u<uRv&&k>=1.)?sin(age*3.14159)*(.6+uB*.8)*uFd:0.;put(p,.022+.02*aSeed.y);}`,
   ptFS(`float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(mix(uC2,uC1,.6),${GREEN},step(.5,vMix))*1.5+vec3(1.)*smoothstep(.2,0.,d)*.4,a);`),
   {uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uRv,uB,uFd}});
  // destellos en los extremos al cerrarse el vínculo
  const endFS=col=>`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float m=pow(max(0.,1.-r),3.)*(.4+uP)+band(r,.5+.3*uP,.05)*uP;gl_FragColor=vec4(${col}*1.6,m*uA);}`;
  const endA=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(endFS(PINK),{depthTest:false}));
  const endB=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(endFS(GREEN),{depthTest:false}));
  L.mesh.add(endA,endB);
  const mid=P0.clone().lerp(P1,0.5);
  a.pose=function(te,o){
    const ia=te-TI, g=1-Math.pow(1-cl((te-T0)/(TI-T0)),2), env=ss(0,0.08,te)*(1-ss(TE-0.3,TE,te));
    const beat=ia>=0?Math.pow(0.5+0.5*Math.cos(ia*Math.PI*2*2.4),6):0;
    uB.value=beat; uRv.value=g; uFd.value=env;
    spin.rotation.x=te*2.4; spin.scale.set(1,1+0.2*beat,1+0.2*beat);
    set(sPink,g,env); set(sGreen,g,env); rungMat.uniforms.uA.value=env;
    for(const m of rungs){const s=ss(m.userData.u-0.02,m.userData.u+0.06,g);m.visible=s>0.01;m.scale.set(1,Math.max(s,0.001),1);}
    const fl=ia>=0?Math.exp(-ia*7):0;
    towardCam(endA.position,P0,0.15); billboard(endA); set(endA,fl+0.25*beat,env*ss(0,0.1,te));
    towardCam(endB.position,P1,0.15); billboard(endB); set(endB,fl+0.25*beat,env*(te>=TI-0.04?1:0));
    caster.rotation.z=0.06*ss(0,0.2,te)-0.06*ss(TI,TI+0.3,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=(0.15+0.4*beat)*env+0.4*fl;
    const d=allies[0].userData.m; d.emissive.setRGB(0.42,1,0.58); d.emissiveIntensity=(0.15+0.4*beat)*env*(ia>=0?1:0)+0.4*fl;
    if(te<TI){o.g.copy(P0).lerp(P1,g);o.gs=0.6;o.ga=0.25*env;o.li=1.6;}
    else{o.g.copy(mid);o.gs=1.0+0.4*beat;o.ga=(0.12+0.18*beat)*env+0.2*fl;o.li=(1.5+2.5*beat)*env+2*fl;}
    o.ia=ia;o.c.copy(mid);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 6 · DESPERTAR QUIMÉRICO — el aliado levita en ingravidez, cae un pilar de luz gigante con destello anamórfico,
//     aterriza con onda de choque dorada y queda a escala 1,1 (nivel 3: fractura de baldosa bajo el aliado)
// =====================================================================
const chim={key:"shepard_chimeric_awakening",name:"Despertar quimérico",dur:3.2,ti:1.3,tier:3,pal:PAL,allies:1,
  phases:[["Ingravidez",0],["Pilar",0.92],["Aterrizaje",1.3],["Onda dorada",1.45],["Despertar",1.95]],
build(a){
  const L=a.L,TL=0.85,TP=0.92,TI=1.3,TD=2.3,TE=3.1,AC=AP.clone().add(V3(0,1.0,0)),PH=16,Y0=14,LIFT=0.4;
  // pilar de luz gigante: vetas que caen, núcleo blanco y borde rosado
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,48,1,true).translate(0,0.5,0),fx(`void main(){float h=vUv.y;
   float fr=abs(dot(normalize(vN),normalize(vV)));float an=vUv.x*6.2832;
   float st=noise(vec3(an*3.,h*${f(PH*1.5)}+uT*14.,0.))*.6+noise(vec3(an*7.,h*${f(PH*3)}+uT*22.,2.))*.4;
   float core=pow(fr,2.);float edge=pow(1.-fr,3.);
   gl_FragColor=vec4(mix(uC2,uC1,core+st*.4)*1.5+vec3(1.)*core*core*.8,(core*(.45+.6*st)+edge*.35)*smoothstep(1.,.55,h)*uA);}`));
  const pcore=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24,1,true).translate(0,0.5,0),fx(`void main(){float h=vUv.y;
   float fr=pow(abs(dot(normalize(vN),normalize(vV))),3.);float n=noise(vec3(vUv.x*20.,h*40.+uT*30.,1.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.75)*1.8,fr*(.6+.4*n)*smoothstep(1.,.5,h)*uA);}`));
  // cabeza del pilar mientras cae
  const head=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float r=length(p);
   float c=pow(max(0.,1.-r),3.);float s=smoothstep(.04,0.,min(q.x,q.y)*(1.+4.*max(q.x,q.y)))*smoothstep(1.,0.,max(q.x,q.y));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.7,(c+s*.8)*uA);}`,{depthTest:false}));
  // destello anamórfico: raya horizontal larga (lens flare) con hilo fino y núcleo
  const flare=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=(vUv-.5)*2.;float y=abs(p.y);float x=abs(p.x);
   float streak=exp(-y*7.)*pow(1.-x,1.5);float thin=exp(-y*40.)*pow(1.-x,.6);float core=exp(-length(p*vec2(5.,1.))*3.);
   vec3 c=mix(uC1,vec3(.85,.9,1.),.5)*1.8;
   gl_FragColor=vec4(c*(streak+thin)+vec3(1.)*core,(streak*.8+thin+core)*uA);}`,{depthTest:false}));
  L.trail.add(pillar,pcore); L.mesh.add(head,flare);
  // muro de choque dorado (cilindro bajo que se expande)
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1.05,0.6,64,1,true).translate(0,0.3,0),fx(`void main(){float h=vUv.y;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float n=noise(vec3(vUv.x*40.,h*3.-uT*4.,0.));
   gl_FragColor=vec4(${GOLD}*1.6,smoothstep(1.,0.,h)*(.4+.6*n)*(.3+.7*fr)*uA);}`));
  wall.position.set(AP.x,0,AP.z); L.mesh.add(wall);
  // aura de despertar sobre el aliado ya agrandado
  const aura=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.56,2.0,40,10,true),fx(`void main(){float h=vP.y/2.+.5;
   vec3 q=vec3(vP.x*2.6,vP.y*1.6-uT*2.6,vP.z*2.6);float n=noise(q)*.6+noise(q*2.2)*.4;
   float fl=smoothstep(.0,.3,n-h*.9+.3);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float sp=step(.93,noise(vec3(vP*14.)+vec3(0.,-uT*3.,0.)));
   gl_FragColor=vec4(mix(uC2,uC1,fl)*1.4+vec3(1.)*sp,(fl*(.25+.6*fr)+sp*.6)*uA);}`));
  L.mesh.add(aura);
  // suelo: glifo de ingravidez, onda dorada y fractura de baldosa (nivel 3)
  const glyph=groundPlane(2.4,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.02)+band(r,.74,.012)+band(r,.82,.04)*step(.7,fract(an/6.2832*12.-uT*.3));
   for(int i=0;i<5;i++){float a=float(i)*1.2566+uT*.4;m+=smoothstep(.05,0.,length(p*2.-vec2(cos(a),sin(a))*.6))*1.2;}
   float shadow=smoothstep(.6,0.,r)*.18;
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,(m*uP+shadow)*uA);}`));
  const gshock=groundPlane(9,AP.x,0.035,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=.05*(1.-uP)+.012;
   float a=band(r,uP*.95,w)+band(r,uP*.95-.05,w*2.)*.4;a*=.7+.3*noise(vec3(atan(p.y,p.x)*8.,r*10.,uT));
   gl_FragColor=vec4(${GOLD}*1.7+vec3(1.)*a*.2,a*uA);}`));
  const FS=6, frac=groundPlane(FS,AP.x,0.025,fx(tileFractureFS(FS)));
  glyph.position.z=gshock.position.z=frac.position.z=AP.z;
  L.decal.add(glyph,gshock,frac);
  const C=`const float TP=${f(TP)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 AP=${v3(AP)};
  float baseY(float t){float k=clamp((t-TP)/(TI-TP),0.,1.);return t<TI?${f(Y0)}*(1.-k*k):0.;}`;
  // motas en ingravidez que suben girando y salen despedidas al aterrizar
  a.count+=points(L.part,160,C+`void main(){float an=aSeed.x*6.2832+uT*(.4+.4*aSeed.y);float rad=.5+aSeed.z*.9;
   float rise=min(uT,TI)*(.25+.5*aSeed.y);vec3 p=AP+vec3(cos(an)*rad,.05+aSeed.w*.3+rise+.08*sin(uT*3.+aSeed.x*20.),sin(an)*rad);
   float t=max(uT-TI,0.);p+=normalize(vec3(cos(an),.6,sin(an)))*4.*t*(1.-.4*min(t,1.));
   vA=smoothstep(.05,.3,uT)*(1.-smoothstep(0.,.45,t))*(.6+.4*sin(uT*7.+aSeed.z*30.));put(p,.03+.04*aSeed.y);}`);
  // polvo estelar que cae dentro del pilar (solo por debajo de la cabeza)
  a.count+=points(L.part,200,C+`void main(){float life=.3+aSeed.y*.2;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float s0=TP+(c-aSeed.x)*life;float an=r.x*6.2832;float rad=sqrt(r.y)*.8;
   vec3 p=AP+vec3(cos(an)*rad,mix(10.,.05,age),sin(an)*rad);
   vA=(k>=1.&&s0<TD&&p.y>baseY(uT))?.8*(1.-smoothstep(TD-.3,TD+.2,uT)):0.;put(p,.08+.06*r.z);}`,DROP_FS);
  // esquirlas doradas del aterrizaje
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),.5+aSeed.w*1.2,sin(an))*(2.+3.*aSeed.y);
   vec3 p=AP+vec3(0.,.1,0.)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,GCHIP_FS);
  a.count+=sparks(L.part,300,TI,`${f(AP.x)},${f(0.8)},${f(AP.z)}`,"0.,.6,0.",4,12,3.5);
  // polvo dorado que cabalga el frente de la onda
  a.count+=points(L.part,120,C+`void main(){float an=aSeed.x*6.2832;float s=TI+aSeed.y*.1;float t=max(uT-s,0.);
   float R=4.2*(1.-pow(1.-clamp(t/.7,0.,1.),2.));vec3 p=AP+vec3(cos(an)*R,.05+t*(.4+.6*aSeed.z),sin(an)*R);
   float age=t/(.7+.3*aSeed.w);vA=(uT>s&&age<1.)?(1.-age)*.8:0.;put(p,(.12+.12*aSeed.z)*(.6+age));}`,GDUST_FS);
  // estrellas del despertar que suben en espiral alrededor del aliado
  a.count+=points(L.part,150,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;float rad=.45+r.y*.35;vec3 p=AP+vec3(cos(an)*rad,.1+age*(2.+r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.07+.08*r.z)*sin(age*3.14159));}`,STAR4_FS);
  const hp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, lev=ss(0.08,TL,te), awake=ss(TI,TI+0.2,te)*(1-ss(TE-0.5,TE,te));
    // levitación en ingravidez y caída al aterrizar
    let y;
    if(te<1.2)y=(LIFT+0.035*Math.sin(te*5))*lev;
    else if(te<TI){const k=(te-1.2)/(TI-1.2);y=(LIFT+0.035*Math.sin(6))*(1-k*k);}
    else y=0;
    const d=allies[0]; d.position.y=y; d.rotation.z=te<TI?0.06*Math.sin(te*2.3)*lev:0;
    const base=1+0.1*ss(TI,TI+0.3,te), wob=ia>=0?0.07*Math.exp(-ia*6)*Math.sin(ia*22):0;
    d.scale.set(base+wob*0.6,base-wob,base+wob*0.6);
    const dm=d.userData.m; dm.emissive.copy(U.uC1.value);
    dm.emissiveIntensity=0.35*lev*(te<TI?1:0)+(ia>=0?1.2*Math.exp(-ia*5):0)+0.3*awake*(0.7+0.3*Math.sin(te*6));
    // pilar que cae, se ensancha con el impacto y se adelgaza
    const k=cl((te-TP)/(TI-TP)), by=te<TI?Y0*(1-k*k):0, pon=ss(TP,TP+0.08,te)*(1-ss(TD-0.2,TD+0.4,te));
    const rad=Math.max((0.75+0.35*(ia>=0?Math.exp(-ia*5):0))*(1-ss(TI+0.4,TD+0.35,te)),0.001);
    for(const m of [pillar,pcore]){m.visible=pon>0.001;m.position.set(AP.x,by,AP.z);}
    pillar.scale.set(rad,PH,rad); pcore.scale.set(rad*0.4,PH,rad*0.4);
    pillar.material.uniforms.uA.value=pon; pcore.material.uniforms.uA.value=pon;
    towardCam(head.position,hp.set(AP.x,by+0.2,AP.z),0.5); billboard(head); head.visible=te>=TP&&te<TI+0.05;
    head.scale.setScalar(0.8+0.4*k); head.material.uniforms.uA.value=ss(TP,TP+0.08,te);
    // destello anamórfico
    let p=cl(ia/0.75); towardCam(flare.position,hp.set(AP.x,0.75,AP.z),0.8); billboard(flare); flare.visible=ia>=0&&p<1;
    flare.scale.set(6+6*p,0.55*(1-0.6*p),1); flare.material.uniforms.uA.value=Math.pow(1-p,1.5);
    // onda dorada, muro de choque y fractura
    p=cl(ia/0.7); set(gshock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    wall.visible=ia>=0&&p<1; const wr=0.5+3.8*(1-Math.pow(1-p,2)); wall.scale.set(wr,1-0.5*p,wr); wall.material.uniforms.uA.value=0.85*(1-p);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.2,TE,te):0);
    set(glyph,lev,ss(0.05,0.4,te)*(1-ss(TI,TI+0.25,te)));
    aura.visible=awake>0.001; aura.position.set(AP.x,1.0*base,AP.z); aura.scale.setScalar(base); set(aura,0.3,awake*0.75);
    U.uE.value=awake;
    caster.rotation.z=-0.12*ss(0,0.4,te)+0.12*ss(TI,TI+0.4,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.3,te)*(1-ss(TI,TI+0.4,te));
    o.dark=0.5*ss(0.3,TP,te)*(1-ss(TI+0.3,TD,te));
    o.white=ia>=0&&ia<0.2?0.55*Math.exp(-ia*22):0;
    o.ld=12;
    if(te<TP){o.g.set(AP.x,1+y,AP.z);o.gs=1+0.6*lev;o.ga=0.25*lev;o.li=2.5*lev;}
    else if(te<TI){o.g.set(AP.x,Math.min(by,6),AP.z);o.gs=2.4;o.ga=0.5;o.li=6;}
    else{o.g.copy(AC);o.gs=2.2+5*Math.min(ia,0.6);o.ga=Math.exp(-ia*7)*0.95+0.12*awake;o.li=14*Math.exp(-ia*3)+3*awake;}
    o.ia=ia;o.c.set(AP.x,0.8,AP.z);o.shake=1.6;o.dist=1.2;o.flash=0;
  };
}};

VFX.module("Sapidae · Susurrador",[astral,balsam,attune,howl,bond,chim]);
})();

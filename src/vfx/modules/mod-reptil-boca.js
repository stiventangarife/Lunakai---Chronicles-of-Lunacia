// =====================================================================
// MÓDULO · CLASE REPTIL (BOCA)
// Estética reptil: ácido fosforescente, sombra venenosa, sangre fría, piedra y maldiciones espectrales. Todas cuestan
// 2 PA (nivel 2: firmes y estándar, sin fractura de suelo ni temblor). No se dibuja la boca del Axie: las mordidas son
// fauces de energía temporales sobre el objetivo; lo que "sale de la boca" arranca en ≈ (−3.42, 1.52).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,CROSS_FS,helixGeo,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube}=VFX.lib;

const MO=V3(-3.42,1.52,0.05);                               // boca del lanzador (punto de salida, sin malla)
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const FR=`(1.-abs(dot(normalize(vN),normalize(vV))))`;
const setM=(m,p,a)=>{m.uniforms.uP.value=p;m.uniforms.uA.value=a;};
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
// par de fauces en billboard: arriba (uQ=1) y abajo (uQ=−1); gap = separación extra sobre el cierre
function jawPair(L,w,h,mats){const up=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mats[0]),dn=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mats[1]);L.add(up,dn);return [up,dn];}
function placeJaws(J,c,h,gap,dx,ang,d){const [up,dn]=J;
  towardCam(up.position,tmp.set(c.x+dx,c.y+h*0.42+gap,c.z),d); towardCam(dn.position,tmp.set(c.x-dx,c.y-h*0.42-gap,c.z),d);
  billboard(up,ang); billboard(dn,ang);}
const SOFT_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;

// =====================================================================
// 1 · CHEMICAL FANG — fauces espectrales de ácido fosforescente gotean sobre el rival y muerden; el ácido le corroe
//     el cuerpo (picaduras burbujeantes) y apaga, una a una, las chispas doradas de su energía
// =====================================================================
const chem={key:"rbChemicalFang",name:"Chemical Fang",pa:2,dur:2.0,ti:0.62,pal:"Ácido",
  phases:[["Fauces",0],["Goteo",0.18],["Mordida",0.62],["Corrosión",0.8],["Disolución",1.3],["Fin",1.7]],
build(a){
  const L=a.L,TO=0.18,TI=0.62,TH=0.95,TF=1.7,JC=V3(3.2,1.25,0),JW=1.7,JH=0.85;
  const FANG=`uniform float uQ;uniform float uD;
  void main(){vec2 p=vUv;float y=uQ>0.?1.-p.y:p.y;float x=p.x;if(noise(vec3(p*9.,2.))<uD)discard;
   float side=smoothstep(0.,.1,x)*smoothstep(1.,.9,x);float tooth=1.-abs(fract(x*7.)-.5)*2.;
   float can=clamp(max(1.-abs(x-.25)/.08,1.-abs(x-.75)/.08),0.,1.);
   float len=.16+max(tooth*.26,can*.64)*side;
   float m=smoothstep(len,len-.03,y)*side;float edge=band(y,len,.025)*m;float gum=band(y,.15,.03)*side;
   float n=noise(vec3(x*22.,y*18.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,edge+gum+n*.3)*1.7+vec3(1.)*edge*.3,(m*(.25+.3*n)+edge*1.1+gum*.8)*uA);}`;
  const J=jawPair(L.mesh,JW,JH,[fxU(FANG,{uQ:{value:1},uD:{value:0}},{depthTest:false}),fxU(FANG,{uQ:{value:-1},uD:{value:0}},{depthTest:false})]);
  // corrosión: picaduras celulares que burbujean y se extienden desde la mordida (cuerpo + cabeza)
  const COR=`uniform vec3 uH;
  void main(){float d=length(vP-uH);vec3 q=vP*9.;vec3 id=floor(q),fp=fract(q);float md=1.;
   for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){vec3 o=vec3(float(i),float(j),float(k));
    vec3 h=vec3(hash(id+o),hash(id+o+7.1),hash(id+o+3.3));md=min(md,length(o+h-fp));}
   float pit=smoothstep(.36,.1,md);float m=smoothstep(uP*1.8,uP*1.8-.3,d);float bub=.55+.45*sin(uT*10.+md*20.);
   gl_FragColor=vec4(mix(uC2,uC1,pit)*1.6,(pit*bub*.9+band(md,.42,.05)*.25)*m*uA);}`;
  const cBody=new THREE.Mesh(new THREE.CylinderGeometry(0.355,0.435,1.27,28,6,true),fxU(COR,{uH:{value:V3(-0.3,0.6,0.2)}}));
  const cHead=new THREE.Mesh(new THREE.SphereGeometry(0.283,24,16),fxU(COR,{uH:{value:V3(-0.25,-0.35,0.2)}}));
  cBody.position.set(3.4,0.625,0); cHead.position.set(3.4,1.6,0); L.mesh.add(cBody,cHead);

  const C=`const float TO=${f(TO)};const float TI=${f(TI)};const float TH=${f(TH)};const vec3 JC=${v3(JC)};varying float vK;`;
  // goteo de ácido desde los colmillos largos antes de morder
  a.count+=points(L.part,50,C+`void main(){float s=TO+aSeed.x*(TI-TO-.05);float t=uT-s;float c=max(t,0.);vK=0.;
   float sx=step(.5,aSeed.z)*2.-1.;vec3 p=JC+vec3(sx*.42+(aSeed.w-.5)*.05,.5-.3*c-4.5*c*c,.1);p.y=max(p.y,.02);
   vA=(t>0.&&t<.55)?smoothstep(0.,.05,t)*(1.-smoothstep(.4,.55,t)):0.;put(p,(.07+.04*aSeed.y)*(t<.05?.6:1.));}`,BUBBLE_FS);
  // mordida: salpicadura ácida y chispas
  a.count+=sparks(L.part,80,TI,`${f(JC.x)},${f(JC.y)},.3`,"0.,.3,.8",2.2,6.5,3);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float t=uT-s;float c=max(t,0.);vK=0.;
   vec3 v=normalize(rnd()+vec3(-.2,.3,.6))*(1.3+1.8*aSeed.y);vec3 p=JC+v*c+vec3(0.,-4.5*c*c,0.);p.y=max(p.y,.02);
   vA=(t>0.&&t<.9)?1.-smoothstep(.5,.9,t):0.;put(p,.06+.06*aSeed.w);}`);
  // energía del rival: chispas doradas que orbitan; el ácido las alcanza, se vuelven verdes y se apagan
  a.count+=points(L.part,22,C+`void main(){float s=TI+.12+aSeed.x*.7;float an=aSeed.z*6.2832+uT*1.6;float rad=.62+.1*aSeed.w;
   vec3 p=vec3(3.4+cos(an)*rad,.45+aSeed.y*1.35+.05*sin(uT*3.+aSeed.x*9.),sin(an)*rad);
   vK=smoothstep(s,s+.12,uT);float gone=smoothstep(s+.12,s+.35,uT);
   vA=smoothstep(.05,.3,uT)*(1.-gone);put(p,(.09+.05*aSeed.w)*(1.+.8*vK*(1.-gone)));}`,HEAD+`varying float vA;varying float vMix;varying float vK;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(1.,.8,.32),uC1,vK)*1.5+vec3(1.)*smoothstep(.2,0.,d)*.5*(1.-vK),a);}`);
  a.count+=points(L.part,30,C+`void main(){float s=TI+.24+aSeed.x*.7;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vK=0.;
   float an=aSeed.z*6.2832+s*1.6;vec3 p=vec3(3.4+cos(an)*.65,.45+aSeed.w*1.35+.5*t,sin(an)*.65);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.5:0.;put(p,(.16+.1*aSeed.y)*(.6+age));}`,SMOKE_FS("vec3(.35,.42,.25)"),NB);
  // vapor que sube del cuerpo corroído
  a.count+=points(L.part,40,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vK=0.;
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.42,.2+r.y*1.6+age*.6,sin(an)*.42);
   vA=(k>=1.)?sin(age*3.14159)*.6*uE:0.;put(p,.05+.06*r.z);}`);
  a.count+=points(L.part,36,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vK=0.;
   float an=r.x*6.2832;float rd=sqrt(r.y)*.75;vec3 p=vec3(3.4+cos(an)*rd,.03+age*.12,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.05*r.z);}`,BUBBLE_FS);
  // suelo: charco de ácido que chisporrotea bajo el rival
  const puddle=groundPlane(1.9,3.4,0.016,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,uT*.5))*.6+noise(vec3(p*15.,1.))*.4;
   float m=smoothstep(uP,uP-.2,r+(n-.5)*.3);float fz=pow(noise(vec3(p*25.,uT*3.)),3.);
   gl_FragColor=vec4(mix(uC2,uC1,n+fz)*1.3,m*(.25+.35*fz+band(r+(n-.5)*.3,uP-.05,.05))*uA);}`));
  const shock=groundPlane(3,3.4,0.03,fx(RING_FS));
  L.decal.add(puddle,shock);

  a.pose=function(te,o){
    const ia=te-TI, ap=ss(0.02,TO,te), dis=ss(TH,TH+0.35,te), env=ss(TI,TI+0.2,te)*(1-ss(TF,a.dur,te));
    // fauces: aparecen, se abren al máximo, cierran de golpe con rebote y se disuelven
    const gap=te<TI?0.15+0.3*ss(TO,TI-0.08,te)-0.5*ss(TI-0.06,TI,te):-0.05*Math.exp(-ia*14)*Math.cos(ia*30)+0.25*ss(TH,TH+0.3,te);
    placeJaws(J,JC,JH,gap*JH,0,0,0.65);
    for(const m of J){m.visible=ap>0.001&&dis<0.999;m.scale.setScalar(0.8+0.2*ap);m.material.uniforms.uA.value=ap*(0.8+(ia>=0?0.6*Math.exp(-ia*6):0));m.material.uniforms.uD.value=dis;}
    for(const m of [cBody,cHead]){set(m,ss(TI,TF-0.2,te),env*0.9);m.visible=env>0.001;}
    U.uE.value=env;
    set(puddle,0.2+0.8*ss(TI,TI+0.6,te),ia>=0?ss(0,0.15,ia)*(1-ss(TF,a.dur,te)):0);
    const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    caster.rotation.z=0.12*ss(0,0.2,te)-0.2*ss(TI-0.08,TI,te)*(1-ss(TI+0.1,TI+0.5,te));
    const hit=hitK(ia,8); target.position.x=3.4+0.12*hit; target.rotation.z=-0.15*hit*Math.cos(ia*18)+0.02*env*Math.sin(te*13);
    target.scale.set(1+0.04*hit,1-0.08*hit,1+0.04*hit);
    o.em=0.25*env; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(JC);o.gs=0.9+0.3*ap;o.ga=0.2*ap;o.li=1.5*ap;}
    else{o.g.copy(JC);o.gs=1.2+2.2*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.65+0.08*env;o.li=6*Math.exp(-ia*5)+1.2*env;}
    o.ia=ia;o.c.copy(JC);o.shake=0;o.dist=0.6;o.flash=1;
  };
}};

// =====================================================================
// 2 · KOTARO — el lanzador se funde en su sombra, cruza el suelo y muerde desde la sombra de cada rival (dos golpes
//     ultrarrápidos); de los heridos fluye su energía violeta a ras de suelo hasta el lanzador, que reaparece encendido
// =====================================================================
const kotaro={key:"rbKotaro",name:"Kotaro",pa:2,dur:2.3,ti:0.6,pal:"Miasma",enemies:1,
  phases:[["Sombra",0],["Acecho",0.18],["Mordida 1",0.6],["Mordida 2",0.98],["Robo",1.12],["Regreso",1.5]],
build(a){
  const L=a.L,TM=0.18,TB=[0.6,0.98],TR=1.12,TE=1.5,TU=1.7,P0=V3(-3.7,0,0),VS=[V3(3.4,0,0),ENEMY_POS[0].clone()];
  const VC=VS.map(v=>V3(v.x-0.1,1.15,v.z+0.2));
  // trayecto de la sombra (tiempo → punto en el suelo)
  const KS=[[TM,P0],[0.5,VS[0]],[0.62,VS[0]],[0.88,VS[1]],[1.0,VS[1]],[TE,P0]];
  const blob=(te,o)=>{if(te<=KS[0][0])return o.copy(P0);for(let i=1;i<KS.length;i++)if(te<KS[i][0]){const k=ss(KS[i-1][0],KS[i][0],te);return o.lerpVectors(KS[i-1][1],KS[i][1],k);}return o.copy(P0);};
  // fauces de sombra: silueta oscura (mezcla normal) + dientes y borde violeta (aditivo)
  const JAW=`uniform float uQ;
  float jm(vec2 p){float y=uQ>0.?1.-p.y:p.y;float x=p.x;float arc=.34*(1.-pow(2.*x-1.,2.));
   float tooth=1.-abs(fract(x*9.)-.5)*2.;float side=smoothstep(.04,.16,x)*smoothstep(.96,.84,x);
   return arc+tooth*.3*side-y;}`;
  const mk=(q,g)=>fxU(JAW+(g?`void main(){float d=jm(vUv);float y=uQ>0.?1.-vUv.y:vUv.y;float rim=band(d,0.,.03);float tip=rim*step(.3,y);
   float n=noise(vec3(vUv*10.,uT*4.));gl_FragColor=vec4(mix(uC2,uC1,tip+n*.3)*1.7+vec3(1.)*tip*.4,(rim*.9+tip)*uA);}`:
   `void main(){float d=jm(vUv);gl_FragColor=vec4(vec3(.05,.01,.08),smoothstep(-.02,.02,d)*.85*uA);}`),{uQ:{value:q}},g?{depthTest:false}:Object.assign({depthTest:false},NB));
  const jaws=VS.map(()=>({d:jawPair(L.mesh,1.4,0.8,[mk(1,0),mk(-1,0)]),g:jawPair(L.mesh,1.4,0.8,[mk(1,1),mk(-1,1)])}));
  for(const j of jaws)for(const m of j.g)m.renderOrder=1;
  // sombra viajera bajo el lanzador fundido
  const shadow=groundPlane(1.5,0,0.014,fx(`void main(){vec2 p=(vUv-.5)*2.;float n=noise(vec3(p*3.,uT*2.));float d=length(p)+(n-.5)*.35;
   gl_FragColor=vec4(vec3(.04,.01,.07),smoothstep(1.,.3,d)*.8*uA);}`,NB));
  const rim=groundPlane(1.5,0,0.018,fx(`void main(){vec2 p=(vUv-.5)*2.;float n=noise(vec3(p*3.,uT*2.));float d=length(p)+(n-.5)*.35;
   float sw=pow(noise(vec3(atan(p.y,p.x)*3.,d*4.-uT*5.,1.)),2.);gl_FragColor=vec4(mix(uC2,uC1,sw)*1.4,band(d,.75,.12)*(.4+.8*sw)*uA);}`));
  const rise=groundPlane(2.6,P0.x,0.03,fx(RING_FS));
  const bites=VS.map(v=>{const m=groundPlane(2.4,v.x,0.03,fx(RING_FS));m.position.z=v.z;return m;});
  L.decal.add(shadow,rim,rise,...bites);

  const C=`const float TM=${f(TM)};const float TR=${f(TR)};const float TE=${f(TE)};const vec3 P0=${v3(P0)};
  const vec3 V0=${v3(VS[0])};const vec3 V1=${v3(VS[1])};
  vec3 bl(float t){if(t<TM)return P0;if(t<.5)return mix(P0,V0,smoothstep(TM,.5,t));if(t<.62)return V0;if(t<.88)return mix(V0,V1,smoothstep(.62,.88,t));
   if(t<1.)return V1;return mix(V1,P0,smoothstep(1.,TE,t));}`;
  // humo de sombra y motas violetas que deja la sombra al moverse
  a.count+=points(L.part,90,C+`void main(){float s=TM+aSeed.x*(TE-TM);float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bl(s)+vec3(r.x*.35,.05+.25*aSeed.z+.35*t,r.z*.35);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.75:0.;put(p,(.26+.2*aSeed.w)*(.7+age*.6));}`,SMOKE_FS("vec3(.08,.03,.12)"),NB);
  a.count+=points(L.part,60,C+`void main(){float s=TM+aSeed.x*(TE-TM);float life=.3+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bl(s)+vec3(r.x*.4,.05+.9*t,r.z*.4);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.03+.03*aSeed.w);}`);
  // mordidas: chispas venenosas y burbujas que gotean
  TB.forEach((t,i)=>{a.count+=sparks(L.part,60,t,`${f(VC[i].x)},${f(VC[i].y)},${f(VC[i].z+0.2)}`,"0.,.4,.8",2,6,3);
    a.count+=points(L.part,20,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-${f(t)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     vec3 p=${v3(VC[i])}+vec3((r.x-.5)*.3,-.1-age*.9,.25);
     vA=(k>=1.&&uT<${f(t+1.1)})?sin(age*3.14159):0.;put(p,.05+.04*r.z);}`,BUBBLE_FS);});
  // robo: energía que fluye a ras de suelo desde los heridos hasta el lanzador (flujo continuo)
  a.count+=points(L.part,140,C+`void main(){float s=TR+aSeed.x*(TE-TR+.1);float k=clamp((uT-s)/.45,0.,1.);
   vec3 v=aSeed.z<.5?vec3(${f(VC[0].x)},.9,${f(VC[0].z)}):vec3(${f(VC[1].x)},.9,${f(VC[1].z)});vec3 e=P0+vec3(0.,.55,0.);
   vec3 m=mix(v,e,.5)+vec3(0.,-.75,(aSeed.y-.5)*.8);vec3 p=mix(mix(v,m,k),mix(m,e,k),k)+vec3(0.,sin(k*14.+aSeed.w*6.)*.05,0.);
   vA=(uT>s&&k<1.)?smoothstep(0.,.1,k)*(1.-smoothstep(.9,1.,k)):0.;put(p,.04+.04*aSeed.w);}`);
  // regreso: el lanzador reaparece y la energía robada sube por él
  a.count+=points(L.part,40,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TE)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=P0+vec3(cos(an)*.5,.1+age*1.7,sin(an)*.5);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.04+.04*r.z);}`);

  const bp=V3(0,0,0);
  a.pose=function(te,o){
    const melt=ss(0,TM,te), back=ss(TE,TU,te), hid=te>=TM&&te<TE;
    blob(te,bp);
    caster.visible=!hid; caster.position.x=P0.x;
    const ov=te>=TE?0.08*Math.sin((te-TE)*18)*Math.exp(-(te-TE)*5):0;
    caster.scale.set(1+0.25*melt*(1-back),te<TE?Math.max(1-0.95*melt,0.05):0.05+0.95*back+ov,1+0.25*melt*(1-back));
    const env=ss(TE,TE+0.1,te)*(1-ss(2.0,a.dur,te));
    glowOf(caster,U.uC1.value,0.3*melt*(te<TE?1:0)+0.5*env*(0.7+0.3*Math.sin(te*9)));
    shadow.position.set(bp.x,0.014,bp.z); rim.position.set(bp.x,0.018,bp.z);
    const sa=ss(0,TM,te)*(1-ss(TE+0.05,TU,te)); shadow.material.uniforms.uA.value=sa; rim.material.uniforms.uA.value=sa*0.8;
    shadow.scale.setScalar(1+0.3*(te>=TM&&te<TE?1:0)); rim.scale.copy(shadow.scale);
    // fauces: brotan de la sombra bajo cada rival, se abren y cierran de golpe
    jaws.forEach((j,i)=>{const t=TB[i],ib=te-t,op=ss(t-0.14,t-0.04,te),on=te>=t-0.14&&ib<0.35;
      const gap=ib<0?0.32*op*ss(t-0.14,t-0.06,te)-0.32*ss(t-0.04,t,te):-0.04*Math.exp(-ib*14)+0.3*ss(0.15,0.35,ib);
      const c=tmp2.set(VC[i].x,VC[i].y-0.5*(1-ss(t-0.14,t-0.05,te)),VC[i].z);
      for(const J of [j.d,j.g]){placeJaws(J,c,0.8,gap*0.8,0,0,0.75);for(const m of J){m.visible=on;m.material.uniforms.uA.value=ss(t-0.14,t-0.1,te)*(1-ss(0.18,0.35,ib));}}
      const p=cl(ib/0.45); set(bites[i],1-Math.pow(1-p,2),ib>=0?(1-p)*0.7:0);});
    const p=cl((te-TE)/0.5); set(rise,1-Math.pow(1-p,2),te>=TE?(1-p)*0.7:0);
    U.uE.value=env;
    // rivales: retroceso; el segundo destella a mano (el motor solo hace destellar al objetivo)
    const h0=hitK(te-TB[0],8), h1=hitK(te-TB[1],8), drain=ss(TR,TR+0.2,te)*(1-ss(TE,TU,te));
    target.position.x=3.4+0.14*h0; target.rotation.z=-0.16*h0*Math.cos((te-TB[0])*18);
    const e0=enemies[0]; e0.position.x=ENEMY_POS[0].x+0.12*h1; e0.rotation.z=-0.15*h1*Math.cos((te-TB[1])*18);
    glowOf(e0,U.uC1.value,1.2*h1+0.3*drain); o.em=0.3*drain; o.emc.copy(U.uC1.value);
    if(te<TM){o.g.set(P0.x,0.6,0);o.gs=0.8*melt;o.ga=0.2*melt;o.li=1.5*melt;}
    else if(te<TB[0]){o.g.set(bp.x,0.4,bp.z);o.gs=0.9;o.ga=0.25;o.li=2;}
    else if(te<TB[1]){const i0=te-TB[0];o.g.copy(VC[0]);o.gs=1.2+2*Math.min(i0,0.4);o.ga=Math.exp(-i0*10)*0.6;o.li=5*Math.exp(-i0*5)+1;}
    else if(te<TE){const i1=te-TB[1];o.g.copy(VC[1]);o.gs=1.2+2*Math.min(i1,0.4);o.ga=Math.exp(-i1*10)*0.6+0.1*drain;o.li=5*Math.exp(-i1*5)+1.5*drain;}
    else{const ie=te-TE;o.g.set(P0.x,1.0,0);o.gs=1.4+1.2*Math.min(ie,0.5);o.ga=Math.exp(-ie*6)*0.5+0.1*env;o.li=4*Math.exp(-ie*4)+1.5*env;}
    if(te<TB[1]){o.ia=te-TB[0];o.c.copy(VC[0]);o.flash=1;}else{o.ia=te-TB[1];o.c.copy(VC[1]);o.flash=0;}
    o.shake=0;o.dist=0.5;
  };
}};

// =====================================================================
// 3 · RAZOR BITE — fauces de dientes de sierra muerden y rechinan de lado a lado desgarrando; quedan tres desgarros
//     que sangran (rojo) y supuran veneno (verde); un hilo de sangre fluye en arco hasta el lanzador y lo cura
// =====================================================================
const razor={key:"rbRazorBite",name:"Razor Bite",pa:2,dur:2.2,ti:0.6,pal:"Carmesí",
  phases:[["Sierra",0],["Mordida",0.6],["Desgarro",0.68],["Heridas",0.95],["Sangre",1.05],["Fin",1.8]],
build(a){
  const L=a.L,TI=0.6,TG=0.95,TS=1.05,TA=1.35,TF=1.8,JC=V3(3.2,1.2,0),JW=1.8,JH=0.8,GR=[0.62,0.74,0.86];
  const POI="vec3(.45,1.,.3)";                                 // verde de veneno (semántico)
  const SAW=`uniform float uQ;uniform float uD;
  void main(){vec2 p=vUv;float y=uQ>0.?1.-p.y:p.y;float x=p.x;if(noise(vec3(p*10.,4.))<uD)discard;
   float side=smoothstep(0.,.06,x)*smoothstep(1.,.94,x);float cell=fract(x*16.);float saw=pow(1.-cell,1.6);
   float len=.2+saw*.3*side;float m=smoothstep(len,len-.025,y)*side;
   float edge=band(y,len,.02)*m;float back=smoothstep(.2,.1,y)*side;
   float st=.6+.4*sin(x*70.+y*30.);
   gl_FragColor=vec4(mix(vec3(.55,.5,.55),uC1,.4+.4*edge)*st*1.2+uC2*back*.6+vec3(1.)*edge*.5,(m*.55+edge+back*.3)*uA);}`;
  const J=jawPair(L.mesh,JW,JH,[fxU(SAW,{uQ:{value:1},uD:{value:0}},{depthTest:false}),fxU(SAW,{uQ:{value:-1},uD:{value:0}},{depthTest:false})]);
  // desgarros: tres tajos dentados en diagonal; 0 y 2 sangran, el central supura veneno
  const tears=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(`void main(){vec2 p=(vUv-.5)*2.;float tot=0.;vec3 col=vec3(0.);
   for(int i=0;i<3;i++){float fi=float(i);vec2 q=p-vec2((fi-1.)*.38,0.);float c=cos(.5),s=sin(.5);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
    float u=q.y*.65+.5;float jag=abs(fract(u*14.)-.5)*.05;float w=(.02+.035*sin(3.14159*clamp(u,0.,1.)))*step(0.,u)*step(u,1.);
    float l=smoothstep(w+jag,jag*.3,abs(q.x))*step(u,uP);vec3 cc=i==1?${POI}:mix(uC2,uC1,.5);
    tot+=l;col+=cc*l;}
   float n=noise(vec3(p*8.,uT*2.));gl_FragColor=vec4(col*(1.3+.4*n),min(tot,1.)*uA);}`,{depthTest:false}));
  L.mesh.add(tears);
  // hilo de sangre en arco del rival al lanzador: pulsos que corren hacia el lanzador
  const A0=V3(3.0,1.2,0.25),B0=V3(-0.2,2.7,0.7),C0=V3(-3.45,1.15,0.1);
  const thread=new THREE.Mesh(pathTube((u,o)=>qb(A0,B0,C0,u,o),30,70,8,0.055,0.03),fx(`void main(){float u=vUv.x;if(u>uP)discard;
   float pul=pow(.5+.5*sin(u*30.-uT*18.),4.);float fr=pow(${FR},1.2);float head=smoothstep(.05,0.,uP-u)*step(uP,.995);
   gl_FragColor=vec4(mix(uC2,uC1,pul)*1.5+vec3(1.)*head*.6,(.35+.65*pul)*(.6+.4*fr)*uA+head);}`));
  L.trail.add(thread);

  const C=`const float TI=${f(TI)};const float TS=${f(TS)};const float TA=${f(TA)};const vec3 JC=${v3(JC)};
  const vec3 A0=${v3(A0)};const vec3 B0=${v3(B0)};const vec3 C0=${v3(C0)};
  vec3 qb(float t){float u=1.-t;return u*u*A0+2.*u*t*B0+t*t*C0;}`;
  const DROP=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));float a=smoothstep(.34,.28,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(vec3(.32,0.,.02)+uC2*.25*vMix+vec3(1.,.6,.6)*smoothstep(.08,0.,length(q-vec2(-.08,0.)))*.6,a);}`;
  // rechinar: tres ráfagas de chispas de la sierra
  GR.forEach((t,i)=>{a.count+=sparks(L.part,40,t,`${f(JC.x)},${f(JC.y)},.35`,i%2?"-.9,.2,.5":".9,.2,.5",2,5.5,3);});
  // sangre a borbotones (mezcla normal) y goteo de las heridas
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.4,.7))*(1.2+1.6*aSeed.y);vec3 p=JC+v*c+vec3(0.,-5.*c*c,0.);p.y=max(p.y,.02);
   vA=(t>0.&&t<.8)?1.-smoothstep(.5,.8,t):0.;put(p,.07+.06*aSeed.w);}`,DROP,NB);
  a.count+=points(L.part,36,C+`void main(){float life=.7+aSeed.y*.3;float k=(uT-${f(TG)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float i=floor(r.x*2.999);float x=i<.5?-.38:(i<1.5?.38:-.0);vec3 p=JC+vec3(x+(r.y-.5)*.2,-.2*r.z-age*.9,.38);
   vA=(k>=1.)?smoothstep(0.,.1,age)*(1.-age)*uE:0.;put(p,.06+.03*r.z);}`,DROP,NB);
  // veneno que supura del desgarro central
  a.count+=points(L.part,30,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-${f(TG)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=JC+vec3((r.x-.5)*.3,(r.y-.5)*.6+age*.35,.4);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.05*r.z);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float ring=smoothstep(.07,0.,abs(d-.36))+smoothstep(.5,0.,d)*.15;
   float a=ring*vA;if(a<.003)discard;gl_FragColor=vec4(${POI}*1.4,a);}`);
  // sangre que viaja por el hilo hasta el lanzador
  a.count+=points(L.part,100,C+`void main(){float s=TS+aSeed.x*(${f(TF-0.35)}-TS);float k=clamp((uT-s)/.4,0.,1.);
   vec3 p=qb(k)+(rnd())*.07*sin(k*3.14159);
   vA=(uT>s&&k<1.)?smoothstep(0.,.1,k)*(1.-smoothstep(.9,1.,k)):0.;put(p,.045+.04*aSeed.w);}`);
  // curación del lanzador: motas rojas que suben
  a.count+=points(L.part,40,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TA)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;vec3 p=vec3(-3.7+cos(an)*.5,.1+age*1.8,sin(an)*.5);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.04+.05*r.z);}`);
  // suelo: salpicadura bajo el rival y onda de curación bajo el lanzador
  const pool=groundPlane(1.7,3.4,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,4.))*.6+noise(vec3(p*17.,1.))*.4;
   float m=smoothstep(uP,uP-.2,r+(n-.5)*.45);gl_FragColor=vec4(vec3(.22,0.,.02)+uC2*.12,m*.7*uA);}`,NB));
  const shock=groundPlane(3,3.4,0.03,fx(RING_FS)), heal=groundPlane(2.4,-3.7,0.03,fx(RING_FS));
  L.decal.add(pool,shock,heal);

  a.pose=function(te,o){
    const ia=te-TI, ap=ss(0.02,0.2,te), ia2=te-TA, rip=ss(TG,TG+0.2,te);
    const grind=ia>=0&&te<TG?Math.sin(ia*32)*0.1*(1-ss(TG-0.15,TG,te)):0;
    const gap=ia<0?0.12+0.28*ss(0.1,TI-0.1,te)-0.4*ss(TI-0.07,TI,te):-0.04*Math.exp(-ia*14)+0.6*rip;
    placeJaws(J,JC,JH,gap*JH,grind,0,0.65);
    for(const m of J){m.visible=ap>0.001&&rip<0.999;m.material.uniforms.uA.value=ap*(0.85+(ia>=0?0.5*Math.exp(-ia*5):0));m.material.uniforms.uD.value=rip;}
    J[0].scale.setScalar(0.85+0.15*ap); J[1].scale.copy(J[0].scale);
    towardCam(tears.position,tmp.set(3.25,1.2,0.3),0.4); billboard(tears); tears.visible=te>=0.66&&te<TF+0.3;
    set(tears,ss(0.66,TG,te),0.95*(1-ss(TF-0.1,TF+0.3,te)));
    const env=ss(TG,TG+0.15,te)*(1-ss(TF,a.dur,te));
    thread.visible=te>=TS&&te<TF+0.3; set(thread,ss(TS,TS+0.3,te),0.9*(1-ss(TF-0.1,TF+0.3,te)));
    U.uE.value=env;
    set(pool,0.2+0.8*ss(TI,TG+0.4,te),ia>=0?ss(0,0.15,ia)*(1-ss(TF,a.dur,te)):0);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    p=cl(ia2/0.55); set(heal,1-Math.pow(1-p,2),ia2>=0?(1-p)*0.6:0);
    caster.rotation.z=0.1*ss(0,0.2,te)-0.18*ss(TI-0.08,TI,te)*(1-ss(TI+0.1,TI+0.5,te));
    glowOf(caster,U.uC1.value,ia2>=0?0.6*Math.exp(-ia2*4)+0.2*env:0);
    const hit=hitK(ia,6); target.position.x=3.4+0.1*hit+grind*0.3; target.rotation.z=-0.12*hit*Math.cos(ia*20)+grind*0.5;
    o.em=0.2*env; o.emc.copy(U.uC2.value);
    if(te<TI){o.g.copy(JC);o.gs=0.9*ap;o.ga=0.15*ap;o.li=1.2*ap;}
    else if(te<TS){o.g.copy(JC);o.gs=1.2+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*8)*0.6+0.15*Math.abs(grind)*8;o.li=5*Math.exp(-ia*4)+1.5;}
    else{const k=ss(TS,TA,te);qb(A0,B0,C0,k,o.g);o.gs=1;o.ga=0.25+(ia2>=0?0.3*Math.exp(-ia2*6):0);o.li=2+(ia2>=0?3*Math.exp(-ia2*4):0);}
    o.ia=ia;o.c.copy(JC);o.shake=0;o.dist=0.55;o.flash=1;
  };
}};

// =====================================================================
// 4 · TINY TURTLE — una tortuguita de caparazón de piedra salta de la boca, corretea por el suelo y muerde el pie del
//     rival; él brinca de dolor y queda aturdido con una espiral de estrellas doradas orbitando su cabeza
// =====================================================================
const turtle={key:"rbTinyTurtle",name:"Tiny Turtle",pa:2,dur:2.4,ti:1.0,pal:"Dorado",
  phases:[["Eclosión",0],["Carrera",0.24],["Mordisco",1.0],["Aturdido",1.12],["Retirada",1.6],["Fin",2.0]],
build(a){
  const L=a.L,TH=0.24,TR=0.95,TI=1.0,TB=1.15,TW=1.6,TX=1.8,TE=2.05,G0=V3(-2.9,0,0.38),G1=V3(2.62,0,0.38),FT=V3(3.08,0.14,0.4),HD=V3(3.4,2.02,0),S=0.8;
  // caparazón: escudos hexagonales de piedra con juntas doradas (uQ = brillo de las juntas)
  const shellMat=fxU(`uniform float uQ;
  vec2 hx(vec2 p){vec2 r=vec2(1.,1.732);vec2 h=r*.5;vec2 a=mod(p,r)-h;vec2 b=mod(p-h,r)-h;return dot(a,a)<dot(b,b)?a:b;}
  void main(){vec3 q=normalize(vP*vec3(.8,1.4,1.));float an=atan(q.z,q.x);vec2 c=hx(vec2(an*1.6,q.y*4.));vec2 aq=abs(c);
   float d=max(aq.x*.866+aq.y*.5,aq.y);float groove=smoothstep(.36,.46,d);float n=noise(vP*20.)*.6+noise(vP*45.)*.4;
   vec3 st=mix(vec3(.3,.28,.24),vec3(.62,.57,.48),n)*(1.-groove*.6)*${LIT};
   float ring=band(fract(d*4.),.5,.1)*(1.-groove)*.15;
   gl_FragColor=vec4(st*(1.-ring)+uC1*groove*(.25+uQ*1.4)+uC2*pow(${FR},2.)*.35,1.);}`,{uQ:{value:0}},SOLID);
  const skinMat=fx(`void main(){vec3 n=normalize(vP);float e=max(dot(n,normalize(vec3(.5,.45,.72))),dot(n,normalize(vec3(.5,.45,-.72))));
   float eye=smoothstep(.93,.95,e);float sp=noise(vP*40.);
   vec3 c=mix(vec3(.3,.42,.18),vec3(.5,.62,.28),sp)*${LIT};c=mix(c,vec3(.02),eye)+vec3(1.)*smoothstep(.985,.99,e)*.8;
   gl_FragColor=vec4(c,1.);}`,SOLID);
  const T=new THREE.Group(), body=new THREE.Group(); T.add(body); L.mesh.add(T);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(0.3,28,14,0,Math.PI*2,0,Math.PI/2),shellMat); shell.scale.set(1.25,0.75,1);
  const plast=new THREE.Mesh(new THREE.CylinderGeometry(0.37,0.35,0.06,24),shellMat); plast.scale.set(1,1,0.82);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),skinMat); head.scale.set(1.3,1,1);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.12,8).rotateZ(Math.PI/2),skinMat); tail.position.set(-0.42,0.02,0);
  const legs=[[0.2,0.2],[0.2,-0.2],[-0.2,0.2],[-0.2,-0.2]].map(([x,z])=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.14,8).translate(0,-0.05,0),skinMat);m.position.set(x,0,z);body.add(m);return m;});
  body.add(shell,plast,head,tail);
  // órbita de estrellas: anillo discontinuo inclinado alrededor de la cabeza del rival
  const orbit=new THREE.Mesh(new THREE.TorusGeometry(0.46,0.012,6,64).rotateX(Math.PI/2),fx(`void main(){float an=atan(vP.z,vP.x);
   float dash=step(.45,fract(an/6.2832*14.-uT*1.5));gl_FragColor=vec4(uC1*1.5,dash*.8*uA);}`));
  orbit.position.copy(HD); L.trail.add(orbit);

  const C=`const float TH=${f(TH)};const float TR=${f(TR)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 G0=${v3(G0)};const vec3 G1=${v3(G1)};const vec3 FT=${v3(FT)};const vec3 HD=${v3(HD)};
  vec3 tp(float t){return mix(G0,G1,smoothstep(TH,TR,t));}`;
  // eclosión: destellos al saltar de la boca
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.1;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.6,.2,0.));vec3 p=${v3(MO)}+d*(.1+.6*aSeed.z)*(1.-exp(-t*6.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`);
  // polvo de la carrera
  a.count+=points(L.part,50,C+`void main(){float s=TH+aSeed.x*(TR-TH);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=tp(s)+vec3(-.3+r.x*.1-.3*t,.05+.25*t,r.z*.25);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.14+.12*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // mordisco: chispas y estrellas que saltan del pie
  a.count+=sparks(L.part,60,TI,`${f(FT.x)},${f(FT.y)},${f(FT.z)}`,"0.,1.,.4",1.6,4.5,2.5);
  a.count+=points(L.part,12,C+`void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.8,.4));vec3 p=FT+d*(.2+.6*aSeed.z)*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.2+.12*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  // espiral de estrellas que sube del pie a la cabeza y se queda orbitando
  a.count+=points(L.part,30,C+`void main(){float s=TI+.04+aSeed.x*.2;float k=clamp((uT-s)/.32,0.,1.);float an=aSeed.y*6.2832+k*9.;
   float rd=mix(.35,.46,k);vec3 p=mix(FT,HD,k*k)+vec3(cos(an)*rd,0.,sin(an)*rd*.5)*(.4+.6*k);
   vA=(uT>s&&k<1.)?sin(k*3.14159):0.;put(p,.08+.05*aSeed.w);}`,STAR4_FS);
  a.count+=points(L.part,6,C+`void main(){float an=floor(aSeed.y*5.999)/6.*6.2832+uT*4.;
   vec3 p=HD+vec3(cos(an)*.46,.03*sin(an*2.),sin(an)*.23);
   vA=uE*(.7+.3*sin(uT*9.+an));put(p,.24+.04*sin(uT*7.+an*3.));}`,STAR4_FS);
  a.count+=points(L.part,50,C+`void main(){float life=.4+aSeed.y*.2;float k=(uT-TB)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+(uT-age*life)*4.;vec3 p=HD+vec3(cos(an)*.46,0.,sin(an)*.23)+vec3((r.y-.5)*.08,-age*.15,(r.z-.5)*.08);
   vA=(k>=1.)?(1.-age)*uE:0.;put(p,.035+.03*r.z);}`);
  // retirada: la tortuga se esconde en su caparazón y se deshace en destellos
  a.count+=points(L.part,40,C+`void main(){float s=${f(TX)}+aSeed.x*.15;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=vec3(${f(2.25)},.15,${f(G1.z)})+d*(.1+.5*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.05*aSeed.w);}`);
  // suelo: sello dorado de aturdimiento bajo el rival y onda del mordisco
  const daze=groundPlane(2.4,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*1.2;
   float sp=band(fract(an/6.2832*2.+r*1.4),.5,.06)*step(.25,r)*step(r,.9);
   float m=sp*.6+band(r,.94,.015)+band(r,.2,.015);gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,m*uA);}`));
  const shock=groundPlane(2.6,3.4,0.03,fx(RING_FS));
  L.decal.add(daze,shock);

  const tq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TB,TB+0.15,te)*(1-ss(2.1,a.dur,te));
    // trayecto: salta de la boca al suelo, corre, embiste, retrocede y se esconde
    let sc=S, wad=0, hx=0.42;
    if(te<TH){const k=cl(te/TH);tq.set(MO.x+(G0.x-MO.x)*k,(MO.y-0.1)*(1-k)+0.55*Math.sin(Math.PI*k)+0.09,MO.z+(G0.z-MO.z)*k);sc=S*ss(0,0.1,te);T.rotation.z=-0.6*(1-k);}
    else if(te<TR){const k=ss(TH,TR,te);tq.lerpVectors(G0,G1,k);tq.y=0.09+0.035*Math.abs(Math.sin(te*38));wad=Math.sin(te*38);T.rotation.z=0.06*Math.sin(te*19);}
    else if(te<TB){const k=ss(TR,TI,te);tq.set(G1.x+0.24*k,0.09+0.08*Math.sin(Math.PI*k),G1.z);hx=0.42+0.16*k;T.rotation.z=-0.15*k;}
    else{const k=ss(TB,TW,te);tq.set(G1.x+0.24-0.6*k,0.09+0.06*Math.abs(Math.sin(k*Math.PI*3)),G1.z);hx=0.58-0.16*ss(TB,TB+0.2,te);T.rotation.z=0;}
    T.position.copy(tq); T.rotation.y=te<TH?te*14:0;
    const hide=ss(TW,TX,te), gone=ss(TX,TE,te);
    T.visible=te>0.005&&gone<0.999; T.scale.setScalar(Math.max(sc*(1-gone*0.9),0.001));
    body.rotation.y=gone*12;
    head.position.set(hx*(1-0.6*hide),0.06,0); head.scale.set(1.3*(1-0.8*hide),Math.max(1-0.8*hide,0.01),Math.max(1-0.8*hide,0.01));
    legs.forEach((m,i)=>{m.rotation.z=0.6*wad*(i%2?1:-1);m.rotation.x=0.4*wad*(i<2?1:-1);m.scale.setScalar(Math.max(1-0.85*hide,0.01));});
    shellMat.uniforms.uQ.value=(ia>=0?Math.exp(-ia*6):0)+gone+0.2*ss(0,0.1,te)*(1-ss(0.1,TH,te));
    // rival: brinca de dolor y se balancea mareado
    const hop=ia>=0?Math.sin(Math.PI*cl((ia-0.02)/0.28))*(ia>0.02?1:0):0;
    target.position.y=0.3*hop; target.rotation.z=0.12*env*Math.sin((te-TB)*5.5)-0.15*hitK(ia,10);
    target.scale.set(1,1-0.06*hitK(ia,12),1);
    orbit.visible=env>0.001; orbit.rotation.set(0.25*Math.sin(te*2),te*3,0.2); orbit.position.set(HD.x,HD.y+0.3*hop,HD.z); orbit.scale.set(1,1,0.5);
    orbit.material.uniforms.uA.value=env;
    U.uE.value=env;
    set(daze,0,env*0.8); const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    o.em=0.2*env*(0.6+0.4*Math.sin(te*8)); o.emc.copy(U.uC1.value);
    if(te<TI){o.g.set(tq.x,0.4,tq.z);o.gs=0.6;o.ga=0.12;o.li=1;}
    else{o.g.copy(FT);o.g.y=0.4+1.2*ss(TI,TB+0.2,te);o.gs=1+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.55+0.12*env;o.li=4.5*Math.exp(-ia*5)+1.5*env;}
    o.ia=ia;o.c.copy(FT);o.shake=0;o.dist=0.4;o.flash=1;
  };
}};

// =====================================================================
// 5 · TOOTHLESS BITE — (rival más lejano) un eco espectral cruza el tablero; unas encías gomosas sin dientes muerden
//     con un rebote de gelatina y sueltan una maldición: ojo rúnico, espirales fantasma y la energía del rival que se
//     escurre hacia el suelo y se apaga
// =====================================================================
const toothless={key:"rbToothlessBite",name:"Toothless Bite",pa:2,dur:2.3,ti:0.9,pal:"Psicodelia",enemies:2,
  phases:[["Bostezo",0],["Eco",0.18],["Mordisco",0.9],["Maldición",1.02],["Drenaje",1.3],["Fin",1.9]],
build(a){
  const L=a.L,TE0=0.18,TA=0.82,TI=0.9,TC=1.02,TD=1.3,TF=1.9,V=ENEMY_POS[1],VC=V3(V.x-0.1,1.2,V.z+0.2),EY=V3(V.x,2.4,V.z);
  // encías gomosas: borde ondulado y bultos brillantes (gelatina rosada, sin dientes)
  const GUM=`uniform float uQ;
  void main(){vec2 p=vUv;float y=uQ>0.?1.-p.y:p.y;float x=p.x;float side=smoothstep(0.,.12,x)*smoothstep(1.,.88,x);
   float lump=.5+.5*cos((x-.5)*6.2832*3.5);float edge=(.26+.12*lump+.08*(1.-pow(2.*x-1.,2.)))*side;
   float m=smoothstep(edge,edge-.05,y)*side;float rim=band(y,edge,.04)*side;
   float hl=smoothstep(.12,0.,length(vec2((fract(x*3.5+.5)-.5)*.6,y-edge+.09)))*m;float n=noise(vec3(p*6.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,.4+.4*n+rim*.5)*1.3+vec3(1.)*hl*.6,(m*.45+rim*.9+hl)*uA);}`;
  const J=jawPair(L.mesh,1.4,0.7,[fxU(GUM,{uQ:{value:1}},{depthTest:false}),fxU(GUM,{uQ:{value:-1}},{depthTest:false})]);
  // eco: anillos con forma de boca que viajan desde el lanzador
  const ECHO=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p*vec2(1.,1.6+.25*sin(atan(p.y,p.x)*4.+uT*8.)));
   float n=noise(vec3(p*3.,uT*3.));gl_FragColor=vec4(mix(uC2,uC1,n)*1.5,band(r,.8,.08)*(.6+.4*n)*uA);}`;
  const echoes=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(ECHO,{depthTest:false}));L.trail.add(m);return m;});
  // ojo maldito rúnico sobre la cabeza del rival
  const eye=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ring=band(r,.92,.03)+band(r,.78,.015);float rune=band(r,.85,.05)*step(.6,fract(an/6.2832*16.+uT*.4))*step(.3,fract(an/6.2832*5.3));
   float al=abs(p.y)-.42*(1.-pow(p.x/.7,2.));float lid=band(al,0.,.03)*step(abs(p.x),.7);
   float iris=band(length(p),.22,.03)*step(al,0.);float pup=smoothstep(.05,.02,abs(p.x))*smoothstep(.2,.17,abs(p.y));
   float m=ring+rune*.8+lid+iris+pup*uP;gl_FragColor=vec4(mix(uC2,uC1,iris+pup)*1.5+vec3(1.)*pup*uP*.5,min(m,1.4)*uA);}`,{depthTest:false}));
  L.mesh.add(eye);
  // espirales fantasma alrededor del rival
  const wMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float d=uP-u;if(d<0.)discard;
   float n=noise(vec3(u*12.-uT*3.,v*3.,1.));gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,smoothstep(1.,.2,v)*(.3+.7*n)*exp(-d*2.)*uA);}`);
  const wisps=[0,Math.PI].map(r=>{const m=new THREE.Mesh(helixGeo(1.5,0.75,0.4,2.3,0.22,120),wMat);m.position.set(V.x,0.05,V.z);m.rotation.y=r;L.trail.add(m);return m;});

  const C=`const float TE0=${f(TE0)};const float TA=${f(TA)};const float TI=${f(TI)};const float TC=${f(TC)};const float TD=${f(TD)};const vec3 MO=${v3(MO)};const vec3 VC=${v3(VC)};const vec3 V=${v3(V)};`;
  // bostezo: vaho espectral en la boca del lanzador
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.2;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(1.,.2,0.));vec3 p=MO+d*(.05+.5*aSeed.z)*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.05*aSeed.w);}`);
  // estela del eco: hebras que ondulan a lo largo del trayecto
  a.count+=points(L.part,90,C+`void main(){float s=TE0+aSeed.x*(TA-TE0);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-TE0)/(TA-TE0);vec3 c=mix(MO,VC,k);float an=aSeed.z*6.2832+k*25.;
   vec3 p=c+vec3(0.,cos(an),sin(an))*(.12+.25*t)+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.03+.04*aSeed.w);}`);
  // mordisco gomoso: gotitas brillantes que rebotan
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.04;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.6,.5))*(1.+1.4*aSeed.y);vec3 p=VC+v*c+vec3(0.,-4.*c*c,0.);p.y=abs(p.y-.03)+.03;
   vA=(t>0.&&t<.8)?1.-t/.8:0.;put(p,.06+.05*aSeed.w);}`,BUBBLE_FS);
  // drenaje: la energía del rival se escurre hacia el suelo y se apaga
  a.count+=points(L.part,80,C+`void main(){float s=TD+aSeed.x*.5;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=V+vec3(cos(an)*(.3+.15*aSeed.w),.4+aSeed.w*1.3-t*(1.6+aSeed.y),sin(an)*(.3+.15*aSeed.w));
   vA=(age>0.&&age<1.&&p.y>0.)?(1.-age)*smoothstep(0.,.25,p.y):0.;put(p,(.05+.04*aSeed.y)*(1.-age*.6));}`);
  // fantasmas que suben del sello
  a.count+=points(L.part,40,C+`void main(){float life=.8+aSeed.y*.3;float k=(uT-TC)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;vec3 p=V+vec3(cos(an)*.8,.05+age*1.4,sin(an)*.8);
   vA=(k>=1.)?sin(age*3.14159)*.6*uE:0.;put(p,(.2+.15*r.z)*(.6+age*.6));}`,SMOKE_FS("vec3(.55,.3,.75)"));
  // suelo: sello de maldición bajo el rival lejano
  const seal=groundPlane(2.6,V.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float rune=band(r,.8,.06)*step(.55,fract((an-uT*.5)/6.2832*18.))*step(.25,fract((an-uT*.5)/6.2832*5.7));
   float star=band(r*cos(mod(an+uT*.3,1.2566)-.6283),.5,.015)*step(r,.8);
   float m=(rune+star+band(r,.95,.015)+band(r,.66,.012))*step(r,uP*1.05);gl_FragColor=vec4(mix(uC2,uC1,.5)*1.4,m*uA);}`));
  seal.position.z=V.z; const boing=groundPlane(2.6,V.x,0.03,fx(RING_FS)); boing.position.z=V.z;
  const bump=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false})); L.mesh.add(bump);
  L.decal.add(seal,boing);

  a.pose=function(te,o){
    const ia=te-TI, ap=ss(TA-0.15,TA,te), dis=ss(TC+0.1,TC+0.35,te), env=ss(TC,TC+0.2,te)*(1-ss(TF,a.dur,te));
    caster.rotation.z=0.1*ss(0,0.15,te)-0.12*ss(0.15,0.25,te)+0.02*ss(0.25,0.5,te);
    caster.scale.set(1,1+0.04*ss(0,0.15,te)*(1-ss(0.15,0.3,te)),1);
    echoes.forEach((m,i)=>{const t0=TE0+i*0.08,k=cl((te-t0)/(TA-t0-0.04));m.visible=te>=t0&&k<1;
      towardCam(m.position,tmp.lerpVectors(MO,VC,k*k*(3-2*k)),0.2); billboard(m,0.3*Math.sin(te*6+i));
      m.scale.setScalar(0.4+0.6*k+0.1*i); m.material.uniforms.uA.value=Math.sin(Math.PI*k)*0.8;});
    // encías: aparecen, muerden con rebote gomoso y se disuelven
    const wob=ia>=0?Math.exp(-ia*6)*Math.sin(ia*32):0;
    const gap=ia<0?0.3*ap-0.3*ss(TI-0.06,TI,te):-0.05*wob+0.4*dis;
    placeJaws(J,VC,0.7,gap*0.7,0,0,0.6);
    for(const m of J){m.visible=ap>0.001&&dis<0.999;m.scale.set(0.9+0.2*wob,0.9-0.2*wob,1);m.material.uniforms.uA.value=ap*(1-dis)*(0.9+0.3*Math.abs(wob));}
    let p=cl(ia/0.35); towardCam(bump.position,VC,0.5); billboard(bump); bump.visible=ia>=0&&p<1; set(bump,p,(1-p)*0.8);
    // maldición
    const ce=ss(TC,TC+0.2,te)*(1-ss(TF-0.1,a.dur,te));
    towardCam(eye.position,EY,0.3); billboard(eye,0.15*Math.sin(te*2)); eye.visible=ce>0.001;
    eye.scale.setScalar(Math.max(0.6+0.4*ss(TC,TC+0.25,te)+0.05*Math.sin(te*6),0.001)); set(eye,ss(TC+0.15,TC+0.35,te),ce);
    for(const w of wisps)w.visible=te>=TC&&te<TF+0.3;
    wisps[0].rotation.y=te*2; wisps[1].rotation.y=Math.PI+te*2;
    setM(wMat,ss(TC,TC+0.5,te)*1.1,(1-ss(TF-0.2,TF+0.3,te))*0.85);
    U.uE.value=env;
    set(seal,ss(TC,TC+0.35,te),env*0.85);
    p=cl(ia/0.6); set(boing,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    // rival lejano: rebote de gelatina, destello de la maldición y luz que se apaga
    const ev=enemies[1], hw=ia>=0?Math.exp(-ia*5)*Math.sin(ia*30):0;
    ev.scale.set(1+0.1*hw,1-0.12*hw,1+0.1*hw); ev.rotation.z=0.05*hw;
    const drain=ss(TD,TD+0.2,te)*(1-ss(TF-0.2,TF+0.2,te));
    glowOf(ev,U.uC1.value,(ia>=0?0.9*Math.exp(-ia*7):0)+0.45*drain*(1-ss(TD,TF,te)));
    if(te<TE0){o.g.copy(MO);o.gs=0.5;o.ga=0.15*ss(0,0.1,te);o.li=1;}
    else if(te<TI){o.g.lerpVectors(MO,VC,cl((te-TE0)/(TA-TE0)));o.gs=0.9;o.ga=0.3;o.li=2.5;}
    else{o.g.copy(VC);o.g.y+=0.6*ce;o.gs=1.2+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.55+0.15*env;o.li=4.5*Math.exp(-ia*5)+1.8*env;}
    o.ia=ia;o.c.copy(VC);o.shake=0;o.dist=0.45;o.flash=0;
  };
}};

// =====================================================================
// 6 · TINY DINO — (aliado) una cola de dinosaurio espectral con púas surge de una grieta de luz y golpea el suelo junto
//     al aliado con fuerza tectónica (ondas en el suelo, sin losas: nivel 2); de la tierra sube la cura y una coraza de
//     escamas de piedra lo endurece (+resistencia física)
// =====================================================================
const dino={key:"rbTinyDino",name:"Tiny Dino",pa:2,dur:2.4,ti:0.95,pal:"Jade",allies:1,
  phases:[["Grieta",0],["Cola",0.25],["Golpe",0.95],["Ondas",1.05],["Curación",1.2],["Fin",1.95]],
build(a){
  const L=a.L,TT=0.25,TW=0.72,TI=0.95,TH=1.2,TF=1.95,AP=ALLY_POS[0],AC=V3(AP.x,1.0,AP.z);
  const PV=V3(AP.x-1.03,2.0,AP.z+0.25), SL=V3(AP.x-0.75,0.05,AP.z+0.25), A0=Math.atan2(-0.8,1.85);
  // ángulo de la cola: alzada arriba, toma impulso y cae por la izquierda hasta el suelo, rebota y se asienta
  const angAt=te=>{if(te<TW)return 1.75+0.25*ss(TT,TW,te);if(te<TI){const k=(te-TW)/(TI-TW);return 2.0+(4.85-2.0)*k*k;}
    const i=te-TI;return 4.85-0.18*Math.exp(-i*7)*Math.sin(i*16);};
  // cola: tubo afinado con escamas de energía jade; púas (tagomizador) cerca de la punta
  const tailMat=fx(`void main(){float u=vUv.x;vec2 g=vec2(u*28.,vUv.y*10.);g.x+=step(1.,mod(floor(g.y),2.))*.5;
   float sc=band(length((fract(g)-vec2(.5,0.))*vec2(1.,1.2)),.55,.08);float fr=pow(${FR},1.3);float n=noise(vec3(u*10.,vUv.y*4.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,.3+.5*fr+.3*sc)*1.4+vec3(1.)*uP*fr*.4,(.22+.55*fr+.35*sc*n+uP*.3)*smoothstep(0.,.08,u)*uA);}`);
  const tailG=new THREE.Group(); L.mesh.add(tailG);
  const curve=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.5,-0.05,0),V3(1.0,-0.2,0),V3(1.5,-0.48,0),V3(1.85,-0.8,0)]);
  tailG.add(new THREE.Mesh(taperTube(curve,40,12,0.2,0.04),tailMat));
  const spikeMat=fx(`void main(){float h=vP.y/.3+.5;float fr=${FR};gl_FragColor=vec4(mix(uC2,uC1,h)*1.6+vec3(1.)*pow(h,4.)*.6,(.5+.5*fr)*uA);}`);
  [[1.38,-0.38,0.45,0.12],[1.55,-0.52,0.62,-0.12],[1.68,-0.63,0.75,0.13],[1.79,-0.74,0.9,-0.14]].forEach(([x,y,r,z])=>{
    const s=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.3,6).translate(0,0.15,0),spikeMat);s.position.set(x,y,z);s.rotation.set(z*3,0,r);tailG.add(s);});
  tailG.position.copy(PV);
  // grieta de luz en el aire de la que nace la cola
  const rift=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sw=noise(vec3(an*3.+r*6.-uT*6.,r*3.,1.));float m=smoothstep(.85,.2,r)*(.25+.75*sw)*smoothstep(0.,.25,r)+band(r,.8,.04);
   gl_FragColor=vec4(mix(uC2,uC1,sw)*1.4,m*uA);}`,{depthTest:false}));
  L.mesh.add(rift);
  // columna de cura y coraza de escamas de piedra (cuerpo + cabeza) que crece desde los pies
  const column=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.8,2.6,36,1,true),fx(`void main(){float h=vP.y/2.6+.5;float an=atan(vP.z,vP.x);
   float st=noise(vec3(an*5.,h*6.-uT*4.,0.));float fr=pow(${FR},1.3);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3,(fr*.45+smoothstep(.5,.85,st)*.35)*(1.-h)*step(h,uP)*uA);}`));
  column.position.set(AP.x,1.3,AP.z);
  const ARM=`uniform float uQ;
  void main(){float an=atan(vP.z,vP.x);float h=(vP.y+uQ)/1.95;vec2 g=vec2(an*3.5,vP.y*9.);g.x+=step(1.,mod(floor(g.y),2.))*.5;
   float d=length((fract(g)-vec2(.5,0.))*vec2(1.,1.2));float rim=band(d,.55,.08);float n=noise(vP*14.);
   float fr=pow(${FR},1.4);float rev=step(h,uP);float edge=band(h,uP,.03)*step(uP,.99);
   gl_FragColor=vec4(mix(vec3(.45,.48,.4),uC1,.35+.4*rim)*(1.1+.3*n)*${LIT}+uC1*fr*.6,((.25+rim*.55+fr*.35)*rev+edge*1.5)*uA);}`;
  const armB=new THREE.Mesh(new THREE.CylinderGeometry(0.37,0.45,1.27,32,6,true),fxU(ARM,{uQ:{value:0.625}}));
  const armH=new THREE.Mesh(new THREE.SphereGeometry(0.3,24,16),fxU(ARM,{uQ:{value:1.6}}));
  armB.position.set(AP.x,0.625,AP.z); armH.position.set(AP.x,1.6,AP.z);
  L.mesh.add(column,armB,armH);

  const C=`const float TT=${f(TT)};const float TI=${f(TI)};const float TH=${f(TH)};const vec3 PV=${v3(PV)};const vec3 SL=${v3(SL)};const vec3 AP=${v3(AP)};
  float ang(float t){if(t<${f(TW)})return 1.75+.25*smoothstep(TT,${f(TW)},t);float k=clamp((t-${f(TW)})/${f(TI-TW)},0.,1.);return 2.+2.85*k*k;}`;
  // grieta: motas jade que giran hacia el punto de la grieta
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*(TT+.2);float life=.3+aSeed.y*.15;float age=(uT-s)/life;
   vec3 d=normalize(rnd());vec3 p=PV+d*mix(1.,.05,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // estela de la punta durante el latigazo
  a.count+=points(L.part,70,C+`void main(){float s=${f(TW)}+aSeed.x*${f(TI-TW)};float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float a=ang(s);float rd=1.6+.45*aSeed.z;vec3 p=PV+vec3(cos(a)*rd,sin(a)*rd,(aSeed.w-.5)*.2)+vec3(0.,-.3*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`);
  // golpe tectónico: chispas, polvo en anillo y polvo que asciende
  a.count+=sparks(L.part,90,TI,`${f(SL.x)},${f(SL.y)},${f(SL.z)}`,"0.,1.2,0.",2,6,3);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.1;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(AP.x,.05,AP.z)+vec3(cos(an),0.,sin(an))*(.5+1.5*aSeed.w)*(1.-exp(-t*3.))+vec3(0.,.3*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.8:0.;put(p,(.24+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // cura: cruces jade y motas que suben alrededor del aliado
  a.count+=points(L.part,50,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=.55+.25*r.y;vec3 p=AP+vec3(cos(an)*rd,.1+age*2.,sin(an)*rd);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.14+.08*r.z)*sin(age*3.14159+.3));}`,CROSS_FS);
  a.count+=points(L.part,60,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;vec3 p=AP+vec3(cos(an)*.7,.05+age*2.3,sin(an)*.7);
   vA=(k>=1.)?(1.-age)*uE:0.;put(p,.03+.04*r.z);}`);
  // suelo: ondas tectónicas concéntricas (relieve que se propaga) centradas bajo el aliado, y onda de choque
  const quake=groundPlane(4.2,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,1.));float rr=r+(n-.5)*.06;
   float w=0.;for(int i=0;i<3;i++){float fi=float(i);float c=uP-fi*.17;w+=band(rr,c,.05)*(1.-fi*.3)*step(0.,c);}
   float trough=0.;for(int i=0;i<3;i++){float fi=float(i);float c=uP-fi*.17-.06;trough+=band(rr,c,.04)*step(0.,c);}
   float fade=smoothstep(1.,.7,r);
   gl_FragColor=vec4(mix(vec3(.5,.42,.3),uC1,.55)*(1.2*w)+uC2*trough*.3,(w*.9+trough*.25)*fade*uA);}`));
  quake.position.z=AP.z; const shock=groundPlane(3.6,AP.x,0.03,fx(RING_FS)); shock.position.z=AP.z;
  const glowD=groundPlane(2,AP.x,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   vec2 g=vec2(an*3.,r*5.);g.x+=step(1.,mod(floor(g.y),2.))*.5;float sc=band(length((fract(g)-vec2(.5,0.))*vec2(1.,1.2)),.55,.06);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.2,(smoothstep(1.,.2,r)*.2+sc*.3*step(.25,r)*step(r,.9)+band(r,.95,.015))*uA);}`));
  glowD.position.z=AP.z;
  L.decal.add(quake,shock,glowD);

  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH, on=ss(0.02,TT,te), out=1-ss(1.35,1.65,te), env=ss(TH,TH+0.2,te)*(1-ss(TF,a.dur,te));
    caster.rotation.z=0.1*ss(0,0.15,te)-0.14*ss(0.15,0.28,te)+0.04*ss(0.28,0.6,te);
    glowOf(caster,U.uC1.value,0.25*ss(0,0.15,te)*(1-ss(0.3,0.6,te)));
    const an=angAt(te);
    tailG.visible=te>=0.08&&out>0.001; tailG.rotation.z=an-A0; tailG.scale.setScalar(Math.max(ss(0.08,TT+0.15,te)*(0.85+0.15*out),0.001));
    setM(tailMat,ia>=0?Math.exp(-ia*5):0.4*ss(TW,TI,te),0.9*out); spikeMat.uniforms.uA.value=out;
    towardCam(rift.position,PV,0.2); billboard(rift,te); rift.visible=on*out>0.001; set(rift,0,on*out*0.9); rift.scale.setScalar(0.6+0.4*on);
    // suelo y cura
    set(quake,cl(ia/0.9)*1.05,ia>=0?1-ss(0.5,0.9,ia):0);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    set(glowD,0,env*0.8);
    column.visible=env>0.001; set(column,ss(TH,TH+0.35,te),env*0.75);
    for(const m of [armB,armH]){m.visible=ih>=0&&te<a.dur;set(m,ss(TH+0.05,TH+0.45,te)*1.02,env*(0.85+(ih>=0?0.4*Math.exp(-ih*3):0)));}
    U.uE.value=env;
    // aliado: se sacude con el temblor del golpe y brilla al curarse
    const hk=hitK(ia,9), al=allies[0]; al.position.y=ALLY_POS[0].y+0.06*hk*Math.abs(Math.sin(ia*30)); al.scale.set(1,1+0.04*env*Math.sin(te*6),1);
    glowOf(al,U.uC1.value,0.25*env+(ih>=0?0.55*Math.exp(-ih*4):0)+0.3*hk);
    if(te<TW){o.g.copy(PV);o.gs=1*on;o.ga=0.3*on;o.li=2*on;}
    else if(te<TI){o.g.set(PV.x+Math.cos(an)*1.6,PV.y+Math.sin(an)*1.6,PV.z);o.gs=1;o.ga=0.4;o.li=3;}
    else{o.g.copy(SL);o.g.y+=0.6+0.4*env;o.gs=1.3+2.2*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.6+0.15*env;o.li=6*Math.exp(-ia*5)+2*env;}
    o.ia=ia;o.c.copy(SL);o.shake=0;o.dist=0.55;o.flash=0;
  };
}};

VFX.module("Reptil · Boca",[chem,kotaro,razor,turtle,toothless,dino]);
})();

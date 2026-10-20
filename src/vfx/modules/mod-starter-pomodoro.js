// =====================================================================
// STARTER · POMODORO — cartas α del Axie inicial Pomodoro (2 PA → nivel 2, duración fijada por carta)
// Lost Dream: burbuja de sueño → escudo hexagonal propio → burbujitas que escudan a los aliados.
// Village Hero: carrera y tajo heroico con capa dorada; cada aliado con escudo aporta una chispa al golpe.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,camera,caster,target,allies,ALLY_POS}=VFX;
const {v3,STAR4_FS,billboard,towardCam}=VFX.lib;
// acentos fijos: luna/estrellas (Estelar) y oro heroico
const STAR=`vec3(1.,.94,.54)`, VIO=`vec3(.48,.42,1.)`, GOLD=`vec3(1.,.78,.32)`;
const UP=V3(0,1,0);
const qbez=(a,m,b,k,out)=>{const u=1-k;return out.set(u*u*a.x+2*u*k*m.x+k*k*b.x,u*u*a.y+2*u*k*m.y+k*k*b.y,u*u*a.z+2*u*k*m.z+k*k*b.z);};

// escudo hexagonal sobre media esfera: uP 0→1.25 lo arma de arriba abajo (frente brillante), uH = pulso que baja
const HEX_FS=(nx,ny)=>`uniform float uH;
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 vec2 uv=vec2(vUv.x*${f(nx)},vUv.y*${f(ny)});
 vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(uv,r)-h,b=mod(uv-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
 float e=.5-hexD(g);float cid=hash(vec3(uv-g,7.));
 float hN=1.-vUv.y;float on=hN*.8+cid*.2;
 float vis=step(on,uP);float front=smoothstep(.16,0.,uP-on);
 float line=smoothstep(.07,0.,e)*smoothstep(.99,.94,vUv.y);
 float pul=band(hN,uH*1.8,.12)*exp(-uH*3.)*step(0.,uH);
 float shim=.75+.25*sin(uT*4.+cid*30.);
 float al=line*(.3+fr)*shim+fr*.3+.03+front*(.5+line)+pul*(.4+line);
 vec3 c=mix(uC2,uC1,clamp(fr*.6+line*.7,0.,1.))*1.35+vec3(1.)*(front+pul)*.4;
 gl_FragColor=vec4(c,al*vis*uA);}`;
// estrella de cuatro puntas en color estelar fijo
const DSTAR_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5)*2.;
 float s=smoothstep(.12,0.,q.x*q.y*6.+min(q.x,q.y))*smoothstep(1.,.2,max(q.x,q.y));
 float c=smoothstep(.35,0.,length(q));float a=(s+c)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${STAR},vec3(1.),.4*c)*1.5,a);}`;

// =====================================================================
// 1 · LOST DREAM — burbuja de sueño (luna y estrellas dentro) que se vuelve escudo hexagonal (+50, Protegido)
//     y se reparte en burbujitas que escudan brevemente a cada aliado (+20)
// =====================================================================
const dream={key:"starter_pomodoro_horn",name:"Lost Dream",dur:1.1,ti:0.38,pal:"Sagrado",tier:2,allies:2,
  phases:[["Ensueño",0],["Escudo",0.38],["Reparto",0.5],["Escuditos",0.76]],
build(a){
  const L=a.L,TI=0.38,TB=0.5,TA=0.76,TF=0.96,TE=1.1;
  const SC=V3(-3.7,0.85,0),SR=1.05,B0=V3(-3.7,1.95,0),BR=SR*0.96;
  // burbuja de sueño: película iridiscente (paleta + violeta estelar) con brillo especular
  const DREAM_FS=`void main(){vec3 n=normalize(vN),v=normalize(vV);float fr=pow(1.-abs(dot(n,v)),2.);
   float sw=noise(vP*2.2+vec3(0.,uT*1.4,uT*.7))*6.2832;
   vec3 iri=.5+.5*cos(vec3(0.,2.1,4.2)+fr*4.+sw);
   vec3 c=mix(mix(uC1,uC2,iri.x),${VIO},iri.y*.55)+${STAR}*iri.z*.25;
   float hl=pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.4,.6,.7)))),30.);
   float rim=smoothstep(.55,1.,fr);
   gl_FragColor=vec4(c*(.9+rim)+vec3(1.)*hl,(.05+fr*.75+hl*.9+uP*.5*rim)*uA);}`;
  const bubble=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(DREAM_FS));
  // lunita creciente en billboard dentro de la burbuja
  const moon=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float d=max(r-.42,-(length(p-vec2(.2,.12))-.36));
   float m=smoothstep(.03,-.02,d);float halo=exp(-max(d,0.)*7.)*.45;
   gl_FragColor=vec4(mix(${VIO},${STAR},.35+.65*m)*1.5+vec3(m*.25),(m+halo*(1.-m))*uA);}`));
  // escudo hexagonal de Pomodoro y escuditos de los aliados
  const shield=new THREE.Mesh(new THREE.SphereGeometry(SR,48,28,0,Math.PI*2,0,Math.PI*0.8),fxU(HEX_FS(22,10),{uH:{value:-1}}));
  shield.position.copy(SC);
  const AS=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.72,32,18,0,Math.PI*2,0,Math.PI*0.85),fxU(HEX_FS(14,6),{uH:{value:-1}}));
    m.position.set(ALLY_POS[i].x,0.68,ALLY_POS[i].z);return m;});
  L.mesh.add(bubble,moon,shield,...AS);
  // burbujitas viajeras: 3 por aliado, cada una con su arco
  const smallMat=fx(DREAM_FS);
  const paths=[0,1].map(i=>{const E=ALLY_POS[i].clone().add(V3(0,0.95,0)),dir=E.clone().sub(SC).normalize();
    const S=SC.clone().addScaledVector(dir,SR*0.85),perp=V3(0,0,0).crossVectors(dir,UP).normalize(),mid=S.clone().lerp(E,0.5);
    return {S,E,M:[0,1,2].map(j=>mid.clone().add(V3(0,1.0+0.25*j,0)).addScaledVector(perp,(j-1)*0.45))};});
  const flyers=[];
  for(let i=0;i<2;i++)for(let j=0;j<3;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),smallMat);
    m.userData={i,j,t0:TB+0.035*j,t1:TA+0.03*j,r:0.13+0.035*j};flyers.push(m);L.trail.add(m);}

  // partículas
  const C=`const float TI=${f(TI)};const float TB=${f(TB)};const float TA=${f(TA)};const vec3 SC=${v3(SC)};const float SR=${f(SR)};
  const vec3 B0=${v3(B0)};`;
  // polvo de sueño que gira y se posa sobre la burbuja mientras se infla
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*(TI-.06);float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   float k=smoothstep(.03,TI,s);vec3 bc=mix(B0,SC,k);float br=.08+${f(BR-0.08)}*k;
   vec3 d=normalize(rnd()+.0001);float an=age*2.2;d=vec3(d.x*cos(an)-d.z*sin(an),d.y,d.x*sin(an)+d.z*cos(an));
   vec3 p=bc+d*(br*(1.05+.35*(1.-age))+.12);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;put(p,.03+.04*aSeed.z);}`);
  // estrellitas dentro de la burbuja (siguen su centro y radio)
  const uB={value:new THREE.Vector4(B0.x,B0.y,B0.z,0.1)}, uBA={value:0};
  a.count+=points(L.part,22,`uniform vec4 uB;uniform float uBA;
   void main(){float an=aSeed.x*6.2832+uT*(.6+aSeed.y);float el=(aSeed.z-.5)*1.4;
   vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));vec3 p=uB.xyz+d*uB.w*(.3+.45*aSeed.w);
   float tw=.55+.45*sin(uT*(9.+aSeed.y*8.)+aSeed.z*30.);
   vA=uBA*tw;put(p,(.12+.12*aSeed.w)*uB.w*tw);}`,DSTAR_FS,
   {uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uB,uBA}});
  // la película se desprende en gotitas-burbuja al volverse escudo
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.06;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.2,0.));vec3 p=SC+d*SR*(.95+.6*(1.-exp(-t*4.)))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;put(p,(.05+.06*aSeed.z)*(1.-age*.4));}`,BUBBLE_FS);
  // estela de burbujitas tras cada grupo viajero + destello al fundirse en el escudito
  for(let i=0;i<2;i++){const P=paths[i];
    const PC=C+`const vec3 PS=${v3(P.S)};const vec3 PM=${v3(P.M[1])};const vec3 PE=${v3(P.E)};
    vec3 bz(float k){return mix(mix(PS,PM,k),mix(PM,PE,k),k);}`;
    a.count+=points(L.part,80,PC+`void main(){float s=TB+aSeed.x*(TA+.03-TB);float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     float k=clamp((s-TB)/(TA-TB),0.,1.);k=k*k*(3.-2.*k);
     vec3 p=bz(k)+rnd()*.13+vec3(0.,.35*t,0.);
     vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,(.04+.05*aSeed.z)*(1.-age*.3));}`,BUBBLE_FS);
    a.count+=points(L.part,45,PC+`void main(){float s=TA+aSeed.x*.1;float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=vec3(PE.x,.68,PE.z)+d*(.72+.5*(1.-exp(-t*5.)));
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.03+.04*aSeed.w);}`);
  }
  // suelo: aro hexagonal "Protegido" a los pies de Pomodoro, onda al formarse y aros bajo cada aliado
  const foot=groundPlane(2.6,SC.x,0.025,fx(`float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
  void main(){vec2 p=(vUv-.5)*2.;float an=uT*.4;p=mat2(cos(an),-sin(an),sin(an),cos(an))*p;float h=hexD(p);
   float m=band(h,.72*uP+.1,.025)+band(h,.6*uP+.08,.012)*.6+smoothstep(.75*uP,0.,h)*.08;
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.4,m*uA);}`));
  const shock=groundPlane(3.4,SC.x,0.03,fx(RING_FS));
  const aRings=[0,1].map(i=>{const g=groundPlane(2.0,ALLY_POS[i].x,0.03,fx(RING_FS));g.position.z=ALLY_POS[i].z;return g;});
  L.decal.add(foot,shock,...aRings);

  const bc=V3(0,0,0), tp=V3(0,0,0), g0=V3(0,0,0), g1=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, k=ss(0.03,TI,te), end=1-ss(TF,TE,te);
    // burbuja: nace sobre la cabeza, baja y se infla hasta envolver a Pomodoro
    bc.lerpVectors(B0,SC,k); const br=0.08+(BR-0.08)*k, w=Math.sin(te*28)*0.06*(1-k*0.6), pop=1+0.06*ss(TI,TI+0.12,te);
    bubble.visible=te<TI+0.12; bubble.position.copy(bc); bubble.scale.set(br*(1+w)*pop,br*(1-w)*pop,br*(1+w)*pop);
    set(bubble,ss(TI-0.06,TI,te)*(1-ss(TI,TI+0.12,te)),ss(0,0.06,te)*(1-ss(TI,TI+0.12,te)));
    const ma=ss(0.08,0.2,te)*(1-ss(TI-0.04,TI+0.06,te));
    moon.visible=ma>0.001; towardCam(moon.position,tp.copy(bc).add(V3(0,0.12*br,0)),0.05); billboard(moon,0.3+0.15*Math.sin(te*3));
    moon.scale.setScalar(Math.max(br*0.8,0.001)); moon.material.uniforms.uA.value=ma;
    uB.value.set(bc.x,bc.y,bc.z,br); uBA.value=ma;
    // escudo propio: se arma desde arriba, late al soltar las burbujitas y queda más tenue
    const su=shield.material.uniforms;
    shield.visible=te>=TI; su.uP.value=cl(ia/0.14)*1.25; su.uH.value=te>=TB?te-TB:-1;
    su.uA.value=ss(TI,TI+0.03,te)*(1-0.35*ss(TB,TB+0.15,te))*end;
    set(foot,ss(TI,TI+0.15,te),ss(TI,TI+0.05,te)*(1-ss(0.75,1.0,te)));
    let p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    // burbujitas viajeras
    for(const m of flyers){const d=m.userData,P=paths[d.i];let q=cl((te-d.t0)/(d.t1-d.t0));q=q*q*(3-2*q);
      m.visible=te>=d.t0&&te<d.t1+0.05; qbez(P.S,P.M[d.j],P.E,q,m.position);
      const sc=d.r*ss(d.t0,d.t0+0.06,te)*(1-ss(d.t1-0.02,d.t1+0.05,te))*(1+0.08*Math.sin(te*30+d.j*2));
      m.scale.set(Math.max(sc,0.001),Math.max(sc*(1-0.08*Math.sin(te*24+d.j)),0.001),Math.max(sc,0.001));}
    set({material:smallMat},0.25,1);
    // escuditos de los aliados (+20): breves
    AS.forEach((m,i)=>{const u=m.material.uniforms;m.visible=te>=TA;u.uP.value=cl((te-TA)/0.12)*1.25;u.uH.value=te>=TA?te-TA:-1;
      u.uA.value=ss(TA-0.01,TA+0.03,te)*(1-ss(0.98,TE,te));
      const r=cl((te-TA)/0.35); set(aRings[i],r,te>=TA?(1-r)*0.8:0);
      const dm=allies[i].userData.m; dm.emissive.copy(U.uC1.value); dm.emissiveIntensity=te>=TA?0.6*Math.exp(-(te-TA)*7)+0.15*end:0;});
    // Pomodoro: vaivén soñador y leve rebote al cerrarse el escudo
    const e2=ia>=0?Math.exp(-ia*10):0;
    caster.rotation.z=0.06*Math.sin(te*6)*(1-ss(TI,TI+0.2,te));
    caster.scale.set(1+0.07*e2,1-0.06*e2,1+0.07*e2);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=(0.25*k+0.5*e2)*end;
    // resplandor y luz
    if(te<TI){o.g.copy(bc);o.gs=0.8+1.4*k;o.ga=0.1+0.35*k;o.li=1.5+2.5*k;}
    else if(te<TB){const e=Math.exp(-ia*8);o.g.copy(SC);o.gs=2.4+1.5*ia;o.ga=0.15+0.5*e;o.li=2.5+6*e;}
    else if(te<TA+0.06){const q=cl((te-TB)/(TA-TB));qbez(paths[0].S,paths[0].M[1],paths[0].E,q,g0);qbez(paths[1].S,paths[1].M[1],paths[1].E,q,g1);
      o.g.copy(g0).lerp(g1,0.5);o.gs=1.6;o.ga=0.25;o.li=3;}
    else{const e=Math.exp(-(te-TA)*6);o.g.set((ALLY_POS[0].x+ALLY_POS[1].x)/2,0.8,(ALLY_POS[0].z+ALLY_POS[1].z)/2);o.gs=2.2;o.ga=(0.1+0.3*e)*end;o.li=(1.5+4*e)*end;}
    o.ia=ia;o.c.copy(SC);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 2 · VILLAGE HERO — carrera, tajo heroico con capa dorada y destello; cada aliado con escudo lanza una chispa
//     que llega a la hoja justo antes del impacto y se suma al golpe
// =====================================================================
const hero={key:"starter_pomodoro_back",name:"Village Hero",dur:0.7,ti:0.28,pal:"Sagrado",tier:2,allies:2,
  phases:[["Carrera",0],["Tajo",0.2],["Impacto",0.28],["Disipación",0.4]],
build(a){
  const L=a.L,XC=1.9,T0=0.2,SW=0.08,TI=0.28,TD=0.15,CH=V3(3.12,1.2,0),LA=[0.04,0.08],RA=[0.24,0.27];
  const cx=te=>{const k=cl(te/TD);return -3.7+(XC-0.2+3.7)*(1-Math.pow(1-k,3))+0.3*ss(T0,T0+0.06,te)-(XC+0.1+3.7)*ss(0.42,0.68,te);};
  // plano del corte inclinado, centrado en el punto de golpe del lanzador
  const tilt=k=>{const g=new THREE.Group();g.position.set(XC,1.15,0);g.rotation.set(0.38,0,0.1);L[k].add(g);return g;};
  const tMesh=tilt("mesh"), tPart=tilt("part"), tTrail=tilt("trail");
  const arcGeo=new THREE.RingGeometry(0.55,1.7,80,1,-2.3,4.6).rotateX(-Math.PI/2);
  const ARC=`float ang=atan(-vP.z,vP.x);float rr=(length(vP.xz)-.55)/1.15;float d=ang-uP;`;
  // tajo-capa: tela dorada con pliegues que ondean y cola deshilachada
  const cape=new THREE.Mesh(arcGeo,fx(`
  void main(){${ARC}float t=d/2.;if(d<0.||t>1.)discard;
   float fold=.5+.5*sin(ang*13.+rr*4.-uT*18.);
   float tat=noise(vec3(ang*7.,rr*5.,uT*3.));
   float cut=smoothstep(0.,.15,tat+(1.-t)*.7-.45);
   float prof=pow(rr,.6+2.5*t)*smoothstep(1.,.94,rr)*cut;
   vec3 c=mix(${GOLD}*.75,uC1,fold*.6+pow(rr,4.)*.6)*1.6+vec3(1.)*pow(rr,8.)*(1.-t)*.8;
   c=mix(c,uC2*1.3,(1.-rr)*.35*t);
   float al=min(prof*(.55+.45*fold)*(1.-t)*1.8,1.)*uA*smoothstep(0.,.04,d);
   gl_FragColor=vec4(c,al);}`));
  const edge=new THREE.Mesh(arcGeo,fx(`
  void main(){${ARC}float t=d/.6;if(d<0.||t>1.)discard;
   float al=smoothstep(.86,.95,rr)*smoothstep(1.,.98,rr)*(1.-t)*uA;
   gl_FragColor=vec4(mix(${GOLD},vec3(1.),.7)*1.8,al);}`));
  tTrail.add(cape); tMesh.add(edge);
  // destello dorado del golpe: rayos en cruz + anillo
  const glint=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rays=pow(abs(cos(an*2.)),60.)*exp(-r*2.2)+pow(abs(cos(an*2.+.785)),90.)*exp(-r*4.)*.6;
   float core=exp(-r*7.);float ring=band(r,uP*.9,.05)*(1.-uP);
   gl_FragColor=vec4(mix(${GOLD},vec3(1.),core*.7+.2)*1.7,(rays+core+ring*.8)*uA);}`,{depthTest:false}));
  // anillos de bonus: uno por chispa de aliado que llega a la hoja
  const bonus=[0,1].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(RING_FS,{depthTest:false})));
  L.mesh.add(glint,...bonus);
  // brillo leve de escudo en ambos aliados (late al soltar su chispa)
  const AS=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.72,32,18,0,Math.PI*2,0,Math.PI*0.85),fxU(HEX_FS(14,6),{uH:{value:-1}}));
    m.position.set(ALLY_POS[i].x,0.68,ALLY_POS[i].z);m.material.uniforms.uP.value=1.25;L.mesh.add(m);return m;});
  // estela de carrera: dos planos cruzados con pliegues de capa
  const sg=new THREE.PlaneGeometry(1,0.9).translate(-0.5,0,0);
  const sm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float fold=.5+.5*sin(u*22.-uT*30.+vUv.y*3.);float n=noise(vec3(u*6.-uT*12.,v*3.,uT));
   float al=smoothstep(u*(.6+.35*n),0.,v)*u*u*uA;
   gl_FragColor=vec4(mix(${GOLD}*.7,uC1,fold)*1.5+vec3(1.)*smoothstep(.2,0.,v)*u*.4,al*(.6+.4*fold));}`);
  const streak=new THREE.Group(), s2=new THREE.Mesh(sg,sm); s2.rotation.x=Math.PI/2;
  streak.add(new THREE.Mesh(sg,sm),s2); L.trail.add(streak);

  // partículas
  const C=`const float TD=${f(TD)};const float T0=${f(T0)};const float TI=${f(TI)};const vec3 CH=${v3(CH)};
  float cx(float t){float k=clamp(t/TD,0.,1.);return -3.7+${f(XC-0.2+3.7)}*(1.-pow(1.-k,3.));}`;
  let n=0;
  n+=points(L.part,80,C+`void main(){float s=aSeed.x*TD;float life=.18+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s),.3+aSeed.z*1.3,r.z*.35)+vec3(-1.2*t,.6*t,r.y*.3*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.04*aSeed.w)*(1.-age*.5));}`);
  n+=points(tPart,120,`void main(){float s=aSeed.x;float life=.18+aSeed.y*.22;float age=(uT-${f(T0)}-s*${f(SW)})/life;
   float th=2.-4.2*s;float r=1.5+.25*aSeed.z;
   vec3 p=vec3(cos(th),0.,-sin(th))*(r+age*life*1.6)+vec3(0.,(aSeed.w-.5)*.2-age*age*.25,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.05*aSeed.z)*(1.-age));}`);
  n+=sparks(L.part,150,TI,`${f(CH.x)},${f(CH.y)},0.`,".7,.25,.5",3,9,3.2);
  n+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.08;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.5,.5,0.));vec3 p=CH+d*(.2+.9*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.1+.08*aSeed.w);}`,STAR4_FS);
  // chispa de cada aliado: cabeza estrellada + estela, curva hasta el punto de golpe
  const SP=[0,1].map(i=>{const A=ALLY_POS[i].clone().add(V3(0.15,1.05,0)),M=A.clone().lerp(CH,0.5).add(V3(0,1.4+0.3*i,0));
    const PC=C+`const vec3 PA=${v3(A)};const vec3 PM=${v3(M)};const float LA=${f(LA[i])};const float RA=${f(RA[i])};
    vec3 bz(float k){return mix(mix(PA,PM,k),mix(PM,CH,k),k);}
    float ek(float t){float k=clamp((t-LA)/(RA-LA),0.,1.);return k*k*(1.5-.5*k);}`;
    n+=points(L.part,70,PC+`void main(){float s=LA+aSeed.x*(RA-LA);float life=.14+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=bz(ek(s))+rnd()*.05+rnd()*.25*t;
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.04*aSeed.z)*(1.-age*.5));}`);
    n+=points(L.part,5,PC+`void main(){vec3 p=bz(ek(uT))+rnd()*.03;
     vA=(uT>=LA&&uT<RA)?1.:0.;put(p,.16+.1*aSeed.z);}`,STAR4_FS);
    n+=sparks(L.part,35,RA[i],`${f(CH.x)},${f(CH.y)},0.`,"-.4,.3,0.",2,6,2.5);
    return {A,M};});
  a.count+=n;
  // suelo: onda bajo el rival (sigue su retroceso) y aro bajo cada aliado al soltar su chispa
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  const aRings=[0,1].map(i=>{const g=groundPlane(1.8,ALLY_POS[i].x,0.03,fx(RING_FS));g.position.z=ALLY_POS[i].z;return g;});
  L.decal.add(shock,...aRings);
  a.root.updateMatrixWorld(true);

  a.pose=function(te,o){
    const ia=te-TI, s=cl((te-T0)/SW), head=2.0-4.2*s, after=te-T0-SW, x=cx(te);
    caster.position.x=x;
    caster.rotation.z=-0.25*ss(0,TD,te)+0.45*ss(TD,T0,te)-0.5*ss(T0,T0+0.06,te)+0.3*ss(0.4,0.6,te);
    // estela de carrera
    streak.visible=te<0.32; streak.position.set(x,1.0,0); streak.scale.set(Math.max(x+3.7,0.001),1,1);
    sm.uniforms.uA.value=1-ss(TD,0.32,te);
    // tajo-capa
    const ra=te<T0?0:(after>0?1-cl(after/0.22):1);
    set(cape,head,ra); set(edge,head,te<T0||after>0.05?0:1);
    // destello y bonus
    towardCam(glint.position,CH,0.5); billboard(glint,0.2); glint.scale.setScalar(1+0.6*cl(ia/0.2));
    set(glint,cl(ia/0.3),ia>=0?Math.exp(-ia*7):0);
    bonus.forEach((m,i)=>{const p=cl((te-RA[i])/0.25);m.visible=te>=RA[i]&&p<1;towardCam(m.position,CH,0.45);billboard(m);set(m,p,1-p);});
    // aliados con escudo: brillo tenue que late al soltar la chispa
    AS.forEach((m,i)=>{const u=m.material.uniforms,lp=te-LA[i];u.uA.value=0.4+(lp>=0?0.5*Math.exp(-lp*8):0);u.uH.value=lp>=0?lp:-1;
      const r=cl(lp/0.3); set(aRings[i],r,lp>=0?(1-r)*0.7:0);
      const dm=allies[i].userData.m; dm.emissive.copy(U.uC2.value); dm.emissiveIntensity=0.15+(lp>=0?0.6*Math.exp(-lp*10):0);});
    // reacción del objetivo
    const hit=ia>=0?Math.exp(-ia*5):0;
    target.position.x=3.4+hit*0.35*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.3*Math.cos(ia*15);
    shock.position.x=target.position.x; const p=cl(ia/0.35); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    if(ia>=0){o.g.copy(CH);o.gs=1.3+4*ia;o.ga=Math.exp(-ia*12)*0.75;o.li=11*Math.exp(-ia*6);}
    else if(te>=T0){o.g.set(Math.cos(head)*1.6,0,-Math.sin(head)*1.6);tMesh.localToWorld(o.g);o.gs=1.1;o.ga=0.55;o.li=3.5;}
    else{o.g.set(x+0.3,1.1,0);o.gs=1.0;o.ga=0.35;o.li=2.5;}
    o.ia=ia;o.c.copy(CH);o.shake=0;o.dist=0.75;o.flash=1;
  };
}};

VFX.module("Starter · Pomodoro",[dream,hero]);
})();

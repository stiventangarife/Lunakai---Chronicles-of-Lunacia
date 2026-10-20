// =====================================================================
// MÓDULO · CLASE REPTIL (OJOS)
// Estética de clase: escamas, veneno púrpura, piedra y gema, sangre fría, humo de embrujo. No se dibujan ojos ni
// crestas del Axie: lo que "sale de los ojos" son proyecciones de energía temporales (glifos de pupila, destellos de
// gema, una cicatriz de luz oscura, una cresta de fuego espectral). Nivel por PA: 1 rápido, 2 firme, 3 pesado.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,CROSS_FS,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0);                                   // pecho del objetivo
const tmp=V3(0,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const glowOn=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const SOFTBURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;
// destello de cuatro puntas en malla billboard
const GLINT_FS=`void main(){vec2 q=abs(vUv-.5)*2.;float s=smoothstep(.1,0.,q.x*q.y*7.+min(q.x,q.y)*1.2)*smoothstep(1.,.15,max(q.x,q.y));
 float c=smoothstep(.4,0.,length(q));gl_FragColor=vec4(mix(uC1,vec3(1.),.4+.4*c)*1.5,(s+c*.8)*uA);}`;
// esquirla de piedra que gira (mezcla normal), filo teñido por la paleta
const ROCK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);vec2 k=abs(q);
 float d=max(k.x*1.1+k.y*.6,k.y*1.3);float a=smoothstep(.42,.36,d)*vA;if(a<.003)discard;
 float face=step(0.,q.x+q.y*.3);
 gl_FragColor=vec4(mix(vec3(.3,.28,.32),vec3(.62,.6,.62),face)+uC1*smoothstep(.3,.4,d)*.8,a);}`;

// =====================================================================
// 1 · PUNKY (3 PA, pasiva) — sobre la cabeza se enciende una cresta mohicana de púas de fuego espectral violeta;
//     ruge y un muro de fuego en anillo barre el campo; cada rival que alcanza arde en llamas violetas y queda
//     envenenado. Fractura de baldosa bajo el rival principal
// =====================================================================
const punky={key:"rjPunky",name:"Punky",pa:3,dur:3.2,ti:1.3,pal:"Miasma",enemies:2,
  phases:[["Ignición",0],["Cresta",0.55],["Rugido",1.05],["Veneno",1.3],["Ascuas",2.0],["Fin",2.7]],
build(a){
  const L=a.L,TC0=0.12,TR=1.05,TI=1.3,TA=2.0,TE=2.7,TF=3.2,CX=-3.7,SPD=28.4,RMAX=11.5;
  const RP=[V3(3.4,0,0),ENEMY_POS[0],ENEMY_POS[1]], RV=[target,enemies[0],enemies[1]];
  const RT=RP.map(P=>TR+Math.hypot(P.x-CX,P.z)/SPD);
  // cresta: siete púas de fuego espectral sobre la línea de la cabeza (de delante hacia atrás)
  const flameMat=fx(`void main(){float h=vP.y;float an=atan(vP.z,vP.x);
   vec3 q=vec3(vP.x*7.,h*3.-uT*4.5,vP.z*7.);float n=noise(q*1.6)*.6+noise(q*3.4+vec3(0.,-uT*3.,2.))*.4;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float fl=n-h*.85+.45+.25*uP;float al=smoothstep(0.,.25,fl)*(.35+.65*fr);float hot=smoothstep(.25,.6,fl);
   gl_FragColor=vec4(mix(uC2,uC1,hot)*1.5+vec3(1.)*smoothstep(.55,.85,fl)*.5,al*uA);}`);
  const flG=new THREE.ConeGeometry(0.13,1,16,8,true).translate(0,0.5,0);
  const crest=[];for(let i=0;i<7;i++){const x=-3.48-i*0.075,dx=x-CX,m=new THREE.Mesh(flG,flameMat);
    m.position.set(x,1.6+Math.sqrt(Math.max(0.0729-dx*dx,0))-0.04,0);m.rotation.z=0.12+0.3*i/6;
    m.userData={h:0.75+0.55*Math.sin(Math.PI*(i+0.5)/7),t:TC0+i*0.06,i,lx:dx,ly:m.position.y,rz:m.rotation.z};L.mesh.add(m);crest.push(m);}
  // muro de fuego en anillo que barre el campo desde el Axie
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,96,1,true).translate(0,0.5,0),fx(`
  void main(){float h=vP.y;vec3 q=vec3(vP.x*6.,h*2.5-uT*5.,vP.z*6.);float n=noise(q)*.6+noise(q*2.3)*.4;
   float fl=n-h*1.1+.45;float al=smoothstep(0.,.25,fl);float hot=smoothstep(.3,.65,fl);
   gl_FragColor=vec4(mix(uC2,uC1,hot)*1.5,al*uA*(1.-h));}`));
  wall.position.set(CX,0,0);
  L.mesh.add(wall);

  const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float TA=${f(TA)};const float TC0=${f(TC0)};const float CX=${f(CX)};const float SPD=${f(SPD)};const vec3 HP=${v3(TC)};
  const vec3 R0=${v3(RP[0])};const vec3 R1=${v3(RP[1])};const vec3 R2=${v3(RP[2])};
  vec3 rp(float x){return x<.333?R0:(x<.666?R1:R2);}
  float rt(float x){return x<.333?${f(RT[0])}:(x<.666?${f(RT[1])}:${f(RT[2])});}`;
  // chispas que suben de la cabeza al encenderse
  a.count+=points(L.part,120,C+`void main(){float s=aSeed.x*TR;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-3.48-aSeed.z*.45,1.9,(aSeed.w-.5)*.2)+vec3(sin(t*6.+aSeed.w*9.)*.12,t*(1.8+1.2*aSeed.y),0.);
   vA=(age>0.&&age<1.&&uT>TC0+aSeed.z*.4)?(1.-age)*(.55+.45*sin(t*30.+aSeed.x*40.)):0.;put(p,.035+.04*aSeed.w);}`);
  // lenguas de fuego que se desprenden de la cresta
  a.count+=points(L.part,200,C+`void main(){float s=TC0+aSeed.x*(TA-TC0);float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=aSeed.z;vec3 p=vec3(-3.48-k*.45,1.95+.3*aSeed.w,(aSeed.w-.5)*.15)+vec3(-.25*t,(1.4+1.6*(1.-abs(k-.5)*2.))*t,0.);
   float boost=1.+.8*step(TR,s)*exp(-(s-TR)*3.);
   vA=(age>0.&&age<1.&&s>TC0+k*.4)?(1.-age):0.;put(p,(.16+.14*aSeed.w)*(1.-age*.5)*boost);}`,FLAME_FS);
  // llamas que brotan a lo largo del frente del anillo
  a.count+=points(L.part,260,C+`void main(){float s=TR+aSeed.x*.4;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float R=(s-TR)*SPD;vec3 p=vec3(CX+cos(an)*R,.05+t*1.4,sin(an)*R);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.22+.2*aSeed.w)*(1.-age*.4));}`,FLAME_FS);
  // cada rival arde en llamas violetas al llegar el anillo
  a.count+=points(L.part,180,C+`void main(){vec3 P=rp(aSeed.y);float s=rt(aSeed.y)+aSeed.x*.3;float life=.4+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=P+vec3(cos(an)*.5,.1+t*1.6+aSeed.z*.6,sin(an)*.5);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.2+.16*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
  // veneno: burbujas que gotean de cada rival
  a.count+=points(L.part,90,C+`void main(){vec3 P=rp(aSeed.y);float s=rt(aSeed.y)+.2+aSeed.x*.9;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vec3(P.x+cos(an)*.42,.35+aSeed.z*1.2-.5*t*t,P.z+sin(an)*.42);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;put(p,.07+.06*aSeed.w);vMix=.85;}`,BUBBLE_FS);
  a.count+=sparks(L.part,200,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.4,.5,0.",4,12,3.2);
  a.count+=points(L.part,80,C+`void main(){float s=TI+.05+aSeed.x*.5;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HP+rnd()*vec3(.4,.5,.4)+vec3(.15*t,.7*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.55:0.;put(p,(.3+.26*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.12,.05,.16)"),NB);

  // suelo: anillo de fuego que sigue al muro, fractura bajo el rival y quemaduras suaves bajo los otros dos
  const fring=groundPlane(2,CX,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*30.,uT*2.));
   float m=band(r,.97,.025)*(.6+.4*n)+smoothstep(.97,.6,r)*step(r,.97)*.06;
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.5,m*uA);}`));
  const FS=7.2, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  const burns=[1,2].map(i=>{const m=groundPlane(2.2,RP[i].x,0.015,fx(SOFTBURN_FS));m.position.z=RP[i].z;return m;});
  const shock=groundPlane(6.5,3.4,0.03,fx(RING_FS));
  const crown=groundPlane(2.2,CX,0.02,fx(SOFTBURN_FS));
  L.decal.add(fring,frac,shock,crown,...burns);

  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR, ign=ss(TC0,0.55,te), fade=1-ss(TA,TE,te), roar=hitK(ir,2.5);
    // el Axie embiste con la cabeza al rugir
    caster.rotation.z=0.08*ss(0.2,TR-0.1,te)-0.3*ss(TR-0.08,TR,te)*(1-ss(TR+0.25,TR+0.8,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*ign*fade+0.7*roar;
    crest.forEach(m=>{const u=m.userData,g=ss(u.t,u.t+0.18,te)*fade;m.visible=g>0.001;
      const fl=1+0.08*Math.sin(te*13+u.i*2.1);m.scale.set(Math.max(g,0.001)*(1+0.3*roar),Math.max(u.h*g*fl*(1+0.45*roar),0.001),Math.max(g,0.001)*(1+0.3*roar));
      // sigue la inclinación del Axie (gira en torno a su base)
      const th=caster.rotation.z,c=Math.cos(th),s=Math.sin(th);m.position.set(CX+u.lx*c-u.ly*s,u.lx*s+u.ly*c,0);m.rotation.z=u.rz+th;});
    flameMat.uniforms.uP.value=0.3+0.7*roar; flameMat.uniforms.uA.value=1;
    const R=ir>=0?ir*SPD:0; wall.visible=ir>=0&&R<RMAX;
    wall.scale.set(Math.max(R,0.001),0.25+0.85*(1-R/RMAX),Math.max(R,0.001)); wall.material.uniforms.uA.value=ss(0,0.05,ir)*(1-R/RMAX);
    fring.visible=wall.visible; fring.scale.set(Math.max(R,0.001),1,Math.max(R,0.001)); fring.material.uniforms.uA.value=wall.material.uniforms.uA.value;
    crown.material.uniforms.uA.value=0.8*ign*fade;
    // reacción de cada rival al paso del anillo
    RV.forEach((d,i)=>{const it=te-RT[i],h=hitK(it,i?6:3.2),burn=ss(RT[i],RT[i]+0.15,te)*(1-ss(TA,TF,te));
      d.position.x=RP[i].x+(i?0.18:0.5)*h*(1-Math.exp(-Math.max(it,0)*20));d.rotation.z=-h*(i?0.25:0.45)*Math.cos(it*13);
      if(i){glowOn(d,1.1*hitK(it,9)+0.18*burn);set(burns[i-1],0,0.9*burn);burns[i-1].position.x=d.position.x;}});
    o.em=0.18*ss(TI,TI+0.15,te)*(1-ss(TA,TF,te)); o.emc.copy(U.uC1.value);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.55),2),ia>=0?1-ss(TI+1.1,TE+0.2,te):0);
    let p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0); shock.position.x=target.position.x;
    if(te<TR){o.g.set(-3.72,2.4,0);o.gs=1.6*ign;o.ga=0.4*ign;o.li=4*ign;}
    else if(te<TI){o.g.set(CX+R,0.6,0);o.gs=2.4;o.ga=0.6;o.li=7;}
    else{o.g.copy(TC);o.gs=2.2+6*Math.min(ia,0.5);o.ga=0.95*hitK(ia,8)+0.1*fade;o.li=15*hitK(ia,4)+1.5*fade;}
    o.ia=ia;o.c.copy(TC);o.shake=1.5;o.dist=1.2;
  };
}};

// =====================================================================
// 2 · SCAR (1 PA, Banish) — una cicatriz de energía oscura se traza en zigzag sobre el ojo y estalla; dos venas
//     rubí recorren el cuerpo hasta la zona de los cuernos y de la cola y las "reactivan" con un destello; la
//     cicatriz se consume en ceniza (habilidad desterrada)
// =====================================================================
const scar={key:"rjScar",name:"Scar",pa:1,dur:1.2,ti:0.3,pal:"Rubí",
  phases:[["Cicatriz",0],["Despertar",0.3],["Reactivación",0.52],["Fin",0.9]],
build(a){
  const L=a.L,TD=0.04,TI=0.3,TV=0.52,TE=0.9,TF=1.2,SE=V3(-3.44,1.77,0.12),HT=V3(-3.6,2.02,0),TT=V3(-4.15,0.7,0);
  const CH=V3(-3.46,2.05,0.25), CT=V3(-3.5,1.1,0.42);
  const SCAR=`float scarD(vec2 uv,out float w){float u=uv.x;float y=(uv.y-.5)*2.;w=.2*sin(3.14159*u)+.03;return abs(y-(.07*sin(u*9.)+.05*(abs(fract(u*6.5)*2.-1.)*2.-1.))*sin(3.14159*u));}`;
  const sDark=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.22),fx(SCAR+`void main(){float w;float d=scarD(vUv,w);
   gl_FragColor=vec4(vec3(.04,0.,.01),smoothstep(w*1.5,w*.6,d)*step(vUv.x,uP)*.9*uA);}`,Object.assign({depthTest:false},NB)));
  const sGlow=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.22),fxU(SCAR+`uniform float uQ;void main(){float w;float d=scarD(vUv,w);float u=vUv.x;
   float rev=step(u,uP);float core=smoothstep(w*.45,0.,d)*rev;float rim=band(d,w*1.2,w*.35)*rev;
   float head=smoothstep(.07,0.,abs(u-uP))*step(uP,.99)*smoothstep(w*2.5,0.,d);float n=noise(vec3(u*12.-uT*5.,vUv.y*3.,uT));
   float st=band(fract(u*6.),.5,.035)*step(.12,u)*step(u,.88)*smoothstep(.75,.3,abs(vUv.y-.5)*2.)*rev;
   gl_FragColor=vec4(mix(uC2,uC1,core+n*.3)*1.7+vec3(1.)*(head+core*uQ)*.6,(core*(.6+.6*uQ)+rim*(.4+.4*n)+head+st*.7)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  sDark.renderOrder=1; sGlow.renderOrder=2; L.mesh.add(sDark,sGlow);

  const C=`const float TD=${f(TD)};const float TI=${f(TI)};const float TV=${f(TV)};const float TE=${f(TE)};
  const vec3 SE=${v3(SE)};const vec3 HT=${v3(HT)};const vec3 TT=${v3(TT)};const vec3 CH=${v3(CH)};const vec3 CT=${v3(CT)};`+QB;
  // motas oscuras que acompañan el trazo
  a.count+=points(L.part,50,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-TD)/(TI-TD);vec3 p=SE+vec3((k-.5)*.42,(.5-k)*.3,.05)+rnd()*.03+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  // venas rubí hacia la zona de cuernos y de cola
  a.count+=points(L.part,100,C+`void main(){bool hn=aSeed.y<.5;float s=TI+aSeed.x*(TV-TI-.02);float life=.22+aSeed.z*.12;float age=(uT-s)/life;
   float k=(s-TI)/(TV-TI);vec3 p=(hn?qb(SE,CH,HT,k):qb(SE,CT,TT,k))+rnd()*.025;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.03*aSeed.w)*(1.-age*.4));}`);
  a.count+=sparks(L.part,30,TV,`${f(HT.x)},${f(HT.y)},0.`,"0.,.6,0.",1.2,3.5,2);
  a.count+=sparks(L.part,30,TV,`${f(TT.x)},${f(TT.y)},0.`,"-.5,.3,0.",1.2,3.5,2);
  a.count+=points(L.part,30,C+`void main(){bool hn=aSeed.y<.5;float s=TV+aSeed.x*.08;float life=.3+aSeed.z*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 P=hn?HT:TT;vec3 p=P+normalize(rnd()+.001)*(.05+.3*aSeed.w)*(1.-exp(-t*6.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.1*aSeed.w)*(1.-age*.6));}`,STAR4_FS);
  // aura oscura (mezcla normal) y ceniza de la cicatriz consumida
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*(TE-TI);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.45,.2+aSeed.w*1.5+.6*t,sin(an)*.45);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.45:0.;put(p,(.18+.14*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.09,.02,.03)"),NB);
  a.count+=points(L.part,40,C+`void main(){float s=TE-.25+aSeed.x*.35;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=SE+vec3((aSeed.z-.5)*.45,(aSeed.w-.5)*.2,.05)+vec3(.1*t,.5*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.035*aSeed.w);}`,CHIP_FS);

  a.pose=function(te,o){
    const ia=te-TI, iv=te-TV, draw=ss(TD,TI,te), life=ss(TD,TD+0.04,te)*(1-ss(TE-0.15,TE+0.1,te));
    for(const m of [sDark,sGlow]){towardCam(m.position,SE,0.32);billboard(m,-0.6);m.visible=life>0.001;set(m,draw*1.01,life);}
    sGlow.material.uniforms.uQ.value=hitK(ia,6)+0.5*hitK(iv,8);
    caster.rotation.z=0.09*hitK(ia,8)*Math.cos(Math.max(ia,0)*20)-0.05*hitK(iv,7);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    cm.emissiveIntensity=0.55*hitK(ia,5)+0.45*hitK(iv,6)+0.12*(0.6+0.4*Math.sin(te*25))*ss(TI,TI+0.05,te)*(1-ss(TE,TF,te));
    if(te<TV){o.g.copy(SE);o.gs=0.6+0.8*draw;o.ga=0.35*draw+0.4*hitK(ia,10);o.li=1.5*draw+4*hitK(ia,6);}
    else{o.g.set(-3.85,1.35,0);o.gs=1.6;o.ga=0.35*hitK(iv,7);o.li=4*hitK(iv,5)+0.4*life;}
    o.ia=iv>=0?iv:ia;o.c.copy(SE);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 3 · TOPAZ (2 PA) — dos destellos de gema topacio facetada brotan frente a los ojos y canalizan rayos
//     cristalinos; el rival se petrifica desde el punto del rayo (coraza de piedra con vetas de gema), queda inmóvil
//     y la piedra se quiebra en esquirlas
// =====================================================================
const topaz={key:"rjTopaz",name:"Topaz",pa:2,dur:2.2,ti:0.7,pal:"Estelar",
  phases:[["Gema",0],["Rayos",0.4],["Petrificación",0.7],["Piedra",1.25],["Quiebre",1.6],["Fin",1.95]],
build(a){
  const L=a.L,TB=0.4,TI=0.7,TP=1.25,TK=1.6,TE=1.95,TF=2.2,X=3.4,HP=V3(3.02,1.35,0);
  const EY=[V3(-3.47,1.66,0.1),V3(-3.47,1.66,-0.1)];
  // destello de gema: hexágono facetado con rayos (proyección, no el ojo)
  const gemFS=`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float hex=max(q.x*.866+q.y*.5,q.y)-.42;
   float an=atan(p.y,p.x);float fac=step(.5,fract(an/6.2832*6.+.083));
   float fill=smoothstep(.02,-.02,hex);float rim=band(hex,0.,.04);
   float rays=smoothstep(.08,0.,q.x*q.y*5.+min(q.x,q.y)*.8)*smoothstep(1.,.2,max(q.x,q.y));
   gl_FragColor=vec4(mix(uC2,uC1,.4+.4*fac)*1.6*fill+vec3(1.)*(rim*.6+rays),(fill*(.45+.3*fac)+rim+rays*uP)*uA);}`;
  const gems=EY.map(()=>new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42),fx(gemFS)));
  // rayos de petrificación: tubo fino con facetas que fluyen hacia el rival
  const beamFS=`void main(){float h=vP.y;if(h>uP)discard;float c=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
   float st=step(.5,fract(h*30.-uT*12.));float n=noise(vec3(h*40.-uT*30.,0.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*st)*1.6+vec3(1.)*c*.4,c*(.6+.4*n)*uA);}`;
  const bG=new THREE.CylinderGeometry(0.06,0.06,1,12,1,true).translate(0,0.5,0);
  const beams=EY.map(E=>{const m=new THREE.Mesh(bG,fx(beamFS)),d=V3(0,0,0).copy(HP).sub(E);m.position.copy(E);m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(YA,d.normalize());return m;});
  // coraza de piedra: avanza desde el punto del rayo (uP, en unidades locales), vetas de topacio, se quiebra (uQ)
  const stoneFS=(hl,off)=>`uniform float uQ;
  float vor(vec2 x){vec2 i=floor(x),fp=fract(x);float d1=8.,d2=8.;
   for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 o=vec2(float(a),float(b));vec2 h=vec2(hash(vec3(i+o,1.)),hash(vec3(i+o,7.)));float d=length(o+h-fp);
    if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return d2-d1;}
  void main(){float dist=length(vP-${hl})+${f(off)};if(dist>uP)discard;
   float n=noise(vP*9.)*.6+noise(vP*23.)*.4;
   vec3 st=mix(vec3(.28,.26,.3),vec3(.62,.58,.6),n)*(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))));
   float e=vor(vec2(atan(vP.z,vP.x)*2.2,vP.y*4.));float vein=smoothstep(.06,0.,e);
   float front=smoothstep(.12,0.,uP-dist)*step(uP,1.9);
   float dz=noise(vP*6.+3.)-uQ*1.15+.08;if(dz<0.)discard;float cr=smoothstep(.1,0.,dz)*step(.001,uQ);
   gl_FragColor=vec4(st+uC1*(vein*(.3+uA*.8)+front*1.6+cr*2.)+uC2*vein*.3,1.);}`;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.5,1.32,32,1,true),fxU(stoneFS("vec3(-.45,.69,0.)",0),{uQ:{value:0}},SOLID));
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.33,28,18),fxU(stoneFS("vec3(-.3,-.2,0.)",0.22),{uQ:{value:0}},SOLID));
  body.position.set(X,0.66,0); head.position.set(X,1.6,0);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS));
  L.mesh.add(...gems,...beams,body,head,hitRing);

  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const float TP=${f(TP)};const float TK=${f(TK)};const vec3 HP=${v3(HP)};
  const vec3 E0=${v3(EY[0])};const vec3 E1=${v3(EY[1])};`;
  // luz que se condensa en las gemas
  a.count+=points(L.part,60,C+`void main(){vec3 E=aSeed.y<.5?E0:E1;float s=aSeed.x*(TB-.12);float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(E+normalize(rnd()+.001)*.5,E,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.w);}`);
  // motas facetadas que viajan por los rayos
  a.count+=points(L.part,160,C+`void main(){vec3 E=aSeed.y<.5?E0:E1;float s=TB+aSeed.x*(TP-TB);float u=(uT-s)/.3;
   vec3 p=mix(E,HP,clamp(u,0.,1.))+rnd()*.04;
   vA=(u>0.&&u<1.)?sin(u*3.14159):0.;put(p,.035+.035*aSeed.w);}`);
  a.count+=sparks(L.part,100,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.6,.2,0.",2,6,2.5);
  // destellos de gema sobre la piedra que avanza
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*(TP-TI);float life=.25;float age=(uT-s)/life;
   float an=aSeed.y*6.2832;vec3 p=vec3(${f(X)}+cos(an)*.5,.1+aSeed.z*1.8,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.1*aSeed.w);}`,STAR4_FS);
  // quiebre: esquirlas de piedra y polvo
  a.count+=points(L.part,150,C+`void main(){float s=TK+aSeed.x*.25;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 o=vec3(cos(an)*.48,.1+aSeed.w*1.85,sin(an)*.48);vec3 v=normalize(vec3(o.x,.4,o.z))*(.8+1.6*aSeed.y);
   vec3 p=vec3(${f(X)},0.,0.)+o+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.09+.08*aSeed.w);vMix=aSeed.w+t*(1.+aSeed.y);}`,ROCK_FS,NB);
  a.count+=points(L.part,60,C+`void main(){float s=TK+aSeed.x*.2;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(X)}+cos(an)*(.4+.6*(1.-exp(-t*3.))),.1+aSeed.w*1.2+.2*t,sin(an)*(.4+.6*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.25+.2*aSeed.w)*(.6+age));}`,DUST_FS,NB);

  const stoneG=groundPlane(2.2,X,0.015,fx(SOFTBURN_FS)), shock=groundPlane(3.2,X,0.03,fx(RING_FS));
  L.decal.add(stoneG,shock);

  a.pose=function(te,o){
    const ia=te-TI, ik=te-TK, gm=ss(0.02,TB,te)*(1-ss(TP,TP+0.25,te));
    gems.forEach((m,i)=>{towardCam(m.position,EY[i],0.3);m.position.z+=EY[i].z*0.8;billboard(m,te*1.5*(i?-1:1));m.visible=gm>0.001;
      m.scale.setScalar(0.6+0.5*gm+0.1*Math.sin(te*20+i));set(m,0.5+0.5*hitK(te-TB,5),gm);});
    beams.forEach(m=>{m.visible=te>=TB&&te<TP+0.2;set(m,Math.min(cl((te-TB)/(TI-TB))*1.02,1.02),ss(TB,TB+0.05,te)*(1-ss(TP-0.05,TP+0.2,te)));});
    const pk=ss(TI,TP,te)*1.75, br=ss(TK,TE,te), on=te>=TI&&te<TE+0.05;
    for(const m of [body,head]){m.visible=on;set(m,pk,0.5*hitK(ia,3)+0.5*hitK(ik,6));m.material.uniforms.uQ.value=br;}
    let p=cl(ia/0.35); towardCam(hitRing.position,HP,0.3); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // rival: retrocede un pelo y queda congelado en piedra; temblor al quebrarse
    const fz=te>=TI?Math.min(cl(ia/0.12),1):0;
    target.position.x=X+0.1*fz+0.025*Math.sin(te*70)*hitK(ik,8);
    stoneG.material.uniforms.uA.value=ss(TI,TP,te)*(1-ss(TE,TF,te));
    p=cl(ik/0.5); set(shock,1-Math.pow(1-p,2),ik>=0?(1-p)*0.7:0);
    o.flash=te<TK?1:0.5;
    if(te<TB){o.g.set(-3.35,1.66,0);o.gs=0.8*gm;o.ga=0.4*gm;o.li=2.5*gm;}
    else if(te<TI){const k=cl((te-TB)/(TI-TB));o.g.set(-3.4+(HP.x+3.4)*k,1.66+(HP.y-1.66)*k,0);o.gs=1.1;o.ga=0.45;o.li=4;}
    else if(te<TK){o.g.copy(HP);o.gs=1.3+2*Math.min(ia,0.4);o.ga=0.6*hitK(ia,8)+0.15*gm;o.li=6*hitK(ia,5)+2*gm;}
    else{o.g.set(X,1.0,0);o.gs=1.6+2*Math.min(ik,0.4);o.ga=0.45*hitK(ik,8);o.li=5*hitK(ik,5);}
    o.ia=ik>=0?ik:ia;o.c.copy(HP);o.shake=0;o.dist=0.65;
  };
}};

// =====================================================================
// 4 · GECKO (1 PA) — un glifo de pupila vertical se proyecta frente al rostro; una onda de rastreo recorre la
//     cuadrícula y revela las casillas peligrosas (rayado de aviso); el Axie cede vida en dos hilos que curan y
//     limpian a los aliados
// =====================================================================
const gecko={key:"rjGecko",name:"Gecko",pa:1,dur:1.4,ti:0.42,pal:"Jade",allies:2,
  phases:[["Mirada",0],["Rastreo",0.12],["Revelación",0.42],["Cura",0.68],["Fin",1.1]],
build(a){
  const L=a.L,TS=0.12,TI=0.42,TH=0.68,TE=1.1,TF=1.4,CX=-3.7,GS=10,EP=V3(-3.36,1.68,0),CC=V3(-3.7,1.1,0);
  const A0=ALLY_POS[0],A1=ALLY_POS[1];
  // glifo de pupila: almendra con rendija vertical que se cierra (uP)
  const pupil=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float alm=max(length(p-vec2(0.,-.55))-.95,length(p-vec2(0.,.55))-.95);
   float slit=length(vec2(p.x*(3.+5.*uP),p.y*1.1))-.72;
   float rim=band(alm,0.,.05);float iris=smoothstep(.02,-.02,alm)*smoothstep(-.02,.06,slit);float sl=band(slit,0.,.05)*smoothstep(.02,-.02,alm);
   float rays=pow(abs(cos(atan(p.y,p.x)*8.)),30.)*smoothstep(.2,.9,length(p))*smoothstep(1.,.6,length(p))*.4;
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*sl)*1.5+vec3(1.)*sl*.4,(rim+iris*.3+sl*1.2+rays)*uA);}`,{depthTest:false}));
  L.mesh.add(pupil);
  // rastreo de la cuadrícula: celdas de 1 u. alineadas con la rejilla del suelo, centrado bajo el Axie
  const scan=groundPlane(GS,CX,0.021,fx(`void main(){vec2 w=vec2(${f(CX)},0.)+vec2(vUv.x-.5,.5-vUv.y)*${f(GS)};
   float r=length(w-vec2(${f(CX)},0.));float R=uP*${f(GS*0.5)};
   vec2 cell=floor(w);vec2 fp=fract(w);float edge=max(abs(fp.x-.5),abs(fp.y-.5));float ln=smoothstep(.43,.5,edge);
   float seen=step(r,R)*smoothstep(${f(GS*0.5)},${f(GS*0.36)},r);float front=band(r,R,.5)*step(uP,.99);
   vec2 cc=cell+.5;float far=step(1.5,r)*step(1.,length(cc-vec2(${f(A0.x)},${f(A0.z)})))*step(1.,length(cc-vec2(${f(A1.x)},${f(A1.z)})));
   float danger=step(.84,hash(vec3(cell,5.)))*far;
   float pul=.6+.4*sin(uT*12.+hash(vec3(cell,9.))*6.);float hatch=step(.5,fract((fp.x+fp.y)*4.-uT*1.5))*smoothstep(.5,.4,edge);
   vec3 c=mix(uC1,vec3(1.,.32,.16),danger)*1.5;
   gl_FragColor=vec4(c,(ln*(front*1.2+.16*seen)+danger*seen*(ln*1.1+hatch*.35)*pul)*uA);}`));
  const rings=[A0,A1].map(P=>{const m=groundPlane(1.6,P.x,0.03,fx(RING_FS));m.position.z=P.z;return m;});
  L.decal.add(scan,...rings);

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TH=${f(TH)};const float CX=${f(CX)};const vec3 EP=${v3(EP)};const vec3 CC=${v3(CC)};
  const vec3 A0=${v3(A0)};const vec3 A1=${v3(A1)};`+QB;
  a.count+=points(L.part,20,C+`void main(){float s=.03+aSeed.x*.15;float life=.18;float age=(uT-s)/life;
   vec3 p=EP+vec3(.12,0.,.15)+normalize(rnd()+.001)*(.15+.12*aSeed.z);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.08+.05*aSeed.w);}`,STAR4_FS);
  // motas que saltan del frente de rastreo
  a.count+=points(L.part,40,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float R=(s-TS)/(TI-TS)*${f(GS*0.5)};float an=aSeed.y*6.2832;vec3 p=vec3(CX+cos(an)*R,.05+t*.9,sin(an)*R);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.03*aSeed.w);}`);
  // dos hilos de vida del Axie a los aliados (flujo continuo)
  a.count+=points(L.part,120,C+`void main(){bool f0=aSeed.y<.5;vec3 Ad=(f0?A0:A1)+vec3(0.,1.1,0.);vec3 cp=mix(CC,Ad,.5)+vec3(0.,1.,0.);
   float s=TI+.05+aSeed.x*(TH-TI);float u=(uT-s)/.26;vec3 p=qb(CC,cp,Ad,clamp(u,0.,1.))+rnd()*.035;
   vA=(u>0.&&u<1.)?sin(u*3.14159):0.;put(p,.035+.03*aSeed.w);}`);
  // cura: cruces y motas en cada aliado; el debuff se desprende como humo oscuro
  a.count+=points(L.part,30,C+`void main(){vec3 P=aSeed.y<.5?A0:A1;float s=TH+aSeed.x*.3;float life=.55;float age=(uT-s)/life;
   vec3 p=P+vec3((aSeed.z-.5)*.8,.4+age*1.4,(aSeed.w-.5)*.8);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.14+.06*aSeed.w);}`,CROSS_FS);
  a.count+=points(L.part,60,C+`void main(){vec3 P=aSeed.y<.5?A0:A1;float s=TH+aSeed.x*.35;float life=.5;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*3.;vec3 p=P+vec3(cos(an)*.45,.1+age*1.8,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.03+.03*aSeed.w);}`);
  a.count+=points(L.part,30,C+`void main(){vec3 P=aSeed.y<.5?A0:A1;float s=TH+.08+aSeed.x*.15;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P+vec3(sin(t*9.+aSeed.z*6.)*.2,1.2+t*1.4,cos(t*9.+aSeed.z*6.)*.2);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.6:0.;put(p,(.14+.1*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.12,.1,.13)"),NB);

  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH, gz=ss(0,0.06,te)*(1-ss(TS+0.15,TI,te));
    towardCam(pupil.position,EP,0.28); billboard(pupil); pupil.visible=gz>0.001; set(pupil,ss(0,TS,te),gz);
    set(scan,ss(TS,TI,te)*1.01,ss(TS,TS+0.04,te)*(1-ss(TE-0.15,TF,te)));
    let p=cl(ih/0.4); rings.forEach(m=>set(m,1-Math.pow(1-p,2),ih>=0?(1-p)*0.7:0));
    // el Axie cede vida: brillo y ligero encogimiento; los aliados se iluminan
    const give=ss(TI,TI+0.05,te)*(1-ss(TH,TH+0.2,te));
    caster.scale.set(1,1-0.05*give,1); caster.rotation.z=0.06*gz;
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.3*give+0.15*gz;
    const hl=0.5*hitK(ih,4); glowOn(allies[0],hl); glowOn(allies[1],hl);
    if(te<TS){o.g.copy(EP);o.gs=0.6*gz;o.ga=0.35*gz;o.li=1.5*gz;}
    else if(te<TI){o.g.set(CX,0.3,0);o.gs=1.2;o.ga=0.15;o.li=2;}
    else if(te<TH){o.g.set(-3,1.6,-0.9);o.gs=1.3;o.ga=0.3*give;o.li=2.5*give;}
    else{o.g.set(-3.45,1,-1.6);o.gs=2.4;o.ga=0.3*hitK(ih,4);o.li=3*hitK(ih,4);}
    o.ia=ih>=0?ih:ia;o.c.set(CX,0.4,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 5 · TRICKY (2 PA) — guiño pícaro (destello en el ojo); dos nubes de humo violeta envuelven al Axie y al aliado y
//     dos sellos de mejora intercambian su sitio en arcos que se cruzan; el aliado suelta dos jirones oscuros
//     (debuffs purificados) y queda dentro de un escudo de rombos de arlequín
// =====================================================================
const tricky={key:"rjTricky",name:"Tricky",pa:2,dur:2.2,ti:0.95,pal:"Psicodelia",allies:1,
  phases:[["Guiño",0],["Humo",0.3],["Intercambio",0.5],["Purificar",0.95],["Escudo",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TS=0.3,TX=0.5,TI=0.95,TP=1.0,TSH=1.2,TE=1.8,TF=2.2,A=ALLY_POS[0],AC=V3(A.x,0.95,A.z);
  const CP=V3(-3.7,2.2,0),AP=V3(A.x,2.2,A.z),EYE=V3(-3.45,1.7,0.1);
  const K1=V3((CP.x+AP.x)/2,3.2,(CP.z+AP.z)/2+0.7), K2=V3((CP.x+AP.x)/2,1.6,(CP.z+AP.z)/2-0.7);
  const wink=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.55),fx(GLINT_FS,{depthTest:false}));
  // sellos de mejora: rombo con chevrón (uno apunta arriba y otro abajo al girar el billboard)
  const sigFS=`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);float dia=q.x+q.y;
   float m=band(dia,.8,.05)+band(dia,.55,.025)*.6;
   float ch=band(p.y-.15+abs(p.x)*.9,0.,.07)*step(abs(p.x),.36);
   float glow=smoothstep(1.,0.,dia)*.25;float n=noise(vec3(p*4.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.5+vec3(1.)*ch*.5,(m+ch+glow)*uA);}`;
  const sigs=[0,1].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5),fx(sigFS)));
  // escudo de rombos de arlequín que sube del suelo (uP) y tiembla como gelatina
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x)/6.2832;float h=q.y;
   vec2 g=vec2(an*10.,h*4.);vec2 r=vec2(g.x+g.y,g.x-g.y);vec2 c=floor(r);float chk=mod(c.x+c.y,2.);
   vec2 fp=fract(r);float ln=smoothstep(.06,0.,min(min(fp.x,1.-fp.x),min(fp.y,1.-fp.y)));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float lim=uP*2.05-1.02;float rise=step(h,lim);float front=band(h,lim,.06)*step(uP,.99);float wob=.5+.5*sin(uT*5.+chk*3.);
   gl_FragColor=vec4(mix(uC2,uC1,chk*.6+fr*.4)*1.3+vec3(1.)*front*.6,(fr*.55+ln*.3+chk*.07*wob+front)*rise*uA);}`));
  shield.position.copy(AC);
  L.mesh.add(wink,...sigs,shield);

  const C=`const float TS=${f(TS)};const float TX=${f(TX)};const float TI=${f(TI)};const float TP=${f(TP)};const float TSH=${f(TSH)};
  const vec3 CP=${v3(CP)};const vec3 AP=${v3(AP)};const vec3 K1=${v3(K1)};const vec3 K2=${v3(K2)};const vec3 AC=${v3(AC)};
  float kx(float t){return smoothstep(TX,TI,t);}`+QB;
  const SMK=SMOKE_FS("mix(uC2,vec3(.55,.5,.62),.45)");
  // nubes de humo violeta en ambos (y una menor al llegar cada sello)
  a.count+=points(L.part,90,C+`void main(){bool c0=aSeed.y<.5;vec3 P=(c0?vec3(-3.7,1.,0.):vec3(AC.x,1.,AC.z));float s=TS+aSeed.x*.08;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P+normalize(rnd()+vec3(0.,.3,0.))*(.2+.65*aSeed.w)*(1.-exp(-t*5.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.3+.25*aSeed.w)*(.6+age*.7));}`,SMK,NB);
  a.count+=points(L.part,40,C+`void main(){bool c0=aSeed.y<.5;vec3 P=c0?AP:CP;float s=TI+aSeed.x*.06;float life=.5+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P+vec3(0.,-.15,0.)+normalize(rnd()+.001)*(.1+.35*aSeed.w)*(1.-exp(-t*6.));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.2+.15*aSeed.w)*(.6+age));}`,SMK,NB);
  // estela de humo y chispas de cada sello en su arco
  a.count+=points(L.part,100,C+`void main(){bool c0=aSeed.y<.5;float s=TX+aSeed.x*(TI-TX);float life=.3+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=(c0?qb(CP,K1,AP,kx(s)):qb(AP,K2,CP,kx(s)))+rnd()*.05+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.035+.035*aSeed.w)*(1.-age*.4));}`);
  a.count+=points(L.part,20,C+`void main(){float s=.04+aSeed.x*.2;float life=.2;float age=(uT-s)/life;
   vec3 p=${v3(EYE)}+vec3(.15,.02,.1)+normalize(rnd()+.001)*(.1+.15*aSeed.z);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.07+.05*aSeed.w);}`,STAR4_FS);
  // purificación: dos jirones oscuros suben en espiral y se deshacen en destellos
  a.count+=points(L.part,60,C+`void main(){float k=aSeed.y<.5?0.:3.1416;float s=TP+aSeed.x*.25;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=k+t*7.;vec3 p=AC+vec3(cos(an)*(.45-.2*t),.3+t*2.2,sin(an)*(.45-.2*t))+rnd()*.06;
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.7:0.;put(p,(.18+.1*aSeed.w)*(.7+age*.5));}`,SMOKE_FS("vec3(.08,.06,.1)"),NB);
  a.count+=points(L.part,40,C+`void main(){float s=TP+.32+aSeed.x*.08;float life=.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=AC+vec3(0.,1.6,0.)+normalize(rnd()+.001)*(.1+.8*aSeed.z)*(1.-exp(-t*5.));vA=(age>0.&&age<1.)?1.-age:0.;put(p,.08+.06*aSeed.w);}`,STAR4_FS);
  // motas que rondan el escudo (uE = vida del escudo)
  a.count+=points(L.part,50,C+`void main(){float an=aSeed.x*6.2832+uT*(.6+.5*aSeed.y);float rad=1.05+.1*aSeed.z;
   vec3 p=vec3(AC.x+cos(an)*rad,.2+aSeed.w*1.8+sin(uT*1.6+aSeed.x*9.)*.1,AC.z+sin(an)*rad);
   vA=uE*.8;put(p,(.035+.03*aSeed.y)*uE);}`);

  const sRing=groundPlane(2.8,A.x,0.03,fx(RING_FS)); sRing.position.z=A.z;
  const puffs=[V3(-3.7,0,0),A].map(P=>{const m=groundPlane(1.8,P.x,0.03,fx(RING_FS));m.position.z=P.z;return m;});
  L.decal.add(sRing,...puffs);

  a.pose=function(te,o){
    const ia=te-TI, ip=te-TP, ish=te-TSH, wk=ss(0.02,0.1,te)*(1-ss(0.2,0.32,te)), k=ss(TX,TI,te), env=ss(TSH,TSH+0.15,te)*(1-ss(TE,TF,te));
    towardCam(wink.position,EYE,0.35); billboard(wink,te*4); wink.visible=wk>0.001; wink.scale.setScalar(0.5+0.6*wk); set(wink,0,wk);
    caster.rotation.z=-0.1*wk;
    // sellos: aparecen sobre cada cabeza, se cruzan y se hunden en su nuevo dueño (sin anillo)
    sigs.forEach((m,i)=>{const s0=i?AP:CP,s1=i?CP:AP,kk=i?K2:K1;qb(s0,kk,s1,k,tmp);
      const sink=ss(TI,TI+0.14,te);tmp.y-=0.45*sink;towardCam(m.position,tmp,0.15);billboard(m,(i?Math.PI:0)+Math.sin(te*6+i)*0.3);
      const al=ss(TS-0.05,TX,te)*(1-sink);m.visible=al>0.001;m.scale.setScalar(Math.max(0.6+0.4*Math.sin(Math.PI*k)-0.3*sink,0.001));m.material.uniforms.uA.value=al;});
    shield.visible=env>0.001; shield.scale.set(1+0.03*Math.sin(te*9),1.12-0.03*Math.sin(te*9),1+0.03*Math.sin(te*9)); set(shield,ss(TSH,TSH+0.3,te),env*(1+0.5*hitK(ish,6)));
    U.uE.value=env;
    set(sRing,1-Math.pow(1-cl(ish/0.5),2),ish>=0?(1-cl(ish/0.5))*0.7:0);
    const ps=cl((te-TS)/0.45); puffs.forEach(m=>set(m,1-Math.pow(1-ps,2),te>=TS?(1-ps)*0.6:0));
    glowOn(allies[0],0.5*hitK(ia,5)+0.35*hitK(ip-0.3,6)+0.12*env);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.45*hitK(ia,5)+0.25*wk;
    if(te<TS){o.g.copy(EYE);o.gs=0.7*wk;o.ga=0.35*wk;o.li=1.5*wk;}
    else if(te<TI){qb(CP,K1,AP,k,o.g);o.gs=1.2;o.ga=0.3;o.li=3;}
    else if(te<TSH){o.g.copy(AC);o.g.y=1.4;o.gs=1.4;o.ga=0.4*hitK(ia,6)+0.3*hitK(ip-0.3,6);o.li=4*hitK(ia,5)+2;}
    else{o.g.copy(AC);o.gs=2.2;o.ga=0.4*hitK(ish,6)+0.12*env;o.li=4*hitK(ish,5)+1.5*env;}
    o.ia=ish>=0?ish:ia;o.c.copy(AC);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

VFX.module("Reptil · Ojos",[punky,scar,topaz,gecko,tricky]);
})();

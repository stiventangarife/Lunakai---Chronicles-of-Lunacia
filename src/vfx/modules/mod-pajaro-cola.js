// =====================================================================
// MÓDULO · CLASE PÁJARO (COLA)
// Nube de sigilo, abanicos de plumas (pavo real y abuela), plumas de fénix, pluma legendaria y golondrina.
// No se dibuja ninguna cola: los efectos nacen en la posición de la cola del lanzador ≈(-4.15,0.7,0); los abanicos
// son objetos con mango (no anatomía) y la golondrina es una criatura invocada (silueta SDF en billboard).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,DUST_FS,FLAME_FS,STAR4_FS,SMOKE_FS,SLASH_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0), TAIL=V3(-4.15,0.7,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const NBD=Object.assign({},NB,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const wave=(m,ia,dur,amax)=>{const p=cl(ia/dur);set(m,1-Math.pow(1-p,2),ia>=0?(amax==null?1:amax)*(1-p):0);};
const allyGlow=(i,k,col)=>{const m=allies[i].userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const faceFly=(m,d,s)=>{const sx=d.x>=0?1:-1,A=Math.atan2(d.y,Math.abs(d.x)+0.4*Math.abs(d.z)+1e-4);billboard(m,sx*A);m.scale.set(sx*s,s,1);};
const velOf=(pos,te,out)=>{pos(te+0.01,out);pos(te-0.01,tmp3);return out.sub(tmp3);};

// ---------- silueta de ave (SDF 2D de perfil mirando a +x) ----------
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdTap(vec2 p,vec2 a,vec2 b,float r0,float r1){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(r0,r1,h);}
float sdEl(vec2 p,vec2 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-4);}
float sdTri(vec2 p,vec2 p0,vec2 p1,vec2 p2){vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2;vec2 v0=p-p0,v1=p-p1,v2=p-p2;
 vec2 q0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);vec2 q1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);vec2 q2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
 float s=sign(e0.x*e2.y-e0.y*e2.x);
 vec2 d=min(min(vec2(dot(q0,q0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(q1,q1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(q2,q2),s*(v2.x*e2.y-v2.y*e2.x)));
 return -sqrt(d.x)*sign(d.y);}`;
const BIRD=B=>({eye:`vec2(${f(B.hx+B.hr*.4)},${f(B.hy+B.hr*.28)})`,
 sd:SDF2+`float sdBird(vec2 p,float fl,float fo){
 vec2 q=vec2(p.x,p.y-p.x*.18);float d=sdEl(q-vec2(-.03,0.),vec2(${f(B.bl)},${f(B.bt)}));
 vec2 H=vec2(${f(B.hx)},${f(B.hy)});d=smin(d,length(p-H)-${f(B.hr)},.1);
 vec2 K0=H+vec2(${f(B.hr*.6)},0.);d=min(d,sdTap(p,K0,K0+vec2(${f(B.hr*.4+B.bk)},${f(-B.bk*.2)}),${f(B.bkw)},.004));
 vec2 T=vec2(${f(-B.bl*.8)},${f(-B.bl*.8*.18)});
 d=smin(d,sdTap(p,T,T+vec2(${f(-B.tl)},${f(B.ts)}),${f(B.tw)},${f(B.tw*B.tf)}),.05);
 d=smin(d,sdTap(p,T,T+vec2(${f(-B.tl*(1+B.fork))},${f(-B.ts-B.fork*.14)}),${f(B.tw)},${f(B.tw*B.tf)}),.05);
 float a=fl*${f(B.amp)}*(1.-fo);vec2 S=vec2(${f(B.wx)},${f(B.wy)});
 vec2 dir=normalize(vec2(-.5-.7*fo,sin(a)*1.3+.04));float wl=${f(B.wl)}*(1.-.2*fo);vec2 W=S+dir*wl;
 vec2 nr=vec2(-dir.y,dir.x);nr*=nr.x>0.?-1.:1.;
 float wg=sdTri(p,S+vec2(${f(B.ww*.7)},.02),W,S+vec2(${f(-B.ww*1.1)},-.02))-.02;
 for(int i=0;i<3;i++){float fi=float(i);wg=min(wg,sdTap(p,W-dir*.2+nr*fi*.05,W+dir*(.08-fi*.04)+nr*fi*.08,.03,.006));}
 return smin(d,wg,.04);}`});

// ---------- fragmentos de partícula ----------
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
// rosa ↔ celeste (la mezcla de tonos de la clase)
const SKY=`vec3(.55,.88,1.)`;
const SKYDOT_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${SKY},uC1,vMix*.35)*1.5+vec3(1.)*smoothstep(.2,0.,d)*.5,a);}`;
// hexágono de escarcha y burbuja de veneno (colores semánticos fijos)
const FROST_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=(gl_PointCoord-.5)*2.;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);vec2 a6=abs(q);
 float hx=max(a6.x*.866+a6.y*.5,a6.y)-.6;float arms=min(abs(q.x),min(abs(q.x*.5+q.y*.866),abs(q.x*.5-q.y*.866)));
 float m=smoothstep(.08,.02,abs(hx))+smoothstep(.07,.02,arms)*step(length(q),.85);float a=min(m,1.)*vA;if(a<.003)discard;
 gl_FragColor=vec4(vec3(.7,.92,1.)*1.4,a);}`;
const BUBBLE_G=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float ring=smoothstep(.07,0.,abs(d-.36))*.9+smoothstep(.45,0.,d)*.18;
 float hl=smoothstep(.12,0.,length(q-vec2(-.13,-.13)));float a=(ring+hl*.8)*vA;if(a<.003)discard;
 gl_FragColor=vec4(vec3(.45,1.,.3)*1.3+vec3(hl*.5),a);}`;
// pétalo aromático (mezcla normal) con tono lavanda/rosado fijo y toque de paleta
const PETAL_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float e=length(vec2(q.x*1.6,(q.y+.05)*2.2))-abs(q.x)*.2*step(.1,q.y);float a=smoothstep(.4,.33,e)*vA;if(a<.003)discard;
 vec3 col=mix(vec3(.78,.62,.98),vec3(1.,.75,.88),vMix);gl_FragColor=vec4(mix(col,uC1,.25)*(1.1-e*.5),a);}`;
const CLOUD_PT=SMOKE_FS("mix(vec3(.75,.82,.95),vec3(1.),vMix*.6)");

// ---------- pluma en malla (u = cañón→punta); uQ disolución; uH intercambia tonos ----------
const FEATHERM_FS=`uniform float uQ;uniform float uH;
void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float ay=abs(y);float k=clamp((u-.08)/.92,0.,1.);
 float w=smoothstep(0.,.22,k)*sqrt(max(1.-k*k*k,0.))*(y>0.?.95:.72);float wr=ay/max(w,.01);
 float vane=smoothstep(w,w-.07,ay)*step(.08,u);
 float barb=.82+.18*sin(u*220.-ay*30.);
 float slit=smoothstep(.43,.48,abs(fract(u*3.3+ay*1.1+noise(vec3(u*3.,y,1.))*.5)-.5))*smoothstep(.4,.75,wr);
 float rach=smoothstep(.06,.015,ay)*step(u,.97);
 float dz=noise(vec3(u*9.,y*4.,3.))-uQ*1.1+.04;if(dz<0.)discard;
 float edge=smoothstep(.08,0.,dz)*step(.001,uQ);
 vec3 ca=mix(uC1,uC2,uH),cb=mix(uC2,uC1,uH);
 vec3 c=mix(cb,ca,clamp(wr*.7+u*.4,0.,1.))*1.3+vec3(1.)*(rach*.8+smoothstep(.8,1.,wr)*vane*.25)+ca*edge*2.;
 gl_FragColor=vec4(c,(max(vane*barb*(1.-slit*.85),rach)*.9+edge)*uA);}`;

// =====================================================================
// 1 · CLOUD — vapor que brota de la cola y se enrosca en cúmulos que envuelven al Axie; ya cubierto, el Axie
//     parpadea intangible tras un velo brumoso (Sigilo) y la nube acaba deshaciéndose
// =====================================================================
const cloud={key:"btCloud",name:"Cloud",pa:2,dur:2.3,ti:0.85,pal:"Rocío (Espalda)",
  phases:[["Vapor",0],["Nube",0.25],["Envoltura",0.85],["Sigilo",1.05],["Disipación",1.8]],
build(a){
  const L=a.L,TV=0.25,TI=0.85,TS=1.05,TD=1.8,TE=2.3,CX=-3.7,N=10;
  // cúmulo: luz difusa azulada, borde deshilachado por ruido, disolución por uP (mezcla normal)
  const cloudM=fx(`void main(){vec3 q=normalize(vP);float n=noise(q*3.+uT*.3)*.6+noise(q*7.-uT*.25)*.4;
   float lit=.5+.5*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float dz=n-uP*1.05;if(dz<0.)discard;
   vec3 c=mix(uC2*.45+vec3(.3,.34,.42),vec3(1.),lit*.8+n*.2);
   gl_FragColor=vec4(c,smoothstep(1.,.4,fr+(n-.5)*.55)*smoothstep(0.,.12,dz)*.94*uA);}`,NB);
  const blobs=[];
  for(let i=0;i<N;i++){const th=i/N*Math.PI*2+0.3*Math.sin(i*2.1), y=0.25+((i*0.618)%1)*1.6, r=0.34+0.14*((i*0.37)%1);
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),cloudM);
    m.userData={th,y,r,t0:TV+i*0.045,rad:0.5+0.08*Math.sin(i*3.3)}; L.mesh.add(m); blobs.push(m);}
  // velo de sigilo: halo con bandas que suben (aditivo)
  const veil=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float b=pow(.5+.5*sin(q.y*18.-uT*7.+noise(q*4.)*3.),5.);float n=noise(q*6.+uT*.5);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.2,(fr*.45+b*.12*(1.-fr))*uA);}`));
  veil.position.set(CX,0.95,0); veil.scale.set(0.85,1.15,0.85); L.mesh.add(veil);

  const C=`const float TV=${f(TV)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 TAIL=${v3(TAIL)};const float CX=${f(CX)};varying float vR;`;
  // vapor que brota de la cola en rizos
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*.4;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832+t*5.;vec3 p=TAIL+vec3(-.1*t+cos(an)*.15*t*3.,.7*t,sin(an)*.15*t*3.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.7:0.;put(p,(.14+.1*aSeed.w)*(.6+age));}`,CLOUD_PT,NB);
  // rachas que se enroscan alrededor del Axie mientras se forma la nube
  a.count+=points(L.part,120,C+`void main(){float s=TV+aSeed.x*(TI-TV);float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832+t*7.;float rad=.9-.35*age;vec3 p=vec3(CX+cos(an)*rad,.15+aSeed.w*1.7+t*.3,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.8:0.;put(p,.025+.025*aSeed.y);}`);
  // envoltura: bocanada al cerrarse
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 d=normalize(rnd()*vec3(1.,.5,1.)+.0001);vec3 p=vec3(CX,.9,0.)+d*(.6+.6*(1.-exp(-t*4.)));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.3+.2*aSeed.w)*(.7+age*.6));}`,CLOUD_PT,NB);
  // sigilo: niebla que ronda y gotitas que brillan
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*(.4+.3*aSeed.y);float rad=.7+.25*aSeed.z;vR=0.;
   vec3 p=vec3(CX+cos(an)*rad,.15+aSeed.w*1.7+sin(uT*1.5+aSeed.x*9.)*.08,sin(an)*rad);vA=uE*.35;put(p,(.28+.2*aSeed.y)*uE);}`,CLOUD_PT,NB);
  a.count+=points(L.part,60,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vR=0.;
   float an=r.x*6.2832;vec3 p=vec3(CX+cos(an)*(.55+.3*r.z),.2+r.y*1.6,sin(an)*(.55+.3*r.z));
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.035+.03*r.z));}`);
  // disipación: jirones que se alejan
  a.count+=points(L.part,60,C+`void main(){float s=TD+aSeed.x*.3;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*(.6+1.1*t),.2+aSeed.w*1.6+.3*t,sin(an)*(.6+1.1*t));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.55:0.;put(p,(.26+.2*aSeed.y)*(.7+age));}`,CLOUD_PT,NB);

  const shade=groundPlane(2.4,CX,0.014,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,uT*.4));
   gl_FragColor=vec4(0.,0.,.02,smoothstep(1.,.25,r+(n-.5)*.3)*.45*uA);}`,NB));
  const mist=groundPlane(3.2,CX,0.03,fx(RING_FS));
  L.decal.add(shade,mist);

  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI-0.1,TI+0.1,te)*(1-ss(TD,TE-0.1,te)), stealth=ss(TS-0.1,TS+0.1,te)*(1-ss(TD-0.1,TD+0.2,te));
    for(const m of blobs){const u=m.userData,k=cl((te-u.t0)/0.42),e=1-Math.pow(1-k,3),sp=(1-e)*2.2,disp=ss(TD,TE,te);
      const th=u.th+sp+0.25*te, rad=u.rad*(1+0.9*disp)+0.6*(1-e);
      m.visible=te>=u.t0&&disp<0.99;
      m.position.set(TAIL.x+(CX+Math.cos(th)*rad-TAIL.x)*e,TAIL.y+(u.y-TAIL.y)*e+0.3*disp,Math.sin(th)*rad*e);
      m.scale.setScalar(Math.max(u.r*(0.2+0.8*e)*(1-0.22*stealth)*(1+0.06*Math.sin(te*3+u.th)),0.001));}
    set(blobs[0],ss(TD,TE-0.05,te),1-0.45*stealth);
    set(veil,0,0.9*env*(0.4+0.6*stealth)); veil.visible=env>0.001;
    U.uE.value=stealth;
    // intangible: parpadea y se tiñe del color del velo
    caster.visible=!(stealth>0.3&&((te*13)%1)<0.38);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*stealth+0.5*hitK(ia,6)*(ia>=0?1:0);
    caster.scale.set(1,1+0.03*Math.sin(te*5)*stealth,1);
    shade.material.uniforms.uA.value=ss(TV,TI,te)*(1-ss(TD,TE,te)); wave(mist,ia,0.6,0.7);
    o.g.set(CX,1,0); o.gs=1.4+0.6*env; o.ga=0.15*ss(TV,TI,te)+0.4*hitK(ia,8)*(ia>=0?1:0)+0.1*stealth; o.li=1.5+2*env+3*hitK(ia,6)*(ia>=0?1:0);
    o.ia=ia; o.c.set(CX,1,0); o.shake=0; o.dist=0.35; o.flash=0;
  };
}};

// =====================================================================
// 2 · FEATHER FAN — plumas que salen de la cola forman un abanico gigante de pavo real (con mango) sobre el Axie;
//     cuatro aletazos lanzan cuatro ráfagas en media luna; la última parte la baldosa del rival (nivel 3)
// =====================================================================
const featherFan={key:"btFeatherFan",name:"Feather Fan",pa:3,dur:3.2,ti:2.15,pal:"Fresa",
  phases:[["Plumas",0],["Apertura",0.35],["Ráfagas",0.85],["Golpe final",2.15],["Fractura",2.3],["Calma",2.75]],
build(a){
  const L=a.L,TO=0.35,TW=0.85,TE=3.2,NF=11,FP=V3(-4.5,1.15,-0.35),FLEN=2.1,SPREAD=2.5;
  const H=[1.15,1.45,1.75,2.15], F=[0.85,1.15,1.45,1.8], X0=-3.1, XH=2.95, TI=H[3];
  // ángulo del abanico (0 = vertical; positivo = inclinado hacia atrás): reposo, carga y aletazos secos
  const swing=te=>{let al=0.35*ss(TO,TW-0.1,te)+0.25*ss(TW-0.25,TW-0.02,te)*(te<F[0]?1:0);
    if(te>=F[0]-0.02){al=0.6;for(let i=0;i<4;i++){const d=te-F[i],big=i===3?1.35:1;
      if(d>=-0.02&&d<0.1)al=0.6-(1.05*big)*ss(-0.02,0.08,d);
      else if(d>=0.1&&(i===3||te<F[i+1]-0.02))al=0.6-1.05*big+(1.05*big)*ss(0.1,i===3?0.6:0.28,d);}}
    return al*(1-ss(2.75,3.1,te));};
  // pluma de pavo real: asta, barbas sueltas que se abren y ocelo en la punta (turquesa y azul semánticos)
  const FAN_FS=`uniform float uQ;void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float ay=abs(y);
   vec2 e=vec2((u-.8)/.17,y/.62);float r=length(e);float eyeM=smoothstep(1.,.88,r);
   float spread=.1+.75*smoothstep(.08,.72,u);float strands=(.55+.45*sin(ay*46.+u*9.))*smoothstep(spread,spread-.15,ay)*step(.05,u);
   float rach=smoothstep(.05,.012,ay)*step(u,.8);float body=max(max(eyeM,strands*.75),rach);
   float dz=noise(vec3(u*8.,y*3.,5.))-uQ*1.1+.04;if(dz<0.)discard;
   vec3 col=mix(uC2*.75,uC1,u)*(.82+.18*sin(ay*46.));
   col=mix(col,uC1*1.25,smoothstep(1.,.86,r));col=mix(col,vec3(.08,.72,.66),smoothstep(.8,.66,r));
   col=mix(col,vec3(.12,.16,.75),smoothstep(.52,.42,r));col=mix(col,vec3(.04,.03,.18),smoothstep(.26,.16,r));
   col=col*(.85+.5*uP)+uC1*smoothstep(.08,0.,dz)*step(.001,uQ)*2.;
   gl_FragColor=vec4(col,body*uA);}`;
  const fan=new THREE.Group(), fanG=new THREE.PlaneGeometry(FLEN,0.62).translate(FLEN/2,0,0), fanM=fxU(FAN_FS,{uQ:{value:0}},NBD);
  const fe=[]; for(let i=0;i<NF;i++){const m=new THREE.Mesh(fanG,fanM);m.position.z=i*0.004;fan.add(m);fe.push(m);}
  const gold=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(vec3(.95,.7,.28)*${LIT}+vec3(1.,.95,.8)*${SPEC(20)}*.8+uC1*fr*.3,1.);}`,SOLID);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.055,0.8,12).translate(0,-0.4,0),gold), rivet=new THREE.Mesh(new THREE.SphereGeometry(0.085,16,12),gold);
  fan.add(handle,rivet); fan.position.copy(FP); L.mesh.add(fan);
  // ráfagas: medias lunas de viento que cruzan hasta el rival
  const WIND_FS=`void main(){vec2 p=(vUv-.5)*2.;float x=p.x+.6*p.y*p.y;
   float core=exp(-abs(x-.25)*16.)*smoothstep(1.,.55,abs(p.y));
   float wisp=noise(vec3(p.y*7.,x*3.-uT*14.,uT))*exp(-max(.25-x,0.)*2.5)*step(x,.3)*smoothstep(1.,.45,abs(p.y));
   gl_FragColor=vec4(mix(uC1,vec3(1.),core*.5)*1.5,(core+wisp*.55)*uA);}`;
  const gusts=H.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.4,2.6),fx(WIND_FS,{depthTest:false}));L.trail.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);

  const C=`const vec3 TAIL=${v3(TAIL)};const vec3 FP=${v3(FP)};const vec3 TC=${v3(TC)};varying float vR;
  const float F0=${f(F[0])};const float F1=${f(F[1])};const float F2=${f(F[2])};const float F3=${f(F[3])};
  const float H0=${f(H[0])};const float H1=${f(H[1])};const float H2=${f(H[2])};const float H3=${f(H[3])};
  float fk(float i){return i<.5?F0:(i<1.5?F1:(i<2.5?F2:F3));}float hk(float i){return i<.5?H0:(i<1.5?H1:(i<2.5?H2:H3));}`;
  // plumas que salen de la cola y suben girando hasta el eje del abanico
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*(${f(TO)}+.1);float dur=.3;float k=clamp((uT-s)/dur,0.,1.);
   vec3 mid=TAIL+vec3(-.5,.6,-.2)+rnd()*.3;vec3 p=mix(mix(TAIL,mid,k),mix(mid,FP+vec3(0.,.3,0.),k),k);
   vA=(uT>s&&k<1.)?smoothstep(0.,.2,k):0.;vR=aSeed.z*6.2832+k*8.;put(p,.18+.08*aSeed.w);}`,FEATHER_FS);
  // brillo que ronda el abanico abierto
  a.count+=points(L.part,60,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-${f(TO)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vR=0.;
   float an=(r.x-.5)*2.6+1.5708;float rad=.5+r.y*1.7;vec3 p=FP+vec3(-cos(an)*rad*.0+cos(an)*rad,sin(an)*rad,.05)+vec3(0.,age*.3,0.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.04+.04*r.z);}`);
  // ráfagas: rachas de viento densas que viajan con cada media luna
  a.count+=points(L.part,480,C+`void main(){float i=floor(aSeed.x*3.999);float t0=fk(i),t1=hk(i);float dur=t1-t0;
   float k=(uT-t0)/dur;float lag=aSeed.y*.35;float kk=clamp(k-lag,0.,1.2);vR=0.;
   float x=${f(X0)}+(${f(XH-X0)})*kk;vec3 p=vec3(x-.2*aSeed.z,.15+aSeed.w*2.2,(aSeed.z-.5)*2.2*(.4+.6*kk));
   vA=(k>lag&&kk<1.15)?(1.-smoothstep(.85,1.15,kk))*(.5+.5*aSeed.z)*(i>2.5?1.:.75):0.;put(p,.035+.03*aSeed.w);vMix=aSeed.z;}`);
  // impactos: chispas, plumas arrancadas y polvo; el último, enorme
  H.forEach((t,i)=>{a.count+=sparks(L.part,i===3?220:70,t,`${f(TC.x)},${f(TC.y)},0.`,"1.,.3,0.",i===3?4:2.5,i===3?13:7,3);});
  a.count+=points(L.part,210,C+`void main(){float i=aSeed.x<.43?floor(aSeed.x/.143):3.;float s=hk(i)+fract(aSeed.x*17.)*.04;float life=.9+aSeed.y*.5;float t=uT-s;float c=max(t,0.);
   float big=i>2.5?1.:.55;vec3 v=normalize(rnd()+vec3(.8,.5,0.))*(1.5+3.5*aSeed.z)*big;
   vec3 p=TC+v*(1.-exp(-c*3.))/3.+vec3(sin(c*4.+aSeed.w*9.)*.2,-.7*c,cos(c*3.+aSeed.y*9.)*.15);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*(3.+3.*aSeed.y);put(p,(.16+.08*aSeed.w)*(.7+.5*big));}`,FEATHER_FS);
  a.count+=points(L.part,90,C+`void main(){float s=H3+aSeed.x*.08;float life=.9+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.05,0.)+vec3(cos(an),0.,sin(an))*(.4+2.*aSeed.w)*(1.-exp(-t*3.))+vec3(0.,.15+.6*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.36+.34*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,50,C+`void main(){float s=H3+aSeed.x*.05;float life=.7+aSeed.y*.4;float t=uT-s;float c=max(t,0.);vR=0.;
   vec3 v=normalize(rnd()+vec3(0.,1.,0.))*(2.5+3.*aSeed.z);vec3 p=vec3(3.4,.1,0.)+v*c+vec3(0.,-7.*c*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;put(p,.06+.06*aSeed.w);}`,VFX.lib.CHIP_FS);

  // suelo: surcos de viento hacia el rival, anillos por golpe y fractura de baldosa en el último
  const streak=groundPlane(1,0,0.016,fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   float n=noise(vec3(u*6.-uT*9.,v*5.,uT));float lines=pow(.5+.5*sin(v*22.+n*3.),8.);
   float m=lines*smoothstep(1.,.3,abs(v))*smoothstep(0.,.1,u)*(.5+.5*n);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,m*uA);}`),2.6);
  streak.position.x=(X0+XH)/2; streak.scale.set(XH-X0,1,1);
  const rings=H.map(()=>{const m=groundPlane(4,3.4,0.03,fx(RING_FS));L.decal.add(m);return m;});
  const FS=6.6, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  L.decal.add(streak,frac);

  a.pose=function(te,o){
    const ia=te-TI, open=ss(TO-0.1,TW,te), al=swing(te), fade=1-ss(2.8,3.15,te);
    fan.visible=te>0.12&&fade>0.001; fan.rotation.z=al; fan.scale.setScalar(Math.max(ss(0.12,TO+0.1,te)*fade,0.001));
    let last=-1; for(let i=0;i<4;i++)if(te>=H[i])last=i;
    let flap=0; for(let i=0;i<4;i++){const d=te-F[i];if(d>=-0.02&&d<0.2)flap=Math.max(flap,Math.exp(-Math.abs(d-0.04)*12)*(i===3?1.4:1));}
    fe.forEach((m,i)=>{const s=i/(NF-1)-0.5, gr=ss(0.15+i*0.025,0.45+i*0.025,te);
      m.rotation.z=Math.PI/2+s*SPREAD*open+0.06*Math.sin(te*3+i)*open; m.scale.set(Math.max(gr,0.001),Math.max(0.6+0.4*gr,0.001),1);});
    set(fe[0],flap,1); fanM.uniforms.uQ.value=ss(2.85,3.15,te);
    U.uE.value=open*fade;
    gusts.forEach((m,i)=>{const k=(te-F[i])/(H[i]-F[i]),on=k>=0&&k<1.15;m.visible=on;
      const x=X0+(XH-X0)*Math.min(k,1)+(k>1?0.4*(k-1):0), big=i===3?1.45:1;
      towardCam(m.position,tmp.set(x,1.15,0),0.3); billboard(m); m.scale.set(big*(0.7+0.5*Math.min(k,1)),big*(0.75+0.35*Math.min(k,1)),1);
      m.material.uniforms.uA.value=on?ss(0,0.12,k)*(1-ss(0.95,1.15,k)):0;});
    const wind=ss(F[0]-0.05,F[0]+0.1,te)*(1-ss(H[3],H[3]+0.5,te)); streak.material.uniforms.uA.value=0.7*wind;
    H.forEach((t,i)=>wave(rings[i],te-t,0.5,i===3?1:0.55));
    let p=cl(ia/0.4); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+0.7,TE,te):0);
    // rival: empujado un poco más con cada ráfaga, gran retroceso en la última
    let push=0; for(let i=0;i<3;i++)if(te>=H[i])push+=0.08*(1-ss(H[3]+0.3,H[3]+0.9,te));
    const hl=last>=0?hitK(te-H[last],last===3?3.2:7):0, kb=last===3?0.75*hl*(1-Math.exp(-ia*18)):0.1*hl;
    target.position.x=3.4+push+kb; target.rotation.z=-(last===3?0.45:0.15)*hl*Math.cos((te-(last>=0?H[last]:0))*12);
    frac.position.x=3.4;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*flap;
    caster.rotation.z=0.05*Math.sin(al*1.2);
    if(last<0){o.g.set(FP.x+0.2,FP.y+1.1,FP.z);o.gs=1.6*open+0.8*flap;o.ga=0.2*open+0.3*flap;o.li=2+3*flap;o.ia=te-(F[0]>te?TO:F[0]);o.c.set(FP.x,1.5,0);o.shake=0;o.dist=0.25;o.flash=0;}
    else{const il=te-H[last],bg=last===3;o.g.copy(TC);o.gs=(bg?2.4:1.4)+(bg?6:2.5)*Math.min(il,0.5);o.ga=Math.exp(-il*9)*(bg?1:0.55)+0.2*flap;
      o.li=(bg?15:5)*Math.exp(-il*4.5)+2*flap;o.ia=il;o.c.copy(TC);o.shake=bg?1.8:0.7;o.dist=bg?1.3:0.6;o.flash=1;}
  };
}};

// =====================================================================
// 3 · GRANMA'S FAN — un abanico tradicional de plumas blancas con mango de bambú y borla brota de la cola; con
//     vaivenes suaves suelta una brisa aromática en cono que arrastra la escarcha y el veneno del Axie y deja
//     Frágiles al rival y al enemigo cercano
// =====================================================================
const granma={key:"btGranmasFan",name:"Granma's Fan",pa:2,dur:2.2,ti:1.05,pal:"Menta",enemies:1,
  phases:[["Abanico",0],["Vaivén",0.4],["Brisa",0.55],["Frágil",1.05],["Limpieza",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TO=0.4,TB=0.55,TI=1.05,TE=2.2,GP=V3(-4.25,1.15,0.4),NF=9,FL=0.78,E0=ENEMY_POS[0],HALF=0.42,LEN=7.6;
  const sway=te=>0.32*ss(TO-0.1,TO,te)+0.35*Math.sin((te-TO)*7.5)*ss(TO,TB,te)*(1-ss(1.6,1.95,te));
  // plumas blancas redondeadas en semicírculo
  const GF_FS=`void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;float ay=abs(y);float k=clamp((u-.1)/.9,0.,1.);
   float w=smoothstep(0.,.3,k)*sqrt(max(1.-k*k,0.));float vane=smoothstep(w,w-.1,ay)*step(.1,u);
   float barb=.85+.15*sin(u*120.-ay*20.);float rach=smoothstep(.06,.015,ay)*step(u,.95);
   vec3 c=mix(vec3(.96,.95,.92),uC1,.15+.2*u)*(.85+.15*barb)*(1.-rach*.15)+uC2*smoothstep(.75,1.,ay/max(w,.01))*.25;
   gl_FragColor=vec4(c,max(vane,rach)*uA);}`;
  const fan=new THREE.Group(), fg=new THREE.PlaneGeometry(FL,0.34).translate(FL/2,0,0), fm=fx(GF_FS,NBD), feats=[];
  for(let i=0;i<NF;i++){const m=new THREE.Mesh(fg,fm);m.position.z=i*0.003;fan.add(m);feats.push(m);}
  const bamboo=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.03,0.5,10).translate(0,-0.25,0),fx(`void main(){float s=fract(vP.y*5.+.3);
   float node=smoothstep(.06,0.,s)+smoothstep(.94,1.,s);vec3 c=mix(vec3(.62,.66,.3),vec3(.82,.78,.45),noise(vec3(vP*30.)))*(1.-node*.4);
   gl_FragColor=vec4(c*${LIT},1.);}`,SOLID));
  const tassel=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.2,10).translate(0,-0.1,0),fx(`void main(){float s=.6+.4*sin(atan(vP.z,vP.x)*14.);
   gl_FragColor=vec4(vec3(.78,.1,.12)*${LIT}*s,1.);}`,SOLID)); tassel.position.y=-0.52;
  fan.add(bamboo,tassel); fan.position.copy(GP); L.mesh.add(fan);
  // Frágil: grietas de cristal finas que destellan sobre el pecho del rival y del enemigo
  const FRAG_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float j=noise(vec3(r*3.,an*2.,1.))-.5;float rays=pow(1.-abs(fract(an*1.27+j*.4)*2.-1.),30.)*step(r,uP*1.1);
   float ring=band(r,.45+j*.1,.012)*step(.5,fract(an*2.+.2))*step(.45,uP);
   float sh=smoothstep(.12,0.,abs(p.x+p.y-(uP*3.-1.5)))*smoothstep(1.,.3,r);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.6,(rays+ring+sh*.35)*smoothstep(1.,.6,r)*uA);}`;
  const fr1=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(FRAG_FS,{depthTest:false})), fr2=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(FRAG_FS,{depthTest:false}));
  L.mesh.add(fr1,fr2);

  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const vec3 TAIL=${v3(TAIL)};const vec3 GP=${v3(GP)};varying float vR;`;
  // aparición: hojitas de brisa que suben de la cola al abanico
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.3;float dur=.25;float k=clamp((uT-s)/dur,0.,1.);
   vec3 p=mix(TAIL,GP+vec3(.2,.3,0.),k)+vec3(sin(k*9.+aSeed.y*6.)*.12,0.,0.);vR=aSeed.z*6.+k*6.;
   vA=(uT>s&&k<1.)?sin(k*3.14159):0.;put(p,.12+.05*aSeed.w);}`,PETAL_FS,NB);
  // brisa: trazos suaves que fluyen en cono hacia el rival y el enemigo
  a.count+=points(L.part,260,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TB)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);vR=0.;
   float d=age*${f(LEN)};float an=(r.x-.5)*2.*${f(HALF)};vec3 p=vec3(-3.6+cos(an)*d,.2+r.y*1.7+sin(d*2.+r.z*6.)*.12,sin(an)*d+sin(d*1.5+r.y*9.)*.15);
   float on=step(1.,k)*step(uT,1.85);vA=on*sin(age*3.14159)*(.45+.4*r.z);put(p,.03+.035*r.z);vMix=r.z;}`);
  a.count+=points(L.part,70,C+`void main(){float life=1.1+aSeed.y*.4;float k=(uT-TB-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float d=age*${f(LEN*0.85)};float an=(r.x-.5)*2.*${f(HALF)};vec3 p=vec3(-3.6+cos(an)*d,.3+r.y*1.5+sin(d*2.5+r.z*6.)*.18,sin(an)*d);
   float on=step(1.,k)*step(uT,1.8);vA=on*smoothstep(0.,.1,age)*(1.-smoothstep(.75,1.,age));vR=r.z*6.2832+age*7.;put(p,.12+.05*r.y);vMix=r.y;}`,PETAL_FS,NB);
  // limpieza: escarcha y burbujas de veneno se desprenden del Axie y se las lleva la brisa
  a.count+=points(L.part,40,C+`void main(){float s=.55+aSeed.x*.4;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.42,.2+aSeed.w*1.6,sin(an)*.42)+vec3(2.2*t*t+.4*t,.3*t,sin(t*4.+aSeed.x*9.)*.15);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;vR=aSeed.y*6.+t*3.;put(p,.12+.05*aSeed.w);}`,FROST_FS);
  a.count+=points(L.part,40,C+`void main(){float s=.6+aSeed.x*.4;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.42,.2+aSeed.w*1.6,sin(an)*.42)+vec3(2.*t*t+.5*t,.45*t,sin(t*5.+aSeed.x*9.)*.12);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.08+.06*aSeed.w)*(1.+age*.4));}`,BUBBLE_G);
  a.count+=points(L.part,40,C+`void main(){float s=.85+aSeed.x*.45;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=vec3(-3.+aSeed.z*1.4,.3+aSeed.w*1.5,(aSeed.y-.5)*.8)+vec3(.8*t,.4*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.07+.05*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  // frágil: destellos cristalinos en ambos rivales
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.5;float life=.3;float age=(uT-s)/life;vR=0.;
   vec3 c=aSeed.y<.5?vec3(3.4,1.15,0.):${v3(V3(E0.x,1.15,E0.z))};vec3 p=c+(vec3(aSeed.z,aSeed.w,fract(aSeed.x*7.))-.5)*vec3(.7,1.1,.5);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.1*(1.-age*.5));}`,STAR4_FS);

  // suelo: cono de brisa (desde el Axie) y círculos frágiles centrados bajo rival y enemigo
  const cone=groundPlane(LEN,-3.7+LEN/2,0.016,fx(`void main(){vec2 p=vec2(vUv.x*${f(LEN)},(vUv.y-.5)*${f(LEN)});float r=length(p);float an=abs(atan(p.y,p.x));
   float inC=smoothstep(${f(HALF)}+.02,${f(HALF)}-.06,an)*step(.3,r);float n=noise(vec3(r*2.-uT*4.,an*8.,uT));
   float flow=pow(.5+.5*sin(r*5.-uT*9.+an*12.),6.);float edge=band(an,${f(HALF)},.02)*step(.3,r);
   float m=(inC*(.1+.25*flow*n)+edge*.6)*step(r,uP*${f(LEN)})*smoothstep(${f(LEN)},${f(LEN*0.75)},r);
   gl_FragColor=vec4(mix(uC2,uC1,flow)*1.3,m*uA);}`));
  const fragG=[[3.4,0],[E0.x,E0.z]].map(([x,z])=>{const m=groundPlane(1.6,x,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float cr=pow(1.-abs(fract(an*1.1+noise(vec3(r*4.,an,2.))*.3)*2.-1.),24.)*smoothstep(.95,.3,r);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,(band(r,.9,.025)+cr*.6)*uA);}`));m.position.z=z;L.decal.add(m);return m;});
  L.decal.add(cone);

  a.pose=function(te,o){
    const ia=te-TI, open=ss(0.12,TO,te), out=1-ss(1.85,2.15,te);
    fan.visible=te>0.08&&out>0.001; fan.rotation.z=sway(te); fan.scale.setScalar(Math.max(ss(0.08,0.3,te)*out,0.001));
    feats.forEach((m,i)=>{const s=i/(NF-1)-0.5;m.rotation.z=Math.PI/2+s*2.6*open;});
    fm.uniforms.uA.value=1;
    set(cone,ss(TB-0.05,TI,te),0.9*ss(TB-0.05,TB+0.1,te)*(1-ss(1.6,2.0,te)));
    const fg=ia>=0?ss(0,0.08,ia)*(1-ss(0.75,1.0,ia)):0;
    [[fr1,V3(3.25,1.2,0)],[fr2,V3(E0.x,1.15,E0.z)]].forEach(([m,c],i)=>{towardCam(m.position,c,0.45);billboard(m,0.3+i);m.visible=fg>0.001;set(m,cl((ia-i*0.06)/0.35),fg*(0.75+0.25*Math.sin(te*12+i)));});
    fragG.forEach(m=>m.material.uniforms.uA.value=fg*0.8);
    // el Axie se libera (brillo suave); rival y enemigo se mecen con la brisa
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*ss(0.55,0.75,te)*(1-ss(1.1,1.5,te));
    const br=ss(TI-0.15,TI+0.1,te)*(1-ss(1.6,2.0,te));
    target.rotation.z=-0.05*br*(0.6+0.4*Math.sin(te*6)); target.position.x=3.4+0.05*br;
    const en=enemies[0]; en.rotation.z=-0.05*br*(0.6+0.4*Math.sin(te*6+1)); en.position.x=E0.x+0.04*br;
    if(te<TB){o.g.set(GP.x+0.3,GP.y+0.4,GP.z);o.gs=0.9*open;o.ga=0.22*open;o.li=1.5*open;}
    else if(te<TI){const k=ss(TB,TI,te);o.g.set(-3+6*k,1.1,0.3);o.gs=1.3;o.ga=0.2;o.li=2.5;}
    else{o.g.set(3.25,1.2,0);o.gs=1.2+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.5+0.1*fg;o.li=5*Math.exp(-ia*5)+1.5*fg;}
    o.ia=ia;o.c.set(3.25,1.2,0);o.shake=0;o.dist=0.35;o.flash=0.6;o.em=0.25*fg;o.emc.copy(U.uC1.value);
  };
}};

// =====================================================================
// 4 · POST FIGHT — plumas de fénix prenden en la cola y salen en ráfaga contra el rival (el Axie paga su precio
//     con un latido rojo); tras el golpe, las plumas incandescentes suben y caen meciéndose sobre los aliados y los curan
// =====================================================================
const postFight={key:"btPostFight",name:"Post Fight",pa:2,dur:2.4,ti:0.6,pal:"Fuego",allies:2,
  phases:[["Plumas",0],["Ráfaga",0.3],["Impacto",0.6],["Precio",0.68],["Lluvia de fénix",0.95],["Curación",1.5],["Fin",2.05]],
build(a){
  const L=a.L,TL=0.3,TI=0.6,TR=0.85,TA=1.25,TH=1.75,NV=5,E=V3(3.05,1.2,0);
  const AL=[ALLY_POS[0],ALLY_POS[1]];
  // ráfaga: cinco plumas en abanico sobre la cola que salen escalonadas en arco
  const S=[...Array(NV)].map((_,i)=>{const an=1.9-i*0.3;return V3(TAIL.x-0.1+Math.cos(an)*0.55,TAIL.y+0.35+Math.sin(an)*0.55,(i-2)*0.12);});
  const TT=S.map((_,i)=>[TL+i*0.03,TI-0.06+i*0.03]);
  const vpos=(i,te,o)=>{const [t0,t1]=TT[i];if(te<t0)return o.copy(S[i]);const k=cl((te-t0)/(t1-t0));
    return o.set(S[i].x+(E.x-S[i].x)*k,S[i].y+(E.y+(i-2)*0.1-S[i].y)*k+(1.0+0.15*i)*4*k*(1-k)*0.5,S[i].z*(1-k));};
  // lluvia: plumas grandes (3 por aliado) que suben del impacto y caen meciéndose sobre el aliado
  const RN=6, rp=(j,te,o)=>{const ai=j%2,AP=AL[ai],sd=Math.floor(j/2),ox=(sd-1)*0.35,oz=(sd-1)*0.2;
    const top=V3(0,0,0).set((E.x+AP.x)/2+ox,3.6+0.2*sd,(AP.z)/2+oz);
    if(te<TA){const k=ss(TR,TA,te);return qb(E,tmp2.set(E.x-0.3,3.6,0),top,k,o);}
    const k=cl((te-TA)/(TH-TA+sd*0.08));const base=tmp2.set(AP.x+ox*0.6,1.25+0.15*sd,AP.z+oz);
    o.lerpVectors(top,base,k*k*(3-2*k)); o.x+=Math.sin(te*5+j)*0.25*(1-k); return o;};
  const fm=fxU(FEATHERM_FS,{uQ:{value:0},uH:{value:0}});
  const volley=S.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.24).translate(-0.36,0,0),fm);L.mesh.add(m);return m;});
  const rainM=[...Array(RN)].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.2).translate(-0.3,0,0),fxU(FEATHERM_FS,{uQ:{value:0},uH:{value:0.3}}));L.mesh.add(m);return m;});
  // aura ígnea alrededor de cada pluma de la ráfaga
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(BURST_FS)); burst.position.copy(E);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TR=${f(TR)};const float TA=${f(TA)};const float TH=${f(TH)};const vec3 E=${v3(E)};const vec3 TAIL=${v3(TAIL)};varying float vR;
  const vec3 A0=${v3(AL[0])};const vec3 A1=${v3(AL[1])};`+QB;
  // las plumas prenden en la cola
  a.count+=points(L.part,50,C+`void main(){float life=.25+aSeed.y*.15;float k=uT/life+aSeed.x;float age=fract(k);vR=0.;
   vec3 p=TAIL+vec3(-.1,.35,0.)+vec3(rnd().x*.5,age*.4+rnd().y*.3,rnd().z*.3);vA=(uT<TL+.05)?sin(age*3.14159)*smoothstep(0.,.1,uT):0.;put(p,(.1+.06*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
  // estela de fuego de la ráfaga
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*4.999);float t0=TL+i*.03,t1=TI-.06+i*.03;float s=t0+fract(aSeed.x*5.)*(t1-t0);
   float k=clamp((s-t0)/(t1-t0),0.,1.);vec3 st=vec3(${f(TAIL.x-0.1)}+cos(1.9-i*.3)*.55,${f(TAIL.y+0.35)}+sin(1.9-i*.3)*.55,(i-2.)*.12);
   vec3 p0=vec3(st.x+(E.x-st.x)*k,st.y+(E.y+(i-2.)*.1-st.y)*k+(1.+.15*i)*2.*k*(1.-k),st.z*(1.-k));
   float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=p0+rnd()*.06+vec3(-.3*t,.5*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.1+.08*aSeed.w)*(1.-age*.6));}`,FLAME_FS);
  // impacto
  a.count+=sparks(L.part,120,TI,`${f(E.x)},${f(E.y)},0.`,"-.2,.5,0.",3,8,3);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.3;float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 d=normalize(rnd()+vec3(-.2,.6,0.));vec3 p=E+d*(.2+.9*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.6*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.w*40.)):0.;put(p,.035+.05*aSeed.w);}`);
  // el precio: brasas rojo oscuro que se escapan del propio Axie
  a.count+=points(L.part,40,C+`void main(){float s=TI+.06+aSeed.x*.15;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.4,.3+aSeed.w*1.4,sin(an)*.4)+vec3(cos(an)*.5*t,.9*t,sin(an)*.5*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.05+.04*aSeed.w)*(1.-age*.5));vMix=1.;}`);
  // lluvia de fénix: plumitas incandescentes que suben del impacto y caen sobre los aliados
  a.count+=points(L.part,36,C+`void main(){float ai=step(.5,aSeed.x);vec3 AP=ai<.5?A0:A1;float k1=smoothstep(TR,TA,uT);
   vec3 top=vec3((E.x+AP.x)*.5+(aSeed.y-.5)*1.4,3.3+aSeed.z*.7,AP.z*.5+(aSeed.w-.5));
   vec3 p=qb(E,vec3(E.x-.3,3.4,0.),top,k1);float fall=TH+aSeed.y*.2-TA;float k2=clamp((uT-TA)/fall,0.,1.);
   vec3 base=AP+vec3((aSeed.z-.5)*.7,.6+aSeed.w*.9,(aSeed.y-.5)*.5);
   if(uT>TA)p=mix(top,base,k2*k2*(3.-2.*k2))+vec3(sin(uT*4.+aSeed.x*30.)*.22*(1.-k2),0.,0.);
   vA=(uT>TR&&k2<1.)?smoothstep(TR,TR+.1,uT):0.;vR=aSeed.w*6.2832+uT*(1.5+aSeed.z)*sin(aSeed.x*20.);put(p,.2+.06*aSeed.z);}`,FEATHER_FS);
  a.count+=points(L.part,90,C+`void main(){float ai=step(.5,aSeed.x);vec3 AP=ai<.5?A0:A1;float s=TR+fract(aSeed.x*2.)*(TH-TR);
   float k1=smoothstep(TR,TA,s);vec3 top=vec3((E.x+AP.x)*.5,3.5,AP.z*.5);vec3 p0=s<TA?qb(E,vec3(E.x-.3,3.4,0.),top,k1):mix(top,AP+vec3(0.,1.,0.),smoothstep(TA,TH,s));
   float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=p0+rnd()*.35+vec3(0.,-.3*t,0.);vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.w*40.)):0.;put(p,.03+.04*aSeed.w);}`);
  // curación: destellos y llamitas doradas que suben de cada aliado
  a.count+=points(L.part,80,C+`void main(){float ai=step(.5,aSeed.x);vec3 AP=ai<.5?A0:A1;float s=TH-.1+fract(aSeed.x*2.)*.35;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.45,.15+aSeed.w*.8+t*1.2,sin(an)*.45);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.1+.06*aSeed.w));}`,FLAME_FS);
  a.count+=points(L.part,24,C+`void main(){float ai=step(.5,aSeed.x);vec3 AP=ai<.5?A0:A1;float s=TH+fract(aSeed.x*2.)*.15;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=AP+vec3((aSeed.z-.5)*.7,.8+aSeed.w*.7+t*.7,(aSeed.y-.5)*.4);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.14+.06*aSeed.w);}`,STAR4_FS);

  // suelo: quemadura suave bajo el rival y anillos cálidos bajo cada aliado (y uno rojo bajo el Axie)
  const scorch=groundPlane(1.9,3.4,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
   gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,smoothstep(1.,.25,r+(n-.5)*.35)*(.3+.15*n)*uA);}`));
  const healR=AL.map(AP=>{const m=groundPlane(1.9,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float fl=pow(.5+.5*sin(an*7.+uT*3.),4.)*smoothstep(.9,.5,r)*step(.35,r);
   gl_FragColor=vec4(mix(uC2,uC1,.6+.4*fl)*1.3,(band(r,.9,.03)+fl*.4+smoothstep(.6,0.,r)*.15)*uA);}`));m.position.z=AP.z;L.decal.add(m);return m;});
  const price=groundPlane(1.6,-3.7,0.03,fx(RING_FS)), shock=groundPlane(3,3.4,0.03,fx(RING_FS));
  L.decal.add(scorch,price,shock);

  const vp=V3(0,0,0), vv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ip=te-0.68, ign=ss(0.02,TL,te), heal=ss(TH-0.1,TH+0.1,te)*(1-ss(2.05,2.4,te));
    volley.forEach((m,i)=>{const [t0,t1]=TT[i];vpos(i,te,vp);m.visible=te<t1&&te>0.02;
      if(te<t0)vv.set(Math.cos(1.9-i*0.3),Math.sin(1.9-i*0.3),0);else velOf((t,o2)=>vpos(i,Math.min(t,t1-0.0001),o2),Math.min(te,t1-0.011),vv);
      towardCam(m.position,vp,0.05); billboard(m,Math.atan2(vv.y,vv.x)); m.scale.setScalar(Math.max(ign,0.001)*(1+0.08*Math.sin(te*30+i)));});
    set(volley[0],0,1.2*ign);
    rainM.forEach((m,j)=>{rp(j,te,vp);const on=te>=TR&&te<TH+0.15;m.visible=on;
      towardCam(m.position,vp,0.05); billboard(m,te<TA?1.2+te*4:-1.3+0.5*Math.sin(te*5+j));
      m.scale.setScalar(Math.max(ss(TR,TR+0.12,te),0.001)); set(m,ss(TH-0.05,TH+0.15,te),1.1);});
    let p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.1*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.35); towardCam(hitRing.position,E,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    scorch.material.uniforms.uA.value=ia>=0?0.9*(1-cl(ia/1.6)):0; wave(shock,ia,0.5,0.75); wave(price,ip,0.4,0.6);
    healR.forEach(m=>set(m,0,heal));
    // precio: latido rojo y encogimiento del Axie
    const pc=hitK(ip,6)*(ip>=0?1:0), cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.25*ign*(1-ss(TL,TI,te))+0.9*pc;
    caster.scale.set(1+0.05*pc,1-0.08*pc,1+0.05*pc); caster.rotation.z=0.1*ss(0,TL,te)-0.2*ss(TL,TL+0.08,te)+0.1*ss(TL+0.1,0.5,te)+0.12*pc;
    for(let i=0;i<2;i++)allyGlow(i,0.6*heal*(0.7+0.3*Math.sin(te*6+i)));
    const hit=hitK(ia,4.5); target.position.x=3.4+0.38*hit*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-0.3*hit*Math.cos(ia*12);
    if(te<TL){o.g.set(TAIL.x,TAIL.y+0.6,0);o.gs=1*ign;o.ga=0.3*ign;o.li=2.5*ign;}
    else if(te<TI){vpos(2,te,vp);o.g.copy(vp);o.gs=1.4;o.ga=0.45;o.li=4;}
    else if(te<TA){o.g.copy(E);o.gs=1.5+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.8;o.li=9*Math.exp(-ia*5)+1;}
    else{o.g.set((AL[0].x+AL[1].x)/2,1.6,(AL[0].z+AL[1].z)/2);o.gs=2.4;o.ga=0.12+0.25*heal;o.li=2+3*heal;}
    o.ia=te<TH-0.1?ia:te-TH;o.c.copy(te<TH-0.1?E:tmp.set(AL[0].x,1,AL[0].z));o.shake=0;o.dist=te<TH-0.1?0.7:0.25;o.flash=te<TH-0.1?1:0;
  };
}};

// =====================================================================
// 5 · THE LAST ONE — una pluma legendaria surge de la cola, se carga entre anillos de viento celeste y sale
//     disparada con estela rosa neón; perfora al rival de lado a lado y lo deja rodeado de plumas flotantes
// =====================================================================
const lastOne={key:"btTheLastOne",name:"The Last One",pa:2,dur:2.0,ti:0.85,pal:"Psicodelia",
  phases:[["Pluma legendaria",0],["Tensión",0.35],["Disparo",0.55],["Perforación",0.85],["Plumas flotantes",1.0],["Fin",1.6]],
build(a){
  const L=a.L,TR=0.35,TL=0.55,TI=0.85,TX=1.05,AIM=V3(-3.85,1.3,0.15),PB=V3(-4.25,1.32,0.15),XE=7.2;
  const lx=te=>{const k=(te-TL)/(TI-TL);return PB.x+(TC.x-PB.x)*k;};
  const fpos=(te,o)=>{if(te<TR)return qb(TAIL,tmp2.set(-4.5,1.3,0),AIM,ss(0,TR,te),o);
    if(te<TL)return o.lerpVectors(AIM,PB,ss(TR,TL,te));
    const x=Math.min(lx(te),XE);return o.set(x,PB.y+(TC.y-PB.y)*cl((x-PB.x)/(TC.x-PB.x)),PB.z*(1-cl((x-PB.x)/(TC.x-PB.x))));};
  const fang=te=>te<TR?1.6-1.6*ss(0,TR,te)+0.4*Math.sin(te*12)*(1-ss(0,TR,te)):Math.atan2(TC.y-PB.y,TC.x-PB.x);
  const feather=new THREE.Mesh(new THREE.PlaneGeometry(1.35,0.34).translate(-0.55,0,0),fxU(FEATHERM_FS,{uQ:{value:0},uH:{value:0}}));
  // halo legendario detrás de la pluma
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.9),fx(`void main(){vec2 p=(vUv-.5)*vec2(2.,1.);float d=length(p*vec2(.75,1.9));
   float n=noise(vec3(p*5.-vec2(uT*4.,0.),uT));gl_FragColor=vec4(mix(uC1,${SKY},n*.6)*1.2,smoothstep(1.,.2,d)*(.35+.3*n)*uA);}`));
  // anillos de viento celeste que se cierran en la carga
  const rings=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=pow(.5+.5*sin(an*3.-r*6.+uT*${i?-14:14}.),5.);float m=band(r,.8-.45*uP,.05)*(.4+.6*sp);
   gl_FragColor=vec4(mix(${SKY},vec3(1.),.3)*1.4,m*uA);}`,{depthTest:false}));L.mesh.add(m);return m;});
  // estela neón: núcleo blanco, cuerpo rosa y bordes celestes
  const trM=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*12.-uT*30.,vUv.y*5.,uT));
   float core=exp(-v*16.);float body=exp(-v*4.)*.6;float rim=band(v,.55+.15*n,.12)*.5;
   gl_FragColor=vec4(mix(uC1,vec3(1.),core*.7)*1.6*(core+body)+${SKY}*rim*1.4,(core+body*(.6+.4*n)+rim*n)*pow(u,.6)*uA);}`);
  const trG=new THREE.PlaneGeometry(1,0.32).translate(-0.5,0,0), trail=new THREE.Group(), t2=new THREE.Mesh(trG,trM); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(trG,trM),t2); L.trail.add(trail);
  const hole=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(feather,halo,hole);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 PB=${v3(PB)};const vec3 TC=${v3(TC)};const vec3 AIM=${v3(AIM)};varying float vR;
  vec3 lp(float t){float k=clamp((t-TL)/(TI-TL),0.,1.4);float x=PB.x+(TC.x-PB.x)*k;float kk=clamp(k,0.,1.);return vec3(x,PB.y+(TC.y-PB.y)*kk,PB.z*(1.-kk));}`;
  // carga: chispas celestes que giran y se cierran sobre la pluma
  a.count+=points(L.part,60,C+`void main(){float s=.1+aSeed.x*.4;float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);vR=0.;
   float an=aSeed.z*6.2832+k*6.;float rad=mix(.9,.1,k*k);vec3 p=AIM+vec3(-.3,0.,0.)+vec3(0.,cos(an)*rad,sin(an)*rad)+vec3((aSeed.y-.5)*.6,0.,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.03*aSeed.w);}`,SKYDOT_FS);
  // vuelo: chispas de viento celeste en hélice alrededor de la trayectoria
  a.count+=points(L.part,200,C+`void main(){float s=TL+aSeed.x*(${f(TX)}-TL);float life=.35+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=s*60.+aSeed.z*3.14159;float rad=.18+.5*t;vec3 p=lp(s)+vec3(-.2*t,cos(an)*rad,sin(an)*rad);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.035*aSeed.w)*(1.-age*.4));}`,SKYDOT_FS);
  a.count+=points(L.part,120,C+`void main(){float s=TL+aSeed.x*(${f(TX)}-TL);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=lp(s)+rnd()*.06+vec3(0.,-.25*t,0.);vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*30.+aSeed.z*40.)):0.;put(p,(.07+.07*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  // perforación: entrada y rociada de salida hacia +x
  a.count+=sparks(L.part,60,TI,`${f(TC.x-0.1)},${f(TC.y)},0.`,"-.6,.3,0.",2,5,2);
  a.count+=sparks(L.part,110,TI+0.02,`${f(TC.x+0.5)},${f(TC.y)},0.`,"1.5,.2,0.",3,9,2.5);
  // plumas flotantes alrededor del rival
  a.count+=points(L.part,44,C+`void main(){float s=TI+aSeed.x*.15;float life=1.+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.6,.5,0.))*(.8+1.4*aSeed.z);vec3 p=TC+vec3(.3,0.,0.)+v*(1.-exp(-c*3.))/3.*1.4+vec3(sin(c*3.+aSeed.w*9.)*.2,-.35*c,cos(c*2.5+aSeed.y*9.)*.15);
   vA=(t>0.&&t<life&&p.y>.03)?smoothstep(0.,.1,t)*(1.-smoothstep(.7,1.,t/life)):0.;vR=aSeed.w*6.2832+c*(1.5+2.*aSeed.y);put(p,.2+.08*aSeed.w);vMix=step(.5,aSeed.z);}`,
   featherFS(`mix(${SKY},uC1,vMix)*1.3`));
  a.count+=points(L.part,40,C+`void main(){float s=TI+.1+aSeed.x*.6;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832+t*2.;vec3 p=vec3(3.4+cos(an)*.6,.3+aSeed.w*1.5+.3*t,sin(an)*.6);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035);}`,SKYDOT_FS);

  // suelo: línea neón bajo la trayectoria y onda bajo el rival
  const line=groundPlane(1,0,0.016,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float core=exp(-v*12.);
   gl_FragColor=vec4(mix(uC1,${SKY},v)*1.3,(core*.8+exp(-v*3.)*.2)*step(u,uP)*uA);}`),0.5);
  line.position.x=(PB.x+XE)/2; line.scale.set(XE-PB.x,1,1);
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(line,shock);

  const fp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.02,0.2,te), fly=te>=TL&&te<TX, ang=fang(te);
    fpos(te,fp);
    feather.visible=te<TX; towardCam(feather.position,fp,0.05); billboard(feather,ang); feather.scale.setScalar(Math.max(form,0.001)*(1+0.1*ss(TR,TL,te)));
    set(feather,0,form*(1+0.4*ss(TR,TL,te)+(fly?0.3:0))); feather.material.uniforms.uQ.value=ss(TX-0.12,TX,te);
    halo.visible=te<TX; towardCam(halo.position,fp,0.03); billboard(halo,ang); halo.position.addScaledVector(tmp.set(-Math.cos(ang),-Math.sin(ang),0),0.35);
    set(halo,0,form*(0.6+0.6*ss(TR,TL,te)));
    rings.forEach((m,i)=>{const k=cl((te-0.12-i*0.12)/(TL-0.12-i*0.12));towardCam(m.position,AIM,0.2);billboard(m);m.visible=k>0&&k<1;set(m,k,Math.sin(Math.PI*k));});
    const len=fly?Math.min(fp.x-PB.x,5.5):0;
    trail.visible=fly||(te>=TX&&te<1.35); trail.position.copy(fly?fp:tmp2.set(Math.min(lx(TX),XE),TC.y,0)); trail.rotation.z=Math.atan2(TC.y-PB.y,TC.x-PB.x);
    trail.scale.set(Math.max(fly?len:5.5*(1-ss(TX,1.35,te)),0.001),1,1); trM.uniforms.uA.value=fly?ss(TL,TL+0.05,te):1-ss(TX,1.35,te);
    let p=cl(ia/0.4); towardCam(hole.position,TC,0.4); billboard(hole); hole.visible=ia>=0&&p<1; set(hole,p,1-p);
    set(line,cl((Math.min(fp.x,XE)-PB.x)/(XE-PB.x)),te>=TL?0.8*(1-ss(1.2,1.7,te)):0); wave(shock,ia,0.5,0.75);
    const hit=hitK(ia,5); target.position.x=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-0.2*hit*Math.cos(ia*13);
    target.scale.set(1-0.06*hit,1+0.04*hit,1);
    if(te<TL){o.g.copy(fp);o.gs=0.9+0.6*ss(TR,TL,te);o.ga=0.25*form+0.2*ss(TR,TL,te);o.li=2+2*ss(TR,TL,te);}
    else if(te<TI){o.g.copy(fp);o.gs=1.5;o.ga=0.55;o.li=5;}
    else{o.g.copy(TC);o.gs=1.4+3*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.8;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.75;
  };
}};

// =====================================================================
// 6 · SWALLOW — una golondrina sale de la cola, vuela a ras de suelo cortando el aire con sus alas afiladas, abre
//     al rival con un doble tajo, remonta en un rizo y regresa al Axie devolviéndole vida
// =====================================================================
const SW=BIRD({bl:.32,bt:.1,hx:.36,hy:.08,hr:.1,bk:.07,bkw:.03,tl:.5,ts:.1,tw:.045,tf:.2,fork:.55,wx:.04,wy:.06,wl:1.05,ww:.17,amp:.9});
const swallow={key:"btSwallow",name:"Swallow",pa:2,dur:2.2,ti:0.9,pal:"Arcano",
  phases:[["Salida",0],["Vuelo rasante",0.15],["Corte",0.9],["Rizo",1.0],["Regreso",1.4],["Vida",1.8],["Fin",2.05]],
build(a){
  const L=a.L,T1=0.15,T2=0.78,TI=0.9,T4=1.4,TB=1.8,YL=0.32,P2=V3(2.4,YL,0),HP=V3(3.25,1.2,0),AP=V3(1.6,3.3,0.3),CB=V3(-3.85,1.45,0);
  const zw=x=>0.25*Math.sin(x*1.3);
  const spos=(te,o)=>{
    if(te<T1)return qb(TAIL,tmp2.set(-4.0,1.25,0),tmp.set(-3.3,0.45,zw(-3.3)),ss(0,T1,te),o);
    if(te<T2){const k=(te-T1)/(T2-T1),x=-3.3+(P2.x+3.3)*k;return o.set(x,YL+(0.45-YL)*(1-ss(0,0.25,k))+0.05*Math.sin(x*3),zw(x));}
    if(te<TI)return qb(tmp2.set(P2.x,YL,zw(P2.x)),tmp.set(3.0,0.32,0),HP,(te-T2)/(TI-T2),o);
    if(te<T4)return qb(HP,tmp2.set(4.8,3.6,0),AP,ss(TI,T4,te),o);
    return qb(AP,tmp2.set(-1.5,3.0,0.3),CB,ss(T4,TB,te),o);};
  // golondrina: dorso azul noche (mezcla normal), garganta y vientre claros, filos de las alas brillantes
  const bird=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2),fxU(SW.sd+`uniform float uQ;uniform float uF;void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float d=sdBird(p,uQ,uF);
   float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.03);float belly=smoothstep(.03,-.08,p.y+.02-p.x*.1)*step(-.3,p.x)*step(p.x,.45);
   float throat=smoothstep(.09,.0,length(p-vec2(.4,0.)));float eye=smoothstep(.03,.012,length(p-${SW.eye}));
   vec3 c=mix(vec3(.04,.06,.2),uC2*.35,.4);c=mix(c,vec3(.92,.9,.86),belly*.85);c=mix(c,vec3(.75,.22,.12),throat*.8);
   c=c*(1.-eye)+uC1*rim*1.8;gl_FragColor=vec4(c,max(fill,rim*.8)*uA);}`,{uQ:{value:0},uF:{value:0}},NB));
  L.mesh.add(bird);
  // doble tajo de alas sobre el rival
  const cuts=[0.55,-0.4].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.1),fxU(SLASH_FS,{uQ:{value:0}},{depthTest:false}));L.mesh.add(m);return m;});
  // estela: cinta fina que corta el aire detrás de la golondrina
  const trM=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float core=exp(-v*18.);float n=noise(vec3(u*10.-uT*20.,v*4.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*core*u*.4,(core+exp(-v*5.)*.25*n)*pow(u,1.5)*uA);}`);
  const trG=new THREE.PlaneGeometry(1,0.18).translate(-0.5,0,0), trail=new THREE.Group(), t2=new THREE.Mesh(trG,trM); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(trG,trM),t2); L.trail.add(trail);

  const C=`const float T1=${f(T1)};const float T2=${f(T2)};const float TI=${f(TI)};const float T4=${f(T4)};const float TB=${f(TB)};const vec3 HP=${v3(HP)};const vec3 CB=${v3(CB)};varying float vR;`+QB+`
  vec3 low(float t){float k=clamp((t-T1)/(T2-T1),0.,1.);float x=-3.3+${f(P2.x+3.3)}*k;return vec3(x,${f(YL)}+.13*(1.-smoothstep(0.,.25,k))+.05*sin(x*3.),.25*sin(x*1.3));}
  vec3 sp(float t){if(t<T2)return low(t);if(t<TI)return qb(vec3(${f(P2.x)},${f(YL)},${f(zw(P2.x))}),vec3(3.,.32,0.),HP,(t-T2)/(TI-T2));
   if(t<T4)return qb(HP,vec3(4.8,3.6,0.),${v3(AP)},smoothstep(TI,T4,t));return qb(${v3(AP)},vec3(-1.5,3.,.3),CB,smoothstep(T4,TB,t));}`;
  // salida: bocanada de aire desde la cola
  a.count+=points(L.part,24,C+`void main(){float s=.02;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=${v3(TAIL)}+normalize(rnd()+.0001)*(.05+.4*aSeed.z)*(1.-exp(-t*7.));vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.05+.04*aSeed.w)*(1.-age*.5));}`);
  // a ras de suelo: líneas de corte del aire desde las puntas de las alas y polvo levantado
  a.count+=points(L.part,160,C+`void main(){float s=T1+aSeed.x*(TI-T1);float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float side=aSeed.z<.5?1.:-1.;vec3 p=sp(s)+vec3(-.15,.22*side,.3*side)+vec3(-.6*t,0.,.1*side*t);
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,.022+.02*aSeed.w);}`);
  a.count+=points(L.part,80,C+`void main(){float s=T1+.05+aSeed.x*(T2-T1);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 b=low(s);float side=aSeed.z<.5?1.:-1.;vec3 p=vec3(b.x-.1,.05,b.z)+vec3(-.25*t,.25*(1.-exp(-t*4.)),side*(.15+.5*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.16+.14*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // estela de motas a lo largo de todo el vuelo
  a.count+=points(L.part,80,C+`void main(){float s=aSeed.x*TB;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   vec3 p=sp(s)+rnd()*.05+vec3(0.,-.15*t,0.);vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,(.03+.03*aSeed.w)*(1.-age*.5));}`);
  // corte: chispas y plumitas
  a.count+=sparks(L.part,90,TI,`${f(HP.x)},${f(HP.y)},0.`,".6,.5,0.",2.5,7,2.2);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.4,.5,0.))*(1.+1.5*aSeed.z);vec3 p=HP+v*(1.-exp(-c*3.))/3.+vec3(sin(c*4.+aSeed.w*9.)*.12,-.6*c,0.);
   vA=(t>0.&&t<life&&p.y>.03)?1.-t/life:0.;vR=aSeed.w*6.2832+c*3.;put(p,.12+.05*aSeed.w);}`,featherFS(`mix(vec3(.08,.1,.3),uC1,vMix*.6)*1.4`));
  // vida: la golondrina se funde con el Axie y una luz suave sube por él
  a.count+=points(L.part,24,C+`void main(){float s=TB;float life=.5+aSeed.y*.3;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.5,0.))*(.6+.8*aSeed.z);vec3 p=CB+v*(1.-exp(-c*3.))/3.+vec3(0.,-.3*c,0.);
   vA=(t>0.&&t<life)?1.-t/life:0.;vR=aSeed.w*6.2832+c*3.;put(p,.1+.04*aSeed.w);}`,featherFS(`mix(vec3(.08,.1,.3),uC1,vMix*.6)*1.4`));
  a.count+=points(L.part,60,C+`void main(){float s=TB-.05+aSeed.x*.25;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);vR=0.;
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.42,.1+aSeed.w*1.2+t*1.3,sin(an)*.42);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.04*aSeed.w);}`);

  // suelo: estela rasante de viento y anillo bajo el rival y bajo el Axie
  const wake=groundPlane(1,0,0.016,fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;float w=v-.25*sin((u*${f(P2.x+3.3)}-3.3)*1.3)/.6;
   float n=noise(vec3(u*30.-uT*6.,v*3.,1.));float m=smoothstep(.5,0.,abs(w))*(.4+.6*n)*step(u,uP)*smoothstep(0.,.05,u);
   float age=clamp(uP-u,0.,1.);gl_FragColor=vec4(mix(uC2,uC1,exp(-age*6.))*1.3,m*exp(-age*2.)*uA);}`),0.6);
  wake.position.x=(-3.3+P2.x)/2; wake.scale.set(P2.x+3.3,1,1);
  const shock=groundPlane(3,3.4,0.03,fx(RING_FS)), life=groundPlane(1.6,-3.7,0.025,fx(RING_FS));
  L.decal.add(wake,shock,life);

  const bp=V3(0,0,0), bv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, form=ss(0.0,0.08,te);
    spos(te,bp); velOf(spos,te,bv);
    bird.visible=te<TB+0.02; towardCam(bird.position,bp,0.05); faceFly(bird,bv,0.4*Math.max(form,0.001)*(te>TB-0.12?1-0.7*ss(TB-0.12,TB,te):1));
    const low=te>=T1&&te<TI;
    bird.material.uniforms.uQ.value=low?0.25*Math.sin(te*34):Math.sin(te*22); bird.material.uniforms.uF.value=low?0.35:0;
    bird.material.uniforms.uA.value=form;
    const fly=te<TB, len=Math.min(bv.length()*6,1.4);
    trail.visible=fly; trail.position.copy(bp); trail.rotation.z=Math.atan2(bv.y,bv.x); trail.scale.set(Math.max(len,0.001),1,1); trM.uniforms.uA.value=form*(1-ss(TB-0.15,TB,te));
    cuts.forEach((m,i)=>{const it=ia-i*0.06,s=it/0.08;m.visible=it>=0&&it<0.6;towardCam(m.position,HP,0.55+i*0.02);billboard(m,i?-0.4:0.55);
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.4,s>1?Math.exp(-(s-1)*1.4):1);m.material.uniforms.uQ.value=it>0.08?Math.exp(-(it-0.08)*3):0;});
    set(wake,cl((bp.x+3.3)/(P2.x+3.3))*(te<TI?1:1),te>=T1?0.85*(1-ss(1.3,1.8,te)):0);
    wave(shock,ia,0.5,0.7); wave(life,ib,0.5,0.6);
    const lv=ib>=0?ss(0,0.1,ib)*(1-ss(0.25,0.4,ib)):0, cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.55*lv;
    caster.rotation.z=0.06*ss(0,0.1,te)*(1-ss(0.1,0.3,te))+(ib>=0?0.05*Math.exp(-ib*6)*Math.sin(ib*20):0);
    const hit=hitK(ia,6); target.position.x=3.4+0.15*hit; target.rotation.z=0.2*hit*Math.cos(ia*14); target.position.y=0.05*hit;
    if(te<TI){o.g.copy(bp);o.gs=0.8;o.ga=0.22*form;o.li=1.8;}
    else if(te<TB){o.g.copy(ia<0.4?HP:bp);o.gs=ia<0.4?1.2+2.5*ia:0.8;o.ga=ia<0.4?Math.exp(-ia*10)*0.7:0.2;o.li=ia<0.4?7*Math.exp(-ia*5):1.8;}
    else{o.g.copy(CB);o.gs=1.2;o.ga=0.35*lv;o.li=3*lv;}
    o.ia=te<TB?ia:ib;o.c.copy(te<TB?HP:CB);o.shake=0;o.dist=te<TB?0.6:0.2;o.flash=te<TB?1:0;
  };
}};

VFX.module("Pájaro · Cola",[cloud,featherFan,granma,postFight,lastOne,swallow]);
})();

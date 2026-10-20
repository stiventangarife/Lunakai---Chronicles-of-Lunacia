// =====================================================================
// MÓDULO · CLASE REPTIL (OREJAS)
// Estética de clase: escamas, veneno púrpura, púas de hueso y piedra, escarcha de sangre fría, polvo del desierto.
// No se dibuja anatomía del Axie: los efectos nacen de la nuca/orejas (≈ x −3.72, y 1.82) o del mentón como
// proyecciones de energía temporales. Nivel por PA: 1 rápido y pequeño, 2 firme (sin fractura), 3 pesado (fractura).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,CROSS_FS,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,CHEVRON_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0);                                   // pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const hash1=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const qbd=(a,b,c,t,o)=>o.set(2*(1-t)*(b.x-a.x)+2*t*(c.x-b.x),2*(1-t)*(b.y-a.y)+2*t*(c.y-b.y),2*(1-t)*(b.z-a.z)+2*t*(c.z-b.z));
const glowOn=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),24.)`;
// SDF 2D: segmento y unión suave
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}`;
// quemadura suave (nivel 2): mancha sin grietas
const SOFTBURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;
// copo de escarcha de seis brazos (vMix = giro)
const FLAKE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float r=length(q);float an=atan(q.y,q.x)+vMix*6.2832;
 float arm=pow(abs(cos(an*3.)),40.)*smoothstep(.48,.04,r);float br=pow(abs(cos(an*3.)),8.)*band(r,.27,.05);float c=smoothstep(.12,0.,r);
 float a=(arm+br+c)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35+.45*c)*1.5,a);}`;
// gota (mezcla normal); col = color GLSL
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,0.)));
 gl_FragColor=vec4(${col}*(.75+.4*vMix)*(1.15-d*1.2)+vec3(1.)*hl*.6,a);}`;
// flecha hacia abajo (debilitado: ataque reducido)
const DCHEV_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=abs(q.y-.15+abs(q.x)*.9);
 float a=smoothstep(.09,.04,d)*step(abs(q.x),.38)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.45)*1.5,a);}`;
// destello de gema/estrella en malla billboard
const GLINT_FS=`void main(){vec2 q=abs(vUv-.5)*2.;float s=smoothstep(.1,0.,q.x*q.y*7.+min(q.x,q.y)*1.2)*smoothstep(1.,.15,max(q.x,q.y));
 float c=smoothstep(.4,0.,length(q));gl_FragColor=vec4(mix(uC1,vec3(1.),.4+.4*c)*1.5,(s+c*.8)*uA);}`;

// =====================================================================
// 1 · CURVED SPINE (2 PA) — un abanico de púas curvas se eriza en la nuca; las púas salen en arco y se clavan en
//     corona alrededor del aliado; entre ellas sube un escudo de placas óseas. Represalia: las púas salen disparadas
//     hacia fuera contra los atacantes adyacentes
// =====================================================================
const curved={key:"roCurvedSpine",name:"Curved Spine",pa:2,dur:2.2,ti:0.8,pal:"Plata",allies:1,
  phases:[["Erizado",0],["Púas",0.34],["Escudo",0.8],["Represalia",1.32],["Fin",1.85]],
build(a){
  const L=a.L,TL=0.34,FL=0.3,ST=0.02,TI=0.8,TR=1.32,TE=1.85,TF=2.15,N=8,RR=0.78,A=ALLY_POS[0],AC=V3(A.x,0.95,A.z),NP=V3(-3.86,1.86,0);
  const ANG=k=>k/N*Math.PI*2+0.2;
  const B=[],CT=[];for(let k=0;k<N;k++){const th=ANG(k);B.push(V3(A.x+Math.cos(th)*RR,0,A.z+Math.sin(th)*RR));CT.push(V3((NP.x+B[k].x)/2,3.1,(NP.z+B[k].z)/2));}
  // abanico de siete púas curvas que se eriza tras la cabeza (proyección de energía)
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.95),fx(`
  void main(){vec2 p=(vUv-vec2(.5,.08))*vec2(1.26,1.);float m=0.,tip=0.;
   for(int i=0;i<7;i++){float fi=float(i);float an=(fi-3.)*.3;vec2 d=vec2(sin(an),cos(an));
    float len=(.6+.25*(1.-abs(fi-3.)/3.))*uP;
    vec2 r=vec2(dot(p,vec2(d.y,-d.x)),dot(p,d));r.x+=.35*r.y*r.y;
    float t=clamp(r.y/max(len,.001),0.,1.);float w=.06*(1.-t)+.003;
    float s=smoothstep(w,w*.3,abs(r.x))*step(0.,r.y)*step(r.y,len);
    m=max(m,s);tip=max(tip,s*smoothstep(.55,1.,t));}
   float n=noise(vec3(p*8.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,.35+tip*.65)*1.5+vec3(1.)*tip*.5,m*(.7+.3*n)*uA);}`));
  // púas de hueso pétreo (opacas): base en el origen, punta en +y
  const boneMat=fx(`void main(){float h=clamp(vP.y/.46,0.,1.);float n=noise(vP*38.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 c=mix(vec3(.4,.37,.46),vec3(.9,.88,.95),h*.45+n*.4)*${LIT};
   gl_FragColor=vec4(c+uC1*(pow(h,5.)*1.8+fr*.5)*uA+uC2*fr*.3,1.);}`,SOLID);
  const spG=new THREE.ConeGeometry(0.055,0.46,8).translate(0,0.23,0);
  const spikes=B.map(()=>{const m=new THREE.Mesh(spG,boneMat);L.mesh.add(m);return m;});
  // escudo: cúpula de placas óseas imbricadas que sube del suelo; uQ = onda de la represalia
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,40,22,0,Math.PI*2,0,Math.PI/2),fxU(`uniform float uQ;
  void main(){vec3 q=normalize(vP);float h=q.y;if(h>uP*1.04)discard;float an=atan(q.z,q.x)/6.2832;
   vec2 g=vec2(an*18.,h*7.);g.x+=.5*mod(floor(g.y),2.);vec2 c=fract(g);
   float d=length((c-vec2(.5,1.))*vec2(1.,1.25));float rim=band(d,.62,.07);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float front=band(h,uP*1.04,.05)*step(uP,.99);float n=noise(vec3(g*1.3,uT*.6));
   float hit=band(fract(h*1.5-uQ*1.2),.5,.1)*step(.001,uQ)*step(uQ,.99);
   gl_FragColor=vec4(mix(uC2,uC1,fr*.7+rim*.4)*1.25+vec3(1.)*(front+hit)*.7,(fr*.5+rim*.26*(.6+.4*n)+.035+front+hit*.6)*uA);}`,{uQ:{value:0}}));
  dome.position.set(A.x,0,A.z); dome.scale.set(0.98,2.1,0.98);
  L.mesh.add(fan,dome);

  const C=`const float TL=${f(TL)};const float FL=${f(FL)};const float ST=${f(ST)};const float TI=${f(TI)};const float TR=${f(TR)};
  const vec3 NP=${v3(NP)};const vec3 A=${v3(A)};
  vec3 bse(float k){float th=k/8.*6.2832+.2;return A+vec3(cos(th),0.,sin(th))*${f(RR)};}
  vec3 ctl(float k){vec3 b=bse(k);return vec3((NP.x+b.x)*.5,3.1,(NP.z+b.z)*.5);}`+QB;
  // energía que converge en la nuca
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*(TL-.12);float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(NP+normalize(rnd()+vec3(0.,.4,0.))*.8,NP,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.z);}`);
  // estela de cada púa en su arco
  a.count+=points(L.part,150,C+`void main(){float k=floor(aSeed.y*7.999);float t0=TL+k*ST;float s=t0+aSeed.x*FL;float u=(s-t0)/FL;
   float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(NP,ctl(k),bse(k),u)+rnd()*.05+vec3(0.,-.3*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.035*aSeed.w)*(1.-age*.5));}`);
  // polvo al clavarse
  a.count+=points(L.part,64,C+`void main(){float k=floor(aSeed.y*7.999);float s=TL+k*ST+FL;float life=.45+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=bse(k)+vec3(cos(an),0.,sin(an))*(.05+.35*(1.-exp(-t*5.)))*(.5+aSeed.x)+vec3(0.,.05+.2*(1.-exp(-t*4.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.12+.1*aSeed.x)*(.6+age));}`,DUST_FS,NB);
  // motas que suben dentro del escudo (bucle, uE = vida del escudo)
  a.count+=points(L.part,90,C+`void main(){float life=.8+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.5;float rad=(.2+.6*r.y)*(1.-age*.3);
   vec3 p=vec3(A.x+cos(an)*rad,.1+age*1.9,A.z+sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE*.8:0.;put(p,.03+.03*r.z);}`);
  // represalia: esquirlas de hueso en corona
  a.count+=points(L.part,50,C+`void main(){float s=TR+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),.4+.8*aSeed.w,sin(an))*(2.+3.*aSeed.y);vec3 p=A+vec3(0.,.4,0.)+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,90,TR,`${f(A.x)},.45,${f(A.z)}`,"0.,.25,0.",3,8,2.5);

  // sello óseo bajo el aliado: anillos y muescas donde se clavan las púas
  const glyph=groundPlane(2.3,A.x,0.02,fx(`void main(){vec2 p=vUv-.5;p.y=-p.y;float r=length(p)*2.;float an=atan(p.y,p.x);
   float k=fract((an-.2)/6.2832*8.+.5);float notch=smoothstep(.1,0.,abs(k-.5))*band(r,.68,.09);
   float m=(band(r,.86,.02)+band(r,.68,.012)+notch*1.4+band(r,.5,.03)*step(.5,fract(an/6.2832*24.+uT*.2))*.6)*step(r,uP*1.02);
   gl_FragColor=vec4(mix(uC2,uC1,notch+r*.3)*1.4,m*uA);}`));
  glyph.position.z=A.z;
  const shock=groundPlane(3.4,A.x,0.03,fx(RING_FS)); shock.position.z=A.z;
  L.decal.add(glyph,shock);

  const dv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR, bris=ss(0,TL-0.04,te), env=ss(TI-0.05,TI+0.08,te)*(1-ss(TE,TF,te));
    caster.rotation.z=-0.08*bris*(1-ss(TL,TL+0.05,te))+0.1*ss(TL,TL+0.05,te)*(1-ss(TL+0.15,TL+0.5,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*bris*(1-ss(TL,TL+0.3,te));
    towardCam(fan.position,tmp.set(NP.x-0.05,NP.y+0.36,0),-0.12); billboard(fan,0.35);
    fan.visible=te<TL+0.25; set(fan,ss(0,TL-0.06,te)*(1+0.05*Math.sin(te*40)),ss(0,0.08,te)*(1-ss(TL,TL+0.2,te)));
    // púas: vuelo en arco → clavadas e inclinadas hacia fuera → disparadas en corona
    spikes.forEach((m,k)=>{const t0=TL+k*ST,u=(te-t0)/FL,th=ANG(k),c=Math.cos(th),s=Math.sin(th);let sc=1;
      if(u<0){m.visible=false;return;}
      if(u<1){qb(NP,CT[k],B[k],u,m.position);qbd(NP,CT[k],B[k],u,dv);}
      else if(te<TR){const il=te-t0-FL;m.position.copy(B[k]);m.position.y=-0.07;dv.set(c*0.45+0.08*Math.sin(il*40)*Math.exp(-il*8),1,s*0.45);}
      else{const t=te-TR;dv.set(c,0.3,s).normalize();m.position.copy(B[k]).addScaledVector(dv,2.3*(1-Math.exp(-t*6)));m.position.y+=0.15;sc=1-ss(0.22,0.45,t);}
      m.visible=sc>0.01; m.scale.setScalar(Math.max(sc,0.001)); m.quaternion.setFromUnitVectors(YA,dv.normalize());});
    boneMat.uniforms.uA.value=0.35+0.65*hitK(ir,5)+0.4*hitK(ia,6);
    dome.visible=env>0.001; set(dome,ss(TI-0.05,TI+0.22,te),env*(1+0.6*hitK(ir,6)));
    dome.material.uniforms.uQ.value=ir>=0?cl(ir/0.5):0;
    set(glyph,ss(TL+0.1,TI,te),ss(TL+0.1,TL+0.3,te)*(1-ss(TE,TF,te)));
    let p=cl(ir/0.45); set(shock,1-Math.pow(1-p,2),ir>=0?(1-p)*0.8:0);
    U.uE.value=env;
    glowOn(allies[0],0.55*hitK(ia,4)+0.15*env+0.35*hitK(ir,6));
    if(te<TL){o.g.set(NP.x,NP.y+0.35,0);o.gs=0.9*bris;o.ga=0.35*bris;o.li=2*bris;}
    else if(te<TI){const k=cl((te-TL)/(TI-TL));o.g.lerpVectors(NP,AC,k);o.g.y+=1.1*Math.sin(Math.PI*k);o.gs=1;o.ga=0.4;o.li=3;}
    else if(ir<0){o.g.copy(AC);o.gs=1.6+2*Math.min(ia,0.4);o.ga=0.6*hitK(ia,8)+0.12*env;o.li=6*hitK(ia,5)+1.5*env;}
    else{o.g.copy(AC);o.gs=1.8+3*Math.min(ir,0.4);o.ga=0.55*hitK(ir,9)+0.1*env;o.li=6*hitK(ir,5)+1.5*env;}
    o.ia=ir>=0?ir:ia;o.c.copy(AC);o.shake=0;o.dist=0.45;o.flash=0;
  };
}};

// =====================================================================
// 2 · FRIEZARD (2 PA) — un espíritu de lagarto de hielo se materializa sobre el Axie y exhala un cono de escarcha
//     azul-violeta que congela los pies del rival (costra de hielo y cristales); después, copos sanadores caen
//     sobre todo el escuadrón con chevrones de fuerza (+daño)
// =====================================================================
const friezard={key:"roFriezard",name:"Friezard",pa:2,dur:2.3,ti:1.0,pal:"Arcano",allies:2,
  phases:[["Espíritu",0],["Aliento",0.5],["Congelación",1.0],["Bendición",1.35],["Fin",1.95]],
build(a){
  const L=a.L,TS=0.5,TI=1.0,TB=1.35,TE=1.95,TF=2.3,LZ=V3(-3.1,2.5,0),MO=V3(-2.32,2.5,0),FT=V3(3.4,0.12,0),FX=3.4;
  // espíritu: silueta de lagarto de perfil hecha de escarcha; se materializa por ruido (uP), uQ = brillo de la boca
  const lizard=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.2),fxU(SDF2+`uniform float uQ;
  float sdLiz(vec2 p,float t){
   float d=sdSeg(p,vec2(-.32,0.),vec2(.32,.02))-.12;
   d=smin(d,sdSeg(p,vec2(.3,.03),vec2(.5,.06))-.08,.06);
   d=smin(d,length((p-vec2(.56,.06))*vec2(.9,1.25))-.1,.04);
   d=smin(d,sdSeg(p,vec2(.56,.05),vec2(.74,.02))-.045,.03);
   vec2 t1=vec2(-.62,-.02+.03*sin(t*4.)),t2=vec2(-.88,.05+.04*sin(t*4.+1.));
   d=smin(d,sdSeg(p,vec2(-.3,0.),t1)-.075,.05);d=min(d,sdSeg(p,t1,t2)-.04);d=min(d,sdSeg(p,t2,vec2(-1.02,.02))-.018);
   d=smin(d,sdSeg(p,vec2(.2,-.05),vec2(.3,-.2))-.035,.03);d=min(d,sdSeg(p,vec2(.3,-.2),vec2(.38,-.22))-.025);
   d=smin(d,sdSeg(p,vec2(.12,-.05),vec2(.04,-.2))-.035,.03);
   d=smin(d,sdSeg(p,vec2(-.18,-.05),vec2(-.1,-.21))-.035,.03);
   d=smin(d,sdSeg(p,vec2(-.26,-.05),vec2(-.36,-.2))-.035,.03);d=min(d,sdSeg(p,vec2(-.36,-.2),vec2(-.45,-.22))-.025);
   return d;}
  void main(){vec2 p=(vUv-.5)*vec2(2.2,1.1);float d=sdLiz(p,uT);
   float n=noise(vec3(p*7.,uT*.5));float cr=pow(1.-abs(noise(vec3(p*11.,3.))*2.-1.),10.);
   float on=step(noise(vec3(p*5.,1.))-uP*1.2+.1,0.);
   float fill=smoothstep(.015,-.015,d)*on;float rim=band(d,0.,.02)*on;float halo=smoothstep(.12,0.,d)*step(0.,d)*.25*on;
   float spine=band(p.y,.1+.02*sin(p.x*40.),.012)*step(abs(p.x+.05),.4)*fill;
   float eye=smoothstep(.022,0.,length(p-vec2(.6,.1)))*on;float mouth=smoothstep(.13,0.,length(p-vec2(.74,.02)))*uQ;
   gl_FragColor=vec4(mix(uC2,uC1,.35+.5*n+cr*.4)*1.3+vec3(1.)*(rim*.6+cr*fill*.5+eye+mouth+spine),(fill*(.25+.3*n)+cr*fill*.6+rim+halo+eye+mouth+spine)*uA);}`,{uQ:{value:0}}));
  // aliento: cono de escarcha que avanza (uP = frente) de la boca a los pies del rival
  const BL=MO.distanceTo(FT), BD=V3(0,0,0).copy(FT).sub(MO).normalize();
  const breath=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.08,1,32,12,true).translate(0,0.5,0),fx(`
  void main(){float h=vP.y;if(h>uP)discard;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*2.,h*9.-uT*14.,uT))*.6+noise(vec3(an*6.,h*22.-uT*20.,2.))*.4;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float head=smoothstep(.08,0.,uP-h)*step(uP,.995);
   float al=(smoothstep(.35,.8,n)*.55+pow(fr,1.5)*.3)*smoothstep(0.,.06,h)*(1.-h*.35)+head*.6;
   gl_FragColor=vec4(mix(uC2,uC1,n*.7+h*.3)*1.3+vec3(.85,.92,1.)*smoothstep(.65,.9,n)*.4,al*uA);}`));
  breath.position.copy(MO); breath.quaternion.setFromUnitVectors(YA,BD); breath.scale.set(1,BL,1);
  // costra de hielo en los pies (borde superior dentado) y cristales que brotan alrededor
  const crust=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.62,0.5,36,1,true),fx(`
  void main(){float h=vP.y/.5+.5;float an=atan(vP.z,vP.x);
   float top=.55+.45*noise(vec3(an*5.,0.,1.));if(h>top*uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float cr=pow(1.-abs(noise(vec3(an*4.,h*3.,5.))*2.-1.),12.);
   gl_FragColor=vec4(mix(uC2,uC1,fr+cr)*1.2+vec3(.9,.95,1.)*cr*.6,(fr*.7+cr*.8+.12)*uA);}`));
  crust.position.set(FX,0.25,0);
  const crM=fx(`void main(){float h=vP.y;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);float fac=step(.5,fract(atan(vP.z,vP.x)*.955+.25));
   gl_FragColor=vec4(mix(uC2,uC1,fr*.7+fac*.3)*1.3+vec3(1.)*pow(h,3.)*.5,(.25+fr*.75)*uA);}`);
  const crG=new THREE.ConeGeometry(0.085,1,6).translate(0,0.5,0);
  const crys=[];for(let i=0;i<9;i++){const th=i/9*Math.PI*2+hash1(i)*0.5,r=0.45+0.2*hash1(i+9),m=new THREE.Mesh(crG,crM);
    m.position.set(FX+Math.cos(th)*r,0,Math.sin(th)*r);m.quaternion.setFromUnitVectors(YA,V3(Math.cos(th)*0.55,1,Math.sin(th)*0.55).normalize());
    m.userData={h:0.28+0.34*hash1(i+19),d:0.12*hash1(i+29)};L.mesh.add(m);crys.push(m);}
  L.mesh.add(lizard,breath,crust);

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TB=${f(TB)};const vec3 LZ=${v3(LZ)};const vec3 MO=${v3(MO)};const vec3 FT=${v3(FT)};
  const vec3 P0=vec3(-3.7,0.,0.);const vec3 P1=${v3(ALLY_POS[0])};const vec3 P2=${v3(ALLY_POS[1])};
  vec3 who(float x){return x<.333?P0:(x<.666?P1:P2);}`;
  // escarcha que se reúne para dar forma al espíritu
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*(TS-.15);float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 d=LZ+vec3((aSeed.y-.5)*1.8,(aSeed.z-.5)*.4,0.);vec3 p=mix(d+rnd()*.8,d,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.w);}`);
  // copos del aliento: viajan por el cono abriéndose
  a.count+=points(L.part,200,C+`void main(){float s=TS+aSeed.x*(TI+.12-TS);float u=(uT-s)/.45;
   vec3 r=rnd();vec3 p=mix(MO,FT,clamp(u,0.,1.))+vec3(r.x*.25,r.y,r.z)*(.06+.62*clamp(u,0.,1.));
   vA=(u>0.&&u<1.)?smoothstep(0.,.1,u)*(1.-u*.4):0.;put(p,.07+.08*aSeed.z);vMix=aSeed.w+uT*(.3+.4*aSeed.y);}`,FLAKE_FS);
  // vaho frío a lo largo del cono (mezcla normal)
  a.count+=points(L.part,60,C+`void main(){float s=TS+aSeed.x*(TI-TS);float u=(uT-s)/.6;
   vec3 r=rnd();vec3 p=mix(MO,FT,clamp(u,0.,1.)*.9)+r*(.1+.5*clamp(u,0.,1.));
   vA=(u>0.&&u<1.)?sin(u*3.14159)*.4:0.;put(p,(.3+.25*aSeed.w)*(.6+u));}`,SMOKE_FS("mix(uC1,vec3(.92,.96,1.),.55)"),NB);
  // estallido helado en los pies
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.1;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.5*aSeed.w),1.+2.*aSeed.y,sin(an)*(1.+1.5*aSeed.w));vec3 p=FT+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.06+.06*aSeed.w);vMix=aSeed.w+t;}`,FLAKE_FS);
  a.count+=sparks(L.part,80,TI,`${f(FX)},.2,0.`,"0.,.7,0.",2,6,2);
  // bendición: copos sanadores sobre lanzador y aliados, y chevrones de fuerza
  a.count+=points(L.part,90,C+`void main(){vec3 P=who(aSeed.y);float s=TB+aSeed.x*.6;float life=.9;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*2.;float rad=.25+.4*aSeed.w;vec3 p=P+vec3(cos(an)*rad,2.4-1.9*age,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.08+.06*aSeed.w);vMix=aSeed.w+age;}`,FLAKE_FS);
  a.count+=points(L.part,30,C+`void main(){vec3 P=who(aSeed.y);float s=TB+.2+aSeed.x*.45;float life=.6;float age=(uT-s)/life;
   vec3 p=P+vec3((aSeed.z-.5)*.8,.4+age*1.3,(aSeed.w-.5)*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.16+.08*aSeed.w);}`,CHEVRON_FS);

  // escarcha radial en el suelo bajo el rival y anillos de bendición bajo el escuadrón
  const frost=groundPlane(2.6,FX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float fe=pow(abs(sin(an*9.+noise(vec3(r*4.,an,1.))*2.)),20.)*smoothstep(1.,.2,r);
   float n=noise(vec3(p*14.,2.));float m=(smoothstep(1.,.3,r)*(.25+.3*n)+fe*.8)*step(r,uP);
   m+=band(r,uP,.05)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,n+fe*.5)*1.2,m*uA);}`));
  const shock=groundPlane(3.6,FX,0.03,fx(RING_FS));
  const rings=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]].map(P=>{const r=groundPlane(1.8,P.x,0.03,fx(RING_FS));r.position.z=P.z;return r;});
  L.decal.add(frost,shock,...rings);

  a.pose=function(te,o){
    const ia=te-TI, ib=te-TB, mat=ss(0,TS,te), fade=1-ss(TI+0.15,TB+0.2,te), bx=cl((te-TS)/(TI-TS));
    lizard.position.set(LZ.x,LZ.y+0.05*Math.sin(te*3),LZ.z); billboard(lizard);
    lizard.visible=mat*fade>0.001; set(lizard,mat*1.05,ss(0,0.15,te)*fade); lizard.material.uniforms.uQ.value=ss(TS-0.1,TS,te)*(1-ss(TI,TI+0.2,te));
    breath.visible=te>=TS&&te<TI+0.4; set(breath,Math.pow(bx,0.8)*1.01,ss(TS,TS+0.08,te)*(1-ss(TI+0.05,TI+0.4,te)));
    const fr=ss(TI,TI+0.08,te)*(1-ss(TE,TF,te));
    crust.visible=fr>0.001; set(crust,ss(TI-0.02,TI+0.25,te),fr);
    crys.forEach(m=>{const u=m.userData,g=ss(TI+u.d,TI+u.d+0.15,te)*(1-ss(TE,TF,te));m.visible=g>0.001;m.scale.set(Math.max(g,0.001),Math.max(u.h*g,0.001),Math.max(g,0.001));});
    crM.uniforms.uA.value=0.8+0.6*hitK(ia,5);
    set(frost,ss(TI-0.05,TI+0.3,te),ss(TI-0.05,TI+0.05,te)*(1-ss(TE,TF,te)));
    let p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    p=cl(ib/0.5); rings.forEach(r=>set(r,1-Math.pow(1-p,2),ib>=0?(1-p)*0.7:0));
    // escuadrón: brillo de bendición; caster se inclina al exhalar el espíritu
    const bl=0.45*hitK(ib,3)*(ib>=0?1:0); glowOn(allies[0],bl); glowOn(allies[1],bl);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*mat*fade+bl;
    caster.rotation.z=-0.06*ss(TS-0.1,TS+0.1,te)*(1-ss(TI,TI+0.3,te));
    // rival: tiritona con los pies presos, brillo helado
    const fz=ss(TI,TI+0.1,te)*(1-ss(TE,TF,te));
    target.position.x=3.4+0.012*Math.sin(te*90)*fz*(1-ss(TI+0.4,TI+0.8,te))+0.05*hitK(ia,8);
    o.em=0.35*fz; o.emc.copy(U.uC1.value);
    if(te<TS){o.g.copy(LZ);o.gs=1.4*mat;o.ga=0.35*mat;o.li=2.5*mat;}
    else if(te<TI){o.g.lerpVectors(MO,FT,Math.pow(bx,0.8));o.gs=1.2;o.ga=0.45;o.li=4;}
    else if(te<TB){o.g.set(FX,0.5,0);o.gs=1.5+2.5*Math.min(ia,0.4);o.ga=0.65*hitK(ia,8)+0.1;o.li=7*hitK(ia,5)+1;}
    else{o.g.set(-2.9,1.4,-1);o.gs=3;o.ga=0.25*hitK(ib,3);o.li=3*hitK(ib,3)+0.8*fz;}
    o.ia=ia;o.c.set(FX,0.4,0);o.shake=0;o.dist=0.5;o.flash=0.6;
  };
}};

// =====================================================================
// 3 · HIDDEN EARS (1 PA) — energía que nace de las orejas baja en espiral y cubre al Axie con un velo de escamas
//     camaleónicas (iridiscente, casi invisible); el Axie esquiva en un parpadeo y deja atrás la "muda" de escamas,
//     que se deshace en copos: evasión perfecta del primer golpe
// =====================================================================
const hidden={key:"roHiddenEars",name:"Hidden Ears",pa:1,dur:1.3,ti:0.38,pal:"Espadaña",
  phases:[["Repliegue",0],["Camuflaje",0.38],["Evasión",0.7],["Fin",1.05]],
build(a){
  const L=a.L,TI=0.38,TD=0.7,TE=1.05,TF=1.3,CX=-3.7,H=1.98,DX=-0.55;
  // velo de escamas: se revela de arriba abajo (uP), las escamas se desprenden una a una (uQ)
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.47,0.5,H,40,1,true),fxU(`uniform float uQ;
  void main(){float h=vP.y/${f(H)}+.5;float an=atan(vP.z,vP.x)/6.2832;float rev=1.-uP;if(h<rev)discard;
   vec2 g=vec2(an*22.,h*13.);g.x+=.5*mod(floor(g.y),2.);vec2 c=fract(g);vec2 id=floor(g);float hs=hash(vec3(id,3.));
   if(hs<uQ*1.05)discard;
   float d=length((c-vec2(.5,1.))*vec2(1.,1.3));float rim=band(d,.6,.08);float body=smoothstep(.6,.2,d);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float irid=.5+.5*sin(an*12.+h*8.-uT*4.+hs*6.);float front=band(h,rev,.03)*step(.002,uP)*step(uP,.995);
   gl_FragColor=vec4(mix(uC2,uC1,irid*.7+rim*.3)*1.3+vec3(1.)*front,((rim*.7+body*.12)*(.35+.65*fr)+front*1.2+fr*.12)*uA);}`,{uQ:{value:0}}));
  shell.position.set(CX,H/2,0); L.mesh.add(shell);
  const seal=groundPlane(1.4,CX,0.03,fx(RING_FS)); L.decal.add(seal);

  const C=`const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const float CX=${f(CX)};const float H=${f(H)};`;
  // dos hilos de energía desde las orejas que bajan en espiral con el frente del velo
  a.count+=points(L.part,80,C+`void main(){float sd=aSeed.y<.5?1.:-1.;vec3 E=vec3(-3.72,1.82,.26*sd);float s=aSeed.x*(TI-.1);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float fy=H*(1.-clamp((s+.1)/TI,0.,1.));float an=1.5708*sd+k*3.*sd+aSeed.z*.6;
   vec3 p=mix(E,vec3(CX+cos(an)*.5,fy,sin(an)*.5),smoothstep(0.,1.,k));
   vA=(age>0.&&age<1.)?1.-age*.5:0.;put(p,.03+.03*aSeed.w);}`);
  // destellos sobre el velo sellado
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*(TD-TI);float life=.18;float age=(uT-s)/life;
   float an=aSeed.y*6.2832;vec3 p=vec3(CX+cos(an)*.5,aSeed.z*H,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.08*aSeed.w);}`,STAR4_FS);
  // la muda se deshace en copos de escama
  a.count+=points(L.part,130,C+`void main(){float s=TD+aSeed.x*(TE-TD);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 n=vec3(cos(an),0.,sin(an));vec3 p=vec3(CX,aSeed.w*H,0.)+n*.5+n*(.4*t)+vec3(sin(t*6.+aSeed.x*9.)*.06,-.5*t*t+.15*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.045+.04*aSeed.y);}`,CHIP_FS);
  // estela del parpadeo de esquiva
  a.count+=points(L.part,40,C+`void main(){float s=TD+aSeed.x*.08;float life=.25;float age=(uT-s)/life;
   vec3 p=vec3(CX+${f(DX)}*aSeed.y,.2+aSeed.z*1.6,(aSeed.w-.5)*.5);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.035+.03*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, id=te-TD, rev=ss(0.02,TI,te);
    const dx=DX*ss(TD,TD+0.07,te)*(1-ss(TE-0.05,TF-0.05,te));
    caster.position.x=CX+dx; caster.rotation.z=-0.12*ss(TD,TD+0.05,te)*(1-ss(TD+0.1,TD+0.3,te));
    const sq=hitK(id,14); caster.scale.set(1+0.06*sq,1-0.08*sq,1+0.06*sq);
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.18*rev*(1-ss(TE,TF,te))+0.4*hitK(ia,8);
    shell.visible=te<TE+0.05; set(shell,rev*1.01,(te<TI?1:0.55+0.45*hitK(ia,6)+0.15*Math.sin(te*20))*(1-ss(TE-0.1,TE+0.05,te)));
    shell.material.uniforms.uQ.value=ss(TD,TE,te);
    let p=cl(ia/0.35); set(seal,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    if(te<TI){o.g.set(CX,1.9-1.4*rev,0);o.gs=0.7;o.ga=0.3;o.li=1.6;}
    else if(te<TD){o.g.set(CX,1,0);o.gs=1.1+1.5*Math.min(ia,0.3);o.ga=0.45*hitK(ia,9)+0.08;o.li=4*hitK(ia,6)+0.6;}
    else{o.g.set(CX+dx*0.5,1,0);o.gs=1.2;o.ga=0.35*hitK(id,8);o.li=3*hitK(id,6);}
    o.ia=id>=0?id:ia;o.c.set(CX,1.1,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 4 · POGONA (2 PA) — bajo el mentón se infla una barba espinosa de energía, negra con rebordes naranja; ruge:
//     tres anillos de púas viajan al rival, que se encoge intimidado; queda envuelto en una coraza de grietas
//     naranjas (Frágil) y flechas de ataque reducido caen a su alrededor
// =====================================================================
const pogona={key:"roPogona",name:"Pogona",pa:2,dur:2.1,ti:0.9,pal:"Ámbar",
  phases:[["Inflado",0],["Intimidación",0.55],["Impacto",0.9],["Frágil",1.2],["Fin",1.75]],
build(a){
  const L=a.L,TA=0.55,TI=0.9,TE=1.75,TF=2.1,B0=V3(-3.43,1.42,0);
  const BEARD=`float beard(vec2 p,float g){float r=length(p);float an=atan(p.y,p.x);float u=(an+2.8)/2.55;
   if(u<0.||u>1.)return 1.;float tri=1.-abs(fract(u*9.)*2.-1.);
   return r-(.38+.52*pow(tri,2.))*g*(.7+.3*sin(u*3.14159));}`;
  const bDark=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(BEARD+`
  void main(){vec2 p=(vUv-.5)*2.;float d=beard(p,uP);gl_FragColor=vec4(vec3(.035,.02,.015),smoothstep(.02,-.02,d)*.88*uA);}`,NB));
  const bFire=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(BEARD+`
  void main(){vec2 p=(vUv-.5)*2.;float d=beard(p,uP);float r=length(p);float u=(atan(p.y,p.x)+2.8)/2.55;
   float fill=smoothstep(.02,-.02,d);float rim=band(d,-.01,.035);
   float ridge=band(fract(u*9.),.5,.07)*fill*smoothstep(.05,.4,r);
   float stripe=band(fract(r*5.5-uT*1.5),.5,.12)*fill*.35;
   float n=noise(vec3(p*5.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,ridge+rim*.5+n*.3)*1.6+vec3(1.)*rim*.25,(rim*1.1+ridge*.8+stripe)*uA);}`));
  bFire.renderOrder=1;
  // anillos de rugido: corona de púas que viaja al rival
  const ringFS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=.78+.12*(1.-abs(fract(an/6.2832*14.)*2.-1.));float n=noise(vec3(an*4.,r*5.,uT*3.));
   float m=band(r,sp,.05)+band(r,sp*.8,.02)*.5;
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.6,m*(.6+.4*n)*uA);}`;
  const roars=[0,1,2].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(ringFS)));
  // coraza de Frágil: grietas de Voronoi que se extienden desde el punto de impacto
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.52,2.0,40,1,true),fx(`
  float vor(vec2 x){vec2 i=floor(x),fp=fract(x);float d1=8.,d2=8.;
   for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 o=vec2(float(a),float(b));vec2 h=vec2(hash(vec3(i+o,1.)),hash(vec3(i+o,7.)));float d=length(o+h-fp);
    if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return d2-d1;}
  void main(){float an=atan(vP.z,vP.x);float e=vor(vec2(an*3.2,vP.y*4.4));
   float dist=length(vP-vec3(-.5,.2,0.));float on=step(dist,uP*2.6);
   float cr=smoothstep(.09,0.,e)*on;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float front=band(dist,uP*2.6,.12)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,cr)*1.6+vec3(1.)*cr*.3,(cr*(.75+.35*sin(uT*8.+e*30.))+fr*.12*on+front*.4)*uA);}`));
  shell.position.set(3.4,1.0,0);
  L.mesh.add(bDark,bFire,...roars,shell);

  const C=`const float TA=${f(TA)};const float TI=${f(TI)};const vec3 B0=${v3(B0)};const vec3 HP=${v3(TC)};`;
  // ascuas en el borde de la barba
  a.count+=points(L.part,80,C+`void main(){float s=.1+aSeed.x*(TI-.1);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=-2.8+2.55*aSeed.z;vec3 p=B0+vec3(cos(an),sin(an),0.)*(.3+.35*aSeed.w)+vec3(.15*t,.8*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.08+.07*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
  // humo negro que resopla
  a.count+=points(L.part,50,C+`void main(){float s=.2+aSeed.x*(TI-.2);float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=B0+vec3(.15,-.1,0.)+rnd()*.12+vec3(.6*t,.45*t,(aSeed.z-.5)*.5*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.55:0.;put(p,(.22+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.07,.05,.04)"),NB);
  // polvo que levanta el rugido a ras de suelo
  a.count+=points(L.part,80,C+`void main(){float s=TA+aSeed.x*(TI-TA);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=mix(-3.,3.,(s-TA)/(TI-TA));float sd=aSeed.z<.5?-1.:1.;
   vec3 p=vec3(x+.3*t,.05+.25*(1.-exp(-t*4.)),sd*(.15+.6*(1.-exp(-t*3.))*aSeed.w));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.16+.14*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,120,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.4,.3,0.",3,8,3);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.3,0.))*(2.+3.*aSeed.z);vec3 p=HP+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);
  // flechas de ataque reducido que caen alrededor del rival
  a.count+=points(L.part,30,C+`void main(){float s=TI+.15+aSeed.x*.6;float life=.6;float age=(uT-s)/life;
   float an=aSeed.y*6.2832;vec3 p=vec3(3.4+cos(an)*.65,2.1-1.6*age,sin(an)*.65);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.2+.08*aSeed.w);}`,DCHEV_FS);

  const shock=groundPlane(3.4,3.4,0.03,fx(RING_FS)), stomp=groundPlane(1.8,-3.7,0.03,fx(RING_FS));
  L.decal.add(shock,stomp);

  a.pose=function(te,o){
    const ia=te-TI, ir=te-TA;
    const g=ss(0.02,TA,te)*(1+0.1*Math.sin(te*18)*(1-ss(TA-0.1,TA,te)))+0.22*hitK(ir,6)-0.6*ss(TI+0.3,TE,te);
    const ga=ss(0,0.08,te)*(1-ss(TI+0.4,TE,te));
    for(const m of [bDark,bFire]){towardCam(m.position,B0,0.32);billboard(m);m.visible=ga>0.001;set(m,Math.max(g,0),ga*(1+0.5*hitK(ir,6)));}
    caster.scale.set(1+0.05*ga,1+0.03*ga,1+0.05*ga); caster.rotation.z=0.06*ss(0,TA,te)-0.2*ss(TA,TA+0.06,te)*(1-ss(TA+0.2,TI+0.3,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.25*ga+0.4*hitK(ir,5);
    roars.forEach((m,i)=>{const t0=TA+i*0.09,k=(te-t0)/0.32;m.visible=k>=0&&k<1;if(!m.visible)return;
      tmp.lerpVectors(B0,TC,k);towardCam(m.position,tmp,0.1);billboard(m,i*0.3);m.scale.setScalar(0.35+1.15*k);m.material.uniforms.uA.value=ss(0,0.1,k)*(1-k*0.6);});
    const cow=ss(TI,TI+0.15,te)*(1-ss(TE,TF,te)), hit=hitK(ia,5);
    target.scale.set(1+0.03*cow,1-0.1*cow,1+0.03*cow); target.rotation.z=-0.14*cow-hit*0.18*Math.cos(ia*14);
    target.position.x=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*20))+0.08*cow;
    shell.position.x=target.position.x; shell.visible=cow>0.001; set(shell,cl(ia/0.4),cow);
    o.em=0.18*cow*(0.7+0.3*Math.sin(te*14)); o.emc.copy(U.uC2.value);
    let p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    p=cl(ir/0.4); set(stomp,1-Math.pow(1-p,2),ir>=0?(1-p)*0.6:0);
    if(te<TA){o.g.copy(B0);o.gs=1.1*ga;o.ga=0.4*ga;o.li=2.5*ga;}
    else if(te<TI){o.g.lerpVectors(B0,TC,cl(ir/0.35));o.gs=1.3;o.ga=0.45;o.li=4;}
    else{o.g.copy(TC);o.gs=1.4+3*Math.min(ia,0.4);o.ga=0.7*hitK(ia,9)+0.08*cow;o.li=8*hitK(ia,5)+1*cow;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 5 · SIDEBARB (2 PA) — el veneno se concentra en los flancos; seis púas laterales salen como dardos en dos
//     abanicos curvos que se cierran sobre el rival; quedan clavadas, gotea veneno púrpura y sangre, y un pulso
//     corrosivo sube por su cuerpo
// =====================================================================
const sidebarb={key:"roSidebarb",name:"Sidebarb",pa:2,dur:2.2,ti:0.87,pal:"Toxina",
  phases:[["Carga",0],["Andanada",0.45],["Impacto",0.87],["Veneno",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TL=0.45,ST=0.035,FL=0.42,TI=TL+FL,TP=1.22,TX=1.6,TE=1.85,TF=2.2;
  const dS=j=>{const s=j<3?1:-1,r=j%3;return V3(-3.6,0.85+0.18*r,0.45*s);};
  const dC=j=>{const s=j<3?1:-1,r=j%3;return V3(-0.6,1.5+0.35*r,2.6*s);};
  const dE=j=>{const s=j<3?1:-1,r=j%3;return V3(3.08,0.85+0.22*r,s*(0.12+0.06*r));};
  const dT=j=>{const s=j<3?0:1,r=j%3;return TL+(r*2+s)*ST;};
  const S=[],CC=[],E=[],T=[],ED=[];for(let j=0;j<6;j++){S.push(dS(j));CC.push(dC(j));E.push(dE(j));T.push(dT(j));ED.push(qbd(S[j],CC[j],E[j],1,V3(0,0,0)).normalize());}
  // dardos: púa oscura con punta de veneno luminosa
  const dartMat=fx(`void main(){float h=clamp(vP.y/.34,0.,1.);float n=noise(vP*50.);
   vec3 c=mix(vec3(.12,.08,.14),vec3(.34,.24,.38),n)*${LIT};
   gl_FragColor=vec4(c+uC1*pow(h,3.)*(1.2+uA)+uC2*.3*n,1.);}`,SOLID);
  const dG=new THREE.ConeGeometry(0.035,0.34,7).translate(0,0.17,0);
  const darts=S.map(()=>{const m=new THREE.Mesh(dG,dartMat);L.mesh.add(m);return m;});
  // destellos de carga en los flancos
  const glints=[1,-1].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),fx(GLINT_FS)));
  // pulso corrosivo: anillo horizontal que sube por el rival
  const pulse=groundPlane(1.9,3.4,0.1,fx(RING_FS));
  L.mesh.add(...glints,pulse);

  const C=`const float TL=${f(TL)};const float ST=${f(ST)};const float FL=${f(FL)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 HP=${v3(TC)};
  vec3 dS(float j){float s=j<2.5?1.:-1.;float r=mod(j,3.);return vec3(-3.6,.85+.18*r,.45*s);}
  vec3 dC(float j){float s=j<2.5?1.:-1.;float r=mod(j,3.);return vec3(-.6,1.5+.35*r,2.6*s);}
  vec3 dE(float j){float s=j<2.5?1.:-1.;float r=mod(j,3.);return vec3(3.08,.85+.22*r,s*(.12+.06*r));}
  float dT(float j){float s=j<2.5?0.:1.;float r=mod(j,3.);return TL+(r*2.+s)*ST;}`+QB;
  // veneno que se concentra en los flancos
  a.count+=points(L.part,60,C+`void main(){float sd=aSeed.y<.5?1.:-1.;vec3 F=vec3(-3.6,1.,.45*sd);float s=aSeed.x*(TL-.15);float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(F+normalize(rnd()+vec3(0.,0.,sd))*.6,F,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.z);vMix=aSeed.w;}`);
  // estela venenosa de cada dardo
  a.count+=points(L.part,240,C+`void main(){float j=floor(aSeed.y*5.999);float t0=dT(j);float s=t0+aSeed.x*FL;float u=(s-t0)/FL;
   float life=.3+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(dS(j),dC(j),dE(j),u)+rnd()*.04+vec3(0.,-.35*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.04*aSeed.w)*(1.-age*.5));}`);
  // salpicadura de veneno en cada impacto (mezcla normal)
  a.count+=points(L.part,120,C+`void main(){float j=floor(aSeed.y*5.999);float s=dT(j)+FL;float life=.45+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.9,.4,0.))*(1.2+2.2*aSeed.w);vec3 p=dE(j)+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.06+.05*aSeed.x);}`,DROP_FS("mix(uC2,uC1,.4)"),NB);
  a.count+=sparks(L.part,100,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.6,.3,0.",2.5,7,3);
  // veneno: burbujas púrpura que gotean del rival
  a.count+=points(L.part,80,C+`void main(){float s=TI+.1+aSeed.x*.9;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4+cos(an)*.4,.4+aSeed.w*1.3-.5*t*t,sin(an)*.4);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;put(p,.07+.06*aSeed.w);vMix=.9;}`,BUBBLE_FS);
  // sangrado (rojo fijo: estado de sangrado)
  a.count+=points(L.part,40,C+`void main(){float s=TI+.15+aSeed.x*.8;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*3.1416+1.57;vec3 p=vec3(3.4+cos(an)*.42,.6+aSeed.w*.7-2.6*t*t,sin(an)*.42);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.06+.04*aSeed.w);}`,DROP_FS("vec3(.75,.06,.1)"),NB);

  const puddle=groundPlane(1.7,3.4,0.015,fx(SOFTBURN_FS)), shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(puddle,shock);

  const dv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ip=te-TP, ch=ss(0,TL,te);
    caster.rotation.z=-0.06*ch*(1-ss(TL,TL+0.05,te))+0.08*ss(TL,TL+0.05,te)*(1-ss(TL+0.2,TL+0.6,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ch*(1-ss(TL,TL+0.3,te));
    glints.forEach((m,i)=>{const s=i?-1:1;towardCam(m.position,tmp.set(-3.6,1.0,0.45*s),0.05);billboard(m,te*2*s);
      const k=ss(0.05,TL,te)*(1-ss(TL+0.05,TL+0.2,te));m.visible=k>0.001;m.scale.setScalar(0.5+0.7*k+0.1*Math.sin(te*30));m.material.uniforms.uA.value=k;});
    let kb=0;
    darts.forEach((m,j)=>{const u=(te-T[j])/FL;if(u<0){m.visible=false;return;}let sc=1;
      if(u<1){qb(S[j],CC[j],E[j],u,m.position);qbd(S[j],CC[j],E[j],u,dv);}
      else{const il=te-T[j]-FL;kb+=0.06*Math.exp(-il*9);dv.copy(ED[j]);dv.y+=0.15*Math.sin(il*35)*Math.exp(-il*7);
        m.position.copy(E[j]).addScaledVector(ED[j],-0.2);sc=1-ss(TX,TE,te);}
      m.visible=sc>0.01;m.scale.setScalar(Math.max(sc,0.001));m.quaternion.setFromUnitVectors(YA,dv.normalize());});
    dartMat.uniforms.uA.value=0.6*hitK(ia,4)+0.4*hitK(ip,4);
    target.position.x=3.4+kb; target.rotation.z=-kb*0.9*Math.cos(Math.max(ia,0)*20);
    // las púas siguen al rival en su retroceso
    darts.forEach((m,j)=>{if(te>=T[j]+FL)m.position.x+=kb;});
    pulse.visible=ip>=0&&ip<0.55; pulse.position.set(target.position.x,0.1+1.7*cl(ip/0.55),0); set(pulse,0.55+0.35*cl(ip/0.55),ip>=0?1-cl(ip/0.55):0);
    puddle.material.uniforms.uA.value=ss(TI,TI+0.3,te)*(1-ss(TE,TF,te));
    let p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    o.em=0.25*hitK(ip,4); o.emc.copy(U.uC1.value);
    if(te<TL){o.g.set(-3.6,1,0);o.gs=1*ch;o.ga=0.35*ch;o.li=2*ch;}
    else if(te<TI){const k=cl((te-TL)/FL);qb(S[0],CC[0],E[0],k,o.g);o.g.z=0;o.gs=1.1;o.ga=0.4;o.li=3.5;}
    else{o.g.copy(TC);o.gs=1.4+3*Math.min(ia,0.4);o.ga=0.65*hitK(ia,8)+0.25*hitK(ip,6);o.li=7*hitK(ia,5)+3*hitK(ip,5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 6 · SMALL FRILL (2 PA) — una gorguera de energía se despliega en abanico tras la cabeza con bandas hipnóticas
//     iridiscentes; lanza haces deslumbrantes a los tres rivales, que quedan mareados y envenenados; el Axie se cura
// =====================================================================
const frill={key:"roSmallFrill",name:"Small Frill",pa:2,dur:2.3,ti:0.95,pal:"Psicodelia",enemies:2,
  phases:[["Despliegue",0],["Hipnosis",0.5],["Deslumbre",0.95],["Cura y veneno",1.25],["Fin",1.9]],
build(a){
  const L=a.L,TA=0.5,TI=0.95,TH=1.25,TE=1.9,TF=2.3,FC=V3(-3.72,1.6,0);
  const HD=[V3(3.25,1.62,0),V3(ENEMY_POS[0].x,1.62,ENEMY_POS[0].z),V3(ENEMY_POS[1].x,1.62,ENEMY_POS[1].z)];
  const RV=[target,enemies[0],enemies[1]], RP=[V3(3.4,0,0),ENEMY_POS[0],ENEMY_POS[1]];
  // gorguera: abanico con varillas, borde festoneado y bandas concéntricas hipnóticas
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(`
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.x,-p.y);
   float open=uP*2.95;float outer=.92+.05*sin(an*14.);
   if(abs(an)>open||r<.3||r>outer)discard;
   float rib=pow(1.-abs(fract(an*14./6.2832+.5)*2.-1.),6.);
   float hyp=fract(r*3.-uT*1.2);
   vec3 iri=.5+.5*cos(6.2832*(r*1.5-uT*.6+an*.15+vec3(0.,.33,.67)));
   vec3 c=mix(mix(uC2,uC1,smoothstep(.3,.7,hyp)),iri,.45)*1.25;
   float edge=band(r,outer,.03)+band(r,.3,.02);
   float al=(.3+.35*smoothstep(.2,.6,hyp)+rib*.5+edge)*uA*smoothstep(open,open-.15,abs(an));
   gl_FragColor=vec4(c+vec3(1.)*(rib*.3+edge*.5),al);}`));
  // haces deslumbrantes de la gorguera a cada rival (uP = alcance)
  const beamFS=`void main(){float h=vP.y;if(h>uP)discard;float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
   float b=fract(h*7.-uT*3.);vec3 iri=.5+.5*cos(6.2832*(h*2.-uT+vec3(0.,.33,.67)));
   gl_FragColor=vec4(mix(mix(uC2,uC1,b),iri,.4)*1.4,fr*(.25+.35*smoothstep(.3,.7,b))*smoothstep(0.,.1,h)*uA);}`;
  const bG=new THREE.CylinderGeometry(0.42,0.1,1,20,1,true).translate(0,0.5,0);
  const beams=HD.map(H=>{const m=new THREE.Mesh(bG,fx(beamFS));const d=V3(0,0,0).copy(H).sub(FC);m.position.copy(FC);m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(YA,d.normalize());return m;});
  // espirales de mareo sobre las cabezas
  const dazeFS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uT*6.;
   float arm=fract(an/6.2832+r*2.);float m=band(arm,.5,.12)*smoothstep(1.,.7,r)*smoothstep(0.,.15,r);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.6,m*uA);}`;
  const dazes=HD.map(()=>new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),fx(dazeFS)));
  L.mesh.add(fan,...beams,...dazes);

  const C=`const float TA=${f(TA)};const float TI=${f(TI)};const float TH=${f(TH)};const vec3 FC=${v3(FC)};
  const vec3 H0=${v3(HD[0])};const vec3 H1=${v3(HD[1])};const vec3 H2=${v3(HD[2])};
  vec3 hd(float x){return x<.333?H0:(x<.666?H1:H2);}`;
  // destellos en el borde de la gorguera
  a.count+=points(L.part,70,C+`void main(){float s=.1+aSeed.x*(TI+.2);float life=.3;float age=(uT-s)/life;
   float an=(aSeed.y*2.-1.)*2.95*clamp((s-.05)/(TA-.05),0.,1.);vec3 p=FC+vec3(sin(an),-cos(an),0.)*(.95+.1*aSeed.z)+vec3(0.,0.,-.2);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.08+.06*aSeed.w);}`,STAR4_FS);
  // motas hipnóticas que viajan por los haces
  a.count+=points(L.part,180,C+`void main(){vec3 H=hd(aSeed.y);float s=TA+aSeed.x*(TI+.15-TA);float u=(uT-s)/.4;
   vec3 p=mix(FC,H,clamp(u,0.,1.))+rnd()*(.05+.3*clamp(u,0.,1.));
   vA=(u>0.&&u<1.)?sin(u*3.14159):0.;put(p,.04+.04*aSeed.w);}`);
  // estrellas de mareo que orbitan cada cabeza
  a.count+=points(L.part,60,C+`void main(){vec3 H=hd(aSeed.y);float s=TI+aSeed.x*.1;float life=.9;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*5.;vec3 p=H+vec3(cos(an)*.38,.32+.05*sin(t*7.+aSeed.w*6.),sin(an)*.38);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.05*aSeed.w);}`,STAR4_FS);
  // veneno: burbujas que gotean de los tres rivales
  a.count+=points(L.part,90,C+`void main(){vec3 H=hd(aSeed.y);float s=TI+.15+aSeed.x*.8;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vec3(H.x+cos(an)*.4,.3+aSeed.z*1.2-.5*t*t,H.z+sin(an)*.4);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;put(p,.06+.06*aSeed.w);vMix=.9;}`,BUBBLE_FS);
  // cura propia: cruces y motas que suben
  a.count+=points(L.part,30,C+`void main(){float s=TH+aSeed.x*.4;float life=.7;float age=(uT-s)/life;
   vec3 p=vec3(-3.7+(aSeed.y-.5)*.9,.3+age*1.6,(aSeed.z-.5)*.9);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.16+.08*aSeed.w);}`,CROSS_FS);
  a.count+=points(L.part,50,C+`void main(){float s=TH+aSeed.x*.5;float life=.6+aSeed.y*.3;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*3.;vec3 p=vec3(-3.7+cos(an)*.5,.1+age*2.,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.03*aSeed.w);}`);

  // anillos hipnóticos concéntricos bajo el Axie; pulso bajo cada rival
  const hypno=groundPlane(2.6,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float b=band(fract(r*4.-uT*1.5),.5,.12)*smoothstep(1.,.6,r)*step(.25,r);
   vec3 iri=.5+.5*cos(6.2832*(r-uT*.5+vec3(0.,.33,.67)));
   gl_FragColor=vec4(mix(mix(uC2,uC1,b),iri,.35)*1.3,b*uA);}`));
  const rr=RP.map(P=>{const m=groundPlane(2.4,P.x,0.03,fx(RING_FS));m.position.z=P.z;return m;});
  const heal=groundPlane(1.8,-3.7,0.03,fx(RING_FS));
  L.decal.add(hypno,heal,...rr);

  a.pose=function(te,o){
    const ia=te-TI, ih=te-TH, op=ss(0.02,TA,te), env=ss(0,0.1,te)*(1-ss(TH,TE,te));
    towardCam(fan.position,FC,-0.28); billboard(fan); fan.visible=env>0.001;
    set(fan,op,env*(1+0.4*Math.sin(te*9)*ss(TA,TI,te)+0.6*hitK(ia,5)));
    caster.rotation.z=0.06*op*(1-ss(TI,TI+0.4,te));
    beams.forEach(m=>{m.visible=te>=TA&&te<TI+0.4;set(m,ss(TA,TI,te)*1.01,ss(TA,TA+0.08,te)*(1-ss(TI+0.05,TI+0.4,te)));});
    const dz=ss(TI,TI+0.12,te)*(1-ss(TE,TF,te));
    dazes.forEach((m,i)=>{towardCam(m.position,tmp.set(HD[i].x,2.15+0.04*Math.sin(te*5+i),HD[i].z),0.2);billboard(m);m.visible=dz>0.001;m.material.uniforms.uA.value=dz;});
    RV.forEach((d,i)=>{const sw=dz*(0.1*Math.sin(te*7+i*2));d.rotation.z=sw-0.15*hitK(ia,6)*Math.cos(ia*14);if(i)glowOn(d,0.9*hitK(ia,10)+0.12*dz);});
    o.em=0.12*dz; o.emc.copy(U.uC1.value);
    hypno.material.uniforms.uA.value=op*(1-ss(TI+0.2,TE,te));
    let p=cl(ia/0.5); rr.forEach(m=>set(m,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0));
    p=cl(ih/0.5); set(heal,1-Math.pow(1-p,2),ih>=0?(1-p)*0.7:0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*op+0.5*hitK(ih,3);
    if(te<TI){o.g.copy(FC);o.gs=1.4+0.8*op;o.ga=0.4*op;o.li=3*op;}
    else if(te<TH){o.g.copy(HD[0]);o.gs=1.4+3*Math.min(ia,0.3);o.ga=0.6*hitK(ia,8)+0.1;o.li=6*hitK(ia,5)+1;}
    else{o.g.set(-3.7,1.1,0);o.gs=1.8;o.ga=0.3*hitK(ih,3);o.li=3*hitK(ih,3)+0.5;}
    o.ia=ia;o.c.copy(HD[0]);o.shake=0;o.dist=0.55;o.flash=0.8;
  };
}};

// =====================================================================
// 7 · SWIRL (2 PA) — hilos de energía salen de las orejas y dibujan en el aire un remolino hipnótico de dos
//     brazos; gira cada vez más rápido, avanza y se estrella contra el rival, que queda desorientado; un anillo de
//     alcance se encoge bajo sus pies (−1 AL)
// =====================================================================
const swirl={key:"roSwirl",name:"Swirl",pa:2,dur:2.0,ti:0.95,pal:"Nabo",
  phases:[["Trazo",0],["Remolino",0.45],["Impacto",0.95],["Desorientación",1.2],["Fin",1.65]],
build(a){
  const L=a.L,TD=0.45,TI=0.95,TE=1.65,TF=2.0,SW=V3(1.5,1.4,0);
  const swp=(te,out)=>{const k=ss(TD+0.15,TI,te);return out.set(SW.x+(TC.x-SW.x)*k*k,SW.y+(TC.y-SW.y)*k,0);};
  // remolino: dos brazos que se dibujan del centro hacia fuera (uP) y giran (uQ = ángulo acumulado)
  const spiral=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float arm=fract((an+uQ)/6.2832*2.+r*1.6);
   float line=band(arm,.5,.09+.05*r)*smoothstep(1.,.85,r);
   float rev=step(r,uP);float head=band(r,uP,.06)*step(uP,.99)*line;
   float core=smoothstep(.25,0.,r);float n=noise(vec3(p*4.,uT*2.));
   float ring=band(r,.55+.05*sin(an*6.+uT*4.),.015)*rev;
   gl_FragColor=vec4(mix(uC2,uC1,line*(1.-r)+n*.3)*1.6+vec3(1.)*(head+core*.4),(line*rev*(.6+.4*n)+head+core*.5*uP+ring*.5+smoothstep(1.,.3,r)*.07*rev)*uA);}`,{uQ:{value:0}}));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS));
  L.mesh.add(spiral,hitRing);

  const C=`const float TD=${f(TD)};const float TI=${f(TI)};const vec3 SW=${v3(SW)};const vec3 HP=${v3(TC)};
  vec3 swp(float t){float k=smoothstep(TD+.15,TI,t);return vec3(SW.x+(HP.x-SW.x)*k*k,SW.y+(HP.y-SW.y)*k,0.);}`+QB;
  // hilos desde las orejas hasta el punto donde se dibuja el remolino
  a.count+=points(L.part,120,C+`void main(){float sd=aSeed.y<.5?1.:-1.;vec3 E=vec3(-3.72,1.82,.26*sd);float s=aSeed.x*(TD-.05);float u=(uT-s)/.32;
   float an=aSeed.z*6.2832;vec3 end=SW+vec3(cos(an),sin(an),0.)*.25*aSeed.w;
   vec3 p=qb(E,vec3(-1.,2.6,.9*sd),end,clamp(u,0.,1.))+rnd()*.03;
   vA=(u>0.&&u<1.)?sin(u*3.14159):0.;put(p,.035+.03*aSeed.w);}`);
  // motas absorbidas por el vórtice (bucle)
  a.count+=points(L.part,200,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TD+.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832-age*7.;float rad=(.25+.85*r.y)*(1.-age);
   vec3 p=swp(uT)+vec3(cos(an)*rad,sin(an)*rad,(r.z-.5)*.3*(1.-age));
   vA=(k>=1.&&uT<TI)?sin(age*3.14159)*.9:0.;put(p,.03+.04*r.z);}`);
  a.count+=sparks(L.part,100,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.3,.3,0.",3,8,2.5);
  // desorientación: motas que giran en torno a la cabeza
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.15;float life=.65;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*(4.+2.*aSeed.y);float rad=.3+.15*sin(t*5.+aSeed.w*6.);
   vec3 p=vec3(3.3+cos(an)*rad,1.75+.12*sin(an*2.),sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.08+.05*aSeed.w);}`,STAR4_FS);

  // anillo de alcance que se encoge bajo el rival (−1 AL) y onda de impacto
  const range=groundPlane(5,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float R=mix(.95,.62,uP);float m=band(r,R,.022)+band(r,R+.06,.01)*.5+band(r,.95,.012)*.35*(1.-uP);
   float tick=step(.6,fract(an/6.2832*24.-uT*.3))*band(r,R-.06,.025);
   float chev=band(fract(an/6.2832*8.),.5,.05)*band(r,R+.12-.06*fract(uT*2.),.03);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*uP)*1.4,(m+tick+chev)*uA);}`));
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(range,shock);

  a.pose=function(te,o){
    const ia=te-TI, dr=ss(0.08,TD,te), sp=te<TI?1-ss(TI-0.12,TI,te)*0.5:0;
    swp(te,tmp); towardCam(spiral.position,tmp,0.1); billboard(spiral);
    spiral.visible=te<TI+0.15; spiral.scale.setScalar(Math.max((0.65+0.35*ss(TD,TD+0.3,te))*(1-0.75*ss(TI-0.2,TI+0.1,te)),0.001));
    spiral.material.uniforms.uQ.value=te*3+2.5*te*te; set(spiral,dr*1.01,ss(0.05,0.2,te)*(1-ss(TI,TI+0.15,te))*(0.8+0.2*sp));
    caster.rotation.z=0.05*Math.sin(te*6)*dr*(1-ss(TD,TI,te));
    let p=cl(ia/0.35); towardCam(hitRing.position,TC,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    const dis=ss(TI,TI+0.1,te)*(1-ss(TE,TF,te)), hit=hitK(ia,5);
    target.rotation.z=dis*0.12*Math.sin(te*6.5)-hit*0.2*Math.cos(ia*14); target.position.x=3.4+0.2*hit*(1-Math.exp(-Math.max(ia,0)*20));
    range.position.x=target.position.x; set(range,ss(TI+0.05,TI+0.6,te),ss(TI,TI+0.1,te)*(1-ss(TE,TF,te)));
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    o.em=0.12*dis; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(tmp);o.gs=1.2+0.8*dr;o.ga=0.4*dr;o.li=3.5*dr;}
    else{o.g.copy(TC);o.gs=1.5+3*Math.min(ia,0.4);o.ga=0.7*hitK(ia,9)+0.06*dis;o.li=7*hitK(ia,5)+0.8*dis;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.75;
  };
}};

// =====================================================================
// 8 · VENOM NAIL (3 PA) — el veneno negro se acumula como llamas oscuras en las garras; tres cuchillas de
//     garra en media luna barren el suelo hasta el rival dejando surcos púrpura; un zarpazo gigante lo rasga y el
//     veneno se duplica (cada gota orbitante se parte en dos) hasta estallar en un pulso corrosivo. Fractura de baldosa.
// =====================================================================
const venom={key:"roVenomNail",name:"Venom Nail",pa:3,dur:3.1,ti:1.35,pal:"Miasma",
  phases:[["Veneno",0],["Garras",0.75],["Desgarro",1.35],["Duplicar",1.5],["Corrosión",1.8],["Fin",2.6]],
build(a){
  const L=a.L,TG=0.75,TI=1.35,TC2=1.8,TE=2.6,TF=3.1,X0=-3.1,X1=2.95,ZS=[-0.38,0,0.38],CL=V3(-3.3,0.75,0);
  // llamas de veneno negro alrededor de las garras (mezcla normal)
  const FIRE_D=`void main(){float h=vP.y/.9+.5;vec3 q=vec3(vP.x*3.,vP.y*1.8-uT*2.4,vP.z*3.);
   float n=noise(q)*.55+noise(q*2.3+vec3(0.,-uT*1.7,3.))*.3+noise(q*4.7)*.15;float fl=n-h*1.1+.4+.3*uP;
   gl_FragColor=vec4(mix(uC2*1.5,vec3(.03,0.,.04),smoothstep(.08,.32,fl)),smoothstep(0.,.18,fl)*.9*uA);}`;
  const claws=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.48,0.9,28,6,true),fx(FIRE_D,NB)); claws.position.copy(CL);
  // cuchillas de garra en media luna: capa oscura (normal) + filo púrpura (aditivo)
  const CRES=`float cres(vec2 p){return max(length(p)-.92,-(length(p-vec2(-.34,0.))-.9));}`;
  const blades=ZS.map(()=>{
    const dk=new THREE.Mesh(new THREE.PlaneGeometry(1.0,2.0),fx(CRES+`void main(){vec2 p=(vUv-.5)*vec2(2.,2.);float d=cres(p);float n=noise(vec3(p*5.,uT*4.));
     gl_FragColor=vec4(vec3(.03,0.,.04),smoothstep(.03,-.03,d+(n-.5)*.06)*.85*uA);}`,NB));
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(1.0,2.0),fx(CRES+`void main(){vec2 p=(vUv-.5)*vec2(2.,2.);float d=cres(p);
     float n=noise(vec3(p*6.-vec2(uT*6.,0.),uT));float rim=band(d,0.,.04+.03*n);float tip=smoothstep(.5,1.,abs(p.y));
     gl_FragColor=vec4(mix(uC2,uC1,rim*.6+n*.4)*1.7+vec3(1.)*rim*.3,(rim*(1.-tip*.6)+smoothstep(0.,-.12,d)*.2*n)*uA);}`));
    gl.renderOrder=1; L.trail.add(dk,gl); return [dk,gl];});
  // zarpazo gigante sobre el rival: cuatro surcos que barren (uP) y quedan como desgarro (uQ)
  const RIP=`uniform float uQ;
  float rip(vec2 p,out float core){float m=0.;core=0.;float u=p.x;
   for(int i=0;i<4;i++){float fi=float(i);float y=(p.y-.5-(fi-1.5)*.12)-.1*(1.-pow(2.*u-1.,2.));float w=.008+.035*sin(3.14159*u);
    m=max(m,smoothstep(w*2.4,0.,abs(y)));core=max(core,smoothstep(w*.5,0.,abs(y)));}
   return m;}
  float sweep(float u){float d=uP-u;return step(0.,d)*exp(-d*3.)*smoothstep(0.,.05,u)*smoothstep(1.,.92,u);}`;
  const ripD=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.4),fxU(RIP+`void main(){float c;float m=rip(vUv,c);float sc=step(vUv.x,uP)*sin(3.14159*vUv.x);
   gl_FragColor=vec4(vec3(.03,0.,.04),min(m*(sweep(vUv.x)*uA+uQ*.8*sc),1.)*.85);}`,{uQ:{value:0}},Object.assign({depthTest:false},NB)));
  const ripG=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.4),fxU(RIP+`void main(){float c;float m=rip(vUv,c);float sc=step(vUv.x,uP)*sin(3.14159*vUv.x);
   float n=noise(vec3(vUv.x*10.-uT*8.,vUv.y*12.,uT*3.));
   gl_FragColor=vec4(mix(uC2,uC1,c+n*.4)*1.7+vec3(1.)*c*.5,(m*(.45+.6*n)+c)*sweep(vUv.x)*uA+c*sc*uQ);}`,{uQ:{value:0}},{depthTest:false}));
  ripG.renderOrder=2; ripD.renderOrder=1;
  // gotas de veneno que orbitan al rival: 6 que se duplican a 12
  const dropMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(vec3(.08,.02,.1),uC2*.7,fr)+uC1*fr*(.8+uA)+vec3(1.)*${SPEC}*.7,1.);}`,SOLID);
  const dG=new THREE.SphereGeometry(0.075,16,12);
  const drops=[];for(let i=0;i<12;i++){const m=new THREE.Mesh(dG,dropMat);L.mesh.add(m);drops.push(m);}
  // pulso corrosivo magenta que sube por el rival
  const corr=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.62,2.3,40,1,true),fx(`
  void main(){float h=vP.y/2.3+.5;float an=atan(vP.z,vP.x);float n=noise(vec3(an*3.,h*6.-uT*3.,uT));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float b=band(h,uP*1.1,.08);
   gl_FragColor=vec4(mix(uC2,uC1,b+n*.4)*1.6+vec3(1.)*b*.4,(b*1.2+fr*.35*smoothstep(.3,.8,n)*step(h,uP*1.1))*(1.-h*.5)*uA);}`));
  corr.position.set(3.4,1.15,0);
  L.mesh.add(claws,ripD,ripG,corr);

  const C=`const float TG=${f(TG)};const float TI=${f(TI)};const float TC2=${f(TC2)};const float X0=${f(X0)};const float X1=${f(X1)};
  const vec3 CL=${v3(CL)};const vec3 HP=${v3(TC)};
  float bx(float t,float i){float k=clamp((t-TG-i*.04)/(TI-.04*2.-TG),0.,1.);return X0+(X1-X0)*k*k;}`;
  // veneno negro que se arremolina en las garras
  a.count+=points(L.part,150,C+`void main(){float s=aSeed.x*(TG-.1);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*4.;vec3 p=CL+vec3(cos(an),0.,sin(an))*(1.1-.8*k)+vec3(0.,.5*(1.-k)+(aSeed.w-.5)*.4,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.7:0.;put(p,(.26+.2*aSeed.w)*(1.-k*.4));}`,SMOKE_FS("vec3(.06,.02,.08)"),NB);
  a.count+=points(L.part,80,C+`void main(){float s=.15+aSeed.x*(TI-.15);float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=CL+vec3((aSeed.z-.5)*.6,.2-3.*t*t,(aSeed.w-.5)*.6);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;put(p,.07+.04*aSeed.w);}`,DROP_FS("mix(uC2,uC1,.3)"),NB);
  // surtidores de veneno levantados por las cuchillas al rasgar el suelo
  a.count+=points(L.part,240,C+`void main(){float i=floor(aSeed.y*2.999);float z=(i-1.)*.38;float s=TG+aSeed.x*(TI-TG);float life=.4+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(bx(s,i),.05,z)+vec3(-.6*t,(1.6+1.6*aSeed.w)*t-5.*t*t,(aSeed.w-.5)*1.2*t);
   vA=(age>0.&&age<1.&&p.y>0.&&s>TG+i*.04)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,120,C+`void main(){float i=floor(aSeed.y*2.999);float z=(i-1.)*.38;float s=TG+aSeed.x*(TI-TG);float life=.7+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(bx(s,i),.15,z)+rnd()*.1+vec3(-.2*t,.5*t,0.);
   vA=(age>0.&&age<1.&&s>TG+i*.04)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.28+.22*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.08,.02,.1)"),NB);
  // estallido de veneno en el rival
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.5,0.))*(2.5+5.*aSeed.z);vec3 p=HP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.08+.07*aSeed.w);}`,DROP_FS("mix(uC2,uC1,.5)"),NB);
  a.count+=sparks(L.part,250,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.5,.4,0.",4,13,3.5);
  // corrosión: el veneno hierve en burbujas
  a.count+=points(L.part,150,C+`void main(){float s=TC2+aSeed.x*.7;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4+cos(an)*(.3+.3*aSeed.w),.1+aSeed.w*1.8+.9*t,sin(an)*(.3+.3*aSeed.w));
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.07+.08*aSeed.w);vMix=.8;}`,BUBBLE_FS);

  // surcos: tres zanjas paralelas (oscuras) con borde púrpura brillante que se revelan con las cuchillas
  const FL=X1-X0+0.4, FXc=(X0+X1)/2, FUR=`float fur(vec2 uv,out float edge){float v=(uv.y-.5)*1.6;float m=0.;edge=0.;
   for(int i=0;i<3;i++){float z=(float(i)-1.)*.38+(noise(vec3(uv.x*9.,float(i)*3.,1.))-.5)*.06;float d=abs(v-z);
    float w=.06*(.6+.4*sin(3.14159*min(uv.x*1.2,1.)));m=max(m,smoothstep(w,w*.4,d));edge=max(edge,band(d,w,.02));}
   return m;}`;
  const furD=groundPlane(FL,FXc,0.016,fx(FUR+`void main(){float e;float m=fur(vUv,e);gl_FragColor=vec4(vec3(.03,0.,.04),m*step(vUv.x,uP)*.85*uA);}`,NB),1.6);
  const furG=groundPlane(FL,FXc,0.018,fx(FUR+`void main(){float e;float m=fur(vUv,e);float rev=step(vUv.x,uP);float head=exp(-max(uP-vUv.x,0.)*8.)*rev;
   float n=noise(vec3(vUv.x*30.-uT*3.,vUv.y*9.,1.));
   gl_FragColor=vec4(mix(uC2,uC1,head+n*.3)*1.6,(e*(.5+.5*n)+m*.25*head)*rev*uA);}`),1.6);
  // fractura de baldosa bajo el rival (nivel 3)
  const FS=6.8, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS))), shock=groundPlane(7,3.4,0.03,fx(RING_FS));
  L.decal.add(furD,furG,frac,shock);

  const bp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ic=te-TC2, gat=ss(0,TG,te);
    // el Axie se agazapa cargando y lanza el zarpazo
    caster.rotation.z=-0.16*gat*(1-ss(TG,TG+0.05,te))+0.12*ss(TG,TG+0.06,te)*(1-ss(TG+0.2,TI+0.3,te));
    caster.scale.set(1+0.06*gat*(1-ss(TG,TG+0.1,te)),1-0.1*gat*(1-ss(TG,TG+0.1,te)),1);
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.35*gat*(1-ss(TG,TI,te));
    claws.visible=te<TI; set(claws,0.3*gat+0.5*hitK(te-TG,5),ss(0,0.25,te)*(1-ss(TG+0.05,TG+0.35,te)));
    blades.forEach(([dk,gl],i)=>{const t0=TG+i*0.04,k=cl((te-t0)/(TI-0.08-TG)),x=X0+(X1-X0)*k*k;
      const on=te>=t0&&te<TI+0.12;for(const m of [dk,gl]){m.visible=on;towardCam(m.position,tmp.set(x,1.0,ZS[i]),0.02);billboard(m);
        m.scale.set(1+0.3*k,1+0.15*k,1);m.material.uniforms.uA.value=ss(0,0.1,k)*(te<TI?1:1-cl((te-TI)/0.12));}});
    const fp=cl((te-TG)/(TI-0.08-TG)), rev=fp*fp;
    for(const m of [furD,furG])set(m,rev*1.02,ss(TG,TG+0.05,te)*(1-ss(TE-0.3,TF,te)));
    // zarpazo sobre el rival
    for(const m of [ripD,ripG]){towardCam(m.position,TC,0.6);billboard(m,-0.5);const s=(te-TI+0.06)/0.08;m.visible=s>=0&&te<TE;
      set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.5,s>1?Math.exp(-(s-1)*1.2):1);m.material.uniforms.uQ.value=s>=1?Math.exp(-(te-TI)*1.5):0;}
    // gotas: 6 orbitan desde el inicio; al impacto cada una se parte en dos; en la corrosión se hunden en el rival
    const tx=3.4+0.55*hitK(ia,3)*(1-Math.exp(-Math.max(ia,0)*20)), sep=ss(TI+0.05,TI+0.4,te), sink=ss(TC2-0.15,TC2,te);
    drops.forEach((m,i)=>{const dup=i>=6,j=i%6,an=j/6*Math.PI*2+te*1.6+(dup?sep*Math.PI/6:0);
      const sc=(dup?ss(TI,TI+0.12,te):ss(0.1,0.35,te))*(1-ss(TC2,TC2+0.05,te));m.visible=sc>0.01;
      const r=0.62*(1-sink*0.85);m.position.set(tx+Math.cos(an)*r,0.95+0.12*Math.sin(te*3+j)+sink*0.15,Math.sin(an)*r);
      m.scale.set(Math.max(sc,0.001),Math.max(sc*1.45,0.001),Math.max(sc,0.001));});
    dropMat.uniforms.uA.value=0.3+1.2*hitK(ia,5)+0.8*hitK(ic,5);
    corr.position.x=tx; corr.visible=ic>=0&&ic<0.8; set(corr,cl(ic/0.6),ic>=0?1-ss(0.5,0.8,ic):0);
    // rival: retroceso fuerte, convulsión en la corrosión
    const hit=hitK(ia,3.2);
    target.position.x=tx; target.rotation.z=-hit*0.45*Math.cos(ia*12)+0.06*Math.sin(te*40)*hitK(ic,4);
    const sq=hitK(ic,6); target.scale.set(1+0.05*sq,1-0.07*sq,1+0.05*sq);
    o.em=0.35*hitK(ic,2.5)+0.1*ss(TI,TI+0.2,te)*(1-ss(TE,TF,te)); o.emc.copy(U.uC1.value);
    frac.position.x=tx; set(frac,1-Math.pow(1-cl(ia/0.55),2),ia>=0?1-ss(TI+1.1,TE+0.3,te):0);
    let p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    if(te<TG){o.g.copy(CL);o.gs=1.2*gat;o.ga=0.25*gat;o.li=2.5*gat;}
    else if(te<TI){bp.set(X0+(X1-X0)*rev,0.9,0);o.g.copy(bp);o.gs=2;o.ga=0.55;o.li=6;}
    else if(ic<0){o.g.copy(TC);o.gs=2+6*Math.min(ia,0.5);o.ga=0.9*hitK(ia,8)+0.1;o.li=15*hitK(ia,4)+1;}
    else{o.g.set(tx,1.1,0);o.gs=2.4;o.ga=0.55*hitK(ic,5);o.li=7*hitK(ic,4)+0.5;}
    o.ia=ia;o.c.copy(TC);o.shake=1.7;o.dist=1.3;
  };
}};

VFX.module("Reptil · Orejas",[curved,friezard,hidden,pogona,sidebarb,frill,swirl,venom]);
})();

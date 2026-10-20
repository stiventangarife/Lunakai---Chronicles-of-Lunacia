// =====================================================================
// MÓDULO · CLASE PÁJARO (BOCA)
// Estética de cielo y vuelo: plumas sueltas, viento, ultrasonido, luz y música. No se dibujan picos ni plumas
// del Axie: los efectos nacen de la boca del lanzador (≈ x −3.43, y 1.55) sin malla anatómica.
// Niveles por PA: todo es nivel 2 (firme y estándar, sin fractura de suelo) salvo Feather Dagger (1 PA, nivel 1).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,camera,caster,target,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam}=VFX.lib;

const MO=V3(-3.43,1.55,0), TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0);   // boca del lanzador; pecho y cabeza del rival
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), YA=V3(0,1,0), NY=V3(0,-1,0), ZA=V3(0,0,1);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const orient=(m,d,ax)=>m.quaternion.setFromUnitVectors(ax||YA,tmp3.copy(d).normalize());
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const glowEm=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const SDSEG=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
// pluma 2D (q.x 0..1 del cálamo a la punta, q.y ±.5): x = vexilo con barbas, y = raquis
const FEATH=`vec2 feath(vec2 q,float sd){float x=q.x;float side=q.y>0.?1.:.72;float ay=abs(q.y)/side;
 float w=.5*smoothstep(.04,.3,x)*sqrt(max(0.,1.-pow(max(x-.5,0.)/.5,2.)));
 float notch=step(.66,noise(vec3(x*9.,sign(q.y)*3.,sd)))*step(.3,x);
 float vane=smoothstep(w,w-.06,ay+notch*.07)*step(x,1.);
 float down=mix(.4+.6*noise(vec3(x*30.,q.y*30.,sd)),1.,smoothstep(.12,.34,x));
 float barb=.84+.16*sin((x*1.2-ay*1.6)*60.+sd);
 float shaft=smoothstep(.035,0.,abs(q.y))*step(.0,x)*step(x,.97);
 return vec2(vane*barb*down,shaft*(1.-.5*x));}`;
// pluma en sprite (vMix = ángulo en vueltas); wht aclara hacia el blanco (plumas de paloma)
const FEATHER_FS=(wht=0)=>HEAD+FEATH+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 vec2 fe=feath(vec2(q.x/.94+.5,q.y*3.),vMix*7.);float a=(fe.x*.85+fe.y)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(mix(uC2,uC1,.25+.75*(q.x+.5)),vec3(1.),${f(wht)})*1.3+vec3(1.)*fe.y*.35,a);}`;
const STREAK_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float a=smoothstep(.035,0.,abs(q.y))*smoothstep(.5,.05,abs(q.x))*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.4,a);}`;
// anillo en sprite (ultrasonido, ecos)
const RINGP_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=(smoothstep(.06,0.,abs(d-.4))+smoothstep(.04,0.,abs(d-.28))*.5)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.4,a);}`;
const SANG=`float sang(vec3 p,vec3 v){vec4 a=projectionMatrix*modelViewMatrix*vec4(p,1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(p+v*.05,1.);
 vec2 d=(b.xy/b.w-a.xy/a.w)*vec2(projectionMatrix[1][1]/projectionMatrix[0][0],1.);return atan(-d.y,d.x)/6.2832;}`;

// =====================================================================
// 1 · LITTLE OWL — un graznido nocturno lanza un eco que barre a todos los rivales y "elige" al más débil;
//     un cono de ultrasonido con anillos que viajan lo golpea de lleno y lo hace vibrar
// =====================================================================
const owlE=V3(1.3,1.25,1.9);
const owl={key:"bbLittleOwl",name:"Little Owl",pa:2,dur:2.0,ti:0.84,pal:"Arcano",enemies:2,
  phases:[["Graznido",0],["Eco",0.16],["Elección",0.56],["Ultrasonido",0.64],["Impacto",0.84],["Disipación",1.3]],
build(a){
  const L=a.L,TP=0.16,ESP=12,TC0=0.64,TI=0.84,TS=1.3,TE=1.65,EH=owlE;
  const EN=[V3(3.4,0,0),V3(1.3,0,1.9),V3(6.3,0,-1.7)], ET=EN.map(e=>TP+tmp.set(e.x,1.2,e.z).distanceTo(MO)/ESP);
  const D=V3(0,0,0).subVectors(EH,MO), LEN=D.length(); D.normalize();
  // aire nocturno: halo azul oscuro (mezcla normal) que envuelve la boca al graznar
  const night=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=noise(vec3(p*3.,uT*.8));
   gl_FragColor=vec4(vec3(.02,.03,.09),smoothstep(1.,.2,r+(n-.5)*.4)*.55*uA);}`,Object.assign({depthTest:false},NB)));
  // eco: esfera que se expande desde la boca, bandas finas en el borde
  const echo=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.);vec3 q=normalize(vP);
   float sc=.5+.5*sin(q.y*60.+uT*20.);gl_FragColor=vec4(mix(uC2,uC1,fr)*1.4,(fr*(.5+.5*sc)+.02)*uA);}`));
  echo.position.copy(MO);
  // cono de ultrasonido: vértice en la boca (y=0) y base en el rival (y=−1); bandas que viajan hacia fuera
  const cone=new THREE.Mesh(new THREE.ConeGeometry(1,1,48,1,true).translate(0,-0.5,0),fx(`void main(){float h=-vP.y;if(h>uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float an=atan(vP.z,vP.x);
   float bands=band(fract(h*7.-uT*6.),.5,.12);float n=noise(vec3(an*3.,h*10.-uT*8.,0.));
   float head=smoothstep(.08,0.,uP-h)*step(uP,.995);
   gl_FragColor=vec4(mix(uC2,uC1,bands+fr*.5)*1.4+vec3(1.)*head*.5,(fr*.35+bands*.45*(.6+.4*n)+head)*smoothstep(0.,.08,h)*uA);}`));
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.06,1,10,1,true).translate(0,-0.5,0),fx(`void main(){float h=-vP.y;if(h>uP)discard;
   float c=pow(abs(dot(normalize(vN),normalize(vV))),1.3);gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.7,c*(.6+.4*sin(h*60.-uT*50.))*uA);}`));
  for(const m of [cone,beam]){m.position.copy(MO);orient(m,D,NY);}
  // anillos ultrasónicos perpendiculares al eje, crecen con el radio del cono
  const RG_FS=`void main(){float r=length(vUv-.5)*2.;float an=atan(vUv.y-.5,vUv.x-.5);
   float m=band(r,.86,.06)+band(r,.7,.025)*.6;m*=.7+.3*step(.5,fract(an/6.2832*16.+uT*2.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,m*uA);}`;
  const rings=[0,1,2,3,4,5].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(RG_FS));orient(m,D,ZA);m.userData.d=i*0.07;L.trail.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false}));
  L.mesh.add(night,echo,cone,beam,hitRing);

  const C=`const float TC0=${f(TC0)};const float TI=${f(TI)};const vec3 MO=${v3(MO)};const vec3 EH=${v3(EH)};`;
  // graznido: dos "hu" en anillos pequeños y motas plateadas
  a.count+=points(L.part,10,C+`void main(){float s=floor(aSeed.x*2.)*.08;float life=.3;float age=(uT-s)/life;
   vec3 p=MO+vec3(.15+age*.5,0.,0.);vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.25+.6*age)*(.8+.4*aSeed.y));}`,RINGP_FS);
  // compresión de aire: motas que corren por el cono hacia el rival
  a.count+=points(L.part,130,C+`void main(){float life=.22+aSeed.y*.1;float k=(uT-TC0)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float h=age;vec3 ax=EH-MO;vec3 sd=normalize(cross(ax,vec3(0.,1.,0.)));vec3 up=normalize(cross(sd,ax));float an=r.x*6.2832;
   vec3 p=MO+ax*h+(sd*cos(an)+up*sin(an))*h*.62*r.y;
   vA=(k>=1.&&uT<${f(TS)})?sin(age*3.14159)*(.6+.4*r.z):0.;put(p,.03+.04*r.z);}`);
  // en el impacto: anillos que estallan del rival y chispas
  a.count+=points(L.part,26,C+`void main(){float s=TI+aSeed.x*.35;float life=.3+aSeed.y*.15;float age=(uT-s)/life;
   vec3 p=EH+rnd()*vec3(.2,.3,.2);vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.2+1.*age);}`,RINGP_FS);
  a.count+=sparks(L.part,110,TI,`${f(EH.x)},${f(EH.y)},${f(EH.z)}`,".6,.3,.2",2.5,7,2.6);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(EH.x,.05,EH.z)+vec3(cos(an),0.,sin(an))*(.3+.9*(1.-exp(-t*3.5)))+vec3(0.,.25*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.2+.18*aSeed.w)*(.6+age));}`,DUST_FS,NB);

  // suelo: un anillo de eco bajo cada rival al pasar el barrido; marca de fijación y onda bajo el elegido
  const pings=EN.map(e=>{const r=groundPlane(1.6,e.x,0.03,fx(RING_FS));r.position.z=e.z;L.decal.add(r);return r;});
  const lock=groundPlane(1.7,EH.x,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*1.5;
   float m=band(r,.82,.035)*step(.3,fract(an/6.2832*4.))+band(r,.6,.02)+smoothstep(.05,0.,abs(fract(an/6.2832*4.)-.15))*step(.62,r)*step(r,.95);
   gl_FragColor=vec4(mix(uC2,uC1,.7)*1.4,m*uA);}`)); lock.position.z=EH.z;
  const shock=groundPlane(3.4,EH.x,0.03,fx(RING_FS)); shock.position.z=EH.z;
  L.decal.add(lock,shock);

  a.pose=function(te,o){
    const ia=te-TI, hoot=ss(0,0.08,te)*(1-ss(0.18,0.32,te));
    caster.scale.set(1+0.05*hoot,1+0.04*hoot,1+0.05*hoot); caster.rotation.z=-0.08*hoot;
    towardCam(night.position,MO,0.1); billboard(night); set(night,0,ss(0,0.1,te)*(1-ss(TS,TE,te))*0.9);
    const er=(te-TP)*ESP; echo.visible=te>=TP&&er<12; echo.scale.setScalar(Math.max(er,0.01)); set(echo,0,(1-ss(4,12,er))*0.55);
    EN.forEach((e,i)=>{const p=cl((te-ET[i])/0.45);set(pings[i],1-Math.pow(1-p,2),te>=ET[i]?(1-p)*(i===1?0.9:0.45):0);});
    set(lock,0,ss(ET[1],ET[1]+0.1,te)*(1-ss(TS,TE,te)));
    // cono: crece hacia el rival, late con el sonido y se estrecha al apagarse
    const g=cl((te-TC0)/(TI-TC0)), fade=1-ss(TS,TE,te), rad=0.55*(1+0.08*Math.sin(te*40))*(0.6+0.4*fade);
    cone.visible=beam.visible=te>=TC0&&fade>0.001;
    cone.scale.set(rad,LEN,rad); set(cone,g*1.01,fade*0.9); beam.scale.set(1,LEN,1); set(beam,g*1.01,fade);
    rings.forEach(m=>{const k=((te-TC0-m.userData.d)/0.36)%1, on=te-TC0-m.userData.d>=0&&fade>0.01;m.visible=on;if(!on)return;
      m.position.copy(MO).addScaledVector(D,LEN*k); m.scale.setScalar(Math.max(rad*2*k*1.05,0.01)); m.material.uniforms.uA.value=Math.sin(Math.PI*k)*fade*(k<=g+0.02?1:0);});
    let p=cl(ia/0.35); towardCam(hitRing.position,EH,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    // el rival elegido vibra mientras le llega el ultrasonido
    const e=enemies[0], vib=te>=TI?(0.05*Math.exp(-ia*3)+0.025*fade):0;
    e.position.x=ENEMY_POS[0].x+vib*Math.sin(te*90)+0.18*hitK(ia,5); e.rotation.z=-vib*1.5*Math.sin(te*70);
    glowEm(e,(ia>=0?0.9*Math.exp(-ia*5):0)+0.25*ss(ET[1],ET[1]+0.1,te)*fade);
    if(te<TC0){o.g.copy(MO);o.gs=0.8*hoot+0.4;o.ga=0.3*hoot+0.05;o.li=1.5;}
    else if(te<TI){o.g.copy(MO).addScaledVector(D,LEN*g);o.gs=1.2;o.ga=0.4;o.li=3.5;}
    else{o.g.copy(EH);o.gs=1.5+2*Math.min(ia,0.5);o.ga=0.6*Math.exp(-ia*8)+0.15*fade;o.li=6*Math.exp(-ia*5)+1.5*fade;}
    o.ia=ia;o.c.copy(EH);o.shake=0;o.dist=0.6;o.flash=0;
  };
}};

// =====================================================================
// 2 · PEACE MAKER — una paloma blanca de luz nace de la boca, sobrevuela al rival y deja caer un halo
//     que se posa sobre su cabeza y lo aprieta: su fuerza se escurre hacia el suelo (Weak)
// =====================================================================
const peace={key:"bbPeaceMaker",name:"Peace Maker",pa:2,dur:2.3,ti:1.05,pal:"Celestial",
  phases:[["Paloma",0],["Vuelo",0.25],["Halo",0.88],["Weak",1.05],["Partida",1.35],["Fin",1.85]],
build(a){
  const L=a.L,TF=0.25,TH0=0.85,TD=0.88,TI=1.05,TL=1.35,TX=1.8,TE=2.0,HV=V3(3.0,2.85,0),HY=2.02;
  const dp=(te,out)=>{
    if(te<TF)return out.set(MO.x+0.35*ss(0,TF,te),MO.y+0.25*ss(0,TF,te),0);
    if(te<TH0){const k=ss(TF,TH0,te),x0=MO.x+0.35,y0=MO.y+0.25;return out.set(x0+(HV.x-x0)*k,y0+(HV.y-y0)*k+1.0*Math.sin(Math.PI*k),0.4*Math.sin(Math.PI*k));}
    if(te<TL){const t=te-TH0;return out.set(HV.x+0.45*Math.sin(t*5),HV.y+0.08*Math.sin(t*9),0.5*(1-Math.cos(t*5))*0.6);}
    const t=te-TL;dp(TL-0.0001,out);return out.set(out.x+t*3,out.y+t*t*4+t*1.5,out.z);};
  // paloma: silueta SDF de perfil, alas que baten (uQ = aleteo) y brillo interior
  const DOVE=SDSEG+`float wingD(vec2 p,vec2 sh,float a,float L,float W){p-=sh;float c=cos(a),s=sin(a);vec2 w=vec2(c*p.x+s*p.y,-s*p.x+c*p.y);
   float x=clamp(w.x/L,0.,1.);float lead=W*.3*(1.-x*x)+.012;float trail=W*(1.-pow(x,1.5))+.012+.022*abs(sin(x*31.))*step(.35,x);
   return max(max(-w.y-lead,w.y-trail),max(-w.x,w.x-L*(1.-.06*abs(sin(w.y*60.)))));}
  float sdDove(vec2 p,float fl){
   float d=length((p-vec2(0.,-.02))*vec2(1.,2.2))-.24;
   d=min(d,length(p-vec2(.25,.08))-.085);
   d=min(d,sdSeg(p,vec2(.32,.075),vec2(.41,.055))-.017);
   vec2 t=p-vec2(-.17,-.01);float tx=-t.x/.33;float tw=.035+.1*clamp(tx,0.,1.);
   d=min(d,max(max(abs(t.y+tx*.04)-tw,-tx),tx-1.+.08*abs(sin(t.y*45.))));
   d=min(d,wingD(p,vec2(.03,.05),1.25+fl*1.05,.62,.2));
   d=min(d,wingD(p,vec2(.06,.03),1.0+fl*.75,.42,.13)+.004);
   return d;}`;
  const dove=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fxU(DOVE+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*1.5;float d=sdDove(p,uQ);
   float fill=smoothstep(.02,-.02,d);float rim=band(d,0.,.025);float halo=smoothstep(.3,0.,d)*.3;
   float n=noise(vec3(p*6.,uT*2.));
   gl_FragColor=vec4(mix(vec3(1.),uC1,.25+.25*n)*1.25+uC2*rim*.6,(fill*(.7+.2*n)+rim+halo)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  // halo: toro dorado que cae y se aprieta sobre la cabeza
  const halo=new THREE.Mesh(new THREE.TorusGeometry(0.36,0.045,12,48).rotateX(Math.PI/2),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);
   float an=atan(vP.z,vP.x);float sp=pow(abs(sin(an*6.+uT*5.)),10.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4+.4*sp)*1.6+uC2*fr*.5,(.55+.45*fr+sp*.5)*uA);}`));
  // columna de luz entre la paloma y el halo mientras cae
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.42,1,32,1,true).translate(0,-0.5,0),fx(`void main(){float h=-vP.y;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float st=noise(vec3(atan(vP.z,vP.x)*4.,h*6.+uT*3.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,(fr*.4+smoothstep(.5,.8,st)*.3)*smoothstep(0.,.15,h)*smoothstep(1.,.7,h)*uA);}`));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(dove,halo,shaft,hitRing);

  const C=`const float TF=${f(TF)};const float TH0=${f(TH0)};const float TD=${f(TD)};const float TI=${f(TI)};const float TL=${f(TL)};const float TX=${f(TX)};
  const vec3 MO=${v3(MO)};const vec3 HV=${v3(HV)};const vec3 HP=vec3(3.4,${f(HY)},0.);
  vec3 dp(float t){if(t<TF)return MO+vec3(.35,.25,0.)*smoothstep(0.,TF,t);
   if(t<TH0){float k=smoothstep(TF,TH0,t);vec3 a=MO+vec3(.35,.25,0.);return vec3(a.x+(HV.x-a.x)*k,a.y+(HV.y-a.y)*k+sin(3.14159*k),.4*sin(3.14159*k));}
   float u=min(t,TL)-TH0;vec3 p=vec3(HV.x+.45*sin(u*5.),HV.y+.08*sin(u*9.),.3*(1.-cos(u*5.)));
   float w=max(t-TL,0.);return p+vec3(w*3.,w*w*4.+w*1.5,0.);}`;
  // nacimiento: luz que se junta en la boca
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*(TF-.05);float life=.2;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 c=dp(s+.2);vec3 p=mix(c+normalize(rnd())*(.7+.3*aSeed.y),c,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.04*aSeed.z);}`);
  // estela de motas y plumas blancas que se desprenden del vuelo
  a.count+=points(L.part,70,C+`void main(){float s=TF+aSeed.x*(TX-TF);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dp(s)+rnd()*.15+vec3(-.2*t,-.25*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.z*20.)):0.;put(p,(.04+.04*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,36,C+`void main(){float s=TF+aSeed.x*(TL-TF);float life=1.2+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dp(s)+rnd()*.12+vec3(sin(t*3.+aSeed.w*9.)*.25,-.8*t,cos(t*2.5+aSeed.z*7.)*.15);
   vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,.15+.07*aSeed.w);vMix=aSeed.w+sin(t*3.+aSeed.x*9.)*.15;}`,FEATHER_FS(0.65));
  // halo posado: chispas y chevrones de luz que bajan por el rival (su ataque se escurre)
  a.count+=sparks(L.part,80,TI,`3.4,${f(HY)},0.`,"0.,.2,0.",2,5,1.5);
  a.count+=points(L.part,40,C+`void main(){float life=.55+aSeed.y*.25;float k=(uT-TI-.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(3.4+(r.x-.5)*.7,${f(HY-0.15)}-age*1.7,(r.z-.5)*.7);
   vA=(k>=1.&&uT<TX+.2)?sin(age*3.14159)*(1.-smoothstep(TX-.2,TX+.2,uT)):0.;put(p,.16+.08*r.y);}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;float d=abs(-q.y-.15+abs(q.x)*.9);
    float a=smoothstep(.09,.04,d)*step(abs(q.x),.38)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.4,a);}`);
  // la paloma se disuelve en plumas al marcharse
  a.count+=points(L.part,50,C+`void main(){float s=TX-.1+aSeed.x*.1;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=dp(TX-.1)+r*.3+vec3(r.x*.9,.4+r.y*.4,r.z*.6)*(1.-exp(-t*3.))+vec3(sin(t*4.+aSeed.w*9.)*.15,-.5*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,.15+.07*aSeed.w);vMix=aSeed.w+t*.3;}`,FEATHER_FS(0.65));

  // suelo: sombra de la paloma y sello de paz bajo el rival
  const shadow=groundPlane(1.4,0,0.012,fx(`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.8));gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.2,d)*.5*uA);}`,NB));
  const seal=groundPlane(2.0,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.85,.035)+band(r,.7,.015)+pow(abs(cos(an*4.+uT*.5)),30.)*step(.72,r)*step(r,.84)*.8+smoothstep(.8,0.,r)*.1;
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.3,m*uA);}`));
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(shadow,seal,shock);

  const pp=V3(0,0,0), pv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, born=ss(0,TF,te), gone=1-ss(TX-0.15,TX,te);
    dp(te,pp); dp(te+0.02,pv); pv.sub(pp);
    towardCam(dove.position,pp,0.05); billboard(dove,te<TH0||te>=TL?Math.max(-0.5,Math.min(0.6,scrAng(pp,pv)))*0.6:0.06*Math.sin(te*9));
    dove.visible=te<TX; dove.scale.setScalar(0.55+0.45*born); dove.scale.x*=pv.x<-0.002?-1:1;
    dove.material.uniforms.uQ.value=0.5+0.5*Math.sin(te*(te<TF?10:18)); set(dove,0,born*gone);
    // halo: cae de la paloma, se posa y se aprieta
    const fall=ss(TD,TI,te), hy=HV.y-0.15+(HY-(HV.y-0.15))*fall*fall, sq=hitK(ia,5);
    halo.visible=te>=TD&&te<TE; halo.position.set(target.position.x,te<TI?hy:HY-0.06*ss(TI,TI+0.4,te),0);
    halo.scale.setScalar((te<TI?0.75+0.25*fall:1-0.12*ss(TI,TI+0.4,te))*(1+0.2*sq)); set(halo,0,ss(TD,TD+0.05,te)*(1-ss(TX,TE,te))*(1+sq));
    shaft.visible=te>=TD&&te<TI+0.25; shaft.position.copy(pp); shaft.scale.set(1,Math.max(pp.y-hy,0.01),1); set(shaft,0,ss(TD,TD+0.05,te)*(1-ss(TI,TI+0.25,te))*0.8);
    let p=cl(ia/0.35); towardCam(hitRing.position,tmp2.set(3.3,HY,0),0.3); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0); set(seal,0,ss(TI,TI+0.2,te)*(1-ss(TX,TE+0.2,te))*0.8);
    shadow.position.set(pp.x,0.012,pp.z); shadow.scale.setScalar(Math.max(1.1-pp.y*0.15,0.3)); shadow.material.uniforms.uA.value=born*gone*0.8;
    // rival debilitado: se encoge y se inclina, sin brillo propio
    const wk=ss(TI,TI+0.35,te)*(1-ss(TX,TE+0.2,te));
    target.scale.set(1+0.05*sq,1-0.07*wk-0.08*sq,1+0.05*sq); target.rotation.z=0.06*wk*Math.sin(te*3);
    caster.rotation.z=-0.06*ss(0,TF,te)*(1-ss(TF,TF+0.3,te));
    if(te<TI){o.g.copy(pp);o.gs=1.1+0.4*born;o.ga=0.4*born;o.li=3*born;}
    else{o.g.set(3.4,HY,0);o.gs=1.4+2*Math.min(ia,0.5);o.ga=0.55*Math.exp(-ia*7)+0.12*wk;o.li=6*Math.exp(-ia*4)+1.2*wk;}
    o.ia=ia;o.c.set(3.35,1.7,0);o.shake=0;o.dist=0.4;o.flash=0.5;
  };
}};

// =====================================================================
// 3 · FEATHER DAGGER (nivel 1) — dos dagas de pluma cristalina salen de la boca a velocidad supersónica con
//     estelas rosa neón y destellos celestes; dos impactos secos; una pluma (+1 carga) ronda al lanzador
// =====================================================================
const dagger={key:"bbFeatherDagger",name:"Feather Dagger",pa:1,dur:1.2,ti:0.38,pal:"Psicodelia",
  phases:[["Forja",0],["Disparo",0.1],["Impactos",0.28],["Carga",0.45]],
build(a){
  const L=a.L,DG=[{tl:0.1,ti:0.28,o:V3(0.05,0.06,0.12),h:V3(3.12,1.32,0.1)},{tl:0.18,ti:0.38,o:V3(0.05,-0.06,-0.12),h:V3(3.12,1.12,-0.1)}],TC0=0.45,TE=1.05;
  const dpos=(d,te,out)=>{const k=Math.pow(cl((te-d.tl)/(d.ti-d.tl)),1.25);
    return out.set(MO.x+d.o.x+(d.h.x-MO.x-d.o.x)*k,MO.y+d.o.y+(d.h.y-MO.y-d.o.y)*k+0.12*Math.sin(Math.PI*k),d.o.z+(d.h.z-d.o.z)*k);};
  // daga: silueta de pluma afilada con facetas de cristal, filo rosa neón y brillo celeste (fijo: destello pedido)
  const DAG_FS=FEATH+`void main(){vec2 q=vec2(vUv.x,(vUv.y-.5)*1.15);vec2 fe=feath(q,2.);
   float edge=fe.x*smoothstep(.35,.48,abs(q.y)/max(.5*smoothstep(.04,.3,q.x),.01));
   vec2 g=vec2(vUv.x*7.,vUv.y*3.);float fac=hash(vec3(floor(g+vec2(floor(vUv.y*3.)*.5,0.)),1.));
   float a=fe.x*(.35+.4*fac)+fe.y+edge;if(a<.01)discard;
   vec3 c=mix(uC1,vec3(.6,.95,1.),fac*.6)*1.4+vec3(1.)*fe.y*.6+uC1*edge*1.5;
   gl_FragColor=vec4(c,a*uA);}`;
  const blades=DG.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.15),fx(DAG_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const trails=DG.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,0.07).translate(-0.5,0,0),fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float core=smoothstep(.35,0.,v);gl_FragColor=vec4(mix(uC1,vec3(1.),core*.5)*1.6,(smoothstep(1.,0.,v)*.6+core)*pow(u,1.6)*uA);}`,{depthTest:false}));L.trail.add(m);return m;});

  const C=`const vec3 MO=${v3(MO)};const float TC0=${f(TC0)};`+DG.map((d,i)=>`const float TL${i}=${f(d.tl)};const float TI${i}=${f(d.ti)};const vec3 O${i}=${v3(d.o)};const vec3 H${i}=${v3(d.h)};
   vec3 dp${i}(float t){float k=pow(clamp((t-TL${i})/(TI${i}-TL${i}),0.,1.),1.25);vec3 s=MO+O${i};return s+(H${i}-s)*k+vec3(0.,.12*sin(3.14159*k),0.);}`).join("");
  // forja: motas que se cierran en la boca
  a.count+=points(L.part,24,C+`void main(){float s=aSeed.x*.08;float life=.1;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 c=MO+vec3(.1,0.,0.);vec3 p=mix(c+normalize(rnd())*.45,c,k*k);vA=(age>0.&&age<1.)?1.:0.;put(p,.03+.02*aSeed.z);}`);
  // estelas: motas rosa neón a lo largo de cada trayectoria
  a.count+=points(L.part,80,C+`void main(){bool b=aSeed.w>.5;float tl=b?TL1:TL0,ti=b?TI1:TI0;float s=tl+aSeed.x*(ti-tl);
   float life=.14+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);vec3 p=(b?dp1(s):dp0(s))+rnd()*.04+vec3(-.4*t,0.,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.03*aSeed.z)*(1.-age*.5));}`);
  // destellos celestes en el disparo y en cada impacto
  a.count+=points(L.part,16,C+`void main(){float i=floor(aSeed.x*3.999);float s=i<.5?TL0:(i<1.5?TL1:(i<2.5?TI0:TI1));
   vec3 c=i<.5?MO+O0:(i<1.5?MO+O1:(i<2.5?H0:H1));float life=.12+aSeed.y*.08;float age=(uT-s)/life;
   vA=(age>0.&&age<1.)?1.-age:0.;put(c+rnd()*.06,(i<1.5?.2:.32)*(1.+age)*(.7+.3*aSeed.z));}`,STAR4_FS.replace("mix(uC1,vec3(1.),.5+.5*c)","mix(vec3(.55,.92,1.),vec3(1.),.4+.5*c)"));
  DG.forEach(d=>{a.count+=sparks(L.part,45,d.ti,`${f(d.h.x)},${f(d.h.y)},${f(d.h.z)}`,"-.6,.2,0.",2,5,2.4);});
  // esquirlas de cristal de cada impacto
  a.count+=points(L.part,36,C+`void main(){bool b=aSeed.w>.5;float s=b?TI1:TI0;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.7,.3,0.))*(1.5+2.5*aSeed.z);vec3 p=(b?H1:H0)+v*t+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.05+.04*aSeed.z);}`,CHIP_FS);
  // carga de pluma: nace junto al lanzador y lo rodea en espiral ascendente hasta fundirse con su brillo
  a.count+=points(L.part,1,C+SANG+`void main(){float t=uT-TC0;float k=clamp(t/.55,0.,1.);float an=k*8.;
   vec3 p=vec3(-3.7+cos(an)*(.55-.25*k),.35+k*1.1,sin(an)*(.55-.25*k));vec3 v=vec3(-sin(an),.3,cos(an));
   vA=(t>0.&&k<1.)?smoothstep(0.,.1,k)*(1.-smoothstep(.75,1.,k)):0.;put(p,.34);vMix=sang(p,v);}`,FEATHER_FS());
  a.count+=points(L.part,24,C+`void main(){float s=TC0+aSeed.x*.5;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TC0)/.55,0.,1.);float an=k*8.;vec3 p=vec3(-3.7+cos(an)*(.55-.25*k),.35+k*1.1,sin(an)*(.55-.25*k))+rnd()*.05+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.025*aSeed.z);}`);

  const bv=V3(0,0,0), bp=V3(0,0,0);
  a.pose=function(te,o){
    let last=-1;
    DG.forEach((d,i)=>{const m=blades[i],tr=trails[i],k=(te-d.tl)/(d.ti-d.tl);dpos(d,te,bp);dpos(d,te+0.01,bv);bv.sub(bp);
      if(te>=d.ti)last=i;
      const ang=te<d.tl?0.1:scrAng(bp,bv.lengthSq()>1e-8?bv:tmp3.set(1,0,0));
      m.visible=te>=0.02&&te<d.ti+0.06; m.position.copy(bp); billboard(m,ang); m.scale.setScalar(te<d.tl?ss(0.02,d.tl,te):1);
      set(m,0,te<d.ti?1:1-cl((te-d.ti)/0.06));
      tr.visible=te>=d.tl&&te<d.ti+0.12; tr.position.copy(bp); billboard(tr,ang); tr.scale.set(Math.max(Math.min(bp.x-MO.x,2.2),0.01),1,1);
      set(tr,0,te<d.ti?1:1-cl((te-d.ti)/0.12));});
    // rival: dos sacudidas secas
    let kb=0;DG.forEach(d=>kb+=0.11*hitK(te-d.ti,10));target.position.x=3.4+kb;target.rotation.z=-kb*0.9;
    caster.rotation.z=-0.05*ss(0.04,0.1,te)*(1-ss(0.2,0.4,te));
    const ch=te-TC0; glowEm(caster,ch>=0.4?0.5*Math.exp(-(ch-0.4)*5)*(ch<0.55?ss(0.4,0.5,ch):1):0);
    if(last<0){dpos(DG[0],te,bp);o.g.copy(bp);o.gs=0.7;o.ga=0.3;o.li=2;}
    else if(te<TC0+0.3){const il=te-DG[last].ti;o.g.copy(DG[last].h);o.gs=0.9+1.6*Math.min(il,0.4);o.ga=0.45*Math.exp(-il*12);o.li=4*Math.exp(-il*8);}
    else{const k=cl(ch/0.55);o.g.set(-3.7,0.35+k*1.1,0);o.gs=0.6;o.ga=0.15*(1-ss(0.4,0.6,ch));o.li=1;}
    o.ia=last<0?te-DG[0].ti:te-DG[last].ti; o.c.copy(DG[Math.max(last,0)].h); o.shake=0; o.dist=0.25; o.flash=last===1||last<0?1:0.7;
  };
}};

// =====================================================================
// 4 · HUNGRY BIRD — el lanzador salta junto al rival y una cuña de energía voraz sale de su boca picoteándolo
//     cuatro veces; cada picotazo arranca plumas y migajas de energía; al volver, un calor dorado lo regenera
// =====================================================================
const hungry={key:"bbHungryBird",name:"Hungry Bird",pa:2,dur:2.2,ti:1.0,pal:"Ámbar",
  phases:[["Salto",0],["Picotazos",0.42],["Remate",1.0],["Regreso",1.22],["Regenera",1.55]],
build(a){
  const L=a.L,TJ=0.1,TA=0.36,PK=[0.5,0.65,0.8,1.0],PW=0.11,TR=1.22,TB=1.55,TH2=1.6,TE=2.1,XN=1.72,HIT=V3(3.12,1.38,0);
  const cx=te=>te<TJ?-3.7-0.1*ss(0,TJ,te):te<TA?-3.8+(XN+3.8)*ss(TJ,TA,te):te<TR?XN:XN+(-3.7-XN)*ss(TR,TB,te);
  const cy=te=>te>=TJ&&te<TA?0.55*Math.sin(Math.PI*(te-TJ)/(TA-TJ)):te>=TR&&te<TB?0.6*Math.sin(Math.PI*(te-TR)/(TB-TR)):0;
  const peck=te=>{for(let i=0;i<PK.length;i++){const k=(te-(PK[i]-PW*0.6))/PW;if(k>=0&&k<1)return [i,Math.pow(Math.sin(Math.PI*k),0.6)];}return [-1,0];};
  // cuña voraz: cono afilado a lo largo de +x (base en 0, punta en 1); ondas de hambre corren hacia la punta
  const wedge=new THREE.Mesh(new THREE.ConeGeometry(0.13,1,20,1,true).rotateZ(-Math.PI/2).translate(0.5,0,0),fx(`void main(){float u=vP.x;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);float rip=band(fract(u*5.-uT*9.),.5,.15);
   float n=noise(vec3(u*8.-uT*12.,atan(vP.z,vP.y)*2.,uT));float tip=smoothstep(.75,1.,u);
   gl_FragColor=vec4(mix(uC2,uC1,fr+rip*.5+tip)*1.5+vec3(1.)*tip*.6,(fr*.7+rip*.4*n+tip+.12)*uA);}`));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false}));
  L.mesh.add(wedge,hitRing);
  // estela del salto: franja rasante cálida
  const dash=groundPlane(1,0,0.016,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*20.-uT*6.,vUv.y*4.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.3,smoothstep(.6+.3*n,0.,v)*u*u*.5*uA);}`),0.5);
  dash.geometry.translate(-0.5,0,0); L.trail.add(dash);

  const C=`const vec3 HIT=${v3(HIT)};const float TB=${f(TB)};const float TH2=${f(TH2)};const float TJ=${f(TJ)};const float TA=${f(TA)};const float XN=${f(XN)};`;
  // por picotazo: plumas arrancadas y migajas de energía
  PK.forEach((t,i)=>{const big=i===3;
    a.count+=points(L.part,big?28:16,C+`void main(){float s=${f(t)}+aSeed.x*.04;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float tt=max(uT-s,0.);
     vec3 r=rnd();vec3 p=HIT+vec3(.2+.9*abs(r.x),.3+.9*aSeed.z,r.z*.9)*(1.-exp(-tt*4.))+vec3(sin(tt*4.+aSeed.w*9.)*.2,-.7*tt,0.);
     vA=(age>0.&&age<1.&&p.y>.03)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,.15+.07*aSeed.w);vMix=aSeed.w+tt*.5*sign(r.x);}`,FEATHER_FS());
    a.count+=points(L.part,big?44:26,C+`void main(){float s=${f(t)}+aSeed.x*.03;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float tt=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(.3,.6,0.))*(1.5+2.5*aSeed.z);vec3 p=HIT+v*tt+vec3(0.,-5.*tt*tt,0.);
     vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.06+.05*aSeed.w);vMix=aSeed.w*7.+tt*4.;}`,HEAD+`varying float vA;varying float vMix;
     void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix),s=sin(vMix);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
      float d=max(abs(q.x)*1.2+abs(q.y)*.5,abs(q.y)*1.3+abs(q.x)*.3)+(hash(vec3(floor(q*6.),vMix))-.5)*.08;
      float a=smoothstep(.34,.28,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(uC2,uC1,.5+.5*sin(vMix))*1.5+vec3(.4)*smoothstep(.2,0.,d),a);}`);
    a.count+=sparks(L.part,big?70:28,t,`${f(HIT.x)},${f(HIT.y)},0.`,"-.4,.4,0.",2,big?7:4.5,2.6);});
  // polvo del salto y del aterrizaje
  a.count+=points(L.part,36,C+`void main(){float i=step(.5,aSeed.w);float s=(i>.5?TA:TJ)+aSeed.x*.05;float x0=i>.5?XN:-3.8;
   float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(x0,.05,0.)+vec3(cos(an),0.,sin(an))*(.25+.6*(1.-exp(-t*4.)))+vec3(0.,.22*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.2+.16*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // regeneración: motas cálidas que suben en espiral alrededor del lanzador
  a.count+=points(L.part,70,C+`void main(){float s=TH2+aSeed.x*.35;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.;float rad=.5+.15*aSeed.w;vec3 p=vec3(-3.7+cos(an)*rad,.1+t*2.2,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.05*aSeed.w);}`);

  const rings=PK.map(()=>{const r=groundPlane(1.8,3.4,0.03,fx(RING_FS));L.decal.add(r);return r;});
  const heal=groundPlane(1.9,-3.7,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.82,.04)+band(r,.55+.1*uP,.03)*.7+smoothstep(.85,0.,r)*.15*(.7+.3*sin(an*8.+uT*4.));
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,m*uA);}`));
  L.decal.add(heal);

  a.pose=function(te,o){
    const x=cx(te), y=cy(te), [pi,pk]=peck(te);
    caster.position.set(x,y,0);
    caster.rotation.z=(te<TJ?0.1*ss(0,TJ,te):0)-0.25*pk-0.15*ss(TJ,TJ+0.05,te)*(1-ss(TA-0.1,TA,te))+0.15*ss(TR,TR+0.05,te)*(1-ss(TB-0.1,TB,te));
    const land=hitK(te-TA,10)*(te>=TA?1:0); caster.scale.set(1+0.08*land,1-0.12*land,1+0.08*land);
    // cuña: sale de la boca hasta el pecho y se recoge en cada picotazo
    const mo=x+0.27, reach=HIT.x-mo+0.08;
    wedge.visible=pk>0.01; wedge.position.set(mo,1.5+y,0); wedge.rotation.z=Math.atan2(HIT.y-1.5,reach)*0.8;
    const thick=pi===3?1.35:1; wedge.scale.set(Math.max(reach*pk,0.01),thick*(0.7+0.3*pk),thick*(0.7+0.3*pk)); set(wedge,0,pk);
    let last=-1;for(let i=0;i<PK.length;i++)if(te>=PK[i])last=i;
    const il=last>=0?te-PK[last]:-1, ia=te-PK[3];
    let p=cl(il/0.25); towardCam(hitRing.position,HIT,0.35); billboard(hitRing); hitRing.visible=il>=0&&p<1; hitRing.scale.setScalar(last===3?1.5:0.9); set(hitRing,p,1-p);
    rings.forEach((r,i)=>{const q=cl((te-PK[i])/0.4);set(r,1-Math.pow(1-q,2),te>=PK[i]?(1-q)*(i===3?0.8:0.4):0);});
    dash.visible=(te>=TJ&&te<TA+0.25)||(te>=TR&&te<TB+0.25);
    if(te<TR){dash.position.x=x;dash.scale.set(Math.max(x+3.8,0.01),1,1);set(dash,0,te<TA?1:1-cl((te-TA)/0.25));}
    else{dash.position.x=x;dash.scale.set(-Math.max(XN-x,0.01),1,1);set(dash,0,te<TB?1:1-cl((te-TB)/0.25));}
    set(heal,ss(TH2,TE,te),ss(TH2-0.05,TH2+0.15,te)*(1-ss(TE-0.1,TE+0.1,te)));
    glowEm(caster,0.6*ss(TH2-0.05,TH2+0.15,te)*(1-ss(TE-0.2,TE+0.1,te))+0.25*pk);
    // rival: un tirón por picotazo, el último más fuerte
    const kb=last>=0?(last===3?0.3:0.09)*Math.exp(-il*(last===3?4.5:10)):0;
    target.position.x=3.4+kb; target.rotation.z=-kb*1.1*Math.cos(Math.max(il,0)*16);
    if(last<0){o.g.set(x+0.3,1.5+y,0);o.gs=0.8;o.ga=0.25;o.li=1.5;}
    else if(te<TR){o.g.copy(HIT);o.gs=1.1+(last===3?2.4:1.2)*Math.min(il,0.4);o.ga=(last===3?0.6:0.35)*Math.exp(-il*10)+0.1;o.li=(last===3?7:3.5)*Math.exp(-il*7)+1;}
    else{const hk=ss(TH2-0.05,TH2+0.15,te)*(1-ss(TE-0.2,TE+0.1,te));o.g.set(x,1,0);o.gs=1.4;o.ga=0.25*hk;o.li=2.5*hk;}
    o.ia=last<0?ia:il; o.c.copy(HIT); o.shake=0; o.dist=last===3?0.6:0.3; o.flash=last===3||last<0?1:0.6;
  };
}};

// =====================================================================
// 5 · DOUBLETALK — dos notas musicales disonantes salen de la boca trenzándose sobre un pentagrama ondulante;
//     chocan en la cabeza del rival con un estallido de interferencias y lo envuelven en una nube púrpura con zetas
// =====================================================================
const talk={key:"bbDoubletalk",name:"Doubletalk",pa:2,dur:2.4,ti:1.0,pal:"Miasma",
  phases:[["Notas",0],["Trenza",0.2],["Disonancia",1.0],["Sueño",1.15],["Fin",2.0]],
build(a){
  const L=a.L,TL=0.2,TI=1.0,TS=1.15,TX=2.0,DUR=2.4,HP=V3(3.22,1.95,0),S0=V3(MO.x+0.2,MO.y+0.1,0);
  const np=(i,te,out)=>{const k=ss(TL,TI,te),s=i?1:-1,ph=k*Math.PI*3,am=0.32*Math.sin(Math.PI*k);
    if(te<TL){const b=ss(0,TL,te);return out.set(S0.x+0.15*b,S0.y+0.15*b+s*0.12*b,0);}
    return out.set(S0.x+0.15+(HP.x-S0.x-0.15)*k,S0.y+0.15+(HP.y-S0.y-0.15)*k+0.5*Math.sin(Math.PI*k)+s*am*Math.cos(ph)*0.6+(1-k)*s*0.12,s*am*Math.sin(ph));};
  // notas: corchea y semicorcheas unidas; cada canal de color desplazado (disonancia) y temblor
  const NOTE=SDSEG+`float noteA(vec2 p){vec2 h=p-vec2(-.1,-.25);h=vec2(h.x*.83+h.y*.55,-h.x*.55+h.y*.83);
   float d=length(h*vec2(1.,1.5))-.12;d=min(d,sdSeg(p,vec2(.0,-.22),vec2(.0,.32))-.022);
   d=min(d,sdSeg(p,vec2(.0,.32),vec2(.16,.12))-.03);return d;}
  float noteB(vec2 p){float d=1e3;for(int i=0;i<2;i++){vec2 o=vec2(-.2+.32*float(i),-.24+.06*float(i));vec2 h=p-o;h=vec2(h.x*.83+h.y*.55,-h.x*.55+h.y*.83);
    d=min(d,length(h*vec2(1.,1.5))-.1);d=min(d,sdSeg(p,o+vec2(.09,.02),o+vec2(.09,.5))-.02);}
   d=min(d,sdSeg(p,vec2(-.11,.26),vec2(.21,.32))-.04);d=min(d,sdSeg(p,vec2(-.11,.14),vec2(.21,.2))-.03);return d;}`;
  const noteMat=(fn)=>fxU(NOTE+`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*1.2;vec2 j=vec2(sin(uT*37.+uQ),cos(uT*29.+uQ*2.))*.025;
   float dr=${fn}(p+j),dg=${fn}(p),db=${fn}(p-j);
   vec3 m=vec3(smoothstep(.02,-.02,dr),smoothstep(.02,-.02,dg),smoothstep(.02,-.02,db));
   float rim=band(dg,0.,.03);float halo=smoothstep(.25,0.,dg)*.3;
   vec3 c=mix(uC1,vec3(1.),.3)*m*1.4+uC2*rim*1.2+uC1*halo;
   gl_FragColor=vec4(c,(max(m.r,max(m.g,m.b))*.85+rim+halo)*uA);}`,{uQ:{value:0}},{depthTest:false});
  const notes=["noteA","noteB"].map((fn,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),noteMat(fn));m.material.uniforms.uQ.value=i*3.1;L.mesh.add(m);return m;});
  // pentagrama: cinco líneas onduladas en un plano vertical de la boca a la cabeza; uP revela, uQ desafina
  const ST_W=HP.x-S0.x;
  const staff=new THREE.Mesh(new THREE.PlaneGeometry(ST_W,1.1),fx(`void main(){float u=vUv.x;if(u>uP)discard;
   float y=(vUv.y-.5)*1.1-.5*sin(3.14159*u)*.9+.04;float w=.08*sin(u*12.-uT*3.);
   float m=0.;for(int i=0;i<5;i++){float yi=(float(i)-2.)*.06*(1.+.4*sin(u*7.+float(i)*1.7+uT*4.)*u);m+=band(y-w,yi,.008);}
   float head=smoothstep(.06,0.,uP-u);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*sin(u*20.-uT*6.))*1.4,m*(.35+.65*head)*smoothstep(0.,.05,u)*uA);}`,{depthTest:false}));
  staff.position.set((S0.x+HP.x)/2,(S0.y+HP.y)/2+0.15,0);
  // choque disonante: dos juegos de anillos desfasados (moiré) en billboard
  const clash=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(`void main(){vec2 p=(vUv-.5)*2.;float r1=length(p-vec2(.08,0.)),r2=length(p+vec2(.08,0.));
   float m=pow(.5+.5*sin(r1*40.-uP*30.),6.)*.5+pow(.5+.5*sin(r2*43.-uP*30.),6.)*.5;
   gl_FragColor=vec4(mix(uC1,uC2,m)*1.5,m*smoothstep(uP*1.05,uP*.6,length(p))*smoothstep(0.,.2,length(p))*(1.-uP)*uA);}`,{depthTest:false}));
  L.mesh.add(clash); L.trail.add(staff);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TX=${f(TX)};const vec3 HP=${v3(HP)};const vec3 S0=${v3(S0)};
  vec3 np(float s,float t){float k=smoothstep(TL,TI,t);float ph=k*9.4248;float am=.32*sin(3.14159*k);
   return vec3(S0.x+.15+(HP.x-S0.x-.15)*k,S0.y+.15+(HP.y-S0.y-.15)*k+.5*sin(3.14159*k)+s*am*cos(ph)*.6+(1.-k)*s*.12,s*am*sin(ph));}`;
  // chispas agrias que sueltan las notas al vibrar
  a.count+=points(L.part,90,C+`void main(){float sd=aSeed.w>.5?1.:-1.;float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=np(sd,s)+rnd()*.1+vec3(-.3*t,(aSeed.z-.5)*.6*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*45.+aSeed.z*30.)):0.;put(p,(.035+.04*aSeed.z)*(1.-age*.5));}`);
  a.count+=sparks(L.part,70,TI,`${f(HP.x)},${f(HP.y)},0.`,"0.,.3,0.",2,5,1.5);
  // nube de sueño: humo púrpura (mezcla normal) y brillo que giran alrededor de la cabeza
  a.count+=points(L.part,55,C+`void main(){float an=aSeed.x*6.2832+uT*(.4+.3*aSeed.y);float rad=.35+.35*aSeed.z;float g=smoothstep(TI,TS+.2,uT)*(1.-smoothstep(TX,${f(DUR)},uT));
   vec3 p=HP+vec3(cos(an)*rad,(aSeed.w-.4)*.5+.08*sin(uT*1.5+aSeed.x*9.),sin(an)*rad*.8);
   vA=g*.6;put(p,(.45+.35*aSeed.w)*(.5+.5*g));}`,SMOKE_FS("mix(uC2,uC1,.25)"),NB);
  a.count+=points(L.part,36,C+`void main(){float an=aSeed.x*6.2832-uT*.6;float rad=.3+.4*aSeed.z;float g=smoothstep(TI,TS+.2,uT)*(1.-smoothstep(TX,${f(DUR)},uT));
   vec3 p=HP+vec3(cos(an)*rad,(aSeed.w-.4)*.5,sin(an)*rad*.8);vA=g*.35*(.6+.4*sin(uT*3.+aSeed.y*9.));put(p,(.35+.3*aSeed.w)*g);}`);
  // zetas que suben balanceándose y crecen
  a.count+=points(L.part,22,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=HP+vec3(.1+(r.x-.3)*.4+sin(age*6.+r.y*6.)*.12,.25+age*1.1,(r.z-.5)*.4);
   vA=(k>=1.&&uT<TX+.3)?sin(age*3.14159)*(1.-smoothstep(TX-.2,TX+.3,uT)):0.;put(p,.16+.2*age);vMix=sin(age*6.+r.y*6.)*.08;}`,HEAD+SDSEG+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
    float d=min(min(sdSeg(q,vec2(-.22,.26),vec2(.22,.26)),sdSeg(q,vec2(-.22,-.26),vec2(.22,-.26))),sdSeg(q,vec2(.22,.26),vec2(-.22,-.26)));
    float a=(smoothstep(.07,.04,d)+smoothstep(.16,.0,d)*.25)*vA;if(a<.003)discard;
    gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.4,a);}`);

  // suelo: bruma adormecedora bajo el rival
  const mist=groundPlane(2.3,3.4,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,uT*.5))*.6+noise(vec3(p*11.,uT*.3+2.))*.4;
   float m=smoothstep(1.,.3,r+(n-.5)*.4)*(.25+.25*n)+band(r,.85,.04)*.5;gl_FragColor=vec4(mix(uC2,uC1,n)*1.2,m*uA);}`));
  const shock=groundPlane(3.0,3.4,0.03,fx(RING_FS));
  L.decal.add(mist,shock);

  const pp=V3(0,0,0), pv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, born=ss(0,TL,te);
    notes.forEach((m,i)=>{np(i,te,pp);towardCam(m.position,pp,0.05);billboard(m,0.25*Math.sin(te*(i?7:9)+i*2)+(i?-0.15:0.15));
      const pulse=1+0.1*Math.sin(te*(i?23:17));m.visible=te<TI+0.05;m.scale.setScalar((0.4+0.6*born)*pulse*(te<TI?1:1-cl(ia/0.05)));set(m,0,born);});
    staff.visible=te>=0.05&&te<TS+0.3; set(staff,ss(0.05,TI,te)*1.02,ss(0.05,0.2,te)*(1-ss(TI,TS+0.3,te))*0.8);
    let p=cl(ia/0.5); towardCam(clash.position,HP,0.4); billboard(clash); clash.visible=ia>=0&&p<1; set(clash,p,1);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    const sl=ss(TS-0.1,TS+0.3,te)*(1-ss(TX,DUR,te)); set(mist,0,sl*0.9);
    // rival adormecido: cabecea despacio, respira hondo y apaga su brillo hacia el púrpura
    target.position.x=3.4+0.12*hitK(ia,8);
    target.rotation.z=-0.1*hitK(ia,8)*Math.sin(ia*20)+sl*(0.1*Math.sin(te*2.2)+0.05);
    const br=sl*0.03*Math.sin(te*3.3); target.scale.set(1+br,1-0.04*sl-br,1+br);
    o.em=0.35*sl*(0.7+0.3*Math.sin(te*3.3)); o.emc.copy(U.uC2.value);
    caster.rotation.z=-0.05*Math.sin(te*14)*ss(0,0.1,te)*(1-ss(TL,TL+0.3,te));
    if(te<TI){np(0,te,pp);np(1,te,pv);o.g.copy(pp).add(pv).multiplyScalar(0.5);o.gs=1+0.3*born;o.ga=0.3*born;o.li=2.2*born;}
    else{o.g.copy(HP);o.gs=1.4+2*Math.min(ia,0.5);o.ga=0.5*Math.exp(-ia*7)+0.12*sl;o.li=5*Math.exp(-ia*4)+1.2*sl;}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.5;o.flash=0.7;
  };
}};

VFX.module("Pájaro · Boca",[owl,peace,dagger,hungry,talk]);
})();

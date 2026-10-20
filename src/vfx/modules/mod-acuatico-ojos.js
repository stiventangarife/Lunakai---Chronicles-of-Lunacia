// =====================================================================
// MÓDULO · CLASE ACUÁTICO (OJOS)
// Estética de clase: luz submarina, cáusticas, gotas, mareas, sonar y burbujas irisadas.
// Los ojos no se dibujan: los efectos nacen en su posición (≈ x −3.47, y 1.66, z ±0.1) como destellos de luz.
// Niveles por PA: 1 (Clear, Telescope) rápido y ligero · 2 (Gero, Sleepless) estándar, sin fractura ·
// 3 (Baby) pesado, con fractura de baldosa bajo el propio Axie (beneficiario del escudo).
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,camera,caster,target}=VFX;
const {NB,v3,STAR4_FS,SMOKE_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

const TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0);                // pecho y cabeza del objetivo
const EYE=V3(-3.45,1.66,0), EYES=[V3(-3.47,1.66,0.1),V3(-3.47,1.66,-0.1)];
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const gp=(s,x,z,mat,y)=>{const m=groundPlane(s,x,y||0.02,mat);m.position.z=z;return m;};

// ---------- shaders compartidos del módulo ----------
// destello de ojo: núcleo (uQ lo alarga en vertical como una pupila de luz) y dos rayos finos
const FLARE_FS=`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;float core=exp(-length(p*vec2(1.+uQ*3.,1.))*5.);
 float h=exp(-abs(p.y)*34.)*exp(-abs(p.x)*2.8);float v=exp(-abs(p.x)*34.)*exp(-abs(p.y)*2.8);
 gl_FragColor=vec4(mix(uC1,vec3(1.),core)*1.6,(core*1.4+(h+v)*.6)*uA);}`;
// cáusticas: red de líneas de luz submarina (dos capas de ruido "cresta")
const CAUS=`float caus(vec3 q){return pow(1.-abs(noise(q)*2.-1.),7.)+pow(1.-abs(noise(q*1.9+5.)*2.-1.),9.)*.6;}`;
const RIPPLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=0.;
 for(int i=0;i<3;i++){float c=uP*1.1-float(i)*.18;w+=band(r,c,.035+.03*max(c,0.))*step(0.,c)*(1.-clamp(c,0.,1.));}
 float n=noise(vec3(p*8.,uT));
 gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.4,w*(.6+.4*n)*uA*smoothstep(1.,.85,r));}`;
const WDROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.6),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,0.)));
 gl_FragColor=vec4(mix(vec3(.7,.9,1.),uC1,.4)*(.75+.4*vMix)*(1.1-d)+vec3(1.)*hl*.8,a*.9);}`;
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*9.,vMix*30.));
 float a=smoothstep(.5,.2,d+(n-.5)*.3)*smoothstep(.25,.5,n+.2)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.93,.98,1.),uC1,.18)*(.85+.3*n),a);}`;

// =====================================================================
// 1 · CLEAR (1 PA) — dos destellos cristalinos en los ojos y un haz de luz submarina con cáusticas barre hacia
//     delante: las motas oscuras (males) se desprenden del Axie y el rival queda revelado por la luz
// =====================================================================
const clear={key:"qjClear",name:"Clear",pa:1,dur:1.2,ti:0.32,pal:"Pureza",
  phases:[["Cristal",0],["Destello",0.32],["Barrido",0.42],["Revelado",0.6],["Fin",0.95]],
build(a){
  const L=a.L,TI=0.32,TW=0.3,LEN=7.4,TE=0.95;
  const flares=EYES.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fxU(FLARE_FS,{uQ:{value:0}},{depthTest:false}));L.mesh.add(m);return m;});
  // haz cónico a lo largo de +x con cáusticas que fluyen; uP = frente del barrido
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.05,LEN,36,1,true).translate(0,LEN/2,0).rotateZ(-Math.PI/2),fx(CAUS+`
  void main(){float v=vUv.y;if(v>uP)discard;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float c=caus(vec3(vUv.x*9.,v*8.-uT*2.,uT*.8));float head=smoothstep(.06,0.,uP-v);
   gl_FragColor=vec4(mix(uC2,uC1,c)*1.3+vec3(1.)*head*.5,((.08+.25*(1.-fr))*(.4+.8*c)+head*.7)*smoothstep(0.,.05,v)*smoothstep(1.,.75,v)*uA);}`));
  beam.position.copy(EYE); beam.rotation.z=-0.05; L.trail.add(beam);
  // cáusticas proyectadas en el suelo bajo el haz (cuña que se ensancha con la distancia)
  const floor=groundPlane(LEN,EYE.x+LEN/2,0.02,fx(CAUS+`
  void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP)discard;float w=.1+.75*u;
   float c=caus(vec3(vUv*vec2(16.,5.),uT*.9));float m=smoothstep(w,w*.6,v)*smoothstep(0.,.08,u);
   gl_FragColor=vec4(mix(uC2,uC1,c)*1.4,m*(.1+.55*c+smoothstep(.06,0.,uP-u)*.6)*uA);}`),2.6);
  L.decal.add(floor);

  const C=`const float TI=${f(TI)};const vec3 EYE=${v3(EYE)};const vec3 HC=${v3(TC)};`;
  // motas oscuras pegadas al cuerpo; con el destello se desprenden hacia atrás y se deshacen
  a.count+=points(L.part,70,C+`void main(){float an=aSeed.x*6.2832;vec3 o=vec3(-3.7+cos(an)*.42,.2+aSeed.y*1.5,sin(an)*.42);
   float s=TI+aSeed.z*.15;float t=max(uT-s,0.);vec3 p=o+vec3(-1.6*t-.2*t*aSeed.w,.5*t,(aSeed.w-.5)*.8*t)+vec3(0.,sin(uT*3.+an)*.03,0.);
   float k=t/.35;vA=(k<1.)?(1.-k)*.8*smoothstep(0.,.1,uT):0.;put(p,(.12+.08*aSeed.w)*(1.-k*.6));}`,SMOKE_FS("vec3(.08,.06,.1)"),NB);
  a.count+=points(L.part,40,C+`void main(){float an=aSeed.x*6.2832;float s=TI+aSeed.z*.15+.2;float life=.2;float age=(uT-s)/life;
   vec3 p=vec3(-3.7+cos(an)*.42-.35,.3+aSeed.y*1.5,sin(an)*.42);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.1+.06*aSeed.w);}`,STAR4_FS);
  // motas de luz que flotan en el haz
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.3;float life=.35+aSeed.y*.25;float age=(uT-s)/life;
   float u=aSeed.z;vec3 p=EYE+vec3(u*${f(LEN)}*.9,-u*.35+(aSeed.w-.5)*u*1.4,(fract(aSeed.w*7.1)-.5)*u*1.4);
   float front=(uT-TI)/${f(TW)};vA=(age>0.&&age<1.&&u<front)?sin(age*3.14159):0.;put(p,.025+.03*aSeed.w);}`);
  // destellos que delinean al rival al quedar revelado
  a.count+=points(L.part,40,C+`void main(){float s=TI+${f(TW*0.9)}+aSeed.x*.15;float life=.3;float age=(uT-s)/life;
   float an=aSeed.y*6.2832;vec3 p=vec3(3.4+cos(an)*.44,.15+aSeed.z*1.7,sin(an)*.44+.05);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.06*aSeed.w);}`,STAR4_FS);

  a.pose=function(te,o){
    const ia=te-TI, sw=cl(ia/TW), on=ss(TI-0.02,TI+0.04,te)*(1-ss(0.7,TE,te));
    flares.forEach((m,i)=>{towardCam(m.position,EYES[i],0.15);billboard(m,0.2*i);m.visible=te<TE;
      m.scale.setScalar(0.35+0.4*ss(0,TI,te)+0.6*hitK(ia,8));set(m,0,ss(0,0.2,te)*(1-ss(TI+0.15,0.8,te))*(1+hitK(ia,6)));});
    beam.visible=on>0.001; set(beam,sw*1.01,on*0.9);
    set(floor,sw*1.01,on*0.8);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*ss(0,TI,te)+0.45*hitK(ia,6);
    caster.rotation.z=0.04*ss(0,TI,te)-0.04*ss(TI,TI+0.1,te);
    // revelado: el rival se ilumina cuando el frente lo alcanza
    const rv=te-TI-TW*0.9; o.em=rv>=0?0.7*Math.exp(-rv*5):0; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(EYE);o.gs=0.6+0.4*ss(0,TI,te);o.ga=0.3;o.li=1.5;}
    else{o.g.set(EYE.x+LEN*0.9*sw,EYE.y-0.3*sw,0);o.gs=1.4;o.ga=0.4*on;o.li=3.5*on;}
    o.ia=ia;o.c.copy(EYE);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 2 · GERO (2 PA) — el agua se condensa en una gota concentrada frente a los ojos; vuela en parábola, se
//     estrella a los pies del rival en una corona de salpicaduras y deja un charco resbaladizo donde patina
// =====================================================================
const gero={key:"qjGero",name:"Gero",pa:2,dur:2.1,ti:0.95,pal:"Rocío (Espalda)",
  phases:[["Condensar",0],["Lanzamiento",0.4],["Parábola",0.48],["Estallido",0.95],["Charco",1.15],["Fin",1.75]],
build(a){
  const L=a.L,TL=0.42,TI=0.95,TE=1.75,D0=V3(-3.05,1.8,0.1),G=V3(3.3,0.06,0.55),HA=2.1;
  const dpos=(te,o)=>{if(te<TL)return o.copy(D0).add(tmp2.set(0,0.04*Math.sin(te*14),0));const k=cl((te-TL)/(TI-TL));
    return o.set(D0.x+(G.x-D0.x)*k,D0.y+(G.y-D0.y)*k+4*HA*k*(1-k),D0.z+(G.z-D0.z)*k);};
  // gota: agua densa con cáusticas internas, fresnel y reflejo; se estira según la velocidad
  const drop=new THREE.Mesh(new THREE.SphereGeometry(0.2,36,24),fx(CAUS+`
  void main(){vec3 n=normalize(vN),v=normalize(vV);float fr=pow(1.-abs(dot(n,v)),1.5);
   float c=caus(vP*14.+vec3(uT*2.));float sp=pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.4,.7,.6)))),40.);
   gl_FragColor=vec4(mix(uC2,uC1,fr*.6+c*.4)*1.3+vec3(1.)*sp*1.8,(.25+.6*fr+c*.25+sp)*uA);}`));
  // corona de salpicadura: cilindro abierto con borde en puntas que sube y cae (uP)
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.28,0.7,48,1,true).translate(0,0.35,0),fx(`
  void main(){float h=vP.y/.7;float an=atan(vP.z,vP.x);
   float tips=.45+.5*pow(abs(sin(an*7.+1.3)),3.)*(.7+.3*noise(vec3(an*5.,1.,2.)));
   float top=tips*(1.-uP*.85);if(h>top)discard;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float rim=smoothstep(.12,0.,top-h);
   float n=noise(vec3(an*6.,h*5.-uT*3.,uT));
   gl_FragColor=vec4(mix(uC2,uC1,n*.5+rim)*1.4+vec3(1.)*rim*.6,((.2+.6*fr)*(.5+.5*n)+rim)*uA);}`));
  crown.position.copy(G); crown.position.y=0; L.mesh.add(drop,crown);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 D0=${v3(D0)};const vec3 G=${v3(G)};
  vec3 dp(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return vec3(D0.x+(G.x-D0.x)*k,D0.y+(G.y-D0.y)*k+${f(4*HA)}*k*(1.-k),D0.z+(G.z-D0.z)*k);}`;
  // condensación: humedad del aire que converge en la gota
  a.count+=points(L.part,90,C+`void main(){float s=aSeed.x*(TL-.15);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*3.;vec3 p=D0+vec3(cos(an),sin(an)*.8,sin(an)*.5)*.75*(1.-k*k)+rnd()*.03;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // estela: gotitas que se desprenden y caen, y bruma fina
  a.count+=points(L.trail,80,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dp(s)+rnd()*.05+vec3(0.,-4.5*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,WDROP_FS,NB);
  a.count+=points(L.trail,110,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.22+aSeed.y*.15;float age=(uT-s)/life;
   vec3 p=dp(s)+rnd()*.07;vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,(.05+.05*aSeed.w)*(1.-age*.5));}`);
  // estallido: gotas en corona, espuma, bruma y chispas
  a.count+=points(L.part,160,C+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.+1.5*aSeed.w),2.+2.8*aSeed.y,sin(an)*(1.+1.5*aSeed.w));vec3 p=G+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.06+.06*aSeed.w);}`,WDROP_FS,NB);
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.08;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=G+vec3(cos(an),0.,sin(an))*(.25+.75*(1.-exp(-t*4.)))+vec3(0.,.05+.1*aSeed.w,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.85:0.;put(p,(.16+.12*aSeed.w)*(.6+age*.6));}`,FOAM_FS,NB);
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.1;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,1.,0.));vec3 p=G+d*(.2+.7*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.45:0.;put(p,(.3+.25*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.8,.92,1.)"),NB);
  a.count+=sparks(L.part,50,TI,`${f(G.x)},.1,${f(G.z)}`,"0.,1.2,0.",2,5.5,2.5);
  // charco resbaladizo centrado bajo el rival: reflejo, ondas y un brillo que lo recorre
  const pud=gp(3,3.4,0,fx(CAUS+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float R=uP*(.82+.08*noise(vec3(an*3.,1.,4.)));float in_=smoothstep(R,R-.04,r);
   float c=caus(vec3(p*6.,uT*.6));float rip=.5+.5*sin(r*40.-uT*8.);
   float sheen=smoothstep(.08,0.,abs(p.x*.8+p.y-mod(uT*.8,2.)+1.))*in_;
   gl_FragColor=vec4(mix(uC2,uC1,c*.6+.3)*1.2+vec3(1.)*sheen*.8,(in_*(.25+.35*c+.08*rip)+band(r,R,.03)*.8+sheen*.5)*uA);}`),0.02);
  const rip=gp(3.8,3.4,0,fx(RIPPLE_FS),0.03);
  L.decal.add(pud,rip);

  const dv=V3(0,0,0), dq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    dpos(te,dv); dpos(te+0.01,dq).sub(dpos(te-0.01,tmp));
    drop.position.copy(dv); drop.visible=te<TI;
    const sp=te>=TL?Math.min(dq.length()/0.02/14,1):0;
    drop.rotation.z=Math.atan2(dq.y,dq.x); drop.scale.set((1+0.6*sp)*ss(0,TL,te),(1-0.2*sp)*ss(0,TL,te),(1-0.2*sp)*ss(0,TL,te));
    drop.scale.set(Math.max(drop.scale.x,0.001),Math.max(drop.scale.y,0.001),Math.max(drop.scale.z,0.001)); set(drop,0,ss(0.05,0.2,te));
    const cp=cl(ia/0.6); crown.visible=ia>=0&&cp<1; crown.scale.set(0.6+1.1*cp,0.4+1.2*Math.sin(Math.PI*Math.min(cp*1.3,1)),0.6+1.1*cp); set(crown,cp,1-cp*cp);
    set(pud,ss(TI,TI+0.35,te),ia>=0?1-ss(TE,2.08,te):0); set(rip,cl(ia/0.9),ia>=0?1-cl(ia/0.9)*0.5:0);
    caster.rotation.z=0.08*ss(0,TL,te)-0.18*ss(TL,TL+0.08,te)+0.1*ss(TL+0.1,TL+0.5,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*ss(0,TL,te)*(1-ss(TL,TL+0.2,te));
    // el rival recibe la salpicadura y patina en el charco
    const hit=hitK(ia,4), sl=ss(TI+0.08,TI+0.55,te)*(1-ss(1.6,2.05,te));
    target.position.x=3.4+hit*0.15+0.22*sl*Math.sin(Math.max(ia,0)*7)*Math.exp(-Math.max(ia,0)*1.2);
    target.rotation.z=-hit*0.18*Math.cos(ia*13)+0.2*sl*Math.sin(Math.max(ia,0)*9)*Math.exp(-Math.max(ia,0)*1.5);
    if(te<TI){o.g.copy(dv);o.gs=0.8+0.4*sp;o.ga=0.3;o.li=2;}
    else{o.g.set(G.x,0.5,G.z);o.gs=1.5+2.2*Math.min(ia,0.4);o.ga=0.6*hitK(ia,8);o.li=6*hitK(ia,5);}
    o.ia=ia;o.c.set(G.x,0.4,G.z);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 3 · SLEEPLESS (2 PA) — una marea constante sube y baja alrededor del Axie (inmunidad); de sus ojos brotan dos
//     pupilas de luz y una onda hipnótica de anillos aturde al rival, que se tambalea entre burbujas
// =====================================================================
const sleepless={key:"qjSleepless",name:"Sleepless",pa:2,dur:2.3,ti:0.9,pal:"Arcano",
  phases:[["Marea",0],["Pupilas",0.3],["Onda",0.6],["Impacto",0.9],["Aturdido",1.15],["Fin",1.95]],
build(a){
  const L=a.L,TP=0.3,TW=0.6,TI=0.9,TE=1.95,HX=-3.7,NW=5;
  // aura de marea: cilindro de agua cuyo nivel sube y baja con una cresta ondulada
  const tide=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.66,1.6,40,1,true).translate(0,0.8,0),fx(CAUS+`
  void main(){float an=atan(vP.z,vP.x);float lv=.42+.18*sin(uT*2.4)+.06*sin(an*3.+uT*5.)+.03*sin(an*7.-uT*7.);
   float h=vP.y;if(h>lv)discard;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float c=caus(vec3(an*2.,h*4.-uT*.8,uT*.6));float crest=smoothstep(.06,0.,lv-h);
   gl_FragColor=vec4(mix(uC2,uC1,c*.6+crest)*1.3+vec3(1.)*crest*.5,((.1+.45*fr)*(.5+.6*c)+crest)*uA);}`));
  tide.position.set(HX,0,0); L.mesh.add(tide);
  const pup=EYES.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.8),fxU(FLARE_FS,{uQ:{value:1}},{depthTest:false}));L.mesh.add(m);return m;});
  // onda hipnótica: anillos en espiral que viajan de los ojos a la cabeza del rival
  const WAVE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=band(fract(r*2.2-an/6.2832-uT*2.),.5,.12)*smoothstep(1.,.6,r)*smoothstep(.2,.45,r);
   float ring=band(r,.85,.06);gl_FragColor=vec4(mix(uC2,uC1,ring+sp*.5)*1.5,(ring+sp*.45)*uA);}`;
  const waves=[];for(let i=0;i<NW;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(WAVE_FS));L.trail.add(m);waves.push(m);}
  const WT=i=>[TW+i*0.06,TI+i*0.06];
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS));L.mesh.add(hitRing);

  const C=`const float TP=${f(TP)};const float TW=${f(TW)};const float TI=${f(TI)};const float HX=${f(HX)};const vec3 EYE=${v3(EYE)};const vec3 TH=${v3(TH)};`;
  // marea: gotas que saltan de la cresta y burbujas que suben dentro (en bucle)
  a.count+=points(L.part,60,C+`void main(){float life=.45+aSeed.y*.3;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float t=age*life;float lv=.42+.18*sin((uT-t)*2.4);
   vec3 p=vec3(HX+cos(an)*(.64+.5*t),lv+(1.2+r.y)*t-4.5*t*t,sin(an)*(.64+.5*t));
   vA=(p.y>0.)?(1.-age)*uE:0.;put(p,.04+.04*r.z);}`,WDROP_FS,NB);
  a.count+=points(L.part,60,C+`void main(){float life=.8+aSeed.y*.4;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.62*sqrt(r.y);vec3 p=vec3(HX+cos(an)*rad,.05+age*.55,sin(an)*rad);
   vA=sin(age*3.14159)*uE;put(p,.04+.05*r.z);}`,BUBBLE_FS);
  // pupilas: chispitas de luz que convergen en los ojos
  a.count+=points(L.part,40,C+`void main(){float s=TP-.12+aSeed.x*.3;float life=.18;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=EYE+vec3(0.,0.,aSeed.y<.5?.1:-.1);vec3 p=mix(e+normalize(rnd()+.001)*.45,e,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.025+.025*aSeed.z);}`);
  // motas que siguen la onda
  a.count+=points(L.trail,120,C+`void main(){float s=TW+aSeed.x*.35;float k=clamp((uT-s)/.3,0.,1.);
   float an=aSeed.y*6.2832+k*8.;float rad=.15+.25*k;vec3 p=mix(EYE,TH,k)+vec3(0.,sin(an)*rad,cos(an)*rad);
   vA=(uT>s&&k<1.)?sin(k*3.14159):0.;put(p,.03+.03*aSeed.w);}`);
  // impacto y aturdimiento: bruma, chispas y un corro de burbujas que gira inclinado sobre la cabeza
  a.count+=sparks(L.part,50,TI,`${f(TH.x)},${f(TH.y)},0.`,"-.3,.4,0.",2,5,2);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.1;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=TH+normalize(rnd()+.001)*(.2+.6*aSeed.z)*(1.-exp(-t*4.));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.5:0.;put(p,(.26+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.75,.8,1.)"),NB);
  a.count+=points(L.part,80,C+`void main(){float an=aSeed.x*6.2832+uT*(2.2+aSeed.y*.6);float rad=.38+.08*aSeed.z;
   vec3 q=vec3(cos(an)*rad,0.,sin(an)*rad);q.y=q.x*.28+(aSeed.w-.5)*.06;
   vec3 p=TH+vec3(0.,.38,0.)+q;vA=uE;put(p,(.06+.07*aSeed.w)*uE);}`,BUBBLE_FS);
  // suelo: charco de marea bajo el lanzador (anillos lentos en bucle) y onda bajo el rival
  const pool=gp(2.4,HX,0,fx(CAUS+`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float c=caus(vec3(p*6.,uT*.7));
   float rings=band(fract(r*1.5-uT*.6),.5,.08)*smoothstep(1.,.5,r);
   gl_FragColor=vec4(mix(uC2,uC1,c)*1.3,(smoothstep(1.,.55,r)*(.12+.3*c)+rings*.5)*uA);}`),0.02);
  const shock=gp(3.2,3.4,0,fx(RING_FS),0.03);
  L.decal.add(pool,shock);

  a.pose=function(te,o){
    const ia=te-TI, aura=ss(0,0.3,te)*(1-ss(2.0,2.28,te));
    tide.visible=aura>0.001; set(tide,0,aura*0.9); pool.material.uniforms.uA.value=aura*0.8; U.uE.value=aura;
    pup.forEach((m,i)=>{towardCam(m.position,EYES[i],0.15);billboard(m);const e=ss(TP,TP+0.15,te)*(1-ss(TI,TI+0.35,te));
      m.visible=e>0.001;m.scale.setScalar(0.5+0.35*e+0.2*Math.sin(te*25)*e);m.material.uniforms.uQ.value=1.2;set(m,0,e*1.2);});
    waves.forEach((m,i)=>{const [t0,t1]=WT(i),k=(te-t0)/(t1-t0);m.visible=k>=0&&k<1;
      towardCam(m.position,tmp.lerpVectors(EYE,TH,cl(k)),0.2);billboard(m,te*2);m.scale.setScalar(0.35+0.75*cl(k));set(m,cl(k),Math.sin(Math.PI*cl(k))*(1-i*0.12));});
    let p=cl(ia/0.4); towardCam(hitRing.position,TH,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.12*aura+0.3*ss(TP,TP+0.15,te)*(1-ss(TI,TI+0.3,te));
    caster.position.y=0.03*Math.sin(te*2.4)*aura;
    // aturdido: el rival se tambalea despacio
    const dz=ss(TI,TI+0.2,te)*(1-ss(TE-0.2,2.25,te)), hit=hitK(ia,5);
    target.rotation.z=-hit*0.15*Math.cos(ia*13)+0.12*dz*Math.sin(Math.max(ia,0)*3.2); target.position.x=3.4+hit*0.15;
    if(te<TP){o.g.set(HX,0.6,0);o.gs=1.2;o.ga=0.2*aura;o.li=1.2;}
    else if(te<TW){o.g.copy(EYE);o.gs=0.9;o.ga=0.35;o.li=2;}
    else if(te<TI){o.g.lerpVectors(EYE,TH,cl((te-TW)/(TI-TW)));o.gs=1.1;o.ga=0.35;o.li=2.5;}
    else{o.g.copy(TH);o.gs=1.4+2*Math.min(ia,0.4);o.ga=0.55*hitK(ia,8)+0.08*dz;o.li=5*hitK(ia,5)+0.8*dz;}
    o.ia=ia;o.c.copy(TH);o.shake=0;o.dist=0.65;
  };
}};

// =====================================================================
// 4 · TELESCOPE (1 PA) — el foco se ajusta en los ojos y salen tres pulsos de sonar en abanico: la niebla baja
//     se disipa al paso del frente y las casillas reveladas se iluminan un instante (+alcance)
// =====================================================================
const telescope={key:"qjTelescope",name:"Telescope",pa:1,dur:1.3,ti:0.38,pal:"Menta",
  phases:[["Foco",0],["Sonar",0.18],["Pulso",0.38],["Revelado",0.6],["Fin",1.05]],
build(a){
  const L=a.L,PT=[0.18,0.28,0.38],SPD=13,TI=0.38,FW=8.6,FH=4.2,TE=1.05;
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fxU(FLARE_FS,{uQ:{value:0}},{depthTest:false}));L.mesh.add(lens);
  // abanico vertical del sonar en el plano XY (de cara a la cámara): cuña tenue y frentes en arco
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(FW,FH),fx(`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(${f(FW)},${f(FH)});
   float r=length(p);float an=atan(p.y,p.x+1e-4);float w=.3;float inw=smoothstep(w,w-.06,abs(an+.05));
   float arcs=0.;${PT.map((t,i)=>`{float R=(uT-${f(t)})*${f(SPD)};arcs+=band(r,R,.07+.03*R*.1)*step(0.,R)*smoothstep(${f(FW)},${f(FW*0.6)},R)*${i===2?"1.4":".8"};}`).join("")}
   float tick=step(.85,fract(r*2.5))*.12;float fill=(.05+tick)*smoothstep(${f(FW)},1.,r);
   gl_FragColor=vec4(mix(uC2,uC1,arcs)*1.5+vec3(1.)*arcs*.3,(arcs+fill)*inw*smoothstep(0.,.3,r)*uA);}`));
  fan.position.set(EYE.x,EYE.y,0); L.trail.add(fan);
  // casillas reveladas: la cuadrícula del suelo se enciende al pasar el frente y se apaga
  const tiles=groundPlane(FW,EYE.x+FW/2,0.02,fx(`void main(){vec2 w=vec2(${f(EYE.x)}+vUv.x*${f(FW)},(vUv.y-.5)*3.);
   float r=vUv.x*${f(FW)};float since=uT-${f(TI)}-r/${f(SPD)};
   vec2 g=abs(fract(w+.5)-.5);float line=smoothstep(.04,0.,min(g.x,g.y));
   float cone=smoothstep(.3*r+.4,.3*r,abs(w.y));float lit=step(0.,since)*exp(-max(since,0.)*3.)+step(0.,since)*.15;
   float front=band(since,0.,.04);
   gl_FragColor=vec4(mix(uC2,uC1,front+line*.5)*1.4,(line*.8+front*.6+.06)*lit*cone*uA);}`),3);
  L.decal.add(tiles);

  const C=`const float TI=${f(TI)};const vec3 EYE=${v3(EYE)};const float SPD=${f(SPD)};`;
  // niebla baja que se disipa detrás del frente del sonar
  a.count+=points(L.part,110,C+`void main(){vec3 p=vec3(-2.6+aSeed.x*8.,.12+aSeed.y*.45,(aSeed.z-.5)*3.2)+vec3(sin(uT*.8+aSeed.w*9.)*.15,0.,0.);
   float front=EYE.x+(uT-TI)*SPD;float clr=smoothstep(-.2,.6,p.x-front);
   vA=smoothstep(0.,.15,uT)*clr*(1.-smoothstep(1.,1.3,uT))*.45;put(p,(.5+.4*aSeed.w));}`,SMOKE_FS("vec3(.55,.66,.7)"),NB);
  // foco: chispas que se cierran sobre los ojos
  a.count+=points(L.part,30,C+`void main(){float s=aSeed.x*.14;float life=.14;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(EYE+normalize(rnd()+.001)*.4,EYE,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.025+.025*aSeed.z);}`);
  // motas que cabalgan los frentes de onda
  a.count+=points(L.part,80,C+`void main(){float i=floor(aSeed.x*2.999);float t0=.18+i*.1;float R=(uT-t0)*SPD;
   float an=(aSeed.y-.5)*.55-.05;vec3 p=EYE+vec3(cos(an)*R,sin(an)*R,(aSeed.z-.5)*.3);
   vA=(R>0.&&R<7.5&&p.y>0.)?(1.-R/7.5)*(i>1.5?1.:.6):0.;put(p,.04+.03*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, on=ss(PT[0]-0.02,PT[0]+0.04,te)*(1-ss(0.8,TE,te));
    towardCam(lens.position,EYE,0.15); billboard(lens,te*3); lens.visible=te<0.7; lens.scale.setScalar(0.3+0.5*ss(0,0.18,te)+0.3*hitK(ia,8));
    set(lens,0,ss(0,0.12,te)*(1-ss(0.4,0.7,te))*(1+0.6*Math.sin(te*40)*(1-ss(0,0.18,te))));
    fan.visible=on>0.001; set(fan,0,on); set(tiles,0,on*0.9);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*ss(0,0.18,te)*(1-ss(0.5,0.9,te));
    // el frente alcanza al rival: un eco breve lo delinea
    const ec=te-TI-(3.4-EYE.x)/SPD; o.em=ec>=0?0.45*Math.exp(-ec*7):0; o.emc.copy(U.uC1.value);
    if(te<PT[0]){o.g.copy(EYE);o.gs=0.6;o.ga=0.3;o.li=1.2;}
    else{const R=Math.min((te-PT[0])*SPD,7);o.g.set(EYE.x+R,EYE.y,0);o.gs=1;o.ga=0.25*on;o.li=2*on;}
    o.ia=ia;o.c.copy(EYE);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 5 · BABY (3 PA) — un pequeño axolote etéreo de agua nace sobre la cabeza, nada en espiral ascendente dejando
//     burbujas y se zambulle sobre el Axie, estallando en un gran escudo burbuja (fractura bajo el Axie)
// =====================================================================
const baby={key:"qjBaby",name:"Baby",pa:3,dur:3.3,ti:1.45,pal:"Loto",
  phases:[["Llamada",0],["Espíritu",0.3],["Espiral",0.5],["Zambullida",1.2],["Burbuja",1.45],["Escudo",1.9],["Fin",2.85]],
build(a){
  const L=a.L,TS=0.3,TD=1.2,TI=1.45,TX=2.85,TE=3.25,HX=-3.7,SC=V3(HX,0.95,0),RS=1.25,RR=0.8,Y0=2.05,Y1=3.25,TURN=1.75;
  const spos=(te,o)=>{if(te<TD){const k=cl((te-TS)/(TD-TS)),th=-1.2+Math.PI*2*TURN*k,r=RR*(0.6+0.4*Math.min(k*3,1));
      return o.set(HX+Math.cos(th)*r,Y0+(Y1-Y0)*k,Math.sin(th)*r);}
    const k=cl((te-TD)/(TI-TD)),th=-1.2+Math.PI*2*TURN;tmp2.set(HX+Math.cos(th)*RR,Y1,Math.sin(th)*RR);
    return o.set(tmp2.x+(HX-tmp2.x)*k,Y1+(1.7-Y1)*k*k+0.35*Math.sin(Math.PI*k),tmp2.z*(1-k));};
  // espíritu de axolote (SDF en billboard): cabeza redonda, branquias en abanico, cuerpo y cola ondulante
  const spirit=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.56),fx(`
  float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
  void main(){vec2 p=(vUv-.5)*vec2(2.,1.4);float wg=sin(uT*14.-p.x*5.)*.06*smoothstep(.1,-.8,p.x);p.y+=wg;
   float head=length((p-vec2(.42,.05))*vec2(1.,1.15))-.27;
   float body=sdSeg(p,vec2(.3,0.),vec2(-.35,-.02))-.15;
   float tail=sdSeg(p,vec2(-.35,-.02),vec2(-.92,.04))-(.09*smoothstep(-.95,-.35,p.x)+.01);
   float d=min(min(head,body),tail);
   float gills=1e3;for(int i=0;i<3;i++){float fi=float(i);float an=.7+fi*.45;vec2 b=vec2(.3,.18)+vec2(-cos(an),sin(an))*.05;
    gills=min(gills,sdSeg(p,b,b+vec2(-cos(an),sin(an))*.24)-.035);
    vec2 b2=vec2(.3,-.08);gills=min(gills,sdSeg(p,b2,b2+vec2(-cos(an-.2),-sin(an+.1))*.18)-.03);}
   float legs=min(sdSeg(p,vec2(.18,-.1),vec2(.12,-.32))-.035,sdSeg(p,vec2(-.22,-.1),vec2(-.3,-.3))-.035);
   d=min(d,legs);float all_=min(d,gills);
   float n=noise(vec3(p*6.,uT*2.));float fill=smoothstep(.02,-.02,all_);float rim=band(all_,0.,.035);
   float g=smoothstep(.03,-.03,gills)*(.6+.4*sin(uT*9.+p.y*20.));
   float eye=smoothstep(.04,.02,length(p-vec2(.52,.1)));
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.3+vec3(1.)*(rim*.6+g*.4+eye*.8),(fill*(.3+.35*n)+rim+g*.5+smoothstep(.25,0.,all_)*.15)*uA);}`,{depthTest:false}));
  L.mesh.add(spirit);
  // escudo burbuja: película irisada con anillos de agua que lo recorren desde el polo (uP = onda del impacto)
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(CAUS+`
  void main(){vec3 n=normalize(vN),v=normalize(vV),q=normalize(vP);float fr=1.-abs(dot(n,v));
   float th=noise(q*2.5+vec3(0.,uT*.4,0.));vec3 film=.55+.45*cos(6.2832*(fr*1.2+th+vec3(0.,.33,.67)));
   float c=caus(q*5.+vec3(0.,-uT*.5,uT*.3));float wave=band(acos(clamp(q.y,-1.,1.))/3.1416,uP,.06)*step(.001,uP)*step(uP,.99);
   float sp=pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.4,.6,.7)))),36.);
   vec3 col=mix(uC1,film,.45)*(.3+1.3*pow(fr,1.7))+uC1*c*.25+vec3(1.)*(sp*1.5+wave*.8);
   gl_FragColor=vec4(col,(pow(fr,2.)*.75+.04+c*.06+wave+sp)*uA);}`));
  shield.position.copy(SC); L.mesh.add(shield);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),fx(RING_FS));L.mesh.add(hitRing);

  const C=`const float TS=${f(TS)};const float TD=${f(TD)};const float TI=${f(TI)};const float HX=${f(HX)};const vec3 SC=${v3(SC)};
  vec3 sp(float t){float k=clamp((t-TS)/(TD-TS),0.,1.);float th=-1.2+${f(Math.PI*2*TURN)}*k;float r=${f(RR)}*(.6+.4*min(k*3.,1.));
   return vec3(HX+cos(th)*r,${f(Y0)}+${f(Y1-Y0)}*k,sin(th)*r);}`;
  // llamada: remolino de agua que se cierra sobre la cabeza
  a.count+=points(L.part,80,C+`void main(){float s=aSeed.x*(TS-.05);float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*6.;vec3 p=vec3(HX,${f(Y0)},0.)+vec3(cos(an),(aSeed.z-.5)*.4,sin(an))*.9*(1.-k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.w);}`);
  // estela de la espiral: burbujas y motas de luz
  a.count+=points(L.trail,130,C+`void main(){float s=TS+aSeed.x*(TD-TS);float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=sp(s)+rnd()*.06+vec3(sin(t*5.+aSeed.w*6.)*.04,.3*t,0.);vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.04+.06*aSeed.w);}`,BUBBLE_FS);
  a.count+=points(L.trail,90,C+`void main(){float s=TS+aSeed.x*(TD-TS);float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=sp(s)+rnd()*.05;vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.03*aSeed.w)*(1.-age*.4));}`);
  // estallido del escudo: gotas, espuma en anillo, chispas y destellos
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.5,0.))*(2.5+4.5*aSeed.z);vec3 p=SC+normalize(v)*1.1+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.07+.07*aSeed.w);}`,WDROP_FS,NB);
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.08;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(HX,.05+.12*aSeed.w,0.)+vec3(cos(an),0.,sin(an))*(1.1+1.4*(1.-exp(-t*3.)));
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.2+.16*aSeed.w)*(.6+age*.6));}`,FOAM_FS,NB);
  a.count+=sparks(L.part,200,TI,`${f(HX)},1.7,0.`,"0.,.2,0.",3,10,2.5);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.1;float life=.5+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=SC+normalize(rnd()+.001)*${f(RS)};vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.16+.12*aSeed.w));}`,STAR4_FS);
  // escudo activo: burbujas que suben dentro y destellos que recorren la película
  a.count+=points(L.part,90,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=sqrt(r.y)*.85;vec3 p=vec3(HX+cos(an)*rad,.1+age*1.9,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.05+.07*r.z);}`,BUBBLE_FS);
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*(.5+.5*aSeed.y);float el=(aSeed.z-.4)*2.4;
   vec3 p=SC+vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el))*${f(RS)};vA=uE*(.5+.5*sin(uT*6.+aSeed.w*20.));put(p,(.03+.04*aSeed.w)*uE);}`,STAR4_FS);
  // suelo bajo el Axie: fractura de baldosa (nivel 3), onda de choque y anillo de marea mientras dura el escudo
  const FS=5.6, frac=groundPlane(FS,HX,0.025,fx(tileFractureFS(FS)));
  const shock=groundPlane(5.2,HX,0.03,fx(RING_FS));
  const ringG=groundPlane(3,HX,0.02,fx(RIPPLE_FS));
  L.decal.add(frac,shock,ringG);

  const sv=V3(0,0,0), sq=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    spos(te,sv); spos(te+0.01,sq).sub(spos(te-0.01,tmp));
    // dirección en pantalla: el billboard se voltea según vaya a izquierda o derecha
    tmp.copy(camera.position).sub(sv); const right=sq.x*tmp.z-sq.z*tmp.x>0?1:-1;
    const sa=ss(TS,TS+0.15,te)*(te<TI?1:0);
    towardCam(spirit.position,sv,0.1); billboard(spirit,te>=TD?-1.1*right*ss(TD,TD+0.1,te):Math.atan2(sq.y,Math.abs(sq.x)+Math.abs(sq.z))*right*0.6);
    spirit.visible=sa>0.001; spirit.scale.set(right*(0.7+0.3*ss(TS,TS+0.2,te)),0.7+0.3*ss(TS,TS+0.2,te),1); set(spirit,0,sa*(0.85+0.15*Math.sin(te*12)));
    // escudo: nace del estallido con rebote y se queda hasta el final
    const sh=ia>=0?RS*(1-Math.exp(-ia*5)*Math.cos(ia*13)):0, env=ia>=0?1-ss(TX,TE,te):0;
    shield.visible=env>0.001; shield.scale.setScalar(Math.max(sh,0.001)); set(shield,cl(ia/0.6),env*(0.75+0.5*hitK(ia,5)));
    U.uE.value=ss(TI,TI+0.3,te)*(1-ss(TX,TE,te));
    let p=cl(ia/0.4); towardCam(hitRing.position,tmp.set(HX,1.6,0),0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.75); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,TI+1.8,te):0);
    set(ringG,(te*0.6)%1,U.uE.value*0.6);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*ss(0,TS,te)*(1-ss(TS,TD,te))+0.9*hitK(ia,4)+0.15*U.uE.value;
    const land=hitK(ia,9); caster.scale.set(1+0.1*land,1-0.14*land,1+0.1*land); caster.rotation.z=0.05*Math.sin(te*3)*ss(TS,TD,te);
    if(te<TS){o.g.set(HX,Y0,0);o.gs=1.1*ss(0,TS,te);o.ga=0.3;o.li=2;}
    else if(te<TI){o.g.copy(sv);o.gs=1.3;o.ga=0.4;o.li=3.5;}
    else{o.g.set(HX,1.5,0);o.gs=2.4+5*Math.min(ia,0.5);o.ga=0.9*hitK(ia,8)+0.12*U.uE.value;o.li=12*hitK(ia,4.5)+2*U.uE.value;}
    o.ia=ia;o.c.set(HX,1.2,0);o.shake=1.5;o.dist=1.2;o.flash=0;
  };
}};

VFX.module("Acuático · Ojos",[clear,gero,sleepless,telescope,baby]);
})();

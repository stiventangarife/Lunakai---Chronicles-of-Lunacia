// =====================================================================
// MÓDULO · CLASE BICHO (OREJAS)
// Estética de insecto: quitina iridiscente, enjambres, seda, baba, gases sulfúricos. No se dibujan orejas:
// los efectos nacen de su posición (≈ x −3.72, y 1.82, z ±0.26) sin malla anatómica.
// Niveles por PA: Termite y Larva (1) rápidos y pequeños; Earwing, Leaf Bug, Tassels, Brimstone, Beetle Spike (2)
// sin fractura de suelo; Ear Breathing (3) pesado, con temblor y fractura de baldosa bajo el rival.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,camera,caster,target,allies,ALLY_POS,enemies,ENEMY_POS,helixGeo}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,tileFractureFS}=VFX.lib;
VFX.palette("Élitro",["#d2c4ff","#167a8a"]);              // iridiscencia de élitro: lavanda → verde azulado profundo

const TC=V3(3.15,1.2,0);                                    // pecho del objetivo
const EAR=[V3(-3.72,1.82,0.26),V3(-3.72,1.82,-0.26)], EM=V3(-3.7,1.86,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const glowOf=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
// celda hexagonal: x = distancia al centro (0 centro … .5 borde), yz = id de la celda
const HEX=`vec3 hexCell(vec2 p){vec2 s=vec2(1.,1.732);vec2 a=mod(p,s)-s*.5;vec2 b=mod(p-s*.5,s)-s*.5;vec2 g=dot(a,a)<dot(b,b)?a:b;
 vec2 q=abs(g);return vec3(max(dot(q,vec2(.5,.866)),q.x),p-g);}`;
// quemadura suave (nivel 2): mancha sin grietas
const SOFTBURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;

// ---------- fragmentos de partícula del módulo ----------
// sprite girado: vR = ángulo en pantalla de la cabeza (+x local)
const ROTQ=`vec2 q=gl_PointCoord-.5;q.y=-q.y;float cr=cos(vR),sr=sin(vR);q=vec2(cr*q.x+sr*q.y,-sr*q.x+cr*q.y);`;
// termita: abdomen pálido segmentado, tórax y cabeza ámbar, mandíbulas y patas (mezcla normal)
const TERMITE_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){${ROTQ}
 float ab=length((q-vec2(-.13,0.))*vec2(1.,1.7))-.17;
 float th=length((q-vec2(.08,0.))*vec2(1.2,1.5))-.075;
 float hd=length(q-vec2(.2,0.))-.08;
 float mx=length(vec2(q.x-.3,abs(q.y)-.035)*vec2(1.,2.4))-.04;
 float lg=max(abs(abs(q.y)-.13-.04*sin(q.x*30.+vMix*40.))-.012,abs(q.x-.02)-.12);
 float d=min(min(ab,th),min(min(hd,mx),lg));
 float a=smoothstep(.02,-.01,d)*vA;if(a<.003)discard;
 vec3 c=ab<0.?vec3(.95,.82,.6)*(.75+.25*sin(q.x*55.)):vec3(.5,.27,.1);
 gl_FragColor=vec4(mix(c,uC1,.2)+uC1*smoothstep(-.035,.01,d)*.9,a);}`;
// gota de baba brillante (mezcla normal)
const GOO_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q*vec2(1.,1.+.35*vMix));
 float a=smoothstep(.42,.32,d+.07*noise(vec3(q*8.,vMix*9.)))*vA;if(a<.003)discard;
 float hl=smoothstep(.12,0.,length(q-vec2(-.1,-.12)));
 gl_FragColor=vec4(mix(uC2*.6,uC1,.35+.6*(1.-d*2.))+vec3(1.)*hl*.7,a);}`;
// larva curvada en C: cinco segmentos, cabeza oscura (mezcla normal)
const LARVA_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){${ROTQ}
 float d=9.,id=0.;for(int i=0;i<5;i++){float fi=float(i);float aa=1.7-fi*.78;vec2 c=vec2(cos(aa),sin(aa))*.2;float di=length(q-c)-(.115-fi*.013);if(di<d){d=di;id=fi;}}
 float a=smoothstep(.015,-.01,d)*vA;if(a<.003)discard;
 vec3 c=id<.5?vec3(.5,.3,.16):vec3(1.,.95,.82)*(.82+.18*cos(id*2.6));
 gl_FragColor=vec4(mix(c,uC1,.25)+uC1*smoothstep(-.03,.012,d)*.7,a);}`;
// hoja que gira (vMix = ángulo)
const LEAF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=max(.4*(1.-q.x*q.x*3.9),.001);float d=abs(q.y)*1.8/w;
 float a=smoothstep(1.,.7,d)*step(abs(q.x),.49)*vA;if(a<.003)discard;
 float rib=smoothstep(.05,0.,abs(q.y))*step(-.4,q.x);
 vec3 c0=mix(vec3(.16,.42,.1),vec3(.5,.8,.25),.5+q.x);
 gl_FragColor=vec4(mix(c0,uC1,.25)*(1.1-d*.3)+vec3(.5,.6,.25)*rib*.35,a);}`;
// esquirla de hielo (azul pálido fijo: indica el debuff de frío que se limpia)
const ICE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.7+q.y;float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.55,.8,1.),vec3(.95,1.,1.),smoothstep(.3,0.,d))*1.3,a);}`;
// gota de sangre (rojo fijo: sangrado)
const BLOOD_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.3,.24,d)*vA;if(a<.003)discard;float hl=smoothstep(.08,0.,length(q-vec2(-.07,0.)));
 gl_FragColor=vec4(vec3(.62,.02,.06)*(1.1-d)+vec3(1.,.6,.6)*hl*.6,a);}`;

// =====================================================================
// 1 · EARWING — las orejas zumban a alta frecuencia: discos de resonancia, un cono de frentes sónicos que
//     astilla el escudo del rival (cae ~20 % de sus celdas) y una barrera de onda estacionaria ante el Axie (nivel 2)
// =====================================================================
const earwing={key:"ioEarwing",name:"Earwing",pa:2,dur:2.0,ti:0.62,pal:"Élitro",
  phases:[["Zumbido",0],["Onda sónica",0.4],["Impacto",0.62],["Barrera",0.82],["Disipación",1.5]],
build(a){
  const L=a.L,TB=0.4,TI=0.62,TW=0.82,TF=1.5,TE=1.95,AP=V3(-3.5,1.8,0);
  const DIR=Math.atan2(TC.y-AP.y,TC.x-AP.x), LEN=AP.distanceTo(TC)+0.4, HA=0.2;
  // discos de resonancia: franjas concéntricas que vibran sobre cada oreja
  const discMat=fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float fr=.5+.5*sin(r*34.-uT*95.);float st=.55+.45*sin(an*2.+uT*150.);
   float m=pow(fr,3.)*st*smoothstep(1.,.3,r)*smoothstep(.05,.2,r);float core=smoothstep(.3,0.,r);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.5+vec3(1.)*core*.4,(m*.8+core*.4)*uA);}`,{depthTest:false});
  const discs=EAR.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),discMat);L.mesh.add(m);return m;});
  // cono sónico en el plano vertical de la acción: frentes de onda en arco que avanzan hasta el rival
  const CW=7.6,CH=3.4,CX=AP.x+CW/2-0.15,CY=1.45;
  const coneM=new THREE.Mesh(new THREE.PlaneGeometry(CW,CH),fx(`void main(){vec2 q=vP.xy-vec2(${f(AP.x-CX)},${f(AP.y-CY)});
   float d=length(q);float an=atan(q.y,q.x)-(${f(DIR)});float fr=uP*${f(LEN)};
   float inC=smoothstep(${f(HA)},${f(HA*0.6)},abs(an))*step(.05,d);
   float wv=pow(.5+.5*sin(d*7.-uT*55.),5.)*step(d,fr);
   float head=band(d,fr,.25)*step(uP,.99);
   float edge=band(abs(an),${f(HA*0.9)},.012)*step(d,fr)*.5;
   float fade=smoothstep(${f(LEN)},${f(LEN*0.6)},d);float n=.7+.3*noise(vec3(d*3.,an*20.,uT*4.));
   gl_FragColor=vec4(mix(uC2,uC1,wv*.6+head)*1.5,((wv*.45+head*.9)*inC*n+edge)*fade*uA);}`));
  coneM.position.set(CX,CY,0); L.trail.add(coneM);
  // escudo hexagonal del rival: el impacto arranca ~20 % de las celdas (destello y fuera)
  const shell=new THREE.Mesh(new THREE.SphereGeometry(0.7,40,28),fxU(HEX+`uniform float uQ;
  void main(){vec3 q=normalize(vP);vec3 h=hexCell(vec2(atan(q.z,q.x)*2.6,q.y*4.5));float id=hash(vec3(h.yz,3.));
   float gone=step(id,.22)*step(.001,uQ);if(gone>.5&&uQ>.25)discard;
   float edge=smoothstep(.4,.5,h.x);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float flick=.6+.4*sin(uT*40.+id*30.);float hot=gone*smoothstep(.25,0.,uQ)*2.;
   gl_FragColor=vec4(mix(uC2,uC1,edge+hot)*1.3+vec3(1.)*hot*.5,(edge*.35*flick+fr*.3+hot)*uA);}`,{uQ:{value:0}}));
  shell.scale.set(1,1.4,1);
  // barrera sónica: media cúpula delante del Axie con líneas de onda estacionaria y un pulso que la recorre
  const barrier=new THREE.Mesh(new THREE.SphereGeometry(1,48,28,Math.PI-1.25,2.5),fx(`void main(){vec3 q=normalize(vP);
   float lines=pow(abs(sin(atan(q.z,q.x)*16.)*sin(uT*120.+q.y*5.)),10.);
   float rip=pow(.5+.5*sin(q.y*28.-uT*24.+sin(q.z*9.)*2.),4.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   float side=smoothstep(.98,.6,abs(q.z))*smoothstep(-.95,-.5,q.y);
   float pulse=band(length(q-vec3(1.,0.,0.)),uP*1.4,.12)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,lines+fr*.5+pulse)*1.4+vec3(1.)*pulse*.4,(lines*.5+rip*.12+fr*.55+pulse*.8)*side*uA);}`));
  barrier.position.set(-3.7,0.95,0); barrier.scale.set(1.05,1.25,1.05);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS));
  L.mesh.add(shell,barrier,hitRing);

  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const float TW=${f(TW)};const float TF=${f(TF)};const vec3 AP=${v3(AP)};`;
  // motas que vibran alrededor de las orejas
  a.count+=points(L.part,80,C+`void main(){vec3 e=vec3(-3.72,1.84,aSeed.x<.5?.26:-.26);
   vec3 p=e+normalize(rnd()+.001)*(.08+.22*aSeed.y)+vec3(sin(uT*120.+aSeed.z*40.),cos(uT*97.+aSeed.w*30.),0.)*.025;
   vA=smoothstep(0.,.12,uT)*(1.-smoothstep(TB,TB+.15,uT))*(.5+.5*sin(uT*60.+aSeed.w*50.));put(p,.03+.03*aSeed.z);}`);
  // partículas de sonido dentro del cono
  a.count+=points(L.part,220,C+`void main(){float s=TB+aSeed.x*.32;float life=.55;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=${f(DIR)}+(aSeed.y-.5)*${f(HA*1.8)};float el=(aSeed.z-.5)*.35;
   vec3 d=vec3(cos(an)*cos(el),sin(an),sin(el)*1.2);vec3 p=AP+d*t*(11.+4.*aSeed.w);
   vA=(age>0.&&age<1.&&p.x<3.6)?(1.-age)*.9:0.;put(p,(.03+.035*aSeed.w)*(1.+age));}`);
  // celdas del escudo que saltan
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.8,.3,0.));vec3 p=vec3(3.4,1.,0.)+d*.7+d*(1.5+2.5*aSeed.z)*t+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.06*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,70,TI,`${f(TC.x)},${f(TC.y)},0.`,".6,.3,0.",2.5,7,3);
  // motas que recorren la barrera
  a.count+=points(L.part,100,C+`void main(){float th=-1.2+2.4*aSeed.y;float y=(aSeed.z-.5)*1.8;float rx=sqrt(max(1.-y*y*.3,0.));
   vec3 p=vec3(-3.7,.95,0.)+vec3(cos(th)*rx*1.05,y,sin(th)*rx*1.05)+vec3(0.,sin(uT*9.+aSeed.w*20.)*.04,0.);
   float env=smoothstep(TW,TW+.15,uT)*(1.-smoothstep(TF,TF+.35,uT));
   vA=env*(.4+.6*pow(.5+.5*sin(uT*30.+aSeed.x*30.),4.));put(p,.03+.035*aSeed.w);}`);

  // suelo: abanico del cono (área) y ondas centradas en el rival y en el Axie
  const wedge=groundPlane(CW,CX,0.018,fx(`void main(){vec2 p=(vUv-.5)*vec2(${f(CW)},3.4);vec2 q=vec2(p.x-(${f(AP.x-CX)}),p.y);
   float d=length(q);float an=abs(atan(q.y,q.x));float fr=uP*${f(LEN)};
   float inC=smoothstep(.24,.2,an)*step(.3,d)*step(d,fr);float rings=pow(.5+.5*sin(d*7.-uT*55.),6.);
   float n=noise(vec3(p*3.,1.));
   gl_FragColor=vec4(mix(uC2,uC1,rings)*1.2,inC*(.12+.25*rings)*(.7+.3*n)*smoothstep(${f(LEN)},${f(LEN*0.5)},d)*uA);}`),3.4);
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS)), base=groundPlane(2.6,-3.7,0.03,fx(RING_FS));
  L.decal.add(wedge,shock,base);

  a.pose=function(te,o){
    const ia=te-TI, buzz=ss(0,0.12,te)*(1-ss(TB,TB+0.15,te)), wave=cl((te-TB)/(TI-TB+0.08));
    caster.position.y=0.012*Math.sin(te*170)*buzz;
    caster.rotation.z=-0.06*ss(0,TB,te)+0.1*ss(TB,TB+0.06,te)*(1-ss(TI,TI+0.4,te));
    discs.forEach((m,i)=>{towardCam(m.position,EAR[i],0.2);billboard(m,te*20);m.visible=buzz>0.002;m.scale.setScalar(0.6+0.4*buzz+0.05*Math.sin(te*80));set(m,0,buzz);});
    coneM.visible=te>=TB&&te<TI+0.45; set(coneM,wave,te>=TB?1-ss(TI+0.05,TI+0.4,te):0);
    set(wedge,wave,te>=TB?0.9*(1-ss(TI+0.1,TI+0.7,te)):0);
    const hit=hitK(ia,5), tx=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*25));
    target.position.x=tx; target.rotation.z=-hit*0.2*Math.cos(ia*18);
    shell.position.set(tx,1.0,0); shell.visible=te>TB-0.12&&te<TI+0.75;
    set(shell,0,ss(TB-0.12,TB+0.1,te)*(1-ss(TI+0.3,TI+0.75,te))*0.9); shell.material.uniforms.uQ.value=ia>=0?cl(ia/0.5):0;
    let p=cl(ia/0.3); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); shock.position.x=tx; set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    const bw=ss(TW,TW+0.18,te)*(1-ss(TF,TE,te));
    barrier.visible=bw>0.002; set(barrier,cl((te-TW)/0.45),bw);
    p=cl((te-TW)/0.5); set(base,p,te>=TW?(1-p)*0.8:0);
    if(te<TB){o.g.copy(EM);o.gs=0.2+0.9*buzz;o.ga=0.35*buzz;o.li=1.8*buzz;}
    else if(te<TI){o.g.set(AP.x+(TC.x-AP.x)*wave,AP.y+(TC.y-AP.y)*wave,0);o.gs=1.3;o.ga=0.45;o.li=3.5;}
    else if(te<TW){o.g.copy(TC);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*10)*0.6;o.li=6*Math.exp(-ia*5);}
    else{o.g.set(-2.75,1.1,0);o.gs=1.8;o.ga=0.25*bw;o.li=2.4*bw+6*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 2 · LEAF BUG — un insecto hoja brota entre hojas, salta a la espalda del Axie y se funde en un mosaico de
//     camuflaje que lo recubre; el mosaico se endurece en un escudo de nervaduras y un remolino de hojas
//     a ras de suelo marca la movilidad extra (nivel 2)
// =====================================================================
const leafbug={key:"ioLeafBug",name:"Leaf Bug",pa:2,dur:2.2,ti:0.7,pal:"Musgo",
  phases:[["Brote",0],["Salto",0.38],["Aterrizaje",0.7],["Camuflaje",0.85],["Escudo",1.25],["Fin",1.85]],
build(a){
  const L=a.L,TJ=0.38,TI=0.7,TC2=0.85,TS=1.25,TF=1.85,TE=2.15,CX=-3.7;
  const P0=V3(-2.35,0.06,0.55), P1=V3(-4.0,1.2,0.3), JH=1.3;
  const bugAt=(te,out)=>{if(te<TJ)return out.copy(P0);const k=cl((te-TJ)/(TI-TJ));return out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+4*JH*k*(1-k),P0.z+(P1.z-P0.z)*k);};
  // insecto hoja: cuerpo foliáceo aplanado (cara a cámara), lóbulos, patas y antenas finas; uQ lo disuelve en camuflaje
  const bugMat=fxU(`uniform float uQ;
  void main(){vec3 q=vP*vec3(3.,6.,6.);float rib=smoothstep(.08,0.,abs(vP.y)*6.);
   float vein=smoothstep(.12,0.,abs(fract(q.x*1.5+abs(q.y)*.8)-.5))*smoothstep(.0,.3,abs(q.y));
   float n=noise(q*2.)*.6+noise(q*5.)*.4;float dz=n-uQ*1.1+.05;if(dz<0.)discard;
   vec3 c=mix(vec3(.18,.42,.1),vec3(.52,.8,.26),n)*(1.-vein*.25)+vec3(.5,.7,.25)*rib*.4;
   float edge=smoothstep(.1,0.,dz)*step(.001,uQ);
   gl_FragColor=vec4(c*${LIT}+uC1*(edge*2.+uA*.35+rib*uA*.5),1.);}`,{uQ:{value:0}},DS);
  const bug=new THREE.Group(); L.mesh.add(bug);
  const sph=(sx,sy,sz,x,y,rz)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),bugMat);m.scale.set(sx,sy,sz);m.position.set(x,y,0);m.rotation.set(0,0,rz||0);bug.add(m);return m;};
  sph(0.3,0.1,0.025,0,0); sph(0.13,0.09,0.02,-0.1,0.08,0.5); sph(0.13,0.09,0.02,-0.1,-0.08,-0.5); sph(0.05,0.045,0.035,0.32,0);
  const limb=(pts,r)=>{bug.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>V3(p[0],p[1],p[2]))),10,r,5,false),bugMat));};
  for(const s of [-1,1]){
    for(const [x,dx] of [[0.14,0.12],[0.0,0.02],[-0.14,-0.1]])limb([[x,s*0.05,0],[x+dx*0.5,s*0.2,0.05],[x+dx,s*0.32,-0.02]],0.009);
    limb([[0.36,s*0.02,0],[0.5,s*0.1,0.03],[0.62,s*0.2,0]],0.005);
  }
  // mosaico de camuflaje sobre el cuerpo: celdas-hoja que se extienden desde el punto de aterrizaje
  const camoMat=fxU(HEX+`uniform float uQ;
  void main(){vec3 q=vP;vec3 h=hexCell(vec2(atan(q.z,q.x)*1.6,q.y*3.2));float id=hash(vec3(h.yz,5.));
   float d=length(q-vec3(-.32,1.2,.25));float rev=uP*2.6-d;if(rev<0.)discard;
   float leaf=smoothstep(.5,.3,h.x);float edge=smoothstep(.36,.48,h.x);float front=smoothstep(.2,0.,rev);
   vec3 c=mix(vec3(.14,.34,.09),vec3(.45,.7,.22),id)*(.75+.35*${LIT});
   gl_FragColor=vec4(c+uC1*(edge*(.4+1.6*uQ)+front*1.5),(leaf*.62+edge*(.35+.6*uQ)+front)*uA);}`,{uQ:{value:0}},NB);
  const camo=[new THREE.CylinderGeometry(0.45,0.5,1.3,40,1,true).translate(0,0.66,0),new THREE.SphereGeometry(0.34,32,20).translate(0,1.6,0)]
    .map(g=>{const m=new THREE.Mesh(g,camoMat);m.position.set(CX,0,0);L.mesh.add(m);return m;});
  // escudo: retícula de nervaduras con un barrido de savia
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(HEX+`void main(){vec3 q=normalize(vP);vec3 h=hexCell(vec2(atan(q.z,q.x)*2.,q.y*4.));
   float edge=smoothstep(.42,.5,h.x);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   float sweep=band(q.y,uP*2.4-1.2,.15)*step(uP,.99);float n=noise(q*4.+uT*.5);
   gl_FragColor=vec4(mix(uC2,uC1,edge+sweep)*1.4+vec3(1.)*sweep*.3,(edge*.45*(.6+.4*n)+fr*.5+sweep*.9)*uA);}`));
  shield.position.set(CX,1.0,0); L.mesh.add(shield);

  const C=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TS=${f(TS)};const float TF=${f(TF)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
  vec3 bug(float t){float k=clamp((t-TJ)/(TI-TJ),0.,1.);return mix(P0,P1,k)+vec3(0.,${f(4*JH)}*k*(1.-k),0.);}`;
  // hojas que giran y se condensan en el insecto
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.2;float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*5.;vec3 p=P0+vec3(cos(an),.4+aSeed.z*.6,sin(an))*mix(.8,.05,k*k)*vec3(1.,1.-k,1.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age):0.;put(p,.12+.06*aSeed.w);vMix=aSeed.w+k*2.;}`,LEAF_FS,NB);
  // estela del salto
  a.count+=points(L.part,70,C+`void main(){float s=TJ+aSeed.x*(TI-TJ);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bug(s)+rnd()*.08+vec3(.3*t,-.3*t,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.035*aSeed.w)*(1.-age*.5));}`);
  // destello al posarse en la espalda
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.6,.2,.3));vec3 p=P1+d*(.1+.9*aSeed.z)*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.04*aSeed.w);}`);
  // chispas en el frente del camuflaje
  a.count+=points(L.part,100,C+`void main(){float s=TI+.1+aSeed.x*.45;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.5,.15+aSeed.w*1.7+t*.4,sin(an)*.5);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.03+.03*aSeed.y);}`);
  // escudo: motas que suben en espiral (bucle)
  a.count+=points(L.part,70,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rad=.72-age*.15;vec3 p=vec3(-3.7+cos(an)*rad,.1+age*2.,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.035+.035*r.z);}`);
  // movilidad extra: remolino de hojas a ras de suelo
  a.count+=points(L.part,36,C+`void main(){float s=TS+aSeed.x*.25;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*7.;float rad=.55+.35*age;vec3 p=vec3(-3.7+cos(an)*rad,.06+.25*age*aSeed.w,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.05*aSeed.w);vMix=aSeed.w+t*1.5;}`,LEAF_FS,NB);

  // sello de hojas bajo el Axie
  const sigil=groundPlane(2.4,CX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float k=fract(an/6.2832*7.+uT*.05);float lf=length(vec2((k-.5)*2.2,(r-.72)*3.));
   float leaf=smoothstep(.55,.45,lf)*(.4+.6*smoothstep(0.,.05,abs(k-.5)));
   float m=band(r,.95*uP,.02)+leaf*step(r,uP)*.6+band(r,.45,.015)*uP;
   gl_FragColor=vec4(mix(uC2,uC1,leaf)*1.3,m*uA);}`));
  const landRing=groundPlane(2.2,CX,0.03,fx(RING_FS));
  L.decal.add(sigil,landRing);

  const bp=V3(0,0,0), bv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,0.3,te);
    bugAt(te,bp); bugAt(te+0.01,bv); bv.sub(bugAt(te-0.01,tmp));
    // en el salto la cabeza sigue la velocidad; al posarse gira hacia arriba sobre la espalda
    const pitch=Math.atan2(bv.y,-bv.x), rj=te<TJ?Math.PI:Math.PI-0.8*pitch, land=ss(TI-0.04,TI+0.1,te);
    const crouch=te<TJ?ss(TJ-0.15,TJ,te):0;
    bug.position.copy(bp); if(te<TJ)bug.position.y+=0.05*form;
    bug.rotation.set(0,0,rj+(Math.PI/2+0.3-rj)*land);
    bug.scale.set(0.9*form,0.9*form*(1-0.25*crouch),0.9*form); bug.visible=te<TS+0.02&&form>0.01;
    bugMat.uniforms.uQ.value=ss(TC2,TS,te); bugMat.uniforms.uA.value=0.3+0.7*hitK(ia,6);
    const camA=ss(TI,TI+0.1,te)*(1-ss(TF,TE,te))*(1-0.55*ss(TS,TS+0.3,te));
    for(const m of camo)m.visible=te>TI&&camA>0.002;
    camoMat.uniforms.uP.value=ss(TI,TC2+0.35,te); camoMat.uniforms.uA.value=camA; camoMat.uniforms.uQ.value=hitK(te-TS,3);
    const sh=ss(TS-0.05,TS+0.2,te)*(1-ss(TF,TE,te)), pul=te>=TS?0.06*Math.exp(-(te-TS)*6)*Math.sin((te-TS)*30):0;
    shield.visible=sh>0.002; shield.scale.set(0.72*(1+pul),1.12*(1+pul),0.72*(1+pul)); set(shield,cl((te-TS)/0.5),sh*0.9);
    set(sigil,ss(TS-0.1,TS+0.3,te),ss(TS-0.1,TS+0.15,te)*(1-ss(TF,TE,te)));
    let p=cl((te-TS)/0.45); set(landRing,p,te>=TS?(1-p)*0.7:0);
    U.uE.value=sh;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*hitK(ia,6)+0.5*hitK(te-TS,4)+0.1*sh;
    caster.position.y=ia>=0?-0.04*Math.exp(-ia*10)*Math.sin(ia*25):0;     // acusa el peso del insecto
    if(te<TJ){o.g.copy(P0).y+=0.3;o.gs=0.8*form;o.ga=0.3*form;o.li=1.5*form;}
    else if(te<TI){o.g.copy(bp);o.gs=0.9;o.ga=0.35;o.li=2.5;}
    else if(te<TS){o.g.copy(P1);o.gs=1.1;o.ga=0.25+0.3*hitK(ia,8);o.li=2+3*hitK(ia,6);}
    else{const k=hitK(te-TS,5);o.g.set(CX,1.1,0);o.gs=2.2;o.ga=0.12*sh+0.45*k;o.li=1.5*sh+5*k;}
    o.ia=te>=TS?te-TS:-1;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

// =====================================================================
// 3 · TASSELS — las orejas emiten pulsos rítmicos de feromona que se balancean como borlas; corrientes lilas
//     fluyen hasta cada miembro del escuadrón y florecen en una curación; un velo de feromona aturde al rival
//     (precisión reducida) (nivel 2)
// =====================================================================
const tassels={key:"ioTassels",name:"Tassels",pa:2,dur:2.3,ti:0.9,pal:"Nabo",allies:2,
  phases:[["Vaivén",0],["Feromonas",0.4],["Cura",0.9],["Confusión",1.2],["Disipación",1.8]],
build(a){
  const L=a.L,TP=[0.06,0.22,0.38],TD=0.4,TI=0.9,TF=1.8,TE=2.25;
  const MEM=[V3(-3.7,0,0),ALLY_POS[0],ALLY_POS[1]];
  // pulso de feromona: anillo ondulado que se expande desde las orejas
  const pulseMat=()=>fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rr=r+.05*sin(an*6.+uT*5.)*uP;float m=band(rr,uP,.05+.08*(1.-uP));
   float dots=smoothstep(.6,1.,sin(an*12.-uT*4.))*band(rr,uP*.8,.04);
   gl_FragColor=vec4(mix(uC1,uC2,uP)*1.4,(m+dots*.7)*(1.-uP)*uA);}`,{depthTest:false});
  const pulses=TP.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),pulseMat());L.mesh.add(m);return m;});

  const C=`const float TD=${f(TD)};const float TI=${f(TI)};const float TF=${f(TF)};
  vec3 mem(float i){return i<.5?vec3(-3.7,0.,0.):(i<1.5?${v3(ALLY_POS[0])}:${v3(ALLY_POS[1])});}`;
  // vaivén: estelas que salen de cada oreja con un barrido rítmico (péndulo)
  a.count+=points(L.part,140,C+`void main(){float s=aSeed.x*.55;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sw=sin(s*15.)*1.1;float sd=aSeed.z<.5?1.:-1.;vec3 e=vec3(-3.72,1.84,.26*sd);
   vec3 d=normalize(vec3(sin(sw)*.8,cos(sw)*.9+.2,sd*.6));vec3 p=e+d*t*(1.3+.6*aSeed.w)+vec3(sin(t*6.+aSeed.w*9.)*.08,-.25*t*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.85:0.;put(p,(.035+.045*aSeed.w)*(1.+age));}`);
  // nubecillas de feromona
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*.6;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float sw=sin(s*15.)*1.1;float sd=aSeed.z<.5?1.:-1.;vec3 p=vec3(-3.72,1.84,.26*sd)+vec3(sin(sw)*.6,.5+.3*aSeed.w,sd*.4)*t;
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.35:0.;put(p,(.25+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("mix(uC1,uC2,.45)"));
  // corrientes continuas hacia cada miembro del escuadrón (el propio Axie incluido)
  a.count+=points(L.part,240,C+`void main(){float i=floor(aSeed.z*2.999);vec3 dst=mem(i)+vec3(0.,1.15,0.);
   float s=TD-.1+aSeed.x*.45;float life=.4;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=vec3(-3.72,1.95,0.);vec3 c=mix(e,dst,.5)+vec3(0.,1.1,0.)+(i<.5?vec3(.7,0.,.6):vec3(0.));
   vec3 p=mix(mix(e,c,k),mix(c,dst,k),k);
   vec3 sd=normalize(cross(dst-e+vec3(.3,0.,.3),vec3(0.,1.,0.)));p+=sd*sin(k*12.+aSeed.w*6.)*.12*(1.-k)+rnd()*.05;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.04*aSeed.w);}`);
  // curación: motas que suben en espiral y destellos
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.z*2.999);vec3 b=mem(i);
   float s=TI+aSeed.x*.5;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832+t*2.;float rad=.35+.25*aSeed.y;vec3 p=b+vec3(cos(an)*rad,.1+t*1.6,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.04+.05*aSeed.y);}`);
  a.count+=points(L.part,30,C+`void main(){float i=floor(aSeed.z*2.999);vec3 b=mem(i);
   float s=TI+aSeed.x*.3;float life=.45+aSeed.y*.3;float age=(uT-s)/life;
   vec3 p=b+vec3((aSeed.y-.5)*.8,.4+aSeed.w*1.3,(aSeed.x-.5)*.8);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.14+.12*aSeed.w)*sin(clamp(age,0.,1.)*3.14159));}`,STAR4_FS);
  // velo de feromona hacia el rival y nube de confusión alrededor de su cabeza
  a.count+=points(L.part,70,C+`void main(){float s=TD+aSeed.x*.4;float life=.6;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(vec3(-3.72,1.95,0.),vec3(3.3,1.85,0.),k)+vec3(0.,sin(k*3.14159),0.)+vec3(0.,sin(k*14.+aSeed.w*6.)*.12,cos(k*11.+aSeed.y*6.)*.15);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.6:0.;put(p,.04+.04*aSeed.w);}`);
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*3.;float rad=.35+.1*sin(uT*4.+aSeed.y*9.);
   vec3 p=vec3(3.4+cos(an)*rad,1.9+.08*sin(an*3.+uT*5.)+(aSeed.z-.5)*.15,sin(an)*rad);
   float env=smoothstep(TI+.1,TI+.35,uT)*(1.-smoothstep(TF,TF+.4,uT));vA=env*(.5+.5*aSeed.w);put(p,.04+.04*aSeed.w);}`);

  // roseta de feromona bajo cada miembro curado
  const ROSE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float pet=.55+.3*abs(cos(an*3.+uT*.6));float rose=band(r,pet*uP,.05)+band(r,pet*uP*.6,.03);
   float fill=smoothstep(pet*uP,0.,r)*.18;float rim=band(r,.95*uP,.02);
   gl_FragColor=vec4(mix(uC2,uC1,rose)*1.4,(rose+fill+rim)*uA);}`;
  const roses=MEM.map(m=>{const g=groundPlane(1.9,m.x,0.02,fx(ROSE_FS));g.position.z=m.z;L.decal.add(g);return g;});

  a.pose=function(te,o){
    const ia=te-TI, sway=1-ss(TD+0.2,TD+0.5,te);
    caster.rotation.z=0.06*Math.sin(te*15)*sway;
    pulses.forEach((m,i)=>{const p=cl((te-TP[i])/0.45);towardCam(m.position,EM,0.3);billboard(m);m.visible=te>=TP[i]&&p<1;m.scale.setScalar(0.5+1.4*p);set(m,p*0.9,1);});
    const env=ss(TI-0.05,TI+0.15,te)*(1-ss(TF,TE,te));
    roses.forEach((g,i)=>set(g,ss(TI-0.05,TI+0.4,te),env*(0.9-0.1*i)));
    const pk=hitK(ia,4);
    glowOf(caster,0.6*pk+0.12*env); glowOf(allies[0],0.6*pk+0.12*env); glowOf(allies[1],0.6*pk+0.12*env);
    // rival desorientado: se balancea mientras dura el velo
    const cf=ss(TI,TI+0.3,te)*(1-ss(TF,TE,te));
    target.rotation.z=0.08*Math.sin((te-TI)*5)*cf; target.position.x=3.4+0.04*Math.sin((te-TI)*3.3)*cf;
    if(te<TD){o.g.copy(EM);o.gs=0.9;o.ga=0.3;o.li=1.8;}
    else if(te<TI){const k=cl((te-TD)/(TI-TD));o.g.set(-3.7+0.8*k,2.4-0.6*k,-0.8*k);o.gs=1.4;o.ga=0.3;o.li=2.4;}
    else{o.g.set(-3.5,1.0,-1.0);o.gs=3;o.ga=0.4*pk+0.08*env;o.li=5*pk+1.2*env;}
    o.ia=ia;o.c.set(-3.5,1.0,-1.0);o.shake=0;o.dist=0.25;o.flash=0;o.em=0.12*cf;o.emc.copy(U.uC1.value);
  };
}};

// =====================================================================
// 4 · TERMITE — un enjambre de termitas sale de las orejas hacia los tres rivales, se posa sobre sus escudos
//     y los roe: agujeros con bordes de serrín ardiente, grietas de fragilidad y crujido; las termitas caen (nivel 1)
// =====================================================================
const termite={key:"ioTermite",name:"Termite",pa:1,dur:1.3,ti:0.42,pal:"Ámbar",enemies:2,
  phases:[["Enjambre",0],["Vuelo",0.1],["Mordisco",0.42],["Frágil",0.8]],
build(a){
  const L=a.L,TI=0.42,TG=0.85,TE=1.25;
  const VIC=[V3(3.4,0,0),ENEMY_POS[0],ENEMY_POS[1]];
  const SHELL_FS=HEX+`uniform float uQ;
  void main(){vec3 q=normalize(vP);float n=noise(q*5.)*.6+noise(q*13.)*.4;
   float bite=n-uQ*1.05+.04;if(bite<0.)discard;
   vec3 h=hexCell(vec2(atan(q.z,q.x)*2.4,q.y*4.));float edge=smoothstep(.42,.5,h.x);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float chew=smoothstep(.07,0.,bite)*step(.001,uQ);
   float crack=pow(1.-abs(noise(q*7.+3.)*2.-1.),14.)*smoothstep(0.,.3,uQ);
   gl_FragColor=vec4(mix(uC2,uC1,edge+chew)*1.3+vec3(1.,.8,.5)*chew*.6,(edge*.25+fr*.35+chew*1.2+crack*.9)*uA);}`;
  const shells=VIC.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.56,36,24),fxU(SHELL_FS,{uQ:{value:0}}));m.scale.set(1,1.4,1);L.mesh.add(m);return m;});

  const C=`const float TI=${f(TI)};const float TG=${f(TG)};
  vec3 vic(float i){return i<.5?${v3(VIC[0])}:(i<1.5?${v3(VIC[1])}:${v3(VIC[2])});}
  vec3 land(float i,vec3 r){return vic(i)+vec3(0.,1.,0.)+normalize(r+.001)*vec3(.56,.78,.56);}
  vec3 fly(float s,float i,vec3 r,float t){vec3 e=vec3(-3.72,1.84,r.z>0.?.26:-.26);vec3 d=land(i,r);
   float k=clamp((t-s)/(TI-s),0.,1.);vec3 c=mix(e,d,.5)+vec3(0.,1.2+.8*r.y,r.x*1.2);
   return mix(mix(e,c,k),mix(c,d,k),k)+vec3(sin(t*40.+r.x*20.),cos(t*35.+r.y*20.),sin(t*31.+r.z*9.))*.24*(1.-k)*k;}`;
  // termitas: vuelan zigzagueando y luego corretean por la superficie del escudo
  a.count+=points(L.part,180,C+`varying float vR;
  void main(){float i=floor(aSeed.x*2.999);vec3 r=rnd();float s=.02+aSeed.y*.1;vec3 p;float t=uT;
   if(t<TI){p=fly(s,i,r,t);vec3 q=fly(s,i,r,t+.01)-p;vR=atan(q.y,q.x+.00001);}
   else{vec3 dn=normalize(r+.001);float an=(t-TI)*(1.5+2.*aSeed.w)*(r.y>0.?1.:-1.);
    vec3 dd=vec3(dn.x*cos(an)-dn.z*sin(an),dn.y,dn.x*sin(an)+dn.z*cos(an));float fa=max(t-TG,0.);
    p=vic(i)+vec3(0.,1.,0.)+dd*vec3(.56,.78,.56)+vec3(0.,-fa*fa*6.,0.);vR=an*3.+aSeed.z*6.;}
   vA=(t>s)?(1.-smoothstep(TG+.15,TG+.4,t)):0.;put(p,.085+.03*aSeed.w);vMix=aSeed.z;}`,TERMITE_FS,NB);
  // serrín y astillas finas
  a.count+=points(L.part,60,C+`void main(){float i=floor(aSeed.x*2.999);float s=TI+aSeed.y*.35;float life=.5+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 dn=normalize(rnd()+.001);vec3 p=land(i,rnd())+dn*t*.6+vec3(0.,-1.5*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.035+.035*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,45,C+`void main(){float i=floor(aSeed.x*2.999);float s=TI+.05+aSeed.y*.3;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=land(i,rnd())+vec3(0.,.2*t,0.)+rnd()*.15*t;
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.12+.1*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  VIC.forEach(v=>{a.count+=sparks(L.part,18,TI,`${f(v.x)},1.,${f(v.z)}`,"0.,.3,0.",1.5,4,3);});
  // onda mínima bajo cada rival
  const rings=VIC.map(v=>{const g=groundPlane(1.6,v.x,0.03,fx(RING_FS));g.position.z=v.z;L.decal.add(g);return g;});

  a.pose=function(te,o){
    const ia=te-TI, q=cl(ia/(TG-TI)), env=ss(0.03,0.2,te)*(1-ss(TG,TG+0.3,te));
    caster.rotation.z=-0.08*ss(0,0.08,te)*(1-ss(0.1,0.3,te));
    [target,enemies[0],enemies[1]].forEach((d,i)=>{
      d.position.x+=ia>=0?0.02*Math.sin(te*90+i*2)*Math.exp(-ia*3):0;
      shells[i].position.set(d.position.x,1.0,VIC[i].z); shells[i].visible=env>0.002;
      set(shells[i],0,env*0.85); shells[i].material.uniforms.uQ.value=ia>=0?q:0;
      if(i>0)glowOf(d,hitK(ia,8)*1.1);
      const p=cl(ia/0.4); rings[i].position.x=d.position.x; set(rings[i],p,ia>=0?(1-p)*0.6:0);});
    if(te<0.1){o.g.copy(EM);o.gs=0.6;o.ga=0.25;o.li=1.2;}
    else if(te<TI){const k=cl((te-0.1)/(TI-0.1));o.g.set(-3.7+(2.9+3.7)*k,1.9+1.2*Math.sin(Math.PI*k),0.2*k);o.gs=1;o.ga=0.2;o.li=1.8;}
    else{o.g.copy(TC);o.gs=1+2*ia;o.ga=0.5*Math.exp(-ia*8)+0.1*env;o.li=4*Math.exp(-ia*5)+0.8*env;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.4;o.flash=0.8;
  };
}};

// =====================================================================
// 5 · BRIMSTONE — respiraderos de azufre se encienden alrededor del Axie y erupcionan en columnas de gas carmesí
//     con ceniza volcánica; el gas se enrosca y se condensa en el Axie (brasa retenida = coste reducido) mientras
//     una marea de gas rueda hasta el rival y le recalienta la armadura (nivel 2: sin grietas)
// =====================================================================
const brimstone={key:"ioBrimstone",name:"Brimstone",pa:2,dur:2.3,ti:0.55,pal:"Carmesí",
  phases:[["Calor",0],["Erupción",0.55],["Condensación",1.0],["Brasa",1.5],["Fin",1.95]],
build(a){
  const L=a.L,TI=0.55,TK=1.0,TW=1.0,TA=1.45,TB=1.5,TF=1.95,TE=2.25,CX=-3.7;
  const VA=[0,1,2,3,4].map(i=>i/5*Math.PI*2+0.3), VENTS=VA.map(an=>V3(CX+Math.cos(an)*0.95,0,Math.sin(an)*0.95));
  // respiraderos en el suelo: costras de azufre incandescentes (sin fractura)
  const vents=groundPlane(2.8,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.8;float m=0.,hot=0.;
   for(int i=0;i<5;i++){float an=float(i)/5.*6.2832+.3;vec2 c=vec2(cos(an),-sin(an))*.95;
    float d=length(p-c);float n=noise(vec3(p*6.,float(i)));hot+=smoothstep(.32,0.,d+(n-.5)*.12);m+=band(d,.2+.05*n,.05);}
   float heat=smoothstep(1.4,.3,length(p))*.25*(.6+.4*noise(vec3(p*3.,uT*.5)));
   vec3 c=mix(uC2,uC1,hot)*1.4+vec3(1.,.85,.3)*smoothstep(.6,1.,hot)*.6;
   gl_FragColor=vec4(c,(hot*(.6+.4*uP)+m*.5+heat*uP)*uA);}`));
  const burn=groundPlane(1.8,3.4,0.016,fx(SOFTBURN_FS));
  L.decal.add(vents,burn);
  // columnas de gas sulfúrico
  const gasMat=fx(`void main(){float h=vP.y/1.8;vec3 q=vec3(vP.x*3.,vP.y*1.6-uT*2.6,vP.z*3.);
   float n=noise(q)*.55+noise(q*2.2+vec3(0.,-uT*1.5,4.))*.3+noise(q*4.6)*.15;
   float g=n+(1.-h)*.45-.3+.25*uP;float al=smoothstep(.1,.45,g);float hot=smoothstep(.45,.75,g);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2*.8,uC1,hot)*1.4+vec3(1.,.8,.35)*smoothstep(.75,.95,g)*.5,al*(.3+.7*fr)*smoothstep(1.,.6,h)*uA);}`);
  const gasG=new THREE.CylinderGeometry(0.42,0.14,1.8,24,12,true).translate(0,0.9,0);
  const cols=VENTS.map(v=>{const m=new THREE.Mesh(gasG,gasMat);m.position.copy(v);L.mesh.add(m);return m;});
  // gas que se enrosca alrededor del Axie al condensarse
  const helMat=fx(`void main(){float u=vUv.x,v=vUv.y;if(u>uP)discard;float n=noise(vec3(u*14.-uT*5.,v*3.,1.));
   float w=smoothstep(0.,.35,v)*smoothstep(1.,.65,v);float head=smoothstep(.1,0.,uP-u)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,n+head)*1.4,w*((.35+.6*n)*(1.-u*.3)*uA+head));}`);
  const hel=[0,Math.PI].map(r=>{const m=new THREE.Mesh(helixGeo(2.5,0.85,0.4,1.9,0.22,120),helMat);m.position.set(CX,0.05,0);m.rotation.y=r;L.trail.add(m);return m;});

  const C=`const float TI=${f(TI)};const float TK=${f(TK)};const float TW=${f(TW)};const float TA=${f(TA)};const float TF=${f(TF)};
  vec3 vent(float i){float an=floor(i)/5.*6.2832+.3;return vec3(${f(CX)}+cos(an)*.95,0.,sin(an)*.95);}`;
  // pre-erupción: chispitas que escapan de los respiraderos
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*TI;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vent(aSeed.z*4.999)+rnd()*vec3(.12,0.,.12)+vec3(0.,t*(1.+aSeed.w),0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  // erupción: brasas que saltan y, al condensarse, se arremolinan hacia el Axie
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.25;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v0=vent(aSeed.z*4.999);vec3 r=rnd();vec3 p=v0+vec3(r.x*.4,3.+2.*aSeed.w,r.z*.4)*t+vec3(0.,-3.5*t*t,0.);
   float k=smoothstep(TK-.1,TK+.4,uT);float an=atan(v0.z,v0.x+${f(-CX)})+uT*5.+aSeed.w*3.;float rad=mix(.95,.35,k);
   vec3 sw=vec3(${f(CX)}+cos(an)*rad,.3+aSeed.y*1.5,sin(an)*rad);p=mix(p,sw,k);p.y=max(p.y,.05);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*25.+aSeed.z*40.)):0.;put(p,(.035+.045*aSeed.w)*(1.-age*.4));}`);
  // ceniza volcánica (oscura)
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.4;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vent(aSeed.z*4.999)+vec3(r.x*.5*t,(1.6+aSeed.w)*(1.-exp(-t*2.5))-.25*t*t,r.z*.5*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.16+.16*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.11,.08,.08)"),NB);
  // bocanadas de gas en la erupción
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.2;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vent(aSeed.z*4.999)+vec3(0.,2.4*t,0.)+rnd()*.25*(1.+t);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.45:0.;put(p,(.3+.25*aSeed.w)*(.6+age));}`,SMOKE_FS("mix(uC2,uC1,.35)"));
  VENTS.forEach(v=>{a.count+=sparks(L.part,20,TI,`${f(v.x)},.05,${f(v.z)}`,"0.,1.4,0.",2,5,3);});
  // marea de gas a ras de suelo hacia el rival y brasas sobre su armadura
  a.count+=points(L.part,60,C+`void main(){float s=TW+aSeed.x*.3;float life=.5;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=vec3(mix(-3.,3.3,k),.15+.25*aSeed.y+.1*sin(k*9.+aSeed.w*6.),(aSeed.z-.5)*.9*(1.-k*.5));
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.5:0.;put(p,(.28+.2*aSeed.w)*(.7+.5*k));}`,SMOKE_FS("mix(uC2,uC1,.3)"));
  a.count+=points(L.part,40,C+`void main(){float s=TA+aSeed.x*.4;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(3.4+(aSeed.z-.5)*.7,.2+aSeed.w*1.4+t*.8,(aSeed.y-.5)*.6);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, heat=ss(0,TI,te), erupt=ss(TI,TI+0.1,te), cond=ss(TK,TB,te), env=1-ss(TF,TE,te);
    caster.rotation.z=0.05*heat*(1-erupt)-0.06*Math.sin(Math.max(ia,0)*20)*hitK(ia,6);
    set(vents,heat,(0.3+0.7*heat)*(1-0.6*cond)*env);
    cols.forEach((m,i)=>{const an=VA[i], lean=0.25*(1-cond)-0.55*cond, h=erupt*(1-0.65*cond)*(1+0.1*Math.sin(te*9+i));
      m.visible=te>=TI&&h>0.01; m.scale.set(1+0.4*cond,Math.max(h,0.001),1+0.4*cond);
      m.rotation.set(Math.sin(an)*lean,0,-Math.cos(an)*lean); set(m,hitK(ia,3),erupt*(1-ss(TB-0.1,TB+0.3,te)));});
    hel.forEach((m,i)=>{m.visible=te>TK-0.05&&te<TF+0.3;m.rotation.y=i*Math.PI+te*2;set(m,ss(TK-0.05,TB,te),1-ss(TB+0.1,TF+0.2,te));});
    // brasa retenida en el Axie
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    cm.emissiveIntensity=0.2*heat*(1-erupt)+cond*env*(0.45+0.2*Math.sin(te*9))+0.6*hitK(te-TB,5);
    const arr=te-TA, burnK=ss(TA-0.1,TA+0.15,te)*env;
    burn.position.x=target.position.x; set(burn,0,burnK*0.9); o.em=burnK*(0.35+0.1*Math.sin(te*11)); o.emc.copy(U.uC2.value);
    target.position.x=3.4+0.06*hitK(arr,6);
    if(te<TI){o.g.set(CX,0.3,0);o.gs=1.5*heat;o.ga=0.25*heat;o.li=2*heat;}
    else if(te<TK){o.g.set(CX,1.0,0);o.gs=2.4;o.ga=0.3+0.4*hitK(ia,8);o.li=4+5*hitK(ia,5);}
    else if(te<TA){o.g.set(CX,1.1,0);o.gs=1.6;o.ga=0.35*cond+0.1;o.li=3;}
    else{o.g.set(CX,1.1,0);o.gs=1.6;o.ga=(0.3+0.3*hitK(te-TB,5))*env;o.li=(2.5+3*hitK(te-TB,5))*env;}
    o.ia=te<TA?ia:arr;o.c.set(te<TA?CX:3.4,0.8,0);o.shake=0;o.dist=te<TA?0.6:0.3;o.flash=te<TA?0:0.4;
  };
}};

// =====================================================================
// 6 · EAR BREATHING — el Axie inhala, la escarcha que lo cubría salta en esquirlas y se funde en vapor; los
//     espiráculos exhalan cuatro chorros de vapor hirviendo que golpean al rival y salpican baba verde que forma
//     un charco burbujeante bajo él; el cuarto chorro remata con fractura de baldosa (nivel 3)
// =====================================================================
const earBreath={key:"ioEarBreathing",name:"Ear Breathing",pa:3,dur:3.2,ti:1.62,pal:"Veneno",
  phases:[["Inhalar",0],["Deshielo",0.3],["Ráfagas",0.68],["Golpe final",1.62],["Baba",1.95],["Disipación",2.6]],
build(a){
  const L=a.L,HT=[0.85,1.1,1.35,1.62],TR=0.17,TI=1.62,TP=2.6,TE=3.15,E=V3(-3.62,1.86,0),TH=V3(3.15,1.3,0);
  const LEN=E.distanceTo(TH), ANG=Math.atan2(TH.y-E.y,TH.x-E.x);
  // chorro de vapor: tubo que se ensancha hacia el rival; un tramo [uQ,uP] avanza por él en cada exhalación
  const JET=r=>`uniform float uQ;
  void main(){float l=vP.x/${f(LEN)}+.5;float an=atan(vP.z,vP.y);
   float seg=smoothstep(uQ-.02,uQ+.12,l)*smoothstep(uP+.03,uP-.1,l);
   vec3 q=vec3(l*14.-uT*26.,an*1.5,uT*2.);float n=noise(q)*.6+noise(q*2.3)*.4;
   float fr=abs(dot(normalize(vN),normalize(vV)));float st=smoothstep(${r},.8,n)*(.4+.6*fr);
   gl_FragColor=vec4(mix(vec3(.88,.96,.92),uC1,.2+.35*n)*1.5,st*seg*uA*(.4+.6*smoothstep(0.,.12,l)));}`;
  const jg=(r0,r1)=>new THREE.CylinderGeometry(r1,r0,LEN,28,40,true).rotateZ(-Math.PI/2);
  const jets=[fxU(JET(".3"),{uQ:{value:0}}),fxU(JET(".15"),{uQ:{value:0}})].map((m,i)=>{const j=new THREE.Mesh(i?jg(0.04,0.2):jg(0.12,0.62),m);
    j.position.set((E.x+TH.x)/2,(E.y+TH.y)/2,0);j.rotation.z=ANG;L.trail.add(j);return j;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),fx(RING_FS));L.mesh.add(hitRing);
  // charco de baba centrado bajo el rival: crece con cada ráfaga, burbujea y brilla
  const goo=groundPlane(3.4,3.4,0.017,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float n=noise(vec3(p*2.5,1.))*.6+noise(vec3(p*6.,4.))*.4;float e=r+(n-.5)*.55;float body=smoothstep(uP,uP-.08,e);
   vec2 g=p*5.;vec2 id=floor(g);vec2 fq=fract(g)-.5;float h=hash(vec3(id,7.));float ph=fract(uT*(.6+h)+h*7.);
   float br=band(length(fq),.12+.25*ph,.04)*step(.55,h)*(1.-ph);
   float gl=pow(noise(vec3(p*4.+uT*.3,2.)),3.)*2.;float rim=band(e,uP-.06,.05);
   gl_FragColor=vec4(mix(uC2*.45,uC1,.3+.5*gl)+vec3(1.)*br*.6+uC1*rim*.6,(body*(.72+.2*gl)+br*body+rim*body)*uA);}`,NB));
  const FS=6.2, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  const shock=groundPlane(6.5,3.4,0.03,fx(RING_FS));
  L.decal.add(goo,frac,shock);

  const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float TP=${f(TP)};const vec3 E=${v3(E)};const vec3 TH=${v3(TH)};
  float hk(float i){return i<.5?${f(HT[0])}:(i<1.5?${f(HT[1])}:(i<2.5?${f(HT[2])}:${f(HT[3])}));}`;
  // inhalación: aire que converge en las orejas
  a.count+=points(L.part,100,C+`void main(){float s=aSeed.x*.45;float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 e=vec3(-3.72,1.84,aSeed.y<.5?.26:-.26);vec3 p=mix(e+normalize(rnd()+vec3(.3,.2,0.))*1.6,e,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.03*aSeed.z);}`);
  // escarcha que salta del cuerpo y se funde en vapor
  a.count+=points(L.part,60,C+`void main(){float s=.3+aSeed.x*.25;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 o=vec3(-3.7+cos(an)*.42,.2+aSeed.w*1.5,sin(an)*.42);vec3 v=vec3(cos(an)*1.6,1.2+aSeed.y,sin(an)*1.6);
   vec3 p=o+v*t+vec3(0.,-4.*t*t,0.);vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.07+.06*aSeed.w)*(1.-age*.6));}`,ICE_FS);
  a.count+=points(L.part,30,C+`void main(){float s=.4+aSeed.x*.3;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*(.55+.3*t),.3+aSeed.w*1.4+t*.8,sin(an)*(.55+.3*t));
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.4:0.;put(p,(.22+.15*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.8,.86,.85)"),NB);
  // vapor dentro de cada chorro
  a.count+=points(L.part,280,C+`void main(){float i=floor(aSeed.x*3.999);float h=hk(i);float s=h-TR+aSeed.y*(TR+.05);
   float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 dir=normalize(TH-E);vec3 sd=normalize(cross(dir,vec3(0.,1.,0.)));vec3 up=cross(sd,dir);
   float dd=min(t*${f(LEN/TR)},${f(LEN)});float an=aSeed.z*6.2832;float rad=(.03+.5*dd/${f(LEN)})*aSeed.w;
   vec3 p=E+vec3(0.,0.,aSeed.w<.5?.12:-.12)*(1.-dd/${f(LEN)})+dir*dd+(sd*cos(an)+up*sin(an))*rad;
   vA=(age>0.&&age<1.)?(1.-age)*(i>2.5?1.:.8):0.;put(p,(.05+.06*aSeed.w)*(1.+dd*.2));}`);
  // vapor que revienta en cada golpe
  a.count+=points(L.part,120,C+`void main(){float i=floor(aSeed.x*3.999);float s=hk(i)+aSeed.y*.06;float life=.6+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.6,0.));vec3 p=TH+d*(.3+(i>2.5?1.4:.8)*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.5*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.6:0.;put(p,(.3+.3*aSeed.w)*(.6+age)*(i>2.5?1.4:1.));}`,SMOKE_FS("vec3(.84,.9,.88)"),NB);
  // salpicaduras de baba que caen y se pegan al suelo
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*3.999);float s=hk(i);float life=1.+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.3,.9,0.))*(1.5+2.*aSeed.z)*(i>2.5?1.3:1.);vec3 p=TH+v*t+vec3(0.,-6.*t*t,0.);
   float gnd=step(p.y,.03);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.&&uT<TP+.3)?1.-smoothstep(.7,1.,age):0.;put(p,(.08+.08*aSeed.w)*(1.+gnd*.6));vMix=aSeed.w+gnd;}`,GOO_FS,NB);
  // burbujas y humo pegajoso sobre el charco
  a.count+=points(L.part,50,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-${f(HT[1])})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=sqrt(r.y)*1.1;vec3 p=vec3(3.4+cos(an)*rad,.05+age*.35,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.05+.06*r.z)*(.5+age));}`,BUBBLE_FS);
  a.count+=points(L.part,60,C+`void main(){float s=${f(HT[1])}+aSeed.x*1.3;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rad=sqrt(aSeed.w)*1.1;vec3 p=vec3(3.4+cos(an)*rad,.08+t*.6,sin(an)*rad);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.45*uE:0.;put(p,(.25+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.2,.32,.16)"),NB);
  for(let i=0;i<3;i++)a.count+=sparks(L.part,40,HT[i],`${f(TH.x)},${f(TH.y)},0.`,"-.3,.4,0.",2,6,3);
  a.count+=sparks(L.part,160,TI,`${f(TH.x)},${f(TH.y)},0.`,"-.2,.5,0.",4,12,3.5);

  a.pose=function(te,o){
    let k=-1; for(let i=0;i<4;i++)if(te>=HT[i]-TR)k=i;
    let last=-1; for(const h of HT)if(te>=h)last=h;
    const ia=te-TI, inh=ss(0,0.6,te)*(1-ss(0.68,0.8,te));
    // pulmón: se hincha al inhalar, retrocede con cada exhalación
    let kick=0; for(const h of HT){const d=te-h+TR;if(d>=0)kick+=Math.exp(-d*9)*(h===TI?1.6:1);}
    caster.scale.set(1+0.07*inh,1+0.05*inh,1+0.07*inh); caster.rotation.z=0.1*inh-0.12*kick;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.45*inh+0.25*kick*(te<TP?1:0);
    // chorros
    if(k>=0){const st=HT[k]-TR, fr=(te-st)/TR, tl=fr-0.75, big=k===3?1.35:1;
      jets.forEach(j=>{j.visible=tl<1.05;j.scale.set(1,big,big);j.material.uniforms.uP.value=fr;j.material.uniforms.uQ.value=tl;j.material.uniforms.uA.value=k===3?1.2:0.9;});}
    else jets.forEach(j=>{j.visible=false;});
    const il=last>0?te-last:-1;
    let p=cl(il/0.35); towardCam(hitRing.position,TH,0.6); billboard(hitRing); hitRing.visible=last>0&&p<1; hitRing.scale.setScalar(last===TI?1.5:0.8); set(hitRing,p,1-p);
    // charco: crece tras cada salpicadura
    let gr=0; HT.forEach((h,i)=>{gr+=0.24*ss(h+0.1,h+0.45,te)*(i===3?1.3:1);});
    const gEnv=1-ss(TP,TE,te); set(goo,Math.min(gr,1),gEnv); U.uE.value=gEnv*ss(HT[1],HT[1]+0.3,te);
    // retroceso acumulado del rival
    let kb=0; HT.forEach(h=>{if(te>=h)kb+=(h===TI?0.45:0.12)*Math.exp(-(te-h)*(h===TI?3.5:7));});
    target.position.x=3.4+kb; target.rotation.z=-kb*0.6*Math.cos((te-Math.max(last,0))*14);
    frac.position.x=goo.position.x=shock.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+0.9,TE,te):0);
    p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    if(te<0.68){o.g.copy(EM);o.gs=1.2*inh;o.ga=0.3*inh;o.li=2.5*inh;}
    else if(il<0){const f2=k>=0?cl((te-HT[k]+TR)/TR):0;o.g.set(E.x+(TH.x-E.x)*f2,E.y+(TH.y-E.y)*f2,0);o.gs=1.4;o.ga=0.4;o.li=4;}
    else{const big=last===TI;o.g.copy(TH);o.gs=(big?2.2:1.4)+(big?5:2.5)*Math.min(il,0.5);o.ga=Math.exp(-il*10)*(big?0.9:0.55)+0.06*gEnv;o.li=(big?14:6)*Math.exp(-il*5)+1.2*gEnv;}
    o.ia=il;o.c.copy(TH);o.shake=last===TI?1.7:0.55;o.dist=last===TI?1.3:0.5;o.flash=last===TI?1:0.7;
  };
}};

// =====================================================================
// 7 · BEETLE SPIKE — púas de quitina metálica emergen de las orejas en abanico, giran apuntando y se disparan:
//     dos se clavan en el pecho del rival (daño puro) y cuatro en el suelo a su alrededor con chispas;
//     las heridas gotean sangre (sangrado) (nivel 2)
// =====================================================================
const spike={key:"ioBeetleSpike",name:"Beetle Spike",pa:2,dur:2.1,ti:0.74,pal:"Plata",
  phases:[["Púas",0],["Abanico",0.4],["Impacto",0.74],["Sangrado",0.95],["Disipación",1.6]],
build(a){
  const L=a.L,TG=0.28,TL=0.4,FL=0.26,TI=0.74,TF=1.6,TE=2.05;
  const N=6, ARR=[0.66,0.72,0.77,0.69,0.74,0.8];
  const D=[V3(2.45,0,0.85),V3(3.12,1.38,0.12),V3(4.3,0,0.95),V3(2.6,0,-0.8),V3(3.18,1.02,-0.06),V3(4.35,0,-0.7)];
  const HITS=[1,4];
  const SP=D.map((d,i)=>{const ear=EAR[i<3?0:1], j=i%3, ang=(j-1)*0.55+(i<3?-0.12:0.12);
    const F=V3(ear.x+Math.sin(ang)*0.42,ear.y+0.12+Math.cos(ang)*0.42,ear.z*1.5);
    const c=V3((F.x+d.x)/2,Math.max(F.y,d.y)+(d.y>0.5?0.9:1.5),(F.z+d.z)/2);
    return {ear,F,c,d,ang,t0:ARR[i]-FL,t1:ARR[i]};});
  // púa: quitina metálica con película iridiscente; uA calienta la punta, uQ la disuelve
  const spMat=fxU(`uniform float uQ;
  void main(){float h=vP.y/.5+.5;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float dz=noise(vP*30.)-uQ*1.1+.05;if(dz<0.)discard;
   vec3 ir=.5+.5*cos(6.2832*(fr*.9+h*.5+vec3(0.,.33,.67)));
   vec3 base=mix(vec3(.06,.06,.08),uC2*.6,.5+.3*h);
   vec3 c=base*${LIT}+mix(ir,uC1,.5)*fr*.7+vec3(1.)*${SPEC(30)}*.9+uC1*(uA*smoothstep(.6,1.,h)*1.5+smoothstep(.08,0.,dz)*step(.001,uQ)*2.);
   gl_FragColor=vec4(c,1.);}`,{uQ:{value:0}},SOLID);
  const spG=new THREE.ConeGeometry(0.055,0.5,8);
  const spikes=SP.map(()=>{const m=new THREE.Mesh(spG,spMat);L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS));L.mesh.add(hitRing);
  // estela de cada púa a lo largo de su trayectoria
  SP.forEach(s=>{a.count+=points(L.part,28,`void main(){float sx=${f(s.t0)}+aSeed.x*${f(FL)};float life=.22;float age=(uT-sx)/life;
   float k=clamp((sx-${f(s.t0)})/${f(FL)},0.,1.);float u=1.-k;vec3 p=u*u*${v3(s.F)}+2.*u*k*${v3(s.c)}+k*k*${v3(s.d)}+rnd()*.03;
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.035+.025*aSeed.w)*(1.-age*.5));}`);
    a.count+=sparks(L.part,25,s.t1,`${f(s.d.x)},${f(Math.max(s.d.y,0.05))},${f(s.d.z)}`,s.d.y>0.5?"-.6,.4,0.":"0.,1.2,0.",1.5,5,3);});
  a.count+=sparks(L.part,60,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.5,.4,0.",3,8,3);
  // destellos al formarse el abanico
  a.count+=points(L.part,12,`void main(){float i=floor(aSeed.x*5.999);float s=${f(TG)}+aSeed.y*.06;float life=.25;float age=(uT-s)/life;
   vec3 p=i<.5?${v3(SP[0].F)}:(i<1.5?${v3(SP[1].F)}:(i<2.5?${v3(SP[2].F)}:(i<3.5?${v3(SP[3].F)}:(i<4.5?${v3(SP[4].F)}:${v3(SP[5].F)}))));
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p+vec3(0.,.2,0.),.22*sin(clamp(age,0.,1.)*3.14159));}`,STAR4_FS);
  // sangrado: salpicadura y goteo periódico desde las dos heridas
  a.count+=points(L.part,40,`void main(){float s=${f(TI)}-.03+aSeed.x*.06;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 w=aSeed.z<.5?${v3(D[1])}:${v3(D[4])};vec3 v=normalize(rnd()+vec3(.7,.5,0.))*(1.2+1.6*aSeed.w);vec3 p=w+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.06+.05*aSeed.w);}`,BLOOD_FS,NB);
  a.count+=points(L.part,70,`void main(){float life=.55+aSeed.y*.25;float k=(uT-${f(TI+0.1)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 w=r.x<.5?${v3(D[1])}:${v3(D[4])};float t=age*life;vec3 p=w+vec3(.04+.05*r.y,-.08*smoothstep(0.,.3,age)-max(t-.15,0.)*max(t-.15,0.)*9.,(r.z-.5)*.1);
   vA=(k>=1.&&p.y>.02)?(1.-smoothstep(.85,1.,age))*uE:0.;put(p,.05+.035*r.z);}`,BLOOD_FS,NB);
  // suelo: brillo bajo cada púa clavada y onda centrada en el rival
  const glints=SP.filter((s,i)=>!HITS.includes(i)).map(s=>{const g=groundPlane(0.9,s.d.x,0.02,fx(SOFTBURN_FS));g.position.z=s.d.z;g.userData.t=s.t1;L.decal.add(g);return g;});
  const shock=groundPlane(3.4,3.4,0.03,fx(RING_FS)); L.decal.add(shock);

  const pos=V3(0,0,0), tan=V3(0,0,0), dir=V3(0,0,0), stick=[];
  SP.forEach(s=>{const tg=V3(0,0,0).subVectors(s.d,s.c).normalize();stick.push(tg);});
  a.pose=function(te,o){
    const ia=te-TI, q=ss(TF,TE-0.1,te);
    spMat.uniforms.uQ.value=q; spMat.uniforms.uA.value=0.3+0.7*ss(TG,TL,te)*(1-ss(TI+0.2,TF,te));
    spikes.forEach((m,i)=>{const s=SP[i];m.visible=q<0.99;
      if(te<s.t0){const g=ss(0,TG,te), aim=ss(TL-0.1,s.t0,te);
        pos.lerpVectors(s.ear,s.F,g); dir.set(Math.sin(s.ang),Math.cos(s.ang),s.ear.z*0.5).normalize();
        tan.subVectors(s.c,s.F).normalize(); dir.lerp(tan,aim).normalize();
        m.scale.setScalar(Math.max(g,0.001)); m.position.copy(pos); m.quaternion.setFromUnitVectors(YA,dir);}
      else if(te<s.t1){const k=(te-s.t0)/FL;qb(s.F,s.c,s.d,k,pos);
        tan.set(2*(1-k)*(s.c.x-s.F.x)+2*k*(s.d.x-s.c.x),2*(1-k)*(s.c.y-s.F.y)+2*k*(s.d.y-s.c.y),2*(1-k)*(s.c.z-s.F.z)+2*k*(s.d.z-s.c.z)).normalize();
        m.scale.setScalar(1); m.position.copy(pos); m.quaternion.setFromUnitVectors(YA,tan);}
      else{const it=te-s.t1, wob=0.08*Math.exp(-it*8)*Math.sin(it*50);m.scale.setScalar(1);
        m.position.copy(s.d).addScaledVector(stick[i],-0.1); if(HITS.includes(i))m.position.x+=target.position.x-3.4;
        dir.copy(stick[i]); dir.x+=wob; m.quaternion.setFromUnitVectors(YA,dir.normalize());}
    });
    let p=cl(ia/0.3); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    glints.forEach(g=>{const it=te-g.userData.t;set(g,0,it>=0?(0.4+0.6*Math.exp(-it*6))*(1-ss(TF,TE,te)):0);});
    U.uE.value=1-ss(TF,TE,te);
    // dos sacudidas (una por púa en el pecho) y cabeceo de dolor
    const h1=te>=ARR[1]?Math.exp(-(te-ARR[1])*7):0, h2=hitK(ia,5);
    target.position.x=3.4+0.1*h1+0.22*h2*(1-Math.exp(-Math.max(ia,0)*20)); shock.position.x=target.position.x; target.rotation.z=-(0.1*h1+0.25*h2)*Math.cos((te-ARR[1])*16);
    const bl=ss(TI,TI+0.2,te)*(1-ss(TF,TE,te)); o.em=0.18*bl*(0.6+0.4*Math.sin(te*7)); o.emc.setRGB(0.9,0.05,0.1);
    caster.rotation.z=-0.08*ss(TL-0.05,TL+0.05,te)*(1-ss(TL+0.1,TI,te));
    if(te<TL){const g=ss(0,TG,te);o.g.copy(EM).y+=0.35;o.gs=1.2*g;o.ga=0.35*g;o.li=2.5*g;}
    else if(te<TI){const k=cl((te-TL)/(TI-TL));o.g.set(-3.6+6.7*k,2.3+0.8*Math.sin(Math.PI*k)-1.1*k,0);o.gs=1.2;o.ga=0.4;o.li=3;}
    else{o.g.copy(TC);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*10)*0.65;o.li=7*Math.exp(-ia*5)+0.5*bl;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.7;
  };
}};

// =====================================================================
// 8 · LARVA — larvas luminosas caen alrededor del Axie, hilan seda dorada que sube en espiral y cierra un
//     capullo; una semilla de luz se funde en el Axie (PA extra del próximo turno) y el capullo se deshilacha (nivel 1)
// =====================================================================
const larva={key:"ioLarva",name:"Larva",pa:1,dur:1.4,ti:0.42,pal:"Celestial",
  phases:[["Caída",0],["Hilado",0.2],["Capullo",0.42],["Muda",0.7],["Disipación",1.0]],
build(a){
  const L=a.L,TL=0.2,TI=0.42,TM=0.7,TF=1.0,TE=1.38,CX=-3.7;
  // hebras de seda en hélice: uP las teje de abajo arriba, uQ las deshilacha
  const silkMat=fxU(`uniform float uQ;
  void main(){float u=vUv.x,v=vUv.y;if(u>uP||u<uQ)discard;
   float core=smoothstep(.5,0.,abs(v-.5));float head=smoothstep(.06,0.,uP-u)*step(uP,.99);
   float sh=.6+.4*sin(u*120.-uT*20.);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.5+vec3(1.)*head*.6,(core*(.5+.5*sh)+head)*uA);}`,{uQ:{value:0}});
  const helices=[0,1,2].map(i=>{const m=new THREE.Mesh(helixGeo(3,0.62,0.3,1.95,0.035,160),silkMat);m.position.set(CX,0.02,0);m.rotation.y=i*2.094;L.trail.add(m);return m;});
  // capullo: fibras que se envuelven en horizontal, se revela de abajo arriba
  const cocoon=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fxU(`uniform float uQ;
  void main(){vec3 q=normalize(vP);if(q.y*.5+.5>uP)discard;
   float fib=pow(abs(sin(q.y*55.+noise(q*4.)*5.+atan(q.z,q.x)*1.5)),8.);
   float n=noise(q*6.+uT*.4);float dz=n-uQ*1.1+.05;if(dz<0.)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);float top=band(q.y*.5+.5,uP,.04)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,fib+top)*1.3+vec3(1.)*top*.4,(fib*.35+fr*.4+top+smoothstep(.08,0.,dz)*step(.001,uQ))*uA);}`,{uQ:{value:0}}));
  cocoon.position.set(CX,0.98,0); cocoon.scale.set(0.6,1.05,0.6);
  // semilla de luz que se funde en el pecho del Axie
  const seed=new THREE.Mesh(new THREE.SphereGeometry(0.12,20,14),fx(`void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC1,vec3(1.),c*.6)*1.8,c*uA);}`));
  seed.position.set(CX+0.05,1.15,0.2);
  L.mesh.add(cocoon,seed);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TM=${f(TM)};const float TF=${f(TF)};const float CX=${f(CX)};`;
  // larvas que caen, rebotan y se retuercen en el suelo
  a.count+=points(L.part,10,C+`varying float vR;
  void main(){float an=aSeed.x*6.2832;float rad=.6+.08*aSeed.y;float s=aSeed.z*.06;float k=clamp((uT-s)/(TL-s),0.,1.);
   vec3 g=vec3(CX+cos(an)*rad,.06,sin(an)*rad);float bo=max(uT-TL,0.);
   vec3 p=mix(g+vec3(0.,2.4,0.),g,k*k)+vec3(0.,.12*exp(-bo*10.)*abs(sin(bo*18.)),0.);
   vR=an+sin(uT*14.+aSeed.w*6.)*.5+(1.-k)*uT*6.;
   vA=(uT>s)?(1.-smoothstep(TF,TF+.3,uT)):0.;put(p,.16+.03*aSeed.w);}`,LARVA_FS,NB);
  // motas de seda que suben por las hélices
  a.count+=points(L.part,110,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TL)/(TI-TL),0.,1.);float an=floor(aSeed.z*2.999)*2.094+k*18.85;float rad=.62-.32*k;
   vec3 p=vec3(CX+cos(an)*rad,.02+1.95*k,-sin(an)*rad)+rnd()*.04+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.03+.03*aSeed.w);}`);
  // destellos al cerrarse el capullo
  a.count+=points(L.part,18,C+`void main(){float s=TI+aSeed.x*.08;float life=.35+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=vec3(CX+(aSeed.z-.5)*1.,.3+aSeed.w*1.5,(aSeed.y-.5)*.9);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.14+.1*aSeed.w)*sin(clamp(age,0.,1.)*3.14159));}`,STAR4_FS);
  // la seda se deshilacha en motas que flotan
  a.count+=points(L.part,80,C+`void main(){float s=TM+aSeed.x*.35;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float y=.1+aSeed.w*1.9;float rad=.62-.32*(y/1.95);
   vec3 p=vec3(CX+cos(an)*(rad+.4*t),y+.5*t,sin(an)*(rad+.4*t))+vec3(sin(t*5.+aSeed.x*9.)*.06,0.,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.025+.03*aSeed.y);}`);
  const ring=groundPlane(1.8,CX,0.03,fx(RING_FS)); L.decal.add(ring);

  a.pose=function(te,o){
    const ia=te-TI, weave=ss(TL,TI,te), unr=ss(TM,TF+0.1,te);
    helices.forEach(m=>{m.visible=te>TL&&unr<0.99;});
    silkMat.uniforms.uP.value=weave*1.01; silkMat.uniforms.uQ.value=unr; silkMat.uniforms.uA.value=0.9+0.6*hitK(ia,8);
    const cA=ss(TI-0.08,TI+0.05,te)*(1-ss(TF,TE,te));
    cocoon.visible=cA>0.002&&te>TL; cocoon.scale.set(0.6*(1+0.04*hitK(ia,6)),1.05,0.6*(1+0.04*hitK(ia,6)));
    set(cocoon,ss(TL+0.05,TI,te)*1.01,cA*0.9); cocoon.material.uniforms.uQ.value=unr;
    const sk=ss(TI,TI+0.06,te)*(1-ss(TM-0.1,TM,te)), sc=0.6+0.6*hitK(ia,10)-0.5*ss(TI+0.1,TM,te);
    seed.visible=sk>0.002; seed.scale.setScalar(Math.max(sc,0.001)); set(seed,0,sk);
    let p=cl(ia/0.4); set(ring,p,ia>=0?(1-p)*0.6:0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.7*hitK(te-TM+0.1,5)+0.15*cA;
    caster.scale.set(1,1-0.03*Math.sin(Math.PI*cl((te-TL)/0.5)),1);
    if(te<TL){o.g.set(CX,1.4,0);o.gs=0.8;o.ga=0.2;o.li=1.2;}
    else if(te<TI){o.g.set(CX,0.1+1.9*weave,0);o.gs=1;o.ga=0.3;o.li=2;}
    else{o.g.set(CX,1.15,0.2);o.gs=1.2+1.5*Math.min(ia,0.4);o.ga=0.45*Math.exp(-ia*7)+0.15*sk;o.li=4*Math.exp(-ia*5)+1.5*cA;}
    o.ia=ia;o.c.set(CX,1.0,0);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

VFX.module("Bicho · Orejas",[earwing,leafbug,tassels,termite,brimstone,earBreath,spike,larva]);
})();

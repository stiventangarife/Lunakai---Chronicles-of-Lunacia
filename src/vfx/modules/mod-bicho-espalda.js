// =====================================================================
// MÓDULO · CLASE BICHO (ESPALDA)
// Estética de insecto: quitina iridiscente, seda, baba tóxica, arena del desierto y zumbido. No se dibujan partes del
// Axie (ni alas ni el gusano de la espalda como anatomía): los efectos nacen de la espalda ≈ (−3.85, 1.25, 0); lo que
// aparece (gusano espectral, sandalia, escarabajo, concha) son objetos o proyecciones temporales.
// Niveles por PA: 2 PA → firme (sin fractura, sin temblor); 3 PA → pesado, fractura de baldosa y temblor alto.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,BUBBLE_FS,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;
// paleta "Élitro" (quitina tornasol): la define mod-bicho-orejas.js, que se carga antes; aquí solo se reutiliza

const TC=V3(3.15,1.2,0), CB=V3(-3.85,1.25,0);              // pecho del objetivo · espalda del lanzador
const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const win=(te,a,b,c,d)=>ss(a,b,te)*(1-ss(c,d,te));
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
const glowOn=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
// quemadura/mancha suave (nivel 2): sin grietas
const SOFTBURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;

// ---------- fragmentos de partícula del módulo ----------
// esquirla quitinosa alargada que apunta en su dirección de vuelo (vMix = ángulo en pantalla, rad); reflejo tornasol
const SHARD_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vMix),s=sin(vMix);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float d=abs(q.x)*1.05+abs(q.y)*(4.2+3.*q.x);float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 vec3 ir=.5+.5*cos(6.2832*(vMix*.2+q.x*1.4+vec3(0.,.33,.67)));
 gl_FragColor=vec4(mix(mix(uC2,uC1,.5+q.x*1.4),ir,.35)*1.4+vec3(1.)*smoothstep(.16,0.,d)*.45,a);}`;
// gota de baba viscosa con brillo (mezcla normal)
const GOO_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.6),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;float hl=smoothstep(.08,0.,length(q-vec2(-.08,.02)));
 gl_FragColor=vec4(mix(uC2*.9,mix(uC1,vec3(.75,1.,.35),.25),.4+.6*vMix)*(1.2-d*1.3)+vec3(1.)*hl*.7,a*.92);}`;
// astilla de madera (mezcla normal), vMix = giro
const SPLINTER_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=.07*(1.-smoothstep(.1,.46,abs(q.x)))+.014;float a=smoothstep(w,w*.4,abs(q.y))*step(abs(q.x),.46)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.32,.18,.08),vec3(.72,.5,.28),.5+q.x)+uC1*smoothstep(.3,.45,abs(q.x))*.5,a);}`;
// placa de concha en espiral (mezcla normal): disco con anillos de crecimiento
const PLATE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float r=length(q);float a=smoothstep(.45,.38,r)*vA;if(a<.003)discard;
 float an=atan(q.y,q.x);float sp=.5+.5*sin(an+r*40.+vMix*20.);
 gl_FragColor=vec4(mix(vec3(.55,.32,.14),mix(uC1,vec3(1.,.92,.75),.4),sp*.7+.2)*(1.15-r)+uC1*smoothstep(.3,.45,r)*.6,a);}`;

// =====================================================================
// 1 · BUZZ BUZZ (2 PA) — el aire de la espalda vibra con un zumbido; cinco ondas sónicas amarillas en arco cruzan el
//     campo dibujando un oscilograma; el rival se tambalea con un halo de mareo y el suelo resuena en cruz bajo él
// =====================================================================
const buzz={key:"ieBuzzBuzz",name:"Buzz Buzz",pa:2,dur:2.0,ti:0.7,pal:"Estática",
  phases:[["Zumbido",0],["Ondas",0.32],["Impacto",0.7],["Aturdido",0.95],["Fin",1.6]],
build(a){
  const L=a.L,TS=0.32,FL=0.38,TI=TS+FL,N=5,DT=0.07,TE=1.6,X=3.4,HD=V3(3.25,1.62,0),W0=V3(-3.5,1.32,0),W1=V3(2.95,1.3,0);
  const TW=[...Array(N)].map((_,i)=>TS+i*DT), HUM_END=TS+N*DT;
  // aire batido a la espalda: anillos de interferencia que tiemblan a alta frecuencia (no es un ala: es el aire)
  const field=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float jit=noise(vec3(an*3.,r*4.,uT*40.));
   float rings=pow(.5+.5*sin(r*38.-uT*90.+jit*3.),6.);
   float blur=noise(vec3(an*9.,uT*60.,1.))*.5;
   float m=smoothstep(1.,.3,r)*(rings*.8+blur*.4)+smoothstep(.35,0.,r)*.45;
   gl_FragColor=vec4(mix(uC2,uC1,rings)*1.4,m*uA);}`,{depthTest:false}));
  // ondas sónicas: tres arcos concéntricos abiertos hacia el rival, con rizo angular
  const ARC_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float side=smoothstep(1.15,.45,abs(an));float w=.045+.04*uP;float rip=.5+.5*sin(an*14.+uT*30.);
   float m=(band(r,.82,w)+band(r,.63,w*.6)*.6*rip+band(r,.46,w*.4)*.35)*side;
   gl_FragColor=vec4(mix(uC2,uC1,band(r,.82,w*.5))*1.6+vec3(1.)*band(r,.82,w*.22)*.5,m*uA);}`;
  const waves=TW.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(ARC_FS,{depthTest:false}));L.mesh.add(m);return m;});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(field,hitRing);
  // oscilograma: tres senos que se revelan detrás del frente de onda (haz)
  const osc=new THREE.Mesh(new THREE.PlaneGeometry(6.7,1.1),fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   float env=sin(3.14159*u);float m=0.;
   for(int i=0;i<3;i++){float fi=float(i);float y=sin(u*(40.+fi*13.)-uT*(26.+fi*9.)+fi*2.)*env*(.55-fi*.13)*(.6+.4*sin(uT*7.+fi));
    m+=smoothstep(.06,0.,abs(v-y))*(1.-fi*.25);}
   float rev=step(u,uP)*smoothstep(uP-.6,uP,u);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,m*rev*uA*.75);}`));
  osc.position.set(-0.25,1.3,0); L.trail.add(osc);
  // halo de mareo sobre la cabeza (anillo discontinuo que gira y se inclina)
  const halo=groundPlane(0.95,HD.x,2.05,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float d=step(.45,fract(an/6.2832*9.-uT*1.6));
   gl_FragColor=vec4(uC1*1.5,(band(r,.8,.07)*(.3+.7*d)+band(r,.56,.035)*.4)*uA);}`));
  L.mesh.add(halo);
  // suelo: resonancia en cruz (área de 1 casilla) bajo el rival y una onda bajo el lanzador
  const cross=groundPlane(4.2,X,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);
   float arm=min(q.x,q.y);float len=max(q.x,q.y);
   float shape=smoothstep(.22,.13,arm)*smoothstep(1.,.72,len);
   float rip=pow(.5+.5*sin(len*30.-uT*25.),4.);
   float wave=band(len,uP,.08)*smoothstep(.26,.1,arm)*step(uP,.99);
   float core=smoothstep(.3,0.,length(p));
   gl_FragColor=vec4(mix(uC2,uC1,rip)*1.4,(shape*(.25+.6*rip)+wave+core*.3)*uA);}`));
  const cring=groundPlane(2.2,-3.7,0.02,fx(RING_FS));
  L.decal.add(cross,cring);

  const C=`const float TS=${f(TS)};const float FL=${f(FL)};const float DT=${f(DT)};const float TI=${f(TI)};const float HE=${f(HUM_END)};
  const vec3 W0=${v3(W0)};const vec3 W1=${v3(W1)};const vec3 CB=${v3(CB)};const vec3 HD=${v3(HD)};`;
  // motas que tiemblan en el aire batido de la espalda
  a.count+=points(L.part,60,C+`void main(){vec3 r=rnd();vec3 p=CB+vec3(-.1,.05,0.)+r*vec3(.38,.42,.35)*(.4+.6*aSeed.x)
    +vec3(sin(uT*95.+aSeed.x*40.),cos(uT*83.+aSeed.y*30.),0.)*.03;
   vA=smoothstep(0.,.12,uT)*(1.-smoothstep(HE,HE+.15,uT))*(.45+.55*sin(uT*40.+aSeed.z*20.));put(p,.03+.03*aSeed.w);}`);
  // polvo sónico que salta de cada frente de onda al pasar
  a.count+=points(L.part,190,C+`void main(){float i=floor(aSeed.x*4.999);float k0=aSeed.y;float born=TS+i*DT+FL*k0;
   float life=.32+.22*aSeed.z;float t=uT-born;float age=t/life;float c=max(t,0.);
   vec3 cen=mix(W0,W1,k0);float R=.656*(.45+k0);float an=(aSeed.w-.5)*2.1;
   vec3 p=cen+vec3(cos(an),sin(an),0.)*R+vec3(.5*c,.1*c,(aSeed.z-.5)*.9*c);
   vA=(age>0.&&age<1.)?(1.-age)*(1.-i*.1):0.;put(p,.028+.03*aSeed.z);}`);
  // motas desprendidas del rival por la vibración; estrellitas de mareo que orbitan la cabeza
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.4;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.2,0.));vec3 p=vec3(3.4,.4+aSeed.z*1.4,0.)+d*(.3+.8*(1.-exp(-c*4.)))+vec3(sin(c*30.+aSeed.w*9.)*.04,0.,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.035+.03*aSeed.w);}`);
  a.count+=points(L.part,7,C+`void main(){float an=aSeed.x*6.2832+uT*3.2;float on=smoothstep(TI+.05,TI+.25,uT)*(1.-smoothstep(1.55,1.85,uT));
   vec3 p=vec3(HD.x+cos(an)*.4,2.08+sin(an*2.+uT*3.)*.05,sin(an)*.4*.7);vA=on*(.6+.4*sin(uT*12.+aSeed.y*9.));put(p,.11*on);}`,STAR4_FS);
  a.count+=sparks(L.part,70,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.2,.3,0.",2,5,2);

  a.pose=function(te,o){
    const ia=te-TI, hum=win(te,0,0.12,HUM_END,HUM_END+0.15);
    caster.position.x=-3.7+0.012*Math.sin(te*130)*hum;
    caster.rotation.z=0.06*ss(0,TS,te)-0.1*ss(TS,TS+0.1,te)*(1-ss(TI,TI+0.3,te));
    glowOn(caster,0.22*hum);
    towardCam(field.position,tmp.set(CB.x-0.1,CB.y+0.05,0),0.2); billboard(field,te*0.6);
    field.visible=hum>0.001; set(field,0,hum*0.9); field.scale.setScalar(0.8+0.3*hum+0.05*Math.sin(te*70));
    waves.forEach((w,i)=>{const k=(te-TW[i])/FL;w.visible=k>0&&k<1.35;if(!w.visible)return;
      const kk=Math.min(k,1);w.position.lerpVectors(W0,W1,kk);w.position.z=0.05;billboard(w);
      w.scale.setScalar((0.45+kk)*(k>1?1+1.6*(k-1):1));
      set(w,kk,(k<1?ss(0,0.08,k):1-ss(1,1.35,k))*(1-i*0.08));});
    osc.visible=te>=TS&&te<TI+0.6; set(osc,cl((te-TS)/FL)*1.15,win(te,TS,TS+0.05,TI+0.25,TI+0.55));
    let p=cl((te-TS)/0.45); set(cring,p,te>=TS?(1-p)*0.55:0);
    p=cl(ia/0.3); towardCam(hitRing.position,TC,0.4); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // rival: un empujón por onda y un vaivén de mareo
    let kb=0; for(const t of TW){const d=te-(t+FL);if(d>=0)kb+=0.06*Math.exp(-d*9);}
    const sway=ia>=0?Math.sin(ia*7.5)*Math.exp(-ia*1.3):0;
    target.position.x=3.4+kb+0.06*sway; target.rotation.z=-0.2*sway-kb*0.6;
    target.scale.set(1+kb*0.6,1-kb*0.9,1+kb*0.6);
    const daze=win(te,TI+0.05,TI+0.25,TE,TE+0.3);
    halo.visible=daze>0.001; halo.material.uniforms.uA.value=daze;
    halo.position.set(target.position.x-0.15-0.25*sway,2.05,0); halo.rotation.set(0.25*Math.sin(te*4),0,0.2*Math.cos(te*5)-0.2*sway);
    set(cross,cl(ia/0.5),ia>=0?(1-ss(TE-0.2,TE+0.3,te))*(0.55+0.45*Math.exp(-ia*4)):ss(TS,TI,te)*0.2);
    if(te<TS){o.g.copy(CB);o.gs=0.9*hum;o.ga=0.3*hum*(0.8+0.2*Math.sin(te*60));o.li=2*hum;}
    else if(te<TI){o.g.lerpVectors(W0,W1,cl((te-TS)/FL));o.gs=1.2;o.ga=0.45;o.li=3.5;}
    else{o.g.copy(TC);o.gs=1.2+2*Math.min(ia,0.5);o.ga=0.6*Math.exp(-ia*7)+0.12*daze;o.li=6*Math.exp(-ia*4)+1.5*daze;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.7;o.flash=0.85;
  };
}};

// =====================================================================
// 2 · GARISH WORM (3 PA) — un gusano de seda carmesí espectral sale de la espalda, se alza, se encoge y escupe un hilo
//     de baba tóxica al rival; el hilo salta del rival a un segundo enemigo y los une: pulsos de daño compartido
//     viajan por él; charcos de baba bajo ambos y fractura de baldosa bajo el rival
// =====================================================================
const worm={key:"ieGarishWorm",name:"Garish Worm",pa:3,dur:3.1,ti:1.35,pal:"Rubí",enemies:1,
  phases:[["Emerge",0],["Alza",0.45],["Escupe",1.0],["Impacto",1.35],["Enlace",1.7],["Veneno",2.3]],
build(a){
  const L=a.L,TG=0.45,TS=1.0,TI=1.35,TL=1.7,TX=2.6,TE=3.05,NS=15,LW=2.6,B0=V3(-3.92,1.3,0);
  const E0=ENEMY_POS[0], EC=V3(E0.x-0.2,1.15,E0.z+0.15);
  // columna del gusano: integra el ángulo a lo largo del cuerpo (se alza, se curva hacia atrás, embiste)
  const spine=(te,out)=>{const g=ss(0,TG,te),rear=ss(TG,TS-0.12,te),lunge=ss(TS-0.12,TS+0.06,te),back=ss(TI+0.15,TI+0.7,te);
    const phi0=-0.15-0.15*rear+0.55*lunge-0.35*back,kap=0.5-0.75*rear+1.6*lunge-1.1*back;
    let x=B0.x,y=B0.y;const ds=LW*Math.max(g,0.02)/(NS-1);
    for(let i=0;i<NS;i++){const u=i/(NS-1);out[i].set(x,y,0.14*Math.sin(u*5-te*6)*u*(1-lunge*0.7));
      const ph=phi0+kap*u+0.18*Math.sin(te*3+u*4)*(1-lunge);x+=Math.sin(ph)*ds;y+=Math.cos(ph)*ds;}
    return out;};
  const pts=[...Array(NS)].map(()=>V3(0,0,0));
  const M=spine(TS+0.06,pts)[NS-1].clone(), PK=V3((M.x+TC.x)/2,Math.max(M.y,TC.y)+1.1,0);
  const MB=V3((TC.x+EC.x)/2,0.55,(TC.z+EC.z)/2);
  // cuerpo espectral: seda carmesí con fibras que fluyen, tubérculos y borde brillante; uP = brillo de la boca
  const WORM_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);vec3 q=normalize(vP);
   float fib=noise(vec3(q.x*9.+uT*2.,q.y*30.,q.z*9.));float silk=smoothstep(.55,.85,fib);
   float dots=smoothstep(.76,.86,noise(q*7.+3.));float ring=band(q.y,0.,.16);
   vec3 c=mix(uC2,uC1,fr*.7+silk*.4)*(.5+1.2*fr)+vec3(1.)*dots*.45+vec3(1.,.9,.95)*uP*(1.-fr)*1.2;
   gl_FragColor=vec4(c,(.16+.7*fr+silk*.25+dots*.5+ring*.15+uP*(1.-fr))*uA);}`;
  const segMat=fx(WORM_FS), headMat=fx(WORM_FS), sg=new THREE.SphereGeometry(1,24,16);
  const segs=pts.map((_,i)=>{const m=new THREE.Mesh(sg,i===NS-1?headMat:segMat);L.mesh.add(m);return m;});
  // hilos de baba: se revelan con uP; uQ hace correr pulsos en ambos sentidos (daño compartido)
  const THREAD_FS=`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float n=noise(vec3(u*40.-uT*5.,vUv.y*6.2832,uT));
   float blob=smoothstep(.7,.95,sin(u*48.-uT*9.)*.5+.5);
   float d1=fract(u-uQ),d2=fract(1.-u-uQ);float pulse=(smoothstep(.05,0.,min(d1,1.-d1))+smoothstep(.05,0.,min(d2,1.-d2)))*step(.001,uQ);
   float head=smoothstep(.08,0.,uP-u)*step(uP,.999);
   vec3 c=mix(uC2,uC1,.4+.6*n)*(.7+.8*fr)+vec3(.75,1.,.4)*blob*.35+vec3(1.)*(head+pulse)*.8;
   gl_FragColor=vec4(c,(.35+.5*fr+blob*.3+head+pulse*1.2)*uA);}`;
  const thrA=new THREE.Mesh(pathTube((t,o)=>qb(M,PK,TC,t,o),30,90,8,0.065,0.035),fxU(THREAD_FS,{uQ:{value:0}}));
  const thrB=new THREE.Mesh(pathTube((t,o)=>qb(TC,MB,EC,t,o),24,70,8,0.05,0.05),fxU(THREAD_FS,{uQ:{value:0}}));
  L.trail.add(thrA,thrB);
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.copy(TC);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),fx(RING_FS,{depthTest:false}));
  const linkRing=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing,linkRing);
  // suelo: charcos de baba burbujeante bajo los dos enlazados + fractura bajo el rival + onda
  const GOO_DEC=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*6.,uT*.4))*.6+noise(vec3(p*15.,2.))*.4;float e=r+(n-.5)*.4;
   float body=smoothstep(.95*uP,.7*uP,e);
   vec2 g=p*14.;vec2 id=floor(g);vec2 fq=fract(g)-.5;float h=hash(vec3(id,3.));
   float ph=fract(uT*(.5+h)+h*7.);float bub=smoothstep(.06,0.,abs(length(fq)-.3*ph))*step(.7,h)*(1.-ph)*body;
   float sheen=smoothstep(.6,.85,n)*body;
   gl_FragColor=vec4(mix(uC2*.8,uC1,sheen+bub)*1.3,(body*(.35+.25*n)+bub*.9+sheen*.4+band(e,.85*uP,.05)*.5)*uA);}`;
  const gooT=groundPlane(2.4,3.4,0.016,fx(GOO_DEC)), gooE=groundPlane(1.9,E0.x,0.016,fx(GOO_DEC)); gooE.position.z=E0.z;
  const FS=7, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS))), shock=groundPlane(5,3.4,0.03,fx(RING_FS));
  L.decal.add(gooT,gooE,frac,shock);

  const C=`const float TG=${f(TG)};const float TS=${f(TS)};const float TI=${f(TI)};const float TL=${f(TL)};const float TX=${f(TX)};const float TE=${f(TE)};
  const vec3 B0=${v3(B0)};const vec3 M=${v3(M)};const vec3 PK=${v3(PK)};const vec3 HP=${v3(TC)};const vec3 MB=${v3(MB)};const vec3 EC=${v3(EC)};`+QB;
  // seda que sube en espiral mientras el gusano emerge
  a.count+=points(L.part,90,C+`void main(){float s=aSeed.x*TG*1.2;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*7.;float rad=.15+.35*aSeed.w*(1.-age);vec3 p=B0+vec3(cos(an)*rad,t*1.8,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.03+.03*aSeed.w);}`);
  // babeo mientras se alza; rocío tóxico a lo largo del escupitajo
  a.count+=points(L.part,50,C+`void main(){float s=TG+aSeed.x*(TS-TG);float t=uT-s;float c=max(t,0.);
   vec3 p=M+vec3(-.5+.3*aSeed.y,-.15,0.)+rnd()*.08+vec3(0.,-3.5*c*c,0.);
   vA=(t>0.&&t<.5&&p.y>.03)?1.-t*2.:0.;put(p,.06+.04*aSeed.z);vMix=aSeed.w;}`,GOO_FS,NB);
  a.count+=points(L.part,160,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.35+aSeed.y*.35;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 p=qb(M,PK,HP,(s-TS)/(TI-TS))+rnd()*.1+vec3(.3*c,-2.8*c*c,(aSeed.z-.5)*.4*c);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.05+.06*aSeed.w);vMix=aSeed.z;}`,GOO_FS,NB);
  // impacto: salpicadura de baba, chispas
  a.count+=points(L.part,180,C+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.35,.55,0.))*(2.2+5.*aSeed.z);vec3 p=HP+v*c+vec3(0.,-7.*c*c,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.08+.1*aSeed.w)*(p.y<.04?1.4:1.));vMix=aSeed.w;}`,GOO_FS,NB);
  a.count+=sparks(L.part,220,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.4,.35,0.",3.5,11,3);
  // pulsos que recorren el enlace en ambos sentidos
  a.count+=points(L.part,100,C+`void main(){float k=fract((uT-TL)*.9+aSeed.x);float dir=step(.5,aSeed.y);float u=mix(k,1.-k,dir);
   vec3 p=qb(HP,MB,EC,u)+rnd()*.05;float on=step(TL,uT)*(1.-smoothstep(TX,TE,uT));
   vA=on*(.5+.5*sin(k*3.14159));put(p,.04+.04*aSeed.z);}`);
  // burbujas venenosas que suben de los dos enlazados
  a.count+=points(L.part,140,C+`void main(){float life=.9+aSeed.y*.6;float k=(uT-TI-.2)/life+aSeed.x;float cy=floor(k);float age=fract(k);vec3 r=rr(cy);
   vec3 base=aSeed.z<.55?vec3(3.4,.2,0.):vec3(${f(E0.x)},.2,${f(E0.z)});
   vec3 p=base+vec3((r.x-.5)*.8,age*1.9,(r.z-.5)*.8)+vec3(sin(age*9.+r.y*6.)*.06,0.,0.);
   float on=step(1.,k)*smoothstep(TI+.2,TI+.5,uT)*(1.-smoothstep(TX,TE,uT));
   vA=on*sin(age*3.14159);put(p,.07+.07*r.y);}`,BUBBLE_FS);
  // el gusano se deshace en hebras de seda
  a.count+=points(L.part,100,C+`void main(){float s=TI+.15+aSeed.x*.6;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 p=mix(B0,M,aSeed.z)+rnd()*.28+vec3(-.2*c,.8*c,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(c*25.+aSeed.w*30.)):0.;put(p,.03+.035*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, il=te-TL; spine(te,pts);
    const g=ss(0,TG,te), fade=1-ss(TI+0.2,TI+0.75,te), puff=ss(TS-0.12,TS,te)*(1-ss(TS,TS+0.12,te));
    segs.forEach((m,i)=>{const u=i/(NS-1);m.position.copy(pts[i]);m.visible=te<TI+0.8;
      m.scale.setScalar(Math.max((0.25-0.1*u+(i===NS-1?0.06:0))*(0.35+0.65*g)*(1+0.15*puff*u),0.001));});
    segMat.uniforms.uA.value=g*fade*(0.85+0.15*Math.sin(te*9)); headMat.uniforms.uA.value=segMat.uniforms.uA.value;
    headMat.uniforms.uP.value=ss(TS-0.3,TS,te)*(1-ss(TS+0.1,TS+0.4,te));
    caster.rotation.z=0.08*ss(0,TG,te)-0.14*puff; glowOn(caster,0.3*g*fade);
    thrA.visible=te>=TS&&te<TI+0.9; set(thrA,cl((te-TS)/(TI-TS)),1-ss(TI+0.3,TI+0.9,te));
    thrB.visible=te>=TI+0.1&&te<TE; set(thrB,cl((te-TI-0.1)/(TL-TI-0.1)),1-ss(TX,TE,te)); thrB.material.uniforms.uQ.value=te>=TL?(te-TL)*0.9:0;
    let p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.4+1.4*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.35); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(il/0.35); towardCam(linkRing.position,EC,0.4); billboard(linkRing); linkRing.visible=il>=0&&p<1; set(linkRing,p,1-p);
    p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    const gv=win(te,TI,TI+0.5,TX,TE); set(gooT,0.3+0.7*ss(TI,TI+0.6,te),gv); set(gooE,0.3+0.7*ss(TL,TL+0.6,te),win(te,TL,TL+0.5,TX,TE));
    // reacción: golpe fuerte del rival, el enlazado sacude con cada pulso compartido
    const hit=hitK(ia,3.2); target.position.x=3.4+hit*0.55*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.4*Math.cos(ia*12);
    gooT.position.x=target.position.x; frac.position.x=target.position.x;
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,TI+1.7,te):0);
    const linked=win(te,TL,TL+0.1,TX,TE), pul=il>=0?Math.pow(Math.max(0,Math.cos(Math.PI*((il*0.9)%1)*2)),8):0;
    const e0=enemies[0]; e0.rotation.z=0.12*hitK(il,5)*Math.cos(il*14)+0.03*pul*linked; e0.position.x=E0.x-0.12*hitK(il,6);
    glowOn(e0,(1.2*hitK(il,8)+0.25+0.35*pul)*linked);
    o.em=(0.25+0.3*pul)*linked; o.emc.copy(U.uC1.value);
    if(te<TS){const h=pts[NS-1];o.g.copy(h);o.gs=1.0+0.5*g;o.ga=0.3*g;o.li=2.5*g;}
    else if(te<TI){qb(M,PK,TC,cl((te-TS)/(TI-TS)),tmp);o.g.copy(tmp);o.gs=1.4;o.ga=0.55;o.li=5;}
    else if(te<TL){o.g.copy(TC);o.gs=1.8+5*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.95;o.li=14*Math.exp(-ia*4.5);}
    else{o.g.copy(MB);o.g.y=1.0;o.gs=2.2;o.ga=0.12*linked+0.3*pul*linked;o.li=(2+3*pul)*linked;}
    if(il>=0){o.ia=il;o.c.copy(EC);o.shake=0.5;o.dist=0.6;o.flash=0.6;}
    else{o.ia=ia;o.c.copy(TC);o.shake=1.6;o.dist=1.25;}
  };
}};

// =====================================================================
// 3 · SANDAL (3 PA) — de la espalda sube una corriente ámbar que materializa una sandalia de madera gigante sobre el
//     rival; se alza y azota en arco: el rival queda aplastado, la huella de la sandalia arde en el suelo, la baldosa
//     se fractura y se levanta una gran nube de polvo; después el rival tiembla de miedo entre humo oscuro
// =====================================================================
const sandal={key:"ieSandal",name:"Sandal",pa:3,dur:3.0,ti:1.25,pal:"Ámbar",
  phases:[["Invocación",0],["Alzada",0.55],["Azote",1.0],["Impacto",1.25],["Polvo",1.5],["Miedo",2.1]],
build(a){
  const L=a.L,TM=0.15,TA=0.55,TW=1.0,TI=1.25,TF=2.1,TE=2.9,X=3.4,P=V3(1.4,2.2,0),RS=2.0;
  const S0=V3(-3.9,1.45,0), SC=V3(P.x+RS*Math.cos(0.9),P.y+RS*Math.sin(0.9),0), CC=V3(-1.2,5.4,0);
  const theta=te=>{if(te<TA)return 0.9+0.25*ss(TM,TA,te);
    if(te<TW)return 1.15+0.95*ss(TA,TW,te);
    if(te<TI){const k=(te-TW)/(TI-TW);return 2.1-2.2*k*k;}
    return -0.1*Math.exp(-(te-TI)*10)*Math.cos((te-TI)*25)+0.45*ss(TI+0.35,TI+0.9,te);};
  // madera de la sandalia: vetas a lo largo, brillo de borde; uQ disuelve con filo incandescente
  const WOOD_FS=`uniform float uQ;
  void main(){vec3 p=vP;float n=noise(p*vec3(1.5,9.,9.))*.6+noise(p*vec3(3.,30.,30.))*.4;
   float grain=.5+.5*sin(p.z*38.+p.y*22.+n*6.);
   vec3 wood=mix(vec3(.34,.19,.08),vec3(.72,.48,.25),grain*.55+n*.45);
   float dz=noise(p*4.+3.)-uQ*1.1+.05;if(dz<0.)discard;
   float edge=smoothstep(.1,0.,dz)*step(.001,uQ);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(wood*${LIT}+vec3(1.,.9,.7)*${SPEC(16)}*.2+uC1*(edge*2.5+fr*uA*.9)+uC2*edge,1.);}`;
  const STRAP_FS=`uniform float uQ;
  void main(){float w=.5+.5*sin(vUv.x*120.)*sin(vUv.y*40.);
   float dz=noise(vP*5.+1.)-uQ*1.1+.05;if(dz<0.)discard;float edge=smoothstep(.1,0.,dz)*step(.001,uQ);
   gl_FragColor=vec4(mix(vec3(.45,.06,.05),vec3(.75,.16,.1),w)*${LIT}+uC1*(edge*2.5+uA*.3),1.);}`;
  const woodMat=fxU(WOOD_FS,{uQ:{value:1}},SOLID), strapMat=fxU(STRAP_FS,{uQ:{value:1}},SOLID);
  const pv=new THREE.Group(); pv.position.copy(P); L.mesh.add(pv);
  const sole=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.16,1.05),woodMat); sole.position.set(RS,0,0);
  const teeth=[0.75,-0.75].map(dx=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.24,0.95),woodMat);m.position.set(RS+dx,-0.2,0);return m;});
  const straps=[-1,1].map(s=>new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([V3(RS+0.85,0.08,0),V3(RS+0.55,0.3,0.12*s),V3(RS+0.1,0.3,0.35*s),V3(RS-0.15,0.08,0.5*s)]),24,8,0.05,0.05),strapMat));
  pv.add(sole,...teeth,...straps);
  // sello de invocación sobre el rival: anillo con rayos
  const seal=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uT*.8;
   float m=band(r,.86,.025)+band(r,.7,.015)+pow(abs(cos(an*6.)),24.)*smoothstep(.86,.5,r)*step(.32,r)+band(r,.25+.08*pow(abs(cos(an*3.)),6.),.02);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.5)*1.5,m*step(r,uP)*uA);}`,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.set(X,1.6,0);
  L.mesh.add(seal,burst);
  // azote: sector anular de movimiento detrás de la sandalia (uP = ángulo actual)
  const swoosh=new THREE.Mesh(new THREE.RingGeometry(0.7,3.5,48,1,-0.3,2.6),fx(`void main(){float an=atan(vP.y,vP.x);float r=length(vP.xy);
   float d=an-uP;float tr=step(0.,d)*exp(-d*3.5);
   float rr=smoothstep(.7,1.4,r)*smoothstep(3.5,2.7,r);float st=noise(vec3(r*6.,an*3.-uT*4.,1.));
   gl_FragColor=vec4(mix(uC2,uC1,tr)*1.5+vec3(1.)*smoothstep(.15,0.,d)*step(0.,d)*.4,tr*rr*(.4+.6*st)*uA);}`));
  swoosh.position.set(P.x,P.y,0.05); L.trail.add(swoosh);
  // suelo: huella de la sandalia que arde, fractura de baldosa, onda y anillo de polvo
  const imprint=groundPlane(3.4,X,0.02,fx(`float sdBox(vec2 p,vec2 b,float r){vec2 d=abs(p)-b+r;return length(max(d,0.))+min(max(d.x,d.y),0.)-r;}
  void main(){vec2 p=(vUv-.5)*3.4;float d=sdBox(p,vec2(1.3,.52),.3);
   float tb=smoothstep(.03,-.03,min(sdBox(p-vec2(.75,0.),vec2(.09,.47),.03),sdBox(p+vec2(.75,0.),vec2(.09,.47),.03)));
   float n=noise(vec3(p*6.,2.));float rim=band(d,0.,.06+.04*n);float fill=smoothstep(.02,-.05,d);
   gl_FragColor=vec4(mix(uC2,uC1,rim+tb*.5)*1.5,(rim*1.1+fill*.15*(.6+.4*n)+tb*.55)*uA);}`));
  const FS=7.5, frac=groundPlane(FS,X,0.025,fx(tileFractureFS(FS))), shock=groundPlane(6,X,0.03,fx(RING_FS));
  L.decal.add(imprint,frac,shock);

  const C=`const float TA=${f(TA)};const float TW=${f(TW)};const float TI=${f(TI)};const float TF=${f(TF)};const float TE=${f(TE)};
  const vec3 S0=${v3(S0)};const vec3 SC=${v3(SC)};const vec3 CC=${v3(CC)};const vec3 PV=${v3(P)};`+QB;
  // corriente ámbar de la espalda a la invocación
  a.count+=points(L.part,140,C+`void main(){float s=aSeed.x*(TA-.12);float fl=.32;float k=clamp((uT-s)/fl,0.,1.);
   vec3 p=qb(S0,CC,SC,k)+rnd()*.14*(1.-k*.6);vA=(uT>s&&uT<s+fl)?sin(k*3.14159)*.9:0.;put(p,.035+.045*aSeed.w);}`);
  // virutas que convergen mientras la sandalia se materializa
  a.count+=points(L.part,70,C+`void main(){float s=.12+aSeed.x*.35;float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 d=normalize(rnd()+.001);vec3 p=SC+d*mix(1.6,.2,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;
   put(p,.12+.06*aSeed.w);vMix=aSeed.z+k;}`,SPLINTER_FS,NB);
  // estela de serrín durante el azote
  a.count+=points(L.part,90,C+`void main(){float s=TW+aSeed.x*(TI-TW);float k=(s-TW)/(TI-TW);float th=2.1-2.2*k*k;
   float life=.4+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 p=PV+vec3(cos(th),sin(th),0.)*(${f(RS)}+(aSeed.z-.5)*2.4)+rnd()*.12+vec3(-.3*c,.2*c,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,.04+.05*aSeed.w);}`);
  // impacto: nube de polvo enorme, astillas, chispas
  a.count+=points(L.part,280,C+`void main(){float s=TI+aSeed.x*.1;float life=1.1+aSeed.y*.7;float t=uT-s;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=vec3(${f(X)},0.,0.)+d*(.5+2.6*(1.-exp(-c*2.6)))*(.45+.55*aSeed.w)+vec3(0.,.15+(.4+1.2*aSeed.y)*(1.-exp(-c*1.8)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.9:0.;put(p,(.45+.45*aSeed.y)*(.6+age*.9));}`,DUST_FS,NB);
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.04;float life=.8+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.7,0.))*(3.+6.*aSeed.z);vec3 p=vec3(${f(X)},1.75,0.)+v*c+vec3(0.,-7.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.2+.16*aSeed.w);vMix=aSeed.w+c*(1.+2.*aSeed.y);}`,SPLINTER_FS,NB);
  a.count+=sparks(L.part,240,TI,`${f(X)},1.8,0.`,"0.,-.15,0.",4,13,3);
  // miedo: humo oscuro que se arrastra a los pies del rival
  a.count+=points(L.part,80,C+`void main(){float life=1.+aSeed.y*.6;float k=(uT-TI-.45)/life+aSeed.x;float cy=floor(k);float age=fract(k);vec3 r=rr(cy);
   float an=r.x*6.2832+age*1.5;vec3 p=vec3(${f(X)}+cos(an)*(.45+.3*r.y),.08+age*.9,sin(an)*(.45+.3*r.y));
   vA=step(1.,k)*sin(age*3.14159)*.6*(1.-smoothstep(TE-.4,TE,uT));put(p,(.3+.25*r.z)*(.6+age*.6));}`,SMOKE_FS("vec3(.12,.08,.12)"),NB);

  a.pose=function(te,o){
    const ia=te-TI, th=theta(te), mat=ss(TM,TA,te), out=ss(TI+0.55,TI+1.0,te);
    pv.rotation.z=th; pv.visible=te>=TM&&out<0.999;
    const pop=0.85+0.15*mat; pv.scale.setScalar(pop);
    for(const m of [woodMat,strapMat]){m.uniforms.uQ.value=Math.max(1-mat,out);m.uniforms.uA.value=0.4*mat+0.8*ss(TA,TW,te)*(1-ss(TI,TI+0.3,te));}
    caster.rotation.z=0.12*ss(0,TA,te)-0.22*ss(TW,TI,te)*(1-ss(TI+0.2,TI+0.6,te)); glowOn(caster,0.35*ss(0,0.3,te)*(1-ss(TA,TW,te)));
    towardCam(seal.position,SC,0.3); billboard(seal); seal.visible=te<TW; set(seal,ss(0,TA,te),win(te,0.05,0.2,TA,TW));
    swoosh.visible=te>=TW-0.05&&ia<0.3; set(swoosh,th,win(te,TW-0.05,TW+0.1,TI,TI+0.3));
    let p=cl(ia/0.55); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.5+1.6*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.8); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(imprint,0,ia>=0?Math.exp(-ia*1.2)*(1-ss(TE-0.4,TE,te)):0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.1,TI+1.65,te):0);
    // rival: aplastado por el azote, rebota y luego tiembla acobardado
    const sq=hitK(ia,4.5), fear=win(te,TI+0.4,TI+0.7,TE-0.3,TE);
    target.scale.set(1+0.25*sq,Math.max(1-0.45*sq*(1-Math.exp(-Math.max(ia,0)*40)),0.4)*(1-0.05*fear),1+0.25*sq);
    target.position.x=3.4+0.025*Math.sin(te*70)*fear+0.12*fear; target.rotation.z=0.1*fear+0.04*sq*Math.sin(ia*30);
    o.em=0.12*fear; o.emc.setRGB(0.4,0.25,0.5);
    if(te<TA){o.g.copy(SC);o.gs=1.2+0.8*mat;o.ga=0.4*mat+0.15;o.li=3*mat+1;}
    else if(te<TI){tmp.set(P.x+RS*Math.cos(th),P.y+RS*Math.sin(th),0);o.g.copy(tmp);o.gs=1.8;o.ga=0.45+0.3*ss(TW,TI,te);o.li=4+4*ss(TW,TI,te);}
    else{o.g.set(X,1.6,0);o.gs=2+6*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*1.0;o.li=16*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(X,1.6,0);o.shake=1.8;o.dist=1.3;
  };
}};

// =====================================================================
// 4 · SCARAB (2 PA) — arena dorada cae de la espalda y se hunde; un surco avanza bajo tierra y un escarabajo sagrado de
//     oro emerge frente al rival, abre los élitros y estalla en polvo del desierto; la arena queda girando alrededor
//     del rival como un sello que impide curarse (Duda)
// =====================================================================
const scarab={key:"ieScarab",name:"Scarab",pa:2,dur:2.2,ti:0.95,pal:"Dorado",
  phases:[["Arena",0],["Túnel",0.22],["Emerge",0.55],["Estallido",0.95],["Polvo",1.15],["Duda",1.5]],
build(a){
  const L=a.L,TT=0.22,TU=0.55,TO=0.78,TI=0.95,TE=2.15,X=3.4,G0=V3(-3.85,0,0),SP=V3(2.95,0,0.4),HP=V3(2.95,0.95,0.4);
  // escarabajo: oro con estrías, punteado y reflejo tornasol; uA = pulso de energía antes de estallar
  const GOLD_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float pun=smoothstep(.72,.8,noise(vP*38.));float stri=.5+.5*sin(vP.z*60.+noise(vP*5.)*2.);
   vec3 gold=mix(vec3(.42,.26,.05),vec3(1.,.8,.34),.55+.45*stri)*(1.-pun*.35);
   vec3 ir=.5+.5*cos(6.2832*(fr*.8+vec3(0.,.33,.67)));
   gl_FragColor=vec4(gold*${LIT}+vec3(1.,.95,.8)*${SPEC(24)}*.9+mix(uC1,ir,.3)*fr*.35+uC1*uA*(.6+.4*sin(uT*30.))*(.3+fr),1.);}`;
  const gold=fx(GOLD_FS,SOLID), dark=fx(`void main(){gl_FragColor=vec4(vec3(.12,.07,.02)*${LIT}+uC1*uA*.8,1.);}`,SOLID);
  const sc=new THREE.Group(), body=new THREE.Group(); sc.add(body); L.mesh.add(sc);
  const belly=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),dark); belly.scale.set(0.4,0.2,0.3); belly.position.y=-0.02;
  const core=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),fx(`void main(){float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.6,(1.-fr*.6)*uA);}`)); core.scale.set(0.32,0.2,0.24);
  const halfG=new THREE.SphereGeometry(1,28,18,0,Math.PI);
  const ely=[1,-1].map(s=>{const h=new THREE.Group();h.position.y=0.04;const m=new THREE.Mesh(halfG,gold);m.scale.set(0.42,0.25,0.21);if(s<0)m.rotation.y=Math.PI;h.add(m);h.userData.s=s;return h;});
  const prono=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),gold); prono.scale.set(0.17,0.15,0.25); prono.position.set(0.36,0.03,0);
  const head=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),gold); head.scale.set(0.11,0.08,0.15); head.position.set(0.52,0.0,0);
  body.add(belly,core,...ely,prono,head);
  // rastrillo del clípeo y patas
  for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(0.022,0.1,6),gold);m.position.set(0.62,0,(i-2)*0.055);m.rotation.z=-Math.PI/2;body.add(m);}
  for(let i=0;i<6;i++){const s=i%2?1:-1,j=Math.floor(i/2),m=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.012,0.36,6),dark);
    m.position.set(0.22-j*0.22,-0.12,s*0.26);m.rotation.set(s*1.0,0,(j-1)*0.5);body.add(m);}
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.copy(HP);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing);
  // surco bajo tierra: lomo de arena que avanza del lanzador al punto de salida
  const furrow=groundPlane(SP.x-G0.x,(SP.x+G0.x)/2,0.018,fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   float w=sin(u*13.)*.12+(noise(vec3(u*10.,0.,0.))-.5)*.2;float d=abs(v-w);
   float rev=step(u,uP);float head=exp(-max(uP-u,0.)*8.)*rev;
   float gr=noise(vec3(u*120.,v*12.,1.));float lin=smoothstep(.22,0.,d)*(.5+.5*gr);
   gl_FragColor=vec4(mix(uC2,uC1,head+gr*.3)*1.3,lin*(.3+.7*head)*rev*smoothstep(0.,.03,u)*uA);}`),0.8);
  furrow.position.z=0.2;
  // montículo de arena donde emerge (centrado en el escarabajo) y mancha de duda bajo el rival
  const mound=groundPlane(1.6,SP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(an*4.,r*6.,1.));float rays=pow(n,3.)*smoothstep(1.,.3,r);
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*n)*1.2,(smoothstep(1.,.2,r)*.3+rays*.8+band(r,uP,.06)*.6)*uA);}`));
  mound.position.z=SP.z;
  const stain=groundPlane(2.6,X,0.016,fx(SOFTBURN_FS)), shock=groundPlane(4.2,X,0.03,fx(RING_FS));
  L.decal.add(furrow,mound,stain,shock);

  const C=`const float TT=${f(TT)};const float TU=${f(TU)};const float TI=${f(TI)};const float TE=${f(TE)};
  const vec3 CB=${v3(CB)};const vec3 G0=${v3(G0)};const vec3 SP=${v3(SP)};const vec3 HP=${v3(HP)};`;
  // arena que cae de la espalda y se hunde
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*TT;float life=.28;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(CB+rnd()*vec3(.12,.1,.12),G0+vec3((aSeed.y-.5)*.3,.02,(aSeed.z-.5)*.3),k*k);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.045+.03*aSeed.w);}`,CHIP_FS);
  // chorros de arena sobre el surco
  a.count+=points(L.part,70,C+`void main(){float s=TT+aSeed.x*(TU-TT);float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=(s-TT)/(TU-TT);float x=mix(G0.x,SP.x,u);
   vec3 p=vec3(x+(aSeed.z-.5)*.2,.05+.4*(1.-exp(-t*4.))*aSeed.w,.2+(sin(u*13.)*.12)*.4+(aSeed.w-.5)*.2);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.14+.1*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // surtidor de arena al emerger
  a.count+=points(L.part,70,C+`void main(){float s=TU+aSeed.x*.1;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,1.8,0.))*(1.5+2.5*aSeed.z);vec3 p=SP+v*c+vec3(0.,-6.*c*c,0.);
   vA=(t>0.&&t<.7&&p.y>0.)?1.-t/.7:0.;put(p,.05+.04*aSeed.w);}`,CHIP_FS);
  // estallido: polvo del desierto, granos y chispas
  a.count+=points(L.part,180,C+`void main(){float s=TI+aSeed.x*.06;float life=.9+aSeed.y*.6;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 d=normalize(rnd()+vec3(-.1,.35,0.));vec3 p=HP+d*(.3+1.6*aSeed.z)*(1.-exp(-c*3.5))+vec3(0.,.3*c,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age):0.;put(p,(.3+.3*aSeed.w)*(.6+age*.8));}`,DUST_FS,NB);
  a.count+=points(L.part,120,C+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,.4,0.))*(2.5+4.5*aSeed.z);vec3 p=HP+v*c+vec3(0.,-5.*c*c,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,110,TI,`${f(HP.x)},${f(HP.y)},${f(HP.z)}`,"0.,.4,0.",2.5,7,2.5);
  // duda: anillos de arena que giran en torno al rival
  a.count+=points(L.part,160,C+`void main(){float ring=step(.5,aSeed.x);float an=aSeed.y*6.2832+uT*(ring>.5?1.6:-1.2);
   float rad=(.62+.1*aSeed.z)*(ring>.5?1.:.85);float y=ring>.5?1.3:.55;float tl=ring>.5?.25:-.18;
   vec3 p=vec3(3.4+cos(an)*rad,y+sin(an)*rad*tl+(aSeed.w-.5)*.12,sin(an)*rad);
   float on=uE;vA=on*(.45+.55*sin(uT*6.+aSeed.z*20.));put(p,(.04+.04*aSeed.w)*on);}`,CHIP_FS);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, rise=ss(TU,TO,te), open=ss(TO-0.05,TI-0.02,te), doubt=win(te,TI+0.1,TI+0.45,TE-0.4,TE);
    caster.rotation.z=0.08*ss(0,TT,te)-0.08*ss(TT,TU,te); glowOn(caster,0.25*win(te,0,0.1,TT,TU));
    sc.visible=te>=TU&&ia<0; sc.position.set(SP.x,-0.25+1.2*rise+0.04*Math.sin(te*14)*rise,SP.z);
    sc.rotation.set(0,-0.55,1.25*(1-rise)+0.35*rise); body.scale.setScalar(0.9+0.15*open+0.04*Math.sin(te*40)*open);
    ely.forEach(h=>{h.rotation.x=-h.userData.s*0.95*open;});
    gold.uniforms.uA.value=open; dark.uniforms.uA.value=open*0.4; core.material.uniforms.uA.value=open;
    set(furrow,cl((te-TT)/(TU-TT)),ss(TT,TT+0.05,te)*(1-ss(TI,TI+0.5,te)));
    set(mound,cl((te-TU)/0.4),win(te,TU-0.05,TU+0.05,TI+0.3,TI+0.9));
    let p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.15*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.35); towardCam(hitRing.position,HP,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    stain.material.uniforms.uA.value=0.85*doubt; U.uE.value=doubt;
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.3*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.25*Math.cos(ia*13);
    stain.position.x=target.position.x;
    o.em=0.22*doubt; o.emc.copy(U.uC2.value);
    if(te<TT){o.g.copy(CB);o.gs=0.8;o.ga=0.25;o.li=1.5;}
    else if(te<TU){const k=cl((te-TT)/(TU-TT));o.g.set(G0.x+(SP.x-G0.x)*k,0.25,0.2);o.gs=0.9;o.ga=0.32;o.li=2;}
    else if(te<TI){sp.copy(sc.position);o.g.copy(sp);o.gs=1+0.8*open;o.ga=0.3+0.35*open;o.li=2.5+4*open;}
    else{o.g.copy(HP);o.gs=1.4+3.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.8+0.1*doubt;o.li=9*Math.exp(-ia*5)+1.2*doubt;}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.8;
  };
}};

// =====================================================================
// 5 · SNAIL SHELL (2 PA) — un torrente de placas nacaradas sale de la espalda y se enrosca alrededor del aliado
//     levantando una concha de caracol blindada en espiral; al sellarse destella y queda en guardia: las púas
//     de la concha se erizan y una onda aturdidora recorre el suelo (lista para aturdir a quien la golpee)
// =====================================================================
const snail={key:"ieSnailShell",name:"Snail Shell",pa:2,dur:2.3,ti:0.9,pal:"Miel",allies:1,
  phases:[["Espiral",0],["Envío",0.2],["Concha",0.55],["Sellado",0.9],["Guardia",1.3],["Fin",1.95]],
build(a){
  const L=a.L,TS=0.2,TF=0.55,TI=0.9,TR=1.3,TX=1.95,TE=2.3,A=ALLY_POS[0],AT=V3(A.x,2.5,A.z),CC=V3(-3.0,3.4,-0.9),TURN=3.1;
  const shellPt=(t,o)=>{const th=t*TURN*Math.PI*2,R=0.8*Math.pow(1-t,0.85)+0.06;return o.set(A.x+Math.cos(th)*R,0.22+1.95*Math.pow(t,1.05),A.z+Math.sin(th)*R);};
  // concha: tubo en espiral que se afina; líneas de crecimiento, franjas y nácar; uP revela desde la base
  const SHELL_FS=`void main(){float u=vUv.x;if(u>uP)discard;float v=vUv.y;
   float growth=.5+.5*sin(u*420.+noise(vec3(u*30.,v*4.,1.))*3.);
   float stripe=smoothstep(.3,.6,sin(v*12.566+u*24.)*.5+.5);
   vec3 base=mix(vec3(.5,.28,.12),vec3(.96,.8,.52),stripe*.6+growth*.25);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 nac=.5+.5*cos(6.2832*(fr*.7+u*2.+vec3(0.,.33,.67)));
   float head=smoothstep(.04,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(base*${LIT}+vec3(1.)*${SPEC(20)}*.5+mix(uC1,nac,.4)*fr*.55+uC1*(head*2.2+uA*(.25+.6*fr)),.93);}`;
  const shell=new THREE.Mesh(pathTube(shellPt,120,320,14,0.36,0.05),fx(SHELL_FS,Object.assign({},NB,{depthWrite:true})));
  // velo de escudo bajo la concha y púas de guardia
  const veil=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   float an=atan(q.z,q.x);float sp=band(fract((an/6.2832)*3.+q.y*1.6),.5,.06);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3,(fr*.45+sp*.15+band(q.y,uP*2.-1.,.06)*.5)*uA);}`));
  veil.position.set(A.x,1.0,A.z); veil.scale.set(1.15,1.3,1.15);
  const spikeMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(vec3(.55,.32,.12),vec3(.95,.8,.55),fr)*${LIT}+uC1*uA*(.5+fr),1.);}`,SOLID);
  const spikes=[];
  for(let i=0;i<10;i++){const t=0.06+i*0.075,m=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.34,8).translate(0,0.17,0),spikeMat);
    shellPt(t,m.position);const d=V3(m.position.x-A.x,0.35,m.position.z-A.z).normalize();m.quaternion.setFromUnitVectors(YA,d);
    m.position.addScaledVector(d,0.3*(1-t)+0.05);m.userData.t=t;spikes.push(m);}
  L.mesh.add(shell,veil,...spikes);
  // haz: cinta espiral de luz que baja enroscándose sobre la concha mientras se forma
  const ribbon=new THREE.Mesh(VFX.helixGeo(3.1,1.05,0.25,2.1,0.1,200),fx(`void main(){float u=1.-vUv.x;float d=uP-u;
   float a=step(0.,d)*exp(-d*5.)*smoothstep(0.,.05,u);float e=band(vUv.y,.5,.4);
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*8.))*1.6,a*e*uA);}`));
  ribbon.position.set(A.x,0.2,A.z); L.trail.add(ribbon);
  // suelo: sello en espiral bajo el aliado y onda aturdidora dentada
  const glyph=groundPlane(2.8,A.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sp=fract((an/6.2832)+log(max(r,.02))*1.6-uT*.2);float arm=smoothstep(.08,0.,abs(sp-.5))*smoothstep(.95,.2,r);
   float m=arm*.7+band(r,.93,.02)+band(r,.78,.012);
   gl_FragColor=vec4(mix(uC2,uC1,arm)*1.4,m*step(r,uP*1.05)*uA);}`));
  const stun=groundPlane(4.2,A.x,0.03,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float zig=abs(fract(an*7.+uT*3.)-.5)*.08;float n=noise(vec3(an*10.,uT*20.,1.))*.04;
   float a=band(r,uP*.95+zig+n,.025)*(1.-uP);
   gl_FragColor=vec4(mix(vec3(1.,.95,.4),uC1,.3)*1.8,a*uA);}`));
  glyph.position.z=A.z; stun.position.z=A.z; L.decal.add(glyph,stun);

  const C=`const float TS=${f(TS)};const float TF=${f(TF)};const float TI=${f(TI)};const float TR=${f(TR)};const float TX=${f(TX)};
  const vec3 CB=${v3(CB)};const vec3 CC=${v3(CC)};const vec3 AT=${v3(AT)};const vec3 AP=${v3(A)};`+QB+`
  vec3 shellPt(float t){float th=t*${f(TURN*Math.PI*2)};float R=.8*pow(1.-t,.85)+.06;return vec3(AP.x+cos(th)*R,.22+1.95*pow(t,1.05),AP.z+sin(th)*R);}`;
  // torrente de placas: viajan por el arco y se posan en su lugar de la espiral (de la base hacia arriba)
  a.count+=points(L.part,170,C+`void main(){float slot=aSeed.y;float s=TS+aSeed.x*(TF-TS)*.8;float k1=clamp((uT-s)/.28,0.,1.);
   float s2=s+.28;float k2=clamp((uT-s2)/.18,0.,1.);
   vec3 p=k1<1.?qb(CB,CC,AT,k1)+rnd()*.1:mix(AT,shellPt(slot)+rnd()*.06,k2*k2);
   float fade=1.-smoothstep(TI,TI+.12,uT);vA=(uT>s)?fade:0.;put(p,.11+.05*aSeed.w);vMix=aSeed.z+uT*.3;}`,PLATE_FS,NB);
  // destellos de nácar al sellar y motas que rondan la concha
  a.count+=points(L.part,24,C+`void main(){float s=TI+aSeed.x*.1;float life=.45+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=shellPt(aSeed.z)+rnd()*.12;vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.16+.12*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*(.8+.5*aSeed.y);float rad=1.05+.2*aSeed.z;
   vec3 p=vec3(AP.x+cos(an)*rad,.2+aSeed.w*2.1+sin(uT*1.6+aSeed.x*9.)*.08,AP.z+sin(an)*rad);vA=uE*.75;put(p,(.035+.035*aSeed.y)*uE);}`);
  // guardia: chispas aturdidoras que saltan de la concha
  a.count+=sparks(L.part,90,TR,`${f(A.x)},1.0,${f(A.z)}`,"0.,.25,0.",2.5,6,1.5);
  a.count+=points(L.part,10,C+`void main(){float an=aSeed.x*6.2832+uT*3.5;float on=smoothstep(TR,TR+.2,uT)*(1.-smoothstep(TX-.1,TX+.2,uT));
   vec3 p=vec3(AP.x+cos(an)*.55,2.55+sin(an*3.+uT*4.)*.06,AP.z+sin(an)*.55);vA=on*(.6+.4*sin(uT*14.+aSeed.y*9.));put(p,.13*on);}`,STAR4_FS);

  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR, build=ss(TF-0.08,TI,te), keep=1-ss(TX,TE-0.05,te), guard=win(te,TR,TR+0.15,TX-0.1,TX+0.2);
    caster.rotation.z=0.1*ss(0,TS,te)-0.12*ss(TS,TS+0.12,te)*(1-ss(TF,TI,te)); glowOn(caster,0.3*win(te,0,0.15,TS,TF));
    shell.visible=build>0.001&&keep>0.001; set(shell,build*1.01*(keep<1?keep:1),0.35*hitK(ia,3)+0.5*hitK(ir,4)+0.12);
    const env=win(te,TI-0.1,TI+0.1,TX,TE); veil.visible=env>0.001; set(veil,cl(ia/0.6),env*0.8);
    spikes.forEach(m=>{const g=ss(TR+m.userData.t*0.25,TR+0.12+m.userData.t*0.25,te)*(1-ss(TX-0.15,TX+0.1,te))*(m.userData.t<build?1:0);
      m.visible=g>0.01; m.scale.set(1,Math.max(g,0.001),1);}); spikeMat.uniforms.uA.value=hitK(ir,3);
    ribbon.visible=te>=TF-0.1&&te<TI+0.3; set(ribbon,cl((te-TF+0.1)/(TI-TF+0.1))*1.1,1-ss(TI,TI+0.3,te));
    set(glyph,ss(TS,TI,te),ss(TS,TS+0.2,te)*keep);
    let p=cl(ir/0.6); set(stun,p,ir>=0?1:0);
    U.uE.value=env;
    // aliado: brilla al sellarse y conserva un tono cálido mientras dura la concha
    glowOn(allies[0],0.7*hitK(ia,4)+0.18*env+0.4*hitK(ir,5));
    if(te<TS){o.g.copy(CB);o.gs=0.8;o.ga=0.3*ss(0,TS,te);o.li=1.6;}
    else if(te<TF){qb(CB,CC,AT,cl((te-TS)/(TF-TS-0.1)),tmp);o.g.copy(tmp);o.gs=1.1;o.ga=0.42;o.li=3;}
    else if(te<TR){o.g.set(A.x,1.2,A.z);o.gs=1.6+1.5*Math.max(ia,0);o.ga=0.35+0.4*hitK(ia,6);o.li=3+5*hitK(ia,4);}
    else{o.g.set(A.x,1.1,A.z);o.gs=2.2;o.ga=0.15*env+0.45*hitK(ir,6);o.li=2*env+5*hitK(ir,4);}
    o.ia=ia;o.c.set(A.x,1.0,A.z);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 6 · SPIKY WING (2 PA) — una corona de púas de quitina tornasolada se abre en la espalda y dispara esquirlas en todas
//     direcciones; siete espinas mayores trazan arcos y se clavan en el rival una tras otra
// =====================================================================
const spiky={key:"ieSpikyWing",name:"Spiky Wing",pa:2,dur:2.0,ti:0.8,pal:"Élitro",
  phases:[["Tensión",0],["Apertura",0.38],["Andanada",0.52],["Impacto",0.8],["Esquirlas",1.05],["Fin",1.6]],
build(a){
  const L=a.L,TO=0.38,TA=0.52,TI=0.8,TE=1.6,O0=V3(-3.95,1.4,0),NT=7,FLT=TI-TA;
  const rnd=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  // corona: púas radiales de largo irregular que se extienden con uP, color tornasol a lo largo
  const crown=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float cells=16.;float id=floor((an/6.2832+.5)*cells);float k=fract((an/6.2832+.5)*cells);
   float len=(.45+.55*hash(vec3(id,3.,1.)))*uP;float w=.45*(1.-r/max(len,.01));
   float spike=smoothstep(w,w-.06,abs(k-.5))*step(r,len)*step(.04,w);
   vec3 ir=.5+.5*cos(6.2832*(r*1.3+id*.07+uT*.4+vec3(0.,.33,.67)));
   float core=smoothstep(.3,0.,r);
   gl_FragColor=vec4(mix(mix(uC2,uC1,r/max(len,.01)),ir,.4)*1.5+vec3(1.)*core*.4,(spike*(.6+.4*r/max(len,.01))+core*.7)*uA);}`,{depthTest:false}));
  L.mesh.add(crown);
  // espinas mayores: conos de quitina oscura con brillo tornasol
  const thornMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   vec3 ir=.5+.5*cos(6.2832*(fr*.9+vP.y*1.5+uT*.5+vec3(0.,.33,.67)));
   gl_FragColor=vec4(vec3(.06,.05,.08)*${LIT}+mix(uC1,ir,.5)*fr*1.3+uC1*uA*.6,1.);}`,SOLID);
  const thornG=new THREE.ConeGeometry(0.07,0.6,8).rotateZ(-Math.PI/2);
  const TH=[...Array(NT)].map((_,i)=>{const s=V3(O0.x+0.1,O0.y+(rnd(i)-0.5)*0.4,(rnd(i+9)-0.5)*0.3);
    const e=V3(TC.x+0.05,TC.y+(i/(NT-1)-0.5)*0.75,(rnd(i+3)-0.5)*0.35);const h=0.3+0.7*rnd(i+5),t0=TA+i*0.024;
    const m=new THREE.Mesh(thornG,thornMat);L.mesh.add(m);
    const tr=new THREE.Mesh(pathTube((t,o)=>arcPt(s,e,h,t,o),20,50,6,0.03,0.012),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.45)discard;
     float fr=1.-abs(dot(normalize(vN),normalize(vV)));vec3 ir=.5+.5*cos(6.2832*(u*2.+vec3(0.,.33,.67)));
     gl_FragColor=vec4(mix(uC1,ir,.4)*1.5+vec3(1.)*exp(-d*30.)*.5,exp(-d*7.)*(.4+.6*fr)*uA);}`));L.trail.add(tr);
    return {s,e,h,t0,m,tr};});
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo: esquirlas caídas que destellan alrededor del lanzador y anillo bajo el rival
  const litter=groundPlane(5,-3.7,0.02,fx(`void main(){vec2 p=(vUv-.5)*5.;float r=length(p);vec2 g=p*7.;vec2 id=floor(g);vec2 fq=fract(g)-.5;
   float h=hash(vec3(id,7.));float on=step(.82,h)*step(r,uP*2.4)*smoothstep(2.5,1.,r);
   float ang=h*31.;vec2 q=vec2(cos(ang)*fq.x+sin(ang)*fq.y,-sin(ang)*fq.x+cos(ang)*fq.y);
   float sh=smoothstep(.06,0.,abs(q.y)*(1.+abs(q.x)*8.))*step(abs(q.x),.3);
   float tw=.5+.5*sin(uT*9.+h*40.);vec3 ir=.5+.5*cos(6.2832*(h+vec3(0.,.33,.67)));
   gl_FragColor=vec4(mix(uC1,ir,.4)*1.4,sh*on*(.4+.6*tw)*uA);}`));
  const tRing=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(litter,tRing);

  const C=`const float TO=${f(TO)};const float TA=${f(TA)};const float TI=${f(TI)};const float FLT=${f(FLT)};const vec3 O0=${v3(O0)};const vec3 HP=${v3(TC)};`;
  // tensión: motas tornasol que convergen a la espalda
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*(TO-.12);float life=.22;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=O0+normalize(rnd()+.001)*mix(1.,.06,k*k);vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.z);}`);
  // estallido radial de esquirlas (todas direcciones) que caen al suelo
  a.count+=points(L.part,240,C+`void main(){float s=TA+aSeed.x*.06;float life=.7+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(-.15,.25,0.))*(2.5+4.5*aSeed.z);vec3 p=O0+v*c+vec3(0.,-4.5*c*c,0.);
   vec3 vel=v+vec3(0.,-9.*c,0.);vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,.12+.1*aSeed.w);vMix=atan(vel.y,vel.x);}`,SHARD_FS);
  // andanada dirigida: esquirlas que vuelan al rival y quedan clavadas un instante
  a.count+=points(L.part,120,C+`void main(){float s=TA+aSeed.x*.12;float k=(uT-s)/FLT;vec3 r=rnd();
   vec3 e=HP+vec3(.05,r.y*.45,r.z*.4);vec3 st=O0+r*.15;float h=.25+.5*aSeed.w;float kk=clamp(k,0.,1.);
   vec3 p=mix(st,e,kk)+vec3(0.,4.*h*kk*(1.-kk),0.);vec3 d=e-st;float vy=d.y+4.*h*(1.-2.*kk);
   vA=(k>0.&&k<1.)?1.:(k>=1.?1.-clamp((k-1.)*FLT/.3,0.,1.):0.);put(p,.13+.07*aSeed.z);vMix=atan(vy,d.x);}`,SHARD_FS);
  TH.forEach(t=>{a.count+=sparks(L.part,18,t.t0+FLT,`${f(t.e.x)},${f(t.e.y)},${f(t.e.z)}`,"-.6,.2,0.",1.5,4.5,2);});

  const pv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, op=ss(TO-0.1,TA,te), ce=win(te,0.05,TO,TA+0.1,TA+0.4);
    caster.rotation.z=0.1*ss(0,TO,te)-0.18*ss(TO,TA,te)*(1-ss(TA+0.1,TI+0.2,te)); glowOn(caster,0.3*ce);
    towardCam(crown.position,tmp.set(O0.x-0.15,O0.y,0),0.2); billboard(crown,te*0.4); crown.visible=ce>0.001;
    crown.scale.setScalar(0.6+0.5*op); set(crown,0.25+0.75*op,ce);
    let kb=0, last=-1;
    TH.forEach((t,i)=>{const k=(te-t.t0)/FLT, emb=te-(t.t0+FLT);
      t.m.visible=k>0&&emb<0.45; t.tr.visible=k>0&&k<1.5;
      if(k>0){const kk=Math.min(k,1);arcPt(t.s,t.e,t.h,kk,t.m.position);arcPt(t.s,t.e,t.h,Math.min(kk+0.02,1),tmp);
        if(kk<1){pv.copy(tmp).sub(t.m.position).normalize();t.m.quaternion.setFromUnitVectors(XA,pv);}
        if(emb>0){t.m.position.x+=0.08*Math.exp(-emb*20)+target.position.x-3.4;t.m.scale.setScalar(1-ss(0.2,0.45,emb));}else t.m.scale.setScalar(1);}
      set(t.tr,Math.min(k,1)+Math.max(k-1,0)*0.5,1-ss(1,1.5,k));
      if(emb>=0){kb+=0.06*Math.exp(-emb*10);last=Math.max(last,t.t0+FLT);}});
    thornMat.uniforms.uA.value=op*(1-ss(TI,TI+0.3,te));
    let p=cl(ia/0.4); towardCam(hitRing.position,TC,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.5); set(tRing,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    set(litter,cl((te-TA-0.25)/0.5),ss(TA+0.25,TA+0.5,te)*(1-ss(TE-0.2,TE+0.3,te)));
    target.position.x=3.4+kb; target.rotation.z=-kb*1.4*Math.cos((te-TI)*24);
    if(te<TA){o.g.copy(O0);o.gs=0.8+0.8*op;o.ga=0.25+0.3*op;o.li=1.5+3*op;}
    else if(te<TI){o.g.lerpVectors(O0,TC,cl((te-TA)/FLT));o.gs=1.3;o.ga=0.45;o.li=4;}
    else{const il=te-last;o.g.copy(TC);o.gs=1.3+2.4*Math.min(ia,0.5);o.ga=Math.exp(-il*10)*0.5+0.25*Math.exp(-ia*5);o.li=6*Math.exp(-ia*4);}
    o.ia=last>0?te-last:ia;o.c.copy(TC);o.shake=0;o.dist=0.7;o.flash=0.85;
  };
}};

VFX.module("Bicho · Espalda",[buzz,worm,sandal,scarab,snail,spiky]);
})();

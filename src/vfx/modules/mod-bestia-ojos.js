// =====================================================================
// MÓDULO · CLASE BESTIA (OJOS)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Motivo común: un par de ojos luminosos en billboard que siguen la pose del lanzador; cada habilidad
// les da su propio "estilo de mirada" (cuerpo GLSL) y los enciende a su ritmo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,BURST_FS,SCORCH_FS,BUBBLE_FS,
  caster,target,allies,ALLY_POS}=VFX;
const {tileFractureFS,NB,SOLID,v3,fireFS,CHIP_FS,DUST_FS,FLAME_FS,CHEVRON_FS,STAR4_FS,SMOKE_FS,billboard,towardCam}=VFX.lib;

VFX.palette("Miel",["#ffe1a1","#ff8a5b"]);
VFX.palette("Ácido",["#e2ff5a","#6fbf1a"]);
VFX.palette("Estática",["#ffeec0","#ff7414"]);

const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmpE=V3(0,0,0);
const jh=n=>{const s=Math.sin(n*12.9898+78.233)*43758.5453;return s-Math.floor(s);};   // hash JS determinista
const arrV=(n,vs)=>`const vec3 ${n}[${vs.length}]=vec3[${vs.length}](${vs.map(v3).join(",")});`;
const arrF=(n,xs)=>`const float ${n}[${xs.length}]=float[${xs.length}](${xs.map(f).join(",")});`;
// uniforms de partículas con extras propios
const PU=(extra,more)=>Object.assign({uniforms:Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},extra)},more||{});

// punto local del lanzador (o de otro muñeco) → mundo, con su posición, giro en z y escala (sin matrices)
function localW(l,out,d=caster){const r=d.rotation.z,c=Math.cos(r),s=Math.sin(r),x=l.x*d.scale.x,y=l.y*d.scale.y;
  return out.set(d.position.x+x*c-y*s,d.position.y+x*s+y*c,d.position.z+l.z*d.scale.z);}
const EYE_L=[V3(0.23,1.66,-0.1),V3(0.23,1.66,0.1)];
const eyeW=(i,out)=>localW(EYE_L[i],out);

// ---------- ojos: estructura común + estilo de mirada ----------
// p: -1..1 en el billboard, r: radio; uQ: parámetro del estilo; uI: 0/1 (ojo); uP: destello anamórfico
const EYE=body=>`uniform float uQ;uniform float uI;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);vec3 c=vec3(0.);float al=0.;
 ${body}
 float streak=exp(-abs(p.y)*26.)*smoothstep(1.,0.,abs(p.x))*uP;
 c+=mix(uC1,vec3(1.),.5)*streak*1.5;al+=streak;
 gl_FragColor=vec4(c,min(al,1.6)*uA);}`;
function mkEyes(L,body,size=0.38){
  const ms=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),fxU(EYE(body),{uQ:{value:0},uI:{value:i}}));L.mesh.add(m);return m;});
  return (a,p,q,ang=0)=>ms.forEach((m,i)=>{eyeW(i,tmpE);towardCam(m.position,tmpE,0.12);billboard(m,ang);
    m.visible=a>0.002;set(m,p,a);m.material.uniforms.uQ.value=q;});
}
// estilos de mirada
const EYE_GLARE=`float s=uI*2.-1.;float ca=cos(.42*s),sa=sin(.42*s);vec2 q=vec2(ca*p.x-sa*p.y,sa*p.x+ca*p.y);
 float h=(.34-.24*uQ)*(1.-q.x*q.x/.42);
 float slit=smoothstep(.05,-.02,abs(q.y)-max(h,0.))*step(abs(q.x),.65);
 float core=smoothstep(.14,0.,abs(q.y))*smoothstep(.5,0.,abs(q.x));
 float halo=pow(max(0.,1.-r),2.2)*.55;
 c=mix(uC2,uC1,core)*1.7*slit+vec3(1.)*core*slit*.6+uC2*halo;al=slit*.9+halo*(.4+uQ*.6);`;
const EYE_AIM=`float an=atan(p.y,p.x);
 float iris=band(r,.42,.06)+band(r,.64,.03)*step(.5,fract(an/6.2832*8.+uT*.9));
 float pupil=smoothstep(.17,.09,r);
 float cr=(smoothstep(.035,0.,abs(p.x))+smoothstep(.035,0.,abs(p.y)))*step(r,.75)*step(.22,r)*.55;
 float halo=pow(max(0.,1.-r),2.5)*.5;
 c=mix(uC2,uC1,iris+pupil)*1.6*(iris+pupil+cr)+uC1*halo*(.5+uQ)+vec3(1.)*pupil*uQ;
 al=(iris+pupil+cr)*.9+halo*(.4+uQ);`;
const EYE_FLAME=`float h=p.y*.5+.5;float n=noise(vec3(p.x*4.,p.y*3.-uT*9.,uI*5.));
 float w=.6*(1.-h)+.06;
 float fl=smoothstep(w,w-.3,abs(p.x+(n-.5)*.4*h))*smoothstep(1.,.25,h+(n-.5)*.35)*step(-.75,p.y)*uQ;
 float core=smoothstep(.34,0.,length(p+vec2(0.,.25)));
 float halo=pow(max(0.,1.-r),2.)*.45;
 c=mix(uC2,uC1,core+fl*.35)*1.7*(fl+core)+vec3(1.)*core*.7+uC2*halo;al=fl*.9+core+halo*(.4+uQ*.5);`;
const EYE_PUPPY=`float iris=smoothstep(.62,.55,r);float ring=band(r,.6,.05);
 float hl=smoothstep(.2,.12,length(p-vec2(-.2,.22)));float hl2=smoothstep(.1,.05,length(p-vec2(.22,-.18)));
 vec2 g=abs(p);float star=smoothstep(.06,0.,g.x*g.y*8.+min(g.x,g.y)*.6)*smoothstep(1.,.1,max(g.x,g.y))*uQ;
 float halo=pow(max(0.,1.-r),2.)*.5;
 c=mix(uC2,uC1,1.-r)*.8*iris+uC1*ring*1.4+vec3(1.)*(hl+hl2)*1.2+mix(uC1,vec3(1.),.6)*star*1.6+uC1*halo;
 al=iris*.45+ring+hl+hl2+star+halo*(.5+uQ);`;
const EYE_TEAR=`vec2 q=p+vec2(0.,.05*sin(uT*7.+uI*2.));float e=length(q*vec2(1.,1.2));
 float wob=noise(vec3(q*4.,uT*3.));
 float iris=smoothstep(.55,.47,e);float rimw=band(e,.5+.05*wob,.06);
 float hl=smoothstep(.18,.08,length(q-vec2(-.18,.2)))+smoothstep(.08,.03,length(q-vec2(.2,.05)));
 float tearL=smoothstep(.1,0.,abs(p.x-.08*sin(p.y*7.+uT*3.)))*smoothstep(-.35,-1.,p.y)*uQ;
 float halo=pow(max(0.,1.-r),2.)*.5;
 c=mix(uC2,uC1,wob)*iris*.8+uC1*rimw*1.4+vec3(1.)*hl+uC1*tearL*1.6+uC1*halo;
 al=iris*.4+rimw+hl+tearL+halo*.8;`;
const EYE_VOLT=`float an=atan(p.y,p.x);float fl=floor(uT*22.);
 float iris=band(r,.4,.08)*(.65+.35*hash(vec3(fl,uI,1.)));
 float pupil=smoothstep(.2,.1,r);
 float sec=floor(an*1.2732+4.);
 float zz=abs(fract(r*3.+hash(vec3(sec,fl,uI))*.7)-.5);
 float ray=smoothstep(.1,0.,abs(fract(an*1.2732)-.5+(zz-.25)*.5)*r)*step(.45,r)*smoothstep(1.,.5,r)*step(.5,hash(vec3(sec,fl,uI+3.)))*uQ;
 float halo=pow(max(0.,1.-r),2.)*.5;
 c=mix(uC2,uC1,pupil+iris*.5)*1.6*(iris+pupil)+mix(uC1,vec3(1.),.4)*ray*1.8+uC2*halo;
 al=iris+pupil+ray+halo*(.5+uQ);`;

// partículas propias
const FURY_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2*vec3(1.,.7,.45),mix(uC1,vec3(1.),.4),smoothstep(.25,0.,d)*.8)*1.6,a);}`;
const TEAR_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float y=q.y+.1;
 float w=y<0.?sqrt(max(.04-y*y,0.)):.2*(1.-y/.42);
 float m=smoothstep(.02,-.02,abs(q.x)-w)*step(-.3,y)*step(y,.42);
 float hl=smoothstep(.07,0.,length(q-vec2(-.06,-.08)));
 float a=(m*.8+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.6+.4*q.y)*1.3+vec3(1.)*hl*.8,a);}`;
const PETAL_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float an=vMix*6.2832+uT*(1.2+vMix);float c=cos(an),s=sin(an);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float e=length(vec2(q.x*2.3,q.y+q.x*q.x*1.5));
 float petal=smoothstep(.44,.36,e);float vein=smoothstep(.03,0.,abs(q.x))*smoothstep(.38,0.,abs(q.y))*.45;
 float a=petal*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.55+q.y)*1.3+vec3(1.)*vein,a);}`;
const MOTE_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,uC2,vMix*.5)*1.4+vec3(1.)*smoothstep(.18,0.,d)*.6,a);}`;
// fogonazo: estrella de rayos irregulares con núcleo blanco
const FLASH_FS=`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float rays=pow(abs(sin(an*4.+uQ*7.)),8.)*smoothstep(1.,.1,r)+pow(abs(sin(an*7.+uQ*3.)),16.)*smoothstep(.8,.05,r)*.7;
 float core=smoothstep(.45,0.,r);
 gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.),.6),core)*1.8,(rays*(1.-uP*.6)+core)*uA);}`;

// =====================================================================
// 1 · CHUBBY — zarpazo pesadísimo: pata espectral que cae, garra gruesa, polvo en anillo; el rival se aplasta
//     (nivel 3: el suelo se parte en baldosas bajo el rival; el hit-stop lo pone el motor)
// =====================================================================
const chubby={key:"chubby",name:"Chubby",dur:3.0,ti:0.98,pal:"Ámbar",
  phases:[["Avance",0],["Anticipación",0.45],["Zarpazo",0.82],["Impacto",0.98],["Polvo",1.15],["Regreso",2.2]],
build(a){
  const L=a.L,TH=0.45,TR=0.82,TI=0.98,XS=1.75,CH=V3(3.12,1.15,0),GC=V3(3.4,0,0),PW=V3(2.7,2.75,0.25);
  const eyes=mkEyes(L,EYE_GLARE);
  // garra: tres surcos muy anchos con estela de "peso" larga detrás del barrido
  const claw=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.8),fx(`void main(){vec2 p=vUv;float u=p.x;float m=0.,core=0.;
   for(int i=0;i<3;i++){float off=(float(i)-1.)*.2;float y=(p.y-.5-off)-.1*(1.-pow(2.*u-1.,2.));
    float w=.02+.085*pow(sin(3.14159*u),.7);
    m=max(m,smoothstep(w,w*.4,abs(y)));core=max(core,smoothstep(w*.35,0.,abs(y)));}
   float d=uP-u;float sweep=step(0.,d)*exp(-d*1.1)*smoothstep(0.,.05,u)*smoothstep(1.,.88,u);
   float n=noise(vec3(u*6.-uT*3.,p.y*10.,1.));
   gl_FragColor=vec4(mix(uC2,uC1,core+n*.3)*1.6+vec3(1.)*core*.5,(m*(.55+.45*n)+core)*sweep*uA);}`,{depthTest:false}));
  // pata espectral: almohadilla + cuatro dedos (SDF), cuelga sobre el rival y cae con el golpe
  const paw=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(`void main(){vec2 p=(vUv-.5)*2.2;
   float pad=length((p-vec2(0.,-.28))*vec2(1.,1.2))-.42;
   float toes=1e3;for(int i=0;i<4;i++){float an=(float(i)-1.5)*.5;vec2 c=vec2(sin(an)*.6,.28+cos(an)*.22);toes=min(toes,length((p-c)*vec2(1.,.85))-.16);}
   float d=min(pad,toes);
   float fill=smoothstep(.03,-.03,d);float rim=band(d,0.,.05);float halo=smoothstep(.35,0.,d)*.3;
   float n=noise(vec3(p*4.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,rim+n*.3)*1.5+vec3(1.)*rim*.4,(fill*(.3+.25*n)+rim+halo)*uA);}`,{depthTest:false}));
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),fx(RING_FS,{depthTest:false}));
  L.trail.add(claw); L.mesh.add(paw,hitRing);
  const C=`const float TH=${f(TH)};const float TR=${f(TR)};const float TI=${f(TI)};const vec3 GC=${v3(GC)};const vec3 CH=${v3(CH)};const vec3 PW=${v3(PW)};`;
  // peso que se concentra en la pata mientras se alza
  a.count+=points(L.part,160,C+`void main(){float s=TH+aSeed.x*(TR-TH-.05);float life=.25+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=PW+d*mix(1.4,.05,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.05*aSeed.z);}`);
  // polvo al aterrizar del avance
  a.count+=points(L.part,50,C+`void main(){float s=TH+aSeed.x*.05;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(XS)}+cos(an)*(.3+.9*(1.-exp(-t*4.))),.08+t*.3,sin(an)*(.3+.9*(1.-exp(-t*4.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.3+.3*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // onda circular de polvo rasante
  a.count+=points(L.part,360,C+`void main(){float s=TI+aSeed.x*.12;float life=1.1+aSeed.y*.8;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=.3+(2.8+1.6*aSeed.w)*(1.-exp(-t*2.8));
   vec3 p=GC+vec3(cos(an)*rd,.1+(.25+.5*aSeed.y)*(1.-exp(-t*2.))+t*.15,sin(an)*rd);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age):0.;put(p,(.55+.65*aSeed.y)*(.6+age*.9));}`,DUST_FS,NB);
  // esquirlas del suelo
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.06;float life=.75+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float sp=1.8+4.5*aSeed.w;vec3 v=vec3(cos(an)*sp,2.8+4.5*aSeed.y,sin(an)*sp);
   vec3 p=GC+vec3(0.,.1,0.)+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.08*aSeed.z);}`,CHIP_FS);
  a.count+=sparks(L.part,260,TI,`${f(CH.x)},${f(CH.y)},0.`,".2,-.3,0.",4,10,4);
  // suelo: anillo de polvo (mezcla normal), onda de choque y fractura de baldosas bajo el rival
  const dustRing=groundPlane(10.5,GC.x,0.025,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(an*5.,r*6.-uT*2.,1.))*.6+noise(vec3(p*14.,2.))*.4;
   float w=.06+.16*uP;float m=smoothstep(w,0.,abs(r-uP*.92+(n-.5)*.12))*(.5+.6*n);
   float inner=smoothstep(uP*.92,0.,r)*.25*n;
   gl_FragColor=vec4(mix(vec3(.4,.32,.24),uC1*.6,.25),(m+inner)*uA*.85);}`,NB));
  const shock=groundPlane(9,GC.x,0.03,fx(RING_FS));
  const crater=groundPlane(6.5,GC.x,0.025,fx(tileFractureFS(6.5)));
  L.decal.add(dustRing,shock,crater);
  a.pose=function(te,o){
    const ia=te-TI, iq=ia, hop=cl(te/TH);
    const rear=ss(TH+0.05,TR,te), sl=cl((te-TR)/(TI-TR)), slam=sl*sl*sl, rec=ss(TI+0.1,TI+0.75,te);
    const x=te<TH?-3.7+(XS+3.7)*ss(0,1,hop):XS-(XS+3.7)*ss(2.2,2.8,te);
    caster.position.set(x,(te<TH?0.5*Math.sin(Math.PI*hop):0)+0.16*rear*(1-slam),0);
    caster.rotation.z=0.42*rear*(1-slam)-0.55*slam*(1-rec);
    const land=te>=TH?Math.exp(-(te-TH)*9)*ss(TH,TH+0.03,te):0, imp=ia>=0?Math.exp(-iq*5):0, up=rear*(1-slam);
    caster.scale.set(1+0.12*land-0.05*up+0.14*imp,1-0.15*land+0.12*up-0.16*imp,1+0.12*land-0.05*up+0.14*imp);
    eyes((0.4+0.6*ss(TH,TR,te))*(1-ss(2.5,2.9,te)),0.35*up+1.3*(ia>=0?Math.exp(-iq*5):0),rear);
    // pata y garra
    const app=ss(TH,TH+0.25,te), pf=ia>=0?1-cl(iq/0.25):1;
    tmp.copy(PW).lerp(CH,slam); tmp.y+=te<TR?0.05*Math.sin(te*9):0; towardCam(paw.position,tmp,0.5); billboard(paw,-0.35);
    paw.visible=app*pf>0.002; paw.scale.set(0.9*app*(1+0.35*slam),0.9*app*(1+0.35*slam)*(ia>=0?1-0.4*cl(iq/0.25):1),1);
    paw.material.uniforms.uA.value=app*pf*(0.6+0.4*slam);
    towardCam(claw.position,CH,0.7); billboard(claw,-1.15);
    claw.visible=te>=TR&&ia<0.75; set(claw,sl*1.15+(ia>0?ia*0.3:0),ia>=0?1-cl(iq/0.7):1);
    let p=cl(ia/0.5); towardCam(hitRing.position,CH,0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(iq/1.3); set(dustRing,1-Math.pow(1-p,2),ia>=0?1-ss(0.7,1.7,iq):0);
    p=cl(ia/0.65); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(crater,1-Math.pow(1-cl(ia/0.45),2),ia>=0?1-ss(1.1,1.95,iq):0);
    // el rival se aplasta y rebota
    const hit=ia>=0?Math.exp(-iq*4):0;
    target.scale.set(1+0.3*hit,1-0.45*hit+0.08*hit*Math.sin(iq*22),1+0.3*hit); target.rotation.z=-0.08*hit*Math.sin(iq*25); target.position.x=3.4+0.14*hit;
    if(te<TR){o.g.copy(PW);o.gs=1.2*app;o.ga=0.35*app;o.li=3*app;}
    else if(ia<0){o.g.copy(paw.position);o.gs=1.6;o.ga=0.6;o.li=6;}
    else{o.g.set(GC.x,0.7,0);o.gs=2.4+6*ia;o.ga=Math.exp(-ia*8)*0.95;o.li=15*Math.exp(-ia*3.5);}
    o.ia=ia;o.c.copy(CH);o.shake=1.8;o.dist=1.4;
  };
}};

// =====================================================================
// 2 · LITTLE PEAS — tres guisantes dorados que rebotan (rival → suelo → suelo) con fogonazos de pólvora
// =====================================================================
const peas={key:"peas",name:"Little Peas",dur:2.1,ti:0.58,pal:"Dorado",
  phases:[["Puntería",0],["Disparos",0.22],["Impactos",0.58],["Rebotes",0.8],["Fin",1.7]],
build(a){
  const L=a.L,LS=[0.22,0.33,0.44],FL=0.36,P0=V3(-3.4,1.5,0),TI=LS[0]+FL;
  const H=[V3(3.12,1.35,-0.14),V3(3.1,1.05,0.12),V3(3.14,1.6,0.04)];
  const B1=[V3(2.1,0.07,-1.0),V3(1.7,0.07,0.8),V3(2.45,0.07,1.25)];
  const D2=[V3(-0.95,0,-0.55),V3(-1.05,0,0.5),V3(-0.7,0,0.75)], D3=[V3(-0.4,0,-0.25),V3(-0.45,0,0.2),V3(-0.3,0,0.35)];
  const ARC=[0.95,0.75,1.15];
  // cada guisante: tramos parabólicos {t0,t1,A,B,h}; la misma tabla genera el JS y el GLSL
  const PE=LS.map((l0,i)=>{const B2=B1[i].clone().add(D2[i]),B3=B2.clone().add(D3[i]);
    const pts=[P0,H[i],B1[i],B2,B3],du=[FL,0.34,0.26,0.16],hs=[ARC[i],0.7,0.3,0.1];
    let t=l0;const segs=du.map((d,k)=>{const s={t0:t,t1:t+d,A:pts[k],B:pts[k+1],h:hs[k]};t+=d;return s;});
    return {l0,segs,end:t,hit:l0+FL};});
  const peaAt=(pe,te,out)=>{let s=pe.segs[pe.segs.length-1];for(const q of pe.segs)if(te<q.t1){s=q;break;}
    const k=cl((te-s.t0)/(s.t1-s.t0));out.lerpVectors(s.A,s.B,k);out.y+=4*s.h*k*(1-k);return out;};
  const peaGL=pe=>`vec3 pea(float t){float k;`+pe.segs.map((s,i)=>{const b=`k=clamp((t-${f(s.t0)})/${f(s.t1-s.t0)},0.,1.);return mix(${v3(s.A)},${v3(s.B)},k)+vec3(0.,${f(4*s.h)}*k*(1.-k),0.);`;
    return i<pe.segs.length-1?`if(t<${f(s.t1)}){${b}}`:b;}).join("")+`}`;
  // eventos de rebote: rival (grande), primer bote, segundo bote
  const EV=[];PE.forEach((pe,i)=>{EV.push({t:pe.segs[0].t1,p:pe.segs[0].B,s:1});EV.push({t:pe.segs[1].t1,p:pe.segs[1].B,s:0.7});EV.push({t:pe.segs[2].t1,p:pe.segs[2].B,s:0.45});});
  const EG=arrV("EP",EV.map(e=>e.p))+arrF("ET",EV.map(e=>e.t))+arrF("ES",EV.map(e=>e.s));
  const eyes=mkEyes(L,EYE_AIM);
  // guisante: oro pulido opaco con brillo especular y borde naranja
  const peaMat=fx(`void main(){vec3 n=normalize(vN);vec3 ld=normalize(vec3(.3,.8,.5));
   float lit=.35+.65*max(0.,dot(n,ld));float fr=pow(1.-abs(dot(n,normalize(vV))),2.);
   float spec=pow(max(0.,dot(reflect(-normalize(vV),n),ld)),24.);float g=noise(vP*40.);
   vec3 gold=mix(vec3(.75,.5,.08),uC1,.5+.2*g);
   gl_FragColor=vec4(gold*lit*1.2+uC2*fr*1.4+vec3(1.)*spec,1.);}`,SOLID);
  const peaM=PE.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.085,20,14),peaMat);L.mesh.add(m);return m;});
  const muzzle=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),fx(RING_FS,{depthTest:false})); L.mesh.add(muzzle);
  const flashes=EV.map((e,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fxU(FLASH_FS,{uQ:{value:i*1.7+0.3}},{depthTest:false}));L.mesh.add(m);return m;});
  // estela de furia naranja de cada guisante
  PE.forEach(pe=>{a.count+=points(L.part,90,peaGL(pe)+`void main(){float s=${f(pe.l0)}+pow(aSeed.x,1.5)*${f(pe.end-pe.l0)};float life=.22+aSeed.y*.28;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=pea(s)+r*.05+vec3(r.x*.25,.45+r.y*.2,r.z*.25)*t;
     vA=(age>0.&&age<1.)?(1.-age)*(.7+.3*sin(t*40.+aSeed.z*30.)):0.;put(p,(.055+.05*aSeed.w)*(1.-age*.6));}`,FURY_FS);});
  // chispas de pólvora y humo gris en cada rebote
  a.count+=points(L.part,200,EG+`void main(){int e=min(int(aSeed.x*9.),8);float s=ET[e]+aSeed.y*.03;float life=.22+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.9,0.));vec3 p=EP[e]+d*(1.+2.2*aSeed.w)*ES[e]*t+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.02);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*step(.5,fract(t*30.+aSeed.z*7.))):0.;put(p,(.03+.03*aSeed.w)*(.6+ES[e]*.6));}`);
  a.count+=points(L.part,90,EG+`void main(){int e=min(int(aSeed.x*9.),8);float s=ET[e]+.03+aSeed.y*.05;float life=.4+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=EP[e]+r*.1*ES[e]+vec3(0.,t*.6,0.)+r*.35*t*ES[e];
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.2+.2*aSeed.w)*ES[e]*(.5+age*1.1));}`,SMOKE_FS("vec3(.5,.48,.46)"),NB);
  PE.forEach((pe,i)=>{a.count+=sparks(L.part,50,pe.hit,`${f(H[i].x)},${f(H[i].y)},${f(H[i].z)}`,"-.6,.4,0.",2.5,6.5,3);});
  // marcas de pólvora en el suelo donde bota
  const marks=EV.filter(e=>e.s<1).map(e=>{const m=groundPlane(0.4+0.5*e.s,e.p.x,0.016,fx(SCORCH_FS));m.position.z=e.p.z;m.userData=e;L.decal.add(m);return m;});
  a.pose=function(te,o){
    let pulse=0,last=-1,lastE=null;
    LS.forEach(l=>{if(te>=l){pulse+=Math.exp(-(te-l)*12);last=l;}});
    caster.rotation.z=0.08*ss(0,LS[0],te)*(1-ss(LS[2],LS[2]+0.3,te))+0.1*pulse;
    caster.position.x=-3.7-0.05*pulse;
    eyes(0.5+0.5*ss(0,0.18,te)*(1-ss(1.5,1.95,te)),0.45*pulse,ss(0,0.18,te)*0.4+0.8*pulse);
    PE.forEach((pe,i)=>{const m=peaM[i];peaAt(pe,te,m.position);m.visible=te>=pe.l0&&te<pe.end+0.25;
      m.scale.setScalar(Math.max(1-cl((te-pe.end)/0.25),0.001)*(1+0.25*Math.exp(-Math.abs(te-pe.segs[0].t1)*30)));});
    let p=last>=0?cl((te-last)/0.16):1; towardCam(muzzle.position,P0,0.3); billboard(muzzle); muzzle.visible=p<1; set(muzzle,p,1-p);
    EV.forEach((e,i)=>{const m=flashes[i],k=cl((te-e.t)/0.13);m.visible=te>=e.t&&k<1;towardCam(m.position,e.p,0.3);billboard(m,i*0.7);
      m.scale.setScalar(e.s*(0.4+0.7*k));set(m,k,1-k);if(te>=e.t&&(!lastE||e.t>lastE.t))lastE=e;});
    for(const m of marks){const e=m.userData;m.material.uniforms.uA.value=te>=e.t?0.6*(1-cl((te-e.t)/0.5)):0;}
    // el rival encaja los tres golpes
    let kb=0,rz=0,lh=-1;
    PE.forEach(pe=>{if(te>=pe.hit){const d=te-pe.hit,e=Math.exp(-d*8);kb+=e;rz+=e*Math.cos(d*18);lh=pe.hit;}});
    target.position.x=3.4+0.08*kb; target.rotation.z=-0.1*rz;
    let fly=-1;PE.forEach((pe,i)=>{if(te>=pe.l0&&te<pe.hit)fly=i;});
    if(fly>=0){peaAt(PE[fly],te,o.g);o.gs=0.75;o.ga=0.4;o.li=2.5;}
    else if(lastE){const d=te-lastE.t;o.g.copy(lastE.p);o.gs=0.8+1.6*d;o.ga=Math.exp(-d*13)*0.65*lastE.s;o.li=6*Math.exp(-d*7)*lastE.s+0.4;}
    else{eyeW(1,o.g);o.gs=0.6;o.ga=0.25*ss(0,0.25,te);o.li=1.2;}
    o.ia=lh>=0?te-lh:te-TI;o.c.set(3.1,1.3,0);o.shake=0;o.dist=0.5;
  };
}};

// =====================================================================
// 3 · ZEAL — ojos en llamas; el fuego baja por el cuerpo a las garras, carrera con huellas ardientes y zarpazo
//     (nivel 1: todo rápido y pequeño; pocas huellas breves y llamas de ojos sutiles)
// =====================================================================
const zeal={key:"zeal",name:"Zeal",dur:1.3,ti:0.42,pal:"Fuego",
  phases:[["Ojos en llamas",0],["Canalización",0.08],["Carrera",0.16],["Zarpazo",0.36],["Huellas",0.55]],
build(a){
  const L=a.L,TC=0.08,TR=0.16,TS=0.36,TI=0.42,XE=1.9,RD=TS-TR,D=XE+3.7,CH=V3(3.15,1.2,0),NP=4;
  const runX=te=>-3.7+D*Math.pow(cl((te-TR)/RD),1.25);
  const eyes=mkEyes(L,EYE_FLAME,0.32);
  // grupos que siguen al lanzador: el canal de fuego y las llamas viven en sus coordenadas locales
  const rigM=new THREE.Group(), rigP=new THREE.Group(); L.mesh.add(rigM); L.part.add(rigP);
  const CHANNEL_FS=`void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*14.-uT*9.,vUv.y*6.2832,uT*2.))*.6+noise(vec3(u*30.-uT*15.,vUv.y*12.,1.))*.4;
   float core=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
   float head=smoothstep(.1,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(uC2,uC1,n*core+head)*1.6+vec3(1.)*head*.6,(smoothstep(.3,.75,n)*.8+core*.5+head)*uA);}`;
  const chans=[-1,1].map(s=>{const pts=[[0.25,1.64,0.1],[0.33,1.48,0.15],[0.38,1.25,0.2],[0.44,0.95,0.21],[0.47,0.6,0.21],[0.47,0.3,0.2],[0.44,0.06,0.2]].map(q=>V3(q[0],q[1],q[2]*s));
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),80,0.028,8,false),fx(CHANNEL_FS));rigM.add(m);return m;});
  // garras encendidas en las patas
  const PAW_L=[V3(0.47,0.1,-0.2),V3(0.47,0.1,0.2)];
  const pawG=PAW_L.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34),fx(`void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<3;i++){vec2 c=vec2((float(i)-1.)*.35,.1);m=max(m,smoothstep(.22,0.,length((p-c)*vec2(2.2,1.))));}
   float g=pow(max(0.,1.-length(p)),2.)*.6;float n=noise(vec3(p*3.,uT*6.));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.7+vec3(1.)*m*.4,(m*(.6+.5*n)+g)*uA);}`));L.mesh.add(m);return m;});
  // zarpazo final ascendente: tres surcos finos con lenguas de fuego
  const claw=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.25),fx(`void main(){vec2 p=vUv;float u=p.x;float m=0.;
   for(int i=0;i<3;i++){float off=(float(i)-1.)*.14;float y=(p.y-.5-off)+.14*(1.-pow(2.*u-1.,2.));
    float w=.012+.04*sin(3.14159*u);m=max(m,smoothstep(w,0.,abs(y)));}
   float n=noise(vec3(u*8.-uT*5.,p.y*9.+uT*4.,uT));
   float d=uP-u;float sweep=step(0.,d)*exp(-d*2.)*smoothstep(0.,.06,u)*smoothstep(1.,.9,u);
   float lick=smoothstep(.55,.85,n)*smoothstep(.3,0.,abs(p.y-.55))*.5;
   float fl=m*(.5+.8*n)+lick*step(0.,d)*exp(-d*3.);
   gl_FragColor=vec4(mix(uC2,uC1,fl)*1.7+vec3(1.)*smoothstep(.8,1.2,fl)*.5,fl*sweep*uA);}`,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(BURST_FS)); burst.position.copy(CH);
  const tFire=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.5,1.3,36,10,true),fx(fireFS(1.3,3.6))); tFire.position.set(3.4,0.65,0);
  L.trail.add(claw); L.mesh.add(burst,tFire);
  const uRun={value:0},uFe={value:0},uFp={value:0};
  // llamas de los ojos (se tumban hacia atrás al correr)
  a.count+=points(rigP,40,`uniform float uRun;uniform float uFe;void main(){float life=.25+aSeed.y*.15;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sd=aSeed.w>.5?1.:-1.;vec3 e=vec3(.25,1.68,.1*sd);
   vec3 p=e+vec3((r.x-.5)*.04-age*(.08+.4*uRun),age*(.2-.1*uRun)+.02,(r.z-.5)*.04);
   vA=(k>=1.)?sin(age*3.14159)*.6*uFe:0.;put(p,(.06+.04*r.y)*(1.-age*.5));}`,FLAME_FS,PU({uRun,uFe}));
  // llamas en las garras
  a.count+=points(rigP,40,`uniform float uRun;uniform float uFp;void main(){float life=.2+aSeed.y*.12;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sd=aSeed.w>.5?1.:-1.;vec3 e=vec3(.47+(r.x-.5)*.12,.06,.2*sd+(r.z-.5)*.1);
   vec3 p=e+vec3(-age*(.08+.45*uRun),age*(.22-.08*uRun),0.);
   vA=(k>=1.)?sin(age*3.14159)*.8*uFp:0.;put(p,(.07+.05*r.y)*(1.-age*.4));}`,FLAME_FS,PU({uRun,uFp}));
  // huellas: posiciones y tiempo en que la pata pisa cada una
  const PX=[],PZ=[],PT=[];
  for(let i=0;i<NP;i++){const x=-3.0+i*(2.2+3.0)/(NP-1),k=Math.pow(cl((x-0.44+3.7)/D),1/1.25);PX.push(x);PZ.push(i%2?0.2:-0.2);PT.push(TR+k*RD);}
  const PG=`const vec2 PP[${NP}]=vec2[${NP}](${PX.map((x,i)=>`vec2(${f(x)},${f(PZ[i])})`).join(",")});`+arrF("PT",PT);
  // la misma forma de huella, en capa aditiva (brasa) y en capa normal (quemadura oscura)
  const SX=-3.95,SW=7.0,SH=1.0;
  const printFS=dark=>PG+`void main(){vec2 w=vec2(${f(SX)}+vUv.x*${f(SW)},(.5-vUv.y)*${f(SH)});float m=0.,hot=0.;
   for(int i=0;i<${NP};i++){float age=uT-PT[i];if(age<0.)continue;
    vec2 q=(w-PP[i])/.14;
    float pad=length((q-vec2(-.25,0.))*vec2(1.1,1.))-.38;
    float toes=1e3;for(int j=0;j<3;j++){float o=(float(j)-1.)*.42;toes=min(toes,length((q-vec2(.32,o))*vec2(1.,1.2))-.16);}
    float cl_=1e3;for(int j=0;j<3;j++){float o=(float(j)-1.)*.48;vec2 c=q-vec2(.78,o*1.1);cl_=min(cl_,max(abs(c.y-c.x*o*.3)-.05*(1.-c.x*1.6),abs(c.x)-.25));}
    float d=min(min(pad,toes),cl_);float sh=smoothstep(.06,-.04,d);
    float n=noise(vec3(q*4.,float(i)+uT*2.));
    ${dark?`m=max(m,sh*smoothstep(.08,.35,age)*(.6+.4*n)*.7);`:`m=max(m,sh*(.35+.65*n)*smoothstep(.55,0.,age));hot=max(hot,sh*exp(-age*10.));`}}
   ${dark?`gl_FragColor=vec4(vec3(.05,.03,.02),m*.75*uA);`:`gl_FragColor=vec4(mix(uC2,uC1,hot+m*.3)*1.6+vec3(1.)*hot*.7,(m+hot)*uA);`}}`;
  const prints=groundPlane(SW,SX+SW/2,0.02,fx(printFS(false)),SH), char=groundPlane(SW,SX+SW/2,0.017,fx(printFS(true),NB),SH);
  const scorch=groundPlane(1.2,3.4,0.015,fx(SCORCH_FS));
  L.decal.add(char,prints,scorch);
  // brasas y humo de cada huella
  a.count+=points(L.part,50,PG+`void main(){int e=min(int(aSeed.x*${f(NP)}),${NP-1});float s=PT[e]+aSeed.y*.2;float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(PP[e].x+r.x*.12,.03+t*(.4+.4*aSeed.w),PP[e].y+r.z*.08)+vec3(sin(t*6.+r.y*9.)*.04,0.,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.z*40.)):0.;put(p,(.02+.03*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,20,PG+`void main(){int e=min(int(aSeed.x*${f(NP)}),${NP-1});float s=PT[e]+.05+aSeed.y*.2;float life=.4+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(PP[e].x+r.x*.1,.06+t*.5,PP[e].y+r.z*.08);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.4:0.;put(p,(.12+.1*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.3,.28,.27)"),NB);
  // estela de fuego de la carrera
  const C=`const float TR=${f(TR)};const float RD=${f(RD)};const float TI=${f(TI)};const vec3 CH=${v3(CH)};
  float runX(float t){float k=clamp((t-TR)/RD,0.,1.);return -3.7+${f(D)}*pow(k,1.25);}`;
  a.count+=points(L.part,70,C+`void main(){float s=TR+aSeed.x*RD;float life=.18+aSeed.y*.17;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(runX(s)+.3,.12+aSeed.z*.8,r.z*.2)+vec3(-1.*t,.4*t,r.z*.2*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.w*40.)):0.;put(p,(.025+.035*aSeed.w)*(1.-age*.5));}`);
  // impacto: brasas que suben del rival
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.2;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.4,.6,0.));vec3 p=CH+d*(.2+.6*aSeed.z)*(1.-exp(-t*4.))+vec3(sin(t*5.+aSeed.w*6.)*.08,t*.6,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.x*50.)):0.;put(p,.025+.03*aSeed.w);}`);
  a.count+=sparks(L.part,70,TI,`${f(CH.x)},${f(CH.y)},0.`,".6,.6,0.",3,7,3);
  a.pose=function(te,o){
    const ia=te-TI, run=te>=TR&&te<TS, k=cl((te-TR)/RD);
    const x=te<TR?-3.7-0.08*ss(TC,TR,te):(te<TS?runX(te):XE-(XE+3.7)*ss(0.8,1.2,te));
    caster.position.set(x,run?0.09*Math.abs(Math.sin(k*Math.PI*2)):0,0);
    caster.rotation.z=0.1*ss(TC,TR,te)-0.36*ss(TR,TR+0.04,te)+0.5*ss(TS-0.02,TS+0.03,te)-0.6*ss(TS+0.03,TI,te)+0.36*ss(TI+0.08,TI+0.4,te);
    caster.scale.set(1,1-0.06*ss(TC,TR,te)*(1-ss(TR,TR+0.05,te)),1);
    rigM.position.copy(caster.position); rigM.rotation.z=caster.rotation.z; rigM.scale.copy(caster.scale);
    rigP.position.copy(caster.position); rigP.rotation.z=caster.rotation.z; rigP.scale.copy(caster.scale);
    const fe=ss(0,0.08,te)*(1-ss(0.9,1.2,te)), ch=ss(TC,TC+0.08,te)*(1-ss(TI+0.03,TI+0.25,te));
    eyes(0.4+0.4*fe,0.25*ss(0,0.08,te)*(1-ss(0.1,0.2,te))+(ia>=0?0.45*Math.exp(-ia*9):0),0.55*fe*(1+0.2*Math.sin(te*13)));
    uRun.value=run?1:0; uFe.value=fe; uFp.value=ch;
    for(const m of chans){m.visible=te>=TC&&ch>0.002;set(m,cl((te-TC)/0.1)*1.02,ch*0.8);}
    pawG.forEach((m,i)=>{localW(PAW_L[i],tmp);towardCam(m.position,tmp,0.15);billboard(m);m.visible=ch>0.002;
      m.material.uniforms.uA.value=0.8*ch*ss(TC+0.06,TC+0.1,te)*(1+0.4*(te>=TS&&ia<0?1:0));});
    // zarpazo y reacción
    const sw=cl((te-TS)/(TI-TS+0.06));
    towardCam(claw.position,CH,0.6); billboard(claw,0.55); claw.visible=te>=TS&&ia<0.3; set(claw,sw*1.2,1-cl(ia/0.3));
    let p=cl(ia/0.3); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.15+0.6*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    const burn=ia>=0?ss(TI,TI+0.06,te)*(1-ss(TI+0.25,TI+0.6,te)):0;
    const hit=ia>=0?Math.exp(-ia*8):0;
    target.position.x=3.4+hit*0.18; target.rotation.z=-hit*0.18*Math.cos(ia*18);
    tFire.position.x=target.position.x; tFire.visible=burn>0.002; set(tFire,0.3,burn*0.7);
    set(prints,0,1-ss(0.95,1.25,te)); set(char,0,1-ss(0.9,1.25,te));
    scorch.material.uniforms.uA.value=ia>=0?0.5*(1-cl(ia/0.6)):0;
    o.em=0.3*burn; o.emc.copy(U.uC2.value);
    if(te<TC){eyeW(1,o.g);o.gs=0.6*fe;o.ga=0.25*fe;o.li=1.5*fe;}
    else if(te<TR){localW(tmp2.set(0.42,0.9,0),o.g);o.gs=0.8;o.ga=0.25*ch;o.li=2*ch;}
    else if(ia<0){o.g.set(x+0.5,0.6,0);o.gs=1;o.ga=0.35;o.li=3;}
    else{o.g.copy(CH);o.gs=1+3*ia;o.ga=Math.exp(-ia*14)*0.7+0.08*burn;o.li=7*Math.exp(-ia*8)+1.5*burn;}
    o.ia=ia;o.c.copy(CH);o.shake=0;o.dist=0.6;
  };
}};

// =====================================================================
// 4 · PUPPY (EYES) — destello de ojitos tiernos y dos rayos cálidos entrelazados que curan al compañero
// =====================================================================
const puppy={key:"puppyEye",name:"Puppy (Eyes)",dur:1.4,ti:0.42,pal:"Miel",allies:1,
  phases:[["Mirada",0],["Rayos",0.14],["Curación",0.42],["Calidez",0.55],["Fin",1.1]],
build(a){
  const L=a.L,TB=0.14,TI=0.42,TE=1.15,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.15,0));
  const E=[V3(-3.47,1.66,-0.1),V3(-3.47,1.66,0.1)], EM=V3(-3.47,1.66,0);
  // marco de la hélice: eje ojos → aliado y dos perpendiculares
  const dir=AC.clone().sub(EM).normalize(), N1=V3(0,1,0).addScaledVector(dir,-dir.y).normalize(), N2=dir.clone().cross(N1);
  const TW=2.5, AMP=0.11;
  const beamPt=(j,u,out)=>{const th=u*Math.PI*2*TW+j*Math.PI,am=AMP*Math.sin(Math.PI*u);
    return out.lerpVectors(E[j],AC,u).addScaledVector(N1,Math.cos(th)*am).addScaledVector(N2,Math.sin(th)*am);};
  const BG=`const vec3 E0=${v3(E[0])};const vec3 E1=${v3(E[1])};const vec3 AC=${v3(AC)};const vec3 N1=${v3(N1)};const vec3 N2=${v3(N2)};
  const float TB=${f(TB)};const float TI=${f(TI)};
  vec3 beam(float j,float u){float th=u*6.28318*${f(TW)}+j*3.14159;float am=${f(AMP)}*sin(3.14159*u);
   return mix(j<.5?E0:E1,AC,u)+(N1*cos(th)+N2*sin(th))*am;}`;
  const eyes=mkEyes(L,EYE_PUPPY,0.32);
  // rayos: núcleo con cuentas de luz que fluyen + funda de brillo; uP es el frente, uQ el vaciado desde los ojos
  const BEAM_FS=soft=>`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;
   float c=pow(abs(dot(normalize(vN),normalize(vV))),${soft?"2.5":"1.4"});
   float beads=pow(.5+.5*sin(u*46.-uT*16.),5.);
   float head=smoothstep(.05,0.,uP-u)*step(uP,.999);float wv=.75+.25*sin(u*12.+uT*6.);
   gl_FragColor=vec4(mix(uC2,uC1,c*.7+beads*.5)*1.5+vec3(1.)*(head+beads*c*.35)*${soft?".3":"1."},(c*wv*(.55+.45*beads)+head)*uA*${soft?".3":"1."});}`;
  const beams=[];
  for(let j=0;j<2;j++){const pts=[];for(let i=0;i<=60;i++)pts.push(beamPt(j,i/60,V3(0,0,0)));
    const cv=new THREE.CatmullRomCurve3(pts);
    for(const [r,soft] of [[0.017,false],[0.05,true]]){const m=new THREE.Mesh(new THREE.TubeGeometry(cv,200,r,8,false),fxU(BEAM_FS(soft),{uQ:{value:0}}));L.trail.add(m);beams.push(m);}}
  // sobre el aliado: sol cálido, cinta en hélice que lo abraza subiendo
  const sun=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rays=pow(abs(cos(an*6.+uT*.7)),10.)*smoothstep(1.,.35,r)*step(.3,r)+pow(abs(cos(an*9.-uT*.5)),20.)*smoothstep(.8,.3,r)*.6;
   float disk=smoothstep(.45,0.,r)*.6;
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.4,(rays*.6+disk)*uA);}`,{depthTest:false}));
  const hug=new THREE.Mesh(helixGeo(1.4,0.46,0.28,1.6,0.1,110),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*18.-uT*4.,v*3.,0.));
   float al=exp(-d*2.5)*smoothstep(1.,.2,v)*(.5+.5*n)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*3.))*1.5+vec3(1.)*exp(-d*12.)*.5,al);}`));
  hug.position.copy(AP); const hug2=new THREE.Mesh(hug.geometry,hug.material); hug2.position.copy(AP); hug2.rotation.y=Math.PI;
  L.mesh.add(sun,hug,hug2);
  // destellos que se desprenden de los rayos
  for(let j=0;j<2;j++)a.count+=points(L.part,50,BG+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.2+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=beam(${f(j)},(s-TB)/(TI-TB))+r*.04+vec3(r.x*.15,.2+r.y*.1,r.z*.15)*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`,MOTE_FS);
  a.count+=points(L.part,12,BG+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.18+aSeed.y*.12;float age=(uT-s)/life;
   vec3 p=beam(step(.5,aSeed.z),(s-TB)/(TI-TB))+rnd()*.04;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.07*aSeed.w);}`,STAR4_FS);
  const AG=`const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};const float TI=${f(TI)};`;
  // pétalos en espiral, motas cálidas y destellos alrededor del aliado
  a.count+=points(L.part,50,AG+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;float rad=.45+.2*r.y-.1*age;
   vec3 p=AP+vec3(cos(an)*rad,.1+age*(1.3+r.z*.4),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.1+.05*r.z);}`,PETAL_FS);
  a.count+=points(L.part,35,AG+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.5,0.));vec3 p=AC+d*(.2+.8*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,-.3*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.1+.05*aSeed.w)*(1.-age*.3));}`,PETAL_FS);
  a.count+=points(L.part,45,AG+`void main(){float life=.55+aSeed.y*.35;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.,.1+age*(1.1+r.y*.6),(r.z-.5)*1.)+vec3(sin(age*5.+r.z*9.)*.08,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.03+.03*r.z);}`,MOTE_FS);
  a.count+=points(L.part,20,AG+`void main(){float life=.35+aSeed.y*.25;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.1,.2+r.y*1.5,(r.z-.5)*1.1);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.11+.12*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // suelo: flor de cinco pétalos que se abre y onda cálida (pequeñas)
  const flower=groundPlane(1.8,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float pet=.3+.6*pow(abs(cos(an*2.5+uT*.3)),1.5)*uP;
   float m=band(r,pet,.025)*step(.12,r)+band(r,.95,.015)+band(r,.18,.02)+smoothstep(pet,0.,r)*.12*uP;
   m+=band(r,.82,.03)*step(.6,fract(an/6.2832*30.+uT*.2));
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.6)*1.3,m*uA);}`)); flower.position.z=AP.z;
  const wave=groundPlane(2.6,AP.x,0.03,fx(RING_FS)); wave.position.z=AP.z;
  L.decal.add(flower,wave);
  const bu=beams.map(m=>m.material.uniforms);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.1,te)*(1-ss(TE-0.2,TE+0.2,te)), front=cl((te-TB)/(TI-TB));
    // inclinación de cabeza "de cachorro" antes de mirar fijo
    caster.rotation.z=0.05*Math.sin(te*22)*(1-ss(0.06,0.13,te)); caster.scale.set(1,1+0.03*Math.sin(te*40)*(1-ss(0.06,0.13,te)),1);
    const glint=Math.exp(-Math.pow((te-0.09)/0.04,2));
    eyes(0.6+0.4*ss(0,0.07,te)*(1-ss(1.0,1.35,te)),0.6*glint+0.3*(te>=TB&&ia<0.15?1:0),0.8*glint+0.4*(te>=TB&&ia<0?1:0));
    const drain=cl((te-TI-0.05)/0.2);
    for(const u of bu){u.uP.value=front*1.02;u.uQ.value=drain;u.uA.value=te>=TB&&drain<1?1:0;}
    beams.forEach(m=>m.visible=te>=TB&&drain<1);
    towardCam(sun.position,AC,0.6); billboard(sun); sun.visible=env>0.002; set(sun,0,env*0.6*(0.85+0.15*Math.sin(te*8)));
    const hp=cl(ia/0.5); for(const h of [hug,hug2]){h.visible=ia>=0&&ia<0.7;}
    set(hug,hp*1.6,ia>=0?0.8*(1-ss(0.3,0.65,ia)):0);
    set(flower,ss(TI,TI+0.25,te),env*0.7); let p=cl(ia/0.35); set(wave,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    const al=allies[0]; al.userData.m.emissive.copy(U.uC1.value); al.userData.m.emissiveIntensity=0.2*env+(ia>=0?0.6*Math.exp(-ia*8):0);
    al.position.y=ia>=0&&ia<0.25?0.07*Math.sin(Math.PI*ia/0.25):0;
    if(te<TB){eyeW(1,o.g);o.gs=0.6+0.5*glint;o.ga=0.2+0.35*glint;o.li=1+2*glint;}
    else if(ia<0){beamPt(0,front,o.g);o.gs=0.8;o.ga=0.35;o.li=2.5;}
    else{o.g.copy(AC);o.gs=1.3+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.6+0.08*env;o.li=5.5*Math.exp(-ia*6)+1.5*env;}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 5 · SOBBY — lágrimas ácidas, charco burbujeante en las patas y evasión con imágenes residuales
// =====================================================================
const sobby={key:"sobby",name:"Sobby",dur:1.5,ti:0.4,pal:"Ácido",
  phases:[["Llanto",0],["Charco",0.18],["Evasión",0.4],["Fin",1.25]],
build(a){
  const L=a.L,TP=0.18,TI=0.4,TD=1.25,FC=V3(-3.7,0,0),NG=3,LAG=0.05;
  const dodge=t=>{const e=ss(TI,TI+0.06,t)*(1-ss(TD-0.2,TD,t)),w=Math.sin(Math.max(t-TI,0)*Math.PI*2*1.6);return 0.38*e*Math.sign(w)*Math.pow(Math.abs(w),0.35);};
  const eyes=mkEyes(L,EYE_TEAR);
  // imágenes residuales: copias fantasma del cuerpo con borde ácido y barrido de líneas
  const ghostFS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float sc=.6+.4*sin(vP.y*40.-uT*12.);float n=noise(vP*6.+vec3(0.,uT*2.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3,(fr*.8+.08)*sc*(.6+.4*n)*uA);}`;
  const cylG=new THREE.CylinderGeometry(0.35,0.43,1.25,20,1,true), sphG=new THREE.SphereGeometry(0.28,20,14);
  const ghosts=[];
  for(let k=1;k<=NG;k++){const mat=fx(ghostFS),g=new THREE.Group(),b=new THREE.Mesh(cylG,mat),h=new THREE.Mesh(sphG,mat);
    b.position.y=0.625;h.position.y=1.6;g.add(b,h);g.userData={k,mat};L.mesh.add(g);ghosts.push(g);}
  // charco ácido: borde ondulante, cáusticas, ondas de gotas
  const puddle=groundPlane(1.7,FC.x,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float edge=uP*(.78+.12*noise(vec3(an*2.,uT*.4,1.))+.08*noise(vec3(p*5.,uT*.6)));
   float in_=smoothstep(edge,edge-.04,r);float rim=band(r,edge-.03,.04);
   vec2 q=p*7.;float c1=noise(vec3(q,uT*.7)),c2=noise(vec3(q*1.3+3.,-uT*.6));float caus=pow(1.-abs(c1-c2),10.);
   float rip=0.;for(int i=0;i<4;i++){float fi=float(i);float cy=uT*.8+fi*.25;float k=fract(cy);
    vec2 c=vec2(hash(vec3(fi,floor(cy),1.)),hash(vec3(fi,floor(cy),2.)))*1.1-.55;rip+=band(length(p-c),k*.45,.025)*(1.-k);}
   float al=(in_*(.18+caus*.45+rip*.8)+rim*.9)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,caus+rim+rip)*1.4,al);}`));
  // velo oscuro bajo el charco (mezcla normal) para que el ácido se lea como líquido sobre el suelo
  const stain=groundPlane(1.7,FC.x,0.017,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float edge=uP*(.8+.1*noise(vec3(p*3.,1.)));gl_FragColor=vec4(uC2*.18,smoothstep(edge,edge-.15,r)*.55*uA);}`,NB));
  const flashRing=groundPlane(2.2,FC.x,0.03,fx(RING_FS));
  L.decal.add(stain,puddle,flashRing);
  const C=`const float TP=${f(TP)};const float TI=${f(TI)};const vec3 FC=${v3(FC)};`;
  // lágrimas: caen en parábola desde cada ojo hasta el suelo
  for(let i=0;i<2;i++){const e=V3(-3.7,0,0).add(EYE_L[i]);a.count+=points(L.part,40,C+`void main(){float s=.03+aSeed.x*${f(TI-0.08)};float t=uT-s;
   vec3 v=vec3(.25+.35*aSeed.z,.45+.4*aSeed.y,${f(i?1:-1)}*(.1+.22*aSeed.w));
   vec3 p=${v3(e)}+v*t+vec3(0.,-5.5*t*t,0.);
   vA=(t>0.&&p.y>.03&&t<1.2)?smoothstep(0.,.05,t):0.;put(p,.055+.03*aSeed.w);}`,TEAR_FS);}
  // salpicaduras dentro del charco mientras caen lágrimas
  a.count+=points(L.part,50,C+`void main(){float life=.25;float k=uT/life+aSeed.x*3.;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=.2+.3*r.y;vec3 o=FC+vec3(cos(an)*rd+.15,0.,sin(an)*rd);
   vec3 d=normalize(vec3(rnd().x,1.6,rnd().z));vec3 p=o+d*vec3(.18,.0,.18)*age+vec3(0.,1.*age-1.6*age*age,0.)*(.5+aSeed.w*.5);
   vA=(k>=1.&&uT>.15&&uT<TI+.1)?(1.-age):0.;put(p,.02+.015*aSeed.z);}`,MOTE_FS);
  // burbujas que suben un poco y revientan; vapores ácidos
  a.count+=points(L.part,45,C+`void main(){float life=.35+aSeed.y*.25;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=sqrt(r.y)*.58;vec3 p=FC+vec3(cos(an)*rd,.03+age*.12,sin(an)*rd);
   vA=(k>=1.)?smoothstep(0.,.3,age)*step(age,.92)*uE:0.;put(p,(.03+.04*r.z)*(.5+age));}`,BUBBLE_FS);
  a.count+=points(L.part,20,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TP)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=sqrt(r.y)*.55;vec3 p=FC+vec3(cos(an)*rd,.05+age*(.5+r.z*.3),sin(an)*rd)+vec3(sin(age*5.+r.z*9.)*.06,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*.3*uE:0.;put(p,(.16+.12*r.z)*(.6+age));}`,SMOKE_FS("vec3(.42,.55,.25)"),NB);
  // destellos de esquiva alrededor del cuerpo (siguen el desplazamiento) y chevrones de mejora
  const uZ={value:0},uEv={value:0};
  a.count+=points(L.part,25,`uniform float uZ;uniform float uEv;void main(){float life=.2+aSeed.y*.12;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(-3.7+cos(an)*.45,.2+r.y*1.4,uZ+sin(an)*.45);
   vA=(k>=1.)?sin(age*3.14159)*uEv:0.;put(p,(.09+.09*r.z)*sin(age*3.14159));}`,STAR4_FS,PU({uZ,uEv}));
  a.count+=points(L.part,6,C+`void main(){float life=.55;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=FC+vec3((r.x-.5)*1.,.2+age*1.2,(r.y-.5)*1.);vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.18);}`,CHEVRON_FS);
  a.pose=function(te,o){
    const ia=te-TI, cry=1-ss(TI-0.08,TI,te), pool=ss(TP,TI,te)*(1-ss(TD,TD+0.22,te)), z=dodge(te);
    caster.rotation.z=0.025*Math.sin(te*40)*cry; caster.scale.set(1,1-0.025*Math.abs(Math.sin(te*24))*cry,1); caster.position.z=z;
    eyes(0.55+0.45*ss(0,0.08,te)*(1-ss(TD,TD+0.22,te)),ia>=0?0.4*Math.exp(-ia*8):0.12,cry*(0.6+0.4*Math.sin(te*10)));
    // fantasmas: posición pasada del lanzador, más tenues cuanto más atrás
    const evo=ss(TI,TI+0.06,te)*(1-ss(TD-0.2,TD,te)), spd=Math.min(Math.abs(z-dodge(te-0.04))/0.04,4);
    for(const g of ghosts){const k=g.userData.k;g.position.set(-3.7,0,dodge(te-k*LAG));g.scale.set(1.02,1,1.02);
      const av=evo*(0.42-0.1*k)*(0.35+0.2*spd);g.visible=av>0.004;g.userData.mat.uniforms.uA.value=av;}
    set(puddle,pool,0.8*ss(TP-0.05,TP+0.05,te)*(1-ss(TD,TD+0.22,te))); set(stain,pool,0.7*ss(TP-0.05,TP+0.05,te)*(1-ss(TD,TD+0.22,te)));
    let p=cl(ia/0.35); set(flashRing,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=ss(TP,TP+0.1,te)*(1-ss(TD-0.1,TD+0.2,te)); uZ.value=z; uEv.value=evo*Math.min(0.3+spd*0.25,0.8);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.15*evo*(0.6+0.4*Math.sin(te*30))+(ia>=0?0.4*Math.exp(-ia*9):0);
    if(te<TP){eyeW(1,o.g);o.gs=0.5;o.ga=0.2*ss(0,0.08,te);o.li=1;}
    else{o.g.set(-3.5,0.3,z);o.gs=1.4;o.ga=0.08*pool+(ia>=0?0.35*Math.exp(-ia*10):0);o.li=1.6*pool+(ia>=0?3*Math.exp(-ia*8):0);}
    o.ia=ia;o.c.set(-3.7,0.9,0);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 6 · SPARKY — arcos estáticos naranjas entre las orejas; un rayo salta al aliado y lo deja cargado
// =====================================================================
// rayo zigzag: tira de 24 segmentos que se expande en el VS hacia la cámara; cada vértice salta al azar
// en cada "fotograma eléctrico" (floor(uT*uRate)), así parpadea sin estado
const BOLT_VS=HEAD+`uniform vec3 uA0;uniform vec3 uB0;uniform vec3 uBow;uniform float uW;uniform float uSeed;uniform float uRate;uniform float uJ;
varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;
void main(){float u=position.x;float sd=position.y;float fl=floor(uT*uRate);
 vec3 d=uB0-uA0;float len=max(length(d),.001);vec3 dn=d/len;
 float i=floor(u*24.+.5);
 float j1=hash(vec3(i*1.37+.1,fl*.71+uSeed,uSeed*3.1))-.5,j2=hash(vec3(i*2.11+.3,fl*1.13+uSeed*1.7,7.7))-.5;
 float big=noise(vec3(u*3.,fl*.37,uSeed))-.5;
 vec3 c=mix(uA0,uB0,u)+uBow*4.*u*(1.-u);
 vec3 vd=normalize(cameraPosition-c);vec3 sx=normalize(cross(dn,vd)+vec3(1e-4));vec3 sy=cross(vd,sx);
 float env=sin(3.14159*u);
 vec3 p=c+(sx*(j1+big*1.5)+sy*j2)*uJ*len*env+sx*sd*uW;
 vUv=vec2(u,sd*.5+.5);vP=p;vN=vd;vV=vd;
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
const BOLT_FS=`uniform float uQ;uniform float uRate;uniform float uSeed;
void main(){float u=vUv.x;if(u>uQ)discard;float s=abs(vUv.y-.5)*2.;
 float fl=floor(uT*uRate);float flick=.5+.5*hash(vec3(fl*1.3,uSeed,5.1));
 float core=smoothstep(.3,0.,s);float glow=pow(1.-s,2.);
 float head=smoothstep(.06,0.,uQ-u)*step(uQ,.999);
 gl_FragColor=vec4(mix(uC2,uC1,core)*1.7+vec3(1.)*(core*.7+head),(core+glow*.5+head)*flick*uA);}`;
const sparky={key:"sparky",name:"Sparky",dur:2.2,ti:0.74,pal:"Estática",allies:1,
  phases:[["Estática",0],["Arcos",0.22],["Salto",0.62],["Carga",0.74],["Fin",1.9]],
build(a){
  const L=a.L,TA=0.22,TJ=0.62,TI=0.74,TE=1.9,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.25,0));
  const EAR_L=[V3(-0.02,1.84,-0.26),V3(-0.02,1.84,0.26)], ear=[V3(0,0,0),V3(0,0,0)];
  const eyes=mkEyes(L,EYE_VOLT);
  const boltGeo=new THREE.PlaneGeometry(1,2,24,1).translate(0.5,0,0);
  const mkBolt=(seed,w,rate,jag)=>{const m=new THREE.Mesh(boltGeo,fx(BOLT_FS,{vertexShader:BOLT_VS}));
    Object.assign(m.material.uniforms,{uA0:{value:V3(0,0,0)},uB0:{value:V3(0,0,0)},uBow:{value:V3(0,0,0)},uW:{value:w},uSeed:{value:seed},uRate:{value:rate},uJ:{value:jag},uQ:{value:1}});
    m.frustumCulled=false;L.trail.add(m);return m;};
  const bolt=(m,A,B,bow,al,q=1)=>{const u=m.material.uniforms;u.uA0.value.copy(A);u.uB0.value.copy(B);u.uBow.value.copy(bow);u.uA.value=al;u.uQ.value=q;m.visible=al>0.002;};
  const earArcs=[0,1,2].map(k=>mkBolt(1.3+k*2.7,0.028,16+k*5,0.08));
  const crackles=[0,1,2,3].map(k=>mkBolt(9.1+k*1.9,0.018,18+k*3,0.12));
  const jump=[mkBolt(21.7,0.046,20,0.06),mkBolt(33.3,0.024,26,0.1)];
  const allyArcs=[0,1,2,3].map(k=>mkBolt(41.1+k*3.3,0.02,13+k*4,0.14));
  // resplandor crepitante en cada oreja
  const earGlow=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.55,0.55),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float fl=floor(uT*20.);float sp=pow(abs(sin(an*3.+hash(vec3(fl,1.,2.))*6.)),14.)*smoothstep(1.,.2,r);
   float core=smoothstep(.35,0.,r);
   gl_FragColor=vec4(mix(uC2,uC1,core)*1.7+vec3(1.)*core*.5,(core+sp*.8+pow(max(0.,1.-r),2.)*.3)*uA);}`,{depthTest:false}));L.mesh.add(m);return m;});
  const C=`const float TA=${f(TA)};const float TJ=${f(TJ)};const float TI=${f(TI)};const float TE=${f(TE)};const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};`;
  // electricidad estática que repta por la cabeza y orejas mientras se carga
  a.count+=points(L.part,120,C+`void main(){float life=.1+aSeed.y*.1;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 d=normalize(r*2.-1.+vec3(0.,.4,0.));vec3 p=vec3(-3.7,1.66,0.)+d*(.3+.12*r.z);
   vA=(k>=1.&&uT<TI+.1)?step(.3,r.y)*(1.-age)*smoothstep(0.,.18,uT):0.;put(p,.025+.03*r.z);}`);
  // ráfaga al llegar el rayo y estática pegada al aliado (parpadeo rápido sobre la superficie)
  a.count+=sparks(L.part,140,TI,`${f(AC.x)},${f(AC.y)},${f(AC.z)}`,"0.,.4,0.",2.5,7.5,2.5);
  a.count+=points(L.part,130,C+`void main(){float life=.1+aSeed.y*.1;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float y=.1+r.y*1.8;float rad=y>1.35?.3:.43;vec3 p=AP+vec3(cos(an)*rad,y,sin(an)*rad)+(rnd())*.03;
   vA=(k>=1.)?step(.4,r.z)*(1.-age)*uE:0.;put(p,.025+.04*r.z);}`);
  a.count+=points(L.part,45,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*1.,.2+r.y*1.6+age*.6,(r.z-.5)*1.)+vec3(sin(age*20.+r.z*9.)*.05,0.,0.);
   vA=(k>=1.)?(1.-age)*(.5+.5*step(.5,fract(age*12.)))*uE:0.;put(p,(.1+.08*r.z)*(1.-age));}`,STAR4_FS);
  // suelo: anillo de carga dentado bajo el lanzador y bajo el aliado, y onda al llegar
  const STATIC_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);float fl=floor(uT*15.);
   float jr=.85+(hash(vec3(floor(an*9.),fl,1.))-.5)*.08;
   float m=band(r,jr,.02)*(.5+.5*step(.4,hash(vec3(floor(an*14.),fl,2.))))+band(r,.6,.012)+band(r,.72,.04)*step(.6,fract(an/6.2832*16.+uT*.8));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.4,m*uA);}`;
  const cRing=groundPlane(1.8,-3.7,0.02,fx(STATIC_FS)), aRing=groundPlane(2.0,AP.x,0.02,fx(STATIC_FS)), shock=groundPlane(3.8,AP.x,0.03,fx(RING_FS));
  aRing.position.z=shock.position.z=AP.z;
  L.decal.add(cRing,aRing,shock);
  const up=V3(0,1,0);
  a.pose=function(te,o){
    const ia=te-TI, charge=ss(0,TA,te)*(1-ss(TI,TI+0.2,te)), env=ss(TI,TI+0.15,te)*(1-ss(TE-0.2,TE+0.2,te));
    caster.rotation.z=0.02*Math.sin(te*60)*charge+(te>=TJ?0.12*Math.exp(-(te-TJ)*6):0); caster.position.x=-3.7+0.01*Math.sin(te*83)*charge;
    EAR_L.forEach((l,i)=>localW(l,ear[i]));
    eyes(0.5+0.5*charge+0.3*env,te>=TJ&&ia<0.3?0.9:0.2*charge,charge+0.5*env);
    earGlow.forEach((m,i)=>{towardCam(m.position,ear[i],0.15);billboard(m);const g=ss(0,0.15,te)*(1-ss(TI,TI+0.2,te));m.visible=g>0.002;
      m.material.uniforms.uA.value=g*(0.6+0.4*jh(Math.floor(te*20)+i*5));});
    // arcos entre orejas: se re-sortean y algunos fotogramas se apagan
    const ea=ss(TA,TA+0.08,te)*(1-ss(TJ+0.05,TI+0.1,te));
    earArcs.forEach((m,k)=>{const fr=Math.floor(te*(16+k*5)),on=jh(fr+k*7.1)>0.3?1:0.12;
      bolt(m,ear[0],ear[1],tmp.set(0.05+0.1*(jh(fr*1.3+k)-0.5),0.2+0.12*k,0),ea*on);});
    crackles.forEach((m,k)=>{const fr=Math.floor(te*(18+k*3)),e=ear[k%2],an=jh(fr+k*3.3)*Math.PI*2,ln=0.22+0.25*jh(fr*1.7+k);
      tmp2.set(Math.cos(an)*ln*0.8,0.1+ln*jh(fr*2.1+k),(k%2?1:-1)*Math.abs(Math.sin(an))*ln).add(e);
      bolt(m,e,tmp2,tmp.set(0,0.05,0),ss(0,0.15,te)*(1-ss(TJ,TI,te))*(jh(fr+k*11)>0.45?1:0));});
    // salto al aliado: el frente avanza por el arco y queda chisporroteando
    const q=cl((te-TJ)/(TI-TJ)), ja=ss(TJ-0.01,TJ+0.02,te)*(1-ss(TI+0.18,TI+0.32,te));
    jump.forEach((m,k)=>bolt(m,ear[0],AC,tmp.set(0,0.75+0.15*k,0),ja*(k?0.8:1),q*1.02));
    // micro-arcos sobre el aliado cargado
    allyArcs.forEach((m,k)=>{const fr=Math.floor(te*(13+k*4)),an=jh(fr+k*5.7)*Math.PI*2,y=0.25+1.5*jh(fr*1.9+k),da=0.5+0.7*jh(fr*2.3+k),dy=(jh(fr*3.1+k)-0.5)*0.6;
      tmp.set(AP.x+Math.cos(an)*0.44,y,AP.z+Math.sin(an)*0.44); tmp2.set(AP.x+Math.cos(an+da)*0.44,y+dy,AP.z+Math.sin(an+da)*0.44);
      bolt(m,tmp,tmp2,up.set(Math.cos(an+da/2)*0.14,0.04,Math.sin(an+da/2)*0.14),env*(jh(fr+k*13)>0.35?1:0));});
    set(cRing,0,0.8*charge); set(aRing,0,0.8*env); let p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    const al=allies[0]; al.userData.m.emissive.copy(U.uC2.value);
    al.userData.m.emissiveIntensity=env*(0.2+0.3*jh(Math.floor(te*24)))+(ia>=0?0.9*Math.exp(-ia*7):0);
    al.scale.set(1,1+0.03*env*Math.sin(te*50),1);
    if(te<TJ){o.g.set(-3.7,1.85,0);o.gs=0.75+0.4*charge;o.ga=0.25*charge*(0.7+0.3*jh(Math.floor(te*20)));o.li=2.4*charge;}
    else if(ia<0){tmp.lerpVectors(ear[0],AC,q);tmp.y+=0.75*4*q*(1-q);o.g.copy(tmp);o.gs=1.15;o.ga=0.5;o.li=5.5;}
    else{o.g.copy(AC);o.gs=1.5+1.6*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.7+0.08*env*jh(Math.floor(te*24));o.li=7.5*Math.exp(-ia*6)+2*env*(0.5+0.5*jh(Math.floor(te*24)));}
    o.ia=ia;o.c.copy(AC);o.shake=0;o.dist=0.6;o.flash=0;
  };
}};

VFX.module("Bestia · Ojos",[chubby,peas,zeal,puppy,sobby,sparky]);
})();

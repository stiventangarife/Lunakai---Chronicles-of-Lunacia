// =====================================================================
// MÓDULO · CLASE BICHO (COLA)
// Estética de insecto: colonias de hormigas, seda dorada, quitina tornasolada, baba ácida, ciempiés de fuego.
// No se dibuja la cola del Axie: los efectos nacen de su posición ≈ (−4.15, 0.7, 0). Los aguijones de Twin Tail son
// proyecciones espectrales temporales; oruga, insecto palo, cebo y martillo son objetos invocados.
// Niveles por PA: 1 PA → rápido y ligero; 2 PA → firme (sin fractura, sin temblor); 3 PA → pesado con fractura.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,BUBBLE_FS,CROSS_FS,helixGeo,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;
// (la paleta "Élitro" la define mod-bicho-orejas.js, que se carga antes)

const TC=V3(3.15,1.2,0), CT=V3(-4.15,0.7,0), A=ALLY_POS[0];      // pecho del objetivo · cola del lanzador · aliado
const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const win=(te,a,b,c,d)=>ss(a,b,te)*(1-ss(c,d,te));
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const ARC=`vec3 arcPt(vec3 s,vec3 e,float h,float k){return mix(s,e,k)+vec3(0.,4.*h*k*(1.-k),0.);}`;
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
const glowOn=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const SOFTBURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;
const SDSEG=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
// rumbo en pantalla de una velocidad del mundo (la cámara mira hacia −z desde arriba: +z baja en pantalla)
const SANG=`float sang(vec3 v){return atan(v.y-v.z*.32,v.x+1e-4);}`;

// ---------- fragmentos de partícula del módulo ----------
// hormiga vista desde arriba (mezcla normal): cabeza, tórax, abdomen y patas que caminan; vMix = rumbo (rad)
const ANT_FS=(dark,lite)=>HEAD+SDSEG+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vMix),s=sin(vMix);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float b=min(min(length((q-vec2(.19,0.))*vec2(1.,1.15))-.075,length(q*vec2(1.,1.6))-.06),length((q+vec2(.2,0.))*vec2(.8,1.1))-.12);
 float legs=0.;vec2 aq=vec2(q.x,abs(q.y));
 for(int i=0;i<3;i++){float fi=float(i)-1.;float ph=sin(uT*34.+fi*2.1)*.05*(fi==0.?-1.:1.);
  legs=max(legs,smoothstep(.022,0.,sdSeg(aq,vec2(fi*.07,0.),vec2(fi*.14+ph,.3))));}
 float ant=smoothstep(.02,0.,sdSeg(aq,vec2(.25,.02),vec2(.38,.12)));
 float body=smoothstep(.015,-.01,b);float a=max(body,max(legs,ant)*.85)*vA;if(a<.003)discard;
 vec3 col=mix(${dark},${lite},smoothstep(.0,-.07,b))+uC1*smoothstep(-.035,0.,b)*body*.55;
 gl_FragColor=vec4(col,a);}`;
// zapatero (insecto acuático) con cuatro patas largas (mezcla normal)
const STRIDER_FS=HEAD+SDSEG+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vMix),s=sin(vMix);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 vec2 aq=vec2(q.x,abs(q.y));float b=length(q*vec2(1.,3.2))-.08;
 float l=min(min(sdSeg(aq,vec2(.02,0.),vec2(.32,.3)),sdSeg(aq,vec2(-.02,0.),vec2(-.38,.26))),sdSeg(aq,vec2(.08,0.),vec2(.18,.1)));
 float legs=smoothstep(.016,0.,l);float body=smoothstep(.02,-.01,b);
 float dim=smoothstep(.03,0.,abs(length(aq-vec2(.32,.3))-.05))+smoothstep(.03,0.,abs(length(aq-vec2(-.38,.26))-.05));
 float a=max(max(body,legs*.85),dim*.7)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.05,.07,.09),uC1*1.3,max(dim,body*.35)),a);}`;
// gota (mezcla normal); col = color GLSL
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.6),q.y+.04));
 float a=smoothstep(.34,.27,d)*vA;if(a<.003)discard;float hl=smoothstep(.08,0.,length(q-vec2(-.08,.02)));
 gl_FragColor=vec4(${col}*(.75+.45*vMix)*(1.2-d*1.3)+vec3(1.)*hl*.7,a*.92);}`;
// esquirla/púa alargada orientada a su rumbo (vMix = ángulo en pantalla); reflejo tornasol
const SHARD_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float c=cos(vMix),s=sin(vMix);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float d=abs(q.x)*1.05+abs(q.y)*(4.2+3.*q.x);float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 vec3 ir=.5+.5*cos(6.2832*(vMix*.2+q.x*1.4+vec3(0.,.33,.67)));
 gl_FragColor=vec4(mix(mix(uC2,uC1,.5+q.x*1.4),ir,.3)*1.4+vec3(1.)*smoothstep(.16,0.,d)*.45,a);}`;
// terrón (mezcla normal)
const EARTH_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.25+q.y;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.18,.11,.06),vec3(.46,.32,.19),vMix)*(1.15-d),a);}`;
// hoja que gira (mezcla normal), vMix = giro
const LEAF_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=max(.4*(1.-q.x*q.x*3.9),.001);float d=abs(q.y)*1.7/w;float a=smoothstep(1.,.7,d)*step(abs(q.x),.49)*vA;if(a<.003)discard;
 float rib=smoothstep(.05,0.,abs(q.y));gl_FragColor=vec4(mix(vec3(.18,.45,.12),vec3(.5,.8,.28),.5+q.x)*(1.1-d*.3)+uC1*.12+vec3(.4,.5,.2)*rib*.3,a);}`;

// =====================================================================
// 1 · ANT (2 PA, sobre sí) — una colonia de hormigas obreras baja de la cola y desfila en anillo a los pies del Axie;
//     levantan ocho barricadas de tierra, una cúpula de cámaras de hormiguero lo protege y tres pulsos rojos provocan
// =====================================================================
const ant={key:"itAnt",name:"Ant",pa:2,dur:2.2,ti:0.85,pal:"Carmesí",
  phases:[["Colonia",0],["Desfile",0.12],["Barricada",0.45],["Escudo",0.85],["Provocación",1.2],["Fin",1.85]],
build(a){
  const L=a.L,TB=0.45,TI=0.85,TT=1.2,TX=1.85,TE=2.2,CX=-3.7,RW=1.05,NM=8;
  // barricadas: medias esferas de tierra con guijarros; las vetas brillan con el escudo (uA)
  const earthMat=fx(`void main(){float n=noise(vP*14.)*.6+noise(vP*40.)*.4;float peb=smoothstep(.72,.8,noise(vP*26.+5.));
   vec3 c=mix(vec3(.2,.12,.07),vec3(.48,.33,.2),n)*(1.-peb*.4)+vec3(.55,.45,.35)*peb*.5;
   float vein=pow(1.-abs(noise(vP*6.+vec3(uT*.3))*2.-1.),14.);
   gl_FragColor=vec4(c*${LIT}+uC1*vein*uA*1.6,1.);}`,SOLID);
  const moundG=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2);
  const mounds=[...Array(NM)].map((_,i)=>{const an=i/NM*Math.PI*2+Math.PI/NM,m=new THREE.Mesh(moundG,earthMat);
    m.position.set(CX+Math.cos(an)*RW,0,Math.sin(an)*RW);m.rotation.y=-an;
    const da=Math.abs(((an-Math.PI)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);m.userData.d=da/Math.PI*0.28;L.mesh.add(m);return m;});
  // cúpula: cámaras y túneles del hormiguero; se levanta desde el suelo (uP)
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*0.55),fx(`void main(){vec3 q=normalize(vP);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec2 g=vec2(atan(q.z,q.x)*2.2,q.y*5.);vec2 id=floor(g);vec2 fq=fract(g)-.5;
   vec2 o=vec2(hash(vec3(id,1.)),hash(vec3(id,2.)))-.5;float d=length(fq-o*.4);
   float cell=smoothstep(.1,0.,abs(d-.3));float tun=smoothstep(.06,0.,abs(fq.y+o.x*.3))*step(.6,hash(vec3(id,5.)));
   float rise=step(q.y,uP);
   gl_FragColor=vec4(mix(uC2,uC1,fr+cell*.3)*1.3,(fr*.35+(cell*.2+tun*.12)+band(q.y,uP,.05)*.6)*rise*uA);}`));
  dome.position.set(CX,0,0); dome.scale.set(1.3,1.65,1.3); L.mesh.add(dome);
  // suelo: hormiguero (túneles y cámaras) centrado en el lanzador y tres pulsos de provocación
  const nest=groundPlane(2.8,CX,0.02,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float t=pow(1.-abs(noise(vec3(p*3.5,1.))*2.-1.),10.)+pow(1.-abs(noise(vec3(p*6.,4.))*2.-1.),14.)*.6;
   vec2 g=p*2.5;float ch=smoothstep(.16,.08,length(fract(g)-.5))*step(.75,hash(vec3(floor(g),3.)));
   float m=(t*.7+ch*.6)*smoothstep(1.,.55,r)*step(r,uP)+band(r,.75,.025)*.7*step(r,uP);
   gl_FragColor=vec4(mix(uC2,uC1,ch+band(r,.75,.02))*1.35,m*uA);}`));
  const taunts=[0,1,2].map(()=>groundPlane(7,CX,0.03,fx(RING_FS)));
  L.decal.add(nest,...taunts);
  // haz: columna de hormigas como cinta oscura que baja de la cola (estela de la marcha)
  const march=new THREE.Mesh(pathTube((t,o)=>o.set(CT.x-0.12*Math.sin(t*3.14),CT.y*(1-t)+0.03,0.05*Math.sin(t*9)),12,30,6,0.05,0.07),fx(`void main(){float u=vUv.x;
   float dots=step(.5,fract(u*14.-uT*6.));gl_FragColor=vec4(uC1*.8,dots*.6*step(u,uP)*uA);}`));
  L.trail.add(march);

  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const float TT=${f(TT)};const float TX=${f(TX)};const float CX=${f(CX)};const float RW=${f(RW)};
  const vec3 CT=${v3(CT)};`+SANG;
  // hormigas: bajan de la cola, desfilan por el anillo hasta su puesto, trabajan y se dispersan al final
  a.count+=points(L.part,190,C+`void main(){float s=.08+aSeed.x*.5;float t=uT-s;
   float a0=3.1416+(aSeed.z-.5)*.3;float side=aSeed.y<.5?-1.:1.;float span=.15+aSeed.w*2.9;float sp=5.5;float dw=span/sp;
   float rr=RW+(aSeed.z-.5)*.36;vec3 G=vec3(CX+cos(a0)*rr,.03,sin(a0)*rr);vec3 p,v;float lv=TX+aSeed.x*.25;
   if(t<.14){float k=clamp(t/.14,0.,1.);p=mix(CT,G,k);v=G-CT;}
   else if(t<.14+dw){float an=a0+side*sp*(t-.14);p=vec3(CX+cos(an)*rr,.03,sin(an)*rr);v=side*vec3(-sin(an),0.,cos(an));}
   else{float an=a0+side*span;vec3 tg=side*vec3(-sin(an),0.,cos(an));float j=sin(uT*18.+aSeed.x*30.)*.04;
    p=vec3(CX+cos(an)*rr,.03,sin(an)*rr)+tg*j;v=tg*cos(uT*18.+aSeed.x*30.)+vec3(cos(an),0.,sin(an))*.3;
    if(uT>lv){float c=uT-lv;p+=vec3(cos(an),0.,sin(an))*c*1.6;v=vec3(cos(an),0.,sin(an));}}
   vA=(t>0.)?1.-smoothstep(lv+.15,lv+.35,uT):0.;put(p,.13+.03*aSeed.w);vMix=sang(v);}`,ANT_FS("vec3(.05,.02,.02)","vec3(.32,.09,.05)"),NB);
  // terrones que saltan mientras levantan las barricadas
  a.count+=points(L.part,80,C+`void main(){float s=TB+aSeed.x*(TI-TB+.1);float t=uT-s;float c=max(t,0.);float an=aSeed.y*6.2832;
   vec3 b=vec3(CX+cos(an)*RW,.1,sin(an)*RW);vec3 v=vec3(cos(an)*(.3+.6*aSeed.z),1.2+1.4*aSeed.w,sin(an)*(.3+.6*aSeed.z));
   vec3 p=b+v*c+vec3(0.,-5.*c*c,0.);vA=(t>0.&&t<.55&&p.y>0.)?1.:0.;put(p,.05+.04*aSeed.w);vMix=aSeed.z;}`,EARTH_FS,NB);
  a.count+=points(L.part,50,C+`void main(){float s=TB+aSeed.x*.35;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*(RW+.2*c),.08+.3*(1.-exp(-c*3.)),sin(an)*(RW+.2*c));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.2+.15*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // provocación: brasas rojas que suben del Axie
  a.count+=points(L.part,60,C+`void main(){float s=TT+aSeed.x*.5;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(CX+cos(an)*.55,.2+c*2.2,sin(an)*.55)+rnd()*.06;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.04+.04*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, env=win(te,TI-0.1,TI+0.1,TX,TE-0.1);
    caster.scale.set(1+0.04*ss(TB,TI,te)*(1-ss(TX,TE,te)),1-0.05*ss(TB,TI,te)*(1-ss(TX,TE,te)),1);
    mounds.forEach(m=>{const d=m.userData.d,h=ss(TB+d,TB+d+0.25,te)*(1-ss(TX+d*0.3,TX+0.3+d*0.3,te));
      m.visible=h>0.002; m.scale.set(0.22,Math.max(0.4*h,0.001),0.42);});
    let pul=0; [TT,TT+0.18,TT+0.36].forEach((t,i)=>{const p=cl((te-t)/0.6);set(taunts[i],p,te>=t?(1-p)*0.8:0);if(te>=t)pul=Math.max(pul,Math.exp(-(te-t)*8));});
    earthMat.uniforms.uA.value=0.4*env+0.8*pul;
    dome.visible=env>0.001; set(dome,ss(TI-0.15,TI+0.3,te),env*(0.75+0.35*pul));
    set(nest,ss(0.1,TB,te),ss(0.1,0.3,te)*(1-ss(TX,TE,te)));
    march.visible=te<TI; set(march,ss(0.05,0.2,te)*1.02,1-ss(0.5,TI,te));
    glowOn(caster,0.3*hitK(ia,5)+0.9*pul+0.12*env);
    if(te<TB){o.g.copy(CT);o.g.y=0.4;o.gs=0.8;o.ga=0.2;o.li=1.4;}
    else{o.g.set(CX,0.9,0);o.gs=2.2+1.5*pul;o.ga=0.12+0.3*hitK(ia,5)+0.35*pul;o.li=1.8+4*hitK(ia,4)+4*pul;}
    o.ia=ia;o.c.set(CX,0.9,0);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};

// =====================================================================
// 2 · FISH SNACK (2 PA, aliado) — la cola lanza un bocado de pescado en parábola a los pies del aliado; cae en un
//     charco que ondula y atrae a zapateros y girínidos que patinan hacia él y lo rodean, cerrando una burbuja de agua
// =====================================================================
const fish={key:"itFishSnack",name:"Fish Snack",pa:2,dur:2.2,ti:0.75,pal:"Loto",allies:1,
  phases:[["Cebo",0],["Lanzamiento",0.18],["Caída",0.75],["Enjambre",0.95],["Defensa",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TL=0.18,TI=0.75,TS=0.95,TD=1.35,TX=1.9,TE=2.2,BP=V3(A.x+0.3,0.07,A.z+0.38),H=1.25,S0=V3(CT.x+0.05,CT.y+0.05,0);
  // bocado: pez con escamas y aleta caudal
  const fishG=new THREE.Group(); L.mesh.add(fishG);
  const fbody=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),fx(`void main(){vec3 p=vP;
   vec2 sc=vec2(p.x*9.,p.y*9.+step(.5,fract(p.x*4.5))*.5);float scale=smoothstep(.4,.5,length(fract(sc)-.5));
   vec3 c=mix(vec3(1.,.55,.2),vec3(.85,.88,.92),smoothstep(-.3,.4,p.y))*(1.-scale*.25);
   float eye=smoothstep(.18,.12,length(vec2(p.x-.62,p.y-.15)))*step(0.,abs(p.z)-.2);
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(20)}*.6+uC1*uA*.6-vec3(eye),1.);}`,SOLID));
  fbody.scale.set(0.17,0.085,0.065);
  const fin=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.16),fx(`void main(){vec2 p=vUv-.5;float m=step(abs(p.y),.5*(.5-p.x)+.05)*step(-.45,p.x);
   if(m<.5)discard;gl_FragColor=vec4(mix(vec3(1.,.5,.15),vec3(1.,.8,.5),vUv.x)*${LIT},1.);}`,DS));
  fin.position.x=-0.2; fishG.add(fbody,fin);
  // burbuja de agua: cáusticas que se mueven y brillo de borde
  const bubble=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   vec3 s=q*3.+vec3(uT*.4,-uT*.3,uT*.2);float ca=pow(1.-abs(noise(s)*2.-1.),6.)+pow(1.-abs(noise(s*2.1+4.)*2.-1.),8.)*.6;
   float hl=smoothstep(.93,.99,dot(q,normalize(vec3(-.4,.7,.6))));float rise=step(q.y,uP*2.-1.);
   gl_FragColor=vec4(mix(uC2,uC1,fr*.6+ca*.3)*1.3+vec3(1.)*hl,(fr*.5+ca*.18+hl+band(q.y,uP*2.-1.,.05)*.7)*rise*uA);}`));
  bubble.position.set(A.x,1.0,A.z); bubble.scale.set(1.15,1.3,1.15); L.mesh.add(bubble);
  // estela de gotas a lo largo de la parábola
  const trail=new THREE.Mesh(pathTube((t,o)=>arcPt(S0,BP,H,t,o),24,60,8,0.035,0.025),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.4)discard;
   float dots=smoothstep(.3,.6,sin(u*90.)*.5+.5);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*6.))*1.5,exp(-d*7.)*(.3+.7*dots)*(.4+.6*fr)*uA);}`));
  L.trail.add(trail);
  // suelo: charco con cáusticas y ondas, centrado en el aliado
  const pond=groundPlane(3.4,A.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,uT*.5));float ca=pow(1.-abs(noise(vec3(p*9.+uT*.3,uT*.4))*2.-1.),7.);
   float rip=band(fract(r*3.5-uT*1.4),.5,.08)*smoothstep(1.,.2,r);float body=smoothstep(uP,uP-.15,r+(n-.5)*.15);
   gl_FragColor=vec4(mix(uC2,uC1,ca+rip*.5)*1.3,(body*(.18+.4*ca)+rip*.35*body+band(r,uP,.04)*.5)*uA);}`));
  const splash=groundPlane(1.6,BP.x,0.03,fx(RING_FS));
  pond.position.z=A.z; splash.position.z=BP.z; L.decal.add(pond,splash);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TD=${f(TD)};const float TX=${f(TX)};
  const vec3 AP=${v3(A)};const vec3 BP=${v3(BP)};const vec3 S0=${v3(S0)};`+ARC+SANG;
  // gotas que se desprenden en vuelo y salpicadura al caer
  a.count+=points(L.part,40,C+`void main(){float s=TL+aSeed.x*(TI-TL);float t=uT-s;float c=max(t,0.);
   vec3 p=arcPt(S0,BP,${f(H)},(s-TL)/(TI-TL))+rnd()*.05+vec3(0.,-3.*c*c,0.);
   vA=(t>0.&&t<.45&&p.y>.02)?1.-t/.45:0.;put(p,.05+.03*aSeed.w);vMix=aSeed.z;}`,DROP_FS("mix(uC1,vec3(.8,.95,1.),.4)"),NB);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.04;float t=uT-s;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(0.,2.,0.))*(1.2+1.8*aSeed.z);vec3 p=BP+v*c+vec3(0.,-6.*c*c,0.);
   vA=(t>0.&&t<.6&&p.y>0.)?1.-t/.6:0.;put(p,.05+.04*aSeed.w);vMix=aSeed.y;}`,DROP_FS("mix(uC1,vec3(.8,.95,1.),.4)"),NB);
  // zapateros: llegan a golpes de remo desde fuera y patrullan en círculo
  a.count+=points(L.part,44,C+`void main(){float s=TI+aSeed.x*.35;float t=uT-s;float an0=aSeed.y*6.2832;float r0=2.7+.6*aSeed.z;float r1=1.05+.3*aSeed.w;
   float k=clamp(t/.55,0.,1.);float stroke=floor(k*5.)/5.+smoothstep(0.,.3,fract(k*5.))/5.;float rad=mix(r0,r1,stroke);
   float an=an0+max(t-.55,0.)*(.9+.5*aSeed.z)*(aSeed.w<.5?1.:-1.);
   vec3 p=vec3(AP.x+cos(an)*rad,.03,AP.z+sin(an)*rad);vec3 v=k<1.?-vec3(cos(an),0.,sin(an)):(aSeed.w<.5?1.:-1.)*vec3(-sin(an),0.,cos(an));
   vA=(t>0.)?smoothstep(0.,.1,t)*(1.-smoothstep(TX,TX+.3,uT)):0.;put(p,.3+.06*aSeed.w);vMix=sang(v);}`,STRIDER_FS,NB);
  // girínidos: puntos brillantes que trazan bucles rápidos sobre el agua
  a.count+=points(L.part,60,C+`void main(){float s=TS+aSeed.x*.3;float t=max(uT-s,0.);float an=aSeed.y*6.2832+t*(1.2+.6*aSeed.z);
   float rad=.75+.35*aSeed.w;vec3 c=vec3(AP.x+cos(an)*rad,.05,AP.z+sin(an)*rad);float lp=t*14.+aSeed.z*9.;
   vec3 p=c+vec3(cos(lp),0.,sin(lp))*.08;vA=(uT>s)?smoothstep(0.,.15,t)*(1.-smoothstep(TX,TX+.3,uT)):0.;put(p,.04+.02*aSeed.w);}`);
  // insectos de luz que rondan la burbuja y burbujas que suben dentro
  a.count+=points(L.part,30,C+`void main(){float an=aSeed.x*6.2832+uT*(1.+.6*aSeed.y);float rad=1.25+.15*aSeed.z;
   vec3 p=vec3(AP.x+cos(an)*rad,.4+aSeed.w*1.7+sin(uT*3.+aSeed.x*9.)*.15,AP.z+sin(an)*rad);vA=uE*(.6+.4*sin(uT*20.+aSeed.y*30.));put(p,.05*uE);}`);
  a.count+=points(L.part,70,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TS)/life+aSeed.x;float cy=floor(k);float age=fract(k);vec3 r=rr(cy);
   vec3 p=vec3(AP.x+(r.x-.5)*1.3,.15+age*1.9,AP.z+(r.z-.5)*1.3);vA=step(1.,k)*sin(age*3.14159)*uE;put(p,.06+.07*r.y);}`,BUBBLE_FS);

  a.pose=function(te,o){
    const ia=te-TI, fl=cl((te-TL)/(TI-TL)), env=win(te,TS,TD,TX,TE-0.05);
    caster.rotation.z=0.1*ss(0,TL,te)-0.16*ss(TL,TL+0.1,te)*(1-ss(TL+0.2,TI,te));
    fishG.visible=te>=TL-0.08&&te<TS+0.45;
    if(te<TL)fishG.position.copy(S0).y+=0.05*ss(TL-0.08,TL,te);
    else if(te<TI){arcPt(S0,BP,H,fl,fishG.position);fishG.rotation.set(0.3,0,-fl*9);}
    else{fishG.position.copy(BP);fishG.position.y=0.07+0.02*Math.sin(te*12);fishG.rotation.set(1.4,0.4,0);}
    fishG.scale.setScalar(Math.max(1-ss(TS,TS+0.45,te),0.001)); fbody.material.uniforms.uA.value=hitK(ia,3);
    trail.visible=te>=TL&&ia<0.4; set(trail,fl+Math.max(ia,0)*1.2,1-ss(TI,TI+0.35,te));
    bubble.visible=env>0.001; set(bubble,ss(TS,TD,te),env*0.9);
    set(pond,0.35+0.65*ss(TI,TS+0.3,te),(ia>=0?1:0)*(1-ss(TX,TE,te)));
    let p=cl(ia/0.4); set(splash,p,ia>=0?(1-p)*0.8:0);
    U.uE.value=env; glowOn(allies[0],0.5*hitK(te-TD,4)*(te>=TD?1:0)+0.15*env);
    if(te<TL){o.g.copy(S0);o.gs=0.6;o.ga=0.2;o.li=1;}
    else if(te<TI){o.g.copy(fishG.position);o.gs=0.9;o.ga=0.32;o.li=2.4;}
    else{o.g.set(A.x,0.8+0.4*env,A.z);o.gs=1.6+0.8*env;o.ga=0.4*hitK(ia,6)+0.18*env;o.li=3*hitK(ia,4)+2.5*env;}
    o.ia=ia;o.c.copy(BP);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 3 · GRAVEL ANT (2 PA, aliado) — dos columnas de hormigas de arena salen de la cola: una trepa al aliado y lo envuelve
//     en una coraza de arenisca; la otra cruza el campo y recubre de arena el frente del rival, atascando sus armas
// =====================================================================
const gravel={key:"itGravelAnt",name:"Gravel Ant",pa:2,dur:2.3,ti:0.85,pal:"Miel",allies:1,
  phases:[["Arena",0],["Marcha",0.12],["Coraza",0.55],["Escudo",0.85],["Atasco",1.1],["Fin",1.9]],
build(a){
  const L=a.L,T0=0.12,TI=0.85,TJ=1.1,TX=1.9,TE=2.3,G=V3(-4.3,0.03,0.05),GA=V3(A.x+0.5,0.03,A.z+0.25),GT=V3(2.9,0.03,0.05);
  // coraza: arenisca en estratos, se levanta desde los pies (uP)
  const SAND_FS=`void main(){vec3 p=vP;float st=.5+.5*sin(p.y*28.+noise(p*4.)*4.);float n=noise(p*30.);
   vec3 c=mix(vec3(.62,.46,.26),vec3(.92,.78,.52),st*.6+n*.4);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float h=vP.y;float rise=step(h,uP);float edge=band(h,uP,.04);
   gl_FragColor=vec4(c*${LIT}+uC1*(fr*.5+edge*1.5)+vec3(1.)*step(.82,n)*.25,(.42+.4*fr+edge)*rise*uA);}`;
  const armor=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(SAND_FS.replace("float h=vP.y;","float h=vP.y*.5+.5;"),Object.assign({},NB)));
  armor.position.set(A.x,0.95,A.z); armor.scale.set(0.95,1.2,0.95);
  // costra en el frente del rival (lado que mira al lanzador): atasca sus ataques cuerpo a cuerpo
  const crust=new THREE.Mesh(new THREE.CylinderGeometry(0.47,0.5,1.25,28,6,true,-Math.PI/2-1.1,2.2),fx(SAND_FS.replace("float h=vP.y;","float h=vP.y/1.25+.5;"),Object.assign({},NB)));
  crust.position.set(3.4,0.68,0);
  L.mesh.add(armor,crust);
  // haz: dos rastros de arena que dibujan las columnas en el suelo
  const lane=(P,Q)=>{const dx=Q.x-P.x,dz=Q.z-P.z,len=Math.hypot(dx,dz);
    const m=groundPlane(len,(P.x+Q.x)/2,0.018,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*80.,v*6.,1.));
     float m=smoothstep(.9,.2,v)*step(u,uP)*smoothstep(.6,.85,n+(1.-v)*.3);gl_FragColor=vec4(mix(uC2,uC1,n)*1.2,m*uA*.8);}`),0.32);
    m.position.z=(P.z+Q.z)/2;m.rotation.y=-Math.atan2(dz,dx);return m;};
  const laneA=lane(G,GA), laneB=lane(G,GT); L.trail.add(laneA,laneB);
  // suelo: anillo de arena bajo el aliado y mancha de arena bajo el rival
  const ringA=groundPlane(2.6,A.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float g=step(.6,hash(vec3(floor(p*60.),1.)))*smoothstep(1.,.5,r);float m=band(r,.78,.06)*(.6+.4*noise(vec3(an*8.,uT,1.)))+g*.5*step(r,uP);
   gl_FragColor=vec4(mix(uC2,uC1,g)*1.3,m*uA);}`));
  ringA.position.z=A.z;
  const stainT=groundPlane(1.9,3.4,0.016,fx(SOFTBURN_FS));
  L.decal.add(ringA,stainT);

  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const float TJ=${f(TJ)};const float TX=${f(TX)};
  const vec3 G=${v3(G)};const vec3 GA=${v3(GA)};const vec3 GT=${v3(GT)};const vec3 AP=${v3(A)};const vec3 CT=${v3(CT)};`+SANG;
  // hormigas de arena: bajan de la cola, marchan por su columna y trepan en espiral (aliado) o por el frente (rival)
  a.count+=points(L.part,230,C+`void main(){float col=step(.5,aSeed.y);float s=T0+aSeed.x*.45;float t=uT-s;
   vec3 dst=col<.5?GA:GT;float spd=col<.5?6.:12.;float dw=length(dst-G)/spd;
   vec3 p,v;float an=aSeed.z*6.2832;
   if(t<.12){float k=clamp(t/.12,0.,1.);p=mix(CT,G,k);v=G-CT;}
   else if(t<.12+dw){float k=(t-.12)/dw;vec3 side=normalize(vec3(-(dst.z-G.z),0.,dst.x-G.x));
    p=mix(G,dst,k)+side*(sin(k*30.+aSeed.w*6.)*.06+(aSeed.w-.5)*.14);v=dst-G;}
   else{float k=clamp((t-.12-dw)/.35,0.,1.);
    if(col<.5){float a2=an+k*5.;float h=.1+k*(.3+1.5*aSeed.w);float rd=.5-.08*k;p=vec3(AP.x+cos(a2)*rd,h,AP.z+sin(a2)*rd);v=vec3(-sin(a2),.6,cos(a2));}
    else{float a2=3.1416+(aSeed.z-.5)*2.;float h=.1+k*(.25+1.05*aSeed.w);p=vec3(3.4+cos(a2)*.52,h,sin(a2)*.52);v=vec3(0.,1.,0.);}}
   float lv=TX+aSeed.x*.2;vA=(t>0.)?1.-smoothstep(lv,lv+.25,uT):0.;put(p,.12+.03*aSeed.w);vMix=sang(v);}`,ANT_FS("vec3(.3,.2,.1)","vec3(.75,.58,.34)"),NB);
  // granos que giran y se compactan en la coraza del aliado
  a.count+=points(L.part,120,C+`void main(){float s=TI-.35+aSeed.x*.4;float life=.55;float k=clamp((uT-s)/life,0.,1.);
   float an=aSeed.y*6.2832+k*6.;float rd=mix(1.4,.95,k*k);float h=.1+aSeed.z*1.95;
   vec3 p=vec3(AP.x+cos(an)*rd,h*(1.-.3*(1.-k)),AP.z+sin(an)*rd);
   vA=(uT>s)?(k<1.?smoothstep(0.,.2,k):(1.-smoothstep(TI+.1,TI+.4,uT))):0.;put(p,.04+.03*aSeed.w);}`,CHIP_FS);
  // arena que se agarra al frente del rival
  a.count+=points(L.part,80,C+`void main(){float s=TJ-.25+aSeed.x*.35;float k=clamp((uT-s)/.4,0.,1.);
   float an=3.1416+(aSeed.y-.5)*2.;vec3 e=vec3(3.4+cos(an)*.5,.15+aSeed.z*1.2,sin(an)*.5);vec3 st=e+vec3(-.6,.5,0.)*aSeed.w+vec3(-.3,0.,0.);
   vec3 p=mix(st,e,k*k);vA=(uT>s)?(1.-smoothstep(TX,TX+.35,uT))*(k<1.?k:.7+.3*sin(uT*8.+aSeed.x*20.)):0.;put(p,.035+.03*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,40,C+`void main(){float s=TJ+aSeed.x*.15;float life=.7;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 p=vec3(3.0,.3+aSeed.y*1.,(aSeed.z-.5)*.6)+vec3(-.5*c,.2*c,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.6:0.;put(p,(.22+.18*aSeed.w)*(.6+age));}`,DUST_FS,NB);

  a.pose=function(te,o){
    const ia=te-TI, ij=te-TJ, envA=win(te,TI-0.3,TI,TX,TE-0.05), envT=win(te,TJ-0.2,TJ+0.1,TX,TE-0.05);
    caster.rotation.z=0.08*ss(0,T0,te)-0.08*ss(T0,0.4,te);
    armor.visible=envA>0.001; set(armor,ss(TI-0.3,TI+0.05,te)*1.02,envA*(0.85+0.3*hitK(ia,5)));
    crust.visible=envT>0.001; set(crust,ss(TJ-0.2,TJ+0.15,te)*1.02,envT);
    set(laneA,ss(T0+0.1,TI-0.3,te),win(te,T0,T0+0.1,TI,TX)); set(laneB,ss(T0+0.1,TJ-0.2,te),win(te,T0,T0+0.1,TJ,TX));
    set(ringA,ss(TI-0.3,TI+0.3,te),win(te,TI-0.4,TI-0.1,TX,TE));
    stainT.material.uniforms.uA.value=0.7*envT;
    glowOn(allies[0],0.55*hitK(ia,4)+0.12*envA);
    // rival atascado: rígido, con un leve temblor al quedar trabado
    target.position.x=3.4+0.012*Math.sin(te*50)*hitK(ij,3); target.scale.set(1,1-0.03*envT,1);
    o.em=0.2*envT; o.emc.copy(U.uC2.value);
    if(te<TI-0.3){o.g.set(-2.5,0.3,-0.5);o.gs=1.2;o.ga=0.15;o.li=1.2;}
    else if(te<TJ){o.g.set(A.x,1.0,A.z);o.gs=1.8;o.ga=0.25+0.35*hitK(ia,5);o.li=2+4*hitK(ia,4);}
    else{o.g.set(3.2,0.8,0);o.gs=1.4;o.ga=0.25*hitK(ij,4)+0.1;o.li=2.5*hitK(ij,4)+1;}
    if(ij>=0){o.ia=ij;o.c.set(3.2,0.8,0);o.dist=0.3;o.flash=0.35;}
    else{o.ia=ia;o.c.set(A.x,1,A.z);o.dist=0.3;o.flash=0;}
    o.shake=0;
  };
}};

// =====================================================================
// 4 · PUPAE (2 PA, aliado) — de la cola salen hebras de seda dorada que alcanzan al aliado y lo envuelven en cintas
//     hasta cerrar una crisálida reluciente colgada de un hilo; dentro late una luz que lo regenera
// =====================================================================
const pupae={key:"itPupae",name:"Pupae",pa:2,dur:2.3,ti:1.0,pal:"Celestial",allies:1,
  phases:[["Hilado",0],["Envoltura",0.35],["Crisálida",1.0],["Latido",1.3],["Fin",1.95]],
build(a){
  const L=a.L,TS=0.05,TW=0.35,TI=1.0,TB=[1.3,1.65],TX=1.95,TE=2.3,NT=5;
  // hebras: de la cola a puntos del cuerpo del aliado, en arco
  const SILK_FS=`void main(){float u=vUv.x;if(u>uP)discard;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float gl=pow(.5+.5*sin(u*80.-uT*14.),8.);float head=smoothstep(.06,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.35+gl*.5)*1.5,(.35+.5*fr+gl*.6+head)*uA);}`;
  const threads=[...Array(NT)].map((_,i)=>{const an=Math.PI*0.6+i*0.35,E=V3(A.x+Math.cos(an)*0.45,0.5+i*0.28,A.z+Math.sin(an)*0.45);
    const M=V3((CT.x+E.x)/2,2.2+0.25*i,(CT.z+E.z)/2-0.3);
    const m=new THREE.Mesh(pathTube((t,o)=>qb(CT,M,E,t,o),24,60,5,0.018,0.012),fx(SILK_FS));m.userData={d:i*0.05};L.trail.add(m);return m;});
  // cintas de seda en hélice que suben envolviendo al aliado
  const WRAP_FS=`void main(){float u=vUv.x;if(u>uP)discard;float w=vUv.y;float fib=.5+.5*sin(w*30.+u*400.);
   float gl=pow(.5+.5*sin(u*60.-uT*8.),10.);float head=smoothstep(.04,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*fib)*1.3+vec3(1.)*(gl*.4+head),(.45+.3*fib+gl*.4+head)*band(w,.5,.45)*uA);}`;
  const wraps=[0,1,2].map(i=>{const m=new THREE.Mesh(helixGeo(3.5+i*0.6,0.56-i*0.02,0.5-i*0.03,1.95,0.075,260),fx(WRAP_FS));
    m.position.set(A.x,0.05,A.z);m.rotation.y=i*2.1;m.userData={d:i*0.09};L.mesh.add(m);return m;});
  // crisálida: seda tejida translúcida con luz interior que late (uQ)
  const pupa=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fxU(`uniform float uQ;
  void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   float an=atan(q.z,q.x);float w1=pow(.5+.5*sin(an*18.+q.y*14.),6.),w2=pow(.5+.5*sin(an*18.-q.y*14.),6.);
   float weave=max(w1,w2);float core=(1.-fr)*uQ;
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*weave)*(1.+.6*fr)+vec3(1.,.95,.8)*core,(fr*.5+weave*.22+core*.6)*uA);}`,{uQ:{value:0}}));
  pupa.position.set(A.x,1.0,A.z); pupa.scale.set(0.64,1.15,0.64);
  const tether=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,1.2,6),fx(`void main(){gl_FragColor=vec4(uC1*1.6,uA*(.5+.5*smoothstep(0.,.3,vUv.y)));}`));
  tether.position.set(A.x,2.75,A.z);
  L.mesh.add(pupa,tether);
  // suelo: telaraña de seda centrada en el aliado
  const web=groundPlane(2.8,A.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float spokes=smoothstep(.012,0.,abs(fract(an/6.2832*12.)-.5)*r*.52);
   float rings=smoothstep(.02,0.,abs(fract(r*6.+sin(an*12.)*.03)-.5)-.47);
   float m=(spokes*.8+rings*.6)*step(r,uP)*smoothstep(1.,.7,r)+band(r,uP,.03)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,m*uA);}`));
  web.position.z=A.z; L.decal.add(web);

  const C=`const float TW=${f(TW)};const float TI=${f(TI)};const float TX=${f(TX)};const vec3 CT=${v3(CT)};const vec3 AP=${v3(A)};`;
  // motas de seda que corren por las hebras
  a.count+=points(L.part,110,C+`void main(){float s=.05+aSeed.x*(TI-.2);float k=clamp((uT-s)/.4,0.,1.);
   vec3 e=AP+vec3(cos(aSeed.y*6.28)*.45,.5+aSeed.z*1.2,sin(aSeed.y*6.28)*.45);vec3 m=(CT+e)*.5+vec3(0.,1.6,-.3);
   float u=1.-k;vec3 p=u*u*CT+2.*u*k*m+k*k*e;vA=(uT>s&&k<1.)?sin(k*3.14159):0.;put(p,.035+.03*aSeed.w);}`);
  // destellos de la envoltura y glitter que gira alrededor de la crisálida
  a.count+=points(L.part,26,C+`void main(){float s=TI+aSeed.x*.12;float life=.45;float age=(uT-s)/life;
   vec3 p=AP+vec3(cos(aSeed.y*6.28)*.6,.2+aSeed.z*1.7,sin(aSeed.y*6.28)*.6);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.18+.1*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(L.part,60,C+`void main(){float an=aSeed.x*6.2832+uT*(1.+.5*aSeed.y);float rad=.85+.15*aSeed.z;
   vec3 p=vec3(AP.x+cos(an)*rad,.15+aSeed.w*2.+sin(uT*2.+aSeed.x*9.)*.1,AP.z+sin(an)*rad);vA=uE*(.5+.5*sin(uT*9.+aSeed.y*30.));put(p,.035*uE+.001);}`);
  // regeneración: cruces de luz que suben con cada latido
  a.count+=points(L.part,34,C+`void main(){float s=${f(TB[0])}+step(.5,aSeed.y)*${f(TB[1]-TB[0])}+aSeed.x*.15;float life=.7+aSeed.z*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 p=AP+vec3((aSeed.w-.5)*1.1,.4+aSeed.z*1.2+c*1.,(aSeed.x-.5)*1.1);vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.16+.08*aSeed.w);}`,CROSS_FS);

  a.pose=function(te,o){
    const ia=te-TI, env=win(te,TI-0.1,TI+0.1,TX,TE-0.05);
    let beat=0; for(const t of TB)if(te>=t)beat=Math.max(beat,Math.exp(-(te-t)*5));
    caster.rotation.z=0.08*ss(0,TW,te)*(1-ss(TW,TI,te)); glowOn(caster,0.2*win(te,0,0.1,TW,TI));
    threads.forEach(m=>{const d=m.userData.d;m.visible=te>=TS+d&&te<TI+0.5;set(m,cl((te-TS-d)/0.35),1-ss(TI,TI+0.5,te));});
    wraps.forEach(m=>{const d=m.userData.d,k=cl((te-TW-d)/(TI-TW-0.1));m.visible=k>0&&te<TI+0.4;set(m,k*1.01,1-ss(TI,TI+0.4,te));});
    pupa.visible=env>0.001; set(pupa,0,env*(0.8+0.3*beat)); pupa.material.uniforms.uQ.value=0.2+0.8*beat+0.6*hitK(ia,5);
    pupa.scale.set(0.64*(1+0.04*beat),1.15*(1+0.03*beat),0.64*(1+0.04*beat));
    tether.visible=env>0.001; tether.material.uniforms.uA.value=env*0.8;
    set(web,ss(TS,TI,te),ss(TS,TS+0.2,te)*(1-ss(TX,TE,te)));
    U.uE.value=env; glowOn(allies[0],0.35*hitK(ia,4)+0.6*beat+0.1*env);
    if(te<TW){o.g.copy(CT);o.gs=0.7;o.ga=0.22;o.li=1.4;}
    else{o.g.set(A.x,1.0,A.z);o.gs=1.6+0.6*beat;o.ga=0.18+0.3*hitK(ia,5)+0.3*beat;o.li=2+4*hitK(ia,4)+3*beat;}
    o.ia=ia;o.c.set(A.x,1,A.z);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 5 · THORNY CATERPILLAR (3 PA) — junto a la cola se enrosca una oruga gigante erizada de púas venenosas y rueda,
//     acelerando, hacia el rival dejando un rastro de baba ácida que arde; al chocar dispara sus púas, salpica ácido
//     y fractura la baldosa
// =====================================================================
const cater={key:"itThornyCaterpillar",name:"Thorny Caterpillar",pa:3,dur:3.1,ti:1.55,pal:"Ácido",
  phases:[["Oruga",0],["Enroscado",0.35],["Rodada",0.6],["Impacto",1.55],["Veneno",1.85],["Rastro",2.4]],
build(a){
  const L=a.L,TF=0.35,TR=0.6,TI=1.55,TE=3.05,X0=-4.45,XI=2.2,R=0.55,TB=0.27,RW=R+TB,Y0=RW+0.04,EXP=1.6;
  const xAt=te=>te<TR?X0:X0+(XI-X0)*Math.pow(cl((te-TR)/(TI-TR)),EXP);
  // cuerpo: toro segmentado con bandas, puntos y brillo; uQ disuelve tras el choque
  const BODY_FS=`uniform float uQ;
  void main(){float seg=fract(vUv.x*16.);float ring=smoothstep(.0,.12,seg)*smoothstep(1.,.88,seg);
   float dots=smoothstep(.12,.06,length(vec2(seg-.5,(vUv.y-.25)*2.)))+smoothstep(.12,.06,length(vec2(seg-.5,(vUv.y-.75)*2.)));
   vec3 c=mix(vec3(.12,.2,.04),vec3(.48,.62,.12),ring)+vec3(1.,.75,.1)*dots*.8;
   float dz=noise(vP*6.)-uQ*1.1+.05;if(dz<0.)discard;float edge=smoothstep(.1,0.,dz)*step(.001,uQ);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(18)}*.35+uC1*(fr*(.3+uA)+edge*2.5),1.);}`;
  const bodyMat=fxU(BODY_FS,{uQ:{value:0}},SOLID);
  const wheel=new THREE.Group(), roll=new THREE.Group(); wheel.add(roll); L.mesh.add(wheel);
  roll.add(new THREE.Mesh(new THREE.TorusGeometry(R,TB,18,64),bodyMat));
  // púas: base oscura y punta venenosa que brilla
  const spikeMat=fxU(`uniform float uQ;void main(){float h=vUv.y;float dz=noise(vP*20.)-uQ*1.1+.05;if(dz<0.)discard;
   gl_FragColor=vec4(mix(vec3(.08,.06,.03),vec3(.3,.25,.08),h)*${LIT}+uC1*smoothstep(.6,1.,h)*(1.+uA),1.);}`,{uQ:{value:0}},SOLID);
  const spG=new THREE.ConeGeometry(0.07,0.38,7).translate(0,0.19,0);
  for(let i=0;i<32;i++){const ph=i/32*Math.PI*2+(i%2)*0.1,z=(i%2?1:-1)*0.13,m=new THREE.Mesh(spG,spikeMat);
    m.position.set(Math.cos(ph)*(RW-0.06),Math.sin(ph)*(RW-0.06),z);m.rotation.z=ph-Math.PI/2;roll.add(m);}
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.set(XI+RW,Y0,0);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4,4),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing);
  // rastro de baba ácida que arde (uP = avance de la oruga); llamas que lamen la superficie
  const TRL=XI-X0;
  const slime=groundPlane(TRL,(X0+XI)/2,0.018,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*${f(TRL*3)},vUv.y*4.,uT*.6))*.6+noise(vec3(u*${f(TRL*9)},vUv.y*12.,1.))*.4;
   float w=.62+.25*sin(u*${f(TRL*2.2)})+(n-.5)*.3;float body=smoothstep(w,w-.15,v)*step(u,uP);
   float fl=smoothstep(.55,.85,noise(vec3(u*${f(TRL*5)}-uT*.5,vUv.y*6.,uT*2.)));
   vec2 g=vec2(u*${f(TRL*8)},vUv.y*7.);vec2 id=floor(g);float h=hash(vec3(id,9.));float ph=fract(uT*(.6+h)+h*5.);
   float bub=smoothstep(.07,0.,abs(length(fract(g)-.5)-.3*ph))*step(.7,h)*(1.-ph);
   float head=smoothstep(.06,0.,uP-u)*step(uP,.999);
   gl_FragColor=vec4(mix(uC2,uC1,fl+bub+head)*1.4,(body*(.35+.4*fl+.6*bub)+head*body)*uA);}`),0.95);
  L.trail.add(slime);
  const FS=7, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS))), shock=groundPlane(5.5,3.4,0.03,fx(RING_FS));
  L.decal.add(frac,shock);

  const C=`const float TF=${f(TF)};const float TR=${f(TR)};const float TI=${f(TI)};const float TE=${f(TE)};const float X0=${f(X0)};const float XI=${f(XI)};
  const float Y0=${f(Y0)};const float RW=${f(RW)};const vec3 CT=${v3(CT)};const vec3 HP=vec3(${f(XI+RW)},${f(Y0)},0.);
  float tAt(float x){return TR+pow(clamp((x-X0)/(XI-X0),0.,1.),${f(1/EXP)})*(TI-TR);}`;
  // formación: motas verdes que convergen al enroscarse
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TF-.1);float k=clamp((uT-s)/.25,0.,1.);
   vec3 c=vec3(X0,Y0,0.);vec3 p=c+normalize(rnd()+.001)*mix(1.4,RW*.9,k*k);vA=(uT>s&&k<1.)?smoothstep(0.,.3,k):0.;put(p,.04+.03*aSeed.z);}`);
  // llamas ácidas que siguen ardiendo sobre el rastro, en bucle
  a.count+=points(L.part,200,C+`void main(){float x=mix(X0+.1,XI,aSeed.x);float sx=tAt(x);float life=.45+aSeed.y*.3;
   float k=(uT-sx)/life+aSeed.z;float cy=floor(k);float age=fract(k);vec3 r=rr(cy);
   vec3 p=vec3(x+(r.x-.5)*.3,.04+age*(.35+.35*r.y),(r.z-.5)*.75);
   float on=step(sx,uT)*(1.-smoothstep(TE-.6,TE-.1,uT));vA=on*sin(age*3.14159)*.9;put(p,(.16+.12*r.y)*(1.-age*.4));}`,FLAME_FS);
  a.count+=points(L.part,70,C+`void main(){float x=mix(X0+.1,XI,aSeed.x);float sx=tAt(x);float life=.6+aSeed.y*.4;
   float k=(uT-sx)/life+aSeed.z;float cy=floor(k);float age=fract(k);vec3 r=rr(cy);
   vec3 p=vec3(x+(r.x-.5)*.3,.05+age*.25,(r.z-.5)*.7);float on=step(sx,uT)*(1.-smoothstep(TE-.6,TE-.1,uT));
   vA=on*sin(age*3.14159);put(p,.06+.06*r.y);}`,BUBBLE_FS);
  // choque: púas disparadas, salpicadura ácida, chispas, humo
  a.count+=points(L.part,160,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),sin(an),(aSeed.w-.5)*1.2)*(4.+6.*aSeed.y);vec3 c0=vec3(XI,Y0,0.);
   vec3 p=c0+vec3(cos(an),sin(an),0.)*RW+v*c+vec3(0.,-5.*c*c,0.);vec3 vel=v+vec3(0.,-10.*c,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.22+.1*aSeed.w);vMix=atan(vel.y,vel.x);}`,SHARD_FS);
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 v=normalize(rnd()+vec3(.2,.6,0.))*(2.5+5.*aSeed.z);vec3 p=HP+v*c+vec3(0.,-7.*c*c,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.08+.1*aSeed.w)*(p.y<.04?1.4:1.));vMix=aSeed.w;}`,DROP_FS("mix(uC2,uC1,.6)"),NB);
  a.count+=sparks(L.part,220,TI,`${f(XI+RW)},${f(Y0)},0.`,".3,.4,0.",4,12,3);
  a.count+=points(L.part,70,C+`void main(){float s=TI+.05+aSeed.x*.4;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.3,.6,0.));vec3 p=vec3(XI,Y0,0.)+d*(.3+.9*aSeed.z)*(1.-exp(-c*2.5))+vec3(0.,.5*c,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.55:0.;put(p,(.4+.3*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.12,.16,.06)"),NB);

  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TF,te), x=xAt(te), q=ss(TI+0.15,TI+0.6,te);
    const reb=ia>=0?-0.5*(1-Math.exp(-ia*6))*Math.exp(-ia*1.5):0;
    wheel.visible=te>0.02&&q<0.999; wheel.position.set(x+reb,Y0*Math.max(form,0.3)+(te>TR&&te<TI?0.06*Math.abs(Math.sin(te*14)):0),0);
    wheel.scale.setScalar(Math.max(form,0.001)*(1+0.12*hitK(ia,10)));
    roll.rotation.z=te<TR?te*6:TR*6-(x-X0)/RW+reb*0.5;
    bodyMat.uniforms.uQ.value=q; spikeMat.uniforms.uQ.value=Math.max(q,ss(TI,TI+0.08,te)*0.9);
    bodyMat.uniforms.uA.value=0.3*form+0.7*ss(TR,TI,te); spikeMat.uniforms.uA.value=bodyMat.uniforms.uA.value;
    caster.rotation.z=0.1*ss(0,TF,te)-0.15*ss(TF,TR,te)*(1-ss(TR,TR+0.4,te));
    set(slime,(x-X0)/(XI-X0),te>=TR?1-ss(TE-0.6,TE-0.1,te):0);
    let p=cl(ia/0.55); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.4+1.5*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.4); towardCam(hitRing.position,tmp.set(XI+RW,Y0,0),0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.75); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    const hit=hitK(ia,3); target.position.x=3.4+hit*0.75*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.45*Math.cos(ia*12);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,TI+1.6,te):0);
    o.em=ia>=0?(0.2+0.15*Math.sin(te*9))*(1-ss(TE-0.5,TE,te)):0; o.emc.copy(U.uC1.value);
    if(te<TR){o.g.set(X0,Y0,0);o.gs=1.2*form+0.3;o.ga=0.3*form;o.li=2.5*form;}
    else if(te<TI){o.g.set(x,Y0,0);o.gs=1.8;o.ga=0.4+0.25*ss(TR,TI,te);o.li=4+4*ss(TR,TI,te);}
    else{o.g.set(XI+RW,Y0,0);o.gs=2+6*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.95+0.08;o.li=15*Math.exp(-ia*4)+1;}
    o.ia=ia;o.c.set(XI+RW,Y0,0);o.shake=1.7;o.dist=1.25;
  };
}};

// =====================================================================
// 6 · TWIN TAIL (2 PA) — dos aguijones espectrales de avispa surgen de la cola, se tensan sobre el lanzador y se
//     estiran en tándem hasta clavarse en el rival; la toxina corrosiva perfora su coraza en agujeros humeantes.
//     Al final una hebra de seda dorada (carga de Capullo) rodea al Axie
// =====================================================================
const twin={key:"itTwinTail",name:"Twin Tail",pa:2,dur:2.1,ti:0.7,pal:"Toxina",
  phases:[["Aguijones",0],["Tensión",0.4],["Primer golpe",0.7],["Segundo",0.95],["Corrosión",1.15],["Capullo",1.5]],
build(a){
  const L=a.L,TP=0.4,TH=[0.7,0.95],TK=0.12,TCB=1.5,TE=2.05;
  const P=[V3(-4.55,2.25,0.35),V3(-4.4,2.6,-0.3)], HT=[V3(3.12,1.4,0.1),V3(3.12,1.0,-0.1)];
  // aguijón: cono afinado con anillos de avispa; el origen está en la punta; uA = brillo del veneno
  const stG=new THREE.ConeGeometry(0.12,1,14,1).rotateZ(-Math.PI/2).translate(-0.5,0,0);
  const STING_FS=`void main(){float x=-vP.x;float band1=step(.5,fract(x*7.));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float tip=smoothstep(.12,0.,x);
   vec3 c=mix(uC2*.5,uC1,band1)*(.35+.9*fr)+vec3(1.)*tip*uA;
   gl_FragColor=vec4(c*1.3,(.25+.6*fr+band1*.2+tip)*min(uA+.4,1.)*uP);}`;
  const st=[0,1].map(()=>{const m=new THREE.Mesh(stG,fx(STING_FS));L.mesh.add(m);return m;});
  // trazo de cada estocada
  const streaks=[0,1].map(i=>{const m=new THREE.Mesh(pathTube((t,o)=>o.lerpVectors(P[i],HT[i],t),2,20,6,0.05,0.02),fx(`void main(){float u=vUv.x;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float s=smoothstep(.0,.4,noise(vec3(u*30.-uT*20.,vUv.y*6.,1.)));
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.6,u*(.3+.7*s)*(.4+.6*fr)*uA);}`));L.trail.add(m);return m;});
  // corrosión: agujeros que se abren en la coraza del rival, con borde incandescente y burbujeo
  const corr=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.9),fx(`void main(){vec2 p=(vUv-.5)*vec2(1.5,1.9);
   float m=smoothstep(.75,.3,length(p*vec2(1.,.75)));float n=noise(vec3(p*7.,1.))*.6+noise(vec3(p*16.,uT*.8))*.4;
   float th=1.-uP*.55;float hole=smoothstep(th,th+.04,n);float rim=band(n,th,.05);
   vec2 g=p*10.;float h=hash(vec3(floor(g),2.));float ph=fract(uT*1.5*(.5+h)+h*7.);
   float bub=smoothstep(.06,0.,abs(length(fract(g)-.5)-.3*ph))*step(.65,h)*(1.-ph)*step(th-.15,n);
   gl_FragColor=vec4(mix(uC2,uC1,rim+bub)*1.6+vec3(1.)*rim*.3,(hole*.35+rim*1.3+bub)*m*uA);}`,{depthTest:false}));
  L.mesh.add(corr);
  // capullo: hebra dorada (color fijo de la seda del Capullo) que envuelve al Axie
  const silk=new THREE.Mesh(helixGeo(2.5,0.55,0.45,1.5,0.05,200),fx(`void main(){float u=vUv.x;if(u>uP)discard;
   float gl=pow(.5+.5*sin(u*50.-uT*10.),8.);gl_FragColor=vec4(vec3(1.,.85,.42)*1.6+vec3(gl*.5),(.6+gl)*band(vUv.y,.5,.45)*uA);}`));
  silk.position.set(-3.7,0.15,0); L.mesh.add(silk);
  const stain=groundPlane(2,3.4,0.016,fx(SOFTBURN_FS)), rings=TH.map(()=>groundPlane(2.6,3.4,0.03,fx(RING_FS)));
  L.decal.add(stain,...rings);

  const C=`const float TP=${f(TP)};const float TH0=${f(TH[0])};const float TH1=${f(TH[1])};const float TCB=${f(TCB)};
  const vec3 CT=${v3(CT)};const vec3 P0=${v3(P[0])};const vec3 P1=${v3(P[1])};const vec3 HP=${v3(TC)};`;
  // energía que sube de la cola a las posiciones de tensión
  a.count+=points(L.part,70,C+`void main(){float s=aSeed.x*TP;float k=clamp((uT-s)/.25,0.,1.);vec3 e=aSeed.y<.5?P0:P1;
   vec3 p=mix(CT,e,k)+vec3(0.,sin(k*3.14)*.4,0.)+rnd()*.08;vA=(uT>s&&k<1.)?sin(k*3.14159):0.;put(p,.035+.03*aSeed.w);}`);
  // gotas corrosivas que escurren del pecho y burbujas tóxicas
  a.count+=points(L.part,90,C+`void main(){float s=TH0+aSeed.x*1.1;float t=uT-s;float c=max(t,0.);
   vec3 p=HP+vec3(-.05,(aSeed.y-.5)*.9,(aSeed.z-.5)*.5)+vec3(0.,-.6*c-2.5*c*c,0.);
   vA=(t>0.&&t<.6&&p.y>.03)?1.-t/.6:0.;put(p,.05+.04*aSeed.w);vMix=aSeed.z;}`,DROP_FS("mix(uC1,uC2,.35)"),NB);
  a.count+=points(L.part,70,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TH0)/life+aSeed.x;float cy=floor(k);float age=fract(k);vec3 r=rr(cy);
   vec3 p=HP+vec3(-.1,(r.y-.5)*.8+age*.5,(r.z-.5)*.5);vA=step(1.,k)*sin(age*3.14159)*(1.-smoothstep(1.5,1.9,uT));put(p,.05+.05*r.x);}`,BUBBLE_FS);
  TH.forEach((t,i)=>{a.count+=sparks(L.part,70,t,`${f(HT[i].x)},${f(HT[i].y)},${f(HT[i].z)}`,"-.5,.3,0.",2,6.5,2.5);});
  // destellos de la seda del capullo
  a.count+=points(L.part,30,C+`void main(){float s=TCB+aSeed.x*.3;float life=.4;float age=(uT-s)/life;float an=aSeed.y*6.2832;
   vec3 p=vec3(-3.7+cos(an)*.52,.2+aSeed.z*1.4,sin(an)*.52);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.06*aSeed.w)*(1.-age*.5));}`,STAR4_FS);

  const tip=V3(0,0,0), dir=V3(0,0,0), GOLD=new THREE.Color(1,0.85,0.42);
  a.pose=function(te,o){
    const ia=te-TH[0];
    let kb=0,last=-1;
    st.forEach((m,i)=>{const th=TH[i],rise=ss(0.05+i*0.08,TP+i*0.05,te),cock=ss(TP,th-TK,te),thr=cl((te-(th-TK))/TK),ret=ss(th+0.12,th+0.45,te);
      // la base sigue en su punto de tensión; la punta se estira hasta el rival y luego se recoge
      const base=tmp.copy(CT).lerp(P[i],rise); base.x-=0.25*cock*(1-thr);
      const reach=Math.pow(thr,2)*(1-ret);
      dir.copy(HT[i]).sub(base); const dist=dir.length(); dir.multiplyScalar(1/dist);
      const len=Math.max(0.9*rise,reach*dist,0.001); tip.copy(base).addScaledVector(dir,len);
      m.position.copy(tip); m.quaternion.setFromUnitVectors(XA,dir); m.scale.set(len,1+0.3*cock*(1-thr),1+0.3*cock*(1-thr));
      m.visible=rise>0.01&&te<th+0.6; set(m,1-ss(th+0.3,th+0.6,te),0.3*cock+hitK(te-th,4));
      const d=te-th; set(streaks[i],0,d>=-0.03&&d<0.3?(d<0?1:1-d/0.3):0); streaks[i].visible=d>=-0.03&&d<0.3;
      const p=cl(d/0.4); set(rings[i],p,d>=0?(1-p)*0.7:0);
      if(d>=0){kb+=0.12*Math.exp(-d*9);last=th;}});
    caster.rotation.z=0.12*ss(0,TP,te)-0.2*ss(TH[0]-TK,TH[0],te)*(1-ss(TH[1]+0.1,TH[1]+0.5,te));
    corr.visible=te>=TH[0]&&te<TE; towardCam(corr.position,TC,0.35); billboard(corr);
    set(corr,0.4*ss(TH[0],TH[0]+0.25,te)+0.6*ss(TH[1],TH[1]+0.3,te),1-ss(TE-0.45,TE,te));
    stain.material.uniforms.uA.value=0.8*win(te,TH[0],TH[0]+0.3,TE-0.4,TE);
    silk.visible=te>=TCB&&te<TE; set(silk,ss(TCB,TCB+0.3,te)*1.01,1-ss(TE-0.25,TE,te));
    glowOn(caster,0.15*ss(0,TP,te)*(1-ss(TH[0],TH[1],te))+0.6*hitK(te-TCB,5)*(te>=TCB?1:0),te>=TCB?GOLD:null);
    target.position.x=3.4+kb; target.rotation.z=-kb*1.2*Math.cos((te-last)*20);
    o.em=0.25*win(te,TH[0],TH[0]+0.2,TE-0.4,TE); o.emc.copy(U.uC1.value);
    if(te<TH[0]-TK){o.g.set(-4.45,2.4,0);o.gs=1+0.5*ss(TP,TH[0],te);o.ga=0.3;o.li=2+2*ss(TP,TH[0],te);}
    else if(te<TCB){const il=last>0?te-last:0;o.g.copy(TC);o.gs=1.2+2*Math.min(il,0.4);o.ga=last>0?Math.exp(-il*8)*0.7+0.1:0.4;o.li=last>0?7*Math.exp(-il*5)+1:3;}
    else{o.g.set(-3.7,1,0);o.gs=1.6;o.ga=0.25*hitK(te-TCB,4);o.li=2.5*hitK(te-TCB,3);}
    o.ia=last>0?te-last:ia;o.c.copy(TC);o.shake=0;o.dist=0.7;o.flash=0.9;
  };
}};

// =====================================================================
// 7 · CENTIPEDE (1 PA) — un ciempiés de fuego cae de la cola y corre como un rayo por las líneas de la cuadrícula
//     hasta morder los pies del rival; las líneas que recorre quedan ardiendo y tres pulsos de veneno suben por él
// =====================================================================
const centi={key:"itCentipede",name:"Centipede",pa:1,dur:1.3,ti:0.42,pal:"Fuego",
  phases:[["Salida",0],["Carrera",0.06],["Mordisco",0.42],["Rastro",0.6],["Fin",1.0]],
build(a){
  const L=a.L,T0=0.06,TI=0.42,TD=0.7,TE=1.25,NS=12,GAP=0.1,Y=0.07;
  const PTS=[V3(-4.2,Y,0),V3(-2,Y,0),V3(-2,Y,1),V3(1,Y,1),V3(1,Y,0),V3(2.95,Y,0)];
  const SEG=[];let LT=0; for(let i=0;i<PTS.length-1;i++){const l=PTS[i].distanceTo(PTS[i+1]);SEG.push([LT,l]);LT+=l;}
  const pathAt=(d,o)=>{d=Math.max(0,Math.min(d,LT));for(let i=0;i<SEG.length;i++){const [s,l]=SEG[i];if(d<=s+l||i===SEG.length-1)return o.lerpVectors(PTS[i],PTS[i+1],cl((d-s)/l));}return o;};
  const PATH_GL=`vec3 pathAt(float d){d=clamp(d,0.,${f(LT)});`+SEG.map(([s,l],i)=>`if(d<=${f(s+l)})return mix(${v3(PTS[i])},${v3(PTS[i+1])},(d-${f(s)})/${f(l)});`).join("")+`return ${v3(PTS[PTS.length-1])};}`;
  const dAt=te=>te<T0?0:LT*cl((te-T0)/(TI-T0));
  // segmentos de fuego: esferas con llama que se agita; la cabeza tiene un núcleo blanco
  const FIRE_FS=`void main(){vec3 q=normalize(vP);float n=noise(q*3.+vec3(0.,-uT*8.,uT*3.));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   gl_FragColor=vec4(mix(uC2,uC1,n*.6+(1.-fr)*.5)*1.6+vec3(1.)*(1.-fr)*uP,(.4+.6*fr*n+(1.-fr)*.5)*uA);}`;
  const segMat=fx(FIRE_FS), headMat=fx(FIRE_FS), sg=new THREE.SphereGeometry(1,16,12);
  const segs=[...Array(NS)].map((_,i)=>{const m=new THREE.Mesh(sg,i===0?headMat:segMat);L.mesh.add(m);return m;});
  const bite=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(RING_FS,{depthTest:false})); L.mesh.add(bite);
  // veneno: tres anillos horizontales que suben por el rival
  const venom=[0.35,0.75,1.15].map(y=>{const m=groundPlane(1.15,3.4,y,fx(RING_FS));L.mesh.add(m);return m;});
  // rastro ardiente sobre las líneas de la cuadrícula: un tramo por segmento del recorrido
  const trails=SEG.map(([s,l],i)=>{const P=PTS[i],Q=PTS[i+1],alongX=Math.abs(Q.x-P.x)>0.01;
    const u=alongX?(Q.x>P.x?"vUv.x":"1.-vUv.x"):(Q.z>P.z?"1.-vUv.y":"vUv.y"), v=alongX?"vUv.y":"vUv.x";
    const m=groundPlane(alongX?l+0.1:0.16,(P.x+Q.x)/2,0.02,fx(`void main(){float u=${u};float v=abs(${v}-.5)*2.;
     float n=noise(vec3(u*${f(l*10)}-uT*2.,v*3.,uT*3.));float line=smoothstep(.9,.1,v)*(.5+.5*n);
     float rev=step(u,uP);float hot=exp(-max(uP-u,0.)*${f(l*1.5)})*rev;
     gl_FragColor=vec4(mix(uC2,uC1,hot+n*.3)*1.6,line*rev*(.35+.65*hot)*uA);}`),alongX?0.16:l+0.1);
    m.position.z=(P.z+Q.z)/2;m.userData={s,l};L.trail.add(m);return m;});

  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};const float LT=${f(LT)};const vec3 CT=${v3(CT)};`+PATH_GL+`
  float dAt(float t){return t<T0?0.:LT*clamp((t-T0)/(TI-T0),0.,1.);}`;
  // patas de fuego: llamitas que parpadean a lo largo del cuerpo
  a.count+=points(L.part,110,C+`void main(){float i=floor(aSeed.x*${f(NS)});float d=dAt(uT)-i*${f(GAP)};
   vec3 p=pathAt(d)+vec3((aSeed.y-.5)*.12,.02+aSeed.z*.06,(aSeed.w-.5)*.22);
   float on=step(T0,uT)*step(0.,d)*(1.-smoothstep(TI+.15,TI+.3,uT));vA=on*(.5+.5*sin(uT*60.+aSeed.x*90.));put(p,.07+.04*aSeed.z);}`,FLAME_FS);
  // brasas que saltan del rastro tras el paso
  a.count+=points(L.part,120,C+`void main(){float d=aSeed.x*LT;float s=T0+d/LT*(TI-T0);float life=.35+aSeed.y*.35;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 p=pathAt(d)+vec3((aSeed.z-.5)*.1,c*(.6+.8*aSeed.w),(aSeed.w-.5)*.1);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.03*aSeed.z)*(1.-age*.5));}`);
  a.count+=sparks(L.part,55,TI,"3.0,.15,0.",".2,.6,0.",1.5,4,2.5);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, d=dAt(te), out=ss(TI+0.15,TI+0.35,te);
    segs.forEach((m,i)=>{const di=d-i*GAP;
      if(te<T0){sp.copy(CT).lerp(PTS[0],te/T0);m.position.copy(sp);m.position.x-=i*0.02;}else pathAt(di,m.position);
      if(ia>=0)m.position.y=Y+0.06*Math.sin(ia*40+i)*Math.exp(-ia*8);
      m.visible=(te<T0||di>=0)&&out<0.999; m.scale.setScalar(Math.max((i===0?0.085:0.07-0.003*i)*(1-out),0.001));});
    segMat.uniforms.uA.value=1-out; headMat.uniforms.uA.value=1-out; headMat.uniforms.uP.value=0.6;
    trails.forEach(m=>{const {s,l}=m.userData;set(m,cl((d-s)/l),te>=T0?1-ss(TD,TE,te):0);});
    let p=cl(ia/0.25); towardCam(bite.position,tmp.set(3.0,0.25,0),0.3); billboard(bite); bite.visible=ia>=0&&p<1; set(bite,p,1-p);
    venom.forEach((m,i)=>{const t=ia-0.05-i*0.1,q=cl(t/0.3);m.visible=t>=0&&q<1;set(m,q,1-q);});
    caster.rotation.z=0.06*ss(0,T0,te)-0.06*ss(T0,TI,te);
    const hit=hitK(ia,8); target.position.x=3.4+0.06*hit; target.rotation.z=0.12*hit*Math.sin(ia*30);
    o.em=ia>=0?0.25*Math.exp(-Math.max(ia-0.25,0)*4)*ss(0,0.05,ia):0; o.emc.copy(U.uC2.value);
    pathAt(d,sp);
    if(te<TI){o.g.copy(sp).y=0.25;o.gs=0.8;o.ga=0.35;o.li=2.5;}
    else{o.g.set(3.0,0.4,0);o.gs=0.9+1.5*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.6;o.li=4*Math.exp(-ia*6);}
    o.ia=ia;o.c.set(3.05,0.3,0);o.shake=0;o.dist=0.4;o.flash=0.7;
  };
}};

// =====================================================================
// 8 · SHIELD CRUSHER (2 PA) — placas de quitina suben desde la cola y forjan sobre el rival un martillo tornasolado;
//     se alza y baja como un ariete sobre él; la quitina estalla en esquirlas que quedan flotando suspendidas y caen
// =====================================================================
const crusher={key:"itShieldCrusher",name:"Shield Crusher",pa:2,dur:2.2,ti:0.95,pal:"Élitro",
  phases:[["Forja",0],["Alzada",0.38],["Descenso",0.75],["Impacto",0.95],["Esquirlas",1.2],["Fin",1.8]],
build(a){
  const L=a.L,TF=0.38,TD=0.75,TI=0.95,TX=1.8,TE=2.15,X=3.4,FP=V3(X,3.7,0),HY=2.16,CC=V3(-0.5,4.8,0),HP=V3(3.3,1.9,0);
  const hy=te=>{if(te<TF)return FP.y;if(te<TD)return FP.y+0.7*ss(TF,TD,te);if(te<TI){const k=(te-TD)/(TI-TD);return FP.y+0.7-(FP.y+0.7-HY+0.18)*k*k;}
    const d=te-TI;return HY-0.18*Math.exp(-d*14)+0.35*ss(TI+0.1,TI+0.5,te);};
  // escleritos: filas de placas solapadas, bandas de refuerzo y lámina tornasol; uQ disuelve
  const PLATE_FS=`uniform float uQ;
  void main(){vec3 p=vP;float row=fract(p.y*7.+step(.5,fract(p.x*3.))*.5);float edge=smoothstep(.85,1.,row);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   vec3 ir=.5+.5*cos(6.2832*(fr*.9+p.y*1.2+p.x*.6+vec3(0.,.33,.67)));
   vec3 base=mix(vec3(.05,.05,.08),vec3(.16,.13,.22),row)*(1.-edge*.6);
   float dz=noise(p*5.+2.)-uQ*1.1+.05;if(dz<0.)discard;float de=smoothstep(.1,0.,dz)*step(.001,uQ);
   gl_FragColor=vec4(base*${LIT}+vec3(1.)*${SPEC(30)}*.6+mix(uC1,ir,.55)*(fr*.9+edge*.25)+uC1*(uA*.6+de*2.5),1.);}`;
  const plMat=fxU(PLATE_FS,{uQ:{value:1}},SOLID);
  const ham=new THREE.Group(); L.mesh.add(ham);
  const hd=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.56,0.62),plMat);
  const bands=[-0.3,0.3].map(x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.6,0.66),plMat);m.position.x=x;return m;});
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.07,1.4,10),plMat); handle.position.y=0.98;
  ham.add(hd,...bands,handle);
  // estela vertical del descenso
  const fall=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,0.5,0),fx(`void main(){float v=vUv.y;
   float st=smoothstep(.45,.8,noise(vec3(vUv.x*14.,v*3.+uT*20.,1.)));float side=smoothstep(.5,.2,abs(vUv.x-.5));
   gl_FragColor=vec4(mix(uC2,uC1,1.-v)*1.5,(1.-v)*side*(.3+.7*st)*uA);}`));
  L.trail.add(fall);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.8),fx(RING_FS,{depthTest:false}));
  const forge=new THREE.Mesh(new THREE.PlaneGeometry(2,2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)-uT*1.5;
   float hx=band(r,.8,.03)+band(r,.62,.015);float seg=step(.5,fract(an/6.2832*6.))*band(r,.71,.05);
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.5,(hx+seg*.7)*step(r,uP)*uA);}`,{depthTest:false}));
  L.mesh.add(hitRing,forge);
  // suelo: onda y anillo de polvo bajo el rival (nivel 2: sin fractura)
  const shock=groundPlane(4.4,X,0.03,fx(RING_FS)), soft=groundPlane(2.4,X,0.016,fx(SOFTBURN_FS));
  L.decal.add(shock,soft);

  const C=`const float TF=${f(TF)};const float TI=${f(TI)};const float TX=${f(TX)};const vec3 CT=${v3(CT)};const vec3 CC=${v3(CC)};const vec3 FP=${v3(FP)};const vec3 HP=${v3(HP)};`+QB;
  // placas que suben desde la cola a la forja
  a.count+=points(L.part,120,C+`void main(){float s=aSeed.x*(TF-.1);float k=clamp((uT-s)/.3,0.,1.);
   vec3 p=qb(CT,CC,FP,k)+rnd()*.12*(1.-k);vA=(uT>s&&k<1.)?sin(k*3.14159)+.2:0.;put(p,.05+.04*aSeed.w);}`,CHIP_FS);
  // esquirlas flotantes: salen despedidas, frenan, quedan suspendidas girando y caen al final
  a.count+=points(L.part,160,C+`void main(){float s=TI+aSeed.x*.04;float t=uT-s;float c=max(t,0.);
   vec3 d=normalize(rnd()+vec3(0.,.15,0.));float rd=(.5+1.4*aSeed.z)*(1.-exp(-c*7.));
   float fallT=max(uT-TX+.35-aSeed.y*.3,0.);
   vec3 p=HP+d*rd+vec3(sin(c*2.+aSeed.w*9.)*.05,sin(c*1.7+aSeed.x*9.)*.07-1.6*fallT*fallT,0.);
   vA=(t>0.&&p.y>.03)?1.-smoothstep(TX,TX+.35,uT):0.;put(p,.16+.1*aSeed.w);vMix=aSeed.w*6.2832+c*(1.+2.*aSeed.y);}`,SHARD_FS);
  a.count+=sparks(L.part,160,TI,`${f(HP.x)},${f(HP.y)},0.`,"0.,-.1,0.",3,9,2.5);
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.08;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float c=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(X)}+cos(an)*(.4+1.5*(1.-exp(-c*3.))),.1+.35*aSeed.w*(1.-exp(-c*2.)),sin(an)*(.4+1.5*(1.-exp(-c*3.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.75:0.;put(p,(.28+.22*aSeed.y)*(.6+age));}`,DUST_FS,NB);

  a.pose=function(te,o){
    const ia=te-TI, mat=ss(0.08,TF,te), out=ss(TI+0.35,TI+0.75,te), y=hy(te);
    ham.visible=te>0.08&&out<0.999; ham.position.set(X,y,0);
    ham.rotation.z=0.3*ss(TF,TD,te)*(1-ss(TD,TI-0.05,te))+0.05*Math.sin(te*20)*hitK(ia,8);
    const sq=hitK(ia,12); ham.scale.set(1+0.12*sq,1-0.15*sq,1+0.12*sq);
    plMat.uniforms.uQ.value=Math.max(1-mat,out); plMat.uniforms.uA.value=0.3*mat+0.7*ss(TD,TI,te)*(1-ss(TI,TI+0.3,te));
    towardCam(forge.position,FP,0.3); billboard(forge); forge.visible=te<TD; set(forge,ss(0,TF,te),win(te,0.02,0.15,TF,TD));
    fall.visible=te>=TD&&ia<0.2; fall.position.set(X,y+0.3,0.3); fall.scale.set(0.9,Math.max(FP.y+1.4-y,0.01),1); fall.material.uniforms.uA.value=ss(TD,TD+0.05,te)*(1-ss(TI,TI+0.2,te));
    let p=cl(ia/0.35); towardCam(hitRing.position,HP,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.85:0); soft.material.uniforms.uA.value=ia>=0?0.7*(1-cl(ia/1.1)):0;
    caster.rotation.z=0.1*ss(0,TF,te)-0.15*ss(TD,TI,te)*(1-ss(TI,TI+0.4,te));
    // rival: aplastado por el ariete y con un rebote
    const h=hitK(ia,5); target.scale.set(1+0.18*h,Math.max(1-0.3*h*(1-Math.exp(-Math.max(ia,0)*40)),0.5),1+0.18*h);
    target.rotation.z=0.06*h*Math.sin(ia*25);
    if(te<TD){o.g.copy(FP);o.gs=1+0.6*mat;o.ga=0.3*mat+0.1;o.li=2.5*mat+0.5;}
    else if(te<TI){o.g.set(X,y,0);o.gs=1.6;o.ga=0.5;o.li=5;}
    else{o.g.copy(HP);o.gs=1.5+3.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.85+0.08*(1-ss(TX,TE,te));o.li=10*Math.exp(-ia*5)+1;}
    o.ia=ia;o.c.copy(HP);o.shake=0;o.dist=0.9;
  };
}};

// =====================================================================
// 9 · LEAF BUG (2 PA, aliado) — un insecto palo-hoja salta de la cola en dos brincos y se posa en la espalda del
//     aliado; un camuflaje de hojas moteadas lo envuelve de arriba abajo, sube luz de curación y una hebra dorada
//     (carga de Capullo) le ciñe la cintura
// =====================================================================
const leafbug={key:"itLeafBug",name:"Leaf Bug",pa:2,dur:2.3,ti:0.95,pal:"Musgo",allies:1,
  phases:[["Salto",0],["Brinco",0.15],["Aterrizaje",0.95],["Camuflaje",1.1],["Cura",1.35],["Fin",1.95]],
build(a){
  const L=a.L,H1=[0.12,0.5],H2=[0.56,0.95],TH=1.35,TCB=1.5,TX=1.95,TE=2.3;
  const M1=V3(-2.95,0.04,-1.0), LB=V3(A.x-0.3,1.32,A.z);
  // insecto: abdomen-hoja con nervios, tórax de ramita, patas y antenas
  const leafMat=fx(`void main(){vec2 p=vec2(vP.x,vP.z);float rib=smoothstep(.06,0.,abs(p.y));
   float veins=smoothstep(.08,0.,abs(fract((p.x*.9+abs(p.y)*1.4)*4.)-.5)-.42);
   vec3 c=mix(vec3(.16,.42,.1),vec3(.48,.76,.25),.5+p.x*.4)*(1.-veins*.25)+vec3(.5,.6,.2)*rib*.3;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+uC1*(fr*.4+uA*.5),1.);}`,SOLID);
  const twigMat=fx(`void main(){gl_FragColor=vec4(vec3(.36,.42,.16)*${LIT}+uC1*uA*.3,1.);}`,SOLID);
  const bug=new THREE.Group(); L.mesh.add(bug);
  const abd=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),leafMat); abd.scale.set(0.3,0.04,0.16); abd.position.x=-0.12;
  const thx=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.026,0.28,6),twigMat); thx.rotation.z=Math.PI/2; thx.position.x=0.2;
  const hdm=new THREE.Mesh(new THREE.SphereGeometry(0.04,10,8),twigMat); hdm.position.x=0.36;
  bug.add(abd,thx,hdm);
  const legG=new THREE.CylinderGeometry(0.009,0.007,0.26,5).translate(0,-0.13,0), legs=[];
  for(let i=0;i<6;i++){const s=i%2?1:-1,j=Math.floor(i/2),m=new THREE.Mesh(legG,twigMat);m.position.set(0.28-j*0.12,0,0.02*s);m.userData={s,j};legs.push(m);bug.add(m);}
  for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.004,0.24,4).translate(0,0.12,0),twigMat);m.position.set(0.38,0.02,0.02*s);m.rotation.set(s*0.5,0,-1.1);bug.add(m);}
  // camuflaje: moteado de hojas que cubre al aliado de arriba abajo (mezcla normal) y se vuelve translúcido
  const camo=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(`void main(){vec3 q=normalize(vP);
   vec3 g=q*5.;vec3 id=floor(g);vec3 fp=fract(g);float md=9.;float cid=0.;
   for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){vec3 o=vec3(float(i),float(j),float(k));vec3 c=id+o;
    vec3 h=vec3(hash(c),hash(c+7.3),hash(c+13.1));vec3 d=o+h-fp;float l=dot(d,d);if(l<md){md=l;cid=hash(c+2.);}}
   float edge=smoothstep(.0,.25,sqrt(md));vec3 col=mix(vec3(.14,.34,.1),vec3(.45,.68,.22),cid)*(.75+.25*edge);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);float front=1.-uP*2.;float on=step(front,q.y);float rim=band(q.y,front,.05);
   gl_FragColor=vec4(col+uC1*(rim*1.5+fr*.3),(uA*(.55+.35*fr)+rim)*on);}`,NB));
  camo.position.set(A.x,0.95,A.z); camo.scale.set(0.62,1.0,0.62);
  // brillo de hojas por encima (aditivo) para que el camuflaje "respire"
  const shimmer=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),fx(`void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);
   float n=noise(q*6.+vec3(0.,uT*.6,0.));gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,fr*(.4+.6*n)*uA);}`));
  shimmer.position.copy(camo.position); shimmer.scale.set(0.7,1.08,0.7);
  // capullo: hebra dorada (color fijo) en la cintura
  const silk=new THREE.Mesh(helixGeo(1.6,0.58,0.55,0.45,0.045,140),fx(`void main(){float u=vUv.x;if(u>uP)discard;
   float gl=pow(.5+.5*sin(u*40.-uT*10.),8.);gl_FragColor=vec4(vec3(1.,.85,.42)*1.6+vec3(gl*.5),(.6+gl)*band(vUv.y,.5,.45)*uA);}`));
  silk.position.set(A.x,0.6,A.z);
  L.mesh.add(camo,shimmer,silk);
  // suelo: luz moteada de follaje centrada en el aliado
  const dapple=groundPlane(2.8,A.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*9.,uT*.3))*.6+noise(vec3(p*20.,1.))*.4;float sp=smoothstep(.55,.7,n);
   gl_FragColor=vec4(mix(uC2,uC1,sp)*1.3,(sp*.6+.12)*smoothstep(1.,.4,r)*step(r,uP*1.05)*uA);}`));
  dapple.position.z=A.z; L.decal.add(dapple);

  const C=`const float TH=${f(TH)};const float TCB=${f(TCB)};const float TX=${f(TX)};const vec3 CT=${v3(CT)};const vec3 M1=${v3(M1)};const vec3 LB=${v3(LB)};const vec3 AP=${v3(A)};`+ARC;
  // hojitas que se desprenden en los saltos
  a.count+=points(L.part,50,C+`void main(){float h2=step(.5,aSeed.y);float s=mix(${f(H1[0])},${f(H2[0])},h2)+aSeed.x*.38;float k=(s-mix(${f(H1[0])},${f(H2[0])},h2))/.38;
   vec3 o=h2<.5?arcPt(CT,M1,.9,k):arcPt(M1,LB,1.1,k);float t=uT-s;float c=max(t,0.);
   vec3 p=o+vec3(sin(c*4.+aSeed.z*6.)*.15,-.5*c,cos(c*3.+aSeed.w*6.)*.12);
   vA=(t>0.&&t<1.&&p.y>.02)?1.-t:0.;put(p,.12+.05*aSeed.w);vMix=aSeed.z+c*.6;}`,LEAF_FS,NB);
  a.count+=points(L.part,30,C+`void main(){float s=${f(H1[1])}+aSeed.x*.05;float life=.5;float age=(uT-s)/life;float c=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=M1+vec3(cos(an)*(.1+.4*(1.-exp(-c*4.))),.05+.15*aSeed.w*(1.-exp(-c*3.)),sin(an)*(.1+.4*(1.-exp(-c*4.))));
   vA=(age>0.&&age<1.)?(1.-age)*.7:0.;put(p,(.15+.1*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // motas verdes que bajan en espiral con el camuflaje; cruces de curación; destellos dorados del capullo
  a.count+=points(L.part,80,C+`void main(){float s=${f(H2[1])}+aSeed.x*.5;float life=.6;float age=(uT-s)/life;
   float an=aSeed.y*6.2832+age*5.;vec3 p=vec3(AP.x+cos(an)*.68,1.9-age*1.7,AP.z+sin(an)*.68);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.03*aSeed.w);}`);
  a.count+=points(L.part,30,C+`void main(){float s=TH+aSeed.x*.35;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 p=AP+vec3((aSeed.z-.5)*1.1,.3+aSeed.w*1.1+c*1.1,(aSeed.x-.5)*1.1);vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.17+.07*aSeed.w);}`,CROSS_FS);
  a.count+=points(L.part,26,C+`void main(){float s=TCB+aSeed.x*.3;float life=.4;float age=(uT-s)/life;float an=aSeed.y*6.2832;
   vec3 p=vec3(AP.x+cos(an)*.6,.6+aSeed.z*.45,AP.z+sin(an)*.6);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.11+.05*aSeed.w)*(1.-age*.5));}`,STAR4_FS);

  const nx=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-H2[1], env=win(te,H2[1],H2[1]+0.35,TX,TE-0.05), cover=ss(H2[1],H2[1]+0.45,te);
    let k=0,P=CT,Q=M1,h=0.9,air=false;
    if(te<H1[0]){bug.position.copy(CT);}
    else if(te<H1[1]){k=(te-H1[0])/(H1[1]-H1[0]);air=true;}
    else if(te<H2[0]){bug.position.copy(M1);}
    else if(te<H2[1]){k=(te-H2[0])/(H2[1]-H2[0]);P=M1;Q=LB;h=1.1;air=true;}
    else bug.position.copy(LB);
    if(air){arcPt(P,Q,h,k,bug.position);arcPt(P,Q,h,Math.min(k+0.03,1),nx);}
    const tgt=te<H1[1]?M1:LB, src=te<H1[1]?CT:M1, yaw=-Math.atan2(tgt.z-src.z,tgt.x-src.x);
    const pitch=air?Math.atan2(nx.y-bug.position.y,Math.hypot(nx.x-bug.position.x,nx.z-bug.position.z)+1e-4)*0.8:(te>=H2[1]?0.25:0);
    bug.rotation.set(0,yaw,pitch);
    // al posarse se encoge sobre la espalda y se funde con el camuflaje
    bug.visible=te<TX; bug.scale.setScalar(Math.max(1.4*(1-ss(TH,TX,te)),0.001));
    legs.forEach(m=>{const {s,j}=m.userData;m.rotation.set(s*(air?1.2:0.75),0,(j-1)*0.5+(air?0.3:0)+0.15*Math.sin(te*20+j)*(air?1:0));});
    leafMat.uniforms.uA.value=0.3*cover; twigMat.uniforms.uA.value=0.3*cover;
    camo.visible=env>0.001; set(camo,cover,env*(0.8-0.35*ss(TH,TX,te)));
    shimmer.visible=env>0.001; set(shimmer,0,env*0.8);
    silk.visible=te>=TCB&&te<TE; set(silk,ss(TCB,TCB+0.3,te)*1.01,1-ss(TE-0.25,TE,te));
    set(dapple,cover,env);
    glowOn(allies[0],0.3*hitK(ia,4)+0.55*hitK(te-TH,3)*(te>=TH?1:0)+0.12*env);
    caster.rotation.z=0.08*ss(0,H1[0],te)-0.1*ss(H1[0],H1[0]+0.1,te)*(1-ss(H1[1],H2[0],te));
    if(te<H2[1]){o.g.copy(bug.position);o.g.y+=0.2;o.gs=0.8;o.ga=0.22;o.li=1.6;}
    else{o.g.set(A.x,1.1,A.z);o.gs=1.6+0.5*env;o.ga=0.3*hitK(ia,5)+0.35*hitK(te-TH,3)*(te>=TH?1:0)+0.1*env;o.li=2.5*hitK(ia,4)+3*hitK(te-TH,3)*(te>=TH?1:0)+1.5*env;}
    o.ia=ia;o.c.copy(LB);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

VFX.module("Bicho · Cola",[ant,fish,gravel,pupae,cater,twin,centi,crusher,leafbug]);
})();

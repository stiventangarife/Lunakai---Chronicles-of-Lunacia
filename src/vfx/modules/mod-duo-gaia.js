// =====================================================================
// DÚO · ÉGIDA DE GAIA — Sapidae + su Axie (defensiva / naturaleza)
// Seis piezas encadenadas: pulso de cuadrícula → raíces de anclaje → árbol rúnico → lluvia de hojas de oro →
// humo de purificación → cúpula geodésica. Cada pieza vive en su propio grupo (variantes por ID).
// Nivel 2: sin temblor ni fractura; dura algo más (~2.8 s) porque encadena piezas.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,fx,fxU,set,groundPlane,points,RING_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,v3,taperTube,variantGroups}=VFX.lib;

VFX.palette("Égida de Gaia",["#FFD54F","#27AE60"]);    // c1 oro solar · c2 verde esmeralda
const NAC="vec3(.910,.973,.961)";                       // blanco nácar #E8F8F5 (fijo)

const gaia={key:"duo_gaia",name:"Égida de Gaia",tier:2,dur:2.8,ti:1.78,pal:"Égida de Gaia",allies:2,
  vlabel:"Pieza",v:"full",
  variants:[["full","Completo"],["vfx_gaia_grid_pulse","Pulso"],["vfx_gaia_root_bind","Raíces"],["vfx_gaia_spirit_tree","Árbol"],
    ["vfx_gaia_pollen_rain","Lluvia"],["vfx_gaia_cleanse_smoke","Humo"],["vfx_gaia_hex_dome","Cúpula"]],
  phases:[["Pulso",0],["Anclaje",0.35],["Árbol",0.6],["Lluvia",0.9],["Purificación",1.1],["Cúpula",1.5],["Disipación",2.3]],
build(a){
  const IDS=["vfx_gaia_grid_pulse","vfx_gaia_root_bind","vfx_gaia_spirit_tree","vfx_gaia_pollen_rain","vfx_gaia_cleanse_smoke","vfx_gaia_hex_dome"];
  const [GP,RB,ST,PR,CS,HD]=IDS, VG=variantGroups(a,IDS); for(const k of IDS)VG[k].n=0;
  // escuadrón: Sapidae, su Axie (allies[0] recolocado a su lado) y el otro aliado; centro = centroide en el suelo
  const SP=V3(-3.7,0,0), AX=V3(-3.7,0,-1.0), A1=ALLY_POS[1].clone();
  const C=V3((SP.x+AX.x+A1.x)/3,0,(SP.z+AX.z+A1.z)/3), M=V3((SP.x+AX.x)/2,0,(SP.z+AX.z)/2);
  const TR=0.35,TT=0.6,TN=0.9,TS=1.1,TD=1.5,TI=1.78,TE=2.3;

  // ---------------------------------------------------------------
  // 2.1 · PULSO ESMERALDA DE CUADRÍCULA — frente cuadrado (Chebyshev) que recorre las líneas de baldosas, radio 3
  // ---------------------------------------------------------------
  const pulse=groundPlane(7.2,C.x,0.024,fxU(`uniform vec2 uO;
  void main(){vec2 d=vP.xz;vec2 w=d+uO;float r=max(abs(d.x),abs(d.y));float inside=step(r,3.02);
   vec2 g=abs(fract(w+.5)-.5);float ln=smoothstep(.045,0.,min(g.x,g.y));
   vec2 cc=floor(w)+.5-uO;float cr=max(abs(cc.x),abs(cc.y));
   float R=uP*3.;
   float front=band(r,R,.34);float edge=band(r,R,.05)*step(uP,.99);
   float tile=band(cr,R,.5)*.2;float wake=smoothstep(R,0.,r)*.14;
   float m=(ln*(front*1.4+wake)+tile+edge*.75)*inside;
   vec3 c=mix(uC2*1.5,${NAC}*1.6,clamp(ln*front*.6+edge*.5,0.,1.));
   gl_FragColor=vec4(c,m*uA);}`,{uO:{value:new THREE.Vector2(C.x,C.z)}}));
  pulse.position.z=C.z; VG[GP].decal.add(pulse);
  // motas que saltan del frente al cruzar las líneas
  VG[GP].n+=points(VG[GP].part,70,`const vec3 CC=${v3(C)};
  void main(){float s=.08+aSeed.x*.55;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float R=3.*(1.-pow(1.-clamp((s-.05)/.6,0.,1.),2.));float sd=floor(aSeed.z*4.);float u=aSeed.w*2.-1.;
   vec2 q=sd<1.?vec2(R,u*R):sd<2.?vec2(-R,u*R):sd<3.?vec2(u*R,R):vec2(u*R,-R);
   vec3 p=CC+vec3(q.x,.03+t*(.9+.6*aSeed.y),q.y);
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.035+.03*aSeed.y)*(1.-age*.5));}`);

  // ---------------------------------------------------------------
  // 2.2 · RAÍCES DE ANCLAJE — 4 tubos ahusados por personaje que brotan y se enroscan en los tobillos (bucle)
  // ---------------------------------------------------------------
  const ROOT_FS=`void main(){float u=vUv.x;if(u>uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float bark=noise(vec3(u*40.,vUv.y*6.,0.));
   float sap=pow(.5+.5*sin(u*26.-uT*9.),6.);
   float tip=smoothstep(.1,0.,uP-u);
   vec3 c=uC2*(.35+.9*fr+bark*.35)+mix(uC2,${NAC},.55)*sap*1.2+${NAC}*tip*.9;
   gl_FragColor=vec4(c*1.3,min(.3+.5*fr+sap*.45+tip,1.)*uA);}`;
  const roots=[], rootG=[SP,AX].map((P,ci)=>{
    const g=new THREE.Group(); VG[RB].mesh.add(g);
    for(let i=0;i<4;i++){
      const a0=i*Math.PI/2+0.4+ci*0.5, dirn=i%2?1:-1, pts=[];
      for(let j=0;j<=10;j++){const t=j/10,an=a0+dirn*t*2.5,r=0.95-0.47*ss(0,0.65,t);
        pts.push(V3(Math.cos(an)*r,-0.07+0.52*Math.pow(t,1.15)+0.05*Math.sin(Math.PI*t*2),Math.sin(an)*r));}
      const m=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),72,8,0.065,0.012),fx(ROOT_FS));
      m.userData.d=i*0.06; g.add(m); roots.push(m);
    }
    return g;});
  // tierra removida y venas de savia en el suelo, centradas bajo cada pie
  const soil=[SP,AX].map(P=>{const d=groundPlane(2.0,P.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*7.,1.));
   float vein=pow(1.-abs(noise(vec3(an*3.,r*4.-uT*.5,2.))*2.-1.),8.)*smoothstep(1.,.45,r)*step(.42,r);
   float bed=smoothstep(1.,.4,r)*.16*(.6+.4*n);float ring=band(r,.5+.04*sin(uT*6.),.06);
   gl_FragColor=vec4(uC2*1.4+${NAC}*ring*.5,(vein*.8+bed+ring*.55)*uA);}`)); d.position.z=P.z; VG[RB].decal.add(d); return d;});
  // esporas verdes que suben desde las raíces mientras canalizan
  for(const P of [SP,AX])VG[RB].n+=points(VG[RB].part,22,`const vec3 P=${v3(P)};
  void main(){float life=.9+aSeed.y*.5;float k=(uT-${f(TR+0.2)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sp=${f(TR+0.2)}+(c-aSeed.x)*life;float an=r.x*6.2832+age*1.2;float rad=.5+.35*r.y;
   vec3 p=P+vec3(cos(an)*rad,.03+age*(.6+.5*r.z),sin(an)*rad);
   vA=(k>=1.&&sp<${f(TE-0.2)})?sin(age*3.14159)*.85:0.;put(p,.035+.03*r.z);}`);

  // ---------------------------------------------------------------
  // 2.3 · ÁRBOL RÚNICO CELESTIAL — holograma fresnel en el punto medio Sapidae–Axie (aparece y se desvanece, 1.5 s)
  // ---------------------------------------------------------------
  const tree=new THREE.Group(); tree.position.copy(M); VG[ST].mesh.add(tree);
  const HOLO=(body)=>`void main(){float h=vP.y;float rev=uP*3.25;if(h>rev)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.7);
   float scan=.6+.4*sin(h*52.-uT*13.);float flick=.88+.12*sin(uT*37.)*sin(uT*23.);
   float front=band(h,rev,.09)*step(uP,.99);${body}}`;
  // tronco y ramas: oro traslúcido con runas que corren a lo largo
  const trunkMat=fx(HOLO(`
   float cell=floor(vUv.x*16.);float rune=step(.72,fract(vUv.x*16.))*step(.45,fract(vUv.y*3.+cell*.37+uT*.15));
   vec3 c=uC1*(.55+1.1*fr)+${NAC}*(rune*.9+front*1.3);
   gl_FragColor=vec4(c*1.25,((.1+.55*fr)*scan+rune*.45+front)*flick*uA);`));
  const trunkC=new THREE.CatmullRomCurve3([V3(0,-0.02,0),V3(0.06,0.6,0.03),V3(-0.05,1.2,-0.02),V3(0.02,1.8,0.01),V3(0,2.15,0)]);
  tree.add(new THREE.Mesh(taperTube(trunkC,64,10,0.14,0.04),trunkMat));
  for(let i=0;i<5;i++){const an=i*1.2566+0.3,y0=1.25+0.12*(i%3),c=Math.cos(an),s=Math.sin(an);
    const bc=new THREE.CatmullRomCurve3([V3(0,y0,0),V3(c*0.3,y0+0.35,s*0.3),V3(c*0.55,y0+0.75,s*0.55),V3(c*0.62,y0+1.0,s*0.62)]);
    tree.add(new THREE.Mesh(taperTube(bc,32,6,0.055,0.012),trunkMat));}
  for(let i=0;i<3;i++){const an=i*2.094+0.9,c=Math.cos(an),s=Math.sin(an);   // raíces del árbol a ras de suelo
    const bc=new THREE.CatmullRomCurve3([V3(0,0.25,0),V3(c*0.2,0.06,s*0.2),V3(c*0.42,0.0,s*0.42)]);
    tree.add(new THREE.Mesh(taperTube(bc,20,6,0.06,0.015),trunkMat));}
  // copa: cúmulo de esferas esmeralda brillante con vetas de hojas
  const crownMat=fx(HOLO(`
   float n=noise(vP*6.+vec3(0.,uT*.8,0.));float leaf=smoothstep(.55,.75,n);
   vec3 c=uC2*(.55+1.3*fr)+mix(uC1,${NAC},.5)*leaf*.7+${NAC}*front*1.2;
   gl_FragColor=vec4(c*1.3,((.05+.5*fr)*scan+leaf*.22+front)*flick*uA);`));
  for(const [x,y,z,r] of [[0,2.45,0,0.62],[0.42,2.2,0.18,0.45],[-0.4,2.25,-0.15,0.47],[0.1,2.3,-0.45,0.42],[-0.12,2.15,0.45,0.42],[0.05,2.85,0.05,0.4]])
    tree.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r,2).translate(x,y,z),crownMat));
  // círculo rúnico bajo el árbol, centrado en el punto medio
  const treeRune=groundPlane(1.9,M.x,0.021,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
   float m=band(r,.92,.02)+band(r,.7,.012)+band(r,.81,.05)*step(.6,fract(an*16.+uT*.3))*.8;
   m+=band(fract(an*6.-uT*.15),.5,.05)*step(r,.68)*step(.25,r)*.5;
   m*=step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC1,uC2,r)*1.4,m*uA);}`)); treeRune.position.z=M.z; VG[ST].decal.add(treeRune);
  // luz dorada que sube en espiral por el tronco hasta la copa
  VG[ST].n+=points(VG[ST].part,44,`const vec3 MM=${v3(M)};
  void main(){float s=${f(TT)}+aSeed.x*.75;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*7.;float rad=mix(.65,.14,smoothstep(0.,.6,k))+smoothstep(.7,1.,k)*.5;
   vec3 p=MM+vec3(cos(an)*rad,k*2.5,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.04+.035*aSeed.w);}`);

  // ---------------------------------------------------------------
  // 2.4 · LLUVIA DE ROCÍO Y HOJAS DE ORO — 60 partículas desde una caja 3×3 a 3 m, oscilando en X/Z
  // ---------------------------------------------------------------
  const RAIN=`const vec3 CC=${v3(C)};varying float vR;varying float vF;
  void main(){float s=${f(TN)}+aSeed.x*.7;float life=.95+aSeed.y*.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();
   vec3 p=CC+vec3(r.x*1.5,3.-2.95*(k*.75+k*k*.25),r.z*1.5);
   p.x+=sin(k*6.+aSeed.z*6.2832)*.28;p.z+=cos(k*5.+aSeed.w*6.2832)*.22;
   vR=aSeed.z*6.2832+k*(3.+4.*aSeed.w);vF=cos(k*(6.+3.*aSeed.z)+aSeed.y*6.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*smoothstep(1.,.82,age):0.;`;
  // hoja de oro: vesícula con nervio central que gira y se voltea al caer
  VG[PR].n+=points(VG[PR].part,30,RAIN+`put(p,.2+.08*aSeed.w);}`,VFX.HEAD+`varying float vA;varying float vMix;varying float vR;varying float vF;
  void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=mat2(c,-s,s,c)*q;q.x/=max(abs(vF),.18);
   float w=.2*(1.-4.*q.y*q.y);float body=smoothstep(w,w-.05,abs(q.x))*step(abs(q.y),.48);
   float rib=smoothstep(.025,0.,abs(q.x))*step(abs(q.y),.42);float rim=smoothstep(.05,0.,abs(abs(q.x)-w+.03))*body;
   float a=(body*.85+rib*.4)*vA;if(a<.003)discard;
   gl_FragColor=vec4(uC1*(1.1+.5*vF*vF)+${NAC}*(rib*.6+rim*.5),a);}`);
  // gotas de rocío: esfera nácar con reflejo dorado
  VG[PR].n+=points(VG[PR].part,30,RAIN+`put(p,.11+.05*aSeed.w);}`,VFX.HEAD+`varying float vA;varying float vMix;varying float vR;varying float vF;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
   float body=smoothstep(.42,.32,d);float rim=band(d,.36,.06);float hl=smoothstep(.12,0.,length(q-vec2(-.12,-.12)));
   float halo=smoothstep(.5,.2,d)*.25;
   float a=(body*.35+rim*.8+hl+halo)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(${NAC},uC1,.3+.3*rim)*1.3+vec3(hl*.6),a);}`);

  // ---------------------------------------------------------------
  // 2.5 · HUMO DE PURIFICACIÓN — 15 volutas violeta/negro por aliado que suben rápido y acaban en chispas blancas
  // ---------------------------------------------------------------
  const SMOKE_MORPH=VFX.HEAD+`varying float vA;varying float vMix;varying float vK;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
   float n=noise(vec3(q*5.,vMix*20.+uT*3.));float sm=smoothstep(.5,.1,d+(n-.5)*.22);
   vec2 b=abs(q)*2.;float st=smoothstep(.12,0.,b.x*b.y*6.+min(b.x,b.y))*smoothstep(1.,.2,max(b.x,b.y))+smoothstep(.3,0.,d);
   vec3 sc=mix(vec3(.04,0.,.07),vec3(.36,.1,.52),vMix*(1.-d*1.4));
   float a=mix(sm*.85,min(st,1.),vK)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(sc,${NAC}*1.7,vK),a);}`;
  [SP,AX,A1].forEach((P,i)=>{VG[CS].n+=points(VG[CS].part,15,`const vec3 P=${v3(P)};varying float vK;
  void main(){float t=uT-${f(TS+i*0.08)}-aSeed.x*.06;float age=t/.5;float c=max(t,0.);vec3 r=rnd();float an=aSeed.z*6.2832;
   vec3 p=P+vec3(cos(an)*(.22+.18*aSeed.y),.3+aSeed.w*1.1,sin(an)*(.22+.18*aSeed.y));
   p+=vec3(r.x*.35*c,(2.6+1.2*aSeed.y)*c-1.6*c*c,r.z*.35*c);
   vK=smoothstep(.42,.68,age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-smoothstep(.82,1.,age))*mix(1.,.55+.45*sin(c*70.+aSeed.x*40.),vK):0.;
   put(p,mix(.5+.25*aSeed.y,.11,vK));}`,SMOKE_MORPH,NB);});

  // ---------------------------------------------------------------
  // 2.6 · CÚPULA GEODÉSICA — icosaedro detalle 2 cortado a media esfera: aristas (wireframe) + celdas hexagonales
  //       duales verde/oro. Las baricéntricas de cada triángulo dan las aristas y los bordes de las celdas.
  // ---------------------------------------------------------------
  const R=3;
  let dg=new THREE.IcosahedronGeometry(R,2);
  if(dg.attributes&&dg.attributes.position){
    if(dg.index)dg=dg.toNonIndexed();
    const pa=dg.attributes.position,n=pa.count,B=new Float32Array(n*3),H=new Float32Array(n*3);
    for(let i=0;i<n;i++){const k=i%3,x=Math.round(pa.getX(i)*100)/100,y=Math.round(pa.getY(i)*100)/100,z=Math.round(pa.getZ(i)*100)/100;
      const h=Math.abs(Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453)%1;
      B[i*3+k]=1; H[i*3+k]=h;}
    dg.setAttribute("aB",new THREE.BufferAttribute(B,3)); dg.setAttribute("aH",new THREE.BufferAttribute(H,3));
  }
  const dome=new THREE.Mesh(dg,fxU(`varying vec3 vB;varying vec3 vH;uniform float uQ;
  void main(){if(vP.y<-.005)discard;float h=vP.y/${f(R)};
   vec3 b=vB;float bmax=max(b.x,max(b.y,b.z));float bmin=min(b.x,min(b.y,b.z));float bmid=b.x+b.y+b.z-bmax-bmin;
   float cell=b.x>=bmax?vH.x/max(b.x,.01):(b.y>=bmax?vH.y/max(b.y,.01):vH.z/max(b.z,.01));
   float wire=smoothstep(.04,0.,bmin);float hexE=smoothstep(.06,0.,bmax-bmid);
   float rev=uP*1.12;float shown=step(h,rev);float on=step(cell*.3+h*.8,rev);
   float front=band(h,rev,.05)*step(uP,.99);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float pulse=band(h,1.-uQ*1.1,.07)*step(0.,uQ)*step(uQ,1.);
   vec3 face=mix(uC2,uC1,step(.55,cell));
   vec3 c=face*(.3+.9*fr)*on+mix(face,${NAC},.55)*hexE*on*1.3+${NAC}*wire*shown*.9+${NAC}*front*1.2+mix(face,${NAC},.4)*pulse*1.3;
   float al=on*(.07+.14*fr+hexE*.55)+wire*shown*(.25+.4*fr)+front*.8+pulse*(.3+.5*hexE);
   gl_FragColor=vec4(c*1.2,min(al,1.)*uA);}`,{uQ:{value:-1}},{vertexShader:`attribute vec3 aB;attribute vec3 aH;
  varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;varying vec3 vB;varying vec3 vH;
  void main(){vUv=uv;vP=position;vB=aB;vH=aH;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`}));
  dome.position.copy(C); VG[HD].mesh.add(dome);
  // aro base que se traza en círculo (radio 3, centrado en el escuadrón) + onda al sellarse
  const domeRing=groundPlane(6.6,C.x,0.023,fx(`void main(){vec2 p=(vUv-.5)*6.6;float r=length(p);float an=atan(p.y,p.x)/6.2832;
   float m=band(r,3.,.06)*1.2+band(r,2.8,.02)+band(r,2.9,.06)*step(.55,fract(an*36.-uT*.4))*.7+smoothstep(3.,1.,r)*.05;
   m*=step(an+.5,uP*1.02);
   gl_FragColor=vec4(mix(uC2,uC1,.35)*1.4+${NAC}*band(r,3.,.02)*.6,m*uA);}`));
  const shock=groundPlane(8.5,C.x,0.03,fx(RING_FS));
  domeRing.position.z=C.z; shock.position.z=C.z; VG[HD].decal.add(domeRing,shock);
  // destellos que titilan sobre la superficie de la cúpula
  VG[HD].n+=points(VG[HD].part,50,`const vec3 CC=${v3(C)};
  void main(){float an=aSeed.y*6.2832;float el=asin(.08+.9*aSeed.z);
   vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   float env=smoothstep(${f(TD+0.15)},${f(TD+0.35)},uT)*(1.-smoothstep(${f(TE-0.25)},${f(TE)},uT));
   float tw=pow(.5+.5*sin(uT*(9.+6.*aSeed.w)+aSeed.x*30.),4.);
   vec3 p=CC+d*${f(R+0.02)}+vec3(0.,(uT-${f(TD)})*.15,0.);
   vA=env*tw;put(p,.06+.05*aSeed.x);}`);

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const k of IDS)for(const l of VFX.LK)VG[k][l].visible=v==="full"||v===k;
    a.count=v==="full"?IDS.reduce((s,k)=>s+VG[k].n,0):VG[v].n;};

  const em=(d,col,k)=>{if(k>d.emissiveIntensity){d.emissive.copy(col);d.emissiveIntensity=k;}};
  const NACC=new THREE.Color().setRGB(0.91,0.973,0.961);
  a.pose=function(te,o){
    const on=id=>a.v==="full"||a.v===id, ia=te-TI;
    target.visible=false;                                   // no hay rival
    const ax=allies[0]; ax.position.copy(AX);
    // ambos canalizan: leve inclinación hacia atrás y empuje al sellar la cúpula
    const lean=0.07*ss(0,TR,te)-0.12*ss(TI-0.12,TI,te)+0.05*ss(TI,TI+0.5,te);
    caster.rotation.z=lean; ax.rotation.z=lean*0.8;
    const cm=caster.userData.m, am=ax.userData.m, bm=allies[1].userData.m;

    // 2.1 pulso
    const pp=cl((te-0.05)/0.6), pEnv=te>=0.05?1-ss(0.55,0.8,te):0;
    set(pulse,1-Math.pow(1-pp,2),pEnv);
    // 2.2 raíces: brotan, laten mientras canalizan y se retiran
    const rEnv=ss(TR,TR+0.1,te)*(1-ss(TE+0.15,TE+0.4,te)), back=1-cl((te-TE)/0.35);
    for(const r of roots){const g=cl((te-TR-r.userData.d)/0.4);set(r,(1-Math.pow(1-g,2))*back,rEnv*(0.8+0.2*Math.sin(te*7+r.userData.d*40)));}
    rootG[0].position.copy(caster.position); rootG[1].position.copy(ax.position);
    for(const s of soil)s.material.uniforms.uA.value=rEnv*0.9;
    soil[0].position.x=caster.position.x; soil[1].position.x=ax.position.x;
    // 2.3 árbol
    const tg=cl((te-TT)/0.5), tEnv=ss(TT,TT+0.08,te)*(1-ss(TT+1.1,TT+1.5,te));
    trunkMat.uniforms.uP.value=crownMat.uniforms.uP.value=ss(0,1,tg); trunkMat.uniforms.uA.value=crownMat.uniforms.uA.value=tEnv;
    set(treeRune,cl((te-TT)/0.3),tEnv*0.9); tree.visible=te>=TT&&te<TT+1.5;
    // 2.6 cúpula
    const dp=cl((te-TD)/0.28), dEnv=ss(TD,TD+0.05,te)*(1-ss(TE-0.25,TE,te));
    dome.visible=te>=TD&&te<TE; set(dome,1-Math.pow(1-dp,2),dEnv); dome.material.uniforms.uQ.value=(te-TI)/0.35;
    dome.scale.setScalar(1+(ia>=0?0.035*Math.exp(-ia*8):0));
    set(domeRing,cl((te-TD)/0.25),dEnv);
    const sp=cl(ia/0.5); set(shock,sp,ia>=0?(1-sp)*0.75:0);

    // brillo de los personajes según las piezas activas
    const sEnv=[0,1,2].map(i=>{const t=te-TS-i*0.08-0.25;return t>=0?Math.exp(-t*6):0;});
    if(on(RB)){em(cm,U.uC2.value,0.28*rEnv);em(am,U.uC2.value,0.28*rEnv);}
    if(on(CS)){em(cm,NACC,0.8*sEnv[0]);em(am,NACC,0.8*sEnv[1]);em(bm,NACC,0.8*sEnv[2]);}
    if(on(HD)){const k=0.22*dEnv+(ia>=0?0.5*Math.exp(-ia*6):0);em(cm,U.uC1.value,k);em(am,U.uC1.value,k);em(bm,U.uC1.value,k);}

    // resplandor y luz: siguen a la pieza más intensa
    const hs=[];
    if(on(GP))hs.push([3.5*Math.sin(Math.PI*pp)*pEnv,C.x,0.3,C.z,2.6,0.3*pEnv]);
    if(on(RB))hs.push([1.4*rEnv,M.x,0.3,M.z,1.3,0.18*rEnv]);
    if(on(ST))hs.push([4*tEnv,M.x,2.3,M.z,2.4,0.35*tEnv]);
    if(on(PR)){const e=ss(TN,TN+0.2,te)*(1-ss(2.4,2.8,te));hs.push([1.2*e,C.x,2.4,C.z,1.6,0.1*e]);}
    if(on(CS)){const e=Math.max(...sEnv);hs.push([2.4*e,C.x,1.3,C.z,2,0.25*e]);}
    if(on(HD))hs.push([3*dEnv+(ia>=0?6*Math.exp(-ia*5):0),C.x,1.3,C.z,3+(ia>=0?2*Math.min(ia,0.5):0),0.2*dEnv+(ia>=0?0.5*Math.exp(-ia*8):0)]);
    let best=null,sum=0; for(const h of hs){sum+=h[0];if(!best||h[0]>best[0])best=h;}
    if(best){o.g.set(best[1],best[2],best[3]);o.gs=best[4];o.ga=best[5];o.li=Math.min(sum,9);}else{o.g.copy(C);o.gs=0.001;o.ga=0;o.li=0;}
    o.ld=7; o.c.set(C.x,1.2,C.z); o.shake=0; o.flash=0;
    o.ia=on(HD)?ia:-1; o.dist=on(HD)?0.45:0;
    o.dark=a.v==="full"?0.25*ss(0,0.4,te)*(1-ss(TE,2.75,te)):0;
  };
}};

VFX.module("Sapidae · Dúo",[gaia]);
})();

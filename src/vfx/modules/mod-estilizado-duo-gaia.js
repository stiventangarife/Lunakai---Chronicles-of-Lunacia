// =====================================================================
// ESTILIZADO · DÚO · ÉGIDA DE GAIA (Hito 101) — Ultimate defensiva Sapidae + su Axie, kit vfx-stylized.js.
// Clave: sty_duo_gaia. Mismos dur / ti / fases / piezas que mod-duo-gaia.js y el mismo escuadrón: Sapidae (−3,7),
// su Axie a su lado (allies[0] en z = −1) y el otro aliado (ALLY_POS[1]); centro = centroide en el suelo.
// La carta (sobre sí, área 3): purifica, da 80 de escudo y cura 60 a los aliados del área.
// Piezas: pulso esmeralda por las líneas de las baldosas · raíces de corteza que se enroscan en los tobillos ·
// árbol espiritual (tronco de corteza pintada, copa de hojas de oro y esmeralda, sello rúnico) · lluvia de hojas de
// oro y rocío · humo violeta de purificación que se arranca y se vuelve motas doradas · cúpula de celdas hexagonales.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,taperTube,variantGroups}=VFX.lib;
const S=VFX.sty, CE=S.CELL;
const PAL="Sty Dúo · Gaia"; VFX.palette(PAL,["#ffc94a","#1f9a5a"]);
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const BARK=lin(0x7a5236), BARKD=lin(0x3e2818), SAP=lin(0x8fe36a), GOLD=lin(0xf2b832), LEAF=lin(0x3fae5a), LEAFD=lin(0x1c6a3a),
  MIASMA=lin(0x7a4a9a), MIASMAD=lin(0x22102e), DEW=lin(0xbdf0dc);
const VV=`varying float vR;varying float vK;`;

const gaia={key:"sty_duo_gaia",name:"Égida de Gaia (estilizado)",tier:2,dur:2.8,ti:1.78,pal:PAL,allies:2,stylized:true,
  vlabel:"Pieza",v:"full",
  variants:[["full","Completo"],["vfx_gaia_grid_pulse","Pulso"],["vfx_gaia_root_bind","Raíces"],["vfx_gaia_spirit_tree","Árbol"],
    ["vfx_gaia_pollen_rain","Lluvia"],["vfx_gaia_cleanse_smoke","Humo"],["vfx_gaia_hex_dome","Cúpula"]],
  phases:[["Pulso",0],["Anclaje",0.35],["Árbol",0.6],["Lluvia",0.9],["Purificación",1.1],["Cúpula",1.5],["Disipación",2.3]],
build(a){
  const IDS=["vfx_gaia_grid_pulse","vfx_gaia_root_bind","vfx_gaia_spirit_tree","vfx_gaia_pollen_rain","vfx_gaia_cleanse_smoke","vfx_gaia_hex_dome"];
  const [GP,RB,ST,PR,CS,HD]=IDS, VG=variantGroups(a,IDS); for(const k of IDS)VG[k].n=0;
  const SP=V3(-3.7,0,0), AX=V3(-3.7,0,-1.0), A1=ALLY_POS[1].clone();
  const C=V3((SP.x+AX.x+A1.x)/3,0,(SP.z+AX.z+A1.z)/3), M=V3((SP.x+AX.x)/2,0,(SP.z+AX.z)/2);
  const TR=0.35,TT=0.6,TN=0.9,TS=1.1,TD=1.5,TI=1.78,TE=2.3;

  // ---------------------------------------------------------------
  // 1 · PULSO ESMERALDA — frente cuadrado que recorre las líneas de las baldosas (radio 3), trazo de pincel
  // ---------------------------------------------------------------
  const pulse=groundPlane(7.2,C.x,0.024,S.mat(`uniform vec2 uO;
  void main(){vec2 d=vP.xz;vec2 w=d+uO;float r=max(abs(d.x),abs(d.y));if(r>3.02)discard;
   vec2 g=abs(fract(w+.5)-.5);float ln=smoothstep(.05,0.,min(g.x,g.y));vec4 s=styNoise(w*.35+.2);
   float R=uP*3.;float front=smoothstep(.4,0.,abs(r-R));float wake=smoothstep(R,0.,r)*.18;
   float m=ln*(front*1.3+wake)*(.6+.4*s.r)+front*.12*s.g;if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.35+.5*front*ln+.15*s.g)*1.15,min(m,1.)*uA);}`,{uO:{value:new THREE.Vector2(C.x,C.z)}},{mode:'energy'}));
  pulse.position.z=C.z; VG[GP].decal.add(pulse);
  // hojitas que saltan del frente al cruzarlo
  VG[GP].n+=S.pts(VG[GP].part,40,VV+`const vec3 CC=${v3(C)};
  void main(){float s=.08+aSeed.x*.55;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float R=3.*(1.-pow(1.-clamp((s-.05)/.6,0.,1.),2.));float sd=floor(aSeed.z*4.);float u=aSeed.w*2.-1.;
   vec2 q=sd<1.?vec2(R,u*R):sd<2.?vec2(-R,u*R):sd<3.?vec2(u*R,R):vec2(u*R,-R);
   vec3 p=CC+vec3(q.x,.05+t*(.9+.5*aSeed.y),q.y);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.z*6.28+t*4.;put(p,.2+.1*aSeed.y);}`,S.MATTER_FS(CE.leaf,{relief:4,col:LEAF}));

  // ---------------------------------------------------------------
  // 2 · RAÍCES DE ANCLAJE — 4 raíces de corteza por personaje que brotan y se enroscan en los tobillos; savia que late
  // ---------------------------------------------------------------
  const ROOT_FS=`void main(){float u=vUv.x;if(u>uP)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   vec4 s=styNoise(vec2(u*3.,vUv.y*.6));float bark=smoothstep(.04,0.,abs(s.b-.5))*.6;
   vec3 c=styRampOf(${BARK},clamp(.2+.55*l-bark*.25+(s.r-.5)*.15,0.,1.))*styTint(l);
   float sap=pow(.5+.5*sin(u*24.-uT*9.),8.)*smoothstep(.4,.9,s.g+.3);float tip=smoothstep(.08,0.,uP-u);
   c=mix(c,${SAP}*1.6,max(sap*.8,tip*.6));
   float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.15*smoothstep(.62,.72,fr)*step(.5,l);
   gl_FragColor=vec4(c,uA);}`;
  const roots=[], rootG=[SP,AX].map((P,ci)=>{
    const g=new THREE.Group(); VG[RB].mesh.add(g);
    for(let i=0;i<4;i++){
      const a0=i*Math.PI/2+0.4+ci*0.5, dirn=i%2?1:-1, pts=[];
      for(let j=0;j<=10;j++){const t=j/10,an=a0+dirn*t*2.5,r=0.95-0.47*ss(0,0.65,t);
        pts.push(V3(Math.cos(an)*r,-0.07+0.52*Math.pow(t,1.15)+0.05*Math.sin(Math.PI*t*2),Math.sin(an)*r));}
      const m=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),72,8,0.09,0.016),S.mat(ROOT_FS,{},{mode:'matter',transparent:false,depthWrite:true}));
      m.userData.d=i*0.06; g.add(m); roots.push(m);
    }
    return g;});
  // tierra removida y venas de savia bajo cada pie
  const soil=[SP,AX].map(P=>{const d=groundPlane(2.2,P.x,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   vec4 s=styNoise(vUv*1.2+.3);float bed=smoothstep(1.,.4,r+(s.r-.5)*.3);
   float vein=smoothstep(.04,0.,abs(styNoise(vec2(an*.5,r*.6-uT*.1)).b-.5))*smoothstep(1.,.45,r)*step(.4,r);
   if(bed*.5+vein<.03)discard;vec3 c=mix(styRampOf(${BARKD},.2+.3*s.g),${SAP}*1.4,vein);
   gl_FragColor=vec4(c,(bed*.45+vein*.8)*uA);}`)); d.position.z=P.z; VG[RB].decal.add(d); return d;});
  for(const P of [SP,AX])VG[RB].n+=S.pts(VG[RB].part,16,VV+`const vec3 P=${v3(P)};
  void main(){float life=.9+aSeed.y*.5;float k=(uT-${f(TR+0.2)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sp=${f(TR+0.2)}+(c-aSeed.x)*life;float an=r.x*6.2832+age*1.2;float rad=.5+.35*r.y;
   vec3 p=P+vec3(cos(an)*rad,.05+age*(.7+.5*r.z),sin(an)*rad);
   vA=(k>=1.&&sp<${f(TE-0.2)})?1.:0.;vK=smoothstep(.4,1.,age);vR=0.;put(p,.1+.06*r.z);}`,S.ENERGY_FS(CE.spark,{gain:1.2}),{mode:'energy'});

  // ---------------------------------------------------------------
  // 3 · ÁRBOL ESPIRITUAL — tronco y ramas de corteza que crecen de abajo arriba, copa de hojas de oro y esmeralda,
  //     sello rúnico en el suelo y una espiral de luz dorada por el tronco
  // ---------------------------------------------------------------
  const tree=new THREE.Group(); tree.position.copy(M); tree.scale.setScalar(1.35); VG[ST].mesh.add(tree);
  const TRUNK_FS=`uniform float uK;void main(){float h=vP.y;if(h>uP*3.25)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   vec4 s=styNoise(vec2(vUv.x*2.,vUv.y*.5));float groove=smoothstep(.05,0.,abs(s.b-.5));
   vec3 c=styRampOf(${BARK},clamp(.22+.55*l-groove*.3+(s.r-.5)*.12,0.,1.))*styTint(l);
   float rune=step(.8,fract(vUv.x*9.))*step(.55,fract(vUv.y*2.+floor(vUv.x*9.)*.37))*uK;
   float front=smoothstep(.12,0.,abs(h-uP*3.25))*step(uP,.99);
   c=mix(c,${GOLD}*1.8,max(rune*.8,front));gl_FragColor=vec4(c,uA);}`;
  const trunkMat=S.mat(TRUNK_FS,{uK:{value:0}},{mode:'matter'});
  const trunkC=new THREE.CatmullRomCurve3([V3(0,-0.02,0),V3(0.06,0.6,0.03),V3(-0.05,1.2,-0.02),V3(0.02,1.8,0.01),V3(0,2.15,0)]);
  tree.add(new THREE.Mesh(taperTube(trunkC,64,10,0.18,0.05),trunkMat));
  for(let i=0;i<5;i++){const an=i*1.2566+0.3,y0=1.25+0.12*(i%3),c=Math.cos(an),s=Math.sin(an);
    const bc=new THREE.CatmullRomCurve3([V3(0,y0,0),V3(c*0.3,y0+0.35,s*0.3),V3(c*0.55,y0+0.75,s*0.55),V3(c*0.62,y0+1.0,s*0.62)]);
    tree.add(new THREE.Mesh(taperTube(bc,32,6,0.07,0.015),trunkMat));}
  for(let i=0;i<3;i++){const an=i*2.094+0.9,c=Math.cos(an),s=Math.sin(an);
    const bc=new THREE.CatmullRomCurve3([V3(0,0.25,0),V3(c*0.2,0.06,s*0.2),V3(c*0.45,0.0,s*0.45)]);
    tree.add(new THREE.Mesh(taperTube(bc,20,6,0.075,0.018),trunkMat));}
  // copa: hojas pintadas (materia) en un cúmulo; nacen de dentro afuera con el crecimiento
  const crownU={uG:{value:0},uF:{value:0}};
  VG[ST].n+=S.pts(VG[ST].part,90,VV+`uniform float uG;uniform float uF;const vec3 MM=${v3(M)};
  void main(){float id=float(gl_VertexID);vec3 r=rnd();float cl=floor(aSeed.y*6.);
   vec3 cc=cl<1.?vec3(0.,2.45,0.):cl<2.?vec3(.42,2.2,.18):cl<3.?vec3(-.4,2.25,-.15):cl<4.?vec3(.1,2.3,-.45):cl<5.?vec3(-.12,2.15,.45):vec3(.05,2.85,.05);
   float rad=(cl<1.?.62:.45)*(.45+.55*aSeed.z);vec3 d=normalize(r+vec3(0.,.2,0.));
   float g=clamp((uG-aSeed.z*.35)/.65,0.,1.);
   vec3 p=MM+(cc+d*rad*g)*1.35+vec3(sin(uT*2.+aSeed.x*9.)*.03,0.,0.);
   vA=g>0.?1.:0.;vK=uF*(1.-aSeed.w*.3);vR=aSeed.w*6.28+sin(uT*1.6+aSeed.x*7.)*.25;
   put(p,(.5+.2*aSeed.w)*smoothstep(0.,.3,g));vMix=mod(id,3.);}`,S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(2.,uv);float m=sh.r;if(m<.02)discard;
   float er=styErode(m*.55+sh.b*.45,vK*1.05-.08,.1);float a=er*smoothstep(0.,.06,m)*vA;if(a<.01)discard;
   float l=styLight(styShapeN(2.,uv,4.),stySunV());vec3 col=vMix<1.?${GOLD}:(vMix<2.?${LEAF}:mix(${LEAF},${GOLD},.5));
   vec3 c=styRampOf(col,clamp(.25+.55*l+sh.g*.15,0.,1.))*styTint(l);gl_FragColor=vec4(c,a);}`,{uniforms:crownU});
  const treeRune=groundPlane(2.1,M.x,0.021,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;vec4 s=styShape(7.,vUv);
   float m=s.r*.7+smoothstep(.03,0.,abs(r-.7))*.6+smoothstep(.05,0.,abs(r-.81))*step(.6,fract(an*16.+uT*.3))*.7;
   m+=smoothstep(.06,0.,abs(fract(an*6.-uT*.15)-.5))*step(r,.68)*step(.25,r)*.45;m*=step(r,uP*1.05);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.6+.35*s.g)*1.2,m*uA*.85);}`,{},{mode:'energy'})); treeRune.position.z=M.z; VG[ST].decal.add(treeRune);
  VG[ST].n+=S.pts(VG[ST].part,36,VV+`const vec3 MM=${v3(M)};
  void main(){float s=${f(TT)}+aSeed.x*.75;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*7.;float rad=mix(.65,.18,smoothstep(0.,.6,k))+smoothstep(.7,1.,k)*.5;
   vec3 p=MM+vec3(cos(an)*rad,k*2.5,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;vK=k*.6;vR=0.;put(p,.12+.06*aSeed.w);}`,S.ENERGY_FS(CE.spark,{gain:1.3}),{mode:'energy'});

  // ---------------------------------------------------------------
  // 4 · LLUVIA DE HOJAS DE ORO Y ROCÍO sobre el escuadrón
  // ---------------------------------------------------------------
  const RAIN=VV+`const vec3 CC=${v3(C)};
  void main(){float s=${f(TN)}+aSeed.x*.7;float life=.95+aSeed.y*.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 r=rnd();vec3 p=CC+vec3(r.x*1.6,3.-2.95*(k*.75+k*k*.25),r.z*1.6);
   p.x+=sin(k*6.+aSeed.z*6.2832)*.28;p.z+=cos(k*5.+aSeed.w*6.2832)*.22;
   vR=aSeed.z*6.2832+k*(3.+4.*aSeed.w);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.78,1.,age);`;
  VG[PR].n+=S.pts(VG[PR].part,36,RAIN+`put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(CE.leaf,{relief:4,col:GOLD,bias:.05}));
  VG[PR].n+=S.pts(VG[PR].part,22,RAIN+`put(p,.16+.05*aSeed.w);}`,S.MATTER_FS(CE.drop,{relief:5,col:DEW,bias:.05}));

  // ---------------------------------------------------------------
  // 5 · HUMO DE PURIFICACIÓN — volutas violeta oscuro que se arrancan de cada aliado y se vuelven motas doradas
  // ---------------------------------------------------------------
  [SP,AX,A1].forEach((P,i)=>{
    // volutas finas que se despegan hacia arriba: humo estirado en vertical (vR≈0, tamaño alto), poco opaco
    VG[CS].n+=S.pts(VG[CS].part,10,VV+`const vec3 P=${v3(P)};
    void main(){float t=uT-${f(TS+i*0.08)}-aSeed.x*.1;float age=t/.55;float c=max(t,0.);float an=aSeed.z*6.2832;
     vec3 p=P+vec3(cos(an)*(.3+.15*aSeed.y),.5+aSeed.w*.8+c*(2.2+1.*aSeed.y),sin(an)*(.3+.15*aSeed.y))+vec3(sin(c*6.+aSeed.x*9.)*.12,0.,0.);
     vA=(age>0.&&age<1.)?.7:0.;vK=smoothstep(.1,.8,age);vR=sin(c*5.+aSeed.w*6.)*.35;put(p,(.95+.3*aSeed.y));}`,
      S.PV+`void main(){vec2 uv=styPC();uv.x=(uv.x-.5)*2.+.5;vec4 sh=styShape(0.,uv);float m=sh.r;if(m<.02)discard;
       float er=styErode(m*.5+sh.b*.5,vK*1.05-.05,.15);float a=er*vA*smoothstep(0.,.2,m);if(a<.01)discard;
       gl_FragColor=vec4(styRampOf(${MIASMA},.35+.4*sh.g),a);}`);
    VG[CS].n+=S.pts(VG[CS].part,14,VV+`const vec3 P=${v3(P)};
    void main(){float t=uT-${f(TS+i*0.08+0.22)}-aSeed.x*.1;float age=t/.6;float c=max(t,0.);float an=aSeed.z*6.2832;
     vec3 p=P+vec3(cos(an)*(.3+.3*c),.6+aSeed.w*.8+c*1.6,sin(an)*(.3+.3*c));
     vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(c*50.+aSeed.x*30.)):0.;vK=age*.6;vR=0.;put(p,.12+.06*aSeed.y);}`,
      S.ENERGY_FS(CE.spark,{gain:1.3}),{mode:'energy'});
  });

  // ---------------------------------------------------------------
  // 6 · CÚPULA DE CELDAS — media esfera geodésica: caras esmeralda/oro casi transparentes, bordes hexagonales de oro
  //     pintados, frente que sube y pulso al sellarse; aro trazado y onda de pincel en el suelo
  // ---------------------------------------------------------------
  const R=3;
  let dg=new THREE.IcosahedronGeometry(R,2);
  if(dg.index)dg=dg.toNonIndexed();
  {const pa=dg.attributes.position,n=pa.count,B=new Float32Array(n*3),H=new Float32Array(n*3);
    for(let i=0;i<n;i++){const k=i%3,x=Math.round(pa.getX(i)*100)/100,y=Math.round(pa.getY(i)*100)/100,z=Math.round(pa.getZ(i)*100)/100;
      const h=Math.abs(Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453)%1; B[i*3+k]=1; H[i*3+k]=h;}
    dg.setAttribute("aB",new THREE.BufferAttribute(B,3)); dg.setAttribute("aH",new THREE.BufferAttribute(H,3));}
  const dome=new THREE.Mesh(dg,S.mat(`varying vec3 vB;varying vec3 vH;uniform float uQ;
  void main(){if(vP.y<-.005)discard;float h=vP.y/${f(R)};
   vec3 b=vB;float bmax=max(b.x,max(b.y,b.z));float bmin=min(b.x,min(b.y,b.z));float bmid=b.x+b.y+b.z-bmax-bmin;
   float cell=b.x>=bmax?vH.x/max(b.x,.01):(b.y>=bmax?vH.y/max(b.y,.01):vH.z/max(b.z,.01));
   float hexE=smoothstep(.07,0.,bmax-bmid);float rev=uP*1.12;float on=step(cell*.3+h*.8,rev);
   float front=smoothstep(.06,0.,abs(h-rev))*step(uP,.99);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float pulse=smoothstep(.08,0.,abs(h-(1.-uQ*1.1)))*step(0.,uQ)*step(uQ,1.);
   vec4 s=styNoise(vUv*2.+cell);float brush=.7+.3*s.r;
   vec3 face=mix(${LEAF},${GOLD},step(.6,cell));
   vec3 c=face*(.35+.6*fr)*on+styRampOf(${GOLD},.75)*hexE*on*1.4*brush+styRamp(.9)*front*1.2+mix(face,${GOLD},.5)*pulse*1.2;
   float al=on*(.06+.16*fr)+hexE*on*.6*brush+front*.7+pulse*(.25+.5*hexE);
   gl_FragColor=vec4(c*1.1,min(al,1.)*uA);}`,{uQ:{value:-1}},{mode:'energy',side:THREE.DoubleSide,vertexShader:`attribute vec3 aB;attribute vec3 aH;
  varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;varying vec3 vB;varying vec3 vH;
  void main(){vUv=uv;vP=position;vB=aB;vH=aH;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`}));
  dome.position.copy(C); VG[HD].mesh.add(dome);
  const domeRing=groundPlane(6.6,C.x,0.023,S.mat(`void main(){vec2 p=(vUv-.5)*6.6;float r=length(p);float an=atan(p.y,p.x)/6.2832;
   vec4 s=styNoise(vec2(an*3.,r*.4)+.2);float m=smoothstep(.12,0.,abs(r-3.+(s.r-.5)*.1))*(.7+.3*s.g)+smoothstep(.05,0.,abs(r-2.78))*.5
    +smoothstep(.08,0.,abs(r-2.9))*step(.55,fract(an*36.-uT*.4))*.6;m*=step(an+.5,uP*1.02);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.55+.35*s.g)*1.2,m*uA);}`,{},{mode:'energy'}));
  domeRing.position.z=C.z; VG[HD].decal.add(domeRing);
  const shock=groundPlane(8.5,C.x,0.03,S.mat(S.FS.RING,{},{mode:'energy'})); shock.position.z=C.z; VG[HD].decal.add(shock);
  VG[HD].n+=S.pts(VG[HD].part,40,VV+`const vec3 CC=${v3(C)};
  void main(){float an=aSeed.y*6.2832;float el=asin(.08+.9*aSeed.z);vec3 d=vec3(cos(an)*cos(el),sin(el),sin(an)*cos(el));
   float env=smoothstep(${f(TD+0.15)},${f(TD+0.35)},uT)*(1.-smoothstep(${f(TE-0.25)},${f(TE)},uT));
   float tw=pow(.5+.5*sin(uT*(9.+6.*aSeed.w)+aSeed.x*30.),4.);
   vec3 p=CC+d*${f(R+0.02)};vA=env*tw;vK=.2;vR=aSeed.x*6.28;put(p,.18+.1*aSeed.x);}`,S.ENERGY_FS(CE.spark,{gain:1.3}),{mode:'energy'});

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const k of IDS)for(const l of VFX.LK)VG[k][l].visible=v==="full"||v===k;
    a.count=v==="full"?IDS.reduce((s,k)=>s+VG[k].n,0):VG[v].n;};

  const em=(d,col,k)=>{if(k>d.emissiveIntensity){d.emissive.copy(col);d.emissiveIntensity=k;}};
  const GOLDC=new THREE.Color(0xf2b832), LEAFC=new THREE.Color(0x3fae5a);
  a.pose=function(te,o){
    const on=id=>a.v==="full"||a.v===id, ia=te-TI;
    target.visible=false;
    const ax=allies[0]; ax.position.copy(AX);
    const lean=0.07*ss(0,TR,te)-0.12*ss(TI-0.12,TI,te)+0.05*ss(TI,TI+0.5,te);
    caster.rotation.z=lean; ax.rotation.z=lean*0.8;
    const cm=caster.userData.m, am=ax.userData.m, bm=allies[1].userData.m;
    // 1 pulso
    const pp=cl((te-0.05)/0.6), pEnv=te>=0.05?1-ss(0.55,0.8,te):0;
    set(pulse,1-Math.pow(1-pp,2),pEnv);
    // 2 raíces
    const rEnv=ss(TR,TR+0.1,te)*(1-ss(TE+0.15,TE+0.4,te)), back=1-cl((te-TE)/0.35);
    for(const r of roots){const g=cl((te-TR-r.userData.d)/0.4);set(r,(1-Math.pow(1-g,2))*back,rEnv>0.01?1:0);r.visible=rEnv>0.01&&g>0;}
    rootG[0].position.copy(caster.position); rootG[1].position.copy(ax.position);
    for(const s of soil)s.material.uniforms.uA.value=rEnv;
    soil[0].position.x=caster.position.x; soil[1].position.x=ax.position.x;
    // 3 árbol
    const tg=cl((te-TT)/0.5), tEnv=ss(TT,TT+0.08,te)*(1-ss(TT+1.2,TT+1.55,te));
    trunkMat.uniforms.uP.value=ss(0,1,tg); trunkMat.uniforms.uA.value=tEnv>0.01?1:0; trunkMat.uniforms.uK.value=0.5+0.5*Math.sin(te*6);
    crownU.uG.value=cl((te-TT-0.2)/0.45); crownU.uF.value=ss(TT+1.0,TT+1.5,te);
    set(treeRune,cl((te-TT)/0.3),tEnv*0.9); tree.visible=te>=TT&&te<TT+1.55;
    // 6 cúpula
    const dp=cl((te-TD)/0.28), dEnv=ss(TD,TD+0.05,te)*(1-ss(TE-0.25,TE,te));
    dome.visible=te>=TD&&te<TE; set(dome,1-Math.pow(1-dp,2),dEnv); dome.material.uniforms.uQ.value=(te-TI)/0.35;
    dome.scale.setScalar(1+(ia>=0?0.035*Math.exp(-ia*8):0));
    set(domeRing,cl((te-TD)/0.25),dEnv);
    const sp=cl(ia/0.5); shock.visible=ia>=0&&sp<1; set(shock,0.05+0.9*sp,ia>=0?1:0); shock.scale.setScalar(0.5+0.6*sp);
    // brillo de los personajes
    const sEnv=[0,1,2].map(i=>{const t=te-TS-i*0.08-0.25;return t>=0?Math.exp(-t*6):0;});
    if(on(RB)){em(cm,LEAFC,0.2*rEnv);em(am,LEAFC,0.2*rEnv);}
    if(on(CS)){em(cm,GOLDC,0.45*sEnv[0]);em(am,GOLDC,0.45*sEnv[1]);em(bm,GOLDC,0.45*sEnv[2]);}
    if(on(HD)){const k=0.15*dEnv+(ia>=0?0.35*Math.exp(-ia*6):0);em(cm,GOLDC,k);em(am,GOLDC,k);em(bm,GOLDC,k);}
    // resplandor y luz (más bajos que el original: la materia se lee con la luz del tablero)
    const hs=[];
    if(on(GP))hs.push([2.2*Math.sin(Math.PI*pp)*pEnv,C.x,0.3,C.z,2.6,0.15*pEnv]);
    if(on(RB))hs.push([1.0*rEnv,M.x,0.3,M.z,1.3,0.1*rEnv]);
    if(on(ST))hs.push([2.4*tEnv,M.x,2.3,M.z,2.4,0.18*tEnv]);
    if(on(PR)){const e=ss(TN,TN+0.2,te)*(1-ss(2.4,2.8,te));hs.push([0.8*e,C.x,2.4,C.z,1.6,0.06*e]);}
    if(on(CS)){const e=Math.max(...sEnv);hs.push([1.6*e,C.x,1.3,C.z,2,0.12*e]);}
    if(on(HD))hs.push([2*dEnv+(ia>=0?4*Math.exp(-ia*5):0),C.x,1.3,C.z,3+(ia>=0?2*Math.min(ia,0.5):0),0.12*dEnv+(ia>=0?0.3*Math.exp(-ia*8):0)]);
    let best=null,sum=0; for(const h of hs){sum+=h[0];if(!best||h[0]>best[0])best=h;}
    if(best){o.g.set(best[1],best[2],best[3]);o.gs=best[4];o.ga=best[5];o.li=Math.min(sum,6);}else{o.g.copy(C);o.gs=0.001;o.ga=0;o.li=0;}
    o.ld=7; o.c.set(C.x,1.2,C.z); o.shake=0; o.flash=0;
    o.ia=on(HD)?ia:-1; o.dist=on(HD)?0.4:0; o.dark=0;
  };
}};

VFX.module("Estilizado · Sapidae · Dúo · Gaia",[gaia]);
})();

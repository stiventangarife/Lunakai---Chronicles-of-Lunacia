// =====================================================================
// ESTILIZADO · DÚO · ÉGIDA DE GAIA (Hito 101; Hito 104: égida de arcilla espiritual que también golpea) — Ultimate defensiva Sapidae + su Axie, kit vfx-stylized.js.
// Clave: sty_duo_gaia. Mismos dur / ti / fases / piezas que mod-duo-gaia.js y el mismo escuadrón: Sapidae (−3,7),
// su Axie a su lado (allies[0] en z = −1) y el otro aliado (ALLY_POS[1]); centro = centroide en el suelo.
// La carta (sobre sí, área 3): purifica, da 80 de escudo y cura 60 a los aliados del área.
// Piezas: pulso esmeralda por las líneas de las baldosas · raíces de corteza que se enroscan en los tobillos ·
// árbol espiritual (tronco de corteza pintada, copa de hojas de oro y esmeralda, sello rúnico) · lluvia de hojas de
// oro y rocío · humo violeta de purificación que se arranca y se vuelve motas doradas · cúpula de celdas hexagonales.
// Hito 104 (tema arcilla espiritual, como el Alfarero de Gólems: terracota con vetas de oro): el pulso corre en oro sobre
// barro, las raíces son de arcilla con savia de oro, el árbol se cambia por un anillo de pilares de arcilla con vetas que
// se alzan alrededor del dúo y sellan la cúpula, y la carta ahora también hace 60–80 de daño a los enemigos del área:
// sacudida de arcilla (onda radial con grietas de oro) y erupción de púas bajo cada rival real (VFX.foes) dentro de las
// 3 casillas; sin rivales, la erupción sale en corona alrededor del dúo. Llega en ti (con las curas).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,taperTube,variantGroups}=VFX.lib;
const S=VFX.sty, CE=S.CELL;
const PAL="Sty Dúo · Gaia"; VFX.palette(PAL,["#ffcb62","#9a4a26"]);
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const BARK=lin(0x7a5236), BARKD=lin(0x3e2818), SAP=lin(0x8fe36a), GOLD=lin(0xf2b832), LEAF=lin(0x3fae5a), LEAFD=lin(0x1c6a3a),
  MIASMA=lin(0x7a4a9a), MIASMAD=lin(0x22102e), DEW=lin(0xbdf0dc),
  CLAY=lin(0xa4552f), CLAYD=lin(0x4a2012), MUD=lin(0x6e3f26), DUST=lin(0xa98466);
// arcilla espiritual (sólida, luz en 3 bandas) con vetas de oro (uV) y erosión (uEr); uH = altura revelada (vP.y)
const CLAY_FS=`uniform float uV;uniform float uEr;uniform float uH;
void main(){if(vP.y>uH)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec2 tc=vP.xy*.9+vP.zx*.6+vUv*.5;
 float g=styNoise(tc).g;float vein=smoothstep(.3,.2,g)*smoothstep(.02,.1,g);
 float er=styErode(styNoise(tc*1.6+.37).r*.8+.2,uEr,.05);if(er<.5)discard;
 vec4 s=styNoise(tc*.7+.11);
 vec3 c=styRampOf(${CLAY},clamp(.22+.55*l+(s.r-.5)*.16,0.,1.))*styTint(l);
 c=mix(c,styRampOf(${CLAYD},.3+.3*l),smoothstep(.55,.8,s.b)*.45);
 c+=${GOLD}*vein*uV*1.7;
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.16*smoothstep(.62,.72,fr)*step(.5,l);
 gl_FragColor=vec4(c,1.);}`;
const clayMat=()=>S.mat(CLAY_FS,{uV:{value:0.8},uEr:{value:-0.2},uH:{value:99}},{mode:'solid'});
const VV=`varying float vR;varying float vK;`;

const gaia={key:"sty_duo_gaia",name:"Égida de Gaia (estilizado)",tier:3,dur:2.8,ti:1.78,pal:PAL,allies:2,stylized:true,
  vlabel:"Pieza",v:"full",
  variants:[["full","Completo"],["vfx_gaia_grid_pulse","Pulso"],["vfx_gaia_root_bind","Raíces"],["vfx_gaia_spirit_tree","Pilares"],
    ["vfx_gaia_pollen_rain","Lluvia"],["vfx_gaia_cleanse_smoke","Humo"],["vfx_gaia_hex_dome","Cúpula"],["vfx_gaia_clay_quake","Sacudida"]],
  phases:[["Pulso",0],["Anclaje",0.35],["Pilares",0.6],["Lluvia",0.9],["Purificación",1.1],["Cúpula",1.5],["Disipación",2.3]],
build(a){
  const IDS=["vfx_gaia_grid_pulse","vfx_gaia_root_bind","vfx_gaia_spirit_tree","vfx_gaia_pollen_rain","vfx_gaia_cleanse_smoke","vfx_gaia_hex_dome","vfx_gaia_clay_quake"];
  const [GP,RB,ST,PR,CS,HD,CQ]=IDS, VG=variantGroups(a,IDS); for(const k of IDS)VG[k].n=0;
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
   gl_FragColor=vec4(mix(styRamp(.35+.5*front*ln+.15*s.g),${GOLD},.4*ln)*1.15,min(m,1.)*uA);}`,{uO:{value:new THREE.Vector2(C.x,C.z)}},{mode:'energy'}));
  pulse.position.z=C.z; VG[GP].decal.add(pulse);
  // hojitas que saltan del frente al cruzarlo
  VG[GP].n+=S.pts(VG[GP].part,40,VV+`const vec3 CC=${v3(C)};
  void main(){float s=.08+aSeed.x*.55;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float R=3.*(1.-pow(1.-clamp((s-.05)/.6,0.,1.),2.));float sd=floor(aSeed.z*4.);float u=aSeed.w*2.-1.;
   vec2 q=sd<1.?vec2(R,u*R):sd<2.?vec2(-R,u*R):sd<3.?vec2(u*R,R):vec2(u*R,-R);
   vec3 p=CC+vec3(q.x,.05+t*(.9+.5*aSeed.y),q.y);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.z*6.28+t*4.;put(p,.18+.1*aSeed.y);}`,S.MATTER_FS(CE.shard,{relief:3.2,col:CLAY,bias:.03}));

  // ---------------------------------------------------------------
  // 2 · RAÍCES DE ANCLAJE — 4 raíces de corteza por personaje que brotan y se enroscan en los tobillos; savia que late
  // ---------------------------------------------------------------
  const ROOT_FS=`void main(){float u=vUv.x;if(u>uP)discard;vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   vec4 s=styNoise(vec2(u*3.,vUv.y*.6));float bark=smoothstep(.04,0.,abs(s.b-.5))*.6;
   vec3 c=styRampOf(${CLAY},clamp(.2+.55*l-bark*.25+(s.r-.5)*.15,0.,1.))*styTint(l);
   float sap=pow(.5+.5*sin(u*24.-uT*9.),8.)*smoothstep(.4,.9,s.g+.3);float tip=smoothstep(.08,0.,uP-u);
   c=mix(c,${GOLD}*1.5,max(sap*.8,tip*.6));
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
   if(bed*.5+vein<.03)discard;vec3 c=mix(styRampOf(${MUD},.2+.3*s.g),${GOLD}*1.4,vein);
   gl_FragColor=vec4(c,(bed*.45+vein*.8)*uA);}`)); d.position.z=P.z; VG[RB].decal.add(d); return d;});
  for(const P of [SP,AX])VG[RB].n+=S.pts(VG[RB].part,16,VV+`const vec3 P=${v3(P)};
  void main(){float life=.9+aSeed.y*.5;float k=(uT-${f(TR+0.2)})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float sp=${f(TR+0.2)}+(c-aSeed.x)*life;float an=r.x*6.2832+age*1.2;float rad=.5+.35*r.y;
   vec3 p=P+vec3(cos(an)*rad,.05+age*(.7+.5*r.z),sin(an)*rad);
   vA=(k>=1.&&sp<${f(TE-0.2)})?1.:0.;vK=smoothstep(.4,1.,age);vR=0.;put(p,.1+.06*r.z);}`,S.ENERGY_FS(CE.spark,{gain:1.2}),{mode:'energy'});

  // ---------------------------------------------------------------
  // 3 · PILARES DE ARCILLA — anillo de 8 pilares de arcilla espiritual que se alzan alrededor del dúo con vetas de oro
  //     que trepan, glifo de oro en el suelo y motas que suben por ellos; al sellarse la cúpula brillan y luego se hunden
  // ---------------------------------------------------------------
  const NPIL=8, RP=2.7, pillars=[], pilVeins=[];
  const pillarG=new THREE.CylinderGeometry(0.2,0.3,1,8,6); pillarG.translate(0,0.5,0);
  const pillarMat=clayMat();
  const VEIN_SHELL=`uniform float uH;void main(){if(vP.y>uH)discard;float h=vP.y;vec2 tc=vec2(atan(vP.z,vP.x)/6.2832*2.,vP.y*.9);
   float g=styNoise(tc+.4).g;float vein=smoothstep(.3,.21,g)*smoothstep(.02,.1,g);
   float head=smoothstep(.12,0.,abs(h-uP))*step(h,uP+.02);float rev=step(h,uP);
   gl_FragColor=vec4(${GOLD}*(1.25+.5*head),(vein*.9+head*vein*.6)*rev*uA);}`;
  for(let i=0;i<NPIL;i++){
    const an=i/NPIL*Math.PI*2+0.2, h=1.15+0.45*((i*5)%3)/2, g=new THREE.Group();
    g.position.set(C.x+Math.cos(an)*RP,0,C.z+Math.sin(an)*RP); g.rotation.y=-an; g.userData={h,d:(i%4)*0.05};
    const m=new THREE.Mesh(pillarG,pillarMat); m.scale.set(1,h,1); g.add(m);
    // capitel: losa de arcilla girada
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.26,0.16,8),pillarMat); cap.position.y=h+0.04; cap.rotation.y=0.39; g.add(cap);
    const vm=S.mat(VEIN_SHELL,{uH:{value:99}},{mode:'energy'}); const ve=new THREE.Mesh(pillarG,vm); ve.scale.set(1.04,h,1.04); g.add(ve);
    g.userData.vm=ve; g.userData.cap=cap; pillars.push(g); pilVeins.push(vm); VG[ST].mesh.add(g);
  }
  const treeRune=groundPlane(6.6,C.x,0.021,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)/6.2832;
   float m=smoothstep(.022,0.,abs(r-.82))*.8+smoothstep(.014,0.,abs(r-.9))*.6+smoothstep(.03,0.,abs(r-.74))*step(.55,fract(an*24.+uT*.2))*.7;
   m+=smoothstep(.02,0.,abs(fract(an*8.-uT*.08)-.5)*r)*step(r,.72)*step(.3,r)*.35;m*=step(r,uP*1.05);if(m<.02)discard;
   gl_FragColor=vec4(${GOLD}*1.2,m*uA*.85);}`,{},{mode:'energy'})); treeRune.position.z=C.z; VG[ST].decal.add(treeRune);
  // tierra que se abre al pie de cada pilar
  const pilDust=VV+`const vec3 CC=${v3(C)};
  void main(){float pi=floor(aSeed.z*${NPIL}.);float an=pi/${NPIL}.*6.2832+.2;vec3 B=CC+vec3(cos(an)*${f(RP)},0.,sin(an)*${f(RP)});`;
  VG[ST].n+=S.pts(VG[ST].part,48,pilDust+`
   float s=${f(TT)}+mod(pi,4.)*.05+aSeed.x*.12;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float a2=aSeed.w*6.2832;vec3 p=B+vec3(cos(a2),0.,sin(a2))*(.25+.9*t)+vec3(0.,.08+(1.2+aSeed.y)*t-3.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=a2+t*8.;put(p,.14+.1*aSeed.y);}`,S.MATTER_FS(CE.shard,{relief:3.2,col:CLAY,bias:.03}));
  VG[ST].n+=S.pts(VG[ST].part,40,pilDust+`
   float life=.8+aSeed.y*.4;float k=(uT-${f(TT+0.3)})/life+aSeed.x;float age=fract(k);float sp=${f(TT+0.3)}+(floor(k)-aSeed.x)*life;
   vec3 p=B+vec3(sin(age*9.+aSeed.w*6.)*.25,age*1.9,cos(age*9.+aSeed.w*6.)*.25);
   vA=(k>=1.&&sp<${f(TE-0.3)})?sin(age*3.14159):0.;vK=age*.5;vR=0.;put(p,.1+.06*aSeed.w);}`,S.ENERGY_FS(CE.spark,{gain:1.3}),{mode:'energy'});

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
   vec3 face=mix(${CLAY}*2.2,${GOLD},step(.55,cell));
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

  // ---------------------------------------------------------------
  // 7 · SACUDIDA DE ARCILLA (daño 60–80) — onda radial de barro con grietas de oro desde el Sapidae hasta las 3 casillas y
  //     erupción de púas de arcilla bajo cada rival real del área (VFX.foes); sin rivales, corona de púas alrededor
  // ---------------------------------------------------------------
  const RQ=5.8, quake=groundPlane(2*RQ+0.6,SP.x,0.025,S.mat(`uniform float uK;void main(){vec2 p=(vUv-.5)*${f(2*RQ+0.6)};float r=length(p);float an=atan(p.y,p.x);
   if(r>${f(RQ)}+.2)discard;float R=uP*${f(RQ)};vec4 s=styNoise(vec2(an*1.3,r*.35)+.2);
   float front=smoothstep(.45,0.,abs(r-R+(s.r-.5)*.3))*step(.01,uP);
   float crk=smoothstep(.05,0.,abs(styNoise(vec2(an*2.2,r*.25)+.6).b-.5))*step(r,R)*smoothstep(.4,1.2,r);
   float m=front*.9+crk*.8;if(m<.03)discard;
   vec3 c=mix(styRampOf(${MUD},.25+.35*s.g),${GOLD}*1.7,crk*uK+front*.25);
   gl_FragColor=vec4(c,min(m,1.)*uA);}`,{uK:{value:1}}));
  quake.position.z=SP.z; VG[CQ].decal.add(quake);
  const NE=6, erupt=[], spikeMat=clayMat(), spikeG=new THREE.ConeGeometry(0.19,1,6); spikeG.translate(0,0.5,0);
  for(let k=0;k<NE;k++){
    const g=new THREE.Group(); g.visible=false; VG[CQ].mesh.add(g); const sp=[];
    for(let j=0;j<7;j++){const m=new THREE.Mesh(spikeG,spikeMat),an=j/7*Math.PI*2+k*0.7,rr=0.42+0.14*(j%2);
      m.position.set(Math.cos(an)*rr,-0.05,Math.sin(an)*rr); m.rotation.set(Math.sin(an)*0.42,0,-Math.cos(an)*0.42);
      m.userData.h=0.95+0.5*((j+k)%3)/2; m.userData.w=1.1+0.25*(j%2); g.add(m); sp.push(m);}
    const crk=groundPlane(2.2,0,0.027,S.mat(`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*1.1+${f(0.17*k+0.3)});
     float cr=smoothstep(.05,.0,abs(s.b-.5))*smoothstep(1.,.2,r)*step(r+s.r*.2,uP*1.15);float bed=smoothstep(.6,.15,r+(s.g-.5)*.2);
     if(cr<.05&&bed<.05)discard;vec3 c=mix(styRampOf(${MUD},.2+.3*s.g),${GOLD}*1.8,uK*cr);
     gl_FragColor=vec4(c,max(cr,bed*.7)*uA);}`,{uK:{value:0}}));
    const pg=new THREE.Group(); g.add(pg); g.add(crk);
    erupt.push({g,sp,crk,pg});
  }
  // partículas de la erupción (en el espacio de cada grupo): terrones, polvo y chispas de veta
  const EV=(body)=>VV+`const float TI=${f(TI)};void main(){`+body;
  for(const e of erupt){
    VG[CQ].n+=S.pts(e.pg,22,EV(`float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(vec3(aSeed.z-.5,1.2+aSeed.w,aSeed.y-.5));vec3 p=vec3(0.,.3,0.)+d*(2.2+2.5*aSeed.z)*t+vec3(0.,-6.5*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.15+.11*aSeed.w);}`),S.MATTER_FS(CE.shard,{relief:3.2,col:CLAY,bias:.03}));
    VG[CQ].n+=S.pts(e.pg,10,EV(`float s=TI+aSeed.x*.1;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;vec3 p=vec3(cos(an),0.,sin(an))*(.3+.8*(1.-exp(-t*3.)))+vec3(0.,.15+.4*t,0.);
     vA=(age>0.&&age<1.)?.85:0.;vK=smoothstep(.2,1.,age);vR=an;put(p,(.5+.3*aSeed.w)*(.6+age*.8));}`),S.MATTER_FS(CE.puff,{relief:4,col:DUST,bias:-.04}));
    VG[CQ].n+=S.pts(e.pg,12,EV(`float s=TI+aSeed.x*.08;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(vec3(aSeed.z-.5,.8+aSeed.w,aSeed.y-.5));vec3 p=vec3(0.,.4,0.)+d*(2.5+2.*aSeed.z)*t;
     vA=(age>0.&&age<1.)?1.-age:0.;vK=age*.6;vR=0.;put(p,.12+.07*aSeed.w);}`),S.ENERGY_FS(CE.spark,{gain:1.3}),{mode:'energy'});
  }
  const ePos=[];

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
    // 3 pilares
    const pEnvP=ss(TT,TT+0.1,te)*(1-ss(TE+0.1,TE+0.45,te));
    for(const g of pillars){const u=g.userData, rise=1-Math.pow(1-cl((te-TT-u.d)/0.35),3), sink=ss(TE,TE+0.4,te);
      g.visible=te>=TT&&te<TE+0.42; g.position.y=-(u.h+0.25)*(1-rise+sink);
      set(u.vm,cl((te-TT-0.25-u.d)/0.5),pEnvP);}
    pillarMat.uniforms.uV.value=0.55+0.25*Math.sin(te*5)+(ia>=0?1.0*Math.exp(-ia*3):0);
    set(treeRune,cl((te-TT)/0.35),pEnvP*0.9);
    // 6 cúpula
    const dp=cl((te-TD)/0.28), dEnv=ss(TD,TD+0.05,te)*(1-ss(TE-0.25,TE,te));
    dome.visible=te>=TD&&te<TE; set(dome,1-Math.pow(1-dp,2),dEnv); dome.material.uniforms.uQ.value=(te-TI)/0.35;
    dome.scale.setScalar(1+(ia>=0?0.035*Math.exp(-ia*8):0));
    set(domeRing,cl((te-TD)/0.25),dEnv);
    const sp=cl(ia/0.5); shock.visible=ia>=0&&sp<1; set(shock,0.05+0.9*sp,ia>=0?1:0); shock.scale.setScalar(0.5+0.6*sp);
    // 7 sacudida: onda radial y erupción bajo cada rival real dentro de las 3 casillas (o corona si no hay)
    {const fo=(VFX.foes||[]).filter(q=>Math.hypot(q.x-SP.x,q.z-SP.z)<=RQ+0.2).slice(0,NE);
      ePos.length=0;
      if(fo.length)for(const q of fo)ePos.push([q.x,q.z,Math.hypot(q.x-SP.x,q.z-SP.z)]);
      else for(let k=0;k<NE;k++){const an=k/NE*Math.PI*2+0.5;ePos.push([C.x+Math.cos(an)*3.5,C.z+Math.sin(an)*3.5,3.5]);}
      const qp=cl((ia+0.06)/0.36);
      quake.visible=ia>=-0.06&&te<2.75; set(quake,1-Math.pow(1-qp,2),ia>=-0.06?1-ss(2.35,2.75,te):0);
      quake.material.uniforms.uK.value=ia>=0?0.45+0.55*Math.exp(-ia*2.5):0;
      erupt.forEach((e,k)=>{const P=ePos[k]; e.g.visible=!!P&&ia>=-0.04&&te<2.78; if(!P)return;
        e.g.position.set(P[0],0,P[1]);
        const up=1-Math.pow(1-cl((ia+0.04)/0.12),3), dn=ss(2.3,2.75,te);
        for(const m of e.sp){const h=m.userData.h*up*(1-dn);m.scale.set(m.userData.w,Math.max(h,0.001),m.userData.w);}
        set(e.crk,1-Math.pow(1-cl(ia/0.3),2),ia>=0?1-ss(2.4,2.78,te):0); e.crk.material.uniforms.uK.value=ia>=0?Math.exp(-ia*2):0;});
      spikeMat.uniforms.uV.value=ia>=0?0.5+1.2*Math.exp(-ia*3):0.5;}
    // brillo de los personajes
    const sEnv=[0,1,2].map(i=>{const t=te-TS-i*0.08-0.25;return t>=0?Math.exp(-t*6):0;});
    if(on(RB)){em(cm,GOLDC,0.15*rEnv);em(am,GOLDC,0.15*rEnv);}
    if(on(CS)){em(cm,GOLDC,0.45*sEnv[0]);em(am,GOLDC,0.45*sEnv[1]);em(bm,GOLDC,0.45*sEnv[2]);}
    if(on(HD)){const k=0.15*dEnv+(ia>=0?0.35*Math.exp(-ia*6):0);em(cm,GOLDC,k);em(am,GOLDC,k);em(bm,GOLDC,k);}
    // resplandor y luz (más bajos que el original: la materia se lee con la luz del tablero)
    const hs=[];
    if(on(GP))hs.push([2.2*Math.sin(Math.PI*pp)*pEnv,C.x,0.3,C.z,2.6,0.15*pEnv]);
    if(on(RB))hs.push([1.0*rEnv,M.x,0.3,M.z,1.3,0.1*rEnv]);
    if(on(ST))hs.push([1.6*pEnvP,C.x,1.0,C.z,3.2,0.1*pEnvP]);
    if(on(CQ)&&ia>=0)hs.push([5*Math.exp(-ia*4),SP.x,0.4,SP.z,3+3*Math.min(ia,0.4),0.22*Math.exp(-ia*7)]);
    if(on(PR)){const e=ss(TN,TN+0.2,te)*(1-ss(2.4,2.8,te));hs.push([0.8*e,C.x,2.4,C.z,1.6,0.06*e]);}
    if(on(CS)){const e=Math.max(...sEnv);hs.push([1.6*e,C.x,1.3,C.z,2,0.12*e]);}
    if(on(HD))hs.push([2*dEnv+(ia>=0?4*Math.exp(-ia*5):0),C.x,1.3,C.z,3+(ia>=0?2*Math.min(ia,0.5):0),0.12*dEnv+(ia>=0?0.3*Math.exp(-ia*8):0)]);
    let best=null,sum=0; for(const h of hs){sum+=h[0];if(!best||h[0]>best[0])best=h;}
    if(best){o.g.set(best[1],best[2],best[3]);o.gs=best[4];o.ga=best[5];o.li=Math.min(sum,6);}else{o.g.copy(C);o.gs=0.001;o.ga=0;o.li=0;}
    o.ld=7; o.c.set(C.x,1.2,C.z); o.shake=on(CQ)?1.1:0; o.flash=0;
    o.ia=on(HD)||on(CQ)?ia:-1; o.dist=on(HD)||on(CQ)?0.5:0; o.dark=0;
  };
}};

VFX.module("Estilizado · Sapidae · Dúo · Gaia",[gaia]);
})();

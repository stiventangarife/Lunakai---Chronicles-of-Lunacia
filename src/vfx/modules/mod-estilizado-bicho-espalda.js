// =====================================================================
// ESTILIZADO · BICHO · ESPALDA (Hito 101) — las 6 cartas de espalda de Bicho hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_ieBuzzBuzz, sty_ieSandal…). Mismos dur / ti / fases que las originales, así el daño
// llega igual. Todo nace de la espalda del lanzador (≈ (-3.85,1.25,0)): enjambres, élitros, gusanos y objetos invocados.
// Semántica según PartCards.js:
//   Buzz Buzz (área en cruz: daño + −1 PA al turno siguiente) · Garish Worm (3 PA, daño fuerte)
//   Sandal (3 PA, cuerpo a cuerpo, daño; +50 % si el rival tiene miedo) · Scarab (daño + escudo propio + bloqueo de curación)
//   Snail Shell (aliado: escudo 60 y quien lo golpee cuerpo a cuerpo queda lento) · Spiky Wing (daño; +25 % contra escudo)
// Identidad de clase: quitina carmesí con el acento propio de cada carta (ámbar del zumbido, lima chillona del gusano,
// oro del escarabajo, miel de la concha). Sin caras ni ojos: las criaturas son siluetas estilizadas.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_BUZZ=pal("Sty Bicho · Zumbido",["#ffc04a","#9b1a2a"]);
const P_WORM=pal("Sty Bicho · Gusano",["#d4f53c","#a3122f"]);
const P_SANDAL=pal("Sty Bicho · Sandalia",["#ffad6a","#8e1b24"]);
const P_SCARAB=pal("Sty Bicho · Escarabajo",["#ffcf5c","#7a1f1c"]);
const P_SNAIL=pal("Sty Bicho · Concha",["#ffc27a","#9a2630"]);
const P_SPIKY=pal("Sty Bicho · Élitro",["#ff6f5e","#6e0f22"]);

// colores fijos en espacio lineal (THREE.Color convierte el hex sRGB al espacio de trabajo)
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const CRIMSON=lin("#c41a2c"), CRIMD=lin("#3a0710"), AMBER=lin("#ffb43a"), GOLD=lin("#ffc94a"), GOLDD=lin("#8a5a12"),
  LIME=lin("#8cc414"), LIMED=lin("#4f7d12"), SAND=lin("#d9aa5e"), EARTH=lin("#8a6a48"), SOOT=lin("#2e2320"),
  LEATHER=lin("#a8643a"), HONEY=lin("#f0a640"), SHELLC=lin("#e8c08a"), SHIELD=lin("#7fb8ff"), HEALG=lin("#4fd36a"), SLOWB=lin("#6a8cf0");

const CB=V3(-3.85,1.25,0);                   // espalda del lanzador
const TX=3.4, TC=V3(3.15,1.2,0);              // objetivo (base x, pecho visible)
const TILE=1.93;                              // una casilla en unidades del laboratorio
const ZONES={zoneCaster:0.6,zoneTarget:1.15};
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), XA=V3(1,0,0), COL=new THREE.Color();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const win=(te,a,b,c,d)=>ss(a,b,te)*(1-ss(c,d,te));
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const VV=`varying float vR;varying float vK;`;
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};

// ---------- shaders compartidos ----------
// sólido con luz del sol en 3 bandas: body fija `base` (y opcionalmente lb, sesgo de la rampa); uQ = erosión, uK = brillo
const SOLID=(body,{hot='uC1',rim=.22,er=.05,nzs='vec2(1.7,.9)'}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;float glow=0.;${body}
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*(uK+glow);gl_FragColor=vec4(c,1.);}`;
// quitina carmesí con brillo tornasol en el borde
const CHITIN=(a=CRIMSON,b=CRIMD)=>`float fr0=1.-abs(dot(normalize(vN),normalize(vV)));base=mix(${b},${a},.55+.45*styNoise(vUv*vec2(2.,1.)).g);
 lb=.05;glow=smoothstep(.55,.95,fr0)*.25;`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.12+.3*n),m*er*uA*${f(alpha)});}`;
// grietas en el suelo (materia oscura con brillo de energía uK); uP = cuánto se abren
const CRACK_FS=`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*1.1+.37);vec4 s2=styNoise(vUv*2.3+.71);
 float cr=max(smoothstep(.05,.0,abs(s.b-.5)),smoothstep(.035,0.,abs(s2.b-.5))*.8)*smoothstep(1.,.35,r)*step(r+s.r*.2,uP*1.15);
 if(cr<.05)discard;vec3 c=mix(styRampOf(${SOOT},.15),styRamp(.85)*1.2,uK*smoothstep(.6,1.,cr));
 gl_FragColor=vec4(c,cr*uA*.9);}`;
// cúpula de escudo: borde de fresnel, revela de abajo arriba (uP) y se erosiona (uD); col = tono
const DOME=(col,bandsExpr='0.')=>`uniform float uD;uniform float uF;uniform float uR;
void main(){vec3 n=normalize(vN);float fr=1.-abs(dot(n,normalize(vV)));float h=vP.y/uR;
 if(h>uP*1.15-.1)discard;
 float nz=styNoise(vUv*vec2(3.,1.5)+.1).r;float er=styErode(nz*.7+(1.-h)*.3,uD,.1);
 float bands=${bandsExpr};
 float m=(pow(fr,1.8)*.8+.08+bands*.5)*er*(1.-smoothstep(uP*1.15-.25,uP*1.15-.1,h)*.6);
 gl_FragColor=vec4(styRampOf(${col},.3+.45*fr+bands*.25)*(.9+.5*uF),min(m,1.)*uA);}`;
const dome=(parent,R,col,bands)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(R,40,20,0,Math.PI*2,0,Math.PI/2),
  S.mat(DOME(col,bands),{uD:{value:-1},uF:{value:0},uR:{value:R}},{mode:'energy',side:THREE.DoubleSide}));parent.add(m);return m;};
// sello en billboard (materia): draw fija m (máscara) y c (color)
const SEAL=(draw)=>`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);vec4 s=styNoise(vUv*.9+.3);float m=0.;vec3 c=vec3(1.);${draw}
 if(m<.02)discard;float er=styErode(s.r*.6+m*.4,uP,.12);gl_FragColor=vec4(c,m*er*uA);}`;
const defs=[];

// =====================================================================
// 1 · BUZZ BUZZ (2 PA) — las alas de la espalda vibran en un zumbido ámbar; un enjambre de siluetas de insecto carmesí
//     sale en zigzag y cae sobre la cruz: cinco casillas zumban con anillos de pincel, el enjambre gira sobre ellas y
//     un orbe de PA dorado se agrieta sobre el rival (−1 PA el turno siguiente). ti 0,7 s
// =====================================================================
defs.push(Object.assign({key:"sty_ieBuzzBuzz",name:"Buzz Buzz (estilizado)",pa:2,dur:2.0,ti:0.7,pal:P_BUZZ,tier:2,stylized:true,
  phases:[["Zumbido",0],["Ondas",0.32],["Impacto",0.7],["Aturdido",0.95],["Fin",1.6]],
  zoneCaster:0.5,zoneTarget:TILE*1.1,
build(a){
  const L=a.L,TI=0.7,TS=0.32,END=2.0;
  const TILES0=[V3(TX,0,0),V3(TX-TILE,0,0),V3(TX+TILE,0,0),V3(TX,0,TILE),V3(TX,0,-TILE)], TILES=TILES0.map(v=>v.clone());
  // alas zumbando: dos óvalos de energía con nervios
  const WING=`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.9));if(d>1.)discard;
   float vein=smoothstep(.06,0.,abs(fract(atan(p.y,p.x+1.1)*3.)-.5)*d)*.6;float rim=smoothstep(.75,.98,d);
   gl_FragColor=vec4(styRampOf(${AMBER},.35+.4*rim+.3*vein),(.18+.5*rim+.4*vein)*(1.-d*.4)*uA);}`;
  const wings=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.62),S.mat(WING,{},{mode:'energy',side:THREE.DoubleSide}));
    L.mesh.add(m);return m;});
  // cruz zumbante en el suelo
  // Hito 105: cinco casillas enteras (antes, brazos de 0,6 casillas de ancho): relleno zumbante y borde marcado
  const CROSS=`uniform float uD;void main(){vec2 p=(vUv-.5)*2.;vec4 s=styNoise(vUv*.9+.17);
   vec2 q=(vUv-.5)*3.;vec2 c=floor(q+.5);if(abs(c.x)+abs(c.y)>1.)discard;float e=max(abs(q.x-c.x),abs(q.y-c.y))*2.;
   float len=max(abs(p.x),abs(p.y));
   float m=(smoothstep(.98,.9,e)*(.55+.45*smoothstep(.72,.9,e)))*step(len,uP*1.05);if(m<.02)discard;
   float wave=.5+.5*sin(len*26.-uT*30.);float er=styErode(s.r*.6+s.b*.4,uD,.1);
   gl_FragColor=vec4(mix(styRampOf(${CRIMSON},.2+.2*s.g),styRampOf(${AMBER},.55+.3*wave),.35+.4*wave),m*er*uA*.7);}`;
  const cross=groundPlane(TILE*3,TX,0.024,S.mat(CROSS,{uD:{value:-1}},{mode:'matter'})); L.decal.add(cross);
  const rings=TILES.map((t,i)=>[S.groundRing(L.decal,i?1.7:2.3),S.groundRing(L.decal,i?1.4:1.9)]);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.31});
  // orbe de PA que se agrieta
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.2,20,14),S.mat(SOLID(`base=${GOLD};lb=.08;
   float cr=smoothstep(.04,0.,abs(styNoise(vUv*vec2(2.,1.)+.5).b-.5))*uK;glow=cr*1.5;`,{hot:'vec3(1.,.75,.3)',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(orb);
  const K=VV+QB+`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 CB=${v3(CB)};
   vec3 tl(float i){return i<.5?${v3(TILES[0])}:(i<1.5?${v3(TILES[1])}:(i<2.5?${v3(TILES[2])}:(i<3.5?${v3(TILES[3])}:${v3(TILES[4])})));}
   // trayectoria de un bicho del enjambre: zigzag de la espalda a su casilla, después gira sobre ella
   vec3 bug(float tt,out float vis,out float dir){float i=floor(aSeed.x*5.);float s0=TS-.08+aSeed.y*.18;float fl=TI+(i>0.?.08:0.)-s0;
    float k=clamp((tt-s0)/fl,0.,1.);vec3 e=tl(i)+vec3(0.,1.+.5*aSeed.z,0.);vec3 m=mix(CB,e,.5)+vec3(0.,1.4+aSeed.w,(aSeed.z-.5)*2.);
    vec3 p=qb(CB+rnd()*.15,m,e,k);p+=vec3(0.,sin(tt*38.+aSeed.w*20.)*.12,cos(tt*31.+aSeed.y*20.)*.14)*(1.-k*.5);
    float ia=tt-(s0+fl);if(ia>0.){float an=aSeed.z*6.2832+ia*(5.+3.*aSeed.y);float rad=.35+.4*aSeed.w;
     p=tl(i)+vec3(cos(an)*rad,1.+.5*aSeed.z+.25*sin(ia*9.+aSeed.y*9.)-ia*.25,sin(an)*rad);}
    vis=(tt>s0&&tt<1.75+aSeed.y*.2)?1.:0.;dir=k<1.?atan(e.y-CB.y,e.x-CB.x):(aSeed.z*6.28+tt*6.);return p;}`;
  // 12 bichos: cuerpo oscuro de quitina y dos alas borrosas que baten; la trayectoria se calcula en la pose
  const NB=12;
  const bugMat=S.mat(SOLID(`base=mix(${CRIMD},${CRIMSON},.35+.3*smoothstep(-.1,.2,vP.x));lb=-.06;`,{rim:.45}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const BWING=`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.7));if(d>1.)discard;float rim=smoothstep(.6,.95,d);
   gl_FragColor=vec4(styRampOf(${AMBER},.5+.4*rim),(.45+.5*rim)*(1.-d*.4)*uA);}`;
  const bugs=[];for(let i=0;i<NB;i++){const g=new THREE.Group();L.mesh.add(g);
    const bd=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,10).scale(1.6,0.8,0.8),bugMat);g.add(bd);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(0.07,10,8),bugMat);hd.position.x=0.2;g.add(hd);
    const w=[1,-1].map(sg=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.2).translate(0.02,0.11,0),S.mat(BWING,{},{mode:'energy',side:THREE.DoubleSide}));
      m.position.set(-0.02,0.06,0);m.userData.sg=sg;g.add(m);return m;});
    bugs.push({g,w,tile:i%5,s0:0.24+0.03*(i%6)+0.01*i,h:0.9+0.08*(i%4),zr:((i*37)%11)/11-0.5,ph:i*1.7,rad:0.4+0.06*(i%5)});}
  const bS=V3(0,0,0),bM=V3(0,0,0),bE=V3(0,0,0),bP=V3(0,0,0),bQ=V3(0,0,0);
  const qbJ=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
  const bugAt=(B,tt,o)=>{const fl=TI+(B.tile?0.08:0)-B.s0,k=cl((tt-B.s0)/fl);bE.copy(TILES[B.tile]).setY(B.h+0.3);
    bS.copy(CB);bM.copy(CB).lerp(bE,0.5).add(tmp3.set(0,1.5,B.zr*2.2));qbJ(bS,bM,bE,k,o);
    o.y+=Math.sin(tt*30+B.ph)*0.1*(1-k*0.5);o.z+=Math.cos(tt*26+B.ph)*0.12*(1-k*0.5);
    const ia=tt-(B.s0+fl);if(ia>0){const an=B.ph+ia*5.5;o.set(TILES[B.tile].x+Math.cos(an)*B.rad,B.h+0.3+0.2*Math.sin(ia*8+B.ph)-ia*0.2,TILES[B.tile].z+Math.sin(an)*B.rad);}
    return k;};
  // ondas de zumbido: motas ámbar que vibran en el aire del lanzador
  S.pts(L.part,24,K+`void main(){float s=aSeed.x*.45;float life=.35;float age=(uT-s)/life;float an=aSeed.z*6.2832;
   vec3 p=CB+vec3(cos(an),sin(an)*.6,sin(an*1.7))*(.3+age*.9);vA=(age>0.&&age<1.)?1.-age:0.;vK=age;vR=an;put(p,.18);}`,
    S.ENERGY_FS(C.ring,{gain:.8}),{mode:'energy'});
  // esquirlas doradas del orbe de PA que cae
  S.pts(L.part,16,K+`void main(){float s=TI+.4;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(.6+.8*aSeed.w),.8+1.4*aSeed.y,sin(an)*(.6+.8*aSeed.w));
   vec3 p=vec3(${f(TX)},2.25,0.)+v*t+vec3(0.,-6.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=t*9.+aSeed.w*6.;
   put(p,.15+.06*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:GOLD}));
  a.pose=function(te,o){
    const ia=te-TI, buzz=win(te,0,0.15,TI+0.1,TI+0.35), fade=1-ss(END-0.45,END,te);
    // Hito 104: la cruz y las casillas de aterrizaje siguen la cuadrícula en los lanzamientos en diagonal
    {const ga=-(VFX.gridSnap||0),gc=Math.cos(ga),gs=Math.sin(ga);
     TILES0.forEach((v,i)=>{const dx=v.x-TX,dz=v.z;TILES[i].set(TX+gc*dx+gs*dz,0,-gs*dx+gc*dz);});
     S.gridAlign(cross,TX,0);}
    wings.forEach((w,i)=>{const sg=i?1:-1, fl=Math.sin(te*95+i)*0.5+0.5;
      w.position.set(CB.x-0.25,CB.y+0.25,sg*0.32); w.rotation.set(sg*(0.5+0.5*fl),0,0.35);
      w.scale.setScalar(Math.max(0.001,0.75+0.35*buzz)); set(w,0,buzz*(0.55+0.45*fl)); w.visible=buzz>0.001;});
    caster.rotation.z=0.05*buzz*Math.sin(te*70);
    bugs.forEach(B=>{const vis=te>B.s0&&te<1.85;B.g.visible=vis;if(!vis)return;bugAt(B,te,bP);bugAt(B,te+0.02,bQ);
      B.g.position.copy(bP);const dx=bQ.x-bP.x,dy=bQ.y-bP.y,dz=bQ.z-bP.z;B.g.rotation.set(0,-Math.atan2(dz,dx),Math.atan2(dy,Math.hypot(dx,dz)));
      const sc=2.3*(1-ss(1.55,1.85,te));B.g.scale.setScalar(Math.max(sc,0.001));
      B.w.forEach(m=>{m.rotation.x=m.userData.sg*(0.4+0.9*(0.5+0.5*Math.sin(te*110+B.ph)));set(m,0,0.9);});});
    bugMat.uniforms.uQ.value=-1;
    set(cross,e3((ia+0.05)/0.3),ia>-0.05?fade:0); cross.material.uniforms.uD.value=-0.1+1.1*ss(END-0.6,END,te);
    rings.forEach((r,i)=>{r[0].pose(ia-(i?0.06:0),TILES[i].x,TILES[i].z,0.45,1);r[1].pose(ia-0.3-(i?0.06:0),TILES[i].x,TILES[i].z,0.5,1);});
    spark.pose(ia,TC,1);
    // orbe de PA: aparece sobre la cabeza, se agrieta y estalla
    const io=te-(TI+0.05); orb.visible=io>=0&&io<0.36; orb.position.set(TX,2.25+0.08*Math.sin(te*12),0);
    orb.scale.setScalar(Math.max(0.001,e3(io/0.12)*(1+0.15*ss(0.25,0.35,io))));
    orb.material.uniforms.uK.value=0.2+1.5*ss(0.12,0.34,io);
    // el rival vibra con el zumbido
    const hit=hitE(ia,4), vib=ia>=0?Math.exp(-ia*2.2):0;
    target.position.x=TX+0.18*hit+0.04*vib*Math.sin(te*70); target.rotation.z=-0.05*vib*Math.cos(te*55)-0.2*hit;
    target.scale.set(1+0.05*hit,1-0.07*hit,1+0.05*hit); glowOf(target,COL.set("#ffb43a"),0.35*vib);
    if(te<TS){o.g.copy(CB);o.gs=0.6+0.6*buzz;o.ga=0.12*buzz;o.li=1.5*buzz;}
    else if(ia<0){o.g.lerpVectors(CB,TC,cl((te-TS)/(TI-TS)));o.gs=1;o.ga=0.15;o.li=2;}
    else{o.g.copy(TC);o.gs=1.5+2*Math.min(ia,0.5);o.ga=0.35*Math.exp(-ia*6)+0.04*fade;o.li=5*Math.exp(-ia*4);}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.7; o.flash=0.6;
  };
}}));

// =====================================================================
// 2 · GARISH WORM (3 PA) — un gusano espectral de anillos carmesí y lima chillona sale de la tierra detrás del lanzador,
//     se alza, se arquea hacia atrás y escupe un glóbulo de ácido que revienta sobre el rival: salpicadura, grietas,
//     mancha que chisporrotea. El gusano vuelve a hundirse. ti 1,35 s
// =====================================================================
defs.push(Object.assign({key:"sty_ieGarishWorm",name:"Garish Worm (estilizado)",pa:3,dur:3.1,ti:1.35,pal:P_WORM,tier:3,stylized:true,
  phases:[["Emerge",0],["Alza",0.45],["Escupe",1.0],["Impacto",1.35],["Salpicadura",1.7],["Retirada",2.3]],
build(a){
  const L=a.L,TI=1.35,TSP=1.0,END=3.1, BASE=V3(-4.55,0,0.35);
  // el gusano: tubo afilado con anillos; uP = cuánto ha salido (0..1 a lo largo), uQ = erosión al hundirse
  const pts=[V3(0,-0.4,0),V3(0.05,0.6,0),V3(-0.15,1.55,0),V3(0.25,2.35,0),V3(0.95,2.7,0),V3(1.45,2.45,0)];
  const curve=new THREE.CatmullRomCurve3(pts);
  const WORM_BODY=`float u=vUv.x;if(u>uP)discard;float seg=fract(u*14.);float seam=smoothstep(.07,0.,min(seg,1.-seg));
   float plate=smoothstep(.0,.5,min(seg,1.-seg));base=mix(${CRIMD},${CRIMSON},.25+.55*plate*(.6+.4*styNoise(vUv*vec2(8.,2.)).g));
   base=mix(base,${LIMED},seam*.7);lb=-.06+.06*plate;glow=seam*(1.1+.6*uK)-uK*(1.-seam);`;
  const worm=new THREE.Group(); worm.position.copy(BASE); L.mesh.add(worm);
  const body=new THREE.Mesh(taperTube(curve,96,14,0.44,0.32),S.mat(SOLID(WORM_BODY,{hot:'uC1*.75',rim:.4,nzs:'vec2(6.,1.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  worm.add(body);
  // cabeza: bulbo carmesí con un anillo de fauces lima (sin cara)
  const HEADP=pts[pts.length-1];
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.4,24,16),S.mat(SOLID(`base=mix(${CRIMD},${CRIMSON},.45);lb=-.04;float rr=styNoise(vUv*vec2(3.,2.)).g;base=mix(base,${CRIMD},smoothstep(.6,.8,rr)*.5);`,{rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  head.position.copy(HEADP); worm.add(head);
  const maw=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.07,10,24),S.mat(SOLID(`base=${LIME};glow=.4;`,{hot:'uC1',rim:.2}),{uQ:{value:-1},uK:{value:0.3}},{mode:'solid'}));
  maw.position.copy(HEADP).add(V3(0.24,-0.05,0)); maw.rotation.y=Math.PI/2; worm.add(maw);
  // tierra removida donde emerge
  const mound=groundPlane(2.2,BASE.x,0.025,S.mat(STAIN(EARTH,.75))); mound.position.z=BASE.z; L.decal.add(mound);
  const moundCrack=groundPlane(2.0,BASE.x,0.026,S.mat(CRACK_FS,{uK:{value:0}})); moundCrack.position.z=BASE.z; L.decal.add(moundCrack);
  // glóbulo de ácido
  const glob=new THREE.Mesh(new THREE.SphereGeometry(0.3,24,16),S.mat(SOLID(`float sw=styNoise(vUv*vec2(3.,2.)+uT*.6).r;base=mix(${LIMED},${LIME},smoothstep(.3,.7,sw));lb=.06;glow=.25;`,{hot:'uC1',rim:.4}),{uQ:{value:-1},uK:{value:0.3}},{mode:'solid'}));
  L.mesh.add(glob);
  const shadow=S.contactShadow(L.decal,1.0);
  // impacto
  const spark=S.hitSpark(L.mesh,2.1,{seed:0.62}), ring=S.groundRing(L.decal,3.4), ring2=S.groundRing(L.decal,2.6);
  const crack=groundPlane(3.6,TX,0.027,S.mat(CRACK_FS,{uK:{value:0}})); L.decal.add(crack);
  const stain=groundPlane(3.0,TX,0.025,S.mat(STAIN(LIMED,.7))); L.decal.add(stain);
  const K=VV+`const float TI=${f(TI)};const float TSP=${f(TSP)};const vec3 BASE=${v3(BASE)};`;
  // tierra que salta al emerger
  S.pts(L.part,22,K+`void main(){float s=aSeed.x*.25;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(.6+1.4*aSeed.w),2.+2.5*aSeed.y,sin(an)*(.6+1.4*aSeed.w));vec3 p=BASE+vec3(cos(an)*.3,.1,sin(an)*.3)+v*t+vec3(0.,-8.*t*t,0.);
   p.y=max(p.y,.03);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // salpicadura de ácido y nubes
  S.pts(L.part,48,K+`void main(){float s=TI+aSeed.x*.05;float life=.65+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(1.+2.6*aSeed.w)-1.2,2.+3.*aSeed.y,sin(an)*(1.+2.6*aSeed.w));vec3 p=vec3(${f(TC.x)},${f(TC.y)},0.)+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.x,v.y-16.*t);put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:LIME}));
  S.pts(L.part,16,K+`void main(){float s=TI+aSeed.x*.1;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},.4,0.)+vec3(cos(an),0.,sin(an))*(.3+1.2*(1.-exp(-t*4.)))+vec3(0.,.3+.8*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.6+.3*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:LIMED,bias:.05}));
  // la mancha chisporrotea: burbujas que suben y revientan
  S.pts(L.part,20,K+`void main(){float s=TI+.25+aSeed.x*1.1;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float an=aSeed.z*6.2832;float rad=.2+.9*aSeed.w;
   vec3 p=vec3(${f(TX)}+cos(an)*rad,.06+age*.45,sin(an)*rad);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=0.;put(p,.13+.08*aSeed.y);}`,S.MATTER_FS(C.drop,{relief:5,col:LIME,bias:.1}));
  // estela de gotas del glóbulo
  S.pts(L.part,24,K+`uniform vec3 uG;void main(){float s=TSP+aSeed.x*(TI-TSP);float life=.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=mix(vec3(-3.,2.7,.2),vec3(${f(TC.x)},${f(TC.y)},0.),(s-TSP)/(TI-TSP))+vec3(0.,1.4*sin(3.14159*(s-TSP)/(TI-TSP)),0.)+rnd()*.12+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=age;vR=3.14159;put(p,.14+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:LIME}));
  const MOUTH=V3(0,0,0), gs=V3(0,0,0), bm=body.material.uniforms, hm=head.material.uniforms, mm=maw.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, em=e3(te/0.55), rear=ss(0.45,1.0,te), lunge=ss(0.95,1.05,te)*(1-ss(1.25,1.9,te)), sink=ss(2.25,2.9,te);
    const fade=1-ss(END-0.5,END,te);
    worm.position.y=-0.5*(1-em)-1.6*sink; worm.rotation.z=0.22*rear-0.42*lunge+0.04*Math.sin(te*5);
    worm.scale.setScalar(1+0.06*Math.sin(te*9)*(1-sink));
    bm.uP.value=0.2+0.8*em; bm.uQ.value=-1+1.6*ss(2.3,2.95,te); bm.uK.value=0.35*lunge;
    hm.uQ.value=bm.uQ.value; mm.uQ.value=bm.uQ.value; mm.uK.value=0.3+1.2*ss(0.85,1.0,te)*(1-ss(1.05,1.3,te));
    head.visible=maw.visible=em>0.7; body.visible=te<3.0;
    set(mound,e3(te/0.3),fade); set(moundCrack,e3(te/0.25),1-ss(1.8,2.6,te)); moundCrack.material.uniforms.uK.value=0.5*hitE(te,3);
    // boca en el mundo (para el escupitajo)
    worm.updateMatrix(); MOUTH.copy(maw.position).applyMatrix4(worm.matrix);
    const kg=cl((te-TSP)/(TI-TSP)); glob.visible=te>=TSP&&ia<0.02;
    if(glob.visible){arcPt(MOUTH,TC,0.9,kg,glob.position);const sq=1+0.25*Math.sin(te*30);glob.scale.set(sq,1/sq,1);}
    gs.copy(glob.position); shadow.pose(gs.x,0,0.8+0.5*kg,glob.visible?0.35:0);
    spark.pose(ia,TC,1.2); ring.pose(ia,TX,0,0.5,1); ring2.pose(ia-0.12,TX,0,0.55,1);
    set(crack,e3(ia/0.3),ia>=0?1-ss(END-0.6,END,te):0); crack.material.uniforms.uK.value=0.9*hitE(ia,3);
    set(stain,e3(ia/0.35),ia>=0?fade:0); stain.material.uniforms.uP.value=-0.1+1.1*ss(END-1.0,END,te);
    const hit=hitE(ia,4);
    target.position.x=TX+0.32*hit*(1-Math.exp(-Math.max(ia,0)*18)); target.rotation.z=-hit*0.35*Math.cos(ia*13);
    target.scale.set(1+0.1*hit,1-0.14*hit,1+0.1*hit); glowOf(target,COL.set("#c8f03a"),0.45*hit+0.12*ss(1.4,1.6,te)*fade);
    caster.rotation.z=-0.06*lunge;
    if(te<TSP){o.g.copy(MOUTH);o.gs=0.6+0.8*rear;o.ga=0.1+0.15*rear;o.li=1+2*rear;}
    else if(ia<0){o.g.copy(glob.position);o.gs=1.1;o.ga=0.2;o.li=3;}
    else{o.g.copy(TC);o.gs=1.8+3*Math.min(ia,0.6);o.ga=Math.exp(-ia*6)*0.45+0.04*fade;o.li=8*Math.exp(-ia*4);}
    o.ia=ia; o.c.copy(TC); o.shake=1.4; o.dist=1.2; o.flash=0.55;
  };
}},ZONES));

// =====================================================================
// 3 · SANDAL (3 PA, cuerpo a cuerpo) — se invoca sobre el rival una sandalia espectral gigante (suela de cuero y correas
//     de quitina carmesí); se alza, se echa atrás y cae de golpe: aplasta al rival, polvo, grietas, temblor. Queda la
//     huella de la suela. ti 1,25 s
// =====================================================================
defs.push(Object.assign({key:"sty_ieSandal",name:"Sandal (estilizado)",pa:3,dur:3.0,ti:1.25,pal:P_SANDAL,tier:3,stylized:true,
  phases:[["Invocación",0],["Alzada",0.55],["Azote",1.0],["Impacto",1.25],["Polvo",1.5],["Huella",2.1]],
  zoneCaster:0.5,zoneTarget:1.3,
build(a){
  const L=a.L,TI=1.25,TA=1.0,END=3.0;
  const sandal=new THREE.Group(); L.mesh.add(sandal);
  const SOLE=`float top=smoothstep(.06,.09,vP.y);float side=1.-top;float tread=smoothstep(.4,.6,fract(vP.x*10.))*smoothstep(.03,0.,vP.y);
   base=mix(${lin("#4a2414")},${LEATHER},.35+.45*top);base=mix(base,${lin("#2a140a")},tread*.7);lb=-.04+.06*top;`;
  const fp=new THREE.Shape();{const N2=40;for(let i=0;i<=N2;i++){const an=i/N2*Math.PI*2,c=Math.cos(an),sn=Math.sin(an);
    const x=0.44*c, w=(0.13+0.07*(0.5+0.5*c))*(1+0.08*Math.cos(an*2));const y=w*sn+(c>0.6?0.02*sn:0);i?fp.lineTo(x,y):fp.moveTo(x,y);}}
  const soleG=new THREE.ExtrudeGeometry(fp,{depth:0.07,bevelEnabled:true,bevelThickness:0.02,bevelSize:0.02,bevelSegments:2,curveSegments:40}).rotateX(-Math.PI/2);
  const sole=new THREE.Mesh(soleG,S.mat(SOLID(SOLE,{rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  sandal.add(sole);
  const strapMat=S.mat(SOLID(CHITIN(),{hot:'uC2',rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const straps=[[0.22,0.35],[0.05,-0.45]].map(([x,r])=>{const m=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.04,8,24,Math.PI),strapMat);
    m.position.set(x,0.09,0);m.rotation.set(0,Math.PI/2+r,0);sandal.add(m);return m;});
  const knot=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8),strapMat); knot.position.set(0.14,0.24,0); sandal.add(knot);
  // sombra creciente bajo el rival y huella final
  const shadow=S.contactShadow(L.decal,2.6);
  const PRINT=`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,2.1));float n=styNoise(vUv*1.2+.2).r;
   float m=smoothstep(1.,.85,d+(n-.5)*.15);float tr=smoothstep(.45,.55,fract(p.x*4.+n*.3));if(m<.02)discard;
   float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${SOOT},.12+.15*tr),m*(.35+.25*tr)*er*uA);}`;
  const print=groundPlane(2.6,TX,0.026,S.mat(PRINT)); L.decal.add(print);
  const crack=groundPlane(4.2,TX,0.028,S.mat(CRACK_FS,{uK:{value:0}})); L.decal.add(crack);
  const rune=S.groundRing(L.decal,2.6), ring=S.groundRing(L.decal,3.8), ring2=S.groundRing(L.decal,3.0);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.48});
  const K=VV+`const float TI=${f(TI)};`;
  // invocación: polvo carmesí que gira sobre el rival
  S.pts(L.part,24,K+`void main(){float s=aSeed.x*.5;float life=.6;float age=(uT-s)/life;float an=aSeed.z*6.2832+age*4.;float rad=1.1-.6*age;
   vec3 p=vec3(${f(TX)}+cos(an)*rad,.2+age*(2.8+aSeed.w),sin(an)*rad);vA=(age>0.&&age<1.)?sin(age*3.14):0.;vK=age;vR=an;put(p,.2+.08*aSeed.y);}`,
   S.ENERGY_FS(C.spark,{gain:.8}),{mode:'energy'});
  // impacto: polvo que se abre en anillo y terrones
  S.pts(L.part,26,K+`void main(){float s=TI+aSeed.x*.08;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},0.,0.)+vec3(cos(an),0.,sin(an))*(.6+1.9*(1.-exp(-t*4.)))+vec3(0.,.2+.6*(1.-exp(-t*2.5)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.7+.35*aSeed.y)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.04}));
  S.pts(L.part,20,K+`void main(){float s=TI;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(1.2+2.4*aSeed.w),2.4+2.6*aSeed.y,sin(an)*(1.2+2.4*aSeed.w));vec3 p=vec3(${f(TX)},.1,0.)+vec3(cos(an),0.,sin(an))*.7+v*t+vec3(0.,-9.*t*t,0.);
   p.y=max(p.y,.03);vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.24+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  const sh=[sole.material.uniforms,strapMat.uniforms];
  a.pose=function(te,o){
    const ia=te-TI, inv=e3(te/0.55), up=ss(0.55,1.0,te), down=ss(TA,TI,te), fade=1-ss(END-0.5,END,te);
    // sandalia: aparece arriba, se alza echada atrás y cae como un azote
    const y=4.6+0.6*up-(4.6+0.6-1.3)*down*down, rot=0.15+0.55*up-0.7*down;
    const lift=ia>0?0.25*ss(0.25,0.9,ia):0;
    sandal.position.set(TX+0.05-0.4*up*(1-down),y+lift,0); sandal.rotation.set(0.75-0.35*down,0.3,rot);
    const sq=ia>=0?1+0.22*Math.exp(-ia*14):1;
    sandal.scale.set(3.4*sq,3.4/sq,3.4); sandal.visible=te>0.05&&te<2.3;
    const er=-1+1.5*ss(1.6,2.2,te); sh.forEach(u=>{u.uQ.value=er;u.uK.value=0.08*inv+0.35*hitE(ia,6);});
    shadow.pose(TX,0,0.6+0.9*cl(1-(y-2)/3.4),te<2.2?0.25+0.5*down:0);
    rune.pose(te-0.05,TX,0,0.55,1);
    set(print,e3(ia/0.2),ia>=0?fade:0); print.material.uniforms.uP.value=-0.1+1.1*ss(END-1.0,END,te);
    set(crack,e3(ia/0.25),ia>=0?1-ss(END-0.6,END,te):0); crack.material.uniforms.uK.value=hitE(ia,3);
    ring.pose(ia,TX,0,0.5,1); ring2.pose(ia-0.1,TX,0,0.6,1); spark.pose(ia,tmp.set(TX+0.4,0.6,0.4),1);
    // el rival: aplastado y rebota
    const hit=hitE(ia,5), squash=ia>=0?Math.exp(-ia*7):0;
    target.scale.set(1+0.4*squash,1-0.52*squash,1+0.4*squash); target.position.x=TX+0.05*hit;
    target.rotation.z=0.12*hit*Math.sin(ia*20); glowOf(target,COL.set("#ffad6a"),0.4*hit);
    if(ia<0){o.g.set(TX,y,0);o.gs=0.8+0.8*up;o.ga=0.08+0.14*up;o.li=1+2*up;}
    else{o.g.set(TX,0.6,0);o.gs=1.8+3*Math.min(ia,0.6);o.ga=Math.exp(-ia*6)*0.4;o.li=8*Math.exp(-ia*4);}
    o.ia=ia; o.c.set(TX,1.4,0); o.shake=1.7; o.dist=1.3; o.flash=0.5;
  };
}}));

// =====================================================================
// 4 · SCARAB (2 PA) — arena dorada cae de la espalda y se hunde; un lomo de arena avanza bajo tierra hasta el rival y un
//     escarabajo sagrado (caparazón carmesí con costura y bordes de oro) revienta del suelo y lo golpea desde abajo.
//     El lanzador queda bajo un caparazón dorado (escudo) y sobre el rival una gota de savia se seca y se agrieta (bloqueo de curación). ti 0,95 s
// =====================================================================
defs.push(Object.assign({key:"sty_ieScarab",name:"Scarab (estilizado)",pa:2,dur:2.2,ti:0.95,pal:P_SCARAB,tier:2,stylized:true,
  phases:[["Arena",0],["Túnel",0.22],["Emerge",0.55],["Estallido",0.95],["Polvo",1.15],["Sello",1.5]],
build(a){
  const L=a.L,TI=0.95,TT=0.22,END=2.2, X0=-3.3, LEN=TX-X0;
  // lomo de arena bajo tierra: franja a longitud completa revelada con uP (no se escala)
  const RIDGE=`uniform float uD;void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;float z=abs(vUv.y-.5)*2.;
   vec4 s=styNoise(vec2(u*${f(LEN*0.3)},vUv.y*.8)+.2);float w=.55+.3*s.r;float m=smoothstep(w,w*.3,z);
   float furrow=smoothstep(.18,0.,z)*smoothstep(.0,.08,d);float er=styErode(s.r*.6+s.g*.4,uD,.1);
   vec3 c=mix(styRampOf(${SAND},.35+.35*s.g+.25*(1.-z)),styRampOf(${EARTH},.15),furrow*.6);
   float a=m*er*uA;if(a<.01)discard;gl_FragColor=vec4(c,a*.9);}`;
  const ridge=new THREE.Mesh(new THREE.PlaneGeometry(LEN,0.9,64,1).rotateX(-Math.PI/2),S.mat(RIDGE,{uD:{value:-1}},{mode:'matter'}));
  ridge.position.set(X0+LEN/2,0.022,0); L.decal.add(ridge);
  const pile=groundPlane(1.8,-3.5,0.024,S.mat(STAIN(SAND,.75))); L.decal.add(pile);
  const bulge=groundPlane(2.6,TX,0.026,S.mat(CRACK_FS,{uK:{value:0}})); L.decal.add(bulge);
  const sandStain=groundPlane(2.8,TX,0.025,S.mat(STAIN(SAND,.65))); L.decal.add(sandStain);
  // el escarabajo (Hito 104, dibujo nuevo): dos élitros separados con estrías y borde de oro, pronoto con reborde, cabeza
  // con clípeo dentado y cuerno curvo de oro, patas en tres segmentos con espinas; contorno oscuro y brillo de quitina.
  const scarab=new THREE.Group(); L.mesh.add(scarab);
  const OUTLINE=`float frO=1.-abs(dot(normalize(vN),normalize(vV)));base*=1.-.65*smoothstep(.72,.97,frO);`;
  const ELY=`float sd=sign(vP.z+1e-4);float zz=abs(vP.z);
   float groove=smoothstep(.07,0.,.5-abs(fract(zz*11.+.5)-.5))*smoothstep(.0,.06,zz);
   float edge=smoothstep(.035,.0,zz-.0)+smoothstep(.06,.0,vP.y+.01);
   float sheen=pow(max(0.,dot(normalize(vN),normalize(vec3(-.3,1.,.2)))),18.);
   base=mix(${CRIMSON},${CRIMD},.35+.35*styNoise(vUv*vec2(4.,2.)).g+.25*groove);base=mix(base,${GOLD},clamp(edge,0.,1.)*.85);
   ${''}lb=-.08+.12*clamp(edge,0.,1.);glow=clamp(edge,0.,1.)*.22+sheen*.9;`;
  const shellMat=S.mat(SOLID(ELY+OUTLINE,{hot:'uC2*.6',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const PRO=`float rimP=smoothstep(.05,.0,abs(length(vP.xz*vec2(1.,.8))-.2));base=mix(mix(${CRIMD},${CRIMSON},.45+.3*styNoise(vUv*3.).g),${GOLD},rimP*.9);
   lb=-.06;glow=rimP*.2;`;
  const proMat=S.mat(SOLID(PRO+OUTLINE,{hot:'uC2*.6',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const goldMat=S.mat(SOLID(`base=${GOLD};lb=.08;`+OUTLINE,{rim:.35}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const legMat=S.mat(SOLID(`base=mix(${CRIMD},${SOOT},.4);`+OUTLINE,{rim:.25}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const shellMatU=shellMat;
  // élitros: medias cúpulas alargadas, una a cada lado, un poco abiertas
  const elys=[1,-1].map(sd=>{const g=new THREE.SphereGeometry(0.44,36,18,sd>0?0:Math.PI,Math.PI,0,Math.PI/2).scale(1.2,1.0,0.9);
    const m=new THREE.Mesh(g,shellMat);m.position.set(-0.08,0,sd*0.02);scarab.add(m);return m;});
  // pronoto (escudo del tórax) con reborde de oro
  const pron=new THREE.Mesh(new THREE.SphereGeometry(0.27,24,14,0,Math.PI*2,0,Math.PI/2).scale(0.85,0.95,1.12),proMat); pron.position.set(0.52,0.02,0); scarab.add(pron);
  // cabeza: clípeo plano dentado (seis dientes de oro) y cuerno curvo
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.15,18,10,0,Math.PI*2,0,Math.PI/2).scale(1.1,0.55,1.25),proMat); head.position.set(0.78,0.0,0); scarab.add(head);
  for(let i=0;i<6;i++){const an=-0.9+i*0.36;const t=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.12,6).rotateZ(-Math.PI/2),goldMat);
    t.position.set(0.9+Math.cos(an)*0.08,0.02,Math.sin(an)*0.17);t.rotation.y=-an*0.6;scarab.add(t);}
  const hornC=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0.08,0.14,0),V3(0.06,0.3,0),V3(-0.04,0.42,0)]);
  const horn=new THREE.Mesh(taperTube(hornC,18,8,0.055,0.012),goldMat); horn.position.set(0.8,0.06,0); scarab.add(horn);
  // patas: fémur, tibia con espinas y tarso, en zigzag hacia fuera
  for(let i=0;i<6;i++){const sd=i<3?1:-1,k=i%3;const g=new THREE.Group();g.position.set(-0.22+0.3*k,0.02,sd*0.3);g.rotation.y=sd*(0.25-0.35*k);scarab.add(g);
    const fem=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.025,0.22,6).translate(0,0.11,0),legMat);fem.rotation.x=sd*1.25;g.add(fem);
    const tib=new THREE.Group();tib.position.set(0,0.21*Math.cos(1.25),sd*0.21*Math.sin(1.25));g.add(tib);
    const tb=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.018,0.24,6).translate(0,-0.12,0),legMat);tb.rotation.x=-sd*0.5;tib.add(tb);
    for(let b=0;b<2;b++){const sp=new THREE.Mesh(new THREE.ConeGeometry(0.014,0.06,4),goldMat);sp.position.set(0,-0.08-0.08*b,sd*0.03);sp.rotation.x=sd*1.2;tib.add(sp);}}
  const sm0=[shellMat,proMat,goldMat,legMat];
  // escudo del lanzador: cúpula dorada con placas de caparazón
  const shield=dome(L.mesh,1.05,GOLD,`smoothstep(.06,0.,.5-abs(fract(atan(vP.z,vP.x)/6.2832*10.)-.5))*.6+smoothstep(.05,0.,abs(fract(h*3.)-.5)-.44)*.4`);
  shield.position.set(-3.7,0,0);
  // bloqueo de curación (Hito 104, sin cruz de cura): una gota de savia verde dentro de un anillo; la gota se seca a
  // gris ceniza y se agrieta (uK = cuánto se ha secado), sin ningún signo + ni cruz.
  const seal=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),S.mat(`uniform float uK;`+SEAL(`
   vec2 q=p*vec2(1.,-1.)+vec2(0.,.08);float drop=length(q*vec2(1.,.8)+vec2(0.,max(q.y,0.)*.55))-.36;
   float dm=smoothstep(.04,-.02,drop);float ring=smoothstep(.09,.03,abs(r-.8));
   float crack=smoothstep(.05,0.,abs(s.b-.5)*1.2+abs(p.x*.6))*dm*smoothstep(.2,.6,uK);
   float hl=smoothstep(.06,0.,length(q-vec2(-.12,.12))-.07)*dm*(1.-uK);
   m=max(dm,ring);vec3 g=mix(styRampOf(${HEALG},.5+.25*(1.-r)),styRampOf(vec3(.42,.4,.38),.35+.2*s.g),uK);
   c=mix(g,styRampOf(${SOOT},.12),max(crack,ring*.7));c+=vec3(.8)*hl;`),{uK:{value:0}},{mode:'matter',depthTest:false}));
  L.mesh.add(seal);
  const spark=S.hitSpark(L.mesh,1.2,{seed:0.27}), ring=S.groundRing(L.decal,2.8), sring=S.groundRing(L.decal,2.4);
  const K=VV+`const float TI=${f(TI)};const float TT=${f(TT)};const vec3 CB=${v3(CB)};`;
  // arena que cae de la espalda
  S.pts(L.part,30,K+`void main(){float s=aSeed.x*.3;float life=.45+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=CB+vec3(-.15,0.,0.)+rnd()*vec3(.15,.05,.15)+vec3(.15*t,-6.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14;
   put(p,.13+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:3,col:SAND}));
  // frente del túnel: guijarros de arena que saltan
  S.pts(L.part,30,K+`void main(){float s=TT+aSeed.x*(TI-TT-.05);float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=${f(X0)}+(s-TT)/(TI-TT)*${f(LEN)};float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*.6,1.4+1.4*aSeed.w,sin(an)*.8);
   vec3 p=vec3(x,.05,0.)+v*t+vec3(0.,-7.*t*t,0.);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=t*8.;put(p,.12+.06*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:SAND}));
  // estallido de arena
  S.pts(L.part,40,K+`void main(){float s=TI+aSeed.x*.06;float life=.7+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(.8+2.*aSeed.w),2.4+3.*aSeed.y,sin(an)*(.8+2.*aSeed.w));vec3 p=vec3(${f(TX)},.2,0.)+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.x,v.y-16.*t);put(p,.17+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:3,col:SAND}));
  S.pts(L.part,14,K+`void main(){float s=TI+aSeed.x*.12;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},.3,0.)+vec3(cos(an),0.,sin(an))*(.3+1.2*(1.-exp(-t*4.)))+vec3(0.,.2+.7*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.6+.3*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:SAND,bias:.04}));
  const sm=sm0.map(m=>m.uniforms), shu=shield.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(END-0.45,END,te);
    set(pile,e3(te/0.3),te<1.2?1-ss(0.7,1.2,te):0);
    set(ridge,cl((te-TT)/(TI-TT))*1.02,te>=TT?1:0); ridge.material.uniforms.uD.value=-0.1+1.1*ss(1.1,1.8,te);
    set(bulge,e3((te-0.55)/0.4),te>=0.55?1-ss(1.6,2.1,te):0); bulge.material.uniforms.uK.value=0.6*ss(0.55,TI,te)*(1-ss(TI,TI+0.4,te));
    set(sandStain,e3(ia/0.3),ia>=0?fade:0);
    // el escarabajo revienta del suelo, golpea desde abajo, da la vuelta y se hunde
    const up=ia>=0?e3(ia/0.18):0, flip=ss(0.15,0.5,ia), dive=ss(0.4,0.75,ia);
    scarab.visible=ia>=-0.04&&ia<0.8;
    scarab.position.set(TX+0.3,-0.6+2.4*up-2.8*dive,0.65);
    scarab.rotation.set(-0.25,0.3,0.9-0.55*up+0.6*flip);
    scarab.scale.setScalar(1.75); sm.forEach(u=>{u.uQ.value=-1+1.3*ss(0.55,0.8,ia);u.uK.value=0.15*hitE(ia,6);});
    spark.pose(ia,tmp.set(TX,0.9,0.3),1.05); ring.pose(ia,TX,0,0.45,1);
    // escudo dorado del lanzador
    const is=te-TI; shield.visible=is>=0&&te<END; shu.uP.value=e3(is/0.3); shu.uA.value=0.85*fade;
    shu.uF.value=hitE(is,6); shu.uD.value=-0.1+1.1*ss(END-0.55,END,te); sring.pose(is,-3.7,0,0.45,1);
    // sello de cura tachada
    const isl=te-1.15; seal.visible=isl>=0; towardCam(seal.position,tmp.set(TX,2.35,0),0.3); billboard(seal);
    seal.scale.setScalar(Math.max(0.001,0.7+0.5*e3(isl/0.2)-0.1*e3((isl-0.2)/0.2))); set(seal,-0.1+1.1*ss(END-0.45,END,te),isl>=0?1:0);
    seal.material.uniforms.uK.value=ss(0.12,0.5,isl);
    const hit=hitE(ia,4);
    target.position.y=0.45*Math.sin(Math.PI*cl(ia/0.4))*(ia>=0?1:0); target.rotation.z=-0.25*hit*Math.cos(ia*12);
    target.scale.set(1-0.06*hit,1+0.1*hit,1-0.06*hit); glowOf(target,COL.set("#ffcf5c"),0.4*hit);
    glowOf(caster,COL.set("#ffcf5c"),0.25*hitE(is,5));
    if(te<TT){o.g.copy(CB);o.gs=0.6;o.ga=0.06;o.li=1;}
    else if(ia<0){o.g.set(X0+cl((te-TT)/(TI-TT))*LEN,0.3,0);o.gs=0.9;o.ga=0.12;o.li=2;}
    else{o.g.set(TX,1.0,0);o.gs=1.6+2.4*Math.min(ia,0.5);o.ga=Math.exp(-ia*6)*0.4+0.03*fade;o.li=6*Math.exp(-ia*4);}
    o.ia=ia; o.c.set(TX,1.0,0); o.shake=0; o.dist=0.8; o.flash=0.6;
  };
}},ZONES));

// =====================================================================
// 5 · SNAIL SHELL (aliado) — una espiral de miel se dibuja en la espalda; placas de concha viajan en hélice hasta el
//     aliado y una concha de caracol (espiral logarítmica, nácar y miel) se cierra a su espalda dentro de una cúpula
//     ámbar (escudo 60). Un charco de baba azul late a sus pies: quien lo golpee cuerpo a cuerpo quedará lento. ti 0,9 s
// =====================================================================
defs.push(Object.assign({key:"sty_ieSnailShell",name:"Snail Shell (estilizado)",pa:2,dur:2.3,ti:0.9,pal:P_SNAIL,tier:2,stylized:true,receiver:'target',
  phases:[["Espiral",0],["Envío",0.2],["Concha",0.55],["Sellado",0.9],["Guardia",1.3],["Fin",1.95]],
build(a){
  const L=a.L,TI=0.9,TE=0.2,TC2=0.55,END=2.3;
  // espiral de pincel en la espalda del lanzador
  const SPIR=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float sp=abs(fract((log(max(r,.02))*1.6-an/6.2832))-.5);float m=smoothstep(.12,.04,sp)*smoothstep(1.,.85,r)*step(r,uP*1.05)*smoothstep(.02,.1,r);
   if(m<.02)discard;gl_FragColor=vec4(styRampOf(${HONEY},.5+.4*(1.-r)),m*uA);}`;
  const spir=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),S.mat(SPIR,{},{mode:'energy',depthTest:false})); L.mesh.add(spir);
  // la concha: espiral sobre una esfera aplastada (nácar con bandas de miel), detrás del aliado
  const SHELLB=`vec2 q=vec2(vP.x,vP.y)/.5;float r=length(q);float an=atan(q.y,q.x);
   float sp=fract(log(max(r,.03))*.55-an/6.2832);float ridge=smoothstep(.0,.06,sp)*smoothstep(1.,.9,sp);
   base=mix(${SHELLC},${HONEY},smoothstep(.35,.7,sp));base=mix(base,${lin("#5a2410")},(1.-ridge)*.85);
   base=mix(base,${CRIMSON},smoothstep(.85,1.,sp)*.6);lb=.04;glow=ridge*.12;`;
  const shellMat=S.mat(SOLID(SHELLB,{hot:'uC1*.7',rim:.45,nzs:'vec2(2.,1.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const shell=new THREE.Mesh(new THREE.SphereGeometry(0.5,40,24).scale(1,1,0.55),shellMat); L.mesh.add(shell);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(0.44,0.06,10,40),S.mat(SOLID(`base=${SHELLC};lb=.1;`,{rim:.4}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'}));
  L.mesh.add(lip);
  const shield=dome(L.mesh,1.15,HONEY,`smoothstep(.05,0.,.5-abs(fract(h*4.-uT*.4)-.5))*.5`); shield.position.set(TX,0,0);
  // baba de guardia a los pies (lento a quien ataque cuerpo a cuerpo)
  const SLIME=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.9+.11).r;
   float ring=smoothstep(.26,.0,abs(r-.72-(n-.5)*.15))*smoothstep(1.,.9,r);float pulse=.6+.4*sin(uT*7.-r*8.);
   float m=ring*pulse+smoothstep(.75,.5,r)*.12;if(m<.02)discard;float er=styErode(n*.7+m*.3,uP,.12);
   gl_FragColor=vec4(styRampOf(${SLOWB},.35+.4*ring),m*er*uA*.75);}`;
  const slime=groundPlane(2.6,TX,0.024,S.mat(SLIME)); L.decal.add(slime);
  const ring=S.groundRing(L.decal,2.8), ring2=S.groundRing(L.decal,2.2), spark=S.hitSpark(L.mesh,1.2,{seed:0.71});
  const K=VV+QB+`const float TI=${f(TI)};const float TE=${f(TE)};const vec3 CB=${v3(CB)};const vec3 T=vec3(${f(TX)},1.1,0.);`;
  // placas de concha en hélice hacia el aliado
  S.pts(L.part,26,K+`void main(){float s=TE+aSeed.x*.25;float k=clamp((uT-s)/.38,0.,1.);float an=aSeed.z*6.2832+k*9.;
   vec3 p=qb(CB,mix(CB,T,.5)+vec3(0.,1.3,0.),T,k)+vec3(0.,cos(an),sin(an))*.32*(1.-k*.6);
   vA=(uT>s&&k<1.)?1.:0.;vK=0.;vR=an;put(p,.26+.08*aSeed.w);}`,S.MATTER_FS(C.ring,{relief:4,col:SHELLC,bias:.05}));
  S.pts(L.part,30,K+`void main(){float s=TE+aSeed.x*.3;float k=clamp((uT-s)/.38,0.,1.);float an=aSeed.z*6.2832+k*9.;
   vec3 p=qb(CB,mix(CB,T,.5)+vec3(0.,1.3,0.),T,k)+vec3(0.,cos(an),sin(an))*.28;
   vA=(uT>s&&k<1.)?.8:0.;vK=k;vR=an;put(p,.16);}`,S.ENERGY_FS(C.spark,{gain:.8}),{mode:'energy'});
  // gotas de baba azul que orbitan a los pies durante la guardia
  S.pts(L.part,16,K+`void main(){float s=1.2+aSeed.x*.2;float an=aSeed.z*6.2832+uT*2.4;float rad=.85+.15*sin(uT*4.+aSeed.w*6.);
   vec3 p=vec3(${f(TX)}+cos(an)*rad,.12+.1*abs(sin(uT*5.+aSeed.y*6.)),sin(an)*rad);float age=clamp((uT-s)/.6,0.,1.);
   vA=uT>s?smoothstep(0.,1.,age)*(1.-smoothstep(1.95,2.25,uT)):0.;vK=smoothstep(1.95,2.25,uT);vR=0.;put(p,.16+.06*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:SLOWB}));
  const su=[shellMat.uniforms,lip.material.uniforms], du=shield.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, fade=1-ss(END-0.4,END,te), out=ss(1.95,2.25,te);
    // espiral en la espalda
    spir.visible=te<0.75; towardCam(spir.position,CB,0.3); billboard(spir,-te*2); spir.scale.setScalar(0.8+0.4*e3(te/0.2));
    set(spir,e3(te/0.2),1-ss(0.4,0.75,te));
    // concha: crece detrás del aliado y se cierra al sellar
    const g=e3((te-TC2)/(TI-TC2)), clamp1=ia>=0?1+0.12*Math.exp(-ia*9)*Math.cos(ia*20):1;
    shell.visible=lip.visible=te>=TC2&&te<END;
    shell.position.set(TX+0.6,1.3+0.05*Math.sin(te*3),-0.35); shell.rotation.set(0.05,0.55,0.5+0.5*(1-g));
    shell.scale.setScalar(Math.max(0.001,1.85*g*clamp1)); lip.position.copy(shell.position).add(tmp.set(0.05,0,0.16));
    lip.rotation.copy(shell.rotation); lip.scale.setScalar(Math.max(0.001,1.85*g*clamp1));
    su.forEach(u=>{u.uQ.value=-1+1.6*out;u.uK.value=0.2*hitE(ia,5);});
    shield.visible=ia>=-0.05&&te<END; du.uP.value=e3((ia+0.05)/0.3); du.uA.value=0.75*fade; du.uF.value=hitE(ia,6);
    du.uD.value=-0.1+1.1*out;
    set(slime,e3((te-1.2)/0.35),te>=1.2?1:0); slime.material.uniforms.uP.value=-0.1+1.1*out;
    ring.pose(ia,TX,0,0.45,1); ring2.pose(te-1.3,TX,0,0.5,0.8); spark.pose(ia,tmp.set(TX,1.4,0.2),0.9);
    const hit=hitE(ia,5);
    target.scale.set(1+0.05*hit,1-0.06*hit,1+0.05*hit); glowOf(target,COL.set("#ffc27a"),0.35*hit+0.12*ss(0.9,1.2,te)*fade);
    if(te<TE){o.g.copy(CB);o.gs=0.7;o.ga=0.1;o.li=1.5;}
    else if(ia<0){o.g.set(TX,1.1,0);o.gs=1.1;o.ga=0.14;o.li=2.5;}
    else{o.g.set(TX,1.1,0);o.gs=1.4+1.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*6)*0.3+0.05*fade;o.li=4*Math.exp(-ia*4)+0.5*fade;}
    o.ia=ia; o.c.set(TX,1.1,0); o.shake=0; o.dist=0.5; o.flash=0.3;
  };
}},{zoneCaster:0.6,zoneTarget:1.2}));

// =====================================================================
// 6 · SPIKY WING (2 PA) — dos élitros carmesí tornasolados se abren en la espalda con las alas membranosas zumbando
//     debajo; de sus bordes sale una andanada de 8 púas de quitina que se clavan en el rival una tras otra. Las
//     esquirlas azules del escudo saltan con el primer golpe (+25 % contra escudo). ti 0,8 s
// =====================================================================
defs.push(Object.assign({key:"sty_ieSpikyWing",name:"Spiky Wing (estilizado)",pa:2,dur:2.0,ti:0.8,pal:P_SPIKY,tier:2,stylized:true,
  phases:[["Tensión",0],["Apertura",0.38],["Andanada",0.52],["Impacto",0.8],["Esquirlas",1.05],["Fin",1.6]],
build(a){
  const L=a.L,TI=0.8,TO=0.38,TA=0.52,END=2.0,N=8,DT=0.022,FL=TI-TA;
  // élitros: media cáscara alargada con bandas tornasol, borde oscuro y púas en el canto
  const ELY=`float e=smoothstep(.0,.22,vUv.y);float edge=1.-smoothstep(.75,.95,abs(vUv.x*2.-1.));
   float ir=.5+.5*sin(vUv.y*14.+vUv.x*6.);base=mix(${CRIMD},${CRIMSON},.45+.4*ir);base=mix(base,${lin("#ff9a5a")},smoothstep(.85,1.,ir)*.35);
   base=mix(base,${CRIMD},(1.-edge)*.6);lb=.04;glow=smoothstep(.8,1.,ir)*.15;`;
  const elyMat=S.mat(SOLID(ELY,{hot:'uC1',rim:.45,nzs:'vec2(2.,3.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const pivots=[0,1].map(i=>{const g=new THREE.Group();L.mesh.add(g);
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.5,24,12,0,Math.PI,0,Math.PI).scale(0.26,0.9,0.5).translate(0,-0.85,0),elyMat);g.add(m);return g;});
  const MEM=`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.8));if(d>1.)discard;
   float vein=smoothstep(.05,0.,abs(fract(atan(p.y,p.x+1.)*3.)-.5)*d)*.5;float rim=smoothstep(.7,.98,d);
   gl_FragColor=vec4(styRampOf(${lin("#ff8a6a")},.3+.4*rim+.3*vein),(.12+.4*rim+.35*vein)*uA);}`;
  const mem=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.8),S.mat(MEM,{},{mode:'energy',side:THREE.DoubleSide}));L.mesh.add(m);return m;});
  const sparks=[0,1,2].map(i=>S.hitSpark(L.mesh,1.1+0.25*(i===0),{seed:0.2+i*0.27})), ring=S.groundRing(L.decal,2.6);
  const K=VV+QB+`const float TA=${f(TA)};const float TI=${f(TI)};const float DT=${f(DT)};const float FL=${f(FL)};const vec3 CB=${v3(CB)};
   // púa i: sale del canto de un élitro, vuela en curva y se clava en el pecho del rival
   vec3 dart(float i,float tt,out float k,out vec3 dir){float s=TA+i*DT;k=clamp((tt-s)/FL,0.,1.);float side=mod(i,2.)<.5?1.:-1.;
    vec3 a=CB+vec3(-.35,.5+.12*i,side*(.6+.04*i));vec3 e=vec3(${f(TX-0.15)},.75+.11*i,side*.12*(i-3.5)*.15);
    vec3 m=mix(a,e,.45)+vec3(0.,1.1+.15*i,side*1.2);vec3 p=qb(a,m,e,k);dir=normalize(qb(a,m,e,min(k+.03,1.))-qb(a,m,e,max(k-.03,0.)));
    return p;}`;
  // púas: conos de quitina carmesí con punta clara; vuelan por la misma curva que su estela y quedan clavadas
  const SPIKE=`float tip=smoothstep(.15,.45,vP.y);base=mix(${CRIMD},${CRIMSON},.4+.5*(1.-tip));base=mix(base,${lin("#ffd0a0")},smoothstep(.3,.42,vP.y)*.8);lb=.02;`;
  const spikeMat=S.mat(SOLID(SPIKE,{rim:.4}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const darts=[];for(let i=0;i<N;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.95,8).translate(0,0,0),spikeMat);L.mesh.add(m);darts.push(m);}
  const YA=new THREE.Vector3(0,1,0), qa=V3(0,0,0), qm=V3(0,0,0), qe=V3(0,0,0), dv=V3(0,0,0);
  const qbJ=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
  const dartPath=(i)=>{const side=i%2===0?1:-1;qa.set(CB.x-0.35,CB.y+0.5+0.12*i,side*(0.6+0.04*i));
    qe.set(TX-0.15,0.75+0.11*i,side*0.12*(i-3.5)*0.15);qm.copy(qa).lerp(qe,0.45).add(tmp2.set(0,1.1+0.15*i,side*1.2));};
  // estelas de las púas
  S.pts(L.part,N*10,K+`void main(){float i=floor(aSeed.x*${f(N)});float lag=aSeed.y*.08;float k;vec3 dir;vec3 p=dart(i,uT-lag,k,dir);float s=TA+i*DT;
   vA=(uT-lag>s&&k<1.)?(1.-aSeed.y)*.7:0.;vK=aSeed.y;vR=0.;put(p,.26*(1.-aSeed.y*.6));}`,S.ENERGY_FS(C.spark,{gain:.7}),{mode:'energy'});
  // esquirlas de quitina y del escudo
  S.pts(L.part,30,K+`void main(){float i=floor(aSeed.x*${f(N)});float s=TI+i*DT;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(-1.4+cos(an)*1.4,1.4+2.*aSeed.y,sin(an)*1.6);vec3 p=vec3(${f(TC.x)},${f(TC.y)},0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=t*10.+aSeed.w*6.;put(p,.15+.07*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:CRIMD}));
  S.pts(L.part,22,K+`void main(){float s=TI;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(1.5+1.5*aSeed.w),.8+2.*aSeed.y,sin(an)*(1.5+1.5*aSeed.w));vec3 p=vec3(${f(TC.x+0.1)},${f(TC.y)},0.)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=t*12.+aSeed.w*6.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:2,col:SHIELD,bias:.15}));
  const eu=elyMat.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, open=ss(TO,TA,te)*(1-ss(1.2,1.6,te)), tense=ss(0,TO,te), fade=1-ss(END-0.4,END,te);
    caster.rotation.z=0.08*tense*(1-ss(TO,TA,te))-0.08*ss(TA,TA+0.08,te)*(1-ss(TA+0.1,TI,te));
    caster.scale.set(1+0.04*tense*(1-open),1-0.05*tense*(1-open),1);
    pivots.forEach((g,i)=>{const sg=i?1:-1;g.position.set(CB.x+0.05,CB.y+0.35,sg*0.12);
      g.rotation.set(sg*(0.15+1.15*open),0,0.6-0.25*open+0.04*Math.sin(te*40)*open);g.scale.setScalar(1.9);g.visible=te<1.7;});
    eu.uQ.value=-1+1.6*ss(1.25,1.65,te); eu.uK.value=0.1+0.6*ss(TA-0.03,TA+0.03,te)*(1-ss(TA+0.05,TA+0.2,te));
    mem.forEach((m,i)=>{const sg=i?1:-1,fl=0.5+0.5*Math.sin(te*90+i);m.position.set(CB.x-0.45,CB.y+0.15,sg*0.55);
      m.rotation.set(sg*(0.7+0.4*fl),0.2,0.3);m.visible=open>0.01;set(m,0,open*(0.5+0.5*fl));});
    for(let i=0;i<N;i++){const m=darts[i],s0=TA+i*DT,k=cl((te-s0)/FL),ih=te-(s0+FL);dartPath(i);
      qbJ(qa,qm,qe,k,m.position);qbJ(qa,qm,qe,Math.min(k+0.03,1),tmp3);qbJ(qa,qm,qe,Math.max(k-0.03,0),dv);dv.subVectors(tmp3,dv).normalize();
      m.quaternion.setFromUnitVectors(YA,dv);
      if(ih>0){m.position.addScaledVector(dv,0.32);m.position.x+=0.03*Math.sin(ih*60)*Math.exp(-ih*6);const fl=Math.max(ih-0.55,0);m.position.y-=4*fl*fl;}
      m.visible=te>s0&&ih<0.9&&m.position.y>0.05;}
    spikeMat.uniforms.uQ.value=-1+1.5*ss(TI+0.45,TI+0.85,te);
    sparks.forEach((s,i)=>s.pose(ia-i*3*DT,tmp.set(TC.x,TC.y+0.15*i,0.1*(i-1)),1));
    ring.pose(ia,TX,0,0.45,1);
    let kb=0; for(let i=0;i<N;i++){const ih=te-(TI+i*DT); if(ih>=0)kb+=0.05*Math.exp(-ih*10);}
    target.position.x=TX+Math.min(kb,0.3); target.rotation.z=-kb*1.1; glowOf(target,COL.set("#ff6f5e"),0.4*hitE(ia,4));
    if(te<TA){o.g.copy(CB);o.gs=0.6+0.6*open;o.ga=0.06+0.12*open;o.li=1+2*open;}
    else if(ia<0){o.g.lerpVectors(CB,TC,cl((te-TA)/FL));o.gs=1;o.ga=0.14;o.li=2.5;}
    else{o.g.copy(TC);o.gs=1.4+2*Math.min(ia,0.5);o.ga=Math.exp(-ia*6)*0.38+0.03*fade;o.li=5*Math.exp(-ia*4);}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.7; o.flash=0.6;
  };
}},ZONES));

VFX.module("Estilizado · Bicho · Espalda",defs);
})();

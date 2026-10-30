// =====================================================================
// ESTILIZADO · PLANTA · CUERNOS (Hito 101) — las 8 cartas de cuerno de Planta rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_pcBamboo, sty_pcBeech…); el puente las usa con el estilo nuevo encendido.
// Mismos dur / ti / nivel / fases que mod-planta-cuernos.js, así que el daño llega igual. El concepto sigue la carta
// (PartCards.js): Persimmon es daño a un enemigo y Mandarine da PA/PM a un aliado (los originales eran curas).
// Los efectos «de cabeza» arrancan en la zona de las puntas de los cuernos (≈ −3,55, 2,05) sin malla anatómica.
// Cartas a distancia: zoneCaster/zoneTarget pequeños para que a 1 casilla no se encojan (Hito 99).
// Este módulo es autónomo: no necesita mod-planta-cuernos.js ni el piloto (Watermelon es una copia de sty_sandia).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas propias (nombres únicos: no pisan las de los módulos originales)
VFX.palette("Cuerno Bambú",["#b8d451","#2c6e22"]);
VFX.palette("Cuerno Roble",["#8ff0a0","#1e7046"]);
VFX.palette("Cuerno Mandarina",["#ffc94d","#e8611a"]);
VFX.palette("Cuerno Caqui",["#ffb04d","#c9411a"]);
VFX.palette("Cuerno Rosa",["#ff9cbd","#c2214f"]);
VFX.palette("Cuerno Fresa",["#ffb9cf","#e0325c"]);
if(!VFX.PALETTES?.["Sandía"])VFX.palette("Sandía",["#ff5470","#2e9e46"]);
VFX.palette("Cuerno Cactus",["#d8f27a","#2a7a3a"]);

const EARTH="vec3(.6,.48,.34)";            // igual que el piloto (polvo claro)
const WOOD="vec3(0.214,0.089,0.03)";
const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const out3=k=>1-Math.pow(1-cl(k),3);
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const HEADP=V3(-3.55,2.05,0);           // puntas de los cuernos
const TC=V3(3.15,1.2,0);                // pecho del objetivo
const AP=ALLY_POS[0];                   // aliado del laboratorio
const ZONES={zoneCaster:0.6,zoneTarget:1.0}; // a 1 casilla el efecto conserva su tamaño
const arcJ=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const ARC=`vec3 arc(vec3 s,vec3 e,float h,float k){return mix(s,e,k)+vec3(0.,4.*h*k*(1.-k),0.);}`;

// ---------- materiales del módulo ----------
// fruta / masa / crema: esfera iluminada en 3 bandas con degradado uCb (abajo) → uCa (arriba), hoyuelos de piel,
// borde de sol, brillo duro; uEr erosiona (discard), uGl brillo propio
const FRUIT_FS=`uniform vec3 uCa;uniform vec3 uCb;uniform float uEr;uniform float uGl;uniform float uDim;
void main(){vec3 q=normalize(vP);vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 float an=atan(q.z,q.x);vec4 ns=styNoise(vec2(an*.3183+.5,q.y*.5+.5)*1.5);
 if(uEr>0.&&ns.r*.8+.2*ns.a<uEr)discard;
 vec3 col=mix(uCb,uCa,smoothstep(-.7,.8,q.y));col*=1.-uDim*smoothstep(.55,.75,ns.a)*.2;
 vec3 c=styRampOf(col,.3+.55*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.25*smoothstep(.6,.7,fr)*step(.5,l);
 float sp=smoothstep(.95,.97,dot(reflect(-L,n),normalize(vV)));c+=vec3(1.)*sp*.4;
 c+=uCa*uGl;
 gl_FragColor=vec4(c,1.);}`;
const fruitMat=(ca,cb,dim=0)=>S.mat(FRUIT_FS,{uCa:{value:new THREE.Color(ca)},uCb:{value:new THREE.Color(cb)},uEr:{value:0},uGl:{value:0},uDim:{value:dim}},{mode:'solid'});
// madera: vetas a lo largo del eje local (uAx 0 = y, 1 = x), musgo de la paleta, vetas que brillan (uGl), erosión
const BARK_FS=`uniform float uEr;uniform float uGl;uniform float uAx;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float along=mix(vP.y,vP.x,uAx);vec2 pp=mix(vP.xz,vP.yz,uAx);float an=atan(pp.y,pp.x);
 vec4 ns=styNoise(vec2(an*.6366+.5,along*.35+.2));
 float groove=smoothstep(.6,.72,ns.b);
 if(uEr>0.&&ns.r*.7+.3*ns.a<uEr)discard;
 vec3 wood=mix(${WOOD},vec3(0.073,0.03,0.01),groove);
 vec3 c=styRampOf(wood,.3+.55*l-.12*groove)*styTint(l);
 c=mix(c,styRampOf(uC2,.45+.45*l)*styTint(l),smoothstep(.68,.8,ns.g)*.55);
 c+=uC1*uGl*(.25+groove*1.4);
 gl_FragColor=vec4(c,1.);}`;
// grieta radial en el suelo (materia); uP = crecimiento, uEr = erosión
const CRACK_FS=`uniform float uEr;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float k=fract(an/6.2832*7.+styNoise(vUv*.6).r*.7);float line=smoothstep(.1,.0,abs(k-.5)*(1.+2.5*r))*step(r,.95*uP+.05)*smoothstep(1.,.25,r);
 float n=styNoise(vUv*.9+.2).g;float pit=smoothstep(.36,.16,r+(n-.5)*.2)*uP;
 float m=max(line,pit*.85);if(m<.02)discard;
 float er=styErode(n*.6+m*.4,uEr,.12);
 gl_FragColor=vec4(mix(vec3(0.01,0.006,0.003),vec3(0.095,0.051,0.022),pit*n)*mix(vec3(1.),uShadeCol,.15),m*er*uA*.9);}`;
const crackDecal=(parent,size,x,z=0)=>{const m=groundPlane(size,x,0.026,S.mat(CRACK_FS,{uEr:{value:0}},{mode:'matter'}));m.position.z=z;parent.add(m);return m;};
const setCrack=(m,grow,er,a)=>{m.material.uniforms.uP.value=grow;m.material.uniforms.uEr.value=er;m.material.uniforms.uA.value=a;m.visible=a>0.001;};
// flecha hacia arriba (energía): mejora de PA / PM / daño
const CHEVUP_FS=S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y-.16+abs(q.x)*.95);
 float m=smoothstep(.1,.055,d)*step(abs(q.x),.4);float a=m*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(mix(uC2,uC1,.3),.55+.45*smoothstep(.1,0.,d))*1.45,a);}`;
// estela fina de energía a lo largo de +x (uv.x = 1 en la cabeza)
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.25+.75*u;float m=smoothstep(w,w*.4,v)*u*u;
 float n=styNoise(vec2(u*.7-uT*2.,vUv.y*.5)).b;float er=styErode(n*.5+.5*u,.2,.15);
 if(m*er<.01)discard;gl_FragColor=vec4(styRamp(.55+.45*u)*1.25,m*er*uA);}`;
const streakMesh=(parent,w,mat)=>{const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0);const grp=new THREE.Group();
  const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat);b.rotation.x=Math.PI/2;grp.add(a,b);parent.add(grp);return grp;};
// pose de una estela: de p0 a p1 (cola → cabeza)
const poseStreak=(s,p0,p1,vis)=>{tmp2.copy(p1).sub(p0);const ln=tmp2.length();s.visible=vis&&ln>0.01;if(!s.visible)return;
  s.position.copy(p1);s.quaternion.setFromUnitVectors(XA,tmp2.normalize());s.scale.set(ln,1,1);};
const defs=[];

// =====================================================================
// 1 · BAMBOO SHOOT — una raíz abre una grieta bajo tierra hasta el rival; el suelo se hincha y brotan cuatro cañas
//     de bambú que lo lanzan al aire entre hojas y terrones; las cañas se hunden y el rival cae con polvo.
// =====================================================================
const CANE_FS=`uniform float uGl;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float seg=fract(vP.y/.58+.35);float node=smoothstep(.07,0.,seg)+smoothstep(.93,1.,seg);
 float an=atan(vP.z,vP.x);float fib=styNoise(vec2(an*.6,vP.y*.2)).b;
 vec3 col=mix(uC2,uC1*.85,.25+.4*fib);col=mix(col,uC2*.45,node);
 vec3 c=styRampOf(col,.22+.5*l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.22*smoothstep(.6,.7,fr)*step(.5,l);
 c+=uC1*uGl*node*1.4;
 gl_FragColor=vec4(c,1.);}`;
const HUSK_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float an=atan(vP.z,vP.x)/6.2832;float row=vP.y*7.;float u=fract(an*5.+floor(row)*.5);float v=fract(row);
 float edge=smoothstep(.08,0.,abs(abs(u-.5)*2.-(1.-v)));
 vec3 col=mix(vec3(0.342,0.319,0.055),vec3(0.107,0.084,0.013),edge);
 gl_FragColor=vec4(styRampOf(col,.3+.55*l)*styTint(l),1.);}`;
const ROOT_FS=`uniform float uEr;uniform float uL;
void main(){float u=vUv.x;float w=vUv.y-.5-(sin(u*17.+1.3)*.12+(styNoise(vec2(u*2.,.3)).r-.5)*.22);
 if(u>uP)discard;
 float line=smoothstep(.07,.025,abs(w));float lip=smoothstep(.2,.08,abs(w))*(1.-line);
 float n=styNoise(vec2(u*5.,vUv.y*.8)).g;
 if(uL>.5){float fr=exp(-(uP-u)*14.);float m=line*fr;if(m<.01)discard;gl_FragColor=vec4(styRamp(.7+.3*fr)*1.4,m*uA);return;}
 float m=line+lip*.55*smoothstep(.3,.7,n);if(m<.02)discard;
 float er=styErode(n*.5+.5*m,uEr,.1);
 vec3 c=mix(vec3(0.133,0.078,0.033),vec3(0.009,0.005,0.003),line);
 gl_FragColor=vec4(c*mix(vec3(1.),uShadeCol,.15),m*er*uA*.9);}`;
defs.push({key:"sty_pcBamboo",name:"Bamboo Shoot (estilizado)",dur:2.2,ti:0.72,tier:2,pal:"Cuerno Bambú",stylized:true,...ZONES,
  phases:[["Raíz",0],["Tensión",0.5],["Brote",0.72],["Vuelo",0.82],["Caída",1.35],["Calma",1.7]],
build(a){
  const L=a.L,TR=0.15,TF=0.5,TI=0.72,TS=1.05,TSE=1.4,X=3.4,G0=-3.2,HC=1.4,HT=0.45,TL=1.38;
  const caneMat=S.mat(CANE_FS,{uGl:{value:0}},{mode:'solid'}), huskMat=S.mat(HUSK_FS,{},{mode:'solid'});
  const cylG=new THREE.CylinderGeometry(0.2,0.23,HC,20,1,false).translate(0,HC/2,0);
  const tipG=new THREE.ConeGeometry(0.2,HT,20).translate(0,HC+HT/2,0);
  const ST=[[X,0,1,0,0,0],[X-0.66,0.42,0.6,0.05,0.22,0.16],[X+0.5,-0.5,0.5,0.09,-0.24,-0.18],[X-0.25,-0.72,0.4,0.13,0.15,-0.25]].map(([x,z,s,d,rz,rx])=>{
    const g=new THREE.Group();g.add(new THREE.Mesh(cylG,caneMat));g.add(new THREE.Mesh(tipG,huskMat));
    g.userData={x,z,s,d,rz,rx};L.mesh.add(g);return g;});
  const LEN=X-G0;
  const rootM=groundPlane(LEN,G0+LEN/2,0.024,S.mat(ROOT_FS,{uEr:{value:0},uL:{value:0}},{mode:'matter'}),0.9); L.decal.add(rootM);
  const rootE=groundPlane(LEN,G0+LEN/2,0.03,S.mat(ROOT_FS,{uEr:{value:0},uL:{value:1}},{mode:'energy'}),0.9); L.decal.add(rootE);
  const crack=crackDecal(L.decal,3.0,X);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.61,toCam:0.5});
  const ring=S.groundRing(L.decal,3.2), ring2=S.groundRing(L.decal,2.4);
  const K=`const float TR=${f(TR)};const float TF=${f(TF)};const float TI=${f(TI)};const float X=${f(X)};const float TL=${f(TL)};
  float xf(float t){float k=clamp((t-TR)/(TF-TR),0.,1.);return ${f(G0)}+${f(LEN)}*k;}`;
  // savia que gotea de los cuernos al suelo y aviva la raíz
  S.pts(L.part,10,VV+K+`void main(){float s=aSeed.x*TR;float age=(uT-s)/.2;float k=clamp(age,0.,1.);
   vec3 p=mix(vec3(-3.55,2.05,(aSeed.y-.5)*.4),vec3(${f(G0)},.05,0.),k*k);vR=0.;vK=0.;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.1+.05*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // terrones que saltan en el frente de la grieta
  S.pts(L.part,20,VV+K+`void main(){float s=TR+aSeed.x*(TF-TR);float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(xf(s),.08,(aSeed.z-.5)*.35)+vec3((aSeed.w-.5)*.6*t,t*(1.4+aSeed.w)-4.5*t*t,(aSeed.z-.5)*.8*t);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28+t*5.;
   put(p,(.2+.12*aSeed.y)*(.8+.4*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH}));
  // tensión: guijarros que tiemblan sobre el suelo hinchado
  S.pts(L.part,12,VV+K+`void main(){float an=aSeed.x*6.2832;float rad=.35+.6*aSeed.y;float on=step(TF,uT)*step(uT,TI);
   vec3 p=vec3(X+cos(an)*rad,.06+.05*abs(sin(uT*50.+aSeed.z*20.)),sin(an)*rad);
   vA=on;vK=.2;vR=aSeed.z*6.28;put(p,.13+.06*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  // hojas lanceoladas del brote: estallan y bajan revoloteando
  S.pts(L.part,26,VV+K+`void main(){float s=TI+.02+aSeed.x*.12;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 o=vec3(X+cos(an)*.3,1.3+aSeed.w*.6,sin(an)*.3);
   vec3 v=vec3(cos(an),1.3+aSeed.y,sin(an))*(1.4+1.2*aSeed.w);float d=1.-exp(-t*3.);
   vec3 p=o+v*d*.6+vec3(sin(t*6.+aSeed.x*9.)*.25,-.9*max(t-.25,0.),0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=an+t*(4.+3.*aSeed.y);
   put(p,.3+.12*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:-.12}));
  // terrones del reventón y polvo de la caída
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+aSeed.w),2.+2.*aSeed.y,sin(an)*(1.2+aSeed.w));
   vec3 p=vec3(X+cos(an)*.3,.1,sin(an)*.3)+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.22+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:EARTH}));
  S.pts(L.part,16,VV+K+`void main(){float s=(aSeed.x<.5?TI:TL)+aSeed.y*.06;float life=.55+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vec3(X,.12,0.)+vec3(cos(an),0.,sin(an)*.8)*(.4+.9*(1.-exp(-t*5.)))+vec3(0.,t*.45,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=an+t;put(p,(.36+.18*aSeed.z)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  const rise=(te,d)=>{const k=cl((te-TI-d)/0.11),h=1-Math.pow(1-k,3)+0.06*Math.sin(Math.PI*cl((te-TI-d-0.11)/0.25));
    return h*(1-ss(TS+d*0.6,TSE+d*0.6,te));};
  const HIT=V3(3.3,0.75,0.1);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.14*ss(0,TR,te)-0.22*ss(TR,TR+0.07,te)+0.08*ss(TR+0.15,TI,te);
    const k=cl((te-TR)/(TF-TR));
    const ra=ss(TR,TR+0.05,te)*(1-ss(1.0,1.6,te));
    for(const m of [rootM,rootE]){m.material.uniforms.uP.value=k;m.material.uniforms.uA.value=ra;m.visible=ra>0.001;}
    rootE.material.uniforms.uA.value=ra*(1-ss(TI,TI+0.2,te));
    rootM.material.uniforms.uEr.value=-0.1+1.1*ss(1.0,1.6,te);
    setCrack(crack,ss(TF-0.05,TI,te)*0.7+0.3*ss(TI,TI+0.1,te),-0.1+1.15*ss(1.5,2.15,te),te>TF-0.05?1:0);
    for(const g of ST){const u=g.userData,h=rise(te,u.d);g.visible=h>0.001;
      g.position.set(u.x,-HC*u.s*(1-h)*1.15,u.z);g.scale.set(u.s,u.s*(0.85+0.15*h),u.s);g.rotation.set(u.rx*h,0,u.rz*h);}
    caneMat.uniforms.uGl.value=0.6*hitE(ia,5)*(ia>=0?1:0);
    spark.pose(ia,HIT,1);
    ring.pose(ia,X,0,0.45); ring2.pose(te-TL,X,0,0.4,0.8);
    // el rival: lo levanta la caña, vuela y cae en TL
    let y=0;
    if(te>=TI&&te<TL){const u=(te-TI)/(TL-TI);y=1.7*4*u*(1-u)*(u<0.15?u/0.15*0.6+0.4:1);}
    const land=te>=TL?Math.exp(-(te-TL)*9):0;
    target.position.y=y; target.position.x=3.4+0.12*hitE(ia,4)*(ia>=0?1:0);
    target.rotation.z=te>=TI&&te<TL?-0.5*Math.sin(Math.PI*(te-TI)/(TL-TI)):0.12*land*Math.sin((te-TL)*30);
    if(ia<0){o.g.set(te<TF?(-3.2+6.6*k):X,0.25,0);o.gs=0.5+0.4*k;o.ga=0.12*ra;o.li=1+1.2*k;}
    else{o.g.set(X,1.0+y*0.5,0);o.gs=1.2+1.4*Math.min(ia,0.5);o.ga=0.28*Math.exp(-ia*10);o.li=4*Math.exp(-ia*5);}
    o.ia=ia; o.c.copy(HIT); o.shake=1.2; o.dist=0.8; o.flash=0.6;
  };
}});

// =====================================================================
// 2 · BEECH — un ariete de roble con forma de cuerna se forma sobre la cabeza entre hojas y sale disparado con estela
//     esmeralda; golpe pesado que astilla y agrieta el suelo; después crecen placas de corteza alrededor del Axie
//     que se entrelazan en un escudo con hojas, destellan al sellarse y se consumen (nivel 3)
// =====================================================================
defs.push({key:"sty_pcBeech",name:"Beech (estilizado)",dur:3.4,ti:0.72,tier:3,pal:"Cuerno Roble",stylized:true,...ZONES,
  phases:[["Ariete",0],["Embestida",0.42],["Impacto",0.72],["Fractura",0.9],["Regreso",1.0],["Ramas",1.35],["Escudo",2.1],["Disipación",2.8]],
build(a){
  const L=a.L,TD=0.42,TI=0.72,TQ=0.95,TB=1.35,TBF=2.1,TX=2.8,TE=3.35,CX=-3.7;
  const P0=V3(-3.05,2.25,0), P1=V3(2.55,1.15,0);
  const ramMat=S.mat(BARK_FS,{uEr:{value:0},uGl:{value:0},uAx:{value:1}},{mode:'solid',side:THREE.DoubleSide});
  const ram=new THREE.Group(); L.mesh.add(ram);
  // tronco que engorda hacia la testa (+x), dos ramas en cuerna y la testa nudosa
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.17,1.3,14,4).rotateZ(-Math.PI/2),ramMat); ram.add(trunk);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.34,16,12),ramMat); knob.position.x=0.68; knob.scale.set(0.8,1,1); ram.add(knob);
  for(const s of [1,-1]){const br=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.1,0.75,8,3).translate(0,0.37,0),ramMat);
    br.position.set(0.25,0.15*s,0.12*s); br.rotation.set(0.55*s,0,-0.55); ram.add(br);}
  const ringS=S.groundRing(L.decal,3.4), ringI=S.groundRing(L.decal,3.6), ringF=S.groundRing(L.decal,3.0);
  const crack=crackDecal(L.decal,3.6,3.4);
  const spark=S.hitSpark(L.mesh,2.3,{seed:0.27,toCam:0.5});
  const spark2=S.hitSpark(L.mesh,1.6,{seed:0.71,toCam:0.4});
  // escudo: dos filas de placas de corteza que suben del suelo enroscándose
  const plateMat=S.mat(BARK_FS,{uEr:{value:0},uGl:{value:0},uAx:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const plates=[];
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){
    const mid=i*Math.PI*2/5+row*Math.PI/5+0.3, len=1.15, y=0.4+row*0.55;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.62-row*0.06,0.68-row*0.05,0.6,8,1,true,mid-len/2,len),plateMat);
    L.mesh.add(m); plates.push({m,y,t:TB+(row*5+i)/10*0.55,spin:(i%2?1:-1)*1.4});
  }
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const float TB=${f(TB)};const float TBF=${f(TBF)};const float TX=${f(TX)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
  vec3 rp(float t){float k=clamp((t-TD)/(TI-TD),0.,1.);k=k*k*(1.5-.5*k);return mix(P0,P1,k)+vec3(0.,.45*k*(1.-k),0.);}`;
  // hojas que se arremolinan y forman el ariete
  S.pts(L.part,16,VV+K+`void main(){float s=aSeed.x*.25;float life=.22+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.2,0.));vec3 p=P0+d*mix(1.5,.2,age*age);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.75,1.,age);vR=aSeed.z*6.28+age*5.;put(p,.26+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:-.12}));
  // estela: hojas y astillas que se desprenden del ariete en vuelo + chispas esmeralda
  S.pts(L.part,22,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=rp(s)+vec3(-.4,0.,0.)+rnd()*.2+vec3(-.6*t,-1.2*t*t+.2*t,(aSeed.z-.5)*.8*t);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*7.;put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:-.15}));
  S.pts(L.part,18,VV+K+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.2+aSeed.y*.12;float age=(uT-s)/life;
   vec3 p=rp(s)+vec3(-.3,0.,0.)+rnd()*.25;vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy'});
  // impacto: astillas de madera, hojas y terrones
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.5,.75,0.))*(2.2+2.4*aSeed.z);vec3 p=vec3(2.85,1.15,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*(9.+6.*aSeed.y);put(p,.26+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:WOOD}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.9+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.9,0.))*(1.5+1.5*aSeed.z);vec3 p=vec3(2.9,1.2,0.)+v*(1.-exp(-t*3.))*.7+vec3(sin(t*6.+aSeed.x*9.)*.2,-.8*max(t-.2,0.),0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*5.;put(p,.28+.1*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:-.12}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.y*.06;float life=.6+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=vec3(3.4,.12,0.)+vec3(cos(an),0.,sin(an)*.8)*(.45+1.*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=an+t;put(p,(.4+.2*aSeed.z)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  // escudo: hojas que brotan sobre la corteza al sellarse, chispas y hojas que caen al deshacerse
  S.pts(L.part,24,VV+K+`void main(){float an=aSeed.x*6.2832;float row=step(.5,aSeed.y);vec3 b=vec3(${f(CX)}+cos(an)*.68,.4+row*.55+(aSeed.z-.5)*.4,sin(an)*.68);
   float s=TBF-.25+aSeed.w*.25;float g=clamp((uT-s)/.18,0.,1.);float fall=max(uT-TX-aSeed.z*.3,0.);
   vec3 p=b+vec3(cos(an),0.,sin(an))*(.08*g+.4*fall)+vec3(sin(fall*6.+aSeed.x*9.)*.15,-1.2*fall*fall-.3*fall,0.);
   vA=(uT>s&&p.y>0.&&fall<1.)?1.:0.;vK=smoothstep(.45,1.,fall);vR=an+1.57+fall*5.;put(p,(.24+.08*aSeed.w)*(g*g*(3.-2.*g)));}`,S.MATTER_FS(C.leaf,{relief:3,bias:-.1}));
  S.pts(L.part,20,VV+K+`void main(){float s=TBF+aSeed.x*.25;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(CX)}+cos(an)*.72,.2+aSeed.w*1.1+t*.8,sin(an)*.72);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.13+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  const HIT=V3(3.1,1.15,0), SH=V3(CX,1.0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0.05,TD,te), q=ss(TQ,1.3,te);
    caster.rotation.z=0.12*ss(0,TD,te)-0.3*ss(TD,TD+0.08,te)+0.18*ss(TD+0.1,TI+0.2,te)-0.05*ss(TB,TBF,te);
    // ariete
    ram.visible=te>0.04&&q<0.999;
    if(te<TD){ram.position.copy(P0);ram.position.y+=0.06*Math.sin(te*20);ram.rotation.set(0,0,-0.1);ram.scale.setScalar(Math.max(back(form/1)*0.9,0.001));}
    else if(te<TI){const k0=(te-TD)/(TI-TD),k=k0*k0*(1.5-0.5*k0);ram.position.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+0.45*k*(1-k),0);ram.rotation.set(k*2.5,0,-0.1-0.15*k);ram.scale.set(1.1,0.9,0.9);}
    else{const c=1-Math.exp(-ia*20);ram.position.set(P1.x+0.08*c,P1.y-0.25*ss(TI,1.2,te),0);ram.rotation.set(2.5,0,-0.25-0.35*ss(TI,1.2,te));ram.scale.set(1.1-0.35*c,0.9+0.2*c,0.9+0.2*c);}
    ramMat.uniforms.uGl.value=0.12*form*(1-ss(TI,TI+0.3,te))+(te>TD&&te<TI?0.15:0)+0.5*hitE(ia,8)*(ia>=0?1:0);
    ramMat.uniforms.uEr.value=q>0?-0.05+1.1*q:0;
    ringS.pose(te-0.05,CX,0,0.45,0.8);
    // impacto
    spark.pose(ia,HIT,1); spark2.pose(ia-0.08,tmp.set(3.25,0.5,0.25),0.8);
    ringI.pose(ia,3.4,0,0.5);
    setCrack(crack,out3(ia/0.25),-0.1+1.15*ss(TI+1.0,TI+2.0,te),ia>=0?1:0);
    const hit=hitE(ia,3.2)*(ia>=0?1:0);
    target.position.x=3.4+hit*0.8*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.45*Math.cos(ia*12);
    // escudo de corteza
    for(const p of plates){const k=cl((te-p.t)/0.3),g=back(k);
      p.m.visible=te>p.t&&te<TE; p.m.position.set(CX,p.y-0.9*(1-g),0); p.m.rotation.y=(1-k)*p.spin; p.m.scale.set(1+0.25*(1-g),Math.max(g,0.001),1+0.25*(1-g));}
    plateMat.uniforms.uGl.value=0.15*ss(TB,TBF,te)+0.55*hitE(te-TBF,5)*(te>=TBF?1:0)+0.1*Math.sin(te*5)*ss(TBF,TBF+0.3,te)*(1-ss(TX,TE,te));
    plateMat.uniforms.uEr.value=te>TX?-0.05+1.1*ss(TX,TE-0.05,te):0;
    ringF.pose(te-TBF,CX,0,0.5,1);
    const env=ss(TBF-0.2,TBF+0.1,te)*(1-ss(TX,TX+0.35,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*form*(1-ss(TI,TI+0.3,te))+0.2*env+0.5*hitE(te-TBF,5)*(te>=TBF?1:0);
    if(te<TD){o.g.set(P0.x+0.4,P0.y,0);o.gs=0.8*form;o.ga=0.06*form;o.li=1.5*form;}
    else if(te<TI){o.g.copy(ram.position);o.gs=1.0;o.ga=0.07;o.li=2;}
    else if(te<TB){o.g.copy(HIT);o.gs=1.6+3*Math.min(ia,0.5);o.ga=0.45*Math.exp(-ia*9);o.li=8*Math.exp(-ia*4.5);}
    else{const lk=te>=TBF?Math.exp(-(te-TBF)*6):0;o.g.set(CX,1.2,0);o.gs=2;o.ga=0.06*env+0.3*lk;o.li=1.2*env+3*lk+0.5;}
    if(te>=TBF){o.ia=te-TBF;o.c.copy(SH);o.shake=0.2;o.dist=0.5;o.flash=0;}
    else{o.ia=ia;o.c.copy(HIT);o.shake=1.8;o.dist=1.3;o.flash=0.7;}
  };
}});

// =====================================================================
// 3 · MANDARINE (aliado: +1 PA y +2 PM el próximo turno) — una mandarina brota en una ramita sobre la cabeza, vuela
//     en parábola hasta el aliado y estalla en zumo, cáscara y bruma cítrica; flechas doradas suben (PA) y un remolino
//     de motas le corre por los pies (PM)
// =====================================================================
const LEAFM_FS=`void main(){vec2 p=vUv-vec2(0.,.5);float w=.5*sin(3.14159*vUv.x)*(1.-.2*vUv.x);if(abs(p.y)>w*.95)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());float vein=smoothstep(.05,0.,abs(p.y));
 gl_FragColor=vec4(styRampOf(vec3(0.04,0.263,0.033)*(1.-vein*.3),.3+.55*l)*styTint(l),1.);}`;
defs.push({key:"sty_pcMandarine",name:"Mandarine (estilizado)",dur:2.4,ti:0.88,tier:2,pal:"Cuerno Mandarina",stylized:true,allies:1,...ZONES,
  phases:[["Brote",0],["Lanzamiento",0.38],["Estallido",0.88],["Impulso",1.15],["Fin",1.95]],
build(a){
  const L=a.L,TB=0.38,TI=0.88,TE=1.95;
  const S0=V3(-3.5,2.45,0), E0=V3(AP.x,1.55,AP.z), BP=V3(AP.x,1.35,AP.z);
  const fruit=new THREE.Group(); L.mesh.add(fruit);
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.3,28,20),fruitMat("#ffb33c","#e2561a",1)); body.scale.set(1.1,0.9,1.1); fruit.add(body);
  const leafG=new THREE.PlaneGeometry(0.34,0.16).translate(0.17,0,0), leafM=S.mat(LEAFM_FS,{},{mode:'solid',side:THREE.DoubleSide});
  const lf1=new THREE.Mesh(leafG,leafM); lf1.position.y=0.26; lf1.rotation.set(0.4,0.3,0.5); fruit.add(lf1);
  const lf2=new THREE.Mesh(leafG,leafM); lf2.position.y=0.26; lf2.rotation.set(-0.3,2.6,0.6); fruit.add(lf2);
  const shadow=S.contactShadow(L.decal,1.0);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.44,toCam:0.5});
  const ring=S.groundRing(L.decal,3.0), ring2=S.groundRing(L.decal,2.2);
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TE=${f(TE)};const vec3 S0=${v3(S0)};const vec3 E0=${v3(E0)};const vec3 BP=${v3(BP)};const vec3 AP=${v3(AP)};${ARC}`;
  // estela de ralladura: chispas naranjas en el vuelo
  S.pts(L.part,20,VV+K+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=arc(S0,E0,1.3,(s-TB)/(TI-TB))+rnd()*.12+vec3(0.,-.6*t,0.);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.11+.05*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // estallido: zumo (gotas), cáscara (esquirlas) y bruma cítrica (humo claro)
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.6+1.8*aSeed.z);vec3 p=BP+v*t+vec3(0.,-6.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.x,v.y-13.*t);vR=atan(vel.x,vel.y);put(p,.24+.12*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1'}));
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.5,0.))*(1.6+1.4*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*(8.+5.*aSeed.w);put(p,.22+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2'}));
  S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd());vec3 p=BP+d*(.25+.7*(1.-exp(-t*5.)))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28+t;put(p,(.5+.25*aSeed.z)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.18,col:'vec3(1.,.57,.17)'}));
  // PA: flechas que suben alrededor del aliado
  S.pts(L.part,12,VV+K+`void main(){float per=.5;float k=(uT-TI-.12)/per+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AP+vec3(cos(an)*(.55+.15*r.y),.2+age*1.7,sin(an)*(.55+.15*r.y));
   float on=step(TI+.12,uT)*(1.-smoothstep(TE-.15,TE+.1,uT));
   vA=sin(age*3.14159)*on*step(0.,k);vK=0.;vR=0.;put(p,.5+.12*r.z);}`,CHEVUP_FS,{mode:'energy'});
  // PM: remolino de motas a ras de suelo
  S.pts(L.part,22,VV+K+`void main(){float an=aSeed.x*6.2832+uT*5.5;float rad=.6+.15*sin(aSeed.y*20.+uT*3.);
   float on=smoothstep(TI+.1,TI+.3,uT)*(1.-smoothstep(TE-.2,TE+.1,uT));
   vec3 p=AP+vec3(cos(an)*rad,.08+.15*aSeed.z+.08*sin(an*3.),sin(an)*rad);vR=0.;vK=0.;
   vA=on*(.4+.6*fract(aSeed.x*7.+uT*1.3));put(p,.1+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0.02,TB-0.05,te);
    caster.rotation.z=0.1*ss(0,TB,te)-0.22*ss(TB,TB+0.07,te)+0.12*ss(TB+0.15,TI,te);
    fruit.visible=ia<0&&grow>0.001;
    if(te<TB){fruit.position.copy(S0);fruit.position.y+=0.03*Math.sin(te*25);fruit.rotation.set(0,te*2,0);
      fruit.scale.setScalar(Math.max(back(grow),0.001));}
    else{const k=(te-TB)/(TI-TB);arcJ(S0,E0,1.3,k,fruit.position);fruit.rotation.set(k*5,k*3,-k*7);fruit.scale.setScalar(1);}
    const fx=fruit.position.x, fz=fruit.position.z;
    shadow.pose(te<TB?AP.x:fx,te<TB?AP.z:fz,0.8,te>TB&&ia<0?0.6*ss(TB,TI,te):0);
    spark.pose(ia,BP,0.9);
    ring.pose(ia,AP.x,AP.z,0.45); ring2.pose(ia-0.4,AP.x,AP.z,0.5,0.8);
    const env=ss(TI,TI+0.15,te)*(1-ss(TE-0.2,TE+0.1,te));
    const al=allies[0].userData.m; al.emissive.copy(U.uC1.value); al.emissiveIntensity=0.45*hitE(ia,7)*(ia>=0?1:0)+0.15*env;
    if(ia<0){o.g.copy(fruit.position);o.gs=0.6*grow;o.ga=0.12*grow;o.li=1.2*grow;}
    else{o.g.copy(BP);o.gs=1.1+1.2*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*9)+0.05*env;o.li=3.2*Math.exp(-ia*5)+0.8*env;}
    o.ia=ia; o.c.copy(BP); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// 4 · PERSIMMON (daño a un enemigo) — un caqui madura en los cuernos (verde → naranja), sale en una parábola alta
//     dando vueltas y revienta sobre la cabeza del rival: pulpa gelatinosa que tiembla y gotea, el cáliz sale volando,
//     salpicaduras y mancha naranja en el suelo
// =====================================================================
const CALYX_FS=`void main(){vec2 p=(vUv-.5)*2.;float an=atan(p.y,p.x);float r=length(p);
 float lob=.55+.45*pow(abs(cos(an*2.)),1.5);if(r>lob)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 gl_FragColor=vec4(styRampOf(vec3(0.051,0.147,0.017)*(1.-.35*smoothstep(.2,0.,r)),.3+.55*l)*styTint(l),1.);}`;
const GEL_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec3 q=normalize(vP);float nz=styNoise(vec2(atan(q.z,q.x)*.32+.5,q.y*.5+.5)).r;
 float fr=abs(dot(n,normalize(vV)));float er=styErode(nz*.7+fr*.3,uEr,.08);if(er<.01)discard;
 vec3 c=styRampOf(uC1,.3+.55*l)*styTint(l);c+=uC1*.25*(1.-fr);
 float sp=smoothstep(.93,.96,dot(reflect(-stySunV(),n),normalize(vV)));c+=vec3(1.)*sp*.5;
 gl_FragColor=vec4(c,er*uA*.92);}`;
defs.push({key:"sty_pcPersimmon",name:"Persimmon (estilizado)",dur:2.4,ti:0.95,tier:2,pal:"Cuerno Caqui",stylized:true,...ZONES,
  phases:[["Fruto",0],["Lanzamiento",0.22],["Vuelo",0.36],["Impacto",0.95],["Pulpa",1.3],["Disipación",1.75]],
build(a){
  const L=a.L,TF=0.22,TI=0.95,TD=1.75;
  const S0=V3(-3.5,2.4,0), E0=V3(3.3,1.75,0), BP=V3(3.3,1.7,0);
  const fr=new THREE.Group(); L.mesh.add(fr);
  const fm=fruitMat("#ffab45","#d9481c",0.6);
  const PG1=new THREE.Color('#c9d65a'),PG2=new THREE.Color('#6f8a2a'),PO1=new THREE.Color('#ffab45'),PO2=new THREE.Color('#d9481c'); const body=new THREE.Mesh(new THREE.SphereGeometry(0.32,28,20),fm); body.scale.set(1.12,0.86,1.12); fr.add(body);
  const calyxM=S.mat(CALYX_FS,{},{mode:'solid',side:THREE.DoubleSide});
  const calyx=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42).rotateX(-Math.PI/2),calyxM); calyx.position.y=0.27; fr.add(calyx);
  const calyxF=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42).rotateX(-Math.PI/2),calyxM); L.mesh.add(calyxF);
  const gel=new THREE.Mesh(new THREE.SphereGeometry(0.5,28,18),S.mat(GEL_FS,{uEr:{value:0}},{mode:'matter'})); L.mesh.add(gel);
  const splat=groundPlane(2.8,3.4,0.025,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=styNoise(vUv*.7+.11).g*.5+styNoise(vUv*.45+.4).r*.5;float m=smoothstep(.62,.54,r+(n-.5)*.6);
   float drops=smoothstep(.74,.8,styNoise(vUv*1.1+.27).g)*smoothstep(1.,.6,r);float mm=max(m,drops);if(mm<.01)discard;
   float er=styErode(n*.7+mm*.3,uP,.12);gl_FragColor=vec4(styRamp(.3+.4*n)*mix(vec3(1.),uShadeCol,.12),mm*er*uA*.85);}`,{},{mode:'matter'})); L.decal.add(splat);
  const shadow=S.contactShadow(L.decal,1.0);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.83,toCam:0.5});
  const ring=S.groundRing(L.decal,3.0);
  const K=`const float TF=${f(TF)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 S0=${v3(S0)};const vec3 E0=${v3(E0)};const vec3 BP=${v3(BP)};${ARC}`;
  // madurar: motas doradas que entran al fruto
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x*(TF-.06);float age=(uT-s)/.16;vec3 d=normalize(rnd());
   vec3 p=S0+d*mix(.9,.15,age*age);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.1+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // salpicadura de pulpa
  S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.15,.55,0.))*(1.8+2.*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.x,v.y-14.*t);vR=atan(vel.x,vel.y);put(p,.3+.16*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1'}));
  // trozos de piel
  S.pts(L.part,8,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.6,0.))*(1.6+1.6*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*(8.+5.*aSeed.w);put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2'}));
  // goteo pegajoso desde el rival
  S.pts(L.part,14,VV+K+`void main(){float per=.38;float k=(uT-TI-.05)/per+aSeed.x;float c=floor(k);float tt=fract(k)*per;vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(3.35+cos(an)*.38,1.5-r.y*.4-3.5*tt*tt,sin(an)*.38);
   vA=(k>=0.&&uT<TD&&p.y>.03)?1.:0.;vK=0.;vR=3.14159;put(p,.15+.06*r.z);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1'}));
  a.pose=function(te,o){
    const ia=te-TI, ripe=ss(0,TF,te);
    caster.rotation.z=0.08*ss(0,TF,te)-0.24*ss(TF,TF+0.07,te)+0.16*ss(TF+0.15,TI,te);
    fr.visible=ia<0;
    fm.uniforms.uCa.value.lerpColors(PG1,PO1,ripe); fm.uniforms.uCb.value.lerpColors(PG2,PO2,ripe);
    fm.uniforms.uGl.value=0.25*ss(TF-0.08,TF,te)*(1-ss(TF,TF+0.2,te));
    if(te<TF){fr.position.copy(S0);fr.rotation.set(0,te*3,0.05*Math.sin(te*30));fr.scale.setScalar(Math.max(0.4+0.6*back(ripe),0.001));}
    else{const k=(te-TF)/(TI-TF);arcJ(S0,E0,2.2,k,fr.position);fr.rotation.set(0,k*2,-k*9);fr.scale.setScalar(1);}
    shadow.pose(fr.position.x,0,0.9,te>TF&&ia<0?0.55*ss(TF,TI,te):0);
    // pulpa sobre la cabeza del rival: se aplasta, tiembla y se consume
    const pk=cl(ia/0.12), wob=Math.exp(-Math.max(ia,0)*4)*Math.sin(Math.max(ia,0)*26);
    gel.visible=ia>=0&&ia<0.95;
    gel.position.set(target.position.x-0.05,1.62-0.1*pk,0);
    gel.scale.set((0.7+0.5*out3(pk))*(1+0.12*wob),(0.35+0.25*out3(pk))*(1-0.15*wob),(0.7+0.5*out3(pk))*(1+0.12*wob));
    gel.material.uniforms.uA.value=1; gel.material.uniforms.uEr.value=-0.1+1.15*ss(0.35,0.95,ia);
    // el cáliz sale volando
    const ct=Math.max(ia,0); calyxF.visible=ia>=0&&ia<0.8;
    calyxF.position.set(BP.x-0.9*ct,BP.y+0.3+2.6*ct-6*ct*ct,0.4*ct); calyxF.rotation.set(ct*9,ct*4,ct*6);
    calyxF.scale.setScalar(Math.max(1-ss(0.55,0.8,ia),0.001));
    spark.pose(ia,BP,1);
    ring.pose(ia,3.4,0,0.45);
    splat.visible=ia>=0; splat.scale.setScalar(0.5+0.5*out3(ia/0.25)); set(splat,ia>=0?-0.1+1.15*ss(0.6,1.4,ia):0,ia>=0?1:0);
    const hit=hitE(ia,6)*(ia>=0?1:0);
    target.position.x=3.4+0.18*hit; target.position.y=-0.08*hit; target.rotation.z=-hit*0.22*Math.cos(ia*14);
    if(ia<0){o.g.copy(fr.position);o.gs=0.5;o.ga=0.08;o.li=0.8+0.8*ripe;}
    else{o.g.copy(BP);o.gs=1+1.4*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*12);o.li=3.5*Math.exp(-ia*6);}
    o.ia=ia; o.c.set(3.2,1.45,0); o.shake=0.9; o.dist=0.8; o.flash=0.6;
  };
}});

// =====================================================================
// 5 · ROSE BUD (aliado: cura 70) — un zarcillo espinoso corre por el suelo del lanzador al aliado; a sus pies sube un
//     capullo de pétalos que lo envuelve y florece; espiral de pétalos, rocío que cae y destella, y los pétalos se marchitan
// =====================================================================
const STEM_FS=`uniform float uEr;void main(){if(vUv.x>uP)discard;vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float n2=styNoise(vec2(vUv.x*6.,vUv.y)).g;if(uEr>0.&&n2*.6+.4*(1.-vUv.x)<uEr)discard;
 vec3 c=styRampOf(mix(vec3(0.013,0.107,0.013),vec3(0.073,0.233,0.022),n2),.3+.55*l)*styTint(l);
 gl_FragColor=vec4(c,1.);}`;
const THORN_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 gl_FragColor=vec4(styRampOf(mix(vec3(0.214,0.013,0.022),vec3(0.051,0.133,0.013),smoothstep(.1,-.08,vP.y)),.3+.55*l)*styTint(l),1.);}`;
const PETAL_FS=`uniform float uEr;uniform float uGl;
void main(){vec2 p=vUv-vec2(.5,0.);float y=vUv.y;float w=.5*sin(3.14159*pow(y,.75))*(1.-.1*y);if(abs(p.x)>w)discard;
 float nz=styNoise(vUv*vec2(.6,.9)+.37).r;if(uEr>0.&&nz*.6+.4*(1.-y)<uEr)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float vein=smoothstep(.035,0.,abs(p.x))*.18;
 vec3 col=mix(uC2*.75,uC1,smoothstep(.0,.95,y))*(1.-vein);
 vec3 c=styRampOf(col,.3+.55*l)*styTint(l);c=mix(c,uC1*1.1,smoothstep(w-.05,w,abs(p.x))*.4);c+=uC1*uGl*.6;
 gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_pcRoseBud",name:"Rose Bud (estilizado)",dur:2.4,ti:0.8,tier:2,pal:"Cuerno Rosa",stylized:true,allies:1,...ZONES,
  phases:[["Zarcillo",0],["Capullo",0.32],["Floración",0.8],["Espiral",0.95],["Rocío",1.15],["Marchitar",1.75]],
build(a){
  const L=a.L,TB=0.32,TI=0.8,TW=1.75,TE=2.35;
  const pts=[];const A0=V3(-3.25,0.06,0.15),A1=V3(AP.x-0.35,0.06,AP.z+0.3);
  for(let i=0;i<=16;i++){const u=i/16;pts.push(V3(A0.x+(A1.x-A0.x)*u+0.25*Math.sin(u*9),0.06+0.04*Math.sin(u*13),A0.z+(A1.z-A0.z)*u+0.28*Math.sin(u*7+1)));}
  const curve=new THREE.CatmullRomCurve3(pts);
  const stemMat=S.mat(STEM_FS,{uEr:{value:0}},{mode:'solid'});
  const stem=new THREE.Mesh(taperTube(curve,64,6,0.06,0.04),stemMat); L.mesh.add(stem);
  const thornM=S.mat(THORN_FS,{},{mode:'solid'}), thornG=new THREE.ConeGeometry(0.04,0.15,6).translate(0,0.07,0);
  const thorns=[];for(let i=0;i<9;i++){const u=0.08+i*0.1,m=new THREE.Mesh(thornG,thornM);curve.getPointAt(u,m.position);m.position.y+=0.04;
    m.rotation.set((i%2?0.5:-0.5),0,(i%3-1)*0.4);L.mesh.add(m);thorns.push({m,u});}
  // capullo: seis pétalos curvados alrededor del aliado
  const petalMat=S.mat(PETAL_FS,{uEr:{value:0},uGl:{value:0}},{mode:'solid',side:THREE.DoubleSide});
  const pg=new THREE.PlaneGeometry(0.95,1.55,4,8).translate(0,0.775,0);
  {const pa=pg.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);pa.setZ(i,0.35*Math.pow(y/1.55,1.6)-0.3*x*x);}pa.needsUpdate=true;pg.computeVertexNormals();}
  const bud=new THREE.Group(); bud.position.set(AP.x,0,AP.z); L.mesh.add(bud);
  const petals=[];for(let i=0;i<6;i++){const piv=new THREE.Group();piv.rotation.y=i*Math.PI/3+(i%2)*0.15;const m=new THREE.Mesh(pg,petalMat);m.position.z=0.42;piv.add(m);bud.add(piv);petals.push(m);}
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.33,toCam:0.5});
  const ring=S.groundRing(L.decal,3.2), ring2=S.groundRing(L.decal,2.4);
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TW=${f(TW)};const vec3 AP=${v3(AP)};`;
  // espiral de pétalos
  S.pts(L.part,26,VV+K+`void main(){float s=TI+.1+aSeed.x*.5;float life=.85+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.2;float rad=.5+.9*t;vec3 p=AP+vec3(cos(an)*rad,.4+t*1.4-.4*t*t,sin(an)*rad);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=an+t*4.;put(p,.26+.1*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:.08,col:'uC1'}));
  // rocío que cae y destella al posarse
  S.pts(L.part,12,VV+K+`void main(){float s=TI+.35+aSeed.x*.35;float t=max(uT-s,0.);float an=aSeed.y*6.2832;float rad=.15+.35*aSeed.z;
   float y=2.5-4.5*t*t;vec3 p=AP+vec3(cos(an)*rad,max(y,.95+.4*aSeed.w),sin(an)*rad);
   vA=(uT>s&&t<.9)?1.-smoothstep(.6,.9,t):0.;vK=0.;vR=3.14159;put(p,.14+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.48,.83,1.)'}));
  S.pts(L.part,20,VV+K+`void main(){float s=TI+.05+aSeed.x*.8;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=AP+vec3(r.x*.55,.3+aSeed.w*1.5+t*.9,r.z*.55);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.15+.06*aSeed.y);}`,S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  const HD=V3(AP.x,1.1,AP.z);
  a.pose=function(te,o){
    const ia=te-TI, run=cl(te/0.3);
    caster.rotation.z=0.1*ss(0,0.08,te)-0.18*ss(0.08,0.16,te)+0.08*ss(0.2,TI,te);
    stem.visible=te>0.01&&te<TE; stemMat.uniforms.uP.value=out3(run)*1.01; stemMat.uniforms.uEr.value=te>1.2?-0.05+1.1*ss(1.2,1.9,te):0;
    for(const t of thorns){const g=ss(t.u*0.3,t.u*0.3+0.08,te)*(1-ss(1.3+t.u*0.4,1.5+t.u*0.4,te));t.m.visible=g>0.001;t.m.scale.setScalar(Math.max(g,0.001));}
    // capullo: sube cerrado, florece en TI y se marchita
    const up=out3((te-TB)/(TI-TB-0.05)), bloom=back(cl((te-TI)/0.28)), wither=ss(TW,TE,te);
    bud.visible=te>TB&&te<TE; bud.scale.set(0.8+0.25*up,Math.max(up,0.001)*(1-0.25*wither),0.8+0.25*up); bud.rotation.y=te*0.6;
    for(const p of petals){p.rotation.x=-0.25+(te<TI?0:1.15*bloom)+0.35*wither;}
    petalMat.uniforms.uGl.value=0.8*hitE(ia,6)*(ia>=0?1:0); petalMat.uniforms.uEr.value=te>TW?-0.05+1.1*ss(TW,TE-0.05,te):0;
    spark.pose(ia,HD,0.9);
    ring.pose(ia,AP.x,AP.z,0.45); ring2.pose(te-TB,AP.x,AP.z,0.4,0.6);
    const env=ss(TI,TI+0.15,te)*(1-ss(TW,TE,te));
    const al=allies[0].userData.m; al.emissive.copy(U.uC1.value); al.emissiveIntensity=0.45*hitE(ia,6)*(ia>=0?1:0)+0.15*env;
    if(te<TB){curve.getPointAt(Math.min(out3(run),1),tmp);o.g.copy(tmp);o.gs=0.4;o.ga=0.08;o.li=0.8;}
    else if(ia<0){o.g.copy(HD);o.gs=0.8*up;o.ga=0.1*up;o.li=1.5*up;}
    else{o.g.copy(HD);o.gs=1.2+1.2*Math.min(ia,0.4);o.ga=0.22*Math.exp(-ia*8)+0.05*env;o.li=3*Math.exp(-ia*5)+0.8*env;}
    o.ia=ia; o.c.copy(HD); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// 6 · STRAWBERRY SHORTCAKE (aliado: cura 60 y +15 % de daño) — el aliado late herido; un pastelito de fresa crece sobre
//     la cabeza y vuela en parábola; estalla en nube de nata, trozos de fresa y virutas de colores; un aro de nata baja
//     del pecho a los pies y cierra las heridas; flechas rojas suben (daño aumentado) (nivel 3)
// =====================================================================
const SPRINKLE_FS=S.PV+`void main(){vec2 uv=styPC();vec2 q=uv-.5;float d=max(abs(q.x)*2.6,abs(q.y)*.9);if(d>.5)discard;
 float id=floor(vMix*5.);vec3 col=id<1.?vec3(1.,.15,.32):id<2.?vec3(.17,.6,1.):id<3.?vec3(1.,.75,.1):id<4.?vec3(.32,.89,.21):vec3(.95,.95,.89);
 float l=step(0.,-q.x+q.y*.2);gl_FragColor=vec4(col*(.75+.3*l),vA*(1.-smoothstep(.6,1.,vK)));}`;
defs.push({key:"sty_pcShortcake",name:"Strawberry Shortcake (estilizado)",dur:3.3,ti:1.18,tier:3,pal:"Cuerno Fresa",stylized:true,allies:1,...ZONES,
  phases:[["Herida",0],["Lanzamiento",0.55],["Estallido",1.18],["Crema",1.4],["Curación",1.75],["Fin",2.75]],
build(a){
  const L=a.L,TL=0.55,TI=1.18,TC=1.4,TH=1.75,TE=2.75;
  const S0=V3(-3.5,2.5,0), E0=V3(AP.x,1.65,AP.z), BP=V3(AP.x,1.5,AP.z);
  const cake=new THREE.Group(); L.mesh.add(cake);
  const sponge=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.2,24),fruitMat("#f7d58c","#c98a3c")); sponge.position.y=-0.08; cake.add(sponge);
  const cream=new THREE.Mesh(new THREE.CylinderGeometry(0.31,0.31,0.1,24),fruitMat("#fff4f6","#f7c6d4")); cream.position.y=0.06; cake.add(cream);
  const sponge2=new THREE.Mesh(new THREE.CylinderGeometry(0.29,0.3,0.12,24),fruitMat("#f7d58c","#c98a3c")); sponge2.position.y=0.17; cake.add(sponge2);
  const top=new THREE.Mesh(new THREE.SphereGeometry(0.3,24,10,0,Math.PI*2,0,Math.PI/2),fruitMat("#fff6f8","#ffd1de")); top.scale.y=0.45; top.position.y=0.22; cake.add(top);
  const berry=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.2,14).rotateZ(Math.PI),fruitMat("#ff6a82","#c4123a",1)); berry.position.y=0.42; cake.add(berry);
  const torus=new THREE.Mesh(new THREE.TorusGeometry(0.72,0.15,14,40).rotateX(Math.PI/2),fruitMat("#fff6f8","#ffb3c8")); L.mesh.add(torus);
  const torusM=torus.material;
  const shadow=S.contactShadow(L.decal,1.0);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.52,toCam:0.5});
  const ring=S.groundRing(L.decal,3.2), ring2=S.groundRing(L.decal,2.6);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TH=${f(TH)};const float TE=${f(TE)};const vec3 S0=${v3(S0)};const vec3 E0=${v3(E0)};const vec3 BP=${v3(BP)};const vec3 AP=${v3(AP)};${ARC}`;
  // herida: chispas rojas que laten en el aliado
  S.pts(L.part,10,VV+K+`void main(){float per=.45;float k=uT/per+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=AP+vec3((r.x-.5)*.6,.5+r.y*.9,(r.z-.5)*.6);float on=1.-smoothstep(TH-.1,TH+.1,uT);
   vA=sin(age*3.14159)*on;vK=0.;vR=r.x*6.28;put(p,.16+.08*r.z);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(0.692,0.013,0.02)'}));
  // virutas en el vuelo y en el estallido
  S.pts(L.part,14,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=arc(S0,E0,1.8,(s-TL)/(TI-TL))+rnd()*.12+vec3(0.,-1.5*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=age;vR=aSeed.w*6.28+t*8.;put(p,.12+.04*aSeed.z);}`,SPRINKLE_FS);
  S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.65+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.8+2.*aSeed.z);vec3 p=BP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=age;vR=aSeed.w*6.28+t*10.;put(p,.13+.05*aSeed.w);}`,SPRINKLE_FS);
  // nube de nata y trozos de fresa
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd());vec3 p=BP+d*(.25+.75*(1.-exp(-t*5.)))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28+t;put(p,(.75+.3*aSeed.z)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4.5,bias:.05,col:'vec3(1.,.71,.79)'}));
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.55,0.))*(1.8+1.6*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.x,v.y-14.*t);vR=atan(vel.x,vel.y);put(p,.26+.1*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(0.828,0.022,0.073)'}));
  // curación: motas que suben al cerrar el aro
  S.pts(L.part,18,VV+K+`void main(){float s=TH+aSeed.x*.3;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.7,.1+t*1.6+aSeed.w*.3,sin(an)*.7);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.06*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.35}),{mode:'energy'});
  // daño aumentado: flechas rojas que suben
  S.pts(L.part,12,VV+K+`void main(){float per=.5;float k=(uT-TH)/per+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=AP+vec3(cos(an)*(.55+.15*r.y),.2+age*1.8,sin(an)*(.55+.15*r.y));
   float on=step(TH,uT)*(1.-smoothstep(TE-.2,TE+.1,uT));vA=sin(age*3.14159)*on*step(0.,k);vK=0.;vR=0.;put(p,.5+.12*r.z);}`,CHEVUP_FS,{mode:'energy'});
  const HD=V3(AP.x,1.1,AP.z);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0.08,TL-0.05,te);
    caster.rotation.z=0.1*ss(0,TL,te)-0.24*ss(TL,TL+0.07,te)+0.14*ss(TL+0.15,TI,te);
    cake.visible=ia<0&&grow>0.001;
    if(te<TL){cake.position.copy(S0);cake.rotation.set(0,te*2.5,0);cake.scale.setScalar(Math.max(back(grow),0.001));}
    else{const k=(te-TL)/(TI-TL);arcJ(S0,E0,1.8,k,cake.position);cake.rotation.set(0.3*Math.sin(k*6),k*6,-0.4*k);cake.scale.setScalar(1);}
    shadow.pose(cake.position.x,cake.position.z,0.9,te>TL&&ia<0?0.55*ss(TL,TI,te):0);
    spark.pose(ia,BP,1);
    // aro de nata: aparece en el pecho y baja a los pies con un leve bamboleo
    const tk=cl((te-TC)/(TH-TC));torus.visible=te>TC-0.05&&te<TH+0.45;
    torus.position.set(AP.x,1.5-1.38*tk*tk,AP.z); const sc=back(cl((te-TC+0.05)/0.2)); torus.scale.set(sc*(1-0.12*tk),sc,sc*(1-0.12*tk));
    torus.rotation.set(0.12*Math.sin(te*9)*(1-tk),0,0.1*Math.cos(te*7)*(1-tk));
    torusM.uniforms.uEr.value=te>TH?-0.05+1.1*ss(TH,TH+0.42,te):0; torusM.uniforms.uGl.value=0.5*hitE(te-TH,8)*(te>=TH?1:0);
    ring.pose(te-TH,AP.x,AP.z,0.45); ring2.pose(ia,AP.x,AP.z,0.4,0.8);
    const env=ss(TH,TH+0.15,te)*(1-ss(TE-0.2,TE+0.1,te));
    const al=allies[0].userData.m;
    if(te<TH){al.emissive.setRGB(0.9,0.15,0.18);al.emissiveIntensity=0.22*(0.5+0.5*Math.sin(te*12))*(1-ss(TC,TH,te));}
    else{al.emissive.copy(U.uC1.value);al.emissiveIntensity=0.5*hitE(te-TH,6)+0.15*env;}
    if(ia<0){o.g.copy(cake.position);o.gs=0.6*grow;o.ga=0.1*grow;o.li=1.2*grow;}
    else if(te<TH){o.g.copy(BP);o.gs=1.1+1.2*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*9);o.li=3.2*Math.exp(-ia*5)+0.5;}
    else{o.g.copy(HD);o.gs=1.4;o.ga=0.2*Math.exp(-(te-TH)*8)+0.05*env;o.li=2.5*Math.exp(-(te-TH)*5)+0.8*env;}
    o.ia=ia; o.c.copy(te<TH?BP:HD); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// 7 · WATERMELON — copia de sty_sandia (mod-estilizado-piloto.js) para que el módulo sea autónomo
// =====================================================================
const MELON_FS=`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
 float w=styNoise(vec2(an*.32,q.y*.6+.5)).b;
 float stripe=smoothstep(.42,.58,fract(an/6.2832*9.+(w-.5)*.45+q.y*.08));
 vec3 rind=mix(uC2*.5,mix(uC2,vec3(.78,.95,.5),.42),stripe);
 vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 vec3 c=mix(rind*.5,rind*1.08,l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.28*smoothstep(.6,.68,fr)*step(.5,l);
 float sp=smoothstep(.955,.97,dot(reflect(-L,n),normalize(vV)));c+=vec3(1.)*sp*.55;
 gl_FragColor=vec4(c,1.);}`;
const SPLAT_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.7).g*.5+styNoise(vUv*.45+.31).r*.5;
 float m=smoothstep(.72,.64,r+(n-.5)*.6);
 float drops=smoothstep(.74,.8,styNoise(vUv*1.1+.17).g)*smoothstep(1.,.65,r);
 float mm=max(m,drops);if(mm<.01)discard;
 float er=styErode(n*.7+mm*.3,uP,.12);
 vec3 c=styRamp(.32+.42*n)*mix(vec3(1.),uShadeCol,.12);
 gl_FragColor=vec4(c,mm*er*uA*.9);}`;
const PULP_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec3 q=normalize(vP);float nz=styNoise(vec2(atan(q.z,q.x)*.32,q.y*.5+.5)).r*.6+styNoise(vec2(atan(q.z,q.x)*.8,q.y*1.3)).g*.4;
 float fr=abs(dot(n,normalize(vV)));float er=styErode(nz*.75+fr*.25,uEr,.08);if(er<.01)discard;
 vec3 c=styRampOf(uC1,.3+.55*l)*styTint(l);c=mix(c,vec3(1.,.9,.85),smoothstep(.85,1.,nz)*.25);
 gl_FragColor=vec4(c,er*uA);}`;
const SEED_FS=S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(4.,uv);float m=sh.r;if(m<.05)discard;
 float er=styErode(m*.5+sh.b*.5,vK-.05,.1);if(er*vA<.01)discard;
 float l=styLight(styShapeN(4.,uv,5.),stySunV());
 gl_FragColor=vec4(mix(vec3(.04,.025,.02),vec3(.32,.24,.18),l)+vec3(1.)*sh.g*.25,er*vA);}`;
defs.push({key:"sty_pcWatermelon",name:"Watermelon (estilizado)",dur:2.3,ti:1.0,pal:"Sandía",tier:2,stylized:true,...ZONES,
  phases:[["Brote",0],["Rodada",0.32],["Impacto",1.0],["Jugo",1.25]],
build(a){
  const L=a.L,TG=0.3,TR=0.32,TI=1.0,X0=-2.55,X1=2.85,R=0.5,BP=V3(3.0,0.55,0);
  const ball=new THREE.Group(); L.mesh.add(ball);
  const body=new THREE.Mesh(new THREE.SphereGeometry(R,40,28),S.mat(MELON_FS,{},{mode:'solid'})); body.scale.set(1.08,0.94,1);
  ball.add(body);
  const shadow=groundPlane(1.4,X0,0.02,S.mat(S.FS.CONTACT,{},{mode:'matter'})); L.decal.add(shadow);
  const splat=groundPlane(3.4,3.2,0.025,S.mat(SPLAT_FS,{},{mode:'matter'})); L.decal.add(splat);
  const spark=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(S.FS.HITSPARK,{uEr:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(spark);
  const pulp=new THREE.Mesh(new THREE.SphereGeometry(0.55,32,20),S.mat(PULP_FS,{uEr:{value:0}},{mode:'matter',side:THREE.FrontSide})); pulp.position.copy(BP); L.mesh.add(pulp);
  const px=t=>{const k=cl((t-TR)/(TI-TR));return X0+(X1-X0)*Math.pow(k,1.6);};
  const K=`const float TG=${f(TG)};const float TR=${f(TR)};const float TI=${f(TI)};const vec3 BP=${v3(BP)};
  float px(float t){float k=clamp((t-TR)/(TI-TR),0.,1.);return ${f(X0)}+${f(X1-X0)}*pow(k,1.6);}`;
  S.pts(L.part,8,VV+K+`void main(){float s=.05+aSeed.x*.12;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(X0)},.12,0.)+vec3(cos(an),0.,sin(an)*.7)*(.3+.5*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.32+.16*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH}));
  S.pts(L.part,22,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(px(s)-.35,.1,(aSeed.z-.5)*.6)+vec3(-.25*t,t*(.35+.3*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28+t;
   put(p,(.22+.14*aSeed.y)*(.6+.8*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.25,.85,0.))*(2.+2.2*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.x,v.y-14.*t);vR=atan(vel.x,vel.y);
   put(p,.42+.2*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,bias:.05,col:'uC1'}));
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.7,0.))*(1.6+2.*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;
   put(p,.1+.04*aSeed.w);}`,SEED_FS);
  S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.6,0.))*(1.8+1.6*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*(7.+5.*aSeed.w);
   put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,bias:0.,col:'uC2'}));
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0.02,TG,te), x=te<TR?X0:px(te), k=cl((te-TR)/(TI-TR));
    caster.rotation.z=0.12*ss(0,TG,te)-0.18*ss(TG,TG+0.1,te)+0.06*ss(TG+0.2,TI,te);
    const bounce=te<TR?0:Math.abs(Math.sin(k*Math.PI*2.2))*0.32*(1-k*0.6);
    const pop=1+0.18*Math.sin(Math.PI*cl(te/TG))*(1-cl(te/TG));
    ball.visible=ia<0&&grow>0.001;
    ball.position.set(x,R*0.94*grow+bounce,0); ball.scale.setScalar(Math.max(grow*pop,0.001));
    body.rotation.z=-(x-X0)/R;
    shadow.position.x=x; shadow.scale.setScalar(Math.max(grow*(1-0.35*bounce),0.001)); shadow.material.uniforms.uA.value=ia<0?grow:0;
    const sp=cl(ia/0.06), se=ss(0.03,0.17,ia);
    towardCam(spark.position,BP,0.6); billboard(spark,0.2); spark.visible=ia>=0&&se<1;
    spark.scale.setScalar(0.5+0.6*(1-Math.pow(1-sp,3))); spark.material.uniforms.uA.value=1; spark.material.uniforms.uP.value=0.9; spark.material.uniforms.uEr.value=-0.1+1.1*se;
    const pk=cl(ia/0.16); pulp.visible=ia>=0&&ia<0.32; pulp.scale.set(0.55+0.9*(1-Math.pow(1-pk,3)),0.45+0.6*(1-Math.pow(1-pk,3)),0.55+0.9*(1-Math.pow(1-pk,3)));
    pulp.material.uniforms.uA.value=1; pulp.material.uniforms.uEr.value=-0.1+1.15*ss(0.04,0.3,ia);
    splat.visible=ia>=0; splat.scale.setScalar(0.5+0.5*(1-Math.pow(1-cl(ia/0.18),3)));
    set(splat,ia>=0?-0.1+1.15*ss(0.45,1.3,ia):0,ia>=0?1:0);
    const hit=hitE(ia,6);
    target.position.x=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-hit*0.25*Math.cos(ia*15);
    if(ia<0){o.g.set(x,R,0);o.gs=0.001;o.ga=0;o.li=0.6*grow;}
    else{o.g.copy(BP);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*14)*0.3;o.li=4*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(BP);o.shake=1;o.dist=1;
  };
}});

// =====================================================================
// 8 · CACTUS (Big Yak) — una pala de cactus asoma sobre los cuernos y eriza un abanico de espinas; salen en ráfaga
//     con estelas y se clavan por el cuerpo del rival; una espina dorada mayor lo atraviesa (daño que ignora el
//     escudo) y sale por detrás; las espinas tiemblan y caen al suelo
// =====================================================================
const NEEDLE_FS=`uniform float uGl;uniform float uGold;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());float t=clamp(vP.x/.5+.5,0.,1.);
 vec3 body=mix(vec3(0.022,0.147,0.022),vec3(1.,.5,.06),uGold);vec3 tip=mix(vec3(0.911,0.848,0.477),vec3(1.,.95,.7),uGold);
 vec3 col=mix(body,tip,smoothstep(.45,.9,t));
 vec3 c=styRampOf(col,.32+.55*l)*styTint(l)+mix(uC1,vec3(1.,.8,.3),uGold)*uGl*(.3+.7*t);
 gl_FragColor=vec4(c,1.);}`;
const PAD_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p*vec2(1.15,.85));if(r>1.)discard;
 float n=styNoise(vUv*.8).r;vec2 g=fract(vUv*vec2(3.5,4.5)+vec2(.25,.0))-.5;float pdot=smoothstep(.11,.06,length(g))*step(r,.85);
 vec3 nn=normalize(vec3(p*vec2(.8,.6),1.));float l=styLight(nn,stySunV());
 vec3 c=styRampOf(mix(vec3(0.025,0.179,0.033),vec3(0.084,0.319,0.047),n),.3+.5*l)*styTint(l);c=mix(c,vec3(0.933,0.869,0.507),pdot);
 c=mix(c,vec3(0.01,0.064,0.01),smoothstep(.88,.98,r));
 float er=styErode(n*.6+(1.-r)*.4,uP,.1);if(er<.01)discard;
 gl_FragColor=vec4(c,uA*er);}`;
const STREAK_GOLD_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.2+.8*u;float m=smoothstep(w,w*.35,v)*u;
 if(m<.01)discard;gl_FragColor=vec4(mix(vec3(1.,.72,.25),vec3(1.,.95,.75),u)*1.5*m,m*uA);}`;
defs.push({key:"sty_pcCactus",name:"Cactus (estilizado)",dur:2.1,ti:0.7,tier:2,pal:"Cuerno Cactus",stylized:true,...ZONES,
  phases:[["Erizado",0],["Salva",0.38],["Impactos",0.62],["Clavadas",0.95],["Caída",1.3]],
build(a){
  const L=a.L,TA=0.38,FT=0.24,TF=1.3,TE=1.95,N=9,CF=V3(-3.5,2.2,0);
  const ndMat=S.mat(NEEDLE_FS,{uGl:{value:0},uGold:{value:0}},{mode:'solid'});
  const gdMat=S.mat(NEEDLE_FS,{uGl:{value:0},uGold:{value:1}},{mode:'solid'});
  const ng=new THREE.ConeGeometry(0.07,0.56,7).rotateZ(-Math.PI/2);
  const trMat=S.mat(STREAK_FS,{},{mode:'energy'}), gtMat=S.mat(STREAK_GOLD_FS,{},{mode:'energy'});
  const pad=new THREE.Mesh(new THREE.PlaneGeometry(0.95,1.15),S.mat(PAD_FS,{},{mode:'matter'})); L.mesh.add(pad);
  const R=(i,k)=>{const x=Math.sin(i*12.9898+k*78.233)*43758.5453;return x-Math.floor(x);};
  const needles=[],SP=[],MP=[],HP=[],DIR=[],T0=[],TH=[],streaks=[];
  for(let i=0;i<N;i++){
    const an=-1.0+2.0*i/(N-1);
    const sp=V3(CF.x+0.35+0.35*Math.cos(an),CF.y+0.6*Math.sin(an)+0.15,(R(i,1)-0.5)*0.5);
    const hp=V3(3.0+0.12*R(i,2),0.45+1.1*R(i,3),(R(i,4)-0.5)*0.7);
    const mp=V3((sp.x+hp.x)/2,Math.max(sp.y,hp.y)+0.6+0.5*R(i,5),(sp.z+hp.z)/2+(R(i,6)-0.5)*1.2);
    SP.push(sp);HP.push(hp);MP.push(mp);
    T0.push(TA+i*0.022+0.02*R(i,7));TH.push(T0[i]+FT);
    DIR.push(V3(1,(hp.y-mp.y)*0.6,(hp.z-mp.z)*0.6).normalize());
    const m=new THREE.Mesh(ng,ndMat);L.mesh.add(m);needles.push(m);m.userData.k=1.25;
    streaks.push(streakMesh(L.trail,0.2,trMat));
  }
  // espina dorada que atraviesa
  const TG0=TA+0.2,TGH=0.74,TGX=0.95,G0=V3(-2.9,2.3,0),GH=V3(3.15,1.05,0),G1=V3(5.1,0.75,0);
  const gold=new THREE.Mesh(ng,gdMat); gold.scale.set(2.2,1.6,1.6); L.mesh.add(gold);
  const gstreak=streakMesh(L.trail,0.16,gtMat);
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.15,toCam:0.5}), sparkB=S.hitSpark(L.mesh,1.4,{seed:0.66,toCam:0.3});
  const ring=S.groundRing(L.decal,2.6);
  const FIRST=Math.min(...TH),LAST=Math.max(...TH);
  const K=`const float TA=${f(TA)};const float FIRST=${f(FIRST)};const float LAST=${f(LAST)};const float TF=${f(TF)};const vec3 CF=${v3(CF)};`;
  // savia verde que salta en cada impacto
  S.pts(L.part,24,VV+K+`void main(){float s=FIRST+aSeed.x*(LAST-FIRST);float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(3.,.45+1.1*fract(aSeed.x*7.3),(fract(aSeed.x*3.7)-.5)*.7);vec3 v=normalize(rnd()+vec3(-.6,.4,0.))*(1.4+1.4*aSeed.z);
   vec3 p=b+v*t+vec3(0.,-6.*t*t,0.);vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*9.;
   put(p,.15+.06*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(0.171,0.477,0.051)'}));
  // erizado: motas que tiemblan alrededor de la pala
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x*(TA-.1);float age=(uT-s)/.2;vec3 d=normalize(rnd());
   vec3 p=CF+vec3(.3,.1,0.)+d*mix(.9,.2,age);vR=0.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.1+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // polvo al caer
  S.pts(L.part,10,VV+K+`void main(){float s=TF+.25+aSeed.x*.2;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(2.85+(aSeed.w-.5)*.6,.08,(aSeed.y-.5)*.9)+vec3(cos(an),0.,sin(an))*.4*(1.-exp(-t*5.))+vec3(0.,t*.3,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=an;put(p,(.22+.1*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  const pt=V3(0,0,0), dv=V3(0,0,0), cp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-0.7, erz=ss(0,TA,te);
    caster.rotation.z=0.12*erz-0.22*ss(TA,TA+0.06,te)+0.1*ss(TA+0.1,0.8,te)+(te>TA&&te<TA+0.22?0.03*Math.sin(te*90):0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*erz*(1-ss(TA,TA+0.3,te));
    // pala de cactus
    towardCam(pad.position,tmp.set(CF.x+0.15,CF.y+0.1,0),0.15); billboard(pad,0); pad.visible=te<TA+0.45;
    pad.scale.setScalar(Math.max(back(ss(0,0.22,te)),0.001)); set(pad,-0.1+1.1*ss(TA+0.05,TA+0.45,te),1);
    let kick=0,last=-1;
    for(let i=0;i<N;i++){const d=te-TH[i];if(d>=0){kick+=0.025*Math.exp(-d*9);if(last<0||TH[i]>TH[last])last=i;}}
    for(let i=0;i<N;i++){const n=needles[i],s=streaks[i],k=cl((te-T0[i])/FT),hit=te>=TH[i];
      const ap=ss(0.04+i*0.012,0.2+i*0.012,te);
      n.visible=ap>0.001&&te<TE; n.scale.setScalar(Math.max(1.25*ap*(1-ss(TE-0.3,TE,te)),0.001));
      if(te<T0[i]){n.position.copy(SP[i]);n.position.x+=0.02*Math.sin(te*60+i)*erz;dv.copy(MP[i]).sub(SP[i]).normalize();n.quaternion.setFromUnitVectors(XA,dv);}
      else if(!hit){qb(SP[i],MP[i],HP[i],k,n.position);qb(SP[i],MP[i],HP[i],Math.min(k+0.02,1),pt);dv.copy(pt).sub(n.position).normalize();
        if(k>0.98)dv.copy(DIR[i]);n.quaternion.setFromUnitVectors(XA,dv);}
      else{const tf=te-(TF+i*0.025);
        if(tf<0){const q=Math.exp(-(te-TH[i])*7)*0.25*Math.sin((te-TH[i])*70);
          n.position.copy(HP[i]).addScaledVector(DIR[i],-0.12);n.position.x+=target.position.x-3.4;
          dv.copy(DIR[i]);dv.y+=q;dv.z+=q*0.6;n.quaternion.setFromUnitVectors(XA,dv.normalize());}
        else{const y0=HP[i].y,fy=Math.max(y0-4.5*tf*tf,0.03),lay=cl(tf/Math.sqrt(y0/4.5));
          n.position.set(HP[i].x-0.25*Math.min(tf,0.5)-0.1,fy,HP[i].z*(1+0.6*Math.min(tf,0.5)));
          dv.set(DIR[i].x,DIR[i].y*(1-lay)-0.05*lay,DIR[i].z+0.4*lay*Math.sign(HP[i].z||1)).normalize();n.quaternion.setFromUnitVectors(XA,dv);}}
      const vis=te>=T0[i]&&te<TH[i]+0.1;
      if(vis){const kk=Math.min(k,1);qb(SP[i],MP[i],HP[i],kk,cp);qb(SP[i],MP[i],HP[i],Math.max(kk-0.2,0),pt);poseStreak(s,pt,cp,true);}
      else s.visible=false;}
    ndMat.uniforms.uGl.value=0.5*erz*(1-ss(TA,TA+0.2,te));
    // espina dorada: sale después, cruza al rival y sigue por detrás
    const gk=cl((te-TG0)/(TGH-TG0)), gx=cl((te-TGH)/(TGX-TGH));
    gold.visible=te>0.12&&te<TGX;
    if(te<TG0){gold.position.copy(G0);gold.position.y+=0.03*Math.sin(te*50);gold.quaternion.setFromUnitVectors(XA,dv.copy(GH).sub(G0).normalize());gold.scale.set(2.2*ss(0.12,0.3,te)+0.001,1.6,1.6);}
    else if(te<TGH){gold.position.lerpVectors(G0,GH,gk*gk);gold.quaternion.setFromUnitVectors(XA,dv.copy(GH).sub(G0).normalize());gold.scale.set(2.2,1.6,1.6);}
    else{gold.position.lerpVectors(GH,G1,gx);gold.quaternion.setFromUnitVectors(XA,dv.copy(G1).sub(GH).normalize());gold.scale.set(2.2*(1-0.6*gx),1.6*(1-0.6*gx),1.6*(1-0.6*gx));}
    gdMat.uniforms.uGl.value=0.6+0.6*(te>TG0?1:0);
    const gvis=te>=TG0&&te<TGX+0.08;
    if(gvis){pt.copy(te<TGH?G0:GH).lerp(gold.position,te<TGH?Math.max(0,1-0.55/Math.max(gold.position.distanceTo(G0),0.01)):0);
      if(te>=TGH)pt.copy(GH).lerp(G0,0.25*(1-gx));poseStreak(gstreak,pt,gold.position,true);gstreak.children[0].material.uniforms.uA.value=1-ss(TGX-0.05,TGX+0.08,te);}
    else gstreak.visible=false;
    spark.pose(ia,TC,1); sparkB.pose(te-TGH-0.03,tmp2.set(3.65,0.95,0),0.9);
    ring.pose(te-FIRST,3.4,0,0.45);
    const fall=ss(TF,TF+0.35,te);
    target.position.x=3.4+Math.min(kick,0.2)+0.12*hitE(te-TGH,6)*(te>=TGH?1:0); target.rotation.z=-Math.min(kick,0.2)*0.8*Math.cos(te*40);
    if(te<TA){o.g.set(CF.x+0.2,CF.y+0.2,0);o.gs=0.9*erz;o.ga=0.15*erz;o.li=1.6*erz;}
    else if(te<FIRST){const k=cl((te-TA)/(FIRST-TA));o.g.set(CF.x+(TC.x-CF.x)*k,CF.y+(TC.y-CF.y)*k+0.5*Math.sin(Math.PI*k),0);o.gs=0.8;o.ga=0.12;o.li=1.8;}
    else{const t=te-TH[Math.max(last,0)];o.g.copy(TC);o.gs=1+1.2*Math.min(t,0.4);o.ga=0.12*Math.exp(-t*12)*(1-fall);o.li=1+2.5*Math.exp(-t*8)*(1-fall);}
    o.ia=ia; o.c.copy(TC); o.shake=0.5; o.dist=0.4; o.flash=0.6;
  };
}});

VFX.module("Estilizado · Planta · Cuernos",defs);
})();

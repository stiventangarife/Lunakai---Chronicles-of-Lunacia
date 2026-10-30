// =====================================================================
// ESTILIZADO · PLANTA · OREJAS (Hito 101) — las 7 cartas de mod-planta-orejas.js rehechas a mano con el kit
// vfx-stylized.js: Beetroot (se registra como boca), Leafy, Lotus, Rosa, Sakura, Hollow y Clover.
// Claves sty_<clave original>; mismos dur, ti y fases que los originales (el daño llega igual).
// Estilo (Hito 99): materia con mezcla normal y luz del sol en 3 bandas, núcleos de energía pequeños, rampas de
// color, erosión desde el borde, sin contornos. Los Axies ya tienen orejas: los efectos nacen de su posición.
// Cambios de concepto respecto al original (para que cuadren con la carta en el juego):
//   · Hollow: el tronco cae EN la casilla elegida (el original lo dejaba 1,4 u. antes) y se consume en musgo al
//     aparecer el poste real del tablero.
//   · Clover: el amuleto protector se abre sobre el aliado que recibe el escudo (no sobre el lanzador).
//   · Sakura: un solo aliado (la carta es de objetivo único).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS}=VFX;
const {v3,billboard,towardCam,taperTube,SD_HEART}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas (los módulos originales no se cargan junto a este)
const pal=(n,c)=>{if(!VFX.PALETTES?.[n])VFX.palette(n,c);};
pal("Remolacha",["#ff5c9e","#8c0f4a"]); pal("Loto",["#b8f4ff","#2f8fd0"]); pal("Sakura",["#ffd6ea","#ff5fa2"]);
pal("Musgo",["#c8ff7e","#4f7d2a"]); pal("Savia",["#d8ff72","#2a9b3e"]); pal("Rubí",["#ff4f73","#a10f35"]);
pal("Esmeralda",["#e6ffb4","#12a35c"]);

const PI=Math.PI, TX=3.4, TC=V3(3.15,1.2,0);
const EAR0=V3(-3.72,1.82,-0.26), EAR1=V3(-3.72,1.82,0.26);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.6,.48,.34)", SOIL="vec3(.36,.25,.16)", WOOD="vec3(.55,.38,.22)";
const EARS=`const vec3 E0=${v3(EAR0)};const vec3 E1=${v3(EAR1)};vec3 ear(){return aSeed.x<.5?E0:E1;}
vec3 bz(vec3 a,vec3 b,vec3 c,float k){return mix(mix(a,b,k),mix(b,c,k),k);}`;

// ---------- fragmentos de partícula propios ----------
// pétalo con muesca (rosa, cerezo): curvatura falsa para la luz en 3 bandas; vMix ensancha o estrecha (vuelco)
const PETAL_STY=col=>S.PV+`void main(){vec2 q=styPC()-.5;q.x/=(.45+.55*vMix);
 float d=length(q*vec2(1.75,1.05)+vec2(0.,.05));float notch=smoothstep(.04,.1,length(q-vec2(0.,.47)));
 float m=smoothstep(.42,.36,d)*notch;if(m<.01)discard;
 float er=styErode(styNoise(q*.6+vMix).r*.55+(.42-d)*1.3,vK*1.05-.05,.1);float a=m*er*vA;if(a<.01)discard;
 float l=styLight(normalize(vec3(q.x*1.8,q.y*.7-.15,1.)),stySunV());
 vec3 c=styRampOf(${col},.28+.5*l+.18*smoothstep(-.4,.35,q.y))*styTint(l);
 gl_FragColor=vec4(c,a);}`;
// hoja de otoño (color por partícula: naranja, rojo o dorado) — contrasta con la hierba
const AUTUMN="(vMix<.4?vec3(.95,.46,.1):(vMix<.75?vec3(.78,.14,.07):vec3(.95,.72,.16)))";
// trébol de cuatro hojas: cuatro corazones; altura falsa desde la distancia para la luz en bandas
const SD_CLOVER=SD_HEART+`vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
float sdClover(vec2 p){float d=1e5;for(int i=0;i<4;i++){vec2 q=rot2(p,float(i)*1.5708+.7854);d=min(d,sdHeart(q*1.25+vec2(0.,.04))/1.25);}return d;}
vec3 cloverCol(vec2 p,float er){float d=sdClover(p);float e=.03;
 float hx=sdClover(p+vec2(e,0.))-sdClover(p-vec2(e,0.)),hy=sdClover(p+vec2(0.,e))-sdClover(p-vec2(0.,e));
 float h=smoothstep(0.,.3,-d);vec3 n=normalize(vec3(hx*8.*(1.-h),hy*8.*(1.-h),1.));float l=styLight(n,stySunV());
 float an=atan(p.y,p.x);float vein=smoothstep(.05,.0,abs(fract(an/1.5708+.5)-.5)*length(p)*1.6)*step(.08,length(p));
 vec3 c=styRampOf(vec3(.08,.5,.22),.15+.45*l+.1*h)*styTint(l)+vec3(.4,.8,.3)*vein*.15;
 return c;}`;
const CLOVER_PT=S.PV+SD_CLOVER+`void main(){vec2 p=(styPC()-.5)*2.2;float d=sdClover(p);if(d>.02)discard;
 float er=styErode(styNoise(p*.4+vMix).r*.6+smoothstep(0.,.4,-d)*.5,vK*1.05-.05,.1);float a=smoothstep(.02,-.02,d)*er*vA;if(a<.01)discard;
 gl_FragColor=vec4(cloverCol(p,er),a);}`;
// «Z» del sueño (azul fijo: el estado Sueño tiene color propio)
const Z_STY=S.PV+`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){vec2 q=styPC()-.5;
 float d=min(min(sdSeg(q,vec2(-.22,.24),vec2(.22,.24)),sdSeg(q,vec2(.22,.24),vec2(-.22,-.24))),sdSeg(q,vec2(-.22,-.24),vec2(.22,-.24)));
 float core=smoothstep(.075,.05,d);float a=core*vA;if(a<.01)discard;
 gl_FragColor=vec4(mix(vec3(.25,.4,.95),vec3(.72,.84,1.),smoothstep(-.3,.3,q.y))*1.15,a);}`;

// ---------- materiales de malla compartidos ----------
// chispa del lanzamiento en las orejas
function earGlint(a,T0,T1,size){
  a.count+=S.pts(a.L.part,4,VV+EARS+`void main(){float k=clamp((uT-${f(T0)})/${f(T1-T0)},0.,1.);vec3 p=(aSeed.y<.5?E0:E1)+vec3(.08,.06,0.);
   vR=uT*3.+aSeed.z*6.;vK=0.;vA=(uT>${f(T0)}&&uT<${f(T1)})?sin(k*3.14159):0.;put(p,${f(size)}*(.7+.5*aSeed.w));}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
}
// marca de tierra húmeda / jugo en el suelo; uP = erosión
const POOL_FS=(col,alpha)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.68,r+(n-.5)*.5);
 float drops=smoothstep(.76,.82,styNoise(vUv*1.1+.17).g)*smoothstep(1.,.7,r);float mm=max(m,drops);if(mm<.01)discard;
 float er=styErode(n*.7+mm*.3,uP,.12);
 gl_FragColor=vec4(styRampOf(${col},.3+.35*n),mm*er*uA*${f(alpha)});}`;
// grietas de tierra en el suelo (bordes de las celdas del ruido); uP = erosión
const CRACK_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float g=styNoise(vUv*.9+.21).g;
 float cr=smoothstep(.06,.02,g)*smoothstep(1.,.35,r);float dk=smoothstep(.9,.2,r)*.35;float m=max(cr,dk);if(m<.01)discard;
 float er=styErode(styNoise(vUv*.6).r*.6+(1.-r)*.4,uP,.1);
 gl_FragColor=vec4(styRampOf(${SOIL},.1+.15*(1.-cr)),m*er*uA*.75);}`;
// brillo de un billboard de flor (rosa): pétalos en espiral, luz por anillos; uP = erosión
const ROSE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float edge=.9*(.84+.16*abs(cos(an*2.5)));if(r>edge)discard;
 float s=fract(r*2.7-an/6.2832+.15);float crease=smoothstep(.16,.02,s);
 float er=styErode(styNoise(p*.35+.5).r*.6+(1.-r/edge)*.4,uP,.1);if(er<.01)discard;
 float l=.35+.5*smoothstep(0.,.5,s)*(1.-r*.4)+.15*(1.-r);
 vec3 c=styRampOf(vec3(.8,.07,.18),clamp(l-crease*.35,0.,1.))*styTint(step(.5,l));
 gl_FragColor=vec4(c,er*uA*smoothstep(edge,edge-.05,r));}`;
// cúpula de agua / escudo (energía suave, fresnel); uP = disolución
const DOME_FS=`void main(){vec3 n=normalize(vN);float fr=pow(1.-abs(dot(n,normalize(vV))),2.4);
 float w=styNoise(vUv*vec2(3.,1.4)+vec2(uT*.08,-uT*.12)).g;float cell=smoothstep(.12,.04,w);
 float er=styErode(styNoise(vUv*vec2(2.,1.)).r*.7+.3*(1.-vUv.y),uP,.1);
 gl_FragColor=vec4(styRamp(.55+.35*fr)*1.1,(fr*.7+cell*.18)*er*uA);}`;

const defs=[];

// =====================================================================
// 1 · BEETROOT — una remolacha gigante se materializa sobre el rival, cae como un mazo, lo aplasta con un
//     reventón de jugo y tierra y luego se deshace en jugo. El lanzador gana 1 PM: hojitas en sus pies.
// =====================================================================
const BEET_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float an=atan(vP.z,vP.x);vec2 tc=vec2(an*.32,vP.y*.55);
 float er=styErode(styNoise(tc*1.4+.2).r*.75+.25*(1.-abs(vP.y)),uEr,.06);if(er<.5)discard;
 float ring=smoothstep(.35,.7,sin(vP.y*30.+styNoise(tc).r*4.))*.12;
 vec3 skin=vec3(.5,.05,.25);vec3 c=styRampOf(skin,.2+.55*l-ring)*styTint(l);
 c=mix(c,styRampOf(vec3(.75,.38,.28),.4+.4*l),smoothstep(-.55,-.85,vP.y)*.6);           // raíz terrosa
 float sp=smoothstep(.94,.97,dot(reflect(-stySunV(),n),normalize(vV)));c+=vec3(1.,.85,.95)*sp*.45;
 c=mix(c,styRampOf(uC1,.75),smoothstep(.06,.0,er-.5)*step(.0,uEr));                         // borde de jugo al deshacerse
 gl_FragColor=vec4(c,1.);}`;
const LEAF_PLANE_FS=`uniform float uEr;void main(){vec4 s=styShape(2.,vUv);if(s.r<.05)discard;
 float er=styErode(s.r*.5+s.b*.5,uEr,.08);if(er<.5)discard;
 float l=styLight(styShapeN(2.,vUv,4.),stySunV());
 vec3 c=styRampOf(vec3(.22,.5,.16),.25+.5*l+s.g*.15)*styTint(l);
 c=mix(c,vec3(.62,.08,.22),smoothstep(.1,.0,abs(vUv.x-.5))*.7);                             // nervio rojo de la remolacha
 gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_poBeetroot",name:"Beetroot (estilizado)",dur:2.2,ti:0.86,pal:"Remolacha",stylized:true,
  phases:[["Brote",0],["Materialización",0.22],["Caída",0.62],["Impacto",0.86],["Reventón",1.3],["Disipación",1.7]],
build(a){
  const L=a.L,TM=0.22,TF=0.62,TI=0.86,TD=1.3,Y0=4.0,Y1=1.3,BS=1.05;
  a.count=0;
  earGlint(a,0,0.3,0.32);
  const prof=[[0,-0.95],[0.03,-0.8],[0.08,-0.62],[0.22,-0.45],[0.42,-0.3],[0.58,-0.1],[0.62,0.05],[0.57,0.22],[0.42,0.38],[0.22,0.48],[0.08,0.52],[0,0.53]];
  const beet=new THREE.Group(); L.mesh.add(beet);
  const bm=S.mat(BEET_FS,{uEr:{value:-0.2}},{mode:'solid',side:THREE.DoubleSide});
  beet.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x,y])=>new THREE.Vector2(x,y)),40),bm));
  const lm=S.mat(LEAF_PLANE_FS,{uEr:{value:-0.2}},{mode:'solid',side:THREE.DoubleSide});
  const lg=new THREE.PlaneGeometry(0.5,0.85).translate(0,0.42,0);
  for(let i=0;i<5;i++){const p=new THREE.Group(),m=new THREE.Mesh(lg,lm);p.rotation.y=i*PI*2/5+0.3;m.rotation.x=0.5+0.15*(i%2);m.scale.setScalar(0.85+0.2*(i%3)/2);
    p.add(m);p.position.y=0.48;beet.add(p);}
  const shadow=S.contactShadow(L.decal,1.6);
  const juice=groundPlane(3.0,TX,0.024,S.mat(POOL_FS('vec3(.55,.03,.22)',0.9),{},{mode:'matter'})); L.decal.add(juice);
  const crack=groundPlane(2.4,TX,0.021,S.mat(CRACK_FS,{},{mode:'matter'})); L.decal.add(crack);
  const ring=S.groundRing(L.decal,3.4), spark=S.hitSpark(L.mesh,1.9,{seed:0.61});
  const K=`const float TM=${f(TM)};const float TF=${f(TF)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 BP=vec3(${f(TX)},${f(Y0)},0.);`;
  // motas magenta que se reúnen donde aparece la remolacha
  a.count+=S.pts(L.part,18,VV+K+`void main(){float s=TM-.12+aSeed.x*.3;float life=.22;float age=(uT-s)/life;
   vec3 d=normalize(rnd());vec3 p=BP+d*mix(1.5,.3,age*age);vR=0.;vK=0.;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // impacto: terrones de tierra, gotas de jugo y polvo
  a.count+=S.pts(L.part,16,VV+K+`void main(){float t=uT-TI-aSeed.x*.03;float life=.55+aSeed.y*.25;float age=t/life;
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=vec3(${f(TX)},.1,0.)+d*(.4+(1.3+1.6*aSeed.w)*t)+vec3(0.,(2.4+1.6*aSeed.y)*t-6.5*t*t,0.);
   vA=(t>0.&&age<1.&&p.y>-.02)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.2+.1*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:SOIL}));
  a.count+=S.pts(L.part,26,VV+K+`void main(){float s=aSeed.x<.5?TI:TD;float t=uT-s-aSeed.y*.04;float life=.5+aSeed.z*.3;float age=t/life;
   vec3 d=normalize(rnd()+vec3(0.,.9,0.));float sp=aSeed.x<.5?2.6:3.4;
   vec3 o=aSeed.x<.5?vec3(${f(TX)},.35,0.):vec3(${f(TX)},${f(Y1)},0.);
   vec3 p=o+d*sp*t+vec3(0.,-6.*t*t,0.);vR=atan(d.x,d.y)+3.14159;vK=smoothstep(.6,1.,age);
   vA=(t>0.&&age<1.&&p.y>.02)?1.:0.;put(p,(.2+.12*aSeed.w)*(aSeed.x<.5?1.:1.3));}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.72,.05,.3)'}));
  a.count+=S.pts(L.part,10,VV+K+`void main(){float t=uT-TI-aSeed.x*.05;float life=.6+aSeed.y*.3;float age=t/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX)},.12,0.)+vec3(cos(an),0.,sin(an))*(.6+1.1*(1.-exp(-t*5.)))+vec3(0.,t*.45,0.);
   vA=(t>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.38+.18*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // reventón: trozos de pulpa
  a.count+=S.pts(L.part,14,VV+K+`void main(){float t=uT-TD;float life=.55+aSeed.y*.2;float age=t/life;
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=vec3(${f(TX)},${f(Y1)},0.)+d*(2.+1.2*aSeed.w)*t+vec3(0.,-6.*t*t,0.);
   vA=(t>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.z*6.28+t*9.;put(p,.24+.1*aSeed.x);}`,S.MATTER_FS(C.shard,{relief:4,col:'vec3(.82,.12,.38)'}));
  // +1 PM al lanzador: hojitas que suben en espiral desde sus pies
  a.count+=S.pts(L.part,10,VV+K+`void main(){float s=TI+.04+aSeed.x*.2;float t=uT-s;float life=.5;float age=t/life;
   float an=aSeed.z*6.2832+t*7.;vec3 p=vec3(-3.7+cos(an)*.55,.08+t*1.6,sin(an)*.55);
   vR=an;vK=smoothstep(.6,1.,age);vA=(t>0.&&age<1.)?1.:0.;put(p,.2+.06*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.32,.7,.22)'}));
  a.pose=function(te,o){
    const ia=te-TI, id=te-TD;
    caster.rotation.z=0.05*ss(0,0.15,te)-0.06*ss(TF-0.05,TF+0.05,te)+0.01*ss(TI,TI+0.3,te);
    const fall=ss(TF,TI,te), y=te<TF?Y0+0.12*Math.sin(te*5):Y0+(Y1-Y0)*fall*fall;
    const sq=ia>=0?0.22*Math.exp(-ia*9)*Math.cos(ia*22):0;
    beet.visible=te>TM-0.04&&id<0.2;
    beet.position.set(TX,y,0); beet.rotation.set(0,te*0.8+0.4,te<TI?0.25*(1-fall)*Math.sin(te*4):0.06*hitE(ia,4));
    beet.scale.set(BS*(1+sq*0.6),BS*(1-sq),BS*(1+sq*0.6));
    const reveal=1-ss(TM-0.04,TF-0.08,te), burst=ss(TD,TD+0.18,te);
    bm.uniforms.uEr.value=Math.max(reveal*1.05-0.05,burst*1.1)-0.12; lm.uniforms.uEr.value=bm.uniforms.uEr.value;
    const hgt=Math.max(y-0.6,0); shadow.pose(TX,0,0.6+0.5*cl(1-hgt/3.5),te>TM&&id<0.2?0.25+0.5*cl(1-hgt/3.5):0);
    set(juice,ia>=0?-0.1+1.1*ss(1.75,2.2,te):1,ia>=0?1:0); juice.scale.setScalar(Math.max(0.5+0.5*ss(TI,TI+0.2,te)+0.3*ss(TD,TD+0.2,te),0.01));
    set(crack,-0.1+1.1*ss(1.6,2.1,te),ia>=0?1:0);
    ring.pose(ia,TX,0,0.45,1.1); spark.pose(ia,tmp.set(TX-0.15,0.95,0),1.1);
    const h=hitE(ia,7); target.position.y=-0.14*h*(1-ss(TD,TD+0.2,te))*(ia>=0?1:0); target.position.x=TX+0.08*h; target.rotation.z=-0.12*h*Math.cos(ia*18);
    if(te<TF){o.g.set(TX,Y0,0);o.gs=0.9;o.ga=0.12*ss(TM-0.1,TM+0.1,te);o.li=1.2*ss(TM-0.1,TM+0.2,te);}
    else if(te<TI){o.g.set(TX,y,0);o.gs=1;o.ga=0.12;o.li=1.4;}
    else{o.g.set(TX,0.9,0);o.gs=1.2+1.2*Math.min(ia,0.3);o.ga=0.25*Math.exp(-ia*9)+(id>=0?0.18*Math.exp(-id*8):0);o.li=4*Math.exp(-ia*6)+(id>=0?2*Math.exp(-id*7):0);}
    o.ia=ia; o.c.set(TX,0.9,0); o.shake=ia>=0&&ia<0.25?0.45*Math.exp(-ia*10):0; o.dist=0.4; o.flash=0;
  };
}});

// =====================================================================
// 2 · LEAFY — un remolino de hojas de otoño se forma ante el Axie, viaja al rival y lo envuelve con cortes
//     (dos golpes de la carta: el principal en 0,48 s y el segundo en 0,62 s); luego las hojas salen despedidas.
// =====================================================================
const TORN_FS=(spd,k,tw)=>`void main(){float h=vP.y/2.6;float an=atan(vP.z,vP.x)/6.2832;
 vec2 uv=vec2(an*${f(k)}+h*${f(tw)}-uT*${f(spd)},h*.22+uT*.05);vec4 nz=styNoise(uv);
 float st=smoothstep(.5,.62,nz.r);
 float fade=smoothstep(0.,.15,h)*smoothstep(1.,.65,h);
 float er=styErode(nz.r,uP,.12);
 gl_FragColor=vec4(styRamp(.5+.4*nz.g)*1.15,st*fade*er*uA*.85);}`;
const SLASH_STY=`uniform float uEr;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.02)discard;
 float er=styErode(m*.55+s.b*.45,uEr,.1);
 gl_FragColor=vec4(styRamp(.55+.45*s.g)*1.25+vec3(1.,.9,.6)*s.g*.25,m*er*uA);}`;
defs.push({key:"sty_poLeafy",name:"Leafy (estilizado)",dur:1.3,ti:0.48,pal:"Savia",stylized:true,
  phases:[["Remolino",0],["Avance",0.15],["Cortes",0.38],["Ráfaga",0.78],["Calma",1.0]],
build(a){
  const L=a.L,TT=0.15,TA=0.38,TO=0.78,X0=-2.5,TS=0.62,CUTS=[[0.40,0.8,0.8],[0.48,-0.9,1.25],[0.62,0.3,1.05]];
  a.count=0;
  earGlint(a,0,0.22,0.26);
  const cxJ=te=>X0+(TX-X0)*ss(TT,TA,te);
  const tg=new THREE.CylinderGeometry(1.0,0.25,2.6,40,10,true).translate(0,1.3,0);
  const torn=new THREE.Group(), t1=new THREE.Mesh(tg,S.mat(TORN_FS(1.6,3,1.4),{},{mode:'energy'})), t2=new THREE.Mesh(tg,S.mat(TORN_FS(-1.2,2,-1.0),{},{mode:'energy'}));
  t2.scale.set(0.78,0.92,0.78); torn.add(t1,t2); L.trail.add(torn);
  const swirl=groundPlane(2.0,X0,0.03,S.mat(`void main(){vec2 p=vUv-.5;float an=atan(p.y,p.x)-uT*5.;vec2 q=vec2(cos(an),sin(an))*length(p)+.5;
   vec4 s=styShape(7.,q);gl_FragColor=vec4(styRamp(.6+.3*s.g),s.r*uA*.7);}`,{},{mode:'energy'})); L.decal.add(swirl);
  const shadow=S.contactShadow(L.decal,2.0);
  const slashes=CUTS.map(([t,ang,sz])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7*sz,0.85*sz),S.mat(SLASH_STY,{uEr:{value:0}},{mode:'energy',depthTest:false}));
    m.userData={t,ang};L.trail.add(m);return m;});
  const spark=S.hitSpark(L.mesh,1.6,{seed:0.23});
  const K=EARS+`const float TT=${f(TT)};const float TA=${f(TA)};const float TO=${f(TO)};
  float cx(float t){float k=clamp((t-TT)/(TA-TT),0.,1.);k=k*k*(3.-2.*k);return mix(${f(X0)},${f(TX)},k);}`;
  // hojas de otoño: nacen en las orejas, giran en el remolino, viajan con él y salen despedidas al final
  a.count+=S.pts(L.part,46,VV+K+`void main(){float t=uT;float born=.02+aSeed.x*.12;float h=.1+aSeed.y*1.45;float rad=(.32+.28*h+.12*aSeed.z)*${f(TS+0.3)};
   float an=aSeed.w*6.2832+t*(9.+4.*aSeed.z);float ob=max(t-TO-aSeed.x*.08,0.);
   rad+=ob*(1.5+1.2*aSeed.z);float y=h+ob*1.2-ob*ob*3.6;
   vec3 orb=vec3(cx(t)+cos(an)*rad,y,sin(an)*rad);float k=clamp((t-born)/.14,0.,1.);
   vec3 p=mix(ear(),orb,k*k*(3.-2.*k));p.y=max(p.y,.04);
   vR=an*1.3+aSeed.x*6.;vK=smoothstep(1.05,1.25,uT+aSeed.z*.1);vA=step(born,t);put(p,.2+.08*aSeed.z);}`,S.MATTER_FS(C.leaf,{relief:3,col:AUTUMN}));
  // polvo que levanta la base del remolino
  a.count+=S.pts(L.part,14,VV+K+`void main(){float life=.45+aSeed.y*.2;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float s=uT-age*life;float an=r.x*6.2832+age*3.;float rad=.3+age*(.4+.5*r.y);
   vec3 p=vec3(cx(s)+cos(an)*rad,.08+age*.35,sin(an)*rad);float env=smoothstep(.04,.15,s)*(1.-smoothstep(.7,.9,s));
   vA=k>=1.?env:0.;vK=smoothstep(.2,1.,age);vR=r.z*6.28;put(p,.3+.16*r.z);}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  a.pose=function(te,o){
    const x=cxJ(te), env=ss(0.02,0.15,te)*(1-ss(TO,TO+0.22,te)), wr=TS*(0.65+0.35*env+0.4*ss(TO,TO+0.22,te));
    caster.rotation.z=0.03*ss(0,0.12,te)-0.05*ss(TT-0.06,TT+0.06,te)+0.02*ss(TA,TA+0.25,te);
    torn.position.set(x,0,0); torn.scale.set(wr,TS*(0.35+0.65*ss(0.02,0.15,te)),wr); torn.visible=env>0.002;
    set(t1,ss(TO-0.05,TO+0.22,te)*1.05,env); set(t2,ss(TO-0.05,TO+0.22,te)*1.05,env*0.8);
    swirl.position.x=x; set(swirl,0,env*0.8); shadow.pose(x,0,1,env*0.8);
    let last=-1,li=-1; CUTS.forEach(([t],i)=>{if(te>=t){last=t;li=i;}});
    slashes.forEach(m=>{const {t,ang}=m.userData,s=(te-(t-0.05))/0.05;
      m.visible=s>=0&&te<t+0.3; towardCam(m.position,TC,0.7); billboard(m,ang);
      m.scale.setScalar(Math.max(0.5+0.5*Math.min(s,1)+0.15*Math.max(0,s-1),0.01)); m.material.uniforms.uA.value=1;
      m.material.uniforms.uEr.value=s<1?0.35*(1-s):ss(t+0.04,t+0.28,te)*1.1;});
    const ic=last>0?te-last:-1;
    spark.pose(ic,TC,li===1?1.1:0.75);
    const inW=ss(TA-0.05,TA+0.05,te)*(1-ss(TO,TO+0.2,te)), hc=hitE(ic,9)*(li===1?1.4:1);
    target.position.y=0.06*inW*(0.6+0.4*Math.sin(te*13)); target.position.x=TX+0.08*hitE(ic,6)*(li===1?1.8:1);
    target.rotation.z=(li%2?1:-1)*0.1*hc*Math.cos(ic*20)+0.03*inW*Math.sin(te*9);
    if(te<TA){o.g.set(x,0.85,0);o.gs=1;o.ga=0.12*env;o.li=1.5*env;}
    else{o.g.copy(TC);o.gs=0.9+1.2*cl(ic);o.ga=0.1*inW+(ic>=0?Math.exp(-ic*10)*0.35:0);o.li=1.2*inW+(ic>=0?(li===1?4:2.5)*Math.exp(-ic*6):0);}
    o.ia=ic; o.c.copy(TC); o.shake=0; o.dist=li===1?0.4:0.2; o.flash=0;
  };
}});

// =====================================================================
// 3 · LOTUS — gotas de las orejas forman un loto de agua sobre el aliado; al abrirse arranca los estados
//     alterados (humo morado), lo envuelve en una burbuja de agua (escudo) y deja caer gotas que curan.
// =====================================================================
function petalGeo(len,wid,cup){const nu=10,nv=6,pos=[],uv=[],idx=[];
  for(let i=0;i<=nu;i++){const u=i/nu,w=wid*Math.pow(Math.sin(PI*Math.min(u*0.92+0.04,1)),0.7);
    for(let j=0;j<=nv;j++){const v=j/nv*2-1;pos.push(-cup*v*v*Math.sin(PI*u*0.9)+0.12*len*u*u*u,u*len,v*w);uv.push(j/nv,u);}}
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const p=i*(nv+1)+j,q=p+nv+1;idx.push(p,q,p+1,q,q+1,p+1);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();return g;}
// pétalo de agua: luz en bandas en azul, punta rosada, vetas, borde con brillo de fresnel; uEr = erosión
const LOTUS_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float er=styErode(styNoise(vUv*vec2(1.,1.6)+.3).r*.7+(1.-vUv.y)*.3,uEr,.08);if(er<.01)discard;
 float vein=smoothstep(.05,0.,abs(vUv.x-.5))*.5+smoothstep(.05,0.,abs(fract(vUv.x*4.)-.5))*.2*vUv.y;
 vec3 c=styRampOf(vec3(.2,.5,.86),.22+.45*l+vein*.15)*styTint(l);
 c=mix(c,styRampOf(vec3(.98,.55,.72),.4+.45*l),smoothstep(.55,.95,vUv.y)*.8);
 float fr=pow(1.-abs(dot(n,normalize(vV))),2.);c+=uC1*fr*.18;
 gl_FragColor=vec4(c,er*.92);}`;
defs.push({key:"sty_poLotus",name:"Lotus (estilizado)",dur:2.3,ti:1.0,pal:"Loto",allies:1,stylized:true,
  phases:[["Aflicción",0],["Gotas",0.12],["Brote",0.45],["Floración",0.65],["Purificación",1.0],["Lluvia",1.15],["Calma",1.8]],
build(a){
  const L=a.L,TG=0.12,TB=0.45,TI=1.0,TR=1.15,TE=1.8,AP=ALLY_POS[0],LC=AP.clone().add(V3(0,2.25,0));
  a.count=0;
  earGlint(a,0.05,0.4,0.3);
  const lotus=new THREE.Group(); lotus.position.copy(LC); L.mesh.add(lotus);
  const pm=S.mat(LOTUS_FS,{uEr:{value:0}},{mode:'matter',side:THREE.DoubleSide});
  const petals=[];
  for(let row=0;row<2;row++)for(let i=0;i<6;i++){const p=new THREE.Group(),m=new THREE.Mesh(petalGeo(row?0.55:0.68,row?0.2:0.24,0.08),pm);
    p.rotation.y=i*PI/3+row*PI/6; p.add(m); lotus.add(p); petals.push({m,row});}
  const bud=new THREE.Mesh(new THREE.SphereGeometry(0.14,16,10),S.mat(`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
   gl_FragColor=vec4(styRampOf(vec3(1.,.8,.3),.35+.5*l)*styTint(l),uA);}`,{},{mode:'matter'})); lotus.add(bud);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.0,32,20,0,PI*2,0,PI*0.55),S.mat(DOME_FS,{},{mode:'energy'})); dome.position.copy(AP); dome.scale.set(1,1.55,1); L.mesh.add(dome);
  const ring=S.groundRing(L.decal,3.2), ring2=S.groundRing(L.decal,2.4), spark=S.hitSpark(L.mesh,1.5,{seed:0.8});
  const pool=groundPlane(2.2,AP.x,0.022,S.mat(POOL_FS('vec3(.35,.62,.85)',0.5),{},{mode:'matter'})); pool.position.z=AP.z; L.decal.add(pool);
  const K=EARS+`const float TG=${f(TG)};const float TB=${f(TB)};const float TI=${f(TI)};const float TR=${f(TR)};const vec3 LC=${v3(LC)};const vec3 AP=${v3(AP)};`;
  // gotas de las orejas al centro del loto
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TG+aSeed.y*.22;float u=clamp((uT-s)/.2,0.,1.);vec3 m=mix(ear(),LC,.5)+vec3(0.,1.2,0.)+rnd()*.3;
   vec3 p=bz(ear(),m,LC,u*u*(3.-2.*u));vR=3.14159+(u-.5)*1.5;vK=0.;vA=(uT>s&&u<1.)?1.:0.;put(p,.2+.06*aSeed.z);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.4,.72,.96)'}));
  // purificación: humo morado oscuro que se arranca del aliado
  a.count+=S.pts(L.part,12,VV+K+`void main(){float s=TI+aSeed.x*.12;float t=uT-s;float life=.6+aSeed.y*.2;float age=t/life;
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*.35,.4+aSeed.w*.9,sin(an)*.35)+vec3(cos(an)*.9,1.4,sin(an)*.9)*(1.-exp(-t*3.));
   vA=(t>0.&&age<1.)?1.:0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28+t;put(p,(.35+.15*aSeed.x)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:'vec3(.36,.22,.45)'}));
  // lluvia: gotas que caen del loto sobre el aliado
  a.count+=S.pts(L.part,30,VV+K+`void main(){float s=TR+aSeed.x*.55;float t=uT-s;vec3 r=rnd();
   vec3 p=LC+vec3(r.x*.7,-.15-5.5*t*t-1.2*t,r.z*.7);vR=3.14159;vK=step(p.y,.05);
   vA=(t>0.&&p.y>.03)?1.:0.;put(p,.15+.05*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:'vec3(.45,.78,1.)'}));
  // curación: chispas verdes que suben
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TI+.05+aSeed.x*.5;float t=uT-s;float life=.45;float age=t/life;
   vec3 p=AP+vec3(rnd().x*.55,.3+aSeed.w*.8+t*1.3,rnd().z*.55);vR=0.;vK=age;vA=(t>0.&&age<1.)?1.:0.;put(p,.16+.05*aSeed.y);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.05*ss(0,0.12,te)-0.07*ss(TG,TG+0.1,te)+0.03*ss(0.3,0.6,te);
    const grow=ss(TB-0.05,0.65,te), open=back(cl((te-0.62)/0.42)), fade=ss(1.6,2.05,te);
    lotus.visible=te>TB-0.06&&fade<1; lotus.scale.setScalar(Math.max(0.2+0.8*grow,0.01)*(1+0.08*hitE(ia,10)));
    lotus.rotation.y=te*0.6; lotus.position.y=LC.y+0.05*Math.sin(te*3)-0.25*ss(1.4,2.0,te);
    petals.forEach(({m,row})=>{m.rotation.z=-(0.08+(row?0.75:1.15)*open);});
    pm.uniforms.uEr.value=-0.1+1.15*fade; bud.material.uniforms.uA.value=1-fade;
    const de=ss(TI-0.02,TI+0.2,te)*(1-ss(1.65,2.1,te)); dome.visible=de>0.002;
    dome.scale.set(1+0.08*hitE(ia,8),1.55*(0.4+0.6*ss(TI-0.02,TI+0.25,te)),1+0.08*hitE(ia,8)); set(dome,ss(1.6,2.1,te)*1.05,de*0.85);
    ring.pose(ia,AP.x,AP.z,0.45); ring2.pose(te-TR-0.25,AP.x,AP.z,0.5,0.9); spark.pose(ia,LC,0.9);
    set(pool,-0.1+1.1*ss(1.85,2.3,te),ss(TR+0.15,TR+0.45,te)); pool.scale.setScalar(Math.max(0.5+0.5*ss(TR,TR+0.5,te),0.01));
    const al=allies[0].userData.m; al.emissive.copy(U.uC1.value); al.emissiveIntensity=ia>=0?0.45*Math.exp(-ia*6)+0.12*de:0;
    allies[0].rotation.z=ia>=0?0.06*Math.exp(-ia*5)*Math.sin(ia*14):0;
    const cy=1.1;
    if(te<TB){o.g.copy(LC);o.gs=0.6;o.ga=0.08*ss(TG,TB,te);o.li=1;}
    else if(te<TI){o.g.copy(LC);o.gs=0.9;o.ga=0.1;o.li=1.5;}
    else{o.g.set(AP.x,cy,AP.z);o.gs=1.4;o.ga=0.25*Math.exp(-ia*8)+0.04*de;o.li=3.5*Math.exp(-ia*5)+0.8*de;}
    o.ia=ia; o.c.set(AP.x,cy,AP.z); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// 4 · ROSA — pétalos de las orejas siembran el suelo del rival; brotan ramas espinosas con rosas que lo enredan
//     (impacto), y queda dormido (zetas azules, se mece) y envenenado (burbujas).
// =====================================================================
const VINE_FS=`uniform float uGrow;uniform float uD;void main(){float u=vUv.x;if(u>uGrow)discard;
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float er=styErode(styNoise(vec2(u*3.,vUv.y)).r*.7+.3,uD,.06);if(er<.5)discard;
 float st=smoothstep(.3,.7,sin(u*60.+vUv.y*6.28))*.1;
 vec3 c=styRampOf(vec3(.16,.34,.1),.15+.5*l+st+.12*u)*styTint(l);
 c=mix(c,styRampOf(vec3(.85,.9,.4),.7),smoothstep(.04,0.,uGrow-u)*step(uGrow,.999));
 gl_FragColor=vec4(c,1.);}`;
const THORN_FS=`uniform float uGrow;uniform float uD;void main(){if(vUv.x>uGrow)discard;if(uD>.5)discard;
 vec3 n=normalize(vN);float l=styLight(n,stySunV());
 gl_FragColor=vec4(styRampOf(vec3(.55,.12,.12),.2+.55*l)*styTint(l),1.);}`;
defs.push({key:"sty_poRosa",name:"Rosa (estilizado)",dur:1.5,ti:0.42,pal:"Rubí",stylized:true,
  phases:[["Siembra",0],["Brote",0.16],["Enredo",0.42],["Sueño",0.55],["Disipación",1.15]],
build(a){
  const L=a.L,TG=0.16,TI=0.42,TS=0.55,TE=1.15,HD=V3(3.3,1.9,0);
  a.count=0;
  earGlint(a,0,0.2,0.26);
  const VG=new THREE.Group(); L.mesh.add(VG);
  const vm=S.mat(VINE_FS,{uGrow:{value:0},uD:{value:-0.1}},{mode:'solid',side:THREE.DoubleSide});
  const tm=S.mat(THORN_FS,{uGrow:{value:0},uD:{value:0}},{mode:'solid'});
  const thornParts=[], tips=[];
  for(let i=0;i<5;i++){
    const a0=i*PI*2/5+0.3, pts=[], dir=i%2?1:-1, H=1.15+0.35*((i*7)%5)/4;
    for(let k=0;k<=8;k++){const t=k/8,ang=a0+dir*t*2.6,r=0.62-0.3*t+0.05*Math.sin(t*9+i);pts.push(V3(TX+Math.cos(ang)*r,t*H,Math.sin(ang)*r));}
    const cv=new THREE.CatmullRomCurve3(pts);
    VG.add(new THREE.Mesh(taperTube(cv,40,6,0.09,0.025),vm));
    tips.push(cv.getPointAt(1).clone());
    for(let j=1;j<7;j++){const u=j/7.3,p=cv.getPointAt(u),tg=cv.getTangentAt(u),out=V3(p.x-TX,0,p.z).normalize();
      const d=out.multiplyScalar(0.8).add(V3(0,0.45,0)).add(tg.clone().multiplyScalar(0.2)).normalize();
      const g=new THREE.ConeGeometry(0.035,0.14,5).translate(0,0.07,0).toNonIndexed();
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0,1,0),d)); g.translate(p.x+d.x*0.04,p.y+d.y*0.04,p.z+d.z*0.04);
      const uv=g.attributes.uv; for(let q=0;q<uv.count;q++)uv.setXY(q,u,0.5); thornParts.push(g);}
  }
  // espinas en una sola geometría (uv.x = posición en la rama: aparecen cuando la rama crece hasta ahí)
  const tpos=[],tnor=[],tuv=[]; for(const g of thornParts){tpos.push(...g.attributes.position.array);tnor.push(...g.attributes.normal.array);tuv.push(...g.attributes.uv.array);g.dispose();}
  const tg=new THREE.BufferGeometry(); tg.setAttribute("position",new THREE.Float32BufferAttribute(tpos,3)); tg.setAttribute("normal",new THREE.Float32BufferAttribute(tnor,3)); tg.setAttribute("uv",new THREE.Float32BufferAttribute(tuv,2));
  VG.add(new THREE.Mesh(tg,tm));
  const roses=tips.filter((_,i)=>i%2===0||i===3).map(p=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.5),S.mat(ROSE_FS,{},{mode:'matter'}));
    m.userData.p=p.clone().add(V3(0,0.06,0)); VG.add(m); return m;});
  const seed=groundPlane(2.4,TX,0.022,S.mat(POOL_FS('vec3(.3,.2,.12)',0.6),{},{mode:'matter'})); L.decal.add(seed);
  const ring=S.groundRing(L.decal,3.0), spark=S.hitSpark(L.mesh,1.6,{seed:0.44});
  const poison=S.status(a,'poison',[target],TS-0.05,TE+0.3);
  const K=EARS+`const float TG=${f(TG)};const float TI=${f(TI)};const float TS=${f(TS)};const float TE=${f(TE)};const vec3 HD=${v3(HD)};`;
  // pétalos que vuelan de las orejas al suelo del rival
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=aSeed.y*.08;float u=clamp((uT-s)/.16,0.,1.);vec3 r=rnd();
   vec3 e=vec3(${f(TX)}+r.x*.6,.05,r.z*.6);vec3 p=bz(ear(),mix(ear(),e,.5)+vec3(0.,1.4+r.y*.4,0.),e,u)+vec3(0.,0.,sin(u*6.+aSeed.w*6.)*.12);
   vR=u*8.+aSeed.w*6.;vK=smoothstep(TG,TI+.05,uT);vA=uT>s?1.:0.;put(p,.22+.06*aSeed.z);}`,PETAL_STY('vec3(.86,.14,.26)'));
  // tierra que salta al brotar las ramas
  a.count+=S.pts(L.part,12,VV+K+`void main(){float t=uT-TG-aSeed.x*.08;float life=.45;float age=t/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},.08,0.)+vec3(cos(an),0.,sin(an))*(.45+.9*t)+vec3(0.,1.8*t-5.*t*t,0.);
   vA=(t>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*7.;put(p,.16+.08*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:SOIL}));
  // zetas del sueño
  a.count+=S.pts(L.part,4,VV+K+`void main(){float life=.7;float k=(uT-TS)/life+aSeed.x;float age=fract(k);
   vec3 p=HD+vec3(.1+age*.45,age*.7,(aSeed.z-.5)*.3)+vec3(sin(age*6.+aSeed.y*6.)*.08,0.,0.);
   vR=-.3+.3*sin(age*5.);vK=0.;vA=(uT>TS&&uT<TE+.1&&k>=1.)?sin(age*3.14159)*(1.-smoothstep(TE-.1,TE+.1,uT)):0.;put(p,.22+.12*age);}`,Z_STY,{mode:'matter'});
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(TG,TI+0.02,te), diss=ss(TE-0.3,TE+0.05,te);
    caster.rotation.z=0.04*ss(0,0.1,te)-0.05*ss(0.08,0.16,te);
    const sway=ss(TS,TS+0.15,te)*(1-ss(TE,TE+0.2,te));
    target.rotation.z=0.12*sway*Math.sin((te-TS)*5)-0.1*hitE(ia,8)*Math.cos(ia*18); target.position.x=TX+0.06*hitE(ia,7); target.position.y=-0.03*sway;
    VG.position.set(target.position.x-TX,0,0); VG.visible=te>TG-0.01&&diss<1;
    vm.uniforms.uGrow.value=grow*1.02; vm.uniforms.uD.value=-0.1+1.15*diss; tm.uniforms.uGrow.value=grow; tm.uniforms.uD.value=diss;
    roses.forEach((m,i)=>{const k=back(cl((te-TI+0.04-i*0.03)/0.16));m.visible=k>0.001&&diss<1;towardCam(m.position,m.userData.p,0.15);
      billboard(m,i);m.scale.setScalar(Math.max(k*(0.9+0.15*i),0.001));set(m,-0.1+1.15*diss,1);});
    set(seed,-0.1+1.1*ss(TE,TE+0.3,te),ss(0.08,0.2,te)); ring.pose(ia,TX,0,0.4); spark.pose(ia,TC,0.95);
    const pe=poison.pose(te);
    S.statusGlow(o,[{kind:'poison',env:pe*0.7}]);
    if(te<TI){o.g.set(TX,0.4,0);o.gs=0.9;o.ga=0.06*grow;o.li=1.2*grow;}
    else{o.g.copy(TC);o.gs=1.1+1*Math.min(ia,0.3);o.ga=0.22*Math.exp(-ia*9)+0.03*sway;o.li=3*Math.exp(-ia*6)+0.5*sway;}
    o.ia=ia; o.c.copy(TC); o.shake=ia>=0&&ia<0.15?0.15:0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// 5 · SAKURA — pétalos de las orejas forman un dosel de cerezo sobre el aliado; lluvia de pétalos y
//     regeneración continua (latidos suaves: anillo de pétalos y chispas verdes).
// =====================================================================
defs.push({key:"sty_poSakura",name:"Sakura (estilizado)",dur:3.4,ti:1.1,pal:"Sakura",allies:1,stylized:true,
  phases:[["Brote",0],["Dosel",0.35],["Lluvia",0.8],["Regeneración",1.1],["Calma",2.9]],
build(a){
  const L=a.L,TC0=0.35,TR=0.8,TI=1.1,TE=2.9,BEAT=0.55,AP=ALLY_POS[0],CAN=AP.clone().add(V3(0,3.2,0));
  a.count=0;
  earGlint(a,0,0.35,0.34);
  const ring=S.groundRing(L.decal,3.0), spark=S.hitSpark(L.mesh,1.5,{seed:0.12});
  const beats=[0,1,2].map(()=>S.groundRing(L.decal,2.6));
  const carpet=groundPlane(2.6,AP.x,0.022,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=styNoise(vUv*1.3+.4).g;float pet=smoothstep(.2,.1,n)*smoothstep(1.,.5,r);if(pet<.01)discard;
   float er=styErode(styNoise(vUv).r*.6+(1.-r)*.4,uP,.1);
   gl_FragColor=vec4(styRampOf(vec3(1.,.62,.78),.5+.3*styNoise(vUv*2.).r),pet*er*uA*.85);}`,{},{mode:'matter'})); carpet.position.z=AP.z; L.decal.add(carpet);
  const K=EARS+`const float TC0=${f(TC0)};const float TR=${f(TR)};const float TI=${f(TI)};const float TE=${f(TE)};const vec3 CAN=${v3(CAN)};const vec3 AP=${v3(AP)};`;
  // pétalos que suben de las orejas al dosel
  a.count+=S.pts(L.part,18,VV+K+`void main(){float s=.04+aSeed.y*.25;float u=clamp((uT-s)/.3,0.,1.);vec3 r=rnd();
   vec3 e=CAN+r*vec3(.9,.3,.9);vec3 p=bz(ear(),mix(ear(),e,.5)+vec3(0.,1.,0.),e,u*u*(3.-2.*u));
   vR=u*7.+aSeed.w*6.;vK=0.;vA=(uT>s&&u<1.)?1.:0.;put(p,.2+.05*aSeed.z);}`,PETAL_STY('vec3(1.,.6,.76)'));
  // dosel: nubes de flor de cerezo (materia con luz en bandas)
  // ramas oscuras bajo el dosel (siluetas) y racimos de flor en sus puntas, en 3 tonos de rosa
  const CL=[[0.95,0.25,0.2],[-0.9,0.15,0.35],[0.2,0.45,-0.75],[-0.3,0.1,0.85],[0.55,-0.1,0.7],[-0.6,0.5,-0.55],[0,0.55,0.05]].map(([x,y,z])=>V3(x,y,z));
  const branchM=S.mat(`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());if(uA<.01)discard;
   float er=styErode(styNoise(vUv*vec2(3.,1.)).r*.7+.3*(1.-vUv.x),uP,.06);if(er<.5)discard;
   gl_FragColor=vec4(styRampOf(vec3(.24,.12,.1),.1+.35*l)*styTint(l),1.);}`,{},{mode:'solid',side:THREE.DoubleSide});
  const BR=new THREE.Group(); BR.position.copy(CAN); L.mesh.add(BR);
  CL.slice(0,6).forEach((c,i)=>{const o0=V3(0,-0.9,0),m=V3(c.x*0.5,-0.45+0.1*(i%2),c.z*0.5),e=c.clone().multiplyScalar(1.1).add(V3(0,-0.2,0));
    BR.add(new THREE.Mesh(taperTube(new THREE.QuadraticBezierCurve3(o0,m,e),12,5,0.1,0.03),branchM));});
  const CLG=`const vec3 CL[7]=vec3[7](${CL.map(v3).join(',')});`;
  a.count+=S.pts(L.part,49,VV+K+CLG+`void main(){int ci=int(min(aSeed.x*7.,6.));float s=TC0+float(ci)*.04+aSeed.y*.1;float g=clamp((uT-s)/.25,0.,1.);
   vec3 r=rnd();vec3 p=CAN+CL[ci]+r*vec3(.32,.2,.3)+vec3(0.,.05*sin(uT*1.4+float(ci)),0.);
   vR=aSeed.w*6.28+uT*.12;vK=smoothstep(2.65,3.3,uT+aSeed.y*.2);vA=uT>s?1.:0.;put(p,(.52+.22*aSeed.z)*(.3+.7*g*(2.-g)));}`,
   S.MATTER_FS(C.puff,{relief:6,bias:-.05,col:'(vMix<.34?vec3(1.,.74,.86):(vMix<.67?vec3(.95,.5,.68):vec3(.8,.3,.5)))'}));
  // flores sueltas que brillan en el dosel
  a.count+=S.pts(L.part,14,VV+K+`void main(){float an=aSeed.z*6.2832;vec3 p=CAN+vec3(cos(an)*(.3+.7*aSeed.y),-.2+aSeed.w*.5,sin(an)*(.3+.7*aSeed.y)*.8);
   float on=smoothstep(TC0+.25,TC0+.45,uT)*(1.-smoothstep(2.6,3.,uT));vR=0.;vK=0.;vA=on*(.5+.5*sin(uT*4.+aSeed.x*30.));put(p,.12+.05*aSeed.x);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  // lluvia de pétalos que revolotean
  a.count+=S.pts(L.part,56,VV+K+`void main(){float life=1.;float k=(uT-TR)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;vec3 p=CAN+vec3(cos(an)*r.y*1.1,-.1-age*3.15,sin(an)*r.y*.9)+vec3(sin(age*7.+r.z*6.)*.25,0.,cos(age*5.+r.x*6.)*.18);
   float on=(uT>TR&&k>=1.)?1.-smoothstep(TE-.1,TE+.3,uT-age*life):0.;
   vR=age*9.*(r.z-.5)+r.y*6.;vK=smoothstep(.9,1.,age);vA=on;vMix=.35+.65*abs(sin(age*8.+r.x*6.));put(p,.2+.06*r.z);}`,PETAL_STY('vec3(1.,.62,.78)'));
  // regeneración: chispas verdes que suben en cada latido
  a.count+=S.pts(L.part,24,VV+K+`void main(){float life=.55;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=AP+vec3((r.x-.5)*1.,.2+r.y*.6+age*1.3,(r.z-.5)*1.);vR=0.;vK=age;
   vA=(uT>TI&&k>=1.&&uT<TE)?sin(age*3.14159):0.;put(p,.14+.05*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TC0,TC0+0.3,te)*(1-ss(TE-0.2,TE+0.3,te));
    BR.visible=te>TC0-0.02; BR.scale.setScalar(Math.max(ss(TC0-0.02,TC0+0.25,te),0.01)); set(BR.children[0],-0.1+1.15*ss(2.75,3.3,te),1);
    caster.rotation.z=0.06*ss(0,0.2,te)-0.08*ss(0.2,0.35,te)+0.02*ss(0.35,0.8,te);
    ring.pose(ia,AP.x,AP.z,0.5); spark.pose(ia,tmp.set(AP.x,1.1,AP.z),0.8);
    beats.forEach((r,i)=>r.pose(ia-BEAT*(i+1),AP.x,AP.z,0.5,0.8));
    set(carpet,-0.1+1.1*ss(TE,3.35,te),ss(TR+0.3,TI+0.5,te)); carpet.scale.setScalar(Math.max(0.5+0.5*ss(TR,TI+0.6,te),0.01));
    const ph=ia>=0?((ia%BEAT)/BEAT):1, pulse=ia>=0&&te<TE?Math.exp(-ph*BEAT*7):0;
    const al=allies[0].userData.m; al.emissive.copy(U.uC1.value); al.emissiveIntensity=0.3*pulse+0.08*env;
    o.g.set(AP.x,1.1,AP.z); o.gs=1.2; o.ga=0.06*env+0.12*pulse; o.li=0.8*env+1.8*pulse;
    o.ia=ia; o.c.set(AP.x,1.1,AP.z); o.shake=0; o.dist=0.2; o.flash=0;
  };
}});

// =====================================================================
// 6 · HOLLOW (Big Yak) — el Axie emite pulsos huecos; se abre un hueco en el cielo sobre la casilla elegida y cae
//     un tronco hueco centenario que se clava en ella con tierra, astillas y grietas; al quedar puesto el poste
//     real del tablero, el tronco se consume en musgo y hojas.
// =====================================================================
const BARK_FS=`uniform float uEr;uniform float uM;uniform float uCut;void main(){if(vP.y>uCut)discard;vec3 n=normalize(vN);float l=styLight(n,stySunV());
 float an=atan(vP.z,vP.x);vec2 tc=vec2(an*.48,vP.y*.35);vec4 nz=styNoise(tc);
 float er=styErode(styNoise(tc*1.3+.5).r*.6+.4*smoothstep(.9,-.9,vP.y),uEr,.06);if(er<.5)discard;
 float groove=smoothstep(.45,.75,nz.b);
 vec3 c=styRampOf(vec3(.36,.22,.12),.16+.5*l-groove*.22+nz.a*.08)*styTint(l);
 float moss=smoothstep(.52,.62,styNoise(tc*1.7+.11).r*.7+smoothstep(.0,.75,vP.y)*.45+.25*max(dot(n,stySunV()),0.)*0.);
 vec3 mc=styRampOf(vec3(.22,.42,.1),.18+.5*l+nz.g*.1)*styTint(l);c=mix(c,mc,moss);
 c+=vec3(.55,.85,.25)*moss*uM*.35;
 c=mix(c,vec3(.55,.8,.3),smoothstep(.06,0.,er-.5)*step(0.,uEr)*.8);                         // borde de musgo al consumirse
 gl_FragColor=vec4(c,1.);}`;
const INNER_FS=`uniform float uEr;uniform float uCut;void main(){if(vP.y>uCut)discard;float h=vP.y/1.5+.5;vec2 tc=vec2(atan(vP.z,vP.x)*.48,vP.y*.35);
 float er=styErode(styNoise(tc*1.3+.5).r*.6+.4*(1.-h),uEr,.06);if(er<.5)discard;
 gl_FragColor=vec4(styRampOf(vec3(.25,.15,.08),.05+.3*smoothstep(.3,1.,h)),1.);}`;
const RINGS_FS=`uniform float uEr;uniform float uCut;void main(){if(vP.y>uCut)discard;float r=length(vP.xz);vec2 tc=vP.xz*.8+.5;
 float er=styErode(styNoise(tc).r,uEr,.06);if(er<.5)discard;
 float yr=smoothstep(.3,.6,sin(r*95.+styNoise(tc).r*4.));vec3 n=normalize(vN);float l=styLight(n,stySunV());
 gl_FragColor=vec4(styRampOf(vec3(.78,.58,.36),.35+.4*l-yr*.15)*styTint(l),1.);}`;
// hueco: aro oscuro (materia) con borde de musgo (energía); uP = apertura (0..1)
// hueco de musgo: interior verde azulado oscuro con remolino, aro de musgo con luz en bandas; uP = apertura (0..1)
const HOLE_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2./max(uP,.02);float an=atan(p.y,p.x);
 vec2 q=vec2(cos(an-uT*2.),sin(an-uT*2.))*length(p)/max(uP,.02)*.5+.5;
 float edge=.74+(styNoise(vec2(an*.5,.3)).r-.5)*.22;
 float inner=smoothstep(edge,edge-.06,r);float rim=smoothstep(edge-.1,edge,r)*smoothstep(edge+.24,edge+.12,r);
 float a=max(inner,rim);if(a<.01)discard;
 float sw=styNoise(q*1.2).r;float sp=smoothstep(.45,.6,fract(an/6.2832*3.+r*1.6-uT*.8));
 vec3 inC=styRampOf(vec3(.05,.22,.22),.02+.32*r*r+.12*sp*sw);
 float l=smoothstep(edge+.05,edge+.17,r)*.0+step(.5,styNoise(vec2(an*1.5,r*2.)).g+.25*(1.-(r-edge)*5.));
 vec3 rimC=styRampOf(vec3(.25,.5,.12),.25+.5*l)*styTint(l);
 gl_FragColor=vec4(mix(inC,rimC,smoothstep(edge-.04,edge+.02,r)),a*uA);}`;
const PULSE_FS=`void main(){vec4 s=styShape(7.,vUv);float r=length(vUv-.5)*2.;float er=styErode(s.r*.55+s.b*.45,uP,.12);
 float dark=smoothstep(.12,.0,abs(r-.66))*.75;float m=max(s.r,dark);if(m<.01)discard;
 vec3 c=mix(vec3(.06,.09,.04),styRampOf(vec3(.45,.75,.22),.6+.35*s.g),s.r);
 gl_FragColor=vec4(c,m*er*uA);}`;
defs.push({key:"sty_poHollow",name:"Hollow (estilizado)",dur:1.4,ti:0.42,pal:"Musgo",stylized:true,
  phases:[["Pulso hueco",0],["Portal",0.12],["Caída",0.25],["Impacto",0.42],["Asentamiento",0.55],["Bloqueo",0.75]],
build(a){
  const L=a.L,PUL=[0.02,0.09,0.16],TP=0.12,TF=0.25,TI=0.42,TB=0.75,YS=2.5,HH=0.8,HEADP=V3(-3.62,1.75,0);
  a.count=0;
  earGlint(a,0,0.18,0.3);
  const pulses=PUL.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(PULSE_FS,{},{mode:'matter',depthTest:false}));L.trail.add(m);return m;});
  const hole=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6).rotateX(PI/2),S.mat(HOLE_FS,{},{mode:'matter',side:THREE.DoubleSide})); hole.position.set(TX,YS,0); L.trail.add(hole);
  // hojas en el borde del hueco
  a.count+=S.pts(L.trail,22,VV+`void main(){float on=smoothstep(.12,.25,uT)*(1.-smoothstep(.5,.68,uT));float an=aSeed.x*6.2832+uT*.8;float rad=1.0+.12*aSeed.y;
   vec3 p=vec3(${f(TX)}+cos(an)*rad*on,${f(YS)}+.05+.08*aSeed.z,sin(an)*rad*on);vR=an+1.57+aSeed.w;vK=1.-on;vA=on>0.01?1.:0.;
   put(p,(.32+.12*aSeed.w)*on);}`,S.MATTER_FS(C.leaf,{relief:3,col:'(vMix<.5?vec3(.2,.48,.12):vec3(.42,.66,.2))'}));
  // tronco hueco: corteza con surcos y musgo, interior oscuro y anillos de crecimiento arriba y abajo
  const uEr={value:-0.2}, uM={value:0}, uCut={value:99};
  const trunk=new THREE.Group(); L.mesh.add(trunk);
  const bark=S.mat(BARK_FS,{uEr,uM,uCut},{mode:'solid'}), inner=S.mat(INNER_FS,{uEr,uCut},{mode:'solid',side:THREE.BackSide}), rings=S.mat(RINGS_FS,{uEr,uCut},{mode:'solid',side:THREE.DoubleSide});
  trunk.add(new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.5,HH*2,36,6,true),bark),new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.36,HH*2,28,4,true),inner));
  const rg=new THREE.RingGeometry(0.33,0.47,40,2).rotateX(-PI/2), top=new THREE.Mesh(rg,rings);
  top.position.y=HH; trunk.add(top);
  for(const [y,az,len] of [[0.35,0.8,0.36],[-0.2,3.6,0.28],[0.55,2.2,0.22]]){const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.09,len,8),bark);
    st.position.set(Math.cos(az)*0.5,y,Math.sin(az)*0.5); st.rotation.set(Math.sin(az)*1.1,0,-Math.cos(az)*1.1); trunk.add(st);}
  const shadow=S.contactShadow(L.decal,1.8);
  const crack=groundPlane(2.6,TX,0.021,S.mat(CRACK_FS,{},{mode:'matter'})); L.decal.add(crack);
  const mossMark=groundPlane(2.0,TX,0.024,S.mat(`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
   gl_FragColor=vec4(styRampOf(vec3(.33,.55,.16),.35+.4*s.g),s.r*er*uA*.85);}`,{},{mode:'matter'})); L.decal.add(mossMark);
  const ring=S.groundRing(L.decal,3.4), spark=S.hitSpark(L.mesh,1.7,{seed:0.71});
  const K=`const float TI=${f(TI)};const float TB=${f(TB)};const float YS=${f(YS)};`;
  // polvo de tierra en anillo al clavarse
  a.count+=S.pts(L.part,16,VV+K+`void main(){float t=uT-TI-aSeed.x*.04;float life=.6+aSeed.y*.3;float age=t/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},.1,0.)+vec3(cos(an),0.,sin(an))*(.55+1.2*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(t>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.42+.2*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // terrones y astillas de corteza
  a.count+=S.pts(L.part,18,VV+K+`void main(){float t=uT-TI-aSeed.x*.03;float life=.5+aSeed.y*.2;float age=t/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},.15,0.)+vec3(cos(an),0.,sin(an))*(.5+(1.4+1.4*aSeed.w)*t)+vec3(0.,(2.4+1.4*aSeed.y)*t-7.*t*t,0.);
   vA=(t>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.18+.1*aSeed.y);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'(vMix<.5?'+SOIL+':'+WOOD+')'}));
  // musgo y hojas que se desprenden al consumirse el tronco
  a.count+=S.pts(L.part,20,VV+K+`void main(){float s=TB+.05+aSeed.x*.35;float t=uT-s;float life=.55;float age=t/life;float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)}+cos(an)*.45,.2+aSeed.w*1.4+t*.4,sin(an)*.45)+vec3(cos(an),0.,sin(an))*t*.5;
   vA=(t>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=an+t*4.;put(p,.18+.07*aSeed.y);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.36,.62,.18)'}));
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.05*ss(0,0.06,te)-0.07*ss(0.06,0.16,te)+0.02*ss(0.16,0.4,te);
    pulses.forEach((m,i)=>{const k=cl((te-PUL[i])/0.3);m.visible=te>PUL[i]&&k<1;towardCam(m.position,HEADP,0.3);billboard(m,0);
      m.scale.setScalar(0.4+1.6*(1-Math.pow(1-k,2)));set(m,k*1.05,1);});
    const ho=ss(TP,TF,te)*(1-ss(0.5,0.68,te)); hole.visible=ho>0.002; set(hole,ho,1); hole.rotation.y=te*1.5;
    const fall=cl((te-TF)/(TI-TF)), Y0=YS+0.55, yb=te<TI?Y0-(Y0-(HH-0.12))*fall*fall:HH-0.12;
    const sq=ia>=0?0.12*Math.exp(-ia*10)*Math.cos(ia*24):0;
    trunk.visible=te>TF&&uEr.value<1.05; trunk.position.set(TX,yb,0);
    trunk.rotation.set(0.08*(1-fall)*(te<TI?1:0),0.6,te<TI?-0.1*(1-fall):0.04*hitE(ia,5)*Math.sin(ia*20));
    trunk.scale.set(1+sq*0.7,1-sq,1+sq*0.7);
    uEr.value=-0.15+1.25*ss(TB+0.1,1.32,te); uCut.value=ho>0.01?(YS-yb)/Math.max(trunk.scale.y,0.01):99;
    uM.value=ss(TI+0.1,TB,te)*(0.6+0.4*Math.sin(te*9));
    const hgt=Math.max(yb-HH,0); shadow.pose(TX,0,0.7+0.5*cl(1-hgt/4),te>TP&&te<1.3?0.3+0.45*cl(1-hgt/4):0);
    set(crack,-0.1+1.1*ss(1.05,1.4,te),ia>=0?1:0); crack.scale.setScalar(Math.max(0.6+0.4*ss(TI,TI+0.1,te),0.01));
    set(mossMark,-0.1+1.1*ss(1.15,1.4,te),ss(TB,TB+0.3,te));
    ring.pose(ia,TX,0,0.45,1.1); spark.pose(ia,tmp.set(TX-0.2,0.35,0),0.9);
    if(te<TF){o.g.copy(HEADP);o.gs=0.7;o.ga=0.05;o.li=0.6;}
    else if(te<TI){o.g.set(TX,yb,0);o.gs=0.8;o.ga=0.05;o.li=0.8;}
    else{o.g.set(TX,0.6,0);o.gs=1.2+Math.min(ia,0.3);o.ga=0.15*Math.exp(-ia*10);o.li=3*Math.exp(-ia*7)+0.4*uM.value;}
    o.ia=ia; o.c.set(TX,0.6,0); o.shake=ia>=0&&ia<0.3?0.55*Math.exp(-ia*9):0; o.dist=0.5; o.flash=0;
  };
}});

// =====================================================================
// 7 · CLOVER — tréboles de cuatro hojas brotan de las orejas, orbitan al Axie y vuelan al aliado elegido; al llegar
//     un trébol protector se abre sobre él (escudo) y una ráfaga de hojitas le corre por los pies (+1 PM).
// =====================================================================
const CLOVER_MESH=SD_CLOVER+`uniform float uEr;void main(){vec2 p=(vUv-.5)*2.2;float d=sdClover(p);if(d>.02)discard;
 float er=styErode(styNoise(p*.4+.3).r*.6+smoothstep(0.,.4,-d)*.5,uEr,.1);float a=smoothstep(.02,-.02,d)*er;if(a<.01)discard;
 vec3 c=cloverCol(p,er)+vec3(1.,.78,.3)*smoothstep(.03,0.,abs(d+.035))*.8;
 gl_FragColor=vec4(c,a*uA);}`;
defs.push({key:"sty_poClover",name:"Clover (estilizado)",dur:2.3,ti:0.9,pal:"Esmeralda",stylized:true,
  phases:[["Brote",0],["Órbita",0.25],["Disparo",0.65],["Impacto",0.9],["Amuleto",1.05],["Disipación",1.85]],
build(a){
  const L=a.L,TO=0.25,TL=0.65,TI=0.9,TA=1.05,TE=1.85,CC=V3(-3.7,1.2,0),HD=V3(TX,2.35,0),BC=V3(TX,1.0,0);
  a.count=0;
  earGlint(a,0,0.25,0.3);
  const amulet=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.15),S.mat(CLOVER_MESH,{uEr:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(amulet);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.0,32,20,0,PI*2,0,PI*0.55),S.mat(DOME_FS,{},{mode:'energy'})); dome.position.set(TX,0,0); dome.scale.set(1,1.5,1); L.mesh.add(dome);
  const ring=S.groundRing(L.decal,3.0), spark=S.hitSpark(L.mesh,1.4,{seed:0.33});
  const K=EARS+`const float TO=${f(TO)};const float TL=${f(TL)};const float TI=${f(TI)};const float TA=${f(TA)};const vec3 CC=${v3(CC)};const vec3 BC=${v3(BC)};
  vec3 orbit(float t,float ph){float an=ph+t*7.;return CC+vec3(cos(an)*.85,.35*sin(an*1.3+ph)+.2,sin(an)*.85);}`;
  // tréboles: oreja → órbita → vuelo al aliado (escalonados), estela de motas doradas
  a.count+=S.pts(L.part,6,VV+K+`void main(){float ph=aSeed.x*6.2832;float d0=aSeed.y*.08;float tl=TL+aSeed.z*.12;
   vec3 o0=orbit(TO,ph);float k0=clamp((uT-d0)/(TO-d0),0.,1.);vec3 p=mix(ear(),o0,k0*k0*(3.-2.*k0));
   if(uT>TO)p=orbit(uT,ph);
   if(uT>tl){float u=clamp((uT-tl)/(TI-tl),0.,1.);vec3 s=orbit(tl,ph);p=bz(s,mix(s,BC,.5)+vec3(0.,1.3,0.),BC+rnd()*.2,u*u);}
   vR=uT*5.+ph;vK=0.;vA=(uT>d0&&uT<TI+.01)?1.:0.;put(p,(.46+.08*aSeed.w)*smoothstep(0.,.12,uT-d0));}`,CLOVER_PT);
  a.count+=S.pts(L.part,24,VV+K+`void main(){float ph=floor(aSeed.x*6.)/6.*6.2832;float s=TO+aSeed.y*(TI-TO);float t=uT-s;float life=.3;float age=t/life;
   vec3 p=orbit(s,ph)+rnd()*.12;vR=0.;vK=age;vA=(t>0.&&age<1.&&s<TL)?(1.-age):0.;put(p,.09+.04*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // +1 PM: hojitas que corren en círculo por los pies del aliado
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TA+aSeed.x*.3;float t=uT-s;float life=.5;float age=t/life;float an=aSeed.z*6.2832+t*11.;
   vec3 p=vec3(${f(TX)}+cos(an)*.7,.1+t*.5+aSeed.w*.15,sin(an)*.7);vR=an+1.57;vK=smoothstep(.55,1.,age);vA=(t>0.&&age<1.)?1.:0.;
   put(p,.18+.05*aSeed.y);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.3,.7,.26)'}));
  a.pose=function(te,o){
    const ia=te-TI, am=back(cl((te-TI)/0.22)), diss=ss(TE-0.3,TE+0.2,te);
    caster.rotation.z=0.04*ss(0,0.15,te)-0.05*ss(TL-0.05,TL+0.08,te)+0.02*ss(TI,TI+0.3,te);
    towardCam(amulet.position,tmp.copy(HD).add(tmp2.set(0,0.06*Math.sin(te*2.4),0)),0.3); billboard(amulet,0.1*Math.sin(te*1.7));
    amulet.visible=ia>=0&&diss<1; amulet.scale.setScalar(Math.max(am,0.001)); amulet.material.uniforms.uA.value=1; amulet.material.uniforms.uEr.value=-0.1+1.15*diss;
    const de=ss(TI,TI+0.2,te)*(1-ss(TE-0.2,TE+0.2,te)); dome.visible=de>0.002; dome.position.x=target.position.x;
    dome.scale.set(1+0.06*hitE(ia,8),1.5*(0.3+0.7*ss(TI,TI+0.25,te)),1+0.06*hitE(ia,8)); set(dome,diss*1.05,de*0.8);
    ring.pose(ia,TX,0,0.45); spark.pose(ia,BC,0.85);
    const h=hitE(ia,6); target.position.x=TX+0.06*h; target.rotation.z=-0.06*h*Math.cos(ia*14);
    const tm=target.userData.m; if(tm){tm.emissive.copy(U.uC1.value);tm.emissiveIntensity=ia>=0?0.4*Math.exp(-ia*6)+0.1*de:0;}
    if(te<TL){o.g.copy(CC);o.gs=1;o.ga=0.06*ss(0.1,TO,te);o.li=1.2;}
    else if(te<TI){o.g.lerpVectors(CC,BC,cl((te-TL)/(TI-TL)));o.gs=0.8;o.ga=0.08;o.li=1.4;}
    else{o.g.copy(BC);o.gs=1.3;o.ga=0.2*Math.exp(-ia*8)+0.04*de;o.li=3*Math.exp(-ia*6)+0.7*de;}
    o.ia=ia; o.c.copy(BC); o.shake=0; o.dist=0.25; o.flash=0;
  };
}});

VFX.module("Estilizado · Planta · Orejas",defs);
})();

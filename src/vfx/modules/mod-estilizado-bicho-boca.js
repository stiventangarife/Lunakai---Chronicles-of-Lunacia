// =====================================================================
// ESTILIZADO · BICHO · BOCA (Hito 101) — las 4 cartas de boca de Bicho rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_ibCuteBunny, sty_ibMosquito, sty_ibPincer, sty_ibSquareTeeth).
// Mismos dur / ti / fases que mod-bicho-boca.js (el daño llega igual). El concepto sigue la carta (PartCards.js):
//  · Cute Bunny: un espíritu de conejo de quitina rosa (silueta, sin cara) da tres saltos, se encabrita y suelta un
//    chillido de medias lunas de sonido; el rival tiembla envuelto en jirones violeta (Miedo).
//  · Mosquito: zumbido de alas; un aguijón carmesí vuela en zigzag y pica el pecho; una hebra de sangre bombea gotas
//    hasta la boca del lanzador, que se cura (drenaje 50 %).
//  · Pincer: dos mandíbulas en hoz de quitina carmesí (arcos curvos con filo aserrado) muerden en tijera dos veces;
//    esquirlas, tajos y Sangrado.
//  · Square Teeth: el escudo del lanzador se vuelve fuerza (bonus por escudo) y unas fauces de hormiga león en media luna
//    con dientes cuadrados trituran: grietas, lascas de piedra y polvo.
// Bicho = quitina carmesí; cada carta con su acento. Colores fijos convertidos a lineal (lin()). Cuerpo a cuerpo:
// zonas 0,5 / 1,3 para que nada se encoja a una casilla. Módulo autónomo (no necesita mod-bicho-boca.js).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,camera,caster,target}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL;
VFX.palette("Sty Bicho · Conejo",["#ff8fb3","#b0183f"]);
VFX.palette("Sty Bicho · Mosquito",["#ff5b4a","#7a0b1d"]);
VFX.palette("Sty Bicho · Pinza",["#ff5a3c","#6c0b16"]);
VFX.palette("Sty Bicho · Dientes",["#ffb35a","#8c1f16"]);

// sRGB (0..1) → vec3 lineal para GLSL
const lin=(r,g,b)=>`vec3(${[r,g,b].map(x=>Math.pow(x,2.2).toFixed(4)).join(',')})`;
const linA=(r,g,b)=>[r,g,b].map(x=>Math.pow(x,2.2));
const MO=V3(-3.43,1.55,0), TC=V3(3.15,1.2,0), TH=V3(3.25,1.62,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), RX=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const ZONES={zoneCaster:0.5,zoneTarget:1.3};
const camRight=()=>RX.set(1,0,0).applyQuaternion(camera.quaternion);
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const emit=(d,k,r,g,b)=>{const m=d.userData.m;if(r===undefined)m.emissive.copy(U.uC1.value);else m.emissive.setRGB(r,g,b);m.emissiveIntensity=k;};
const resetDummy=d=>{d.rotation.set(0,0,0);d.scale.set(1,1,1);};
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdE(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}`;
const SDFLIT=`float sdfH(vec2 p){return sqrt(clamp(-sdf(p)/.12,0.,1.));}
vec3 sdfN(vec2 p){float e=.014;float hx=sdfH(p+vec2(e,0.))-sdfH(p-vec2(e,0.));float hy=sdfH(p+vec2(0.,e))-sdfH(p-vec2(0.,e));
 return normalize(vec3(-hx*.8,-hy*.8,1.));}`;
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.3});
const POOL_FS=(col,al=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.85,.7,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.25+.35*n),m*er*uA*${f(al)});}`;
// anillo de pincel en billboard; uP = erosión
const RINGB_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.55+.4*s.g)*1.1,s.r*er*uA);}`;
const ringBill=(parent,size)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),S.mat(RINGB_FS,{},{mode:'energy',depthTest:false}));parent.add(m);return m;};
const CHITIN=lin(.55,.06,.09), CHITIN_D=lin(.16,.015,.03), IVORY=lin(.93,.86,.7), BLOOD=lin(.62,.03,.06);
const EARTH=lin(.5,.38,.25), STONE=lin(.52,.46,.4), FEAR=lin(.2,.08,.3);

// ---------- media luna de mordisco (Pincer y Square Teeth) ----------
// arco de quitina con banda de contorno oscura y dientes en el borde interior. uUp = 1: joroba arriba, dientes abajo.
// uKind 0 = filo aserrado de hoz (dientes en sierra, puntas en gancho) · 1 = dientes cuadrados de hormiga león.
// uChit / uTooth = colores (lineales); uEr = erosión; uHot = brillo del filo (golpe)
const JAW_FS=`uniform float uUp;uniform float uKind;uniform float uEr;uniform float uHot;uniform vec3 uChit;uniform vec3 uTooth;
float inY(float x){return -.78+sqrt(max(.81-x*x,0.));}
float bandD(vec2 p){float o=length(p-vec2(0.,-.56))-.95;float i=length(p-vec2(0.,-.78))-.9;float d=max(o,-i);
 float tip=uKind<.5?.95:.86;return max(d,abs(p.x)-tip+.3*smoothstep(.45,.95,abs(p.x)));}
float teethD(vec2 p){float x=p.x;float y0=inY(x);
 if(uKind<.5){float tri=1.-abs(fract(x*6.5+.25)-.5)*2.;float h=.07+.1*tri;
  return max(max(y0-h-p.y,p.y-y0-.03),abs(x)-.74);}
 float cx=fract(x*4.2+.5)-.5;float h=.21-.05*abs(x);
 return max(max(abs(cx)-.33,max(y0-h-p.y,p.y-y0-.03)),abs(x)-.7);}
void main(){vec2 p=(vUv-.5)*vec2(2.,1.25);if(uUp<.5)p.y=-p.y;
 float n=styNoise(vec2(p.x*.6+uUp*.37,p.y*.3)+.1).b;float nb=styNoise(vUv*1.3+uUp).r;
 float db=bandD(p)+(nb-.5)*.04;float dt=teethD(p);float d=min(db,dt);
 float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float er=styErode(n*.55+.45*clamp(-d*6.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float isT=step(dt,db);
 float ry=length(p-vec2(0.,-.67))-.92;                          // línea media del arco
 vec3 N=normalize(vec3(-p.x*.45,-ry*7.,1.));float l=styLight(N,stySunV());
 vec3 chit=styRampOf(uChit,clamp(.25+.55*l+.1*(n-.5),0.,1.))*styTint(l);
 float seg=smoothstep(.03,.0,abs(fract(p.x*3.+.5)-.5)-.44)*(1.-isT);chit*=1.-.35*seg;  // juntas de los segmentos
 float sheen=smoothstep(.035,.0,abs(ry+.015))*(1.-isT);chit=mix(chit,vec3(1.,.85,.8),sheen*.35*l);
 vec3 tooth=styRampOf(uTooth,clamp(.35+.5*l+.25*clamp(-dt*10.,0.,1.),0.,1.))*styTint(l);
 vec3 c=mix(chit,tooth,isT);
 float rim=smoothstep(-.055,-.015,d);c=mix(c,vec3(.03,.004,.006),rim*.9);
 c+=uChit*2.2*uHot*smoothstep(.06,.0,abs(dt))*isT;
 gl_FragColor=vec4(c,a);}`;
const makeJaw=(parent,kind,chit,tooth,up)=>new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.78),S.mat(JAW_FS,{uUp:{value:up},uKind:{value:kind},
  uEr:{value:0},uHot:{value:0},uChit:{value:new THREE.Color().setRGB(...chit)},uTooth:{value:new THREE.Color().setRGB(...tooth)}},{mode:'matter',depthTest:false}));
const jawU=(m,a,er,hot)=>{const u=m.material.uniforms;u.uA.value=a;u.uEr.value=er;u.uHot.value=hot;};

const defs=[];

// =====================================================================
// 1 · CUTE BUNNY — espíritu de conejo de quitina rosa (silueta iluminada en 3 bandas, orejas largas y antenas de insecto
//     con puntas que brillan; sin cara). Tres saltos con polvo y anillos, se encabrita y suelta un chillido: medias lunas
//     de sonido en abanico y chispas desde las antenas. El rival retrocede tembloroso entre jirones violeta (Miedo).
// =====================================================================
const BUN_FS=SDF2+`uniform float uEr;uniform float uQ;
float sdBun(vec2 p){float d=sdE(p-vec2(-.12,-.42),vec2(.44,.3));
 d=smin(d,length(p-vec2(.27,-.09))-.25,.12);d=smin(d,length(p-vec2(-.58,-.3))-.13,.05);
 d=smin(d,sdE(p-vec2(.04,-.69),vec2(.27,.07)),.06);
 float ea=.55-uQ*.35;d=smin(d,sdE(rot2(p-vec2(.12,.28),ea),vec2(.075,.3)),.05);
 d=smin(d,sdE(rot2(p-vec2(.28,.28),ea-.3),vec2(.065,.27)),.05);return d;}
float sdf(vec2 p){return sdBun(p);}
${SDFLIT}
float sdAnt(vec2 p,float q){float sw=sin(uT*5.)*.03+q*sin(uT*60.)*.025;
 vec2 a1=vec2(.42,.35+q*.06),a2=vec2(.62+sw,.5+q*.08);
 return min(min(sdSeg(p,vec2(.36,.08),a1),sdSeg(p,a1,a2))-.018,length(p-a2)-.05);}
void main(){vec2 p=(vUv-.5)*2.;float d=sdBun(p);float da=sdAnt(p,uQ);float dd=min(d,da);
 float m=smoothstep(.015,-.015,dd);if(m<.01)discard;
 float n=styNoise(vUv*.9+.3).r;float er=styErode(n*.6+.4*clamp(-dd*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());
 vec3 fur=styRampOf(uC1,clamp(.22+.6*l,0.,1.))*styTint(l);
 float belly=smoothstep(.1,-.1,p.y+.45)*smoothstep(-.05,.05,p.x+.2);fur=mix(fur,styRampOf(${lin(1.,.86,.88)},.4+.5*l),belly*.55);
 float ear=max(smoothstep(.04,.0,sdE(rot2(p-vec2(.12,.31),.55-uQ*.35),vec2(.03,.2))),smoothstep(.04,.0,sdE(rot2(p-vec2(.28,.31),.25-uQ*.35),vec2(.025,.18))));
 fur=mix(fur,styRampOf(uC2,.55),ear*.8);
 vec3 c=fur;float rim=smoothstep(-.05,-.012,d)*step(d,da+.001);c=mix(c,styRampOf(uC2,.12),rim*.9);
 float ant=step(da,d);c=mix(c,styRampOf(uC2,.2),ant);
 float tip=smoothstep(.06,.02,length(p-vec2(.62,.5+uQ*.08)));c+=uC1*tip*(.6+1.4*uQ);
 gl_FragColor=vec4(c,a);}`;
// medias lunas de sonido del chillido (materia pintada con borde oscuro), uP = tiempo desde el chillido
const SHOUT_FS=`void main(){vec2 p=(vUv-vec2(0.,.5))*vec2(3.2,2.4);float r=length(p);float an=atan(p.y,p.x);
 float win=smoothstep(.95,.5,abs(an));float m=0.;float edge=0.;
 for(int i=0;i<3;i++){float fi=float(i);float ri=(uP-fi*.1)*4.6;float w=.07+.03*fi;
  float j=(styNoise(vec2(an*.9+fi*.3,r*.2-uT*.3)).b-.5)*.12;float dd=abs(r+j-ri)-w;
  float on=step(0.,ri)*smoothstep(3.2,1.2,ri);m=max(m,smoothstep(.02,-.02,dd)*on);edge=max(edge,smoothstep(-.035,-.01,dd)*on*smoothstep(.02,-.02,dd));}
 float a=m*win*uA;if(a<.01)discard;
 vec3 c=mix(styRamp(.7),styRampOf(uC2,.15),edge*.85);gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_ibCuteBunny",name:"Cute Bunny (estilizado)",dur:2.3,ti:1.05,tier:2,pal:"Sty Bicho · Conejo",stylized:true,...ZONES,
  phases:[["Aparición",0],["Saltitos",0.2],["Inspira",0.82],["Chillido",1.05],["Miedo",1.35],["Fin",1.9]],
build(a){
  const L=a.L,TH0=0.2,TQ=0.82,TI=1.05,TF=1.4,TE=1.9,BS=2.0;
  const HOPS=[[0.2,0.42,-2.75,-1.05,0.65],[0.42,0.62,-1.05,0.55,0.55],[0.62,0.82,0.55,1.75,0.45]];
  const ZS=[0.2,0.12,0.05,0];
  const bpos=(te,out)=>{if(te<TH0)return out.set(HOPS[0][2],0,ZS[0]);
    for(let i=0;i<3;i++){const h=HOPS[i];if(te<h[1]){const k=(te-h[0])/(h[1]-h[0]);return out.set(h[2]+(h[3]-h[2])*k,h[4]*4*k*(1-k),ZS[i]+(ZS[i+1]-ZS[i])*k);}}
    return out.set(HOPS[2][3],0,0);};
  const bun=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(BUN_FS,{uEr:{value:0},uQ:{value:0}},{mode:'matter'})); L.mesh.add(bun);
  const shout=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.4).translate(1.6,0,0),S.mat(SHOUT_FS,{},{mode:'matter',depthTest:false})); L.mesh.add(shout);
  const shadow=S.contactShadow(L.decal,1.1), spark=S.hitSpark(L.mesh,1.5,{seed:0.41}), ring=S.groundRing(L.decal,3.0);
  const lands=HOPS.map(()=>S.groundRing(L.decal,1.3));
  const echo=ringBill(L.mesh,1.8);
  const tipU={value:V3(0,0,0)};
  const K=`const float TI=${f(TI)};const float TF=${f(TF)};const float TE=${f(TE)};const float TQ=${f(TQ)};const vec3 MO=${v3(MO)};const vec3 TH=${v3(TH)};`;
  // la luz sale de la boca y da forma al espíritu
  S.pts(L.part,26,VV+K+`void main(){float s=aSeed.x*.14;float age=(uT-s)/.16;float k=clamp(age,0.,1.);
   vec3 p=mix(MO+vec3(.1,0.,0.),vec3(${f(HOPS[0][2])},.55,.2)+rnd()*.3,k*k)+vec3(0.,.3*sin(3.14159*k),0.);
   vR=aSeed.z*6.;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.08*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // polvo en cada aterrizaje
  S.pts(L.part,24,VV+K+`void main(){float i=floor(aSeed.x*2.999);float s=i<.5?${f(HOPS[0][1])}:(i<1.5?${f(HOPS[1][1])}:${f(HOPS[2][1])});
   float x=i<.5?${f(HOPS[0][3])}:(i<1.5?${f(HOPS[1][3])}:${f(HOPS[2][3])});float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.2);
   vec3 d=normalize(vec3(rnd().x,.25,rnd().z));vec3 p=vec3(x,.1,0.)+d*(.2+.4*aSeed.z)*(1.-exp(-t*6.))+vec3(0.,.25*t,0.);
   vR=aSeed.w*6.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.26+.12*aSeed.w)*(.7+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:EARTH}));
  // chispas que se cargan en las antenas al inspirar y saltan con el chillido
  S.pts(L.part,22,VV+K+`uniform vec3 uTip;void main(){float life=.12+aSeed.y*.08;float k=(uT-TQ)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k))*2.-1.;
   vec3 p=uTip+r*vec3(.14,.12,.1)+vec3(0.,age*.15,0.);vR=r.z*3.;vK=0.;
   vA=(k>=1.&&uT<TI+.15)?1.-age:0.;put(p,.16+.08*r.y);}`,MOTE_FS,{mode:'energy',uniforms:{uTip:tipU}});
  // Miedo: jirones violeta que se enroscan en el rival
  S.pts(L.part,26,VV+K+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TI-.15)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*3.;float rd=.5+.15*r.y;vec3 p=vec3(3.4+cos(an)*rd,.35+r.z*1.3+age*.5,sin(an)*rd);
   vR=age*2.;vK=smoothstep(.4,1.,age);vA=(k>=1.)?uE:0.;put(p,(.4+.25*r.y)*(.7+age*.4));}`,S.MATTER_FS(C.puff,{relief:3,col:FEAR}));
  // gotas de sudor del miedo
  S.pts(L.part,8,VV+K+`void main(){float life=.45;float k=(uT-TI-.25)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=TH+vec3((r.x-.5)*.6,.15+.2*r.y-age*age*.6,.25);vR=3.14159;vK=smoothstep(.7,1.,age);vA=(k>=1.)?uE:0.;put(p,.16);}`,
   S.MATTER_FS(C.drop,{relief:4,col:lin(.55,.75,.95)}));
  const bp=V3(0,0,0), mouth=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TH0,te), fear=ia>0?1-ss(TE-0.2,TE+0.3,te):0;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.rotation.z=-0.06*ss(0,0.1,te)+0.06*ss(0.1,0.25,te);
    bpos(te,bp);
    let sq=0; for(const h of HOPS)sq=Math.max(sq,Math.exp(-Math.abs(te-h[1])*28)*(te>h[0]+0.05?1:0));
    const rear=ss(TQ,TI,te)*(1-ss(TI+0.25,TF,te)), sh=ia>0?Math.exp(-ia*3)*(1-ss(TF-0.1,TF,te)):0;
    const sx=BS*(1+0.18*sq-0.06*rear)*(0.4+0.6*back(form)), sy=BS*(1-0.2*sq+0.12*rear)*(0.4+0.6*back(form));
    towardCam(bun.position,tmp.set(bp.x,bp.y+0.42*sy,bp.z),0.15); billboard(bun,0.18*rear-0.12*sh*Math.sin(ia*40));
    bun.scale.set(Math.max(sx,0.001),Math.max(sy,0.001),1); bun.visible=te<TF+0.45;
    bun.material.uniforms.uQ.value=Math.max(rear*0.5,sh); bun.material.uniforms.uA.value=form;
    bun.material.uniforms.uEr.value=-0.1+1.1*ss(TF,TF+0.42,te);
    shadow.pose(bp.x,bp.z,0.8+0.25*sq-0.3*cl(bp.y),te<TF+0.3?0.6*form:0);
    mouth.set(bp.x+0.33*sx,bp.y+0.35*sy,bp.z); tipU.value.set(bp.x+0.31*sx,bp.y+0.42*sy+0.5*sy,bp.z);
    towardCam(shout.position,mouth,0.25); billboard(shout); shout.visible=ia>0&&ia<0.8; set(shout,Math.max(ia,0),1-ss(0.45,0.8,ia));
    HOPS.forEach((h,i)=>lands[i].pose(te-h[1],h[3],ZS[i+1],0.35,0.7));
    spark.pose(ia-0.12,TH,1.0);
    ring.pose(ia-0.12,3.4,0,0.5,1);
    {const p=cl((ia-0.1)/0.4);towardCam(echo.position,TH,0.3);billboard(echo);echo.visible=ia>=0.1&&p<1;echo.scale.setScalar(0.4+1.3*p);set(echo,-0.1+1.1*p,1);}
    U.uE.value=fear;
    const recoil=ia>0.1?ss(0.1,0.25,ia):0;
    target.position.x=3.4+0.22*recoil*fear+0.02*Math.sin(te*85)*fear*(ia>0.1?1:0); target.rotation.z=-0.14*recoil*fear;
    target.scale.set(1,1-0.07*recoil*fear,1);
    emit(target,0.3*fear*recoil,0.3,0.1,0.42);
    if(te<TI){o.g.set(bp.x,bp.y+0.5,bp.z);o.gs=0.8;o.ga=0.08*form+0.1*rear;o.li=0.8*form+1.2*rear;}
    else{o.g.copy(mouth).lerp(TH,cl(ia/0.15));o.gs=1+1.2*Math.min(ia,0.4);o.ga=Math.exp(-ia*7)*0.2;o.li=2.5*Math.exp(-ia*5)+0.4*fear;}
    o.ia=ia-0.12;o.c.copy(TH);o.shake=0;o.dist=0.6;o.flash=0.3;
  };
}});

// =====================================================================
// 2 · MOSQUITO — dos alas translúcidas zumban ante la boca; un aguijón de quitina carmesí vuela en zigzag y pica el
//     pecho; de la herida sale una hebra de sangre que bombea gotas hasta la boca y el lanzador se cura (drenaje).
// =====================================================================
const STING_FS=SDF2+`uniform float uEr;
float sdf(vec2 p){float x=p.x;float w=mix(.22,.01,clamp((x+.95)/1.9,0.,1.));float d=max(abs(p.y)-w,abs(x)-.95);
 d=smin(d,sdE(p-vec2(-.8,0.),vec2(.24,.22)),.06);return d;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*2.;float d=sdf(p);float m=smoothstep(.012,-.012,d);if(m<.01)discard;
 float er=styErode(styNoise(vUv*.7).r*.6+.4*clamp(-d*8.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(normalize(vec3(0.,-p.y*5.,1.)),stySunV());
 vec3 c=styRampOf(uC1,clamp(.2+.6*l,0.,1.))*styTint(l);
 float seg=smoothstep(.02,.0,abs(fract(p.x*3.)-.5)-.45)*step(p.x,-.2);c*=1.-.4*seg;
 c=mix(c,styRampOf(uC2,.1),smoothstep(-.03,-.008,d)*.85);
 c+=vec3(1.,.5,.4)*smoothstep(.12,.0,length(p-vec2(.92,0.)))*1.2;
 gl_FragColor=vec4(c,a);}`;
// ala: elipse con nervaduras, translúcida y teñida (no blanca)
const WING_FS=SDF2+`void main(){vec2 p=(vUv-.5)*2.;float d=sdE(p,vec2(.95,.38));float m=smoothstep(.02,-.02,d);if(m<.01)discard;
 float vein=smoothstep(.03,.0,abs(fract((p.x+p.y*.4)*3.)-.5)-.45)+smoothstep(.04,.0,abs(p.y+.1*p.x));
 vec3 c=mix(styRampOf(uC1,.75),styRampOf(uC2,.15),max(smoothstep(-.06,-.02,d),vein*.7));
 gl_FragColor=vec4(c,m*(.28+.5*max(smoothstep(-.06,-.02,d),vein))*uA);}`;
defs.push({key:"sty_ibMosquito",name:"Mosquito (estilizado)",dur:2.1,ti:0.42,tier:2,pal:"Sty Bicho · Mosquito",stylized:true,...ZONES,
  phases:[["Zumbido",0],["Picadura",0.18],["Punción",0.42],["Succión",0.55],["Corte",1.5],["Fin",1.8]],
build(a){
  const L=a.L,TL=0.18,TI=0.42,TS=0.5,TX=1.5,TE=1.8,P0=V3(-3.25,1.55,0),P1=V3(2.95,1.24,0.05),Q1=V3(-0.2,2.7,0.6);
  const sp=(te,out)=>{const k=cl((te-TL)/(TI-TL)),e=Math.sin(Math.PI*k);
    return out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+0.14*Math.sin(k*30)*e+0.35*e,P0.z+(P1.z-P0.z)*k+0.12*Math.cos(k*26)*e);};
  const qb=(u,out)=>{const w=1-u;return out.set(w*w*TC.x+2*w*u*Q1.x+u*u*MO.x,w*w*TC.y+2*w*u*Q1.y+u*u*MO.y,w*w*TC.z+2*w*u*Q1.z+u*u*MO.z);};
  const QB=`vec3 qb(float u){float w=1.-u;return w*w*${v3(TC)}+2.*w*u*${v3(Q1)}+u*u*${v3(MO)};}`;
  const sting=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.5),S.mat(STING_FS,{uEr:{value:0}},{mode:'matter'})); L.mesh.add(sting);
  const wings=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.32),S.mat(WING_FS,{},{mode:'matter'}));L.mesh.add(m);return m;});
  // hebra de sangre: tubo con bandas de luz y pulsos que viajan hacia el lanzador; uP crecimiento, uQ corte
  const pts=[]; for(let i=0;i<=20;i++)pts.push(qb(i/20,V3(0,0,0)));
  const thread=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),80,8,0.11,0.07),S.mat(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;if(abs(u-.5)<uQ*.5)discard;
   float l=styLight(normalize(vN),stySunV());float pul=smoothstep(.55,.95,.5+.5*sin(u*28.-uT*15.));
   vec3 c=styRampOf(${BLOOD},clamp(.2+.55*l+.35*pul,0.,1.))*styTint(l);
   float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);c=mix(c,${lin(.2,.01,.03)},rim*.7);
   c+=uC1*pul*.5;gl_FragColor=vec4(c,(.85+.15*pul)*uA);}`,{uQ:{value:0}},{mode:'matter'}));
  L.mesh.add(thread);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.62}), ring=S.groundRing(L.decal,2.6), heal=S.groundRing(L.decal,2.0);
  const pool=groundPlane(1.3,3.4,0.024,S.mat(POOL_FS(BLOOD,.5),{},{mode:'matter'})); L.decal.add(pool);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TX=${f(TX)};const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};`+QB;
  // zumbido: motas que vibran ante la boca
  S.pts(L.part,14,VV+K+`void main(){float life=.1+aSeed.y*.05;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k))*2.-1.;
   vec3 p=MO+vec3(.18,0.,0.)+r*vec3(.16,.12,.14)*(1.+age);vR=0.;vK=0.;vA=(k>=1.&&uT<TL+.05)?1.-age:0.;put(p,.1+.05*r.z);}`,MOTE_FS,{mode:'energy'});
  // gotas que saltan de la punción
  S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.25);
   vec3 v=normalize(rnd()+vec3(-.9,.5,.3))*(1.+1.6*aSeed.z);vec3 p=TC+v*t+vec3(0.,-5.*t*t,0.);
   vR=3.14159+atan(v.x,v.y)*.3;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.18+.1*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:BLOOD}));
  // gotas de vida que fluyen por la hebra hasta el lanzador
  S.pts(L.part,46,VV+K+`void main(){float t=uT-TS;float u=fract(aSeed.x+t*.8);float rev=clamp(t/.2,0.,1.);
   vec3 p=qb(u)+rnd()*.04;float cut=step(.5*step(TX,uT),abs(u-.5))*(1.-smoothstep(TX,TX+.15,uT));
   vR=3.14159;vK=0.;vA=(t>0.)?smoothstep(0.,.05,u)*step(u,rev)*smoothstep(1.,.93,u)*cut:0.;put(p,.16+.08*aSeed.z);}`,
   S.MATTER_FS(C.drop,{relief:4,col:lin(.85,.12,.16)}));
  // el lanzador se cura: motas rosadas que suben en espiral
  S.pts(L.part,24,VV+K+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TS-.3)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832+age*2.;float rd=.45+.15*r.y;vec3 p=vec3(-3.7+cos(an)*rd,.2+r.z*1.1+age*.7,sin(an)*rd);
   vR=age*3.;vK=0.;vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.2+.12*r.y)*sin(age*3.14159));}`,MOTE_FS,{mode:'energy'});
  const s0=V3(0,0,0), s1=V3(0,0,0), wv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(TS-0.05,TS+0.2,te), cut=ss(TX,TX+0.18,te), env=te>TS?1-ss(TX,TX+0.3,te):0;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    caster.rotation.z=-0.08*ss(0,TL,te)+0.12*ss(TL,TL+0.06,te)-0.04*ss(TL+0.1,TI,te);
    // alas que zumban ante la boca antes de soltar el aguijón
    const wk=ss(0,0.06,te)*(1-ss(TL,TL+0.12,te));
    wings.forEach((m,i)=>{m.visible=wk>0.01;towardCam(m.position,tmp.copy(MO).add(tmp2.set(0.05,0.2,0)),0.2+0.01*i);
      billboard(m,(i?-1:1)*(0.55+0.25*Math.sin(te*90+i*2)));m.material.uniforms.uA.value=wk;m.scale.setScalar(1.7);
      m.position.addScaledVector(camRight(),(i?0.1:-0.1));});
    if(te<TI){sp(te,s0);sp(te+0.01,s1);wv.copy(s1).sub(s0);}else{s0.set(P1.x+0.04*Math.sin(te*30)*env,P1.y,P1.z);wv.set(1,-0.05,0);}
    sting.visible=te>=TL-0.02&&te<TX+0.25; towardCam(sting.position,tmp.copy(s0).addScaledVector(tmp3.copy(wv).normalize(),-0.35),0.1);
    billboard(sting,scrAng(s0,wv.normalize())); sting.scale.setScalar(2.6*(1+0.1*Math.sin(te*16)*env));
    sting.material.uniforms.uA.value=1; sting.material.uniforms.uEr.value=-0.1+1.1*ss(TX,TX+0.25,te);
    thread.visible=te>TS-0.05&&te<TE+0.1; set(thread,grow,1-ss(TX+0.05,TE,te)); thread.material.uniforms.uQ.value=cut*0.9;
    spark.pose(ia,TC,1.0); ring.pose(ia,3.4,0,0.45,1); heal.pose(te-TS-0.3,-3.7,0,0.7,0.9);
    set(pool,-0.1+1.1*ss(TE-0.4,TE+0.1,te),ia>0?ss(0,0.25,ia):0);
    U.uE.value=env;
    const pulse=0.5+0.5*Math.sin(te*15-2);
    emit(caster,env*grow*(0.12+0.18*pulse),0.9,0.15,0.2);
    const hit=hitE(ia,8); target.position.x=3.4+hit*0.12; target.rotation.z=-hit*0.12*Math.cos(Math.max(ia,0)*16)+0.03*env*Math.sin(te*5);
    target.scale.set(1-0.03*env,1-0.05*env,1-0.03*env); emit(target,0.35*hit,0.9,0.1,0.12);
    if(te<TL){o.g.copy(MO);o.gs=0.5;o.ga=0.06;o.li=0.6;}
    else if(te<TI){o.g.copy(s0);o.gs=0.7;o.ga=0.12;o.li=1.4;}
    else if(te<TX){qb(0.5+0.45*Math.sin(te*2),o.g);o.gs=0.9;o.ga=0.08+0.15*hitE(ia,8);o.li=1+2.5*hitE(ia,6);}
    else{o.g.copy(MO);o.gs=0.8;o.ga=0.06*(1-cut);o.li=0.8*(1-cut);}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.45;o.flash=0.25;
  };
}});

// =====================================================================
// 3 · PINCER — dos mandíbulas en hoz (medias lunas de quitina carmesí con filo aserrado y punta en gancho) se abren a
//     los lados del rival y muerden en tijera dos veces; esquirlas de quitina, dos tajos que sangran y Sangrado.
// =====================================================================
const GASH_FS=`uniform float uEr;uniform float uK;
void main(){vec2 p=(vUv-.5)*2.;float m=0.,core=0.;
 for(int i=0;i<2;i++){float an=i==0?.45:-.35;vec2 q=vec2(cos(an)*p.x+sin(an)*p.y,-sin(an)*p.x+cos(an)*p.y);
  float w=.09*(1.-q.x*q.x);float dy=abs(q.y+.05*sin(q.x*7.));
  m=max(m,smoothstep(w,w*.6,dy)*step(abs(q.x),.95));core=max(core,smoothstep(w*.45,.0,dy)*step(abs(q.x),.9));}
 if(m<.01)discard;float er=styErode(styNoise(vUv*.8).r*.6+.4*m,uEr,.12);
 vec3 c=mix(${lin(.18,.01,.02)},${lin(.95,.12,.1)},core*(.6+.4*uK));
 gl_FragColor=vec4(c,m*er*uA);}`;
defs.push({key:"sty_ibPincer",name:"Pincer (estilizado)",dur:2.1,ti:0.55,tier:2,pal:"Sty Bicho · Pinza",stylized:true,...ZONES,
  phases:[["Apertura",0],["Mordida",0.55],["Segunda",0.85],["Desgarro",1.0],["Desangrado",1.3],["Fin",1.9]],
build(a){
  const L=a.L,T1=0.55,T2=0.85,TD=1.0,TB=[1.3,1.65],TE=1.95,PC=V3(3.2,1.25,0.05);
  const jaws=[1,-1].map(()=>{const m=makeJaw(L.mesh,0,linA(.62,.07,.1),linA(.95,.88,.72),1);L.mesh.add(m);return m;});
  const gash=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),S.mat(GASH_FS,{uEr:{value:0},uK:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(gash);
  const sp1=S.hitSpark(L.mesh,1.3,{seed:0.21}), sp2=S.hitSpark(L.mesh,2.0,{seed:0.83}), ring=S.groundRing(L.decal,2.9);
  const bleed=S.status(a,'bleed',[target],T1+0.05,TE);
  const splat=groundPlane(1.7,3.4,0.022,S.mat(POOL_FS(BLOOD,.55),{},{mode:'matter'})); L.decal.add(splat);
  const K=`const float T1=${f(T1)};const float T2=${f(T2)};const vec3 PC=${v3(PC)};`;
  // esquirlas de quitina de cada mordisco (materia carmesí oscura)
  [[T1,14],[T2,22]].forEach(([t,n])=>S.pts(L.part,n,VV+K+`void main(){float s=${f(t)}+aSeed.x*.04;float tt=max(uT-s,0.);float age=(uT-s)/(.55+aSeed.y*.3);
   vec3 v=normalize(rnd()+vec3(.2,.5,.5))*(1.5+2.*aSeed.z);vec3 p=PC+v*tt+vec3(0.,-5.5*tt*tt,0.);
   vR=aSeed.w*6.28+tt*(aSeed.z-.5)*10.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.22+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:CHITIN})));
  // salpicaduras de sangre en cada tic de Desangrado
  TB.forEach(t=>S.pts(L.part,10,VV+K+`void main(){float s=${f(t)};float tt=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(-.2,.4,.8))*(.8+1.1*aSeed.z);vec3 p=PC+vec3(0.,0.,.25)+v*tt+vec3(0.,-4.*tt*tt,0.);
   vR=3.14159;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.17+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD})));
  a.pose=function(te,o){
    const ia=te-T1, i2=te-T2;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    // apertura (0 = cerradas, 1 = abiertas): abre, muerde, reabre a medias, muerde más fuerte, se separan
    let op;
    if(te<T1-0.1)op=back(ss(0,0.3,te))+0.04*Math.sin(te*40)*ss(0.25,0.45,te);
    else if(te<T1){const k=(te-T1+0.1)/0.1;op=1-1.05*k*k;}
    else if(te<T2-0.08)op=-0.05+0.6*ss(T1+0.05,T1+0.18,te);
    else if(te<T2){const k=(te-T2+0.08)/0.08;op=0.55-0.65*k*k;}
    else op=-0.1+0.03*Math.sin(i2*50)*Math.exp(-i2*8)+0.6*ss(TD,TD+0.25,te);
    const dis=ss(TD,TD+0.35,te), form=ss(0,0.15,te), R=camRight();
    jaws.forEach((m,i)=>{const s=i?1:-1;   // izquierda / derecha en pantalla
      m.visible=dis<0.999&&form>0.01;
      towardCam(m.position,tmp.copy(PC).addScaledVector(R,s*(0.3+0.36*Math.max(op,0))),0.45);
      billboard(m,s*(Math.PI/2)+s*0.45*op);
      m.scale.setScalar(Math.max(1.65*(0.5+0.5*form),0.001));
      jawU(m,form,-0.1+1.1*dis,Math.max(hitE(ia,9)*0.6,hitE(i2,7)));});
    let tick=0; for(const t of TB)tick=Math.max(tick,te>=t?Math.exp(-(te-t)*6):0);
    towardCam(gash.position,TC,0.4); billboard(gash); gash.visible=ia>0&&te<TE+0.1;
    gash.scale.setScalar(0.85+0.1*(i2>0?1:0)); gash.material.uniforms.uA.value=ia>0?(i2>0?1:0.6):0;
    gash.material.uniforms.uK.value=Math.max(tick,hitE(i2,8)); gash.material.uniforms.uEr.value=-0.1+1.1*ss(TE-0.35,TE+0.05,te);
    sp1.pose(ia,PC,0.85); sp2.pose(i2,PC,1.1); ring.pose(i2,3.4,0,0.5,1);
    set(splat,-0.1+1.1*ss(TE-0.3,TE+0.1,te),ia>0?ss(0,0.25,ia):0);
    bleed.pose(te);
    const h1=hitE(ia,9), h2=hitE(i2,6);
    target.position.x=3.4+h1*0.08+h2*0.18; target.rotation.z=-(h1*0.1+h2*0.2)*Math.cos(Math.max(i2,0)*14)+0.04*tick;
    emit(target,0.25*tick+0.4*h2+0.2*h1,0.85,0.08,0.1);
    if(te<T1){o.g.copy(PC);o.gs=0.8;o.ga=0.06*form;o.li=0.8*form;}
    else{const il=i2>=0?i2:ia, k=i2>=0?1:0.6;o.g.copy(PC);o.gs=0.9+1.2*Math.min(il,0.4)*k;o.ga=Math.exp(-il*9)*0.18*k+0.05*tick;o.li=3*k*Math.exp(-il*6)+0.8*tick;}
    o.ia=i2>=0?i2:ia;o.c.copy(PC);o.shake=0;o.dist=i2>=0?0.6:0.4;o.flash=i2>=0?0.4:0.25;
  };
}});

// =====================================================================
// 4 · SQUARE TEETH — el escudo del lanzador destella en hexágonos ámbar y su fuerza viaja en motas hasta la boca
//     (bonus del 50 % del escudo); unas fauces de hormiga león en media luna con dientes cuadrados caen sobre el rival y
//     lo trituran con un rechinar seco: la armadura se resquebraja, saltan lascas de piedra, polvo y arena.
// =====================================================================
const CRACK_FS=`uniform float uEr;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float j=styNoise(vec2(r*.5,an*.3)).r-.5;
 float rays=pow(1.-abs(fract(an*1.1+j*.4)*2.-1.),20.)+pow(1.-abs(fract(an*1.9+j*.6+.3)*2.-1.),28.)*.7;
 float m=rays*smoothstep(uP,uP-.25,r)*smoothstep(1.,.55,r);if(m<.05)discard;
 float er=styErode(styNoise(vUv*.9).r*.6+.4*m,uEr,.12);
 vec3 c=mix(${lin(.12,.04,.02)},styRampOf(uC1,.85)*1.3,smoothstep(.5,1.,rays)*(1.-uEr));
 gl_FragColor=vec4(c,clamp(m*1.5,0.,1.)*er*uA);}`;
// hexágonos del escudo del lanzador (energía ámbar suave); uP = barrido
const HEX_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p*vec2(1.,.8));if(r>1.)discard;
 vec2 g=p*4.;g.x*=1.1547;g.y+=mod(floor(g.x),2.)*.5;vec2 f=abs(fract(g)-.5);float hex=abs(max(f.x*1.5+f.y,f.y*2.)-1.)<.15?1.:0.;
 float sweep=smoothstep(.2,0.,abs(p.y+1.-uP*2.4));float rim=smoothstep(.8,1.,r);
 float m=(hex*(.35+.65*sweep)+rim*.6)*smoothstep(1.,.92,r);if(m<.02)discard;
 gl_FragColor=vec4(styRampOf(uC1,.8)*1.2,m*uA);}`;
defs.push({key:"sty_ibSquareTeeth",name:"Square Teeth (estilizado)",dur:1.2,ti:0.34,tier:1,pal:"Sty Bicho · Dientes",stylized:true,...ZONES,
  phases:[["Fauces",0],["Trituración",0.34],["Polvo",0.58],["Fin",0.95]],
build(a){
  const L=a.L,T0=0.16,TI=0.34,TG=0.56,TE=0.95,JC=V3(3.2,1.32,0.05);
  const top=makeJaw(L.mesh,1,linA(.55,.08,.07),linA(.98,.8,.42),1), bot=makeJaw(L.mesh,1,linA(.55,.08,.07),linA(.98,.8,.42),0);
  L.mesh.add(top,bot);
  const crack=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),S.mat(CRACK_FS,{uEr:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(crack);
  const hex=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.9),S.mat(HEX_FS,{},{mode:'energy'})); L.mesh.add(hex);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.47}), ring=S.groundRing(L.decal,2.4);
  const K=`const float T0=${f(T0)};const float TI=${f(TI)};const float TG=${f(TG)};const vec3 JC=${v3(JC)};`;
  // fuerza del escudo: motas ámbar del lanzador a las fauces
  S.pts(L.part,18,VV+K+`void main(){float s=.02+aSeed.x*.2;float k=clamp((uT-s)/.2,0.,1.);
   vec3 a0=vec3(-3.6,.9+aSeed.y*.7,(aSeed.z-.5)*.4);vec3 p=mix(a0,JC,k*k)+vec3(0.,sin(k*3.14159)*.6,0.)+rnd()*.06;
   vR=0.;vK=0.;vA=(uT>s&&k<1.)?1.:0.;put(p,.16+.08*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // lascas de armadura (piedra)
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=(uT-s)/(.45+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(.1,.55,.7))*(1.4+1.6*aSeed.z);vec3 p=JC+v*t+vec3(0.,-6.*t*t,0.);
   vR=aSeed.w*6.28+t*9.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.&&p.y>.04)?1.:0.;put(p,.2+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:STONE}));
  // polvo seco del rechinar
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.15;float t=max(uT-s,0.);float age=(uT-s)/(.5+aSeed.y*.3);
   vec3 d=normalize(rnd()+vec3(0.,.3,.6));vec3 p=JC+vec3(0.,-.2,0.)+d*(.2+.45*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.15*t,0.);
   vR=aSeed.w*6.;vK=smoothstep(.3,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.32+.16*aSeed.w)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:3,col:EARTH}));
  // arena que se escurre de los dientes al moler
  S.pts(L.part,30,VV+K+`void main(){float life=.3+aSeed.y*.15;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=JC+vec3((r.x-.5)*.8,-.3-age*age*1.,.25+(r.z-.5)*.1);
   vR=r.z*6.;vK=0.;vA=(k>=1.&&uT<${f(TE)}&&p.y>.04)?(1.-smoothstep(TG,${f(TE)},uT)):0.;put(p,.07+.04*r.y);}`,
   S.MATTER_FS(C.shard,{relief:2,col:lin(.85,.68,.42)}));
  a.pose=function(te,o){
    const ia=te-TI, c=te<T0?0:te<TI?Math.pow((te-T0)/(TI-T0),2):1;
    resetDummy(caster); resetDummy(target); caster.position.x=-3.7; target.position.x=3.4;
    const grind=ia>0?0.05*Math.sin(te*70)*(1-ss(TI,TG,te)):0, dis=ss(TG,TE,te), form=ss(0,T0,te);
    const open=Math.max(0.85*(1-c),0)+(ia>0?0.05*Math.exp(-ia*20):0);
    const R=camRight();
    [[top,1],[bot,-1]].forEach(([m,s])=>{m.visible=dis<0.999&&form>0.01;
      towardCam(m.position,tmp.copy(JC).addScaledVector(R,grind*s).add(tmp2.set(0,s*(0.14+0.5*open),0)),0.45);
      billboard(m,s*0.15*open); m.scale.setScalar(Math.max(1.6*(0.5+0.5*back(form)),0.001));
      jawU(m,form,-0.1+1.1*dis,hitE(ia,9));});
    // destello hexagonal del escudo del lanzador (la fuerza que suma al mordisco)
    const hk=ss(0,0.06,te)*(1-ss(0.2,0.32,te));
    hex.visible=hk>0.01; towardCam(hex.position,tmp.set(-3.7,0.95,0),0.5); billboard(hex); set(hex,cl(te/0.3),hk*0.8);
    towardCam(crack.position,JC,0.42); billboard(crack); crack.visible=ia>0&&te<TE+0.1;
    set(crack,ss(0,0.12,ia),1); crack.material.uniforms.uEr.value=-0.1+1.1*ss(TG,TE+0.05,te);
    spark.pose(ia,JC,0.9); ring.pose(ia,3.4,0,0.4,0.9);
    const hit=hitE(ia,10); target.scale.set(1+0.06*hit,1-0.12*hit,1+0.06*hit); target.position.x=3.4+hit*0.06+grind*0.6;
    emit(target,0.25*hit,0.95,0.55,0.2); emit(caster,0.25*hk,0.95,0.6,0.2);
    if(te<TI){o.g.copy(JC);o.gs=0.6;o.ga=0.05*form;o.li=0.7*form;}
    else{o.g.copy(JC);o.gs=0.8+1.2*Math.min(ia,0.3);o.ga=Math.exp(-ia*10)*0.15;o.li=2.5*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(JC);o.shake=0;o.dist=0.45;o.flash=0.25;
  };
}});

VFX.module("Estilizado · Bicho · Boca",defs);
})();

// =====================================================================
// ESTILIZADO · BESTIA · ESPALDA (Hito 101) — las 6 cartas de espalda de Bestia y Rice (carta de cola que vive en este
// módulo) hechas a mano con el kit vfx-stylized.js. Claves: sty_<clave original> (sty_furball, sty_hero…).
// Mismos dur / ti / fases que las originales (ya con su factor de nivel), así el daño llega igual.
// Semántica según PartCards.js:
//   Furball (2 golpes) · Hero (daño + 1 PM) · Jaguar (cuerpo a cuerpo + Sangrado) · Rice (cuerpo a cuerpo, roba vida, +1 PA)
//   Risky Beast (gran golpe, Débil al lanzador) · Ronin (iaido cuerpo a cuerpo) · Timber (aliado: escudo + guarda)
// Identidad Bestia: pelaje ámbar/naranja cálido; cada carta con su acento. Colores fijos en espacio lineal (lin()).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_FUR=pal("Sty Bestia · Ovillo",["#ffb24a","#c2410c"]);
const P_HERO=pal("Sty Bestia · Héroe",["#ffd66b","#c4561c"]);
const P_JAG=pal("Sty Bestia · Jaguar",["#ffb347","#8a2f0c"]);
const P_RICE=pal("Sty Bestia · Arroz",["#ffe7a0","#c98a1e"]);
const P_RISK=pal("Sty Bestia · Riesgo",["#ff7a4a","#8a0f1c"]);
const P_RONIN=pal("Sty Bestia · Ronin",["#dfe6f5","#34456e"]);
const P_TIMB=pal("Sty Bestia · Corteza",["#ffab4a","#7a3d17"]);

const lin=hex=>{const c=new THREE.Color(hex);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const TX=3.4, CX=-3.7, TC=V3(3.15,1.2,0), CB=V3(-3.85,1.25,0), TILE=1.93;
const MELEE={zoneCaster:0.5,zoneTarget:1.2};
const RANGED={zoneCaster:0.6,zoneTarget:1.1};
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const AMBER=lin('#f29a3a'), AMBER_D=lin('#9a4a12'), CREAM=lin('#fbefd6'), EARTH=lin('#8a6a48'), SOOT=lin('#3a2c24'),
  GOLD=lin('#ffc23d'), STEEL=lin('#c9d2e2'), INK=lin('#1a1626'), BLOOD=lin('#b3121c'), BARK=lin('#7a4a26'), BARK_D=lin('#3f2414'),
  EMBER=lin('#ff8a2a'), CRIMSON=lin('#c81e2a'), RICEW=lin('#fff6e2'), NORI=lin('#1f3a2a'), HEAL=lin('#9be37a');

// ---------- shaders compartidos ----------
// sólido con luz en 3 bandas: body fija `base` (y lb, sesgo de la rampa); uQ = erosión, uK = brillo interior
const SOLID=(body,{hot='uC1',rim=.2,er=.05,nzs='vec2(1.7,.9)',side=false}={})=>`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);${side?'if(!gl_FrontFacing)n=-n;':''}vec3 L=stySunV();
 float nz=styNoise(vUv*${nzs}+.21).r;if(styErode(nz,uQ,${f(er)})<.5)discard;
 vec3 base=vec3(.5);float lb=0.;${body}
 float l=styLight(n,L);
 vec3 c=styRampOf(base,clamp(.22+.56*l+lb+(nz-.5)*.08,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*${f(rim)}*smoothstep(.62,.72,fr)*step(.5,l);
 c+=${hot}*uK;gl_FragColor=vec4(c,1.);}`;
// mancha en el suelo (materia): col = color GLSL, uP = erosión
const STAIN=(col,alpha=.6,lo=.12)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.66,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},${f(lo)}+.3*n),m*er*uA*${f(alpha)});}`;
// grietas en el suelo (materia oscura con brillo de brasa opcional en uK)
const CRACKS=`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float n=styNoise(vec2(an*.8,r*.35)+.4).r;float br=smoothstep(.06,.0,abs(fract(an/6.2832*7.+n*.6)-.5)*r*1.6)*step(r,.95)*(1.-r*.7);
 float m=br;if(m<.03)discard;float er=styErode(n*.6+(1.-r)*.4,uP,.12);
 vec3 c=mix(${SOOT},uC1*1.4,uK*smoothstep(.2,.8,1.-r));gl_FragColor=vec4(c,m*er*uA);}`;
// corte / media luna del atlas (energía); uEr = erosión, uW = semilla
const SLASH_M=`uniform float uEr;uniform float uW;void main(){vec4 s=styShape(6.,vUv);float m=s.r;if(m<.01)discard;
 float er=styErode(m*.5+styNoise(vUv*vec2(1.,.5)+uW).r*.5,uEr,.12);
 gl_FragColor=vec4(styRamp(.5+.5*m)+vec3(1.,.95,.9)*s.g*.4,m*er*uA);}`;
// anillo de pincel vertical (energía); uEr erosión, giro uR
const RINGV=`uniform float uEr;uniform float uR;void main(){vec2 p=vUv-.5;float c=cos(uR),s=sin(uR);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+.5;
 vec4 sh=styShape(7.,p);float er=styErode(sh.r*.55+sh.b*.45,uEr,.12);gl_FragColor=vec4(styRamp(.6+.4*sh.g)*1.15,sh.r*er*uA);}`;
// tres zarpazos paralelos (materia oscura con borde de color): uEr erosión, uW semilla
const CLAW=(edge)=>`uniform float uEr;uniform float uW;void main(){vec2 p=vUv;float m=0.;float e=0.;
 for(int i=0;i<3;i++){float fi=float(i);float y=.3+fi*.2+.08*sin(p.x*3.1416+fi);float w=max(.07*sin(3.1416*clamp((p.x-.06*fi)/.85,0.,1.)),.002);
  float d=abs(p.y-y);m=max(m,smoothstep(w,w*.4,d));e=max(e,smoothstep(w*1.9,w,d)*(1.-smoothstep(w,w*.4,d)));}
 float a=max(m,e*.9);if(a<.02)discard;float er=styErode(a*.4+styNoise(p*vec2(1.2,.5)+uW).r*.6,uEr,.1);
 vec3 c=mix(${edge}*1.3,vec3(.16,.02,.03),m*.85);gl_FragColor=vec4(c+${edge}*e*.5,a*er*uA);}`;
const defs=[];
// Hito 104: une varias piezas en UNA malla (el puente mueve entera una malla compacta; piezas sueltas se separaban al
// cruzar el pasillo estirado). Cada pieza lleva su número en la U de la textura (u + 2·pieza) para colorearla en el shader.
const mergeParts=(list)=>{const P=[],N=[],T=[];
  for(const [g0,part] of list){const g=g0.index?g0.toNonIndexed():g0;const pa=g.attributes.position.array,na=g.attributes.normal.array,ua=g.attributes.uv.array;
    for(let i=0;i<pa.length;i++){P.push(pa[i]);N.push(na[i]);}
    for(let i=0;i<ua.length;i+=2){T.push(ua[i]+2*part,ua[i+1]);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(T,2));
  g.computeBoundingSphere();return g;};

// =====================================================================
// 1 · FURBALL — un ovillo de pelo ámbar se enrolla en la espalda, sale despedido y bota por el tablero envuelto en
//     llamas; golpea al rival (ti), rebota y le cae encima otra vez (2.º golpe) y estalla en mechones y brasas.
//     ti 1,245 s (2.º golpe +0,28 s)
// =====================================================================
defs.push({key:"sty_furball",name:"Furball (estilizado)",dur:2.25,ti:1.245,pal:P_FUR,tier:2,stylized:true,...RANGED,
  phases:[["Ovillo",0],["Lanzamiento",0.3],["Botes",0.615],["Explosión",1.245],["Rescoldos",1.4625]],
build(a){
  const L=a.L,TL=0.3,TI=1.245,T2=TI+0.28,TE=2.25;
  const KX=[-3.6,-1.35,0.85,3.0], KT=[TL,0.62,0.93,TI], KH=[1.5,1.25,1.05], R=0.55;
  const furM=S.mat(SOLID(`vec3 q=normalize(vP);float sw=sin(atan(q.z,q.x)*5.+q.y*7.+styNoise(vUv*3.).r*4.);
    float st=smoothstep(.3,.6,sw);base=mix(${AMBER},${AMBER_D},st*.75);base=mix(base,${CREAM},smoothstep(.75,.95,q.y)*.35);lb=-.05*st;`,
    {hot:'uC1',rim:.35,nzs:'vec2(3.,2.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(R,3),furM); L.mesh.add(ball);
  const shade=S.contactShadow(L.decal,1.3);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.31}), spark2=S.hitSpark(L.mesh,1.4,{seed:0.77});
  const ring=S.groundRing(L.decal,2.8), ring2=S.groundRing(L.decal,2.4);
  const bounceR=[0,1].map(()=>S.groundRing(L.decal,1.6));
  const scorch=groundPlane(2.0,TX,0.026,S.mat(STAIN(SOOT,.5),{},{mode:'matter'})); L.decal.add(scorch);
  const BP=new THREE.Vector3(); const bu=[];
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float T2=${f(T2)};uniform vec3 uB;`;
  const uni={uB:{value:BP}};
  // llamas que envuelven el ovillo y quedan detrás como estela
  a.count+=S.pts(L.part,34,VV+K+`void main(){float life=.22+aSeed.y*.12;float k=(uT-TL+.05)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float on=step(TL-.05,uT)*step(uT,T2);vec3 p=uB+normalize(r-.5)*${f(R*0.85)}+vec3(-.6*age,.55*age,0.);
   vA=on*smoothstep(0.,.15,age);vK=smoothstep(.25,1.,age);vR=(r.x-.5)*.6;put(p,(.42+.2*r.z)*(1.-.4*age));}`,S.ENERGY_FS(C.flame,{gain:1.3}),{mode:'energy',uniforms:uni});
  // mechones de pelo al botar y al estallar
  a.count+=S.pts(L.part,40,VV+K+`void main(){float s=T2+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.7,0.))*(2.2+2.2*aSeed.z);vec3 p=vec3(${f(TC.x)},1.05,0.)+v*t*(1.-.5*t)+vec3(0.,-2.6*t*t,0.);p.y=max(p.y,.05);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.28+t*5.;put(p,.3+.16*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:4,col:AMBER,bias:.05}));
  // brasas de los rescoldos
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=T2+aSeed.x*.5;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(TX)}+(aSeed.z-.5)*1.4,.1+t*(.8+aSeed.w*.6),(aSeed.y-.5)*1.)+vec3(sin(t*6.+aSeed.x*9.)*.12,0.,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=0.;vR=0.;put(p,.12+.08*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.6}),{mode:'energy'});
  const path=(te,out)=>{
    if(te<TL){const u=cl(te/TL);out.set(CB.x-0.05,CB.y+0.35*e3(u),0.05);return 0.35+0.65*e3(u);}
    if(te<TI){let i=0;while(i<2&&te>KT[i+1])i++;const u=cl((te-KT[i])/(KT[i+1]-KT[i]));
      const y0=i===0?CB.y+0.35:R, y1=i===2?TC.y:R;out.set(KX[i]+(KX[i+1]-KX[i])*u,y0+(y1-y0)*u+KH[i]*4*u*(1-u),0.05);return 1;}
    if(te<T2){const u=cl((te-TI)/(T2-TI));out.set(3.0+0.15*u,TC.y+0.95*4*u*(1-u)-0.05*u,0.05);return 1;}
    out.set(3.15,TC.y-0.05,0.05);return 1;};
  a.pose=function(te,o){
    const ia=te-TI, i2=te-T2;
    const sc=path(te,ball.position); BP.copy(ball.position);
    let sq=1; for(let i=1;i<3;i++){const d=te-KT[i];if(d>-0.03&&d<0.08)sq=1-0.28*Math.exp(-Math.abs(d)*30);}
    const pop=ss(T2,T2+0.12,te);
    ball.scale.set(sc*(2-sq)*(1+0.3*pop),sc*sq*(1+0.3*pop),sc*(2-sq)*(1+0.3*pop));
    ball.rotation.z=-te*9; ball.visible=te<T2+0.14;
    furM.uniforms.uQ.value=-0.1+1.2*pop; furM.uniforms.uK.value=0.25*ss(TL,TL+0.2,te)+0.6*hitE(ia,10)+0.8*pop;
    shade.pose(ball.position.x,0,1.2*sc,te<T2+0.1?0.55*(1-cl((ball.position.y-0.4)/3)):0);
    bounceR.forEach((r,i)=>r.pose(te-KT[i+1],KX[i+1],0,0.35,0.8));
    spark.pose(ia,TC,1.1); spark2.pose(i2,TC,1.2);
    ring.pose(ia,TX,0,0.42,0.9); ring2.pose(i2,TX,0,0.5,1.1);
    scorch.visible=i2>=0; set(scorch,i2>=0?-0.1+1.15*ss(0.5,0.95,i2):0,1);
    const h=hitE(ia,9), h2=hitE(i2,8);
    target.position.x=TX+0.16*h+0.22*h2; target.position.y=-0.03*h2; target.rotation.z=-0.1*(h+h2)*Math.cos(ia*40);
    target.scale.set(1+0.06*h2,1-0.12*h2,1+0.06*h2);
    caster.rotation.z=0.15*ss(0,TL,te)-0.3*ss(TL,TL+0.08,te)+0.15*ss(TL+0.1,TL+0.5,te);
    o.em=0.5*h+0.6*h2; o.emc.copy(U.uC1.value);
    if(te<TI){o.g.copy(ball.position);o.gs=0.9*sc;o.ga=0.25;o.li=2.4;}
    else{o.g.copy(TC);o.gs=1.4+3*Math.max(i2,0);o.ga=0.55*Math.max(h,h2);o.li=8*Math.max(h,h2);}
    o.ia=ia;o.c.copy(TC);o.shake=i2>=0?0.6:0.35;o.dist=0.6;o.flash=0.7;
  };
}});

// =====================================================================
// 2 · HERO — una capa roja ondea en la espalda y la luz dorada forja una espada sobre la cabeza; el lanzador da un salto
//     y la espada cae en tajo vertical sobre el rival (ti): media luna dorada, esquirlas, grietas. Después un remolino
//     dorado a los pies (+1 PM) y la espada se deshace en motas. ti 0,6 s
// =====================================================================
defs.push({key:"sty_hero",name:"Hero (estilizado)",dur:2.25,ti:0.6,pal:P_HERO,tier:2,stylized:true,...RANGED,
  phases:[["Llamada",0],["Descenso",0.3],["Bendición",0.6],["Heroico",0.8625],["Fin",1.875]],
build(a){
  const L=a.L,TD=0.3,TI=0.6,TH=0.8625,TF=1.875,TE=2.25;
  // espada en UNA sola malla compacta (a media escala; el grupo la duplica): hoja + punta (0), guarda y pomo (1), puño (2),
  // todo centrado en el eje de la hoja. Así el puente la mueve entera y el mango no se descuadra en el vuelo.
  const HS=0.5, mk=(geo,part,y)=>[geo.translate(0,y,0).scale(HS,HS,HS),part];
  const swordG=mergeParts([
    mk(new THREE.BoxGeometry(0.2,1.5,0.06),0,0.95),
    mk(new THREE.ConeGeometry(0.142,0.32,4).rotateY(Math.PI/4).scale(1,1,0.3),0,1.86),
    mk(new THREE.BoxGeometry(0.72,0.12,0.12),1,0.14),
    mk(new THREE.SphereGeometry(0.06,10,8).scale(1,1,1),1,0.14+0.0),
    mk(new THREE.CylinderGeometry(0.055,0.06,0.36,10),2,-0.1),
    mk(new THREE.SphereGeometry(0.09,14,10),1,-0.32)]);
  const swordM=S.mat(SOLID(`float part=floor(vUv.x*.5+.001);float ux=vUv.x-part*2.;
    if(part<.5){float e=abs(ux-.5)*2.;base=mix(${STEEL},${lin('#fff3c8')},smoothstep(.55,.9,e));lb=.06;}
    else if(part<1.5){base=${GOLD};}else{base=${lin('#7a2416')};float wr=step(.5,fract(vUv.y*6.));lb=-.08*wr;}`,
    {hot:'vec3(1.,.82,.4)',rim:.45,nzs:'vec2(.5,3.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const sword=new THREE.Group(); L.mesh.add(sword); sword.add(new THREE.Mesh(swordG,swordM));
  // capa: plano que ondea en la espalda (materia roja con ribete dorado)
  const capeG=new THREE.PlaneGeometry(1.0,1.15,10,10).translate(0,-0.575,0);
  const capeM=S.mat(`uniform float uQ;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
   float nz=styNoise(vUv*vec2(1.4,1.)+.5).r;if(styErode(nz*.6+(1.-vUv.y)*.4,uQ,.05)<.5)discard;
   float rim=step(vUv.y,.07)+step(.93,vUv.x)+step(vUv.x,.07);vec3 base=mix(${lin('#b3202a')},${GOLD},clamp(rim,0.,1.));
   vec3 c=styRampOf(base,clamp(.24+.55*l+(nz-.5)*.1,0.,1.))*styTint(l);gl_FragColor=vec4(c,1.);}`,{uQ:{value:-1}},{mode:'solid',side:THREE.DoubleSide});
  const cape=new THREE.Mesh(capeG,capeM); L.mesh.add(cape);
  const capeBase=capeG.attributes.position.array.slice();
  const arc=new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.8),S.mat(SLASH_M,{uEr:{value:0},uW:{value:0.4}},{mode:'energy',depthTest:false})); L.trail.add(arc);
  const spark=S.hitSpark(L.mesh,1.9,{seed:0.52}), ring=S.groundRing(L.decal,3.2);
  const cracks=groundPlane(2.8,TX,0.028,S.mat(CRACKS,{uK:{value:0}},{mode:'matter'})); L.decal.add(cracks);
  const swirl=groundPlane(2.2,CX,0.03,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float s=smoothstep(.09,.0,abs(fract(an/6.2832*3.+r*1.2-uT*1.8)-.5)-.32)*smoothstep(1.,.5,r)*smoothstep(.15,.35,r);
   float er=styErode(styNoise(vUv*.7).r,uP,.12);gl_FragColor=vec4(styRamp(.65+.3*r)*1.1,s*er*uA);}`,{},{mode:'energy'})); L.decal.add(swirl);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const float TH=${f(TH)};const float TF=${f(TF)};`;
  // luz que forja la espada: motas doradas que convergen sobre la cabeza
  a.count+=S.pts(L.part,20,VV+K+`void main(){float s=aSeed.x*.12;float age=(uT-s)/.26;float u=clamp(age,0.,1.);
   vec3 d=normalize(rnd())*(1.3+.4*aSeed.z);vec3 c=vec3(-3.7,2.6,0.);vec3 p=c+d*(1.-u*u);
   vA=(age>0.&&age<1.)?1.:0.;vK=0.;vR=0.;put(p,.2+.1*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  // esquirlas doradas y polvo en el golpe
  a.count+=S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(2.+2.4*aSeed.z);vec3 p=vec3(${f(TC.x)},.6,0.)+v*t*(1.-.5*t)+vec3(0.,-3.2*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.2+.12*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:GOLD,bias:.1}));
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX)}+cos(an)*(.3+1.3*t),.15+.35*t,sin(an)*(.25+.9*t));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.5+.3*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.15}));
  // viento dorado (+1 PM): trazos que suben girando a los pies
  a.count+=S.pts(L.part,18,VV+K+`void main(){float life=.45;float k=(uT-TH)/life+aSeed.x;float age=fract(k);float on=step(TH,uT)*step(uT,TF)*step(0.,k);
   float an=aSeed.y*6.2832+age*5.;vec3 p=vec3(-3.7+cos(an)*.55,.08+age*1.3,sin(an)*.55);
   vA=on*sin(age*3.14159);vK=0.;vR=-an;put(p,.32);}`,S.ENERGY_FS(C.slash,{gain:1.3}),{mode:'energy'});
  const cm=capeG.attributes.position;
  a.pose=function(te,o){
    const ia=te-TI;
    // salto y caída del lanzador
    const jump=ss(TD-0.1,TD+0.1,te)*(1-ss(TI-0.05,TI+0.12,te));
    caster.position.x=CX+0.55*ss(TD-0.1,TI,te)*(1-ss(TH,TF,te)); caster.position.y=0.55*jump;
    caster.rotation.z=-0.25*jump+0.12*hitE(ia,8);
    const land=hitE(ia,10); caster.scale.set(1+0.1*land,1-0.12*land,1+0.1*land);
    // capa detrás del lanzador
    cape.position.set(caster.position.x-0.35,caster.position.y+1.45,-0.1); cape.rotation.set(0,0.35,0.25+0.4*jump);
    const wind=0.25+0.9*jump+0.4*ss(0,0.2,te);
    for(let i=0;i<cm.count;i++){const x=capeBase[i*3],y=capeBase[i*3+1];const d=-y/1.15;
      cm.setZ(i,Math.sin(te*9+y*5+x*2)*0.14*d*wind-0.35*d*d*wind);}
    cm.needsUpdate=true; capeM.uniforms.uQ.value=-0.1+1.2*ss(TF,TE-0.05,te); cape.visible=te<TE-0.02;
    // espada: se forja sobre la cabeza, sube y cae en tajo sobre el rival
    let sc=1;
    if(te<TD){sword.position.set(CX,2.25+0.2*e3(te/TD),0.1);sword.rotation.z=0;sc=0.2+0.8*e3(te/TD);}
    else if(te<TI){const u=ss(TD,TI,te);sword.position.set(CX+(2.65-CX)*e3(u),2.45+0.6*Math.sin(u*Math.PI)-0.4*u,0.1);sword.rotation.z=2.6*u*u;}
    else{const k=e3(cl(ia/0.08));sword.position.set(2.65,2.05-0.7*k,0.1);sword.rotation.z=2.6-0.25*k;}
    sword.scale.setScalar(Math.max(sc*1.4/HS,0.001));
    const dis=ss(TF-0.5,TF,te); swordM.uniforms.uQ.value=-0.1+1.2*dis;
    swordM.uniforms.uK.value=0.5*(1-cl(te/TD))+0.9*hitE(ia,9);
    sword.visible=te<TF+0.02;
    // tajo, chispa, grietas, remolino
    towardCam(arc.position,tmp.set(TX-0.25,1.25,0),0.4); billboard(arc,-0.9); arc.visible=ia>=0&&ia<0.4;
    arc.scale.setScalar(0.8+0.4*e3(cl(ia/0.1))); arc.material.uniforms.uA.value=1; arc.material.uniforms.uEr.value=-0.1+1.1*ss(0.08,0.38,ia);
    spark.pose(ia,TC,1.15); ring.pose(ia,TX,0,0.45,1.1);
    cracks.visible=ia>=0; cracks.scale.setScalar(0.6+0.4*e3(cl(ia/0.15))); set(cracks,ia>=0?-0.1+1.15*ss(0.6,1.4,ia):0,1); cracks.material.uniforms.uK.value=hitE(ia,4);
    swirl.position.x=caster.position.x; swirl.visible=te>TH-0.05&&te<TF+0.2; set(swirl,-0.1+1.1*ss(TF-0.3,TF+0.2,te),ss(TH-0.05,TH+0.15,te));
    const h=hitE(ia,8);
    target.position.x=TX+0.18*h; target.scale.set(1+0.1*h,1-0.16*h,1+0.1*h); target.rotation.z=-0.08*h*Math.cos(ia*40);
    o.em=0.6*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.copy(sword.position);o.g.y+=0.9;o.gs=1.1;o.ga=0.45;o.li=3;}
    else{o.g.copy(TC);o.gs=1.6+4*ia;o.ga=Math.exp(-ia*9)*0.7;o.li=10*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(TC);o.shake=0.8;o.dist=0.8;o.flash=0.8;
  };
}});

// =====================================================================
// 3 · JAGUAR — el lanzador se agazapa (ojos ámbar); un jaguar espiritual de rosetas sale de su espalda, salta en arco,
//     cae en picado sobre el rival y da tres zarpazos (el último, remate, en ti); sangrado y el jaguar se deshace en
//     humo y brasas. Cuerpo a cuerpo. ti 1,02 s
// =====================================================================
defs.push({key:"sty_jaguar",name:"Jaguar (estilizado)",dur:2.21,ti:1.02,pal:P_JAG,tier:2,stylized:true,...MELEE,
  phases:[["Acecho",0],["Salto",0.2125],["Picado",0.595],["Zarpazos",0.782],["Remate",1.02],["Regreso",1.4025]],
build(a){
  const L=a.L,TS=0.2125,TP=0.595,TZ=0.782,TI=1.02,TR=1.4025,TE=2.21;
  const HITS=[TZ,0.9,TI];
  // Hito 104: jaguar espiritual en 3D (antes una silueta plana estirada): torso, pecho, cadera, cabeza con hocico y orejas,
  // cuatro patas y cola en curva, sin rasgos de cara. Dos poses (salto con las patas estiradas / zarpazo con las delanteras
  // en alto), cada una en UNA malla compacta a media escala para que el puente la mueva entera.
  const JS=0.5;
  const sph=(r,x,y,z,sx=1,sy=1,sz=1)=>new THREE.SphereGeometry(r,14,10).scale(sx,sy,sz).translate(x,y,z);
  const leg=(x,y,z,ang,len,r)=>{const g=new THREE.CapsuleGeometry(r,len,4,8).translate(0,-len/2,0).rotateZ(ang).translate(x,y,z);
    return [g,[x+Math.sin(ang)*len,y-Math.cos(ang)*len,z]];};
  const jagGeo=(strike)=>{const parts=[];
    parts.push([new THREE.CapsuleGeometry(0.25,0.8,6,14).rotateZ(Math.PI/2).scale(1,0.92,0.9),0]);
    parts.push([sph(0.3,0.36,0.04,0,1,1.05,0.92),0]);parts.push([sph(0.29,-0.38,0.0,0,1,1,0.92),0]);
    parts.push([sph(0.21,0.7,0.2,0,1.15,0.95,0.9),0]);parts.push([sph(0.11,0.88,0.13,0,1.2,0.85,0.9),1]);
    for(const zz of [-0.1,0.1])parts.push([new THREE.ConeGeometry(0.06,0.13,8).translate(0.63,0.4,zz),2]);
    const fa=strike?2.0:1.15, ha=strike?-0.35:-1.15;
    for(const zz of [-0.13,0.13]){
      const [gf,pf]=leg(0.42,-0.1,zz,fa+(zz>0?0.15:-0.1),0.42,0.075);parts.push([gf,0]);parts.push([sph(0.085,...pf),1]);
      if(strike)for(let c=-1;c<=1;c++)parts.push([new THREE.ConeGeometry(0.022,0.11,5).rotateZ(-Math.PI/2+0.3).translate(pf[0]+0.07,pf[1]+0.02*c,pf[2]+0.035*c),3]);
      const [gh,ph]=leg(-0.42,-0.1,zz,ha+(zz>0?0.12:-0.08),0.44,0.085);parts.push([gh,0]);parts.push([sph(0.09,...ph),1]);}
    for(let k=0;k<7;k++){const u=k/6;parts.push([sph(0.075*(1-0.45*u),-0.62-0.15*k,0.04+0.42*u*u+0.06*Math.sin(u*3.1),0),k===6?2:0]);}
    return mergeParts(parts.map(([g,pt])=>[g.scale(JS,JS,JS),pt]));};
  const jagM=S.mat(SOLID(`float part=floor(vUv.x*.5+.001);
    if(part<.5){vec3 q=vP/${f(JS)};vec4 cel=styNoise(q.xy*vec2(1.9,2.3)+q.z*.7+.31);
      float ros=smoothstep(.13,.07,abs(cel.g-.52))*smoothstep(-.12,.05,q.y);float spot=smoothstep(.08,.03,cel.g)*.8;
      float belly=smoothstep(-.06,-.22,q.y);base=mix(${AMBER},${CREAM},belly*.75);base=mix(base,${lin('#2a160c')},max(ros,spot)*(1.-belly));lb=-.04*ros;}
    else if(part<1.5){base=${CREAM};}else if(part<2.5){base=${lin('#2a160c')};lb=-.05;}else{base=${lin('#fff2d8')};lb=.15;}`,
    {hot:'uC1',rim:.5,nzs:'vec2(2.,2.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const jagA=new THREE.Mesh(jagGeo(false),jagM), jagB=new THREE.Mesh(jagGeo(true),jagM); L.mesh.add(jagA,jagB);
  const shade=S.contactShadow(L.decal,1.6);
  const claws=HITS.map((t,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.3),S.mat(CLAW('uC1'),{uEr:{value:0},uW:{value:i*.37}},{mode:'matter',depthTest:false}));L.trail.add(m);return m;});
  const sparks=HITS.map((t,i)=>S.hitSpark(L.mesh,i===2?1.7:1.1,{seed:0.2+i*0.23}));
  const ring=S.groundRing(L.decal,2.8);
  const eyes=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.2),S.mat(`void main(){vec2 p=vUv-.5;p.x*=2.5;
   float e=max(smoothstep(.1,.06,length(p-vec2(-.42,0.))),smoothstep(.1,.06,length(p-vec2(.42,0.))));if(e<.02)discard;
   gl_FragColor=vec4(vec3(1.,.75,.2)*1.8,e*uA);}`,{},{mode:'energy',depthTest:false})); L.mesh.add(eyes);
  const bleed=S.status(a,'bleed',[target],TI,TE-0.05);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const float TR=${f(TR)};`;
  // brasas y humo que deja el jaguar al saltar y al deshacerse
  const JP=new THREE.Vector3(); const uni={uJ:{value:JP}};
  a.count+=S.pts(L.part,26,VV+K+`uniform vec3 uJ;void main(){float life=.3+aSeed.y*.15;float k=(uT-TS)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float on=step(TS,uT)*step(uT,TR);vec3 p=uJ+vec3((r.x-.5)*.9,(r.y-.5)*.4,(r.z-.5)*.3)+vec3(-.5*age,.3*age,0.);
   vA=on*(1.-age);vK=smoothstep(.2,1.,age);vR=r.x*6.;put(p,.3+.15*r.z);}`,S.ENERGY_FS(C.flame,{gain:1.2}),{mode:'energy',uniforms:uni});
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TR+aSeed.x*.2;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(TX-0.6)}+(aSeed.z-.5)*1.2,1.1+t*.9,(aSeed.w-.5)*.6);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28;put(p,(.55+.25*aSeed.w)*(.8+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:lin('#5a3a2a'),bias:.1}));
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.6,.6,0.))*(2.+2.*aSeed.z);vec3 p=vec3(${f(TC.x)},1.,0.)+v*t*(1.-.5*t)+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.18+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:BLOOD,bias:.05}));
  a.pose=function(te,o){
    const ia=te-TI;
    // acecho: el lanzador se agazapa; ojos ámbar
    const crouch=ss(0,TS,te)*(1-ss(TS,TS+0.1,te));
    caster.scale.set(1+0.12*crouch,1-0.2*crouch,1+0.12*crouch); caster.rotation.z=-0.15*crouch;
    towardCam(eyes.position,tmp.set(CX+0.1,1.25-0.25*crouch,0),0.6); billboard(eyes);
    eyes.visible=te<TS+0.15; eyes.material.uniforms.uA.value=ss(0.02,0.12,te)*(1-ss(TS,TS+0.12,te));
    // jaguar: arco alto, picado y zarpazos delante del rival
    let pose=0, rz=0;
    if(te<TP){const u=ss(TS,TP,te);JP.set(CX+0.2+(1.6-CX-0.2)*u,1.2+2.3*Math.sin(u*Math.PI*0.85),0.2);rz=0.35-0.5*u;}
    else if(te<TZ){const u=ss(TP,TZ,te);JP.set(1.6+(2.25-1.6)*u,3.2-2.0*e3(u),0.2);rz=-0.15-0.45*u;}
    else{const k=cl((te-TZ)/0.1);JP.set(2.25,1.2+0.1*Math.sin(te*30),0.2);rz=-0.6+0.6*k;pose=1;}
    const appear=ss(TS-0.05,TS+0.12,te), on=te>TS-0.05&&te<TR+0.4;
    for(const m of [jagA,jagB]){m.position.copy(JP);m.rotation.set(0,0,rz);m.scale.setScalar(Math.max(appear*1.15/JS,0.001));}
    jagA.visible=on&&pose<0.5; jagB.visible=on&&pose>=0.5;
    jagM.uniforms.uQ.value=-0.1+1.2*ss(TR,TR+0.4,te); jagM.uniforms.uK.value=0.25+0.7*hitE(ia,10)+0.3*ss(TS,TS+0.15,te)*(1-ss(TS+0.2,TP,te));
    shade.pose(JP.x,0,1.3*appear,te>TS&&te<TR?0.45*(1-cl((JP.y-1)/3)):0);
    claws.forEach((m,i)=>{const d=te-HITS[i];towardCam(m.position,tmp.set(TX-0.2,1.1+0.1*i,0),0.5);billboard(m,[-0.6,0.5,-0.9][i]);
      m.visible=d>=0&&d<0.5;m.scale.setScalar((i===2?1.5:1.15)*(0.6+0.4*e3(cl(d/0.07))));
      m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*ss(0.15,0.5,d);});
    sparks.forEach((sp,i)=>sp.pose(te-HITS[i],tmp2.set(TC.x,TC.y+0.1*i,0),i===2?1.1:0.8));
    ring.pose(ia,TX,0,0.45,1);
    bleed.pose(te);
    let h=0; HITS.forEach((t,i)=>{h=Math.max(h,hitE(te-t,10)*(i===2?1:0.6));});
    target.position.x=TX+0.18*h; target.rotation.z=-0.12*h*Math.cos((te-TZ)*40); target.scale.set(1+0.05*h,1-0.08*h,1+0.05*h);
    o.em=0.5*h; o.emc.copy(U.uC1.value);
    if(te<TZ){o.g.copy(JP);o.gs=1.1*appear;o.ga=0.25;o.li=2.2;}
    else{o.g.copy(TC);o.gs=1.3+3*Math.max(ia,0);o.ga=0.5*h;o.li=7*h;}
    o.ia=ia;o.c.copy(TC);o.shake=te>=TZ?0.6:0;o.dist=0.6;o.flash=0.6;
  };
}});

// =====================================================================
// 4 · RICE — granos de arroz dorado brotan de la espalda y llueven sobre el rival; en ti se compactan de golpe en una
//     bola de arroz con alga que golpea; la bola brilla, vuela de vuelta al lanzador (roba vida) y lo cura; una
//     moneda de luz da +1 PA. Cuerpo a cuerpo. ti 0,684 s
// =====================================================================
defs.push({key:"sty_rice",name:"Rice (estilizado)",dur:2.304,ti:0.684,pal:P_RICE,tier:2,stylized:true,...MELEE,
  phases:[["Siembra",0],["Lluvia",0.252],["Cosecha",0.684],["Fruto",0.936],["Retorno",1.296],["Sustento",1.656]],
build(a){
  const L=a.L,TL=0.252,TI=0.684,TF=0.936,TB=1.296,TS=1.656,TE=2.304;
  const GRAIN=S.PV+`void main(){vec2 q=styPC()-.5;float d=length(q*vec2(2.6,1.05));if(d>.5)discard;
   vec3 n=normalize(vec3(q.x*2.6,q.y*1.05,.6));float l=styLight(n,stySunV());
   float er=styErode(styNoise(q+vMix).r*.6+.4*(1.-d*2.),vK*1.05-.05,.08);if(er*vA<.02)discard;
   vec3 c=styRampOf(mix(${RICEW},${GOLD},vMix*.45),clamp(.3+.55*l,0.,1.))*styTint(l);gl_FragColor=vec4(c,er*vA);}`;
  // granos: suben de la espalda y caen en lluvia sobre el rival
  a.count+=S.pts(L.part,36,VV+`void main(){float s=aSeed.x*.2;float t=uT-s;float u=clamp(t/.42,0.,1.);
   vec3 p0=vec3(-3.9+(aSeed.y-.5)*.4,1.3,(aSeed.z-.5)*.3);vec3 p1=vec3(${f(TX)}+(aSeed.y-.5)*1.3,2.9+aSeed.w*.6,(aSeed.z-.5)*.9);
   vec3 tgt=vec3(${f(TC.x)}+(aSeed.y-.5)*.5,1.05+(aSeed.w-.5)*.5,(aSeed.z-.5)*.35);
   vec3 p=t<.42?mix(p0,p1,u)+vec3(0.,1.6*u*(1.-u),0.):mix(p1,tgt,clamp((uT-.42-s)/max(${f(TI)}-.42-s,.05),0.,1.));
   vA=(t>0.&&uT<${f(TI+0.02)})?1.:0.;vK=0.;vR=aSeed.w*6.28+uT*7.;put(p,.32);}`,GRAIN);
  // granos sueltos del golpe
  a.count+=S.pts(L.part,24,VV+`void main(){float s=${f(TI)}+aSeed.x*.03;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(0.,.8,0.))*(1.8+1.8*aSeed.z);vec3 p=vec3(${f(TC.x)},1.05,0.)+v*t*(1.-.5*t)+vec3(0.,-3.4*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.28);}`,GRAIN);
  // bola de arroz: blanca con granos en relieve y banda de alga
  const riceM=S.mat(SOLID(`vec3 q=normalize(vP);float g=styNoise(vUv*vec2(14.,8.)).g;float gr=smoothstep(.35,.75,g);float band=step(q.y,.05)*step(abs(q.x),.38)*step(0.,q.z);
    base=mix(mix(${lin('#f6ead0')},${lin('#c9b48a')},gr*.55),${NORI},band);lb=-.18*gr*(1.-band)-.08;`,{hot:'vec3(1.,.8,.35)',rim:.18,nzs:'vec2(3.,2.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.6,24,16),riceM); L.mesh.add(ball);
  const spark=S.hitSpark(L.mesh,0.8,{seed:0.6}), ring=S.groundRing(L.decal,2.6), ringC=S.groundRing(L.decal,2.4);
  const coin=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.05,24).rotateX(Math.PI/2),S.mat(SOLID(`base=${GOLD};`,{hot:'vec3(1.,.8,.35)',rim:.5}),{uQ:{value:-1},uK:{value:0.3}},{mode:'solid'}));
  L.mesh.add(coin);
  // cura: motas verde-doradas que suben en el lanzador
  a.count+=S.pts(L.part,20,VV+`void main(){float s=${f(TS)}+aSeed.x*.35;float life=.55+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*2.;vec3 p=vec3(-3.7+cos(an)*.5,.15+t*1.8,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.24+.1*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy',uniforms:{}});
  const trail=new THREE.Vector3(); const uni={uB:{value:trail}};
  a.count+=S.pts(L.part,22,VV+`uniform vec3 uB;void main(){float life=.25;float k=(uT-${f(TB)})/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float on=step(${f(TB)},uT)*step(uT,${f(TS)});vec3 p=uB+(r-.5)*.4+vec3(.4*age,-.1*age,0.);
   vA=on*(1.-age);vK=0.;vR=0.;put(p,.2+.1*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.4}),{mode:'energy',uniforms:uni});
  const qb=(A,B,Cc,t,o)=>{const u=1-t;return o.set(u*u*A.x+2*u*t*B.x+t*t*Cc.x,u*u*A.y+2*u*t*B.y+t*t*Cc.y,u*u*A.z+2*u*t*B.z+t*t*Cc.z);};
  const P0=V3(2.85,1.2,0.5), PM=V3(-0.2,3.1,0.2), P1=V3(-3.6,1.25,0.1);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.12*ss(0,TL,te)*(1-ss(TL,TI,te));
    // la bola se forma en ti, brilla, vuela al lanzador y se absorbe
    let sc=0;
    if(te>=TI&&te<TB){sc=e3(cl(ia/0.08))*(1+0.08*Math.sin(te*20)*ss(TI,TF,te));ball.position.copy(P0);}
    else if(te>=TB&&te<TS){const u=ss(TB,TS,te);qb(P0,PM,P1,u,ball.position);sc=1-0.5*u;}
    else if(te>=TS){sc=0.5*(1-ss(TS,TS+0.15,te));ball.position.copy(P1);}
    ball.scale.set(sc*1.05,sc*0.92,sc*0.75); ball.rotation.y=te*2; ball.visible=sc>0.01;
    trail.copy(ball.position);
    riceM.uniforms.uK.value=0.08*hitE(ia,10)+0.06*ss(TF-0.1,TF+0.1,te)*(1-ss(TB+0.1,TS,te));
    spark.pose(ia,TC,1.0); ring.pose(ia,TX,0,0.42,1); ringC.pose(te-TS,CX,0,0.6,1);
    // moneda de PA: sale del lanzador en el sustento
    const cu=te-TS-0.1; coin.visible=cu>0&&cu<0.55; coin.position.set(CX,1.5+0.9*e3(cl(cu/0.3)),0.15);
    coin.rotation.y=te*8; coin.scale.setScalar(Math.max(cu<0.4?1:1-cl((cu-0.4)/0.15),0.001));
    const h=hitE(ia,9);
    target.position.x=TX+0.14*h; target.scale.set(1+0.06*h,1-0.12*h,1+0.06*h);
    const heal=ss(TS-0.05,TS+0.1,te)*(1-ss(TS+0.4,TE,te));
    o.em=0.45*h; o.emc.copy(U.uC1.value);
    if(te<TB){o.g.copy(ia<0?tmp.set(TX,2.6,0):TC);o.gs=ia<0?1.2:1.4+3*ia;o.ga=ia<0?0.12:0.2*h+0.05;o.li=ia<0?1.2:3*h+0.6;}
    else{o.g.copy(ball.position);o.gs=1;o.ga=0.4*(1-heal)+0.3*heal;o.li=3;}
    o.ia=ia;o.c.copy(TC);o.shake=0.4;o.dist=0.5;o.flash=0.3;
  };
}});

// =====================================================================
// 5 · RISKY BEAST — la bestia se juega la vida: tres latidos rojos la sobrecalientan, le brota una cresta de púas de
//     fuego en la espalda y sale como cometa carmesí con cono de choque y surco quemado; al impactar (ti) roca y onda,
//     y el lanzador queda Débil (chevrones violeta) y retrocede. Cuerpo a cuerpo. ti 1,092 s
// =====================================================================
defs.push({key:"sty_risky",name:"Risky Beast (estilizado)",dur:2.184,ti:1.092,pal:P_RISK,tier:2,stylized:true,...MELEE,
  phases:[["Latidos",0],["Sobrecarga",0.585],["Embestida",0.741],["Impacto",1.092],["Retroceso",1.248]],
build(a){
  const L=a.L,TO=0.585,TD=0.741,TI=1.092,TR=1.248,TE=2.184;
  const BEATS=[0.08,0.28,0.48];
  const beats=BEATS.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),S.mat(RINGV,{uEr:{value:0},uR:{value:0}},{mode:'energy',depthTest:false}));L.trail.add(m);return m;});
  // cresta de púas de fuego en la espalda (sólido carmesí con punta incandescente)
  const spikeM=S.mat(SOLID(`float h=vUv.y;base=mix(${CRIMSON},${lin('#ffb347')},smoothstep(.55,1.,h));lb=.05*h;`,{hot:'vec3(1.,.45,.15)',rim:.3}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const spikeG=new THREE.ConeGeometry(0.11,0.55,6).translate(0,0.275,0);
  const crest=new THREE.Group(); L.mesh.add(crest);
  const spikes=[0,1,2,3,4].map(i=>{const m=new THREE.Mesh(spikeG,spikeM);m.position.set(-0.34+i*0.17,0,0);m.rotation.z=0.5-i*0.22;crest.add(m);return m;});
  // cono de choque delante del cometa
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.7,1.3,24,1,true).rotateZ(-Math.PI/2),S.mat(`void main(){float a=smoothstep(0.,.35,vUv.y)*(1.-smoothstep(.7,1.,vUv.y));
   float n=styNoise(vec2(vUv.x*3.,vUv.y*.8-uT*3.)).r;float m=a*smoothstep(.35,.7,n);if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.55+.4*n)*1.2,m*uA);}`,{},{mode:'energy',depthTest:false})); L.mesh.add(cone);
  const FL=TX-0.3-(CX+0.3);const furrow=new THREE.Mesh(new THREE.PlaneGeometry(FL,0.9,48,1).translate(FL/2,0,0).rotateX(-Math.PI/2),S.mat(`void main(){
   float n=styNoise(vUv*vec2(4.,1.)+.2).r;float edge=1.-abs(vUv.y-.5)*2.;float m=smoothstep(.1,.5,edge+(n-.5)*.4)*step(vUv.x,uP);if(m<.02)discard;
   float er=styErode(n,uA<1.?1.-uA:0.,.1);vec3 c=mix(${SOOT},${EMBER}*1.3,smoothstep(.7,1.,edge)*smoothstep(uP-.35,uP,vUv.x));gl_FragColor=vec4(c,m*er);}`,{},{mode:'matter'}));
  furrow.position.set(CX+0.3,0.025,0); L.decal.add(furrow);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.41}), ring=S.groundRing(L.decal,3.6), ring2=S.groundRing(L.decal,2.6);
  const cracks=groundPlane(3.2,TX,0.028,S.mat(CRACKS,{uK:{value:0}},{mode:'matter'})); L.decal.add(cracks);
  const weak=S.status(a,'weak',[caster],TR,TE-0.05);
  const K=`const float TD=${f(TD)};const float TI=${f(TI)};const float TO=${f(TO)};`;
  const CP=new THREE.Vector3(); const uni={uC:{value:CP}};
  // aura de sobrecarga: llamas carmesí que suben del lanzador
  a.count+=S.pts(L.part,30,VV+K+`uniform vec3 uC;void main(){float life=.3+aSeed.y*.15;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float on=step(uT,TI);float an=r.x*6.2832;vec3 p=uC+vec3(cos(an)*.45,.1+age*(1.2+.5*r.z),sin(an)*.35)+vec3(-.6*age*step(TD,uT),0.,0.);
   vA=on*smoothstep(0.,.15,age)*(.35+.65*smoothstep(0.,TO,uT));vK=smoothstep(.3,1.,age);vR=(r.y-.5)*.5;put(p,(.36+.2*r.z)*(1.-.4*age));}`,S.ENERGY_FS(C.flame,{gain:1.25}),{mode:'energy',uniforms:uni});
  // rocas y polvo del impacto
  a.count+=S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.4,1.,0.))*(2.4+2.6*aSeed.z);vec3 p=vec3(${f(TX-0.2)},.2,0.)+v*t*(1.-.4*t)+vec3(0.,-4.*t*t,0.);p.y=max(p.y,.06);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*6.;put(p,.26+.18*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:lin('#3e2a22'),bias:-.05}));
  // púas de fuego carmesí que salen del golpe (energía saturada)
  a.count+=S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.32+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(aSeed.z-.5)*2.6+1.5708;vec3 dir=vec3(cos(an)*.9,sin(an),(aSeed.w-.5)*.8);vec3 p=vec3(${f(TX-0.25)},.9,0.)+dir*t*(3.+2.*aSeed.w);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.25,1.,age);vR=-an+1.5708;put(p,(.85+.4*aSeed.w)*(1.-.4*age));}`,S.ENERGY_FS(C.flame,{gain:1.15}),{mode:'energy'});
  a.count+=S.pts(L.part,18,VV+K+`void main(){float s=TI+aSeed.x*.08;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX-0.3)}+cos(an)*(.4+1.6*t),.18+.4*t,sin(an)*(.3+1.1*t));
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.6+.3*aSeed.w)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH,bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR;
    // latidos: el lanzador se hincha y un anillo rojo sale de él
    let b=0; BEATS.forEach((t,i)=>{const d=te-t;b=Math.max(b,d>=0?Math.exp(-d*12):0);
      const m=beats[i];towardCam(m.position,tmp.set(CX,1.0,0),0.5);billboard(m);m.visible=d>=0&&d<0.4;
      m.scale.setScalar(0.4+(0.9+0.25*i)*e3(cl(d/0.35)));m.material.uniforms.uA.value=1;m.material.uniforms.uEr.value=-0.1+1.1*ss(0.1,0.4,d);});
    // embestida: el lanzador avanza (el puente lo limita a media casilla) y vuelve en el retroceso
    const dash=ss(TD,TI,te), back=ss(TR,TR+0.4,te);
    caster.position.x=CX+0.9*dash*dash-1.0*back*(1-ss(TR+0.4,TE,te))-0.0;
    caster.scale.set(1+0.08*b,1+0.06*b-0.1*ss(TO,TD,te)*(1-dash),1+0.08*b);
    caster.rotation.z=(te<TD?0.08*ss(0,TO,te):0)-0.4*dash*(1-ss(TI,TI+0.1,te))+0.25*hitE(ir,6);
    CP.copy(caster.position);
    // cresta
    const cr=ss(TO-0.1,TO+0.1,te)*(1-ss(TR+0.2,TR+0.6,te));
    crest.position.set(caster.position.x-0.05,caster.position.y+1.42,0); crest.rotation.z=caster.rotation.z;
    crest.scale.setScalar(Math.max(cr*(1+0.15*Math.sin(te*30)),0.001)); crest.visible=cr>0.01;
    spikeM.uniforms.uK.value=0.3+0.5*b+0.4*dash; spikeM.uniforms.uQ.value=-0.1+1.2*ss(TR,TR+0.6,te);
    // cometa: cono de choque desde la salida hasta el golpe, delante del lanzador
    const flying=te>=TD&&te<TI+0.05, cx=CX+(TX-0.7-CX)*e3(ss(TD,TI,te));
    cone.visible=flying; cone.position.set(cx+0.5,1.0,0); cone.scale.set(0.6+0.6*dash,1,1); cone.material.uniforms.uA.value=0.85;
    furrow.visible=te>=TD; furrow.material.uniforms.uP.value=cl((cx-CX)/FL); furrow.material.uniforms.uA.value=1-ss(TR+0.3,TE,te);
    spark.pose(ia,TC,1.25); ring.pose(ia,TX-0.2,0,0.5,1.2); ring2.pose(ia-0.1,TX-0.2,0,0.5,0.9);
    cracks.visible=ia>=0; cracks.scale.setScalar(0.6+0.4*e3(cl(ia/0.15))); set(cracks,ia>=0?-0.1+1.15*ss(0.5,1.05,ia):0,1); cracks.material.uniforms.uK.value=hitE(ia,3);
    weak.pose(te);
    const h=hitE(ia,7);
    target.position.x=TX+0.3*h; target.rotation.z=-0.2*h*Math.cos(ia*30); target.scale.set(1+0.1*h,1-0.18*h,1+0.1*h);
    o.em=0.7*h; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(caster.position.x,1.1,0);o.gs=0.8+0.8*cr+0.5*b;o.ga=0.2+0.3*b;o.li=1.5+3*b;}
    else{o.g.copy(TC);o.gs=1.6+3*ia;o.ga=Math.exp(-ia*8)*0.3;o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(TC);o.shake=ia>=0?1.2:0.25*b;o.dist=1;o.flash=0.4;
  };
}});

// =====================================================================
// 6 · RONIN — iaido: el lanzador se agacha con la mano en la vaina (destello de la hoja), parpadea hasta el rival y
//     lo cruza con un tajo de tinta negra con filo plateado (ti); un segundo trazo fino y el sello rojo de crítico;
//     al envainar suena un chasquido y la tinta gotea y se seca. Cuerpo a cuerpo. ti 0,378 s
// =====================================================================
defs.push({key:"sty_ronin",name:"Ronin (estilizado)",dur:2.07,ti:0.378,pal:P_RONIN,tier:2,stylized:true,...MELEE,
  phases:[["Iai",0],["Parpadeo",0.27],["Tajo",0.378],["Crítico",0.54],["Envainar",1.035],["Regreso",1.44]],
build(a){
  const L=a.L,TB=0.27,TI=0.378,TC2=0.54,TS=1.035,TR=1.44,TE=2.07;
  // trazo de tinta (materia) con filo plateado; uEr erosión, uW semilla, uL avance del trazo 0..1
  const INKS=`uniform float uEr;uniform float uW;uniform float uL;void main(){vec2 p=vUv;float x=p.x;
   float w=.22*pow(max(sin(3.1416*clamp(x,0.,1.)),0.),.7)*(.55+.45*x);float y=.5+.06*sin(x*4.+uW*6.);
   float n=styNoise(vec2(x*2.,p.y*.6)+uW).r;float d=abs(p.y-y);
   float m=smoothstep(w,w*.6,d+(n-.5)*.06)*step(x,uL);float dry=step(.62,fract(p.y*23.+n*3.))*smoothstep(.55,1.,x);m*=1.-dry*.8;
   if(m<.02)discard;float er=styErode(n*.6+m*.4,uEr,.1);
   float edge=smoothstep(w*.55,w*.85,d)*step(p.y,y);vec3 c=mix(${INK},${STEEL}*1.5,edge);gl_FragColor=vec4(c,m*er*uA);}`;
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.3),S.mat(INKS,{uEr:{value:0},uW:{value:0.2},uL:{value:0}},{mode:'matter',depthTest:false})); L.trail.add(slash);
  const slash2=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.7),S.mat(INKS,{uEr:{value:0},uW:{value:0.77},uL:{value:0}},{mode:'matter',depthTest:false})); L.trail.add(slash2);
  // destello de la hoja al desenvainar (energía, fino y largo)
  const glint=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.16),S.mat(`void main(){vec2 p=vUv-.5;float m=smoothstep(.5,0.,abs(p.y)*2.)*smoothstep(.5,.0,abs(p.x));
   gl_FragColor=vec4(${STEEL}*2.2,m*uA);}`,{},{mode:'energy',depthTest:false})); L.mesh.add(glint);
  // sello rojo de crítico (hanko): cuadrado con trazos
  const seal=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.75),S.mat(`uniform float uEr;void main(){vec2 p=vUv-.5;float b=max(abs(p.x),abs(p.y));
   float frame=step(b,.46)*step(.38,b);vec2 q=p*1.5;
   float s=step(abs(q.y-.18),.045)*step(abs(q.x),.3)+step(abs(q.x+.05),.045)*step(abs(q.y),.38)+step(abs(q.y+.2),.045)*step(abs(q.x-.05),.26)+step(abs(q.x-.2+q.y*.6),.04)*step(abs(q.y-.02),.2);
   float m=max(frame,clamp(s,0.,1.));float n=styNoise(vUv*1.2+.4).r;m*=step(.25,n+.4);if(m<.02)discard;
   float er=styErode(n,uEr,.08);gl_FragColor=vec4(${lin('#c8202a')},m*er*uA);}`,{uEr:{value:0}},{mode:'matter',depthTest:false})); L.mesh.add(seal);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.63}), clack=S.hitSpark(L.mesh,0.8,{seed:0.12}), ring=S.groundRing(L.decal,2.4);
  const inkPool=groundPlane(1.6,TX,0.026,S.mat(STAIN(INK,.55,.3),{},{mode:'matter'})); L.decal.add(inkPool);
  const K=`const float TI=${f(TI)};const float TS=${f(TS)};`;
  // gotas de tinta que caen del tajo
  a.count+=S.pts(L.part,22,VV+K+`void main(){float s=TI+.03+aSeed.x*.2;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(TX-1.2)}+aSeed.z*2.2,1.25+(aSeed.w-.5)*.3-2.6*t*t,.25);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.7,1.,age);vR=3.14159;put(p,.15+.08*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:INK,bias:.25}));
  // pétalos plateados que cruza el viento del tajo
  a.count+=S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.1;float life=.8+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(TX-0.6)}+t*(1.8+aSeed.z),1.3+(aSeed.w-.5)*.8+sin(t*6.+aSeed.x*9.)*.15-t*.4,(aSeed.y-.5)*.8);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=t*6.+aSeed.w*6.;put(p,.2);}`,S.MATTER_FS(C.leaf,{relief:4,col:lin('#f2c6d4'),bias:.1}));
  a.pose=function(te,o){
    const ia=te-TI;
    // iai: el lanzador se agacha; parpadeo: se estira hacia el rival y queda detrás de su tajo; regreso
    const crouch=ss(0,TB,te)*(1-ss(TB,TB+0.05,te));
    const blink=ss(TB,TB+0.05,te)*(1-ss(TR,TR+0.25,te));
    caster.position.x=CX+0.95*blink; caster.scale.set(1+0.1*crouch-0.05*blink*(1-ss(TB+0.05,TI,te)),1-0.16*crouch,1+0.1*crouch);
    caster.rotation.z=-0.2*crouch-0.3*blink*(1-ss(TI,TI+0.25,te));
    // destello al desenvainar
    towardCam(glint.position,tmp.set(CX+0.5,0.9,0),0.6); billboard(glint,0.25);
    glint.visible=te>TB-0.12&&te<TB+0.08; glint.material.uniforms.uA.value=Math.sin(cl((te-TB+0.12)/0.2)*Math.PI);
    glint.scale.set(0.5+1.4*cl((te-TB+0.12)/0.2),1,1);
    // tajos de tinta
    towardCam(slash.position,tmp.set(TX-0.15,1.2,0),0.6); billboard(slash,-0.22);
    slash.visible=te>=TI-0.04&&ia<1.2; slash.material.uniforms.uA.value=1; slash.material.uniforms.uL.value=cl((te-TI+0.04)/0.08);
    slash.material.uniforms.uEr.value=-0.1+1.15*ss(0.5,1.15,ia);
    const d2=te-TC2; towardCam(slash2.position,tmp.set(TX-0.1,1.05,0),0.65); billboard(slash2,0.5);
    slash2.visible=d2>=0&&d2<0.9; slash2.material.uniforms.uA.value=1; slash2.material.uniforms.uL.value=cl(d2/0.06);
    slash2.material.uniforms.uEr.value=-0.1+1.15*ss(0.35,0.9,d2);
    // sello de crítico
    towardCam(seal.position,tmp.set(TX+0.35,2.2,0),0.7); billboard(seal,0.12);
    seal.visible=d2>=0&&te<TS+0.3; seal.scale.setScalar(Math.max(1.6-0.6*e3(cl(d2/0.08)),0.001));
    seal.material.uniforms.uA.value=1; seal.material.uniforms.uEr.value=-0.1+1.15*ss(TS-0.1,TS+0.3,te);
    spark.pose(ia,TC,0.9); clack.pose(te-TS,tmp2.set(caster.position.x+0.25,0.85,0),0.8); ring.pose(ia,TX,0,0.4,0.9);
    inkPool.visible=ia>0.15; inkPool.scale.setScalar(0.4+0.6*ss(0.15,0.6,ia)); set(inkPool,-0.1+1.15*ss(1.0,1.65,ia),1);
    const h=hitE(ia,8), h2=hitE(d2,10);
    target.position.x=TX+0.12*h+0.08*h2; target.rotation.z=-0.1*(h+h2)*Math.cos(ia*45); target.scale.set(1,1-0.06*h,1);
    o.em=0.5*h+0.4*h2; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(CX+0.5,0.9,0);o.gs=0.6;o.ga=0.3*crouch;o.li=1.2;}
    else{o.g.copy(TC);o.gs=1.2+2*ia;o.ga=0.35*Math.max(h,h2);o.li=5*Math.max(h,h2);}
    o.ia=ia;o.c.copy(TC);o.shake=0.5;o.dist=0.5;o.flash=0.5;
  };
}});

// =====================================================================
// 7 · TIMBER — raíces corren por el suelo del lanzador al aliado; ocho placas de corteza brotan a su alrededor, suben
//     en espiral y se cierran en armadura (ti) con runas de brasa en las juntas; un hilo de brasa vuelve al lanzador
//     (la guarda: si golpean al aliado, el lanzador gana escudo); al final la corteza se desmorona en astillas y ceniza.
//     Carta de aliado: el receptor es el muñeco objetivo (receiver 'target'). ti 0,845 s
// =====================================================================
defs.push({key:"sty_timber",name:"Timber (estilizado)",dur:2.34,ti:0.845,pal:P_TIMB,tier:2,stylized:true,receiver:'target',zoneCaster:0.6,zoneTarget:1.2,
  phases:[["Raíces",0],["Ensamblaje",0.2275],["Sellado",0.845],["Armadura",1.04],["Ceniza",1.885]],
build(a){
  const L=a.L,TA=0.2275,TI=0.845,TM=1.04,TC3=1.885,TE=2.34,N=8,RAD=0.85;
  const RL=TX-CX-0.4;const roots=new THREE.Mesh(new THREE.PlaneGeometry(RL,0.7,64,1).translate(RL/2,0,0).rotateX(-Math.PI/2),S.mat(`void main(){
   float x=vUv.x;float n=styNoise(vec2(x*3.,vUv.y*.5)+.3).r;float y=.5+.18*sin(x*9.+n*3.);float d=abs(vUv.y-y);
   float br=smoothstep(.06,.02,abs(vUv.y-y-.18*smoothstep(.3,.6,fract(x*3.))*(fract(x*3.)-.3)));
   float m=max(smoothstep(.085,.035,d),br*.8)*step(x,uP);if(m<.02)discard;float er=styErode(n*.7+.3,1.-uA,.1);
   vec3 c=styRampOf(${BARK},.25+.4*n)+${EMBER}*smoothstep(uP-.12,uP,x)*.8;gl_FragColor=vec4(c,m*er);}`,{},{mode:'matter'}));
  roots.position.set(CX+0.4,0.024,0); L.decal.add(roots);
  // placa de corteza: caja curva con vetas, borde oscuro y junta de brasa (uK)
  const barkM=S.mat(SOLID(`float v=styNoise(vec2(vUv.x*4.,vUv.y*.7)+.2).b;float g=smoothstep(.35,.7,v);
    base=mix(${BARK},${BARK_D},g*.7);base=mix(base,${lin('#b07a46')},smoothstep(.8,.95,vUv.y)*.5);lb=-.08*g;`,
    {hot:'vec3(1.,.5,.15)',rim:.25,nzs:'vec2(2.,3.)'}),{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
  const plateG=new THREE.CylinderGeometry(RAD,RAD*0.92,0.95,8,1,true,-0.42,0.84);
  const plates=[]; for(let i=0;i<N;i++){const m=new THREE.Mesh(plateG,barkM);L.mesh.add(m);plates.push(m);}
  // runas de brasa en las juntas (energía, en el suelo y en vertical)
  const rune=groundPlane(2.2,TX,0.03,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float ring=smoothstep(.05,.0,abs(r-.78));float tick=step(.86,fract(an/6.2832*8.))*step(abs(r-.78),.12);
   float m=max(ring,tick);if(m<.02)discard;float er=styErode(styNoise(vUv*.8).r,uP,.12);gl_FragColor=vec4(styRamp(.7+.3*r)*1.3,m*er*uA);}`,{},{mode:'energy'}));
  L.decal.add(rune);
  const TL2=TX-CX;const thread=new THREE.Mesh(new THREE.PlaneGeometry(TL2,0.12,64,1).translate(TL2/2,0,0),S.mat(`void main(){float x=vUv.x;
   float m=smoothstep(.5,.1,abs(vUv.y-.5))*step(x,uP)*smoothstep(0.,.05,x);float pul=.6+.4*sin(x*30.-uT*18.);if(m<.02)discard;
   gl_FragColor=vec4(${EMBER}*1.6*pul,m*uA);}`,{},{mode:'energy',depthTest:false})); L.trail.add(thread);
  const flash=S.hitSpark(L.mesh,1.6,{seed:0.29}), ring=S.groundRing(L.decal,2.6), ringC=S.groundRing(L.decal,1.8);
  const K=`const float TA=${f(TA)};const float TI=${f(TI)};const float TC3=${f(TC3)};`;
  // astillas al brotar las placas
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=TA+aSeed.x*.25;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*.9,2.2+aSeed.w,sin(an)*.6);vec3 p=vec3(${f(TX)}+cos(an)*${f(RAD)},.05,sin(an)*${f(RAD*0.7)})+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.16+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BARK,bias:.1}));
  // ceniza y astillas al desmoronarse
  a.count+=S.pts(L.part,30,VV+K+`void main(){float s=TC3+aSeed.x*.25;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(TX)}+cos(an)*(${f(RAD)}+.3*t),.3+aSeed.w*1.1-1.4*t*t,sin(an)*(${f(RAD*0.7)}+.2*t));p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*5.;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:BARK_D,bias:.15}));
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TC3+aSeed.x*.3;float life=.7+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(${f(TX)}+(aSeed.z-.5)*1.2,.3+t*1.2,(aSeed.w-.5)*.8);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28;put(p,(.4+.2*aSeed.w)*(.8+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:lin('#8c847c'),bias:.1}));
  // brasas en las juntas mientras dura la armadura
  a.count+=S.pts(L.part,18,VV+K+`void main(){float life=.5;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float on=step(TI,uT)*step(uT,TC3);
   float an=r.x*6.2832;vec3 p=vec3(${f(TX)}+cos(an)*${f(RAD+0.05)},.2+r.y*1.5+age*.4,sin(an)*${f(RAD*0.75)});
   vA=on*(1.-age);vK=0.;vR=0.;put(p,.12+.06*r.z);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=-0.1*ss(0,TA,te)*(1-ss(TA,TI,te));
    // raíces: avanzan hasta el aliado y se secan al final
    const rl=e3(ss(0,TA+0.15,te)); roots.visible=te<TE-0.05; roots.material.uniforms.uP.value=rl; roots.material.uniforms.uA.value=1-ss(TM,TC3,te);
    // placas: brotan alrededor, suben en espiral y se cierran (ti); se desmoronan al final
    plates.forEach((m,i)=>{const s0=TA+i*0.035, u=e3(ss(s0,TI,te));const ang=i/N*Math.PI*2+(1-u)*1.6;
      const r=RAD+(1-u)*0.55, row=i%2;
      m.position.set(TX,0.48+row*0.92*u-(1-u)*0.3,0); m.rotation.set(0,ang,0);
      m.scale.set(r/RAD,Math.max(u,0.001),r/RAD);
      m.visible=te>s0&&te<TC3+0.35;});
    const crack=ss(TC3,TC3+0.35,te), seal=hitE(ia,8);
    barkM.uniforms.uQ.value=-0.1+1.2*crack; barkM.uniforms.uK.value=0.9*seal+0.15*ss(TI,TM,te)*(1-crack)*(0.6+0.4*Math.sin(te*12));
    flash.pose(ia,tmp.set(TX,1.2,0),1.0); ring.pose(ia,TX,0,0.45,1.1);
    rune.visible=te>TI-0.05&&te<TC3+0.3; set(rune,-0.1+1.1*ss(TC3-0.2,TC3+0.3,te),ss(TI-0.05,TI+0.1,te));
    // hilo de brasa del aliado al lanzador (la guarda)
    const tu=te-TM; thread.visible=tu>0&&te<TC3; thread.position.set(TX,1.0,0.05); thread.rotation.set(0,0,Math.PI);
    thread.material.uniforms.uP.value=e3(cl(tu/0.3)); thread.material.uniforms.uA.value=1-ss(TC3-0.35,TC3,te);
    ringC.pose(tu-0.3,CX,0,0.5,0.8);
    const h=hitE(ia,8);
    target.scale.set(1+0.04*h,1-0.05*h,1+0.04*h);
    o.em=0.35*h+0.15*ss(TI,TM,te)*(1-crack); o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(TX,0.5,0);o.gs=0.8;o.ga=0.15;o.li=1.5;}
    else{o.g.set(TX,1.1,0);o.gs=1.2+2*ia;o.ga=0.45*h;o.li=6*h+0.8;}
    o.ia=ia;o.c.set(TX,1.0,0);o.shake=0.3;o.dist=0.35;o.flash=0.4;
  };
}});

VFX.module("Estilizado · Bestia · Espalda",defs);
})();

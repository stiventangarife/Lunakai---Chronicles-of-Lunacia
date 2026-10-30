// =====================================================================
// ESTILIZADO · PÁJARO · BOCA (Hito 101) — las 5 cartas de boca de Pájaro rehechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_bbLittleOwl, sty_bbPeaceMaker…); el puente las usa con el estilo nuevo encendido.
// Mismos dur / ti / fases que mod-pajaro-boca.js, así que el daño llega igual. El concepto sigue la carta (PartCards.js):
//  · Little Owl (Early Bird): un solo objetivo. Graznido, eco de sonar, los ojos del búho «eligen» al rival y medias lunas
//    de ultrasonido lo golpean; estalla en plumas.
//  · Peace Maker: paloma de luz que deja caer un halo dorado sobre la cabeza del rival (Débil).
//  · Feather Dagger: dos dagas de pluma cristalina, dos golpes; se clavan y se deshacen en plumas (la carta ya no da carga).
//  · Hungry Bird: el lanzador da un saltito y un pájaro espíritu hambriento picotea cuatro veces al rival; la energía que
//    arranca vuelve al lanzador y lo cura (a cualquier distancia: el lanzador no viaja hasta el rival).
//  · Doubletalk: dos notas disonantes trenzadas sobre un pentagrama chocan en la cabeza del rival y lo duermen (Sueño).
// Los efectos nacen de la boca del lanzador (≈ −3,43, 1,55) sin malla anatómica. Cartas a distancia: zoneCaster/zoneTarget
// pequeños para que a 1 casilla no se encojan (Hito 99). Módulo autónomo (no necesita mod-pajaro-boca.js).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,camera,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas propias (nombres únicos: no pisan las de los módulos originales). Pájaro = rosa; cada carta con su acento.
VFX.palette("Sty Pájaro · Búho",["#ffb347","#43358f"]);
VFX.palette("Sty Pájaro · Paloma",["#ffd56b","#b0628f"]);
VFX.palette("Sty Pájaro · Daga",["#ff86c8","#8a2a8f"]);
VFX.palette("Sty Pájaro · Hambre",["#ffbf4a","#d2452b"]);
VFX.palette("Sty Pájaro · Doble",["#ff8fd8","#5b2c9e"]);

const EARTH="vec3(.6,.48,.34)";
const MO=V3(-3.43,1.55,0), TC=V3(3.15,1.2,0), THd=V3(3.25,1.62,0);   // boca del lanzador; pecho y cabeza del rival
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), XA=V3(1,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const back=k=>{k=cl(k);const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const VV=`varying float vR;varying float vK;`;
const ZONES={zoneCaster:0.5,zoneTarget:1.1};   // a 1 casilla el efecto conserva su tamaño
// ángulo en pantalla de una velocidad (para orientar billboards a lo largo del viaje)
const scrAng=(p,v)=>{tmp.copy(p).project(camera);tmp2.copy(p).addScaledVector(v,0.05).project(camera);
  return Math.atan2(tmp2.y-tmp.y,(tmp2.x-tmp.x)*(camera.aspect||1));};
const emit=(d,k,col)=>{const m=d.userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const SDSEG=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
// relieve de una silueta SDF (necesita float sdf(vec2)): altura abombada hacia el centro → normal en pantalla
const SDFLIT=`float sdfH(vec2 p){return sqrt(clamp(-sdf(p)/.1,0.,1.));}
vec3 sdfN(vec2 p){float e=.014;float hx=sdfH(p+vec2(e,0.))-sdfH(p-vec2(e,0.));float hy=sdfH(p+vec2(0.,e))-sdfH(p-vec2(0.,e));
 return normalize(vec3(-hx*.8,-hy*.8,1.));}`;

// ---------- piezas del módulo ----------
// pluma suelta (materia): vexilo curvo con barbas, raquis claro, luz en 3 bandas; col = expresión GLSL (puede usar vMix)
const FEATHER_PFS=col=>S.PV+`
void main(){vec2 uv=styPC()-.5;float x=uv.x+.5;vec2 q=vec2(x,uv.y*1.7-.18*(x-.5)*(x-.5));
 float w=.24*smoothstep(.0,.22,x)*sqrt(max(0.,1.-pow(max(x-.42,0.)/.56,2.)));
 float d=abs(q.y)-w;float m=smoothstep(.02,-.02,d)*step(.02,x)*step(x,.98);if(m<.01)discard;
 float er=styErode(styNoise(uv*.7+vMix*3.).r*.65+.35*(1.-abs(q.y)/max(w,.01)),vK*1.05-.08,.1);
 float a=m*er*vA;if(a<.01)discard;
 vec3 n=normalize(vec3(0.,-q.y*2.6,1.));float l=styLight(n,stySunV());
 float barb=.86+.14*sin((x*1.4-abs(q.y)*2.2)*55.+vMix*9.);float shaft=smoothstep(.022,0.,abs(q.y))*step(.08,x);
 vec3 col=${col};
 vec3 c=styRampOf(col,clamp(.22+.55*l+.1*barb,0.,1.))*styTint(l)*barb;c=mix(c,styRampOf(col,.95),shaft*.7);
 gl_FragColor=vec4(c,a);}`;
// chispa estrellada de energía (picos, ecos, motas mágicas)
const MOTE_FS=S.ENERGY_FS(C.spark,{gain:1.35});
// anillo de pincel en billboard (ecos alrededor de la cabeza); uP = erosión
const RINGB_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.6+.4*s.g)*1.2,s.r*er*uA);}`;
const ringBill=(parent,size)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),S.mat(RINGB_FS,{},{mode:'energy',depthTest:false}));parent.add(m);return m;};
// estela fina de energía a lo largo de +x (uv.x = 1 en la cabeza)
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float w=.25+.75*u;float m=smoothstep(w,w*.4,v)*u*u;
 float n=styNoise(vec2(u*.7-uT*2.,vUv.y*.5)).b;float er=styErode(n*.5+.5*u,.2,.15);
 if(m*er<.01)discard;gl_FragColor=vec4(styRamp(.55+.45*u)*1.3,m*er*uA);}`;
const streakMesh=(parent,w,mat)=>{const g=new THREE.PlaneGeometry(1,w).translate(-0.5,0,0);const grp=new THREE.Group();
  const a=new THREE.Mesh(g,mat),b=new THREE.Mesh(g,mat);b.rotation.x=Math.PI/2;grp.add(a,b);parent.add(grp);return grp;};
const poseStreak=(s,p0,p1,vis)=>{tmp3.copy(p1).sub(p0);const ln=tmp3.length();s.visible=vis&&ln>0.01;if(!s.visible)return;
  s.position.copy(p1);s.quaternion.setFromUnitVectors(XA,tmp3.normalize());s.scale.set(ln,1,1);};
// mancha suave en el suelo (bruma, sello); col = GLSL; uP = erosión
const POOL_FS=(col,al=.55)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5+uT*.02).g*.4;float m=smoothstep(.85,.7,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);gl_FragColor=vec4(styRampOf(${col},.35+.35*n),m*er*uA*${f(al)});}`;
const defs=[];

// =====================================================================
// 1 · LITTLE OWL (Early Bird) — graznido de humo nocturno; un eco de sonar barre el suelo; la cara del búho abre sus
//     ojos ámbar sobre el rival («lo elige»); cuatro medias lunas de ultrasonido lo golpean y estalla en plumas.
// =====================================================================
// cara de búho: disco facial índigo con ojos ámbar que brillan, pupilas, mechones y pico; uQ = apertura de los ojos
const OWL_FS=SDSEG+`uniform float uQ;uniform float uEr;
float sdf(vec2 p){float d=length((p-vec2(0.,-.04))*vec2(1.,1.25))-.4;
 d=min(d,length(p-vec2(-.19,.04))-.2);d=min(d,length(p-vec2(.19,.04))-.2);
 d=min(d,sdSeg(p,vec2(-.2,.18),vec2(-.4,.42))-.06);d=min(d,sdSeg(p,vec2(.2,.18),vec2(.4,.42))-.06);return d;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*vec2(1.5,1.1);float d=sdf(p);float m=smoothstep(.015,-.015,d);if(m<.01)discard;
 float n=styNoise(p*.8+.3).r;float er=styErode(n*.6+.4*clamp(-d*4.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());
 vec3 body=styRampOf(uC2,clamp(.25+.55*l,0.,1.))*styTint(l);
 // disco facial más claro alrededor de los ojos, plumas en V
 float disc=max(smoothstep(.22,.17,length(p-vec2(-.19,.04))),smoothstep(.22,.17,length(p-vec2(.19,.04))));
 vec3 c=mix(body,styRampOf(mix(uC2,vec3(.78,.72,.95),.55),.35+.45*l)*styTint(l),disc*.85);
 float vf=sin((p.y*1.5+abs(p.x)*1.8)*30.);c*=.93+.07*vf*(1.-disc);
 // ojos: iris ámbar (brilla para el bloom), pupila, brillo duro; se cierran con uQ
 for(int i=0;i<2;i++){vec2 e=p-vec2(i==0?-.19:.19,.05);float lid=step(abs(e.y),.13*uQ+.004);
  float ir=smoothstep(.135,.12,length(e))*lid;float pu=smoothstep(.06,.05,length(e-vec2(0.,-.01)))*lid;
  float hl=smoothstep(.028,.018,length(e-vec2(-.035,.045)))*lid;
  c=mix(c,styRamp(.75+.25*(1.-length(e)/.13))*1.7,ir);c=mix(c,vec3(.03,.02,.06),pu);c=mix(c,vec3(1.4),hl);
  c=mix(c,styRampOf(uC2,.2),smoothstep(.15,.135,length(e))*(1.-lid)*.8);}
 // pico
 vec2 b=p-vec2(0.,-.12);float bk=step(abs(b.x)*1.6-b.y*.9,.06)*step(b.y,.05)*step(-.16,b.y);
 c=mix(c,styRampOf(vec3(.95,.55,.2),.4+.5*l)*styTint(l),bk);
 gl_FragColor=vec4(c,a);}`;
// media luna de ultrasonido (materia índigo con filo ámbar que brilla); abombada hacia +x; uEr erosión
const CRES_FS=`uniform float uEr;
float sdf(vec2 p){return max(length(p)-.92,-(length(p-vec2(-.42,0.))-.88));}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*2.;float d=sdf(p);float tip=smoothstep(.95,.55,abs(p.y));float m=smoothstep(.02,-.02,d)*tip;if(m<.01)discard;
 float n=styNoise(vUv*.7+uP).r;float er=styErode(n*.55+.45*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());vec3 c=styRampOf(uC2,clamp(.3+.5*l,0.,1.))*styTint(l);
 float edge=smoothstep(.8,.92,length(p));c=mix(c,styRamp(.8+.2*edge)*1.7,edge*.9);
 gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_bbLittleOwl",name:"Little Owl (estilizado)",dur:2.0,ti:0.84,tier:2,pal:"Sty Pájaro · Búho",stylized:true,...ZONES,
  phases:[["Graznido",0],["Eco",0.16],["Elección",0.56],["Ultrasonido",0.64],["Impacto",0.84],["Disipación",1.3]],
build(a){
  const L=a.L,TI=0.84,TS=1.3,TE=1.85,TP=0.16,NW=4,FL=0.24;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.1),S.mat(OWL_FS,{uQ:{value:0},uEr:{value:0}},{mode:'matter'}));
  L.mesh.add(face);
  const S0=V3(MO.x+0.35,MO.y,0), HP=V3(THd.x-0.3,THd.y-0.12,0);
  const waves=[];for(let i=0;i<NW;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(CRES_FS,{uEr:{value:0}},{mode:'matter',depthTest:false}));
    m.material.uniforms.uP.value=i*0.37;L.mesh.add(m);waves.push({m,t0:0.6+0.04*i});}
  const sonar=groundPlane(2,-3.7,0.028,S.mat(S.FS.RING,{},{mode:'energy'})); L.decal.add(sonar);
  const ping=S.groundRing(L.decal,2.2), ring=S.groundRing(L.decal,3.0);
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.21,toCam:0.6}), echoA=ringBill(L.mesh,2.2), echoB=ringBill(L.mesh,2.2);
  const shadow=S.contactShadow(L.decal,1.6);
  const K=`const float TI=${f(TI)};const float TS=${f(TS)};const vec3 MO=${v3(MO)};const vec3 TC=${v3(TC)};`;
  // graznido: humo nocturno índigo que brota de la boca
  S.pts(L.part,12,VV+K+`void main(){float s=aSeed.x*.14;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(1.1,.35,0.));vec3 p=MO+vec3(.12,0.,0.)+d*(.25+.6*(1.-exp(-t*5.)))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.25,1.,age);vR=aSeed.z*6.28+t;put(p,(.26+.12*aSeed.w)*(.6+.6*age));}`,
   S.MATTER_FS(C.puff,{relief:4,bias:-.05,col:'vec3(.2,.17,.42)'}));
  // motas ámbar que corren por el haz de ultrasonido
  S.pts(L.part,40,VV+K+`void main(){float life=.2+aSeed.y*.08;float k=(uT-.6)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 ax=TC+vec3(0.,.35,0.)-MO;vec3 p=MO+ax*age+vec3(0.,(r.y-.5)*.5,(r.z-.5)*.5)*age;
   vR=r.x*6.28;vK=0.;vA=(k>=1.&&uT<TI+.12)?sin(age*3.14159):0.;put(p,.1+.06*r.z);}`,MOTE_FS,{mode:'energy'});
  // estallido de plumas índigo y lavanda que caen meciéndose
  S.pts(L.part,30,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=1.+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.5,.55,0.));vec3 p=TC+vec3(.05,.3,0.)+d*(1.1+.6*aSeed.z)*(1.-exp(-t*4.))+vec3(sin(t*4.+aSeed.w*9.)*.18,-.55*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+sin(t*3.+aSeed.x*9.)*.6;put(p,.3+.1*aSeed.w);}`,
   FEATHER_PFS(`mix(uC2,vec3(.72,.64,.92),step(.55,vMix))`));
  // polvo al pie del rival
  S.pts(L.part,10,VV+K+`void main(){float s=TI+aSeed.x*.06;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,.08,0.)+vec3(cos(an),0.,sin(an))*(.35+.6*(1.-exp(-t*4.)))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=an;put(p,(.24+.1*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  const wp=V3(0,0,0), wv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, hoot=ss(0,0.08,te)*(1-ss(0.18,0.32,te)), fade=1-ss(TS,TE,te);
    caster.scale.set(1+0.06*hoot,1+0.05*hoot,1+0.06*hoot); caster.rotation.z=-0.1*hoot;
    // sonar: anillo de pincel que barre el suelo desde el lanzador
    const sk=cl((te-TP)/0.5); sonar.visible=te>=TP&&sk<1; sonar.scale.setScalar(0.6+5.4*sk); set(sonar,0.05+0.9*sk*sk,1);
    ping.pose(te-0.46,3.4,0,0.5,0.9);
    // cara del búho sobre el rival: aparece, abre los ojos, parpadea al golpe y se desvanece
    const fin=ss(0.5,0.62,te);
    towardCam(face.position,tmp.set(3.4,2.62,-0.25),0.25); billboard(face,0.04*Math.sin(te*4));
    face.visible=te>=0.5&&te<TE; face.scale.setScalar(Math.max(1.35*back(cl((te-0.5)/0.16))*(1+0.08*hitE(ia,8)),0.001));
    const blink=te>ia+TI&&ia>=0&&ia<0.12?0.15:1;
    face.material.uniforms.uQ.value=ss(0.56,0.66,te)*blink; face.material.uniforms.uA.value=fin;
    face.material.uniforms.uEr.value=-0.1+1.1*ss(TS,TE,te);
    // medias lunas de ultrasonido
    for(const w of waves){const k=(te-w.t0)/FL, arr=te-(w.t0+FL);
      w.m.visible=k>=0&&arr<0.12;if(!w.m.visible)continue;
      const kk=Math.pow(cl(k),1.1);wp.lerpVectors(S0,HP,kk);wp.y+=0.15*Math.sin(Math.PI*kk);wv.copy(HP).sub(S0);
      towardCam(w.m.position,wp,0.1); billboard(w.m,scrAng(wp,wv));
      w.m.scale.setScalar(0.6+1.1*kk); w.m.material.uniforms.uA.value=ss(0,0.15,k);
      w.m.material.uniforms.uEr.value=arr>=0?-0.1+1.1*cl(arr/0.12):-0.1;}
    spark.pose(ia,tmp2.copy(THd).add(tmp.set(-0.1,-0.1,0)),1.1);
    ring.pose(ia,3.4,0,0.5,1);
    for(const [r,d] of [[echoA,0],[echoB,0.1]]){const p=cl((ia-d)/0.4);towardCam(r.position,THd,0.3);billboard(r);
      r.visible=ia>=d&&p<1;r.scale.setScalar(0.4+1.2*p);set(r,-0.1+1.1*p,1);}
    shadow.pose(3.4,-0.1,1.1,0.5*fin*fade);
    // el rival vibra con el ultrasonido
    const vib=te>=TI?(0.05*Math.exp(-ia*3)+0.02*fade):0;
    target.position.x=3.4+vib*Math.sin(te*90)+0.18*hitE(ia,5); target.rotation.z=-vib*1.5*Math.sin(te*70);
    emit(target,(ia>=0?0.8*Math.exp(-ia*5):0)+0.15*ss(0.56,0.66,te)*fade);
    if(te<0.6){o.g.copy(MO);o.gs=0.5+0.6*hoot;o.ga=0.08;o.li=0.8;}
    else if(te<TI){const k=cl((te-0.6)/FL);o.g.lerpVectors(S0,HP,k);o.gs=0.9;o.ga=0.12;o.li=1.6;}
    else{o.g.copy(THd);o.gs=1+1.4*Math.min(ia,0.5);o.ga=0.16*Math.exp(-ia*9);o.li=1+3*Math.exp(-ia*6);}
    o.ia=ia;o.c.copy(THd);o.shake=0.35;o.dist=0.5;o.flash=0.4;
  };
}});

// =====================================================================
// 2 · PEACE MAKER — una paloma de luz (crema y malva, con luz en bandas) nace de la boca, sobrevuela al rival y deja
//     caer un halo dorado que se posa sobre su cabeza y lo aprieta: chevrones violetas de Débil; la paloma se marcha
//     y se deshace en plumas.
// =====================================================================
const DOVE_SDF=SDSEG+`uniform float uQ;
float wingD(vec2 p,vec2 sh,float a,float L,float W){p-=sh;float c=cos(a),s=sin(a);vec2 w=vec2(c*p.x+s*p.y,-s*p.x+c*p.y);
 float x=clamp(w.x/L,0.,1.);float lead=W*.3*(1.-x*x)+.012;float trail=W*(1.-pow(x,1.5))+.012+.022*abs(sin(x*31.))*step(.35,x);
 return max(max(-w.y-lead,w.y-trail),max(-w.x,w.x-L*(1.-.06*abs(sin(w.y*60.)))));}
float sdf(vec2 p){float fl=uQ;
 float d=length((p-vec2(0.,-.02))*vec2(1.,2.2))-.24;
 d=min(d,length(p-vec2(.25,.08))-.085);
 vec2 t=p-vec2(-.17,-.01);float tx=-t.x/.33;float tw=.035+.1*clamp(tx,0.,1.);
 d=min(d,max(max(abs(t.y+tx*.04)-tw,-tx),tx-1.+.08*abs(sin(t.y*45.))));
 d=min(d,wingD(p,vec2(.03,.05),1.25+fl*1.05,.62,.2));
 d=min(d,wingD(p,vec2(.06,.03),1.0+fl*.75,.42,.13)+.004);
 return d;}`;
const DOVE_FS=DOVE_SDF+SDSEG.replace('sdSeg','sdSeg2')+`uniform float uEr;
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.5;float d=sdf(p);float m=smoothstep(.012,-.012,d);if(m<.01)discard;
 float n=styNoise(p*.9+.2).r;float er=styErode(n*.6+.4*clamp(-d*6.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());
 vec3 cream=vec3(.93,.84,.9);float tip=smoothstep(.15,.5,length(p-vec2(0.,0.)));
 vec3 col=mix(cream,uC2*1.05,tip*.75);
 vec3 c=styRampOf(col,clamp(.18+.62*l,0.,1.))*styTint(l);
 // pico ámbar y ojo
 c=mix(c,styRampOf(vec3(1.,.62,.25),.5+.4*l),smoothstep(.02,0.,sdSeg2(p,vec2(.32,.075),vec2(.41,.055))-.017));
 c=mix(c,vec3(.08,.04,.1),smoothstep(.02,.012,length(p-vec2(.27,.1))));
 gl_FragColor=vec4(c,a);}`;
const HALO_FS=`uniform float uGl;
void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());vec3 col=vec3(1.,.74,.26);
 float an=atan(vP.z,vP.x);float sp=pow(abs(sin(an*5.+uT*4.)),12.);
 vec3 c=styRampOf(col,.28+.55*l)*styTint(l)+col*(uGl*.6+sp*.35);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.3*smoothstep(.55,.7,fr)*step(.5,l);
 gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_bbPeaceMaker",name:"Peace Maker (estilizado)",dur:2.3,ti:1.05,tier:2,pal:"Sty Pájaro · Paloma",stylized:true,...ZONES,
  phases:[["Paloma",0],["Vuelo",0.25],["Halo",0.88],["Weak",1.05],["Partida",1.35],["Fin",1.85]],
build(a){
  const L=a.L,TF=0.25,TH0=0.85,TD=0.88,TI=1.05,TL=1.35,TX=1.8,TE=2.05,HV=V3(3.0,2.95,0),HY=2.02;
  const dp=(te,out)=>{
    if(te<TF)return out.set(MO.x+0.35*ss(0,TF,te),MO.y+0.25*ss(0,TF,te),0);
    if(te<TH0){const k=ss(TF,TH0,te),x0=MO.x+0.35,y0=MO.y+0.25;return out.set(x0+(HV.x-x0)*k,y0+(HV.y-y0)*k+1.0*Math.sin(Math.PI*k),0.4*Math.sin(Math.PI*k));}
    if(te<TL){const t=te-TH0;return out.set(HV.x+0.45*Math.sin(t*5),HV.y+0.08*Math.sin(t*9),0.3*(1-Math.cos(t*5)));}
    const t=te-TL;dp(TL-0.0001,out);return out.set(out.x+t*3,out.y+t*t*4+t*1.5,out.z);};
  const dove=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),S.mat(DOVE_FS,{uQ:{value:0},uEr:{value:0}},{mode:'matter',depthTest:false}));
  const haloMat=S.mat(HALO_FS,{uGl:{value:0}},{mode:'solid'});
  const halo=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.07,12,48).rotateX(Math.PI/2),haloMat);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.45,1,24,1,true).translate(0,-0.5,0),S.mat(`void main(){float h=-vP.y;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float st=styNoise(vec2(atan(vP.z,vP.x)*.5,h*.6+uT*.4)).b;
   gl_FragColor=vec4(styRamp(.75+.25*st)*1.1,(fr*.35+smoothstep(.55,.8,st)*.35)*smoothstep(0.,.15,h)*smoothstep(1.,.7,h)*uA);}`,{},{mode:'energy'}));
  L.mesh.add(dove,halo,shaft);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.62,toCam:0.5}), seal=S.groundRing(L.decal,2.6), shadow=S.contactShadow(L.decal,1.3);
  const weak=S.status(a,'weak',[target],TI,TE+0.1);
  const K=`const float TF=${f(TF)};const float TH0=${f(TH0)};const float TI=${f(TI)};const float TL=${f(TL)};const float TX=${f(TX)};
  const vec3 MO=${v3(MO)};const vec3 HV=${v3(HV)};const float HY=${f(HY)};
  vec3 dp(float t){if(t<TF)return MO+vec3(.35,.25,0.)*smoothstep(0.,TF,t);
   if(t<TH0){float k=smoothstep(TF,TH0,t);vec3 a=MO+vec3(.35,.25,0.);return vec3(a.x+(HV.x-a.x)*k,a.y+(HV.y-a.y)*k+sin(3.14159*k),.4*sin(3.14159*k));}
   float u=min(t,TL)-TH0;vec3 p=vec3(HV.x+.45*sin(u*5.),HV.y+.08*sin(u*9.),.3*(1.-cos(u*5.)));
   float w=max(t-TL,0.);return p+vec3(w*3.,w*w*4.+w*1.5,0.);}`;
  // nacimiento: motas doradas que se juntan en la boca
  S.pts(L.part,18,VV+K+`void main(){float s=aSeed.x*(TF-.05);float age=(uT-s)/.22;float k=clamp(age,0.,1.);
   vec3 c=dp(s+.2);vec3 p=mix(c+normalize(rnd())*(.7+.3*aSeed.y),c,k*k);vR=aSeed.z*6.28;vK=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.12+.05*aSeed.z);}`,MOTE_FS,{mode:'energy'});
  // plumas que suelta el vuelo y las de la despedida
  S.pts(L.part,22,VV+K+`void main(){float s=TF+aSeed.x*(TL-TF);float life=1.1+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=dp(s)+rnd()*.12+vec3(sin(t*3.+aSeed.w*9.)*.25,-.75*t,cos(t*2.5+aSeed.z*7.)*.15);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+sin(t*3.+aSeed.x*9.)*.5;put(p,.26+.08*aSeed.w);}`,
   FEATHER_PFS(`mix(vec3(.95,.88,.9),uC2,.25*step(.6,vMix))`));
  S.pts(L.part,26,VV+K+`void main(){float s=TX-.12+aSeed.x*.1;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=dp(TX-.12)+r*.3+vec3(r.x*.9,.3+r.y*.4,r.z*.6)*(1.-exp(-t*3.))+vec3(sin(t*4.+aSeed.w*9.)*.15,-.5*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t;put(p,.26+.08*aSeed.w);}`,
   FEATHER_PFS(`mix(vec3(.95,.88,.9),uC2,.3*step(.5,vMix))`));
  // motas doradas al posarse el halo
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.4,HY,0.)+vec3(cos(an)*.5,0.,sin(an)*.5)*(1.+1.4*(1.-exp(-t*5.)))+vec3(0.,-.4*t,0.);
   vR=an;vK=smoothstep(.4,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.06*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  const pp=V3(0,0,0), pv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, born=ss(0,TF,te), gone=1-ss(TX-0.15,TX,te);
    dp(te,pp); dp(te+0.02,pv); pv.sub(pp);
    towardCam(dove.position,pp,0.05);
    billboard(dove,te<TH0||te>=TL?Math.max(-0.5,Math.min(0.6,scrAng(pp,pv)))*0.6:0.06*Math.sin(te*9));
    dove.visible=te<TX+0.05; dove.scale.setScalar(0.5+0.5*born); dove.scale.x*=pv.x<-0.002?-1:1;
    dove.material.uniforms.uQ.value=0.5+0.5*Math.sin(te*(te<TF?10:18));
    dove.material.uniforms.uA.value=born; dove.material.uniforms.uEr.value=-0.1+1.1*ss(TX-0.25,TX,te);
    // halo: cae desde la paloma, se posa y aprieta la cabeza
    const fall=ss(TD,TI,te), hy=HV.y-0.2+(HY-(HV.y-0.2))*fall*fall, sq=hitE(ia,5);
    halo.visible=te>=TD&&te<TE; halo.position.set(target.position.x,te<TI?hy:HY-0.06*ss(TI,TI+0.4,te),0);
    halo.scale.setScalar(Math.max((te<TI?0.75+0.25*fall:1-0.15*ss(TI,TI+0.4,te))*(1+0.2*sq)*(1-ss(TX,TE,te)),0.001));
    haloMat.uniforms.uGl.value=0.25+0.9*sq;
    shaft.visible=te>=TD&&te<TI+0.25; shaft.position.copy(pp); shaft.scale.set(1,Math.max(pp.y-hy,0.01),1);
    set(shaft,0,ss(TD,TD+0.05,te)*(1-ss(TI,TI+0.25,te))*0.8);
    spark.pose(ia,tmp2.set(3.3,HY,0),0.9);
    seal.pose(ia,3.4,0,0.9,1);
    shadow.pose(pp.x,pp.z,Math.max(1.1-pp.y*0.15,0.3),born*gone*0.7);
    const wk=weak.pose(te); S.statusGlow(o,[{kind:'weak',env:wk}]);
    target.scale.set(1+0.05*sq,1-0.07*wk-0.08*sq,1+0.05*sq); target.rotation.z=0.06*wk*Math.sin(te*3);
    caster.rotation.z=-0.06*ss(0,TF,te)*(1-ss(TF,TF+0.3,te));
    if(te<TI){o.g.copy(pp);o.gs=0.8+0.3*born;o.ga=0.1*born;o.li=1.4*born;}
    else{o.g.set(3.4,HY,0);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.14*Math.exp(-ia*7);o.li=1+2.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(3.35,1.7,0);o.shake=0.2;o.dist=0.4;o.flash=0.3;
  };
}});

// =====================================================================
// 3 · FEATHER DAGGER (nivel 1) — dos dagas de pluma cristalina (magenta, facetas iluminadas, filo rosa que brilla)
//     salen de la boca con estelas; dos golpes secos con esquirlas; quedan clavadas y se deshacen en plumas.
// =====================================================================
const DAG_FS=`uniform float uEr;
float sdf(vec2 p){float x=p.x+.5;float w=.5*smoothstep(.0,.3,x)*sqrt(max(0.,1.-pow(max(x-.45,0.)/.55,2.)));return abs(p.y)-w*.42;}
${SDFLIT}
void main(){vec2 p=vec2(vUv.x-.5,(vUv.y-.5)*.3);float d=sdf(p);float m=smoothstep(.006,-.006,d)*step(.02,vUv.x);if(m<.01)discard;
 float er=styErode(styNoise(vUv*.6+uP).r*.6+.4*vUv.x,uEr,.1);float a=m*er*uA;if(a<.01)discard;
 vec2 g=vec2(vUv.x*7.,vUv.y*2.);float fac=fract(sin(dot(floor(g+vec2(floor(vUv.y*2.)*.5,0.)),vec2(12.9898,78.233)))*43758.5453);
 vec3 n=normalize(vec3((fac-.5)*.9,(vUv.y-.5)*2.4,1.));float l=styLight(n,stySunV());
 vec3 c=styMatter(l,.05+.12*fac);
 float edge=smoothstep(-.03,-.005,d);float shaft=smoothstep(.012,0.,abs(p.y))*step(.15,vUv.x);
 c=mix(c,styRamp(.9)*1.7,edge*.8);c=mix(c,vec3(1.,.9,.97)*1.2,shaft*.6);
 gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_bbFeatherDagger",name:"Feather Dagger (estilizado)",dur:1.2,ti:0.38,tier:1,pal:"Sty Pájaro · Daga",stylized:true,...ZONES,
  phases:[["Forja",0],["Disparo",0.1],["Impactos",0.28],["Carga",0.45]],
build(a){
  const L=a.L,DG=[{tl:0.1,ti:0.28,o:V3(0.05,0.1,0.12),h:V3(3.1,1.36,0.1)},{tl:0.18,ti:0.38,o:V3(0.05,-0.08,-0.12),h:V3(3.1,1.08,-0.1)}],TB=0.62,TE=1.1;
  const dpos=(d,te,out)=>{const k=Math.pow(cl((te-d.tl)/(d.ti-d.tl)),1.25);
    return out.set(MO.x+d.o.x+(d.h.x-MO.x-d.o.x)*k,MO.y+d.o.y+(d.h.y-MO.y-d.o.y)*k+0.15*Math.sin(Math.PI*k),d.o.z+(d.h.z-d.o.z)*k);};
  const trMat=S.mat(STREAK_FS,{},{mode:'energy'});
  const blades=DG.map((d,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.4),S.mat(DAG_FS,{uEr:{value:0}},{mode:'matter',depthTest:false}));
    m.material.uniforms.uP.value=i*0.41;L.mesh.add(m);return m;});
  const trails=DG.map(()=>streakMesh(L.trail,0.16,trMat));
  const sparks=DG.map((d,i)=>S.hitSpark(L.mesh,1.3+0.3*i,{seed:0.3+0.4*i,toCam:0.5}));
  const ring=S.groundRing(L.decal,2.2);
  const K=`const vec3 MO=${v3(MO)};`+DG.map((d,i)=>`const float TI${i}=${f(d.ti)};const vec3 H${i}=${v3(d.h)};`).join("")+`const float TB=${f(TB)};`;
  // forja: motas rosas que se cierran en la boca
  S.pts(L.part,14,VV+K+`void main(){float s=aSeed.x*.08;float age=(uT-s)/.12;float k=clamp(age,0.,1.);
   vec3 c=MO+vec3(.12,0.,0.);vec3 p=mix(c+normalize(rnd())*.5,c,k*k);vR=aSeed.z*6.28;vK=0.;vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.04*aSeed.z);}`,
   MOTE_FS,{mode:'energy'});
  // esquirlas de cristal de cada golpe
  S.pts(L.part,28,VV+K+`void main(){bool b=aSeed.w>.5;float s=b?TI1:TI0;float life=.32+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.6,.35,0.))*(1.6+2.4*aSeed.z);vec3 p=(b?H1:H0)+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.x*6.28+t*10.;put(p,.15+.06*aSeed.z);}`,
   S.MATTER_FS(C.shard,{relief:3,bias:.08}));
  // las dagas se deshacen en plumas rosas
  S.pts(L.part,20,VV+K+`void main(){bool b=aSeed.w>.5;float s=TB+aSeed.x*.08+(b?.05:0.);float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=(b?H1:H0)+vec3(-.35+.5*aSeed.y,0.,0.)+vec3((aSeed.z-.5)*.8,.25+.35*aSeed.y,(aSeed.x-.5)*.7)*(1.-exp(-t*4.))+vec3(sin(t*5.+aSeed.z*9.)*.12,-.6*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.z*6.28+t*1.5;put(p,.24+.07*aSeed.y);}`,
   FEATHER_PFS(`mix(uC1,uC2,.35+.4*step(.5,vMix))`));
  const bp=V3(0,0,0), bv=V3(0,0,0), tp=V3(0,0,0);
  a.pose=function(te,o){
    let last=-1;
    DG.forEach((d,i)=>{const m=blades[i];dpos(d,te,bp);dpos(d,te+0.01,bv);bv.sub(bp);if(te>=d.ti)last=i;
      const ang=te<d.tl?0.1:scrAng(bp,bv.lengthSq()>1e-8?bv:tmp3.set(1,0,0));
      // clavada: tras el golpe queda metida un poco y tiembla
      if(te>=d.ti){bp.copy(d.h);bp.x-=0.32;bp.x+=target.position.x-3.4;}
      m.visible=te>=0.02&&te<TB+0.12; towardCam(m.position,bp,0.05);
      billboard(m,te>=d.ti?scrAng(d.h,XA)+0.04*Math.sin(te*70)*hitE(te-d.ti,6):ang);
      m.scale.setScalar(Math.max(te<d.tl?ss(0.02,d.tl,te):1,0.001));
      m.material.uniforms.uA.value=1; m.material.uniforms.uEr.value=-0.1+1.1*ss(TB-0.02,TB+0.12,te);
      const vis=te>=d.tl&&te<d.ti+0.1;
      if(vis){dpos(d,Math.min(te,d.ti),bp);dpos(d,Math.max(Math.min(te,d.ti)-0.07,d.tl),tp);poseStreak(trails[i],tp,bp,true);}else trails[i].visible=false;
      sparks[i].pose(te-d.ti,tmp2.copy(d.h).add(tmp.set(-0.05,0,0)),1);});
    trMat.uniforms.uA.value=1;
    ring.pose(te-DG[1].ti,3.4,0,0.4,0.9);
    let kb=0;DG.forEach(d=>kb+=0.12*hitE(te-d.ti,10)*(te>=d.ti?1:0));
    target.position.x=3.4+kb; target.rotation.z=-kb*0.9;
    caster.rotation.z=-0.05*ss(0.04,0.1,te)*(1-ss(0.2,0.4,te));
    emit(target,0.6*hitE(te-DG[1].ti,8)*(te>=DG[1].ti?1:0));
    if(last<0){dpos(DG[0],te,bp);o.g.copy(bp);o.gs=0.6;o.ga=0.08;o.li=1.2;}
    else{const il=te-DG[last].ti;o.g.copy(DG[last].h);o.gs=0.8+1.2*Math.min(il,0.4);o.ga=0.14*Math.exp(-il*12);o.li=1+2.5*Math.exp(-il*8);}
    o.ia=last<0?te-DG[0].ti:te-DG[last].ti; o.c.copy(DG[Math.max(last,0)].h); o.shake=0.2; o.dist=0.25; o.flash=0.3;
  };
}});

// =====================================================================
// 4 · HUNGRY BIRD — el lanzador da un saltito de ataque; junto al rival aparece un pájaro espíritu hambriento (cabeza
//     rosa iluminada con pico ámbar sólido) que lo picotea cuatro veces: plumas y migajas de energía; la energía robada
//     vuelve en arco al lanzador y lo cura con motas doradas en espiral.
// =====================================================================
const BIRDHEAD_FS=SDSEG+`uniform float uEr;
float sdf(vec2 p){float d=length(p)-.36;
 d=min(d,sdSeg(p,vec2(-.1,.3),vec2(-.5,.36))-.055);d=min(d,sdSeg(p,vec2(-.2,.22),vec2(-.55,.2))-.045);
 d=min(d,length((p-vec2(-.1,-.36))*vec2(1.,1.6))-.2);return d;}
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.25;float d=sdf(p);float m=smoothstep(.012,-.012,d);if(m<.01)discard;
 float n=styNoise(p*.8+.4).r;float er=styErode(n*.6+.4*clamp(-d*5.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());vec3 col=vec3(.86,.3,.44);
 vec3 c=styRampOf(col,clamp(.2+.6*l,0.,1.))*styTint(l);
 c=mix(c,styRampOf(vec3(1.,.82,.86),.4+.5*l)*styTint(l),smoothstep(.2,.1,length(p-vec2(.08,-.08)))*.4);
 // ojo hambriento: ámbar con pupila y brillo
 vec2 e=p-vec2(.12,.08);c=mix(c,styRamp(.85)*1.5,smoothstep(.085,.075,length(e)));
 c=mix(c,vec3(.04,.02,.03),smoothstep(.045,.035,length(e-vec2(.015,0.))));c=mix(c,vec3(1.4),smoothstep(.02,.012,length(e-vec2(-.02,.03))));
 c=mix(c,styRampOf(col,.12),smoothstep(.02,.0,abs(length(e)-.1))*step(.0,e.y)*.8);
 gl_FragColor=vec4(c,a);}`;
const BEAK_FS=`uniform float uGl;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 float u=clamp(vP.x/.85+.5,0.,1.);vec3 col=mix(vec3(1.,.68,.2),vec3(.62,.24,.08),smoothstep(.55,1.,u));
 vec3 c=styRampOf(col,.25+.6*l)*styTint(l)+uC1*uGl*.5;
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.25*smoothstep(.6,.7,fr)*step(.5,l);
 gl_FragColor=vec4(c,1.);}`;
defs.push({key:"sty_bbHungryBird",name:"Hungry Bird (estilizado)",dur:2.2,ti:1.0,tier:2,pal:"Sty Pájaro · Hambre",stylized:true,...ZONES,
  phases:[["Salto",0],["Picotazos",0.42],["Remate",1.0],["Regreso",1.22],["Regenera",1.55]],
build(a){
  const L=a.L,TJ=0.1,TA=0.36,PK=[0.5,0.65,0.8,1.0],PW=0.12,TR=1.22,TB=1.55,TH2=1.6,TE=2.1,HB=V3(1.85,1.5,0.35),HIT=V3(3.2,1.3,0.1);
  const peck=te=>{for(let i=0;i<PK.length;i++){const k=(te-(PK[i]-PW*0.7))/PW;if(k>=0&&k<1)return [i,Math.pow(Math.sin(Math.PI*k),0.6),k];}return [-1,0,0];};
  const head=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),S.mat(BIRDHEAD_FS,{uEr:{value:0}},{mode:'matter'}));
  const beakMat=S.mat(BEAK_FS,{uGl:{value:0}},{mode:'solid'});
  const bg=new THREE.ConeGeometry(0.19,0.85,4,1).rotateZ(-Math.PI/2).scale(1,0.7,1.2);
  const up=new THREE.Mesh(bg,beakMat), lo=new THREE.Mesh(bg,beakMat);
  const beak=new THREE.Group(); up.position.set(0.4,0.05,0); lo.position.set(0.36,-0.05,0); lo.scale.set(0.85,0.8,0.9);
  const upP=new THREE.Group(), loP=new THREE.Group(); upP.add(up); loP.add(lo); beak.add(upP,loP);
  const bird=new THREE.Group(); bird.add(head,beak); beak.position.set(0.28,-0.02,0.02); L.mesh.add(bird);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.44,toCam:0.5}), ringT=S.groundRing(L.decal,2.6), ringC=S.groundRing(L.decal,2.4);
  const shadow=S.contactShadow(L.decal,1.2);
  const K=`const vec3 HIT=${v3(HIT)};const float TR=${f(TR)};const float TB=${f(TB)};const float TH2=${f(TH2)};const float TJ=${f(TJ)};const float TA=${f(TA)};`;
  // por picotazo: plumas arrancadas y migajas de energía (el último, más)
  PK.forEach((t,i)=>{const big=i===3;
    S.pts(L.part,big?14:7,VV+K+`void main(){float s=${f(t)}+aSeed.x*.04;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float tt=max(uT-s,0.);
     vec3 r=rnd();vec3 p=HIT+vec3(.2+.9*abs(r.x),.3+.8*aSeed.z,r.z*.8)*(1.-exp(-tt*4.))+vec3(sin(tt*4.+aSeed.w*9.)*.18,-.7*tt,0.);
     vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+tt*.8*sign(r.x);put(p,.27+.08*aSeed.w);}`,
     FEATHER_PFS(`mix(vec3(.93,.4,.52),vec3(1.,.8,.5),step(.6,vMix))`));
    S.pts(L.part,big?16:8,VV+K+`void main(){float s=${f(t)}+aSeed.x*.03;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float tt=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(.4,.6,0.))*(1.6+2.4*aSeed.z);vec3 p=HIT+v*tt+vec3(0.,-5.*tt*tt,0.);
     vA=(age>0.&&age<1.&&p.y>.02)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*7.+tt*6.;put(p,.13+.06*aSeed.w);}`,
     S.ENERGY_FS(C.shard,{gain:1.4}),{mode:'energy'});});
  // energía robada: motas doradas que vuelven en arco del rival al lanzador
  S.pts(L.part,26,VV+K+`void main(){float s=TR-.12+aSeed.x*.25;float k=clamp((uT-s)/.38,0.,1.);
   vec3 a=HIT,b=vec3(-3.7,1.,0.);vec3 p=mix(a,b,k)+vec3(0.,1.6*k*(1.-k)*(.8+.4*aSeed.y),(aSeed.z-.5)*.8*k*(1.-k))+rnd()*.08;
   vA=(uT>s&&k<1.)?1.:0.;vK=0.;vR=aSeed.w*6.28;put(p,.14+.06*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // cura: motas cálidas que suben en espiral alrededor del lanzador
  S.pts(L.part,30,VV+K+`void main(){float s=TH2+aSeed.x*.35;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*3.;float rad=.5+.15*aSeed.w;vec3 p=vec3(-3.7+cos(an)*rad,.1+t*2.2,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=0.;vR=an;put(p,.12+.07*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  // polvo del saltito
  S.pts(L.part,10,VV+K+`void main(){float i=step(.5,aSeed.w);float s=(i>.5?TB:TA)+aSeed.x*.05;float x0=i>.5?-3.7:-3.15;
   float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=vec3(x0,.06,0.)+vec3(cos(an),0.,sin(an))*(.25+.55*(1.-exp(-t*4.)))+vec3(0.,.2*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=an;put(p,(.22+.1*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.08,col:EARTH}));
  const hp=V3(0,0,0), hd=V3(0,0,0);
  a.pose=function(te,o){
    const [pi,pk,pkk]=peck(te), app=back(cl((te-TA)/0.16)), gone=ss(1.1,1.3,te);
    // saltito del lanzador hacia el rival y vuelta
    const hop=ss(TJ,TA,te)*(1-ss(TR,TB,te));
    caster.position.set(-3.7+0.55*hop,0.45*Math.sin(Math.PI*cl((te-TJ)/(TA-TJ)))*(te<TA?1:0)+0.4*Math.sin(Math.PI*cl((te-TR)/(TB-TR)))*(te>TR&&te<TB?1:0),0);
    const land=hitE(te-TA,10)*(te>=TA?1:0); caster.scale.set(1+0.08*land,1-0.12*land,1+0.08*land);
    caster.rotation.z=-0.15*ss(TJ,TJ+0.05,te)*(1-ss(TA-0.1,TA,te))+0.12*ss(TR,TR+0.05,te)*(1-ss(TB-0.1,TB,te));
    // pájaro espíritu: aparece junto al rival, se echa atrás y lanza cada picotazo
    const wind=pi>=0&&pkk<0.35?ss(0,0.35,pkk):0, lunge=pk*(pkk>=0.35?1:0);
    hd.copy(HIT).sub(HB).normalize();
    hp.copy(HB).addScaledVector(hd,0.42*lunge-0.12*wind); hp.y+=0.08*Math.sin(te*6)-0.1*lunge;
    towardCam(bird.position,hp,0.15); bird.visible=te>=TA&&te<1.35;
    // el grupo mira a la cámara; el pico apunta al rival en pantalla (espejo si el rival queda a la izquierda)
    const ang=scrAng(HB,hd), flip=Math.cos(ang)<0, sc=Math.max(1.3*app*(1+0.08*(pi===3?lunge:0)),0.001);
    billboard(bird,(flip?ang-Math.PI:ang)+(flip?1:-1)*(0.28*lunge-0.12*wind));
    bird.scale.set(flip?-sc:sc,sc,sc);
    head.material.uniforms.uA.value=1; head.material.uniforms.uEr.value=-0.1+1.1*gone;
    const open=pi>=0?0.42*(wind+(1-ss(0.35,0.55,pkk))*(pkk>=0.35?0.6:0)):0.1;
    upP.rotation.z=open; loP.rotation.z=-open*0.8; beak.visible=gone<0.6;
    let last=-1;for(let i=0;i<PK.length;i++)if(te>=PK[i])last=i;
    const il=last>=0?te-PK[last]:-1, ia=te-PK[3];
    beakMat.uniforms.uGl.value=0.6*Math.exp(-Math.max(il,0)*10)*(il>=0?1:0);
    spark.pose(il,HIT,last===3?1.25:0.8);
    ringT.pose(ia,3.4,0,0.45,1); ringC.pose(te-TH2,-3.7,0,0.6,0.85);
    shadow.pose(hp.x,0.35,1,0.4*(te>=TA&&te<1.3?1:0)*(1-gone));
    emit(caster,0.5*ss(TH2-0.05,TH2+0.15,te)*(1-ss(TE-0.2,TE+0.1,te)),tmp2.set(1,0.75,0.3));
    // rival: un tirón por picotazo, el último más fuerte
    const kb=last>=0?(last===3?0.28:0.1)*Math.exp(-il*(last===3?4.5:10)):0;
    target.position.x=3.4+kb; target.rotation.z=-kb*1.1*Math.cos(Math.max(il,0)*16);
    if(last<0){o.g.copy(hp);o.gs=0.7*app;o.ga=0.06;o.li=0.8;}
    else if(te<TR){o.g.copy(HIT);o.gs=0.9+(last===3?1.4:0.8)*Math.min(il,0.4);o.ga=(last===3?0.16:0.1)*Math.exp(-il*10);o.li=1+(last===3?3:1.8)*Math.exp(-il*7);}
    else{const hk=ss(TH2-0.05,TH2+0.15,te)*(1-ss(TE-0.2,TE+0.1,te));o.g.set(-3.7,1,0);o.gs=1.1;o.ga=0.1*hk;o.li=1.6*hk;}
    o.ia=last<0?ia:il; o.c.copy(HIT); o.shake=last===3?0.5:0.25; o.dist=0.4; o.flash=0.3;
  };
}});

// =====================================================================
// 5 · DOUBLETALK — dos notas (rosa y violeta, sólidas e iluminadas) se trenzan sobre un pentagrama ondulante; chocan en
//     la cabeza del rival con anillos desfasados y lo duermen: nube lavanda que gira, zetas que suben y bruma en el suelo.
// =====================================================================
const NOTE_SDF=SDSEG+`uniform float uKind;
float noteA(vec2 p){vec2 h=p-vec2(-.1,-.25);h=vec2(h.x*.83+h.y*.55,-h.x*.55+h.y*.83);
 float d=length(h*vec2(1.,1.5))-.13;d=min(d,sdSeg(p,vec2(.0,-.22),vec2(.0,.32))-.03);d=min(d,sdSeg(p,vec2(.0,.32),vec2(.17,.1))-.04);return d;}
float noteB(vec2 p){float d=1e3;for(int i=0;i<2;i++){vec2 o=vec2(-.2+.32*float(i),-.24+.06*float(i));vec2 h=p-o;h=vec2(h.x*.83+h.y*.55,-h.x*.55+h.y*.83);
  d=min(d,length(h*vec2(1.,1.5))-.11);d=min(d,sdSeg(p,o+vec2(.09,.02),o+vec2(.09,.5))-.028);}
 d=min(d,sdSeg(p,vec2(-.11,.26),vec2(.21,.32))-.05);return d;}
float sdf(vec2 p){return uKind<.5?noteA(p):noteB(p);}`;
const NOTE_FS=NOTE_SDF+`uniform float uEr;uniform vec3 uCol;
${SDFLIT}
void main(){vec2 p=(vUv-.5)*1.2;float d=sdf(p);float m=smoothstep(.012,-.012,d);if(m<.01)discard;
 float er=styErode(styNoise(p*.7+uKind).r*.6+.4*clamp(-d*6.,0.,1.),uEr,.1);float a=m*er*uA;if(a<.01)discard;
 float l=styLight(sdfN(p),stySunV());vec3 c=styRampOf(uCol,clamp(.2+.62*l,0.,1.))*styTint(l);
 c+=uCol*smoothstep(-.03,0.,d)*.6;
 gl_FragColor=vec4(c,a);}`;
const ZZ_FS=S.PV+SDSEG+`void main(){vec2 q=styPC()-.5;
 float d=min(min(sdSeg(q,vec2(-.24,.26),vec2(.24,.26)),sdSeg(q,vec2(-.24,-.26),vec2(.24,-.26))),sdSeg(q,vec2(.24,.26),vec2(-.24,-.26)));
 float m=smoothstep(.1,.075,d);if(m*vA<.01)discard;float er=styErode(styNoise(q*.6+vMix).r*.6+.4*m,vK*1.05-.05,.1);
 vec3 c=mix(styRampOf(vec3(.42,.3,.85),.35),styRampOf(vec3(.78,.7,1.),.9),smoothstep(.085,.0,d)*step(-.1,q.y+q.x*.2));
 gl_FragColor=vec4(c,m*er*vA);}`;
defs.push({key:"sty_bbDoubletalk",name:"Doubletalk (estilizado)",dur:2.4,ti:1.0,tier:2,pal:"Sty Pájaro · Doble",stylized:true,...ZONES,
  phases:[["Notas",0],["Trenza",0.2],["Disonancia",1.0],["Sueño",1.15],["Fin",2.0]],
build(a){
  const L=a.L,TL=0.2,TI=1.0,TS=1.15,TX=2.0,DUR=2.4,HP=V3(3.22,1.95,0),S0=V3(MO.x+0.2,MO.y+0.1,0);
  const np=(i,te,out)=>{const k=ss(TL,TI,te),s=i?1:-1,ph=k*Math.PI*3,am=0.34*Math.sin(Math.PI*k);
    if(te<TL){const b=ss(0,TL,te);return out.set(S0.x+0.15*b,S0.y+0.15*b+s*0.14*b,0);}
    return out.set(S0.x+0.15+(HP.x-S0.x-0.15)*k,S0.y+0.15+(HP.y-S0.y-0.15)*k+0.5*Math.sin(Math.PI*k)+s*am*Math.cos(ph)*0.6+(1-k)*s*0.14,s*am*Math.sin(ph));};
  const notes=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(NOTE_FS,
    {uKind:{value:i},uEr:{value:0},uCol:{value:new THREE.Color(i?"#7a45d6":"#ff6fbf")}},{mode:'matter',depthTest:false}));L.mesh.add(m);return m;});
  const ST_W=HP.x-S0.x;
  const staff=new THREE.Mesh(new THREE.PlaneGeometry(ST_W,1.1),S.mat(`void main(){float u=vUv.x;if(u>uP)discard;
   float y=(vUv.y-.5)*1.1-.5*sin(3.14159*u)*.9+.04;float w=.08*sin(u*12.-uT*3.);
   float m=0.;for(int i=0;i<5;i++){float yi=(float(i)-2.)*.06*(1.+.4*sin(u*7.+float(i)*1.7+uT*4.)*u);m+=smoothstep(.012,.004,abs(y-w-yi));}
   float head=smoothstep(.06,0.,uP-u);float n=styNoise(vec2(u*1.5-uT*.6,vUv.y)).b;
   gl_FragColor=vec4(styRamp(.55+.4*n+.3*head)*1.25,m*(.45+.55*head)*smoothstep(0.,.05,u)*uA);}`,{},{mode:'energy',depthTest:false}));
  staff.position.set((S0.x+HP.x)/2,(S0.y+HP.y)/2+0.15,0); L.trail.add(staff);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.81,toCam:0.5}), rA=ringBill(L.mesh,2.0), rB=ringBill(L.mesh,2.0);
  const mist=groundPlane(2.6,3.4,0.02,S.mat(POOL_FS('vec3(.42,.3,.78)',.65),{},{mode:'matter'})); L.decal.add(mist);
  const ring=S.groundRing(L.decal,2.6);
  const K=`const float TL=${f(TL)};const float TI=${f(TI)};const float TS=${f(TS)};const float TX=${f(TX)};const float DUR=${f(DUR)};const vec3 HP=${v3(HP)};const vec3 S0=${v3(S0)};
  vec3 np(float s,float t){float k=smoothstep(TL,TI,t);float ph=k*9.4248;float am=.34*sin(3.14159*k);
   return vec3(S0.x+.15+(HP.x-S0.x-.15)*k,S0.y+.15+(HP.y-S0.y-.15)*k+.5*sin(3.14159*k)+s*am*cos(ph)*.6+(1.-k)*s*.14,s*am*sin(ph));}`;
  // chispas agrias que sueltan las notas al vibrar
  S.pts(L.part,30,VV+K+`void main(){float sd=aSeed.w>.5?1.:-1.;float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=np(sd,s)+rnd()*.1+vec3(-.3*t,(aSeed.z-.5)*.6*t,0.);vR=aSeed.z*6.28;vK=smoothstep(.5,1.,age);
   vA=(age>0.&&age<1.)?1.:0.;put(p,(.1+.06*aSeed.z)*(1.-age*.4));}`,MOTE_FS,{mode:'energy'});
  // nube de sueño lavanda (materia) que gira alrededor de la cabeza
  S.pts(L.part,16,VV+K+`void main(){float an=aSeed.x*6.2832+uT*(.5+.3*aSeed.y);float rad=.38+.3*aSeed.z;
   float g=smoothstep(TI,TS+.2,uT)*(1.-smoothstep(TX,DUR,uT));
   vec3 p=HP+vec3(cos(an)*rad,.05+(aSeed.w-.4)*.4+.06*sin(uT*1.5+aSeed.x*9.),sin(an)*rad*.8);
   vR=an*.3;vK=1.-g;vA=g>.01?1.:0.;put(p,(.38+.18*aSeed.w)*(.5+.5*g));}`,S.MATTER_FS(C.puff,{relief:5,bias:-.06,col:'vec3(.5,.38,.86)'}));
  // zetas que suben balanceándose y crecen
  S.pts(L.part,8,VV+K+`void main(){float life=1.+aSeed.y*.3;float k=(uT-TS)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=HP+vec3(.15+(r.x-.3)*.4+sin(age*6.+r.y*6.)*.14,.4+age*1.1,(r.z-.5)*.4);
   vR=sin(age*6.+r.y*6.)*.35;vK=smoothstep(.75,1.,age);
   vA=(k>=1.&&uT<TX+.3)?smoothstep(0.,.15,age)*(1.-smoothstep(TX-.2,TX+.3,uT)):0.;put(p,.32+.28*age);}`,ZZ_FS);
  const pp=V3(0,0,0), pv=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, born=ss(0,TL,te);
    notes.forEach((m,i)=>{np(i,te,pp);towardCam(m.position,pp,0.05);billboard(m,0.25*Math.sin(te*(i?7:9)+i*2)+(i?-0.15:0.15));
      const pulse=1+0.1*Math.sin(te*(i?23:17));m.visible=te<TI+0.12;
      m.scale.setScalar(Math.max((0.45+0.55*born)*pulse,0.001));m.material.uniforms.uA.value=born;
      m.material.uniforms.uEr.value=-0.1+1.1*cl(ia/0.1);});
    staff.visible=te>=0.05&&te<TS+0.3; set(staff,ss(0.05,TI,te)*1.02,ss(0.05,0.2,te)*(1-ss(TI,TS+0.3,te))*0.85);
    spark.pose(ia,HP,1);
    for(const [r,d,ox] of [[rA,0,0.09],[rB,0.05,-0.09]]){const p=cl((ia-d)/0.45);towardCam(r.position,tmp.copy(HP).add(tmp2.set(ox,0,0)),0.3);billboard(r);
      r.visible=ia>=d&&p<1;r.scale.setScalar(0.4+1.3*p);set(r,-0.1+1.1*p,1);}
    ring.pose(ia,3.4,0,0.5,1);
    const sl=ss(TS-0.1,TS+0.3,te)*(1-ss(TX,DUR,te)); set(mist,-0.1+1.1*ss(TX,DUR,te),sl);
    // rival adormecido: cabecea despacio y respira hondo
    target.position.x=3.4+0.12*hitE(ia,8)*(ia>=0?1:0);
    target.rotation.z=-0.1*hitE(ia,8)*Math.sin(Math.max(ia,0)*20)*(ia>=0?1:0)+sl*(0.1*Math.sin(te*2.2)+0.05);
    const br=sl*0.03*Math.sin(te*3.3); target.scale.set(1+br,1-0.04*sl-br,1+br);
    o.em=0.25*sl; o.emc.setRGB(0.55,0.45,0.95);
    caster.rotation.z=-0.05*Math.sin(te*14)*ss(0,0.1,te)*(1-ss(TL,TL+0.3,te));
    if(te<TI){np(0,te,pp);np(1,te,pv);o.g.copy(pp).add(pv).multiplyScalar(0.5);o.gs=0.8+0.2*born;o.ga=0.08*born;o.li=1.4*born;}
    else{o.g.copy(HP);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.14*Math.exp(-ia*7);o.li=1+2.5*Math.exp(-ia*4);}
    o.ia=ia;o.c.copy(HP);o.shake=0.2;o.dist=0.5;o.flash=0.3;
  };
}});

VFX.module("Estilizado · Pájaro · Boca",defs);
})();

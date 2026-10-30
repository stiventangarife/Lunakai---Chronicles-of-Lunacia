// =====================================================================
// ESTILIZADO · DÚO · MAELSTROM CELESTE (Hito 101) — Ultimate de agua y viento Sapidae + su Axie, kit vfx-stylized.js.
// Clave: sty_duo_maelstrom. Mismos dur / ti / fases / piezas y la misma coreografía que mod-duo-maelstrom.js: el dúo
// levita, se abre un tornado de marea en el centro de la cruz rival, los arcos arrastran a los dos rivales vecinos,
// cae un relámpago y la marea detona en cruz (2 casillas). La carta: daño en cruz, −2 PM y luego −1 PA.
// Agua en materia turquesa saturada (no espuma blanca), viento en pincel turquesa, arcos rosa/violeta, relámpago
// cian-violeta con destello moderado (el original llegaba a 0,85 de blanco).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,HEAD,set,groundPlane,caster,target,allies,enemies}=VFX;
const {v3,billboard,towardCam,taperTube,variantGroups}=VFX.lib;
const S=VFX.sty, CE=S.CELL;
const PAL="Sty Dúo · Maelstrom"; VFX.palette(PAL,["#6fe3e8","#0b6f96"]);
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const WATER=lin(0x1aa3c4), WATERD=lin(0x0a4f74), FOAM=lin(0x9fe8e6), PINK=lin(0xff6f9a), VIOLET=lin(0x8a7dff), SOOT=lin(0x22343e), TEALG=lin(0x3fe0d8);
const VV=`varying float vR;varying float vK;`;
const ZG="vfx_mael_zero_gravity",WR="vfx_mael_wind_ribbons",WV="vfx_mael_water_vortex",
  SA="vfx_mael_suction_arcs",SL="vfx_mael_sky_lightning",TS="vfx_mael_tidal_splash",IDS=[ZG,WR,WV,SA,SL,TS];

// tubo quebrado (relámpago): un anillo de lados por extremo de cada tramo; uv.y = avance global 0 (cielo) → 1 (suelo)
function jagGeo(lines,sides){
  const pos=[],uv=[],idx=[],d=V3(0,0,0),ax=V3(0,0,0),bx=V3(0,0,0);
  for(const L of lines){const n=L.pts.length-1;
    for(let i=0;i<n;i++){const A=L.pts[i],B=L.pts[i+1];d.copy(B).sub(A).normalize();
      ax.copy(Math.abs(d.y)>0.9?V3(1,0,0):V3(0,1,0)).cross(d).normalize(); bx.copy(d).cross(ax).normalize();
      const base=pos.length/3;
      for(const [P,k] of [[A,i],[B,i+1]]){const t=L.t0+(L.t1-L.t0)*k/n, r=L.r*(1-0.45*k/n);
        for(let s=0;s<=sides;s++){const an=s/sides*Math.PI*2,c=Math.cos(an)*r,sn=Math.sin(an)*r;
          pos.push(P.x+ax.x*c+bx.x*sn,P.y+ax.y*c+bx.y*sn,P.z+ax.z*c+bx.z*sn); uv.push(s/sides,t);}}
      for(let s=0;s<sides;s++){const a0=base+s,a1=a0+1,b0=base+sides+1+s,b1=b0+1;idx.push(a0,b0,a1,a1,b0,b1);}
    }}
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3)); g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// grietas en el suelo (materia oscura con brillo turquesa uK)
const CRACK_FS=`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*1.1+.37);vec4 s2=styNoise(vUv*2.3+.71);
 float cr=max(smoothstep(.05,.0,abs(s.b-.5)),smoothstep(.035,0.,abs(s2.b-.5))*.8)*smoothstep(1.,.3,r)*step(r+s.r*.2,uP*1.15);
 if(cr<.05)discard;vec3 c=mix(styRampOf(${SOOT},.15),${TEALG}*1.6,uK*smoothstep(.55,1.,cr));gl_FragColor=vec4(c,cr*uA*.9);}`;

const mael={key:"sty_duo_maelstrom",name:"Maelstrom Celeste (estilizado)",tier:3,dur:3.2,ti:1.8,pal:PAL,allies:1,enemies:2,stylized:true,
  vlabel:"Pieza",v:"full",
  variants:[["full","Completo"],[ZG,"Ingravidez"],[WR,"Viento"],[WV,"Tornado"],[SA,"Arcos"],[SL,"Relámpago"],[TS,"Marea"]],
  phases:[["Levitación",0],["Tornado",0.6],["Succión",0.95],["Relámpago",1.7],["Detonación",1.8],["Disipación",2.55]],
build(a){
  const TV0=0.6,TV1=1.8,TA0=0.95,TL=1.7,TI=1.8,C=V3(3.4,0,0),CORE=V3(3.4,1.2,0),D=V3(-3.7,0,-0.5);
  const EB=[V3(2.4,0,0),V3(3.4,0,-1.0)];
  const VG=variantGroups(a,IDS), N={};
  const lev=te=>0.38*ss(0,0.65,te)*(1-ss(2.55,3.1,te))+0.04*Math.sin(te*3.2)*ss(0,0.4,te)*(1-ss(2.6,3.1,te));
  const ZE=`const vec3 D=${v3(D)};float zEnv(){return smoothstep(0.,.45,uT)*(1.-smoothstep(2.5,3.1,uT));}`;

  // ---------- 1 · ingravidez: gotas de agua y plumas rosas que flotan alrededor del dúo ----------
  N[ZG]=S.pts(VG[ZG].part,20,VV+ZE+`void main(){float life=2.4+aSeed.y*.8;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rd=.55+1.45*sqrt(r.y);
   vec3 p=D+vec3(cos(an)*rd,.15+r.z*1.5+age*1.1,sin(an)*rd*.85)+vec3(sin(uT*1.3+r.x*9.)*.12,0.,cos(uT*1.1+r.y*7.)*.12);
   vA=zEnv()*step(.05,age)*step(age,.95);vK=smoothstep(.75,1.,age);vR=3.14159;put(p,.24+.1*aSeed.z);}`,S.MATTER_FS(CE.drop,{relief:5,col:WATER,bias:.1}))
  +S.pts(VG[ZG].part,18,VV+ZE+`void main(){float life=2.6+aSeed.y*.9;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rd=.55+1.45*sqrt(r.y);
   vec3 p=D+vec3(cos(an)*rd,.2+r.z*1.5+age*.9,sin(an)*rd*.85)+vec3(sin(uT*.9+r.z*8.)*.18,sin(uT*1.7+r.x*5.)*.05,cos(uT*.8+r.y*6.)*.15);
   vR=r.y*6.2832+uT*(r.z-.5)*1.6;vA=zEnv()*step(.05,age)*step(age,.95);vK=smoothstep(.75,1.,age);put(p,.38+.12*aSeed.z);}`,S.MATTER_FS(CE.leaf,{relief:4,col:PINK}));

  // ---------- 2 · viento: tres cintas helicoidales de pincel turquesa bajo los pies ----------
  const pts=[];for(let i=0;i<=60;i++){const t=i/60,an=t*Math.PI*2*1.4,r=1.25-0.35*t;pts.push(V3(Math.cos(an)*r,t*0.6,Math.sin(an)*r));}
  const helGeo=taperTube(new THREE.CatmullRomCurve3(pts),120,6,0.07,0.03);
  const windMat=S.mat(`void main(){float u=vUv.x;vec4 s=styNoise(vec2(u*2.-uT*2.4,vUv.y*.4));
   float st=smoothstep(.06,0.,abs(s.b-.5))*.7+smoothstep(.45,.8,s.r)*.5;float ends=smoothstep(0.,.15,u)*smoothstep(1.,.8,u);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);float al=(.15+.7*st)*(.45+.55*fr)*ends*uA;if(al<.01)discard;
   gl_FragColor=vec4(styRamp(.5+.4*st)*1.15,al);}`,{},{mode:'energy'});
  const wind=new THREE.Group(); VG[WR].trail.add(wind);
  [0,1,2].forEach(i=>{const m=new THREE.Mesh(helGeo,windMat);m.rotation.y=i*Math.PI*2/3;wind.add(m);});
  const swirl=groundPlane(3.2,D.x,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sw=fract(an/6.2832*3.+r*1.2+uT*1.8);vec4 s=styNoise(vUv+.3);
   float arm=smoothstep(.22,0.,abs(sw-.5))*smoothstep(1.,.35,r)*smoothstep(.1,.3,r)*(.6+.4*s.r);if(arm<.02)discard;
   gl_FragColor=vec4(styRamp(.55+.3*s.g),arm*.55*uA);}`,{},{mode:'energy'})); swirl.position.z=D.z;
  VG[WR].decal.add(swirl); N[WR]=0;

  // ---------- 3 · tornado de marea: embudo de agua en materia (rampa turquesa con bandas de espuma) ----------
  const TW=(spd,amp,mode)=>`void main(){float u=vUv.x,h=vUv.y;if(h>uP*1.15)discard;
   float tw=h*2.6-uT*${spd};vec4 s=styNoise(vec2(u*2.+tw*.25,h*1.2-uT*.6));vec4 s2=styNoise(vec2(u*4.-tw*.4,h*2.)+.37);
   float foam=smoothstep(.06,0.,abs(s.b-.5))*.8+smoothstep(.72,.9,s2.r);float pk=smoothstep(.8,.95,s2.g);
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float l=styLight(normalize(vN),stySunV());
   float edge=smoothstep(0.,.12,h)*smoothstep(1.,.78,h);float crest=smoothstep(.06,0.,abs(h-uP*1.15))*step(uP,.99);
   vec3 c=styRampOf(${WATER},clamp(.18+.42*l+.15*fr,0.,1.))*styTint(l);c=mix(c,${FOAM},clamp(foam*.4+crest*.7,0.,1.));c=mix(c,${PINK},pk*.6);
   float al=${mode==='matter'?`(.55+.3*foam+.15*fr)`:`(.12+.35*foam)`}*edge*${amp}+crest*.6;if(al<.02)discard;
   gl_FragColor=vec4(c${mode==='matter'?'':'*1.2'},min(al,1.)*uA);}`;
  const vortex=new THREE.Group(); vortex.position.copy(C); VG[WV].mesh.add(vortex);
  const funnel=new THREE.Mesh(new THREE.CylinderGeometry(1.55,0.3,3.6,56,18,true),S.mat(TW("3.","1.","matter"),{},{mode:'matter',side:THREE.DoubleSide}));
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.12,3.4,40,14,true),S.mat(TW("5.5",".8","energy"),{},{mode:'energy',side:THREE.DoubleSide}));
  funnel.position.y=1.8; inner.position.y=1.7; vortex.add(funnel,inner);
  const VC=`const float TV0=${f(TV0)};const float TV1=${f(TV1)};const vec3 C=${v3(C)};float grow(){return smoothstep(TV0,TV0+.3,uT);}`;
  N[WV]=S.pts(VG[WV].part,50,VV+VC+`void main(){float life=.85+aSeed.y*.3;float k=uT/life+aSeed.x;float age=fract(k);float sp=uT-age*life;vec3 r=rr(floor(k));
   float y=age*3.4;float rad=mix(.3,1.6,age)*(.8+.35*r.y);float an=r.x*6.2832+age*7.+uT*2.;
   vec3 p=C+vec3(cos(an)*rad,y,sin(an)*rad);vR=an+r.z*3.;vK=smoothstep(.7,1.,age);
   vA=(sp>=TV0&&sp<=TV1-.1)?step(y,grow()*3.7):0.;put(p,.36+.12*r.z);}`,S.MATTER_FS(CE.leaf,{relief:4,col:PINK}))
  +S.pts(VG[WV].part,80,VV+VC+`void main(){float life=.6+aSeed.y*.35;float k=uT/life+aSeed.x;float age=fract(k);float sp=uT-age*life;vec3 r=rr(floor(k));
   float y=.1+age*3.6;float rad=mix(.25,1.6,age)+r.y*.25+smoothstep(.8,1.,age)*.6;float an=r.x*6.2832+age*9.+uT*3.;
   vec3 p=C+vec3(cos(an)*rad,y,sin(an)*rad);vR=an;vK=smoothstep(.6,1.,age);
   vA=(sp>=TV0&&sp<=TV1-.05)?step(y,grow()*3.8):0.;put(p,.14+.08*r.z);}`,S.MATTER_FS(CE.drop,{relief:5,col:WATER,bias:.08}));
  const base=groundPlane(3.6,C.x,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*4.+r*3.;
   vec4 s=styNoise(vec2(an*.3,r*.8));float st=smoothstep(.05,0.,abs(s.b-.5));
   float m=(st*.7+smoothstep(.08,0.,abs(r-.35))*.5)*smoothstep(1.,.5,r)*smoothstep(0.,.2,r);if(m<.02)discard;
   gl_FragColor=vec4(mix(styRampOf(${WATERD},.4),${FOAM},st*.6),m*.85*uA);}`));
  VG[WV].decal.add(base);

  // ---------- 4 · arcos de succión: trazos quebrados rosa/violeta hacia el núcleo, con cuentas de plasma ----------
  const uE0={value:EB[0].clone()},uE1={value:EB[1].clone()},uAr={value:0};
  const ARC=`uniform vec3 uE0;uniform vec3 uE1;uniform float uAr;
  vec3 arcJ(float i,float e,float s,float fr){return vec3(hash(vec3(i*1.7+3.,s*5.1+e*13.,fr*.37+.5)),hash(vec3(fr*.53+1.,i*2.3+1.,s*7.7+e*3.)),hash(vec3(s*3.3+e*9.,fr*.71+2.,i*3.1+.7)))*2.-1.;}
  vec3 arcP(float e,float s,float t,float fr){vec3 A=(e<.5?uE0:uE1)+vec3(0.,1.05,0.);vec3 B=${v3(CORE)};
   float i0=floor(t*16.+.001);float k=clamp(t*16.-i0,0.,1.);
   vec3 j=mix(arcJ(i0,e,s,fr)*sin(3.14159*i0/16.),arcJ(i0+1.,e,s,fr)*sin(3.14159*(i0+1.)/16.),k);
   return mix(A,B,t)+vec3(0.,.35*sin(3.14159*t),0.)+j*.3;}
  float arcOn(float e,float s,float fr){return step(.28,hash(vec3(fr*.91+5.,s*2.9+.3,e*4.7+1.)));}
  vec3 arcCol(float e,float s,float fr){return hash(vec3(fr*.61+.2,s*1.9+e*2.,3.3))>.5?${VIOLET}:${PINK};}`;
  {const vp=[],kk=[];
    for(let e=0;e<2;e++)for(let s=0;s<3;s++)for(let i=0;i<16;i++){vp.push(0,0,0,0,0,0);kk.push(e,s,i/16,e,s,(i+1)/16);}
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(vp,3)); g.setAttribute("aK",new THREE.Float32BufferAttribute(kk,3));
    const lines=new THREE.LineSegments(g,new THREE.ShaderMaterial({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uE0,uE1,uAr},
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:HEAD+ARC+`attribute vec3 aK;varying float vA;varying vec3 vCol;
      void main(){float fr=floor(uT/.05);vec3 p=arcP(aK.x,aK.y,aK.z,fr);vCol=arcCol(aK.x,aK.y,fr);
       vA=uAr*arcOn(aK.x,aK.y,fr);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:HEAD+`varying float vA;varying vec3 vCol;void main(){gl_FragColor=vec4(vCol*1.7,vA);}`}));
    lines.frustumCulled=false; VG[SA].trail.add(lines);}
  N[SA]=S.pts(VG[SA].part,120,VV+ARC+`varying vec3 vCol;void main(){float e=step(.5,aSeed.z);float s=floor(aSeed.y*2.999);float fr=floor(uT/.05);
   vec3 p=arcP(e,s,aSeed.x,fr);vCol=arcCol(e,s,fr);vK=.2;vR=aSeed.w*6.28;
   vA=uAr*arcOn(e,s,fr)*(.5+.5*aSeed.w);put(p,.16+.16*aSeed.w);}`,
   S.PV+`varying vec3 vCol;void main(){vec2 uv=styPC();vec4 sh=styShape(5.,uv);float m=sh.r;if(m<.03)discard;float a=m*vA;if(a<.01)discard;
    gl_FragColor=vec4(vCol*(1.1+.8*sh.g),a);}`,{mode:'energy',uniforms:{uE0,uE1,uAr}});

  // ---------- 5 · relámpago astral descendente: núcleo cian-violeta (no blanco puro) y halo violeta ----------
  const R=(s)=>(Math.random()-0.5)*s, main=[];
  for(let i=0;i<=16;i++){const t=i/16,w=Math.sin(Math.PI*Math.min(t*1.1,1))*0.75;main.push(V3(C.x+(i&&i<16?R(w):0),10*(1-t)+(i&&i<16?R(0.25):0),C.z+(i&&i<16?R(w):0)));}
  const br=(i0,len,dir)=>{const P=[main[i0].clone()];for(let k=1;k<=5;k++){const q=P[k-1].clone();q.x+=dir*len/5*(0.6+Math.random()*0.6);q.y-=len/5*(0.8+Math.random()*0.5);q.z+=R(0.5);P.push(q);}
    return {pts:P,t0:i0/16,t1:i0/16+0.32,r:0.06};};
  const LN=[{pts:main,t0:0,t1:1,r:0.13},br(5,2.6,1),br(9,2.0,-1),br(12,1.3,1)];
  const boltFS=(core)=>`void main(){float t=vUv.y;if(t>uP)discard;float fr=abs(dot(normalize(vN),normalize(vV)));
   float fl=.75+.25*styNoise(vec2(t*6.,uT*9.)).r;
   ${core?`gl_FragColor=vec4(mix(${TEALG},vec3(.85,.95,1.),.35)*1.2,pow(fr,.6)*fl*uA);`:`gl_FragColor=vec4(mix(${VIOLET},${TEALG},.4)*1.4,pow(fr,2.)*.35*fl*uA);`}}`;
  const boltCore=new THREE.Mesh(jagGeo(LN,6),S.mat(boltFS(true),{},{mode:'energy',depthTest:false}));
  const boltGlow=new THREE.Mesh(jagGeo(LN.map(l=>Object.assign({},l,{r:l.r*2.6})),8),S.mat(boltFS(false),{},{mode:'energy'}));
  VG[SL].trail.add(boltCore,boltGlow);
  const strike=S.hitSpark(VG[SL].mesh,3.6,{seed:0.83,life:0.26,toCam:0.8});
  N[SL]=S.pts(VG[SL].part,70,VV+`const float TI=${f(TI)};const vec3 C=${v3(C)};
  void main(){float s=TI+aSeed.x*.05;float life=.4+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.9,0.));vec3 p=C+vec3(0.,.15,0.)+d*(2.5+4.*aSeed.z)*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?(1.-age):0.;vK=age;vR=atan(d.x,d.y);put(p,.18+.1*aSeed.w);}`,S.ENERGY_FS(CE.spark,{gain:1.3}),{mode:'energy'});
  const scorchL=groundPlane(2.6,C.x,0.032,S.mat(CRACK_FS,{uK:{value:1}}));
  VG[SL].decal.add(scorchL);

  // ---------- 6 · detonación de marea en cruz: corona de agua, espuma y gotas en materia, anillos, charco, grietas ----------
  const TC=`const float TI=${f(TI)};const vec3 C=${v3(C)};
  vec3 armDir(float j){return j<1.?vec3(1.,0.,0.):j<2.?vec3(-1.,0.,0.):j<3.?vec3(0.,0.,1.):vec3(0.,0.,-1.);}`;
  N[TS]=S.pts(VG[TS].part,44,VV+TC+`void main(){vec3 dir=armDir(floor(aSeed.x*4.));vec3 side=vec3(dir.z,0.,dir.x);
   float s=TI+aSeed.w*.08;float t=max(uT-s,0.);float life=.65+aSeed.y*.35;float age=(uT-s)/life;
   float d=(.2+2.*aSeed.z)*(1.-exp(-t*5.));float up=(1.5+2.6*aSeed.y)*t-4.5*t*t;
   vec3 p=C+dir*d+side*(aSeed.y-.5)*.55+vec3(0.,max(up,0.)+.1,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28;put(p,(.6+.35*aSeed.w)*(.6+.6*age));}`,S.MATTER_FS(CE.puff,{relief:4,col:WATER,bias:.12}))
  +S.pts(VG[TS].part,90,VV+TC+`void main(){vec3 dir=armDir(floor(aSeed.x*4.));vec3 side=vec3(dir.z,0.,dir.x);
   float s=TI+aSeed.w*.05;float t=max(uT-s,0.);float life=.5+aSeed.y*.4;float age=(uT-s)/life;
   float d=(.3+2.4*aSeed.z)*(1.-exp(-t*6.));float vy=(2.+4.*aSeed.y);float up=vy*t-7.*t*t;
   vec3 p=C+dir*d+side*(aSeed.w-.5)*.35+vec3(0.,max(up,0.)+.05,0.);
   vA=(age>0.&&age<1.&&up>-.05)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(dir.x*.3,vy-14.*t);put(p,(.16+.08*aSeed.y));}`,S.MATTER_FS(CE.drop,{relief:5,col:WATER,bias:.06}))
  +S.pts(VG[TS].part,40,VV+TC+`void main(){vec3 dir=armDir(floor(aSeed.x*4.));float s=TI+.2+aSeed.y*.8;float t=max(uT-s,0.);float life=.5+aSeed.z*.4;float age=(uT-s)/life;
   vec3 p=C+dir*(aSeed.z*2.2)+vec3(dir.z,0.,dir.x)*(aSeed.w-.5)*.8+vec3(0.,.05+t*.45,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;vK=.3;vR=aSeed.w*6.28;put(p,.16+.12*aSeed.w);}`,S.ENERGY_FS(CE.spark,{gain:1.2}),{mode:'energy'});
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(1,0.7,1,48,6,true),S.mat(`void main(){float u=vUv.x,h=vUv.y;
   vec4 s=styNoise(vec2(u*3.,.2));float sp=.55+.45*s.r;if(h>sp*(1.-.25*uP))discard;
   vec4 s2=styNoise(vec2(u*4.,h*1.5-uT*.6)+.4);if(s2.r<uP*1.1-.15)discard;
   vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());float tip=smoothstep(sp-.25,sp,h);
   vec3 c=styRampOf(${WATER},clamp(.3+.45*l+.25*tip,0.,1.))*styTint(l);c=mix(c,${FOAM},tip*.6+smoothstep(.06,0.,abs(s2.b-.5))*.4);
   gl_FragColor=vec4(c,(.75+.2*tip)*(1.-uP*.5)*uA);}`,{},{mode:'matter',side:THREE.DoubleSide}));
  VG[TS].mesh.add(crown);
  const rings=groundPlane(6,C.x,0.035,S.mat(`void main(){vec2 p=(vUv-.5)*6.;float m=0.;
   for(int i=0;i<9;i++){float fi=float(i);float j=mod(fi-1.,4.);float dd=fi<.5?0.:(fi<4.5?1.:2.);
    vec2 dir=j<.5?vec2(1.,0.):j<1.5?vec2(-1.,0.):j<2.5?vec2(0.,1.):vec2(0.,-1.);
    vec2 c=dir*dd;float t=uP-dd*.09;float r=length(p-c);float R=t*(dd<.5?2.6:1.5);
    float k=step(0.,t)*max(0.,1.-t/.6);m+=(smoothstep(.07+.06*t,0.,abs(r-R))+smoothstep(.04,0.,abs(r-R*.6))*.5)*k;}
   vec4 s=styNoise(p*.25+.3);m*=.6+.4*s.r;if(m<.02)discard;
   gl_FragColor=vec4(mix(styRamp(.6),${FOAM},.35)*1.15,min(m,1.2)*uA);}`,{},{mode:'energy'}));
  const puddle=groundPlane(6,C.x,0.03,S.mat(`vec2 h2(vec2 c){return vec2(hash(vec3(c,1.7)),hash(vec3(c.yx,4.3)));}
  void main(){vec2 p=(vUv-.5)*6.;float wob=(styNoise(p*.3).r-.5)*.25;vec2 q=abs(p);
   float sd=min(min(max(q.x-2.4*uP,q.y-.48),max(q.x-.48,q.y-2.4*uP)),length(p)-.95*uP)+wob;
   float inside=smoothstep(.05,-.05,sd);
   vec2 g=p*3.;vec2 id=floor(g),fp=fract(g);float m1=8.,m2=8.;
   for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 r=o+h2(id+o)-fp;float d=dot(r,r);
    if(d<m1){m2=m1;m1=d;}else if(d<m2){m2=d;}}
   float line=smoothstep(.09,0.,sqrt(m2)-sqrt(m1));float rim=smoothstep(.12,0.,abs(sd));float al=inside*(.45+line*.3)+rim*.5;if(al<.02)discard;
   vec3 c=mix(styRampOf(${WATERD},.45),${FOAM},line*.5+rim*.5);gl_FragColor=vec4(c,al*uA);}`));
  const frac=groundPlane(5.6,C.x,0.025,S.mat(CRACK_FS,{uK:{value:0}}));
  VG[TS].decal.add(rings,puddle,frac);

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const id of IDS)for(const l of VFX.LK)VG[id][l].visible=v==="full"||v===id;
    a.count=IDS.reduce((s,id)=>s+(v==="full"||v===id?N[id]:0),0);};

  const dir=EB.map(e=>e.clone().sub(C).normalize()), cyan=new THREE.Color(0x1aa3c4), vio=new THREE.Color(0x8a7dff), sp=V3(C.x,0.9,C.z);
  const lf=te=>{const x=te-TI;if(x<0||x>0.25)return 0;return x<0.06?1:x<0.1?0.35:x<0.14?1:Math.exp(-(x-0.14)*18);};
  a.pose=function(te,o){
    const v=a.v,on=id=>v==="full"||v===id, ia=te-TI, h=lev(te);
    caster.position.set(-3.7,h,0); allies[0].position.set(-3.7,h,-1.0);
    caster.rotation.z=0.05*Math.sin(te*2.1)*ss(0,0.5,te)-0.12*ss(TL-0.3,TL,te)*(1-ss(TI,TI+0.5,te));
    allies[0].rotation.z=0.05*Math.sin(te*2.1+1.3)*ss(0,0.5,te);
    const zenv=ss(0,0.45,te)*(1-ss(2.5,3.1,te));
    if(on(ZG)||on(WR))for(const d of [caster,allies[0]]){d.userData.m.emissive.copy(cyan);d.userData.m.emissiveIntensity=0.15*zenv;}
    // 2 viento
    wind.position.set(D.x,0.02,D.z); wind.rotation.y=-te*10; wind.scale.set(1,Math.max(h+0.25,0.05)/0.6,1);
    windMat.uniforms.uA.value=ss(0,0.35,te)*(1-ss(2.55,3.05,te)); swirl.material.uniforms.uA.value=windMat.uniforms.uA.value;
    // 3 tornado
    const vg=ss(TV0,TV0+0.3,te), venv=ss(TV0,TV0+0.15,te)*(1-ss(TV1,TV1+0.15,te)), col=ss(TV1,TV1+0.15,te);
    vortex.visible=te>=TV0&&te<TV1+0.16; vortex.rotation.y=te*6; vortex.scale.set(1+0.7*col,1-0.3*col,1+0.7*col);
    set(funnel,vg,venv); set(inner,vg,venv); base.material.uniforms.uA.value=venv;
    // 4 arcos y arrastre de los rivales en cruz
    uAr.value=ss(TA0,TA0+0.1,te)*(1-ss(TI-0.05,TI+0.02,te));
    const pull=0.38*ss(TA0,TI-0.05,te)*(1-ss(TI,TI+0.06,te)), kb=ia>=0?0.55*(1-Math.exp(-ia*12))*(1-ss(2.3,3.0,te)):0;
    const fr=Math.floor(te/0.05), flick=0.5+0.5*Math.sin(fr*12.9898);
    enemies.forEach((e,i)=>{e.position.copy(EB[i]).addScaledVector(dir[i],kb-pull);
      e.rotation.z=0.07*Math.sin(te*31+i*2)*uAr.value-(ia>=0?0.3*Math.exp(-ia*5)*Math.cos(ia*14)*(i?1:-1):0);
      if(on(SA)){e.userData.m.emissive.copy(i?cyan:vio);e.userData.m.emissiveIntensity=0.45*uAr.value*flick;}});
    uE0.value.copy(enemies[0].position); uE1.value.copy(enemies[1].position);
    // objetivo central: elevado por el tornado, aplastado por el relámpago
    const lift=0.25*ss(TV0+0.1,TV0+0.5,te)+0.06*Math.sin(te*9)*venv, hit=ia>=0?Math.exp(-ia*4):0;
    target.position.y=te<TI?lift:lift*(1-ss(TI,TI+0.05,te)); target.rotation.z=te<TI?0.12*Math.sin(te*7)*venv:-hit*0.35*Math.cos(ia*14);
    // 5 relámpago
    const lv=lf(te), lead=te>=TL&&te<TI;
    boltCore.visible=boltGlow.visible=te>=TL&&ia<0.25;
    set(boltCore,lead?cl((te-TL)/(TI-TL)):1,lead?0.55:lv); set(boltGlow,lead?cl((te-TL)/(TI-TL)):1,lead?0.35:lv);
    strike.pose(ia,sp,1.1);
    set(scorchL,1-Math.pow(1-cl(ia/0.25),2),ia>=0?1-ss(TI+0.8,TI+1.3,te):0); scorchL.material.uniforms.uK.value=ia>=0?Math.exp(-ia*3):0;
    // 6 detonación en cruz
    let p=cl(ia/0.6); crown.visible=ia>=0&&p<1; crown.position.set(C.x,0.5+0.35*p,C.z);
    crown.scale.set(0.6+1.6*(1-Math.pow(1-p,3)),0.6+1.0*p,0.6+1.6*(1-Math.pow(1-p,3))); set(crown,p,1);
    set(rings,Math.max(ia,0),ia>=0?1-ss(TI+0.5,TI+0.85,te):0);
    set(puddle,ss(TI,TI+0.35,te),ia>=0?ss(TI,TI+0.1,te)*(1-ss(2.75,3.18,te)):0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(2.6,3.15,te):0); frac.material.uniforms.uK.value=ia>=0?Math.exp(-ia*2):0;
    // resplandor y luz (más bajos que el original)
    const cand=[];
    if(on(ZG)||on(WR))cand.push([-3.7,1.0+h,-0.5,2.2,0.15*zenv,1.6*zenv,14]);
    if(on(WV))cand.push([C.x,1.6,C.z,3.2,0.16*venv,2.5*venv,14]);
    if(on(SA))cand.push([C.x,1.2,C.z,2.4,0.18*uAr.value*flick,(2+2*flick)*uAr.value,14]);
    if(on(SL))cand.push([C.x,lead?10-8*cl((te-TL)/(TI-TL)):2.5,C.z,lead?1.2:2.6,lead?0.15:0.22*lv,lead?3:12*lv,24]);
    if(on(TS)&&ia>=0)cand.push([C.x,0.6,C.z,2+4*Math.min(ia,0.6),Math.exp(-ia*9)*0.4,6*Math.exp(-ia*4),16]);
    let best=null;for(const c of cand)if(!best||c[5]>best[5])best=c;
    if(best){o.g.set(best[0],best[1],best[2]);o.gs=best[3];o.ga=best[4];o.li=best[5];o.ld=best[6];}else{o.g.copy(C);o.gs=0.001;o.ga=0;o.li=0;}
    const imp=on(SL)||on(TS);
    o.ia=imp?ia:-1; o.c.set(C.x,0.8,C.z); o.shake=imp?1.8:0; o.dist=imp?1.1:0; o.dark=0;
    if(on(SL)){const x=ia;o.white=x<0||x>0.2?0:(x<0.03?0.2:0.14*Math.exp(-(x-0.03)*22)+(x>0.12&&x<0.16?0.07:0));}
    if(on(WV)||on(SA)){o.em=0.3*venv*(on(SA)?0.6+0.4*flick:1);o.emc.copy(cyan);}
  };
}};
VFX.module("Estilizado · Sapidae · Dúo · Maelstrom",[mael]);
})();

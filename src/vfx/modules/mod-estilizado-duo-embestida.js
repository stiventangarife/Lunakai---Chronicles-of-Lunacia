// =====================================================================
// ESTILIZADO · DÚO · EMBESTIDA DESTRUCTIVA (Hito 104: «Ola de arcilla») — Ultimate de dúo Sapidae + su Axie (allies[0]).
// Clave: sty_duo_embestida. Mismos dur / ti / fases y la misma coreografía que mod-duo-embestida.js: los dos cargan en
// paralelo (z = 0 y z = −1), se paran una casilla delante del rival y este sale despedido (la carta empuja 3 casillas
// con daño de colisión).
// Tema arcilla espiritual (como el Alfarero de Gólems): terracota con vetas de oro que brillan.
// Piezas: oleaje (la arcilla se hincha bajo el dúo con un glifo de oro) · ola de arcilla (cresta que rueda por el suelo
// con el dúo encima) · surco (barro mojado con vetas de oro, revelado a lo largo del pasillo) · salpicaduras de barro ·
// rompiente (la ola se rompe sobre el rival: losas de arcilla, barro, chispas de las vetas) · choque (surcos del
// empujón, grieta de colisión con oro y onda de polvo).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies}=VFX;
const {v3,variantGroups}=VFX.lib;
const S=VFX.sty, CE=S.CELL;
const PAL="Sty Dúo · Ola de arcilla"; VFX.palette(PAL,["#ffcb62","#9a4424"]);
const lin=h=>{const c=new THREE.Color(h);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const CLAY=lin(0xa4552f), CLAYL=lin(0xd9926a), CLAYD=lin(0x4a2012), MUD=lin(0x6e3f26), DUST=lin(0xa98466), GOLD=lin(0xffc45a);
const VV=`varying float vR;varying float vK;`;

// tiempos y carrera (idénticos al original)
const TR=0.6,TI=1.4,X0=-3.85,XE=2.6,XS=2.4,PW=1.8,LZ=-1.0,TP=V3(3.4,0,0);
const runX=t=>t<TR?-3.7-0.15*ss(0.15,TR,t):(t<TI?X0+(XE-X0)*Math.pow((t-TR)/(TI-TR),PW):XE-(XE-XS)*ss(TI,TI+0.35,t));
const bobY=t=>{const k=(t-TR)/(TI-TR);return k>0&&k<1?0.05*Math.abs(Math.sin((t-TR)*13)):0;};
const leanR=t=>0.12*ss(0,TR,t)-0.42*ss(TR,TR+0.15,t)+0.3*ss(TI,TI+0.3,t);
// altura de la ola (0..1): se hincha en la ignición, rompe en el impacto
const waveK=t=>ss(0.08,TR-0.05,t)*(1-ss(TI-0.04,TI+0.32,t));
const LIFT=0.72, HW=1.5;                                  // altura de la cresta donde van de pie
const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float X0=${f(X0)};const float XE=${f(XE)};const float XS=${f(XS)};
float runX(float t){if(t<TR)return -3.7-.15*smoothstep(.15,TR,t);
 if(t<TI)return X0+(XE-X0)*pow((t-TR)/(TI-TR),${f(PW)});return XE-(XE-XS)*smoothstep(TI,TI+.35,t);}
float waveK(float t){return smoothstep(.08,TR-.05,t)*(1.-smoothstep(TI-.04,TI+.32,t));}`;

const IDS=["vfx_dest_clay_swell","vfx_dest_clay_wave","vfx_dest_clay_furrow","vfx_dest_mud_spray","vfx_dest_clay_break","vfx_dest_collision_crack"];
const [P_SWELL,P_WAVE,P_FUR,P_SPRAY,P_BREAK,P_CRACK]=IDS;

// ---------- shaders compartidos ----------
// arcilla espiritual (materia sólida, luz en 3 bandas): terracota + vetas de oro (uV) + erosión para desmoronarse (uEr)
const CLAY_FS=`uniform float uV;uniform float uEr;uniform float uRoll;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float l=styLight(n,stySunV());
 vec2 tc=vUv*vec2(2.6,1.4)+vec2(-uRoll,0.)+vP.xz*.07;
 float g=styNoise(tc).g;float vein=smoothstep(.3,.2,g)*smoothstep(.02,.1,g);
 float er=styErode(styNoise(tc*1.6+.37).r*.8+.2,uEr,.05);if(er<.5)discard;
 vec4 s=styNoise(tc*.7+.11);
 vec3 c=styRampOf(${CLAY},clamp(.2+.55*l+(s.r-.5)*.16,0.,1.))*styTint(l);
 c=mix(c,styRampOf(${CLAYD},.3+.3*l),smoothstep(.55,.8,s.b)*.5);
 c=mix(c,styRampOf(${CLAYD},.15+.25*l),uRoll>0.?smoothstep(.86,.97,vUv.x)*.7:0.);
 c+=${GOLD}*vein*uV*1.7;
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.16*smoothstep(.62,.72,fr)*step(.5,l);
 gl_FragColor=vec4(c,1.);}`;
const clayMat=(o={})=>S.mat(CLAY_FS,{uV:{value:0.6},uEr:{value:-0.2},uRoll:{value:0}},
  Object.assign({mode:'solid'},o.double?{side:THREE.DoubleSide}:{}));
const CHUNK_FS=S.MATTER_FS(CE.shard,{relief:3.2,col:CLAY,bias:.02});
const MUD_FS=S.MATTER_FS(CE.drop,{relief:4,col:MUD,bias:.05});
const DUST_FS=S.MATTER_FS(CE.puff,{relief:4,col:DUST,bias:-.04});
const MOTE_FS=S.ENERGY_FS(CE.spark,{gain:1.3});

// ---------- perfil de la ola: lomo trasero → cresta → labio que se enrosca hacia delante ----------
function waveGeo(){
  const prof=new THREE.CatmullRomCurve3([V3(-2.3,-0.02,0),V3(-1.5,0.12,0),V3(-0.7,0.5,0),V3(-0.15,LIFT-0.04,0),V3(0.3,LIFT+0.06,0),
    V3(0.7,LIFT+0.02,0),V3(0.98,0.6,0),V3(1.05,0.38,0),V3(0.88,0.22,0),V3(0.7,0.26,0)]);
  const NU=72,NV=26,Z0=0.85,Z1=LZ-0.85,pos=[],uv=[],idx=[];
  for(let j=0;j<=NV;j++){const v=j/NV,z=Z0+(Z1-Z0)*v,edge=Math.pow(Math.abs(v*2-1),3);
    for(let i=0;i<=NU;i++){const u=i/NU,p=prof.getPoint(u);
      const k=(1-edge*0.75)*(1+0.07*Math.sin(v*17+u*5));          // la ola baja por los lados y no es recta
      const lag=0.25*edge+0.06*Math.sin(v*11);                     // los lados van algo por detrás
      pos.push(p.x*(0.85+0.15*(1-edge))-lag,Math.max(p.y*k*HW,-0.02),z);uv.push(u,v);}}
  for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const a=j*(NU+1)+i,b=a+1,c=a+NU+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

const embestida={key:"sty_duo_embestida",name:"Embestida Destructiva (estilizado)",tier:3,dur:3.2,ti:TI,pal:PAL,allies:1,stylized:true,
  variants:[["full","Completo"],[P_SWELL,"Oleaje"],[P_WAVE,"Ola de arcilla"],[P_FUR,"Surco"],[P_SPRAY,"Salpicaduras"],[P_BREAK,"Rompiente"],[P_CRACK,"Choque"]],
  v:"full",vlabel:"Pieza",
  phases:[["Oleaje",0],["Carrera",TR],["Impacto",TI],["Choque",TI+0.2],["Disipación",TI+0.7]],
build(a){
  const VG=variantGroups(a,IDS); for(const id of IDS)VG[id].n=0;
  const MZ=LZ/2;

  // ---------------------------------------------------------------
  // 1 · OLEAJE — la arcilla se hincha bajo el dúo: charco de barro con glifo de oro y terrones que suben
  // ---------------------------------------------------------------
  const GS=VG[P_SWELL];
  const swell=groundPlane(3.4,-3.75,0.022,S.mat(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   vec4 s=styNoise(vUv*1.3+.21);float bed=smoothstep(1.,.55,r+(s.r-.5)*.35)*step(r,uP*1.2);
   float vein=smoothstep(.045,0.,abs(styNoise(vec2(an*.6,r*.9-uT*.15)).b-.5))*smoothstep(.95,.3,r)*step(.18,r);
   float ring=smoothstep(.035,0.,abs(r-.78))*step(.45,fract(an/6.2832*14.+uT*.4))+smoothstep(.025,0.,abs(r-.9));
   float g=(vein+ring*.8)*step(r,uP*1.1);if(bed*.7+g<.03)discard;
   vec3 c=mix(styRampOf(${MUD},.25+.35*s.g),${GOLD}*1.5,min(g,1.));
   gl_FragColor=vec4(c,min(bed*.8+g,1.)*uA);}`)); swell.position.z=MZ; GS.decal.add(swell);
  GS.n+=S.pts(GS.part,34,VV+`const vec3 O=vec3(-3.75,0.,${f(MZ)});
  void main(){float s=.05+aSeed.x*.45;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832+k*2.5;float rad=.6+.9*aSeed.w;
   vec3 p=O+vec3(cos(an)*rad,.05+k*(.7+.8*aSeed.y)-k*k*.5,sin(an)*rad*.8);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+k*6.;put(p,.16+.12*aSeed.w);}`,CHUNK_FS);
  GS.n+=S.pts(GS.part,22,VV+`const vec3 O=vec3(-3.75,0.,${f(MZ)});
  void main(){float s=.1+aSeed.x*.5;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.z*6.2832;float rad=.4+1.1*aSeed.w;vec3 p=O+vec3(cos(an)*rad,.05+k*(1.+.6*aSeed.y),sin(an)*rad*.8);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;vK=k*.5;vR=0.;put(p,.1+.06*aSeed.y);}`,MOTE_FS,{mode:'energy'});

  // ---------------------------------------------------------------
  // 2 · OLA DE ARCILLA — cresta que rueda (textura que corre hacia atrás) con el dúo de pie encima; vetas de oro vivas
  // ---------------------------------------------------------------
  const GW=VG[P_WAVE];
  const waveM=clayMat({double:true}); const wave=new THREE.Mesh(waveGeo(),waveM); GW.mesh.add(wave);
  // vetas de oro aditivas que corren por la cresta (energía, misma malla un pelo por fuera)
  const veinM=S.mat(`uniform float uRoll;void main(){vec2 tc=vUv*vec2(2.6,1.4)+vec2(-uRoll,0.)+vP.xz*.07;
   float g=styNoise(tc).g;float vein=smoothstep(.27,.21,g)*smoothstep(.03,.09,g);
   float lip=smoothstep(.6,.85,vUv.x)*(1.-smoothstep(.93,1.,vUv.x));
   float m=vein*(.45+.55*lip);if(m<.03)discard;gl_FragColor=vec4(${GOLD}*1.35,m*uA);}`,{uRoll:{value:0}},{mode:'energy',side:THREE.DoubleSide});
  const veins=new THREE.Mesh(wave.geometry,veinM); veins.scale.setScalar(1.012); wave.add(veins);
  // sombra de contacto de la ola
  const waveSh=groundPlane(4.2,0,0.018,S.mat(`void main(){vec2 p=(vUv-.5)*vec2(2.,2.);float m=smoothstep(1.,.2,length(p*vec2(1.,1.25)));
   gl_FragColor=vec4(styRampOf(${CLAYD},.08),m*.45*uA);}`)); GW.decal.add(waveSh);
  // barro que chorrea del labio y polvo que levanta el lomo
  GW.n+=S.pts(GW.part,46,VV+C+`void main(){float life=.32+aSeed.y*.2;float k=(uT-TR+.15)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float s=TR-.15+(c-aSeed.x)*life;float x=runX(s);float wk=waveK(s);
   vec3 o=vec3(x+.85,${f(0.55*1.5)}*wk,${f(0.6)}+r.x*${f(LZ-1.2)});vec3 p=o+vec3(.6*age,-.9*age*age,0.);
   vA=(k>=1.&&wk>.3&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=1.57;put(p,(.14+.08*r.y));}`,MUD_FS);

  // ---------------------------------------------------------------
  // 3 · SURCO — tira de barro mojado a lo largo de todo el pasillo, revelada por el frente (uX); bordes de terrón y
  //     vetas de oro alargadas que se apagan al secarse
  // ---------------------------------------------------------------
  const GF=VG[P_FUR];
  const FX0=-4.6,FX1=3.0,FXC=(FX0+FX1)/2,FL=FX1-FX0,FW=2.9;
  const furrow=groundPlane(FL,FXC,0.02,S.mat(`uniform float uX;uniform float uDry;
  void main(){float x=vP.x+(${f(FXC)});float z=vP.z+(${f(MZ)});float w=abs(vP.z)/${f(FW/2)};
   if(x>uX)discard;vec4 s=styNoise(vec2(x*.45,z*.9)+.3);vec4 s2=styNoise(vec2(x*.12,z*.35)+.7);
   float edge=w+(s.r-.5)*.22;if(edge>1.)discard;
   float age=clamp((uX-x)/5.,0.,1.);
   float ridge=smoothstep(.62,.8,edge)*(1.-smoothstep(.9,1.,edge));
   float slick=1.-smoothstep(.0,.65,edge);
   float vein=smoothstep(.05,0.,abs(s2.b-.5))*slick*(1.-uDry)*(1.-.6*age);
   vec3 c=styRampOf(${MUD},.18+.3*s.g+.25*ridge);c=mix(c,styRampOf(${CLAY},.45+.3*s.g),ridge*.8);
   float sheen=pow(s.g,3.)*slick*.35*(1.-uDry);c+=uSunCol*sheen*.25;
   c=mix(c,${GOLD}*1.6,vein);
   float front=smoothstep(.6,0.,uX-x);
   float al=(slick*.75+ridge)*(.85+.15*s.r);al=max(al,front*.4*(1.-edge));
   gl_FragColor=vec4(c,clamp(al,0.,1.)*uA);}`,{uX:{value:-9},uDry:{value:0}}),FW);
  furrow.position.z=MZ; GF.decal.add(furrow);

  // ---------------------------------------------------------------
  // 4 · SALPICADURAS — barro y terrones que la ola escupe hacia los lados y hacia atrás al rodar
  // ---------------------------------------------------------------
  const GP=VG[P_SPRAY];
  GP.n+=S.pts(GP.part,70,VV+C+`void main(){float s=TR+aSeed.x*(TI-TR-.05);float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=runX(s);float side=aSeed.z<.5?-1.:1.;float zc=side<0.?${f(LZ-0.8)}:.65;
   vec3 o=vec3(x-.2+.6*aSeed.w,.35,zc);vec3 v=vec3(-1.2-1.2*aSeed.y,2.2+1.6*aSeed.w,side*(1.+1.4*aSeed.y));
   vec3 p=o+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.12+.1*aSeed.w);}`,MUD_FS);
  GP.n+=S.pts(GP.part,36,VV+C+`void main(){float s=TR+aSeed.x*(TI-TR-.05);float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=runX(s);vec3 o=vec3(x-.6,.5,.65+aSeed.z*${f(LZ-1.3)});vec3 v=vec3(-1.5-aSeed.y,2.6+1.4*aSeed.w,(aSeed.z-.5)*2.);
   vec3 p=o+v*t+vec3(0.,-6.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*10.;put(p,.15+.12*aSeed.w);}`,CHUNK_FS);
  GP.n+=S.pts(GP.part,30,VV+C+`void main(){float life=.5+aSeed.y*.3;float s=TR+aSeed.x*(TI-TR);float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=runX(s);vec3 p=vec3(x-.4-1.2*t,.25+t*(.9+.5*aSeed.w),.65+aSeed.z*${f(LZ-1.3)});
   vA=(age>0.&&age<1.)?.85:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.45+.35*aSeed.y)*(.6+age));}`,DUST_FS);

  // ---------------------------------------------------------------
  // 5 · ROMPIENTE — la ola se rompe sobre el rival: losas de arcilla con vetas, explosión de barro, chispas de oro
  // ---------------------------------------------------------------
  const GB=VG[P_BREAK];
  const slabMat=clayMat(), slabs=[], G=9.8;
  const slabGeo=new THREE.DodecahedronGeometry(1,0); slabGeo.scale(1,0.42,0.8);
  for(let i=0;i<16;i++){
    const m=new THREE.Mesh(slabGeo,slabMat), an=(i/16-0.5)*2.3+(Math.random()-0.5)*0.25;
    const h=2.2+Math.random()*2.6, vy=2.6+Math.random()*3.0, s=0.13+Math.random()*0.14, y0=0.5+Math.random()*0.6;
    const tl=(vy+Math.sqrt(vy*vy+2*G*Math.max(y0-s*0.4,0)))/G;
    m.userData={p0:V3(TP.x-0.5+Math.random()*0.3,y0,(Math.random()-0.5)*1.6),v:V3(Math.cos(an)*h,vy,Math.sin(an)*h*0.9),s,tl,
      spin:V3(Math.random()*12-6,Math.random()*12-6,Math.random()*12-6)};
    slabs.push(m); GB.mesh.add(m);
  }
  const BO=V3(TP.x-0.35,0.75,0);
  GB.n+=S.pts(GB.part,80,VV+`const vec3 O=${v3(BO)};
  void main(){float s=${f(TI)}+aSeed.x*.06;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(vec3(.9+aSeed.z,.5+1.3*aSeed.w,(aSeed.y-.5)*3.));vec3 p=O+d*(2.6+3.*aSeed.z)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(d.y,d.x);put(p,.13+.12*aSeed.w);}`,MUD_FS);
  GB.n+=S.pts(GB.part,26,VV+`const vec3 O=${v3(BO)};
  void main(){float s=${f(TI)}+aSeed.x*.1;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(vec3(.2+aSeed.z,.4+.8*aSeed.w,(aSeed.y-.5)*2.4));vec3 p=O+d*(1.-exp(-t*3.))*(1.2+aSeed.z)+vec3(0.,t*.3,0.);
   vA=(age>0.&&age<1.)?.9:0.;vK=smoothstep(.25,1.,age);vR=aSeed.w*6.28;put(p,(.7+.5*aSeed.y)*(.6+age*.8));}`,DUST_FS);
  GB.n+=S.pts(GB.part,44,VV+`const vec3 O=${v3(BO)};
  void main(){float s=${f(TI)}+aSeed.x*.08;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(vec3(.6+aSeed.z,.3+aSeed.w*1.4,(aSeed.y-.5)*2.6));vec3 p=O+d*(3.+3.*aSeed.z)*t*(1.-.4*age)+vec3(0.,-2.*t*t,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=age*.7;vR=0.;put(p,.12+.08*aSeed.w);}`,MOTE_FS,{mode:'energy'});
  const spark=S.hitSpark(GB.mesh,1.8,{seed:0.53,life:0.2});

  // ---------------------------------------------------------------
  // 6 · CHOQUE — surcos del empujón hacia atrás, grieta de colisión con vetas de oro, onda de polvo de arcilla
  // ---------------------------------------------------------------
  const GC=VG[P_CRACK];
  const skid=groundPlane(4.4,TP.x+0.9,0.024,S.mat(`uniform float uK;void main(){vec2 q=(vUv-.5)*4.4;float x=q.x+.9;float z=q.y;
   if(x<-.5||x>uP*2.4)discard;vec4 s=styNoise(vec2(x*.8,z*1.5)+.4);
   float g=max(smoothstep(.09,.0,abs(z-.28+(s.r-.5)*.08)),smoothstep(.09,.0,abs(z+.28+(s.g-.5)*.08)));
   float clod=smoothstep(.2,.12,abs(abs(z)-.28))*(1.-g)*.5;
   float tip=smoothstep(.5,0.,uP*2.4-x);float m=(g+clod)*(1.-.5*smoothstep(1.,2.4,x));if(m<.03)discard;
   vec3 c=mix(styRampOf(${CLAYD},.12+.2*s.g),styRampOf(${CLAY},.5),clod);c=mix(c,${GOLD}*1.4,g*tip*.6*uK);
   gl_FragColor=vec4(c,min(m,1.)*uA);}`,{uK:{value:0}}));
  GC.decal.add(skid);
  const crack=groundPlane(5.6,TP.x,0.026,S.mat(`uniform float uK;void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec4 s=styNoise(vUv*1.1+.37);vec4 s2=styNoise(vUv*2.3+.71);
   float cr=max(smoothstep(.05,.0,abs(s.b-.5)),smoothstep(.035,0.,abs(s2.b-.5))*.8)*smoothstep(1.,.25,r)*step(r+s.r*.2,uP*1.15);
   float bed=smoothstep(.55,.2,r+(s.g-.5)*.2)*.55;
   if(cr<.05&&bed<.03)discard;vec3 c=mix(styRampOf(${MUD},.2+.2*s.g),styRampOf(${CLAYD},.1),cr);
   c=mix(c,${GOLD}*1.9,uK*smoothstep(.5,1.,cr));
   gl_FragColor=vec4(c,max(cr*.95,bed*uP)*uA);}`,{uK:{value:0}})); GC.decal.add(crack);
  const ring=groundPlane(2,TP.x,0.05,S.mat(`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
   if(s.r*er<.02)discard;gl_FragColor=vec4(mix(styRampOf(${CLAY},.6),${GOLD}*1.3,.35*s.g),s.r*er*uA*.9);}`,{},{mode:'energy'})); GC.decal.add(ring);
  GC.n+=S.pts(GC.part,60,VV+`const vec3 TP=${v3(TP)};
  void main(){float s=${f(TI)}+aSeed.x*.35;float pr=(s-${f(TI)})/.4;float R=.3+3.*(1.-(1.-pr)*(1.-pr));
   float an=aSeed.z*6.2832;float t=max(uT-s,0.);float life=.8+aSeed.y*.5;float age=(uT-s)/life;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=TP+d*(R+.5*(1.-exp(-t*2.5))*(.4+aSeed.w))+vec3(0.,.12+(.3+.5*aSeed.y)*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?.85:0.;vK=smoothstep(.25,1.,age);vR=an;put(p,(.5+.4*aSeed.w)*(.6+age*.9));}`,DUST_FS);
  // golpe de la colisión al final del empujón: astillas de arcilla y chispas de veta
  const CO=V3(TP.x+0.75,0.5,0);
  GC.n+=S.pts(GC.part,24,VV+`const vec3 O=${v3(CO)};
  void main(){float s=${f(TI+0.12)}+aSeed.x*.05;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(vec3(.5+aSeed.z,.6+aSeed.w,(aSeed.y-.5)*2.));vec3 p=O+d*(2.+2.*aSeed.z)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.12+.08*aSeed.w);}`,CHUNK_FS);

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const id of IDS)for(const l of VFX.LK)VG[id][l].visible=v==="full"||v===id;
    a.count=IDS.reduce((s,id)=>s+((v==="full"||v===id)?VG[id].n:0),0);};

  const sparkP=V3(TP.x-0.3,0.95,0), GOLDC=new THREE.Color(0xffc45a);
  a.pose=function(te,o){
    const v=a.v, full=v==="full", sh=id=>full||v===id;
    const ia=te-TI, x=runX(te), wk=waveK(te), r=leanR(te);
    // el dúo va de pie sobre la cresta (solo si se ve la ola); al romper bajan al suelo
    const ride=sh(P_WAVE)?LIFT*HW*wk:0, y=bobY(te)*(wk>0.5?1:0)+ride;
    caster.position.set(x,y,0); caster.rotation.z=r;
    const ax=allies[0]; ax.position.set(x,y,LZ); ax.rotation.z=r;
    // 1 oleaje
    const sEnv=ss(0,0.12,te)*(1-ss(TR+0.1,TR+0.5,te));
    set(swell,cl(te/0.45),sEnv);
    // 2 ola
    wave.visible=wk>0.005; wave.position.set(x,0,0);
    wave.scale.set(0.55+0.45*wk,Math.max(wk,0.001),1);
    const roll=te*2.6+Math.max(0,x+3.7)*0.9;
    waveM.uniforms.uRoll.value=roll; veinM.uniforms.uRoll.value=roll;
    waveM.uniforms.uEr.value=-0.2+1.15*ss(TI,TI+0.32,te); waveM.uniforms.uV.value=0.7+0.4*Math.sin(te*9);
    veinM.uniforms.uA.value=wk;
    waveSh.position.set(x+0.2,0.018,MZ); waveSh.material.uniforms.uA.value=wk;
    // 3 surco (revelado por el frente, se seca después del impacto)
    const fx=te<0.1?-9:Math.min(x+0.9,TP.x-0.35);
    furrow.material.uniforms.uX.value=fx; furrow.material.uniforms.uDry.value=ss(TI+0.2,TI+1.4,te);
    furrow.material.uniforms.uA.value=1-ss(2.6,3.15,te);
    // 5 rompiente
    for(const m of slabs){const u=m.userData,t=Math.max(ia,0),tt=Math.min(t,u.tl);
      m.visible=ia>=0&&ia<1.75; m.position.copy(u.p0).addScaledVector(u.v,tt); m.position.y-=0.5*G*tt*tt;
      m.rotation.set(u.spin.x*tt,u.spin.y*tt,u.spin.z*tt); m.scale.setScalar(Math.max(u.s*(1-ss(1.2,1.75,ia)),0.001));}
    slabMat.uniforms.uV.value=ia>=0?0.4+1.2*Math.exp(-ia*2.2):1;
    spark.pose(ia,sparkP,1);
    // el rival sale despedido hacia atrás (empujón) y vuelve
    const hit=ia>=0?Math.exp(-ia*2.6):0;
    target.position.x=TP.x+0.75*hit*(1-Math.exp(-Math.max(ia,0)*18)); target.position.y=ia>=0?0.3*Math.sin(Math.PI*cl(ia/0.4)):0;
    target.rotation.z=-0.5*hit*Math.cos(ia*10);
    // 6 choque
    const kp=1-Math.pow(1-cl(ia/0.3),2), cEnv=ia>=0?1-ss(TI+1.2,3.15,te):0;
    set(skid,kp,cEnv); skid.material.uniforms.uK.value=ia>=0?Math.exp(-ia*2):0;
    const cp=1-Math.pow(1-cl((ia-0.05)/0.35),2);
    set(crack,cp,ia>=0.05?cEnv:0); crack.material.uniforms.uK.value=ia>=0?0.3+0.7*Math.exp(-ia*1.8):0;
    const p=cl(ia/0.55); ring.visible=ia>=0&&p<1; ring.scale.setScalar((0.3+3.6*(1-Math.pow(1-p,2)))*1.25); set(ring,0.05+0.9*p,ia>=0?1:0);
    // brillo del dúo (vetas que les suben por el cuerpo)
    const gE=sh(P_WAVE)?0.22*wk:0;
    for(const m of [caster.userData.m,ax.userData.m]){m.emissive.copy(GOLDC);m.emissiveIntensity=gE;}
    // resplandor y luz
    o.ga=0; o.li=0; o.gs=2;
    if(te<TI){
      o.g.set(x+0.6,0.8,MZ);
      if(sh(P_SWELL)){o.ga+=0.1*sEnv;o.li+=1.5*sEnv;}
      if(sh(P_WAVE)){o.ga+=0.08*wk;o.li+=1.6*wk;o.gs=2.4;}
    }else{
      o.g.set(TP.x,0.8,0);
      if(sh(P_BREAK)){o.gs=2.4+3*Math.min(ia,0.6);o.ga+=Math.exp(-ia*7)*0.4;o.li+=7*Math.exp(-ia*3.5);}
      if(sh(P_CRACK)){o.gs=Math.max(o.gs,2+3*cl(ia/0.45));o.ga+=0.12*Math.exp(-ia*8);o.li+=2.5*Math.exp(-ia*5);}
    }
    o.ld=12;
    const heavy=sh(P_BREAK)||sh(P_CRACK)||sh(P_WAVE);
    o.ia=ia; o.c.set(TP.x,0.7,0); o.shake=heavy?1.7:0; o.dist=heavy?0.9:0.3;
    o.white=(full||v===P_BREAK)&&ia>=0&&ia<0.15?0.18*Math.exp(-ia*24):0;
    o.dark=0;
    o.em=sh(P_BREAK)?0.3*hit:0; o.emc.copy(GOLDC);
  };
}};

VFX.module("Estilizado · Sapidae · Dúo · Embestida",[embestida]);
})();

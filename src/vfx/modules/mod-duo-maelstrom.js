// =====================================================================
// LOTE DÚO · MAELSTROM CELESTE (Elemental / Agua & Viento) — Sapidae + Axie
// El dúo levita en ingravidez sobre corrientes de viento, abre un tornado de marea en el centro del área rival,
// los arcos bioeléctricos arrastran a los rivales en cruz, cae un relámpago astral y la marea detona en cruz.
// Nivel 3: temblor alto, hit-stop, fractura de baldosa en la casilla central. Cada pieza (ID de duo.txt) es una variante.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,PT_FS,fx,fxU,set,groundPlane,points,sparks,caster,target,allies,enemies}=VFX;
const {v3,STAR4_FS,billboard,towardCam,taperTube,variantGroups,tileFractureFS}=VFX.lib;
VFX.palette("Maelstrom Celeste",["#E0F7FA","#00B4D8"]);

// colores fijos de la tabla: rosa aurora y violeta eléctrico
const PINK="vec3(1.,.396,.518)", VIOLET="vec3(.455,.725,1.)", CYAN="vec3(0.,.706,.847)";
const ZG="vfx_mael_zero_gravity",WR="vfx_mael_wind_ribbons",WV="vfx_mael_water_vortex",
  SA="vfx_mael_suction_arcs",SL="vfx_mael_sky_lightning",TS="vfx_mael_tidal_splash",IDS=[ZG,WR,WV,SA,SL,TS];

// gota de agua: cuerpo translúcido, borde refractado y brillo especular
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float body=smoothstep(.42,.34,d);float rim=smoothstep(.07,0.,abs(d-.35));
 float hl=smoothstep(.12,0.,length(q-vec2(-.12,-.13)));
 float a=(body*.3+rim*.85+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,rim*.5+hl)*1.35+vec3(hl*.5),a);}`;
// pluma rosa: vano elíptico con barbas y raquis, girada por vRot
const FEATHER_FS=HEAD+`varying float vA;varying float vMix;varying float vRot;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vRot),s=sin(vRot);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float y=q.y/.46;float w=.15*sqrt(max(0.,1.-y*y))*(1.-.35*y);
 float vane=smoothstep(w,w-.035,abs(q.x))*step(abs(y),1.);
 float barbs=.65+.35*sin((q.y*2.2-abs(q.x))*75.);
 float rach=smoothstep(.016,0.,abs(q.x))*step(abs(y),1.12);
 float a=(vane*barbs*.75+rach)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${PINK},vec3(1.),rach*.45+vMix*.12)*1.35,a);}`;
// espuma: copo blando con borde roto por ruido
const FOAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*7.,vMix*30.));
 float a=smoothstep(.5,.15,d+(n-.5)*.3)*vA*.75;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.6+.4*n)*1.3,a);}`;

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

const mael={key:"duo_maelstrom",name:"Maelstrom Celeste",tier:3,dur:3.2,ti:1.8,pal:"Maelstrom Celeste",allies:1,enemies:2,
  vlabel:"Pieza",v:"full",
  variants:[["full","Completo"],[ZG,"Ingravidez"],[WR,"Viento"],[WV,"Tornado"],[SA,"Arcos"],[SL,"Relámpago"],[TS,"Marea"]],
  phases:[["Levitación",0],["Tornado",0.6],["Succión",0.95],["Relámpago",1.7],["Detonación",1.8],["Disipación",2.55]],
build(a){
  const TV0=0.6,TV1=1.8,TA0=0.95,TL=1.7,TI=1.8,C=V3(3.4,0,0),CORE=V3(3.4,1.2,0),D=V3(-3.7,0,-0.5);
  const EB=[V3(2.4,0,0),V3(3.4,0,-1.0)];   // rivales en cruz alrededor del centro (oeste y norte)
  const VG=variantGroups(a,IDS), N={};
  const lev=te=>0.38*ss(0,0.65,te)*(1-ss(2.55,3.1,te))+0.04*Math.sin(te*3.2)*ss(0,0.4,te)*(1-ss(2.6,3.1,te));
  const ZE=`const vec3 D=${v3(D)};float zEnv(){return smoothstep(0.,.45,uT)*(1.-smoothstep(2.5,3.1,uT));}`;

  // ---------- 3.1 · campo de gotas y plumas en ingravidez (20 + 20, radio 2 m alrededor del dúo) ----------
  N[ZG]=points(VG[ZG].part,20,ZE+`void main(){float life=2.4+aSeed.y*.8;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rd=.55+1.45*sqrt(r.y);
   vec3 p=D+vec3(cos(an)*rd,.15+r.z*1.5+age*1.1,sin(an)*rd*.85)+vec3(sin(uT*1.3+r.x*9.)*.12,0.,cos(uT*1.1+r.y*7.)*.12);
   vA=sin(age*3.14159)*zEnv();put(p,.14+.08*aSeed.z);}`,DROP_FS)
  +points(VG[ZG].part,20,ZE+`varying float vRot;void main(){float life=2.6+aSeed.y*.9;float k=uT/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   float an=r.x*6.2832;float rd=.55+1.45*sqrt(r.y);
   vec3 p=D+vec3(cos(an)*rd,.2+r.z*1.5+age*.9,sin(an)*rd*.85)+vec3(sin(uT*.9+r.z*8.)*.18,sin(uT*1.7+r.x*5.)*.05,cos(uT*.8+r.y*6.)*.15);
   vRot=r.y*6.2832+uT*(r.z-.5)*1.6+sin(uT*1.4+r.x*7.)*.4;
   vA=sin(age*3.14159)*zEnv();put(p,.3+.12*aSeed.z);}`,FEATHER_FS);

  // ---------- 3.2 · tres cintas helicoidales de viento bajo los pies ----------
  const pts=[];for(let i=0;i<=60;i++){const t=i/60,an=t*Math.PI*2*1.4,r=1.25-0.35*t;pts.push(V3(Math.cos(an)*r,t*0.6,Math.sin(an)*r));}
  const helGeo=taperTube(new THREE.CatmullRomCurve3(pts),120,6,0.05,0.022);
  const windMat=fx(`void main(){float u=vUv.x;
   float n=noise(vec3(u*10.-uT*12.,vUv.y*6.,0.));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.2);
   float st=smoothstep(.3,.7,n)*(.35+.65*pow(fract(u*2.5-uT*4.),2.));
   float ends=smoothstep(0.,.15,u)*smoothstep(1.,.8,u);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.3,(.18+.6*st)*(.4+.6*fr)*ends*uA);}`);
  const wind=new THREE.Group(); VG[WR].trail.add(wind);
  const ribbons=[0,1,2].map(i=>{const m=new THREE.Mesh(helGeo,windMat);m.rotation.y=i*Math.PI*2/3;wind.add(m);return m;});
  const swirl=groundPlane(3.2,D.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sw=fract(an/6.2832*3.+r*1.2+uT*1.8);
   float arm=smoothstep(.25,0.,abs(sw-.5))*smoothstep(1.,.35,r)*smoothstep(.1,.3,r);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.1,(arm*.35+band(r,.92,.03)*.45)*uA);}`)); swirl.position.z=D.z;
  VG[WR].decal.add(swirl); N[WR]=0;

  // ---------- 3.3 · tornado de marea y plumas (cilindro abierto invertido, UV de agua animada) ----------
  const TW=`void main(){float u=vUv.x,h=vUv.y;if(h>uP*1.15)discard;
   float sw=u*6.2832;float tw=h*2.6-uT*SPD;
   vec3 q=vec3(cos(sw+tw)*1.6,sin(sw+tw)*1.6,h*3.-uT*1.2);
   float n=noise(q)*.6+noise(q*2.3+vec3(0.,0.,-uT*2.))*.4;
   float st=smoothstep(.45,.8,n);float foam=smoothstep(.7,.88,noise(q*3.5+vec3(uT)));
   float pk=smoothstep(.78,.93,noise(vec3(cos(sw-tw*1.3)*3.,sin(sw-tw*1.3)*3.,h*8.-uT*4.)));
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float edge=smoothstep(0.,.12,h)*smoothstep(1.,.78,h);
   float crest=band(h,uP*1.15,.06)*step(uP,.99);
   vec3 c=mix(uC2*.85,uC1,st*.6+foam)+${PINK}*pk*1.2;
   gl_FragColor=vec4(c*1.25,((.1+st*.42+foam*.5+fr*.35+pk*.5)*edge+crest*.6)*uA*AMP);}`;
  const vortex=new THREE.Group(); vortex.position.copy(C); VG[WV].mesh.add(vortex);
  const funnel=new THREE.Mesh(new THREE.CylinderGeometry(1.55,0.3,3.6,56,18,true),fx(TW.replace("SPD","3.").replace("AMP","1.")));
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.12,3.4,40,14,true),fx(TW.replace("SPD","5.5").replace("AMP",".7")));
  funnel.position.y=1.8; inner.position.y=1.7; vortex.add(funnel,inner);
  const VC=`const float TV0=${f(TV0)};const float TV1=${f(TV1)};const vec3 C=${v3(C)};float grow(){return smoothstep(TV0,TV0+.3,uT);}`;
  N[WV]=points(VG[WV].part,110,VC+`varying float vRot;void main(){float life=.85+aSeed.y*.3;float k=uT/life+aSeed.x;float age=fract(k);float sp=uT-age*life;vec3 r=rr(floor(k));
   float y=age*3.4;float rad=mix(.3,1.5,age)*(.8+.35*r.y);float an=r.x*6.2832+age*7.+uT*2.;
   vec3 p=C+vec3(cos(an)*rad,y,sin(an)*rad);vRot=an+r.z*3.;
   vA=(sp>=TV0&&sp<=TV1-.1)?sin(age*3.14159)*step(y,grow()*3.7):0.;put(p,.22+.12*r.z);}`,FEATHER_FS)
  +points(VG[WV].part,170,VC+`void main(){float life=.6+aSeed.y*.35;float k=uT/life+aSeed.x;float age=fract(k);float sp=uT-age*life;vec3 r=rr(floor(k));
   float y=.1+age*3.6;float rad=mix(.25,1.55,age)+r.y*.25+smoothstep(.8,1.,age)*.6;float an=r.x*6.2832+age*9.+uT*3.;
   vec3 p=C+vec3(cos(an)*rad,y,sin(an)*rad);
   vA=(sp>=TV0&&sp<=TV1-.05)?sin(age*3.14159)*step(y,grow()*3.8):0.;put(p,.05+.05*r.z);}`);
  const base=groundPlane(3.6,C.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*4.+r*3.;
   float st=smoothstep(.5,.85,noise(vec3(cos(an)*3.,sin(an)*3.,r*5.)));
   float m=(st*.6+band(r,.35,.08)*.5)*smoothstep(1.,.5,r)*smoothstep(0.,.2,r);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3,m*uA);}`));
  VG[WV].decal.add(base);

  // ---------- 3.4 · arcos bioeléctricos de succión (LineSegments quebrados, parpadeo cada 50 ms) ----------
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
      fragmentShader:HEAD+`varying float vA;varying vec3 vCol;void main(){gl_FragColor=vec4(vCol*1.6+vec3(.45),vA);}`}));
    lines.frustumCulled=false; VG[SA].trail.add(lines);}
  // cuentas de plasma sobre el mismo trazo quebrado: dan grosor y halo a la línea de 1 px
  N[SA]=points(VG[SA].part,150,ARC+`varying vec3 vCol;void main(){float e=step(.5,aSeed.z);float s=floor(aSeed.y*2.999);float fr=floor(uT/.05);
   vec3 p=arcP(e,s,aSeed.x,fr);vCol=arcCol(e,s,fr);
   vA=uAr*arcOn(e,s,fr)*(.45+.55*aSeed.w);put(p,.09+.13*aSeed.w);}`,
   HEAD+`varying float vA;varying float vMix;varying vec3 vCol;
   void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
    gl_FragColor=vec4(vCol*1.3+vec3(1.)*smoothstep(.15,0.,d)*.8,a);}`,{uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uE0,uE1,uAr}});

  // ---------- 3.5 · relámpago astral descendente (y=10 → centro) ----------
  const R=(s)=>(Math.random()-0.5)*s, main=[];
  for(let i=0;i<=16;i++){const t=i/16,w=Math.sin(Math.PI*Math.min(t*1.1,1))*0.75;main.push(V3(C.x+(i&&i<16?R(w):0),10*(1-t)+(i&&i<16?R(0.25):0),C.z+(i&&i<16?R(w):0)));}
  const br=(i0,len,dir)=>{const P=[main[i0].clone()];for(let k=1;k<=5;k++){const q=P[k-1].clone();q.x+=dir*len/5*(0.6+Math.random()*0.6);q.y-=len/5*(0.8+Math.random()*0.5);q.z+=R(0.5);P.push(q);}
    return {pts:P,t0:i0/16,t1:i0/16+0.32,r:0.045};};
  const LN=[{pts:main,t0:0,t1:1,r:0.1},br(5,2.6,1),br(9,2.0,-1),br(12,1.3,1)];
  const boltFS=(core)=>`void main(){float t=vUv.y;if(t>uP)discard;
   float fr=abs(dot(normalize(vN),normalize(vV)));
   float fl=.75+.25*noise(vec3(t*40.,uT*60.,0.));
   ${core?`gl_FragColor=vec4(vec3(1.)*1.9,pow(fr,.6)*fl*uA);`:`gl_FragColor=vec4(${CYAN}*1.6+vec3(.15),pow(fr,2.2)*.65*fl*uA);`}}`;
  const boltCore=new THREE.Mesh(jagGeo(LN,6),fx(boltFS(true),{depthTest:false}));
  const boltGlow=new THREE.Mesh(jagGeo(LN.map(l=>Object.assign({},l,{r:l.r*4.5})),8),fx(boltFS(false)));
  VG[SL].trail.add(boltCore,boltGlow);
  const star=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rays=pow(abs(cos(an*4.)),18.)*smoothstep(1.,0.,r)+pow(abs(cos(an*4.+.39)),40.)*smoothstep(.7,0.,r)*.6;
   float core=pow(max(0.,1.-r),3.);
   gl_FragColor=vec4(mix(${CYAN},vec3(1.),core+.3)*1.8,(rays+core)*uA);}`,{depthTest:false}));
  VG[SL].mesh.add(star);
  N[SL]=sparks(VG[SL].part,140,TI,`${f(C.x)},.1,${f(C.z)}`,"0.,.9,0.",3,9,4);
  const scorchL=groundPlane(2.2,C.x,0.032,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float fork=pow(1.-abs(fract(an*1.27+noise(vec3(r*4.,an,2.))*.6)*2.-1.),14.)*smoothstep(1.,.2,r);
   gl_FragColor=vec4(mix(${CYAN},vec3(1.),.4)*1.6,(fork+smoothstep(.35,0.,r))*uA);}`));
  VG[SL].decal.add(scorchL);

  // ---------- 3.6 · detonación de marea y escarcha en cruz (2 casillas) ----------
  const TC=`const float TI=${f(TI)};const vec3 C=${v3(C)};
  vec3 armDir(float j){return j<1.?vec3(1.,0.,0.):j<2.?vec3(-1.,0.,0.):j<3.?vec3(0.,0.,1.):vec3(0.,0.,-1.);}`;
  N[TS]=points(VG[TS].part,50,TC+`void main(){vec3 dir=armDir(floor(aSeed.x*4.));vec3 side=vec3(dir.z,0.,dir.x);
   float s=TI+aSeed.w*.08;float t=max(uT-s,0.);float life=.6+aSeed.y*.35;float age=(uT-s)/life;
   float d=(.2+2.*aSeed.z)*(1.-exp(-t*5.));float up=(1.5+2.6*aSeed.y)*t-4.5*t*t;
   vec3 p=C+dir*d+side*(aSeed.y-.5)*.55+vec3(0.,max(up,0.)+.08,0.);
   vA=(age>0.&&age<1.)?(1.-age*age):0.;put(p,(.38+.3*aSeed.w)*(.6+.6*age));}`,FOAM_FS)
  +points(VG[TS].part,160,TC+`void main(){vec3 dir=armDir(floor(aSeed.x*4.));vec3 side=vec3(dir.z,0.,dir.x);
   float s=TI+aSeed.w*.05;float t=max(uT-s,0.);float life=.45+aSeed.y*.4;float age=(uT-s)/life;
   float d=(.3+2.4*aSeed.z)*(1.-exp(-t*6.));float up=(2.+4.*aSeed.y)*t-7.*t*t;
   vec3 p=C+dir*d+side*(aSeed.w-.5)*.35+vec3(0.,max(up,0.)+.05,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.05+.05*aSeed.y)*(1.-age*.4));}`)
  // escarcha: destellos que suben del charco cristalino
  +points(VG[TS].part,60,TC+`void main(){vec3 dir=armDir(floor(aSeed.x*4.));float s=TI+.2+aSeed.y*.8;float t=max(uT-s,0.);float life=.5+aSeed.z*.4;float age=(uT-s)/life;
   vec3 p=C+dir*(aSeed.z*2.2)+vec3(dir.z,0.,dir.x)*(aSeed.w-.5)*.8+vec3(0.,.05+t*.45,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159)*.9:0.;put(p,.1+.1*aSeed.w);}`,STAR4_FS);
  // corona de agua que estalla en el centro y se deshace
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(1,0.7,1,48,6,true),fx(`void main(){float u=vUv.x,h=vUv.y;float sw=u*6.2832;
   float sp=.55+.45*noise(vec3(cos(sw)*5.,sin(sw)*5.,1.));if(h>sp*(1.-.25*uP))discard;
   float n=noise(vec3(cos(sw)*3.,sin(sw)*3.,h*4.-uT*3.));if(n<uP*1.1-.15)discard;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float tip=smoothstep(sp-.25,sp,h);
   gl_FragColor=vec4(mix(uC2,uC1,tip+fr*.5)*1.4,(.15+.5*fr+tip*.6)*(1.-uP)*uA);}`));
  VG[TS].mesh.add(crown);
  // anillos de agua: uno por casilla de la cruz (centro, ±1, ±2), retrasados con la distancia; uP = tiempo desde el impacto
  const rings=groundPlane(6,C.x,0.035,fx(`void main(){vec2 p=(vUv-.5)*6.;float m=0.;
   for(int i=0;i<9;i++){float fi=float(i);float j=mod(fi-1.,4.);float dd=fi<.5?0.:(fi<4.5?1.:2.);
    vec2 dir=j<.5?vec2(1.,0.):j<1.5?vec2(-1.,0.):j<2.5?vec2(0.,1.):vec2(0.,-1.);
    vec2 c=dir*dd;float t=uP-dd*.09;float r=length(p-c);float R=t*(dd<.5?2.6:1.5);
    float k=step(0.,t)*max(0.,1.-t/.6);
    m+=(band(r,R,.05+.06*t)+band(r,R*.6,.035)*.5)*k;}
   m*=.7+.3*noise(vec3(p*4.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.4,min(m,1.4)*uA);}`));
  // charco cristalino en cruz: facetas de escarcha (voronoi) y borde helado
  const puddle=groundPlane(6,C.x,0.03,fx(`vec2 h2(vec2 c){return vec2(hash(vec3(c,1.7)),hash(vec3(c.yx,4.3)));}
  void main(){vec2 p=(vUv-.5)*6.;
   float wob=(noise(vec3(p*2.,1.))-.5)*.25;vec2 q=abs(p);
   float sd=min(min(max(q.x-2.4*uP,q.y-.48),max(q.x-.48,q.y-2.4*uP)),length(p)-.95*uP)+wob;
   float inside=smoothstep(.05,-.05,sd);
   vec2 g=p*3.;vec2 id=floor(g),fp=fract(g);float m1=8.,m2=8.;
   for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 r=o+h2(id+o)-fp;float d=dot(r,r);
    if(d<m1){m2=m1;m1=d;}else if(d<m2){m2=d;}}
   float line=smoothstep(.09,0.,sqrt(m2)-sqrt(m1));
   float rim=smoothstep(.12,0.,abs(sd));float sheen=.5+.5*sin(p.x*3.+p.y*2.-uT*2.);
   gl_FragColor=vec4(mix(uC2,uC1,line*.7+rim*.6)*1.3,(inside*(.14+line*.5+.1*sheen)+rim*.6)*uA);}`));
  // fractura de baldosa (nivel 3) en la casilla central
  const FS=6.5, frac=groundPlane(FS,C.x,0.025,fx(tileFractureFS(FS)));
  VG[TS].decal.add(rings,puddle,frac);

  a.setVariant=v=>{if(v!=="full"&&!VG[v])v="full";a.v=v;
    for(const id of IDS)for(const l of VFX.LK)VG[id][l].visible=v==="full"||v===id;
    a.count=IDS.reduce((s,id)=>s+(v==="full"||v===id?N[id]:0),0);};

  const dir=EB.map(e=>e.clone().sub(C).normalize()), cyan=new THREE.Color(0x00b4d8), vio=new THREE.Color(0x74b9ff), tp=V3(0,0,0);
  const lf=te=>{const x=te-TI;if(x<0||x>0.25)return 0;return x<0.06?1:x<0.1?0.35:x<0.14?1:Math.exp(-(x-0.14)*18);};
  a.pose=function(te,o){
    const v=a.v,on=id=>v==="full"||v===id, ia=te-TI, h=lev(te);
    // dúo: Sapidae y Axie levitan juntos
    caster.position.set(-3.7,h,0); allies[0].position.set(-3.7,h,-1.0);
    caster.rotation.z=0.05*Math.sin(te*2.1)*ss(0,0.5,te)-0.12*ss(TL-0.3,TL,te)*(1-ss(TI,TI+0.5,te));
    allies[0].rotation.z=0.05*Math.sin(te*2.1+1.3)*ss(0,0.5,te);
    const zenv=ss(0,0.45,te)*(1-ss(2.5,3.1,te));
    if(on(ZG)||on(WR))for(const d of [caster,allies[0]]){d.userData.m.emissive.copy(cyan);d.userData.m.emissiveIntensity=0.22*zenv;}
    // 3.2 viento: bajo los pies, gira rápido en Y y se estira con la altura
    wind.position.set(D.x,0.02,D.z); wind.rotation.y=-te*10; wind.scale.set(1,Math.max(h+0.25,0.05)/0.6,1);
    windMat.uniforms.uA.value=ss(0,0.35,te)*(1-ss(2.55,3.05,te)); swirl.material.uniforms.uA.value=0.8*windMat.uniforms.uA.value;
    // 3.3 tornado
    const vg=ss(TV0,TV0+0.3,te), venv=ss(TV0,TV0+0.15,te)*(1-ss(TV1,TV1+0.15,te)), col=ss(TV1,TV1+0.15,te);
    vortex.visible=te>=TV0&&te<TV1+0.16; vortex.rotation.y=te*6; vortex.scale.set(1+0.7*col,1-0.3*col,1+0.7*col);
    set(funnel,vg,venv); set(inner,vg,venv); base.material.uniforms.uA.value=venv;
    // 3.4 arcos y arrastre de los rivales en cruz
    uAr.value=ss(TA0,TA0+0.1,te)*(1-ss(TI-0.05,TI+0.02,te));
    const pull=0.38*ss(TA0,TI-0.05,te)*(1-ss(TI,TI+0.06,te)), kb=ia>=0?0.55*(1-Math.exp(-ia*12))*(1-ss(2.3,3.0,te)):0;
    const fr=Math.floor(te/0.05), flick=0.5+0.5*Math.sin(fr*12.9898);
    enemies.forEach((e,i)=>{e.position.copy(EB[i]).addScaledVector(dir[i],kb-pull);
      e.rotation.z=0.07*Math.sin(te*31+i*2)*uAr.value-(ia>=0?0.3*Math.exp(-ia*5)*Math.cos(ia*14)*(i?1:-1):0);
      if(on(SA)){e.userData.m.emissive.copy(i?cyan:vio);e.userData.m.emissiveIntensity=0.7*uAr.value*flick;}});
    uE0.value.copy(enemies[0].position); uE1.value.copy(enemies[1].position);
    // objetivo central: elevado por el tornado, aplastado por el relámpago
    const lift=0.25*ss(TV0+0.1,TV0+0.5,te)+0.06*Math.sin(te*9)*venv, hit=ia>=0?Math.exp(-ia*4):0;
    target.position.y=te<TI?lift:lift*(1-ss(TI,TI+0.05,te)); target.rotation.z=te<TI?0.12*Math.sin(te*7)*venv:-hit*0.35*Math.cos(ia*14);
    // 3.5 relámpago: líder escalonado 1.70–1.80, descarga 250 ms con re-golpe
    const lv=lf(te), lead=te>=TL&&te<TI;
    boltCore.visible=boltGlow.visible=te>=TL&&ia<0.25;
    set(boltCore,lead?cl((te-TL)/(TI-TL)):1,lead?0.5:lv); set(boltGlow,lead?cl((te-TL)/(TI-TL)):1,lead?0.35:lv);
    star.position.set(C.x,0.5,C.z); towardCam(star.position,star.position,0.8); billboard(star,te*2);
    star.visible=ia>=0&&ia<0.35; star.material.uniforms.uA.value=ia>=0?Math.exp(-ia*10)+0.6*lv:0; star.scale.setScalar(0.7+1.2*cl(ia/0.12));
    scorchL.material.uniforms.uA.value=ia>=0?1-cl(ia/0.6):0;
    // 3.6 detonación en cruz
    let p=cl(ia/0.6); crown.visible=ia>=0&&p<1; crown.position.set(C.x,0.5+0.35*p,C.z);
    crown.scale.set(0.6+1.6*(1-Math.pow(1-p,3)),0.6+1.0*p,0.6+1.6*(1-Math.pow(1-p,3))); set(crown,p,1);
    set(rings,Math.max(ia,0),ia>=0?1-ss(TI+0.5,TI+0.85,te):0);
    set(puddle,ss(TI,TI+0.35,te),ia>=0?ss(TI,TI+0.1,te)*(1-ss(2.75,3.18,te)):0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(2.6,3.15,te):0);
    // resplandor y luz: el punto caliente de la pieza activa con más luz
    const cand=[];
    if(on(ZG)||on(WR))cand.push([-3.7,1.0+h,-0.5,2.2,0.28*zenv,2.5*zenv,14]);
    if(on(WV))cand.push([C.x,1.6,C.z,3.2,0.32*venv,4*venv,14]);
    if(on(SA))cand.push([C.x,1.2,C.z,2.4,0.3*uAr.value*flick,(3+3*flick)*uAr.value,14]);
    if(on(SL))cand.push([C.x,lead?10-8*cl((te-TL)/(TI-TL)):2.5,C.z,lead?1.5:6,lead?0.6:0.95*lv,lead?6:48*lv,42]);
    if(on(TS)&&ia>=0)cand.push([C.x,0.6,C.z,2+4*Math.min(ia,0.6),Math.exp(-ia*9)*0.75,10*Math.exp(-ia*4),16]);
    let best=null;for(const c of cand)if(!best||c[5]>best[5])best=c;
    if(best){o.g.set(best[0],best[1],best[2]);o.gs=best[3];o.ga=best[4];o.li=best[5];o.ld=best[6];}else{o.g.copy(C);o.gs=0.001;o.ga=0;o.li=0;}
    const imp=on(SL)||on(TS);
    o.ia=imp?ia:-1; o.c.set(C.x,0.8,C.z); o.shake=imp?1.8:0; o.dist=imp?1.3:0;
    if(on(SL)){const x=ia;o.white=x<0||x>0.22?0:(x<0.03?0.85:0.55*Math.exp(-(x-0.03)*22)+(x>0.12&&x<0.16?0.22:0));
      o.dark=0.6*ss(1.45,TL,te)*(1-ss(TI,TI+0.35,te));}
    if(on(WV)||on(SA)){o.em=0.4*venv*(on(SA)?0.6+0.4*flick:1);o.emc.copy(cyan);}
  };
}};
VFX.module("Sapidae · Dúo",[mael]);
})();

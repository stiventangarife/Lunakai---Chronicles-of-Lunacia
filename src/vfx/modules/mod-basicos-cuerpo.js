// =====================================================================
// BÁSICOS · CUERPO A CUERPO — fábricas reutilizables para habilidades de enemigos
// VFX.basic.TIPO(cfg) devuelve una habilidad NUEVA {key,name,dur,ti,pal,tier,phases,build} (nada compartido
// entre instancias salvo el texto de los shaders). cfg = {key,name,pal,demo?, ...opciones del tipo}.
// Con cfg.demo las opciones se muestran como variantes; sin demo, la variante queda fijada desde cfg.
// En cuerpo a cuerpo el pasillo se comprime a la distancia real (como Tajo): lanzador y objetivo se acercan.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,caster,target,enemies}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,billboard,towardCam,variantGroups,tileFractureFS}=VFX.lib;
VFX.basic=VFX.basic||{};

const PT=0.9, SL=0.24;                            // desplazamiento por casilla empujada y duración del deslizamiento
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const e3=k=>1-Math.pow(1-cl(k),3);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const RED="vec3(1.,.09,.1)";                       // sangrado: rojo fijo (semántico), se lee con cualquier paleta

// cfg → def; las opciones del demo pasan a variantes, en instancias se fija la variante
function mk(cfg,base,demoVars,pick){
  cfg=cfg||{};
  const def=Object.assign(base,{key:cfg.key||base.key,name:cfg.name||base.name,pal:cfg.pal||base.pal});
  if(demoVars){
    if(cfg.demo){def.variants=demoVars;def.v=demoVars[0][0];def.vlabel="Opción";}
    else def.v=pick(cfg);
  }
  return def;
}

// ---------- shaders comunes ----------
// destello de impacto en billboard: N rayos + núcleo blanco; uP gira los rayos
const FLASH_FS=N=>`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float rays=pow(abs(cos(an*${f(N/2)}+uP)),30.)*smoothstep(1.,.05,r)*(.6+.4*noise(vec3(an*3.,uT*20.,0.)));
 float core=smoothstep(.35,0.,r);float halo=pow(max(0.,1.-r),3.)*.35;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.45+.55*core)*1.7,(rays+core+halo)*uA);}`;
// estela de avance: plano que se afina hacia atrás (u=1 en la cabeza)
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=noise(vec3(u*6.-uT*12.,v*3.,uT));
 float al=smoothstep(u*(.5+.5*n),0.,v)*pow(u,1.5)*uA;
 gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.25,0.,v)*u*.4,al);}`;
// gota (punta arriba); col = color GLSL
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float y=q.y+.1;
 float w=y<0.?sqrt(max(.04-y*y,0.)):.2*(1.-y/.48);
 float m=smoothstep(w,w-.06,abs(q.x))*step(q.y,.38)*step(-.3,q.y);
 float hl=smoothstep(.07,0.,length(q-vec2(-.06,-.14)));
 float a=(m+hl*.4)*vA;if(a<.003)discard;
 gl_FragColor=vec4(${col}*(1.+.4*vMix)+vec3(hl*.6),a);}`;
// hoja/pétalo girado por partícula (vR)
const LEAF_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float w=.17*sqrt(max(1.-pow(q.y/.42,2.),0.))*(1.-.35*abs(q.y)/.42);
 float m=smoothstep(w,w-.05,abs(q.x))*step(abs(q.y),.42);
 float vein=smoothstep(.025,0.,abs(q.x))*m;
 float a=m*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.4+.45*vMix+q.y*.5)*1.35+vec3(vein*.35),a);}`;
// flecha de empuje en el suelo: punta que avanza con uP, chevrones que corren y dos raíles de arrastre
const PUSH_FS=`void main(){float u=vUv.x;float av=abs(vUv.y-.5);
 float head=step(uP-.3,u)*step(av,(uP-u)*1.25)*step(u,uP);
 float rim=head*smoothstep(.05,0.,(uP-u)*1.25-av);
 float ch=fract(u*6.+av*5.-uT*5.);
 float rows=smoothstep(.3,.12,abs(ch-.5))*step(av,.28)*step(u,uP-.3);
 float rail=band(av,.2,.025)*step(u,uP-.28);
 float m=(head*.6+rim*.6+rows*.5+rail*.5)*smoothstep(0.,.12,u);
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3+.4*rim)*1.4,m*uA);}`;

// ---------- kit de empuje: flecha en el suelo + polvo de arrastre bajo los pies ----------
// O = posición original del empujado, DR = dirección (unitaria, en xz), uD = {value: distancia}
function pushKit(G,O,DR,T0,uD,dur){
  const arrow=new THREE.Mesh(new THREE.PlaneGeometry(1,0.8).translate(0.5,0,0).rotateX(-Math.PI/2),fx(PUSH_FS));
  arrow.rotation.y=-Math.atan2(DR.z,DR.x); G.decal.add(arrow);
  const n=points(G.part,30,`uniform float uD;const float T0=${f(T0)};const vec3 O=${v3(O)};const vec3 DR=${v3(DR)};
  float dsp(float t){float k=clamp((t-T0)/${f(SL)},0.,1.);return uD*(1.-pow(1.-k,3.));}
  void main(){float s=T0+aSeed.x*${f(SL)};float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 side=vec3(-DR.z,0.,DR.x);
   vec3 p=O+DR*(dsp(s)-.25)+side*(aSeed.z-.5)*.6+vec3(0.,.05+t*(.4+.4*aSeed.w),0.)-DR*t*.3;
   vA=(age>0.&&age<1.&&uD>.01)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.16+.18*aSeed.w)*(.6+age));}`,
   DUST_FS,Object.assign({uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uD}},NB));
  return {n,disp:te=>uD.value*e3((te-T0)/SL),upd(te){const D=uD.value;
    arrow.position.set(O.x-DR.x*0.35,0.035,O.z-DR.z*0.35); arrow.scale.set(D+0.85,1,1);
    set(arrow,e3((te-T0)/SL),D>0.01?ss(T0,T0+0.05,te)*(1-ss(dur-0.18,dur,te)):0);}};
}

// ---------- kit de sangrado: herida que late, goteo, salpicones y charco rojo (sigue al objetivo) ----------
const BLEED_MARK_FS=kind=>`void main(){vec2 p=(vUv-.5)*2.;float m=0.;
 ${kind==="bite"?`for(int i=0;i<4;i++){float t=(float(i)/3.-.5)*1.3;
   m=max(m,smoothstep(.13,0.,length((p-vec2(t*.85,.36-.16*t*t))*vec2(1.,.62))));
   m=max(m,smoothstep(.11,0.,length((p-vec2(t*.72,-.36+.14*t*t))*vec2(1.,.62))));}`
 :`for(int i=0;i<3;i++){float off=(float(i)-1.)*.36;float y=p.y-off+(noise(vec3(p.x*5.,float(i),1.))-.5)*.08;
   m=max(m,smoothstep(.07,0.,abs(y))*smoothstep(.95,.55,abs(p.x+off*.2)));}`}
 float n=noise(vec3(p*6.,uT*3.));
 gl_FragColor=vec4(${RED}*(1.1+.9*uP)+vec3(1.,.55,.45)*m*uP*.35,m*(.65+.35*n)*uA);}`;
function bleedKit(G,TI,TE,Y,kind,ang){
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),fx(BLEED_MARK_FS(kind),{depthTest:false})); G.mesh.add(mark);
  const fol=new THREE.Group(); G.part.add(fol);
  const C=`const float TI=${f(TI)};const float Y=${f(Y)};`;
  let n=points(fol,5,C+`void main(){float s=TI+aSeed.x*.04;float life=.4+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=vec3(-.6-.8*aSeed.z,1.2+1.4*aSeed.y,(aSeed.w-.5)*1.6);vec3 p=vec3(-.25,Y,.2)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;put(p,.13+.06*aSeed.w);}`,DROP_FS(RED));
  n+=points(fol,36,C+`void main(){float life=.3+aSeed.y*.18;float per=life+.12;float k=(uT-TI-.04)/per+aSeed.x;float c=floor(k);float t=fract(k)*per;vec3 r=rr(c);
   vec3 p=vec3(-.32+r.z*.1,Y+(r.x-.5)*.45,(r.y-.5)*.45)+vec3(0.,-4.5*t*t,0.);
   vA=(k>=1.&&t<life&&p.y>.03)?uE:0.;put(p,.045+.035*r.z);}`,DROP_FS(RED));
  const pool=groundPlane(1.3,0,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*9.,2.));float sp=smoothstep(.6,.7,n+(1.-r)*.3-(1.-uP)*.7);
   gl_FragColor=vec4(${RED}*1.2,sp*smoothstep(1.,.4,r)*uA);}`)); G.decal.add(pool);
  const mp=V3(0,0,0);
  return {n,pose(te){
    const env=ss(TI,TI+0.06,te)*(1-ss(TE-0.15,TE,te)), tick=Math.pow(0.5+0.5*Math.sin((te-TI)*22),3), tx=target.position.x;
    towardCam(mark.position,mp.set(tx-0.12,Y,0),0.45); billboard(mark,ang); mark.visible=env>0.001;
    mark.scale.setScalar(0.8+0.25*Math.pow(1-cl((te-TI)/0.12),2)); set(mark,tick,env*(0.75+0.25*tick));
    fol.position.x=tx; pool.position.x=tx; set(pool,ss(TI+0.1,TE,te),env*0.9); U.uE.value=env;
    return env*tick;}};
}

// =====================================================================
// MORDISCO (plantilla tajo · 0,7 s) — dos arcos de colmillos se cierran de golpe sobre el objetivo,
// chispa de impacto y 5 esquirlas. Opción bleed: herida de mordida roja que late + goteo.
// =====================================================================
const JAW_FS=`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;p.y*=uQ;
 float ax=abs(p.x);float g=.4*(1.-p.x*p.x)-.08;
 float th=.075*sqrt(max(1.-p.x*p.x,0.))+.008;
 float arc=smoothstep(th,th*.25,abs(p.y-g))*smoothstep(.98,.8,ax);
 float fang=0.,tip=0.;
 for(int i=0;i<2;i++){float xc=i==0?.5:.2;float L=i==0?.62:.32;float bw=i==0?.12:.075;
  float y0=.4*(1.-xc*xc)-.08;float dy=y0-p.y;float k=clamp(dy/L,0.,1.);
  float xx=ax-xc+.07*k*k;float w=bw*(1.-k)+.004;
  float inF=step(-.02,dy)*step(dy,L)*smoothstep(w,w*.35,abs(xx));
  fang=max(fang,inF);tip=max(tip,inF*smoothstep(.55,1.,k));}
 float m=max(arc,fang);
 float halo=smoothstep(.35,0.,abs(p.y-g+.1))*smoothstep(1.,.3,ax)*.18;
 float n=noise(vec3(p*4.,uT*6.));
 vec3 c=mix(uC2,uC1,.45+.55*fang+.3*n)*1.6+vec3(1.)*(tip*.9+arc*.25);
 gl_FragColor=vec4(c,(m*(.8+.2*n)+halo+tip*.3)*uA);}`;
VFX.basic.MORDISCO=function(cfg){
  const HC=-0.6,HT=1.2,T0=0.08,TS=0.2,TI=0.3,DUR=0.7,BP=V3(HT-0.2,1.3,0),G0=0.5,CO=0.09;
  return mk(cfg,{key:"basic_mordisco",name:"Mordisco",pal:"Salvaje",dur:DUR,ti:TI,tier:2,
    phases:[["Acecho",0],["Mordida",TS],["Impacto",TI],["Desgarro",0.42]],
  build(a){
    const L=a.L,VG=variantGroups(a,["sangrado"]);
    const upper=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.8),fxU(JAW_FS,{uQ:{value:1}},{depthTest:false}));
    const lower=new THREE.Mesh(new THREE.PlaneGeometry(1.05,0.7),fxU(JAW_FS,{uQ:{value:-1}},{depthTest:false}));
    const flash=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(FLASH_FS(6),{depthTest:false}));
    L.mesh.add(upper,lower,flash);
    // estela del avance: planos cruzados detrás de la cabeza
    const sg=new THREE.PlaneGeometry(1,0.32).translate(-0.5,0,0), sm=fx(STREAK_FS);
    const streak=new THREE.Group(), s2=new THREE.Mesh(sg,sm); s2.rotation.x=Math.PI/2; streak.add(new THREE.Mesh(sg,sm),s2); L.trail.add(streak);
    const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 BP=${v3(BP)};`;
    // motas absorbidas por el cierre y chispas del mordisco
    let base=points(L.part,50,C+`void main(){float s=TS-.06+aSeed.x*(TI-TS+.04);float life=.12+aSeed.y*.06;float age=(uT-s)/life;
     vec3 d=normalize(rnd()+.0001);vec3 p=BP+vec3(0.,0.,.3)+d*mix(.75,.05,age*age);
     vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.035*aSeed.z);}`);
    base+=sparks(L.part,110,TI,`${f(BP.x)},${f(BP.y)},.25`,"-.1,.25,.45",2.5,7,3);
    // esquirlas de energía (sin sangrado); con sangrado las sustituyen gotas rojas del kit
    const chips=new THREE.Group(); L.part.add(chips);
    const nChips=points(chips,5,C+`void main(){float s=TI+aSeed.x*.03;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()+vec3(-.2,.6,.5))*(2.2+1.5*aSeed.z);vec3 p=BP+v*t+vec3(0.,-6.*t*t,0.);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.11+.05*aSeed.w);}`,CHIP_FS);
    const kit=bleedKit(VG.sangrado,TI,DUR,1.3,"bite",0);
    const ring=groundPlane(2.2,HT,0.03,fx(RING_FS)); L.decal.add(ring);
    a.setVariant=v=>{if(v!=="sangrado")v="normal";a.v=v;const b=v==="sangrado";
      for(const k of VFX.LK)VG.sangrado[k].visible=b; chips.visible=!b; a.count=base+(b?kit.n:nChips);};
    a.pose=function(te,o){
      const ia=te-TI;
      caster.position.x=HC+0.45*ss(TS-0.05,TI,te)-0.45*ss(TI+0.08,DUR-0.04,te);
      caster.rotation.z=0.15*ss(0,TS,te)-0.4*ss(TS,TI,te)+0.25*ss(TI+0.05,DUR-0.04,te);
      const hit=hitE(ia,7);
      target.position.x=HT+0.16*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-hit*0.22*Math.cos(ia*16); target.scale.set(1,1-0.06*hit,1);
      const tx=target.position.x-HT;
      // mandíbulas: aparecen abiertas, se abren un poco más y se cierran de golpe; luego se deshacen hacia fuera
      let off,smear=1;
      if(te<TS)off=CO+G0*(0.85+0.15*ss(T0,TS,te));
      else if(te<TI){const k=(te-TS)/(TI-TS);off=CO+G0*(1-k*k*k);smear=1+0.45*k*k;}
      else off=CO-0.015*Math.sin(ia*70)*Math.exp(-ia*14)+0.25*ss(TI+0.1,TI+0.24,te);
      const on=ss(T0-0.05,T0+0.05,te)*(1-ss(TI+0.1,TI+0.24,te)), grow=1+0.35*ss(TI+0.1,TI+0.24,te);
      towardCam(tmp,tmp2.set(BP.x+tx,BP.y,0),0.5);
      upper.position.copy(tmp).add(tmp2.set(0,off,0)); lower.position.copy(tmp).add(tmp2.set(0,-off*0.85,0));
      billboard(upper,0.1*(off-CO)); billboard(lower,-0.08*(off-CO));
      upper.scale.set(grow,smear*grow,1); lower.scale.set(grow,smear*grow,1);
      upper.visible=lower.visible=on>0.001; set(upper,0,on); set(lower,0,on);
      let p=cl(ia/0.16); towardCam(flash.position,tmp2.set(BP.x+tx,BP.y,0),0.6); billboard(flash,0.3); flash.visible=ia>=0&&p<1;
      flash.scale.setScalar(0.6+0.7*p); set(flash,te*3,ia>=0?Math.pow(1-p,1.5):0);
      const adv=caster.position.x-HC;
      streak.visible=te>TS-0.05&&te<TI+0.15; streak.position.set(caster.position.x+0.3,1.48,0); streak.scale.set(Math.max(adv+0.35,0.001),1,1);
      sm.uniforms.uA.value=ss(TS-0.05,TS+0.02,te)*(1-ss(TI,TI+0.15,te));
      p=cl(ia/0.4); ring.position.x=target.position.x; set(ring,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
      const bl=a.v==="sangrado"?kit.pose(te):0;
      o.em=bl*0.35; o.emc.setRGB(1,0.1,0.1);
      if(ia<0){o.g.copy(BP);o.gs=0.8*on;o.ga=0.25*on;o.li=1.8*on+1.5*ss(TS,TI,te);}
      else{o.g.set(BP.x+tx,BP.y,0);o.gs=1+2.5*ia;o.ga=Math.exp(-ia*12)*0.6;o.li=6*Math.exp(-ia*6)+bl*1.5;}
      o.ia=ia;o.c.copy(BP);o.shake=0;o.dist=0.6;
    };
  }},[["normal","Normal"],["sangrado","Sangrado"]],c=>c.bleed?"sangrado":"normal");
};

// =====================================================================
// ZARPAZO (plantilla tajo · 0,6 s) — tres estelas rectas y paralelas en diagonal cruzan al objetivo,
// dejan tres marcas que destellan en blanco al final. Opción bleed: tres tajos rojos que laten + goteo.
// =====================================================================
const CLAW3_FS=`void main(){vec2 p=vUv;float u=p.x;float m=0.,hd=0.;
 for(int i=0;i<3;i++){float fi=float(i);
  float y=p.y-.5-(fi-1.)*.2-(u-.5)*.04*(fi-1.);
  float w=(.01+.035*sin(3.14159*clamp(u,0.,1.)))*(1.-.15*abs(fi-1.));
  float d=uP-fi*.07-u;
  float sw=step(0.,d)*exp(-d*3.2);
  float core=smoothstep(w*.5,0.,abs(y)),body=smoothstep(w*2.2,0.,abs(y));
  float n=noise(vec3(u*14.-uT*6.,fi*3.,uT*3.));
  float tear=smoothstep(.2+d*1.2,.6+d*1.2,n);
  m=max(m,(body*.55*mix(1.,tear,smoothstep(0.,.3,d))+core)*sw);
  hd=max(hd,core*exp(-abs(d)*40.)*step(-.02,d));}
 float edges=smoothstep(0.,.05,u)*smoothstep(1.,.92,u);
 gl_FragColor=vec4(mix(uC2,uC1,min(m,1.))*1.6+vec3(1.)*(hd*1.2+m*.25),(m+hd)*edges*uA);}`;
// marcas que quedan sobre el objetivo; uP las lleva a blanco
const SCAR3_FS=`void main(){vec2 p=vUv;float u=p.x;float m=0.;
 for(int i=0;i<3;i++){float fi=float(i);float y=p.y-.5-(fi-1.)*.2-(u-.5)*.04*(fi-1.);
  m=max(m,smoothstep(.014,0.,abs(y))*smoothstep(0.,.12,u-.3)*smoothstep(0.,.12,.72-u));}
 gl_FragColor=vec4(mix(uC1,vec3(1.),uP)*1.8,m*uA);}`;
VFX.basic.ZARPAZO=function(cfg){
  const HC=-0.6,HT=1.2,T0=0.1,TS=0.13,SW=0.17,TI=0.22,TF=0.32,DUR=0.6,CH=V3(HT-0.12,1.15,0),ANG=-0.8;
  return mk(cfg,{key:"basic_zarpazo",name:"Zarpazo",pal:"Hielo",dur:DUR,ti:TI,tier:2,
    phases:[["Preparación",0],["Garras",TS],["Impacto",TI],["Destello",TF]],
  build(a){
    const L=a.L,VG=variantGroups(a,["sangrado"]);
    const claw=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),fx(CLAW3_FS,{depthTest:false})); L.trail.add(claw);
    const scar=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3),fx(SCAR3_FS,{depthTest:false}));
    const flash=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),fx(FLASH_FS(4),{depthTest:false}));
    L.mesh.add(scar,flash);
    const C=`const float TS=${f(TS)};const float SW=${f(SW)};const vec3 CH=${v3(CH)};const vec2 DL=vec2(${f(Math.cos(ANG))},${f(Math.sin(ANG))});`;
    // jirones arrancados al paso de cada garra
    let base=points(L.part,150,C+`void main(){float fi=floor(aSeed.w*2.999);float s=TS+aSeed.x*SW;float u=(s-TS)/SW*1.35-fi*.07;
     float life=.18+aSeed.y*.16;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 dl=vec3(DL,0.);vec3 nl=vec3(-DL.y,DL.x,0.);
     vec3 p=CH+vec3(0.,0.,.55)+dl*(u-.5)*2.4+nl*(fi-1.)*.26+(nl*(aSeed.z-.5)*1.2+dl*.9)*t;
     vA=(age>0.&&age<1.&&u>.03&&u<.97)?(1.-age):0.;put(p,(.022+.03*aSeed.y)*(1.-age*.5));}`);
    base+=sparks(L.part,120,TF,`${f(CH.x)},${f(CH.y)},.3`,".5,-.4,.3",2.5,7,3);
    const kit=bleedKit(VG.sangrado,TI,DUR,1.15,"claw",ANG);
    const ring=groundPlane(2.0,HT,0.03,fx(RING_FS)); L.decal.add(ring);
    a.setVariant=v=>{if(v!=="sangrado")v="normal";a.v=v;const b=v==="sangrado";
      for(const k of VFX.LK)VG.sangrado[k].visible=b; a.count=base+(b?kit.n:0);};
    a.pose=function(te,o){
      const ia=te-TI, iff=te-TF;
      caster.position.x=HC+0.4*ss(T0-0.05,TI,te)-0.4*ss(TF,DUR-0.03,te);
      caster.rotation.z=0.25*ss(0,T0,te)-0.45*ss(T0,TI,te)+0.2*ss(TF,DUR-0.03,te);
      const h1=hitE(ia,8), h2=hitE(iff,9);
      target.position.x=HT+0.14*h1+0.08*h2; target.rotation.z=-h1*0.2*Math.cos(ia*16)-h2*0.1*Math.cos(iff*20);
      const tx=target.position.x-HT;
      towardCam(claw.position,tmp.set(CH.x+tx,CH.y,0),0.6); billboard(claw,ANG);
      claw.visible=te>=TS&&te<TS+SW+0.13; set(claw,(te-TS)/SW*1.35,1-cl((te-TS-SW)/0.12));
      const env=ss(TI-0.02,TI+0.03,te)*(1-ss(TF+0.05,TF+0.22,te)), white=ss(TF-0.05,TF,te)*(1-ss(TF,TF+0.12,te));
      towardCam(scar.position,tmp.set(CH.x+tx,CH.y,0),0.62); billboard(scar,ANG); scar.visible=env>0.001; set(scar,white,env*(1+1.5*white));
      let p=cl(iff/0.15); towardCam(flash.position,tmp.set(CH.x+tx,CH.y,0),0.7); billboard(flash,ANG+0.78); flash.visible=iff>=0&&p<1;
      flash.scale.setScalar(0.5+0.9*p); set(flash,0,iff>=0?Math.pow(1-p,1.5):0);
      p=cl(ia/0.35); ring.position.x=target.position.x; set(ring,1-Math.pow(1-p,2),ia>=0?0.6*(1-p):0);
      const bl=a.v==="sangrado"?kit.pose(te):0;
      o.em=bl*0.35; o.emc.setRGB(1,0.1,0.1);
      o.white=iff>=0?0.12*Math.exp(-iff*35):0;
      if(te<TS){o.g.set(caster.position.x+0.5,1.4,0.3);o.gs=0.6*ss(0,T0,te);o.ga=0.2*ss(0,T0,te);o.li=1.2*ss(0,T0,te);}
      else if(iff<0){o.g.set(CH.x+tx,CH.y,0.3);o.gs=1.1;o.ga=0.4*(ia>=0?1:0.6);o.li=ia>=0?5*Math.exp(-ia*6)+1.5:2.5;}
      else{o.g.set(CH.x+tx,CH.y,0.3);o.gs=1+3*iff;o.ga=Math.exp(-iff*12)*0.7;o.li=7*Math.exp(-iff*6)+bl*1.5;}
      o.ia=iff>=0?iff:ia;o.c.copy(CH);o.shake=0;o.dist=iff>=0?0.6:0.4;o.flash=iff>=0?1:0.7;
    };
  }},[["normal","Normal"],["sangrado","Sangrado"]],c=>c.bleed?"sangrado":"normal");
};

// =====================================================================
// GOLPE (plantilla tajo · 0,5 s) — barrido contundente, onda de choque corta en el punto de impacto,
// anillo plano en el suelo y temblor ligero (tier 3 solo por el temblor; sin fractura).
// =====================================================================
const SWING_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float d=an-uP;if(d<0.||d>1.4)discard;float t=d/1.4;
 float prof=smoothstep(.34*(1.-t*.5),0.,abs(r-.86))*pow(1.-t,1.6);
 float lead=smoothstep(.06,0.,d)*smoothstep(.2,0.,abs(r-.86));
 float n=noise(vec3(an*6.-uT*10.,r*10.,0.));
 gl_FragColor=vec4(mix(uC2,uC1,1.-t)*1.5+vec3(1.)*lead,(prof*(.55+.45*n)+lead)*uA);}`;
const SHELL_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);
 float n=noise(vP*5.+vec3(uT*8.));
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,fr*(.7+.3*n)*uA);}`;
VFX.basic.GOLPE=function(cfg){
  const HC=-0.6,HT=1.2,TW=0.12,TI=0.19,DUR=0.5,IP=V3(HT-0.32,1.0,0),PV=V3(HC+0.35,1.2,0);
  const A0=1.9, A1=Math.atan2(IP.y-PV.y,IP.x-PV.x);
  return mk(cfg,{key:"basic_golpe",name:"Golpe",pal:"Madera",dur:DUR,ti:TI,tier:3,
    phases:[["Carga",0],["Golpe",TW],["Impacto",TI],["Disipación",0.3]],
  build(a){
    const L=a.L;
    const swing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(SWING_FS,{depthTest:false})); L.trail.add(swing);
    const shell=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),fx(SHELL_FS));
    const ringV=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false}));
    const flash=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(FLASH_FS(8),{depthTest:false}));
    L.mesh.add(shell,ringV,flash);
    const C=`const float TI=${f(TI)};const vec3 IP=${v3(IP)};const float FX=${f(HT-0.1)};`;
    // cascotes hacia delante, polvo en anillo a los pies y chispas
    let n=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.03;float life=.22+aSeed.y*.08;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=normalize(rnd()*vec3(.6,1.,1.)+vec3(1.1,.7,0.))*(2.5+2.*aSeed.z);vec3 p=IP+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,CHIP_FS);
    n+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.04;float life=.24+aSeed.y*.06;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;float rad=.35+(1.-exp(-t*7.))*(.9+.4*aSeed.w);
     vec3 p=vec3(FX+cos(an)*rad,.06+t*.5*aSeed.y,sin(an)*rad);
     vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age):0.;put(p,(.22+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);
    n+=sparks(L.part,140,TI,`${f(IP.x)},${f(IP.y)},.1`,".8,.3,0.",3,8,3.2);
    a.count=n;
    const ground=groundPlane(3.0,HT,0.03,fx(RING_FS)); L.decal.add(ground);
    a.pose=function(te,o){
      const ia=te-TI;
      caster.position.x=HC-0.12*ss(0,TW,te)+0.42*ss(TW,TI,te)-0.3*ss(TI+0.05,DUR-0.02,te);
      caster.rotation.z=0.28*ss(0,TW,te)-0.55*ss(TW,TI,te)+0.27*ss(TI+0.05,DUR-0.02,te);
      caster.scale.set(1,1-0.08*ss(0,TW,te)*(1-ss(TW,TI,te)),1);
      const hit=hitE(ia,6), sq=hitE(ia,11);
      target.position.x=HT+0.22*hit*(1-Math.exp(-Math.max(ia,0)*25)); target.rotation.z=-hit*0.25*Math.cos(ia*15);
      target.scale.set(1+0.1*sq,1-0.16*sq,1+0.1*sq);
      // barrido: arco grueso que cae desde arriba hasta el punto de impacto
      towardCam(swing.position,tmp.set(PV.x+caster.position.x-HC,PV.y,0),0.3); billboard(swing);
      swing.visible=te>=TW-0.03&&te<TI+0.12; set(swing,A0+(A1-A0)*e3((te-TW+0.03)/(TI-TW+0.03)),1-cl((te-TI)/0.12)*(te>TI?1:0));
      let p=cl(ia/0.16); shell.position.copy(IP); shell.visible=ia>=0&&p<1; shell.scale.set(0.2+0.9*e3(p),0.2+0.75*e3(p),0.2+0.9*e3(p)); set(shell,p,Math.pow(1-p,1.5));
      p=cl(ia/0.22); towardCam(ringV.position,IP,0.4); billboard(ringV); ringV.visible=ia>=0&&p<1; set(ringV,p,1-p);
      p=cl(ia/0.12); towardCam(flash.position,IP,0.5); billboard(flash,0.2); flash.visible=ia>=0&&p<1; flash.scale.setScalar(0.6+0.8*p); set(flash,0,Math.pow(1-p,1.4));
      p=cl(ia/0.3); ground.position.x=target.position.x-0.1; set(ground,1-Math.pow(1-p,2),ia>=0?0.85*(1-p):0);
      if(ia<0){const w=ss(0,TW,te);o.g.set(caster.position.x+0.6,1.2,0.2);o.gs=0.6*w;o.ga=0.2*w;o.li=1.4*w+2*ss(TW,TI,te);}
      else{o.g.copy(IP);o.gs=1.2+3.2*ia;o.ga=Math.exp(-ia*12)*0.7;o.li=8*Math.exp(-ia*7);}
      o.ia=ia;o.c.copy(IP);o.shake=0.35;o.dist=0.9;
    };
  }});
};

// =====================================================================
// EMBESTIDA (plantilla lanza · 0,8 s) — carga con estela desde el lanzador y cuña de fuerza delante,
// impacto grande con polvo y salpicadura. Opción push 1|2: el objetivo retrocede con flecha y polvo de arrastre.
// =====================================================================
const CHARGE_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=noise(vec3(u*8.-uT*14.,v*3.,uT));
 float body=smoothstep(.15+.85*u*(.6+.4*n),0.,v)*pow(u,1.3);
 float lines=smoothstep(.6,1.,noise(vec3(u*2.-uT*8.,v*9.,1.)))*u;
 gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.2,0.,v)*u*.45,(body*.8+lines*.5)*uA);}`;
const WEDGE_FS=`void main(){vec2 p=(vUv-.5)*2.;
 float c1=abs(p.x+abs(p.y)*.9-.25),c2=abs(p.x+abs(p.y)*.9+.25);
 float m=smoothstep(.12,0.,c1)*step(abs(p.y),.8)+smoothstep(.1,0.,c2)*step(abs(p.y),.6)*.6;
 float n=noise(vec3(p*3.+vec2(uT*12.,0.),uT));
 m*=smoothstep(1.,.4,length(p))*(.6+.6*n);
 gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.6+vec3(1.)*m*.3,m*uA);}`;
VFX.basic.EMBESTIDA=function(cfg){
  const HC=-2.6,HT=1.6,XC=HT-0.85,TC=0.12,TI=0.34,DUR=0.8,IP=V3(XC+0.45,0.85,0),PUSH={normal:0,empuje:1,empuje2:2};
  const cx=te=>{
    if(te<TC)return HC-0.18*ss(0,TC,te);
    if(te<TI){const k=(te-TC)/(TI-TC);return HC-0.18+(XC-HC+0.18)*Math.pow(k,1.7);}
    return XC-0.3*ss(TI,TI+0.1,te)-(XC-0.3-HC)*ss(TI+0.12,DUR-0.04,te);
  };
  return mk(cfg,{key:"basic_embestida",name:"Embestida",pal:"Baba",dur:DUR,ti:TI,tier:2,
    phases:[["Arranque",0],["Carga",TC],["Impacto",TI],["Regreso",0.46]],
  build(a){
    const L=a.L,VG=variantGroups(a,["empuje"]),uD={value:0};
    const tg=new THREE.PlaneGeometry(1,1.1).translate(-0.5,0,0), tm=fx(CHARGE_FS);
    const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2; trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
    const wedge=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(WEDGE_FS,{depthTest:false}));
    const ringV=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false}));
    const flash=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(FLASH_FS(8),{depthTest:false}));
    L.mesh.add(wedge,ringV,flash);
    const C=`const float TC=${f(TC)};const float TI=${f(TI)};const vec3 IP=${v3(IP)};
    float cxs(float t){float k=clamp((t-TC)/(TI-TC),0.,1.);return ${f(HC-0.18)}+${f(XC-HC+0.18)}*pow(k,1.7);}`;
    // polvo levantado por la carrera
    let base=points(L.part,40,C+`void main(){float s=TC+aSeed.x*(TI-TC);float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=vec3(cxs(s)-.3,.06,(aSeed.z-.5)*.6)+vec3(-.6*t,t*(.5+.4*aSeed.w),(aSeed.z-.5)*.6*t);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.16+.16*aSeed.w)*(.6+age));}`,DUST_FS,NB);
    // impacto: nube de polvo, corona de salpicadura y chispas
    base+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.06;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()*vec3(.7,.5,1.)+vec3(.6,.45,0.));vec3 p=IP+vec3(0.,-.5,0.)+d*(.3+1.2*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,t*.4,0.);p.y=max(p.y,.08);
     vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.3+.3*aSeed.w)*(.6+age*.9));}`,DUST_FS,NB);
    base+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.04;float life=.3+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(vec3(.5+aSeed.w,1.2+aSeed.y,(aSeed.z-.5)*2.4));vec3 p=IP+d*(2.5+2.*aSeed.x)*t+vec3(0.,-8.5*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>.03)?1.-age*.6:0.;put(p,.08+.06*aSeed.w);}`,DROP_FS("mix(uC1,uC2,vMix)*1.3"));
    base+=sparks(L.part,150,TI,`${f(IP.x)},${f(IP.y)},0.`,"1.,.4,0.",3,9,3.2);
    const kit=pushKit(VG.empuje,V3(HT,0,0),V3(1,0,0),TI,uD,DUR);
    const shock=groundPlane(3.6,IP.x,0.03,fx(RING_FS)); L.decal.add(shock);
    a.setVariant=v=>{if(!(v in PUSH))v="normal";a.v=v;uD.value=PUSH[v]*PT;const on=PUSH[v]>0;
      for(const k of VFX.LK)VG.empuje[k].visible=on; a.count=base+(on?kit.n:0);};
    a.pose=function(te,o){
      const ia=te-TI, x=cx(te), dash=te>=TC&&te<TI?(te-TC)/(TI-TC):0;
      caster.position.x=x;
      caster.rotation.z=0.2*ss(0,TC,te)-0.45*ss(TC,TC+0.06,te)+0.45*ss(TI,TI+0.12,te)-0.2*ss(TI+0.12,DUR-0.04,te);
      caster.scale.set(1+0.12*dash,1-0.1*ss(0,TC,te)*(1-ss(TC,TC+0.05,te)),1);
      trail.visible=te>TC&&ia<0.25; trail.position.set(x+0.25,0.75,0); trail.scale.set(Math.max(x-(HC-0.18),0.001),1,1);
      tm.uniforms.uA.value=ia>0?1-cl(ia/0.25):ss(TC,TC+0.05,te);
      towardCam(wedge.position,tmp.set(x+0.5,0.85,0),0.3); billboard(wedge); wedge.visible=dash>0;
      wedge.scale.setScalar(0.7+0.5*dash); wedge.material.uniforms.uA.value=ss(0,0.25,dash);
      let p=cl(ia/0.3); towardCam(ringV.position,IP,0.4); billboard(ringV); ringV.visible=ia>=0&&p<1; set(ringV,p,(1-p)*0.9);
      p=cl(ia/0.16); towardCam(flash.position,IP,0.5); billboard(flash,0.15); flash.visible=ia>=0&&p<1; flash.scale.setScalar(0.6+0.8*p); set(flash,0,Math.pow(1-p,1.4));
      p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
      const D=uD.value, hit=hitE(ia,6);
      target.position.x=HT+(D>0?kit.disp(te)+0.08*hit:0.3*hit*(1-Math.exp(-Math.max(ia,0)*25)));
      target.rotation.z=-hit*0.3*Math.cos(ia*14);
      if(D>0)kit.upd(te);
      if(te<TC){o.g.set(HC+0.4,0.9,0);o.gs=0.7*ss(0,TC,te);o.ga=0.2*ss(0,TC,te);o.li=1.5*ss(0,TC,te);}
      else if(te<TI){o.g.set(x+0.55,0.9,0);o.gs=1.3;o.ga=0.45;o.li=3.5;}
      else{o.g.copy(IP);o.gs=1.4+3.5*ia;o.ga=Math.exp(-ia*11)*0.7;o.li=8*Math.exp(-ia*5);}
      o.ia=ia;o.c.copy(IP);o.shake=0;o.dist=0.9;
    };
  }},[["normal","Normal"],["empuje","Empuje 1"],["empuje2","Empuje 2"]],c=>(c.push|0)>=2?"empuje2":(c.push|0)>=1?"empuje":"normal");
};

// =====================================================================
// ESTOCADA (plantilla lanza · 0,5 s) — hoja de luz recta, fina y muy rápida con destello en la punta;
// impacto pequeño y preciso con chispas que salen por detrás del objetivo.
// =====================================================================
const BLADE_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float core=smoothstep(.16*(1.-u*.7),0.,v);float glow=smoothstep(1.,0.,v)*.25;
 float n=noise(vec3(u*20.-uT*30.,v,0.));
 gl_FragColor=vec4(mix(uC2,uC1,.4+.6*u)*1.5+vec3(1.)*(core*.6+pow(u,6.)),(core+glow*(.5+.5*n))*(.35+.65*u)*uA);}`;
const GLINT_FS=`void main(){vec2 q=(vUv-.5)*2.;vec2 a=abs(q);
 float s=smoothstep(.06,0.,a.x*a.y*4.+min(a.x,a.y)*.5)*smoothstep(1.,.1,max(a.x,a.y));
 float c=smoothstep(.3,0.,length(q));
 gl_FragColor=vec4(mix(uC1,vec3(1.),.6+.4*c)*1.8,(s+c)*uA);}`;
const AFTER_FS=`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
 float l=smoothstep(.07,0.,abs(abs(v)-.55))*(1.-abs(v)*.3);
 float n=noise(vec3(u*10.-uT*25.,v*3.,0.));
 gl_FragColor=vec4(mix(uC2,uC1,u)*1.3,l*pow(u,1.2)*(.4+.6*n)*uA*.6);}`;
const LINE_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float m=smoothstep(.35,0.,v)*step(u,uP)*smoothstep(0.,.2,u);
 gl_FragColor=vec4(mix(uC2,uC1,u)*1.3,m*.45*uA);}`;
VFX.basic.ESTOCADA=function(cfg){
  const HC=-0.6,HT=1.2,TL=0.1,TI=0.17,DUR=0.5,Y=1.18,E=HT-0.36;
  return mk(cfg,{key:"basic_estocada",name:"Estocada",pal:"Naturaleza",dur:DUR,ti:TI,tier:2,
    phases:[["Guardia",0],["Estocada",TL],["Impacto",TI],["Retirada",0.27]],
  build(a){
    const L=a.L;
    const bg=new THREE.PlaneGeometry(1,0.14).translate(0.5,0,0), bm=fx(BLADE_FS);
    const blade=new THREE.Group(), b2=new THREE.Mesh(bg,bm); b2.rotation.x=Math.PI/2; blade.add(new THREE.Mesh(bg,bm),b2); L.trail.add(blade);
    const after=new THREE.Mesh(new THREE.PlaneGeometry(1,0.55).translate(0.5,0,0),fx(AFTER_FS)); L.trail.add(after);
    const glint=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(GLINT_FS,{depthTest:false}));
    const ringV=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(RING_FS,{depthTest:false}));
    const flash=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(FLASH_FS(4),{depthTest:false}));
    L.mesh.add(glint,ringV,flash);
    const C=`const float TL=${f(TL)};const float TI=${f(TI)};`;
    // motas que deja la hoja al pasar
    let n=points(L.part,50,C+`void main(){float s=TL+aSeed.x*(TI-TL);float k=(s-TL)/(TI-TL);float life=.15+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=vec3(mix(${f(HC+0.3)},${f(E)},k),${f(Y)},0.)+r*.04+vec3(-.3*t,r.y*.3*t,r.z*.3*t);
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.02+.025*aSeed.z)*(1.-age*.5));}`);
    // perforación: pocas chispas de entrada y un chorro estrecho que sale por detrás
    n+=sparks(L.part,40,TI,`${f(E)},${f(Y)},0.`,"-.6,.2,.4",1.5,4,2.5);
    n+=sparks(L.part,60,TI+0.01,`${f(HT+0.3)},${f(Y)},0.`,"1.4,.1,0.",2,7,2.5);
    a.count=n;
    const line=new THREE.Mesh(new THREE.PlaneGeometry(1,0.3).translate(0.5,0,0).rotateX(-Math.PI/2),fx(LINE_FS));
    const dot=groundPlane(1.2,HT,0.03,fx(RING_FS)); L.decal.add(line,dot);
    a.pose=function(te,o){
      const ia=te-TI;
      caster.position.x=HC-0.1*ss(0,TL,te)+0.4*ss(TL,TI,te)-0.3*ss(TI+0.08,DUR-0.04,te);
      caster.rotation.z=0.15*ss(0,TL,te)-0.35*ss(TL,TI,te)+0.2*ss(TI+0.08,DUR-0.04,te);
      const hit=hitE(ia,9);
      target.position.x=HT+0.1*hit; target.rotation.z=-hit*0.12*Math.cos(ia*20);
      const S0=caster.position.x+0.38;
      const tip=te<TL?S0:(te<TI?S0+(E-S0)*Math.pow((te-TL)/(TI-TL),0.8):E+0.2*ss(TI,TI+0.04,te));
      const bs=S0+(tip-S0)*ss(TI+0.05,TI+0.2,te), on=ss(TL-0.01,TL+0.02,te)*(1-ss(TI+0.12,TI+0.21,te));
      blade.visible=te>=TL-0.01&&te<TI+0.21; blade.position.set(bs,Y,0); blade.scale.set(Math.max(tip-bs,0.001),1,1); bm.uniforms.uA.value=on;
      after.visible=te>=TL&&te<TI+0.12; after.position.set(S0-0.2,Y,0); after.scale.set(Math.max(tip-S0+0.2,0.001),1,1);
      after.material.uniforms.uA.value=ss(TL,TL+0.02,te)*(1-ss(TI,TI+0.12,te));
      // destello de la punta: se carga en guardia, viaja con la punta y brilla al clavarse
      const gsz=te<TL?0.25+0.25*ss(0,TL,te):(ia<0?0.55:0.55+0.45*Math.exp(-ia*20)-0.55*ss(TI+0.05,TI+0.2,te));
      towardCam(glint.position,tmp.set(tip,Y,0),0.3); billboard(glint,te*6); glint.visible=te<TI+0.2;
      glint.scale.setScalar(Math.max(gsz,0.001)); glint.material.uniforms.uA.value=ss(0,0.05,te)*(1-ss(TI+0.1,TI+0.2,te));
      let p=cl(ia/0.15); towardCam(ringV.position,tmp.set(E,Y,0),0.4); billboard(ringV); ringV.visible=ia>=0&&p<1; set(ringV,p,1-p);
      p=cl(ia/0.1); towardCam(flash.position,tmp.set(E,Y,0),0.45); billboard(flash,0.78); flash.visible=ia>=0&&p<1; flash.scale.setScalar(0.6+0.6*p); set(flash,0,Math.pow(1-p,1.4));
      line.position.set(S0,0.022,0); line.scale.set(Math.max(E+0.2-S0,0.001),1,1); set(line,cl((tip-S0)/(E+0.2-S0)),on);
      p=cl(ia/0.25); dot.position.x=target.position.x; set(dot,p,ia>=0?0.7*(1-p):0);
      if(ia<0){o.g.set(tip,Y,0.2);o.gs=te<TL?0.5:0.8;o.ga=te<TL?0.2*ss(0,TL,te):0.4;o.li=te<TL?1.2*ss(0,TL,te):3;}
      else{o.g.set(E,Y,0.2);o.gs=0.8+1.8*ia;o.ga=Math.exp(-ia*14)*0.55;o.li=5*Math.exp(-ia*8);}
      o.ia=ia;o.c.set(E,Y,0);o.shake=0;o.dist=0.35;
    };
  }});
};

// =====================================================================
// GOLPE_SISMICO (plantilla area · 1,0 s) — salto y pisotón: una columna de presión aplasta el centro,
// grietas que se abren (oscuras con borde incandescente) + fractura de baldosa, rocas que saltan y
// anillo de polvo hasta el radio del área. Opción radius (casillas, 1 por defecto). Temblor fuerte.
// =====================================================================
const STOMP_FS=`void main(){float h=vP.y/2.4+.5;float an=atan(vP.z,vP.x);
 float n=noise(vec3(an*3.,h*4.+uT*14.,uT))*.6+noise(vec3(an*8.,h*9.+uT*20.,2.))*.4;
 float st=smoothstep(.45,.8,n);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
 float bot=pow(1.-h,1.5);
 gl_FragColor=vec4(mix(uC2,uC1,st*.7+bot*.5)*1.4+vec3(1.)*bot*st*.4,(st*.6+fr*.5)*(.25+bot)*smoothstep(1.,.75,h)*uA);}`;
const SLAM_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float disc=smoothstep(uP,uP*.6,r);float rim=band(r,uP,.08);
 gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.6,(disc*.6+rim)*uA);}`;
// grietas radiales dentadas; reach avanza con uP; misma función para la capa oscura y la incandescente
const FIS=R=>`void main(){vec2 p=(vUv-.5)*${f(R*2)};float r=length(p);float an=atan(p.y,p.x);
 float j=noise(vec3(r*3.,an*1.5,7.))-.5;
 float ray=1.-abs(fract(an*${f(7/6.2832)}+j*.35)*2.-1.);
 float ray2=(1.-abs(fract(an*${f(13/6.2832)}+j*.6+.31)*2.-1.))*smoothstep(${f(R*0.3)},${f(R*0.65)},r);
 float reach=smoothstep(uP*${f(R)}+.05,uP*${f(R)}-.25,r)*smoothstep(${f(R)},${f(R*0.8)},r)*smoothstep(.05,.25,r);
 float wid=(.05+.09*uP)*(1.-r/${f(R*1.1)});
 float cr=max(smoothstep(1.-wid,1.,ray),smoothstep(1.-wid*.6,1.,ray2)*.8)*reach;
 float gw=max(smoothstep(1.-wid*2.6,1.,ray),smoothstep(1.-wid*1.6,1.,ray2)*.7)*reach;`;
const ROCK_FS=`void main(){float n=noise(vP*5.)*.6+noise(vP*11.)*.4;
 float lit=.4+.6*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
 vec3 base=mix(vec3(.2,.18,.16),vec3(.42,.38,.33),n);base=mix(base,uC2,.25);
 float seam=pow(1.-abs(noise(vP*4.+3.)*2.-1.),10.);
 gl_FragColor=vec4(base*lit+uC1*seam*1.4*uA,1.);}`;
VFX.basic.GOLPE_SISMICO=function(cfg){
  cfg=cfg||{};
  const HC=-1.1,HT=1.1,TR=0.26,TI=0.42,DUR=1.0,R=0.5+(cfg.radius||1),RF=R+0.2,TFS=Math.max(4.2,R*2.8);
  return mk(cfg,{key:"basic_golpe_sismico",name:"Golpe sísmico",pal:"Tierra",dur:DUR,ti:TI,tier:3,
    phases:[["Salto",0],["Pisotón",TR],["Impacto",TI],["Grietas",0.55],["Polvo",0.75]],
  build(a){
    const L=a.L;
    const stomp=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.95,2.4,32,1,true),fx(STOMP_FS)); L.trail.add(stomp);
    // rocas: parámetros fijos por instancia; la pose solo los evalúa en el tiempo
    const rockMat=fx(ROCK_FS,SOLID), rocks=[];
    for(let i=0;i<8;i++){const an=i/8*Math.PI*2+Math.random()*0.5, r0=0.35+Math.random()*R*0.45, sp=0.5+Math.random();
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),rockMat);
      m.userData={x:Math.cos(an)*r0,z:Math.sin(an)*r0,vx:Math.cos(an)*sp,vz:Math.sin(an)*sp,vy:2.6+Math.random()*1.6,s:0.09+Math.random()*0.09,
        rx:Math.random()*12-6,ry:Math.random()*12-6,rz:Math.random()*12-6,d:r0/R*0.12};
      rocks.push(m); L.mesh.add(m);}
    const C=`const float TI=${f(TI)};const float HT=${f(HT)};const float R=${f(R)};`;
    // anillo de polvo que se expande hasta el radio del área
    let n=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.06;float life=.45+aSeed.y*.1;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;float rad=mix(.3,R*(.85+.2*aSeed.w),1.-exp(-t*5.));
     vec3 p=vec3(HT+cos(an)*rad,.08+.35*aSeed.y*(1.-exp(-t*3.))+t*.2,sin(an)*rad);
     vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.3+.3*aSeed.y)*(.7+age*.8));}`,DUST_FS,NB);
    // cascotes que brotan al paso del frente de grietas
    n+=points(L.part,70,C+`void main(){float an=aSeed.z*6.2832;float r0=sqrt(aSeed.w)*R*.8;
     float s=TI+r0/R*.22+aSeed.x*.05;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 v=vec3(cos(an)*(.4+.8*aSeed.x),2.5+2.5*aSeed.y,sin(an)*(.4+.8*aSeed.x));
     vec3 p=vec3(HT+cos(an)*r0,.05,sin(an)*r0)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.06*aSeed.x);}`,CHIP_FS);
    n+=sparks(L.part,120,TI,`${f(HT)},.2,0.`,"0.,.8,0.",3,9,3.5);
    a.count=n;
    const slam=groundPlane(2.4,HT,0.03,fx(SLAM_FS));
    const fisGlow=groundPlane(RF*2,HT,0.02,fx(FIS(RF)+`gl_FragColor=vec4(mix(uC2,uC1,cr)*1.8+vec3(1.)*cr*uA*.3,gw*.8*uA);}`));
    const fisDark=groundPlane(RF*2,HT,0.024,fx(FIS(RF)+`gl_FragColor=vec4(vec3(.03,.02,.015),cr*.9*uA);}`,NB)); fisDark.renderOrder=2;
    const frac=groundPlane(TFS,HT,0.025,fx(tileFractureFS(TFS)));
    const dustRing=groundPlane(R*2/0.95,HT,0.03,fx(RING_FS));
    L.decal.add(slam,fisGlow,fisDark,frac,dustRing);
    a.pose=function(te,o){
      const ia=te-TI, rk=cl((te-TR)/(TI-TR));
      caster.position.x=HC+0.35*ss(0.1,TI,te)-0.35*ss(TI+0.15,DUR-0.05,te);
      caster.position.y=te<TR?0.45*ss(0,TR,te):(te<TI?0.45*(1-rk*rk):0);
      caster.rotation.z=0.25*ss(0,TR,te)-0.5*ss(TR,TI,te)+0.25*ss(TI+0.1,DUR-0.08,te);
      const sq=hitE(ia,10), st=te<TI?0.08*ss(0,TR,te)*(1-rk):0;
      caster.scale.set(1+0.12*sq,1+st-0.18*sq,1+0.12*sq);
      // columna de presión: cae del cielo, toca el suelo en el impacto y se aplasta
      const ys=ia<0?1:1-0.85*cl(ia/0.12);
      stomp.visible=te>=TR&&ia<0.16; stomp.position.set(HT,(ia<0?1.2+3.0*(1-rk*rk):1.2*ys),0); stomp.scale.set(1+0.25*(1-ys),ys,1+0.25*(1-ys));
      set(stomp,0,ss(TR,TR+0.06,te)*(ia<0?1:1-cl(ia/0.16)));
      let p=cl(ia/0.18); set(slam,0.3+0.7*e3(p),ia>=0?1-p:0);
      const fp=e3(ia/0.25);
      set(fisGlow,fp,ia>=0?Math.exp(-ia*3)*(1-ss(0.85,DUR,te)):0);
      set(fisDark,fp,ia>=0?1-ss(0.75,DUR,te):0);
      set(frac,1-Math.pow(1-cl(ia/0.35),2),ia>=0?1-ss(0.7,DUR,te):0);
      p=cl(ia/0.4); set(dustRing,0.2+0.8*e3(p),ia>=0?0.8*(1-p*p):0);
      rockMat.uniforms.uA.value=ia>=0?Math.exp(-ia*3):0;
      for(const m of rocks){const u=m.userData,t=Math.max(ia-u.d,0),tl=u.vy/4.5,tt=Math.min(t,tl);
        m.visible=ia>=u.d&&te<0.97;
        m.position.set(HT+u.x+u.vx*tt,0.05+u.vy*tt-4.5*tt*tt,u.z+u.vz*tt); m.rotation.set(u.rx*tt,u.ry*tt,u.rz*tt);
        m.scale.setScalar(Math.max(u.s*ss(0,0.04,t)*(1-ss(0.68,0.97,te)),0.001));}
      const air=ia>0?Math.sin(Math.PI*cl(ia/0.35)):0, hit=hitE(ia,6);
      target.position.set(HT,0.35*air,0); target.rotation.z=-hit*0.3*Math.cos(ia*13);
      if(te<TR){o.g.set(caster.position.x+0.3,1.4,0);o.gs=0.8*ss(0,TR,te);o.ga=0.2*ss(0,TR,te);o.li=1.5*ss(0,TR,te);}
      else if(ia<0){o.g.set(HT,stomp.position.y-0.8,0);o.gs=1.5;o.ga=0.45;o.li=4;}
      else{o.g.set(HT,0.5,0);o.gs=2+4*Math.min(ia,0.5);o.ga=Math.exp(-ia*9)*0.7;o.li=11*Math.exp(-ia*4.5);}
      o.ia=ia;o.c.set(HT,0.4,0);o.shake=0.9;o.dist=1.1;
    };
  }});
};

// =====================================================================
// GIRO_EMPUJE (plantilla area · 0,9 s) — remolino de hojas/pétalos alrededor del lanzador; al soltarse,
// una ráfaga en cruz golpea las casillas vecinas y las empuja hacia fuera (push 1|2, 1 por defecto).
// Opción vecinos: además del objetivo, dos rivales en otras casillas vecinas (izquierda y detrás).
// =====================================================================
const WIND_RIB_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=noise(vec3(u*8.-uT*9.,v*2.,uP));float s=smoothstep(.3,.75,n);
 gl_FragColor=vec4(mix(uC2,uC1,s)*1.5+vec3(1.)*s*.2,s*smoothstep(1.,.3,v)*smoothstep(0.,.1,u)*smoothstep(1.,.75,u)*uA);}`;
const WIND_SHELL_FS=`void main(){float h=vP.y/1.8+.5;float an=atan(vP.z,vP.x);
 float n=noise(vec3(an*3.+uT*12.,h*5.,uT*.5));float st=smoothstep(.55,.85,n);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
 gl_FragColor=vec4(mix(uC2,uC1,st)*1.3,(st*.55+fr*.25)*smoothstep(0.,.15,h)*smoothstep(1.,.6,h)*uA);}`;
const SWIRL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float sp=fract(an/6.2832*3.+r*1.5+uT*2.5);
 float m=band(sp,.5,.12)*smoothstep(1.,.5,r)*smoothstep(.1,.3,r)+band(r,.95,.03);
 gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*uA*.75);}`;
VFX.basic.GIRO_EMPUJE=function(cfg){
  cfg=cfg||{};
  const C0=-0.6,DN=1.6,TB=0.38,TI=0.44,DUR=0.9,GS=2*(DN+0.6);
  const NB0=V3(C0+DN,0,0),NB1=V3(C0-DN,0,0),NB2=V3(C0,0,-DN);
  const GUST_FS=`void main(){vec2 p=(vUv-.5)*${f(GS)};float r=length(p);float an=atan(p.y,p.x);
   float lobe=pow(abs(cos(an*2.)),6.);float fr=uP*${f(DN+0.2)};
   float wave=smoothstep(.45,0.,fr-r)*step(r,fr+.05)*smoothstep(.25,.5,r);
   float chev=step(.5,fract(r*2.5-abs(sin(an*2.))*1.2-uT*6.));
   float edge=band(r,fr,.06)*lobe;
   gl_FragColor=vec4(mix(uC2,uC1,wave)*1.4+vec3(1.)*edge*.5,(lobe*wave*(.45+.4*chev)+edge)*uA);}`;
  const def=mk(cfg,{key:"basic_giro_empuje",name:"Giro de empuje",pal:"Naturaleza",dur:DUR,ti:TI,tier:2,
    phases:[["Remolino",0],["Ráfaga",TB],["Impacto",TI],["Empuje",0.6]],
  build(a){
    const L=a.L,VG=variantGroups(a,["vecinos"]),uD={value:(cfg.push==null?1:cfg.push)*PT};
    // vórtice: tres cintas en hélice + cáscara de viento, colgados de un grupo que gira
    const vortex=new THREE.Group(); vortex.position.set(C0,0,0); L.mesh.add(vortex); const rib=[];
    for(let i=0;i<3;i++){const m=fx(WIND_RIB_FS); m.uniforms.uP.value=i*2.7; rib.push(m);
      const r=new THREE.Mesh(helixGeo(1.3,0.85,0.55,1.9,0.22,80),m); r.position.y=0.1; r.rotation.y=i*2.094; vortex.add(r);}
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.8,1.8,40,1,true),fx(WIND_SHELL_FS)); shell.position.y=0.95; vortex.add(shell);
    const mkRing=g=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),fx(RING_FS,{depthTest:false}));g.add(m);return m;};
    const rings=[mkRing(L.mesh),mkRing(VG.vecinos.mesh),mkRing(VG.vecinos.mesh)];
    // hojas/pétalos: orbitan y se cierran durante el giro; al soltarse salen despedidos hacia fuera
    let base=points(L.part,160,`varying float vR;const float TB=${f(TB)};
     void main(){float tb=max(uT-TB,0.);float a2=aSeed.x*6.2832+min(uT,TB)*(7.+3.*aSeed.y)+tb*2.;
      float rad=.75+.25*aSeed.z-.2*smoothstep(0.,TB,uT)+(1.-exp(-tb*4.))*(1.6+1.2*aSeed.w);
      float y=.15+aSeed.w*1.6+sin(uT*5.+aSeed.x*9.)*.08+.25*smoothstep(0.,TB,uT)-tb*.4;
      vec3 p=vec3(${f(C0)}+cos(a2)*rad,y,sin(a2)*rad);
      vA=smoothstep(0.,.12,uT-aSeed.y*.1)*(1.-smoothstep(.62,.86,uT));vR=a2*1.3+aSeed.z*6.+uT*8.;
      put(p,.13+.08*aSeed.y);}`,LEAF_FS);
    base+=sparks(L.part,80,TI,`${f(NB0.x-0.3)},1.1,0.`,"1.,.3,0.",2,6,2.8);
    let vn=sparks(VG.vecinos.part,60,TI,`${f(NB1.x+0.3)},1.1,0.`,"-1.,.3,0.",2,6,2.8)
      +sparks(VG.vecinos.part,60,TI,`${f(C0)},1.1,${f(NB2.z+0.3)}`,"0.,.3,-1.",2,6,2.8);
    const k0=pushKit(L,NB0,V3(1,0,0),TI,uD,DUR), k1=pushKit(VG.vecinos,NB1,V3(-1,0,0),TI,uD,DUR), k2=pushKit(VG.vecinos,NB2,V3(0,0,-1),TI,uD,DUR);
    base+=k0.n; vn+=k1.n+k2.n;
    const swirl=groundPlane(2.4,C0,0.02,fx(SWIRL_FS)), gust=groundPlane(GS,C0,0.028,fx(GUST_FS)), shock=groundPlane(2*(DN+0.8),C0,0.03,fx(RING_FS));
    L.decal.add(swirl,gust,shock);
    a.setVariant=v=>{if(v!=="vecinos")v="uno";a.v=v;const on=v==="vecinos";
      for(const k of VFX.LK)VG.vecinos[k].visible=on; a.count=base+(on?vn:0);};
    a.pose=function(te,o){
      const ia=te-TI, spin=ss(0,0.12,te)*(1-ss(TB,TB+0.06,te)), bk=cl((te-TB)/0.22), nb=a.v==="vecinos";
      caster.position.set(C0,0.12*Math.sin(Math.PI*cl(te/TI)),0);
      caster.rotation.z=0.1*Math.sin(te*34)*spin;
      caster.scale.set(1,1-0.06*ss(TB-0.1,TB,te)*(1-ss(TB,TB+0.1,te)),1);
      const va=ss(0,0.1,te)*(1-ss(TB+0.04,TB+0.24,te))*(1+0.5*ss(TB-0.1,TB,te)), vs=1+1.4*(te>=TB?e3(bk):0);
      vortex.rotation.y=te*(10+8*ss(0,TB,te)); vortex.scale.set(vs,1-0.3*(te>=TB?e3(bk):0),vs);
      for(const m of rib)m.uniforms.uA.value=va; shell.material.uniforms.uA.value=va*0.8;
      swirl.material.uniforms.uA.value=ss(0,0.1,te)*(1-ss(TB,TB+0.2,te));
      set(gust,e3(bk),te>=TB?1-ss(TI+0.1,TI+0.35,te):0);
      let p=cl((te-TB)/0.4); set(shock,1-Math.pow(1-p,2),te>=TB?0.7*(1-p):0);
      // vecinos golpeados y empujados hacia fuera
      const hit=hitE(ia,7), d0=k0.disp(te), d1=k1.disp(te), d2=k2.disp(te);
      target.position.x=NB0.x+d0+0.08*hit; target.rotation.z=-hit*0.25*Math.cos(ia*14);
      k0.upd(te);
      if(nb){enemies[0].position.set(NB1.x-d1-0.08*hit,0,0); enemies[0].rotation.z=hit*0.25*Math.cos(ia*14);
        enemies[1].position.set(C0,0,NB2.z-d2-0.08*hit); enemies[1].rotation.z=hit*0.12*Math.sin(ia*14); k1.upd(te); k2.upd(te);}
      const rp=[[target.position.x,0],[NB1.x-d1,0],[C0,NB2.z-d2]];
      p=cl(ia/0.28);
      rings.forEach((m,i)=>{towardCam(m.position,tmp.set(rp[i][0],1.1,rp[i][1]),0.45); billboard(m); m.visible=ia>=0&&p<1&&(i===0||nb); set(m,p,1-p);});
      if(te<TB){o.g.set(C0,1.0,0);o.gs=1.4*spin+0.4;o.ga=0.25*spin;o.li=3*spin;}
      else if(ia<0){o.g.set(C0+DN*0.6*e3(bk),1.0,0);o.gs=1.6;o.ga=0.35;o.li=4;}
      else{o.g.set(target.position.x-0.2,1.1,0);o.gs=1.2+2.5*ia;o.ga=Math.exp(-ia*11)*0.55;o.li=6*Math.exp(-ia*6);}
      o.ia=ia;o.c.set(target.position.x-0.2,1.1,0);o.shake=0;o.dist=0.7;
    };
  }},[["uno","1 rival"],["vecinos","Vecinos"]],c=>c.vecinos?"vecinos":"uno");
  def.enemies=()=>def.v==="vecinos"?2:0;
  return def;
};

VFX.module("Básicos · Cuerpo a cuerpo",[
  VFX.basic.MORDISCO({key:"basic_mordisco",name:"Mordisco",pal:"Salvaje",demo:true}),
  VFX.basic.ZARPAZO({key:"basic_zarpazo",name:"Zarpazo",pal:"Hielo",demo:true}),
  VFX.basic.GOLPE({key:"basic_golpe",name:"Golpe",pal:"Madera",demo:true}),
  VFX.basic.EMBESTIDA({key:"basic_embestida",name:"Embestida",pal:"Baba",demo:true}),
  VFX.basic.ESTOCADA({key:"basic_estocada",name:"Estocada",pal:"Naturaleza",demo:true}),
  VFX.basic.GOLPE_SISMICO({key:"basic_golpe_sismico",name:"Golpe sísmico",pal:"Tierra",demo:true}),
  VFX.basic.GIRO_EMPUJE({key:"basic_giro_empuje",name:"Giro de empuje",pal:"Naturaleza",demo:true})
]);
})();

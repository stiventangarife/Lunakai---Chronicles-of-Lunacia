// =====================================================================
// ESTILIZADO · CONTROL Y APOYO — versiones con el kit vfx-stylized.js de las fábricas de mod-basicos-apoyo.js.
// VFX.sty.basic.TIPO(cfg) recibe el mismo cfg que VFX.basic.TIPO ({key,name,pal,...opciones}) y devuelve una habilidad
// nueva con los MISMOS tiempos de impacto (ti), nivel, anclas de diseño (muñecos en reposo) y allies que la original.
// Las instancias de enemigos se registran en mod-estilizado-enemigos.js con la clave sty__<id del hechizo>.
// Tipos: ESPINAS · ENREDO · NUBE_ESPORAS · RUGIDO · AUTOBUFF · ESCUDO · CURA
// Estilo (Hito 99): materia con mezcla normal y luz del sol en 3 bandas, núcleos de energía pequeños, rampas de color,
// erosión desde el borde, sin contornos. Estados con S.status (sangrado, veneno, provocación, aturdimiento).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,enemies,allies,ALLY_POS,LK}=VFX;
const {v3,billboard,towardCam,taperTube}=VFX.lib;
const S=VFX.sty, C=S.CELL, B=S.basic;
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.6,.48,.34)";                 // polvo de tierra (color del camino del tablero)
const MO=V3(-3.47,1.55,0);                       // boca del lanzador
const TX=3.4, TC=V3(3.15,1.2,0);                 // objetivo: base x y pecho visible
const easeO=x=>1-Math.pow(1-cl(x),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;
const bez=(a,m,b,u,out)=>{const w0=(1-u)*(1-u),w1=2*u*(1-u),w2=u*u;return out.set(a.x*w0+m.x*w1+b.x*w2,a.y*w0+m.y*w1+b.y*w2,a.z*w0+m.z*w1+b.z*w2);};

// ---------- fábrica local (como la de mod-basicos-apoyo.js): opciones como capas que se encienden/apagan ----------
// opt(nombre) → {part,decal,mesh,trail, own(st)}: grupos por capa dentro del anclaje; own() registra un S.status de la opción
function factory(spec){
  return function(cfg){
    cfg=cfg||{};
    const fixed=spec.flags(cfg);
    const def={key:cfg.key||spec.key,name:cfg.name||spec.name,pal:cfg.pal||spec.pal,dur:spec.dur,ti:spec.ti,tier:spec.tier,
      stylized:true,phases:spec.phases.map(p=>p.slice())};
    if(spec.allies)def.allies=()=>spec.allies(def.o||fixed);
    // Hito 113: efecto sobre el propio lanzador (escudo de slime/oso/ent): el receptor ya se dibuja en el lanzador, el puente no lo desplaza
    if(fixed.self)def.receiver='caster';
    if(cfg.demo&&spec.variants){
      def.variants=spec.variants.map(v=>[v[0],v[1]]); def.v=spec.variants[0][0]; def.vlabel="Opción";
      if(spec.variants.some(v=>v[3]))def.pal=()=>{const e=spec.variants.find(x=>x[0]===def.v);return (e&&e[3])||cfg.pal||spec.pal;};
    }
    def.build=function(a){
      const O={};
      const opt=name=>{
        if(!O[name]){const g={st:[]};for(const k of LK){g[k]=new THREE.Group();(a.F||a.L)[k].add(g[k]);}g.own=st=>{g.st.push(st);return st;};O[name]=g;}
        return O[name];
      };
      const apply=fl=>{a.o=fl;for(const k in O){const on=!!fl[k];for(const l of LK)O[k][l].visible=on;for(const st of O[k].st)st.setVisible(on);}};
      a.o=fixed; a.count=0; spec.build(a,opt,cfg);
      if(a.variants)a.setVariant=v=>{const e=spec.variants.find(x=>x[0]===v)||spec.variants[0];a.v=e[0];apply(Object.assign(spec.flags({}),e[2]));};
      else apply(fixed);
    };
    return def;
  };
}
const anchor=a=>{const F={};for(const k of LK){F[k]=new THREE.Group();a.L[k].add(F[k]);}a.F=F;return F;};
const moveF=(F,x,z)=>{for(const k of LK)F[k].position.set(x,0,z||0);};

// ---------- shaders compartidos ----------
// tubo sólido con luz en bandas (espinas, lianas, ataduras): base en el tono oscuro, punta en el claro.
// uGrow = hasta dónde ha crecido (u), uD = disolución por erosión, uB = punta ensangrentada
const TUBE_FS=`uniform float uB;uniform float uD;uniform float uGrow;
void main(){float u=vUv.x;if(u>uGrow)discard;
 float n=styNoise(vec2(u*1.7,vUv.y*.5)+uB*.13).r;float er=n*.8+.2*(1.-u);if(uD>0.&&er<uD)discard;
 vec3 N=normalize(vN);float l=styLight(N,stySunV());
 float fib=step(.5,fract(vUv.y*3.+u*5.))*.07;
 vec3 base=styRampOf(uC2,.18+.55*l+fib);
 vec3 tip=mix(styRampOf(uC1,.32+.6*l),styRampOf(vec3(.8,.07,.08),.3+.6*l),uB);
 vec3 c=mix(base,tip,smoothstep(.5,.95,u))*styTint(l);
 float fr=1.-abs(dot(N,normalize(vV)));c+=uSunCol*.16*smoothstep(.55,.7,fr)*step(.5,l);
 float head=smoothstep(.04,0.,uGrow-u)*step(uGrow,.999);c=mix(c,styRamp(.92),head*.7);
 c=mix(c,styRamp(.95),uD>0.?smoothstep(.07,0.,er-uD):0.);
 gl_FragColor=vec4(c,1.);}`;
// grietas de raíz en el suelo (materia: el suelo se abre y se ve la raíz iluminada); uP alcance, uA opacidad
const ROOTS_STY=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float j=styNoise(vUv*.7).r-.5;
 float v=pow(1.-abs(fract(an*1.11+j*.35+r*.15)*2.-1.),12.)+pow(1.-abs(fract(an*1.9-j*.5+.3)*2.-1.),18.)*.7;
 float m=v*smoothstep(uP,uP-.25,r)*smoothstep(1.,.55,r);if(m<.02)discard;
 gl_FragColor=vec4(styRampOf(uC2,.15+.55*m),min(m*1.3,1.)*uA*.8);}`;
// glifo del receptor en el suelo: trazo de pincel + marcas que giran (energía suave)
const GLYPH_STY=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
 vec4 s=styShape(7.,vUv*1.12-.06);float R=.55+.35*uP;
 float tick=step(.6,fract(an*14.+uT*.4))*smoothstep(.05,.0,abs(r-R-.1));
 float m=s.r*.9+tick*.7;if(m<.02)discard;
 gl_FragColor=vec4(styRamp(.6+.35*s.g),m*uA*.75);}`;
// cúpula de hexágonos: materia translúcida con celdas pintadas, borde iluminado por el sol; se arma de abajo
// arriba (uP), destella al sellar (uF) y se disuelve de arriba abajo (uD)
const DOME_STY=(R,ymin)=>`uniform float uD;uniform float uF;
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
void main(){vec3 N=normalize(vN);vec3 V=normalize(vV);float fr=1.-abs(dot(N,V));
 vec2 uv=vec2(vUv.x*20.,vUv.y*10.);vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(uv,r)-h,b=mod(uv-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
 float e=.5-hexD(g);float cid=hash(vec3(uv-g,3.));
 float hN=clamp((vP.y-(${f(ymin)}))/${f(R-ymin)},0.,1.);
 float on=hN*.7+cid*.3;float off=(1.-hN)*.7+cid*.3;
 if(on>uP||off<uD)discard;
 float pop=smoothstep(.15,0.,uP-on);float gone=uD>0.?smoothstep(.1,0.,off-uD):0.;
 float line=smoothstep(.1,.035,e);
 float l=styLight(N,stySunV());
 vec3 fill=styRampOf(uC1,.42+.38*l+cid*.08)*styTint(l);
 vec3 lineC=mix(styRampOf(uC2,.35+.45*l),styRampOf(uC1,.85),smoothstep(.6,.9,fr));
 vec3 c=mix(fill,lineC,line);c=mix(c,styRamp(.9),pop*.45+gone*.5);
 float al=.05+.05*cid+line*.62+smoothstep(.55,.9,fr)*.3+pop*.3+gone*.35+uF*(.12+line*.3);
 gl_FragColor=vec4(c,clamp(al,0.,.95)*uA);}`;
function dome(R,cy,frac){
  const ymin=R*Math.cos(Math.PI*frac);
  const m=new THREE.Mesh(new THREE.SphereGeometry(R,56,30,0,Math.PI*2,0,Math.PI*frac),S.mat(DOME_STY(R,ymin),{uD:{value:0},uF:{value:0}},{mode:'matter'}));
  m.position.y=cy; return m;
}
// hexágono pequeño (esquirla de escudo que se desprende)
const HEXP_STY=S.PV+`float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
void main(){vec2 q=styPC()-.5;float d=hexD(q);float m=smoothstep(.4,.36,d);if(m<.01)discard;
 float er=styErode(styNoise(q+vMix).a*.6+(.4-d)*1.2,vK,.1);
 float rim=smoothstep(.28,.36,d);
 gl_FragColor=vec4(mix(styRampOf(uC1,.6),styRamp(.9),rim),m*er*vA*(.45+.45*rim));}`;
// placas de corteza: madera con vetas y luz en bandas; uL brillo del borde, uD disolución en brasas
const BARK_STY=`uniform float uD;uniform float uL;uniform float uQ;
void main(){vec3 N=normalize(vN);float an=atan(vP.x,vP.z);
 float g=styNoise(vec2(an*1.4,vP.y*.6)+uQ).b;float ridge=step(.5,fract(an*7.+g*1.2));
 float l=styLight(N,stySunV());
 vec3 wood=styMatter(l,-.12+ridge*.1+g*.08);
 float edge=max(max(smoothstep(.12,0.,vUv.y),smoothstep(.88,1.,vUv.y)),max(smoothstep(.08,0.,vUv.x),smoothstep(.92,1.,vUv.x)));
 float n=styNoise(vec2(an*.7,vP.y*.8)+uQ*.3).r;if(uD>0.&&n<uD)discard;
 vec3 c=mix(wood,styRampOf(uC1,.75+.25*l),edge*(.35+.6*uL));
 c=mix(c,styRampOf(vec3(1.,.5,.15),.85),uD>0.?smoothstep(.08,0.,n-uD):0.);
 gl_FragColor=vec4(c,1.);}`;
// ondas del rugido sobre un cono: anillos de aire pintados (materia translúcida) con el frente más claro
const CONE_STY=CL=>`uniform vec4 uW;uniform float uQ;
float wv(float w,float x){if(w<0.)return 0.;float k=clamp(w/${f(CL)},0.,1.);
 return smoothstep(.2+.3*k,0.,abs(x-w))*(1.-.6*k)*smoothstep(${f(CL+0.6)},${f(CL-0.4)},w);}
void main(){float x=vP.x;float an=atan(vP.z,vP.y);
 float fr=1.-abs(dot(normalize(vN),normalize(vV)));
 float m=wv(uW.x,x)+wv(uW.y,x)+wv(uW.z,x)+wv(uW.w,x);
 float n=styNoise(vec2(an*.5,x*.25-uT*.8)).r;
 float band=smoothstep(.22,.45,m*(.7+.6*n));if(band<.01)discard;
 float hi=smoothstep(.75,.95,m*(.7+.6*n));
 vec3 c=mix(styRampOf(uC1,.5+.2*n),styRamp(.9),hi);
 gl_FragColor=vec4(c,band*(.45+.4*fr+.15*hi)*smoothstep(0.,.5,x)*uA);}`;
// flechas de empuje en el suelo (1 o 2 chevrones pintados que barren)
const ARROW_STY=`uniform float uN;
void main(){vec2 p=(vUv-.5)*vec2(2.2,1.4);float m=0.;
 for(int i=0;i<2;i++){float fi=float(i);float x0=.75-fi*.6;float on=step(fi,uN-.5);
  float d=abs(p.x-(x0-abs(p.y)*.75));m=max(m,smoothstep(.12,.06,d)*step(abs(p.y),.5)*on);}
 if(m<.01)discard;float sw=.75+.25*step(.5,fract(p.x*2.-uT*4.));
 gl_FragColor=vec4(styRampOf(uC2,.45+.35*sw),m*uA*.9);}`;
// cruz de cuatro hojas (curación) en billboard: materia con nervio y luz en bandas
const LEAFX_STY=`void main(){vec2 p=(vUv-.5)*2.;float m=0.;float side=0.;
 for(int i=0;i<4;i++){float an=float(i)*1.5708;vec2 q=vec2(cos(an)*p.x+sin(an)*p.y,-sin(an)*p.x+cos(an)*p.y);
  q.x-=.44;float w=.21*(1.-pow(q.x/.4,2.));
  float leaf=smoothstep(.02,-.01,abs(q.y)-max(w,0.))*step(abs(q.x),.4);
  if(leaf>m){m=leaf;side=q.y;}}
 float core=smoothstep(.2,.15,length(p));
 float mm=max(m,core);if(mm<.01)discard;
 vec3 L=stySunV();float l=styLight(normalize(vec3(0.,side*3.,1.)),L);
 vec3 leafC=mix(uC1,vec3(.42,.86,.5),.55);
 vec3 c=mix(styRampOf(leafC,.3+.6*l)*styTint(l),styRamp(.95),core);
 gl_FragColor=vec4(c,mm*uA);}`;
// mota sucia (purificar): humo oscuro que se arranca del cuerpo
const DIRT_STY=S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(0.,uv);float m=sh.r;if(m<.02)discard;
 float er=styErode(m*.5+sh.b*.5,vK,.12);
 gl_FragColor=vec4(mix(vec3(.08,.04,.11),vec3(.3,.2,.36),sh.g),m*er*vA*.9);}`;

// polvo de tierra en un punto (n puffs que se abren y suben); devuelve el número de partículas
function dust(parent,n,org,T0,{spread=0.9,size=0.32,life=0.45,rise=0.4,rad0=0.2}={}){
  return S.pts(parent,n,VV+`void main(){float s=${f(T0)}+aSeed.x*.08;float life=${f(life)}+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=${v3(org)}+d*(${f(rad0)}+${f(spread)}*(1.-exp(-t*5.)))+vec3(0.,.08+t*${f(rise)},0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.w*6.28+t*.8;
   put(p,(${f(size)}+.18*aSeed.y)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:-.15,col:EARTH}));
}

// =====================================================================
// ESPINAS (0,9 s) — espinas sólidas que brotan bajo el objetivo con rebote y se hunden; grietas de raíz en el suelo,
//   tierra y astillas. cfg.root: dos espirales espinosas lo atan ~0,5 s · cfg.bleed: puntas rojas y sangrado
// =====================================================================
B.ESPINAS=factory({key:"sty_basic_espinas",name:"Espinas",pal:"Naturaleza",dur:0.9,ti:0.26,tier:2,
  phases:[["Aviso",0],["Brote",0.14],["Impacto",0.26],["Agarre",0.4],["Retirada",0.5]],
  flags:c=>({root:!!c.root,bleed:!!c.bleed}),
  variants:[["normal","Normal",{}],["inmoviliza","Inmoviliza",{root:true}],["sangrado","Sangrado",{bleed:true}]],
build(a,opt){
  const L=a.L,T0=0.14,TI=0.26,TR0=0.5,TR1=0.68,TH0=0.84,TE=0.9,R=rng(11);
  const F=anchor(a); moveF(F,TX,0);
  const thornMat=S.mat(TUBE_FS,{uB:{value:0},uD:{value:0},uGrow:{value:1.01}},{mode:'solid',side:THREE.DoubleSide}), thorns=[];
  for(let i=0;i<11;i++){
    const inner=i<6, an=(inner?i/6:(i-6)/5+0.1)*Math.PI*2+R()*0.5, c=Math.cos(an), s=Math.sin(an);
    const r0=inner?0.72+R()*0.12:0.95+R()*0.25, r1=inner?0.47+R()*0.06:r0+0.35+R()*0.2, H=inner?0.95+R()*0.5:0.42+R()*0.3;
    const rm=inner?r0+0.08:r0+(r1-r0)*0.3;
    const curve=new THREE.CatmullRomCurve3([V3(r0*c,-0.03,r0*s),V3(rm*c,H*0.5,rm*s),V3(r1*c,H,r1*s)]);
    const m=new THREE.Mesh(taperTube(curve,18,6,inner?0.1:0.07,0.004),thornMat); F.mesh.add(m);
    thorns.push({m,inner,H,d:T0+(inner?R()*0.06:0.02+R()*0.08)});
  }
  const veins=groundPlane(3.0,0,0.02,S.mat(ROOTS_STY,{},{mode:'matter'})); F.decal.add(veins);
  const ring=S.groundRing(L.decal,3.0), spark=S.hitSpark(L.mesh,1.5,{seed:0.6});
  a.count+=dust(F.part,10,V3(0,0,0),T0,{spread:0.7,rad0:0.6,size:0.28});
  // astillas de raíz
  a.count+=S.pts(F.part,10,VV+`void main(){float s=${f(TI)}-.05+aSeed.x*.08;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=normalize(vec3(cos(an),1.4+aSeed.w,sin(an)));
   vec3 p=vec3(cos(an)*.6,.05,sin(an)*.6)+d*(1.8+1.4*aSeed.w)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.16+.06*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2'}));
  // ---- inmoviliza: dos espirales espinosas suben enroscándose
  const G=opt("root"), coilMat=S.mat(TUBE_FS,{uB:{value:0},uD:{value:0},uGrow:{value:0}},{mode:'solid',side:THREE.DoubleSide}), coil=new THREE.Group(); G.mesh.add(coil);
  for(let k=0;k<2;k++){const pts=[];
    for(let j=0;j<=40;j++){const t=j/40,an=k*Math.PI+t*Math.PI*2*1.35,r=0.5-0.05*t;pts.push(V3(Math.cos(an)*r,0.02+t*1.3,Math.sin(an)*r));}
    coil.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),120,6,0.065,0.025),coilMat));}
  // ---- sangrado: puntas rojas + estado de sangrado
  const Bo=opt("bleed"); Bo.own(S.status(a,'bleed',[target],TI,TE));
  a.pose=function(te,o){
    const ia=te-TI, root=a.o.root, bleed=a.o.bleed, hit=hitE(ia,7);
    const hold=root?ss(TI,TI+0.08,te)*(1-ss(TH0,TE,te)):0;
    caster.rotation.z=0.08*ss(0,T0,te)-0.14*ss(T0,T0+0.06,te)+0.06*ss(TI,TI+0.3,te);
    target.position.y=hit*0.07*(root?0.5:1);
    target.rotation.z=-hit*0.16*Math.cos(ia*18)*(1-hold*0.7)+hold*0.025*Math.sin(te*47);
    target.scale.set(1-0.05*hold,1+0.02*hold,1-0.05*hold);
    for(const t of thorns){
      const keep=root&&t.inner, out=keep?ss(TH0,TE,te):ss(TR0+(t.inner?0.04:0),TR1,te), g=back((te-t.d)/0.09)*(1-out);
      t.m.visible=te>t.d&&g>0.002; t.m.position.y=-(1-g)*t.H*1.08;
    }
    thornMat.uniforms.uB.value=coilMat.uniforms.uB.value=bleed?ss(TI,TI+0.08,te):0;
    const cp=ss(TI-0.03,TI+0.12,te); coil.visible=root&&cp>0.002&&te<TE;
    const sq=1-0.07*ss(TI+0.08,TI+0.16,te)*(1-ss(TH0,TE,te)); coil.scale.set(sq,1,sq);
    coilMat.uniforms.uGrow.value=cp*1.01; coilMat.uniforms.uD.value=ss(TH0,TE,te)*1.05;
    set(veins,ss(0,T0+0.04,te),(0.5+0.5*ss(T0,TI,te))*(1-ss(root?TH0-0.1:TR0,root?TE:TR1+0.15,te)));
    ring.pose(ia,TX,0,0.42);
    spark.pose(ia,TC,0.8);
    const sts=[];
    for(const g of [Bo])for(const st of g.st){st.env=a.o.bleed?st.pose(te):0;sts.push(st);}
    if(te<T0){const k=ss(0,T0,te);o.g.set(TX,0.25,0);o.gs=0.6*k;o.ga=0.08*k;o.li=1.2*k;}
    else{const l=Math.max(ia,0);o.g.set(TX-0.15,0.8,0.2);o.gs=0.9+1.2*l;o.ga=ia<0?0.1:0.25*Math.exp(-l*10);o.li=ia<0?1:2.5*Math.exp(-l*6)+0.6*hold;}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.6; o.flash=0.85;
    if(root){o.em=0.22*hold;o.emc.copy(U.uC1.value);}
    S.statusGlow(o,sts);
  };
}});

// =====================================================================
// ENREDO (1,0 s) — tres lianas sólidas salen del suelo, reptan hacia el objetivo y se enroscan en espiral;
//   aprietan (inmovilizado), laten y se deshacen por erosión soltando hojas iluminadas
// =====================================================================
const VINE_GLSL=`vec3 vine(float t,float a0){float r,an,y;
 if(t<.25){float s=t/.25;r=1.25-.7*s;an=a0+.6*s;y=.04+.1*s*s;}
 else{float s=(t-.25)/.75;r=.55-.1*s;an=a0+.6+s*7.854;y=.14+1.2*s;}
 return vec3(cos(an)*r,y,sin(an)*r);}`;
B.ENREDO=factory({key:"sty_basic_enredo",name:"Enredo",pal:"Naturaleza",dur:1.0,ti:0.45,tier:2,
  phases:[["Brote",0],["Enredo",0.12],["Atadura",0.45],["Suelta",0.78]],
  flags:()=>({}),
build(a){
  const L=a.L,TI=0.45,TD=0.78,TE=1.0,A0=[0.3,2.394,4.489],TS=[0.08,0.12,0.16],GROW=0.3;
  const F=anchor(a); moveF(F,TX,0);
  const vp=(t,a0,out)=>{let r,an,y;
    if(t<0.25){const s=t/0.25;r=1.25-0.7*s;an=a0+0.6*s;y=0.04+0.1*s*s;}
    else{const s=(t-0.25)/0.75;r=0.55-0.1*s;an=a0+0.6+s*7.854;y=0.14+1.2*s;}
    return out.set(Math.cos(an)*r,y,Math.sin(an)*r);};
  const sqM=new THREE.Group(), sqP=new THREE.Group(); F.mesh.add(sqM); F.part.add(sqP);
  const vineMat=A0.map(()=>S.mat(TUBE_FS,{uB:{value:0},uD:{value:0},uGrow:{value:0}},{mode:'solid',side:THREE.DoubleSide}));
  A0.forEach((a0,k)=>{const pts=[];for(let j=0;j<=60;j++)pts.push(vp(j/60,a0,V3(0,0,0)));
    sqM.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),150,7,0.085,0.026),vineMat[k]));});
  const roots=groundPlane(3.0,0,0.02,S.mat(ROOTS_STY,{},{mode:'matter'})); F.decal.add(roots);
  const ring=S.groundRing(L.decal,3.0), spark=S.hitSpark(L.mesh,1.3,{seed:0.2});
  const K=`const float TI=${f(TI)};const float TD=${f(TD)};${VINE_GLSL}
  float a0of(float k){return k<.5?${f(A0[0])}:(k<1.5?${f(A0[1])}:${f(A0[2])});}
  float tsof(float k){return k<.5?${f(TS[0])}:(k<1.5?${f(TS[1])}:${f(TS[2])});}`;
  // hojas que brotan al paso de la punta y caen al soltarse
  a.count+=S.pts(sqP,48,VV+K+`void main(){float k=floor(aSeed.x*2.999);float a0=a0of(k);float ts=tsof(k);
   float s=.08+.9*aSeed.y;float tb=ts+${f(GROW)}*(1.-sqrt(1.-s));float t=uT-tb;
   vec3 p=vine(s,a0);vec3 ou=normalize(vec3(p.x,0.,p.z));
   p+=ou*(.07+.05*aSeed.z)+vec3(0.,(aSeed.w-.5)*.08,0.);
   float tr=max(uT-TD-aSeed.z*.1,0.);
   p+=ou*tr*(.6+.6*aSeed.w)+vec3(0.,.35*tr-2.2*tr*tr,0.);
   vR=aSeed.w*6.2832+sin(uT*9.+aSeed.z*20.)*.3+tr*(aSeed.z-.5)*14.;vK=smoothstep(.05,.22,tr);
   vA=(t>0.&&p.y>.02)?1.:0.;
   put(p,(.2+.08*aSeed.z)*smoothstep(0.,.08,t));}`,S.MATTER_FS(C.leaf,{relief:3,bias:.08}));
  // savia luminosa que sube por las lianas al apretar (pocas motas)
  a.count+=S.pts(sqP,24,VV+K+`void main(){float k=floor(aSeed.x*2.999);float a0=a0of(k);float s0=TI-.04+aSeed.y*.12;float t=uT-s0;float u=t*1.8;
   vec3 p=vine(clamp(u,0.,1.),a0);vR=0.;vK=0.;
   vA=(t>0.&&u<1.)?sin(u*3.14159)*(1.-smoothstep(TD-.05,TD+.05,uT)):0.;put(p,.09+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // tierra donde emergen las tres lianas
  for(const a0 of A0)a.count+=dust(F.part,5,V3(Math.cos(a0)*1.25,0,Math.sin(a0)*1.25),0.08,{spread:0.45,rad0:0.05,size:0.24});
  a.pose=function(te,o){
    const ia=te-TI, hold=ss(TI-0.04,TI+0.05,te)*(1-ss(TD,TD+0.1,te));
    caster.rotation.z=0.1*ss(0,0.08,te)-0.18*ss(0.08,0.14,te)+0.08*ss(0.2,0.5,te);
    vineMat.forEach((m,k)=>{const p=cl((te-TS[k])/GROW);
      m.uniforms.uGrow.value=te<TS[k]?0:1.01*(1-(1-p)*(1-p)); m.uniforms.uD.value=ss(TD,TE-0.02,te)*1.05;});
    const s=1-0.08*hold+0.015*hold*Math.sin(te*26); sqM.scale.set(s,1,s); sqP.scale.set(s,1,s);
    target.scale.set(1-0.06*hold,1+0.02*hold,1-0.06*hold);
    target.rotation.z=hold*0.03*Math.sin(te*43)-hitE(ia,8)*0.08*Math.cos(ia*20);
    set(roots,ss(0.05,TI,te),0.8*ss(0,0.1,te)*(1-ss(TD,TE,te)));
    ring.pose(ia,TX,0,0.42); spark.pose(ia,TC,0.7);
    if(te<TI){const k=ss(0.05,TI,te);o.g.set(TX,0.6,0);o.gs=0.6;o.ga=0.08*k;o.li=1+1.5*k;}
    else{o.g.set(TX,0.85,0.2);o.gs=1+1*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*10)+0.05*hold;o.li=2.5*Math.exp(-ia*6)+0.6*hold;}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.5; o.flash=0.7;
    o.em=0.25*hold; o.emc.copy(U.uC1.value);
  };
}});

// =====================================================================
// NUBE_ESPORAS (1,1 s) — soplo de esporas del lanzador que florece en una nube con volumen (luz del sol en 3 tonos)
//   sobre el objetivo, deja motas que suben y se disipa por erosión. cfg.poison: burbujas de veneno en el objetivo
// =====================================================================
B.NUBE_ESPORAS=factory({key:"sty_basic_nube_esporas",name:"Nube de esporas",pal:"Esporas",dur:1.1,ti:0.38,tier:2,
  phases:[["Soplo",0],["Nube",0.34],["Deriva",0.6],["Disipación",0.85]],
  flags:c=>({poison:!!c.poison}),
  variants:[["normal","Normal",{},"Esporas"],["veneno","Veneno",{poison:true},"Veneno"]],
build(a,opt){
  const L=a.L,TB=0.34,TI=0.38,TE=1.1,P1=V3(3.3,1.1,0),PM=V3(0,2.6,0.6);
  const F=anchor(a); moveF(F,TX,0);
  const stain=groundPlane(3.4,0,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*.8).r;
   float m=smoothstep(uP,uP-.3,r+(n-.5)*.4);if(m<.01)discard;
   gl_FragColor=vec4(styRampOf(uC2,.2+.3*n),m*uA*.4);}`,{},{mode:'matter'})); F.decal.add(stain);
  const K=`const float TB=${f(TB)};const vec3 P0=${v3(MO)};const vec3 P1=${v3(P1)};const vec3 PM=${v3(PM)};
  vec3 bz(float u){return mix(mix(P0,PM,u),mix(PM,P1,u),u);}`;
  // soplo: bocanadas pequeñas que viajan en arco de la boca al objetivo
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=.02+aSeed.x*.16;float u=(uT-s)/.2;
   vec3 r=rnd();vec3 p=bz(clamp(u,0.,1.))+r*.18*sin(clamp(u,0.,1.)*3.14159);
   vA=(u>0.&&u<1.)?1.:0.;vK=smoothstep(.7,1.,u);vR=aSeed.w*6.28+u*2.;put(p,.22+.12*aSeed.z);}`,S.MATTER_FS(C.puff,{relief:4,bias:-.05}));
  a.count+=S.pts(L.part,20,VV+K+`void main(){float s=.02+aSeed.x*.18;float u=(uT-s)/.2;
   vec3 r=rnd();vec3 p=bz(clamp(u,0.,1.))+r*.25*sin(clamp(u,0.,1.)*3.14159);vR=0.;vK=0.;
   vA=(u>0.&&u<1.)?smoothstep(0.,.1,u)*(1.-smoothstep(.85,1.,u)):0.;put(p,.07+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // la nube: bocanadas grandes con volumen que se abren desde el centro y se erosionan
  a.count+=S.pts(F.part,38,VV+K+`void main(){float s=TB+aSeed.x*.1;float t=max(uT-s,0.);
   vec3 d=normalize((vec3(aSeed.y,aSeed.z,aSeed.w)*2.-1.)*vec3(1.,.55,1.)+.0001);
   float gr=1.-pow(1.-clamp(t/.22,0.,1.),3.);
   vec3 p=vec3(0.,.9,0.)+d*(.35+1.05*fract(aSeed.z*5.3))*(.4+.6*gr)+vec3(0.,.2*t,0.);p.y=max(p.y,.3);
   float age=t/(.68+aSeed.y*.1);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.28+t*(.5+.3*aSeed.y);
   put(p,(.75+.4*fract(aSeed.w*3.7))*(.35+.75*gr));}`,S.MATTER_FS(C.puff,{relief:4.5,bias:-.1,erodeSoft:.12}));
  // motas que flotan hacia arriba dentro de la nube
  a.count+=S.pts(F.part,26,VV+K+`void main(){float an=aSeed.z*6.2832;float rd=sqrt(aSeed.w)*1.2;float s=TB+.05+aSeed.x*.4;float t=max(uT-s,0.);float life=.5+aSeed.y*.4;float age=t/life;
   vec3 p=vec3(cos(an)*rd+sin(t*3.+aSeed.x*9.)*.1,.25+aSeed.y*.9+t*(.55+.4*aSeed.x),sin(an)*rd);vR=uT*2.;vK=0.;
   vA=(uT>s&&age<1.)?sin(age*3.14159):0.;put(p,.08+.05*aSeed.y);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // ---- veneno: burbujas y charco de veneno en el objetivo
  const P=opt("poison"); P.own(S.status(a,'poison',[target],TI+0.04,TE));
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TB,TB+0.15,te)*(1-ss(0.85,TE,te));
    caster.rotation.z=-0.1*ss(0,0.03,te)+0.15*ss(0.03,0.1,te)-0.05*ss(0.12,0.4,te);
    set(stain,easeO((te-TB)/0.45),0.9*env);
    target.rotation.z=-hitE(ia,8)*0.1*Math.cos(ia*16)+env*0.03*Math.sin(te*31)*Math.sin(te*7);
    const sts=[]; for(const st of P.st){st.env=a.o.poison?st.pose(te):0;sts.push(st);}
    if(te<TB){const u=cl((te-0.02)/0.28);bez(MO,PM,P1,u,o.g);o.gs=0.4;o.ga=0.08;o.li=1.2;}
    else{const l=Math.max(ia,0);o.g.set(TX,1.0,0.2);o.gs=1.2;o.ga=0.06*env+0.12*Math.exp(-l*8);o.li=1.5*env+2*Math.exp(-l*6);}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.4; o.flash=0.6;
    o.em=0.12*env; o.emc.copy(U.uC1.value);
    S.statusGlow(o,sts);
  };
}});

// =====================================================================
// RUGIDO (0,9 s, nivel 3 con temblor suave) — anillos de aire pintados viajan en cono de la boca del lanzador al
//   objetivo y levantan polvo a su paso. cfg.push 0|1|2 (retrocede + flechas y arrastre), cfg.taunt (aro de
//   provocación en el lanzador), cfg.stun (estrellas sobre la cabeza del objetivo)
// =====================================================================
B.RUGIDO=(()=>{
  const TW=[0.12,0.18,0.24,0.3], SPD=26, MT=V3(TC.x-0.2,TC.y,0), CL=MO.distanceTo(MT), TI=+(TW[0]+CL/SPD).toFixed(3);
  return factory({key:"sty_basic_rugido",name:"Rugido",pal:"Tierra",dur:0.9,ti:TI,tier:3,
  phases:[["Inspira",0],["Rugido",0.12],["Impacto",TI],["Eco",0.55]],
  flags:c=>({push:Math.max(0,Math.min(2,Math.round(+c.push||0))),taunt:!!c.taunt,stun:!!c.stun}),
  variants:[["normal","Normal",{}],["empuje","Empuje",{push:1}],["provoca","Provoca",{push:1,taunt:true}],
    ["furia","Empuje 2 + provoca",{push:2,taunt:true}],["aturde","Aturde",{push:1,stun:true}]],
build(a,opt){
  const L=a.L,TE=0.9,RW=1.35;
  const slideT=P=>0.2+0.08*P;
  const cone=new THREE.Mesh(new THREE.ConeGeometry(RW,CL,56,1,true).rotateZ(Math.PI/2).translate(CL/2,0,0),
    S.mat(CONE_STY(CL),{uW:{value:new THREE.Vector4(-1,-1,-1,-1)},uQ:{value:0}},{mode:'matter'}));
  cone.position.copy(MO); cone.rotation.z=Math.atan2(MT.y-MO.y,MT.x-MO.x); L.trail.add(cone);
  // anillos de pincel que nacen en la boca
  const mouth=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),S.mat(S.FS.RING,{},{mode:'energy',depthTest:false}));L.mesh.add(m);return m;});
  const feet=S.groundRing(L.decal,3.2), shock=S.groundRing(L.decal,3.0);
  const K=`const float TW0=${f(TW[0])};const float SPD=${f(SPD)};const float TI=${f(TI)};const vec3 MO=${v3(MO)};`;
  // polvo que levanta el frente de la onda a lo largo del pasillo
  a.count+=S.pts(L.part,34,VV+K+`void main(){float x=MO.x+.6+aSeed.x*${f(TX-0.6-MO.x-0.3)};float k=(x-MO.x)/${f(CL)};
   float s=TW0+(x-MO.x)/SPD+aSeed.y*.06;float life=.4+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(x+1.2*t,.08+.5*t*(.5+aSeed.w),(aSeed.w-.5)*2.*(.3+k*1.));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.y*6.28+t;
   put(p,(.24+.16*aSeed.y)*(.6+.8*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:-.15,col:EARTH}));
  a.count+=dust(L.part,8,V3(-3.7,0,0),TW[0],{spread:0.9,rad0:0.35,size:0.26});
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.8});
  // ---- empuje: flechas en el suelo, arrastre y polvo en los pies durante el retroceso
  const Pu={value:0}, G=opt("push");
  const arrow=groundPlane(2.2,0,0.032,S.mat(ARROW_STY,{uN:{value:1}},{mode:'matter'}),1.4); G.decal.add(arrow);
  a.count+=S.pts(G.part,14,VV+K+`uniform float uPu;void main(){float dur=.2+.08*uPu;float s=TI+aSeed.x*dur;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TI)/dur,0.,1.);float x=${f(TX)}+uPu*(1.-pow(1.-k,3.));
   vec3 p=vec3(x-.3,.08,(aSeed.w-.5)*.8)+vec3(-.5*t,.4*t,(aSeed.z-.5)*.4*t);
   vA=(uPu>0.&&age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.15,1.,age);vR=aSeed.y*6.28;
   put(p,(.22+.14*aSeed.y)*(.6+.7*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:-.15,col:EARTH}),{uniforms:{uPu:Pu}});
  // ---- provocación (en el lanzador) y aturdimiento (en el objetivo)
  const T=opt("taunt"); T.own(S.status(a,'taunt',[caster],0.4,TE));
  const St=opt("stun"); St.own(S.status(a,'stun',[target],TI+0.06,TE));
  a.pose=function(te,o){
    const ia=te-TI, P=a.o.push, sd=slideT(P);
    Pu.value=P; arrow.material.uniforms.uN.value=P;
    const roar=ss(TW[0]-0.02,TW[0]+0.03,te)*(1-ss(0.42,0.6,te));
    caster.rotation.z=0.16*ss(0,TW[0],te)-0.32*ss(TW[0],TW[0]+0.05,te)+0.16*ss(0.38,0.7,te)+0.012*roar*Math.sin(te*70);
    caster.scale.set(1+0.05*roar,1+0.03*roar-0.04*ss(0,TW[0],te)*(1-roar),1+0.05*roar);
    const w=TW.map(t=>te>=t?(te-t)*SPD:-1);
    cone.material.uniforms.uW.value.set(w[0],w[1],w[2],w[3]); cone.material.uniforms.uQ.value=roar;
    cone.visible=te>=TW[0]&&te<0.7; cone.material.uniforms.uA.value=1-ss(0.5,0.7,te);
    mouth.forEach((m,i)=>{const p=cl((te-TW[i])/0.22);towardCam(m.position,MO,0.25);m.position.x+=0.15+0.4*p;billboard(m,i*1.3);
      m.visible=te>=TW[i]&&p<1;m.scale.setScalar(0.4+1.1*p);set(m,0.05+0.9*p,1);});
    feet.pose(te-TW[0],-3.7,0,0.45);
    const slide=P*easeO(ia/sd), hit=hitE(ia,7);
    target.position.x=TX+slide+hit*(P?0:0.12); target.rotation.z=-hit*0.22*Math.cos(ia*16)-(P&&ia>=0&&ia<sd?0.12*Math.sin(Math.PI*ia/sd):0);
    const tx=target.position.x;
    shock.pose(ia,tx,0,0.42); spark.pose(ia,tmp.set(tx-0.25,1.15,0),0.9);
    const pa=ia>=0?ss(0,0.05,ia)*(1-ss(0.75,TE,te)):0;
    arrow.position.x=tx+0.25; set(arrow,0,pa);
    if(a.o.stun&&ia>0.06)target.rotation.z+=0.06*Math.sin(te*9)*ss(TI+0.06,TI+0.15,te);
    const sts=[];
    for(const st of T.st){st.env=a.o.taunt?st.pose(te):0;}
    for(const st of St.st){st.env=a.o.stun?st.pose(te):0;sts.push(st);}
    const cm=caster.userData.m;
    if(a.o.taunt){cm.emissive.setRGB(1,0.3,0.16);cm.emissiveIntensity=te>=0.4?0.18+0.3*Math.exp(-(te-0.4)*12):0.15*roar;}
    if(te<TW[0]){const k=ss(0,TW[0],te);o.g.copy(MO);o.gs=0.3*k;o.ga=0.05*k;o.li=0.8*k;}
    else if(te<TI){o.g.copy(MO).x+=0.3;o.gs=0.8;o.ga=0.12;o.li=2.5;}
    else{o.g.set(tx-0.2,1.1,0.1);o.gs=1+1.2*Math.min(ia,0.5);o.ga=0.22*Math.exp(-ia*10);o.li=4*Math.exp(-ia*6);}
    o.ia=ia; o.c.set(tx-0.2,1.15,0); o.shake=0.3; o.dist=0.8; o.flash=0.8;
    S.statusGlow(o,sts);
  };
}});})();

// =====================================================================
// AUTOBUFF (0,9 s) — glifo de pincel a los pies, llamas de energía y cintas que suben en espiral por el lanzador;
//   chispa de potenciado y chevrones que suben. cfg.shield: además se arma una cúpula de hexágonos
// =====================================================================
const RIB_STY=`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;float w=abs(vUv.y-.5)*2.;
 float body=exp(-d*3.5);float n=styNoise(vec2(u*1.5-uT*.6,vUv.y*.3)).b;
 float m=smoothstep(.85,.35,w)*body*smoothstep(.3,.6,n+body*.4);if(m<.02)discard;
 vec3 c=mix(styRampOf(uC1,.55+.3*n),styRamp(.92),exp(-d*25.));
 gl_FragColor=vec4(c,m*uA*.85);}`;
const CHEVU_STY=S.PV+`void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=abs(q.y-.15+abs(q.x)*.9);
 float a=smoothstep(.11,.06,d)*step(abs(q.x),.38)*vA;if(a<.01)discard;
 gl_FragColor=vec4(styRampOf(uC1,.85),a);}`;
B.AUTOBUFF=factory({key:"sty_basic_autobuff",name:"Potenciar",pal:"Hielo",dur:0.9,ti:0.45,tier:2,
  phases:[["Carga",0],["Columna",0.08],["Potenciado",0.45],["Disipación",0.62]],
  flags:c=>({shield:!!c.shield}),
  variants:[["normal","Normal",{},"Hielo"],["escudo","Con escudo",{shield:true},"Salvaje"]],
build(a,opt){
  const L=a.L,T0=0.08,TI=0.45,TE=0.9,CX=-3.7;
  const F=anchor(a); moveF(F,CX,0);
  const glyph=groundPlane(2.8,0,0.02,S.mat(GLYPH_STY,{},{mode:'energy'})); F.decal.add(glyph);
  const ring=S.groundRing(L.decal,4.0);
  const ribs=new THREE.Group(), ribMat=S.mat(RIB_STY,{},{mode:'matter'}); ribs.position.y=0.05;
  for(let i=0;i<2;i++){const m=new THREE.Mesh(VFX.helixGeo(1.5,0.8,0.42,2.3,0.16,100),ribMat);m.rotation.y=i*Math.PI;ribs.add(m);}
  F.trail.add(ribs);
  const spark=S.hitSpark(L.mesh,1.8,{seed:0.15});
  const K=`const float T0=${f(T0)};const float TI=${f(TI)};`;
  // llamas de energía que suben en espiral y se cierran hacia el cuerpo
  a.count+=S.pts(F.part,26,VV+K+`void main(){float s=aSeed.x*(TI-.08);float life=.32+aSeed.y*.18;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*3.;float rad=mix(.95,.35,age);
   vec3 p=vec3(cos(an)*rad,.05+age*(1.5+aSeed.w*.6),sin(an)*rad);vR=0.;vK=smoothstep(.4,1.,age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age):0.;put(p,(.26+.12*aSeed.w)*(1.-age*.4));}`,S.ENERGY_FS(C.flame,{gain:1.25}),{mode:'energy'});
  // chevrones de mejora que suben tras el destello
  a.count+=S.pts(F.part,12,VV+K+`void main(){float s=TI-.1+aSeed.x*.3;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(cos(an)*(.55+.2*aSeed.w),.3+aSeed.w*.8+t*2.,sin(an)*(.55+.2*aSeed.w));vR=0.;vK=0.;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.26+.08*aSeed.y);}`,CHEVU_STY,{mode:'energy'});
  // destellos de potenciado alrededor
  a.count+=S.pts(F.part,10,VV+K+`void main(){float s=TI+aSeed.x*.3;float life=.22+aSeed.y*.15;float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=vec3(r.x*.6,.3+aSeed.w*1.5,r.z*.6);vR=aSeed.y*3.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.18+.08*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // ---- escudo: cúpula de hexágonos sobre el lanzador al potenciarse
  const G=opt("shield"), dm=dome(1.3,0.45,0.68); G.mesh.add(dm);
  a.count+=S.pts(G.part,16,VV+K+`void main(){float s=.7+aSeed.x*.15;float life=.28+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=vec3(0.,.45,0.)+d*1.3+vec3(0.,.6*t,0.);vR=aSeed.z*6.;vK=age;
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;put(p,.2+.08*aSeed.w);}`,HEXP_STY);
  const fp=V3(CX,1.0,0);
  a.pose=function(te,o){
    const ia=te-TI, up=cl((te-T0)/(TI-T0-0.03)), env=1-ss(0.6,TE,te);
    const pop=ia>=0?0.07*Math.exp(-ia*9)+0.03*env:0;
    caster.scale.set(1+pop,1-0.05*ss(0,T0,te)*(1-ss(T0,TI,te))+pop,1+pop);
    caster.rotation.z=0.02*Math.sin(te*30)*ss(T0,TI,te)*(1-ss(TI,TI+0.1,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*up*(ia<0?1:0)+(ia>=0?0.6*Math.exp(-ia*7)+0.15*env:0);
    set(glyph,ss(0,TI,te),ss(0,0.1,te)*env);
    ring.pose(ia,CX,0,0.45);
    ribs.rotation.y=te*4; set({material:ribMat},up*1.05,ss(T0,T0+0.06,te)*(1-ss(TI+0.02,TI+0.25,te)));
    spark.pose(ia,fp,1);
    const du=dm.material.uniforms, sh=ss(TI-0.04,TI+0.14,te);
    du.uP.value=sh*1.05; du.uF.value=hitE(te-TI-0.14,9); du.uD.value=ss(0.68,TE,te)*1.05; du.uA.value=sh>0?1:0; dm.visible=sh>0.001;
    if(te<TI){o.g.set(CX,0.3+1.6*up,0);o.gs=0.6+0.3*up;o.ga=0.1*up;o.li=1+2*up;}
    else{o.g.copy(fp);o.gs=1+1.2*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*9)+0.04*env;o.li=4*Math.exp(-ia*6)+0.8*env;}
    o.ia=ia; o.c.copy(fp); o.shake=0; o.dist=0.35; o.flash=0;
  };
}});

// =====================================================================
// ESCUDO (0,8 s) — protección que se forma alrededor del receptor y se desvanece. cfg.self:true → el lanzador; si no,
//   VFX.allies[0] (allies:1). cfg.style 'hex' (cúpula de hexágonos translúcida) | 'corteza' (placas de madera que
//   vuelan, encajan con rebote y se consumen en brasas)
// =====================================================================
B.ESCUDO=factory({key:"sty_basic_escudo",name:"Escudo",pal:"Sagrado",dur:0.8,ti:0.35,tier:2,
  phases:[["Invocación",0],["Formación",0.08],["Sellado",0.35],["Brillo",0.5]],
  allies:o=>o.self?0:1,
  flags:c=>({self:!!c.self,hex:c.style!=="corteza",corteza:c.style==="corteza"}),
  variants:[["hex","Hexágonos",{hex:true,corteza:false,self:false},"Sagrado"],["corteza","Corteza",{hex:false,corteza:true,self:false},"Madera"],
    ["propio","Sobre sí",{hex:true,corteza:false,self:true},"Baba"]],
build(a,opt){
  const L=a.L,T0=0.08,TI=0.35,TF=0.5,TE=0.8,AP=ALLY_POS[0];
  const F=anchor(a);
  const glyph=groundPlane(2.6,0,0.02,S.mat(GLYPH_STY,{},{mode:'energy'})); F.decal.add(glyph);
  const ring=S.groundRing(L.decal,3.4);
  const K=`const float T0=${f(T0)};const float TI=${f(TI)};const float TF=${f(TF)};`;
  // motas que se reúnen alrededor del receptor mientras se forma
  a.count+=S.pts(F.part,20,VV+K+`void main(){float s=aSeed.x*(TI-.12);float life=.18+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()*vec3(1.,.7,1.)+vec3(0.,.4,0.));vec3 p=vec3(0.,.8,0.)+d*mix(1.9,1.1,age*age);vR=0.;vK=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.08+.05*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // ---- hexágonos: cúpula que se arma de abajo arriba, destella al sellar y se disuelve de arriba abajo
  const H=opt("hex"), dm=dome(1.4,0.45,0.68); H.mesh.add(dm);
  a.count+=S.pts(H.part,18,VV+K+`void main(){vec3 d=normalize(rnd()+vec3(0.,.5,0.));float hN=d.y*.5+.5;
   float s=TF+(1.-hN)*.18+aSeed.x*.06;float life=.28+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(0.,.45,0.)+d*1.4*(1.+.15*t)+vec3(0.,.5*t,0.);vR=aSeed.z*6.;vK=age;
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;put(p,.22+.08*aSeed.w);}`,HEXP_STY);
  // ---- corteza: ocho placas de madera con luz en bandas que vuelan, encajan y se consumen en brasas
  const Kc=opt("corteza"), barkMat=S.mat(BARK_STY,{uD:{value:0},uL:{value:0},uQ:{value:2.7}},{mode:'solid',side:THREE.DoubleSide}), plates=[], R=rng(5);
  for(let row=0;row<2;row++)for(let i=0;i<4;i++){
    const mid=i*Math.PI/2+row*Math.PI/4+0.2, len=1.45, y=0.42+row*0.55;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.6-row*0.04,0.64-row*0.04,0.56,8,1,true,mid-len/2,len),barkMat);
    Kc.mesh.add(m); plates.push({m,dir:V3(Math.sin(mid),0,Math.cos(mid)),y,t:T0+0.03+(row*4+i)/8*0.18+R()*0.03,spin:(R()-0.5)*3});
  }
  // astillas al encajar y brasas al consumirse
  a.count+=S.pts(Kc.part,12,VV+K+`void main(){float s=TI-.08+aSeed.x*.12;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=normalize(vec3(cos(an),.8+aSeed.w,sin(an)));
   vec3 p=vec3(cos(an)*.62,.25+aSeed.w*.9,sin(an)*.62)+d*(1.2+1.4*aSeed.w)*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*9.;put(p,.15+.06*aSeed.y);}`,S.MATTER_FS(C.shard,{relief:3,col:'uC2'}));
  a.count+=S.pts(Kc.part,22,VV+K+`void main(){float s=TF+aSeed.x*.2;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(cos(an)*.62,.2+aSeed.w*1.,sin(an)*.62)+vec3(cos(an)*.3*t,.9*t,sin(an)*.3*t);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?(.6+.4*sin(t*40.+aSeed.x*30.)):0.;put(p,.08+.04*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, self=a.o.self, rx=self?-3.7:AP.x, rz=self?0:AP.z, rec=self?caster:allies[0];
    moveF(F,rx,rz);
    caster.rotation.z=0.1*ss(0,T0,te)-0.16*ss(T0,T0+0.06,te)+0.06*ss(T0+0.1,TI+0.2,te);
    const env=ss(0.02,0.12,te)*(1-ss(TF+0.1,TE,te));
    set(glyph,ss(0,TI,te),env*0.9);
    ring.pose(ia,rx,rz,0.4);
    const du=dm.material.uniforms;
    du.uP.value=ss(T0,TI,te)*1.05; du.uF.value=hitE(ia,9); du.uD.value=ss(TF,TE-0.04,te)*1.05; du.uA.value=1; dm.visible=te>T0;
    dm.scale.setScalar(1+0.04*hitE(ia,10));
    for(const q of plates){const k=cl((te-q.t)/0.14),g=back(k),off=(1-g)*1.3;
      q.m.visible=te>q.t; q.m.position.set(q.dir.x*off,(1-g)*0.6,q.dir.z*off); q.m.rotation.y=(1-k)*q.spin;}
    barkMat.uniforms.uL.value=hitE(ia,8)*1.2+0.15; barkMat.uniforms.uD.value=ss(TF,TE-0.03,te)*1.05;
    const rm=rec.userData.m; rm.emissive.copy(U.uC1.value); rm.emissiveIntensity=ia>=0?0.4*Math.exp(-ia*8)+0.2*(1-ss(TF,TE,te)):0.1*ss(T0,TI,te);
    const cy=0.85;
    if(te<TI){const k=ss(0,TI,te);o.g.set(rx,cy,rz);o.gs=0.8+0.6*k;o.ga=0.08*k;o.li=1+1.5*k;}
    else{o.g.set(rx,cy,rz);o.gs=1.4+1*Math.min(ia,0.3);o.ga=0.2*Math.exp(-ia*9)+0.04*env;o.li=3.5*Math.exp(-ia*6)+0.8*env;}
    o.ia=ia; o.c.set(rx,cy,rz); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// CURA (0,9 s) — un hilo de hojas y luz va del lanzador al aliado; hojas que suben en espiral, glifo de pétalos y una
//   cruz de cuatro hojas sobre su cabeza. cfg.cleanse: anillo que barre de pies a cabeza y arranca humo oscuro
// =====================================================================
B.CURA=factory({key:"sty_basic_cura",name:"Cura",pal:"Sagrado",dur:0.9,ti:0.4,tier:2,allies:()=>1,
  phases:[["Invocación",0],["Flujo",0.05],["Sanación",0.4],["Disipación",0.62]],
  flags:c=>({cleanse:!!c.cleanse}),
  variants:[["normal","Normal",{},"Sagrado"],["purifica","Purifica",{cleanse:true},"Agua"]],
build(a,opt){
  const L=a.L,TS=0.05,TI=0.4,TD=0.62,TE=0.9,AP=ALLY_POS[0],Q0=V3(-3.4,1.4,0.1),QM=V3(-2.7,2.5,-0.7),Q1=V3(AP.x,1.25,AP.z);
  const F=anchor(a); moveF(F,AP.x,AP.z);
  const glyph=groundPlane(2.6,0,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   vec4 s=styShape(7.,vUv*1.12-.06);float pet=abs(cos(an*3.+uT*.8));
   float petal=smoothstep(.06,.0,abs(r-.6*pet))*step(r,.78);
   float m=s.r*.8+petal*.7;if(m<.02)discard;
   gl_FragColor=vec4(styRamp(.6+.35*s.g),m*uA*.75);}`,{},{mode:'energy'})); F.decal.add(glyph);
  const ring=S.groundRing(L.decal,3.2);
  const cross=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),S.mat(LEAFX_STY,{},{mode:'matter',depthTest:false})); L.mesh.add(cross);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.5});
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 Q0=${v3(Q0)};const vec3 QM=${v3(QM)};const vec3 Q1=${v3(Q1)};
  vec3 bz(float u){return mix(mix(Q0,QM,u),mix(QM,Q1,u),u);}`;
  // hilo: hojas que vuelan por el arco del lanzador al aliado + motas de luz
  a.count+=S.pts(L.part,16,VV+K+`void main(){float s=TS+aSeed.x*.2;float u=(uT-s)/.16;
   vec3 r=rnd();vec3 p=bz(clamp(u,0.,1.))+r*.12*sin(clamp(u,0.,1.)*3.14159);
   vR=aSeed.w*6.28+u*6.;vK=smoothstep(.85,1.,u);vA=(u>0.&&u<1.)?1.:0.;put(p,.2+.06*aSeed.z);}`,S.MATTER_FS(C.leaf,{relief:3,bias:.1}));
  a.count+=S.pts(L.part,24,VV+K+`void main(){float s=TS+aSeed.x*.22;float u=(uT-s)/.14;
   vec3 r=rnd();vec3 p=bz(clamp(u,0.,1.))+r*.08*sin(clamp(u,0.,1.)*3.14159);vR=0.;vK=0.;
   vA=(u>0.&&u<1.)?smoothstep(0.,.15,u):0.;put(p,.08+.04*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // hojas que ascienden en espiral alrededor del aliado
  a.count+=S.pts(F.part,22,VV+K+`void main(){float s=TI-.1+aSeed.x*.35;float life=.45+aSeed.y*.25;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*4.;float rad=.75-.3*age;
   vec3 p=vec3(cos(an)*rad,.1+age*(1.7+aSeed.w*.6),sin(an)*rad);vR=an+1.57;vK=smoothstep(.6,1.,age);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.2+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:.12}));
  a.count+=S.pts(F.part,14,VV+K+`void main(){float s=TI+aSeed.x*.25;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(r.x*.6,.4+aSeed.w*1.1+t*1.2,r.z*.6);vR=0.;vK=age;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.16+.06*aSeed.y);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // ---- purificar: anillo que barre al aliado y humo oscuro que se arranca del cuerpo
  const P=opt("cleanse");
  const scan=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9).rotateX(-Math.PI/2),S.mat(S.FS.RING,{},{mode:'energy'})); P.mesh.add(scan);
  a.count+=S.pts(P.part,14,VV+K+`void main(){float an=aSeed.z*6.2832;vec3 b=vec3(cos(an)*.25,.3+aSeed.w*1.2,sin(an)*.25);
   vec3 d=normalize(vec3(cos(an),.6+aSeed.y,sin(an)));float s=TI+aSeed.w*.12;float t=uT-s;float life=.42;float age=t/life;
   vec3 p=b+d*1.1*(1.-pow(1.-clamp(t/.3,0.,1.),2.))+vec3(0.,.3*max(t,0.),0.);
   vA=(t>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.x*6.28;put(p,(.22+.1*aSeed.x)*(.7+.5*age));}`,DIRT_STY);
  const AC=V3(AP.x,1.1,AP.z), HD=V3(AP.x,2.2,AP.z);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(0.12,0.25,te)*(1-ss(TD+0.05,TE,te));
    caster.rotation.z=0.08*ss(0,TS,te)-0.15*ss(TS,TS+0.06,te)+0.07*ss(0.15,0.45,te);
    set(glyph,ia>=0?1:ss(0.15,TI,te),env);
    ring.pose(ia,AP.x,AP.z,0.42);
    const ca=ss(TI-0.06,TI+0.02,te)*(1-ss(TD+0.02,0.85,te));
    towardCam(cross.position,tmp.copy(HD).add(tmp2.set(0,0.25*ss(TI,TE,te),0)),0.4); billboard(cross,0.08*Math.sin(te*6));
    cross.visible=ca>0.001; cross.scale.setScalar(1+0.3*hitE(ia,12)); cross.material.uniforms.uA.value=ca;
    spark.pose(ia,AC,0.8);
    const sc=ss(TI-0.02,TI+0.25,te); scan.position.y=0.05+2.0*sc; scan.scale.setScalar(1-0.3*sc); scan.visible=te>TI-0.02&&te<TI+0.3;
    set(scan,0.05+0.5*ss(TI+0.1,TI+0.28,te),1);
    const al=allies[0].userData.m; al.emissive.copy(U.uC1.value);
    al.emissiveIntensity=ia>=0?0.45*Math.exp(-ia*7)+0.12*env:0.1*ss(0.2,TI,te);
    if(te<0.3){const u=cl((te-TS)/0.25);bez(Q0,QM,Q1,u,o.g);o.gs=0.5;o.ga=0.1;o.li=2;}
    else if(te<TI){o.g.copy(AC);o.gs=0.9;o.ga=0.1;o.li=2;}
    else{o.g.copy(AC);o.gs=1.1+1*Math.min(ia,0.3);o.ga=0.22*Math.exp(-ia*9)+0.04*env;o.li=3.5*Math.exp(-ia*5)+0.8*env;}
    o.ia=ia; o.c.copy(AC); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

VFX.module("Estilizado · Control y apoyo",["ESPINAS","ENREDO","NUBE_ESPORAS","RUGIDO","AUTOBUFF","ESCUDO","CURA"].filter(k=>B[k])
  .map(k=>B[k]({key:"sty_basic_"+k.toLowerCase(),name:k+" (estilizado)",pal:{ESPINAS:"Naturaleza",ENREDO:"Naturaleza",NUBE_ESPORAS:"Esporas",RUGIDO:"Tierra",AUTOBUFF:"Hielo",ESCUDO:"Sagrado",CURA:"Sagrado"}[k],demo:true})));
})();

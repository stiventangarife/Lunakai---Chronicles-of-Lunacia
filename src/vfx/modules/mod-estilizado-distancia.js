// =====================================================================
// ESTILIZADO · DISTANCIA Y ÁREA — versiones con el kit vfx-stylized.js de las fábricas de mod-basicos-distancia.js.
// VFX.sty.basic.TIPO(cfg) recibe el mismo cfg que VFX.basic.TIPO ({key,name,pal,...opciones}) y devuelve una habilidad
// nueva con los MISMOS tiempos (dur, ti), nivel y anclas de diseño que la original (lanzador −3,7 · objetivo 3,4).
// Las instancias de enemigos se registran en mod-estilizado-enemigos.js con la clave sty__<id del hechizo>.
// Tipos: ESCUPITAJO · BABA_PEGAJOSA · FLECHA · PROYECTIL_MAGICO · RAFAGA · NOVA_CRUZ · CATACLISMO
// Lenguaje: materia (líquido, baba, madera, roca, humo) con mezcla normal y luz del sol en 3 bandas; la energía
// (núcleos, chispas, estelas) es pequeña y aditiva. Sin contornos. Se consume desde el borde (erosión).
// Las áreas en cruz usan la casilla real del tablero (TILE = 1,93 u. del laboratorio): la original usaba 1 u.,
// así que la cruz se veía más pequeña que las casillas que golpea. Los rivales extra siguen en las casillas vecinas.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,enemies,LK}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL, B=S.basic;
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const ex=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const VV=`varying float vR;varying float vK;`;
const TX=3.4, TC=V3(3.15,1.2,0), TILE=1.93;     // casilla y pecho del objetivo; casilla del tablero
const WOOD="vec3(.55,.36,.2)", ROCK="vec3(.46,.4,.36)", ASH="vec3(.3,.25,.22)";

// grupo de capas que se enciende o apaga entero (opciones y estilos)
const mkG=a=>{const G={};for(const k of LK){G[k]=new THREE.Group();a.L[k].add(G[k]);}G.show=v=>{for(const k of LK)G[k].visible=v;};return G;};
const bb=(m,p,d,ang)=>{towardCam(m.position,p,d);billboard(m,ang);};
// variantes (demo) u opciones fijas (instancia)
// plancha de suelo SUBDIVIDIDA: el puente deforma vértice a vértice el pasillo lanzador → objetivo; con solo 4 vértices,
// una plancha grande cuya parte trasera cae en el pasillo se arrastraba entera hacia el objetivo (cruz descentrada)
const gp=(size,x,y,mat,seg=24)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size,seg,seg).rotateX(-Math.PI/2),mat);m.position.set(x,y,0);return m;};
// anillo de pincel grande, subdividido (como S.groundRing)
const bigRing=(parent,size)=>{const m=gp(size,0,0.03,S.mat(S.FS.RING,{},{mode:'energy'}));parent.add(m);
  return {mesh:m,pose(ia,x,z=0,dur=0.42,k=1){const p=cl(ia/dur);m.position.x=x;m.position.z=z;m.visible=ia>=0&&p<1;
    m.scale.setScalar(Math.max(k*(0.55+0.6*(1-Math.pow(1-p,2))),0.001));set(m,0.05+0.9*p,ia>=0?1:0);}};};
const options=(a,VAR,fixed,apply,dflt)=>{if(VAR)a.setVariant=v=>{if(!VAR[v])v=dflt;a.v=v;apply(VAR[v]);};else apply(fixed);};
// estela: dos planos cruzados que salen hacia −x desde el origen del grupo
const crossTail=mat=>{const g=new THREE.Group(),geo=new THREE.PlaneGeometry(1,1).translate(-0.5,0,0),b=new THREE.Mesh(geo,mat);
  b.rotation.x=Math.PI/2;g.add(new THREE.Mesh(geo,mat),b);return g;};

// ---------- materiales de malla ----------
// líquido / baba / orbe: esfera sólida con luz en 3 bandas, borde claro y brillo duro (bias mueve la rampa)
const GLOB_FS=(bias=-0.05,spec=0.6)=>`void main(){vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 float w=styNoise(vec2(atan(vP.z,vP.x)*.16+uT*.4,vP.y*.5+uT*.2)).r;
 vec3 c=styMatter(l,${f(bias)}+w*.12);
 float fr=1.-abs(dot(n,normalize(vV)));c=mix(c,styRamp(.78),smoothstep(.62,.7,fr)*.25);
 float sp=smoothstep(.93,.95,dot(reflect(-L,n),normalize(vV)));c+=vec3(1.,.98,.94)*sp*${f(spec)};
 gl_FragColor=vec4(c,1.);}`;
// material de un tono con luz en bandas (madera del astil, piedra, cristal)
const TONE_FS=(col,bias=0)=>`void main(){vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 vec3 c=styRampOf(${col},clamp(.28+.55*l+${f(bias)},0.,1.))*styTint(l);
 float sp=smoothstep(.95,.965,dot(reflect(-L,n),normalize(vV)));c+=vec3(1.)*sp*.35;
 gl_FragColor=vec4(c,1.);}`;
// cristal facetado (agujas de hielo): bandas de luz + facetas por ángulo + borde frío; se erosiona con uEr
const CRYSTAL_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 float fac=step(.5,fract(atan(vP.z,vP.x)*.796+.5));
 vec3 c=styRamp(.35+.45*l+.12*fac+.15*clamp(vP.y,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c=mix(c,styRamp(1.),smoothstep(.55,.65,fr)*.5);
 float er=styErode(styNoise(vec2(atan(vP.z,vP.x)*.32,vP.y*.6)).r*.7+.3*(1.-vP.y),uEr,.1);if(er<.01)discard;
 gl_FragColor=vec4(c,er*uA);}`;
// estela de energía: se afina hacia atrás, vetas que corren, erosión con uP
const STREAK_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*1.2-uT*2.5,vUv.y*.4)).b;float w=u*(.55+.45*n);
 float m=smoothstep(w,w-.18,v)*smoothstep(0.,.2,u);float er=styErode(u*.55+n*.45,uP,.12);
 gl_FragColor=vec4(styRamp(.45+.5*u)*(.8+.4*u),m*er*uA);}`;
// charco en el suelo (materia): mancha orgánica con borde oscuro y brillos húmedos duros.
// uP = extensión (0..1), uEr = erosión al secarse, uS = estiramiento (x a lo largo del ataque, y lateral)
const PUDDLE_FS=`uniform float uEr;uniform vec2 uS;void main(){vec2 p=(vUv-.5)*2.;p/=uS;float r=length(p);
 float n=styNoise(vUv*.9+.17).r*.6+styNoise(vUv*.55+.4).g*.4;
 float R=uP*(.6+.4*n);float m=smoothstep(R,R-.05,r);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uEr,.12);
 float wet=step(.86,styNoise(vUv*1.6+.31).r)*smoothstep(R-.05,R-.25,r);
 vec3 c=styRamp(.16+.3*n);c=mix(c,styRamp(.02),band(r,R-.06,.05));c=mix(c,styRamp(.9),wet*.6);
 gl_FragColor=vec4(c*mix(vec3(1.),uShadeCol,.1),m*er*uA);}`;
// marcas de la cruz en el suelo: borde de pincel por casilla que se carga (uP) y destella cuando le toca (tiempos fijos)
const CROSS_SIZE=TILE*3.3;
const CELLS5=[[0,0],[-1,0],[0,1],[1,0],[0,-1]];
const crossFS=times=>`float cT(vec2 c){${CELLS5.map(([x,z],i)=>`if(c==vec2(${f(x)},${f(z)}))return ${f(times[i])};`).join("")}return 99.;}
void main(){vec2 p=(vUv-.5)*${f(CROSS_SIZE/TILE)};p.y=-p.y;vec2 c=floor(p+.5);if(abs(c.x)+abs(c.y)>1.)discard;
 vec2 q=abs(p-c)*2.;float n=styNoise(vUv*1.3+c*.21).r;float e=max(q.x,q.y)+(n-.5)*.1;float dt=uT-cT(c);
 float border=smoothstep(.8,.87,e)*smoothstep(1.,.95,e);
 float hit=dt>0.?exp(-dt*5.):0.;
 float fill=smoothstep(.45,.8,n)*.3*hit*step(e,.92);
 float m=border*(.3+.45*uP+.3*hit)+fill;if(m<.01)discard;
 gl_FragColor=vec4(styRamp(.68+.22*border+.1*hit),m*uA*.7);}`;
// halo de carga en la mano / orbe (energía): anillo de pincel que gira
const HALO_FS=`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.6+s.b*.4,uP,.15);
 vec2 p=vUv-.5;float core=smoothstep(.22,0.,length(p));
 gl_FragColor=vec4(styRamp(.7+.3*s.g)+vec3(1.,.95,.85)*core*.4,(s.r*er+core*.5)*uA);}`;

// ---------- partículas (fragmentos del kit) ----------
const DROP_M=S.MATTER_FS(C.drop,{relief:4,bias:-.12});
const DROP_C1=S.MATTER_FS(C.drop,{relief:4,bias:.05,col:'uC1'});
const SHARD_M=S.MATTER_FS(C.shard,{relief:3,bias:.05});
const SPLINTER=S.MATTER_FS(C.shard,{relief:3,col:WOOD});
const ROCKCHIP=S.MATTER_FS(C.shard,{relief:3,col:ROCK});
const PUFF_M=S.MATTER_FS(C.puff,{relief:4.5,bias:-.05});
const PUFF_ASH=S.MATTER_FS(C.puff,{relief:4.5,bias:.05,col:ASH});
const SPARK_E=S.ENERGY_FS(C.spark,{gain:1.3});
const FLAME_E=S.ENERGY_FS(C.flame,{gain:1.35});
const MOTE_E=S.ENERGY_FS(C.puff,{gain:1.1});

// =====================================================================
// ESCUPITAJO (0,8 s, ti 0,3) — bola líquida sólida en parábola con su sombra en el suelo; gotas con luz que caen
// de la estela; al golpear, gotas grandes, chorretones y un charco que se seca. Opción poison.
// =====================================================================
B.ESCUPITAJO=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{normal:{poison:false},veneno:{poison:true}}:null;
  const def={key:cfg.key||"sty_basic_escupitajo",name:cfg.name||"Escupitajo",dur:0.8,ti:0.3,tier:2,pal:cfg.pal||"Veneno",stylized:true,
    phases:[["Carga",0],["Vuelo",0.08],["Impacto",0.3],["Charco",0.4]],
  build(a){
    const L=a.L,TL=0.08,TI=0.3,P0=V3(-3.3,1.5,0),P1=TC,H=1.25;
    const path=(k,out)=>out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+H*4*k*(1-k),0);
    const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
    vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,P1,k)+vec3(0.,${f(4*H)}*k*(1.-k),0.);}`;
    const glob=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),S.mat(GLOB_FS(-0.16),{},{mode:'solid'}));L.mesh.add(glob);
    const shadow=S.contactShadow(L.decal,1.1);
    const puddle=gp(2.8,TX,0.022,S.mat(PUDDLE_FS,{uEr:{value:0},uS:{value:new THREE.Vector2(1.1,0.9)}},{mode:'matter'}));L.decal.add(puddle);
    const spark=S.hitSpark(L.mesh,1.3,{seed:0.71});
    // gotas que se juntan en la boca
    S.pts(L.part,10,VV+K+`void main(){float life=.07+aSeed.y*.04;float age=(uT-aSeed.x*(TL-.05))/life;
     vec3 d=normalize(rnd()+vec3(.6,0.,0.));vec3 p=P0+d*mix(.45,.03,age*age);vR=0.;vK=0.;
     vA=(age>0.&&age<1.&&uT<TL)?1.:0.;put(p,.09+.04*aSeed.z);}`,DROP_M);
    // gotas que caen de la estela
    S.pts(L.part,30,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.22+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+r*.06+vec3(-.5*t+r.x*.2*t,-4.*t*t,r.z*.25*t);vR=3.14159;vK=smoothstep(.5,1.,age);
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.15+.09*aSeed.z)*(1.-age*.4));}`,DROP_M);
    // salpicadura: gotas grandes con luz que caen al suelo
    S.pts(L.part,26,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.32+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.7,.45,0.));vec3 v=d*(1.2+2.2*aSeed.z);vec3 p=P1+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
     vec2 vel=vec2(v.x,v.y-12.*t);vR=atan(vel.x,vel.y);vK=smoothstep(.5,1.,age);
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.22+.14*aSeed.w)*(1.-age*.3));}`,DROP_M);
    // chorretones que resbalan por el objetivo
    S.pts(L.part,10,VV+K+`void main(){float s=TI+.03+aSeed.x*.12;float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=vec3(${f(TX-0.34)}+aSeed.z*.12,P1.y+(aSeed.y-.5)*.3-1.6*t*t-.3*t,(aSeed.w-.5)*.6);p.y=max(p.y,.04);
     vR=3.14159;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.05*aSeed.y);}`,DROP_M);
    const PZ=S.status(a,"poison",[target],TI,0.8),ST=[{kind:"poison",env:0}];let PON=false;
    options(a,VAR,{poison:!!cfg.poison},s=>{PON=!!s.poison;PZ.setVisible(PON);},"normal");
    a.pose=function(te,o){
      const ia=te-TI,k=cl((te-TL)/(TI-TL)),g0=ss(0,TL,te),fly=te>=TL&&te<TI,sq=g0*(1-ss(TL,TL+0.08,te));
      caster.rotation.z=0.1*g0-0.24*ss(TL,TL+0.05,te)+0.14*ss(TL+0.08,TL+0.4,te);
      caster.scale.set(1+0.05*sq,1-0.05*sq,1);
      path(k,tmp);const ang=fly?Math.atan2((P1.y-P0.y)+H*4*(1-2*k),P1.x-P0.x):0;
      glob.position.copy(tmp);glob.rotation.z=ang;
      const st=fly?1.4:1+0.12*Math.sin(te*55),r=Math.max(fly?0.3:0.22*g0,0.001);
      glob.visible=te<TI&&g0>0.01;glob.scale.set(r*st,r/Math.sqrt(st),r/Math.sqrt(st));
      shadow.pose(tmp.x,0,0.45+0.25/(1+tmp.y),fly?0.7:0);
      spark.pose(ia,P1,0.9);
      set(puddle,ss(0.02,0.25,ia),ia>=0?1:0);puddle.material.uniforms.uEr.value=ia>=0?-0.1+1.15*ss(0.25,0.5,ia):-0.1;
      const h=ex(ia,7);target.position.x=TX+0.12*h;target.rotation.z=-h*0.16*Math.cos(ia*16);
      ST[0].env=PON?PZ.pose(te):0;S.statusGlow(o,ST);
      if(te<TL){o.g.copy(P0);o.gs=0.4*g0;o.ga=0.12*g0;o.li=0.8*g0;}
      else if(fly){o.g.copy(tmp);o.gs=0.5;o.ga=0.1;o.li=1.5;}
      else{o.g.copy(P1);o.gs=0.8+1.5*ia;o.ga=Math.exp(-ia*12)*0.3;o.li=3.5*Math.exp(-ia*6)+(PON?1.2*ST[0].env:0);}
      o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=0.5;
    };
  }};
  if(VAR){def.variants=[["normal","Normal"],["veneno","Veneno"]];def.v="normal";def.vlabel="Efecto";}
  return def;
};

// =====================================================================
// BABA_PEGAJOSA (0,9 s, ti 0,42) — cadena de goterones sólidos y lentos unida por un hilo de baba; charco que se
// estira. Lento (por defecto en las instancias): hebras de baba con luz que pegan los pies + estado lento.
// =====================================================================
const GOO_STRAND_FS=`void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 gl_FragColor=vec4(styMatter(l,-.02),uA*.95);}`;
B.BABA_PEGAJOSA=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{lento:{slow:true},normal:{slow:false}}:null;
  const def={key:cfg.key||"sty_basic_baba_pegajosa",name:cfg.name||"Baba pegajosa",dur:0.9,ti:0.42,tier:2,pal:cfg.pal||"Baba",stylized:true,
    phases:[["Carga",0],["Vuelo",0.14],["Impacto",0.42],["Pegado",0.55]],
  build(a){
    const L=a.L,TL=0.14,TI=0.42,LAG=0.035,P0=V3(-3.3,1.45,0),P1=V3(3.12,1.05,0),H=0.85;
    const kf=te=>{const k=cl((te-TL)/(TI-TL));return k*(0.75+0.25*k);};
    const path=(k,out)=>out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+H*4*k*(1-k),0);
    const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
    vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);k=k*(.75+.25*k);return mix(P0,P1,k)+vec3(0.,${f(4*H)}*k*(1.-k),0.);}`;
    const gooMat=S.mat(GLOB_FS(-0.18,0.5),{},{mode:'solid'});
    const blobs=[0.33,0.25,0.19,0.14].map((r,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),gooMat);m.userData={r,i};L.mesh.add(m);return m;});
    const shadow=S.contactShadow(L.decal,1.2);
    const puddle=gp(3.8,TX-0.2,0.022,S.mat(PUDDLE_FS,{uEr:{value:0},uS:{value:new THREE.Vector2(1.3,0.75)}},{mode:'matter'}));L.decal.add(puddle);
    const spark=S.hitSpark(L.mesh,1.1,{seed:0.21});
    // hilo de baba: cuerda de gotas que sigue la trayectoria con retraso
    S.pts(L.trail,34,VV+K+`void main(){float s=uT-aSeed.x*.17;vec3 p=path(s)+rnd()*.02;vR=0.;vK=0.;
     vA=(s<TI+.02&&uT<TI+.1&&uT>TL)?1.:0.;put(p,(.17-.08*aSeed.x)*(1.+.2*sin(aSeed.x*40.-uT*20.)));}`,S.MATTER_FS(C.puff,{relief:3,bias:-.15}));
    // gotas gordas que cuelgan y caen despacio
    S.pts(L.part,18,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+vec3(r.x*.06-.3*t,-.06-2.6*t*t,r.z*.1);p.y=max(p.y,.04);vR=3.14159;vK=smoothstep(.6,1.,age);
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.2+.1*aSeed.z));}`,DROP_M);
    // salpicadura espesa
    S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.38+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.6,.25,0.));vec3 v=d*(.7+1.3*aSeed.z);vec3 p=P1+v*t+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.04);
     vec2 vel=vec2(v.x,v.y-10.*t);vR=atan(vel.x,vel.y);vK=smoothstep(.55,1.,age);
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.26+.12*aSeed.w));}`,DROP_M);
    // lento: hebras que pegan los pies (cilindros con luz) + estado lento
    const SL=mkG(a),strands=[],strandMat=S.mat(GOO_STRAND_FS,{},{mode:'matter'});
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.07,1,8,1,true).translate(0,0.5,0),strandMat);
      const an=i/6*Math.PI*2+0.3;m.userData={x:Math.cos(an)*0.4,z:Math.sin(an)*0.4,ph:i*1.3};SL.mesh.add(m);strands.push(m);}
    const SS=S.status(a,"slow",[target],TI+0.08,0.9),ST=[{kind:"slow",env:0}];let SON=false;
    options(a,VAR,{slow:cfg.slow!==false},s=>{SON=!!s.slow;SL.show(SON);SS.setVisible(SON);},"lento");
    a.pose=function(te,o){
      const ia=te-TI,g0=ss(0,TL,te);
      caster.rotation.z=0.12*g0-0.2*ss(TL,TL+0.08,te)+0.08*ss(TL+0.1,TL+0.5,te);
      caster.scale.set(1+0.07*g0*(1-ss(TL,TL+0.1,te)),1-0.06*g0*(1-ss(TL,TL+0.1,te)),1);
      for(const m of blobs){const u=m.userData,t=te-u.i*LAG,k=kf(t);path(k,m.position);
        const on=te<TL?(u.i?0:g0):(t<TI?1:0),wob=1+0.1*Math.sin(te*30+u.i*2);
        m.visible=on>0.01;const r=Math.max(u.r*on*(te<TL?0.8:1),0.001);m.scale.set(r*wob*1.2,r/wob,r);}
      const lead=blobs[0].position;shadow.pose(lead.x,0,0.5+0.3/(1+lead.y),te>=TL&&ia<0?0.7:0);
      spark.pose(ia,P1,0.8);
      set(puddle,ss(0,0.4,ia),ia>=0?1:0);puddle.material.uniforms.uEr.value=ia>=0?-0.1+1.15*ss(0.3,0.48,ia):-0.1;
      const h=ex(ia,6);
      const tug=SON&&ia>0.05?Math.max(0,Math.sin((ia-0.05)*11))*ss(0.05,0.12,ia)*(1-ss(0.36,0.46,ia)):0;
      target.position.x=TX+0.1*h;target.position.y=0.06*tug;target.rotation.z=-h*0.14*Math.cos(ia*14);
      target.scale.set(1+0.04*tug,1-0.05*h+0.03*tug,1);
      const senv=SON?ss(TI+0.03,TI+0.1,te)*(1-ss(0.78,0.9,te)):0;
      for(const m of strands){const u=m.userData;m.position.set(TX+u.x,0.02,u.z);m.visible=senv>0.001;
        m.scale.set(1-0.4*tug,Math.max(0.2+0.35*senv+0.25*tug+0.03*Math.sin(te*9+u.ph),0.001),1-0.4*tug);}
      strandMat.uniforms.uA.value=senv;
      ST[0].env=SON?SS.pose(te):0;S.statusGlow(o,ST);
      if(te<TL){o.g.copy(P0);o.gs=0.4*g0;o.ga=0.1*g0;o.li=0.8*g0;}
      else if(te<TI){o.g.copy(lead);o.gs=0.5;o.ga=0.08;o.li=1.4;}
      else{o.g.copy(P1);o.gs=0.8+1.5*ia;o.ga=Math.exp(-ia*10)*0.25;o.li=3*Math.exp(-ia*5)+0.8*senv;}
      o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=0.45;
    };
  }};
  if(VAR){def.variants=[["lento","Ralentiza"],["normal","Normal"]];def.v="lento";def.vlabel="Efecto";}
  return def;
};

// =====================================================================
// FLECHA (0,5 s, ti 0,26) — flecha sólida (astil de madera, punta y plumas de la paleta) con estela fina; astillas
// de madera con luz al clavarse. style 'certero': mira y retícula de 0,2 s, la flecha atraviesa y sale por detrás.
// =====================================================================
const FLETCH_FS=`void main(){vec2 p=vUv;float sh=smoothstep(.0,.08,p.x)*step(abs(p.y-.5)*2.,.25+.75*p.x);if(sh<.01)discard;
 float vane=step(.5,fract(p.x*6.));gl_FragColor=vec4(styRamp(.4+.35*p.x+.15*vane),sh*uA);}`;
const AIM_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float core=smoothstep(.35,0.,v);float dash=step(.42,fract(u*12.-uT*9.));float sweep=smoothstep(uP,uP-.08,u);
 vec3 c=mix(styRamp(.75),vec3(1.,.35,.25),.5);
 gl_FragColor=vec4(c,core*(.4+.6*dash)*sweep*uA);}`;
const RETICLE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 float rg=smoothstep(.06,.02,abs(r-.62))+smoothstep(.04,.015,abs(r-.36))*.7;
 float tk=step(abs(p.x),.035)*step(.45,abs(p.y))*step(abs(p.y),.85)+step(abs(p.y),.035)*step(.45,abs(p.x))*step(abs(p.x),.85);
 float m=rg+tk;if(m<.01)discard;
 gl_FragColor=vec4(mix(styRamp(.8),vec3(1.,.32,.24),.45),m*uA);}`;
B.FLECHA=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{normal:{certero:false},certero:{certero:true}}:null;
  const def={key:cfg.key||"sty_basic_flecha",name:cfg.name||"Flecha",dur:0.5,ti:0.26,tier:2,pal:cfg.pal||"Naturaleza",stylized:true,
    phases:[["Tensar / Mira",0],["Disparo",0.18],["Impacto",0.26],["Astillas",0.32]],
  build(a){
    const L=a.L,TR=0.18,TI=0.26,X0=-3.0,XE=2.45,Y=1.22,BOW=V3(-3.2,Y,0),HP=V3(3.05,Y,0),CE=mkG(a);
    const arrow=new THREE.Group();L.mesh.add(arrow);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.95,8).rotateZ(-Math.PI/2),S.mat(TONE_FS(WOOD),{},{mode:'solid'}));
    const head=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.24,6).rotateZ(-Math.PI/2).translate(0.58,0,0),S.mat(TONE_FS('uC1',0.05),{},{mode:'solid'}));
    const fm=S.mat(FLETCH_FS,{},{mode:'matter'});
    const f1=new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.13).translate(-0.36,0,0),fm),f2=f1.clone();f2.rotation.x=Math.PI/2;
    arrow.add(shaft,head,f1,f2);
    const tailMat=S.mat(STREAK_FS,{},{mode:'energy'}),tail=crossTail(tailMat);L.trail.add(tail);
    const glint=S.hitSpark(L.mesh,0.7,{seed:0.5,grow:0.04,life:0.1});
    const spark=S.hitSpark(L.mesh,1.2,{seed:0.83});
    const K=`const float TI=${f(TI)};const vec3 HP=${v3(HP)};`;
    // astillas de madera iluminadas
    S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.28+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.9,.35,0.));vec3 p=HP+d*(1.4+2.2*aSeed.z)*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
     vR=aSeed.y*6.28+t*14.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.13+.07*aSeed.w);}`,SPLINTER);
    // certero: mira, retícula, astillas de salida por detrás
    const aimMat=S.mat(AIM_FS,{},{mode:'energy'}),aim=new THREE.Group(),ag=new THREE.PlaneGeometry(1,1).translate(0.5,0,0),a2=new THREE.Mesh(ag,aimMat);
    a2.rotation.x=Math.PI/2;aim.add(new THREE.Mesh(ag,aimMat),a2);CE.trail.add(aim);
    const ret=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(RETICLE_FS,{},{mode:'energy',depthTest:false}));CE.mesh.add(ret);
    const exitSpark=S.hitSpark(CE.mesh,1.4,{seed:0.12});
    S.pts(CE.part,12,VV+K+`void main(){float s=TI+.02+aSeed.x*.03;float life=.3+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(1.1,.25,0.));vec3 p=vec3(3.75,${f(Y)},0.)+d*(1.5+2.*aSeed.z)*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
     vR=aSeed.y*6.28+t*12.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.06*aSeed.w);}`,SPLINTER);
    let CER=false;
    options(a,VAR,{certero:cfg.style==="certero"||!!cfg.certero},s=>{CER=!!s.certero;CE.show(CER);},"normal");
    a.pose=function(te,o){
      const ia=te-TI,dr=ss(0,TR,te),k=cl((te-TR)/(TI-TR)),fly=te>=TR&&te<TI;
      caster.rotation.z=0.1*dr-0.18*ss(TR,TR+0.03,te)+0.08*ss(TR+0.05,TR+0.25,te);
      caster.position.x=-3.7-0.05*dr+0.05*ss(TR,TR+0.03,te);
      let x,av=1;
      if(te<TR){x=X0-0.12*dr;}else if(fly){x=X0+(XE-X0)*k;}
      else if(CER){const q=cl(ia/0.1);x=XE+2.2*q;av=1-q;}
      else{x=XE+0.12;av=1-ss(0.12,0.22,ia);}
      arrow.position.set(x,Y,0);arrow.rotation.z=(!CER&&ia>=0)?0.06*Math.exp(-ia*14)*Math.sin(ia*90):0;
      const vis=av*ss(0.02,0.08,te);arrow.visible=vis>0.02;arrow.scale.setScalar(Math.max(0.6+0.4*vis,0.001));fm.uniforms.uA.value=vis;
      const tl=te>=TR?Math.min(x-X0,4.5):0,tk=ia>0?1-cl(ia/0.16):1;
      tail.visible=te>=TR&&tk>0;tail.position.set(Math.min(x,XE)-0.4,Y,0);
      tail.scale.set(Math.max(Math.min(tl,XE-X0),0.001),0.09*(CER?1.4:1)*tk+0.001,0.09*(CER?1.4:1)*tk+0.001);
      tailMat.uniforms.uA.value=tk;tailMat.uniforms.uP.value=ia>0?cl(ia/0.16):-0.1;
      glint.pose(te-(TR-0.02),BOW,0.7);
      spark.pose(ia,TC,CER?1.1:0.85);
      aim.position.copy(BOW);aim.scale.set(Math.max(TC.x-BOW.x,0.001),0.06*(1.3-dr),0.06*(1.3-dr));aimMat.uniforms.uP.value=cl(te/0.1)*1.1;
      aimMat.uniforms.uA.value=ss(0,0.04,te)*(1-ss(TR,TR+0.03,te));
      bb(ret,TC,0.4,te*1.5);ret.visible=te<TR+0.06;ret.scale.setScalar(0.55+0.9*(1-ss(0.03,TR,te)));ret.material.uniforms.uA.value=ss(0.02,0.07,te)*(1-ss(TR+0.01,TR+0.06,te));
      exitSpark.pose(ia-0.02,tmp2.set(3.8,Y,0),0.9);
      const h=ex(ia,9);target.position.x=TX+(CER?0.14:0.09)*h;target.rotation.z=-h*0.14*Math.cos(ia*20);
      if(te<TR){o.g.copy(CER?TC:BOW);o.gs=0.4*dr;o.ga=0.1*dr;o.li=0.9*dr;}
      else if(fly){o.g.set(x+0.5,Y,0);o.gs=0.5;o.ga=0.1;o.li=1.5;}
      else{o.g.copy(TC);o.gs=0.8+1.5*ia;o.ga=Math.exp(-ia*12)*0.3;o.li=(CER?4.5:3.5)*Math.exp(-ia*7);}
      o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=CER?0.6:0.4;
    };
  }};
  if(VAR){def.variants=[["normal","Normal"],["certero","Certero"]];def.v="normal";def.vlabel="Disparo";}
  return def;
};

// =====================================================================
// PROYECTIL_MAGICO (0,7 s, ti 0,36) — orbe con luz en bandas y núcleo caliente, halo de pincel que gira, estela de
// motas de la paleta y chispas; estallido con chispa de púas, estrellas y anillo en el suelo.
// =====================================================================
B.PROYECTIL_MAGICO=function(cfg){cfg=cfg||{};
  const def={key:cfg.key||"sty_basic_proyectil_magico",name:cfg.name||"Proyectil mágico",dur:0.7,ti:0.36,tier:2,pal:cfg.pal||"Estelar",stylized:true,
    phases:[["Carga",0],["Vuelo",0.16],["Estallido",0.36],["Disipación",0.48]],
  build(a){
    const L=a.L,TL=0.16,TI=0.36,P0=V3(-3.1,1.25,0),P1=TC;
    const path=(k,out)=>{const e=k*(0.6+0.4*k),w=Math.sin(Math.PI*k);
      return out.set(P0.x+(P1.x-P0.x)*e,P0.y+(P1.y-P0.y)*e+0.16*Math.sin(k*12.566)*w,0.14*Math.cos(k*9.42)*w);};
    const K=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
    vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);float e=k*(.6+.4*k);float w=sin(3.14159*k);
     return mix(P0,P1,e)+vec3(0.,.16*sin(k*12.566)*w,.14*cos(k*9.42)*w);}`;
    const orb=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),S.mat(GLOB_FS(0.12,0.7),{},{mode:'solid'}));
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(HALO_FS,{},{mode:'energy',depthTest:false}));
    L.mesh.add(orb,halo);
    const spark=S.hitSpark(L.mesh,1.9,{seed:0.44});
    const ring=S.groundRing(L.decal,2.8);
    const shadow=S.contactShadow(L.decal,0.9);
    // chispas que convergen en la carga
    S.pts(L.part,16,VV+K+`void main(){float life=.1+aSeed.y*.05;float age=(uT-aSeed.x*(TL-.06))/life;
     vec3 d=normalize(rnd()+.0001);vec3 p=P0+d*mix(.8,.05,age*age);vR=aSeed.z*6.28;vK=0.;
     vA=(age>0.&&age<1.&&uT<TL)?1.:0.;put(p,.12+.06*aSeed.z);}`,SPARK_E,{mode:'energy'});
    // estela: motas de materia de la paleta (dan masa) + chispas titilantes
    S.pts(L.part,40,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.22+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+r*.06+(r*.2+vec3(-.4,.1,0.))*t;vR=aSeed.w*6.28;vK=smoothstep(.1,1.,age);
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.2+.12*aSeed.w)*(1.-age*.5));}`,PUFF_M);
    S.pts(L.part,40,VV+K+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.2+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+r*.07+(r*.35+vec3(-.6,.15,0.))*t;vR=aSeed.z*6.28+t*6.;vK=age;
     vA=(age>0.&&age<1.)?(.5+.5*sin(t*45.+aSeed.z*30.)):0.;put(p,(.08+.06*aSeed.w)*(1.-age*.6));}`,SPARK_E,{mode:'energy'});
    // estrellas del estallido
    S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.4,.2,0.));vec3 p=P1+d*(.4+1.3*aSeed.z)*(1.-exp(-t*6.));vR=aSeed.y*6.28+t*3.;vK=age;
     vA=(age>0.&&age<1.)?1.:0.;put(p,.2+.12*aSeed.w);}`,SPARK_E,{mode:'energy'});
    // motas de materia que salen del estallido
    S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.5,.3,0.));vec3 p=P1+d*(.3+1.1*aSeed.z)*(1.-exp(-t*5.));vR=aSeed.w*6.28;vK=smoothstep(.2,1.,age);
     vA=(age>0.&&age<1.)?1.:0.;put(p,(.24+.12*aSeed.y)*(.7+.5*age));}`,PUFF_M);
    a.pose=function(te,o){
      const ia=te-TI,g0=ss(0,TL,te),k=cl((te-TL)/(TI-TL)),fly=te>=TL&&te<TI;
      caster.rotation.z=0.1*g0-0.2*ss(TL,TL+0.05,te)+0.1*ss(TL+0.08,TL+0.4,te);
      path(k,tmp);const r=fly?0.2:0.17*g0*(1+0.1*Math.sin(te*50));
      orb.visible=te<TI&&r>0.005;orb.position.copy(tmp);orb.scale.setScalar(Math.max(r,0.001));orb.rotation.y=te*6;
      bb(halo,tmp,0.25,-te*4);halo.visible=te<TI;halo.scale.setScalar(Math.max(r*3.4,0.001));halo.material.uniforms.uA.value=g0*0.75;halo.material.uniforms.uP.value=-0.1;
      shadow.pose(tmp.x,tmp.z,0.5,fly?0.55:0);
      spark.pose(ia,P1,1);
      ring.pose(ia,TX,0,0.42,1);
      const h=ex(ia,7);target.position.x=TX+0.13*h;target.rotation.z=-h*0.17*Math.cos(ia*15);
      if(te<TL){o.g.copy(P0);o.gs=0.6*g0;o.ga=0.2*g0;o.li=1.4*g0;}
      else if(fly){o.g.copy(tmp);o.gs=0.7;o.ga=0.15;o.li=2.2;}
      else{o.g.copy(P1);o.gs=1+2*ia;o.ga=Math.exp(-ia*12)*0.35;o.li=4.5*Math.exp(-ia*6);}
      o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=0.6;
    };
  }};
  return def;
};

// =====================================================================
// RAFAGA (0,9 s, ti 0,43) — cinco orbes sólidos salen en abanico y caen, escalonados, sobre las casillas de la cruz;
// cada uno estalla en una nube con luz, un anillo de pincel y motas. Marcas de pincel en las casillas.
// =====================================================================
B.RAFAGA=function(cfg){cfg=cfg||{};
  const def={areaCells:1,zoneTarget:TILE*1.6,key:cfg.key||"sty_basic_rafaga",name:cfg.name||"Ráfaga",dur:0.9,ti:0.43,tier:2,pal:cfg.pal||"Naturaleza",stylized:true,
    phases:[["Abanico",0],["Vuelo",0.06],["Caída",0.4],["Disipación",0.6]],
  build(a){
    const L=a.L,TI=0.43,P0=V3(-3.3,1.6,0);
    const ORBS=[{c:[0,-1],t0:0.06,t1:0.46,h:1.9,sz:-1.3},{c:[-1,0],t0:0.09,t1:0.40,h:1.6,sz:-0.6},{c:[0,0],t0:0.12,t1:0.43,h:2.3,sz:0},
      {c:[1,0],t0:0.15,t1:0.52,h:2.6,sz:0.6},{c:[0,1],t0:0.18,t1:0.49,h:1.9,sz:1.3}];
    const LT=CELLS5.map(c=>ORBS.find(q=>q.c[0]===c[0]&&q.c[1]===c[1]).t1);
    const tiles=gp(CROSS_SIZE,TX,0.021,S.mat(crossFS(LT),{},{mode:'energy'}));L.decal.add(tiles);
    const orbMat=S.mat(GLOB_FS(0.08,0.6),{},{mode:'solid'});
    const hand=new THREE.Mesh(new THREE.PlaneGeometry(1,1),S.mat(HALO_FS,{},{mode:'energy',depthTest:false}));L.mesh.add(hand);
    ORBS.forEach((q)=>{
      q.L=V3(TX+q.c[0]*TILE,0.2,q.c[1]*TILE);q.m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),orbMat);L.mesh.add(q.m);
      q.ring=S.groundRing(L.decal,1.9);q.sh=S.contactShadow(L.decal,0.8);
      // Hito 104: la casilla de destino es un uniforme, para girarla con la cuadrícula en los lanzamientos en diagonal
      q.uBB={value:q.L.clone()};q.L0=q.L.clone();
      const K=`const float T0=${f(q.t0)};const float T1=${f(q.t1)};const vec3 A=${v3(P0)};uniform vec3 uBB;
      #define BB uBB
      vec3 path(float t){float k=clamp((t-T0)/(T1-T0),0.,1.);return mix(A,BB,k)+vec3(0.,${f(4*q.h)}*k*(1.-k),${f(q.sz)}*sin(3.14159*k));}`;
      // estela de motas
      S.pts(L.part,12,VV+K+`void main(){float s=T0+aSeed.x*(T1-T0);float life=.16+aSeed.y*.16;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 r=rnd();vec3 p=path(s)+r*.05+r*.2*t+vec3(0.,.15*t,0.);vR=aSeed.w*6.28;vK=age;
       vA=(age>0.&&age<1.)?1.:0.;put(p,(.12+.06*aSeed.w)*(1.-age*.5));}`,PUFF_M,{uniforms:{uBB:q.uBB}});
      // nube del impacto
      S.pts(L.part,8,VV+K+`void main(){float s=T1+aSeed.x*.03;float life=.38+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
       float an=aSeed.z*6.2832;vec3 p=BB+vec3(cos(an),0.,sin(an))*(.15+.4*(1.-exp(-t*6.)))+vec3(0.,.15+.5*t+aSeed.w*.2,0.);
       vR=aSeed.w*6.28;vK=smoothstep(.2,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.3+.16*aSeed.y)*(.6+.6*age));}`,PUFF_M,{uniforms:{uBB:q.uBB}});
      // chispas del impacto
      S.pts(L.part,8,VV+K+`void main(){float s=T1+aSeed.x*.03;float life=.22+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,.9,0.));vec3 p=BB+d*(.3+.8*aSeed.z)*(1.-exp(-t*6.));vR=aSeed.y*6.28;vK=age;
       vA=(age>0.&&age<1.)?1.:0.;put(p,.12+.06*aSeed.w);}`,SPARK_E,{mode:'energy',uniforms:{uBB:q.uBB}});
      q.path=(te,out)=>{const k=cl((te-q.t0)/(q.t1-q.t0));return out.set(P0.x+(q.L.x-P0.x)*k,P0.y+(q.L.y-P0.y)*k+q.h*4*k*(1-k),q.L.z*k+q.sz*Math.sin(Math.PI*k));};
    });
    a.pose=function(te,o){
      const ia=te-TI,g0=ss(0,0.08,te);
      caster.rotation.z=0.12*g0-0.25*ss(0.06,0.12,te)+0.13*ss(0.2,0.5,te);
      bb(hand,P0,0.3,te*5);hand.scale.setScalar(0.6+0.5*g0);hand.material.uniforms.uA.value=g0*(1-ss(0.18,0.26,te));hand.material.uniforms.uP.value=-0.1;
      set(tiles,cl(te/0.4),ss(0,0.08,te)*(1-ss(0.7,0.9,te)));
      S.gridAlign(tiles,TX,0);
      const ga=-(VFX.gridSnap||0),gc=Math.cos(ga),gs=Math.sin(ga);
      for(const q of ORBS){const dx=q.L0.x-TX,dz=q.L0.z;q.L.set(TX+gc*dx+gs*dz,q.L0.y,-gs*dx+gc*dz);q.uBB.value.copy(q.L);}
      for(const q of ORBS){const fl=te>=q.t0-0.04&&te<q.t1;q.m.visible=fl;q.path(Math.max(te,q.t0),q.m.position);
        q.m.scale.setScalar(Math.max(0.15*ss(q.t0-0.04,q.t0+0.02,te),0.001));
        q.sh.pose(q.m.position.x,q.m.position.z,0.45,fl?0.5*ss(q.t1-0.2,q.t1,te):0);
        q.ring.pose(te-q.t1,q.L.x,q.L.z,0.35,0.8);}
      const h=ex(ia,7);target.position.x=TX+0.08*h;target.position.y=0.12*Math.sin(Math.PI*cl(ia/0.2))*(ia>=0?1:0);target.rotation.z=-h*0.14*Math.cos(ia*16);
      if(te<0.12){o.g.copy(P0);o.gs=0.5*g0;o.ga=0.15*g0;o.li=1.2*g0;}
      else if(ia<0){ORBS[2].path(te,o.g);o.gs=0.8;o.ga=0.1;o.li=1.8;}
      else{o.g.set(TX,0.5,0);o.gs=1.2+1.5*ia;o.ga=Math.exp(-ia*10)*0.25;o.li=3.5*Math.exp(-ia*4);}
      o.ia=ia;o.c.set(TX,0.6,0);o.shake=0;o.dist=0.5;
    };
  }};
  return def;
};

// =====================================================================
// NOVA_CRUZ (1,0 s, ti 0,3) — carga de 0,3 s en un orbe con luz y estallido que recorre la cruz casilla a casilla.
// style: 'cristal' (agujas de hielo facetadas que se quiebran) | 'esporas' (nubes con volumen) | 'llamas'
// (columnas de llamas de pincel) | 'estrellas' (estrellas que caen). Opciones slow, weak, fragile, burn.
// =====================================================================
const STARFALL_FS=`void main(){float v=vUv.y;float u=abs(vUv.x-.5)*2.;
 float m=smoothstep(1.,.3,u)*pow(v,.7)*smoothstep(1.,.85,v);if(m<.01)discard;
 gl_FragColor=vec4(styRamp(.55+.45*v),m*uA);}`;
B.NOVA_CRUZ=function(cfg){cfg=cfg||{};
  const SP={cristal:"Hielo",esporas:"Esporas",llamas:"Fuego",estrellas:"Estelar"},PS={Hielo:"cristal",Esporas:"esporas",Fuego:"llamas",Estelar:"estrellas"};
  const VAR=cfg.demo?{cristal:{style:"cristal"},esporas:{style:"esporas"},llamas:{style:"llamas"},estrellas:{style:"estrellas"},
    lento:{style:"cristal",slow:1},debil:{style:"esporas",weak:1},fragil:{style:"estrellas",fragile:1},quema:{style:"llamas",burn:1}}:null;
  const style0=SP[cfg.style]?cfg.style:(PS[cfg.pal]||"cristal");
  const def={gridArea:'root',zoneTarget:TILE*1.6,key:cfg.key||"sty_basic_nova_cruz",name:cfg.name||"Nova en cruz",dur:1.0,ti:0.3,tier:2,enemies:2,stylized:true,
    pal:VAR?()=>SP[(VAR[def.v]||VAR.cristal).style]:(cfg.pal||SP[style0]),
    phases:[["Carga",0],["Estallido",0.3],["Cruz",0.38],["Disipación",0.6]],
  build(a){
    const L=a.L,TCH=0.3,CORE=V3(TX,0.6,0);
    const CELLS=CELLS5.map((c,i)=>[c[0],c[1],[0.30,0.38,0.41,0.44,0.47][i]]);
    const CP=CELLS.map(c=>V3(TX+c[0]*TILE,0,c[1]*TILE));
    const who=[target,enemies[0],enemies[1]],HT=[0.30,0.38,0.47];   // rivales en las casillas (−1,0) y (0,−1)
    const tiles=gp(CROSS_SIZE,TX,0.021,S.mat(crossFS(CELLS.map(c=>c[2])),{},{mode:'energy'}));L.decal.add(tiles);
    const core=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),S.mat(GLOB_FS(0.1,0.7),{},{mode:'solid'}));L.mesh.add(core);
    const spark=S.hitSpark(L.mesh,2.2,{seed:0.62});
    const ring=bigRing(L.decal,TILE*2.6);
    const cellGLSL=`vec3 cellP(float i){${CP.map((p,i)=>`if(i<${f(i+0.5)})return ${v3(p)};`).join("")}return ${v3(CP[0])};}
    float cellT(float i){${CELLS.map((c,i)=>`if(i<${f(i+0.5)})return ${f(c[2])};`).join("")}return 0.;}
    float cellI(){return floor(min(aSeed.w*5.,4.));}`;
    // energía que corre desde las casillas hacia el centro durante la carga
    S.pts(L.part,30,VV+cellGLSL+`void main(){float i=cellI();vec3 c=cellP(i);float life=.14+aSeed.y*.08;float age=(uT-aSeed.x*.2)/life;
     float an=aSeed.z*6.2832;vec3 st=c+vec3(cos(an)*.5,.05,sin(an)*.5);vec3 p=mix(st,${v3(CORE)},age*age)+vec3(0.,sin(age*3.14159)*.3,0.);
     vR=aSeed.z*6.28;vK=0.;vA=(age>0.&&age<1.&&uT<${f(TCH)})?1.:0.;put(p,.12+.06*aSeed.z);}`,SPARK_E,{mode:'energy'});
    const STY={};
    {// cristal: agujas facetadas que brotan y se quiebran en esquirlas
      const G=mkG(a),sh=[],cm=[];
      CELLS.forEach((c,ci)=>{const n=ci?4:6;for(let j=0;j<n;j++){const mat=S.mat(CRYSTAL_FS,{uEr:{value:-0.1}},{mode:'matter'});cm.push(mat);
        const m=new THREE.Mesh(new THREE.ConeGeometry(1,1,5).translate(0,0.5,0),mat);
        const an=j/n*Math.PI*2+ci*1.7,rad=j?0.18+0.26*((j*37+ci*11)%10)/10:0;
        m.position.set(CP[ci].x+Math.cos(an)*rad,0,CP[ci].z+Math.sin(an)*rad);m.rotation.set(Math.sin(an)*rad*1.4,0,-Math.cos(an)*rad*1.4);
        m.userData={t:c[2],h:(ci?0.8:1.15)*(j?0.6+0.4*((j*53+ci*7)%10)/10:1.15),r:(ci?0.13:0.16)*(j?0.8+0.3*((j*29)%10)/10:1.3),mat};G.mesh.add(m);sh.push(m);}});
      S.pts(G.part,40,VV+cellGLSL+`void main(){float i=cellI();float s=cellT(i)+.33+aSeed.x*.03;float life=.32+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,1.,0.));vec3 p=cellP(i)+vec3(0.,.4,0.)+d*(1.+2.*aSeed.z)*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
       vR=aSeed.y*6.28+t*10.;vK=smoothstep(.5,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.14+.07*aSeed.y);}`,SHARD_M);
      G.pose=te=>{for(const m of sh){const u=m.userData,g=ss(u.t-0.02,u.t+0.06,te),br=ss(u.t+0.28,u.t+0.4,te),ov=1+0.18*ex(te-u.t-0.06,10);
        m.visible=g>0&&br<1;m.scale.set(Math.max(u.r,0.001),Math.max(u.h*g*ov,0.001),Math.max(u.r,0.001));
        u.mat.uniforms.uA.value=1;u.mat.uniforms.uEr.value=-0.1+1.15*br;}};
      STY.cristal=G;
    }
    {// esporas: nubes con volumen por casilla y motas
      const G=mkG(a);
      S.pts(G.part,40,VV+cellGLSL+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.05;float t=max(uT-s,0.);float life=.55+aSeed.y*.2;float age=t/life;
       float an=aSeed.z*6.2832;float rr=fract(aSeed.y*7.3)*.45;
       vec3 p=cellP(i)+vec3(cos(an)*rr,.3+fract(aSeed.z*5.1)*.5+t*.3,sin(an)*rr);
       float gr=1.-pow(1.-clamp(t/.15,0.,1.),3.);
       vR=aSeed.w*6.28+t*.5;vK=smoothstep(.3,1.,age);vA=(uT>s&&age<1.)?1.:0.;put(p,(.5+.25*fract(aSeed.w*3.7))*(.35+.75*gr));}`,PUFF_M);
      S.pts(G.part,30,VV+cellGLSL+`void main(){float i=cellI();float s=cellT(i)+.05+aSeed.x*.2;float t=max(uT-s,0.);float life=.5+aSeed.y*.3;float age=t/life;
       vec3 p=cellP(i)+vec3((aSeed.z-.5)*.9,.3+t*.7,(fract(aSeed.z*9.1)-.5)*.9);
       vR=0.;vK=0.;vA=(uT>s&&age<1.)?(1.-age)*(.5+.5*sin(uT*14.+aSeed.x*40.)):0.;put(p,.08+.05*aSeed.w);}`,SPARK_E,{mode:'energy'});
      G.pose=()=>{};STY.esporas=G;
    }
    {// llamas: columna de llamas de pincel por casilla, brasas y chamuscado
      const G=mkG(a);
      S.pts(G.part,60,VV+cellGLSL+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.12;float life=.32+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 r=rnd();float an=aSeed.z*6.2832;vec3 p=cellP(i)+vec3(cos(an)*.32*aSeed.y,.12+t*(1.6+aSeed.z),sin(an)*.32*aSeed.y);
       vR=(aSeed.y-.5)*.5;vK=smoothstep(.25,1.,age);vA=(age>0.&&age<1.&&uT<s+.45)?1.:0.;put(p,(.42+.2*aSeed.w)*(1.-age*.4));}`,FLAME_E,{mode:'energy'});
      S.pts(G.part,30,VV+cellGLSL+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.4;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 p=cellP(i)+vec3((aSeed.z-.5)*.7+sin(t*6.+aSeed.w*9.)*.08,.2+t*(1.4+aSeed.z),(aSeed.y-.5)*.7);
       vR=0.;vK=0.;vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.06+.04*aSeed.w);}`,SPARK_E,{mode:'energy'});
      const scorch=gp(CROSS_SIZE,TX,0.019,S.mat(`void main(){vec2 p=(vUv-.5)*${f(CROSS_SIZE/TILE)};p.y=-p.y;vec2 c=floor(p+.5);
        if(abs(c.x)+abs(c.y)>1.)discard;float r=length(p-c)*2.;float n=styNoise(vUv*1.2+c*.3).r;float m=smoothstep(.85,.6,r+(n-.5)*.5);if(m<.01)discard;
        float er=styErode(n,uP,.15);gl_FragColor=vec4(styRampOf(vec3(.14,.08,.05),.2+.3*n),m*er*uA*.5);}`,{},{mode:'matter'}));G.decal.add(scorch);
      G.pose=te=>{set(scorch,-0.1+1.15*ss(0.7,1.0,te),ss(0.32,0.45,te));};STY.llamas=G;
    }
    {// estrellas: una estrella cae en cada casilla y estalla en chispas de púas
      const G=mkG(a),st=[];
      CELLS.forEach((c,ci)=>{const s=new THREE.Mesh(new THREE.PlaneGeometry(0.22,2.0),S.mat(STARFALL_FS,{},{mode:'energy',depthTest:false}));
        s.userData={t:c[2],p:CP[ci].clone(),hs:S.hitSpark(G.mesh,ci?1.5:2.0,{seed:0.17*ci+0.1})};G.trail.add(s);st.push(s);});
      S.pts(G.part,40,VV+cellGLSL+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.05;float life=.32+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,.7,0.));vec3 p=cellP(i)+vec3(0.,.5,0.)+d*(.3+.9*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,-.4*t*t,0.);
       vR=aSeed.y*6.28+t*3.;vK=age;vA=(age>0.&&age<1.)?1.:0.;put(p,.18+.1*aSeed.w);}`,SPARK_E,{mode:'energy'});
      G.pose=te=>{for(const s of st){const u=s.userData,k=cl((te-(u.t-0.09))/0.09);
        s.visible=te>=u.t-0.09&&te<u.t+0.04;s.position.set(u.p.x,0.5+3.8*(1-k)+0.8,u.p.z);billboard(s);s.material.uniforms.uA.value=1-cl((te-u.t)/0.04);
        u.hs.pose(te-u.t,tmp.set(u.p.x,0.6,u.p.z),1);}};
      STY.estrellas=G;
    }
    // estados opcionales sobre todos los alcanzados
    const SK=["slow","weak","fragile","burn"],SG={},ST=SK.map(k=>({kind:k,env:0,on:false}));
    SK.forEach(k=>{SG[k]=S.status(a,k,who,0.45,1.0);});
    let SV={style:style0};
    options(a,VAR,{style:style0,slow:!!cfg.slow,weak:!!cfg.weak,fragile:!!cfg.fragile,burn:!!cfg.burn},s=>{SV=s;
      for(const k in STY)STY[k].show(k===s.style);
      SK.forEach((k,i)=>{ST[i].on=!!s[k];SG[k].setVisible(ST[i].on);});},"cristal");
    a.pose=function(te,o){
      const ia=te-TCH,ch=cl(te/TCH);
      caster.rotation.z=0.12*ss(0,TCH,te)-0.22*ss(TCH-0.02,TCH+0.04,te)+0.1*ss(TCH+0.1,TCH+0.5,te);
      enemies[0].position.set(TX-TILE,0,0);enemies[1].position.set(TX,0,-TILE);
      who.forEach((w,i)=>{const h=ex(te-HT[i],7),up=te>=HT[i]?0.12*Math.sin(Math.PI*cl((te-HT[i])/0.22)):0;w.position.y=up;w.rotation.z=-h*0.15*Math.cos((te-HT[i])*15);});
      enemies[0].position.x-=0.08*ex(te-HT[1],6);enemies[1].position.z-=0.08*ex(te-HT[2],6);target.position.x+=0.06*ex(ia,6);
      set(tiles,ch,ss(0,0.08,te)*(1-ss(0.8,1.0,te)));
      const cg=ss(0,TCH,te),pop=cl(ia/0.05);core.visible=pop<1;core.position.copy(CORE);
      core.scale.setScalar(Math.max((0.08+0.24*cg)*(1+0.08*Math.sin(te*40))*(1+0.6*pop),0.001));
      spark.pose(ia,CORE,1);ring.pose(ia,TX,0,0.45,1);
      STY[SV.style].pose(te);
      SK.forEach((k,i)=>{ST[i].env=ST[i].on?SG[k].pose(te):0;});S.statusGlow(o,ST);
      if(ia<0){o.g.copy(CORE);o.gs=0.3+0.6*ch;o.ga=0.15*ch;o.li=2*ch;}
      else{o.g.set(TX,0.6,0);o.gs=1.4+2*ia;o.ga=Math.exp(-ia*9)*0.3;o.li=5*Math.exp(-ia*3.5);}
      o.ia=ia;o.c.copy(CORE);o.shake=0;o.dist=0.7;o.ld=10;
    };
  }};
  if(VAR){def.variants=[["cristal","Cristal"],["esporas","Esporas"],["llamas","Llamas"],["estrellas","Estrellas"],
    ["lento","Cristal + lento"],["debil","Esporas + débil"],["fragil","Estrellas + frágil"],["quema","Llamas + quemadura"]];def.v="cristal";def.vlabel="Estilo";}
  return def;
};

// =====================================================================
// CATACLISMO (1,6 s, ti 0,75, nivel 3) — efecto de jefe: el cielo se oscurece (o.dark moderado), una espiral de nubes
// de tormenta con luz gira sobre el centro, cae una columna de energía y revienta: hongo de polvo y ceniza con
// volumen, llamas, roca que salta, grietas con borde incandescente y ondas en la cruz. Opción burn.
// =====================================================================
const VORTEX_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float n=styNoise(vec2(an*.32+r*.35-uT*.12,r*.6)).r;
 float sw=fract(an/6.2832*3.+r*1.4-uT*.7+(n-.5)*.35);
 float arm=smoothstep(.0,.12,sw)*smoothstep(.62,.38,sw);
 float m=arm*smoothstep(1.,.45,r)*smoothstep(.08,.3,r);m=max(m,smoothstep(.3,.18,r)*uP);
 float er=styErode(n*.6+m*.4,1.-uA,.12);if(m*er<.01)discard;
 float l=.35+.45*sw+.2*(1.-r);vec3 c=styRampOf(${ASH},clamp(l,0.,1.));c=mix(c,styRamp(.95)*1.3,smoothstep(.3,.12,r)*uP);
 gl_FragColor=vec4(c,m*er*.92);}`;
const BEAM_FS=`void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),1.4);gl_FragColor=vec4(styRamp(.72+.2*c)*.95,c*uA*.8);}`;
const CRACK_FS=`void main(){vec2 p=(vUv-.5)*${f(TILE*3.6)};float r=length(p);float an=atan(p.y,p.x);
 float j=styNoise(vec2(r*.25,an*.2)).r-.5;
 float rays=pow(1.-abs(fract(an*1.43+j*.6)*2.-1.),22.)+pow(1.-abs(fract(an*2.71+j+.37)*2.-1.),30.)*smoothstep(.6,2.,r);
 float reach=smoothstep(uP*${f(TILE*1.8)},uP*${f(TILE*1.8)}-.4,r);
 float m=rays*reach*smoothstep(${f(TILE*1.8)},${f(TILE*1.1)},r)+smoothstep(.9,.2,r)*.6*reach;if(m<.02)discard;
 vec3 dark=vec3(.06,.04,.035);vec3 hot=styRamp(.95)*1.5;
 gl_FragColor=vec4(mix(dark,hot,clamp(rays*uA,0.,1.)),min(m,1.)*(.55+.45*uA));}`;
B.CATACLISMO=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{normal:{burn:false},quema:{burn:true}}:null;
  const def={gridArea:'root',areaCells:1,zoneTarget:TILE*1.6,key:cfg.key||"sty_basic_cataclismo",name:cfg.name||"Cataclismo",dur:1.6,ti:0.75,tier:3,enemies:2,pal:cfg.pal||"Fuego",stylized:true,
    phases:[["Velo",0],["Concentración",0.3],["Columna",0.62],["Impacto",0.75],["Ondas",0.9],["Disipación",1.25]],
  build(a){
    const L=a.L,TB=0.62,TI=0.75,CX=TX,SKY=5.6;
    const who=[target,enemies[0],enemies[1]];
    const CP=CELLS5.map(c=>V3(CX+c[0]*TILE,0,c[1]*TILE));
    const tiles=gp(CROSS_SIZE,CX,0.021,S.mat(crossFS([TI,TI,TI,TI,TI]),{},{mode:'energy'}));
    const crack=gp(TILE*3.6,CX,0.024,S.mat(CRACK_FS,{},{mode:'matter'}));
    L.decal.add(tiles,crack);
    const ring1=bigRing(L.decal,TILE*4.2),ring2=bigRing(L.decal,TILE*2.8);
    const vortex=new THREE.Mesh(new THREE.PlaneGeometry(7,7).rotateX(Math.PI/2),S.mat(VORTEX_FS,{},{mode:'matter'}));vortex.position.set(CX,SKY,0);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,14,16,1,true),S.mat(BEAM_FS,{},{mode:'energy'}));
    L.mesh.add(vortex);L.trail.add(beam);
    const spark=S.hitSpark(L.mesh,4,{seed:0.53,grow:0.08,life:0.3});
    const cellGLSL=`vec3 cellP(float i){${CP.map((p,i)=>`if(i<${f(i+0.5)})return ${v3(p)};`).join("")}return ${v3(CP[0])};}
    float cellI(){return floor(min(aSeed.w*5.,4.));}`;
    const K=`const float TI=${f(TI)};const float TB=${f(TB)};const float CX=${f(CX)};`;
    // energía que sube en espiral desde la cruz hasta la tormenta
    S.pts(L.part,60,VV+K+cellGLSL+`void main(){float i=cellI();float life=.35+aSeed.y*.2;float s=.1+aSeed.x*${f(TB-0.1-0.35)};float age=(uT-s)/life;
     float an=aSeed.z*6.2832+age*4.;float rad=mix(.6,.15,age);vec3 c=mix(cellP(i),vec3(CX,0.,0.),age*.7);
     vec3 p=c+vec3(cos(an)*rad,age*age*${f(SKY)},sin(an)*rad);vR=aSeed.y*6.28;vK=0.;
     vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age*age):0.;put(p,.1+.06*aSeed.w);}`,SPARK_E,{mode:'energy'});
    // hongo de polvo y ceniza con volumen
    S.pts(L.part,60,VV+K+cellGLSL+`void main(){float i=floor(min(aSeed.w*7.,6.));vec3 base=i<5.?cellP(i):vec3(CX,0.,0.);
     float s=TI+aSeed.x*.08;float t=max(uT-s,0.);float life=.75+aSeed.y*.3;float age=t/life;float an=aSeed.z*6.2832;
     float up=i<5.?.4:1.;vec3 p=base+vec3(cos(an),0.,sin(an))*(.2+.9*(1.-exp(-t*4.)))*(i<5.?.6:1.)+vec3(0.,.25+(1.6*up+.6*aSeed.y)*(1.-exp(-t*3.)),0.);
     vR=aSeed.w*6.28+t*.4;vK=smoothstep(.35,1.,age);vA=(uT>s&&age<1.)?1.:0.;put(p,(.6+.4*fract(aSeed.y*5.3))*(.45+.7*(1.-exp(-t*5.))));}`,PUFF_ASH);
    // llamas en el centro
    S.pts(L.part,40,VV+K+`void main(){float s=TI+aSeed.x*.35;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;vec3 p=vec3(CX,0.,0.)+vec3(cos(an),0.,sin(an))*(.15+.7*aSeed.y)+vec3(0.,.15+t*(2.+aSeed.z),0.);
     vR=(aSeed.y-.5)*.5;vK=smoothstep(.25,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,(.55+.3*aSeed.w)*(1.-age*.4));}`,FLAME_E,{mode:'energy'});
    // roca que salta de las casillas
    S.pts(L.part,40,VV+K+cellGLSL+`void main(){float i=cellI();float s=TI+aSeed.x*.06;float life=.65+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()*vec3(1.,.2,1.)+vec3(0.,1.2,0.));vec3 p=cellP(i)+vec3((aSeed.z-.5)*.6,.05,(aSeed.y-.5)*.6)+d*(2.5+4.*aSeed.z)*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.05);
     vR=aSeed.y*6.28+t*8.;vK=smoothstep(.6,1.,age);vA=(age>0.&&age<1.)?1.:0.;put(p,.18+.12*aSeed.y);}`,ROCKCHIP);
    // brasas
    S.pts(L.part,40,VV+K+cellGLSL+`void main(){float i=cellI();float s=TI+aSeed.x*.5;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=cellP(i)+vec3((aSeed.z-.5)*.9+sin(t*5.+aSeed.w*9.)*.1,.1+t*(1.2+aSeed.z),(aSeed.y-.5)*.9);
     vR=0.;vK=0.;vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*30.+aSeed.x*50.)):0.;put(p,.07+.04*aSeed.w);}`,SPARK_E,{mode:'energy'});
    const BR=S.status(a,"burn",who,0.85,1.6),ST=[{kind:"burn",env:0}];let BON=false;
    options(a,VAR,{burn:!!cfg.burn},s=>{BON=!!s.burn;BR.setVisible(BON);},"normal");
    a.pose=function(te,o){
      const ia=te-TI,fall=cl((te-TB)/(TI-TB));
      caster.rotation.z=0.16*ss(0,TB,te)-0.34*ss(TB,TI,te)+0.18*ss(TI+0.1,TI+0.6,te);caster.position.y=0.12*ss(0.1,TB,te)*(1-ss(TI,TI+0.15,te));
      enemies[0].position.set(CX-TILE,0,0);enemies[1].position.set(CX,0,-TILE);
      const air=ia>0?Math.sin(Math.PI*cl(ia/0.55)):0;
      who.forEach((w,i)=>{w.position.y=(i?0.45:0.6)*air;w.rotation.z=-(i?0.3:0.4)*air*(i===1?-1:1);});
      enemies[0].position.x-=0.25*air;enemies[1].position.z-=0.25*air;
      o.dark=0.6*ss(0,0.45,te)*(1-ss(1.25,1.6,te));
      set(tiles,cl(te/TB),ss(0,0.2,te)*(1-ss(1.2,1.5,te)));
      vortex.visible=te<TI+0.45;vortex.material.uniforms.uP.value=ss(0.3,TB,te);
      vortex.material.uniforms.uA.value=ss(0.05,0.4,te)*(1-ss(TI,TI+0.45,te));vortex.rotation.y=-te*0.8;
      beam.visible=te>=TB&&ia<0.3;beam.position.set(CX,7+(1-fall)*(SKY+1),0);
      const bw=ia>0?1+2*Math.exp(-ia*9):1;beam.scale.set(bw,1,bw);beam.material.uniforms.uA.value=ia>0?0.7*(1-cl(ia/0.3)):1;
      spark.pose(ia,tmp.set(CX,0.8,0),1);
      ring1.pose(ia,CX,0,0.7,1);ring2.pose(ia-0.12,CX,0,0.6,1);
      crack.visible=ia>=0;crack.material.uniforms.uP.value=cl(ia/0.25);crack.material.uniforms.uA.value=ia>=0?1-ss(0.3,0.85,ia):0;
      ST[0].env=BON?BR.pose(te):0;S.statusGlow(o,ST);
      o.white=ia>=0?0.25*Math.exp(-ia*25):0;
      if(ia>=0){o.g.set(CX,1,0);o.gs=2+3*ia;o.ga=Math.exp(-ia*9)*0.4;o.li=10*Math.exp(-ia*3.5)+(BON?1.5*ST[0].env:0);}
      else if(te>=TB){o.g.set(CX,(1-fall)*SKY,0);o.gs=1.4;o.ga=0.4;o.li=5;}
      else{const k=ss(0.1,TB,te);o.g.set(CX,SKY*0.8,0);o.gs=1.5*k;o.ga=0.15*k;o.li=2*k;}
      o.ia=ia;o.c.set(CX,0.6,0);o.shake=1.8;o.dist=1.4;o.ld=12;
    };
  }};
  if(VAR){def.variants=[["normal","Normal"],["quema","Quemadura"]];def.v="normal";def.vlabel="Efecto";}
  return def;
};

// demostraciones del laboratorio (con sus variantes)
VFX.module("Estilizado · Distancia y área",["ESCUPITAJO","BABA_PEGAJOSA","FLECHA","PROYECTIL_MAGICO","RAFAGA","NOVA_CRUZ","CATACLISMO"]
  .filter(k=>B[k]).map(k=>B[k]({key:"sty_basic_"+k.toLowerCase(),name:k+" (estilizado)",demo:true})));
})();

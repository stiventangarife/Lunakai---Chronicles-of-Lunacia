// =====================================================================
// SAPIDAE · ASTROMANTE — curvatura del espacio-tiempo y gravedad
// El lanzador es el Sapidae (domador): mano ≈ (-3.35,1.15,0.25), cabeza ≈ (-3.7,1.6,0).
// Estética: lente gravitacional, agujeros negros, portales, estrellas y rejillas de espacio-tiempo.
// Mismo contrato: {key,name,dur,ti,phases,pal,tier} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,SCORCH_FS,
  camera,caster,target,allies,ALLY_POS,enemies,ENEMY_POS}=VFX;
const {NB,SOLID,v3,STAR4_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

VFX.palette("Curvatura Astral",["#dcd0ff","#8A6CE0"]);
const PAL="Curvatura Astral";
const HAND=V3(-3.35,1.15,0.25);           // mano del Sapidae
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const GOLD="vec3(1.,.78,.32)";            // corona solar (color semántico fijo del eclipse)

// ---------- piezas compartidas ----------
// pozo: espiral de anillos que fluye hacia el centro (gravedad), sin grietas
const WELL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float sw=fract(r*3.+uT*1.6+an*.159155);
 float m=band(sw,.5,.09)*smoothstep(1.,.3,r)*smoothstep(0.,.18,r)+band(r,.95,.02);
 gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.25,m*uA*.75);}`;
// sigilo astral: círculos con estrella de ocho puntas que gira despacio
const SIGIL_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float m=band(r,.92,.02)+band(r,.78,.012);
 float st=.3+.42*pow(abs(cos(an*4.+uT*.5)),6.);m+=band(r,st,.02)*step(r,.75);
 m+=band(r,.86,.04)*step(.6,fract(an/6.2832*24.-uT*.3))*.7;
 gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,m*uA);}`;
// portal estelar: disco negro (mezcla normal) + borde y brazos en espiral (aditivo); uP = apertura
const PORTAL_DARK_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2./max(uP,.001);
 gl_FragColor=vec4(vec3(.01,0.,.02),smoothstep(.85,.6,r)*uA*.95);}`;
const PORTAL_RIM_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2./max(uP,.001);float an=atan(p.y,p.x);
 float sw=an*2.+r*6.-uT*14.;
 float arms=smoothstep(.3,.9,.5+.5*sin(sw))*smoothstep(.95,.55,r)*smoothstep(.2,.6,r);
 float rim=band(r,.8,.06);
 gl_FragColor=vec4(mix(uC2,uC1,rim+arms*.5)*1.6,(rim+arms*.45)*step(r,1.)*uA);}`;
// partícula dorada (corona)
const GOLD_PT_FS=HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(${GOLD},vec3(1.,.95,.85),smoothstep(.25,0.,d))*1.5,a);}`;

// =====================================================================
// 1 · STARGAZER VORTEX — micro agujero negro con disco de acreción sobre el rival; succiona en espiral
//     y detona en una onda cónica repulsiva de 2 casillas. Nivel 2: sin fractura, sin temblor
// =====================================================================
const vortex={key:"stargazer_vortex",name:"Vórtice estelar",dur:2.2,ti:1.25,pal:PAL,tier:2,
  phases:[["Singularidad",0],["Acreción",0.35],["Succión",0.6],["Detonación",1.25],["Disipación",1.5]],
build(a){
  const L=a.L,TS=0.35,TU=0.6,TI=1.25,BC=V3(3.4,2.45,0),R=2.0,H=BC.y;
  // núcleo: esfera opaca negra (escribe profundidad, así tapa la mitad trasera del disco) con borde violeta
  const core=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.);
   gl_FragColor=vec4(vec3(.004,.002,.01)+uC2*fr*.45,1.);}`,SOLID)); core.position.copy(BC);
  // anillo de fotones + imagen lenteada del disco (más gruesa arriba), en billboard
  const photon=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float ring=band(r,.4,.022+.012*uP);
   float lens=band(r,.5,.07)*(.35+.65*smoothstep(-.2,.6,p.y))*.6;
   float arcs=band(r,.6,.03)*smoothstep(.35,.9,noise(vec3(cos(an)*3.,sin(an)*3.,uT*3.)))*.7;
   float n=.7+.3*noise(vec3(cos(an)*8.,sin(an)*8.,uT*9.));
   float al=(ring*n*1.4+lens+arcs+band(r,.45,.25)*.12*uP)*smoothstep(1.,.8,r)*uA;
   gl_FragColor=vec4(mix(uC1,vec3(1.),ring*.6)*1.6,al);}`));
  // disco de acreción: espiral logarítmica que gira hacia dentro; el lado que "se acerca" brilla más
  const RI=0.3,RO=1.0;
  const tilt=new THREE.Group(); tilt.position.copy(BC); tilt.rotation.set(0.42,0,0.18);
  const disk=new THREE.Mesh(new THREE.RingGeometry(RI,RO,96,6).rotateX(-Math.PI/2),fx(`void main(){float r=length(vP.xz);
   float k=(r-${f(RI)})/${f(RO-RI)};float an=atan(vP.z,vP.x);
   float sw=an+log(r)*3.-uT*(7.+5.*uP);
   float n=noise(vec3(cos(sw)*2.,sin(sw)*2.,k*5.-uT*1.5))*.65+noise(vec3(cos(sw)*5.,sin(sw)*5.,k*14.))*.35;
   float st=smoothstep(.35,.85,n);float dop=.6+.6*sin(an+.6);float inner=smoothstep(.28,0.,k);
   float al=(st*.8+.15+inner*.9)*smoothstep(0.,.06,k)*smoothstep(1.,.55,k)*dop*uA;
   gl_FragColor=vec4(mix(uC2,uC1,1.-k)*1.5+vec3(1.)*inner*.7,al);}`));
  tilt.add(disk);
  // onda cónica repulsiva: cono abierto con vértice en la singularidad y base de 2 casillas en el suelo
  const cone=new THREE.Mesh(new THREE.ConeGeometry(R,H,56,8,true),fx(`void main(){float v=vP.y/${f(H)}+.5;float fr=1.-v;
   float an=atan(vP.z,vP.x);
   float w=band(fr,uP,.14)+band(fr,uP-.2,.07)*.5;
   float st=.55+.45*noise(vec3(cos(an)*3.,sin(an)*3.,fr*6.-uT*10.));
   float tr=step(fr,uP)*smoothstep(uP-.7,uP,fr)*.16;
   gl_FragColor=vec4(mix(uC1,vec3(1.),w*.4)*1.5,(w*st+tr)*uA);}`));
  cone.position.set(BC.x,H/2,0);
  L.mesh.add(core,photon,tilt,cone);
  const C=`const float TS=${f(TS)};const float TU=${f(TU)};const float TI=${f(TI)};const vec3 BC=${v3(BC)};const vec3 HA=${v3(HAND)};`;
  // hilo estelar de la mano del Sapidae al punto de la singularidad
  a.count+=points(L.part,60,C+`void main(){float s=.04+aSeed.x*.28;float life=.3+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 m=mix(HA,BC,.5)+vec3(0.,1.3,0.);vec3 r=rnd();
   vec3 p=mix(mix(HA,m,k),mix(m,BC,k),k)+r*.08*(1.-k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age)*.8:0.;put(p,.03+.035*aSeed.z);}`);
  // materia succionada en espiral hacia el horizonte
  a.count+=points(L.part,300,C+`void main(){float life=.75;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float R0=.9+1.7*r.x;float rad=R0*pow(1.-age,1.4)+.05;float an=r.y*6.2832+age*age*7.;
   vec3 p=BC+vec3(cos(an)*rad,(r.z-.5)*1.3*(1.-age)*(1.-age),sin(an)*rad);
   vA=(k>=1.&&uT<TI)?smoothstep(0.,.25,age)*(.5+.5*age):0.;put(p,(.025+.035*r.z)*(1.-age*.4));}`);
  // jirones arrancados del rival
  a.count+=points(L.part,100,C+`void main(){float life=.6;float k=(uT-TU)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p0=vec3(3.4+(r.x-.5)*.7,.15+r.y*1.5,(r.z-.5)*.7);float an=r.x*6.2832+age*6.;
   vec3 p=mix(p0,BC,age*age)+vec3(cos(an),0.,sin(an))*.35*sin(age*3.14159);
   vA=(k>=1.&&uT<TI)?sin(age*3.14159):0.;put(p,.025+.03*r.z);}`);
  // estallido repulsivo hacia abajo y afuera
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.06;float life=.5+aSeed.y*.45;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 d=normalize(vec3(r.x,-.35-abs(r.y)*.9,r.z));
   vec3 p=BC+d*(.4+2.6*aSeed.z)*(1.-exp(-t*3.5));p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.05*aSeed.w)*(1.-age*.5));}`);
  a.count+=sparks(L.part,180,TI,`${f(BC.x)},${f(BC.y)},0.`,"0.,-.6,0.",3,8,1.5);
  // suelo: pozo que tira hacia el rival durante la succión y onda en la base del cono (sin grietas)
  const well=groundPlane(3.0,3.4,0.02,fx(WELL_FS)), shock=groundPlane(5.6,3.4,0.03,fx(RING_FS));
  L.decal.add(well,shock);
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0,TS,te), suck=ia<0?ss(TU-0.1,TU+0.1,te):0, col=ia<0?1-ss(TI-0.12,TI,te):0;
    caster.rotation.z=0.12*ss(0,TS,te)-0.18*ss(TS,TS+0.1,te)+0.06*ss(TS+0.2,TI,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,0.2,te)*(1-ss(0.35,0.7,te));
    // la singularidad crece, se agita al succionar e implosiona justo antes de detonar
    const sc=grow*col*(1+0.06*Math.sin(te*23)*suck), on=sc>0.002;
    core.visible=photon.visible=tilt.visible=on;
    core.scale.setScalar(Math.max(0.24*sc,0.001));
    photon.position.copy(BC); billboard(photon); photon.scale.setScalar(Math.max(1.5*sc*(1+0.1*suck),0.001));
    set(photon,suck,1+1.5*ss(TI-0.12,TI,te));
    tilt.scale.setScalar(Math.max(sc*(0.6+0.4*ss(TS,TU,te)),0.001)); set(disk,suck,ss(0.1,TS+0.15,te));
    // cono: el frente baja del vértice a la base de 2 casillas
    cone.visible=ia>=0&&ia<0.65; set(cone,1.15*(1-Math.pow(1-cl(ia/0.42),2)),ia>=0?Math.pow(1-cl(ia/0.65),1.2):0);
    const q=cl((ia-0.3)/0.5); set(shock,0.75+0.25*q,ia>=0.3?(1-q)*0.9:0);
    well.material.uniforms.uA.value=suck*(1-ss(TI-0.05,TI+0.15,te));
    // el rival se estira hacia el agujero y luego sale repelido
    const hit=ia>=0?Math.exp(-ia*4):0, pull=suck;
    target.position.x=3.4+(ia>=0?0.32*hit*(1-Math.exp(-ia*14)):0);
    target.scale.set(1-0.04*pull+0.08*hit,1+0.07*pull-0.12*hit,1-0.04*pull+0.08*hit);
    target.rotation.z=0.04*pull*Math.sin(te*31)-(ia>=0?0.22*hit*Math.cos(ia*13):0);
    o.em=pull*0.3; o.emc.copy(U.uC2.value);
    if(ia<0){o.g.copy(BC);o.gs=1.4*grow+0.6*suck;o.ga=0.14*grow;o.li=1.2*grow+2.2*suck;}
    else{o.g.set(BC.x,1.3,0);o.gs=1.6+4*ia;o.ga=Math.exp(-ia*10)*0.7;o.li=8*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(BC);o.shake=0;o.dist=1.0;
  };
}};

// =====================================================================
// 2 · STARGAZER TRANSPOSE — pilares gemelos sobre el Sapidae y un aliado; se desmaterializan hacia el
//     cielo, cruzan y reaparecen intercambiados con una onda de escudo. Nivel 2
// =====================================================================
const transpose={key:"stargazer_transpose",name:"Transposición",dur:2.3,ti:1.15,pal:PAL,tier:2,allies:1,
  phases:[["Pilares",0],["Desmaterialización",0.4],["Cruce",0.8],["Reaparición",1.15],["Escudo",1.3]],
build(a){
  const L=a.L,TP=0.35,TD=0.4,TX=0.8,TI=1.15,TE=2.3,PA=V3(-3.7,0,0),PB=ALLY_POS[0].clone(),PS=[PA,PB];
  // pilares de luz: bajan del cielo (uP de 1 a 0) con vetas que ascienden
  const PILLAR_FS=`void main(){float h=vP.y/9.+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(cos(an)*2.,sin(an)*2.,h*10.-uT*6.))*.6+noise(vec3(cos(an)*5.,sin(an)*5.,h*24.-uT*11.))*.4;
   float fr=pow(abs(dot(normalize(vN),normalize(vV))),1.4);
   float drop=smoothstep(uP-.04,uP+.04,h);
   float al=fr*(.35+.65*smoothstep(.35,.8,n))*drop*smoothstep(1.,.6,h)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,fr+n*.3)*1.4+vec3(1.)*smoothstep(.7,.9,n)*.3,al);}`;
  const pMat=fx(PILLAR_FS), cMat=fx(PILLAR_FS);
  const pillars=PS.map(P=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,9,32,1,true),pMat);m.position.set(P.x,4.5,P.z);return m;});
  const cores=PS.map(P=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,9,16,1,true),cMat);m.position.set(P.x,4.5,P.z);return m;});
  L.trail.add(...pillars,...cores);
  // onda expansiva de escudo: cúpula con meridianos y paralelos que se abre al reaparecer
  const SHIELD_FS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);vec3 q=normalize(vP);
   float cells=band(fract(atan(q.z,q.x)*3.8197),.5,.04)+band(fract(q.y*5.),.5,.05);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.5,(fr*.8+cells*.3*fr+.05)*(1.-uP*.5)*uA);}`;
  const shields=PS.map(P=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),fx(SHIELD_FS));m.position.copy(P);return m;});
  L.mesh.add(...shields);
  const C=`const float TD=${f(TD)};const float TX=${f(TX)};const float TI=${f(TI)};`;
  // desmaterialización: polvo estelar que sube en espiral desde cada cuerpo
  for(const P of PS){
    const D=C+`const vec3 P=${v3(P)};void main(){float s=TD+aSeed.x*(TX-TD-.05);float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832+t*3.;float rad=.34*(1.-.6*min(t*2.,1.));
     vec3 p=P+vec3(cos(an)*rad,.1+aSeed.w*1.6+t*(2.4+2.*aSeed.y),sin(an)*rad);
     vA=(age>0.&&age<1.)?(1.-age):0.;put(p,`;
    a.count+=points(L.part,110,D+`(.025+.03*aSeed.y)*(1.-age*.5));}`);
    a.count+=points(L.part,40,D+`(.09+.07*aSeed.y)*(1.-age*.5));}`,STAR4_FS);
  }
  // cruce: cada corriente viaja por el cielo al otro pilar y baja por él
  for(const [A,B] of [[PA,PB],[PB,PA]]){
    a.count+=points(L.part,110,C+`const vec3 A5=${v3(V3(A.x,5,A.z))};const vec3 B5=${v3(V3(B.x,5,B.z))};
    void main(){float s=TX-.12+aSeed.x*.22;float t=uT-s;
     float k1=clamp(t/.24,0.,1.);float k2=clamp((t-.24)/.2,0.,1.);vec3 r=rnd();
     vec3 p=mix(A5,B5,k1)+vec3(0.,sin(3.14159*k1)*1.1,0.)+r*.18*(1.-k2*.6);p.y-=k2*(4.2+r.y*.3);
     vA=(t>0.&&t<.44)?(.5+.5*sin(t*40.+aSeed.z*30.)):0.;put(p,.03+.035*aSeed.w);}`);
    a.count+=sparks(L.part,60,TI,`${f(B.x)},1.,${f(B.z)}`,"0.,.5,0.",2,5,1.8);
  }
  // sigilos en ambas casillas y anillos de la onda de escudo
  const glyphs=PS.map(P=>{const g=groundPlane(2.2,P.x,0.02,fx(SIGIL_FS));g.position.z=P.z;return g;});
  const rings=PS.map(P=>{const g=groundPlane(3.2,P.x,0.03,fx(RING_FS));g.position.z=P.z;return g;});
  L.decal.add(...glyphs,...rings);
  const MID=V3((PA.x+PB.x)/2,0,(PA.z+PB.z)/2);
  a.pose=function(te,o){
    const ia=te-TI, drop=ss(0,TP,te), dis=ss(TD,TX,te), re=ia>=0?ss(0,0.18,ia):0;
    // posiciones: antes del cruce cada uno en la suya; después, intercambiados
    const pc=ia<0?PA:PB, pl=ia<0?PB:PA, al=allies[0];
    caster.position.copy(pc); al.position.copy(pl);
    const vis=te<TX||ia>=0; caster.visible=vis; al.visible=vis;
    const sxz=ia<0?1-0.75*dis:0.25+0.75*re+0.1*Math.sin(ia*28)*Math.exp(-ia*7)*re, sy=ia<0?1+0.35*dis:1.35-0.35*re;
    for(const d of [caster,al]){d.scale.set(sxz,sy,sxz);const m=d.userData.m;m.emissive.copy(U.uC1.value);
      m.emissiveIntensity=ia<0?1.2*dis:1.1*Math.exp(-ia*5);}
    caster.rotation.z=ia<0?0.1*ss(0,TP,te):0;
    const cross=ss(TX-0.1,TX,te)*(1-ss(TI,TI+0.2,te));
    set(pillars[0],1-drop,ss(0,0.1,te)*(1-ss(TI+0.15,TI+0.6,te))*(1+0.8*cross));
    for(const c of cores)c.visible=te>TD&&ia<0.6;
    set(cores[0],0,0.6*dis*(ia<0?1:0)+(ia>=0?Math.exp(-ia*6):0));
    shields.forEach((m,i)=>{const k=cl(ia/0.6);m.visible=ia>=0&&k<1;m.scale.setScalar(0.5+1.0*(1-Math.pow(1-k,2)));set(m,k,1-k);});
    rings.forEach(r=>{const k=cl(ia/0.5);set(r,1-Math.pow(1-k,2),ia>=0?(1-k)*0.85:0);});
    for(const g of glyphs)g.material.uniforms.uA.value=ss(0,0.2,te)*(1-ss(TE-0.5,TE,te));
    if(te<TX){o.g.set(MID.x,2.2,MID.z);o.gs=2*drop;o.ga=0.18*drop;o.li=1.5*drop+2*dis;}
    else if(ia<0){o.g.set(MID.x,5.4,MID.z);o.gs=2;o.ga=0.3;o.li=3;}
    else{o.g.set(PB.x,1.1,PB.z);o.gs=1.2+2.5*Math.min(ia,0.6);o.ga=Math.exp(-ia*8)*0.6;o.li=5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(PB.x,1.1,PB.z);o.shake=0;o.dist=0.5;o.flash=0;
  };
}};

// =====================================================================
// 3 · STARGAZER JUMP — portal negro bajo el Sapidae, línea de distorsión a ras de baldosas y reaparición
//     3 casillas delante con un pulso que ralentiza al rival adyacente. Nivel 1: rápido y pequeño
// =====================================================================
const jump={key:"stargazer_jump",name:"Salto estelar",dur:1.3,ti:0.38,pal:PAL,tier:1,enemies:1,
  phases:[["Portal",0],["Distorsión",0.12],["Reaparición",0.28],["Pulso",0.38],["Lentitud",0.6]],
build(a){
  const L=a.L,TO=0.12,TS=0.24,TR=0.28,TI=0.38,DUR=1.3,P0=V3(-3.7,0,0),P1=V3(-0.7,0,0),EP=V3(0.35,0,0.95),DEEP=1.95;
  const portal=x=>{const d=groundPlane(1.3,x,0.022,fx(PORTAL_DARK_FS,NB)), r=groundPlane(1.3,x,0.026,fx(PORTAL_RIM_FS));L.decal.add(d,r);return [d,r];};
  const por0=portal(P0.x), por1=portal(P1.x);
  // línea de distorsión óptica a ras de suelo: ondas de refracción que avanzan hasta la casilla destino
  const line=groundPlane(P1.x-P0.x,(P0.x+P1.x)/2,0.02,fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   if(u>uP)discard;
   float wob=sin(u*40.-uT*30.)*.14*(1.-abs(v));
   float core=band(v+wob,0.,.09);
   float side=band(abs(v)-.55+sin(u*25.+uT*20.)*.1,0.,.05)*.5;
   float rip=band(fract(u*8.-uT*6.),.5,.06)*smoothstep(1.,.2,abs(v))*.5;
   float head=smoothstep(uP-.25,uP,u);
   gl_FragColor=vec4(mix(uC2,uC1,core+head*.5)*1.5+vec3(.6,.7,1.)*side*.4,(core+side+rip)*(.4+.6*head)*uA);}`),0.5);
  // pulso de ralentización: anillo al ras y otro a la altura del pecho
  const pulse=groundPlane(2.6,P1.x,0.03,fx(RING_FS)), air=groundPlane(2.2,P1.x,0.9,fx(RING_FS));
  const mark=groundPlane(1.3,EP.x,0.02,fx(WELL_FS)); mark.position.z=EP.z;
  L.decal.add(line,pulse,mark); L.trail.add(air);
  // reloj de onda lenta sobre el rival (glifo en el mundo): esfera de horas, aguja que gira despacio y ondas lentas
  const clock=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.x,p.y);
   float m=band(r,.82,.035)+band(r,.66,.015);
   float c12=abs(fract(an/6.2832*12.+.5)-.5);float tick=smoothstep(.07,.03,c12)*step(.68,r)*step(r,.8);
   vec2 d=vec2(sin(uP),cos(uP));float hd=length(p-d*clamp(dot(p,d),0.,.58));float hand=smoothstep(.045,.015,hd);
   float rip=band(r,fract(uT*.45)*.9,.05)*.45;float halo=smoothstep(1.,.2,r)*.08;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.2)*1.4,(m+tick+hand+rip+halo)*uA);}`,{depthTest:false}));
  // bandas lentas que descienden por el cuerpo del rival
  const slow=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.9,32,1,true),fx(`void main(){float h=vP.y/1.9+.5;
   float b=band(fract(h*3.+uT*.35),.5,.07);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,b)*1.3,(b*.55+fr*.12)*uA);}`));
  slow.position.set(EP.x,0.95,EP.z);
  L.mesh.add(clock,slow);
  const C=`const float TO=${f(TO)};const float TS=${f(TS)};const float TR=${f(TR)};const float TI=${f(TI)};
  const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 EP=${v3(EP)};`;
  // motas que caen en espiral dentro del portal
  a.count+=points(L.part,70,C+`void main(){float life=.16+aSeed.y*.08;float age=(uT-aSeed.x*(TS-.12))/life;
   float an=aSeed.z*6.2832+age*4.;float rad=mix(.9,.05,age*age);
   vec3 p=P0+vec3(cos(an)*rad,.04+(1.-age)*.5*aSeed.w,sin(an)*rad);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.022+.025*aSeed.y);}`);
  // destellos que se desprenden de la línea de distorsión
  a.count+=points(L.part,50,C+`void main(){float s=TO+aSeed.x*(TR-TO);float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=mix(P0.x,P1.x,(s-TO)/(TR-TO));
   vec3 p=vec3(x+(aSeed.z-.5)*.3,.03+t*(.6+.6*aSeed.w),(aSeed.w-.5)*.3);
   vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.02+.02*aSeed.z);}`);
  // reaparición: estallido de polvo estelar
  const RB=C+`void main(){float s=TI-.04+aSeed.x*.05;float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.8,0.));vec3 p=P1+vec3(0.,.6,0.)+d*(.3+.9*aSeed.z)*(1.-exp(-t*5.));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,`;
  a.count+=points(L.part,50,RB+`(.025+.03*aSeed.w)*(1.-age*.4));}`);
  a.count+=points(L.part,30,RB+`(.08+.06*aSeed.w)*(1.-age*.4));}`,STAR4_FS);
  // motas lentísimas que orbitan al rival ralentizado
  a.count+=points(L.part,60,C+`void main(){float life=1.2;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+uT*.5;float rad=.45+.25*r.y;
   vec3 p=EP+vec3(cos(an)*rad,.2+r.z*1.5+age*.15,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.02+.02*r.z);}`);
  a.count+=sparks(L.part,60,TI,`${f(P1.x)},.7,0.`,"0.,.4,0.",1.5,4,1.5);
  a.pose=function(te,o){
    const ia=te-TI, op0=ss(0,TO,te)*(1-ss(TR,TR+0.25,te)), op1=ss(TS-0.06,TR,te)*(1-ss(TI+0.1,TI+0.4,te));
    set(por0[0],op0,op0); set(por0[1],op0,op0); set(por1[0],op1,op1); set(por1[1],op1,op1);
    // el Sapidae se hunde en el portal, cruza bajo las baldosas y emerge en el destino
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    if(te<TS){const k=cl((te-0.07)/(TS-0.07));caster.position.set(P0.x,-DEEP*k*k,0);cm.emissiveIntensity=0.6*ss(0,0.1,te);}
    else if(te<TR){caster.visible=false;}
    else{const k=cl((te-TR)/(TI-TR));caster.position.set(P1.x,-DEEP*(1-k)*(1-k),0);
      const s=ia>=0?0.06*Math.sin(ia*30)*Math.exp(-ia*9):0; caster.scale.set(1-s,1+s,1-s);
      cm.emissiveIntensity=ia<0?0.8:0.8*Math.exp(-ia*6);}
    set(line,ss(TO,TR,te),ss(TO,TO+0.04,te)*(1-ss(TI,TI+0.3,te)));
    let p=cl(ia/0.45); set(pulse,1-Math.pow(1-p,2),ia>=0?1-p:0);
    p=cl(ia/0.35); set(air,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    // ralentización del rival adyacente: tinte violeta, reloj y bandas lentas hasta el final
    const env=ss(TI+0.05,TI+0.25,te)*(1-ss(DUR-0.25,DUR,te)), e=enemies[0];
    e.position.copy(EP); e.rotation.z=0.05*Math.sin(te*2.2)*env;
    const hit=ia>=0?Math.exp(-ia*7):0;
    e.userData.m.emissive.copy(U.uC2.value); e.userData.m.emissiveIntensity=0.45*env+0.6*hit;
    towardCam(clock.position,tmp.set(EP.x,1.2,EP.z),0.55); billboard(clock);
    clock.visible=env>0.001; clock.scale.setScalar(0.85*(1+0.35*Math.pow(1-cl((te-TI)/0.25),2))); set(clock,-0.6*(te-TI),env*0.85);
    slow.visible=env>0.001; set(slow,0,env*0.8); mark.material.uniforms.uA.value=env*0.6; U.uE.value=env;
    if(te<TS){o.g.set(P0.x,0.3,0);o.gs=0.9*op0;o.ga=0.25*op0;o.li=1.6*op0;}
    else if(ia<0){o.g.set(P0.x+(P1.x-P0.x)*ss(TO,TR,te),0.25,0);o.gs=0.8;o.ga=0.25;o.li=2;}
    else{o.g.set(P1.x,1.0,0);o.gs=0.9+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*10)*0.5;o.li=4.5*Math.exp(-ia*6)+0.6*env;}
    o.ia=ia;o.c.set(P1.x,0.9,0);o.shake=0;o.dist=0.6;o.flash=0;
  };
}};

// =====================================================================
// 4 · STARGAZER NOVA — una esfera de luz se comprime sobre el rival y detona en un destello blanco total
//     de 360° con rayos en cruz por el suelo y anillos de fotones residuales. Nivel 3: fractura de baldosa
// =====================================================================
const nova={key:"stargazer_nova",name:"Nova",dur:3.2,ti:1.3,pal:PAL,tier:3,
  phases:[["Condensación",0],["Implosión",0.75],["Detonación",1.3],["Cruz",1.42],["Fotones",1.9],["Disipación",2.6]],
build(a){
  const L=a.L,TC=0.75,TI=1.3,NC=V3(3.4,1.1,0),FS=7;
  // esfera de luz que se comprime: vetas que fluyen hacia dentro, más blanca cuanto más comprimida (uP)
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 q=normalize(vP);
   float n=noise(q*4.+vec3(0.,0.,uT*3.))*.6+noise(q*9.-vec3(uT*4.))*.4;float st=smoothstep(.45,.8,n);
   gl_FragColor=vec4(mix(uC2,uC1,fr+uP)*1.4+vec3(1.)*uP*uP*.8,(fr*.75+st*.35*fr+.05+uP*.35)*uA);}`));
  shell.position.copy(NC);
  // estrella central: núcleo + picos de difracción; en la detonación crece como destello cruciforme
  const star=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   float core=smoothstep(.25,0.,r)+pow(max(0.,1.-r),6.)*.6;
   vec2 q=abs(p);float sp=exp(-q.y*40.)*smoothstep(1.,0.,q.x)+exp(-q.x*40.)*smoothstep(1.,0.,q.y);
   vec2 d=abs(vec2(p.x+p.y,p.x-p.y))*.7071;float sp2=(exp(-d.y*60.)*smoothstep(.7,0.,d.x)+exp(-d.x*60.)*smoothstep(.7,0.,d.y))*.5;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5+.5*core)*1.8,(core+(sp+sp2)*uP)*uA);}`,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.copy(NC);
  // anillos de fotones residuales con inclinaciones distintas
  const RING_PH=`void main(){float an=atan(vP.y,vP.x);float n=noise(vec3(cos(an)*3.,sin(an)*3.,uT*2.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.6,(.45+.55*n)*uA);}`;
  const TILTS=[[0.3,0,0],[1.2,0.4,0],[0.7,1.3,0.5],[1.57,0,0.2]];
  const rings=TILTS.map(()=>{const m=new THREE.Mesh(new THREE.RingGeometry(0.97,1.0,128,1),fx(RING_PH));m.position.copy(NC);return m;});
  L.mesh.add(shell,star,burst,...rings);
  // cruz de luz en el suelo hacia las cuatro direcciones
  const cross=groundPlane(12,NC.x,0.03,fx(`void main(){vec2 p=(vUv-.5)*12.;float reach=uP*5.6;vec2 q=abs(p);
   float ax=exp(-q.y*(3.+q.x*1.2))*smoothstep(reach,reach-.4,q.x);
   float az=exp(-q.x*(3.+q.y*1.2))*smoothstep(reach,reach-.4,q.y);
   float head=(band(q.x,reach,.35)*exp(-q.y*4.)+band(q.y,reach,.35)*exp(-q.x*4.))*step(uP,.99);
   float core=smoothstep(1.4,0.,length(p));float n=.7+.3*noise(vec3(p*2.,uT*3.));
   float m=max(ax,az)*n+head*1.2+core*.6;
   gl_FragColor=vec4(mix(uC1,vec3(1.),smoothstep(.6,1.4,m))*1.6,min(m,1.6)*uA);}`));
  const frac=groundPlane(FS,NC.x,0.025,fx(tileFractureFS(FS)));
  const scorch=groundPlane(4.5,NC.x,0.015,fx(SCORCH_FS)), shock=groundPlane(13,NC.x,0.035,fx(RING_FS));
  L.decal.add(cross,frac,scorch,shock);
  const C=`const float TC=${f(TC)};const float TI=${f(TI)};const vec3 NC=${v3(NC)};`;
  // luz arrastrada hacia la esfera (condensación)
  a.count+=points(L.part,360,C+`void main(){float s=aSeed.x*(TI-.35);float life=.3+aSeed.y*.3;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);float R0=2.2+1.8*aSeed.z;vec3 p=NC+d*mix(R0,.06,age*age);
   vA=(age>0.&&age<1.&&uT<TI)?smoothstep(0.,.3,age)*(.4+.6*age):0.;put(p,(.03+.04*aSeed.w)*(1.-age*.5));}`);
  // detonación esférica de 360°
  a.count+=points(L.part,420,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.7;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+.0001);vec3 p=NC+d*(1.+6.*aSeed.z)*(1.-exp(-t*3.));p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.06*aSeed.w)*(1.-age*.5));}`);
  // corrientes por los cuatro brazos de la cruz
  a.count+=points(L.part,200,C+`void main(){float s=TI+aSeed.x*.25;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=floor(aSeed.w*4.);vec2 dir=k<1.?vec2(1.,0.):(k<2.?vec2(-1.,0.):(k<3.?vec2(0.,1.):vec2(0.,-1.)));
   vec2 xz=dir*(t*9.*(.6+.4*aSeed.z))+vec2(dir.y,dir.x)*(aSeed.y-.5)*.3;
   vec3 p=vec3(NC.x+xz.x,.05+.3*aSeed.y*(1.-age),xz.y);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.04+.05*aSeed.z)*(1.-age*.5));}`);
  // fotones residuales que orbitan despacio
  a.count+=points(L.part,160,C+`void main(){float life=1.+aSeed.y*.6;float s=TI+.3;float k=(uT-s)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+uT*(.4+.6*r.y);float rad=1.+1.6*r.z;
   vec3 p=NC+vec3(cos(an)*rad,(r.y-.5)*1.6+age*.3,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.07+.08*r.z);}`,STAR4_FS);
  a.count+=sparks(L.part,260,TI,`${f(NC.x)},${f(NC.y)},0.`,"0.,.25,0.",4,12,2.5);
  a.pose=function(te,o){
    const ia=te-TI, app=ss(0,0.25,te), k1=cl((te-0.15)/(TC-0.15)), k2=cl((te-TC)/(TI-TC));
    caster.rotation.z=-0.14*ss(0,TC,te)+0.26*ss(TI-0.08,TI,te)-0.12*ss(TI+0.1,TI+0.7,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.45*ss(0,0.3,te)*(1-ss(TI,TI+0.4,te));
    // implosión previa: 2.6 → 1.4 (lenta) → 0.32 (acelerada)
    const rad=2.6-1.2*ss(0,1,k1)-1.08*k2*k2*k2;
    shell.visible=ia<0&&app>0.01; shell.scale.setScalar(Math.max(rad,0.001)); set(shell,k2,app);
    towardCam(star.position,NC,0.6); billboard(star);
    star.visible=ia<1.6; star.scale.setScalar(ia<0?0.5+0.9*k2*k2:1.4+6*(1-Math.exp(-ia*7)));
    set(star,ia<0?k2:1,ia<0?ss(0.1,0.6,te)*(0.5+0.5*k2)*(0.9+0.1*Math.sin(te*60)):Math.exp(-ia*3.2));
    let p=cl(ia/0.55); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.4+4*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    set(cross,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+0.4,TI+1.6,te):0);
    rings.forEach((m,i)=>{const d=0.06*i,k=cl((ia-d)/1.5),t=TILTS[i];m.visible=ia>=d&&k<1;
      m.scale.setScalar(0.6+(2.2+0.6*i)*(1-Math.pow(1-k,2))); m.rotation.set(t[0],t[1]+te*0.35,t[2]); set(m,k,Math.pow(1-k,1.3)*0.9);});
    p=cl(ia/0.8); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.8):0;
    U.uE.value=ia>=0?1-ss(TI+0.9,3.1,te):0;
    // el rival tiembla con la compresión y sale despedido con la detonación
    const hit=ia>=0?Math.exp(-ia*3.5):0;
    target.position.x=3.4+(ia>=0?0.55*hit*(1-Math.exp(-ia*18)):0);
    target.rotation.z=(ia<0?0.03*Math.sin(te*45)*k2:-0.4*hit*Math.cos(ia*12));
    target.scale.set(1+0.1*hit,1-0.16*hit,1+0.1*hit);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,3.1,te):0);
    // destello blanco a pantalla completa, breve y por debajo de 1
    o.white=ia>=0&&ia<0.25?0.92*Math.exp(-ia*16):0;
    if(ia<0){o.g.copy(NC);o.gs=0.8+1.6*k2;o.ga=(0.3+0.4*k2)*app;o.li=(1+2.5*k2)*app;}
    else{o.g.copy(NC);o.gs=3+8*Math.min(ia,0.6);o.ga=Math.exp(-ia*5)*0.9;o.li=6*Math.exp(-ia*2.5)+0.8*(1-ss(TI+0.6,TI+1.6,te));}
    o.ld=12;o.ia=ia;o.c.copy(NC);o.shake=1.7;o.dist=1.4;
  };
}};

// =====================================================================
// 5 · STARGAZER GRAVITY WELL — lámina de espacio-tiempo cóncava de 2x2 casillas bajo el rival; pequeñas rocas
//     flotan en gravedad cero. Se mantiene viva hasta el final (las 2 rondas son lógica de juego). Nivel 2
// =====================================================================
const well={key:"stargazer_gravity_well",name:"Pozo gravitatorio",dur:2.4,ti:0.7,pal:PAL,tier:2,
  phases:[["Invocación",0],["Curvatura",0.35],["Pozo",0.7],["Gravedad cero",0.95]],
build(a){
  const L=a.L,TB=0.35,TI=0.7,WC=V3(3.4,0,0);
  const BOWL=`float bowl(float r){return .03+.55*(1.-exp(-r*r*1.6));}`;
  // rejilla: malla deformada en el vértice (cuenco: centro hundido, bordes y esquinas levantados); uP = curvatura
  const GRID_VS=`uniform float uT;uniform float uP;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying vec3 vP;${BOWL}
  void main(){vUv=uv;vec3 p=position;float r=length(p.xz);
   p.y=.03+uP*(bowl(r)-.03+sin(r*9.-uT*4.)*.025*exp(-r*r*1.6));
   vP=p;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
  const gR={value:0};
  const grid=new THREE.Mesh(new THREE.PlaneGeometry(2,2,40,40).rotateX(-Math.PI/2),fxU(`uniform float uR;
  void main(){vec2 gf=abs(fract(vUv*8.)-.5);
   float line=max(smoothstep(.06,0.,.5-gf.x),smoothstep(.06,0.,.5-gf.y));
   vec2 c=(vUv-.5)*2.;float e=max(abs(c.x),abs(c.y));float r=length(vP.xz);
   float border=smoothstep(.94,.99,e);float tiles=band(abs(c.x),0.,.02)+band(abs(c.y),0.,.02);
   float flow=band(fract(r*1.6+uT*1.1),.5,.1);
   float depth=1.-smoothstep(0.,.55,vP.y);
   float rev=smoothstep(uR*1.5,uR*1.5-.25,r);
   float al=(line*(.35+.65*flow)+border*.9+tiles*.7+.03+depth*.08)*rev*uA;
   gl_FragColor=vec4(mix(uC1,uC2,depth*.7)*1.4+vec3(1.)*line*flow*.25,al);}`,{uR:gR},{vertexShader:GRID_VS}));
  grid.position.copy(WC);
  // fondo de vacío: lámina oscura (mezcla normal) que da profundidad al pozo
  const sheet=groundPlane(2.0,WC.x,0.012,fx(`void main(){vec2 p=(vUv-.5)*2.;float e=max(abs(p.x),abs(p.y));float r=length(p);
   gl_FragColor=vec4(vec3(.02,0.,.05),smoothstep(1.,.85,e)*(.35+.4*smoothstep(1.2,0.,r))*uA);}`,NB));
  // cortina dimensional en el contorno de las 2x2 casillas (prisma cuadrado abierto)
  const curtain=new THREE.Mesh(new THREE.CylinderGeometry(1.414,1.414,0.9,4,1,true).rotateY(Math.PI/4),fx(`void main(){float h=vP.y/.9+.5;
   float n=noise(vec3((vP.x+vP.z)*4.,h*3.-uT*.8,uT*.3));
   gl_FragColor=vec4(mix(uC2,uC1,1.-h)*1.3,pow(1.-h,2.)*(.25+.35*n)*uA);}`));
  curtain.position.set(WC.x,0.45,0);
  L.mesh.add(grid,curtain); L.decal.add(sheet);
  // rocas pequeñas: opacas, con grietas que brillan; se despegan de la lámina y flotan girando
  const rockMat=fx(`void main(){float n=noise(vP*6.)*.6+noise(vP*14.)*.4;
   vec3 rock=mix(vec3(.16,.14,.2),vec3(.38,.34,.42),n);
   float lit=.4+.6*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float crack=pow(1.-abs(noise(vP*9.+3.)*2.-1.),12.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.);
   gl_FragColor=vec4(rock*lit+uC1*crack*1.2*uA+uC2*fr*.6*uA,1.);}`,SOLID);
  const bowl=r=>0.03+0.55*(1-Math.exp(-r*r*1.6));
  const rocks=[];
  for(let i=0;i<9;i++){const an=i/9*Math.PI*2+0.4*Math.sin(i*7.3), rd=0.25+0.55*((i*5)%9)/8;
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),rockMat);
    m.userData={hx:Math.cos(an)*rd,hz:Math.sin(an)*rd,fy:0.35+0.9*((i*4)%9)/8,ph:i*1.7,del:0.05*((i*3)%7),
      s:0.06+0.07*((i*2)%5)/4,sp:[0.6+0.3*(i%3),0.4+0.25*((i+1)%4),0.3+0.2*(i%2)]};
    rocks.push(m); L.mesh.add(m);}
  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const vec3 WC=${v3(WC)};const vec3 HA=${v3(HAND)};${BOWL}`;
  // hilo de la mano del Sapidae al centro del pozo
  a.count+=points(L.part,70,C+`void main(){float s=.05+aSeed.x*.35;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 E=WC+vec3(0.,.9,0.);vec3 m=mix(HA,E,.5)+vec3(0.,1.6,0.);vec3 r=rnd();
   vec3 p=mix(mix(HA,m,k),mix(m,E,k),k)+r*.08*(1.-k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.2,age)*.8:0.;put(p,.03+.035*aSeed.z);}`);
  // luz que se desliza por la rejilla hacia el fondo del pozo
  a.count+=points(L.part,200,C+`void main(){float life=1.1+aSeed.y*.5;float k=(uT-TB)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.y*6.2832;float rad=(.45+.9*r.x)*(1.-age*age);
   vec2 xz=clamp(vec2(cos(an),sin(an))*rad,-.98,.98);
   vec3 p=WC+vec3(xz.x,bowl(length(xz))*smoothstep(TB,TI,uT)+.03,xz.y);
   vA=(k>=1.)?sin(age*3.14159)*.8:0.;put(p,.025+.03*r.z);}`);
  // polvo en gravedad cero: deriva lenta dentro del volumen
  a.count+=points(L.part,160,C+`void main(){float life=1.6+aSeed.y*.8;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=WC+vec3((r.x-.5)*1.8,.15+r.y*1.4,(r.z-.5)*1.8)+vec3(sin(uT*.7+r.z*9.)*.08,age*.18,cos(uT*.6+r.x*9.)*.08);
   vA=(k>=1.)?sin(age*3.14159)*.75*uE:0.;put(p,.018+.025*r.z);}`);
  // estrellas que se despegan de la lámina al curvarse y quedan suspendidas
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.1;float life=.8+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec2 xz=(vec2(aSeed.z,aSeed.w)-.5)*1.9;
   vec3 p=WC+vec3(xz.x,bowl(length(xz))+(1.-exp(-t*3.))*(.25+.9*aSeed.y),xz.y);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.06+.06*aSeed.y);}`,STAR4_FS);
  a.count+=sparks(L.part,90,TI,`${f(WC.x)},.3,0.`,"0.,1.,0.",1.5,4,0.4);
  a.pose=function(te,o){
    const ia=te-TI, bend=ss(TB,TI,te), env=ss(TB-0.1,TB+0.15,te), kick=ia>=0?Math.exp(-ia*5):0;
    caster.rotation.z=0.1*ss(0,0.3,te)-0.16*ss(0.3,0.42,te)+0.06*ss(0.45,0.9,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,0.2,te)*(1-ss(0.4,0.75,te));
    grid.material.uniforms.uP.value=bend*(1+(ia>=0?0.08*Math.sin(ia*9)*Math.exp(-ia*3):0));
    grid.material.uniforms.uA.value=env*(1+0.6*kick); gR.value=ss(TB-0.1,TB+0.3,te);
    sheet.material.uniforms.uA.value=env*0.9*bend; set(curtain,0,ss(TI-0.1,TI+0.3,te)*0.8);
    rockMat.uniforms.uA.value=env;
    for(const m of rocks){const u=m.userData,rise=ss(TI+u.del,TI+u.del+0.5,te),grow=ss(TB+u.del,TI,te);
      m.visible=grow>0.01; m.scale.setScalar(Math.max(u.s*grow,0.001));
      m.position.set(WC.x+u.hx+0.03*Math.sin(te*0.9+u.ph)*rise,bowl(Math.hypot(u.hx,u.hz))*bend+u.s*0.7+rise*(u.fy+0.06*Math.sin(te*1.6+u.ph)),u.hz);
      m.rotation.set(u.ph+u.sp[0]*te*rise,u.ph*2+u.sp[1]*te*rise,u.sp[2]*te*rise);}
    U.uE.value=ss(TI,TI+0.3,te);
    // el rival queda dentro del pozo: leve flotación y tinte violeta
    target.position.y=0.06*U.uE.value*(0.5+0.5*Math.sin(te*3)); target.rotation.z=0.03*Math.sin(te*1.7)*U.uE.value;
    o.em=0.18*env*bend+0.3*kick; o.emc.copy(U.uC2.value);
    o.g.set(WC.x,0.7,0); o.gs=1.2+1.4*env; o.ga=0.1*env+0.4*kick; o.li=2.5*env+4*kick+(te<TB?1.2*ss(0,0.2,te):0);
    o.ia=ia;o.c.set(WC.x,0.4,0);o.shake=0;o.dist=0.5;o.flash=0.4;
  };
}};

// =====================================================================
// 6 · STARGAZER ECLIPSE — la escena se oscurece, desciende una luna negra gigante con corona dorada,
//     succiona 1 casilla a los rivales hacia el centro y colapsa en una onda plana. Nivel 3: fractura
// =====================================================================
const eclipse={key:"stargazer_eclipse",name:"Eclipse",dur:3.4,ti:1.85,pal:PAL,tier:3,enemies:2,
  phases:[["Penumbra",0],["Descenso",0.35],["Corona",1.0],["Succión",1.25],["Colapso",1.85],["Onda",1.95],["Disipación",2.7]],
build(a){
  const L=a.L,TD=0.35,TK=1.0,TS=1.25,TI=1.85,EC=V3(3.4,0,0),MY=4.3,MR=1.45,CT=V3(EC.x,1.0,0),FS=7;
  // dirección de succión de cada rival hacia el centro (1 casilla)
  const DIRS=ENEMY_POS.map(P=>V3(EC.x-P.x,0,EC.z-P.z).normalize());
  const moonY=te=>{const k=cl((te-TD)/(TK-TD));return 9.5-(9.5-MY)*(1-Math.pow(1-k,3))-0.4*ss(TS,TI-0.15,te);};
  // luna negra: esfera opaca con un leve brillo violeta en el limbo
  const moon=new THREE.Mesh(new THREE.SphereGeometry(MR,56,36),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),4.);
   gl_FragColor=vec4(vec3(.004,.003,.01)+uC2*fr*.3*uA,1.);}`,SOLID));
  // corona solar dorada: billboard por el centro de la luna (la luna opaca tapa el disco interior)
  const corona=new THREE.Mesh(new THREE.PlaneGeometry(7,7),fx(`void main(){vec2 p=(vUv-.5)*7.;float r=length(p);float an=atan(p.y,p.x);
   float R=${f(MR)};float x=max(r-R,0.);
   float st=noise(vec3(cos(an)*4.,sin(an)*4.,uT*.4))*.6+noise(vec3(cos(an)*11.,sin(an)*11.,x*1.5-uT*.6))*.4;
   float streamers=exp(-x*(2.6-1.6*st))*smoothstep(R-.06,R+.02,r)*smoothstep(3.5,2.6,r);
   float ring=band(r,R+.02,.06);
   gl_FragColor=vec4(mix(${GOLD},vec3(1.,.97,.9),ring+streamers*.3)*1.5+uC1*streamers*.15,(streamers*(.5+.8*st)+ring*1.2)*uA);}`));
  // onda plana del colapso: anillo horizontal que se expande a media altura
  const wave=new THREE.Mesh(new THREE.RingGeometry(0.8,1,128,2).rotateX(-Math.PI/2),fx(`void main(){float r=length(vP.xz);float k=(r-.8)/.2;float an=atan(vP.z,vP.x);
   float n=noise(vec3(cos(an)*4.,sin(an)*4.,uT*2.));float m=smoothstep(0.,.7,k)*smoothstep(1.,.85,k);
   gl_FragColor=vec4(mix(uC1,${GOLD},.45+.3*n)*1.6+vec3(1.)*smoothstep(.75,.95,k)*.4,m*(.6+.4*n)*uA);}`));
  L.mesh.add(moon,corona,wave);
  // suelo: umbra bajo la luna, espiral de succión, marcas bajo los rivales, onda y fractura en el centro
  const umbra=groundPlane(7,EC.x,0.012,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   gl_FragColor=vec4(vec3(.01,0.,.02),smoothstep(1.,.45,r)*uA*.8);}`,NB));
  const swirl=groundPlane(9,EC.x,0.02,fx(WELL_FS));
  const marks=ENEMY_POS.map(P=>{const g=groundPlane(1.6,P.x,0.022,fx(WELL_FS));g.position.z=P.z;return g;});
  const shock=groundPlane(15,EC.x,0.035,fx(RING_FS)), frac=groundPlane(FS,EC.x,0.025,fx(tileFractureFS(FS)));
  L.decal.add(umbra,swirl,...marks,shock,frac);
  const C=`const float TD=${f(TD)};const float TK=${f(TK)};const float TS=${f(TS)};const float TI=${f(TI)};
  const float MY=${f(MY)};const float MR=${f(MR)};const vec3 EC=${v3(EC)};const vec3 CT=${v3(CT)};
  float moonY(float t){float k=clamp((t-TD)/(TK-TD),0.,1.);return 9.5-(9.5-MY)*(1.-pow(1.-k,3.))-.4*smoothstep(TS,TI-.15,t);}`;
  // eyecciones de la corona (oro)
  a.count+=points(L.part,150,C+`void main(){float life=.8+aSeed.y*.4;float k=(uT-TK)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 M=vec3(EC.x,moonY(uT),0.);vec3 d=normalize(r*2.-1.+.0001);
   vec3 p=M+d*(MR*1.03+age*(.4+.9*r.y))+vec3(0.,age*.2,0.);
   vA=(k>=1.&&uT<TI-.08)?sin(age*3.14159)*.8:0.;put(p,(.04+.05*r.z)*(1.-age*.5));}`,GOLD_PT_FS);
  // motas del suelo arrastradas en espiral hacia la luna
  a.count+=points(L.part,120,C+`void main(){float life=.9+aSeed.y*.4;float k=(uT-TD)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=1.5+2.8*r.y;float g=age*age;float sw=an+g*2.5;
   vec3 M=vec3(EC.x,moonY(uT)-MR,0.);
   vec3 p=mix(vec3(EC.x+cos(sw)*rad,.05,sin(sw)*rad),M,g);
   vA=(k>=1.&&uT<TI)?sin(age*3.14159)*.7:0.;put(p,.025+.03*r.z);}`);
  // corrientes que salen de cada rival mientras es arrastrado al centro
  ENEMY_POS.forEach((P,i)=>{
    a.count+=points(L.part,170,C+`const vec3 E0=${v3(P)};const vec3 D=${v3(DIRS[i])};
    void main(){float life=.55+aSeed.y*.2;float k=(uT-TS)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
     vec3 e=E0+D*smoothstep(TS,TI-.1,uT);
     vec3 p0=e+vec3((r.x-.5)*.7,.15+r.y*1.5,(r.z-.5)*.7);float an=r.z*6.2832+age*5.;
     vec3 p=mix(p0,CT,age*age)+vec3(cos(an),.3,sin(an))*.4*sin(age*3.14159);
     vA=(k>=1.&&uT<TI)?sin(age*3.14159)*.9:0.;put(p,.03+.035*r.y);}`);
  });
  // estallido plano del colapso
  a.count+=points(L.part,400,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float sp=1.5+6.5*aSeed.w;
   vec3 p=vec3(EC.x,.9,0.)+vec3(cos(an),0.,sin(an))*sp*(1.-exp(-t*2.8))+vec3(0.,(aSeed.y-.5)*.5*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.05*aSeed.y)*(1.-age*.5));}`);
  a.count+=sparks(L.part,240,TI,`${f(EC.x)},.9,0.`,"0.,.15,0.",4,12,2);
  a.pose=function(te,o){
    const ia=te-TI, desc=ss(TD,TK,te), col=ss(TI-0.15,TI,te), cor=ss(TK-0.1,TK+0.3,te);
    o.dark=0.6*ss(0,0.5,te)*(1-ss(2.7,3.3,te));
    caster.rotation.z=0.12*ss(0,0.4,te)-0.2*ss(TS,TS+0.1,te)+0.08*ss(TI,TI+0.6,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.4*ss(0,0.3,te)*(1-ss(TS,TS+0.5,te));
    // la luna baja del cielo, se hunde un poco al succionar y colapsa aplastándose en un disco
    let y=moonY(te); y+=(1.0-y)*col;
    moon.visible=te>=TD-0.05&&ia<0.03; moon.position.set(EC.x,y,0);
    moon.scale.set(1+0.35*col,Math.max(1-0.95*col,0.001),1+0.35*col); moon.material.uniforms.uA.value=desc;
    corona.position.set(EC.x,y,0); billboard(corona); corona.visible=cor*(1-col)>0.001;
    corona.scale.setScalar(1+0.04*Math.sin(te*5)); corona.material.uniforms.uA.value=cor*(1-col)*(1+0.3*ss(TS,TI,te));
    let p=cl(ia/0.8); wave.visible=ia>=0&&p<1; wave.position.set(EC.x,0.9,0); wave.scale.setScalar(0.3+6.5*(1-Math.pow(1-p,2.5))); set(wave,p,1-p);
    umbra.material.uniforms.uA.value=desc*(1-ss(TI,TI+0.3,te))*0.85;
    const pulling=ss(TS-0.05,TS+0.1,te)*(1-ss(TI-0.1,TI+0.1,te));
    swirl.material.uniforms.uA.value=pulling;
    p=cl(ia/0.9); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,3.35,te):0);
    // rivales arrastrados 1 casilla hacia el centro (se quedan ahí); la marca los sigue
    const pk=ss(TS,TI-0.1,te), hit=ia>=0?Math.exp(-ia*4):0;
    enemies.forEach((e,i)=>{const D=DIRS[i];e.position.copy(ENEMY_POS[i]).addScaledVector(D,pk);
      e.rotation.z=-Math.sign(D.x)*0.25*pulling-Math.sign(D.x)*0.2*hit*Math.cos(ia*12);
      e.scale.set(1-0.06*pulling+0.06*hit,1+0.08*pulling-0.1*hit,1-0.06*pulling+0.06*hit);
      e.userData.m.emissive.copy(U.uC2.value); e.userData.m.emissiveIntensity=0.5*pulling+0.8*hit;
      marks[i].position.set(e.position.x,0.022,e.position.z); marks[i].material.uniforms.uA.value=pulling*0.9;});
    // el rival del centro se eleva hacia la luna y queda aplastado por el colapso
    target.position.y=0.15*pulling; target.scale.set(1-0.04*pulling+0.1*hit,1+0.06*pulling-0.18*hit,1-0.04*pulling+0.1*hit);
    target.rotation.z=0.03*Math.sin(te*25)*pulling-0.25*hit*Math.cos(ia*13);
    if(ia<0){o.g.set(EC.x,y,0);o.gs=3+2*cor;o.ga=0.05*desc+0.05*cor;o.li=1.5*desc+1.5*cor+2*col;}
    else{o.g.copy(CT);o.gs=2+6*Math.min(ia,0.7);o.ga=Math.exp(-ia*7)*0.9;o.li=10*Math.exp(-ia*3.5);}
    o.ia=ia;o.c.copy(CT);o.shake=1.8;o.dist=1.3;
  };
}};

VFX.module("Sapidae · Astromante",[vortex,transpose,jump,nova,well,eclipse]);
})();

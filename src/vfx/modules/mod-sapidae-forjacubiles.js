// =====================================================================
// MÓDULO · SAPIDAE — FORJACUBILES
// El lanzador es el Sapidae (domador forjador). Estética: metal forjado de filos al rojo, madera rúnica,
// chispas incandescentes. Paleta propia "Bronce de Forja" (núcleo bronce claro + bronce profundo).
// Contrato habitual: {key,name,tier,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,SCORCH_FS,
  caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,billboard,towardCam,tileFractureFS}=VFX.lib;

VFX.palette("Bronce de Forja",["#ffd9a0","#C98A3B"]);
const PAL="Bronce de Forja";
const HAND=V3(-3.35,1.15,0.25);           // mano del Sapidae
const TC=V3(3.15,1.2,0);                   // pecho visible del rival
const tmp=V3(0,0,0), tmp2=V3(0,0,0), UPV=V3(0,1,0);
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
// salida con rebote (las piezas que brotan del suelo se pasan un poco y asientan)
const back=k=>{k=cl(k);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2);};

// ---------- shaders compartidos del módulo ----------
// medidas de "filo" (0 centro de cara → 1 arista) según la geometría
const E_BOX=`max(abs(vUv.x-.5),abs(vUv.y-.5))*2.`;
const E_SQ4=`max(abs(fract(vUv.x*4.)-.5)*2.,abs(vUv.y-.5)*2.)`;     // cilindro de 4 lados (tronco de pirámide)
const E_LEN=`abs(vUv.y-.5)*2.`;
// metal forjado oscuro: filos al rojo (uH calor) y disolución en brasas (uD: 1 entero → 0 desaparecido)
const metalFS=(E,lo="vec3(.055,.05,.055)",hi="vec3(.17,.15,.14)")=>`uniform float uH;uniform float uD;
void main(){vec3 n=normalize(vN);vec3 l=normalize(vec3(.3,.8,.5));
 float dn=noise(vP*7.+3.)*.7+noise(vP*19.)*.3;if(dn>uD*1.05)discard;
 float burn=smoothstep(.12,0.,uD*1.05-dn)*step(uD,.999);
 float lit=.3+.7*max(0.,dot(n,l));float sp=pow(max(0.,dot(reflect(-l,n),normalize(vV))),18.);
 float g=noise(vP*16.)*.6+noise(vP*45.)*.4;
 vec3 c=mix(${lo},${hi},g)*lit+vec3(.75,.66,.55)*sp*.55;
 float e=${E};float edge=smoothstep(.78,.98,e);
 float fr=pow(1.-abs(dot(n,normalize(vV))),3.);
 float hot=(edge*(.6+.4*noise(vP*5.+vec3(0.,uT*.8,0.)))+fr*.35)*uH;
 c+=mix(uC2,uC1,edge*uH)*hot*2.2+uC1*burn*2.5;
 gl_FragColor=vec4(c,1.);}`;
// madera rúnica: veta + glifos tallados que se encienden de abajo arriba (uR); "extra" añade tallas propias
const woodFS=(extra="")=>`uniform float uR;uniform float uG;
void main(){vec3 n=normalize(vN);
 float lit=.35+.65*max(0.,dot(n,normalize(vec3(.3,.8,.5))));
 float gr=noise(vec3(vP.x*26.,vP.y*2.5,vP.z*26.))*.6+noise(vec3(vP.x*70.,vP.y*7.,vP.z*70.))*.4;
 float rg=.5+.5*sin(gr*16.);
 vec3 c=mix(vec3(.14,.08,.045),vec3(.4,.25,.13),gr*.7+rg*.3)*lit;
 vec2 g=vUv*vec2(3.,7.);vec2 ci=floor(g);vec2 q=fract(g)-.5;float h=hash(vec3(ci,7.));
 float rn=smoothstep(.07,.03,abs(q.x))*step(abs(q.y),.36)
  +smoothstep(.07,.03,abs(q.y-q.x*(h>.5?1.2:-1.2)))*step(abs(q.x),.3)*step(.35,h)
  +smoothstep(.07,.03,abs(q.y+.18))*step(abs(q.x),.22)*step(h,.6);
 rn=min(rn,1.)*step(.45,hash(vec3(ci,3.)));
 float lr=step(vUv.y,uR)*(.75+.25*sin(uT*5.+ci.y));float front=band(vUv.y,uR,.06)*step(uR,1.);
 c=c*(1.-rn*.55)+mix(uC2,uC1,lr)*rn*(lr*1.8+front*2.)+uC1*front*.12;
 ${extra}
 gl_FragColor=vec4(c,1.);}`;
// objeto fantasma (translúcido, aristas brillantes, líneas de barrido); uP materializa, uA intensidad
const ghostFS=E=>`void main(){float dn=noise(vP*9.+2.);if(dn>uP*1.15)discard;
 float front=smoothstep(.12,0.,uP*1.15-dn)*step(uP,.999);
 float e=${E};float edge=smoothstep(.8,.97,e);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 float scan=.5+.5*sin((vP.y+vP.x)*55.-uT*14.);
 vec3 c=mix(uC2,uC1,edge+fr*.5)*1.5+vec3(1.)*front*.6;
 gl_FragColor=vec4(c,(edge*.95+fr*.35+.07+scan*.06+front)*uA);}`;
// tierra / roca: rombos opacos (mezcla normal)
const clodFS=(a,b)=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.4;float al=smoothstep(.5,.38,d)*vA;if(al<.003)discard;
 gl_FragColor=vec4(mix(${a},${b},vMix),al);}`;
const DIRT_FS=clodFS("vec3(.17,.11,.07)","vec3(.36,.25,.15)");
const ROCK_FS=clodFS("vec3(.14,.12,.11)","vec3(.32,.28,.24)");

// =====================================================================
// 1 · YUNQUE — un yunque forjado al rojo se materializa a 4 m sobre el rival y cae en vertical;
//     aplasta, levanta un anillo de 24 bocanadas de polvo con esquirlas y una luz ámbar de radio corto.
//     nivel 3: pesado, fractura de baldosas bajo el rival, temblor alto
// =====================================================================
const anvil={key:"craft_anvil",name:"Yunque",tier:3,dur:3.0,ti:1.0,pal:PAL,
  phases:[["Forja",0],["Caída",0.62],["Impacto",1.0],["Polvo",1.2],["Enfriado",2.25]],
build(a){
  const L=a.L,TF=0.62,TI=1.0,TD=2.25,TE=2.95,X=3.4,Y0=3.55,HT=1.87,SC=1.15;
  // yunque con geometría real: base y cintura en tronco de pirámide, mesa, cuerno cónico y talón
  const MU={uH:{value:0},uD:{value:0}}, M=e=>fxU(metalFS(e),MU,SOLID);
  const anv=new THREE.Group(); anv.scale.setScalar(SC); L.mesh.add(anv);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.66,0.3,4,1).rotateY(Math.PI/4),M(E_SQ4)); base.position.y=0.15;
  const waist=new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.4,0.34,4,1).rotateY(Math.PI/4),M(E_SQ4)); waist.position.y=0.47;
  const face=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.36,0.6),M(E_BOX)); face.position.y=0.82;
  const horn=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.85,18).rotateZ(-Math.PI/2),M(E_LEN)); horn.position.set(1.0,0.84,0); horn.scale.set(1,0.85,1.3);
  const heel=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.28,0.48),M(E_BOX)); heel.position.set(-0.72,0.86,0);
  anv.add(base,waist,face,horn,heel);
  // estela de caída: vaina de calor rasgada sobre el yunque
  const streak=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.42,1,24,1,true).translate(0,0.5,0),fx(`void main(){float h=vUv.y;
   float n=noise(vec3(vUv.x*24.,h*4.+uT*22.,0.))*.7+noise(vec3(vUv.x*60.,h*9.+uT*30.,2.))*.3;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,1.-h)*1.5,smoothstep(.45,.85,n)*pow(1.-h,1.5)*(.3+.7*fr)*uA);}`));
  L.trail.add(streak);
  // sello de forja donde se materializa: círculo rúnico con cuatro brazos de martillo que giran
  const sigil=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4).rotateX(-Math.PI/2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float m=band(r,.92,.025)+band(r,.78,.015)+band(r,.85,.05)*step(.55,fract(an/6.2832*16.+uT*.3));
   for(int i=0;i<4;i++){float a2=float(i)*1.5708;vec2 d=vec2(cos(a2),sin(a2));float u=dot(p,d);
    m+=smoothstep(.03,0.,abs(dot(p,vec2(-d.y,d.x))))*step(.2,u)*step(u,.66)+smoothstep(.07,.0,abs(length(p-d*.7)-.06));}
   m*=smoothstep(uP*1.05,uP*1.05-.08,r);
   gl_FragColor=vec4(mix(uC2,uC1,min(m,1.))*1.6,min(m,1.2)*uA);}`));
  sigil.position.set(X,Y0-0.04,0); L.mesh.add(sigil);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // suelo bajo el rival: sombra que crece, aviso, fractura (nivel 3), onda y quemadura
  const shadow=groundPlane(2.2,X,0.016,fx(`void main(){float r=length(vUv-.5)*2.;float s=max(uP,.05);
   gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.35,r/s)*.7*uA);}`,NB));
  const warn=groundPlane(2.8,X,0.022,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rr=mix(1.,.42,uP);float m=band(r,rr,.03)+band(r,rr*.72,.015)*step(.5,fract(an/6.2832*12.-uT));
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.5,m*uA*(.6+.4*sin(uT*18.)));}`));
  const FS=7.5, frac=groundPlane(FS,X,0.025,fx(tileFractureFS(FS)));
  const shock=groundPlane(7,X,0.03,fx(RING_FS)), scorch=groundPlane(2.6,X,0.014,fx(SCORCH_FS));
  L.decal.add(shadow,warn,frac,shock,scorch);
  // partículas
  const C=`const float TF=${f(TF)};const float TI=${f(TI)};const float TD=${f(TD)};const float TE=${f(TE)};
  const float X=${f(X)};const float Y0=${f(Y0)};const float HT=${f(HT)};
  float ay(float s){float k=clamp((s-TF)/(TI-TF),0.,1.);return Y0+.15+(HT-Y0-.15)*k*k;}`;
  // brasas de forja que convergen en el sello
  a.count+=points(L.part,110,C+`void main(){float s=.05+aSeed.x*.5;float life=.28+aSeed.y*.18;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.15,0.));vec3 p=vec3(X,Y0+.55,0.)+d*mix(1.9,.1,age*age)*vec3(1.,.7,1.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.045*aSeed.z);}`);
  // brasas que se desprenden en la caída y quedan atrás como estela
  a.count+=points(L.part,140,C+`void main(){float s=TF+aSeed.x*(TI-TF);float life=.35+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(X+r.x*.6,ay(s)+.2+aSeed.z*1.1,r.z*.4)+vec3(r.x*.4*t,.5*t,r.z*.4*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*35.+aSeed.w*40.)):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.5));}`);
  // anillo radial de polvo: exactamente 24 bocanadas repartidas en el círculo
  a.count+=points(L.part,24,C+`void main(){float an=(float(gl_VertexID)+.5)/24.*6.2832+(aSeed.x-.5)*.1;float s=TI+aSeed.y*.04;
   float life=1.1+aSeed.z*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=vec3(cos(an),0.,sin(an));vec3 p=vec3(X,.12,0.)+d*(.45+2.3*(1.-exp(-t*3.2)))+vec3(0.,.35*(1.-exp(-t*2.))+.1*aSeed.w,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.95:0.;put(p,(.6+.3*aSeed.w)*(.55+age*.9));}`,DUST_FS,NB);
  // esquirlas incandescentes que saltan rasantes
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an),.45+.9*aSeed.w,sin(an))*(2.+3.2*aSeed.y);
   vec3 p=vec3(X,.15,0.)+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.045+.05*aSeed.w);}`,CHIP_FS);
  a.count+=sparks(L.part,240,TI,`${f(X)},1.05,0.`,"0.,.25,0.",4,11,3.4);
  a.count+=sparks(L.part,140,TI+0.02,`${f(X)},.1,0.`,"0.,.15,0.",4,12,2.5);
  // enfriado: el yunque se deshace en brasas
  a.count+=points(L.part,120,C+`void main(){float s=TD+aSeed.x*(TE-TD-.15);float life=.45+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(X+r.x*.65,1.25+aSeed.z*1.1,r.z*.38)+vec3(sin(t*6.+r.y*9.)*.12,t*(.9+aSeed.y),0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.05*aSeed.w)*(1.-age*.4));}`);
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TF)/(TI-TF)), cool=1-ss(TD,TE,te);
    // el rival se aplasta bajo el peso y se recupera cuando el yunque se deshace
    const dent=ia<0?0:ss(0,0.05,ia)*(0.3+0.16*Math.exp(-ia*5))*cool;
    const wob=ia>=0?0.05*Math.sin(ia*32)*Math.exp(-ia*6):0, sy=1-dent+wob, sx=1+dent*0.6;
    target.scale.set(sx,sy,sx); target.rotation.z=ia>=0?0.06*Math.sin(ia*25)*Math.exp(-ia*5):0;
    caster.rotation.z=0.16*ss(0,0.4,te)-0.34*ss(TF-0.12,TF+0.04,te)+0.18*ss(TI,TI+0.4,te);
    // yunque: flota sobre el sello, cae acelerando y rebota sobre el rival
    let y; if(te<TF)y=Y0+0.06*Math.sin(te*5)+0.15*ss(0.3,TF,te);
    else if(ia<0)y=Y0+0.15+(HT-Y0-0.15)*k*k;
    else y=HT*sy+0.14*Math.abs(Math.sin(ia*13))*Math.exp(-ia*7);
    anv.visible=te>=0.1&&te<TE; anv.position.set(X,y,0);
    anv.rotation.set(ia<0?0.08*Math.sin(te*3)*(1-k):0.03*wob,0.35+2.4*(1-ss(0.1,TI,te)),ia<0?0.06*Math.cos(te*2.6)*(1-k):wob*0.5);
    MU.uD.value=te<TD?ss(0.1,0.55,te):1-cl((te-TD)/(TE-TD-0.12));
    MU.uH.value=ia<0?0.55+0.45*ss(0.1,0.5,te):0.25+0.75*Math.exp(-ia*1.6);
    streak.visible=te>=TF&&ia<0.12; streak.position.set(X,y+1.05*SC,0); streak.scale.set(1,Math.max(2.6*k,0.001),1);
    streak.material.uniforms.uA.value=(ia<0?ss(0,0.3,k):1-cl(ia/0.12))*0.9;
    sigil.visible=te<TF+0.2; sigil.rotation.y=te*0.6; set(sigil,ss(0.05,0.45,te),ss(0.05,0.2,te)*(1-ss(TF,TF+0.18,te)));
    set(shadow,0.25+0.75*ss(0.1,TI,te),ss(0.1,0.5,te)*cool);
    set(warn,ss(0.1,TI,te),ss(0.1,0.4,te)*(1-ss(TI-0.05,TI+0.05,te)));
    set(frac,1-Math.pow(1-cl(ia/0.55),2),ia>=0?cool:0);
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.9:0);
    scorch.material.uniforms.uA.value=ia>=0?0.85*cool:0;
    p=cl(ia/0.35); towardCam(hitRing.position,tmp.set(X,1.1,0),0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // luz ámbar intensa de radio 3.5
    o.ld=3.5;
    if(te<0.3){o.g.copy(HAND);o.gs=0.7;o.ga=0.35*ss(0,0.15,te);o.li=1.5;}
    else if(ia<0){o.g.set(X,y+0.6,0);o.gs=1.6;o.ga=0.32;o.li=3+2*k;}
    else{o.g.set(X,0.5,0);o.gs=2.2+5*Math.min(ia,0.5);o.ga=Math.exp(-ia*7)*0.9+0.12*MU.uH.value*cool;o.li=11*Math.exp(-ia*3)+2.5*MU.uH.value*cool;}
    o.ia=ia;o.c.set(X,0.8,0);o.shake=1.5;o.dist=1.2;
    o.em=ia>=0?0.25*MU.uH.value*cool:0;o.emc.copy(U.uC2.value);
  };
}};

// =====================================================================
// 2 · TÓTEM RÚNICO — un pilar de madera rúnica con ojos tallados brota junto al aliado; tres aros de luz
//     suben por su cuerpo y una cúpula de icosaedro facetado (aristas brillantes) se ensambla a su alrededor.
//     nivel 2: firme, sin fractura
// =====================================================================
const totem={key:"craft_totem",name:"Tótem rúnico",tier:2,dur:2.2,ti:0.8,pal:PAL,allies:1,
  phases:[["Brote",0],["Aros",0.5],["Cúpula",0.58],["Guardia",1.0],["Disipación",1.75]],
build(a){
  const L=a.L,TS=0.1,TG=0.5,TB=0.58,TI=0.8,TD=1.75,TE=2.2,AP=ALLY_POS[0],H=1.7,R=1.2;
  const TP=AP.clone().add(V3(1.35,0,0.45)), DC=AP.clone().add(V3(0,0.75,0)), AC=AP.clone().add(V3(0,1.0,0));
  // pilar octogonal con dos caras talladas (ojos que se encienden), brazos y remate
  const EYES=`vec2 w=vec2((fract(vUv.x+.5)-.5)*1.4,vUv.y*${f(H)});float ey=0.,cv=0.;
   for(int i=0;i<2;i++){float yc=${f(H*0.8)}-float(i)*${f(H*0.34)};
    vec2 e=vec2(abs(w.x)-.075,w.y-yc+abs(w.x)*.15);
    ey+=smoothstep(.028,.012,length(e*vec2(1.,2.3)));
    cv+=band(w.y,yc+.13,.022)*step(abs(w.x),.26)+band(w.y,yc-.11,.018)*step(abs(w.x),.1);}
   c*=1.-cv*.65;c+=mix(uC1,vec3(1.),.45)*ey*uG*3.+uC2*cv*uG*.5;`;
  const WU={uR:{value:0},uG:{value:0}};
  const tot=new THREE.Group(); L.mesh.add(tot);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,H,8,1),fxU(woodFS(EYES),WU,SOLID)); pillar.position.y=H/2;
  const arms=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.11,0.13),fxU(woodFS(),WU,SOLID)); arms.position.y=H-0.32;
  const crown=new THREE.Mesh(new THREE.ConeGeometry(0.27,0.36,8),fxU(woodFS(),WU,SOLID)); crown.position.y=H+0.18;
  tot.add(pillar,arms,crown);
  // tres aros de luz que ascienden por el aliado
  const rings=[0,0.12,0.24].map(d=>{const m=new THREE.Mesh(new THREE.RingGeometry(0.4,0.9,56).rotateX(-Math.PI/2),fx(`void main(){float r=length(vP.xz);
    float m=band(r,.66,.035)+band(r,.66,.16)*.35;float n=noise(vec3(atan(vP.z,vP.x)*4.,uT*3.,0.));
    gl_FragColor=vec4(mix(uC2,uC1,m)*1.6+vec3(1.)*band(r,.66,.012)*.5,m*(.7+.3*n)*uA);}`));m.userData.d=d;L.trail.add(m);return m;});
  // cúpula: icosaedro de bajo poligonaje (caras planas que se llenan de abajo arriba) + 30 aristas brillantes
  const domeG=new THREE.Group(); domeG.position.copy(DC); L.mesh.add(domeG);
  const FU={uF:{value:0}};
  const faces=new THREE.Mesh(new THREE.IcosahedronGeometry(R,0),fxU(`uniform float uF;
  void main(){vec3 n=normalize(vN);float fr=pow(1.-abs(dot(n,normalize(vV))),1.6);
   float fid=hash(floor(n*5.)+3.);float sh=.5+.5*sin(uT*3.+fid*25.);
   float h=vP.y/${f(R)}*.5+.5;float fill=smoothstep(uP,uP-.1,h);float front=band(h,uP,.04)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,fr+fid*.3)*1.3+vec3(1.)*(front+uF)*.4,((fr*.42+.05+fid*sh*.08+uF*.35)*fill+front*.8)*uA);}`,FU));
  domeG.add(faces);
  const gr=(1+Math.sqrt(5))/2, IV=[[-1,gr,0],[1,gr,0],[-1,-gr,0],[1,-gr,0],[0,-1,gr],[0,1,gr],[0,-1,-gr],[0,1,-gr],[gr,0,-1],[gr,0,1],[-gr,0,-1],[-gr,0,1]]
    .map(v=>V3(v[0],v[1],v[2]).normalize().multiplyScalar(R));
  const edgeMat=fx(`void main(){float s=.75+.25*sin(vUv.y*14.-uT*7.);gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.9,s*uA);}`);
  const edges=[];
  for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){const d=IV[i].distanceTo(IV[j]);if(d>R*1.2)continue;
    const mid=IV[i].clone().add(IV[j]).multiplyScalar(0.5), dir=IV[j].clone().sub(IV[i]).normalize();
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,d,6,1,true),edgeMat);
    m.position.copy(mid); m.quaternion.setFromUnitVectors(UPV,dir); m.userData.d=(mid.y/R+1)/2; edges.push(m); domeG.add(m);}
  // suelo: glifo centrado bajo el aliado y onda en la base del tótem
  const glyph=groundPlane(2.9,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.02)+band(r,.8,.012)+band(r,.86,.04)*step(.6,fract(an/6.2832*10.+uT*.2));
   vec2 q=abs(vec2(cos(an),sin(an)))*r;float hexl=band(max(q.x*.866+q.y*.5,q.y),.6,.012);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.3,(m+hexl*.8)*uA);}`)); glyph.position.z=AP.z;
  const sprout=groundPlane(2.2,TP.x,0.03,fx(RING_FS)); sprout.position.z=TP.z;
  L.decal.add(glyph,sprout);
  // partículas
  const C=`const float TS=${f(TS)};const float TG=${f(TG)};const float TB=${f(TB)};const float TI=${f(TI)};const float TD=${f(TD)};
  const vec3 TP=${v3(TP)};const vec3 AP=${v3(AP)};const vec3 AC=${v3(AC)};const float H=${f(H)};`;
  // tierra y polvo del brote
  a.count+=points(L.part,60,C+`void main(){float s=TS+aSeed.x*.25;float life=.5+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,0.,1.)+vec3(0.,1.3,0.));vec3 p=TP+vec3(0.,.05,0.)+d*(2.+1.6*aSeed.z)*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,DIRT_FS,NB);
  a.count+=points(L.part,30,C+`void main(){float s=TS+aSeed.x*.2;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=TP+vec3(cos(an),0.,sin(an))*(.25+.8*(1.-exp(-t*3.)))+vec3(0.,.1+.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.3+.2*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // motas que sueltan los aros al subir
  a.count+=points(L.part,180,C+`void main(){float j=floor(aSeed.x*3.);float d=j*.12;float s=TG+d+aSeed.y*.6;float k=clamp((s-TG-d)/.6,0.,1.);
   float life=.35+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.w*6.2832+t*2.;float r=.66*(1.-.25*k)+t*.25;
   vec3 p=AP+vec3(cos(an)*r,.05+2.2*k+.35*t,sin(an)*r);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.035*aSeed.z)*(1.-age*.5));}`);
  // savia rúnica: chispas que fluyen de los ojos del tótem al aliado mientras dura la guardia
  a.count+=points(L.part,90,C+`void main(){float life=.55;float k=(uT-TG)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 e=TP+vec3(0.,H*.8,.12);vec3 m=mix(e,AC,.5)+vec3(0.,.55+.3*r.x,0.);
   vec3 p=mix(mix(e,m,age),mix(m,AC,age),age)+(r-.5)*.18*sin(age*3.14159);
   vA=(k>=1.&&uT<TD)?sin(age*3.14159)*.9:0.;put(p,.03+.03*r.z);}`);
  // nodos de la cúpula: destellos en los 12 vértices, en orden de abajo arriba
  const domeP=new THREE.Group(); domeP.position.copy(DC); L.part.add(domeP);
  a.count+=points(domeP,12,C+`const vec3 IV[12]=vec3[12](${IV.map(v3).join(",")});
   void main(){vec3 v=IV[gl_VertexID];float s=TB+(v.y/${f(R)}+1.)*.5*.22;float age=(uT-s)/.35;
   vA=age>0.?(age<1.?1.-age*.6:.4*uE*(.6+.4*sin(uT*6.+aSeed.x*20.))):0.;put(v,(.22+.1*aSeed.y)*(age<1.?1.3-age*.5:.6));}`,STAR4_FS);
  // centelleos sobre la superficie de la cúpula
  a.count+=points(domeP,60,C+`void main(){float life=.5+aSeed.y*.4;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 d=normalize(r-.5+.0001);if(d.y<-.35)d.y=-d.y;vec3 p=d*${f(R*0.92)};
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.08+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=sparks(L.part,110,TI,`${f(DC.x)},${f(DC.y+R)},${f(DC.z)}`,"0.,.5,0.",2.5,6,2.2);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TB,TI,te)*(1-ss(TD,TE,te)), hit=ia>=0?Math.exp(-ia*6):0;
    caster.rotation.z=0.12*ss(0,TS+0.1,te)-0.22*ss(TS+0.1,TS+0.22,te)+0.1*ss(TS+0.3,TI,te);
    // el tótem brota (rebota y asienta) y al final se hunde
    const k=cl((te-TS)/0.4), sink=ss(TD+0.05,TE,te), D=H+0.45;
    tot.visible=te>=TS&&sink<0.999;
    tot.position.set(TP.x+(k>0&&k<1?0.025*Math.sin(te*70):0),-D*(1-back(k))-D*sink,TP.z);
    WU.uR.value=ss(TS+0.3,TI,te)*1.1; WU.uG.value=ss(TG,TG+0.1,te)*(0.85+0.15*Math.sin(te*9))*(1-sink);
    let p=cl((te-TS)/0.45); set(sprout,p,te>=TS?(1-p)*0.8:0);
    for(const r of rings){const kk=cl((te-TG-r.userData.d)/0.6);r.visible=kk>0&&kk<1;
      r.position.set(AP.x,0.05+2.2*kk,AP.z); r.scale.setScalar(1-0.25*kk); set(r,kk,Math.sin(Math.PI*kk)*0.95);}
    // cúpula: aristas que se tienden de abajo arriba, caras que se llenan y destello al cerrarse
    for(const e of edges){const kk=cl((te-TB-e.userData.d*0.22)/0.12);e.visible=kk>0&&env>0.01;e.scale.set(1,Math.max(kk,0.001),1);}
    edgeMat.uniforms.uA.value=env*(1+0.6*hit);
    set(faces,ss(TB,TI,te)*1.12,env*0.85); FU.uF.value=hit;
    const pop=1+0.06*hit*Math.cos(ia*20); domeG.scale.setScalar(pop); domeP.scale.setScalar(pop);
    domeG.rotation.y=domeP.rotation.y=0.15*te;
    glyph.material.uniforms.uA.value=ss(0.1,0.4,te)*(1-ss(TD,TE,te))*0.85;
    U.uE.value=env;
    const d=allies[0].userData.m; d.emissive.copy(U.uC1.value); d.emissiveIntensity=0.22*env+0.6*hit;
    if(te<TS+0.15){o.g.copy(HAND);o.gs=0.6;o.ga=0.3*ss(0,0.1,te);o.li=1.2;}
    else if(ia<0){o.g.set(TP.x,H*0.8,TP.z);o.gs=1;o.ga=0.25*WU.uG.value+0.1;o.li=2+2*WU.uG.value;}
    else{o.g.copy(DC);o.gs=2.4+1.5*Math.min(ia,0.4);o.ga=0.55*hit+0.08*env;o.li=6*hit+1.6*env;}
    o.ia=ia;o.c.copy(DC);o.shake=0;o.dist=0.5;o.flash=0;
  };
}};

// =====================================================================
// 3 · BARRICADA — un perímetro de luz se traza en el suelo, tablones gruesos emergen del subsuelo, dos flejes
//     de hierro al rojo los atraviesan y los remaches se encienden uno a uno al fijarse; queda brillando.
//     nivel 2: sin fractura (solo tierra que salta)
// =====================================================================
const barricade={key:"craft_barricade",name:"Barricada",tier:2,dur:2.4,ti:0.9,pal:PAL,
  phases:[["Perímetro",0],["Tablones",0.3],["Flejes",0.66],["Remaches",0.9],["Asentada",1.3]],
build(a){
  const L=a.L,T0=0.3,TB=0.66,TI=0.9,BC=V3(-2.3,0,0.15),YAW=0.65;
  // tres grupos (malla, suelo, partículas) con la misma transformación: todo en coordenadas locales del muro
  const grp=layer=>{const g=new THREE.Group();g.position.copy(BC);g.rotation.y=YAW;L[layer].add(g);return g;};
  const gM=grp("mesh"), gD=grp("decal"), gP=grp("part");
  const N=5, PZ=i=>-0.88+0.44*i, HS=[1.25,1.45,1.35,1.5,1.2];
  const WU={uR:{value:0},uG:{value:0}}, plankMat=fxU(woodFS(),WU,SOLID);
  const planks=HS.map((h,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.17,h,0.4),plankMat);
    m.userData={h,i,tz:(i%2?1:-1)*0.035,tx:((i*3)%5-2)*0.012};gM.add(m);return m;});
  // flejes de hierro forjado y remaches (se enfrían, pero los remaches siguen ardiendo)
  const MB={uH:{value:0},uD:{value:0}}, MR={uH:{value:0},uD:{value:1}};
  const beams=[0.38,0.98].map(y=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.17,2.2),fxU(metalFS(E_BOX),MB,SOLID));m.userData.y=y;gM.add(m);return m;});
  const rivMat=fxU(metalFS(E_LEN,"vec3(.2,.13,.07)","vec3(.45,.3,.16)"),MR,SOLID);
  const rivets=[];
  for(let j=0;j<10;j++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.052,0.04,10).rotateZ(Math.PI/2),rivMat);
    m.position.set(-0.215,j<5?0.38:0.98,PZ(j%5)); m.userData.j=j; rivets.push(m); gM.add(m);}
  // perímetro luminoso: se traza desde el lado del lanzador hacia ambos lados; esquinas rúnicas y discontinua interior
  const perim=groundPlane(1.3,0,0.02,fx(`void main(){vec2 p=(vUv-.5)*vec2(1.3,2.6);const vec2 HB=vec2(.55,1.2);
   vec2 q=abs(p)-HB;float d=length(max(q,0.))+min(max(q.x,q.y),0.);
   float u=abs(atan(p.y/HB.y,p.x/HB.x))/3.14159;float on=step(1.-u,uP);
   float line=band(d,0.,.022)*on;float gl=smoothstep(.18,0.,abs(d))*.35*on;
   float dash=band(d,-.1,.012)*step(.5,fract(u*14.-uT*.4))*on;
   float corner=band(length(abs(p)-HB),.09,.016)*on;float fill=smoothstep(0.,-.45,d)*.07*on;
   float pulse=.8+.2*sin(uT*4.);
   gl_FragColor=vec4(mix(uC2,uC1,min(line+corner,1.))*1.5+vec3(1.)*line*.3,(line+gl+dash+corner+fill)*pulse*uA);}`),2.6);
  gD.add(perim);
  // cortina baja sobre el perímetro (se desvanece hacia arriba)
  const fence=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.4,2.4),fx(`void main(){if(vP.y<-.195)discard;float h=(vP.y+.2)/.4;
   float n=noise(vec3(vP.x*8.+vP.z*8.,h*3.-uT*2.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,1.-h)*1.4,pow(1.-h,2.)*(.5+.5*n)*uA);}`)); fence.position.y=0.205; gM.add(fence);
  // partículas (coordenadas locales del muro)
  const C=`const float T0=${f(T0)};const float TI=${f(TI)};
  float pz(float i){return -.88+.44*i;}
  vec3 rv(float j){float i=mod(j,5.);return vec3(-.235,j>4.5?.98:.38,pz(i));}`;
  // tierra que revientan los tablones al salir
  a.count+=points(gP,100,C+`void main(){float i=floor(aSeed.x*5.);float s=T0+i*.07+aSeed.y*.12;float life=.55+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 v=vec3(r.x*1.3,1.8+2.4*aSeed.w,r.z*.5);vec3 p=vec3(0.,.05,pz(i)+r.y*.2)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.045+.05*aSeed.w);}`,DIRT_FS,NB);
  a.count+=points(gP,50,C+`void main(){float i=floor(aSeed.x*5.);float s=T0+i*.07+aSeed.y*.05;float life=.8+aSeed.z*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(r.x*.45,.1+.35*(1.-exp(-t*2.)),pz(i)+r.z*.3)+vec3(r.x,0.,r.z*.4)*.5*(1.-exp(-t*3.));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.28+.2*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // chispas que corren con el trazo del perímetro
  a.count+=points(gP,80,C+`void main(){float u=aSeed.x;float an=(aSeed.y>.5?1.:-1.)*u*3.14159;float s=.05+.35*(1.-u);
   vec2 q=vec2(cos(an),sin(an));q/=max(abs(q.x),abs(q.y));vec2 pp=q*vec2(.55,1.2);
   float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(pp.x,.03,-pp.y)+vec3(0.,(1.2+aSeed.w)*t,0.)+rnd()*.25*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.03+.03*aSeed.w);}`);
  // remaches: destello en cruz y chispas, uno tras otro
  a.count+=points(gP,30,C+`void main(){float j=mod(float(gl_VertexID),10.);float s=TI+.03*j;float age=(uT-s)/.3;
   vec3 p=rv(j)+vec3(-.04,0.,0.);vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.32+.18*aSeed.y)*(1.-age*.5));}`,STAR4_FS);
  a.count+=points(gP,140,C+`void main(){float j=mod(float(gl_VertexID),10.);float s=TI+.03*j;float life=.25+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-1.3,.5,0.));vec3 p=rv(j)+d*(1.4+2.2*aSeed.z)*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.025*aSeed.w)*(1.-age*.5));}`);
  // motas de runa que suben por los tablones mientras la barricada está asentada
  a.count+=points(gP,90,C+`void main(){float life=.9+aSeed.y*.5;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float i=floor(r.x*5.);vec3 p=vec3(-.12+r.z*.06,.15+r.y*1.1+age*.45,pz(i)+(r.z-.5)*.35);
   vA=(k>=1.)?sin(age*3.14159)*.8*uE:0.;put(p,.03+.03*r.y);}`);
  a.pose=function(te,o){
    const ia=te-TI, hold=ia>=0?1:0, jolt=ia>=0?Math.exp(-ia*12):0;
    caster.rotation.z=0.1*ss(0,0.2,te)-0.24*ss(0.2,0.32,te)+0.14*ss(0.4,TI,te)-0.05*jolt;
    set(perim,ss(0.05,0.4,te),0.95*ss(0.03,0.1,te));
    for(const m of planks){const u=m.userData,k=cl((te-T0-u.i*0.07)/0.32),e=back(k),shake=k>0&&k<1?0.015*Math.sin(te*80+u.i):0;
      m.visible=k>0; m.position.set(shake,u.h/2-(u.h+0.1)*(1-e)-0.03*jolt,PZ(u.i)); m.rotation.set(u.tx,0,u.tz);}
    // los flejes llegan desde el lado del lanzador y se clavan en el impacto
    const kb=cl((te-TB)/(TI-TB));
    for(const b of beams){b.visible=te>=TB; b.position.set(-0.14-0.75*(1-kb*kb),b.userData.y+0.25*(1-kb),0);}
    MB.uD.value=ss(TB,TB+0.12,te); MB.uH.value=ia<0?0.9:0.3+0.7*Math.exp(-ia*2);
    for(const r of rivets){const kr=cl((te-TI-0.03*r.userData.j)/0.1);r.visible=kr>0;r.scale.setScalar(Math.max(back(kr),0.001));}
    MR.uH.value=hold*(0.55+0.45*Math.exp(-ia*3)+0.12*Math.sin(te*6));
    WU.uR.value=ia<0?0:Math.min(ia/0.4,1)*1.05;
    fence.material.uniforms.uA.value=0.32*ss(0.25,0.45,te)+0.5*jolt;
    U.uE.value=hold;
    o.g.copy(BC); o.g.y=0.75;
    if(ia<0){o.gs=1.4;o.ga=0.18*ss(0,0.3,te);o.li=1.5+1.5*ss(T0,TI,te);}
    else{o.gs=1.6+1.6*Math.min(ia,0.4);o.ga=0.5*jolt+0.1;o.li=5*Math.exp(-ia*5)+1.4+0.3*Math.sin(te*6);}
    o.ia=ia;o.c.set(BC.x,0.7,BC.z);o.shake=0;o.dist=0.4;o.flash=0;
  };
}};

// =====================================================================
// 4 · TERREMOTO — un martillo de forja conjurado se alza y golpea el suelo ante el rival: fisuras luminosas en
//     cruz y picos de roca brotan en las 4 casillas adyacentes (la del rival lo levanta y lo enjaula).
//     nivel 3: fractura de baldosa, sacudida más suave que otros nivel 3
// =====================================================================
const quake={key:"craft_quake",name:"Terremoto",tier:3,dur:3.0,ti:1.05,pal:PAL,
  phases:[["Martillo",0],["Alzada",0.45],["Golpe",0.8],["Fisuras",1.05],["Picos",1.15],["Derrumbe",2.25]],
build(a){
  const L=a.L,TW=0.45,TS=0.8,TI=1.05,TD=2.25,TE=2.85,IP=V3(2.4,0,0),LH=2.3,PY=0.78,P=V3(IP.x-LH,PY,0);
  const th=te=>te<TW?1.2+0.05*Math.sin(te*6):te<TS?1.2+1.0*ss(TW,TS,te):te<TI?2.2*(1-Math.pow((te-TS)/(TI-TS),2.2))
    :0.1*Math.exp(-(te-TI)*7)*Math.abs(Math.sin((te-TI)*16));
  // martillo: cabeza de hierro con zunchos de bronce y mango de madera rúnica; gira alrededor de la empuñadura
  const MU={uH:{value:0},uD:{value:0}}, WU={uR:{value:0},uG:{value:0}};
  const hg=new THREE.Group(); hg.position.copy(P); L.mesh.add(hg);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.95,1.56,0.95),fxU(metalFS(E_BOX),MU,SOLID)); head.position.x=LH;
  const bandMat=fxU(metalFS(E_BOX,"vec3(.2,.12,.06)","vec3(.5,.33,.16)"),MU,SOLID);
  const bands=[0.5,-0.5].map(y=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.13,1.0),bandMat);m.position.set(LH,y,0);return m;});
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.095,LH+0.2,10).rotateZ(Math.PI/2).translate(LH/2-0.05,0,0),fxU(woodFS(),WU,SOLID));
  const pommel=new THREE.Mesh(new THREE.SphereGeometry(0.13,14,10),fxU(metalFS(`0.`,"vec3(.2,.12,.06)","vec3(.5,.33,.16)"),MU,SOLID)); pommel.position.x=-0.12;
  hg.add(head,...bands,handle,pommel);
  // barrido del golpe: abanico de calor detrás de la cabeza
  const smear=new THREE.Mesh(new THREE.RingGeometry(LH-0.6,LH+0.6,48,1,0,2.4),fx(`void main(){float an=atan(vP.y,vP.x);float d=an-uP;if(d<0.)discard;
   float rr=(length(vP.xy)-${f(LH-0.6)})/1.2;float n=noise(vec3(an*8.+uT*10.,rr*4.,0.));
   float al=exp(-d*3.5)*step(d,1.4)*smoothstep(0.,.3,rr)*smoothstep(1.,.65,rr)*(.45+.55*n);
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*6.))*1.6,al*uA);}`)); smear.position.copy(P); L.trail.add(smear);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // picos de roca en las 4 casillas en cruz (±1 en x y z); la del rival es un anillo de picos que lo rodea
  const RU={uH:{value:0},uD:{value:1}};
  const rockMat=fxU(`uniform float uH;uniform float uD;
  void main(){vec3 n=normalize(vN);float dn=noise(vP*6.+7.);if(dn>uD*1.05)discard;
   float lit=.3+.7*max(0.,dot(n,normalize(vec3(.3,.8,.5))));
   float g=noise(vP*8.)*.6+noise(vP*20.)*.4;vec3 c=mix(vec3(.12,.1,.09),vec3(.32,.26,.21),g)*lit;
   float cr=pow(1.-abs(noise(vP*5.+11.)*2.-1.),12.);
   c+=mix(uC2,uC1,cr)*(cr*1.6+smoothstep(.45,0.,vP.y)*.8)*uH+uC1*smoothstep(.12,0.,uD*1.05-dn)*step(uD,.999)*2.;
   gl_FragColor=vec4(c,1.);}`,RU,SOLID);
  const spike=(g,r,h,ox,oz,tilt)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,6,1).translate(0,h/2,0),rockMat);
    const l=Math.hypot(ox,oz)||1; m.position.set(ox,0,oz); m.rotation.set(oz/l*tilt,0,-ox/l*tilt); g.add(m);};
  const CELLS=[[-1,0],[0,1],[1,0],[0,-1]];
  const clusters=CELLS.map(([dx,dz],i)=>{const g=new THREE.Group(); g.position.set(IP.x+dx,0,dz); L.mesh.add(g);
    if(dx===1){for(let k=0;k<4;k++){const an=k*Math.PI/2+Math.PI/4;spike(g,0.17,0.85,Math.cos(an)*0.58,Math.sin(an)*0.58,0.35);}}
    else{spike(g,0.27,1.15,dx*0.12,dz*0.12,0.12);spike(g,0.15,0.6,dx*0.1-dz*0.3,dz*0.1+dx*0.3,0.45);spike(g,0.14,0.55,dx*0.1+dz*0.3,dz*0.1-dx*0.3,0.45);}
    g.userData.ts=TI+0.05+i*0.05; return g;});
  // suelo: fisuras luminosas en cruz, fractura de baldosa (nivel 3) y onda
  const FIS=4.6, fis=groundPlane(FIS,IP.x,0.028,fx(`void main(){vec2 p=(vUv-.5)*${f(FIS)};float m=0.;
   for(int i=0;i<2;i++){vec2 q=i==0?p:p.yx;
    float j=(noise(vec3(q.x*2.6,float(i)*7.,1.))-.5)*.3+(noise(vec3(q.x*9.,float(i)*7.,2.))-.5)*.08;
    float w=.055*(1.-abs(q.x)/2.3)+.01;float reach=step(abs(q.x),uP*2.3);
    m=max(m,smoothstep(w,0.,abs(q.y-j))*reach);
    float b=fract(abs(q.x)*1.3);float br=smoothstep(.02,0.,abs(q.y-j-sign(q.y-j+.001)*b*.35))*step(b,.5)*step(.4,abs(q.x))*reach;
    m=max(m,br*.6);}
   float core=smoothstep(.8,0.,length(p))*.5;float flick=.8+.2*noise(vec3(p*3.,uT*4.));
   gl_FragColor=vec4(mix(uC2,uC1,m)*1.8+vec3(1.)*m*.25,(m+core*step(.01,uP))*flick*uA);}`));
  const FS=6.5, frac=groundPlane(FS,IP.x,0.025,fx(tileFractureFS(FS))), shock=groundPlane(7.5,IP.x,0.032,fx(RING_FS));
  L.decal.add(frac,fis,shock);
  // partículas
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 IP=${v3(IP)};const vec3 P=${v3(P)};const float LH=${f(LH)};
  float th(float s){float k=clamp((s-TS)/(TI-TS),0.,1.);return 2.2*(1.-pow(k,2.2));}
  vec3 cellv(float c){return c<.5?vec3(-1.,0.,0.):c<1.5?vec3(0.,0.,1.):c<2.5?vec3(1.,0.,0.):vec3(0.,0.,-1.);}`;
  // brasas que forman el martillo
  a.count+=points(L.part,80,C+`void main(){vec3 hp=P+vec3(cos(1.2),sin(1.2),0.)*LH;float s=.08+aSeed.x*.4;float life=.28+aSeed.y*.15;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=hp+d*mix(1.6,.15,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.04*aSeed.z);}`);
  // brasas arrancadas a la cabeza durante el golpe
  a.count+=points(L.part,100,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.3+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float a=th(s);vec3 hp=P+vec3(cos(a),sin(a),0.)*LH;vec3 r=rnd();vec3 p=hp+r*vec3(.45,.75,.45)+vec3(-sin(a),cos(a),0.)*t*1.2+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.045*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.25;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 c=cellv(floor(aSeed.z*4.))*step(.3,aSeed.w);vec3 r=rnd();
   vec3 p=IP+c+vec3(r.x,0.,r.z)*(.3+.9*(1.-exp(-t*3.)))+vec3(0.,.15+.5*(1.-exp(-t*2.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.5+.35*aSeed.w)*(.55+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,240,TI,`${f(IP.x)},.1,0.`,"0.,.35,0.",4,11,3);
  // esquirlas que salen de cada pico al brotar (incandescentes y de roca)
  a.count+=points(L.part,120,C+`void main(){float c=mod(float(gl_VertexID),4.);float s=TI+.05+c*.05+aSeed.x*.04;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()*vec3(1.,0.,1.)+vec3(0.,1.4,0.))*(2.5+2.5*aSeed.z);vec3 p=IP+cellv(c)+vec3(0.,.3,0.)+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.05*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,80,C+`void main(){float c=mod(float(gl_VertexID),5.);float s=TI+(c<4.5?.05+c*.05:0.)+aSeed.x*.04;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()*vec3(1.,0.,1.)+vec3(0.,1.,0.))*(2.+2.6*aSeed.z);vec3 p=IP+(c<4.5?cellv(c):vec3(0.))+vec3(0.,.15,0.)+v*t+vec3(0.,-9.5*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.06*aSeed.w);}`,ROCK_FS,NB);
  // brasas que suben de las fisuras mientras arden
  a.count+=points(L.part,140,C+`void main(){float life=.6+aSeed.y*.5;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 arm=cellv(floor(r.x*4.));vec3 side=vec3(arm.z,0.,arm.x);vec3 p=IP+arm*(r.y*1.9)+side*(r.z-.5)*.12+vec3(sin(age*6.+r.z*9.)*.06,.03+age*(.7+r.z*.6),0.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.03+.035*r.z);}`);
  a.pose=function(te,o){
    const ia=te-TI, a1=th(te), cool=1-ss(TD,TE,te), hit=ia>=0?Math.exp(-ia*5):0;
    caster.rotation.z=0.14*ss(0,TW,te)+0.1*ss(TW,TS,te)-0.4*ss(TS,TI,te)+0.16*ss(TI,TI+0.4,te);
    hg.visible=te>=0.08&&te<TD+0.5; hg.rotation.z=a1; hg.position.y=PY+(ia<0?0.04*Math.sin(te*4):0);
    MU.uD.value=te<TD?ss(0.08,0.48,te):1-cl((te-TD)/0.45); MU.uH.value=0.35+0.65*ss(TS,TI,te)*(ia<0?1:Math.exp(-ia*1.5));
    WU.uR.value=ss(0.1,0.6,te)*1.05;
    smear.visible=te>=TS&&ia<0.15; set(smear,a1,ia<0?ss(TS,TS+0.06,te):1-cl(ia/0.15));
    let p=cl(ia/0.35); towardCam(hitRing.position,tmp.set(IP.x,0.5,0),0.6); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    set(fis,1-Math.pow(1-cl(ia/0.35),2),ia>=0?cool:0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?cool:0);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.85:0);
    // picos: brotan con rebote y se hunden en el derrumbe
    for(const g of clusters){const k=cl((te-g.userData.ts)/0.22);g.visible=k>0&&te<TE;
      g.position.y=-1.3*(1-back(k))-1.4*ss(TD,TE-0.1,te); g.scale.set(1,Math.max(0.6+0.4*back(k),0.001),1);}
    RU.uH.value=ia>=0?0.35+0.65*Math.exp(-ia*2):0; RU.uD.value=1-ss(TD+0.1,TE,te);
    U.uE.value=ia>=0?cool:0;
    // el pico de su casilla levanta al rival, que cae dentro de la jaula de roca
    const tr=te-clusters[2].userData.ts, hop=tr>0?Math.max(0,3.6*tr-9*tr*tr):0;
    target.position.y=hop; target.rotation.z=tr>0?0.18*Math.sin(tr*18)*Math.exp(-tr*4):0;
    if(ia<0){tmp2.set(P.x+Math.cos(a1)*LH,PY+Math.sin(a1)*LH,0);o.g.copy(tmp2);o.gs=1.4;o.ga=0.2+0.25*ss(TS,TI,te);o.li=2+3*ss(TS,TI,te);}
    else{o.g.set(IP.x,0.4,0);o.gs=2.4+4*Math.min(ia,0.5);o.ga=0.85*hit+0.1*cool;o.li=12*Math.exp(-ia*3.5)+2*cool;}
    o.ia=ia;o.c.set(IP.x,0.5,0);o.shake=0.75;o.dist=1.1;
  };
}};

// =====================================================================
// 5 · REFUERZO — cuatro placas de bronce convergen girando al torso del aliado, se remachan con destellos
//     y un halo dorado queda flotando sobre su cabeza.
//     nivel 1: rápido y preciso, sin marca de suelo
// =====================================================================
const reinforce={key:"craft_reinforce",name:"Refuerzo",tier:1,dur:1.2,ti:0.38,pal:PAL,allies:1,
  phases:[["Placas",0],["Remaches",0.38],["Halo",0.5],["Fin",0.95]],
build(a){
  const L=a.L,T0=0.06,TI=0.38,TF=0.95,TE=1.2,AP=ALLY_POS[0],Y=0.82,LEN=1.3;
  // placas: sectores curvos de cilindro con 4 remaches que se encienden (uR) y filo caliente
  const PU={uR:{value:0},uD:{value:1}};
  const plateMat=fxU(`uniform float uR;uniform float uD;
  void main(){vec3 n=normalize(vN);float dn=noise(vP*8.+5.);if(dn>uD*1.05)discard;
   vec3 l=normalize(vec3(.3,.8,.5));float lit=.35+.65*abs(dot(n,l));float sp=pow(max(0.,dot(reflect(-l,n),normalize(vV))),14.);
   float g=noise(vP*20.)*.6+noise(vP*55.)*.4;
   vec3 c=mix(vec3(.24,.15,.08),vec3(.55,.38,.2),g)*lit+vec3(1.,.85,.6)*sp*.6;
   vec2 q=abs(vUv-.5)*2.;float edge=smoothstep(.82,.97,max(q.x,q.y));
   vec2 rc=vec2(abs(vUv.x-.5)-.38,abs(vUv.y-.5)-.33);float riv=smoothstep(.07,.03,length(rc*vec2(1.6,1.)));
   c=c*(1.-edge*.3)+uC1*edge*.35+mix(uC2,uC1,uR)*riv*(.6+2.4*uR)+uC1*smoothstep(.12,0.,uD*1.05-dn)*step(uD,.999)*2.;
   gl_FragColor=vec4(c,1.);}`,PU,DS);
  const plates=[0,1,2,3].map(i=>{const tc=i*Math.PI/2+Math.PI/4;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.43,0.47,0.6,10,1,true,tc-LEN/2,LEN),plateMat);
    m.userData={i,dir:V3(Math.sin(tc),0,Math.cos(tc))}; L.mesh.add(m); return m;});
  // halo dorado flotante
  const halo=new THREE.Mesh(new THREE.TorusGeometry(0.27,0.022,8,48).rotateX(Math.PI/2),fx(`void main(){float s=.8+.2*sin(vUv.x*40.-uT*8.);
   vec3 gold=vec3(1.,.78,.32);gl_FragColor=vec4(mix(gold,uC1,.3)*1.9,s*uA);}`));
  const haloGlow=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9).rotateX(-Math.PI/2),fx(`void main(){float r=length(vUv-.5)*2.;
   gl_FragColor=vec4(mix(vec3(1.,.78,.32),uC1,.3)*1.3,band(r,.6,.25)*.5*uA);}`));
  L.mesh.add(halo,haloGlow);
  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const vec3 AP=${v3(AP)};const float Y=${f(Y)};
  vec3 pd(float i){float tc=i*1.5708+.7854;return vec3(sin(tc),0.,cos(tc));}
  float ek(float s,float i){float k=clamp((s-T0-i*.03)/(TI-T0-i*.03),0.,1.);return 1.-pow(1.-k,3.);}`;
  // estelas finas de las placas en vuelo
  a.count+=points(L.part,80,C+`void main(){float i=mod(float(gl_VertexID),4.);float s=T0+aSeed.x*(TI-T0);float life=.12+aSeed.y*.1;float age=(uT-s)/life;
   float e=ek(s,i);vec3 p=AP+vec3(0.,Y+.5*(1.-e)+(aSeed.z-.5)*.45,0.)+pd(i)*(.47+1.2*(1.-e))+rnd()*.03;
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.025+.02*aSeed.w)*(1.-age*.5));}`);
  // destello en cada uno de los 16 remaches
  a.count+=points(L.part,16,C+`void main(){float id=float(gl_VertexID);float i=floor(id/4.);float j=mod(id,4.);
   float an=i*1.5708+.7854+(j<1.5?-.38:.38)*${f(LEN)};float y=Y+(mod(j,2.)<.5?-.2:.2);
   float s=TI+i*.025+j*.012;float age=(uT-s)/.22;vec3 p=AP+vec3(sin(an)*.5,y,cos(an)*.5);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.2+.08*aSeed.y)*(1.-age*.4));}`,STAR4_FS);
  a.count+=points(L.part,96,C+`void main(){float id=mod(float(gl_VertexID),16.);float i=floor(id/4.);float j=mod(id,4.);
   float an=i*1.5708+.7854+(j<1.5?-.38:.38)*${f(LEN)};float y=Y+(mod(j,2.)<.5?-.2:.2);
   float s=TI+i*.025+j*.012;float life=.18+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 o0=vec3(sin(an),0.,cos(an));vec3 d=normalize(o0*1.2+rnd()*.8+vec3(0.,.3,0.));
   vec3 p=AP+o0*.5+vec3(0.,y,0.)+d*(1.+1.5*aSeed.z)*t+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.018+.018*aSeed.w)*(1.-age*.5));}`);
  // motas doradas alrededor del halo
  a.count+=points(L.part,30,C+`void main(){float life=.45+aSeed.y*.3;float k=(uT-TI-.08)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+uT*1.5;vec3 p=AP+vec3(cos(an)*.27,2.1+(r.y-.5)*.1-age*.15,sin(an)*.27);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.025+.02*r.z);}`,STAR4_FS);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.12,te)*(1-ss(TF,TE,te)), snap=ia>=0?Math.exp(-ia*14):0;
    caster.rotation.z=0.1*ss(0,0.1,te)-0.16*ss(0.1,0.2,te)+0.06*ss(0.2,TI,te);
    for(const m of plates){const u=m.userData,k=cl((te-T0-u.i*0.03)/(TI-T0-u.i*0.03)),e=1-Math.pow(1-k,3);
      m.visible=te>=T0&&te<TE; m.position.copy(AP).addScaledVector(u.dir,1.2*(1-e)); m.position.y=Y+0.5*(1-e);
      m.rotation.y=(1-e)*1.6*(u.i%2?1:-1); m.scale.setScalar(1+0.12*snap);}
    PU.uR.value=ia>=0?Math.exp(-ia*5)*0.9+0.15:0; PU.uD.value=te<T0+0.1?ss(T0,T0+0.1,te):1-ss(TF,TE,te);
    const hy=2.12+0.2*(1-ss(TI,TI+0.2,te))+0.03*Math.sin(te*5);
    halo.visible=haloGlow.visible=env>0.001; halo.position.set(AP.x,hy,AP.z); haloGlow.position.set(AP.x,hy,AP.z);
    halo.rotation.y=te*1.2; halo.material.uniforms.uA.value=env; haloGlow.material.uniforms.uA.value=env;
    U.uE.value=env;
    const d=allies[0].userData.m; d.emissive.setRGB(1,0.8,0.4); d.emissiveIntensity=0.15*env+0.55*snap;
    if(te<T0+0.05){o.g.copy(HAND);o.gs=0.45;o.ga=0.25;o.li=1;}
    else if(ia<0){o.g.copy(AP);o.g.y=Y;o.gs=0.9;o.ga=0.18;o.li=1.5;}
    else{o.g.copy(AP);o.g.y=ia<0.25?Y:hy;o.gs=0.9+0.8*Math.min(ia,0.3);o.ga=0.45*snap+0.12*env;o.li=3.5*snap+1*env;}
    o.ia=ia;o.c.copy(AP);o.c.y=Y;o.shake=0;o.dist=0.3;o.flash=0;
  };
}};

// =====================================================================
// 6 · TORRETA — una ballesta mecánica fantasma se materializa tras el lanzador, tensa la cuerda con su engranaje
//     y dispara un virote veloz que rasga el aire (cono de choque + distorsión) y atraviesa al rival,
//     saliendo por detrás en un cono de chispas.
//     nivel 2: firme, sin fractura
// =====================================================================
const turret={key:"craft_turret",name:"Torreta",tier:2,dur:2.0,ti:0.95,pal:PAL,
  phases:[["Ensamblaje",0],["Tensado",0.35],["Disparo",0.82],["Perforación",0.95],["Disipación",1.45]],
build(a){
  const L=a.L,TK=0.35,TF=0.82,TI=0.95,TD=1.45,TE=1.95,CB=V3(-4.55,2.25,0);
  const ang=Math.atan2(TC.y-CB.y,TC.x-CB.x), ca=Math.cos(ang), sa=Math.sin(ang);
  const W=(lx,ly,out)=>out.set(CB.x+ca*lx-sa*ly,CB.y+sa*lx+ca*ly,0);   // local de la ballesta → mundo
  const NOCK0=0.5, NOCK1=-0.22, BL=0.8;
  // ballesta: caja, arco vertical de dos palas, cuerda, engranajes; todo con el mismo material fantasma
  const GU={uP:{value:0},uA:{value:0}};
  const gBox=fxU(ghostFS(E_BOX),GU), gRound=fxU(ghostFS(`0.`),GU), gLen=fxU(ghostFS(E_LEN),GU);
  const xb=new THREE.Group(); xb.position.copy(CB); xb.rotation.z=ang; L.mesh.add(xb);
  const stock=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.1,0.13),gBox);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.32,0.1),gBox); grip.position.set(-0.32,-0.18,0); grip.rotation.z=0.3;
  const prod=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.18,0.16),gBox); prod.position.x=0.62;
  const limbs=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.6,0.09),gBox);m.position.set(0.62,0.3*s,0);m.rotation.z=0.3*s;return m;});
  const TIPY=0.3+0.3*Math.cos(0.3), TIPX=0.62-0.3*Math.sin(0.3);
  const strings=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,1,5,1,true),gLen);m.userData.s=s;return m;});
  const gear=new THREE.Mesh(new THREE.TorusGeometry(0.14,0.035,6,14),gRound); gear.position.set(-0.45,-0.05,0.09);
  const gear2=new THREE.Mesh(new THREE.TorusGeometry(0.08,0.028,6,10),gRound); gear2.position.set(-0.26,-0.12,0.09);
  xb.add(stock,grip,prod,...limbs,...strings,gear,gear2);
  // virote (brillante, casi sólido) con cono de choque que deforma el aire
  const bolt=new THREE.Group(); L.mesh.add(bolt);
  const boltMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.6+uC2*fr,(.75+.25*fr)*uA);}`);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,BL,8).rotateZ(Math.PI/2).translate(-BL/2,0,0),boltMat);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.2,8).rotateZ(-Math.PI/2).translate(0.08,0,0),boltMat);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.11,0.006).translate(-BL+0.1,0,0),boltMat);
  const mach=new THREE.Mesh(new THREE.ConeGeometry(0.3,1.6,28,1,true).rotateZ(-Math.PI/2).translate(-0.62,0,0),fx(`void main(){
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float rip=.5+.5*sin(vP.x*34.+uT*90.);
   float n=noise(vec3(vP.x*6.-uT*30.,vP.y*8.,vP.z*8.));
   gl_FragColor=vec4(mix(vec3(1.),uC1,.5)*1.1,fr*(.12+.3*rip*n)*smoothstep(-1.42,-.4,vP.x)*uA);}`));
  bolt.add(shaft,tip,fl,mach);
  // estela fina del virote (planos cruzados)
  const tg=new THREE.PlaneGeometry(1,0.07).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;float n=noise(vec3(u*10.-uT*20.,v*3.,0.));
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.3,0.,v)*u*.5,smoothstep(1.,.1,v)*pow(u,2.)*(.6+.4*n)*uA);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2; trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
  // perforación: anillo de entrada y cono de chispas que sale por la espalda del rival
  const entry=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),fx(RING_FS,{depthTest:false})); L.mesh.add(entry);
  const EX=V3(TC.x+0.45,TC.y-0.06,0);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.62,1.5,28,1,true).rotateZ(Math.PI/2).translate(0.75,0,0),fx(`void main(){
   float u=vP.x/1.5;float an=atan(vP.y,vP.z);float st=pow(noise(vec3(an*5.,u*3.-uT*18.,0.)),3.)*2.;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float al=st*smoothstep(uP+.05,uP-.15,u)*smoothstep(0.,.08,u)*(.4+.6*fr);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.7,al*uA);}`)); cone.position.copy(EX); cone.rotation.z=ang; L.trail.add(cone);
  const ring=groundPlane(2.2,3.4,0.03,fx(RING_FS)); L.decal.add(ring);
  // trayectoria del virote (punta): de la muesca al pecho del rival y más allá
  const N0=W(NOCK1+BL+0.18,0.07,V3(0,0,0)), PATH=TC.clone().sub(N0), PL=PATH.length(); PATH.normalize();
  const SPD=PL/(TI-TF);
  const C=`const float TK=${f(TK)};const float TF=${f(TF)};const float TI=${f(TI)};const vec3 CB=${v3(CB)};const vec3 N0=${v3(N0)};
  const vec3 PD=${v3(PATH)};const float SPD=${f(SPD)};const vec3 TC=${v3(TC)};const vec3 EX=${v3(EX)};`;
  // ensamblaje: motas que llegan a la ballesta
  a.count+=points(L.part,100,C+`void main(){float s=.02+aSeed.x*.35;float life=.25+aSeed.y*.15;float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=CB+vec3(d.x*.8,d.y*.5,d.z*.4)*.9+d*mix(1.4,.0,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.035*aSeed.z);}`);
  // chispitas del engranaje al tensar
  a.count+=points(L.part,40,C+`void main(){float s=TK+aSeed.x*(TF-TK-.05);float life=.2+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 g0=CB+vec3(-.45,-.08,.1);vec3 d=normalize(rnd()+vec3(0.,.4,.6));vec3 p=g0+d*1.6*t+vec3(0.,-3.*t*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.02+.02*aSeed.z);}`);
  a.count+=sparks(L.part,70,TF,`${f(N0.x)},${f(N0.y)},0.`,`${f(PATH.x*0.8)},${f(PATH.y*0.8)},0.`,1.5,5,1.5);
  // motas que deja el virote y anillos de choque en el aire a lo largo del recorrido
  a.count+=points(L.part,110,C+`void main(){float s=TF+aSeed.x*.3;float life=.18+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=N0+PD*SPD*(s-TF)+rnd()*.05+rnd()*.35*t;
   vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,140,C+`void main(){float s=TF+floor(aSeed.x*7.)/7.*(TI-TF+.12);float t=max(uT-s,0.);float age=t/.28;
   float an=aSeed.y*6.2832;vec3 sd=vec3(-PD.y,PD.x,0.);vec3 p=N0+PD*SPD*(s-TF)+(sd*cos(an)+vec3(0.,0.,1.)*sin(an))*(.07+.75*(1.-exp(-t*9.)));
   vA=(uT>s&&age<1.)?(1.-age)*.55:0.;put(p,.025+.02*aSeed.z);}`);
  // cono de chispas perforante y astillas de energía por la espalda del rival
  a.count+=sparks(L.part,220,TI,`${f(EX.x)},${f(EX.y)},0.`,`${f(PATH.x*1.9)},${f(PATH.y*1.9)},0.`,3,10,1.4);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(PD*1.6+rnd()*.7);vec3 p=EX+d*(2.5+3.*aSeed.z)*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.035+.04*aSeed.w);}`,CHIP_FS);
  const bp=V3(0,0,0), nk=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ifr=te-TF, fade=1-ss(TD,TE,te);
    caster.rotation.z=0.08*ss(0,0.2,te)-0.12*ss(TF-0.05,TF+0.03,te)+0.04*ss(TF+0.1,TF+0.4,te);
    // ballesta: aparece, tensa, retrocede al disparar y se desvanece
    GU.uP.value=te<TD?ss(0,0.4,te):1-ss(TD,TE,te)*1.0; GU.uA.value=0.85*ss(0,0.1,te)*(te<TD?1:1-ss(TD+0.3,TE,te)*0.6);
    const draw=ss(TK,TF-0.06,te)*(1-ss(TF,TF+0.03,te)), nx=NOCK0+(NOCK1-NOCK0)*draw;
    const rec=ifr>=0?0.18*Math.exp(-ifr*9)*ss(0,0.03,ifr):0;
    xb.position.set(CB.x-ca*rec,CB.y-sa*rec+0.04*Math.sin(te*3),0);
    gear.rotation.z=-draw*9-te*0.5; gear2.rotation.z=draw*15+te;
    for(const s of strings){const sx=TIPX,sy=TIPY*s.userData.s,dx=nx-sx,dy=-sy,len=Math.hypot(dx,dy);
      s.position.set((sx+nx)/2,sy/2,0); s.rotation.z=Math.atan2(dy,dx)-Math.PI/2; s.scale.set(1,Math.max(len,0.001),1);}
    // virote: cargado en la muesca, vuela recto, atraviesa y sigue
    if(ifr<0){W(nx+BL+0.18,0.07,bp);bolt.visible=te>=TK-0.05;}
    else{bp.copy(N0).addScaledVector(PATH,SPD*ifr);bolt.visible=bp.x<9;}
    bolt.position.copy(bp); bolt.rotation.z=ang; boltMat.uniforms.uA.value=ss(TK-0.05,TK+0.1,te)*(1-ss(TI+0.08,TI+0.2,te));
    mach.visible=ifr>=0&&ia<0.2; mach.material.uniforms.uA.value=ifr>=0?ss(0,0.02,ifr)*(1-cl(ia/0.2)):0;
    trail.visible=ifr>=0&&ia<0.35; trail.position.copy(bp); trail.rotation.z=ang;
    trail.scale.set(Math.max(bp.distanceTo(N0),0.001),1,1); tm.uniforms.uA.value=ia<0?1:1-cl(ia/0.35);
    let p=cl(ia/0.3); towardCam(entry.position,TC,0.35); billboard(entry); entry.visible=ia>=0&&p<1; set(entry,p,1-p);
    cone.visible=ia>=0&&ia<0.45; set(cone,ss(0,0.12,ia)*1.1,ia>=0?1-cl(ia/0.45):0);
    p=cl(ia/0.5); set(ring,1-Math.pow(1-p,2),ia>=0?(1-p)*0.6:0);
    const hit=ia>=0?Math.exp(-ia*6):0;
    target.position.x=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-0.24*hit*Math.cos(ia*15);
    if(ifr<0){W(0.6,0,nk);o.g.copy(nk);o.gs=1.1+0.3*draw;o.ga=0.22*ss(0,0.2,te)+0.15*draw;o.li=1.5+2*draw;}
    else if(ia<0){o.g.copy(bp);o.gs=0.9;o.ga=0.5;o.li=4;}
    else{o.g.copy(TC);o.gs=1.3+2.6*Math.min(ia,0.4);o.ga=0.65*hit;o.li=7*hit+0.6*fade*GU.uA.value;}
    // distorsión real: onda de choque al soltar en la boca de la ballesta; luego la del impacto
    if(ia<0){o.ia=ifr;W(0.62,0,o.c);o.flash=0;o.dist=0.55;}
    else{o.ia=ia;o.c.copy(TC);o.flash=1;o.dist=0.7;}
    o.shake=0;
  };
}};

VFX.module("Sapidae · Forjacubiles",[anvil,totem,barricade,quake,reinforce,turret]);
})();

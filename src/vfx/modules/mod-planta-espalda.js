// =====================================================================
// MÓDULO · CLASE PLANTA (ESPALDA)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Estética vegetal: savia, hojas, maderas, hongos, rocío. Los escudos usan materiales distintos:
// púas carnosas (Succulent), coraza de cristal de menta (Mint), calabaza blindada (Pumpkin), hojas que se despliegan (Watering Can).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,BURST_FS,SCORCH_FS,BUBBLE_FS,CROSS_FS,
  caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,FLAME_FS,billboard,towardCam,STAR4_FS,SMOKE_FS,tileFractureFS}=VFX.lib;

VFX.palette("Pureza",["#ffffff","#8fe6c4"]);
VFX.palette("Toxina",["#c8ff5a","#8b2fd8"]);
VFX.palette("Esmeralda",["#e6ffb4","#12a35c"]);
VFX.palette("Menta",["#e2fff7","#2fcfb2"]);
VFX.palette("Nabo",["#f6e8ff","#a24fe2"]);
VFX.palette("Rocío (Espalda)",["#eaf8ff","#3a9cff"]);

const CX=-3.7, TX=3.4, TC=V3(3.15,1.2,0), CB=V3(-3.85,1.25,0), CP=V3(-3.7,1.0,0);
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const hash1=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
// nivel por costo de PA: comprime el tiempo de toda la habilidad por k (dur, ti, fases, pose y partículas vía uT);
// la pose sigue escrita en su tiempo "base" y o.ia vuelve al tiempo real para el destello/distorsión del motor
const tempo=(d,k)=>{const r=x=>Math.round(x*k*1000)/1000;d.dur=r(d.dur);d.ti=r(d.ti);d.phases=d.phases.map(([n,t])=>[n,r(t)]);
  const b=d.build;d.build=function(a){b.call(this,a);const P=a.pose;a.pose=function(te,o){const t=te/k;U.uT.value=t;P(t,o);o.ia*=k;};};return d;};
// quemadura suave (nivel 2): mancha sin grietas, sustituye a cráteres y grietas de impacto
const SOFTBURN_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*5.,2.))*.7+noise(vec3(p*13.,5.))*.3;
 float m=smoothstep(1.,.25,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.5)*1.1,m*(.3+.15*n)*uA);}`;
// plano de suelo centrado en (x,z)
const gp=(s,x,z,y,mat)=>{const m=groundPlane(s,x,y,mat);m.position.z=z;return m;};
// luz difusa fija en espacio de vista (como el resto del banco)
const LIT=`float lit(){return .42+.58*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));}
float fres(float k){return pow(1.-abs(dot(normalize(vN),normalize(vV))),k);}`;
// hoja en sprite girado (vR): lob = lóbulos de roble, ser = dientes de sierra; col = color GLSL
const leafFS=(lob,ser,col)=>HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float y=q.y*2.15;float w=.36*sqrt(max(0.,1.-y*y))*(1.-.2*y);
 w*=1.-${f(lob)}*.45*pow(abs(sin(y*7.4)),1.4)-${f(ser)}*.14*abs(sin(y*34.));
 float body=smoothstep(w,w-.05,abs(q.x))*step(abs(y),.98);
 float rib=smoothstep(.03,0.,abs(q.x))*step(-.95,y);
 float vein=smoothstep(.025,0.,abs(fract(abs(q.x)*3.5-y*1.6)-.5)-.44)*body;
 float a=body*vA;if(a<.003)discard;
 vec3 b=${col};
 gl_FragColor=vec4(b*(.8+.4*vMix)+vec3(.9,1.,.8)*(rib*.45+vein*.12),a);}`;
// mota suave de color fijo (proyectiles enemigos: rojo ajeno a la paleta)
const dotFS=col=>HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(${col}*1.5+vec3(1.)*smoothstep(.2,0.,d)*.4,a);}`;
const SOLID2=Object.assign({},SOLID,{side:THREE.DoubleSide});   // opaco a dos caras (tornos, hojas planas)
// gira un grupo solo alrededor de y para mirar a cámara (estelas verticales)
const billboardY=g=>{const c=VFX.camera.position;g.rotation.y=Math.atan2(c.x-g.position.x,c.z-g.position.z);};
const RED="vec3(1.,.28,.18)";

// =====================================================================
// 1 · SUCCULENT — corona de púas carnosas de suculenta; tres proyectiles enemigos se clavan y son absorbidos
//     (nivel 1: corona pequeña, rápida y precisa; sin onda en el suelo)
// =====================================================================
const peSucculent=tempo({key:"peSucculent",name:"Succulent",dur:2.6,ti:0.85,pal:"Rocío (Boca)",
  phases:[["Brote",0],["Corona",0.35],["Absorción",0.85],["Savia",1.5],["Repliegue",2.0]],
build(a){
  const L=a.L,TG=0.05,TH=[0.85,1.1,1.35],FLY=0.4,TR=2.0,TE=2.45,N=9,R0=0.45,LEN=0.85;
  // corona: N hojas gruesas (cono de 10 lados aplastado) inclinadas hacia fuera; cada una con su material (pulso propio)
  const geo=new THREE.ConeGeometry(0.12,1,10,12).translate(0,0.5,0);
  const leafFSs=`uniform float uQ;${LIT}
  void main(){float h=clamp(vP.y,0.,1.);float fr=fres(1.4);
   float n=noise(vP*vec3(28.,5.,28.));
   vec3 skin=mix(vec3(.08,.27,.26),vec3(.40,.68,.58),h*.6+n*.25);
   skin=mix(skin,vec3(.62,.2,.32),smoothstep(.84,1.,h)*.7);           // punta enrojecida, como las suculentas al sol
   float teeth=step(.82,fract(h*13.+n*.3))*smoothstep(.3,.8,fr)*step(h,.9);
   float sap=uQ>=0.?band(h,1.-uQ*1.5,.13)*exp(-uQ*1.1):0.;           // la savia baja de la punta a la base
   float glow=uQ>=0.?exp(-uQ*2.5)+.22*exp(-uQ*.5):0.;
   vec3 c=skin*lit()+mix(uC2,uC1,fr)*fr*(.45+glow)+uC1*(sap*2.2+glow*.35*(1.-h*.4))+vec3(.9,1.,.9)*teeth*.18+uC2*uP*.25;
   gl_FragColor=vec4(c,1.);}`;
  const leaves=[];
  for(let i=0;i<N;i++){
    const th=i*2*Math.PI/N, tilt=0.42+0.2*hash1(i*3.1), len=LEN*(0.8+0.35*hash1(i+7)), g=new THREE.Group();
    g.position.set(CX+Math.cos(th)*R0,0,Math.sin(th)*R0); g.rotation.y=-th;
    const m=new THREE.Mesh(geo,fxU(leafFSs,{uQ:{value:-1}},SOLID)); m.rotation.z=-tilt; m.scale.set(1,len,0.55);
    g.add(m); L.mesh.add(g);
    // punto de absorción: a 3/4 de la hoja
    const hp=V3(CX+Math.cos(th)*(R0+Math.sin(tilt)*len*0.72),Math.cos(tilt)*len*0.72,Math.sin(th)*(R0+Math.sin(tilt)*len*0.72));
    leaves.push({g,m,th,tilt,len,hp,d:0.025*i+0.08*hash1(i*5)});
  }
  // hojas que reciben los proyectiles: frente (+x) y las dos vecinas
  const HIT=[leaves[0],leaves[1],leaves[N-1]].map((l,k)=>({l,t:TH[k],src:V3(8.5,1.5+0.5*k,l.hp.z*3.5+(k-1)*0.6)}));
  // proyectiles enemigos: núcleo rojo + cola en cono (rojo fijo: deben leerse ajenos)
  const boltFS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(${RED}*(1.+fr)+vec3(1.)*(1.-fr)*.8,(.6+.4*fr)*uA);}`;
  const tailFS=`void main(){float l=1.-vUv.y;gl_FragColor=vec4(${RED}*1.6,l*l*.8*uA);}`;   // ancho junto al proyectil, afilada detrás
  for(const h of HIT){
    h.bolt=new THREE.Mesh(new THREE.SphereGeometry(0.065,14,10),fx(boltFS));
    h.tail=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.55,10,1,true).rotateZ(-Math.PI/2).translate(0.275,0,0),fx(tailFS));
    h.dir=h.l.hp.clone().sub(h.src).normalize();
    h.tail.quaternion.setFromUnitVectors(V3(1,0,0),h.dir.clone().negate());
    h.ring=new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.85),fx(RING_FS,{depthTest:false}));
    L.mesh.add(h.bolt,h.ring); L.trail.add(h.tail);
  }
  const C=`const float TG=${f(TG)};`;
  // brote: terrones que saltan donde nace cada hoja
  a.count+=points(L.part,36,C+`void main(){float an=floor(aSeed.x*9.)*.6981+(aSeed.y-.5)*.3;float s=TG+fract(aSeed.x*9.)*.1+floor(aSeed.x*9.)*.025;
   float life=.5+aSeed.y*.25;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=vec3(cos(an)*(.35+.6*aSeed.z),1.1+aSeed.w*.9,sin(an)*(.35+.6*aSeed.z));
   vec3 p=vec3(${f(CX)}+cos(an)*${f(R0)},.05,sin(an)*${f(R0)})+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.04+.035*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,16,C+`void main(){float an=aSeed.x*6.2832;float s=TG+aSeed.y*.25;float life=.7+aSeed.z*.4;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 p=vec3(${f(CX)}+cos(an)*(.45+.35*(1.-exp(-t*3.))),.08+.22*(1.-exp(-t*2.)),sin(an)*(.45+.35*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.18+.14*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  for(const h of HIT){
    const P=v3(h.l.hp), S=v3(h.src), T0=f(h.t-FLY), T1=f(h.t);
    // estela de chispas rojas del proyectil
    a.count+=points(L.part,20,`void main(){float s=${T0}+aSeed.x*${f(FLY)};float life=.15+aSeed.y*.15;float t=max(uT-s,0.);float age=(uT-s)/life;
     vec3 p=mix(${S},${P},(s-${T0})/${f(FLY)})+rnd()*(.03+.15*t);
     vA=(age>0.&&age<1.&&s<${T1})?1.-age:0.;put(p,(.028+.025*aSeed.z)*(1.-age*.5));}`,dotFS(RED));
    // salpicadura de savia en el impacto y gotas que resbalan
    a.count+=sparks(L.part,24,h.t,`${f(h.l.hp.x)},${f(h.l.hp.y)},${f(h.l.hp.z)}`,"1.,.4,0.",1.5,4.5,3);
    a.count+=points(L.part,14,`void main(){float s=${T1}+aSeed.x*.2;float life=.4+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
     vec3 v=normalize(rnd()+vec3(.6,.6,0.))*(.4+.8*aSeed.z);vec3 p=${P}+v*t+vec3(0.,-4.*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.035+.03*aSeed.w);}`,BUBBLE_FS);
    // el rojo del proyectil se vuelve savia: motas que bajan por la hoja hasta la raíz
    const B=v3(V3(CX+Math.cos(h.l.th)*R0,0.05,Math.sin(h.l.th)*R0));
    a.count+=points(L.part,18,`void main(){float s=${T1}+aSeed.x*.35;float life=.4+aSeed.y*.15;float age=clamp((uT-s)/life,0.,1.);
     vec3 p=mix(${P},${B},age*age)+rnd()*.04;
     vA=(uT>s&&uT<s+life)?sin(age*3.14159):0.;put(p,.035+.03*aSeed.z);}`);
  }
  // rocío y destellos de savia que orbitan la corona tras absorber
  a.count+=points(L.part,50,`void main(){float life=.9+aSeed.y*.6;float k=(uT-${f(TH[0])})/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.5;float rad=.5+.35*r.y;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.12+age*(.8+.6*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.025+.025*r.z);}`);
  // roseta en el suelo: pétalos apuntados que se encienden con cada absorción (uQ)
  const rosette=gp(1.9,CX,0,0.02,fxU(`uniform float uQ;
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float pet=.5+.42*pow(abs(cos(an*4.5)),.7);float pet2=.32+.25*pow(abs(cos(an*4.5+1.5708)),.7);
   float m=band(r,pet,.02)*step(r,uP)+band(r,pet2,.015)*step(r,uP)*.8+band(r,.95,.012);
   float fill=smoothstep(pet,pet-.15,r)*.12*step(r,uP);
   float ring=band(r,uQ*1.4,.08)*exp(-uQ*3.)*step(0.,uQ);
   gl_FragColor=vec4(mix(uC2,uC1,m+ring)*1.3,(m+fill+ring)*uA);}`,{uQ:{value:-1}}));
  L.decal.add(rosette);

  const cm=caster.userData.m;
  a.pose=function(te,o){
    const ret=1-ss(TR,TE,te); let last=-1;
    for(const t of TH)if(te>=t)last=t;
    caster.rotation.z=0.06*ss(0,0.2,te)-0.06*ss(0.3,0.6,te);
    for(const l of leaves){
      const k=cl((te-TG-l.d)/0.4), grow=k<1?1-Math.pow(1-k,3)*Math.cos(k*7):1;   // brote elástico
      let q=-1; for(const h of HIT)if(h.l===l&&te>=h.t)q=te-h.t;
      const sw=q>=0?0.16*Math.exp(-q*4)*Math.cos(q*16)+0.05*Math.exp(-q*0.6):0;
      l.g.visible=k>0&&ret>0.01; l.m.scale.set(1+sw*1.6,Math.max(l.len*grow*ret,0.001),0.55*(1+sw*1.6));
      l.m.rotation.z=-l.tilt*(0.6+0.4*grow)-sw*0.25;
      l.m.material.uniforms.uQ.value=q; l.m.material.uniforms.uP.value=0.4*Math.sin(te*3+l.th);
    }
    for(const h of HIT){
      const k=(te-(h.t-FLY))/FLY, fl=k>=0&&k<1;
      h.bolt.visible=h.tail.visible=fl; h.bolt.position.lerpVectors(h.src,h.l.hp,cl(k)); h.tail.position.copy(h.bolt.position);
      set(h.bolt,0,1); set(h.tail,0,1);
      const p=cl((te-h.t)/0.35); towardCam(h.ring.position,h.l.hp,0.3); billboard(h.ring); h.ring.visible=te>=h.t&&p<1; set(h.ring,p,1-p);
    }
    set(rosette,ss(0,0.6,te),0.6*ss(0,0.3,te)*ret); rosette.material.uniforms.uQ.value=last>0?te-last:-1;
    U.uE.value=ss(TH[0],TH[0]+0.3,te)*ret;
    const lq=last>0?te-last:-1, pulse=lq>=0?Math.exp(-lq*5):0;
    cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*pulse+0.08*U.uE.value;
    if(last<0){const fl=HIT.find(h=>te<h.t&&te>=h.t-FLY);
      if(fl){o.g.copy(fl.bolt.position);o.gs=0.45;o.ga=0.25;o.li=1.2;}
      else{o.g.set(CX,0.45,0);o.gs=1.2*ss(0,0.5,te);o.ga=0.18*ss(0,0.3,te);o.li=1.5*ss(0,0.4,te);}}
    else{const h=HIT.find(x=>x.t===last);o.g.copy(h.l.hp);o.gs=0.8+1.2*Math.min(lq,0.4);o.ga=0.45*pulse+0.08;o.li=4*pulse+1*U.uE.value;}
    o.ia=last>0?lq:te-TH[0]; o.c.copy(last>0?HIT.find(x=>x.t===last).l.hp:HIT[0].l.hp); o.shake=0; o.dist=0.3; o.flash=0;
  };
}},0.5);

// =====================================================================
// 2 · BIDENS — el Axie está maldito (cadenas, miasma, sellos); dos aquenios de Bidens salen disparados de la espalda,
//     sus ganchos arrastran los males y un destello blanco purifica
// =====================================================================
const peBidens=tempo({key:"peBidens",name:"Bidens",dur:2.8,ti:0.95,pal:"Pureza",
  phases:[["Maldición",0],["Tensión",0.5],["Disparo",0.85],["Purificación",0.95],["Calma",1.6]],
build(a){
  const L=a.L,TT=0.5,TS=0.85,TI=0.95,TF=1.75,PUR="vec3(.5,.16,.8)";
  const DIR=[V3(-0.38,1,0.3).normalize(),V3(0.5,1,-0.25).normalize()], DMAX=[2.3,2.5];
  const dist=(te,i)=>{const k=Math.max(te-TS,0);return 0.12*ss(TT,TS,te)+DMAX[i]*(1-Math.exp(-k*3.2));};
  // --- males visibles: dos cadenas inclinadas que ciñen el cuerpo (eslabones por celda, mezcla normal)
  const chainFS=`void main(){float u=vUv.x*22.;float cell=floor(u);vec2 q=vec2(fract(u)-.5,vUv.y-.5);
   float odd=mod(cell,2.);
   float ring=odd<.5?band(length(q*vec2(1.,1.5)),.33,.07):smoothstep(.09,.05,abs(q.y))*step(abs(q.x),.48);
   float n=noise(vec3(vUv.x*30.,vUv.y*4.,1.));
   if(n<uP*1.2-.1)discard;                                   // se parte y se deshace al tirar los ganchos
   float edge=smoothstep(.12,0.,n-(uP*1.2-.1))*step(.01,uP);
   gl_FragColor=vec4(mix(vec3(.08,.03,.12),${PUR}*1.3,ring*.5+edge)+vec3(edge),ring*uA*.95);}`;
  const chains=[[0.62,0.36,0.22],[1.12,-0.3,-0.26]].map(([y,rx,rz])=>{
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.15,48,1,true),fx(chainFS,NB));
    m.position.set(CX,y,0); m.rotation.set(rx,0,rz); L.mesh.add(m); return m;});
  // sellos de maldición: flecha rota hacia abajo dentro de un círculo, en billboard alrededor de la cabeza
  const seals=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.42),fx(`
   void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
    float m=band(r,.82,.07)+smoothstep(.08,.03,abs(p.x))*step(-.15,p.y)*step(p.y,.55)*step(.1,abs(p.y-.2));
    m+=smoothstep(.08,.03,abs(p.y+.15-abs(p.x)*.9-(-.25)))*step(abs(p.x),.42)*step(p.y,.1);
    gl_FragColor=vec4(${PUR}*1.6+vec3(.3,.1,.4)*m,(min(m,1.)+smoothstep(1.,0.,r)*.15)*uA);}`,{depthTest:false}));
    m.userData.ph=i*2.094; L.mesh.add(m); return m;});
  // --- aquenios: cuerpo fino con estrías + dos aristas con ganchos en la punta (madera clara, opaca)
  const seedFS=`${LIT}void main(){float h=vP.y;
   float rib=.5+.5*cos(atan(vP.z,vP.x)*4.);float n=noise(vec3(vP.y*40.,atan(vP.z,vP.x)*3.,0.));
   vec3 c=mix(vec3(.2,.12,.06),vec3(.5,.34,.18),rib*.6+n*.4)*lit()+vec3(1.)*fres(2.)*.5+uC1*uP*fres(1.5)*1.5;
   gl_FragColor=vec4(c,1.);}`;
  const seeds=DIR.map((d,i)=>{
    const g=new THREE.Group(), mat=fx(seedFS,SOLID);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.045,0.95,8).translate(0,0.47,0),mat); g.add(shaft);
    for(const s of [-1,1]){const aw=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.017,0.34,6).translate(0,0.17,0),mat);
      aw.position.set(0,0.92,0); aw.rotation.z=s*0.32; g.add(aw);
      // gancho: espolón corto hacia atrás en la punta de cada arista
      const hk=new THREE.Mesh(new THREE.ConeGeometry(0.012,0.09,5).translate(0,-0.045,0),mat);
      hk.position.set(-s*0.11,1.24,0); hk.rotation.z=s*2.6; g.add(hk);}
    g.quaternion.setFromUnitVectors(V3(0,1,0),d);
    // estela blanca: cono abierto detrás de la semilla, se estira con el recorrido
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.0,1,8,1,true).translate(0,-0.5,0),fx(`
     void main(){float l=vUv.y;gl_FragColor=vec4(mix(uC2,vec3(1.),.7)*1.6,pow(l,1.5)*uA);}`));
    st.quaternion.copy(g.quaternion);
    L.mesh.add(g); L.trail.add(st); return {g,mat,st,d,i};});
  // --- purificación: destello blanco en billboard, anillos y círculo limpio en el suelo
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
   vec2 q=abs(p);float ray=smoothstep(.06,0.,q.x*q.y*5.+min(q.x,q.y)*.8)*smoothstep(1.,.1,r);
   gl_FragColor=vec4(vec3(1.)*1.6,(pow(max(0.,1.-r),2.2)+ray*.8)*uA);}`,{depthTest:false}));
  const rings=[0,0.1].map(d=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(3,3),fx(RING_FS,{depthTest:false}));m.userData.d=d;return m;});
  L.mesh.add(flash,...rings);
  const clean=gp(2.8,CX,0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.015)+band(r,.78,.01)+pow(abs(cos(an*4.+uT*.2)),40.)*smoothstep(.9,.3,r)*step(.25,r);
   m+=band(r,.25+.05*cos(an*8.),.02);
   float fill=smoothstep(.9,0.,r)*.18*uP;
   gl_FragColor=vec4(mix(uC2,vec3(1.),.6+.4*uP)*1.3,(m+fill)*uA);}`));
  const curse=gp(2.2,CX,0,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,uT*.4))*.6+noise(vec3(p*17.,1.))*.4;float e=r+(n-.5)*.5;
   gl_FragColor=vec4(${PUR}*.35,smoothstep(.9,.3,e)*.7*uA);}`,NB));
  const shock=gp(4,CX,0,0.03,fx(RING_FS));
  L.decal.add(curse,clean,shock);

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};`;
  const smokeP=SMOKE_FS(`${PUR}*.45`);
  // miasma morado en bucle alrededor del cuerpo hasta el disparo
  a.count+=points(L.part,50,C+`void main(){float life=.9+aSeed.y*.5;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*1.2;float rad=.45+.25*r.y;
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.1+r.z*1.5+age*.5,sin(an)*rad);
   float born=uT-age*life;
   vA=(born<TS)?sin(age*3.14159)*.5*(1.-smoothstep(TS,TS+.15,uT)):0.;put(p,(.28+.2*r.z)*(.7+age*.5));}`,smokeP,NB);
  // jirones de mal arrastrados por cada gancho: humo morado que sigue la trayectoria con retraso y se deshace
  DIR.forEach((d,i)=>{
    const D=v3(d);
    a.count+=points(L.part,45,C+`void main(){float s=TS+aSeed.x*.45;float t=max(uT-s,0.);float life=.6+aSeed.y*.4;float age=(uT-s)/life;
     float dd=.12+${f(DMAX[i])}*(1.-exp(-(s-TS)*3.2))*.9;
     vec3 p=${v3(CB)}+${D}*dd+rnd()*(.12+.5*t)+vec3(0.,.3*t,0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.65:0.;put(p,(.2+.2*aSeed.z)*(.6+age));}`,smokeP,NB);
    a.count+=points(L.part,40,C+`void main(){float s=TS+aSeed.x*.5;float t=max(uT-s,0.);float life=.35+aSeed.y*.3;float age=(uT-s)/life;
     float dd=.12+${f(DMAX[i])}*(1.-exp(-(s-TS)*3.2));
     vec3 p=${v3(CB)}+${D}*dd+rnd()*(.03+.35*t);
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.05*aSeed.w)*(1.-age*.5));}`);
  });
  // eslabones rotos: esquirlas moradas
  a.count+=points(L.part,55,C+`void main(){float s=TS+.02+aSeed.x*.1;float life=.6+aSeed.y*.35;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;float y=aSeed.w>.5?1.12:.62;
   vec3 v=vec3(cos(an)*(1.1+1.4*aSeed.y),.8+1.8*aSeed.w,sin(an)*(1.1+1.4*aSeed.y));
   vec3 p=vec3(${f(CX)}+cos(an)*.5,y,sin(an)*.5)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.045+.04*aSeed.z);}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.6+q.y;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
    gl_FragColor=vec4(mix(vec3(.12,.05,.18),${PUR},.5+.5*vMix),a);}`,NB);
  // destellos blancos purificadores
  a.count+=points(L.part,25,C+`void main(){float s=TI+aSeed.x*.1;float life=.55+aSeed.y*.4;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.4,0.));vec3 p=${v3(CP)}+d*(.3+1.2*aSeed.z)*(1.-exp(-t*4.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.22+.22*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=sparks(L.part,110,TI,`${f(CB.x)},${f(CB.y)},0.`,"0.,.5,0.",2.5,7,1.5);
  // calma: motas blancas que bajan lentas como vilanos
  a.count+=points(L.part,60,C+`void main(){float life=1.4+aSeed.y;float k=(uT-TI-.2)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(CX)}+(r.x-.5)*1.6,2.2-age*2.,(r.z-.5)*1.6)+vec3(sin(age*6.+r.y*9.)*.15,0.,0.);
   vA=(k>=1.)?sin(age*3.14159)*.7*uE:0.;put(p,.03+.04*r.y);}`);

  const sp=V3(0,0,0), cm=caster.userData.m;
  a.pose=function(te,o){
    const ia=te-TI, ts=te-TS, curseA=1-ss(TS,TI+0.1,te), calm=ss(TI,TI+0.3,te)*(1-ss(2.2,2.75,te));
    const trem=te<TS?0.04*ss(TT,TS,te)*Math.sin(te*70):0;
    caster.rotation.z=-0.08*ss(0,TT,te)+trem+(ia>=0?0.1*Math.exp(-ia*6)*Math.sin(ia*25):0)-0.05*ss(TS,TS+0.05,te)+0.05*ss(TI,TI+0.5,te);
    caster.position.y=-0.04*(1-ss(TS,TI,te))*ss(0,0.4,te);   // encorvado por la maldición, se yergue al purificarse
    chains.forEach((m,i)=>{m.visible=te<TI+0.25;set(m,cl(ts/0.3),ss(0,0.25,te));m.rotation.y=te*(i?-0.6:0.5);});
    seals.forEach(s=>{const an=s.userData.ph+te*1.8;towardCam(s.position,tmp.set(CX+Math.cos(an)*0.55,1.95+0.08*Math.sin(te*3+s.userData.ph),Math.sin(an)*0.55),0);
      billboard(s,Math.sin(te*2+s.userData.ph)*0.3);const k=cl((te-TS)/0.2);s.visible=k<1;s.scale.setScalar(1+k*1.5);s.material.uniforms.uA.value=ss(0,0.3,te)*(1-k);});
    for(const s of seeds){
      const d=dist(te,s.i), on=ss(TT-0.1,TT+0.15,te), fade=1-ss(TF-0.4,TF,te);
      sp.copy(CB).addScaledVector(s.d,d); s.g.position.copy(sp);
      s.g.visible=te>=TT-0.1&&te<TF; s.g.scale.setScalar(Math.max(on*fade,0.001)*(te<TS?1+0.03*Math.sin(te*80):1));
      s.mat.uniforms.uP.value=ts>=0?Math.exp(-ts*3):0.4*ss(TT,TS,te);
      s.st.visible=ts>=0&&te<TF; s.st.position.copy(sp); s.st.scale.set(1,Math.max(d-0.1,0.001),1); s.st.material.uniforms.uA.value=fade*(ts<0.6?1:1-cl((ts-0.6)/0.5));
    }
    flash.visible=ia>=0&&ia<0.5; towardCam(flash.position,CB,0.6); billboard(flash,te*0.5); flash.scale.setScalar(0.6+0.9*cl(ia/0.25)); flash.material.uniforms.uA.value=ia>=0?0.8*Math.exp(-ia*7):0;
    for(const r of rings){const k=cl((ia-r.userData.d)/0.5);r.visible=ia>=r.userData.d&&k<1;towardCam(r.position,CB,0.5);billboard(r);set(r,k,1-k);}
    curse.material.uniforms.uA.value=ss(0,0.3,te)*(1-ss(TS,TI+0.2,te));
    set(clean,ss(TI,TI+0.4,te),ss(TI-0.03,TI+0.05,te)*(1-ss(2.2,2.75,te)));
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=calm;
    // tinte morado de la maldición → blanco al purificar
    if(ia<0){cm.emissive.setRGB(0.5,0.15,0.8);cm.emissiveIntensity=0.25*curseA*(0.7+0.3*Math.sin(te*9));}
    else{cm.emissive.setRGB(1,1,1);cm.emissiveIntensity=1.1*Math.exp(-ia*5)+0.08*calm;}
    if(ia<0){o.g.copy(CB);o.gs=0.85+0.45*ss(TT,TS,te);o.ga=0.12+0.22*ss(TT,TS,te);o.li=1.2+2.2*ss(TT,TS,te);}
    else{o.g.copy(CB);o.gs=2+2.8*Math.min(ia,0.4);o.ga=Math.exp(-ia*6)*0.72+0.06*calm;o.li=9*Math.exp(-ia*4)+1.2*calm;}
    o.ia=ia; o.c.copy(CB); o.shake=0; o.dist=0.7; o.flash=0;
  };
}},0.75);

// =====================================================================
// 3 · DEATH SHROOM — un hongo negro con manchas rojas brota junto al rival, se hincha y revienta;
//     la nube de esporas corre en cruz por las casillas y deja veneno
// =====================================================================
const peDeathShroom=tempo({key:"peDeathShroom",name:"Death Shroom",dur:3.6,ti:1.15,pal:"Toxina",
  phases:[["Brote",0],["Hinchazón",0.55],["Estallido",1.15],["Cruz tóxica",1.35],["Veneno",2.0]],
build(a){
  const L=a.L,TG=0.12,TW=0.55,TI=1.15,TC=1.25,TF=2.9,TE=3.5,MP=V3(TX,0,1.0),XC=V3(TX,0,0),ARM=1.9,SZ=0.82;
  // hongo: sombrero (torno) + pie con anillo; negro opaco, manchas rojas que brillan más cuanto más se hincha (uP)
  const prof=[[0,0.44],[0.2,0.42],[0.37,0.35],[0.5,0.23],[0.58,0.09],[0.56,0.0],[0.42,0.03],[0.14,0.07],[0,0.08]].map(([x,y])=>new THREE.Vector2(x,y));
  const capMat=fx(`${LIT}void main(){vec3 q=normalize(vP-vec3(0.,.05,0.));
   float under=step(vP.y,.075+.04*(1.-length(vP.xz)/.58));
   float n=noise(q*5.3+vec3(3.));float spot=smoothstep(.66,.7,n)+smoothstep(.71,.74,noise(q*9.+vec3(7.)));
   float vein=pow(1.-abs(noise(q*8.)*2.-1.),12.)*uP;
   float gill=under*(.5+.5*sin(atan(vP.z,vP.x)*40.));
   vec3 c=vec3(.035,.025,.04)*lit()*2.+vec3(.25,.2,.3)*fres(3.)*.4;
   c=mix(c,vec3(.95,.05,.08)*(1.+2.*uP)*lit(),min(spot,1.)*(1.-under));
   c+=vec3(.35,.02,.05)*gill*.6+uC1*vein*1.5;
   gl_FragColor=vec4(c,1.);}`,SOLID2);
  const cap=new THREE.Mesh(new THREE.LatheGeometry(prof,40),capMat); cap.position.y=0.66;
  const stalk=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.17,0.72,18,4).translate(0,0.36,0),fx(`${LIT}void main(){
   float n=noise(vP*vec3(20.,4.,20.));float skirt=band(vP.y,.5,.035);
   vec3 c=mix(vec3(.08,.07,.08),vec3(.2,.17,.18),n)*lit()+vec3(.6,.05,.08)*skirt*.6+uC1*uP*fres(2.)*.8;
   gl_FragColor=vec4(c,1.);}`,SOLID));
  const shroom=new THREE.Group(); shroom.add(cap,stalk); shroom.position.copy(MP); L.mesh.add(shroom);
  // estallido: esfera de ruido aditiva + bocanada oscura (mezcla normal)
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(BURST_FS)); burst.position.set(MP.x,0.7,MP.z);
  const puff=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),fx(`void main(){float n=noise(vP*3.+vec3(uT*.8));
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));if(n<uP*1.1-.1)discard;
   gl_FragColor=vec4(mix(vec3(.08,.02,.12),uC2*.5,n),(.55-fr*.35)*(1.-uP)*uA);}`,NB)); puff.position.copy(burst.position);
  L.mesh.add(burst,puff);
  // estelas: cuatro lenguas de niebla tóxica que barren cada brazo de la cruz (planos horizontales a ras de suelo)
  const armFS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*5.-uT*2.,v*2.,uT*.7))*.6+noise(vec3(u*11.-uT*3.,v*5.,2.))*.4;
   float front=smoothstep(uP,uP-.25,u)*step(0.,uP);
   float al=smoothstep(.35,.75,n)*smoothstep(1.,.3,v)*front*(1.-u*.35);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,al*uA);}`;
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const arms=DIRS.map(([dx,dz])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(ARM,0.72).translate(ARM/2,0,0).rotateX(-Math.PI/2),fx(armFS));
    m.position.set(XC.x,0.28,XC.z); m.rotation.y=-Math.atan2(dz,dx); L.trail.add(m); return m;});
  // casillas en cruz: se marcan del centro hacia fuera; mancha oscura (normal) + borde y gota de veneno (aditivo)
  const S=5;
  const cellFS=dark=>`void main(){vec2 p=(vUv-.5)*${f(S)};vec2 c=floor(p+.5);vec2 l=p-c;
   float on=step(min(abs(c.x),abs(c.y)),.5)*step(max(abs(c.x),abs(c.y)),2.5);
   float d=abs(c.x)+abs(c.y);float rev=smoothstep(d-.2,d+.3,uP*2.6);
   float n=noise(vec3(p*3.,uT*.5));
   float edge=smoothstep(.06,0.,.46-max(abs(l.x),abs(l.y)));
   float drop=smoothstep(.12,.08,length((l-vec2(0.,-.05))*vec2(1.,.8)))+smoothstep(.06,0.,abs(l.y-.12+abs(l.x)*1.6))*step(l.y,.12)*step(abs(l.x),.08);
   ${dark?`gl_FragColor=vec4(mix(vec3(.05,.02,.07),uC2*.3,n),on*rev*smoothstep(.5,.3,max(abs(l.x),abs(l.y)))*(.45+.2*n)*uA);`
         :`float pulse=.7+.3*sin(uT*5.-d*1.2);gl_FragColor=vec4(mix(uC2,uC1,edge+drop*.6)*1.4,on*rev*(edge*.9+drop*.6*pulse+n*.08)*uA);`}}`;
  const cellsD=gp(S,XC.x,XC.z,0.014,fx(cellFS(true),NB)), cellsG=gp(S,XC.x,XC.z,0.02,fx(cellFS(false)));
  const crack=gp(1.2,MP.x,MP.z,0.024,fx(SOFTBURN_FS)), shock=gp(3.5,MP.x,MP.z,0.03,fx(RING_FS));
  L.decal.add(cellsD,cellsG,crack,shock);

  const C=`const float TI=${f(TI)};const float TC=${f(TC)};const vec3 MP=${v3(MP)};const vec3 XC=${v3(XC)};
  vec3 armDir(float s){float i=floor(s*4.);return i<1.?vec3(1.,0.,0.):(i<2.?vec3(-1.,0.,0.):(i<3.?vec3(0.,0.,1.):vec3(0.,0.,-1.)));}`;
  // tierra que salta al brotar
  a.count+=points(L.part,30,C+`void main(){float s=${f(TG)}+aSeed.x*.2;float life=.45+aSeed.y*.25;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.3+.7*aSeed.w),1.1+aSeed.y*1.1,sin(an)*(.3+.7*aSeed.w));
   vec3 p=MP+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.035*aSeed.w);}`,CHIP_FS);
  // hinchazón: esporas que rezuman del sombrero
  a.count+=points(L.part,40,C+`void main(){float s=${f(TW)}+aSeed.x*(TI-${f(TW)});float life=.4+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.5,0.));vec3 p=MP+vec3(0.,.7,0.)+d*(.37+.33*t);
   vA=(age>0.&&age<1.&&s<TI)?sin(age*3.14159):0.;put(p,.035+.03*aSeed.z);}`);
  // nube en cruz: humo oscuro (normal) que corre por los brazos
  a.count+=points(L.part,130,C+`void main(){vec3 d=armDir(aSeed.x);float s=TI+fract(aSeed.x*4.)*.25;float life=1.1+aSeed.y*.7;float t=max(uT-s,0.);float age=(uT-s)/life;
   float reach=${f(ARM)}*(.1+.95*aSeed.z);vec3 side=vec3(d.z,0.,-d.x)*(aSeed.w-.5)*.7;
   vec3 org=mix(MP,XC,.5);
   vec3 p=org+d*reach*(1.-exp(-t*2.8))+side+vec3(0.,.25+.6*aSeed.y*(1.-exp(-t*2.))+.15*sin(t*3.+aSeed.w*9.),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.62:0.;put(p,(.35+.27*aSeed.w)*(.5+age*.8));}`,SMOKE_FS("mix(vec3(.12,.04,.16),vec3(.1,.22,.08),vMix)"),NB);
  // esporas brillantes dentro de la nube (verde/morado de la paleta)
  a.count+=points(L.part,140,C+`void main(){vec3 d=armDir(aSeed.x);float s=TI+fract(aSeed.x*4.)*.3;float life=.9+aSeed.y*.9;float t=max(uT-s,0.);float age=(uT-s)/life;
   float reach=${f(ARM)}*(.05+aSeed.z);vec3 side=vec3(d.z,0.,-d.x)*(aSeed.w-.5)*.8;
   vec3 p=mix(MP,XC,.5)+d*reach*(1.-exp(-t*3.))+side+vec3(sin(t*4.+aSeed.y*9.)*.08,.15+aSeed.y*1.1+t*.2,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*20.+aSeed.z*40.)):0.;put(p,.03+.03*aSeed.w);}`);
  a.count+=sparks(L.part,80,TI,`${f(MP.x)},.62,${f(MP.z)}`,"0.,.6,0.",2.5,6.5,2.5);
  // veneno en el rival: burbujas que suben y revientan en bucle
  a.count+=points(L.part,60,C+`void main(){float life=.7+aSeed.y*.5;float k=(uT-TC)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=XC+vec3(cos(an)*.5,.2+r.y*1.5+age*.5,sin(an)*.5);
   vA=(k>=1.)?smoothstep(0.,.15,age)*(1.-smoothstep(.85,1.,age))*uE:0.;put(p,(.07+.08*r.z)*(.6+age));}`,BUBBLE_FS);
  a.count+=points(L.part,40,C+`void main(){float life=.6+aSeed.y*.4;float per=life+.4;float k=(uT-TC)/per+aSeed.x;float c=floor(k);float t=fract(k)*per;vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=XC+vec3(cos(an)*.46,.5+r.y*1.1-4.*t*t,sin(an)*.46);
   vA=(k>=1.&&t<life&&p.y>.03)?.9*uE:0.;put(p,.035+.03*r.z);}`);

  a.pose=function(te,o){
    const ia=te-TI, gk=cl((te-TG)/(TW-TG)), sw=ss(TW,TI,te), beat=Math.pow(0.5+0.5*Math.sin(te*(14+20*sw)),3);
    const pois=ss(TC,TC+0.3,te)*(1-ss(TF,TE,te));
    caster.rotation.z=0.12*ss(0,0.15,te)-0.12*ss(0.2,0.5,te);
    shroom.visible=te<TI; const gy=gk<1?1-Math.pow(1-gk,3)*Math.cos(gk*8):1;
    const bulge=1+0.3*sw+0.08*sw*beat;
    shroom.scale.set(Math.max(SZ*gy*bulge,0.001),Math.max(SZ*gy*(1+0.08*sw),0.001),Math.max(SZ*gy*bulge,0.001));
    cap.scale.set(1+0.12*sw*beat,1+0.06*sw*beat,1+0.12*sw*beat); shroom.rotation.z=0.06*Math.sin(te*5)*(1-gk*0.5);
    capMat.uniforms.uP.value=sw*(0.6+0.4*beat); stalk.material.uniforms.uP.value=sw;
    let p=cl(ia/0.5); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.05*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.8); puff.visible=ia>=0&&p<1; puff.scale.setScalar(0.4+1.0*(1-Math.pow(1-p,2))); set(puff,p,0.85);
    const reach=1-Math.exp(-Math.max(te-TI-0.05,0)*2.6);
    for(const m of arms){m.visible=ia>=0&&te<TE; set(m,ia>=0?reach*1.05:-1,(1-ss(TF-0.4,TE,te))*0.9);}
    set(cellsD,ia>=0?reach:0,pois); set(cellsG,ia>=0?reach:0,pois);
    crack.material.uniforms.uA.value=ia>=0?0.8*(1-ss(TI+0.8,TE,te)):0;
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=pois;
    const hit=hitK(ia,5); target.position.x=TX+hit*0.16; target.rotation.z=-hit*0.16*Math.cos(ia*14)+0.04*Math.sin(te*3)*pois;
    if(ia<0){o.g.set(MP.x,0.66*gy,MP.z);o.gs=0.65+0.6*sw;o.ga=0.1+0.26*sw*beat;o.li=0.8+3*sw*beat;}
    else{o.g.set(MP.x,0.6,MP.z*0.5);o.gs=1.6+3.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.6+0.08*pois;o.li=8*Math.exp(-ia*4)+1.5*pois;}
    o.ia=ia; o.c.set(MP.x,0.6,MP.z); o.shake=0; o.dist=0.7;
    o.em=pois*(0.2+0.15*Math.sin(te*6)); o.emc.copy(U.uC1.value);
  };
}},0.65);

// =====================================================================
// 4 · FOREST HERO — un dosel de roble se abre sobre el Axie; rayos de sol filtrado caen entre las ramas,
//     un torbellino de hojas de roble sube y se asienta como manto heroico verde esmeralda
//     (nivel 3: escala mayor, más hojas y la baldosa energética se fractura bajo el Axie al asentarse el manto)
// =====================================================================
const peForestHero={key:"peForestHero",name:"Forest Hero",dur:3.5,ti:1.0,pal:"Esmeralda",
  phases:[["Dosel",0],["Torbellino",0.45],["Manto",1.0],["Heroico",1.4],["Fin",2.85]],
build(a){
  const L=a.L,TW=0.45,TI=1.0,TE=2.85,TF=3.4,CY=4.1,SUN="vec3(1.,.84,.5)";
  // dosel: silueta de ramas y racimos de hojas en billboard (mezcla normal) con huecos por donde entra el sol
  const SDF=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
  const CAN=`float canopy(vec2 p){float br=1.;
    br=min(br,sdSeg(p,vec2(-2.6,.15),vec2(-.6,.3))-.07);br=min(br,sdSeg(p,vec2(-.6,.3),vec2(.9,.55))-.05);
    br=min(br,sdSeg(p,vec2(.9,.55),vec2(2.6,.2))-.06);br=min(br,sdSeg(p,vec2(-1.4,.22),vec2(-.9,-.4))-.035);
    br=min(br,sdSeg(p,vec2(.3,.45),vec2(.6,-.25))-.03);br=min(br,sdSeg(p,vec2(1.6,.4),vec2(1.9,-.3))-.03);
    float lv=noise(vec3(p*3.2,1.))*.6+noise(vec3(p*7.,3.))*.4;
    float cl=smoothstep(.42,.5,lv+.25-abs(p.y-.25)*.55+.12*sin(uT*.8+p.x));
    return max(smoothstep(.02,-.02,br),cl);}`;
  const canopyM=new THREE.Mesh(new THREE.PlaneGeometry(5.6,2.2),fx(SDF+CAN+`
  void main(){vec2 p=(vUv-.5)*vec2(5.6,2.2);float m=canopy(p);
   float side=smoothstep(2.8,2.1,abs(p.x))*smoothstep(1.1,.6,abs(p.y-.05));
   float n=noise(vec3(p*9.,2.));
   gl_FragColor=vec4(mix(vec3(.04,.07,.03),vec3(.1,.2,.06),n),m*side*.92*uA);}`,NB));
  // halo de sol tras el dosel: solo se ve en los huecos
  const sunM=new THREE.Mesh(new THREE.PlaneGeometry(5.6,2.2),fx(SDF+CAN+`
  void main(){vec2 p=(vUv-.5)*vec2(5.6,2.2);float m=canopy(p);
   float g=pow(max(0.,1.-length((p-vec2(-.4,.3))*vec2(.45,.9))),2.);
   gl_FragColor=vec4(mix(${SUN},uC1,.25)*1.4,(1.-m)*g*uA);}`));
  L.mesh.add(sunM,canopyM); canopyM.renderOrder=2; canopyM.scale.setScalar(1.3); sunM.scale.setScalar(1.3);
  // rayos de sol: conos abiertos inclinados; núcleo brillante y polvo que baja por dentro
  const rayFS=`void main(){float h=vP.y/4.4+.5;float c=pow(abs(dot(normalize(vN),normalize(vV))),2.);
   float n=noise(vec3(vP.x*6.,vP.y*2.+uT*.9,vP.z*6.));
   float al=c*(.45+.55*n)*smoothstep(0.,.25,h)*smoothstep(1.,.8,h)*uA;
   gl_FragColor=vec4(mix(${SUN},uC1,.2+.2*n)*1.3,al*.55);}`;
  const RAYS=[[-0.55,0.15,0.34,0.32,1],[0.05,-0.3,0.3,0.42,0.8],[-1.1,0.5,0.4,0.26,0.6],[0.55,0.35,0.27,0.22,0.55]];
  const rays=RAYS.map(([dx,dz,tilt,w,k])=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(w*0.75,w*1.3,4.4,20,1,true),fx(rayFS));
    m.position.set(CX+dx*1.25,2.0,dz*1.25); m.rotation.set(0.08*dz,0,tilt); m.userData.k=k; L.trail.add(m); return m;});
  // manto de hojas: segmento de cono a la espalda; escamas de roble en filas alternas que se cubren de arriba abajo
  const cape=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.88,1.45,32,8,true,1.5*Math.PI-1.15,2.3),fx(`
  void main(){vec2 g=vec2(vUv.x*9.,(1.-vUv.y)*6.);float row=floor(g.y);g.x+=mod(row,2.)*.5;vec2 l=fract(g)-vec2(.5,.35);
   float y=l.y*2.4;float w=.42*sqrt(max(0.,1.-y*y))*(1.-.45*pow(abs(sin(y*6.)),1.4));
   float leaf=smoothstep(w,w-.06,abs(l.x))*step(abs(y),1.);
   float rib=smoothstep(.03,0.,abs(l.x))*leaf;
   float id=hash(vec3(floor(g),1.));
   float rev=smoothstep(row/6.-.05,row/6.+.1,uP*1.15);
   float n=noise(vec3(vUv*vec2(10.,4.),uT*.5));
   float hem=smoothstep(.0,.12,vUv.y+n*.05);
   vec3 c=mix(uC2*.55,uC2*1.1+uC1*.25,id)*(.75+.35*n)+uC1*rib*.6+${SUN}*.25*smoothstep(.6,.9,n);
   gl_FragColor=vec4(c,max(leaf,.25)*rev*hem*.92*uA);}`,NB));
  cape.position.set(CX,1.0,0);
  // aura heroica: vetas verdes que suben por un cilindro, más una corona de luz en la cabeza
  const aura=new THREE.Mesh(new THREE.CylinderGeometry(0.74,0.86,2.9,40,1,true),fx(`
  void main(){float h=vP.y/2.9+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*3.,h*4.-uT*2.,uT*.3))*.6+noise(vec3(an*8.,h*9.-uT*3.4,2.))*.4;
   float st=smoothstep(.55,.85,n);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3,(st*.55+fr*.3)*pow(1.-h,1.2)*uA);}`)); aura.position.set(CX,1.45,0);
  L.mesh.add(cape,aura);
  // suelo: luz moteada (sombras de hojas) + anillo de roble
  const dapple=gp(5.2,CX,0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.+vec2(uT*.15,0.),uT*.25))*.65+noise(vec3(p*15.,uT*.4))*.35;
   float spot=smoothstep(.6,.68,n)*smoothstep(1.,.3,r);
   float ring=band(r,.82,.012)+band(r,.7,.008);
   float an=atan(p.y,p.x);float lobes=band(r,.76+.03*cos(an*14.),.012);
   gl_FragColor=vec4(mix(${SUN},uC1,.3)*1.2*spot+uC1*(ring+lobes),(spot*.55+(ring+lobes)*uP)*uA);}`));
  const shock=gp(7.5,CX,0,0.03,fx(RING_FS));
  // fractura de baldosa energética bajo el Axie: se agrieta cuando el manto se asienta
  const FR=4.2, frac=gp(FR,CX,0,0.025,fx(tileFractureFS(FR)));
  L.decal.add(dapple,shock,frac);

  const C=`const float TW=${f(TW)};const float TI=${f(TI)};const float TE=${f(TE)};`;
  const OAK=leafFS(1,0,"mix(uC2*1.1,mix(uC1,vec3(.95,.75,.3),step(.82,vMix)),.35+.4*vMix)");
  // torbellino: hojas que suben en hélice cerrándose y se asientan en el manto (espalda, -x)
  a.count+=points(L.part,380,C+`varying float vR;void main(){float s=TW-.15+aSeed.x*.45;float t=max(uT-s,0.);
   float k=clamp(t/(TI+.15-s),0.,1.);float an=aSeed.z*6.2832+k*7.;float rad=mix(2.1,.65,k);
   vec3 sw=vec3(${f(CX)}+cos(an)*rad,.05+k*(1.7+aSeed.y*1.6),sin(an)*rad);
   float u=clamp((uT-TI-.15+aSeed.y*.2)/.45,0.,1.);
   float ca=1.5*3.14159+(aSeed.w-.5)*2.;vec3 cp=vec3(${f(CX)}+sin(ca)*.62,.5+aSeed.y*1.3,cos(ca)*.62);
   vec3 p=mix(sw,cp,u*u*(3.-2.*u));
   vR=aSeed.w*6.28+t*(4.+aSeed.y*5.)*(1.-u);
   vA=(uT>s)?smoothstep(0.,.1,t)*(1.-smoothstep(.75,1.,u)):0.;put(p,(.27+.14*aSeed.w)*(1.-u*.4));}`,OAK,NB);
  // estado heroico: unas pocas hojas siguen girando alrededor
  a.count+=points(L.part,90,C+`varying float vR;void main(){float life=1.6+aSeed.y;float k=(uT-TI-.3)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*3.;vec3 p=vec3(${f(CX)}+cos(an)*(.9+.45*r.y),.2+age*2.8,sin(an)*(.9+.45*r.y));
   vR=r.z*6.28+age*8.;vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.2+.08*r.z);}`,OAK,NB);
  // motas de polvo dorado que flotan dentro de los rayos
  a.count+=points(L.part,260,C+`void main(){float i=floor(aSeed.x*4.);
   vec3 top=i<1.?vec3(-.69-.75,4.,.19):(i<2.?vec3(.06-.7,4.,-.375):(i<3.?vec3(-1.375-.85,4.,.625):vec3(.69-.6,4.,.44)));
   vec3 bot=i<1.?vec3(-.69+.7,0.,.19):(i<2.?vec3(.06+.63,0.,-.375):(i<3.?vec3(-1.375+.85,0.,.625):vec3(.69+.6,0.,.44)));
   float life=2.2+aSeed.y;float k=uT/life+aSeed.z;float age=fract(k);vec3 r=rr(floor(k)+i);
   vec3 p=mix(top,bot,.15+.8*age)+vec3(${f(CX)},0.,0.)+(r-.5)*.4+vec3(sin(uT*1.3+aSeed.w*9.)*.06,0.,0.);
   float tw=.5+.5*sin(uT*(3.+aSeed.w*5.)+aSeed.y*30.);
   vA=sin(age*3.14159)*tw*uE;put(p,.025+.035*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
   void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(${SUN},vec3(1.),smoothstep(.2,0.,d))*1.5,a);}`);
  // destellos de sol al cerrarse el manto
  a.count+=points(L.part,55,C+`void main(){float s=TI+aSeed.x*.2;float life=.7+aSeed.y*.6;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=${v3(CP)}+d*(.6+1.9*aSeed.z)*(1.-exp(-t*3.));
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.36+.3*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  a.count+=sparks(L.part,280,TI,`${f(CX)},.2,0.`,"0.,1.3,0.",4,11,2);

  const cm=caster.userData.m;
  a.pose=function(te,o){
    const ia=te-TI, open=ss(0,TW,te)*(1-ss(TE,TF,te)), env=ss(TI,TI+0.35,te)*(1-ss(TE,TF,te)), wh=ss(TW,TW+0.2,te)*(1-ss(TI+0.1,TI+0.5,te));
    caster.rotation.z=0.1*ss(0,TW,te)-0.12*ss(TI,TI+0.15,te)+0.02*Math.sin(te*2)*env;
    const grow=1+0.12*env; caster.scale.set(grow,grow,grow);
    towardCam(canopyM.position,tmp.set(CX+0.2,CY+0.35*(1-open),-0.5),0); billboard(canopyM);
    sunM.position.copy(canopyM.position).addScaledVector(tmp2.set(0,0,-1),0.02); billboard(sunM);
    canopyM.material.uniforms.uA.value=open; sunM.material.uniforms.uA.value=open*(0.7+0.3*ss(TW,TI,te));
    for(const r of rays){r.visible=open>0.01;r.material.uniforms.uA.value=1.15*open*r.userData.k*(0.55+0.45*ss(TW,TI,te))*(1+0.8*hitK(ia,3));}
    cape.visible=ia>-0.05&&env>0.001; cape.scale.set(grow,grow*(0.6+0.4*ss(TI,TI+0.4,te)),grow); cape.position.y=1.0*grow+0.03*Math.sin(te*2.3);
    set(cape,cl((te-TI+0.05)/0.5),ss(TI-0.05,TI+0.1,te)*(1-ss(TE,TF,te)));
    aura.scale.set(grow,grow,grow); aura.material.uniforms.uA.value=env*(0.7+0.3*Math.sin(te*4))+0.5*wh;
    set(dapple,env,open);
    let p=cl(ia/0.7); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    // fractura: avanza en ~0,55 s tras el asentamiento; las grietas quedan como brasas que se apagan
    set(frac,ia>=0?1-Math.pow(1-cl(ia/0.55),2):0,ia>=0?(0.45+0.75*Math.exp(-ia*2.2))*(1-ss(TE,TF,te)):0);
    U.uE.value=Math.max(env,open*0.6);
    cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=1.4*hitK(ia,4)+0.26*env*(0.8+0.2*Math.sin(te*5))+0.18*wh;
    if(te<TI){o.g.set(CX,1.3+1.8*(1-open),0);o.gs=1.5+1.3*wh;o.ga=0.3*open+0.25*wh;o.li=2.5+4*wh;}
    else{o.g.copy(CP);o.gs=3+4*Math.min(ia,0.4);o.ga=Math.exp(-ia*6)*0.9+0.14*env;o.li=14*Math.exp(-ia*3.5)+3*env;}
    o.ia=ia; o.c.copy(CP); o.shake=1.4; o.dist=1.1; o.flash=0;   // temblor moderado al asentarse el manto
  };
}};

// =====================================================================
// 5 · MINT — estallido de hojas de menta cristalizadas; se clavan sobre el Axie y los aliados adyacentes
//     y forman corazas facetadas de hielo-menta, gruesas (capa interior + caparazón + aristas brillantes)
// =====================================================================
const peMint=tempo({key:"peMint",name:"Mint",dur:3.6,ti:0.8,pal:"Menta",allies:2,
  phases:[["Escarcha",0],["Explosión",0.8],["Corazas",1.05],["Brillo",1.7],["Deshielo",2.85]],
build(a){
  const L=a.L,TI=0.8,TS=1.05,TSF=1.55,TD=2.85,TE=3.4;
  const BEAR=[V3(CX,0,0),ALLY_POS[0].clone(),ALLY_POS[1].clone()], SY=0.98;
  const BC=BEAR.map(b=>b.clone().add(V3(0,SY,0)));
  // coraza: icosaedro subdividido con normal de faceta por derivadas; se cristaliza de abajo arriba (uP) y se funde (uQ)
  const FAC=`vec3 fn=normalize(cross(dFdx(vP),dFdy(vP)));float fid=hash(floor(fn*6.)+3.);float hN=vP.y*.5+.5;`;
  const shellFS=`uniform float uQ;void main(){${FAC}
   float grow=step(hN,uP*1.25-fid*.2);float melt=step(uQ*1.3-fid*.3,1.-hN);
   float n=noise(vP*5.)*.6+noise(vP*13.)*.4;
   float vein=pow(1.-abs(noise(vP*vec3(3.,6.,3.))*2.-1.),10.);
   vec3 c=mix(vec3(.78,.97,.93),uC2*.9,.35+.3*fid)+vec3(1.)*smoothstep(.6,.8,n)*.15;
   gl_FragColor=vec4(c,(.28+.18*fid+.15*smoothstep(.55,.8,n)+vein*.15)*grow*melt*uA);}`;
  const glintFS=`uniform float uQ;uniform float uH;void main(){${FAC}
   float grow=step(hN,uP*1.25-fid*.2);float front=smoothstep(.1,0.,abs(hN-(uP*1.25-fid*.2)))*step(uP,.99);
   float melt=step(uQ*1.3-fid*.3,1.-hN);
   float edge=clamp(length(fwidth(fn))*7.,0.,1.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float sheen=smoothstep(.12,0.,abs(dot(fn,normalize(vec3(.6,1.,.3)))-fract(uT*.35+uH)*2.+1.));
   gl_FragColor=vec4(mix(uC2,uC1,edge+fr)*1.4+vec3(1.)*(sheen+front)*.6,(edge*.9+fr*.35+sheen*.5+front*1.5)*grow*melt*uA);}`;
  const geo=new THREE.IcosahedronGeometry(1,1);
  const shields=BC.map((c,i)=>{const g=new THREE.Group();g.position.copy(c);g.scale.set(0.74,1.04,0.74);
    const inner=new THREE.Mesh(geo,fxU(glintFS,{uQ:{value:0},uH:{value:i*0.31}})); inner.scale.setScalar(0.86);
    const shell=new THREE.Mesh(geo,fxU(shellFS,{uQ:{value:0}},NB));
    const gl=new THREE.Mesh(geo,fxU(glintFS,{uQ:{value:0},uH:{value:i*0.31+0.5}})); gl.scale.setScalar(1.015);
    shell.renderOrder=1; gl.renderOrder=2; g.add(inner,shell,gl); L.mesh.add(g); g.userData={inner,shell,gl,d:i?0.12+0.08*i:0};return g;});
  // hojas de menta cristalizadas: octaedros aplastados (facetas), aditivos con nervio central
  const leafMat=fx(`void main(){vec3 fn=normalize(cross(dFdx(vP),dFdy(vP)));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float rib=smoothstep(.12,0.,abs(vP.x));
   gl_FragColor=vec4(mix(uC2,uC1,fr+.3*fn.y)*1.5+vec3(1.)*rib*.5,(.45+.55*fr+rib*.4)*uA);}`);
  const leafGeo=new THREE.OctahedronGeometry(1,0);
  const leaves=[];
  for(let i=0;i<24;i++){
    const b=i<12?0:(i<18?1:2), m=new THREE.Mesh(leafGeo,leafMat), an=hash1(i*1.7)*Math.PI*2, el=hash1(i*2.3)*1.2-0.2;
    const dir=V3(Math.cos(an)*Math.cos(el),Math.sin(el),Math.sin(an)*Math.cos(el));
    const dest=b===0?CP.clone().addScaledVector(dir,1.6+hash1(i)*0.9):BC[b].clone().addScaledVector(V3(dir.x,0,dir.z).normalize(),0.7).add(V3(0,(hash1(i*3)-0.3)*0.9,0));
    m.scale.set(0.055,0.018,0.16); m.userData={b,dir,dest,t0:TI+hash1(i*5)*0.06,sp:V3(hash1(i)*14-7,hash1(i+1)*14-7,hash1(i+2)*14-7)};
    leaves.push(m); L.mesh.add(m);}
  // viento helado hacia cada aliado: tubo en arco con vetas que fluyen
  const winds=[1,2].map(b=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(CP,CP.clone().lerp(BC[b],0.5).add(V3(0,1.3,0)),BC[b]),40,0.12,8,false),fx(`
   void main(){float u=vUv.x;float d=uP-u;float n=noise(vec3(u*14.-uT*9.,vUv.y*6.,0.));
    float al=step(0.,d)*exp(-d*3.)*smoothstep(.35,.8,n)*pow(abs(dot(normalize(vN),normalize(vV))),1.2);
    gl_FragColor=vec4(mix(uC2,uC1,n)*1.4,al*uA);}`));L.trail.add(m);return m;});
  // escarcha en el suelo bajo cada portador: helechos de hielo que crecen desde el centro
  const frostFS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float br=0.;for(int i=0;i<3;i++){float k=float(i+1)*6.;float a2=abs(fract(an/6.2832*k+float(i)*.17)-.5)/k*6.2832*r;
    br=max(br,smoothstep(.025,0.,a2)*smoothstep(1.,.2,r)*(1.-float(i)*.25));}
   float fern=smoothstep(.03,0.,abs(fract(r*9.-abs(fract(an/6.2832*6.)-.5)*2.)-.5)-.45)*smoothstep(.9,.3,r)*.4;
   float rim=band(r,.9,.03);float rev=step(r,uP);
   gl_FragColor=vec4(mix(uC2,uC1,br)*1.3,(br+fern+rim*.6+.06)*rev*uA);}`;
  const frosts=BEAR.map(b=>{const m=gp(1.9,b.x,b.z,0.02,fx(frostFS));L.decal.add(m);return m;});
  const shock=gp(4,CX,0,0.03,fx(RING_FS)); L.decal.add(shock);

  const C=`const float TI=${f(TI)};const float TS=${f(TS)};const float TD=${f(TD)};const vec3 CP=${v3(CP)};`;
  // escarcha que converge sobre el Axie durante la carga
  a.count+=points(L.part,70,C+`void main(){float life=.3+aSeed.y*.2;float age=(uT-aSeed.x*(TI-.25))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=CP+d*mix(1.25,.15,age*age);
   vA=(age>0.&&age<1.&&uT<TI)?smoothstep(0.,.3,age):0.;put(p,.035+.04*aSeed.z);}`);
  // explosión: hojitas de menta (sprites) + niebla helada (normal) + chispas
  a.count+=points(L.part,100,C+`varying float vR;void main(){float s=TI+aSeed.x*.08;float life=.6+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=CP+d*(.25+1.9*aSeed.z)*(1.-exp(-t*3.5))+vec3(0.,-.5*t*t,0.);
   vR=aSeed.w*6.28+t*9.;vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.13+.09*aSeed.w)*(1.-age*.3));}`,leafFS(0,1,"mix(uC2,uC1,.4+.5*vMix)*1.3"));
  a.count+=points(L.part,45,C+`void main(){float s=TI+aSeed.x*.15;float life=.9+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()*vec3(1.,.4,1.)+.001);vec3 p=CP+d*(.3+1.2*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,-.6+.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.42:0.;put(p,(.38+.3*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.82,.95,.93)"),NB);
  a.count+=sparks(L.part,100,TI,`${f(CP.x)},${f(CP.y)},0.`,"0.,.3,0.",2.5,7,2);
  // cristalización en cada coraza: chispas y nieve brillante en bucle
  BC.forEach((c,i)=>{a.count+=sparks(L.part,35,TS+(i?0.12+0.08*i:0),`${f(c.x)},${f(c.y+0.85)},${f(c.z)}`,"0.,.8,0.",1.5,4.5,2);});
  a.count+=points(L.part,80,C+`void main(){float b=floor(aSeed.x*3.);vec3 c=b<1.?${v3(BC[0])}:(b<2.?${v3(BC[1])}:${v3(BC[2])});
   float life=.8+aSeed.y*.6;float k=(uT-TS)/life+fract(aSeed.x*3.);float cc=floor(k);float age=fract(k);vec3 r=rr(cc+b*7.);
   vec3 d=normalize(r-.5+.001);vec3 p=c+d*vec3(.78,1.1,.78)*(1.+.15*age);
   vA=(k>=1.)?pow(sin(age*3.14159),3.)*uE:0.;put(p,(.09+.09*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // deshielo: esquirlas que caen y gotas
  a.count+=points(L.part,70,C+`void main(){float b=floor(aSeed.x*3.);vec3 c=b<1.?${v3(BC[0])}:(b<2.?${v3(BC[1])}:${v3(BC[2])});
   float s=TD+aSeed.y*.45;float life=.6+aSeed.z*.4;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()+.001);vec3 p=c+d*vec3(.74,1.02,.74)+vec3(d.x*.5*t,-3.5*t*t,d.z*.5*t);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.045+.035*aSeed.w);}`,CHIP_FS);

  const lp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ch=ss(0,TI,te), env=ss(TS,TS+0.2,te)*(1-ss(TD,TE,te));
    caster.rotation.z=0.1*ch-0.25*ss(TI,TI+0.06,te)+0.15*ss(TI+0.1,TI+0.5,te);
    for(const m of leaves){const u=m.userData,k=cl((te-u.t0)/(u.b===0?0.6:TS+0.08*u.b-u.t0));
      m.visible=te>=u.t0&&(u.b===0?k<1:k<1);
      if(u.b===0){lp.copy(CP).lerp(u.dest,1-Math.pow(1-k,2.5));m.scale.set(0.07*(1-k),0.022*(1-k),0.2*(1-k)+0.001);}
      else{lp.copy(CP).lerp(u.dest,k);lp.y+=1.2*4*k*(1-k);m.scale.set(0.07,0.022,0.2);}
      m.position.copy(lp); m.rotation.set(u.sp.x*k,u.sp.y*k,u.sp.z*k);}
    leafMat.uniforms.uA.value=1;
    shields.forEach((g,i)=>{const t0=TS+g.userData.d,k=cl((te-t0)/(TSF-TS)),q=cl((te-TD-0.1*i)/(TE-TD-0.2));
      g.visible=te>=t0&&q<1; const pop=1+0.06*hitK(te-t0-(TSF-TS),6);
      g.scale.set(0.74*pop,1.04*pop,0.74*pop);
      for(const m of [g.userData.inner,g.userData.shell,g.userData.gl]){m.material.uniforms.uP.value=k;m.material.uniforms.uQ.value=q;m.material.uniforms.uA.value=m===g.userData.inner?0.3:0.85;}
      if(i>0){const d=allies[i-1].userData.m;d.emissive.copy(U.uC1.value);d.emissiveIntensity=0.15*env+0.7*hitK(te-t0,5);}});
    winds.forEach((w,i)=>{const k=cl((te-TI-0.02)/(TS+0.08*(i+1)-TI));w.visible=ia>=0&&te<TS+0.6;set(w,k*1.1,1-ss(TS,TS+0.5,te));});
    frosts.forEach((m,i)=>set(m,i?ss(TS+0.1*i,TS+0.1*i+0.6,te):Math.max(0.4*ch,ss(TI,TI+0.5,te)),(i?ss(TS,TS+0.2,te):ss(0,0.3,te))*(1-ss(TD+0.2,TE,te))));
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.22*ch*(ia<0?1:0)+0.7*hitK(ia,5)+0.1*env;
    if(ia<0){o.g.copy(CP);o.gs=1.1*ch;o.ga=0.3*ch;o.li=2.2*ch;}
    else if(te<TSF){o.g.copy(CP);o.gs=1.6+2.2*Math.min(ia,0.4);o.ga=Math.exp(-ia*8)*0.65+0.08;o.li=7.5*Math.exp(-ia*5)+1.5;}
    else{o.g.set(-3.5,1.4,-1.0);o.gs=3.2;o.ga=0.06*env;o.li=2.2*env;}
    o.ia=ia; o.c.copy(CP); o.shake=0; o.dist=0.65; o.flash=0;
  };
}},0.65);

// =====================================================================
// 6 · PUMPKIN — una calabaza gigante hueca cae del cielo sobre el Axie y lo encierra; la cara tallada se enciende
//     desde dentro como un farol y unas bandas de hierro remachadas la blindan
// =====================================================================
const pePumpkin=tempo({key:"pePumpkin",name:"Pumpkin",dur:3.7,ti:0.75,pal:"Ámbar",
  phases:[["Sombra",0],["Caída",0.2],["Encierro",0.75],["Blindaje",1.1],["Vigilia",1.6],["Fin",3.05]],
build(a){
  const L=a.L,TF=0.2,TI=0.75,TA=1.1,TO=3.05,TE=3.6,H=1.97,R=0.92,BY=[0.46,1.48],FPH=0.6435,FD=V3(Math.sin(FPH),0,Math.cos(FPH));
  const rad=y=>{const t=Math.acos(1-2*cl(y/H))/Math.PI;return R*Math.pow(Math.sin(Math.PI*t),0.75)*(1-0.06*Math.pow(Math.cos(Math.PI*t),8));};
  // perfil de torno y gajos tallados en los vértices (10 surcos)
  const prof=[];for(let i=0;i<=28;i++){const t=i/28,y=H*(1-Math.cos(Math.PI*t))/2;prof.push(new THREE.Vector2(Math.max(rad(y),0.001)*(i===0||i===28?0.15:1),y+(i===0?0.06:i===28?-0.08:0)));}
  const pg=new THREE.LatheGeometry(prof,80), pa=pg.attributes&&pg.attributes.position;
  if(pa){for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),an=Math.atan2(x,z),k=1-0.075*Math.pow(1-Math.abs(Math.sin(an*5)),5);pa.setX(i,x*k);pa.setZ(i,z*k);}pa.needsUpdate=true;pg.computeVertexNormals();}
  const FACE=`float carve(vec3 p){float an=atan(p.x,p.z)-${f(FPH)};an=mod(an+3.14159,6.28318)-3.14159;
    if(cos(an)<.2)return 0.;vec2 q=vec2(an*1.02,p.y-1.0);vec2 e=vec2(abs(q.x)-.33,q.y-.2);
    float eye=step(-.13,e.y)*step(e.y+abs(e.x)*1.6,.13);
    float nose=step(-.07,q.y)*step(q.y+abs(q.x)*1.7,.07);
    float sm=q.y+.33-.45*q.x*q.x;float mouth=step(-.1,sm)*step(sm,.1)*step(abs(q.x),.52);
    float tooth=step(.5,fract(q.x*4.+.25))*step(abs(q.x),.3);mouth*=1.-tooth*step(.03,sm);            // dientes cuadrados del labio superior
    return max(max(eye,nose),mouth);}`;
  const skin=new THREE.Mesh(pg,fxU(LIT+FACE+`uniform float uQ;uniform float uF;
  void main(){float an=atan(vP.x,vP.z);float groove=pow(1.-abs(sin(an*5.)),6.);
   float n=noise(vP*vec3(9.,3.,9.))*.6+noise(vP*30.)*.4;
   if(n<uQ*1.15-.05)discard;float edge=smoothstep(.1,0.,n-(uQ*1.15-.05))*step(.001,uQ);
   float c=carve(vP);
   vec3 orange=mix(vec3(.85,.36,.05),vec3(1.,.55,.12),n)*(1.-groove*.45);
   orange=mix(orange,vec3(.35,.4,.1),smoothstep(1.74,1.92,vP.y)*.7);
   vec3 col=orange*lit()+vec3(1.,.7,.3)*fres(3.)*.35;
   vec3 fire=mix(uC2,uC1,.5+.5*uF)*(1.6+1.6*uF)+vec3(1.,.9,.6)*uF*.4;
   col=mix(col,mix(vec3(.12,.04,0.),fire,uA),c)+uC1*edge*2.;
   col+=mix(uC2,uC1,.5)*uP*.25*(1.-c);
   gl_FragColor=vec4(col,1.);}`,{uQ:{value:0},uF:{value:0}},SOLID2));
  // tallo + zarcillo enroscado
  const stemMat=fx(LIT+`void main(){float n=noise(vP*vec3(30.,6.,30.));gl_FragColor=vec4(mix(vec3(.18,.22,.07),vec3(.38,.4,.15),n)*lit(),1.);}`,SOLID2);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.11,0.42,8).translate(0,0.21,0),stemMat); stem.position.y=H-0.1; stem.rotation.z=-0.25;
  const curl=[];for(let i=0;i<=24;i++){const t=i/24;curl.push(V3(0.08+0.25*t+0.09*Math.cos(t*14),H+0.18+0.12*Math.sin(t*14),0.09*Math.sin(t*14)*(1-t*0.4)));}
  const tendril=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl),60,0.018,6,false),stemMat);
  // blindaje: bandas de hierro (dos aros y dos flejes laterales) con remaches que se encienden al cerrarse
  const ironMat=fx(LIT+`void main(){float an=atan(vP.x,vP.z);float riv=smoothstep(.55,.4,length(vec2(fract(vUv.x*24.)-.5,(vUv.y-.5)*1.4)));
   vec3 c=vec3(.16,.15,.17)*lit()*1.4+vec3(.75,.8,.9)*fres(4.)*.6+vec3(.5,.48,.45)*riv*lit()+uC1*riv*uP*2.;
   gl_FragColor=vec4(c,1.);}`,SOLID2);
  const bands=BY.map(y=>{const m=new THREE.Mesh(new THREE.TorusGeometry(rad(y)+0.03,0.05,8,64),ironMat);m.rotation.x=Math.PI/2;m.userData={y,v:false};return m;});
  [FPH+Math.PI/2,FPH-Math.PI/2].forEach(ph=>{const m=new THREE.Mesh(new THREE.TorusGeometry(H/2+0.02,0.045,8,64,Math.PI).rotateZ(-Math.PI/2),ironMat);
    m.rotation.y=ph-Math.PI/2; m.userData={y:H/2,v:true}; bands.push(m);});
  const pump=new THREE.Group(), body=new THREE.Group(); body.add(skin,stem,tendril,...bands); pump.add(body); pump.position.x=CX; L.mesh.add(pump);
  // estela de caída: planos cruzados verticales sobre la calabaza
  const tg=new THREE.PlaneGeometry(1.3,1).translate(0,0.5,0), tm=fx(`void main(){float v=vUv.y;float u=abs(vUv.x-.5)*2.;
   float n=noise(vec3(u*3.,v*6.+uT*14.,uT));
   gl_FragColor=vec4(mix(uC1,uC2,v)*1.4,smoothstep(1.,.2,u+(n-.5)*.4)*pow(1.-v,1.5)*uA);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.y=Math.PI/2; trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
  // suelo: sombra que crece antes de la caída, grieta del impacto y charco de luz cálida delante de la cara
  const shadow=gp(2.4,CX,0,0.016,fx(`void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(vec3(.02,.01,0.),smoothstep(uP,uP*.5,r)*.7*uA);}`,NB));
  const crack=gp(2.6,CX,0,0.02,fx(SOFTBURN_FS)), shock=gp(4.5,CX,0,0.03,fx(RING_FS));
  const pool=gp(2.6,CX+FD.x*1.3,FD.z*1.3,0.022,fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p*vec2(1.,1.25));
   float n=noise(vec3(p*3.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,.6)*1.2,smoothstep(1.,.1,r)*(.35+.25*n)*uP*uA);}`));
  pool.rotation.y=-FPH; L.decal.add(shadow,crack,shock,pool);

  const FP=CP.clone().add(V3(FD.x*R,0.2,FD.z*R)), C=`const float TI=${f(TI)};const float TO=${f(TO)};const vec3 FP=${v3(FP)};const vec3 FD=${v3(FD)};`;
  // aterrizaje: polvo (normal), semillas y trozos de pulpa, chispas
  a.count+=points(L.part,50,C+`void main(){float s=TI+aSeed.x*.08;float life=.9+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(CX)}+cos(an)*(.9+1.1*(1.-exp(-t*3.))),.12+.3*(1.-exp(-t*2.)),sin(an)*(.9+1.1*(1.-exp(-t*3.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.85:0.;put(p,(.34+.3*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,55,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.35;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.1+1.7*aSeed.w),1.1+1.8*aSeed.y,sin(an)*(1.1+1.7*aSeed.w));
   vec3 p=vec3(${f(CX)}+cos(an)*.9,.2,sin(an)*.9)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.055+.04*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=gl_PointCoord-.5;float d=length(q*vec2(1.,1.8));float a=smoothstep(.36,.28,d)*vA;if(a<.003)discard;
    gl_FragColor=vec4(mix(vec3(.95,.85,.6),vec3(1.,.5,.1),step(.6,vMix)),a);}`,NB);
  a.count+=sparks(L.part,90,TI,`${f(CX)},.1,0.`,"0.,.7,0.",3,7,3);
  // remaches: chispas al cerrarse cada banda
  [0,1,2,3].forEach(i=>{a.count+=sparks(L.part,25,TA+i*0.1,`${f(CX)},${f(i<2?BY[i]:H)},0.`,"0.,.4,1.",1.5,4.5,2.5);});
  // vigilia: llamitas y pavesas que escapan por los ojos y la boca
  a.count+=points(L.part,75,C+`void main(){float life=.7+aSeed.y*.5;float k=(uT-TI-.25)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 sd=normalize(cross(FD,vec3(0.,1.,0.)));vec3 o=FP+sd*(r.x-.5)*.8+vec3(0.,(r.y-.5)*.6,0.);
   vec3 p=o+FD*age*.25+vec3(0.,age*(.6+.6*r.z),0.)+sd*sin(age*6.+r.z*9.)*.05;
   vA=(k>=1.)?sin(age*3.14159)*uE*.8:0.;put(p,(.1+.08*r.z)*(1.-age*.5));}`,FLAME_FS);
  const cm=caster.userData.m;
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TF)/(TI-TF)), env=ss(TI+0.1,TI+0.35,te)*(1-ss(TO,TE,te));
    const fl=0.55+0.25*Math.sin(te*17)*Math.sin(te*6.3)+0.2*Math.sin(te*31);
    const y=ia<0?6.5*(1-k*k):0, sq=hitK(ia,7)*Math.cos(ia*22);
    caster.rotation.z=-0.1*ss(0,TI,te)*(ia<0?1:0);
    pump.visible=te>=TF&&te<TE; pump.position.y=y; body.scale.set(1+0.09*sq,1-0.12*sq,1+0.09*sq); body.rotation.z=ia<0?0.25*(1-k):0.04*hitK(ia,4)*Math.sin(ia*18);
    skin.material.uniforms.uQ.value=cl((te-TO)/(TE-TO-0.1)); skin.material.uniforms.uF.value=fl;
    set(skin,0.3*hitK(ia,3),0.85*ss(TI+0.05,TI+0.3,te));
    bands.forEach((b,i)=>{const t0=TA+i*0.1,bk=cl((te-t0+0.25)/0.25),q=te>=TO;b.visible=te>=t0-0.25&&!q;
      const s=1+0.6*(1-bk)*(1-bk); b.scale.setScalar(s); b.position.y=b.userData.y+(b.userData.v?0:0.6*(1-bk));});
    ironMat.uniforms.uP.value=Math.max(hitK(te-TA-0.3,3),0.25*fl*env);
    trail.visible=te>=TF&&ia<0.15; trail.position.set(CX,y+1.8,0); trail.scale.set(1,Math.max(3*k,0.001),1); billboardY(trail); tm.uniforms.uA.value=ia<0?ss(0,0.3,k):1-cl(ia/0.15);
    set(shadow,1.4*ss(0,TI,te)+0.1,ss(0,0.2,te)*(1-ss(TO,TE,te)));
    crack.material.uniforms.uA.value=ia>=0?0.8-ss(TI+0.5,TO,te)*0.45-ss(TO,TE,te)*0.35:0;
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(pool,fl,0.8*env);
    U.uE.value=env;
    cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.24*env*fl;
    if(ia<0){o.g.set(CX,y+1,0);o.gs=0.85+1.1*k;o.ga=0.16+0.22*k;o.li=0.8+2.2*k;}
    else{o.g.copy(FP).addScaledVector(FD,0.35);o.gs=1.3+2.2*hitK(ia,5)+0.4*fl*env;o.ga=Math.exp(-ia*8)*0.45+0.18*env*fl;o.li=6*Math.exp(-ia*5)+(2.2+1.8*fl)*env;}
    o.ia=ia; o.c.set(CX,0.55,0); o.shake=0; o.dist=0.6; o.flash=0;
  };
}},0.63);

// =====================================================================
// 7 · TURNIP — un nabo gigante se arranca del suelo, vuela en parábola dando vueltas y se estrella en el rival:
//     explosión de tierra moderada (nivel 2: sin cráter ni raíces que rompan el suelo)
// =====================================================================
const peTurnip=tempo({key:"peTurnip",name:"Turnip",dur:2.7,ti:1.0,pal:"Nabo",
  phases:[["Arranque",0],["Vuelo",0.35],["Impacto",1.0],["Tierra",1.15],["Fin",2.0]],
build(a){
  const L=a.L,TL=0.35,TI=1.0,TX0=2.0,TX1=2.55,P0=V3(-2.85,0,0.35),PS=V3(-2.85,0.75,0.35),HP=V3(3.0,1.05,0),PK=V3(0.1,4.6,0.2);
  const bez=(k,out)=>{const u=1-k;return out.set(u*u*PS.x+2*u*k*PK.x+k*k*HP.x,u*u*PS.y+2*u*k*PK.y+k*k*HP.y,u*u*PS.z+2*u*k*PK.z+k*k*HP.z);};
  // nabo: bulbo de torno (morado arriba, blanco abajo, pelillos de raíz) + cuatro hojas
  const prof=[[0,-0.85],[0.03,-0.6],[0.09,-0.42],[0.2,-0.28],[0.3,-0.14],[0.34,0.0],[0.31,0.1],[0.2,0.17],[0.07,0.19],[0,0.2]].map(([x,y])=>new THREE.Vector2(x,y));
  const bulb=new THREE.Mesh(new THREE.LatheGeometry(prof,36),fx(LIT+`void main(){float n=noise(vP*vec3(14.,5.,14.));
   float top=smoothstep(-.12,.08,vP.y+(n-.5)*.08);
   vec3 c=mix(vec3(.94,.92,.86),vec3(.52,.12,.55),top);
   float ring=step(.88,fract(vP.y*14.+n))*(1.-top)*.25;
   float hair=pow(noise(vec3(atan(vP.x,vP.z)*12.,vP.y*3.,1.)),6.)*step(vP.y,-.2)*.5;
   c=c*(1.-ring)*lit()+vec3(1.)*fres(3.)*.25+uC1*hair+uC1*uP*fres(2.)*.8;
   gl_FragColor=vec4(c,1.);}`,SOLID2));
  const leafM=fx(LIT+`void main(){vec2 p=vUv-vec2(.5,0.);float y=vUv.y;float w=.48*sin(3.14159*pow(y,.7))*(1.-.25*abs(sin(y*16.)));
   if(abs(p.x)>w||y<.04)discard;float rib=smoothstep(.04,0.,abs(p.x));
   vec3 c=mix(vec3(.1,.35,.08),vec3(.3,.6,.15),y)*lit()+vec3(.6,.8,.4)*rib*.4;gl_FragColor=vec4(c,1.);}`,SOLID2);
  const turnip=new THREE.Group(), spin=new THREE.Group(); spin.add(bulb); turnip.add(spin);
  for(let i=0;i<4;i++){const lg=new THREE.Group(),l=new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.7).translate(0,0.35,0),leafM);
    l.rotation.x=-0.45-0.15*(i%2); lg.rotation.y=i*Math.PI/2+0.4; lg.position.y=0.17; lg.add(l); spin.add(lg);}
  L.mesh.add(turnip);
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),fx(BURST_FS)); burst.position.copy(HP); L.mesh.add(burst);
  // estela: tubo sobre la parábola; la cabeza es uP y la cola se deshace en polvo
  const PTS=[];for(let i=0;i<=40;i++)PTS.push(bez(i/40,V3(0,0,0)));
  const trailM=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(PTS),80,0.11,8,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;float n=noise(vec3(u*30.-uT*6.,vUv.y*6.,0.));
   float al=step(0.,d)*exp(-d*5.)*smoothstep(.3,.8,n)*pow(abs(dot(normalize(vN),normalize(vV))),1.3)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*6.))*1.4,al);}`)); L.trail.add(trailM);
  // suelo: hoyo de donde se arranca, mancha suave de tierra en el impacto y onda
  const hole=gp(1.1,P0.x,P0.z,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*8.,2.));
   gl_FragColor=vec4(vec3(.06,.04,.03),smoothstep(.8,.4,r+(n-.5)*.3)*.8*uA);}`,NB));
  const scorch=gp(2.0,TX,0,0.02,fx(SOFTBURN_FS)), shock=gp(4.5,TX,0,0.03,fx(RING_FS));
  L.decal.add(hole,scorch,shock);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 PS=${v3(PS)};const vec3 PK=${v3(PK)};const vec3 HP=${v3(HP)};const vec3 P0=${v3(P0)};
  vec3 bez(float k){float u=1.-k;return u*u*PS+2.*u*k*PK+k*k*HP;}`;
  const CLOD=HEAD+`varying float vA;varying float vMix;void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.3+noise(vec3(gl_PointCoord*6.,vMix*9.))*.15;
   float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(vec3(.16,.11,.07),vec3(.36,.26,.17),vMix),a);}`;
  // arranque: terrones que saltan del hoyo
  a.count+=points(L.part,40,C+`void main(){float s=.05+aSeed.x*.3;float life=.45+aSeed.y*.25;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.4+.7*aSeed.w),1.4+aSeed.y*1.1,sin(an)*(.4+.7*aSeed.w));
   vec3 p=P0+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.05+.04*aSeed.w);}`,CLOD,NB);
  // vuelo: tierra que cae del nabo y destellos de la paleta
  a.count+=points(L.part,60,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.5+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 p=bez((s-TL)/(TI-TL))+rnd()*.15+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,CLOD,NB);
  a.count+=points(L.part,60,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.3+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 p=bez((s-TL)/(TI-TL))+rnd()*(.1+.3*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.04*aSeed.w)*(1.-age*.5));}`);
  // impacto: nube de tierra (normal), terrones balísticos, trozos de nabo y chispas
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.12;float life=1.+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()+vec3(-.2,.7,0.));vec3 p=vec3(HP.x+.2,.3,0.)+d*(.3+1.3*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.06,age)*(1.-age)*.75:0.;put(p,(.42+.35*aSeed.w)*(.6+age*.8));}`,SMOKE_FS("vec3(.3,.22,.15)"),NB);
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(-.3,1.,0.))*(2.+2.8*aSeed.z);vec3 p=HP+v*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,CLOD,NB);
  a.count+=points(L.part,35,C+`void main(){float s=TI;float life=.6+aSeed.y*.35;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(-.8,.6,0.))*(1.6+2.2*aSeed.z);vec3 p=HP+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.045*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.4+q.y;
   float a=smoothstep(.5,.42,d)*vA;if(a<.003)discard;gl_FragColor=vec4(mix(vec3(.95,.93,.88),vec3(.55,.15,.6),step(.55,vMix)),a);}`,NB);
  a.count+=sparks(L.part,120,TI,`${f(HP.x)},${f(HP.y)},0.`,"-.4,.5,0.",3,8,3);

  const tp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TL)/(TI-TL)), pull=ss(0,TL,te);
    caster.rotation.z=-0.15*pull+0.4*ss(TL,TL+0.07,te)-0.25*ss(TL+0.1,TL+0.5,te);
    if(te<TL){tp.set(P0.x,-0.55+1.3*pull+0.05*Math.sin(te*40)*(1-pull),P0.z);spin.rotation.set(0,te*2,0.15*Math.sin(te*25));}
    else{bez(k,tp);spin.rotation.set(0,te*3,-(te-TL)*13);}
    turnip.position.copy(tp); turnip.visible=te<TI; turnip.scale.setScalar(1.0);
    set(bulb,ss(TL-0.1,TL,te),1);
    set(trailM,te<TL?0:k,ia<0?1:1-cl(ia/0.3)); trailM.visible=te>=TL&&ia<0.3;
    let p=cl(ia/0.45); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.1*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    hole.material.uniforms.uA.value=ss(0.05,0.3,te)*(1-ss(TX0,TX1,te));
    scorch.material.uniforms.uA.value=ia>=0?0.8*(1-cl(ia/1.3)):0;
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    const hit=hitK(ia,5);
    target.position.x=TX+hit*0.3*(1-Math.exp(-ia*20)); target.rotation.z=-hit*0.26*Math.cos(ia*13);
    if(te<TL){o.g.copy(tp);o.gs=0.65*pull;o.ga=0.2*pull;o.li=1.2*pull;}
    else if(ia<0){o.g.copy(tp);o.gs=1;o.ga=0.3;o.li=2.2;}
    else{o.g.copy(HP);o.gs=1.4+3.5*ia;o.ga=Math.exp(-ia*10)*0.7;o.li=9*Math.exp(-ia*5);}
    o.ia=ia; o.c.copy(HP); o.shake=0; o.dist=0.8;
  };
}},0.75);

// =====================================================================
// 8 · WATERING CAN — una regadera mágica se inclina y vierte agua bendita sobre el Axie; al mojarse brotan hojas,
//     y cuando llegan impactos de agua de fuera, una hoja-escudo se despliega sola en esa dirección y los detiene
// =====================================================================
const peWateringCan=tempo({key:"peWateringCan",name:"Watering Can",dur:3.55,ti:1.95,pal:"Rocío (Espalda)",
  phases:[["Aparición",0],["Riego",0.5],["Brote",1.0],["Impactos",1.65],["Fin",2.95]],
build(a){
  const L=a.L,TA=0.45,TP=0.5,TP1=1.75,TB=1.0,TE=3.0,TF=3.5,PV=V3(-4.55,2.85,0),LT=[0.74,0.27],TH=-0.6;
  const HITS=[[1.95,V3(1.4,3.0,1.6)],[2.4,V3(-7.6,3.1,1.4)]].map(([t,s])=>{const d=s.clone().sub(CP).normalize();return {t,src:s,d,hp:CP.clone().addScaledVector(d,1.08)};});
  const tilt=te=>TH*ss(TP,TP+0.25,te)*(1-ss(TP1,TP1+0.25,te));
  const rose=(te,out)=>{const th=tilt(te),c=Math.cos(th),s=Math.sin(th);return out.set(PV.x+LT[0]*c-LT[1]*s,PV.y+LT[0]*s+LT[1]*c,0);};
  const R0=rose(1,V3(0,0,0));
  // regadera: cobre con verdín y bandas de runas doradas que brillan; todas las piezas cuelgan de un pivote que se inclina
  const metal=fx(LIT+`void main(){float n=noise(vP*12.)*.6+noise(vP*30.)*.4;
   vec3 cu=mix(vec3(.55,.3,.16),vec3(.25,.55,.5),smoothstep(.45,.7,n));
   float rune=step(.6,fract(atan(vP.x,vP.z)*3.+vP.y*2.))*band(abs(vP.y),.17,.025);
   vec3 c=cu*lit()+vec3(.9,.95,1.)*fres(3.)*.4+mix(vec3(1.,.85,.4),uC1,.3)*rune*(1.+uP)*1.5;
   gl_FragColor=vec4(c,1.);}`,SOLID2);
  const can=new THREE.Group(); can.position.copy(PV);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.34,0.5,24),metal);
  const spout=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.06,0.62,10),metal); spout.position.set(0.42,0.05,0); spout.rotation.z=-1.0;
  const head=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.05,0.09,14),metal); head.position.set(0.71,0.24,0); head.rotation.z=-1.0;
  const handle=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.03,8,20,Math.PI),metal); handle.position.set(-0.05,0.25,0);
  const lid=new THREE.Mesh(new THREE.TorusGeometry(0.31,0.03,6,32),metal); lid.position.y=0.25; lid.rotation.x=Math.PI/2;
  can.add(body,spout,head,handle,lid); L.mesh.add(can);
  // chorro: cono abierto desde la alcachofa hasta la cabeza con vetas que caen
  const SL=R0.y-1.7, stream=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.3,SL,18,1,true),fx(`
  void main(){float h=vP.y/${f(SL)}+.5;float an=atan(vP.z,vP.x);
   float n=noise(vec3(an*5.,h*6.+uT*9.,0.))*.6+noise(vec3(an*11.,h*12.+uT*14.,2.))*.4;
   float st=smoothstep(.45,.8,n);float c=pow(abs(dot(normalize(vN),normalize(vV))),.8);
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.3+vec3(1.)*st*.3,(st*.6+.08)*c*smoothstep(0.,.15,h)*uA);}`));
  stream.position.set(R0.x+0.02,(R0.y+1.7)/2,0); L.trail.add(stream);
  // hojas que brotan al mojarse (mismo sombreado opaco de hoja), en corro
  const leafSh=LIT+`void main(){vec2 p=vUv-vec2(.5,0.);float y=vUv.y;float w=.46*sin(3.14159*pow(y,.75));
   if(abs(p.x)>w||y<.02)discard;float rib=smoothstep(.035,0.,abs(p.x));float vein=smoothstep(.03,0.,abs(fract(abs(p.x)*4.-y*2.5)-.5)-.45);
   vec3 c=mix(vec3(.08,.32,.1),vec3(.35,.7,.2),y)*lit()+vec3(.7,.9,.5)*(rib*.4+vein*.1)+uC1*uP*.6*fres(1.);gl_FragColor=vec4(c,1.);}`;
  const sproutMat=fx(leafSh,SOLID2), sprouts=[];
  for(let i=0;i<7;i++){const an=i*0.898+0.3,g=new THREE.Group();g.position.set(CX+Math.cos(an)*0.72,0,Math.sin(an)*0.72);g.rotation.y=-an+Math.PI/2;
    for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.PlaneGeometry(0.26,0.55).translate(0,0.27,0),sproutMat);l.rotation.z=s*0.5;l.rotation.x=0.2;g.add(l);}
    g.userData.d=hash1(i*4)*0.35; sprouts.push(g); L.mesh.add(g);}
  // hojas-escudo: casquete de esfera con forma de hoja, translúcido (normal) + nervios y onda del golpe (aditivo)
  const SHG=new THREE.SphereGeometry(1.08,28,20,Math.PI/2-0.62,1.24,Math.PI/2-0.75,1.5);
  const shieldFS=add=>`uniform float uQ;void main(){vec2 p=vec2(vUv.x-.5,vUv.y);float y=clamp((p.y-.08)/.9,0.,1.);
   float w=.46*sin(3.14159*pow(y,.8));if(abs(p.x)>w||p.y<.08||y>uP)discard;
   float rib=smoothstep(.03,0.,abs(p.x));float vein=smoothstep(.03,0.,abs(fract(abs(p.x)*5.-y*2.8)-.5)-.44);
   float edge=smoothstep(.04,0.,w-abs(p.x));
   float d=length((p-vec2(0.,.55))*vec2(1.,1.2));float ring=step(0.,uQ)*band(d,uQ*1.4,.07)*exp(-uQ*2.5);float spot=step(0.,uQ)*exp(-d*6.)*exp(-uQ*5.);
   ${add?`gl_FragColor=vec4(mix(uC2,uC1,rib+ring)*1.4+vec3(1.)*spot*.6,(rib*.7+vein*.35+edge*.6+ring*1.2+spot)*uA);`
        :`gl_FragColor=vec4(mix(vec3(.12,.42,.14),vec3(.4,.75,.25),y)*(.8+.4*vein),.72*uA);`}}`;
  const shields=HITS.map(h=>{const g=new THREE.Group();g.position.copy(CP);g.lookAt(h.src);
    const s1=new THREE.Mesh(SHG,fxU(shieldFS(false),{uQ:{value:-1}},NB)), s2=new THREE.Mesh(SHG,fxU(shieldFS(true),{uQ:{value:-1}}));
    s2.renderOrder=1; g.add(s1,s2); L.mesh.add(g); return {g,s1,s2};});
  // gotas grandes que llegan de fuera
  const dropFS=`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
   float hl=pow(max(0.,dot(normalize(vN),normalize(vec3(-.4,.6,.7)))),24.);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3+vec3(1.)*hl,(.25+.65*fr+hl)*uA);}`;
  for(const h of HITS){h.drop=new THREE.Mesh(new THREE.SphereGeometry(0.14,20,14),fx(dropFS));h.ring=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(RING_FS,{depthTest:false}));L.mesh.add(h.drop,h.ring);}
  // suelo: charco con ondas concéntricas (cada gota del riego) y corro de hojas
  const puddle=gp(2.6,CX,0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*6.,uT*.4));float e=r+(n-.5)*.3;float body=smoothstep(uP,uP-.2,e);
   float rip=0.;for(int i=0;i<3;i++){float ph=fract(uT*.8+float(i)/3.);rip+=band(e,ph*uP,.025)*(1.-ph);}
   gl_FragColor=vec4(mix(uC2,uC1,rip+.2)*1.2,(body*.16+rip*.8*body+band(e,uP,.03)*.5)*uA);}`));
  L.decal.add(puddle);

  const C=`const float TP=${f(TP)};const float TP1=${f(TP1)};const vec3 R0=${v3(R0)};const vec3 CP=${v3(CP)};`;
  // riego: gotas que salen de la alcachofa en abanico y caen sobre el Axie (bucle durante el vertido)
  a.count+=points(L.part,200,C+`void main(){float life=.42+aSeed.y*.15;float k=(uT-TP-.15)/life+aSeed.x;float c=floor(k);float t=fract(k)*life;vec3 r=rr(c);
   float born=uT-t;vec3 v=vec3((r.x-.5)*.9+.1,-1.2-r.y*.8,(r.z-.5)*.9);
   vec3 p=R0+v*t+vec3(0.,-6.*t*t,0.);
   float hitBody=step(length(p.xz-vec2(${f(CX)},0.)),.45)*step(p.y,1.85);
   vA=(k>=1.&&born<TP1&&p.y>.03&&hitBody<.5)?.85:0.;put(p,.038+.032*r.z);}`);
  // destellos dorados del agua bendita
  a.count+=points(L.part,40,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TP-.15)/life+aSeed.x;float c=floor(k);float t=fract(k)*life;vec3 r=rr(c+5.);
   vec3 p=R0+vec3((r.x-.5)*.8,-1.6*t-4.*t*t,(r.z-.5)*.8);float born=uT-t;
   vA=(k>=1.&&born<TP1&&p.y>.3)?pow(sin(t/life*3.14159),2.):0.;put(p,(.09+.09*r.y));}`,HEAD+`varying float vA;varying float vMix;
   void main(){vec2 q=abs(gl_PointCoord-.5)*2.;float s=smoothstep(.12,0.,q.x*q.y*6.+min(q.x,q.y))*smoothstep(1.,.2,max(q.x,q.y))+smoothstep(.3,0.,length(q));
   float a=s*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(1.,.85,.45)*1.7,a);}`);
  // salpicaduras sobre la cabeza y los hombros
  a.count+=points(L.part,60,C+`void main(){float life=.3+aSeed.y*.2;float k=(uT-TP-.3)/life+aSeed.x;float c=floor(k);float t=fract(k)*life;vec3 r=rr(c+9.);
   float an=r.x*6.2832;vec3 o=vec3(${f(CX)}+cos(an)*.28,1.75+r.y*.15,sin(an)*.28);
   vec3 p=o+vec3(cos(an)*1.2*t,1.2*t-7.*t*t,sin(an)*1.2*t);float born=uT-t;
   vA=(k>=1.&&born<TP1+.3)?(1.-t/life):0.;put(p,.035+.03*r.z);}`);
  // brote: hojitas sueltas que saltan del suelo mojado
  a.count+=points(L.part,40,C+`varying float vR;void main(){float s=${f(TB)}+aSeed.x*.5;float life=.8+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(CX)}+cos(an)*(.6+.6*t),.1+1.4*t-1.2*t*t,sin(an)*(.6+.6*t));
   vR=aSeed.w*6.28+t*6.;vA=(age>0.&&age<1.)?1.-age:0.;put(p,.13+.06*aSeed.w);}`,leafFS(0,0,"mix(vec3(.2,.6,.15),uC1,.25)"),NB);
  // impactos de agua: rastro de cada gota y rociada contra la hoja-escudo
  for(const h of HITS){
    a.count+=points(L.part,25,`void main(){float s=${f(h.t-0.45)}+aSeed.x*.45;float life=.25+aSeed.y*.2;float t=max(uT-s,0.);float age=(uT-s)/life;
     vec3 p=mix(${v3(h.src)},${v3(h.hp)},(s-${f(h.t-0.45)})/.45)+rnd()*(.05+.2*t)+vec3(0.,-1.5*t*t,0.);
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.05+.04*aSeed.z)*(1.-age*.5));}`);
    a.count+=points(L.part,50,`void main(){float s=${f(h.t)}+aSeed.x*.05;float life=.45+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
     vec3 n=${v3(h.d)};vec3 d=normalize(n*1.3+rnd()*.9);vec3 p=${v3(h.hp)}+d*(1.1+1.8*aSeed.z)*t+vec3(0.,-5.*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>.03)?1.-age:0.;put(p,.04+.045*aSeed.w);}`,BUBBLE_FS);
    a.count+=sparks(L.part,40,h.t,`${f(h.hp.x)},${f(h.hp.y)},${f(h.hp.z)}`,`${f(h.d.x)},${f(h.d.y)},${f(h.d.z)}`,1.5,5,2);
  }

  const cm=caster.userData.m;
  a.pose=function(te,o){
    const app=ss(0,TA,te)*(1-ss(TP1+0.2,TP1+0.5,te)), pour=ss(TP+0.15,TP+0.3,te)*(1-ss(TP1,TP1+0.2,te)), wet=ss(TP+0.3,TP+0.9,te)*(1-ss(TE,TF,te));
    can.visible=app>0.001; can.scale.setScalar(Math.max(app*(1+0.15*hitK(te-0.3,6)),0.001)); can.rotation.z=tilt(te); can.position.y=PV.y+0.06*Math.sin(te*3);
    metal.uniforms.uP.value=pour; stream.visible=pour>0.01; stream.material.uniforms.uA.value=pour;
    set(puddle,1.1*wet+0.001,wet);
    sprouts.forEach(g=>{const k=cl((te-TB-g.userData.d)/0.5),e=k<1?1-Math.pow(1-k,3)*Math.cos(k*7):1,s=e*(1-ss(TE,TF,te));
      g.visible=s>0.01; g.scale.setScalar(Math.max(s,0.001)); g.rotation.z=0.06*Math.sin(te*3+g.userData.d*20);});
    sproutMat.uniforms.uP.value=0.4*wet+0.6*Math.max(hitK(te-HITS[0].t,4),hitK(te-HITS[1].t,4));
    let last=-1,lh=null;
    for(const [i,h] of HITS.entries()){
      const k=(te-(h.t-0.45))/0.45; h.drop.visible=k>=0&&k<1; h.drop.position.lerpVectors(h.src,h.hp,cl(k)); set(h.drop,0,1);
      const p=cl((te-h.t)/0.35); towardCam(h.ring.position,h.hp,0.2); billboard(h.ring); h.ring.visible=te>=h.t&&p<1; set(h.ring,p,1-p);
      const sh=shields[i], un=cl((te-h.t+0.3)/0.25), fold=ss(h.t+0.7,h.t+1.0,te);
      sh.g.visible=un>0&&fold<1; for(const m of [sh.s1,sh.s2]){set(m,un*(1-fold),1-fold);m.material.uniforms.uQ.value=te>=h.t?te-h.t:-1;}
      sh.g.scale.setScalar(1+0.04*hitK(te-h.t,8));
      if(te>=h.t){last=h.t;lh=h;}
    }
    U.uE.value=wet;
    cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.2*pour+0.1*wet+(lh?0.35*hitK(te-last,6):0);
    caster.rotation.z=0.03*Math.sin(te*2)*wet-(lh?0.08*hitK(te-last,6)*Math.cos((te-last)*20):0);
    if(!lh){if(te<TB+0.3){rose(te,o.g);o.gs=0.85+0.45*pour;o.ga=0.16+0.15*pour;o.li=1.2+1.5*pour;}
      else{const nx=HITS[0];const k=cl((te-(nx.t-0.45))/0.45);o.g.lerpVectors(nx.src,nx.hp,k);o.gs=0.65;o.ga=0.2*k;o.li=1.2+1.5*k;}}
    else{const ia=te-last;o.g.copy(lh.hp);o.gs=1.1+2.2*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.58;o.li=6*Math.exp(-ia*5)+1*wet;}
    o.ia=lh?te-last:te-HITS[0].t; o.c.copy(lh?lh.hp:HITS[0].hp); o.shake=0; o.dist=0.5; o.flash=0;
  };
}},0.63);

// =====================================================================
// 9 · SHIITAKE — un shiitake gigante bioluminiscente brota junto al Axie y sus aliados, suelta una nube de esporas
//     verdes y doradas que curan y deja un círculo de micelio que regenera y late
// =====================================================================
const peShiitake=tempo({key:"peShiitake",name:"Shiitake",dur:3.7,ti:0.8,pal:"Sagrado",allies:2,
  phases:[["Brote",0],["Esporada",0.8],["Regeneración",1.2],["Fin",3.0]],
build(a){
  const L=a.L,TG=0.08,TI=0.8,TE=3.0,TF=3.6,MP=V3(-3.5,0,-1.35),SH=1.45,SZ=0.82;
  const BEAR=[V3(CX,0,0),ALLY_POS[0].clone(),ALLY_POS[1].clone()], BC=BEAR.map(b=>b.clone().add(V3(0,1.0,0)));
  // sombrero: torno pardo con grietas claras (el dibujo típico del shiitake) y borde enrollado
  const prof=[[0,0.44],[0.32,0.41],[0.56,0.32],[0.75,0.18],[0.87,0.03],[0.84,-0.05],[0.72,-0.01],[0.2,0.04],[0,0.05]].map(([x,y])=>new THREE.Vector2(x,y));
  const cap=new THREE.Mesh(new THREE.LatheGeometry(prof,48),fx(LIT+`void main(){vec3 q=normalize(vP);
   float n=noise(q*6.)*.6+noise(q*14.)*.4;float crack=pow(1.-abs(noise(q*7.+3.)*2.-1.),14.)*smoothstep(.2,.4,vP.y);
   float rim=smoothstep(.75,.87,length(vP.xz));
   vec3 c=mix(vec3(.22,.12,.06),vec3(.45,.28,.14),n);c=mix(c,vec3(.85,.78,.62),crack*.8+rim*.25);
   float under=step(vP.y,.045);
   c=c*lit()+mix(uC2,uC1,.4)*fres(2.)*.35*uA+mix(uC2,uC1,.5)*under*(.6+uP)*uA;
   gl_FragColor=vec4(c,1.);}`,SOLID2)); cap.position.y=SH;
  // láminas bioluminiscentes bajo el sombrero (aditivo): líneas radiales que laten
  const gills=new THREE.Mesh(new THREE.RingGeometry(0.12,0.8,64,1).rotateX(Math.PI/2),fx(`
  void main(){float r=length(vP.xz);float an=atan(vP.z,vP.x);
   float g=pow(.5+.5*cos(an*70.),3.)*smoothstep(.12,.25,r)*smoothstep(.82,.6,r);
   float pulse=.6+.4*sin(uT*4.-r*9.);
   gl_FragColor=vec4(mix(uC2,uC1,g)*1.6,(g*pulse+.15)*uA*(1.+uP));}`)); gills.position.y=SH+0.03;
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.2,SH,18,6).translate(0,SH/2,0),fx(LIT+`void main(){
   float n=noise(vP*vec3(25.,3.,25.));float st=smoothstep(.6,.85,noise(vec3(atan(vP.x,vP.z)*4.,vP.y*3.-uT*1.5,0.)));
   vec3 c=mix(vec3(.62,.56,.45),vec3(.85,.8,.68),n)*lit()+mix(uC2,uC1,st)*st*.8*uA;gl_FragColor=vec4(c,1.);}`,SOLID2));
  const shroom=new THREE.Group(); shroom.add(stem,cap,gills); shroom.position.copy(MP); L.mesh.add(shroom);
  // estela: dos jirones de esporas en hélice alrededor del pie
  const wisp=new THREE.Group(); wisp.position.copy(MP); wisp.scale.setScalar(SZ); L.trail.add(wisp); const wm=[];
  for(let i=0;i<2;i++){const m=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
     float n=noise(vec3(u*7.-uT*2.,v*2.,uP));float s=smoothstep(.35,.75,n);
     gl_FragColor=vec4(mix(uC2,uC1,s)*1.4,s*smoothstep(1.,.2,v)*smoothstep(0.,.1,u)*smoothstep(1.,.7,u)*uA);}`);
    m.uniforms.uP.value=i*4.1; wm.push(m); const r=new THREE.Mesh(helixGeo(1.4,0.55,0.35,SH+0.4,0.18,80),m); r.rotation.y=i*Math.PI; wisp.add(r);}
  // círculo de regeneración: hilos de micelio + anillos + ondas que salen del hongo
  const RC=2.4, circle=gp(RC*2,MP.x,MP.z,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float my=pow(1.-abs(noise(vec3(p*9.,1.))*2.-1.),18.)+pow(1.-abs(noise(vec3(p*17.,4.))*2.-1.),24.)*.6;
   float m=band(r,.96,.012)+band(r,.88,.006)+band(r,.92,.03)*step(.6,fract(an/6.2832*36.+uT*.1))*.6;
   float wave=0.;for(int i=0;i<2;i++){float ph=fract(uT*.45+float(i)*.5);wave+=band(r,ph,.05)*(1.-ph);}
   float rev=step(r,uP);
   gl_FragColor=vec4(mix(uC2,uC1,my*.5+wave)*1.3,(m+my*.45*smoothstep(1.,.1,r)+wave*.6+.04)*rev*uA);}`));
  const marks=BEAR.map(b=>{const m=gp(1.35,b.x,b.z,0.024,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(r,.8,.04)+band(r,.55+.08*sin(uT*5.),.03);gl_FragColor=vec4(mix(uC2,uC1,.5)*1.4,m*uA);}`));L.decal.add(m);return m;});
  const crack=gp(1.4,MP.x,MP.z,0.016,fx(SOFTBURN_FS)), shock=gp(4,MP.x,MP.z,0.03,fx(RING_FS));
  L.decal.add(circle,crack,shock);

  const MC=MP.clone().add(V3(0,SH*SZ,0)), C=`const float TI=${f(TI)};const float TE=${f(TE)};const vec3 MC=${v3(MC)};const vec3 MP=${v3(MP)};
  vec3 bear(float b){return b<1.?${v3(BC[0])}:(b<2.?${v3(BC[1])}:${v3(BC[2])});}`;
  const GOLD=HEAD+`varying float vA;varying float vMix;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
   vec3 c=mix(uC2,vec3(1.,.82,.35),step(.55,vMix));gl_FragColor=vec4(c*1.5+vec3(1.)*smoothstep(.2,0.,d)*.4,a);}`;
  // brote: tierra que salta
  a.count+=points(L.part,30,C+`void main(){float s=${f(TG)}+aSeed.x*.25;float life=.45+aSeed.y*.25;float t=max(uT-s,0.);float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.35+.7*aSeed.w),1.1+aSeed.y*1.1,sin(an)*(.35+.7*aSeed.w));
   vec3 p=MP+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.035*aSeed.w);}`,CHIP_FS);
  // esporada: nube verde y dorada que sale de las láminas
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.25;float life=.9+aSeed.y*.6;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()*vec3(1.,.5,1.)+vec3(0.,-.2,0.));vec3 p=MC+d*(.25+1.6*aSeed.z)*(1.-exp(-t*2.5))+vec3(sin(t*3.+aSeed.w*9.)*.12,-.25*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*15.+aSeed.z*30.)):0.;put(p,(.032+.04*aSeed.w));}`,GOLD);
  a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.2;float life=1.1+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 d=normalize(rnd()*vec3(1.,.4,1.)+.001);vec3 p=MC+vec3(0.,-.1,0.)+d*(.3+1.2*aSeed.z)*(1.-exp(-t*2.))+vec3(0.,-.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.26:0.;put(p,(.38+.3*aSeed.w)*(.6+age));}`,SMOKE_FS("mix(vec3(.4,.75,.5),vec3(.75,.7,.4),vMix)"),NB);
  // flujo curativo: esporas que bajan en espiral desde el sombrero hasta cada portador (bucle mientras dura)
  a.count+=points(L.part,160,C+`void main(){float b=floor(aSeed.x*3.);float life=1.1+aSeed.y*.5;float k=(uT-TI-.15)/life+fract(aSeed.x*3.);float c=floor(k);float age=fract(k);vec3 r=rr(c+b*3.);
   vec3 B=bear(b);vec3 M=mix(MC,B,.5)+vec3(0.,.7,0.);float e=age*age*(3.-2.*age);
   vec3 p=mix(mix(MC,M,e),mix(M,B,e),e);float an=r.x*6.2832+age*7.;p+=vec3(cos(an),.5*sin(an*1.3),sin(an))*.22*sin(age*3.14159);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.032+.04*r.z);}`,GOLD);
  // cruces de curación que suben en cada portador
  a.count+=points(L.part,36,C+`void main(){float b=floor(aSeed.x*3.);float life=.9+aSeed.y*.4;float k=(uT-TI-.4)/life+fract(aSeed.x*3.);float c=floor(k);float age=fract(k);vec3 r=rr(c+b);
   vec3 p=bear(b)+vec3((r.x-.5)*.9,-.6+age*1.6,(r.z-.5)*.9);
   vA=(k>=1.)?smoothstep(0.,.2,age)*(1.-age)*uE:0.;put(p,.13+.06*r.y);}`,CROSS_FS);
  a.count+=sparks(L.part,70,TI,`${f(MC.x)},${f(MC.y)},${f(MC.z)}`,"0.,.2,0.",1.5,5,1.5);

  a.pose=function(te,o){
    const ia=te-TI, gk=cl((te-TG)/(TI-TG)), grow=gk<1?1-Math.pow(1-gk,3)*Math.cos(gk*6):1, env=ss(TI,TI+0.4,te)*(1-ss(TE,TF,te));
    const puff=hitK(ia,6), out=1-ss(TE,TF-0.05,te), beat=0.5+0.5*Math.sin(te*3.2);
    caster.rotation.z=0.08*ss(0,0.3,te)-0.08*ss(0.4,0.8,te);
    shroom.visible=gk>0&&out>0.01; const sc=Math.max(SZ*grow*out,0.001);
    shroom.scale.set(sc*(1+0.1*puff),sc*(1-0.08*puff*Math.cos(ia*20)),sc*(1+0.1*puff));
    shroom.rotation.z=0.05*Math.sin(te*1.7)*grow;
    set(cap,puff,ss(TG+0.3,TI,te)); set(gills,puff*1.5+0.3*beat,ss(TG+0.3,TI,te)*out); set(stem,0,env*0.8+0.3*ss(0.3,TI,te)*out);
    for(const m of wm)m.uniforms.uA.value=env*0.8; wisp.rotation.y=te*0.9;
    set(circle,ss(TI,TI+0.8,te),ss(TI-0.1,TI+0.2,te)*(1-ss(TE,TF,te)));
    marks.forEach((m,i)=>m.material.uniforms.uA.value=env*(0.6+0.4*Math.sin(te*4+i*2)));
    crack.material.uniforms.uA.value=ss(TG,TG+0.3,te)*(1-ss(TE,TF,te))*0.6;
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.16*env*(0.7+0.3*beat)+0.3*hitK(ia-0.7,3);
    allies.forEach((d,i)=>{d.userData.m.emissive.copy(U.uC1.value);d.userData.m.emissiveIntensity=0.16*env*(0.7+0.3*Math.sin(te*3.2+i*2))+0.3*hitK(ia-0.8-0.1*i,3);});
    o.g.copy(MC).add(tmp.set(0,-0.1,0.3)); o.gs=(1+1.1*grow)*out+1.4*puff; o.ga=0.12*grow*out+0.45*puff+0.06*env; o.li=(1.5*grow+1.8*env*beat)*out+5.5*puff;
    o.ia=ia; o.c.copy(MC); o.shake=0; o.dist=0.5; o.flash=0;
  };
}},0.63);

VFX.module("Planta · Espalda",[peSucculent,peBidens,peDeathShroom,peForestHero,peMint,pePumpkin,peTurnip,peWateringCan,peShiitake]);
})();

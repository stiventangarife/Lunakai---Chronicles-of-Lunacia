// =====================================================================
// ESTILIZADO · PLANTA · ESPALDA (Hito 101) — las 9 cartas de espalda de Planta rehechas a mano con el kit
// vfx-stylized.js (mismo estilo que el piloto y el Sapidae: materia con luz del sol en 3 bandas, rampas de color,
// erosión desde el borde, núcleos de energía pequeños, sin velo).
// Claves: sty_<clave original> (sty_peSucculent…); mismos dur, ti, nivel y fases que mod-planta-espalda.js.
// Cada efecto sigue lo que hace HOY la carta (PartCards.js), aunque el original fuera de otra versión:
//   Succulent    escudo propio        · rosa de hojas carnosas que brota alrededor del lanzador
//   Bidens       limpia a un aliado   · dos aquenios con ganchos arrancan la maldición y se abre una flor dorada
//   Death Shroom veneno en cruz       · hongo negro de motas rojas que se hincha y revienta en esporas
//   Forest Hero  126–154 de daño      · torbellino de hojas de roble → espada-hoja que cae sobre el rival → manto
//   Mint         escudo a todos       · coraza de cristal de menta y ola de escarcha que sale hacia los aliados
//   Pumpkin      escudo + guardia PA  · calabaza blindada que cae sobre el aliado y se enciende como un farol
//   Turnip       54–66 de daño        · nabo arrancado del suelo que vuela girando y revienta en el rival
//   Watering Can escudo a un aliado   · regadera que riega al aliado; cinco hojas se despliegan como escudo
//   Shiitake     veneno en cruz       · racimo de shiitakes que suelta anillos de esporas por los brazos de la cruz
// Cartas sobre un aliado (Bidens, Pumpkin, Watering Can): allies:1, el receptor es VFX.allies[0] (ALLY_POS[0]).
// Variante «propio»: el mismo efecto sobre el lanzador, para cuando la carta se lanza sobre sí mismo (alcance 0).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target,allies,ALLY_POS,LK}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas propias (nombres nuevos: no pisan las del módulo original si se cargan juntos)
const PALS={"Suculenta":["#6fd3a8","#1f6e62"],"Bidens":["#ffd447","#d0611c"],"Hongo letal":["#c6f25a","#6b2aa8"],
  "Roble":["#f3d25c","#2e8a3a"],"Menta cristal":["#8ff0d6","#12907e"],"Calabaza":["#ffb347","#c4521a"],
  "Nabo":["#d6a2ff","#7a31c0"],"Rocío":["#86ccff","#2763c9"],"Shiitake":["#f0c27a","#6e3b1f"]};
for(const [n,c] of Object.entries(PALS))VFX.palette(n,c);
const CX=-3.7, TX=3.4, TC=V3(3.15,1.15,0), CEN=V3(3.4,0,0);
const TILE=1.93;
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0), UPV=V3(0,1,0), Q=new THREE.Quaternion();
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const easeO=x=>1-Math.pow(1-cl(x),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.56,.43,.3)";
const GOLD="vec3(1.,.76,.26)";
const P=(parent,n,vs,fs,o)=>S.pts(parent,n,VV+vs,fs,o);
const gp=(s,x,z,y,mat)=>{const m=groundPlane(s,x,y,mat);m.position.z=z;return m;};
const bez=(a,m,b,u,out)=>{const w0=(1-u)*(1-u),w1=2*u*(1-u),w2=u*u;return out.set(a.x*w0+m.x*w1+b.x*w2,a.y*w0+m.y*w1+b.y*w2,a.z*w0+m.z*w1+b.z*w2);};
const anchor=a=>{const F={};for(const k of LK){F[k]=new THREE.Group();a.L[k].add(F[k]);}return F;};
const moveF=(F,x,z)=>{for(const k of LK)F[k].position.set(x,0,z||0);};
// apunta un objeto (eje +y local) en la dirección d
const aim=(obj,d)=>{if(d.lengthSq()<1e-8)return;Q.setFromUnitVectors(UPV,tmp3.copy(d).normalize());obj.quaternion.copy(Q);};

// ---------- materiales compartidos ----------
// sólido con luz en 3 bandas: el cuerpo GLSL define base (color), lb (aclarado de la rampa) y emi (brillo propio × uGl).
// uEr = erosión (< 0: entero), el borde que se consume brilla con uC1
const SOLID=(body,{spec=.3,rim=.22}={})=>`uniform float uEr;uniform float uGl;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();float l=styLight(n,L);vec3 V=normalize(vV);
 vec3 base=uC1;vec3 emi=vec3(0.);float lb=0.;
 ${body}
 vec3 c=styRampOf(base,clamp(.22+.55*l+lb,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,V));c+=uSunCol*${rim.toFixed(3)}*smoothstep(.6,.72,fr)*step(.5,l);
 c+=vec3(1.,.96,.9)*smoothstep(.94,.97,dot(reflect(-L,n),V))*${spec.toFixed(3)};
 c+=emi*uGl;
 float nz=styNoise(vUv*vec2(1.3,.9)+.17).r*.85+.15;if(nz<uEr)discard;
 c=mix(c,uC1*1.25,smoothstep(uEr+.07,uEr,nz)*step(0.,uEr));
 gl_FragColor=vec4(c,1.);}`;
const smat=(body,o)=>S.mat(SOLID(body,o),{uEr:{value:-1},uGl:{value:0}},{mode:'solid',side:THREE.DoubleSide});
const eu=(m,er,gl)=>{m.uniforms.uEr.value=er;if(gl!==undefined)m.uniforms.uGl.value=gl;};
// energía con forma del atlas y color fijo (oro, agua…)
const ENERGY_COL=(cell,col,gain=1.3)=>S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(${cell.toFixed(1)},uv);float m=sh.r;if(m<.01)discard;
 float er=styErode(m*.6+sh.b*.4,vK*1.05-.05,.12);float a=er*vA;if(a<.01)discard;
 gl_FragColor=vec4((styRampOf(${col},.55+.4*m)+vec3(1.,.95,.85)*sh.g*.35)*${gain.toFixed(2)},a);}`;
// mancha orgánica en el suelo de un color (tierra, jugo, charco); uP = erosión
const STAIN=(col,alpha=.6,lo=.25)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.68,r+(n-.5)*.5);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);
 gl_FragColor=vec4(styRampOf(${col},${lo.toFixed(2)}+.35*n),m*er*uA*${alpha.toFixed(2)});}`;
// anillo de pincel de un color fijo; uP = erosión
const RING_COL=col=>`void main(){vec4 s=styShape(7.,vUv);float er=styErode(s.r*.55+s.b*.45,uP,.12);
 gl_FragColor=vec4(styRampOf(${col},.6+.4*s.g)*1.15,s.r*er*uA*.85);}`;
// mancha en cruz (5 casillas) con la rampa de la paleta; uP = erosión, uK = alcance (0..1) desde el centro
const CROSS_FS=(alpha=.45,col=null)=>`uniform float uK;void main(){vec2 p=(vUv-.5)*${f(TILE*3.4)};
 float a=max(abs(p.x)-${f(TILE*1.5)},abs(p.y)-${f(TILE*.5)});float b=max(abs(p.x)-${f(TILE*.5)},abs(p.y)-${f(TILE*1.5)});
 float sd=min(a,b);float n=styNoise(vUv*.9).r;float m=smoothstep(.15,-.25,sd+(n-.5)*.7);
 m*=smoothstep(uK*${f(TILE*1.75)}+.2,uK*${f(TILE*1.75)}-.3,max(abs(p.x),abs(p.y)));
 if(m<.01)discard;float er=styErode(n*.6+m*.4,uP,.15);
 vec3 c=${col?`styRampOf(${col},.25+.3*n)`:`styRamp(.2+.25*n)`};
 gl_FragColor=vec4(c,m*er*uA*${alpha.toFixed(2)});}`;
// centros de la cruz en GLSL: 0 centro, 1..4 brazos
const CROSS_GLSL=`vec3 cl5(float i){return i<.5?vec3(0.):(i<1.5?vec3(${f(TILE)},0.,0.):(i<2.5?vec3(${f(-TILE)},0.,0.):(i<3.5?vec3(0.,0.,${f(TILE)}):vec3(0.,0.,${f(-TILE)}))));}`;
// silueta de hoja (para Shape): largo h, ancho w, lóbulos (roble) opcionales
function leafShape(h,w,lobes=0){
  const s=new THREE.Shape();const N=24;const pts=[];
  for(let i=0;i<=N;i++){const y=i/N;let x=w*Math.sin(Math.PI*Math.pow(y,0.85))*(1-0.25*y);
    if(lobes)x*=1-0.32*Math.pow(Math.abs(Math.sin(y*Math.PI*lobes)),1.5)*Math.sin(Math.PI*y);pts.push([x,y*h]);}
  s.moveTo(0,0);for(const [x,y] of pts)s.lineTo(x,y);for(let i=pts.length-1;i>=0;i--)s.lineTo(-pts[i][0],pts[i][1]);
  return s;
}
// hoja verde sólida (vetas en vUv de ShapeGeometry: x,y en unidades de la forma)
const LEAF_BODY=(colA,colB,h)=>`float y=clamp(vP.y/${f(h)},0.,1.);float vein=smoothstep(.035,0.,abs(vP.x))+smoothstep(.02,0.,abs(fract(abs(vP.x)*6.-vP.y*3.)-.5)-.46)*.5;
 base=mix(${colA},${colB},smoothstep(.1,.95,y));lb=vein*.18;emi=uC1*vein;`;

const defs=[];

// =====================================================================
// 1 · SUCCULENT — escudo propio (+50). Una rosa de hojas carnosas jade con puntas rosadas brota de la tierra
//     alrededor del lanzador, se llena de savia (brillo) al sellar y se repliega. Nivel 1: corto y limpio.
// =====================================================================
defs.push({key:"sty_peSucculent",name:"Succulent (estilizado)",dur:1.3,ti:0.425,tier:1,pal:"Suculenta",stylized:true,
  phases:[["Brote",0],["Corona",0.175],["Absorción",0.425],["Savia",0.75],["Repliegue",1.0]],
build(a){
  const L=a.L,TI=0.425;
  const rose=new THREE.Group(); rose.position.set(CX,0,0); L.mesh.add(rose);
  const mat=smat(`float h=clamp(vP.y/1.,0.,1.);base=mix(uC2,mix(uC2,uC1,.6),smoothstep(.05,.75,h));base=mix(base,vec3(.9,.32,.45),smoothstep(.7,.95,h));
   lb=-.02;emi=mix(uC1,vec3(.7,1.,.85),.3)*(.25+.75*h);`,{spec:.4,rim:.3});
  const geo=new THREE.ConeGeometry(0.21,1.0,10,1).translate(0,0.5,0); geo.scale(1,1,0.72);
  const leaves=[];
  const ring=(n,r,tilt,sc,y,off,t0)=>{for(let i=0;i<n;i++){const piv=new THREE.Group();piv.rotation.y=i/n*Math.PI*2+off;
    const m=new THREE.Mesh(geo,mat);m.position.set(r,y,0);m.rotation.z=-tilt;piv.add(m);rose.add(piv);leaves.push({m,sc,t:t0+i*0.012});}};
  ring(9,0.42,0.9,1,0,0,0.02); ring(6,0.22,0.45,0.8,0.08,0.35,0.07);
  const soil=gp(2.2,CX,0,0.016,S.mat(STAIN(EARTH,.55,.12),{},{mode:'matter'})); L.decal.add(soil);
  const gring=S.groundRing(L.decal,2.8);
  const spark=S.hitSpark(L.mesh,1.1,{seed:0.21});
  const K=`const float TI=${f(TI)};const vec3 CB=vec3(${f(CX)},0.,0.);`;
  // tierra que salta al brotar
  P(L.part,10,K+`void main(){float s=.02+aSeed.x*.12;float life=.4+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=CB+vec3(cos(an),0.,sin(an))*(.35+.5*(1.-exp(-t*6.)))+vec3(0.,.1+t*.45,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.26+.12*aSeed.y)*(.7+.5*age));}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // destellos en las puntas al sellar
  P(L.part,12,K+`void main(){float an=aSeed.x*6.2832;float s=TI-.03+aSeed.y*.08;float t=uT-s;float age=t/.28;
   vec3 p=CB+vec3(cos(an)*1.15,.62+aSeed.z*.1,sin(an)*1.15);vR=aSeed.w*3.;vK=age;
   vA=(t>0.&&age<1.)?1.:0.;put(p,.16+.06*aSeed.z);}`,S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  // savia: motas que suben de las hojas al lanzador
  P(L.part,20,K+`void main(){float s=TI+aSeed.x*.3;float age=(uT-s)/.38;float an=aSeed.y*6.2832+age*2.6;float rad=mix(.72,.08,age*age);
   vec3 p=CB+vec3(cos(an)*rad,.35+age*.75,sin(an)*rad);vR=0.;vK=smoothstep(.7,1.,age);
   vA=(age>0.&&age<1.)?1.:0.;put(p,.1+.05*aSeed.z);}`,ENERGY_COL(C.drop,'mix(uC1,vec3(.6,1.,.8),.3)',1.2),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI, out=ss(0.98,1.26,te);
    for(const q of leaves){const g=back(cl((te-q.t)/0.17));q.m.scale.setScalar(Math.max(q.sc*g*(1-0.6*out)+0.08*hitE(ia,9)*q.sc,0.001));q.m.visible=te>q.t;}
    eu(mat,-0.1+1.12*ss(1.0,1.27,te),0.22*ss(0.2,TI,te)+0.95*hitE(ia,6)+0.28*(ia>=0?1-ss(0.75,1.05,te):0));
    set(soil,-0.1+1.1*ss(0.95,1.28,te),ss(0,0.12,te));
    gring.pose(ia,CX,0,0.4,0.9);
    spark.pose(ia,tmp.set(CX,0.95,0.1),0.8);
    caster.scale.set(1+0.04*hitE(ia,10),1-0.04*hitE(ia,10),1);
    const m=caster.userData.m; m.emissive.copy(U.uC1.value); m.emissiveIntensity=0.35*hitE(ia,7)+0.12*(ia>=0?1-out:ss(0.2,TI,te));
    o.g.set(CX,0.7,0);o.gs=ia<0?0.6:1.1+ia;o.ga=ia<0?0.05:0.18*Math.exp(-ia*8);o.li=ia<0?1:3*Math.exp(-ia*6)+0.5*(1-out);
    o.ia=ia;o.c.set(CX,0.9,0);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

// =====================================================================
// 2 · BIDENS (Big Yak) — quita los estados negativos a un aliado. El aliado está envuelto en miasma violeta y sellos;
//     dos aquenios de Bidens brotan de la espalda del lanzador, salen disparados con estela dorada, se enganchan en la
//     miasma y la arrancan girando a su alrededor; una flor de Bidens amarilla se abre a sus pies y suelta pétalos.
// =====================================================================
(function(){
const TI=0.7125, TL=0.5, TT=0.36;
const CURSE="vec3(.25,.12,.32)";
const def={key:"sty_peBidens",name:"Bidens (estilizado)",dur:2.1,ti:TI,tier:2,pal:"Bidens",stylized:true,
  variants:[["aliado","Sobre un aliado"],["propio","Sobre sí mismo"]],v:"aliado",vlabel:"Receptor",
  allies:()=>def.v==="propio"?0:1,
  phases:[["Maldición",0],["Tensión",0.375],["Disparo",0.5],["Purificación",TI],["Calma",1.2]],
build(a){
  const L=a.L, F=anchor(a), uR={value:V3(0,0,0)};
  const R=V3(0,0,0), B0=[V3(-3.9,1.32,-0.22),V3(-3.78,1.38,0.26)], M=V3(0,0,0), H=V3(0,0,0);
  // ---- maldición: mancha violeta con púas, miasma que sube, sellos que orbitan
  const curse=gp(2.4,0,0,0.018,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=styNoise(vUv*.9+.4).r;float sp=pow(abs(cos(an*5.+n*1.5)),6.)*.35;
   float m=smoothstep(.62+sp,.5+sp,r+(n-.5)*.3);if(m<.01)discard;float er=styErode(n*.7+m*.3,uP,.15);
   float rim=smoothstep(.3,.55,r)*.6;
   gl_FragColor=vec4(styRampOf(${CURSE},.15+.5*rim+.2*n),m*er*uA*.75);}`,{},{mode:'matter'})); F.decal.add(curse);
  const K=`const float TI=${f(TI)};const float TL=${f(TL)};uniform vec3 uR;`;
  P(F.part,30,K+`void main(){float s=-.35+aSeed.x*1.;float life=.75;float age=(uT-s)/life;float t=max(uT-s,0.);float ti=max(uT-TI,0.);
   float an=aSeed.y*6.2832+t*1.5;float rad=.38+.25*aSeed.z;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=d*(rad+ti*2.6*(1.+aSeed.w))+vec3(0.,.15+min(t,.8)*1.5+ti*1.2,0.);
   vA=(age>0.&&age<1.&&uT<TI+.42)?smoothstep(0.,.15,age):0.;vK=max(smoothstep(.6,1.,age),clamp(ti/.38,0.,1.));
   vR=aSeed.w*6.28+t;put(p,(.36+.16*aSeed.z)*(.7+.5*min(age,1.)));}`,S.MATTER_FS(C.puff,{relief:4,col:CURSE,erodeSoft:.12}));
  P(F.part,3,K+`void main(){float an=aSeed.x*6.2832+uT*2.2;float ti=max(uT-TI,0.);
   vec3 p=vec3(cos(an)*(.62+ti*3.),1.55+.08*sin(uT*4.+an)+ti*1.5,sin(an)*(.62+ti*3.));
   vR=uT*1.5;vK=clamp(ti/.25,0.,1.);vA=smoothstep(0.,.25,uT)*(uT<TI+.25?1.:0.);put(p,.42);}`,S.MATTER_FS(C.ring,{relief:2,col:CURSE,bias:.1}));
  // ---- los dos aquenios: cuerpo pardo estrecho + tres aristas con púas (sólidos)
  const seedMat=smat(`float h=clamp(vP.y/.55+.5,0.,1.);base=mix(vec3(.24,.15,.08),vec3(.5,.34,.16),h);lb=.03;emi=${GOLD};`,{spec:.35,rim:.3});
  const seeds=B0.map(()=>{const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.022,0.52,8),seedMat);
    g.add(body);
    for(let i=0;i<3;i++){const aw=new THREE.Mesh(new THREE.ConeGeometry(0.02,0.26,5).translate(0,0.13,0),seedMat);
      aw.position.y=0.25;aw.rotation.z=(i-1)*0.42;aw.rotation.y=i*0.3;g.add(aw);
      for(let b=0;b<2;b++){const br=new THREE.Mesh(new THREE.ConeGeometry(0.012,0.07,4).translate(0,0.035,0),seedMat);
        br.position.set(0,0.08+b*0.08,0);br.rotation.z=2.5;aw.add(br);}}
    g.scale.setScalar(1.5); L.mesh.add(g); return g;});
  // estela dorada de los aquenios
  P(L.part,34,K+`const vec3 B0a=${v3(B0[0])};const vec3 B0b=${v3(B0[1])};
   vec3 bz(vec3 a,vec3 m,vec3 b,float u){return mix(mix(a,m,u),mix(m,b,u),u);}
   void main(){float sd=aSeed.w<.5?0.:1.;vec3 b0=sd<.5?B0a:B0b;vec3 h=uR+vec3(sd<.5?-.32:.32,1.15,.12);vec3 m=mix(b0,h,.5)+vec3(0.,2.1,0.);
   float s=TL+aSeed.x*(TI-TL);float u=(s-TL)/(TI-TL);float t=uT-s;float age=t/.3;
   vec3 p=bz(b0,m,h,u)+rnd()*.08+vec3(0.,-.3*t,0.);vR=0.;vK=age;vA=(t>0.&&age<1.)?1.:0.;put(p,.16+.06*aSeed.y);}`,
   ENERGY_COL(C.spark,GOLD,1.25),{mode:'energy',uniforms:{uR}});
  // ---- purificación: flor de Bidens que se abre, pétalos y chispas
  const flower=gp(2.5,0,0,0.026,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float pk=pow(abs(cos(an*4.)),.7);float shape=.3+.62*pk;float n=styNoise(vUv*1.3).r;
   float pet=smoothstep(shape,shape-.06,r)*step(.18,r);float ctr=smoothstep(.24,.2,r);
   float m=max(pet,ctr);if(m<.01)discard;float er=styErode(n*.6+m*.4,uP,.12);
   float rib=smoothstep(.03,0.,abs(fract(an*4./3.14159+.5)-.5))*.25;
   vec3 c=pet>ctr?styRampOf(vec3(1.,.74,.12),.42+.3*(1.-r)+rib):styRampOf(vec3(.72,.34,.08),.4+.4*n);
   gl_FragColor=vec4(c,m*er*uA);}`,{},{mode:'matter'})); F.decal.add(flower);
  const gring=S.groundRing(L.decal,3.0);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.62});
  P(F.part,22,K+`void main(){float s=TI+.02+aSeed.x*.1;float t=max(uT-s,0.);float life=.9+aSeed.y*.35;float age=t/life;
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(1.2+aSeed.w),2.4+1.4*aSeed.y,sin(an)*(1.2+aSeed.w));
   float dr=1.-exp(-t*3.);vec3 p=vec3(0.,.3,0.)+v*dr*.55+vec3(sin(t*5.+an)*.2,-max(t-.35,0.)*.9,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=an+t*(2.+aSeed.w*3.);put(p,.26+.08*aSeed.w);}`,
   S.MATTER_FS(C.leaf,{relief:3,col:'vec3(1.,.8,.22)',bias:.05}));
  P(F.part,18,K+`void main(){float s=TI+aSeed.x*.35;float t=uT-s;float age=t/.45;vec3 r=rnd();
   vec3 p=vec3(r.x*.55,.3+aSeed.w*1.3+t*1.3,r.z*.55);vR=0.;vK=age;vA=(t>0.&&age<1.)?1.:0.;put(p,.12+.05*aSeed.y);}`,
   ENERGY_COL(C.spark,GOLD,1.3),{mode:'energy'});
  a.setVariant=v=>{def.v=a.v=v==="propio"?"propio":"aliado";};
  a.pose=function(te,o){
    const self=def.v==="propio", ia=te-TI;
    R.set(self?CX:ALLY_POS[0].x,0,self?0:ALLY_POS[0].z); uR.value.copy(R); moveF(F,R.x,R.z);
    const rec=self?caster:allies[0];
    set(curse,ia>=0?-0.1+1.15*ss(0,0.4,ia):0,ss(0,0.2,te));
    // aquenios: brotan de la espalda (tensión), vuelan por un arco y orbitan al receptor arrancando la miasma
    seeds.forEach((g,i)=>{const sd=i?1:-1;H.set(R.x+sd*0.32,1.15,R.z+0.12);M.copy(B0[i]).lerp(H,0.5).y+=2.1;
      const gr=ss(TT,TT+0.1,te);let d=tmp2;
      if(te<TL){g.position.copy(B0[i]);g.position.y+=0.05*Math.sin(te*70)*ss(TT+0.08,TL,te);d.set(-0.35*sd,1,0.1);g.scale.setScalar(Math.max(1.5*gr,0.001));}
      else if(ia<0){const u=Math.pow(cl((te-TL)/(TI-TL)),0.9);bez(B0[i],M,H,u,g.position);
        bez(B0[i],M,H,Math.min(u+0.02,1),d).sub(g.position);if(u>=0.99)d.set(1,0,0);g.scale.setScalar(1.5);}
      else{const an=(i?Math.PI:0)+ia*9*Math.exp(-ia*1.2),rad=0.55+0.35*ss(0.3,0.75,ia);
        g.position.set(R.x+Math.cos(an)*rad,1.1+0.3*ss(0,0.4,ia)-1.0*ss(0.45,0.8,ia),R.z+Math.sin(an)*rad);d.set(-Math.sin(an),0.2,Math.cos(an));g.scale.setScalar(1.5);}
      aim(g,d); g.visible=gr>0.001&&te<TI+0.85;});
    eu(seedMat,-0.1+1.12*ss(TI+0.55,TI+0.85,te),0.35*ss(TT,TL,te)+0.8*hitE(ia,5));
    const fo=ss(0.02,0.2,ia); flower.visible=ia>=0; flower.scale.setScalar(Math.max(0.35+0.65*back(cl(ia/0.22)),0.001));
    set(flower,ia>=0?-0.1+1.15*ss(0.75,1.35,ia):0,fo);
    gring.pose(ia,R.x,R.z,0.45);
    spark.pose(ia,tmp.set(R.x,1.0,R.z+0.15),0.9);
    const m=rec.userData.m; m.emissive.setRGB(1,0.78,0.25); m.emissiveIntensity=0.5*hitE(ia,5)+0.12*(ia>=0?1-ss(0.6,1.2,ia):0);
    if(ia<0){bez(B0[0],M,H,cl((te-TL)/(TI-TL)),o.g);o.gs=0.5;o.ga=0.08*ss(TL,TI,te);o.li=1.2;}
    else{o.g.set(R.x,0.9,R.z);o.gs=1.2+ia;o.ga=0.25*Math.exp(-ia*7);o.li=3.5*Math.exp(-ia*4);}
    o.ia=ia;o.c.set(R.x,0.9,R.z);o.shake=0;o.dist=0.35;o.flash=0;
  };
}};
defs.push(def);
})();

// =====================================================================
// 3 · DEATH SHROOM — veneno en cruz. Un hongo negro de motas rojas brota detrás de la casilla, se hincha con grietas
//     de toxina lima y revienta: trozos de sombrero, cinco nubes de esporas violetas en cruz, gotas y veneno.
// =====================================================================
defs.push({key:"sty_peDeathShroom",name:"Death Shroom (estilizado)",dur:2.34,ti:0.7475,tier:2,pal:"Hongo letal",stylized:true,zoneTarget:TILE*1.6,
  phases:[["Brote",0],["Hinchazón",0.3575],["Estallido",0.7475],["Cruz tóxica",0.8775],["Veneno",1.3]],
build(a){
  const L=a.L,TI=0.7475,MP=V3(TX+0.62,0,0.5);
  const shroom=new THREE.Group(); shroom.position.copy(MP); L.mesh.add(shroom); const SHS=1.25;
  const stemMat=smat(`base=mix(vec3(.5,.44,.55),vec3(.72,.66,.7),smoothstep(0.,.8,vP.y));lb=-.02;emi=uC1*.3;`,{spec:.15});
  const capMat=smat(`vec3 q=normalize(vP-vec3(0.,-.1,0.));float an=atan(q.z,q.x);
   vec2 sp=vec2(an*.55,q.y*1.1);float spot=smoothstep(.62,.68,styNoise(sp*.9+.3).g);
   float crk=smoothstep(.47,.5,styNoise(sp*1.6+.1).b)*smoothstep(.55,.47,styNoise(sp*1.6+.1).b);
   base=mix(vec3(.17,.08,.22),vec3(.82,.1,.12),spot);lb=spot*.12;emi=uC1*(crk*1.4+spot*.15);
   if(vP.y<.02){base=vec3(.4,.3,.38);emi=uC1*.2;}`,{spec:.45,rim:.25});
  const stem=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[0.22,0],[0.17,0.12],[0.13,0.45],[0.12,0.75],[0.15,0.85],[0,0.86]].map(([x,y])=>new THREE.Vector2(x,y)),18),stemMat);
  const cap=new THREE.Mesh(new THREE.LatheGeometry([[0,-0.02],[0.3,-0.06],[0.62,0.0],[0.7,0.1],[0.6,0.3],[0.38,0.45],[0,0.5]].map(([x,y])=>new THREE.Vector2(x,y)),28),capMat);
  cap.position.y=0.8; shroom.add(stem,cap);
  const soil=gp(2.0,MP.x,MP.z,0.017,S.mat(STAIN(EARTH,.6,.1),{},{mode:'matter'})); L.decal.add(soil);
  const stain=gp(TILE*3.4,CEN.x,0,0.022,S.mat(CROSS_FS(.42),{uK:{value:0}},{mode:'matter'})); L.decal.add(stain);
  const gring=S.groundRing(L.decal,3.6);
  const spark=S.hitSpark(L.mesh,2.0,{seed:0.44});
  const K=`const float TI=${f(TI)};const vec3 CEN=${v3(CEN)};const vec3 MP=${v3(MP)};${CROSS_GLSL}`;
  P(L.part,9,K+`void main(){float s=.02+aSeed.x*.12;float life=.45;float age=(uT-s)/life;float t=max(uT-s,0.);float an=aSeed.z*6.2832;
   vec3 p=MP+vec3(cos(an),0.,sin(an))*(.3+.45*(1.-exp(-t*6.)))+vec3(0.,.1+t*.4,0.);
   vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.28+.12*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // trozos del sombrero
  P(L.part,14,K+`void main(){float s=TI;float t=max(uT-s,0.);float life=.6+aSeed.y*.25;float age=t/life;
   vec3 v=normalize(rnd()+vec3(0.,1.,.3))*(2.+2.*aSeed.z);vec3 p=MP+vec3(0.,1.3,0.)+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.26+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'vec3(.24,.1,.28)'}));
  // nubes de esporas: centro y cuatro brazos (los brazos salen un poco después)
  P(L.part,60,K+`void main(){float ci=floor(aSeed.x*5.);float dl=ci<.5?0.:.13;
   float s=TI+dl+aSeed.y*.08;float t=max(uT-s,0.);float life=1.05+aSeed.z*.35;float age=t/life;
   float an=aSeed.w*6.2832;float rr=fract(aSeed.y*7.3)*.5;float go=1.-pow(1.-clamp(t/.25,0.,1.),3.);
   vec3 p=CEN+cl5(ci)*(.35+.65*go)+vec3(cos(an)*rr,.25+fract(aSeed.z*5.1)*.6+t*.25,sin(an)*rr);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t*.5;
   put(p,(.62+.35*fract(aSeed.w*3.7))*(.35+.75*go));}`,S.MATTER_FS(C.puff,{relief:4.5,bias:-.08,erodeSoft:.12}));
  P(L.part,26,K+`void main(){float ci=floor(aSeed.x*5.);float s=TI+.08+aSeed.y*.35;float t=max(uT-s,0.);float age=t/(.8+aSeed.z*.4);
   vec3 p=CEN+cl5(ci)+vec3((aSeed.w-.5)*1.1,.3+t*.6+aSeed.z*.5,(fract(aSeed.w*9.1)-.5)*1.1);
   vA=(uT>s&&age<1.)?(.5+.5*sin(uT*14.+aSeed.x*40.))*(1.-age):0.;vK=0.;vR=aSeed.y*6.28;put(p,.08+.05*aSeed.w);}`,
   ENERGY_COL(C.spark,'uC1',1.4),{mode:'energy'});
  P(L.part,16,K+`void main(){float ci=floor(aSeed.x*5.);float per=.5;float k=(uT-TI-.2)/per+aSeed.y;float c=floor(k);float tt=fract(k)*per;
   vec3 r=rr(c);vec3 p=CEN+cl5(ci)+vec3((r.x-.5)*.9,.9-4.2*tt*tt,(r.z-.5)*.9);
   vA=(k>=0.&&uT<TI+1.3&&p.y>.03)?1.:0.;vK=0.;vR=3.14159;put(p,.13+.05*r.y);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1',bias:-.1}));
  const PZ=S.status(a,"poison",[target],TI+0.1,2.25),ST=[{kind:"poison",env:0}];
  a.pose=function(te,o){
    const ia=te-TI, gr=back(cl(te/0.34)), sw=ss(0.36,TI,te), wob=0.05*Math.sin(te*42)*sw;
    shroom.visible=te<TI+0.5; shroom.scale.setScalar(SHS);
    stem.scale.set(1+0.25*sw,Math.max(gr*(1-0.6*ss(TI+0.05,TI+0.45,te)),0.001),1+0.25*sw);
    cap.position.y=0.8*Math.max(gr*(1-0.6*ss(TI+0.05,TI+0.45,te)),0.001);
    cap.scale.set(Math.max(gr*(1+0.4*sw+wob),0.001),Math.max(gr*(1+0.3*sw-wob),0.001),Math.max(gr*(1+0.4*sw+wob),0.001));
    eu(capMat,ia>=0?-0.1+1.2*ss(0,0.12,ia):-1,0.3+1.4*sw*(0.75+0.25*Math.sin(te*30)));
    eu(stemMat,ia>=0?-0.1+1.15*ss(0.15,0.45,ia):-1,0.4*sw);
    set(soil,-0.1+1.1*ss(1.2,1.7,te),ss(0,0.1,te));
    stain.visible=ia>=0; stain.material.uniforms.uK.value=easeO(ia/0.35); set(stain,ia>=0?-0.15+1.2*ss(0.8,1.55,ia):0,ss(0,0.2,ia));
    gring.pose(ia,CEN.x,0,0.45,1.1);
    spark.pose(ia,tmp.set(MP.x,1.35,MP.z+0.2),1);
    const h=hitE(ia,6); target.position.x=TX+0.1*h; target.rotation.z=-h*0.14*Math.cos(ia*13);
    ST[0].env=PZ.pose(te); S.statusGlow(o,ST);
    if(ia<0){o.g.set(MP.x,1.0,MP.z);o.gs=0.5*sw+0.2;o.ga=0.12*sw;o.li=1.5*sw;}
    else{o.g.set(CEN.x,0.8,0);o.gs=1.4+1.5*ia;o.ga=Math.exp(-ia*10)*0.3;o.li=3.5*Math.exp(-ia*5)+0.8*ST[0].env;}
    o.ia=ia;o.c.set(CEN.x,0.6,0);o.shake=0.6;o.dist=0.8;
  };
}});

// =====================================================================
// 4 · FOREST HERO — 126–154 de daño (3 PA). Un torbellino de hojas de roble sube alrededor del lanzador y se funde
//     en una espada-hoja de roble con empuñadura de madera; cae en arco sobre el rival: hojas, raíces que rajan el
//     suelo y tierra. La espada se deshace en hojas que vuelven al lanzador como un manto heroico.
// =====================================================================
defs.push({key:"sty_peForestHero",name:"Forest Hero (estilizado)",dur:3.5,ti:1.0,tier:3,pal:"Roble",stylized:true,
  phases:[["Dosel",0],["Torbellino",0.45],["Tajo",0.8],["Impacto",1.0],["Manto",1.4],["Fin",2.85]],
build(a){
  const L=a.L,TI=1.0,TA=0.45,TS=0.8,S0=V3(-3.2,2.75,0.1),SM=V3(-0.4,3.9,0.2),SP=V3(2.75,1.15,0.1);
  // espada: hoja de roble extruida (punta en +y) + empuñadura; centrada para que el puente la mueva entera
  const sword=new THREE.Group(); L.mesh.add(sword);
  const bladeMat=smat(`float y=clamp((vP.y+.5)/1.4,0.,1.);float vein=smoothstep(.04,0.,abs(vP.x))+smoothstep(.025,0.,abs(fract(abs(vP.x)*5.-vP.y*2.2)-.5)-.45)*.6;
   base=mix(uC2*1.05,mix(uC2,uC1,.32),smoothstep(.2,1.,y));lb=vein*.15-.04;emi=mix(uC1,uC2,.3)*(vein*1.1+.05);`,{spec:.35,rim:.3});
  const g=new THREE.ExtrudeGeometry(leafShape(1.4,0.36,3.5),{depth:0.07,bevelEnabled:true,bevelThickness:0.03,bevelSize:0.03,bevelSegments:1,curveSegments:4});
  g.translate(0,-0.5,-0.035); const blade=new THREE.Mesh(g,bladeMat);
  const woodMat=smat(`base=vec3(.44,.27,.13);lb=-.05+.12*step(.5,fract(vP.y*14.));emi=uC1*.2;`,{spec:.1});
  const hilt=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.36,8),woodMat); hilt.position.y=-0.68;
  const guard=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.04,6,12),woodMat); guard.position.y=-0.5; guard.rotation.x=Math.PI/2;
  sword.add(blade,hilt,guard);
  const dapple=gp(4.2,CX,0,0.016,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=styNoise(vUv*1.6+uT*.05).g;
   float m=smoothstep(.6,.66,n)*smoothstep(1.,.4,r);if(m<.01)discard;gl_FragColor=vec4(styRamp(.75)*.8,m*uA*.22);}`,{},{mode:'energy'})); L.decal.add(dapple);
  const roots=gp(3.4,TX,0,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);float j=styNoise(vUv*.7).r-.5;
   float v=pow(1.-abs(fract(an*1.11+j*.35+r*.15)*2.-1.),12.)+pow(1.-abs(fract(an*1.9-j*.5+.3)*2.-1.),18.)*.7;
   float m=v*smoothstep(uP,uP-.25,r)*smoothstep(1.,.5,r);if(m<.02)discard;
   gl_FragColor=vec4(styRampOf(vec3(.4,.25,.12),.12+.5*m),min(m*1.4,1.)*uA*.85);}`,{},{mode:'matter'})); L.decal.add(roots);
  const dirt=gp(2.4,TX,0,0.018,S.mat(STAIN(EARTH,.55,.12),{},{mode:'matter'})); L.decal.add(dirt);
  const gring=S.groundRing(L.decal,3.8), gring2=S.groundRing(L.decal,2.6);
  const spark=S.hitSpark(L.mesh,2.2,{seed:0.77});
  const slash=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),S.mat(`uniform float uEr;void main(){vec4 s=styShape(6.,vUv);float er=styErode(s.r*.6+s.b*.4,uEr,.1);
   gl_FragColor=vec4(styRamp(.6+.4*s.g)*1.35,s.r*er*uA);}`,{uEr:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(slash);
  const K=`const float TI=${f(TI)};const float TA=${f(TA)};const float TS=${f(TS)};const vec3 S0=${v3(S0)};const vec3 SM=${v3(SM)};const vec3 SP=${v3(SP)};
   const vec3 CB=vec3(${f(CX)},0.,0.);vec3 bz(float u){return mix(mix(S0,SM,u),mix(SM,SP,u),u);}`;
  const LEAF=S.MATTER_FS(C.leaf,{relief:3,bias:.02});
  // torbellino: hojas que suben en espiral y se juntan en la espada
  P(L.part,46,K+`void main(){float s=aSeed.x*.4;float t=uT-s;float u=clamp(t/(TS-s),0.,1.);
   float an=aSeed.y*6.2832+t*7.;float rad=mix(.9+.3*aSeed.z,.15,smoothstep(.55,1.,u));
   vec3 p=mix(CB+vec3(cos(an)*rad,.1+u*2.4,sin(an)*rad),S0+rnd()*.35,smoothstep(.6,1.,u));
   vA=(t>0.&&uT<TS+.02)?1.:0.;vK=smoothstep(.9,1.,u);vR=an+1.57;put(p,.28+.1*aSeed.w);}`,LEAF);
  // estela del tajo
  P(L.part,30,K+`void main(){float s=TS+aSeed.x*(TI-TS);float u=pow((s-TS)/(TI-TS),1.7);float t=uT-s;float age=t/.32;
   vec3 p=bz(u)+rnd()*.25+vec3(0.,-.6*t,0.);vR=aSeed.w*6.28+t*6.;vK=age;vA=(t>0.&&age<1.)?1.:0.;put(p,.26+.08*aSeed.y);}`,LEAF);
  // impacto: explosión de hojas, tierra y terrones
  P(L.part,36,K+`void main(){float s=TI;float t=max(uT-s,0.);float life=.9+aSeed.y*.4;float age=t/life;
   vec3 v=normalize(rnd()+vec3(-.1,.8,0.))*(2.4+2.5*aSeed.z);float dr=1.-exp(-t*3.2);
   vec3 p=vec3(${f(TX)},.6,0.)+v*dr*.6+vec3(sin(t*4.+aSeed.w*9.)*.25,-max(t-.3,0.)*.8,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*(3.+2.*aSeed.y);put(p,.3+.1*aSeed.w);}`,LEAF);
  P(L.part,12,K+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=t/(.55+aSeed.y*.2);float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},0.,0.)+vec3(cos(an),0.,sin(an))*(.4+.9*(1.-exp(-t*5.)))+vec3(0.,.15+t*.5,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.18*aSeed.y)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  P(L.part,12,K+`void main(){float s=TI;float t=max(uT-s,0.);float age=t/(.6+aSeed.y*.2);
   vec3 v=normalize(rnd()+vec3(0.,1.2,0.))*(2.2+1.8*aSeed.z);vec3 p=vec3(${f(TX)},.2,0.)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.18+.08*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.42,.3,.18)'}));
  // manto: hojas que vuelven y giran sobre los hombros del lanzador; motas doradas
  P(L.part,28,K+`void main(){float s=TI+.25+aSeed.x*.3;float t=uT-s;float u=clamp(t/.45,0.,1.);float an=aSeed.y*6.2832+t*(1.6+aSeed.z);
   vec3 home=CB+vec3(cos(an)*(.45+.12*aSeed.w),1.05+aSeed.z*.6-.15*max(t-.5,0.),sin(an)*(.45+.12*aSeed.w)*.8);
   vec3 p=mix(vec3(${f(TX)},1.,0.)+rnd()*.5,home,smoothstep(0.,1.,u))+vec3(0.,sin(u*3.14159)*1.6,0.);
   float end=1.-smoothstep(2.6,3.2,uT);vA=(t>0.)?end:0.;vK=smoothstep(2.6,3.3,uT)*.9;vR=an+1.57;put(p,.24+.08*aSeed.w);}`,LEAF);
  P(L.part,18,K+`void main(){float per=.8;float k=(uT-TI-.5)/per+aSeed.x;float c=floor(k);float tt=fract(k);vec3 r=rr(c);
   vec3 p=CB+vec3((r.x-.5)*1.,.4+tt*1.6,(r.z-.5)*.8);vR=0.;vK=tt;vA=(k>0.&&uT<3.1)?1.:0.;put(p,.1+.05*r.y);}`,ENERGY_COL(C.spark,GOLD,1.2),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    // espada: se forma por erosión inversa sobre el lanzador, cae en arco (k^1,7) y se clava; luego se deshace
    sword.visible=te>TA&&te<TI+0.6;
    if(te<TS){sword.position.copy(S0);sword.position.y+=0.06*Math.sin(te*6);sword.rotation.set(0,0,0.35);}
    else if(ia<0){const u=Math.pow(cl((te-TS)/(TI-TS)),1.7);bez(S0,SM,SP,u,sword.position);sword.rotation.set(0,0,0.35-u*(Math.PI*0.5+0.35+0.55));}
    else{sword.position.copy(SP);sword.position.x-=0.08*hitE(ia,12);sword.rotation.set(0,0,-Math.PI*0.5-0.55+0.05*Math.sin(ia*40)*hitE(ia,8));}
    sword.scale.setScalar(Math.max(1.3*ss(TA,TA+0.15,te),0.001));
    const form=te<TS?1.05-1.15*ss(TA,TS-0.05,te):-0.1, gone=ia>=0?-0.1+1.15*ss(0.25,0.55,ia):-1;
    eu(bladeMat,Math.max(form,gone),0.2+0.45*ss(TS-0.1,TI,te)+0.7*hitE(ia,6)); eu(woodMat,Math.max(form,gone),0.2);
    dapple.visible=false;
    roots.visible=ia>=0; set(roots,ia>=0?0.25+0.85*easeO(ia/0.3):0,ia>=0?1-ss(1.3,2.2,ia):0);
    dirt.visible=ia>=0; dirt.scale.setScalar(Math.max(0.5+0.5*easeO(ia/0.2),0.001)); set(dirt,ia>=0?-0.1+1.15*ss(1.2,2.2,ia):0,ia>=0?1:0);
    gring.pose(ia,TX,0,0.5,1.2); gring2.pose(ia-0.12,TX,0,0.45,0.9);
    spark.pose(ia,TC,1.1);
    const sl=cl(ia/0.05), se=ss(0.02,0.2,ia); towardCam(slash.position,tmp.set(TX-0.15,1.2,0),0.5); billboard(slash,-0.9);
    slash.visible=ia>=0&&se<1; slash.scale.setScalar(0.6+0.5*sl); slash.material.uniforms.uA.value=1; slash.material.uniforms.uEr.value=-0.1+1.1*se;
    const h=hitE(ia,6); target.position.x=TX+0.25*h*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-h*0.28*Math.cos(ia*14);
    caster.rotation.z=0.12*ss(0,TA,te)-0.3*ss(TS-0.05,TI,te)+0.18*ss(TI,TI+0.3,te);
    const cm=caster.userData.m, env=ia>=0?ss(0.3,0.7,ia)*(1-ss(2.5,3.2,te)):0.6*ss(0,TS,te);
    cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.22*env;
    if(te<TS){o.g.copy(S0);o.gs=0.4+0.6*ss(TA,TS,te);o.ga=0.1*ss(TA,TS,te);o.li=1+1.5*ss(TA,TS,te);}
    else if(ia<0){o.g.copy(sword.position);o.gs=0.8;o.ga=0.12;o.li=2.5;}
    else{o.g.copy(TC);o.gs=1.6+1.8*Math.min(ia,0.5);o.ga=0.3*Math.exp(-ia*9);o.li=4.5*Math.exp(-ia*6)+0.6*env;}
    o.ia=ia;o.c.copy(TC);o.shake=1.4;o.dist=1.1;
  };
}});

// =====================================================================
// 5 · MINT — +30 de escudo a todos los aliados y les quita la ralentización. Hojas de menta escarchadas giran
//     alrededor del lanzador y estallan: una coraza facetada de cristal de menta se cierra sobre él, una ola de
//     escarcha y hojas sale hacia los aliados en todas direcciones y las gotas azules de la ralentización saltan.
// =====================================================================
defs.push({key:"sty_peMint",name:"Mint (estilizado)",dur:2.34,ti:0.52,tier:2,pal:"Menta cristal",stylized:true,
  phases:[["Escarcha",0],["Explosión",0.52],["Corazas",0.6825],["Brillo",1.105],["Deshielo",1.8525]],
build(a){
  const L=a.L,TI=0.52,TB=1.105,TD=1.8525;
  const frost=gp(3.2,CX,0,0.02,S.mat(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);float n=styNoise(vUv*1.2).g;
   float star=pow(abs(cos(an*3.)),18.)*smoothstep(1.,.2,r)+pow(abs(cos(an*3.+.52)),30.)*smoothstep(.75,.15,r)*.8;
   float disc=smoothstep(.55,.35,r+(n-.5)*.3)*.45;float m=max(star,disc)*smoothstep(uP+.05,uP-.1,r);if(m<.02)discard;
   gl_FragColor=vec4(styRampOf(mix(uC1,vec3(.85,1.,.97),.3),.55+.4*star),min(m,1.)*uA*.75);}`,{},{mode:'matter'})); L.decal.add(frost);
  // coraza: icosaedro de caras planas (bandas de luz por cara), translúcido, aristas que brillan al pasar el destello
  const shellMat=S.mat(`uniform float uEr;uniform float uS;void main(){vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);vec3 V=normalize(vV);
   float fr=1.-abs(dot(n,V));vec3 c=styRampOf(uC1,.35+.5*l)*styTint(l);
   float sweep=smoothstep(.12,0.,abs(vP.y-mix(-1.,1.2,uS)))*.7;c=mix(c,styRampOf(uC2,.3+.5*l),.35);c+=vec3(.8,1.,.95)*(sweep+smoothstep(.97,.99,dot(reflect(-L,n),V))*.7);
   float nz=styNoise(vUv*1.1+.2).r*.85+.15;if(nz<uEr)discard;
   gl_FragColor=vec4(c,(.32+.55*fr+sweep*.3)*uA);}`,{uEr:{value:-1},uS:{value:0}},{mode:'matter',side:THREE.FrontSide});
  const sg=new THREE.IcosahedronGeometry(0.78,1); sg.computeVertexNormals();
  const shell=new THREE.Mesh(sg,shellMat); shell.position.set(CX,0.92,0); L.mesh.add(shell);
  const ring1=S.groundRing(L.decal,5.2), ring2=S.groundRing(L.decal,7.4);
  const spark=S.hitSpark(L.mesh,1.5,{seed:0.33});
  const K=`const float TI=${f(TI)};const vec3 CB=vec3(${f(CX)},0.,0.);`;
  const MINT=S.MATTER_FS(C.leaf,{relief:3,col:'mix(uC2,uC1,.35)'});
  // hojas que giran y se cierran sobre el lanzador
  P(L.part,26,K+`void main(){float s=aSeed.x*.2;float u=clamp((uT-s)/(TI-s),0.,1.);float an=aSeed.y*6.2832+u*7.;
   float rad=mix(1.5,.55,u*u);vec3 p=CB+vec3(cos(an)*rad,.3+aSeed.z*1.4+u*.2,sin(an)*rad);
   vA=(uT>s&&uT<TI)?smoothstep(0.,.2,u):0.;vK=0.;vR=an+1.57;put(p,.26+.08*aSeed.w);}`,MINT);
  // estallido: hojas y esquirlas que salen bajas hacia todas partes (hacia los aliados)
  P(L.part,34,K+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=t/(.75+aSeed.y*.25);float an=aSeed.z*6.2832;
   vec3 d=vec3(cos(an),0.,sin(an));float dr=1.-exp(-t*3.);vec3 p=CB+d*(.6+4.2*dr*(.7+.3*aSeed.w))+vec3(0.,.35+aSeed.w*.6+.4*sin(dr*3.14),0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=an+t*(5.+aSeed.y*4.);put(p,.28+.08*aSeed.w);}`,MINT);
  P(L.part,16,K+`void main(){float s=TI;float t=max(uT-s,0.);float age=t/(.55+aSeed.y*.2);vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(2.+1.5*aSeed.z);
   vec3 p=CB+vec3(0.,.9,0.)+v*t+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*7.;put(p,.2+.08*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'mix(uC2,uC1,.55)'}));
  // ralentización arrancada: gotas azules que saltan del lanzador y se rompen
  P(L.part,10,K+`void main(){float s=TI+.08+aSeed.x*.1;float t=max(uT-s,0.);float age=t/.5;vec3 v=normalize(rnd()*vec3(1.,.3,1.)+vec3(0.,1.,0.))*(1.8+aSeed.z);
   vec3 p=CB+vec3(0.,1.,0.)+v*t+vec3(0.,-3.*t*t,0.);vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.4,1.,age);vR=atan(v.x,v.y);put(p,.2+.06*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:S.ST_COL.slow}));
  // brillo: chispas sobre la coraza; deshielo: gotas que caen
  P(L.part,14,K+`void main(){float per=.5;float k=(uT-TI-.2)/per+aSeed.x;float c=floor(k);float tt=fract(k);vec3 r=normalize(rr(c)-.5);
   vec3 p=CB+vec3(0.,.92,0.)+r*.82;vR=0.;vK=tt;vA=(k>0.&&uT<${f(TD+0.2)})?sin(tt*3.14):0.;put(p,.16+.06*aSeed.y);}`,
   S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  P(L.part,16,K+`void main(){float s=${f(TD)}+aSeed.x*.4;float t=max(uT-s,0.);vec3 r=normalize(rnd()*vec3(1.,.4,1.));
   vec3 p=CB+vec3(r.x*.75,.5+aSeed.y*.6-2.5*t*t,r.z*.75);vA=(uT>s&&p.y>.03)?1.:0.;vK=0.;vR=3.14159;put(p,.12+.04*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'uC1'}));
  a.pose=function(te,o){
    const ia=te-TI, g=back(cl(ia/0.16)), melt=ss(TD,2.3,te);
    set(frost,ss(0,TI,te)*1.1,ss(0,0.15,te)*(1-ss(TD,2.3,te)));
    shell.visible=ia>=0&&melt<1; shell.scale.set(Math.max(1.35-0.35*g,0.001)*(1+0.05*hitE(ia,10)),Math.max(1.35-0.35*g,0.001)*1.18,Math.max(1.35-0.35*g,0.001));
    shellMat.uniforms.uA.value=ss(0,0.1,ia); shellMat.uniforms.uS.value=te<TB?cl((te-0.62)/0.35):cl((te-TB)/0.4);
    shellMat.uniforms.uEr.value=-0.1+1.15*melt;
    ring1.pose(ia,CX,0,0.55,1); ring2.pose(ia-0.1,CX,0,0.7,1);
    spark.pose(ia,tmp.set(CX,1.0,0.2),0.9);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.4*hitE(ia,7)+0.12*(ia>=0?1-melt:ss(0,TI,te));
    if(ia<0){o.g.set(CX,0.9,0);o.gs=0.5+0.4*ss(0,TI,te);o.ga=0.08;o.li=1.5;}
    else{o.g.set(CX,0.9,0);o.gs=1.3+1.2*Math.min(ia,0.4);o.ga=0.25*Math.exp(-ia*8);o.li=3.5*Math.exp(-ia*5)+0.6*(1-melt);}
    o.ia=ia;o.c.set(CX,0.9,0);o.shake=0;o.dist=0.4;o.flash=0;
  };
}});

// =====================================================================
// 6 · PUMPKIN — +65 de escudo a un aliado y, si le golpean, +1 PA. Una calabaza cae del cielo sobre el aliado y lo
//     encierra; dos bandas de hierro remachadas la blindan, la cara tallada se enciende como un farol y chispas doradas
//     (la guardia de PA) giran a su alrededor; al final la calabaza se consume desde el borde.
// =====================================================================
(function(){
const TI=0.4725,TF=0.126,TB=0.693,TV=1.008,TE=1.9215;
const def={key:"sty_pePumpkin",name:"Pumpkin (estilizado)",dur:2.331,ti:TI,tier:2,pal:"Calabaza",stylized:true,
  variants:[["aliado","Sobre un aliado"],["propio","Sobre sí mismo"]],v:"aliado",vlabel:"Receptor",
  allies:()=>def.v==="propio"?0:1,
  phases:[["Sombra",0],["Caída",TF],["Encierro",TI],["Blindaje",TB],["Vigilia",TV],["Fin",TE]],
build(a){
  const L=a.L,F=anchor(a),R=V3(0,0,0);
  const pump=new THREE.Group(); F.mesh.add(pump);
  const skinMat=smat(`vec3 q=normalize(vP);float an=atan(q.z,q.x);float rib=pow(abs(sin(an*5.)),.6);
   base=mix(uC2*.85,uC1,rib*.8+.1);lb=(rib-.5)*.18;
   vec2 fp=vec2(q.x,q.y);float face=step(.2,q.z);
   float eye=max(step(abs(fp.x-.3)+abs(fp.y-.22)*1.2,.22),step(abs(fp.x+.3)+abs(fp.y-.22)*1.2,.22));
   float my=fp.y+.28-.4*fp.x*fp.x;float mo=step(abs(my),.14)*step(abs(fp.x),.56)*(1.-step(.62,fract(fp.x*3.5+.31))*step(.03,my));
   float hole=face*max(eye,mo);base=mix(base,vec3(.12,.03,.0),hole);
   emi=vec3(1.,.62,.12)*hole*2.;`,{spec:.35,rim:.25});
  const skin=new THREE.Mesh(new THREE.SphereGeometry(0.95,40,28),skinMat); skin.scale.set(1,0.86,1); skin.position.y=0.82;
  const stemMat=smat(`base=vec3(.32,.42,.14);lb=-.05;`,{spec:.1});
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.1,0.32,7).translate(0,0.16,0),stemMat); stem.position.y=1.6; stem.rotation.z=0.25;
  const curl=new THREE.Mesh(new THREE.TorusGeometry(0.14,0.022,5,14,4.2),stemMat); curl.position.set(0.12,1.72,0.05);
  const ironMat=smat(`base=vec3(.34,.33,.38);float rv=step(.85,fract(atan(vP.y,vP.x)*1.91));lb=rv*.35;emi=vec3(1.,.6,.2)*.25;`,{spec:.6,rim:.15});
  const bands=[0,Math.PI/2].map(ry=>{const b=new THREE.Mesh(new THREE.TorusGeometry(1.0,0.07,8,40),ironMat);b.position.y=0.82;b.rotation.y=ry+0.6435;pump.add(b);return b;});
  pump.add(skin,stem,curl);
  const shadow=gp(2.2,0,0,0.016,S.mat(S.FS.CONTACT,{},{mode:'matter'})); F.decal.add(shadow);
  const glowRing=gp(2.4,0,0,0.024,S.mat(RING_COL('vec3(1.,.7,.25)'),{},{mode:'energy'})); F.decal.add(glowRing);
  const gring=S.groundRing(L.decal,3.2);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.15});
  const K=`const float TI=${f(TI)};const float TB=${f(TB)};const float TV=${f(TV)};const float TE=${f(TE)};`;
  P(F.part,16,K+`void main(){float s=TI+aSeed.x*.04;float t=max(uT-s,0.);float age=t/(.5+aSeed.y*.2);float an=aSeed.z*6.2832;
   vec3 p=vec3(cos(an),0.,sin(an))*(.75+.9*(1.-exp(-t*6.)))+vec3(0.,.12+t*.35,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.36+.14*aSeed.y)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // remaches que chispean al cerrarse las bandas
  P(F.part,14,K+`void main(){float s=TB+aSeed.x*.06;float t=max(uT-s,0.);float age=t/.3;vec3 d=normalize(rnd());
   vec3 p=vec3(0.,.82,0.)+d*vec3(.97,.84,.97)+d*t*1.4;vA=(uT>s&&age<1.)?1.:0.;vK=age;vR=0.;put(p,.12+.05*aSeed.w);}`,
   ENERGY_COL(C.spark,'vec3(1.,.72,.35)',1.3),{mode:'energy'});
  // guardia de PA: chispas doradas que orbitan
  P(F.part,9,K+`void main(){float an=aSeed.x*6.2832+uT*2.4;float on=smoothstep(TV-.1,TV+.1,uT)*(1.-smoothstep(TE+.1,TE+.35,uT));
   vec3 p=vec3(cos(an)*1.3,.6+.7*aSeed.y+.12*sin(uT*3.+an*2.),sin(an)*1.15);vR=uT*3.;vK=0.;vA=on;put(p,.22+.06*aSeed.z);}`,
   ENERGY_COL(C.spark,'vec3(1.,.82,.3)',1.35),{mode:'energy'});
  // pepitas al consumirse
  P(F.part,12,K+`void main(){float s=TE-.1+aSeed.x*.3;float t=max(uT-s,0.);vec3 r=normalize(rnd()*vec3(1.,.5,1.));
   vec3 p=vec3(r.x*.75,.5+aSeed.y*.7+t*1.2-4.*t*t,r.z*.75);vA=(uT>s&&p.y>.03)?1.:0.;vK=0.;vR=aSeed.w*6.;put(p,.11+.03*aSeed.w);}`,
   S.MATTER_FS(C.drop,{relief:4,col:'vec3(.95,.85,.6)'}));
  a.setVariant=v=>{def.v=a.v=v==="propio"?"propio":"aliado";};
  a.pose=function(te,o){
    const self=def.v==="propio", ia=te-TI;
    R.set(self?CX:ALLY_POS[0].x,0,self?0:ALLY_POS[0].z); moveF(F,R.x,R.z);
    const rec=self?caster:allies[0];
    { const cp=VFX.camera.position; skin.rotation.y=Math.atan2(cp.x-R.x,cp.z-R.z)-0.25; }
    const k=cl((te-TF)/(TI-TF)), fall=(1-k*k)*5.2, land=ia>=0?hitE(ia,5)*Math.cos(ia*22):0;
    pump.visible=te>TF; pump.position.set(0,ia<0?fall:0,0); pump.rotation.y=ia<0?(1-k)*1.2:0.0;
    pump.scale.set(1+0.16*land,Math.max(1-0.2*land,0.001),1+0.16*land);
    const er=-0.1+1.15*ss(TE-0.05,2.3,te);
    eu(skinMat,er,ia<0?0.05:0.3+0.5*hitE(ia-0.25,3)+(te>TV?0.35+0.25*Math.sin(te*9):0));
    eu(stemMat,er); eu(ironMat,te<TB?2:er,0.6*hitE(te-TB,6));
    bands.forEach((b,i)=>{const bk=back(cl((te-TB-i*0.05)/0.14));b.visible=te>TB+i*0.05;const sc=1+0.5*(1-bk)+0.001;b.scale.set(sc,sc*0.87,sc);});
    shadow.scale.setScalar(Math.max(0.3+0.7*ss(0,TI,te),0.001)); shadow.material.uniforms.uA.value=ss(0,0.2,te)*(1-ss(TE,2.3,te));
    glowRing.visible=te>TV-0.1; glowRing.scale.setScalar(0.9+0.05*Math.sin(te*8)); set(glowRing,0.05+0.9*ss(TE,2.3,te),ss(TV-0.1,TV+0.15,te));
    gring.pose(ia,R.x,R.z,0.45,1);
    spark.pose(ia,tmp.set(R.x,0.3,R.z+0.9),0.8);
    const m=rec.userData.m; m.emissive.setRGB(1,0.6,0.2); m.emissiveIntensity=0.3*hitE(ia,6)+0.1*(te>TV?1-ss(TE,2.3,te):0);
    if(ia<0){o.g.set(R.x,fall+0.7,R.z);o.gs=0.3;o.ga=0.04;o.li=0.8*k;}
    else{o.g.set(R.x,0.8,R.z+0.5);o.gs=1+0.6*Math.min(ia,0.4);o.ga=0.15*Math.exp(-ia*8)+(te>TV?0.06:0);o.li=2.5*Math.exp(-ia*6)+(te>TV&&te<TE?1.2:0);}
    o.ia=ia;o.c.set(R.x,0.8,R.z);o.shake=0.5;o.dist=0.4;o.flash=0;
  };
}};
defs.push(def);
})();

// =====================================================================
// 7 · TURNIP — 54–66 de daño. Un nabo gigante se arranca del suelo junto al lanzador (tierra y hojas), vuela en
//     parábola girando con su sombra y revienta en el rival: trozos de nabo crema y violeta, hojas y tierra.
// =====================================================================
defs.push({key:"sty_peTurnip",name:"Turnip (estilizado)",dur:2.025,ti:0.75,tier:2,pal:"Nabo",stylized:true,
  phases:[["Arranque",0],["Vuelo",0.2625],["Impacto",0.75],["Tierra",0.8625],["Fin",1.5]],
build(a){
  const L=a.L,TI=0.75,TL=0.2625,P0=V3(-2.7,0,0.45),PA=V3(-2.7,0.75,0.45),PM=V3(0.2,3.5,0.25),P1=V3(3.05,1.0,0.05);
  const nabo=new THREE.Group(); L.mesh.add(nabo);
  const bodyMat=smat(`float y=vP.y;base=mix(vec3(.9,.84,.72),mix(uC2,uC1,.35),smoothstep(-.02,.2,y));
   lb=-.06*smoothstep(.02,0.,abs(fract(y*9.)-.5)-.47);emi=uC1*.15;`,{spec:.4,rim:.3});
  const body=new THREE.Mesh(new THREE.LatheGeometry([[0,-0.52],[0.05,-0.42],[0.16,-0.22],[0.29,0.0],[0.32,0.14],[0.26,0.29],[0.12,0.37],[0,0.39]].map(([x,y])=>new THREE.Vector2(x,y)),24),bodyMat);
  const leafMat=smat(LEAF_BODY('vec3(.22,.5,.16)','vec3(.45,.74,.28)',0.6),{spec:.2});
  const lg=new THREE.ShapeGeometry(leafShape(0.6,0.15),1);
  nabo.add(body);
  for(let i=0;i<4;i++){const m=new THREE.Mesh(lg,leafMat);m.position.y=0.34;m.rotation.set(0,i*0.8,(i-1.5)*0.38);nabo.add(m);}
  const hole=gp(1.8,P0.x,P0.z,0.017,S.mat(STAIN('vec3(.36,.26,.16)',.7,.08),{},{mode:'matter'})); L.decal.add(hole);
  const splat=gp(2.6,TX,0,0.019,S.mat(STAIN(EARTH,.55,.15),{},{mode:'matter'})); L.decal.add(splat);
  const shadow=S.contactShadow(L.decal,1.1);
  const gring=S.groundRing(L.decal,3.0);
  const spark=S.hitSpark(L.mesh,1.7,{seed:0.58});
  const K=`const float TI=${f(TI)};const float TL=${f(TL)};const vec3 P0=${v3(P0)};const vec3 PA=${v3(PA)};const vec3 PM=${v3(PM)};const vec3 P1=${v3(P1)};
   vec3 bz(float u){return mix(mix(PA,PM,u),mix(PM,P1,u),u);}`;
  P(L.part,12,K+`void main(){float s=.02+aSeed.x*.15;float t=max(uT-s,0.);float age=t/(.5+aSeed.y*.2);float an=aSeed.z*6.2832;
   vec3 v=vec3(cos(an)*(.8+aSeed.w),2.+aSeed.y*1.5,sin(an)*(.8+aSeed.w));vec3 p=P0+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.w*6.28+t*8.;put(p,.2+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,col:'vec3(.42,.3,.18)'}));
  P(L.part,8,K+`void main(){float s=.0+aSeed.x*.1;float t=max(uT-s,0.);float age=t/.5;float an=aSeed.z*6.2832;
   vec3 p=P0+vec3(cos(an),0.,sin(an))*(.3+.5*(1.-exp(-t*6.)))+vec3(0.,.1+t*.4,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.3+.12*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // tierra que cae del nabo en vuelo
  P(L.part,18,K+`void main(){float s=TL+aSeed.x*(TI-TL);float u=(s-TL)/(TI-TL);float t=uT-s;float age=t/.4;
   vec3 p=bz(u)+rnd()*.15+vec3(0.,-2.5*t*t-.3*t,0.);p.y=max(p.y,.04);vA=(t>0.&&age<1.)?1.:0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.;put(p,.16+.07*aSeed.y);}`,
   S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // reventón: trozos crema y violeta, tierra, hojas
  P(L.part,14,K+`void main(){float s=TI;float t=max(uT-s,0.);float age=t/(.6+aSeed.y*.25);vec3 v=normalize(rnd()+vec3(-.3,.9,0.))*(2.+2.2*aSeed.z);
   vec3 p=P1+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.04);vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*9.;put(p,.3+.12*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'vec3(.9,.84,.72)'}));
  P(L.part,12,K+`void main(){float s=TI;float t=max(uT-s,0.);float age=t/(.6+aSeed.y*.25);vec3 v=normalize(rnd()+vec3(-.2,1.,0.))*(1.8+2.*aSeed.z);
   vec3 p=P1+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.04);vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.w*6.28+t*7.;put(p,.28+.1*aSeed.w);}`,
   S.MATTER_FS(C.shard,{relief:3,col:'mix(uC2,uC1,.35)'}));
  P(L.part,12,K+`void main(){float s=TI+aSeed.x*.05;float t=max(uT-s,0.);float age=t/(.6+aSeed.y*.2);float an=aSeed.z*6.2832;
   vec3 p=vec3(${f(TX)},0.,0.)+vec3(cos(an),0.,sin(an))*(.4+.8*(1.-exp(-t*5.)))+vec3(0.,.15+t*.5,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.42+.16*aSeed.y)*(.6+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  P(L.part,8,K+`void main(){float s=TI;float t=max(uT-s,0.);float age=t/1.;vec3 v=normalize(rnd()+vec3(0.,1.2,0.))*(1.8+aSeed.z);float dr=1.-exp(-t*3.);
   vec3 p=P1+v*dr*.6+vec3(sin(t*5.+aSeed.w*9.)*.2,-max(t-.3,0.)*.9,0.);p.y=max(p.y,.04);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.w*6.28+t*3.;put(p,.26+.06*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.36,.66,.22)'}));
  a.pose=function(te,o){
    const ia=te-TI, up=back(cl(te/TL)), k=cl((te-TL)/(TI-TL));
    nabo.visible=ia<0;
    if(te<TL){nabo.position.set(P0.x,-0.45+(PA.y+0.45)*up,P0.z);nabo.rotation.set(0,0,0.2*Math.sin(te*30)*(1-up));}
    else{bez(PA,PM,P1,k,nabo.position);nabo.rotation.set(0.3*k,0,-k*11);}
    nabo.scale.setScalar(1.55);
    eu(bodyMat,-1,0.2+0.3*k); eu(leafMat,-1,0.1);
    set(hole,-0.1+1.1*ss(0.9,1.6,te),ss(0,0.08,te));
    shadow.pose(nabo.position.x,nabo.position.z,0.5+0.5/(1+nabo.position.y),ia<0&&te>0.1?0.8:0);
    splat.visible=ia>=0; splat.scale.setScalar(Math.max(0.5+0.5*easeO(ia/0.18),0.001)); set(splat,ia>=0?-0.1+1.15*ss(0.6,1.25,ia):0,ia>=0?1:0);
    gring.pose(ia,TX,0,0.42,1);
    spark.pose(ia,P1,1);
    caster.rotation.z=0.14*ss(0,0.12,te)-0.22*ss(TL-0.05,TL+0.08,te)+0.08*ss(TL+0.1,TI,te);
    const h=hitE(ia,6); target.position.x=TX+0.22*h*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-h*0.24*Math.cos(ia*15);
    if(ia<0){o.g.copy(nabo.position);o.gs=0.001;o.ga=0;o.li=0.5;}
    else{o.g.copy(P1);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*14)*0.3;o.li=4*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(P1);o.shake=1;o.dist=1;
  };
}});

// =====================================================================
// 8 · WATERING CAN — +60 de escudo a un aliado. Una regadera de cobre aparece sobre el aliado, se inclina y lo riega;
//     el agua forma un charco del que brotan hojas, y cinco hojas grandes se despliegan a su alrededor como escudo,
//     con un brillo de agua al sellar. Mismo ti tardío que el original (1,23 s).
// =====================================================================
(function(){
const TI=1.2285,TP=0.315,TS=1.0395,TE=1.8585;
const def={key:"sty_peWateringCan",name:"Watering Can (estilizado)",dur:2.2365,ti:TI,tier:2,pal:"Rocío",stylized:true,
  variants:[["aliado","Sobre un aliado"],["propio","Sobre sí mismo"]],v:"aliado",vlabel:"Receptor",
  allies:()=>def.v==="propio"?0:1,
  phases:[["Aparición",0],["Riego",TP],["Brote",0.63],["Escudo",TS],["Sellado",TI],["Fin",TE]],
build(a){
  const L=a.L,F=anchor(a),R=V3(0,0,0),CO=V3(-0.95,2.3,0.35),uSp={value:V3(0,0,0)};
  const can=new THREE.Group(); can.position.copy(CO); F.mesh.add(can);
  const cuMat=smat(`float pat=smoothstep(.55,.75,styNoise(vUv*vec2(2.,1.)+.3).r);base=mix(vec3(.62,.3,.14),vec3(.2,.5,.46),pat*.75);
   lb=-.06;emi=uC1*.15;`,{spec:.6,rim:.12});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.34,0.5,22),cuMat);
  const lid=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.03,6,22),cuMat); lid.rotation.x=Math.PI/2; lid.position.y=0.25;
  const spout=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.055,0.78,8).translate(0,0.39,0),cuMat); spout.position.set(0.24,-0.12,0); spout.rotation.z=-0.95;
  const rose=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.05,0.09,12),cuMat); rose.position.set(0,0.78,0); spout.add(rose);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.032,6,16,Math.PI),cuMat); handle.position.set(-0.3,0.02,0); handle.rotation.z=Math.PI/2;
  can.add(body,lid,spout,handle);
  // punta del pitorro con la regadera ya inclinada (las gotas salen de ahí)
  const TILT=0.62; const tipLocal=V3(0,0.82,0);
  const tipAt=()=>{can.rotation.set(0,0,-TILT);can.updateMatrix();spout.updateMatrix();rose.updateMatrix();
    return tipLocal.clone().set(0,0.04,0).applyMatrix4(rose.matrix).applyMatrix4(spout.matrix).applyMatrix4(can.matrix);};
  const TIP=tipAt(); can.rotation.set(0,0,0);
  // hojas escudo: cinco hojas que se despliegan de tumbadas a erguidas
  const leafMat=smat(LEAF_BODY('vec3(.08,.4,.42)','mix(vec3(.2,.62,.55),uC1,.35)',1.45)+`float fr2=1.-abs(dot(n,V));emi+=uC1*(smoothstep(.45,.8,fr2)*1.4+.25);`,{spec:.55,rim:.2});
  const lg=new THREE.ShapeGeometry(leafShape(1.45,0.4),2);
  const shields=[];for(let i=0;i<5;i++){const piv=new THREE.Group();piv.rotation.y=i/5*Math.PI*2+0.3;const m=new THREE.Mesh(lg,leafMat);
    m.position.set(0,0,0.5);piv.add(m);F.mesh.add(piv);shields.push({piv,m,t:TS+i*0.025});}
  const puddle=gp(2.2,0,0,0.02,S.mat(STAIN('mix(uC2,uC1,.4)',.6,.35),{},{mode:'matter'})); F.decal.add(puddle);
  const gring=S.groundRing(L.decal,3.0);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.48});
  const K=`const float TI=${f(TI)};const float TP=${f(TP)};const float TS=${f(TS)};const float TE=${f(TE)};const vec3 SP=${v3(TIP)};`;
  // agua: gotas que salen del pitorro y caen sobre el aliado
  P(F.part,46,K+`void main(){float per=.42;float k=(uT-.42)/per+aSeed.x;float c=floor(k);float tt=fract(k)*per;vec3 r=rr(c);
   vec3 v=vec3(.9+.5*r.x,-.2+.4*r.y,(r.z-.5)*.7);vec3 p=SP+v*tt+vec3(0.,-6.*tt*tt,0.);
   float on=(k>=0.&&uT-tt<1.02)?1.:0.;vA=(p.y>.05)?on:0.;vec2 vel=vec2(v.x,v.y-12.*tt);vR=atan(vel.x,vel.y);vK=0.;
   put(p,.15+.06*r.z);}`,S.MATTER_FS(C.drop,{relief:4,col:'uC1',bias:.05}));
  P(F.part,16,K+`void main(){float per=.3;float k=(uT-.6)/per+aSeed.x;float c=floor(k);float tt=fract(k);vec3 r=rr(c);
   vec3 p=vec3((r.x-.5)*1.,.05+tt*.5*(.5+r.y),(r.z-.5)*1.);vA=(k>=0.&&uT<1.15)?1.-tt:0.;vK=tt;vR=0.;put(p,.1+.05*r.z);}`,
   ENERGY_COL(C.spark,'uC1',1.2),{mode:'energy'});
  // brotes del charco
  P(F.part,10,K+`void main(){float s=.63+aSeed.x*.3;float t=max(uT-s,0.);float g=1.-pow(1.-clamp(t/.25,0.,1.),3.);float an=aSeed.z*6.2832;
   vec3 p=vec3(cos(an)*(.45+.4*aSeed.w),.08+.22*g,sin(an)*(.45+.4*aSeed.w));vA=(uT>s&&uT<TE+.2)?1.:0.;vK=smoothstep(TE-.1,TE+.25,uT);
   vR=(aSeed.y-.5)*.8;put(p,(.26+.08*aSeed.y)*g);}`,S.MATTER_FS(C.leaf,{relief:3,col:'vec3(.42,.78,.3)'}));
  // gotitas brillantes sobre las hojas escudo
  P(F.part,14,K+`void main(){float per=.45;float k=(uT-TI)/per+aSeed.x;float c=floor(k);float tt=fract(k);vec3 r=rr(c);float an=r.x*6.2832;
   vec3 p=vec3(cos(an)*.62,.35+r.y*1.,sin(an)*.62);vA=(k>=0.&&uT<TE)?sin(tt*3.14):0.;vK=0.;vR=0.;put(p,.14+.05*r.z);}`,
   S.ENERGY_FS(C.spark,{gain:1.25}),{mode:'energy'});
  a.setVariant=v=>{def.v=a.v=v==="propio"?"propio":"aliado";};
  a.pose=function(te,o){
    const self=def.v==="propio", ia=te-TI;
    R.set(self?CX:ALLY_POS[0].x,0,self?0:ALLY_POS[0].z); moveF(F,R.x,R.z);
    const rec=self?caster:allies[0];
    const ap=back(cl(te/0.25)), tl=ss(TP,TP+0.15,te)*(1-ss(1.02,1.2,te));
    can.visible=te<1.42; can.scale.setScalar(Math.max(ap*(1-ss(1.15,1.4,te)),0.001)); can.rotation.set(0,0,-TILT*tl+0.04*Math.sin(te*9));
    can.position.set(CO.x,CO.y+0.05*Math.sin(te*4),CO.z);
    eu(cuMat,-0.1+1.15*ss(1.12,1.4,te),0.2);
    for(const q of shields){const u=back(cl((te-q.t)/0.18));q.piv.visible=te>q.t;q.m.rotation.x=1.45-1.65*u;
      q.m.scale.setScalar(Math.max(0.45+0.55*cl((te-q.t)/0.12),0.001)*(1+0.06*hitE(ia,9)));}
    eu(leafMat,-0.1+1.15*ss(TE,2.2,te),0.2+0.9*hitE(ia,6));
    puddle.scale.setScalar(Math.max(0.3+0.7*ss(0.45,1.0,te),0.001)); set(puddle,-0.1+1.1*ss(TE-0.1,2.22,te),ss(0.45,0.6,te));
    gring.pose(ia,R.x,R.z,0.45);
    spark.pose(ia,tmp.set(R.x,1.0,R.z+0.3),0.85);
    const m=rec.userData.m; m.emissive.copy(U.uC1.value); m.emissiveIntensity=0.4*hitE(ia,6)+0.1*(ia>=0?1-ss(TE,2.2,te):ss(0.5,1,te));
    if(ia<0){o.g.set(R.x+CO.x,CO.y,R.z+CO.z);o.gs=0.4*ap;o.ga=0.05;o.li=1.2*ap;}
    else{o.g.set(R.x,0.9,R.z);o.gs=1.2+ia;o.ga=0.22*Math.exp(-ia*8);o.li=3*Math.exp(-ia*5)+0.5*(1-ss(TE,2.2,te));}
    o.ia=ia;o.c.set(R.x,0.9,R.z);o.shake=0;o.dist=0.3;o.flash=0;
  };
}};
defs.push(def);
})();

// =====================================================================
// 9 · SHIITAKE — veneno en cruz (alcance 1–2). Un racimo de tres shiitakes pardos brota en la casilla; el micelio
//     corre por el suelo en cruz y, al soltar la esporada, anillos de esporas ocres ruedan por los cuatro brazos.
// =====================================================================
defs.push({key:"sty_peShiitake",name:"Shiitake (estilizado)",dur:2.331,ti:0.504,tier:2,pal:"Shiitake",stylized:true,zoneTarget:TILE*1.6,
  phases:[["Brote",0],["Esporada",0.504],["Veneno",0.756],["Fin",1.89]],
build(a){
  const L=a.L,TI=0.504,TE=1.89;
  const stemMat=smat(`base=mix(vec3(.76,.66,.5),vec3(.93,.86,.7),smoothstep(0.,.6,vP.y));lb=-.03;`,{spec:.12});
  const capMat=smat(`vec3 q=normalize(vP);float an=atan(q.z,q.x);vec2 sp=vec2(an*.6,q.y);
   float fl=smoothstep(.7,.74,styNoise(sp*.7+.5).g)*smoothstep(.2,.6,q.y);float rim=smoothstep(.15,.35,1.-q.y);
   base=mix(uC2,mix(uC2,uC1,.45),rim*.5);base=mix(base,vec3(.94,.86,.72),fl*.8);lb=fl*.1;emi=uC1*.12;
   if(vP.y<.03){float gill=step(.5,fract(an*7.));base=mix(vec3(.88,.78,.6),vec3(.7,.58,.42),gill);emi=uC1*.25;}`,{spec:.3,rim:.25});
  const stemG=new THREE.LatheGeometry([[0,0],[0.16,0],[0.12,0.12],[0.1,0.55],[0.11,0.7],[0,0.71]].map(([x,y])=>new THREE.Vector2(x,y)),14);
  const capG=new THREE.LatheGeometry([[0,0.0],[0.35,-0.03],[0.58,0.02],[0.64,0.12],[0.56,0.3],[0.34,0.44],[0,0.48]].map(([x,y])=>new THREE.Vector2(x,y)),26);
  const shrooms=[[0.72,0.42,1.0,0],[-0.72,0.48,0.68,0.08],[0.0,1.0,0.55,0.14]].map(([dx,dz,sc,dl])=>{const g=new THREE.Group();
    const st=new THREE.Mesh(stemG,stemMat),cp=new THREE.Mesh(capG,capMat);cp.position.y=0.66;cp.rotation.z=dx*0.25;g.add(st,cp);
    g.position.set(TX+dx,0,dz);L.mesh.add(g);return {g,cp,sc:sc*1.45,dl};});
  const myc=gp(TILE*3.4,CEN.x,0,0.02,S.mat(`uniform float uK;void main(){vec2 p=(vUv-.5)*${f(TILE*3.4)};
   float a=max(abs(p.x)-${f(TILE*1.5)},abs(p.y)-${f(TILE*.45)});float b=max(abs(p.x)-${f(TILE*.45)},abs(p.y)-${f(TILE*1.5)});
   float sd=min(a,b);float n=styNoise(vUv*2.3).b;float th=smoothstep(.08,0.,abs(n-.5)-.02)+smoothstep(.05,0.,abs(styNoise(vUv*1.4+.3).b-.5)-.015)*.7;
   float reach=smoothstep(uK*${f(TILE*1.7)}+.1,uK*${f(TILE*1.7)}-.4,length(p));
   float m=th*smoothstep(.2,-.3,sd)*reach;if(m<.03)discard;float er=styErode(n*.5+m*.5,uP,.15);
   gl_FragColor=vec4(styRampOf(vec3(.95,.88,.7),.55+.35*m),min(m,1.)*er*uA*.85);}`,{uK:{value:0}},{mode:'matter'})); L.decal.add(myc);
  const stain=gp(TILE*3.4,CEN.x,0,0.022,S.mat(CROSS_FS(.32,'mix(uC2,vec3(.5,.55,.2),.4)'),{uK:{value:0}},{mode:'matter'})); L.decal.add(stain);
  const gring=S.groundRing(L.decal,3.2);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.81});
  const K=`const float TI=${f(TI)};const vec3 CEN=${v3(CEN)};${CROSS_GLSL}`;
  P(L.part,10,K+`void main(){float s=.02+aSeed.x*.15;float t=max(uT-s,0.);float age=t/.45;float an=aSeed.z*6.2832;
   vec3 p=CEN+vec3(0.,0.,.6)+vec3(cos(an),0.,sin(an))*(.4+.5*(1.-exp(-t*6.)))+vec3(0.,.1+t*.4,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;put(p,(.28+.12*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,col:EARTH}));
  // anillos de esporas que ruedan por los brazos de la cruz (y una nube en el centro)
  P(L.part,64,K+`void main(){float ci=floor(aSeed.x*5.);float s=TI+(ci<.5?0.:.05)+aSeed.y*.06;float t=max(uT-s,0.);
   float life=.9+aSeed.z*.3;float age=t/life;float go=1.-pow(1.-clamp(t/.4,0.,1.),2.);
   float an=aSeed.w*6.2832;vec3 ring=vec3(cos(an),0.,sin(an))*(.25+.45*go);
   vec3 p=CEN+cl5(ci)*go+ring*(ci<.5?1.2:.8)+vec3(0.,.22+.25*fract(aSeed.z*7.)+t*.3,0.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=an+t;put(p,(.36+.2*fract(aSeed.w*5.3))*(.5+.7*go));}`,
   S.MATTER_FS(C.puff,{relief:4.5,col:'mix(mix(uC2,uC1,.55),vec3(.55,.6,.18),.4)',erodeSoft:.12}));
  P(L.part,24,K+`void main(){float ci=floor(aSeed.x*5.);float s=TI+.05+aSeed.y*.3;float t=max(uT-s,0.);float age=t/(.7+aSeed.z*.4);
   vec3 p=CEN+cl5(ci)+vec3((aSeed.w-.5)*1.,.3+t*.7+aSeed.z*.4,(fract(aSeed.w*9.1)-.5)*1.);
   vA=(uT>s&&age<1.)?(.5+.5*sin(uT*13.+aSeed.x*40.))*(1.-age):0.;vK=0.;vR=0.;put(p,.08+.04*aSeed.w);}`,
   ENERGY_COL(C.spark,'vec3(1.,.82,.4)',1.3),{mode:'energy'});
  const PZ=S.status(a,"poison",[target],0.756,2.2),ST=[{kind:"poison",env:0}];
  a.pose=function(te,o){
    const ia=te-TI, down=ss(1.45,TE,te);
    for(const q of shrooms){const g=back(cl((te-q.dl)/0.3)),puff=ia>=0?Math.exp(-ia*7)*Math.sin(ia*28):0;
      q.g.visible=te>q.dl&&down<1; q.g.scale.set(Math.max(q.sc*g*(1+0.15*puff),0.001),Math.max(q.sc*g*(1-0.5*down)*(1-0.12*puff),0.001),Math.max(q.sc*g*(1+0.15*puff),0.001));}
    eu(capMat,-0.1+1.15*down,0.3+0.8*hitE(ia,6)); eu(stemMat,-0.1+1.15*down);
    myc.material.uniforms.uK.value=easeO((te-0.15)/0.6); set(myc,-0.1+1.15*ss(1.5,2.25,te),ss(0.12,0.3,te));
    stain.visible=ia>=0; stain.material.uniforms.uK.value=easeO(ia/0.45); set(stain,ia>=0?-0.15+1.2*ss(1.0,1.75,ia):0,ss(0,0.2,ia));
    gring.pose(ia,CEN.x,0,0.45,1);
    spark.pose(ia,tmp.set(CEN.x+0.4,0.85,0.6),0.8);
    const h=hitE(ia,6); target.position.x=TX+0.08*h; target.rotation.z=-h*0.12*Math.cos(ia*13);
    ST[0].env=PZ.pose(te); S.statusGlow(o,ST);
    if(ia<0){o.g.set(CEN.x,0.8,-0.3);o.gs=0.4;o.ga=0.05;o.li=1;}
    else{o.g.set(CEN.x,0.7,0);o.gs=1.3+1.4*ia;o.ga=Math.exp(-ia*10)*0.25;o.li=3*Math.exp(-ia*5)+0.7*ST[0].env;}
    o.ia=ia;o.c.set(CEN.x,0.6,0);o.shake=0.4;o.dist=0.7;
  };
}});

VFX.module("Estilizado · Planta · Espalda",defs);
})();

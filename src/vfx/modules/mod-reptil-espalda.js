// =====================================================================
// MÓDULO · CLASE REPTIL (ESPALDA)
// Estética de clase: hueso fósil, escamas, pantano, constelación de caparazón, calor volcánico y púas de piedra violeta.
// No se dibuja anatomía: velas, caparazones y orejas son PROYECCIONES de energía temporales que nacen de la espalda
// (≈ −3.85, 1.25) o de las orejas del lanzador y se posan sobre el aliado o viajan al rival.
// Todas son de 2 PA (nivel 2): 1,8–2,2 s, sin temblor ni fractura de suelo.
// Contrato: {key,name,pa,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BUBBLE_FS,CROSS_FS,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,SMOKE_FS,FLAME_FS,billboard,towardCam,taperTube}=VFX.lib;
// hueso antiguo: marfil fósil y ocre tostado (no coincide con ninguna paleta existente)
VFX.palette("Hueso Antiguo",["#f4e4c1","#9c6b3a"]);

const CB=V3(-3.85,1.25,0);                                 // espalda del lanzador
const TC=V3(3.15,1.2,0);                                   // pecho del rival
const AP=ALLY_POS[0];                                      // aliado objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const NBD=Object.assign({},NB,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const qbd=(a,b,c,t,o)=>o.set(2*(1-t)*(b.x-a.x)+2*t*(c.x-b.x),2*(1-t)*(b.y-a.y)+2*t*(c.y-b.y),2*(1-t)*(b.z-a.z)+2*t*(c.z-b.z));
const cb=(a,b,c,d,t,o)=>{const u=1-t,A=u*u*u,B=3*u*u*t,C=3*u*t*t,D=t*t*t;return o.set(A*a.x+B*b.x+C*c.x+D*d.x,A*a.y+B*b.y+C*c.y+D*d.y,A*a.z+B*b.z+C*c.z+D*d.z);};
const cbd=(a,b,c,d,t,o)=>{const u=1-t,A=3*u*u,B=6*u*t,C=3*t*t;return o.set(A*(b.x-a.x)+B*(c.x-b.x)+C*(d.x-c.x),A*(b.y-a.y)+B*(c.y-b.y)+C*(d.y-c.y),A*(b.z-a.z)+B*(c.z-b.z)+C*(d.z-c.z));};
const QB=`vec3 qb(vec3 a,vec3 b,vec3 c,float t){float u=1.-t;return u*u*a+2.*u*t*b+t*t*c;}`;
const CBZ=`vec3 cbz(vec3 a,vec3 b,vec3 c,vec3 d,float t){float u=1.-t;return u*u*u*a+3.*u*u*t*b+3.*u*t*t*c+t*t*t*d;}`;
const allyGlow=(i,k,col)=>{const m=allies[i].userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}`;
// celdas de Voronoi 3D (F1,F2): placas de costra, cuentas de escama
const VOR3=`vec2 vor3(vec3 p){vec3 i=floor(p),fp=fract(p);float d1=8.,d2=8.;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(float(x),float(y),float(z));
  vec3 o=vec3(hash(i+g),hash(i+g+17.3),hash(i+g+41.7));float d=length(g+o-fp);
  if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return vec2(d1,d2);}`;
// púa / espina en sprite: vMix = ángulo en pantalla
const THORN_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=.07*(1.-smoothstep(-.45,.45,q.x))+.004;float a=smoothstep(w,w*.25,abs(q.y))*step(abs(q.x),.47)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,uC2,smoothstep(-.1,.45,q.x))*1.4,a);}`;
// gota (mezcla normal); col = color GLSL
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.34,.28,d)*vA;if(a<.003)discard;float hl=smoothstep(.09,0.,length(q-vec2(-.08,.0)));
 gl_FragColor=vec4(${col}*(.7+.45*vMix)*(1.15-d*1.2)+vec3(1.)*hl*.6,a);}`;

// =====================================================================
// 1 · BONE SAIL — polvo de médula sube de la espalda y viaja en una cinta hasta el aliado; sobre él se despliega una
//     vela ósea espectral (proyección, no anatomía) que se pliega en una cúpula de costillas con espinas de retorno
// =====================================================================
const sail={key:"reBoneSail",name:"Bone Sail",pa:2,dur:2.2,ti:0.78,pal:"Hueso Antiguo",allies:1,
  phases:[["Médula",0],["Corriente",0.2],["Vela",0.56],["Escudo",1.05],["Espinas",1.25],["Disolución",1.8]],
build(a){
  const L=a.L,TR=0.2,TV=0.56,TI=0.78,TS=1.05,TP=1.25,TX=1.8,TE=2.15;
  const O=V3(AP.x-0.05,0.95,AP.z), DC=V3(AP.x,0.6,AP.z), DR=0.95;
  const P0=V3(-3.85,1.45,0),P1=V3(-2.9,3.2,-0.9),P2=V3(AP.x-0.05,2.25,AP.z);
  // cinta de polvo de hueso: se revela (uP) y se borra desde la cola (uQ)
  const ribbon=new THREE.Mesh(taperTube(new THREE.QuadraticBezierCurve3(P0,P1,P2),70,6,0.055,0.03),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float d=uP-u;
   float n=noise(vec3(u*34.-uT*9.,vUv.y*6.,0.));float head=exp(-d*16.);
   float al=(.25+.75*smoothstep(.35,.75,n))*(.35+.65*head)*smoothstep(uQ,uQ+.12,u);
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*n)*1.3+vec3(1.)*head*.6,al*uA);}`,{uQ:{value:0}}));
  L.trail.add(ribbon);
  // vela: membrana en abanico (plano xy, de cara a cámara) con festón entre varillas; uP = semiángulo abierto
  const sailG=new THREE.Group(); L.mesh.add(sailG);
  const A0=0.6, AL=1.94, NR=7;
  const memb=new THREE.Mesh(new THREE.RingGeometry(0.42,1.5,48,6,A0,AL),fx(`
  void main(){vec2 p=vP.xy;float r=length(p);float an=atan(p.y,p.x);if(abs(an-1.5708)>uP)discard;
   float k=(an-${f(A0)})/${f(AL/(NR-1))};float fk=fract(k);float dk=min(fk,1.-fk);
   float rmax=1.4-.2*sin(3.14159*fk);if(r>rmax)discard;
   float ribD=dk*${f(AL/(NR-1))}*r;float rib=smoothstep(.045,0.,ribD);
   float vein=pow(1.-abs(noise(vec3(an*18.,r*3.,1.))*2.-1.),10.)*.6;
   float n=noise(vec3(p*5.,uT*.6));float edge=band(r,rmax-.02,.035)+band(abs(an-1.5708),uP,.03)*.6;
   float al=.16+.12*n+vein*.25+rib*.7+edge*.8;
   gl_FragColor=vec4(mix(uC2,uC1,.35+.5*r/1.5+rib*.3)*1.25+vec3(1.)*rib*.25,al*uA);}`));
  sailG.add(memb);
  // varillas de hueso espectral (crecen escalonadas desde el centro)
  const ribGeo=new THREE.CylinderGeometry(0.016,0.05,1.25,8).translate(0,0.625,0);
  const ribMat=fx(`void main(){float h=vP.y/1.25;float ring=band(fract(h*7.),.5,.08)*.5;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,.55+.45*h)*1.4+vec3(1.)*(ring*.3+smoothstep(.9,1.,h)*.6),(.55+.45*fr+ring)*uA);}`);
  const ribs=[...Array(NR)].map((_,i)=>{const an=A0+AL*i/(NR-1),m=new THREE.Mesh(ribGeo,ribMat);
    m.position.set(Math.cos(an)*0.4,Math.sin(an)*0.4,0); m.rotation.z=an-Math.PI/2; m.userData={d:Math.abs(i-3)*0.035}; sailG.add(m); return m;});
  // cúpula de costillas: meridianos y anillos de hueso; uP = onda desde la cima, uQ = disolución
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,44,28),fxU(`uniform float uQ;
  void main(){vec3 n=normalize(vP);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float an=atan(n.z,n.x);float el=asin(clamp(n.y,-1.,1.));
   float rib=pow(abs(cos(an*6.)),70.)*smoothstep(-.2,.1,n.y);float lat=pow(abs(cos(el*5.)),50.)*.6;
   float grain=noise(n*14.);float dz=noise(n*5.+3.)-uQ*1.1+.05;if(dz<0.)discard;
   float edge=smoothstep(.07,0.,dz)*step(.001,uQ);float wave=band(n.y,1.-uP*2.2,.12)*step(uP,.99);
   float al=pow(fr,2.2)*.75+(rib+lat)*(.45+.3*grain)+.04+wave*.6+edge*1.2;
   gl_FragColor=vec4(mix(uC2,uC1,.45+.4*fr+rib*.2)*1.25+vec3(1.)*(edge+wave)*.5,al*uA);}`,{uQ:{value:0}}));
  dome.position.copy(DC); L.mesh.add(dome);
  // espinas de retorno sobre la cúpula
  const spGeo=new THREE.ConeGeometry(0.055,0.34,8).translate(0,0.17,0);
  const spMat=fx(`void main(){float h=vP.y/.34;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,h)*1.5+vec3(1.)*smoothstep(.75,1.,h)*.8,(.6+.4*fr)*uA);}`);
  const spikes=[...Array(13)].map((_,i)=>{const y=0.22+0.74*((i+0.5)/13),r=Math.sqrt(1-y*y),an=i*2.39996+0.4;
    const d=V3(Math.cos(an)*r,y,Math.sin(an)*r),m=new THREE.Mesh(spGeo,spMat);m.quaternion.setFromUnitVectors(YA,d);
    m.userData={d,t:TP+0.025*(i%7)};L.mesh.add(m);return m;});
  // sello óseo bajo el aliado: anillos, púas radiales y vértebras
  const sigil=groundPlane(3.0,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.92,.018)+band(r,.78,.01);
   float k=fract(an/6.2832*18.);
   float sp=smoothstep(.18,0.,abs(k-.5)*2.-(r-.62)*1.2)*step(.62,r)*step(r,.9);
   float vert=band(r,.45,.05)*step(.35,fract(an/6.2832*24.));
   m=(m+sp*.8+vert*.6)*step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.5)*1.35,m*uA);}`)); sigil.position.z=AP.z;
  const shock=groundPlane(3.4,AP.x,0.03,fx(RING_FS)); shock.position.z=AP.z;
  L.decal.add(sigil,shock);

  const C=`const float TR=${f(TR)};const float TV=${f(TV)};const float TI=${f(TI)};const float TS=${f(TS)};const float TX=${f(TX)};
  const vec3 CB=${v3(CB)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 O=${v3(O)};const vec3 DC=${v3(DC)};`+QB;
  // médula: motas que suben en espiral desde la espalda
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*.28;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*7.;vec3 p=CB+vec3(cos(an)*(.32-.2*age),.1+t*1.6,sin(an)*(.32-.2*age));
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.035*aSeed.w);}`);
  // polvo de hueso que se suelta a lo largo de la cinta
  a.count+=points(L.part,90,C+`void main(){float k=aSeed.x;float s=TR+k*(TV-TR);float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(P0,P1,P2,k)+rnd()*.06+vec3(0.,-.25*t,0.)+rnd()*.25*t;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.04*aSeed.w)*(1.-age*.4));}`);
  a.count+=points(L.part,25,C+`void main(){float k=aSeed.x;float s=TR+k*(TV-TR);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(P0,P1,P2,k)+rnd()*.08+vec3(0.,-.9*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.08+.05*aSeed.w);}`,CHIP_FS);
  // despliegue: chispas desde la base de la vela y motas que se pliegan hacia la cúpula
  a.count+=sparks(L.part,70,TI,`${f(O.x)},${f(O.y+0.6)},${f(O.z)}`,"0.,1.,0.",2,5.5,1.6);
  a.count+=points(L.part,60,C+`void main(){float s=TS+aSeed.x*.15;float life=.32+aSeed.y*.12;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=.6+aSeed.z*1.94;vec3 p0=O+vec3(cos(an),sin(an),0.)*(.5+.9*aSeed.w);vec3 d=normalize(rnd()+vec3(0.,.4,0.));
   vec3 p1=DC+d*vec3(.95,1.1,.95);vec3 p=mix(p0,p1,k*k*(3.-2.*k))+vec3(0.,.3*sin(k*3.14159),0.);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.04+.035*aSeed.y);}`);
  a.count+=sparks(L.part,60,TP,`${f(DC.x)},${f(DC.y+0.5)},${f(DC.z)}`,"0.,.5,0.",2.2,5,1.2);
  // destellos en las puntas de las espinas mientras dura el escudo
  a.count+=points(L.part,26,C+`void main(){float life=.5+aSeed.y*.3;float k=(uT-TS-.25)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float y=.22+.74*r.x;float rd=sqrt(1.-y*y);float an=r.y*6.2832;vec3 d=vec3(cos(an)*rd,y,sin(an)*rd);
   vec3 p=DC+d*vec3(1.3,1.45,1.3);vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.12+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // disolución en polvo de hueso
  a.count+=points(L.part,70,C+`void main(){float s=TX+aSeed.x*.3;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=DC+d*vec3(.95,1.1,.95)+d*.4*t+vec3(0.,.35*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.035+.04*aSeed.w);}`);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, open=ss(TV,TI,te), fold=ss(TS,TP,te), ds=ss(TS-0.05,TP,te), q=ss(TX,TE,te);
    caster.rotation.z=0.1*ss(0,TR,te)-0.12*ss(TR,TR+0.2,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,0.12,te)*(1-ss(TR,TV,te));
    ribbon.visible=te>TR&&te<TI+0.3; set(ribbon,cl((te-TR)/(TV-TR))*1.02,1); ribbon.material.uniforms.uQ.value=ss(TV-0.12,TI+0.25,te)*1.02;
    // vela: sube y se abre; al plegarse baja y encoge hacia la cúpula
    sailG.visible=te>TV&&fold<0.999;
    sailG.position.set(O.x,O.y+0.12*open-0.45*fold,O.z); sailG.scale.setScalar(Math.max((0.75+0.25*open)*(1-0.55*fold),0.001));
    set(memb,open*(1-fold)*0.97,(0.8+0.6*hitK(ia,5))*(1-fold));
    for(const r of ribs){const g=ss(TV+r.userData.d,TV+r.userData.d+0.2,te)*(1-fold);r.visible=g>0.01;r.scale.set(1,Math.max(g,0.001),1);}
    ribMat.uniforms.uA.value=0.85+0.6*hitK(ia,5);
    // cúpula y espinas
    dome.visible=ds>0.01&&q<0.999; dome.scale.set(DR*ds,DR*1.15*ds,DR*ds);
    set(dome,cl((te-TS)/0.45),0.65+0.7*hitK(te-TP,5)*(te>=TP?1:0)); dome.material.uniforms.uQ.value=q;
    for(const s of spikes){const u=s.userData,k=ss(u.t,u.t+0.12,te)*(1-q),ov=1+0.35*Math.sin(Math.PI*cl((te-u.t)/0.22));
      s.visible=k>0.01; s.position.set(DC.x+u.d.x*DR*ds,DC.y+u.d.y*DR*1.15*ds,DC.z+u.d.z*DR*ds); s.scale.setScalar(Math.max(k*ov,0.001));}
    spMat.uniforms.uA.value=0.9+0.6*hitK(te-TP,6)*(te>=TP?1:0);
    const env=ss(TP,TP+0.2,te)*(1-ss(TX,TE,te)); U.uE.value=env;
    set(sigil,ss(TV,TI+0.2,te),0.8*ss(TV,TV+0.2,te)*(1-ss(TX,TE,te)));
    const p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    allyGlow(0,0.35*hitK(ia,4)+0.18*env*(0.7+0.3*Math.sin(te*8))+0.3*hitK(te-TP,6)*(te>=TP?1:0));
    if(te<TR){o.g.copy(CB).y+=0.3;o.gs=0.7;o.ga=0.3*ss(0,0.1,te);o.li=1.6;}
    else if(te<TV){qb(P0,P1,P2,cl((te-TR)/(TV-TR)),sp);o.g.copy(sp);o.gs=0.8;o.ga=0.35;o.li=2;}
    else if(te<TS){o.g.set(O.x,O.y+0.8,O.z);o.gs=1.4+2*cl(ia/0.4)*(ia>0?1:0);o.ga=0.25+0.45*hitK(ia,7);o.li=2.5+5*hitK(ia,5);}
    else{o.g.copy(DC).y+=0.3;o.gs=2.2;o.ga=0.12+0.15*env+0.4*hitK(te-TP,7)*(te>=TP?1:0);o.li=1.5+2*env+4*hitK(te-TP,5)*(te>=TP?1:0);}
    o.ia=ia; o.c.set(AP.x,1.3,AP.z); o.shake=0; o.dist=0.45; o.flash=0;
  };
}};

// =====================================================================
// 2 · CROC — el suelo bajo el aliado se vuelve ciénaga; unas fauces de caimán ancestral (espectrales) emergen
//     y se cierran en torno a él, lo arrastran una casilla hacia el lanzador y se hunden dejando una corona de
//     dientes ensangrentados como escudo (sangrado al atacante)
// =====================================================================
const croc={key:"reCroc",name:"Croc",pa:2,dur:2.2,ti:0.82,pal:"Musgo",allies:1,
  phases:[["Ciénaga",0],["Emersión",0.5],["Mordisco",0.82],["Arrastre",0.92],["Hundimiento",1.35],["Corona",1.55]],
build(a){
  const L=a.L,TE=0.5,TI=0.82,TD=0.92,TDE=1.32,TK=1.35,TKE=1.62,TF=1.95,END=2.2;
  const DIR=V3(-3.7-AP.x,0,-AP.z).normalize(), DRAG=1.0, AP2=V3(AP.x+DIR.x*DRAG,0,AP.z+DIR.z*DRAG);
  const apos=(te,out)=>{const k=ss(TD,TDE,te);return out.set(AP.x+DIR.x*DRAG*k,0,AP.z+DIR.z*DRAG*k);};
  // mandíbula: perfil de hocico con osteodermos y fila de dientes cónicos, extruido
  const sh=new THREE.Shape(); sh.moveTo(0,0);
  [[-0.46,0.05],[-0.55,0.42],[-0.5,0.88],[-0.42,1.32],[-0.3,1.72],[-0.15,2.02],[-0.02,2.12]].forEach(p=>sh.lineTo(p[0],p[1]));
  for(let i=0;i<9;i++){const y=1.95-i*0.2;sh.lineTo(0,y+0.06);sh.lineTo(0.13-(i%2)*0.04,y-0.02);sh.lineTo(0,y-0.1);}
  sh.lineTo(0,0);
  const jawGeo=new THREE.ExtrudeGeometry(sh,{depth:0.26,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.035,bevelSegments:2,curveSegments:4}).translate(0,0,-0.13);
  // piel acorazada oscura, dientes de marfil; uP = brillo espectral del borde
  const jawMat=fx(`void main(){vec2 p=vP.xy;float tooth=smoothstep(-.01,.025,p.x);
   vec2 q=p*vec2(7.,5.);float r=floor(q.y);q.x+=.5*mod(r,2.);vec2 c=vec2(fract(q.x)-.5,fract(q.y)-.5);
   float bump=smoothstep(.55,.1,length(c));float knob=smoothstep(.2,0.,length(c))*step(.55,hash(vec3(floor(q),1.)));
   vec3 hide=mix(vec3(.04,.07,.03),vec3(.2,.27,.1),bump)+vec3(.16,.22,.08)*knob;
   vec3 col=mix(hide,vec3(.86,.83,.68),tooth);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   col=col*${LIT}+uC1*(fr*.9+tooth*.35)*uP+uC2*fr*.5;
   gl_FragColor=vec4(col,(.8+.2*tooth)*uA);}`,NBD);
  const jaws=[1,-1].map(s=>{const g=new THREE.Group(),m=new THREE.Mesh(jawGeo,jawMat);m.scale.x=s;g.add(m);g.userData={s};L.mesh.add(g);return g;});
  // corona de dientes (escudo): conos de marfil con punta ensangrentada (rojo fijo: sangrado)
  const toothGeo=new THREE.ConeGeometry(0.07,0.44,8).translate(0,0.22,0);
  const toothMat=fx(`void main(){float h=vP.y/.44;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   vec3 c=mix(vec3(.9,.86,.7),vec3(.75,.04,.05),smoothstep(.62,.85,h))*${LIT}+uC1*fr*.5;
   gl_FragColor=vec4(c,uA);}`,NBD);
  const crown=new THREE.Group(); L.mesh.add(crown);
  const teeth=[...Array(10)].map((_,i)=>{const an=i/10*Math.PI*2,m=new THREE.Mesh(toothGeo,toothMat);
    m.position.set(Math.cos(an)*0.62,0,Math.sin(an)*0.62); m.rotation.set(Math.sin(an)*0.38,0,-Math.cos(an)*0.38); m.userData={d:i*0.02};crown.add(m);return m;});
  // escudo de escamas tenue alrededor del aliado
  const shield=new THREE.Mesh(new THREE.SphereGeometry(0.9,40,24),fx(`void main(){vec3 n=normalize(vP);
   vec2 q=vec2(atan(n.z,n.x)*4.,n.y*7.);float r=floor(q.y);q.x+=.5*mod(r,2.);vec2 c=vec2(fract(q.x)-.5,fract(q.y));
   float sc=band(length(c*vec2(1.,1.3)),.5,.07);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.3,(fr*.6+sc*.35+.03)*uA);}`));
  L.mesh.add(shield);
  // ciénaga (mezcla normal) + ondas (aditivo) bajo el aliado; estela de lodo del arrastre
  const swamp=groundPlane(2.6,AP.x,0.014,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*6.,uT*.4))*.6+noise(vec3(p*15.,2.))*.4;float m=smoothstep(1.,.45,r/max(uP,.01)+(n-.5)*.35);
   gl_FragColor=vec4(mix(vec3(.03,.06,.02),vec3(.12,.16,.06),n),m*.75*uA);}`,NB));
  const ripple=groundPlane(2.6,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float w=band(fract(r*2.2-uT*1.3),.5,.08)*smoothstep(1.,.3,r)*step(r,uP);
   float lily=smoothstep(.8,.9,noise(vec3(p*9.,uT*.3)))*smoothstep(.9,.3,r)*.4;
   gl_FragColor=vec4(mix(uC2,uC1,w)*1.2,(w*.55+lily)*uA);}`));
  const wake=groundPlane(DRAG+0.9,0,0.016,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*12.,vUv.y*5.,1.));float m=smoothstep(.75+.2*n,.2,v)*step(u,uP)*smoothstep(0.,.15,u)*smoothstep(1.,.85,u);
   gl_FragColor=vec4(mix(vec3(.05,.07,.03),vec3(.16,.2,.08),n),m*.65*uA);}`,NB),0.75);
  wake.position.set((AP.x+AP2.x)/2,0.016,(AP.z+AP2.z)/2); wake.rotation.y=Math.atan2(-DIR.z,DIR.x);
  const snapRing=groundPlane(3.2,AP.x,0.03,fx(RING_FS));
  L.decal.add(swamp,ripple,wake,snapRing);

  const C=`const float TE=${f(TE)};const float TI=${f(TI)};const float TD=${f(TD)};const float TDE=${f(TDE)};const float TK=${f(TK)};const float TKE=${f(TKE)};const float TF=${f(TF)};
  const vec3 AP=${v3(AP)};const vec3 AP2=${v3(AP2)};
  vec3 apos(float t){float k=clamp((t-TD)/(TDE-TD),0.,1.);k=k*k*(3.-2.*k);return mix(AP,AP2,k);}`;
  // burbujas de la ciénaga
  a.count+=points(L.part,40,C+`void main(){float life=.5+aSeed.y*.3;float k=uT/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rd=.15+.8*sqrt(r.y);vec3 p=AP+vec3(cos(an)*rd,.03+age*.25,sin(an)*rd);
   vA=(uT<TI+.1)?sin(age*3.14159)*smoothstep(.05,.3,uT):0.;put(p,.07+.06*r.z);}`,BUBBLE_FS);
  // salpicadura de agua turbia al emerger y al hundirse
  for(const [t0,n] of [[TE+0.04,90],[TK+0.05,50]])
    a.count+=points(L.part,n,C+`void main(){float s=${f(t0)}+aSeed.x*.1;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 c0=apos(s);float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.8+1.4*aSeed.w),2.6+2.*aSeed.y,sin(an)*(.8+1.4*aSeed.w));
     vec3 p=c0+vec3(cos(an)*.55,.05,sin(an)*.55)+v*t+vec3(0.,-7.*t*t,0.);
     vA=(age>0.&&age<1.&&p.y>0.)?1.-age*.5:0.;put(p,.07+.05*aSeed.w);}`,DROP_FS("mix(vec3(.25,.35,.18),uC1,.25)"),NB);
  // chasquido del mordisco
  a.count+=sparks(L.part,60,TI,`${f(AP.x)},1.3,${f(AP.z+0.5)}`,"0.,.6,.3",2,5,2.2);
  // lodo levantado durante el arrastre
  a.count+=points(L.part,50,C+`void main(){float s=TD+aSeed.x*(TDE-TD);float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=apos(s)+vec3(rnd().x*.5,.05+.35*(1.-exp(-t*4.)),rnd().z*.5);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.2+.16*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // gotas de sangre que resbalan por los dientes de la corona (sangrado al atacante)
  a.count+=points(L.part,30,C+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TKE)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=floor(r.x*10.)/10.*6.2832;vec3 p=AP2+vec3(cos(an)*.78,.38-.36*age*age,sin(an)*.78);
   vA=(k>=1.)?(1.-age)*uE:0.;put(p,.05+.02*r.z);}`,DROP_FS("vec3(.7,.03,.05)"),NB);
  a.count+=points(L.part,20,C+`void main(){float life=.6+aSeed.y*.4;float k=(uT-TKE)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=floor(r.x*10.)/10.*6.2832;vec3 p=AP2+vec3(cos(an)*.78,.42,sin(an)*.78);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.12+.08*r.y);}`,STAR4_FS);

  const ap=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI; apos(te,ap);
    caster.rotation.z=0.08*ss(0,0.25,te)-0.12*ss(TD,TD+0.2,te)+0.04*ss(TDE,TK,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.2,te)*(1-ss(0.3,0.6,te));
    // el aliado es arrastrado hacia el lanzador entre las fauces
    allies[0].position.copy(ap); allies[0].rotation.z=te>=TD&&te<TDE?0.08*Math.sin((te-TD)*20)*(1-ss(TD,TDE,te)):0;
    // fauces: suben abiertas, se cierran de golpe, viajan y se hunden
    const rise=ss(TE,TI-0.06,te), sink=ss(TK,TKE,te), close=ss(TI-0.06,TI,te), ang=0.62*(1-close)+0.06*close+0.03*Math.sin(te*30)*(te>TI&&te<TDE?1:0);
    for(const g of jaws){const s=g.userData.s;g.visible=te>TE&&sink<0.999;
      g.position.set(ap.x-0.13*s,-2.35+2.1*rise-2.4*sink,ap.z+0.62); g.rotation.z=ang*s;}
    jawMat.uniforms.uP.value=0.5+1.2*hitK(ia,4); jawMat.uniforms.uA.value=1;
    // corona de dientes y escudo de escamas
    const cr=ss(TK,TKE,te)*(1-ss(TF,END,te));
    crown.visible=cr>0.01; crown.position.copy(ap);
    for(const t of teeth){const k=ss(TK+t.userData.d,TK+t.userData.d+0.18,te)*(1-ss(TF,END,te));t.visible=k>0.01;t.scale.set(1,Math.max(k,0.001),1);}
    toothMat.uniforms.uA.value=1;
    shield.visible=cr>0.01; shield.position.set(ap.x,0.75,ap.z); shield.scale.set(1,1.18,1); set(shield,0,cr*0.8);
    U.uE.value=cr;
    // suelo: la ciénaga sigue al aliado
    for(const d of [swamp,ripple,snapRing])d.position.set(ap.x,d.position.y,ap.z);
    set(swamp,ss(0,0.45,te),1-ss(TK,TF,te)); set(ripple,ss(0.05,0.5,te),0.8*(1-ss(TK,TF,te)));
    set(wake,cl((te-TD)/(TDE-TD)),te>=TD?1-ss(TF-0.2,END,te):0);
    const p=cl(ia/0.45); set(snapRing,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    allyGlow(0,0.4*hitK(ia,5)+0.22*cr*(0.7+0.3*Math.sin(te*7)));
    if(te<TE){o.g.set(AP.x,0.3,AP.z);o.gs=1.2*ss(0,0.4,te);o.ga=0.22;o.li=1.4;}
    else if(te<TK){o.g.set(ap.x,1.1,ap.z+0.5);o.gs=1.4+1.5*hitK(ia,6);o.ga=0.25+0.45*hitK(ia,7);o.li=2+6*hitK(ia,5);}
    else{o.g.set(ap.x,0.8,ap.z);o.gs=1.8;o.ga=0.15+0.15*cr;o.li=1.5+2*cr;}
    o.ia=ia; o.c.set(ap.x,1.0,ap.z); o.shake=0; o.dist=0.5; o.flash=0;
  };
}};

// =====================================================================
// 3 · GREEN THORNS — la espalda se eriza de espinas; seis dardos vegetales salen en andanada, suben en arco y
//     llueven en vertical sobre la casilla del rival; cada impacto revienta en veneno púrpura; el lanzador se cura
// =====================================================================
const thorns={key:"reGreenThorns",name:"Green Thorns",pa:2,dur:2.0,ti:0.83,pal:"Toxina",
  phases:[["Erizado",0],["Andanada",0.26],["Lluvia",0.83],["Veneno",1.2],["Fin",1.7]],
build(a){
  const L=a.L,N=6,TL0=0.26,FL=0.57,TI=0.83,TH=1.15,TEND=1.75;
  const EN=[[3.28,1.82,0.06,0],[3.62,0.02,0.62,1],[3.12,1.32,-0.22,0],[3.95,0.02,-0.5,1],[2.85,0.02,0.34,1],[3.4,1.55,0.26,0]];
  const tl=i=>TL0+i*0.06, th=i=>tl(i)+FL;
  const P0=[...Array(N)].map((_,i)=>V3(-3.95+0.05*i,1.5+0.06*(i%2),(i-2.5)*0.12));
  const P1=EN.map((e,i)=>V3(e[0]-1.7+0.2*i,5.0+0.35*(i%3),e[2]*0.5));
  const P2=EN.map(e=>V3(e[0],e[1],e[2]));
  // dardo: espina verde que vira a púrpura en la punta, con estrías
  const dartGeo=new THREE.ConeGeometry(0.06,0.56,8).translate(0,0.28,0);
  const dartMat=fx(`void main(){float h=vP.y/.56;float an=atan(vP.z,vP.x);float st=.75+.25*abs(sin(an*4.));
   vec3 c=mix(vec3(.1,.42,.12),uC2*1.1,smoothstep(.35,.9,h))*st;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+uC1*fr*.6+uC2*smoothstep(.85,1.,h)*.8,1.);}`,SOLID);
  const darts=[...Array(N)].map(()=>{const m=new THREE.Mesh(dartGeo,dartMat);L.mesh.add(m);return m;});
  // anillos de impacto y charco de veneno bajo el rival (centrado)
  const rings=[...Array(N)].map((_,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),fx(RING_FS));L.mesh.add(m);return m;});
  const puddle=groundPlane(2.8,3.4,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,uT*.5))*.6+noise(vec3(p*18.,3.))*.4;float m=smoothstep(1.,.4,r/max(uP,.01)+(n-.5)*.4);
   gl_FragColor=vec4(mix(vec3(.08,.02,.12),uC2*.35,n),m*.6*uA);}`,NB));
  const bubbleSkin=groundPlane(2.8,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   vec2 g=p*14.;vec2 c=fract(g)-.5;float h=hash(vec3(floor(g),1.));float ph=fract(uT*(.6+h)+h*7.);
   float b=band(length(c),.15+.25*ph,.04)*step(.6,h)*(1.-ph)*smoothstep(.9,.3,r)*step(r,uP);
   float rim=band(r,uP*.95,.05);
   gl_FragColor=vec4(mix(uC2,uC1,b)*1.4,(b+rim*.4)*uA);}`));
  L.decal.add(puddle,bubbleSkin);

  const DF=`void dart(float i,out vec3 a,out vec3 b,out vec3 c,out float t0){`+P0.map((_,i)=>`${i<N-1?`if(i<${i}.5)`:``}{a=${v3(P0[i])};b=${v3(P1[i])};c=${v3(P2[i])};t0=${f(tl(i))};return;}`).join("")+`}`;
  const C=`const float FL=${f(FL)};const float TI=${f(TI)};const float TH=${f(TH)};const vec3 CB=${v3(CB)};`+QB+DF;
  // erizado: espinas que brotan de la espalda en abanico
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.22;float life=.3+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=1.2+aSeed.z*1.9;vec3 d=vec3(cos(an)*.9,sin(an),(aSeed.w-.5)*1.2);
   vec3 p=CB+vec3(0.,.15,0.)+d*(.12+.35*(1.-exp(-t*9.)));
   vA=(age>0.&&age<1.)?(1.-age*age):0.;put(p,.16+.08*aSeed.w);vMix=-an/6.2832+.5;}`,THORN_FS);
  // estela de cada dardo: semillas verdes y púrpuras a lo largo de la parábola
  a.count+=points(L.part,150,C+`void main(){vec3 A,B,Cc;float t0;dart(floor(aSeed.x*5.999),A,B,Cc,t0);
   float lag=aSeed.y*.2;float k=(uT-t0)/FL-lag;vec3 p=qb(A,B,Cc,clamp(k,0.,1.))+rnd()*.03*(1.+lag*6.);
   vA=(k>0.&&k<1.)?(1.-lag/.2)*.9:0.;put(p,(.05+.03*aSeed.z)*(1.-lag*2.5));}`);
  // impacto: salpicadura de veneno y burbujas púrpuras
  a.count+=points(L.part,108,C+`void main(){float i=floor(aSeed.x*5.999);vec3 A,B,Cc;float t0;dart(i,A,B,Cc,t0);
   float s=t0+FL;float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 v=vec3(cos(an)*(.6+.9*aSeed.w),1.4+1.2*aSeed.y,sin(an)*(.6+.9*aSeed.w));
   vec3 p=Cc+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.04*aSeed.w);}`,DROP_FS("mix(uC2,vec3(.75,.35,1.),.3)"),NB);
  a.count+=points(L.part,54,C+`void main(){float i=floor(aSeed.x*5.999);vec3 A,B,Cc;float t0;dart(i,A,B,Cc,t0);
   float s=t0+FL+aSeed.y*.08;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=Cc+rnd()*vec3(.15,.05,.15)+vec3(0.,.15+.6*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.09+.07*aSeed.w);}`,BUBBLE_FS);
  // veneno acumulado: burbujas que gotean del rival
  a.count+=points(L.part,40,C+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TH)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;vec3 p=vec3(3.4+cos(an)*.42,.4+r.y*1.2-age*.45,sin(an)*.42);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.08+.06*r.z);}`,BUBBLE_FS);
  // curación del lanzador: cruces verdes que suben
  a.count+=points(L.part,32,C+`void main(){float s=TI+.15+aSeed.x*.5;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7+cos(an)*.5,.2+aSeed.w*.9+t*1.1,sin(an)*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.13+.06*aSeed.w);}`,CROSS_FS);

  const P=V3(0,0,0), D=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.14*ss(0,TL0,te)-0.2*ss(TL0,TL0+0.1,te)+0.06*ss(TL0+0.1,0.7,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value);
    cm.emissiveIntensity=0.35*ss(0,0.15,te)*(1-ss(TL0,0.55,te))+0.35*ss(TI+0.15,TI+0.4,te)*(1-ss(TI+0.6,TEND,te));
    let tgt=0, last=-1;
    darts.forEach((m,i)=>{const t0=tl(i),k=(te-t0)/FL,ground=EN[i][3]===1;
      if(te<t0){const g=ss(0.05+i*0.02,0.2+i*0.02,te);m.visible=g>0.01;m.position.copy(P0[i]);m.scale.setScalar(Math.max(g,0.001));m.quaternion.setFromUnitVectors(YA,D.set(-0.35,1,0).normalize());}
      else if(k<1){m.visible=true;m.scale.setScalar(1);qb(P0[i],P1[i],P2[i],k,P);qbd(P0[i],P1[i],P2[i],k,D);
        m.position.copy(P).addScaledVector(D.normalize(),-0.5);m.quaternion.setFromUnitVectors(YA,D);}
      else{const sk=ground?1-ss(th(i)+0.35,th(i)+0.6,te):0;m.visible=sk>0.01;m.scale.setScalar(Math.max(sk,0.001));
        qbd(P0[i],P1[i],P2[i],1,D);m.position.copy(P2[i]).addScaledVector(D.normalize(),-0.36);m.quaternion.setFromUnitVectors(YA,D);}
      const ih=te-th(i); if(ih>=0){tgt+=(ground?0.4:1)*Math.exp(-ih*12);last=i;}
      const r=rings[i],p=cl(ih/0.3); r.visible=ih>=0&&p<1; towardCam(r.position,P2[i],0.3); billboard(r); set(r,p,(1-p)*0.9);});
    // el rival encaja cada impacto
    target.rotation.z=-0.08*tgt*Math.sin(te*40); target.position.x=3.4+0.05*tgt;
    const env=ss(TH,TH+0.2,te)*(1-ss(TEND-0.1,2.0,te)); U.uE.value=env;
    set(puddle,ss(TI,TH+0.1,te),1-ss(TEND-0.2,2.0,te)); set(bubbleSkin,ss(TI,TH+0.1,te),0.8*(1-ss(TEND-0.2,2.0,te)));
    o.em=0.25*env; o.emc.copy(U.uC2.value);
    if(te<TL0){o.g.copy(CB).y+=0.3;o.gs=0.8;o.ga=0.3*ss(0,0.15,te);o.li=1.6;}
    else if(te<TI){qb(P0[2],P1[2],P2[2],cl((te-tl(2))/FL),P);o.g.copy(P);o.gs=0.9;o.ga=0.3;o.li=2.2;}
    else{o.g.set(3.3,0.9,0);o.gs=1.4+1.4*tgt;o.ga=0.12+0.35*cl(tgt);o.li=1.5+5*cl(tgt);}
    o.ia=ia; o.c.set(3.35,1.0,0); o.shake=0; o.dist=0.6; o.flash=0.7;
  };
}};

// =====================================================================
// 4 · INDIAN STAR — siete estrellas se encienden sobre la espalda dibujando el patrón radial de la tortuga estrellada;
//     un río de estrellas fluye al aliado y forma una cúpula de escudos estrellados que refleja la luz
// =====================================================================
const star={key:"reIndianStar",name:"Indian Star",pa:2,dur:2.2,ti:0.8,pal:"Estelar",allies:1,
  phases:[["Constelación",0],["Río de estrellas",0.32],["Cúpula",0.8],["Reflejo",1.0],["Dispersión",1.75]],
build(a){
  const L=a.L,TF=0.32,TI=0.8,TR=1.0,TX=1.75,TE=2.15,R=1.05;
  const CS=V3(-3.85,2.0,0), Q1=V3(-2.75,3.3,-0.9), Q2=V3(AP.x,2.3,AP.z);
  // constelación: estrella central y seis radiales unidas (patrón de escudo de la tortuga estrellada)
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(SDF2+`
  void main(){vec2 p=(vUv-.5)*2.;float m=0.,st=0.;
   for(int i=0;i<6;i++){float an=.5236+float(i)*1.0472;vec2 q=vec2(cos(an),sin(an))*.62;
    float k=clamp(uP*1.4-float(i)*.06,0.,1.);m+=smoothstep(.022,0.,sdSeg(p,vec2(0.),q*k))*step(.001,k);
    vec2 d=abs(p-q)*7.;st+=smoothstep(.12,0.,d.x*d.y*6.+min(d.x,d.y))*smoothstep(1.,.1,max(d.x,d.y))*step(.99,k);}
   vec2 d=abs(p)*5.;st+=smoothstep(.12,0.,d.x*d.y*6.+min(d.x,d.y))*smoothstep(1.,.1,max(d.x,d.y));
   float ring=band(length(p),.62,.015)*.35*uP;
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*st)*1.5+vec3(1.)*st*.6,(m*.7+st+ring)*uA);}`,{depthTest:false}));
  L.mesh.add(sky);
  // cúpula de escudos: rejilla hexagonal en coordenadas esféricas; cada escudo con estrella radial
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),fxU(`uniform float uQ;
  void main(){vec3 n=normalize(vP);if(n.y<1.-uP*1.15)discard;
   float an=atan(n.z,n.x);float el=asin(clamp(n.y,0.,1.));
   vec2 p=vec2(an/6.2832*12.,el/1.5708*4.2);vec2 rr=vec2(1.,1.732);vec2 h=rr*.5;
   vec2 ga=mod(p,rr)-h;vec2 gb=mod(p-h,rr)-h;vec2 g=dot(ga,ga)<dot(gb,gb)?ga:gb;vec2 id=p-g;
   float hx=max(abs(g.x)*.866+abs(g.y)*.5,abs(g.y))*1.15;float border=band(hx,.5,.04);
   float ra=atan(g.y,g.x);float rays=pow(abs(cos(ra*3.)),10.)*smoothstep(.5,.05,length(g));
   float tw=.6+.4*sin(uT*5.+hash(vec3(id,1.))*30.);float core=smoothstep(.12,0.,length(g))*tw;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float sheen=band(n.x*.7+n.y*.55-n.z*.3,uQ*3.-1.5,.09);
   float front=band(n.y,1.-uP*1.15,.05)*step(uP,.99);
   float al=border*.55+rays*.6+core*.9+fr*.5+.03+sheen*.8+front;
   gl_FragColor=vec4(mix(uC2,uC1,rays+core*.5+sheen)*1.35+vec3(1.)*(core*.5+sheen*.6+front*.4),al*uA);}`,{uQ:{value:0}}));
  dome.position.set(AP.x,0,AP.z); L.mesh.add(dome);
  // carta celeste bajo el aliado
  const chart=groundPlane(3.0,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)-uT*.12;
   float m=band(r,.93,.012)+band(r,.86,.008)+step(.5,fract(an/6.2832*48.))*band(r,.895,.02)*.6;
   float st=pow(abs(cos(an*4.)),30.)*smoothstep(.85,.1,r)+pow(abs(cos(an*4.+.785)),30.)*smoothstep(.5,.1,r)*.7;
   m=(m+st*.6)*step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.5)*1.35,m*uA);}`)); chart.position.z=AP.z;
  const pulse=groundPlane(3.4,AP.x,0.03,fx(RING_FS)); pulse.position.z=AP.z;
  L.decal.add(chart,pulse);

  const C=`const float TF=${f(TF)};const float TI=${f(TI)};const float TR=${f(TR)};const float TX=${f(TX)};
  const vec3 CS=${v3(CS)};const vec3 Q1=${v3(Q1)};const vec3 Q2=${v3(Q2)};const vec3 AP=${v3(AP)};`+QB;
  // motas que se encienden alrededor de la constelación
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*.3;float life=.4+aSeed.y*.2;float age=(uT-s)/life;
   vec3 p=CS+rnd()*vec3(.6,.6,.3);vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.03+.03*aSeed.w);}`);
  // río de estrellas: flujo continuo de la espalda al aliado; al llegar se reparten sobre la cúpula
  a.count+=points(L.part,160,C+`void main(){float s=TF+aSeed.x*(TI-TF-.15);float life=.5;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=qb(CS,Q1,Q2,k)+rnd()*.12*sin(k*3.14159);
   vec3 d=normalize(rnd()+vec3(0.,.8,0.));d.y=abs(d.y)+.1;d=normalize(d);vec3 pd=AP+d*${f(R)};
   float k2=clamp((age-1.)/.4,0.,1.);p=mix(p,pd,k2*k2*(3.-2.*k2));
   vA=(age>0.&&age<1.4)?(age<1.?smoothstep(0.,.1,age):1.-k2):0.;put(p,(.035+.035*aSeed.w)*(1.+.6*sin(uT*20.+aSeed.z*30.)));}`);
  a.count+=points(L.part,26,C+`void main(){float s=TF+aSeed.x*(TI-TF-.15);float life=.5;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=qb(CS,Q1,Q2,k)+rnd()*.15;vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.13+.1*aSeed.w);}`,STAR4_FS);
  a.count+=sparks(L.part,70,TI,`${f(AP.x)},1.1,${f(AP.z)}`,"0.,1.,0.",2,5,1.3);
  // reflejo: destellos que salen despedidos de la superficie de la cúpula
  a.count+=points(L.part,50,C+`void main(){float life=.45+aSeed.y*.25;float k=(uT-TR)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float y=.2+.75*r.x;float rd=sqrt(1.-y*y);float an=r.y*6.2832;vec3 d=vec3(cos(an)*rd,y,sin(an)*rd);
   vec3 p=AP+d*(${f(R)}+age*1.3);vA=(k>=1.)?(1.-age)*uE:0.;put(p,(.1+.08*r.z)*(1.-age*.5));}`,STAR4_FS);
  // dispersión: la cúpula se deshace en estrellas que suben
  a.count+=points(L.part,70,C+`void main(){float s=TX+aSeed.x*.3;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.7,0.));d.y=abs(d.y);vec3 p=AP+d*${f(R)}+vec3(0.,t*1.3,0.)+d*t*.3;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.04*aSeed.w);}`);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, fo=ss(0,TF,te), fade=ss(TF,TF+0.25,te), q=ss(TX,TE,te);
    caster.rotation.z=0.08*ss(0,TF,te)-0.08*ss(TF,TI,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*fo*(1-fade);
    towardCam(sky.position,CS,0.2); billboard(sky,te*0.4); sky.visible=fade<0.999; sky.scale.setScalar(0.8+0.2*fo+0.4*fade);
    set(sky,fo,(1-fade)*ss(0,0.08,te));
    const dp=ss(TI-0.12,TI+0.25,te); dome.visible=dp>0.001&&q<0.999; dome.scale.setScalar(R*(1+0.04*hitK(ia,8)*(ia>=0?1:0)));
    set(dome,dp,(0.75+0.6*hitK(ia,5))*(1-q)); dome.material.uniforms.uQ.value=((te-TR)/0.6)%1;
    const env=ss(TI,TI+0.2,te)*(1-ss(TX,TE,te)); U.uE.value=ss(TR,TR+0.1,te)*(1-ss(TX-0.1,TX+0.2,te));
    set(chart,ss(TF,TI,te),0.75*ss(TF,TF+0.2,te)*(1-q));
    const p=cl(ia/0.5); set(pulse,1-Math.pow(1-p,2),ia>=0?(1-p)*0.75:0);
    allyGlow(0,0.35*hitK(ia,4)+0.15*env);
    if(te<TF){o.g.copy(CS);o.gs=1.0*fo;o.ga=0.35*fo;o.li=2*fo;}
    else if(te<TI){qb(CS,Q1,Q2,cl((te-TF)/(TI-TF)),sp);o.g.copy(sp);o.gs=1.0;o.ga=0.35;o.li=2.2;}
    else{o.g.set(AP.x,1.1,AP.z);o.gs=2+1.5*Math.min(ia,0.4);o.ga=0.12+0.12*env+0.45*hitK(ia,7);o.li=2+2*env+5*hitK(ia,5);}
    o.ia=ia; o.c.set(AP.x,1.0,AP.z); o.shake=0; o.dist=0.45; o.flash=0;
  };
}};

// =====================================================================
// 5 · RED EAR — dos latidos de calor volcánico nacen de las orejas; un chorro de magma cae sobre el aliado y se
//     solidifica en una costra de basalto con grietas incandescentes que late y escupe lenguas de fuego (reflejo)
// =====================================================================
const redear={key:"reRedEar",name:"Red Ear",pa:2,dur:2.0,ti:0.72,pal:"Carmesí",allies:1,
  phases:[["Latido",0],["Magma",0.36],["Costra",0.72],["Reflejo",0.9],["Enfriado",1.55]],
build(a){
  const L=a.L,TM=0.36,TI=0.72,TP=0.9,TX=1.55,TE=1.95,BEAT=[0.04,0.24],PER=0.62;
  const EARS=[V3(-3.72,1.82,0.26),V3(-3.72,1.82,-0.26)], EM=V3(-3.7,1.95,0);
  const M1=V3(-2.9,3.25,-0.95), M2=V3(AP.x,2.05,AP.z), DC=V3(AP.x,0.66,AP.z), DR=0.92;
  const beat=te=>{let b=0;for(const t of BEAT)b=Math.max(b,te>=t?Math.exp(-(te-t)*9):0);return b;};
  const pulseAt=te=>te<TP?0:Math.pow(0.5+0.5*Math.cos((te-TP)/PER*6.2832),6);
  // anillos de calor en las orejas (proyección, no se dibuja la oreja)
  const heat=EARS.map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float a=band(r,uP*.9,.1*(1.-uP)+.02)+band(r,uP*.55,.06*(1.-uP)+.015)*.6;float c=smoothstep(.4,0.,r)*(1.-uP)*.8;
   gl_FragColor=vec4(mix(uC2,uC1,c+.3)*1.6,(a+c)*uA);}`,{depthTest:false}));L.mesh.add(m);return m;});
  // chorro de magma: costra que flota sobre roca fundida, cabeza incandescente
  const flow=new THREE.Mesh(taperTube(new THREE.QuadraticBezierCurve3(EM,M1,M2),70,8,0.07,0.11),fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP||u<uQ)discard;float d=uP-u;
   float n=noise(vec3(u*22.-uT*6.,vUv.y*5.,uT))*.6+noise(vec3(u*55.-uT*9.,vUv.y*11.,1.))*.4;
   float crust=smoothstep(.52,.68,n);float hot=1.-crust;float head=exp(-d*14.);
   vec3 c=mix(uC2*1.2,uC1*1.6+vec3(.4,.25,.1),hot*.7+head*.5)*(.25+.75*hot)+vec3(1.)*head*.5;
   gl_FragColor=vec4(c,(.35+.65*hot+head)*smoothstep(uQ,uQ+.1,u)*uA);}`,{uQ:{value:0}}));
  L.trail.add(flow);
  // cúpula: costra de basalto (mezcla normal) sobre red de grietas de magma (aditivo); uP = vertido desde arriba
  const crustMat=fxU(VOR3+`uniform float uQ;
  void main(){vec3 n=normalize(vP);float edge=1.-uP*2.2+noise(n*6.)*.25;if(n.y<edge)discard;
   vec2 v=vor3(n*3.2);float crack=v.y-v.x;if(crack<.07+.1*uQ)discard;
   float sh=noise(n*18.)*.3+.7;vec3 c=mix(vec3(.05,.03,.03),vec3(.2,.13,.11),sh*uQ)*${LIT};
   gl_FragColor=vec4(c*sh+uC2*.08,.72*uA);}`,{uQ:{value:0}},NB);
  const magMat=fxU(VOR3+`uniform float uQ;
  void main(){vec3 n=normalize(vP);float edge=1.-uP*2.2+noise(n*6.)*.25;if(n.y<edge)discard;
   vec2 v=vor3(n*3.2);float crack=v.y-v.x;float g=smoothstep(.12,0.,crack);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);float drip=band(n.y,edge,.06);
   float hot=(1.-uQ*.85)*(.55+.45*uA);
   gl_FragColor=vec4((mix(uC2,uC1,g)*1.6+vec3(1.,.7,.3)*g*g*.6)*hot+uC2*fr*.6,(g*hot+fr*.35+drip)*.95);}`,{uQ:{value:0}});
  const crust=new THREE.Mesh(new THREE.SphereGeometry(1.0,48,32),crustMat), mag=new THREE.Mesh(new THREE.SphereGeometry(0.985,48,32),magMat);
  crust.position.copy(DC); mag.position.copy(DC); crust.renderOrder=1; L.mesh.add(mag,crust);
  // suelo: brasa suave bajo el aliado (sin grietas) y anillo de calor por latido
  const scorch=groundPlane(2.6,AP.x,0.015,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,2.))*.7+noise(vec3(p*15.,5.))*.3;
   float m=smoothstep(1.,.3,r+(n-.5)*.35);gl_FragColor=vec4(mix(uC2,uC1,n*.6)*1.2,m*(.25+.2*n)*uA);}`)); scorch.position.z=AP.z;
  const hring=groundPlane(3.2,AP.x,0.03,fx(RING_FS)); hring.position.z=AP.z;
  L.decal.add(scorch,hring);

  const C=`const float TM=${f(TM)};const float TI=${f(TI)};const float TP=${f(TP)};const float TX=${f(TX)};const float PER=${f(PER)};
  const vec3 EM=${v3(EM)};const vec3 M1=${v3(M1)};const vec3 M2=${v3(M2)};const vec3 DC=${v3(DC)};`+QB;
  // calor que sube de las orejas a cada latido
  a.count+=points(L.part,50,C+`void main(){float b=step(.5,aSeed.x);float s=(b>.5?${f(BEAT[1])}:${f(BEAT[0])})+aSeed.y*.08;float life=.4+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(-3.72,1.82,(aSeed.z>.5?.26:-.26))+rnd()*.08+vec3(-.15*t,.9*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.12+.08*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
  // brasas que se desprenden del chorro
  a.count+=points(L.part,90,C+`void main(){float k=aSeed.x;float s=TM+k*(TI-TM);float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=qb(EM,M1,M2,k)+rnd()*.08+vec3(rnd().x*.5*t,.3*t-3.*t*t,rnd().z*.5*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*40.+aSeed.z*20.)):0.;put(p,.03+.03*aSeed.w);}`);
  // salpicadura de magma al caer sobre el aliado
  a.count+=sparks(L.part,70,TI,`${f(AP.x)},1.6,${f(AP.z)}`,"0.,.9,0.",2.2,5.5,2.6);
  // reflejo: lenguas de fuego que salen de la costra en cada latido
  a.count+=points(L.part,90,C+`void main(){float k=(uT-TP+.06)/PER;float c=floor(k);float age=fract(k)*PER/(.35+aSeed.y*.15);vec3 r=rr(c+aSeed.x*40.);
   float y=.15+.8*r.x;float rd=sqrt(1.-y*y);float an=r.y*6.2832;vec3 d=vec3(cos(an)*rd,y,sin(an)*rd);
   vec3 p=DC+d*vec3(.95,1.15,.95)+d*age*.55+vec3(0.,age*.25,0.);
   vA=(k>=0.&&age<1.)?(1.-age)*uE:0.;put(p,(.2+.12*r.z)*(1.-age*.4));}`,FLAME_FS);
  // ceniza al enfriarse
  a.count+=points(L.part,60,C+`void main(){float s=TX+aSeed.x*.3;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));d.y=abs(d.y);vec3 p=DC+d*vec3(.95,1.1,.95)+vec3(d.x*.3*t,-.8*t*t+.15*t,d.z*.3*t);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.12+.1*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.16,.12,.11)"),NB);

  const sp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, b=beat(te), pu=pulseAt(te), q=ss(TX,TE,te);
    caster.rotation.z=0.05*b;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.55*b+0.15*ss(0,0.1,te)*(1-ss(TM,TI,te));
    // latidos en las orejas
    heat.forEach((h,i)=>{let k=-1;for(const t of BEAT)if(te>=t)k=t;const p=k<0?0:cl((te-k)/0.3);
      h.visible=k>=0&&p<1&&te<TM+0.1; towardCam(h.position,EARS[i],0.15); billboard(h); set(h,p,1-p);});
    flow.visible=te>TM&&te<TI+0.35; set(flow,cl((te-TM)/(TI-TM))*1.02,1); flow.material.uniforms.uQ.value=ss(TI-0.08,TI+0.3,te)*1.02;
    // costra: se vierte desde arriba, late y se enfría
    const dp=cl((te-TI+0.06)/0.32); crust.visible=mag.visible=te>TI-0.06&&q<0.999;
    const sc=DR*(1+0.035*pu); crust.scale.set(sc,sc*1.18,sc); mag.scale.set(sc,sc*1.18,sc);
    set(crust,dp,1-q); crustMat.uniforms.uQ.value=ss(TX-0.2,TE,te);
    magMat.uniforms.uP.value=dp; magMat.uniforms.uA.value=0.5+0.5*pu+0.6*hitK(ia,5); magMat.uniforms.uQ.value=ss(TX-0.2,TE,te);
    U.uE.value=ss(TP,TP+0.1,te)*(1-ss(TX,TX+0.2,te));
    set(scorch,1,0.9*ss(TI,TI+0.2,te)*(1-ss(TX,TE,te))*(0.7+0.3*pu));
    const hp=te<TP?cl(ia/0.4):((te-TP+0.06)/PER)%1; set(hring,hp,(te<TP?(ia>=0?1-hp:0):(1-hp)*pu*1.2+0.0)*(1-q)*0.8);
    allyGlow(0,0.35*hitK(ia,4)+0.3*pu*(1-q),U.uC1.value);
    if(te<TM){o.g.copy(EM);o.gs=0.6+0.8*b;o.ga=0.15+0.35*b;o.li=1+3*b;}
    else if(te<TI){qb(EM,M1,M2,cl((te-TM)/(TI-TM)),sp);o.g.copy(sp);o.gs=0.9;o.ga=0.35;o.li=2.4;}
    else{o.g.set(AP.x,1.0,AP.z);o.gs=2+0.6*pu;o.ga=(0.12+0.25*pu)*(1-q)+0.45*hitK(ia,7);o.li=(1.5+3*pu)*(1-q)+5*hitK(ia,5);}
    o.ia=ia; o.c.set(AP.x,1.1,AP.z); o.shake=0; o.dist=0.45; o.flash=0;
  };
}};

// =====================================================================
// 6 · TRI SPIKES — tres púas óseas se forman sobre la espalda en tridente, salen en abanico y viran como si
//     buscaran presa hasta clavarse una tras otra en el rival más desprotegido, atravesándolo
// =====================================================================
const tri={key:"reTriSpikes",name:"Tri Spikes",pa:2,dur:1.8,ti:0.62,pal:"Nabo",enemies:2,
  phases:[["Tridente",0],["Disparo",0.2],["Viraje",0.4],["Impactos",0.62],["Fin",1.2]],
build(a){
  const L=a.L,TL=0.2,ORD=[0,1,-1],ARR={0:0.62,1:0.69,"-1":0.76};
  const S=[-1,0,1].map(i=>{const ai=Math.abs(i);
    return {i,t1:ARR[i],P0:V3(-3.58+0.12*(1-ai),1.6+0.14*(1-ai),0.3*i),P1:V3(-1.7,2.6+0.15*ai,1.7*i),P2:V3(1.0,1.9+0.35*ai,1.95*i),P3:V3(3.1,1.2+0.16*i+0.08*(1-ai),0.12*i)};});
  // púa de hueso: marfil con anillos de crecimiento y punta teñida de violeta; vaina luminosa
  const spGeo=new THREE.ConeGeometry(0.075,0.62,10).translate(0,0.31,0);
  const spMat=fx(`void main(){float h=vP.y/.62;float rings=.85+.15*sin(h*40.);
   vec3 c=mix(vec3(.92,.88,.8),uC2,smoothstep(.35,.85,h))*rings;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(16)}*.4+uC1*fr*.7,1.);}`,SOLID);
  const shGeo=new THREE.ConeGeometry(0.13,0.85,12,1,true).translate(0,0.3,0);
  const shMat=fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float h=vP.y/.85+.35;
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.4,fr*smoothstep(0.,.4,h)*uA);}`);
  S.forEach(s=>{s.g=new THREE.Group();s.g.add(new THREE.Mesh(spGeo,spMat),new THREE.Mesh(shGeo,shMat));L.mesh.add(s.g);
    s.ring=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(RING_FS,{depthTest:false}));L.mesh.add(s.ring);});
  // marca suave bajo el rival
  const mark=groundPlane(2.6,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float tri=pow(abs(cos(an*1.5)),24.)*smoothstep(.9,.2,r)*step(.25,r);float m=band(r,.8*uP,.04)+tri*.6;
   gl_FragColor=vec4(mix(uC2,uC1,tri)*1.3,m*uA);}`));
  L.decal.add(mark);

  const C=`const float TL=${f(TL)};`+CBZ+`void sp(float i,out vec3 a,out vec3 b,out vec3 c,out vec3 d,out float t1){`+
    S.map((s,k)=>`${k<2?`if(i<${k}.5)`:``}{a=${v3(s.P0)};b=${v3(s.P1)};c=${v3(s.P2)};d=${v3(s.P3)};t1=${f(s.t1)};return;}`).join("")+`}`;
  // carga: polvo violeta que se condensa en cada púa
  a.count+=points(L.part,45,C+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float s=aSeed.y*(TL-.08);float life=.16;float age=(uT-s)/life;vec3 p=A+normalize(rnd()+.001)*mix(.6,.05,clamp(age,0.,1.));
   vA=(age>0.&&age<1.)?age:0.;put(p,.035+.03*aSeed.w);}`);
  // estela de cada púa
  a.count+=points(L.part,210,C+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float lag=aSeed.y*.22;float k=(uT-TL)/(t1-TL)-lag;vec3 p=cbz(A,B,Cc,D,clamp(k,0.,1.))+rnd()*.025*(1.+lag*10.);
   vA=(k>0.&&k<1.)?(1.-lag/.22):0.;put(p,(.06+.03*aSeed.z)*(1.-lag*2.8));}`);
  // impactos: esquirlas de hueso que rebotan hacia atrás
  a.count+=points(L.part,75,C+`void main(){vec3 A,B,Cc,D;float t1;sp(floor(aSeed.x*2.999),A,B,Cc,D,t1);
   float life=.4+aSeed.y*.25;float age=(uT-t1)/life;float t=max(uT-t1,0.);
   vec3 v=normalize(rnd()+vec3(-.9,.4,0.))*(1.5+2.*aSeed.z);vec3 p=D+v*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.08+.06*aSeed.w);}`,CHIP_FS);
  // perforación: chispas que salen por detrás del rival
  S.forEach(s=>{a.count+=sparks(L.part,30,s.t1,`${f(3.7)},${f(s.P3.y)},${f(s.P3.z)}`,"1.6,.15,0.",2,5,1.5);});

  const P=V3(0,0,0), D=V3(0,0,0), X=V3(1,0.25,0).normalize();
  a.pose=function(te,o){
    const ia=te-0.62; let hit=0;
    caster.rotation.z=0.1*ss(0,TL,te)-0.16*ss(TL,TL+0.08,te)+0.06*ss(TL+0.08,0.6,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,0.12,te)*(1-ss(TL,0.45,te));
    S.forEach(s=>{const k=(te-TL)/(s.t1-TL);
      if(te<TL){const g=ss(0.02,TL-0.03,te);s.g.visible=g>0.01;s.g.position.copy(s.P0);s.g.scale.setScalar(Math.max(g,0.001));s.g.quaternion.setFromUnitVectors(YA,X);}
      else if(k<1){s.g.visible=true;s.g.scale.setScalar(1);cb(s.P0,s.P1,s.P2,s.P3,k,P);cbd(s.P0,s.P1,s.P2,s.P3,k,D);
        s.g.position.copy(P).addScaledVector(D.normalize(),-0.45);s.g.quaternion.setFromUnitVectors(YA,D);}
      else s.g.visible=false;
      const ih=te-s.t1,p=cl(ih/0.3); s.ring.visible=ih>=0&&p<1; towardCam(s.ring.position,s.P3,0.4); billboard(s.ring); set(s.ring,p,1-p);
      if(ih>=0)hit+=Math.exp(-ih*9);});
    shMat.uniforms.uA.value=0.6+0.4*ss(0,TL,te);
    target.position.x=3.4+0.12*cl(hit); target.rotation.z=-0.12*cl(hit)*Math.cos((te-0.62)*20);
    set(mark,cl(ia/0.35),ia>=0?0.8*(1-ss(1.1,1.75,te)):0);
    if(te<TL){o.g.set(-3.5,1.65,0);o.gs=0.9*ss(0,TL,te);o.ga=0.35;o.li=2;}
    else if(ia<0){cb(S[1].P0,S[1].P1,S[1].P2,S[1].P3,cl((te-TL)/(0.62-TL)),P);o.g.copy(P);o.gs=1;o.ga=0.35;o.li=2.4;}
    else{o.g.copy(TC);o.gs=1.4+1.4*cl(hit);o.ga=0.45*cl(hit);o.li=6*cl(hit);}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.7; o.flash=1;
  };
}};

VFX.module("Reptil · Espalda",[sail,croc,thorns,star,redear,tri]);
})();

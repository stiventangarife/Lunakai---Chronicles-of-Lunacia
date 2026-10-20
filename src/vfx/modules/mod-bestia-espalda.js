// =====================================================================
// MÓDULO · CLASE BESTIA (ESPALDA)
// Mismo contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Las piezas reutilizables vienen de vfx-lib.js (VFX.lib).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,BURST_FS,SCORCH_FS,caster,target}=VFX;
const {NB,SOLID,v3,fireFS,darkFireFS,CHIP_FS,DUST_FS,FLAME_FS,FLUFF_FS,billboard,towardCam,STAR4_FS,SMOKE_FS}=VFX.lib;

VFX.palette("Plata",["#eef3ff","#7d8fb8"]);

const TC=V3(3.15,1.2,0);                  // pecho del objetivo, cara visible
const CB=V3(-3.85,1.25,0);                // espalda del lanzador
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
// SDF 2D: segmento redondeado y unión suave (siluetas, glifos, sellos)
const SDF2=`float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}`;
// grano alargado en sprite (arroz, pétalo): vR = giro del sprite en pantalla
const GRAIN_FS=HEAD+`varying float vA;varying float vMix;varying float vR;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 float d=length(q*vec2(2.7,1.05));float a=smoothstep(.5,.38,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.3,0.,length((q-vec2(-.03,-.08))*vec2(4.,1.4)));
 gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.,.97,.85),.5),.5+.5*(1.-d*2.))*1.25+vec3(1.)*hl*.5,a);}`;

// =====================================================================
// 1 · FURBALL — ovillo de pelo envuelto en fuego que rueda y bota por la cuadrícula; estalla en el objetivo
// =====================================================================
const furball=tempo({key:"furball",name:"Furball",dur:3.0,ti:1.66,pal:"Fuego",
  phases:[["Ovillo",0],["Lanzamiento",0.4],["Botes",0.82],["Explosión",1.66],["Rescoldos",1.95]],
build(a){
  const L=a.L,TL=0.4,TI=1.66,R=0.25,S0=V3(-3.95,2.05,0),EP=V3(3.0,1.1,0);
  // tramos parabólicos decrecientes: [t0,t1,xa,ya,xb,yb,altura,deriva z]
  const SG=[[TL,0.82,S0.x,S0.y,-1.25,R,1.35,0.2],[0.82,1.16,-1.25,R,0.55,R,1.1,-0.25],[1.16,1.44,0.55,R,1.95,R,0.7,0.18],[1.44,TI,1.95,R,EP.x,EP.y,0.4,-0.08]];
  const BT=[0.82,1.16,1.44], BX=[-1.25,0.55,1.95];
  const bpos=(te,out)=>{if(te<TL)return out.copy(S0);let s=SG[3];for(const g of SG)if(te<g[1]){s=g;break;}
    const k=cl((te-s[0])/(s[1]-s[0])),b=4*k*(1-k);return out.set(s[2]+(s[4]-s[2])*k,s[3]+(s[5]-s[3])*k+s[6]*b,s[7]*b);};
  const BP=`vec3 bpos(float t){`+SG.map((s,i)=>`${i<3?`if(t<${f(s[1])})`:``}{float k=clamp((t-${f(s[0])})/${f(s[1]-s[0])},0.,1.);float b=4.*k*(1.-k);
   return vec3(${f(s[2])}+(${f(s[4]-s[2])})*k,${f(s[3])}+(${f(s[5]-s[3])})*k+${f(s[6])}*b,${f(s[7])}*b);}`).join("")+`return vec3(0.);}`;

  // ovillo: grupo exterior (posición + aplastamiento al botar) → grupo que rueda → cuerpo de pelo
  const ballG=new THREE.Group(), roll=new THREE.Group(); ballG.add(roll); L.mesh.add(ballG);
  // pelo: fibras por ruido estirado en meridianos + remolinos; mezcla normal para dar cuerpo opaco
  const body=new THREE.Mesh(new THREE.SphereGeometry(R,40,28),fx(`
  void main(){vec3 q=normalize(vP);vec3 w=vec3(noise(q*2.5),noise(q*2.5+4.),noise(q*2.5+9.))*1.6;
   float fib=noise(vec3(q.x*34.,q.y*7.,q.z*34.)+w*3.)*.55+noise(q*40.+w*5.)*.45;
   float strand=pow(fib,1.4);
   float lit=.35+.65*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   vec3 fur=mix(vec3(.15,.06,.03),vec3(.66,.38,.17),strand);
   vec3 c=fur*lit+uC2*fr*fr*1.3*uP+uC1*smoothstep(.72,.95,fib)*.7*uP;
   float al=uA*(1.-smoothstep(.6,.98,fr)*(1.-strand)*.95);
   gl_FragColor=vec4(c,al);}`,NB));
  // puntas de pelo chamuscadas: halo aditivo con mechones
  const fuzz=new THREE.Mesh(new THREE.SphereGeometry(R*1.2,40,28),fx(`
  void main(){vec3 q=normalize(vP);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float h=noise(q*46.)*.6+noise(q*95.)*.4;float tip=smoothstep(.55,.82,h);
   gl_FragColor=vec4(mix(uC2,uC1,tip)*1.4,tip*pow(fr,.8)*uA*.85);}`));
  roll.add(body,fuzz);
  // envoltura de fuego: no rueda, las lenguas se arrastran hacia atrás y arriba; uP aviva el fuego al botar
  const fire=new THREE.Mesh(new THREE.SphereGeometry(R*1.9,36,24),fx(`
  void main(){vec3 q=normalize(vP);float back=dot(q,normalize(vec3(-1.,.8,0.)));
   vec3 s=q*2.2+vec3(uT*5.,-uT*4.,0.);
   float n=noise(s)*.55+noise(s*2.3+vec3(0.,-uT*3.,1.))*.3+noise(s*5.)*.15;
   float fl=n+back*.45-.25+.3*uP;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float al=smoothstep(0.,.3,fl)*(.25+.75*fr);float hot=smoothstep(.3,.65,fl);
   gl_FragColor=vec4((mix(uC2,uC1,hot)+vec3(1.)*smoothstep(.6,.85,fl)*.5)*1.5,al*uA);}`));
  ballG.add(fire); fuzz.renderOrder=fire.renderOrder=1;   // aditivos después del pelo (mezcla normal)
  const burst=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),fx(BURST_FS)); burst.position.copy(EP);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),fx(RING_FS,{depthTest:false}));
  L.mesh.add(burst,hitRing);

  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 S0=${v3(S0)};const vec3 EP=${v3(EP)};`+BP;
  // formación: mechones y chispas que convergen sobre la espalda
  a.count+=points(L.part,35,C+`void main(){float life=.24+aSeed.y*.12;float age=(uT-aSeed.x*(TL-.22))/life;
   vec3 d=normalize(rnd()+vec3(0.,.3,0.));vec3 p=S0+d*mix(1.1,.08,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,(.11+.08*aSeed.z)*(1.-age*.5));}`,FLUFF_FS);
  a.count+=points(L.part,60,C+`void main(){float life=.18+aSeed.y*.1;float age=(uT-aSeed.x*(TL-.15))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=S0+d*mix(.85,.05,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.04*aSeed.z);}`);
  // rastro: llamas, brasas y humo soltados a lo largo de la trayectoria
  a.count+=points(L.part,120,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.25+aSeed.y*.28;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bpos(s)+r*.13+vec3(-.5*t,.9*t,r.z*.15*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.14+.12*aSeed.w)*(1.-age*.6));}`,FLAME_FS);
  a.count+=points(L.part,80,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.4+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bpos(s)+r*.2+vec3(r.x*.6*t-.4*t,1.3*t-2.*t*t,r.z*.6*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.z*40.)):0.;put(p,.03+.04*aSeed.w);}`);
  a.count+=points(L.part,40,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=bpos(s)+r*.1+vec3(-.2*t,.6*t,r.z*.2*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.5:0.;put(p,(.24+.2*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.2,.17,.16)"),NB);
  // cada bote: chispas y polvo que salen del suelo
  BT.forEach((t,i)=>{a.count+=sparks(L.part,35,t,`${f(BX[i])},.05,0.`,"0.,1.1,0.",1.5,4.5,2.5);});
  a.count+=points(L.part,40,C+`void main(){float i=floor(aSeed.x*2.999);
   float tb=i<.5?${f(BT[0])}:(i<1.5?${f(BT[1])}:${f(BT[2])});float bx=i<.5?${f(BX[0])}:(i<1.5?${f(BX[1])}:${f(BX[2])});
   float life=.6+aSeed.y*.5;float t=uT-tb;float age=t/life;float c=max(t,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(bx,.05,0.)+vec3(cos(an),0.,sin(an))*(.15+.65*aSeed.w)*(1.-exp(-c*4.))+vec3(0.,.28*(1.-exp(-c*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.2+.18*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // explosión final: bola de fuego, chispas, mechones ardiendo y humo
  a.count+=sparks(L.part,110,TI,`${f(EP.x)},${f(EP.y)},0.`,"-.3,.45,0.",3,8,3);
  a.count+=points(L.part,70,C+`void main(){float s=TI+aSeed.x*.08;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(-.2,.3,0.));vec3 p=EP+d*(.15+1.*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,.4*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(1.-age):0.;put(p,(.26+.3*aSeed.w)*(.6+age*.8));}`);
  a.count+=points(L.part,30,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.9,0.))*(2.+2.2*aSeed.z);vec3 p=EP+v*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.04);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.12+.08*aSeed.w)*(1.-age*.5));}`,FLUFF_FS);
  a.count+=points(L.part,45,C+`void main(){float s=TI+.05+aSeed.x*.2;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.5,0.));vec3 p=EP+d*(.25+.75*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,.55*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.55:0.;put(p,(.34+.3*aSeed.w)*(.6+age));}`,SMOKE_FS("vec3(.18,.15,.14)"),NB);

  // marcas de quemado en cada bote: hollín (normal) + rescoldos (aditivo) + onda
  const SOOT_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,3.))*.6+noise(vec3(p*19.,1.))*.4;float e=r+(n-.5)*.55;
   gl_FragColor=vec4(vec3(.03,.02,.02),smoothstep(.95,.35,e)*.75*uA);}`;
  const EMBER_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*7.,3.))*.6+noise(vec3(p*19.,1.))*.4;float e=r+(n-.5)*.55;
   float hair=pow(noise(vec3(atan(p.y,p.x)*9.,r*3.,5.)),3.)*smoothstep(.95,.5,e)*smoothstep(.2,.5,e);
   float ember=smoothstep(.6,.8,n)*smoothstep(.85,.2,e)*(.7+.3*sin(uT*9.+n*20.));
   float ring=band(e,.7,.12);
   gl_FragColor=vec4(mix(uC2,uC1,ember)*1.6,(ember+ring*.5+hair*1.2)*uP*uA);}`;
  const burns=BX.map((x,i)=>{const s=groundPlane(1.1,x,0.014+i*0.001,fx(SOOT_FS,NB)),e=groundPlane(1.1,x,0.018+i*0.001,fx(EMBER_FS)),r=groundPlane(1.8,x,0.03,fx(RING_FS));L.decal.add(s,e,r);return [s,e,r];});
  const scorch=groundPlane(2.0,EP.x,0.015,fx(SOFTBURN_FS)), shock=groundPlane(4.2,EP.x,0.03,fx(RING_FS));
  L.decal.add(scorch,shock);

  const bp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, form=ss(0,TL*0.85,te), ign=ss(0.15,TL,te);
    bpos(te,bp); if(te<TL)bp.y+=0.06*Math.sin(te*9);
    let sq=0; for(const t of BT)sq=Math.max(sq,Math.exp(-Math.abs(te-t)*26));
    ballG.visible=te<TI; ballG.position.copy(bp);
    const sc=Math.max(form,0.001); ballG.scale.set(sc*(1+0.25*sq),sc*(1-0.32*sq),sc*(1+0.25*sq));
    // rueda: ángulo = distancia recorrida / radio (sentido horario al avanzar en +x)
    roll.rotation.z=te<TL?-te*3:-TL*3-(bp.x-S0.x)/R;
    set(body,ign,form); set(fuzz,0,form*ign); set(fire,sq,ign);
    caster.rotation.z=0.16*ss(0,TL,te)-0.38*ss(TL,TL+0.08,te)+0.22*ss(TL+0.1,TL+0.6,te);
    BT.forEach((t,i)=>{const ib=te-t,[s,e,r]=burns[i],env=ib>=0?ss(0,0.05,ib)*(1-ss(2.4,2.95,te)):0;
      s.material.uniforms.uA.value=env; set(e,0.35+0.65*Math.exp(-Math.max(ib,0)*1.8),env);
      const p=cl(ib/0.35); set(r,p,ib>=0?1-p:0);});
    let p=cl(ia/0.45); burst.visible=ia>=0&&p<1; burst.scale.setScalar(0.3+1.15*(1-Math.pow(1-p,3))); burst.material.uniforms.uP.value=p;
    p=cl(ia/0.35); towardCam(hitRing.position,EP,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0); scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.4):0;
    const hit=hitK(ia,5); target.position.x=3.4+hit*0.28*(1-Math.exp(-ia*20)); target.rotation.z=-hit*0.22*Math.cos(ia*14);
    if(te<TL){o.g.copy(bp);o.gs=1.1*form;o.ga=0.35*ign;o.li=2.2*ign;}
    else if(te<TI){o.g.copy(bp);o.gs=1.2+0.5*sq;o.ga=0.42+0.2*sq;o.li=3+3*sq;}
    else{o.g.copy(EP);o.gs=1.4+3.5*ia;o.ga=Math.exp(-ia*11)*0.75;o.li=9*Math.exp(-ia*5);}
    o.ia=ia;o.c.copy(EP);o.shake=0;o.dist=0.8;
  };
}},0.75);

// =====================================================================
// 2 · HERO — pilar de luz dorada desde el cielo; el lanzador crece, se le pone una capa de luz y un emblema
// =====================================================================
const hero=tempo({key:"hero",name:"Hero",dur:3.0,ti:0.8,pal:"Dorado",
  phases:[["Llamada",0],["Descenso",0.4],["Bendición",0.8],["Heroico",1.15],["Fin",2.5]],
build(a){
  const L=a.L,TD=0.4,TI=0.8,TE=2.5,TF=2.95,CX=-3.7,CP=V3(-3.7,1.0,0),H=12;
  const front=te=>{const k=cl((te-TD)/(TI-TD));return H*(1-k*k);};
  // pilar: cilindro abierto cuyo borde inferior (uP, altura normalizada) baja desde el cielo
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,H,48,1,true),fx(`
  void main(){float h=vP.y/${f(H)}+.5;if(h<uP)discard;float an=atan(vP.z,vP.x);
   float st=noise(vec3(an*5.,h*14.+uT*9.,0.))*.6+noise(vec3(an*13.,h*30.+uT*15.,2.))*.4;
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));float edge=smoothstep(.035,0.,h-uP);
   float al=(smoothstep(.45,.85,st)*.45+pow(fr,1.6)*.55+.06)*(1.-h*.55)+edge*1.2;
   gl_FragColor=vec4(mix(uC2,uC1,.6+st*.4)*1.2+vec3(1.)*(edge+st*.15)*.6,al*uA);}`));
  const core=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,H,16,1,true),fx(`
  void main(){float h=vP.y/${f(H)}+.5;if(h<uP)discard;float c=pow(abs(dot(normalize(vN),normalize(vV))),1.4);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.65)*1.7,c*uA);}`));
  pillar.position.set(CX,H/2,0); core.position.set(CX,H/2,0);
  // capa de luz: segmento de cono a la espalda (−x) que ondea con bandas y se deshilacha abajo
  const cape=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.8,1.35,28,8,true,1.5*Math.PI-1.1,2.2),fx(`
  void main(){float u=vUv.x,v=vUv.y;
   float wave=.5+.5*sin(u*11.-uT*6.+v*5.);
   float n=noise(vec3(u*6.,v*4.-uT*1.5,uT*.4));
   float side=smoothstep(0.,.14,u)*smoothstep(1.,.86,u);
   float hem=smoothstep(n*.35,n*.35+.25,v);
   float edge=band(u,.03,.03)+band(u,.97,.03)+band(v,.97,.03);
   gl_FragColor=vec4(mix(uC2,uC1,.4+.6*wave)*1.25+vec3(1.)*edge*.3,((.22+.3*wave*n)*side*hem+edge*.6*hem)*uA);}`));
  // emblema heroico: escudo con destello en estrella y alas de plumas; un brillo lo barre
  const crest=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.05),fx(SDF2+`
  float sdShield(vec2 p){p.x=abs(p.x);return max(max(p.x-.34,p.y-.36),((-.58+2.4*p.x*p.x)-p.y)*.5);}
  void main(){vec2 p=(vUv-.5)*2.;float s=sdShield(p);
   float rim=band(s,0.,.035)+band(s,-.09,.014)*.6;float fill=smoothstep(.02,-.02,s);
   vec2 q=abs(p);float star=smoothstep(.1,0.,q.x*q.y*9.+min(q.x,q.y)*1.5)*smoothstep(.3,.04,max(q.x,q.y))*fill;
   vec2 w=vec2(abs(p.x),p.y);float wing=0.;
   for(int i=0;i<4;i++){float fi=float(i);wing=max(wing,smoothstep(.05-fi*.006,0.,sdSeg(w,vec2(.4,.16-fi*.12),vec2(.95-fi*.1,.52-fi*.2))));}
   float sheen=smoothstep(.08,0.,abs(p.x*.7+p.y-(uP*3.-1.5)))*fill;
   float n=noise(vec3(p*4.,uT*2.));
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.5+vec3(1.)*(sheen+star)*.8,(rim+fill*.18+star+wing*(.55+.45*n)+sheen)*uA);}`,{depthTest:false}));
  L.mesh.add(pillar,core,cape,crest);
  // sello solar en el suelo: rayos, anillos y estrella de ocho puntas; se revela del centro al borde (uP)
  const sigil=groundPlane(2.8,CX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*.15;
   float m=band(r,.93,.02)+band(r,.8,.012);
   m+=pow(abs(cos(an*8.)),18.)*smoothstep(.93,.35,r)*step(.32,r);
   m+=band(r,.18+.14*pow(abs(cos(an*4.)),8.),.016);
   m+=band(r,.62,.05)*step(.55,fract(an/6.2832*24.));
   m*=step(r,uP*1.05);
   gl_FragColor=vec4(mix(uC2,uC1,1.-r*.6)*1.4,m*uA);}`));
  const shock=groundPlane(4,CX,0.03,fx(RING_FS));
  L.decal.add(sigil,shock);

  const C=`const float TD=${f(TD)};const float TI=${f(TI)};const float TE=${f(TE)};const vec3 CP=${v3(CP)};
  float front(float t){float k=clamp((t-TD)/(TI-TD),0.,1.);return ${f(H)}*(1.-k*k);}`;
  // llamada: destellos que suben del lanzador hacia el cielo
  a.count+=points(L.part,45,C+`void main(){float s=aSeed.x*(TD+.1);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=CP+vec3(r.x*.35,.6+t*9.*(.6+aSeed.z),r.z*.35);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.04+.04*aSeed.w);}`);
  // motas de luz que bajan con el frente del pilar
  a.count+=points(L.part,100,C+`void main(){float an=aSeed.x*6.2832;float rd=sqrt(aSeed.y)*.68;
   float y=front(uT)+aSeed.z*3.5*(1.-.6*clamp((uT-TD)/(TI-TD),0.,1.));
   vec3 p=vec3(${f(CX)}+cos(an)*rd,y,sin(an)*rd);
   vA=(uT>TD&&uT<TI+.12)?(1.-smoothstep(TI,TI+.12,uT))*(.5+.5*aSeed.w):0.;put(p,.04+.05*aSeed.w);}`);
  // aterrizaje: chispas y destellos en estrella despedidos hacia arriba
  a.count+=sparks(L.part,120,TI,`${f(CX)},.1,0.`,"0.,1.3,0.",2.5,6.5,2.4);
  a.count+=points(L.part,18,C+`void main(){float s=TI+aSeed.x*.06;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,1.4,0.));vec3 p=CP+d*(.4+1.3*aSeed.z)*(1.-exp(-t*3.5));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.22+.18*aSeed.w)*(1.-age*.5));}`,STAR4_FS);
  // estado heroico: espirales de motas y estrellas ascendentes en bucle
  a.count+=points(L.part,110,C+`void main(){float life=.9+aSeed.y*.6;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*4.;float rad=(.5+.2*r.y)*(1.-age*.4);
   vec3 p=vec3(${f(CX)}+cos(an)*rad,.05+age*(1.6+.8*r.z),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,.035+.04*r.z);}`);
  a.count+=points(L.part,35,C+`void main(){float life=.7+aSeed.y*.5;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(${f(CX)}+(r.x-.5)*1.2,.3+r.y*1.4+age*.7,(r.z-.5)*1.2);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.13+.15*r.z)*sin(age*3.14159));}`,STAR4_FS);

  a.pose=function(te,o){
    const ia=te-TI, fy=front(te), up=fy/H, env=ss(TI,TI+0.25,te)*(1-ss(TE,TF,te));
    caster.rotation.z=0.15*ss(0,TD,te)-0.15*ss(TI,TI+0.2,te);
    // crece ligeramente y lo conserva; vuelve a su tamaño al final del bucle
    const grow=1+0.08*ss(TI,TI+0.35,te)*(1-ss(TF-0.3,TF,te)), land=ia>=0?0.06*Math.exp(-ia*10)*Math.sin(ia*30):0;
    caster.scale.set(grow*(1+land*0.5),grow*(1-land),grow*(1+land*0.5));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=(ia>=0?0.8*Math.exp(-ia*4):0.2*ss(0,TD,te))+0.18*env*(0.75+0.25*Math.sin(te*6));
    // pilar: baja, estalla en anchura al tocar el suelo y se estrecha hasta apagarse
    const pa=ss(TD-0.05,TD+0.05,te)*(1-ss(TI+0.4,TE-0.3,te)), wid=ia>=0?1+0.4*Math.exp(-ia*6)-0.35*ss(TI+0.2,TE-0.3,te):1;
    pillar.visible=core.visible=pa>0.001; pillar.scale.set(wid,1,wid); core.scale.set(wid,1,wid);
    set(pillar,up,pa*(ia>=0?0.85+0.5*Math.exp(-ia*5):0.75)); set(core,up,pa*(ia>=0?0.5+0.7*Math.exp(-ia*4):0.5));
    cape.visible=env>0.001; cape.position.set(CX,1.0*grow,0); cape.scale.set(grow,grow*(0.5+0.5*ss(TI,TI+0.4,te)),grow); cape.material.uniforms.uA.value=env;
    towardCam(crest.position,tmp.set(CX,2.45*grow+0.06*Math.sin(te*3),0),0.25); billboard(crest);
    crest.visible=env>0.001; crest.scale.setScalar(0.75+0.4*Math.pow(1-cl((ia-0.1)/0.35),2)*(ia>0.1?1:0)); set(crest,cl((te-TI-0.2)/0.7),env*ss(TI+0.05,TI+0.2,te));
    set(sigil,ss(0,TD+0.2,te),ss(0,0.2,te)*(1-ss(TE,TF,te)));
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    U.uE.value=env;
    if(te<TD){o.g.copy(CP).y+=1.2;o.gs=0.75*ss(0,TD,te);o.ga=0.28*ss(0,TD,te);o.li=1.6*ss(0,TD,te);}
    else if(te<TI){o.g.set(CX,Math.max(fy,0.3),0);o.gs=1.7;o.ga=0.55;o.li=4.5;}
    else{o.g.copy(CP);o.gs=1.9+2.2*Math.min(ia,0.5);o.ga=Math.exp(-ia*7)*0.65+0.1*env;o.li=8*Math.exp(-ia*4)+2*env;}
    o.ia=ia;o.c.copy(CP);o.shake=0;o.dist=0.6;o.flash=0;
  };
}},0.75);

// =====================================================================
// 3 · JAGUAR — salto sombrío con silueta de jaguar en llamas; cae en picado y lanza un zarpazo triple
// =====================================================================
const jaguar=tempo({key:"jaguar",name:"Jaguar",dur:2.6,ti:1.2,pal:"Fuego",
  phases:[["Acecho",0],["Salto",0.25],["Picado",0.7],["Zarpazos",0.92],["Remate",1.2],["Regreso",1.65]],
build(a){
  const L=a.L,TC=0.25,TA=0.7,TL=0.88,TR=1.65,TE=2.2,X0=-3.85,AX=1.0,AY=2.6,LX=2.4;
  const CUT=[0.94,1.07,1.2], ANG=[0.85,-0.75,0.12], CH=V3(3.25,1.15,0);
  const jp=(te,out)=>{
    if(te<TC)return out.set(-3.7-0.15*ss(0,TC,te),0,0);
    if(te<TA){const k=(te-TC)/(TA-TC);return out.set(X0+(AX-X0)*(1-(1-k)*(1-k)),AY*Math.sin(k*Math.PI/2),0);}
    if(te<TL){const k=(te-TA)/(TL-TA);return out.set(AX+(LX-AX)*k,AY*(1-k*k),0);}
    if(te<TR){let x=LX-0.15*ss(TL,TL+0.06,te);for(const c of CUT)x+=0.12*Math.exp(-Math.max(te-c+0.04,0)*14)*(te>c-0.04?1:0);return out.set(x,0,0);}
    const k=cl((te-TR)/(TE-TR));return out.set(LX-0.15+(-3.55-LX)*ss(0,1,k),0.9*Math.sin(Math.PI*k),0);};
  // silueta felina de perfil (SDF): tronco, cabeza, orejas, patas estiradas en salto y cola que ondea
  const CAT=SDF2+`float sdCat(vec2 p,float t){
   float d=sdSeg(p,vec2(-.45,.02),vec2(.4,.05))-.14;
   d=smin(d,sdSeg(p,vec2(.4,.06),vec2(.64,.13))-.1,.06);
   d=smin(d,length(p-vec2(.7,.14))-.12,.04);d=min(d,sdSeg(p,vec2(.72,.12),vec2(.87,.08))-.055);
   d=min(d,length(p-vec2(.63,.27))-.045);d=min(d,length(p-vec2(.74,.27))-.04);
   d=smin(d,sdSeg(p,vec2(.33,-.04),vec2(.72,-.24))-.05,.05);d=min(d,sdSeg(p,vec2(.72,-.24),vec2(.93,-.21))-.034);
   d=smin(d,sdSeg(p,vec2(.27,-.07),vec2(.6,-.33))-.045,.05);
   d=smin(d,sdSeg(p,vec2(-.36,-.03),vec2(-.7,-.23))-.06,.05);d=min(d,sdSeg(p,vec2(-.7,-.23),vec2(-.95,-.3))-.034);
   d=smin(d,sdSeg(p,vec2(-.31,-.07),vec2(-.6,-.34))-.05,.05);
   vec2 tm=vec2(-.72,.2+.05*sin(t*7.));
   d=smin(d,sdSeg(p,vec2(-.45,.07),tm)-.034,.04);d=min(d,sdSeg(p,tm,vec2(-.97,.15+.07*sin(t*7.+1.5)))-.024);
   return d;}`;
  const catDark=new THREE.Mesh(new THREE.PlaneGeometry(3.0,1.5),fx(CAT+`
  void main(){vec2 p=(vUv-.5)*vec2(2.,1.)*1.06;p+=vec2(noise(vec3(p*4.,uT*3.)),noise(vec3(p*4.+5.,uT*3.)))*.03;
   float d=sdCat(p,uT);gl_FragColor=vec4(vec3(.03,.008,.01),smoothstep(.02,-.02,d)*.62*uA);}`,Object.assign({depthTest:false},NB)));
  const catFire=new THREE.Mesh(new THREE.PlaneGeometry(3.0,1.5),fx(CAT+`
  void main(){vec2 p=(vUv-.5)*vec2(2.,1.)*1.06;float d=sdCat(p,uT);
   float n=noise(vec3(p*vec2(5.,9.)+vec2(uT*7.,-uT*3.),uT));
   float fl=(1.-smoothstep(0.,.05+.17*n,d))*step(-.02,d);
   float rim=band(d,0.,.022);
   float ros=band(noise(vec3(p*vec2(9.,12.),1.7)),.55,.05)*smoothstep(-.02,-.06,d);
   float eye=smoothstep(.035,0.,length((p-vec2(.75,.17))*vec2(1.,1.8)));
   gl_FragColor=vec4(mix(uC2,uC1,fl*n+rim)*1.7+vec3(1.)*(rim*.4+eye),(fl*(.5+.6*n)+rim+ros*.8+eye)*uA);}`,{depthTest:false}));
  catFire.renderOrder=1; L.mesh.add(catDark,catFire);
  // zarpazos: cuatro surcos paralelos que barren; capa oscura detrás y rasgadura que persiste (uQ)
  const clawCore=`uniform float uQ;
  void main(){vec2 p=vUv;float u=p.x;float m=0.,core=0.,wide=0.;
   for(int i=0;i<4;i++){float fi=float(i);float off=(fi-1.5)*.1+.015*sin(fi*2.3);
    float y=(p.y-.5-off)-.12*(1.-pow(2.*u-1.,2.));float w=(.006+.028*sin(3.14159*u))*(1.-abs(fi-1.5)*.18);
    m=max(m,smoothstep(w*2.2,0.,abs(y)));wide=max(wide,smoothstep(w*3.8,0.,abs(y)));core=max(core,smoothstep(w*.5,0.,abs(y)));}
   float d=uP-u;float sweep=step(0.,d)*exp(-d*3.)*smoothstep(0.,.05,u)*smoothstep(1.,.92,u);
   float sc=step(u,uP)*sin(3.14159*u);`;
  const claws=CUT.map((t,i)=>{
    const dk=new THREE.Mesh(new THREE.PlaneGeometry(i===2?2.7:2.1,i===2?1.35:1.05),fxU(clawCore+`
     gl_FragColor=vec4(vec3(.03,.01,.01),min(wide*(sweep*uA+uQ*.75*sc),1.)*.85);}`,{uQ:{value:0}},Object.assign({depthTest:false},NB)));
    const fr=new THREE.Mesh(new THREE.PlaneGeometry(i===2?2.7:2.1,i===2?1.35:1.05),fxU(clawCore+`
     float n=noise(vec3(u*10.-uT*8.,p.y*12.,uT*3.));
     gl_FragColor=vec4(mix(uC2,uC1,core+n*.4)*1.7+vec3(1.)*core*.5,(m*(.45+.6*n)+core)*sweep*uA+core*sc*uQ);}`,{uQ:{value:0}},{depthTest:false}));
    fr.renderOrder=1; L.trail.add(dk,fr); return [dk,fr];});
  // huella de zarpa luminosa en el remate
  const paw=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),fx(`void main(){vec2 p=(vUv-.5)*2.;
   float pad=length((p-vec2(0.,-.25))*vec2(1.,1.25))-.34;
   float d=min(pad,min(min(length(p-vec2(-.42,.18))-.14,length(p-vec2(-.15,.42))-.15),min(length(p-vec2(.15,.42))-.15,length(p-vec2(.42,.18))-.14)));
   float n=noise(vec3(p*5.,uT*4.));float fill=smoothstep(.03,-.03,d);float rim=band(d,0.,.05);float halo=smoothstep(.4,0.,d)*.3;
   gl_FragColor=vec4(mix(uC2,uC1,n*.6+rim)*1.6+vec3(1.)*rim*.4,(fill*.35+rim+halo)*uA);}`,{depthTest:false}));
  L.mesh.add(paw);

  const C=`const float TC=${f(TC)};const float TA=${f(TA)};const float TL=${f(TL)};const float TI=${f(CUT[2])};const vec3 CH=${v3(CH)};
  vec3 jp(float t){if(t<TC)return vec3(-3.7,0.,0.);
   if(t<TA){float k=(t-TC)/(TA-TC);return vec3(${f(X0)}+${f(AX-X0)}*(1.-(1.-k)*(1.-k)),${f(AY)}*sin(k*1.5708),0.);}
   float k=clamp((t-TA)/(TL-TA),0.,1.);return vec3(${f(AX)}+${f(LX-AX)}*k,${f(AY)}*(1.-k*k),0.);}`;
  // estela de sombra (mezcla normal) y ascuas a lo largo del salto
  a.count+=points(L.part,90,C+`void main(){float s=TC+aSeed.x*(TL-TC);float life=.45+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=jp(s)+vec3(0.,.7,0.)+r*vec3(.3,.32,.25)+vec3(-.2*t,.15*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.75:0.;put(p,(.34+.26*aSeed.w)*(.7+age*.8));}`,SMOKE_FS("vec3(.05,.02,.03)"),NB);
  a.count+=points(L.part,100,C+`void main(){float s=TC+aSeed.x*(TL-TC);float life=.35+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=jp(s)+vec3(0.,.75,0.)+r*vec3(.5,.35,.3)+vec3(-.4*t,.5*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.z*40.)):0.;put(p,(.04+.05*aSeed.w)*(1.-age*.5));}`);
  // polvo al agazaparse y al caer
  a.count+=points(L.part,30,C+`void main(){float s=TC-.05+aSeed.x*.08;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.85,.05,0.)+vec3(cos(an),0.,sin(an))*(.25+.6*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.24+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,45,C+`void main(){float s=TL+aSeed.x*.06;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(LX)},.05,0.)+vec3(cos(an),0.,sin(an))*(.3+.9*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.3*(1.-exp(-t*3.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.28+.25*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // una ráfaga de chispas por zarpazo, la última mayor
  CUT.forEach((t,i)=>{a.count+=sparks(L.part,i===2?100:50,t,`${f(CH.x)},${f(CH.y)},.3`,i===1?".5,.6,.3":".5,-.5,.3",2.5,i===2?8:6,3);});
  // remate: llamas que brotan del objetivo y brasas que flotan
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.2;float life=.4+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(3.4+r.x*.4,.3+aSeed.z*1.3,r.z*.4)+vec3(0.,.9*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.15+.13*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
  a.count+=points(L.part,55,C+`void main(){float s=TI+aSeed.x*.4;float life=.7+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(.3,.6,0.));vec3 p=CH+d*(.25+1.*aSeed.z)*(1.-exp(-t*3.))+vec3(sin(t*5.+aSeed.w*6.)*.12,t*.8,0.);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.x*50.)):0.;put(p,.035+.05*aSeed.w);}`);

  // suelo: sombra del felino que sigue al salto, quemadura suave de la caída y onda (nivel 2: sin cráter ni surcos)
  const shadow=groundPlane(1.8,0,0.012,fx(`void main(){vec2 p=(vUv-.5)*2.;float d=length(p*vec2(1.,1.9));
   gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.25,d)*.6*uA);}`,NB));
  const crater=groundPlane(1.7,LX,0.015,fx(SOFTBURN_FS)), shock=groundPlane(4,CH.x,0.03,fx(RING_FS));
  L.decal.add(shadow,crater,shock);

  const jv=V3(0,0,0), jc=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-CUT[2]; jp(te,jc);
    let last=-1; for(const c of CUT)if(te>=c)last=c;
    caster.position.set(jc.x,jc.y,0);
    const cut=last>0?Math.exp(-(te-last)*10):0, ci=CUT.indexOf(last);
    caster.rotation.z=0.3*ss(TC,TC+0.1,te)*(1-ss(TA-0.15,TA,te))-0.95*ss(TA,TL,te)*(1-ss(TL,TL+0.1,te))
      +(last>0?(ci===1?0.3:-0.35)*cut:0)+0.2*ss(TR,TR+0.2,te)*(1-ss(TE-0.2,TE,te));
    const crouch=ss(0,TC,te)*(1-ss(TC,TC+0.06,te));
    caster.scale.set(1+0.12*crouch,1-0.22*crouch+0.1*ss(TC,TC+0.1,te)*(1-ss(TA-0.1,TL,te)),1+0.12*crouch);
    // silueta: acompaña al lanzador y se orienta según la velocidad
    jp(te+0.006,jv); jv.sub(jp(te-0.006,tmp));
    const ang=te<TC||te>=TL?0:Math.max(-1.25,Math.min(0.8,Math.atan2(jv.y,jv.x)));
    const ca=ss(TC-0.15,TC+0.05,te)*(1-ss(TL-0.02,TL+0.12,te));
    towardCam(tmp.set(jc.x,jc.y+0.8,0),tmp,0.35);
    for(const m of [catDark,catFire]){m.position.copy(tmp);billboard(m,ang);m.visible=ca>0.001;
      m.scale.set(0.8*(0.85+0.25*ss(TC,TA,te)+0.3*ss(TA,TL,te)+0.3*ss(TL,TL+0.12,te)),0.8*(0.85+0.2*ss(TC,TA,te)),1);}
    set(catDark,0,ca*(1-ss(TL-0.02,TL+0.06,te))); set(catFire,0,ca*(1+0.5*ss(TA,TL,te)));
    // zarpazos sucesivos sobre el pecho
    claws.forEach(([dk,fr],i)=>{const t0=CUT[i]-0.07,s=(te-t0)/0.07,q=s>=1?Math.exp(-(te-CUT[i])*2):0;
      for(const m of [dk,fr]){m.visible=s>=0&&te<2.2;towardCam(m.position,CH,0.55+i*0.02);billboard(m,ANG[i]);
        set(m,Math.min(s,1)*1.2+Math.max(0,s-1)*0.5,s>1?Math.exp(-(s-1)*1.2):1);m.material.uniforms.uQ.value=q;}});
    let p=cl(ia/0.5); towardCam(paw.position,CH,0.7); billboard(paw,-0.25); paw.visible=ia>=0&&p<1;
    paw.scale.setScalar(0.7+0.6*p); paw.material.uniforms.uA.value=0.85*Math.pow(1-p,1.4);
    shadow.position.x=jc.x; shadow.scale.setScalar(Math.max(1.2-jc.y*0.22,0.3)); shadow.material.uniforms.uA.value=ss(TC-0.1,TC,te)*(1-ss(TL-0.05,TL,te))*(1-jc.y*0.15);
    crater.material.uniforms.uA.value=te>=TL?0.8*(1-cl((te-TL)/1.4)):0;
    p=cl(ia/0.55); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    // reacción: dos sacudidas cortas y un retroceso fuerte en el remate
    const kb=last>0?(ci===2?0.32:0.08)*Math.exp(-(te-last)*(ci===2?4:9)):0;
    target.position.x=3.4+kb+(ci>=1?0.08:0)*(1-ss(1.6,2.1,te)); target.rotation.z=-kb*0.7*Math.cos((te-last)*16);
    if(last<0){o.g.set(jc.x+0.3,jc.y+0.9,0);o.gs=te<TC?0.6:1.1;o.ga=ca*0.35;o.li=0.8+2.2*ca;}
    else{const il=te-last;o.g.copy(CH);o.gs=1+(ci===2?2.8:1.5)*il;o.ga=Math.exp(-il*11)*(ci===2?0.7:0.45);o.li=(ci===2?8:4)*Math.exp(-il*6);}
    o.ia=last>0?te-last:ia;o.c.copy(CH);o.shake=0;o.dist=ci===2?0.7:0.3;o.flash=ci===2||last<0?1:0.7;
  };
}},0.85);

// =====================================================================
// 4 · RICE — lluvia de granos dorados sobre el rival; los granos se compactan en un fruto de luz que vuela al lanzador
// =====================================================================
const rice=tempo({key:"rice",name:"Rice",dur:3.2,ti:0.95,pal:"Dorado",
  phases:[["Siembra",0],["Lluvia",0.35],["Cosecha",0.95],["Fruto",1.3],["Retorno",1.8],["Sustento",2.3]],
build(a){
  const L=a.L,TR=0.35,TRE=1.25,TI=0.95,TX=1.3,TF=1.8,TA=2.3,TE=3.1,RX=3.4,OP=V3(3.25,2.55,0),CA=V3(-3.75,1.35,0);
  const orbAt=(te,out)=>{const k=ss(TF,TA,te),b=Math.sin(Math.PI*k);return out.set(OP.x+(CA.x-OP.x)*k,OP.y+(CA.y-OP.y)*k+1.3*b,0.4*b);};
  // nube de espigas sobre el rival: bruma dorada con destellos de grano
  const cloud=groundPlane(2.6,RX,3.5,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*5.,uT*.6))*.6+noise(vec3(p*12.+vec2(uT*.3,0.),2.))*.4;
   float sw=noise(vec3(an*3.+r*4.-uT*2.,r*3.,1.));
   float m=smoothstep(1.,.4,r)*(.15+.5*smoothstep(.45,.8,n))+band(r,.8,.06)*sw*.6;
   float gl=step(.94,hash(vec3(floor(p*60.),floor(uT*10.))))*smoothstep(1.,.5,r);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3+vec3(1.)*gl,(m+gl)*uA);}`));
  // fruto de luz: esfera opaca hecha de granos apretados (celdas alargadas), juntas que brillan en ámbar
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.24,40,28),fx(`
  void main(){vec3 q=normalize(vP);vec3 g=q*4.2;vec3 id=floor(g),fp=fract(g);float md=9.,md2=9.;
   for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){vec3 o=vec3(float(i),float(j),float(k));vec3 c=id+o;
    vec3 h=vec3(hash(c),hash(c+7.31),hash(c+13.7));vec3 d=(o+h-fp)*vec3(1.,.5,1.);float l=dot(d,d);
    if(l<md){md2=md;md=l;}else if(l<md2){md2=l;}}
   float inG=smoothstep(0.,.1,sqrt(md2)-sqrt(md));
   float lit=.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec3 grain=mix(vec3(1.,.95,.8),uC1,.35)*lit*(1.-sqrt(md)*.5);
   gl_FragColor=vec4(mix(uC2*1.9,grain*1.3,inG)+uC1*fr*1.3+vec3(1.)*uP*.7,1.);}`,SOLID));
  L.mesh.add(cloud,orb);
  // suelo: espigas radiales (granos a ambos lados de cada tallo) que se revelan con la lluvia
  const field=groundPlane(2.5,RX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float sp=(fract(an/6.2832*8.+.0625)-.5)*r*.785;float al=fract(r*11.)-.5;
   float grain=smoothstep(.5,.3,length(vec2(al*.9,(abs(sp)-.035)*9.)))*step(.18,r)*step(r,.8);
   float stem=smoothstep(.006,0.,abs(sp))*step(.15,r)*step(r,.84);
   float m=(grain+stem*.6)*step(r,uP)+band(r,.92,.02)+band(r,uP,.04)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,grain)*1.35,m*uA);}`));
  const casterGlow=groundPlane(1.7,CA.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*8.,uT));gl_FragColor=vec4(mix(uC2,uC1,n)*1.2,smoothstep(1.,.2,r)*(.25+.2*n)*uA);}`));
  L.decal.add(field,casterGlow);

  const C=`const float TR=${f(TR)};const float TRE=${f(TRE)};const float TI=${f(TI)};const float TX=${f(TX)};const float TF=${f(TF)};const float TA=${f(TA)};
  const vec3 OP=${v3(OP)};const vec3 CA=${v3(CA)};const vec3 CB=${v3(CB)};varying float vR;
  vec3 orb(float t){float k=clamp((t-TF)/(TA-TF),0.,1.);k=k*k*(3.-2.*k);float b=sin(3.14159*k);return mix(OP,CA,k)+vec3(0.,1.3*b,.4*b);}`;
  // siembra: un puñado de granos sale de la espalda hacia el cielo
  a.count+=points(L.part,45,C+`void main(){float s=.04+aSeed.x*.25;float t=uT-s;float c=max(t,0.);vec3 r=rnd();
   vec3 p=CB+vec3(.2,.2,0.)+vec3((1.2+r.x*.6)*c,(7.+2.*aSeed.y)*c-4.*c*c,r.z*.8*c);
   vA=(t>0.&&t<.5)?1.-smoothstep(.3,.5,t):0.;vR=aSeed.z*6.2832+c*12.;put(p,.12+.04*aSeed.w);}`,GRAIN_FS);
  // lluvia de granos: caen en vertical; los que tocan suelo quedan brillando un rato, los que dan en el rival se apagan
  a.count+=points(L.part,220,C+`void main(){float s=TR+aSeed.x*(TRE-TR);float fall=.45+.2*aSeed.y;float t=uT-s;
   float an=aSeed.z*6.2832;float rd=sqrt(aSeed.w)*1.0;vec2 xz=vec2(cos(an),sin(an))*rd;
   float onBody=step(rd,.42);float yl=mix(.03,1.3+.25*aSeed.y,onBody);
   float k=clamp(t/fall,0.,1.);float y=mix(3.45,yl,k*(.55+.45*k));
   vec3 p=vec3(${f(RX)}+xz.x,y,xz.y);float lt=t-fall;
   float air=(t>0.&&lt<0.)?1.:0.;float ground=(lt>=0.)?(1.-onBody)*(1.-smoothstep(.9,1.7,lt))*(.6+.4*sin(uT*9.+aSeed.x*60.)):0.;
   float splash=(lt>=0.&&lt<.1)?onBody*(1.-lt*10.):0.;
   vA=max(air,max(ground*.8,splash));vR=lt<0.?.3*(aSeed.y-.5)+.15*sin(uT*8.+aSeed.x*30.):aSeed.z*6.2832;
   put(p,(.13+.04*aSeed.y)*(lt<0.?1.:.8));}`,GRAIN_FS);
  // destellos de cada grano que acierta
  a.count+=points(L.part,30,C+`void main(){float s=TR+.45+aSeed.x*(TRE-TR);float life=.15;float age=(uT-s)/life;
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(RX)}+cos(an)*.42,.45+aSeed.y*1.3,sin(an)*.42);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.16*(1.-age*.5));}`,STAR4_FS);
  a.count+=sparks(L.part,70,TI,`${f(TC.x)},${f(TC.y+0.2)},0.`,"-.2,.6,0.",2,6,2.5);
  // extracción: granos que salen del rival en espiral y se compactan en el fruto
  a.count+=points(L.part,130,C+`void main(){float s=TX+aSeed.x*(TF-TX-.12);float dur=.32+.14*aSeed.y;float k=clamp((uT-s)/dur,0.,1.);
   float an=aSeed.z*6.2832;vec3 st=vec3(${f(RX)}+cos(an)*.5,.2+aSeed.w*1.3,sin(an)*.5);
   vec3 dir=normalize(rnd()+.0001);vec3 en=OP+dir*.2;float sw=(1.-k)*2.5;
   vec3 p=mix(st,en,k*k)+vec3(cos(an+sw),0.,sin(an+sw))*.45*(1.-k)*k*2.;
   vA=(uT>s&&uT<TF+.05)?smoothstep(0.,.1,k)*(1.-smoothstep(TF-.05,TF+.05,uT)*k):0.;vR=an+k*6.;
   put(p,.12+.03*aSeed.y);}`,GRAIN_FS);
  // vuelo: cascarilla y granos que caen girando, polvo dorado
  a.count+=points(L.part,70,C+`void main(){float s=TF+aSeed.x*(TA-TF);float life=.7+aSeed.y*.3;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 r=rnd();vec3 p=orb(s)+r*.15+vec3(r.x*.3*c,-2.6*c*c,r.z*.3*c);
   vA=(age>0.&&age<1.&&p.y>.03)?(1.-age):0.;vR=aSeed.z*6.2832+c*(5.+6.*aSeed.w);put(p,.11+.03*aSeed.w);}`,GRAIN_FS);
  a.count+=points(L.part,70,C+`void main(){float s=TF+aSeed.x*(TA-TF);float life=.35+aSeed.y*.3;float age=(uT-s)/life;float c=max(uT-s,0.);
   vec3 r=rnd();vec3 p=orb(s)+r*.12+r*.3*c+vec3(0.,.25*c,0.);vR=0.;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.035+.05*aSeed.z)*(1.-age*.5));}`);
  // llegada: el fruto se deshace en granos que caen del lanzador y destellos que suben
  a.count+=points(L.part,50,C+`void main(){float s=TA+aSeed.x*.1;float t=uT-s;float c=max(t,0.);vec3 d=normalize(rnd()+vec3(0.,.4,0.));
   vec3 p=CA+d*(.2+.5*aSeed.z)*(1.-exp(-c*5.))+vec3(0.,-2.8*c*c,0.);p.y=max(p.y,.03);
   vA=(t>0.&&t<1.)?(1.-t*t):0.;vR=aSeed.w*6.2832+c*8.*step(.035,p.y);put(p,.12);}`,GRAIN_FS);
  a.count+=points(L.part,20,C+`void main(){float life=.7+aSeed.y*.4;float k=(uT-TA)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=CA+vec3((r.x-.5)*.85,-.9+r.y*1.1+age*.8,(r.z-.5)*.85);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.12+.14*r.z)*sin(age*3.14159));}`,STAR4_FS);

  const op=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, iA=te-TA, rain=ss(TR-0.1,TR+0.1,te)*(1-ss(TRE,TRE+0.3,te)), env=iA>=0?ss(0,0.2,iA)*(1-ss(TE-0.5,TE,te)):0;
    caster.rotation.z=0.2*ss(0,0.12,te)-0.32*ss(0.12,0.22,te)+0.12*ss(0.25,0.6,te)+(iA>=0?-0.12*Math.exp(-iA*6)*Math.sin(iA*18):0);
    cloud.material.uniforms.uA.value=rain;
    set(field,ss(TR+0.2,TRE+0.1,te),ss(TR,TR+0.3,te)*(1-ss(2.2,2.8,te)));
    // el fruto se forma sobre el rival, vuela en arco y se funde con el lanzador
    orbAt(te,op); const grow=ss(TX+0.12,TF,te), sink=iA>=0?1-ss(0,0.15,iA):1;
    orb.visible=te>=TX+0.1&&iA<0.15; orb.position.copy(op);
    orb.scale.setScalar(Math.max((0.35+0.65*grow)*sink*(1+0.06*Math.sin(te*14)*(te<TF?1:0)),0.001));
    orb.rotation.set(0.3,te*2.5,0.2); orb.material.uniforms.uP.value=te<TF?0.4*Math.pow(1-grow,2)+0.35*ss(TF-0.1,TF,te)*(1-ss(TF,TF+0.15,te)):0;
    casterGlow.material.uniforms.uA.value=env;
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=iA>=0?0.65*Math.exp(-iA*4)+0.16*env*(0.7+0.3*Math.sin(te*5)):0;
    // reacción: picoteo durante la lluvia, sacudida en la cosecha, se apaga al perder el fruto
    const hit=hitK(ia,6); target.position.x=3.4+hit*0.1+0.012*rain*Math.sin(te*61);
    target.rotation.z=-hit*0.2*Math.cos(ia*15)+0.03*rain*Math.sin(te*43);
    target.scale.set(1,1-0.05*ss(TX,TF,te)*(1-ss(TF,TF+0.5,te)),1);
    o.em=0.35*ss(TX,TX+0.2,te)*(1-ss(TF,TF+0.3,te)); o.emc.copy(U.uC1.value);
    if(te<TR){o.g.copy(CB);o.gs=0.65;o.ga=0.24*ss(0,0.15,te);o.li=1.2;}
    else if(te<TX){o.g.set(RX,2.0,0);o.gs=1.9;o.ga=0.12*rain+(ia>=0?0.52*Math.exp(-ia*10):0);o.li=1.5+2.2*rain+(ia>=0?5.5*Math.exp(-ia*5):0);}
    else if(te<TA){o.g.copy(op);o.gs=1+0.45*grow;o.ga=0.42*grow;o.li=3*grow+0.8;}
    else{o.g.copy(CA);o.gs=1.45+1.5*Math.min(iA,0.5);o.ga=Math.exp(-iA*7)*0.6+0.08*env;o.li=6*Math.exp(-iA*5)+1.5*env;}
    if(te<TA){o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.45;o.flash=1;}
    else{o.ia=iA;o.c.copy(CA);o.shake=0;o.dist=0.3;o.flash=0;}
  };
}},0.72);

// =====================================================================
// 5 · RISKY BEAST — la bestia se juega la vida: tres latidos la sobrecalientan (grietas rojas, cresta de púas
//     de fuego en la espalda), sale como un cometa con cono de choque y surco quemado, y al impactar se lleva
//     ella también el retroceso (el "riesgo"). Nivel 2: púas cortas, cono discreto, quemadura sin roca, sin temblor
// =====================================================================
const risky=tempo({key:"risky",name:"Risky Beast",dur:2.8,ti:1.4,pal:"Carmesí",
  phases:[["Latidos",0],["Sobrecarga",0.75],["Embestida",0.95],["Impacto",1.4],["Retroceso",1.6]],
build(a){
  const L=a.L,TB=[0.12,0.45,0.7],TD=0.95,TI=1.4,X0=-3.7,XH=2.6,TE=2.6;
  const cx=te=>{if(te<TD)return X0-0.3*ss(0.75,TD,te);
    if(te<TI){const k=(te-TD)/(TI-TD);return X0-0.3+(XH-X0+0.3)*Math.pow(k,1.6);}
    return XH-0.7*ss(TI,TI+0.35,te)-(XH-0.7-X0)*ss(1.9,2.6,te);};
  // latidos: suma de pulsos cortos (para escala, grietas y luz)
  const beat=te=>{let b=0,n=0;for(const t of TB)if(te>=t){b+=Math.exp(-(te-t)*9);n++;}return [b,n];};
  // ---- cuerpo sobrecalentado: grietas de luz roja (aristas de celdas de ruido) que se abren con cada latido
  const CRACK_FS=`void main(){vec3 q=vP*5.;
   float n=noise(q)*.6+noise(q*2.3+3.)*.4;float cr=pow(1.-abs(n*2.-1.),10.);
   float n2=noise(q*4.+7.);cr=max(cr,pow(1.-abs(n2*2.-1.),16.)*.7);
   float open=smoothstep(1.-uP,1.-uP+.3,noise(vP*1.7+11.));
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.),.4),cr)*1.8,(cr*open*1.2+fr*.25*uP)*uA);}`;
  const crackMat=fx(CRACK_FS);
  const shellG=new THREE.Group(); L.mesh.add(shellG);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.44,1.27,32,6,true),crackMat); body.position.y=0.625;
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.285,28,18),crackMat); head.position.y=1.6;
  shellG.add(body,head);
  // ---- cresta de púas de fuego a lo largo de la espalda (lado −x), crecen con cada latido
  const spineMat=fx(`void main(){float l=vP.y/.5+.5;float n=noise(vec3(vP.x*9.,vP.y*7.-uT*9.,vP.z*9.));
   float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.),pow(l,3.)),l)*1.6,(.45+.55*fr)*(.6+.5*n)*smoothstep(0.,.15,l)*uA);}`);
  const spines=[]; const SP=[[-0.2,1.84,0.75],[-0.4,1.52,1.2],[-0.46,1.16,1.42],[-0.44,0.82,1.55]];
  for(const [x,y,ang] of SP){const s=new THREE.Mesh(new THREE.ConeGeometry(0.065,0.3,10,1,true).translate(0,0.15,0),spineMat);
    s.position.set(x,y,0); s.rotation.z=ang; s.userData.k=spines.length; spines.push(s); shellG.add(s);}
  // ---- cometa: cono de choque abierto hacia atrás con anillos que corren por él, y llama de cola
  const mach=new THREE.Mesh(new THREE.ConeGeometry(0.75,1.5,40,8,true).rotateZ(Math.PI/2).translate(-0.75,0,0),fx(`void main(){
   float u=-vP.x/1.5;float ring=pow(.5+.5*sin(u*20.+uT*40.),6.);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   float n=noise(vec3(vP.x*3.+uT*12.,vP.y*4.,vP.z*4.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),.25)*1.3,(fr*.32+ring*.18)*smoothstep(1.,.05,u)*smoothstep(0.,.08,u)*(.6+.4*n)*uA);}`));
  const tailG=new THREE.PlaneGeometry(1,1.1).translate(-0.5,0,0);
  const tailM=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*5.-uT*14.,v*3.,uT*2.))*.65+noise(vec3(u*11.-uT*20.,v*7.,1.))*.35;
   float al=smoothstep(u*(.35+.65*n),0.,v)*pow(u,1.3)*uA;
   gl_FragColor=vec4(mix(uC2,mix(uC1,vec3(1.),.5),pow(u,2.)*n)*1.7,al);}`);
  const comet=new THREE.Group(), t1=new THREE.Mesh(tailG,tailM), t2=new THREE.Mesh(tailG,tailM); t2.rotation.x=Math.PI/2;
  comet.add(mach,t1,t2); L.trail.add(comet);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  // ---- partículas
  const C=`const float TD=${f(TD)};const float TI=${f(TI)};
  float cx(float t){float k=clamp((t-TD)/(TI-TD),0.,1.);return ${f(X0-0.3)}+${f(XH-X0+0.3)}*pow(k,1.6);}`;
  // vapor de calor que sube del cuerpo en cada latido
  for(const [i,t] of TB.entries())a.count+=points(L.part,40+i*15,C+`void main(){float s=${f(t)}+aSeed.x*.08;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float tt=max(uT-s,0.);
   vec3 r=rnd();float x=${f(X0)}-.3*smoothstep(.75,TD,uT);
   vec3 p=vec3(x+r.x*.4,.2+aSeed.z*1.7,r.z*.4)+vec3(r.x*.5*tt,tt*(1.2+aSeed.w),r.z*.5*tt);
   vA=(age>0.&&age<1.&&uT<TD)?(1.-age)*(.55+.45*sin(tt*30.+aSeed.w*40.)):0.;put(p,(.025+.04*aSeed.w)*(1.-age*.5));}`);
  // brasas arrancadas a lo largo de la carrera
  a.count+=points(L.part,200,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.45+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s)-.3,.2+aSeed.z*1.4,r.z*.4)+vec3(-1.2*t+r.x*.4*t,(1.+aSeed.w)*t-1.2*t*t,r.z*.9*t);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*28.+aSeed.w*40.)):0.;put(p,(.03+.045*aSeed.w)*(1.-age*.5));}`);
  // impacto: chispas, polvo y astillas de "la propia bestia" que salen hacia atrás (el retroceso)
  a.count+=sparks(L.part,170,TI,"3.,1.,0.","1.,.35,0.",3.5,9,3.5);
  a.count+=sparks(L.part,70,TI+0.02,"2.5,1.1,0.","-1.,.6,0.",2.5,6,3);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.2;float life=.9+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=(aSeed.z*2.-1.)*1.4;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=vec3(3.,.1,0.)+d*(.7+2.*aSeed.w)*(1.-exp(-t*2.5))+vec3(0.,.15+.55*(1.-exp(-t*1.5)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.85:0.;put(p,(.34+.36*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // ---- suelo: anillos de calor por latido, surco quemado (hollín con brasa tenue) que se apaga, estampidos a lo largo del camino
  const beatRings=TB.map(()=>{const m=groundPlane(2.4,X0,0.03,fx(RING_FS));L.decal.add(m);return m;});
  const trench=groundPlane(1,0,0.02,fx(`uniform float uQ;
   void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP)discard;
    float age=max(uQ-u*${f(TI-TD)},0.);
    float n=noise(vec3(u*30.,vUv.y*5.,1.))*.6+noise(vec3(u*70.,vUv.y*12.,2.))*.4;
    float edge=smoothstep(.55+.25*n,.15,v);float core=smoothstep(.3,0.,v+(n-.5)*.2);
    float hot=exp(-age*2.2);
    vec3 c=mix(uC2*.5,uC1*.8,core*hot)*1.2;
    gl_FragColor=vec4(c,(edge*.18*hot+core*(.12+.4*hot))*uA);}`),0.6);
  trench.material.uniforms.uQ={value:0};
  const booms=[-2.2,-0.5,1.1].map(x=>{const m=groundPlane(2.1,x,0.035,fx(RING_FS));m.userData.x=x;L.decal.add(m);return m;});
  const shock=groundPlane(5,3,0.04,fx(RING_FS)), scorch=groundPlane(2.2,3.1,0.015,fx(SOFTBURN_FS));
  L.decal.add(trench,shock,scorch);
  const tc=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, x=cx(te), [b,n]=beat(te), over=ss(0.7,TD,te)*(1-ss(TI+0.3,TE,te));
    const dash=te>=TD&&te<TI, dk=dash?(te-TD)/(TI-TD):0;
    caster.position.x=x;
    caster.scale.set(1+0.05*b,1+0.035*b,1+0.05*b);
    caster.rotation.z=(te<TD?0.1*ss(0,0.7,te)*Math.sin(te*28)*0.3+0.18*ss(0.75,TD,te):0)-(dash?0.45*ss(TD,TD+0.08,te):0)
      +(ia>=0?0.32*Math.exp(-ia*4)*Math.cos(ia*9):0);
    // cuerpo agrietado y cresta: siguen al lanzador
    shellG.position.set(x,0,0); shellG.rotation.z=caster.rotation.z; shellG.scale.copy(caster.scale);
    const heat=Math.min(n/3+0.25*b,1)*(1-ss(TI+0.4,TE,te));
    set(body,heat,0.45+0.55*b+0.4*over); set(head,heat,0.45+0.55*b+0.4*over);
    crackMat.uniforms.uP.value=heat; crackMat.uniforms.uA.value=(0.45+0.55*b+0.4*over)*(n>0?1:0);
    for(const s of spines){const k=s.userData.k,g=ss(TB[0]+k*0.04,TB[0]+0.25+k*0.04,te)*(0.55+0.45*Math.min(n/3,1))*(1+0.35*b)*(1-ss(TI+0.5,TE,te));
      s.visible=g>0.01; s.scale.set(1,Math.max(g,0.001)*(1+(dash?0.3:0)),1);}
    spineMat.uniforms.uA.value=0.55+0.4*b+0.35*over;
    // cometa
    comet.visible=dash||(ia>=0&&ia<0.15); comet.position.set(x+0.55,1.0,0);
    set(mach,0,(dash?ss(0,0.25,dk):1-cl(ia/0.15))*0.8); mach.scale.set(0.6+0.4*dk,1,1);
    t1.scale.set(Math.max(x-X0+0.4,0.001),1,1); t2.scale.set(Math.max(x-X0+0.4,0.001),1,1);
    tailM.uniforms.uA.value=(dash?1:1-cl(ia/0.15))*0.8;
    // suelo
    TB.forEach((t,i)=>{const p=cl((te-t)/0.45);beatRings[i].position.x=X0;set(beatRings[i],p,te>=t?(1-p)*(0.4+0.15*i):0);});
    const run=X0-0.3, len=XH-run+0.4;
    trench.position.x=run+len/2; trench.scale.set(len,1,1);
    set(trench,te<TD?0:cl((x-run)/len+0.02),1-ss(1.7,TE,te)); trench.material.uniforms.uQ.value=Math.max(te-TD,0);
    for(const m of booms){const tb=te-(TD+(TI-TD)*Math.pow(cl((m.userData.x-run)/(XH-run)),1/1.6)),p=cl(tb/0.35);set(m,p,tb>=0?0.7*(1-p):0);}
    let p=cl(ia/0.65); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    scorch.material.uniforms.uA.value=ia>=0?1-cl(ia/1.2):0;
    towardCam(hitRing.position,tc.set(3.0,1.0,0),0.5); billboard(hitRing); p=cl(ia/0.35); hitRing.visible=ia>=0&&p<1; set(hitRing,p,1-p);
    // el lanzador también se lleva el golpe: destello rojo propio
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=0.18*b+0.22*over+(ia>=0?0.8*Math.exp(-ia*6):0);
    const hit=ia>=0?Math.exp(-ia*3.5):0;
    target.position.x=3.4+hit*0.5*(1-Math.exp(-ia*18)); target.rotation.z=-hit*0.3*Math.cos(ia*12);
    // luz y post: cada latido es un mini-pulso de distorsión desde el lanzador; el impacto, uno grande
    let lb=-1; for(const t of TB)if(te>=t)lb=t;
    if(te<TD){o.g.set(x,1.1,0);o.gs=1+0.8*b;o.ga=0.12+0.28*b;o.li=1.5+3*b;o.ia=lb>0?te-lb:-1;o.c.set(x,1.1,0);o.dist=0.35;o.flash=0;}
    else if(te<TI){o.g.set(x+0.6,1.0,0);o.gs=1.7;o.ga=0.55;o.li=5;o.ia=-1;o.c.set(x,1,0);o.dist=0.35;}
    else{o.g.set(3.0,0.9,0);o.gs=1.4+3.5*ia;o.ga=Math.exp(-ia*11)*0.75;o.li=9*Math.exp(-ia*5);o.ia=ia;o.c.set(3.0,1.0,0);o.dist=0.9;o.flash=1;}
    o.shake=0;
  };
}},0.78);

// =====================================================================
// 6 · RONIN — iaido: el lanzador cruza al objetivo en un parpadeo; destello plateado, pantalla partida
//     en blanco y negro y sello rojo de crítico garantizado
// =====================================================================
const ronin=tempo({key:"ronin",name:"Ronin",dur:2.3,ti:0.42,pal:"Plata",
  phases:[["Iai",0],["Parpadeo",0.3],["Tajo",0.42],["Crítico",0.6],["Envainar",1.15],["Regreso",1.6]],
build(a){
  const L=a.L,TB=0.3,TI=0.42,TH=0.6,TS=1.15,TR=1.6,XB=4.75,CA=0.42,CH=V3(3.3,1.2,0),RED="vec3(.9,.08,.1)";
  // katana: hoja de acero con destello que recorre el filo (uP), empuñadura oscura con trenzado rojo
  const kat=new THREE.Mesh(new THREE.BoxGeometry(1.05,0.035,0.012).translate(0.525,0,0),fx(`
  void main(){float u=vP.x/1.05;float hilt=step(u,.21);
   float gl=smoothstep(.07,0.,abs(u-uP))*(1.-hilt);
   vec3 steel=mix(vec3(.5,.53,.62),vec3(.92,.95,1.),smoothstep(-.012,.017,vP.y));
   float lit=.6+.4*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   vec3 c=hilt>.5?vec3(.07,.04,.05)+vec3(.55,.06,.08)*step(.5,fract(u*45.))*.7:steel*lit+uC1*gl*3.+vec3(1.)*uA*(1.-hilt)*.6;
   gl_FragColor=vec4(c,1.);}`,SOLID));
  L.mesh.add(kat);
  // imágenes residuales: silueta del cuerpo con vetas horizontales de velocidad
  const ghosts=[-2.0,-0.4,1.2,2.6].map((x,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,2.1),fx(`
   void main(){vec2 p=(vUv-.5)*vec2(1.2,2.1)+vec2(0.,1.05);
    vec2 b=abs(p-vec2(0.,.62))-vec2(.36,.62);float body=length(max(b,0.))+min(max(b.x,b.y),0.);
    float d=min(body,length(p-vec2(0.,1.6))-.27);
    float st=noise(vec3(p.x*1.5+uT*20.,p.y*28.,${f(i)}));
    float al=(band(d,0.,.03)+smoothstep(.02,-.02,d)*.22)*(.4+.8*st);
    gl_FragColor=vec4(mix(uC2,uC1,st)*1.4,al*uA);}`,{depthTest:false}));m.userData.x=x;L.trail.add(m);return m;});
  // trayectoria del parpadeo: hilo plateado finísimo (dos planos cruzados a lo largo de x)
  const railMat=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float core=exp(-v*22.);float halo=exp(-v*5.)*.25;float fl=.8+.2*noise(vec3(u*40.,uT*30.,0.));
   gl_FragColor=vec4(mix(uC1,vec3(1.),core)*1.8,(core+halo)*fl*step(u,uP)*smoothstep(0.,.03,u)*uA);}`);
  const railG=new THREE.PlaneGeometry(1,0.12).translate(0.5,0,0), rail=new THREE.Group(), r2=new THREE.Mesh(railG,railMat); r2.rotation.x=Math.PI/2;
  rail.add(new THREE.Mesh(railG,railMat),r2); rail.position.set(-3.55,1.05,0); rail.scale.set(XB+3.55,1,1); L.trail.add(rail);
  // tajo sobre el objetivo: línea plateada larga y finísima con destello central
  const cut=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(`void main(){vec2 p=vUv-.5;float x=abs(p.x)*2.;
   float th=(1.-x*x);float core=exp(-abs(p.y)*(60.+uP*120.))*th;float halo=exp(-abs(p.y)*9.)*th*.25;
   float flare=exp(-length(p*vec2(3.,14.))*4.)*.8;
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6+core*.4)*1.9,(core+halo+flare)*uA);}`,{depthTest:false}));
  // destello de crítico: estrella de ocho rayos
  const star=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x)+uP;
   float rays=pow(abs(cos(an*4.)),60.)*smoothstep(1.,.05,r)+pow(abs(cos(an*4.+.785)),90.)*smoothstep(.6,.05,r)*.6;
   float core=smoothstep(.25,0.,r);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.8,(rays+core)*uA);}`,{depthTest:false}));
  // sello hanko (rojo semántico, sin texto): marco cuadrado, relleno con trazos abstractos en reserva y textura de tinta
  const hanko=new THREE.Mesh(new THREE.PlaneGeometry(0.78,0.78),fx(SDF2+`void main(){vec2 p=(vUv-.5)*2.;
   vec2 b=abs(p)-vec2(.74);float box=length(max(b,0.))+min(max(b.x,b.y),0.)-.1;
   float border=smoothstep(.06,.02,abs(box+.04));float inner=smoothstep(.02,-.02,box+.17);
   float st=smoothstep(.09,.05,abs(length(p-vec2(-.18,.12))-.3))*step(-.25,p.x-p.y*.3);
   st=max(st,smoothstep(.07,.035,sdSeg(p,vec2(.2,.48),vec2(.36,-.5))));
   st=max(st,smoothstep(.07,.035,sdSeg(p,vec2(-.5,-.3),vec2(.5,-.34))));
   st=max(st,smoothstep(.06,.03,sdSeg(p,vec2(.42,.3),vec2(.55,.12))));
   float ink=smoothstep(.2,.45,noise(vec3(p*7.,3.))*.7+noise(vec3(p*23.,1.))*.3+.15);
   float m=(border+inner*(1.-st))*ink;
   gl_FragColor=vec4(${RED}*1.5+vec3(1.)*uP*.8,min(m,1.)*uA);}`,{depthTest:false}));
  L.mesh.add(cut,star,hanko);

  const C=`const float TB=${f(TB)};const float TI=${f(TI)};const vec3 CH=${v3(CH)};varying float vR;`;
  // líneas de velocidad a lo largo del parpadeo
  a.count+=points(L.part,120,C+`void main(){float s=TB+aSeed.x*(TI-TB);float life=.16+aSeed.y*.16;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=-3.4+aSeed.x*${f(XB+3.4)};vec3 p=vec3(x+t*6.,.3+aSeed.z*1.7,(aSeed.w-.5)*.9);vR=0.;
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.02+.025*aSeed.w);}`);
  // chispas plateadas del corte, en su dirección
  a.count+=sparks(L.part,150,TI,`${f(CH.x)},${f(CH.y)},.2`,`${f(Math.cos(CA)*1.2)},${f(Math.sin(CA)*1.2)},0.`,3,9,2.5);
  // pétalos cortados que vuelan con el tajo y caen revoloteando (mezcla normal: rosa pálido)
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.12;float life=1.1+aSeed.y*.5;float t=uT-s;float age=t/life;float c=max(t,0.);
   vec3 dl=vec3(cos(${f(CA)}),sin(${f(CA)}),0.);vec3 r=rnd();
   vec3 p=CH+vec3(0.,0.,.25)+dl*(aSeed.x-.5)*2.5+vec3((1.2+.8*r.x)*(1.-exp(-c*3.))+sin(c*4.+aSeed.z*9.)*.18,.6*(1.-exp(-c*3.))*r.y-.5*c,r.z*.8*(1.-exp(-c*2.)));
   p.y=max(p.y,.03);vR=aSeed.z*6.2832+c*(3.+4.*aSeed.w);
   vA=(age>0.&&age<1.)?smoothstep(0.,.05,age)*(1.-age*age):0.;put(p,.11+.05*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;varying float vR;
  void main(){vec2 q=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
   float d=length(q*vec2(1.9,1.1));float notch=smoothstep(.09,0.,length(vec2(q.x*1.6,q.y-.44)));
   float a=smoothstep(.46,.38,d)*(1.-notch)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(vec3(1.,.74,.83),vec3(1.,.95,.97),vMix*.6+smoothstep(.3,0.,d)*.3),a);}`,NB);
  // polvo al aparecer detrás del rival
  a.count+=points(L.part,35,C+`void main(){float s=TI+aSeed.x*.05;float life=.7+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(XB)},.05,0.)+vec3(cos(an)+.8,0.,sin(an))*(.3+.7*aSeed.w)*(1.-exp(-t*4.))+vec3(0.,.3*t,0.);vR=0.;
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.24+.2*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,25,TS,`${f(XB+0.05)},.8,.42`,"0.,.6,0.",1.5,4,1.5);
  // suelo: solo la onda bajo el rival (nivel 2: sin corte en el suelo)
  const shock=groundPlane(3.2,3.4,0.03,fx(RING_FS));
  L.decal.add(shock);

  a.pose=function(te,o){
    const ia=te-TI, blink=te>=TB&&te<TI, back=te>=TR&&te<TR+0.08;
    // posición: en guardia, invisible durante el cruce, detrás del rival, y vuelta en otro parpadeo
    const away=te>=TI&&te<TR;
    caster.visible=!blink&&!back;
    caster.position.x=away?XB:-3.7-0.1*ss(0,TB,te);
    caster.rotation.z=away?-0.35*Math.exp(-ia*3)+0.06*ss(TS-0.1,TS,te)*(1-ss(TS,TS+0.3,te)):0.18*ss(0,TB,te)*(te<TB?1:0);
    caster.scale.set(1,te<TB?1-0.1*ss(0,TB,te):1,1);
    // katana: envainada en guardia con destello que corre, desenvainada tras el corte, se envaina con un chasquido
    const sheathe=ss(TS-0.15,TS,te);
    kat.visible=(te<TB||(away&&te<TS+0.02))&&caster.visible;
    if(te<TB){kat.position.set(-3.65,0.72,0.42);kat.rotation.set(0,0,Math.PI+0.25);}
    else{kat.position.set(XB+0.12,0.78+0.1*(1-sheathe),0.42);kat.rotation.set(0,0,-0.55+(Math.PI+0.25+0.55)*sheathe);}
    set(kat,te<TB?ss(0.05,TB,te)*1.3-0.1:1.3,away?Math.exp(-ia*5):0);
    ghosts.forEach((m,i)=>{const tg=TB+(TI-TB)*(m.userData.x+3.7)/(XB+3.7);m.visible=te>=tg&&te<tg+0.5;
      towardCam(m.position,tmp.set(m.userData.x,1.05,0),0.1);billboard(m);m.material.uniforms.uA.value=te>=tg?0.8*(1-cl((te-tg)/0.5)):0;});
    railMat.uniforms.uP.value=cl((te-TB)/(TI-TB)); rail.visible=te>=TB&&ia<0.4; railMat.uniforms.uA.value=ia>0?1-cl(ia/0.4):1;
    // tajo y destello sobre el rival
    towardCam(cut.position,CH,0.6); billboard(cut,CA); cut.visible=ia>=0&&ia<0.5;
    cut.scale.set(Math.max(5*ss(0,0.05,ia),0.001),0.4,1); set(cut,cl(ia/0.4),ia>=0?0.85*(1-ss(0.12,0.4,ia)):0);
    let p=cl(ia/0.35); towardCam(star.position,CH,0.65); billboard(star); star.visible=ia>=0&&p<1;
    star.scale.setScalar(0.6+0.6*p); set(star,ia*2,0.8*Math.pow(1-p,1.5));
    // sello de crítico: cae grande, se estampa y late
    const th=te-TH, hon=th>=0?ss(0,0.05,th)*(1-ss(1.0,1.2,th)):0, slam=th>=0?1+1.0*Math.pow(1-cl(th/0.09),2):1;
    towardCam(hanko.position,tmp.set(target.position.x,2.55,0),0.3); billboard(hanko,0.08);
    hanko.visible=hon>0.001; hanko.scale.setScalar(Math.max(slam*(1+0.04*Math.sin(th*14)),0.001)); set(hanko,th>=0?Math.exp(-th*9):0,hon);
    p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    // reacción con una segunda sacudida cuando "se abre" el corte
    const h1=hitK(ia,8), h2=hitK(te-TH,6);
    target.position.x=3.4+h1*0.06+h2*0.14; target.rotation.z=-h1*0.09*Math.cos(ia*30)+h2*0.16*Math.cos((te-TH)*14);
    // pantalla partida en blanco y negro a lo largo del corte (firma): ≈0,1 s reales a 0,7
    o.bw=ia>=0?0.7*(ia<0.07?1:Math.exp(-(ia-0.07)*40)):0; o.bwAng=CA;
    o.em=hon*0.2+(th>=0?0.5*Math.exp(-th*6):0); o.emc.setRGB(1,0.25,0.25);
    if(te<TB){o.g.set(-3.3,0.75,0.42);o.gs=0.5;o.ga=0.2*ss(0.05,TB,te);o.li=1.2;}
    else if(te<TI){o.g.set(-3.6+(XB+3.6)*cl((te-TB)/(TI-TB)),1.05,0);o.gs=1.3;o.ga=0.45;o.li=3.5;}
    else{o.g.copy(CH);o.gs=1.1+2.8*ia;o.ga=Math.exp(-ia*12)*0.72+0.08*hon;o.li=8*Math.exp(-ia*6)+(th>=0?2.8*Math.exp(-th*5):0);}
    o.ia=ia;o.c.copy(CH);o.shake=0;o.dist=0.6;
  };
}},0.9);

// =====================================================================
// 7 · TIMBER — placas de corteza ardiente emergen del suelo y se ensamblan en armadura con runas de fuego
// =====================================================================
const timber=tempo({key:"timber",name:"Timber",dur:3.6,ti:1.3,pal:"Fuego",
  phases:[["Raíces",0],["Ensamblaje",0.35],["Sellado",1.3],["Armadura",1.6],["Ceniza",2.9]],
build(a){
  const L=a.L,TA=0.35,FL=0.4,TI=1.3,TD=2.9,TE=3.45,CX=-3.7,CP=V3(-3.7,1.0,0);
  // corteza: fibras verticales, grietas con brasa, runa procedural centrada (uQ la enciende), borde incandescente
  // en vuelo (uA) y combustión final que la deshace (uB)
  const BARK_FS=SDF2+`uniform float uQ;uniform float uB;uniform float uS;
  void main(){vec2 uv=vUv;float an=atan(vP.x,vP.z);
   float fib=noise(vec3(an*14.+uS*9.,vP.y*2.2,uS))*.6+noise(vec3(an*38.,vP.y*6.,uS+3.))*.4;
   float ridge=pow(abs(sin(an*26.+fib*4.)),.5);
   vec3 bark=mix(vec3(.09,.045,.025),vec3(.38,.22,.11),fib*.65+ridge*.35);
   float lit=.35+.65*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5))));
   float crack=pow(1.-abs(noise(vec3(an*7.,vP.y*4.,uS*3.+7.))*2.-1.),16.);
   float bd=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float edge=smoothstep(.07,0.,bd);
   vec2 p=(uv-.5)*vec2(2.8,2.);float rune=0.;
   for(int i=0;i<4;i++){float fi=float(i);
    vec2 ra=vec2(hash(vec3(uS,fi,1.)),hash(vec3(fi,uS,2.)))*1.1-.55;vec2 rb=vec2(hash(vec3(uS,fi,3.)),hash(vec3(fi,uS,4.)))*1.1-.55;
    rune=max(rune,smoothstep(.09,.03,sdSeg(p,ra,rb)));}
   rune=max(rune,smoothstep(.07,.02,abs(length(p)-.66))*step(.4,fract(atan(p.y,p.x)/6.2832*3.+uS)));
   float bn=noise(vec3(uv*vec2(7.,5.),uS*5.))*.75+noise(vec3(uv*19.,uS))*.25;float th=uB*1.15-.08;
   if(bn<th)discard;
   float ember=smoothstep(.12,0.,bn-th)*step(.001,uB);
   float fl=.75+.25*sin(uT*7.+uS*11.);
   vec3 c=bark*lit*(1.-crack*.6)+uC2*crack*(.4+1.3*uQ)*fl+uC1*rune*uQ*2.4*fl+mix(uC2,uC1,.5)*edge*uA*1.6+uC1*ember*3.;
   gl_FragColor=vec4(c,1.);}`;
  const PL=[];
  const ring=(n,y,r,h,lw,off)=>{for(let i=0;i<n;i++){const k=PL.length,phi=off+i*Math.PI*2/n;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.05,h,10,3,true,-lw/2,lw),
      fxU(BARK_FS,{uQ:{value:0},uB:{value:0},uS:{value:k*1.731+0.37}},Object.assign({},SOLID,{side:THREE.DoubleSide})));
    const da=phi+(Math.random()-0.5)*0.8, dist=1.5+Math.random()*0.8;
    m.userData={phi,y,k,dx:Math.sin(da)*dist,dz:Math.cos(da)*dist,arc:0.6+Math.random()*0.6,
      spin:(Math.random()<0.5?-1:1)*(3+Math.random()*4),tx:(Math.random()-0.5)*5,tz:(Math.random()-0.5)*5,t0:TA+k*0.055};
    L.mesh.add(m); PL.push(m);}};
  ring(4,0.42,0.5,0.52,1.36,Math.PI/4); ring(4,0.98,0.47,0.5,1.36,0); ring(3,1.66,0.34,0.27,1.8,Math.PI/2);
  // calor: fuego bajo que lame la armadura y late
  const heat=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.66,2.2,36,10,true),fx(fireFS(2.2,2.4))); heat.position.set(CX,1.05,0);
  L.mesh.add(heat);

  const C=`const float TA=${f(TA)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 CP=${v3(CP)};`;
  // polvo y astillas finas que saltan cuando emergen las placas
  a.count+=points(L.part,40,C+`void main(){float s=TA+aSeed.x*.6;float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=1.4+aSeed.w*.9;vec3 p=vec3(${f(CX)}+cos(an)*rd,.05,sin(an)*rd)+vec3(0.,.3*(1.-exp(-t*4.)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.24+.18*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(L.part,60,C+`void main(){float s=TA+aSeed.x*.65;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rd=1.3+aSeed.w*1.;vec3 v=vec3(cos(an)*(-1.+aSeed.y),2.2+2.*aSeed.y,sin(an)*(-1.+aSeed.y));
   vec3 p=vec3(${f(CX)}+cos(an)*rd,.05,sin(an)*rd)+v*t+vec3(0.,-8.*t*t,0.);p.y=max(p.y,.03);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.035+.035*aSeed.w);}`,CHIP_FS);
  // sellado: chispas desde el pecho; armadura puesta: brasas que suben y llamitas en las grietas
  a.count+=sparks(L.part,110,TI,`${f(CX)},1.,0.`,"0.,.5,0.",2.5,6.5,2.5);
  a.count+=points(L.part,110,C+`void main(){float life=.8+aSeed.y*.7;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float t=age*life;vec3 p=vec3(${f(CX)}+cos(an)*.5,.2+r.y*1.6,sin(an)*.5)+vec3(sin(t*5.+r.z*9.)*.15*t,t*(1.2+r.z),cos(t*4.+r.x*9.)*.15*t);
   vA=(k>=1.)?(1.-age)*(.55+.45*sin(t*30.+r.z*40.))*uE:0.;put(p,(.03+.04*r.z)*(1.-age*.5));}`);
  a.count+=points(L.part,40,C+`void main(){float life=.4+aSeed.y*.3;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float y=.2+r.y*1.55;float rad=y>1.45?.36:.52;vec3 p=vec3(${f(CX)}+cos(an)*rad,y+age*.25,sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.1+.08*r.z));}`,FLAME_FS);
  // ceniza: la armadura arde y se deshace
  a.count+=points(L.part,90,C+`void main(){float s=TD+aSeed.x*.45;float life=.8+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();float an=aSeed.z*6.2832;vec3 p=vec3(${f(CX)}+cos(an)*.48,.25+aSeed.w*1.5,sin(an)*.48)+vec3(r.x*.4*t,t*(.9+aSeed.y),r.z*.4*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.55+.45*sin(t*30.+aSeed.x*40.)):0.;put(p,.035+.05*aSeed.w);}`);
  a.count+=points(L.part,40,C+`void main(){float s=TD+.1+aSeed.x*.4;float life=1.1+aSeed.y*.6;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(CX)}+cos(an)*.5,.4+aSeed.w*1.3,sin(an)*.5)+vec3(sin(t*3.+aSeed.x*9.)*.2,t*.8,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.12+.1*aSeed.y)*(1.+age));}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.2,d)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.07,.05,.04),a);}`,NB);
  // suelo: anillos de crecimiento del árbol que se iluminan con grietas de brasa; onda al sellar
  const rings=groundPlane(2.6,CX,0.02,fxU(`uniform float uQ;
  void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float w=r+(noise(vec3(p*4.,1.))-.5)*.12;
   float ann=pow(.5+.5*cos(w*48.),6.)*smoothstep(1.,.85,r);
   float crack=pow(1.-abs(fract(an*1.3+noise(vec3(r*5.,an,2.))*.4)*2.-1.),18.)*smoothstep(.1,.3,r);
   float fl=.7+.3*sin(uT*5.+r*9.);
   float m=(ann*.35+crack*(.6+uQ))*step(r,uP*1.05)*smoothstep(1.,.92,r)+band(r,.97,.015);
   gl_FragColor=vec4(mix(uC2,uC1,crack*fl)*1.4,m*uA);}`,{uQ:{value:0}}));
  const shock=groundPlane(4,CX,0.03,fx(RING_FS));
  L.decal.add(rings,shock);

  a.pose=function(te,o){
    const ia=te-TI, env=ss(TI,TI+0.2,te)*(1-ss(TD,TE,te)), beat=ia>=0?Math.pow(0.5+0.5*Math.sin(ia*7),6):0, burn=cl((te-TD)/(TE-TD));
    caster.rotation.z=-0.06*ss(0,TA,te)+0.06*ss(TI,TI+0.2,te);
    caster.scale.set(1,1-0.04*ss(0,TA,te)*(1-ss(TI-0.1,TI,te))+(ia>=0?0.04*Math.exp(-ia*8):0),1);
    const cm=caster.userData.m; cm.emissive.copy(U.uC2.value); cm.emissiveIntensity=env*(0.12+0.25*beat)+(ia>=0?0.5*Math.exp(-ia*5):0);
    for(const m of PL){const u=m.userData,k=cl((te-u.t0)/FL),e=1-Math.pow(1-k,3),q=1-e,lk=te-u.t0-FL;
      m.visible=te>=u.t0&&te<TE;
      const clack=lk>=0?0.07*Math.exp(-lk*18):0, drop=0.3*burn*burn;
      m.position.set(CX+u.dx*q,u.y*e-0.3*q+u.arc*Math.sin(Math.PI*k)*q-drop,u.dz*q);
      m.rotation.set(u.tx*q,u.phi+u.spin*q,u.tz*q);
      m.scale.setScalar(Math.max(ss(0,0.2,k)*(1+clack),0.001));
      const qi=ss(TI+u.k*0.04,TI+u.k*0.04+0.15,te);
      m.material.uniforms.uQ.value=(0.12+0.88*qi)*(1-burn*0.5)*(0.75+0.5*beat);
      m.material.uniforms.uA.value=te<u.t0+FL?0.4+0.6*q:Math.exp(-lk*4)+(ia>=0?0.5*Math.exp(-ia*6):0);
      m.material.uniforms.uB.value=burn;}
    set(heat,0.2+0.4*beat,env*(0.28+0.3*beat));
    U.uE.value=env;
    set(rings,ss(0,TI,te),ss(0,0.25,te)*(1-ss(TD,TE,te))); rings.material.uniforms.uQ.value=env*(0.4+0.6*beat);
    const p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    if(te<TI){o.g.set(CX,0.7,0);o.gs=1.3*ss(TA,TI,te);o.ga=0.2*ss(TA,TI,te);o.li=2*ss(0,TI,te);}
    else{o.g.copy(CP);o.gs=1.6+1.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*8)*0.6+0.12*env*(0.5+beat);o.li=6.5*Math.exp(-ia*5)+env*(1.5+2*beat)+(burn>0&&burn<1?2:0);}
    o.ia=ia;o.c.copy(CP);o.shake=0;o.dist=0.45;o.flash=0;
  };
}},0.65);

VFX.module("Bestia · Espalda",[furball,hero,jaguar,risky,ronin,timber]);
// Rice es una carta de cola (confirmado): su efecto se registra en «Bestia · Cola».
VFX.module("Bestia · Cola",[rice]);
})();

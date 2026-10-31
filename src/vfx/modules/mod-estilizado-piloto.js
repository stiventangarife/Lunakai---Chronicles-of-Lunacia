// =====================================================================
// PILOTO ESTILIZADO (29-oct) — tres efectos rehechos con el kit vfx-stylized.js para compararlos con los actuales:
//   · el mordisco del piloto pasó a mod-estilizado-cuerpo.js (VFX.sty.basic.MORDISCO)
//   · sty_sandia    — proyectil que rueda (Watermelon, carta de Planta · Cuerno)
//   · sty_esporas   — área en cruz (Esporas; hoy también la usa la Espiral del Alba del Rastreador)
// Mismo contrato que el resto: {key,name,dur,ti,phases,pal,tier} + build(a) + pose(te,o) sin estado.
// Extras que lee el puente: stylized:true (sin velo oscuro ni subida de bloom) y anchors {caster,target}
// (dónde están los muñecos en reposo; el mordisco se diseña con los dos muñecos juntos).
// Los tiempos de impacto (ti) son los mismos que los de los efectos originales: el daño llega igual.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam,variantGroups}=VFX.lib;
const S=VFX.sty, C=S.CELL;
// paletas que usan estos efectos (algunas viven en otros módulos que aquí no se cargan)
if(!VFX.PALETTES?.["Sandía"])VFX.palette("Sandía",["#ff5470","#2e9e46"]);
const EARTH="vec3(.6,.48,.34)";         // polvo de tierra (color del camino del tablero)
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const TILE=1.93;                        // una casilla del tablero en unidades del laboratorio (1,6 m / escala del puente)
// varyings que escriben los vertex shaders de partículas para los fragmentos del kit (giro y edad)
const VV=`varying float vR;varying float vK;`;

const HITSPARK_FS=S.FS.HITSPARK, RING_STY=S.FS.RING, CONTACT_FS=S.FS.CONTACT;

// =====================================================================
// 2 · SANDÍA ESTILIZADA (Watermelon) — la sandía brota con una nube de tierra, rueda dando botes con su sombra
//     de contacto y revienta: trozos de pulpa iluminados, pepitas, cáscara y una mancha de jugo que se seca
//     por erosión. Mismos tiempos que pcWatermelon (ti 1,0 s).
// =====================================================================
const MELON_FS=`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
 float w=styNoise(vec2(an*.32,q.y*.6+.5)).b;
 float stripe=smoothstep(.42,.58,fract(an/6.2832*9.+(w-.5)*.45+q.y*.08));
 vec3 rind=mix(uC2*.5,mix(uC2,vec3(.78,.95,.5),.42),stripe);
 vec3 n=normalize(vN);vec3 L=stySunV();float l=styLight(n,L);
 vec3 c=mix(rind*.5,rind*1.08,l)*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.28*smoothstep(.6,.68,fr)*step(.5,l);
 float sp=smoothstep(.955,.97,dot(reflect(-L,n),normalize(vV)));c+=vec3(1.)*sp*.55;
 gl_FragColor=vec4(c,1.);}`;
const SPLAT_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.7).g*.5+styNoise(vUv*.45+.31).r*.5;
 float m=smoothstep(.72,.64,r+(n-.5)*.6);
 float drops=smoothstep(.74,.8,styNoise(vUv*1.1+.17).g)*smoothstep(1.,.65,r);
 float mm=max(m,drops);if(mm<.01)discard;
 float er=styErode(n*.7+mm*.3,uP,.12);
 vec3 c=styRamp(.32+.42*n)*mix(vec3(1.),uShadeCol,.12);
 gl_FragColor=vec4(c,mm*er*uA*.9);}`;
// reventón de pulpa: esfera que se expande y se consume desde el borde (materia roja con luz en bandas)
const PULP_FS=`uniform float uEr;void main(){vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec3 q=normalize(vP);float nz=styNoise(vec2(atan(q.z,q.x)*.32,q.y*.5+.5)).r*.6+styNoise(vec2(atan(q.z,q.x)*.8,q.y*1.3)).g*.4;
 float fr=abs(dot(n,normalize(vV)));float er=styErode(nz*.75+fr*.25,uEr,.08);if(er<.01)discard;
 vec3 c=styRampOf(uC1,.3+.55*l)*styTint(l);c=mix(c,vec3(1.,.9,.85),smoothstep(.85,1.,nz)*.25);
 gl_FragColor=vec4(c,er*uA);}`;
const SEED_FS=S.PV+`void main(){vec2 uv=styPC();vec4 sh=styShape(4.,uv);float m=sh.r;if(m<.05)discard;
 float er=styErode(m*.5+sh.b*.5,vK-.05,.1);if(er*vA<.01)discard;
 float l=styLight(styShapeN(4.,uv,5.),stySunV());
 gl_FragColor=vec4(mix(vec3(.04,.025,.02),vec3(.32,.24,.18),l)+vec3(1.)*sh.g*.25,er*vA);}`;

const melon={key:"sty_sandia",name:"Watermelon (estilizado)",dur:2.3,ti:1.0,pal:"Sandía",tier:2,stylized:true,
  phases:[["Brote",0],["Rodada",0.32],["Impacto",1.0],["Jugo",1.25]],
build(a){
  const L=a.L,TG=0.3,TR=0.32,TI=1.0,X0=-2.55,X1=2.85,R=0.5,BP=V3(3.0,0.55,0);
  const ball=new THREE.Group(); L.mesh.add(ball);
  const body=new THREE.Mesh(new THREE.SphereGeometry(R,40,28),S.mat(MELON_FS,{},{mode:'solid'})); body.scale.set(1.08,0.94,1);
  ball.add(body);
  const shadow=groundPlane(1.4,X0,0.02,S.mat(CONTACT_FS,{},{mode:'matter'})); L.decal.add(shadow);
  const splat=groundPlane(3.4,3.2,0.025,S.mat(SPLAT_FS,{},{mode:'matter'})); L.decal.add(splat);
  const spark=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),S.mat(HITSPARK_FS,{uEr:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(spark);
  const pulp=new THREE.Mesh(new THREE.SphereGeometry(0.55,32,20),S.mat(PULP_FS,{uEr:{value:0}},{mode:'matter',side:THREE.FrontSide})); pulp.position.copy(BP); L.mesh.add(pulp);
  // la ruta de la rodada, igual en JS y en GLSL (acelera: k^1,6)
  const px=t=>{const k=cl((t-TR)/(TI-TR));return X0+(X1-X0)*Math.pow(k,1.6);};
  const K=`const float TG=${f(TG)};const float TR=${f(TR)};const float TI=${f(TI)};const vec3 BP=${v3(BP)};
  float px(float t){float k=clamp((t-TR)/(TI-TR),0.,1.);return ${f(X0)}+${f(X1-X0)}*pow(k,1.6);}`;
  // tierra al brotar
  S.pts(L.part,8,VV+K+`void main(){float s=.05+aSeed.x*.12;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(${f(X0)},.12,0.)+vec3(cos(an),0.,sin(an)*.7)*(.3+.5*(1.-exp(-t*5.)))+vec3(0.,t*.5,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.2,1.,age);vR=aSeed.w*6.28;
   put(p,(.32+.16*aSeed.y)*(.7+.5*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH}));
  // polvo de la rodada, detrás de la sandía
  S.pts(L.part,22,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(px(s)-.35,.1,(aSeed.z-.5)*.6)+vec3(-.25*t,t*(.35+.3*aSeed.w),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.1,1.,age);vR=aSeed.w*6.28+t;
   put(p,(.22+.14*aSeed.y)*(.6+.8*age));}`,S.MATTER_FS(C.puff,{relief:4,bias:.05,col:EARTH}));
  // pulpa: gotas grandes con luz en bandas (color claro de la paleta = rojo sandía)
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.55+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.25,.85,0.))*(2.+2.2*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.55,1.,age);vec2 vel=vec2(v.x,v.y-14.*t);vR=atan(vel.x,vel.y);
   put(p,.42+.2*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,bias:.05,col:'uC1'}));
  // pepitas
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.7,0.))*(1.6+2.*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.6,1.,age);vR=aSeed.y*6.28+t*9.;
   put(p,.1+.04*aSeed.w);}`,SEED_FS);
  // cáscara: esquirlas verdes (rampa baja = color oscuro de la paleta)
  S.pts(L.part,9,VV+K+`void main(){float s=TI+aSeed.x*.03;float life=.6+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.6,0.))*(1.8+1.6*aSeed.z);vec3 p=BP+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*(7.+5.*aSeed.w);
   put(p,.24+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:3,bias:0.,col:'uC2'}));
  a.pose=function(te,o){
    const ia=te-TI, grow=ss(0.02,TG,te), x=te<TR?X0:px(te), k=cl((te-TR)/(TI-TR));
    caster.rotation.z=0.12*ss(0,TG,te)-0.18*ss(TG,TG+0.1,te)+0.06*ss(TG+0.2,TI,te);
    const bounce=te<TR?0:Math.abs(Math.sin(k*Math.PI*2.2))*0.32*(1-k*0.6);
    const pop=1+0.18*Math.sin(Math.PI*cl(te/TG))*(1-cl(te/TG));
    ball.visible=ia<0&&grow>0.001;
    ball.position.set(x,R*0.94*grow+bounce,0); ball.scale.setScalar(Math.max(grow*pop,0.001));
    body.rotation.z=-(x-X0)/R;
    shadow.position.x=x; shadow.scale.setScalar(Math.max(grow*(1-0.35*bounce),0.001)); shadow.material.uniforms.uA.value=ia<0?grow:0;
    const sp=cl(ia/0.06), se=ss(0.03,0.17,ia);
    towardCam(spark.position,BP,0.6); billboard(spark,0.2); spark.visible=ia>=0&&se<1;
    spark.scale.setScalar(0.5+0.6*(1-Math.pow(1-sp,3))); spark.material.uniforms.uA.value=1; spark.material.uniforms.uP.value=0.9; spark.material.uniforms.uEr.value=-0.1+1.1*se;
    const pk=cl(ia/0.16); pulp.visible=ia>=0&&ia<0.32; pulp.scale.set(0.55+0.9*(1-Math.pow(1-pk,3)),0.45+0.6*(1-Math.pow(1-pk,3)),0.55+0.9*(1-Math.pow(1-pk,3)));
    pulp.material.uniforms.uA.value=1; pulp.material.uniforms.uEr.value=-0.1+1.15*ss(0.04,0.3,ia);
    splat.visible=ia>=0; splat.scale.setScalar(0.5+0.5*(1-Math.pow(1-cl(ia/0.18),3)));
    set(splat,ia>=0?-0.1+1.15*ss(0.45,1.3,ia):0,ia>=0?1:0);
    const hit=hitE(ia,6);
    target.position.x=3.4+0.22*hit*(1-Math.exp(-Math.max(ia,0)*30)); target.rotation.z=-hit*0.25*Math.cos(ia*15);
    if(ia<0){o.g.set(x,R,0);o.gs=0.001;o.ga=0;o.li=0.6*grow;}
    else{o.g.copy(BP);o.gs=1+1.5*ia;o.ga=Math.exp(-ia*14)*0.3;o.li=4*Math.exp(-ia*7);}
    o.ia=ia;o.c.copy(BP);o.shake=1;o.dist=1;
  };
}};

// =====================================================================
// 3 · ESPORAS ESTILIZADAS — una vaina cae en la casilla central y revienta en cinco nubes con volumen (luz del
//     sol en 3 tonos) que llenan la cruz. Daño: violeta, gotas que caen. Cura: verde, hojas que suben.
//     Mismos tiempos que lunalogist_spores (ti 0,62 s). Siempre centrada en la casilla objetivo.
// =====================================================================
const POD_FS=`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
 float rib=smoothstep(.75,.95,abs(sin(an*3.+q.y*.8)));
 vec3 n=normalize(vN);float l=styLight(n,stySunV());
 vec3 c=styMatter(l,-.18);c=mix(c,styRamp(.9)*1.25,rib*(.35+.65*uP));
 gl_FragColor=vec4(c,1.);}`;
const STAIN_FS=`uniform float uT1;void main(){vec2 p=(vUv-.5)*${f(TILE*3.4)};
 float a=max(abs(p.x)-${f(TILE*1.5)},abs(p.y)-${f(TILE*.5)});float b=max(abs(p.x)-${f(TILE*.5)},abs(p.y)-${f(TILE*1.5)});
 float sd=min(a,b);float n=styNoise(vUv*.9).r;float m=smoothstep(.15,-.25,sd+(n-.5)*.7);
 if(m<.01)discard;float er=styErode(n*.6+m*.4,uP,.15);
 gl_FragColor=vec4(styRamp(.2+.25*n),m*er*uA*.42);}`;

const spores={key:"sty_esporas",name:"Esporas (estilizado)",dur:2.3,ti:0.62,tier:2,stylized:true,areaCells:1,zoneTarget:TILE*1.6,vlabel:"Efecto",
  variants:[["dano","Daño"],["cura","Curación"]],v:"dano",
  pal:()=>spores.v==="cura"?"Esmeralda":"Esporas",
  phases:[["Lanzamiento",0],["Vuelo",0.1],["Estallido",0.62],["Nube",0.8],["Disipación",1.7]],
build(a){
  const L=a.L,TL=0.1,TI=0.62,CEN=V3(3.4,0,0),HAND=V3(-3.35,1.15,0.25),VG=variantGroups(a,["dano","cura"]);
  const pod=new THREE.Mesh(new THREE.SphereGeometry(0.24,24,16),S.mat(POD_FS,{},{mode:'solid'})); pod.scale.set(1,1.25,1); L.mesh.add(pod);
  const spark=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),S.mat(HITSPARK_FS,{uEr:{value:0}},{mode:'energy',depthTest:false})); L.mesh.add(spark);
  const stain=groundPlane(TILE*3.4,CEN.x,0.025,S.mat(STAIN_FS,{uT1:{value:0}},{mode:'matter'})); L.decal.add(stain);
  const K=`const float TI=${f(TI)};const vec3 CEN=${v3(CEN)};const float T=${f(TILE)};
  vec3 cl5(float i){return i<.5?vec3(0.):(i<1.5?vec3(T,0.,0.):(i<2.5?vec3(-T,0.,0.):(i<3.5?vec3(0.,0.,T):vec3(0.,0.,-T))));}`;
  // nubes: 5 grupos (centro y 4 brazos); los brazos salen un poco después, la nube se propaga desde el centro
  S.pts(L.part,55,VV+K+`void main(){float ci=floor(aSeed.x*5.);float dl=ci<.5?0.:.07;
   float s=TI+dl+aSeed.y*.06;float t=max(uT-s,0.);float life=1.15+aSeed.z*.35;float age=t/life;
   float an=aSeed.w*6.2832;float rr=fract(aSeed.y*7.3)*.48;
   vec3 p=CEN+cl5(ci)+vec3(cos(an)*rr,.28+fract(aSeed.z*5.1)*.55+t*.22,sin(an)*rr);
   float gr=1.-pow(1.-clamp(t/.2,0.,1.),3.);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28+t*(.4+.3*aSeed.y);
   put(p,(.6+.35*fract(aSeed.w*3.7))*(.35+.75*gr));}`,S.MATTER_FS(C.puff,{relief:4.5,bias:-.1,erodeSoft:.12}));
  // Hito 104: piezas de la cruz que giran con la cuadrícula en diagonal (S.pts devuelve el número, no el objeto)
  const AREA=[stain,L.part.children[L.part.children.length-1]];
  // motas: las esporas que brillan dentro de la nube
  S.pts(L.part,24,VV+K+`void main(){float ci=floor(aSeed.x*5.);float s=TI+.05+aSeed.y*.3;float t=max(uT-s,0.);float life=.9+aSeed.z*.5;float age=t/life;
   vec3 p=CEN+cl5(ci)+vec3((aSeed.w-.5)*1.1,.3+t*.6+aSeed.z*.5,(fract(aSeed.w*9.1)-.5)*1.1);
   float tw=.5+.5*sin(uT*14.+aSeed.x*40.);
   vA=(uT>s&&age<1.)?tw*(1.-age):0.;vK=0.;vR=aSeed.y*6.28;put(p,.07+.05*aSeed.w);}`,S.ENERGY_FS(C.spark,{gain:1.5}),{mode:'energy'});
  AREA.push(L.part.children[L.part.children.length-1]);
  // daño: gotas que caen de la nube
  S.pts(VG.dano.part,16,VV+K+`void main(){float ci=floor(aSeed.x*5.);float per=.55;float k=(uT-TI-.15)/per+aSeed.y;float c=floor(k);float tt=fract(k)*per;
   vec3 r=rr(c);vec3 p=CEN+cl5(ci)+vec3((r.x-.5)*.9,.85-4.2*tt*tt,(r.z-.5)*.9);
   vA=(k>=0.&&uT<TI+1.4&&p.y>.03)?1.:0.;vK=0.;vR=3.14159;put(p,.12+.05*r.y);}`,S.MATTER_FS(C.drop,{relief:4,bias:-.15}));
  AREA.push(VG.dano.part.children[VG.dano.part.children.length-1]);
  // cura: hojas que suben en espiral desde el centro
  S.pts(VG.cura.part,14,VV+K+`void main(){float s=TI+.1+aSeed.x*.35;float t=max(uT-s,0.);float life=.9+aSeed.y*.3;float age=t/life;
   float an=aSeed.z*6.2832+t*3.;float rad=.35+.5*aSeed.w;
   vec3 p=CEN+cl5(floor(aSeed.y*5.))+vec3(cos(an)*rad,.2+t*1.2,sin(an)*rad);
   vA=(uT>s&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=an+1.57;put(p,.22+.08*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:3,bias:.12}));
  AREA.push(VG.cura.part.children[VG.cura.part.children.length-1]);
  a.setVariant=v=>{if(v!=="cura")v="dano";a.v=v;for(const k of VFX.LK){VG.dano[k].visible=v==="dano";VG.cura[k].visible=v==="cura";}};
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TL)/(TI-TL));
    for(const ob of AREA)S.gridAlign(ob,CEN.x,0);
    caster.rotation.z=0.12*ss(0,TL,te)-0.25*ss(TL,TL+0.08,te)+0.13*ss(TL+0.15,TI,te);
    pod.visible=te>=TL&&ia<0;
    pod.position.set(HAND.x+(CEN.x-HAND.x)*k,HAND.y+(0.3-HAND.y)*k+3.2*k*(1-k),HAND.z*(1-k));
    pod.rotation.z=-k*6; pod.material.uniforms.uP.value=ss(0.6,1,k);
    const sp=cl(ia/0.06), se=ss(0.03,0.17,ia);
    towardCam(spark.position,tmp.set(CEN.x,0.45,0),0.4); billboard(spark,0.6); spark.visible=ia>=0&&se<1;
    spark.scale.setScalar(0.45+0.5*(1-Math.pow(1-sp,3))); spark.material.uniforms.uA.value=1; spark.material.uniforms.uP.value=0.2; spark.material.uniforms.uEr.value=-0.1+1.1*se;
    stain.visible=ia>=0; set(stain,ia>=0?-0.15+1.2*ss(0.6,1.6,ia):0,ss(0,0.25,ia));
    const hit=hitE(ia,6); target.position.x=3.4+0.12*hit; target.rotation.z=-hit*0.16*Math.cos(ia*13);
    if(ia<0){o.g.copy(pod.position);o.gs=0.001;o.ga=0;o.li=0.5;}
    else{o.g.set(CEN.x,0.7,0);o.gs=1.2+1.5*ia;o.ga=Math.exp(-ia*12)*0.25;o.li=3.5*Math.exp(-ia*5);}
    o.ia=ia;o.c.set(CEN.x,0.6,0);o.shake=0;o.dist=1;
  };
}};

VFX.module("Piloto · Estilizado",[melon,spores]);
})();

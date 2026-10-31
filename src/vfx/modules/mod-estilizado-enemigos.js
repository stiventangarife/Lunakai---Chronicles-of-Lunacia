// =====================================================================
// ESTILIZADO · ENEMIGOS — las 61 habilidades de enemigos con las fábricas estilizadas (VFX.sty.basic.*).
// Usa la misma tabla que mod-enemigos.js (VFX.ENEMY_ROWS: id, nombre, TIPO, paleta, opciones) y registra cada una
// con la clave sty__<id>. Si un tipo aún no tiene versión estilizada, se registra la original con esa clave,
// así el puente siempre encuentra efecto (con el estilo nuevo encendido) y nunca se queda sin VFX.
// Requiere mod-enemigos.js y los tres mod-estilizado-*.js cargados antes (VFX_MODULE_DEPS).
// =====================================================================
(function(){
if(!window.VFX||!VFX.sty||!VFX.ENEMY_ROWS)return;
const S=VFX.sty, C=S.CELL, missing=new Set();
const DUST=S.MATTER_FS(C.puff,{relief:4,bias:.05,col:"vec3(.6,.48,.34)"});
// ---------- a medida ----------
// bear_dad_claw «Garra colosal» (sustituye al ZARPAZO; mismos dur 0,6 · ti 0,22 · anclas): el oso clava las garras en
// el suelo, una grieta corre hasta el objetivo y detrás de él brota una losa de tierra con forma de zarpa que se
// cierra encima (en ti); luego se desmorona en cascotes y polvo. La losa es UNA malla compacta escalada en pose
// (el puente la mueve entera, sin estirarla).
const CUSTOM={};
{
const {THREE,V3,cl,ss,f,set,groundPlane,caster,target}=VFX;
const lin=hex=>{const c=new THREE.Color(hex);return `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;};
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0, e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const EARTH="vec3(.6,.48,.34)", ROCK="vec3(.46,.41,.36)";
const mergeParts=(list)=>{const P=[],N=[],T=[];
  for(const [g0,part] of list){const g=g0.index?g0.toNonIndexed():g0;const pa=g.attributes.position.array,na=g.attributes.normal.array,ua=g.attributes.uv.array;
    for(let i=0;i<pa.length;i++){P.push(pa[i]);N.push(na[i]);}
    for(let i=0;i<ua.length;i+=2){T.push(cl(ua[i]*0.5+0.5,0,0.99)+2*part,ua[i+1]);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(T,2));
  g.computeBoundingSphere();return g;};
// losa-zarpa en el plano XY (alto 1, base en y=0, grosor en z); part 0 = roca, part 1 = garras
function pawGeo(){
  const D=0.15, ex=(shape,depth=D,bev=0.035)=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:2,curveSegments:10}).translate(0,0,-depth/2);
  const palm=new THREE.Shape();
  palm.moveTo(-0.2,0);palm.bezierCurveTo(-0.42,0.02,-0.44,0.3,-0.36,0.46);palm.bezierCurveTo(-0.24,0.62,0.24,0.62,0.36,0.46);
  palm.bezierCurveTo(0.44,0.3,0.42,0.02,0.2,0);palm.lineTo(-0.2,0);
  const list=[[ex(palm),0]];
  const toes=[[-0.34,0.66,-0.35],[-0.12,0.76,-0.1],[0.12,0.76,0.1],[0.34,0.66,0.35]];
  for(const [x,y,a] of toes){
    const t=new THREE.Shape();t.absellipse(0,0,0.1,0.13,0,Math.PI*2,false,0);
    list.push([ex(t,D*0.9,0.03).rotateZ(-a*0.5).translate(x,y,0),0]);
    const c=new THREE.Shape();c.moveTo(-0.055,0);c.quadraticCurveTo(-0.04,0.14,0.0,0.24);c.quadraticCurveTo(0.03,0.12,0.055,0);c.lineTo(-0.055,0);
    list.push([ex(c,0.05,0.012).rotateX(-0.95).rotateZ(-a*0.5).translate(x-a*0.06,y+0.1,0.02),1]);
  }
  return mergeParts(list);
}
const SLAB_FS=`uniform float uQ;uniform float uK;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=stySunV();
 float part=floor(vUv.x*.5+.001);vec3 q=vP;
 vec4 nn=styNoise(q.xy*vec2(.55,.42)+q.z*.3+.17);float nz=nn.r;float nf=styNoise(q.xy*1.6+.4).g;
 float e0=styErode(nz,uQ,.06);if(e0<.5)discard;float edge=1.-styErode(nz,uQ+.07,.06);
 vec3 base;float lb=0.;float glow=0.;
 if(part<.5){float st=sin(q.y*7.+nz*4.);base=mix(${lin('#b08d66')},${lin('#7d6450')},smoothstep(.1,.8,st)*.7);
   base=mix(base,${lin('#6f7a3c')},smoothstep(.62,.9,styNoise(q.xz*.8+.5).g)*.3);
   vec4 cel=styNoise(q.xy*vec2(.8,.7)+q.z*.2+.61);float ck=smoothstep(.035,.0,abs(cel.g-.5));lb=-.15*ck+(nf-.5)*.12;glow=ck;}
 else{base=${lin('#e9dcc2')};lb=.1;}
 float l=styLight(n,L);
 vec3 c=styRampOf(base,clamp(.2+.56*l+lb+(nz-.5)*.1,0.,1.))*styTint(l);
 float fr=1.-abs(dot(n,normalize(vV)));c+=uSunCol*.25*smoothstep(.62,.72,fr)*step(.5,l);
 c+=uC1*(uK*glow*1.4+edge*2.2*step(.001,uQ));gl_FragColor=vec4(c,1.);}`;
// grieta en el suelo de lanzador a objetivo (u a lo largo); uP = frente de avance, uK = brillo
const RIFT_FS=`uniform float uK;void main(){float u=vUv.x;float y=(vUv.y-.5)*2.;
 float n=styNoise(vec2(u*3.,.3)).r;float c=y-(n-.5)*.7-sin(u*23.)*.08;
 float w=.12*(1.-.4*abs(u-.5))+.04;float m=smoothstep(w,w*.3,abs(c))*step(u,uP)*smoothstep(0.,.06,u);
 float br=0.;for(int i=0;i<4;i++){float fi=float(i);float bu=.15+fi*.22;float d=u-bu;float side=mod(fi,2.)*2.-1.;
  br=max(br,smoothstep(.05,.0,abs(y-side*d*2.2-(n-.5)*.3))*step(0.,d)*step(d,.12)*step(bu+.1,uP));}
 m=max(m,br*.8);if(m<.02)discard;float core=smoothstep(w*.5,0.,abs(c))*step(u,uP);
 vec3 col=mix(vec3(.08,.06,.05),uC1*1.6,uK*core);gl_FragColor=vec4(col,m*uA);}`;
const PIT_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float n=styNoise(vec2(an*.9,r*.4)+.2).r;float br=smoothstep(.07,.0,abs(fract(an/6.2832*6.+n*.5)-.5)*r*1.4)*step(r,.9)*(1.-r*.6);
 float pit=smoothstep(.5,.2,r+(n-.5)*.3)*.55;float m=max(br,pit);if(m<.03)discard;
 float er=styErode(n*.6+(1.-r)*.4,uP,.12);gl_FragColor=vec4(styRampOf(${EARTH},.12+.2*n)*.7,m*er*uA);}`;
CUSTOM.bear_dad_claw=function(cfg){
  const HC=-0.6,HT=1.2,T0=0.1,TS=0.12,TR=0.15,TC=0.19,TI=0.22,TF=0.32,TE=0.56,DUR=0.6;
  const HZ=0.95, PS=2.45, CLOSE=0.62, PJ=1;   // bisagra delante del objetivo (lado de cámara), tamaño de la zarpa, ángulo cerrado
  return {key:cfg.key,name:cfg.name,pal:cfg.pal,dur:DUR,ti:TI,tier:3,stylized:true,
    anchors:{caster:HC,target:HT},
    phases:[["Preparación",0],["Garras al suelo",TS],["Zarpa de tierra",TR],["Impacto",TI],["Derrumbe",TF]],
  build(a){
    const L=a.L;
    const slabM=S.mat(SLAB_FS,{uQ:{value:-1},uK:{value:0}},{mode:'solid'});
    const slab=new THREE.Mesh(pawGeo().scale(PJ,PJ,PJ),slabM); L.mesh.add(slab);
    const rift=groundPlane(1,0,0.022,S.mat(RIFT_FS,{uK:{value:1}},{mode:'matter'})); L.decal.add(rift);
    const pit=groundPlane(2.4,HT,0.024,S.mat(PIT_FS,{},{mode:'matter'})); L.decal.add(pit);
    const shadow=S.contactShadow(L.decal,2.2);
    const ring=S.groundRing(L.decal,2.6);
    const spark=S.hitSpark(L.mesh,1.7,{seed:0.63,toCam:0.6,spin:0.2}), SPK=V3(HT,1.05,0.5);
    const K=`const float HT=${f(HT)};const float HZ=${f(HZ)};const float TS=${f(TS)};const float TR=${f(TR)};const float TI=${f(TI)};const float TF=${f(TF)};
      const float PS=${f(PS)};const float CA=${f(Math.cos(CLOSE))};const float SA=${f(Math.sin(CLOSE))};`;
    // terrones que saltan a lo largo de la grieta y al brotar la zarpa
    S.pts(L.part,16,VV+K+`void main(){float u=aSeed.x;float s=TS+u*.05;float life=.3+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=vec3(mix(-.2,HT-.3,u),.05,(aSeed.z-.5)*.4)+vec3((aSeed.w-.5)*.6,1.6+1.4*aSeed.y,(aSeed.z-.5)*1.2)*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.04);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.5,1.,age);vR=aSeed.y*6.28+t*8.;put(p,.12+.08*aSeed.w);}`,
     S.MATTER_FS(C.shard,{relief:3,col:ROCK,bias:.08}));
    S.pts(L.part,10,VV+K+`void main(){float s=TR+aSeed.x*.04;float life=.4+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;vec3 p=vec3(HT+cos(an)*.7,.15+t*.35,HZ+sin(an)*.3)+vec3(cos(an),0.,sin(an))*t*.9;
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.35,1.,age);vR=aSeed.w*6.28;put(p,(.55+.3*aSeed.y)*(.6+.7*age));}`,
     DUST);
    // derrumbe: cascotes que caen desde la zarpa cerrada y polvo que rueda por el suelo
    S.pts(L.part,26,VV+K+`void main(){float sl=aSeed.x;float s=TF+sl*.16+aSeed.y*.04;float life=.32+aSeed.w*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
     float d=(1.-sl)*PS;vec3 p0=vec3(HT+(aSeed.z-.5)*1.1*(.5+.5*sl),d*CA+.1,HZ-d*SA);
     vec3 p=p0+vec3((aSeed.z-.5)*1.4,.6*aSeed.y,(aSeed.w-.5)*1.2)*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.05);
     vA=(age>0.&&age<1.)?1.:0.;vK=smoothstep(.55,1.,age);vR=aSeed.y*6.28+t*10.;put(p,.16+.12*aSeed.w);}`,
     S.MATTER_FS(C.shard,{relief:3.5,col:EARTH,bias:.06}));
    S.pts(L.part,22,VV+K+`void main(){float s=TF+.06+aSeed.x*.16;float life=.3+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
     float an=aSeed.z*6.2832;float rad=mix(.4,1.3,1.-exp(-t*5.));vec3 p=vec3(HT+cos(an)*rad,.12+.4*aSeed.w*t*3.,HZ*.3+sin(an)*rad*.8);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age):0.;vK=smoothstep(.3,1.,age);vR=aSeed.w*6.28+t;put(p,(.6+.35*aSeed.y)*(.6+.8*age));}`,
     DUST);
    a.pose=function(te,o){
      const ia=te-TI;
      // el oso se alza y clava las garras en el suelo
      caster.position.x=HC+0.25*ss(T0,TS,te)-0.25*ss(TE-0.1,DUR-0.02,te);
      caster.position.y=0.18*ss(0,T0,te)*(1-ss(T0,TS,te));
      caster.rotation.z=0.3*ss(0,T0,te)-0.75*ss(T0,TS,te)+0.45*ss(TF,DUR-0.02,te);
      const sq=hitE(te-TS,12)*(te>=TS?1:0); caster.scale.set(1+0.1*sq,1-0.14*sq,1+0.1*sq);
      // grieta
      const x0=HC+0.55, x1=HT-0.1; rift.position.x=(x0+x1)/2; rift.scale.set(x1-x0,1,0.55);
      rift.visible=te>=TS&&te<DUR-0.02; set(rift,cl((te-TS)/0.05)*1.02,1-ss(TE-0.08,DUR-0.02,te));
      rift.material.uniforms.uK.value=0.6+1.2*hitE(te-TS,8)+0.8*hitE(ia,6);
      // la zarpa brota detrás del objetivo y se cierra encima
      const rise=e3((te-TR)/(TC-TR)), cls=cl((te-TC)/(TI-TC)), ang=CLOSE*cls*cls;
      const hold=ia>=0&&te<TF?hitE(ia,14):0;
      slab.visible=te>=TR&&te<TE+0.03;
      slab.position.set(HT+0.03*Math.sin(te*90)*hold,-0.9*(1-rise),HZ);
      slab.rotation.set(-ang-0.05*hold*Math.cos(ia*40),0,0);
      slab.scale.setScalar(Math.max(PS*(0.45+0.55*rise),0.001));
      slabM.uniforms.uQ.value=te<TF?-0.1:-0.1+1.2*ss(TF,TE,te);
      slabM.uniforms.uK.value=0.4*hitE(te-TR,10)*(te>=TR?1:0)+1.3*hitE(ia,7);
      pit.visible=te>=TR; set(pit,-0.1+1.1*ss(TE-0.05,DUR,te),ss(TR,TC,te));
      shadow.pose(HT,HZ*0.3,1,te>=TC&&te<TE?0.8*ss(TC,TI,te)*(1-ss(TF,TE,te)):0);
      ring.pose(ia,HT,0,0.36,0.9);
      spark.pose(ia,SPK,0.95);
      // el objetivo queda aplastado y se sacude al soltarse
      const h=hitE(ia,7), rel=hitE(te-TF,9);
      target.position.x=HT+0.06*h; target.position.y=0;
      target.rotation.z=-0.14*rel*Math.cos((te-TF)*22);
      const crush=ia>=0&&te<TF+0.05?0.22*(1-ss(TF,TF+0.05,te)):0;
      target.scale.set(1+crush*0.6,1-crush,1+crush*0.6);
      o.em=0;
      if(te<TS){o.g.set(caster.position.x+0.4,1.2,0.3);o.gs=0.5*ss(0,T0,te);o.ga=0.1*ss(0,T0,te);o.li=1*ss(0,T0,te);}
      else if(ia<0){o.g.set(HT,0.9,0);o.gs=1.2;o.ga=0.15;o.li=2.5;}
      else{o.g.set(HT,0.7,0);o.gs=1.4+2*Math.min(ia,0.4);o.ga=Math.exp(-ia*9)*0.35;o.li=6*Math.exp(-ia*5);}
      o.ia=ia;o.c.set(HT,0.6,0);o.shake=te>=TI?0.7:0;o.dist=0.7;o.flash=0.8;
    };
  }};
};
}

for(const [mod,rows] of Object.entries(VFX.ENEMY_ROWS)){
  const defs=[];
  for(const [id,name,type,pal,opt] of rows){
    if(CUSTOM[id]){defs.push(Object.assign(CUSTOM[id](Object.assign({key:"sty__"+id,name,pal},opt)),{basicType:type,styFallback:false}));continue;}
    const sty=S.basic[type], fab=sty||VFX.basic[type];
    if(!fab){console.warn("[vfx-sty] falta el tipo",type,"para",id);continue;}
    if(!sty)missing.add(type);
    defs.push(Object.assign(fab(Object.assign({key:"sty__"+id,name,pal},opt)),{basicType:type,styFallback:!sty}));
  }
  VFX.module(mod.replace("Enemigos","Estilizado · Enemigos"),defs);
}
if(missing.size)console.info("[vfx-sty] tipos aún sin versión estilizada (usan la original):",[...missing].join(", "));
})();

// =====================================================================
// BÁSICOS · CONTROL Y APOYO — fábricas reutilizables para habilidades de enemigos
//   VFX.basic.ESPINAS · ENREDO · NUBE_ESPORAS · RUGIDO · AUTOBUFF · ESCUDO · CURA
// Cada fábrica: VFX.basic.TIPO(cfg) → objeto de habilidad NUEVO {key,name,pal,dur,ti,tier,phases,build}.
//   cfg = {key,name,pal, ...opciones del tipo, demo?}. Con cfg.demo se declaran `variants` (una por opción);
//   sin demo, las opciones quedan fijadas desde cfg en build. Las opciones son capas (grupos por capa) que se
//   encienden/apagan; la pose lee a.o (banderas activas) y sigue siendo función pura del tiempo.
// Estados en el mundo, nunca UI: sangrado (gotas rojas), veneno (burbujas verdes), provocación (aro rojo),
//   aturdimiento (estrellas), inmovilizado (enroscado), purificación (motas oscuras expulsadas).
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,LK,camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,CHEVRON_FS,STAR4_FS,SMOKE_FS,billboard,towardCam,taperTube}=VFX.lib;
VFX.basic=VFX.basic||{};

const SOLID2=Object.assign({},SOLID,{side:THREE.DoubleSide});
const MO=V3(-3.47,1.55,0);                       // boca del lanzador
const TX=3.4, TC=V3(3.15,1.2,0);                 // objetivo: base x y pecho visible
// colores semánticos fijos: sangre, veneno, curación, aturdimiento, provocación
const RED=`vec3(.85,.06,.05)`, TOX=`vec3(.55,1.,.22)`, HEALG=`vec3(.45,1.,.6)`, STUNY=`vec3(1.,.88,.4)`, TAUNT=`vec3(1.,.16,.12)`;
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const easeO=x=>1-Math.pow(1-cl(x),3);
const back=x=>{x=cl(x);return 1+2.7*Math.pow(x-1,3)+1.7*Math.pow(x-1,2);};   // sale con rebote
const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;
const bez=(a,m,b,u,out)=>{const w0=(1-u)*(1-u),w1=2*u*(1-u),w2=u*u;return out.set(a.x*w0+m.x*w1+b.x*w2,a.y*w0+m.y*w1+b.y*w2,a.z*w0+m.z*w1+b.z*w2);};
const puni=extra=>Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},extra);

// ---------- fábrica genérica ----------
// grupos que siguen a un personaje (anclaje) y grupos por opción (se crean dentro del anclaje si existe)
const anchor=a=>{const F={};for(const k of LK){F[k]=new THREE.Group();a.L[k].add(F[k]);}a.F=F;return F;};
const moveF=(F,x,z)=>{for(const k of LK)F[k].position.set(x,0,z||0);};
function kit(a){
  const O={};
  const opt=name=>{if(!O[name]){const g={n:0};for(const k of LK){g[k]=new THREE.Group();(a.F||a.L)[k].add(g[k]);}O[name]=g;}return O[name];};
  const apply=fl=>{a.o=fl;let n=a.base;for(const k in O){const on=!!fl[k];for(const l of LK)O[k][l].visible=on;if(on)n+=O[k].n;}a.count=n;};
  return {opt,apply};
}
function factory(spec){
  return function(cfg){
    cfg=cfg||{};
    const fixed=spec.flags(cfg);
    const def={key:cfg.key||spec.key,name:cfg.name||spec.name,pal:cfg.pal||spec.pal,dur:spec.dur,ti:spec.ti,tier:spec.tier,
      phases:spec.phases.map(p=>p.slice())};
    if(spec.allies)def.allies=()=>spec.allies(def.o||fixed);
    if(cfg.demo&&spec.variants){
      def.variants=spec.variants.map(v=>[v[0],v[1]]); def.v=spec.variants[0][0]; def.vlabel="Opción";
      if(spec.variants.some(v=>v[3]))def.pal=()=>{const e=spec.variants.find(x=>x[0]===def.v);return (e&&e[3])||cfg.pal||spec.pal;};
    }
    def.build=function(a){
      const K=kit(a); a.o=fixed; spec.build(a,K.opt,cfg); a.base=a.count;
      if(a.variants)a.setVariant=v=>{const e=spec.variants.find(x=>x[0]===v)||spec.variants[0];a.v=e[0];K.apply(Object.assign(spec.flags({}),e[2]));};
      else K.apply(fixed);
    };
    return def;
  };
}

// ---------- shaders compartidos ----------
const ROT=`varying float vR;vec2 rot(vec2 q,float a){float c=cos(a),s=sin(a);return vec2(c*q.x-s*q.y,s*q.x+c*q.y);}`;
// raíces luminosas que se extienden por el suelo desde el centro (uP = alcance)
const ROOTS_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
 float j=noise(vec3(r*3.,an*1.5,2.))-.5;
 float v=pow(1.-abs(fract(an*1.11+j*.35+r*.15)*2.-1.),14.)+pow(1.-abs(fract(an*1.9-j*.5+.3)*2.-1.),20.)*.7;
 float reach=smoothstep(uP,uP-.25,r);
 float m=v*reach*smoothstep(1.,.6,r)+smoothstep(.5,0.,r)*.16*uP+band(r,uP*.95,.05)*.45*step(uP,.99);
 gl_FragColor=vec4(mix(uC2,uC1,v*.6+.2)*1.5,m*uA);}`;
// aro de receptor en el suelo: círculo con marcas que giran (uP abre el radio)
const GLYPH_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
 float R=.55+.35*uP;
 float m=band(r,R,.03)+band(r,R,.14)*.25+band(r,R-.12,.012)*.8+band(r,R+.09,.03)*step(.55,fract(an*16.+uT*.5))*.8;
 m*=step(r,1.);
 gl_FragColor=vec4(mix(uC2,uC1,.6)*1.5+vec3(1.)*band(r,R,.012)*.4,m*uA);}`;
// hoja (vesica con nervio), mezcla normal para que se lea sólida con cualquier paleta
const LEAF_FS=HEAD+ROT+`varying float vA;varying float vMix;
void main(){vec2 q=rot(gl_PointCoord-.5,vR)*2.;
 float w=.42*(1.-q.y*q.y);float d=abs(q.x)-max(w,0.)*.9;
 float body=smoothstep(.05,-.05,d)*step(abs(q.y),1.);float rib=smoothstep(.06,0.,abs(q.x))*step(abs(q.y),.85);
 float a=body*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2,uC1,.4+.35*vMix)*(1.05+rib*.5),a);}`;
// destello de rayos en billboard
const FLASH_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float rays=pow(abs(cos(an*3.)),16.)*smoothstep(1.,.15,r)+pow(abs(cos(an*3.+.52)),30.)*smoothstep(.8,.1,r)*.6;
 float core=pow(max(0.,1.-r),3.);
 gl_FragColor=vec4(mix(uC1,vec3(1.),.45+.4*core)*1.6,(rays*(1.-uP*.6)+core)*uA);}`;
// columna de energía que se revela de abajo arriba (uP = frente)
const COL_FS=H=>`void main(){float h=vP.y/${f(H)}+.5;float an=atan(vP.z,vP.x);
 float n=noise(vec3(an*3.,h*4.-uT*7.,0.))*.6+noise(vec3(an*8.,h*10.-uT*12.,3.))*.4;
 float st=smoothstep(.45,.85,n);
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
 float fro=uP*1.15;float vis=smoothstep(fro,fro-.15,h);
 float head=band(h,fro,.06)*step(uP,.99);
 float al=(st*.7+fr*.3+head*1.2)*vis*pow(1.-h,.8)*uA;
 gl_FragColor=vec4(mix(uC2,uC1,st+head)*1.3+vec3(1.)*head*.6,al);}`;
// cinta en hélice que crece por uv.x (uP = cabeza)
const RIB_FS=`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;float w=abs(vUv.y-.5)*2.;
 float head=exp(-d*25.);float body=exp(-d*3.)*(.5+.5*noise(vec3(u*20.-uT*8.,vUv.y*3.,0.)));
 gl_FragColor=vec4(mix(uC2,uC1,head+.3)*1.5+vec3(1.)*head*.5,(body+head)*smoothstep(1.,.2,w)*uA);}`;
// cúpula hexagonal: celdas que se encienden de abajo arriba (uP), destello (uF) y disolución de arriba abajo (uD)
const HEX_FS=(R,ymin)=>`uniform float uD;uniform float uF;
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
 vec2 uv=vec2(vUv.x*20.,vUv.y*10.);
 vec2 r=vec2(1.,1.732),h=r*.5;vec2 a=mod(uv,r)-h,b=mod(uv-h,r)-h;vec2 g=dot(a,a)<dot(b,b)?a:b;
 float e=.5-hexD(g);float cid=hash(vec3(uv-g,3.));
 float hN=clamp((vP.y-(${f(ymin)}))/${f(R-ymin)},0.,1.);
 float on=hN*.7+cid*.3;float off=(1.-hN)*.7+cid*.3;
 float vis=step(on,uP)*step(uD,off);
 float pop=smoothstep(.15,0.,uP-on)*step(on,uP);
 float gone=smoothstep(.12,0.,off-uD)*step(.001,uD);
 float line=smoothstep(.07,0.,e);
 float shim=.75+.25*sin(uT*4.+cid*30.);
 float al=(line*(.35+fr)*shim+fr*.25+.05+.08*cid+pop*(.5+line)+gone*.8+uF*(line+.3))*vis;
 vec3 c=mix(uC2,uC1,clamp(fr+line*.6,0.,1.))*1.3+vec3(1.)*(pop+uF*.6+gone*.5)*.5;
 gl_FragColor=vec4(c,al*uA);}`;
const HEXP_FS=HEAD+ROT+`varying float vA;varying float vMix;
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
void main(){vec2 q=rot(gl_PointCoord-.5,vR);float d=hexD(q);
 float a=(smoothstep(.06,0.,abs(d-.36))+smoothstep(.36,.0,d)*.25)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35)*1.5,a);}`;
function dome(R,cy,frac){
  const ymin=R*Math.cos(Math.PI*frac);
  const m=new THREE.Mesh(new THREE.SphereGeometry(R,56,30,0,Math.PI*2,0,Math.PI*frac),fxU(HEX_FS(R,ymin),{uD:{value:0},uF:{value:0}}));
  m.position.y=cy; return m;
}
// motas / gotas genéricas
const DOT_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(${col}*1.4+vec3(1.)*smoothstep(.2,0.,d)*.4,a);}`;
const DROP_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=smoothstep(.45,.3,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.15,0.,length(q-vec2(-.1,-.12)));
 gl_FragColor=vec4(${RED}*(.75+.4*vMix)+vec3(1.,.6,.6)*hl*.5,a);}`;

// =====================================================================
// ESPINAS (0,9 s) — espinas/raíces que brotan bajo el objetivo y se retraen.
//   cfg.root: quedan enroscadas ~0,5 s (dos espirales espinosas lo atan) · cfg.bleed: puntas rojas y gotas de sangre
// =====================================================================
const THORN_FS=`uniform float uB;
void main(){float u=vUv.x;vec3 N=normalize(vN),V=normalize(vV);
 float fr=pow(1.-abs(dot(N,V)),2.);
 float lit=.4+.6*max(0.,dot(N,normalize(vec3(.3,.8,.5))));
 float fib=.5+.5*sin(vUv.y*18.85+u*16.);
 float n=noise(vec3(u*16.,vUv.y*6.,1.));
 vec3 c=mix(uC2*.4,mix(uC2,uC1,.5),u)*(.8+.3*fib)*(.8+.4*n);
 vec3 tip=mix(uC1*1.15+vec3(.15),${RED},uB);
 c=mix(c,tip,smoothstep(.6,.97,u)*(.6+.4*uB));
 gl_FragColor=vec4(c*lit+uC1*fr*(.35+.7*uA)+tip*smoothstep(.82,1.,u)*uA*.9,1.);}`;
const COIL_FS=`uniform float uB;
void main(){float u=vUv.x;if(u>uP)discard;vec3 N=normalize(vN),V=normalize(vV);
 float fr=pow(1.-abs(dot(N,V)),2.);float lit=.4+.6*max(0.,dot(N,normalize(vec3(.3,.8,.5))));
 float tw=.5+.5*sin(vUv.y*12.566+u*70.);
 vec3 c=mix(uC2*.45,mix(uC2,uC1,.55),tw*.7)*lit;
 float barb=smoothstep(.8,1.,fract(u*24.+vUv.y*.5))*step(.55,fract(vUv.y*2.));
 float head=exp(-(uP-u)*30.)*step(uP,.999);
 c+=mix(uC1,${RED},uB*.6)*barb*.9+uC1*fr*(.3+uA*.8)+(uC1+.3)*head;
 gl_FragColor=vec4(c,1.);}`;
VFX.basic.ESPINAS=factory({key:"basic_espinas",name:"Espinas",pal:"Naturaleza",dur:0.9,ti:0.26,tier:2,
  phases:[["Aviso",0],["Brote",0.14],["Impacto",0.26],["Agarre",0.4],["Retirada",0.5]],
  flags:c=>({root:!!c.root,bleed:!!c.bleed}),
  variants:[["normal","Normal",{}],["inmoviliza","Inmoviliza",{root:true}],["sangrado","Sangrado",{bleed:true}]],
build(a,opt){
  const L=a.L,T0=0.14,TI=0.26,TR0=0.5,TR1=0.68,TH0=0.84,TE=0.9,R=rng(11);
  const F=anchor(a); moveF(F,TX,0);
  // espinas: 6 interiores que se curvan hacia el cuerpo y 5 exteriores que se abren; opacas (se leen con cualquier paleta)
  const thornMat=fxU(THORN_FS,{uB:{value:0}},SOLID2), thorns=[];
  for(let i=0;i<11;i++){
    const inner=i<6, an=(inner?i/6:(i-6)/5+0.1)*Math.PI*2+R()*0.5, c=Math.cos(an), s=Math.sin(an);
    const r0=inner?0.72+R()*0.12:0.95+R()*0.25, r1=inner?0.47+R()*0.06:r0+0.35+R()*0.2, H=inner?0.95+R()*0.5:0.42+R()*0.3;
    const rm=inner?r0+0.08:r0+(r1-r0)*0.3;
    const curve=new THREE.CatmullRomCurve3([V3(r0*c,-0.03,r0*s),V3(rm*c,H*0.5,rm*s),V3(r1*c,H,r1*s)]);
    const m=new THREE.Mesh(taperTube(curve,18,6,inner?0.085:0.06,0.004),thornMat); F.mesh.add(m);
    thorns.push({m,inner,H,d:T0+(inner?R()*0.06:0.02+R()*0.08)});
  }
  const veins=groundPlane(2.8,0,0.02,fx(ROOTS_FS)), shock=groundPlane(3.2,0,0.03,fx(RING_FS));
  F.decal.add(veins,shock);
  const C=`const float T0=${f(T0)};const float TI=${f(TI)};`;
  // tierra que salta en la base de cada espina, astillas y chispas
  a.count+=points(F.part,70,C+`void main(){float an=aSeed.z*6.2832;float rd=.55+.45*aSeed.w;float s=T0+aSeed.x*.12;float life=.35+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(cos(an)*rd,.05,sin(an)*rd)+vec3(cos(an),0.,sin(an))*(.55*(1.-exp(-t*5.)))+vec3(0.,.5*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.8:0.;put(p,(.18+.16*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=points(F.part,50,C+`void main(){float s=TI-.06+aSeed.x*.08;float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=normalize(vec3(cos(an),1.4+aSeed.w,sin(an)));
   vec3 p=vec3(cos(an)*.6,.05,sin(an)*.6)+d*(1.8+1.6*aSeed.w)*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.035+.04*aSeed.y);}`,CHIP_FS,NB);
  a.count+=sparks(F.part,60,TI,"-.25,1.,0.","-.4,.4,0.",2,6,2.5);

  // ---- inmoviliza: dos espirales espinosas suben enroscándose y quedan apretadas hasta TH0
  const G=opt("root"), coilMat=fxU(COIL_FS,{uB:{value:0}},SOLID2), coil=new THREE.Group(); G.mesh.add(coil);
  for(let k=0;k<2;k++){const pts=[];
    for(let j=0;j<=40;j++){const t=j/40,an=k*Math.PI+t*Math.PI*2*1.35,r=0.5-0.05*t;pts.push(V3(Math.cos(an)*r,0.02+t*1.3,Math.sin(an)*r));}
    coil.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),120,6,0.055,0.02),coilMat));}
  const bed=groundPlane(2.0,0,0.024,fx(ROOTS_FS)); G.decal.add(bed);
  G.n+=points(G.part,40,C+`void main(){float life=.35+aSeed.y*.2;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832+age*2.;vec3 p=vec3(cos(an)*.56,.1+r.y*1.2+age*.3,sin(an)*.56);
   vA=(k>=1.)?sin(age*3.14159)*(1.-smoothstep(${f(TH0-0.04)},${f(TH0+0.04)},uT)):0.;put(p,.04+.04*r.z);}`);

  // ---- sangrado: chorro de gotas desde el pecho, goteo y salpicadura roja en el suelo
  const B=opt("bleed");
  B.n+=points(B.part,60,C+`void main(){float s=TI+aSeed.x*.06;float life=.45+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(.6,.5,1.)+vec3(-.7,.6,.2));vec3 o=vec3(-.3,.7+aSeed.w*.6,.1);
   vec3 p=o+d*(1.2+1.4*aSeed.z)*t+vec3(0.,-5.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.05+.05*aSeed.w);}`,DROP_FS,NB);
  B.n+=points(B.part,30,C+`void main(){float per=.28;float k=(uT-TI-.05)/per+aSeed.x;float c=floor(k);float t=fract(k)*per;vec3 r=rr(c);
   float an=1.57+r.x*1.57;vec3 p=vec3(cos(an)*.44,.5+r.y*.7-3.5*t*t,sin(an)*.44);
   vA=(k>=1.&&uT<.88&&p.y>.03)?.85:0.;put(p,.035+.025*r.z);}`,DROP_FS,NB);
  const splat=groundPlane(1.5,-0.2,0.026,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,2.));
   float m=smoothstep(uP*.8,uP*.8-.15,r+(n-.5)*.35);float dots=smoothstep(.7,.75,noise(vec3(p*16.,5.)))*smoothstep(1.,.5,r)*step(.2,uP);
   gl_FragColor=vec4(${RED}*.7,(m*.7+dots*.6)*uA);}`,NB)); splat.position.z=0.25; B.decal.add(splat);

  a.pose=function(te,o){
    const ia=te-TI, root=a.o.root, bleed=a.o.bleed, hit=hitK(ia,7);
    const hold=root?ss(TI,TI+0.08,te)*(1-ss(TH0,TE,te)):0;
    caster.rotation.z=0.08*ss(0,T0,te)-0.14*ss(T0,T0+0.06,te)+0.06*ss(TI,TI+0.3,te);
    // el objetivo salta con el pinchazo; si queda atado, forcejea apretado
    target.position.y=hit*0.07*(root?0.5:1);
    target.rotation.z=-hit*0.16*Math.cos(ia*18)*(1-hold*0.7)+hold*0.025*Math.sin(te*47);
    target.scale.set(1-0.05*hold,1+0.02*hold,1-0.05*hold);
    // espinas: suben atravesando el suelo con rebote y se hunden de nuevo
    for(const t of thorns){
      const keep=root&&t.inner, out=keep?ss(TH0,TE,te):ss(TR0+(t.inner?0.04:0),TR1,te), g=back((te-t.d)/0.09)*(1-out);
      t.m.visible=te>t.d&&g>0.002; t.m.position.y=-(1-g)*t.H*1.08;
    }
    thornMat.uniforms.uA.value=0.25+ss(T0,TI,te)*(1-ss(TI+0.05,TI+0.3,te));
    thornMat.uniforms.uB.value=coilMat.uniforms.uB.value=bleed?ss(TI,TI+0.08,te):0;
    // espirales de atadura
    const cp=ss(TI-0.03,TI+0.12,te)*(1-ss(TH0,TE,te)); coil.visible=cp>0.002;
    const sq=1-0.07*ss(TI+0.08,TI+0.16,te)*(1-ss(TH0,TE,te)); coil.scale.set(sq,1,sq);
    set({material:coilMat},cp,0.3+0.7*hitK(te-TI-0.12,6)+0.15*Math.sin(te*20)*hold);
    // suelo: raíces que se iluminan en el aviso y onda al brotar
    set(veins,ss(0,T0+0.04,te),(0.5+0.5*ss(T0,TI,te))*(1-ss(root?TH0-0.1:TR0,root?TE:TR1+0.15,te)));
    let p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
    set(bed,0.6+0.4*hold,hold*0.9);
    set(splat,ss(TI+0.05,TI+0.3,te),bleed?ss(TI+0.05,TI+0.15,te)*(1-ss(0.78,TE,te)):0);
    // luz y resplandor
    if(te<T0){const k=ss(0,T0,te);o.g.set(TX,0.25,0);o.gs=0.9*k;o.ga=0.22*k;o.li=1.5*k;}
    else if(te<TI+0.25){const l=Math.max(ia,0);o.g.set(TX-0.15,0.8,0.2);o.gs=1+2.2*l;o.ga=te<TI?0.3:0.55*Math.exp(-l*9);o.li=te<TI?3:6*Math.exp(-l*6);}
    else{o.g.set(TX,0.8,0.2);o.gs=1.4;o.ga=0.12*hold;o.li=1.5*hold;}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.6; o.flash=0.85;
    if(bleed){o.em=ia>=0?0.35*Math.exp(-ia*5)+0.12*(1-ss(0.6,TE,te)):0;o.emc.setRGB(1,0.12,0.1);}
    else if(root){o.em=0.28*hold;o.emc.copy(U.uC1.value);}
  };
}});

// =====================================================================
// ENREDO (1,0 s) — tres lianas salen del suelo, reptan hacia el objetivo y se enroscan en espiral;
//   aprietan (inmovilizado), laten y se deshacen en hojas
// =====================================================================
const VINE_GLSL=`vec3 vine(float t,float a0){float r,an,y;
 if(t<.25){float s=t/.25;r=1.25-.7*s;an=a0+.6*s;y=.04+.1*s*s;}
 else{float s=(t-.25)/.75;r=.55-.1*s;an=a0+.6+s*7.854;y=.14+1.2*s;}
 return vec3(cos(an)*r,y,sin(an)*r);}`;
const VINE_FS=`uniform float uD;
void main(){float u=vUv.x;if(u>uP)discard;
 vec3 N=normalize(vN),V=normalize(vV);
 float n=noise(vP*9.);float th=uD*1.15-.08;if(n<th)discard;
 float burn=smoothstep(.1,0.,n-th)*step(.001,uD);
 float lit=.45+.55*max(0.,dot(N,normalize(vec3(.3,.8,.5))));
 float fr=pow(1.-abs(dot(N,V)),2.);
 float tw=.5+.5*sin(vUv.y*12.566+u*90.);
 vec3 c=mix(uC2*.5,mix(uC2,uC1,.55),tw*.6+n*.3)*lit;
 float head=exp(-(uP-u)*40.)*step(uP,.999);
 float node=smoothstep(.85,1.,fract(u*14.))*.6;
 c+=uC1*(fr*.45+node*.3)+(uC1+.35)*head*1.2+uC1*uA*.6*(.5+.5*sin(u*40.-uT*30.))+(uC1*1.3+.3)*burn;
 gl_FragColor=vec4(c,1.);}`;
VFX.basic.ENREDO=factory({key:"basic_enredo",name:"Enredo",pal:"Naturaleza",dur:1.0,ti:0.45,tier:2,
  phases:[["Brote",0],["Enredo",0.12],["Atadura",0.45],["Suelta",0.78]],
  flags:()=>({}),
build(a){
  const L=a.L,TI=0.45,TD=0.78,TE=1.0,A0=[0.3,2.394,4.489],TS=[0.08,0.12,0.16],GROW=0.3;
  const F=anchor(a); moveF(F,TX,0);
  const vp=(t,a0,out)=>{let r,an,y;
    if(t<0.25){const s=t/0.25;r=1.25-0.7*s;an=a0+0.6*s;y=0.04+0.1*s*s;}
    else{const s=(t-0.25)/0.75;r=0.55-0.1*s;an=a0+0.6+s*7.854;y=0.14+1.2*s;}
    return out.set(Math.cos(an)*r,y,Math.sin(an)*r);};
  // grupo que aprieta (lianas y hojas) al atar
  const sqM=new THREE.Group(), sqP=new THREE.Group(); F.mesh.add(sqM); F.part.add(sqP);
  const vineMat=A0.map(()=>fxU(VINE_FS,{uD:{value:0}},SOLID2));
  A0.forEach((a0,k)=>{const pts=[];for(let j=0;j<=60;j++)pts.push(vp(j/60,a0,V3(0,0,0)));
    sqM.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts),150,7,0.075,0.022),vineMat[k]));});
  const roots=groundPlane(3.0,0,0.02,fx(ROOTS_FS)), shock=groundPlane(3.0,0,0.03,fx(RING_FS));
  F.decal.add(roots,shock);
  const C=`const float TI=${f(TI)};const float TD=${f(TD)};${VINE_GLSL}
  float a0of(float k){return k<.5?${f(A0[0])}:(k<1.5?${f(A0[1])}:${f(A0[2])});}
  float tsof(float k){return k<.5?${f(TS[0])}:(k<1.5?${f(TS[1])}:${f(TS[2])});}`;
  // hojas que brotan al paso de la punta y caen al soltarse
  a.count+=points(sqP,96,C+`varying float vR;void main(){float k=floor(aSeed.x*2.999);float a0=a0of(k);float ts=tsof(k);
   float s=.06+.92*aSeed.y;float tb=ts+${f(GROW)}*(1.-sqrt(1.-s));float t=uT-tb;
   vec3 p=vine(s,a0);vec3 ou=normalize(vec3(p.x,0.,p.z));
   p+=ou*(.06+.05*aSeed.z)+vec3(0.,(aSeed.w-.5)*.08,0.);
   float tr=max(uT-TD-aSeed.z*.1,0.);
   p+=ou*tr*(.6+.6*aSeed.w)+vec3(0.,.35*tr-2.2*tr*tr,0.);
   vR=aSeed.w*6.2832+sin(uT*9.+aSeed.z*20.)*.3+tr*(aSeed.z-.5)*14.;
   vA=(t>0.&&p.y>.02)?1.-smoothstep(.04,.2,tr):0.;
   put(p,(.13+.08*aSeed.z)*smoothstep(0.,.08,t));}`,LEAF_FS,NB);
  // savia luminosa que sube por las lianas al apretar
  a.count+=points(sqP,60,C+`void main(){float k=floor(aSeed.x*2.999);float a0=a0of(k);float s0=TI-.04+aSeed.y*.12;float t=uT-s0;float u=t*1.8;
   vec3 p=vine(clamp(u,0.,1.),a0);
   vA=(t>0.&&u<1.)?sin(u*3.14159)*(1.-smoothstep(TD-.05,TD+.05,uT)):0.;put(p,.05+.04*aSeed.z);}`);
  // tierra en los puntos donde emergen
  a.count+=points(F.part,45,C+`void main(){float k=floor(aSeed.x*2.999);float a0=a0of(k);float s=tsof(k)+aSeed.y*.08;float life=.35+aSeed.z*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 b=vec3(cos(a0)*1.25,.05,sin(a0)*1.25);float an=aSeed.w*6.2832;
   vec3 p=b+vec3(cos(an),0.,sin(an))*(.1+.45*(1.-exp(-t*5.)))+vec3(0.,.45*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.75:0.;put(p,(.16+.14*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(F.part,50,TI,"-.3,.9,.2","-.3,.5,.3",2,5,2);

  a.pose=function(te,o){
    const ia=te-TI, hold=ss(TI-0.04,TI+0.05,te)*(1-ss(TD,TD+0.1,te));
    caster.rotation.z=0.1*ss(0,0.08,te)-0.18*ss(0.08,0.14,te)+0.08*ss(0.2,0.5,te);
    vineMat.forEach((m,k)=>{const p=cl((te-TS[k])/GROW);
      m.uniforms.uP.value=te<TS[k]?0:1-(1-p)*(1-p);
      m.uniforms.uA.value=hold*(0.3+0.9*hitK(ia,7)); m.uniforms.uD.value=ss(TD,TE-0.02,te);});
    // las lianas aprietan: escala radial y un latido mientras atan
    const s=1-0.08*hold+0.015*hold*Math.sin(te*26); sqM.scale.set(s,1,s); sqP.scale.set(s,1,s);
    target.scale.set(1-0.06*hold,1+0.02*hold,1-0.06*hold);
    target.rotation.z=hold*0.03*Math.sin(te*43)-hitK(ia,8)*0.08*Math.cos(ia*20);
    set(roots,ss(0.05,TI,te),0.8*ss(0,0.1,te)*(1-ss(TD,TE,te)));
    let p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    if(te<TI){const k=ss(0.05,TI,te);vp(cl((te-TS[1])/GROW)*0.9,A0[1],o.g).x+=TX;o.gs=0.8;o.ga=0.25*k;o.li=1+2*k;}
    else{const l=ia;o.g.set(TX,0.85,0.2);o.gs=1.2+1.6*Math.min(l,0.4);o.ga=0.5*Math.exp(-l*8)+0.1*hold;o.li=5*Math.exp(-l*6)+1.5*hold;}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.5; o.flash=0.7;
    o.em=0.3*hold*(0.7+0.3*Math.sin(te*20)); o.emc.copy(U.uC1.value);
  };
}});

// =====================================================================
// NUBE_ESPORAS (1,1 s) — soplo de esporas del lanzador que florece en una nube lenta sobre el objetivo,
//   se expande, deja motas que flotan hacia arriba y se disipa. cfg.poison: burbujas verdes ~0,5 s en el objetivo
// =====================================================================
const SPORE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float core=smoothstep(.16,.04,d);float ring=smoothstep(.05,0.,abs(d-.33))*.6;float halo=smoothstep(.5,0.,d)*.25;
 float a=(core+ring+halo)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC1,vec3(1.),core*.5)*1.4,a);}`;
const CLOUD_FS=`uniform float uQ;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 vec3 q=vec3(p*2.2,uT*.35+uQ);
 float n=noise(q)*.5+noise(q*2.1+vec3(uT*.2,-uT*.3,0.))*.3+noise(q*4.3)*.2;
 float m=smoothstep(1.,.25,r+(n-.5)*.7)*(.55+.6*n);
 float hole=1.-uP*.7*smoothstep(.7,0.,r+(n-.5)*.4);
 gl_FragColor=vec4(mix(uC2*.7,uC1,n*.85),m*hole*uA*.55);}`;
VFX.basic.NUBE_ESPORAS=factory({key:"basic_nube_esporas",name:"Nube de esporas",pal:"Esporas",dur:1.1,ti:0.38,tier:2,
  phases:[["Soplo",0],["Nube",0.34],["Deriva",0.6],["Disipación",0.85]],
  flags:c=>({poison:!!c.poison}),
  variants:[["normal","Normal",{},"Esporas"],["veneno","Veneno",{poison:true},"Veneno"]],
build(a,opt){
  const L=a.L,TB=0.34,TI=0.38,TE=1.1,P1=V3(3.3,1.1,0),PM=V3(0,2.6,0.6);
  const F=anchor(a); moveF(F,TX,0);
  // nube: dos velos de ruido en billboard (mezcla normal: se lee como neblina teñida)
  const clouds=[0,1,2].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.0),fxU(CLOUD_FS,{uQ:{value:i*7.3}},NB));L.mesh.add(m);return m;});
  const stain=groundPlane(3.6,0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*6.,1.));
   float m=smoothstep(uP,uP-.35,r+(n-.5)*.3);float dots=smoothstep(.72,.8,noise(vec3(p*22.,3.)))*m;
   gl_FragColor=vec4(mix(uC2,uC1,.4+dots*.6)*1.2,(m*.22+dots*.7+band(r,uP*.9,.04)*.4*step(uP,.99))*uA);}`));
  F.decal.add(stain);
  const C=`const float TB=${f(TB)};const vec3 P0=${v3(MO)};const vec3 P1=${v3(P1)};const vec3 PM=${v3(PM)};
  vec3 bz(float u){return mix(mix(P0,PM,u),mix(PM,P1,u),u);}`;
  // soplo: motas que viajan en arco de la boca al objetivo
  a.count+=points(L.part,70,C+`void main(){float s=.02+aSeed.x*.16;float u=(uT-s)/.2;
   vec3 r=rnd();vec3 p=bz(clamp(u,0.,1.))+r*.2*sin(clamp(u,0.,1.)*3.14159)+vec3(0.,sin(u*9.+aSeed.w*6.)*.08,0.);
   vA=(u>0.&&u<1.)?smoothstep(0.,.1,u)*(1.-smoothstep(.85,1.,u)):0.;put(p,.05+.05*aSeed.z);}`,SPORE_FS);
  // floración: esporas que se expanden girando despacio
  a.count+=points(F.part,240,C+`void main(){float s=TB+aSeed.x*.14;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.6,1.)+.0001);float R=(.3+1.35*sqrt(aSeed.z))*(1.-exp(-t*3.2));
   float sw=t*(.8+aSeed.y)*(aSeed.w>.5?1.:-1.);float c=cos(sw),sn=sin(sw);
   vec3 q=d*R;q.xz=vec2(c*q.x-sn*q.z,sn*q.x+c*q.z);
   vec3 p=vec3(0.,.9,0.)+q+vec3(0.,.25*t,0.);p.y=max(p.y,.05);
   float fade=1.-smoothstep(.82,1.08,uT-aSeed.y*.06);
   vA=(uT>s)?smoothstep(0.,.08,t)*fade*(.55+.45*sin(t*14.+aSeed.x*40.)):0.;
   put(p,(.04+.06*aSeed.w)*(1.+.6*t));}`,SPORE_FS);
  // motas que flotan hacia arriba
  a.count+=points(F.part,110,C+`void main(){float an=aSeed.z*6.2832;float rd=sqrt(aSeed.w)*1.4;float s=TB+.05+aSeed.x*.4;float t=max(uT-s,0.);float life=.5+aSeed.y*.4;float age=t/life;
   vec3 p=vec3(cos(an)*rd+sin(t*3.+aSeed.x*9.)*.1,.15+aSeed.y*.9+t*(.55+.4*aSeed.x),sin(an)*rd);
   vA=(uT>s&&age<1.)?sin(age*3.14159)*(1.-smoothstep(.95,1.1,uT)):0.;put(p,.05+.05*aSeed.y);}`);
  // volumen: bocanadas grandes y tenues
  a.count+=points(F.part,26,C+`void main(){float s=TB+aSeed.x*.12;float t=max(uT-s,0.);vec3 d=normalize(rnd()*vec3(1.,.5,1.)+.0001);
   vec3 p=vec3(0.,.8,0.)+d*(.2+1.1*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.2*t,0.);p.y=max(p.y,.25);
   vA=(uT>s)?smoothstep(0.,.1,t)*(1.-smoothstep(.75,1.08,uT))*.5:0.;put(p,(.7+.6*aSeed.w)*(.5+.8*(1.-exp(-t*3.))));}`,SMOKE_FS(`mix(uC2,uC1,.35)`),NB);

  // ---- veneno: burbujas verdes que suben por el objetivo y revientan; aro tóxico a los pies
  const P=opt("poison");
  P.n+=points(P.part,60,`void main(){float life=.35+aSeed.y*.25;float k=(uT-.42)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float y0=.2+r.y*1.3;float rad=y0>1.3?.3:.46;
   vec3 p=vec3(cos(an)*rad,y0+age*.4,sin(an)*rad);
   vA=(k>=1.)?smoothstep(0.,.15,age)*(1.-smoothstep(.85,1.,age))*(1.-smoothstep(.98,1.1,uT)):0.;
   put(p,(.06+.08*r.z)*(.6+.6*age));}`,HEAD+`varying float vA;varying float vMix;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
   float ring=smoothstep(.07,0.,abs(d-.36))*.9+smoothstep(.5,0.,d)*.15;float hl=smoothstep(.12,0.,length(q-vec2(-.13,-.13)));
   float a=(ring+hl*.8)*vA;if(a<.003)discard;gl_FragColor=vec4(${TOX}*1.3+vec3(hl*.5),a);}`);
  const tox=groundPlane(1.7,0,0.028,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(r,.7+.08*sin(uT*9.),.06)+smoothstep(.7,0.,r)*.18*(.6+.4*noise(vec3(p*9.,uT*2.)));
   gl_FragColor=vec4(${TOX}*1.3,m*uA);}`)); P.decal.add(tox);

  a.pose=function(te,o){
    const ia=te-TI, env=ss(TB,TB+0.15,te)*(1-ss(0.85,TE,te)), pois=a.o.poison?ss(TI,TI+0.08,te)*(1-ss(0.95,TE,te)):0;
    caster.rotation.z=-0.1*ss(0,0.03,te)+0.15*ss(0.03,0.1,te)-0.05*ss(0.12,0.4,te);
    // velos de nube: crecen, derivan y se abren al disiparse
    clouds.forEach((m,i)=>{const g=easeO((te-TB-i*0.03)/0.35);
      towardCam(m.position,tmp.set(TX+(i-1)*0.35,0.95+0.12*i+0.15*Math.max(te-TB,0),(i-1)*0.25),0.1+i*0.25);
      billboard(m,0.4*i+te*(i%2?0.25:-0.2)); m.visible=te>TB+i*0.03; m.scale.setScalar(Math.max(0.35+0.75*g,0.001));
      set(m,ss(0.8,TE,te),env*(0.9-0.15*i));});
    set(stain,easeO((te-TB)/0.45),0.9*env);
    set(tox,0,pois);
    // el objetivo tose dentro de la nube
    target.rotation.z=-hitK(ia,8)*0.1*Math.cos(ia*16)+env*0.03*Math.sin(te*31)*Math.sin(te*7);
    if(te<TB){const u=cl((te-0.02)/0.28);bez(MO,PM,P1,u,o.g);o.gs=0.7;o.ga=0.25;o.li=1.8;}
    else{const l=Math.max(ia,0);o.g.set(TX,1.0,0.2);o.gs=2.4+1.2*env;o.ga=0.2*env+0.3*Math.exp(-l*8);o.li=2.5*env+3*Math.exp(-l*6);}
    o.ia=ia; o.c.copy(TC); o.shake=0; o.dist=0.4; o.flash=0.6;
    o.em=Math.max(0.18*env,0.4*pois*(0.75+0.25*Math.sin(te*18)));
    if(pois>0)o.emc.setRGB(0.55,1,0.22); else o.emc.copy(U.uC1.value);
  };
}});

// =====================================================================
// RUGIDO (0,9 s, nivel 3 con temblor suave) — ondas concéntricas en cono desde la boca del lanzador hacia el
//   objetivo, polvo levantado a su paso. cfg.push 0|1|2 (retrocede + flechas y arrastre), cfg.taunt (aro rojo
//   sobre el lanzador), cfg.stun (estrellas sobre la cabeza del objetivo)
// =====================================================================
VFX.basic.RUGIDO=(()=>{
  const TW=[0.12,0.18,0.24,0.3], SPD=26, MT=V3(TC.x-0.2,TC.y,0), CL=MO.distanceTo(MT), TI=+(TW[0]+CL/SPD).toFixed(3);
  return factory({key:"basic_rugido",name:"Rugido",pal:"Tierra",dur:0.9,ti:TI,tier:3,
  phases:[["Inspira",0],["Rugido",0.12],["Impacto",TI],["Eco",0.55]],
  flags:c=>({push:Math.max(0,Math.min(2,Math.round(+c.push||0))),taunt:!!c.taunt,stun:!!c.stun}),
  variants:[["normal","Normal",{}],["empuje","Empuje",{push:1}],["provoca","Provoca",{push:1,taunt:true}],
    ["furia","Empuje 2 + provoca",{push:2,taunt:true}],["aturde","Aturde",{push:1,stun:true}]],
build(a,opt){
  const L=a.L,TE=0.9,RW=1.35;
  const slideT=P=>0.2+0.08*P;
  // cono de sonido: anillos que viajan por su superficie (vP.x = distancia desde la boca)
  const cone=new THREE.Mesh(new THREE.ConeGeometry(RW,CL,56,1,true).rotateZ(Math.PI/2).translate(CL/2,0,0),fxU(`uniform vec4 uW;uniform float uQ;
  float wv(float w,float x,float an){if(w<0.)return 0.;float k=clamp(w/${f(CL)},0.,1.);
   return band(x,w,.16+.3*k)*(1.-.65*k)*smoothstep(${f(CL+0.6)},${f(CL-0.4)},w)*(.65+.35*noise(vec3(an*2.5,x*1.5,uT*7.)));}
  void main(){float x=vP.x;float an=atan(vP.z,vP.y);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
   float m=wv(uW.x,x,an)+wv(uW.y,x,an)+wv(uW.z,x,an)+wv(uW.w,x,an);
   float st=smoothstep(.6,.9,noise(vec3(x*1.2-uT*14.,an*3.,0.)))*uQ*.25*smoothstep(${f(CL)},${f(CL*0.4)},x);
   float a=(m*(.3+.7*fr)+st*fr)*smoothstep(0.,.5,x)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,clamp(m,0.,1.))*1.5+vec3(1.)*smoothstep(.8,1.4,m)*.35,a);}`,{uW:{value:new THREE.Vector4(-1,-1,-1,-1)},uQ:{value:0}}));
  cone.position.copy(MO); cone.rotation.z=Math.atan2(MT.y-MO.y,MT.x-MO.x); L.trail.add(cone);
  // anillos que nacen en la boca
  const mouth=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),fx(RING_FS));L.mesh.add(m);return m;});
  const feet=groundPlane(3.2,-3.7,0.03,fx(RING_FS)), shock=groundPlane(3.0,TX,0.03,fx(RING_FS));
  L.decal.add(feet,shock);
  const C=`const float TW0=${f(TW[0])};const float SPD=${f(SPD)};const float TI=${f(TI)};const vec3 MO=${v3(MO)};`;
  // polvo que levanta el frente de la onda a lo largo del pasillo
  a.count+=points(L.part,140,C+`void main(){float x=MO.x+.6+aSeed.x*${f(TX-0.6-MO.x-0.3)};float k=(x-MO.x)/${f(CL)};
   float s=TW0+(x-MO.x)/SPD+aSeed.y*.06;float life=.35+aSeed.z*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(x+1.4*t,.06+.6*t*(.5+aSeed.w),(aSeed.w-.5)*2.*(.3+k*1.1));
   vA=(age>0.&&age<1.)?smoothstep(0.,.12,age)*(1.-age)*.75:0.;put(p,(.16+.16*aSeed.y)*(.5+age));}`,DUST_FS,NB);
  // polvo en los pies del lanzador
  a.count+=points(L.part,50,C+`void main(){float s=TW0+aSeed.x*.05;float life=.4+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7,.06,0.)+vec3(cos(an),0.,sin(an))*(.35+.9*(1.-exp(-t*5.)))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.18+.14*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // líneas de viento que salen de la boca hacia el objetivo
  a.count+=sparks(L.part,80,TW[0]+0.01,`${f(MO.x+0.15)},${f(MO.y)},0.`,"5.,-.25,0.",8,10,0.3);
  a.count+=sparks(L.part,60,TI,`${f(TC.x)},${f(TC.y)},0.`,".6,.4,0.",2,6,2);

  // ---- empuje: flechas en el suelo (1 o 2 chevrones), arrastre y polvo en los pies durante el retroceso
  const Pu={value:0}, G=opt("push");
  const arrow=groundPlane(2.2,0,0.032,fxU(`uniform float uN;
   void main(){vec2 p=(vUv-.5)*vec2(2.2,1.4);float m=0.;
    for(int i=0;i<2;i++){float fi=float(i);float x0=.75-fi*.6;float on=step(fi,uN-.5);
     float d=abs(p.x-(x0-abs(p.y)*.75));m=max(m,smoothstep(.1,.035,d)*step(abs(p.y),.5)*on);}
    float sw=.6+.4*sin(p.x*6.-uT*20.);
    gl_FragColor=vec4(mix(uC1,vec3(1.),.4)*1.6,m*sw*uA);}`,{uN:{value:1}}),1.4);
  const drag=new THREE.Mesh(new THREE.PlaneGeometry(1,1.0).translate(-0.5,0,0).rotateX(-Math.PI/2),fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*8.,v*6.,1.));float st=smoothstep(.45,.8,noise(vec3(u*3.,v*14.,2.)));
   gl_FragColor=vec4(mix(uC2,uC1,st)*1.2,(st*.7+.15)*smoothstep(1.,.3,v)*u*uA*(.7+.3*n));}`));
  G.decal.add(arrow,drag);
  G.n+=points(G.part,50,C+`uniform float uPu;void main(){float dur=.2+.08*uPu;float s=TI+aSeed.x*dur;float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=clamp((s-TI)/dur,0.,1.);float x=${f(TX)}+uPu*(1.-pow(1.-k,3.));
   vec3 p=vec3(x-.3,.05,(aSeed.w-.5)*.8)+vec3(-.5*t,.45*t,(aSeed.z-.5)*.4*t);
   vA=(uPu>0.&&age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.15+.13*aSeed.y)*(.6+age));}`,DUST_FS,Object.assign({uniforms:puni({uPu:Pu})},NB));

  // ---- provocación: aro rojo sobre la cabeza del lanzador (rojo fijo: amenaza) y motas rojas
  const T=opt("taunt");
  const taunt=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2).rotateX(-Math.PI/2),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.62,.05)+band(r,.62,.2)*.3;
   float sp=fract(an/6.2832*8.+uT*.6);float spike=smoothstep(.2,0.,abs(sp-.5)*2.-(1.-(r-.7)/.22)*.5)*step(.7,r)*step(r,.92);
   m+=spike*.9+band(r,.45,.012)*.6;
   gl_FragColor=vec4(${TAUNT}*1.6+vec3(1.,.6,.4)*band(r,.62,.018)*.6,m*uA*(.85+.15*sin(uT*30.)));}`));
  T.mesh.add(taunt);
  T.n+=points(T.part,36,C+`void main(){float s=.4+aSeed.x*.06;float life=.22+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7,2.18,0.)+vec3(cos(an)*(.3+.9*t),.3*t+(aSeed.w-.5)*.1,sin(an)*(.3+.9*t));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.03+.03*aSeed.w);}`,DOT_FS(TAUNT));

  // ---- aturdimiento: estrellas amarillas que orbitan la cabeza del objetivo (siguen su retroceso)
  const S=opt("stun");
  S.n+=points(S.part,7,C+`void main(){float an=aSeed.x*6.2832+uT*5.;float t=uT-TI-.06;
   vec3 p=vec3(cos(an)*.42,1.98+sin(an*2.+uT*3.)*.05,sin(an)*.42);
   float on=smoothstep(0.,.08,t);vA=on;put(p,(.17+.04*sin(uT*14.+aSeed.y*9.))*on);}`,STAR4_FS.replace("mix(uC1,vec3(1.),.5+.5*c)",`mix(${STUNY},vec3(1.),.3+.5*c)`));
  S.n+=points(S.part,30,C+`void main(){float an=aSeed.x*6.2832+uT*(2.+aSeed.y*2.);float rad=.3+aSeed.z*.35;float t=uT-TI-.06;
   vec3 p=vec3(cos(an)*rad,1.95+(aSeed.w-.5)*.35,sin(an)*rad);
   float tw=pow(.5+.5*sin(uT*(8.+aSeed.y*8.)+aSeed.z*40.),5.);vA=t>0.?tw:0.;put(p,(.04+.05*aSeed.w)*tw);}`,DOT_FS(STUNY));

  a.pose=function(te,o){
    const ia=te-TI, P=a.o.push, sd=slideT(P);
    Pu.value=P; arrow.material.uniforms.uN.value=P;
    // el lanzador inspira (se echa atrás) y ruge hacia delante, con el pecho hinchado
    const roar=ss(TW[0]-0.02,TW[0]+0.03,te)*(1-ss(0.42,0.6,te));
    caster.rotation.z=0.16*ss(0,TW[0],te)-0.32*ss(TW[0],TW[0]+0.05,te)+0.16*ss(0.38,0.7,te)+0.012*roar*Math.sin(te*70);
    caster.scale.set(1+0.05*roar,1+0.03*roar-0.04*ss(0,TW[0],te)*(1-roar),1+0.05*roar);
    const cm=caster.userData.m;
    // ondas
    const w=TW.map(t=>te>=t?(te-t)*SPD:-1);
    cone.material.uniforms.uW.value.set(w[0],w[1],w[2],w[3]); cone.material.uniforms.uQ.value=roar;
    cone.visible=te>=TW[0]&&te<0.7; cone.material.uniforms.uA.value=1-ss(0.5,0.7,te);
    mouth.forEach((m,i)=>{const p=cl((te-TW[i])/0.2);towardCam(m.position,MO,0.25);m.position.x+=0.15+0.4*p;billboard(m);
      m.visible=te>=TW[i]&&p<1;m.scale.setScalar(0.4+1.1*p);set(m,p,(1-p)*0.9);});
    let p=cl((te-TW[0])/0.4); set(feet,1-Math.pow(1-p,2),te>=TW[0]?0.6*(1-p):0);
    // objetivo: golpe de la onda y retroceso de P casillas
    const slide=P*easeO(ia/sd), hit=hitK(ia,7);
    target.position.x=TX+slide+hit*(P?0:0.12); target.rotation.z=-hit*0.22*Math.cos(ia*16)-(P&&ia>=0&&ia<sd?0.12*Math.sin(Math.PI*ia/sd):0);
    const tx=target.position.x;
    p=cl(ia/0.4); shock.position.x=tx; set(shock,1-Math.pow(1-p,2),ia>=0?0.7*(1-p):0);
    // flechas y arrastre (siguen al objetivo)
    const pa=ia>=0?ss(0,0.05,ia)*(1-ss(0.75,TE,te)):0;
    arrow.position.x=tx+0.25; set(arrow,0,pa);
    drag.position.set(tx,0.028,0); drag.scale.set(Math.max(slide,0.001),1,1); drag.visible=slide>0.01; set(drag,0,pa*0.8);
    // estados
    const ta=te>=0.4?ss(0.4,0.45,te):0;
    taunt.position.set(-3.7,2.2+0.03*Math.sin(te*12),0); taunt.rotation.y=te*2.2;
    taunt.scale.setScalar(1+0.6*(te>=0.4?Math.exp(-(te-0.4)*16):0)); taunt.material.uniforms.uA.value=ta;
    if(a.o.taunt){cm.emissive.setRGB(1,0.2,0.14);cm.emissiveIntensity=te>=0.4?0.22+0.4*Math.exp(-(te-0.4)*12):0.25*roar;}
    else{cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=0.25*roar;}
    S.part.position.x=tx-TX;
    if(a.o.stun&&ia>0.06)target.rotation.z+=0.06*Math.sin(te*9)*ss(TI+0.06,TI+0.15,te);
    // luz y resplandor: boca durante el rugido, objetivo al impacto
    if(te<TW[0]){const k=ss(0,TW[0],te);o.g.copy(MO);o.gs=0.5*k;o.ga=0.15*k;o.li=1*k;}
    else if(te<TI){o.g.copy(MO).x+=0.3;o.gs=1.2;o.ga=0.4;o.li=4;}
    else{o.g.set(tx-0.2,1.1,0.1);o.gs=1.2+2*Math.min(ia,0.5);o.ga=0.5*Math.exp(-ia*9);o.li=6*Math.exp(-ia*6);}
    o.ia=ia; o.c.set(tx-0.2,1.15,0); o.shake=0.3; o.dist=0.8; o.flash=0.8;
  };
}});})();

// =====================================================================
// AUTOBUFF (0,9 s) — aro en el suelo y columna de energía que sube por el lanzador; destello final de
//   potenciado. cfg.shield: además se arma una cúpula hexagonal alrededor del lanzador
// =====================================================================
VFX.basic.AUTOBUFF=factory({key:"basic_autobuff",name:"Potenciar",pal:"Hielo",dur:0.9,ti:0.45,tier:2,
  phases:[["Carga",0],["Columna",0.08],["Potenciado",0.45],["Disipación",0.62]],
  flags:c=>({shield:!!c.shield}),
  variants:[["normal","Normal",{},"Hielo"],["escudo","Con escudo",{shield:true},"Salvaje"]],
build(a,opt){
  const L=a.L,T0=0.08,TI=0.45,TE=0.9,CX=-3.7;
  const F=anchor(a); moveF(F,CX,0);
  const ring=groundPlane(2.8,0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
   float R=.62+.25*uP;
   float m=band(r,R,.035)+band(r,R,.16)*.25+band(r,R*.72,.012)*.7;
   float seg=fract(an*10.+uT*.6);float chev=smoothstep(.06,0.,abs(r-(R+.14)+abs(seg-.5)*.25))*step(abs(seg-.5),.3);
   m+=chev*.9;m*=step(r,1.);
   gl_FragColor=vec4(mix(uC2,uC1,.65)*1.5+vec3(1.)*band(r,R,.012)*.5,m*uA);}`));
  const shock=groundPlane(4.2,0,0.03,fx(RING_FS)); F.decal.add(ring,shock);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.72,2.6,40,1,true),fx(COL_FS(2.6))); col.position.y=1.3;
  const ribs=new THREE.Group(), ribMat=fx(RIB_FS); ribs.position.y=0.05;
  for(let i=0;i<2;i++){const m=new THREE.Mesh(helixGeo(1.5,0.8,0.42,2.3,0.12,100),ribMat);m.rotation.y=i*Math.PI;ribs.add(m);}
  F.mesh.add(col); F.trail.add(ribs);
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),fx(FLASH_FS,{depthTest:false})), halo=new THREE.Mesh(new THREE.PlaneGeometry(3,3),fx(RING_FS,{depthTest:false}));
  L.mesh.add(flash,halo);
  const C=`const float T0=${f(T0)};const float TI=${f(TI)};`;
  // motas que suben en espiral y se cierran hacia el cuerpo
  a.count+=points(F.part,140,C+`void main(){float s=aSeed.x*(TI-.1);float life=.3+aSeed.y*.2;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*3.;float rad=mix(1.1,.35,age);
   vec3 p=vec3(cos(an)*rad,.05+age*(1.6+aSeed.w),sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.045*aSeed.w);}`);
  // chevrones de mejora que suben tras el destello
  a.count+=points(F.part,30,C+`void main(){float s=TI-.15+aSeed.x*.35;float life=.35+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(cos(an)*(.55+.2*aSeed.w),.2+aSeed.w*.8+t*2.2,sin(an)*(.55+.2*aSeed.w));
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.2+.08*aSeed.y);}`,CHEVRON_FS);
  a.count+=sparks(F.part,80,TI,"0.,1.,0.","0.,.9,0.",3,7,1.5);
  // destellos de potenciado que quedan alrededor
  a.count+=points(F.part,30,C+`void main(){float s=TI+aSeed.x*.3;float life=.2+aSeed.y*.15;float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=vec3(r.x*.6,.3+aSeed.w*1.5,r.z*.6);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.08*aSeed.z);}`,STAR4_FS);

  // ---- escudo: cúpula hexagonal sobre el lanzador al potenciarse
  const G=opt("shield"), dm=dome(1.3,0.45,0.68); G.mesh.add(dm);
  G.n+=points(G.part,40,C+`varying float vR;void main(){float s=.7+aSeed.x*.15;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()+vec3(0.,.6,0.));vec3 p=vec3(0.,.45,0.)+d*1.3+vec3(0.,.6*t,0.);vR=aSeed.z*6.;
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.12+.06*aSeed.w);}`,HEXP_FS);

  const fp=V3(CX,1.0,0);
  a.pose=function(te,o){
    const ia=te-TI, up=cl((te-T0)/(TI-T0-0.03)), env=1-ss(0.6,TE,te);
    // el lanzador se agacha, se yergue con la columna y da un golpe de escala al potenciarse
    const pop=ia>=0?0.07*Math.exp(-ia*9)+0.03*env:0;
    caster.scale.set(1+pop,1-0.05*ss(0,T0,te)*(1-ss(T0,TI,te))+pop,1+pop);
    caster.rotation.z=0.02*Math.sin(te*30)*ss(T0,TI,te)*(1-ss(TI,TI+0.1,te));
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*up*(ia<0?1:0)+(ia>=0?0.9*Math.exp(-ia*7)+0.22*env:0);
    set(ring,ss(0,TI,te),ss(0,0.1,te)*env);
    let p=cl(ia/0.45); set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
    col.visible=te>T0&&te<0.75; set(col,up,ss(T0,T0+0.06,te)*(1-ss(TI,0.72,te))*(1+0.6*hitK(ia,10)));
    ribs.rotation.y=te*4; set({material:ribMat},up*1.05,ss(T0,T0+0.06,te)*(1-ss(TI+0.02,TI+0.2,te)));
    p=cl(ia/0.22); towardCam(flash.position,fp,0.6); billboard(flash,te*1.5); flash.visible=ia>=0&&p<1; flash.scale.setScalar(0.6+0.8*p); set(flash,p,1-p);
    p=cl(ia/0.3); towardCam(halo.position,fp,0.5); billboard(halo); halo.visible=ia>=0&&p<1; set(halo,p,(1-p)*0.85);
    const du=dm.material.uniforms, sh=ss(TI-0.04,TI+0.14,te);
    du.uP.value=sh*1.05; du.uF.value=hitK(te-TI-0.14,9); du.uD.value=ss(0.68,TE,te); du.uA.value=sh>0?1:0; dm.visible=sh>0.001;
    if(te<TI){o.g.set(CX,0.3+1.6*up,0);o.gs=0.8+0.4*up;o.ga=0.25*up;o.li=1+2.5*up;}
    else{o.g.copy(fp);o.gs=1.4+2*Math.min(ia,0.4);o.ga=0.55*Math.exp(-ia*8)+0.08*env;o.li=6*Math.exp(-ia*6)+1*env;}
    o.ia=ia; o.c.copy(fp); o.shake=0; o.dist=0.35; o.flash=0;
  };
}});

// =====================================================================
// ESCUDO (0,8 s) — protección que se forma alrededor del receptor y se desvanece dejando un brillo.
//   cfg.self:true → el lanzador; si no, VFX.allies[0] (allies:1). cfg.style 'hex' (cúpula hexagonal) | 'corteza'
//   (placas de madera que vuelan, encajan y se deshacen en brasas)
// =====================================================================
const BARK_FS=`uniform float uD;uniform float uL;uniform float uQ;
void main(){vec3 N=normalize(vN),V=normalize(vV);
 float an=atan(vP.x,vP.z);
 float g=noise(vec3(an*9.,vP.y*2.5,uQ))*.6+noise(vec3(an*26.,vP.y*7.,uQ+3.))*.4;
 float ridge=pow(1.-abs(fract(an*7.+g*.8)*2.-1.),3.);
 vec3 wood=mix(uC2*.45,mix(uC2,uC1,.55),ridge*.8+g*.3);
 float lit=.45+.55*max(0.,dot(N,normalize(vec3(.3,.8,.5))));
 float fr=pow(1.-abs(dot(N,V)),2.);
 float edge=max(max(smoothstep(.1,0.,vUv.y),smoothstep(.9,1.,vUv.y)),max(smoothstep(.07,0.,vUv.x),smoothstep(.93,1.,vUv.x)));
 float n=noise(vP*7.+vec3(uQ));float th=uD*1.1-.05;if(n<th)discard;
 float burn=smoothstep(.12,0.,n-th)*step(.001,uD);
 vec3 c=wood*lit*(1.-edge*.35)+uC1*(fr*.35+edge*uL*.9+uL*.2)+(uC1*1.4+.3)*burn;
 gl_FragColor=vec4(c,1.);}`;
VFX.basic.ESCUDO=factory({key:"basic_escudo",name:"Escudo",pal:"Sagrado",dur:0.8,ti:0.35,tier:2,
  phases:[["Invocación",0],["Formación",0.08],["Sellado",0.35],["Brillo",0.5]],
  allies:o=>o.self?0:1,
  flags:c=>({self:!!c.self,hex:c.style!=="corteza",corteza:c.style==="corteza"}),
  variants:[["hex","Hexágonos",{hex:true,corteza:false,self:false},"Sagrado"],["corteza","Corteza",{hex:false,corteza:true,self:false},"Madera"],
    ["propio","Sobre sí",{hex:true,corteza:false,self:true},"Baba"]],
build(a,opt){
  const L=a.L,T0=0.08,TI=0.35,TF=0.5,TE=0.8,AP=ALLY_POS[0];
  const F=anchor(a);
  const glyph=groundPlane(2.6,0,0.02,fx(GLYPH_FS)), shock=groundPlane(3.6,0,0.03,fx(RING_FS)); F.decal.add(glyph,shock);
  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const float TF=${f(TF)};`;
  // chispas que se reúnen alrededor del receptor mientras se forma
  a.count+=points(F.part,70,C+`void main(){float s=aSeed.x*(TI-.12);float life=.18+aSeed.y*.1;float age=(uT-s)/life;
   vec3 d=normalize(rnd()*vec3(1.,.7,1.)+vec3(0.,.4,0.));vec3 p=vec3(0.,.8,0.)+d*mix(1.9,1.1,age*age);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.04*aSeed.z);}`);
  // brillo residual: destellos que suben por el cuerpo al desvanecerse
  a.count+=points(F.part,40,C+`void main(){float s=TF+aSeed.x*.25;float life=.2+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(r.x*.5,.2+aSeed.w*1.4+t*.8,r.z*.5);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.06*aSeed.z);}`,STAR4_FS);

  // ---- hexágonos: cúpula que se arma de abajo arriba, destella al sellar y se disuelve de arriba abajo
  const H=opt("hex"), dm=dome(1.4,0.45,0.68); H.mesh.add(dm);
  H.n+=points(H.part,50,C+`varying float vR;void main(){vec3 d=normalize(rnd()+vec3(0.,.5,0.));float hN=d.y*.5+.5;
   float s=TF+(1.-hN)*.18+aSeed.x*.06;float life=.25+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(0.,.45,0.)+d*1.4*(1.+.15*t)+vec3(0.,.5*t,0.);vR=aSeed.z*6.;
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.13+.06*aSeed.w);}`,HEXP_FS);

  // ---- corteza: ocho placas de madera vuelan desde fuera, encajan alrededor del cuerpo y se deshacen en brasas
  const K=opt("corteza"), barkMat=fxU(BARK_FS,{uD:{value:0},uL:{value:0},uQ:{value:2.7}},SOLID2), plates=[], R=rng(5);
  for(let row=0;row<2;row++)for(let i=0;i<4;i++){
    const mid=i*Math.PI/2+row*Math.PI/4+0.2, len=1.45, y=0.42+row*0.55;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.6-row*0.04,0.64-row*0.04,0.56,8,1,true,mid-len/2,len),barkMat);
    K.mesh.add(m); plates.push({m,dir:V3(Math.sin(mid),0,Math.cos(mid)),y,t:T0+0.03+(row*4+i)/8*0.18+R()*0.03,spin:(R()-0.5)*3});
  }
  K.n+=points(K.part,60,C+`void main(){float s=TI-.08+aSeed.x*.12;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=normalize(vec3(cos(an),.8+aSeed.w,sin(an)));
   vec3 p=vec3(cos(an)*.62,.25+aSeed.w*.9,sin(an)*.62)+d*(1.2+1.4*aSeed.w)*t+vec3(0.,-5.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age:0.;put(p,.04+.04*aSeed.y);}`,CHIP_FS,NB);
  K.n+=points(K.part,50,C+`void main(){float s=TF+aSeed.x*.2;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(cos(an)*.62,.2+aSeed.w*1.,sin(an)*.62)+vec3(cos(an)*.3*t,.9*t,sin(an)*.3*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*40.+aSeed.x*30.)):0.;put(p,.03+.03*aSeed.w);}`);

  a.pose=function(te,o){
    const ia=te-TI, self=a.o.self, rx=self?-3.7:AP.x, rz=self?0:AP.z, rec=self?caster:allies[0];
    moveF(F,rx,rz);
    // el lanzador alza el gesto (o se cubre si es para sí)
    caster.rotation.z=0.1*ss(0,T0,te)-0.16*ss(T0,T0+0.06,te)+0.06*ss(T0+0.1,TI+0.2,te);
    const env=ss(0.02,0.12,te)*(1-ss(TF+0.1,TE,te));
    set(glyph,ss(0,TI,te),env*0.9);
    let p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?0.75*(1-p):0);
    // hex
    const du=dm.material.uniforms;
    du.uP.value=ss(T0,TI,te)*1.05; du.uF.value=hitK(ia,9); du.uD.value=ss(TF,TE-0.04,te); du.uA.value=1; dm.visible=te>T0;
    dm.scale.setScalar(1+0.04*hitK(ia,10));
    // corteza: cada placa entra con giro y encaja con un pequeño rebote
    for(const q of plates){const k=cl((te-q.t)/0.14),g=back(k),off=(1-g)*1.3;
      q.m.visible=te>q.t; q.m.position.set(q.dir.x*off,(1-g)*0.6,q.dir.z*off); q.m.rotation.y=(1-k)*q.spin;}
    barkMat.uniforms.uL.value=hitK(ia,8)*1.2+0.15; barkMat.uniforms.uD.value=ss(TF,TE-0.03,te);
    // brillo del receptor: destello al sellar y resplandor que se apaga
    const rm=rec.userData.m; rm.emissive.copy(U.uC1.value); rm.emissiveIntensity=ia>=0?0.6*Math.exp(-ia*8)+0.3*(1-ss(TF,TE,te)):0.15*ss(T0,TI,te);
    const cy=0.85;
    if(te<TI){const k=ss(0,TI,te);o.g.set(rx,cy,rz);o.gs=1+1.2*k;o.ga=0.25*k;o.li=1.5+2*k;}
    else{o.g.set(rx,cy,rz);o.gs=2.2+1.5*Math.min(ia,0.3);o.ga=0.45*Math.exp(-ia*8)+0.1*env;o.li=5*Math.exp(-ia*6)+1.2*env;}
    o.ia=ia; o.c.set(rx,cy,rz); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// =====================================================================
// CURA (0,9 s) — un hilo de luz va del lanzador al aliado; partículas ascendentes, columna suave y una
//   cruz de cuatro hojas sobre su cabeza. cfg.cleanse: anillo que barre de pies a cabeza y expulsa motas oscuras
//   (el número de curación lo pone la UI del juego)
// =====================================================================
VFX.basic.CURA=factory({key:"basic_cura",name:"Cura",pal:"Sagrado",dur:0.9,ti:0.4,tier:2,allies:()=>1,
  phases:[["Invocación",0],["Flujo",0.05],["Sanación",0.4],["Disipación",0.62]],
  flags:c=>({cleanse:!!c.cleanse}),
  variants:[["normal","Normal",{},"Sagrado"],["purifica","Purifica",{cleanse:true},"Agua"]],
build(a,opt){
  const L=a.L,TS=0.05,TI=0.4,TD=0.62,TE=0.9,AP=ALLY_POS[0],Q0=V3(-3.4,1.4,0.1),QM=V3(-2.7,2.5,-0.7),Q1=V3(AP.x,1.25,AP.z);
  const F=anchor(a); moveF(F,AP.x,AP.z);
  const GL=`mix(uC1,${HEALG},.35)`;
  const glyph=groundPlane(2.6,0,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.9,.02)+band(r,.8,.01);
   float pet=abs(cos(an*3.+uT*.8));m+=band(r,.6*pet,.02)*step(r,.78);
   m+=smoothstep(.3,0.,r)*.2*uP;
   gl_FragColor=vec4(mix(uC2,${GL},1.-r*.5)*1.4,m*uA);}`)), ring=groundPlane(3.2,0,0.03,fx(RING_FS));
  F.decal.add(glyph,ring);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.66,2.6,36,1,true),fx(COL_FS(2.6))); col.position.y=1.3; F.mesh.add(col);
  // cruz de cuatro hojas sobre la cabeza
  const cross=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95),fx(`void main(){vec2 p=(vUv-.5)*2.;float m=0.;
   for(int i=0;i<4;i++){float an=float(i)*1.5708;vec2 q=vec2(cos(an)*p.x+sin(an)*p.y,-sin(an)*p.x+cos(an)*p.y);
    q.x-=.44;float w=.21*(1.-pow(q.x/.4,2.));
    float leaf=smoothstep(.035,-.02,abs(q.y)-max(w,0.))*step(abs(q.x),.4);
    float rib=smoothstep(.025,0.,abs(q.y))*step(abs(q.x),.36);
    m=max(m,leaf*(.7+.3*rib));}
   float r=length(p);float core=smoothstep(.22,0.,r);float halo=smoothstep(1.,0.,r)*.22;
   vec3 c=mix(${GL},vec3(1.),core*.6+uP*.3)*1.4;
   gl_FragColor=vec4(c,(m+core+halo)*uA);}`,{depthTest:false}));
  const burst=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),fx(RING_FS,{depthTest:false})); L.mesh.add(cross,burst);
  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 Q0=${v3(Q0)};const vec3 QM=${v3(QM)};const vec3 Q1=${v3(Q1)};
  vec3 bz(float u){return mix(mix(Q0,QM,u),mix(QM,Q1,u),u);}`;
  // hilo de luz del lanzador al aliado
  a.count+=points(L.part,80,C+`void main(){float s=TS+aSeed.x*.22;float u=(uT-s)/.14;float t=max(uT-s-.14,0.);
   vec3 r=rnd();vec3 p=bz(clamp(u,0.,1.))+r*.06*sin(clamp(u,0.,1.)*3.14159)+r*.25*t;
   vA=(u>0.&&uT<s+.3)?(u<1.?smoothstep(0.,.15,u):1.-t/.16):0.;put(p,(.04+.05*aSeed.z));}`);
  // partículas que ascienden en espiral alrededor del aliado
  a.count+=points(F.part,150,C+`void main(){float s=TI-.12+aSeed.x*.4;float life=.4+aSeed.y*.25;float age=(uT-s)/life;
   float an=aSeed.z*6.2832+age*4.;float rad=.7-.3*age;
   vec3 p=vec3(cos(an)*rad,.08+age*(1.8+aSeed.w*.6),sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.045*aSeed.w);}`);
  a.count+=points(F.part,16,C+`void main(){float s=TI+aSeed.x*.2;float life=.3+aSeed.y*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(r.x*.6,.4+aSeed.w*1.1+t*1.3,r.z*.6);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.15+.06*aSeed.y);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);
   float cr=max(smoothstep(.12,.07,q.x)*smoothstep(.42,.35,q.y),smoothstep(.12,.07,q.y)*smoothstep(.42,.35,q.x));
   float a=(cr+smoothstep(.5,0.,length(gl_PointCoord-.5))*.2)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(${GL},vec3(1.),cr*.4)*1.4,a);}`);

  // ---- purificar: anillo blanco que sube y motas oscuras arrancadas del cuerpo que estallan en luz
  const P=opt("cleanse");
  const scan=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9).rotateX(-Math.PI/2),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float m=band(r,.7,.05)+band(r,.7,.22)*.35;gl_FragColor=vec4(mix(uC1,vec3(1.),.7)*1.5,m*uA);}`)); P.mesh.add(scan);
  const DK=`vec3 r=rnd();float an=aSeed.z*6.2832;vec3 b=vec3(cos(an)*.25,.3+aSeed.w*1.2,sin(an)*.25);
   vec3 d=normalize(vec3(cos(an),.6+aSeed.y,sin(an)));`;
  P.n+=points(P.part,40,C+`void main(){${DK}float s=TI+aSeed.w*.12;float t=uT-s;float k=clamp(t/.2,0.,1.);
   vec3 p=b+d*.9*(1.-pow(1.-k,2.));
   vA=(t>0.&&t<.2)?smoothstep(0.,.05,t)*.9:0.;put(p,.09+.06*aSeed.x);}`,HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float n=noise(vec3(q*6.,vMix*9.));
   float a=smoothstep(.5,.2,d+(n-.5)*.2)*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(.16,.08,.22)*(.7+.6*n),a);}`,NB);
  P.n+=points(P.part,40,C+`void main(){${DK}float s=TI+aSeed.w*.12+.2;float life=.18+aSeed.x*.1;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=b+d*.9+r*.35*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.1+.06*aSeed.y)*(1.-age*.5));}`,STAR4_FS.replace("mix(uC1,vec3(1.),.5+.5*c)","vec3(1.,.97,.9)"));

  const AC=V3(AP.x,1.1,AP.z), HD=V3(AP.x,2.2,AP.z);
  a.pose=function(te,o){
    const ia=te-TI, env=ss(0.12,0.25,te)*(1-ss(TD+0.05,TE,te));
    caster.rotation.z=0.08*ss(0,TS,te)-0.15*ss(TS,TS+0.06,te)+0.07*ss(0.15,0.45,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*ss(0,0.05,te)*(1-ss(0.1,0.3,te));
    set(glyph,ia>=0?1:ss(0.15,TI,te),env);
    let p=cl(ia/0.4); set(ring,p,ia>=0?0.8*(1-p):0);
    col.visible=te>0.25&&te<0.8; set(col,ss(0.25,TI+0.05,te),ss(0.25,0.32,te)*(1-ss(TI+0.1,0.78,te))*0.8);
    // cruz de hojas: aparece con un golpe de escala sobre la cabeza, sube y se apaga
    const ca=ss(TI-0.06,TI+0.02,te)*(1-ss(TD+0.02,0.85,te));
    towardCam(cross.position,tmp.copy(HD).add(tmp2.set(0,0.25*ss(TI,TE,te),0)),0.4); billboard(cross,0.08*Math.sin(te*6));
    cross.visible=ca>0.001; cross.scale.setScalar(1+0.35*hitK(ia,12)); set(cross,hitK(ia,8),ca);
    p=cl(ia/0.32); towardCam(burst.position,AC,0.5); billboard(burst); burst.visible=ia>=0&&p<1; set(burst,p,(1-p)*0.8);
    // purificar: el anillo barre al aliado de pies a cabeza
    const sc=ss(TI-0.02,TI+0.25,te); scan.position.y=0.05+2.0*sc; scan.scale.setScalar(1-0.3*sc); scan.visible=te>TI-0.02&&te<TI+0.3;
    scan.material.uniforms.uA.value=1-ss(TI+0.18,TI+0.28,te);
    const al=allies[0].userData.m; const c1=U.uC1.value; al.emissive.setRGB(0.225+0.5*c1.r,0.5+0.5*c1.g,0.3+0.5*c1.b);
    al.emissiveIntensity=ia>=0?0.75*Math.exp(-ia*7)+0.2*env+(a.o.cleanse?0.35*Math.exp(-Math.max(ia-0.2,0)*10)*(ia>0.2?1:0):0):0.15*ss(0.2,TI,te);
    if(te<0.3){const u=cl((te-TS)/0.25);bez(Q0,QM,Q1,u,o.g);o.gs=0.7;o.ga=0.3;o.li=2.5;}
    else if(te<TI){o.g.copy(AC);o.gs=1.4;o.ga=0.25;o.li=2.5;}
    else{o.g.copy(AC);o.gs=1.6+2*Math.min(ia,0.3);o.ga=0.5*Math.exp(-ia*8)+0.08*env;o.li=5*Math.exp(-ia*5)+1*env;}
    o.ia=ia; o.c.copy(AC); o.shake=0; o.dist=0.3; o.flash=0;
  };
}});

// ---------- demos por tipo ----------
const B=VFX.basic;
VFX.module("Básicos · Control y apoyo",[
  B.ESPINAS({key:"basic_espinas",name:"Espinas",pal:"Naturaleza",demo:true}),
  B.ENREDO({key:"basic_enredo",name:"Enredo",pal:"Naturaleza",demo:true}),
  B.NUBE_ESPORAS({key:"basic_nube_esporas",name:"Nube de esporas",pal:"Esporas",demo:true}),
  B.RUGIDO({key:"basic_rugido",name:"Rugido",pal:"Tierra",demo:true}),
  B.AUTOBUFF({key:"basic_autobuff",name:"Potenciar",pal:"Hielo",demo:true}),
  B.ESCUDO({key:"basic_escudo",name:"Escudo",pal:"Sagrado",demo:true}),
  B.CURA({key:"basic_cura",name:"Cura",pal:"Sagrado",demo:true}),
]);
})();

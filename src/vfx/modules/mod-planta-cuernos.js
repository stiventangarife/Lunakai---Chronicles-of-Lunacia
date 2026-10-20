// =====================================================================
// MÓDULO · CLASE PLANTA (CUERNOS)
// Estética vegetal: bambú, roble, cítricos, caqui, rosas, fresa, sandía y cactus. No se dibujan cuernos:
// los efectos que "nacen de la cabeza" arrancan en la zona de las puntas (≈ x −3.55, y 2.05) sin malla anatómica.
// Cada curación/escudo tiene su propio material y ritmo: zumo burbujeante (Mandarine), gelatina que tiembla
// (Persimmon), flor que se abre (Rose Bud), crema que desciende (Shortcake) y jaula de ramas (Beech).
// Contrato: {key,name,dur,ti,phases,pal} + build(a) → piezas en a.L.* y a.pose(te,o), función pura del tiempo.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,RING_FS,camera,caster,target,allies,ALLY_POS,helixGeo}=VFX;
const {NB,SOLID,v3,CHIP_FS,DUST_FS,STAR4_FS,HEART_FS,billboard,towardCam,taperTube,tileFractureFS}=VFX.lib;
VFX.palette("Roble",["#6dffae","#0b8f4f"]);
VFX.palette("Fresa",["#ffb3cf","#ff3d6e"]);
VFX.palette("Sandía",["#ff5470","#2e9e46"]);

const TC=V3(3.15,1.2,0);                                   // pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0), XA=V3(1,0,0), YA=V3(0,1,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const DS=Object.assign({},SOLID,{side:THREE.DoubleSide});
const LIT=`(.45+.55*max(0.,dot(normalize(vN),normalize(vec3(.3,.8,.5)))))`;
const SPEC=k=>`pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.3,.8,.5)))),${f(k)})`;
// parábola de lanzamiento s→e con altura h sobre la recta
const arcPt=(s,e,h,k,o)=>o.set(s.x+(e.x-s.x)*k,s.y+(e.y-s.y)*k+4*h*k*(1-k),s.z+(e.z-s.z)*k);
const qb=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
// tubo afinado a lo largo de una función de puntos
const pathTube=(fn,n,seg,rad,r0,r1)=>{const pts=[];for(let i=0;i<=n;i++)pts.push(fn(i/n,V3(0,0,0)));return taperTube(new THREE.CatmullRomCurve3(pts),seg,rad,r0,r1);};
const allyGlow=(i,k,col)=>{const m=allies[i].userData.m;m.emissive.copy(col||U.uC1.value);m.emissiveIntensity=k;};

// ---------- fragmentos de partícula del módulo ----------
// hoja que gira (vMix = ángulo); asp = estrechez (3 = bambú lanceolado, 1.6 = hoja ovalada)
const LEAF_FS=asp=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=max(.4*(1.-q.x*q.x*3.9),.001);float d=abs(q.y)*${f(asp)}/w;
 float a=smoothstep(1.,.7,d)*step(abs(q.x),.49)*vA;if(a<.003)discard;
 float rib=smoothstep(.05,0.,abs(q.y))*step(-.4,q.x);
 vec3 c0=mix(vec3(.16,.48,.1),vec3(.48,.82,.25),.5+q.x);
 gl_FragColor=vec4(mix(c0,uC1,.15)*(1.1-d*.3)+vec3(.5,.6,.25)*rib*.35,a);}`;
// terrón de tierra (mezcla normal)
const EARTH_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.25+q.y;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.18,.12,.07),vec3(.44,.32,.19),vMix)*(1.15-d),a);}`;
// gota de líquido con brillo (mezcla normal); col = color GLSL
const DROP_FS=col=>HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.8),q.y+.04));
 float a=smoothstep(.34,.28,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.09,0.,length(q-vec2(-.08,.0)));
 gl_FragColor=vec4(${col}*(.7+.45*vMix)*(1.15-d*1.2)+vec3(1.)*hl*.75,a);}`;
// rocío que, al posarse (vMix>1), destella en cuatro puntas
const DEWG_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float a;vec3 c;
 if(vMix>1.){vec2 k=abs(q)*2.;float st=smoothstep(.12,0.,k.x*k.y*6.+min(k.x,k.y))*smoothstep(1.,.2,max(k.x,k.y));float co=smoothstep(.35,0.,length(k));
  a=(st+co)*vA;c=mix(vec3(.85,.97,1.),uC1,.2)*1.6;}
 else{float d=length(vec2(q.x,q.y*(1.+q.y*.8)));float rim=smoothstep(.07,0.,abs(d-.27));float body=smoothstep(.3,.2,d);float hl=smoothstep(.09,0.,length(q-vec2(-.08,-.1)));
  a=(rim+body*.25+hl)*vA;c=mix(vec3(.8,.95,1.),uC1,.25)*(rim*1.3+body*.3)+vec3(1.)*hl;}
 if(a<.003)discard;gl_FragColor=vec4(c,a);}`;
// semilla negra en lágrima (mezcla normal)
const SEED_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float d=length(vec2(q.x*(1.5+q.y*2.2),q.y*1.1));float a=smoothstep(.3,.24,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.07,0.,length(q-vec2(-.05,-.06)));
 gl_FragColor=vec4(vec3(.05,.03,.03)+vec3(.55)*hl,a);}`;
// aguja vegetal fina (vMix = ángulo)
const NEEDLE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=.035*(1.-smoothstep(-.45,.45,q.x))+.006;float a=smoothstep(w,w*.3,abs(q.y))*step(abs(q.x),.46)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.85,.9,.55),uC1,.35+.4*smoothstep(0.,.45,q.x))*1.3,a);}`;
// pétalo que gira (mezcla normal)
const PETAL_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float e=length(vec2(q.x*1.55,(q.y+.05)*2.1))-abs(q.x)*.25*step(.1,q.y);float a=smoothstep(.42,.35,e)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(uC2*.8,mix(uC1,vec3(1.,.85,.9),.2),.35+q.y*1.2)*(1.05-e*.5),a);}`;
// gajo de cítrico (media luna translúcida con membrana)
const GAJO_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float o=length(q);float i=length(q-vec2(0.,.2));float m=smoothstep(.32,.28,o)*smoothstep(.2,.25,i);
 float a=m*vA;if(a<.003)discard;float memb=smoothstep(.03,0.,abs(o-.3))+smoothstep(.03,0.,abs(i-.22));
 float cells=noise(vec3(q*30.,vMix*9.));
 gl_FragColor=vec4(mix(vec3(1.,.5,.08),vec3(1.,.75,.3),cells)*(.9+.3*memb),a*.92);}`;
// crema (tres lóbulos sombreados, mezcla normal)
const CREAM_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;
 float l=smoothstep(.27,.12,length(q-vec2(-.1,.05)))+smoothstep(.25,.1,length(q-vec2(.11,.07)))+smoothstep(.24,.08,length(q-vec2(0.,-.1)));
 float a=min(l,1.)*vA;if(a<.003)discard;float sh=.8+.25*smoothstep(.2,-.2,q.y+q.x*.5);
 gl_FragColor=vec4(mix(vec3(1.,.97,.95),uC1,.2+.3*vMix)*sh,a);}`;
// virutas de azúcar de colores (fijos: son confeti)
const SPRINKLE_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*25.),s=sin(vMix*25.);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float d=length(vec2(max(abs(q.x)-.22,0.),q.y));float a=smoothstep(.1,.06,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4((.6+.4*cos(6.2832*(vMix*3.+vec3(0.,.33,.67))))*1.3,a);}`;
// astilla de madera fina (mezcla normal)
const SPLINTER_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float c=cos(vMix*6.2832),s=sin(vMix*6.2832);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
 float w=.06*(1.-smoothstep(.1,.46,abs(q.x)))+.012;float a=smoothstep(w,w*.4,abs(q.y))*step(abs(q.x),.46)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.3,.18,.08),vec3(.68,.5,.28),.5+q.x)+uC1*smoothstep(.3,.45,abs(q.x))*.6,a);}`;
// estrella de aturdimiento (amarillo fijo: indicador de estado)
const STUN_FS=HEAD+`varying float vA;varying float vMix;
void main(){vec2 q=gl_PointCoord-.5;float an=atan(q.y,q.x)+vMix*6.2832;float r=length(q);
 float st=.22+.12*cos(an*5.);float a=smoothstep(st+.03,st-.02,r)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.85,.25),vec3(1.),smoothstep(.15,0.,r))*1.5,a);}`;
// hoja en malla: plano 1×0.5 con el pecíolo en u=0 (opaco, dos caras)
const LEAFM_FS=`void main(){vec2 q=vec2(vUv.x,vUv.y-.5);float w=.5*pow(sin(3.14159*min(q.x,.999)),.8)*(1.-q.x*.25);
 if(abs(q.y)>w)discard;float rib=smoothstep(.04,0.,abs(q.y));
 vec3 c=mix(vec3(.12,.38,.1),vec3(.4,.74,.24),q.x*.6+abs(q.y)*.8)*(gl_FrontFacing?1.:.75);
 gl_FragColor=vec4((c+vec3(.35,.45,.15)*rib*.4)*${LIT}+uC1*uA*.35,1.);}`;
const leafGeo=new THREE.PlaneGeometry(1,0.5).translate(0.5,0,0);

// =====================================================================
// 1 · BAMBOO SHOOT — un pulso de raíz corre bajo tierra; bajo el rival brota un bambú que lo lanza al aire
//     entre hojas y una onda de polvo; el bambú se hunde y el rival cae (nivel 2: sin fractura de suelo)
// =====================================================================
const bamboo={key:"pcBamboo",name:"Bamboo Shoot",dur:2.2,ti:0.72,pal:"Savia",
  phases:[["Raíz",0],["Tensión",0.5],["Brote",0.72],["Vuelo",0.82],["Caída",1.35],["Calma",1.7]],
build(a){
  const L=a.L,TR=0.15,TF=0.5,TI=0.72,TP=0.82,TS=1.05,TSE=1.4,X=3.4,G0=V3(-3.2,0,0),HC=1.4,HT=0.45,H=HC+HT,V0=1.8,GR=12;
  const TL=TP+(V0+Math.sqrt(V0*V0+2*GR*H))/GR;            // aterrizaje del rival
  // caña: verde con fibras, nudos oscuros y banda cerosa; uA = energía en los nudos
  const caneMat=fx(`void main(){float y=vP.y;float an=atan(vP.z,vP.x);
   float seg=fract(y/.58+.35);float node=smoothstep(.05,0.,seg)+smoothstep(.95,1.,seg);float wax=smoothstep(.2,.03,seg)*(1.-node);
   float fib=noise(vec3(an*9.,y*1.4,0.))*.6+noise(vec3(an*26.,y*3.,1.))*.4;
   vec3 c=mix(vec3(.17,.4,.09),vec3(.46,.72,.2),fib);c=mix(c,vec3(.75,.82,.5),wax*.45)*(1.-node*.5);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+vec3(.85,1.,.7)*${SPEC(14)}*.3+uC1*(fr*(.15+.6*uA)+node*uA*.8),1.);}`,SOLID);
  // brote: vaina de escamas puntiagudas superpuestas
  const huskMat=fx(`void main(){float y=vP.y;float an=atan(vP.z,vP.x)/6.2832;
   float row=y*7.;float u=fract(an*5.+floor(row)*.5);float v=fract(row);
   float sc=smoothstep(0.,.2,v)*(1.-abs(u-.5)*2.);float edge=smoothstep(.06,0.,abs(abs(u-.5)*2.-(1.-v)));
   vec3 c=mix(vec3(.3,.26,.1),vec3(.56,.62,.26),sc)*(1.-edge*.45);
   gl_FragColor=vec4(c*${LIT}+uC1*uA*.35*edge,1.);}`,SOLID);
  const cylG=new THREE.CylinderGeometry(0.2,0.23,HC,24,1,false).translate(0,HC/2,0);
  const tipG=new THREE.ConeGeometry(0.2,HT,24).translate(0,HC+HT/2,0);
  // caña principal bajo el rival y tres menores alrededor (x, z, escala, retardo, inclinación z/x)
  const ST=[[X,0,1,0,0,0],[X-0.68,0.42,0.58,0.05,0.2,0.16],[X+0.52,-0.52,0.46,0.09,-0.22,-0.18],[X-0.25,-0.74,0.38,0.13,0.15,-0.25]].map(([x,z,s,d,rz,rx])=>{
    const g=new THREE.Group();g.add(new THREE.Mesh(cylG,caneMat));g.add(new THREE.Mesh(tipG,huskMat));
    g.userData={x,z,s,d,rz,rx};L.mesh.add(g);return g;});
  const rise=(te,d)=>{const k=cl((te-TI-d)/0.11),h=1-Math.pow(1-k,3)+0.05*Math.sin(Math.PI*cl((te-TI-d-0.11)/0.25));
    return h*(1-ss(TS+d*0.6,TSE+d*0.6,te));};
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),fx(RING_FS));L.mesh.add(hitRing);

  // partículas
  const C=`const float TR=${f(TR)};const float TF=${f(TF)};const float TI=${f(TI)};const float X=${f(X)};const float TL=${f(TL)};const vec3 G0=${v3(G0)};
  float xf(float t){float k=clamp((t-TR)/(TF-TR),0.,1.);return G0.x+(X-G0.x)*k;}
  float zf(float x){float u=(x-G0.x)/(X-G0.x);return -(sin(u*19.+1.3)*.18+(noise(vec3(u*14.,0.,0.))-.5)*.35)*.45;}`;
  // savia que cae desde la zona de la cabeza hasta el suelo
  a.count+=points(L.part,50,C+`void main(){float s=aSeed.x*TR;float life=.16;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(vec3(-3.55,2.05,(aSeed.y-.5)*.5),G0+vec3(0.,.05,0.),k*k)+rnd()*.05;
   vA=(age>0.&&age<1.)?1.:0.;put(p,.04+.04*aSeed.z);}`);
  // pulso verde que avanza bajo tierra siguiendo la raíz
  a.count+=points(L.part,110,C+`void main(){float s=TR+aSeed.x*(TF-TR);float life=.4+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=xf(s);vec3 p=vec3(x,.04,zf(x))+rnd()*vec3(.07,.02,.07)+vec3(0.,t*(.4+.8*aSeed.z),0.)+rnd()*.12*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.035+.04*aSeed.w)*(1.-age*.5));}`);
  // polvo que salta sobre el paso de la raíz
  a.count+=points(L.part,35,C+`void main(){float s=TR+aSeed.x*(TF-TR);float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float x=xf(s);vec3 p=vec3(x+(aSeed.z-.5)*.2,.08+.3*(1.-exp(-t*3.)),zf(x)+(aSeed.w-.5)*.2);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,(.14+.12*aSeed.y)*(.6+age));}`,DUST_FS,NB);
  // onda de polvo moderada al brotar (sin terrones)
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.12;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 d=vec3(cos(an),0.,sin(an));
   vec3 p=vec3(X,0.,0.)+d*(.35+1.1*(1.-exp(-t*2.8)))*(.5+aSeed.w)+vec3(0.,.12+(.35+.4*aSeed.y)*(1.-exp(-t*1.6)),0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age)*.8:0.;put(p,(.3+.3*aSeed.y)*(.6+age*.8));}`,DUST_FS,NB);
  // hojas de bambú lanceoladas que salen disparadas y bajan planeando
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.25;float life=1.1+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();float vy=2.2+2.2*aSeed.z;
   vec3 p=vec3(X+r.x*.25,.35+aSeed.y*1.3,r.z*.25)+vec3(r.x*1.2,vy,r.z*1.2)*(1.-exp(-t*2.4))/2.4+vec3(sin(t*3.+aSeed.w*6.)*.28,-.55*t,cos(t*2.5+aSeed.x*9.)*.2);
   vA=(age>0.&&age<1.&&p.y>.02)?smoothstep(0.,.05,age)*(1.-smoothstep(.7,1.,age)):0.;put(p,.18+.09*aSeed.w);
   vMix=aSeed.w+t*(.25+.5*aSeed.z)*sign(r.y);}`,LEAF_FS(3.),NB);
  // savia luminosa que sube en espiral por las cañas
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.35;float life=.5+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832+t*6.;float rad=.26+.3*aSeed.w;
   vec3 p=vec3(X+cos(an)*rad,.1+t*2.6,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.035+.035*aSeed.w);}`);
  a.count+=sparks(L.part,100,TI,`${f(X)},.25,0.`,"0.,1.6,0.",3,7.5,3);
  // polvo del aterrizaje
  a.count+=points(L.part,45,C+`void main(){float s=TL+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(X+cos(an)*(.4+.8*(1.-exp(-t*4.))),.06+.2*aSeed.y*(1.-exp(-t*3.)),sin(an)*(.4+.8*(1.-exp(-t*4.))));
   vA=(age>0.&&age<1.)?smoothstep(0.,.08,age)*(1.-age):0.;put(p,(.22+.2*aSeed.w)*(.6+age));}`,DUST_FS,NB);

  // raíz luminosa que avanza por el suelo del lanzador al rival
  const root=groundPlane(X-G0.x,(X+G0.x)/2,0.018,fx(`void main(){float u=vUv.x;float v=(vUv.y-.5)*2.;
   float w=sin(u*19.+1.3)*.18+(noise(vec3(u*14.,0.,0.))-.5)*.35;
   float line=smoothstep(.08,0.,abs(v-w))+smoothstep(.05,0.,abs(v-w*.4-sin(u*31.)*.12))*.45*step(.5,fract(u*3.7));
   float rev=step(u,uP);float head=exp(-max(uP-u,0.)*7.)*rev;
   float pulse=.65+.35*sin(u*40.-uT*16.);
   gl_FragColor=vec4(mix(uC2,uC1,head)*1.5,line*(.3+.7*head)*pulse*rev*smoothstep(0.,.03,u)*uA);}`),0.9);
  const shock=groundPlane(4.2,X,0.03,fx(RING_FS)), landRing=groundPlane(2.8,X,0.03,fx(RING_FS));
  L.decal.add(root,shock,landRing);

  a.pose=function(te,o){
    const ia=te-TI, il=te-TL;
    // pisotón del lanzador: la savia baja de la cabeza al suelo
    caster.position.y=0.08*Math.sin(Math.PI*cl(te/TR));
    caster.rotation.z=0.1*ss(0,TR*0.6,te)-0.17*ss(TR*0.6,TR,te)+0.07*ss(TR,TF,te);
    const cm=caster.userData.m;cm.emissive.copy(U.uC1.value);cm.emissiveIntensity=0.38*ss(0,TR,te)*(1-ss(TR,TF,te));
    set(root,cl((te-TR)/(TF-TR)),0.85*ss(TR,TR+0.05,te)*(1-ss(TI+0.15,TI+0.7,te)));
    let p=cl(ia/0.5);set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    p=cl(il/0.4);set(landRing,1-Math.pow(1-p,2),il>=0?(1-p)*0.6:0);
    // cañas: salen del suelo (el suelo opaco oculta la parte enterrada) y se hunden
    for(const g of ST){const u=g.userData,e=rise(te,u.d),wob=te>TI?0.07*Math.sin((te-TI)*32)*Math.exp(-(te-TI)*6):0;
      g.visible=te>=TI+u.d&&e>0.002; g.scale.setScalar(u.s);
      g.position.set(u.x,H*u.s*(e-1),u.z); g.rotation.set(u.rx*e,0,u.rz*e+wob*(u.s>0.9?1:1.6));}
    caneMat.uniforms.uA.value=ia>=0?0.25+0.55*Math.exp(-ia*4):0; huskMat.uniforms.uA.value=caneMat.uniforms.uA.value;
    p=cl(ia/0.3); hitRing.position.set(X,0.8,0); billboard(hitRing); set(hitRing,p,ia>=0?(1-p)*0.85:0);
    // el rival: tiembla, sale despedido sobre la punta, gira en el aire y cae
    let ty=0;
    if(te>=TI&&te<TP)ty=H*rise(te,0);
    else if(te>=TP&&te<TL){const t=te-TP;ty=Math.max(H+V0*t-GR/2*t*t,0);}
    const fl=cl((te-TP)/(TL-TP));
    target.position.set(X+(te>=TF&&te<TI?0.015*Math.sin(te*90):0)+0.18*Math.sin(Math.PI*fl)*(te>=TP?1:0),ty,0);
    target.rotation.z=te>=TP&&te<TL?-0.5*Math.sin(Math.PI*fl):(te>=TL?0.09*Math.sin(il*18)*hitK(il,5):0);
    const sq=hitK(il,7); target.scale.set(1+0.07*sq,1-0.12*sq,1+0.07*sq);
    if(te<TR){o.g.set(-3.5,1.6-1.4*cl(te/TR),0);o.gs=0.7;o.ga=0.3;o.li=1.6;}
    else if(te<TF){const k=cl((te-TR)/(TF-TR));o.g.set(G0.x+(X-G0.x)*k,0.25,0);o.gs=0.8;o.ga=0.38;o.li=2;}
    else if(te<TI){const k=cl((te-TF)/(TI-TF));o.g.set(X,0.3,0);o.gs=0.9+0.9*k;o.ga=0.25+0.3*k;o.li=1.6+3*k;}
    else{o.g.set(X,0.35+1.3*cl(ia/0.12),0);o.gs=1.3+2.2*Math.min(ia,0.5);o.ga=0.68*Math.exp(-ia*9)+0.08*(1-ss(TS,TSE,te));o.li=7*Math.exp(-ia*5)+1.2*(1-ss(TS,TSE,te));}
    if(il>=0){o.ia=il;o.c.set(X,0.3,0);o.shake=0;o.dist=0.3;o.flash=0.3;}
    else{o.ia=ia;o.c.set(X,0.6,0);o.shake=0;o.dist=0.75;}
  };
}};

// =====================================================================
// 2 · BEECH — un ariete de roble con forma de cuerna se forma desde la cabeza; embestida con estela esmeralda,
//     el ariete se deshace en virutas y unas ramas crecen alrededor del Axie entrelazándose en un escudo
//     (nivel 3: ariete más grueso, impacto pesado y fractura de baldosas bajo el rival)
// =====================================================================
const beech={key:"pcBeech",name:"Beech",dur:3.4,ti:0.72,pal:"Roble",
  phases:[["Ariete",0],["Embestida",0.42],["Impacto",0.72],["Fractura",0.9],["Regreso",1.0],["Ramas",1.35],["Escudo",2.1],["Disipación",2.8]],
build(a){
  const L=a.L,TD=0.42,TI=0.72,TB=1.35,TBF=2.1,TX=2.8,TE=3.35,X0=-3.9,XH=1.9,HX=-3.7,FX=1.2,FY=1.44;
  const cx=te=>te<TD?-3.7-0.25*ss(0,TD,te):te<TI?X0+(XH-X0)*Math.pow((te-TD)/(TI-TD),2):XH-0.4*ss(TI,TI+0.25,te)-(XH-0.4-HX)*ss(1.0,1.35,te);
  // corteza de roble: crece con uP (de la base a la punta), se deshace con uQ dejando un filo esmeralda
  const BARK_FS=`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float n=noise(vec3(u*30.,vUv.y*8.,0.))*.6+noise(vec3(u*80.,vUv.y*20.,3.))*.4;
   float ridge=pow(abs(sin(vUv.y*31.4+n*2.)),6.);
   vec3 bark=mix(vec3(.17,.11,.06),vec3(.42,.3,.17),n)*(1.-ridge*.35);
   float dz=noise(vec3(u*12.,vUv.y*6.,uT*.3))-uQ*1.1+.05;if(dz<0.)discard;
   float edge=smoothstep(.08,0.,dz)*step(.001,uQ);float head=smoothstep(.06,0.,uP-u)*step(uP,.995);
   float vein=pow(1.-abs(noise(vec3(u*18.,vUv.y*5.,7.))*2.-1.),12.);
   gl_FragColor=vec4(bark*${LIT}+uC1*(vein*uA*1.4+edge*2.5+head*2.)+uC2*edge,1.);}`;
  const barkMat=()=>fxU(BARK_FS,{uQ:{value:0}},SOLID);
  // ariete: tronco que engorda hacia la punta, dos ramas laterales en cuerna y una testa con anillos
  const ramG=new THREE.Group(); L.mesh.add(ramG);
  const ramMat=barkMat();
  const ram=new THREE.Mesh(pathTube((t,o)=>o.set(0.15+1.05*t,1.62-0.18*t*t,0),8,60,12,0.16,0.27),ramMat);
  const tines=[-1,1].map(s=>new THREE.Mesh(pathTube((t,o)=>o.set(0.5+0.55*t,1.6+0.34*Math.sin(t*1.6),s*(0.08+0.4*t*t)),6,30,8,0.095,0.03),ramMat));
  const capMat=fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=noise(vec3(p*3.,1.));
   float rings=.5+.5*sin((r+n*.12)*38.);
   vec3 c=mix(vec3(.5,.34,.18),vec3(.78,.6,.38),rings)*(1.-smoothstep(.85,1.,r)*.6);
   float dz=noise(vec3(p*4.,uT*.3))-uQ*1.1+.05;if(dz<0.)discard;
   gl_FragColor=vec4(c*.9+uC1*(uA*.5*rings+smoothstep(.08,0.,dz)*step(.001,uQ)*2.5),1.);}`,{uQ:{value:0}},SOLID);
  const cap=new THREE.Mesh(new THREE.CircleGeometry(0.27,28).rotateY(Math.PI/2),capMat); cap.position.set(FX,FY,0);
  ramG.add(ram,...tines,cap);
  // estela esmeralda: planos cruzados con fibras de madera que fluyen
  const tg=new THREE.PlaneGeometry(1,0.85).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float fib=noise(vec3(u*3.-uT*6.,vUv.y*22.,0.));float st=smoothstep(.55,.85,fib);
   float al=smoothstep(.2+.8*u,0.,v)*pow(u,1.4)*(.45+.8*st)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u*.6+st*.4)*1.6+vec3(1.)*st*u*.25,al);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2; trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(3.6,3.6),fx(RING_FS)); hitRing.position.copy(TC); L.mesh.add(hitRing);
  // escudo: 8 ramas que suben girando en sentidos alternos (trenzado) y dos anillos que las atan
  const bp=(i,t,o)=>{const s=i%2?1:-1,th=i/8*Math.PI*2+s*1.25*t,r=0.88*(1-0.72*Math.pow(t,2.2))+0.04*Math.sin(t*9+i);
    return o.set(HX+Math.cos(th)*r,2.35*Math.pow(t,0.85),Math.sin(th)*r);};
  const branches=[];
  for(let i=0;i<8;i++){const m=new THREE.Mesh(pathTube((t,o)=>bp(i,t,o),14,60,6,0.075,0.03),barkMat());m.userData={d:i*0.04,dur:0.45};branches.push(m);}
  for(const [j,y] of [[0,0.55],[1,1.25]]){const t=Math.pow(y/2.35,1/0.85),r=0.9*(1-0.72*Math.pow(t,2.2))+0.03;
    const m=new THREE.Mesh(pathTube((u,o)=>o.set(HX+Math.cos(u*6.15+j)*r,y+0.06*Math.sin(u*6.15*4+j),Math.sin(u*6.15+j)*r),40,90,6,0.05,0.035),barkMat());
    m.userData={d:0.42+j*0.12,dur:0.4};branches.push(m);}
  L.mesh.add(...branches);
  // hojas brotando en las ramas
  const leafMat=fx(LEAFM_FS,DS), leaves=[];
  for(let k=0;k<30;k++){const i=k%8,t=0.18+0.72*((k*0.618)%1),m=new THREE.Mesh(leafGeo,leafMat);
    bp(i,t,m.position); m.rotation.set(Math.random()*6.3,Math.random()*6.3,Math.random()*6.3);
    m.userData={i,t,s:0.14+Math.random()*0.08};leaves.push(m);L.mesh.add(m);}
  // velo de savia dentro de la jaula: celdas de hoja con brillo de borde
  const veil=new THREE.Mesh(new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*0.62),fx(`
  void main(){vec3 q=normalize(vP);float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   vec2 g=vec2(atan(q.z,q.x)*2.5,q.y*5.);vec2 c=floor(g);vec2 fq=fract(g)-.5;
   float cell=smoothstep(.06,0.,abs(max(abs(fq.x),abs(fq.y))-.42-hash(vec3(c,1.))*.05));
   float wave=band(fract(q.y*1.5-uP*1.2),.5,.08)*step(.001,uP)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,fr+cell*.4)*1.3,(fr*.35+cell*.12+wave*.6)*uA);}`));
  veil.position.set(HX,-0.05,0); veil.scale.set(0.98,2.5,0.98); L.mesh.add(veil);

  // partículas
  const C=`const float TD=${f(TD)};const float TI=${f(TI)};const float TB=${f(TB)};const float TBF=${f(TBF)};const float TX=${f(TX)};
  const float X0=${f(X0)};const float XH=${f(XH)};const float HX=${f(HX)};const vec3 HP=${v3(TC)};
  float cx(float t){if(t<TD)return -3.7-.2*smoothstep(0.,TD,t);if(t<TI){float k=(t-TD)/(TI-TD);return X0+(XH-X0)*k*k;}
   return XH-.4*smoothstep(TI,TI+.25,t)-(XH-.4-HX)*smoothstep(1.,1.35,t);}
  vec3 ramP(float u){return vec3(.15+1.05*u,1.62-.18*u*u,0.);}
  vec3 bp(float i,float t){float s=mod(i,2.)>.5?1.:-1.;float th=i/8.*6.2832+s*1.25*t;float r=.88*(1.-.72*pow(t,2.2))+.04*sin(t*9.+i);
   return vec3(HX+cos(th)*r,2.35*pow(t,.85),sin(th)*r);}`;
  // savia esmeralda que converge para formar el ariete
  a.count+=points(L.part,120,C+`void main(){float s=.05+aSeed.x*(TD-.07);float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 dst=vec3(cx(s),0.,0.)+ramP(aSeed.y);vec3 p=mix(dst+rnd()*vec3(.9,.7,.9),dst,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.04+.04*aSeed.z);}`);
  // jirones de la carga y hojas que se desprenden
  a.count+=points(L.part,200,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=.3+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s)+${f(FX)},${f(FY)},0.)+r*vec3(.1,.22,.22)+vec3(-1.3*t,.3*t,r.z*.6*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.035+.05*aSeed.w)*(1.-age*.5));}`);
  a.count+=points(L.part,50,C+`void main(){float s=TD+aSeed.x*(TI-TD);float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=vec3(cx(s)+.6,1.2+r.y*.4,r.z*.4)+vec3(-.6*t+sin(t*4.+aSeed.z*6.)*.2,-.9*t,r.x*.3*t);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.16+.08*aSeed.w);vMix=aSeed.w+t*.6;}`,LEAF_FS(1.7),NB);
  // impacto: astillas, esquirlas esmeralda y hojas
  a.count+=points(L.part,160,C+`void main(){float s=TI+aSeed.x*.04;float life=.7+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(-.4,.5,0.))*(3.+5.5*aSeed.z);vec3 p=HP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>0.)?1.-age*age:0.;put(p,.2+.14*aSeed.w);vMix=aSeed.w+t*(1.+2.*aSeed.y);}`,SPLINTER_FS,NB);
  a.count+=points(L.part,140,C+`void main(){float s=TI+aSeed.x*.06;float life=.55+aSeed.y*.45;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(.3,.4,0.))*(2.5+5.5*aSeed.z);vec3 p=HP+v*t+vec3(0.,-4.*t*t,0.);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.06+.07*aSeed.w);}`,CHIP_FS);
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.1;float life=1.2+aSeed.y*.6;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 r=rnd();vec3 p=HP+vec3(r.x*2.3,1.9+r.y*.7,r.z*2.)*(1.-exp(-t*3.))/1.5+vec3(sin(t*3.+aSeed.z*6.)*.25,-.6*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.18+.09*aSeed.w);vMix=aSeed.w+t*.5;}`,LEAF_FS(1.7),NB);
  a.count+=sparks(L.part,300,TI,`${f(TC.x)},${f(TC.y)},0.`,"-.5,.4,0.",4,13,3.2);
  // el ariete se deshace en motas mientras el Axie vuelve
  a.count+=points(L.part,110,C+`void main(){float s=.9+aSeed.x*.42;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=vec3(cx(s),0.,0.)+ramP(aSeed.z)+rnd()*.08+vec3(-.3*t,.5*t,(aSeed.w-.5)*.6*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*30.+aSeed.w*30.)):0.;put(p,(.03+.04*aSeed.w)*(1.-age*.5));}`);
  // savia que sube por las ramas mientras crecen; motas que rondan el escudo
  a.count+=points(L.part,140,C+`void main(){float s=TB+aSeed.x*(TBF-TB);float life=.35+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float i=floor(aSeed.z*8.);float g=clamp((s-TB-i*.04)/.45,0.,1.);g=1.-pow(1.-g,2.);
   vec3 p=bp(i,g)+rnd()*.05+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.&&g>.01)?1.-age:0.;put(p,.035+.04*aSeed.w);}`);
  a.count+=points(L.part,50,C+`void main(){float an=aSeed.x*6.2832+uT*(.5+.4*aSeed.y);float rad=.95+.2*aSeed.z;
   vec3 p=vec3(HX+cos(an)*rad,.3+aSeed.w*1.9+sin(uT*1.4+aSeed.x*9.)*.1,sin(an)*rad);
   vA=uE*.8;put(p,(.04+.04*aSeed.y)*uE);}`);
  // al deshacerse el escudo caen hojas
  a.count+=points(L.part,70,C+`void main(){float s=TX+aSeed.x*.35;float life=1.+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bp(floor(aSeed.z*8.),.2+.75*aSeed.w)+vec3(sin(t*3.5+aSeed.x*9.)*.25,-1.1*t,cos(t*3.+aSeed.y*7.)*.2);
   vA=(age>0.&&age<1.&&p.y>.02)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,.15+.08*aSeed.w);vMix=aSeed.w+t*.7;}`,LEAF_FS(1.7),NB);

  // surco de la carrera y corona de raíces bajo el Axie
  const scuff=groundPlane(XH+FX-X0,(XH+FX+X0)/2,0.018,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*30.,vUv.y*6.,1.));float m=smoothstep(.5+.3*n,0.,v)*step(u,uP)*smoothstep(0.,.1,u);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3,m*(.4+.6*n)*uA);}`),0.7);
  const crown=groundPlane(2.8,HX,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float k=fract(an/6.2832*8.+.0);float knot=smoothstep(.12,0.,length(vec2((k-.5)*1.4,r-.63)))*1.2;
   float rl=pow(1.-abs(fract(an/6.2832*24.+noise(vec3(r*6.,an,1.))*.3)*2.-1.),10.)*smoothstep(.95,.45,r)*step(.3,r);
   float m=band(r,.63,.05)+knot+rl*.5;
   gl_FragColor=vec4(mix(uC2,uC1,knot+band(r,.63,.03))*1.4,m*uA);}`));
  // fractura de baldosas bajo el rival (nivel 3), centrada en él y siguiendo su retroceso
  const FS=6.5, frac=groundPlane(FS,3.4,0.025,fx(tileFractureFS(FS)));
  L.decal.add(scuff,crown,frac);

  a.pose=function(te,o){
    const ia=te-TI, x=cx(te), form=ss(0.05,TD,te), dash=te>=TD&&te<TI?(te-TD)/(TI-TD):0;
    caster.position.x=x;
    caster.rotation.z=0.1*ss(0,TD,te)-0.3*ss(TD,TD+0.08,te)+0.2*ss(TI,TI+0.3,te);
    ramG.position.set(x,0,0); ramG.rotation.z=caster.rotation.z;
    const q=ss(0.9,1.3,te);
    ramG.visible=te>0.04&&q<0.999;
    ramMat.uniforms.uP.value=form*1.02; ramMat.uniforms.uQ.value=q; ramMat.uniforms.uA.value=0.4+0.6*dash+(ia>=0?Math.exp(-ia*5):0);
    cap.visible=form>0.97; capMat.uniforms.uQ.value=q; capMat.uniforms.uA.value=ramMat.uniforms.uA.value;
    const front=x+FX;
    trail.visible=te>TD&&ia<0.3; trail.position.set(front,FY,0); trail.scale.set(Math.max(front-(X0+FX),0.001),1,1); tm.uniforms.uA.value=ia>0?1-cl(ia/0.3):1;
    let p=cl(ia/0.35); billboard(hitRing); set(hitRing,p,ia>=0?1-p:0);
    set(scuff,cl((te-TD)/(TI-TD)),te>=TD?1-ss(TI+0.2,1.55,te):0);
    // ramas: cada una crece a su ritmo; al final se retraen de la punta a la base
    for(const b of branches){const u=b.userData,g=1-Math.pow(1-cl((te-TB-u.d)/u.dur),2),r=1-ss(TX+u.d*0.3,TX+0.4+u.d*0.3,te);
      b.visible=g>0.001&&r>0.001; b.material.uniforms.uP.value=g*r*1.01;
      b.material.uniforms.uA.value=0.25+0.9*hitK(te-TBF,4)*(te>=TBF?1:0)+0.15*Math.sin(te*5)*ss(TBF,TBF+0.3,te);}
    for(const l of leaves){const u=l.userData,b=branches[u.i].material.uniforms.uP.value,s=ss(u.t,u.t+0.12,b);
      l.visible=s>0.01; l.scale.setScalar(Math.max(u.s*s,0.001));}
    leafMat.uniforms.uA.value=hitK(te-TBF,4)*(te>=TBF?1:0);
    const env=ss(TBF-0.2,TBF+0.1,te)*(1-ss(TX,TX+0.35,te));
    veil.visible=env>0.001; set(veil,cl((te-TBF)/0.7),env*0.9);
    crown.material.uniforms.uA.value=ss(TB,TB+0.3,te)*(1-ss(TX+0.2,TE,te));
    U.uE.value=env;
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.25*form*(1-ss(TI,TI+0.3,te))+0.25*env+0.6*hitK(te-TBF,5)*(te>=TBF?1:0);
    const hit=hitK(ia,3.2);
    target.position.x=3.4+hit*0.8*(1-Math.exp(-Math.max(ia,0)*20)); target.rotation.z=-hit*0.5*Math.cos(ia*12);
    frac.position.x=target.position.x; set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.0,TI+2.0,te):0);
    if(te<TD){o.g.set(x+0.75,FY+0.1,0);o.gs=1.4*form;o.ga=0.5*form;o.li=3.5*form;}
    else if(te<TI){o.g.set(front,FY,0);o.gs=2;o.ga=0.7;o.li=6;}
    else if(te<TB){o.g.copy(TC);o.gs=1.8+5.5*Math.min(ia,0.6);o.ga=Math.exp(-ia*9)*0.95;o.li=14*Math.exp(-ia*4.5);}
    else{const lk=te>=TBF?Math.exp(-(te-TBF)*6):0;o.g.set(HX,1.2,0);o.gs=2.4;o.ga=0.12*env+0.5*lk+0.15*ss(TB,TBF,te)*(1-env);o.li=2.5*env+5*lk+1.5;}
    if(te>=TBF){o.ia=te-TBF;o.c.set(HX,1.1,0);o.shake=0.2;o.dist=0.5;o.flash=0;}
    else{o.ia=ia;o.c.copy(TC);o.shake=1.8;o.dist=1.3;}
  };
}};

// =====================================================================
// 3 · MANDARINE — cuatro mandarinas brotan en un ramillete sobre la cabeza y salen en parábola hacia los aliados
//     (dos les dan de lleno, dos caen al suelo a su lado); estallan en nube cítrica dorada; zumo burbujeante cura
// =====================================================================
const mand={key:"pcMandarine",name:"Mandarine",dur:2.4,ti:0.88,pal:"Ámbar",allies:2,
  phases:[["Brote",0],["Lanzamiento",0.38],["Estallido",0.88],["Curación",1.15],["Fin",1.95]],
build(a){
  const L=a.L,FL=0.5,HA=1.15,TEND=1.95,DUR=2.4;
  const S=[V3(-3.5,2.2,-0.3),V3(-3.45,2.32,0.3),V3(-3.66,2.36,-0.08),V3(-3.6,2.2,0.34)];
  const A0=ALLY_POS[0],A1=ALLY_POS[1];
  const E=[V3(A0.x,1.4,A0.z),V3(A0.x+0.68,0.12,A0.z+0.55),V3(A1.x,1.4,A1.z),V3(A1.x-0.6,0.12,A1.z+0.6)];
  const TL=[0.38,0.45,0.52,0.59], TH=TL.map(t=>t+FL), AL=[0,0,1,1];
  // mandarina: piel de poros con brillo; uA = grietas doradas antes de estallar
  const PEEL_FS=`void main(){vec3 q=normalize(vP);
   float pit=noise(vP*38.)*.6+noise(vP*90.)*.4;
   vec3 col=mix(vec3(.93,.4,.04),vec3(1.,.6,.12),smoothstep(.3,.8,pit))*(1.-smoothstep(.75,1.,abs(q.y))*.25);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float seam=pow(1.-abs(noise(vP*6.)*2.-1.),10.)*uA;
   gl_FragColor=vec4(col*${LIT}+vec3(1.,.9,.7)*${SPEC(18)}*(.35+.4*pit)+uC1*(fr*.3+seam*2.5),1.);}`;
  const stemMat=new THREE.MeshStandardMaterial({color:0x3f6a1e,roughness:0.7});
  const fruits=S.map(()=>{const g=new THREE.Group(),m=new THREE.Mesh(new THREE.SphereGeometry(0.15,28,20),fx(PEEL_FS,SOLID));m.scale.y=0.84;
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.016,0.055,6).translate(0,0.14,0),stemMat);
    const lf=new THREE.Mesh(leafGeo,fx(LEAFM_FS,DS));lf.scale.setScalar(0.14);lf.position.set(0.01,0.14,0);lf.rotation.set(0.4,0.3,0.5);
    g.add(m,st,lf);g.userData={m};L.mesh.add(g);return g;});
  // ramillete de hojas sobre la cabeza que sostiene las mandarinas
  const sprigMat=fx(LEAFM_FS,DS), sprig=[];
  for(let i=0;i<6;i++){const m=new THREE.Mesh(leafGeo,sprigMat),an=i/6*Math.PI*2;m.position.set(-3.56,2.08,0);m.rotation.set(0,an,0.55);m.userData={an};sprig.push(m);L.mesh.add(m);}
  // estela de zumo: tubo que se revela a lo largo de cada parábola
  const trails=S.map((s,i)=>{const m=new THREE.Mesh(pathTube((t,o)=>arcPt(s,E[i],HA,t,o),24,60,8,0.045,0.03),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.4)discard;
   float n=noise(vec3(u*30.-uT*6.,vUv.y*6.2832,0.));float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   float al=exp(-d*7.)*(.35+.65*fr)*(.6+.4*n)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,exp(-d*5.))*1.5+vec3(1.)*exp(-d*25.)*.4,al);}`));L.trail.add(m);return m;});
  // nube cítrica: niebla dorada que se deshace en grumos
  const cloudFS=`void main(){float n=noise(vP*3.4+vec3(uT*.7,uT*.4,0.))*.6+noise(vP*8.-vec3(0.,uT,0.))*.4;
   float th=uP*1.05-.12;if(n<th)discard;float edge=smoothstep(.12,0.,n-th);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*fr)*(.8+.7*fr)+vec3(1.,.95,.7)*edge*.8,(.1+.55*fr+edge*.8)*(1.-uP));}`;
  const clouds=E.map(e=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,22),fx(cloudFS));m.position.copy(e);L.mesh.add(m);return m;});
  // columna de zumo burbujeante sobre cada aliado
  const fizzFS=`void main(){float an=atan(vP.z,vP.x)/6.2832;float h=vP.y/1.95+.5;
   vec2 g=vec2(an*16.,h*9.-uT*2.2);vec2 c=floor(g);vec2 fq=fract(g)-.5;float rn=hash(vec3(c,1.));
   fq+=(vec2(hash(vec3(c,2.)),hash(vec3(c,3.)))-.5)*.4;
   float b=smoothstep(.07,0.,abs(length(fq)-.12-.12*rn))*step(.45,rn);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
   gl_FragColor=vec4(mix(uC2,uC1,.6+.4*b)*1.4,(b*.9+fr*.25)*smoothstep(0.,.12,h)*smoothstep(1.,.45,h)*uA);}`;
  const fizz=[A0,A1].map(p=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.54,0.58,1.95,36,1,true),fx(fizzFS));m.position.set(p.x,0.98,p.z);L.mesh.add(m);return m;});
  // partículas
  const C=`const float FL=${f(FL)};const float HA=${f(HA)};
  const vec3 S0=${v3(S[0])};const vec3 S1=${v3(S[1])};const vec3 S2=${v3(S[2])};const vec3 S3=${v3(S[3])};
  const vec3 E0=${v3(E[0])};const vec3 E1=${v3(E[1])};const vec3 E2=${v3(E[2])};const vec3 E3=${v3(E[3])};
  const vec3 A0=${v3(A0)};const vec3 A1=${v3(A1)};
  vec3 pick(float i,vec3 a,vec3 b,vec3 c,vec3 d){return i<.5?a:(i<1.5?b:(i<2.5?c:d));}
  float tl(float i){return .38+i*.07;}
  vec3 fly(float i,float t){float k=clamp((t-tl(i))/FL,0.,1.);return mix(pick(i,S0,S1,S2,S3),pick(i,E0,E1,E2,E3),k)+vec3(0.,4.*HA*k*(1.-k),0.);}`;
  const JUICE="vec3(1.,.55,.08)";
  // destellos del brote alrededor del ramillete
  a.count+=points(L.part,45,C+`void main(){float s=.02+aSeed.x*.33;float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 c=pick(floor(aSeed.y*4.),S0,S1,S2,S3);vec3 p=mix(c+rnd()*.4,c,k*k);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.035+.035*aSeed.z);}`);
  // gotas de zumo que gotean de las mandarinas en vuelo
  a.count+=points(L.part,150,C+`void main(){float i=floor(aSeed.x*4.);float s=tl(i)+fract(aSeed.x*4.)*FL;float life=.3+aSeed.y*.22;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=fly(i,s)+rnd()*.05+vec3(0.,-2.5*t*t,0.)+rnd()*.2*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.03+.03*aSeed.w)*(1.-age*.4));}`);
  // estallido: gajos, gotas de zumo, niebla dorada y hojas
  a.count+=points(L.part,70,C+`void main(){float i=floor(aSeed.x*4.);float s=tl(i)+FL;float life=.6+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 e=pick(i,E0,E1,E2,E3);vec3 v=normalize(rnd()+vec3(0.,.9,0.))*(1.3+1.8*aSeed.z);vec3 p=e+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,.13+.08*aSeed.w);vMix=aSeed.w+t*(1.5+aSeed.z);}`,GAJO_FS,NB);
  a.count+=points(L.part,130,C+`void main(){float i=floor(aSeed.x*4.);float s=tl(i)+FL;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 e=pick(i,E0,E1,E2,E3);vec3 v=normalize(rnd()+vec3(0.,.6,0.))*(1.2+2.6*aSeed.z);vec3 p=e+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.04+.04*aSeed.w);}`,DROP_FS(JUICE),NB);
  a.count+=points(L.part,70,C+`void main(){float i=floor(aSeed.x*4.);float s=tl(i)+FL+aSeed.y*.08;float life=.55+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 e=pick(i,E0,E1,E2,E3);vec3 p=e+normalize(rnd())*(.15+.7*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.35*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.6:0.;put(p,(.18+.2*aSeed.w)*(.6+age));}`);
  a.count+=points(L.part,40,C+`void main(){float i=floor(aSeed.x*4.);float s=tl(i)+FL;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 e=pick(i,E0,E1,E2,E3);vec3 r=rnd();vec3 p=e+vec3(r.x*1.1,1.2+r.y*.4,r.z*1.1)*(1.-exp(-t*3.))/1.6+vec3(sin(t*3.+aSeed.z*6.)*.18,-.6*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.13+.06*aSeed.w);vMix=aSeed.w+t*.6;}`,LEAF_FS(1.7),NB);
  // curación: burbujas y destellos dorados que suben dentro de cada aliado
  a.count+=points(L.part,90,C+`void main(){float ai=step(.5,aSeed.x);vec3 ap=ai<.5?A0:A1;float t0=ai<.5?${f(TH[0])}:${f(TH[2])};
   float life=.75+aSeed.y*.35;float k=(uT-t0)/life+fract(aSeed.x*2.);float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.18+.34*r.y;vec3 p=ap+vec3(cos(an)*rad+sin(age*8.+r.z*6.)*.05,.1+age*(1.6+r.z*.3),sin(an)*rad);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.07+.05*r.z));}`,VFX.BUBBLE_FS);
  a.count+=points(L.part,50,C+`void main(){float ai=step(.5,aSeed.x);vec3 ap=ai<.5?A0:A1;float t0=ai<.5?${f(TH[0])}:${f(TH[2])};
   float life=.6+aSeed.y*.3;float k=(uT-t0)/life+fract(aSeed.x*2.);float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=ap+vec3((r.x-.5)*1.,.2+r.y*1.6+age*.35,(r.z-.5)*1.);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.08+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);
  for(let i=0;i<4;i++)a.count+=sparks(L.part,30,TH[i],`${f(E[i].x)},${f(E[i].y)},${f(E[i].z)}`,"0.,.7,0.",1.8,5.5,2.5);
  // rodaja de mandarina luminosa bajo cada aliado, y manchas de zumo donde caen al suelo
  const sliceFS=`void main(){vec2 p=vUv-.5;float r=length(p)*2./max(uP,.001);float an=atan(p.y,p.x)+uT*.25;
   float seg=abs(fract(an/6.2832*10.)-.5)*2.;float memb=smoothstep(.12,0.,1.-seg)*step(.12,r)*step(r,.84);
   float rind=band(r,.92,.06);float pith=band(r,.84,.025)+smoothstep(.12,0.,r)*.6;
   float cells=noise(vec3(p*40.,1.))*smoothstep(.84,.7,r);
   float m=(rind+memb*.8+pith*.6+cells*.25)*step(r,1.);
   gl_FragColor=vec4(mix(uC2,uC1,cells+pith)*1.4+vec3(1.)*pith*.3,m*uA);}`;
  const slices=[A0,A1].map(p=>{const m=groundPlane(2.2,p.x,0.02,fx(sliceFS));m.position.z=p.z;L.decal.add(m);return m;});
  const stains=[1,3].map(i=>{const m=groundPlane(1.35,E[i].x,0.017,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
   float n=noise(vec3(p*8.,3.))*.6+noise(vec3(p*20.,1.))*.4;float m=smoothstep(.62,.5,r/max(uP,.01)+(n-.5)*.5);
   float dots=smoothstep(.75,.8,noise(vec3(p*14.,7.)))*smoothstep(1.,.5,r);
   gl_FragColor=vec4(mix(vec3(.85,.35,.03),vec3(1.,.62,.15),n),(m*.65+dots*.6)*uA);}`,NB));m.position.z=E[i].z;L.decal.add(m);return m;});
  const shocks=E.map(e=>{const m=groundPlane(2.2,e.x,0.03,fx(RING_FS));m.position.z=e.z;L.decal.add(m);return m;});

  a.pose=function(te,o){
    caster.rotation.z=0.1*ss(0,0.34,te)-0.2*ss(0.38,0.45,te)+0.1*ss(0.47,0.85,te);
    const sp=ss(0,0.2,te)*(1-ss(0.65,0.95,te));
    for(const l of sprig){l.visible=sp>0.01;l.scale.setScalar(Math.max(0.24*sp,0.001));l.rotation.set(0,l.userData.an+te*0.4,0.35+0.4*sp);}
    sprigMat.uniforms.uA.value=0.5*sp;
    let last=-1;
    fruits.forEach((g,i)=>{const g0=0.05+i*0.05,grow=ss(g0,g0+0.15,te),k=cl((te-TL[i])/FL),m=g.userData.m;
      g.visible=te>=g0&&te<TH[i];
      if(te<TL[i])g.position.set(S[i].x,S[i].y+0.03*Math.sin(te*8+i),S[i].z);else arcPt(S[i],E[i],HA,k,g.position);
      const swell=ss(TH[i]-0.08,TH[i],te);
      g.scale.setScalar(Math.max(grow*(1+0.25*swell),0.001));
      g.rotation.set(te>=TL[i]?(te-TL[i])*9:0,te*1.5+i,te>=TL[i]?(te-TL[i])*6:0);
      m.material.uniforms.uA.value=swell;
      const tr=trails[i]; tr.visible=te>=TL[i]&&te<TH[i]+0.28;
      set(tr,te<TH[i]?k:1+(te-TH[i])*1.4,te<TH[i]?0.85:0.85*(1-cl((te-TH[i])/0.28)));
      const ip=cl((te-TH[i])/0.5),c=clouds[i]; c.visible=te>=TH[i]&&ip<1; c.scale.setScalar(0.2+(i%2?0.62:0.88)*(1-Math.pow(1-ip,3))); c.material.uniforms.uP.value=ip;
      const sp2=cl((te-TH[i])/0.45); set(shocks[i],1-Math.pow(1-sp2,2),te>=TH[i]?(1-sp2)*0.8:0);
      if(te>=TH[i])last=i;});
    stains.forEach((m,j)=>{const t0=TH[j*2+1];set(m,ss(t0,t0+0.25,te),te>=t0?1-ss(TEND,DUR,te):0);});
    // curación de cada aliado: rodaja que se abre, columna burbujeante y brillo (más fuerte con el segundo impacto)
    const envs=[0,1].map(j=>{const t0=TH[j*2],t1=TH[j*2+1];
      const e=ss(t0,t0+0.15,te)*(1-ss(TEND-0.3,DUR,te)),pk=hitK(te-t0,6)*(te>=t0?1:0)+0.6*hitK(te-t1,6)*(te>=t1?1:0);
      set(slices[j],1-Math.pow(1-cl((te-t0)/0.4),3),e*0.8);
      fizz[j].visible=e>0.001; set(fizz[j],0,e*(0.6+0.35*pk));
      allyGlow(j,0.3*e+0.7*pk); allies[j].scale.set(1+0.03*pk,1+0.03*pk,1+0.03*pk);
      return e;});
    U.uE.value=Math.max(envs[0],envs[1]);
    if(last<0){const k=cl((te-TL[0])/FL);if(te<TL[0]){o.g.set(-3.56,2.2,0);o.gs=0.8;o.ga=0.3*sp;o.li=1.6*sp;}
      else{arcPt(S[0],E[0],HA,k,o.g);o.gs=0.85;o.ga=0.32;o.li=2.4;}}
    else{const t=te-TH[last];o.g.copy(E[last]);o.gs=1+2.2*Math.min(t,0.5);o.ga=0.1+0.55*Math.exp(-t*9);o.li=1.2+6*Math.exp(-t*5);}
    if(last>=0&&last<3&&te>TL[last+1]&&te<TH[last+1]&&te-TH[last]>0.2){arcPt(S[last+1],E[last+1],HA,cl((te-TL[last+1])/FL),o.g);o.gs=0.85;o.ga=0.32;o.li=2.4;}
    o.ia=last>=0?te-TH[last]:te-TH[0]; o.c.copy(E[Math.max(last,0)]); o.shake=0; o.dist=0.45; o.flash=0;
  };
}};

// =====================================================================
// 4 · PERSIMMON — un caqui luminiscente madura en la cabeza, cae y rueda hasta el aliado; se abre en cuatro
//     gajos de piel y su pulpa se hincha en una cúpula gelatinosa que tiembla, con fibras y semillas suspendidas
// =====================================================================
const persimmon={key:"pcPersimmon",name:"Persimmon",dur:2.4,ti:0.95,pal:"Ámbar",allies:1,
  phases:[["Fruto",0],["Caída",0.22],["Rodada",0.36],["Apertura",0.82],["Cúpula",0.95],["Dulzor",1.3],["Disipación",1.75]],
build(a){
  const L=a.L,TF=0.22,TR=0.36,TO=0.82,TI=0.95,TD=1.75,TE=2.3,R=0.26,RY=0.82,DR=1.1;
  const AP=ALLY_POS[0], P0=V3(-3.48,2.2,0.05), A=V3(-2.85,0,0.4), CB=V3(-0.35,0,0.95), B=V3(AP.x,0,AP.z+0.62);
  // longitud de arco de la rodada (tabla) para que el giro case con el avance
  const LEN=[0]; {let pv=qb(A,CB,B,0,V3(0,0,0)),pt=V3(0,0,0);for(let i=1;i<=100;i++){qb(A,CB,B,i/100,pt);LEN.push(LEN[i-1]+pt.distanceTo(pv));pv.copy(pt);}}
  const rollK=te=>{const k=cl((te-TR)/(TO-TR));return 1-Math.pow(1-k,2);};
  // piel: naranja brillante con cuatro surcos y pulpa luminosa que late por dentro; cara interior más clara
  const SKIN_FS=`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x)/6.2832;float x=fract(an*4.);
   float groove=smoothstep(.05,0.,min(x,1.-x))*smoothstep(-.2,.6,q.y);
   vec3 col=mix(vec3(.85,.24,.03),vec3(1.,.47,.08),smoothstep(-.8,.6,q.y))*(1.-groove*.3);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   float glow=(.5+.5*sin(uT*5.+q.y*3.))*(1.-fr)*uA;
   vec3 c=col*${LIT}+vec3(1.,.9,.75)*${SPEC(24)}*.6+uC1*(glow*.7+fr*.25);
   if(!gl_FrontFacing)c=mix(vec3(1.,.62,.2),uC1,.3)*(.8+.4*noise(vP*20.))+uC1*.3;
   gl_FragColor=vec4(c,1.);}`;
  const skinMat=fx(SKIN_FS,DS);
  const fruitG=new THREE.Group(); L.mesh.add(fruitG);
  const fruit=new THREE.Mesh(new THREE.SphereGeometry(R,36,26),skinMat); fruit.scale.y=RY;
  const halo=new THREE.Mesh(new THREE.SphereGeometry(R*1.25,28,20),fx(`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.5);
   gl_FragColor=vec4(mix(uC2,uC1,fr)*1.5,fr*uA);}`)); halo.scale.y=RY;
  // cáliz de cuatro sépalos
  const calyx=new THREE.Mesh(new THREE.CircleGeometry(0.17,32).rotateX(-Math.PI/2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float lobe=.55+.45*pow(abs(cos(an*2.)),.6);if(r>lobe)discard;
   vec3 c=mix(vec3(.18,.22,.06),vec3(.42,.46,.16),r/lobe)*(gl_FrontFacing?1.:.6);
   gl_FragColor=vec4(c*${LIT},1.);}`,DS)); calyx.position.y=R*RY+0.005;
  fruitG.add(fruit,halo,calyx);
  // cuatro gajos de piel con bisagra en la base
  const peelG=new THREE.Group(); peelG.scale.y=RY; L.mesh.add(peelG);
  const peels=[0,1,2,3].map(i=>{const piv=new THREE.Group(),phc=i*Math.PI/2+Math.PI/4;
    const m=new THREE.Mesh(new THREE.SphereGeometry(R,16,14,i*Math.PI/2,Math.PI/2,0,Math.PI*0.92).translate(0,R,0),skinMat);
    piv.add(m); piv.position.y=-R; piv.userData={k:V3(Math.sin(phc),0,Math.cos(phc))}; peelG.add(piv); return piv;});
  // cúpula de pulpa: gelatina translúcida (mezcla normal) + brillo interior con fibras (aditivo)
  const domeG=new THREE.Group(); L.mesh.add(domeG);
  const jelly=new THREE.Mesh(new THREE.SphereGeometry(DR,56,32,0,Math.PI*2,0,Math.PI/2),fx(`
  void main(){float h=vP.y/${f(DR)};if(h>uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
   float n1=noise(vP*3.+vec3(0.,uT*.4,0.));
   float fib=pow(1.-abs(noise(vec3(vP.x*4.,vP.y*13.+n1*3.,vP.z*4.))*2.-1.),14.);
   float seed=smoothstep(.84,.9,noise(vP*5.5+vec3(4.)));
   vec3 c=mix(mix(vec3(1.,.42,.06),vec3(1.,.68,.28),n1),vec3(.22,.09,.03),seed);
   gl_FragColor=vec4(c*(1.+fr*.4),(.14+fr*.4+fib*.22+seed*.6)*uA);}`,NB));
  const pulp=new THREE.Mesh(new THREE.SphereGeometry(DR*0.97,48,28,0,Math.PI*2,0,Math.PI/2),fx(`
  void main(){float h=vP.y/${f(DR*0.97)};if(h>uP)discard;
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
   float fib=pow(1.-abs(noise(vec3(vP.x*5.,vP.y*16.-uT*.5,vP.z*5.))*2.-1.),18.);
   float front=band(h,uP,.05)*step(uP,.99);
   gl_FragColor=vec4(mix(uC2,uC1,fr+fib)*1.3+vec3(1.)*front*.5,(fr*.5+fib*.45+front)*uA);}`));
  domeG.add(jelly,pulp);
  // partículas
  const C=`const float TF=${f(TF)};const float TR=${f(TR)};const float TO=${f(TO)};const float TI=${f(TI)};const float TD=${f(TD)};
  const vec3 A=${v3(A)};const vec3 CB=${v3(CB)};const vec3 B=${v3(B)};const vec3 AP=${v3(AP)};const vec3 P0=${v3(P0)};
  vec3 bz(float t){float u=1.-t;return u*u*A+2.*u*t*CB+t*t*B;}
  float rk(float t){float k=clamp((t-TR)/(TO-TR),0.,1.);return 1.-(1.-k)*(1.-k);}`;
  // luz que madura el fruto en la cabeza
  a.count+=points(L.part,60,C+`void main(){float s=aSeed.x*(TF-.05);float life=.25;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(P0+normalize(rnd())*(.4+.3*aSeed.y),P0,k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.035+.035*aSeed.z);}`);
  // néctar que deja al rodar y motas brillantes
  a.count+=points(L.part,80,C+`void main(){float s=TR+aSeed.x*(TO-TR);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz(rk(s))+vec3((aSeed.z-.5)*.25,.02,(aSeed.w-.5)*.25);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*12.+aSeed.z*20.)):0.;put(p,.04+.04*aSeed.w);}`);
  a.count+=points(L.part,60,C+`void main(){float s=TR+aSeed.x*(TO-TR);float life=.3+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz(rk(s))+vec3(0.,${f(R*RY)},0.)+rnd()*.15+vec3(0.,.6*t,0.)+rnd()*.3*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.025+.035*aSeed.w)*(1.-age*.4));}`);
  // salpicadura de pulpa al abrirse
  a.count+=points(L.part,80,C+`void main(){float s=TO+.08+aSeed.x*.05;float life=.5+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(0.,1.2,0.))*(1.+2.*aSeed.z);vec3 p=B+vec3(0.,.22,0.)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.05+.055*aSeed.w);}`,DROP_FS("vec3(1.,.5,.1)"),NB);
  a.count+=sparks(L.part,90,TO+0.08,`${f(B.x)},.3,${f(B.z)}`,"0.,.9,0.",1.8,5.5,2.5);
  // semillas y hebras suspendidas dentro de la cúpula, que derivan despacio
  a.count+=points(L.part,30,C+`void main(){vec3 r=rnd();float an=aSeed.x*6.2832+uT*(.15+.1*aSeed.y);float rad=.17+.72*aSeed.z;
   vec3 p=AP+vec3(cos(an)*rad,.22+aSeed.w*.72*(1.-rad*.5)+sin(uT*1.3+aSeed.x*9.)*.05,sin(an)*rad);
   vA=uE*.95;put(p,.095+.04*aSeed.y);vMix=aSeed.w+uT*.08;}`,SEED_FS,NB);
  a.count+=points(L.part,50,C+`void main(){float an=aSeed.x*6.2832+uT*(.2+.1*aSeed.y);float rad=.13+.8*aSeed.z;
   vec3 p=AP+vec3(cos(an)*rad,.1+aSeed.w*.93*(1.-rad*.6)+sin(uT*2.+aSeed.x*7.)*.05,sin(an)*rad);
   vA=uE*(.5+.5*sin(uT*3.+aSeed.y*20.));put(p,(.035+.04*aSeed.y)*uE);}`);
  // gotas de néctar que caen del techo de la cúpula y dulzor que sube
  a.count+=points(L.part,45,C+`void main(){float life=.6+aSeed.y*.25;float k=(uT-TI-.2)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.25+.5*r.y;vec3 p=AP+vec3(cos(an)*rad,.93*(1.-rad*.55)-age*age*1.,sin(an)*rad);
   vA=(k>=1.&&p.y>.03)?smoothstep(0.,.1,age)*uE:0.;put(p,.05+.025*r.z);}`,DROP_FS("vec3(1.,.55,.15)"),NB);
  a.count+=points(L.part,50,C+`void main(){float life=.75+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=AP+vec3((r.x-.5)*.85,.1+r.y*.35+age*1.35,(r.z-.5)*.85);
   vA=(k>=1.)?sin(age*3.14159)*uE:0.;put(p,(.08+.1*r.z)*sin(age*3.14159));}`,STAR4_FS);
  // la cúpula se derrite en goterones
  a.count+=points(L.part,70,C+`void main(){float s=TD+aSeed.x*.25;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(vec3(rnd().x,.3+aSeed.y,rnd().z));vec3 p=AP+d*${f(DR)}*(1.-clamp((s-TD)/.35,0.,1.)*.7)+vec3(0.,-3.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.-age*age:0.;put(p,.07+.05*aSeed.w);}`,DROP_FS("vec3(1.,.5,.1)"),NB);
  // rastro pegajoso del néctar en el suelo (cinta sobre la curva de rodada)
  const N=60,pos=[],uvs=[],idx=[],pa=V3(0,0,0),pb=V3(0,0,0);
  for(let i=0;i<=N;i++){const t=i/N;qb(A,CB,B,t,pa);qb(A,CB,B,Math.min(t+0.01,1),pb);if(i===N)qb(A,CB,B,t-0.01,pb).sub(pa).multiplyScalar(-1).add(pa);
    const dx=pb.x-pa.x,dz=pb.z-pa.z,l=Math.hypot(dx,dz)||1,sx=-dz/l*0.13,sz=dx/l*0.13;
    pos.push(pa.x-sx,0.019,pa.z-sz,pa.x+sx,0.019,pa.z+sz);uvs.push(t,0,t,1);if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));sg.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));sg.setIndex(idx);sg.computeVertexNormals();
  const smear=new THREE.Mesh(sg,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;if(u>uP)discard;
   float n=noise(vec3(u*30.,vUv.y*4.,1.));float m=smoothstep(.7+.3*n,.2,v);
   gl_FragColor=vec4(mix(uC2,uC1,n)*1.3+vec3(1.)*smoothstep(.85,1.,n)*.4,m*(.45+.4*n)*uA);}`));
  // charco de néctar con ondas bajo el aliado
  const pool=groundPlane(2.7,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float n=noise(vec3(p*7.,uT*.3));
   float m=smoothstep(.85,.7,r+(n-.5)*.15);float rip=band(fract(r*3.-uT*.6),.5,.08)*smoothstep(.85,.2,r);
   gl_FragColor=vec4(mix(uC2,uC1,.5+.5*n)*1.2+vec3(1.)*rip*.3,(m*.35+rip*.35)*uA);}`)); pool.position.z=AP.z;
  const burst=groundPlane(3.2,AP.x,0.03,fx(RING_FS)); burst.position.z=AP.z;
  L.decal.add(smear,pool,burst);
  const pt=V3(0,0,0), ax=V3(0,0,0), d1=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, io=te-TO;
    caster.rotation.z=0.09*ss(0,TF,te)-0.15*ss(TF,TF+0.08,te)+0.06*ss(TF+0.08,TR+0.25,te);
    // fruto: madura en la cabeza, cae botando y rueda por la curva
    const grow=ss(0,TF,te),pulse=1+0.05*Math.sin(te*14)*(te<TO?1:0);
    if(te<TF){fruitG.position.copy(P0);fruitG.quaternion.setFromAxisAngle(YA,te*2);}
    else if(te<TR){const k=cl((te-TF)/(TR-TF));fruitG.position.set(P0.x+(A.x-P0.x)*k,R*RY+(P0.y-R*RY)*(1-k*k)+0.18*Math.sin(Math.PI*cl((k-0.75)/0.25))*(k>0.75?1:0),P0.z+(A.z-P0.z)*k);fruitG.quaternion.setFromAxisAngle(YA,TF*2);}
    else{const t=rollK(te);qb(A,CB,B,t,pt);const li=Math.min(Math.floor(t*100),99),fr=t*100-li,len=LEN[li]+(LEN[li+1]-LEN[li])*fr;
      qb(A,CB,B,Math.min(t+0.01,1),d1); if(t>0.99)qb(A,CB,B,0.99,d1).sub(pt).multiplyScalar(-1).add(pt);
      ax.set(d1.z-pt.z,0,-(d1.x-pt.x)).normalize();
      fruitG.position.set(pt.x,R*RY,pt.z); fruitG.quaternion.setFromAxisAngle(ax,len/R);}
    fruitG.visible=te<TO+0.1; fruitG.scale.setScalar(Math.max(grow*pulse*(1+0.15*ss(TO-0.05,TO+0.1,te)),0.001));
    skinMat.uniforms.uA.value=0.6+0.4*Math.sin(te*6)+0.8*ss(TO-0.1,TO+0.1,te);
    halo.material.uniforms.uA.value=(0.5+0.3*Math.sin(te*6))*grow*(1-ss(TO,TO+0.1,te));
    // apertura: los gajos se abren como pétalos y se encogen
    const op=ss(TO+0.06,TO+0.3,te), pf=1-ss(TI+0.3,TI+0.65,te);
    peelG.visible=te>=TO+0.1&&pf>0.001; peelG.position.set(B.x,R*RY,B.z);
    for(const p of peels){p.quaternion.setFromAxisAngle(p.userData.k,1.95*op);p.scale.setScalar(Math.max(pf,0.001));}
    // cúpula: nace en el fruto, se desplaza al aliado mientras crece y tiembla como gelatina
    const g=1-Math.pow(1-cl((te-TO-0.08)/0.35),3), env=ss(TO+0.08,TI,te)*(1-ss(TD,TE,te));
    const jig=0.07*Math.sin((te-TI)*13)*Math.exp(-Math.max(te-TI,0)*2.6)*(te>=TI?1:0)+0.02*Math.sin(te*4.3)*env;
    domeG.visible=env>0.001; domeG.position.set(B.x+(AP.x-B.x)*g,0,B.z+(AP.z-B.z)*g);
    const sc=0.25+0.75*g; domeG.scale.set(sc*(1+jig),sc*(1-jig*1.4),sc*(1+jig));
    const melt=1-ss(TD,TE-0.1,te);
    set(jelly,(g*1.02)*melt+0.001,env*0.9); set(pulp,(g*1.02)*melt+0.001,env);
    smear.material.uniforms.uP.value=rollK(te); smear.material.uniforms.uA.value=te>=TR?0.85*(1-ss(TD-0.3,TE,te)):0;
    pool.material.uniforms.uA.value=ss(TI,TI+0.4,te)*(1-ss(TD,TE,te));
    let p=cl(ia/0.5); set(burst,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    U.uE.value=ss(TI,TI+0.25,te)*(1-ss(TD,TD+0.35,te));
    const pk=hitK(ia,5); allyGlow(0,0.32*env+0.55*pk);
    allies[0].scale.set(1+0.03*Math.sin(te*4.3)*env,1,1+0.03*Math.sin(te*4.3)*env);
    if(te<TO+0.1){o.g.set(fruitG.position.x,fruitG.position.y+0.05,fruitG.position.z);o.gs=0.9*grow+0.2;o.ga=0.32*grow;o.li=2.4*grow;}
    else{o.g.set(domeG.position.x,0.6,domeG.position.z);o.gs=2;o.ga=0.12*env+0.48*pk;o.li=2*env+5.5*pk;}
    o.ia=ia<0?io:ia; o.c.set(AP.x,0.7,AP.z); o.shake=0; o.dist=ia<0?0.25:0.55; o.flash=0;
  };
}};

// =====================================================================
// 5 · ROSE BUD — un zarcillo espinoso corre del lanzador al aliado; a sus pies sube un capullo que lo envuelve
//     y florece; espiral de pétalos carmesí y rocío curativo que cae y destella
// =====================================================================
const rose={key:"pcRoseBud",name:"Rose Bud",dur:2.4,ti:0.8,pal:"Rosa",allies:1,
  phases:[["Zarcillo",0],["Capullo",0.32],["Floración",0.8],["Espiral",0.95],["Rocío",1.15],["Marchitar",1.75]],
build(a){
  const L=a.L,TV=0.32,TI=0.8,TS=0.95,TW=1.15,TX=1.75,TE=2.3,AP=ALLY_POS[0],RS=0.82;
  // pétalo ahuecado: los bordes se cierran hacia el centro y la punta se curva hacia fuera
  function petalGeo(len,wid,cup,curl){const nu=8,nv=10,pos=[],uv=[],idx=[];
    for(let j=0;j<=nv;j++){const v=j/nv,hw=wid*0.5*(0.22+0.78*Math.sin(Math.min(v*1.3,1)*Math.PI/2))*(1-0.55*Math.pow(v,5));
      for(let i=0;i<=nu;i++){const s=i/nu*2-1;pos.push(s*hw,v*len,-cup*s*s*hw+curl*len*v*v*v);uv.push(i/nu,v);}}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const k=j*(nu+1)+i;idx.push(k,k+nu+1,k+1,k+1,k+nu+1,k+nu+2);}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(idx);g.computeVertexNormals();return g;}
  // terciopelo carmesí: base oscura, borde claro, vetas y brillo; uW = marchitez desde las puntas
  const petalMat=fxU(`uniform float uW;
  void main(){float v=vUv.y,u=abs(vUv.x-.5)*2.;
   vec3 c=mix(uC2*.5,mix(uC1,vec3(1.,.85,.9),.2),smoothstep(0.,1.,v*.8+u*.25))*(gl_FrontFacing?1.:.7);
   float vein=pow(1.-abs(fract(vUv.x*9.+noise(vec3(vUv*6.,1.))*.5)-.5)*2.,5.)*.18*(1.-v);
   float vel=noise(vec3(vUv*40.,2.))*.1;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   c=(c*(1.-vein)+vel)*${LIT}+uC1*fr*.3+uC1*uA*.45*(1.-v);
   c=mix(c,vec3(.32,.18,.12)*${LIT},uW*smoothstep(1.-uW,1.,v+noise(vec3(vUv*8.,3.))*.3));
   gl_FragColor=vec4(c,1.);}`,{uW:{value:0}},DS);
  const sepalMat=fx(`void main(){float v=vUv.y;vec3 c=mix(vec3(.08,.28,.07),vec3(.3,.6,.18),v)*(gl_FrontFacing?1.:.7);
   gl_FragColor=vec4(c*${LIT},1.);}`,DS);
  const roseG=new THREE.Group(); L.mesh.add(roseG);
  const RINGS=[{n:5,r:0.56,len:0.5,w:0.22,t0:-0.1,t1:1.45,d:-0.12,mat:sepalMat,cup:0.15,curl:0.1},
    {n:7,r:0.66,len:0.82,w:0.6,t0:-0.32,t1:1.2,d:0,mat:petalMat,cup:0.55,curl:0.25},
    {n:6,r:0.55,len:0.68,w:0.52,t0:-0.28,t1:0.9,d:0.08,mat:petalMat,cup:0.6,curl:0.2},
    {n:5,r:0.45,len:0.55,w:0.44,t0:-0.22,t1:0.55,d:0.16,mat:petalMat,cup:0.65,curl:0.15}];
  const petals=[];
  RINGS.forEach((R,ri)=>{const g=petalGeo(R.len,R.w,R.cup,R.curl);
    for(let i=0;i<R.n;i++){const th=(i+ri*0.5)/R.n*Math.PI*2,outer=new THREE.Group(),inner=new THREE.Group();
      outer.position.set(Math.cos(th)*R.r,0,Math.sin(th)*R.r); outer.rotation.y=Math.PI/2-th;
      inner.add(new THREE.Mesh(g,R.mat)); outer.add(inner); roseG.add(outer);
      petals.push({inner,R,j:(Math.random()-0.5)*0.12});}});
  // zarcillo espinoso por el suelo, del lanzador al aliado
  const vinePts=[V3(-3.35,0.04,0.2),V3(-2.9,0.06,0.55),V3(-2.4,0.05,0.1),V3(-2.1,0.07,-0.6),V3(-1.95,0.05,-1.1),V3(AP.x-0.5,0.04,AP.z+0.25)];
  const vineMat=fxU(`uniform float uQ;
  void main(){float u=vUv.x;if(u>uP)discard;
   float th=step(.8,fract(u*30.))*step(.55,fract(vUv.y*2.+u*3.));float n=noise(vec3(u*40.,vUv.y*5.,0.));
   vec3 c=mix(vec3(.07,.27,.07),vec3(.25,.55,.15),n)*${LIT}+vec3(.45,.08,.12)*th*.7;
   float head=smoothstep(.04,0.,uP-u)*step(uP,.995);
   c=mix(c,vec3(.25,.2,.1)*${LIT},uQ);
   gl_FragColor=vec4(c+uC1*head*1.5,1.);}`,{uQ:{value:0}},SOLID);
  const vine=new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(vinePts),90,7,0.05,0.028),vineMat); L.mesh.add(vine);
  const vleafMat=fx(LEAFM_FS,DS), vleaves=[0.25,0.45,0.62,0.8].map((u,i)=>{const m=new THREE.Mesh(leafGeo,vleafMat);
    const k=Math.floor(u*5),fr=u*5-k,p0=vinePts[k],p1=vinePts[Math.min(k+1,5)];
    m.position.set(p0.x+(p1.x-p0.x)*fr,0.07,p0.z+(p1.z-p0.z)*fr);m.rotation.set(-1.2,i*1.7,0.3);m.userData={u};L.mesh.add(m);return m;});
  // espiral de pétalos: dos cintas en hélice alrededor del aliado
  const helMat=fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;float v=abs(vUv.y-.5)*2.;
   float pet=smoothstep(.5,.15,abs(fract(u*26.-uT*1.5)-.5)*2.);
   float al=smoothstep(1.,.3,v)*(.3+.7*pet)*exp(-d*2.5)*smoothstep(0.,.05,u)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,pet)*1.5+vec3(1.)*exp(-d*30.)*.5,al);}`);
  const hel=[0,Math.PI].map(r=>{const m=new THREE.Mesh(helixGeo(2.2,0.95,0.45,2.6,0.2,160),helMat);m.position.set(AP.x,0.05,AP.z);m.rotation.y=r;m.scale.setScalar(0.8);L.trail.add(m);return m;});
  // partículas
  const C=`const float TV=${f(TV)};const float TI=${f(TI)};const float TS=${f(TS)};const float TW=${f(TW)};const float TX=${f(TX)};const vec3 AP=${v3(AP)};`;
  // pétalos que se desprenden de la zona de la cabeza y siguen al zarcillo
  a.count+=points(L.part,40,C+`void main(){float s=aSeed.x*TV;float life=.45+aSeed.y*.15;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p0=vec3(-3.55,2.05,(aSeed.z-.5)*.5);vec3 p1=AP+vec3(rnd().x*.4,.3+aSeed.w*.5,rnd().z*.4);
   vec3 p=mix(p0,p1,k)+vec3(0.,sin(k*3.14159)*.75,0.)+vec3(sin(k*9.+aSeed.w*6.)*.1,0.,cos(k*8.)*.08);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.12+.05*aSeed.w);vMix=aSeed.w+k*2.;}`,PETAL_FS,NB);
  // espiral de pétalos que sube alrededor del aliado
  a.count+=points(L.part,120,C+`void main(){float s=TS+aSeed.x*.55;float life=.75+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   float arm=step(.5,aSeed.z)*3.14159;float an=arm+age*13.8+aSeed.w*.5;float rad=.78-.4*age+(aSeed.y-.5)*.12;
   vec3 p=AP+vec3(cos(an)*rad,.05+age*2.15,sin(an)*rad);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.12+.06*aSeed.w);vMix=aSeed.w+t*(1.+aSeed.y);}`,PETAL_FS,NB);
  // rocío: gotas que caen y destellan al tocar los pétalos o al aliado
  a.count+=points(L.part,80,C+`void main(){float life=.7+aSeed.y*.25;float k=(uT-TW)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   float an=r.x*6.2832;float rad=.12+.74*r.y;float yl=.12+r.z*1.05;float fa=clamp(age/.8,0.,1.);float g=clamp((age-.8)/.2,0.,1.);
   vec3 p=AP+vec3(cos(an)*rad,mix(2.7,yl,fa*fa),sin(an)*rad);
   vA=(k>=1.)?(age<.8?smoothstep(0.,.15,fa):1.-g)*uE:0.;put(p,age<.8?.075+.04*r.z:.24*(1.-g)+.05);vMix=age<.8?0.:2.;}`,DEWG_FS);
  // gotitas de rocío que brillan quietas sobre la flor abierta
  a.count+=points(L.part,30,C+`void main(){float an=aSeed.x*6.2832;float rad=.45+.62*aSeed.y;
   vec3 p=AP+vec3(cos(an)*rad,.08+.1*aSeed.z,sin(an)*rad);
   vA=uE*(.4+.6*pow(.5+.5*sin(uT*3.+aSeed.w*30.),6.));put(p,.06+.04*aSeed.w);}`,STAR4_FS);
  a.count+=sparks(L.part,80,TI,`${f(AP.x)},.4,${f(AP.z)}`,"0.,1.2,0.",1.8,5.5,2);
  // al marchitar, los pétalos se sueltan y vuelan
  a.count+=points(L.part,60,C+`void main(){float s=TX+aSeed.x*.25;float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;float rad=.42+.5*aSeed.w;
   vec3 p=AP+vec3(cos(an)*rad,.12,sin(an)*rad)+vec3(cos(an)*.8*t+sin(t*3.+aSeed.y*9.)*.2,1.5*t-.4*t*t,sin(an)*.8*t);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age):0.;put(p,.12+.06*aSeed.w);vMix=aSeed.w+t*1.4;}`,PETAL_FS,NB);
  // roseta luminosa bajo el aliado
  const rosette=groundPlane(2.8,AP.x,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)+uT*.15;
   float lobes=.5+.32*pow(abs(cos(an*3.5)),.7);float m=band(r,lobes*uP,.025)+band(r,lobes*uP*.62,.02)*.8+band(r,.95*uP,.012);
   float fill=smoothstep(lobes*uP,lobes*uP*.3,r)*.18;
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.4,(m+fill)*uA);}`)); rosette.position.z=AP.z;
  const bloom=groundPlane(3.4,AP.x,0.03,fx(RING_FS)); bloom.position.z=AP.z;
  L.decal.add(rosette,bloom);
  const lp=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI;
    caster.rotation.z=0.1*ss(0,0.2,te)-0.15*ss(0.2,0.3,te)+0.05*ss(0.3,0.6,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.15,te)*(1-ss(0.3,0.7,te));
    // zarcillo
    const vg=ss(0.02,TV,te), wilt=ss(TX,TE,te);
    vine.visible=vg>0.001; set(vine,vg*1.01,0); vineMat.uniforms.uQ.value=wilt;
    vleaves.forEach(l=>{const s=ss(l.userData.u,l.userData.u+0.1,vg)*(1-wilt);l.visible=s>0.01;l.scale.setScalar(Math.max(0.22*s,0.001));});
    vleafMat.uniforms.uA.value=0;
    // capullo: sube del suelo envolviendo los pies del aliado y se abre por anillos
    const up=ss(TV,TV+0.32,te), sh=1-ss(TX+0.15,TE,te);
    roseG.visible=te>=TV&&sh>0.001; roseG.position.set(AP.x,(-0.85*(1-up)-0.4*(1-sh))*RS,AP.z);
    roseG.scale.setScalar(Math.max(RS*(0.65+0.35*up)*(0.4+0.6*sh),0.001));
    roseG.rotation.y=0.25*Math.sin(te*1.3)*0.2+(1-ss(TV,TI,te))*0.6;
    for(const p of petals){const R=p.R,ob=ss(TI-0.1+R.d*0.7,TI+0.24+R.d*0.7,te),br=0.04*Math.sin(te*2.5+R.r*9)*ob;
      p.inner.rotation.x=R.t0+(R.t1-R.t0)*ob+br+p.j+0.3*wilt;}
    petalMat.uniforms.uW.value=wilt; petalMat.uniforms.uA.value=0.8*hitK(ia,3.5)*(ia>=0?1:0)+0.18*ss(TI,TI+0.3,te)*(1-wilt);
    // espiral
    const hp=cl((te-TS)/0.45);
    for(const h of hel){h.visible=te>=TS&&te<TX+0.2;set(h,hp*1.15,(1-ss(TW+0.3,TX+0.2,te))*0.8);}
    const env=ss(TW-0.1,TW+0.15,te)*(1-ss(TX,TX+0.3,te));
    U.uE.value=env;
    set(rosette,ss(TI-0.1,TI+0.3,te),0.85*ss(TV,TV+0.3,te)*(1-ss(TX,TE,te)));
    let p=cl(ia/0.55); set(bloom,1-Math.pow(1-p,2),ia>=0?(1-p)*0.7:0);
    const pk=hitK(ia,4)*(ia>=0?1:0); allyGlow(0,0.22*ss(TI,TI+0.25,te)*(1-wilt)+0.3*env*(0.6+0.4*Math.sin(te*7))+0.48*pk);
    if(te<TV){lp.set(-3.4+(AP.x+0.1)*vg,0.3,0.2+(AP.z-0.2)*vg);o.g.copy(lp);o.gs=0.8;o.ga=0.3*vg;o.li=1.8;}
    else{o.g.set(AP.x,0.5+0.4*env,AP.z);o.gs=1.8+0.4*env;o.ga=0.1+0.12*env+0.48*pk;o.li=1.6+2*env+5.5*pk;}
    o.ia=ia; o.c.set(AP.x,0.6,AP.z); o.shake=0; o.dist=0.45; o.flash=0;
  };
}};

// =====================================================================
// 6 · STRAWBERRY SHORTCAKE — el aliado más herido late con grietas rojas; un pastelito de fresa vuela en parábola,
//     estalla en una nube de crema rosa que salpica; un aro de nata desciende sobre él y cierra las heridas
//     (nivel 3: pastel y estallido más grandes; el estallido agrieta las baldosas de luz bajo el aliado)
// =====================================================================
const cake={key:"pcShortcake",name:"Strawberry Shortcake",dur:3.3,ti:1.18,pal:"Fresa",allies:2,
  phases:[["Herida",0],["Lanzamiento",0.55],["Estallido",1.18],["Crema",1.4],["Curación",1.75],["Fin",2.75]],
build(a){
  const L=a.L,TL=0.55,TI=1.18,TC2=1.45,TH=2.15,TEND=2.75,AP=ALLY_POS[0],S0=V3(-3.55,2.35,0.05),E=V3(AP.x,1.7,AP.z),HA=1.6,RR=0.74;
  const CH=V3(AP.x,1.05,AP.z);
  // pastelito: bizcocho, nata, láminas de fresa y nata arriba; dollop con remolino y una fresa
  const cakeG=new THREE.Group(); L.mesh.add(cakeG); const CS=1.35;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.24,30),fx(`void main(){float y=vP.y;float an=atan(vP.z,vP.x);
   float pores=smoothstep(.62,.7,noise(vP*55.));vec3 sponge=mix(vec3(1.,.83,.48),vec3(.92,.7,.36),noise(vP*20.))*(1.-pores*.35);
   vec3 cream=mix(vec3(1.,.97,.95),uC1,.12);float sl=.5+.5*sin(an*14.);vec3 berry=mix(vec3(.85,.08,.18),vec3(1.,.55,.6),sl*smoothstep(.17,.2,length(vP.xz)));
   vec3 c=y<-.03?sponge:(y<0.?cream:(y<.03?berry:(y<.1?sponge:cream)));
   gl_FragColor=vec4(c*${LIT}+uC1*uA*.4,1.);}`,SOLID));
  const dollop=new THREE.Mesh(new THREE.SphereGeometry(0.14,28,18),fx(`void main(){vec3 q=normalize(vP);float an=atan(q.z,q.x);
   float ridge=.5+.5*sin(an*6.+q.y*14.);vec3 c=mix(vec3(1.,.95,.95),uC1,.15+.1*ridge)*(.85+.25*ridge);
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(20)}*.25,1.);}`,SOLID)); dollop.scale.set(1,0.7,1); dollop.position.y=0.16;
  const berry=new THREE.Mesh(new THREE.SphereGeometry(0.075,22,16),fx(`void main(){vec3 q=normalize(vP);
   vec2 g=vec2(atan(q.z,q.x)*3.,q.y*6.);vec2 fq=fract(g)-.5;float seed=smoothstep(.12,.06,length(fq*vec2(1.,1.6)));
   vec3 c=mix(vec3(.85,.06,.12),vec3(1.,.85,.35),seed)*(1.-smoothstep(.6,1.,q.y)*.2);
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(30)}*.5,1.);}`,SOLID)); berry.scale.set(1,1.3,1); berry.position.y=0.28;
  const leafMat=new THREE.MeshStandardMaterial({color:0x3b8a2a,roughness:0.6});
  const crown=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.05,6).rotateX(Math.PI),leafMat); crown.position.y=0.37;
  cakeG.add(body,dollop,berry,crown);
  // estela: manga pastelera, tubo con rizos de crema que se revela por la parábola
  const pipe=new THREE.Mesh(pathTube((t,o)=>arcPt(S0,E,HA,t,o),24,70,10,0.095,0.07),fx(`void main(){float u=vUv.x;float d=uP-u;if(d<0.||d>.45)discard;
   float sw=.5+.5*sin(u*90.+vUv.y*6.2832*2.-uT*8.);float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC1,vec3(1.,.95,.97),sw*.6)*1.3,(.25+.5*sw)*(.4+.6*fr)*exp(-d*6.)*uA);}`)); L.trail.add(pipe);
  // nube de crema: esfera aditiva rosa que se deshace
  const puff=new THREE.Mesh(new THREE.SphereGeometry(1,32,22),fx(`void main(){float n=noise(vP*2.6+vec3(0.,uT*.5,0.))*.6+noise(vP*6.)*.4;
   float th=uP*1.1-.15;if(n<th)discard;float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.3);
   gl_FragColor=vec4(mix(uC1,vec3(1.,.95,.97),.4+.4*n)*1.2,(.1+.5*fr)*smoothstep(0.,.15,n-th)*(1.-uP));}`)); puff.position.copy(E);
  // heridas del aliado más dañado (rojo fijo: indicador de daño) que se cierran de dentro afuera
  const wound=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.4),fxU(`uniform float uQ;
  void main(){vec2 p=(vUv-.5)*2.;p.y*=1.25;float r=length(p);float an=atan(p.y,p.x);
   float j=noise(vec3(r*6.,an*2.,3.))-.5;
   float c1=pow(1.-abs(fract(an*1.1+j*.6)*2.-1.),18.)*smoothstep(.95,.1,r)*step(.06,r);
   float c2=pow(1.-abs(fract(an*2.3+j*1.1+.4)*2.-1.),24.)*smoothstep(.6,.1,r);
   float cr=max(c1,c2);float fq=uQ*1.25;float open=smoothstep(fq-.1,fq,r);float seal=band(r,fq,.09)*cr*step(.001,uQ)*step(uQ,.99);
   gl_FragColor=vec4(vec3(1.,.12,.1)*1.7*cr*open*(.6+.4*uP)+uC1*seal*2.,(cr*open*(.55+.45*uP)+seal)*uA);}`,{uQ:{value:0}},{depthTest:false}));
  // aro de nata que baja sobre el aliado
  const ring=new THREE.Mesh(new THREE.TorusGeometry(RR,0.1,14,56).rotateX(Math.PI/2),fx(`void main(){
   float pip=.5+.5*sin(vUv.x*6.2832*20.+vUv.y*6.2832);vec3 c=mix(vec3(1.,.95,.96),uC1,.2+.25*pip)*(.8+.3*pip);
   float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
   gl_FragColor=vec4(c*${LIT}+uC1*fr*.6*uA,1.);}`,SOLID));
  L.mesh.add(puff,wound,ring);
  // partículas
  const C=`const float TL=${f(TL)};const float TI=${f(TI)};const float TC2=${f(TC2)};const float TH=${f(TH)};const vec3 S0=${v3(S0)};const vec3 E=${v3(E)};const vec3 AP=${v3(AP)};
  vec3 fly(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(S0,E,k)+vec3(0.,${f(4*HA)}*k*(1.-k),0.);}
  float ry(float t){return 2.15-2.05*smoothstep(TC2,TH,t);}`;
  // azúcar rosa que se arremolina al materializarse el pastel
  a.count+=points(L.part,90,C+`void main(){float s=.1+aSeed.x*(TL-.15);float life=.3;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   float an=aSeed.y*6.2832+k*5.;vec3 p=S0+vec3(cos(an),(aSeed.z-.5)*.7,sin(an))*.75*(1.-k);
   vA=(age>0.&&age<1.)?sin(k*3.14159):0.;put(p,.045+.045*aSeed.w);}`);
  // virutas de colores en la estela
  a.count+=points(L.part,170,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.55+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=fly(s)+rnd()*.13+vec3(0.,-2.*t*t,0.)+rnd()*.35*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.12+.07*aSeed.w);vMix=aSeed.z+t*.5;}`,SPRINKLE_FS);
  // estallido: bolas de crema que se expanden y caen, salpicaduras balísticas y trocitos de fresa
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.08;float life=1.1+aSeed.y*.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=E+normalize(rnd())*(.4+1.2*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,-.25*t*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.05,age)*(1.-age):0.;put(p,(.45+.4*aSeed.w)*(.7+age*.6));}`,CREAM_FS,NB);
  a.count+=points(L.part,180,C+`void main(){float s=TI+aSeed.x*.05;float life=.95+aSeed.y*.5;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(0.,.7,0.))*(2.6+4.*aSeed.z);vec3 p=E+v*t+vec3(0.,-7.*t*t,0.);p.y=max(p.y,.025);
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.12+.1*aSeed.w)*(p.y<.03?1.4:1.));}`,CREAM_FS,NB);
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.04;float life=.85+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(0.,.9,0.))*(2.+3.2*aSeed.z);vec3 p=E+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.1+.06*aSeed.w);}`,DROP_FS("vec3(.9,.08,.18)"),NB);
  a.count+=points(L.part,110,C+`void main(){float s=TI+aSeed.x*.2;float life=.75+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=E+normalize(rnd())*(.5+1.6*aSeed.z)*(1.-exp(-t*3.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.14+.14*aSeed.w)*sin(age*3.14159));}`,STAR4_FS);
  a.count+=sparks(L.part,240,TI,`${f(E.x)},${f(E.y)},${f(E.z)}`,"0.,.4,0.",4,11,2.6);
  // curación: brillos que deja el aro de nata a su paso y corazones que suben
  a.count+=points(L.part,180,C+`void main(){float s=TC2+aSeed.x*(TH-TC2);float life=.6+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*${f(RR)},ry(s),sin(an)*${f(RR)})+vec3(cos(an)*.35*t,.3*t,sin(an)*.35*t);
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,.045+.055*aSeed.w);}`);
  a.count+=points(L.part,30,C+`void main(){float s=TC2+.2+aSeed.x*1.;float life=.9+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=AP+vec3((aSeed.z-.5)*1.2,.6+aSeed.w*.9+t*1.,(aSeed.y-.5)*1.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.22+.09*aSeed.w);}`,HEART_FS);
  // anillo rojo de alerta bajo el aliado herido y salpicón de nata (centrado bajo él)
  const alert=groundPlane(2.2,AP.x,0.022,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.86,.03)+band(r,.7,.015)+band(r,.78,.05)*step(.5,fract(an/6.2832*12.-uT*.4))*.6;
   gl_FragColor=vec4(vec3(1.,.15,.12)*1.5,m*(.55+.45*uP)*uA);}`)); alert.position.z=AP.z;
  const splat=groundPlane(3.6,AP.x,0.018,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*6.,2.));float lobes=.45+.12*sin(an*7.+n*3.)+.08*sin(an*13.);
   float m=smoothstep(.04,0.,r-lobes*uP);float dots=smoothstep(.72,.78,noise(vec3(p*12.,5.)))*step(lobes*uP,r)*smoothstep(1.,.6,r)*step(.3,uP);
   gl_FragColor=vec4(mix(vec3(1.,.96,.95),uC1,.25+.25*n)*(.85+.2*n),(m+dots)*.85*uA);}`,NB)); splat.position.z=AP.z;
  const shock=groundPlane(5.6,AP.x,0.03,fx(RING_FS)); shock.position.z=AP.z;
  // fractura energética (nivel 3): el estallido agrieta las baldosas de luz bajo el aliado
  const FS=5.6, frac=groundPlane(FS,AP.x,0.025,fx(tileFractureFS(FS))); frac.position.z=AP.z;
  L.decal.add(alert,splat,shock,frac);
  const wp=V3(0,0,0), WRED=new THREE.Color().setRGB(1,0.12,0.1);
  a.pose=function(te,o){
    const ia=te-TI, beat=Math.pow(0.5+0.5*Math.sin(te*9),3);
    caster.rotation.z=0.12*ss(0.1,TL,te)-0.3*ss(TL,TL+0.08,te)+0.18*ss(TL+0.1,TL+0.6,te);
    // pastel: se materializa sobre la cabeza y vuela girando
    const mat=ss(0.15,TL,te), k=cl((te-TL)/(TI-TL));
    cakeG.visible=te>=0.15&&te<TI; if(te<TL)cakeG.position.set(S0.x,S0.y+0.04*Math.sin(te*6),S0.z);else arcPt(S0,E,HA,k,cakeG.position);
    cakeG.scale.setScalar(Math.max(CS*mat*(1+0.25*ss(TI-0.06,TI,te)),0.001)); cakeG.rotation.set(0.25*Math.sin(te*5),te*3+(te>TL?(te-TL)*8:0),te>TL?-0.5*k:0);
    body.material.uniforms.uA.value=0.5*(1-mat)+0.5*ss(TI-0.08,TI,te);
    pipe.visible=te>=TL&&te<TI+0.4; set(pipe,te<TI?k:1+(te-TI)*1.3,te<TI?1:1-cl(ia/0.4));
    const pp=cl(ia/0.85); puff.visible=ia>=0&&pp<1; puff.scale.setScalar(0.4+1.75*(1-Math.pow(1-pp,3))); puff.material.uniforms.uP.value=pp;
    // herida: late antes del pastel y se cierra mientras baja el aro de nata
    const heal=cl((te-TC2)/(TH-TC2));
    towardCam(wp,CH,0.5); wound.position.copy(wp); billboard(wound);
    wound.visible=heal<0.999; wound.material.uniforms.uQ.value=heal; set(wound,beat,ss(0,0.25,te));
    set(alert,beat,ss(0,0.25,te)*(1-ss(TI,TI+0.4,te)));
    const rv=te>=TC2-0.1&&te<TH+0.25; ring.visible=rv;
    ring.position.set(AP.x,2.15-2.05*ss(TC2,TH,te),AP.z);
    ring.scale.setScalar(Math.max(ss(TC2-0.1,TC2+0.1,te)*(1-ss(TH,TH+0.25,te))*(1+0.05*Math.sin(te*12)),0.001));
    ring.material.uniforms.uA.value=1;
    set(splat,1-Math.pow(1-cl(ia/0.35),3),ia>=0?1-ss(TEND-0.2,3.25,te):0);
    let p=cl(ia/0.6); set(shock,1-Math.pow(1-p,2),ia>=0?1-p:0);
    set(frac,1-Math.pow(1-cl(ia/0.5),2),ia>=0?1-ss(TI+1.1,TEND+0.3,te):0);
    // aliado herido: rojo intermitente → rosa curado
    const red=ss(0,0.25,te)*(1-ss(TC2,TC2+0.4,te)), pink=ss(TC2,TC2+0.3,te)*(1-ss(TEND-0.3,3.25,te));
    if(red>pink*1.5)allyGlow(0,0.45*red*beat,WRED);else allyGlow(0,0.5*pink+0.7*hitK(ia,6));
    allies[0].rotation.z=0.04*Math.sin(te*3)*red;
    U.uE.value=pink;
    if(te<TL){o.g.copy(S0);o.gs=0.9*mat;o.ga=0.35*mat;o.li=2*mat;}
    else if(te<TI){arcPt(S0,E,HA,k,o.g);o.gs=1;o.ga=0.4;o.li=3;}
    else if(te<TC2){o.g.copy(E);o.gs=1.9+5*ia;o.ga=0.95*Math.exp(-ia*8);o.li=13*Math.exp(-ia*4.5);}
    else{o.g.set(AP.x,ring.position.y,AP.z);o.gs=2.2;o.ga=0.25*pink*(rv?1:0.4);o.li=3.5*pink;}
    o.ia=ia; o.c.copy(E); o.shake=1.4; o.dist=1.1; o.flash=0;
  };
}};

// =====================================================================
// 7 · WATERMELON — una sandía gigante crece de un zarcillo, rueda dando tumbos por la cuadrícula y revienta contra
//     el rival: jugo, semillas disparadas, cascos de corteza y estrellitas de aturdimiento
// =====================================================================
const melon={key:"pcWatermelon",name:"Watermelon",dur:2.3,ti:1.0,pal:"Sandía",
  phases:[["Cosecha",0],["Rodada",0.35],["Estallido",1.0],["Aturdido",1.12],["Fin",1.95]],
build(a){
  const L=a.L,TR=0.35,TI=1.0,TS=1.12,TSE=1.95,R=0.45,EZ=1.25,XS=-2.75,XE=2.6,JUICE="mix(vec3(1.,.16,.26),uC1,.3)";
  const mx=te=>XS+(XE-XS)*Math.pow(cl((te-TR)/(TI-TR)),1.6);
  // corteza: rayas verde oscuro irregulares a lo largo del eje z; uA = grietas rojas antes de reventar
  const RIND=`float rind(vec3 q){float an=atan(q.y,q.x)/6.2832;float w=noise(vec3(q.z*3.,an*4.,1.))*.25+noise(vec3(q.z*9.,an*12.,2.))*.08;
   return smoothstep(.42,.5,abs(fract(an*9.+w)-.5)*2.);}`;
  const melonM=new THREE.Mesh(new THREE.SphereGeometry(R,44,30),fx(RIND+`void main(){vec3 q=normalize(vP);float st=rind(q);
   vec3 c=mix(vec3(.42,.68,.28),vec3(.06,.24,.08),st)*(.9+.2*noise(vP*30.));
   float cr=pow(1.-abs(noise(vP*5.)*2.-1.),12.)*uA;
   gl_FragColor=vec4(c*${LIT}+vec3(1.)*${SPEC(16)}*.3+mix(vec3(1.,.2,.3),uC1,.4)*cr*2.,1.);}`,SOLID));
  melonM.scale.z=EZ; const melonG=new THREE.Group(); melonG.add(melonM); L.mesh.add(melonG);
  // cascos: parches de esfera, corteza por fuera y pulpa roja con semillas por dentro
  const chunkMat=fx(RIND+`void main(){vec3 q=normalize(vP);vec3 c;
   if(gl_FrontFacing){float st=rind(q);c=mix(vec3(.42,.68,.28),vec3(.06,.24,.08),st);}
   else{float e=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));
    vec2 g=vec2(atan(q.y,q.x)*4.,q.z*8.);vec2 fq=fract(g)-.5;float sd=smoothstep(.1,.06,length(fq*vec2(1.,1.8)))*step(.5,hash(vec3(floor(g),1.)));
    c=mix(mix(vec3(.95,.15,.25),vec3(1.,.4,.45),noise(vP*25.)),vec3(.04),sd);c=mix(c,vec3(.85,.95,.75),smoothstep(.12,.04,e));}
   gl_FragColor=vec4(c*${LIT},1.);}`,DS);
  const chunks=[];
  for(let i=0;i<10;i++){const ph=(i%5)/5*Math.PI*2,th=i<5?0:Math.PI/2;
    const g=new THREE.SphereGeometry(R,8,6,ph,Math.PI*2/5,th,Math.PI/2);const m=new THREE.Mesh(g,chunkMat);m.scale.z=EZ;
    const pc=ph+Math.PI/5,tc=th+Math.PI/4,dir=V3(-Math.cos(pc)*Math.sin(tc),Math.cos(tc),Math.sin(pc)*Math.sin(tc));
    m.userData={dir,sp:1+Math.random()*1.3,vy:1.4+Math.random()*1.6,spin:V3(Math.random()*12-6,Math.random()*12-6,Math.random()*12-6)};chunks.push(m);L.mesh.add(m);}
  // zarcillo rizado de donde cuelga la sandía al crecer
  const vine=new THREE.Mesh(pathTube((t,o)=>o.set(XS-0.9+0.9*t+0.18*Math.sin(t*14),0.06+0.5*t*(1-t)+0.12*Math.cos(t*14)*t,-0.15+0.15*t),40,80,6,0.035,0.02),
    fx(`void main(){float u=vUv.x;if(u>uP)discard;vec3 c=mix(vec3(.12,.35,.1),vec3(.35,.6,.2),noise(vec3(u*30.,vUv.y*4.,0.)));
     gl_FragColor=vec4(c*${LIT}+uC2*uA*.4,1.);}`,SOLID)); L.mesh.add(vine);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),fx(RING_FS,{depthTest:false})); hitRing.position.copy(TC); L.mesh.add(hitRing);
  // halo de aturdimiento sobre la cabeza
  const daze=new THREE.Mesh(new THREE.RingGeometry(0.28,0.36,48).rotateX(-Math.PI/2),fx(`void main(){float an=atan(vP.z,vP.x);
   float m=.4+.6*step(.5,fract(an/6.2832*6.+uT*1.5));gl_FragColor=vec4(vec3(1.,.88,.35)*1.3,m*.5*uA);}`)); L.mesh.add(daze);
  // partículas
  const C=`const float TR=${f(TR)};const float TI=${f(TI)};const float TS=${f(TS)};const float TSE=${f(TSE)};const vec3 HP=vec3(${f(XE+0.4)},${f(R)},0.);
  float mx(float t){return ${f(XS)}+${f(XE-XS)}*pow(clamp((t-TR)/(TI-TR),0.,1.),1.6);}`;
  // hierba y tierra que levanta al rodar
  a.count+=points(L.part,50,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.3+aSeed.y*.2;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=vec3(-1.-aSeed.z,1.+1.4*aSeed.w,(aSeed.y-.5)*1.5);vec3 p=vec3(mx(s),.03,(aSeed.z-.5)*.5)+v*t+vec3(0.,-7.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.01)?1.-age:0.;put(p,.035+.03*aSeed.w);}`,EARTH_FS,NB);
  a.count+=points(L.part,40,C+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.5+aSeed.y*.25;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 p=vec3(mx(s)-.25,.05+.3*(1.-exp(-t*3.)),(aSeed.z-.5)*.75);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.2+.16*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // jugo: chorro hacia delante y arriba
  a.count+=points(L.part,150,C+`void main(){float s=TI+aSeed.x*.05;float life=.6+aSeed.y*.35;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(.25,.75,0.))*(1.6+3.2*aSeed.z);vec3 p=HP+v*t+vec3(0.,-8.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,.06+.06*aSeed.w);}`,DROP_FS(JUICE),NB);
  // semillas disparadas que acribillan al rival
  a.count+=points(L.part,80,C+`void main(){float s=TI+aSeed.x*.04;float life=.45+aSeed.y*.3;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()*vec3(.6,1.,1.)+vec3(1.1,.35,0.))*(3.+4.5*aSeed.z);vec3 p=HP+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.085+.04*aSeed.w);vMix=aSeed.w+t*3.;}`,SEED_FS,NB);
  // bruma de pulpa
  a.count+=points(L.part,60,C+`void main(){float s=TI+aSeed.x*.08;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=HP+normalize(rnd()+vec3(.2,.3,0.))*(.25+1.*aSeed.z)*(1.-exp(-t*4.))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?(1.-age)*.5:0.;put(p,(.24+.22*aSeed.w)*(.6+age));}`);
  a.count+=sparks(L.part,110,TI,`${f(XE+0.3)},${f(R+0.3)},0.`,".6,.4,0.",3,7.5,3);
  // goteo de jugo desde el rival
  a.count+=points(L.part,35,C+`void main(){float life=.45+aSeed.y*.2;float k=(uT-TI-.1)/life+aSeed.x;float c=floor(k);float age=fract(k);vec3 r=rr(c);
   vec3 p=vec3(3.1+r.x*.5,1.5-r.y*.6-age*age*1.6,(r.z-.5)*.6);
   vA=(k>=1.&&p.y>.02&&uT<TSE)?1.:0.;put(p,.06+.03*r.z);}`,DROP_FS(JUICE),NB);
  // estrellitas que giran sobre la cabeza
  const uTx={value:3.4};
  a.count+=points(L.part,7,C+`uniform float uTx;void main(){float i=floor(aSeed.x*7.);float an=i/7.*6.2832+(uT-TS)*4.5;float env=smoothstep(TS,TS+.15,uT)*(1.-smoothstep(TSE-.3,TSE,uT));
   vec3 p=vec3(uTx,2.1+.05*sin(uT*7.+i),0.)+vec3(cos(an)*.36,0.,sin(an)*.36);
   vA=env;put(p,.2*env);vMix=uT*.8+i*.3;}`,STUN_FS,{uniforms:{uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE,uTx}});
  // charco de jugo bajo el rival y rastro de la rodada
  const puddle=groundPlane(2.6,3.4,0.02,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float n=noise(vec3(p*7.,1.));float lobes=.5+.1*sin(an*6.+n*4.)+.06*sin(an*11.);
   float m=smoothstep(.03,0.,r-lobes*uP);float drops=smoothstep(.7,.76,noise(vec3(p*13.,4.)))*step(lobes*uP,r)*smoothstep(1.,.55,r)*step(.3,uP);
   gl_FragColor=vec4(mix(vec3(.75,.06,.14),vec3(1.,.35,.4),n)*(.8+.3*uC1),(m*.8+drops*.8)*uA);}`,NB));
  const track=groundPlane(XE-XS,(XE+XS)/2,0.018,fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float bump=pow(abs(sin(u*12.566)),3.);float n=noise(vec3(u*40.,vUv.y*8.,2.));
   float m=smoothstep(.7,.2,v+(n-.5)*.3)*step(u,uP)*(.35+.65*bump);
   gl_FragColor=vec4(mix(uC2,uC1,bump*.5)*1.1,m*.4*uA);}`),0.75);
  const shock=groundPlane(4.4,3.2,0.03,fx(RING_FS));
  L.decal.add(puddle,track,shock);
  a.pose=function(te,o){
    const ia=te-TI, k=cl((te-TR)/(TI-TR)), x=mx(te);
    caster.rotation.z=0.12*ss(0,TR,te)-0.3*ss(TR,TR+0.08,te)+0.18*ss(TR+0.1,TR+0.5,te);
    // crece colgada del zarcillo y luego rueda dando tumbos
    const grow=ss(0.05,TR,te);
    set(vine,ss(0,0.2,te)*1.01,grow); vine.visible=te<TR+0.4; vine.scale.setScalar(Math.max(1-ss(TR,TR+0.4,te),0.001));
    const hop=te>=TR?0.16*Math.abs(Math.sin(Math.PI*4*k))*(1-0.4*k):0;
    melonG.visible=te<TI; melonG.position.set(te<TR?XS:x,R*grow+hop,0);
    melonG.scale.setScalar(Math.max(grow*(1+0.12*ss(TI-0.08,TI,te)),0.001));
    melonG.rotation.set(te>=TR?0.22*Math.sin(Math.PI*4*k+0.5):0,0,-(x-XS)/R);
    melonM.material.uniforms.uA.value=ss(TI-0.12,TI,te);
    // cascos de corteza
    for(const c of chunks){const u=c.userData,t=Math.max(ia,0),tl=(u.vy+Math.sqrt(u.vy*u.vy+24*(R-0.25)))/12,tt=Math.min(t,tl);
      c.visible=ia>=0&&te<2.15; const h=R+u.vy*tt-6*tt*tt;
      c.position.set(XE+u.dir.x*u.sp*tt-0.3*tt,Math.max(h,0.2),u.dir.z*u.sp*tt*1.1);
      const sp=Math.min(t,tl+0.1),fd=1-ss(1.8,2.15,te); c.rotation.set(u.spin.x*sp,u.spin.y*sp,u.spin.z*sp); c.scale.set(fd+0.001,fd+0.001,EZ*fd+0.001);}
    let p=cl(ia/0.3); billboard(hitRing); set(hitRing,p,ia>=0?(1-p)*0.85:0);
    set(puddle,1-Math.pow(1-cl(ia/0.35),3),ia>=0?0.85*(1-ss(1.8,2.3,te)):0);
    set(track,k,te>=TR?1-ss(TI+0.25,1.9,te):0);
    p=cl(ia/0.5); set(shock,1-Math.pow(1-p,2),ia>=0?(1-p)*0.8:0);
    // rival: retroceso y balanceo mareado
    const hit=hitK(ia,4.5), st=ss(TS,TS+0.12,te)*(1-ss(TSE-0.25,TSE,te));
    target.position.x=3.4+hit*0.38*(1-Math.exp(-Math.max(ia,0)*18)); target.rotation.z=-hit*0.3*Math.cos(ia*13)+0.08*Math.sin((te-TS)*6)*st;
    puddle.position.x=target.position.x;
    daze.visible=st>0.001; daze.position.set(target.position.x,2.1,0); uTx.value=target.position.x; daze.material.uniforms.uA.value=st;
    if(te<TR){o.g.set(XS,R,0);o.gs=1*grow;o.ga=0.22*grow;o.li=1.6*grow;}
    else if(te<TI){o.g.set(x,R,0);o.gs=1.15;o.ga=0.3;o.li=2.4;}
    else{o.g.set(XE+0.4,R+0.2,0);o.gs=1.3+3.5*Math.min(ia,0.5);o.ga=Math.exp(-ia*10)*0.68+0.07*st;o.li=7.5*Math.exp(-ia*5)+1.2*st;}
    o.ia=ia; o.c.set(XE+0.4,R,0); o.shake=0; o.dist=0.7;
    if(st>0){o.em=0.22*st*(0.5+0.5*Math.sin(te*10)); o.emc.setRGB(1,0.88,0.35);}
  };
}};

// =====================================================================
// 8 · CACTUS — un abanico de espinas se eriza sobre la cabeza y se dispara en ráfaga; las agujas se clavan
//     por todo el cuerpo del rival con estelas verdes, tiemblan y acaban cayendo al suelo
// =====================================================================
const cactus={key:"pcCactus",name:"Cactus",dur:2.1,ti:0.7,pal:"Savia",
  phases:[["Erizado",0],["Salva",0.38],["Impactos",0.62],["Clavadas",0.95],["Caída",1.3]],
build(a){
  const L=a.L,N=16,TA=0.38,FT=0.24,TF=1.3,TE=2.05,CF=V3(-3.45,1.75,0);
  const fr=x=>x-Math.floor(x);
  const al=i=>-1.3+2.6*i/(N-1);
  const S=[],M=[],H=[],T0=[],D=[];
  for(let i=0;i<N;i++){const an=al(i);S.push(V3(CF.x-0.1*Math.abs(Math.sin(an)),CF.y+0.5*Math.cos(an),0.55*Math.sin(an)));
    const d=V3(1,0.5*Math.cos(an),0.7*Math.sin(an)).normalize();M.push(S[i].clone().addScaledVector(d,2.0));
    const y=0.45+0.7*fr(i*0.618+0.1),z=(fr(i*0.383+0.7)-0.5)*0.56,r=0.42-0.08*y/1.25;
    H.push(V3(3.4-Math.sqrt(Math.max(r*r-z*z,0.01))+0.05,y,z)); T0.push(TA+0.21*fr(i*0.618+0.05));
    D.push(H[i].clone().sub(M[i]).normalize());}
  const TH=T0.map(t=>t+FT), FIRST=Math.min(...TH), LAST=Math.max(...TH);
  // aguja: cono largo con base verdosa, cuerpo pajizo y punta que brilla
  const ndG=new THREE.ConeGeometry(0.021,0.5,8).rotateZ(-Math.PI/2).translate(-0.25,0,0);
  const ndMat=fx(`void main(){float l=vP.x/.5+1.;
   vec3 c=mix(vec3(.3,.45,.15),vec3(.92,.9,.62),smoothstep(.0,.5,l));
   gl_FragColor=vec4(c*${LIT}+uC1*pow(l,6.)*(.6+1.2*uA),1.);}`,SOLID);
  const trG=new THREE.CylinderGeometry(0.013,0.003,1,6,1,true).rotateZ(-Math.PI/2).translate(-0.5,0,0);
  const trMat=fx(`void main(){float u=vUv.y;float fr=1.-abs(dot(normalize(vN),normalize(vV)));
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.6+vec3(1.)*pow(u,8.)*.4,pow(u,1.6)*(.5+.5*fr)*uA);}`);
  const needles=[],streaks=[];
  for(let i=0;i<N;i++){const n=new THREE.Mesh(ndG,ndMat),t=new THREE.Mesh(trG,trMat);needles.push(n);streaks.push(t);L.mesh.add(n);L.trail.add(t);}
  // abanico de luz tras las espinas mientras se erizan
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.0),fx(`void main(){vec2 p=(vUv-vec2(.5,.05))*vec2(1.8,1.2);float r=length(p);float an=atan(p.x,p.y);
   float sec=step(abs(an),1.38)*smoothstep(1.,.2,r);float rays=pow(.5+.5*cos(an*${f(2*Math.PI*(N-1)/2.6)}),8.);
   gl_FragColor=vec4(mix(uC2,uC1,rays)*1.4,sec*(.2+.8*rays)*smoothstep(0.,.25,r)*uA);}`,{depthTest:false}));
  L.mesh.add(fan);
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),fx(RING_FS)); hitRing.position.copy(TC); L.mesh.add(hitRing);
  // partículas: las trayectorias se recalculan en GLSL con las mismas fórmulas
  const C=`const float TA=${f(TA)};const float FT=${f(FT)};const vec3 CF=${v3(CF)};
  float al(float i){return -1.3+2.6*i/${f(N-1)};}
  vec3 sP(float i){float an=al(i);return vec3(CF.x-.1*abs(sin(an)),CF.y+.5*cos(an),.55*sin(an));}
  vec3 hP(float i){float y=.45+.7*fract(i*.618+.1);float z=(fract(i*.383+.7)-.5)*.56;float r=.42-.08*y/1.25;return vec3(3.4-sqrt(max(r*r-z*z,.01))+.05,y,z);}
  vec3 mP(float i){float an=al(i);return sP(i)+normalize(vec3(1.,.5*cos(an),.7*sin(an)))*2.;}
  float t0(float i){return TA+.21*fract(i*.618+.05);}
  vec3 path(float i,float k){float u=1.-k;return u*u*sP(i)+2.*u*k*mP(i)+k*k*hP(i);}`;
  // savia verde que converge en el abanico
  a.count+=points(L.part,80,C+`void main(){float i=floor(aSeed.x*${f(N)});float s=fract(aSeed.x*${f(N)})*(TA-.06);float life=.28;float age=(uT-s)/life;float k=clamp(age,0.,1.);
   vec3 p=mix(sP(i)+rnd()*.5,sP(i),k*k);
   vA=(age>0.&&age<1.)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // estela de motas a lo largo de cada aguja
  a.count+=points(L.part,230,C+`void main(){float i=floor(aSeed.x*${f(N)});float k=fract(aSeed.x*${f(N)});float s=t0(i)+k*FT;float life=.14+aSeed.y*.14;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=path(i,k)+rnd()*.025+rnd()*.2*t;
   vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.02+.028*aSeed.z)*(1.-age*.5));}`);
  // en cada impacto: savia que salpica y agujas vegetales que se desprenden y caen
  a.count+=points(L.part,100,C+`void main(){float i=floor(aSeed.x*${f(N)});float s=t0(i)+FT;float life=.38+aSeed.y*.22;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(-.9,.4,0.))*(1.+1.7*aSeed.z);vec3 p=hP(i)+v*t+vec3(0.,-6.*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age:0.;put(p,.03+.032*aSeed.w);}`,DROP_FS("mix(vec3(.55,.85,.25),uC1,.4)"),NB);
  a.count+=points(L.part,90,C+`void main(){float i=floor(aSeed.x*${f(N)});float s=t0(i)+FT;float life=.6+aSeed.y*.35;float t=max(uT-s,0.);float age=(uT-s)/life;
   vec3 v=normalize(rnd()+vec3(-1.,.6,0.))*(.8+1.6*aSeed.z);vec3 p=hP(i)+v*t+vec3(0.,-4.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.02)?1.-age*age:0.;put(p,.13+.08*aSeed.w);vMix=aSeed.w+t*(2.+3.*aSeed.y);}`,NEEDLE_FS);
  a.count+=sparks(L.part,110,0.7,`${f(TC.x)},${f(TC.y-0.25)},0.`,"-.8,.4,0.",2.5,6.5,3);
  // polvo al caer las agujas
  a.count+=points(L.part,40,C+`void main(){float s=${f(TF+0.15)}+aSeed.x*.35;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(3.1+cos(an)*.4*(.6+aSeed.w),.05+.16*(1.-exp(-t*4.)),sin(an)*.4*(.6+aSeed.w));
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.14+.12*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  // abanico espinoso bajo el lanzador y corona de púas bajo el rival
  const spikeFS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x)/6.2832;
   float sp=abs(fract(an*${f(N)}+uT*.05)-.5)*2.;float w=clamp((.95-r)/.65,0.,1.)*.45;float on=step(.3,r)*step(r,.95);
   float m=band(r,.95,.03)+band(r,.3,.02)+(smoothstep(.06,0.,abs(sp-w))*.9+step(sp,w)*.22)*on;
   gl_FragColor=vec4(mix(uC2,uC1,1.-r)*1.4,m*uA);}`;
  const glyph=groundPlane(2.2,-3.7,0.02,fx(spikeFS));
  const pin=groundPlane(2.2,3.4,0.02,fx(spikeFS));
  L.decal.add(glyph,pin);
  const pt=V3(0,0,0),dv=V3(0,0,0),tp=V3(0,0,0);
  a.pose=function(te,o){
    // rival: un pequeño empujón por aguja
    let kick=0,last=-1;for(let i=0;i<N;i++){const d=te-TH[i];if(d>=0){kick+=0.025*Math.exp(-d*9);if(last<0||TH[i]>TH[last])last=i;}}
    const fall=ss(TF,TF+0.35,te);
    target.position.x=3.4+Math.min(kick,0.2); target.rotation.z=-Math.min(kick,0.2)*0.8*Math.cos(te*40);
    const erz=ss(0,TA,te);
    caster.scale.set(1+0.04*erz*(1-ss(TA,TA+0.3,te)),1+0.03*erz*(1-ss(TA,TA+0.3,te)),1+0.04*erz*(1-ss(TA,TA+0.3,te)));
    caster.rotation.z=0.12*erz-0.2*ss(TA,TA+0.06,te)+0.08*ss(TA+0.1,0.8,te)+(te>TA&&te<TA+0.22?0.03*Math.sin(te*90):0);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.35*erz*(1-ss(TA,TA+0.3,te));
    for(let i=0;i<N;i++){const n=needles[i],s=streaks[i],k=cl((te-T0[i])/FT),hit=te>=TH[i];
      const ap=ss(0.04+i*0.012,0.2+i*0.012,te);
      n.visible=ap>0.001&&te<TE; n.scale.setScalar(Math.max(ap*(1-ss(TE-0.3,TE,te)),0.001));
      if(te<T0[i]){n.position.copy(S[i]);n.position.x+=0.02*Math.sin(te*60+i)*erz;dv.copy(M[i]).sub(S[i]).normalize();n.quaternion.setFromUnitVectors(XA,dv);}
      else if(!hit){qb(S[i],M[i],H[i],k,n.position);qb(S[i],M[i],H[i],Math.min(k+0.02,1),pt);dv.copy(pt).sub(n.position).normalize();
        if(k>0.98)dv.copy(D[i]);n.quaternion.setFromUnitVectors(XA,dv);}
      else{const tf=te-(TF+i*0.02);
        if(tf<0){const q=Math.exp(-(te-TH[i])*7)*0.25*Math.sin((te-TH[i])*70);
          n.position.copy(H[i]).addScaledVector(D[i],0.1);n.position.x+=target.position.x-3.4;
          dv.copy(D[i]);dv.y+=q;dv.z+=q*0.6;n.quaternion.setFromUnitVectors(XA,dv.normalize());}
        else{const y0=H[i].y,fy=Math.max(y0-4.5*tf*tf,0.03),lay=cl(tf/Math.sqrt(y0/4.5));
          n.position.set(H[i].x-0.25*Math.min(tf,0.5)-0.1,fy,H[i].z*(1+0.6*Math.min(tf,0.5)));
          dv.set(D[i].x,D[i].y*(1-lay)-0.05*lay,D[i].z+0.4*lay*Math.sign(H[i].z||1)).normalize();n.quaternion.setFromUnitVectors(XA,dv);}}
      // estela: del punto de partida a la aguja, recortada a la longitud volada
      s.visible=te>=T0[i]&&te<TH[i]+0.12;
      if(s.visible){const kk=Math.min(k,1);qb(S[i],M[i],H[i],kk,tp);s.position.copy(tp);qb(S[i],M[i],H[i],Math.max(kk-0.12,0),pt);dv.copy(tp).sub(pt);
        const ln=Math.max(dv.length()*1.6,0.001);s.quaternion.setFromUnitVectors(XA,dv.normalize());s.scale.set(ln,1,1);}}
    ndMat.uniforms.uA.value=erz*(1-ss(LAST,LAST+0.4,te));
    trMat.uniforms.uA.value=1;
    towardCam(fan.position,tmp.set(CF.x+0.15,CF.y+0.15,0),0.3); billboard(fan); fan.visible=te<TA+0.3;
    set(fan,0,0.65*erz*(1-ss(TA,TA+0.25,te)));
    let p=cl((te-FIRST)/0.35); billboard(hitRing); set(hitRing,p,te>=FIRST?(1-p)*0.8:0);
    glyph.material.uniforms.uA.value=erz*(1-ss(TA+0.1,TA+0.5,te));
    pin.position.x=target.position.x;
    pin.material.uniforms.uA.value=ss(FIRST,FIRST+0.2,te)*(1-ss(TF,TE,te));
    if(te<TA){o.g.set(CF.x,CF.y+0.3,0);o.gs=1.1*erz;o.ga=0.4*erz;o.li=2.8*erz;}
    else if(te<FIRST){const k=cl((te-TA)/(FIRST-TA));o.g.set(CF.x+(TC.x-CF.x)*k,CF.y+(TC.y-CF.y)*k+0.5*Math.sin(Math.PI*k),0);o.gs=1;o.ga=0.36;o.li=3.2;}
    else{const t=te-TH[Math.max(last,0)];o.g.copy(TC);o.gs=1.1+1.6*Math.min(t,0.4);o.ga=0.12+0.4*Math.exp(-t*12)*(1-fall);o.li=1.6+4.5*Math.exp(-t*8)*(1-fall);}
    o.ia=last>=0?te-TH[last]:te-FIRST; o.c.copy(TC); o.shake=0; o.dist=0.38; o.flash=0.7;
  };
}};

VFX.module("Planta · Cuernos",[bamboo,beech,mand,persimmon,rose,cake,melon,cactus]);
})();

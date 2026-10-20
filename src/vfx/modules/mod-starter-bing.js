// =====================================================================
// STARTER · BING — cartas α del Axie inicial Bing (todas 2 PA → nivel 2, duración fijada por la carta)
// Mismo contrato: {key,name,dur,ti,phases,pal,tier} + build(a) → piezas en a.L.* y a.pose(te,o) sin estado.
// Plantillas: Puppy ← tajo (cuerpo a cuerpo) · Toy Ball ← lanza (proyectil) · Cone Shell ← heal (apoyo a un aliado)
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,fxU,set,groundPlane,points,sparks,helixGeo,RING_FS,camera,caster,target,allies,ALLY_POS}=VFX;
const {NB,SOLID,v3,DUST_FS,billboard,towardCam}=VFX.lib;

const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const hitK=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const bez=(a,m,b,u,out)=>{const w0=(1-u)*(1-u),w1=2*u*(1-u),w2=u*u;
  return out.set(a.x*w0+m.x*w1+b.x*w2,a.y*w0+m.y*w1+b.y*w2,a.z*w0+m.z*w1+b.z*w2);};
// partícula con giro propio: el VS escribe vR (ángulo) además de vA/vMix
const ROT=`varying float vR;vec2 rot(vec2 q,float a){float c=cos(a),s=sin(a);return vec2(c*q.x-s*q.y,s*q.x+c*q.y);}`;
// estrella de cinco puntas en color fijo dorado (acento Estelar)
const STAR5_FS=HEAD+ROT+`varying float vA;varying float vMix;
void main(){vec2 q=rot(gl_PointCoord-.5,vR);float r=length(q);float an=atan(q.y,q.x);
 float rs=mix(.2,.47,pow(.5+.5*cos(an*5.),2.2));
 float m=smoothstep(rs+.03,rs-.03,r);float core=smoothstep(.22,0.,r);
 float a=(m+smoothstep(.5,0.,r)*.18)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.8,.28),vec3(1.,.97,.75),core)*1.6,a);}`;
// huesito de juguete: cápsula + cuatro nudillos, crema opaco con contorno tostado (mezcla normal)
const BONE_FS=HEAD+ROT+`varying float vA;varying float vMix;
void main(){vec2 q=rot(gl_PointCoord-.5,vR)*2.;
 vec2 b=vec2(max(abs(q.x)-.5,0.),q.y);float d=length(b)-.13;
 d=min(d,length(vec2(abs(q.x)-.55,abs(q.y)-.14))-.15);
 float fill=smoothstep(.04,-.02,d);float rim=smoothstep(.09,.03,abs(d+.04));
 float a=max(fill,rim*.9)*vA;if(a<.003)discard;
 vec3 c=mix(vec3(1.,.95,.84),vec3(.58,.36,.2),smoothstep(-.08,.0,d));
 gl_FragColor=vec4(c,a);}`;

// =====================================================================
// 1 · PUPPY — salto juguetón, dos «ñam» sobre el rival con huesitos y estrellas; vuelve y su pulso dorado
//     potencia a todos los aliados (aro breve a sus pies)
//     nivel 2 con duración de carta (0,8 s): todo compacto y legible
// =====================================================================
const puppy={key:"starter_bing_mouth",name:"Puppy",dur:0.8,ti:0.35,pal:"Fuego",tier:2,allies:2,
  phases:[["Salto",0],["Ñam",0.2],["Regreso",0.4],["Potenciado",0.5]],
build(a){
  const L=a.L,T0=0.1,TA=0.21,T1=0.25,T2=0.35,TB=0.4,TBE=0.54,TP=0.5,TAR=0.63,XL=2.3;
  const TH=V3(3.22,1.48,0);                                    // punto del mordisco (cabeza/cuello del rival)
  const CM=V3(-3.7,1.0,0);                                       // pecho de Bing al volver
  const cx=te=>{
    if(te<T0)return -3.7-0.15*ss(0,T0,te);
    if(te<TA)return -3.85+(XL+3.85)*Math.pow((te-T0)/(TA-T0),1.3);
    if(te<TB)return XL+0.09*Math.exp(-Math.pow((te-T1)/0.03,2))+0.12*Math.exp(-Math.pow((te-T2)/0.03,2));
    return XL+(-3.7-XL)*ss(TB,TBE,te);};
  const cy=te=>te>=T0&&te<TA?0.3*Math.sin(Math.PI*(te-T0)/(TA-T0)):(te>=TB&&te<TBE?0.42*Math.sin(Math.PI*(te-TB)/(TBE-TB)):0);

  // «ñam»: dos arcos con dientecitos que se cierran; uP = cierre 0..1
  const CHOMP_FS=`void main(){vec2 p=(vUv-.5)*2.;float x=p.x;
   float g=.5*(1.-uP);float h=.26*(1.-.45*uP);float bow=1.-x*x;
   float yu=g+h*bow,yl=-g-h*bow;float w=.07*(.45+.55*bow);
   float tri=1.-abs(fract(x*3.2+.5)*2.-1.);float tl=.15*tri*smoothstep(.95,.6,abs(x));
   float du=p.y-yu,dl=p.y-yl;
   float arc=max(smoothstep(w,w*.35,abs(du)),smoothstep(w,w*.35,abs(dl)));
   float tooth=max(smoothstep(-tl-.02,-tl+.02,du)*step(du,0.),smoothstep(tl+.02,tl-.02,dl)*step(0.,dl));
   float lim=smoothstep(1.,.86,abs(x));
   float shut=smoothstep(.8,1.,uP);
   float m=(arc+tooth*.75)*lim;
   float puff=smoothstep(.6,0.,length(p*vec2(.8,1.6)))*shut*.35;
   gl_FragColor=vec4(mix(uC2,uC1,arc*.7+tooth*.5)*1.6+vec3(1.)*(arc*.35+shut*.6)*m,(m+puff)*uA);}`;
  const ch1=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.8),fx(CHOMP_FS,{depthTest:false}));
  const ch2=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.05),fx(CHOMP_FS,{depthTest:false}));
  const pop=[0,1].map(()=>new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(RING_FS,{depthTest:false})));
  L.mesh.add(ch1,ch2,...pop);

  // estela del salto: dos planos cruzados que van del punto de partida a Bing
  const tg=new THREE.PlaneGeometry(1,0.7).translate(-0.5,0,0);
  const tm=fx(`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*6.-uT*12.,v*3.,uT));
   float al=smoothstep(u*(.5+.5*n),0.,v)*pow(u,1.8)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,u)*1.5+vec3(1.)*smoothstep(.2,0.,v)*u*.4,al);}`);
  const trail=new THREE.Group(), t2=new THREE.Mesh(tg,tm); t2.rotation.x=Math.PI/2;
  trail.add(new THREE.Mesh(tg,tm),t2); L.trail.add(trail);

  // pulso dorado: un arco de luz de Bing a cada aliado; la cabeza recorre uv.x y deja cola
  const GOLD=`vec3(1.,.8,.3)`;
  const ends=ALLY_POS.map(P=>{const B=P.clone().add(V3(0,0.9,0)),M=CM.clone().add(B).multiplyScalar(0.5).add(V3(0,1.0,0));return {B,M};});
  const pulses=ends.map(e=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(CM,e.M,e.B),40,0.05,8,false),fx(`
   void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
    float core=pow(abs(dot(normalize(vN),normalize(vV))),1.4);
    float tail=exp(-d*7.)*(.6+.4*noise(vec3(u*24.-uT*14.,vUv.y*5.,0.)));float head=exp(-d*40.);
    gl_FragColor=vec4(mix(uC1,${GOLD},.6)*1.5+vec3(1.)*head*.8,(tail+head)*core*uA);}`));L.trail.add(m);return m;});

  // aro de Potenciado a los pies de cada aliado y onda dorada bajo Bing
  const BUFF_FS=`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float rr=.62+.2*uP;float m=band(r,rr,.045)+band(r,rr,.2)*.25+band(r,rr+.16,.012)*step(.5,fract(an/6.2832*12.+uT*.8));
   gl_FragColor=vec4(mix(uC1,${GOLD},.65)*1.5+vec3(1.)*band(r,rr,.02)*.4,m*uA);}`;
  const feet=ALLY_POS.map(P=>{const g=groundPlane(1.7,P.x,0.03,fx(BUFF_FS));g.position.z=P.z;L.decal.add(g);return g;});
  const wave=groundPlane(3.2,-3.7,0.025,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=.09*(1.-uP)+.015;
   float a=band(r,uP*.95,w)*uA;gl_FragColor=vec4(mix(uC1,${GOLD},.6)*1.5,a);}`));
  L.decal.add(wave);

  const C=`const float T1=${f(T1)};const float T2=${f(T2)};const float TP=${f(TP)};const float TAR=${f(TAR)};const vec3 TH=${v3(TH)};`;
  // huesitos y estrellas que saltan con cada «ñam» (más en el segundo)
  const burst=(n,fs,size,opts)=>points(L.part,n,C+`varying float vR;void main(){float s=(aSeed.x<.35?T1:T2)+aSeed.y*.03;
   float life=.38+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd()*vec3(1.,.6,1.)+vec3(-.35,1.1,.45));vec3 p=TH+d*(1.6+1.6*aSeed.z)*t+vec3(0.,-5.5*t*t,0.);
   vR=aSeed.w*6.2832+t*(aSeed.z-.5)*22.;
   vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(${size})*(aSeed.x<.35?.8:1.)*(.6+.4*smoothstep(0.,.12,age)));}`,fs,opts);
  a.count+=burst(14,BONE_FS,".2+.06*aSeed.w",NB);
  a.count+=burst(26,STAR5_FS,".13+.06*aSeed.w");
  // polvo de brillo dorado del mordisco
  a.count+=points(L.part,70,C+`varying float vR;void main(){vR=aSeed.z*6.2832;float s=(aSeed.x<.35?T1:T2)+aSeed.y*.04;float life=.25+aSeed.z*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 d=normalize(rnd());vec3 p=TH+d*(.15+.9*aSeed.w)*(1.-exp(-t*6.))+vec3(0.,.3*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`,STAR5_FS.replace("vec3(1.,.8,.28)","vec3(1.,.72,.3)"));
  a.count+=sparks(L.part,110,T2,`${f(TH.x)},${f(TH.y-0.05)},0.`,"-.3,.45,.3",2,6,2.6);
  // chispas del salto
  a.count+=points(L.part,70,`const float T0=${f(T0)};const float TA=${f(TA)};void main(){float s=T0+aSeed.x*(TA-T0);float life=.2+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float k=(s-T0)/(TA-T0);float x=-3.85+${f(XL+3.85)}*pow(k,1.3);
   vec3 r=rnd();vec3 p=vec3(x,.5+aSeed.z*.9,r.z*.3)+vec3(-1.1*t,.5*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.w)*(1.-age*.5));}`);
  // destellos dorados que suben en cada aliado potenciado
  a.count+=points(L.part,36,C+`varying float vR;void main(){vec3 P=aSeed.x<.5?${v3(ALLY_POS[0])}:${v3(ALLY_POS[1])};
   float s=TAR+aSeed.y*.08;float life=.22+aSeed.z*.12;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.w*6.2832;vec3 p=P+vec3(cos(an)*.5,.1+t*2.4+aSeed.z*.3,sin(an)*.5);vR=an;
   vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,.1+.05*aSeed.z);}`,STAR5_FS);

  a.pose=function(te,o){
    const x=cx(te), ia=te-T2, i1=te-T1;
    caster.position.x=x; caster.position.y=cy(te);
    caster.rotation.z=0.18*ss(0,T0,te)-0.45*ss(T0,T0+0.05,te)+0.27*ss(TA,TA+0.05,te)
      -0.15*Math.exp(-Math.pow((te-T1)/0.03,2))-0.2*Math.exp(-Math.pow((te-T2)/0.03,2))+0.15*ss(TB,TB+0.05,te)-0.15*ss(TBE-0.05,TBE,te);
    // estela del salto
    trail.visible=te>T0&&te<TA+0.12; trail.position.set(x+0.1,0.95+cy(te),0);
    trail.scale.set(Math.max(Math.min(x+3.85,4.5),0.001),1,1); tm.uniforms.uA.value=1-cl((te-TA)/0.12)*(te>TA?1:0);
    // dos «ñam»: se abren al llegar y se cierran de golpe
    const chomp=(m,tc,ang,dx,dy)=>{const k=cl((te-(tc-0.06))/0.06),on=ss(tc-0.09,tc-0.06,te)*(1-ss(tc+0.04,tc+0.13,te));
      towardCam(tmp,TH,0.5); m.position.copy(tmp).add(tmp2.set(dx,dy,0)); billboard(m,ang);
      m.visible=on>0.001; m.scale.setScalar(1+0.12*Math.exp(-Math.pow((te-tc)/0.03,2))); set(m,k*k*k,on);};
    chomp(ch1,T1,0.3,-0.08,0.1); chomp(ch2,T2,-0.18,0.04,-0.04);
    [T1,T2].forEach((tc,i)=>{const p=cl((te-tc)/0.22),m=pop[i]; towardCam(m.position,TH,0.55); billboard(m);
      m.visible=te>=tc&&p<1; m.scale.setScalar(0.5+0.4*i); set(m,p,te>=tc?(1-p)*0.8:0);});
    // pulso dorado a los aliados
    const pk=cl((te-TP)/(TAR-TP)), pa=ss(TP,TP+0.03,te)*(1-ss(TAR+0.02,TAR+0.12,te));
    pulses.forEach(m=>{m.visible=pa>0.001;set(m,pk*1.04,pa);});
    let p=cl((te-TP)/0.25); set(wave,p,te>=TP?(1-p)*0.8:0);
    const ib=te-TAR, fe=ib>=0?ss(0,0.04,ib)*(1-ss(0.1,0.17,ib)):0;
    feet.forEach(g=>set(g,cl(ib/0.17),fe));
    allies.forEach(d=>{d.userData.m.emissive.setRGB(1,0.78,0.3);d.userData.m.emissiveIntensity=fe*0.55+(ib>=0?0.35*Math.exp(-ib*14):0);});
    const cm=caster.userData.m; cm.emissive.setRGB(1,0.78,0.3); cm.emissiveIntensity=te>=TP?0.4*Math.exp(-(te-TP)*10):0;
    // el rival recibe dos mordiscos: el segundo lo empuja más
    const h1=hitK(i1,9), h2=hitK(ia,7);
    target.position.x=3.4+h1*0.06+h2*0.14; target.rotation.z=-h1*0.1*Math.cos(i1*20)-h2*0.2*Math.cos(ia*16);
    target.scale.set(1+0.05*h2,1-0.08*h2,1+0.05*h2);
    // luz y resplandor siguen el punto caliente
    if(te<TA){o.g.set(x+0.4,1.3+cy(te),0);o.gs=0.5+0.5*ss(T0,TA,te);o.ga=0.2+0.15*ss(T0,TA,te);o.li=1+1.5*ss(T0,TA,te);}
    else if(te<TP){const l=Math.max(i1>=0&&ia<0?i1:ia,0);o.g.copy(TH);o.gs=0.9+2*l;o.ga=Math.exp(-l*12)*(ia>=0?0.55:0.4);o.li=(ia>=0?6:4)*Math.exp(-l*7);}
    else if(te<TAR){bez(CM,ends[0].M,ends[0].B,pk,o.g).add(bez(CM,ends[1].M,ends[1].B,pk,tmp)).multiplyScalar(0.5);o.gs=1;o.ga=0.3;o.li=2.5;}
    else{o.g.set(-3.45,0.6,-1.6);o.gs=1.4;o.ga=0.25*fe;o.li=3*fe;}
    o.ia=te<T2?i1:ia; o.c.copy(TH); o.shake=0; o.dist=0.55; o.flash=te<T2?0.6:0.9;
  };
}};

// =====================================================================
// 2 · TOY BALL — pelota de juguete con franjas que bota dos veces hasta el rival, lo golpea y rebota
//     de vuelta a Bing; al caerle en la cabeza aparece el aro rojo de Provocación
// =====================================================================
const ball={key:"starter_bing_horn",name:"Toy Ball",dur:0.8,ti:0.4,pal:"Fuego",tier:2,
  phases:[["Saque",0],["Botes",0.12],["Golpe",0.4],["Rebote",0.44],["Provocación",0.62]],
build(a){
  const L=a.L,T0=0.12,TB1=0.21,TB2=0.3,TI=0.4,TR=0.62,TE=0.7,BR=0.19;
  const P0=V3(-3.25,1.05,0),B1=V3(-1.3,BR,0.18),B2=V3(0.95,BR,0.12),HB=V3(2.98,1.2,0),R=V3(-3.62,1.87+BR,0),R2=V3(-3.95,2.45,0.05);
  const KEYS=[[T0,P0,0.42],[TB1,B1,0.62],[TB2,B2,0.5],[TI,HB,1.35],[TR,R,0.22],[TE,R2,0]];
  const bp=(t,out)=>{if(t<=T0)return out.copy(P0);
    for(let i=0;i<KEYS.length-1;i++){const [ta,A,h]=KEYS[i],[tb,B]=KEYS[i+1];
      if(t<tb){const k=(t-ta)/(tb-ta);out.lerpVectors(A,B,k);out.y+=h*4*k*(1-k);return out;}}
    return out.copy(R2);};
  // la misma trayectoria en GLSL, generada desde la tabla
  let G=`vec3 ball(float t){if(t<=${f(T0)})return ${v3(P0)};float k;vec3 p;`;
  for(let i=0;i<KEYS.length-1;i++){const [ta,A,h]=KEYS[i],[tb,B]=KEYS[i+1];
    G+=`if(t<${f(tb)}){k=(t-${f(ta)})/${f(tb-ta)};p=mix(${v3(A)},${v3(B)},k);p.y+=${f(h)}*4.*k*(1.-k);return p;}`;}
  G+=`return ${v3(R2)};}`;
  const C=`const float T0=${f(T0)};const float TI=${f(TI)};const float TR=${f(TR)};const vec3 HB=${v3(HB)};`+G;

  // pelota: seis gajos alternos (paleta / blanco), casquetes blancos, costuras y brillo especular (opaca)
  const ballM=new THREE.Mesh(new THREE.SphereGeometry(BR,32,20),fx(`void main(){vec3 n=normalize(vP);float an=atan(n.z,n.x)/6.2832+.5;
   float g=an*6.;float id=mod(floor(g),3.);float seam=smoothstep(.06,0.,abs(fract(g)-.5)-.44);
   vec3 c=id<.5?uC2:(id<1.5?vec3(1.,.96,.9):uC1);
   float cap=smoothstep(.8,.84,abs(n.y));c=mix(c,vec3(1.,.96,.9),cap);
   float capLine=band(abs(n.y),.82,.02);
   vec3 N=normalize(vN),Ld=normalize(vec3(.35,.8,.5));
   float lit=.42+.58*max(0.,dot(N,Ld));
   float spec=pow(max(0.,dot(reflect(-Ld,N),normalize(vV))),28.);
   float fr=pow(1.-abs(dot(N,normalize(vV))),3.);
   c=c*lit*(1.-seam*.35)*(1.-capLine*.4)+vec3(1.)*spec*.7+uC1*fr*.5*uA;
   gl_FragColor=vec4(c,1.);}`,SOLID));
  L.mesh.add(ballM);

  // estela: tubo por toda la trayectoria; uP = fracción de longitud recorrida, la cola se apaga detrás
  const NS=120, ts=[], pts=[], acc=[0];
  for(let i=0;i<=NS;i++){const t=T0+(TR-T0)*i/NS;ts.push(t);pts.push(bp(t,V3(0,0,0)));
    if(i)acc.push(acc[i-1]+pts[i].distanceTo(pts[i-1]));}
  const LEN=acc[NS]||1;
  const arcAt=t=>{const u=cl((t-T0)/(TR-T0))*NS,i=Math.min(Math.floor(u),NS-1),k=u-i;return (acc[i]+(acc[i+1]-acc[i])*k)/LEN;};
  const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),260,0.07,8,false),fx(`
  void main(){float u=vUv.x;float d=uP-u;if(d<0.)discard;
   float tail=exp(-d*16.);float n=noise(vec3(u*60.-uT*14.,vUv.y*5.,0.));
   float core=pow(abs(dot(normalize(vN),normalize(vV))),1.2);
   gl_FragColor=vec4(mix(uC2,uC1,tail)*1.5+vec3(1.)*exp(-d*70.)*.5,tail*(.45+.55*n)*core*uA);}`));
  L.trail.add(tube);

  // golpe en el rival: anillo y destello
  const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.0),fx(RING_FS,{depthTest:false})); L.mesh.add(hitRing);
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float rays=pow(abs(cos(an*4.)),18.)*smoothstep(1.,.3,r)*(1.-uP*.5);float c=pow(max(0.,1.-r),3.);
   gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.7,(rays*.8+c)*uA);}`,{depthTest:false})); L.mesh.add(flash);
  // aro rojo de Provocación sobre la cabeza de Bing (rojo fijo: estado de amenaza)
  const taunt=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2).rotateX(-Math.PI/2),fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);
   float m=band(r,.62,.05)+band(r,.62,.2)*.3;
   float sp=fract(an/6.2832*8.+uT*.6);float spike=smoothstep(.2,0.,abs(sp-.5)*2.-(1.-(r-.7)/.22)*.5)*step(.7,r)*step(r,.92);
   m+=spike*.9+band(r,.45,.012)*.6;
   vec3 red=vec3(1.,.16,.12);
   gl_FragColor=vec4(red*1.6+vec3(1.,.6,.4)*band(r,.62,.018)*.6,m*uA*(.85+.15*sin(uT*30.)));}`));
  L.mesh.add(taunt);
  // marcas de los botes y del golpe
  const bounces=[B1,B2].map(B=>{const g=groundPlane(1.3,B.x,0.025,fx(RING_FS));g.position.z=B.z;L.decal.add(g);return g;});
  const shock=groundPlane(2.6,3.0,0.03,fx(RING_FS)); L.decal.add(shock);

  // brasas que deja la pelota
  a.count+=points(L.part,220,C+`void main(){float s=T0+aSeed.x*(TR-T0);float life=.18+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=ball(s)+r*.09+vec3(r.x*.3*t,.5*t,r.z*.3*t);
   vA=(age>0.&&age<1.)?(1.-age)*(.6+.4*sin(t*40.+aSeed.z*30.)):0.;put(p,(.03+.045*aSeed.w)*(1.-age*.6));}`);
  // polvo en cada bote (mezcla normal)
  a.count+=points(L.part,36,`void main(){bool f=aSeed.x<.5;vec3 B=f?${v3(B1)}:${v3(B2)};float s=(f?${f(TB1)}:${f(TB2)})+aSeed.y*.02;
   float life=.32+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(B.x,.06,B.z)+vec3(cos(an),0.,sin(an))*(.15+.5*(1.-exp(-t*7.)))+vec3(0.,.25*t,0.);
   vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.7:0.;put(p,(.16+.14*aSeed.w)*(.6+age));}`,DUST_FS,NB);
  a.count+=sparks(L.part,150,TI,`${f(HB.x+0.1)},${f(HB.y)},0.`,"-.55,.35,0.",3,8,3);
  // salpicadura rojiza al caer sobre Bing y motas de amenaza alrededor del aro
  a.count+=points(L.part,50,C+`void main(){float s=TR+aSeed.x*.06;float life=.2+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=vec3(-3.7,2.15,0.)+vec3(cos(an)*(.3+.9*t),.3*t+(aSeed.w-.5)*.1,sin(an)*(.3+.9*t));
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,.03+.03*aSeed.w);}`,HEAD+`varying float vA;varying float vMix;
  void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
   gl_FragColor=vec4(vec3(1.,.25,.16)*1.5+vec3(1.)*smoothstep(.2,0.,d)*.4,a);}`);

  const pos=V3(0,0,0);
  a.pose=function(te,o){
    const ia=te-TI, ir=te-TR;
    // Bing echa la cabeza atrás y lanza; recibe la pelota en la cabeza al volver
    caster.rotation.z=0.16*ss(0,T0,te)-0.3*ss(T0,T0+0.05,te)+0.14*ss(T0+0.08,T0+0.2,te)+(ir>=0?0.1*Math.exp(-ir*10)*Math.sin(ir*40):0);
    caster.scale.set(1,1-(ir>=0?0.06*Math.exp(-ir*14):0),1);
    // pelota
    bp(te,pos);
    const grow=te<T0?ss(0,T0,te):1, out=1-ss(TR+0.02,TE,te);
    let sq=0; for(const tc of [TB1,TB2,TI,TR])sq+=Math.exp(-Math.pow((te-tc)/0.022,2));
    ballM.visible=te<TE&&grow*out>0.01; ballM.position.copy(pos);
    if(te<T0)ballM.position.set(-3.25,1.05+0.05*Math.sin(te*30),0);
    ballM.scale.set((1+0.25*sq)*grow*out,(1-0.35*sq)*grow*out,(1+0.25*sq)*grow*out);
    ballM.rotation.z=te<TI?-(te-T0)*28:-(TI-T0)*28+(te-TI)*30; ballM.rotation.x=te*3;
    ballM.material.uniforms.uA.value=te>=T0&&te<TR?1:0.3;
    // estela
    tube.visible=te>T0&&ir<0.12; set(tube,arcAt(te),1-cl(ir/0.12)*(ir>0?1:0));
    // golpe
    let p=cl(ia/0.28); towardCam(hitRing.position,HB,0.5); billboard(hitRing); hitRing.visible=ia>=0&&p<1; set(hitRing,p,(1-p)*0.85);
    p=cl(ia/0.16); towardCam(flash.position,HB,0.6); billboard(flash,0.3); flash.visible=ia>=0&&p<1; flash.scale.setScalar(0.6+0.7*p); set(flash,p,1-p);
    p=cl(ia/0.4); set(shock,1-Math.pow(1-p,2),ia>=0?0.6*(1-p):0);
    [TB1,TB2].forEach((tc,i)=>{const q=cl((te-tc)/0.25);set(bounces[i],q,te>=tc?0.6*(1-q):0);});
    // Provocación: el aro aparece con un golpe de escala y queda latiendo hasta el final
    const ta=ir>=0?ss(0,0.04,ir):0;
    taunt.visible=ta>0.001; taunt.position.set(-3.7,2.2+0.03*Math.sin(te*12),0);
    taunt.scale.setScalar(1+0.6*(ir>=0?Math.exp(-ir*16):0)); taunt.rotation.y=te*2.2; taunt.material.uniforms.uA.value=ta;
    const cm=caster.userData.m; cm.emissive.setRGB(1,0.2,0.14); cm.emissiveIntensity=ir>=0?0.25+0.45*Math.exp(-ir*12):0;
    // el rival recibe el pelotazo
    const hit=hitK(ia,8); target.position.x=3.4+hit*0.18; target.rotation.z=-hit*0.24*Math.cos(ia*16);
    if(te<T0){o.g.set(-3.2,1.1,0);o.gs=0.7*grow;o.ga=0.25*grow;o.li=1.5*grow;}
    else if(te<TI){o.g.copy(pos);o.gs=0.9;o.ga=0.3;o.li=3;}
    else if(te<TR){const e=Math.exp(-ia*10);o.g.copy(pos);o.gs=0.9+1.6*e;o.ga=0.25+0.45*e;o.li=3+5*e;}
    else{o.g.set(-3.7,2.2,0);o.gs=1.1;o.ga=0.3*ta*Math.exp(-ir*4)+0.1*ta;o.li=2.5*ta;}
    o.ia=ia; o.c.copy(HB); o.shake=0; o.dist=0.6;
  };
}};

// =====================================================================
// 3 · CONE SHELL — una caracola cónica gira sobre el aliado y suelta una espiral de agua y luz que baja
//     hasta él; al llegar, brillo verde de curación
// =====================================================================
const shell={key:"starter_bing_back",name:"Cone Shell",dur:0.9,ti:0.55,pal:"Sagrado",tier:2,allies:1,
  phases:[["Caracola",0],["Espiral",0.18],["Curación",0.55],["Disipación",0.72]],
build(a){
  const L=a.L,TS=0.18,TI=0.55,TE=0.9,AP=ALLY_POS[0],AC=AP.clone().add(V3(0,1.0,0)),SY=2.18,SH=0.66,SR=0.3;
  const HY=0.12,HH=SY-HY-0.04,TURNS=2.4,HR0=0.55,HR1=0.1;
  // caracola: torno cónico (vértice abajo) con vueltas en espiral desplazando el radio
  const prof=[]; for(let i=0;i<=48;i++){const y=SH*i/48;prof.push(new THREE.Vector2(Math.max(SR*Math.pow(y/SH,0.85),0.004),y));}
  prof.push(new THREE.Vector2(SR*0.55,SH+0.02));
  const geo=new THREE.LatheGeometry(prof,48), pa=geo.attributes&&geo.attributes.position;
  if(pa){for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i),an=Math.atan2(z,x);
      const s=((y/SH)*4.2+an/(Math.PI*2))%1, k=y<=SH?0.74+0.26*Math.pow(Math.sin(Math.PI*((s+1)%1)),0.6):1;
      pa.setXYZ(i,x*k,y,z*k);}
    pa.needsUpdate=true; geo.computeVertexNormals();}
  const shellM=new THREE.Mesh(geo,fx(`void main(){float h=vP.y/${f(SH)};float an=atan(vP.z,vP.x)/6.2832;
   float s=fract(h*4.2+an);float suture=smoothstep(.08,0.,min(s,1.-s));
   float bands=.5+.5*sin(h*60.+an*6.2832);
   vec3 N=normalize(vN),V=normalize(vV);float fr=pow(1.-abs(dot(N,V)),2.);
   vec3 nacre=mix(vec3(.98,.9,.82),vec3(1.,.76,.66),bands*.35+h*.2);
   nacre=mix(nacre,mix(uC1,uC2,.5+.5*sin(h*9.+uT*4.)),fr*.55);
   float lit=.5+.5*max(0.,dot(N,normalize(vec3(.3,.8,.5))));
   vec3 c=nacre*lit*(1.-suture*.45)+mix(uC2,uC1,.4)*suture*1.6*uA;
   gl_FragColor=vec4(c,1.);}`,Object.assign({},SOLID,{side:THREE.DoubleSide})));
  L.mesh.add(shellM);
  // halo de nácar alrededor de la caracola
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),fx(`void main(){float d=length(vUv-.5)*2.;
   float a=(pow(max(0.,1.-d),2.5)*.6+band(d,.78,.04)*.6)*uA;gl_FragColor=vec4(mix(uC1,uC2,d)*1.3,a);}`)); L.mesh.add(halo);

  // espiral de agua y luz: dos cintas en hélice que se revelan de arriba abajo
  const HELIX_FS=`void main(){float u=vUv.x;float d=u-(1.-uP);if(d<0.)discard;float w=abs(vUv.y-.5)*2.;
   float n=noise(vec3(u*22.+uT*10.,vUv.y*3.,0.));
   float head=exp(-d*22.);float body=exp(-d*2.2)*(.4+.6*smoothstep(.3,.8,n));
   float al=(body+head)*smoothstep(1.,.15,w)*uA;
   gl_FragColor=vec4(mix(uC2,uC1,head+n*.35)*1.45+vec3(1.)*head*.6,al);}`;
  const spiral=new THREE.Group(); spiral.position.set(AP.x,HY,AP.z); L.trail.add(spiral);
  const hMat=fx(HELIX_FS);
  for(let i=0;i<2;i++){const m=new THREE.Mesh(helixGeo(TURNS,HR0,HR1,HH,0.1,160),hMat);m.rotation.y=i*Math.PI;spiral.add(m);}

  // curación: anillo verde a los pies, destello y cruces verdes (verde fijo: curación)
  const GREEN=`vec3(.42,1.,.55)`;
  const ring=groundPlane(2.6,AP.x,0.03,fx(`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float w=.1*(1.-uP)+.02;
   float a=(band(r,.25+uP*.7,w)+smoothstep(.6,0.,r)*.25*(1.-uP))*uA;gl_FragColor=vec4(${GREEN}*1.5,a);}`)); ring.position.z=AP.z;
  L.decal.add(ring);
  const glowB=new THREE.Mesh(new THREE.PlaneGeometry(2,2),fx(`void main(){vec2 p=(vUv-.5)*2.;float r=length(p*vec2(1.25,.8));
   float a=(pow(max(0.,1.-r),2.)*.7+band(r,.3+.6*uP,.06)*.6)*uA;gl_FragColor=vec4(mix(${GREEN},vec3(1.),.25)*1.4,a);}`,{depthTest:false}));
  L.mesh.add(glowB);
  const GCROSS_FS=HEAD+`varying float vA;varying float vMix;
  void main(){vec2 q=abs(gl_PointCoord-.5);
   float cr=max(smoothstep(.12,.07,q.x)*smoothstep(.42,.35,q.y),smoothstep(.12,.07,q.y)*smoothstep(.42,.35,q.x));
   float a=(cr+smoothstep(.5,0.,length(gl_PointCoord-.5))*.2)*vA;if(a<.003)discard;
   gl_FragColor=vec4(mix(${GREEN},vec3(1.),cr*.4)*1.4,a);}`;

  const C=`const float TS=${f(TS)};const float TI=${f(TI)};const vec3 AP=${v3(AP)};const vec3 SC=vec3(${f(AP.x)},${f(SY+SH*0.5)},${f(AP.z)});
  vec3 hel(float u,float ph){float an=u*${f(TURNS*Math.PI*2)}+ph;float r=${f(HR0)}+${f(HR1-HR0)}*u;return vec3(AP.x+cos(an)*r,${f(HY)}+u*${f(HH)},AP.z+sin(an)*r);}`;
  // destellos que se reúnen en la caracola al aparecer
  a.count+=points(L.part,60,C+`void main(){float life=.14+aSeed.y*.06;float age=(uT-aSeed.x*(TS-.06))/life;
   vec3 d=normalize(rnd()+.0001);vec3 p=SC+d*mix(.9,.05,age*age);
   vA=(age>0.&&age<1.&&uT<TS+.04)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`);
  // gotas de agua que bajan por la espiral detrás de la cabeza
  a.count+=points(L.part,140,C+`void main(){float s=TS+aSeed.x*(TI-TS-.08);float u=1.-(uT-s)/(TI-TS);float ph=step(.5,aSeed.y)*3.14159;
   vec3 r=rnd();vec3 p=hel(clamp(u,0.,1.),ph)+r*.05;
   vA=(uT>s&&u>0.)?smoothstep(0.,.05,uT-s)*.9:0.;put(p,(.04+.05*aSeed.z));}`,VFX.BUBBLE_FS);
  a.count+=points(L.part,120,C+`void main(){float s=TS+aSeed.x*(TI-TS);float life=.2+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float u=1.-(s-TS)/(TI-TS);vec3 r=rnd();vec3 p=hel(u,step(.5,aSeed.w)*3.14159)+r*.08+vec3(0.,-.4*t,0.);
   vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.025+.03*aSeed.z)*(1.-age*.5));}`);
  // salpicadura y cruces verdes al llegar
  a.count+=points(L.part,90,C+`void main(){float s=TI+aSeed.x*.04;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
   float an=aSeed.z*6.2832;vec3 p=AP+vec3(cos(an)*(.2+1.4*t),.08+2.2*t*(.4+aSeed.w)-5.*t*t,sin(an)*(.2+1.4*t));
   vA=(age>0.&&age<1.&&p.y>0.)?(1.-age):0.;put(p,.03+.035*aSeed.w);}`);
  a.count+=points(L.part,22,C+`void main(){float s=TI+.03+aSeed.x*.12;float life=.3+aSeed.y*.08;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 r=rnd();vec3 p=AP+vec3(r.x*.55,.35+aSeed.w*1.1+t*1.5,r.z*.55);
   vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age):0.;put(p,.15+.07*aSeed.y);}`,GCROSS_FS);

  a.pose=function(te,o){
    const ia=te-TI, app=ss(0,0.14,te), fade=1-ss(TI+0.08,TE-0.05,te);
    // Bing ofrece la caracola con un leve gesto
    caster.rotation.z=0.08*ss(0,0.1,te)-0.16*ss(0.1,0.16,te)+0.08*ss(0.2,0.45,te);
    const cm=caster.userData.m; cm.emissive.copy(U.uC1.value); cm.emissiveIntensity=0.3*ss(0,0.08,te)*(1-ss(0.12,0.3,te));
    // caracola: aparece girando, late al soltar la espiral y sube al disiparse
    const pulse=te>=TS?0.08*Math.exp(-(te-TS)*10):0;
    shellM.visible=app*fade>0.01; shellM.position.set(AP.x,SY+0.04*Math.sin(te*8)+0.35*ss(TI,TE,te),AP.z);
    shellM.rotation.y=te*11; shellM.rotation.z=0.1*Math.sin(te*6);
    shellM.scale.setScalar(Math.max((0.6+0.4*app+pulse)*app*fade,0.001)); shellM.material.uniforms.uA.value=ss(0.05,TS,te)*fade;
    towardCam(halo.position,tmp.set(AP.x,shellM.position.y+SH*0.5,AP.z),0.3); billboard(halo);
    halo.visible=shellM.visible; set(halo,0,(0.45+0.4*(te>=TS&&te<TI?1:0))*app*fade);
    // espiral
    const sp=cl((te-TS)/(TI-TS)); spiral.visible=te>=TS&&ia<0.25;
    hMat.uniforms.uP.value=sp; hMat.uniforms.uA.value=1-cl(ia/0.25)*(ia>0?1:0);
    // curación
    let p=cl(ia/0.35); set(ring,p,ia>=0?1-p:0);
    p=cl(ia/0.3); towardCam(glowB.position,AC,0.6); billboard(glowB); glowB.visible=ia>=0&&p<1; set(glowB,p,ia>=0?(1-p)*0.85:0);
    const al=allies[0].userData.m; al.emissive.setRGB(0.42,1,0.55);
    al.emissiveIntensity=ia>=0?0.7*Math.exp(-ia*7)+0.25*(1-ss(TI+0.1,TE,te)):0.15*sp;
    if(te<TS){o.g.set(AP.x,SY+0.3,AP.z);o.gs=0.9*app;o.ga=0.3*app;o.li=2*app;}
    else if(te<TI){const u=1-sp,an=u*TURNS*Math.PI*2;o.g.set(AP.x+Math.cos(an)*(HR0+(HR1-HR0)*u),HY+u*HH,AP.z+Math.sin(an)*(HR0+(HR1-HR0)*u));o.gs=1;o.ga=0.32;o.li=3;}
    else{o.g.copy(AC);o.gs=1.2+2*Math.min(ia,0.3);o.ga=Math.exp(-ia*8)*0.5;o.li=5*Math.exp(-ia*5);}
    o.ia=ia; o.c.copy(AC); o.shake=0; o.dist=0.35; o.flash=0;
  };
}};

VFX.module("Starter · Bing",[puppy,ball,shell]);
})();

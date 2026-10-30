// =====================================================================
// ESTILIZADO · BICHO · CUERNOS (Hito 101) — las 6 cartas de cuernos de Bicho hechas a mano con el kit vfx-stylized.js.
// Claves: sty_<clave original> (sty_icCaterpillars…). Mismos dur / ti / fases que las originales, así el daño llega igual.
// Identidad de clase: quitina carmesí pintada con luz en 3 bandas y contorno oscuro, siluetas de insecto (sin caras ni
// ojos de dibujo animado), baba y ácido como materia. Lo «de la cabeza» nace en las puntas (≈ (-3.54,2.05,±0.27)).
// Semántica según PartCards.js:
//   Caterpillars (daño + Miedo) · Lagging (daño + Débil) · Leaf Bug (sobre sí: escudo 55)
//   Parasite (daño, quita 30 de escudo, +30 de escudo al lanzador) · Pliers (cuerpo a cuerpo, +30 % contra escudo)
//   Antenna (sobre sí: +1 PM y +1 de alcance)
// Cambio de concepto: Antenna repartía energía a 2 aliados en el módulo antiguo; la carta hoy da +1 PM y +1 de alcance
// al lanzador, así que es un barrido de radar con un anillo de alcance que se abre. Leaf Bug ya no deja capullo.
// Los colores fijos se escriben en sRGB y se pasan a lineal (L3), si no salen lavados.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib||!VFX.sty)return;
const {THREE,V3,cl,ss,f,U,set,groundPlane,caster,target}=VFX;
const {v3,billboard,towardCam}=VFX.lib;
const S=VFX.sty, C=S.CELL;
const pal=(n,c)=>{VFX.palette(n,c);return n;};
const P_CAT=pal("Sty Bicho · Oruga",["#ff7a52","#9c1426"]);
const P_SNAIL=pal("Sty Bicho · Caracol",["#ff8fb6","#8a1a4a"]);
const P_LEAF=pal("Sty Bicho · Hoja",["#b8e05a","#2f6b1e"]);
const P_PARA=pal("Sty Bicho · Parásito",["#ff5a5a","#5a0a1e"]);
const P_PLIER=pal("Sty Bicho · Pinza",["#ffb0a0","#8c1020"]);
const P_ANT=pal("Sty Bicho · Antena",["#ffd060","#b0182a"]);

const L3=(r,g,b)=>`vec3(${f(Math.pow(r,2.2))},${f(Math.pow(g,2.2))},${f(Math.pow(b,2.2))})`;
const CRIM=L3(.74,.1,.14), CRIM_L=L3(.98,.4,.32), CHIT_D=L3(.28,.03,.07), AMBER=L3(1.,.66,.18), ACID=L3(.62,.9,.2),
  ACID_D=L3(.22,.5,.08), PINK=L3(1.,.55,.72), SLIME=L3(.92,.5,.74), MOSS=L3(.42,.68,.2), MOSS_D=L3(.14,.32,.1),
  LEAFY=L3(.72,.86,.3), SHIELD=L3(.45,.78,1.), SILVER=L3(.86,.84,.92), VIOLET=L3(.4,.2,.6), GOLD=L3(1.,.78,.28);

const CX=-3.7, TX=3.4, HT=V3(-3.52,2.02,0.1), TC=V3(3.15,1.15,0.12), TH=V3(3.22,1.6,0.12);
const tmp=V3(0,0,0), tmp2=V3(0,0,0), tmp3=V3(0,0,0);
const hitE=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const e3=k=>1-Math.pow(1-cl(k),3);
const VV=`varying float vR;varying float vK;`;
const glowOf=(d,c,k)=>{const m=d.userData.m;m.emissive.copy(c);m.emissiveIntensity=k;};
const bez=(a,b,c,t,o)=>{const u=1-t;return o.set(u*u*a.x+2*u*t*b.x+t*t*c.x,u*u*a.y+2*u*t*b.y+t*t*c.y,u*u*a.z+2*u*t*b.z+t*t*c.z);};
const recoil=(ia,k,push)=>{const h=hitE(ia,k);target.position.x=TX+push*h*(1-Math.exp(-Math.max(ia,0)*20));
  target.rotation.z=-0.2*h*Math.cos(ia*13);target.scale.set(1+0.04*h,1-0.06*h,1+0.04*h);return h;};

// ---------- SDF compartidas ----------
const SDF=`float sdTap(vec2 p,vec2 a,vec2 b,float ra,float rb){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdEl(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
vec2 rot2(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}`;
// silueta iluminada en un plano: SH(p) = distancia; PAINT fija base/hot/hk; luz en bandas por el gradiente, contorno oscuro
const SIL_FS=(shape,paint,extraU='')=>SDF+`uniform float uEr;uniform float uGlow;${extraU}
${shape}
void main(){vec2 p=(vUv-.5)*2.;float d=SH(p);if(d>.04)discard;
 vec2 e=vec2(.014,0.);vec2 g=vec2(SH(p+e.xy)-SH(p-e.xy),SH(p+e.yx)-SH(p-e.yx))/.028;
 float inner=clamp(-d*7.,0.,1.);vec3 n=normalize(vec3(g*(1.-inner)*1.3,.3+inner));
 float l=styLight(n,stySunV());
 vec3 base=vec3(.5);vec3 hot=vec3(0.);float hk=0.;${paint}
 vec3 c=styRampOf(base,clamp(.2+.58*l,0.,1.))*styTint(l);
 float ol=smoothstep(-.035,-.01,d);c=mix(c,base*.18,ol*.92);
 c=mix(c,hot*1.6,hk*uGlow);
 float nz=styNoise(p*.35+.5).r;float er=styErode(nz*.7+inner*.3,uEr,.08);
 float a=smoothstep(.04,.02,d)*er*uA;if(a<.02)discard;
 gl_FragColor=vec4(c,a);}`;
const silMesh=(parent,size,shape,paint,uni,opts)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),
  S.mat(SIL_FS(shape,paint,Object.keys(uni||{}).map(k=>`uniform float ${k};`).join('')),Object.assign({uEr:{value:-0.1},uGlow:{value:1}},
  Object.fromEntries(Object.entries(uni||{}).map(([k,v])=>[k,{value:v}]))),Object.assign({mode:'matter',side:THREE.DoubleSide},opts||{})));
  parent.add(m);return m;};
// sello de pincel en el suelo con dibujo propio; uP = erosión
const GLYPH=(draw,col)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;float an=atan(p.y,p.x);vec4 s=styShape(7.,vUv);
 float m=s.r*.6;${draw}if(m<.02)discard;float er=styErode(s.r*.4+s.b*.6,uP,.12);
 gl_FragColor=vec4(${col?`styRampOf(${col},.6+.4*s.g)`:'styRamp(.55+.4*s.g)'},m*er*uA*.85);}`;
// mancha orgánica en el suelo (baba, ácido); uP = erosión
const POOL=(col,alpha=.7)=>`void main(){vec2 p=vUv-.5;float r=length(p)*2.;
 float n=styNoise(vUv*.8+.13).r*.6+styNoise(vUv*.5).g*.4;float m=smoothstep(.8,.68,r+(n-.5)*.55);if(m<.01)discard;
 float er=styErode(n*.7+m*.3,uP,.14);float hl=smoothstep(.55,.75,n)*.35;
 gl_FragColor=vec4(styRampOf(${col},.35+.35*n+hl),m*er*uA*${f(alpha)});}`;
// gota/glóbulo viscoso con brillo duro (materia)
const GOO=(col)=>S.PV+`void main(){vec2 q=styPC()-.5;float d=length(vec2(q.x*(1.+max(q.y,0.)*1.4),q.y+.04));
 float m=smoothstep(.36,.3,d);float a=m*styErode(styNoise(q*.6+vMix*3.).r*.6+.4*(1.-d*2.),vK*1.05-.05,.1)*vA;if(a<.02)discard;
 float l=smoothstep(.1,-.15,q.x+q.y);float hl=step(length(q-vec2(-.1,.1)),.06);
 vec3 c=styRampOf(${col},.35+.45*l)*styTint(l);c=mix(c,vec3(1.,.97,.92),hl*.8);c=mix(${col}*.2,c,smoothstep(.36,.31,d)*.85+.15);
 gl_FragColor=vec4(c,a);}`;
// chevrón (arriba / abajo), materia con borde oscuro
const CHEV=(col,up)=>S.PV+`void main(){vec2 q=gl_PointCoord-.5;float y=${up?'-q.y':'q.y'};float d=abs(y-.1+abs(q.x)*.9);
 float o_=smoothstep(.13,.09,d)*step(abs(q.x),.38);float i_=smoothstep(.08,.05,d)*step(abs(q.x),.34);
 float a=o_*vA;if(a<.02)discard;vec3 c=mix(${col}*.25,styRampOf(${col},.85),i_);gl_FragColor=vec4(c,a);}`;
// esquirla de escudo (hexágono roto, energía azul suave)
const SHIELD_SHARD=S.PV+`void main(){vec2 q=styPC()-.5;vec2 k=abs(q);float d=max(k.x*.866+k.y*.5,k.y);
 float cut=step(dot(q,vec2(.7,-.7)),.05+vMix*.1);float m=smoothstep(.36,.32,d)*cut;
 float a=m*styErode(styNoise(q+vMix).r,vK*1.05-.05,.1)*vA;if(a<.02)discard;
 float rim=smoothstep(.26,.33,d);gl_FragColor=vec4(styRampOf(${SHIELD},.5+.45*rim)*1.25,a*.9);}`;

const defs=[];

// =====================================================================
// 1 · CATERPILLARS — dos vainas de quitina cuelgan de las puntas y eclosionan; un enjambre de orugas carmesí con
//     manchas ámbar cae al suelo, avanza en oleadas reptando y salta sobre el rival. Al trepar escupen ácido verde que
//     chisporrotea en su coraza; jirones violeta rodean la cabeza y el rival tiembla (Miedo). ti 0,95 s
// =====================================================================
const CATER_FS=S.PV+`void main(){vec2 q=styPC()-.5;q*=1.15;
 float best=9.;vec2 cc=vec2(0.);float rr=.1;float id=0.;
 for(int i=0;i<5;i++){float fi=float(i);vec2 c=vec2(-.3+.15*fi,.045*sin(fi*1.5+vMix*6.+uT*16.));float r=fi>3.5?.1:.085-.006*abs(fi-2.);
  float d=length(q-c)-r;if(d<best){best=d;cc=c;rr=r;id=fi;}}
 if(best>.02)discard;
 vec2 lp=(q-cc)/rr;float z=sqrt(max(1.-dot(lp,lp),0.));vec3 n=normalize(vec3(lp*.9,z+.2));
 float l=styLight(n,stySunV());vec3 base=id>3.5?${CHIT_D}*1.6:${CRIM};
 float spot=step(length(lp-vec2(-.1,.42)),.32)*step(id,3.5);base=mix(base,${AMBER},spot);
 vec3 c=styRampOf(base,clamp(.22+.58*l,0.,1.))*styTint(l);
 c=mix(c,${CHIT_D}*.5,smoothstep(-.03,0.,best));
 float a=smoothstep(.02,0.,best)*styErode(styNoise(q*.7+vMix*5.).r*.7+.3*z,vK*1.05-.05,.08)*vA;if(a<.02)discard;
 gl_FragColor=vec4(c,a);}`;
defs.push({key:"sty_icCaterpillars",name:"Caterpillars (estilizado)",dur:2.2,ti:0.95,pal:P_CAT,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.15,
  phases:[["Eclosión",0],["Enjambre",0.28],["Asalto",0.82],["Corrosión",0.95],["Disipación",1.75]],
build(a){
  const L=a.L,TE=0.28,TA=0.82,TI=0.95,TD=1.75;
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.23}), ring=S.groundRing(L.decal,2.6);
  const pool=groundPlane(1.9,TX,0.022,S.mat(POOL(ACID,.65),{},{mode:'matter'})); L.decal.add(pool);
  const trail=groundPlane(1,0,0.02,S.mat(`uniform float uK;void main(){float x=vUv.x;float w=abs(vUv.y-.5)*2.;float n=styNoise(vec2(x*6.,vUv.y*1.5)).r;
   float m=smoothstep(.7,.3,w+(n-.5)*.5)*step(x,uP);if(m<.02)discard;float er=styErode(n,uK,.12);
   gl_FragColor=vec4(styRampOf(${ACID},.45+.3*n),m*er*uA*.42);}`,{uK:{value:-0.1}},{mode:'matter'}),1.0);
  trail.geometry=new THREE.PlaneGeometry(6.1,1.1).rotateX(-Math.PI/2); trail.position.set(-0.15,0.02,0); L.decal.add(trail);
  const K=`const float TE=${f(TE)};const float TA=${f(TA)};const float TI=${f(TI)};const float TD=${f(TD)};const vec3 HT=${v3(HT)};const vec3 TC=${v3(TC)};const vec3 TH=${v3(TH)};`;
  // vainas en las puntas (se hinchan y revientan)
  S.pts(L.part,2,VV+K+`void main(){float i=floor(aSeed.x*2.);vec3 p=HT+vec3(.05,-.1-.06*sin(uT*9.+i),(i-.5)*.5);
   float g=smoothstep(0.,.18,uT);vA=uT<TE?1.:0.;vK=smoothstep(TE-.07,TE,uT);vR=3.14159+(i-.5)*.4;put(p,(.42+.2*g)*(1.+.12*sin(uT*30.)));}`,
   S.MATTER_FS(C.drop,{relief:5,col:CRIM}));
  // enjambre: 14 orugas que caen, reptan en oleadas y saltan sobre el rival
  S.pts(L.part,14,VV+K+`void main(){float i=floor(aSeed.x*14.);float w=mod(i,3.);float s0=TE-.05+aSeed.y*.06;
   float zl=(fract(i*.37)-.5)*1.6;
   vec3 h=HT+vec3(0.,-.1,(fract(i*.5)-.5)*.5);vec3 g0=vec3(-3.0+aSeed.z*.35,.1,zl);vec3 g1=vec3(2.35+aSeed.w*.35,.1,zl*.8);
   vec3 tp=TC+vec3(-.32+.2*fract(i*.61),(fract(i*.29)-.5)*.9,(fract(i*.43)-.5)*.5+.25);
   float tc0=TE+.06+w*.05,tc1=TA-.02+w*.02,ta=TI;vec3 p;float rot=0.;
   if(uT<tc0){float k=clamp((uT-s0)/(tc0-s0),0.,1.);p=mix(h,g0,k)+vec3(0.,.5*sin(k*3.14159),0.);rot=k*4.;}
   else if(uT<tc1){float k=clamp((uT-tc0)/(tc1-tc0),0.,1.);float kk=k+.04*sin(k*40.+i);p=mix(g0,g1,kk);p.y+=.05*abs(sin(k*24.+i));rot=.08*sin(k*30.);}
   else if(uT<ta){float k=clamp((uT-tc1)/(ta-tc1),0.,1.);p=mix(g1,tp,k)+vec3(0.,.6*sin(k*3.14159),0.);rot=1.2*k;}
   else{p=tp+vec3(0.,-.12*(uT-ta),0.);rot=1.4+.15*sin(uT*14.+i);}
   vA=uT>s0&&uT<TD?1.:0.;vK=smoothstep(TD-.45,TD,uT);vR=rot;put(p,.95+.12*aSeed.w);}`,CATER_FS);
  // salpicadura de ácido y gotas que gotean
  S.pts(L.part,20,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.2,.5,.3))*(1.8+1.6*aSeed.z);vec3 p=TC+v*(1.-exp(-t*5.))/5.+vec3(0.,-1.6*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=atan(v.x,v.y);put(p,.3+.12*aSeed.w);}`,GOO(ACID));
  S.pts(L.part,14,VV+K+`void main(){float life=.45+aSeed.y*.2;float k=(uT-TI-.1)/life+aSeed.x;float age=fract(k);
   vec3 r=rr(floor(k));vec3 p=TC+vec3((r.x-.5)*.7,.5-age*age*1.1,(r.y-.5)*.4+.25);
   vA=(uT>TI+.1&&uT<TD-.1&&p.y>.03)?1.:0.;vK=smoothstep(.8,1.,age);vR=3.14159;put(p,.2+.06*r.z);}`,S.MATTER_FS(C.drop,{relief:4,col:ACID}));
  // vapor ácido que chisporrotea
  S.pts(L.part,12,VV+K+`void main(){float life=.6+aSeed.y*.3;float k=(uT-TI)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=TC+vec3((r.x-.5)*.8,-.2+age*1.,(r.y-.5)*.5+.2);vA=(uT>TI&&uT<TD)?smoothstep(0.,.2,age):0.;vK=smoothstep(.35,1.,age);vR=r.z*6.;
   put(p,(.36+.14*r.z)*(.7+.6*age));}`,S.MATTER_FS(C.puff,{relief:4,col:LEAFY,bias:.05}));
  // Miedo: jirones violeta oscuros que rodean la cabeza y gotas de sudor
  S.pts(L.part,7,VV+K+`void main(){float an=aSeed.x*6.2832+uT*2.6;float on=smoothstep(TI+.05,TI+.25,uT)*(1.-smoothstep(TD-.2,TD+.1,uT));
   vec3 p=TH+vec3(cos(an)*.55,.2+.12*sin(uT*3.+aSeed.y*6.),sin(an)*.45);vA=on;vK=.25+.3*(1.-on);vR=an;put(p,.28+.08*aSeed.z);}`,
   S.MATTER_FS(C.puff,{relief:3,col:VIOLET,bias:-.15}));
  S.pts(L.part,6,VV+K+`void main(){float life=.5;float k=(uT-TI-.15)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=TH+vec3((r.x-.5)*.6,.1-age*.5,.3);vA=(uT>TI+.15&&uT<TD-.15)?1.-age:0.;vK=0.;vR=3.14159;put(p,.17);}`,
   S.MATTER_FS(C.drop,{relief:4,col:L3(.6,.82,1.)}));
  const tu=trail.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    tu.uP.value=cl((te-TE-0.06)/(TA-TE)); tu.uK.value=-0.1+1.1*ss(TA,TD,te); tu.uA.value=ss(TE,TE+0.1,te);
    spark.pose(ia,TC,1); ring.pose(ia,TX,0,0.45,0.9);
    pool.visible=ia>0; pool.scale.setScalar(Math.max(0.4+0.6*e3(ia/0.4),0.001)); set(pool,-0.1+1.1*ss(TD-0.5,TD+0.3,te),ia>0?1:0);
    const h=recoil(ia,6,0.22);
    const fear=ss(TI+0.05,TI+0.25,te)*(1-ss(TD-0.2,TD+0.1,te));
    target.position.x+=0.03*fear*Math.sin(te*70); target.rotation.z+=0.03*fear*Math.sin(te*53);
    o.em=Math.max(0.3*h,0.18*fear); o.emc.copy(U.uC1.value);
    if(te<TE){o.g.copy(HT);o.gs=0.5;o.ga=0.1;o.li=0.8;}
    else if(ia<0){o.g.set(-3+6*cl((te-TE)/(TA-TE)),0.3,0);o.gs=0.8;o.ga=0.06;o.li=0.8;}
    else{o.g.copy(TC);o.gs=1+1.2*h;o.ga=0.3*h;o.li=3*h;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.5;
  };
}});

// =====================================================================
// 2 · LAGGING — una concha de caracol en espiral se dibuja a pincel en las puntas y gira; dispara un glóbulo de baba
//     rosada lento y pesado que se estira y gotea en el vuelo, revienta pegajoso en el rival y lo deja chorreando
//     baba (charco brillante) con chevrones violeta (Débil). ti 0,68 s
// =====================================================================
defs.push({key:"sty_icLagging",name:"Lagging (estilizado)",dur:2.3,ti:0.68,pal:P_SNAIL,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Espiral",0],["Rayo",0.38],["Impacto",0.68],["Baba",0.85],["Fin",1.95]],
build(a){
  const L=a.L,TR=0.38,TI=0.68,TB=0.85,TE=1.95;
  const P0=V3(-3.2,2.05,0.15), P1=V3(0,2.6,0.3), P2=TC.clone();
  // concha en espiral (materia, quitina carmesí con banda rosa) que se dibuja y gira
  const shell=silMesh(L.mesh,1.5,`
   float SH(vec2 p){p=rot2(p,-uS);float r=length(p);float an=atan(p.y,p.x)+3.14159;float t=(log(max(r,.02)/.07)/.32-an)/6.2832;
    float fr=fract(t);float arm=abs(fr-.5)*2.;float w=.55;float d=(arm-w)*r*.5;d=max(d,r-.9*uD);d=max(d,.05-r);return d;}`,
   `base=mix(${CRIM},${PINK},smoothstep(.2,.8,length(p)));float band=step(.5,fract(length(p)*4.5));base=mix(base,${CHIT_D}*1.5,band*.35);hot=${PINK};hk=.15;`,
   {uD:0,uS:0});
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.55,28,20),S.mat(`void main(){vec3 n=normalize(vN);float l=styLight(n,normalize((viewMatrix*vec4(uSunW,0.)).xyz));
   float fr=pow(1.-abs(dot(n,normalize(vV))),2.);float nz=styNoise(vUv*vec2(2.,1.)+uT*.2).r;
   vec3 c=styRampOf(${SLIME},clamp(.22+.55*l+nz*.12,0.,1.))*styTint(l);c+=${PINK}*fr*.45;
   float hl=step(.93,dot(reflect(-normalize(vV),n),normalize((viewMatrix*vec4(uSunW,0.)).xyz)));c=mix(c,vec3(1.,.96,.94),hl*.85);
   gl_FragColor=vec4(c,uA*.94);}`,{},{mode:'matter'})); L.mesh.add(ball);
  const spark=S.hitSpark(L.mesh,1.3,{seed:0.6}), ring=S.groundRing(L.decal,2.4);
  const pool=groundPlane(2.2,TX,0.022,S.mat(POOL(SLIME,.72),{},{mode:'matter'})); L.decal.add(pool);
  const K=`const float TR=${f(TR)};const float TI=${f(TI)};const float TB=${f(TB)};const float TE=${f(TE)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};const vec3 P2=${v3(P2)};const vec3 TC=${v3(TC)};
   vec3 bz(float t){float u=1.-t;return u*u*P0+2.*u*t*P1+t*t*P2;}`;
  // gotas que se desprenden del glóbulo en vuelo
  S.pts(L.part,16,VV+K+`void main(){float s=TR+aSeed.x*(TI-TR);float life=.45+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=bz(clamp((s-TR)/(TI-TR),0.,1.))+rnd()*.12+vec3(0.,-1.8*t*t-.15*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.6,1.,age);vR=3.14159;put(p,.22+.1*aSeed.w);}`,GOO(SLIME));
  // reventón pegajoso y chorretones en el rival
  S.pts(L.part,22,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.1,.45,.3))*(1.4+1.6*aSeed.z);vec3 p=TC+v*(1.-exp(-t*6.))/6.+vec3(0.,-1.4*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.55,1.,age);vR=atan(v.x,v.y);put(p,.34+.14*aSeed.w);}`,GOO(SLIME));
  S.pts(L.part,12,VV+K+`void main(){float life=.7+aSeed.y*.3;float k=(uT-TB)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=TC+vec3((r.x-.5)*.7,.45-age*age*.9,(r.y-.5)*.4+.22);
   vA=(uT>TB&&uT<TE-.1&&p.y>.03)?1.:0.;vK=smoothstep(.8,1.,age);vR=3.14159;put(p,(.2+.08*r.z)*(1.+.5*age));}`,S.MATTER_FS(C.drop,{relief:5,col:SLIME}));
  // Débil: chevrones violeta hacia abajo
  S.pts(L.part,8,VV+K+`void main(){float life=.7;float k=(uT-TB)/life+aSeed.x;float age=fract(k);float an=aSeed.y*6.2832+uT*.6;
   vec3 p=TC+vec3(cos(an)*.6,1.1-age*1.2,sin(an)*.5);vA=(uT>TB&&uT<TE)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3);}`,CHEV(L3(.6,.38,.95),false));
  const su=shell.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    // concha: se dibuja (0..TR), gira y se desvanece al disparar
    towardCam(shell.position,tmp.set(-3.25,2.35,0.1),0.3); billboard(shell);
    su.uD.value=e3(te/(TR*0.8)); su.uS.value=te*5; su.uEr.value=te<TR?-0.1:-0.1+1.1*ss(TR,TR+0.25,te);
    shell.visible=te<TR+0.25; shell.scale.setScalar(0.8+0.25*ss(0,TR,te)); shell.material.uniforms.uA.value=1;
    // glóbulo de baba lento (arco pesado), se estira en el vuelo
    const k=cl((te-TR)/(TI-TR)), u=k*k*(3-2*k)*0.4+k*0.6;
    bez(P0,P1,P2,u,ball.position); bez(P0,P1,P2,Math.min(u+0.04,1),tmp2);
    ball.visible=te>TR-0.08&&ia<0; const g=ss(TR-0.08,TR,te);
    const st=1+0.35*Math.sin(Math.PI*k); ball.scale.set(g*st,g/st,g);
    tmp3.subVectors(tmp2,ball.position); ball.rotation.z=Math.atan2(tmp3.y,tmp3.x); set(ball,0,1);
    spark.pose(ia,TC,0.9); ring.pose(ia,TX,0,0.5,0.85);
    pool.visible=ia>0; pool.scale.setScalar(Math.max(0.35+0.65*e3(ia/0.5),0.001)); set(pool,-0.1+1.1*ss(TE-0.5,TE+0.3,te),ia>0?1:0);
    const h=recoil(ia,5,0.2);
    const sl=ss(TI,TB,te)*(1-ss(TE-0.3,TE,te)); target.scale.y*=1-0.05*sl;
    o.em=Math.max(0.3*h,0.15*sl); o.emc.copy(U.uC1.value);
    if(te<TR){o.g.set(-3.25,2.35,0.1);o.gs=0.6;o.ga=0.12;o.li=1;}
    else if(ia<0){o.g.copy(ball.position);o.gs=0.7;o.ga=0.1;o.li=1.2;}
    else{o.g.copy(TC);o.gs=1+1.2*h;o.ga=0.3*h;o.li=3*h;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.4;
  };
}});

// =====================================================================
// 3 · LEAF BUG — brotan hojas a los pies; tres insectos hoja (siluetas de hoja con patas) saltan y se posan sobre el
//     lanzador; sus hojas se despliegan en un caparazón de hojas superpuestas con nervios ámbar (escudo 55) que late y
//     se camufla (cambia de tono) antes de erosionarse. ti 0,8 s
// =====================================================================
defs.push({key:"sty_icLeafBug",name:"Leaf Bug · Horn (estilizado)",dur:2.3,ti:0.8,pal:P_LEAF,tier:2,stylized:true,
  phases:[["Brote",0],["Salto",0.25],["Aterrizaje",0.8],["Capullo",1.0],["Camuflaje",1.55],["Fin",2.0]],
build(a){
  const L=a.L,TS=0.25,TI=0.8,TC_=1.0,TM=1.55,TE=2.0,CC=V3(CX,0.95,0);
  const bugs=[0,1,2].map(()=>silMesh(L.mesh,1.75,`
   float SH(vec2 p){float d=sdEl(p-vec2(0.,-.05),vec2(.2,.55));
    d=smin(d,sdEl(p-vec2(0.,.52),vec2(.07,.09)),.04);
    for(int i=0;i<3;i++){float fi=float(i);float y=.2-fi*.25;float sw=uL*.25*sin(fi*2.);
     vec2 q=vec2(abs(p.x),p.y);d=min(d,sdTap(q,vec2(.14,y),vec2(.42,y+.12+sw),.03,.015));}
    vec2 q=vec2(abs(p.x),p.y);d=min(d,sdTap(q,vec2(.03,.58),vec2(.18,.92),.015,.008));return d;}`,
   `float rib=smoothstep(.025,.0,abs(p.x))*step(-.55,p.y)*step(p.y,.45);float vein=smoothstep(.03,0.,abs(fract((p.y+abs(p.x)*1.2)*5.)-.5)-.4)*step(abs(p.x),.18);
    base=mix(${MOSS},${LEAFY},.3+.4*smoothstep(-.5,.5,p.y));base=mix(base,${AMBER},max(rib,vein)*.6);hot=${LEAFY};hk=0.;`,{uL:0}));
  const shellM=new THREE.Mesh(new THREE.SphereGeometry(1.0,32,20,0,Math.PI*2,0,Math.PI*0.62),S.mat(`uniform float uG;uniform float uM;
   void main(){vec3 n=normalize(vN);float fr=pow(1.-abs(dot(n,normalize(vV))),2.2);
    vec2 g=vec2(atan(vP.z,vP.x)*1.6,vP.y*3.2);vec2 cell=floor(g);vec2 fp=fract(g)-.5;
    float leaf=smoothstep(.5,.38,abs(fp.x)+fp.y*fp.y*1.2);float vein=smoothstep(.05,0.,abs(fp.x))*leaf;
    float er=styErode(styNoise(vUv*2.).r*.6+leaf*.4,uP,.1);
    vec3 col=mix(${MOSS_D},${MOSS},.45+.4*leaf+.15*sin(cell.x*1.7+cell.y));col=mix(col,${LEAFY}*1.1,uM*(.5+.5*sin(uT*6.+cell.x)));
    col=mix(col,${AMBER},vein*.7);col+=${LEAFY}*fr*.6*uG;
    float a=(leaf*.55+fr*.4)*er*uA;if(a<.02)discard;gl_FragColor=vec4(col,a);}`,{uG:{value:1},uM:{value:0}},{mode:'matter',side:THREE.DoubleSide}));
  shellM.position.set(CX,0.02,0); L.mesh.add(shellM);
  const ring=S.groundRing(L.decal,2.6);
  const glyph=groundPlane(2.6,CX,0.025,S.mat(GLYPH(`float k=fract((an/6.2832+.5)*7.);m+=smoothstep(.07,0.,abs(k-.5)-.08)*step(.35,r)*step(r,.8)*.6;`,MOSS),{},{mode:'matter'})); L.decal.add(glyph);
  const K=`const float TS=${f(TS)};const float TI=${f(TI)};const float TC=${f(TC_)};const float TE=${f(TE)};const vec3 CC=${v3(CC)};`;
  // brotes a los pies
  S.pts(L.part,12,VV+K+`void main(){float an=aSeed.x*6.2832;float g=smoothstep(aSeed.y*.15,.25+aSeed.y*.15,uT);
   vec3 p=vec3(${f(CX)}+cos(an)*(.6+.25*aSeed.z),.1+.25*g,sin(an)*(.55+.2*aSeed.z));vA=uT<TC+.2?1.:0.;vK=smoothstep(TC,TC+.2,uT);
   vR=-1.5708+(aSeed.w-.5)*.8;put(p,.4*g);}`,S.MATTER_FS(C.leaf,{relief:5,col:MOSS}));
  // hojas que se despliegan en el caparazón y luego caen al camuflarse
  S.pts(L.part,16,VV+K+`void main(){float i=floor(aSeed.x*16.);float an=i/16.*6.2832+uT*.4;float row=mod(i,2.);
   float k=smoothstep(TI+i*.012,TC+.05+i*.01,uT);vec3 h=CC+vec3(cos(an)*.95,.15+row*.45-.2,sin(an)*.8);
   vec3 p=mix(CC+vec3(0.,.4,0.),h,k);float fall=smoothstep(TE-.35,TE+.1,uT);p.y-=fall*(.5+.3*aSeed.y);p.x+=fall*cos(an)*.3;
   vA=uT>TI?1.:0.;vK=smoothstep(TE-.25,TE+.1,uT);vR=an*.5+row*.6+sin(uT*3.+i)*.1;put(p,.7+.12*aSeed.w);}`,S.MATTER_FS(C.leaf,{relief:6,col:MOSS,bias:.05}));
  // motas de camuflaje
  S.pts(L.part,12,VV+K+`void main(){float life=.6;float k=(uT-${f(TM)})/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=CC+vec3((r.x-.5)*1.6,-.5+age*1.6,(r.y-.5)*1.2);vA=(uT>${f(TM)}&&uT<TE)?sin(age*3.14159):0.;vK=0.;vR=r.z*6.;put(p,.16);}`,
   S.ENERGY_FS(C.spark,{gain:.9}),{mode:'energy'});
  const P0s=[V3(-2.4,0.1,0.8),V3(-4.9,0.1,0.6),V3(-3.4,0.1,-1.0)], P1s=[V3(-2.9,2.5,0.8),V3(-4.6,2.6,0.5),V3(-3.5,2.8,-0.6)],
    P2s=[V3(-3.35,1.25,0.45),V3(-4.05,1.15,0.4),V3(-3.7,1.7,0.2)];
  const shu=shellM.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    bugs.forEach((b,i)=>{const s0=TS+i*0.06, k=cl((te-s0)/(TI-s0)), u=k*k*(3-2*k);
      bez(P0s[i],P1s[i],P2s[i],u,b.position); billboard(b,te<TI?(i-1)*0.6+u*2*(i===1?-1:1):(i-1)*0.4);
      b.visible=te>s0-0.12&&te<TC_+0.15; b.scale.setScalar(Math.max(ss(s0-0.12,s0,te),0.001));
      const bu=b.material.uniforms; bu.uL.value=Math.sin(te*22+i); bu.uEr.value=te<TI?-0.1:-0.1+1.1*ss(TI,TC_+0.15,te); bu.uA.value=1;});
    const sh=ss(TI,TC_,te), out=ss(TE-0.35,TE+0.1,te);
    shellM.visible=te>TI; shellM.scale.set(1,Math.max(0.2+0.8*e3((te-TI)/0.25),0.001),1);
    shu.uP.value=-0.1+1.1*out; shu.uA.value=sh*(0.85+0.15*Math.sin(te*9)); shu.uM.value=ss(TM-0.1,TM+0.2,te); shu.uG.value=0.6+0.6*hitE(te-TC_,5);
    ring.pose(te-TC_,CX,0,0.45,1);
    glyph.visible=te>0.1; set(glyph,-0.1+1.1*ss(TE-0.4,TE+0.1,te),ss(0.1,0.4,te));
    const k=hitE(ia,6); glowOf(caster,U.uC1.value,0.3*k+0.12*sh*(1-out));
    caster.scale.set(1+0.04*k,1-0.05*k,1+0.04*k);
    if(te<TI){o.g.set(CX,0.8,0);o.gs=0.6;o.ga=0.08;o.li=0.8;}
    else{o.g.copy(CC);o.gs=1.2+k;o.ga=0.25*k+0.08*sh;o.li=1+2*k;}
    o.ia=ia;o.c.copy(CC);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

// =====================================================================
// 4 · PARASITE — un parásito de quitina carmesí (silueta de garrapata: abdomen con placas, seis patas, quelíceros y una
//     marca dorsal que brilla) se gesta en las puntas, salta en arco y se aferra a la cabeza del rival. Muerde: el escudo
//     del rival estalla en esquirlas hexagonales azules; roe con latidos, un hilo carmesí lleva lo robado al lanzador y
//     lo cubre con una coraza de quitina (+30 de escudo); al final se suelta y cae erosionándose. ti 0,75 s
// =====================================================================
defs.push({key:"sty_icParasite",name:"Parasite (estilizado)",dur:2.3,ti:0.75,pal:P_PARA,tier:2,stylized:true,zoneCaster:0.6,zoneTarget:1.1,
  phases:[["Gestación",0],["Salto",0.25],["Mordida",0.75],["Roer",0.9],["Descarte",1.25],["Fin",1.85]],
build(a){
  const L=a.L,TJ=0.25,TI=0.75,TR=0.9,TD=1.25,TE=1.85;
  const P0=V3(-3.35,2.15,0.15), P1=V3(-0.2,3.6,0.5), P2=V3(3.05,1.75,0.45);
  const para=silMesh(L.mesh,2.1,`
   float SH(vec2 p){vec2 q=vec2(abs(p.x),p.y);float d=sdEl(p-vec2(0.,-.12),vec2(.3*(1.+.06*uB),.36*(1.+.06*uB)));
    d=smin(d,sdEl(p-vec2(0.,.3),vec2(.15,.12)),.05);
    d=min(d,sdTap(q,vec2(.05,.4),vec2(.09+.03*uL,.55),.035,.01));
    for(int i=0;i<3;i++){float fi=float(i);float y=.1-fi*.2;float sw=.08*sin(uL*3.+fi*2.1);
     vec2 k=vec2(.38,y+.06+sw);d=min(d,min(sdTap(q,vec2(.2,y),k,.035,.025),sdTap(q,k,k+vec2(.16,-.2-.05*fi),.025,.01)));}
    return d;}`,
   `float plate=smoothstep(.03,0.,abs(fract((p.y+.12)*4.)-.5)-.42)*step(sdEl(p-vec2(0.,-.12),vec2(.28,.34)),0.);
    float mark=step(abs(p.x)*1.5+abs(p.y+.12-.0)*.9,.14)*step(sdEl(p-vec2(0.,-.12),vec2(.3,.36)),0.);
    base=mix(${CRIM},${CRIM_L},smoothstep(-.4,.3,p.y)*.35);base=mix(base,${CHIT_D}*1.3,plate*.7);base=mix(base,${GOLD},mark);hot=${GOLD};hk=mark;`,
   {uL:0,uB:0});
  const shellC=new THREE.Mesh(new THREE.SphereGeometry(0.95,30,20,0,Math.PI*2,0,Math.PI*0.6),S.mat(`void main(){vec3 n=normalize(vN);
   float fr=pow(1.-abs(dot(n,normalize(vV))),2.);vec2 g=vec2(atan(vP.z,vP.x)*2.,vP.y*4.);vec2 fp=fract(g)-.5;
   float plate=smoothstep(.5,.42,max(abs(fp.x),abs(fp.y)));float seam=1.-plate;
   float er=styErode(styNoise(vUv*2.).r*.6+plate*.4,uP,.1);
   vec3 c=mix(${CRIM},${CRIM_L},fr*.6);c=mix(c,${CHIT_D},seam*.8);
   float a=(plate*.32+fr*.5+seam*.3)*er*uA;if(a<.02)discard;gl_FragColor=vec4(c,a);}`,{},{mode:'matter',side:THREE.DoubleSide}));
  shellC.position.set(CX,0.02,0); L.mesh.add(shellC);
  const spark=S.hitSpark(L.mesh,1.4,{seed:0.81}), ring=S.groundRing(L.decal,2.4), ringC=S.groundRing(L.decal,2.4);
  const K=`const float TJ=${f(TJ)};const float TI=${f(TI)};const float TR=${f(TR)};const float TD=${f(TD)};const float TE=${f(TE)};
   const vec3 P2=${v3(P2)};const vec3 TC=${v3(TC)};const vec3 CC=vec3(${f(CX)},1.,0.);`;
  // motas carmesí de la gestación
  S.pts(L.part,10,VV+K+`void main(){float s=aSeed.x*.15;float k=clamp((uT-s)/.18,0.,1.);vec3 a0=vec3(-3.35,2.15,.15)+normalize(rnd()+vec3(0.,.3,0.))*(.7+.3*aSeed.z);
   vec3 p=mix(a0,vec3(-3.35,2.15,.15),k*k);vA=(uT>s&&k<1.)?1.:0.;vK=0.;vR=aSeed.y*6.;put(p,.2);}`,S.ENERGY_FS(C.spark,{gain:1.2}),{mode:'energy'});
  // esquirlas del escudo roto
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.55+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.2,.35,.3))*(2.+2.2*aSeed.z);vec3 p=TC+v*(1.-exp(-t*4.))/4.+vec3(0.,-1.2*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.+t*6.;put(p,.4+.15*aSeed.w);}`,SHIELD_SHARD,{mode:'energy'});
  // hilo carmesí: motas que viajan del rival al lanzador mientras roe
  S.pts(L.part,24,VV+K+`void main(){float life=.4;float k=(uT-TR)/life+aSeed.x;float age=fract(k);vec3 A=P2+vec3(0.,-.1,0.);vec3 B=CC+vec3(0.,.3,0.);
   vec3 m=mix(A,B,.5)+vec3(0.,1.4,0.);float u=age;vec3 p=(1.-u)*(1.-u)*A+2.*(1.-u)*u*m+u*u*B+rnd()*.05;
   vA=(uT>TR&&uT<TD+.1)?1.:0.;vK=0.;vR=0.;put(p,.22+.06*aSeed.w);}`,S.MATTER_FS(C.drop,{relief:4,col:CRIM,bias:.1}));
  // gotitas al soltarse
  S.pts(L.part,10,VV+K+`void main(){float s=TD+aSeed.x*.06;float life=.5;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 p=P2+rnd()*vec3(.25,.15,.2)+vec3(.3*t,-1.6*t*t,0.);vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.5,1.,age);vR=3.14159;put(p,.18);}`,
   GOO(CRIM));
  const pu=para.material.uniforms, scu=shellC.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI;
    const k=cl((te-TJ)/(TI-TJ)), u=Math.pow(k,1.3);
    if(te<TJ){para.position.copy(P0);}
    else if(ia<0){bez(P0,P1,P2,u,para.position);}
    else if(te<TD){para.position.copy(P2).add(tmp.set(0.02*Math.sin(te*40),0.03*Math.sin(te*25),0));}
    else{const t=te-TD;para.position.copy(P2).add(tmp.set(0.5*t,-2.2*t*t,0.1));}
    bez(P0,P1,P2,Math.min(u+0.03,1),tmp2); const dx=tmp2.x-para.position.x, dy=tmp2.y-para.position.y;
    const roll=te<TJ?0.2:ia<0?-Math.atan2(dx,dy)+0.0:te<TD?2.8:2.8+(te-TD)*6;
    billboard(para,roll); para.visible=te<TE;
    para.scale.setScalar(Math.max(ss(0,TJ,te)*(1+0.2*ss(TJ,TI,te)),0.001));
    pu.uL.value=te*(ia<0?14:te<TD?6:20); pu.uB.value=te>TR&&te<TD?Math.max(0,Math.sin((te-TR)*24)):0;
    pu.uEr.value=te<TD+0.15?-0.1:-0.1+1.1*ss(TD+0.15,TE,te); pu.uGlow.value=0.6+0.8*(te>TR&&te<TD?1:0); pu.uA.value=1;
    spark.pose(ia,TC,1); ring.pose(ia,TX,0,0.45,0.9);
    const gain=ss(TR+0.15,TD+0.1,te), out=ss(TE-0.4,TE,te);
    shellC.visible=gain>0.001; scu.uA.value=gain*(0.85+0.15*Math.sin(te*10)); scu.uP.value=-0.1+1.1*out;
    shellC.scale.set(1,Math.max(0.3+0.7*e3((te-TR-0.15)/0.3),0.001),1);
    ringC.pose(te-TD,CX,0,0.45,0.9);
    const h=recoil(ia,6,0.18); const gnaw=te>TR&&te<TD?Math.max(0,Math.sin((te-TR)*24)):0;
    target.scale.y*=1-0.03*gnaw;
    o.em=Math.max(0.3*h,0.15*gnaw); o.emc.copy(U.uC1.value); glowOf(caster,U.uC1.value,0.25*gain*(1-out));
    if(te<TJ){o.g.copy(P0);o.gs=0.5;o.ga=0.12;o.li=0.8;}
    else if(ia<0){o.g.copy(para.position);o.gs=0.6;o.ga=0.1;o.li=1;}
    else{o.g.copy(TC);o.gs=1+1.3*h;o.ga=0.3*h;o.li=3*h;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.4;
  };
}});

// =====================================================================
// 5 · PLIERS — dos pinzas gigantes de quitina carmesí con filo plateado y dientes se proyectan alrededor del rival,
//     se abren de par en par y se cierran de golpe; esquirlas de escudo azul (el +30 % contra escudo), chispas oscuras;
//     aprietan temblando y se disuelven. Cuerpo a cuerpo. ti 0,66 s
// =====================================================================
defs.push({key:"sty_icPliers",name:"Pliers (estilizado)",dur:2.1,ti:0.66,pal:P_PLIER,tier:2,stylized:true,zoneCaster:0.45,zoneTarget:1.85,
  phases:[["Forma",0],["Apertura",0.3],["Chasquido",0.66],["Presa",0.8],["Disolución",1.22],["Fin",1.7]],
build(a){
  const L=a.L,TO=0.3,TI=0.66,TP=0.8,TD=1.22,TE=1.7;
  // pinzas: dos garras curvas de quitina que se estrechan hacia la punta, en arco alrededor del rival (centro del plano);
  // pivote a la izquierda (lado del lanzador), uO = apertura, uM = 1 garra de arriba / −1 de abajo. Segmentos con bandas
  // oscuras, brillo a lo largo del lomo, dientes en el filo interior y punta plateada.
  const CLAW_SH=`const float R=.62;const float A1=-.28;
   float SH(vec2 p){p.y*=uM;vec2 pv=vec2(-R,0.);vec2 q=rot2(p-pv,-uO)+pv;
    float r=length(q);float aa=atan(q.y,q.x);if(aa<-1.6)aa+=6.2832;float t=(3.14159-aa)/(3.14159-A1);
    float w=.15*pow(clamp(1.-t,0.,1.),.85)+.012;float teeth=.035*max(sin(t*46.),0.)*step(r,R)*step(.12,t)*step(t,.9);
    float d=abs(r-R+.02*t)-w-teeth;d=max(d,max(-t,t-1.)*3.4*r);
    d=min(d,length(p-pv)-.13);return d;}`;
  const CLAW_PAINT=`vec2 pp=p;pp.y*=uM;vec2 pv=vec2(-.62,0.);vec2 q=rot2(pp-pv,-uO)+pv;float r=length(q);float aa=atan(q.y,q.x);if(aa<-1.6)aa+=6.2832;
    float t=clamp((3.14159-aa)/(3.42159),0.,1.);
    base=mix(${CRIM},${CRIM_L},.25+.35*smoothstep(.62,.75,r));
    float seg=smoothstep(.035,0.,abs(fract(t*5.)-.5)-.43)*step(t,.85);base=mix(base,${CHIT_D}*1.2,seg*.85);
    float sheen=smoothstep(.06,0.,abs(r-.7))*step(t,.9);base=mix(base,${CRIM_L}*1.25,sheen*.55);
    base=mix(base,${SILVER},smoothstep(.82,.95,t));hot=${CRIM_L};hk=0.;`;
  const claws=[1,-1].map(sg=>silMesh(L.mesh,2.7,CLAW_SH,CLAW_PAINT,{uO:0.05,uM:sg},{depthTest:true}));
  const spark=S.hitSpark(L.mesh,1.2,{seed:0.53}), ring=S.groundRing(L.decal,2.6);
  const K=`const float TI=${f(TI)};const float TP=${f(TP)};const float TD=${f(TD)};const vec3 TC=${v3(TC)};`;
  // esquirlas de escudo azul en el chasquido
  S.pts(L.part,16,VV+K+`void main(){float s=TI+aSeed.x*.04;float life=.5+aSeed.y*.3;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(.2,.3,.4))*(2.2+2.*aSeed.z);vec3 p=TC+v*(1.-exp(-t*4.5))/4.5+vec3(0.,-1.2*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.45,1.,age);vR=aSeed.w*6.+t*7.;put(p,.38+.15*aSeed.w);}`,SHIELD_SHARD,{mode:'energy'});
  // esquirlas de quitina oscura y chispas al apretar
  S.pts(L.part,14,VV+K+`void main(){float s=TI+aSeed.x*.05;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
   vec3 v=normalize(rnd()+vec3(-.3,.4,.3))*(1.6+1.6*aSeed.z);vec3 p=TC+v*(1.-exp(-t*5.))/5.+vec3(0.,-1.5*t*t,0.);
   vA=(age>0.&&age<1.&&p.y>.03)?1.:0.;vK=smoothstep(.4,1.,age);vR=aSeed.w*6.+t*5.;put(p,.3+.1*aSeed.w);}`,S.MATTER_FS(C.shard,{relief:4,col:CRIM}));
  S.pts(L.part,10,VV+K+`void main(){float life=.18;float k=(uT-TP)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=TC+vec3((r.x-.5)*.7,(r.y-.5)*.7,.35);vA=(uT>TP&&uT<TD)?1.-age:0.;vK=age;vR=r.z*6.;put(p,.22);}`,S.ENERGY_FS(C.spark,{gain:1.1}),{mode:'energy'});
  a.pose=function(te,o){
    const ia=te-TI;
    const form=ss(0,TO,te);
    let open;
    if(te<TO)open=0.25+0.15*form; else if(ia<0)open=0.4+0.25*e3((te-TO)/(TI-TO-0.06)); else open=-0.09+0.02*Math.sin(te*50)*(te<TD?1:0);
    if(ia<0&&te>TI-0.06)open=0.65*(1-cl((te-(TI-0.06))/0.06))-0.09*cl((te-(TI-0.06))/0.06);
    claws.forEach((m,i)=>{const cu=m.material.uniforms;
      towardCam(m.position,tmp.set(TX-0.05,1.15,0),0.55+0.08*i); billboard(m); m.rotateY(i?-0.38:0.38); m.rotateX(i?0.12:-0.12);
      cu.uO.value=open; cu.uEr.value=te<TD?-0.1+0.9*(1-form):-0.1+1.1*ss(TD,TE,te); cu.uA.value=1; cu.uGlow.value=1;
      m.visible=te<TE; m.scale.setScalar(Math.max((0.75+0.25*form)*(1+0.05*hitE(ia,9)),0.001));});
    spark.pose(ia,tmp2.copy(TC).add(tmp3.set(0.1,0,0.2)),1.15); ring.pose(ia,TX,0,0.45,1);
    const h=hitE(ia,7), grip=te>TI&&te<TD?1:0;
    target.position.x=TX+0.06*h*Math.sin(ia*40); target.rotation.z=0.04*grip*Math.sin(te*45);
    target.scale.set(1-0.08*grip*(0.7+0.3*h),1+0.05*grip,1-0.06*grip);
    o.em=0.35*h+0.1*grip; o.emc.copy(U.uC1.value);
    if(ia<0){o.g.set(TX-0.4,1.2,0);o.gs=0.6+0.3*form;o.ga=0.1;o.li=1;}
    else{o.g.copy(TC);o.gs=1+1.3*h;o.ga=0.32*h;o.li=3*h;}
    o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=0.5;o.flash=0.5;
  };
}});

// =====================================================================
// 6 · ANTENNA — chispas carmesí en las puntas de las antenas; un barrido de radar pintado gira a los pies, lanza dos
//     pulsos de detección que recorren el tablero y un anillo de alcance discontinuo se abre de 1 a 2 casillas y se fija
//     (+1 de alcance); a los pies, un remolino dorado con chevrones (+1 PM). Rápido, nivel 1. ti 0,38 s
// =====================================================================
defs.push({key:"sty_icAntenna",name:"Antenna (estilizado)",dur:1.3,ti:0.38,pal:P_ANT,tier:1,stylized:true,
  phases:[["Chispa",0],["Barrido",0.12],["Pulso",0.38],["Alcance",0.66],["Fin",1.0]],
build(a){
  const L=a.L,TB=0.12,TI=0.38,TR=0.66,TE=1.05,TILE=1.93;
  const radar=groundPlane(4.2,CX,0.028,S.mat(`uniform float uS;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
   float d=mod(uS-an,6.2832);float wedge=exp(-d*2.2)*step(r,1.)*smoothstep(.12,.2,r);
   float rings=smoothstep(.03,0.,abs(fract(r*3.)-.5)-.46)*step(r,1.)*.5;float tick=smoothstep(.02,0.,abs(fract(an/6.2832*24.)-.5)-.47)*step(.88,r)*step(r,1.);
   float m=wedge*.75+rings*.4+tick*.7;if(m<.02)discard;
   gl_FragColor=vec4(mix(styRampOf(${CRIM},.6),styRampOf(${GOLD},.85),wedge)*1.1,m*uA);}`,{uS:{value:0}},{mode:'energy'})); L.decal.add(radar);
  const range=groundPlane(4*TILE+0.6,CX,0.03,S.mat(`uniform float uR;void main(){vec2 p=(vUv-.5)*${f(4*TILE+0.6)};float r=length(p);float an=atan(p.y,p.x);
   float dash=step(.45,fract(an/6.2832*36.));float ring=smoothstep(.07,.02,abs(r-uR))*dash;float halo=smoothstep(.35,0.,abs(r-uR))*.25;
   float m=ring+halo;if(m<.02)discard;gl_FragColor=vec4(styRampOf(${GOLD},.7+.3*ring)*1.15,m*uA);}`,{uR:{value:TILE}},{mode:'energy'})); L.decal.add(range);
  const pulses=[S.groundRing(L.decal,6.0),S.groundRing(L.decal,6.0)];
  const swirl=groundPlane(1.9,CX,0.032,S.mat(GLYPH(`float k=fract(an/6.2832*3.+r*1.4-uT*2.);m=smoothstep(.12,0.,abs(k-.5)-.25)*step(.25,r)*step(r,.9)*.9;`,GOLD),{},{mode:'energy'})); L.decal.add(swirl);
  const K=`const float TB=${f(TB)};const float TI=${f(TI)};const float TR=${f(TR)};const float TE=${f(TE)};`;
  // chispas en las puntas
  S.pts(L.part,10,VV+K+`void main(){float i=floor(aSeed.x*2.);float life=.12;float k=uT/life+aSeed.y;float age=fract(k);vec3 r=rr(floor(k));
   vec3 p=vec3(-3.5,2.12,(i-.5)*.44)+(r-.5)*.12;vA=uT<TI+.1?1.-age:0.;vK=age;vR=r.z*6.;put(p,.24+.1*r.x);}`,S.ENERGY_FS(C.spark,{gain:1.3}),{mode:'energy'});
  // chevrones dorados (+1 PM) que suben alrededor del lanzador
  S.pts(L.part,6,VV+K+`void main(){float life=.55;float k=(uT-TR)/life+aSeed.x;float age=fract(k);float an=aSeed.y*6.2832+uT;
   vec3 p=vec3(${f(CX)}+cos(an)*.55,.2+age*1.2,sin(an)*.5);vA=(uT>TR-.1&&uT<TE)?sin(age*3.14159):0.;vK=0.;vR=0.;put(p,.3);}`,CHEV(GOLD,true));
  const ru=radar.material.uniforms, gu=range.material.uniforms;
  a.pose=function(te,o){
    const ia=te-TI, out=ss(TE-0.3,TE,te);
    radar.visible=te>TB*0.5; ru.uS.value=(te-TB)*14; ru.uA.value=ss(TB*0.5,TB+0.08,te)*(1-ss(TI+0.15,TI+0.4,te));
    radar.scale.setScalar(Math.max(0.6+0.4*ss(TB*0.5,TI,te),0.001));
    pulses.forEach((p,i)=>p.pose(ia-i*0.1,CX,0,0.5,1));
    range.visible=te>TI; gu.uR.value=TILE*(1+e3((te-TI-0.05)/(TR-TI))); gu.uA.value=ss(TI,TI+0.1,te)*(1-out)*(0.85+0.15*Math.sin(te*12));
    swirl.visible=te>TR-0.15; set(swirl,-0.1+1.1*out,ss(TR-0.15,TR,te));
    const k=hitE(ia,8); glowOf(caster,U.uC1.value,0.3*k);
    caster.scale.set(1+0.03*k,1-0.04*k,1+0.03*k);
    if(ia<0){o.g.set(-3.5,2.1,0);o.gs=0.5;o.ga=0.15;o.li=1;}
    else{o.g.set(CX,0.5,0);o.gs=1+k;o.ga=0.22*k;o.li=1.2+2*k;}
    o.ia=ia;o.c.set(CX,0.9,0);o.shake=0;o.dist=0.25;o.flash=0;
  };
}});

VFX.module("Estilizado · Bicho · Cuernos",defs);
})();

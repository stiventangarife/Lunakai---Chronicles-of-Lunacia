// =====================================================================
// BÁSICOS · DISTANCIA Y ÁREA — fábricas reutilizables para habilidades de enemigos
// VFX.basic.TIPO(cfg) → objeto de habilidad NUEVO {key,name,dur,ti,phases,pal,tier,build}. cfg = {key,name,pal,...opciones}.
// Con cfg.demo se declaran variantes (capas que se encienden con setVariant); sin demo la variante se fija desde cfg.
// Plantillas: ESCUPITAJO/BABA/FLECHA/PROYECTIL ← lanza · RAFAGA/NOVA_CRUZ/CATACLISMO ← area.
// Estados (veneno, lento, débil, frágil, quemadura) se leen en el mundo con colores semánticos fijos; nunca UI.
// =====================================================================
(function(){
if(!window.VFX||!VFX.lib)return;
const {THREE,V3,cl,ss,f,U,HEAD,fx,set,groundPlane,points,sparks,RING_FS,BURST_FS,LK,caster,target,enemies}=VFX;
const {NB,v3,DUST_FS,FLAME_FS,STAR4_FS,billboard,towardCam,tileFractureFS}=VFX.lib;
VFX.basic=VFX.basic||{};

const TX=3.4, TC=V3(3.15,1.2,0);                 // casilla y pecho del objetivo
const tmp=V3(0,0,0), tmp2=V3(0,0,0);
const ex=(ia,k)=>ia>=0?Math.exp(-ia*k):0;
const UPT=x=>Object.assign({uT:U.uT,uC1:U.uC1,uC2:U.uC2,uPx:U.uPx,uE:U.uE},x||{});
// grupo de capas (mesh/part/trail/decal) que se enciende o apaga entero; n = partículas
const mkG=a=>{const G={n:0};for(const k of LK){G[k]=new THREE.Group();a.L[k].add(G[k]);}G.show=v=>{for(const k of LK)G[k].visible=v;};return G;};
const bb=(m,p,d,ang)=>{towardCam(m.position,p,d);billboard(m,ang);};
const pulse=(m,ia,dur,amp)=>{const p=cl(ia/dur);m.visible=ia>=0&&p<1;set(m,p,ia>=0?(1-p)*(amp||1):0);return p;};
// estela: dos planos cruzados que salen hacia -x desde el origen del grupo
const crossTail=mat=>{const g=new THREE.Group(),geo=new THREE.PlaneGeometry(1,1).translate(-0.5,0,0),b=new THREE.Mesh(geo,mat);
  b.rotation.x=Math.PI/2;g.add(new THREE.Mesh(geo,mat),b);return g;};
// variantes (demo) u opciones fijas (instancia)
const options=(a,VAR,fixed,apply,dflt)=>{if(VAR)a.setVariant=v=>{if(!VAR[v])v=dflt;a.v=v;apply(VAR[v]);};else apply(fixed);};

// ---------- color legible con cualquier paleta: si uC2 es muy oscuro, se aclara hacia uC1 (los aditivos no lo pierden)
const PAL=`vec3 deepC(){float m=max(uC2.r,max(uC2.g,uC2.b));return mix(uC2,uC1,.5*smoothstep(.6,.25,m));}`;
const PFS=body=>HEAD+PAL+`varying float vA;varying float vMix;`+body;
// partículas
const GLOW_FS=PFS(`void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(deepC(),uC1,.45+.55*vMix)*1.4+vec3(1.)*smoothstep(.2,0.,d)*.6,a);}`);
const DROP_FS=PFS(`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=smoothstep(.5,.32,d)*vA;if(a<.003)discard;
 float hl=smoothstep(.17,0.,length(q-vec2(-.13,-.13)));
 gl_FragColor=vec4(mix(deepC(),uC1,.35+.45*vMix)*1.25+vec3(hl*.8),a);}`);
const SHARD_FS=PFS(`void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x+q.y*1.7;float a=smoothstep(.5,.4,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(deepC(),mix(uC1,vec3(1.),.35),vMix)*1.35+vec3(1.)*smoothstep(.2,0.,d)*.4,a);}`);
const SPLINTER_FS=PFS(`void main(){vec2 q=gl_PointCoord-.5;float an=vMix*6.2832;q=mat2(cos(an),-sin(an),sin(an),cos(an))*q;
 float d=abs(q.x)+abs(q.y)*5.;float a=smoothstep(.5,.36,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.9,.72,.5),uC1,.45)*1.3+vec3(1.)*smoothstep(.15,0.,d)*.4,a);}`);
// mallas
const LIQUID_FS=PAL+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.8);
 float n=noise(vP*5.+vec3(uT*4.,uT*2.,0.));
 float spec=pow(max(0.,dot(normalize(vN),normalize(vec3(-.4,.7,.6)))),24.);
 vec3 c=mix(deepC(),uC1,fr*.7+n*.3)*1.25+vec3(1.)*spec*.9;
 gl_FragColor=vec4(c,(.55+.45*fr)*uA);}`;
const TAIL_FS=PAL+`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float n=noise(vec3(u*6.-uT*12.,v*3.,0.));float w=u*(.55+.45*n);
 float al=smoothstep(w,w*.3,v)*u*uA;
 gl_FragColor=vec4(mix(deepC(),uC1,u)*1.35+vec3(1.)*smoothstep(.3,0.,v)*u*.35,al);}`;
// salpicadura en billboard: corona con puntas que se abre y adelgaza
const SPLAT_FS=PAL+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float sp=.62+.3*pow(abs(sin(an*4.5+1.3)),5.)+.12*noise(vec3(an*3.,1.,0.));
 float R=sp*(.35+.65*uP);float th=.08+.4*(1.-uP);
 float body=smoothstep(R+.02,R-.04,r)*smoothstep(R-th-.06,R-th,r);
 float dots=smoothstep(.07,0.,length(p-normalize(p+.0001)*R*1.18))*step(.6,fract(an*1.43+.2));
 gl_FragColor=vec4(mix(deepC(),uC1,body*.6+dots)*1.35+vec3(1.)*body*.2,(body+dots*.8)*uA);}`;
// charco: mancha con brillo húmedo y borde grueso; uP = extensión
const PUDDLE_FS=PAL+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 float n=noise(vec3(p*3.,1.7))*.5+noise(vec3(p*7.,4.))*.25;
 float R=uP*(.62+.38*n);float m=smoothstep(R,R-.07,r);
 float rim=band(r,R-.06,.05)*m;float sh=smoothstep(.35,0.,length(p-vec2(-.2,.25)*uP))*m;
 gl_FragColor=vec4(mix(deepC(),uC1,.2+rim+sh*.6)*1.2+vec3(1.)*sh*.25,(m*.4+rim*.7+sh*.35)*uA);}`;
const ORB_FS=PAL+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 vec3 q=normalize(vP);float sw=noise(q*4.+vec3(uT*3.,-uT*2.,uT));float st=smoothstep(.55,.85,sw);
 gl_FragColor=vec4(mix(deepC(),uC1,fr)*(1.+fr)+vec3(1.)*(st*.5+(1.-fr)*.4),(.5+.5*fr)*uA);}`;
// estallido en estrella: 8 rayos + núcleo + aro
const STARB_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);float s=max(uP,.01);
 float ray=exp(-abs(sin(an*4.))*14.*r)*(1.-smoothstep(.15,1.,r/s));
 float ray2=exp(-abs(sin(an*4.+.3927))*24.*r)*(1.-smoothstep(.1,.65,r/s))*.6;
 float core=smoothstep(.3*s+.06,0.,r);float rg=band(r,s*.85,.04)*.6;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.35+.45*core)*1.6,min(ray+ray2+core+rg,1.5)*uA);}`;
const FIRE_FS=H=>PAL+`void main(){float h=vP.y/${f(H)}+.5;
 vec3 q=vec3(vP.x*2.6,vP.y*1.6-uT*3.6,vP.z*2.6);
 float n=noise(q)*.55+noise(q*2.1+vec3(0.,-uT*2.,0.))*.3+noise(q*4.3)*.15;
 float fl=n-h*1.05+.35+.3*uP;float al=smoothstep(0.,.25,fl);float hot=smoothstep(.25,.6,fl);
 float fr=1.-abs(dot(normalize(vN),normalize(vV)));
 gl_FragColor=vec4((mix(deepC(),uC1,hot)+vec3(1.)*smoothstep(.55,.8,fl)*.6)*1.5,al*(.35+.65*fr)*uA);}`;

// ---------- casillas de la cruz (centro + 4) y sus tiempos ----------
const CELLS5=[[0,0],[-1,0],[0,1],[1,0],[0,-1]];
// rejilla en cruz: bordes que se cargan (uP), destello y onda por casilla en su instante (uT = tiempo de la habilidad)
const crossTilesFS=(S,times)=>PAL+`float cT(vec2 c){${CELLS5.map(([x,z],i)=>`if(c==vec2(${f(x)},${f(z)}))return ${f(times[i])};`).join("")}return 99.;}
void main(){vec2 p=(vUv-.5)*${f(S)};p.y=-p.y;vec2 c=floor(p+.5);if(abs(c.x)+abs(c.y)>1.)discard;
 vec2 q=abs(p-c)*2.;float e=max(q.x,q.y);float dt=uT-cT(c);
 float border=smoothstep(.84,.94,e)*smoothstep(1.,.96,e);
 float fill=(.05+.12*uP)*(.6+.4*noise(vec3(p*5.,uT*2.)));
 float hit=dt>0.?exp(-dt*6.):0.;
 float wv=dt>0.?band(length(p-c)*2.,dt*6.,.14)*exp(-dt*5.):0.;
 gl_FragColor=vec4(mix(deepC(),uC1,border*.5+hit+wv)*1.4+vec3(1.)*hit*.2,(border*(.35+.65*uP)+fill+hit*.55+wv)*uA);}`;
// funciones GLSL de casilla para partículas: cellP(i), cellT(i), cellI() (elige casilla por semilla)
const cellGLSL=cells=>`vec3 cellP(float i){${cells.map((c,i)=>`if(i<${f(i+0.5)})return vec3(${f(TX+c[0])},0.,${f(c[1])});`).join("")}return vec3(${f(TX)},0.,0.);}
float cellT(float i){${cells.map((c,i)=>`if(i<${f(i+0.5)})return ${f(c[2])};`).join("")}return 0.;}
float cellI(){return floor(min(aSeed.w*${f(cells.length)},${f(cells.length-1)}));}`;

// =====================================================================
// ESTADOS en el mundo (colores semánticos fijos, levemente teñidos por la paleta)
// who = personajes afectados; ventana T0..TE. Devuelve grupo con n, show() y pose(te) → envolvente
// =====================================================================
const ST_COL={poison:[0.35,1,0.3],slow:[0.55,0.68,1],weak:[0.62,0.38,1],fragile:[1,0.8,0.88],burn:[1,0.45,0.12]};
const SFS=body=>HEAD+`varying float vA;varying float vMix;`+body;
const POISON_FS=SFS(`void main(){vec2 q=gl_PointCoord-.5;float d=length(q);
 float ring=smoothstep(.08,0.,abs(d-.36))+smoothstep(.45,0.,d)*.18;float hl=smoothstep(.12,0.,length(q-vec2(-.13,-.13)));
 float a=(ring+hl)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.18,.85,.3),vec3(.6,1.,.45),vMix)*1.3+vec3(hl*.7),a);}`);
const SLOWDROP_FS=SFS(`void main(){vec2 q=gl_PointCoord-.5;q.x*=1.6;float d=length(q-vec2(0.,.08))-.22;
 float a=smoothstep(.06,-.04,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.55,.68,1.),uC1,.3)*1.3+vec3(1.)*smoothstep(.0,-.2,d)*.3,a);}`);
const WEAK_FS=SFS(`void main(){vec2 q=gl_PointCoord-.5;float y=-q.y;float d=abs(y+.12-abs(q.x)*.9);
 float a=smoothstep(.09,.04,d)*step(abs(q.x),.36)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(.62,.38,1.),uC1,.2)*1.4,a);}`);
const FRAGCHIP_FS=SFS(`void main(){vec2 q=abs(gl_PointCoord-.5);float d=q.x*1.4+q.y;float a=smoothstep(.45,.36,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.82,.9),uC1,.2)*1.5,a);}`);
const BURNF_FS=SFS(`void main(){vec2 q=gl_PointCoord-.5;q.y=-q.y;float w=.32*(1.-smoothstep(-.35,.45,q.y));
 float body=smoothstep(w,w-.12,abs(q.x))*smoothstep(-.48,-.3,q.y)*smoothstep(.48,.2,q.y);
 float core=smoothstep(w*.5,0.,abs(q.x))*smoothstep(.1,-.25,q.y);
 float a=(body+core*.5)*vA;if(a<.003)discard;
 gl_FragColor=vec4(mix(vec3(1.,.3,.06),vec3(1.,.85,.35),core+.25)*1.4+vec3(core*.4),a);}`);
const BURNE_FS=SFS(`void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;if(a<.003)discard;
 gl_FragColor=vec4(vec3(1.,.55,.15)*1.5+vec3(1.)*smoothstep(.2,0.,d)*.5,a);}`);
const SLOWRING_FS=`void main(){float r=(length(vP.xz)-.4)/.18;float an=atan(vP.z,vP.x);
 float m=smoothstep(1.,.35,abs(r-.5)*2.)*(.55+.45*step(.3,fract(an*1.27+uT*.4)));
 gl_FragColor=vec4(mix(vec3(.55,.68,1.),uC1,.3)*1.4,m*sin(3.14159*uP)*uA);}`;
const SLOWPOOL_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=noise(vec3(p*4.,uT*.8))*.3;
 float R=.45+.45*uP+n*.4;float m=smoothstep(R,R-.1,r);float rim=band(r,R-.08,.06);
 gl_FragColor=vec4(mix(vec3(.45,.55,.95),uC1,.3)*1.2,(m*.3+rim*.6)*uA);}`;
const WEAKRING_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float m=band(r,.8,.05)*step(.45,fract(an*1.91-uT*.3))+band(r,.62,.02)*.6;
 gl_FragColor=vec4(mix(vec3(.62,.38,1.),uC1,.2)*1.2,m*uA*(.75+.25*sin(uT*7.)));}`;
const FRAG_FS=`void main(){float an=atan(vP.z,vP.x);vec2 p=vec2(an*1.6,vP.y*2.);
 float n=noise(vec3(p*2.2,3.)),n2=noise(vec3(p*4.5,7.));
 float cr=pow(1.-abs(n*2.-1.),14.)+pow(1.-abs(n2*2.-1.),20.)*.6;
 float grow=smoothstep(uP*2.4,uP*2.4-.5,length(vec2((an-1.57)*.45,vP.y-.25)));
 float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
 gl_FragColor=vec4(mix(vec3(1.,.8,.88),uC1,.25)*1.6,(cr*grow*.95+fr*.12)*uA);}`;
const BURNDECAL_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 float n=noise(vec3(p*5.,uT*2.))*.6+noise(vec3(p*11.,4.))*.4;float m=smoothstep(1.,.2,r+(n-.5)*.4);
 gl_FragColor=vec4(mix(vec3(1.,.3,.05),vec3(1.,.7,.25),n)*1.2,m*m*.45*uA*(.8+.2*sin(uT*17.+n*6.)));}`;

function mkStatus(a,kind,who,T0,TE,opt){opt=opt||{};
  const G=mkG(a),N=who.length,Wv=who.map(()=>V3(0,0,0)),K={value:0},uni=UPT({uW:{value:Wv},uK:K});
  const C=`uniform vec3 uW[${N}];uniform float uK;const float T0=${f(T0)};
  vec3 wp(){return uW[int(min(aSeed.w*${f(N)},${f(N-1)}))];}`;
  const P=(n,vs,fs,o)=>{G.n+=points(G.part,n*N,C+vs,fs,Object.assign({uniforms:uni},o||{}));};
  const decals=[], rings=[], shells=[];
  const decal=fs=>{for(let i=0;i<N;i++){const m=groundPlane(1.5,0,0.018+0.002*i,fx(fs));G.decal.add(m);decals.push(m);}};
  // bucle: cada partícula renace con semilla nueva (rr) mientras dura el estado
  const LOOP=life=>`float life=${life};float k=(uT-T0)/life+aSeed.x;float age=fract(k);vec3 r=rr(floor(k));float on=uT>T0?uK:0.;`;
  if(kind==="poison"){
    // burbujas verdes que suben por el cuerpo y revientan
    P(50,`void main(){${LOOP(".45+aSeed.y*.3")}float an=r.x*6.2832+age*2.;float rad=.3+.25*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,.12+age*(1.3+.6*r.z),sin(an)*rad);
     vA=sin(age*3.14159)*on;put(p,(.06+.08*r.z)*(.6+.6*age));}`,POISON_FS);
  }else if(kind==="slow"){
    // anillos pesados que bajan despacio hasta los pies + gotas espesas que resbalan
    for(let i=0;i<N;i++)for(let j=0;j<2;j++){const m=new THREE.Mesh(new THREE.RingGeometry(0.4,0.58,40).rotateX(-Math.PI/2),fx(SLOWRING_FS));
      m.userData={i,j};G.mesh.add(m);rings.push(m);}
    P(26,`void main(){${LOOP(".6+aSeed.y*.3")}float an=r.x*6.2832;float rad=.43;
     vec3 p=wp()+vec3(cos(an)*rad,1.25-age*age*1.15-r.y*.2,sin(an)*rad);
     vA=smoothstep(0.,.15,age)*(1.-smoothstep(.85,1.,age))*on;put(p,.07+.05*r.z);}`,SLOWDROP_FS);
    if(!opt.noDecal)decal(SLOWPOOL_FS);
  }else if(kind==="weak"){
    // chevrones hacia abajo que caen alrededor del cuerpo
    P(22,`void main(){${LOOP(".55+aSeed.y*.25")}float an=r.x*6.2832+uT*.6;float rad=.55+.12*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,1.9-age*1.5,sin(an)*rad);
     vA=sin(age*3.14159)*on;put(p,.16+.08*r.z);}`,WEAK_FS);
    decal(WEAKRING_FS);
  }else if(kind==="fragile"){
    // coraza agrietada alrededor del cuerpo y esquirlas que se desprenden
    for(let i=0;i<N;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.52,1.9,28,1,true),fx(FRAG_FS));G.mesh.add(m);shells.push(m);}
    P(16,`void main(){${LOOP(".45+aSeed.y*.2")}float an=r.x*6.2832;vec3 p=wp()+vec3(cos(an)*.54,.3+r.y*1.4-age*age*1.2,sin(an)*.54);
     p.y=max(p.y,.03);vA=(1.-age)*on;put(p,.06+.05*r.z);}`,FRAGCHIP_FS);
  }else if(kind==="burn"){
    // llamas a los pies, brasas que suben y chamuscado
    P(34,`void main(){${LOOP(".3+aSeed.y*.2")}float an=r.x*6.2832;float rad=.25+.25*r.y;
     vec3 p=wp()+vec3(cos(an)*rad,.05+age*(.5+.3*r.z),sin(an)*rad);
     vA=sin(age*3.14159)*on;put(p,(.2+.12*r.z)*(1.-age*.5));}`,BURNF_FS);
    P(22,`void main(){${LOOP(".6+aSeed.y*.3")}float an=r.x*6.2832;vec3 p=wp()+vec3(cos(an)*.4+sin(age*7.+r.z*6.)*.08,.2+age*1.6,sin(an)*.4);
     vA=(1.-age)*on*(.5+.5*sin(age*40.+r.y*9.));put(p,.03+.03*r.z);}`,BURNE_FS);
    decal(BURNDECAL_FS);
  }
  G.kind=kind;
  G.pose=te=>{
    const env=ss(T0,T0+0.12,te)*(1-ss(TE-0.15,TE,te)); K.value=env;
    for(let i=0;i<N;i++)Wv[i].copy(who[i].position);
    decals.forEach((m,i)=>{const w=who[i].position;m.position.x=w.x;m.position.z=w.z;set(m,cl((te-T0)/0.3),env);});
    rings.forEach(m=>{const u=m.userData,w=who[u.i].position,k=((te-T0)/0.65+u.j*0.5)%1,q=te>T0?k:0;
      m.position.set(w.x,0.05+1.2*Math.pow(1-q,1.6),w.z);m.scale.setScalar(0.9+0.2*q);set(m,q,env);});
    shells.forEach((m,i)=>{const w=who[i].position;m.position.set(w.x,0.95,w.z);set(m,cl((te-T0)/0.3),env*(0.8+0.2*Math.sin(te*30)));});
    return env;
  };
  return G;
}
// brillo del objetivo según el estado activo más fuerte
const statusEm=(o,list)=>{let best=0,c=null;for(const s of list)if(s.on&&s.env>best){best=s.env;c=ST_COL[s.kind];}
  if(c){o.em=Math.max(o.em,0.32*best);o.emc.setRGB(c[0],c[1],c[2]);}};

// =====================================================================
// ESCUPITAJO — bola líquida en parábola con estela de gotas; salpicadura y charco. Veneno: burbujas verdes 0,5 s
// =====================================================================
VFX.basic.ESCUPITAJO=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{normal:{poison:false},veneno:{poison:true}}:null;
  const def={key:cfg.key||"basic_escupitajo",name:cfg.name||"Escupitajo",dur:0.8,ti:0.3,tier:2,pal:cfg.pal||"Veneno",
    phases:[["Carga",0],["Vuelo",0.08],["Impacto",0.3],["Charco",0.4]],
  build(a){
    const TL=0.08,TI=0.3,P0=V3(-3.3,1.5,0),P1=TC,H=1.25,B=mkG(a);
    const path=(k,out)=>out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+H*4*k*(1-k),0);
    const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
    vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);return mix(P0,P1,k)+vec3(0.,${f(4*H)}*k*(1.-k),0.);}`;
    // bola + cola líquida: se estiran en la dirección del vuelo
    const gM=new THREE.Group(),gT=new THREE.Group();B.mesh.add(gM);B.trail.add(gT);
    const glob=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),fx(LIQUID_FS));gM.add(glob);
    const tailMat=fx(TAIL_FS),tail=crossTail(tailMat);gT.add(tail);
    const splat=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(SPLAT_FS,{depthTest:false}));B.mesh.add(splat);
    const puddle=groundPlane(1.9,TX,0.02,fx(PUDDLE_FS)),shock=groundPlane(2.4,TX,0.03,fx(RING_FS));B.decal.add(puddle,shock);
    // gotas que se juntan en la boca
    B.n+=points(B.part,30,C+`void main(){float life=.07+aSeed.y*.04;float age=(uT-aSeed.x*(TL-.05))/life;
     vec3 d=normalize(rnd()+vec3(.6,0.,0.));vec3 p=P0+d*mix(.5,.03,age*age);
     vA=(age>0.&&age<1.&&uT<TL)?smoothstep(0.,.3,age):0.;put(p,.03+.03*aSeed.z);}`,DROP_FS);
    // estela de gotas que caen
    B.n+=points(B.part,140,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.22+aSeed.y*.22;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+r*.06+vec3(-.5*t+r.x*.25*t,-4.*t*t+r.y*.2*t,r.z*.3*t);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.04+.06*aSeed.z)*(1.-age*.5));}`,DROP_FS);
    // salpicadura que cae al suelo
    B.n+=points(B.part,100,C+`void main(){float s=TI+aSeed.x*.04;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.7,.35,0.));vec3 p=P1+d*(1.1+2.2*aSeed.z)*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.04+.06*aSeed.w)*(1.-age*.4));}`,DROP_FS);
    // chorretones que resbalan por el objetivo
    B.n+=points(B.part,28,C+`void main(){float s=TI+.03+aSeed.x*.12;float life=.3;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=vec3(${f(TX-0.32)}+aSeed.z*.12,P1.y+(aSeed.y-.5)*.3-1.6*t*t-.3*t,(aSeed.w-.5)*.6);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?(1.-age)*.9:0.;put(p,.05+.03*aSeed.y);}`,DROP_FS);
    B.n+=sparks(B.part,40,TI,`${f(P1.x)},${f(P1.y)},0.`,"-.6,.3,0.",2,5,3);
    const PZ=mkStatus(a,"poison",[target],TI,0.8),ST=[{kind:"poison",on:false,env:0}];
    options(a,VAR,{poison:!!cfg.poison},s=>{ST[0].on=!!s.poison;PZ.show(ST[0].on);a.count=B.n+(ST[0].on?PZ.n:0);},"normal");
    a.pose=function(te,o){
      const ia=te-TI,k=cl((te-TL)/(TI-TL)),g0=ss(0,TL,te),fly=te>=TL&&te<TI,sq=g0*(1-ss(TL,TL+0.08,te));
      caster.rotation.z=0.1*g0-0.24*ss(TL,TL+0.05,te)+0.14*ss(TL+0.08,TL+0.4,te);
      caster.scale.set(1+0.05*sq,1-0.05*sq,1);
      path(k,tmp);const ang=fly?Math.atan2((P1.y-P0.y)+H*4*(1-2*k),P1.x-P0.x):0;
      gM.position.copy(tmp);gT.position.copy(tmp);gM.rotation.z=gT.rotation.z=ang;
      const st=fly?1.55:1+0.12*Math.sin(te*55),r=Math.max(fly?0.15:0.13*g0,0.001);
      glob.visible=te<TI;glob.scale.set(r*st,r/Math.sqrt(st),r/Math.sqrt(st));glob.material.uniforms.uA.value=1;
      tail.visible=fly;tail.scale.set(Math.max(Math.min(0.2+k*3,0.95),0.001),0.26,0.26);tailMat.uniforms.uA.value=1;
      let p=cl(ia/0.22);bb(splat,P1,0.35,0.4);splat.visible=ia>=0&&p<1;splat.scale.setScalar(0.5+1.3*(1-(1-p)*(1-p)));set(splat,p,ia>=0?1-p*p:0);
      set(puddle,ss(0.02,0.28,ia),ia>=0?0.9*(1-ss(0.32,0.5,ia)):0);
      pulse(shock,ia,0.35,0.6);
      const h=ex(ia,7);target.position.x=TX+0.12*h;target.rotation.z=-h*0.16*Math.cos(ia*16);
      ST[0].env=PZ.pose(te);statusEm(o,ST);
      if(te<TL){o.g.copy(P0);o.gs=0.6*g0;o.ga=0.3*g0;o.li=1.4*g0;}
      else if(fly){o.g.copy(tmp);o.gs=0.85;o.ga=0.35;o.li=3;}
      else{o.g.copy(P1);o.gs=1+2.5*ia;o.ga=Math.exp(-ia*10)*0.5;o.li=5*Math.exp(-ia*6)+(ST[0].on?1.2*ST[0].env:0);}
      o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=0.5;
    };
  }};
  if(VAR){def.variants=[["normal","Normal"],["veneno","Veneno"]];def.v="normal";def.vlabel="Efecto";}
  return def;
};

// =====================================================================
// BABA_PEGAJOSA — goterón espeso y lento unido por un hilo de baba; charco que se estira. Lento: hebras que pegan los pies
// =====================================================================
const GOO_FS=PAL+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);float n=noise(vP*vec3(9.,3.,9.)-vec3(0.,uT*1.5,0.));
 gl_FragColor=vec4(mix(deepC(),uC1,.4+.4*fr+n*.2)*1.25,(.45+.5*fr)*uA);}`;
const STRETCH_FS=PAL+`void main(){vec2 p=(vUv-.5)*vec2(2.8,1.8);p.y=-p.y;
 vec2 q=vec2(p.x/(.35+1.05*uP),p.y/(.35+.45*uP));float r=length(q);
 float n=noise(vec3(p*2.5,2.))*.35+noise(vec3(p*6.,5.))*.15;
 float fing=pow(abs(sin(atan(q.y,q.x)*3.+1.)),8.)*.25*uP;
 float R=.8+n+fing;float m=smoothstep(R,R-.12,r);
 float rim=band(r,R-.1,.07)*m;float gl=smoothstep(.35,0.,length(q-vec2(-.25,.2)))*.5;
 gl_FragColor=vec4(mix(deepC(),uC1,.25+rim+gl)*1.2+vec3(1.)*gl*.25,(m*.45+rim*.6+gl*m*.4)*uA);}`;
VFX.basic.BABA_PEGAJOSA=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{lento:{slow:true},normal:{slow:false}}:null;
  const def={key:cfg.key||"basic_baba_pegajosa",name:cfg.name||"Baba pegajosa",dur:0.9,ti:0.42,tier:2,pal:cfg.pal||"Baba",
    phases:[["Carga",0],["Vuelo",0.14],["Impacto",0.42],["Pegado",0.55]],
  build(a){
    const TL=0.14,TI=0.42,LAG=0.035,P0=V3(-3.3,1.45,0),P1=V3(3.12,1.05,0),H=0.85,B=mkG(a);
    const kf=te=>{const k=cl((te-TL)/(TI-TL));return k*(0.75+0.25*k);};        // arranca pesado y acelera
    const path=(k,out)=>out.set(P0.x+(P1.x-P0.x)*k,P0.y+(P1.y-P0.y)*k+H*4*k*(1-k),0);
    const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
    vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);k=k*(.75+.25*k);return mix(P0,P1,k)+vec3(0.,${f(4*H)}*k*(1.-k),0.);}`;
    // cadena de goterones: el principal y tres que lo siguen con retraso (lectura de masa espesa)
    const gooMat=fx(LIQUID_FS),blobs=[0.21,0.15,0.11,0.08].map((r,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),gooMat);m.userData={r,i};B.mesh.add(m);return m;});
    const splat=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(SPLAT_FS,{depthTest:false}));B.mesh.add(splat);
    const puddle=groundPlane(2.8,TX,0.02,fx(STRETCH_FS),1.8);B.decal.add(puddle);
    // hilo de baba: cuerda de puntos que sigue la trayectoria con retraso (sale de la boca)
    B.n+=points(B.trail,80,C+`void main(){float s=uT-aSeed.x*.17;vec3 p=path(s)+rnd()*.025;
     vA=(s<TI+.02&&uT<TI+.1)?(1.-aSeed.x*.5)*smoothstep(0.,.06,uT):0.;put(p,(.09-.05*aSeed.x)*(1.+.25*sin(aSeed.x*40.-uT*20.)));}`,DROP_FS);
    // gotas gordas que cuelgan y caen despacio
    B.n+=points(B.part,60,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+vec3(r.x*.06-.3*t,-.05-2.6*t*t,r.z*.1);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,(.07+.06*aSeed.z)*(1.-age*.3));}`,DROP_FS);
    // salpicadura espesa: pocas gotas grandes que caen enseguida
    B.n+=points(B.part,60,C+`void main(){float s=TI+aSeed.x*.05;float life=.35+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.6,.2,0.));vec3 p=P1+d*(.6+1.3*aSeed.z)*t+vec3(0.,-5.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,(.07+.07*aSeed.w)*(1.-age*.3));}`,DROP_FS);
    B.n+=sparks(B.part,30,TI,`${f(P1.x)},${f(P1.y)},0.`,"-.6,.2,0.",1.5,3.5,3);
    // lento: hebras pegajosas del charco a las piernas + estado lento
    const SL=mkG(a),strands=[];
    for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.05,1,6,1,true).translate(0,0.5,0),fx(GOO_FS));
      const an=i/6*Math.PI*2+0.3;m.userData={x:Math.cos(an)*0.4,z:Math.sin(an)*0.4,ph:i*1.3};SL.mesh.add(m);strands.push(m);}
    const SS=mkStatus(a,"slow",[target],TI+0.08,0.9,{noDecal:true}),ST=[{kind:"slow",on:false,env:0}];
    options(a,VAR,{slow:cfg.slow!==false},s=>{ST[0].on=!!s.slow;SL.show(ST[0].on);SS.show(ST[0].on);a.count=B.n+(ST[0].on?SS.n:0);},"lento");
    a.pose=function(te,o){
      const ia=te-TI,g0=ss(0,TL,te),fly=te>=TL&&te<TI+LAG*3;
      caster.rotation.z=0.12*g0-0.2*ss(TL,TL+0.08,te)+0.08*ss(TL+0.1,TL+0.5,te);
      caster.scale.set(1+0.07*g0*(1-ss(TL,TL+0.1,te)),1-0.06*g0*(1-ss(TL,TL+0.1,te)),1);
      for(const m of blobs){const u=m.userData,t=te-u.i*LAG,k=kf(t);path(k,m.position);
        const on=te<TL?(u.i?0:g0):(t<TI?1:0),wob=1+0.1*Math.sin(te*30+u.i*2);
        m.visible=on>0;const r=Math.max(u.r*on*(te<TL?0.8:1),0.001);m.scale.set(r*wob*1.2,r/wob,r);}
      gooMat.uniforms.uA.value=1;
      let p=cl(ia/0.3);bb(splat,P1,0.35,-0.3);splat.visible=ia>=0&&p<1;splat.scale.setScalar(0.7+1.5*(1-(1-p)*(1-p)));set(splat,p,ia>=0?1-p*p:0);
      // el charco crece y se estira despacio
      set(puddle,ss(0,0.42,ia),ia>=0?0.95*ss(0,0.05,ia)*(1-ss(0.38,0.48,ia)):0);
      const h=ex(ia,6);
      // forcejeo: el objetivo intenta levantar los pies y las hebras tiran de él
      const tug=ST[0].on&&ia>0.05?Math.max(0,Math.sin((ia-0.05)*11))*ss(0.05,0.12,ia)*(1-ss(0.36,0.46,ia)):0;
      target.position.x=TX+0.1*h;target.position.y=0.06*tug;target.rotation.z=-h*0.14*Math.cos(ia*14);
      target.scale.set(1+0.04*tug,1-0.05*h+0.03*tug,1);
      const senv=ST[0].on?ss(TI+0.03,TI+0.1,te)*(1-ss(0.78,0.9,te)):0;
      for(const m of strands){const u=m.userData;m.position.set(TX+u.x,0.02,u.z);m.visible=senv>0.001;
        m.scale.set(1-0.4*tug,Math.max(0.18+0.35*senv+0.25*tug+0.03*Math.sin(te*9+u.ph),0.001),1-0.4*tug);m.material.uniforms.uA.value=senv;}
      ST[0].env=SS.pose(te);statusEm(o,ST);
      if(te<TL){o.g.copy(P0);o.gs=0.7*g0;o.ga=0.3*g0;o.li=1.5*g0;}
      else if(te<TI){o.g.copy(blobs[0].position);o.gs=0.95;o.ga=0.35;o.li=3;}
      else{o.g.copy(P1);o.gs=1.1+2*ia;o.ga=Math.exp(-ia*9)*0.5;o.li=4.5*Math.exp(-ia*5)+0.8*senv;}
      o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=0.45;
    };
  }};
  if(VAR){def.variants=[["lento","Ralentiza"],["normal","Normal"]];def.v="lento";def.vlabel="Efecto";}
  return def;
};

// =====================================================================
// FLECHA — flecha recta y rápida con estela fina; astillas al impactar.
// style 'certero': línea de mira de 0,2 s con retícula, la flecha atraviesa y sale por detrás
// =====================================================================
const ARROW_FS=PAL+`uniform float uH;void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3+.45*uH)*(1.2+fr),uA);}`;
const FLETCH_FS=PAL+`void main(){vec2 p=vUv;float sh=smoothstep(.0,.08,p.x)*step(abs(p.y-.5)*2.,.25+.75*p.x);
 float vane=.55+.45*step(.5,fract(p.x*7.));
 gl_FragColor=vec4(mix(deepC(),uC1,p.x)*1.4,sh*vane*uA);}`;
const AIM_FS=`void main(){float u=vUv.x;float v=abs(vUv.y-.5)*2.;
 float core=smoothstep(.3,0.,v);float halo=smoothstep(1.,0.,v)*.25;
 float dash=step(.45,fract(u*14.-uT*9.));float sweep=smoothstep(uP,uP-.08,u);
 vec3 c=mix(mix(uC1,vec3(1.,.3,.25),.55),vec3(1.),core*.5);
 gl_FragColor=vec4(c*1.5,(core*(.55+.45*dash)+halo)*sweep*uA);}`;
const RETICLE_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
 float rg=band(r,.62,.035)+band(r,.36,.02)*.7;
 float tk=step(abs(p.x),.03)*step(.45,abs(p.y))*step(abs(p.y),.85)+step(abs(p.y),.03)*step(.45,abs(p.x))*step(abs(p.x),.85);
 float ctr=smoothstep(.07,0.,r);
 gl_FragColor=vec4(mix(vec3(1.,.28,.22),uC1,.25)*1.6+vec3(1.)*uP*.6,(rg+tk+ctr)*uA);}`;
const STAR_GLINT_FS=`void main(){vec2 p=(vUv-.5)*2.;vec2 q=abs(p);
 float s=exp(-q.y*22.)*smoothstep(1.,.0,q.x)+exp(-q.x*22.)*smoothstep(1.,.0,q.y);float c=smoothstep(.3,0.,length(p));
 gl_FragColor=vec4(mix(uC1,vec3(1.),.5)*1.6,(s+c)*uA);}`;
VFX.basic.FLECHA=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{normal:{certero:false},certero:{certero:true}}:null;
  const def={key:cfg.key||"basic_flecha",name:cfg.name||"Flecha",dur:0.5,ti:0.26,tier:2,pal:cfg.pal||"Naturaleza",
    phases:[["Tensar / Mira",0],["Disparo",0.18],["Impacto",0.26],["Astillas",0.32]],
  build(a){
    const TR=0.18,TI=0.26,X0=-3.0,XE=2.45,Y=1.22,BOW=V3(-3.2,Y,0),B=mkG(a),CE=mkG(a);
    // flecha: astil + punta + plumas, todo hacia +x
    const arrow=new THREE.Group();B.mesh.add(arrow);
    const shaftM=fx(ARROW_FS),headM=fx(ARROW_FS);shaftM.uniforms.uH={value:0};headM.uniforms.uH={value:1};
    arrow.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.95,6).rotateZ(-Math.PI/2),shaftM));
    arrow.add(new THREE.Mesh(new THREE.ConeGeometry(0.06,0.2,8).rotateZ(-Math.PI/2).translate(0.56,0,0),headM));
    const fm=fx(FLETCH_FS),f1=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.1).translate(-0.36,0,0),fm),f2=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.1).translate(-0.36,0,0),fm);
    f2.rotation.x=Math.PI/2;arrow.add(f1,f2);
    const tailMat=fx(TAIL_FS),tail=crossTail(tailMat);B.trail.add(tail);
    const glint=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),fx(STAR_GLINT_FS,{depthTest:false}));B.mesh.add(glint);
    const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),fx(RING_FS,{depthTest:false}));B.mesh.add(hitRing);
    const C=`const float TI=${f(TI)};const vec3 HP=${v3(V3(3.05,Y,0))};`;
    // astillas
    B.n+=points(B.part,60,C+`void main(){float s=TI+aSeed.x*.03;float life=.22+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.9,.3,0.));vec3 p=HP+d*(1.5+2.5*aSeed.z)*t+vec3(0.,-5.*t*t,0.);
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,.07+.06*aSeed.w);}`,SPLINTER_FS);
    B.n+=sparks(B.part,70,TI,`${f(3.05)},${f(Y)},0.`,"-.8,.2,0.",2,6,2.5);
    // motas que suelta la estela
    B.n+=points(B.part,50,`void main(){float s=${f(TR)}+aSeed.x*${f(TI-TR)};float life=.15+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     float x=${f(X0+0.6)}+${f(XE-X0)}*(s-${f(TR)})/${f(TI-TR)};vec3 p=vec3(x,${f(Y)},0.)+rnd()*.05+vec3(0.,.3*t,0.);
     vA=(age>0.&&age<1.)?(1.-age)*.8:0.;put(p,.025+.025*aSeed.z);}`,GLOW_FS);
    // certero: mira, retícula, anillos de salida y orificio de salida por detrás
    const aimMat=fx(AIM_FS),aim=new THREE.Group(),ag=new THREE.PlaneGeometry(1,1).translate(0.5,0,0),a2=new THREE.Mesh(ag,aimMat);
    a2.rotation.x=Math.PI/2;aim.add(new THREE.Mesh(ag,aimMat),a2);CE.trail.add(aim);
    const ret=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(RETICLE_FS,{depthTest:false}));CE.mesh.add(ret);
    const muzzle=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1).rotateY(Math.PI/2),fx(RING_FS));muzzle.position.set(-2.7,Y,0);CE.mesh.add(muzzle);
    const exitF=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),fx(STARB_FS,{depthTest:false}));CE.mesh.add(exitF);
    CE.n+=sparks(CE.part,70,TI+0.02,`${f(3.75)},${f(Y)},0.`,"1.2,.1,0.",3,8,2);
    CE.n+=points(CE.part,40,`void main(){float life=.12+aSeed.y*.06;float age=(uT-aSeed.x*.14)/life;
     vec3 d=normalize(rnd()+.0001);vec3 p=${v3(TC)}+d*mix(.9,.05,age*age);
     vA=(age>0.&&age<1.&&uT<${f(TR)})?smoothstep(0.,.3,age)*.8:0.;put(p,.03+.02*aSeed.z);}`,GLOW_FS);
    let CER=false;
    options(a,VAR,{certero:cfg.style==="certero"||!!cfg.certero},s=>{CER=!!s.certero;CE.show(CER);a.count=B.n+(CER?CE.n:0);},"normal");
    a.pose=function(te,o){
      const ia=te-TI,dr=ss(0,TR,te),k=cl((te-TR)/(TI-TR)),fly=te>=TR&&te<TI;
      caster.rotation.z=0.1*dr-0.18*ss(TR,TR+0.03,te)+0.08*ss(TR+0.05,TR+0.25,te);
      caster.position.x=-3.7-0.05*dr+0.05*ss(TR,TR+0.03,te);
      // vuelo: normal se clava y vibra; certero atraviesa y sale por detrás
      let x,av=1;
      if(te<TR){x=X0-0.12*dr;}else if(fly){x=X0+(XE-X0)*k;}
      else if(CER){const q=cl(ia/0.1);x=XE+2.2*q;av=1-q;}
      else{x=XE+0.12;av=1-ss(0.12,0.22,ia);}
      arrow.position.set(x,Y,0);arrow.rotation.z=(!CER&&ia>=0)?0.06*Math.exp(-ia*14)*Math.sin(ia*90):0;
      arrow.visible=av>0.01&&te>=0.02;shaftM.uniforms.uA.value=headM.uniforms.uA.value=fm.uniforms.uA.value=av*ss(0.02,0.08,te);
      const tl=te>=TR?Math.min(x-X0,4.5):0,tk=ia>0?1-cl(ia/0.18):1;
      tail.visible=te>=TR&&tk>0;tail.position.set(Math.min(x,XE)-0.4,Y,0);tail.scale.set(Math.max(Math.min(tl,XE-X0),0.001),0.07*(CER?1.5:1)*tk+0.001,0.07*(CER?1.5:1)*tk+0.001);tailMat.uniforms.uA.value=tk;
      bb(glint,BOW,0.3,te*2);glint.visible=te<TR+0.06;glint.scale.setScalar(0.3+0.5*dr+0.6*ss(TR,TR+0.02,te));glint.material.uniforms.uA.value=dr*(1-ss(TR+0.01,TR+0.06,te));
      let p=cl(ia/0.2);bb(hitRing,TC,0.3);hitRing.visible=ia>=0&&p<1;hitRing.scale.setScalar(0.5+0.6*p);set(hitRing,p,ia>=0?1-p:0);
      // mira: se traza del arco al objetivo y se estrecha hasta el disparo
      aim.position.copy(BOW);aim.scale.set(Math.max(TC.x-BOW.x,0.001),0.05*(1.3-dr),0.05*(1.3-dr));aimMat.uniforms.uP.value=cl(te/0.1)*1.1;
      aimMat.uniforms.uA.value=ss(0,0.04,te)*(1-ss(TR,TR+0.03,te));
      bb(ret,TC,0.4,te*1.5);ret.visible=te<TR+0.06;ret.scale.setScalar(0.55+0.9*(1-ss(0.03,TR,te)));set(ret,ss(TR-0.03,TR,te),ss(0.02,0.07,te)*(1-ss(TR+0.01,TR+0.06,te)));
      p=cl((te-TR)/0.15);set(muzzle,p,te>=TR?1-p:0);
      p=cl((ia-0.02)/0.25);bb(exitF,tmp2.set(3.8,Y,0),0.3,0.4);exitF.visible=ia>=0.02&&p<1;exitF.scale.setScalar(0.6+0.8*p);set(exitF,p,1-p);
      const h=ex(ia,9);target.position.x=TX+(CER?0.14:0.09)*h;target.rotation.z=-h*0.14*Math.cos(ia*20);
      if(te<TR){o.g.copy(BOW);o.gs=0.5*dr;o.ga=0.3*dr;o.li=1.3*dr;if(CER){o.g.copy(TC);o.gs=0.6*dr;o.li=1.2*dr;}}
      else if(fly){o.g.set(x+0.5,Y,0);o.gs=0.7;o.ga=0.35;o.li=2.5;}
      else{o.g.copy(TC);o.gs=0.9+2*ia;o.ga=Math.exp(-ia*12)*0.5;o.li=(CER?6:4.5)*Math.exp(-ia*7);}
      o.ia=ia;o.c.copy(TC);o.shake=0;o.dist=CER?0.6:0.4;
    };
  }};
  if(VAR){def.variants=[["normal","Normal"],["certero","Certero"]];def.v="normal";def.vlabel="Disparo";}
  return def;
};

// =====================================================================
// PROYECTIL_MAGICO — orbe brillante con halo, leve ondulación y estela de chispas; estallido en estrella
// =====================================================================
const HALO_FS=`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float m=band(r,.78,.05)*(.5+.5*step(.4,fract(an*.955+uT*2.)))+smoothstep(.6,0.,r)*.35;
 gl_FragColor=vec4(mix(uC1,vec3(1.),.3)*1.4,m*uA);}`;
VFX.basic.PROYECTIL_MAGICO=function(cfg){cfg=cfg||{};
  const def={key:cfg.key||"basic_proyectil_magico",name:cfg.name||"Proyectil mágico",dur:0.7,ti:0.36,tier:2,pal:cfg.pal||"Estelar",
    phases:[["Carga",0],["Vuelo",0.16],["Estallido",0.36],["Disipación",0.48]],
  build(a){
    const TL=0.16,TI=0.36,P0=V3(-3.1,1.25,0),P1=TC,L=a.L;
    const path=(k,out)=>{const e=k*(0.6+0.4*k),w=Math.sin(Math.PI*k);
      return out.set(P0.x+(P1.x-P0.x)*e,P0.y+(P1.y-P0.y)*e+0.16*Math.sin(k*12.566)*w,0.14*Math.cos(k*9.42)*w);};
    const C=`const float TL=${f(TL)};const float TI=${f(TI)};const vec3 P0=${v3(P0)};const vec3 P1=${v3(P1)};
    vec3 path(float t){float k=clamp((t-TL)/(TI-TL),0.,1.);float e=k*(.6+.4*k);float w=sin(3.14159*k);
     return mix(P0,P1,e)+vec3(0.,.16*sin(k*12.566)*w,.14*cos(k*9.42)*w);}`;
    const orb=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),fx(ORB_FS)),halo=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(HALO_FS,{depthTest:false}));
    const star=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(STARB_FS,{depthTest:false}));
    const hitRing=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(RING_FS,{depthTest:false}));
    L.mesh.add(orb,halo,star,hitRing);
    const tailMat=fx(TAIL_FS),tail=crossTail(tailMat);L.trail.add(tail);
    const shock=groundPlane(2.6,TX,0.03,fx(RING_FS));L.decal.add(shock);
    // chispas que convergen en la carga
    a.count+=points(L.part,50,C+`void main(){float life=.1+aSeed.y*.05;float age=(uT-aSeed.x*(TL-.06))/life;
     vec3 d=normalize(rnd()+.0001);vec3 p=P0+d*mix(.8,.05,age*age);
     vA=(age>0.&&age<1.&&uT<TL)?smoothstep(0.,.3,age):0.;put(p,.035+.03*aSeed.z);}`,GLOW_FS);
    // estela de chispas titilantes
    a.count+=points(L.part,200,C+`void main(){float s=TL+aSeed.x*(TI-TL);float life=.2+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 r=rnd();vec3 p=path(s)+r*.07+(r*.35+vec3(-.6,.15,0.))*t;
     vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*45.+aSeed.z*30.)):0.;put(p,(.035+.05*aSeed.w)*(1.-age*.6));}`,GLOW_FS);
    // estrellitas del estallido
    a.count+=points(L.part,40,C+`void main(){float s=TI+aSeed.x*.04;float life=.25+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()+vec3(-.4,.2,0.));vec3 p=P1+d*(.4+1.3*aSeed.z)*(1.-exp(-t*6.));
     vA=(age>0.&&age<1.)?1.-age:0.;put(p,.16+.12*aSeed.w);}`,STAR4_FS);
    a.count+=sparks(L.part,130,TI,`${f(P1.x)},${f(P1.y)},0.`,"-.4,.2,0.",2.5,7,2);
    a.pose=function(te,o){
      const ia=te-TI,g0=ss(0,TL,te),k=cl((te-TL)/(TI-TL)),fly=te>=TL&&te<TI;
      caster.rotation.z=0.1*g0-0.2*ss(TL,TL+0.05,te)+0.1*ss(TL+0.08,TL+0.4,te);
      path(k,tmp);const r=fly?0.17:0.15*g0*(1+0.1*Math.sin(te*50));
      orb.visible=te<TI;orb.position.copy(tmp);orb.scale.setScalar(Math.max(r,0.001));orb.material.uniforms.uA.value=1;
      bb(halo,tmp,0.25,-te*4);halo.visible=te<TI;halo.scale.setScalar(Math.max(r*3.2,0.001));halo.material.uniforms.uA.value=g0*0.8;
      path(Math.max(k-0.03,0),tmp2);tail.visible=fly;tail.position.copy(tmp);tail.rotation.z=Math.atan2(tmp.y-tmp2.y,tmp.x-tmp2.x);
      tail.scale.set(Math.max(Math.min(k*6,1.5),0.001),0.22,0.22);tailMat.uniforms.uA.value=0.9;
      let p=cl(ia/0.3);bb(star,P1,0.4,0.2+ia*1.5);star.visible=ia>=0&&p<1;star.scale.setScalar(2.2);set(star,0.25+0.75*(1-(1-p)*(1-p)),ia>=0?1-p*p:0);
      p=cl(ia/0.25);bb(hitRing,P1,0.35);hitRing.visible=ia>=0&&p<1;hitRing.scale.setScalar(0.6+1.4*p);set(hitRing,p,ia>=0?1-p:0);
      pulse(shock,ia,0.35,0.5);
      const h=ex(ia,7);target.position.x=TX+0.13*h;target.rotation.z=-h*0.17*Math.cos(ia*15);
      if(te<TL){o.g.copy(P0);o.gs=0.9*g0;o.ga=0.4*g0;o.li=2*g0;}
      else if(fly){o.g.copy(tmp);o.gs=1.1;o.ga=0.5;o.li=3.5;}
      else{o.g.copy(P1);o.gs=1.2+3*ia;o.ga=Math.exp(-ia*10)*0.65;o.li=6*Math.exp(-ia*6);}
      o.ia=ia;o.c.copy(P1);o.shake=0;o.dist=0.6;
    };
  }};
  return def;
};

// =====================================================================
// RAFAGA — cinco orbes pequeños salen en abanico y caen, escalonados, sobre las casillas del área en cruz
// =====================================================================
VFX.basic.RAFAGA=function(cfg){cfg=cfg||{};
  const def={key:cfg.key||"basic_rafaga",name:cfg.name||"Ráfaga",dur:0.9,ti:0.43,tier:2,pal:cfg.pal||"Naturaleza",
    phases:[["Abanico",0],["Vuelo",0.06],["Caída",0.4],["Disipación",0.6]],
  build(a){
    const L=a.L,TI=0.43,P0=V3(-3.3,1.6,0);
    // orbe: casilla destino [dx,dz], salida, llegada, altura del arco y abombado lateral del abanico
    const ORBS=[{c:[0,-1],t0:0.06,t1:0.46,h:1.9,sz:-1.3},{c:[-1,0],t0:0.09,t1:0.40,h:1.6,sz:-0.6},{c:[0,0],t0:0.12,t1:0.43,h:2.3,sz:0},
      {c:[1,0],t0:0.15,t1:0.52,h:2.6,sz:0.6},{c:[0,1],t0:0.18,t1:0.49,h:1.9,sz:1.3}];
    const LT=CELLS5.map(c=>ORBS.find(q=>q.c[0]===c[0]&&q.c[1]===c[1]).t1);
    const tiles=groundPlane(3.6,TX,0.02,fx(crossTilesFS(3.6,LT)));L.decal.add(tiles);
    const orbMat=fx(ORB_FS);
    ORBS.forEach((q,i)=>{
      q.L=V3(TX+q.c[0],0.15,q.c[1]);q.m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),orbMat);L.mesh.add(q.m);
      q.r=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(RING_FS,{depthTest:false}));L.mesh.add(q.r);
      const C=`const float T0=${f(q.t0)};const float T1=${f(q.t1)};const vec3 A=${v3(P0)};const vec3 B=${v3(q.L)};
      vec3 path(float t){float k=clamp((t-T0)/(T1-T0),0.,1.);return mix(A,B,k)+vec3(0.,${f(4*q.h)}*k*(1.-k),${f(q.sz)}*sin(3.14159*k));}`;
      a.count+=points(L.part,40,C+`void main(){float s=T0+aSeed.x*(T1-T0);float life=.16+aSeed.y*.18;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 r=rnd();vec3 p=path(s)+r*.05+r*.25*t+vec3(0.,.2*t,0.);
       vA=(age>0.&&age<1.)?(1.-age):0.;put(p,(.03+.04*aSeed.w)*(1.-age*.5));}`,GLOW_FS);
      a.count+=points(L.part,26,C+`void main(){float s=T1+aSeed.x*.03;float life=.25+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,.9,0.));vec3 p=B+d*(.3+.8*aSeed.z)*(1.-exp(-t*6.))+vec3(0.,.3*t,0.);
       vA=(age>0.&&age<1.)?1.-age:0.;put(p,.04+.05*aSeed.w);}`,GLOW_FS);
      a.count+=sparks(L.part,22,q.t1,`${f(q.L.x)},.15,${f(q.L.z)}`,"0.,.9,0.",1.5,4,2.5);
      q.path=(te,out)=>{const k=cl((te-q.t0)/(q.t1-q.t0));return out.set(P0.x+(q.L.x-P0.x)*k,P0.y+(q.L.y-P0.y)*k+q.h*4*k*(1-k),q.L.z*k+q.sz*Math.sin(Math.PI*k));};
    });
    const hand=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(HALO_FS,{depthTest:false}));L.mesh.add(hand);
    a.pose=function(te,o){
      const ia=te-TI,g0=ss(0,0.08,te);
      caster.rotation.z=0.12*g0-0.25*ss(0.06,0.12,te)+0.13*ss(0.2,0.5,te);
      bb(hand,P0,0.3,te*5);hand.scale.setScalar(0.6+0.5*g0);hand.material.uniforms.uA.value=g0*(1-ss(0.18,0.26,te));
      set(tiles,cl(te/0.4),ss(0,0.08,te)*(1-ss(0.7,0.9,te)));
      for(const q of ORBS){const fl=te>=q.t0-0.04&&te<q.t1;q.m.visible=fl;q.path(Math.max(te,q.t0),q.m.position);
        q.m.scale.setScalar(Math.max(0.11*ss(q.t0-0.04,q.t0+0.02,te),0.001));
        const p=cl((te-q.t1)/0.25);bb(q.r,tmp.set(q.L.x,0.35,q.L.z),0.2);q.r.visible=te>=q.t1&&p<1;q.r.scale.setScalar(0.4+1.1*p);set(q.r,p,1-p);}
      orbMat.uniforms.uA.value=1;
      const h=ex(ia,7);target.position.x=TX+0.08*h;target.position.y=0.12*Math.sin(Math.PI*cl(ia/0.2))*(ia>=0?1:0);target.rotation.z=-h*0.14*Math.cos(ia*16);
      if(te<0.12){o.g.copy(P0);o.gs=0.8*g0;o.ga=0.35*g0;o.li=2*g0;}
      else if(ia<0){ORBS[2].path(te,o.g);o.gs=1.4;o.ga=0.25;o.li=3;}
      else{o.g.set(TX,0.5,0);o.gs=1.5+2*ia;o.ga=Math.exp(-ia*8)*0.5;o.li=5*Math.exp(-ia*4);}
      o.ia=ia;o.c.set(TX,0.6,0);o.shake=0;o.dist=0.5;
    };
  }};
  return def;
};

// =====================================================================
// NOVA_CRUZ — carga de 0,3 s en el centro y estallido que recorre la cruz casilla a casilla.
// style: 'cristal' (agujas de hielo que estallan) | 'esporas' (bolas de esporas) | 'llamas' (columnas de fuego) | 'estrellas' (estrellas que caen)
// opciones: slow, weak, fragile, burn (estados sobre todos los alcanzados)
// =====================================================================
const CRYSTAL_FS=PAL+`void main(){float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5);
 float fac=step(.5,fract(atan(vP.z,vP.x)*.796+.5));
 vec3 c=mix(deepC(),mix(uC1,vec3(1.),.45),fr*.8+fac*.25+vP.y*.3)*1.3;
 gl_FragColor=vec4(c+vec3(1.)*pow(fr,4.)*.6,(.35+.6*fr)*uA);}`;
const SPORE_FS=PAL+`void main(){float n=noise(vP*3.5+vec3(0.,-uT*1.5,uT))*.6+noise(vP*8.+vec3(uT))*.4;
 float fr=1.-abs(dot(normalize(vN),normalize(vV)));float m=smoothstep(uP*.9,uP*.9+.25,n);
 gl_FragColor=vec4(mix(deepC(),uC1,n)*1.3,m*(.25+.5*(1.-fr))*uA);}`;
const STREAK_FS=`void main(){float v=vUv.y;float u=abs(vUv.x-.5)*2.;
 float al=smoothstep(1.,0.,u)*pow(v,.6)*smoothstep(1.,.85,v);
 gl_FragColor=vec4(mix(uC1,vec3(1.),.5*v)*1.6,al*uA);}`;
VFX.basic.NOVA_CRUZ=function(cfg){cfg=cfg||{};
  const SP={cristal:"Hielo",esporas:"Esporas",llamas:"Fuego",estrellas:"Estelar"},PS={Hielo:"cristal",Esporas:"esporas",Fuego:"llamas",Estelar:"estrellas"};
  const VAR=cfg.demo?{cristal:{style:"cristal"},esporas:{style:"esporas"},llamas:{style:"llamas"},estrellas:{style:"estrellas"},
    lento:{style:"cristal",slow:1},debil:{style:"esporas",weak:1},fragil:{style:"estrellas",fragile:1},quema:{style:"llamas",burn:1}}:null;
  const style0=SP[cfg.style]?cfg.style:(PS[cfg.pal]||"cristal");
  const def={key:cfg.key||"basic_nova_cruz",name:cfg.name||"Nova en cruz",dur:1.0,ti:0.3,tier:2,enemies:2,
    pal:VAR?()=>SP[(VAR[def.v]||VAR.cristal).style]:(cfg.pal||SP[style0]),
    phases:[["Carga",0],["Estallido",0.3],["Cruz",0.38],["Disipación",0.6]],
  build(a){
    const TCH=0.3,CORE=V3(TX,0.55,0),B=mkG(a);
    const CELLS=CELLS5.map((c,i)=>[c[0],c[1],[0.30,0.38,0.41,0.44,0.47][i]]);
    const CP=CELLS.map(c=>V3(TX+c[0],0,c[1]));
    const who=[target,enemies[0],enemies[1]],HT=[0.30,0.38,0.47];   // rivales en (−1,0) y (0,−1)
    const tiles=groundPlane(3.6,TX,0.02,fx(crossTilesFS(3.6,CELLS.map(c=>c[2]))));B.decal.add(tiles);
    const core=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),fx(ORB_FS));B.mesh.add(core);
    const coreRing=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(RING_FS,{depthTest:false}));B.mesh.add(coreRing);
    const CG=cellGLSL(CELLS);
    // energía que corre desde las casillas hacia el centro durante la carga
    B.n+=points(B.part,90,CG+`void main(){float i=cellI();vec3 c=cellP(i);float life=.14+aSeed.y*.08;float age=(uT-aSeed.x*.2)/life;
     float an=aSeed.z*6.2832;vec3 st=c+vec3(cos(an)*.4,.05,sin(an)*.4);vec3 p=mix(st,${v3(CORE)},age*age)+vec3(0.,sin(age*3.14159)*.25,0.);
     vA=(age>0.&&age<1.&&uT<${f(TCH)})?smoothstep(0.,.2,age):0.;put(p,.04+.035*aSeed.z);}`,GLOW_FS);
    CELLS.forEach((c,i)=>{B.n+=sparks(B.part,20,c[2],`${f(TX+c[0])},.3,${f(c[1])}`,"0.,.9,0.",1.5,4,2.5);});
    // ---- estilos (cada uno es una capa) ----
    const STY={};
    {// cristal: agujas que brotan y estallan en esquirlas
      const G=mkG(a),sh=[];
      CELLS.forEach((c,ci)=>{const n=ci?4:6;for(let j=0;j<n;j++){const m=new THREE.Mesh(new THREE.ConeGeometry(1,1,5).translate(0,0.5,0),fx(CRYSTAL_FS));
        const an=j/n*Math.PI*2+ci,rad=j?0.12+0.14*Math.random():0;
        m.position.set(TX+c[0]+Math.cos(an)*rad,0,c[1]+Math.sin(an)*rad);m.rotation.set(Math.sin(an)*rad*2.2,0,-Math.cos(an)*rad*2.2);
        m.userData={t:c[2],h:(ci?0.5:0.75)*(j?0.6+0.4*Math.random():1.15),r:(ci?0.08:0.1)*(j?0.8+0.4*Math.random():1.3)};G.mesh.add(m);sh.push(m);}});
      G.n+=points(G.part,120,CG+`void main(){float i=cellI();float s=cellT(i)+.33+aSeed.x*.03;float life=.3+aSeed.y*.15;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,1.,0.));vec3 p=cellP(i)+vec3(0.,.35,0.)+d*(1.+2.*aSeed.z)*t+vec3(0.,-6.*t*t,0.);p.y=max(p.y,.03);
       vA=(age>0.&&age<1.)?1.-age:0.;put(p,.05+.05*aSeed.y);}`,SHARD_FS);
      G.pose=te=>{for(const m of sh){const u=m.userData,g=ss(u.t-0.02,u.t+0.06,te),br=ss(u.t+0.3,u.t+0.38,te),ov=1+0.18*ex(te-u.t-0.06,10);
        m.visible=g>0&&br<1;m.scale.set(Math.max(u.r*(1-br*0.5),0.001),Math.max(u.h*g*ov*(1-br),0.001),Math.max(u.r*(1-br*0.5),0.001));m.material.uniforms.uA.value=1-br;}};
      STY.cristal=G;
    }
    {// esporas: bolas de esporas que revientan y dejan motas flotando
      const G=mkG(a),pf=[];
      CELLS.forEach((c,ci)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),fx(SPORE_FS));m.position.set(TX+c[0],0.45,c[1]);m.userData={t:c[2],s:ci?0.55:0.8};G.mesh.add(m);pf.push(m);});
      G.n+=points(G.part,170,CG+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.08;float life=.45+aSeed.y*.25;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,.5,0.));vec3 p=cellP(i)+vec3(0.,.4,0.)+d*(.3+.5*aSeed.z)*(1.-exp(-t*5.))+vec3(sin(t*6.+aSeed.z*9.)*.08,.6*t,0.);
       vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age)*.9:0.;put(p,.04+.05*aSeed.y);}`,GLOW_FS);
      G.pose=te=>{for(const m of pf){const u=m.userData,k=cl((te-u.t)/0.45);m.visible=te>=u.t&&k<1;
        m.scale.setScalar(Math.max(u.s*(0.25+0.85*(1-Math.pow(1-k,3))),0.001));set(m,k,1-k*k*0.3);}};
      STY.esporas=G;
    }
    {// llamas: columna de fuego por casilla y brasas
      const G=mkG(a),fl=[];
      CELLS.forEach((c,ci)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.38,1.3,24,6,true).translate(0,0.65,0),fx(FIRE_FS(1.3)));
        m.position.set(TX+c[0],0,c[1]);m.userData={t:c[2],s:ci?0.8:1.15};G.mesh.add(m);fl.push(m);});
      G.n+=points(G.part,150,CG+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.2;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 r=rnd();vec3 p=cellP(i)+vec3(r.x*.35,.1+t*(1.4+aSeed.z),r.z*.35);
       vA=(age>0.&&age<1.)?sin(age*3.14159):0.;put(p,(.14+.1*aSeed.w)*(1.-age*.5));}`,FLAME_FS);
      G.pose=te=>{for(const m of fl){const u=m.userData,k=te-u.t,g=ss(0,0.06,k),fd=ss(0.22,0.42,k);m.visible=k>=0&&fd<1;
        m.scale.set(1+0.3*(1-g),Math.max(u.s*g*(1-fd*0.7),0.001),1+0.3*(1-g));set(m,1-fd,g*(1-fd));}};
      STY.llamas=G;
    }
    {// estrellas: una estrella cae en cada casilla y destella
      const G=mkG(a),st=[];
      CELLS.forEach((c,ci)=>{const s=new THREE.Mesh(new THREE.PlaneGeometry(0.14,1.6),fx(STREAK_FS,{depthTest:false})),fl=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx(STARB_FS,{depthTest:false}));
        s.userData={t:c[2],p:V3(TX+c[0],0,c[1]),s:ci?1.2:1.7,fl};G.trail.add(s);G.mesh.add(fl);st.push(s);});
      G.n+=points(G.part,150,CG+`void main(){float i=cellI();float s=cellT(i)+aSeed.x*.05;float life=.3+aSeed.y*.2;float age=(uT-s)/life;float t=max(uT-s,0.);
       vec3 d=normalize(rnd()+vec3(0.,.7,0.));vec3 p=cellP(i)+vec3(0.,.45,0.)+d*(.3+.9*aSeed.z)*(1.-exp(-t*5.))+vec3(0.,-.4*t*t,0.);
       vA=(age>0.&&age<1.)?1.-age:0.;put(p,.12+.1*aSeed.w);}`,STAR4_FS);
      G.pose=te=>{for(const s of st){const u=s.userData,k=cl((te-(u.t-0.09))/0.09),q=cl((te-u.t)/0.35);
        s.visible=te>=u.t-0.09&&te<u.t+0.04;s.position.set(u.p.x,0.5+3.8*(1-k)+0.8,u.p.z);billboard(s);s.material.uniforms.uA.value=1-cl((te-u.t)/0.04);
        bb(u.fl,tmp.set(u.p.x,0.55,u.p.z),0.3,0.3+te);u.fl.visible=te>=u.t&&q<1;u.fl.scale.setScalar(u.s);set(u.fl,0.25+0.75*(1-(1-q)*(1-q)),1-q*q);}};
      STY.estrellas=G;
    }
    // ---- estados opcionales sobre todos los alcanzados ----
    const SK=["slow","weak","fragile","burn"],SG={},ST=SK.map(k=>({kind:k,on:false,env:0}));
    SK.forEach(k=>{SG[k]=mkStatus(a,k,who,0.45,1.0);});
    let S={style:style0};
    options(a,VAR,{style:style0,slow:!!cfg.slow,weak:!!cfg.weak,fragile:!!cfg.fragile,burn:!!cfg.burn},s=>{S=s;let n=B.n;
      for(const k in STY){const on=k===s.style;STY[k].show(on);if(on)n+=STY[k].n;}
      SK.forEach((k,i)=>{ST[i].on=!!s[k];SG[k].show(ST[i].on);if(ST[i].on)n+=SG[k].n;});a.count=n;},"cristal");
    a.pose=function(te,o){
      const ia=te-TCH,ch=cl(te/TCH);
      caster.rotation.z=0.12*ss(0,TCH,te)-0.22*ss(TCH-0.02,TCH+0.04,te)+0.1*ss(TCH+0.1,TCH+0.5,te);
      enemies[0].position.set(TX-1,0,0);enemies[1].position.set(TX,0,-1);
      who.forEach((w,i)=>{const h=ex(te-HT[i],7),up=te>=HT[i]?0.12*Math.sin(Math.PI*cl((te-HT[i])/0.22)):0;w.position.y=up;w.rotation.z=-h*0.15*Math.cos((te-HT[i])*15);});
      enemies[0].position.x-=0.08*ex(te-HT[1],6);enemies[1].position.z-=0.08*ex(te-HT[2],6);target.position.x+=0.06*ex(ia,6);
      set(tiles,ch,ss(0,0.08,te)*(1-ss(0.8,1.0,te)));
      const cg=ss(0,TCH,te),pop=cl(ia/0.08);core.visible=pop<1;core.position.copy(CORE);
      core.scale.setScalar(Math.max((0.06+0.24*cg)*(1+0.1*Math.sin(te*40))*(1+1.5*pop),0.001));core.material.uniforms.uA.value=1-pop;
      let p=cl(ia/0.3);bb(coreRing,CORE,0.3);coreRing.visible=ia>=0&&p<1;coreRing.scale.setScalar(0.6+2.4*p);set(coreRing,p,ia>=0?1-p:0);
      STY[S.style].pose(te);
      SK.forEach((k,i)=>{ST[i].env=SG[k].pose(te);});statusEm(o,ST);
      if(ia<0){o.g.copy(CORE);o.gs=0.4+0.9*ch;o.ga=0.4*ch;o.li=3*ch;}
      else{o.g.set(TX,0.6,0);o.gs=1.8+2.5*ia;o.ga=Math.exp(-ia*7)*0.55;o.li=7*Math.exp(-ia*3.5);}
      o.ia=ia;o.c.copy(CORE);o.shake=0;o.dist=0.7;o.ld=10;
    };
  }};
  if(VAR){def.variants=[["cristal","Cristal"],["esporas","Esporas"],["llamas","Llamas"],["estrellas","Estrellas"],
    ["lento","Cristal + lento"],["debil","Esporas + débil"],["fragil","Estrellas + frágil"],["quema","Llamas + quemadura"]];def.v="cristal";def.vlabel="Estilo";}
  return def;
};

// =====================================================================
// CATACLISMO — efecto de jefe (nivel 3): el velo se oscurece, vórtice en el cielo, columna que cae al centro,
// ondas que recorren toda la cruz, temblor fuerte y baldosas fracturadas. Opción burn: quemadura en todos los alcanzados
// =====================================================================
const VORTEX_FS=PAL+`void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float an=atan(p.y,p.x);
 float sw=noise(vec3(an*3.+r*6.-uT*5.,r*4.,uT*.5))*.7+noise(vec3(an*7.+r*10.-uT*8.,r*9.,1.))*.3;
 float arms=smoothstep(.45,.8,sw);
 float m=arms*smoothstep(1.,.3,r)*(.4+.6*smoothstep(0.,.25,r))+smoothstep(.25,0.,r)*uP*1.2;
 gl_FragColor=vec4(mix(deepC(),uC1,arms*.6+smoothstep(.3,0.,r))*1.4,m*uA);}`;
const BEAM_FS=`void main(){float c=pow(abs(dot(normalize(vN),normalize(vV))),1.6);gl_FragColor=vec4(mix(uC1,vec3(1.),.6)*1.7,c*uA);}`;
const PILLAR_FS=PAL+`void main(){float h=vP.y/7.+.5;float an=atan(vP.z,vP.x);
 float n=noise(vec3(an*4.,h*3.-uT*6.,uT*.5))*.6+noise(vec3(an*11.,h*8.-uT*10.,2.))*.4;float st=smoothstep(.38,.8,n);
 float fr=1.-abs(dot(normalize(vN),normalize(vV)));
 gl_FragColor=vec4(mix(deepC(),uC1,st)*1.15+vec3(1.)*st*(1.-h)*.25,(st*.55+pow(fr,2.)*.35+.05)*pow(1.-h,1.2+uP*3.)*uA);}`;
const WAVES_FS=PAL+`void main(){vec2 p=(vUv-.5)*5.;
 float soft=max(smoothstep(.5,.38,abs(p.y))*smoothstep(1.55,1.35,abs(p.x)),smoothstep(.5,.38,abs(p.x))*smoothstep(1.55,1.35,abs(p.y)));
 float d=abs(p.x)+abs(p.y);float w=0.;
 for(int i=0;i<3;i++){float fi=float(i);float R=uP*3.4-fi*.6;w+=band(d,R,.12+.06*fi)*step(0.,R)*(1.-fi*.25);}
 float glow=soft*(.18+.12*noise(vec3(p*4.,uT*3.)))*(1.-uP);
 float echo=band(length(p),uP*2.4,.08)*.35*(1.-uP);
 gl_FragColor=vec4(mix(deepC(),uC1,w)*1.6+vec3(1.)*w*.3,(w*soft*1.2+glow+echo)*uA);}`;
VFX.basic.CATACLISMO=function(cfg){cfg=cfg||{};
  const VAR=cfg.demo?{normal:{burn:false},quema:{burn:true}}:null;
  const def={key:cfg.key||"basic_cataclismo",name:cfg.name||"Cataclismo",dur:1.6,ti:0.75,tier:3,enemies:2,pal:cfg.pal||"Fuego",
    phases:[["Velo",0],["Concentración",0.3],["Columna",0.62],["Impacto",0.75],["Ondas",0.9],["Disipación",1.25]],
  build(a){
    const TB=0.62,TI=0.75,CX=TX,B=mkG(a),SKY=5.6;
    const who=[target,enemies[0],enemies[1]];
    const tiles=groundPlane(3.6,CX,0.02,fx(crossTilesFS(3.6,[TI,TI,TI,TI,TI])));
    const waves=groundPlane(5,CX,0.03,fx(WAVES_FS)),shock=groundPlane(9,CX,0.035,fx(RING_FS));
    const frac=groundPlane(4.2,CX,0.025,fx(tileFractureFS(4.2)));
    B.decal.add(tiles,waves,shock,frac);
    const vortex=new THREE.Mesh(new THREE.PlaneGeometry(6,6).rotateX(Math.PI/2),fx(VORTEX_FS));vortex.position.set(CX,SKY,0);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,14,16,1,true),fx(BEAM_FS));
    const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,7,48,1,true),fx(PILLAR_FS));pillar.position.set(CX,3.5,0);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),fx(BURST_FS));dome.position.set(CX,0,0);
    B.mesh.add(vortex,pillar,dome);B.trail.add(beam);
    const CG=cellGLSL(CELLS5.map(c=>[c[0],c[1],TI]));
    // energía que sube en espiral desde la cruz hasta el vórtice
    B.n+=points(B.part,200,CG+`void main(){float i=cellI();float life=.35+aSeed.y*.2;float s=.1+aSeed.x*${f(TB-0.1-0.35)};float age=(uT-s)/life;
     float an=aSeed.z*6.2832+age*4.;float rad=mix(.45,.15,age);vec3 c=mix(cellP(i),vec3(${f(CX)},0.,0.),age*.7);
     vec3 p=c+vec3(cos(an)*rad,age*age*${f(SKY)},sin(an)*rad);
     vA=(age>0.&&age<1.)?smoothstep(0.,.15,age)*(1.-age*age):0.;put(p,.04+.04*aSeed.w);}`,GLOW_FS);
    // esquirlas de baldosa, chispas, polvo y brasas tras el golpe
    B.n+=points(B.part,140,CG+`void main(){float i=cellI();float s=${f(TI)}+aSeed.x*.06;float life=.6+aSeed.y*.35;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(rnd()*vec3(1.,.2,1.)+vec3(0.,1.2,0.));vec3 p=cellP(i)+vec3(rnd().x*.4,.05,rnd().z*.4)+d*(2.5+4.*aSeed.z)*t+vec3(0.,-9.*t*t,0.);p.y=max(p.y,.03);
     vA=(age>0.&&age<1.)?1.-age*age:0.;put(p,.06+.07*aSeed.y);}`,SHARD_FS);
    B.n+=sparks(B.part,260,TI,`${f(CX)},.4,0.`,"0.,.6,0.",5,12,4);
    B.n+=points(B.part,70,CG+`void main(){float i=cellI();float s=${f(TI)}+.05+aSeed.x*.15;float life=.8+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 d=normalize(vec3(rnd().x,0.,rnd().z)+.0001);vec3 p=cellP(i)+d*(.4+1.2*aSeed.z)*(1.-exp(-t*2.5))+vec3(0.,.15+.5*(1.-exp(-t*2.)),0.);
     vA=(age>0.&&age<1.)?smoothstep(0.,.1,age)*(1.-age)*.8:0.;put(p,(.35+.35*aSeed.y)*(.6+age*.7));}`,DUST_FS,NB);
    B.n+=points(B.part,130,CG+`void main(){float i=cellI();float s=${f(TI)}+aSeed.x*.5;float life=.5+aSeed.y*.4;float age=(uT-s)/life;float t=max(uT-s,0.);
     vec3 p=cellP(i)+vec3((aSeed.z-.5)*.9+sin(t*5.+aSeed.w*9.)*.1,.1+t*(1.2+aSeed.z),(aSeed.y-.5)*.9);
     vA=(age>0.&&age<1.)?(1.-age)*(.5+.5*sin(t*30.+aSeed.x*50.)):0.;put(p,.035+.04*aSeed.w);}`,GLOW_FS);
    const BR=mkStatus(a,"burn",who,0.85,1.6),ST=[{kind:"burn",on:false,env:0}];
    options(a,VAR,{burn:!!cfg.burn},s=>{ST[0].on=!!s.burn;BR.show(ST[0].on);a.count=B.n+(ST[0].on?BR.n:0);},"normal");
    a.pose=function(te,o){
      const ia=te-TI,fall=cl((te-TB)/(TI-TB));
      caster.rotation.z=0.16*ss(0,TB,te)-0.34*ss(TB,TI,te)+0.18*ss(TI+0.1,TI+0.6,te);caster.position.y=0.12*ss(0.1,TB,te)*(1-ss(TI,TI+0.15,te));
      enemies[0].position.set(CX-1,0,0);enemies[1].position.set(CX,0,-1);
      // todos los alcanzados saltan por el golpe y caen
      const air=ia>0?Math.sin(Math.PI*cl(ia/0.55)):0;
      who.forEach((w,i)=>{w.position.y=(i?0.45:0.6)*air;w.rotation.z=-(i?0.3:0.4)*air*(i===1?-1:1);});
      enemies[0].position.x-=0.25*air;enemies[1].position.z-=0.25*air;
      o.dark=0.85*ss(0,0.45,te)*(1-ss(1.25,1.6,te));
      set(tiles,cl(te/TB),ss(0,0.2,te)*(1-ss(1.2,1.5,te))*(ia>0?1.3:1));
      vortex.visible=te<TI+0.4;set(vortex,ss(0.3,TB,te),ss(0.05,0.4,te)*(1-ss(TI,TI+0.4,te)));
      beam.visible=te>=TB&&ia<0.35;beam.position.set(CX,7+(1-fall)*(SKY+1),0);
      const bw=ia>0?1+2.5*Math.exp(-ia*9):1;beam.scale.set(bw,1,bw);beam.material.uniforms.uA.value=ia>0?0.7*(1-cl(ia/0.35)):1;
      let p=cl(ia/0.6);pillar.visible=ia>=0&&p<1;pillar.scale.set(1+0.15*p,1,1+0.15*p);set(pillar,p,ia>=0?Math.pow(1-p,1.2)*ss(0,0.04,ia):0);
      p=cl(ia/0.4);dome.visible=ia>=0&&p<1;dome.scale.setScalar(1.9*(0.3+0.85*(1-Math.pow(1-p,3))));dome.material.uniforms.uP.value=p;
      p=cl(ia/0.75);set(waves,p,ia>=0?1-p*p:0);
      p=cl(ia/0.6);set(shock,1-Math.pow(1-p,2),ia>=0?0.8*(1-p):0);
      set(frac,cl(ia/0.3),ia>=0?1-ss(0.4,0.85,ia):0);
      ST[0].env=BR.pose(te);statusEm(o,ST);
      o.white=ia>=0?0.55*Math.exp(-ia*25):0;
      if(ia>=0){o.g.set(CX,1,0);o.gs=2.5+5*ia;o.ga=Math.exp(-ia*8)*0.65;o.li=14*Math.exp(-ia*3.5)+(ST[0].on?1.5*ST[0].env:0);}
      else if(te>=TB){o.g.set(CX,(1-fall)*SKY,0);o.gs=2;o.ga=0.9;o.li=7;}
      else{const k=ss(0.1,TB,te);o.g.set(CX,SKY*0.8,0);o.gs=2.5*k;o.ga=0.35*k;o.li=3*k;}
      o.ia=ia;o.c.set(CX,0.6,0);o.shake=1.8;o.dist=1.4;o.ld=12;
    };
  }};
  if(VAR){def.variants=[["normal","Normal"],["quema","Quemadura"]];def.v="normal";def.vlabel="Efecto";}
  return def;
};

// ---------- demos de cada tipo ----------
const B=VFX.basic;
VFX.module("Básicos · Distancia y área",[
  B.ESCUPITAJO({demo:true}),B.BABA_PEGAJOSA({demo:true}),B.FLECHA({demo:true}),B.PROYECTIL_MAGICO({demo:true}),
  B.RAFAGA({demo:true}),B.NOVA_CRUZ({demo:true}),B.CATACLISMO({demo:true})]);
})();

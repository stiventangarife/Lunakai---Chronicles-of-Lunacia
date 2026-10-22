// PrologueCinematic.js — Cinemática del prólogo (Hito 48): «Crónicas de Lunacia».
//
// Estilo: papel envejecido (grano, viñeta, fibras) con constelaciones doradas, un friso de piedra en panorámica
// y teatro de sombras en rojo con las siluetas de los modelos reales del juego (GLB pintados a tinta).
// Final épico: el Señor de las Quimeras se alza, el Sapidae del jugador (su modelo y peinado) y su Axie le plantan cara,
// la esquirla de luna se enciende, la paleta pasa del rojo al oro de la resonancia y el logo LUNAKAI cae con onda expansiva.
//
// Usa el renderer del juego (el bucle principal no dibuja mientras gameState === 'CINEMATIC'):
// escena ortográfica → render target → pasada de papel (shader) → canvas. Narración en subtítulos (sin voz por ahora).
// Música: CINEMATICA y, en el clímax, BATTLE_BOSS desde su parte más intensa.
//
//   const cin = new PrologueCinematic({ renderer, audio, player, playerName, companionName });
//   await cin.preload();          // modelos y logo (mientras sigue la pantalla de carga)
//   const r = await cin.play();   // { skipped: bool }
//
// Consola: lunakaiCinematic.play() / .seek(segundos) para revisar planos.

import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import { clone as cloneSkinned } from '../../../vendor/utils/SkeletonUtils.js';
import {
  rng, paperCanvas, gradientCanvas, glowCanvas, sparkleCanvas, moonCanvas, crackPaths, heartCanvas, MOON_BITE, treeCanvas, islandsCanvas,
  friezeCanvas, totemCanvas, hillsCanvas, smokeCanvas, ringCanvas, raysCanvas, CONSTELLATIONS,
} from './CinematicArt.js';

// Corazones del friso (unidades de escena): adelanto hacia donde mira cada figura y ajuste de altura.
// En el Axie se parte del hueso del tronco (MIX = 0 → tronco, 1 → cabeza): queda en el pecho, bajo la cara.
const HEART_FWD_SAP = 0.22, HEART_UP_SAP = 0.05, HEART_FWD_AXIE = 0.26, HEART_UP_AXIE = -0.12, HEART_MIX_AXIE = 0;
const VIEW_H = 10;
const NARRATOR = 'Maestro Paladill';
const LOGO_URL = './assets/ui/brand/lunakai-logo.webp';
const MODELS = {
  sapF: 'sapidae-f-b', sapM: 'sapidae-m-c', axieA: 'kotaro', axieB: 'bing', axieC: 'pomodoro',
  slime: 'slime', wolf: 'wolf-gray', dryad: 'dryad-fighter', lord: 'werewolf-boss',
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const backOut = (t) => { const c1 = 1.70158, c3 = c1 + 1; t = clamp01(t); return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;

/** Clon con esqueleto. El userData del juego (contornos, referencias circulares) no se copia: Object3D.clone lo pasa por JSON. */
function safeClone(src) {
  const saved = new Map();
  src.traverse((o) => { saved.set(o, o.userData); o.userData = {}; });
  try { return cloneSkinned(src); } finally { saved.forEach((ud, o) => { o.userData = ud; }); }
}

// ------------------------------------------------------------------ material de tinta (silueta con borde de luz)
const INK_VS = /* glsl */`
  #include <common>
  #include <batching_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  varying vec3 vN;
  void main() {
    #include <batching_vertex>
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    vN = normalize(transformedNormal);
  }`;
const INK_FS = /* glsl */`
  uniform vec3 uInk; uniform vec3 uRim; uniform float uRimAmt; uniform float uOpacity;
  varying vec3 vN;
  void main() {
    float f = pow(1.0 - abs(vN.z), 3.0);
    vec3 c = mix(uInk, uRim, clamp(f * uRimAmt * 1.6, 0.0, 1.0));
    gl_FragColor = vec4(c, uOpacity);
    #include <colorspace_fragment>
  }`;
function inkMaterial(ink = '#1a0f08') {
  return new THREE.ShaderMaterial({
    uniforms: { uInk: { value: new THREE.Color(ink) }, uRim: { value: new THREE.Color('#ffd27a') }, uRimAmt: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: INK_VS, fragmentShader: INK_FS, transparent: false, depthWrite: true,
  });
}

// ------------------------------------------------------------------ pasada de papel
const POST_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const POST_FS = /* glsl */`
  uniform sampler2D tScene; uniform sampler2D tPaper;
  uniform vec2 uRes; uniform float uTime; uniform float uPaper; uniform float uGrain; uniform float uVig;
  uniform float uFade; uniform vec3 uFadeCol; uniform float uFlash; uniform vec3 uFlashCol; uniform float uBurn;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    vec3 col = texture2D(tScene, uv).rgb;
    vec2 puv = uv * vec2(uRes.x / uRes.y, 1.0) * 1.15 + vec2(0.13, 0.27);
    vec3 paper = texture2D(tPaper, puv).rgb;
    col *= mix(vec3(1.0), paper / 0.80, uPaper);
    float d = distance(uv, vec2(0.5));
    col *= 1.0 - uVig * smoothstep(0.32, 0.9, d);
    // bordes quemados del papel
    float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float n = hash(floor(uv * vec2(90.0, 50.0)));
    col *= mix(1.0, 0.55 + 0.25 * n, uBurn * (1.0 - smoothstep(0.0, 0.05, e)));
    float g = hash(uv * uRes + fract(uTime * 13.7) * 91.0) - 0.5;
    col += g * uGrain;
    col = mix(col, uFadeCol, uFade);
    col += uFlashCol * uFlash;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }`;

/** Guion: planos con su tiempo (s) y la narración. */
const SHOTS = [
  { id: 'stars', t0: 0, t1: 10, sub: 'Escuchad, jóvenes Sapidae. Todo empezó con la luz de Atia.' },
  { id: 'moon', t0: 10, t1: 19, sub: 'Bajo su luna nació Lunacia… y nosotros con ella.' },
  { id: 'frieze', t0: 19, t1: 30, sub: 'A cada Sapidae, un Axie. Un vínculo para siempre.' },
  { id: 'chimeras', t0: 30, t1: 39, sub: 'Pero donde hay vida, llega la corrupción.' },
  { id: 'crack', t0: 39, t1: 47, sub: 'La luna se rompió… y sus esquirlas cayeron sobre las islas.' },
  { id: 'resist', t0: 47, t1: 55, sub: 'Con ellas resistimos. Con ellas nos hicimos fuertes.' },
  { id: 'finale', t0: 55, t1: 73, sub: null },
];
const TOTAL = 73;
// Subtítulos del final (tiempos relativos al plano)
const FINALE_SUBS = [
  { a: 0.6, b: 4.4, text: 'Pero la sombra siempre regresa… más grande que nunca.' },
  { a: 4.8, b: 9.0, text: 'Y una nueva luz se alza para enfrentarla.' },
  { a: 9.2, b: 11.6, text: '¡Resonad!', big: true },
];

export class PrologueCinematic {
  constructor({ renderer, audio = null, player = null, playerName = '', companionName = '' } = {}) {
    this.renderer = renderer;
    this.audio = audio;
    this.player = player;
    this.playerName = playerName || player?.name || '';
    this.companionName = companionName || player?.companionName || '';
    this.gltf = {};
    this.textures = {};
    this.loaded = false;
    this.time = 0;
    this.speed = 1;
    this._shot = null;
    this._shotIdx = -1;
    this._disposables = [];
    if (typeof window !== 'undefined') window.lunakaiCinematic = this;
  }

  // ================================================================ carga
  async preload(onProgress = null) {
    if (this.loaded) return;
    const loader = new GLTFLoader();
    const keys = Object.entries(MODELS);
    let done = 0;
    const tick = () => { done++; onProgress?.(done / (keys.length + 1)); };
    await Promise.all([
      ...keys.map(([k, file]) => loader.loadAsync(`./assets/models/${file}.glb`)
        .then((g) => { this.gltf[k] = g; }).catch((e) => console.warn('[Cinemática] Modelo', file, e)).finally(tick)),
      new Promise((res) => {
        const img = new Image();
        img.onload = () => { this.logoImg = img; res(); };
        img.onerror = () => res();
        img.src = LOGO_URL;
      }).finally(tick),
    ]);
    this._buildTextures();
    this.loaded = true;
  }

  _tex(canvasOrImg, { repeat = false, srgb = true } = {}) {
    const t = canvasOrImg instanceof HTMLImageElement ? new THREE.Texture(canvasOrImg) : new THREE.CanvasTexture(canvasOrImg);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    t.needsUpdate = true;
    this._disposables.push(t);
    return t;
  }

  _buildTextures() {
    const T = this.textures;
    T.paper = this._tex(paperCanvas(1024), { repeat: true });
    T.glow = this._tex(glowCanvas(128));
    T.glowGold = this._tex(glowCanvas(128, 'rgba(255,214,130,1)', 'rgba(255,190,90,0)'));
    T.glowCyan = this._tex(glowCanvas(128, 'rgba(170,240,255,1)', 'rgba(120,220,255,0)'));
    T.glowRed = this._tex(glowCanvas(128, 'rgba(255,60,30,1)', 'rgba(255,20,0,0)'));
    T.sparkle = this._tex(sparkleCanvas(128));
    T.moon = this._tex(moonCanvas(512));
    T.moonBroken = this._tex(moonCanvas(512, 11, MOON_BITE)); // la media luna que queda tras romperse
    T.heart = this._tex(heartCanvas(128));
    T.tree = this._tex(treeCanvas(1024, 1024));
    T.islands = this._tex(islandsCanvas(2048, 512, 3, '#5a3d22'), { repeat: true });
    T.islandsDark = this._tex(islandsCanvas(2048, 512, 8, '#080303', 5));
    T.hills = this._tex(hillsCanvas(2048, 512, 19, '#070202'));
    T.frieze = this._tex(friezeCanvas(4096, 768));
    T.totem = this._tex(totemCanvas());
    T.smoke = this._tex(smokeCanvas());
    T.ring = this._tex(ringCanvas());
    T.ringCyan = this._tex(ringCanvas(512, '150,235,255'));
    T.rays = this._tex(raysCanvas());
    T.raysGold = this._tex(raysCanvas(1024, 30, 23, '255,230,160'));
    if (this.logoImg) T.logo = this._tex(this.logoImg);
  }

  // ================================================================ reproducción
  /** Reproduce la cinemática. Resuelve { skipped } al terminar o al saltarla. */
  play() {
    if (!this.loaded) return Promise.resolve({ skipped: true });
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._setupGL();
      this._setupDOM();
      this._music('CINEMATICA');
      this.time = 0;
      this._last = performance.now();
      this.running = true;
      this._loop();
    });
  }

  /** Salta a un segundo (pruebas). */
  seek(sec) { this.time = Math.max(0, Math.min(TOTAL - 0.01, sec)); this._shotIdx = -1; }

  _setupGL() {
    const r = this.renderer;
    this._saved = {
      toneMapping: r.toneMapping, exposure: r.toneMappingExposure, autoClear: r.autoClear,
      clearColor: r.getClearColor(new THREE.Color()), clearAlpha: r.getClearAlpha(), shadow: r.shadowMap.enabled,
    };
    r.toneMapping = THREE.NoToneMapping;
    r.autoClear = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#000');
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    this.aspect = size.x / Math.max(1, size.y);
    const W = VIEW_H * this.aspect;
    this.camera = new THREE.OrthographicCamera(-W / 2, W / 2, VIEW_H / 2, -VIEW_H / 2, -200, 200);
    this.camera.position.set(0, 0, 50);
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4 });
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.rt.texture }, tPaper: { value: this.textures.paper },
        uRes: { value: size.clone() }, uTime: { value: 0 }, uPaper: { value: 0.85 }, uGrain: { value: 0.05 }, uVig: { value: 0.55 },
        uFade: { value: 1 }, uFadeCol: { value: new THREE.Color('#000') }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color('#fff4d6') }, uBurn: { value: 1 },
      },
      vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    quad.frustumCulled = false;
    this.postScene.add(quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._onResize = () => {
      const s = r.getDrawingBufferSize(new THREE.Vector2());
      this.aspect = s.x / Math.max(1, s.y);
      this.rt.setSize(s.x, s.y);
      this.post.uniforms.uRes.value.copy(s);
      this._applyCamera();
    };
    window.addEventListener('resize', this._onResize);
  }

  _setupDOM() {
    const el = document.createElement('div');
    el.id = 'lk-cine';
    el.className = 'lk-cine';
    el.innerHTML = `
      <div class="lk-cine__bar lk-cine__bar--top"><span class="lk-cine__kicker"><i></i>Prólogo · Crónicas de Lunacia</span>
        <button type="button" class="lk-cine__skip" data-ref="skip">Saltar <kbd>Esc</kbd>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg></button></div>
      <div class="lk-cine__sub" aria-live="polite"><small data-ref="who">${NARRATOR}</small><p data-ref="sub"></p></div>
      <div class="lk-cine__bar lk-cine__bar--bot"><span class="lk-cine__prog"><i data-ref="prog"></i></span></div>`;
    document.body.appendChild(el);
    this.dom = el;
    this.subEl = el.querySelector('[data-ref="sub"]');
    this.whoEl = el.querySelector('[data-ref="who"]');
    this.progEl = el.querySelector('[data-ref="prog"]');
    el.querySelector('[data-ref="skip"]').addEventListener('click', () => this.skip());
    this._onKey = (e) => {
      if (!this.running) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.skip(); return; }
      e.stopImmediatePropagation(); // el mundo no recibe teclas durante la cinemática
    };
    window.addEventListener('keydown', this._onKey, true);
    requestAnimationFrame(() => el.classList.add('lk-is-on'));
  }

  _setSub(text, { big = false, who = NARRATOR } = {}) {
    if (this._subText === text) return;
    this._subText = text;
    const el = this.subEl.parentElement;
    el.classList.remove('lk-is-on');
    clearTimeout(this._subT);
    if (!text) return;
    this._subT = setTimeout(() => {
      this.subEl.textContent = text;
      this.whoEl.textContent = who || '';
      el.classList.toggle('lk-is-big', big);
      el.classList.add('lk-is-on');
    }, 180);
  }

  skip() {
    if (!this.running || this._skipping) return;
    this._skipping = true;
    this._finish(true);
  }

  _finish(skipped) {
    const fadeMs = skipped ? 450 : 900;
    const start = performance.now();
    const from = this.post.uniforms.uFade.value;
    this.post.uniforms.uFadeCol.value.set('#000');
    this.audio?.music?.stop?.(skipped ? 500 : 1400);
    this._ending = () => {
      const k = Math.min(1, (performance.now() - start) / fadeMs);
      this.post.uniforms.uFade.value = lerp(from, 1, k);
      return k >= 1;
    };
    this._finishSkipped = skipped;
  }

  _cleanup() {
    this.running = false;
    window.removeEventListener('keydown', this._onKey, true);
    window.removeEventListener('resize', this._onResize);
    this._disposeShot();
    const r = this.renderer;
    r.setRenderTarget(null);
    r.toneMapping = this._saved.toneMapping; r.toneMappingExposure = this._saved.exposure; r.autoClear = this._saved.autoClear;
    r.setClearColor(this._saved.clearColor, this._saved.clearAlpha);
    this.rt?.dispose(); this.post?.dispose();
    this._disposables.forEach((d) => d.dispose?.());
    this._disposables = [];
    if (this.dom) {
      this.dom.classList.remove('lk-is-on');
      const d = this.dom; setTimeout(() => d.remove(), 600);
    }
    if (window.lunakaiCinematic === this) delete window.lunakaiCinematic;
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const dt = Math.min(0.25, (now - this._last) / 1000) * this.speed; // con pocos FPS no se queda atrás de la música
    this._last = now;
    if (!this._ending) this.time += dt;
    if (!this._ending && this.time >= TOTAL) this._finish(false);
    this._update(dt);
    const done = this._ending ? this._ending() : false;
    this._render();
    if (done) {
      const skipped = this._finishSkipped;
      this._cleanup();
      this._resolve?.({ skipped });
    }
  }

  _render() {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  // ================================================================ plano actual
  _update(dt) {
    const t = Math.min(this.time, TOTAL - 0.001);
    const idx = SHOTS.findIndex((s) => t >= s.t0 && t < s.t1);
    if (idx !== this._shotIdx && idx >= 0) {
      this._disposeShot();
      this._shotIdx = idx;
      this._shot = SHOTS[idx];
      this._shotState = {};
      this._shotGroup = new THREE.Group();
      this.scene.add(this._shotGroup);
      this.cam = { x: 0, y: 0, zoom: 1, shake: 0 };
      this[`_build_${this._shot.id}`]?.(this._shotGroup, this._shotState);
    }
    const s = this._shot;
    if (!s) return;
    const lt = t - s.t0, len = s.t1 - s.t0;
    // fundido entre planos (a negro tostado; el final lo gestiona él mismo)
    const fadeIn = s.id === 'stars' ? smooth(0, 1.6, lt) : smooth(0, 0.7, lt);
    const fadeOut = s.id === 'finale' ? 1 : 1 - smooth(len - 0.6, len, lt);
    const U = this.post.uniforms;
    if (!this._ending) U.uFade.value = 1 - Math.min(fadeIn, fadeOut);
    U.uFadeCol.value.set(s.id === 'chimeras' || s.id === 'crack' || s.id === 'resist' ? '#0c0202' : '#120b05');
    U.uTime.value = this.time;
    U.uFlash.value = Math.max(0, U.uFlash.value - dt * 2.2);
    this[`_upd_${s.id}`]?.(lt, len, dt, this._shotState);
    // subtítulo del plano
    if (s.sub) this._setSub(lt > 0.5 && lt < len - 0.45 ? s.sub : null);
    // mezcladores de animación
    (this._shotState.mixers || []).forEach((m) => m.update(dt));
    this._applyCamera();
    if (this.progEl) this.progEl.style.width = `${(t / TOTAL) * 100}%`;
  }

  _applyCamera() {
    if (!this.camera) return;
    const W = VIEW_H * this.aspect;
    const c = this.cam || { x: 0, y: 0, zoom: 1, shake: 0 };
    Object.assign(this.camera, { left: -W / 2, right: W / 2, top: VIEW_H / 2, bottom: -VIEW_H / 2 });
    const sh = c.shake || 0;
    const tt = this.time * 37;
    this.camera.position.x = c.x + (Math.sin(tt * 1.3) + Math.sin(tt * 2.9)) * 0.06 * sh;
    this.camera.position.y = c.y + (Math.cos(tt * 1.7) + Math.sin(tt * 3.3)) * 0.06 * sh;
    this.camera.zoom = c.zoom;
    this.camera.updateProjectionMatrix();
  }

  _disposeShot() {
    if (!this._shotGroup) return;
    this.scene.remove(this._shotGroup);
    this._shotGroup.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { if (!m.userData.shared) m.dispose(); });
    });
    (this._shotState?.mixers || []).forEach((m) => m.stopAllAction());
    this._shotGroup = null;
  }

  // ================================================================ utilidades de escena
  get W() { return VIEW_H * this.aspect; }

  _bg(group, stops, { z = -60, radial = false, w = null, h = null } = {}) {
    const tex = this._tex(gradientCanvas(stops, 16, 512, radial));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w || this.W * 2.4, h || VIEW_H * 2.4), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false }));
    m.position.z = z;
    group.add(m);
    return m;
  }

  _plane(group, tex, w, h, { x = 0, y = 0, z = 0, opacity = 1, additive = false, color = null, anchorBottom = false } = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (anchorBottom) g.translate(0, h / 2, 0);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, color: color ? new THREE.Color(color) : 0xffffff,
    });
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  _sprite(group, tex, size, { x = 0, y = 0, z = 5, opacity = 1, color = null, additive = true } = {}) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, depthWrite: false, depthTest: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, color: color ? new THREE.Color(color) : 0xffffff });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    group.add(s);
    return s;
  }

  /** Segmento de luz (quad) de a → b que se puede «dibujar» con setProgress(0–1). */
  _stroke(group, a, b, width, color, z = 2, additive = true) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const g = new THREE.PlaneGeometry(1, 1); g.translate(0.5, 0, 0);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const m = new THREE.Mesh(g, mat);
    m.position.set(a[0], a[1], z);
    m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
    m.scale.set(0.0001, width, 1);
    m.userData.len = len;
    m.userData.setProgress = (p) => { m.scale.x = Math.max(0.0001, len * clamp01(p)); m.visible = p > 0.001; };
    group.add(m);
    return m;
  }

  /**
   * Silueta de un modelo GLB: clon con material de tinta, altura fijada, de perfil (mirando a la derecha o izquierda).
   * Devuelve { root, mats, mixer, play(name) }.
   */
  _silhouette(group, key, { height = 2, x = 0, y = 0, z = 0, face = 1, ink = '#1a0f08', anim = null, src = null, clips = null } = {}) {
    const gl = src ? null : this.gltf[key];
    const source = src || gl?.scene;
    if (!source) return null;
    const obj = safeClone(source);
    obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.scale.set(1, 1, 1);
    const mats = [];
    obj.traverse((o) => {
      if (o.isMesh) {
        if (!o.visible) return;
        const m = inkMaterial(ink);
        mats.push(m);
        o.material = m;
        o.castShadow = false; o.receiveShadow = false;
        o.frustumCulled = false;
      }
      // contornos (inverted hull) y ayudantes del juego: fuera
      if (o.userData?.isToonOutline || /outline/i.test(o.name || '')) o.visible = false;
    });
    const holder = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.add(obj);
    holder.add(pivot);
    pivot.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const hgt = Math.max(0.01, box.max.y - box.min.y);
    const s = height / hgt;
    pivot.scale.setScalar(s);
    holder.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    pivot.position.y -= box2.min.y;
    pivot.position.x -= (box2.min.x + box2.max.x) / 2;
    holder.position.set(x, y, z);
    group.add(holder);
    const allClips = clips || gl?.animations || [];
    let mixer = null;
    const play = (name) => {
      if (!allClips.length) return;
      mixer ||= new THREE.AnimationMixer(obj);
      const clip = allClips.find((c) => c.name.toLowerCase() === String(name).toLowerCase())
        || allClips.find((c) => c.name.toLowerCase().includes(String(name).toLowerCase())) || allClips[0];
      mixer.stopAllAction();
      mixer.clipAction(clip).reset().play();
      if (!this._shotState.mixers) this._shotState.mixers = [];
      if (!this._shotState.mixers.includes(mixer)) this._shotState.mixers.push(mixer);
    };
    if (anim) play(anim);
    const res = { root: holder, pivot, obj, mats, height, play, get mixer() { return mixer; } };
    res.setRim = (v, col) => mats.forEach((m) => { m.uniforms.uRimAmt.value = v; if (col) m.uniforms.uRim.value.set(col); });
    res.setInk = (col) => mats.forEach((m) => m.uniforms.uInk.value.set(col));
    res.setOpacity = (v) => mats.forEach((m) => { m.uniforms.uOpacity.value = v; m.transparent = v < 0.999; });
    return res;
  }

  _points(group, n, { seed = 1, w = this.W * 1.3, h = VIEW_H * 1.2, size = 4, color = '#ffe2a0', tex = null, opacity = 1, z = -5 } = {}) {
    const r = rng(seed), pos = new Float32Array(n * 3), base = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r() - 0.5) * w; pos[i * 3 + 1] = (r() - 0.5) * h; pos[i * 3 + 2] = z;
      base.push({ x: pos[i * 3], y: pos[i * 3 + 1], ph: r() * 6.28, sp: 0.5 + r() });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, map: tex || this.textures.glow, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(g, m);
    p.userData.base = base;
    group.add(p);
    return p;
  }

  _music(key, opts = {}) {
    const mm = this.audio?.music;
    if (!mm || typeof mm.playTrack !== 'function') return;
    mm.playTrack(key, { loop: false, fadeDuration: 900, volumeMultiplier: 0.95, ...opts });
  }

  _sfx(name) { try { this.audio?.[name]?.(); } catch { /* nada */ } }

  // ================================================================ 1 · Constelaciones
  _build_stars(g, S) {
    this._bg(g, [[0, '#2c1c10'], [0.55, '#5a3e22'], [1, '#7a5732']]);
    S.dust = this._points(g, 220, { seed: 4, size: 3, color: '#ffe7b0', opacity: 0.85 });
    S.big = this._points(g, 40, { seed: 9, size: 7, color: '#fff0c8', tex: this.textures.sparkle, opacity: 0.9, z: -4 });
    S.cons = CONSTELLATIONS.map((c, i) => {
      const place = [[-5.6, 1.3, 1.55], [0.2, -0.6, 1.95], [5.7, 1.5, 1.5]][i];
      const P = c.pts.map(([px, py]) => [place[0] + px * place[2], place[1] + py * place[2]]);
      const edges = c.edges.map(([a, b]) => this._stroke(g, P[a], P[b], 0.05, '#f6d48a', 2));
      const nodes = P.map((p, k) => this._sprite(g, this.textures.sparkle, c.big.includes(k) ? 0.75 : 0.42, { x: p[0], y: p[1], z: 3, opacity: 0, color: '#fff2cf' }));
      const halo = this._sprite(g, this.textures.glowGold, place[2] * 3.4, { x: place[0], y: place[1] + 0.2, z: -2, opacity: 0 });
      return { edges, nodes, halo, start: 1.0 + i * 2.3 };
    });
  }

  _upd_stars(lt, len, dt, S) {
    this.cam.zoom = lerp(1.0, 1.12, easeInOut(lt / len));
    this.cam.y = lerp(-0.3, 0.2, lt / len);
    this.post.uniforms.uPaper.value = 0.75;
    S.big.material.opacity = 0.6 + Math.sin(lt * 2.0) * 0.3;
    S.cons.forEach((c) => {
      const k = (lt - c.start) / 2.6;
      const n = c.edges.length;
      c.edges.forEach((e, i) => e.userData.setProgress(k * n - i));
      c.nodes.forEach((s, i) => { s.material.opacity = clamp01(k * n - i * (n / c.nodes.length) + 0.3) * (0.75 + Math.sin(lt * 3 + i) * 0.25); });
      c.halo.material.opacity = smooth(0.7, 1.2, k) * 0.35;
    });
  }

  // ================================================================ 2 · Luna y Gran Árbol
  _build_moon(g, S) {
    this._bg(g, [[0, '#3d2814'], [0.5, '#8d6537'], [1, '#d9b277']]);
    this._points(g, 120, { seed: 12, size: 3, color: '#ffeccc', opacity: 0.5 });
    S.rays = this._plane(g, this.textures.rays, 18, 18, { x: 3.2, y: 2.2, z: -40, opacity: 0, additive: true });
    S.halo = this._sprite(g, this.textures.glowGold, 9, { x: 3.2, y: 2.2, z: -39, opacity: 0.0 });
    S.moon = this._plane(g, this.textures.moon, 5, 5, { x: 3.2, y: -2, z: -38 });
    S.isl = this._plane(g, this.textures.islands, 36, 4.5, { x: 0, y: -1.2, z: -30, opacity: 0.35 });
    S.tree = this._plane(g, this.textures.tree, 10.5, 10.5, { x: -3.2, y: -6.2, z: -10, anchorBottom: true });
  }

  _upd_moon(lt, len, dt, S) {
    const k = easeOut(lt / (len * 0.75));
    S.moon.position.y = lerp(-2.2, 2.3, k);
    S.halo.position.y = S.moon.position.y; S.rays.position.y = S.moon.position.y;
    S.halo.material.opacity = 0.65 * k;
    S.rays.material.opacity = 0.18 * k;
    S.rays.rotation.z = lt * 0.04;
    S.isl.position.x = -lt * 0.25;
    this.cam.zoom = lerp(1.05, 1.0, easeInOut(lt / len));
    this.cam.x = lerp(-0.4, 0.4, lt / len);
    this.post.uniforms.uPaper.value = 0.9;
  }

  // ================================================================ 3 · Friso: Sapidae y Axies
  _build_frieze(g, S) {
    this._bg(g, [[0, '#1d130b'], [1, '#2e1f12']]);
    const FH = 7.6, FW = FH * (4096 / 768);
    S.frieze = this._plane(g, this.textures.frieze, FW, FH, { z: -20 });
    const ground = FH / 2 - 0.76 * FH;
    const pairs = [
      ['sapF', 'axieA'], ['sapM', 'axieB'], ['sapF', 'axieC'], ['sapM', 'axieA'], ['sapF', 'axieB'],
    ];
    S.pairs = pairs.map(([sap, ax], i) => {
      const x = -15 + i * 7.5;
      const face = i % 2 === 0 ? 1 : -1;
      const ink = '#4a2f17';
      const a = this._silhouette(g, sap, { height: 4.0, x: x - face * 0.9, y: ground, face, ink, anim: 'idle' });
      const b = this._silhouette(g, ax, { height: 1.9, x: x + face * 0.9, y: ground, face: -face, ink, anim: 'idle' });
      // Vínculo: un corazón pequeño dorado en el pecho del Sapidae y otro en el del Axie (antes, un hilo entre los dos)
      const hearts = [
        this._sprite(g, this.textures.heart, 0.62, { x: x - face * 0.9, y: ground + 1.6, z: 2, opacity: 0 }),
        this._sprite(g, this.textures.heart, 0.5, { x: x + face * 0.9, y: ground + 0.5, z: 2, opacity: 0 }),
      ];
      // Anclas del esqueleto: el corazón sigue el pecho real de cada modelo (y su animación)
      const bone = (sil, re) => { let f = null; sil?.obj.traverse((o) => { if (!f && o.isBone && re.test(o.name)) f = o; }); return f; };
      const anc = {
        chest: bone(a, /^chest$/i) || bone(a, /spine/i),
        spine: bone(b, /^Spine01_JNT$/i) || bone(b, /spine/i),
        head: bone(b, /^Head_JNT$/i) || bone(b, /head/i),
      };
      return { x, a, b, hearts, anc, face, ph: i * 0.9 };
    });
    S.FW = FW;
    S.tmpA = new THREE.Vector3(); S.tmpB = new THREE.Vector3();
  }

  _upd_frieze(lt, len, dt, S) {
    const span = S.FW / 2 - this.W / 2 - 0.5;
    this.cam.x = lerp(-span, span, easeInOut(lt / len));
    this.cam.zoom = 1.0;
    this.post.uniforms.uPaper.value = 0.85;
    S.pairs.forEach((p) => {
      const near = 1 - smooth(1.5, 5.5, Math.abs(this.cam.x - p.x));
      // latido: dos golpes rápidos y una pausa, más vivo cuanto más cerca está la cámara
      const beat = Math.max(0, Math.sin(lt * 7 + p.ph)) ** 6;
      this._placeHearts(p, S);
      p.hearts.forEach((h, k) => {
        h.material.opacity = 0.35 + near * 0.65;
        const base = k === 0 ? 0.62 : 0.5;
        h.scale.setScalar(base * (1 + beat * 0.18 * (0.4 + near)));
      });
      [p.a, p.b].forEach((s) => s && s.setRim(near * 0.4, '#ffd889'));
    });
  }

  /** Coloca los dos corazones de una pareja sobre el pecho de cada modelo (hueso del pecho del Sapidae;
   *  en el Axie, entre el tronco y la cabeza, hacia delante). Sin huesos, se quedan donde se crearon. */
  _placeHearts(p, S) {
    const parent = p.hearts[0].parent;
    if (!parent) return;
    const { chest, spine, head } = p.anc || {};
    if (chest) {
      const v = chest.getWorldPosition(S.tmpA); parent.worldToLocal(v);
      p.hearts[0].position.set(v.x + p.face * HEART_FWD_SAP, v.y + HEART_UP_SAP, p.hearts[0].position.z);
    }
    if (spine && head) {
      const v = spine.getWorldPosition(S.tmpA); parent.worldToLocal(v);
      const w = head.getWorldPosition(S.tmpB); parent.worldToLocal(w);
      v.lerp(w, HEART_MIX_AXIE);
      p.hearts[1].position.set(v.x - p.face * HEART_FWD_AXIE, v.y + HEART_UP_AXIE, p.hearts[1].position.z);
    }
  }

  // ================================================================ 4 · Llegan las quimeras (rojo)
  _build_chimeras(g, S) {
    this._bg(g, [[0, '#2a0503'], [0.55, '#86170f'], [1, '#c43a1f']]);
    S.sun = this._plane(g, this.textures.glowRed, 12, 12, { x: -2, y: 1.2, z: -40, opacity: 0.55, additive: true });
    S.disc = this._plane(g, this.textures.moon, 4.6, 4.6, { x: -2, y: 1.2, z: -39, color: '#ff8a5c', opacity: 0.35 });
    S.isl = this._plane(g, this.textures.hills, 44, 11, { x: 0, y: -3.6 + 11 * 0.12, z: -10 });
    const ground = -3.6;
    const list = [
      ['wolf', 1.9, 0], ['slime', 1.3, 1.6], ['dryad', 3.0, 2.8], ['wolf', 1.7, 4.6], ['lord', 4.6, 6.0],
      ['slime', 1.2, 8.0], ['wolf', 2.0, 9.2], ['dryad', 2.8, 10.6], ['slime', 1.4, 12.0],
    ];
    S.mobs = list.map(([k, h, off], i) => {
      const s = this._silhouette(g, k, { height: h, x: 7 + off * 1.5, y: ground, z: i * 0.01, face: -1, ink: '#0d0303' });
      return s && { s, sp: 1.6 + (i % 3) * 0.25, ph: i * 1.3, hop: k === 'slime' ? 0.35 : k === 'wolf' ? 0.12 : 0.06 };
    }).filter(Boolean);
    S.smoke = [];
    const r = rng(31);
    for (let i = 0; i < 14; i++) S.smoke.push(this._plane(g, this.textures.smoke, 4 + r() * 4, 2 + r() * 2, { x: 6 + r() * 16, y: -3.9 + r() * 0.8, z: -1 - i * 0.01, opacity: 0.5 }));
    S.embers = this._points(g, 140, { seed: 77, size: 3.5, color: '#ff9a52', opacity: 0.9, z: 2 });
  }

  _upd_chimeras(lt, len, dt, S) {
    this.post.uniforms.uPaper.value = 0.7;
    this.cam.zoom = lerp(1.0, 1.08, lt / len);
    this.cam.shake = 0.25 + smooth(3, len, lt) * 0.5;
    S.mobs.forEach((m) => {
      m.s.root.position.x -= m.sp * dt;
      const b = Math.abs(Math.sin(lt * 4.2 + m.ph));
      m.s.pivot.position.y = b * m.hop;
      m.s.pivot.scale.y = m.s.pivot.scale.x * (1 + (m.hop > 0.2 ? (b - 0.5) * 0.12 : 0));
      m.s.root.rotation.z = Math.sin(lt * 4.2 + m.ph) * 0.04;
    });
    S.smoke.forEach((sm, i) => { sm.position.x -= (0.6 + (i % 4) * 0.2) * dt; sm.material.opacity = 0.4 + Math.sin(lt + i) * 0.12; });
    const p = S.embers.geometry.attributes.position;
    S.embers.userData.base.forEach((b, i) => {
      const y = ((b.y + 6 + lt * (0.6 + b.sp * 0.6)) % 12) - 6;
      p.setXYZ(i, b.x + Math.sin(lt * b.sp + b.ph) * 0.3, y, 2);
    });
    p.needsUpdate = true;
  }

  // ================================================================ 5 · La luna se rompe
  _build_crack(g, S) {
    this._bg(g, [[0, '#0a0202'], [0.6, '#3a0a07'], [1, '#6e160d']]);
    this._points(g, 90, { seed: 41, size: 3, color: '#ffcfb0', opacity: 0.4 });
    S.R = 3.1; S.c = [0, 1.25];
    S.halo = this._sprite(g, this.textures.glowRed, 10, { x: S.c[0], y: S.c[1], z: -31, opacity: 0.6 });
    S.moon = this._plane(g, this.textures.moon, S.R * 2, S.R * 2, { x: S.c[0], y: S.c[1], z: -30, color: '#ffd9c2' });
    S.isl = this._plane(g, this.textures.islandsDark, 40, 10, { y: -4.6, z: -5 });
    S.cracks = [];
    // Solo se agrieta (y se desprende) el trozo de abajo a la derecha: la luna queda como media luna
    const B = MOON_BITE;
    const P0 = (q) => [S.c[0] + (q[0] - 0.5) * S.R * 2, S.c[1] - (q[1] - 0.5) * S.R * 2];
    S.bite = P0([B.x, B.y]);
    crackPaths(21, 9, { from: [B.x - 0.05, B.y - 0.04], within: B }).forEach((path, pi) => {
      for (let k = 0; k < path.length - 1; k++) {
        const P = (q) => [S.c[0] + (q[0] - 0.5) * S.R * 2, S.c[1] - (q[1] - 0.5) * S.R * 2];
        const st = this._stroke(g, P(path[k]), P(path[k + 1]), 0.07, '#c8f6ff', -29);
        st.userData.order = pi * 0.15 + k * 0.4;
        S.cracks.push(st);
      }
    });
    S.coreGlow = this._sprite(g, this.textures.glowCyan, 2, { x: S.bite[0] - 0.25, y: S.bite[1] + 0.2, z: -28, opacity: 0 });
    // esquirlas
    const r = rng(55);
    S.shards = [];
    for (let i = 0; i < 16; i++) {
      const shape = new THREE.Shape();
      const sz = 0.25 + r() * 0.45;
      shape.moveTo(0, sz); shape.lineTo(sz * 0.5, -sz * 0.2); shape.lineTo(0, -sz); shape.lineTo(-sz * 0.45, 0); shape.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#dffaff', transparent: true, opacity: 0, depthWrite: false }));
      // Las esquirlas salen del trozo roto, sobre todo hacia fuera de la luna (abajo a la derecha)
      const out = Math.atan2(S.bite[1] - S.c[1], S.bite[0] - S.c[0]);
      const a = out + (r() - 0.5) * 2.6;
      const d = r() * B.r * S.R * 1.4;
      m.position.set(S.bite[0] + Math.cos(a) * d, S.bite[1] + Math.sin(a) * d, -27);
      m.userData = { vx: Math.cos(a) * (2 + r() * 2.5), vy: Math.sin(a) * (1.5 + r() * 2) + 1.2, vr: (r() - 0.5) * 6 };
      const trail = this._sprite(g, this.textures.glowCyan, 0.9, { opacity: 0 });
      g.add(m);
      S.shards.push({ m, trail });
    }
    S.lands = [];
  }

  _upd_crack(lt, len, dt, S) {
    this.post.uniforms.uPaper.value = 0.6;
    const BREAK = 4.4;
    this.cam.shake = smooth(0.8, BREAK, lt) * 1.2 + (lt > BREAK ? Math.max(0, 1.6 - (lt - BREAK) * 0.9) : 0);
    this.cam.zoom = lt < BREAK ? lerp(1.0, 1.18, easeInOut(lt / BREAK)) : lerp(1.18, 0.95, easeOut((lt - BREAK) / 2));
    this.cam.y = lt < BREAK ? lerp(0, 0.8, easeInOut(lt / BREAK)) : lerp(0.8, -0.2, easeOut((lt - BREAK) / 2.5));
    S.cracks.forEach((c) => {
      c.userData.setProgress((lt - 0.8 - c.userData.order * 0.75) / 0.35);
      c.material.opacity = lt > BREAK ? Math.max(0, 1 - (lt - BREAK) * 4) : 1;
    });
    S.coreGlow.material.opacity = smooth(1.2, BREAK, lt) * 0.9;
    S.coreGlow.scale.setScalar(lerp(1.5, 5, smooth(1.2, BREAK, lt)));
    if (lt >= BREAK && !S.broke) {
      S.broke = true;
      this.post.uniforms.uFlash.value = 1.4;
      this.post.uniforms.uFlashCol.value.set('#dff8ff');
      // El trozo se desprende y queda la media luna (antes desaparecía la luna entera)
      S.moon.material.map = this.textures.moonBroken; S.moon.material.needsUpdate = true;
      S.coreGlow.visible = false;
      S.halo.material.opacity = 0.25;
      this._sfx('playExplosion'); this._sfx('playHitStopBass');
    }
    if (S.broke) {
      S.shards.forEach(({ m, trail }) => {
        const u = m.userData;
        u.vy -= 4.2 * dt;
        m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.rotation.z += u.vr * dt;
        m.material.opacity = 1;
        trail.position.set(m.position.x, m.position.y, -26);
        trail.material.opacity = 0.9;
        if (m.position.y < -3.6 && !u.landed) {
          u.landed = true; u.vx = 0; u.vy = 0; u.vr = 0;
          const flash = this._sprite(this._shotGroup, this.textures.glowCyan, 1.2, { x: m.position.x, y: -3.6, opacity: 1 });
          S.lands.push({ s: flash, t: lt });
        }
        if (u.landed) { m.position.y = -3.6; trail.material.opacity = 0.5 + Math.sin(lt * 6) * 0.2; }
      });
      S.lands.forEach((l) => { const k = lt - l.t; l.s.scale.setScalar(1.2 + k * 0.8); l.s.material.opacity = Math.max(0.3, 0.9 - k * 0.8); });
    }
  }

  // ================================================================ 6 · Resistencia
  _build_resist(g, S) {
    this._bg(g, [[0, '#1c0705'], [0.6, '#7a2412'], [1, '#d0642c']]);
    S.isl = this._plane(g, this.textures.hills, 44, 11, { y: -3.4 + 11 * 0.12, z: -8 });
    const ground = -3.4;
    S.totems = [-6.2, -0.4, 5.4].map((x, i) => {
      const t = this._plane(g, this.textures.totem, 1.6, 4.8, { x, y: ground - 0.4, z: -6, anchorBottom: true });
      const top = [x, ground + 3.65];
      const beam = this._plane(g, this.textures.glowCyan, 1.6, 9, { x, y: top[1] + 3.2, z: -7, opacity: 0, additive: true });
      const gem = this._sprite(g, this.textures.glowCyan, 1.9, { x: top[0], y: top[1], z: -5, opacity: 0.9 });
      const ring = this._plane(g, this.textures.ringCyan, 1, 1, { x: top[0], y: top[1], z: -4, opacity: 0, additive: true });
      return { t, beam, gem, ring, top, ph: i * 0.8 };
    });
    S.heroes = [
      this._silhouette(g, 'sapF', { height: 2.9, x: -7.6, y: ground, face: 1, ink: '#140906', anim: 'idle' }),
      this._silhouette(g, 'axieA', { height: 1.4, x: -6.0, y: ground, face: 1, ink: '#140906', anim: 'idle' }),
      this._silhouette(g, 'sapM', { height: 3.1, x: -2.2, y: ground, face: 1, ink: '#140906', anim: 'idle' }),
      this._silhouette(g, 'axieB', { height: 1.5, x: -0.9, y: ground, face: 1, ink: '#140906', anim: 'idle' }),
    ].filter(Boolean);
    S.mobs = [['wolf', 1.4, 3.2], ['dryad', 2.3, 5.2], ['slime', 1.0, 7.0], ['wolf', 1.3, 8.6]].map(([k, h, x]) => this._silhouette(g, k, { height: h, x, y: ground, face: -1, ink: '#0a0303' })).filter(Boolean);
    S.embers = this._points(g, 90, { seed: 91, size: 3, color: '#9ef0ff', opacity: 0.8, z: 2 });
  }

  _upd_resist(lt, len, dt, S) {
    this.post.uniforms.uPaper.value = 0.72;
    this.cam.zoom = lerp(1.02, 1.1, easeInOut(lt / len));
    this.cam.x = lerp(-0.6, 0.6, lt / len);
    S.totems.forEach((t, i) => {
      const on = smooth(0.6 + i * 0.5, 1.6 + i * 0.5, lt);
      t.beam.material.opacity = on * (0.35 + Math.sin(lt * 3 + t.ph) * 0.08);
      t.gem.scale.setScalar(1.6 + on * 0.9 + Math.sin(lt * 5 + t.ph) * 0.15);
      const w = ((lt * 0.55 + t.ph * 0.3) % 1);
      t.ring.scale.setScalar(on * (1 + w * 5));
      t.ring.material.opacity = on * (1 - w) * 0.35;
    });
    const push = smooth(1.5, len, lt);
    S.mobs.forEach((m, i) => {
      m.root.position.x += (0.25 + push * 1.4) * dt;
      m.pivot.position.y = Math.abs(Math.sin(lt * 5 + i)) * 0.1;
      m.root.rotation.z = -push * 0.12;
      m.setOpacity(1 - smooth(len - 2.2, len - 0.4, lt) * 0.0);
    });
    S.heroes.forEach((h) => h.setRim(smooth(1, 3, lt) * 0.22, '#9ef0ff'));
    const p = S.embers.geometry.attributes.position;
    S.embers.userData.base.forEach((b, i) => p.setXYZ(i, b.x + Math.sin(lt * b.sp + b.ph) * 0.4, ((b.y + 6 + lt * (0.4 + b.sp * 0.5)) % 12) - 6, 2));
    p.needsUpdate = true;
  }

  // ================================================================ 7 · Final épico
  _build_finale(g, S) {
    S.bgRed = this._bg(g, [[0, '#030101'], [0.55, '#2c0605'], [1, '#6a110a']]);
    S.bgGold = this._bg(g, [[0, '#2b1604'], [0.5, '#a3661c'], [1, '#ffd88a']], { z: -59 });
    S.bgGold.material.transparent = true; S.bgGold.material.opacity = 0;
    S.glowRed = this._sprite(g, this.textures.glowRed, 16, { x: 3, y: 2.5, z: -45, opacity: 0.0 });
    S.rays = this._plane(g, this.textures.raysGold, 26, 26, { x: -4, y: -1.6, z: -40, opacity: 0, additive: true });
    S.ground = this._plane(g, this.textures.hills, 48, 12, { y: -3.9 + 12 * 0.12, z: -2 });
    // el Señor de las Quimeras
    S.lord = this._silhouette(g, 'lord', { height: 13, x: 0, y: 0, z: -20, face: -1, ink: '#050101' });
    S.lord.root.updateMatrixWorld(true);
    S.lordBox = new THREE.Box3().setFromObject(S.lord.obj); // relativo a la raíz (que está en 0, 0)
    S.eyeK = { fx: 0.22, fy: 0.29, gap: 0.8 };
    // ojos: se colocan sobre la cabeza del modelo (se recalculan cada fotograma)
    S.eyeL = this._sprite(g, this.textures.glowRed, 1.1, { z: 4, opacity: 0 });
    S.eyeR = this._sprite(g, this.textures.glowRed, 0.9, { z: 4, opacity: 0 });
    // el Sapidae del jugador y su Axie (modelos reales de la partida; si no, los genéricos)
    const ground = -3.9;
    const p = this.player;
    const clips = p?.actions ? Object.values(p.actions).filter(Boolean).map((a) => a.getClip?.()).filter(Boolean) : null;
    S.hero = (p?.mesh && this._silhouette(g, null, { src: p.mesh, clips, height: 3.6, x: -13, y: ground, face: 1, ink: '#0a0403', anim: 'walk' }))
      || this._silhouette(g, 'sapF', { height: 3.6, x: -13, y: ground, face: 1, ink: '#0a0403', anim: 'walk' });
    let comp = null;
    try { if (p?.companionMesh) comp = this._silhouette(g, null, { src: p.companionMesh, height: 1.9, x: -14.8, y: ground, face: 1, ink: '#0a0403' }); } catch (e) { console.warn('[Cinemática] Compañero', e); }
    S.comp = comp || this._silhouette(g, 'axieA', { height: 1.9, x: -14.8, y: ground, face: 1, ink: '#0a0403', anim: 'walk' });
    S.hand = this._sprite(g, this.textures.sparkle, 0.2, { z: 6, opacity: 0, additive: true });
    S.handGlow = this._sprite(g, this.textures.glowGold, 1, { z: 5, opacity: 0 });
    S.wave = this._plane(g, this.textures.ring, 1, 1, { z: 6, opacity: 0, additive: true });
    S.wave2 = this._plane(g, this.textures.ring, 1, 1, { z: 6, opacity: 0, additive: true });
    S.motes = this._points(g, 160, { seed: 121, size: 4, color: '#ffd88a', opacity: 0, z: 3 });
    // logo
    if (this.textures.logo) {
      const img = this.textures.logo.image, w = 9.6, h = w * (img.height / img.width);
      S.logo = this._plane(g, this.textures.logo, w, h, { y: 1.5, z: 20, opacity: 0 });
      S.logoGlow = this._sprite(g, this.textures.glowGold, 14, { y: 1.5, z: 19, opacity: 0 });
    }
    S.dust = this._points(g, 120, { seed: 7, size: 6, color: '#f2d29a', opacity: 0, z: 21, tex: this.textures.smoke });
    S._head = new THREE.Vector3();
  }

  _upd_finale(lt, len, dt, S) {
    const U = this.post.uniforms;
    const IGNITE = 9.2, SLAM = 11.6;
    // música: el clímax entra con la sombra
    if (!S.music && lt > 0.2) { S.music = true; this._music('BATTLE_BOSS', { startAt: 10.5, fadeDuration: 1500, volumeMultiplier: 1.0 }); }
    // subtítulos
    const sub = FINALE_SUBS.find((s) => lt >= s.a && lt < s.b);
    this._setSub(sub ? sub.text : null, { big: Boolean(sub?.big), who: sub?.big ? (this.playerName || 'Sapidae') : NARRATOR });

    // a · se alza el Señor de las Quimeras
    const rise = easeOut((lt - 0.3) / 3.6);
    const recoil = smooth(IGNITE, IGNITE + 1.2, lt);
    S.lord.root.position.y = lerp(-18, -9.2, rise) - recoil * 0.6;
    S.lord.root.position.x = 3.4 + recoil * 1.6;
    S.lord.root.rotation.z = -recoil * 0.06;
    S.glowRed.material.opacity = 0.55 * rise * (1 - recoil * 0.8);
    S.lord.root.updateMatrixWorld(true);
    // ojos: un poco por debajo de la parte más alta del modelo
    const top = S.lord.root.position.y + S.lord.height;
    const E = S.eyeK, B = S.lordBox;
    const ex = S.lord.root.position.x + B.min.x + (B.max.x - B.min.x) * E.fx, ey = S.lord.root.position.y + B.max.y - (B.max.y - B.min.y) * E.fy;
    S.eyeL.position.set(ex, ey, 4);
    S.eyeR.position.set(ex + E.gap, ey + 0.05, 4);
    const eyes = smooth(2.2, 3.2, lt) * (1 - recoil * 0.85) * (0.85 + Math.sin(lt * 9) * 0.15);
    S.eyeL.material.opacity = eyes; S.eyeR.material.opacity = eyes;
    if (!S.roar && lt > 2.4) { S.roar = true; this._sfx('playHitStopBass'); }
    this.cam.shake = (lt < 4.2 ? smooth(0.3, 1.2, lt) * 1.1 * (1 - smooth(3.6, 4.4, lt)) : 0) + Math.max(0, 1.6 - Math.abs(lt - IGNITE) * 2.2) + (lt > SLAM ? Math.max(0, 2.2 - (lt - SLAM) * 3.2) : 0);

    // b · llega el héroe con su Axie
    const walk = easeOut((lt - 4.4) / 4.0);
    S.hero.root.position.x = lerp(-13, -5.2, walk);
    S.comp.root.position.x = lerp(-14.8, -7.0, walk);
    S.comp.pivot.position.y = walk < 1 && lt > 4.4 ? Math.abs(Math.sin(lt * 9)) * 0.18 : 0;
    if (lt > 8.4 && !S.stopped) { S.stopped = true; S.hero.play('idle'); S.comp.play?.('idle'); }

    // c · la esquirla se enciende: rojo → oro
    const hx = S.hero.root.position.x + 0.62, hy = S.hero.root.position.y + 2.05;
    const ign = smooth(IGNITE - 0.6, IGNITE, lt);
    S.hand.position.set(hx, hy, 6); S.handGlow.position.set(hx, hy, 5);
    S.hand.material.opacity = ign;
    S.hand.scale.setScalar(0.3 + ign * 1.6 + Math.sin(lt * 14) * 0.15 * ign);
    S.handGlow.material.opacity = ign * 0.9;
    S.handGlow.scale.setScalar(1 + ign * 5);
    if (lt >= IGNITE && !S.ignited) {
      S.ignited = true;
      U.uFlash.value = 1.6; U.uFlashCol.value.set('#fff1c4');
      this._sfx('playBuff'); this._sfx('playExplosion');
    }
    const gold = smooth(IGNITE, IGNITE + 1.4, lt);
    S.bgGold.material.opacity = gold;
    S.rays.material.opacity = gold * 0.55;
    S.rays.position.set(hx, hy, -40);
    S.rays.rotation.z = lt * 0.12;
    // antes de encenderse, un filo rojo los separa del fondo oscuro; después, oro
    [S.hero, S.comp].forEach((h) => h && (gold > 0.02 ? h.setRim(gold, '#ffe39a') : h.setRim(0.45, '#ff4a2a')));
    S.lord.setRim(gold * 0.35, '#ffcf6a');
    [[S.wave, IGNITE, 1.1], [S.wave2, IGNITE + 0.25, 1.3]].forEach(([w, t0, d]) => {
      const k = (lt - t0) / d;
      w.visible = k > 0 && k < 1;
      w.position.set(hx, hy, 6);
      w.scale.setScalar(0.5 + easeOut(k) * 26);
      w.material.opacity = (1 - k) * 0.9;
    });
    const mp = S.motes.geometry.attributes.position;
    S.motes.material.opacity = gold * 0.9;
    S.motes.userData.base.forEach((b, i) => mp.setXYZ(i, b.x + Math.sin(lt * b.sp + b.ph) * 0.4, ((b.y + 6 + lt * (0.5 + b.sp * 0.7)) % 12) - 6, 3));
    mp.needsUpdate = true;
    U.uPaper.value = lerp(0.62, 0.8, gold);
    U.uVig.value = lerp(0.75, 0.5, gold);

    // cámara: plano general → se acerca al héroe al encenderse → se abre para el logo
    if (lt < IGNITE) { this.cam.zoom = lerp(0.92, 1.08, easeInOut(lt / IGNITE)); this.cam.x = lerp(1.2, -1.6, smooth(4.0, 9.0, lt)); this.cam.y = lerp(-0.4, -0.6, lt / IGNITE); }
    else if (lt < SLAM) { this.cam.zoom = lerp(1.08, 1.22, easeOut((lt - IGNITE) / 1.2)); this.cam.x = lerp(-1.6, -2.4, easeOut((lt - IGNITE) / 1.5)); this.cam.y = -0.6; }
    else { const k = easeOut((lt - SLAM) / 0.8); this.cam.zoom = lerp(1.22, 1.0, k); this.cam.x = lerp(-2.4, 0, k); this.cam.y = lerp(-0.6, 0, k); }

    // d · LUNAKAI
    if (S.logo) {
      const k = (lt - SLAM) / 0.42;
      const show = lt >= SLAM;
      S.logo.material.opacity = show ? Math.min(1, k * 3) : 0;
      S.logo.scale.setScalar(show ? lerp(2.6, 1, backOut(k)) : 2.6);
      S.logo.position.x = this.cam.x; S.logoGlow.position.x = this.cam.x;
      S.logoGlow.material.opacity = show ? Math.max(0.35, 1.2 - (lt - SLAM) * 0.9) : 0;
      if (show && !S.slam && k >= 0.92) {
        S.slam = true;
        U.uFlash.value = 0.9; U.uFlashCol.value.set('#fff6dc');
        this._sfx('playHitStopBass'); this._sfx('playDisintegrationBurst');
        S.slamT = lt;
      }
    }
    if (S.slam) {
      const k = lt - S.slamT;
      const dp = S.dust.geometry.attributes.position;
      S.dust.material.opacity = Math.max(0, 0.8 - k * 0.35);
      S.dust.userData.base.forEach((b, i) => {
        const a = b.ph, sp = 2 + b.sp * 4;
        dp.setXYZ(i, this.cam.x + Math.cos(a) * sp * easeOut(k / 1.6) * 1.6, 0.2 + Math.sin(a) * sp * easeOut(k / 1.6) * 0.6, 21);
      });
      dp.needsUpdate = true;
      // fundido final
      U.uFade.value = smooth(len - 2.0, len - 0.2, lt);
      U.uFadeCol.value.set('#000');
    } else {
      U.uFade.value = 1 - smooth(0, 0.8, lt);
    }
  }
}

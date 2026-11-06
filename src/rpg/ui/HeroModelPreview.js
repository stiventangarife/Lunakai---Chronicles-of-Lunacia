// HeroModelPreview.js — modelo 3D del héroe seleccionado en la mochila (columna central).
// Reutiliza CharacterPreviewDiorama (la misma escena, luces, cel-shading y contorno que la creación de personaje)
// con un solo personaje centrado:
//   · Sapidae → su GLB con la personalización guardada y el equipo puesto (SapidaeModularController.applyEquipment)
//   · Axie con axieId → Axie Mixer 3D (como en combate)
//   · Axie sin axieId (Bing, Pomodoro…) → assets/models/<id>.glb
// Si WebGL o el modelo fallan, muestra el retrato como respaldo. Solo se renderiza mientras la mochila está abierta.
import * as THREE from 'three';
import { warmupRender } from '../../render/RenderWarmup.js';
import { perfMark } from '../../debug/PerfProbe.js';

/**
 * Hito 113 — El visor de la Mochila no proyecta sombras (solo conserva la sombra de contacto del suelo).
 * Medido con lkPreviewDiag: tras precompilar, todos los programas de los materiales de la escena estaban listos
 * (forzar su enlazado costaba 80 ms en total) y aun así el primer dibujo se bloqueaba de 3,5 a 12 s en programas que
 * renderer.compile no prepara: los de la pasada de sombras (ShadowCaster / depth del mixer). Sin pasada de sombras no
 * existen. Para compararlo, abrir el juego con `?previewShadows` en la dirección.
 */
const PREVIEW_SHADOWS = typeof location !== 'undefined' && /[?&]previewShadows\b/.test(location.search || '');

export class HeroModelPreview {
  constructor(container, { fallbackPortrait } = {}) {
    this.container = container;
    this.fallbackPortrait = fallbackPortrait || (() => null);
    this.d = null;
    this.failed = false;
    this.token = 0;
    this.glb = null; // { id, root, mixer }
    this.glbCache = new Map();
    this.sapMixer = null;
    this.companionId = null;
    this.current = null;
  }

  async _ensure() {
    if (this.d || this.failed) return this.d;
    try {
      const { CharacterPreviewDiorama } = await import('./CharacterPreviewDiorama.js');
      const d = new CharacterPreviewDiorama(this.container);
      if (!d.renderer || !d.scene) throw new Error('WebGL no disponible');
      d.renderer.shadowMap.enabled = PREVIEW_SHADOWS; // ver PREVIEW_SHADOWS
      // Un solo personaje, centrado y en 3/4
      d.characterGroup.position.set(0, 0.08, 0);
      d.companionGroup.position.set(0, 0.08, 0);
      d.targetRotationY = d.characterRotationY = -0.28;
      if (d.scene.fog) d.scene.fog.density = 0.02;
      this.glbGroup = new THREE.Group();
      this.glbGroup.position.set(0, 0.08, 0);
      d.scene.add(this.glbGroup);
      // Al cambiar el tamaño de la columna se vuelve a encuadrar
      const resize = d._onResize.bind(d);
      d._onResize = () => { resize(); this._fit(); };
      // El grupo GLB gira con el resto
      const anim = d._animate.bind(d);
      d._animate = () => {
        if (this.glbGroup) this.glbGroup.rotation.y = d.characterRotationY;
        anim();
      };
      this.d = d;
    } catch (err) {
      console.warn('[HeroModelPreview] Vista 3D no disponible, se usa el retrato:', err);
      this.failed = true;
    }
    return this.d;
  }

  _showFallback(heroId) {
    const url = this.fallbackPortrait(heroId);
    this.container.querySelector('.lk-model-fallback')?.remove();
    if (!url) return;
    const img = document.createElement('img');
    img.className = 'lk-model-fallback';
    img.alt = '';
    img.src = url;
    this.container.appendChild(img);
  }

  /** Encuadra la cámara al modelo visible: cabe entero entre las ranuras laterales, con margen. */
  _fit() {
    const d = this.d;
    if (!d) return;
    const obj = d.characterGroup.visible ? d.characterGroup : d.companionGroup.visible ? d.companionGroup : this.glbGroup;
    if (!obj || !obj.children.length) return;
    const rot = obj.rotation.y;
    obj.rotation.y = 0;
    obj.updateMatrixWorld(true);
    // Solo cuentan las mallas visibles: las piezas modulares ocultas del Sapidae (otros peinados, cuernos…) no deben agrandar el encuadre
    const box = new THREE.Box3();
    obj.traverseVisible((c) => {
      if (!c.isMesh || !c.geometry || c.name.toLowerCase().includes('outline')) return;
      // precise = true: usa la posición real de cada vértice (con el esqueleto aplicado en las mallas con huesos)
      const b = new THREE.Box3();
      b.expandByObject(c, true);
      if (!b.isEmpty()) box.union(b);
    });
    obj.rotation.y = rot;
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const h = size.y, w = size.x, depth = size.z;
    const cy = (box.min.y + box.max.y) / 2;
    const W = this.container.clientWidth || 300, H = this.container.clientHeight || 600;
    const RAIL = 92; // columna de ranuras a la derecha: el modelo se centra en el espacio que queda a su izquierda
    const sideFree = Math.max(0.4, (W - RAIL) / W) * 0.94;
    const t = Math.tan(THREE.MathUtils.degToRad(d.camera.fov / 2));
    const distH = (h * 1.18 / 2) / t;
    const distW = (w * 1.12 / 2) / (t * (W / H) * sideFree);
    const dist = Math.max(distH, distW) + depth / 2;
    d.camera.position.set(0, cy + h * 0.06, dist);
    d.camera.lookAt(0, cy, 0);
    d.camera.setViewOffset(W, H, RAIL / 2, 0, W, H);
    d.camera.updateProjectionMatrix();
  }

  _setLoading(on) { this.container.classList.toggle('lk-is-loading', on); }

  /**
   * Diagnóstico (solo con window.lkPreviewDiag = true): fuerza el enlazado de cada programa de la escena del visor,
   * uno por tarea, y mide cuánto tarda cada uno y si el driver ya lo daba por listo. Sirve para saber si los ~12 s
   * del primer dibujo son de programas que compile() no prepara o de un enlazado que el driver retrasa hasta usarlo.
   * Resultado en consola (tabla) y en window.lkPreviewDiagRows.
   */
  async _diagPrograms() {
    const d = this.d, r = d.renderer, seen = new Set(), progs = new Map();
    d.scene.traverse((o) => {
      for (const m of [].concat(o.material || [], o.customDepthMaterial || [], o.customDistanceMaterial || [])) {
        if (!m || seen.has(m)) continue;
        seen.add(m);
        let p = null; try { p = r.properties.get(m).currentProgram; } catch (_) { /* opcional */ }
        if (p && !progs.has(p)) progs.set(p, m);
      }
    });
    const rows = [];
    for (const [p, m] of progs) {
      let ready = null; try { ready = p.isReady ? p.isReady() : null; } catch (_) { /* opcional */ }
      const t0 = performance.now();
      try { p.getUniforms(); } catch (_) { /* opcional */ }
      rows.push({ material: m.name || m.type, programa: p.name || '', listoAntes: ready, ms: Math.round(performance.now() - t0) });
      await new Promise((res) => setTimeout(res, 0));
    }
    rows.sort((a, b) => b.ms - a.ms);
    const total = rows.reduce((a, x) => a + x.ms, 0);
    console.table(rows.slice(0, 15));
    if (typeof window !== 'undefined') window.lkPreviewDiagRows = rows;
    perfMark(`visor 3D diag: ${rows.length} programas, ${total} ms al forzar el enlazado; el más lento: ${rows[0]?.material || '-'} ${rows[0]?.ms ?? 0} ms (listoAntes=${rows[0]?.listoAntes})`);
  }

  /**
   * Hito 113 — Compila en paralelo, sin dibujar, los materiales que trae el héroe recién cargado.
   * El visor tiene su propio contexto WebGL, así que no reutiliza los shaders del juego, y su bucle dibuja a cada
   * fotograma: un héroe nuevo (Axie del mixer, GLB) enlazaba sus 6–10 programas uno a uno en el primer fotograma
   * (0,6–2,4 s cada uno; un fotograma de 11 s medido). Mientras tanto el héroe está oculto (show() lo vuelve visible
   * al terminar) y se ve el indicador de carga. `window.lkNoPreviewWarm = true` lo desactiva para comparar.
   */
  async _warm() {
    const d = this.d;
    if (!d || !d.renderer || !d.scene || !d.camera || (typeof window !== 'undefined' && window.lkNoPreviewWarm)) return;
    const t0 = performance.now();
    perfMark('visor 3D: precompilando héroe');
    try {
      const r = await warmupRender(d.renderer, d.scene, d.camera, { deadline: t0 + 8000 });
      perfMark(`visor 3D: listo (${r?.programs ?? 0} programas nuevos, ${Math.round(performance.now() - t0)} ms)`);
      if (typeof window !== 'undefined' && window.lkPreviewDiag) await this._diagPrograms();
    } catch (err) {
      console.warn('[HeroModelPreview] Precalentado omitido:', err);
    }
  }

  /** Muestra al héroe. base = heroesBase[heroId]; equipped = equipo actual (para el Sapidae). */
  async show(heroId, base, equipped = null) {
    const t = ++this.token;
    this.current = heroId;
    const d = await this._ensure();
    if (t !== this.token) return;
    if (!d) { this._showFallback(heroId); return; }
    this.container.querySelector('.lk-model-fallback')?.remove();
    this._setLoading(true);
    try {
      const isSapi = heroId === 'sapidae' || base?.isSapidae;
      if (isSapi) {
        this.glbGroup.visible = false;
        d.companionGroup.visible = false;
        d.characterGroup.visible = false; // oculto hasta que sus shaders estén listos (ver _warm)
        const modelName = base?.modelType || 'sapidae-f-a';
        const custom = base?.customization || {};
        if (this.sapMixer && d.currentModelName === modelName) d.mixer = this.sapMixer;
        await d.loadSapidae(modelName, custom);
        if (t !== this.token) return;
        this.sapMixer = d.mixer;
        this.applyEquipment(base, equipped);
        if (!d.currentModel) throw new Error('modelo no cargado');
        await this._warm();
        if (t !== this.token) return;
        d.characterGroup.visible = true;
      } else if (base?.axieId) {
        this.glbGroup.visible = false;
        d.characterGroup.visible = false;
        d.companionGroup.visible = false; // oculto hasta que sus shaders estén listos (ver _warm)
        if (this.companionId !== String(base.axieId)) {
          this.companionId = String(base.axieId);
          await d.loadCompanion(base.axieId, base.genes);
          if (t !== this.token) return;
        }
        const w = d.currentCompanion?.wrapper || d.currentCompanion?.model;
        if (!w) { this.companionId = null; throw new Error('axie no cargado'); }
        w.scale.set(0.95, 0.95, 0.95);
        await this._warm();
        if (t !== this.token) return;
        d.companionGroup.visible = true;
      } else {
        d.characterGroup.visible = false;
        d.companionGroup.visible = false;
        this.glbGroup.visible = false; // oculto hasta que sus shaders estén listos (ver _warm)
        await this._showGlb(heroId, base);
        if (t !== this.token) return;
        await this._warm();
        if (t !== this.token) return;
        this.glbGroup.visible = true;
      }
      this._fit();
    } catch (err) {
      console.warn('[HeroModelPreview] No se pudo cargar el modelo de ' + heroId + ':', err);
      if (t === this.token) this._showFallback(heroId);
    } finally {
      if (t === this.token) this._setLoading(false);
    }
  }

  async _showGlb(heroId, base) {
    const d = this.d;
    const name = base?.modelType && base.modelType !== 'axie' ? base.modelType : heroId;
    while (this.glbGroup.children.length) this.glbGroup.remove(this.glbGroup.children[0]);
    let entry = this.glbCache.get(name);
    if (!entry) {
      const gltf = await d.loader.loadAsync(`./assets/models/${name}.glb`);
      const root = gltf.scene;
      // Ajusta la altura a la del Sapidae (~1,7) para que todos se vean a la misma escala en la ficha
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root, true);
      const h = Math.max(0.01, box.max.y - box.min.y);
      const s = Math.min(1.6, 1.25 / h);
      root.scale.setScalar(s);
      root.position.y = -box.min.y * s;
      root.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      let mixer = null;
      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(root);
        const idle = gltf.animations.find((c) => c.name.toLowerCase().includes('idle')) || gltf.animations[0];
        mixer.clipAction(idle).play();
      }
      entry = { root, mixer };
      this.glbCache.set(name, entry);
    }
    this.glbGroup.add(entry.root);
    // El bucle del diorama actualiza d.mixer: se le presta el del GLB mientras se muestra
    d.mixer = entry.mixer;
  }

  /**
   * Hito 113 — Cambia el equipo del Sapidae en el visor sin dejar que el bucle dibuje las piezas nuevas antes de que
   * sus programas estén listos: equipar una pieza mostraba un material nuevo y el primer dibujo se bloqueaba hasta 4,7 s
   * (medido a los 149 s, justo tras el clic de equipar). Mientras tanto el Sapidae se oculta y se ve el indicador de carga.
   * Solo se llama con el Sapidae seleccionado (InventoryModal._refreshModelEquipment).
   */
  async refreshEquipment(base, equipped) {
    const d = this.d;
    if (!d || !d.currentModel || !equipped) return;
    const mine = (this._equipToken = (this._equipToken || 0) + 1);
    const tok = this.token;
    d.characterGroup.visible = false;
    this._setLoading(true);
    try {
      this.applyEquipment(base, equipped);
      // El arma del mixer se monta de forma asíncrona (GLB): se espera a que llegue para precompilarla también
      const weapon = d.modularController?.weaponReady?.(d.currentModel);
      if (weapon) await Promise.race([weapon, new Promise((res) => setTimeout(res, 3000))]);
      await this._warm();
    } finally {
      // Si mientras tanto se pidió otro equipo o se cambió de héroe, quien lo pidió se encarga de la visibilidad
      if (mine === this._equipToken && tok === this.token) {
        d.characterGroup.visible = true;
        this._setLoading(false);
      }
    }
  }

  /** Refresca el equipo visible del Sapidae (sombrero, arma…) sin recargar el modelo. */
  applyEquipment(base, equipped) {
    const d = this.d;
    if (!d || !d.currentModel || !equipped) return;
    try {
      d.modularController.applyEquipment(d.currentModel, equipped, base?.customization || {});
      if (d.toonOutline && typeof d.toonOutline.apply === 'function') d.toonOutline.apply();
    } catch (err) {
      console.warn('[HeroModelPreview] No se pudo aplicar el equipo:', err);
    }
  }

  start() { this.d?.start(); this.d?._onResize(); }
  stop() { this.d?.stop(); }
}

// SlotStagePreview.js — Hito 131 · Personaje 3D en el escenario del selector de aventura (pantalla de título).
//
// Reutiliza CharacterPreviewDiorama (misma escena, luces, cel-shading y contorno que la creación de personaje y la
// Mochila) con el Sapidae de la ranura elegida (personalización + equipo) y su Axie principal al lado.
// Presupuesto de rendimiento (ver docs/HITO_131_SELECTOR_DE_AVENTURA.md):
//   · UN solo visor para el selector: se crea al ver la lista y se libera al abrir el creador, cerrar sesión o jugar;
//   · solo la ranura elegida (nunca un modelo por ranura);
//   · 30 fps como máximo y resolución ×1,25 como máximo; el navegador lo pausa con la pestaña oculta;
//   · sin pasada de sombras (Hito 113: sus programas bloqueaban el primer dibujo 3,5–12 s); sombra de contacto del suelo;
//   · los modelos salen de ModelCache (la misma copia que usa el retrato de la ranura y luego el mundo): no se descargan
//     ni decodifican dos veces;
//   · los shaders se precompilan (warmupRender) antes de mostrar el modelo; mientras tanto se ve el retrato.
// API: const p = new SlotStagePreview(host); await p.show(slotData) → true si se ve el 3D; p.hide(); p.dispose().

import * as THREE from 'three';
import { warmupRender } from '../../render/RenderWarmup.js';
import { playerSapidaeModel } from '../SapidaeModels.js';
import { buildSlotIsland, TOP_Y } from './SlotIsland.js'; // Hito 133

const MAX_FPS = 30;
const MAX_DPR = 1.25;
/** Hito 133: línea de los pies (fracción del alto de la vista) y margen superior del personaje. */
export const FEET_LINE = 0.78;
const HEAD_LINE = 0.12;
const ISLAND_W = 2.7; // ancho de la isla con sus props (para que quepa entera)
const AXIE_WAIT_MS = 4000; // si el Axie tarda más, el Sapidae se muestra solo y el Axie aparece al llegar

export class SlotStagePreview {
  /** host: capa 3D (cubre todo el escenario) · viewEl: zona del personaje (sin la placa de abajo). */
  constructor(host, { viewEl = null } = {}) {
    this.host = host;
    this.viewEl = viewEl;
    this.islands = new Map(); // bioma → isla (Hito 133; se crean una vez y se reutilizan)
    this.island = null;
    this.d = null;
    this.failed = false;
    this.token = 0;
    this.companionId = null;
    this.visible = false;
  }

  async _ensure() {
    if (this.d || this.failed) return this.d;
    try {
      const { CharacterPreviewDiorama } = await import('./CharacterPreviewDiorama.js');
      if (!this.host?.isConnected) return null;
      const d = new CharacterPreviewDiorama(this.host);
      if (!d.renderer || !d.scene) throw new Error('WebGL no disponible');
      d.renderer.shadowMap.enabled = false;
      d.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
      d._lastW = d._lastH = 0; d._onResize(); // aplica la resolución nueva
      if (d.scene.fog) d.scene.fog.density = 0.02;
      // Sapidae a la izquierda y Axie a la derecha, algo más juntos que en el creador
      d.characterGroup.position.set(-0.42, TOP_Y, 0.05);
      d.companionGroup.position.set(0.5, TOP_Y, 0.22);
      d.targetRotationY = d.characterRotationY = 0.12;
      // Encuadre al cambiar el tamaño del escenario
      const resize = d._onResize.bind(d);
      d._onResize = () => { resize(); this._fit(); };
      // Tope de fotogramas: el reloj del diorama acumula el tiempo saltado (las animaciones no se ralentizan)
      const anim = d._animate.bind(d);
      let last = 0;
      d._animate = () => {
        if (!d.isRunning) return;
        const now = performance.now();
        if (now - last < 1000 / MAX_FPS - 2) { d.animFrameId = requestAnimationFrame(() => d._animate()); return; }
        last = now;
        anim();
      };
      this.d = d;
    } catch (err) {
      console.warn('[SlotStagePreview] Vista 3D no disponible, se usa el retrato:', err);
      this.failed = true;
    }
    return this.d;
  }

  /**
   * Encuadra la cámara a los dos personajes (las piezas ocultas del Sapidae no cuentan). Hito 133: el lienzo cubre todo
   * el escenario; los pies quedan en FEET_LINE del alto de la vista (la isla cuelga por debajo, entre el nombre y el
   * botón) y la cámara mira algo desde arriba para que se vea la superficie de la isla.
   */
  _fit() {
    const d = this.d;
    if (!d || !d.currentModel) return;
    const box = new THREE.Box3();
    const add = (group, precise) => {
      if (!group.visible || !group.children.length) return;
      const rot = group.rotation.y;
      group.rotation.y = 0;
      group.updateMatrixWorld(true);
      group.traverseVisible((c) => {
        if (!c.isMesh || !c.geometry || c.name.toLowerCase().includes('outline')) return;
        const b = new THREE.Box3();
        b.expandByObject(c, precise);
        if (!b.isEmpty()) box.union(b);
      });
      group.rotation.y = rot;
      group.updateMatrixWorld(true);
    };
    add(d.characterGroup, true);
    add(d.companionGroup, false);
    if (box.isEmpty()) return;
    // El Axie aún no ha llegado: se reserva su sitio para que la cámara no salte cuando aparezca
    if (this.companionId && !d.currentCompanion) {
      const p = d.companionGroup.position;
      box.union(new THREE.Box3(new THREE.Vector3(p.x - 0.45, p.y, p.z - 0.4), new THREE.Vector3(p.x + 0.45, p.y + 0.85, p.z + 0.4)));
    }
    const size = box.getSize(new THREE.Vector3());
    const W = this.host.clientWidth || 600, Hs = this.host.clientHeight || 500;
    const Hv = this.viewEl?.clientHeight || Hs * 0.78;
    const feetPx = Hv * FEET_LINE, headPx = Hv * HEAD_LINE;
    // Unidades del mundo por píxel: lo que pida el alto del personaje o el ancho de la isla, lo mayor
    const s = Math.max(size.y / (feetPx - headPx), ISLAND_W / (W * 0.94), (size.x * 1.15) / (W * 0.94));
    const t = Math.tan(THREE.MathUtils.degToRad(d.camera.fov / 2));
    const dist = (Hs * s / 2) / t;
    const lookY = TOP_Y + (feetPx - Hs / 2) * s;
    const tilt = 0.27; // ~15°: se ve el tablero de casillas (Hito 134)
    d.camera.position.set(0, lookY + Math.sin(tilt) * dist, Math.cos(tilt) * dist);
    d.camera.lookAt(0, lookY, 0);
    d.camera.updateProjectionMatrix();
  }

  /** Hito 133: isla del bioma (se construye la primera vez; las demás se ocultan). */
  async _useIsland(biome) {
    const d = this.d;
    let isle = this.islands.get(biome);
    if (!isle) {
      const p = buildSlotIsland(biome, { gradientMap: d.toonGradientMap || null });
      this.islands.set(biome, p);
      isle = p;
    }
    const built = await isle;
    if (!this.d || this.d !== d) return null;
    if (built.root.parent !== d.scene) d.scene.add(built.root);
    for (const [k, v] of this.islands) if (k !== biome) v.then((x) => { if (x?.root) x.root.visible = false; });
    this.island = built;
    return built;
  }

  /** Muestra la ranura. Resuelve true cuando el 3D está listo para verse (shaders precompilados). */
  async show(data, { biome = 'forest' } = {}) {
    const t = ++this.token;
    if (!data) { this.hide(); return false; }
    if (!SlotStagePreview.supported()) return false;
    const d = await this._ensure();
    if (!d || t !== this.token) return false;
    d.start();
    try {
      d.characterGroup.visible = false; // oculto hasta que sus shaders estén listos
      const model = playerSapidaeModel(data.sapidaeModel);
      await d.loadSapidae(model, data.customization || {});
      if (t !== this.token) return false;
      if (!d.currentModel) throw new Error('modelo no cargado');
      try {
        d.modularController.applyEquipment(d.currentModel, data.equipped || {}, data.customization || {});
        if (d.toonOutline && typeof d.toonOutline.apply === 'function') d.toonOutline.apply();
      } catch (err) { console.warn('[SlotStagePreview] Equipo no aplicado:', err); }

      // Axie principal (el mismo que muestra la ranura); si es el mismo que ya está, no se recarga
      const hero = data.hero || {};
      const ax = data.mainAxie || hero;
      const axId = String(ax.axieId || (ax === hero ? '10455' : '') || '');
      if (axId && axId !== this.companionId) {
        this.companionId = axId;
        d.companionGroup.visible = false;
        const genes = ax.genes || (ax === hero ? hero.genes : null) || null;
        let settled = false;
        const wait = d.loadCompanion(axId, genes).catch(() => null).finally(() => { settled = true; });
        await Promise.race([wait, new Promise((r) => setTimeout(r, AXIE_WAIT_MS))]);
        if (t !== this.token) return false;
        if (!d.currentCompanion && settled) {
          this.companionId = null; // falló: el Sapidae se encuadra solo (y se reintenta la próxima vez)
        } else if (!d.currentCompanion) {
          // llega tarde: su sitio queda reservado en el encuadre y se enseña cuando llegue (ya precompilado)
          wait.then(() => { if (t === this.token && d.currentCompanion) this._reveal(d.companionGroup); });
        }
      } else if (!axId) {
        this.companionId = null;
        d._disposeCompanion?.();
        while (d.companionGroup.children.length) d.companionGroup.remove(d.companionGroup.children[0]);
        d.currentCompanion = null;
      }
      const isle = await this._useIsland(biome).catch((err) => { console.warn('[SlotStagePreview] Isla no disponible:', err); return null; });
      if (t !== this.token) return false;
      if (isle) isle.root.visible = false;
      d.targetRotationY = d.characterRotationY = 0.12;
      // Encuadre con los modelos visibles un instante (sin dibujar entre medias) y vuelta a ocultarlos
      d.characterGroup.visible = true;
      d.companionGroup.visible = Boolean(d.currentCompanion);
      this._fit();
      d.characterGroup.visible = false;
      d.companionGroup.visible = false;
      // Hito 113: precompilar ANTES de que el bucle los dibuje (el primer dibujo de un material nuevo compila de forma
      // síncrona y congela la pantalla). warmupRender también prepara los objetos ocultos.
      await warmupRender(d.renderer, d.scene, d.camera, { deadline: performance.now() + 8000 }).catch(() => null);
      if (t !== this.token) return false;
      d.characterGroup.visible = true;
      d.companionGroup.visible = Boolean(d.currentCompanion);
      if (isle) isle.root.visible = true;
      this.visible = true;
      return true;
    } catch (err) {
      console.warn('[SlotStagePreview] No se pudo mostrar la ranura:', err);
      return false;
    }
  }

  /** Equipos con poca memoria (navigator.deviceMemory < 4 GB, solo Chromium) o `window.lkNoStage3d`: solo el retrato. */
  static supported() {
    if (typeof window !== 'undefined' && window.lkNoStage3d) return false;
    const mem = typeof navigator !== 'undefined' ? Number(navigator.deviceMemory) : 0;
    return !(mem && mem < 4);
  }

  async _reveal(group) {
    const d = this.d;
    if (!d) return;
    const t = this.token;
    await warmupRender(d.renderer, d.scene, d.camera, { deadline: performance.now() + 6000 }).catch(() => null);
    if (t === this.token) group.visible = true;
  }

  /** Ranura vacía: se deja de dibujar (los modelos se quedan por si se vuelve a ella). */
  hide() {
    this.token++;
    this.visible = false;
    this.d?.stop();
  }

  /** Libera el contexto WebGL y los modelos (creador abierto, cerrar sesión, empezar a jugar). */
  dispose() {
    this.token++;
    this.visible = false;
    this.companionId = null;
    for (const p of this.islands.values()) p.then((x) => x?.dispose()).catch(() => {});
    this.islands.clear();
    this.island = null;
    try { this.d?.dispose(); } catch (err) { console.warn('[SlotStagePreview] dispose:', err); }
    this.d = null;
    this.host?.replaceChildren();
  }
}
